import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import DATA from './data.json';
import { SCHOOL, ROUTES, ROUTE_GROUPS, RELATIONS, WALKERS } from './home.js';
import { makeRoleWalker, poseWalker, fadeIcon } from './roles.js';
import { SCENES } from './items.js';
import { createReader } from './reader.js';
import { createSearch, highlight } from './search.js';
import { createMusic } from './music.js';
import { makeBoar, makeMuntjac, makeMonkey, makeFlyingSquirrel, wander, sitter, glider } from './animals.js';
import { animated, buildItem, box, cyl, cone, ico, G, at, C, M, smallTree, plot, milletPlant, canvasTex, mesh } from './scenery.js';

const $ = (s, el = document) => el.querySelector(s);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isNarrow = () => innerWidth < 760;
const NUM = ['', '一', '二', '三', '四', '五', '六'];
const VALLEY_URL = 'valley/';

function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y) => vnoise(x, y) * 0.6 + vnoise(x * 2.1, y * 2.1) * 0.28 + vnoise(x * 4.3, y * 4.3) * 0.12;

// ───────────────────────── 資料
const DIMS = DATA.dims;
const INDS = [];
DIMS.forEach((d) => d.inds.forEach((i) => { i.dim = d; INDS.push(i); }));
const byCode = (c) => INDS.find((i) => i.code === c);
const dimName = (d) => d.title.replace(/^構面.　?/, '');

// ───────────────────────── 場景
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xdfe8e6, 70, 170);
const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 400);
const hemi = new THREE.HemisphereLight(0xf3f6ee, 0x7f8f84, 1.3);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, 2.0);
sun.position.set(26, 44, 22);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 5, far: 130 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

// 湖面
const waterGeo = new THREE.CircleGeometry(150, 90, 0, Math.PI * 2);
waterGeo.rotateX(-Math.PI / 2);
const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ color: '#7fb1ba', roughness: 0.3, metalness: 0.08, transparent: true, opacity: 0.93 }));
water.receiveShadow = true;
scene.add(water);
// 水波紋：浮動的淺色菱形
const ripples = [];
{
  const geo = new THREE.PlaneGeometry(0.9, 0.9); geo.rotateX(-Math.PI / 2); geo.rotateY(Math.PI / 4);
  const mat = new THREE.MeshBasicMaterial({ color: '#d9eef0', transparent: true, opacity: 0.35, depthWrite: false });
  for (let i = 0; i < 70; i++) {
    const a = hash(i, 3) * Math.PI * 2, r = 8 + hash(i, 7) * 34;
    const m = new THREE.Mesh(geo, mat);
    m.position.set(Math.cos(a) * r, 0.03, Math.sin(a) * r);
    m.scale.set(0.6 + hash(i, 1), 1, 0.25);
    m.userData.ph = hash(i, 9) * 6;
    ripples.push(m); scene.add(m);
  }
}

// 山脈環繞
{
  const geo = new THREE.PlaneGeometry(320, 320, 160, 160);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  const low = new THREE.Color('#9fb67e'), hi = new THREE.Color('#5d7f55'), rock = new THREE.Color('#8f9188'), sand = new THREE.Color('#cfc29c');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
    const n = fbm(x * 0.045 + 10, z * 0.045);
    const shore = 44 + n * 12;
    let h = r < shore ? -2 : Math.pow((r - shore) / 40, 1.3) * (14 + n * 30);
    if (z < 0) h *= 1.0 + Math.min(1, -z / 120) * 0.6;
    pos.setY(i, h);
    if (h < 0.6) c.copy(sand); else if (h < 12) c.copy(low).lerp(hi, h / 12); else c.copy(hi).lerp(rock, Math.min(1, (h - 12) / 20));
    c.offsetHSL(0, 0, hash(Math.round(x), Math.round(z)) * 0.05 - 0.025);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  m.receiveShadow = true;
  scene.add(m);
  // 岸邊樹林
  const pts = [];
  for (let i = 0; i < 900; i++) {
    const a = hash(i, 11) * Math.PI * 2, r = 48 + hash(i, 13) * 40;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const n = fbm(x * 0.045 + 10, z * 0.045), shore = 44 + n * 12;
    if (r < shore + 1.5) continue;
    let h = Math.pow((r - shore) / 40, 1.3) * (14 + n * 30); if (z < 0) h *= 1.0 + Math.min(1, -z / 120) * 0.6;
    if (h > 24) continue;
    pts.push({ x, z, h, s: 1.1 + hash(i, 17) * 0.9, r: hash(i, 19) });
  }
  const cone6 = new THREE.ConeGeometry(0.6, 1.8, 6); cone6.translate(0, 1.2, 0);
  const im = new THREE.InstancedMesh(cone6, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 }), pts.length);
  const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), cc = new THREE.Color();
  pts.forEach((p, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.r * 6); s.setScalar(p.s); v.set(p.x, p.h - 0.1, p.z); mm.compose(v, q, s); im.setMatrixAt(i, mm); cc.setHSL(0.27 + p.r * 0.06, 0.32, 0.26 + p.r * 0.1); im.setColorAt(i, cc); });
  scene.add(im);
}

// 雲
const clouds = [];
{
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1 });
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group(), n = 3 + (i % 3);
    for (let k = 0; k < n; k++) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 + hash(i, k) * 1.6, 0), mat);
      b.position.set(k * 2.2 - n * 1.1, hash(k, i) * 0.8, hash(i + k, 2) * 1.6);
      g.add(b);
    }
    const a = -2.6 + i * 0.35;
    g.position.set(Math.cos(a) * (70 + hash(i, 4) * 20), 24 + hash(i, 5) * 8, Math.sin(a) * (70 + hash(i, 4) * 20) - 10);
    g.userData.v = 0.3 + hash(i, 1) * 0.3;
    clouds.push(g); scene.add(g);
  }
}

// ───────────────────────── 紋樣材質
function diamondTexture(color, repeat = 6) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
  const x = cv.getContext('2d');
  x.fillStyle = color; x.fillRect(0, 0, 256, 128);
  x.fillStyle = 'rgba(0,0,0,.16)'; x.fillRect(0, 0, 256, 128);
  x.fillStyle = '#f7f1e6'; x.fillRect(0, 14, 256, 6); x.fillRect(0, 108, 256, 6);
  const dia = (cx, cy, r, fill) => { x.beginPath(); x.moveTo(cx, cy - r); x.lineTo(cx + r, cy); x.lineTo(cx, cy + r); x.lineTo(cx - r, cy); x.closePath(); x.fillStyle = fill; x.fill(); };
  dia(128, 64, 34, '#f7f1e6'); dia(128, 64, 24, '#2a1d17'); dia(128, 64, 14, color); dia(128, 64, 5, '#f7f1e6');
  for (const cx of [32, 224]) { dia(cx, 64, 18, '#2a1d17'); dia(cx, 64, 9, '#f7f1e6'); }
  for (const cx of [0, 256]) dia(cx, 64, 18, '#f7f1e6');
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(repeat, 1); t.anisotropy = 4;
  return t;
}
const capMat = new THREE.MeshStandardMaterial({ color: '#5b4a3c', roughness: 1 });
const grassMat = new THREE.MeshStandardMaterial({ color: '#b9c98a', flatShading: true, roughness: 1 });
const stoneMat = new THREE.MeshStandardMaterial({ color: '#8d877c', flatShading: true, roughness: 1 });
const plankMat = new THREE.MeshStandardMaterial({ color: '#9a7a58', flatShading: true, roughness: 1 });
const ropeMat = new THREE.MeshStandardMaterial({ color: '#6b5440', roughness: 1 });
const bushMat = new THREE.MeshStandardMaterial({ color: '#7fa25c', flatShading: true });

const pickables = [];
function tagPick(obj, ref) { obj.traverse((o) => { if (o.isMesh) { o.userData.ref = ref; pickables.push(o); } }); }

// 吊橋：a、b 為兩端（世界座標，y 為橋面高度）
const bridges = [];
function bridge(a, b, { width = 0.9, sag = 0.35 } = {}) {
  const g = new THREE.Group();
  const len = a.distanceTo(b), n = Math.max(4, Math.round(len / 0.42));
  const dir = new THREE.Vector3().subVectors(b, a).setY(0).normalize();
  const yaw = Math.atan2(dir.x, dir.z);
  const pt = (t) => { const p = new THREE.Vector3().lerpVectors(a, b, t); p.y -= Math.sin(Math.PI * t) * sag; return p; };
  const plankGeo = new THREE.BoxGeometry(width, 0.06, (len / n) * 0.82);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, p = pt(t), p2 = pt(Math.min(1, t + 0.01));
    const m = new THREE.Mesh(plankGeo, plankMat);
    m.position.copy(p); m.rotation.set(0, yaw, 0); m.rotateX(-Math.atan2(p2.y - p.y, (len * 0.01)));
    m.castShadow = true; m.receiveShadow = true; g.add(m);
  }
  const side = new THREE.Vector3(dir.z, 0, -dir.x);
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 16; i++) { const p = pt(i / 16); p.addScaledVector(side, s * width * 0.5); p.y += 0.45 - Math.sin(Math.PI * i / 16) * 0.05; pts.push(p); }
    const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.025, 4), ropeMat);
    g.add(rope);
    for (const e of [a, b]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.7, 5), ropeMat);
      post.position.copy(e).addScaledVector(side, s * width * 0.5); post.position.y += 0.2; post.castShadow = true; g.add(post);
    }
  }
  scene.add(g);
  const br = { a, b, pt, len, side };
  bridges.push(br);
  return br;
}

