// ===== Stylised 3D characters: rig, faces and poses =====
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function ctex(c, rx = 1, ry = 1) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t; }
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

// fabric textures
function plaid(a, b, line) {
  const [c, g] = cv(256, 256); g.fillStyle = a; g.fillRect(0, 0, 256, 256);
  g.globalAlpha = 0.55; g.fillStyle = b; g.fillRect(0, 0, 96, 256); g.fillRect(0, 0, 256, 96);
  g.globalAlpha = 0.9; g.fillStyle = line; g.fillRect(150, 0, 10, 256); g.fillRect(0, 150, 256, 10);
  g.globalAlpha = 0.12; const r = rng(3); for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? '#000' : '#fff'; g.fillRect(r() * 256, r() * 256, 1.5, 1.5); }
  g.globalAlpha = 1; return ctex(c, 3, 3);
}
function knit(col, seed) {
  const [c, g] = cv(128, 128); g.fillStyle = col; g.fillRect(0, 0, 128, 128);
  const r = rng(seed); for (let y = 0; y < 128; y += 4) for (let x = 0; x < 128; x += 4) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${0.05 + r() * 0.07})`; g.fillRect(x, y, 3, 3); }
  return ctex(c, 4, 4);
}
function denim() {
  const [c, g] = cv(128, 128); g.fillStyle = '#3d5a85'; g.fillRect(0, 0, 128, 128);
  const r = rng(9); for (let i = 0; i < 3000; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '20,30,60' : '170,190,220'},0.25)`; g.beginPath(); const x = r() * 128, y = r() * 128; g.moveTo(x, y); g.lineTo(x + 3, y + 3); g.stroke(); }
  return ctex(c, 3, 3);
}
const TEX = {};
function fabric(kind, col) {
  const key = kind + col; if (TEX[key]) return TEX[key];
  let m;
  if (kind === 'plaid') m = new THREE.MeshStandardMaterial({ map: plaid(col, '#5a1414', '#f0e6d0'), roughness: 0.9 });
  else if (kind === 'denim') m = new THREE.MeshStandardMaterial({ map: denim(), roughness: 0.92 });
  else m = new THREE.MeshPhysicalMaterial({ map: knit(col, col.length), roughness: 0.88, sheen: 0.6, sheenColor: '#ffffff', sheenRoughness: 0.8 });
  if (m.map) { m.bumpMap = m.map; m.bumpScale = 0.6; }
  return (TEX[key] = m);
}

const cap = (r, l, mat) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 8, 18), mat); m.castShadow = true; m.receiveShadow = true; return m; };
const sph = (r, mat, ws = 28, hs = 20) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat); m.castShadow = true; m.receiveShadow = true; return m; };

