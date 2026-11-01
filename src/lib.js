// ---------- core helpers & 2D drawing primitives ----------
const W = 1080, H = 1920;
const F = "'Inter Display','Inter',sans-serif";
const OL = '#2a1620';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  io: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  o: t => 1 - Math.pow(1 - t, 3),
  o5: t => 1 - Math.pow(1 - t, 5),
  i: t => t * t * t,
  back: t => { const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  el: t => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 9 - 0.75) * (2 * Math.PI) / 3) + 1,
};
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function hex(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
function mix(c1, c2, t) { const a = hex(c1), b = hex(c2); t = clamp(t); return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(',')})`; }
function rgba(c, al) { const a = hex(c); return `rgba(${a.join(',')},${al})`; }

function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, Math.PI * 2); }
function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(.1, r), 0, Math.PI * 2); }
function rrect(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function fs(c, fill, stroke, lw) { if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 6; c.stroke(); } }

// offscreen layer for compositing (chips, cut-outs)
const off = document.createElement('canvas'); off.width = W; off.height = H; const octx = off.getContext('2d');
function layer(c, fn) {
  octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, W, H);
  octx.setTransform(c.getTransform());
  octx.save(); fn(octx); octx.restore();
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(off, 0, 0); c.restore();
}

// ---------- backgrounds ----------
function bg(c, top, bot, t, opt = {}) {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // soft radial glow
  const rg = c.createRadialGradient(W / 2, opt.gy || 820, 50, W / 2, opt.gy || 820, 900);
  rg.addColorStop(0, opt.glow || 'rgba(255,255,255,0.18)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = rg; c.fillRect(0, 0, W, H);
  // floating bokeh
  const r = rng(opt.seed || 7);
  for (let i = 0; i < 26; i++) {
    const x = r() * W, sp = 20 + r() * 50, rad = 8 + r() * 38;
    const y = ((r() * H - t * sp) % H + H) % H;
    circ(c, x + Math.sin(t * .7 + i) * 20, y, rad);
    c.fillStyle = `rgba(255,255,255,${0.03 + r() * 0.07})`; c.fill();
  }
  // diagonal rays
  if (opt.rays) {
    c.save(); c.translate(W / 2, opt.gy || 820); c.rotate(t * 0.15);
    for (let i = 0; i < 12; i++) {
      c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(1400, -120); c.lineTo(1400, 120); c.closePath();
      c.fillStyle = `rgba(255,255,255,${opt.rays})`; c.fill();
    }
    c.restore();
  }
}
function vignette(c, k = 0.55, col = '0,0,0') {
  const g = c.createRadialGradient(W / 2, H / 2, 400, W / 2, H / 2, 1250);
  g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${k})`);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}

// ---------- bacteria ----------
function bug(c, x, y, r, t, col, seed = 0, mood = 1) {
  c.save(); c.translate(x, y); c.rotate(Math.sin(t * 3 + seed) * 0.25);
  const n = 16;
  // cilia
  c.strokeStyle = mix(col, '#000000', .35); c.lineWidth = r * 0.09; c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, w = Math.sin(t * 9 + i + seed) * 0.25;
    c.beginPath(); c.moveTo(Math.cos(a) * r * .95, Math.sin(a) * r * .95);
    c.lineTo(Math.cos(a + w) * r * 1.32, Math.sin(a + w) * r * 1.32); c.stroke();
  }
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2, rr = r * (1 + 0.08 * Math.sin(3 * a + t * 6 + seed) + 0.05 * Math.sin(5 * a - t * 4));
    i ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  c.closePath(); fs(c, col, OL, r * 0.1);
  ell(c, -r * .3, -r * .35, r * .28, r * .16, -0.5); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fill();
  // spots
  circ(c, r * .45, r * .35, r * .12); c.fillStyle = mix(col, '#000000', .25); c.fill();
  // eyes
  for (const sx of [-1, 1]) {
    ell(c, sx * r * .3, -r * .05, r * .22, r * .26); fs(c, '#fff', OL, r * .06);
    circ(c, sx * r * .3 + Math.sin(t * 2 + seed) * r * .06, -r * .02, r * .1); c.fillStyle = OL; c.fill();
    if (mood) { c.beginPath(); c.moveTo(sx * r * .55, -r * .42); c.lineTo(sx * r * .1, -r * .25); c.strokeStyle = OL; c.lineWidth = r * .09; c.stroke(); }
  }
  // grin
  c.beginPath(); c.arc(0, r * .25, r * .3, 0.15 * Math.PI, 0.85 * Math.PI); fs(c, '#5a1020', OL, r * .06);
  for (const tx of [-.12, .12]) { c.beginPath(); c.moveTo(r * tx - r * .06, r * .3); c.lineTo(r * tx, r * .42); c.lineTo(r * tx + r * .06, r * .3); c.fillStyle = '#fff'; c.fill(); }
  c.restore();
}
const BUGC = ['#7bd14b', '#b06be0', '#f2a23a', '#4fc3c9'];

// ---------- toothbrush ----------
function brush(c, x, y, ang, s, o = {}) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  c.lineJoin = 'round';
  rrect(c, -30, -20, 400, 40, 20); fs(c, '#2ec4b6', OL, 6);
  rrect(c, 60, -9, 220, 18, 9); c.fillStyle = '#e8fffb'; c.fill();
  rrect(c, -210, -24, 190, 44, 18); fs(c, '#2ec4b6', OL, 6);
  for (let i = 0; i < 10; i++) {
    const bx = -200 + i * 17;
    rrect(c, bx, -92, 13, 72, 4);
    let col = i % 2 ? '#ffffff' : '#8fd8ff';
    if (o.blood && (i === 2 || i === 5 || i === 7)) col = mix(col, '#e2505f', o.blood * 0.75);
    fs(c, col, OL, 3);
  }
  if (o.paste) {
    c.beginPath(); c.moveTo(-205, -95);
    for (let i = 0; i <= 8; i++) c.quadraticCurveTo(-195 + i * 22, -135 - (i % 2) * 18, -185 + i * 22, -100);
    c.closePath(); fs(c, '#ffffff', '#6ec6ff', 5);
    c.beginPath(); c.moveTo(-190, -112); c.lineTo(-30, -112); c.strokeStyle = '#ff6b8b'; c.lineWidth = 8; c.stroke();
  }
  c.restore();
}

