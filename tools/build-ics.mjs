// Regenerates schedule.ics (the calendar feed) from the plan. Run after editing data.js:
//   node tools/build-ics.mjs
import { writeFileSync } from 'node:fs';
import { generatePlan } from '../planner.js';
import { buildICS } from '../ics.js';
const plan = generatePlan();
const ics = buildICS(plan.sessions, { name: "Tom's revision" });
writeFileSync(new URL('../schedule.ics', import.meta.url), ics);
console.log(`schedule.ics written: ${plan.sessions.length} sessions`);