// ───────────────────────── 中央：學校島
const SCHOOL_R = 7.2, SCHOOL_TOP = 1.0;
const school = { R: SCHOOL_R, top: SCHOOL_TOP, lift: 0 };
{
  const root = new THREE.Group();
  const depth = SCHOOL_TOP + 2.5;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(SCHOOL_R * 0.98, SCHOOL_R * 0.9, depth, 8), [new THREE.MeshStandardMaterial({ map: diamondTexture('#be1e2d', 10), roughness: 0.9 }), capMat, capMat]);
  body.position.y = SCHOOL_TOP - 0.15 - depth / 2;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(SCHOOL_R, SCHOOL_R * 0.99, 0.2, 8), new THREE.MeshStandardMaterial({ color: '#be1e2d', flatShading: true }));
  rim.position.y = SCHOOL_TOP - 0.06;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(SCHOOL_R * 0.95, SCHOOL_R * 0.95, 0.12, 8), grassMat);
  top.position.y = SCHOOL_TOP + 0.06;
  for (const m of [body, rim, top]) { m.castShadow = m.receiveShadow = true; root.add(m); }
  const T = SCHOOL_TOP + 0.12;
  // 校舍
  const winTex = canvasTex('windows', 256, 96, (x, w, h) => {
    x.fillStyle = '#f2ede2'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#7fa6b8'; for (let r = 0; r < 2; r++) for (let i = 0; i < 9; i++) x.fillRect(10 + i * 27, 12 + r * 44, 18, 26);
    x.fillStyle = '#be1e2d'; x.fillRect(0, 44, w, 4);
  });
  const bmat = new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.9 }), wmat = M('#ece6da');
  const bld = mesh(new THREE.BoxGeometry(5.2, 1.7, 1.4), [wmat, wmat, M('#8a8580'), wmat, bmat, wmat], -0.6, T + 0.85, -3.6);
  const roof = mesh(new THREE.BoxGeometry(5.5, 0.14, 1.7), M('#5b6670'), -0.6, T + 1.77, -3.6);
  root.add(bld, roof);
  // 夜晚亮燈：窗戶發光（白天不發光）
  const glowTex = canvasTex('windowsGlow', 256, 96, (x, w, h) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#ffd98a'; for (let r = 0; r < 2; r++) for (let i = 0; i < 9; i++) if ((i * 7 + r * 3) % 5 !== 0) x.fillRect(10 + i * 27, 12 + r * 44, 18, 26);
  });
  bmat.emissive = new THREE.Color('#ffcf7a'); bmat.emissiveMap = glowTex; bmat.emissiveIntensity = 0; bmat.userData.nightLamp = { day: 0, night: 1.4 };
  // 傳統建築群與小米園
  const add = (name, x, z, ry, s) => { const { obj } = buildItem(name, '#888'); root.add(at(obj, x, T, z, ry, s)); };
  add('家屋', 3.6, -1.6, -0.5, 2.0);
  add('穀倉', 5.0, 1.25, -0.3, 1.8);
  add('瞭望台', -4.4, -0.8, 0.4, 1.5);
  const field = at(plot(2.2, 1.8), 2.0, T, 2.6, 0.1, 1); // 小米田（中間留出往構面五的步道）
  for (let i = 0; i < 24; i++) field.add(milletPlant(-0.95 + (i % 8) * 0.27, -0.6 + Math.floor(i / 8) * 0.55, 0.42));
  root.add(field);
  // 旗桿與升旗台
  root.add(box(0.9, 0.2, 0.9, '#cfc6b6', -0.8, T, -1.4), cyl(0.04, 0.05, 3.2, '#d8d8d8', -0.8, T + 0.2, -1.4, 6));
  const flagM = box(0.9, 0.55, 0.03, M('#be1e2d'), 0, 0, 0); flagM.geometry.translate(0.45, 0, 0); flagM.position.set(-0.76, T + 3.0, -1.4); root.add(flagM);
  animated.push((t) => { flagM.rotation.y = Math.sin(t * 1.8) * 0.3; });
  // 樹
  const schoolTrees = [];
  // 樹：沿著島緣分散在學校周邊，避開吊橋步道與建物（角度以構面方向為準：0° 為構面二）
  [[-90, 6.0, 1.5], [-30, 6.1, 1.5], [-14, 6.3, 1.4], [36, 6.2, 1.5], [88, 6.0, 1.4], [148, 6.0, 1.15], [166, 6.3, 1.0], [-72, 6.25, 1.3]].forEach(([deg, r, sc], i) => {
    const a = (deg * Math.PI) / 180;
    const h = 1.2 + hash(i, 2) * 0.55;
    root.add(at(smallTree(h, i % 2 ? '#6f9a4f' : '#5f8a48'), Math.sin(a) * r, T, -Math.cos(a) * r, i, sc));
    schoolTrees.push({ x: Math.sin(a) * r, z: -Math.cos(a) * r, y: T + h * 0.62 * sc, rad: h * 0.32 * sc });
  });
  tagPick(root, { type: 'school' });
  // 獨立山與三年山徑：學校旁的獨立山，山徑從山腳的步道口繞山而上
  const MX = -2.35, MZ = 4.07, MR = 2.05, MH = 3.3;
  const mountain = G();
  {
    const geo = new THREE.ConeGeometry(MR, MH, 10, 5);
    geo.translate(0, MH / 2, 0);
    const pos = geo.attributes.position, col = [];
    const cLow = new THREE.Color('#86a85e'), cMid = new THREE.Color('#5f8a48'), cTop = new THREE.Color('#8f8a7c'), c = new THREE.Color();
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
      if (y > 0.01 && y < MH - 0.01) {
        const j = (hash(Math.round(x * 50), Math.round(z * 50)) - 0.5) * 0.16;
        pos.setXYZ(k, x * (1 + j), y + j * 0.6, z * (1 + j));
      }
      const t = pos.getY(k) / MH;
      if (t < 0.55) c.copy(cLow).lerp(cMid, t / 0.55); else c.copy(cMid).lerp(cTop, (t - 0.55) / 0.45);
      col.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const m = mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
    mountain.add(m);
    // 繞山而上的山徑（像獨立山的螺旋步道）
    const stoneM = M('#d8c39a');
    const N = 46, turns = 2.15, a0 = 2.75;
    for (let k = 0; k < N; k++) {
      const u = k / (N - 1), ang = a0 + u * turns * Math.PI * 2;
      const h = 0.06 + u * (MH - 0.75);
      const r = MR * (1 - h / MH) + 0.04;
      const st = box(0.3, 0.035, 0.18, stoneM, Math.cos(ang) * r, h - 0.02, Math.sin(ang) * r);
      st.rotation.y = -ang - Math.PI / 2; st.castShadow = false;
      mountain.add(st);
    }
    // 山徑小燈：夜晚沿著山徑亮起
    const lampM = new THREE.MeshStandardMaterial({ color: '#f3d9a4', emissive: '#ffb347', emissiveIntensity: 0, flatShading: true });
    lampM.userData.nightLamp = { day: 0, night: 2.4 };
    for (let k = 3; k < N; k += 6) {
      const u = k / (N - 1), ang = a0 + u * turns * Math.PI * 2, h = 0.06 + u * (MH - 0.75), r = MR * (1 - h / MH) + 0.2;
      mountain.add(cyl(0.012, 0.012, 0.16, C.woodD, Math.cos(ang) * r, h, Math.sin(ang) * r, 4), box(0.07, 0.07, 0.07, lampM, Math.cos(ang) * r, h + 0.17, Math.sin(ang) * r));
    }
    // 山腰幾棵小樹、山頂小石堆
    [[0.6, 0.35], [2.1, 0.3], [3.6, 0.38], [5.0, 0.28], [1.3, 0.55], [4.3, 0.52]].forEach(([ang, hh], k) => {
      const h = hh * MH, r = MR * (1 - h / MH) - 0.05;
      mountain.add(at(smallTree(0.5 + hash(k, 9) * 0.2, k % 2 ? '#4f7a3d' : '#5f8a48'), Math.cos(ang) * r, h - 0.05, Math.sin(ang) * r, k, 1));
    });
    mountain.add(at(ico(0.16, C.stone), 0, MH - 0.08, 0), at(ico(0.1, C.stone), 0.1, MH + 0.05, 0.05));
  }
  // 獨立山山頂的台灣獼猴
  const monkey = makeMonkey();
  monkey.g.position.set(-0.04, MH + 0.04, 0.02); monkey.g.rotation.y = -0.3;
  mountain.add(monkey.g);
  animated.push(sitter(monkey, { scale: 1.5 }));
  at(mountain, MX, T - 0.02, MZ, 0.3, 1);
  mountain.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  tagPick(mountain, { type: 'valley' });
  root.add(mountain);
  // 步道口告示牌
  const signTex = canvasTex('valleySign', 160, 96, (x, w, h) => {
    x.fillStyle = '#6a4432'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#fffdf8'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.fillText('三年山徑', 80, 44);
    x.font = '22px sans-serif'; x.fillText('泰雅文化課程 ➜', 80, 78);
  });
  const sign = G(cyl(0.05, 0.06, 1.3, C.woodD, -0.55, 0, 0, 5), cyl(0.05, 0.06, 1.3, C.woodD, 0.55, 0, 0, 5),
    mesh(new THREE.BoxGeometry(1.5, 0.9, 0.06), [M(C.wood), M(C.wood), M(C.wood), M(C.wood), new THREE.MeshStandardMaterial({ map: signTex }), M(C.wood)], 0, 1.35, 0));
  at(sign, -4.55, T, 4.55, 0.25, 0.8);
  const trail = G();
  for (let i = 0; i < 4; i++) trail.add(at(box(0.42, 0.04, 0.28, '#c9b28a', 0, 0, 0), -4.15 + i * 0.12, T, 4.15 - i * 0.02 + (i % 2) * 0.04, 0.9));
  root.add(trail);
  tagPick(sign, { type: 'valley' });
  root.add(sign);
  // 小動物：小米田旁的山豬、校舍後方的山羌、在兩棵樹之間滑翔的飛鼠（數量少，只做點綴）
  const flat = () => T;
  const boar = makeBoar(); root.add(boar.g);
  animated.push(wander(boar, { cx: 3.2, cz: 4.5, r: 0.3, ground: flat, speed: 0.3, scale: 1.6 }));
  const muntjac = makeMuntjac(); root.add(muntjac.g);
  animated.push(wander(muntjac, { cx: -1.2, cz: -5.15, r: 0.5, ground: flat, speed: 0.28, scale: 1.3 }));
  {
    const [t1, t2] = [schoolTrees[0], schoolTrees[1]]; // -90° 與 -30° 兩棵樹
    const perch = (a, b) => { const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz); return new THREE.Vector3(a.x + (dx / L) * a.rad * 0.9, a.y - a.rad * 0.2, a.z + (dz / L) * a.rad * 0.9); };
    const fs = makeFlyingSquirrel(); root.add(fs.g);
    animated.push(glider(fs, { A: perch(t1, t2), B: perch(t2, t1), scale: 1.8, period: 13, sag: 0.9 }));
  }
  school.group = root; school.signPos = new THREE.Vector3(MX, T + MH + 0.55, MZ);
  school.labelPos = new THREE.Vector3(-0.6, T + 2.6, -3.6);
  scene.add(root);
}

// ───────────────────────── 六構面群島
// 平台位置：[相對構面方向的角度, 與構面小島的距離]（已檢查平台之間至少留 0.6 的水面）
const RING = 15, SPREAD = { 2: [[-40, 5.0], [40, 5.0]], 3: [[-62, 5.0], [0, 5.6], [62, 5.0]], 4: [[-84, 5.1], [-29, 6.7], [29, 6.7], [84, 5.1]] }, PLAT_R = 2.4, PLAT_TOP = 1.55, HUB_R = 1.7, HUB_TOP = 0.75;
const dimAngle = (n) => ((-60 + (n - 1) * 60) * Math.PI) / 180;
const polar = (a, r) => new THREE.Vector3(Math.sin(a) * r, 0, -Math.cos(a) * r);
const walkers = [];

function bannerTexture(d) {
  return canvasTex('banner' + d.n, 64, 160, (x, w, h) => {
    x.fillStyle = d.c; x.fillRect(0, 0, w, h);
    const dia = (cx, cy, r, fill) => { x.beginPath(); x.moveTo(cx, cy - r); x.lineTo(cx + r, cy); x.lineTo(cx, cy + r); x.lineTo(cx - r, cy); x.closePath(); x.fillStyle = fill; x.fill(); };
    x.fillStyle = '#fffdf8'; x.fillRect(6, 0, 4, h); x.fillRect(w - 10, 0, 4, h);
    for (let i = 0; i < 3; i++) { dia(32, 30 + i * 50, 18, '#fffdf8'); dia(32, 30 + i * 50, 11, '#2a1d17'); dia(32, 30 + i * 50, 5, d.c); }
  });
}

for (const d of DIMS) {
  const a = dimAngle(d.n);
  d.angle = a;
  d.hub = polar(a, RING);
  // 中心小島：構面旗座
  const hub = new THREE.Group(); hub.position.copy(d.hub);
  const hb = new THREE.Mesh(new THREE.CylinderGeometry(HUB_R, HUB_R * 0.85, HUB_TOP + 2.2, 7), [stoneMat, capMat, capMat]);
  hb.position.y = HUB_TOP - (HUB_TOP + 2.2) / 2;
  const hr = new THREE.Mesh(new THREE.CylinderGeometry(HUB_R * 1.02, HUB_R * 1.02, 0.16, 7), M(d.c)); hr.position.y = HUB_TOP;
  hub.add(hb, hr);
  const wt = parseInt(d.weight, 10);
  const poleH = 2.6 + wt * 0.06;
  const pole = cyl(0.07, 0.09, poleH, C.woodD, 0, HUB_TOP, 0, 6);
  const ban = mesh(new THREE.PlaneGeometry(0.75, 1.9), new THREE.MeshStandardMaterial({ map: bannerTexture(d), side: THREE.DoubleSide, roughness: 1 }), 0.42, HUB_TOP + poleH - 1.05, 0);
  const bar = cyl(0.03, 0.03, 0.9, C.woodD, 0, 0, 0, 5); bar.rotation.z = Math.PI / 2; bar.position.set(0.42, HUB_TOP + poleH - 0.08, 0);
  const banG = G(ban, bar); banG.rotation.y = -a + Math.PI;
  hub.add(pole, banG, at(ico(0.13, d.c), 0, HUB_TOP + poleH + 0.08, 0));
  const off = d.n;
  animated.push((t) => { ban.rotation.y = Math.sin(t * 1.3 + off) * 0.18; });
  hb.castShadow = hb.receiveShadow = true;
  tagPick(hub, { type: 'dim', d });
  scene.add(hub);
  d.group = hub; d.lift = 0;
  d.labelPos = d.hub.clone().setY(HUB_TOP + poleH * 0.55);
  // 主橋：學校 ↔ 構面小島
  const inA = polar(a, SCHOOL_R * 0.93).setY(SCHOOL_TOP + 0.12), inB = polar(a, RING - HUB_R * 0.9).setY(HUB_TOP + 0.08);
  const br = bridge(inA, inB, { width: 1.0, sag: 0.4 });
  // 指標平台
  const sp = SPREAD[d.inds.length];
  d.inds.forEach((ind, k) => {
    const pa = a + (sp[k][0] * Math.PI) / 180;
    const pos = d.hub.clone().add(polar(pa, sp[k][1]));
    ind.pos = pos; ind.R = PLAT_R; ind.top = PLAT_TOP + hash(d.n, k) * 0.35;
    const root = new THREE.Group(); root.position.copy(pos);
    const hex = new THREE.Group(); hex.rotation.y = hash(k, d.n) * 1.0;
    const T = ind.top, depth = T + 2.4;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(PLAT_R * 0.97, PLAT_R * 0.84, depth, 6), [new THREE.MeshStandardMaterial({ map: diamondTexture(d.c), roughness: 0.9 }), capMat, capMat]);
    body.position.y = T - 0.15 - depth / 2;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(PLAT_R, PLAT_R * 0.98, 0.18, 6), M(d.c)); rim.position.y = T - 0.06;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(PLAT_R * 0.93, PLAT_R * 0.93, 0.12, 6), grassMat); top.position.y = T + 0.06;
    for (const m of [body, rim, top]) { m.castShadow = m.receiveShadow = true; hex.add(m); }
    root.add(hex);
    const scn = SCENES[ind.code]();
    scn.position.y = T + 0.12;
    scn.rotation.y = (hash(d.n * 3, k) - 0.5) * 0.4;
    root.add(scn);
    for (let j = 0; j < 3; j++) {
      const ba = j * 2.1 + d.n + k;
      const bsh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2 + hash(d.n, j + k) * 0.1, 0), bushMat);
      bsh.position.set(Math.cos(ba) * PLAT_R * 0.82, T + 0.2, Math.sin(ba) * PLAT_R * 0.82); bsh.castShadow = true; root.add(bsh);
    }
    tagPick(root, { type: 'ind', ind });
    scene.add(root);
    ind.group = root; ind.lift = 0;
    // 量出造景高度，標籤放在上方
    const bb = new THREE.Box3(); scn.updateMatrixWorld(true); root.updateMatrixWorld(true);
    scn.children.forEach((c) => { if (!c.userData.noLabelBox) bb.expandByObject(c); }); // 月亮等飄在空中的物件不計入標籤高度
    ind.labelPos = new THREE.Vector3(pos.x, Math.min(bb.max.y, T + 3.2) + 0.35, pos.z);
    // 橋：構面小島 ↔ 平台
    const dirv = new THREE.Vector3().subVectors(pos, d.hub).setY(0).normalize();
    const e1 = d.hub.clone().addScaledVector(dirv, HUB_R * 0.9).setY(HUB_TOP + 0.08);
    const e2 = pos.clone().addScaledVector(dirv, -PLAT_R * 0.86).setY(T + 0.12);
    ind.br = bridge(e1, e2, { width: 0.8, sag: 0.18 });
    ind.spot = pos.clone().addScaledVector(dirv, -PLAT_R * 0.5).setY(T + 0.12);
  });
  d.br = br;
  // 行人（在 DIMS 迴圈結束後統一建立）
}