// ---------- front teeth / mouth close-up ----------
const UP = [{ w: 112, h: 150 }, { w: 126, h: 168 }, { w: 152, h: 200 }, { w: 152, h: 200 }, { w: 126, h: 168 }, { w: 112, h: 150 }];
const LO = [{ w: 96, h: 128 }, { w: 102, h: 136 }, { w: 108, h: 140 }, { w: 108, h: 140 }, { w: 102, h: 136 }, { w: 96, h: 128 }];
function rowLayout(arr) { const tot = arr.reduce((a, b) => a + b.w, 0); let x = -tot / 2; return arr.map(t => { const r = { ...t, x: x + t.w / 2 }; x += t.w; return r; }); }
const UPL = rowLayout(UP), LOL = rowLayout(LO);

function toothFront(c, x, y0, w, h, dir, o, i) {
  // dir=1 hangs down from gumline y0; dir=-1 grows up from y0
  c.save();
  c.beginPath();
  if (dir > 0) c.roundRect(x - w / 2 + 4, y0 - 40, w - 8, h + 40, [12, 12, w * 0.32, w * 0.32]);
  else c.roundRect(x - w / 2 + 4, y0 - h, w - 8, h + 40, [w * 0.28, w * 0.28, 12, 12]);
  const path = new Path2D(); // keep for clip
  c.save(); c.clip();
  const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  const base = mix('#ffffff', '#e2c879', o.stain * 0.85), sh = mix('#e3ecf1', '#c6a75a', o.stain * 0.85);
  g.addColorStop(0, sh); g.addColorStop(0.35, base); g.addColorStop(1, sh);
  c.fillStyle = g; c.fillRect(x - w, y0 - h - 60, w * 2, h * 2 + 120);
  // stain streaks
  if (o.stain > 0.05) {
    const r = rng(i * 13 + 5);
    for (let k = 0; k < 4; k++) { ell(c, x + (r() - .5) * w * .6, y0 + dir * h * (.3 + r() * .6), w * .12, h * .2); c.fillStyle = `rgba(150,110,40,${o.stain * 0.25})`; c.fill(); }
  }
  // plaque – fuzzy layer near gumline and on surface
  if (o.plaque > 0.01) {
    const r = rng(i * 31 + 3), band = 20 + o.plaque * 60;
    c.fillStyle = `rgba(246,233,170,${0.55 * o.plaque + 0.2})`;
    for (let k = 0; k < 14; k++) { const px = x - w / 2 + r() * w; circ(c, px, y0 + dir * (r() * band), 12 + r() * 20 * o.plaque); c.fill(); }
    c.fillStyle = `rgba(240,225,150,${0.5 * o.plaque})`;
    for (let k = 0; k < 10; k++) { circ(c, x - w / 2 + r() * w, y0 + dir * (band + r() * h * .7 * o.plaque), 4 + r() * 9 * o.plaque); c.fill(); }
  }
  // tartar – hard deposits along gumline and corners
  if (o.tartar > 0.01) {
    const r = rng(i * 17 + 9), th = 8 + o.tartar * 46;
    c.beginPath(); c.moveTo(x - w / 2, y0);
    const n = 7;
    for (let k = 0; k <= n; k++) { const px = x - w / 2 + (k / n) * w; const edge = (k === 0 || k === n) ? 1.8 : 1; c.lineTo(px, y0 + dir * th * edge * (0.6 + r() * 0.6)); }
    c.lineTo(x + w / 2, y0); c.closePath();
    fs(c, mix('#d9b13c', '#a97c1e', o.tartar), mix('#8a6214', '#5e4010', o.tartar), 3);
    // interproximal wedges
    for (const sx of [-1, 1]) {
      c.beginPath(); c.moveTo(x + sx * w / 2, y0); c.lineTo(x + sx * (w / 2 - 26 * o.tartar - 6), y0); c.lineTo(x + sx * w / 2, y0 + dir * (th * 2.6)); c.closePath();
      fs(c, mix('#cfa232', '#9b701a', o.tartar), null);
    }
  }
  // cavity
  if (o.cavity && o.cavity.i === i && o.cavity.v > 0) {
    const v = o.cavity.v, cy = y0 + dir * h * 0.72;
    ell(c, x + w * 0.18, cy, 6 + v * 24, 6 + v * 30, 0.3); fs(c, '#3a1f10', '#6b3f1e', 4);
    ell(c, x + w * 0.16, cy + 3, 2 + v * 10, 3 + v * 14, 0.3); c.fillStyle = '#1a0c06'; c.fill();
  }
  // shine
  if (o.stain < 0.6) { rrect(c, x - w * 0.3, y0 + (dir > 0 ? 20 : -h + 25), w * 0.12, h * 0.55, 10); c.fillStyle = `rgba(255,255,255,${0.75 - o.stain})`; c.fill(); }
  c.restore();
  c.lineWidth = 5; c.strokeStyle = OL; c.stroke();
  c.restore();
}

