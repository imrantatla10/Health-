// ===== How Do You Build a Bridge — scene assembly, direction & overlays =====
import * as THREE from 'three';
import { makeMaterials, makeCar, box, clamp, lerp, hash } from './common.js';
import { WATER_Y, BED_Y, LOG_R, LOG_L, LOG_X, DECK_Y, SPAN, PIER_Z, POST_X, height, riverC, makeWorldMaterials, makeTerrain, makeVegetation, cullNear, makeLog, bendLog, sagAt } from './world.js';
import { makeCharacter, pose } from './chars.js';

const W = 1080, H = 1920;
const P = (t, a, b) => clamp((t - a) / (b - a));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eo = t => 1 - Math.pow(1 - t, 3);
const ei = t => t * t * t;
const smooth = t => t * t * (3 - 2 * t);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------- renderer ----------------
const glc = document.getElementById('gl'), out = document.getElementById('out'), ctx = out.getContext('2d');
const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, 0.05, 600);
const M = makeMaterials(), WM = makeWorldMaterials();

// ---------------- sky dome + environment ----------------
const skyU = { uTop: { value: new THREE.Color('#2f6fb8') }, uHor: { value: new THREE.Color('#cfe3f0') }, uSun: { value: V(0.45, 0.6, 0.55).normalize() }, uSunCol: { value: new THREE.Color('#fff2d8') }, uWarm: { value: 0 } };
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=p.xyww; }',
  fragmentShader: `uniform vec3 uTop,uHor,uSun,uSunCol; uniform float uWarm; varying vec3 vD;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p*=2.03;a*=.5;}return s;}
  void main(){ vec3 d=normalize(vD); float y=d.y; vec3 c=mix(uHor,uTop,pow(clamp(y,0.,1.),0.55));
    if(y<0.) c=mix(uHor*0.92,vec3(0.36,0.42,0.36),clamp(-y*4.,0.,1.));
    float sd=max(dot(d,uSun),0.); c+=uSunCol*(pow(sd,900.)*6.+pow(sd,12.)*0.25*(0.4+uWarm));
    vec2 cp=d.xz/(y+0.12)*0.9; float cl=smoothstep(0.52,0.78,fbm(cp*1.3+vec2(3.,1.)))*smoothstep(0.02,0.18,y);
    vec3 ccol=mix(vec3(1.0),vec3(1.0,0.82,0.62),uWarm)*(0.86+0.14*fbm(cp*3.));
    c=mix(c,ccol,cl*0.85); gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), skyMat); sky.frustumCulled = false; scene.add(sky);
const ENV = {};
function makeEnv(warm) {
  const es = new THREE.Scene();
  const m = skyMat.clone(); m.uniforms = THREE.UniformsUtils.clone(skyU); m.uniforms.uWarm.value = warm;
  if (warm) { m.uniforms.uTop.value.set('#4a77b4'); m.uniforms.uHor.value.set('#f4cf9e'); m.uniforms.uSunCol.value.set('#ffc98a'); m.uniforms.uSun.value.set(0.7, 0.18, 0.69).normalize(); }
  es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), m));
  const gr = new THREE.Mesh(new THREE.CircleGeometry(49, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: warm ? '#5d6a3a' : '#4f6a3a' })); gr.position.y = -2; es.add(gr);
  const pm = new THREE.PMREMGenerator(renderer); return pm.fromScene(es, 0.02).texture;
}
ENV.day = makeEnv(0); ENV.gold = makeEnv(1);
scene.environment = ENV.day;
scene.fog = new THREE.Fog('#cddbe4', 45, 210);

const hemi = new THREE.HemisphereLight('#d8e8ff', '#5d5a3a', 0.85); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1dc', 3.1); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 90 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; scene.add(sun); scene.add(sun.target);

// ---------------- world ----------------
const terrain = makeTerrain(WM); scene.add(terrain);
const veg = makeVegetation(WM); scene.add(veg);
const water = new THREE.Mesh(new THREE.PlaneGeometry(170, 170).rotateX(-Math.PI / 2), WM.water); water.position.y = WATER_Y; water.renderOrder = 1; water.receiveShadow = true; scene.add(water);
// section faces for the front (z) cutaway
const CUTZ = 2.35;
const section = new THREE.Group(); scene.add(section);
{
  const sh = new THREE.Shape(); sh.moveTo(-40, -7);
  for (let x = -40; x <= 40; x += 0.25) sh.lineTo(x, height(x, CUTZ) - 0.005);
  sh.lineTo(40, -7); sh.closePath();
  const sf = new THREE.Mesh(new THREE.ShapeGeometry(sh), WM.soilFace); sf.position.z = CUTZ; section.add(sf);
  const wsh = new THREE.Shape(); wsh.moveTo(-40, WATER_Y); wsh.lineTo(40, WATER_Y);
  for (let x = 40; x >= -40; x -= 0.25) wsh.lineTo(x, Math.min(WATER_Y, height(x, CUTZ)));
  wsh.closePath(); const wf = new THREE.Mesh(new THREE.ShapeGeometry(wsh), WM.waterFace); wf.position.z = CUTZ + 0.002; wf.renderOrder = 3; section.add(wf);
  // strata lines on the soil face
  for (const [y, c] of [[-2.6, '#5a4430'], [-3.6, '#4d3a29'], [-5.0, '#433325']]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(80, 0.06), new THREE.MeshBasicMaterial({ color: c })); l.position.set(0, y, CUTZ + 0.004); section.add(l); }
}
const clipZ = [new THREE.Plane(V(0, 0, -1), CUTZ)];

// ---------------- bridge parts ----------------
const logA = makeLog(WM, 1), logB = makeLog(WM, 2); scene.add(logA, logB);
// planks (instanced)
const NPL = 39, plZ = i => -5.32 + i * 0.28;
const planks = new THREE.InstancedMesh(new THREE.BoxGeometry(3.0, 0.07, 0.24), WM.plank, NPL); planks.castShadow = true; planks.receiveShadow = true; scene.add(planks);
{ const c = new THREE.Color(); for (let i = 0; i < NPL; i++) { c.setHSL(0.08 + hash(i, 3) * 0.02, 0.3, 0.72 + hash(i, 5) * 0.2); planks.setColorAt(i, c); } }
const dummy = new THREE.Object3D();
// ramps (both ends)
const ramps = [];
for (const s of [1, -1]) {
  const g = new THREE.Group(); scene.add(g); ramps.push(g);
  const L = 1.95, ang = Math.atan2(DECK_Y, 1.8);
  const tilt = new THREE.Group(); tilt.position.set(0, 0, s * 7.3); tilt.rotation.x = s * ang; g.add(tilt); // hinge at ground end
  for (let k = 0; k < 7; k++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.07, 0.24), WM.plank); pl.position.set(0, -0.035, -s * (0.14 + k * 0.27)); pl.castShadow = pl.receiveShadow = true; tilt.add(pl); }
  for (const x of [-1.0, 1.0]) { const sg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, L), WM.beam); sg.position.set(x, -0.17, -s * L / 2); sg.castShadow = true; tilt.add(sg); }
}
// piers: posts + cap beams + braces
const piers = [];
for (const pz of [-PIER_Z, PIER_Z]) {
  const pier = { z: pz, posts: [], beam: null, braces: [] };
  for (const sx of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(sx * POST_X, BED_Y, pz); scene.add(pv); // pivot at riverbed
    const drv = new THREE.Group(); pv.add(drv);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.18, 2.6, 18), WM.post); post.position.y = 2.0 - 0.32 - 1.3; post.castShadow = true; post.receiveShadow = true; drv.add(post);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.35, 18), WM.post); tip.rotation.x = Math.PI; tip.position.y = 2.0 - 0.32 - 2.6 - 0.175; drv.add(tip);
    const capr = new THREE.Mesh(new THREE.CircleGeometry(0.17, 18).rotateX(-Math.PI / 2), WM.ring); capr.position.y = 2.0 - 0.32 + 0.001; drv.add(capr);
    pier.posts.push({ pv, drv });
  }
  const bm = box([-2.05, 2.05, -0.32, 0, pz - 0.16, pz + 0.16], WM.beam, { s: 1.2 }); scene.add(bm); pier.beam = bm;
  for (const [s, dz] of [[1, 0.21], [-1, -0.21]]) {
    const len = Math.hypot(2 * POST_X, 1.3), ang = Math.atan2(1.3, 2 * POST_X);
    const b = box([-len / 2, len / 2, -0.1, 0.1, -0.035, 0.035], WM.brace, { uv: false }); b.position.set(0, -1.1, pz + dz); b.rotation.z = s * ang; b.userData.ang = s * ang; scene.add(b); pier.braces.push(b);
  }
  piers.push(pier);
}
// railings
const rail = { posts: [], rails: [], mesh: [] };
for (const sx of [-1, 1]) {
  for (let k = 0; k < 9; k++) { const p = box([-0.055, 0.055, 0, 1.1, -0.055, 0.055], WM.rail, { uv: false }); p.position.set(sx * 1.43, DECK_Y, -5.3 + k * 1.325); scene.add(p); rail.posts.push({ m: p, k, sx }); }
  for (const [h, th] of [[1.07, 0.07], [0.6, 0.05], [0.12, 0.05]]) { const r = box([-0.045, 0.045, -th / 2, th / 2, 0, 10.7], WM.rail, { uv: false }); r.position.set(sx * 1.43, DECK_Y + h, -5.35); scene.add(r); rail.rails.push(r); }
  const msh = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 0.92), WM.mesh.clone()); msh.material.map = WM.mesh.map.clone(); msh.material.map.repeat.set(20, 1.8); msh.material.map.needsUpdate = true;
  msh.rotation.y = Math.PI / 2; msh.position.set(sx * 1.43, DECK_Y + 0.6, 0); scene.add(msh); rail.mesh.push(msh);
}
// rope
const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 8), WM.rope); rope.castShadow = true; scene.add(rope);
function setRope(a, b) { const d = b.clone().sub(a), l = d.length(); rope.position.copy(a).addScaledVector(d, 0.5); rope.scale.set(1, l, 1); rope.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); }

// ---------------- characters ----------------
const HERO = { skin: '#e0a882', shirt: '#c8352c', shirtKind: 'plaid', pants: '#3d5a85', pantsKind: 'denim', shoes: '#5a3a22', hair: '#4a2e1c', hairStyle: 'short', beanie: '#f2a33a', seed: 1, longSleeve: false };
const hero = makeCharacter(HERO); scene.add(hero.root);
const driver = makeCharacter({ ...HERO, seed: 2 });
const neigh = makeCharacter({ skin: '#b98262', shirt: '#7d4fb0', pants: '#3a3d45', shoes: '#2a2a2e', hair: '#1f1612', hairStyle: 'bun', seed: 3, leg: 0.8, eye: '#2a1a10', longSleeve: true });
const kid1 = makeCharacter({ skin: '#c9906c', shirt: '#ffc928', pants: '#2e8f6a', shoes: '#e8463c', hair: '#2a1a12', hairStyle: 'mop', seed: 4, scale: 0.62, headScale: 1.3, shorts: true });
const kid2 = makeCharacter({ skin: '#e8b994', shirt: '#2bb3c0', pants: '#e85d8a', shoes: '#ffffff', hair: '#b5652a', hairStyle: 'pig', seed: 5, scale: 0.6, headScale: 1.32, dress: false });
scene.add(neigh.root, kid1.root, kid2.root);

// ---------------- car ----------------
const car = makeCar(M, '#2a8bd6', 'BR1 DGE'); scene.add(car);
car.add(driver.root); driver.root.position.set(-0.4, -0.04, 0.22); driver.root.scale.setScalar(0.75);

// ---------------- particles ----------------
class Puffs {
  constructor(n, color, blend = THREE.NormalBlending) {
    this.n = n; const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3); this.size = new Float32Array(n); this.alpha = new Float32Array(n);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1)); g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: blend, uniforms: { uColor: { value: new THREE.Color(color) }, uScale: { value: 1000 } },
      vertexShader: 'uniform float uScale; attribute float aSize; attribute float aAlpha; varying float vA; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=min(220.,aSize*uScale/max(0.05,-mv.z)); vA=aAlpha*smoothstep(0.3,1.2,-mv.z); }',
      fragmentShader: 'uniform vec3 uColor; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,.15,d)*vA; if(a<.004) discard; gl_FragColor=vec4(uColor*(1.05-d*0.4),a);\n#include <colorspace_fragment>\n}'
    });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 5; scene.add(this.pts); this.g = g;
  }
  update(fn) { const v = new THREE.Vector3(); for (let i = 0; i < this.n; i++) { const r = fn(i, v); this.pos[i * 3] = v.x; this.pos[i * 3 + 1] = v.y; this.pos[i * 3 + 2] = v.z; this.size[i] = r[0]; this.alpha[i] = r[1]; } for (const k of ['position', 'aSize', 'aAlpha']) this.g.attributes[k].needsUpdate = true; }
  hide() { this.pts.visible = false; } show() { this.pts.visible = true; this.mat.uniforms.uScale.value = H / (2 * Math.tan(camera.fov * Math.PI / 360)); }
}
const spray = new Puffs(520, '#e9f6ff'), dust = new Puffs(160, '#b49a74'), drips = new Puffs(90, '#bfe6ff'), mud = new Puffs(120, '#6a5038');
const RINGS = Array.from({ length: 10 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#eaf6ff', transparent: true, opacity: 0, depthWrite: false })); m.position.y = WATER_Y + 0.01; m.renderOrder = 4; scene.add(m); return m; });
const NCF = 260, confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.07, 0.11), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.5 }), NCF); confetti.frustumCulled = false; scene.add(confetti);
{ const c = new THREE.Color(), pal = ['#ffd23f', '#ff4d6d', '#3fd4ff', '#32d74b', '#ffffff', '#b06bff']; for (let i = 0; i < NCF; i++) { c.set(pal[i % pal.length]); confetti.setColorAt(i, c); } }

// ---------------- timeline ----------------
let TL, T = {};
const norm = s => s.toLowerCase().replace(/[^a-z]/g, '');
function wt(word, n = 1, key = 's') { let k = 0; for (const w of TL.words) if (norm(w.w) === norm(word) && ++k === n) return w[key]; throw new Error('word ' + word + n); }
const W_ = (w, n = 1, k = 's') => wt(w, n, k);
const CUES = [];
function setup(tl) {
  TL = tl;
  T.s2 = W_('First') - 0.12; T.walk = W_('try') - 0.2; T.splash = W_('SPLASH') - 0.02;
  T.s3 = W_('So', 2) - 0.12; T.plank = W_('connect') - 0.3; T.carIn = W_('Now') - 0.2;
  T.s4 = W_('But', 3) - 0.12; T.face = W_('weight') - 0.55; T.posts = W_('So', 3) - 0.12; T.beams = W_('place', 2) - 0.25;
  T.s5 = W_('Problem') - 0.15; T.wob = W_('supports') - 0.45; T.brace = W_('So', 4) - 0.1; T.tri = W_('turning') - 0.25;
  T.s6 = W_('But', 4) - 0.08; T.kids = W_('kids') - 0.45; T.rail = W_('So', 5) - 0.1;
  T.s7 = W_('And', 5) - 0.15; T.pull = W_('Congratulations') - 0.2;
  T.end = tl.dur; T.endCard = W_('inventions', 1, 'e') + 0.05;
  T.cuts = [T.s2, T.walk, T.splash, T.s3, T.plank, T.carIn, T.s4, T.face, T.posts, T.beams, T.s5, T.wob, T.s6, T.kids, T.rail, T.s7, T.pull];
  T.fall0 = W_('SPLASH') - 0.5; T.hit = W_('SPLASH') + 0.0;
  T.pileHits = [0, 1, 2, 3].map(k => W_('drive', 2) - 0.1 + k * ((W_('riverbed', 1, 'e') - W_('drive', 2)) / 3.2));
  buildCaptions(); buildCues();
  return { T, CUES };
}

// ---- per-frame world state ----
function defaults() {
  return {
    logA: null, logB: null, sag: 0, planks: 0, ramps: 0, posts: 0, postDrive: 1, beams: 0, beamSlide: 0, braces: 0, wobble: 0, rails: 0, railBars: 0, railMesh: 0,
    cut: null, waterA: 0.86, warm: 0, carZ: null, carX: 0, rope: null, splash: null, dust: null, drips: 0, spit: null, mud: null, confetti: null, shake: 0, rings: [],
    heroVis: true, neighVis: false, kidsVis: false,
  };
}
let S;

function cam(a, b = a, k = 0, up = null) {
  const p = V(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)), t = V(lerp(a[3], b[3], k), lerp(a[4], b[4], k), lerp(a[5], b[5], k));
  camera.up.copy(up || V(0, 1, 0)); camera.position.copy(p); camera.fov = lerp(a[6] || 50, b[6] || 50, k); camera.lookAt(t); camera.updateProjectionMatrix(); camera.userData.t = t;
}
function deckY(z, sag) { const a = Math.abs(z); if (a <= 5.5) return DECK_Y + sagAt(z, sag); if (a < 7.3) return lerp(DECK_Y, 0, (a - 5.5) / 1.8); return Math.max(0, height(0, z)); }
// log placement: pivot swing from along-bank to across-river
function logSwing(px, dir, k, lift) { // returns {pos, rotY}; k 0..1 ; dir=-1 log extends toward -x, +1 toward +x
  const phi = (Math.PI / 2) * k; // 0: along bank, 1: across
  const d = V(dir * Math.cos(phi), 0, -Math.sin(phi)); // from near-end pivot to far end
  const pivot = V(px, LOG_R, 5.5);
  const c = pivot.clone().addScaledVector(d, LOG_L / 2); c.y += lift;
  return { pos: c, rotY: Math.atan2(d.x, d.z) + Math.PI };
}
function placeLog(log, st, sag) {
  if (!st) { log.visible = false; return; } log.visible = true;
  log.position.copy(st.pos); log.rotation.set(st.rotX || 0, st.rotY, st.rotZ || 0); bendLog(log, st.final ? sag : 0);
}
const FINAL = x => ({ pos: V(x, LOG_R, 0), rotY: 0, final: true });

// character helpers
function place(R, x, y, z, yaw = 0) { R.root.position.set(x, y, z); R.root.rotation.set(0, yaw, 0); R.root.visible = true; }
const face = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]);

// ======================= SCENES =======================
const scenes = [
  // ---- 1: a river, no bridge ----
  function s1(t) {
    const tSw = W_('cant') - 0.1, tSo = W_('So', 1) - 0.1, tHow = W_('But', 2);
    S.logA = { pos: V(-7, LOG_R, 5.5).add(V(-LOG_L / 2, 0, 0)), rotY: Math.PI / 2 }; // fallen tree lying on the bank
    S.logA.pos.set(-12.5, LOG_R, 7.2); S.logA.rotY = 1.35;
    place(hero, 0.5, 0, 5.05, Math.PI);
    const dip = Math.sin(clamp((t - tSw) / 1.1) * Math.PI);
    const shake = t > tSw + 0.9 && t < tSo + 0.3 ? Math.sin((t - tSw) * 16) * 0.35 * (1 - P(t, tSw + 0.9, tSo + 0.3)) : 0;
    const scratch = P(t, tHow - 0.1, tHow + 0.4);
    pose(hero, { legR: -0.7 * dip, kneeR: 0.1 * dip, lean: -0.12 * dip, armL: -0.3 * dip, armLz: 0.5 * dip, armRz: 0.4 * dip, headYaw: shake, headPitch: 0.25 * dip,
      brow: t > tSw ? (t > tHow ? 'up' : 'worried') : 'neutral', mouth: t > tSw + 0.3 && t < tHow ? 'frown' : (t > tHow ? 'flat' : 'smile'), lookY: -0.6 * dip,
      armR: -2.6 * scratch, elbowR: -1.6 * scratch, armRz: 0.4 * dip + 0.2 * scratch, headRoll: 0.15 * scratch }, t);
    const A = [4, 27, 46, 0, -0.6, 0, 42], B = [2.4, 5.2, 15.5, 0, 0.2, 3.5, 44], C = [3.2, 1.25, 8.0, 0.4, 0.55, 4.7, 38];
    const D = [2.3, 1.75, 8.6, -0.5, 0.35, -2.5, 50], E = [2.1, 1.9, 8.1, -0.5, 0.2, -3.5, 48];
    if (t < tSw - 0.15) cam(A, B, ease(P(t, 0, tSw - 0.15)));
    else if (t < tSo) cam(B, C, ease(P(t, tSw - 0.15, tSo)));
    else cam(D, E, ease(P(t, tSo, T.s2)));
  },
  // ---- 2a: drag the fallen tree across ----
  function s2(t) {
    const u = t - T.s2, tDrag1 = W_('fallen') - 0.15, tLand = W_('river', 2, 'e') + 0.1;
    const dk = ease(P(t, T.s2 + 0.1, tDrag1)), sk = ease(P(t, tDrag1, tLand));
    const px = lerp(-7.5, -LOG_X, dk);
    const st = logSwing(px, -1, sk, 0.22 * Math.sin(sk * Math.PI)); S.logA = st;
    if (sk >= 1) S.logA = FINAL(-LOG_X);
    S.dust = { t0: tLand, at: V(-LOG_X, 0.05, -4.8), n: 1 };
    if (t > tLand) S.shake = Math.max(0, 1 - (t - tLand) * 3.5);
    if (t < tDrag1) {
      const hx = px + 1.7; place(hero, hx, 0, 5.5, -Math.PI / 2);
      pose(hero, { walk: -t * 7, walkAmt: 0.75, lean: -0.38, armL: -1.25, armR: -1.25, elbowL: -0.3, elbowR: -0.3, armLz: -0.15, armRz: -0.15, brow: 'angry', mouth: 'grin', eyeOpen: 0.45, headPitch: 0.15 }, t);
      setRope(V(hx - 0.42, 0.95, 5.5), V(px + 0.05, LOG_R + 0.05, 5.5)); S.rope = true;
      cam([px + 0.9, 1.0, 11.4, px + 0.85, 0.7, 5.5, 50], [px + 0.9, 0.95, 10.8, px + 0.85, 0.7, 5.5, 48], P(t, T.s2, tDrag1));
    } else {
      place(hero, -LOG_X + 1.25, 0, 6.05, Math.PI * 1.15);
      const k = P(t, tDrag1, tLand);
      pose(hero, { lean: 0.35, armL: -1.5, armR: -1.5, elbowL: -0.4, elbowR: -0.4, legL: -0.5, kneeL: 0.4, legR: 0.35, brow: t > tLand ? 'up' : 'angry', mouth: t > tLand ? 'smile' : 'grin', eyeOpen: t > tLand ? 1 : 0.45 }, t);
      cam([-1.0, 10.5, 10.5, -1.6, -0.5, 0.2, 52], [-0.8, 11.5, 11.2, -1.4, -0.5, 0, 52], ease(k));
    }
  },
  // ---- 2b: walk the log ----
  function s2b(t) {
    S.logA = FINAL(-LOG_X);
    const tW0 = T.walk + 0.1, tFall = T.fall0, tBal = W_('lose') - 0.1;
    const zA = 6.3, zB = 0.25; const k = P(t, tW0, tBal + 0.6);
    let z = lerp(zA, zB, k < 1 ? k : 1);
    const onLog = z < 5.6; const y = onLog ? LOG_R * 2 - 0.01 : 0;
    let wob = 0, tz = 0;
    if (t > tBal) { wob = Math.sin((t - tBal) * 9) * (0.25 + 0.5 * P(t, tBal, tFall)); }
    let fallK = P(t, tFall, T.hit);
    const x = -LOG_X - 0.9 * ei(fallK), yy = lerp(y, -1.5, ei(fallK));
    place(hero, x, yy, z, Math.PI);
    hero.root.rotation.z = -wob * 0.35 - 1.35 * ei(fallK);
    const walking = t < tBal + 0.6;
    pose(hero, { walk: walking ? t * 6.5 : undefined, walkAmt: walking ? 0.55 : 0, armLz: 1.25 + wob * 0.8, armRz: 1.25 - wob * 0.8, armL: Math.sin(t * 12) * 0.8 * P(t, tBal, tBal + 0.3), armR: -Math.sin(t * 12) * 0.8 * P(t, tBal, tBal + 0.3),
      tilt: wob * 0.3, brow: t > tBal ? 'worried' : 'neutral', mouth: t > tBal ? 'o' : (t > W_('works') ? 'grin' : 'flat'), wide: t > tBal, lookY: t < tBal ? -0.7 : 0, lookX: t > tBal ? Math.sin(t * 7) : 0 }, t);
    const hz = Math.max(z, 0.25);
    cam([-LOG_X + 1.9, 1.45, hz - 3.6, -LOG_X - 0.1, 0.95, hz + 0.2, 46], [-LOG_X + 1.6, 1.3, hz - 3.0, -LOG_X - 0.1, 0.85, hz + 0.2, 44], P(t, tBal, tFall));
  },
  // ---- 2c: SPLASH ----
  function s2c(t) {
    S.logA = FINAL(-LOG_X);
    const tUp = W_('fall', 1) - 0.25, tSpit = W_('water') + 0.05;
    S.splash = { t0: T.hit, at: V(-LOG_X - 0.95, WATER_Y, 0.25) };
    S.shake = Math.max(0, 0.8 - (t - T.hit) * 2.5);
    const up = eo(P(t, tUp, tUp + 0.5));
    place(hero, -LOG_X - 0.95, lerp(-2.6, -2.15, up), 0.35, Math.PI * 0.62);
    pose(hero, { armL: -0.3, armR: -0.3, armLz: 0.9 * up, armRz: 0.9 * up, brow: 'angry', mouth: t > tSpit - 0.1 && t < tSpit + 0.6 ? 'o' : 'frown', eyeOpen: t < tUp + 0.6 ? 0.25 : 0.8, headPitch: t > tSpit && t < tSpit + 0.6 ? -0.3 : 0 }, t);
    hero.root.visible = t > tUp - 0.1;
    S.spit = { t0: tSpit, from: V(-LOG_X - 0.95 + 0.18, -2.15 + 1.57, 0.35 + 0.1) };
    S.rings = [[T.hit, -LOG_X - 0.95, 0.25, 2.2], [T.hit + 0.25, -LOG_X - 0.95, 0.25, 1.6], [tUp + 0.1, -LOG_X - 0.95, 0.35, 1.2], [tSpit + 0.4, -LOG_X - 0.3, 0.6, 0.6]];
    if (t < tUp + 0.2) cam([3.2, -0.35, 2.6, -LOG_X - 0.9, -0.4, 0.3, 44], [3.0, -0.38, 2.4, -LOG_X - 0.9, -0.5, 0.3, 44], P(t, T.splash, tUp + 0.2));
    else cam([0.6, -0.35, 2.2, -LOG_X - 0.95, -0.55, 0.35, 34], [0.5, -0.4, 1.95, -LOG_X - 0.95, -0.55, 0.35, 30], ease(P(t, tUp + 0.2, T.s3)));
  },
  // ---- 3a: second log ----
  function s3(t) {
    S.logA = FINAL(-LOG_X);
    const tA = W_('another') - 0.1, tL = W_('beside', 1, 'e') + 0.1;
    const sk = ease(P(t, tA, tL)); S.logB = sk < 1 ? logSwing(LOG_X, 1, sk, 0.2 * Math.sin(sk * Math.PI)) : FINAL(LOG_X);
    S.dust = { t0: tL, at: V(LOG_X, 0.05, -4.8), n: 1 }; if (t > tL) S.shake = Math.max(0, 0.7 - (t - tL) * 3);
    S.drips = 1;
    place(hero, LOG_X + 1.2, 0, 6.15, Math.PI * 0.85);
    pose(hero, { lean: 0.3, armL: -1.5, armR: -1.5, elbowL: -0.4, elbowR: -0.4, legL: -0.45, kneeL: 0.35, legR: 0.3, brow: 'angry', mouth: 'grin', eyeOpen: 0.5 }, t);
    cam([5.5, 8.0, 12.0, 0, -0.4, 0.4, 46], [4.6, 7.0, 10.6, 0, -0.4, 0.2, 46], ease(P(t, T.s3, T.plank)));
  },
  // ---- 3b: planks ----
  function s3b(t) {
    S.logA = FINAL(-LOG_X); S.logB = FINAL(LOG_X);
    const t0 = T.plank + 0.25, t1 = W_('walkway') + 0.2;
    S.planks = P(t, t0, t1); S.ramps = P(t, t0 - 0.1, t0 + 0.3);
    S.drips = 0.6;
    const hz = lerp(7.6, 2.0, ease(P(t, t0 + 0.3, T.carIn)));
    place(hero, -0.35, deckY(hz, 0), hz, Math.PI);
    pose(hero, { walk: t * 6, walkAmt: 0.85, brow: 'up', mouth: 'grin', armLz: 0.1 }, t);
    const fz = lerp(5.3, -5.3, S.planks);
    cam([4.6, 2.0, fz + 4.2, 0, 0.35, fz - 0.3, 44], [4.4, 2.1, fz + 4.0, 0, 0.35, fz - 0.5, 44], 0);
  },
  // ---- 3c: drive a car across ----
  function s3c(t) {
    S.planks = 1; S.ramps = 1; S.heroVis = false;
    S.carZ = lerp(17, 3.2, eo(P(t, T.carIn, T.s4 + 0.4)));
    cam([1.3, 0.95, -4.6, 0, 1.0, 4.5, 40], [1.15, 0.85, -4.2, 0, 1.0, 4.0, 40], P(t, T.carIn, T.s4));
  },
  // ---- 4a: bending ----
  function s4(t) {
    S.planks = 1; S.ramps = 1; S.heroVis = false;
    S.carZ = lerp(3.2, 0.0, eo(P(t, T.s4 - 0.4, W_('middle') + 0.2)));
    S.sag = 0.32 * ease(P(t, W_('starts') - 0.2, W_('weight') - 0.2));
    cam([16.5, 1.1, 1.6, 0, 0.1, -0.3, 40], [15.0, 0.85, 1.4, 0, 0.0, -0.3, 40], ease(P(t, T.s4, T.face)));
  },
  // ---- 4b: worried driver ----
  function s4b(t) {
    S.planks = 1; S.ramps = 1; S.heroVis = false; S.carZ = 0; S.sag = 0.32;
    S.shake = 0.15;
    cam([2.9, 1.3, -0.35, 0.35, 1.15, -0.25, 32], [2.7, 1.28, -0.38, 0.35, 1.15, -0.25, 29], P(t, T.face, T.posts));
  },
  // ---- 4c: drive posts ----
  function s4c(t) {
    S.planks = 1; S.ramps = 1; S.heroVis = false; S.carZ = 0; S.sag = 0.32;
    S.waterA = 0.42; S.posts = 1;
    const hits = T.pileHits; let drv = 1.15;
    S.postIn = P(t, T.posts + 0.05, hits[0] - 0.05);
    for (const h of hits) if (t >= h) drv -= 0.29 * eo(P(t, h, h + 0.08));
    S.postDrive = Math.max(0, drv); S.mud = { t0: hits[3] };
    for (const h of hits) if (t > h && t < h + 0.25) S.shake = Math.max(S.shake, 0.5 * (1 - (t - h) / 0.25));
    S.rings = hits.flatMap(h => [[h, POST_X, -PIER_Z, 0.9], [h, POST_X, PIER_Z, 0.9], [h, -POST_X, PIER_Z, 0.9]]);
    cam([5.4, -0.3, 3.4, 1.2, -1.2, 0, 52], [4.9, -0.4, 3.1, 1.3, -1.3, 0, 50], ease(P(t, T.posts, T.beams)));
  },
  // ---- 4d: beams on top ----
  function s4d(t) {
    S.planks = 1; S.ramps = 1; S.heroVis = false; S.carZ = 0; S.posts = 1; S.postDrive = 0; S.waterA = 0.5;
    const tB = W_('beams') - 0.25, tG = W_('giving') - 0.15;
    S.beams = 1; S.beamSlide = 1 - eo(P(t, tB, tB + 0.8));
    S.sag = 0.32 * (1 - ease(P(t, tG, W_('support') + 0.1)));
    cam([6.4, -0.15, 3.7, 0.6, -0.6, 0, 50], [5.2, -0.3, 3.0, 0.8, -0.65, 0, 48], ease(P(t, T.beams, T.s5)));
  },
  // ---- 5a: problem solved? ----
  function s5(t) {
    S.planks = 1; S.ramps = 1; S.posts = 1; S.postDrive = 0; S.beams = 1;
    S.carZ = -11; S.carX = 0.6;
    const tNot = W_('Not') - 0.05;
    place(hero, 0, DECK_Y, 0.4, Math.PI);
    const ch = t < tNot, jig = ch ? Math.sin(t * 9) : 0;
    if (t > tNot) S.shake = 0.3 * (1 - P(t, tNot, tNot + 0.8));
    pose(hero, ch ? { armL: -0.3, armR: -0.3, armLz: 2.4 + jig * 0.15, armRz: 2.4 - jig * 0.15, elbowL: -0.3, elbowR: -0.3, mouth: 'grin', brow: 'up', hipY: Math.abs(jig) * 0.05, tilt: jig * 0.06 }
      : { armLz: 0.7, armRz: 0.7, armL: -0.4, armR: -0.4, mouth: 'o', brow: 'worried', wide: true, lookY: -0.8, headPitch: 0.35, lean: 0.1 }, t);
    cam([1.8, 1.5, -3.0, 0, 1.25, 0.6, 40], [1.6, 1.45, -2.6, 0, 1.25, 0.6, 38], ease(P(t, T.s5, T.wob)));
  },
  // ---- 5b: wobble + braces (front cutaway) ----
  function s5b(t) {
    S.planks = 1; S.ramps = 1; S.posts = 1; S.postDrive = 0; S.beams = 1; S.heroVis = false; S.carZ = -11; S.carX = 0.6;
    S.cut = 'z'; S.waterA = 0.5;
    const tW = W_('wobbling') - 0.3, tBr = W_('diagonal') - 0.1, tStop = W_('braces', 1, 'e');
    S.wobble = Math.sin((t - tW) * 6.5) * 0.1 * P(t, tW, tW + 0.6) * (1 - smooth(P(t, tBr + 0.4, tStop + 0.2)));
    S.braces = P(t, tBr, tStop);
    if (t < T.tri) cam([0, -0.95, 12.4, 0, -0.95, 1.5, 38], [0, -1.0, 11.6, 0, -1.0, 1.5, 38], ease(P(t, T.wob, T.tri)));
    else cam([0, -1.0, 11.6, 0, -1.0, 1.5, 38], [3.4, -0.6, 10.6, 0, -1.15, 1.5, 38], ease(P(t, T.tri, T.s6)));
  },
  // ---- 6a: neighbour complains ----
  function s6(t) {
    S.planks = 1; S.ramps = 1; S.posts = 1; S.postDrive = 0; S.beams = 1; S.braces = 1; S.carZ = -11; S.carX = 0.6;
    S.neighVis = true; S.kidsVis = true; S.heroVis = false;
    place(neigh, -2.7, 0, 6.6, 0.62);
    const pt = P(t, W_('complains') - 0.2, W_('complains') + 0.2);
    pose(neigh, { talk: true, mouth: 'o', mouthOpen: 0.8, brow: 'angry', armL: -1.45 * pt, armLz: 0.35 * pt, elbowL: -0.1, armR: -0.25, armRz: 0.5, elbowR: -2.0, headYaw: -0.15 * pt, lookX: 0.3 }, t);
    kidsPlay(t);
    cam([-1.25, 1.55, 9.0, -2.65, 1.3, 6.6, 34], [-1.4, 1.5, 8.6, -2.65, 1.3, 6.6, 32], P(t, T.s6, T.kids));
  },
  // ---- 6b: kids near the edge ----
  function s6b(t) {
    S.planks = 1; S.ramps = 1; S.posts = 1; S.postDrive = 0; S.beams = 1; S.braces = 1; S.carZ = -11; S.carX = 0.6;
    S.neighVis = true; S.kidsVis = true; S.heroVis = false;
    place(neigh, -2.7, 0, 6.6, 2.4);
    pose(neigh, { talk: true, mouth: 'o', brow: 'worried', armLz: 0.4, armRz: 0.4, elbowL: -2.2, elbowR: -2.2, armL: -0.5, armR: -0.5 }, t);
    kidsPlay(t);
    cam([4.8, 2.6, 5.4, 0, 0.7, 0.2, 42], [4.3, 2.4, 4.8, 0, 0.7, 0.0, 42], ease(P(t, T.kids, T.rail)));
  },
  // ---- 6c: railings ----
  function s6c(t) {
    S.planks = 1; S.ramps = 1; S.posts = 1; S.postDrive = 0; S.beams = 1; S.braces = 1; S.carZ = -11; S.carX = 0.6;
    S.neighVis = true; S.kidsVis = true;
    const t0 = W_('install') - 0.05;
    S.rails = P(t, t0, t0 + 1.4); S.railBars = P(t, t0 + 1.1, t0 + 1.9); S.railMesh = P(t, t0 + 1.7, t0 + 2.2);
    const safe = t > W_('safe') - 0.4;
    place(neigh, -2.0, 0, 6.6, Math.PI * 0.95);
    pose(neigh, safe ? { mouth: 'grin', brow: 'up', armL: -1.3, elbowL: -1.4, armLz: 0.2 } : { mouth: 'flat', brow: 'neutral', armLz: 0.3, armRz: 0.3, elbowL: -2.2, elbowR: -2.2, armL: -0.4, armR: -0.4 }, t);
    place(hero, 0.6, deckY(6.4, 0), 6.4, Math.PI * 1.05);
    pose(hero, safe ? { mouth: 'grin', brow: 'up', armR: -1.5, elbowR: -1.2, armRz: 0.2 } : { mouth: 'smile', armL: -1.0, elbowL: -1.2, armR: -1.0, elbowR: -1.3 }, t);
    kidsSafe(t, safe);
    cam([4.6, 2.6, 8.4, 0, 0.75, 1.5, 42], [5.3, 3.2, 3.2, 0, 0.9, -1.6, 46], ease(P(t, T.rail, T.s7)));
  },
  // ---- 7a: golden hour celebration ----
  function s7(t) {
    finale(t);
    const k = ease(P(t, T.s7, T.pull));
    const a = lerp(0.85, -0.55, k), r = lerp(10.5, 9.0, k);
    cam([Math.sin(a) * r, lerp(3.2, 2.4, k), Math.cos(a) * r, 0, 0.6, 0, 44]);
  },
  // ---- 7b: pull back ----
  function s7b(t) {
    finale(t);
    S.confetti = { t0: W_('Congratulations') };
    const k = ease(P(t, T.pull, T.end - 0.4));
    cam([-2.6, 2.6, 9.6, 0, 0.6, 0, 44], [-3.4, 22, 42, 0, 0.0, -2, 44], k);
  },
];
function kidsPlay(t) {
  // kid1 leans over the open edge; kid2 runs along the edge
  place(kid1, 1.12, DECK_Y, -0.4, Math.PI / 2 + 0.25);
  pose(kid1, { lean: 0.55 + Math.sin(t * 2.2) * 0.08, armL: -1.3, armR: -1.0, armLz: 0.3, mouth: 'o', brow: 'up', lookY: -1, headPitch: 0.4 }, t);
  const z2 = 2.6 - ((t * 1.3) % 5.2); place(kid2, -1.15, DECK_Y, z2, Math.PI);
  pose(kid2, { walk: t * 11, walkAmt: 1, run: true, mouth: 'grin', brow: 'up', armLz: 0.3, armRz: 0.3 }, t);
}
function kidsSafe(t, safe) {
  place(kid1, 1.12, DECK_Y, -0.4, Math.PI / 2 + 0.25);
  pose(kid1, safe ? { armL: -1.25, armR: -1.25, elbowL: -0.5, elbowR: -0.5, mouth: 'grin', brow: 'up', lookY: -0.3 } : { lean: 0.5, armL: -1.3, armR: -1.0, mouth: 'o', brow: 'up', lookY: -1, headPitch: 0.4 }, t);
  place(kid2, -1.05, DECK_Y, 0.4, -Math.PI / 2 + 0.2);
  pose(kid2, safe ? { armL: -1.3, armR: -1.3, elbowL: -0.4, elbowR: -0.4, mouth: 'grin', brow: 'up', hipY: Math.abs(Math.sin(t * 8)) * 0.04 } : { armLz: 0.5, armRz: 0.5, mouth: 'smile', brow: 'up' }, t);
}
function finale(t) {
  S.planks = 1; S.ramps = 1; S.posts = 1; S.postDrive = 0; S.beams = 1; S.braces = 1; S.rails = 1; S.railBars = 1; S.railMesh = 1; S.warm = 1;
  S.neighVis = true; S.kidsVis = true; S.carZ = -11; S.carX = 0.6;
  const j = Math.abs(Math.sin(t * 7));
  place(hero, 0, DECK_Y, 1.2, 0.35);
  const bow = P(t, W_('Congratulations') + 0.2, W_('Congratulations') + 0.8) * (1 - P(t, W_('one', 2) + 0.2, W_('humanitys')));
  pose(hero, bow > 0 ? { lean: 0.8 * bow, armL: 0.3, armR: -1.2 * bow, elbowR: -1.4 * bow, mouth: 'grin', brow: 'up', eyeOpen: 0.4 } : { armLz: 2.5, armRz: 2.5, armL: -0.3, armR: -0.3, mouth: 'grin', brow: 'up', hipY: j * 0.06 }, t);
  place(neigh, 0.85, DECK_Y, 3.1, 0.25); pose(neigh, { mouth: 'grin', brow: 'up', armL: -1.3, elbowL: -1.4, armR: -2.6, armRz: 0.2 + Math.sin(t * 8) * 0.25 }, t);
  place(kid1, 0.8, DECK_Y, -0.6, 0.6); pose(kid1, { armLz: 2.6 + Math.sin(t * 9) * 0.2, armRz: 2.6 - Math.sin(t * 9) * 0.2, mouth: 'grin', brow: 'up', hipY: Math.abs(Math.sin(t * 9)) * 0.08 }, t);
  place(kid2, -0.75, DECK_Y, -0.2, 0.2); pose(kid2, { armR: -2.8, armRz: 0.3 + Math.sin(t * 10) * 0.3, mouth: 'grin', brow: 'up', hipY: Math.abs(Math.sin(t * 8 + 1)) * 0.08 }, t);
}

// ======================= APPLY STATE =======================
let curClip = null;
function apply(t) {
  // logs
  placeLog(logA, S.logA, S.sag); placeLog(logB, S.logB, S.sag);
  // planks
  planks.visible = S.planks > 0;
  for (let i = 0; i < NPL; i++) {
    const order = (NPL - 1 - i) / (NPL - 1), q = clamp((S.planks - order * 0.86) / 0.14), z = plZ(i);
    dummy.position.set(0, DECK_Y - 0.035 + sagAt(z, S.sag) + (1 - eo(q)) * 0.9, z); dummy.rotation.set((1 - q) * 0.3 * (hash(i, 2) - 0.5), (1 - q) * 0.5 * (hash(i, 1) - 0.5), 0);
    dummy.scale.setScalar(q > 0 ? 1 : 1e-4); dummy.updateMatrix(); planks.setMatrixAt(i, dummy.matrix);
  }
  planks.instanceMatrix.needsUpdate = true;
  ramps.forEach(r => { r.visible = S.ramps > 0; r.scale.set(1, 1, Math.max(0.001, eo(S.ramps))); });
  // piers
  for (const pr of piers) {
    for (const p of pr.posts) {
      p.pv.visible = S.posts > 0; p.pv.rotation.z = S.wobble;
      p.drv.position.y = S.postDrive + (1 - eo(S.postIn ?? 1)) * 3.0;
    }
    const bOff = S.sag > 0 ? sagAt(pr.z, S.sag) : 0;
    pr.beam.visible = S.beams > 0; pr.beam.position.set(S.beamSlide * 6 + Math.sin(S.wobble) * 1.7, bOff, 0);
    pr.braces.forEach((b, i) => { const q = clamp(S.braces * 2 - i * 0.6); b.visible = q > 0; const dirx = i ? -1 : 1; b.position.x = (1 - eo(q)) * 3.5 * dirx; b.position.y = -1.1 + (1 - eo(q)) * 0.5; b.scale.set(1, 1, 1); });
  }
  // railings
  for (const p of rail.posts) { const q = clamp((S.rails - (p.k / 8) * 0.7) / 0.3); p.m.visible = q > 0; p.m.scale.set(1, Math.max(1e-3, eo(q)), 1); }
  rail.rails.forEach(r => { r.visible = S.railBars > 0; r.scale.set(1, 1, Math.max(1e-3, eo(S.railBars))); });
  rail.mesh.forEach(m => { m.visible = S.railMesh > 0.02; m.material.opacity = S.railMesh; m.material.transparent = S.railMesh < 1; m.material.alphaTest = S.railMesh < 1 ? 0.5 * S.railMesh : 0.5; });
  // rope
  rope.visible = !!S.rope;
  // characters visibility
  hero.root.visible = hero.root.visible && S.heroVis;
  neigh.root.visible = S.neighVis; kid1.root.visible = S.kidsVis; kid2.root.visible = S.kidsVis;
  // car
  car.visible = S.carZ !== null;
  if (car.visible) {
    const z = S.carZ, y = deckY(z, S.sag), y2 = deckY(z - 0.4, S.sag), y1 = deckY(z + 0.4, S.sag);
    car.position.set(S.carX, y, z); car.rotation.set(Math.atan2(y2 - y1, 0.8) * -1 * -1, Math.PI, 0);
    car.rotation.x = Math.atan2(y2 - y1, 0.8);
    const worried = S.sag > 0.05 && S.beams === 0;
    pose(driver, { lean: -0.2, legL: -1.3, legR: -1.3, kneeL: 1.45, kneeR: 1.45, armL: -1.1, armR: -1.1, elbowL: -0.5, elbowR: -0.5, mouth: worried ? 'o' : 'grin', brow: worried ? 'worried' : 'up', wide: worried, lookX: worried ? Math.sin(t * 6) * 0.8 : 0, headYaw: worried ? -0.5 + Math.sin(t * 3) * 0.2 : 0 }, t);
  }
  // water + cutaway
  WM.water.opacity = S.waterA; WM.water.normalMap.offset.set(t * 0.035, t * 0.008);
  const want = S.cut === 'z' ? 'z' : null;
  if (want !== curClip) { curClip = want; const cp = want ? clipZ : null; for (const m of [WM.terrain, WM.water]) { m.clippingPlanes = cp; m.needsUpdate = true; } veg.visible = !want; }
  section.visible = S.cut === 'z';
  // light / sky
  const warm = S.warm;
  scene.environment = warm ? ENV.gold : ENV.day;
  skyU.uWarm.value = warm; skyU.uTop.value.set(warm ? '#4a77b4' : '#2f6fb8'); skyU.uHor.value.set(warm ? '#f4cf9e' : '#cfe3f0'); skyU.uSunCol.value.set(warm ? '#ffc98a' : '#fff2d8');
  const sd = warm ? V(0.7, 0.3, 0.65) : V(0.45, 0.62, 0.55); skyU.uSun.value.copy(sd).normalize();
  sun.position.copy(sd.clone().normalize().multiplyScalar(40)); sun.color.set(warm ? '#ffd2a0' : '#fff1dc'); sun.intensity = warm ? 3.4 : 3.1;
  hemi.color.set(warm ? '#ffe2c4' : '#d8e8ff'); hemi.intensity = warm ? 0.7 : 0.85;
  scene.fog.color.set(warm ? '#e9d2b4' : '#cddbe4');
  cullNear(veg, camera.position.x, camera.position.z, 4.5);
  particles(t);
  if (S.shake > 0) { camera.position.x += Math.sin(t * 90) * 0.035 * S.shake; camera.position.y += Math.cos(t * 73) * 0.035 * S.shake; }
}

function particles(t) {
  if (S.splash && t >= S.splash.t0) {
    spray.show(); const u = t - S.splash.t0, c = S.splash.at;
    spray.update((i, v) => {
      const a = hash(i, 1) * Math.PI * 2, sp = 1.2 + hash(i, 2) * 3.2, up = 2.5 + hash(i, 3) * 4.5, d = hash(i, 4) * 0.25;
      const tt = Math.max(0, u - d); v.set(c.x + Math.cos(a) * sp * tt * 0.6, c.y + up * tt - 4.9 * tt * tt, c.z + Math.sin(a) * sp * tt * 0.6);
      const alive = v.y > WATER_Y - 0.05 && u > d; if (!alive) v.y = WATER_Y;
      return [0.07 + hash(i, 5) * 0.14 + (i % 6 === 0 ? 0.45 : 0), alive ? (i % 6 === 0 ? 0.55 : 1) * (1 - P(u, 1.0, 1.7)) : 0];
    });
  } else if (S.spit && t >= S.spit.t0 && t < S.spit.t0 + 1.2) {
    spray.show(); const u = t - S.spit.t0, c = S.spit.from;
    spray.update((i, v) => { if (i > 80) { v.set(0, -99, 0); return [0, 0]; } const d = i / 80 * 0.45, tt = Math.max(0, u - d); v.set(c.x + 1.5 * tt * 0.7, c.y + 1.6 * tt - 4.9 * tt * tt, c.z + 1.5 * tt * 0.7 + (hash(i, 2) - 0.5) * 0.04); return [0.035, tt > 0 && v.y > WATER_Y ? 0.9 : 0]; });
  } else spray.hide();
  if (S.dust && t >= S.dust.t0 && t < S.dust.t0 + 2) {
    dust.show(); const u = t - S.dust.t0, c = S.dust.at;
    dust.update((i, v) => { const a = hash(i, 1) * 6.28, r = (0.3 + hash(i, 2)) * eo(clamp(u / 1.2)) * 1.4; v.set(c.x + Math.cos(a) * r, c.y + hash(i, 3) * 0.5 * eo(clamp(u)), c.z + Math.sin(a) * r * 0.6 + (hash(i, 7) - 0.5) * 1.2); return [0.25 + hash(i, 4) * 0.35, 0.45 * (1 - P(u, 0.3, 2))]; });
  } else dust.hide();
  if (S.mud && t >= S.mud.t0 && t < S.mud.t0 + 2) {
    mud.show(); const u = t - S.mud.t0;
    mud.update((i, v) => { const pz = i % 2 ? PIER_Z : -PIER_Z, a = hash(i, 1) * 6.28, r = (0.2 + hash(i, 2) * 0.6) * eo(clamp(u)); v.set(POST_X + Math.cos(a) * r, BED_Y + 0.05 + hash(i, 3) * 0.4 * eo(clamp(u)), pz + Math.sin(a) * r); return [0.15 + hash(i, 4) * 0.2, 0.6 * (1 - P(u, 0.4, 2))]; });
  } else mud.hide();
  if (S.drips > 0 && hero.root.visible) {
    drips.show(); const b = hero.root.position;
    drips.update((i, v) => { const a = (t * 1.6 + hash(i, 1)) % 1; v.set(b.x + (hash(i, 2) - 0.5) * 0.5, b.y + 1.55 * (1 - a) + 0.05, b.z + (hash(i, 3) - 0.5) * 0.3); return [0.02, S.drips * 0.8 * (a < 0.9 ? 1 : 0)]; });
  } else drips.hide();
  RINGS.forEach((m, i) => { const r = S.rings[i]; if (!r || t < r[0]) { m.visible = false; return; } const u = t - r[0]; m.visible = u < 2.2; const s = 0.15 + u * r[3]; m.scale.set(s, 1, s); m.position.set(r[1], WATER_Y + 0.01, r[2]); m.material.opacity = 0.55 * (1 - P(u, 0, 2.2)); });
  if (S.confetti && t > S.confetti.t0) {
    confetti.visible = true; const u = t - S.confetti.t0;
    for (let i = 0; i < NCF; i++) { const a = hash(i, 1) * 6.28, sp = 1 + hash(i, 2) * 3, tt = Math.max(0, u - hash(i, 9) * 0.3); const vy = 5 + hash(i, 3) * 4; let y = 0.8 + vy * Math.min(tt, 0.8) - 4.9 * Math.min(tt, 0.8) ** 2 - Math.max(0, tt - 0.8) * 0.9; dummy.position.set(Math.cos(a) * sp * Math.min(tt, 1.5) + Math.sin(tt * 3 + i) * 0.2, y, 1 + Math.sin(a) * sp * Math.min(tt, 1.5)); dummy.rotation.set(tt * 7 + i, tt * 5 + i * 2, tt * 3); dummy.scale.setScalar(tt > 0 && y > -0.5 ? 1 : 1e-4); dummy.updateMatrix(); confetti.setMatrixAt(i, dummy.matrix); }
    confetti.instanceMatrix.needsUpdate = true;
  } else confetti.visible = false;
}

// ======================= 2D OVERLAY =======================
const FONT = "'Inter Display', 'Inter', sans-serif";
const C = { panel: 'rgba(10,18,28,0.82)', cyan: '#3fd4ff', red: '#ff453a', green: '#32d74b', blue: '#3a9bff', yellow: '#ffd23f', white: '#ffffff', orange: '#ff9f2e' };
function proj(x, y, z) { const v = V(x, y, z).project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H, v.z]; }
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
let performanceT = 0;
function chip(text, x, y, a, opt = {}) {
  if (a <= 0) return;
  const size = opt.size || 40; ctx.save(); ctx.globalAlpha = clamp(a);
  ctx.font = `800 ${size}px ${FONT}`; const tw = ctx.measureText(text).width, pad = size * 0.55, ic = opt.icon ? size * 1.15 : 0;
  const w = tw + pad * 2 + ic, h = size * 1.7, sc = 0.85 + 0.15 * eo(clamp(a));
  ctx.translate(x, y); ctx.scale(sc, sc);
  const x0 = opt.align === 'left' ? 0 : -w / 2;
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
  rr(x0, -h / 2, w, h, h / 2); ctx.fillStyle = opt.bg || C.panel; ctx.fill(); ctx.shadowColor = 'transparent';
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
  if (k === 'q') { ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.fillStyle = '#10202c'; ctx.font = `900 ${r * 1.5}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, r * 0.08); }
  if (k === 'weight') { ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.4); ctx.lineTo(r * 0.6, -r * 0.4); ctx.lineTo(r, r * 0.85); ctx.lineTo(-r, r * 0.85); ctx.closePath(); ctx.fill(); ctx.lineWidth = r * 0.22; ctx.beginPath(); ctx.arc(0, -r * 0.62, r * 0.3, 0, 7); ctx.stroke(); }
  if (k === 'drop') { ctx.beginPath(); ctx.moveTo(0, -r); ctx.bezierCurveTo(r * 0.9, 0, r * 0.8, r, 0, r); ctx.bezierCurveTo(-r * 0.8, r, -r * 0.9, 0, 0, -r); ctx.fill(); }
  if (k === 'down') { ctx.beginPath(); ctx.moveTo(0, r); ctx.lineTo(-r * 0.8, -r * 0.1); ctx.lineTo(-r * 0.3, -r * 0.1); ctx.lineTo(-r * 0.3, -r); ctx.lineTo(r * 0.3, -r); ctx.lineTo(r * 0.3, -r * 0.1); ctx.lineTo(r * 0.8, -r * 0.1); ctx.closePath(); ctx.fill(); }
  if (k === 'tri') { ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r, r * 0.8); ctx.lineTo(-r, r * 0.8); ctx.closePath(); ctx.stroke(); }
  if (k === 'lr') { ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(-r * 0.5, -r * 0.5); ctx.lineTo(-r, 0); ctx.lineTo(-r * 0.5, r * 0.5); ctx.moveTo(r * 0.5, -r * 0.5); ctx.lineTo(r, 0); ctx.lineTo(r * 0.5, r * 0.5); ctx.stroke(); }
  ctx.restore();
}
function callout(text, p3, lx, ly, a, opt = {}) {
  if (a <= 0) return; const [px, py, pz] = proj(...p3); if (pz > 1) return;
  ctx.save(); ctx.globalAlpha = clamp(a);
  const k = eo(clamp(a * 1.4));
  ctx.strokeStyle = opt.col || C.cyan; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(lerp(px, lx, k), lerp(py, ly, k)); ctx.stroke();
  ctx.fillStyle = opt.col || C.cyan; ctx.beginPath(); ctx.arc(px, py, 10, 0, 7); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, 16 + 6 * Math.sin(performanceT * 6), 0, 7); ctx.globalAlpha = clamp(a) * 0.6; ctx.stroke();
  ctx.restore();
  chip(text, lx, ly, a, { size: opt.size || 38, edge: opt.col || C.cyan, icon: opt.icon, iconCol: opt.col || C.cyan });
}
function polyline(pts3, col, a, opt = {}) {
  if (a <= 0) return; const pts = pts3.map(p => proj(...p)); if (pts.some(p => p[2] > 1)) return;
  ctx.save(); ctx.globalAlpha = clamp(a); ctx.strokeStyle = col; ctx.lineWidth = opt.w || 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (opt.glow) { ctx.shadowColor = col; ctx.shadowBlur = 16; }
  if (opt.dash) { ctx.setLineDash(opt.dash); ctx.lineDashOffset = -performanceT * (opt.speed || 120); }
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); if (opt.close) ctx.closePath(); ctx.stroke();
  if (opt.fill) { ctx.fillStyle = opt.fill; ctx.fill(); }
  if (opt.arrow) { const [x1, y1] = pts[pts.length - 1], [x0, y0] = pts[pts.length - 2]; const ang = Math.atan2(y1 - y0, x1 - x0); ctx.setLineDash([]); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x1 + Math.cos(ang) * 22, y1 + Math.sin(ang) * 22); ctx.lineTo(x1 + Math.cos(ang + 2.4) * 26, y1 + Math.sin(ang + 2.4) * 26); ctx.lineTo(x1 + Math.cos(ang - 2.4) * 26, y1 + Math.sin(ang - 2.4) * 26); ctx.fill(); }
  ctx.restore();
}
function flowArrows(pts3, col, a, n = 4, speed = 0.5) {
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
function panel(x, y, w, h, a, title, col = 'rgba(63,212,255,0.6)') {
  ctx.save(); ctx.globalAlpha = clamp(a); ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 24; rr(x, y, w, h, 26); ctx.fillStyle = 'rgba(8,16,26,0.86)'; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
  if (title) { ctx.fillStyle = C.cyan; ctx.font = `800 30px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(title, x + 26, y + 22); }
  ctx.restore();
}
function bigWord(text, x, y, a, col = C.yellow, size = 150, rot = -0.08) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = clamp(a * 3); const sc = 0.6 + 0.4 * eo(clamp(a * 2.5)) + 0.05 * Math.sin(performanceT * 20) * (1 - clamp(a * 2));
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); ctx.font = `900 ${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = 26; ctx.strokeStyle = '#0b2a4a'; ctx.strokeText(text, 0, 0); ctx.lineWidth = 10; ctx.strokeStyle = '#ffffff'; ctx.strokeText(text, 0, 0); ctx.fillStyle = col; ctx.fillText(text, 0, 0); ctx.restore();
}
// rectangle vs triangle inset
function shapeInset(a, ph) {
  if (a <= 0) return; const x = 70, y = 225, w = 940, h = 380; panel(x, y, w, h, a, 'WHY TRIANGLES?');
  ctx.save(); ctx.globalAlpha = clamp(a);
  const push = Math.sin(ph) * 0.5 + 0.5, cy = y + 300;
  // rectangle that folds
  const sk = push * 70, rx = x + 120, rw = 220, rh = 170;
  ctx.lineWidth = 12; ctx.lineJoin = 'round'; ctx.strokeStyle = C.red;
  ctx.beginPath(); ctx.moveTo(rx, cy); ctx.lineTo(rx + rw, cy); ctx.lineTo(rx + rw + sk, cy - rh); ctx.lineTo(rx + sk, cy - rh); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = '#fff'; for (const [px, py] of [[rx, cy], [rx + rw, cy], [rx + rw + sk, cy - rh], [rx + sk, cy - rh]]) { ctx.beginPath(); ctx.arc(px, py, 9, 0, 7); ctx.fill(); }
  ctx.fillStyle = C.red; ctx.beginPath(); const ax = rx - 50 + sk * 0.5; ctx.moveTo(ax + 30, cy - rh); ctx.lineTo(ax, cy - rh - 18); ctx.lineTo(ax, cy - rh + 18); ctx.fill(); ctx.fillRect(ax - 40, cy - rh - 5, 40, 10);
  icon('cross', rx + rw / 2 + sk / 2, cy - rh - 52, 22, C.red);
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = `800 28px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('RECTANGLE FOLDS', rx + rw / 2 + 20, cy + 46);
  // triangle stays
  const tx = x + 580, tw = 240;
  ctx.strokeStyle = C.green; ctx.beginPath(); ctx.moveTo(tx, cy); ctx.lineTo(tx + tw, cy); ctx.lineTo(tx + tw / 2, cy - rh); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = '#fff'; for (const [px, py] of [[tx, cy], [tx + tw, cy], [tx + tw / 2, cy - rh]]) { ctx.beginPath(); ctx.arc(px, py, 9, 0, 7); ctx.fill(); }
  ctx.fillStyle = C.green; const bx = tx - 50 + Math.sin(ph) * 6; ctx.beginPath(); ctx.moveTo(bx + 30 + tw / 2 - 60, cy - rh); ctx.lineTo(bx + tw / 2 - 60, cy - rh - 18); ctx.lineTo(bx + tw / 2 - 60, cy - rh + 18); ctx.fill(); ctx.fillRect(bx + tw / 2 - 100, cy - rh - 5, 40, 10);
  icon('check', tx + tw / 2 + 70, cy - rh - 10, 22, C.green);
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillText('TRIANGLE HOLDS', tx + tw / 2, cy + 46);
  ctx.restore();
}
function checklist(a, items) {
  if (a <= 0) return; const x = 150, y = 230, w = 780, h = 90 + items.length * 64; panel(x, y, w, h, a, 'YOUR BRIDGE', 'rgba(50,215,75,0.7)');
  ctx.save(); items.forEach(([txt, ia], i) => { ctx.globalAlpha = clamp(a) * clamp(ia * 2); const yy = y + 100 + i * 64; icon('check', x + 60, yy, 20, C.green); ctx.fillStyle = '#fff'; ctx.font = `800 36px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x + 100 + (1 - eo(clamp(ia * 2))) * 30, yy + 2); }); ctx.restore();
}
function title(a) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = clamp(a);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const y = 330 - (1 - eo(clamp(a))) * 40;
  ctx.font = `900 112px ${FONT}`; ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30;
  for (const [s, yy, col] of [['HOW DO YOU', y, '#ffffff'], ['BUILD A', y + 118, C.yellow], ['BRIDGE?', y + 236, '#ffffff']]) { ctx.strokeText(s, W / 2, yy); ctx.fillStyle = col; ctx.fillText(s, W / 2, yy); }
  ctx.restore();
}
// captions
let CHUNKS = [];
const HOT = ['river', 'swim', 'bridge', 'massive', 'twothousandpound', 'splash', 'water', 'another', 'planks', 'flat', 'walkway', 'car', 'bending', 'weight', 'posts', 'riverbed', 'beams', 'support', 'wobbling', 'sideways', 'diagonal', 'braces', 'rectangles', 'triangles', 'kids', 'fall', 'railings', 'safe', 'proper', 'congratulations', 'engineering', 'inventions', 'balance', 'strong'];
const FIX = { 'neighbour': 'NEIGHBOR', 'two-thousand-pound': '2,000-POUND' };
function buildCaptions() {
  CHUNKS = []; let cur = null;
  TL.words.forEach(w => {
    let txt = (FIX[w.w.toLowerCase().replace(/[,.!?]+$/, '')] || w.w.toUpperCase()).replace(/[,.]+$/, '').replace(/\.\.\.$/, '');
    if (!cur) { cur = { s: w.s, words: [] }; CHUNKS.push(cur); }
    cur.words.push({ t: txt, s: w.s, e: w.e, hot: HOT.includes(norm(w.w)) }); cur.e = w.e;
    if (/[.,?!]$/.test(w.w) || cur.words.length >= 3 || cur.words.map(x => x.t).join(' ').length > 14) cur = null;
  });
  CHUNKS.forEach((k, i) => { const nx = CHUNKS[i + 1]; k.e2 = nx ? Math.min(nx.s, k.e + 0.5) : k.e + 0.5; });
}
function captions(t) {
  const ch = CHUNKS.find(k => t >= k.s - 0.04 && t < k.e2); if (!ch) return;
  const a = clamp((t - ch.s + 0.04) / 0.08), y = 1400;
  ctx.save(); ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  let size = 86; ctx.font = `900 ${size}px ${FONT}`;
  const gap = 24; let tw = ch.words.reduce((s, w) => s + ctx.measureText(w.t).width, 0) + gap * (ch.words.length - 1);
  if (tw > 960) { size = Math.floor(86 * 960 / tw); ctx.font = `900 ${size}px ${FONT}`; tw = ch.words.reduce((s, w) => s + ctx.measureText(w.t).width, 0) + gap * (ch.words.length - 1); }
  let x = W / 2 - tw / 2; const sc = 0.9 + 0.1 * eo(a);
  ctx.translate(W / 2, y); ctx.scale(sc, sc); ctx.translate(-W / 2, -y);
  for (const w of ch.words) {
    const ww = ctx.measureText(w.t).width, on = t >= w.s - 0.03;
    ctx.globalAlpha = on ? 1 : 0.55;
    ctx.lineWidth = 17; ctx.strokeStyle = 'rgba(0,0,0,0.88)'; ctx.strokeText(w.t, x, y);
    ctx.fillStyle = on && w.hot ? C.yellow : '#ffffff'; ctx.fillText(w.t, x, y);
    x += ww + gap;
  }
  ctx.restore();
}
function vignette() { const g = ctx.createRadialGradient(W / 2, H / 2, 520, W / 2, H / 2, 1250); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.38)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function endCard(a) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = clamp(a);
  const g = ctx.createLinearGradient(0, 0, 0, 900); g.addColorStop(0, 'rgba(0,0,0,0.7)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 900);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.font = `900 96px ${FONT}`; ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  for (const [s, yy, col] of [['HOW DO YOU', 300, '#fff'], ['BUILD A BRIDGE?', 404, C.yellow]]) { ctx.strokeText(s, W / 2, yy); ctx.fillStyle = col; ctx.fillText(s, W / 2, yy); }
  ctx.font = `600 30px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('Simplified illustration. Real bridges are designed by', W / 2, 500);
  ctx.fillText('qualified engineers and built to local safety codes.', W / 2, 540);
  ctx.restore();
}

function overlay(t) {
  performanceT = t;
  const win = (t0, t1, f = 0.25) => Math.min(P(t, t0, t0 + f), 1 - P(t, t1 - f, t1));
  vignette();
  // S1
  title(win(0.12, W_('swim', 1, 'e') + 0.05, 0.35));
  if (t > W_('swim') - 0.1 && t < T.s2) chip("CAN'T SWIM", W / 2, 1180, win(W_('swim', 1, 'e') + 0.05, W_('So', 1) + 0.3), { icon: 'cross', iconCol: C.red, bg: 'rgba(120,10,8,0.85)', size: 44 });
  if (t > W_('So', 1) - 0.1 && t < T.s2) {
    const a = win(W_('bridge') - 0.3, T.s2 + 0.05), k = eo(P(t, W_('bridge') - 0.3, W_('bridge') + 0.6));
    const pts = []; for (let i = 0; i <= 30; i++) { const s = i / 30 * k; pts.push([0, 0.4 + Math.sin(s * Math.PI) * 0.6, lerp(5.2, -5.2, s)]); }
    if (pts.length > 1) polyline(pts, C.yellow, a, { w: 8, dash: [18, 14], speed: 60, glow: true });
    chip('HOW?', W / 2, 520, win(W_('How') - 0.1, T.s2 + 0.05), { icon: 'q', iconCol: C.yellow, size: 52 });
  }
  // S2 drag
  if (t >= T.s2 && t < T.walk) {
    chip('≈ 2,000 LB  (900 KG)', W / 2, 520, win(W_('twothousandpound') - 0.2, W_('fallen') - 0.1), { icon: 'weight', iconCol: C.yellow, edge: C.yellow, size: 42 });
    if (t > W_('fallen') - 0.15) { const k = eo(P(t, W_('fallen'), W_('river', 2, 'e'))); const pts = []; for (let i = 0; i <= 24; i++) { const ph = (Math.PI / 2) * k * i / 24; pts.push([-LOG_X - Math.cos(ph) * 9.5, 0.6, 5.5 - Math.sin(ph) * 9.5]); } polyline(pts, C.yellow, win(W_('fallen'), T.walk) * (k > 0.02 ? 1 : 0), { w: 8, arrow: true, glow: true }); }
    if (t > W_('river', 2, 'e')) chip('ACROSS!', W / 2, 520, win(W_('river', 2, 'e') + 0.05, T.walk), { icon: 'check', iconCol: C.green, edge: C.green, size: 46 });
  }
  // S2 walk
  if (t >= T.walk && t < T.splash) {
    chip('IT WORKS!', W / 2, 520, win(W_('works') - 0.1, W_('lose') - 0.05), { icon: 'check', iconCol: C.green, edge: C.green, size: 46 });
    chip('ROUND LOG = WOBBLY', W / 2, 520, win(W_('lose') - 0.05, T.splash), { icon: 'warn', iconCol: C.yellow, bg: 'rgba(120,10,8,0.85)', size: 40 });
  }
  if (t >= T.splash && t < T.s3) { const a = P(t, T.hit - 0.02, T.hit + 0.35) * (1 - P(t, W_('fall') - 0.1, W_('fall') + 0.25)); bigWord('SPLASH!', W / 2, 560, a, C.yellow, 170); }
  // S3
  if (t >= T.s3 && t < T.plank) callout('LOG #2', [LOG_X, 0.6, -2.0], 760, 560, win(W_('another') + 0.3, T.plank), { col: C.yellow });
  if (t >= T.plank && t < T.carIn) {
    callout('WOODEN PLANKS', [0, DECK_Y + 0.05, lerp(5.3, -5.3, P(t, T.plank + 0.25, W_('walkway') + 0.2)) + 0.6], 330, 560, win(W_('planks') - 0.1, W_('flat') - 0.1), { col: C.cyan });
    chip('FLAT WALKWAY', W / 2, 520, win(W_('flat') - 0.1, T.carIn), { icon: 'check', iconCol: C.green, edge: C.green, size: 46 });
  }
  if (t >= T.carIn && t < T.s4) chip('EVEN A CAR!', W / 2, 520, win(W_('drive') + 0.1, T.s4), { icon: 'check', iconCol: C.green, edge: C.green, size: 46 });
  // S4
  if (t >= T.s4 && t < T.face) {
    const a = win(W_('bending') - 0.35, T.face);
    polyline([[1.45, DECK_Y + 0.02, 4.6], [1.45, DECK_Y + 0.02, -4.6]], 'rgba(255,255,255,0.9)', a, { w: 4, dash: [12, 10] });
    const pts = []; for (let i = 0; i <= 30; i++) { const z = lerp(4.6, -4.6, i / 30); pts.push([1.45, DECK_Y + 0.02 + sagAt(z, S.sag), z]); } polyline(pts, C.red, a, { w: 7, glow: true });
    for (const z of [-1.2, 0, 1.2]) polyline([[1.6, 1.9, z], [1.6, 1.1, z]], C.red, a, { w: 8, arrow: true });
    chip('BENDING!', W / 2, 520, a, { icon: 'warn', iconCol: C.yellow, bg: 'rgba(120,10,8,0.85)', size: 50 });
    callout('LONG SPAN SAGS', [1.45, DECK_Y + sagAt(0, S.sag), 0], 720, 1130, a * P(t, W_('weight') - 0.8, W_('weight') - 0.5), { col: C.red, size: 34 });
  }
  if (t >= T.face && t < T.posts) bigWord('UH-OH…', W / 2, 560, P(t, T.face + 0.1, T.face + 0.4) * (1 - P(t, T.posts - 0.25, T.posts)), '#ffffff', 120);
  if (t >= T.posts && t < T.beams) {
    callout('THICK WOODEN POSTS', [POST_X, -0.8 + S.postDrive, PIER_Z], 360, 560, win(W_('posts') - 0.1, T.beams), { col: C.yellow });
    polyline([[POST_X + 0.45, 0.9 + S.postDrive, -PIER_Z], [POST_X + 0.45, -0.3 + S.postDrive, -PIER_Z]], C.yellow, win(W_('drive', 2), T.beams) * (S.postDrive > 0.05 ? 1 : 0.3), { w: 9, arrow: true });
    callout('INTO THE RIVERBED', [POST_X, BED_Y, -PIER_Z], 700, 1120, win(W_('riverbed') - 0.2, T.beams), { col: '#c9a27a', size: 34 });
  }
  if (t >= T.beams && t < T.s5) {
    callout('STRONG BEAMS', [POST_X + 0.2, -0.16 + sagAt(PIER_Z, S.sag), PIER_Z], 360, 560, win(W_('beams') + 0.3, W_('giving')), { col: C.yellow });
    const a = win(W_('giving'), T.s5);
    for (const pz of [-PIER_Z, PIER_Z]) flowArrows([[POST_X, 0.6, pz * 0.5], [POST_X, -0.2, pz], [POST_X, -1.2, pz], [POST_X, -2.2, pz]], C.green, a, 3, 0.8);
    chip('SHORTER SPANS = LESS BENDING', W / 2, 520, win(W_('support') - 0.6, T.s5), { icon: 'check', iconCol: C.green, edge: C.green, size: 34 });
  }
  // S5
  if (t >= T.s5 && t < T.wob) {
    chip('PROBLEM SOLVED?', W / 2, 520, win(W_('Problem') - 0.05, W_('Not') - 0.05), { icon: 'check', iconCol: C.green, size: 46 });
    chip('NOT QUITE!', W / 2, 520, win(W_('Not') - 0.05, T.wob), { icon: 'cross', iconCol: C.red, bg: 'rgba(120,10,8,0.85)', size: 50 });
  }
  if (t >= T.wob && t < T.s6) {
    const pz = PIER_Z, sw = Math.sin(S.wobble) * 1.68, bedL = -2.0, topY = -0.32;
    const rect = [[-POST_X, bedL, pz + 0.25], [POST_X, bedL, pz + 0.25], [POST_X + sw, topY, pz + 0.25], [-POST_X + sw, topY, pz + 0.25]];
    const aR = win(W_('wobbling') - 0.3, W_('braces', 1, 'e') + 0.3);
    polyline(rect, C.red, aR, { close: true, w: 7, dash: [16, 12], speed: 50 });
    if (t < W_('diagonal')) chip('WOBBLING SIDEWAYS', W / 2, 520, win(W_('wobbling') - 0.3, W_('diagonal') - 0.1), { icon: 'lr', iconCol: C.red, bg: 'rgba(120,10,8,0.85)', size: 40 });
    if (t > W_('diagonal') - 0.1 && t < T.tri) callout('DIAGONAL BRACES', [0.9, -0.8, pz + 0.25], 560, 560, win(W_('diagonal'), T.tri), { col: C.yellow });
    const aT = win(W_('strong', 2) - 0.6, T.s6) * S.braces;
    const top = [[-POST_X, -0.45, pz + 0.25], [POST_X, -0.45, pz + 0.25]], bot = [[-POST_X, -1.75, pz + 0.25], [POST_X, -1.75, pz + 0.25]];
    polyline([top[0], top[1], bot[0]], C.green, aT, { close: true, w: 6, fill: 'rgba(50,215,75,0.18)' });
    polyline([top[1], bot[1], bot[0]], C.green, aT, { close: true, w: 6, fill: 'rgba(50,215,75,0.12)' });
    shapeInset(win(T.tri + 0.1, T.s6), (t - T.tri) * 4.5);
  }
  // S6
  if (t >= T.s6 && t < T.kids) chip('NEIGHBOR NOT HAPPY', W / 2, 520, win(W_('complains') - 0.2, T.kids), { icon: 'warn', iconCol: C.yellow, size: 40 });
  if (t >= T.kids && t < T.rail) {
    const a = win(T.kids + 0.15, T.rail);
    for (const sx of [-1.5, 1.5]) polyline([[sx, DECK_Y + 0.02, 5.4], [sx, DECK_Y + 0.02, -5.4]], C.red, a, { w: 7, dash: [16, 12], speed: 60, glow: true });
    chip('NO EDGE PROTECTION', W / 2, 520, a, { icon: 'warn', iconCol: C.yellow, bg: 'rgba(120,10,8,0.85)', size: 40 });
  }
  if (t >= T.rail && t < T.s7) {
    const a = win(W_('railings') + 0.2, T.s7);
    callout('RAILINGS BOTH SIDES', [1.43, DECK_Y + 1.07, -1.3], 600, 560, win(W_('railings') + 0.2, W_('keep') - 0.1), { col: C.cyan, size: 36 });
    if (t > W_('keep') - 0.2) { const [x1, y1, z1] = proj(1.6, DECK_Y, 1.33), [x2, y2] = proj(1.6, DECK_Y + 1.1, 1.33); if (z1 < 1) { ctx.save(); ctx.globalAlpha = win(W_('keep') - 0.1, T.s7); ctx.strokeStyle = C.yellow; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.moveTo(x1 - 16, y1); ctx.lineTo(x1 + 16, y1); ctx.moveTo(x2 - 16, y2); ctx.lineTo(x2 + 16, y2); ctx.stroke(); ctx.restore(); chip('≈ 1.1 M HIGH', x2 + 150, (y1 + y2) / 2, win(W_('keep') - 0.1, T.s7), { size: 32, edge: C.yellow }); } }
    chip('SAFE FOR EVERYONE', W / 2, 520, win(W_('safe') - 0.3, T.s7), { icon: 'check', iconCol: C.green, edge: C.green, size: 44 });
  }
  // S7
  if (t >= T.s7 && t < T.endCard) {
    const b = W_('just');
    checklist(win(T.s7 + 0.2, W_('Congratulations') - 0.1), [['Two logs + plank deck', P(t, b, b + 0.4)], ['Posts & beams', P(t, b + 0.6, b + 1.0)], ['Diagonal braces', P(t, b + 1.2, b + 1.6)], ['Safety railings', P(t, b + 1.8, b + 2.2)]]);
    if (t > W_('Congratulations') - 0.2) bigWord('CONGRATULATIONS!', W / 2, 520, P(t, W_('Congratulations') - 0.1, W_('Congratulations') + 0.3) * (1 - P(t, T.endCard - 0.4, T.endCard)), C.yellow, 104, -0.05);
  }
  endCard(P(t, T.endCard - 0.1, T.endCard + 0.5));
  if (t < T.endCard) captions(t);
  for (const c of T.cuts) { const d = t - c; if (d >= 0 && d < 0.18) { ctx.fillStyle = `rgba(255,255,255,${0.35 * (1 - d / 0.18)})`; ctx.fillRect(0, 0, W, H); } }
  const fin = P(t, 0, 0.35), fout = P(t, T.end - 0.85, T.end - 0.05);
  if (fin < 1 || fout > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.max(1 - fin, fout)})`; ctx.fillRect(0, 0, W, H); }
}