// ───────────────────────── 燈籠（夜晚點亮）
const lanternMat = new THREE.MeshStandardMaterial({ color: '#f3d9a4', emissive: '#ffb347', emissiveIntensity: 0, roughness: 0.6 });
lanternMat.userData.nightLamp = { day: 0, night: 2.2 };
function lantern(pos, withLight) {
  const g = new THREE.Group(); g.position.copy(pos);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.1, 5), M(C.woodD)); post.position.y = 0.55; post.castShadow = true;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.04), M(C.woodD)); arm.position.set(0.12, 1.08, 0);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.22, 8), lanternMat); lamp.position.set(0.24, 0.93, 0);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.1, 8), M('#2a211b')); cap.position.set(0.24, 1.08, 0);
  g.add(post, arm, lamp, cap);
  if (withLight) { const l = new THREE.PointLight(0xffb45a, 0, 7, 2); l.position.set(0.24, 0.95, 0); l.userData.nightLight = { day: 0, night: 7, dist: 7 }; g.add(l); }
  scene.add(g);
}
for (const d of DIMS) {
  lantern(d.hub.clone().add(polar(d.angle + 0.9, HUB_R * 0.72)).setY(HUB_TOP), true);
  lantern(polar(d.angle + 0.18, SCHOOL_R * 0.86).setY(SCHOOL_TOP + 0.12), false);
}
// 星星
const stars = (() => {
  const n = 500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = hash(i, 31) * Math.PI * 2, e = 0.12 + hash(i, 37) * 1.2, r = 190; pos.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: '#fff7e0', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(p); return p;
})();

// ───────────────────────── 日夜：依台灣時間變化（白天、黃昏、夜晚），也可手動切換
const PHASES = {
  day:   { sky: ['#c6dbe2', '#dbe7e4', '#dfe8e6'], fog: '#dfe8e6', hs: '#f3f6ee', hg: '#7f8f84', hi: 1.3, sc: '#fff1dc', si: 2.0, sp: [26, 44, 22], water: '#7fb1ba', cloud: '#ffffff' },
  dusk:  { sky: ['#e9a77c', '#f2cba3', '#e8d6c2'], fog: '#e6cdb5', hs: '#ffd8b0', hg: '#6d6670', hi: 1.0, sc: '#ffad6b', si: 1.35, sp: [44, 16, 10], water: '#7e92b4', cloud: '#f7d2b8' },
  night: { sky: ['#0e1830', '#1b2946', '#26354f'], fog: '#22314c', hs: '#7083b8', hg: '#1c2029', hi: 0.55, sc: '#a9bde8', si: 0.35, sp: [-20, 40, -18], water: '#2c4660', cloud: '#5a6681' },
};
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
const mixC = (a, b, t) => _c1.set(a).lerp(_c2.set(b), t).getHexString();
function mixPhase(a, b, t) {
  const A = PHASES[a], B = PHASES[b], o = {};
  for (const k of ['fog', 'hs', 'hg', 'sc', 'water', 'cloud']) o[k] = '#' + mixC(A[k], B[k], t);
  o.sky = A.sky.map((c, i) => '#' + mixC(c, B.sky[i], t));
  o.hi = A.hi + (B.hi - A.hi) * t; o.si = A.si + (B.si - A.si) * t;
  o.sp = A.sp.map((v, i) => v + (B.sp[i] - v) * t);
  o.night = (a === 'night' ? 1 - t : 0) + (b === 'night' ? t : 0);
  return o;
}
function phaseAt(h) { // h：0–24 小時
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
  const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
  for (const m of mats) if (m.userData && m.userData.nightLamp && !nightThings.some((x) => x.mat === m)) nightThings.push({ mat: m, ...m.userData.nightLamp });
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
    const h = +parts.find((x) => x.type === 'hour').value % 24, m = +parts.find((x) => x.type === 'minute').value;
    return h + m / 60;
  } catch (e) { const d = new Date(); return d.getHours() + d.getMinutes() / 60; }
}
function sendValleyTime() {
  const f = document.getElementById('valleyFrame');
  try { if (f && f.src && f.contentWindow) f.contentWindow.postMessage({ type: 'sannian-time', mode: timeMode }, '*'); } catch (e) {}
}
function updateTime() {
  const p = timeMode === 'auto' ? phaseAt(taipeiHour()) : mixPhase(timeMode, timeMode, 0);
  applyPhase(p);
  const btn = $('#timeBtn');
  if (btn) { btn.querySelector('svg').innerHTML = p.night > 0.5 ? MOON_SVG : SUN_SVG; btn.querySelector('span').textContent = TIME_LABEL[timeMode]; btn.setAttribute('aria-label', `場景時間：${TIME_LABEL[timeMode]}（點選切換）`); }
}
updateTime();
setInterval(() => { if (timeMode === 'auto') updateTime(); }, 60000);
$('#timeBtn').addEventListener('click', () => { timeMode = TIME_MODES[(TIME_MODES.indexOf(timeMode) + 1) % TIME_MODES.length]; updateTime(); sendValleyTime(); });

// ───────────────────────── 行人：每個人都有任務
// 1. 關聯行人：沿著「相關指標」的關聯，拿著佐證物品在兩座指標平台之間往返（WALKERS，取自 RELATIONS）
// 2. 小嚮導：依 1-1 → 6-3 的順序走訪 17 座平台，每站停一下
// 路線：平台 → 吊橋 → 構面小島（繞過旗桿）→ 主橋 → 學校島步道（避開建物、小米田與獨立山）→ 另一個構面
function bridgePts(br, rev) { const pts = []; for (let i = 0; i <= 24; i++) pts.push(br.pt(rev ? 1 - i / 24 : i / 24)); return pts; }
function makeLeg(pts) {
  const clean = [pts[0]];
  for (let i = 1; i < pts.length; i++) if (pts[i].distanceTo(clean[clean.length - 1]) > 1e-4) clean.push(pts[i]);
  const cum = [0];
  for (let i = 1; i < clean.length; i++) cum.push(cum[i - 1] + clean[i].distanceTo(clean[i - 1]));
  return { pts: clean, cum, len: cum[cum.length - 1] };
}
function legAt(leg, s, out) {
  let lo = 1, hi = leg.cum.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (leg.cum[m] < s) lo = m + 1; else hi = m; }
  const i = lo, k = (s - leg.cum[i - 1]) / Math.max(1e-6, leg.cum[i] - leg.cum[i - 1]);
  return out.lerpVectors(leg.pts[i - 1], leg.pts[i], Math.min(1, Math.max(0, k)));
}
const ST = SCHOOL_TOP + 0.12, HT = HUB_TOP + 0.08;
const CP = new THREE.Vector3(0.6, ST, 0.3); // 學校島中央的會合點
// 各構面主橋到會合點之間的步道轉折點（避開校舍、升旗台、家屋、穀倉、小米田、獨立山與燈籠）
const SPOKES = { 1: [[-1.6, -0.3]], 2: [[2.3, -2.0], [2.45, -4.8], [0.6, -5.3]], 3: [[2.3, -2.0], [3.2, -3.0], [4.6, -3.2]], 4: [[3.0, 0.6], [3.95, 1.2], [4.05, 2.6]], 5: [[0.3, 1.2]], 6: [[-1.2, 0.3]] };
const spoke = (d) => SPOKES[d.n].map(([x, z]) => new THREE.Vector3(x, ST, z));
// 在構面小島上繞過中央旗桿：從 from 往內走到半徑 0.75 的圓，沿短弧走到 to 的方向再走出去
function hubArc(d, from, to) {
  const c = d.hub, a0 = Math.atan2(from.z - c.z, from.x - c.x), a1 = Math.atan2(to.z - c.z, to.x - c.x);
  let da = a1 - a0; da = Math.atan2(Math.sin(da), Math.cos(da));
  const n = Math.max(2, Math.ceil(Math.abs(da) / 0.3)), pts = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (da * i) / n; pts.push(new THREE.Vector3(c.x + Math.cos(a) * 0.75, HT, c.z + Math.sin(a) * 0.75)); }
  return pts;
}
// 從平台 A 走到平台 B 的完整路線
function routeBetween(A, B) {
  const dA = A.dim, dB = B.dim;
  const pts = [A.spot.clone(), ...bridgePts(A.br, true)];
  if (dA === dB) pts.push(...hubArc(dA, A.br.pt(0), B.br.pt(0)));
  else {
    pts.push(...hubArc(dA, A.br.pt(0), dA.br.pt(1)), ...bridgePts(dA.br, true), ...spoke(dA).reverse(), CP.clone(), ...spoke(dB), ...bridgePts(dB.br, false));
    pts.push(...hubArc(dB, dB.br.pt(1), B.br.pt(0)));
  }
  pts.push(...bridgePts(B.br, false), B.spot.clone());
  return makeLeg(pts);
}
WALKERS.forEach((cfg, i) => {
  const A = byCode(cfg.a), B = byCode(cfg.b);
  const rel = RELATIONS.find((r) => r.a === cfg.a && r.b === cfg.b);
  const wk = makeRoleWalker(cfg.role, { prop: cfg.prop, icon: cfg.icon, ring: B.dim.c });
  wk.g.scale.setScalar(1.5);
  scene.add(wk.g);
  const leg = routeBetween(A, B);
  const w = Object.assign(wk, { kind: 'rel', cfg, rel, A, B, leg, dir: 1, s: 0, pause: 0, phase: hash(i, 5) * 6, look: 0, talk: 0,
    lat: ((i % 5) - 2) * 0.075, vmax: 0.95 + hash(i, 3) * 0.3, vis: 1 });
  // 起點分散：有的在路上、有的剛出發
  w.s = leg.len * hash(i, 11) * 0.9; w.dir = hash(i, 13) > 0.35 ? 1 : -1;
  w.setCarry(w.dir > 0 || !!cfg.both);
  addWalkerHit(w);
  walkers.push(w);
});
// 小嚮導：依序走訪 17 座指標平台
const guide = (() => {
  const wk = makeRoleWalker('guide');
  wk.g.scale.setScalar(1.6);
  scene.add(wk.g);
  const w = Object.assign(wk, { kind: 'guide', k: 0, leg: null, dir: 1, s: 0, pause: 3, phase: 0, look: 0, talk: 0, lat: 0, vmax: 1.15, vis: 1 });
  w.at = INDS[0]; w.g.position.copy(w.at.spot);
  addWalkerHit(w);
  walkers.push(w);
  return w;
})();
function addWalkerHit(w) {
  // 放大點擊範圍：看不見的圓柱，讓小小的人也點得到
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.0, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.5; w.g.add(hit);
  tagPick(w.g, { type: 'walker', w });
}
const _p = new THREE.Vector3(), _q = new THREE.Vector3();
const wrapAng = (a) => ((((a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
// 開啟某個指標時，只留下與它有關的行人（和小嚮導）
function walkerRelevant(w) {
  if (!opts.walkers) return false;
  if (relFocus !== null && !current) return w.kind !== 'guide' && w.rel === RELATIONS[relFocus];
  if (!current || current.type !== 'ind' || w.kind === 'guide') return true;
  return w.cfg.a === current.key || w.cfg.b === current.key;
}
function arrive(w) {
  if (w.kind === 'guide') { w.pause = 4.5; w.look = 0; return; }
  w.pause = 2; w.look = 0;
  // 送達：到 B 交出物品；回到 A 再拿起下一份（雙向往返的回饋問卷一直帶著）
  if (!w.cfg.both) w.setCarry(w.dir < 0);
}
function updateWalker(w, dt, t) {
  if (opts.icons) fadeIcon(w, camera, 30, 46); else if (w.icon) w.icon.visible = false;
  // 淡入淡出（只顯示和目前指標有關的人）
  const wantV = walkerRelevant(w) ? 1 : 0;
  w.vis += (wantV - w.vis) * Math.min(1, dt * 6 || 1);
  w.g.visible = w.vis > 0.03; w.g.scale.setScalar((w.kind === 'guide' ? 1.6 : 1.5) * (0.4 + 0.6 * w.vis));
  // 對話中：停下來轉向鏡頭
  if (w.talk > 0) {
    w.talk -= dt;
    const yaw = Math.atan2(camera.position.x - w.g.position.x, camera.position.z - w.g.position.z);
    w.g.rotation.y += wrapAng(yaw - w.g.rotation.y) * Math.min(1, dt * 5);
    poseWalker(w, 0, 0); w.head.rotation.y *= 0.9;
    if (!w.carrying || w.shoulder) w.armR.rotation.z = -0.6 - Math.abs(Math.sin(t * 6)) * 0.5; // 揮手
    return;
  }
  if (w.pause > 0) {
    w.pause -= dt; w.look += dt;
    w.head.rotation.y = Math.sin(w.look * 0.9) * 0.6; // 左右張望
    poseWalker(w, 0, 0);
    if (w.pause <= 0) {
      w.head.rotation.y = 0;
      if (w.kind === 'guide') { const k = INDS.indexOf(w.at); w.from = w.at; w.at = INDS[(k + 1) % INDS.length]; w.leg = routeBetween(w.from, w.at); w.s = 0; }
      else if ((w.dir > 0 && w.s >= w.leg.len) || (w.dir < 0 && w.s <= 0)) w.dir *= -1;
    }
    return;
  }
  if (w.kind === 'guide' && !w.leg) { w.pause = 0.01; return; }
  const L = w.leg.len, ends = Math.min(w.s, L - w.s);
  const v = w.vmax * (0.35 + 0.65 * Math.min(1, ends / 1.2));
  w.s = Math.max(0, Math.min(L, w.s + v * dt * w.dir));
  legAt(w.leg, w.s, _p);
  legAt(w.leg, Math.max(0, Math.min(L, w.s + 0.35 * w.dir)), _q);
  const dx = _q.x - _p.x, dz = _q.z - _p.z, ln = Math.hypot(dx, dz) || 1;
  const fade = Math.min(1, ends / 0.8);
  const lat = w.lat * w.dir; // 靠右走，迎面的人不會撞在一起
  w.g.position.set(_p.x - (dz / ln) * lat * fade, _p.y + 0.03 + Math.abs(Math.sin(w.phase)) * 0.03, _p.z + (dx / ln) * lat * fade);
  if (ln > 0.01) w.g.rotation.y += wrapAng(Math.atan2(dx, dz) - w.g.rotation.y) * Math.min(1, dt * 5);
  w.phase += dt * v * 6.5;
  poseWalker(w, w.phase, 0.55);
  if ((w.dir > 0 && w.s >= L) || (w.dir < 0 && w.s <= 0)) arrive(w);
}
if (/[?&]debug\b/.test(location.search)) window.__e3d = { walkers, scene, school, DIMS, camera, controls, flyTo: (...a) => flyTo(...a), THREE: { Vector3: THREE.Vector3, Box3: THREE.Box3 }, CP, advance: (sec) => { for (let i = 0; i < sec * 20; i++) for (const w of walkers) updateWalker(w, 0.05, i * 0.05); } };
// 行人頭上的小名牌：小嚮導一直顯示所在指標；關聯行人在開啟相關指標或滑鼠移過時顯示
const wtagLayer = document.createElement('div'); wtagLayer.id = 'wtags'; { const lab = document.getElementById('labels'); if (lab) lab.before(wtagLayer); else document.body.appendChild(wtagLayer); } // 放在指標標籤底下
for (const w of walkers) { w.tag = document.createElement('div'); w.tag.className = 'wtag' + (w.kind === 'guide' ? ' guide' : ''); wtagLayer.appendChild(w.tag); w.tagText = ''; }
const _tg = {};
function walkerTagText(w) {
  if (w.kind === 'guide') {
    const moving = w.pause <= 0 && w.leg;
    return moving ? `🧭 小嚮導 → ${w.at.code}` : `🧭 小嚮導在 ${w.at.code}`;
  }
  const to = w.dir > 0 ? w.B : w.A;
  return w.carrying ? `${w.roleName}｜${w.cfg.item} → ${to.code}` : `${w.roleName}｜返回 ${to.code}`;
}
function placeWalkerTags() {
  const showRel = (current && current.type === 'ind') || (relFocus !== null && !current);
  for (const w of walkers) {
    const near = camera.position.distanceTo(w.g.position) < 42; // 全景時不顯示小嚮導名牌
    const on = w.g.visible && ((w.kind === 'guide' && near) || (showRel && w.vis > 0.6) || hovered === w) && w !== talker;
    if (!on) { if (w.tagOn) { w.tag.style.display = 'none'; w.tagOn = false; } continue; }
    _p.set(0, w.headY + (w.icon && w.icon.visible && w.carrying ? 0.34 : 0.22), 0); w.g.localToWorld(_p); project(_p, _tg);
    if (!_tg.vis) { if (w.tagOn) { w.tag.style.display = 'none'; w.tagOn = false; } continue; }
    const txt = walkerTagText(w);
    if (txt !== w.tagText) { w.tag.textContent = txt; w.tagText = txt; }
    if (!w.tagOn) { w.tag.style.display = 'block'; w.tagOn = true; }
    w.tag.style.transform = `translate(${_tg.x}px, ${_tg.y}px) translate(-50%, -100%)`;
    if (w.kind !== 'guide') w.tag.style.setProperty('--dc', (w.dir > 0 ? w.B : w.A).dim.c);
  }
}

// 路線弧線（導覽路線用）
const routeGrp = new THREE.Group(); scene.add(routeGrp);
let routeArcs = [];
let routeRings = [];
function drawRoute(codes, color) {
  routeGrp.clear(); routeArcs = []; routeRings = [];
  for (const c of codes) {
    const i = byCode(c);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(PLAT_R + 0.6, 0.26, 6, 36), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
    ring.rotation.x = Math.PI / 2; ring.position.set(i.pos.x, 0.18, i.pos.z);
    routeGrp.add(ring); routeRings.push(ring);
  }
  const pts = [new THREE.Vector3(0, SCHOOL_TOP + 5, 0), ...codes.map((c) => { const i = byCode(c); return i.pos.clone().setY(i.labelPos.y + 0.6); })];
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1], mid = a.clone().lerp(b, 0.5); mid.y += 4 + a.distanceTo(b) * 0.25;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const geo = new THREE.TubeGeometry(curve, 48, 0.28, 6);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const tube = new THREE.Mesh(geo, mat); routeGrp.add(tube);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), new THREE.MeshBasicMaterial({ color: '#fffdf8' })); routeGrp.add(dot);
    routeArcs.push({ curve, tube, dot, count: geo.index.count, prog: 0, delay: k * 0.5 });
  }
}

