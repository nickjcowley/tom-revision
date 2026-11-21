// Builds the base timetable from data.js. Pure functions: same input → same plan,
// so session ids stay stable and the calendar feed matches the app.
import { PLAN, RULES, HOME_TIME, EVENTS, WEEKLY_TERM, WEEKLY_ALWAYS, DAY_OVERRIDES, ORAL_PREP, SUBJECTS } from './data.js';

// ── time helpers ──
export const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const fmt = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
export const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const dow = (iso) => new Date(iso + 'T12:00:00Z').getUTCDay();
export const dateRange = (from, to) => { const out = []; for (let d = from; d <= to; d = addDays(d, 1)) out.push(d); return out; };
export const durLabel = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ' ' + (m % 60) + 'm' : ''}` : `${m}m`);

export const SUBJECT = Object.fromEntries(SUBJECTS.map((s) => [s.id, s]));
export const PAPERS = SUBJECTS.flatMap((s) => s.papers.map((p) => ({ ...p, subject: s.id })));
export const PAPER = Object.fromEntries(PAPERS.map((p) => [p.id, p]));
export const TOPICS = SUBJECTS.flatMap((s) => s.topics.map(([name, p], i) => ({ id: `${s.id}-${i + 1}`, subject: s.id, name, paper: p, order: i })));
export const TOPIC = Object.fromEntries(TOPICS.map((t) => [t.id, t]));

export const phaseOf = (date) => PLAN.phases.find((p) => date >= p.from && date <= p.to)?.id ?? null;

// "Earlier exams first": week-1 papers count more.
const earliness = (date) => (date <= '2027-01-08' ? 1.3 : date <= '2027-01-15' ? 1.0 : 0.85);
export const SUBJECT_WEIGHT = Object.fromEntries(
  SUBJECTS.map((s) => [s.id, s.papers.reduce((w, p) => w + (p.mins / 60) * earliness(p.date), 0)])
);

// ── what kind of day is it? ──
export function dayInfo(date) {
  const d = dow(date);
  const ov = DAY_OVERRIDES[date] || {};
  const weekday = d >= 1 && d <= 5;
  const school = weekday && (date <= PLAN.lastTermDay || date >= '2027-01-05');
  let kind;
  if (ov.off) kind = 'off';
  else if (!weekday) kind = 'weekend';
  else if (school) kind = d === 5 ? 'friday' : 'schoolnight';
  else kind = 'holiday';

  const blocks = EVENTS.filter((e) => e.date === date && !e.allDay).map((e) => ({ ...e }));
  const weekly = [...WEEKLY_ALWAYS, ...(school ? WEEKLY_TERM : [])].filter((w) => w.dow === d);
  weekly.forEach((w) => blocks.push({ date, start: w.start, end: w.end, type: w.type, label: w.label }));
  const allDay = EVENTS.filter((e) => e.date === date && e.allDay);

  let start, end, cap;
  if (kind === 'schoolnight' || kind === 'friday') {
    start = toMin(HOME_TIME[d]);
    end = toMin(RULES.schoolNight.end);
    cap = kind === 'friday' ? RULES.friday.homeworkMins : RULES.schoolNight.totalMins;
    const school = blocks.find((b) => b.type === 'school'); // late return
    if (school) start = Math.max(start, toMin(school.end));
  } else if (kind === 'weekend') {
    start = toMin(RULES.weekend.start); end = toMin(RULES.weekend.end); cap = RULES.weekend.totalMins;
  } else if (kind === 'holiday') {
    start = toMin(RULES.holiday.start); end = toMin(RULES.holiday.end); cap = RULES.holiday.totalMins;
  }
  if (ov.start) start = Math.max(start, toMin(ov.start));
  if (ov.end) end = Math.min(end, toMin(ov.end));
  if (ov.totalMins) cap = Math.min(cap, ov.totalMins);
  return { date, dow: d, kind, school, phase: phaseOf(date), start, end, cap, blocks, allDay };
}

// ── packing: place tasks in order into the free time of a day ──
function pack(info, tasks, extraBusy = [], gap = 15) {
  const busy = [...info.blocks.map((b) => [toMin(b.start), toMin(b.end)]), ...extraBusy].sort((a, b) => a[0] - b[0]);
  const clash = (s, e) => busy.some(([bs, be]) => s < be && e > bs);
  const placed = [], unplaced = [];
  let ptr = info.start, used = 0;
  for (const t of tasks) {
    const want = Math.min(t.mins, info.cap - used);
    const min = t.min ?? t.mins;
    if (want < min) { unplaced.push(t); continue; }
    let spot = null;
    for (let s = ptr; s + min <= info.end; s += 5) {
      if (clash(s, s + min)) continue;
      // grow to `want` if possible
      let len = min;
      while (len + 5 <= want && s + len + 5 <= info.end && !clash(s, s + len + 5)) len += 5;
      spot = [s, len];
      break;
    }
    if (!spot) { unplaced.push(t); continue; }
    const [s, len] = spot;
    placed.push({ ...t, startMin: s, endMin: s + len, mins: len });
    used += len;
    ptr = s + len + (t.gapAfter ?? gap);
  }
  return { placed, unplaced, used };
}

// Holiday days: choose where the 3½-hour free block goes so the day still fits.
function packHoliday(info, tasks, rotation) {
  const meals = [[toMin(RULES.lunch[0]), toMin(RULES.lunch[1])], [toMin(RULES.dinner[0]), toMin(RULES.dinner[1])]];
  // an existing commitment of 3h+ already counts as the break
  const longBusy = info.blocks.some((b) => toMin(b.end) - toMin(b.start) >= 180 && toMin(b.end) > info.start && toMin(b.start) < info.end);
  if (longBusy || info.end - info.start <= 7 * 60) {
    const r = pack(info, tasks, meals);
    return { ...r, free: null };
  }
  const F = RULES.holiday.freeBlockMins;
  const options = [];
  for (let fs = info.start + 60; fs + F <= info.end; fs += 30) {
    const free = [fs, fs + F];
    const mealsOutside = meals.filter(([a, b]) => b <= fs || a >= fs + F);
    const r = pack(info, tasks, [free, ...mealsOutside]);
    options.push({ ...r, free });
  }
  const best = Math.max(...options.map((o) => o.used));
  const good = options.filter((o) => o.used >= best - 0);
  return good[rotation % good.length];
}

// Weighted subject chooser ("earlier exams first"), max one revision slot per subject per day.
function makeAllocator() {
  const alloc = Object.fromEntries(SUBJECTS.map((s) => [s.id, 0]));
  return {
    alloc,
    pick(mins, exclude) {
      let best = null, bestScore = Infinity;
      for (const s of SUBJECTS) {
        if (exclude.has(s.id)) continue;
        const score = (alloc[s.id] + mins) / SUBJECT_WEIGHT[s.id];
        if (score < bestScore - 1e-9) { best = s.id; bestScore = score; }
      }
      alloc[best] += mins;
      return best;
    },
    add(subject, mins) { alloc[subject] += mins; },
  };
}

// ── main ──
export function generatePlan() {
  const days = [];
  const sessions = [];
  const allocator = makeAllocator();
  const fixAllocator = makeAllocator();
  let holidayIdx = 0;

  // practice-paper queue: latest exam first, so the final days are the week-1 subjects
  const paperQueue = [...PAPERS].sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start)).map((p) => ({ kind: 'paper', paperId: p.id, subject: p.subject, mins: p.mins, gapAfter: 15 }));
  const secondRound = [...PAPERS].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).map((p) => ({ kind: 'paper', paperId: p.id, subject: p.subject, mins: p.mins, gapAfter: 15, round: 2 }));
  let carryMark = [];

  for (const date of dateRange(PLAN.start, PLAN.end)) {
    const info = dayInfo(date);
    const day = { ...info, free: null };
    days.push(day);
    if (info.kind === 'off') continue;
    let placed = [];

    if (info.phase === 'mocks' || (info.phase === 'papers' && false)) {
      // evening-before reviews for tomorrow's papers
      const tomorrow = PAPERS.filter((p) => p.date === addDays(date, 1));
      if (!tomorrow.length) continue;
      const rinfo = { ...info, cap: 999 };
      if (info.kind === 'weekend') rinfo.start = toMin('17:00');
      if (info.kind === 'friday' || info.kind === 'schoolnight') rinfo.end = toMin('22:00');
      const order = [...tomorrow].sort((a, b) => a.start.localeCompare(b.start));
      for (const len of [RULES.reviewMins, 30, 20]) {
        const r = pack(rinfo, order.map((p) => ({ kind: 'review', paperId: p.id, subject: p.subject, mins: len, min: Math.min(len, 20) })), [], 5);
        placed = r.placed;
        if (!r.unplaced.length) break;
      }
    } else if (info.phase === 'papers') {
      const short = info.kind !== 'holiday' || DAY_OVERRIDES[date];
      const examTomorrow = PAPERS.some((p) => p.date === addDays(date, 1));
      const nPapers = short || examTomorrow ? 1 : 3;
      const todays = [];
      const usedSubjects = new Set();
      todays.push(...carryMark);
      carryMark = [];
      for (let i = 0; i < nPapers; i++) {
        let p = paperQueue.length ? paperQueue.shift() : null;
        if (!p && secondRound.length) p = secondRound.shift();
        if (!p) break;
        todays.push(p, { kind: 'mark', paperId: p.paperId, subject: p.subject, mins: RULES.markMins, gapAfter: 15, round: p.round });
        usedSubjects.add(p.subject);
      }
      // evening before the first exam: add reviews
      const tomorrow = PAPERS.filter((p) => p.date === addDays(date, 1));
      const reviews = tomorrow.map((p) => ({ kind: 'review', paperId: p.id, subject: p.subject, mins: RULES.reviewMins, gapAfter: 10 }));
      const fills = Array.from({ length: 6 }, () => ({ kind: 'fix', mins: 60, min: 45 }));
      // papers and their marking first, then fix-up sessions in the time left
      let seq = [...todays, ...fills];
      const reserve = reviews.reduce((a, r) => a + r.mins + 10, 0);
      const pinfo = { ...info, cap: info.cap - reviews.reduce((a, r) => a + r.mins, 0), end: info.end - reserve };
      const meals = info.kind === 'weekend' ? [[toMin(RULES.lunch[0]), toMin(RULES.lunch[1])], [toMin(RULES.dinner[0]), toMin(RULES.dinner[1])]] : [];
      const run = () => (info.kind === 'holiday' ? packHoliday(pinfo, seq, holidayIdx) : pack(pinfo, seq, meals));
      let r = run();
      // never schedule marking for a paper that didn't fit
      for (let guard = 0; guard < 4; guard++) {
        const okPapers = new Set(r.placed.filter((t) => t.kind === 'paper').map((t) => t.paperId + (t.round || '')));
        const orphan = r.placed.find((t) => t.kind === 'mark' && !okPapers.has(t.paperId + (t.round || '')) && todays.some((x) => x.kind === 'paper' && x.paperId === t.paperId && (x.round || '') === (t.round || '')));
        // …and on the last practice day, never leave a paper without its marking
        const lastDay = phaseOf(addDays(date, 1)) !== 'papers';
        const okMarks = new Set(r.placed.filter((t) => t.kind === 'mark').map((t) => t.paperId + (t.round || '')));
        const unmarked = lastDay && r.placed.find((t) => t.kind === 'paper' && !okMarks.has(t.paperId + (t.round || '')));
        if (!orphan && !unmarked) break;
        const drop = orphan || unmarked;
        const dropped = seq.find((t) => t.kind === 'paper' && t.paperId === drop.paperId && (t.round || '') === (drop.round || ''));
        if (dropped) (dropped.round === 2 ? secondRound : paperQueue).unshift(dropped);
        seq = seq.filter((t) => !((t.kind === 'mark' || t.kind === 'paper') && t.paperId === drop.paperId && (t.round || '') === (drop.round || '')));
        r = run();
      }
      if (info.kind === 'holiday') holidayIdx++;
      day.free = r.free ? r.free.map(fmt) : null;
      // papers that didn't fit go back to the front of the queue
      const placedPaperIds = new Set(r.placed.filter((t) => t.kind === 'paper').map((t) => t.paperId + (t.round || '')));
      for (const t of [...r.unplaced].reverse()) {
        if (t.kind === 'paper') (t.round === 2 ? secondRound : paperQueue).unshift(t);
        if (t.kind === 'mark' && placedPaperIds.has(t.paperId + (t.round || ''))) carryMark.push(t);
      }
      // a mark whose paper wasn't placed is dropped (it'll be re-added with the paper)
      placed = r.placed;
      // assign subjects to fix slots
      for (const t of placed) {
        if (t.kind === 'fix') {
          const ex = new Set([...usedSubjects, ...placed.filter((x) => x.kind === 'fix' && x.subject).map((x) => x.subject)]);
          t.subject = fixAllocator.pick(t.mins, ex);
        }
      }
      // reviews in the evening slot we reserved
      if (reviews.length) {
        const last = placed.length ? placed[placed.length - 1].endMin + 15 : info.start;
        const rv = pack({ ...info, start: Math.max(last, toMin('18:30')), cap: 999 }, reviews, [], 10).placed;
        placed.push(...rv);
      }
    } else {
      // notes / memorise phases
      const kind = info.phase === 'notes' ? 'notes' : 'memorise';
      let tasks;
      if (info.kind === 'friday') tasks = [{ kind: 'homework', mins: RULES.friday.homeworkMins }];
      else if (info.kind === 'schoolnight') {
        const rev = RULES.schoolNight.sessions.map((m) => ({ kind, mins: m, min: 25 }));
        tasks = [{ kind: 'homework', mins: RULES.schoolNight.homeworkMins, min: 30 }, ...rev];
        if (ORAL_PREP.includes(date)) tasks = [{ kind: 'oral', subject: 'span', mins: 45 }, { kind: 'homework', mins: RULES.schoolNight.homeworkMins, min: 30 }, { kind, mins: 60, min: 25 }];
      } else if (info.kind === 'weekend') {
        tasks = RULES.weekend.sessions.map((m) => ({ kind, mins: m, min: 30 }));
      } else {
        tasks = Array.from({ length: 6 }, () => ({ kind, mins: RULES.holiday.sessionMins, min: 30 }));
      }
      const gap = info.kind === 'schoolnight' ? RULES.schoolNight.gap : 15;
      let r;
      if (info.kind === 'holiday') { r = packHoliday(info, tasks, holidayIdx++); day.free = r.free ? r.free.map(fmt) : null; }
      else r = pack(info, tasks, info.kind === 'weekend' ? [[toMin(RULES.lunch[0]), toMin(RULES.lunch[1])], [toMin(RULES.dinner[0]), toMin(RULES.dinner[1])]] : [], gap);
      placed = r.placed;
      const used = new Set();
      for (const t of placed) {
        if (t.kind === 'oral') used.add('span'); // extra – doesn't eat into normal Spanish time
      }
      for (const t of placed) {
        if (t.kind === 'notes' || t.kind === 'memorise') { t.subject = allocator.pick(t.mins, used); used.add(t.subject); }
      }
    }

    placed.sort((a, b) => a.startMin - b.startMin).forEach((t, i) => {
      sessions.push({
        id: `${date}#${i + 1}`, date, start: fmt(t.startMin), end: fmt(t.endMin), mins: t.endMin - t.startMin,
        kind: t.kind, subject: t.subject || null, paperId: t.paperId || null, round: t.round || 1,
      });
    });
  }

  // Notes phase: share each subject's topics across its notes sessions, in spec order.
  for (const s of SUBJECTS) {
    const ns = sessions.filter((x) => x.kind === 'notes' && x.subject === s.id);
    const topics = TOPICS.filter((t) => t.subject === s.id);
    ns.forEach((x, i) => {
      const a = Math.floor((i * topics.length) / ns.length), b = Math.floor(((i + 1) * topics.length) / ns.length);
      x.topics = topics.slice(a, Math.max(b, a + 1)).map((t) => t.id);
    });
  }
  sessions.forEach((x) => { if (x.kind === 'oral') x.topics = []; });

  return { days, sessions, generated: PLAN, unplacedPapers: paperQueue.map((p) => p.paperId) };
}

