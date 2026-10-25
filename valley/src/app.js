import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DIMS, DIM_NOTE, GRADES, WEAVE, ISLANDS, LINKS, LINK_WALKERS } from './data.js';
import { makeRoleWalker, poseWalker, fadeIcon } from './roles.js';
import { PHOTOS } from './photos.js';
import { buildItem, animated, makeWalker, C as SC } from './scenery.js';
import { makeBoar, makeMuntjac, makeMonkey, makeFlyingSquirrel, wander, sitter, glider } from './animals.js';

const $ = (s, el = document) => el.querySelector(s);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isNarrow = () => innerWidth < 760;
const CIRC = '①②③④⑤⑥⑦⑧⑨⑩';
const pad = (n) => String(n).padStart(2, '0');

// ───────────────────────── 地形高度
function sstep(e0, e1, x) { let t = (x - e0) / (e1 - e0); t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); }
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
function fbm(x, y) { return vnoise(x, y) * 0.6 + vnoise(x * 2.1, y * 2.1) * 0.28 + vnoise(x * 4.3, y * 4.3) * 0.12; }

// 溪流
const STREAM = new THREE.CatmullRomCurve3([
  [13, -36], [17.5, -24], [21, -13], [20.5, -4], [22, 4], [20.5, 11], [17, 17], [13, 22],
].map(([x, z]) => new THREE.Vector3(x, 0, z)));
const STREAM_PTS = STREAM.getSpacedPoints(160);
function nearest(pts, x, z) {
  let m = 1e9;
  for (const p of pts) { const dx = p.x - x, dz = p.z - z; const d = dx * dx + dz * dz; if (d < m) m = d; }
  return Math.sqrt(m);
}
const streamDist = (x, z) => nearest(STREAM_PTS, x, z);

function rawH(x, z) {
  let h = 0.6 + 9.6 * sstep(15.5, -16.5, z);
  const back = Math.max(0, -19 - z);
  const side = Math.max(0, Math.abs(x) - 22.5);
  h += Math.pow(back, 1.25) * 0.6 + Math.pow(side, 1.3) * 0.5;
  h -= 2.6 * sstep(17.5, 22.5, z);
  const m = 0.35 + Math.min(1, (back + side) / 7) * 2.4;
  h += fbm(x * 0.09 + 3, z * 0.09) * m;
  return h;
}

// ── 三年山徑：台地沿著一條蜿蜒上山的步道排列
const TRAIL = new THREE.CatmullRomCurve3([
  [-18.5, 16.5], [-14, 14.5], [-5.5, 13.2], [3.5, 14.2], [11.5, 12], [15.5, 7.2], [8, 4.6], [-1.5, 5.2], [-10.5, 3.6],
  [-16.5, -0.5], [-12, -5], [-2.5, -3.6], [7.5, -5], [14.5, -8.8], [13, -14], [4, -15.6], [-5.5, -14.2], [-13, -16.5], [-18, -19],
].map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
const TRAIL_LEN = TRAIL.getLength();
ISLANDS.forEach((isl) => {
  isl.count = isl.groups.reduce((n, g) => n + g.items.length, 0);
  isl.R = Math.min(2.35, 1.55 + 0.14 * isl.count);
});
{
  const gapIsl = 1.5, gapGrade = 4.2, padStart = 4.5, padEnd = 4.5;
  let total = padStart + padEnd;
  ISLANDS.forEach((isl, i) => { total += isl.R * 2 + gapIsl; if (i && ISLANDS[i - 1].g !== isl.g) total += gapGrade; });
  const k = TRAIL_LEN / total;
  let s = padStart * k;
  ISLANDS.forEach((isl, i) => {
    if (i && ISLANDS[i - 1].g !== isl.g) { isl.gradeStart = s + gapGrade * k * 0.5; s += gapGrade * k; }
    s += (isl.R + gapIsl / 2) * k;
    isl.s = s / TRAIL_LEN;
    s += (isl.R + gapIsl / 2) * k;
  });
  ISLANDS[0].gradeStart = padStart * k * 0.45;
  ISLANDS.forEach((isl) => {
    const p = TRAIL.getPointAt(isl.s), t = TRAIL.getTangentAt(isl.s);
    const side = (isl.id % 2 ? 1 : -1) * 0.35;
    isl.x = p.x - t.z * side; isl.z = p.z + t.x * side;
    isl.base = rawH(isl.x, isl.z);
    isl.top = isl.base + 0.75 + hash(isl.id, 4) * 0.45;
    isl.rot = hash(isl.id, 7) * Math.PI;
    if (isl.gradeStart) isl.gradeStart /= TRAIL_LEN;
  });
}
const TRAIL_PTS = TRAIL.getSpacedPoints(400);
const trailDist = (x, z) => nearest(TRAIL_PTS, x, z);

function groundH(x, z, withStream = true) {
  let h = rawH(x, z);
  for (const isl of ISLANDS) {
    const d = Math.hypot(x - isl.x, z - isl.z);
    const w = sstep(isl.R * 1.9, isl.R * 1.1, d);
    if (w > 0) h = h * (1 - w) + isl.base * w;
  }
  if (withStream) h -= 0.55 * sstep(1.6, 0.3, streamDist(x, z));
  return h;
}

// ───────────────────────── Three 基本設定
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe4ebe4, 55, 130);
const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 300);

const hemi = new THREE.HemisphereLight(0xf3f6ee, 0x8a8f6c, 1.25);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, 2.1);
sun.position.set(22, 38, 18);
sun.target.position.set(0, 0, -4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 30, bottom: -30, near: 5, far: 110 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

// 地形
{
  const W = 110, D = 88, SX = 190, SZ = 152;
  const geo = new THREE.PlaneGeometry(W, D, SX, SZ);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -12);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const low = new THREE.Color('#b4c486'), mid = new THREE.Color('#93ad6d'), hi = new THREE.Color('#6b8d55'),
    rock = new THREE.Color('#a29d8d'), sand = new THREE.Color('#d2c49e'), bed = new THREE.Color('#9aa58a'), trailC = new THREE.Color('#c9b28a');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = groundH(x, z);
    pos.setY(i, h);
    const n = hash(Math.round(x * 3), Math.round(z * 3)) * 0.08;
    if (h < -0.9) c.copy(sand);
    else if (h < 2) c.copy(low).lerp(mid, Math.max(0, h) / 2);
    else if (h < 9) c.copy(mid).lerp(hi, (h - 2) / 7);
    else c.copy(hi).lerp(rock, Math.min(1, (h - 9) / 10));
    if (streamDist(x, z) < 1.1) c.lerp(bed, 0.6);
    else if (trailDist(x, z) < 0.45) c.lerp(trailC, 0.75);
    c.offsetHSL(0, 0, n - 0.04);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal, earth = new THREE.Color('#a3896a');
  for (let i = 0; i < pos.count; i++) {
    const ny = nrm.getY(i);
    if (ny < 0.9 && pos.getY(i) < 11) {
      c.setRGB(col[i * 3], col[i * 3 + 1], col[i * 3 + 2]).lerp(earth, Math.min(1, (0.9 - ny) * 4));
      col.set([c.r, c.g, c.b], i * 3);
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  mesh.receiveShadow = true;
  scene.add(mesh);
}

// 前方大河
const waterGeo = new THREE.PlaneGeometry(160, 52, 64, 20);
waterGeo.rotateX(-Math.PI / 2);
waterGeo.translate(0, -1.05, 45);
const waterBase = Float32Array.from(waterGeo.attributes.position.array);
const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ color: '#79aebb', flatShading: true, roughness: 0.35, metalness: 0.05, transparent: true, opacity: 0.94 }));
water.receiveShadow = true;
scene.add(water);

// 溪流帶
{
  const N = STREAM_PTS.length;
  const verts = [], idx = [];
  for (let i = 0; i < N; i++) {
    const p = STREAM_PTS[i];
    const t = STREAM.getTangentAt(i / (N - 1));
    const nx = -t.z, nz = t.x;
    const w = 0.42 + (i / N) * 0.35;
    for (const s of [-1, 1]) {
      const x = p.x + nx * w * s, z = p.z + nz * w * s;
      verts.push(x, Math.max(groundH(x, z), groundH(p.x, p.z)) + 0.1, z);
    }
    if (i < N - 1) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx); g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#86bcc6', roughness: 0.3, side: THREE.DoubleSide })));
}

// 樹林
{
  const cone = new THREE.ConeGeometry(0.5, 1.4, 6); cone.translate(0, 1.0, 0);
  const trunk = new THREE.CylinderGeometry(0.09, 0.12, 0.45, 5); trunk.translate(0, 0.22, 0);
  const ball = new THREE.IcosahedronGeometry(0.55, 0); ball.translate(0, 0.85, 0);
  const pts = [];
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let n = 0; n < 9000 && pts.length < 1100; n++) {
    const x = (rnd() - 0.5) * 100, z = -52 + rnd() * 74;
    const h = groundH(x, z);
    if (h < -0.6 || h > 26) continue;
    if (ISLANDS.some((i) => Math.hypot(x - i.x, z - i.z) < i.R * 1.5)) continue;
    if (streamDist(x, z) < 1.3 || trailDist(x, z) < 1.1) continue;
    const wild = Math.max(0, -18 - z) + Math.max(0, Math.abs(x) - 19.5);
    const p = wild > 1 ? 0.85 : 0.16;
    if (rnd() > p) continue;
    pts.push({ x, z, h, s: (wild > 1 ? 1.0 : 0.75) + rnd() * 0.6, pine: wild > 1 || rnd() < 0.4, r: rnd() });
  }
  const pines = pts.filter((p) => p.pine), balls = pts.filter((p) => !p.pine);
  const mFol = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 });
  const mTr = new THREE.MeshStandardMaterial({ color: '#6d5240', flatShading: true });
  const make = (geo, list, mat, colorFn) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), c = new THREE.Color();
    list.forEach((p, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.r * 6);
      s.setScalar(p.s); v.set(p.x, p.h - 0.05, p.z);
      m.compose(v, q, s); im.setMatrixAt(i, m);
      if (colorFn) { colorFn(c, p); im.setColorAt(i, c); }
    });
    im.castShadow = true; im.receiveShadow = true;
    scene.add(im);
  };
  make(cone, pines, mFol, (c, p) => c.setHSL(0.27 + p.r * 0.06, 0.32, 0.27 + p.r * 0.1));
  make(trunk, pts, mTr);
  make(ball, balls, mFol.clone(), (c, p) => c.setHSL(0.2 + p.r * 0.08, 0.38, 0.4 + p.r * 0.1));
}

