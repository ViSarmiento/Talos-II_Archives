/* Talos-II Archives loading screen: an inverted pyramid with a "fluctlight" inside.
   Dependency-free (plain canvas 2D, own 3D projection). Loaded synchronously in <head> so the page never flashes.
   Tune the look in CFG below. Force it with ?loader=1 . */
(function () {
  if (window.__fl) return; window.__fl = 1;

  var CFG = {
    gold: [255, 210, 31],        // site signal gold
    goldHi: [255, 232, 150],     // hot core
    goldLo: [176, 126, 36],      // deep gold
    firstMs: 3400,               // minimum time on the first page of a visit
    nextMs: 1100,                 // minimum time on later pages
    maxMs: 10000,                // never block longer than this
    breathSec: 6.2,              // one breath in+out
    spin: 1.0,                  // rad/s: rotation speed of the pyramid only (was 0.3); timings below are unchanged
    particles: 620,
    speed: 0.74                  // global animation speed (1 = original)
  };

  var reduce = false, first = true;
  try { reduce = matchMedia('(prefers-reduced-motion:reduce)').matches } catch (e) {}
  try { first = !sessionStorage.getItem('et.fl') } catch (e) {}
  if (/[?&]loader=1/.test(location.search)) first = true;
  var NAMES = { '/': 'Home', '/index': 'Home', '/account': 'Account', '/operators': 'Operators', '/team': 'Team Builder' };
  function pageName(path) { path = String(path || '/').replace(/\.html$/, '').replace(/(.)\/$/, '$1'); return NAMES[path] || (/^\/operators\/[^/]+$/.test(path) ? 'Operators' : 'Archives') }
  var PN = pageName(location.pathname);
  var MIN = reduce ? 500 : (first ? CFG.firstMs : CFG.nextMs);

  /* ---------- DOM ---------- */
  var css = document.createElement('style');
  css.textContent =
    '#ldr{position:fixed;inset:0;z-index:99999;overflow:hidden;background:radial-gradient(ellipse at 50% 46%,#2b2c30 0%,#1b1c1f 42%,#0c0c0e 100%);transition:opacity .75s ease,visibility .75s;touch-action:none}' +
    '#ldr.out{opacity:0;visibility:hidden;pointer-events:none}' +
    '#ldr canvas{position:absolute;inset:0;width:100%;height:100%;display:block}' +
    '#ldr .fl-ui{position:absolute;left:0;right:0;bottom:clamp(28px,7vh,64px);display:flex;flex-direction:column;align-items:center;gap:12px;font:500 12px/1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.2em;text-transform:uppercase;color:#b39a55}' +
    '#ldr .fl-ui b{font:700 13px/1 "Chakra Petch",system-ui,sans-serif;letter-spacing:.34em;color:#ffd21f}' +
    '#ldr .fl-bar{width:min(260px,64vw);height:2px;background:#3a3b40;position:relative;overflow:hidden}' +
    '#ldr .fl-bar i{position:absolute;inset:0;transform-origin:0 50%;transform:scaleX(0);background:linear-gradient(90deg,#b07e24,#ffd21f 70%,#fff0b0);box-shadow:0 0 10px rgba(255,210,31,.7)}' +
    '#ldr .fl-t{position:absolute;top:clamp(18px,4vh,34px);left:clamp(18px,4vw,40px);right:clamp(18px,4vw,40px);display:flex;justify-content:space-between;font:500 11px/1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.2em;text-transform:uppercase;color:#6d6a5c}' +
    '#ldr .fl-t span:first-child{color:#a38a43}' +
    '@media(prefers-reduced-motion:reduce){#ldr{transition-duration:.01s}}';
  document.documentElement.appendChild(css);

  var root = document.createElement('div');
  root.id = 'ldr'; root.setAttribute('role', 'status'); root.setAttribute('aria-label', 'Loading Talos-II Archives');
  root.innerHTML = '<canvas></canvas><div class="fl-t"><span>Talos-II Archives</span></div>' +
    '<div class="fl-ui"><b>' + (first ? 'SYNCING CORE' : 'SYNCING TO ' + PN.toUpperCase()) + '</b><div class="fl-bar"><i></i></div><span class="fl-p">0%</span></div>';
  document.documentElement.appendChild(root);
  var cv = root.querySelector('canvas'), ctx = cv.getContext('2d');
  var bar = root.querySelector('.fl-bar i'), pct = root.querySelector('.fl-p'), lab = root.querySelector('.fl-ui b');

  /* ---------- helpers ---------- */
  var G = CFG.gold, GH = CFG.goldHi, GL = CFG.goldLo;
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')' }
  function sstep(a, b, x) { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x) }
  var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }

  var W = 0, H = 0, DPR = 1, S = 100, CX = 0, CY = 0;
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    S = Math.min(W * 0.25, H * 0.215);
    CX = W / 2; CY = H * 0.455;
  }
  resize(); addEventListener('resize', resize);

  /* soft glow sprite (one gradient, drawn many times) */
  var spr = document.createElement('canvas'); spr.width = spr.height = 64;
  (function () {
    var c = spr.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, rgba(GH, 1)); g.addColorStop(.18, rgba(G, .75)); g.addColorStop(.5, rgba(G, .16)); g.addColorStop(1, rgba(G, 0));
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  })();

  /* ---------- geometry: inverted square pyramid, flat face up, point down ---------- */
  var T = 0.92, A = -1.22, HW = 0.98;                 // top y, apex y, top half-width
  function hw(y) { return HW * (y - A) / (T - A) }    // half-width at height y
  function corner(k, y, k2) { // k = 0..3 square corner at height y
    var a = Math.PI / 4 + k * Math.PI / 2, r = hw(y) * Math.SQRT2 * (k2 || 1);
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  }
  var TOP = [0, 1, 2, 3].map(function (k) { return corner(k, T) });
  var APX = [0, A, 0];

  /* ---------- camera ---------- */
  var yaw = 0, PITCH = 0.36, D = 5.2, breath = 0, bob = 0, sc = 1;
  function proj(p, extraYaw, k) {
    var x = p[0] * sc * (k || 1), y = p[1] * sc * (k || 1), z = p[2] * sc * (k || 1);
    var a = yaw + (extraYaw || 0), ca = Math.cos(a), sa = Math.sin(a);
    var x1 = x * ca - z * sa, z1 = x * sa + z * ca;
    var cp = Math.cos(PITCH), sp = Math.sin(PITCH);
    var y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
    var f = D / (D - z2);
    return [CX + x1 * f * S, CY - (y2 + bob) * f * S, z2, f];
  }

  /* wobble used for the speaking fluctuation: smooth pseudo-noise, no allocation churn */
  function wob(seedv, s, t, amp, out) {
    out[0] = Math.sin(s * 9.1 + t * 7.3 + seedv) * Math.cos(s * 4.7 - t * 5.1 + seedv * 1.7) * amp;
    out[1] = Math.sin(s * 7.7 - t * 6.1 + seedv * 2.3) * Math.cos(s * 5.3 + t * 4.4 + seedv) * amp;
    out[2] = Math.cos(s * 8.3 + t * 5.7 + seedv * 0.6) * Math.sin(s * 6.1 - t * 6.9 + seedv * 1.3) * amp;
  }
  var wv = [0, 0, 0];

  /* ---------- the "voice": simulated speech envelope that drives the fluctuation ---------- */
  var env = 0;
  function voice(t) {
    var ph = t % 5.4;
    var gate = sstep(0.05, 0.25, ph) * (1 - sstep(3.0, 3.35, ph));
    var syl = 0.5 + 0.5 * Math.sin(t * 11 + Math.sin(t * 3.3) * 2.3); syl *= syl;
    var j = 0.62 + 0.38 * Math.sin(t * 23.7) * Math.sin(t * 7.9);
    return gate * syl * j;
  }

  /* ---------- flowing light inside ---------- */
  var N = (W < 640 ? 0.6 : 1) * CFG.particles | 0, P = [];
  for (var i = 0; i < N; i++) P.push(spawn({}, true));
  function spawn(p, init) {
    p.h = init ? rnd() : 1;               // 1 = top face, 0 = apex
    p.th = rnd() * Math.PI * 2;           // angle around the axis
    p.rho = Math.pow(rnd(), 0.6) * 0.96;  // fraction of the local cross-section
    p.v = 0.05 + rnd() * 0.12;            // downward flow speed
    p.sw = (rnd() < .5 ? -1 : 1) * (0.25 + rnd() * 0.7); // swirl
    p.ph = rnd() * 6.28;
    p.sz = 0.5 + rnd() * rnd() * 2.2;
    p.b = 0.35 + rnd() * 0.65;
    return p;
  }

  /* ---------- ripples (one is emitted at every loud syllable) ---------- */
  var ripples = [], lastRip = -9, wasLoud = false;

  /* ---------- progress ---------- */
  var t0 = performance.now(), loaded = false, shown = 0, finishing = 0, done = false;
  var winLoaded = document.readyState === 'complete', holds = 0;
  addEventListener('load', function () { winLoaded = true });
  /* pages call FL.wait(promise) for content that must be on screen before the loader leaves (e.g. the art in view) */
  window.FL = { wait: function (p) { holds++; var d = function () { holds-- }; Promise.resolve(p).then(d, d) } };

  function finish() {
    if (done) return; done = true;
    try { sessionStorage.setItem('et.fl', '1') } catch (e) {}
    window.__flDone = true;
    root.classList.add('out');
    document.documentElement.classList.add('fl-done');
    var rail = document.getElementById('rail'); // replay the sidebar slide-in that ran hidden behind the loader
    if (rail && rail.style.animation !== 'none') { rail.style.animation = 'none'; void rail.offsetWidth; rail.style.animation = '' }
    try { dispatchEvent(new Event('fl:done')) } catch (e) {}
    setTimeout(function () { if (root.parentNode) root.parentNode.removeChild(root); if (css.parentNode) css.parentNode.removeChild(css) }, 900);
  }

  /* ---------- draw ---------- */
  var last = performance.now(), T0 = last;
  function frame(now) {
    if (done && finishing > 1.2) return;
    var rdt = Math.min(0.05, (now - last) / 1000); last = now;
    var dt = rdt * CFG.speed;
    var t = reduce ? 1.6 : (now - T0) / 1000 * CFG.speed;
    var el = now - t0;

    /* progress: eases to 92% while loading, to 100% once the page has loaded and the minimum time passed */
    loaded = winLoaded && holds === 0 && !!window.__flReady;
    if (el > CFG.maxMs) loaded = true;
    var want = loaded ? 1 : 0.92 * (1 - Math.exp(-el / 1700));
    want = Math.min(want, el / MIN);
    shown += (want - shown) * Math.min(1, rdt * 3.2);
    var pr = Math.min(1, shown);
    bar.style.transform = 'scaleX(' + pr + ')';
    pct.textContent = Math.round(pr * 100) + '%';
    if (pr > 0.985 && !finishing) { finishing = 0.001; if (first) lab.textContent = 'WELCOME ENDMINISTRATOR'; }
    if (finishing) { finishing += rdt; if (finishing > (first ? 1.1 : 0.5) && !done) finish(); }

    /* breathing + voice */
    var br = Math.sin(t * 6.2832 / CFG.breathSec - 1.2);            // -1..1
    breath = br * 0.5 + 0.5;                                          // 0..1
    var target = reduce ? 0 : voice(t);
    if (finishing) target = Math.max(target, Math.min(1, finishing * 3));   // final surge
    env += (target - env) * Math.min(1, dt * (target > env ? 22 : 7));
    sc = 1 + (br * 0.032) + env * 0.018;
    bob = reduce ? 0 : Math.sin(t * 0.9) * 0.035;
    if (!reduce) yaw += dt * CFG.spin; else yaw = 0.5;

    var loud = env > 0.62;
    if (loud && !wasLoud && t - lastRip > 0.55) { ripples.push(t); lastRip = t; if (ripples.length > 5) ripples.shift() }
    wasLoud = loud;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    /* faint floor grid + vertical tick marks (site HUD feel) */
    var gy = CY + S * 1.58;
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(255,210,31,.045)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var gx = -6; gx <= 6; gx++) { ctx.moveTo(CX + gx * S * 0.55, gy - S * 0.06); ctx.lineTo(CX + gx * S * 1.0, gy + S * 0.9) }
    for (var gz = 0; gz < 5; gz++) { var yy = gy + Math.pow(gz / 4, 1.7) * S * 0.9; ctx.moveTo(0, yy); ctx.lineTo(W, yy) }
    ctx.stroke();

    /* big breathing aura behind everything */
    var gcx = CX, gcy = CY - S * 0.12, gr = S * (1.9 + breath * 0.28 + env * 0.25);
    var ag = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, gr);
    var ga = 0.11 + breath * 0.07 + env * 0.1 + pr * 0.04;
    ag.addColorStop(0, rgba(G, ga)); ag.addColorStop(.45, rgba(GL, ga * 0.38)); ag.addColorStop(1, rgba(GL, 0));
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = ag; ctx.fillRect(gcx - gr, gcy - gr, gr * 2, gr * 2);

    /* ripples on the "water" under the apex */
    for (var r = 0; r < ripples.length; r++) {
      var age = t - ripples[r]; if (age > 2.6) continue;
      var k = age / 2.6, rad = 0.35 + k * 2.1, a = (1 - k) * (1 - k) * 0.42;
      var q = [];
      for (var c = 0; c < 4; c++) { var an = Math.PI / 4 + c * Math.PI / 2; q.push(proj([Math.cos(an) * rad * Math.SQRT2 * 0.72, A - 0.34, Math.sin(an) * rad * Math.SQRT2 * 0.72], 0, 1)) }
      ctx.strokeStyle = rgba(G, a); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); for (c = 1; c < 4; c++) ctx.lineTo(q[c][0], q[c][1]); ctx.closePath(); ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';

    /* --- shell faces, far to near --- */
    var faces = [];
    for (var k2 = 0; k2 < 4; k2++) {
      var c0 = TOP[k2], c1 = TOP[(k2 + 1) & 3];
      var pa = proj(c0), pb = proj(c1), pc = proj(APX);
      var nx = Math.cos(Math.PI / 2 + k2 * Math.PI / 2 + yaw + 0.0), nz = Math.sin(Math.PI / 2 + k2 * Math.PI / 2 + yaw);
      faces.push({ i: k2, z: (pa[2] + pb[2] + pc[2]) / 3, pts: [pa, pb, pc] });
    }
    faces.sort(function (a, b) { return a.z - b.z });

    /* inner nested core (counter-rotated, brighter), drawn first so the shell glass sits over it */
    var CORE = 0.52;
    drawPyramid(CORE, -0.55, t, 0.5, true);

    for (var f = 0; f < faces.length; f++) {
      var fc = faces[f], depth = (fc.z / (T * 1.4) + 1) / 2; // ~0 far .. 1 near
      var g = ctx.createLinearGradient(fc.pts[0][0], fc.pts[0][1], fc.pts[2][0], fc.pts[2][1]);
      var near = Math.max(0, Math.min(1, depth));
      g.addColorStop(0, 'rgba(' + (88 + near * 40 | 0) + ',' + (80 + near * 34 | 0) + ',' + (60 + near * 14 | 0) + ',' + (0.17 + near * 0.12 + env * 0.05) + ')');
      g.addColorStop(1, rgba(G, 0.05 + near * 0.08 + breath * 0.05 + env * 0.08));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(fc.pts[0][0], fc.pts[0][1]); ctx.lineTo(fc.pts[1][0], fc.pts[1][1]); ctx.lineTo(fc.pts[2][0], fc.pts[2][1]); ctx.closePath(); ctx.fill();
    }

    /* top face (flat plate) */
    var tp = TOP.map(function (p) { return proj(p) });
    var tg = ctx.createRadialGradient(CX, tp[0][1] * 0.5 + tp[2][1] * 0.5, 0, CX, tp[0][1] * 0.5 + tp[2][1] * 0.5, S * 1.1);
    tg.addColorStop(0, rgba(G, 0.2 + breath * 0.1 + env * 0.12)); tg.addColorStop(1, rgba([70, 66, 52], 0.12));
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.moveTo(tp[0][0], tp[0][1]); for (var q2 = 1; q2 < 4; q2++) ctx.lineTo(tp[q2][0], tp[q2][1]); ctx.closePath(); ctx.fill();

    /* --- flowing light (fluctlight) --- */
    ctx.globalCompositeOperation = 'lighter';
    var flow = reduce ? 0 : 1;
    for (var n = 0; n < P.length; n++) {
      var p = P[n];
      p.h -= p.v * dt * flow * (0.85 + breath * 0.35 + env * 0.7);
      if (p.h <= 0.015) { spawn(p, false); }
      var y = A + (T - A) * p.h;
      var wid = hw(y);
      var th = p.th + p.sw * (t * 0.5) + (1 - p.h) * 3.2 * Math.sign(p.sw);
      var sq = Math.max(Math.abs(Math.cos(th)), Math.abs(Math.sin(th)));
      var jit = env * 0.07 + 0.012;
      var rr = p.rho * (wid / sq) * (1 + Math.sin(t * 1.3 + p.ph) * 0.035 + (breath - 0.5) * 0.05);
      var px = Math.cos(th) * rr + Math.sin(t * 9 * (1 + p.sz) + p.ph) * jit * wid;
      var pz = Math.sin(th) * rr + Math.cos(t * 8 * (1 + p.sz) + p.ph * 2) * jit * wid;
      var py = y + Math.sin(t * 7 + p.ph * 3) * jit * 0.6;
      var pp = proj([px, py, pz]);
      /* brighter toward the apex and toward the axis, like light pooling in the point */
      var a2 = p.b * (0.28 + (1 - p.h) * 0.5 + (1 - p.rho) * 0.25) * (0.7 + breath * 0.35 + env * 0.55);
      a2 *= sstep(0, 0.1, p.h) * (0.55 + 0.45 * pp[3] / 1.15);
      var sz = (p.sz * 3.2 + 2) * S / 120 * pp[3] * (1 + env * 0.35);
      ctx.globalAlpha = Math.min(1, a2);
      ctx.drawImage(spr, pp[0] - sz, pp[1] - sz, sz * 2, sz * 2);
    }
    ctx.globalAlpha = 1;

    /* hot heart: where the light gathers */
    var hp = proj([0, -0.55, 0]), hr = S * (0.55 + breath * 0.12 + env * 0.22 + (finishing ? finishing * 2.2 : 0));
    var hg = ctx.createRadialGradient(hp[0], hp[1], 0, hp[0], hp[1], hr);
    var ha = 0.35 + breath * 0.18 + env * 0.3 + pr * 0.1;
    hg.addColorStop(0, rgba(GH, Math.min(1, ha))); hg.addColorStop(.3, rgba(G, ha * 0.45)); hg.addColorStop(1, rgba(G, 0));
    ctx.fillStyle = hg; ctx.fillRect(hp[0] - hr, hp[1] - hr, hr * 2, hr * 2);

    ctx.globalCompositeOperation = 'source-over';

    /* --- shell wireframe on top --- */
    drawShell(t);

    requestAnimationFrame(frame);
  }

  /* a polyline between two 3D points with speech-driven wobble, drawn twice (glow + core) */
  function edge(a, b, seedv, t, ext, amp, segs) {
    segs = segs || 14; ext = ext || 0;
    var pts = [];
    for (var s = 0; s <= segs; s++) {
      var u = s / segs, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u, z = a[2] + (b[2] - a[2]) * u;
      var fade = Math.sin(u * Math.PI);                     // pinned at the corners
      wob(seedv, u * 0.55, t * 0.8, amp * fade, wv);
      pts.push(proj([x + wv[0], y + wv[1], z + wv[2]], ext));
    }
    return pts;
  }
  function stroke(pts, w, col) {
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }

  function drawShell(t) {
    var amp = 0.004 + env * 0.06;
    var glowA = 0.2 + breath * 0.12 + env * 0.25;
    var coreA = 0.72 + breath * 0.2 + env * 0.1;
    var edges = [];
    for (var k = 0; k < 4; k++) {
      edges.push([TOP[k], APX, k * 1.7]);                 // sloped seams
      edges.push([TOP[k], TOP[(k + 1) & 3], 9 + k * 2.1]); // top rim
    }
    /* stratified bands (crystal growth lines) at a few heights */
    var bands = [0.45, -0.05, -0.55, -0.92];
    for (var b = 0; b < bands.length; b++) {
      for (var k3 = 0; k3 < 4; k3++) edges.push([corner(k3, bands[b]), corner((k3 + 1) & 3, bands[b]), 20 + b * 3 + k3 * 0.9, bands[b] === 0.45 ? 0.7 : 0.4]);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (var e = 0; e < edges.length; e++) {
      var ed = edges[e], isBand = ed[3] !== undefined, mul = isBand ? ed[3] : 1;
      var pts = edge(ed[0], ed[1], ed[2], t, 0, amp * (isBand ? 1.2 : 1), isBand ? 10 : 16);
      var zavg = (pts[0][2] + pts[pts.length - 1][2]) / 2, near = Math.max(0.35, Math.min(1, (zavg / 1.3 + 1) / 1.6 + 0.2));
      stroke(pts, 5.5, rgba(G, glowA * 0.35 * mul * near));
      stroke(pts, isBand ? 1 : 1.6, rgba(isBand ? G : GH, coreA * mul * near * (isBand ? 0.7 : 0.95)));
    }
    /* floating thin frame above the flat face: a quiet nod to the reference's halo, counter-rotating */
    var rad = 1.32, ringY = T + 0.38 + Math.sin(t * 1.1) * 0.025 + breath * 0.03, rp = [];
    for (var c = 0; c < 4; c++) { var an = Math.PI / 4 + c * Math.PI / 2; rp.push([Math.cos(an) * rad, ringY, Math.sin(an) * rad]) }
    for (var c2 = 0; c2 < 4; c2++) {
      var pts2 = edge(rp[c2], rp[(c2 + 1) & 3], 40 + c2, t, -yaw * 1.9, amp * 0.6, 8);
      stroke(pts2, 1, rgba(G, 0.28 + breath * 0.18 + env * 0.2));
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* nested core pyramid */
  function drawPyramid(k, cy, t, alpha, solid) {
    var topY = T * k + cy * 0.0, apY = A * k - 0.05;
    var w2 = HW * k;
    var tc = [], a0 = [0, apY, 0];
    for (var i = 0; i < 4; i++) { var an = Math.PI / 4 + i * Math.PI / 2; tc.push([Math.cos(an) * w2 * Math.SQRT2, topY, Math.sin(an) * w2 * Math.SQRT2]) }
    var ex = t * 0.35;                           // slow drift against the shell so the facets slide past one another
    var P0 = tc.map(function (p) { return proj(p, ex) }), PA = proj(a0, ex);
    ctx.globalCompositeOperation = 'lighter';
    for (var f = 0; f < 4; f++) {
      var g = ctx.createLinearGradient(P0[f][0], P0[f][1], PA[0], PA[1]);
      g.addColorStop(0, rgba(G, (0.03 + breath * 0.04 + env * 0.05) * alpha * 2));
      g.addColorStop(1, rgba(GH, (0.14 + breath * 0.1 + env * 0.14) * alpha * 2));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(P0[f][0], P0[f][1]); ctx.lineTo(P0[(f + 1) & 3][0], P0[(f + 1) & 3][1]); ctx.lineTo(PA[0], PA[1]); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = rgba(GH, 0.3 + breath * 0.2 + env * 0.25); ctx.lineWidth = 1;
    ctx.beginPath();
    for (var e = 0; e < 4; e++) { ctx.moveTo(P0[e][0], P0[e][1]); ctx.lineTo(PA[0], PA[1]); ctx.moveTo(P0[e][0], P0[e][1]); ctx.lineTo(P0[(e + 1) & 3][0], P0[(e + 1) & 3][1]) }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  requestAnimationFrame(frame);
  window.__flReady = false;
  addEventListener('DOMContentLoaded', function () { setTimeout(function () { window.__flReady = true }, 0) });
  /* hard safety net if rAF is throttled (background tab): never leave the page covered */
  setTimeout(function () { if (!done) finish() }, CFG.maxMs + 4000);

  /* ---------- leaving a page: cover the old page at once so nothing of it (or the next page) shows bare ---------- */
  var out = null;
  function leave(href) {
    if (out) return;
    var nm = pageName(new URL(href, location.href).pathname);
    out = document.createElement('div');
    out.id = 'ldr-out';
    out.setAttribute('aria-hidden', 'true');
    out.style.cssText = 'position:fixed;inset:0;z-index:99998;opacity:0;transition:opacity .22s ease;pointer-events:all;background:radial-gradient(ellipse at 50% 46%,#2b2c30 0%,#1b1c1f 42%,#0c0c0e 100%);display:flex;align-items:flex-end;justify-content:center;padding-bottom:clamp(28px,7vh,64px);font:700 13px/1 \"Chakra Petch\",system-ui,sans-serif;letter-spacing:.34em;color:#ffd21f';
    out.textContent = 'SYNCING TO ' + nm.toUpperCase();
    document.documentElement.appendChild(out);
    void out.offsetWidth; out.style.opacity = '1';
    try { sessionStorage.setItem('et.fl', '1') } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target || a.hasAttribute('download') || a.origin !== location.origin) return;
    if (a.pathname === location.pathname && a.search === location.search) return;   // same page / hash link: no navigation
    leave(a.href);
  }, true);
  addEventListener('pageshow', function (e) { if (e.persisted && out) { out.remove(); out = null } });
})();
