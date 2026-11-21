import { PLAN, RULES, SUBJECTS, OTHER_EXAMS } from './data.js';
import {
  generatePlan, assignTopics, dayInfo, sessionTitle, KIND_HELP, SUBJECT, PAPERS, PAPER, TOPICS, TOPIC,
  toMin, fmt, addDays, dow, dateRange, durLabel, phaseOf,
} from './planner.js';
import { buildICS } from './ics.js';
import * as store from './sync.js';

// ── clock (add ?now=2026-12-01T19:00 to the URL to preview another moment) ──
const qp = new URLSearchParams(location.search);
const NOW = qp.get('now') ? new Date(qp.get('now')) : new Date();
const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const TODAY = isoLocal(NOW);
const NOW_MIN = NOW.getHours() * 60 + NOW.getMinutes();
const nowKey = TODAY + ' ' + fmt(NOW_MIN);

const plan = generatePlan();
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const nice = (iso, long) => { const [y, m, d] = iso.split('-').map(Number); return `${DAYS[dow(iso)]}${long ? '' : ''} ${d} ${MONTHS[m - 1]}`; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clampDate = (d) => (d < PLAN.start ? PLAN.start : d > PLAN.end ? PLAN.end : d);

let S = store.getState();
let tab = location.hash.slice(1) || 'today';
let viewDate = clampDate(TODAY);
let dyn = {};

// ── derived data ──
function sessions() {
  return plan.sessions.map((s) => {
    const mv = S.moves[s.id];
    const base = mv ? { ...s, date: mv.date, start: mv.start, end: fmt(toMin(mv.start) + s.mins), movedFrom: `${nice(s.date)} ${s.start}` } : { ...s };
    base.rec = S.sessions[s.id] || null;
    base.done = !!base.rec?.done;
    base.topicsNow = s.topics?.length ? s.topics : (base.rec?.topics || S.locks[s.id] || dyn[s.id] || []);
    const blocks = Object.values(S.blocks || {}).filter((b) => b.date === base.date);
    base.clash = !base.done && blocks.find((b) => toMin(base.start) < toMin(b.end) && toMin(base.end) > toMin(b.start));
    base.past = (base.date + ' ' + base.end) <= nowKey;
    base.live = !base.done && base.date === TODAY && toMin(base.start) <= NOW_MIN && NOW_MIN < toMin(base.end);
    base.skipped = !!base.rec?.skipped;
    base.missed = !base.done && !base.skipped && s.kind !== 'homework' && (base.past || !!base.clash);
    return base;
  });
}
const colour = (s) => (s.subject ? SUBJECT[s.subject].colour : '#6b7280');
const isRevision = (s) => s.kind !== 'homework';

function recompute() {
  dyn = assignTopics(plan, S.ratings, S.locks);
}

// Freeze topic choices for today/tomorrow so they don't jump around when ratings change.
function lockNearTerm() {
  const horizon = addDays(TODAY, 1);
  for (const s of plan.sessions) {
    if (!['memorise', 'fix', 'review'].includes(s.kind)) continue;
    if (s.date > horizon || S.locks[s.id] || S.sessions[s.id]) continue;
    if (dyn[s.id]) store.set(['locks', s.id], dyn[s.id]);
  }
}

// ── rendering ──
const view = document.getElementById('view');
function render() {
  recompute();
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  const daysToMocks = Math.ceil((new Date('2027-01-05T09:00') - NOW) / 864e5);
  document.getElementById('countdown').textContent = daysToMocks > 0 ? `${daysToMocks} day${daysToMocks === 1 ? '' : 's'} to mocks` : 'Mocks under way – good luck!';
  const badge = document.getElementById('syncBadge');
  badge.className = 'badge ' + store.mode;
  badge.textContent = store.mode === 'sync' ? '● Synced' : store.mode === 'offline' ? '● Offline' : 'This device';
  const all = sessions();
  view.innerHTML = ({ today: renderToday, plan: renderPlan, topics: renderTopics, progress: renderProgress, more: renderMore })[tab](all);
}

function ragButtons(id) {
  const v = S.ratings[id];
  return `<span class="rag" data-topic="${id}">${['R', 'A', 'G'].map((x) => `<button data-act="rate" data-v="${x}" class="${v === x ? 'on' : ''}" aria-label="${x}">${x}</button>`).join('')}</span>`;
}

function sessionCard(s) {
  const cls = ['card', 'sess', (s.done || s.skipped) && 'done', s.skipped && 'skipped', s.missed && 'missed', s.live && 'now'].filter(Boolean).join(' ');
  const topics = s.topicsNow.length ? `<ul class="topics">${s.topicsNow.map((t) => `<li><span>${esc(TOPIC[t]?.name)}</span>${ragButtons(t)}</li>`).join('')}</ul>` : '';
  const status = s.done ? '' : s.skipped ? '<div class="chip" style="background:#e5e7eb;color:#374151">Skipped</div>' : s.clash ? `<div class="chip" style="background:#fee2e2;color:#991b1b">Clashes with ${esc(s.clash.label)} – move it</div>`
    : s.missed ? '<div class="chip" style="background:#fee2e2;color:#991b1b">Missed – move it to another slot</div>'
    : s.live ? '<div class="chip" style="background:#fef3c7;color:#92400e">On now</div>' : '';
  const paperNote = s.kind === 'paper' ? `<div class="meta">Timed: ${durLabel(PAPER[s.paperId].mins)} · exam conditions</div>` : '';
  return `<article class="${cls}" style="--c:${colour(s)}" data-id="${s.id}">
    <h3>${esc(sessionTitle(s))}</h3>
    <div class="meta">${s.start}–${s.end} · ${durLabel(s.mins)}${s.movedFrom ? ` · moved from ${esc(s.movedFrom)}` : ''}</div>
    ${paperNote}${status}
    ${s.done || s.skipped ? '' : `<div class="help">${esc(KIND_HELP[s.kind] || '')}</div>`}
    ${topics}
    <div class="actions">
      ${s.done || s.skipped ? `<button class="btn small" data-act="undo">Undo</button>`
        : `<button class="btn ok" data-act="done">✓ Done</button><button class="btn" data-act="move">Move</button>${s.missed ? '<button class="btn" data-act="skip">Skip it</button>' : ''}`}
    </div>
  </article>`;
}

function dayItems(date, all) {
  const info = plan.days.find((d) => d.date === date) || dayInfo(date);
  const items = [];
  all.filter((s) => s.date === date).forEach((s) => items.push({ t: s.start, html: sessionCard(s), end: s.end }));
  info.blocks.forEach((b) => items.push({ t: b.start === '00:00' ? '' : b.start, end: b.end === '23:59' ? '' : b.end, html: `<div class="block ${b.type}">${esc(b.label)}</div>` }));
  Object.entries(S.blocks || {}).filter(([, b]) => b.date === date).forEach(([id, b]) => items.push({ t: b.start, end: b.end, html: `<div class="block custom">${esc(b.label)} <button class="btn small" data-act="delblock" data-block="${id}" style="float:right">Remove</button></div>` }));
  if (info.free) items.push({ t: info.free[0], end: info.free[1], html: `<div class="block free">🌤️ Free time – no revision</div>` });
  [...PAPERS, ...OTHER_EXAMS].filter((p) => p.date === date).forEach((p) => items.push({ t: p.start, end: fmt(toMin(p.start) + p.mins), html: `<div class="block exam">🎓 MOCK: ${esc(p.name)}</div>` }));
  info.allDay.forEach((e) => items.push({ t: '', html: `<div class="block exam">${esc(e.label)}</div>` }));
  return { info, items: items.sort((a, b) => (a.t || '').localeCompare(b.t || '')) };
}

function renderToday(all) {
  const phase = PLAN.phases.find((p) => p.id === phaseOf(viewDate));
  const todays = all.filter((s) => s.date === TODAY && isRevision(s));
  const doneToday = todays.filter((s) => s.done).length;
  const upToNow = all.filter((s) => isRevision(s) && s.date <= TODAY && s.date >= PLAN.start);
  const doneAll = all.filter((s) => isRevision(s) && s.done).length;
  const totalRev = all.filter(isRevision).length;
  const toMove = all.filter((s) => s.missed && isRevision(s));
  const { info, items } = dayItems(viewDate, all);
  const dayMins = all.filter((s) => s.date === viewDate).reduce((a, s) => a + s.mins, 0);
  const capTxt = info.kind === 'off' ? 'Day off 🎉' : info.kind === 'friday' ? 'Homework only' : `${durLabel(dayMins)} planned`;
  return `
  <section class="card hero">
    <div class="phase">${esc(phase?.name || (TODAY < PLAN.start ? 'Starts ' + nice(PLAN.start) : ''))}</div>
    <div class="big">${todays.length ? `${doneToday} of ${todays.length} done today` : 'Nothing scheduled today'}</div>
    <div class="bar"><i style="width:${totalRev ? (100 * doneAll) / totalRev : 0}%"></i></div>
    <div class="small" style="margin-top:6px;opacity:.85">${doneAll} of ${totalRev} sessions done overall</div>
  </section>
  ${toMove.length ? `<section class="card alert"><h3>${toMove.length} session${toMove.length > 1 ? 's' : ''} to reschedule</h3>
    <div class="small muted" style="margin:4px 0 8px">Missed or clashing. Pick a new slot for each.</div>
    ${toMove.slice(0, 6).map((s) => `<button class="slot" data-act="move" data-id="${s.id}"><span><b style="color:${colour(s)}">●</b> ${esc(sessionTitle(s))}<br><span class="small muted">${nice(s.date)} ${s.start}</span></span><span class="chip">Move</span></button>`).join('')}
    ${toMove.length > 6 ? `<div class="small muted">…and ${toMove.length - 6} more (see Progress)</div>` : ''}
  </section>` : ''}
  <div class="daynav">
    <button data-act="day" data-d="-1" aria-label="Previous day">‹</button>
    <div class="label"><b>${viewDate === TODAY ? 'Today · ' : ''}${nice(viewDate)}</b><span class="small muted">${capTxt}</span>
      ${viewDate !== clampDate(TODAY) ? `<br><button class="btn small" data-act="gotoday">Back to today</button>` : ''}</div>
    <button data-act="day" data-d="1" aria-label="Next day">›</button>
  </div>
  ${items.length ? items.map((it) => `<div class="item"><div class="time">${it.t || ''}${it.end ? `<small>${it.end}</small>` : ''}</div><div>${it.html}</div></div>`).join('') : '<div class="card muted">Nothing planned – enjoy it.</div>'}
  `;
}

function renderPlan(all) {
  let html = '';
  let lastPhase = null;
  for (const d of plan.days) {
    if (d.phase !== lastPhase) { const p = PLAN.phases.find((x) => x.id === d.phase); html += `<div class="phasehead">${esc(p.name)} <span class="small" style="opacity:.7;font-weight:400">${nice(p.from)} – ${nice(p.to)}</span></div>`; lastPhase = d.phase; }
    const ss = all.filter((s) => s.date === d.date).sort((a, b) => a.start.localeCompare(b.start));
    const exams = PAPERS.filter((p) => p.date === d.date);
    const evs = d.blocks.filter((b) => ['hockey', 'lfc', 'f1', 'off', 'family', 'school'].includes(b.type));
    const pills = [
      ...exams.map((p) => `<span class="pill" style="--c:#14213d;font-weight:700">🎓 ${esc(SUBJECT[p.subject].short)} ${p.start}</span>`),
      ...ss.map((s) => `<span class="pill ${s.done || s.skipped ? 'done' : ''} ${s.missed ? 'missed' : ''}" style="--c:${colour(s)}">${s.missed ? '⚠️ ' : ''}${s.start} ${s.kind === 'homework' ? 'HW' : esc(s.subject ? SUBJECT[s.subject].short : '')}${s.kind === 'paper' ? ' paper' : s.kind === 'mark' ? ' mark' : s.kind === 'review' ? ' review' : s.kind === 'oral' ? ' oral' : ''}</span>`),
      ...evs.map((b) => `<span class="pill ev">${b.type === 'lfc' ? '⚽' : b.type === 'f1' ? '🏎️' : b.type === 'hockey' ? '🏑' : b.type === 'off' ? '🎉' : '🚗'} ${esc(b.label.split(' – ')[0].split(' (')[0])}</span>`),
    ];
    html += `<div class="drow ${d.date === TODAY ? 'today' : ''}" data-act="openday" data-d="${d.date}"><div class="d">${DAYS[d.dow]} ${Number(d.date.slice(8))}<small>${MONTHS[Number(d.date.slice(5, 7)) - 1]}</small></div><div class="pills">${pills.join('') || '<span class="small muted">—</span>'}</div></div>`;
  }
  return `<div class="small muted" style="margin:0 4px 8px">Tap a day to open it.</div>${html}`;
}

function ragCounts(ids) {
  const c = { R: 0, A: 0, G: 0, U: 0 };
  ids.forEach((id) => c[S.ratings[id] || 'U']++);
  return c;
}
function ragBar(c, n) { return `<div class="ragbar">${['R', 'A', 'G'].map((k) => `<i class="${k}" style="width:${(100 * c[k]) / n}%"></i>`).join('')}</div>`; }

function renderTopics() {
  return `<div class="card small">Rate every topic: <b style="color:var(--bad)">R</b> = don't know it, <b style="color:var(--amber)">A</b> = shaky, <b style="color:var(--ok)">G</b> = solid. Red topics come up more often in memorise, fix-up and review sessions. Tap again to clear.</div>
  ${SUBJECTS.map((s) => {
    const ts = TOPICS.filter((t) => t.subject === s.id);
    const c = ragCounts(ts.map((t) => t.id));
    return `<details class="subj" style="--c:${s.colour}"><summary><h3>${esc(s.name)}</h3>
      <div class="small muted">${esc(s.board)} · ${s.papers.map((p) => `${esc(p.name.replace(s.name, '').replace(/^ – /, '') || 'Paper')} ${nice(p.date)}`).join(' · ')}</div>
      ${ragBar(c, ts.length)}<div class="small muted" style="margin-top:4px">${c.R} red · ${c.A} amber · ${c.G} green · ${c.U} not rated</div></summary>
      <div class="inner"><ul class="topics">${ts.map((t) => `<li><span>${esc(t.name)}</span>${ragButtons(t.id)}</li>`).join('')}</ul></div></details>`;
  }).join('')}`;
}

function renderProgress(all) {
  const rev = all.filter(isRevision);
  const due = rev.filter((s) => s.date + ' ' + s.end <= nowKey || s.done);
  void due;
  const done = rev.filter((s) => s.done);
  const hours = (l) => (l.reduce((a, s) => a + s.mins, 0) / 60).toFixed(1);
  const missed = rev.filter((s) => s.missed).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const papers = rev.filter((s) => s.kind === 'paper');
  const allIds = TOPICS.map((t) => t.id);
  const c = ragCounts(allIds);
  return `
  <div class="stats">
    <div class="stat"><span class="small muted">Sessions done</span><b>${done.length}<span class="small muted"> / ${due.length} due</span></b></div>
    <div class="stat"><span class="small muted">Hours revised</span><b>${hours(done)}<span class="small muted"> / ${hours(rev)}</span></b></div>
    <div class="stat"><span class="small muted">To reschedule · skipped</span><b><span style="color:${missed.length ? 'var(--bad)' : 'inherit'}">${missed.length}</span><span class="small muted"> · ${rev.filter((s) => s.skipped).length}</span></b></div>
    <div class="stat"><span class="small muted">Practice papers</span><b>${papers.filter((s) => s.done).length}<span class="small muted"> / ${papers.length}</span></b></div>
  </div>
  <h2>By subject (hours done / planned)</h2>
  <div class="card">${SUBJECTS.map((s) => {
    const ss = rev.filter((x) => x.subject === s.id);
    const d = ss.filter((x) => x.done), tot = ss.reduce((a, x) => a + x.mins, 0) || 1;
    return `<div class="subjrow" style="--c:${s.colour}"><span>${esc(s.short)}</span><div class="bar"><i style="width:${(100 * d.reduce((a, x) => a + x.mins, 0)) / tot}%"></i></div><span class="small muted">${hours(d)} / ${hours(ss)}h</span></div>`;
  }).join('')}</div>
  <h2>Confidence (topic ratings)</h2>
  <div class="card">${ragBar(c, allIds.length)}<div class="small muted" style="margin:6px 0 10px">${c.R} red · ${c.A} amber · ${c.G} green · ${c.U} not rated yet</div>
  ${SUBJECTS.map((s) => { const ids = TOPICS.filter((t) => t.subject === s.id).map((t) => t.id); const k = ragCounts(ids); return `<div class="subjrow"><span>${esc(s.short)}</span>${ragBar(k, ids.length)}<span class="small muted">${k.R}R ${k.A}A ${k.G}G</span></div>`; }).join('')}</div>
  <h2>Missed / clashing</h2>
  <div class="card">${missed.length ? missed.map((s) => `<button class="slot" data-act="move" data-id="${s.id}"><span><b style="color:${colour(s)}">●</b> ${esc(sessionTitle(s))}<br><span class="small muted">${nice(s.date)} ${s.start}${s.clash ? ' · clash' : ''}</span></span><span class="chip">Move</span></button>`).join('') : '<span class="muted">None – all on track 👍</span>'}</div>
  <h2>Mock exams</h2>
  <div class="card"><table class="simple">${[...PAPERS, ...OTHER_EXAMS].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).map((p) => `<tr><td>${nice(p.date)} ${p.start}</td><td>${esc(p.name)}</td><td class="small muted">${durLabel(p.mins)}</td></tr>`).join('')}</table></div>`;
}

function renderMore(all) {
  const base = location.href.split(/[?#]/)[0].replace(/index\.html$/, '');
  const feed = base + 'schedule.ics';
  const blocks = Object.entries(S.blocks || {}).sort((a, b) => (a[1].date + a[1].start).localeCompare(b[1].date + b[1].start));
  return `
  <h2>Sync</h2>
  <div class="card small">${store.mode === 'sync' ? '✅ Progress syncs live between everyone who opens this link.'
    : store.mode === 'offline' ? `⚠️ Couldn't reach the sync server – changes are saved on this device and will need re-entering. ${esc(store.lastError || '')}`
    : 'ℹ️ Sync isn’t set up yet, so progress is saved on this device only. See README step 2.'}</div>
  <h2>Calendar</h2>
  <div class="card small">
    <b>Subscribe</b> (updates automatically with the base plan):
    <code class="url">${esc(feed.replace(/^https?:/, 'webcal:'))}</code>
    <div class="actions"><a class="btn primary" href="${esc(feed.replace(/^https?:/, 'webcal:'))}">Subscribe on this phone</a><button class="btn" data-act="copyfeed" data-url="${esc(feed)}">Copy link</button></div>
    <p class="muted">Sessions Tom moves in the app don't update the subscribed calendar. To get a copy with moves included, download it instead:</p>
    <button class="btn" data-act="ics">Download my current plan (.ics)</button>
  </div>
  <h2>Busy times</h2>
  <div class="card small">
    <p class="muted" style="margin-top:0">Add anything new (a match, appointment, party). Any session it overlaps will be flagged so Tom can move it.</p>
    ${blocks.length ? `<table class="simple">${blocks.map(([id, b]) => `<tr><td>${nice(b.date)} ${b.start}–${b.end}</td><td>${esc(b.label)}</td><td><button class="btn small" data-act="delblock" data-block="${id}">✕</button></td></tr>`).join('')}</table>` : ''}
    <form id="blockForm">
      <label class="f">What</label><input name="label" required placeholder="e.g. Cup match, dentist">
      <div class="row"><div><label class="f">Date</label><input type="date" name="date" required min="${PLAN.start}" max="${PLAN.end}" value="${viewDate}"></div>
      <div><label class="f">From</label><input type="time" name="start" required value="18:00"></div><div><label class="f">To</label><input type="time" name="end" required value="20:00"></div></div>
      <div class="actions"><button class="btn primary" type="submit">Add busy time</button></div>
    </form>
  </div>
  <h2>Tom's rules</h2>
  <div class="card small"><ul style="margin:0;padding-left:18px;line-height:1.6">
    <li>School nights: max 2½ h including ~45 min homework, finish by 10pm. Fridays: homework only.</li>
    <li>Weekends: 3 h a day between 11:00 and 20:30.</li>
    <li>Holidays: up to 6 h between 10:00 and 21:00, with a 3½ h free block.</li>
    <li>No more than 1 h on a subject in a day (practice papers excepted).</li>
    <li>Days off: Christmas Day, Boxing Day, New Year's Eve evening, New Year's Day. Liverpool games, F1 qualifying & races blocked.</li>
    <li>Phases: notes (22 Nov–5 Dec), memorise (6–19 Dec), practice papers (20 Dec–4 Jan), then a short review the evening before each mock.</li>
  </ul></div>
  <h2>Backup</h2>
  <div class="card small"><div class="actions"><button class="btn" data-act="export">Export progress</button><label class="btn">Import<input type="file" accept="application/json" id="importFile" hidden></label></div></div>
  `;
}

// ── moving a session ──
function freeSlots(s, all) {
  const out = [];
  let d = clampDate(TODAY > s.date ? TODAY : TODAY);
  for (let i = 0; i < 14 && out.length < 10 && d <= PLAN.end; i++, d = addDays(d, 1)) {
    const info = plan.days.find((x) => x.date === d);
    if (!info || info.kind === 'off' || info.start == null) continue;
    const others = all.filter((x) => x.date === d && x.id !== s.id);
    const busy = [
      ...info.blocks.map((b) => [toMin(b.start), toMin(b.end)]),
      ...Object.values(S.blocks || {}).filter((b) => b.date === d).map((b) => [toMin(b.start), toMin(b.end)]),
      ...others.map((x) => [toMin(x.start) - 5, toMin(x.end) + 5]),
      ...(info.free ? [[toMin(info.free[0]), toMin(info.free[1])]] : []),
      ...(info.kind === 'weekend' || info.kind === 'holiday' ? [[toMin(RULES.lunch[0]), toMin(RULES.lunch[1])], [toMin(RULES.dinner[0]), toMin(RULES.dinner[1])]] : []),
    ];
    let from = info.start;
    if (d === TODAY) from = Math.max(from, Math.ceil((NOW_MIN + 5) / 15) * 15);
    const dayTotal = others.reduce((a, x) => a + x.mins, 0);
    const cap = info.phase === 'mocks' ? 150 : info.cap;
    const sameSubj = s.kind !== 'paper' && s.subject && others.some((x) => x.subject === s.subject && !['paper', 'mark'].includes(x.kind));
    let found = 0;
    for (let t = from; t + s.mins <= info.end && found < 2; t += 15) {
      if (busy.some(([a, b]) => t < b && t + s.mins > a)) continue;
      out.push({ date: d, start: fmt(t), over: dayTotal + s.mins > cap || info.kind === 'friday', friday: info.kind === 'friday', sameSubj, dayTotal: dayTotal + s.mins, cap });
      found++;
      t += s.mins + 45;
    }
  }
  return out;
}

function openMove(id) {
  const all = sessions();
  const s = all.find((x) => x.id === id);
  const slots = freeSlots(s, all);
  const ok = slots.filter((x) => !x.over), over = slots.filter((x) => x.over);
  const slotBtn = (x) => `<button class="slot ${x.over ? 'over' : ''}" data-act="moveto" data-id="${id}" data-date="${x.date}" data-start="${x.start}">
    <span><b>${nice(x.date)}</b> ${x.start}–${fmt(toMin(x.start) + s.mins)}<br><span class="small muted">day total ${durLabel(x.dayTotal)}${x.over ? (x.friday ? ' · Friday (homework-only night)' : ` · over the ${durLabel(x.cap)} limit`) : ''}${x.sameSubj ? ` · 2nd ${esc(SUBJECT[s.subject].short)} slot that day` : ''}</span></span><span class="chip">Pick</span></button>`;
  const sheet = document.getElementById('sheet');
  sheet.innerHTML = `<div class="panel">
    <h3>Move: ${esc(sessionTitle(s))}</h3><div class="small muted">${durLabel(s.mins)} · currently ${nice(s.date)} ${s.start}</div>
    <h2>Free slots within the rules</h2>${ok.length ? ok.map(slotBtn).join('') : '<div class="small muted">No free slots in the next two weeks within the limits – see below.</div>'}
    ${over.length ? `<h2>Would go over a limit</h2>${over.map(slotBtn).join('')}` : ''}
    <h2>Or choose a time</h2>
    <form id="moveForm" data-id="${id}"><div class="row"><div><input type="date" name="date" required min="${PLAN.start}" max="${PLAN.end}" value="${s.date < TODAY ? clampDate(TODAY) : s.date}"></div><div><input type="time" name="start" required value="${s.start}"></div></div>
    <div class="actions"><button class="btn primary" type="submit">Move here</button>
    ${S.moves[s.id] ? `<button class="btn" type="button" data-act="unmove" data-id="${id}">Put back to original time</button>` : ''}
    <button class="btn" type="button" data-act="close">Cancel</button></div></form></div>`;
  sheet.classList.remove('hidden');
}
function closeSheet() { document.getElementById('sheet').classList.add('hidden'); }

// ── events ──
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act], [data-tab]');
  if (!el) { if (e.target.id === 'sheet') closeSheet(); return; }
  if (el.dataset.tab) { tab = el.dataset.tab; history.replaceState(null, '', '#' + tab + location.search); if (tab === 'today') viewDate = clampDate(viewDate); render(); window.scrollTo(0, 0); return; }
  const card = el.closest('[data-id]');
  const id = el.dataset.id || card?.dataset.id;
  const act = el.dataset.act;
  if (act === 'rate') {
    const t = el.closest('[data-topic]').dataset.topic;
    store.set(['ratings', t], S.ratings[t] === el.dataset.v ? undefined : el.dataset.v);
  } else if (act === 'done') {
    const s = sessions().find((x) => x.id === id);
    store.set(['sessions', id], { done: true, at: new Date().toISOString(), topics: s.topicsNow });
  } else if (act === 'undo') store.set(['sessions', id], undefined);
  else if (act === 'skip') { if (confirm('Skip this session without rescheduling it? Parents will see it as skipped.')) store.set(['sessions', id], { skipped: true, at: new Date().toISOString() }); }
  else if (act === 'move') openMove(id);
  else if (act === 'moveto') { store.set(['moves', id], { date: el.dataset.date, start: el.dataset.start }); closeSheet(); }
  else if (act === 'unmove') { store.set(['moves', id], undefined); closeSheet(); }
  else if (act === 'close') closeSheet();
  else if (act === 'day') { viewDate = clampDate(addDays(viewDate, Number(el.dataset.d))); render(); }
  else if (act === 'gotoday') { viewDate = clampDate(TODAY); render(); }
  else if (act === 'openday') { viewDate = el.dataset.d; tab = 'today'; history.replaceState(null, '', '#today' + location.search); render(); window.scrollTo(0, 0); }
  else if (act === 'delblock') store.set(['blocks', el.dataset.block], undefined);
  else if (act === 'ics') download('tom-revision.ics', buildICS(sessions().filter((s) => !s.done), { url: location.href.split('#')[0], topicsFor: (s) => s.topicsNow }), 'text/calendar');
  else if (act === 'copyfeed') navigator.clipboard?.writeText(el.dataset.url).then(() => (el.textContent = 'Copied ✓'));
  else if (act === 'export') download('tom-revision-backup.json', JSON.stringify(S, null, 1), 'application/json');
});

document.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  if (e.target.id === 'moveForm') { store.set(['moves', e.target.dataset.id], { date: f.get('date'), start: f.get('start') }); closeSheet(); }
  if (e.target.id === 'blockForm') {
    if (f.get('end') <= f.get('start')) return alert('End time must be after the start time.');
    store.set(['blocks', 'b' + Date.now()], { date: f.get('date'), start: f.get('start'), end: f.get('end'), label: f.get('label') });
  }
});
document.addEventListener('change', async (e) => {
  if (e.target.id !== 'importFile' || !e.target.files[0]) return;
  try { const data = JSON.parse(await e.target.files[0].text()); if (confirm('Replace current progress with this backup?')) store.replaceAll(data); } catch { alert('That file isn’t a valid backup.'); }
});

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ── start ──
render();
store.initSync((st) => { S = st; render(); }).then((st) => { S = st; recompute(); lockNearTerm(); render(); });