// 小動物：數量少，只做點綴（七年級田邊的山豬、八年級林邊的山羌、九年級山林的獼猴與飛鼠）
{
  const okSpot = (x, z, margin = 0) => {
    const h = groundH(x, z);
    if (h < -0.4 || h > 24) return false;
    if (trailDist(x, z) < 1.5 + margin || streamDist(x, z) < 1.6 + margin) return false;
    return !ISLANDS.some((i) => Math.hypot(x - i.x, z - i.z) < i.R * 1.35 + margin);
  };
  const findSpot = (isl, margin = 0.6) => {
    for (const d of [1.0, 1.6, 2.3, 3.0, 3.8]) {
      for (let k = 0; k < 16; k++) {
        const a = -Math.PI / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 8);
        const r = isl.R * 1.35 + margin + d, x = isl.x + Math.cos(a) * r, z = isl.z + Math.sin(a) * r;
        if (okSpot(x, z, margin)) return { x, z };
      }
    }
    return null;
  };
  const gh = (x, z) => groundH(x, z);
  const sB = findSpot(ISLANDS[1]);
  if (sB) { const a = makeBoar(); scene.add(a.g); animated.push(wander(a, { cx: sB.x, cz: sB.z, r: 0.6, ground: gh, speed: 0.3, scale: 1.4 })); }
  const sM = findSpot(ISLANDS[8]);
  if (sM) { const a = makeMuntjac(); scene.add(a.g); animated.push(wander(a, { cx: sM.x, cz: sM.z, r: 0.6, ground: gh, speed: 0.26, scale: 1.2 })); }
  const sK = findSpot(ISLANDS[15], 0.3);
  if (sK) {
    const y = groundH(sK.x, sK.z);
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), new THREE.MeshStandardMaterial({ color: '#9b978d', flatShading: true, roughness: 1 }));
    rock.scale.set(1.2, 0.75, 1); rock.position.set(sK.x, y + 0.12, sK.z); rock.castShadow = rock.receiveShadow = true; scene.add(rock);
    const a = makeMonkey(); a.g.position.set(sK.x, y + 0.42, sK.z); scene.add(a.g);
    animated.push(sitter(a, { scale: 1.4 }));
  }
  // 飛鼠：在九年級森林裡兩棵大樹之間滑翔
  const sA = findSpot(ISLANDS[19], 0.4);
  if (sA) {
    let sB2 = null;
    for (let k = 0; k < 24 && !sB2; k++) {
      const a = (k / 24) * Math.PI * 2, x = sA.x + Math.cos(a) * 3.6, z = sA.z + Math.sin(a) * 3.6;
      if (okSpot(x, z, 0.2)) sB2 = { x, z };
    }
    if (sB2) {
      const tree = (p) => {
        const y = groundH(p.x, p.z), g = new THREE.Group();
        const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.2, 6), new THREE.MeshStandardMaterial({ color: '#6d5240', flatShading: true }));
        tr.position.y = 0.6; g.add(tr);
        const fol = new THREE.MeshStandardMaterial({ color: '#4c7440', flatShading: true, roughness: 0.9 });
        [[0.95, 1.6, 1.4], [0.75, 1.3, 2.2], [0.5, 1.0, 2.9]].forEach(([r, h, yy]) => { const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), fol); c.position.y = yy; g.add(c); });
        g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        g.position.set(p.x, y, p.z); scene.add(g);
        return { x: p.x, z: p.z, y: y + 2.0 };
      };
      const tA = tree(sA), tB = tree(sB2);
      const perch = (a, b) => { const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz); return new THREE.Vector3(a.x + (dx / L) * 0.55, a.y, a.z + (dz / L) * 0.55); };
      const fs = makeFlyingSquirrel(); scene.add(fs.g);
      animated.push(glider(fs, { A: perch(tA, tB), B: perch(tB, tA), scale: 1.6, period: 12, sag: 0.8 }));
    }
  }
}

// 雲
const clouds = [];
{
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1 });
  for (let i = 0; i < 8; i++) {
    const g = new THREE.Group();
    const n = 3 + (i % 3);
    for (let k = 0; k < n; k++) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1 + hash(i, k) * 1.2, 0), mat);
      b.position.set(k * 1.6 - n * 0.8, hash(k, i) * 0.6, hash(i + k, 2) * 1.2);
      b.castShadow = true;
      g.add(b);
    }
    g.position.set(-50 + i * 14, 17 + hash(i, 5) * 5, -34 - hash(i, 8) * 14);
    g.userData.v = 0.25 + hash(i, 1) * 0.3;
    clouds.push(g); scene.add(g);
  }
}

// ───────────────────────── 台地
function diamondTexture(dim) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
  const x = cv.getContext('2d');
  x.fillStyle = dim.c; x.fillRect(0, 0, 256, 128);
  x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, 0, 256, 128);
  x.fillStyle = '#f7f1e6'; x.fillRect(0, 14, 256, 6); x.fillRect(0, 108, 256, 6);
  const dia = (cx, cy, r, fill) => { x.beginPath(); x.moveTo(cx, cy - r); x.lineTo(cx + r, cy); x.lineTo(cx, cy + r); x.lineTo(cx - r, cy); x.closePath(); x.fillStyle = fill; x.fill(); };
  dia(128, 64, 34, '#f7f1e6'); dia(128, 64, 24, '#2a1d17'); dia(128, 64, 14, dim.c); dia(128, 64, 5, '#f7f1e6');
  for (const cx of [32, 224]) { dia(cx, 64, 18, '#2a1d17'); dia(cx, 64, 9, '#f7f1e6'); }
  for (const cx of [0, 256]) dia(cx, 64, 18, '#f7f1e6');
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(6, 1);
  t.anisotropy = 4;
  return t;
}
const sideMats = {}, rimMats = {};
for (const k in DIMS) {
  sideMats[k] = new THREE.MeshStandardMaterial({ map: diamondTexture(DIMS[k]), roughness: 0.9 });
  rimMats[k] = new THREE.MeshStandardMaterial({ color: DIMS[k].c, roughness: 0.8, flatShading: true });
}
const capMat = new THREE.MeshStandardMaterial({ color: '#5b4a3c', roughness: 1 });
const grassMats = { 7: '#c6cf8a', 8: '#b4c98a', 9: '#a2c07f' };
for (const g in grassMats) grassMats[g] = new THREE.MeshStandardMaterial({ color: grassMats[g], flatShading: true, roughness: 1 });
const bushMat = new THREE.MeshStandardMaterial({ color: '#7fa25c', flatShading: true });
const stepMat = new THREE.MeshStandardMaterial({ color: '#9a7a58', flatShading: true });

// 細項在台地上的位置（以台地半徑為單位）
const SPOTS = {
  1: [[0, 0.05]],
  2: [[-0.42, 0.08], [0.42, -0.08]],
  3: [[-0.47, 0.28], [0.47, 0.28], [0, -0.42]],
  4: [[-0.42, -0.36], [0.42, -0.36], [-0.42, 0.38], [0.42, 0.38]],
  6: [[-0.52, -0.38], [0, -0.52], [0.52, -0.38], [-0.52, 0.38], [0, 0.52], [0.52, 0.38]],
};

const pickables = [];
function itemLine(isl, nm, c) {
  const G = GRADES[isl.g].label;
  if (!c) return `我是${G}的學生，正在練習「${nm}」。`;
  const parts = c.replace('；', '、').split('、');
  const list = parts.length > 1 ? parts.slice(0, -1).join('、') + '和' + parts[parts.length - 1] : parts[0];
  return `我們${G}在學「${nm}」，會學到${list}。`;
}
for (const isl of ISLANDS) {
  const R = isl.R;
  const root = new THREE.Group();
  root.position.set(isl.x, 0, isl.z);
  const hex = new THREE.Group();
  hex.rotation.y = isl.rot;
  const T = isl.top;
  const depth = T - isl.base + 0.9;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.97, R * 0.86, depth, 6), [sideMats[isl.d], capMat, capMat]);
  body.position.y = T - 0.15 - depth / 2;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.98, 0.18, 6), rimMats[isl.d]);
  rim.position.y = T - 0.06;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.93, R * 0.93, 0.12, 6), grassMats[isl.g]);
  top.position.y = T + 0.06;
  for (const m of [body, rim, top]) { m.castShadow = true; m.receiveShadow = true; m.userData.isl = isl; hex.add(m); pickables.push(m); }
  root.add(hex);

  // 細項造景
  const names = isl.groups.flatMap((g) => g.items);
  const contentOf = {};
  isl.groups.forEach((g) => g.items.forEach((n) => { contentOf[n] = g.c; }));
  const spots = SPOTS[names.length] || SPOTS[6];
  isl.markers = names.map((nm, i) => {
    const [sx, sz] = spots[i];
    const { obj, h } = buildItem(nm, DIMS[isl.d].c);
    const scale = ({ 1: 1.75, 2: 1.5, 3: 1.4, 4: 1.25 })[names.length] || 1.05;
    obj.scale.setScalar(scale);
    obj.position.set(sx * R, T + 0.12, sz * R);
    obj.rotation.y = (hash(isl.id, i) - 0.5) * 0.6;
    obj.traverse((o) => {
      if (o.isMesh) { o.userData.isl = isl; pickables.push(o); }
      if (o.userData.isPerson) { o.userData.say = itemLine(isl, nm, contentOf[nm]); o.userData.isl = isl; }
    });
    root.add(obj);
    return { name: nm, local: new THREE.Vector3(sx * R, T + 0.12 + h * scale + 0.05, sz * R) };
  });
  isl.labelH = Math.max(...isl.markers.map((m) => m.local.y)) + 0.25;

  // 邊緣灌木
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1 + isl.id;
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18 + hash(isl.id, k) * 0.1, 0), bushMat);
    b.position.set(Math.cos(a) * R * 0.8, T + 0.18, Math.sin(a) * R * 0.8);
    b.castShadow = true; root.add(b);
  }

  // 步道上下台地的階梯
  for (const dir of [-1, 1]) {
    if (dir < 0 && isl.id === 1 && false) continue;
    const t = TRAIL.getTangentAt(isl.s).multiplyScalar(dir);
    const steps = 5;
    for (let k = 0; k < steps; k++) {
      const d = R * 0.86 + 0.12 + k * 0.24;
      const px = t.x * d, pz = t.z * d;
      const g = groundH(isl.x + px, isl.z + pz) - 0.1;
      const hh = Math.max(0.05, (T + 0.1) - g - (k + 0.5) * ((T - g) / steps));
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.75, hh, 0.26), stepMat);
      st.position.set(isl.x + px, g + hh / 2, isl.z + pz);
      st.rotation.y = Math.atan2(t.x, t.z);
      st.castShadow = st.receiveShadow = true;
      scene.add(st);
    }
  }
  isl.group = root; isl.lift = 0;
  scene.add(root);
}

// 年級路牌
const gradeSigns = [7, 8, 9].map((g) => {
  const first = ISLANDS.find((i) => i.g === g);
  const s = first.gradeStart;
  const p = TRAIL.getPointAt(s), t = TRAIL.getTangentAt(s);
  const x = p.x + t.z * 0.9, z = p.z - t.x * 0.9, y = groundH(x, z);
  const sign = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.4, 6), new THREE.MeshStandardMaterial({ color: '#55402f', flatShading: true }));
  post.position.y = 0.7;
  const boardM = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.08), new THREE.MeshStandardMaterial({ color: GRADES[g].c, flatShading: true }));
  boardM.position.y = 1.25;
  sign.add(post, boardM);
  sign.position.set(x, y, z);
  sign.rotation.y = Math.atan2(t.x, t.z) + Math.PI / 2;
  sign.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(sign);
  return { g, pos: new THREE.Vector3(x, y + 1.9, z) };
});