// ── labels ──
export function sessionTitle(x) {
  const s = x.subject ? SUBJECT[x.subject].short : '';
  switch (x.kind) {
    case 'homework': return 'Homework';
    case 'notes': return `${s} – make notes`;
    case 'memorise': return `${s} – memorise & recall`;
    case 'oral': return 'Spanish – speaking prep for oral';
    case 'paper': return `${PAPER[x.paperId].name} – practice paper${x.round === 2 ? ' (2nd)' : ''}`;
    case 'mark': return `${PAPER[x.paperId].name} – mark & correct`;
    case 'fix': return `${s} – fix weak topics`;
    case 'review': return `Review for tomorrow: ${PAPER[x.paperId].name}`;
  }
  return x.kind;
}

export const KIND_HELP = {
  notes: 'Condense your class notes into revision notes / mind maps / flashcards for these topics.',
  memorise: 'Close the notes and test yourself: flashcards, blurting, self-quizzing. Re-rate each topic afterwards.',
  oral: 'Practise the role play, reading aloud and photo card; rehearse your conversation answers out loud.',
  paper: 'Timed, exam conditions, no notes. Get the mark scheme ready for afterwards.',
  mark: 'Mark with the mark scheme. Correct every mistake in a different colour and set the topics you dropped marks on to red.',
  fix: 'Go back over your red/amber topics: re-learn, then do exam questions on them.',
  review: 'Light review only: key facts, equations, quotes, formulas. Early night!',
  homework: 'School homework.',
};