function gumUpper(c, o, y0f) {
  const sw = o.gum, col = mix('#f59aa8', '#d8344c', sw), colD = mix('#e07a8d', '#a81e35', sw);
  c.beginPath(); c.moveTo(-480, -420); c.lineTo(480, -420); c.lineTo(480, y0f(440) + 10);
  const pts = UPL;
  for (let k = pts.length - 1; k >= 0; k--) {
    const t = pts[k], y0 = y0f(t.x), r = t.x + t.w / 2, l = t.x - t.w / 2;
    const pap = 30 + sw * 22 - o.recede * 50;
    c.lineTo(r, y0 + pap);
    c.bezierCurveTo(r - 10, y0 - 8 - sw * 6 + o.recede * 0, l + 10, y0 - 8 - sw * 6, l, y0 + pap);
  }
  c.lineTo(-480, y0f(-440) + 10); c.closePath();
  fs(c, col, OL, 6);
  // puffy highlights
  for (const t of pts) { ell(c, t.x, y0f(t.x) - 35, t.w * 0.32, 14 + sw * 8); c.fillStyle = `rgba(255,255,255,${0.22 - sw * 0.1})`; c.fill(); }
  if (sw > 0.3) for (const t of pts) { ell(c, t.x + t.w / 2, y0f(t.x) + 18, 18 * sw, 26 * sw); c.fillStyle = rgba('#ff4d63', 0.35 * sw); c.fill(); }
  // bleeding dots (non-graphic)
  if (o.bleed > 0) for (const k of [1, 3, 4]) {
    const t = pts[k], bx = t.x + t.w / 2, by = y0f(t.x) + 40 + sw * 18;
    ell(c, bx, by + o.bleed * 10, 6 + o.bleed * 5, 8 + o.bleed * 9); c.fillStyle = '#c4122f'; c.fill();
  }
}
function gumLower(c, o, y0f) {
  const sw = o.gum, col = mix('#f59aa8', '#d8344c', sw);
  c.beginPath(); c.moveTo(-480, 420); c.lineTo(480, 420); c.lineTo(480, y0f(440) - 10);
  for (let k = LOL.length - 1; k >= 0; k--) {
    const t = LOL[k], y0 = y0f(t.x), r = t.x + t.w / 2, l = t.x - t.w / 2, pap = 24 + sw * 18;
    c.lineTo(r, y0 - pap); c.bezierCurveTo(r - 10, y0 + 8 + sw * 6, l + 10, y0 + 8 + sw * 6, l, y0 - pap);
  }
  c.lineTo(-480, y0f(-440) - 10); c.closePath(); fs(c, col, OL, 6);
}

// o: x,y,s,open, plaque,tartar,stain,gum,bleed,food,cavity{i,v},recede,t,bugs
function mouth(c, o) {
  o = Object.assign({ x: W / 2, y: 820, s: 1, open: 1, plaque: 0, tartar: 0, stain: 0, gum: 0, bleed: 0, food: 0, cavity: null, recede: 0, t: 0, bugs: 0, lips: true }, o);
  c.save(); c.translate(o.x, o.y); c.scale(o.s, o.s); c.lineJoin = 'round'; c.lineCap = 'round';
  const op = o.open;
  const uy = x => -150 - op * 20 - Math.pow(x / 400, 2) * 30, ly = x => 175 + op * 20 + Math.pow(x / 400, 2) * 30;
  // lips outer
  if (o.lips) {
    ell(c, 0, 10, 530, 330 + op * 30); fs(c, '#c9566a', OL, 8);
    ell(c, 0, 10, 460, 270 + op * 30); c.fillStyle = '#3d0c18'; c.fill();
    ell(c, 0, 210, 260, 80); c.fillStyle = '#c94a62'; c.fill(); // tongue
  }
  c.save(); if (o.lips) { ell(c, 0, 10, 462, 272 + op * 30); c.clip(); }
  LOL.forEach((t, i) => toothFront(c, t.x, ly(t.x), t.w, t.h, -1, o, i + 10));
  gumLower(c, o, ly);
  UPL.forEach((t, i) => toothFront(c, t.x, uy(t.x) + o.recede * 30, t.w, t.h + o.recede * 30, 1, o, i));
  gumUpper(c, o, x => uy(x) + o.recede * 30);
  // food particles between teeth
  if (o.food > 0) {
    const r = rng(42);
    for (let k = 0; k < 5; k++) {
      const t = UPL[k], fx = t.x + t.w / 2, fy = uy(t.x) + 70 + r() * 70, sc = o.food * (0.8 + r() * 0.5);
      c.save(); c.translate(fx, fy); c.rotate(r() * 2 - 1); c.scale(sc, sc);
      if (k % 2) { c.beginPath(); c.moveTo(-18, 0); c.quadraticCurveTo(0, -28, 22, -4); c.quadraticCurveTo(4, 16, -18, 0); fs(c, '#5aa83a', OL, 4); }
      else { c.beginPath(); c.moveTo(-14, -10); c.lineTo(12, -14); c.lineTo(16, 8); c.lineTo(-10, 14); c.closePath(); fs(c, '#b07a3c', OL, 4); }
      c.restore();
    }
    for (let k = 0; k < 4; k++) { const t = LOL[k + 1]; circ(c, t.x + t.w / 2, ly(t.x) - 60 - r() * 30, 9 * o.food); fs(c, '#d9a35b', OL, 3); }
  }
  c.restore();
  if (o.lips) { // upper lip rim
    c.beginPath(); c.ellipse(0, 10, 462, 272 + op * 30, 0, 0, Math.PI * 2); c.strokeStyle = '#a63a50'; c.lineWidth = 16; c.stroke();
    c.beginPath(); c.ellipse(0, 10, 530, 330 + op * 30, 0, 0, Math.PI * 2); c.strokeStyle = OL; c.lineWidth = 8; c.stroke();
    ell(c, -250, -250, 90, 22, -0.3); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fill();
  }
  c.restore();
  // bacteria (in screen space for crispness)
  if (o.bugs > 0) {
    const r = rng(77), n = Math.round(o.bugs * 10);
    for (let k = 0; k < n; k++) {
      const t = UPL[k % 6], bx = o.x + (t.x + (r() - .5) * 80) * o.s, by = o.y + (k < 6 ? uy(t.x) + 40 + r() * 80 : ly(t.x) - 40 - r() * 60) * o.s;
      bug(c, bx + Math.sin(o.t * 2 + k) * 10, by + Math.cos(o.t * 2.3 + k) * 8, (26 + r() * 14) * o.s, o.t, BUGC[k % 4], k);
    }
  }
}

