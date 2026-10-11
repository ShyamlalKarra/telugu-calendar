// How close is the circle model (booklet periods) to the real sky?
// Compares Earth-centred longitude and vakra status against Astronomy Engine
// over the two years from 11 Oct 2026. Run: node test/planets-check.js
const A = require('astronomy-engine');
const PM = require('../src/planets-model.js');

const start = new Date(Date.UTC(2026, 9, 11));
const m = PM.create(start);
const DAY = 86400000;

function realGeoLon(key, date) {
  return A.Ecliptic(A.GeoVector(A.Body[key], date, true)).elon;
}
function realVakra(key, date) {
  const a = realGeoLon(key, new Date(date - DAY / 2)), b = realGeoLon(key, new Date(+date + DAY / 2));
  return (((b - a + 540) % 360) - 180) < 0;
}

let fail = 0;
for (const b of PM.BODIES) {
  let maxErr = 0, agree = 0, n = 0;
  const realRuns = [], modelRuns = [];
  let rPrev = false, mPrev = false;
  for (let t = 0; t <= 730; t += 1) {
    const d = new Date(+start + t * DAY);
    const err = Math.abs((((m.geoLon(b, t) - realGeoLon(b.key, d)) + 540) % 360) - 180);
    maxErr = Math.max(maxErr, err);
    const rv = realVakra(b.key, d), mv = m.vakra(b, t);
    if (rv === mv) agree++;
    n++;
    if (rv && !rPrev) realRuns.push(d.toISOString().slice(0, 10));
    if (mv && !mPrev) modelRuns.push(d.toISOString().slice(0, 10));
    rPrev = rv; mPrev = mv;
  }
  const pct = (100 * agree) / n;
  console.log(`${b.en.padEnd(14)} max longitude error ${maxErr.toFixed(1).padStart(5)}°  ` +
    `vakra agrees ${pct.toFixed(0)}% of days  vakra starts (real) ${realRuns.join(', ') || '—'}  (model) ${modelRuns.join(', ') || '—'}`);
  if (pct < 85) fail++;
}

// Rahu: booklet rate vs the standard mean-node formula after 2 years.
const r2 = m.rahuLon(730), std = PM.meanNode(new Date(+start + 730 * DAY));
console.log(`Rahu           after 2 years, booklet rate vs standard formula differ by ${Math.abs(r2 - std).toFixed(2)}°`);

// Booklet Moon period check (see README).
const syn = (M) => 1 / (1 / M - 1 / PM.YEAR);
console.log(`Moon           booklet 27.32966 d gives a ${syn(27.32966).toFixed(4)} d lunar month; 27.32166 d gives ${syn(27.32166).toFixed(4)} d`);
process.exit(fail ? 1 : 0);
