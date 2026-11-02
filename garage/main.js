// ===== The Secret Underground Garage — scene assembly, direction & overlays =====
import * as THREE from 'three';
import { makeMaterials, makeCar, box, tree, hedge, brickRGB, clamp, lerp, hash, BX, BZ, BX0, BZ0, DRV } from './world.js';

const W = 1080, H = 1920;
const P = (t, a, b) => clamp((t - a) / (b - a));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eo = t => 1 - Math.pow(1 - t, 3);
const ei = t => t * t * t;
const smooth = t => t * t * (3 - 2 * t);

// ---------------- renderer ----------------
const glc = document.getElementById('gl'), out = document.getElementById('out'), ctx = out.getContext('2d');
const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, 0.03, 400);
const M = makeMaterials();

// sky backgrounds + environment
function skyTex(stops) { const c = document.createElement('canvas'); c.width = 4; c.height = 512; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 512); stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 4, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const SKY = { day: skyTex([[0, '#3f7fc4'], [0.45, '#8fbde6'], [0.75, '#d9e8f2'], [1, '#eef1ea']]), rain: skyTex([[0, '#5a6470'], [0.5, '#8c959e'], [1, '#aab1b6']]), gold: skyTex([[0, '#3d6fb0'], [0.5, '#9fc2e0'], [0.8, '#f2dcc0'], [1, '#f6e4cc']]) };
{
  const es = new THREE.Scene();
  const sg = new THREE.SphereGeometry(50, 32, 16);
  const sm = new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: {}, vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'varying vec3 vP; void main(){ float h=normalize(vP).y; vec3 sky=mix(vec3(0.85,0.9,0.95),vec3(0.25,0.5,0.85),clamp(h,0.,1.)); vec3 gr=mix(vec3(0.45,0.42,0.38),vec3(0.22,0.2,0.18),clamp(-h*3.,0.,1.)); gl_FragColor=vec4(h>0.?sky*1.2:gr,1.);}' });
  es.add(new THREE.Mesh(sg, sm));
  const sun = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(30, 28, 24) })); sun.position.set(25, 35, 20); es.add(sun);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(60, 2, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3) })); strip.position.set(0, 20, -40); es.add(strip);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, 0.02).texture;
}
scene.fog = new THREE.Fog('#dfe8ee', 45, 160);

const hemi = new THREE.HemisphereLight('#d6e6ff', '#6a5a48', 0.9); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff3e0', 3.2); sun.position.set(14, 22, 16); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 80 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025; scene.add(sun); scene.add(sun.target);

// ---------------- groups ----------------
const G = {};
for (const k of ['back', 'front', 'mid', 'midSoil', 'filler', 'garage', 'garageFront', 'garGhost', 'lid', 'ghost', 'duct']) { G[k] = new THREE.Group(); scene.add(G[k]); }
const add = (g, m) => { g.add(m); return m; };
const soilUV = { side: (a, y) => [a / 6, 1 + y / 6] };
const earth = (g, b) => add(g, box(b, M.soil, soilUV));
const conc = (g, b, mat = M.concrete) => add(g, box(b, mat, { s: 2.2 }));
const drvTop = (x, z) => [(x - DRV.x0) / (DRV.x1 - DRV.x0), 1 - (z - DRV.z0) / (DRV.z1 - DRV.z0)];
const pave = (g, x0, x1, z0, z1) => add(g, box([x0, x1, -0.08, 0, z0, z1], M.drive, { top: drvTop, side: (a, y) => [a / 7, 0.5 + y], cast: false }));
const lawn = (g, x0, x1, z0, z1) => add(g, box([x0, x1, -0.08, 0.0, z0, z1], M.grass, { s: 2.5, cast: false }));

// --- permanent earth & concrete shaft ---
earth(G.back, [-16, 22, -6, -0.08, -14, -3.15]);
earth(G.back, [-16, -3.05, -6, -0.08, -3.15, 3.15]);
earth(G.back, [-3.05, 12.65, -6, -3.65, -3.15, 3.15]);
earth(G.back, [12.65, 22, -6, -0.08, -3.15, -1.35]);
conc(G.back, [-3.05, 3.05, -3.65, -3.4, -3.15, 3.15]);           // shaft floor
conc(G.back, [-3.05, -2.8, -3.4, -0.2, -2.9, 2.9]);              // left wall
conc(G.back, [-3.05, 3.05, -3.4, -0.2, -3.15, -2.9]);            // back wall
// --- front (removable for cutaways) ---
earth(G.front, [-16, 22, -6, -0.08, 3.15, 16]);
earth(G.front, [12.65, 22, -6, -0.08, -1.35, 3.15]);
conc(G.front, [-3.05, 3.05, -3.4, -0.2, 2.9, 3.15]);
// --- pre-garage filler (S1-S8) ---
earth(G.filler, [3.05, 12.65, -3.65, -0.08, -3.15, -1.35]);
conc(G.filler, [2.8, 3.05, -3.4, -0.2, -2.9, 2.9]);
earth(G.midSoil, [3.05, 12.65, -3.65, -0.08, -1.35, 3.15]);
// --- garage (S9+) ---
const GX1 = 9.6;
earth(G.garage, [3.05, 12.65, -3.65, -2.85, -3.15, 3.15]);
earth(G.garage, [GX1 + 0.25, 12.65, -2.85, -0.08, -3.15, 3.15]);
const ceilSoil = earth(G.garGhost, [2.8, GX1 + 0.25, -0.25, -0.08, -3.15, 3.15]);
conc(G.garage, [3.05, GX1, -2.85, -2.6, -2.9, 2.9], M.epoxy);
conc(G.garage, [2.8, GX1 + 0.25, -2.85, -0.25, -3.15, -2.9], M.concreteLight);
conc(G.garage, [GX1, GX1 + 0.25, -2.85, -0.25, -2.9, 2.9], M.concreteLight);
const ceilSlab = conc(G.garGhost, [2.8, GX1 + 0.25, -0.5, -0.25, -2.9, 2.9], M.concreteLight);
conc(G.garage, [2.8, 3.05, -3.4, -2.6, -2.9, 2.9]);
conc(G.garage, [2.8, 3.05, -0.5, -0.2, -2.9, 2.9]);
conc(G.garageFront, [2.8, GX1 + 0.25, -2.85, -0.25, 2.9, 3.15], M.concreteLight);
for (const bx of [6.35]) add(G.garage, box([bx - 0.05, bx + 0.05, -2.6, -2.595, -2.6, 2.6], M.bayLine, { uv: false, cast: false }));
for (const bx of [4.72, 7.98]) for (const sz of [-1, 1]) add(G.garage, box([bx - 0.5, bx + 0.5, -2.6, -2.48, -2.55 - 0.08, -2.55 + 0.08].map((v, i) => i > 3 ? v * 1 : v), M.yellow, { uv: false }));
for (const lx of [4.72, 7.98]) add(G.garage, box([lx - 0.06, lx + 0.06, -0.53, -0.5, -2.2, 2.2], M.ledStrip, { uv: false, cast: false }));
add(G.garage, box([2.95, 3.0, -2.4, -0.6, 1.0, 1.06], M.ledStrip, { uv: false, cast: false }));

// --- surfaces ---
pave(G.back, -3.4, 3.4, -5.2, -3.02); pave(G.back, -3.4, -2.92, -3.02, 3.15); pave(G.back, 2.92, 3.4, -3.02, 3.15); pave(G.back, -2.92, 2.92, 3.02, 3.15);
pave(G.front, -3.4, 3.4, 3.15, 9.2);
const lawnBack = lawn(G.ghost, 3.4, 12.65, -5.2, -1.35); lawn(G.back, 12.65, 22, -5.2, -1.35);
const lawnMid = lawn(G.mid, 3.4, 12.65, -1.35, 3.15);
lawn(G.front, 3.4, 12.65, 3.15, 9.0); lawn(G.front, 12.65, 22, -1.35, 9.0);
lawn(G.back, -16, -3.4, -5.2, 3.15); lawn(G.front, -16, -3.4, 3.15, 9.0);
add(G.front, box([-16, 22, -0.08, 0.04, 9.2, 11.6], M.slab, { s: 1.2, cast: false }));
add(G.front, box([-16, 22, -0.12, 0.04, 11.6, 11.78], M.kerb, { s: 1, cast: false }));
add(G.front, box([-16, 22, -0.12, -0.06, 11.78, 26], M.asphalt, { s: 4, cast: false }));
for (let x = -14; x < 22; x += 4) add(G.front, box([x, x + 2, -0.06, -0.055, 18.6, 18.75], M.stone, { uv: false, cast: false }));
for (const [x0, x1] of [[-16, -3.55], [3.55, 15]]) add(G.front, box([x0, x1, 0, 0.62, 8.75, 9.05], M.redBrick, { side: (a, y) => [a / 2.15, y / 1.5] }));
for (const sx of [-1, 1]) add(G.front, box([sx * 3.55 - 0.2, sx * 3.55 + 0.2, 0, 0.95, 8.7, 9.1], M.redBrick, { side: (a, y) => [a / 2.15, y / 1.5] }));
for (const sx of [-1, 1]) add(G.front, box([sx * 3.55 - 0.24, sx * 3.55 + 0.24, 0.95, 1.02, 8.66, 9.14], M.stone, { uv: false }));
// slot-drain channel ring (grating top + trough)
const chan = [[-2.92, -2.8, -3.02, 3.02], [2.8, 2.92, -3.02, 3.02], [-2.8, 2.8, -3.02, -2.9], [-2.8, 2.8, 2.9, 3.02]];
for (const [x0, x1, z0, z1] of chan) {
  add(G.back, box([x0, x1, -0.012, 0.0, z0, z1], M.grating, { side: (a, y) => [0.5, a * 4], top: (x, z) => [x1 - x0 < 0.2 ? (x - x0) / 0.12 : (z - z0) / 0.12, x1 - x0 < 0.2 ? z * 4 : x * 4], cast: false }));
  add(G.back, box([x0, x1, -0.22, -0.2, z0, z1], M.darkSteel, { uv: false, cast: false }));
}
for (const sx of [-1, 1]) { add(G.back, box([sx * 2.92 - 0.012, sx * 2.92 + 0.012, -0.2, -0.012, -3.02, 3.02], M.darkSteel, { uv: false, cast: false })); add(G.back, box([sx * 2.8 - 0.012, sx * 2.8 + 0.012, -0.2, -0.012, -3.02, 3.02], M.darkSteel, { uv: false, cast: false })); }
const waterSheet = add(G.back, box([2.81, 2.91, -0.19, -0.16, -2.9, 2.9], M.water, { uv: false, cast: false })); waterSheet.visible = false;
// lid used in scene 1 (driveway before the hole is revealed)
add(G.lid, box([-2.92, 2.92, -0.08, 0.002, -3.02, 3.02], M.drive, { top: drvTop, cast: false }));

