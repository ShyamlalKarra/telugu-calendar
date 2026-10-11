// Validation of the engine against dates published by independent panchangams.
// Run: node test/validate.js
const P = require('../src/panchang.js');

const DELHI = { name: 'Delhi', lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata' };
const HYD = { name: 'Hyderabad', lat: 17.385, lon: 78.4867, tz: 'Asia/Kolkata' };

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: got ${actual}${ok ? '' : `, expected ${expected}`}`);
}

// 1. Today (11 Oct 2026): Ashvayuja Shukla Pratipada, Moon in Chitra at sunrise.
let d = P.day(2026, 10, 11, HYD);
check('2026-10-11 masa', d.masa.name.en, 'Ashvayuja');
check('2026-10-11 tithi', `${d.tithi.paksha} ${d.tithi.name.en}`, 'Shukla Pratipada');
check('2026-10-11 nakshatra', d.nakshatra.name.en, 'Chitra');
check('2026-10-11 samvatsara', d.samvatsara.name, 'Parabhava');
check('2026-10-11 ayana', d.ayana.en, 'Dakshinayana');
check('2026-10-11 ritu', d.ritu.en, 'Sharad');
check('2026-10-11 vara', d.vara.en, 'Bhanu (Sunday)');

// 2. Navaratri start (published: 2025-09-22, 2027-09-30).
d = P.day(2025, 9, 22, DELHI);
check('2025 Navaratri day (tithi at sunrise)', `${d.masa.name.en} ${d.tithi.paksha} ${d.tithi.name.en}`,
  'Ashvayuja Shukla Pratipada');
// 2027: sunrise tithi is still Amavasya, but the new moon (start of Pratipada) falls the
// same morning; festival rules (ghatasthapana window) then pick this day. The engine only
// computes tithi; festival rules are a separate layer. We check Pratipada begins that morning.
{
  const rise = P.sunrise(2027, 9, 30, DELHI);
  const { start } = P.lunation(new Date(rise.getTime() + 6 * 3600e3));
  const hoursAfterSunrise = (start - rise) / 3600e3;
  check('2027 Pratipada begins within 4h of sunrise', hoursAfterSunrise > 0 && hoursAfterSunrise < 4, true);
}

// 3. Known adhika masas.
function adhikaIn(year) {
  return P.lunarMonths(new Date(Date.UTC(year, 0, 1)), new Date(Date.UTC(year + 1, 0, 1)))
    .filter((x) => x.adhika && x.start.getUTCFullYear() === year)
    .map((x) => P.MASAS[x.index].en).join(',') || 'none';
}
check('2010 adhika', adhikaIn(2010), 'Vaishakha');
check('2020 adhika', adhikaIn(2020), 'Ashvayuja');
check('2026 adhika', adhikaIn(2026), 'Jyeshtha');
check('2027 adhika', adhikaIn(2027), 'none');
check('2029 adhika', adhikaIn(2029), 'Chaitra');
// Sources conflict for 2031: one table says Shravana, bangladatetoday.com shows
// "Bhadrapada (Adhika)" for 2031-08-31. The Sun crosses into Simha ~19h before the
// Aug 18 new moon, so the Aug–Sep lunation has no sankranti ⇒ Adhika Bhadrapada.
check('2031 adhika', adhikaIn(2031), 'Bhadrapada');

// 4. Kshaya masas: sources say 1963, 1983 and next 2124.
const ks = P.lunarMonths(new Date(Date.UTC(1900, 0, 1)), new Date(Date.UTC(2200, 0, 1)))
  .filter((x) => x.kshaya).map((x) => `${x.start.toISOString().slice(0, 7)} ${P.MASAS[x.index].en}`);
console.log('Kshaya months 1900–2200 (engine):', ks.join(' | '));
check('kshaya around 1963', ks.some((s) => s.startsWith('1963') || s.startsWith('1964')), true);
check('kshaya around 1983', ks.some((s) => s.startsWith('1983') || s.startsWith('1982')), true);
// The kshaya lunation of "2124" starts in Dec 2123 and runs into Jan 2124.
check('kshaya around 2124', ks.some((s) => s.startsWith('2123-12') || s.startsWith('2124')), true);
check('1983 kshaya swallows Magha', ks.includes('1983-01 Pushya'), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