// ---------- single molar (macro) ----------
function molarPath(c) {
  c.beginPath();
  c.moveTo(-95, 0);
  c.bezierCurveTo(-112, -60, -106, -140, -60, -156);
  c.bezierCurveTo(-34, -164, -14, -142, 0, -128);
  c.bezierCurveTo(14, -142, 34, -164, 60, -156);
  c.bezierCurveTo(106, -140, 112, -60, 95, 0);
  c.bezierCurveTo(90, 60, 82, 150, 62, 190);
  c.bezierCurveTo(48, 208, 30, 190, 28, 158);
  c.bezierCurveTo(22, 108, 14, 64, 0, 56);
  c.bezierCurveTo(-14, 64, -22, 108, -28, 158);
  c.bezierCurveTo(-30, 190, -48, 208, -62, 190);
  c.bezierCurveTo(-82, 150, -90, 60, -95, 0);
  c.closePath();
}
function chipPath(c) {
  c.beginPath(); c.moveTo(30, -175); c.lineTo(120, -175); c.lineTo(120, -40); c.lineTo(96, -60); c.lineTo(78, -88); c.lineTo(58, -84); c.lineTo(44, -112); c.lineTo(22, -120); c.lineTo(14, -150); c.closePath();
}
// o: plaque,tartar,stain,cavity,chip,crack,gum,recede,tilt,t,glow
function molar(c, x, y, s, o) {
  o = Object.assign({ plaque: 0, tartar: 0, stain: 0, cavity: 0, chip: 0, crack: 0, gum: 0, recede: 0, tilt: 0, t: 0, sparkle: 0, pivot: 150 }, o);
  c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = 'round'; c.lineCap = 'round';
  // bone/jaw backdrop
  layer(c, k => {
    k.translate(0, o.pivot); k.rotate(o.tilt); k.translate(0, -o.pivot);
    molarPath(k);
    const g = k.createLinearGradient(0, -170, 0, 200);
    const cr = mix('#ffffff', '#e7cf86', o.stain), cr2 = mix('#e8eef2', '#caa95e', o.stain);
    g.addColorStop(0, cr); g.addColorStop(0.45, cr2); g.addColorStop(0.55, o.noGum ? '#eef3f6' : '#f1e2bf'); g.addColorStop(1, o.noGum ? '#dfe7ec' : '#e6cf9c');
    k.fillStyle = g; k.fill();
    k.save(); molarPath(k); k.clip();
    // shine
    ell(k, -55, -95, 16, 42, 0.2); k.fillStyle = `rgba(255,255,255,${0.8 - o.stain * 0.6})`; k.fill();
    // plaque
    if (o.plaque > 0) {
      const r = rng(5); k.fillStyle = `rgba(247,234,172,${0.35 + 0.5 * o.plaque})`;
      for (let i = 0; i < 26; i++) { const a = r(); circ(k, -100 + a * 200, -20 + r() * 26 - (r() < .4 ? r() * 120 * o.plaque : 0), 6 + r() * 22 * o.plaque); k.fill(); }
      k.fillStyle = `rgba(250,240,190,${0.6 * o.plaque})`;
      for (let i = 0; i < 10; i++) { circ(k, -40 + r() * 80, -135 + r() * 30, 5 + r() * 12 * o.plaque); k.fill(); }
    }
    if (o.tartar > 0) {
      const r = rng(9), th = 10 + 50 * o.tartar;
      k.beginPath(); k.moveTo(-120, 8);
      for (let i = 0; i <= 10; i++) k.lineTo(-110 + i * 22, 8 - th * (0.5 + r() * 0.7));
      k.lineTo(120, 8); k.closePath();
      fs(k, mix('#dcb440', '#a8781b', o.tartar), '#6e4c12', 4);
      for (let i = 0; i < 6; i++) { circ(k, -90 + r() * 180, 2 - r() * th * .8, 4 + r() * 6); k.fillStyle = 'rgba(255,240,180,0.5)'; k.fill(); }
    }
    if (o.cavity > 0) {
      const v = o.cavity;
      ell(k, 4, -128, 10 + v * 34, 8 + v * 26); fs(k, '#4a2a14', '#7a4a22', 4);
      ell(k, 4, -122, 5 + v * 20, 4 + v * 16); k.fillStyle = '#160904'; k.fill();
    }
    k.restore();
    molarPath(k); k.strokeStyle = OL; k.lineWidth = 7; k.stroke();
    if (o.chip > 0) {
      k.save(); k.globalCompositeOperation = 'destination-out'; k.translate(lerp(60, 0, o.chip), lerp(-60, 0, o.chip)); chipPath(k); k.fill(); k.restore();
      k.save(); molarPath(k); k.clip(); k.translate(lerp(60, 0, o.chip), lerp(-60, 0, o.chip)); chipPath(k); k.strokeStyle = OL; k.lineWidth = 7; k.stroke(); k.restore();
    }
    if (o.crack > 0) {
      k.beginPath(); k.moveTo(44, -112); k.lineTo(30, -80); k.lineTo(38, -50); k.lineTo(22, -18 + (1 - o.crack) * -30);
      k.moveTo(78, -88); k.lineTo(70, -60); k.lineTo(80, -30);
      k.strokeStyle = `rgba(60,30,20,${o.crack})`; k.lineWidth = 4; k.stroke();
    }
  });
  if (o.noGum) { c.restore(); if (o.sparkle > 0) sparkles(c, x, y - 90 * s, 170 * s, o.t, o.sparkle); return; }
  // gum
  const sw = o.gum, gy = 10 + o.recede * 70;
  c.beginPath(); c.moveTo(-330, 60 + gy); c.bezierCurveTo(-220, 40 + gy, -150, -10 + gy - sw * 14, -100, -4 + gy - sw * 10);
  c.bezierCurveTo(-60, 20 + gy, 60, 20 + gy, 100, -4 + gy - sw * 10);
  c.bezierCurveTo(150, -10 + gy - sw * 14, 220, 40 + gy, 330, 60 + gy);
  c.lineTo(330, 420); c.lineTo(-330, 420); c.closePath();
  fs(c, mix('#f59aa8', '#d4304a', sw), OL, 7);
  if (sw > 0.2) for (const sx of [-1, 1]) { ell(c, sx * 120, 18 + gy, 40 * sw, 22 * sw); c.fillStyle = rgba('#ff5a6e', 0.45 * sw); c.fill(); }
  ell(c, -200, 90 + gy, 60, 14); c.fillStyle = 'rgba(255,255,255,0.2)'; c.fill();
  c.restore();
  if (o.sparkle > 0) sparkles(c, x, y - 90 * s, 170 * s, o.t, o.sparkle);
}