// --- house & street context ---
const facadeUV = { side: (a, y) => [a / 2.15, y / 1.5] };
add(G.back, box([-6.5, 9.5, 0, 7.6, -15, -5.2], M.stock, facadeUV));
add(G.back, box([-6.65, 9.65, 7.6, 7.78, -15.1, -5.08], M.stone, { uv: false }));
add(G.back, box([-6.55, 9.55, 0, 0.45, -15, -5.15], M.render, { uv: false }));
add(G.back, box([-6.55, 9.55, 3.35, 3.55, -15, -5.12], M.stone, { uv: false }));
function win(x0, x1, y0, y1, white) {
  const fm = white ? M.whiteFrame : M.frame, z = -5.2;
  add(G.back, box([x0, x1, y0, y1, z - 0.02, z + 0.03], M.glass, { uv: false, cast: false }));
  const t = 0.07;
  for (const b of [[x0 - t, x1 + t, y0 - t, y0, z, z + 0.09], [x0 - t, x1 + t, y1, y1 + t, z, z + 0.09], [x0 - t, x0, y0, y1, z, z + 0.09], [x1, x1 + t, y0, y1, z, z + 0.09]]) add(G.back, box(b, fm, { uv: false }));
  const n = Math.max(1, Math.round((x1 - x0) / 1.3));
  for (let i = 1; i < n; i++) { const x = lerp(x0, x1, i / n); add(G.back, box([x - 0.03, x + 0.03, y0, y1, z, z + 0.07], fm, { uv: false })); }
  add(G.back, box([x0 - 0.12, x1 + 0.12, y0 - 0.14, y0 - 0.06, z, z + 0.16], M.stone, { uv: false }));
}
win(-2.4, 3.6, 0.65, 3.05); win(-5.6, -3.7, 0.9, 3.05);
win(-5.4, -3.6, 4.15, 6.75, true); win(-0.9, 0.9, 4.15, 6.75, true); win(2.6, 4.4, 4.15, 6.75, true); win(6.4, 8.2, 4.15, 6.75, true);
add(G.back, box([5.3, 6.7, 0.45, 2.95, -5.25, -5.12], M.door, { uv: false }));
add(G.back, box([5.0, 7.0, 3.0, 3.1, -6.3, -5.2], M.frame, { uv: false }));
add(G.back, box([5.0, 7.0, 0.0, 0.18, -6.2, -5.2], M.stone, { uv: false }));
for (const [x0, x1, h, mat] of [[-19, -6.7, 8.6, M.redBrick], [9.7, 24, 7.2, M.render]]) {
  add(G.back, box([x0, x1, 0, h, -15, -5.6], mat, facadeUV));
  for (let x = x0 + 1.2; x < x1 - 1.4; x += 2.6) for (const y of [1.0, 4.4]) add(G.back, box([x, x + 1.4, y, y + 2.2, -5.62, -5.55], M.glass, { uv: false, cast: false }));
}
add(G.back, hedge(M, [3.5, 15, 0, 0.95, -5.05, -4.35]));
add(G.back, hedge(M, [15.0, 15.8, 0, 1.5, -5.0, -1.35]));
add(G.front, hedge(M, [15.0, 15.8, 0, 1.5, -1.35, 8.6]));
add(G.back, hedge(M, [13.6, 15.0, 0, 1.25, -2.2, -1.4]));
add(G.front, hedge(M, [13.7, 14.0, 0, 1.0, -0.6, -0.1]));
add(G.front, hedge(M, [3.6, 14.8, 0, 0.8, 8.0, 8.65]));
add(G.back, hedge(M, [-9, -3.7, 0, 0.9, -5.05, -4.35]));
add(G.back, tree(M, 17.6, -3.6, 1.15, 3)); add(G.front, tree(M, -9.5, 5.2, 1.0, 7)); add(G.back, tree(M, -12, -3.8, 1.1, 5));
for (const [x, z, s] of [[5.2, -3.9, 0.5], [11.4, -3.8, 0.45], [-5, -3.8, 0.4]]) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 2), M.leaf); b.position.set(x, s * 0.8, z); b.castShadow = true; G.back.add(b); }

// --- keypad post & finger ---
const keypad = new THREE.Group(); keypad.position.set(-3.75, 0, 2.55); G.back.add(keypad);
keypad.add(box([-0.07, 0.07, 0, 1.12, -0.07, 0.07], M.steel, { uv: false }));
keypad.add(box([0.07, 0.08, 0.86, 1.08, -0.06, 0.06], M.glass, { uv: false }));
const btnMat = new THREE.MeshStandardMaterial({ color: '#2a2f35', emissive: '#22ff88', emissiveIntensity: 0.2, metalness: 0.6, roughness: 0.3 });
const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.02, 24).rotateZ(Math.PI / 2), btnMat); btn.position.set(0.085, 0.99, 0); keypad.add(btn);
const ring = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.004, 8, 32).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#22ff88', emissive: '#22ff88', emissiveIntensity: 2 })); ring.position.set(0.09, 0.99, 0); keypad.add(ring);
const finger = new THREE.Group(); keypad.add(finger);
{
  const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.0095, 0.05, 6, 16).rotateZ(Math.PI / 2), M.skin); tip.position.set(0.035, 0, 0); finger.add(tip);
  const nail = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 12, 8), M.nail); nail.scale.set(1.6, 0.35, 1); nail.position.set(0.02, 0.0085, 0); finger.add(nail);
  const mid = new THREE.Mesh(new THREE.CapsuleGeometry(0.0105, 0.05, 6, 16).rotateZ(Math.PI / 2), M.skin); mid.position.set(0.095, -0.004, 0); mid.rotation.z = -0.12; finger.add(mid);
  const hand = box([0.13, 0.25, -0.05, 0.02, -0.045, 0.04], M.skin, { uv: false, rounded: 0.02 }); hand.rotation.z = -0.2; finger.add(hand);
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0105, 0.06, 6, 12).rotateZ(Math.PI / 2), M.skin); f.position.set(0.14, -0.04, -0.03 + i * 0.024); f.rotation.y = 0.3; f.rotation.z = 1.2; finger.add(f); }
  const sl = box([0.24, 0.42, -0.07, 0.04, -0.06, 0.06], M.sleeve, { uv: false, rounded: 0.03 }); sl.rotation.z = -0.25; finger.add(sl);
}
finger.visible = false;