// ───────────────────────── 相關指標：開啟某個指標時，從它拉出弧線連到內文中互相引用的指標
const relatedOf = (code) => RELATIONS.filter((r) => r.a === code || r.b === code).map((r) => ({ ...r, other: r.a === code ? r.b : r.a }));
const relGrp = new THREE.Group(); scene.add(relGrp);
let relArcs = [], relFor = null;
function drawRelated(code) {
  relGrp.clear(); relArcs = []; relFor = code;
  if (!code) return;
  let pairs, ringFrom = false;
  if (code.startsWith('rel:')) { const r = RELATIONS[+code.slice(4)]; pairs = [[r.a, r.b]]; ringFrom = true; }
  else pairs = relatedOf(code).map((r) => [code, r.other]);
  pairs.forEach(([fc, tc], k) => {
    const from = byCode(fc), to = byCode(tc), color = to.dim.c;
    const a = from.pos.clone().setY(from.labelPos.y + 0.3), b = to.pos.clone().setY(to.labelPos.y + 0.3);
    const mid = a.clone().lerp(b, 0.5); mid.y += 3 + a.distanceTo(b) * 0.3;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const geo = new THREE.TubeGeometry(curve, 48, 0.13, 6);
    const tube = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }));
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: '#fffdf8' }));
    const ring = (ind, c) => { const m = new THREE.Mesh(new THREE.TorusGeometry(PLAT_R + 0.45, 0.13, 6, 36), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.8 })); m.rotation.x = Math.PI / 2; m.position.set(ind.pos.x, 0.18, ind.pos.z); relGrp.add(m); return m; };
    const rings = [ring(to, color)]; if (ringFrom) rings.push(ring(from, from.dim.c));
    relGrp.add(tube, dot);
    relArcs.push({ curve, tube, dot, rings, count: geo.index.count, prog: 0, delay: 0.35 + k * 0.15, ph: k * 0.37 });
  });
}
// 從「指標總覽 › 相關指標」點選一組關聯：畫出這一條弧線，只留下帶著它的小人
let relFocus = null;
function setRelFocus(k) {
  relFocus = k;
  listBody.querySelectorAll('.relrow').forEach((r) => r.classList.toggle('on', +r.dataset.k === k));
  wake();
}

// ───────────────────────── 鏡頭
// 與三年山徑一致：左鍵（單指）拖曳＝旋轉；右鍵（雙指）拖曳＝平移地圖；滾輪（雙指捏合）＝縮放
const controls = new MapControls(camera, canvas);
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 6, maxDistance: 170, maxPolarAngle: 1.25, minPolarAngle: 0.15, screenSpacePanning: false, rotateSpeed: 0.6, panSpeed: 1.0, zoomToCursor: true });
function overview() {
  const narrow = isNarrow();
  camera.fov = narrow ? 50 : 36; camera.updateProjectionMatrix();
  const aspect = innerWidth / innerHeight;
  // 讓半徑約 27 的群島完整入鏡（取垂直與水平中較緊的一邊）
  const R = 23.5;
  const vf = Math.sin((camera.fov * Math.PI) / 360);
  const hfov = 2 * Math.atan(Math.tan((camera.fov * Math.PI) / 360) * aspect);
  const need = Math.max(R * 1.12 / vf, R * 1.05 / Math.sin(hfov / 2));
  const dist = Math.min(150, need);
  ovDist = dist;
  const dir = (narrow ? new THREE.Vector3(0, 0.92, 0.4) : new THREE.Vector3(0, 0.8, 0.6)).normalize();
  const target = new THREE.Vector3(0, 0, narrow ? 2 : 1.5);
  return { pos: target.clone().addScaledVector(dir, dist), target };
}
let fly = null;
let ovDist = 80; // 全景距離（由 overview() 更新），用來決定何時顯示指標名稱
function flyTo(pos, target, dur = 1.2) {
  if (reduceMotion) dur = 0.01;
  fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, s: performance.now(), d: dur * 1000 };
  controls.enabled = false;
}
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function focusOn(center, dist) {
  const target = center.clone();
  const az = Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
  const phi = 0.98;
  const pos = new THREE.Vector3(Math.sin(phi) * Math.sin(az), Math.cos(phi), Math.sin(phi) * Math.cos(az)).multiplyScalar(dist * (isNarrow() ? 1.3 : 1)).add(target);
  flyTo(pos, target);
}
const off = { x: 0, y: 0, tx: 0, ty: 0 };
function updateOffsetTarget() {
  if (play) { off.tx = 0; off.ty = $('#playCap').offsetHeight * 0.5; return; } // 自動播放：主角移到字幕上方
  const p = $('#panel').classList.contains('open') ? $('#panel') : $('#listPanel').classList.contains('open') ? $('#listPanel') : null;
  const rb = !$('#routebar').hidden ? $('#routebar').offsetHeight : 0;
  if (!p) { off.tx = 0; off.ty = isNarrow() ? 0 : rb * 0.4; return; }
  if (isNarrow()) { off.tx = 0; off.ty = p.offsetHeight * 0.5; } else { off.tx = (p.offsetWidth + 24) * 0.5; off.ty = rb * 0.4; }
}

// ───────────────────────── 標籤
const labelsEl = $('#labels');
const labels = [];
function addLabel(html, cls, pos, onClick, vars = {}) {
  const el = document.createElement('button'); el.type = 'button'; el.className = cls; el.innerHTML = html;
  for (const k in vars) el.style.setProperty(k, vars[k]);
  el.addEventListener('click', onClick);
  labelsEl.appendChild(el);
  const L = { el, pos, pri: cls.includes('dlabel') ? 2 : cls.includes('slabel') ? 3 : 1 };
  labels.push(L);
  return L;
}
for (const d of DIMS) {
  d.label = addLabel(`<span class="dn">構面${NUM[d.n]}</span><span class="dt">${dimName(d)}</span><span class="dw">${d.weight}</span>`, 'dlabel', d.labelPos, () => openDim(d.n), { '--dc': d.c });
  d.label.el.setAttribute('aria-label', `${d.title}，配分 ${d.weight}`);
  for (const ind of d.inds) {
    ind.label = addLabel(`<span class="code">${ind.code}</span><span class="nm">${ind.short}</span>`, 'ilabel', ind.labelPos, () => openInd(ind.code), { '--dc': d.c });
    ind.label.el.setAttribute('aria-label', `指標 ${ind.code} ${ind.title}`);
    ind.label.ind = ind;
  }
}
const schoolLabel = addLabel('<span class="sm">宜蘭縣立</span><b>大同國中</b>', 'slabel', school.labelPos, () => openSchool());
const valleyLabel = addLabel('<span>三年山徑</span><small>泰雅文化課程地圖 →</small>', 'vlabel', school.signPos, () => goValley());