// 步道上的行人：每個人都有任務
// 1. 銜接行人：沿著縱向銜接（LINKS），帶著物品在兩座台地之間往返
// 2. 三年學習旅程：一位學生從 01 依序走到 21，每座台地停一下；跨年級時換上該年級的服裝，走完後由新的一屆接手
// 路線沿著步道走；要停留的台地走台階上去，只是路過的台地則從山腳繞過去（避免穿過台地上的造景）
const walkers = [];
const peopleMeshes = [];
const segDist = (px, pz, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1; let k = ((px - a.x) * dx + (pz - a.z) * dz) / L2; k = Math.max(0, Math.min(1, k)); return Math.hypot(px - a.x - dx * k, pz - a.z - dz * k); };
for (const isl of ISLANDS) {
  const t = TRAIL.getTangentAt(isl.s), nx = -t.z, nz = t.x; // u：步道切線方向、v：側向
  const R = isl.R, Ty = isl.top + 0.12;
  const obs = [];
  isl.group.updateMatrixWorld(true);
  isl.group.children.forEach((c, i) => {
    if (i === 0) return; // 台地本體
    const bb = new THREE.Box3().setFromObject(c), cc = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
    obs.push({ x: cc.x, z: cc.z, r: Math.max(sz.x, sz.z) * 0.42 });
  });
  const P = (u, v, y) => { const q = new THREE.Vector3(isl.x + t.x * u + nx * v, y, isl.z + t.z * u + nz * v); if (y === null) q.y = groundH(q.x, q.z); return q; };
  const clear = (pts) => { let c = Infinity; for (const o of obs) for (let j = 0; j < pts.length - 1; j++) c = Math.min(c, segDist(o.x, o.z, pts[j], pts[j + 1]) - o.r); return c; };
  const stepTop = (sg) => P(sg * R * 0.86, 0, Ty), stepBot = (sg) => P(sg * (R * 0.86 + 1.25), 0, null);
  // 台階上來的停留點：離造景最遠、又不要太深入
  const landing = (sg) => {
    let best = null;
    for (const uu of [0.78, 0.7, 0.62, 0.54]) for (const vv of [0, 0.14, -0.14, 0.28, -0.28]) {
      const q = P(sg * uu * R, vv * R, Ty), c = clear([stepTop(sg), q]);
      const sc = Math.min(c, 0.25) - (0.78 - uu) * 0.1 - Math.abs(vv) * 0.05;
      if (!best || sc > best.sc) best = { sc, q, c };
    }
    return best;
  };
  const Lm = landing(-1), Lp = landing(1);
  isl.stopIn = Lm.q; isl.stopOut = Lp.q;
  isl.upIn = [stepBot(-1), stepTop(-1), Lm.q]; isl.downOut = [Lp.q, stepTop(1), stepBot(1)];
  // 台地上可以直接穿過嗎？（找離造景最遠的穿越線；太擠就改成下台階繞過去）
  let cross = null;
  for (let k = -10; k <= 10; k++) {
    const v = (k / 10) * 0.55 * R;
    for (const uu of [0.42, 0.55]) {
      const pts = [Lm.q, P(-uu * R, v, Ty), P(uu * R, v, Ty), Lp.q], c = clear(pts);
      const sc = Math.min(c, 0.4) - Math.abs(v) * 0.03;
      if (!cross || sc > cross.sc) cross = { sc, c, pts };
    }
  }
  isl.cross = cross.c >= 0.12 ? cross.pts.slice(1, 3) : null;
  // 從山腳繞過台地：選離溪流較遠的一側
  const ringR = R + 0.38, far = R * 0.86 + 2.0;
  const ring = (sg) => { const pts = [P(-far, 0, null)]; for (let k = 0; k <= 8; k++) { const ph = Math.PI * (2 / 3 - (k / 8) / 3); pts.push(P(Math.cos(ph) * ringR, sg * Math.sin(ph) * ringR, null)); } pts.push(P(far, 0, null)); return pts; };
  const side = [1, -1].map((sg) => { const r = ring(sg); return { r, d: Math.min(...r.map((q) => streamDist(q.x, q.z))) }; }).sort((a, b) => b.d - a.d)[0];
  isl.around = side.r;
  isl.sStep = (R * 0.86 + 1.25) / TRAIL_LEN; isl.sFar = far / TRAIL_LEN;
}
const isNear = (x, z) => ISLANDS.some((i) => Math.hypot(x - i.x, z - i.z) < i.R * 0.86 + 1.25);
// 步道上兩點之間的取樣點（略過台地範圍）
function trailPts(s0, s1) {
  const pts = [], n = Math.max(2, Math.ceil(((s1 - s0) * TRAIL_LEN) / 0.45));
  for (let i = 1; i < n; i++) {
    const p = TRAIL.getPointAt(s0 + ((s1 - s0) * i) / n);
    if (isNear(p.x, p.z)) continue;
    p.y = groundH(p.x, p.z); pts.push(p);
  }
  return pts;
}
// 從台地 A 走到台地 B（A 在步道前段）；visit：途中每座台地都上去停留（三年學習旅程用）
function makeLegPts(pts) {
  const clean = [pts[0]];
  for (let i = 1; i < pts.length; i++) if (pts[i].distanceTo(clean[clean.length - 1]) > 1e-3) clean.push(pts[i]);
  const cum = [0];
  for (let i = 1; i < clean.length; i++) cum.push(cum[i - 1] + clean[i].distanceTo(clean[i - 1]));
  return { pts: clean, cum, len: cum[cum.length - 1] };
}
function routeIsl(A, B, { fromIn = false } = {}) {
  const ia = ISLANDS.indexOf(A), ib = ISLANDS.indexOf(B);
  let pts, s;
  if (fromIn) { // 從 A 的入口停留點出發：能穿過就穿過，不然下台階繞過去
    if (A.cross) { pts = [A.stopIn.clone(), ...A.cross, ...A.downOut]; s = A.s + A.sStep; }
    else { pts = [A.stopIn.clone(), ...A.upIn.slice(0, 2).reverse(), ...A.around.slice(1)]; s = A.s + A.sFar; }
  } else { pts = [...A.downOut]; s = A.s + A.sStep; }
  for (let i = ia + 1; i < ib; i++) {
    const I = ISLANDS[i];
    pts.push(...trailPts(s, I.s - I.sFar), ...I.around); s = I.s + I.sFar;
  }
  pts.push(...trailPts(s, B.s - B.sStep), ...B.upIn);
  return makeLegPts(pts);
}
function legAt(leg, s, out) {
  let lo = 1, hi = leg.cum.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (leg.cum[m] < s) lo = m + 1; else hi = m; }
  const k = (s - leg.cum[lo - 1]) / Math.max(1e-6, leg.cum[lo] - leg.cum[lo - 1]);
  return out.lerpVectors(leg.pts[lo - 1], leg.pts[lo], Math.min(1, Math.max(0, k)));
}
const islById = (id) => ISLANDS.find((i) => i.id === id);
function addWalker(w) {
  scene.add(w.g);
  w.g.traverse((o) => { if (o.isMesh) peopleMeshes.push(o); });
  w.g.userData.walker = w;
}
// 銜接行人
LINK_WALKERS.forEach((cfg, i) => {
  const A = islById(cfg.a), B = islById(cfg.b);
  const link = LINKS.find((l) => l.a === cfg.a && l.b === cfg.b);
  const w = makeRoleWalker(cfg.role, { prop: cfg.prop, icon: cfg.icon, ring: DIMS[B.d].c });
  w.g.scale.setScalar(1.3);
  const leg = routeIsl(A, B);
  Object.assign(w, { kind: 'link', cfg, link, A, B, leg, dir: hash(i, 13) > 0.35 ? 1 : -1, s: leg.len * hash(i, 11) * 0.9, pause: 0, phase: hash(i, 5) * 6, look: 0,
    lat: ((i % 5) - 2) * 0.07, vmax: 0.95 + hash(i, 3) * 0.25, scale: 1.3, vis: 1 });
  w.setCarry(w.dir > 0);
  addWalker(w); walkers.push(w);
});
// 三年學習旅程的學生：三套年級服裝，依所在年級切換
const journey = (() => {
  const figs = { 7: makeRoleWalker('g7'), 8: makeRoleWalker('g8'), 9: makeRoleWalker('g9') };
  const j = { kind: 'journey', figs, k: 0, at: ISLANDS[0], leg: null, dir: 1, s: 0, pause: 2.5, phase: 0, look: 0, lat: 0, vmax: 1.0, scale: 1.3, vis: 1, pop: 1, grade: 7 };
  for (const g of [7, 8, 9]) { const f = figs[g]; f.g.scale.setScalar(1.3); f.g.visible = g === 7; addWalker(f); f.g.userData.walker = j; }
  j.cur = figs[7];
  j.cur.g.position.copy(j.at.stopIn);
  walkers.push(j);
  return j;
})();
function journeySetGrade(g) {
  if (journey.grade === g) return;
  const p = journey.cur.g.position.clone(), r = journey.cur.g.rotation.y;
  journey.cur.g.visible = false;
  journey.grade = g; journey.cur = journey.figs[g];
  journey.cur.g.visible = true; journey.cur.g.position.copy(p); journey.cur.g.rotation.y = r; journey.pop = 0;
}
// 開啟某座台地時，只留下與它有關的銜接行人（和旅程中的學生）
function walkerRelevant(w) {
  if (!current || w.kind === 'journey') return true;
  return w.A === current || w.B === current;
}
const _wp = new THREE.Vector3(), _wq = new THREE.Vector3();
function updateWalker(w, dt, t) {
  const f = w.kind === 'journey' ? w.cur : w;
  fadeIcon(f, camera, 26, 42);
  w.vis += ((walkerRelevant(w) ? 1 : 0) - w.vis) * Math.min(1, dt * 6 || 1);
  if (w.kind === 'journey') { w.pop = Math.min(1, w.pop + dt * 2.5); }
  f.g.visible = w.vis > 0.03;
  f.g.scale.setScalar(w.scale * (0.4 + 0.6 * w.vis) * (w.kind === 'journey' ? 0.6 + 0.4 * w.pop : 1));
  if (w.talk > 0) {
    w.talk -= dt;
    const yaw = Math.atan2(camera.position.x - f.g.position.x, camera.position.z - f.g.position.z);
    let d = yaw - f.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); f.g.rotation.y += d * Math.min(1, dt * 5);
    poseWalker(f, 0, 0); f.head.rotation.y *= 0.9;
    return;
  }
  if (w.pause > 0) {
    w.pause -= dt; w.look += dt;
    f.head.rotation.y = Math.sin(w.look * 0.9) * 0.6;
    poseWalker(f, 0, 0);
    if (w.pause <= 0) {
      f.head.rotation.y = 0;
      if (w.kind === 'journey') {
        const k = ISLANDS.indexOf(w.at);
        if (k === ISLANDS.length - 1) { // 畢業：新的一屆從 01 出發
          w.at = ISLANDS[0]; w.leg = null; journeySetGrade(7); w.cur.g.position.copy(w.at.stopIn); w.pause = 2.5; w.pop = 0;
        } else { w.from = w.at; w.at = ISLANDS[k + 1]; w.leg = routeIsl(w.from, w.at, { fromIn: true }); w.s = 0; }
      } else if ((w.dir > 0 && w.s >= w.leg.len) || (w.dir < 0 && w.s <= 0)) w.dir *= -1;
    }
    return;
  }
  if (!w.leg) { w.pause = 0.01; return; }
  const L = w.leg.len, ends = Math.min(w.s, L - w.s);
  const v = w.vmax * (0.35 + 0.65 * Math.min(1, ends / 1.2));
  w.s = Math.max(0, Math.min(L, w.s + v * dt * w.dir));
  legAt(w.leg, w.s, _wp);
  legAt(w.leg, Math.max(0, Math.min(L, w.s + 0.35 * w.dir)), _wq);
  const dx = _wq.x - _wp.x, dz = _wq.z - _wp.z, ln = Math.hypot(dx, dz) || 1;
  const lat = w.lat * w.dir * Math.min(1, ends / 0.8);
  const x = _wp.x - (dz / ln) * lat, z = _wp.z + (dx / ln) * lat;
  f.g.position.set(x, _wp.y - 0.02 + Math.abs(Math.sin(w.phase)) * 0.025, z);
  if (ln > 0.01) { let d = Math.atan2(dx, dz) - f.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); f.g.rotation.y += d * Math.min(1, dt * 5); }
  w.phase += dt * v * 7;
  poseWalker(f, w.phase, 0.6);
  // 旅程中的學生：走進下一個年級的範圍就換裝
  if (w.kind === 'journey') { const g = w.at.g; if (g !== w.grade && w.s > L * 0.5) journeySetGrade(g); }
  if ((w.dir > 0 && w.s >= L) || (w.dir < 0 && w.s <= 0)) {
    w.look = 0;
    if (w.kind === 'journey') w.pause = 3.5;
    else { w.pause = 2; w.setCarry(w.dir < 0); }
  }
}
// 頭上的小名牌：旅程中的學生一直顯示；銜接行人在開啟相關台地時顯示
const wtagLayer = document.createElement('div'); wtagLayer.id = 'wtags'; { const lab = document.getElementById('labels'); if (lab) lab.before(wtagLayer); else document.body.appendChild(wtagLayer); } // 放在指標標籤底下
for (const w of walkers) { w.tag = document.createElement('div'); w.tag.className = 'wtag' + (w.kind === 'journey' ? ' journey' : ''); wtagLayer.appendChild(w.tag); w.tagText = ''; }
const _tgp = new THREE.Vector3(), _tg = {};
function walkerTagText(w) {
  if (w.kind === 'journey') return `🎒 三年學習旅程｜${GRADES[w.grade].label}・${pad(w.at.id)}`;
  const to = w.dir > 0 ? w.B : w.A;
  return w.carrying ? `${w.roleName}｜${w.cfg.item} → ${pad(to.id)}` : `${w.roleName}｜返回 ${pad(to.id)}`;
}
function placeWalkerTags() {
  for (const w of walkers) {
    const f = w.kind === 'journey' ? w.cur : w;
    const near = camera.position.distanceTo(f.g.position) < 38; // 全景時不顯示旅程學生名牌
    const on = f.g.visible && ((w.kind === 'journey' && near) || (current && w.vis > 0.6)) && bubbleFor !== f.g && !document.body.classList.contains('gaming');
    if (!on) { if (w.tagOn) { w.tag.style.display = 'none'; w.tagOn = false; } continue; }
    _tgp.set(0, f.headY + (f.icon && f.icon.visible && f.carrying ? 0.34 : 0.22), 0); f.g.localToWorld(_tgp); project(_tgp, _tg);
    if (!_tg.vis) { if (w.tagOn) { w.tag.style.display = 'none'; w.tagOn = false; } continue; }
    const txt = walkerTagText(w);
    if (txt !== w.tagText) { w.tag.textContent = txt; w.tagText = txt; }
    if (!w.tagOn) { w.tag.style.display = 'block'; w.tagOn = true; }
    w.tag.style.transform = `translate(${_tg.x}px, ${_tg.y}px) translate(-50%, -100%)`;
    w.tag.style.setProperty('--dc', w.kind === 'journey' ? GRADES[w.grade].c : DIMS[(w.dir > 0 ? w.B : w.A).d].c);
  }
}
if (/[?&]debug\b/.test(location.search)) window.__vl = { walkers, journey, camera, ISLANDS, flyTo: (...a) => flyTo(...a), V3: THREE.Vector3, advance: (sec) => { for (let i = 0; i < sec * 20; i++) for (const w of walkers) updateWalker(w, 0.05, i * 0.05); } };

