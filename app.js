/* app.js — renders the sankalpam terms and the masa dial. */
(function () {
  'use strict';
  const P = window.Panchang;
  const DAY = 86400000;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CITIES = [
    { name: 'Hyderabad', lat: 17.385, lon: 78.4867, tz: 'Asia/Kolkata' },
    { name: 'Vijayawada', lat: 16.5062, lon: 80.648, tz: 'Asia/Kolkata' },
    { name: 'Visakhapatnam', lat: 17.6868, lon: 83.2185, tz: 'Asia/Kolkata' },
    { name: 'Tirupati', lat: 13.6288, lon: 79.4192, tz: 'Asia/Kolkata' },
    { name: 'Bengaluru', lat: 12.9716, lon: 77.5946, tz: 'Asia/Kolkata' },
    { name: 'Chennai', lat: 13.0827, lon: 80.2707, tz: 'Asia/Kolkata' },
    { name: 'Edison, NJ', lat: 40.5187, lon: -74.4121, tz: 'America/New_York' },
    { name: 'Dallas', lat: 32.7767, lon: -96.797, tz: 'America/Chicago' },
    { name: 'Chicago', lat: 41.8781, lon: -87.6298, tz: 'America/Chicago' },
    { name: 'Atlanta', lat: 33.749, lon: -84.388, tz: 'America/New_York' },
    { name: 'San Jose', lat: 37.3382, lon: -121.8863, tz: 'America/Los_Angeles' },
    { name: 'Phoenix', lat: 33.4484, lon: -112.074, tz: 'America/Phoenix' },
    { name: 'Toronto', lat: 43.6532, lon: -79.3832, tz: 'America/Toronto' },
    { name: 'London', lat: 51.5072, lon: -0.1276, tz: 'Europe/London' },
    { name: 'Frankfurt', lat: 50.1109, lon: 8.6821, tz: 'Europe/Berlin' },
    { name: 'Sydney', lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' },
    { name: 'Singapore', lat: 1.3521, lon: 103.8198, tz: 'Asia/Singapore' },
  ];

  const $ = (id) => document.getElementById(id);
  const citySel = $('city'), dateIn = $('date');

  CITIES.forEach((c, i) => citySel.add(new Option(c.name, i)));
  citySel.value = '0';

  function todayIn(tz) {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
      .format(new Date());
    return p; // yyyy-mm-dd
  }
  const fmtTime = (d, tz) => d ? new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(d) : '—';
  const fmtDate = (d, tz) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  const fmtDay = (d, tz) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, day: 'numeric', month: 'short' }).format(d);
  const deg = (x) => `${Math.floor(x % 30)}°`;

  let state = { day: null, active: 'masa', dialDate: null };

  // ---------- the recital ----------
  function terms(d) {
    const m = d.masa;
    const masaTe = (m.adhika ? 'అధిక ' : m.kshaya ? '' : '') + m.name.te;
    const masaEn = (m.adhika ? 'Adhika ' : '') + m.name.en;
    return [
      { key: 'samvatsara', te: d.samvatsara.te, tr: `${d.samvatsara.name} samvatsara` },
      { key: 'ayana', te: d.ayana.te, tr: d.ayana.en },
      { key: 'ritu', te: d.ritu.te + ' ఋతువు', tr: `${d.ritu.en} ritu` },
      { key: 'masa', te: masaTe, tr: `${masaEn} masa` },
      { key: 'paksha', te: d.tithi.paksha === 'Shukla' ? 'శుక్ల పక్షం' : 'కృష్ణ పక్షం', tr: `${d.tithi.paksha} paksha` },
      { key: 'tithi', te: d.tithi.name.te, tr: `${d.tithi.name.en} tithi` },
      { key: 'vara', te: d.vara.te, tr: d.vara.en },
      { key: 'nakshatra', te: d.nakshatra.name.te, tr: `${d.nakshatra.name.en} nakshatra` },
    ];
  }

  function renderTerms() {
    const d = state.day, ol = $('terms');
    ol.innerHTML = '';
    for (const t of terms(d)) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.className = 'term'; b.type = 'button';
      b.setAttribute('aria-pressed', String(t.key === state.active));
      b.dataset.key = t.key;
      b.innerHTML = `<span class="te" lang="te">${t.te}</span><span class="tr">${t.tr}</span>`;
      b.addEventListener('click', () => { state.active = t.key; renderTerms(); renderExplain(); });
      li.appendChild(b); ol.appendChild(li);
    }
    const tz = d.place.tz;
    $('when').textContent = `${fmtDate(new Date(Date.UTC(d.date.y, d.date.m - 1, d.date.d, 12)), 'UTC')} in ${d.place.name}. ` +
      `Sunrise ${fmtTime(d.sunrise, tz)}, sunset ${fmtTime(d.sunset, tz)} (local time). Values below are at sunrise.`;
  }

  // ---------- explanations (one pattern per word) ----------
  function renderExplain() {
    const d = state.day, tz = d.place.tz, el = $('explain');
    const m = d.masa;
    let h = '', body = '';
    switch (state.active) {
      case 'samvatsara':
        h = `${d.samvatsara.te}: year ${d.samvatsara.index + 1} of 60`;
        body = `<p>Years are named from a wheel of 60, starting at Prabhava. The name changes once a year, at Ugadi (the first day of Chaitra). This lunar year began at Ugadi ${d.samvatsara.ugadiYear}.</p>
          <p class="fact">The wheel repeats every 60 years, so someone born in a Parabhava year meets Parabhava again at 60. That is why the 60th birthday (shashtipurti) is special.</p>`;
        break;
      case 'ayana': {
        const s = d.sun.sidereal;
        h = d.ayana.te;
        body = `<p>Ayana is the Sun's half-year. Uttarayana begins when the Sun enters Makara (mid-January) and Dakshinayana when it enters Karkataka (mid-July).</p>
          <p class="fact">At sunrise today the Sun is ${deg(s)} into ${d.sun.rashi.en} (sidereal). This word changes only twice a year.</p>`;
        break;
      }
      case 'ritu': {
        const i = Math.floor(m.index / 2) * 2;
        h = `${d.ritu.te} ఋతువు`;
        body = `<p>The six ritus each take two masas, in order: Vasanta, Grishma, Varsha, Sharad, Hemanta, Shishira. ${d.ritu.en} is ${P.MASAS[i].en} and ${P.MASAS[i + 1].en}.</p>
          <p class="fact">So once you know the masa, the ritu comes free. Some families count ritu by the Sun's rashi instead; this page counts by masa.</p>`;
        break;
      }
      case 'masa': {
        const sk = P.nextSankranti(m.start);
        const crossed = sk && sk.date < m.end;
        h = (m.adhika ? 'అధిక ' : '') + m.name.te;
        body = `<p>A masa runs from one new moon (amavasya) to the next: here ${fmtDay(m.start, tz)} to ${fmtDay(m.end, tz)}. It is named after the sankranti that falls inside it.</p>
          <p>${crossed && !m.adhika
            ? `The Sun enters ${sk.rashi.en} on ${fmtDay(sk.date, tz)}. ${sk.rashi.en} is rashi number ${P.RASHIS.indexOf(sk.rashi) + 1}, so this is masa number ${m.index + 1}: ${m.name.en}.`
            : `The Sun stays in ${m.sunRashiAtStart.en} for the whole month. No sankranti, so this month repeats the next name and is called adhika.`}</p>
          <p class="fact">A second check you can do in the sky: the full moon this month is near the nakshatra ${m.name.purnimaStar}. The dial below shows the whole year.</p>`;
        break;
      }
      case 'paksha':
        h = d.tithi.paksha === 'Shukla' ? 'శుక్ల పక్షం' : 'కృష్ణ పక్షం';
        body = `<p>Shukla paksha is the bright half, when the Moon grows from new to full. Krishna paksha is the dark half, when it shrinks. Each half has 15 tithis.</p>
          <p class="fact">Look at the Moon: growing means Shukla, shrinking means Krishna.</p>`;
        break;
      case 'tithi': {
        const n = d.tithi.number;
        const beads = Array.from({ length: 30 }, (_, i) => `<span class="${i + 1 < n ? 'past' : i + 1 === n ? 'now' : ''}" title="Tithi ${i + 1}"></span>`).join('');
        h = `${d.tithi.name.te}: tithi ${n} of 30`;
        body = `<p>Every tithi is 12° of the Moon pulling ahead of the Sun. 30 tithis × 12° = 360°, one full lap, from new moon to new moon.</p>
          <div class="moonbar" aria-hidden="true">${beads}</div>
          <p class="fact">At sunrise the Moon is ${d.tithi.elongation.toFixed(1)}° ahead of the Sun, ${Math.round(d.tithi.progress * 100)}% of the way through this tithi. The Moon's speed varies, so a tithi can end before the next sunrise (skipped) or last past two sunrises (repeated).</p>`;
        break;
      }
      case 'vara':
        h = d.vara.te;
        body = `<p>In the panchangam the day begins at sunrise, not midnight. Today's sunrise in ${d.place.name} is ${fmtTime(d.sunrise, tz)}.</p>
          <p class="fact">The weekday names match the English week: Bhanu is the Sun's day (Sunday), Soma the Moon's (Monday).</p>`;
        break;
      case 'nakshatra':
        h = `${d.nakshatra.name.te}: nakshatra ${d.nakshatra.number} of 27`;
        body = `<p>The sky is cut into 27 nakshatras of 13°20′ each. The Moon passes through all 27 in about 27.3 days, roughly one per day.</p>
          <p class="fact">At sunrise the Moon is ${Math.round(d.nakshatra.progress * 100)}% of the way through ${d.nakshatra.name.en}.</p>`;
        break;
    }
    el.innerHTML = `<h3 lang="te">${h}</h3>${body}`;
  }

  // ---------- the dial ----------
  const svg = $('dial');
  const NS = 'http://www.w3.org/2000/svg';
  const R_RING = 200, R_PATH = 240, R_MASA = 148;
  const pt = (lon, r) => [r * Math.sin(lon * Math.PI / 180), -r * Math.cos(lon * Math.PI / 180)];
  function arcPath(a0, a1, r) {
    let sweep = ((a1 - a0) % 360 + 360) % 360;
    const [x0, y0] = pt(a0, r), [x1, y1] = pt(a0 + sweep, r);
    return `M ${x0} ${y0} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x1} ${y1}`;
  }
  const mk = (tag, attrs, parent = svg) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e); return e;
  };

  let dyn; // group for per-month parts
  const masaLabels = [];
  function buildDial() {
    svg.innerHTML = '';
    for (let i = 0; i < 12; i++) {
      mk('path', { d: arcPath(i * 30 + 0.4, i * 30 + 29.6, R_RING), class: 'rashi-seg' + (i % 2 ? ' alt' : '') });
      const [x, y] = pt(i * 30 + 15, R_RING);
      const t = mk('text', { x, y, class: 'rashi-label' }); t.textContent = P.RASHIS[i].en;
      // masa i sits on the line where the Sun enters rashi i
      const [mx, my] = pt(i * 30, R_MASA);
      const ml = mk('text', { x: mx, y: my, class: 'masa-label', lang: 'te' }); ml.textContent = P.MASAS[i].te;
      masaLabels.push(ml);
      const [bx0, by0] = pt(i * 30, R_RING - 24), [bx1, by1] = pt(i * 30, R_RING + 24);
      mk('line', { x1: bx0, y1: by0, x2: bx1, y2: by1, class: 'boundary' });
    }
    dyn = mk('g', {});
  }

  let anim = null;
  function drawMonth(date, animate) {
    const m = P.masaAt(date);
    const tz = state.day.place.tz;
    const a0 = P.sunSidereal(m.start), a1 = P.sunSidereal(m.end);
    masaLabels.forEach((l, i) => {
      l.classList.toggle('on', i === m.index);
      l.classList.toggle('skipped', !!(m.skipped && P.MASAS.indexOf(m.skipped) === i));
    });
    if (anim) cancelAnimationFrame(anim);
    const total = ((a1 - a0) % 360 + 360) % 360;
    const crosses = [];
    for (let k = 1; k <= 2; k++) {
      const b = (Math.floor(a0 / 30) + k) * 30;
      if (((b - a0) % 360 + 360) % 360 <= total) crosses.push(b % 360);
    }
    const t0 = performance.now(), dur = animate && !reduceMotion ? 900 : 0;
    const frame = (now) => {
      const f = dur ? Math.min(1, (now - t0) / dur) : 1;
      const e = 1 - Math.pow(1 - f, 3);
      const cur = a0 + total * e;
      dyn.innerHTML = '';
      mk('path', { d: arcPath(a0, cur + 0.01, R_PATH), class: 'path-arc' + (m.adhika ? ' adhika' : '') }, dyn);
      for (const b of crosses) {
        if (((b - a0) % 360 + 360) % 360 <= total * e) {
          const [x0, y0] = pt(b, R_PATH - 12), [x1, y1] = pt(b, R_PATH + 12);
          mk('line', { x1: x0, y1: y0, x2: x1, y2: y1, class: 'cross' }, dyn);
        }
      }
      const [sx, sy] = pt(cur, R_PATH);
      mk('circle', { cx: sx, cy: sy, r: 10, class: 'sun' }, dyn);
      const c1 = mk('text', { x: 0, y: -4, class: 'center-te', lang: 'te' }, dyn);
      c1.textContent = (m.adhika ? 'అధిక ' : '') + m.name.te;
      const c2 = mk('text', { x: 0, y: 24, class: 'center-sub' }, dyn);
      c2.textContent = `${fmtDay(m.start, tz)} – ${fmtDay(m.end, tz)} ${new Date(m.end).getUTCFullYear()}`;
      if (f < 1) anim = requestAnimationFrame(frame);
    };
    anim = requestAnimationFrame(frame);

    const startTxt = `${P.RASHIS[Math.floor(a0 / 30)].en} ${deg(a0)}`;
    const endTxt = `${P.RASHIS[Math.floor(a1 / 30)].en} ${deg(a1)}`;
    let cap;
    if (m.adhika) cap = `Between these two new moons the Sun only moves from ${startTxt} to ${endTxt}. It crosses no line, so there is no sankranti: this is Adhika ${m.name.en}, and the real (nija) ${m.name.en} follows.`;
    else if (m.kshaya) cap = `The Sun crosses two lines in one lunar month. Both names would fall on the same month, so ${m.skipped.en} is skipped (kshaya). This is very rare.`;
    else {
      const sk = P.nextSankranti(m.start);
      cap = `From new moon to new moon the Sun moves from ${startTxt} to ${endTxt}. It crosses into ${sk.rashi.en} on ${fmtDay(sk.date, tz)}, so the month takes the name on that line: ${m.name.en}.`;
    }
    $('dial-caption').textContent = cap;
    state.dialDate = new Date((m.start.getTime() + m.end.getTime()) / 2);
    return m;
  }

  function step(dir, animate = true) {
    const m = P.masaAt(state.dialDate);
    const t = dir > 0 ? new Date(m.end.getTime() + DAY) : new Date(m.start.getTime() - DAY);
    return drawMonth(t, animate);
  }

  let playing = null;
  $('play').addEventListener('click', () => {
    if (playing) { clearInterval(playing); playing = null; $('play').textContent = 'Play the year'; return; }
    $('play').textContent = 'Pause';
    let n = 0;
    playing = setInterval(() => {
      step(1);
      if (++n >= 13) { clearInterval(playing); playing = null; $('play').textContent = 'Play the year'; }
    }, reduceMotion ? 1800 : 1400);
  });
  $('prev').addEventListener('click', () => step(-1));
  $('next').addEventListener('click', () => step(1));

  // ---------- wiring ----------
  function update() {
    const c = CITIES[+citySel.value];
    const [y, mo, d] = dateIn.value.split('-').map(Number);
    state.day = P.day(y, mo, d, c);
    renderTerms(); renderExplain();
    drawMonth(state.day.sunrise || new Date(Date.UTC(y, mo - 1, d)), true);
  }
  citySel.addEventListener('change', () => { dateIn.value = todayIn(CITIES[+citySel.value].tz); update(); });
  dateIn.addEventListener('change', update);
  $('today').addEventListener('click', () => { dateIn.value = todayIn(CITIES[+citySel.value].tz); update(); });

  const params = new URLSearchParams(location.search);
  if (params.get('city')) { const i = CITIES.findIndex((c) => c.name.toLowerCase().startsWith(params.get('city').toLowerCase())); if (i >= 0) citySel.value = String(i); }
  dateIn.value = params.get('date') || todayIn(CITIES[+citySel.value].tz);
  buildDial();
  update();
})();