export function makeCharacter(o) {
  const mats = {
    skin: new THREE.MeshPhysicalMaterial({ color: o.skin, roughness: 0.5, sheen: 0.5, sheenColor: '#ffd9c4', sheenRoughness: 0.6, clearcoat: 0.08 }),
    shirt: fabric(o.shirtKind || 'knit', o.shirt), pants: fabric(o.pantsKind || 'knit', o.pants),
    shoes: new THREE.MeshStandardMaterial({ color: o.shoes, roughness: 0.55 }),
    hair: new THREE.MeshPhysicalMaterial({ color: o.hair, roughness: 0.45, sheen: 0.7, sheenColor: '#ffffff', sheenRoughness: 0.4 }),
    white: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.15, clearcoat: 1 }),
    iris: new THREE.MeshPhysicalMaterial({ color: o.eye || '#3b2a1e', roughness: 0.1, clearcoat: 1 }),
    mouth: new THREE.MeshStandardMaterial({ color: '#6a1e22', roughness: 0.5 }),
    cheek: new THREE.MeshStandardMaterial({ color: '#ff8a80', roughness: 0.8, transparent: true, opacity: 0.35, depthWrite: false }),
  };
  const R = { mats };
  const root = new THREE.Group(); R.root = root;
  const body = new THREE.Group(); root.add(body); body.scale.setScalar(o.scale || 1); R.body = body;
  const LL = o.leg || 0.82;
  const hips = new THREE.Group(); hips.position.y = LL; body.add(hips); R.hips = hips;
  const pelvis = sph(0.175, mats.pants); pelvis.scale.set(1.08, 0.72, 0.86); hips.add(pelvis);
  // legs
  R.leg = {}; R.knee = {};
  for (const side of [1, -1]) {
    const hip = new THREE.Group(); hip.position.set(side * 0.095, -0.03, 0); hips.add(hip);
    const lt = LL * 0.47, ls = LL * 0.43;
    const th = cap(0.08, lt - 0.06, mats.pants); th.position.y = -lt / 2; hip.add(th);
    const knee = new THREE.Group(); knee.position.y = -lt; hip.add(knee);
    const sh = cap(0.068, ls - 0.04, o.shorts ? mats.skin : mats.pants); sh.position.y = -ls / 2; knee.add(sh);
    const shoe = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.1, 0.26, 3, 0.045), mats.shoes); shoe.position.set(0, -ls - 0.0, 0.045); shoe.castShadow = true; knee.add(shoe);
    R.leg[side] = hip; R.knee[side] = knee;
  }
  // torso
  const torso = new THREE.Group(); hips.add(torso); R.torso = torso;
  const chest = cap(0.2, 0.3, mats.shirt); chest.position.y = 0.3; chest.scale.set(1.1, 1, 0.8); torso.add(chest);
  if (o.dress) { const sk = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.42, 28, 1, true), mats.shirt); sk.position.y = 0.0; sk.material.side = THREE.DoubleSide; sk.castShadow = true; torso.add(sk); }
  const neck = cap(0.06, 0.06, mats.skin); neck.position.y = 0.63; torso.add(neck);
  // head
  const head = new THREE.Group(); head.position.y = 0.68; torso.add(head); R.head = head;
  const hs = o.headScale || 1; head.scale.setScalar(hs);
  const skull = sph(0.2, mats.skin, 40, 28); skull.position.y = 0.18; skull.scale.set(1, 1.04, 0.98); head.add(skull);
  for (const side of [1, -1]) { const ear = sph(0.042, mats.skin, 12, 8); ear.position.set(side * 0.198, 0.17, -0.005); ear.scale.set(0.6, 1, 0.8); head.add(ear); }
  const nose = sph(0.032, mats.skin, 16, 12); nose.position.set(0, 0.155, 0.2); nose.scale.set(1, 0.9, 0.9); head.add(nose);
  for (const side of [1, -1]) { const ck = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), mats.cheek); ck.position.set(side * 0.105, 0.115, 0.172); ck.rotation.y = side * 0.55; head.add(ck); }
  // eyes
  R.eyes = []; R.pupils = [];
  for (const side of [1, -1]) {
    const eg = new THREE.Group(); eg.position.set(side * 0.074, 0.2, 0.163); head.add(eg);
    const w = sph(0.047, mats.white, 20, 14); w.scale.set(1, 1.18, 0.62); eg.add(w);
    const pg = new THREE.Group(); eg.add(pg);
    const ir = sph(0.026, mats.iris, 16, 12); ir.position.z = 0.024; ir.scale.set(1, 1.1, 0.6); pg.add(ir);
    const gl = sph(0.008, mats.white, 8, 6); gl.position.set(0.01, 0.013, 0.04); pg.add(gl);
    R.eyes.push(eg); R.pupils.push(pg);
  }
  // brows
  R.brows = [];
  for (const side of [1, -1]) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.022, 0.025, 2, 0.01), mats.hair); b.position.set(side * 0.078, 0.282, 0.178); b.rotation.y = side * 0.25; head.add(b); R.brows.push({ m: b, side, y: 0.282 });
  }
  // mouths
  R.mouth = new THREE.Group(); R.mouth.position.set(0, 0.07, 0.186); head.add(R.mouth);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 24, Math.PI), mats.mouth); smile.rotation.z = Math.PI; R.mouth.add(smile);
  const grin = new THREE.Group(); { const s = new THREE.Mesh(new THREE.CircleGeometry(0.055, 24, Math.PI, Math.PI), mats.mouth); grin.add(s); const t = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.016), mats.white); t.position.set(0, -0.009, 0.001); grin.add(t); } R.mouth.add(grin);
  const oM = sph(0.032, mats.mouth, 16, 12); oM.scale.set(1, 1.3, 0.45); R.mouth.add(oM);
  const frown = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 24, Math.PI), mats.mouth); frown.position.y = -0.03; R.mouth.add(frown);
  const flat = cap(0.011, 0.06, mats.mouth); flat.rotation.z = Math.PI / 2; R.mouth.add(flat);
  R.mouths = { smile, grin, o: oM, frown, flat };
  // hair
  const hair = new THREE.Group(); head.add(hair);
  const hc = new THREE.Mesh(new THREE.SphereGeometry(0.214, 36, 20, 0, Math.PI * 2, 0, Math.PI * (o.hairLong ? 0.62 : 0.5)), mats.hair); hc.position.y = 0.19; hc.rotation.x = -0.32; hc.castShadow = true; hair.add(hc);
  if (o.hairStyle === 'short') { const fr = sph(0.07, mats.hair, 14, 10); fr.position.set(0.06, 0.34, 0.14); fr.scale.set(1.6, 0.6, 0.9); hair.add(fr); }
  if (o.hairStyle === 'bun') { const bn = sph(0.095, mats.hair); bn.position.set(0, 0.36, -0.14); hair.add(bn); const back = sph(0.2, mats.hair); back.position.set(0, 0.17, -0.04); back.scale.set(1.04, 1.02, 0.95); hair.add(back); }
  if (o.hairStyle === 'pig') { const back = sph(0.205, mats.hair); back.position.set(0, 0.17, -0.035); hair.add(back); for (const s of [1, -1]) { const p = sph(0.07, mats.hair); p.position.set(s * 0.22, 0.12, -0.06); p.scale.set(0.8, 1.3, 0.8); hair.add(p); } }
  if (o.hairStyle === 'mop') { const back = sph(0.205, mats.hair); back.position.set(0, 0.19, -0.03); hair.add(back); const fr = sph(0.09, mats.hair); fr.position.set(-0.05, 0.33, 0.13); fr.scale.set(1.8, 0.6, 0.8); hair.add(fr); }
  if (o.beanie) { const bm = fabric('knit', o.beanie); const bh = new THREE.Mesh(new THREE.SphereGeometry(0.222, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.47), bm); bh.position.y = 0.2; bh.rotation.x = -0.18; bh.castShadow = true; hair.add(bh); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.212, 0.032, 10, 36), bm); rim.rotation.x = Math.PI / 2 - 0.18; rim.position.set(0, 0.235, 0.012); hair.add(rim); const pom = sph(0.055, bm); pom.position.set(0, 0.43, -0.07); hair.add(pom); }
  // arms
  R.arm = {}; R.elbow = {};
  for (const side of [1, -1]) {
    const sh = new THREE.Group(); sh.position.set(side * 0.235, 0.52, 0); torso.add(sh);
    const ball = sph(0.072, mats.shirt, 16, 12); sh.add(ball);
    const ua = cap(0.062, 0.2, mats.shirt); ua.position.y = -0.15; sh.add(ua);
    const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
    const fa = cap(0.054, 0.18, o.longSleeve ? mats.shirt : mats.skin); fa.position.y = -0.12; el.add(fa);
    const hand = sph(0.066, mats.skin, 16, 12); hand.position.y = -0.28; hand.scale.set(0.9, 1.05, 0.8); el.add(hand);
    const th = cap(0.024, 0.04, mats.skin); th.position.set(-side * 0.0 + 0.0, -0.25, 0.055); th.rotation.x = 0.6; el.add(th);
    R.arm[side] = sh; R.elbow[side] = el;
  }
  R.seed = o.seed || 1;
  return R;
}