// ---------------- lift ----------------
const lift = new THREE.Group(); scene.add(lift);
lift.add(box([-2.6, 2.6, -0.25, 0, -2.85, 2.85], M.tread, { s: 0.6 }));
for (const sz of [-1, 1]) lift.add(box([-2.6, 2.6, 0, 0.005, sz * 2.85 - 0.08, sz * 2.85 + 0.08].sort((a, b) => 0), M.yellow, { uv: false, cast: false }));
for (const sx of [-1.7, 1.7]) lift.add(box([sx - 0.08, sx + 0.08, -0.33, -0.25, -2.7, 2.7], M.darkSteel, { uv: false }));
const turntable = new THREE.Group(); lift.add(turntable);
{
  const tt = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.45, 0.035, 72), new THREE.MeshStandardMaterial({ color: '#9aa0a7', metalness: 0.9, roughness: 0.28 })); tt.position.y = 0.018; tt.receiveShadow = true; turntable.add(tt);
  const rg = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.025, 8, 96).rotateX(Math.PI / 2), M.yellow); rg.position.y = 0.03; turntable.add(rg);
  for (let i = 0; i < 12; i++) { const l = box([-0.012, 0.012, 0.036, 0.04, 0.4, 2.35], M.darkSteel, { uv: false, cast: false }); l.rotation.y = i / 12 * Math.PI * 2; turntable.add(l); }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.045, 32), M.darkSteel); hub.position.y = 0.022; turntable.add(hub);
}
const roof = new THREE.Group(); lift.add(roof); G.roof = roof;
const posts = [];
for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = box([-0.09, 0.09, 0, 2.3, -0.09, 0.09], M.darkSteel, { uv: false }); p.position.set(sx * 2.45, 0, sz * 2.7); roof.add(p); posts.push(p); }
const tray = box([-2.8, 2.8, 2.3, 2.52, -2.9, 2.9], M.darkSteel, { uv: false }); roof.add(tray);
// paving bricks on lift roof — same pattern & colours as the driveway texture
const bricks = []; {
  for (let r = 0; r < 58; r++) {
    const off = (r % 2) * 0.1, zc = BZ0 + (r + 0.5) * BZ;
    for (let ix = -1; ix < 29; ix++) {
      let xa = BX0 + off + ix * BX, xb = xa + BX; xa = Math.max(xa, -2.8); xb = Math.min(xb, 2.8);
      if (xb - xa < 0.02) continue;
      bricks.push({ x: (xa + xb) / 2, w: xb - xa, z: zc, ix, r, d: (r / 57) * 0.72 + hash(ix, r) * 0.12 });
    }
  }
}
const brickMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.08, BZ - 0.008), M.brick, bricks.length);
brickMesh.castShadow = true; brickMesh.receiveShadow = true; roof.add(brickMesh);
{ const c = new THREE.Color(); bricks.forEach((b, i) => { const [R, Gc, B] = brickRGB(b.ix, b.r); c.setRGB(R / 255, Gc / 255, B / 255, THREE.SRGBColorSpace); brickMesh.setColorAt(i, c); }); }
const dummy = new THREE.Object3D();
let lastBrickP = -1;
function layBricks(p) {
  if (Math.abs(p - lastBrickP) < 1e-4) return; lastBrickP = p;
  bricks.forEach((b, i) => {
    const q = clamp((p - b.d) / 0.16);
    dummy.position.set(b.x, 2.56 + (1 - eo(q)) * 0.9, b.z); dummy.rotation.set(0, (1 - q) * 0.4 * (hash(b.r, b.ix) - 0.5), 0);
    dummy.scale.set(q > 0 ? b.w - 0.008 : 1e-4, q > 0 ? 1 : 1e-4, 1); dummy.updateMatrix(); brickMesh.setMatrixAt(i, dummy.matrix);
  });
  brickMesh.instanceMatrix.needsUpdate = true;
}
// pawls (safety locks on the platform)
const RAILS = [[1, 2.2], [1, -2.2], [-1, 2.2], [-1, -2.2]];
const pawls = RAILS.map(([sx, z]) => {
  lift.add(box([Math.min(sx * 2.4, sx * 2.58), Math.max(sx * 2.4, sx * 2.58), -0.42, -0.25, z - 0.1, z - 0.07], M.darkSteel, { uv: false }));
  const pv = new THREE.Group(); pv.position.set(sx * 2.53, -0.36, z); lift.add(pv);
  const lev = box([-0.03, 0.135, -0.03, 0.03, -0.06, 0.06], M.yellow, { uv: false }); pv.add(lev); pv.scale.x = sx;
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.2, 12).rotateX(Math.PI / 2), M.chrome); pv.add(pin);
  const spr = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 6, 12), M.chrome); spr.position.set(0, 0, 0.065); pv.add(spr);
  return pv;
});
// ratchet rails on shaft walls
const TEETH_Y = Array.from({ length: 10 }, (_, k) => -0.392 - 0.325 * k);
const teeth = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.06, 0.16), M.chrome, RAILS.length * TEETH_Y.length); teeth.castShadow = true; G.back.add(teeth);
RAILS.forEach(([sx, z], j) => {
  G.back.add(box([sx * 2.74 - 0.06, sx * 2.74 + 0.06, -3.4, -0.25, z - 0.09, z + 0.09], M.darkSteel, { uv: false }));
  TEETH_Y.forEach((y, k) => { dummy.position.set(sx * 2.66, y - 0.03, z); dummy.rotation.set(0, 0, sx * 0.3); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); teeth.setMatrixAt(j * TEETH_Y.length + k, dummy.matrix); });
});
// scissor mechanism (world space, solved every frame)
const SC = { arms: [], pins: [], tubes: [], cyl: [] };
for (const sx of [-1.7, 1.7]) {
  G.back.add(box([sx - 0.09, sx + 0.09, -3.4, -3.28, -2.7, 2.7], M.darkSteel, { uv: false }));
  for (const o of [-0.1, 0.1]) { const a = box([-0.06, 0.06, -0.11, 0.11, -2.5, 2.5], M.yellow, { uv: false }); scene.add(a); SC.arms.push({ m: a, x: sx + o, A: o < 0 }); }
}
for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.62, 16).rotateZ(Math.PI / 2), M.darkSteel); t.castShadow = true; scene.add(t); SC.tubes.push(t); }
for (const cx of [-1.2, 1.2]) {
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 1.45, 24), M.blueGrey); body.castShadow = true;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 16), M.chrome); rod.castShadow = true;
  const fit = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.09, 6), M.brass);
  scene.add(body, rod, fit); SC.cyl.push({ cx, body, rod, fit });
}
G.back.add(box([-1.8, 1.8, -3.4, -3.25, -1.36, -1.14], M.darkSteel, { uv: false }));
// power pack + hoses
G.back.add(box([-2.6, -2.0, -3.4, -2.95, -2.75, -2.05], M.pump, { uv: false }));
G.back.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.4, 20), M.darkSteel).translateX(-2.3).translateY(-2.8).translateZ(-2.4));
const hoseCurves = [-1.2, 1.2].map(cx => new THREE.CatmullRomCurve3([new THREE.Vector3(-2.0, -3.1, -2.3), new THREE.Vector3(-1.6, -3.36, -1.9), new THREE.Vector3(cx * 0.6, -3.36, -1.55), new THREE.Vector3(cx, -3.25, -1.32)]));
const hoseMats = [];
hoseCurves.forEach(c => { const hm = M.hose.clone(); hoseMats.push(hm); const m = new THREE.Mesh(new THREE.TubeGeometry(c, 48, 0.028, 10), hm); m.castShadow = true; G.back.add(m); });
function solveScissor(deck) {
  const yb = -3.28, yt = deck - 0.33, h = yt - yb, L = 5.0, a = Math.sqrt(L * L - h * h) / 2, zf = -2.45, zs = zf + 2 * a, ang = Math.atan2(h, 2 * a);
  for (const arm of SC.arms) { arm.m.position.set(arm.x, (yb + yt) / 2, (zf + zs) / 2); arm.m.rotation.set(arm.A ? -ang : ang, 0, 0); }
  const f = 0.62, pts = [[zf, yb], [zf, yt], [zs, yt], [zs, yb], [zf + a, (yb + yt) / 2], [zf + f * 2 * a, yb + f * h]];
  pts.forEach(([z, y], i) => SC.tubes[i].position.set(0, y, z));
  for (const c of SC.cyl) {
    const p0 = new THREE.Vector3(c.cx, yb + 0.1, -1.25), p1 = new THREE.Vector3(c.cx, pts[5][1], pts[5][0]);
    const d = p1.clone().sub(p0), len = d.length(); d.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    c.body.quaternion.copy(q); c.body.position.copy(p0).addScaledVector(d, 0.725);
    const rl = Math.max(0.05, len - 1.45); c.rod.quaternion.copy(q); c.rod.scale.y = rl; c.rod.position.copy(p0).addScaledVector(d, 1.45 + rl / 2);
    c.fit.position.copy(p0).addScaledVector(d, 0.05); c.fit.quaternion.copy(q);
  }
}
// drainage: downpipe, sump & pump, outlet
const PIPE = M.darkSteel;
const pipe = (pts, r = 0.05, g = G.back) => { const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.05); const m = new THREE.Mesh(new THREE.TubeGeometry(c, 64, r, 12), PIPE); m.castShadow = true; g.add(m); return c; };
const downCurve = pipe([[2.86, -0.21, -2.96], [2.7, -0.4, -2.8], [2.7, -3.0, -2.8], [2.5, -3.3, -2.6]]);
G.back.add(box([2.05, 2.75, -3.42, -3.39, -2.85, -2.2], M.grating, { uv: false, cast: false }));
const pumpM = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.5, 24), M.pump); pumpM.position.set(2.3, -3.15, -2.5); G.back.add(pumpM);
const outCurve = pipe([[2.3, -2.9, -2.5], [2.3, -2.6, -2.78], [2.3, -0.7, -2.82], [2.3, -0.5, -3.3]], 0.045);
const channelCurve = new THREE.CatmullRomCurve3([[2.86, -0.17, 2.96], [2.86, -0.17, 0], [2.86, -0.18, -2.96]].map(p => new THREE.Vector3(...p)));
// ventilation: fan in shaft wall, duct under garden, concealed vent in hedge
const fanG = new THREE.Group(); fanG.position.set(2.8, -0.78, -1.0); G.back.add(fanG);
fanG.add(new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.42, 32, 1, true).rotateZ(Math.PI / 2).translate(0.21, 0, 0), M.ductMetal));
const grille = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 8, 40).rotateY(Math.PI / 2), M.darkSteel); fanG.add(grille);
for (let i = 0; i < 4; i++) { const b = box([-0.008, 0.008, -0.3, 0.3, -0.01, 0.01], M.darkSteel, { uv: false }); b.rotation.x = i * Math.PI / 4; fanG.add(b); }
const blades = new THREE.Group(); blades.position.x = 0.12; fanG.add(blades);
for (let i = 0; i < 6; i++) { const b = box([-0.012, 0.012, 0.03, 0.27, -0.06, 0.06], M.steel, { uv: false }); const w = new THREE.Group(); b.rotation.y = 0.5; w.add(b); w.rotation.x = i / 6 * Math.PI * 2; blades.add(w); }
blades.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 8), M.darkSteel));
G.duct.add(box([3.2, 14.25, -0.96, -0.6, -1.25, -0.75], M.ductMetal, { uv: false }));
G.duct.add(box([14.15, 14.65, -0.96, 0.5, -1.25, -0.75], M.ductMetal, { uv: false }));
const vent = new THREE.Group(); vent.position.set(14.4, 0, -1.0); G.back.add(vent);
vent.add(box([-0.36, 0.36, 0.0, 0.62, -0.36, 0.36], M.ventGreen, { uv: false }));
vent.add(box([-0.42, 0.42, 0.62, 0.68, -0.42, 0.42], M.ventGreen, { uv: false }));
for (let i = 0; i < 5; i++) vent.add(box([-0.3, 0.3, 0.1 + i * 0.1, 0.13 + i * 0.1, 0.36, 0.41], M.frame, { uv: false }));
const ductPath = [new THREE.Vector3(2.8, -0.78, -1.0), new THREE.Vector3(14.4, -0.78, -1.0), new THREE.Vector3(14.4, 0.62, -1.0)];

// ---------------- cars ----------------
const hero = makeCar(M, '#102a52', 'LN24 GRG'); scene.add(hero);
const car2 = makeCar(M, '#e9e9e6', 'LD73 KXR'); car2.position.set(4.72, -2.6, 0.1); G.garage.add(car2);
const car3 = makeCar(M, '#3c4046', 'LB22 NOV'); car3.position.set(7.98, -2.6, -0.1); G.garage.add(car3);

// ---------------- lights underground ----------------
const shaftL = [new THREE.PointLight('#fff1dc', 3.5, 9, 2), new THREE.PointLight('#fff1dc', 3.5, 9, 2)];
shaftL[0].position.set(-1.6, -0.45, 1.6); shaftL[1].position.set(1.6, -0.45, -1.8); shaftL.forEach(l => scene.add(l));
const garL = [new THREE.PointLight('#fff4e6', 4, 10, 2), new THREE.PointLight('#fff4e6', 4, 10, 2)];
garL[0].position.set(4.72, -0.8, 0); garL[1].position.set(7.98, -0.8, 0); garL.forEach(l => G.garage.add(l));