// cross-section cutaway; decay 0..1 (enamel->dentin->near pulp)
function section(c, x, y, s, decay, t, labels = 1) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = 'round';
  molarPath(c); fs(c, '#f8fbff', null);
  c.save(); molarPath(c); c.clip();
  c.save(); c.translate(0, -6); c.scale(0.82, 0.88); molarPath(c); c.restore(); c.fillStyle = '#f2d9a0'; c.fill();
  // tubule texture
  c.strokeStyle = 'rgba(200,160,90,0.35)'; c.lineWidth = 2;
  for (let i = -60; i <= 60; i += 14) { c.beginPath(); c.moveTo(i, -110); c.quadraticCurveTo(i * 0.6, -40, i * 0.3, 10); c.stroke(); }
  // pulp
  c.beginPath(); c.moveTo(-48, -40); c.bezierCurveTo(-52, -78, -30, -92, -16, -78); c.quadraticCurveTo(0, -66, 16, -78);
  c.bezierCurveTo(30, -92, 52, -78, 48, -40); c.bezierCurveTo(46, 10, 50, 100, 46, 178); c.lineTo(40, 178); c.bezierCurveTo(34, 110, 22, 40, 0, 30);
  c.bezierCurveTo(-22, 40, -34, 110, -40, 178); c.lineTo(-46, 178); c.bezierCurveTo(-50, 100, -46, 10, -48, -40); c.closePath();
  fs(c, '#ef6b7f', '#b83a52', 4);
  c.strokeStyle = 'rgba(255,220,120,0.8)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-43, 170); c.quadraticCurveTo(-30, 0, -10, -60); c.moveTo(43, 170); c.quadraticCurveTo(30, 0, 10, -60); c.stroke();
  // decay
  if (decay > 0) {
    const d = decay;
    c.beginPath(); c.moveTo(-20 - d * 18, -170);
    c.bezierCurveTo(-26 - d * 22, -140 + d * 10, -20 - d * 16, -120 + d * 40, 0, -118 + d * 52);
    c.bezierCurveTo(20 + d * 16, -120 + d * 40, 26 + d * 22, -140 + d * 10, 20 + d * 18, -170); c.closePath();
    fs(c, '#4a2810', '#7a4a22', 5);
    ell(c, 0, -122 + d * 36, 8 + d * 8, 6 + d * 12); c.fillStyle = '#1b0b04'; c.fill();
  }
  c.restore();
  molarPath(c); c.strokeStyle = OL; c.lineWidth = 7; c.stroke();
  // gum + bone strip
  c.beginPath(); c.moveTo(-260, 40); c.bezierCurveTo(-180, 20, -140, 0, -98, 14); c.lineTo(-90, 700); c.lineTo(-260, 700); c.closePath(); fs(c, '#f59aa8', OL, 6);
  c.beginPath(); c.moveTo(260, 40); c.bezierCurveTo(180, 20, 140, 0, 98, 14); c.lineTo(90, 700); c.lineTo(260, 700); c.closePath(); fs(c, '#f59aa8', OL, 6);
  c.restore();
  if (labels > 0) {
    c.save(); c.globalAlpha = labels;
    tag(c, 'ENAMEL', x - 300, y - 300, x - 92 * s, y - 130 * s, '#ffffff', '#123047');
    tag(c, 'DENTIN', x + 300, y - 300, x + 62 * s, y - 60 * s, '#ffe08a', '#123047');
    tag(c, 'PULP (NERVE)', x + 270, y + 330, x + 30 * s, y + 60 * s, '#ff8fa0', '#123047');
    c.restore();
  }
}
function tag(c, txt, tx, ty, px, py, bgc = '#ffffff', fg = '#1b1b2f', size = 40) {
  c.save(); c.font = `900 ${size}px ${F}`; const w = c.measureText(txt).width + 40;
  c.beginPath(); c.moveTo(px, py); c.lineTo(tx, ty); c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.stroke();
  circ(c, px, py, 10); fs(c, '#ffffff', OL, 4);
  rrect(c, tx - w / 2, ty - size * 0.85, w, size * 1.7, 16); fs(c, bgc, OL, 5);
  c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, tx, ty + 2); c.restore();
}

function sparkles(c, x, y, R, t, a = 1) {
  c.save();
  for (let i = 0; i < 6; i++) {
    const ph = (t * 1.3 + i * 0.37) % 1, sc = Math.sin(ph * Math.PI) * a;
    const ang = i * 2.1, px = x + Math.cos(ang) * R * (0.6 + 0.4 * ((i * 7) % 3) / 2), py = y + Math.sin(ang) * R * 0.8;
    star(c, px, py, 28 * sc, '#ffffff'); star(c, px, py, 14 * sc, '#fffbd0');
  }
  c.restore();
}
function star(c, x, y, r, col) {
  if (r <= 0.5) return;
  c.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.22 : r, a = i * Math.PI / 4; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fillStyle = col; c.fill();
}