// pose: everything optional. Angles in radians.
export function pose(R, p, t) {
  const L = 1, Rt = -1;
  const ph = p.walk ? p.walk : 0, wa = p.walkAmt ?? (p.walk !== undefined ? 1 : 0);
  const sw = Math.sin(ph) * 0.5 * wa, run = p.run ? 1.6 : 1;
  R.hips.position.y = (R.hips.userData.y0 ?? (R.hips.userData.y0 = R.hips.position.y)) + Math.abs(Math.cos(ph)) * 0.035 * wa * run + (p.hipY || 0);
  R.hips.rotation.set(p.hipPitch || 0, p.hipYaw || 0, p.hipRoll || 0);
  R.leg[L].rotation.set((p.legL ?? 0) - sw * run, 0, p.legLz || 0); R.leg[Rt].rotation.set((p.legR ?? 0) + sw * run, 0, -(p.legRz || 0));
  R.knee[L].rotation.x = (p.kneeL ?? 0) + Math.max(0, Math.sin(ph + 1.2)) * 0.7 * wa * run;
  R.knee[Rt].rotation.x = (p.kneeR ?? 0) + Math.max(0, Math.sin(ph + 1.2 + Math.PI)) * 0.7 * wa * run;
  R.torso.rotation.set((p.lean || 0) + 0.06 * wa * (run - 1), p.twist || 0, p.tilt || 0);
  const armSw = sw * 1.2 * run;
  R.arm[L].rotation.set((p.armL ?? 0) + armSw, p.armLy || 0, 0.12 + (p.armLz || 0));
  R.arm[Rt].rotation.set((p.armR ?? 0) - armSw, p.armRy || 0, -0.12 - (p.armRz || 0));
  R.elbow[L].rotation.x = (p.elbowL ?? 0) - 0.25 * wa * run; R.elbow[Rt].rotation.x = (p.elbowR ?? 0) - 0.25 * wa * run;
  R.head.rotation.set(p.headPitch || 0, p.headYaw || 0, p.headRoll || 0);
  // face
  const blinkCycle = (t * 0.31 + R.seed * 0.37) % 1, bl = p.blink ?? (blinkCycle < 0.035 ? 1 : 0);
  const eyeOpen = Math.max(0.06, (1 - bl) * (p.eyeOpen ?? 1));
  R.eyes.forEach(e => { e.scale.set(1, eyeOpen * (p.wide ? 1.25 : 1), 1); });
  R.pupils.forEach(pp => { pp.position.set((p.lookX || 0) * 0.016, (p.lookY || 0) * 0.014, 0); });
  const br = p.brow || 'neutral';
  for (const b of R.brows) {
    let rz = 0, y = b.y;
    if (br === 'angry') { rz = b.side * 0.38; y -= 0.01; }
    if (br === 'worried') { rz = -b.side * 0.32; y += 0.01; }
    if (br === 'up') { y += 0.035; }
    b.m.rotation.z = rz; b.m.position.y = y;
  }
  const mk = p.mouth || 'smile';
  for (const [k, m] of Object.entries(R.mouths)) m.visible = k === mk;
  const talk = p.talk ? (0.55 + 0.45 * Math.abs(Math.sin(t * 17 + R.seed))) : 1;
  R.mouth.scale.set(1, mk === 'o' ? talk * (p.mouthOpen || 1) : (p.talk ? 0.7 + 0.5 * talk : 1), 1);
}