// ---------------- particles ----------------
class Puffs {
  constructor(n, color, blend = THREE.NormalBlending) {
    this.n = n; const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3); this.size = new Float32Array(n); this.alpha = new Float32Array(n);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1)); g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: blend, uniforms: { uColor: { value: new THREE.Color(color) }, uScale: { value: 1000 } },
      vertexShader: 'uniform float uScale; attribute float aSize; attribute float aAlpha; varying float vA; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=min(260.,aSize*uScale/max(0.05,-mv.z)); vA=aAlpha*smoothstep(0.6,1.8,-mv.z); }',
      fragmentShader: 'uniform vec3 uColor; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,.05,d)*vA; if(a<.004) discard; gl_FragColor=vec4(uColor,a);\n#include <colorspace_fragment>\n}'
    });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; scene.add(this.pts); this.g = g;
  }
  update(fn) { const v = new THREE.Vector3(); for (let i = 0; i < this.n; i++) { const r = fn(i, v); this.pos[i * 3] = v.x; this.pos[i * 3 + 1] = v.y; this.pos[i * 3 + 2] = v.z; this.size[i] = r[0]; this.alpha[i] = r[1]; } for (const k of ['position', 'aSize', 'aAlpha']) this.g.attributes[k].needsUpdate = true; }
  hide() { this.pts.visible = false; } show() { this.pts.visible = true; this.mat.uniforms.uScale.value = H / (2 * Math.tan(camera.fov * Math.PI / 360)); }
}
const fumes = new Puffs(420, '#6c7076'), water = new Puffs(380, '#3f9cff'), oil = new Puffs(60, '#3a2508'), dust = new Puffs(140, '#b59a78'), outPuff = new Puffs(120, '#d7dde2');
const RAIN_N = 2600;
const rainGeo = new THREE.BufferGeometry(); const rainPos = new Float32Array(RAIN_N * 6); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#c4d2de', transparent: true, opacity: 0.55 })); rain.frustumCulled = false; scene.add(rain);
const splash = new THREE.InstancedMesh(new THREE.RingGeometry(0.6, 1, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#dfe9f2', transparent: true, opacity: 0.5, depthWrite: false }), 260); splash.frustumCulled = false; scene.add(splash);

// ---------------- timeline ----------------
let TL, T = {};
const norm = s => s.toLowerCase().replace(/[^a-z]/g, '');
function wt(word, n = 1, key = 's') { let k = 0; for (const w of TL.words) if (norm(w.w) === norm(word) && ++k === n) return w[key]; throw new Error('word ' + word + n); }
const CUES = [];
function setup(tl) {
  TL = tl;
  T.s2 = wt('But', 1) - 0.18; T.s3 = wt('Press', 1) - 0.18; T.s4 = wt('So', 2) - 0.12; T.s5 = wt('But', 3) - 0.15; T.s6 = wt('But', 4) - 0.15;
  T.s7 = wt('But', 5) - 0.15; T.s8 = wt('But', 6) - 0.15; T.s9 = wt('one') - 0.3; T.s10 = wt('spacestarved') - 0.45; T.end = tl.dur;
  T.cuts = [T.s2, T.s3, T.s4, T.s5, T.s6, T.s7, T.s8, T.s9, T.s10];
  buildCaptions(); buildCues();
  return { T, CUES };
}
const W_ = (w, n = 1, k = 's') => wt(w, n, k);

// ---- per-frame world state ----
function defaults() {
  return { deck: -2.6, liftVis: true, car: 'lift', carPos: null, turn: 0, posts: 1, tray: 1, bricks: 1, front: 1, mid: 1, filler: 1, garage: 0, lid: 0, roofGhost: 1, lawnGhost: 1, rain: 0, sky: 'day', fumes: 0, fumeFlow: 0, fan: 0, waterFlow: 0, pawl: 1, leak: 0, finger: null, btnGlow: 0.2, dust: 0, puff: 0, duct: false, shake: 0, sunWarm: 0 };
}
let S;

// camera helpers
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function cam(a, b = a, k = 0) {
  if (!camera.userData.keepUp) camera.up.set(0, 1, 0); const p = V(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)), t = V(lerp(a[3], b[3], k), lerp(a[4], b[4], k), lerp(a[5], b[5], k)); camera.position.copy(p); camera.fov = lerp(a[6] || 50, b[6] || 50, k); camera.lookAt(t); camera.updateProjectionMatrix(); camera.userData.t = t; }
function orbit(c, r, h, ang, fov) { cam([c[0] + Math.sin(ang) * r, c[1] + h, c[2] + Math.cos(ang) * r, c[0], c[1], c[2], fov]); }

// ======================= SCENES =======================
const scenes = [
  // ---- 1: the incredible idea ----
  function s1(t) {
    const u = t, tDis = W_('disappear') - 0.25;
    S.liftVis = false; S.car = 'free'; S.carPos = [0, 0, 0.1, Math.PI, 0];
    const f = 1 - smooth(P(u, tDis - 0.2, tDis + 0.9));
    S.lid = f; S.front = f;
    const A = [15, 17, 31, 0, 0.2, -1, 42], B = [7.2, 5.4, 14, 0, -0.6, 0, 45], C = [4.4, 0.5, 9.8, 0, -1.7, 0, 52];
    const k1 = ease(P(u, 0, tDis)), k2 = ease(P(u, tDis - 0.1, tDis + 1.0));
    if (k2 <= 0) cam(A, B, k1); else { const m = [...A].map((v, i) => lerp(A[i], B[i], k1)); cam(m, C, k2); }
    S.dust = P(u, tDis + 0.2, tDis + 1.2) * (1 - P(u, T.s2 - 0.6, T.s2));
  },
  // ---- 2: the car needs a platform ----
  function s2(t) {
    const u = t - T.s2, tFall = W_('fall') - T.s2 - 0.05, tRw = W_('So', 1) - T.s2 - 0.3, tPl = W_('platform') - T.s2, tSc = W_('scissor') - T.s2;
    S.car = 'free';
    let cy = 0, pitch = 0;
    if (u > tFall) { const k = ei(P(u, tFall, tFall + 0.75)); cy = -1.15 * k; pitch = 0.16 * k; }
    if (u > tRw) { const k = ease(P(u, tRw, tRw + 0.4)); cy = lerp(-1.15, 0, k); pitch = lerp(0.16, 0, k); }
    S.carPos = [0, cy, 0.1, Math.PI, pitch];
    S.liftVis = u > tRw + 0.25; S.deck = lerp(-2.6, 0, eo(P(u, tRw + 0.3, tRw + 1.7)));
    if (S.deck > -0.001) S.car = 'lift';
    S.posts = 0; S.tray = 0; S.bricks = 0; S.front = 0;
    if (u < tRw + 0.4) cam([3.6, 0.75, -4.75, 0, 0.15, 0.4, 50], [3.0, 0.55, -4.5, 0, -0.1, 0.4, 52], ease(P(u, 0, tRw + 0.4)));
    else if (u < tSc - 0.25) cam([4.4, -0.4, 6.8, 0, -0.9, 0, 50], [3.1, -1.9, 5.5, 0, -1.6, 0, 52], ease(P(u, tRw + 0.4, tSc - 0.25)));
    else cam([3.1, -1.9, 5.5, 0, -1.6, 0, 52], [-2.9, -2.1, 5.3, 0, -1.7, -0.4, 52], ease(P(u, tSc - 0.25, T.s3 - T.s2)));
    S.dust = (1 - P(u, 0, 0.6)) * 0.6;
  },
  // ---- 3: the car sinks underground ----
  function s3(t) {
    const u = t - T.s3, tB = W_('button') - T.s3, tP = W_('But', 2) - T.s3, tLeak = W_('leaked') - T.s3, tDrop = W_('drop') - T.s3;
    S.posts = 0; S.tray = 0; S.bricks = 0;
    S.deck = lerp(0, -0.975, ease(P(u, tB + 0.55, tP - 0.05)));
    if (u > tDrop - 0.05) S.deck = lerp(-0.975, -1.3, ei(P(u, tDrop - 0.05, tDrop + 0.13)));
    S.pawl = u > tB + 0.5 ? 0 : 1; if (u > tDrop + 0.1) S.pawl = 1;
    S.leak = P(u, tLeak - 0.4, tLeak + 0.2);
    S.btnGlow = u > tB ? 2.5 : 0.25;
    if (u < tB + 0.45) {
      S.front = 1;
      const press = Math.sin(clamp((u - tB + 0.12) / 0.3) * Math.PI) * 0.012;
      S.finger = [lerp(0.32, 0.098, eo(P(u, 0, tB - 0.1))) - press, 0.99 + (1 - eo(P(u, 0, tB - 0.1))) * 0.05, 0];
      cam([-2.95, 1.2, 3.25, -3.68, 0.92, 2.55, 36], [-3.05, 1.15, 3.1, -3.68, 0.95, 2.55, 32], ease(P(u, 0, tB + 0.45)));
    } else if (u < tP - 0.1) {
      S.front = 0; const ty = lerp(-0.3, -1.4, ease(P(u, tB + 0.45, tP - 0.1)));
      cam([0.6, ty + 0.3, 10.6, 0, ty, 0, 50]);
    } else if (u < tDrop - 0.25) {
      S.front = 0; cam([0.25, -2.85, -0.35, 1.1, -3.22, -1.45, 40], [0.4, -2.9, -0.55, 1.1, -3.22, -1.45, 34], ease(P(u, tP - 0.1, tDrop - 0.25)));
    } else {
      S.front = 0; cam([3.0, -0.9, 8.6, 0, -1.6, 0, 50]);
      S.shake = Math.max(0, 1 - (u - tDrop - 0.1) * 3) * (u > tDrop + 0.1 ? 1 : 0);
    }
  },
  // ---- 4: the safety locks ----
  function s4(t) {
    const u = t - T.s4, d = T.s5 - T.s4;
    S.posts = 0; S.tray = 0; S.bricks = 0; S.front = 0;
    const stops = [[0.9, -1.3, -1.625], [1.9, -1.625, -1.95], [3.0, -1.95, -2.275], [4.0, -2.275, -2.6]];
    let deck = -1.3, moving = false;
    for (const [t0, a, b] of stops) { if (u >= t0) { const k = P(u, t0, t0 + 0.42); deck = lerp(a, b, smooth(k)); if (k > 0 && k < 1) moving = true; } }
    S.deck = deck + (u < 0.35 ? Math.sin(u * 30) * 0.012 * (1 - u / 0.35) : 0);
    S.pawl = moving ? 0 : 1;
    const ty = S.deck - 0.15;
    if (u < 2.55) cam([2.12, S.deck - 0.78, 3.05, 2.64, S.deck - 0.4, 2.2, 42], [2.2, S.deck - 0.72, 2.85, 2.64, S.deck - 0.4, 2.2, 36], ease(P(u, 0, 2.55)));
    else if (u < d - 1.55) cam([4.2, -0.4, 6.6, 0, -2.0, 0, 52], [3.2, -0.7, 6.0, 0, -2.2, 0, 52], ease(P(u, 2.55, d - 1.55)));
    else cam([2.12, S.deck - 0.78, 3.05, 2.64, S.deck - 0.4, 2.2, 42], [2.2, S.deck - 0.72, 2.85, 2.64, S.deck - 0.4, 2.2, 36], ease(P(u, d - 1.55, d)));
  },
  // ---- 5: the invisible driveway ----
  function s5(t) {
    const u = t - T.s5, tH = W_('hole', 2) - T.s5, tT = W_('top') - T.s5, tBr = W_('bricks') - T.s5, d = T.s6 - T.s5;
    S.front = 1;
    S.posts = smooth(P(u, tT - 0.35, tT + 0.25)); S.tray = smooth(P(u, tT + 0.05, tT + 0.45));
    S.bricks = P(u, tT + 0.35, tBr + 0.35);
    if (u < tT - 0.35) cam([6.5, 8.5, 10.5, 0, -1.2, 0, 46], [3.5, 10.5, 6.0, 0, -1.4, 0, 46], ease(P(u, 0, tT - 0.35)));
    else cam([3.5, 10.5, 6.0, 0, -1.4, 0, 46], [0.0, 14.5, 3.0, 0, 0, -0.4, 44], ease(P(u, tT - 0.35, tT + 0.9)));
    if (u > tBr + 0.3) cam([0.0, 14.5, 3.0, 0, 0, -0.4, 44], [2.6, 3.2, 9.6, 0, 0, -1.4, 46], ease(P(u, tBr + 0.3, d + 0.25)));
  },
  // ---- 6: the car turns around ----
  function s6(t) {
    const u = t - T.s6, tSo = W_('So', 4) - T.s6, tTurn = W_('turns') - T.s6, d = T.s7 - T.s6;
    S.front = 0;
    S.turn = Math.PI * ease(P(u, tSo + 0.55, tTurn + 0.45));
    const wig = u < tSo - 0.2 ? Math.max(0, Math.sin(clamp((u - 0.8) / 1.4) * Math.PI)) * 0.35 : 0;
    S.carOff = wig; S.shake = u > 2.1 && u < 2.4 ? 0.4 : 0;
    if (u < tSo - 0.1) cam([-3.0, -1.0, 7.4, 0, -2.0, 0, 50], [-2.2, -1.4, 6.6, 0, -2.0, 0, 50], ease(P(u, 0, tSo)));
    else if (u < tTurn + 0.8) { S.roofGhost = 0.12; S.lawnGhost = 1; cam([0.6, 5.6, 1.8, 0, -2.3, 0, 52], [0.2, 6.2, 0.7, 0, -2.3, 0, 52], ease(P(u, tSo - 0.1, tTurn + 0.8))); }
    else cam([-2.35, -1.75, -2.65, 0.4, -2.05, 1.6, 64], [-2.25, -1.85, -2.55, 0.5, -2.05, 1.6, 62], ease(P(u, tTurn + 0.8, d)));
  },
  // ---- 7: the exhaust problem ----
  function s7(t) {
    const u = t - T.s7, tSo = W_('So', 5) - T.s7, tVent = W_('concealed') - T.s7, d = T.s8 - T.s7;
    S.front = 0; S.mid = 0; S.turn = Math.PI; S.duct = true;
    S.fumes = P(u, 0.1, 1.2); S.fan = P(u, tSo - 0.2, tSo + 0.6); S.fumeFlow = S.fan;
    S.puff = P(u, tVent - 0.6, tVent);
    if (u < tSo - 0.1) cam([1.8, -1.0, 6.8, 0, -1.8, -0.8, 50], [1.2, -1.3, 5.8, 0, -1.8, -0.8, 50], ease(P(u, 0, tSo)));
    else if (u < tVent - 0.9) cam([-0.6, -1.2, 2.2, 2.6, -0.95, -1.1, 50], [0.1, -1.0, 1.4, 2.75, -0.85, -1.05, 46], ease(P(u, tSo - 0.1, tVent - 0.9)));
    else cam([6.5, -0.2, 5.4, 6.5, -0.7, -1.0, 52], [14.9, 1.3, 4.9, 14.3, 0.3, -1.1, 46], ease(P(u, tVent - 0.9, d)));
  },
  // ---- 8: keeping the water out ----
  function s8(t) {
    const u = t - T.s8, tSo = W_('So', 6) - T.s8, tAw = W_('carry') - T.s8, d = T.s9 - T.s8;
    S.rain = 1; S.sky = 'rain'; S.turn = Math.PI;
    if (u < tSo - 0.12) { S.front = 1; cam([3.6, 0.6, 8.2, 0, 0.0, -0.6, 46], [2.6, 0.5, 6.6, 0, -0.05, -0.6, 46], ease(P(u, 0, tSo))); }
    else if (u < tAw - 0.35) { S.front = 0; S.waterFlow = 1; cam([1.2, -0.5, 7.8, 2.2, -1.7, -1.4, 48], [1.7, -0.8, 7.0, 2.3, -1.8, -1.5, 48], ease(P(u, tSo - 0.12, tAw - 0.35))); }
    else { S.front = 0; S.waterFlow = 1; cam([3.42, 0.3, 3.75, 2.86, -0.08, 2.9, 40], [3.3, 0.25, 3.62, 2.86, -0.09, 2.8, 36], ease(P(u, tAw - 0.35, d))); }
  },
  // ---- 9: three cars under the garden ----
  function s9(t) {
    const u = t - T.s9, tDe = W_('design') - T.s9, tTh = W_('three') - T.s9, d = T.s10 - T.s9;
    S.front = 0; S.turn = Math.PI;
    S.garage = smooth(P(u, tDe - 0.1, tDe + 0.8)); S.filler = 1 - S.garage;
    if (u < tDe + 0.2) cam([1.2, -0.3, 10.2, 2.4, -1.6, 0, 50], [1.6, -0.5, 9.4, 2.8, -1.6, 0, 50], ease(P(u, 0, tDe + 0.2)));
    else if (u < tTh - 0.5) cam([1.6, -0.5, 9.4, 2.8, -1.6, 0, 50], [5.4, 1.4, 16.0, 3.6, -1.3, 0, 48], ease(P(u, tDe + 0.2, tTh - 0.5)));
    else { const k = ease(P(u, tTh - 0.5, tTh + 0.9)); S.lawnGhost = lerp(1, 0.14, k); S.roofGhost = lerp(1, 0.14, k); camera.up.set(lerp(0, -1, k), lerp(1, 0, k), 0).normalize(); camera.userData.keepUp = true; cam([5.4, 1.4, 16.0, 3.6, -1.3, 0, 48], [3.4, 14.2, 0.01, 3.4, -2.2, 0, 50], k); }
  },
  // ---- 10: the final reveal ----
  function s10(t) {
    const u = t - T.s10, tPr = W_('Press', 2) - T.s10, tB = W_('button', 2) - T.s10, tDi = W_('disappears') - T.s10, tCo = W_('Congratulations') - T.s10;
    S.garage = 1; S.filler = 0; S.sunWarm = 1; S.sky = 'gold';
    S.deck = lerp(0, -2.6, ease(P(u, tB + 0.25, tDi + 0.7)));
    S.btnGlow = u > tB ? 2.5 : 0.25; S.pawl = u > tB + 0.2 && S.deck > -2.59 ? 0 : 1;
    S.front = 1 - smooth(P(u, tCo + 0.2, tCo + 1.6));
    if (u < tPr - 0.15) cam([12, 5.2, 16.5, 0, 1.0, -0.5, 44], [7.0, 2.6, 11.0, 0, 0.9, -0.5, 44], ease(P(u, 0, tPr - 0.15)));
    else if (u < tB + 0.3) {
      const press = Math.sin(clamp((u - tB + 0.12) / 0.3) * Math.PI) * 0.012;
      S.finger = [lerp(0.32, 0.098, eo(P(u, tPr - 0.15, tB - 0.1))) - press, 0.99 + (1 - eo(P(u, tPr - 0.15, tB - 0.1))) * 0.05, 0];
      cam([-2.95, 1.2, 3.25, -3.68, 0.92, 2.55, 36], [-3.05, 1.15, 3.1, -3.68, 0.95, 2.55, 32], ease(P(u, tPr - 0.15, tB + 0.3)));
    } else if (u < tCo + 0.1) cam([5.4, 2.2, 10.4, 0, 0.3, -0.5, 46], [3.6, 1.6, 8.4, 0, 0.0, -0.6, 46], ease(P(u, tB + 0.3, tCo + 0.1)));
    else cam([3.6, 1.6, 8.4, 0, 0.0, -0.6, 46], [6.6, -0.4, 19.0, 4.0, -1.0, 0, 46], ease(P(u, tCo + 0.1, tCo + 3.4)));
  },
];

// ======================= APPLY STATE =======================
const tmpM = new THREE.Matrix4();
function fade(g, a) {
  if (!g.userData.mats) { const cache = new Map(); g.traverse(o => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; const nm = ms.map(m => { if (!cache.has(m)) cache.set(m, m.clone()); return cache.get(m); }); o.material = Array.isArray(o.material) ? nm : nm[0]; } }); g.userData.mats = [...cache.values()]; }
  g.visible = a > 0.004;
  for (const m of g.userData.mats) { const tr = a < 0.999; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = a; m.depthWrite = a > 0.55; }
}
function apply(t) {
  fade(G.front, S.front); fade(G.lid, S.lid); fade(G.mid, Math.min(S.mid, S.lawnGhost)); fade(G.midSoil, Math.min(S.mid, S.filler)); fade(G.filler, S.filler); fade(G.garage, S.garage); fade(G.garGhost, Math.min(S.garage, S.lawnGhost));
  fade(G.garageFront, Math.min(S.garage, S.front)); fade(G.ghost, S.lawnGhost); fade(roof, S.roofGhost);
  roof.visible = roof.visible && S.posts > 0.001;
  G.duct.visible = S.duct;
  lift.visible = S.liftVis; lift.position.y = S.deck;
  posts.forEach(p => { p.scale.y = Math.max(1e-3, S.posts); });
  tray.visible = S.tray > 0.01; tray.position.y = (1 - S.tray) * -0.3; tray.scale.set(1, 1, 1);
  layBricks(S.tray > 0.5 ? S.bricks : 0);
  brickMesh.visible = S.bricks > 0;
  turntable.rotation.y = S.turn;
  for (const a of [...SC.arms.map(a => a.m), ...SC.tubes, ...SC.cyl.flatMap(c => [c.body, c.rod, c.fit])]) a.visible = S.liftVis;
  solveScissor(S.liftVis ? S.deck : -2.6);
  pawls.forEach(p => { p.rotation.z = (1 - S.pawl) * 0.9; });
  if (S.car === 'lift') { hero.position.set(0, S.deck + 0.035, (S.carOff || 0)); hero.rotation.set(0, Math.PI + S.turn, 0); hero.position.applyAxisAngle(V(0, 1, 0), 0); }
  else { const [x, y, z, ry, px] = S.carPos; hero.position.set(x, y, z); hero.rotation.set(px, ry, 0); }
  hoseMats.forEach(m => { m.emissive.set('#ff2020'); m.emissiveIntensity = S.leak * (0.5 + 0.5 * Math.sin(t * 18)); });
  btnMat.emissiveIntensity = S.btnGlow;
  finger.visible = !!S.finger; if (S.finger) finger.position.set(...S.finger);
  blades.rotation.x = t * 22 * S.fan;
  // sky & light
  scene.background = SKY[S.sky];
  const rainy = S.sky === 'rain';
  sun.intensity = rainy ? 0.7 : 3.2; hemi.intensity = rainy ? 1.25 : 0.9;
  sun.color.set(S.sunWarm ? '#ffe2bf' : '#fff3e0'); sun.position.set(S.sunWarm ? 18 : 14, S.sunWarm ? 15 : 22, 16);
  scene.fog.color.set(rainy ? '#9aa3aa' : '#dfe8ee'); scene.fog.near = rainy ? 18 : 45; scene.fog.far = rainy ? 70 : 160;
  M.drive.roughness = rainy ? 0.32 : 0.86; M.drive.color.set(rainy ? '#b9b2ad' : '#ffffff');
  for (const g of [G.front, G.lid]) for (const m of g.userData.mats || []) if (m.map === M.drive.map) { m.roughness = M.drive.roughness; m.color.copy(M.drive.color); }
  waterSheet.visible = S.waterFlow > 0;
  // particles
  particles(t);
  // camera shake
  if (S.shake > 0) { camera.position.x += Math.sin(t * 90) * 0.04 * S.shake; camera.position.y += Math.cos(t * 73) * 0.04 * S.shake; }
}

