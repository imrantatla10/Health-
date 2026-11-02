// ===== 3D world: textures, materials and model builders =====
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export function hash(a, b) { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) ^ 0x5bf03635; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

// ---------- paving brick pattern (shared by driveway texture and lift-roof bricks) ----------
export const BX = 0.2, BZ = 0.1, BX0 = -2.8, BZ0 = -2.9;
const PAL = [[132, 72, 54], [150, 86, 62], [118, 62, 48], [160, 100, 72], [104, 56, 45], [142, 80, 58], [124, 70, 56], [96, 68, 60], [170, 112, 82]];
export function brickRGB(ix, r) {
  const c = PAL[Math.floor(hash(ix * 7 + 3, r * 13 + 1) * PAL.length)];
  const v = 0.86 + 0.26 * hash(ix + 91, r + 17);
  return c.map(x => Math.min(255, x * v));
}
const rowOff = r => (((r % 2) + 2) % 2) * 0.1;
export const DRV = { x0: -3.4, x1: 3.4, z0: -5.2, z1: 9.2 };

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, rep = true, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 8; return t;
}
function noise(g, w, h, n, cols, rmin, rmax, a, seed) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) { g.globalAlpha = a * (0.4 + 0.6 * r()); g.fillStyle = cols[Math.floor(r() * cols.length)]; const s = rmin + r() * (rmax - rmin); g.fillRect(r() * w, r() * h, s, s); }
  g.globalAlpha = 1;
}