// 小嚮導：藏在山徑某處的特定角色
const guide = makeWalker({ cloth: '#f2b705', guide: true });
guide.g.scale.setScalar(1.3);
guide.g.userData.isGuide = true;
scene.add(guide.g);
guide.g.traverse((o) => { if (o.isMesh) peopleMeshes.push(o); });
const GUIDE_SPOTS = [];
ISLANDS.forEach((isl) => {
  for (const a of [0.8, 2.9, 4.6]) {
    const ang = isl.rot + a;
    GUIDE_SPOTS.push({ g: isl.g, x: isl.x + Math.cos(ang) * isl.R * 0.74, z: isl.z + Math.sin(ang) * isl.R * 0.74, y: isl.top + 0.12, isl });
  }
});
for (let k = 0; k < 24; k++) {
  const sP = 0.03 + (k / 24) * 0.94, p = TRAIL.getPointAt(sP), tg = TRAIL.getTangentAt(sP);
  const side = k % 2 ? 1.5 : -1.5, x = p.x - tg.z * side, z = p.z + tg.x * side;
  if (ISLANDS.some((i) => Math.hypot(x - i.x, z - i.z) < i.R + 0.6)) continue;
  const near = ISLANDS.reduce((m, i) => (Math.abs(i.s - sP) < Math.abs(m.s - sP) ? i : m));
  GUIDE_SPOTS.push({ g: near.g, x, z, y: groundH(x, z) });
}
let guideSpot = null;
function placeGuide(spot) {
  guideSpot = spot;
  guide.g.position.set(spot.x, spot.y, spot.z);
  guide.g.rotation.y = Math.atan2(camera.position.x - spot.x, camera.position.z - spot.z) + (Math.random() - 0.5);
}
placeGuide(GUIDE_SPOTS[Math.floor(hash(3, 3) * GUIDE_SPOTS.length)]);
function updateGuide(t) {
  const wave = Math.max(0, Math.sin(t * 0.9)) ;
  guide.armR.rotation.x = -wave * 2.6; guide.armR.rotation.z = wave * 0.3;
  guide.armL.rotation.x = Math.sin(t * 1.3) * 0.1;
  guide.head.rotation.y = Math.sin(t * 0.6) * 0.6;
}

// ── 銜接線
const linkObjs = LINKS.map((l, idx) => {
  const A = ISLANDS.find((i) => i.id === l.a), B = ISLANDS.find((i) => i.id === l.b);
  const p0 = new THREE.Vector3(A.x, A.top + 0.6, A.z), p2 = new THREE.Vector3(B.x, B.top + 0.6, B.z);
  const dist = p0.distanceTo(p2);
  const p1 = p0.clone().lerp(p2, 0.5); p1.y = Math.max(p0.y, p2.y) + 2.2 + dist * 0.18;
  const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
  const color = l.rel ? '#8b7e70' : GRADES[A.g].c;
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: l.rel ? 0.75 : 0.95, depthWrite: false });
  const geo = new THREE.TubeGeometry(curve, 60, l.rel ? 0.075 : 0.12, 6, false);
  const tube = new THREE.Mesh(geo, mat);
  tube.renderOrder = 3;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 8), mat);
  const end = curve.getPoint(1), tg = curve.getTangent(0.98);
  cone.position.copy(end).addScaledVector(tg, -0.2);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tg);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(l.rel ? 0.1 : 0.14, 10, 8), new THREE.MeshBasicMaterial({ color: '#fffdf8' }));
  const grp = new THREE.Group(); grp.add(tube, cone, dot); grp.visible = false;
  scene.add(grp);
  return { l, A, B, curve, tube, cone, dot, grp, count: geo.index.count, prog: 0, delay: 0, on: false, order: Math.min(A.id, B.id) * 100 + idx };
});
function setLinksVisible(filterFn, animate = true) {
  const sorted = linkObjs.slice().sort((a, b) => a.order - b.order);
  let k = 0;
  for (const o of sorted) {
    const on = filterFn(o);
    if (on && !o.on) { o.prog = animate ? 0 : 1; o.delay = animate ? k++ * 0.28 : 0; }
    o.on = on;
  }
}

// ── 貫串課程：三條絲線穿過前三個構面的台地
const WEAVE_COLORS = ['#2f8a5c', '#c58b10', '#a8326e'];
const weaveObjs = WEAVE.map((name, c) => {
  const pts = ISLANDS.filter((i) => i.d !== 'self').map((i) => new THREE.Vector3(i.x + (c - 1) * 0.35, i.labelH + 0.9 + c * 0.35, i.z));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const mat = new THREE.MeshBasicMaterial({ color: WEAVE_COLORS[c], transparent: true, opacity: 0.85, depthWrite: false });
  const geo = new THREE.TubeGeometry(curve, 400, 0.085, 5, false);
  const tube = new THREE.Mesh(geo, mat); tube.renderOrder = 2;
  const dots = [];
  const grp = new THREE.Group(); grp.add(tube); grp.visible = false;
  for (let k = 0; k < 10; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ color: '#fffdf8' })); grp.add(d); dots.push(d); }
  scene.add(grp);
  return { name, c, curve, tube, grp, dots, count: geo.index.count, prog: 0, on: false, n: pts.length };
});

// ───────────────────────── 鏡頭與操作
const controls = new OrbitControls(camera, canvas);
Object.assign(controls, {
  enableDamping: true, dampingFactor: 0.08, minDistance: 5, maxDistance: 95,
  maxPolarAngle: 1.22, minPolarAngle: 0.2, screenSpacePanning: false, rotateSpeed: 0.6,
});

function overview() {
  const narrow = isNarrow();
  camera.fov = narrow ? 55 : 38; camera.updateProjectionMatrix();
  const aspect = innerWidth / innerHeight;
  const half = narrow ? 18.5 : 31;
  const hf = Math.tan((camera.fov * Math.PI) / 360) * aspect;
  const dist = Math.min(85, Math.max(narrow ? 34 : 32, half / hf));
  const dir = narrow ? new THREE.Vector3(0, 0.86, 0.5) : new THREE.Vector3(0, 0.64, 0.77);
  dir.normalize();
  const target = new THREE.Vector3(-0.5, 5.5, narrow ? -0.5 : 1.5);
  return { pos: target.clone().addScaledVector(dir, dist), target };
}

let fly = null;
function flyTo(pos, target, dur = 1.15) {
  if (reduceMotion) dur = 0.01;
  fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, s: performance.now(), d: dur * 1000 };
  controls.enabled = false;
}
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function focusCamera(isl) {
  const target = new THREE.Vector3(isl.x, isl.top + 0.5, isl.z);
  let az = Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
  az = Math.max(-1.0, Math.min(1.0, az));
  const phi = 0.98, dist = (isNarrow() ? 12 : 9.5) * (0.65 + isl.R * 0.18);
  const pos = new THREE.Vector3(Math.sin(phi) * Math.sin(az), Math.cos(phi), Math.sin(phi) * Math.cos(az)).multiplyScalar(dist).add(target);
  flyTo(pos, target);
}