function particles(t) {
  // exhaust fumes
  if (S.fumes > 0) {
    fumes.show();
    const tail = [V(-0.5, -2.6 + 0.33, -2.45), V(0.5, -2.6 + 0.33, -2.45)];
    fumes.update((i, v) => {
      const ph = hash(i, 3), life = 2.6, a = ((t * 0.9 + ph * life) % life) / life, src = tail[i % 2];
      const flowK = S.fumeFlow;
      const wander = V(Math.sin(i * 1.7 + t * 0.6) * 1.6, a * 1.6, Math.cos(i * 2.3 + t * 0.5) * 1.2 + a * 1.4);
      const target = V(2.75, -0.78, -1.0);
      const p1 = src.clone().add(wander.multiplyScalar(a));
      const p2 = src.clone().lerp(target, smooth(a)).add(V(Math.sin(i + t) * 0.15, Math.sin(a * 3) * 0.3, Math.cos(i) * 0.15));
      v.copy(p1.lerp(p2, flowK));
      return [0.25 + a * 0.7, S.fumes * 0.5 * Math.sin(a * Math.PI) * (flowK > 0.5 && a > 0.92 ? 0 : 1)];
    });
  } else fumes.hide();
  // vent puffs
  if (S.puff > 0) {
    outPuff.show();
    outPuff.update((i, v) => { const a = ((t * 0.7 + hash(i, 5)) % 1); v.set(14.4 + (hash(i, 6) - 0.5) * 0.5 + a * 0.3, 0.45 + a * 0.9, -0.62 + a * 0.6); return [0.22 + a * 0.4, 0.3 * S.puff * Math.sin(a * Math.PI)]; });
  } else outPuff.hide();
  // water path: channel -> downpipe -> sump -> pump -> outlet
  if (S.waterFlow > 0) {
    water.show();
    water.update((i, v) => {
      const ph = hash(i, 9), a = (t * 0.32 + ph) % 1;
      if (i % 3 === 0) { v.copy(channelCurve.getPointAt(a)); v.x += (hash(i, 2) - 0.5) * 0.06; v.y += 0.01; }
      else if (i % 3 === 1) { v.copy(downCurve.getPointAt(a)); v.x += 0.07; v.z += 0.02; }
      else { v.copy(outCurve.getPointAt(a)); v.x += 0.07; }
      return [0.05, 0.9];
    });
  } else water.hide();
  // oil leak
  if (S.leak > 0) {
    oil.show(); const src = SC.cyl[1].fit.position;
    oil.update((i, v) => { const a = ((t * 1.3 + hash(i, 4)) % 1); v.set(src.x + (hash(i, 1) - 0.5) * 0.05 + a * 0.06, src.y - 0.05 - a * a * 0.15, src.z + 0.02); return [0.03, S.leak * (a < 0.95 ? 1 : 0)]; });
  } else oil.hide();
  if (S.dust > 0) {
    dust.show();
    dust.update((i, v) => { const a = ((t * 0.25 + hash(i, 8)) % 1); v.set((hash(i, 2) - 0.5) * 5.4, -0.2 - a * 3.0, (hash(i, 3) - 0.5) * 5.6); return [0.03 + hash(i, 4) * 0.05, S.dust * 0.5 * Math.sin(a * Math.PI)]; });
  } else dust.hide();
  // rain
  rain.visible = splash.visible = S.rain > 0;
  if (S.rain > 0) {
    const c = camera.position, fw = new THREE.Vector3(); camera.getWorldDirection(fw);
    const ctr = c.clone().addScaledVector(fw, 4);
    for (let i = 0; i < RAIN_N; i++) {
      const x = ctr.x + (hash(i, 1) - 0.5) * 12, z = ctr.z + (hash(i, 2) - 0.5) * 12, top = 7;
      const y = top - ((t * 9 + hash(i, 3) * top) % top), yy = Math.max(0.0, y);
      if (z > 3.15 && S.front < 0.5 && x < 12.6) { rainPos.fill(0, i * 6, i * 6 + 6); continue; }
      rainPos.set([x, yy, z, x + 0.02, yy + 0.32, z + 0.01], i * 6);
    }
    rainGeo.attributes.position.needsUpdate = true;
    for (let i = 0; i < 260; i++) {
      const a = (t * 2.2 + hash(i, 7)) % 1, cyc = Math.floor(t * 2.2 + hash(i, 7));
      const x = ctr.x + (hash(i, cyc) - 0.5) * 9, z = ctr.z + (hash(cyc, i) - 0.5) * 9;
      const s = 0.02 + a * 0.07; dummy.position.set(x, 0.006, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(s, 1, s);
      if (z > 3.15 && S.front < 0.5) dummy.scale.set(1e-4, 1, 1e-4);
      dummy.updateMatrix(); splash.setMatrixAt(i, dummy.matrix);
    }
    splash.instanceMatrix.needsUpdate = true; splash.material.opacity = 0.45;
  }
}

// ======================= 2D OVERLAY =======================
const FONT = "'Inter Display', 'Inter', sans-serif";
const C = { panel: 'rgba(10,18,28,0.82)', cyan: '#3fd4ff', red: '#ff453a', green: '#32d74b', blue: '#3a9bff', yellow: '#ffd23f', white: '#ffffff' };
function proj(x, y, z) { const v = V(x, y, z).project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H, v.z]; }
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function chip(text, x, y, a, opt = {}) {
  if (a <= 0) return;
  const size = opt.size || 40; ctx.save(); ctx.globalAlpha = clamp(a);
  ctx.font = `800 ${size}px ${FONT}`; const tw = ctx.measureText(text).width, pad = size * 0.55, ic = opt.icon ? size * 1.15 : 0;
  const w = tw + pad * 2 + ic, h = size * 1.7, sc = 0.85 + 0.15 * eo(clamp(a));
  ctx.translate(x, y); ctx.scale(sc, sc);
  const x0 = opt.align === 'left' ? 0 : -w / 2;
  rr(x0, -h / 2, w, h, h / 2); ctx.fillStyle = opt.bg || C.panel; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = opt.edge || 'rgba(255,255,255,0.18)'; ctx.stroke();
  if (opt.icon) icon(opt.icon, x0 + pad + ic * 0.4, 0, size * 0.48, opt.iconCol || C.white);
  ctx.fillStyle = opt.fg || C.white; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(text, x0 + pad + ic, size * 0.04);
  ctx.restore();
}
function icon(k, x, y, r, col) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = r * 0.24; ctx.lineCap = ctx.lineJoin = 'round';
  if (k === 'warn') { ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 1.05, r * 0.8); ctx.lineTo(-r * 1.05, r * 0.8); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#1a0a08'; ctx.fillRect(-r * 0.1, -r * 0.42, r * 0.2, r * 0.7); ctx.fillRect(-r * 0.1, r * 0.4, r * 0.2, r * 0.2); }
  if (k === 'check') { ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.strokeStyle = '#06210d'; ctx.beginPath(); ctx.moveTo(-r * 0.45, 0); ctx.lineTo(-r * 0.1, r * 0.38); ctx.lineTo(r * 0.5, -r * 0.35); ctx.stroke(); }
  if (k === 'cross') { ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.strokeStyle = '#2a0805'; ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.4); ctx.lineTo(r * 0.4, r * 0.4); ctx.moveTo(r * 0.4, -r * 0.4); ctx.lineTo(-r * 0.4, r * 0.4); ctx.stroke(); }
  if (k === 'pin') { ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, 7); ctx.fill(); }
  if (k === 'drop') { ctx.beginPath(); ctx.moveTo(0, -r); ctx.bezierCurveTo(r * 0.9, 0, r * 0.8, r, 0, r); ctx.bezierCurveTo(-r * 0.8, r, -r * 0.9, 0, 0, -r); ctx.fill(); }
  if (k === 'air') { for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-r, i * r * 0.55); ctx.bezierCurveTo(-r * 0.2, i * r * 0.55 - r * 0.3, r * 0.2, i * r * 0.55 + r * 0.3, r, i * r * 0.55); ctx.stroke(); } }
  if (k === 'pin2') { ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.6, Math.PI, 0); ctx.lineTo(0, r); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
