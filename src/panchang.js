/*
 * panchang.js — a small, readable panchangam engine for the Telugu (amanta) calendar.
 *
 * Works in the browser (expects global `Astronomy` from astronomy-engine) and in Node
 * (requires 'astronomy-engine').
 *
 * Model (think of it as a transition system):
 *   state      = (sidereal Sun longitude, sidereal Moon longitude) at an instant
 *   tithi      = floor(elongation / 12°)            elongation = Moon − Sun
 *   nakshatra  = floor(Moon_sidereal / 13°20′)
 *   masa       = named by the sankranti (Sun entering a rashi) inside the lunar month
 *                (amanta: new moon → new moon). No sankranti ⇒ adhika; two ⇒ kshaya.
 *
 * ASSUMPTIONS (flagged — verify before relying on them):
 *   - Ayanamsha: a linear Lahiri approximation (see `ayanamsha`). Good to roughly an
 *     arcminute near the present, NOT a substitute for the official Lahiri value.
 *   - Ayana is reckoned from the sidereal Sun (Makara / Karkataka sankranti).
 *   - Ritu is reckoned from the lunar masa (Chaitra+Vaishakha = Vasanta, ...).
 *   - Tithi / nakshatra / vara for a civil day are taken at local sunrise.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('astronomy-engine'));
  } else {
    root.Panchang = factory(root.Astronomy);
  }
})(typeof self !== 'undefined' ? self : this, function (A) {
  'use strict';

  const DAY = 86400000;
  const NAK_SPAN = 360 / 27;

  // ---------- names ----------
  const MASAS = [
    { en: 'Chaitra', te: 'చైత్రము', purnimaStar: 'Chitra' },
    { en: 'Vaishakha', te: 'వైశాఖము', purnimaStar: 'Vishakha' },
    { en: 'Jyeshtha', te: 'జ్యేష్ఠము', purnimaStar: 'Jyeshtha' },
    { en: 'Ashadha', te: 'ఆషాఢము', purnimaStar: 'Purvashadha' },
    { en: 'Shravana', te: 'శ్రావణము', purnimaStar: 'Shravana' },
    { en: 'Bhadrapada', te: 'భాద్రపదము', purnimaStar: 'Purvabhadra' },
    { en: 'Ashvayuja', te: 'ఆశ్వయుజము', purnimaStar: 'Ashvini' },
    { en: 'Kartika', te: 'కార్తికము', purnimaStar: 'Krittika' },
    { en: 'Margashira', te: 'మార్గశిరము', purnimaStar: 'Mrigashira' },
    { en: 'Pushya', te: 'పుష్యము', purnimaStar: 'Pushya' },
    { en: 'Magha', te: 'మాఘము', purnimaStar: 'Magha' },
    { en: 'Phalguna', te: 'ఫాల్గుణము', purnimaStar: 'Purva Phalguni' },
  ];

  const RASHIS = [
    { en: 'Mesha', te: 'మేషం' }, { en: 'Vrishabha', te: 'వృషభం' }, { en: 'Mithuna', te: 'మిథునం' },
    { en: 'Karkataka', te: 'కర్కాటకం' }, { en: 'Simha', te: 'సింహం' }, { en: 'Kanya', te: 'కన్య' },
    { en: 'Tula', te: 'తుల' }, { en: 'Vrishchika', te: 'వృశ్చికం' }, { en: 'Dhanus', te: 'ధనుస్సు' },
    { en: 'Makara', te: 'మకరం' }, { en: 'Kumbha', te: 'కుంభం' }, { en: 'Meena', te: 'మీనం' },
  ];

  const NAKSHATRAS = [
    ['Ashvini', 'అశ్విని'], ['Bharani', 'భరణి'], ['Krittika', 'కృత్తిక'], ['Rohini', 'రోహిణి'],
    ['Mrigashira', 'మృగశిర'], ['Ardra', 'ఆర్ద్ర'], ['Punarvasu', 'పునర్వసు'], ['Pushya', 'పుష్యమి'],
    ['Ashlesha', 'ఆశ్లేష'], ['Magha', 'మఖ'], ['Purva Phalguni', 'పుబ్బ'], ['Uttara Phalguni', 'ఉత్తర'],
    ['Hasta', 'హస్త'], ['Chitra', 'చిత్త'], ['Svati', 'స్వాతి'], ['Vishakha', 'విశాఖ'],
    ['Anuradha', 'అనూరాధ'], ['Jyeshtha', 'జ్యేష్ఠ'], ['Mula', 'మూల'], ['Purvashadha', 'పూర్వాషాఢ'],
    ['Uttarashadha', 'ఉత్తరాషాఢ'], ['Shravana', 'శ్రవణం'], ['Dhanishtha', 'ధనిష్ఠ'],
    ['Shatabhisha', 'శతభిషం'], ['Purvabhadra', 'పూర్వాభాద్ర'], ['Uttarabhadra', 'ఉత్తరాభాద్ర'],
    ['Revati', 'రేవతి'],
  ].map(([en, te]) => ({ en, te }));

  const TITHIS = [
    ['Pratipada', 'పాడ్యమి'], ['Dvitiya', 'విదియ'], ['Tritiya', 'తదియ'], ['Chaturthi', 'చవితి'],
    ['Panchami', 'పంచమి'], ['Shashthi', 'షష్ఠి'], ['Saptami', 'సప్తమి'], ['Ashtami', 'అష్టమి'],
    ['Navami', 'నవమి'], ['Dashami', 'దశమి'], ['Ekadashi', 'ఏకాదశి'], ['Dvadashi', 'ద్వాదశి'],
    ['Trayodashi', 'త్రయోదశి'], ['Chaturdashi', 'చతుర్దశి'],
  ].map(([en, te]) => ({ en, te }));
  const PURNIMA = { en: 'Purnima', te: 'పౌర్ణమి' };
  const AMAVASYA = { en: 'Amavasya', te: 'అమావాస్య' };

  const VARAS = [
    { en: 'Bhanu (Sunday)', te: 'భానువారం' }, { en: 'Soma (Monday)', te: 'సోమవారం' },
    { en: 'Mangala (Tuesday)', te: 'మంగళవారం' }, { en: 'Budha (Wednesday)', te: 'బుధవారం' },
    { en: 'Guru (Thursday)', te: 'గురువారం' }, { en: 'Shukra (Friday)', te: 'శుక్రవారం' },
    { en: 'Shani (Saturday)', te: 'శనివారం' },
  ];

  const RITUS = [
    { en: 'Vasanta', te: 'వసంత' }, { en: 'Grishma', te: 'గ్రీష్మ' }, { en: 'Varsha', te: 'వర్ష' },
    { en: 'Sharad', te: 'శరద్' }, { en: 'Hemanta', te: 'హేమంత' }, { en: 'Shishira', te: 'శిశిర' },
  ];

  // Telugu/South-Indian 60-year cycle, index 0 = Prabhava. 1987 began Prabhava.
  const SAMVATSARAS = ['Prabhava', 'Vibhava', 'Shukla', 'Pramoduta', 'Prajotpatti', 'Angirasa',
    'Shrimukha', 'Bhava', 'Yuva', 'Dhatu', 'Ishvara', 'Bahudhanya', 'Pramadi', 'Vikrama', 'Vrisha',
    'Chitrabhanu', 'Svabhanu', 'Tarana', 'Parthiva', 'Vyaya', 'Sarvajit', 'Sarvadhari', 'Virodhi',
    'Vikriti', 'Khara', 'Nandana', 'Vijaya', 'Jaya', 'Manmatha', 'Durmukhi', 'Hevilambi', 'Vilambi',
    'Vikari', 'Sharvari', 'Plava', 'Shubhakrit', 'Shobhakrit', 'Krodhi', 'Vishvavasu', 'Parabhava',
    'Plavanga', 'Kilaka', 'Saumya', 'Sadharana', 'Virodhikrit', 'Paridhavi', 'Pramadicha', 'Ananda',
    'Rakshasa', 'Nala', 'Pingala', 'Kalayukti', 'Siddharthi', 'Raudri', 'Durmati', 'Dundubhi',
    'Rudhirodgari', 'Raktakshi', 'Krodhana', 'Akshaya'];
  // Telugu spellings — NEEDS REVIEW by a native reader before release.
  const SAMVATSARAS_TE = ['ప్రభవ', 'విభవ', 'శుక్ల', 'ప్రమోదూత', 'ప్రజోత్పత్తి', 'ఆంగీరస',
    'శ్రీముఖ', 'భావ', 'యువ', 'ధాత', 'ఈశ్వర', 'బహుధాన్య', 'ప్రమాది', 'విక్రమ', 'వృష',
    'చిత్రభాను', 'స్వభాను', 'తారణ', 'పార్థివ', 'వ్యయ', 'సర్వజిత్', 'సర్వధారి', 'విరోధి',
    'వికృతి', 'ఖర', 'నందన', 'విజయ', 'జయ', 'మన్మథ', 'దుర్ముఖి', 'హేవిళంబి', 'విళంబి',
    'వికారి', 'శార్వరి', 'ప్లవ', 'శుభకృత్', 'శోభకృత్', 'క్రోధి', 'విశ్వావసు', 'పరాభవ',
    'ప్లవంగ', 'కీలక', 'సౌమ్య', 'సాధారణ', 'విరోధికృత్', 'పరిధావి', 'ప్రమాదీచ', 'ఆనంద',
    'రాక్షస', 'నల', 'పింగళ', 'కాళయుక్తి', 'సిద్ధార్థి', 'రౌద్రి', 'దుర్మతి', 'దుందుభి',
    'రుధిరోద్గారి', 'రక్తాక్షి', 'క్రోధన', 'అక్షయ'];

  // ---------- astronomy ----------
  const norm = (x) => ((x % 360) + 360) % 360;

  /** Approximate Lahiri ayanamsha in degrees (ASSUMPTION: linear model). */
  function ayanamsha(date) {
    const years = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / (365.25 * DAY);
    return 23.853 + years * (50.29 / 3600);
  }
  const sunTropical = (d) => A.SunPosition(d).elon;
  const moonTropical = (d) => A.EclipticGeoMoon(d).lon;
  const sunSidereal = (d) => norm(sunTropical(d) - ayanamsha(d));
  const moonSidereal = (d) => norm(moonTropical(d) - ayanamsha(d));
  const elongation = (d) => A.MoonPhase(d); // Moon − Sun, 0..360 (ayanamsha cancels)

  const toDate = (t) => (t instanceof Date ? t : t.date);

  /** Last new moon at or before `date`, and the next one after it. */
  function lunation(date) {
    let nm = toDate(A.SearchMoonPhase(0, new Date(date.getTime() - 32 * DAY), 40));
    for (;;) {
      const next = toDate(A.SearchMoonPhase(0, new Date(nm.getTime() + 1 * DAY), 40));
      if (next.getTime() > date.getTime()) return { start: nm, end: next };
      nm = next;
    }
  }

  /** Masa (amanta) for any instant. */
  function masaAt(date) {
    const { start, end } = lunation(date);
    const r1 = Math.floor(sunSidereal(start) / 30);
    const r2 = Math.floor(sunSidereal(end) / 30);
    const nSankranti = (r2 - r1 + 12) % 12; // 0, 1 or 2 in practice
    const index = (r1 + 1) % 12;
    return {
      index,
      name: MASAS[index],
      adhika: nSankranti === 0,
      kshaya: nSankranti === 2, // this lunar month swallows the *next* masa name too
      skipped: nSankranti === 2 ? MASAS[(r1 + 2) % 12] : null,
      start, end,
      sunRashiAtStart: RASHIS[r1],
      sankrantis: nSankranti,
    };
  }

  function tithiAt(date) {
    const e = elongation(date);
    const n = Math.floor(e / 12); // 0..29
    const paksha = n < 15 ? 'Shukla' : 'Krishna';
    const k = n % 15;
    let name;
    if (n === 14) name = PURNIMA; else if (n === 29) name = AMAVASYA; else name = TITHIS[k];
    return { number: n + 1, inPaksha: k + 1, paksha, name, elongation: e, progress: (e % 12) / 12 };
  }

  function nakshatraAt(date) {
    const m = moonSidereal(date);
    const n = Math.floor(m / NAK_SPAN);
    return { number: n + 1, name: NAKSHATRAS[n], moonSidereal: m, progress: (m % NAK_SPAN) / NAK_SPAN };
  }

  // ---------- time zones (no library) ----------
  function tzOffsetMinutes(date, tz) {
    const f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return Math.round((asUTC - date.getTime()) / 60000);
  }
  /** UTC instant of local midnight for civil date y-m-d in tz. */
  function localMidnight(y, m, d, tz) {
    let guess = Date.UTC(y, m - 1, d);
    for (let i = 0; i < 3; i++) guess = Date.UTC(y, m - 1, d) - tzOffsetMinutes(new Date(guess), tz) * 60000;
    return new Date(guess);
  }

  function sunrise(y, m, d, place) {
    const obs = new A.Observer(place.lat, place.lon, place.elev || 0);
    const t = A.SearchRiseSet(A.Body.Sun, obs, +1, localMidnight(y, m, d, place.tz), 1.2);
    return t ? toDate(t) : null;
  }
  function sunset(y, m, d, place) {
    const obs = new A.Observer(place.lat, place.lon, place.elev || 0);
    const t = A.SearchRiseSet(A.Body.Sun, obs, -1, localMidnight(y, m, d, place.tz), 1.2);
    return t ? toDate(t) : null;
  }

  // ---------- the sankalpam for a civil day ----------
  function samvatsaraFor(date, masa) {
    // Gregorian year in which the current lunar year's Ugadi fell.
    let y = date.getUTCFullYear();
    const mon = date.getUTCMonth() + 1;
    const beforeUgadi = masa.index >= 9 || (masa.index === 0 && masa.adhika);
    if (beforeUgadi && mon <= 5) y -= 1;
    const idx = (((y - 1987) % 60) + 60) % 60;
    return { index: idx, name: SAMVATSARAS[idx], te: SAMVATSARAS_TE[idx], ugadiYear: y };
  }

  function day(y, m, d, place) {
    const rise = sunrise(y, m, d, place);
    const t = rise || localMidnight(y, m, d, place.tz);
    const masa = masaAt(t);
    const tithi = tithiAt(t);
    const nak = nakshatraAt(t);
    const sunSid = sunSidereal(t);
    const ayana = sunSid >= 90 && sunSid < 270
      ? { en: 'Dakshinayana', te: 'దక్షిణాయనం' } : { en: 'Uttarayana', te: 'ఉత్తరాయణం' };
    const ritu = RITUS[Math.floor(masa.index / 2)];
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return {
      date: { y, m, d }, place, sunrise: rise, sunset: sunset(y, m, d, place),
      samvatsara: samvatsaraFor(new Date(Date.UTC(y, m - 1, d)), masa),
      ayana, ritu, masa, tithi, nakshatra: nak, vara: VARAS[weekday],
      sun: { sidereal: sunSid, rashi: RASHIS[Math.floor(sunSid / 30)] },
      ayanamsha: ayanamsha(t),
    };
  }

  /** Every lunar month between two dates — for pattern analysis. */
  function lunarMonths(from, to) {
    const out = [];
    let { start } = lunation(from);
    while (start < to) {
      const end = toDate(A.SearchMoonPhase(0, new Date(start.getTime() + DAY), 40));
      const r1 = Math.floor(sunSidereal(start) / 30);
      const r2 = Math.floor(sunSidereal(end) / 30);
      const n = (r2 - r1 + 12) % 12;
      out.push({ start, end, index: (r1 + 1) % 12, sankrantis: n, adhika: n === 0, kshaya: n === 2 });
      start = end;
    }
    return out;
  }

  /** Next instant the sidereal Sun reaches `rashiIndex * 30°` (a sankranti). */
  function nextSankranti(after) {
    const r = Math.floor(sunSidereal(after) / 30);
    const target = norm((r + 1) * 30 + ayanamsha(after));
    const t = A.SearchSunLongitude(target, after, 40);
    return t ? { date: toDate(t), rashi: RASHIS[(r + 1) % 12] } : null;
  }

  return {
    MASAS, RASHIS, NAKSHATRAS, RITUS, SAMVATSARAS,
    ayanamsha, sunSidereal, moonSidereal, elongation,
    lunation, masaAt, tithiAt, nakshatraAt, sunrise, sunset, day, lunarMonths, nextSankranti,
    localMidnight, tzOffsetMinutes,
  };
});
