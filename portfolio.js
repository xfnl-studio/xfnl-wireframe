(function(){
  var root = document.documentElement;
  var saved = localStorage.getItem("xfnl_mode") || "dark";
  root.setAttribute("data-mode", saved);
  var btn = document.getElementById("mode-toggle");
  function syncBtn(){
    if (!btn) return;
    var m = root.getAttribute("data-mode") || "dark";
    btn.textContent = (m === "dark") ? "Light mode" : "Dark mode";
  }
  syncBtn();
  if (btn) {
    btn.addEventListener("click", function(){
      var cur = root.getAttribute("data-mode") === "light" ? "dark" : "light";
      root.setAttribute("data-mode", cur);
      localStorage.setItem("xfnl_mode", cur);
      syncBtn();
    });
  }
  var canvas = document.getElementById("geo-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var w = 0, h = 0, angleX = 0.3, angleY = 0.5, targetX = 0.3, targetY = 0.5;
  function resize(){
    w = canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
    h = canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
  }
  window.addEventListener("resize", resize, {passive: true});
  resize();
  window.addEventListener("mousemove", function(e){
    targetY = (e.clientX / window.innerWidth - 0.5) * 1.2;
    targetX = (e.clientY / window.innerHeight - 0.5) * 1.2;
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
  function tick(){
    ctx.clearRect(0, 0, w, h);
    angleX += (targetX - angleX) * 0.03 + 0.0025;
    angleY += (targetY - angleY) * 0.03 + 0.0035;
    var radius = Math.min(w, h) * 0.27;
    var cx = w * 0.56, cy = h * 0.42;
    var proj = [];
    var cosX = Math.cos(angleX), sinX = Math.sin(angleX);
    var cosY = Math.cos(angleY), sinY = Math.sin(angleY);
    for (var i = 0; i < rawVerts.length; i++) {
      var x = rawVerts[i][0], y = rawVerts[i][1], z = rawVerts[i][2];
      var y1 = y * cosX - z * sinX;
      var z1 = y * sinX + z * cosX;
      var x2 = x * cosY + z1 * sinY;
      var z2 = -x * sinY + z1 * cosY;
      var scale = 4 / (4 + z2 * 0.45);
      proj.push([cx + x2 * radius * scale, cy + y1 * radius * scale, z2]);
    }
    ctx.strokeStyle = "#0066FF";
    ctx.lineWidth = 1.35 * (window.devicePixelRatio || 1);
    for (var e = 0; e < edges.length; e++) {
      var a = proj[edges[e][0]], b = proj[edges[e][1]];
      var depthAlpha = Math.max(0.14, Math.min(0.65, (a[2] + b[2] + 4) / 8));
      ctx.globalAlpha = depthAlpha;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    ctx.fillStyle = "#0066FF";
    for (var p = 0; p < proj.length; p++) {
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.arc(proj[p][0], proj[p][1], 2.6 * (window.devicePixelRatio || 1), 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();