// label anchored to a 3D point with leader line
function callout(text, p3, lx, ly, a, opt = {}) {
  if (a <= 0) return; const [px, py, pz] = proj(...p3); if (pz > 1) return;
  ctx.save(); ctx.globalAlpha = clamp(a);
  const k = eo(clamp(a * 1.4));
  ctx.strokeStyle = opt.col || C.cyan; ctx.lineWidth = 4; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(lerp(px, lx, k), lerp(py, ly, k)); ctx.stroke();
  ctx.fillStyle = opt.col || C.cyan; ctx.beginPath(); ctx.arc(px, py, 10, 0, 7); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, 16 + 6 * Math.sin(performanceT * 6), 0, 7); ctx.globalAlpha = clamp(a) * 0.6; ctx.stroke();
  ctx.restore();
  chip(text, lx, ly, a, { size: opt.size || 38, edge: opt.col || C.cyan, icon: opt.icon, iconCol: opt.col || C.cyan });
}
function polyline(pts3, col, a, opt = {}) {
  if (a <= 0) return; const pts = pts3.map(p => proj(...p)); if (pts.some(p => p[2] > 1)) return;
  ctx.save(); ctx.globalAlpha = clamp(a); ctx.strokeStyle = col; ctx.lineWidth = opt.w || 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (opt.dash) { ctx.setLineDash(opt.dash); ctx.lineDashOffset = -performanceT * (opt.speed || 120); }
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); if (opt.close) ctx.closePath(); ctx.stroke();
  if (opt.arrow) { const [x1, y1] = pts[pts.length - 1], [x0, y0] = pts[pts.length - 2]; const ang = Math.atan2(y1 - y0, x1 - x0); ctx.setLineDash([]); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x1 + Math.cos(ang) * 22, y1 + Math.sin(ang) * 22); ctx.lineTo(x1 + Math.cos(ang + 2.4) * 26, y1 + Math.sin(ang + 2.4) * 26); ctx.lineTo(x1 + Math.cos(ang - 2.4) * 26, y1 + Math.sin(ang - 2.4) * 26); ctx.fill(); }
  ctx.restore();
}
function flowArrows(pts3, col, a, n = 4, speed = 0.5) { // moving chevrons along a 3D path
  if (a <= 0) return; const curve = new THREE.CatmullRomCurve3(pts3.map(p => V(...p)), false, 'catmullrom', 0.0);
  polyline(curve.getSpacedPoints(40).map(v => [v.x, v.y, v.z]), col, a * 0.45, { w: 5, dash: [14, 16] });
  ctx.save(); ctx.globalAlpha = clamp(a); ctx.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const s = (performanceT * speed + i / n) % 1, p = curve.getPointAt(s), q = curve.getPointAt(Math.min(1, s + 0.01));
    const [x, y, z] = proj(p.x, p.y, p.z), [x2, y2] = proj(q.x, q.y, q.z); if (z > 1) continue;
    const ang = Math.atan2(y2 - y, x2 - x); ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-12, -16); ctx.lineTo(-4, 0); ctx.lineTo(-12, 16); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}
