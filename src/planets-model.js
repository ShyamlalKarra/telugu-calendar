/*
 * planets-model.js — a deliberately simple solar-system model built from the periods
 * in "Basics of Panchangam", S. Narasimha Rao, p. 4 (https://multifaiths.com/pdf/Panchang.pdf).
 *
 *   - Every orbit is a circle around the Sun, in one plane.        (ASSUMPTION: the
 *     booklet notes orbits are elliptical; circles keep the picture readable.)
 *   - Orbit size comes from the booklet's periods via Kepler's third law,
 *     a = T^(2/3) in astronomical units, with T in Earth years.
 *   - Starting positions come from Astronomy Engine for the chosen date, so the
 *     model starts where the planets really are.
 *   - Rahu moves backward at one turn per 6793.394774 days (booklet value), starting
 *     from the standard mean-node position.
 *
 * Works in the browser (global `Astronomy`) and in Node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('astronomy-engine'));
  else root.PlanetModel = factory(root.Astronomy);
})(typeof self !== 'undefined' ? self : this, function (A) {
  'use strict';

  const YEAR = 365.256374; // booklet: Earth's revolution, days
  const BODIES = [
    { key: 'Mercury', en: 'Budha', te: 'బుధుడు', period: 87.969, color: '#7FC8A9' },
    { key: 'Venus', en: 'Shukra', te: 'శుక్రుడు', period: 224.7, color: '#F1E3C2' },
    { key: 'Mars', en: 'Kuja (Bhouma)', te: 'కుజుడు', period: 686.98, color: '#E3866B' },
    { key: 'Jupiter', en: 'Guru', te: 'గురుడు', period: 4332.585, color: '#F0A860' },
    { key: 'Saturn', en: 'Shani', te: 'శని', period: 10759.22, color: '#9AAEE0' },
  ];
  const RAHU_PERIOD = 6793.394774; // booklet: one backward turn, days
  const DEG = Math.PI / 180;
  const norm = (x) => ((x % 360) + 360) % 360;

  BODIES.forEach((b) => { b.a = Math.pow(b.period / YEAR, 2 / 3); });

  function helioLon(body, date) {
    const v = A.HelioVector(A.Body[body], date);
    return A.Ecliptic(v).elon; // degrees, ecliptic of date
  }

  /** Mean lunar node (tropical), standard formula; used only as Rahu's starting point. */
  function meanNode(date) {
    const T = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / (36525 * 86400000);
    return norm(125.04452 - 1934.136261 * T);
  }

  /** Approximate Lahiri ayanamsha (same linear model as panchang.js). */
  function ayanamsha(date) {
    const years = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / (365.25 * 86400000);
    return 23.853 + years * (50.29 / 3600);
  }

  function create(startDate) {
    const earth0 = helioLon('Earth', startDate);
    const lon0 = Object.fromEntries(BODIES.map((b) => [b.key, helioLon(b.key, startDate)]));
    const rahu0 = meanNode(startDate);
    const aya0 = ayanamsha(startDate);

    const earthLon = (t) => norm(earth0 + (360 * t) / YEAR);
    const bodyLon = (b, t) => norm(lon0[b.key] + (360 * t) / b.period);
    const xy = (a, lonDeg) => [a * Math.cos(lonDeg * DEG), a * Math.sin(lonDeg * DEG)];

    /** Sun-centred position of a body (AU) at day t after the start. */
    const helio = (b, t) => xy(b.a, bodyLon(b, t));
    const earth = (t) => xy(1, earthLon(t));

    /** Earth-centred ecliptic longitude (tropical, degrees). */
    function geoLon(b, t) {
      const [px, py] = helio(b, t), [ex, ey] = earth(t);
      return norm(Math.atan2(py - ey, px - ex) / DEG);
    }
    const sunGeoLon = (t) => norm(earthLon(t) + 180);
    const rahuLon = (t) => norm(rahu0 - (360 * t) / RAHU_PERIOD);
    const ayaAt = (t) => aya0 + (t / 365.25) * (50.29 / 3600);
    const sidereal = (lon, t) => norm(lon - ayaAt(t));

    /** True if the body's Earth-centred longitude is decreasing at day t (vakra). */
    function vakra(b, t) {
      const d = ((geoLon(b, t + 0.5) - geoLon(b, t - 0.5) + 540) % 360) - 180;
      return d < 0;
    }

    return { BODIES, YEAR, startDate, helio, earth, geoLon, sunGeoLon, rahuLon, sidereal, vakra, earthLon, bodyLon };
  }

  return { BODIES, YEAR, RAHU_PERIOD, create, helioLon, meanNode, ayanamsha };
});
