// ===== River valley + bridge components =====
import * as THREE from 'three';
import { clamp, lerp, hash } from './common.js';

export const WATER_Y = -0.9, BED_Y = -2.0, HW = 3.4, BANK = 1.2;
export const LOG_R = 0.27, LOG_L = 11, LOG_X = 1.0, DECK_Y = 0.61, SPAN = 4.6, PIER_Z = 1.55, POST_X = 1.75;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function ctex(c, rx = 1, ry = 1, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t; }
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return lerp(lerp(a, b, u), lerp(c, d, u), v); }
const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.28 + vnoise(x * 4.3, y * 4.3) * 0.17;

export function riverC(x) { if (x > 12) return 3.6 * Math.sin((x - 12) / 13) * ss(12, 28, x); if (x < -12) return -3.2 * Math.sin((-x - 12) / 15) * ss(12, 28, -x); return 0; }
export function height(x, z) {
  const d = Math.abs(z - riverC(x)), far = ss(6, 14, Math.abs(x));
  const hw = HW + far * 0.5 * Math.sin(x * 0.13);
  let y;
  if (d < hw) y = BED_Y + 0.15 * ss(0, hw, d) + (fbm(x * 0.8, z * 0.8) - 0.5) * 0.12;
  else if (d < hw + BANK) { const k = (d - hw) / BANK; y = lerp(BED_Y, 0, k * k * (3 - 2 * k)); }
  else y = (fbm(x * 0.15, z * 0.15) - 0.5) * 0.3 * ss(6, 12, Math.hypot(x, z * 0.6)) + ss(22, 70, d) * (5 + 4 * Math.sin(x * 0.045 + 1));
  return y;
}