// ---------- characters ----------
function person(c, x, y, s, o) {
  o = Object.assign({ skin: '#f2c18d', skinD: '#d99b62', hair: '#2d1f1a', shirt: '#1fa5a0', smile: 1, shock: 0, worry: 0, talk: 0, blush: 0, sweat: 0, lookX: 0, lookY: 0, blink: 0, lean: 0, style: 0, dirty: 0, handNose: 0, coat: false, mirror: false, squint: 0, t: 0, frown: 0, armUp: -1, point: 0 }, o);
  c.save(); c.translate(x, y); c.rotate(o.lean); c.scale(s, s); c.lineJoin = 'round'; c.lineCap = 'round';
  // long hair behind
  if (o.style === 1) { c.beginPath(); c.moveTo(-185, -40); c.bezierCurveTo(-230, 120, -200, 260, -120, 280); c.lineTo(120, 280); c.bezierCurveTo(200, 260, 230, 120, 185, -40); c.closePath(); fs(c, o.hair, OL, 7); }
  // body
  c.beginPath(); c.moveTo(-240, 620); c.bezierCurveTo(-245, 360, -180, 262, -60, 245); c.lineTo(60, 245); c.bezierCurveTo(180, 262, 245, 360, 240, 620); c.closePath();
  fs(c, o.coat ? '#f4f8fc' : o.shirt, OL, 7);
  if (o.coat) {
    c.beginPath(); c.moveTo(-60, 245); c.lineTo(0, 400); c.lineTo(60, 245); c.closePath(); fs(c, '#4aa3df', OL, 6);
    c.beginPath(); c.moveTo(-60, 245); c.lineTo(-20, 420); c.lineTo(-110, 300); c.closePath(); fs(c, '#e6edf5', OL, 5);
    c.beginPath(); c.moveTo(60, 245); c.lineTo(20, 420); c.lineTo(110, 300); c.closePath(); fs(c, '#e6edf5', OL, 5);
    // stethoscope + badge
    c.beginPath(); c.moveTo(-70, 260); c.bezierCurveTo(-120, 420, 40, 470, 70, 380); c.strokeStyle = '#34495e'; c.lineWidth = 10; c.stroke();
    circ(c, 72, 372, 18); fs(c, '#bfc9d4', OL, 5);
    rrect(c, 110, 420, 80, 50, 8); fs(c, '#4aa3df', OL, 4);
    c.fillStyle = '#fff'; c.font = `900 30px ${F}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('+', 150, 446);
  } else { c.beginPath(); c.moveTo(-70, 248); c.quadraticCurveTo(0, 320, 70, 248); fs(c, mix(o.shirt, '#000000', .18), OL, 6); }
  // neck
  rrect(c, -46, 150, 92, 115, 22); fs(c, o.skinD, OL, 7);
  // ears
  for (const sx of [-1, 1]) { ell(c, sx * 170, 20, 34, 44); fs(c, o.skin, OL, 7); }
  // head
  ell(c, 0, 0, 172, 188); fs(c, o.skin, OL, 7);
  // hair
  c.beginPath(); c.moveTo(-174, 10);
  c.bezierCurveTo(-195, -150, -95, -218, 0, -212); c.bezierCurveTo(95, -218, 195, -150, 174, 10);
  if (o.style === 1) { c.bezierCurveTo(160, -80, 120, -120, 30, -118); c.bezierCurveTo(-40, -110, -120, -70, -150, -60); c.bezierCurveTo(-170, -30, -172, -10, -174, 10); }
  else { c.bezierCurveTo(156, -60, 126, -98, 64, -100); c.quadraticCurveTo(24, -70, 4, -106); c.quadraticCurveTo(-36, -78, -78, -112); c.bezierCurveTo(-128, -92, -160, -52, -174, 10); }
  c.closePath(); fs(c, o.hair, OL, 7);
  if (o.mirror) {
    c.beginPath(); c.moveTo(-170, -95); c.quadraticCurveTo(0, -150, 170, -95); c.strokeStyle = '#34495e'; c.lineWidth = 16; c.stroke();
    circ(c, 0, -150, 52); fs(c, '#d7e3ee', OL, 7); circ(c, 0, -150, 30); fs(c, '#ffffff', '#9fb3c8', 4); ell(c, -10, -160, 9, 5); c.fillStyle = '#9fb3c8'; c.fill();
  }
  // eyes
  const bl = clamp(o.blink);
  for (const sx of [-1, 1]) {
    const ex = sx * 62, ey = -12;
    if (o.squint > 0.5) {
      c.beginPath(); c.moveTo(ex - 30, ey - 6 * sx * 0); c.lineTo(ex + sx * 0, ey + 12); c.lineTo(ex + 30, ey); c.strokeStyle = OL; c.lineWidth = 9; c.stroke();
      c.beginPath(); c.moveTo(ex - 28, ey - 6); c.lineTo(ex + 28, ey - 6); c.stroke();
    } else {
      const ry = (38 + o.shock * 12) * (1 - bl * 0.92);
      ell(c, ex, ey, 33 + o.shock * 5, ry); fs(c, '#ffffff', OL, 6);
      if (bl < 0.7) {
        c.save(); ell(c, ex, ey, 33 + o.shock * 5, ry); c.clip();
        circ(c, ex + o.lookX * 12, ey + o.lookY * 10 + 4, 18 - o.shock * 6); c.fillStyle = OL; c.fill();
        circ(c, ex + o.lookX * 12 - 6, ey + o.lookY * 10 - 3, 6 - o.shock * 2); c.fillStyle = '#ffffff'; c.fill();
        c.restore();
      }
    }
    // brows
    const by = -78 - o.shock * 26, inner = by + o.worry * -14 + o.frown * 16, outer = by + o.worry * 12 - o.frown * 6;
    c.beginPath(); c.moveTo(sx * 28, inner); c.quadraticCurveTo(sx * 60, Math.min(inner, outer) - 10, sx * 100, outer);
    c.strokeStyle = o.hair; c.lineWidth = 15; c.stroke();
  }
  // nose
  c.beginPath(); c.moveTo(-6, 22); c.quadraticCurveTo(4, 56, 18, 46); c.strokeStyle = o.skinD; c.lineWidth = 7; c.stroke();
  // blush
  for (const sx of [-1, 1]) { ell(c, sx * 108, 58, 34, 17); c.fillStyle = `rgba(255,95,120,${0.15 + 0.5 * o.blush})`; c.fill(); }
  // mouth
  const tk = o.talk * Math.abs(Math.sin(o.t * 15)) * (0.6 + 0.4 * Math.sin(o.t * 7));
  if (o.shock > 0.5) {
    ell(c, 0, 108, 34 + tk * 6, 44 + tk * 8); fs(c, '#5a1220', OL, 7);
    c.save(); ell(c, 0, 108, 34, 44); c.clip(); rrect(c, -30, 64, 60, 18, 4); c.fillStyle = mix('#ffffff', '#d8bd6c', o.dirty); c.fill(); ell(c, 0, 142, 24, 14); c.fillStyle = '#d4606e'; c.fill(); c.restore();
  } else if (o.smile > 0.15 || tk > 0.05) {
    const sm = Math.max(o.smile, 0), wdt = 70 + sm * 40, dep = 22 + sm * 40 + tk * 30;
    c.beginPath(); c.moveTo(-wdt, 86 - sm * 8); c.quadraticCurveTo(0, 96 + sm * 4, wdt, 86 - sm * 8); c.quadraticCurveTo(0, 86 + dep * 2, -wdt, 86 - sm * 8); c.closePath();
    c.save(); c.fillStyle = '#5a1220'; c.fill(); c.clip();
    c.fillStyle = mix('#ffffff', '#d8bd6c', o.dirty); c.fillRect(-wdt, 70, wdt * 2, 30 + sm * 4);
    if (o.dirty > 0.2) { c.fillStyle = `rgba(160,120,40,${o.dirty * 0.7})`; for (let i = -3; i <= 3; i++) c.fillRect(i * 22 - 2, 70, 4, 34); c.fillRect(-wdt, 93 + sm * 4, wdt * 2, 7); }
    else { c.fillStyle = '#d5dde3'; for (let i = -3; i <= 3; i++) c.fillRect(i * 22 - 1.5, 80, 3, 24); }
    ell(c, 0, 86 + dep * 1.2, 40, 18); c.fillStyle = '#d4606e'; c.fill();
    c.restore(); c.strokeStyle = OL; c.lineWidth = 7; c.stroke();
  } else {
    c.beginPath(); c.moveTo(-50, 118); c.bezierCurveTo(-25, 100 + o.worry * 0, 25, 100, 50, 118);
    if (o.worry > 0.5) { c.moveTo(-50, 118); c.bezierCurveTo(-30, 104, -10, 120, 0, 110); c.bezierCurveTo(10, 100, 30, 114, 50, 118); }
    c.strokeStyle = OL; c.lineWidth = 8; c.stroke();
  }
  // sweat
  if (o.sweat > 0) { const sy = -90 + (o.t * 40 % 30); c.beginPath(); c.moveTo(135, sy - 34 * o.sweat); c.quadraticCurveTo(160, sy, 135, sy + 12 * o.sweat); c.quadraticCurveTo(110, sy, 135, sy - 34 * o.sweat); fs(c, '#8fd3ff', OL, 5); }
  // hand covering nose
  if (o.handNose > 0) {
    const hp = E.o(o.handNose), hx = lerp(200, 10, hp), hy = lerp(560, 50, hp);
    c.beginPath(); c.moveTo(170, 470); c.quadraticCurveTo(lerp(240, 200, hp), lerp(560, 260, hp), hx + 40, hy + 40); c.strokeStyle = OL; c.lineWidth = 86; c.stroke(); c.strokeStyle = o.shirt; c.lineWidth = 72; c.stroke();
    ell(c, hx, hy, 66, 56); fs(c, o.skin, OL, 7);
    c.strokeStyle = o.skinD; c.lineWidth = 5; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(hx - 40, hy + i * 20); c.lineTo(hx + 20, hy + i * 22); c.stroke(); }
  }
  // raised arm with toothbrush
  if (o.armUp >= 0) {
    const a = E.back(clamp(o.armUp)), hx = lerp(-210, -235, a), hy = lerp(600, 120, a);
    c.beginPath(); c.moveTo(-190, 420); c.quadraticCurveTo(-300, lerp(560, 330, a), hx, hy + 40); c.strokeStyle = OL; c.lineWidth = 86; c.stroke(); c.strokeStyle = o.coat ? '#f4f8fc' : o.shirt; c.lineWidth = 72; c.stroke();
    brush(c, hx + 10, hy - 20, -Math.PI / 2 + 0.2 + Math.sin(o.t * 4) * 0.05 * a, 0.75, { paste: 1 });
    ell(c, hx, hy, 50, 58); fs(c, o.skin, OL, 7);
  }
  // pointing at camera (foreshortened)
  if (o.point > 0) {
    const a = E.back(clamp(o.point)), hx = lerp(260, 120, a), hy = lerp(600, 250, a), sc = lerp(0.7, 1.45, a);
    c.beginPath(); c.moveTo(190, 420); c.quadraticCurveTo(300, 420, hx, hy); c.strokeStyle = OL; c.lineWidth = 90; c.stroke(); c.strokeStyle = '#f4f8fc'; c.lineWidth = 76; c.stroke();
    c.save(); c.translate(hx, hy); c.scale(sc, sc);
    ell(c, 0, 0, 70, 62); fs(c, o.skin, OL, 6);
    c.strokeStyle = o.skinD; c.lineWidth = 5; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(-30, 14 + i * 16); c.lineTo(30, 14 + i * 16); c.stroke(); }
    circ(c, -10, -30, 40); fs(c, o.skin, OL, 6); ell(c, -10, -34, 20, 16); fs(c, '#ffd9c0', o.skinD, 4);
    c.restore();
  }
  c.restore();
}

// ---------- UI: popups, day badge, subtitles ----------
function wrapLines(c, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const tst = cur ? cur + ' ' + w : w; if (c.measureText(tst).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tst; }
  if (cur) lines.push(cur); return lines;
}
// style: {bg, fg, y, size, icon, dur, tilt}
function popup(c, text, t0, t, st = {}) {
  st = Object.assign({ bg: '#FFD60A', fg: '#14121f', y: 1240, size: 92, icon: null, dur: 2.6, tilt: -0.03, maxW: 900, x: W / 2 }, st);
  const lt = t - t0; if (lt < 0 || lt > st.dur + 0.25) return;
  const inn = E.back(P(lt, 0, 0.32)), out = 1 - E.i(P(lt, st.dur, st.dur + 0.22));
  const sc = inn * out; if (sc <= 0.01) return;
  c.save(); c.translate(st.x, st.y); c.rotate(st.tilt + Math.sin(lt * 5) * 0.012); c.scale(sc, sc);
  c.font = `900 ${st.size}px ${F}`; const lines = wrapLines(c, text, st.maxW - (st.icon ? 130 : 0));
  const lw = Math.max(...lines.map(l => c.measureText(l).width)) + (st.icon ? 130 : 0), lh = st.size * 1.08;
  const bw = lw + 80, bh = lines.length * lh + 56;
  rrect(c, -bw / 2 + 14, -bh / 2 + 16, bw, bh, 30); c.fillStyle = 'rgba(0,0,0,0.45)'; c.fill();
  rrect(c, -bw / 2, -bh / 2, bw, bh, 30); fs(c, st.bg, '#14121f', 10);
  c.fillStyle = st.fg; c.textAlign = 'center'; c.textBaseline = 'middle';
  const ox = st.icon ? 65 : 0;
  lines.forEach((l, i) => c.fillText(l, ox, -((lines.length - 1) * lh) / 2 + i * lh + st.size * 0.06));
  if (st.icon === 'warn') warnIcon(c, -lw / 2 + 55, 0, 52, lt);
  if (st.icon === 'x') xIcon(c, -lw / 2 + 55, 0, 46);
  if (st.icon === 'check') checkIcon(c, -lw / 2 + 55, 0, 46);
  c.restore();
}
function warnIcon(c, x, y, r, t = 0) {
  c.save(); c.translate(x, y); const p = 1 + 0.08 * Math.sin(t * 14); c.scale(p, p);
  c.beginPath(); c.moveTo(0, -r); c.lineTo(r * 1.05, r * 0.8); c.lineTo(-r * 1.05, r * 0.8); c.closePath(); c.lineJoin = 'round'; fs(c, '#FFD60A', '#14121f', 8);
  c.fillStyle = '#14121f'; c.font = `900 ${r * 1.2}px ${F}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', 0, r * 0.18);
  c.restore();
}
function xIcon(c, x, y, r) { circ(c, x, y, r); fs(c, '#e63946', '#14121f', 7); c.beginPath(); c.moveTo(x - r * .4, y - r * .4); c.lineTo(x + r * .4, y + r * .4); c.moveTo(x + r * .4, y - r * .4); c.lineTo(x - r * .4, y + r * .4); c.strokeStyle = '#fff'; c.lineWidth = r * 0.22; c.lineCap = 'round'; c.stroke(); }
function checkIcon(c, x, y, r) { circ(c, x, y, r); fs(c, '#2bb673', '#14121f', 7); c.beginPath(); c.moveTo(x - r * .45, y); c.lineTo(x - r * .1, y + r * .35); c.lineTo(x + r * .5, y - r * .35); c.strokeStyle = '#fff'; c.lineWidth = r * 0.22; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); }