// 讓台地避開說明卡：以 view offset 平移畫面
const off = { x: 0, y: 0, tx: 0, ty: 0 };
function updateOffsetTarget() {
  const p = $('#panel').classList.contains('open') ? $('#panel') : $('#listPanel').classList.contains('open') ? $('#listPanel') : null;
  if (!p) { off.tx = 0; off.ty = isNarrow() ? 0 : 6; return; }
  if (isNarrow()) { off.tx = 0; off.ty = p.offsetHeight * 0.5; }
  else { off.tx = (p.offsetWidth + 24) * 0.5; off.ty = 0; }
}

// ───────────────────────── 標籤
const labelsEl = $('#labels');
const gradeLabels = [7, 8, 9].map((g) => {
  const el = document.createElement('div');
  el.className = 'glabel';
  el.style.setProperty('--gc', GRADES[g].c);
  el.innerHTML = `<b>${GRADES[g].label}</b><span>${GRADES[g].name}</span>`;
  labelsEl.appendChild(el);
  return { el, pos: gradeSigns.find((s) => s.g === g).pos };
});
for (const isl of ISLANDS) {
  const b = document.createElement('button');
  b.className = 'ilabel';
  b.type = 'button';
  b.style.setProperty('--gc', GRADES[isl.g].c);
  b.style.setProperty('--dc', DIMS[isl.d].c);
  b.innerHTML = `<span class="num">${pad(isl.id)}</span><span class="nm">${isl.name}</span><span class="stem"></span>`;
  b.setAttribute('aria-label', `${GRADES[isl.g].label} ${isl.name}`);
  b.addEventListener('click', () => openIsland(isl.id));
  labelsEl.appendChild(b);
  isl.labelEl = b;
  isl.labelPos = new THREE.Vector3(isl.x, isl.labelH, isl.z);
}
let itemLabels = [];
function showItemLabels(isl) {
  itemLabels.forEach((l) => l.el.remove());
  itemLabels = [];
  if (!isl) return;
  isl.markers.forEach((m, i) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'itlabel';
    el.style.setProperty('--dc', DIMS[isl.d].c);
    el.innerHTML = `<span class="n">${CIRC[i]}</span>${m.name}`;
    el.addEventListener('click', () => flashItem(i));
    labelsEl.appendChild(el);
    itemLabels.push({ el, local: m.local, root: isl.group, pos: new THREE.Vector3() });
  });
}

const v3 = new THREE.Vector3();
function project(p, out) {
  v3.copy(p).project(camera);
  out.x = (v3.x * 0.5 + 0.5) * innerWidth;
  out.y = (-v3.y * 0.5 + 0.5) * innerHeight;
  out.vis = v3.z < 1 && v3.z > -1;
  return out;
}
const tmp = {}, tmp2 = {};
const placed = [];
const overlaps = (r) => placed.some((q) => r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y);
function placeLabels() {
  for (const isl of ISLANDS) {
    project(isl.labelPos, tmp);
    isl.sx = tmp.x; isl.sy = tmp.y - isl.lift * 30; isl.vis = tmp.vis;
    v3.set(isl.x + isl.R, isl.labelH, isl.z).project(camera);
    isl.pr = Math.abs((v3.x * 0.5 + 0.5) * innerWidth - isl.sx);
  }
  // 由前（畫面下方）往後排，放不下全名時先拉高，再不行就只顯示編號
  placed.length = 0;
  const order = ISLANDS.slice().sort((a, b) => b.sy - a.sy);
  for (const isl of order) {
    const el = isl.labelEl;
    if (!isl.fullW) { el.classList.remove('compact'); isl.fullW = el.offsetWidth || 150; isl.fullH = el.offsetHeight || 40; }
    let compact = !!current || isl.pr < 38, stem = 0, rect = null;
    if (!compact) {
      for (const st of [0, 42, 84]) {
        const r = { x: isl.sx - isl.fullW / 2 - 4, y: isl.sy - st - isl.fullH - 8, w: isl.fullW + 8, h: isl.fullH + 8 };
        if (!overlaps(r)) { rect = r; stem = st; break; }
      }
      if (!rect) compact = true;
    }
    if (compact) {
      for (const st of [0, 34, 68]) {
        const r = { x: isl.sx - 20, y: isl.sy - st - 44, w: 40, h: 42 };
        if (!overlaps(r) || st === 68) { rect = r; stem = st; break; }
      }
    }
    if (isl.vis && !isl.labelEl.classList.contains('active')) placed.push(rect);
    if (compact !== el.classList.contains('compact')) el.classList.toggle('compact', compact);
    el.style.setProperty('--stem', stem + 'px');
    el.style.transform = `translate(${isl.sx}px, ${isl.sy - stem}px) translate(-50%, -100%)`;
    el.style.visibility = isl.vis ? 'visible' : 'hidden';
  }
  for (const g of gradeLabels) {
    project(g.pos, tmp);
    g.el.style.transform = `translate(${tmp.x}px, ${tmp.y}px) translate(-50%, -100%)`;
    g.el.style.visibility = tmp.vis ? 'visible' : 'hidden';
  }
  // 細項標籤：互相重疊時往上錯開
  const ip = [];
  for (const l of itemLabels) {
    l.pos.copy(l.local).add(l.root.position);
    project(l.pos, tmp);
    l.x = tmp.x; l.y = tmp.y; l.vis = tmp.vis;
    if (!l.w) { l.w = l.el.offsetWidth || 120; l.h = l.el.offsetHeight || 32; }
  }
  for (const l of itemLabels.slice().sort((a, b) => b.y - a.y)) {
    let dy = 0;
    for (let k = 0; k < 6; k++) {
      const r = { x: l.x - l.w / 2 - 3, y: l.y - dy - l.h - 3, w: l.w + 6, h: l.h + 6 };
      if (!ip.some((q) => r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y)) { ip.push(r); break; }
      dy += l.h * 0.6;
      if (k === 5) ip.push(r);
    }
    l.el.style.transform = `translate(${l.x}px, ${l.y - dy}px) translate(-50%, -100%)`;
    l.el.style.visibility = l.vis ? 'visible' : 'hidden';
  }
}

// ───────────────────────── 說明卡
const panel = $('#panel'), body = $('#panelBody');
let current = null;
const byId = (id) => ISLANDS.find((i) => i.id === id);

function islandCard(isl) {
  const G = GRADES[isl.g], D = DIMS[isl.d];
  let n = 0;
  const groups = isl.groups.map((g) => {
    const names = g.items.map((nm) => `<span class="it" data-i="${n}"><span class="n">${CIRC[n++]}</span>${nm}</span>`).join('');
    return `<li class="grp"><div class="names">${names}</div>${g.c ? `<p>${g.c}</p>` : ''}</li>`;
  }).join('');
  const mine = LINKS.filter((l) => l.a === isl.id || l.b === isl.id);
  const chains = new Set();
  const rel = mine.map((l) => {
    if (l.chain) {
      if (chains.has(l.chain)) return '';
      chains.add(l.chain);
      const ids = [...new Set(LINKS.filter((x) => x.chain === l.chain).flatMap((x) => [x.a, x.b]))].sort((a, b) => a - b);
      const steps = ids.map((id) => { const o = byId(id); return id === isl.id
        ? `<span class="cstep here" style="--gc:${GRADES[o.g].c}"><b>${GRADES[o.g].label}</b>${o.name}</span>`
        : `<button type="button" class="cstep" data-go="${o.id}" style="--gc:${GRADES[o.g].c}"><b>${GRADES[o.g].label}</b>${o.name}</button>`; }).join('<span class="carr" aria-hidden="true">→</span>');
      return `<div class="link chain" style="--gc:${GRADES[isl.g].c}"><span class="dir">一路銜接</span>
        <span class="to csteps">${steps}</span><span class="why"><b>${l.t}</b>${l.d}</span></div>`;
    }
    const other = byId(l.a === isl.id ? l.b : l.a);
    const dir = l.a === isl.id ? '延伸到' : '銜接自';
    return `<button class="link" type="button" data-go="${other.id}" style="--gc:${GRADES[other.g].c}">
      <span class="dir">${dir}</span><span class="to"><b>${GRADES[other.g].label}</b>${other.name}</span><span class="why"><b>${l.t}</b>${l.d || ''}</span></button>`;
  }).join('');
  const weave = isl.d !== 'self'
    ? `<section><h3>貫串課程</h3><div class="chips">${WEAVE.map((w) => `<span class="chip">${w}</span>`).join('')}</div>
       <p class="note">這三門課貫穿七到九年級，和這個主題一起進行。</p></section>`
    : '';
  return `
    <div class="eyebrow">
      <span class="tag grade" style="--gc:${G.c}">${G.label}・${G.name}</span>
      <span class="tag dim" style="--dc:${D.c};--dl:${D.l}">${D.name}（${D.sub}）</span>
    </div>
    <h2 id="panelTitle"><span class="pnum" style="--gc:${G.c}">${pad(isl.id)}</span>${isl.name}</h2>
    <p class="intro">${isl.intro}</p>
    <p class="dimnote" style="--dc:${D.c}"><b>${D.name}（${D.sub}）</b>${D.desc}</p>
    <section><h3>學習內容</h3><ol class="groups">${groups}</ol></section>
    ${weave}
    ${rel ? `<section><h3>前後銜接</h3><div class="links">${rel}</div></section>` : ''}
    ${photoSection(isl)}
    <p class="note demo">畫面中的 3D 造景為示意，並非實際器物形制或文化場景的精確重建。</p>`;
}
// 照片：在評鑑網站內以相對路徑讀取，其他地方（預覽、離線檔）改讀正式網站
const PHOTO_BASE = /\/valley\/(index\.html)?$/.test(location.pathname) ? '../' : 'https://bacon-sys.github.io/115-eval-3d/';
function photoSection(isl) {
  const ps = PHOTOS[isl.id];
  if (!ps) return '';
  return `<section class="photos"><h3>課程現場</h3><div class="pstrip">${ps.map((p, k) => `<button type="button" class="pph" data-k="${k}" aria-label="放大照片：${p.c}"><img src="${PHOTO_BASE + p.t}" alt="${p.c}" loading="lazy"><span>${p.c}</span></button>`).join('')}</div></section>`;
}
function openPhoto(isl, k) {
  const ps = PHOTOS[isl.id]; if (!ps) return;
  const lb = $('#plb'); lb.hidden = false; lb.dataset.k = k; lb.dataset.id = isl.id;
  $('#plbImg').src = PHOTO_BASE + ps[k].f; $('#plbImg').alt = ps[k].c; $('#plbCap').textContent = `${ps[k].c}（${k + 1} / ${ps.length}）`;
}
function closePhoto() { $('#plb').hidden = true; $('#plbImg').removeAttribute('src'); }
$('#plbClose').addEventListener('click', closePhoto);
$('#plb').addEventListener('click', (e) => { if (e.target.id === 'plb') closePhoto(); });
$('#plbNext').addEventListener('click', () => { const lb = $('#plb'), ps = PHOTOS[lb.dataset.id]; openPhoto(byId(+lb.dataset.id), (+lb.dataset.k + 1) % ps.length); });