function drivewayTexture() {
  const PPM = 150, w = Math.round((DRV.x1 - DRV.x0) * PPM), h = Math.round((DRV.z1 - DRV.z0) * PPM);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#8a8178'; g.fillRect(0, 0, w, h);
  noise(g, w, h, 30000, ['#6f675f', '#9d958b', '#7c746b'], 1, 2, 0.6, 3);
  const r0 = Math.floor((DRV.z0 - BZ0) / BZ) - 1, r1 = Math.ceil((DRV.z1 - BZ0) / BZ) + 1;
  const gap = 1.3;
  for (let r = r0; r <= r1; r++) {
    const off = rowOff(r), zA = BZ0 + r * BZ;
    const i0 = Math.floor((DRV.x0 - BX0 - off) / BX) - 1, i1 = Math.ceil((DRV.x1 - BX0 - off) / BX) + 1;
    for (let ix = i0; ix <= i1; ix++) {
      const xA = BX0 + off + ix * BX;
      const [R, G, B] = brickRGB(ix, r);
      const px = (xA - DRV.x0) * PPM + gap, py = (zA - DRV.z0) * PPM + gap, bw = BX * PPM - 2 * gap, bh = BZ * PPM - 2 * gap;
      const gr = g.createLinearGradient(px, py, px + bw, py + bh);
      gr.addColorStop(0, `rgb(${R * 1.06},${G * 1.06},${B * 1.06})`); gr.addColorStop(1, `rgb(${R * 0.9},${G * 0.9},${B * 0.9})`);
      g.fillStyle = gr; g.fillRect(px, py, bw, bh);
    }
  }
  noise(g, w, h, 60000, ['#000000', '#ffffff', '#3a2018'], 1, 2.2, 0.08, 9);
  return tex(c, false);
}
function soilTexture() {
  const [c, g] = canvas(512, 1024);
  const gr = g.createLinearGradient(0, 0, 0, 1024);
  [[0, '#2f2117'], [0.035, '#3c2a1c'], [0.06, '#6a4a30'], [0.2, '#7a5a3a'], [0.27, '#806548'], [0.32, '#6e6152'], [0.6, '#5e574e'], [1, '#4a453f']]
    .forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, 512, 1024);
  const r = rng(5);
  for (let i = 0; i < 900; i++) { const y = 60 + r() * 960; g.fillStyle = `rgba(${150 + r() * 60},${130 + r() * 50},${100 + r() * 40},${0.35 + r() * 0.4})`; g.beginPath(); g.ellipse(r() * 512, y, 2 + r() * 7, 1.5 + r() * 5, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(30,20,12,0.25)'; g.lineWidth = 1 + r() * 2; g.beginPath(); const y = r() * 1024; g.moveTo(0, y); g.bezierCurveTo(170, y + r() * 20 - 10, 340, y + r() * 20 - 10, 512, y); g.stroke(); }
  noise(g, 512, 1024, 40000, ['#000', '#fff'], 1, 2, 0.07, 2);
  return tex(c);
}
function concreteTexture(base = '#a7a39c') {
  const [c, g] = canvas(512, 512);
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  noise(g, 512, 512, 50000, ['#8d8982', '#bab6ae', '#99958e'], 1, 3, 0.35, 11);
  const r = rng(4); for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(60,58,55,0.25)'; g.beginPath(); g.arc(r() * 512, r() * 512, 0.6 + r() * 1.8, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(70,68,64,0.25)'; g.lineWidth = 2; g.strokeRect(1, 1, 510, 510);
  return tex(c);
}
function grassTexture() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#4f7a2e'; g.fillRect(0, 0, 512, 512);
  const r = rng(8);
  for (let i = 0; i < 26000; i++) { const x = r() * 512, y = r() * 512; g.strokeStyle = ['#5e8e35', '#44692a', '#6c9b3e', '#3c5e24', '#7aa848'][Math.floor(r() * 5)]; g.lineWidth = 1 + r(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + r() * 4 - 2, y - 3 - r() * 5); g.stroke(); }
  return tex(c);
}
function leafTexture() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#26431c'; g.fillRect(0, 0, 512, 512);
  const r = rng(12);
  for (let i = 0; i < 9000; i++) { g.fillStyle = ['#2f5522', '#3d6b2a', '#1c3315', '#4a7a33', '#335e25'][Math.floor(r() * 5)]; g.beginPath(); g.ellipse(r() * 512, r() * 512, 3 + r() * 5, 1.5 + r() * 3, r() * 3.14, 0, 7); g.fill(); }
  return tex(c);
}
function facadeTexture(base) {
  const PPM = 400, w = 860, h = 600; const [c, g] = canvas(w, h);
  g.fillStyle = '#d4cbb9'; g.fillRect(0, 0, w, h);
  const r = rng(base.length * 7);
  const cw = 0.215 * PPM, ch = 0.075 * PPM;
  for (let row = 0; row < 20; row++) for (let i = -1; i < 11; i++) {
    const x = i * cw + (row % 2) * cw / 2, y = row * ch;
    const k = 0.78 + r() * 0.34; const b = base.map(v => Math.min(255, v * k));
    g.fillStyle = `rgb(${b[0]},${b[1]},${b[2]})`; g.fillRect(x + 2, y + 2, cw - 4, ch - 4);
    if (r() < 0.25) { g.fillStyle = 'rgba(40,30,20,0.18)'; g.fillRect(x + 2 + r() * cw * 0.5, y + 2, cw * 0.4, ch - 4); }
  }
  noise(g, w, h, 30000, ['#000', '#fff'], 1, 2, 0.08, 6);
  return tex(c);
}
function slabTexture() {
  const [c, g] = canvas(512, 512); g.fillStyle = '#9b9893'; g.fillRect(0, 0, 512, 512);
  noise(g, 512, 512, 30000, ['#86837e', '#aeaba5'], 1, 3, 0.4, 21);
  g.strokeStyle = '#6d6a65'; g.lineWidth = 3; g.strokeRect(0, 0, 512, 512); g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 512); g.moveTo(0, 256); g.lineTo(512, 256); g.stroke();
  return tex(c);
}
function asphaltTexture() {
  const [c, g] = canvas(512, 512); g.fillStyle = '#3b3c3e'; g.fillRect(0, 0, 512, 512);
  noise(g, 512, 512, 70000, ['#2a2b2d', '#4c4d50', '#57585b'], 1, 2.5, 0.6, 31); return tex(c);
}
function treadTexture() {
  const [c, g] = canvas(256, 256); g.fillStyle = '#7d8288'; g.fillRect(0, 0, 256, 256);
  noise(g, 256, 256, 6000, ['#6a6f75', '#90959b'], 1, 2, 0.5, 41);
  g.fillStyle = '#b4b9bf';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.save(); g.translate(x * 32 + (y % 2) * 16 + 8, y * 32 + 16); g.rotate((x + y) % 2 ? 0.8 : -0.8); g.fillRect(-9, -2.2, 18, 4.4); g.restore(); }
  return tex(c);
}
function gratingTexture() {
  const [c, g] = canvas(64, 256); g.fillStyle = '#7a8088'; g.fillRect(0, 0, 64, 256);
  g.fillStyle = '#05070a'; for (let y = 4; y < 256; y += 16) g.fillRect(10, y, 44, 9); return tex(c);
}
function plateTexture(txt, yellow) {
  const [c, g] = canvas(520, 120); g.fillStyle = yellow ? '#f3c623' : '#f4f4f0'; g.fillRect(0, 0, 520, 120);
  g.fillStyle = '#1d3f9e'; g.fillRect(0, 0, 54, 120); g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText('UK', 27, 98);
  g.fillStyle = '#111'; g.font = "900 82px 'Inter Display'"; g.fillText(txt, 287, 89); return tex(c, false);
}