function dayBadge(c, label, t0, t, col = '#ffffff', fg = '#e63946') {
  const lt = t - t0; if (lt < 0) return;
  const a = E.back(P(lt, 0, 0.4));
  c.save(); c.translate(W / 2, 250); c.scale(a, a); c.rotate(Math.sin(lt * 3) * 0.015);
  c.font = `900 96px ${F}`; const w = c.measureText(label).width + 190;
  rrect(c, -w / 2 + 10, -70 + 12, w, 140, 70); c.fillStyle = 'rgba(0,0,0,0.35)'; c.fill();
  rrect(c, -w / 2, -70, w, 140, 70); fs(c, col, '#14121f', 9);
  // calendar icon
  const ix = -w / 2 + 85; rrect(c, ix - 38, -38, 76, 76, 12); fs(c, '#ffffff', '#14121f', 6);
  rrect(c, ix - 38, -38, 76, 24, [12, 12, 0, 0]); fs(c, fg, '#14121f', 6);
  c.fillStyle = '#14121f'; for (const dx of [-16, 16]) { rrect(c, ix + dx - 4, -48, 8, 20, 4); c.fill(); }
  c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, 50, 6);
  c.restore();
}
function progress(c, day, t) {
  const x0 = 110, w = W - 220, y = 120, n = 30, gap = 6, sw = (w - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const on = i < day; rrect(c, x0 + i * (sw + gap), y, sw, 18, 6);
    c.fillStyle = on ? (day >= 30 ? '#ff3b4f' : day >= 15 ? '#ffb020' : '#FFD60A') : 'rgba(255,255,255,0.22)'; c.fill();
  }
}
function subtitles(c, chunks, t) {
  const ch = chunks.find(k => t >= k.s && t < k.e2); if (!ch) return;
  const lt = t - ch.s, a = E.back(P(lt, 0, 0.18));
  c.save(); c.translate(W / 2, 1655); c.scale(0.85 + 0.15 * a, 0.85 + 0.15 * a);
  c.font = `900 70px ${F}`; c.textBaseline = 'middle'; c.lineJoin = 'round';
  const sp = 30, widths = ch.words.map(w => c.measureText(w.t).width), tot = widths.reduce((a, b) => a + b, 0) + sp * (ch.words.length - 1);
  let x = -tot / 2;
  ch.words.forEach((w, i) => {
    const act = t >= w.s && t < (ch.words[i + 1] ? ch.words[i + 1].s : ch.e2);
    c.save(); c.translate(x + widths[i] / 2, 0); if (act) c.scale(1.12, 1.12);
    c.textAlign = 'center'; c.lineWidth = 16; c.strokeStyle = '#0d0b14'; c.strokeText(w.t, 0, 0);
    c.fillStyle = act ? (w.hot ? '#ff4d5e' : '#FFE14D') : '#ffffff'; c.fillText(w.t, 0, 0); c.restore();
    x += widths[i] + sp;
  });
  c.restore();
}
function label(c, txt, x, y, size, col = '#fff', stroke = '#14121f', a = 1, sc = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = clamp(a); c.translate(x, y); c.scale(sc, sc); c.font = `900 ${size}px ${F}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.lineWidth = size * 0.22; c.strokeStyle = stroke; c.strokeText(txt, 0, 0); c.fillStyle = col; c.fillText(txt, 0, 0); c.restore();
}
