// ---------- timeline + scenes ----------
const cv = document.getElementById('c'); const ctx = cv.getContext('2d');
let TL, T = {}, CHUNKS = [], SFX = [], FLASH = [], SHAKE = [], FREEZE = [];
const norm = s => s.toLowerCase().replace(/[^a-z']/g, '');
function wt(word, n = 1, key = 's') { let k = 0; for (const w of TL.words) if (norm(w.w) === norm(word) && ++k === n) return w[key]; throw new Error('word ' + word + n); }

function setup(tl) {
  TL = tl;
  T.s2 = wt('Day') - 0.35; T.s3 = wt('By') - 0.25; T.s4 = wt('After') - 0.22; T.s5 = wt('By', 2) - 0.22;
  T.s6 = wt('Now') - 1.15; T.s7 = wt('poor') - 0.45; T.s8 = wt('So') - 0.5; T.end = TL.dur;
  // subtitle chunks
  const HOT = ['cavities...', 'damage...', 'loss.', 'plaque', 'tartar...', 'thirty', 'thirty.', 'pain.', 'inflamed,'];
  let cur = null;
  TL.words.forEach((w, i) => {
    const txt = w.w.replace(/\.\.\./g, '').toUpperCase();
    if (!cur) { cur = { s: w.s, words: [] }; CHUNKS.push(cur); }
    cur.words.push({ t: txt, s: w.s, hot: HOT.includes(w.w.toLowerCase()) || w.w === w.w.toUpperCase() && w.w.length > 3 });
    cur.e = w.e;
    const brk = /[.,?!]$/.test(w.w) || cur.words.length >= 3 || (cur.words.map(x => x.t).join(' ').length > 16);
    if (brk) cur = null;
  });
  CHUNKS.forEach((k, i) => { const nx = CHUNKS[i + 1]; k.e2 = nx ? Math.min(nx.s, k.e + 0.6) : k.e + 0.6; });
  // sound design + fx cues
  const sc = [T.s2, T.s3, T.s4, T.s5, T.s6, T.s7, T.s8];
  sc.forEach(t => { SFX.push({ t: t - 0.12, k: 'whoosh' }); FLASH.push({ t, a: 0.6 }); });
  T.freezeSmile = wt("don't") + 0.05; T.zoomIn = wt('teeth...') + 0.2;
  SFX.push({ t: T.freezeSmile, k: 'freeze' }, { t: T.zoomIn, k: 'whoosh' }, { t: wt('thirty') - 0.05, k: 'hit' });
  FLASH.push({ t: T.freezeSmile, a: 0.8 }); SHAKE.push({ t: wt('thirty'), a: 14 });
  T.pop = {
    p1: wt('thirty') - 0.05, p2: wt('plaque') - 0.05, p3: wt('unpleasant,') - 0.05, p4: wt('red,') - 0.05, p5: wt('tartar...') - 0.1,
    d30: wt('thirty', 2) - 0.05, split: wt('gums', 2) - 0.3, risk: wt('cavities') - 0.05, gd: wt('disease') - 0.05,
    cav: wt('cavities', 2) - 0.02, dmg: wt('damage...') - 0.02, loss: wt('loss.') - 0.02, pain: wt('without') - 0.05,
    late: wt("don't", 2) - 0.05, twice: wt('brush', 2) - 0.05, floss: wt('clean') - 0.05, smile: wt('smile') - 0.1, final: wt('responsibility.') + 0.9,
  };
  for (const k of ['p1', 'p2', 'p3', 'p4', 'p5', 'split', 'risk', 'gd', 'pain', 'late', 'twice', 'floss', 'smile']) SFX.push({ t: T.pop[k], k: 'pop' });
  for (const k of ['cav', 'dmg', 'loss']) { SFX.push({ t: T.pop[k], k: 'hit' }); SHAKE.push({ t: T.pop[k], a: 22 }); FLASH.push({ t: T.pop[k], a: 0.5, red: 1 }); FREEZE.push({ t: T.pop[k] + 0.25, d: 0.75 }); }
  SFX.push({ t: T.pop.d30, k: 'boom' }); SHAKE.push({ t: T.pop.d30, a: 30 }); FLASH.push({ t: T.pop.d30, a: 0.7, red: 1 });
  for (let i = 0; i < 12; i++) SFX.push({ t: T.s6 + 0.1 + i * 0.085, k: 'tick' });
  SFX.push({ t: T.s2 + 0.3, k: 'chime' }, { t: T.pop.smile, k: 'chime' }, { t: T.pop.final, k: 'chime' }, { t: T.pop.final - 0.05, k: 'whoosh' });
  SFX.push({ t: T.pop.p3 + 0.5, k: 'boing' });
  SFX.sort((a, b) => a.t - b.t);
  return { T, SFX };
}

function shakeAt(t) { let x = 0, y = 0; for (const s of SHAKE) { const d = t - s.t; if (d >= 0 && d < 0.6) { const k = s.a * Math.exp(-d * 7); x += Math.sin(d * 70) * k; y += Math.cos(d * 53) * k; } } return [x, y]; }
function freezeAt(t) { for (const f of FREEZE) if (t >= f.t && t < f.t + f.d) return { s: f.t, p: (t - f.t) / f.d }; return null; }

// camera helper: zoom s around focus point (fx,fy) placed at screen centre offset
function camera(c, s, fx, fy, tx = W / 2, ty = 820, rot = 0) { c.translate(tx, ty); c.rotate(rot); c.scale(s, s); c.translate(-fx, -fy); }

function blink(t, seed = 0) { const p = (t + seed) % 3.1; return p < 0.12 ? Math.sin(p / 0.12 * Math.PI) : 0; }

// ===== Scene 1: hook =====
function scene1(c, t) {
  const fz = T.freezeSmile, zi = T.zoomIn;
  if (t < zi + 0.45) {
    bg(c, '#29c4d8', '#0d6e9a', t, { rays: 0.05, glow: 'rgba(255,255,255,0.3)' });
    const z = t < zi ? lerp(1, 1.08, t / zi) : lerp(1.08, 6.5, E.i(P(t, zi, zi + 0.45)));
    c.save(); camera(c, z, W / 2, 900 + 108 * 0.95, W / 2, 900 + 108 * 0.95 + (t > zi ? 0 : 0));
    const sh = t > fz + 0.35 ? 1 : 0;
    const bob = Math.sin(t * 3) * 8 * (t < fz ? 1 : 0);
    person(c, W / 2, 900 + bob, 0.95, { smile: sh ? 0.6 : 1, shock: sh, t, blink: t < fz ? blink(t) : 0, lookY: sh ? -0.2 : 0, blush: 0.3 });
    if (t < fz) sparkles(c, W / 2, 1000, 120, t, 1);
    c.restore();
    if (t >= fz && t < fz + 0.35) { // freeze-frame look
      c.save(); c.globalAlpha = 0.35; c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.restore();
      c.save(); c.strokeStyle = '#ffffff'; c.lineWidth = 18; c.strokeRect(40, 40, W - 80, H - 80); c.restore();
    }
    if (t > fz + 0.35) { // shock lines
      const k = P(t, fz + 0.35, fz + 0.6);
      c.save(); c.translate(W / 2, 700); c.strokeStyle = '#FFD60A'; c.lineWidth = 16; c.lineCap = 'round';
      for (let i = -2; i <= 2; i++) { const a = -Math.PI / 2 + i * 0.35; c.beginPath(); c.moveTo(Math.cos(a) * 300, Math.sin(a) * 300); c.lineTo(Math.cos(a) * (300 + 120 * k), Math.sin(a) * (300 + 120 * k)); c.stroke(); }
      c.restore();
      label(c, '!?', W / 2 + 290, 640, 150, '#FFD60A', '#14121f', k, 0.7 + 0.3 * E.back(k));
    }
    label(c, 'WHAT IF...', W / 2, 330, 110, '#ffffff', '#14121f', P(t, 0.15, 0.4) * (1 - P(t, fz, fz + 0.2)), E.back(P(t, 0.15, 0.5)));
  } else {
    // inside the mouth
    const lt = t - zi - 0.45;
    bg(c, '#1c2340', '#0b0f1e', t, { glow: 'rgba(255,90,110,0.25)' });
    c.save(); camera(c, lerp(1.25, 1.0, E.o(P(lt, 0, 0.8))), W / 2, 820); mouth(c, { t, s: 1, open: 0.8 }); c.restore();
    sparkles(c, W / 2, 700, 330, t, 0.7);
    // crossed-out toothbrush
    const k = E.back(P(t, T.pop.p1 + 0.25, T.pop.p1 + 0.6));
    if (k > 0) { c.save(); c.translate(W / 2 + 330, 420); c.scale(k, k); circ(c, 0, 0, 120); fs(c, '#ffffff', '#14121f', 10); brush(c, 80, 40, -0.6, 0.45); circ(c, 0, 0, 120); c.strokeStyle = '#e63946'; c.lineWidth = 22; c.stroke(); c.beginPath(); c.moveTo(-85, -85); c.lineTo(85, 85); c.stroke(); c.restore(); }
  }
  popup(c, '30 DAYS WITHOUT BRUSHING?', T.pop.p1, t, { bg: '#e63946', fg: '#ffffff', y: 1250, size: 96, icon: 'warn', dur: T.s2 - T.pop.p1 - 0.2 });
}

// ===== Scene 2: Day 1 =====
const BUGS2 = (() => { const r = rng(3); return Array.from({ length: 9 }, (_, i) => ({ sx: r() < .5 ? -200 : W + 200, sy: 300 + r() * 1100, tx: -150 + r() * 300, ty: -160 + r() * 150, r: 30 + r() * 22, d: r() * 0.8 })); })();
function scene2(c, t) {
  const lt = t - T.s2, d = T.s3 - T.s2;
  bg(c, '#3ccfe0', '#1478a8', t, { rays: 0.04, seed: 11 });
  const z = lt < 1.8 ? lerp(1.0, 1.15, lt / 1.8) : lt < 3.6 ? lerp(1.3, 1.5, (lt - 1.8) / 1.8) : lerp(1.9, 2.3, E.io(P(lt, 3.6, d)));
  const fy = lt < 3.6 ? 760 : 820;
  c.save(); camera(c, z, W / 2, fy, W / 2, 820);
  const pl = E.io(P(lt, 3.4, d - 0.6)) * 0.75;
  molar(c, W / 2, 820, 2.2, { plaque: pl, t, sparkle: lt < 1.9 ? 1 : 0 });
  // bacteria fly in and settle
  BUGS2.forEach((b, i) => {
    const k = E.o(P(lt, 1.6 + b.d * 0.6, 2.9 + b.d * 0.6)); if (k <= 0) return;
    const bx = lerp(b.sx, W / 2 + b.tx * 1.1, k), by = lerp(b.sy, 820 + b.ty * 1.3 + 40, k);
    bug(c, bx + Math.sin(t * 3 + i) * 8, by + Math.cos(t * 2.6 + i) * 6, b.r * 1.15, t, BUGC[i % 4], i);
  });
  c.restore();
  if (lt < 1.8) label(c, 'CLEAN TOOTH', W / 2, 1340, 64, '#ffffff', '#0d4f6e', P(lt, 0.3, 0.6) * (1 - P(lt, 1.5, 1.8)));
  if (lt >= 1.8 && lt < 3.6) label(c, 'BACTERIA ARRIVE...', W / 2, 1360, 70, '#b6ff6b', '#14121f', P(lt, 1.9, 2.2) * (1 - P(lt, 3.3, 3.6)), E.back(P(lt, 1.9, 2.3)));
  if (lt >= 3.6) { const k = P(lt, 3.9, 4.2); if (k > 0) tag(c, 'PLAQUE', W / 2 - 290, 520, W / 2 - 120, 700, '#fff3b0', '#14121f', 48); }
  progress(c, 1, t); dayBadge(c, 'DAY 1', T.s2, t);
  popup(c, 'PLAQUE STARTS BUILDING UP', T.pop.p2, t, { y: 1250, dur: T.s3 - T.pop.p2 - 0.15, icon: 'warn' });
}

// ===== Scene 3: Day 3 =====
function scene3(c, t) {
  const lt = t - T.s3, d = T.s4 - T.s3, cut = 3.1;
  if (lt < cut) {
    bg(c, '#ffd36e', '#f08a3c', t, { seed: 21, glow: 'rgba(255,255,255,0.35)' });
    const react = P(lt, 1.0, 1.5), emb = P(lt, 1.8, 2.2);
    c.save(); camera(c, lerp(1, 1.06, lt / cut), W / 2, 950, W / 2, 950);
    person(c, 300, 1000, 0.78, { shirt: '#1fa5a0', smile: emb > 0.5 ? 0.25 : 0.7, talk: emb > 0.5 ? 0 : 1, t, blush: emb, sweat: emb, worry: emb, lookX: emb > 0.5 ? -0.6 : 0.6, blink: blink(t), dirty: 0.25 });
    person(c, 800, 1000, 0.78, { style: 1, hair: '#7a3b1e', skin: '#e3a674', skinD: '#c47d48', shirt: '#9b5de5', lean: react * 0.16, smile: react > 0.5 ? 0 : 0.6, squint: react, frown: react, handNose: react, t, lookX: -0.5 });
    // stink waves
    for (let i = 0; i < 4; i++) {
      const ph = ((lt * 0.9 + i * 0.25) % 1), x0 = 420 + ph * 330, y0 = 1060 - i * 40 - ph * 80, al = Math.sin(ph * Math.PI) * P(lt, 0.2, 0.6);
      c.save(); c.globalAlpha = al; c.beginPath();
      for (let k = 0; k <= 20; k++) { const x = x0 + k * 6, y = y0 - k * 4 + Math.sin(k * 0.8 + lt * 8 + i) * 14; k ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.strokeStyle = '#14121f'; c.lineWidth = 22; c.lineCap = 'round'; c.stroke(); c.strokeStyle = '#7bd14b'; c.lineWidth = 13; c.stroke(); c.restore();
    }
    c.restore();
    if (react > 0.3) label(c, 'EWW!', 860, 560, 90, '#7bd14b', '#14121f', react, E.back(react));
  } else {
    bg(c, '#2b2140', '#120d1f', t, { glow: 'rgba(255,200,120,0.18)', seed: 31 });
    const k = P(lt, cut, d);
    c.save(); camera(c, lerp(1.25, 1.5, E.io(k)), lerp(W / 2 - 60, W / 2 + 60, k), 800, W / 2, 820);
    mouth(c, { t, plaque: 0.35, food: 1, bugs: 0.9, stain: 0.08 }); c.restore();
    label(c, 'FOOD PARTICLES', W / 2 - 200, 440, 52, '#ffe08a', '#14121f', P(lt, cut + 0.2, cut + 0.5), E.back(P(lt, cut + 0.2, cut + 0.6)));
    label(c, '+ BACTERIA', W / 2 + 230, 520, 52, '#b6ff6b', '#14121f', P(lt, cut + 0.6, cut + 0.9), E.back(P(lt, cut + 0.6, cut + 1)));
  }
  progress(c, 3, t); dayBadge(c, 'DAY 3', T.s3, t);
  popup(c, 'UNPLEASANT BREATH?', T.pop.p3, t, { y: 1300, dur: Math.min(2.6, T.s4 - T.pop.p3 - 0.15), bg: '#7bd14b', icon: 'warn' });
}

// ===== Scene 4: Day 7 =====
function scene4(c, t) {
  const lt = t - T.s4, d = T.s5 - T.s4, cut = 2.3;
  bg(c, '#5b1f3a', '#1d0b18', t, { glow: 'rgba(255,80,110,0.28)', seed: 41 });
  const g = E.io(P(lt, 0.3, 2.0)) * 0.85;
  if (lt < cut) {
    c.save(); camera(c, lerp(1.2, 1.75, E.io(P(lt, 0, cut))), W / 2, 640, W / 2, 820);
    mouth(c, { t, plaque: 0.45, gum: g, stain: 0.12 }); c.restore();
    // pulsing inflammation rings
    const pr = (lt * 1.6) % 1; c.save(); c.globalAlpha = (1 - pr) * g; circ(c, W / 2, 700, 180 + pr * 260); c.strokeStyle = '#ff4d63'; c.lineWidth = 14; c.stroke(); c.restore();
  } else {
    const k = lt - cut;
    c.save(); camera(c, 1.85, W / 2, 640, W / 2, 820);
    mouth(c, { t, plaque: 0.45, gum: 0.85, bleed: E.o(P(k, 0.4, 1.4)), stain: 0.12 });
    brush(c, W / 2 + 120 + Math.sin(k * 14) * 70, 650, 0.04, 0.85, { blood: E.o(P(k, 0.3, 1.2)) });
    c.restore();
    label(c, 'BLEEDS MORE EASILY', W / 2, 470, 60, '#ffffff', '#a81e35', P(k, 0.5, 0.8), E.back(P(k, 0.5, 0.9)));
  }
  progress(c, 7, t); dayBadge(c, 'DAY 7', T.s4, t);
  popup(c, 'GUM INFLAMMATION', T.pop.p4, t, { y: 1300, bg: '#ff4d63', fg: '#ffffff', dur: T.s5 - T.pop.p4 - 0.15, icon: 'warn' });
}

// ===== Scene 5: Day 15 =====
function scene5(c, t) {
  const lt = t - T.s5, d = T.s6 - T.s5, cut = 2.6;
  bg(c, '#6b4a14', '#24170a', t, { glow: 'rgba(255,210,90,0.3)', seed: 51 });
  const tar = E.io(P(lt, 0.6, 2.6));
  if (lt < cut) {
    c.save(); camera(c, lerp(1.0, 1.25, E.io(P(lt, 0, cut))), W / 2, 820, W / 2, 820);
    molar(c, W / 2, 820, 2.4, { plaque: 0.85 * (1 - tar * 0.5), tartar: tar, gum: 0.45, stain: 0.25, t }); c.restore();
    // crystallising glints
    if (tar > 0.05 && tar < 0.98) for (let i = 0; i < 7; i++) star(c, W / 2 - 220 + i * 75, 820 - 10 + Math.sin(i * 3) * 30, 26 * Math.sin((lt * 3 + i * 0.3) % 1 * Math.PI), '#fff1a8');
    label(c, 'PLAQUE  →  TARTAR', W / 2, 400, 70, '#ffd84d', '#14121f', P(lt, 0.4, 0.7), E.back(P(lt, 0.4, 0.8)));
  } else {
    const k = lt - cut, fail = P(k, 1.2, 1.5);
    c.save(); camera(c, 1.55, W / 2, 800, W / 2, 820);
    molar(c, W / 2, 820, 2.4, { plaque: 0.35, tartar: 1, gum: 0.45, stain: 0.25, t });
    brush(c, W / 2 + 180 + Math.sin(k * 16) * 90, 900 + 95, 0, 0.9, {});
    c.restore();
    if (fail > 0) { c.save(); c.translate(W / 2 + 300, 520); c.scale(E.back(fail), E.back(fail)); xIcon(c, 0, 0, 90); c.restore(); }
    label(c, "WON'T BRUSH OFF!", W / 2, 1460 - 120, 64, '#ffffff', '#14121f', fail, E.back(fail));
    // reaction inset: surprise -> concern
    const ins = E.back(P(k, 0.3, 0.7));
    if (ins > 0) {
      c.save(); c.translate(190, 560); c.scale(ins, ins); circ(c, 0, 0, 130); fs(c, '#ffe9b0', '#14121f', 9); circ(c, 0, 0, 122); c.clip();
      person(c, 0, 30, 0.5, { shock: k < 1.6 ? 1 : 0, worry: k >= 1.6 ? 1 : 0, smile: 0, t, blink: blink(t) }); c.restore();
    }
  }
  progress(c, 15, t); dayBadge(c, 'DAY 15', T.s5, t, '#ffffff', '#d18a00');
  popup(c, 'PLAQUE CAN TURN INTO TARTAR', T.pop.p5, t, { y: 1250, bg: '#ffb020', dur: Math.min(2.8, d - (T.pop.p5 - T.s5) - 0.1), icon: 'warn' });
}

// ===== Scene 6: Day 30 =====
function calendarFlip(c, t, lt) {
  const n = Math.min(30, 15 + Math.floor(lt / 0.085)), p = (lt / 0.085) % 1, done = n >= 30;
  c.save(); c.translate(W / 2, 800);
  const sc = done ? 1 + 0.25 * Math.exp(-(t - T.pop.d30) * 6) * (t > T.pop.d30 ? 1 : 0) : 1; c.scale(sc, sc);
  rrect(c, -300 + 16, -300 + 20, 600, 620, 40); c.fillStyle = 'rgba(0,0,0,0.45)'; c.fill();
  rrect(c, -300, -300, 600, 620, 40); fs(c, '#ffffff', '#14121f', 12);
  rrect(c, -300, -300, 600, 150, [40, 40, 0, 0]); fs(c, '#e63946', '#14121f', 12);
  for (const dx of [-150, 150]) { rrect(c, dx - 16, -340, 32, 90, 16); fs(c, '#d7dde3', '#14121f', 8); }
  c.fillStyle = '#ffffff'; c.font = `900 70px ${F}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('DAY', 0, -222);
  c.fillStyle = done ? '#e63946' : '#14121f'; c.font = `900 300px ${F}`; c.fillText(String(n), 0, 90);
  if (!done) { c.save(); c.scale(1, 1 - p); rrect(c, -290, -150, 580, 200, 0); c.fillStyle = 'rgba(230,236,242,0.95)'; c.fill(); c.restore(); }
  c.restore();
}
function scene6(c, t) {
  const lt = t - T.s6, a = T.pop.d30 - T.s6 + 1.0, b = T.pop.split - T.s6;
  if (lt < a) {
    bg(c, '#3a0d16', '#0c0408', t, { glow: 'rgba(255,60,80,0.35)', rays: lt > a - 1.1 ? 0.04 : 0, seed: 61 });
    calendarFlip(c, t, lt);
  } else if (lt < b) {
    const k = lt - a;
    bg(c, '#2a0a12', '#060205', t, { glow: 'rgba(255,60,80,0.2)', seed: 62 });
    c.save(); camera(c, lerp(1.35, 1.7, E.io(P(k, 0, b - a))), W / 2 + 40, 760, W / 2, 820);
    mouth(c, { t, plaque: 0.8, tartar: 0.8, stain: 0.8, gum: 0.85, cavity: { i: 2, v: 0.8 } }); c.restore();
    label(c, 'PLAQUE', 250, 430, 54, '#fff3b0', '#14121f', P(k, 0.2, 0.4), E.back(P(k, 0.2, 0.5)));
    label(c, 'TARTAR', 830, 470, 54, '#ffcf4d', '#14121f', P(k, 0.6, 0.8), E.back(P(k, 0.6, 0.9)));
    label(c, 'DISCOLOURATION', W / 2, 1290, 60, '#e8c27a', '#14121f', P(k, 1.0, 1.2), E.back(P(k, 1.0, 1.3)));
  } else {
    // split screen
    const k = lt - b, op = E.o(P(k, 0, 0.5));
    bg(c, '#1b2a3a', '#0a1018', t, { seed: 63 });
    c.save(); c.beginPath(); c.rect(0, 0, W / 2, H); c.clip();
    c.fillStyle = '#d8f5f7'; c.fillRect(0, 0, W / 2, H);
    mouth(c, { x: W / 4 + lerp(-300, 0, op), y: 820, s: 0.52, t, open: 0.8 });
    sparkles(c, W / 4, 770, 150, t, 0.8); c.restore();
    c.save(); c.beginPath(); c.rect(W / 2, 0, W / 2, H); c.clip();
    c.fillStyle = '#3a1218'; c.fillRect(W / 2, 0, W / 2, H);
    mouth(c, { x: 3 * W / 4 + lerp(300, 0, op), y: 820, s: 0.52, t, open: 0.8, plaque: 0.8, tartar: 0.85, stain: 0.85, gum: 0.9, cavity: { i: 2, v: 0.8 }, bugs: 0.6 }); c.restore();
    c.fillStyle = '#ffffff'; c.fillRect(W / 2 - 6, 0, 12, H * op);
    label(c, 'HEALTHY', W / 4, 470, 64, '#2bb673', '#ffffff', op); label(c, 'TEETH', W / 4, 545, 64, '#2bb673', '#ffffff', op);
    label(c, 'POOR ORAL', 3 * W / 4, 470, 64, '#ff4d5e', '#14121f', op); label(c, 'HYGIENE', 3 * W / 4, 545, 64, '#ff4d5e', '#14121f', op);
    if (op > 0.5) { checkIcon(c, W / 4, 1110, 60); xIcon(c, 3 * W / 4, 1110, 60); }
    popup(c, 'RISK OF CAVITIES ↑', T.pop.risk, t, { y: 1300, bg: '#ff4d5e', fg: '#fff', size: 80, dur: 0.9 });
    popup(c, 'GUM DISEASE RISK ↑', T.pop.gd, t, { y: 1300, bg: '#ff4d5e', fg: '#fff', size: 80, dur: T.s7 - T.pop.gd - 0.1 });
  }
  progress(c, Math.min(30, 15 + Math.floor(Math.max(0, lt) / 0.085)), t);
  if (t >= T.pop.d30) dayBadge(c, 'DAY 30', T.pop.d30 + 0.2, t, '#ffffff', '#e63946');
  popup(c, 'DAY 30', T.pop.d30, t, { y: 1330, bg: '#e63946', fg: '#ffffff', size: 130, dur: 1.0, tilt: -0.05 });
  vignette(c, 0.6);
}

// ===== Scene 7: consequences (damage sequence) =====
function scene7(c, t) {
  const fr = freezeAt(t); const tt = fr ? fr.s : t; // freeze animation clock
  const lt = tt - T.s7, A = wt('untreated') - T.s7 - 0.1, B = T.pop.dmg - T.s7 - 0.15, C = wt('advanced') - T.s7 - 0.1, D = wt('scary') - T.s7 - 0.2;
  bg(c, '#2b0710', '#080206', tt, { glow: 'rgba(255,40,60,0.3)', seed: 71 });
  if (lt < A) {
    c.save(); camera(c, lerp(1.6, 2.6, E.io(P(lt, 0, A))), W / 2 + 120, 780, W / 2, 820);
    mouth(c, { t: tt, plaque: 0.8, tartar: 0.8, stain: 0.8, gum: 0.85, cavity: { i: 2, v: 0.8 } }); c.restore();
    for (const [x, y, dl] of [[220, 520, 0.2], [860, 600, 0.5], [300, 1150, 0.8]]) { const k = E.back(P(lt, dl, dl + 0.3)); if (k > 0) warnIcon(c, x, y, 60 * k, tt); }
    label(c, 'IF IT CONTINUES...', W / 2, 1300, 76, '#ffffff', '#e63946', P(lt, 0.3, 0.6), E.back(P(lt, 0.3, 0.7)));
  } else if (lt < B) {
    const k = lt - A, dec = E.io(P(k, 0.1, Math.min(1.4, B - A - 0.2)));
    c.save(); camera(c, lerp(1.0, 1.18, E.io(P(k, 0, B - A))), W / 2, 820, W / 2, 820);
    section(c, W / 2, 840, 2.15, 0.15 + dec * 0.75, tt, P(k, 0.2, 0.6)); c.restore();
    label(c, 'TOOTH DECAY CUTAWAY', W / 2, 380 + 40, 52, '#ffffff', '#14121f', P(k, 0, 0.3));
  } else if (lt < C) {
    const k = lt - B;
    c.save(); camera(c, lerp(1.0, 1.35, E.io(P(k, 0, C - B))), W / 2 + 60, 700, W / 2, 820);
    molar(c, W / 2, 860, 2.3, { chip: E.o(P(k, 0.1, 0.4)), crack: P(k, 0.3, 0.8), cavity: 0.6, stain: 0.6, tartar: 0.5, gum: 0.7, t: tt }); c.restore();
    if (k > 0.15 && k < 0.5) for (let i = 0; i < 6; i++) { const a = i * 1.05, r = 120 + (k - 0.15) * 900; circ(c, W / 2 + 220 + Math.cos(a) * r * 0.5, 600 + Math.sin(a) * r * 0.4 - (k - 0.15) * 200, 14); fs(c, '#f2e4c0', OL, 4); }
    label(c, 'WEAKENED & CHIPPED', W / 2, 400, 60, '#ffffff', '#14121f', P(k, 0.2, 0.5));
  } else if (lt < D) {
    const k = lt - C, wob = Math.sin(tt * 9) * 0.13 * P(k, 0.2, 0.6);
    c.save(); camera(c, lerp(1.0, 1.3, E.io(P(k, 0, D - C))), W / 2, 820, W / 2, 820);
    molar(c, W / 2, 800, 2.2, { tilt: wob, pivot: 190, gum: 1, recede: E.io(P(k, 0, 1.2)), tartar: 0.7, stain: 0.6, t: tt }); c.restore();
    c.save(); c.strokeStyle = '#ffffff'; c.lineWidth = 10; c.lineCap = 'round';
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { c.beginPath(); if (sx > 0) c.arc(W / 2, 1000, 330 + i * 40, -0.9, -0.3); else c.arc(W / 2, 1000, 330 + i * 40, Math.PI + 0.3, Math.PI + 0.9); c.globalAlpha = 0.5 * Math.abs(Math.sin(tt * 9)); c.stroke(); }
    c.restore();
    label(c, 'ADVANCED GUM DISEASE', W / 2, 380 + 40, 56, '#ffffff', '#a81e35', P(k, 0.1, 0.4));
    label(c, 'LOOSE TOOTH', W / 2, 1330 - 30, 60, '#ff8fa0', '#14121f', P(k, 0.8, 1.1) * (1 - P(lt, D - 1.9, D - 1.7)));
  } else {
    const k = lt - D;
    bg(c, '#1a0408', '#050102', tt, { glow: 'rgba(255,40,60,0.25)', seed: 72 });
    c.save(); camera(c, lerp(1.25, 1.5, E.io(P(k, 0, 3))), W / 2, 820, W / 2, 900);
    person(c, W / 2, 820, 1.05, { smile: 0, worry: 1, t: tt, blink: blink(tt), sweat: 1, lookX: -0.3 }); c.restore();
    for (const [x, y, dl] of [[180, 500, 0.0], [900, 560, 0.25]]) { const kk = E.back(P(k, dl, dl + 0.3)); if (kk > 0) warnIcon(c, x, y, 64 * kk, tt); }
  }
  label(c, 'OVER TIME, IF UNTREATED', W / 2, 220, 50, '#ffffff', '#14121f', 1);
  popup(c, 'CAVITIES', T.pop.cav, t, { bg: '#e63946', fg: '#fff', size: 120, y: 1290, dur: T.pop.dmg - T.pop.cav - 0.4, icon: 'warn' });
  popup(c, 'TOOTH DAMAGE', T.pop.dmg, t, { bg: '#e63946', fg: '#fff', size: 120, y: 1290, dur: wt('advanced') - T.pop.dmg - 0.1, icon: 'warn' });
  popup(c, 'TOOTH LOSS RISK', T.pop.loss, t, { bg: '#e63946', fg: '#fff', size: 110, y: 1290, dur: wt('scary') - T.pop.loss - 0.2, icon: 'warn' });
  popup(c, 'IT CAN BEGIN WITHOUT PAIN', T.pop.pain, t, { bg: '#FFD60A', size: 90, y: 1300, dur: T.s8 - T.pop.pain - 0.15, icon: 'warn' });
  if (fr) { // freeze-frame treatment
    const k = 1 - fr.p;
    c.save(); c.globalAlpha = 0.25 * k; c.fillStyle = '#ff0022'; c.fillRect(0, 0, W, H); c.restore();
    c.save(); c.strokeStyle = `rgba(255,255,255,${0.9 * k})`; c.lineWidth = 16; c.strokeRect(36, 36, W - 72, H - 72); c.restore();
  }
  vignette(c, 0.7, '40,0,6');
}

// ===== Scene 8: lesson =====
function scene8(c, t) {
  const lt = t - T.s8, B = T.pop.twice - T.s8 - 0.2, Cc = T.pop.smile - T.s8 - 0.1, Fn = T.pop.final - T.s8;
  bg(c, '#45d6c4', '#0f7f9c', t, { rays: 0.05, glow: 'rgba(255,255,255,0.35)', seed: 81 });
  if (lt < B) {
    const real = P(lt, 0.5, 0.8), arm = P(lt, 0.8, 1.3);
    c.save(); camera(c, lerp(1.08, 1.0, E.o(P(lt, 0, 1))), W / 2, 900, W / 2, 900);
    person(c, W / 2, 900, 0.95, { smile: real > 0.5 ? 0.7 : 0, worry: 1 - real, shock: 0, t, blink: blink(t), armUp: arm, lookY: -0.2 }); c.restore();
    if (real > 0) { // lightbulb
      const k = E.back(real); c.save(); c.translate(W / 2 + 270, 520); c.scale(k, k);
      circ(c, 0, 0, 70); fs(c, '#FFE14D', '#14121f', 8); rrect(c, -30, 60, 60, 40, 8); fs(c, '#c0c8d0', '#14121f', 6);
      c.strokeStyle = '#FFE14D'; c.lineWidth = 10; c.lineCap = 'round';
      for (let i = 0; i < 7; i++) { const a = -Math.PI + i * Math.PI / 6; c.beginPath(); c.moveTo(Math.cos(a) * 95, Math.sin(a) * 95); c.lineTo(Math.cos(a) * 130, Math.sin(a) * 130); c.stroke(); }
      c.restore();
    }
  } else if (lt < Cc) {
    const k = lt - B, di = E.o(P(k, 0, 0.5));
    person(c, 320, 980, 0.7, { smile: 0.9, t, blink: blink(t), armUp: 1 });
    person(c, lerp(1300, 790, di), 1000, 0.74, { coat: true, mirror: true, hair: '#4a4a4a', skin: '#c98b5b', skinD: '#a96d40', smile: 0.8, t, blink: blink(t, 1.3), point: P(k, 0.4, 0.8), lookX: 0 });
    // tips row
    const tip = (i, ic, txt, t0) => {
      const a = E.back(P(lt, t0, t0 + 0.35)); if (a <= 0) return;
      c.save(); c.translate(W / 2 + (i - 1) * 330, 460); c.scale(a, a);
      circ(c, 0, 0, 115); fs(c, '#ffffff', '#14121f', 9); ic(); c.restore();
      label(c, txt, W / 2 + (i - 1) * 330, 620, 44, '#ffffff', '#14121f', a);
    };
    tip(0, () => { c.fillStyle = '#e63946'; c.font = `900 110px ${F}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('2×', 0, 6); }, 'TWICE A DAY', T.pop.twice - T.s8);
    tip(1, () => { rrect(c, -30, -75, 60, 130, 14); fs(c, '#4aa3df', '#14121f', 6); rrect(c, -16, 55, 32, 22, 4); fs(c, '#ffffff', '#14121f', 5); c.fillStyle = '#fff'; c.font = `900 26px ${F}`; c.textAlign = 'center'; c.fillText('F', 0, -6); }, 'FLUORIDE', wt('fluoride') - T.s8 - 0.05);
    tip(2, () => { c.beginPath(); c.moveTo(-60, -50); c.bezierCurveTo(-10, -90, 10, 90, 60, 50); c.strokeStyle = '#2ec4b6'; c.lineWidth = 12; c.stroke(); rrect(c, -78, -20, 52, 70, 12); fs(c, '#9b5de5', '#14121f', 6); }, 'CLEAN BETWEEN', T.pop.floss - T.s8);
  } else {
    const k = lt - Cc;
    c.save(); camera(c, lerp(1.0, 1.12, E.io(P(k, 0, 4))), W / 2, 900, W / 2, 900);
    person(c, W / 2, 920, 1.0, { smile: 1, t, blink: blink(t), lookY: 0 }); c.restore();
    sparkles(c, W / 2, 1000, 200, t, 1);
    // confetti
    const r = rng(99);
    for (let i = 0; i < 40; i++) { const x = r() * W, sp = 200 + r() * 300, y = -50 + ((k * sp + r() * 600) % 2000); c.save(); c.translate(x + Math.sin(k * 3 + i) * 30, y); c.rotate(k * 4 + i); c.fillStyle = ['#FFD60A', '#ff4d5e', '#ffffff', '#2ec4b6', '#9b5de5'][i % 5]; c.fillRect(-10, -5, 20, 10); c.restore(); }
  }
  popup(c, "DON'T WAIT UNTIL IT'S TOO LATE!", T.pop.late, t, { bg: '#e63946', fg: '#fff', y: 1330, size: 86, dur: T.pop.twice - T.pop.late - 0.3, icon: 'warn' });
  popup(c, 'BRUSH TWICE DAILY. PROTECT YOUR SMILE.', T.pop.smile, t, { bg: '#FFD60A', y: 1320, size: 84, dur: T.pop.final - T.pop.smile - 0.15, icon: 'check' });
  // final card
  const fk = P(lt, Fn, Fn + 0.4);
  if (fk > 0) {
    c.save(); c.globalAlpha = 0.82 * fk; c.fillStyle = '#0b2b3a'; c.fillRect(0, 0, W, H); c.restore();
    const a = E.back(fk);
    c.save(); c.translate(W / 2, 820); c.scale(a, a);
    rrect(c, -460, -400, 920, 800, 50); fs(c, '#ffffff', '#14121f', 12);
    // little tooth mascot
    molar(c, 0, -150, 1.0, { t, sparkle: 1, noGum: true });
    c.fillStyle = '#14121f'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `900 70px ${F}`; c.fillText('YOUR SMILE IS', 0, 110); c.fillStyle = '#0f8fa3'; c.font = `900 62px ${F}`; c.fillText('YOUR RESPONSIBILITY.', 0, 190);
    c.fillStyle = '#14121f'; c.font = `800 44px ${F}`; c.fillText('Take care of it before', 0, 280); c.fillText('damage begins.', 0, 335);
    c.restore();
    label(c, 'BRUSH 2× DAILY  •  CLEAN BETWEEN TEETH', W / 2, 1330, 44, '#FFE14D', '#14121f', P(lt, Fn + 0.5, Fn + 0.8));
  }
}