function openIsland(id, { fromHash = false } = {}) {
  const isl = byId(id); if (!isl) return;
  current = isl;
  closeList(true);
  hideBubble();
  if (!pathMode) setLinksVisible((o) => o.A === isl || o.B === isl);
  body.innerHTML = islandCard(isl);
  body.scrollTop = 0;
  body.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => openIsland(+b.dataset.go)));
  body.querySelectorAll('.pph').forEach((b) => b.addEventListener('click', () => openPhoto(isl, +b.dataset.k)));
  body.querySelectorAll('.pph img').forEach((im) => im.addEventListener('error', () => { const sec = im.closest('.photos'); if (sec) sec.hidden = true; }));
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  document.body.classList.add('focused');
  ISLANDS.forEach((i) => i.labelEl.classList.toggle('dim', i !== isl));
  isl.labelEl.classList.add('active');
  ISLANDS.forEach((i) => { if (i !== isl) i.labelEl.classList.remove('active'); });
  showItemLabels(isl);
  requestAnimationFrame(updateOffsetTarget);
  focusCamera(isl);
  hideHint();
  try { if (!fromHash) history.replaceState(null, '', '#i' + pad(id)); } catch (e) {}
}
function closePanel() {
  current = null;
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('focused');
  ISLANDS.forEach((i) => i.labelEl.classList.remove('dim', 'active'));
  showItemLabels(null);
  if (!pathMode) setLinksVisible(() => false);
  updateOffsetTarget();
  const o = overview(); flyTo(o.pos, o.target);
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
}
function flashItem(i) {
  const el = body.querySelector(`.it[data-i="${i}"]`); if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}
$('#close').addEventListener('click', closePanel);
$('#prev').addEventListener('click', () => current && openIsland(current.id === 1 ? 21 : current.id - 1));
$('#next').addEventListener('click', () => current && openIsland(current.id === 21 ? 1 : current.id + 1));
$('#home').addEventListener('click', () => { if (current) closePanel(); else { const o = overview(); flyTo(o.pos, o.target); } });
addEventListener('keydown', (e) => {
  if (!$('#plb').hidden) { if (e.key === 'Escape') closePhoto(); if (e.key === 'ArrowRight') $('#plbNext').click(); return; }
  if (e.key === 'Escape') { if (tourOn) endTour(); else if (current) closePanel(); else if (listOpen) closeList(); else if (pathMode) setPathMode(false); }
  if (!current || e.target.closest('input,textarea')) return;
  if (e.key === 'ArrowRight') $('#next').click();
  if (e.key === 'ArrowLeft') $('#prev').click();
});

let hintHidden = false;
let hintTimer = 0;
function hideHint() { clearTimeout(hintTimer); if (hintHidden) return; hintHidden = true; $('#hint').classList.add('gone'); } // 淡出後可從右上角「？」再看操作方式
function hintLater(ms) { clearTimeout(hintTimer); if (!hintHidden) hintTimer = setTimeout(hideHint, ms); }
$('#legendToggle').addEventListener('click', () => {
  const l = $('#legend'); const open = l.classList.toggle('open');
  $('#legendToggle').setAttribute('aria-expanded', open);
});

// 點選與滑過：先看是不是點到人物，再看台地
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const pickList = () => pickables.concat(peopleMeshes);
function pick(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(pickList(), false)[0];
  if (!hit) return null;
  const person = hit.object.userData.person;
  if (person) return { person, isl: person.userData.isl || hit.object.userData.isl };
  return { isl: hit.object.userData.isl };
}
let down = null, hovered = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  if (moved > 6) return;
  const h = pick(e);
  if (!h) { hideBubble(); return; }
  if (h.person) onPerson(h.person);
  else if (h.isl) openIsland(h.isl.id);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || down) return;
  const h = pick(e);
  const isl = h && !h.person ? h.isl : null;
  canvas.style.cursor = h ? 'pointer' : '';
  if (isl !== hovered) { hovered = isl; ISLANDS.forEach((i) => i.labelEl.classList.toggle('hover', i === isl)); }
});
canvas.addEventListener('pointerleave', () => { hovered = null; ISLANDS.forEach((i) => i.labelEl.classList.remove('hover')); });
controls.addEventListener('start', () => { fly = null; controls.enabled = true; hideHint(); });

// ───────────────────────── 對話泡泡
const bubble = $('#bubble');
let bubbleFor = null, bubbleTimer = 0;
function showBubble(personG, text, isl) {
  bubbleFor = personG;
  bubble.innerHTML = `<p>${text}</p>${isl && current !== isl ? `<button type="button" class="bgo">看「${isl.name}」→</button>` : ''}`;
  const go = bubble.querySelector('.bgo');
  if (go) go.addEventListener('click', () => openIsland(isl.id));
  bubble.hidden = false;
  bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
  bubbleTimer = 7;
}
function hideBubble() { bubble.hidden = true; bubbleFor = null; }
function onPerson(g) {
  if (g.userData.isGuide) { foundGuide(); return; }
  const w = g.userData.walker;
  if (w && w.kind === 'journey') {
    w.talk = 4;
    const moving = w.pause <= 0 && w.leg;
    const G = GRADES[w.grade].label;
    const text = moving
      ? `我是${G}學生，正走在三年學習旅程上：從 ${pad(w.from.id)}「${w.from.name}」走到 ${pad(w.at.id)}「${w.at.name}」。三年剛好走完一趟山徑。`
      : `我是${G}學生，正走在三年學習旅程上，現在在 ${pad(w.at.id)}「${w.at.name}」。三年剛好走完一趟山徑。`;
    showBubble(g, text, w.at);
    return;
  }
  if (w && w.kind === 'link') {
    w.talk = 4;
    const { A, B, cfg, link } = w;
    const ga = GRADES[A.g].label, gb = GRADES[B.g].label;
    const text = w.carrying
      ? `我是${w.roleName}，帶著「${cfg.item}」從${ga}的「${A.name}」走到${gb}的「${B.name}」。${link.t}。`
      : `我是${w.roleName}，剛把「${cfg.item}」帶到${gb}的「${B.name}」，正要回${ga}的「${A.name}」。${link.t}。`;
    showBubble(g, text, w.dir > 0 ? B : A);
    return;
  }
  showBubble(g, g.userData.say || '你好！', g.userData.isl);
}

// ───────────────────────── 找小嚮導
const gameEl = $('#game');
let game = null;
function fmtTime(sec) { const m = Math.floor(sec / 60), s2 = Math.floor(sec % 60); return `${m}:${String(s2).padStart(2, '0')}`; }
function startGame() {
  if (current) closePanel();
  closeList();
  if (pathMode) setPathMode(false);
  hideBubble();
  let spot;
  do { spot = GUIDE_SPOTS[Math.floor(Math.random() * GUIDE_SPOTS.length)]; } while (spot === guideSpot);
  placeGuide(spot);
  game = null;
  gameEl.innerHTML = `<div class="gtxt"><b>找小嚮導</b><span>穿黃衣、背藤簍、綁紅頭巾。準備好就開始！</span></div>
    <button type="button" class="pbtn gstart" id="gstart">開始尋找</button>
    <button type="button" class="pbtn" id="gclose0">取消</button>`;
  gameEl.hidden = false;
  document.body.classList.add('gaming');
  $('#gclose0').addEventListener('click', endGame);
  $('#gstart').addEventListener('click', beginSearch);
  const o = overview(); flyTo(o.pos, o.target);
  hideHint();
}
function beginSearch() {
  game = { t0: performance.now(), hint: false };
  gameEl.innerHTML = `<div class="gtxt"><b>找小嚮導</b><span>穿黃衣、背藤簍、綁紅頭巾。找到就點他！</span></div>
    <span class="gtime" id="gtime">0:00</span>
    <button type="button" class="pbtn" id="ghint">提示</button>
    <button type="button" class="pbtn" id="gquit">看答案</button>`;
  $('#ghint').addEventListener('click', () => {
    game.hint = true;
    $('#ghint').textContent = `在${GRADES[guideSpot.g].label}附近`;
    $('#ghint').disabled = true;
  });
  $('#gquit').addEventListener('click', () => revealGuide(false));
}
function revealGuide(found) {
  const sec = game ? (performance.now() - game.t0) / 1000 : 0;
  const target = guide.g.position.clone().add(new THREE.Vector3(0, 0.6, 0));
  const dir = camera.position.clone().sub(controls.target).normalize();
  flyTo(target.clone().addScaledVector(dir, 7), target);
  const near = guideSpot.isl || nearestIsland(guide.g.position);
  const nearBtn = `<button type="button" class="pbtn gstart" id="gnear">看看我旁邊的課程：${near.name}</button>`;
  gameEl.innerHTML = found
    ? `<div class="gtxt"><b>找到了！</b><span>你花了 ${fmtTime(sec)}${game && game.hint ? '（用了提示）' : ''}。</span></div>
       ${nearBtn}<button type="button" class="pbtn" id="gagain">再玩一次</button><button type="button" class="pbtn" id="gclose">結束</button>`
    : `<div class="gtxt"><b>小嚮導在這裡</b><span>下次再試試看！</span></div>
       ${nearBtn}<button type="button" class="pbtn" id="gagain">再玩一次</button><button type="button" class="pbtn" id="gclose">結束</button>`;
  $('#gnear').addEventListener('click', () => { gameEl.hidden = true; document.body.classList.remove('gaming'); hideBubble(); openIsland(near.id); });
  $('#gagain').addEventListener('click', startGame);
  $('#gclose').addEventListener('click', endGame);
  game = null;
  setTimeout(() => showBubble(guide.g, found ? '被你找到了！三年山徑，我陪大家一起走。' : '我在這裡！', guideSpot.isl), 900);
}
function nearestIsland(p) { let best = null, bd = Infinity; for (const isl of ISLANDS) { const d = Math.hypot(isl.x - p.x, isl.z - p.z); if (d < bd) { bd = d; best = isl; } } return best; }
function foundGuide() {
  if (game) { revealGuide(true); return; }
  showBubble(guide.g, '嗨，我是小嚮導！按右上角的「找小嚮導」，看看你多快能找到我。', null);
}
function endGame() {
  game = null; gameEl.hidden = true; document.body.classList.remove('gaming'); hideBubble();
  const o = overview(); flyTo(o.pos, o.target);
}
$('#findBtn').addEventListener('click', startGame);

