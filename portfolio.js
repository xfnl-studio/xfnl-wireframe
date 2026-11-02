(function(){
  var menuBtn = document.getElementById("menu-toggle");
  var navBar = document.getElementById("primary-nav");
  if (menuBtn && navBar) {
    menuBtn.addEventListener("click", function(){
      var isOpen = navBar.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    var links = navBar.querySelectorAll("a");
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener("click", function(){
        navBar.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
      });
    }
  }

  // Hydrate live from /content.json so Sveltia CMS edits apply immediately
  fetch("/content.json", {cache: "no-store"}).then(function(r){
    return r.ok ? r.json() : null;
  }).then(function(data){
    if (!data) return;
    var page = document.body.getAttribute("data-page") || "home";
    var eb = document.getElementById("cms-eyebrow");
    var ht = document.getElementById("cms-title");
    var hl = document.getElementById("cms-lead");
    if (page === "home" && data.home) {
      if (eb && data.home.eyebrow) eb.textContent = data.home.eyebrow;
      if (ht && data.home.title_html) { ht.innerHTML = data.home.title_html; } else if (ht && data.home.title) { ht.textContent = data.home.title; }
      if (hl && data.home.lead_html) hl.innerHTML = data.home.lead_html;
      var rg = document.getElementById("cms-results");
      if (rg && data.home.results && data.home.results.length) {
        rg.innerHTML = data.home.results.map(function(it){
          return '<div class="stat-card"><h3 class="stat-num">' + it.metric + '</h3><p class="stat-desc">' + it.detail + '</p></div>';
        }).join("");
      }
      var fs = document.getElementById("cms-featured-systems");
      if (fs && data.home.featured_systems && data.home.featured_systems.length) {
        fs.innerHTML = data.home.featured_systems.map(function(it){
          return '<a href="' + it.href + '" class="row-item"><span class="row-tag">' + it.tag + '</span><div><h3 class="row-title">' + it.title + '</h3><p class="row-sub">' + it.subtitle + '</p></div><span class="row-arrow">→</span></a>';
        }).join("");
      }
      var ex = document.getElementById("cms-experiments");
      if (ex && data.home.experiments && data.home.experiments.length) {
        ex.innerHTML = data.home.experiments.map(function(it){
          return '<a href="' + it.href + '" class="exp-card"><h3 class="exp-name"><span>' + it.name + '</span><span class="exp-pill">' + it.badge + '</span></h3><p class="exp-desc">' + it.description + '</p></a>';
        }).join("");
      }
    } else if (page === "systems" && data.systems_page) {
      if (eb && data.systems_page.eyebrow) eb.textContent = data.systems_page.eyebrow;
      if (ht && data.systems_page.title_html) ht.innerHTML = data.systems_page.title_html;
      if (hl && data.systems_page.lead) hl.textContent = data.systems_page.lead;
      var sc = document.getElementById("cms-systems-cases");
      if (sc && data.systems_page.cases && data.systems_page.cases.length) {
        sc.innerHTML = data.systems_page.cases.map(function(c){
          var metaHtml = (c.meta || []).map(function(m){ return '<span>' + m + '</span>'; }).join("");
          var p2Html = c.p2_html ? '<p class="case-body">' + c.p2_html + '</p>' : '';
          var pillsHtml = (c.pills || []).map(function(p){ return '<span class="pill">' + p + '</span>'; }).join("");
          return '<article id="' + c.id + '" class="case-block"><div class="case-meta">' + metaHtml + '</div><div><h2 class="case-title">' + c.title + '</h2><p class="case-body">' + c.p1_html + '</p>' + p2Html + '<div class="pill-row">' + pillsHtml + '</div></div></article>';
        }).join("");
      }
    } else if (page === "experiments" && data.experiments_page) {
      if (eb && data.experiments_page.eyebrow) eb.textContent = data.experiments_page.eyebrow;
      if (ht && data.experiments_page.title_html) ht.innerHTML = data.experiments_page.title_html;
      if (hl && data.experiments_page.lead) hl.textContent = data.experiments_page.lead;
      var ec = document.getElementById("cms-experiments-list");
      if (ec && data.experiments_page.items && data.experiments_page.items.length) {
        ec.innerHTML = data.experiments_page.items.map(function(c){
          var metaHtml = (c.meta || []).map(function(m){ return '<span>' + m + '</span>'; }).join("");
          var p2Html = c.p2_html ? '<p class="case-body">' + c.p2_html + '</p>' : '';
          var pillsHtml = (c.pills || []).map(function(p){ return '<span class="pill">' + p + '</span>'; }).join("");
          return '<article id="' + c.id + '" class="case-block"><div class="case-meta">' + metaHtml + '</div><div><h2 class="case-title">' + c.title + '</h2><p class="case-body">' + c.p1_html + '</p>' + p2Html + '<div class="pill-row">' + pillsHtml + '</div></div></article>';
        }).join("");
      }
    } else if (page === "about" && data.about_page) {
      if (eb && data.about_page.eyebrow) eb.textContent = data.about_page.eyebrow;
      if (ht && data.about_page.title_html) ht.innerHTML = data.about_page.title_html;
      if (hl && data.about_page.lead) hl.textContent = data.about_page.lead;
      var ar = document.getElementById("cms-about-roles");
      if (ar && data.about_page.roles && data.about_page.roles.length) {
        ar.innerHTML = data.about_page.roles.map(function(r){
          return '<div class="row-item"><span class="row-tag">' + r.dates + '</span><div><h3 class="row-title">' + r.company + '</h3><p class="row-sub">' + r.role + '</p></div><span class="row-arrow">' + r.location + '</span></div>';
        }).join("");
      }
    }
  }).catch(function(){});

  // Un-smooshed 1:1 aspect-accurate 3D Icosahedron Wireframe
  var canvas = document.getElementById("geo-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var cssW = 0, cssH = 0, dpr = 1;
  var angleX = 0.3, angleY = 0.5, targetX = 0.3, targetY = 0.5;

  function syncCanvasSize(){
    var rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssW = rect.width || window.innerWidth;
    cssH = rect.height || window.innerHeight;
    var targetBufW = Math.round(cssW * dpr);
    var targetBufH = Math.round(cssH * dpr);
    if (canvas.width !== targetBufW || canvas.height !== targetBufH) {
      canvas.width = targetBufW;
      canvas.height = targetBufH;
    }
  }
  syncCanvasSize();
  if (typeof ResizeObserver !== "undefined") {
    var ro = new ResizeObserver(syncCanvasSize);
    ro.observe(canvas);
  }
  window.addEventListener("resize", syncCanvasSize, {passive: true});
  window.addEventListener("orientationchange", syncCanvasSize, {passive: true});
  window.addEventListener("mousemove", function(e){
    targetY = (e.clientX / window.innerWidth - 0.5) * 1.1;
    targetX = (e.clientY / window.innerHeight - 0.5) * 1.1;
  }, {passive: true});

  var phi = (1 + Math.sqrt(5)) / 2;
  var rawVerts = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
  ];
  var edges = [];
  for (var i = 0; i < rawVerts.length; i++) {
    for (var j = i + 1; j < rawVerts.length; j++) {
      var dx = rawVerts[i][0] - rawVerts[j][0];
      var dy = rawVerts[i][1] - rawVerts[j][1];
      var dz = rawVerts[i][2] - rawVerts[j][2];
      var d = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (d > 1.9 && d < 2.1) edges.push([i, j]);
    }
  }

  var frameCount = 0;
  function tick(){
    frameCount++;
    if (window.innerWidth < 768 && frameCount % 2 === 1 && !document.hidden && !(reduceMotion && reduceMotion.matches)) { requestAnimationFrame(tick); return; }
    syncCanvasSize();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    angleX += (targetX - angleX) * 0.03 + 0.0022;
    angleY += (targetY - angleY) * 0.03 + 0.0032;
    // Uniform radius in CSS pixels so X and Y never stretch or smoosh
    var radius = Math.min(cssW, cssH) * 0.25;
    var cx = cssW * 0.54;
    var cy = cssH * 0.38;
    var proj = [];
    var cosX = Math.cos(angleX), sinX = Math.sin(angleX);
    var cosY = Math.cos(angleY), sinY = Math.sin(angleY);
    for (var i = 0; i < rawVerts.length; i++) {
      var x = rawVerts[i][0], y = rawVerts[i][1], z = rawVerts[i][2];
      var y1 = y * cosX - z * sinX;
      var z1 = y * sinX + z * cosX;
      var x2 = x * cosY + z1 * sinY;
      var z2 = -x * sinY + z1 * cosY;
      var scale = 4 / (4 + z2 * 0.42);
      proj.push([cx + x2 * radius * scale, cy + y1 * radius * scale, z2]);
    }
    ctx.strokeStyle = "#0066FF";
    ctx.lineWidth = 1.25;
    for (var e = 0; e < edges.length; e++) {
      var a = proj[edges[e][0]], b = proj[edges[e][1]];
      var depthAlpha = Math.max(0.14, Math.min(0.62, (a[2] + b[2] + 4) / 8));
      ctx.globalAlpha = depthAlpha;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    ctx.fillStyle = "#0066FF";
    for (var p = 0; p < proj.length; p++) {
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.arc(proj[p][0], proj[p][1], 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!document.hidden && !reduceMotion.matches) { requestAnimationFrame(tick); } else { running = false; }
  }
  var reduceMotion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var running = true;
  requestAnimationFrame(tick);
  document.addEventListener("visibilitychange", function(){
    if (!document.hidden && !running && !reduceMotion.matches) { running = true; requestAnimationFrame(tick); }
  });
})();
