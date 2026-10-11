/* planets.js — Sun-view ⇄ Earth-view morph showing why planets go vakra. */
(function () {
  'use strict';
  const PM = window.PlanetModel;
  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DAY = 86400000;
  const RASHI_TE = ['మేషం', 'వృషభం', 'మిథునం', 'కర్కాటకం', 'సింహం', 'కన్య', 'తుల', 'వృశ్చికం', 'ధనుస్సు', 'మకరం', 'కుంభం', 'మీనం'];
  const RASHI_EN = ['Mesha', 'Vrishabha', 'Mithuna', 'Karkataka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanus', 'Makara', 'Kumbha', 'Meena'];
  // How much path to show for each planet, in days: enough to see its pattern close up.
  const TRAIL = { Mercury: 365, Venus: 2922, Mars: 2340, Jupiter: 4333, Saturn: 10759 };

  function todayUTC() { const n = new Date(); return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())); }
  let model = PM.create(todayUTC());
  const B = model.BODIES;

  const css = getComputedStyle(document.documentElement);
  const C = (name) => css.getPropertyValue(name).trim();
  const COL = { bg: C('--night'), ring: C('--slate'), ring2: C('--slate-2'), text: C('--moon'), ash: C('--ash'), sun: C('--turmeric'), earth: '#7DB7EA' };

  const state = { t: 0, k: 0, kTarget: 0, playing: !reduceMotion, speed: 40, scale: 1, show: new Set(['Venus', 'Mars']) };

  // ---------- controls ----------
  const picks = $('picks');
  B.forEach((b) => {
    const id = 'pick-' + b.key;
    const lab = document.createElement('label');
    lab.className = 'pick';
    lab.innerHTML = `<input type="checkbox" id="${id}" ${state.show.has(b.key) ? 'checked' : ''}>
      <span class="swatch" style="background:${b.color}"></span><span lang="te">${b.te}</span> <span class="en">${b.en}</span>`;
    lab.querySelector('input').addEventListener('change', (e) => {
      e.target.checked ? state.show.add(b.key) : state.show.delete(b.key);
      draw(); updateTable(); updateCaption();
    });
    picks.appendChild(lab);
  });

  $('view').addEventListener('click', () => {
    state.kTarget = state.kTarget ? 0 : 1;
    $('view').setAttribute('aria-pressed', String(!!state.kTarget));
    $('view').textContent = state.kTarget ? 'Stand on the Sun' : 'Stand on the Earth';
    if (reduceMotion) state.k = state.kTarget;
    updateCaption();
    if (!state.playing) kick();
  });
  $('playpause').addEventListener('click', () => {
    state.playing = !state.playing;
    $('playpause').textContent = state.playing ? 'Pause' : 'Play';
    kick();
  });
  $('speed').addEventListener('change', (e) => { state.speed = +e.target.value; });
  $('reset').addEventListener('click', () => { model = PM.create(todayUTC()); state.t = 0; draw(); updateTable(); updateCaption(); });
  $('playpause').textContent = state.playing ? 'Pause' : 'Play';

  // ---------- canvas ----------
  const cv = $('sky'), ctx = cv.getContext('2d');
  let W = 600, H = 600, dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = cv.clientWidth; H = W;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  window.addEventListener('resize', resize);

  function targetScale() {
    let r = 1.1;
    for (const b of B) if (state.show.has(b.key)) r = Math.max(r, b.a + state.k * 1 + 0.15);
    const ringRoom = state.k > 0.01 ? 0.80 : 0.94; // leave room for the rashi ring in Earth view
    return (W / 2) * ringRoom / r;
  }

  // Point in the morphing frame: Sun view (k=0) → Earth view (k=1).
  function frame(p, e, k) { return [p[0] - k * e[0], p[1] - k * e[1]]; }
  function toScreen([x, y]) { return [W / 2 + x * state.scale, H / 2 - y * state.scale]; }

  function drawTrail(b) {
    const L = TRAIL[b.key];
    const step = Math.max(0.5, L / 1600);
    const n = Math.floor(L / step);
    const chunks = 24;
    ctx.lineWidth = 1.6; ctx.strokeStyle = b.color; ctx.lineJoin = 'round';
    for (let c = 0; c < chunks; c++) {
      ctx.globalAlpha = 0.12 + 0.75 * ((c + 1) / chunks);
      ctx.beginPath();
      const i0 = Math.floor((c * n) / chunks), i1 = Math.floor(((c + 1) * n) / chunks);
      for (let i = i0; i <= i1; i++) {
        const tt = state.t - L + i * step;
        const [x, y] = toScreen(frame(model.helio(b, tt), model.earth(tt), state.k));
        i === i0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function dot([x, y], r, color, label, ring) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    if (ring) { ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke(); }
    if (label) {
      ctx.fillStyle = COL.text; ctx.font = `14px 'Tiro Telugu', serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(label, x + r + 6, y);
    }
  }

  function drawRashiRing(alpha) {
    if (alpha <= 0.01) return;
    const R = (W / 2) * 0.9, w = Math.max(16, W * 0.045);
    const aya = PM.ayanamsha(new Date(+model.startDate + state.t * DAY));
    ctx.save(); ctx.globalAlpha = alpha;
    for (let i = 0; i < 12; i++) {
      const a0 = (30 * i + aya) * Math.PI / 180, a1 = a0 + Math.PI / 6;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, R, -a1, -a0);
      ctx.strokeStyle = i % 2 ? COL.ring : COL.ring2; ctx.lineWidth = w; ctx.stroke();
      const am = (a0 + a1) / 2;
      ctx.fillStyle = COL.ash; ctx.font = `${Math.max(10, W * 0.019)}px 'Tiro Telugu', serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(RASHI_TE[i], W / 2 + R * Math.cos(am), H / 2 - R * Math.sin(am));
    }
    // markers: where each graha sits against the rashis, seen from the Earth
    const marks = [{ lon: model.sunGeoLon(state.t), color: COL.sun }];
    for (const b of B) if (state.show.has(b.key)) marks.push({ lon: model.geoLon(b, state.t), color: b.color });
    const rahu = model.rahuLon(state.t);
    marks.push({ lon: rahu, color: COL.ash, label: 'రా' }, { lon: (rahu + 180) % 360, color: COL.ash, label: 'కే' });
    for (const m of marks) {
      const a = m.lon * Math.PI / 180, r0 = R - w / 2 - 10, r1 = R - w / 2 - 1;
      ctx.beginPath();
      ctx.moveTo(W / 2 + r0 * Math.cos(a), H / 2 - r0 * Math.sin(a));
      ctx.lineTo(W / 2 + r1 * Math.cos(a), H / 2 - r1 * Math.sin(a));
      ctx.strokeStyle = m.color; ctx.lineWidth = 3; ctx.stroke();
      if (m.label) {
        const rl = R - w / 2 - 20;
        ctx.fillStyle = COL.ash; ctx.font = `12px 'Tiro Telugu', serif`;
        ctx.fillText(m.label, W / 2 + rl * Math.cos(a), H / 2 - rl * Math.sin(a));
      }
    }
    ctx.restore();
  }

  function draw() {
    state.scale += (targetScale() - state.scale) * (reduceMotion ? 1 : 0.15);
    ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
    const k = state.k, e = model.earth(state.t);

    // orbit circles, only meaningful when standing on the Sun
    if (k < 0.99) {
      ctx.save(); ctx.globalAlpha = 0.5 * (1 - k); ctx.strokeStyle = COL.ring2; ctx.lineWidth = 1;
      for (const r of [1, ...B.filter((b) => state.show.has(b.key)).map((b) => b.a)]) {
        const [cx, cy] = toScreen(frame([0, 0], e, k));
        ctx.beginPath(); ctx.arc(cx, cy, r * state.scale, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
    drawRashiRing(Math.max(0, (k - 0.5) * 2));
    for (const b of B) if (state.show.has(b.key)) drawTrail(b);

    dot(toScreen(frame([0, 0], e, k)), 9, COL.sun, 'సూర్యుడు');
    dot(toScreen(frame(e, e, k)), 6, COL.earth, k < 0.5 ? 'భూమి' : '');
    for (const b of B) {
      if (!state.show.has(b.key)) continue;
      const v = model.vakra(b, state.t);
      dot(toScreen(frame(model.helio(b, state.t), e, k)), 5, b.color, b.te + (v && k > 0.5 ? ' (వక్ర)' : ''), v && k > 0.5);
    }
    // date
    const d = new Date(+model.startDate + state.t * DAY);
    ctx.fillStyle = COL.ash; ctx.font = `14px 'Atkinson Hyperlegible', sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }), 12, 12);
  }

  // ---------- loop ----------
  let last = null, running = false, frameCount = 0;
  function tick(now) {
    if (last == null) last = now;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (state.playing) state.t += state.speed * dt;
    if (state.k !== state.kTarget) {
      const s = dt / 1.6;
      state.k = state.kTarget > state.k ? Math.min(1, state.k + s) : Math.max(0, state.k - s);
    }
    draw();
    if (++frameCount % 15 === 0) updateTable();
    if (state.playing || state.k !== state.kTarget || Math.abs(targetScale() - state.scale) > 0.5) requestAnimationFrame(tick);
    else { running = false; last = null; updateTable(); }
  }
  function kick() { if (!running) { running = true; last = null; requestAnimationFrame(tick); } }

  // ---------- text ----------
  function rashiOf(trop, t) {
    const s = model.sidereal(trop, t);
    return `<span lang="te">${RASHI_TE[Math.floor(s / 30)]}</span> ${RASHI_EN[Math.floor(s / 30)]} ${Math.floor(s % 30)}°`;
  }
  function updateTable() {
    const t = state.t;
    const rows = [`<tr><th scope="row"><span lang="te">సూర్యుడు</span> Surya</th><td>${rashiOf(model.sunGeoLon(t), t)}</td><td>Forward</td></tr>`];
    for (const b of B) {
      const v = model.vakra(b, t);
      rows.push(`<tr${state.show.has(b.key) ? '' : ' class="dim"'}><th scope="row"><span class="swatch" style="background:${b.color}"></span><span lang="te">${b.te}</span> ${b.en}</th>
        <td>${rashiOf(model.geoLon(b, t), t)}</td><td>${v ? '<span class="pill">Vakra</span>' : 'Forward'}</td></tr>`);
    }
    const r = model.rahuLon(t);
    rows.push(`<tr><th scope="row"><span lang="te">రాహువు</span> Rahu</th><td>${rashiOf(r, t)}</td><td><span class="pill">Always backward</span></td></tr>`);
    rows.push(`<tr><th scope="row"><span lang="te">కేతువు</span> Ketu</th><td>${rashiOf((r + 180) % 360, t)}</td><td><span class="pill">Always backward</span></td></tr>`);
    $('now').innerHTML = rows.join('');
    const d = new Date(+model.startDate + t * DAY);
    $('now-title').textContent = `Where they are on ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}`;
  }
  function updateCaption() {
    const shown = B.filter((b) => state.show.has(b.key));
    const vak = shown.filter((b) => model.vakra(b, state.t)).map((b) => b.en);
    $('caption').textContent = state.kTarget
      ? `Now the Earth stays still at the centre and everything is drawn as we see it. Each loop in a path is a vakra: the planet seems to walk backward against the rashis.${vak.length ? ` Right now: ${vak.join(' and ')}.` : ''} Rahu and Ketu (రా, కే on the ring) always move backward.`
      : 'Standing on the Sun, every planet goes steadily forward on its own circle. The faded tail shows where each one has been.';
  }

  function dataTable() {
    const Y = PM.YEAR;
    $('data').innerHTML = B.map((b) => {
      const syn = 1 / Math.abs(1 / b.period - 1 / Y);
      return `<tr><th scope="row"><span class="swatch" style="background:${b.color}"></span><span lang="te">${b.te}</span> ${b.en}</th>
        <td>${b.period.toLocaleString('en-GB')} days (${(b.period / Y).toFixed(2)} years)</td>
        <td>${b.a.toFixed(2)} × Earth's</td><td>about every ${Math.round(syn)} days</td></tr>`;
    }).join('') + `<tr><th scope="row"><span lang="te">రాహువు, కేతువు</span> Rahu, Ketu</th><td>${PM.RAHU_PERIOD.toLocaleString('en-GB')} days backward (${(PM.RAHU_PERIOD / Y).toFixed(1)} years)</td><td>—</td><td>always</td></tr>`;
  }

  dataTable(); resize(); updateTable(); updateCaption();
  if (state.playing) kick();
  // Fonts load after first paint; redraw once they are ready so canvas labels use them.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
})();
