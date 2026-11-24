/* Volley vNN · Control-F · SPS 2026
   Plain JavaScript, no build step. Drawn in the Control-F design system's
   language: contours in ink, 2:1 isometry, one lime light per screen.
   Every animation pauses off-screen and respects prefers-reduced-motion. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const NS = 'http://www.w3.org/2000/svg';
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KIOSK = /[?&#]kiosk/.test(location.href);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const fmt = (v, d = 0) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const INK = '#000000', INK2 = '#484848', GLAS = '#C5EBE2';

  function svgEl(tag, attrs = {}, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  /* ------------------------------------------------------------------ booth scale
     The page is composed for a window of 1440 by 900. A booth screen (?kiosk) is larger and is read from across
     the aisle, so there the root is zoomed until that window fills the screen: 1.2 on a 1920 by 1080 screen,
     2.4 on a 4K panel. &zoom=1.5 sets the factor by hand and &zoom=1 switches it off. A zoom grows viewport
     units along with everything else, which is why the stylesheet divides by --vo-zoom where it measures the
     window. */
  let ZOOM = 1;
  function initBoothScale() {
    if (!KIOSK) return;
    const page = document.documentElement;
    page.classList.add('vo-kiosk');
    if (!window.CSS || !CSS.supports('zoom', '2')) return;
    const asked = parseFloat((/[?&#]zoom=(\d*\.?\d+)/.exec(location.href) || [])[1]);
    let checked = false, usable = true;
    const set = (z) => {
      ZOOM = z;
      page.style.zoom = z === 1 ? '' : String(z);
      page.style.setProperty('--vo-zoom', String(z));
    };
    // The sums here and in the stylesheet hold for a zoom as the standard describes it: client sizes stay in
    // the page's own pixels, client rectangles and viewport units grow. A browser that zooms another way
    // keeps the page as it is.
    const standard = () => {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;left:0;top:0;width:100px;height:100vh;visibility:hidden;pointer-events:none';
      document.body.appendChild(probe);
      const r = probe.getBoundingClientRect();
      const ok = probe.offsetWidth === 100 && Math.abs(r.width - 100 * ZOOM) < 1 && Math.abs(r.height - window.innerHeight * ZOOM) < 2;
      probe.remove();
      return ok;
    };
    const fit = () => {
      if (!usable) return;
      let z = asked > 0 ? asked : Math.min(window.innerWidth / 1440, window.innerHeight / 900);
      z = clamp(z, 1, 4);
      if (!(asked > 0) && z < 1.1) z = 1;                    // too little to be worth the fractions
      if (Math.abs(z - ZOOM) < 0.004) return;
      set(z);
      if (z !== 1 && !checked) {
        checked = true;
        if (!standard()) { usable = false; set(1); }
      }
    };
    fit();
    window.addEventListener('resize', fit);
  }

  function fitCanvas(canvas, maxDpr = 2) {
    // under the booth scale one of the page's pixels covers more of the screen's than devicePixelRatio says
    const dpr = Math.min((window.devicePixelRatio || 1) * ZOOM, ZOOM > 1 ? 3 : maxDpr);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }
  function onVisible(el, fn, margin = '120px') {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(true); return; }
    new IntersectionObserver((entries) => entries.forEach((e) => fn(e.isIntersecting)), { rootMargin: margin }).observe(el);
  }
  const rhombus = (cx, cy, a, b) => `M${cx} ${cy - b} L${cx + a} ${cy} L${cx} ${cy + b} L${cx - a} ${cy} Z`;

  /* ------------------------------------------------------------------ nav: mark the section in view */
  function initNav() {
    const links = $$('.cf-nav__link');
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        const a = map.get(e.target.id);
        if (a) a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* The links of the bar stay on this page, so its open panel has to close when one is followed. */
  function initMenu() {
    const toggle = $('.cf-nav__toggle');
    if (!toggle) return;
    $$('.cf-nav__link').forEach((a) => a.addEventListener('click', () => {
      if (toggle.getAttribute('aria-expanded') === 'true') toggle.click();
    }));
  }

  /* The design system draws an accordion's panel from .is-open; a <details> says it with [open]. */
  function initDisclosures() {
    $$('details.cf-accordion__item').forEach((item) => {
      const sync = () => item.classList.toggle('is-open', item.open);
      item.addEventListener('toggle', () => requestAnimationFrame(sync));
      sync();
    });
  }

  /* ------------------------------------------------------------------ hero
     The stack as an object in space, drawn at the size of its box so every label stays in whole pixels: eleven
     levels standing over one asset's capsule on the lattice, telemetry and language arriving on the ground, and
     one level lit at a time. Nothing here is a picture file. */
  function initHero() {
    const svg = $('#heroArt');
    if (!svg) return;
    const box = svg.parentElement, still = $('#cf-hero-still');
    const side = window.matchMedia('(min-width: 56.26rem)');   // the art stands beside the copy; below, above it
    const LEVELS = 11, T = 16, RISE = 70, GAP = 24, REACH = 150, LIFT = 12;
    const zOf = (k) => T + RISE + GAP * k;
    const DIRB = [-0.8944, 0.4472], EI = [0.8944, 0.4472];     // back along a stream, and the lattice's other axis
    const memory = Array.from({ length: 20 }, () => (Math.random() < 0.3 ? 0.12 + Math.random() * 0.25 : 0));
    let m = null, first = true, t = 0, acc = 0, running = false, last = 0;
    let lit = REDUCED ? 5 : -1, hold = REDUCED ? 0 : 1.5;

    function build() {
      const w = box.clientWidth, h = box.clientHeight;
      svg.innerHTML = '';
      m = null;
      if (w < 150 || h < 130) return;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      const beside = side.matches;
      const labels = beside && w >= 540 && h >= 430;
      const padR = labels ? 150 : 4, padL = 4, padT = labels ? 8 : 4, padB = 4;
      const GX0 = -306, GX1 = 180, GY0 = -400, GY1 = 152;        // the drawing's extent around the capsule's centre
      const s = clamp(Math.min((w - padL - padR) / (GX1 - GX0), (h - padT - padB) / (GY1 - GY0)), 0.36, 1.12);
      const X0 = beside ? w - padR - GX1 * s : (w - (GX0 + GX1) * s) / 2;
      const Y0 = beside ? h - padB - GY1 * s : (h - (GY0 + GY1) * s) / 2;
      const P = (x, y) => [X0 + x * s, Y0 + y * s];
      const c = (i, j, z = 0) => P((i - j) * 30, (i + j) * 15 - z);   // lattice cell (i, j) at height z
      const pts = (list) => list.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L');
      const poly = (list) => `M${pts(list)} Z`;
      const seg = (a, b) => `M${pts([a, b])}`;

      const defs = svgEl('defs', {}, svg);
      const fade = svgEl('radialGradient', { id: 'haFadeG' }, defs);
      [[0, 1], [0.5, 0.75], [1, 0]].forEach(([o, a]) => svgEl('stop', { offset: o, 'stop-color': '#fff', 'stop-opacity': a }, fade));
      const mask = svgEl('mask', { id: 'haFade', maskUnits: 'userSpaceOnUse', x: X0 - 400 * s, y: Y0 - 225 * s, width: 800 * s, height: 450 * s }, defs);
      svgEl('rect', { x: X0 - 400 * s, y: Y0 - 225 * s, width: 800 * s, height: 450 * s, fill: 'url(#haFadeG)' }, mask);
      const glow = svgEl('filter', { id: 'haGlow', x: '-40%', y: '-90%', width: '180%', height: '280%' }, defs);
      svgEl('feGaussianBlur', { stdDeviation: (6 + 8 * s).toFixed(1) }, glow);

      // the ground: the lattice, fading out around the base
      const ground = svgEl('g', { class: 'ha-ground', mask: 'url(#haFade)' }, svg);
      let d = '';
      for (let n = -10; n <= 10; n++) d += seg(c(n, -10), c(n, 10)) + seg(c(-10, n), c(10, n));
      svgEl('path', { d }, ground);

      // where two more assets' capsules stand: footprints on the absent rung
      const notes = [];
      if (labels) {
        [[5, 1, 'C-07', 1], [1, -5, 'S-2', -1]].forEach(([ci, cj, name, below]) => {
          svgEl('path', { class: 'ha-quiet', d: poly([c(ci - 1, cj - 1), c(ci + 1, cj - 1), c(ci + 1, cj + 1), c(ci - 1, cj + 1)]) }, svg);
          const at = c(ci + 1, cj - 1);
          notes.push(text(svg, { x: at[0] + 7, y: at[1] + (below > 0 ? 14 : -6), class: 'ha-label ha-label--muted ha-note' }, name));
        });
      }

      // telemetry and language arrive on the ground, as waves in the plane of the lattice
      const streams = [-2.1, -0.7, 0.7, 2.1].map((i, n) => ({
        end: [(i - 3) * 30, (i + 3) * 15], k: 0.085 + n * 0.018, amp: 5.5 + (n % 2) * 2, ph: n * 1.7,
        path: svgEl('path', { class: 'ha-wave' + (n === 3 ? ' ha-wave--quiet' : '') }, svg),
      }));
      streams.forEach((st) => {
        const at = P(st.end[0] + DIRB[0] * REACH, st.end[1] + DIRB[1] * REACH);
        svgEl('circle', { class: 'ha-node', cx: at[0], cy: at[1], r: 1.8 }, svg);
      });

      // the capsule: a slab with a ring of cells that the stream teaches
      svgEl('path', { class: 'ha-face ha-face--left', d: poly([c(-3, 3, T), c(3, 3, T), c(3, 3), c(-3, 3)]) }, svg);
      svgEl('path', { class: 'ha-face ha-face--right', d: poly([c(3, 3, T), c(3, -3, T), c(3, -3), c(3, 3)]) }, svg);
      svgEl('path', { class: 'ha-top', d: poly([c(-3, -3, T), c(3, -3, T), c(3, 3, T), c(-3, 3, T)]) }, svg);
      const cells = [];
      for (let a = -2.5; a <= 2.5; a++) for (let b = -2.5; b <= 2.5; b++) {
        if (Math.max(Math.abs(a), Math.abs(b)) < 2.5) continue;
        const el = svgEl('path', { class: 'ha-cell', d: poly([c(a - 0.5, b - 0.5, T), c(a + 0.5, b - 0.5, T), c(a + 0.5, b + 0.5, T), c(a - 0.5, b + 0.5, T)]) }, svg);
        el.style.fillOpacity = memory[cells.length].toFixed(2);
        cells.push(el);
      }
      let grid = '';
      for (let n = -2; n <= 2; n++) grid += seg(c(n, -3, T), c(n, 3, T)) + seg(c(-3, n, T), c(3, n, T));
      svgEl('path', { class: 'ha-lattice', d: grid }, svg);

      // the eleven levels, painted from the lowest up: in isometry higher is nearer
      const corners = [[-2, 2], [2, 2], [2, -2], [-2, -2]];        // left, front, right, back
      const top = zOf(LEVELS - 1);
      const strut = (ci, cj) => svgEl('path', { class: 'ha-strut', d: seg(c(ci, cj, T), c(ci, cj, top)) }, svg);
      strut(-2, -2);
      const levels = [];
      for (let k = 0; k < LEVELS; k++) {
        const g = svgEl('g', { class: 'ha-level', style: `--k:${k}` }, svg);
        const shape = poly(corners.map(([ci, cj]) => c(ci, cj, zOf(k))));
        svgEl('path', { class: 'ha-glow', d: shape, filter: 'url(#haGlow)' }, g);
        svgEl('path', { class: 'ha-plane', d: shape }, g);
        corners.forEach(([ci, cj]) => { const at = c(ci, cj, zOf(k)); svgEl('circle', { class: 'ha-node ha-corner', cx: at[0], cy: at[1], r: 2.2 }, g); });
        levels.push(g);
      }
      strut(-2, 2); strut(2, -2); strut(2, 2);
      const spikes = corners.map(([ci, cj]) => ({ ci, cj, el: svgEl('rect', { class: 'ha-spike', width: 4.4, height: 4.4 }, svg) }));

      // labels: a mono word with the rule that runs out of it to the thing it names
      let levelNote = null;
      if (labels) {
        const note = (x, y, lines, anchor = 'start') => lines.map((str, n) =>
          text(svg, { x, y: y + 4 + n * 14, 'text-anchor': anchor, class: 'ha-label ha-note' + (n ? ' ha-label--muted' : '') }, str));
        const rule = (dd) => svgEl('path', { class: 'ha-rule ha-note', d: dd }, svg);
        const pr = c(2, -2, top), pb = c(-2, -2, top), pc = c(3, -3, T), xr = pr[0] + 38;
        rule(`M${pr[0] + 7} ${pr[1]} H${xr - 8}`);
        note(xr, pr[1], ['11 levels', '34.8M parameters']);
        const yo = pb[1] - 24;
        rule(`M${pb[0]} ${pb[1] - 7} V${yo} H${xr - 8}`);
        note(xr, yo, ['Prediction', 'Surprise · answer']);
        rule(`M${pc[0] + 7} ${pc[1]} H${pc[0] + 26}`);
        note(pc[0] + 34, pc[1], ['Memory capsule', 'Asset P-104']);
        const ps = P(-304, 126);
        note(ps[0], ps[1], ['Telemetry', '+ language']);
        levelNote = { rule: rule(''), text: text(svg, { 'text-anchor': 'end', class: 'ha-label ha-note' }, '') };
      }

      m = { c, P, levels, spikes, streams, cells, levelNote, top, s };
      if (first && !REDUCED) {
        first = false;
        svg.classList.add('is-building');
        setTimeout(() => svg.classList.remove('is-building'), 2200);
      }
      setLit(lit);
      drawWaves();
      drawSpikes();
    }

    function setLit(i) {
      if (!m) return;
      m.levels.forEach((g, k) => g.classList.toggle('is-lit', k === i));
      if (!m.levelNote) return;
      if (i < 0) { m.levelNote.rule.setAttribute('d', ''); m.levelNote.text.textContent = ''; return; }
      const at = m.c(-2, 2, zOf(i));
      const y = at[1] - (REDUCED ? 0 : LIFT);
      m.levelNote.rule.setAttribute('d', `M${at[0] - 7} ${y} H${at[0] - 30}`);
      m.levelNote.text.setAttribute('x', at[0] - 38);
      m.levelNote.text.setAttribute('y', y + 4);
      m.levelNote.text.textContent = `Level ${String(i + 1).padStart(2, '0')} fires`;
    }
    function drawWaves() {
      if (!m) return;
      m.streams.forEach((st) => {
        let d = '';
        for (let u = 0; u <= REACH; u += 3) {
          const env = Math.min(1, u / 28) * Math.min(1, (REACH - u) / 36);
          const off = Math.sin(u * st.k + t * 3 + st.ph) * st.amp * env;
          const at = m.P(st.end[0] + DIRB[0] * u + EI[0] * off, st.end[1] + DIRB[1] * u + EI[1] * off);
          d += `${u ? 'L' : 'M'}${at[0].toFixed(1)} ${at[1].toFixed(1)}`;
        }
        st.path.setAttribute('d', d);
      });
    }
    function drawSpikes() {
      if (!m) return;
      // four spikes, one up each corner, a quarter of a turn apart: a volley
      m.spikes.forEach((sp, n) => {
        const p = (t * 0.42 + n / 4) % 1;
        const at = m.c(sp.ci, sp.cj, T + p * (m.top - T));
        sp.el.setAttribute('x', (at[0] - 2.2).toFixed(1));
        sp.el.setAttribute('y', (at[1] - 2.2).toFixed(1));
        sp.el.setAttribute('opacity', (lit < 0 ? 0 : 1 - p * 0.55).toFixed(2));
      });
    }
    function learn() {
      // what the volley taught: one cell of the ring takes charge, the others let a little go
      for (let n = 0; n < memory.length; n++) memory[n] *= 0.9;
      const n = Math.floor(Math.random() * memory.length);
      memory[n] = Math.min(0.85, memory[n] + 0.4);
      if (m) m.cells.forEach((el, k) => { el.style.fillOpacity = memory[k].toFixed(2); });
    }
    function frame(ts) {
      if (!running) return;
      const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
      last = ts;
      if (m && !still.checked) {
        t += dt;
        drawWaves();
        drawSpikes();
        if (hold > 0) hold -= dt;
        else if ((acc += dt) > 0.22) {
          acc = 0;
          lit = (lit + 1) % LEVELS;
          setLit(lit);
          if (lit === LEVELS - 1) { hold = 1.1; learn(); }
        }
      }
      requestAnimationFrame(frame);
    }

    build();
    if ('ResizeObserver' in window) new ResizeObserver(build).observe(box);
    else window.addEventListener('resize', build);
    if (REDUCED) return;
    onVisible(box, (vis) => {
      if (vis && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
      else if (!vis) running = false;
    }, '0px');
  }

  /* ------------------------------------------------------------------ the volley principle
     Four neurons, each firing on every fourth peak, and the row where their spikes stand together. Drawn at the
     size of its box; a mark runs along the signal and each peak's spikes answer as it passes. */
  function initVolley() {
    const box = $('#volleyFig');
    if (!box) return;
    let m = null, t = 0, running = false, last = 0;
    chartFrame(box, (svg, w) => {
      const wide = w >= 620;
      const x0 = wide ? 104 : 30, x1 = w - 1;
      const n = clamp(Math.round((x1 - x0) / 150), 4, 8);
      const period = (x1 - x0) / n;
      const yb = 34, A = 24, r0 = 94, rh = 24, ysum = r0 + 4 * rh + 12;
      const wave = (x) => yb + A * Math.cos((2 * Math.PI * (x - x0)) / period);
      let d = '';
      for (let x = x0; x <= x1; x += 2) d += `${x === x0 ? 'M' : 'L'}${x.toFixed(1)} ${wave(x).toFixed(1)}`;
      const peaks = [];
      for (let k = 0; k < n; k++) {
        const x = x0 + (k + 0.5) * period, row = k % 4, y = r0 + row * rh;
        svgEl('line', { class: 'vv-strut', x1: x, x2: x, y1: yb - A + 5, y2: ysum - 12 }, svg);
        peaks.push({ x, own: svgEl('line', { class: 'vv-spike', x1: x, x2: x, y1: y - 8, y2: y + 8 }, svg) });
      }
      for (let row = 0; row < 4; row++) {
        const y = r0 + row * rh;
        svgEl('line', { class: 'vv-base', x1: x0, x2: x1, y1: y, y2: y }, svg);
        text(svg, { x: 0, y: y + 4, class: 'ch-key' }, wide ? `Neuron 0${row + 1}` : `0${row + 1}`);
      }
      svgEl('line', { class: 'vv-sum', x1: x0, x2: x1, y1: ysum, y2: ysum }, svg);
      peaks.forEach((pk) => { pk.sum = svgEl('line', { class: 'vv-spike vv-spike--sum', x1: pk.x, x2: pk.x, y1: ysum - 10, y2: ysum + 10 }, svg); });
      text(svg, { x: 0, y: ysum + 4, class: 'ch-val' }, wide ? 'TOGETHER' : 'ALL');
      if (wide) text(svg, { x: 0, y: yb + 4, class: 'ch-key' }, 'Signal');
      svgEl('path', { class: 'vv-wave', d }, svg);
      const bloom = svgEl('circle', { class: 'ch-bloom', r: 15, opacity: 0 }, svg);
      const mark = svgEl('circle', { class: 'ch-node', r: 3.5, opacity: 0 }, svg);
      m = { x0, x1, period, wave, peaks, bloom, mark };
      place();
    });
    function place() {
      if (!m) return;
      const span = m.x1 - m.x0;
      const x = m.x0 + ((t * 95) % (span + m.period)) - m.period * 0.25;
      const on = !REDUCED && x >= m.x0 && x <= m.x1;
      [m.mark, m.bloom].forEach((el) => { el.setAttribute('cx', x.toFixed(1)); el.setAttribute('cy', m.wave(x).toFixed(1)); el.setAttribute('opacity', on ? 1 : 0); });
      m.peaks.forEach((pk) => {
        const hot = !REDUCED && x >= pk.x && x - pk.x < m.period * 0.8;
        pk.own.classList.toggle('is-hot', hot);
        pk.sum.classList.toggle('is-hot', hot);
      });
    }
    function frame(ts) {
      if (!running) return;
      t += Math.min(0.05, (ts - last) / 1000 || 0.016);
      last = ts;
      place();
      requestAnimationFrame(frame);
    }
    if (REDUCED) return;
    onVisible(box, (vis) => {
      if (vis && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
      else if (!vis) running = false;
    }, '0px');
  }

  /* ------------------------------------------------------------------ architecture */
  const PARTS = {
    telemetry: { tag: 'new', title: 'Telemetry streams',
      body: 'Vibration, temperature, current, pressure, flow, PLC tags: any sampled signal from an asset. Each stream keeps its own identity and its own clock, so Volley learns per asset and per stream.',
      facts: [['Sources', 'OPC UA, MQTT and historians (planned vNN connectors)'], ['Rate', 'Each stream at its own rate'], ['Identity', 'Asset · stream · unit']] },
    delta: { tag: 'new', title: 'Delta spike encoder',
      body: 'Each sample becomes events: a spike fires only when the signal has moved by more than a learned step, up or down, the way event cameras and neuromorphic sensors work. A steady machine is nearly silent, and only change costs spikes.',
      facts: [['Output', 'Signed spike events per stream'], ['Quiet signal', 'Few or no spikes'], ['Joins', 'The same spike stream as language']] },
    language: { tag: 'measured', title: 'Language',
      body: "Manuals, work orders, shift notes and the operator's question arrive as raw bytes. The stack has been trained and benchmarked on bytes since v11. With no tokenizer, part numbers, error codes and units are read exactly as written.",
      facts: [['Benchmarks', 'enwik8 and PG-19, held-out text'], ['Unit', 'One byte, one step'], ['vNN', "Questions interleave with the asset's stream"]] },
    bytes: { tag: 'measured', title: 'Byte encoder',
      body: "256 input neurons, one per byte value, write their spikes into the stream. In vNN telemetry events and text bytes share that stream, so a question is read in the context of the asset's live history.",
      facts: [['Input synapses', '131,072'], ['Neurons', '256, one per byte value']] },
    stream: { tag: 'measured', title: 'Spike stream · 512 channels',
      body: "The backbone of the stack, laid out like a Transformer's residual stream but carrying whole spikes. Every state read and every layer of cells writes its spikes back into it.",
      facts: [['Width', '512 channels'], ['Synapses', 'On an 8-bit grid'], ['Cost of whole spikes + 8-bit synapses', '0.0008 bits per byte']] },
    levels: { tag: 'measured', title: 'Eleven levels',
      body: 'The stack repeats one level eleven times: a state read of eight heads, then a layer of threshold cells with a pool cell. It is the layout of a Transformer built from spike parts.',
      facts: [['Parameters', '34,810,900'], ['Threshold cells', '20.1M parameters'], ['State reads', '14.5M parameters, 88 heads'], ['Training', '368.64M bytes from random weights']] },
    read: { tag: 'measured', title: 'State read · 8 heads per level',
      body: 'Each head addresses earlier moments by how well their tags match its probe, plus an offset for their age. The cells within reach race for a budget of 256 spikes, a softmax made of whole spikes. Beyond the training window each head forgets by a learned power of age.',
      facts: [['Heads', '8 per level, 88 in total'], ['Budget', '256 spikes per read'], ['Reach', '8,192 cells (trained on 2,048)'], ['Learned slopes', 'median −1.32 per doubling of age']] },
    cells: { tag: 'measured', title: 'Threshold cells · 1,188 per level',
      body: "Integrate-and-fire cells take the place of the Transformer's MLP. A pool cell divides what each neuron hears by how loud the stream is, counted in spikes. That is divisive (shunting) inhibition, standing in for a normalisation layer.",
      facts: [['Cells', '1,188 per level'], ['Normalisation', 'Pool cell, divisive inhibition'], ['Delayed fibres', 'Hear the stream again after 1–3 steps']] },
    output: { tag: 'measured', title: 'Output neurons · 256 + pool',
      body: 'The output neurons race for the next symbol. Every prediction is made before the sample arrives, so every arrival comes with a measured surprise: the bits it cost.',
      facts: [['Output synapses', '131,072'], ['Score', 'Bits per byte (enwik8 test 1.120)']] },
    predict: { tag: 'new', title: 'Prediction · surprise · answer',
      body: "The surprise of each sample, stream by stream, is the anomaly signal. It is high when the asset does something its own history did not predict. The same output writes language when an operator asks a question.",
      facts: [['Anomaly score', "Surprise against this asset's normal"], ['Answers', 'Plain language, from the live state']] },
    tape: { tag: 'measured', title: 'Read tape · tags & payloads',
      body: 'What the reads look back on: the tags and payloads of earlier moments, carried from sample to sample. Trained on windows of 2,048, the stack reads 8,192 cells back with no new synapses, and each head forgets by a power of age.',
      facts: [['Reach gain', '0.013 bits per byte'], ['Forgetting', '79 of 88 heads learned bounded slopes'], ['Cut anywhere', 'Identical spikes after a resume']] },
    fast: { tag: 'measured', title: 'Fast synapses',
      body: 'Synapses into the output neurons that start at zero in every stream. Each arriving byte teaches them after it has been predicted, by a local rule in whole numbers, with no gradient and no retraining. On books their gain grows as the square root of the text read.',
      facts: [['Gain on books', '0.004 → 0.028 bits per byte over 256 KB'], ['Rule', 'Local, error-driven, whole numbers'], ['vNN', 'One set per asset and stream']] },
    capsule: { tag: 'new', title: 'Per-asset memory capsule',
      body: 'Read tape, charge and fast synapses together are the state of one stream. Volley keeps one capsule per asset and stream. A capsule can be paused, saved, moved to another machine and resumed: a stream cut anywhere fires exactly the spikes of one pass over the whole of it.',
      facts: [['Holds', 'What is true of this asset'], ['Lifecycle', 'Pause · checkpoint · resume · move'], ['Grows', 'No: bounded by the reach and the synapses']] },
    slow: { tag: 'measured', title: 'Shared slow weights',
      body: '34.8M parameters trained offline by gradient descent, on language in v16 and on language and telemetry in vNN. They hold what is true of every machine, and the capsules hold what is true of one.',
      facts: [['Trained', 'Offline, by gradient descent'], ['Shared by', 'Every asset and stream'], ['Changed at inference', 'Never']] },
  };
  const TAGS = { measured: ['vo-tag--measured', 'Measured · v16'], new: ['vo-tag--new', 'New in vNN'], design: ['vo-tag--design', 'Design target'] };
  const TOUR = ['telemetry', 'delta', 'language', 'bytes', 'stream', 'levels', 'read', 'cells', 'output', 'predict', 'tape', 'fast', 'capsule', 'slow'];
  const SHORT = { telemetry: 'Telemetry', delta: 'Delta encoder', language: 'Language', bytes: 'Byte encoder', stream: 'Spike stream',
    levels: 'Eleven levels', read: 'State read', cells: 'Threshold cells', output: 'Output neurons', predict: 'Prediction',
    tape: 'Read tape', fast: 'Fast synapses', capsule: 'Memory capsule', slow: 'Slow weights' };

  function initArch() {
    const svg = $('#archSvg');
    if (!svg) return;
    const cells = [], heads = $$('.heads circle', svg), bars = [], tapeRects = [], syns = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 15; c++) cells.push(svgEl('circle', { cx: 433 + c * 10.4, cy: 276 + r * 13, r: 3 }, $('#cellGrid')));
    for (let i = 0; i < 16; i++) bars.push(svgEl('rect', { x: 672 + i * 8.4, y: 240, width: 5, height: 20 }, $('#outBars')));
    const NT = 18;
    for (let i = 0; i < NT; i++) tapeRects.push(svgEl('rect', { x: 372 + i * 12, y: 458, width: 8, height: 30 }, $('#tapeCells')));
    for (let r = 0; r < 3; r++) for (let c = 0; c < 12; c++) syns.push(svgEl('rect', { x: 642 + c * 13.2, y: 460 + r * 13, width: 9, height: 9, opacity: 0.1 }, $('#synGrid')));
    for (let r = 0; r < 6; r++) for (let c = 0; c < 22; c++) svgEl('circle', { cx: 40 + c * 11.6, cy: 482 + r * 12.5, r: 1.6, opacity: (0.15 + Math.random() * 0.55).toFixed(2) }, $('#slowGrid'));
    const synW = syns.map(() => Math.random() * 0.2);

    const panel = $('#archPanel'), pTag = $('#panelTag'), pContent = $('#panelContent');
    const parts = $$('.part', svg), scroller = svg.parentElement;
    // every part by name, in the order a spike meets them
    const listed = TOUR.map((key, n) => {
      const li = document.createElement('li'), btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vo-part';
      btn.innerHTML = `<span class="vo-part__n">${String(n + 1).padStart(2, '0')}</span><span class="vo-part__name">${SHORT[key]}</span>`;
      btn.addEventListener('click', () => { stopTour(); select(key, true); });
      li.appendChild(btn);
      $('#panelParts').appendChild(li);
      return { key, btn };
    });
    // on a narrow screen the drawing scrolls sideways: its edges fade where more of it waits, and a chosen part is brought to the middle
    function edges() {
      const more = [];
      if (scroller.scrollLeft > 4) more.push('start');
      if (scroller.scrollLeft < scroller.scrollWidth - scroller.clientWidth - 4) more.push('end');
      scroller.dataset.more = more.join(' ');
    }
    scroller.addEventListener('scroll', edges, { passive: true });
    window.addEventListener('resize', edges);
    function reveal(part) {
      if (scroller.scrollWidth <= scroller.clientWidth + 4) return;
      const box = part.getBBox(), scale = svg.clientWidth / svg.viewBox.baseVal.width;
      scroller.scrollTo({ left: (box.x + box.width / 2) * scale - scroller.clientWidth / 2, behavior: REDUCED ? 'auto' : 'smooth' });
    }
    function select(key, show) {
      const d = PARTS[key];
      if (!d) return;
      parts.forEach((p) => { const on = p.dataset.part === key; p.classList.toggle('is-active', on); p.setAttribute('aria-pressed', String(on)); if (on && show) reveal(p); });
      listed.forEach((item) => item.btn.setAttribute('aria-pressed', String(item.key === key)));
      const [cls, label] = TAGS[d.tag];
      pTag.className = 'vo-tag ' + cls;
      pTag.textContent = label;
      fill(pContent, d);
      panel.classList.remove('is-swapping'); void panel.offsetWidth; panel.classList.add('is-swapping');
    }
    function fill(box, d) {
      box.querySelector('.vo-panel__title').textContent = d.title;
      box.querySelector('.vo-panel__body').textContent = d.body;
      const facts = box.querySelector('.vo-facts');
      facts.innerHTML = '';
      d.facts.forEach(([k, v]) => {
        const dt = document.createElement('dt'); dt.textContent = k;
        const dd = document.createElement('dd'); dd.textContent = v;
        facts.append(dt, dd);
      });
    }
    // The longest part sets the panel's height, so neither the panel nor the page below it moves as parts change.
    let reservedAt = 0;
    function reserve(force) {
      const width = pContent.clientWidth;
      if (!width || (width === reservedAt && !force)) return;
      reservedAt = width;
      const probe = pContent.cloneNode(true);
      [probe, ...probe.querySelectorAll('[id]')].forEach((el) => el.removeAttribute('id'));
      probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText = `position:absolute;left:0;top:0;width:${width}px;min-height:0;visibility:hidden;pointer-events:none`;
      panel.appendChild(probe);
      let tallest = 0;
      Object.values(PARTS).forEach((d) => { fill(probe, d); tallest = Math.max(tallest, probe.offsetHeight); });
      probe.remove();
      pContent.style.minHeight = Math.ceil(tallest) + 'px';
    }
    let tourTimer = null, tourIdx = 0;
    const tourBtn = $('#archTour');
    const tourLabel = tourBtn.firstChild;
    function stopTour() { clearInterval(tourTimer); tourTimer = null; tourBtn.setAttribute('aria-pressed', 'false'); tourLabel.textContent = 'Auto-tour '; }
    function startTour() {
      tourBtn.setAttribute('aria-pressed', 'true'); tourLabel.textContent = 'Pause tour ';
      tourIdx = Math.max(0, TOUR.indexOf($('.part.is-active', svg)?.dataset.part));
      tourTimer = setInterval(() => { tourIdx = (tourIdx + 1) % TOUR.length; select(TOUR[tourIdx], true); }, 4200);
    }
    tourBtn.addEventListener('click', () => (tourTimer ? stopTour() : startTour()));
    parts.forEach((p) => {
      p.addEventListener('click', (e) => { e.stopPropagation(); stopTour(); select(p.dataset.part); });
      p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stopTour(); select(p.dataset.part); } });
    });
    select('read');
    reserve();
    if ('ResizeObserver' in window) new ResizeObserver(() => reserve()).observe(pContent);
    else window.addEventListener('resize', () => reserve());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => reserve(true));
    edges();
    if (KIOSK) startTour();

    const meter = $('#archMeter');
    let tick = 0, timer = null;
    const slope = -1.32 / Math.LN2;
    function animate() {
      tick++;
      heads.forEach((hd) => hd.classList.toggle('on', Math.random() < 0.3));
      cells.forEach((c) => c.classList.toggle('on', Math.random() < 0.12));
      const win = Math.floor(Math.random() * bars.length);
      bars.forEach((b, i) => {
        const hgt = i === win ? 26 : 4 + Math.random() * 14;
        b.setAttribute('height', hgt.toFixed(1)); b.setAttribute('y', (262 - hgt).toFixed(1));
        b.classList.toggle('win', i === win);
      });
      tapeRects.forEach((r, i) => r.setAttribute('opacity', (0.1 + 0.9 * Math.pow(NT - i, slope * 0.45)).toFixed(3)));
      const k = Math.floor(Math.random() * syns.length);
      synW[k] = clamp(synW[k] + 0.2, 0, 0.9);
      syns.forEach((s, i) => { synW[i] *= 0.995; s.setAttribute('opacity', (0.06 + synW[i]).toFixed(3)); });
      meter.setAttribute('width', (16 + Math.abs(Math.sin(tick * 0.21)) * 30 + Math.random() * 12).toFixed(1));
    }
    animate();
    if (REDUCED) return;
    onVisible(svg, (vis) => {
      if (vis && !timer) timer = setInterval(animate, 160);
      else if (!vis) { clearInterval(timer); timer = null; }
    });
  }

  /* ------------------------------------------------------------------ chart frame (drawn in the line component's manner) */
  function chartFrame(container, build) {
    if (!container) return null;
    const tip = document.createElement('div');
    tip.className = 'vo-tip';
    container.appendChild(tip);
    let svg = null;
    function render() {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      if (svg) svg.remove();
      svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h });
      container.insertBefore(svg, tip);
      build(svg, w, h, tip);
    }
    render();
    if ('ResizeObserver' in window) new ResizeObserver(render).observe(container);
    else window.addEventListener('resize', render);
    return { render };
  }
  function showTip(tip, container, html, x, y) {
    tip.innerHTML = html;
    tip.classList.add('is-on');
    const cw = container.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
    let left = x + 14, top = y - th - 10;
    if (left + tw > cw) left = x - tw - 14;
    if (top < 0) top = y + 14;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  const hideTip = (tip) => tip.classList.remove('is-on');
  /* Where the pointer is, in the drawing's own units. They are the page's pixels, which a zoom makes larger
     than the screen's. */
  const pointerIn = (svg, e) => {
    const r = svg.getBoundingClientRect();
    const k = r.width ? svg.viewBox.baseVal.width / r.width : 1;
    return [(e.clientX - r.left) * k, (e.clientY - r.top) * k];
  };
  const text = (parent, attrs, str) => { const t = svgEl('text', attrs, parent); t.textContent = str; return t; };

  /* ------------------------------------------------------------------ forgetting chart */
  function initForget() {
    const container = $('#forgetChart'), input = $('#slope'), out = $('#slopeOut'), note = $('#slopeNote');
    if (!container) return;
    let s = parseFloat(input.value);
    const W = 2048, REACHED = 8192, A0 = 128, A1 = 65536, YMIN = 1e-3, YMAX = 1.6;
    const share = (age) => (age <= W ? 1 : Math.pow(age / W, s / Math.LN2));
    const chart = chartFrame(container, (svg, w, h, tip) => {
      const m = { l: 44, r: 12, t: 26, b: 30 };
      const pw = w - m.l - m.r, ph = h - m.t - m.b, floor = m.t + ph;
      const x = (a) => m.l + ((Math.log2(a) - Math.log2(A0)) / (Math.log2(A1) - Math.log2(A0))) * pw;
      const y = (v) => m.t + (1 - (Math.log10(v) - Math.log10(YMIN)) / (Math.log10(YMAX) - Math.log10(YMIN))) * ph;
      // the frame, its subdivisions and the two things named above its ceiling
      svgEl('rect', { x: x(A0), y: m.t, width: x(W) - x(A0), height: ph, class: 'ch-band' }, svg);
      [0.1, 0.01].forEach((v) => svgEl('line', { x1: m.l, x2: w - m.r, y1: y(v), y2: y(v), class: 'ch-step' }, svg));
      svgEl('line', { x1: m.l, x2: w - m.r, y1: m.t, y2: m.t, class: 'ch-frame' }, svg);
      svgEl('line', { x1: m.l, x2: w - m.r, y1: floor, y2: floor, class: 'ch-frame' }, svg);
      svgEl('line', { x1: x(REACHED), x2: x(REACHED), y1: m.t, y2: floor, class: 'ch-strut' }, svg);
      text(svg, { x: (x(A0) + x(W)) / 2, y: m.t - 8, 'text-anchor': 'middle', class: 'ch-key' }, 'Training window');
      text(svg, { x: x(REACHED), y: m.t - 8, 'text-anchor': 'middle', class: 'ch-key' }, pw < 380 ? 'v16 reach' : 'v16 reads to here');
      [[1, '1'], [0.1, '0.1'], [0.01, '0.01'], [0.001, '0.001']].forEach(([v, l]) => text(svg, { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'ch-num' }, l));
      [[128, '128'], [512, '512'], [2048, '2,048'], [8192, '8,192'], [32768, '32,768']].forEach(([a, l]) => {
        if (pw < 380 && (a === 512 || a === 32768)) return;
        text(svg, { x: x(a), y: h - 8, 'text-anchor': 'middle', class: 'ch-num' }, l);
      });
      // the Transformer: full weight inside its window, none beyond it
      svgEl('path', { d: `M${x(A0)} ${y(1)} H${x(W)} V${floor} H${x(A1)}`, class: 'ch-trace ch-trace--near' }, svg);
      text(svg, { x: x(W) + 8, y: floor - 8, class: 'ch-key' }, x(A1) - x(W) < 250 ? 'Transformer: 0' : 'Transformer · nothing beyond its window');
      // Volley: a power of the age
      let d = `M${x(A0)} ${y(1)} H${x(W)}`;
      for (let a = W; a <= A1; a *= 1.04) {
        const v = share(a);
        if (v < YMIN) { d += ` L${x(a).toFixed(1)} ${floor}`; break; }
        d += ` L${x(a).toFixed(1)} ${y(v).toFixed(1)}`;
      }
      svgEl('path', { d, class: 'ch-trace' }, svg);
      const reached = share(REACHED);
      if (reached >= YMIN) {
        svgEl('circle', { cx: x(REACHED), cy: y(reached), r: 3.5, class: 'ch-node' }, svg);
        text(svg, { x: x(REACHED) + 9, y: y(reached) - 7, class: 'ch-val' }, reached.toPrecision(2));
      }
      // the trace's own name stands above and to the right of it, where a falling line leaves room
      let named = 22000;
      while (named > W * 1.3 && share(named) < 0.004) named /= 1.1;
      text(svg, { x: Math.min(x(named) + 9, w - m.r - 44), y: Math.max(y(share(named)) - 9, m.t + 14), class: 'ch-val' }, 'VOLLEY');
      const cross = svgEl('line', { y1: m.t, y2: floor, class: 'ch-cross', opacity: 0 }, svg);
      const hit = svgEl('rect', { x: m.l, y: m.t, width: pw, height: ph, class: 'ch-hit' }, svg);
      hit.addEventListener('pointermove', (e) => {
        const [mx, my] = pointerIn(svg, e);
        const px = clamp(mx, m.l, m.l + pw);
        const age = Math.pow(2, Math.log2(A0) + ((px - m.l) / pw) * (Math.log2(A1) - Math.log2(A0)));
        cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('opacity', 1);
        const v = share(age);
        showTip(tip, container, `<b>${fmt(Math.round(age))} steps ago</b><div class="tt-row"><span><i></i>Volley</span><span>${v >= 0.0001 ? v.toPrecision(2) : '<0.0001'}</span></div><div class="tt-row"><span><i class="dash"></i>Transformer</span><span>${age <= W ? '1' : '0'}</span></div>`, px, my);
      });
      hit.addEventListener('pointerleave', () => { hideTip(tip); cross.setAttribute('opacity', 0); });
    });
    input.addEventListener('input', () => {
      s = parseFloat(input.value);
      out.textContent = s.toFixed(2).replace('-', '−');
      const bounded = s < -Math.LN2;
      note.classList.toggle('is-warn', !bounded);
      note.textContent = bounded
        ? 'Below −0.69 the far past takes a bounded share of a read at any reach. The median learned slope is −1.32.'
        : 'Above −0.69 the far past takes a growing share the further a read reaches. 79 of 88 heads learned to stay below it.';
      chart.render();
    });
  }

  /* ------------------------------------------------------------------ reading curve (measured, PG-19): objects standing in space */
  const READING = [
    { bin: '0–8', gain: 0.004151, median: 0.003387 },
    { bin: '8–16', gain: 0.005435, median: 0.004144 },
    { bin: '16–32', gain: 0.009602, median: 0.007362 },
    { bin: '32–64', gain: 0.013656, median: 0.010879 },
    { bin: '64–128', gain: 0.018498, median: 0.015560 },
    { bin: '128–256', gain: 0.027792, median: 0.019428 },
  ];
  function initReading() {
    const container = $('#readingChart');
    chartFrame(container, (svg, w, h, tip) => {
      const n = READING.length, band = (w - 16) / n;
      const tight = band < 76;                                  // no room for a unit under every column: it moves to one line under all
      const m = { l: 8, r: 8, t: 30, b: tight ? 48 : 34 };
      const a = Math.min(34, band * 0.36), b = a / 2;
      const floor = h - m.b - b, ph = floor - m.t - b - 6;
      const YMAX = 0.03;
      svgEl('line', { x1: m.l, x2: w - m.r, y1: floor + b, y2: floor + b, class: 'ch-frame' }, svg);
      const mids = [4, 11.3, 22.6, 45.3, 90.5, 181], p = 0.52;
      const c = READING.reduce((acc, r, i) => acc + r.gain * Math.pow(mids[i], p), 0) / mids.reduce((acc, mm) => acc + Math.pow(mm, 2 * p), 0);
      let law = '';
      READING.forEach((r, i) => {
        const cx = m.l + band * i + band / 2;
        const hh = Math.max(2, (r.gain / YMAX) * ph);
        const ty = floor - hh;
        const col = svgEl('g', { class: 'iso-col' }, svg);
        svgEl('path', { class: 'iso-left', d: `M${cx - a} ${ty} L${cx} ${ty + b} L${cx} ${floor + b} L${cx - a} ${floor} Z` }, col);
        svgEl('path', { class: 'iso-right', d: `M${cx + a} ${ty} L${cx} ${ty + b} L${cx} ${floor + b} L${cx + a} ${floor} Z` }, col);
        svgEl('path', { class: 'iso-top' + (i === n - 1 ? ' is-lit' : ''), d: rhombus(cx, ty, a, b) }, col);
        text(svg, { x: cx, y: ty - b - 8, 'text-anchor': 'middle', class: 'ch-val' }, r.gain.toFixed(3));
        text(svg, { x: cx, y: floor + b + 18, 'text-anchor': 'middle', class: 'ch-num' }, tight ? r.bin : `${r.bin} KB`);
        law += `${i ? 'L' : 'M'}${cx.toFixed(1)} ${(floor - ((c * Math.pow(mids[i], p)) / YMAX) * ph).toFixed(1)} `;
        const hit = svgEl('rect', { x: m.l + band * i, y: 0, width: band, height: h, class: 'ch-hit' }, svg);
        hit.addEventListener('pointermove', (e) => {
          col.classList.add('is-hot');
          const [mx, my] = pointerIn(svg, e);
          showTip(tip, container, `<b>after ${r.bin} KB of a book</b><div class="tt-row"><span>gain</span><span>${r.gain.toFixed(4)} bits/byte</span></div><div class="tt-row"><span>median</span><span>${r.median.toFixed(4)}</span></div>`, mx, my);
        });
        hit.addEventListener('pointerleave', () => { col.classList.remove('is-hot'); hideTip(tip); });
      });
      // the fitted law, through the middle of every column's top
      svgEl('path', { d: law, class: 'ch-trace ch-trace--faint', 'pointer-events': 'none' }, svg);
      text(svg, { x: m.l, y: 14, class: 'ch-key' }, tight ? 'Gain ∝ (text read)^0.52' : 'Gain ∝ (text read)^0.52 · bits per byte');
      if (tight) text(svg, { x: w / 2, y: h - 6, 'text-anchor': 'middle', class: 'ch-key' }, 'KB of the book already read');
    });
  }

  /* ------------------------------------------------------------------ release chart (measured, enwik8 test) */
  const RELEASES = [
    { v: 'v11', snn: 1.645, tf: 1.704, adds: 'Fast synapses written by error spikes (25.8M parameters)' },
    { v: 'v12', snn: 1.414, tf: 1.182, adds: 'Read heads on a tape of the stream' },
    { v: 'v13', snn: 1.262, tf: 1.182, adds: 'State reads and race cells' },
    { v: 'v14', snn: 1.244, tf: 1.182, adds: 'Read clocks and the address rate' },
    { v: 'v15', snn: 1.141, tf: 1.144, adds: 'A stack that reads a stream' },
    { v: 'v16', snn: 1.120, tf: 1.107, adds: 'Long streams, power-law forgetting' },
  ];
  function initReleases() {
    const container = $('#releaseChart');
    chartFrame(container, (svg, w, h, tip) => {
      const narrow = w < 520;
      // the first and the last value of each trace are printed beside it, so both ends keep room inside the frame
      const m = { l: 40, r: 8, t: 18, b: 30 }, inL = narrow ? 14 : 52, inR = narrow ? 14 : 136;
      const fw = w - m.l - m.r, ph = h - m.t - m.b, Y0 = 1.0, Y1 = 1.8, last = RELEASES.length - 1;
      const x = (i) => m.l + inL + (i / last) * (fw - inL - inR);
      const y = (v) => m.t + (1 - (v - Y0) / (Y1 - Y0)) * ph;
      [1.2, 1.4, 1.6].forEach((v) => svgEl('line', { x1: m.l, x2: m.l + fw, y1: y(v), y2: y(v), class: 'ch-step' }, svg));
      svgEl('line', { x1: m.l, x2: m.l + fw, y1: m.t, y2: m.t, class: 'ch-frame' }, svg);
      svgEl('line', { x1: m.l, x2: m.l + fw, y1: m.t + ph, y2: m.t + ph, class: 'ch-frame' }, svg);
      [1.0, 1.2, 1.4, 1.6, 1.8].forEach((v) => text(svg, { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'ch-num' }, v.toFixed(1)));
      RELEASES.forEach((r, i) => text(svg, { x: x(i), y: h - 8, 'text-anchor': 'middle', class: 'ch-num' }, r.v));
      const path = (key) => RELEASES.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(r[key]).toFixed(1)}`).join(' ');
      svgEl('path', { d: path('tf'), class: 'ch-trace ch-trace--near' }, svg);
      svgEl('path', { d: path('snn'), class: 'ch-trace' }, svg);
      svgEl('circle', { cx: x(last), cy: y(RELEASES[last].snn), r: 16, class: 'ch-bloom' }, svg);
      RELEASES.forEach((r, i) => {
        svgEl('circle', { cx: x(i), cy: y(r.tf), r: 3.5, class: 'ch-node--hollow' }, svg);
        svgEl('circle', { cx: x(i), cy: y(r.snn), r: 3.5, class: 'ch-node' }, svg);
      });
      if (!narrow) {
        const a = RELEASES[0], z = RELEASES[last];
        text(svg, { x: x(0) - 10, y: y(a.snn) + 4, 'text-anchor': 'end', class: 'ch-val' }, a.snn.toFixed(3));
        text(svg, { x: x(0) - 10, y: y(a.tf) + 4, 'text-anchor': 'end', class: 'ch-num' }, a.tf.toFixed(3));
        text(svg, { x: x(last) + 18, y: y(z.snn) - 5, class: 'ch-val' }, `VOLLEY ${z.snn.toFixed(3)}`);
        text(svg, { x: x(last) + 18, y: y(z.tf) + 13, class: 'ch-key' }, `Transformer ${z.tf.toFixed(3)}`);
      }
      const cross = svgEl('line', { y1: m.t, y2: m.t + ph, class: 'ch-cross', opacity: 0 }, svg);
      const hit = svgEl('rect', { x: m.l, y: m.t, width: fw, height: ph, class: 'ch-hit' }, svg);
      hit.addEventListener('pointermove', (e) => {
        const [mx, my] = pointerIn(svg, e);
        const i = clamp(Math.round(((mx - x(0)) / (x(last) - x(0))) * last), 0, last);
        const r = RELEASES[i];
        cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('opacity', 1);
        showTip(tip, container, `<b>${r.v} · ${r.adds}</b><div class="tt-row"><span><i></i>Spiking stack</span><span>${r.snn.toFixed(3)}</span></div><div class="tt-row"><span><i class="dash"></i>Transformer</span><span>${r.tf.toFixed(3)}</span></div>`, x(i), my);
      });
      hit.addEventListener('pointerleave', () => { hideTip(tip); cross.setAttribute('opacity', 0); });
    });
  }

  /* ------------------------------------------------------------------ the loop: the ground line walks the five steps */
  function initLoop() {
    const steps = $$('.vo-loop .vo-cell');
    if (!steps.length || REDUCED) return;
    let i = 0, timer = null;
    onVisible($('.vo-loop'), (vis) => {
      if (vis && !timer) timer = setInterval(() => { steps.forEach((s, k) => s.classList.toggle('is-on', k === i)); i = (i + 1) % steps.length; }, 1100);
      else if (!vis) { clearInterval(timer); timer = null; steps.forEach((s) => s.classList.remove('is-on')); }
    });
  }

  /* ------------------------------------------------------------------ fleet: every match underlined, the newest one lit */
  function initFleet() {
    const grid = $('#fleetGrid');
    if (!grid) return;
    const prefixes = ['P', 'C', 'S', 'M', 'F', 'V'];
    const tiles = [];
    for (let i = 0; i < 24; i++) {
      const el = document.createElement('div');
      el.className = 'vo-tile';
      el.innerHTML = `<span class="vo-tile__id">${prefixes[i % prefixes.length]}-${String(100 + i * 7).slice(-3)}</span><canvas aria-hidden="true"></canvas>`;
      grid.appendChild(el);
      tiles.push({ el, cv: $('canvas', el), ph: Math.random() * 10, f: 0.5 + Math.random(), hot: 0, data: [] });
    }
    let t = 0, timer = null, current = null;
    function tick() {
      t += 0.1;
      if (Math.random() < 0.03) { const k = tiles[Math.floor(Math.random() * tiles.length)]; if (!k.hot) { k.hot = 50 + Math.random() * 60; current = k; } }
      tiles.forEach((k) => {
        const v = Math.sin(t * k.f + k.ph) * 0.35 + gauss() * 0.06 + (k.hot > 0 ? (Math.random() - 0.3) * 1.1 : 0);
        k.data.push(v); if (k.data.length > 40) k.data.shift();
        if (k.hot > 0) k.hot--;
        if (!k.hot && current === k) current = null;
        k.el.classList.toggle('is-match', k.hot > 0);
        k.el.classList.toggle('is-current', k === current);
        const { ctx, w, h } = fitCanvas(k.cv);
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = k.hot > 0 ? INK : INK2;
        ctx.lineWidth = k.hot > 0 ? 1.4 : 0.8;
        ctx.beginPath();
        k.data.forEach((d, i) => { const x = (i / 39) * w, y = h / 2 - d * h * 0.3; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke();
      });
    }
    for (let i = 0; i < 40; i++) tick();
    if (REDUCED) return;
    onVisible(grid, (vis) => {
      if (vis && !timer) timer = setInterval(tick, 90);
      else if (!vis) { clearInterval(timer); timer = null; }
    });
  }

  /* ================================================================== ASSET CONSOLE (simulation) */
  const HISTORY = 300;
  const PREWARM = 4000;
  const WARN = 2.5, CRIT = 5;
  const START = new Date(2026, 10, 24, 6, 0, 0); // Tue 24 Nov 2026 06:00, SPS opening day

  const ASSETS = [
    {
      id: 'P-104', name: 'Cooling-water pump P-104', line: 'Hall 3 · Line 2', cycle: 'a three-shift load cycle of 8 hours',
      load: (t) => 0.5 + 0.3 * Math.sin((2 * Math.PI * t) / 480) + 0.08 * Math.sin((2 * Math.PI * t) / 61 + 1),
      streams: [
        { key: 'vib', name: 'Vibration', unit: 'mm/s', base: 2.3, k: 0.5, noise: 0.08, limit: 7.1, dec: 2 },
        { key: 'temp', name: 'Bearing temperature', unit: '°C', base: 52, k: 6, noise: 0.15, limit: 85, dec: 1, lag: true },
        { key: 'cur', name: 'Motor current', unit: 'A', base: 36, k: 10, noise: 0.35, limit: 58, dec: 1 },
        { key: 'pres', name: 'Discharge pressure', unit: 'bar', base: 4.4, k: 0.35, noise: 0.03, limit: 3.4, low: true, dec: 2 },
      ],
      faults: [
        { id: 'bearing', label: 'Bearing wear', eff: { vib: { d: 3.8, n: 0.5 }, temp: { d: 20, pow: 1.6 }, cur: { d: 1.2 } }, advice: 'inspect the drive-end bearing and its lubrication', sig: 'broadband vibration rising first, with bearing temperature following' },
        { id: 'cavitation', label: 'Cavitation', eff: { pres: { d: -0.7, n: 0.15 }, vib: { n: 1.0 }, cur: { d: -2.5 } }, advice: 'check the suction strainer, the inlet valve and the NPSH margin', sig: 'discharge pressure falling and fluctuating, with bursts of vibration' },
        { id: 'misalign', label: 'Misalignment', eff: { vib: { d: 2.4, osc: 0.25 }, cur: { d: 3.5 }, temp: { d: 4, pow: 1.5 } }, advice: 'check the coupling alignment and the motor foot fixings', sig: 'vibration and current rising together' },
      ],
    },
    {
      id: 'C-07', name: 'Screw compressor C-07', line: 'Hall 3 · Utilities', cycle: 'demand cycles of about 37 minutes on top of the shift pattern',
      load: (t) => 0.5 + 0.25 * Math.tanh(4 * Math.sin((2 * Math.PI * t) / 37)) + 0.12 * Math.sin((2 * Math.PI * t) / 480),
      streams: [
        { key: 'vib', name: 'Vibration', unit: 'mm/s', base: 3.0, k: 0.6, noise: 0.1, limit: 7.1, dec: 2 },
        { key: 'temp', name: 'Discharge temperature', unit: '°C', base: 78, k: 9, noise: 0.25, limit: 105, dec: 1, lag: true },
        { key: 'cur', name: 'Motor current', unit: 'A', base: 64, k: 22, noise: 0.6, limit: 85, dec: 1 },
        { key: 'pres', name: 'Net pressure', unit: 'bar', base: 7.5, k: 0.25, noise: 0.04, limit: 6.5, low: true, dec: 2 },
      ],
      faults: [
        { id: 'bearing', label: 'Bearing wear', eff: { vib: { d: 3.6, n: 0.5 }, temp: { d: 8, pow: 1.6 }, cur: { d: 2 } }, advice: 'inspect the airend bearings and the oil condition', sig: 'vibration rising first, with discharge temperature following' },
        { id: 'valve', label: 'Valve leak', eff: { pres: { d: -0.9, n: 0.08 }, cur: { d: 6 }, temp: { d: 6 } }, advice: 'inspect the inlet and minimum-pressure valve seals', sig: 'net pressure falling while current rises to hold it' },
        { id: 'fouling', label: 'Cooler fouling', eff: { temp: { d: 16, pow: 1.3 }, cur: { d: 2 } }, advice: 'clean the oil and air cooler at the next stop', sig: 'discharge temperature drifting above its load-normal' },
      ],
    },
    {
      id: 'S-2', name: 'CNC spindle S-2', line: 'Hall 5 · Cell 4', cycle: 'machining cycles of about 14 minutes',
      load: (t) => 0.45 + 0.32 * Math.tanh(5 * Math.sin((2 * Math.PI * t) / 14)) + 0.08 * Math.sin((2 * Math.PI * t) / 480),
      streams: [
        { key: 'vib', name: 'Spindle vibration', unit: 'mm/s', base: 1.1, k: 0.5, noise: 0.05, limit: 4.5, dec: 2 },
        { key: 'temp', name: 'Spindle temperature', unit: '°C', base: 33, k: 5, noise: 0.12, limit: 55, dec: 1, lag: true },
        { key: 'cur', name: 'Spindle current', unit: 'A', base: 17, k: 9, noise: 0.3, limit: 28, dec: 1 },
        { key: 'pres', name: 'Coolant pressure', unit: 'bar', base: 6.0, k: 0.2, noise: 0.06, limit: 3.5, low: true, dec: 2 },
      ],
      faults: [
        { id: 'bearing', label: 'Bearing wear', eff: { vib: { d: 2.4, n: 0.3 }, temp: { d: 12, pow: 1.6 }, cur: { d: 0.6 } }, advice: 'plan a spindle bearing inspection', sig: 'spindle vibration rising first, with temperature following' },
        { id: 'tool', label: 'Tool wear', eff: { cur: { d: 6, n: 0.6 }, vib: { d: 0.25, n: 0.05, pow: 1.5 }, temp: { d: 2, pow: 1.5 } }, advice: 'change the tool at the next job boundary', sig: 'spindle current creeping up across cycles' },
        { id: 'coolant', label: 'Coolant clog', eff: { pres: { d: -2.2, n: 0.1 }, temp: { d: 4, pow: 1.5 } }, advice: 'clean the coolant filter and check the coolant pump', sig: 'coolant pressure falling, with spindle temperature following' },
      ],
    },
  ];

  function clockStr(min) {
    const d = new Date(START.getTime() + min * 60000);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[d.getDay()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  function timeStr(min) { const d = new Date(START.getTime() + min * 60000); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
  function durStr(min) {
    min = Math.max(1, Math.round(min));
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60), m = min % 60;
    if (h < 24) return m ? `${h} h ${m} min` : `${h} h`;
    const d = Math.floor(h / 24), hh = h % 24;
    return hh ? `${d} d ${hh} h` : `${d} d`;
  }

  function makeAsset(def) {
    const a = { def, t: -PREWARM, lagL: def.load(-PREWARM), fault: null, sev: 0, faultStart: 0, live: 0, events: [], dev: {}, limitHit: {}, lMin: 1, lMax: 0 };
    a.streams = def.streams.map((s) => ({
      def: s, fLag: 0, a: s.base, b: s.k, v: s.noise * s.noise * 3, sb: 0.7,
      level: s.base, hist: [], yLo: s.base - s.noise * 8, yHi: s.base + s.noise * 8, value: s.base, bits: 0,
    }));
    for (let i = 0; i < PREWARM; i++) stepAsset(a, true);
    a.t = 0;
    return a;
  }

  function stepAsset(a, warm = false) {
    const def = a.def;
    const L = def.load(a.t);
    a.lagL += (L - a.lagL) * 0.02;
    if (warm) { a.lMin = Math.min(a.lMin, L); a.lMax = Math.max(a.lMax, L); }
    if (a.fault) a.sev = Math.min(1.6, a.sev + 1 / 1600);
    const f = a.fault ? a.fault.eff : null;
    a.streams.forEach((st) => {
      const s = st.def;
      const load = s.lag ? a.lagL : L;
      let shift = 0, extra = 0;
      if (f && f[s.key]) {
        const e = f[s.key];
        const sev = Math.pow(a.sev, e.pow || 1);
        shift = (e.d || 0) * sev * (e.osc ? 1 + e.osc * Math.sin(a.t * 0.9) : 1);
        if (e.n) extra = (s.key === 'vib' ? Math.abs(gauss()) : gauss()) * e.n * a.sev;
      }
      // thermal streams follow the lagged load, and a fault heats them with the same lag
      if (s.lag) { st.fLag += (shift - st.fLag) * 0.02; shift = st.fLag; }
      const value = s.base + s.k * (load - 0.5) + shift + gauss() * s.noise + extra;
      // the capsule's model of this stream's normal: value ≈ a + b·(load − ½), with a learned spread
      const mu = st.a + st.b * (load - 0.5);
      const r = value - mu;
      const z = r / Math.sqrt(st.v);
      // surprise in bits under a heavy-tailed (Student-t, 3 dof) prediction: about 0.7 bits on average when normal
      const bits = 2 * Math.log2(1 + (z * z) / 3);
      const lr = warm ? 0.02 : 0.001, lv = warm ? 0.01 : 0.001;
      // the capsule keeps learning, but holds back while a stream is surprising it
      if (Math.abs(z) < 4 && st.sb < WARN * 0.7) {
        st.a += lr * r;
        st.b += lr * r * (load - 0.5) * 4;
        st.v += lv * (r * r - st.v);
      }
      st.sb += 0.06 * (bits - st.sb);
      st.value = value; st.bits = bits;
      // delta spike encoder
      const delta = s.noise * 2.5;
      let sp = 0;
      while (value - st.level > delta) { st.level += delta; sp++; }
      while (st.level - value > delta) { st.level -= delta; sp--; }
      if (!warm) {
        st.hist.push({ v: value, mu, sd: Math.sqrt(st.v), sb: st.sb, sp });
        if (st.hist.length > HISTORY) st.hist.shift();
        // detection and events
        const name = s.name;
        if (st.sb >= WARN && !a.dev[s.key]) {
          a.dev[s.key] = { t: a.t, sb: st.sb };
          addEvent(a, 'warn', `${name} left its learned normal · surprise ${st.sb.toFixed(1)} bits (normal ≈ 0.7)`);
        }
        if (st.sb >= CRIT && a.dev[s.key] && !a.dev[s.key].crit) {
          a.dev[s.key].crit = a.t;
          addEvent(a, 'crit', `${name} strongly anomalous · surprise ${st.sb.toFixed(1)} bits`);
        }
        const over = s.low ? value < s.limit : value > s.limit;
        if (over && !a.limitHit[s.key]) {
          a.limitHit[s.key] = a.t;
          addEvent(a, 'crit', `${name} crossed its static alarm limit of ${s.limit} ${s.unit}`);
        }
      }
    });
    a.t++;
    if (!warm) a.live++;
  }

  function assetState(a) {
    const m = Math.max(...a.streams.map((s) => s.sb));
    return m >= CRIT ? 'crit' : m >= WARN ? 'warn' : 'ok';
  }

  let addEvent = () => {};

  function initConsole() {
    const root = $('.vo-console');
    if (!root) return;
    const assets = ASSETS.map(makeAsset);
    let cur = 0;
    const streamsEl = $('#streams'), tabsEl = $('#assetTabs'), logEl = $('#eventLog'), chatLog = $('#chatLog');
    const statusBadge = $('#statusBadge'), statusLabel = $('#statusLabel'), surpriseVal = $('#surpriseVal'), surpriseFill = $('#surpriseFill');
    const learnInfo = $('#learnInfo'), simClock = $('#simClock'), faultBtns = $('#faultBtns'), autoplay = $('#autoplay');
    const meterPct = (b) => clamp(Math.log2(1 + b) / Math.log2(1 + 16), 0, 1) * 100;
    $('.vo-meter__norm').style.left = meterPct(0.71) + '%';

    const globalEvents = [];
    addEvent = (a, level, txt) => {
      const e = { a: a.def.id, t: a.t, level, text: txt };
      a.events.push(e);
      globalEvents.push(e);
      renderLog();
    };
    function renderLog() {
      logEl.innerHTML = '';
      if (!globalEvents.length) {
        const li = document.createElement('li');
        li.textContent = 'No surprise events yet. Every capsule sees what it expects.';
        logEl.appendChild(li); return;
      }
      globalEvents.slice(-40).reverse().forEach((e) => {
        const li = document.createElement('li');
        li.className = 'is-' + e.level;
        li.innerHTML = `<time>${clockStr(e.t)}</time><span class="ev-asset">${e.a}</span><span class="ev-text">${e.text}</span>`;
        logEl.appendChild(li);
      });
    }
    renderLog();

    assets.forEach((a, i) => {
      const b = document.createElement('button');
      b.className = 'vo-tab'; b.setAttribute('role', 'tab'); b.dataset.i = i;
      b.innerHTML = `<span class="vo-tab__mark" data-state="ok" aria-hidden="true"></span><span>${a.def.id}</span><span class="vo-tab__name">${a.def.name.replace(a.def.id, '').trim()}</span>`;
      b.addEventListener('click', () => { userTouched(); selectAsset(i); });
      tabsEl.appendChild(b);
    });

    function buildStreams() {
      const a = assets[cur];
      streamsEl.innerHTML = `<p class="t-label vo-legend"><span><i style="border-top:1.5px solid ${INK}"></i>Value</span><span><i style="height:.5rem;background:${GLAS}"></i>Learned normal</span><span><i style="border-top:1px dashed ${INK}"></i>Static limit</span><span><i style="height:.5rem;background:${INK}"></i>Spikes · surprise</span></p>`;
      a.streams.forEach((st) => {
        const div = document.createElement('div');
        div.className = 'vo-stream';
        div.innerHTML = `<div class="vo-stream__head"><span class="vo-stream__name"><span class="vo-stream__label">${st.def.name}</span><small>${st.def.unit} · limit ${st.def.low ? '<' : '>'} ${st.def.limit}</small></span><span class="vo-stream__val"><span class="sv-v">–</span><span class="sv-s">– bits</span></span></div><div class="vo-stream__plot"><canvas aria-hidden="true"></canvas></div>`;
        streamsEl.appendChild(div);
        st.el = div; st.cv = $('canvas', div); st.vEl = $('.sv-v', div); st.sEl = $('.sv-s', div);
      });
    }
    function buildFaults() {
      const a = assets[cur];
      $('#faultAsset').textContent = a.def.id;
      faultBtns.innerHTML = '';
      a.def.faults.forEach((f) => {
        const b = document.createElement('button');
        b.className = 'cf-btn cf-btn--outline';
        b.setAttribute('aria-pressed', String(!!(a.fault && a.fault.id === f.id)));
        b.textContent = f.label;
        b.addEventListener('click', () => { userTouched(); injectFault(a, f); });
        faultBtns.appendChild(b);
      });
    }
    function injectFault(a, f) {
      if (a.fault && a.fault.id === f.id) return;
      resetAsset(a, true);
      a.fault = f; a.sev = 0; a.faultStart = a.t;
      addEvent(a, 'warn', `Simulation: ${f.label.toLowerCase()} injected`);
      buildFaults();
    }
    function resetAsset(a, silent) {
      const had = !!a.fault;
      a.fault = null; a.sev = 0; a.dev = {}; a.limitHit = {};
      a.streams.forEach((st) => { st.fLag = 0; st.sb = 0.7; });
      if (had && !silent) addEvent(a, 'ok', 'Repaired. The capsule keeps everything it learned about this asset');
      buildFaults();
    }
    $('#resetBtn').addEventListener('click', () => { userTouched(); resetAsset(assets[cur]); });
    function selectAsset(i) {
      cur = i;
      $$('.vo-tab', tabsEl).forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
      const a = assets[cur];
      $('#assetName').textContent = a.def.name;
      $('#assetLine').textContent = a.def.line;
      $('#chatInput').placeholder = `Ask about ${a.def.id}…`;
      buildStreams(); buildFaults(); draw();
    }

    function drawStream(st) {
      const { ctx, w, h } = fitCanvas(st.cv);
      ctx.clearRect(0, 0, w, h);
      const H = st.hist;
      if (H.length < 2) return;
      const chartH = h - 24, mid = chartH + 8, heatY = h - 6;
      let lo = Infinity, hi = -Infinity;
      for (const p of H) { lo = Math.min(lo, p.v, p.mu - 2.5 * p.sd); hi = Math.max(hi, p.v, p.mu + 2.5 * p.sd); }
      const pad = (hi - lo) * 0.12 || 1;
      st.yLo = lerp(st.yLo, lo - pad, 0.15); st.yHi = lerp(st.yHi, hi + pad, 0.15);
      const n = HISTORY, dx = w / (n - 1), off = n - H.length;
      const X = (i) => (i + off) * dx;
      const Y = (v) => 3 + (1 - (v - st.yLo) / (st.yHi - st.yLo)) * (chartH - 6);
      ctx.strokeStyle = 'rgba(0,0,0,0.24)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, 0.5); ctx.lineTo(w, 0.5); ctx.moveTo(0, chartH - 0.5); ctx.lineTo(w, chartH - 0.5); ctx.stroke();
      // the learned normal, in Glas
      ctx.fillStyle = 'rgba(197,235,226,0.75)';
      ctx.beginPath();
      H.forEach((p, i) => { const x = X(i), y = Y(p.mu + 2 * p.sd); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      for (let i = H.length - 1; i >= 0; i--) ctx.lineTo(X(i), Y(H[i].mu - 2 * H[i].sd));
      ctx.closePath(); ctx.fill();
      // static limit on the near rung
      const lim = st.def.limit;
      ctx.font = '500 10px "Geist Mono", ui-monospace, monospace';
      if (lim > st.yLo && lim < st.yHi) {
        ctx.strokeStyle = INK; ctx.setLineDash([4, 2]);
        ctx.beginPath(); ctx.moveTo(0, Y(lim)); ctx.lineTo(w, Y(lim)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = INK; ctx.fillText(`STATIC LIMIT ${lim}`, 6, Y(lim) - 4);
      }
      // value: grey where expected, ink where it surprises
      for (let i = 1; i < H.length; i++) {
        const p = H[i];
        ctx.strokeStyle = p.sb >= WARN ? INK : INK2;
        ctx.lineWidth = p.sb >= CRIT ? 2.2 : p.sb >= WARN ? 1.6 : 1;
        ctx.beginPath(); ctx.moveTo(X(i - 1), Y(H[i - 1].v)); ctx.lineTo(X(i), Y(p.v)); ctx.stroke();
      }
      // spike raster
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([1, 3]);
      ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke(); ctx.setLineDash([]);
      ctx.lineWidth = Math.max(1, dx * 0.7);
      H.forEach((p, i) => {
        if (!p.sp) return;
        const len = Math.min(6, 2 + Math.abs(p.sp) * 1.5);
        ctx.strokeStyle = p.sp > 0 ? INK : INK2;
        ctx.beginPath(); ctx.moveTo(X(i), mid); ctx.lineTo(X(i), p.sp > 0 ? mid - len : mid + len); ctx.stroke();
      });
      // surprise as ink density
      H.forEach((p, i) => {
        const a = clamp((p.sb - 1.6) / 4, 0, 1);
        if (a <= 0) return;
        ctx.fillStyle = `rgba(0,0,0,${0.15 + a * 0.85})`;
        ctx.fillRect(X(i) - dx / 2, heatY, dx + 0.5, 5);
      });
    }

    function draw() {
      const a = assets[cur];
      const devs = Object.entries(a.dev).sort((x, y) => x[1].t - y[1].t);
      const firstKey = devs.length ? devs[0][0] : null;
      a.streams.forEach((st) => {
        if (!st.cv) return;
        drawStream(st);
        st.vEl.textContent = `${fmt(st.value, st.def.dec)} ${st.def.unit}`;
        st.sEl.textContent = `${st.sb.toFixed(1)} bits`;
        st.el.classList.toggle('is-match', !!a.dev[st.def.key]);
        st.el.classList.toggle('is-current', st.def.key === firstKey);
      });
      const state = assetState(a);
      const maxS = Math.max(...a.streams.map((s) => s.sb));
      statusBadge.dataset.state = state;
      statusLabel.textContent = state === 'crit' ? 'Anomaly' : state === 'warn' ? 'Watch' : 'Normal';
      surpriseVal.textContent = `${maxS.toFixed(1)} bits/sample`;
      surpriseFill.style.width = meterPct(maxS) + '%';
      learnInfo.textContent = `4 capsules · 30 days of history + ${fmt(a.live)} live samples per stream`;
      simClock.textContent = clockStr(a.t);
      $$('.vo-tab', tabsEl).forEach((b, k) => { $('.vo-tab__mark', b).dataset.state = assetState(assets[k]); });
    }

    /* chat */
    function addMsg(who, html, typed) {
      const div = document.createElement('div');
      div.className = 'vo-msg vo-msg--' + who;
      if (who === 'bot') div.innerHTML = '<span class="vo-msg__who">Volley · simulated</span>';
      const body = document.createElement('span');
      div.appendChild(body);
      chatLog.appendChild(div);
      if (who === 'user' || !typed || REDUCED) { body.innerHTML = html; chatLog.scrollTop = chatLog.scrollHeight; return; }
      const parts = html.split(/(<b>.*?<\/b>)/g).filter(Boolean).map((p) => (p.startsWith('<b>') ? { b: true, t: p.slice(3, -4) } : { b: false, t: p }));
      let pi = 0, ci = 0, node = null;
      const caret = document.createElement('span'); caret.className = 'vo-caret';
      body.appendChild(caret);
      const timer = setInterval(() => {
        for (let k = 0; k < 3; k++) {
          if (pi >= parts.length) { clearInterval(timer); caret.remove(); return; }
          const p = parts[pi];
          if (!node) { node = p.b ? document.createElement('b') : document.createTextNode(''); body.insertBefore(node, caret); }
          node.textContent += p.t[ci];
          ci++;
          if (ci >= p.t.length) { pi++; ci = 0; node = null; }
        }
        chatLog.scrollTop = chatLog.scrollHeight;
      }, 14);
    }

    function streamRange(a, st) {
      const lo = st.a + st.b * (a.lMin - 0.5), hi = st.a + st.b * (a.lMax - 0.5);
      return [Math.min(lo, hi), Math.max(lo, hi)];
    }
    function signature(a) {
      return a.fault ? ` The pattern is consistent with <b>${a.fault.label.toLowerCase()}</b>: ${a.fault.sig}.` : '';
    }

    function answer(q) {
      const a = assets[cur], id = a.def.id;
      const s = q.toLowerCase();
      const devs = Object.entries(a.dev).map(([k, v]) => ({ st: a.streams.find((x) => x.def.key === k), ...v })).sort((x, y) => x.t - y.t);
      const state = assetState(a);
      const hottest = [...a.streams].sort((x, y) => y.sb - x.sb)[0];

      if (/(compare|fleet|other|line|all assets|vergleich|flotte)/.test(s)) {
        return 'Line overview: ' + assets.map((x) => {
          const m = Math.max(...x.streams.map((st) => st.sb));
          const stt = assetState(x);
          return `<b>${x.def.id}</b> ${stt === 'ok' ? 'normal' : stt === 'warn' ? 'watch' : 'anomalous'} (${m.toFixed(1)} bits)`;
        }).join(' · ') + '. Each asset is measured against its own capsule, never against the others.';
      }
      if (/(maint|service|schedule|when|rul|remaining|fail|repair|inspect|wartung|wann|instand)/.test(s)) {
        if (!a.fault || !devs.length) {
          return `<b>No service is indicated by the streams.</b> All four of ${id}'s streams are within the normal its capsule has learned, and none is trending toward a limit. Keep the planned maintenance interval.`;
        }
        let best = null;
        a.streams.filter((st) => a.dev[st.def.key]).forEach((st) => {
          const H = st.hist.slice(-120);
          if (H.length < 30) return;
          const nH = H.length, mx = (nH - 1) / 2;
          let sxy = 0, sxx = 0, my = H.reduce((acc, p) => acc + p.v, 0) / nH;
          H.forEach((p, i) => { sxy += (i - mx) * (p.v - my); sxx += (i - mx) * (i - mx); });
          const slope = sxy / sxx;
          const now = H[nH - 1].v;
          const gap = st.def.low ? now - st.def.limit : st.def.limit - now;
          const toward = st.def.low ? -slope : slope;
          if (gap <= 0) { best = { st, ttl: 0 }; return; }
          if (toward <= 1e-6) return;
          const ttl = gap / toward;
          if (!best || ttl < best.ttl) best = { st, ttl };
        });
        if (!best) return `<b>Watch, no urgency.</b> ${id} is surprising its capsule, but no stream is trending toward a limit yet. Recommended: ${a.fault.advice} at the next planned stop.`;
        if (best.ttl === 0) return `<b>Service now.</b> ${best.st.def.name} is past its static limit of ${best.st.def.limit} ${best.st.def.unit}. Volley flagged it at ${timeStr(devs[0].t)}, ${durStr(a.limitHit[best.st.def.key] - devs[0].t || 1)} before the limit tripped. Recommended: ${a.fault.advice}.`;
        return `<b>Plan service within ${durStr(best.ttl * 0.7)} to ${durStr(best.ttl * 1.3)}.</b> At its current trend, ${best.st.def.name.toLowerCase()} reaches its static limit of ${best.st.def.limit} ${best.st.def.unit} in about ${durStr(best.ttl)}. Recommended: ${a.fault.advice}, at the next planned stop rather than at the alarm.${signature(a)}`;
      }
      if (/(first|deviat|root|cause|why|which stream|flag|zuerst|ursache|warum)/.test(s)) {
        if (!devs.length) return `No stream on ${id} has left its learned normal since ${clockStr(0)}. If you want to see one do so, inject a fault.`;
        const f = devs[0];
        let txt = `<b>${f.st.def.name} deviated first</b>, at ${timeStr(f.t)}. Its surprise is now ${f.st.sb.toFixed(1)} bits/sample, against about 0.7 in its normal, while the value itself, ${fmt(f.st.value, f.st.def.dec)} ${f.st.def.unit}, is ${a.limitHit[f.st.def.key] ? 'past' : 'still inside'} its static limit of ${f.st.def.limit}.`;
        if (devs.length > 1) txt += ' Then ' + devs.slice(1).map((d) => `${d.st.def.name.toLowerCase()} at ${timeStr(d.t)} (+${durStr(d.t - f.t)})`).join(', ') + '.';
        const calm = a.streams.filter((st) => !a.dev[st.def.key]).map((st) => st.def.name.toLowerCase());
        if (calm.length) { const c = calm.join(' and '); txt += ` ${c[0].toUpperCase() + c.slice(1)} ${calm.length > 1 ? 'are' : 'is'} within normal.`; }
        return txt + signature(a);
      }
      if (/(anomal|alarm|event|hour|happen|unusual|auffällig|ereignis)/.test(s)) {
        const ev = a.events.slice(-5);
        if (!ev.length) return `No surprise events on ${id} so far. All four capsules see what they expect.`;
        return `Events on ${id}: ` + ev.map((e) => `<b>${timeStr(e.t)}</b> ${e.text}`).join(' · ') + '.';
      }
      if (/(learn|know|normal|pattern|remember|capsule|gelernt|weißt|muster)/.test(s)) {
        const [st0, st1, st2, st3] = a.streams;
        const r = (st) => { const [lo, hi] = streamRange(a, st); return `${fmt(lo, st.def.dec)}–${fmt(hi, st.def.dec)} ${st.def.unit}`; };
        return `Its capsule holds ${id}'s own normal: <b>${a.def.cycle}</b>. ${st0.def.name} ${r(st0)}, rising with load. ${st1.def.name} ${r(st1)}, following the load about 50 minutes behind. ${st2.def.name} ${r(st2)}. ${st3.def.name} ${r(st3)}. That comes from 30 days of history and ${fmt(a.live)} samples per stream since you opened this page, learned during inference with no retraining.`;
      }
      if (/(status|doing|health|how is|how's|ok|right now|now|zustand|wie geht|läuft)/.test(s)) {
        if (state === 'ok') {
          const v = a.streams[0];
          const [lo, hi] = streamRange(a, v);
          return `<b>${id} is behaving like itself.</b> Surprise is ${hottest.sb.toFixed(1)} bits/sample at most, in line with its normal of about 0.7 on all four streams. ${v.def.name} is ${fmt(v.value, v.def.dec)} ${v.def.unit}, inside its learned range of ${fmt(lo, v.def.dec)}–${fmt(hi, v.def.dec)}.`;
        }
        const f = devs[0];
        const lim = Object.keys(a.limitHit).length
          ? ` A static limit has tripped as well (${a.streams.find((x) => a.limitHit[x.def.key]).def.name.toLowerCase()}).`
          : ` No static limit has tripped yet: ${hottest.def.name.toLowerCase()} is at ${fmt(hottest.value, hottest.def.dec)} ${hottest.def.unit}, limit ${hottest.def.limit}.`;
        return `<b>${id} is not behaving like itself.</b> ${hottest.def.name} surprise is ${hottest.sb.toFixed(1)} bits/sample, about ${Math.round(hottest.sb / 0.7)}× its normal${f ? `, first flagged at ${timeStr(f.t)}` : ''}.${lim}${signature(a)}`;
      }
      return 'This simulated console can talk about status, which stream deviated first, anomalies, when to service, what the capsule has learned, and how the three assets compare. Try one of the suggestions below.';
    }

    function ask(q) {
      addMsg('user', q.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])));
      setTimeout(() => addMsg('bot', answer(q), true), 280);
    }
    $$('.vo-chip').forEach((b) => b.addEventListener('click', () => { userTouched(); ask(b.dataset.q); }));
    $('#chatForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('#chatInput');
      const q = input.value.trim();
      if (!q) return;
      userTouched();
      ask(q);
      input.value = '';
    });

    /* booth autoplay */
    const auto = { on: false, phase: 'idle', at: 0, faultIdx: 0, pausedUntil: 0 };
    function userTouched() { if (auto.on) auto.pausedUntil = performance.now() + 45000; }
    function setAuto(on) { auto.on = on; autoplay.checked = on; auto.phase = 'idle'; auto.at = assets[cur].t; auto.pausedUntil = 0; }
    autoplay.addEventListener('change', () => setAuto(autoplay.checked));
    function autoTick() {
      if (!auto.on) return;
      const a = assets[cur];
      if (performance.now() < auto.pausedUntil) { auto.at = a.t; return; }
      const dt = a.t - auto.at;
      if (auto.phase === 'idle' && dt > 220) {
        const f = a.def.faults[auto.faultIdx % a.def.faults.length];
        auto.faultIdx++;
        injectFault(a, f);
        auto.phase = 'fault'; auto.at = a.t;
      } else if (auto.phase === 'fault' && ((Object.keys(a.dev).length && dt > 260) || dt > 700)) {
        ask('Which stream deviated first?');
        auto.phase = 'asked1'; auto.at = a.t;
      } else if (auto.phase === 'asked1' && dt > 320) {
        ask('When should we schedule maintenance?');
        auto.phase = 'asked2'; auto.at = a.t;
      } else if (auto.phase === 'asked2' && dt > 380) {
        resetAsset(a);
        auto.phase = 'reset'; auto.at = a.t;
      } else if (auto.phase === 'reset' && dt > 160) {
        selectAsset((cur + 1) % assets.length);
        addMsg('bot', `Now reading <b>${assets[cur].def.name}</b>.`, true);
        auto.phase = 'idle'; auto.at = assets[cur].t;
      }
    }

    selectAsset(0);
    addMsg('bot', `I am reading <b>${assets[0].def.id}</b>'s four streams, each with its own capsule. Ask me about this asset, or inject a fault first and watch which stream I find.`, false);
    if (KIOSK) setAuto(true);

    let running = false, last = 0, acc = 0;
    const RATE = 20; // samples per second (1 sample = 1 plant minute)
    function frame(ts) {
      if (!running) return;
      acc += Math.min(0.25, (ts - last) / 1000);
      last = ts;
      let steps = 0;
      while (acc >= 1 / RATE && steps < 8) {
        assets.forEach((a) => stepAsset(a));
        autoTick();
        acc -= 1 / RATE; steps++;
      }
      draw();
      requestAnimationFrame(frame);
    }
    for (let i = 0; i < HISTORY; i++) assets.forEach((a) => stepAsset(a));
    globalEvents.length = 0; assets.forEach((a) => { a.events = []; a.dev = {}; a.limitHit = {}; });
    renderLog();
    draw();
    onVisible(root, (vis) => {
      if (vis && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
      else if (!vis) running = false;
    }, '0px');
    window.addEventListener('resize', draw);
  }

  /* ------------------------------------------------------------------ booth loop
     ?kiosk=loop walks the page by itself for an unattended screen: one stop after another, longest at the
     console, and round again from the top. A touch, a key or the wheel hands the page to the visitor for a
     minute. Plain ?kiosk leaves the page where it is, as before. */
  function initBoothLoop() {
    if (!/[?&#]kiosk=loop/.test(location.href)) return;
    const stops = [['#top', 12], ['#architecture', 8], ['.vo-arch', 44], ['#streaming', 18], ['.vo-viz-grid', 16], ['#industrial', 16],
      ['.vo-ind-grid', 12], ['.vo-console', 85], ['#proof', 8], ['.vo-proof-grid', 16], ['#roadmap', 14], ['#pilot', 12]];
    let at = 0, handed = 0;
    const next = () => {
      if (performance.now() < handed) { setTimeout(next, 1000); return; }
      const [selector, seconds] = stops[at];
      const el = document.querySelector(selector);
      if (el) {
        // a section starts at the top of the screen; a block inside one stops just clear of the bar
        const bar = $('.cf-nav__bar');
        const clear = el.matches('section, header, footer') ? 0 : (bar ? bar.getBoundingClientRect().bottom : 0) + 16 * ZOOM;
        window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - clear), behavior: REDUCED ? 'auto' : 'smooth' });
      }
      at = (at + 1) % stops.length;
      setTimeout(next, seconds * 1000);
    };
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((type) =>
      window.addEventListener(type, () => { handed = performance.now() + 60000; }, { passive: true }));
    setTimeout(next, 5000);
  }

  /* ------------------------------------------------------------------ stepping
     The page steps like a deck: → goes on to the next stop and ← back to the one before, and so do the two keys at
     the right edge, which light up as the arrow keys press them. The stops are the hero, every section and every
     large block in a section that the stop before does not already show whole. They are worked out from the page
     as it is laid out, so they fit any screen and the booth scale. An arrow key typed into a field or a slider, or
     in a block that scrolls sideways, keeps its own meaning, and so does an arrow key with a modifier. */
  function initStepper() {
    const nav = document.createElement('nav');
    nav.className = 'vo-stepper';
    nav.setAttribute('aria-label', 'Step through the page');
    const chevron = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path vector-effect="non-scaling-stroke" d="${d}"/></svg>`;
    nav.innerHTML =
      `<button type="button" class="vo-stepper__key" aria-label="Previous section" aria-keyshortcuts="ArrowLeft" title="Previous section (←)">${chevron('M7 14.5 L12 9.5 L17 14.5')}</button>` +
      '<span class="vo-stepper__at" aria-hidden="true">01</span>' +
      `<button type="button" class="vo-stepper__key" aria-label="Next section" aria-keyshortcuts="ArrowRight" title="Next section (→)">${chevron('M7 9.5 L12 14.5 L17 9.5')}</button>`;
    document.body.appendChild(nav);
    const [up, down] = $$('button', nav), at = $('.vo-stepper__at', nav);

    function stops() {
      const vh = window.innerHeight, sy = window.scrollY;
      const bar = $('.cf-nav__bar');
      const clear = (bar ? bar.getBoundingClientRect().bottom : 0) + 16 * ZOOM;      // a block stops just clear of the bar
      const max = document.documentElement.scrollHeight - vh;
      const blocks = [$('#top')];
      $$('main > section').forEach((sec) => blocks.push(sec, ...(sec.querySelector(':scope > .container') || sec).children));
      blocks.push($('footer'));
      const ys = [];
      let last = -Infinity;
      for (const el of blocks) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.height < 120 * ZOOM) continue;
        const top = r.top + sy, bottom = r.bottom + sy;
        const y = Math.round(clamp(top - (el.matches('header, section, footer') ? 0 : clear), 0, max));
        if (y - last < 120 * ZOOM) continue;                                         // too close to the stop before
        if (ys.length && top >= last + clear && bottom <= last + vh) continue;       // the stop before shows it whole
        ys.push(y);
        last = y;
      }
      return ys;
    }

    // Presses that come faster than the scroll count from where the last one was headed.
    let aim = 0, aimUntil = 0;
    function step(dir) {
      const ys = stops();
      const from = performance.now() < aimUntil ? aim : window.scrollY;
      let to = null;
      if (dir > 0) to = ys.find((y) => y > from + 4);
      else for (let i = ys.length - 1; i >= 0; i--) if (ys[i] < from - 4) { to = ys[i]; break; }
      if (to == null) return false;
      aim = to;
      aimUntil = performance.now() + 900;
      window.scrollTo({ top: to, behavior: REDUCED ? 'auto' : 'smooth' });
      return true;
    }
    up.addEventListener('click', () => step(-1));
    down.addEventListener('click', () => step(1));

    const typing = (t) => t.closest && (t.closest('textarea, select, [contenteditable]:not([contenteditable="false"])') ||
      (t.tagName === 'INPUT' && !['checkbox', 'button', 'submit', 'reset', 'image', 'file', 'color'].includes(t.type)));
    const sideways = (t) => {
      for (let el = t; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
        if (el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(el).overflowX)) return true;
      }
      return false;
    };
    document.addEventListener('keydown', (e) => {
      const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (typing(e.target) || sideways(e.target)) return;
      e.preventDefault();
      if (step(dir)) {
        const key = dir > 0 ? down : up;
        key.classList.add('is-pressed');
        setTimeout(() => key.classList.remove('is-pressed'), 180);
      }
    });

    // The middle shows which stop is on screen, and a key that has nowhere to go rests.
    let cache = null, cachedAt = 0, queued = false;
    function mark() {
      queued = false;
      if (!cache || performance.now() - cachedAt > 1000) { cache = stops(); cachedAt = performance.now(); }
      const sy = window.scrollY;
      let i = 0;
      cache.forEach((y, k) => { if (y <= sy + 4) i = k; });
      at.textContent = String(i + 1).padStart(2, '0');
      nav.title = `Section ${i + 1} of ${cache.length} · ← →`;
      up.disabled = sy <= cache[0] + 4;
      down.disabled = sy >= cache[cache.length - 1] - 4;
    }
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(mark); } };
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', () => { cache = null; queue(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { cache = null; queue(); });
    mark();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initBoothScale();
    initNav();
    initMenu();
    initDisclosures();
    initHero();
    initVolley();
    initArch();
    initForget();
    initReading();
    initReleases();
    initLoop();
    initFleet();
    initConsole();
    initBoothLoop();
    initStepper();
  });
})();