function panel(x, y, w, h, a, title) {
  ctx.save(); ctx.globalAlpha = clamp(a); rr(x, y, w, h, 26); ctx.fillStyle = 'rgba(8,16,26,0.86)'; ctx.fill(); ctx.strokeStyle = 'rgba(63,212,255,0.6)'; ctx.lineWidth = 3; ctx.stroke();
  if (title) { ctx.fillStyle = C.cyan; ctx.font = `800 32px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(title, x + 26, y + 22); }
  ctx.restore();
}
// scissor schematic (2D technical overlay)
function scissorInset(a, ph) {
  if (a <= 0) return; const x = 560, y = 240, w = 470, h = 420; panel(x, y, w, h, a, 'HOW THE SCISSOR EXPANDS');
  ctx.save(); ctx.globalAlpha = clamp(a);
  const k = 0.5 - 0.5 * Math.cos(ph), L = 330, hh = lerp(30, 200, k), half = Math.sqrt(L * L - hh * hh) / 2, cx = x + w / 2, by = y + h - 40, ty = by - hh;
  const zf = cx - 175, zs = zf + 2 * half;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 30, by + 8); ctx.lineTo(x + w - 30, by + 8); ctx.stroke();
  ctx.fillStyle = '#9aa3ad'; ctx.fillRect(zf - 20, ty - 18, 340, 12);
  ctx.strokeStyle = C.yellow; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(zf, by); ctx.lineTo(zs, ty); ctx.moveTo(zf, ty); ctx.lineTo(zs, by); ctx.stroke();
  ctx.fillStyle = '#fff'; for (const [px, py] of [[zf, by], [zs, ty], [zf, ty], [zs, by], [(zf + zs) / 2, (by + ty) / 2]]) { ctx.beginPath(); ctx.arc(px, py, 7, 0, 7); ctx.fill(); }
  const fx = zf + 0.62 * 2 * half, fy = by - 0.62 * hh; ctx.strokeStyle = '#6fa8dc'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(cx - 60, by - 4); ctx.lineTo(fx, fy); ctx.stroke();
  ctx.strokeStyle = C.cyan; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + w - 34, by); ctx.lineTo(x + w - 34, ty - 12); ctx.stroke();
  ctx.fillStyle = C.cyan; ctx.beginPath(); ctx.moveTo(x + w - 34, ty - 24); ctx.lineTo(x + w - 46, ty - 6); ctx.lineTo(x + w - 22, ty - 6); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = `700 27px ${FONT}`; ctx.textAlign = 'left';
  ctx.fillText('Cylinder pushes the arms', x + 26, y + 80); ctx.fillText('apart → platform rises', x + 26, y + 114);
  ctx.restore();
}
function lockInset(a, deck) {
  if (a <= 0) return; const x = 60, y = 250, w = 330, h = 520; panel(x, y, w, h, a, 'LOCK POSITIONS');
  ctx.save(); ctx.globalAlpha = clamp(a);
  const rx = x + 110, top = y + 118, bot = y + h - 36, span = bot - top;
  ctx.fillStyle = '#3a3f46'; ctx.fillRect(rx - 14, top, 28, span);
  TEETH_Y.slice(0, 9).forEach((ty, k) => { const yy = top + (k * 0.325) / 2.6 * span; ctx.fillStyle = '#c7ccd2'; ctx.beginPath(); ctx.moveTo(rx + 14, yy); ctx.lineTo(rx + 34, yy); ctx.lineTo(rx + 14, yy - 22); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = `700 23px ${FONT}`; ctx.fillText(`−${(k * 0.325).toFixed(2)} m`, rx + 50, yy - 4); });
  const py = top + (-deck) / 2.6 * span; ctx.fillStyle = C.yellow; ctx.fillRect(rx - 70, py - 8, 100, 16);
  ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(rx - 90, py, 14, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = `700 26px ${FONT}`; ctx.fillText('a lock every 325 mm', x + 26, y + 72);
  ctx.restore();
}
function ellipseArrow(c3, r, a, from, to) {
  if (a <= 0) return; const pts = []; for (let i = 0; i <= 48; i++) { const an = lerp(from, to, i / 48); pts.push([c3[0] + Math.cos(an) * r, c3[1], c3[2] + Math.sin(an) * r]); }
  polyline(pts, C.yellow, a, { w: 9, arrow: true });
}
function title(a) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = clamp(a);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const y = 330 - (1 - eo(clamp(a))) * 40;
  ctx.font = `900 92px ${FONT}`; ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineJoin = 'round';
  for (const [s, yy, col] of [['THE SECRET', y, '#ffffff'], ['UNDERGROUND', y + 98, C.yellow], ['GARAGE', y + 196, '#ffffff']]) { ctx.strokeText(s, W / 2, yy); ctx.fillStyle = col; ctx.fillText(s, W / 2, yy); }
  ctx.restore();
}
// captions
let CHUNKS = [];
const HOT = ['disappear', 'underground', 'fall', 'steel', 'platform', 'scissor', 'hydraulic', 'button', 'sinks', 'leaked', 'drop', 'safety', 'locks', 'huge', 'hole', 'bricks', 'turntable', 'around', 'fumes', 'fan', 'vent', 'rains', 'flood', 'drainage', 'three', 'london', 'disappears', 'empty', 'secret', 'garage', 'congratulations', 'lawn'];
function buildCaptions() {
  CHUNKS = []; let cur = null;
  TL.words.forEach(w => {
    const txt = w.w.toUpperCase().replace(/[,.]$/, '');
    if (!cur) { cur = { s: w.s, words: [] }; CHUNKS.push(cur); }
    cur.words.push({ t: txt, s: w.s, e: w.e, hot: HOT.includes(norm(w.w)) }); cur.e = w.e;
    if (/[.,?!]$/.test(w.w) || cur.words.length >= 3 || cur.words.map(x => x.t).join(' ').length > 15) cur = null;
  });
  CHUNKS.forEach((k, i) => { const nx = CHUNKS[i + 1]; k.e2 = nx ? Math.min(nx.s, k.e + 0.5) : k.e + 0.5; });
}
function captions(t) {
  const ch = CHUNKS.find(k => t >= k.s - 0.04 && t < k.e2); if (!ch) return;
  const a = clamp((t - ch.s + 0.04) / 0.08), y = 1395;
  ctx.save(); ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  let size = 84; ctx.font = `900 ${size}px ${FONT}`;
  const gap = 24; let tw = ch.words.reduce((s, w) => s + ctx.measureText(w.t).width, 0) + gap * (ch.words.length - 1);
  if (tw > 960) { size = Math.floor(84 * 960 / tw); ctx.font = `900 ${size}px ${FONT}`; tw = ch.words.reduce((s, w) => s + ctx.measureText(w.t).width, 0) + gap * (ch.words.length - 1); }
  let x = W / 2 - tw / 2; const sc = 0.9 + 0.1 * eo(a);
  ctx.translate(W / 2, y); ctx.scale(sc, sc); ctx.translate(-W / 2, -y);
  for (const w of ch.words) {
    const ww = ctx.measureText(w.t).width, on = t >= w.s - 0.03;
    ctx.globalAlpha = on ? 1 : 0.55;
    ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(w.t, x, y);
    ctx.fillStyle = on && w.hot ? C.yellow : '#ffffff'; ctx.fillText(w.t, x, y);
    x += ww + gap;
  }
  ctx.restore();
}
function vignette() { const g = ctx.createRadialGradient(W / 2, H / 2, 500, W / 2, H / 2, 1250); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function endCard(a) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = clamp(a);
  const g = ctx.createLinearGradient(0, 0, 0, 760); g.addColorStop(0, 'rgba(0,0,0,0.65)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 760);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.font = `900 84px ${FONT}`; ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  for (const [s, yy, col] of [['THE SECRET', 300, '#fff'], ['UNDERGROUND GARAGE', 392, C.yellow]]) { ctx.strokeText(s, W / 2, yy); ctx.fillStyle = col; ctx.fillText(s, W / 2, yy); }
  ctx.font = `600 30px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fillText('Concept visualisation. Real installations need structural', W / 2, 480);
  ctx.fillText('engineering, waterproofing, drainage & ventilation design.', W / 2, 520);
  ctx.restore();
}

let performanceT = 0;
function overlay(t) {
  performanceT = t;
  const s = T, u2 = t - s.s2, u3 = t - s.s3, u4 = t - s.s4, u5 = t - s.s5, u6 = t - s.s6, u7 = t - s.s7, u8 = t - s.s8, u9 = t - s.s9, u10 = t - s.s10;
  const win = (t0, t1, f = 0.25) => Math.min(P(t, t0, t0 + f), 1 - P(t, t1 - f, t1));
  vignette();
  // S1
  title(win(0.15, W_('disappear') - 0.1, 0.35));
  // S2
  if (t >= s.s2 && t < s.s3) {
    const tRw = W_('So', 1) - 0.3;
    if (t > W_('fall') && t < tRw + 0.45) chip('FALLS IN!', W / 2, 520, win(W_('fall') + 0.2, tRw), { bg: 'rgba(120,10,8,0.85)', icon: 'cross', iconCol: C.red, size: 46 });
    if (t > tRw && t < tRw + 0.45) { ctx.save(); ctx.globalAlpha = 0.85 * (1 - P(t, tRw, tRw + 0.45)); ctx.fillStyle = '#fff'; ctx.font = `900 120px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('◀◀', W / 2, 760); ctx.restore(); }
    callout('STEEL PLATFORM', [2.6, S.deck - 0.1, 2.85], 330, 1080, win(W_('platform') - 0.1, s.s3), {});
    callout('HYDRAULIC SCISSOR LIFT', [1.7, -1.9, 0.2], 360, 1210, win(W_('scissor') - 0.3, s.s3), { col: C.yellow });
    scissorInset(win(W_('scissor') - 0.2, s.s3), (t - W_('scissor')) * 2.2);
  }
  // S3
  if (t >= s.s3 && t < s.s4) {
    const tP = W_('But', 2);
    if (t < tP) chip('PRESS', W / 2, 520, win(W_('button') - 0.3, W_('button') + 0.6), { icon: 'pin', iconCol: C.green });
    if (t > W_('button') + 0.5 && t < tP) { const [, gy] = proj(0, 0, 0); polyline([[0, 0, 3.0], [0, -1.0, 3.0]], C.cyan, win(W_('button') + 0.6, tP), { arrow: true, w: 8 }); }
    callout('HYDRAULIC PIPE', [SC.cyl[1].fit.position.x, SC.cyl[1].fit.position.y, SC.cyl[1].fit.position.z], 380, 1060, win(tP - 0.05, W_('drop') - 0.25), { col: C.red, icon: 'warn' });
    if (t > W_('drop') - 0.3) chip('PRESSURE LOST!', W / 2, 520, win(W_('drop') - 0.2, s.s4), { bg: 'rgba(130,12,10,0.9)', icon: 'warn', iconCol: C.yellow, size: 50 });
    if (t > W_('leaked') - 0.3 && t < W_('drop') + 0.6) { ctx.save(); ctx.globalAlpha = 0.18 * (0.5 + 0.5 * Math.sin(t * 14)) * win(W_('leaked') - 0.3, W_('drop') + 0.6); ctx.fillStyle = C.red; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }
  // S4
  if (t >= s.s4 && t < s.s5) {
    const d = s.s5 - s.s4;
    if (u4 < 2.55) callout('SAFETY LOCK', [2.64, S.deck - 0.37, 2.2], 330, 1100, win(s.s4 + 0.15, s.s4 + 2.5), { col: C.green, icon: 'check' });
    if (u4 >= 2.55 && u4 < d - 1.55) {
      lockInset(win(s.s4 + 2.6, s.s5 - 1.55), S.deck);
      RAILS.forEach(([sx, z], i) => { const [x, y, zz] = proj(sx * 2.62, S.deck - 0.36, z); if (zz < 1) { ctx.save(); ctx.globalAlpha = win(s.s4 + 2.7 + i * 0.1, s.s5 - 1.55); icon(S.pawl > 0.5 ? 'check' : 'pin', x, y, 22, S.pawl > 0.5 ? C.green : C.yellow); ctx.restore(); } });
    }
    chip('HOLDS WITHOUT HYDRAULIC PRESSURE', W / 2, 520, win(W_('hydraulic', 3) - 0.1, s.s5), { size: 34, icon: 'check', iconCol: C.green, edge: C.green });
  }
  // S5
  if (t >= s.s5 && t < s.s6) {
    const tT = W_('top');
    polyline([[-2.8, 0.02, -2.9], [2.8, 0.02, -2.9], [2.8, 0.02, 2.9], [-2.8, 0.02, 2.9]], C.red, win(W_('huge') - 0.1, tT - 0.1) * (S.bricks > 0.9 ? 0 : 1), { close: true, dash: [22, 14], w: 7, speed: 80 });
    chip('HUGE HOLE!', W / 2, 520, win(W_('huge') - 0.1, tT - 0.1), { bg: 'rgba(120,10,8,0.85)', icon: 'warn', iconCol: C.yellow, size: 48 });
    chip('MATCHING PAVING BRICKS', W / 2, 520, win(W_('matching') - 0.15, s.s6), { icon: 'check', iconCol: C.green, edge: C.green, size: 40 });
    polyline([[-2.8, 0.02, -2.9], [2.8, 0.02, -2.9], [2.8, 0.02, 2.9], [-2.8, 0.02, 2.9]], C.cyan, win(W_('bricks') + 0.2, s.s6) * 0.5, { close: true, dash: [10, 18], w: 4 });
  }
  // S6
  if (t >= s.s6 && t < s.s7) {
    const tSo = W_('So', 4);
    chip('REVERSING OUT EVERY MORNING?', W / 2, 520, win(s.s6 + 0.3, tSo - 0.1), { icon: 'cross', iconCol: C.red, size: 36 });
    ellipseArrow([0, S.deck + 0.05, 0], 2.7, win(tSo + 0.3, W_('turns') + 1.0), -Math.PI * 0.15, -Math.PI * 0.15 + Math.PI * 1.15 * ease(P(t, tSo + 0.4, W_('turns') + 0.5)));
    chip('180° TURNTABLE', W / 2, 520, win(tSo + 0.3, W_('turns') + 0.9), { icon: 'check', iconCol: C.green, edge: C.yellow, size: 44 });
    chip('NOSE OUT — DRIVE AWAY FORWARDS', W / 2, 520, win(W_('turns') + 0.95, s.s7), { size: 32, icon: 'check', iconCol: C.green });
  }
  // S7
  if (t >= s.s7 && t < s.s8) {
    const tSo = W_('So', 5), tV = W_('concealed');
    callout('EXHAUST FUMES', [0, -1.6, -2.2], 330, 600, win(s.s7 + 0.4, tSo - 0.1), { col: '#c9ccd1', icon: 'warn' });
    callout('EXTRACT FAN', [2.8, -0.78, -1.0], 330, 1120, win(tSo + 0.1, tV - 0.9), { col: C.cyan, icon: 'air' });
    if (t > tSo && t < tV - 0.9) flowArrows([[0, -1.9, -2.6], [1.0, -1.4, -2.0], [2.0, -0.95, -1.3], [2.75, -0.78, -1.0]], '#d9f4ff', win(tSo + 0.2, tV - 0.9), 4, 0.7);
    if (t > tV - 0.9) {
      flowArrows([[3.2, -0.78, -1.0], [9, -0.78, -1.0], [14.4, -0.78, -1.0], [14.4, 0.7, -1.0]], '#bfefff', win(tV - 0.8, s.s8), 4, 0.6);
      callout('CONCEALED VENT', [14.4, 0.7, -1.0], 560, 560, win(tV - 0.1, s.s8), { col: C.green, icon: 'air' });
    }
  }
  // S8
  if (t >= s.s8 && t < s.s9) {
    const tSo = W_('So', 6), tAw = W_('carry');
    chip('RAIN COULD FLOOD IN', W / 2, 520, win(W_('water') - 0.2, tSo - 0.1), { icon: 'drop', iconCol: C.blue, size: 42 });
    if (t < tSo) for (const [x, z] of [[-2.86, 0], [2.86, 1.2], [0, 2.96]]) polyline([[x, 0.9, z], [x, 0.08, z]], C.blue, win(W_('flood') - 0.2, tSo - 0.1), { arrow: true, w: 7, dash: [12, 10] });
    if (t > tSo - 0.1 && t < tAw - 0.35) {
      callout('SLOT-DRAIN CHANNEL', [2.86, -0.02, 2.4], 360, 600, win(tSo, tAw - 0.35), { col: C.blue });
      callout('SUMP PUMP', [2.3, -3.1, -2.5], 340, 1130, win(tSo + 0.5, tAw - 0.35), { col: C.blue });
      flowArrows([[2.86, -0.1, 2.9], [2.86, -0.15, -2.6], [2.7, -1.5, -2.8], [2.4, -3.2, -2.6], [2.3, -1.5, -2.82], [2.3, -0.5, -3.3]], C.blue, win(tSo + 0.2, tAw - 0.35), 5, 0.35);
    }
    if (t > tAw - 0.35) chip('…AND CARRIED AWAY', W / 2, 520, win(tAw - 0.3, s.s9), { icon: 'drop', iconCol: C.blue, size: 42 });
  }
  // S9
  if (t >= s.s9 && t < s.s10) {
    const tTh = W_('three');
    chip('ONE SPACE?', W / 2, 520, win(s.s9 + 0.2, W_('design') - 0.1), { size: 44 });
    if (t > tTh - 0.2) {
      const a = win(tTh, s.s10);
      [[-2.6, 2.6, 0], [3.1, 6.3, 1], [6.4, 9.55, 2]].forEach(([x0, x1], i) => {
        polyline([[x0, -2.55, -2.75], [x1, -2.55, -2.75], [x1, -2.55, 2.75], [x0, -2.55, 2.75]], C.cyan, a, { close: true, w: 5 });
        const [cx, cy, cz] = proj((x0 + x1) / 2, -1.0, 2.2); if (cz < 1) { ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(cx, cy, 40, 0, 7); ctx.fillStyle = C.cyan; ctx.fill(); ctx.fillStyle = '#04202a'; ctx.font = `900 50px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), cx, cy + 2); ctx.restore(); }
      });
      polyline([[-2.6, -2.55, 3.4], [9.55, -2.55, 3.4]], '#ffffff', a * 0.8, { w: 3 });
      chip('3 CARS UNDER THE GARDEN', W / 2, 1230, a, { icon: 'check', iconCol: C.green, edge: C.cyan, size: 40 });
    }
  }
  // S10
  if (t >= s.s10) {
    chip('LONDON: EVERY METRE COUNTS', W / 2, 520, win(W_('London') - 0.2, W_('Press', 2) - 0.3), { size: 38, icon: 'pin2', iconCol: C.red });
    chip('PRESS', W / 2, 520, win(W_('Press', 2) - 0.1, W_('button', 2) + 0.5), { icon: 'pin', iconCol: C.green });
    chip('DRIVEWAY EMPTY AGAIN', W / 2, 520, win(W_('empty') - 0.2, W_('Congratulations') + 0.1), { icon: 'check', iconCol: C.green, size: 40 });
    endCard(P(t, W_('lawn', 1, 'e') - 0.2, W_('lawn', 1, 'e') + 0.4));
  }
  if (t < W_('lawn', 1, 'e') + 0.1) captions(t);
  // cut flashes + fade
  for (const c of T.cuts) { const d = t - c; if (d >= 0 && d < 0.18) { ctx.fillStyle = `rgba(255,255,255,${0.35 * (1 - d / 0.18)})`; ctx.fillRect(0, 0, W, H); } }
  const fin = P(t, 0, 0.35), fout = P(t, T.end - 0.85, T.end - 0.05);
  if (fin < 1 || fout > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.max(1 - fin, fout)})`; ctx.fillRect(0, 0, W, H); }
}

// ======================= SOUND CUES =======================
function buildCues() {
  const c = (t, k, d) => CUES.push(d ? { t, k, d } : { t, k });
  for (const t of T.cuts) c(t - 0.1, 'whoosh');
  c(W_('disappear') - 0.2, 'rumble');
  c(W_('fall'), 'fall'); c(W_('So', 1) - 0.3, 'rewind');
  c(W_('So', 1) - 0.0, 'hyd', 1.4); c(W_('So', 1) + 1.4, 'clunk');
  c(W_('button'), 'click'); c(W_('button') + 0.55, 'hyd', W_('But', 2) - W_('button') - 0.6); c(W_('leaked') - 0.2, 'hiss', 1.4);
  c(W_('drop'), 'clang');
  const s4 = T.s4; for (const t0 of [0.9, 1.9, 3.0, 4.0]) { c(s4 + t0, 'hyd', 0.42); c(s4 + t0 + 0.42, 'lock'); }
  c(s4 + 0.02, 'lock');
  const tT = W_('top'); c(tT - 0.35, 'hyd', 0.6); c(tT + 0.4, 'clunk');
  for (let i = 0; i < 16; i++) c(tT + 0.45 + i * ((W_('bricks') - tT) / 16), 'tap');
  c(W_('inconvenient') - 0.3, 'bump');
  c(W_('So', 4) + 0.55, 'turn', W_('turns') - W_('So', 4) + 0.0);
  c(T.s7 + 0.1, 'idle', T.s8 - T.s7 - 0.2); c(W_('So', 5) - 0.2, 'fan', T.s8 - W_('So', 5));
  c(T.s8, 'rain', T.s9 - T.s8); c(W_('So', 6), 'flow', T.s9 - W_('So', 6));
  c(W_('design') - 0.1, 'reveal'); c(W_('three'), 'pop');
  c(W_('button', 2), 'click'); c(W_('button', 2) + 0.25, 'hyd', W_('disappears') - W_('button', 2) + 0.45); c(W_('disappears') + 0.7, 'clunk');
  c(W_('Congratulations'), 'chime'); c(W_('lawn', 1, 'e') - 0.2, 'boom');
  CUES.sort((a, b) => a.t - b.t);
}

// ======================= RENDER =======================
function sceneIndex(t) { let i = 0; for (const c of T.cuts) if (t >= c) i++; return i; }
function render(t) {
  S = defaults(); camera.up.set(0, 1, 0); camera.userData.keepUp = false;
  const i = sceneIndex(t);
  // persistent progression between scenes
  if (i >= 1) { S.lid = 0; }
  if (i >= 4) { S.posts = 1; S.tray = 1; S.bricks = 1; }
  if (i >= 6) S.duct = true;
  scenes[i](t);
  apply(t);
  if (window.__hook) eval(window.__hook);
  renderer.render(scene, camera);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(glc, 0, 0);
  overlay(t);
}
window.setup = setup; window.render = render; window.ready = true;
window.__G = G; window.__roof = roof; window.__dbg = () => ({ roofVis: roof.visible, roofMats: (roof.userData.mats || []).map(m => [m.type, m.opacity, m.transparent]), liftVis: lift.visible, deck: lift.position.y, ductVis: G.duct.visible, ductChildren: G.duct.children.length, ductPos: G.duct.children[0].geometry.boundingBox, S: { roofGhost: S.roofGhost, posts: S.posts, front: S.front } });