// ───────────────────────── 年級快速定位
function goGrade(g) {
  if (current) closePanel();
  closeList();
  const isl = ISLANDS.filter((i) => i.g === g);
  const c = isl.reduce((a, i) => a.add(new THREE.Vector3(i.x, i.top, i.z)), new THREE.Vector3()).multiplyScalar(1 / isl.length);
  const span = Math.max(...isl.map((i) => Math.hypot(i.x - c.x, i.z - c.z)));
  const dist = (isNarrow() ? 3.4 : 2.0) * span + 9;
  const dir = new THREE.Vector3(0, 0.78, 0.62).normalize();
  flyTo(c.clone().addScaledVector(dir, dist), c);
  document.querySelectorAll('#gradeJump button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.g === g)));
  hideHint();
}
document.querySelectorAll('#gradeJump button').forEach((b) => b.addEventListener('click', () => goGrade(+b.dataset.g)));
controls.addEventListener('start', () => document.querySelectorAll('#gradeJump button').forEach((b) => b.setAttribute('aria-pressed', 'false')));

// ───────────────────────── 清單
const listPanel = $('#listPanel'), listBody = $('#listBody');
let listOpen = false, listMode = 'grade';
function renderList() {
  const groups = listMode === 'grade'
    ? [7, 8, 9].map((g) => ({ title: `${GRADES[g].label}・${GRADES[g].name}`, color: GRADES[g].c, items: ISLANDS.filter((i) => i.g === g) }))
    : Object.keys(DIMS).map((d) => ({ title: `${DIMS[d].name}（${DIMS[d].sub}）`, color: DIMS[d].c, desc: DIMS[d].desc, items: ISLANDS.filter((i) => i.d === d) }));
  listBody.innerHTML = groups.map((gr) => `
    <section class="lgroup"><h3 style="--c:${gr.color}">${gr.title}<span>${gr.items.length}</span></h3>${gr.desc ? `<p class="ldesc">${gr.desc}</p>` : ''}
    ${gr.items.map((i) => `<button type="button" class="lrow" data-go="${i.id}">
      <span class="num" style="--gc:${GRADES[i.g].c}">${pad(i.id)}</span>
      <span class="lname">${i.name}<small>${listMode === 'grade' ? DIMS[i.d].sub : GRADES[i.g].label}・${i.count} 項</small></span>
      <span class="ldot" style="--dc:${DIMS[i.d].c}"></span></button>`).join('')}
    </section>`).join('') + (listMode === 'grade' ? '' : `<p class="note ldnote">${DIM_NOTE}</p>`);
  listBody.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => openIsland(+b.dataset.go)));
  document.querySelectorAll('#listTabs button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === listMode));
}
function openList() {
  if (current) { current = null; panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); document.body.classList.remove('focused'); ISLANDS.forEach((i) => i.labelEl.classList.remove('dim', 'active')); showItemLabels(null); }
  renderList();
  listOpen = true;
  listPanel.classList.add('open'); listPanel.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(updateOffsetTarget);
  hideHint();
}
function closeList(silent) {
  if (!listOpen) return;
  listOpen = false;
  listPanel.classList.remove('open'); listPanel.setAttribute('aria-hidden', 'true');
  if (!silent) updateOffsetTarget();
}
$('#listBtn').addEventListener('click', () => (listOpen ? closeList() : openList()));
$('#listClose').addEventListener('click', () => closeList());
document.querySelectorAll('#listTabs button').forEach((b) => b.addEventListener('click', () => { listMode = b.dataset.mode; renderList(); }));

// ───────────────────────── 三年路徑模式
let pathMode = false;
const pathbar = $('#pathbar');
function setPathMode(on) {
  pathMode = on;
  $('#pathBtn').setAttribute('aria-pressed', on);
  document.body.classList.toggle('pathmode', on);
  pathbar.hidden = !on;
  if (on) {
    if (current) closePanel();
    closeList();
    playLinks();
    hideHint();
  } else {
    setLinksVisible((o) => current && (o.A === current || o.B === current));
    weaveObjs.forEach((w) => { w.on = false; });
    document.querySelectorAll('#weaveChips button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  }
}
function playLinks() {
  linkObjs.forEach((o) => { o.on = false; });
  setLinksVisible(() => true);
  const o = overview(); flyTo(o.pos, o.target);
}
$('#pathBtn').addEventListener('click', () => setPathMode(!pathMode));
$('#pathPlay').addEventListener('click', playLinks);
$('#pathClose').addEventListener('click', () => setPathMode(false));
$('#weaveChips').innerHTML = WEAVE.map((w, c) => `<button type="button" class="wchip" data-c="${c}" aria-pressed="false" style="--wc:${WEAVE_COLORS[c]}">${w}</button>`).join('');
document.querySelectorAll('#weaveChips button').forEach((b) => b.addEventListener('click', () => {
  const w = weaveObjs[+b.dataset.c];
  w.on = !w.on;
  if (w.on) w.prog = 0;
  b.setAttribute('aria-pressed', w.on);
  const onNames = weaveObjs.filter((x) => x.on).map((x) => `「${x.name}」`);
  $('#weaveNote').textContent = onNames.length ? `${onNames.join('、')}穿過七到九年級的 ${weaveObjs[0].n} 個主題。` : '';
}));

// ───────────────────────── 晝夜：依台灣時間變化，夜晚山徑點燈
// 山徑旁的燈籠（白天是木柱小燈，夜晚亮起）
const lanternMat = new THREE.MeshStandardMaterial({ color: '#f3d9a4', emissive: '#ffb347', emissiveIntensity: 0, flatShading: true, roughness: 0.6 });
lanternMat.userData.nightLamp = { day: 0, night: 2.2 };
{
  const postMat = new THREE.MeshStandardMaterial({ color: '#55402f', flatShading: true, roughness: 1 });
  const postGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.62, 5), lampGeo = new THREE.BoxGeometry(0.15, 0.17, 0.15), capGeo = new THREE.ConeGeometry(0.14, 0.09, 4);
  let n = 0;
  for (let k = 0; k < 40; k++) {
    const sP = 0.015 + (k / 40) * 0.97, p = TRAIL.getPointAt(sP), tg = TRAIL.getTangentAt(sP);
    const side = k % 2 ? 0.95 : -0.95, x = p.x - tg.z * side, z = p.z + tg.x * side;
    if (ISLANDS.some((i) => Math.hypot(x - i.x, z - i.z) < i.R + 0.5)) continue;
    const y = groundH(x, z);
    const g = new THREE.Group();
    const post = new THREE.Mesh(postGeo, postMat); post.position.y = 0.31; post.castShadow = true;
    const lamp = new THREE.Mesh(lampGeo, lanternMat); lamp.position.y = 0.68;
    const cap = new THREE.Mesh(capGeo, postMat); cap.position.y = 0.8; cap.rotation.y = Math.PI / 4;
    g.add(post, lamp, cap);
    if (n++ % 3 === 0) {
      const l = new THREE.PointLight('#ffb357', 0, 4.2, 1.5); l.position.y = 0.7;
      l.userData.nightLight = { day: 0, night: 3 };
      g.add(l);
    }
    g.position.set(x, y, z);
    scene.add(g);
  }
}
// 星星
const stars = (() => {
  const pts = [];
  for (let i = 0; i < 520; i++) {
    const a = hash(i, 31) * Math.PI * 2, e = 0.12 + hash(i, 47) * 1.2, r = 150;
    pts.push(Math.cos(a) * Math.cos(e) * r, 18 + Math.sin(e) * r * 0.6, Math.sin(a) * Math.cos(e) * r - 40);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const st = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#fdf6e0', size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(st); return st;
})();
const PHASES = {
  day:   { sky: ['#c9dce2', '#dde8e3', '#e4ebe4'], fog: '#e4ebe4', hs: '#f3f6ee', hg: '#8a8f6c', hi: 1.25, sc: '#fff1dc', si: 2.1, sp: [22, 38, 18], water: '#79aebb', cloud: '#ffffff' },
  dusk:  { sky: ['#e9a77c', '#f2cba3', '#e8d6c2'], fog: '#e6cdb5', hs: '#ffd8b0', hg: '#6d6670', hi: 0.95, sc: '#ffad6b', si: 1.4, sp: [40, 14, 6], water: '#7e92b4', cloud: '#f7d2b8' },
  night: { sky: ['#0e1830', '#1b2946', '#26354f'], fog: '#22314c', hs: '#a8b8e4', hg: '#4c5670', hi: 1.45, sc: '#cdd9f5', si: 1.1, sp: [-18, 38, 14], water: '#2f4f78', cloud: '#5a6681' }, // 夜晚：與主網站相同，月光加亮
};
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
const mixC = (a, b, t) => '#' + _c1.set(a).lerp(_c2.set(b), t).getHexString();
function mixPhase(a, b, t) {
  const A = PHASES[a], B = PHASES[b], o = {};
  for (const k of ['fog', 'hs', 'hg', 'sc', 'water', 'cloud']) o[k] = mixC(A[k], B[k], t);
  o.sky = A.sky.map((c, i) => mixC(c, B.sky[i], t));
  o.hi = A.hi + (B.hi - A.hi) * t; o.si = A.si + (B.si - A.si) * t;
  o.sp = A.sp.map((v, i) => v + (B.sp[i] - v) * t);
  o.night = (a === 'night' ? 1 - t : 0) + (b === 'night' ? t : 0);
  return o;
}
function phaseAt(h) {
  const ramp = (x, a, b) => Math.min(1, Math.max(0, (x - a) / (b - a)));
  if (h < 5 || h >= 19) return mixPhase('night', 'night', 0);
  if (h < 6) return mixPhase('night', 'dusk', ramp(h, 5, 6));
  if (h < 7) return mixPhase('dusk', 'day', ramp(h, 6, 7));
  if (h < 17) return mixPhase('day', 'day', 0);
  if (h < 18) return mixPhase('day', 'dusk', ramp(h, 17, 18));
  return mixPhase('dusk', 'night', ramp(h, 18, 19));
}
const nightThings = [];
scene.traverse((o) => {
  if (o.userData.nightLight) nightThings.push({ light: o, ...o.userData.nightLight });
  const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
  for (const m of ms) if (m.userData && m.userData.nightLamp && !nightThings.some((x) => x.mat === m)) nightThings.push({ mat: m, ...m.userData.nightLamp });
});
const skyEl = $('#sky');
function applyPhase(p) {
  skyEl.style.background = `linear-gradient(180deg, ${p.sky[0]} 0%, ${p.sky[1]} 45%, ${p.sky[2]} 100%)`;
  scene.fog.color.set(p.fog);
  hemi.color.set(p.hs); hemi.groundColor.set(p.hg); hemi.intensity = p.hi;
  sun.color.set(p.sc); sun.intensity = p.si; sun.position.set(...p.sp);
  water.material.color.set(p.water);
  for (const c of clouds) c.children.forEach((b) => b.material.color.set(p.cloud));
  stars.material.opacity = Math.max(0, p.night - 0.2) * 1.1;
  for (const n of nightThings) {
    const v = n.day + (n.night - n.day) * p.night;
    if (n.light) n.light.intensity = v; else n.mat.emissiveIntensity = v;
  }
  document.body.classList.toggle('is-night', p.night > 0.5);
}
const SUN_SVG = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
const MOON_SVG = '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>';
const TIME_MODES = ['auto', 'day', 'dusk', 'night'];
const TIME_LABEL = { auto: '依現在時間', day: '白天', dusk: '黃昏', night: '夜晚' };
let timeMode = 'auto';
{ const q = new URLSearchParams(location.search).get('time'); if (TIME_MODES.includes(q)) timeMode = q; }
function taipeiHour() {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    return (+parts.find((x) => x.type === 'hour').value % 24) + +parts.find((x) => x.type === 'minute').value / 60;
  } catch (e) { const d = new Date(); return d.getHours() + d.getMinutes() / 60; }
}
function updateTime() {
  const p = timeMode === 'auto' ? phaseAt(taipeiHour()) : mixPhase(timeMode, timeMode, 0);
  applyPhase(p);
  const btn = $('#timeBtn');
  if (btn) {
    btn.querySelector('svg').innerHTML = p.night > 0.5 ? MOON_SVG : SUN_SVG;
    btn.querySelector('span').textContent = TIME_LABEL[timeMode];
    btn.setAttribute('aria-label', `場景時間：${TIME_LABEL[timeMode]}（點選切換）`); btn.title = `場景時間：${TIME_LABEL[timeMode]}（點一下切換）`;
  }
}
updateTime();
setInterval(() => { if (timeMode === 'auto') updateTime(); }, 60000);
addEventListener('message', (e) => {
  if (e.source !== parent || !e.data || e.data.type !== 'sannian-time' || !TIME_MODES.includes(e.data.mode)) return;
  timeMode = e.data.mode; updateTime();
});
$('#timeBtn').addEventListener('click', () => { timeMode = TIME_MODES[(TIME_MODES.indexOf(timeMode) + 1) % TIME_MODES.length]; updateTime(); });

// ───────────────────────── 開場導覽
const TOUR = [
  { t: '歡迎來到三年山徑', p: '這是宜蘭縣立大同國中 115 學年度的泰雅文化課程地圖。21 座台地，就是學生從七年級到九年級會學到的 21 個課程主題。山徑的高低用來呈現七到九年級的課程順序，不代表文化價值的高低；三個年級的學習彼此連結。' },
  { t: '從田地走進部落，再走進山林', p: '山徑從山腳的七年級「燒墾生活」出發，經過山腰的八年級「gaga家庭與編織」，一路走到九年級「山林智慧」的高山森林。' },
  { t: '台地邊框的顏色是學習構面', p: '綠色是人與自然、橘色是人與社會、桃紅是人與他人、紫色是人與自己。每個年級都有這四個構面。每個主題依主要學習重點歸入一個構面，實際課程常跨越多個構面。' },
  { t: '點一座台地，走進課程', p: '台地上的小物件就是課程裡的細項。點台地可以看學習內容，以及它和其他年級怎麼銜接。' },
  { t: '山徑上的人都有任務', p: '有一位學生從 01 依序走到 21，每座台地停一下，走完就由新的一屆接手（畫面以白、紅、黑三種泰雅服色區分七、八、九年級）。部落耆老和學生則帶著竹材、苧麻、苧麻線等物品（頭上的小圖示），沿著年級之間的銜接往返。點他們，會說明帶著什麼、要走去哪裡。' },
  { t: '還有更多看法', cls: 'tools', p: '右上角的「清單」可以快速找課程，「三年路徑」會畫出年級之間的銜接線。也可以點畫面裡的人物聽他說話，或玩「找小嚮導」。太陽／月亮小按鈕可以切換白天、黃昏、夜晚，預設跟著台灣現在的時間，晚上山徑會點燈。之後想再看操作方式或這份說明，請點右上角的「？」。' },
];
const tourEl = $('#tour');
let tourOn = false, tourStep = 0;
function renderTour() {
  const st = TOUR[tourStep];
  $('#tourCount').textContent = `${tourStep + 1} / ${TOUR.length}`;
  $('#tourTitle').textContent = st.t;
  $('#tourText').textContent = (st.cls === 'tools' && isNarrow() ? '手機版的工具都收在右上角的「選單」裡。' : '') + st.p;
  $('#tourNext').textContent = tourStep === TOUR.length - 1 ? '開始探索' : '下一步 →';
  $('#tourDots').innerHTML = TOUR.map((_, i) => `<span class="${i === tourStep ? 'on' : ''}"></span>`).join('');
  document.body.classList.toggle('tour-legend', tourStep === 2);
  document.body.classList.toggle('tour-tools', st.cls === 'tools');
}
function startTour() {
  if (current) closePanel();
  closeList();
  closeHelp(); closeMenu();
  tourOn = true; tourStep = 0; tourEl.hidden = false; renderTour(); clearTimeout(hintTimer);
  $('#tourNext').focus();
}
function endTour() {
  tourOn = false; tourEl.hidden = true; hintLater(10000);
  document.body.classList.remove('tour-legend', 'tour-tools');
  try { localStorage.setItem('sannian-tour', '1'); } catch (e) {}
}
$('#tourNext').addEventListener('click', () => { if (tourStep < TOUR.length - 1) { tourStep++; renderTour(); } else endTour(); });
$('#tourSkip').addEventListener('click', endTour);
$('#tourOpen').addEventListener('click', () => { closeHelp(); startTour(); });
// 右上角「？」：操作方式小卡（與主網站一致）
const helpPop = $('#helpPop');
function openHelp() {
  closeMenu();
  helpPop.hidden = false; $('#helpBtn').setAttribute('aria-expanded', 'true');
  if (isNarrow()) { helpPop.style.right = helpPop.style.top = ''; }
  else { const b = $('#helpBtn').getBoundingClientRect(); helpPop.style.right = `${innerWidth - $('.tools').getBoundingClientRect().left + 10}px`; helpPop.style.top = `${Math.max(14, Math.min(b.top, innerHeight - helpPop.offsetHeight - 14))}px`; }
  $('#tourOpen').focus();
}
function closeHelp() { helpPop.hidden = true; $('#helpBtn').setAttribute('aria-expanded', 'false'); }
$('#helpBtn').addEventListener('click', () => (helpPop.hidden ? openHelp() : closeHelp()));
$('#helpClose').addEventListener('click', closeHelp);
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !helpPop.hidden) { closeHelp(); e.stopImmediatePropagation(); } }, true);
addEventListener('pointerdown', (e) => { if (!helpPop.hidden && !helpPop.contains(e.target) && !e.target.closest('#helpBtn')) closeHelp(); });
// 手機：工具收進「選單」，點了某項功能就收起（晝夜除外）
const toolsEl = $('.tools');
function closeMenu() { toolsEl.classList.remove('open'); $('#menuBtn').setAttribute('aria-expanded', 'false'); }
$('#menuBtn').addEventListener('click', () => { const o = !toolsEl.classList.contains('open'); toolsEl.classList.toggle('open', o); $('#menuBtn').setAttribute('aria-expanded', String(o)); });
$('#toolsList').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && b.id !== 'timeBtn' && isNarrow()) closeMenu(); });
addEventListener('pointerdown', (e) => { if (toolsEl.classList.contains('open') && !toolsEl.contains(e.target)) closeMenu(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && toolsEl.classList.contains('open')) { closeMenu(); e.stopImmediatePropagation(); } }, true);
hintLater(12000);
{
  let seen = false;
  try { seen = localStorage.getItem('sannian-tour') === '1'; } catch (e) {}
  if (!seen && !/^#i\d{2}$/.test(location.hash)) setTimeout(startTour, 2300);
}

// ───────────────────────── 迴圈
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  updateOffsetTarget();
  camera.updateProjectionMatrix();
}
addEventListener('resize', () => {
  resize();
  if (!current) { const o = overview(); camera.position.copy(o.pos); controls.target.copy(o.target); }
});
resize();
{
  const o = overview();
  camera.position.copy(o.pos).add(new THREE.Vector3(0, 8, 10));
  controls.target.copy(o.target);
  flyTo(o.pos, o.target, 2.2);
}

