// Verifies the generated plan against Tom's rules. Run: node tools/check-plan.mjs
import { generatePlan, toMin, PAPERS, TOPICS, assignTopics } from '../planner.js';
import { RULES, HOME_TIME, DAY_OVERRIDES } from '../data.js';

const plan = generatePlan();
const errs = [];
const by = {};
plan.sessions.forEach((s) => (by[s.date] ??= []).push(s));

for (const d of plan.days) {
  const ss = by[d.date] || [];
  const tot = ss.reduce((a, s) => a + s.mins, 0);
  const rev = ss.filter((s) => s.kind !== 'homework').reduce((a, s) => a + s.mins, 0);
  const first = ss.length ? toMin(ss[0].start) : null, last = ss.length ? toMin(ss[ss.length - 1].end) : null;
  const E = (m) => errs.push(`${d.date} ${d.kind}: ${m}`);
  // overlaps
  for (const s of ss) {
    for (const b of d.blocks) if (toMin(s.start) < toMin(b.end) && toMin(s.end) > toMin(b.start)) E(`${s.start} overlaps ${b.label}`);
    for (const t of ss) if (t !== s && toMin(s.start) < toMin(t.end) && toMin(s.end) > toMin(t.start)) E(`sessions overlap ${s.start}/${t.start}`);
  }
  const ov = DAY_OVERRIDES[d.date] || {};
  if (d.kind === 'off' && ss.length) E('work on a day off');
  if (d.phase === 'mocks') {
    if (ss.some((s) => s.kind !== 'review')) E('non-review work in mocks');
    if (last && last > toMin('22:00')) E('after 22:00');
    continue;
  }
  if (d.kind === 'schoolnight') {
    if (tot > RULES.schoolNight.totalMins) E(`total ${tot} > 150`);
    if (last > toMin('22:00')) E('after 22:00');
    if (first !== null && first < toMin(HOME_TIME[d.dow])) E('before home time');
  }
  if (d.kind === 'friday' && (rev > 0 || tot > 45)) E('Friday revision');
  if (d.kind === 'weekend') {
    if (rev > RULES.weekend.totalMins) E(`weekend ${rev} > 180`);
    if (first < toMin('11:00') || last > toMin('20:30')) E('weekend outside 11:00–20:30');
  }
  if (d.kind === 'holiday') {
    const cap = ov.totalMins ?? 360;
    if (rev > cap) E(`holiday ${rev} > ${cap}`);
    if (first < toMin(ov.start ?? '10:00') || last > toMin(ov.end ?? '21:00')) E('holiday outside window');
    const longBusy = d.blocks.some((b) => toMin(b.end) - toMin(b.start) >= 180);
    if (!d.free && !longBusy && toMin(ov.end ?? '21:00') - toMin(ov.start ?? '10:00') > 420) E('no 3–4h free block');
  }
  // 1 hour per subject per day (practice papers exempt)
  const perSub = {};
  ss.filter((s) => s.subject && !['paper', 'mark', 'oral', 'review'].includes(s.kind)).forEach((s) => (perSub[s.subject] = (perSub[s.subject] || 0) + s.mins));
  for (const [k, v] of Object.entries(perSub)) if (v > 60) E(`${k} ${v} min in a day`);
  ss.forEach((s) => { if (!['paper'].includes(s.kind) && s.mins > 60) E(`${s.kind} longer than 1h`); });
}

// every mock paper has a practice paper, each followed by marking
for (const p of PAPERS) {
  const pp = plan.sessions.filter((s) => s.kind === 'paper' && s.paperId === p.id);
  if (!pp.length) errs.push(`no practice paper for ${p.id}`);
  for (const x of pp) {
    const m = plan.sessions.find((s) => s.kind === 'mark' && s.paperId === p.id && s.round === x.round && (s.date + s.start) > (x.date + x.start));
    if (!m) errs.push(`practice paper ${p.id} r${x.round} never marked`);
  }
  const rv = plan.sessions.find((s) => s.kind === 'review' && s.paperId === p.id);
  if (!rv) errs.push(`no evening-before review for ${p.id}`);
}
// every topic gets a notes session
const noted = new Set(plan.sessions.flatMap((s) => (s.kind === 'notes' ? s.topics : [])));
TOPICS.forEach((t) => { if (!noted.has(t.id)) errs.push(`topic never in notes: ${t.id} ${t.name}`); });
// ids unique
if (new Set(plan.sessions.map((s) => s.id)).size !== plan.sessions.length) errs.push('duplicate ids');
// red topics come up more in memorise
const reds = { 'bio-11': 'R', 'bio-12': 'R' };
const a0 = assignTopics(plan, {}), a1 = assignTopics(plan, reds);
const count = (a, id) => Object.values(a).filter((l) => l.includes(id)).length;
if (!(count(a1, 'bio-11') > count(a0, 'bio-11'))) errs.push('red rating does not increase slots');

const sum = (k) => plan.sessions.filter((s) => k(s)).reduce((a, s) => a + s.mins, 0) / 60;
console.log(`Sessions: ${plan.sessions.length}  revision hours: ${sum((s) => s.kind !== 'homework').toFixed(1)}`);
console.log(`Practice papers: ${plan.sessions.filter((s) => s.kind === 'paper').length}`);
for (const ph of ['notes', 'memorise', 'papers', 'mocks']) console.log(`  ${ph}: ${sum((s) => s.kind !== 'homework' && plan.days.find((d) => d.date === s.date).phase === ph).toFixed(1)}h`);
console.log(`Red test: bio.11 appears ${count(a0, 'bio-11')}× unrated → ${count(a1, 'bio-11')}× when red`);
console.log(errs.length ? `\n${errs.length} PROBLEMS:\n` + errs.join('\n') : '\nAll rules pass ✔');
process.exit(errs.length ? 1 : 0);
