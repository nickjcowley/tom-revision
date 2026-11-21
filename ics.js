// Builds an iCalendar (.ics) file. All dates in the plan are in GMT (= UTC), so times are written as UTC.
import { sessionTitle, PAPERS, TOPIC, KIND_HELP, toMin, fmt } from './planner.js';
import { OTHER_EXAMS } from './data.js';

const stamp = (date, hhmm) => date.replaceAll('-', '') + 'T' + hhmm.replace(':', '') + '00Z';
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const fold = (line) => { const out = []; while (line.length > 74) { out.push(line.slice(0, 74)); line = ' ' + line.slice(74); } out.push(line); return out.join('\r\n'); };

export function buildICS(sessions, { url = '', topicsFor = () => null, name = "Tom's revision" } = {}) {
  const now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tom revision//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(name)}`, 'X-WR-TIMEZONE:Europe/London', 'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H'];
  for (const s of sessions) {
    const topics = (topicsFor(s) || s.topics || []).map((id) => '• ' + TOPIC[id]?.name).filter(Boolean);
    const desc = [KIND_HELP[s.kind] || '', topics.length ? '\nTopics:\n' + topics.join('\n') : (['memorise', 'fix', 'review'].includes(s.kind) ? '\nTopics: see the app (picked from your red/amber ratings).' : ''), url ? `\n${url}` : ''].join('\n');
    L.push('BEGIN:VEVENT', `UID:${s.id.replace('#', '-')}@tom-revision`, `DTSTAMP:${now}`,
      `DTSTART:${stamp(s.date, s.start)}`, `DTEND:${stamp(s.date, s.end)}`,
      fold(`SUMMARY:${esc((s.kind === 'homework' ? '📝 ' : '📚 ') + sessionTitle(s))}`), fold(`DESCRIPTION:${esc(desc)}`),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Revision starts in 5 minutes', 'TRIGGER:-PT5M', 'END:VALARM', 'END:VEVENT');
  }
  for (const p of [...PAPERS, ...OTHER_EXAMS]) {
    L.push('BEGIN:VEVENT', `UID:exam-${p.id}@tom-revision`, `DTSTAMP:${now}`,
      `DTSTART:${stamp(p.date, p.start)}`, `DTEND:${stamp(p.date, fmt(toMin(p.start) + p.mins))}`,
      fold(`SUMMARY:${esc('🎓 MOCK: ' + p.name)}`), 'END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.join('\r\n') + '\r\n';
}