// ── dynamic topic choice (uses Tom's RAG ratings) ──
const RATING_WEIGHT = { R: 4, A: 2, G: 1 };
export function assignTopics(plan, ratings = {}, locks = {}) {
  const out = {};
  const picked = {};
  const dyn = plan.sessions.filter((x) => ['memorise', 'fix', 'review'].includes(x.kind));
  for (const x of dyn) {
    if (locks[x.id]) { out[x.id] = locks[x.id]; locks[x.id].forEach((t) => (picked[t] = (picked[t] || 0) + 1)); continue; }
    let pool = TOPICS.filter((t) => t.subject === x.subject);
    if (x.kind === 'review') pool = pool.filter((t) => t.paper === x.paperId || t.paper === '*');
    const k = x.kind === 'review' ? 4 : x.mins >= 60 ? 3 : 2;
    const scored = pool.map((t) => {
      const w = RATING_WEIGHT[ratings[t.id]] ?? 1.6;
      const early = t.paper !== '*' && PAPER[t.paper] && PAPER[t.paper].date <= '2027-01-08' ? 1.15 : 1;
      return { t, score: (w * early) / (1 + (picked[t.id] || 0)) };
    }).sort((a, b) => b.score - a.score || a.t.order - b.t.order);
    const chosen = scored.slice(0, k).map((s) => s.t.id);
    chosen.forEach((t) => (picked[t] = (picked[t] || 0) + 1));
    out[x.id] = chosen;
  }
  return out;
}