const clock = new THREE.Clock();
let first = true;
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (fly) {
    const k = Math.min(1, (performance.now() - fly.s) / fly.d), e = ease(k);
    camera.position.lerpVectors(fly.p0, fly.p1, e);
    controls.target.lerpVectors(fly.t0, fly.t1, e);
    if (k >= 1) { fly = null; controls.enabled = true; }
  }
  controls.target.x = Math.max(-24, Math.min(24, controls.target.x));
  controls.target.z = Math.max(-20, Math.min(16, controls.target.z));
  controls.target.y = Math.max(0, Math.min(10, controls.target.y));
  controls.update();

  // 畫面平移
  off.x += (off.tx - off.x) * Math.min(1, dt * 7);
  off.y += (off.ty - off.y) * Math.min(1, dt * 7);
  if (Math.abs(off.x) > 0.5 || Math.abs(off.y) > 0.5) camera.setViewOffset(innerWidth, innerHeight, off.x, off.y, innerWidth, innerHeight);
  else camera.clearViewOffset();

  // 台地浮起
  for (const isl of ISLANDS) {
    const want = isl === current ? 0.12 : isl === hovered ? 0.1 : 0;
    isl.lift += (want - isl.lift) * Math.min(1, dt * 8);
    isl.group.position.y = isl.lift;
  }

  // 造景動畫與步道行人
  if (!reduceMotion) for (const f of animated) f(t);
  for (const w of walkers) updateWalker(w, reduceMotion ? 0 : dt, t);
  if (!reduceMotion) updateGuide(t);

  // 銜接線：依序畫出，光點沿線流動
  for (const o of linkObjs) {
    if (o.on) {
      o.grp.visible = true;
      if (o.delay > 0) o.delay -= dt; else o.prog = Math.min(1, o.prog + dt * 1.6);
    } else { o.prog = Math.max(0, o.prog - dt * 3); if (o.prog === 0) o.grp.visible = false; }
    const pr = reduceMotion ? (o.on ? 1 : 0) : o.prog;
    o.tube.geometry.setDrawRange(0, Math.floor((o.count * pr) / 36) * 36);
    o.cone.visible = pr > 0.97;
    o.dot.visible = pr > 0.97;
    if (o.dot.visible) o.dot.position.copy(o.curve.getPoint((t * 0.35 + o.order * 0.013) % 1));
  }
  for (const w of weaveObjs) {
    if (w.on) { w.grp.visible = true; w.prog = Math.min(1, w.prog + dt * 0.7); }
    else { w.prog = Math.max(0, w.prog - dt * 2); if (w.prog === 0) w.grp.visible = false; }
    const pr = reduceMotion ? (w.on ? 1 : 0) : w.prog;
    w.tube.geometry.setDrawRange(0, Math.floor((w.count * pr) / 30) * 30);
    w.dots.forEach((d, k) => { const u = (t * 0.03 + k / w.dots.length) % 1; d.visible = u < pr; d.position.copy(w.curve.getPoint(u)); });
  }

  // 遊戲計時
  if (game) { const el = $('#gtime'); if (el) el.textContent = fmtTime((performance.now() - game.t0) / 1000); }

  // 雲與水
  for (const c of clouds) { c.position.x += c.userData.v * dt; if (c.position.x > 60) c.position.x = -60; }
  if (!reduceMotion) {
    const a = waterGeo.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const x = waterBase[i * 3], z = waterBase[i * 3 + 2];
      a.array[i * 3 + 1] = waterBase[i * 3 + 1] + Math.sin(x * 0.35 + t * 1.1) * 0.06 + Math.cos(z * 0.5 + t * 0.8) * 0.05;
    }
    a.needsUpdate = true; waterGeo.computeVertexNormals();
  }

  renderer.render(scene, camera);
  placeLabels();
  placeWalkerTags();
  if (bubbleFor) {
    bubbleTimer -= dt;
    if (bubbleTimer <= 0) hideBubble();
    else {
      const wp = new THREE.Vector3(0, bubbleFor.userData.headY + 0.12, 0);
      bubbleFor.localToWorld(wp);
      project(wp, tmp);
      bubble.style.transform = `translate(${tmp.x}px, ${tmp.y}px) translate(-50%, -100%)`;
      bubble.style.visibility = tmp.vis ? 'visible' : 'hidden';
    }
  }
  if (first) { first = false; document.body.classList.add('ready'); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// 網址帶 #i05 直接開啟該台地
const m = /^#i(\d{2})$/.exec(location.hash);
if (m) setTimeout(() => openIsland(+m[1], { fromHash: true }), 1400);
