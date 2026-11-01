/* xfnl.studio v2 behavior. No dependencies, no inline styles.
   1) Diagram figures play only on screen, with a visible pause button.
   2) Clarity's eyes follow the pointer (mouse and pen) or a tap (touch), with a calm idle drift.
   3) The scroll demo reveals one chat message per scroll step and drives Clarity's state.
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

  /* ---------- 2) Clarity rig ---------- */
  var MAX_X = 6, MAX_Y = 14;
  var MOUTH = { x0: 168, x1: 232, y: 288, points: 22 };

  function initClarity(svg) {
    var look = svg.querySelector('.cl-look');
    var mouth = svg.querySelector('.cl-mouth');
    var st = {
      x: 0, y: 0, tx: 0, ty: 0, amp: 0, t: 0,
      state: svg.getAttribute('data-state') || 'idle',
      visible: !hasIO, raf: 0, pointerAt: -99999, tapUntil: 0
    };

    function setLook(clientX, clientY) {
      var r = svg.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height * 0.55;
      var dx = clientX - cx, dy = clientY - cy;
      var dist = Math.sqrt(dx * dx + dy * dy) || 1;
      var k = Math.min(1, dist / 280);
      st.tx = (dx / dist) * MAX_X * k;
      st.ty = (dy / dist) * MAX_Y * k;
      st.pointerAt = performance.now();
    }

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') { return; }
      setLook(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'touch') { return; }
      setLook(e.clientX, e.clientY);
      st.tapUntil = performance.now() + 1400;
    }, { passive: true });

    function mouthPath(t) {
      var d = '';
      for (var i = 0; i <= MOUTH.points; i++) {
        var u = i / MOUTH.points;
        var x = MOUTH.x0 + (MOUTH.x1 - MOUTH.x0) * u;
        var wave = 0.6 * Math.sin(u * Math.PI * 3 + t * 12) + 0.4 * Math.sin(u * Math.PI * 6 + t * 7);
        var edge = Math.sin(u * Math.PI);
        var y = MOUTH.y + st.amp * 7 * wave * edge;
        d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
      }
      return d;
    }

    function frame(now) {
      st.t = now / 1000;
      var recent = now - st.pointerAt < 2600;
      var tapping = now < st.tapUntil;
      var gx = 0, gy = 0;

      if (st.state === 'thinking') {
        gx = 5 + Math.sin(st.t * 0.9) * 1.2;
        gy = -12 + Math.cos(st.t * 0.7) * 1.5;
      } else if (recent || tapping) {
        gx = st.tx; gy = st.ty;
      } else if (st.state === 'asking') {
        gx = -2; gy = 3;
      } else {
        gx = Math.sin(st.t * 0.6) * 2.5;
        gy = Math.cos(st.t * 0.45) * 4;
      }

      st.x += (gx - st.x) * 0.14;
      st.y += (gy - st.y) * 0.14;
      if (look) { look.setAttribute('transform', 'translate(' + st.x.toFixed(2) + ' ' + st.y.toFixed(2) + ')'); }

      var targetAmp = st.state === 'speaking' ? 1 : 0;
      st.amp += (targetAmp - st.amp) * 0.18;
      if (mouth) { mouth.setAttribute('d', mouthPath(st.t)); }

      st.raf = (st.visible && !reduced.matches) ? requestAnimationFrame(frame) : 0;
    }

    function start() {
      if (!st.raf && st.visible && !reduced.matches) { st.raf = requestAnimationFrame(frame); }
    }

    svg.xfnlSetState = function (s) {
      st.state = s;
      svg.setAttribute('data-state', s);
      start();
    };

    if (mouth) { mouth.setAttribute('d', mouthPath(0)); }
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        st.visible = entries[0].isIntersecting;
        if (st.visible) { start(); }
      }, { threshold: 0.1 }).observe(svg);
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

  /* ---------- Boot ---------- */
  var figs = document.querySelectorAll('[data-dg]');
  for (var i = 0; i < figs.length; i++) { initFigure(figs[i]); }
  var rigs = document.querySelectorAll('.cl-rig');
  for (var j = 0; j < rigs.length; j++) { initClarity(rigs[j]); }
  var demos = document.querySelectorAll('[data-clarity-demo]');
  for (var k = 0; k < demos.length; k++) { initDemo(demos[k]); }
})();