const v3 = new THREE.Vector3();
function project(p, out) { v3.copy(p).project(camera); out.x = (v3.x * 0.5 + 0.5) * innerWidth; out.y = (-v3.y * 0.5 + 0.5) * innerHeight; out.vis = v3.z < 1 && v3.z > -1; out.z = v3.z; return out; }
const placed = [];
const overlaps = (r) => placed.some((q) => r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y);
// 指標名稱顯示規則：全景只顯示代碼；鏡頭拉近（或開啟說明卡）時全部顯示名稱；滑過代碼或平台時單獨顯示
let showNames = false;
function updateNameMode() {
  const r = camera.position.distanceTo(controls.target) / ovDist; // 1＝全景
  if (current) showNames = true;
  else if (showNames && r > 0.92) showNames = false;
  else if (!showNames && r < 0.85) showNames = true;
  document.body.classList.toggle('names', showNames);
}
function placeLabels() {
  updateNameMode();
  for (const L of labels) { project(L.pos, L); if (L.ind) L.y -= L.ind.lift * 30; }
  placed.length = 0;
  const order = labels.slice().sort((a, b) => b.pri - a.pri || a.z - b.z);
  for (const L of order) {
    const el = L.el;
    if (!L.fw) { el.classList.remove('compact'); L.fw = el.offsetWidth || 120; L.fh = el.offsetHeight || 36; }
    let compact = false, stem = 0, rect = null;
    // 先試正上方（可拉高），再試左右錯開，盡量讓每個標籤都完整顯示
    const tryAt = (w, h) => {
      const dxs = L.ind ? [0, -w * 0.5, w * 0.5, -w * 0.9, w * 0.9] : [0];
      for (const st of [0, 30, 60, 90]) for (const dx of dxs) { const r = { x: L.x + dx - w / 2 - 3, y: L.y - st - h - 6, w: w + 6, h: h + 6 }; if (!overlaps(r)) return [r, st, dx]; }
      return null;
    };
    const wantName = !L.ind || showNames || hovered === L.ind || L.el.matches(':hover, :focus-visible');
    const forced = L.ind && (hovered === L.ind || L.el.matches(':hover, :focus-visible'));
    let res = wantName ? (tryAt(L.fw, L.fh) || (forced ? [{ x: L.x - L.fw / 2, y: L.y - L.fh, w: L.fw, h: L.fh }, 0] : null)) : null;
    L.el.classList.toggle('lift', !!forced);
    if (!res && L.ind) { compact = true; res = tryAt(46, 34) || [{ x: L.x - 23, y: L.y - 40, w: 46, h: 34 }, 0]; }
    if (!res) res = [{ x: L.x - L.fw / 2, y: L.y - L.fh, w: L.fw, h: L.fh }, 0];
    [rect, stem] = res; const dx = res[2] || 0;
    if (L.vis && !el.classList.contains('active')) placed.push(rect);
    if (compact !== el.classList.contains('compact')) el.classList.toggle('compact', compact);
    el.style.setProperty('--stem', stem + 'px');
    el.style.transform = `translate(${L.x + dx}px, ${L.y - stem}px) translate(-50%, -100%)`;
    el.style.setProperty('--tail', `${-dx}px`);
    el.style.visibility = L.vis ? 'visible' : 'hidden';
  }
}

// ───────────────────────── 說明卡
const panel = $('#panel'), body = $('#panelBody');
let current = null; // { type, key }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function indCard(ind) {
  const d = ind.dim;
  const photos = ind.photos.length ? `
    <section><h3>精選照片</h3>
      <div class="strip">${ind.photos.map((p) => `<figure><img src="${p.t}" alt="${esc(p.c)}" loading="lazy"><figcaption>${esc(p.c)}</figcaption></figure>`).join('')}</div>
      ${ind.nphotos > ind.photos.length ? `<p class="note">本頁共 ${ind.nphotos} 張照片。</p>` : ''}
    </section>` : '';
  return `
    <div class="eyebrow"><span class="tag dim">構面${NUM[d.n]}　${esc(dimName(d))}</span><span class="tag w">配分 ${d.weight}</span></div>
    <h2 id="panelTitle"><span class="pnum">${ind.code}</span><span>${esc(ind.title)}</span></h2>
    <blockquote class="quote"><span>指標原文</span>${esc(ind.quote)}</blockquote>
    <div class="acts">
      <button type="button" class="primary" id="readBtn" data-page="${ind.code}">閱讀完整內容 <span aria-hidden="true">→</span></button>
      ${ind.drive ? `<a class="secondary" href="${ind.drive}" target="_blank" rel="noopener">佐證資料夾 ↗</a>` : ''}
    </div>
    ${ROUTES.filter((r) => r.sec && r.sec[ind.code]).map((r) => `<button type="button" class="keylink" style="--rc:${r.c}" data-read="${ind.code}" data-sec="${esc(r.sec[ind.code])}"><span>${r.icon}</span><b>${r.id === 'prev' ? '前次評鑑建議與回應' : r.sec[ind.code]}</b><small>直接閱讀這一段 →</small></button>`).join('')}
    <section><h3>本頁重點</h3><ul class="points">${ind.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></section>
    ${relatedSection(ind)}
    ${photos}
    <section><h3>頁面架構<small>點選可直接閱讀該段</small></h3><ol class="outline">${ind.outline.map((h) => `<li><button type="button" data-read="${ind.code}" data-sec="${esc(h)}">${esc(h)}<span aria-hidden="true">→</span></button></li>`).join('')}</ol>
      ${ind.ninter ? `<p class="note">內含 ${ind.ninter} 件互動圖表／互動網頁。</p>` : ''}</section>`;
}
function relatedSection(ind) {
  const rel = relatedOf(ind.code);
  const themes = ROUTES.filter((r) => r.group === 'theme' && r.stops.includes(ind.code));
  if (!rel.length && !themes.length) return '';
  return `<section><h3>相關指標<small>地圖上的弧線連到這些指標</small></h3>
    ${rel.length ? `<div class="rels">${rel.map((r) => { const o = byCode(r.other); return `
      <div class="rel" style="--rc:${o.dim.c}">
        <button type="button" class="relgo" data-ind="${o.code}"><span class="code">${o.code}</span><b>${esc(o.title)}</b><span class="go" aria-hidden="true">→</span></button>
        <p>${esc(r.why)}</p>
        <button type="button" class="relsrc" data-read="${r.src}" data-sec="${esc(r.sec)}">出處：${r.src} 頁「${esc(r.sec)}」→</button>
      </div>`; }).join('')}</div>` : ''}
    ${themes.length ? `<div class="relthemes"><span class="rtlab">所屬主題串聯</span><div class="rtchips">${themes.map((r) => `<button type="button" class="relthm" data-route="${r.id}" style="--rc:${r.c}">${r.icon} ${esc(r.name)}</button>`).join('')}</div></div>` : ''}
  </section>`;
}
function dimCard(d) {
  return `
    <div class="eyebrow"><span class="tag w">配分 ${d.weight}</span><span class="tag">${d.inds.length} 項指標</span></div>
    <h2 id="panelTitle"><span class="pnum">${NUM[d.n]}</span><span>${esc(dimName(d))}</span></h2>
    <p class="intro">${esc(d.desc)}</p>
    <div class="acts"><button type="button" class="secondary" id="readBtn" data-page="d${d.n}">開啟構面頁</button></div>
    <section><h3>指標</h3><div class="cards">${d.inds.map((i) => `
      <button type="button" class="icard" data-ind="${i.code}">
        <span class="code">${i.code}</span>
        <span class="t"><b>${esc(i.title)}</b><small>${esc(i.points[0])}</small></span>
        <span class="go" aria-hidden="true">→</span>
      </button>`).join('')}</div></section>`;
}
function schoolCard() {
  const S = SCHOOL;
  return `
    <div class="eyebrow"><span class="tag">115 學年度原住民族實驗教育評鑑</span></div>
    <h2 id="panelTitle"><span>宜蘭縣立大同國民中學</span></h2>
    <div class="vision"><b>Tayal balay 實驗教育願景</b><p>${esc(S.vision)}</p></div>
    <div class="acts"><button type="button" class="primary" id="readBtn" data-page="home">閱讀首頁全文 <span aria-hidden="true">→</span></button></div>
    <section><h3>學校簡介</h3>
      <dl class="facts">${S.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      ${S.intro.map((p) => `<p>${esc(p)}</p>`).join('')}</section>
    <section><h3>gaga 四項核心特質</h3><p>${esc(S.gaga)}</p>
      <div class="traits">${S.traits.map((t) => `<div class="trait" style="--tc:${t.c}"><b>${t.icon} ${t.name}</b><i>${t.tayal}</i><p>${t.text}</p></div>`).join('')}</div>
      <p>${S.stages}</p></section>
    <section><h3>導覽快速入口</h3>${routeCards()}</section>
    <section><h3>延伸閱讀</h3>
      <button type="button" class="icard" id="valleyBtn"><span class="code">⛰️</span><span class="t"><b>三年山徑：泰雅文化課程 3D 地圖</b><small>七年級燒墾生活、八年級 gaga 家庭與編織、九年級山林智慧，21 個課程主題。</small></span><span class="go" aria-hidden="true">→</span></button>
    </section>`;
}

function routeCards() {
  const card = (r) => `<button type="button" class="icard route" data-route="${r.id}" style="--rc:${r.c}"><span class="code">${r.icon}</span><span class="t"><b>${r.name}</b><small>${esc(r.text)}</small></span><span class="go" aria-hidden="true">→</span></button>`;
  return ROUTE_GROUPS.map((g) => `<h4 class="rgroup">${g.name}</h4><div class="cards">${ROUTES.filter((r) => r.group === g.id).map(card).join('')}${g.id === 'tour' ? `<button type="button" class="icard route" data-valley style="--rc:#6a4432"><span class="code">⛰️</span><span class="t"><b>三年山徑：泰雅文化課程地圖</b><small>七年級燒墾生活、八年級 gaga 家庭與編織、九年級山林智慧，21 個課程主題。</small></span><span class="go" aria-hidden="true">→</span></button>` : ''}</div>`).join('');
}
function openReaderAt(ref, secText) { pendingSecText = secText || null; if (location.hash === '#p' + ref) routeHash(); else location.hash = '#p' + ref; }
let pendingSecText = null;
function scrollToHeading(text) {
  const h = [...reader.el.querySelectorAll('h2, h3, h4, summary')].find((e) => e.textContent.trim().startsWith(text));
  if (!h) return;
  const det = h.closest('details'); if (det) det.open = true;
  requestAnimationFrame(() => { const r = h.getBoundingClientRect(), sr = reader.scroller.getBoundingClientRect(); reader.scroller.scrollTop += r.top - sr.top - 12; });
}
function setPanel(html) {
  body.innerHTML = html; body.scrollTop = 0;
  body.querySelectorAll('[data-ind]').forEach((b) => b.addEventListener('click', () => openInd(b.dataset.ind)));
  body.querySelectorAll('[data-route]').forEach((b) => b.addEventListener('click', () => startRoute(b.dataset.route)));
  body.querySelectorAll('[data-valley]').forEach((b) => b.addEventListener('click', goValley));
  body.querySelectorAll('[data-read]').forEach((b) => b.addEventListener('click', () => openReaderAt(b.dataset.read, b.dataset.sec)));
  const rb = $('#readBtn', body); if (rb) rb.addEventListener('click', () => { location.hash = '#p' + rb.dataset.page; });
  const vb = $('#valleyBtn', body); if (vb) vb.addEventListener('click', goValley);
  if (!panel.classList.contains('open')) { panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false'); }
  document.body.classList.add('focused');
  closeList(true);
  hideHint();
  requestAnimationFrame(updateOffsetTarget);
}
function markActive() {
  document.body.classList.toggle('focus-ind', !!current && current.type === 'ind');
  for (const L of labels) L.el.classList.remove('active');
  if (!current) return;
  if (current.type === 'ind') { const i = byCode(current.key); i.label.el.classList.add('active'); }
}
function openInd(code, { fromHash = false } = {}) {
  const ind = byCode(code);
  current = { type: 'ind', key: code };
  panel.style.setProperty('--dc', ind.dim.c); panel.style.setProperty('--tint', ind.dim.tint);
  setPanel(indCard(ind));
  $('#prev').hidden = $('#next').hidden = false;
  markActive();
  focusOn(new THREE.Vector3(ind.pos.x, ind.top + 0.9, ind.pos.z), 19);
  if (!fromHash) history.replaceState(null, '', '#i' + code);
  if (route) syncRoute(code);
}
function openDim(n) {
  const d = DIMS[n - 1];
  current = { type: 'dim', key: n };
  panel.style.setProperty('--dc', d.c); panel.style.setProperty('--tint', d.tint);
  setPanel(dimCard(d));
  $('#prev').hidden = $('#next').hidden = false;
  markActive();
  const c = d.hub.clone().add(polar(d.angle, 3.2)).setY(1.4);
  focusOn(c, 22);
  history.replaceState(null, '', '#d' + n);
}
function openSchool() {
  current = { type: 'school' };
  panel.style.setProperty('--dc', '#be1e2d');
  setPanel(schoolCard());
  $('#prev').hidden = $('#next').hidden = true;
  markActive();
  focusOn(new THREE.Vector3(0, SCHOOL_TOP + 1, 0), 22);
  history.replaceState(null, '', '#school');
}
function closePanel() {
  panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('focused');
  current = null; markActive();
  history.replaceState(null, '', location.pathname + location.search);
  updateOffsetTarget();
  // 關閉說明卡後鏡頭留在原地；想回全景可按右上「全景」
}
function step(dir) {
  if (!current) return;
  if (current.type === 'ind') { const k = INDS.findIndex((i) => i.code === current.key); openInd(INDS[(k + dir + INDS.length) % INDS.length].code); }
  else if (current.type === 'dim') openDim(((current.key - 1 + dir + 6) % 6) + 1);
}
$('#close').addEventListener('click', closePanel);
$('#prev').addEventListener('click', () => step(-1));
$('#next').addEventListener('click', () => step(1));
$('#home').addEventListener('click', () => { if (current) closePanel(); const o = overview(); flyTo(o.pos, o.target); });
addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea') || reader.isOpen()) return;
  if (valleyOpen()) { if (e.key === 'Escape') $('#valleyBack').click(); return; }
  if (e.key === 'Escape' && talker) { hideBubble(); return; }
  if (e.key === 'Escape') { if (current) closePanel(); else if (listOpen) closeList(); else if (route) endRoute(); }
  if (current && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) step(e.key === 'ArrowRight' ? 1 : -1);
});
$('#legendToggle').addEventListener('click', () => {
  const lg = $('#legend'), open = !lg.classList.contains('open');
  lg.classList.toggle('open', open); $('#legendToggle').setAttribute('aria-expanded', String(open));
});
// 三年山徑：在網站內以全螢幕框架開啟（不另開分頁）
const valleyEl = $('#valleyView'), valleyFrame = $('#valleyFrame');
function goValley() { location.hash = '#valley'; }
function openValley() {
  if (!valleyFrame.src) {
    valleyFrame.src = VALLEY_URL + (timeMode !== 'auto' ? `?time=${timeMode}` : '');
  } else sendValleyTime();
  valleyEl.hidden = false; document.body.classList.add('valley');
  $('#valleyBack').focus();
}
function closeValley() { if (valleyEl.hidden) return; valleyEl.hidden = true; document.body.classList.remove('valley'); }
const valleyOpen = () => !valleyEl.hidden;
$('#valleyBack').addEventListener('click', () => { closeValley(); history.replaceState(null, '', location.pathname + location.search); openSchool(); });
// 只有正式網站（GitHub Pages）提供「新分頁開啟」
if (/github\.io$/.test(location.hostname) || location.protocol === 'file:' || location.hostname === 'localhost') $('#valleyNewTab').hidden = false;

