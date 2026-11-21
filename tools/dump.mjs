import { generatePlan, sessionTitle, SUBJECT, durLabel } from '../planner.js';
const plan = generatePlan();
const byDate = {};
plan.sessions.forEach(s => (byDate[s.date] ??= []).push(s));
for (const d of plan.days) {
  const ss = byDate[d.date] || [];
  const tot = ss.reduce((a,s)=>a+s.mins,0);
  console.log(`\n${d.date} ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.dow]} ${d.kind}/${d.phase} total=${durLabel(tot)} ${d.free?'free '+d.free.join('-'):''}`);
  d.blocks.forEach(b=>console.log(`   [${b.start}-${b.end}] ${b.label}`));
  ss.forEach(s=>console.log(`   ${s.start}-${s.end} ${sessionTitle(s)} ${s.topics? '('+s.topics.length+' topics)':''}`));
}
console.log('unplaced papers', plan.unplacedPapers);
const tot = {}; plan.sessions.forEach(s=>{ if(s.subject) tot[s.subject]=(tot[s.subject]||0)+s.mins });
console.log(Object.entries(tot).map(([k,v])=>k+':'+durLabel(v)).join(' '));