function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  const [sx, sy] = shakeAt(t);
  ctx.save();
  // punch-in zoom at every scene cut
  let punch = 1; for (const s of [T.s2, T.s3, T.s4, T.s5, T.s6, T.s7, T.s8]) { const d = t - s; if (d >= 0 && d < 0.35) punch = 1 + 0.08 * (1 - E.o(d / 0.35)); }
  ctx.translate(W / 2 + sx, H / 2 + sy); ctx.scale(punch, punch); ctx.translate(-W / 2, -H / 2);
  if (t < T.s2) scene1(ctx, t); else if (t < T.s3) scene2(ctx, t); else if (t < T.s4) scene3(ctx, t);
  else if (t < T.s5) scene4(ctx, t); else if (t < T.s6) scene5(ctx, t); else if (t < T.s7) scene6(ctx, t);
  else if (t < T.s8) scene7(ctx, t); else scene8(ctx, t);
  ctx.restore();
  if (t < T.s7 || t >= T.s8) vignette(ctx, 0.35);
  if (t < T.pop.final) subtitles(ctx, CHUNKS, t);
  for (const f of FLASH) { const d = t - f.t; if (d >= 0 && d < 0.4) { ctx.fillStyle = f.red ? `rgba(255,40,60,${f.a * (1 - d / 0.4)})` : `rgba(255,255,255,${f.a * (1 - d / 0.4)})`; ctx.fillRect(0, 0, W, H); } }
  // fade from/to black
  const fin = P(t, 0, 0.25), fout = P(t, T.end - 0.35, T.end);
  if (fin < 1 || fout > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.max(1 - fin, fout)})`; ctx.fillRect(0, 0, W, H); }
}
window.setup = setup; window.render = render;