// ---------- textures ----------
function detailTex() {
  const [c, g] = cv(512, 512); g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, 512, 512);
  const r = rng(4);
  for (let i = 0; i < 26000; i++) { const x = r() * 512, y = r() * 512, v = 175 + r() * 80; g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 1 + r(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + r() * 4 - 2, y - 2 - r() * 5); g.stroke(); }
  for (let i = 0; i < 400; i++) { const v = 150 + r() * 60; g.fillStyle = `rgba(${v},${v},${v},0.5)`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 2 + r() * 5, 1.5 + r() * 3, r() * 3, 0, 7); g.fill(); }
  return ctex(c, 70, 70);
}
function barkTex() {
  const [c, g] = cv(512, 1024); g.fillStyle = '#5b4330'; g.fillRect(0, 0, 512, 1024);
  const r = rng(17);
  for (let i = 0; i < 260; i++) { const x = r() * 512, w = 4 + r() * 16; const v = r(); g.fillStyle = v < 0.5 ? `rgba(38,26,18,${0.4 + r() * 0.4})` : `rgba(130,104,78,${0.25 + r() * 0.3})`; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= 1024; y += 64) g.lineTo(x + Math.sin(y * 0.01 + i) * 8, y); g.lineTo(x + w, 1024); for (let y = 1024; y >= 0; y -= 64) g.lineTo(x + w + Math.sin(y * 0.012 + i) * 8, y); g.fill(); }
  for (let i = 0; i < 160; i++) { g.strokeStyle = 'rgba(25,16,10,0.55)'; g.lineWidth = 2 + r() * 3; const x = r() * 512, y = r() * 1024; g.beginPath(); g.moveTo(x, y); g.lineTo(x + r() * 30 - 15, y + 8); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(90,120,60,${0.15 + r() * 0.2})`; g.beginPath(); g.ellipse(r() * 512, r() * 1024, 10 + r() * 30, 6 + r() * 20, 0, 0, 7); g.fill(); }
  return ctex(c, 2, 5);
}
function ringTex() {
  const [c, g] = cv(256, 256); const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, '#d9b583'); gr.addColorStop(0.85, '#c49866'); gr.addColorStop(0.9, '#5b4330'); gr.addColorStop(1, '#3d2a1c');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  for (let k = 6; k < 110; k += 5 + (k % 7)) { g.strokeStyle = `rgba(120,80,45,${0.3 + (k % 3) * 0.12})`; g.lineWidth = 1.5; g.beginPath(); g.arc(128 + Math.sin(k) * 2, 128, k, 0, 7); g.stroke(); }
  g.strokeStyle = 'rgba(70,40,20,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(128, 128); g.lineTo(200, 90); g.stroke();
  const t = ctex(c); t.repeat.set(1, 1); return t;
}
function plankTex() {
  const [c, g] = cv(1024, 128); g.fillStyle = '#b08355'; g.fillRect(0, 0, 1024, 128);
  const r = rng(23);
  for (let i = 0; i < 70; i++) { const y = r() * 128, v = r(); g.strokeStyle = v < 0.5 ? `rgba(110,72,40,${0.3 + r() * 0.4})` : `rgba(210,170,120,${0.2 + r() * 0.3})`; g.lineWidth = 1 + r() * 2.5; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 1024; x += 32) g.lineTo(x, y + Math.sin(x * 0.006 + i) * 5 + Math.sin(x * 0.03 + i * 2) * 1.5); g.stroke(); }
  for (let i = 0; i < 3; i++) { const x = 100 + r() * 820, y = 20 + r() * 88; g.fillStyle = 'rgba(90,55,25,0.7)'; g.beginPath(); g.ellipse(x, y, 10, 6, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(90,55,25,0.4)'; g.beginPath(); g.ellipse(x, y, 18, 10, 0, 0, 7); g.stroke(); }
  g.fillStyle = '#444'; for (const x of [40, 984]) for (const y of [34, 94]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
  return ctex(c);
}
function timberTex(base) {
  const [c, g] = cv(128, 512); g.fillStyle = base; g.fillRect(0, 0, 128, 512);
  const r = rng(base.length * 3 + 5);
  for (let i = 0; i < 40; i++) { const x = r() * 128; g.strokeStyle = r() < 0.5 ? `rgba(60,40,22,${0.25 + r() * 0.35})` : `rgba(200,160,110,${0.2 + r() * 0.2})`; g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= 512; y += 32) g.lineTo(x + Math.sin(y * 0.02 + i) * 3, y); g.stroke(); }
  return ctex(c, 1, 2);
}
function waterNormal() {
  const N = 256, [c, g] = cv(N, N), img = g.createImageData(N, N);
  const h = (x, y) => Math.sin((x / N) * Math.PI * 2 * 3 + Math.sin((y / N) * Math.PI * 2 * 2) * 1.2) * 0.5 + Math.sin((y / N) * Math.PI * 2 * 5 + (x / N) * Math.PI * 2 * 2) * 0.35 + Math.sin(((x + y) / N) * Math.PI * 2 * 7) * 0.15;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1); const n = new THREE.Vector3(-dx * 3, -dy * 3, 1).normalize(); const i = (y * N + x) * 4; img.data[i] = (n.x * 0.5 + 0.5) * 255; img.data[i + 1] = (n.y * 0.5 + 0.5) * 255; img.data[i + 2] = (n.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0); return ctex(c, 18, 18, false);
}
function meshTex() {
  const [c, g] = cv(256, 256); g.clearRect(0, 0, 256, 256); g.strokeStyle = '#2a2d31'; g.lineWidth = 5;
  for (let i = -256; i < 512; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke(); g.beginPath(); g.moveTo(i, 256); g.lineTo(i + 256, 0); g.stroke(); }
  const t = ctex(c, 4, 1); return t;
}

export function makeWorldMaterials() {
  const W = {};
  W.terrain = new THREE.MeshStandardMaterial({ vertexColors: true, map: detailTex(), roughness: 0.95 });
  W.bark = new THREE.MeshStandardMaterial({ map: barkTex(), roughness: 0.95 }); W.bark.bumpMap = W.bark.map; W.bark.bumpScale = 6;
  W.ring = new THREE.MeshStandardMaterial({ map: ringTex(), roughness: 0.8 });
  W.plank = new THREE.MeshStandardMaterial({ map: plankTex(), roughness: 0.75 }); W.plank.bumpMap = W.plank.map; W.plank.bumpScale = 1.5;
  W.post = new THREE.MeshStandardMaterial({ map: timberTex('#7a5a3a'), roughness: 0.85 }); W.post.bumpMap = W.post.map; W.post.bumpScale = 2;
  W.beam = new THREE.MeshStandardMaterial({ map: timberTex('#8e6a44'), roughness: 0.8 }); W.beam.bumpMap = W.beam.map; W.beam.bumpScale = 2;
  W.brace = new THREE.MeshStandardMaterial({ map: timberTex('#a77d50'), roughness: 0.8 });
  W.rail = new THREE.MeshStandardMaterial({ map: timberTex('#c79a63'), roughness: 0.6 });
  W.mesh = new THREE.MeshStandardMaterial({ map: meshTex(), alphaTest: 0.5, transparent: false, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4 });
  W.water = new THREE.MeshPhysicalMaterial({ color: '#2f7383', roughness: 0.06, metalness: 0.0, transparent: true, opacity: 0.86, normalMap: waterNormal(), normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.1, clearcoat: 1, clearcoatRoughness: 0.05 });
  W.waterFace = new THREE.MeshStandardMaterial({ color: '#3b8fa3', transparent: true, opacity: 0.38, roughness: 0.2, depthWrite: false, side: THREE.DoubleSide });
  W.soilFace = new THREE.MeshStandardMaterial({ color: '#6b5238', roughness: 1 });
  W.leaf = [new THREE.MeshStandardMaterial({ color: '#3f6b2a', roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: '#2f5a26', roughness: 0.9 })];
  W.pine = new THREE.MeshStandardMaterial({ color: '#264a2a', roughness: 0.9 });
  W.trunk = new THREE.MeshStandardMaterial({ color: '#4d3a2a', roughness: 1 });
  W.rock = new THREE.MeshStandardMaterial({ color: '#8b8c88', roughness: 0.85, flatShading: true });
  W.grassBlade = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, side: THREE.DoubleSide });
  W.reed = new THREE.MeshStandardMaterial({ color: '#6f8a3a', roughness: 0.9 });
  W.rope = new THREE.MeshStandardMaterial({ color: '#c8a46a', roughness: 0.9 });
  W.flower = [new THREE.MeshStandardMaterial({ color: '#ffd23f', roughness: 0.7 }), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), new THREE.MeshStandardMaterial({ color: '#e36fa0', roughness: 0.7 })];
  return W;
}

// ---------- terrain ----------
export function makeTerrain(W) {
  const S = 170, N = 420;
  const geo = new THREE.PlaneGeometry(S, S, N, N); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  // denser sampling near the bridge: warp grid
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), z = p.getZ(i);
    const wx = Math.sign(x) * Math.pow(Math.abs(x) / (S / 2), 1.6) * (S / 2), wz = Math.sign(z) * Math.pow(Math.abs(z) / (S / 2), 1.6) * (S / 2);
    x = wx; z = wz; const y = height(x, z); p.setXYZ(i, x, y, z);
    const d = Math.abs(z - riverC(x)), n = fbm(x * 0.3, z * 0.3);
    if (y < -0.05 && d < HW + BANK) { // bank + bed
      const wet = ss(-0.95, -0.6, y);
      c.set(y < WATER_Y ? '#8a7a60' : '#7b5e40').lerp(new THREE.Color('#5c4630'), (1 - wet) * 0.3 * (y > WATER_Y ? 1 : 0));
      c.offsetHSL(0, 0, (n - 0.5) * 0.08);
    } else {
      c.set('#5f8f35').lerp(new THREE.Color('#7da345'), n).lerp(new THREE.Color('#4a7a2c'), ss(0.6, 0.9, fbm(x * 0.07 + 9, z * 0.07)));
      if (Math.abs(x) < 1.75 + (n - 0.5) * 0.3 && d > HW + BANK - 0.2 && d < 40) c.set('#8f7553').offsetHSL(0, 0, (n - 0.5) * 0.08); // dirt track
      else if (Math.abs(x) < 2.2 && d > HW + BANK - 0.2 && d < 40) c.lerp(new THREE.Color('#8f7553'), 0.5);
      if (d < HW + BANK + 0.6) c.lerp(new THREE.Color('#6d5a3a'), ss(HW + BANK + 0.6, HW + BANK, d) * 0.6);
    }
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, W.terrain); m.receiveShadow = true; return m;
}

// ---------- vegetation ----------
export function makeVegetation(W) {
  const g = new THREE.Group(), r = rng(31), dummy = new THREE.Object3D(), col = new THREE.Color();
  // trees (instanced: trunks, round foliage, pines)
  const trees = [];
  for (let i = 0; i < 2000 && trees.length < 190; i++) {
    const x = (r() - 0.5) * 150, z = (r() - 0.5) * 150; const d = Math.abs(z - riverC(x));
    if (d < 8.5 || (Math.abs(x) < 4.5 && Math.abs(z) < 60) || Math.hypot(x, z) > 78) continue;
    if (Math.abs(x) < 9 && Math.abs(z) < 12) continue;
    trees.push([x, z, 0.8 + r() * 0.6, r() < 0.35]);
  }
  // a few close hero trees framing the crossing
  trees.push([-10.5, 13.5, 1.1, false], [-8.5, -10, 1.15, false], [6.8, -9.5, 1.0, true]);
  const nB = trees.filter(t => !t[3]).length * 7, nP = trees.filter(t => t[3]).length * 3;
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.2, 3.2, 8), W.trunk, trees.length);
  const blob = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), W.leaf[0], nB);
  const pine = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 2.2, 10), W.pine, nP);
  let ib = 0, ip = 0;
  trees.forEach(([x, z, s, isPine], i) => {
    const y = height(x, z);
    dummy.position.set(x, y + 1.6 * s, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(s, s, s); dummy.updateMatrix(); trunk.setMatrixAt(i, dummy.matrix);
    if (isPine) for (let k = 0; k < 3; k++) { const sc = s * (1.5 - k * 0.38); dummy.position.set(x, y + s * (2.2 + k * 1.25), z); dummy.scale.set(sc, sc * 1.1, sc); dummy.updateMatrix(); pine.setMatrixAt(ip, dummy.matrix); col.set('#264a2a').offsetHSL(0, 0, (r() - 0.5) * 0.06); pine.setColorAt(ip++, col); }
    else for (let k = 0; k < 7; k++) { const rr = (0.9 + r() * 0.7) * s; dummy.position.set(x + (r() - 0.5) * 2.0 * s, y + (3.3 + r() * 1.6) * s, z + (r() - 0.5) * 2.0 * s); dummy.scale.set(rr, rr * 0.85, rr); dummy.updateMatrix(); blob.setMatrixAt(ib, dummy.matrix); col.set(r() < 0.5 ? '#3f6b2a' : '#4d7d30').offsetHSL((r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.08); blob.setColorAt(ib++, col); }
  });
  for (const m of [trunk, blob, pine]) { m.castShadow = true; m.receiveShadow = true; g.add(m); }
  // grass tufts near the crossing
  const NG = 5200, tuft = new THREE.InstancedMesh(new THREE.ConeGeometry(0.035, 0.2, 3, 1, true).translate(0, 0.1, 0), W.grassBlade, NG);
  let ng = 0;
  for (let i = 0; i < 40000 && ng < NG; i++) {
    const x = (r() - 0.5) * 36, z = (r() - 0.5) * 40; const d = Math.abs(z - riverC(x));
    if (d < HW + BANK + 0.15 || Math.abs(x) < 2.0) continue;
    const s = 0.5 + r() * 0.7; dummy.position.set(x, height(x, z) - 0.02, z); dummy.rotation.set((r() - 0.5) * 0.5, r() * 6, (r() - 0.5) * 0.5); dummy.scale.set(s, s * (0.7 + r() * 0.8), s); dummy.updateMatrix(); tuft.setMatrixAt(ng, dummy.matrix);
    col.set(r() < 0.5 ? '#5f9a34' : '#7fb244').offsetHSL(0, 0, (r() - 0.5) * 0.1); tuft.setColorAt(ng++, col);
  }
  tuft.count = ng; tuft.receiveShadow = true; g.add(tuft); g.userData.cull = [tuft];
  // flowers
  for (let k = 0; k < 3; k++) { const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 6, 4), W.flower[k], 140); let nf = 0; for (let i = 0; i < 3000 && nf < 140; i++) { const x = (r() - 0.5) * 30, z = (r() - 0.5) * 34; const d = Math.abs(z - riverC(x)); if (d < HW + BANK + 0.4 || Math.abs(x) < 2.2) continue; dummy.position.set(x, height(x, z) + 0.2, z); dummy.scale.setScalar(0.8 + r()); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); fl.setMatrixAt(nf++, dummy.matrix); } fl.count = nf; g.add(fl); g.userData.cull.push(fl); }
  // reeds at the waterline
  const NR = 900, reed = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.014, 1, 4).translate(0, 0.5, 0), W.reed, NR); let nr = 0;
  for (let i = 0; i < 20000 && nr < NR; i++) {
    const x = (r() - 0.5) * 50, side = r() < 0.5 ? 1 : -1, d = HW + 0.45 + r() * 0.75, z = riverC(x) + side * d;
    if (Math.abs(x) < 3.2) continue; if (r() < 0.5 && Math.abs(x) > 18) continue;
    const y = height(x, z); dummy.position.set(x, y, z); dummy.rotation.set((r() - 0.5) * 0.35, 0, (r() - 0.5) * 0.35); const h = 0.6 + r() * 0.9; dummy.scale.set(1, h, 1); dummy.updateMatrix(); reed.setMatrixAt(nr, dummy.matrix); col.set(r() < 0.6 ? '#6f8a3a' : '#a5a052'); reed.setColorAt(nr++, col);
  }
  reed.count = nr; reed.castShadow = true; g.add(reed); g.userData.cull.push(reed);
  for (const m of g.userData.cull) m.userData.orig = Float32Array.from(m.instanceMatrix.array);
  // rocks
  const NK = 120, rock = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), W.rock, NK); let nk = 0;
  for (let i = 0; i < 5000 && nk < NK; i++) {
    const x = (r() - 0.5) * 44, side = r() < 0.5 ? 1 : -1, d = HW - 0.4 + r() * 2.2, z = riverC(x) + side * d;
    if (Math.abs(x) < 3.0) continue;
    const s = 0.12 + r() * 0.35; dummy.position.set(x, height(x, z) + s * 0.2, z); dummy.rotation.set(r() * 3, r() * 3, r() * 3); dummy.scale.set(s * (1 + r() * 0.6), s * 0.6, s); dummy.updateMatrix(); rock.setMatrixAt(nk, dummy.matrix); col.set('#8b8c88').offsetHSL(0.05 * r(), 0, (r() - 0.5) * 0.15); rock.setColorAt(nk++, col);
  }
  rock.count = nk; rock.castShadow = true; rock.receiveShadow = true; g.add(rock);
  return g;
}
const _zero = new THREE.Matrix4().makeScale(1e-5, 1e-5, 1e-5).elements;
export function cullNear(g, cx, cz, R) {
  const k = Math.round(cx * 50) + ',' + Math.round(cz * 50) + ',' + R; if (g.userData.k === k) return; g.userData.k = k;
  for (const m of g.userData.cull) { const o = m.userData.orig, a = m.instanceMatrix.array; for (let i = 0; i < m.count; i++) { const x = o[i * 16 + 12], z = o[i * 16 + 14], near = (x - cx) ** 2 + (z - cz) ** 2 < R * R; for (let j = 0; j < 16; j++) a[i * 16 + j] = near ? _zero[j] : o[i * 16 + j]; } m.instanceMatrix.needsUpdate = true; }
}

// ---------- logs (bendable) ----------
export function makeLog(W, seed) {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(LOG_R, LOG_R * 1.06, LOG_L, 28, 44, false); geo.rotateX(Math.PI / 2);
  // irregularity
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const a = Math.atan2(y, x); const k = 1 + (vnoise(a * 2 + seed, z * 0.6) - 0.5) * 0.08; p.setXYZ(i, x * k, y * k, z); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, [W.bark, W.ring, W.ring]); m.castShadow = true; m.receiveShadow = true; g.add(m);
  g.userData.base = Float32Array.from(p.array); g.userData.mesh = m; g.userData.sag = -1;
  // a couple of cut branch stubs on the outer side
  for (const z of [-3.1, 2.4]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.22, 10), [W.bark, W.ring, W.ring]); st.position.set(seed > 1 ? 0.25 : -0.25, -0.02, z); st.rotation.z = seed > 1 ? -1.3 : 1.3; st.castShadow = true; g.add(st); }
  return g;
}
export function sagAt(z, sag) { const a = Math.abs(z); if (a >= SPAN) return 0; return -sag * Math.pow(Math.cos(Math.PI * z / (2 * SPAN)), 2); }
export function bendLog(log, sag) {
  if (Math.abs(log.userData.sag - sag) < 1e-5) return; log.userData.sag = sag;
  const p = log.userData.mesh.geometry.attributes.position, b = log.userData.base;
  for (let i = 0; i < p.count; i++) p.setY(i, b[i * 3 + 1] + sagAt(b[i * 3 + 2], sag));
  p.needsUpdate = true; log.userData.mesh.geometry.computeVertexNormals();
}
