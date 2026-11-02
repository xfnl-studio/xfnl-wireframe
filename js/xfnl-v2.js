/* xfnl Studio v2.1 behavior. No dependencies, no inline style attributes.
   1) Diagram figures play only on screen, with a visible pause button.
   2) Clarity, the site's own background icosahedron in miniature, turns to face the pointer (mouse and pen) or a tap (touch). She traces a path when thinking and sends out ripples when asking or speaking.
   3) The scroll demo reveals one chat message per scroll step and drives Clarity's state.
   4) Proof numbers count up and sections fade in as they enter the screen.
   Everything respects prefers-reduced-motion: static, fully readable, nothing hidden. */
(function () {
  'use strict';

  var reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- 1) Diagram figures ---------- */
  function initFigure(fig) {
    var svg = fig.querySelector('svg');
    var btn = fig.querySelector('.dg-pause');
    var state = { userPaused: false, visible: !hasIO };

    function apply() {
      var paused = reduced.matches || state.userPaused || !state.visible;
      fig.classList.toggle('dg-paused', paused);
      if (svg && svg.pauseAnimations) {
        if (paused) { svg.pauseAnimations(); } else { svg.unpauseAnimations(); }
      }
    }

    if (btn) {
      btn.addEventListener('click', function () {
        state.userPaused = !state.userPaused;
        btn.setAttribute('aria-pressed', state.userPaused ? 'true' : 'false');
        btn.textContent = state.userPaused ? 'Play animation' : 'Pause animation';
        apply();
      });
    }
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        state.visible = entries[0].isIntersecting;
        apply();
      }, { threshold: 0.2 }).observe(fig);
    }
    apply();
  }

  /* ---------- 2) Clarity: the actual background icosahedron, small and alive ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  var PHI = (1 + Math.sqrt(5)) / 2;
  var BG_V = [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI],
              [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]];
  var BG_E = [];
  (function () {
    for (var i = 0; i < 12; i++) {
      for (var j = i + 1; j < 12; j++) {
        var dx = BG_V[i][0] - BG_V[j][0], dy = BG_V[i][1] - BG_V[j][1], dz = BG_V[i][2] - BG_V[j][2];
        var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d > 1.9 && d < 2.1) { BG_E.push([i, j]); }
      }
    }
  })();

  /* Same rotation and perspective as the geo-canvas in portfolio.js */
  function project(ax, ay, cx, cy, radius) {
    var cosX = Math.cos(ax), sinX = Math.sin(ax), cosY = Math.cos(ay), sinY = Math.sin(ay);
    return BG_V.map(function (v) {
      var x = v[0], y = v[1], z = v[2];
      var y1 = y * cosX - z * sinX, z1 = y * sinX + z * cosX;
      var x2 = x * cosY + z1 * sinY, z2 = -x * sinY + z1 * cosY;
      var sc = 4 / (4 + z2 * 0.42);
      return { x: cx + x2 * radius * sc, y: cy + y1 * radius * sc, z: z2 };
    });
  }
  function depth(za, zb, lo, hi) {
    var t = ((za + zb) / 2 + 1.9) / 3.8;
    return lo + (hi - lo) * Math.max(0, Math.min(1, t));
  }
  function mk(tag, cls, par) {
    var el = document.createElementNS(NS, tag);
    el.setAttribute('class', cls);
    par.appendChild(el);
    return el;
  }

  var CX = 100, CY = 102, RAD = 30, BASE_AX = 0.3, BASE_AY = 0.5;

  function initClarity(svg) {
    var tilt = svg.querySelector('.cl-tilt');
    var gRings = svg.querySelector('.cl-rings'), gFaces = svg.querySelector('.cl-faces');
    var gEdges = svg.querySelector('.cl-edges'), gNodes = svg.querySelector('.cl-nodes');
    if (!tilt || !gRings || !gEdges || !gNodes) { return; }
    gRings.textContent = ''; if (gFaces) { gFaces.textContent = ''; } gEdges.textContent = ''; gNodes.textContent = '';

    var edgeEls = BG_E.map(function () { var e = mk('line', 'cl-edge', gEdges); e.setAttribute('stroke-width', '1.25'); return e; });
    var trailEls = [0, 1, 2, 3, 4].map(function () { var t = mk('line', 'cl-trail', gEdges); t.setAttribute('stroke-opacity', '0'); return t; });
    var nodeEls = BG_V.map(function () { var n = mk('circle', 'cl-node', gNodes); n.setAttribute('r', '2.3'); return n; });
    var focus = mk('circle', 'cl-focus', gNodes);
    var dot = mk('circle', 'cl-dot', gNodes); dot.setAttribute('r', '3.6'); dot.setAttribute('opacity', '0');
    var ringEls = [0, 1, 2].map(function () { var r = mk('circle', 'cl-ring', gRings); r.setAttribute('cx', CX); r.setAttribute('cy', CY); r.setAttribute('opacity', '0'); return r; });

    /* A fixed 6-point route along real edges, chosen once from the starting pose */
    var base = project(BASE_AX, BASE_AY, CX, CY, RAD), route = [], seen = {}, cur = 0, i, j;
    for (i = 1; i < 12; i++) { if (base[i].z > base[cur].z) { cur = i; } }
    route.push(cur); seen[cur] = true;
    while (route.length < 6) {
      var bestN = -1;
      for (j = 0; j < BG_E.length; j++) {
        var other = BG_E[j][0] === cur ? BG_E[j][1] : (BG_E[j][1] === cur ? BG_E[j][0] : -1);
        if (other >= 0 && !seen[other] && (bestN < 0 || base[other].z > base[bestN].z)) { bestN = other; }
      }
      if (bestN < 0) { break; }
      route.push(bestN); seen[bestN] = true; cur = bestN;
    }

    var st = {
      cgx: 0, cgy: 0, rot: 0,
      state: svg.getAttribute('data-state') || 'idle',
      visible: !hasIO, raf: 0, px: 0, py: 0, pointerAt: -99999, tapUntil: 0
    };

    function steer(clientX, clientY) {
      var r = svg.getBoundingClientRect();
      var dx = clientX - (r.left + r.width / 2), dy = clientY - (r.top + r.height / 2);
      var dist = Math.sqrt(dx * dx + dy * dy) || 1, k = Math.min(1, dist / 240);
      st.px = (dx / dist) * k; st.py = (dy / dist) * k;
      st.pointerAt = performance.now();
    }
    window.addEventListener('pointermove', function (e) { if (e.pointerType !== 'touch') { steer(e.clientX, e.clientY); } }, { passive: true });
    window.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') { steer(e.clientX, e.clientY); st.tapUntil = performance.now() + 1600; } }, { passive: true });

    function draw(ax, ay, t, speaking, askingPulse) {
      var P = project(ax, ay, CX, CY, RAD), best = 0, n;
      for (n = 1; n < 12; n++) { if (P[n].z > P[best].z) { best = n; } }
      BG_E.forEach(function (e, k) {
        var a = P[e[0]], b = P[e[1]], el = edgeEls[k], o = depth(a.z, b.z, 0.25, 0.95);
        if (speaking) { o = Math.min(1, o + 0.18 * Math.sin(t * 10 + k * 0.7)); }
        el.setAttribute('x1', a.x.toFixed(1)); el.setAttribute('y1', a.y.toFixed(1));
        el.setAttribute('x2', b.x.toFixed(1)); el.setAttribute('y2', b.y.toFixed(1));
        el.setAttribute('stroke-opacity', o.toFixed(2));
      });
      P.forEach(function (p, k) {
        nodeEls[k].setAttribute('cx', p.x.toFixed(1)); nodeEls[k].setAttribute('cy', p.y.toFixed(1));
        nodeEls[k].setAttribute('fill-opacity', depth(p.z, p.z, 0.4, 1).toFixed(2));
      });
      var f0 = P[best], pr = 8 + (askingPulse ? 3 * Math.sin(t * 6) : 0);
      focus.setAttribute('cx', f0.x.toFixed(1)); focus.setAttribute('cy', f0.y.toFixed(1)); focus.setAttribute('r', pr.toFixed(1));
      return P;
    }

    function frame(now) {
      var t = now / 1000, recent = now - st.pointerAt < 2600 || now < st.tapUntil, gx, gy, s = st.state;
      if (s === 'thinking') { gx = 0.35 + Math.sin(t * 0.8) * 0.1; gy = -0.3; }
      else if (recent) { gx = st.px; gy = st.py; }
      else { gx = Math.sin(t * 0.5) * 0.35; gy = Math.cos(t * 0.4) * 0.2; }
      st.cgx += (gx - st.cgx) * 0.1; st.cgy += (gy - st.cgy) * 0.1;
      st.rot += ((s === 'asking' ? -8 : 0) - st.rot) * 0.12;
      var P = draw(BASE_AX + st.cgy * 0.7, BASE_AY + st.cgx * 0.9 + t * 0.12, t, s === 'speaking', s === 'asking');
      tilt.setAttribute('transform', 'rotate(' + st.rot.toFixed(2) + ' ' + CX + ' ' + CY + ')');

      var k, SEG = 0.9, last = route.length - 1;
      if (s === 'thinking' && last > 0) {
        var cyc = t % (SEG * last + 1.2), seg = Math.min(last - 1, Math.floor(cyc / SEG)), f = cyc >= SEG * last ? 1 : (cyc % SEG) / SEG;
        for (k = 0; k < last; k++) {
          var A = P[route[k]], B = P[route[k + 1]], fr = (k < seg || cyc >= SEG * last) ? 1 : (k === seg ? f : 0);
          trailEls[k].setAttribute('x1', A.x.toFixed(1)); trailEls[k].setAttribute('y1', A.y.toFixed(1));
          trailEls[k].setAttribute('x2', (A.x + (B.x - A.x) * fr).toFixed(1)); trailEls[k].setAttribute('y2', (A.y + (B.y - A.y) * fr).toFixed(1));
          trailEls[k].setAttribute('stroke-opacity', fr > 0 ? '0.9' : '0');
        }
        var c0 = cyc >= SEG * last ? last : seg, A0 = P[route[c0]], B0 = P[route[Math.min(last, c0 + 1)]], ff = cyc >= SEG * last ? 0 : f;
        dot.setAttribute('cx', (A0.x + (B0.x - A0.x) * ff).toFixed(1)); dot.setAttribute('cy', (A0.y + (B0.y - A0.y) * ff).toFixed(1)); dot.setAttribute('opacity', '1');
      } else {
        for (k = 0; k < trailEls.length; k++) { trailEls[k].setAttribute('stroke-opacity', '0'); }
        dot.setAttribute('opacity', '0');
      }

      var emit = s === 'speaking' ? 0.55 : (s === 'asking' ? 1.8 : 0);
      for (k = 0; k < ringEls.length; k++) {
        if (!emit) { ringEls[k].setAttribute('opacity', '0'); continue; }
        var age = ((t - k * emit) % (emit * 3)) / (emit * 3);
        ringEls[k].setAttribute('r', (78 + age * 30).toFixed(1));
        ringEls[k].setAttribute('opacity', ((1 - age) * (s === 'speaking' ? 0.55 : 0.35)).toFixed(2));
      }
      st.raf = (st.visible && !reduced.matches) ? requestAnimationFrame(frame) : 0;
    }

    function start() { if (!st.raf && st.visible && !reduced.matches) { st.raf = requestAnimationFrame(frame); } }

    svg.xfnlSetState = function (s) { st.state = s; svg.setAttribute('data-state', s); start(); };

    draw(BASE_AX, BASE_AY, 0, false, false);
    if (hasIO) {
      new IntersectionObserver(function (entries) { st.visible = entries[0].isIntersecting; if (st.visible) { start(); } }, { threshold: 0.1 }).observe(svg);
    }
    start();
  }

  /* ---------- 3) Scroll demo ---------- */
  function initDemo(root) {
    var svg = root.querySelector('.cl-rig');
    var msgs = [].slice.call(root.querySelectorAll('.cl-msg'));
    var lanes = [].slice.call(root.querySelectorAll('.cl-lane'));
    var cta = root.querySelector('.cl-cta');
    var track = root.querySelector('.cl-demo-track');
    if (reduced.matches || !track || !msgs.length) { return; }

    root.classList.add('cl-js');
    var N = msgs.length;
    var lastStep = -1, ticking = false;

    function apply(step) {
      if (step === lastStep) { return; }
      lastStep = step;
      msgs.forEach(function (m, i) { m.classList.toggle('is-on', i < step); });
      lanes.forEach(function (l) { l.classList.toggle('is-on', Number(l.getAttribute('data-step')) <= step); });
      if (cta) { cta.classList.toggle('is-on', step >= N); }
      var s = step === 0 ? 'idle' : (msgs[step - 1].getAttribute('data-state') || 'idle');
      if (svg && svg.xfnlSetState) { svg.xfnlSetState(s); }
    }

    function update() {
      ticking = false;
      var r = track.getBoundingClientRect();
      var total = r.height - window.innerHeight;
      if (total <= 0) { apply(N); return; }
      var p = Math.max(0, Math.min(1, -r.top / total));
      apply(Math.min(N, Math.floor(p * (N + 1))));
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* ---------- 4) Count-up and reveal ---------- */
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function initCounts(root) {
    if (reduced.matches || !hasIO) { return; }
    var els = root.querySelectorAll('.stat-num');
    [].forEach.call(els, function (el) {
      if (el.getAttribute('data-cu')) { return; }
      var full = el.textContent;
      var m = full.match(/^(~?)(\d+(?:\.\d+)?)(.*)$/);
      if (!m) { return; }
      el.setAttribute('data-cu', '1');
      var target = parseFloat(m[2]);
      var dec = (m[2].split('.')[1] || '').length;
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) { return; }
        io.disconnect();
        var start = performance.now();
        (function tick(now) {
          var p = Math.min(1, (now - start) / 1200);
          el.textContent = m[1] + (target * ease(p)).toFixed(dec) + m[3];
          if (p < 1) { requestAnimationFrame(tick); } else { el.textContent = full; }
        })(start);
      }, { threshold: 0.6 });
      io.observe(el);
    });
  }

  function initReveal() {
    if (reduced.matches || !hasIO) { return; }
    var items = document.querySelectorAll('.hero > *, main > .sec');
    if (!items.length) { return; }
    document.documentElement.classList.add('reveal-js');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.08 });
    [].forEach.call(items, function (el) { el.classList.add('reveal'); io.observe(el); });
  }

  /* ---------- Boot ---------- */
  var figs = document.querySelectorAll('[data-dg]');
  for (var i = 0; i < figs.length; i++) { initFigure(figs[i]); }
  var rigs = document.querySelectorAll('.cl-rig');
  for (var j = 0; j < rigs.length; j++) { initClarity(rigs[j]); }
  var demos = document.querySelectorAll('[data-clarity-demo]');
  for (var k = 0; k < demos.length; k++) { initDemo(demos[k]); }

  var results = document.getElementById('cms-results');
  if (results) {
    initCounts(results);
    if ('MutationObserver' in window) {
      new MutationObserver(function () { initCounts(results); }).observe(results, { childList: true });
    }
  }
  initReveal();
})();