// ---------- uv baking: world-space projection per face normal ----------
function bakeUV(geo, side, top) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    let u, v;
    if (ny > 0.5) [u, v] = top(x, z, y); else if (nx > 0.5) [u, v] = side(z, y, x); else [u, v] = side(x, y, z);
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
}
const sc = s => (a, b) => [a / s, b / s];
export function box(b, mat, opt = {}) {
  const [x0, x1, y0, y1, z0, z1] = b;
  const geo = opt.rounded ? new RoundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, 2, opt.rounded) : new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  geo.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  if (opt.uv !== false) bakeUV(geo, opt.side || sc(opt.s || 1), opt.top || ((x, z) => [x / (opt.s || 1), -z / (opt.s || 1)]));
  const m = new THREE.Mesh(geo, mat); m.castShadow = opt.cast !== false; m.receiveShadow = true; return m;
}

// ---------- materials ----------
export function makeMaterials() {
  const M = {};
  const std = o => new THREE.MeshStandardMaterial(o);
  M.drive = std({ map: drivewayTexture(), roughness: 0.86 }); M.drive.bumpMap = M.drive.map; M.drive.bumpScale = 1.2;
  M.bed = std({ color: '#9a8f7c', roughness: 1 });
  M.soil = std({ map: soilTexture(), roughness: 1 });
  M.concrete = std({ map: concreteTexture(), roughness: 0.92 });
  M.concreteLight = std({ map: concreteTexture('#c9c6c0'), roughness: 0.88 });
  M.epoxy = std({ color: '#9ea3a8', map: concreteTexture('#b4b8bc'), roughness: 0.32, metalness: 0.05 });
  M.grass = std({ map: grassTexture(), roughness: 0.95 }); M.grass.bumpMap = M.grass.map; M.grass.bumpScale = 2;
  M.leaf = std({ map: leafTexture(), roughness: 0.9 }); M.leaf.bumpMap = M.leaf.map; M.leaf.bumpScale = 4;
  M.stock = std({ map: facadeTexture([196, 168, 120]), roughness: 0.9 }); M.stock.bumpMap = M.stock.map; M.stock.bumpScale = 1.5;
  M.redBrick = std({ map: facadeTexture([150, 72, 52]), roughness: 0.9 });
  M.render = std({ color: '#ece8e0', roughness: 0.85 });
  M.stone = std({ color: '#e4ded2', roughness: 0.7 });
  M.slab = std({ map: slabTexture(), roughness: 0.9 });
  M.asphalt = std({ map: asphaltTexture(), roughness: 0.95 });
  M.kerb = std({ color: '#b8b5ae', roughness: 0.8 });
  M.frame = std({ color: '#1b1d20', roughness: 0.45, metalness: 0.6 });
  M.whiteFrame = std({ color: '#f2f2ee', roughness: 0.5 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: '#25343f', roughness: 0.04, metalness: 0.1, envMapIntensity: 1.6, reflectivity: 0.9 });
  M.door = std({ color: '#1f2b33', roughness: 0.4, metalness: 0.2 });
  M.steel = std({ color: '#8d9298', roughness: 0.34, metalness: 0.9 });
  M.darkSteel = std({ color: '#3a3e44', roughness: 0.45, metalness: 0.85 });
  M.tread = std({ map: treadTexture(), roughness: 0.4, metalness: 0.85 }); M.tread.bumpMap = M.tread.map; M.tread.bumpScale = 3;
  M.yellow = std({ color: '#f0b51c', roughness: 0.42, metalness: 0.35 });
  M.hazard = std({ color: '#111', roughness: 0.5 });
  M.chrome = std({ color: '#f4f6f8', roughness: 0.06, metalness: 1 });
  M.blueGrey = std({ color: '#2f4a66', roughness: 0.45, metalness: 0.5 });
  M.brass = std({ color: '#c79a3b', roughness: 0.3, metalness: 1 });
  M.hose = std({ color: '#141414', roughness: 0.65 });
  M.rubber = std({ color: '#151515', roughness: 0.92 });
  M.grating = std({ map: gratingTexture(), roughness: 0.5, metalness: 0.7 });
  M.ductMetal = std({ color: '#b9bec4', roughness: 0.3, metalness: 0.9 });
  M.ventGreen = std({ color: '#2f3d2c', roughness: 0.55, metalness: 0.5 });
  M.bark = std({ color: '#4a3a2c', roughness: 1 });
  M.ledStrip = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff4e2', emissiveIntensity: 3 });
  M.bayLine = std({ color: '#f2c230', roughness: 0.6 });
  M.brick = std({ color: '#ffffff', roughness: 0.85 });
  M.skin = new THREE.MeshPhysicalMaterial({ color: '#d39a7c', roughness: 0.55, sheen: 0.4, sheenColor: '#ffcfb5' });
  M.nail = std({ color: '#efc9bd', roughness: 0.25 });
  M.sleeve = std({ color: '#26324a', roughness: 0.9 });
  M.pump = std({ color: '#1e5fa8', roughness: 0.4, metalness: 0.4 });
  M.water = new THREE.MeshPhysicalMaterial({ color: '#5aa9e6', roughness: 0.05, transmission: 0, transparent: true, opacity: 0.75 });
  return M;
}