// ======================= SOUND CUES =======================
function buildCues() {
  const c = (t, k, d) => CUES.push(d ? { t, k, d } : { t, k });
  for (const t of T.cuts) c(t - 0.1, 'whoosh');
  c(W_('cant'), 'dip');
  c(T.s2 + 0.1, 'scrape', W_('fallen') - T.s2 - 0.2); c(W_('fallen') - 0.1, 'swing'); c(W_('river', 2, 'e') + 0.1, 'thud');
  for (let tt = T.walk + 0.4; tt < W_('lose'); tt += 0.48) c(tt, 'step');
  c(W_('lose') - 0.05, 'creak'); c(T.fall0 + 0.1, 'yelp');
  c(T.hit, 'splash'); c(W_('fall') - 0.25, 'bubbles'); c(W_('water') + 0.05, 'spit');
  c(W_('another') - 0.05, 'swing'); c(W_('beside', 1, 'e') + 0.1, 'thud');
  for (let i = 0; i < 14; i++) c(T.plank + 0.3 + i * ((W_('walkway') - T.plank) / 14), 'knock');
  c(T.carIn - 0.2, 'engine', W_('middle') + 0.5 - T.carIn);
  c(W_('starts') - 0.1, 'creak'); c(W_('bending') + 0.1, 'creak'); c(T.face + 0.1, 'gulp');
  for (const h of T.pileHits) c(h, 'pile');
  c(W_('beams') - 0.2, 'slide'); c(W_('beams') + 0.6, 'clunk'); c(W_('giving'), 'lift'); c(W_('support'), 'chime');
  c(W_('Not') - 0.05, 'rattle', W_('diagonal') + 0.6 - W_('Not'));
  for (const k of [0, 1, 2, 3]) c(W_('diagonal') + 0.2 + k * 0.32, 'knock');
  c(W_('strong', 2), 'chime');
  c(T.kids, 'giggle', T.rail - T.kids);
  for (let i = 0; i < 12; i++) c(W_('install') + i * 0.17, 'knock');
  c(W_('safe') - 0.1, 'chime');
  c(T.s7, 'swell'); c(W_('Congratulations') - 0.05, 'cheer'); c(W_('Congratulations'), 'pop'); c(W_('Congratulations') + 0.05, 'chime');
  c(T.endCard - 0.1, 'boom');
  CUES.sort((a, b) => a.t - b.t);
}

// ======================= RENDER =======================
function sceneIndex(t) { let i = 0; for (const c of T.cuts) if (t >= c) i++; return i; }
function render(t) {
  S = defaults(); camera.up.set(0, 1, 0);
  hero.root.visible = false; neigh.root.visible = false;
  const i = sceneIndex(t);
  scenes[i](t);
  apply(t);
  if (window.__hook) eval(window.__hook);
  renderer.render(scene, camera);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(glc, 0, 0);
  overlay(t);
}
window.setup = setup; window.render = render; window.ready = true;