// ───────────────────────── 清單
const listPanel = $('#listPanel'), listBody = $('#listBody');
let listOpen = false;
let listTab = 'ind';
function relationRows() {
  return RELATIONS.map((r, k) => {
    const A = byCode(r.a), B = byCode(r.b), w = walkers.find((x) => x.rel === r);
    const who = w ? `${w.cfg.icon} ${w.roleName}帶著「${esc(w.cfg.item)}」` : '';
    return `<div class="relrow${relFocus === k ? ' on' : ''}" data-k="${k}" style="--ca:${A.dim.c};--cb:${B.dim.c}">
      <button type="button" class="relmain" data-rel="${k}" aria-label="在地圖上看 ${r.a} 與 ${r.b} 的關聯">
        <span class="rpair"><b class="ra">${r.a}</b><i aria-hidden="true">→</i><b class="rb">${r.b}</b><span class="rnames">${esc(A.short)} → ${esc(B.short)}</span></span>
        <span class="rwhy">${esc(r.why)}</span>
        ${who ? `<span class="rwho">${who}</span>` : ''}
      </button>
      <button type="button" class="relsrc" data-src="${k}">讀出處 <small>${r.src}・${esc(r.sec)}</small></button>
    </div>`;
  }).join('');
}
function renderList() {
  const tabs = `<div class="ltabs" role="tablist">
      <button type="button" role="tab" data-tab="ind" aria-selected="${listTab === 'ind'}">全部指標 <small>17</small></button>
      <button type="button" role="tab" data-tab="rel" aria-selected="${listTab === 'rel'}">相關指標 <small>${RELATIONS.length}</small></button>
    </div>`;
  if (listTab === 'rel') {
    listBody.innerHTML = tabs + `<p class="lnote">只收錄網站內文中明確互相引用的指標。點一組關聯，地圖會畫出這條弧線，並只留下帶著這份佐證的小人。</p><div class="rellist">${relationRows()}</div>`;
    listBody.querySelectorAll('[data-rel]').forEach((b) => b.addEventListener('click', () => {
      const k = +b.dataset.rel, r = RELATIONS[k], A = byCode(r.a), B = byCode(r.b);
      setRelFocus(k);
      const c = A.pos.clone().lerp(B.pos, 0.5).setY(1.2);
      focusOn(c, Math.max(20, A.pos.distanceTo(B.pos) * 1.05));
    }));
    listBody.querySelectorAll('[data-src]').forEach((b) => b.addEventListener('click', () => { const r = RELATIONS[+b.dataset.src]; closeList(); openReaderAt(r.src, r.sec); }));
  } else {
    listBody.innerHTML = tabs + `
    <button type="button" class="lrow school" data-school><span class="num">🏫</span><span class="lname">學校簡介與願景<small>學校基本資料、Tayal balay、gaga 四項核心特質</small></span></button>
    ${DIMS.map((d) => `
    <div class="lgroup" style="--c:${d.c}">
      <h3><button type="button" data-dim="${d.n}">構面${NUM[d.n]}　${esc(dimName(d))}</button><span>${d.weight}</span></h3>
      ${d.inds.map((i) => `<button type="button" class="lrow" data-ind="${i.code}"><span class="num">${i.code}</span><span class="lname">${esc(i.title)}</span></button>`).join('')}
    </div>`).join('')}`;
    listBody.querySelectorAll('[data-ind]').forEach((b) => b.addEventListener('click', () => openInd(b.dataset.ind)));
    listBody.querySelectorAll('[data-dim]').forEach((b) => b.addEventListener('click', () => openDim(+b.dataset.dim)));
    listBody.querySelector('[data-school]').addEventListener('click', openSchool);
  }
  listBody.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    listTab = b.dataset.tab; if (listTab !== 'rel') setRelFocus(null); renderList(); listBody.scrollTop = 0;
    listBody.querySelector(`[data-tab="${listTab}"]`).focus();
  }));
}
function openList() {
  if (current) { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); current = null; markActive(); }
  renderList();
  listPanel.classList.add('open'); listPanel.setAttribute('aria-hidden', 'false'); listOpen = true;
  $('#listBtn').setAttribute('aria-pressed', 'true');
  document.body.classList.add('focused'); hideHint();
  requestAnimationFrame(updateOffsetTarget);
}
function closeList(silent = false) {
  if (!listOpen) return;
  listPanel.classList.remove('open'); listPanel.setAttribute('aria-hidden', 'true'); listOpen = false;
  setRelFocus(null);
  $('#listBtn').setAttribute('aria-pressed', 'false');
  if (!silent) { document.body.classList.remove('focused'); updateOffsetTarget(); }
}
$('#listBtn').addEventListener('click', () => (listOpen ? closeList() : openList()));
$('#listClose').addEventListener('click', () => closeList());

// ───────────────────────── 導覽路線
let route = null; // { r, stops, k }
const routebar = $('#routebar');
function startRoute(id) {
  const r = ROUTES.find((x) => x.id === id);
  const stops = r.stops || INDS.map((i) => i.code);
  route = { r, stops, k: -1 };
  drawRoute(stops, r.c);
  for (const i of INDS) i.label.el.classList.toggle('dimmed', !stops.includes(i.code));
  for (const d of DIMS) d.label.el.classList.toggle('dimmed', !d.inds.some((i) => stops.includes(i.code)));
  routebar.hidden = false;
  routebar.style.setProperty('--rc', r.c);
  document.body.classList.add('routing');
  closeList(true);
  if (current) { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); document.body.classList.remove('focused'); current = null; markActive(); }
  renderRoutebar();
  hideHint();
  requestAnimationFrame(() => { updateOffsetTarget(); const o = overview(); flyTo(o.pos, o.target); });
}
function renderRoutebar() {
  const { r, stops, k } = route;
  routebar.innerHTML = `
    <div class="rhead"><b class="rtitle">${r.icon} ${r.name}</b><span class="rcount">${k < 0 ? `共 ${stops.length} 站` : `第 ${k + 1} 站，共 ${stops.length} 站`}</span>
      <button type="button" class="pbtn" id="rClose" aria-label="結束路線">×</button></div>
    <div class="rstops">${stops.map((c, i) => `<button type="button" class="rstop${i === k ? ' on' : ''}" data-k="${i}" aria-label="第 ${i + 1} 站 ${c}">${c}</button>`).join('')}</div>
    ${k < 0 ? `<p class="rtext">${esc(r.text)}</p>` : ''}
    <div class="rnav">
      ${k < 0 ? `<button type="button" class="pbtn primary" id="rNext">${stops.length > 1 ? '從第 1 站開始' : '在地圖上前往'} →</button>`
        : `<button type="button" class="pbtn" id="rPrev" ${k === 0 ? 'disabled' : ''}>← 上一站</button><button type="button" class="pbtn primary" id="rNext" ${k === stops.length - 1 ? 'disabled' : ''}>${k < stops.length - 1 ? `下一站：${stops[k + 1]} ${esc(byCode(stops[k + 1]).short)} →` : '已是最後一站'}</button>`}
      <button type="button" class="pbtn" id="rRead">${k < 0 && r.sec ? '直接閱讀' : '閱讀本站全文'}</button>
    </div>`;
  $('#rClose').addEventListener('click', endRoute);
  routebar.querySelectorAll('.rstop').forEach((b) => b.addEventListener('click', () => { route.k = +b.dataset.k; renderRoutebar(); openInd(route.stops[route.k]); }));
  const p = $('#rPrev'), n = $('#rNext');
  if (p) p.addEventListener('click', () => { route.k--; renderRoutebar(); openInd(route.stops[route.k]); });
  if (n) n.addEventListener('click', () => { route.k++; renderRoutebar(); openInd(route.stops[route.k]); });
  $('#rRead').addEventListener('click', () => { const c = route.stops[Math.max(0, route.k)]; openReaderAt(c, route.r.sec && route.r.sec[c]); });
  const on = routebar.querySelector('.rstop.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
}
function syncRoute(code) { const k = route.stops.indexOf(code); if (k >= 0 && k !== route.k) { route.k = k; renderRoutebar(); } }
function endRoute() {
  route = null; routeGrp.clear(); routeArcs = []; routeRings = [];
  for (const L of labels) L.el.classList.remove('dimmed');
  routebar.hidden = true; document.body.classList.remove('routing');
  updateOffsetTarget();
}
$('#routeBtn').addEventListener('click', () => {
  if (listOpen) closeList(true);
  current = { type: 'routes' };
  setPanel(`<h2 id="panelTitle"><span>導覽路線</span></h2><p class="intro">時間有限時，可依目的擇一路徑瀏覽。</p>
    ${routeCards()}`);
  $('#prev').hidden = $('#next').hidden = true;
});

// ───────────────────────── 操作：點選與滑過
let hintHidden = false;
function hideHint() { hintHidden = true; } // 操作說明常駐顯示，不再隱藏
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(pickables, false)[0];
  return hit ? hit.object.userData.ref : null;
}
let down = null, hovered = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
  const ref = pick(e);
  if (!ref) return;
  if (ref.type === 'ind') openInd(ref.ind.code);
  else if (ref.type === 'dim') openDim(ref.d.n);
  else if (ref.type === 'school') openSchool();
  else if (ref.type === 'valley') goValley();
  else if (ref.type === 'walker') talkTo(ref.w);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const ref = pick(e);
  const h = ref ? (ref.type === 'ind' ? ref.ind : ref.type === 'dim' ? ref.d : ref.type === 'school' || ref.type === 'valley' ? school : ref.type === 'walker' ? ref.w : null) : null;
  if (h !== hovered) {
    if (hovered && hovered.label) hovered.label.el.classList.remove('hover');
    hovered = h;
    if (hovered && hovered.label) hovered.label.el.classList.add('hover');
    canvas.style.cursor = h ? 'pointer' : '';
  }
});
canvas.addEventListener('pointerleave', () => { if (hovered && hovered.label) hovered.label.el.classList.remove('hover'); hovered = null; });
controls.addEventListener('start', () => { fly = null; controls.enabled = true; hideHint(); });