// ---------- car ----------
export function makeCar(M, paint, plate = 'LN24 GRG') {
  const g = new THREE.Group();
  const body = new THREE.MeshPhysicalMaterial({ color: paint, metalness: 0.45, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 0.9 });
  const s = new THREE.Shape();
  s.moveTo(-2.33, 0.30); s.lineTo(-1.92, 0.30);
  s.absarc(-1.45, 0.36, 0.47, Math.PI - 0.13, 0.13, true);
  s.lineTo(-0.98, 0.30); s.lineTo(0.98, 0.30);
  s.absarc(1.45, 0.36, 0.47, Math.PI - 0.13, 0.13, true);
  s.lineTo(1.92, 0.30); s.lineTo(2.22, 0.30);
  s.quadraticCurveTo(2.40, 0.34, 2.40, 0.52); s.lineTo(2.38, 0.70);
  s.quadraticCurveTo(2.32, 0.85, 2.0, 0.88); s.lineTo(1.10, 1.0); s.lineTo(-1.40, 1.03);
  s.lineTo(-2.05, 0.99); s.quadraticCurveTo(-2.36, 0.97, -2.38, 0.78); s.lineTo(-2.40, 0.50);
  s.quadraticCurveTo(-2.40, 0.32, -2.33, 0.30);
  const ext = (shape, depth, bev) => {
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.75, bevelSegments: 4, curveSegments: 28 });
    geo.rotateY(-Math.PI / 2); geo.translate(depth / 2, 0, 0); return geo;
  };
  const bm = new THREE.Mesh(ext(s, 1.76, 0.06), body); bm.castShadow = true; bm.receiveShadow = true; g.add(bm);
  const gh = new THREE.Shape();
  gh.moveTo(1.12, 1.0); gh.quadraticCurveTo(0.75, 1.28, 0.32, 1.42); gh.quadraticCurveTo(-0.15, 1.49, -0.6, 1.42); gh.quadraticCurveTo(-1.1, 1.25, -1.45, 1.03); gh.lineTo(1.12, 1.0);
  const glass = new THREE.MeshStandardMaterial({ color: '#0a1016', roughness: 0.06, metalness: 0.35, envMapIntensity: 0.65 });
  const gm = new THREE.Mesh(ext(gh, 1.48, 0.06), glass); gm.castShadow = true; g.add(gm);
  // roof skin + pillars
  const rf = new THREE.Shape(); rf.moveTo(0.36, 1.405); rf.quadraticCurveTo(-0.15, 1.5, -0.66, 1.4); rf.lineTo(-0.6, 1.36); rf.quadraticCurveTo(-0.15, 1.45, 0.3, 1.37); rf.lineTo(0.36, 1.405);
  const rm = new THREE.Mesh(ext(rf, 1.36, 0.05), body); rm.castShadow = true; g.add(rm);
  for (const sx of [-1, 1]) {
    const bp = box([sx * 0.79 - 0.03, sx * 0.79 + 0.03, 1.02, 1.42, -0.22, -0.08], M.frame, { uv: false }); g.add(bp);
    const tr = box([sx * 0.885 - 0.012, sx * 0.885 + 0.012, 1.0, 1.03, -1.35, 1.05], M.chrome, { uv: false }); g.add(tr);
    const mir = box([Math.min(sx * 0.86, sx * 1.04), Math.max(sx * 0.86, sx * 1.04), 0.98, 1.08, 0.82, 0.98], body, { uv: false, rounded: 0.03 }); g.add(mir);
    for (const sz of [-1, 1]) { // wheels
      const w = new THREE.Group(); w.position.set(sx * 0.83, 0.36, sz * 1.45);
      const ty = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 40).rotateZ(Math.PI / 2), M.rubber); ty.castShadow = true; w.add(ty);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.27, 32).rotateZ(Math.PI / 2), M.darkSteel); w.add(rim);
      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.285, 16).rotateZ(Math.PI / 2), M.chrome); w.add(face);
      for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.45, 0.05), M.chrome); sp.position.x = sx * 0.135; sp.rotation.x = k / 5 * Math.PI; w.add(sp); }
      const cal = box([-0.05, 0.05, 0.05, 0.2, -0.08, 0.08], new THREE.MeshStandardMaterial({ color: '#b3121c', roughness: 0.4 }), { uv: false }); cal.position.x = sx * 0.06; w.add(cal);
      g.add(w);
    }
  }
  g.add(box([-0.78, 0.78, 0.2, 0.42, -2.1, 2.1], M.rubber, { uv: false }));
  const hl = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#e8f2ff', emissiveIntensity: 2.2 });
  for (const sx of [-1, 1]) { const h = box([-0.24, 0.24, 0.73, 0.79, 2.28, 2.36], hl, { uv: false }); h.position.x = sx * 0.58; g.add(h); }
  g.add(box([-0.48, 0.48, 0.42, 0.66, 2.33, 2.42], M.frame, { uv: false }));
  const tl = new THREE.MeshStandardMaterial({ color: '#7a0d10', emissive: '#d0101a', emissiveIntensity: 0.55, roughness: 0.2 });
  g.add(box([-0.8, 0.8, 0.85, 0.885, -2.42, -2.37], tl, { uv: false }));
  const fp = new THREE.MeshStandardMaterial({ map: plateTexture(plate, false), roughness: 0.4 });
  const rp = new THREE.MeshStandardMaterial({ map: plateTexture(plate, true), roughness: 0.4 });
  const pf = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.12), fp); pf.position.set(0, 0.36, 2.425); g.add(pf);
  const pr = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.12), rp); pr.position.set(0, 0.62, -2.43); pr.rotation.y = Math.PI; g.add(pr);
  for (const sx of [-1, 1]) { const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 16).rotateX(Math.PI / 2), M.chrome); ex.position.set(sx * 0.5, 0.33, -2.38); g.add(ex); }
  g.userData.tail = [new THREE.Vector3(-0.5, 0.33, -2.45), new THREE.Vector3(0.5, 0.33, -2.45)];
  return g;
}

// ---------- foliage ----------
export function tree(M, x, z, s = 1, seed = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.2 * s, 3.2 * s, 10), M.bark); tr.position.y = 1.6 * s; tr.castShadow = true; g.add(tr);
  const r = rng(seed);
  for (let i = 0; i < 9; i++) {
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry((0.9 + r() * 0.7) * s, 2), M.leaf);
    f.position.set((r() - 0.5) * 2.2 * s, (3.2 + r() * 1.6) * s, (r() - 0.5) * 2.2 * s); f.scale.y = 0.85; f.castShadow = true; f.receiveShadow = true; g.add(f);
  }
  return g;
}
export function hedge(M, b) { return box(b, M.leaf, { rounded: 0.18, s: 1.2 }); }