// ───────────────────────── 小人對話泡泡
const bubble = $('#bubble');
let talker = null;
// 點行人：說明自己正在做什麼（內容取自 RELATIONS 的關聯說明，不另創事實）
function talkTo(w) {
  if (talker && talker !== w) talker.talk = 0;
  talker = w; w.talk = 10;
  let text, acts;
  if (w.kind === 'guide') {
    const moving = w.pause <= 0 && w.leg;
    const at = w.at;
    text = moving
      ? `我是小嚮導，正依照順序走訪 17 項指標，現在要從 ${w.from.code} 走到 ${at.code}「${at.title}」。`
      : `我是小嚮導，正依照順序走訪 17 項指標，現在停在 ${at.code}「${at.title}」。`;
    acts = [{ t: `看 ${at.code}`, a: { ind: at.code } }, { t: '依序走完 17 項指標', a: { route: 'all' }, more: true }];
  } else {
    const { cfg, rel, A, B } = w;
    const why = rel ? rel.why : '';
    text = w.carrying
      ? (cfg.both && w.dir < 0
        ? `我是${w.roleName}，正把「${cfg.item}」從 ${B.code} 帶回 ${A.code}：${why}。`
        : `我是${w.roleName}，正把「${cfg.item}」從 ${w.dir > 0 ? A.code : B.code} 送到 ${w.dir > 0 ? B.code : A.code}：${why}。`)
      : `我是${w.roleName}，剛把「${cfg.item}」送到 ${B.code}，正要回 ${A.code}。這兩項指標的關聯是：${why}。`;
    const to = w.dir > 0 ? B : A;
    acts = [{ t: `去 ${to.code}`, a: { ind: to.code } }];
    if (rel) acts.push({ t: `讀出處（${rel.src}）`, a: { read: rel.src, sec: rel.sec }, more: true });
  }
  bubble.innerHTML = `<p>${esc(text)}</p><div class="bacts">${acts.map((x, i) => `<button type="button" class="${x.more ? 'bmore' : 'bgo'}" data-i="${i}">${esc(x.t)}${x.more ? '' : ' →'}</button>`).join('')}</div>`;
  bubble.hidden = false;
  bubble.style.setProperty('--dc', w.kind === 'guide' ? w.at.dim.c : (w.dir > 0 ? w.B : w.A).dim.c);
  bubble.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { const x = acts[+b.dataset.i]; hideBubble(); doAct(x.a); }));
  hideHint();
}
function hideBubble() { bubble.hidden = true; if (talker) talker.talk = 0; talker = null; }
function doAct(a) {
  if (a.ind) openInd(a.ind);
  else if (a.dim) openDim(a.dim);
  else if (a.read) openReaderAt(a.read, a.sec);
  else if (a.valley) goValley();
  else if (a.search) search.open();
  else if (a.routes) $('#routeBtn').click();
  else if (a.route) startRoute(a.route);
}
canvas.addEventListener('pointerdown', () => { if (talker) hideBubble(); });

// ───────────────────────── 顯示選項：名牌、小人、物品圖示、弧線、動畫、拍照模式（設定記在這台電腦的瀏覽器）
const OPT_KEYS = [
  ['labels', '指標與構面名牌'], ['walkers', '走動的小人'], ['icons', '小人頭上的物品圖示'], ['arcs', '關聯弧線與路線'], ['motion', '動畫（關閉可讓畫面靜止）'],
];
const opts = { labels: true, walkers: true, icons: true, arcs: true, motion: true };
try { Object.assign(opts, JSON.parse(localStorage.getItem('eval3d-view') || '{}')); } catch (e) {}
const viewPanel = $('#viewPanel');
function applyOpts() {
  document.body.classList.toggle('hide-labels', !opts.labels);
  relGrp.visible = routeGrp.visible = opts.arcs;
  for (const w of walkers) if (w.icon && !opts.icons) w.icon.visible = false;
  try { localStorage.setItem('eval3d-view', JSON.stringify(opts)); } catch (e) {}
  wake();
}
function wake() { lastActive = performance.now(); }
function renderViewPanel() {
  viewPanel.innerHTML = `<div class="vtop"><b>顯示選項</b><button type="button" class="pbtn" id="viewClose" aria-label="關閉顯示選項">×</button></div>
    ${OPT_KEYS.map(([k, t]) => `<label class="vopt"><input type="checkbox" id="opt-${k}" ${opts[k] ? 'checked' : ''}><span class="sw" aria-hidden="true"></span><span>${t}</span></label>`).join('')}
    <button type="button" class="vphoto" id="photoBtn">📷 拍照模式<small>隱藏所有按鈕與名牌，方便截圖放進報告或簡報；按 Esc 或右下角按鈕結束</small></button>`;
  OPT_KEYS.forEach(([k]) => $('#opt-' + k).addEventListener('change', (e) => { opts[k] = e.target.checked; applyOpts(); }));
  $('#viewClose').addEventListener('click', closeViewPanel);
  $('#photoBtn').addEventListener('click', () => { closeViewPanel(); setPhoto(true); });
}
function openViewPanel() {
  renderViewPanel(); viewPanel.hidden = false;
  viewPanel.style.right = isNarrow() ? '' : `${innerWidth - $('.tools').getBoundingClientRect().left + 10}px`; $('#viewBtn').setAttribute('aria-expanded', 'true'); }
function closeViewPanel() { viewPanel.hidden = true; $('#viewBtn').setAttribute('aria-expanded', 'false'); }
$('#viewBtn').addEventListener('click', () => (viewPanel.hidden ? openViewPanel() : closeViewPanel()));
// 拍照模式：游標停住 2.5 秒後「結束」按鈕也會淡出，截圖時畫面完全乾淨
const photoExit = $('#photoExit');
let photoTimer = 0;
function setPhoto(on) {
  document.body.classList.toggle('photo', on);
  photoExit.hidden = !on;
  if (on) { if (talker) hideBubble(); pokePhoto(); }
  wake();
}
function pokePhoto() { photoExit.classList.remove('idle'); clearTimeout(photoTimer); photoTimer = setTimeout(() => photoExit.classList.add('idle'), 2500); }
photoExit.addEventListener('click', () => setPhoto(false));
addEventListener('pointermove', () => { if (document.body.classList.contains('photo')) pokePhoto(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('photo')) { setPhoto(false); e.stopImmediatePropagation(); } }, true);

// ───────────────────────── 自動播放導覽（評鑑當天投影用）：依序運鏡＋字幕，文字取自網站現有內容
const stripTags = (s) => String(s).replace(/<[^>]+>/g, '');
function dimShot(d) {
  const c = d.hub.clone(); d.inds.forEach((i) => c.add(i.pos)); c.multiplyScalar(1 / (d.inds.length + 1)); c.y = 1;
  const out = new THREE.Vector3(Math.sin(d.angle), 0, -Math.cos(d.angle));
  return { target: c, dir: out.multiplyScalar(0.55).add(new THREE.Vector3(0, 0.83, 0)).normalize(), dist: 30 };
}
function buildPlay() {
  const hl = ROUTES.find((r) => r.id === 'hl'), prev = ROUTES.find((r) => r.id === 'prev');
  const i63 = byCode('6-3');
  const shots = [
    { kick: '宜蘭縣立大同國中・115 學年度', t: '原住民族實驗教育評鑑', p: '湖中央是學校，周圍六座構面島，再以吊橋連到 17 座指標平台。旗幟顏色代表構面，旗桿越高，配分越高。', cam: 'overview' },
    { kick: '學校願景', t: 'Tayal balay（真正的泰雅人）', p: SCHOOL.vision + ' 四項核心特質：' + SCHOOL.traits.map((x) => x.name).join('、') + '。', cam: { target: new THREE.Vector3(0, SCHOOL_TOP + 1, 0), dist: 21, dir: new THREE.Vector3(0.35, 0.75, 0.56) } },
    { kick: '三年山徑', t: '七至九年級泰雅文化課程', p: stripTags(SCHOOL.stages.replace(/以\s*<b>/g, '【').replace(/\s*<\/b>/g, '】')), cam: { target: school.signPos.clone().setY(SCHOOL_TOP + 1.6), dist: 14, dir: new THREE.Vector3(-0.45, 0.6, 0.66) } },
    ...DIMS.map((d) => ({ kick: `構面${NUM[d.n]}・配分 ${d.weight}`, t: dimName(d), p: d.desc, cam: dimShot(d), color: d.c })),
    { kick: '6-3 學校辦理民族教育之創新與省思', t: '亮點與創新', p: hl.text, cam: { target: i63.pos.clone().setY(i63.top + 0.9), dist: 16, dir: new THREE.Vector3(0.5, 0.7, 0.5) }, rel: '6-3', color: i63.dim.c },
    { kick: '評鑑查核', t: '前次評鑑建議的回應', p: prev.text, cam: { target: i63.pos.clone().setY(i63.top + 0.9), dist: 13, dir: new THREE.Vector3(-0.55, 0.62, 0.55) }, color: '#448361' },
    { kick: '相關指標', t: '小人帶著佐證，在相關指標之間往返', p: `吊橋上的小人依網站內文互相引用的 ${RELATIONS.length} 組指標，帶著招生摺頁、問卷、教案、會議資料、經費統計表等佐證來回走動；穿黃衣的小嚮導則從 1-1 依序走到 6-3。`, cam: { target: new THREE.Vector3(0, 1, 0), dist: 48, dir: new THREE.Vector3(0.3, 0.8, 0.52) } },
    { kick: '開始瀏覽', t: '點平台，看指標內容', p: '點任何一座平台或它的代碼，可以看到指標原文、本頁重點與精選照片；按「閱讀完整內容」可閱讀全文、觀看影片與佐證資料夾。', cam: 'overview' },
  ];
  shots.forEach((s) => { s.dur = Math.min(12, Math.max(6, 2.5 + s.p.length * 0.075)); }); // 慢速：約每秒 13 字的瀏覽速度，每段 6～12 秒
  return shots;
}
// 一般速度＝慢速的 0.8 倍時間（每段約 5～10 秒）；設定記在這台電腦的瀏覽器
const PLAY_SPEED = 0.8;
let playSlow = false, playMusicOn = true;
try { playSlow = localStorage.getItem('eval3d-play-slow') === '1'; playMusicOn = localStorage.getItem('eval3d-play-music') !== '0'; } catch (e) {}
const music = createMusic();
function shotDur(s) { return s.dur * (playSlow ? 1 : PLAY_SPEED); }
function syncMusic() { if (play && playMusicOn && !play.paused) music.start(); else music.stop(); }
function renderPlayToggles() {
  $('#playSlow').setAttribute('aria-pressed', String(playSlow));
  $('#playMusic').setAttribute('aria-pressed', String(playMusicOn));
  $('#playMusic').setAttribute('aria-label', playMusicOn ? '背景配樂：開（按一下關閉）' : '背景配樂：關（按一下開啟）');
}
let play = null; // { shots, k, t, paused }
const playEl = $('#play');
function camFor(s) {
  if (s.cam === 'overview') return overview();
  const pos = s.cam.target.clone().addScaledVector(s.cam.dir.clone().normalize(), s.cam.dist * (isNarrow() ? 1.35 : 1));
  return { pos, target: s.cam.target.clone() };
}
function showShot(k) {
  play.k = k; play.t = 0;
  const s = play.shots[k];
  const c = camFor(s); flyTo(c.pos, c.target, 1.6);
  play.rel = s.rel || null;
  playEl.style.setProperty('--pc', s.color || '#be1e2d');
  $('#playKick').textContent = s.kick; $('#playTitle').textContent = s.t; $('#playText').textContent = s.p;
  $('#playCount').textContent = `${k + 1} / ${play.shots.length}`;
  $('#playBar').style.transform = 'scaleX(0)';
  const cap = $('#playCap'); cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in');
  requestAnimationFrame(updateOffsetTarget);
}
function startPlay() {
  if (tourOn) endTour();
  if (current) closePanel();
  closeList(true); closeViewPanel(); if (route) endRoute(); if (talker) hideBubble();
  setPhoto(false);
  play = { shots: buildPlay(), k: 0, t: 0, paused: false };
  document.body.classList.add('playing'); playEl.hidden = false;
  renderPlayToggles();
  setPlayPaused(false);
  showShot(0);
  $('#playPause').focus();
}
function endPlay() {
  if (!play) return;
  play = null; playEl.hidden = true; document.body.classList.remove('playing');
  syncMusic();
  updateOffsetTarget();
  const o = overview(); flyTo(o.pos, o.target);
  if (location.hash === '#play') history.replaceState(null, '', location.pathname + location.search);
}
function setPlayPaused(p) {
  play.paused = p;
  syncMusic();
  $('#playPause').textContent = p ? '▶ 繼續' : '❚❚ 暫停';
  $('#playPause').setAttribute('aria-label', p ? '繼續播放' : '暫停播放');
}
function updatePlay(dt) {
  if (!play) return;
  const s = play.shots[play.k];
  if (!play.paused && !fly) {
    play.t += dt;
    // 鏡頭緩慢繞著目標轉，讓畫面保持流動
    if (!reduceMotion) {
      const tg = controls.target, a = 0.045 * dt;
      const x = camera.position.x - tg.x, z = camera.position.z - tg.z;
      camera.position.x = tg.x + x * Math.cos(a) - z * Math.sin(a);
      camera.position.z = tg.z + x * Math.sin(a) + z * Math.cos(a);
    }
    if (play.t >= shotDur(s)) {
      if (play.k < play.shots.length - 1) showShot(play.k + 1);
      else { setPlayPaused(true); play.t = shotDur(s); $('#playPause').textContent = '↺ 重播'; play.done = true; }
    }
  }
  $('#playBar').style.transform = `scaleX(${Math.min(1, play.t / shotDur(s))})`;
}
$('#playBtn').addEventListener('click', startPlay);
if (window.__e3d) window.__e3d.playDurs = () => buildPlay().map(shotDur);
$('#playPause').addEventListener('click', () => {
  if (play.done) { play.done = false; setPlayPaused(false); showShot(0); return; }
  setPlayPaused(!play.paused);
});
$('#playPrev').addEventListener('click', () => { play.done = false; showShot(Math.max(0, play.k - 1)); });
$('#playNext').addEventListener('click', () => { play.done = false; if (play.k < play.shots.length - 1) showShot(play.k + 1); });
$('#playExit').addEventListener('click', endPlay);
$('#playSlow').addEventListener('click', () => {
  const f = play ? play.t / shotDur(play.shots[play.k]) : 0; // 切換時保留這一段已播放的比例
  playSlow = !playSlow;
  try { localStorage.setItem('eval3d-play-slow', playSlow ? '1' : '0'); } catch (e) {}
  if (play) play.t = f * shotDur(play.shots[play.k]);
  renderPlayToggles();
});
$('#playMusic').addEventListener('click', () => {
  playMusicOn = !playMusicOn;
  try { localStorage.setItem('eval3d-play-music', playMusicOn ? '1' : '0'); } catch (e) {}
  renderPlayToggles(); syncMusic();
});
addEventListener('keydown', (e) => {
  if (!play) return;
  if (e.key === 'Escape') { endPlay(); e.stopImmediatePropagation(); }
  else if (e.key === ' ') { e.preventDefault(); $('#playPause').click(); }
  else if (e.key === 'ArrowRight') { $('#playNext').click(); e.stopImmediatePropagation(); }
  else if (e.key === 'ArrowLeft') { $('#playPrev').click(); e.stopImmediatePropagation(); }
}, true);
controls.addEventListener('start', () => { if (play && !play.paused) setPlayPaused(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden) music.stop(); else syncMusic(); }); // 切到別的分頁時先停配樂 // 使用者自己拖曳時先暫停

// ───────────────────────── 迴圈
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  for (const L of labels) L.fw = 0;
  updateOffsetTarget();
}
addEventListener('resize', resize);
resize();
{
  const o = overview();
  camera.position.copy(o.pos).add(new THREE.Vector3(0, 14, 16));
  controls.target.copy(o.target);
  flyTo(o.pos, o.target, 2.4);
}
const clock = new THREE.Clock();
const _bub = {};
let first = true, ind_lifting = false;
// 效能：畫面靜止（沒有拖曳、運鏡、自動播放）時每秒最多畫 30 張；關閉動畫時每秒 8 張；
// 每 3 秒量一次實際張數，太慢就逐步降低解析度，最後關掉陰影（學校筆電與投影電腦較順）
let lastFrame = 0, lastActive = 0;
const quality = { pr: Math.min(devicePixelRatio, 2), n: 0, t0: 0, shadows: true };
function wakeOn() { lastActive = performance.now(); }
controls.addEventListener('change', wakeOn);
canvas.addEventListener('pointerdown', wakeOn); canvas.addEventListener('wheel', wakeOn, { passive: true });
addEventListener('resize', wakeOn);
function sampleQuality(now, target) {
  if (document.hidden) { quality.t0 = 0; return; }
  if (!quality.t0) { quality.t0 = now; quality.n = 0; return; }
  quality.n++;
  const el = now - quality.t0;
  if (el < 3000) return;
  const fps = (quality.n * 1000) / el; quality.t0 = now; quality.n = 0;
  if (fps > Math.min(22, target * 0.7)) return;
  if (quality.pr > 1) { quality.pr = Math.max(1, quality.pr - 0.25); renderer.setPixelRatio(quality.pr); renderer.setSize(innerWidth, innerHeight, false); }
  else if (quality.shadows) { quality.shadows = false; sun.castShadow = false; }
}
function loop(now = 0) {
  requestAnimationFrame(loop);
  const animOn = !reduceMotion && opts.motion;
  const busy = !!fly || (play && !play.paused) || now - lastActive < 1200 || first || ind_lifting;
  const gap = busy ? 0 : animOn ? 1000 / 31 : 1000 / 8;
  if (now - lastFrame < gap) return;
  lastFrame = now;
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (fly) {
    const k = Math.min(1, (performance.now() - fly.s) / fly.d), e = ease(k);
    camera.position.lerpVectors(fly.p0, fly.p1, e);
    controls.target.lerpVectors(fly.t0, fly.t1, e);
    if (k >= 1) { fly = null; controls.enabled = true; }
  }
  updatePlay(dt);
  controls.target.x = Math.max(-34, Math.min(34, controls.target.x));
  controls.target.z = Math.max(-34, Math.min(34, controls.target.z));
  controls.target.y = Math.max(0, Math.min(8, controls.target.y));
  controls.update();
  off.x += (off.tx - off.x) * Math.min(1, dt * 7);
  off.y += (off.ty - off.y) * Math.min(1, dt * 7);
  if (Math.abs(off.x) > 0.5 || Math.abs(off.y) > 0.5) camera.setViewOffset(innerWidth, innerHeight, off.x, off.y, innerWidth, innerHeight);
  else camera.clearViewOffset();

  ind_lifting = false;
  for (const ind of INDS) {
    const want = current && current.type === 'ind' && current.key === ind.code ? 0.25 : hovered === ind ? 0.18 : 0;
    ind.lift += (want - ind.lift) * Math.min(1, dt * 8);
    if (Math.abs(want - ind.lift) > 0.003) ind_lifting = true;
    ind.group.position.y = ind.lift;
  }
  if (animOn) {
    for (const f of animated) f(t);
    for (const w of walkers) updateWalker(w, dt, t);
    for (const r of ripples) { const s = (Math.sin(t * 0.8 + r.userData.ph) + 1) * 0.5; r.material.opacity = 0.35; r.scale.x = 0.6 + s * 1.2; }
    for (const c of clouds) { c.position.x += c.userData.v * dt; if (c.position.x > 100) c.position.x = -100; }
  } else for (const w of walkers) updateWalker(w, 0, t);
  const showArcs = !(current && current.type === 'ind');
  if (current && relFocus !== null) setRelFocus(null);
  { const want = current && current.type === 'ind' ? current.key : play && play.rel ? play.rel : relFocus !== null ? 'rel:' + relFocus : null; if (want !== relFor) drawRelated(want); }
  for (const a of relArcs) {
    if (a.delay > 0) a.delay -= dt; else a.prog = Math.min(1, a.prog + dt * (animOn ? 1.4 : 99));
    a.tube.geometry.setDrawRange(0, Math.floor((a.count * a.prog) / 36) * 36);
    a.dot.visible = a.prog > 0.98;
    if (a.dot.visible) a.dot.position.copy(a.curve.getPoint((t * 0.28 + a.ph) % 1));
    a.rings.forEach((rg) => { rg.material.opacity = 0.45 + Math.sin(t * 3 + a.ph * 5) * 0.25; });
  }
  routeRings.forEach((rg, i) => { rg.material.opacity = 0.55 + Math.sin(t * 3 + i) * 0.3; });
  for (const a of routeArcs) {
    a.tube.visible = showArcs; if (!showArcs) { a.dot.visible = false; continue; }
    if (a.delay > 0) a.delay -= dt; else a.prog = Math.min(1, a.prog + dt * (animOn ? 1.2 : 99));
    a.tube.geometry.setDrawRange(0, Math.floor((a.count * a.prog) / 36) * 36);
    a.dot.visible = a.prog > 0.98;
    if (a.dot.visible) a.dot.position.copy(a.curve.getPoint((t * 0.3) % 1));
  }
  if (!reader.isOpen() && !valleyOpen()) {
    renderer.render(scene, camera); placeLabels(); placeWalkerTags();
    sampleQuality(now, busy ? 60 : animOn ? 30 : 8);
    if (talker) {
      if (talker.talk <= 0) hideBubble();
      else {
        _p.set(0, talker.headY + 0.12, 0); talker.g.localToWorld(_p); project(_p, _bub);
        bubble.style.transform = `translate(${_bub.x}px, ${_bub.y}px) translate(-50%, -100%)`;
        bubble.style.visibility = _bub.vis ? 'visible' : 'hidden';
      }
    }
  }
  if (first) { first = false; document.body.classList.add('ready'); }
}
applyOpts();
requestAnimationFrame(loop);
if (location.hash === '#play') setTimeout(startPlay, 1800);

// ───────────────────────── 開場導覽
const TOUR = [
  { t: '歡迎來到評鑑導覽島', p: '這是宜蘭縣立大同國中 115 學年度原住民族實驗教育評鑑的 3D 導覽。湖中央是學校，周圍六座構面島，再以吊橋連到 17 座指標平台。' },
  { t: '旗幟顏色就是構面', p: '每座構面島插著一面旗，顏色對應評鑑構面，旗桿越高代表配分越高。下方的圖例列出六個構面與配分。', cls: 'tour-legend' },
  { t: '移動與縮放', p: '' },
  { t: '點平台，看指標內容', p: '點任何一座平台或它的代碼，右側會出現指標原文、本頁重點與精選照片；地圖上的弧線會連到內文中互相引用的相關指標。按「閱讀完整內容」可以讀全文、看影片和佐證資料夾。' },
  { t: '跟著小人看指標之間的關聯', p: '吊橋上的小人都有任務：老師、學生、文化教師、校友、行政人員和協作中心委員，各自帶著佐證資料（頭上的小圖示），在內文互相引用的兩項指標之間往返；穿黃衣的小嚮導則從 1-1 依序走到 6-3。點小人，他會告訴你帶著什麼、為什麼要送過去。打開某項指標時，只會留下和它有關的小人。' },
  { t: '時間有限？用這些工具', p: '右上角可以「搜尋」全站全文、在「導覽路線」選一條路線或一個「主題串聯」（例如泰雅文化課程、學生學習與成效）跨構面一站一站看，或切換成「全文閱讀」；「自動播放」會帶著字幕依序介紹全島，適合投影，可切換慢速與開關背景配樂；「顯示」可以開關名牌、小人與動畫，也有方便截圖的拍照模式；太陽／月亮按鈕可切換白天、黃昏、夜晚，預設跟著台灣現在的時間變化，晚上島上會點燈。', cls: 'tour-tools' },
];
const tourEl = $('#tour');
let tourOn = false, tourStep = 0;
function renderTour() {
  const st = TOUR[tourStep];
  $('#tourCount').textContent = `${tourStep + 1} / ${TOUR.length}`;
  $('#tourTitle').textContent = st.t;
  $('#tourText').textContent = st.p || (matchMedia('(pointer: coarse)').matches
    ? '單指拖曳旋轉視角、雙指拖曳移動地圖、雙指捏合縮放。點右上角的山形按鈕（全景）可以隨時回到整體視角。'
    : '左鍵拖曳旋轉視角、右鍵拖曳移動地圖、滾輪縮放（會朝滑鼠所在位置拉近）。點右上角的「全景」可以隨時回到整體視角。');
  $('#tourNext').textContent = tourStep === TOUR.length - 1 ? '開始探索' : '下一步 →';
  $('#tourDots').innerHTML = TOUR.map((_, i) => `<span class="${i === tourStep ? 'on' : ''}"></span>`).join('');
  document.body.classList.remove('tour-legend', 'tour-tools');
  if (st.cls) document.body.classList.add(st.cls);
}
function startTour() {
  if (current) closePanel();
  closeList(true);
  tourOn = true; tourStep = 0; tourEl.hidden = false; renderTour();
  $('#tourNext').focus();
}
function endTour() {
  tourOn = false; tourEl.hidden = true;
  document.body.classList.remove('tour-legend', 'tour-tools');
  try { localStorage.setItem('eval3d-tour', '1'); } catch (e) {}
}
$('#tourNext').addEventListener('click', () => { if (tourStep < TOUR.length - 1) { tourStep++; renderTour(); } else endTour(); });
$('#tourSkip').addEventListener('click', endTour);
$('#tourBtn').addEventListener('click', startTour);
addEventListener('keydown', (e) => { if (tourOn && e.key === 'Escape') { endTour(); e.stopImmediatePropagation(); } }, true);

// ───────────────────────── 閱讀頁與網址
const reader = createReader({ DIMS, onClose: backToMap });
let pendingQ = null, pendingSec = null;
const search = createSearch({ titleOf: reader.titleOf, colorOf: reader.colorOf, go: (ref, q, sec) => {
  pendingQ = q; pendingSec = sec;
  if (location.hash === '#p' + ref) { reader.open(ref); highlight(reader.el, q, reader.scroller, sec); pendingQ = null; }
  else location.hash = '#p' + ref;
} });
$('#searchBtn').addEventListener('click', () => search.open());
$('#rdSearch').addEventListener('click', () => search.open());
$('#textBtn').addEventListener('click', () => { location.hash = '#phome'; });
function backToMap(ref) {
  reader.close();
  if (byCode(ref)) openInd(ref);
  else if (/^d[1-6]$/.test(ref)) openDim(+ref[1]);
  else if (ref === 'home') openSchool();
  else history.replaceState(null, '', location.pathname + location.search);
}
function routeHash(initial = false) {
  const h = decodeURIComponent(location.hash);
  let m;
  if (h === '#valley') { if (reader.isOpen()) reader.close(); openValley(); hideHint(); return; }
  closeValley();
  if ((m = /^#p(.+)$/.exec(h))) { if (reader.open(m[1])) { hideHint(); if (pendingQ) { highlight(reader.el, pendingQ, reader.scroller, pendingSec); pendingQ = null; } if (pendingSecText) { scrollToHeading(pendingSecText); pendingSecText = null; } return; } }
  if (reader.isOpen()) reader.close();
  const delay = initial ? 1500 : 0;
  if ((m = /^#i(\d-\d)$/.exec(h)) && byCode(m[1])) setTimeout(() => openInd(m[1], { fromHash: true }), delay);
  else if ((m = /^#d([1-6])$/.exec(h))) setTimeout(() => openDim(+m[1]), delay);
  else if (h === '#school') setTimeout(openSchool, delay);
}
addEventListener('hashchange', () => routeHash());
routeHash(true);
{
  let seen = false;
  try { seen = localStorage.getItem('eval3d-tour') === '1'; } catch (e) {}
  if (!seen && !location.hash) setTimeout(startTour, 2600);
}


