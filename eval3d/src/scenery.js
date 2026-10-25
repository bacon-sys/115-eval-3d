// 台地造景：每個細項一個 low-poly 小物件
import * as THREE from 'three';

const mats = new Map();
export function M(color, opt = {}) {
  const key = color + JSON.stringify(opt);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, ...opt }));
  return mats.get(key);
}
const C = {
  wood: '#7a5a40', woodD: '#55402f', woodL: '#a8835c', bamboo: '#c9b26e', rattan: '#b8935a',
  thatch: '#b59a5f', slate: '#6f6a66', stone: '#9b978d', soil: '#6e4e36', soilL: '#86654a',
  leaf: '#6f9a4f', leafL: '#97b766', millet: '#e0b84a', red: '#b8262f', white: '#f1ebdf', ink: '#2a211b',
  skin: '#b8835c', hair: '#2a211b', fire: '#f08a2a', water: '#79b3c0', jar: '#8a5a3c',
};

// ── 畫布貼圖
const texCache = new Map();
function canvasTex(key, w, h, draw, repeat) {
  if (texCache.has(key)) return texCache.get(key);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  texCache.set(key, t);
  return t;
}
function dia(x, cx, cy, r, fill) { x.beginPath(); x.moveTo(cx, cy - r); x.lineTo(cx + r, cy); x.lineTo(cx, cy + r); x.lineTo(cx - r, cy); x.closePath(); x.fillStyle = fill; x.fill(); }
const textile = (rep = [1, 1]) => canvasTex('textile' + rep, 64, 64, (x) => {
  x.fillStyle = C.red; x.fillRect(0, 0, 64, 64);
  x.fillStyle = C.white; x.fillRect(0, 6, 64, 4); x.fillRect(0, 54, 64, 4);
  dia(x, 32, 32, 18, C.white); dia(x, 32, 32, 12, C.ink); dia(x, 32, 32, 6, C.red); dia(x, 0, 32, 10, C.ink); dia(x, 64, 32, 10, C.ink);
}, rep);
const weave = (base, rep) => canvasTex('weave' + base + rep, 32, 32, (x) => {
  x.fillStyle = base; x.fillRect(0, 0, 32, 32);
  x.fillStyle = 'rgba(0,0,0,.22)';
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) x.fillRect(i * 8, j * 8, 8, 8);
  x.fillStyle = 'rgba(255,255,255,.15)'; for (let i = 0; i < 4; i++) x.fillRect(0, i * 8, 32, 1);
}, rep);
const board = (key, draw) => canvasTex(key, 128, 96, (x, w, h) => {
  x.fillStyle = '#fbf6ea'; x.fillRect(0, 0, w, h); draw(x, w, h);
});
const BOARDS = {
  tree: () => board('tree', (x) => {
    x.strokeStyle = C.ink; x.lineWidth = 4; x.fillStyle = C.red;
    const n = [[64, 18], [34, 50], [94, 50], [20, 80], [48, 80], [80, 80], [108, 80]];
    [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]].forEach(([a, b]) => { x.beginPath(); x.moveTo(...n[a]); x.lineTo(...n[b]); x.stroke(); });
    n.forEach(([cx, cy], i) => { x.beginPath(); x.arc(cx, cy, i ? 7 : 10, 0, 7); x.fillStyle = i ? '#1d2386' : C.red; x.fill(); });
  }),
  q: () => board('q', (x) => { x.fillStyle = '#7a2e8e'; x.font = 'bold 84px sans-serif'; x.textAlign = 'center'; x.fillText('?', 64, 80); }),
  chart: () => board('chart', (x) => {
    x.fillStyle = C.ink; x.fillRect(14, 82, 100, 3); x.fillRect(14, 12, 3, 72);
    [[24, 40, '#0b6e44'], [48, 58, '#e2571c'], [72, 30, '#cc1452'], [96, 66, '#7a2e8e']].forEach(([px, hh, c]) => { x.fillStyle = c; x.fillRect(px, 82 - hh, 16, hh); });
  }),
  plan: () => canvasTex('plan', 128, 96, (x) => {
    x.fillStyle = '#2f4f8a'; x.fillRect(0, 0, 128, 96); x.strokeStyle = '#dfe8f5'; x.lineWidth = 3;
    x.strokeRect(14, 14, 100, 68); x.beginPath(); x.moveTo(14, 48); x.lineTo(70, 48); x.lineTo(70, 82); x.moveTo(70, 30); x.lineTo(114, 30); x.stroke();
  }),
  poster: () => board('poster', (x) => {
    x.fillStyle = C.red; x.fillRect(10, 10, 108, 18);
    x.fillStyle = '#93c493'; x.fillRect(10, 36, 50, 50); x.fillStyle = '#f2ec93'; x.fillRect(68, 36, 50, 22); x.fillStyle = '#f4c3c8'; x.fillRect(68, 64, 50, 22);
  }),
  map: () => canvasTex('map', 128, 128, (x) => {
    x.fillStyle = '#e8dcbc'; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = '#4b7fa0'; x.lineWidth = 5; x.beginPath(); x.moveTo(10, 110); x.bezierCurveTo(50, 80, 60, 50, 118, 20); x.stroke();
    x.strokeStyle = '#be1e2d'; x.lineWidth = 3; x.setLineDash([6, 5]); x.strokeRect(18, 16, 92, 92);
  }),
};

// ── 基本形狀
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
const box = (w, h, d, c, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? M(c) : c, x, y + h / 2, z);
const cyl = (rt, rb, h, c, x, y, z, seg = 7) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof c === 'string' ? M(c) : c, x, y + h / 2, z);
const cone = (r, h, c, x, y, z, seg = 6) => mesh(new THREE.ConeGeometry(r, h, seg), typeof c === 'string' ? M(c) : c, x, y + h / 2, z);
const ico = (r, c, x, y, z, d = 0) => mesh(new THREE.IcosahedronGeometry(r, d), typeof c === 'string' ? M(c) : c, x, y, z);
const G = (...kids) => { const g = new THREE.Group(); kids.flat().forEach((k) => k && g.add(k)); return g; };
const at = (o, x, y, z, ry = 0, s = 1) => { o.position.set(x, y, z); o.rotation.y = ry; o.scale.setScalar(s); return o; };

// 會動的東西
export const animated = [];

export function person({ cloth = C.red, h = 0.56, sit = false, child = false } = {}) {
  const s = child ? 0.7 : 1;
  const g = new THREE.Group();
  const bodyH = h * 0.62 * s;
  const fit = atayalOutfit(cloth);
  const body = cyl(0.09 * s, 0.14 * s, bodyH, fit.mat, 0, 0, 0, 8);
  const stripe = cyl(0.112 * s, 0.118 * s, 0.035 * s, M(fit.belt), 0, bodyH * 0.62, 0, 8);
  const head = ico(0.085 * s, C.skin, 0, bodyH + 0.08 * s, 0, 1);
  const hair = mesh(new THREE.SphereGeometry(0.088 * s, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), M(C.hair), 0, bodyH + 0.09 * s, -0.008);
  g.add(body, stripe, head, hair);
  if (sit) { g.scale.y = 0.75; }
  g.userData.bob = Math.random() * 6;
  g.userData.isPerson = true;
  g.userData.headY = bodyH + 0.18 * s;
  g.traverse((o) => { if (o.isMesh) o.userData.person = g; });
  animated.push((t) => { head.position.y = bodyH + 0.08 * s + Math.sin(t * 2 + g.userData.bob) * 0.006; });
  return g;
}
function thatchRoof(w, d, h, c = C.thatch) {
  const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4); g.scale(w * 1.05, h, d * 1.05); g.translate(0, h / 2, 0);
  return mesh(g, M(c));
}
function hut(w = 0.7, d = 0.55, stilt = 0.18, roof = C.thatch) {
  const g = G();
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(cyl(0.03, 0.03, stilt + 0.35, C.woodD, a * w * 0.42, 0, b * d * 0.42, 5)));
  g.add(box(w * 0.92, 0.04, d * 0.92, C.woodL, 0, stilt, 0));
  g.add(box(w * 0.85, 0.3, d * 0.85, C.wood, 0, stilt + 0.04, 0));
  g.add(box(0.14, 0.2, 0.02, C.ink, 0, stilt + 0.06, d * 0.43));
  g.add(at(thatchRoof(w, d, 0.35, roof), 0, stilt + 0.34, 0));
  return g;
}
function fire(scale = 1) {
  const g = G();
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; g.add(at(ico(0.07, C.stone, 0, 0.05, 0), Math.cos(a) * 0.12, 0.05, Math.sin(a) * 0.12)); }
  const fl = cone(0.07, 0.18, M(C.fire, { emissive: '#e8641a', emissiveIntensity: 0.8 }), 0, 0.02, 0, 5);
  g.add(fl);
  const puffs = [];
  for (let i = 0; i < 4; i++) { const p = ico(0.05, M('#e9e6df', { transparent: true, opacity: 0.6 }), 0, 0.3, 0); p.castShadow = false; puffs.push(p); g.add(p); }
  const off = Math.random() * 10;
  animated.push((t) => {
    fl.scale.set(1, 0.85 + Math.sin(t * 9 + off) * 0.15, 1);
    puffs.forEach((p, i) => {
      const k = ((t * 0.35 + i / puffs.length + off) % 1);
      p.position.set(Math.sin(k * 5 + i) * 0.05, 0.25 + k * 0.9, k * 0.08);
      p.scale.setScalar(0.6 + k * 1.6);
    });
  });
  g.scale.setScalar(scale);
  return g;
}
function milletPlant(x, z, h = 0.38) {
  const g = G(cyl(0.008, 0.012, h, C.leaf, 0, 0, 0, 4));
  const head = ico(0.03, C.millet, 0.04, h, 0); head.scale.set(1, 2.4, 1); head.rotation.z = -0.8; g.add(head);
  g.position.set(x, 0, z); g.rotation.y = x * 9 + z * 7;
  return g;
}
function plot(w, d) {
  const g = G(box(w, 0.05, d, C.soil, 0, 0, 0));
  for (let i = 0; i < 4; i++) g.add(box(w * 0.9, 0.03, 0.05, C.soilL, 0, 0.05, -d / 2 + (i + 0.5) * (d / 4)));
  return g;
}
function basket(r = 0.16, h = 0.28, wide = false) {
  const g = G();
  const b = cyl(r, r * (wide ? 0.85 : 0.6), h, new THREE.MeshStandardMaterial({ map: weave(C.rattan, [4, 2]), roughness: 1 }), 0, 0, 0, 10);
  g.add(b, cyl(r * 1.04, r * 1.04, 0.03, C.woodD, 0, h - 0.03, 0, 10));
  return g;
}
function jar(h = 0.3, c = C.jar) {
  const g = G();
  const body = ico(h * 0.5, c, 0, h * 0.45, 0, 1); body.scale.set(1, 1.05, 1);
  g.add(body, cyl(h * 0.18, h * 0.22, h * 0.2, c, 0, h * 0.85, 0));
  return g;
}
function rack(w = 0.8, h = 0.6) {
  return G(cyl(0.025, 0.03, h, C.woodD, -w / 2, 0, 0, 5), cyl(0.025, 0.03, h, C.woodD, w / 2, 0, 0, 5),
    at(mesh(new THREE.CylinderGeometry(0.02, 0.02, w + 0.1, 5), M(C.wood)), 0, h - 0.02, 0)).rotateX(0);
}
function hangBar(g, w, h) { const bar = g.children[2]; bar.rotation.z = Math.PI / 2; bar.position.y = h - 0.02; return g; }
function signBoard(tex, w = 0.6, h = 0.45) {
  return G(cyl(0.02, 0.025, 0.5, C.woodD, -w * 0.38, 0, -0.02, 5), cyl(0.02, 0.025, 0.5, C.woodD, w * 0.38, 0, -0.02, 5),
    mesh(new THREE.BoxGeometry(w, h, 0.03), [M(C.wood), M(C.wood), M(C.wood), M(C.wood), new THREE.MeshStandardMaterial({ map: tex }), M(C.wood)], 0, 0.42 + h / 2, 0));
}
function easel(tex) {
  const g = signBoard(tex, 0.5, 0.38); g.children[2].rotation.x = -0.15; return g;
}
function bird() {
  const g = G();
  const b = ico(0.07, '#5a4a3a', 0, 0, 0); b.scale.set(1.3, 0.9, 0.9);
  const wing = ico(0.05, '#c0482e', -0.01, 0.02, 0.04); wing.scale.set(1.3, 0.5, 0.5);
  const tail = box(0.1, 0.02, 0.04, '#3a2e24', -0.12, -0.01, 0);
  const beak = cone(0.018, 0.05, '#e0b84a', 0.1, -0.02, 0); beak.rotation.z = -Math.PI / 2;
  g.add(b, wing, tail, beak);
  animated.push((t) => { g.rotation.y = Math.sin(t * 0.7) * 0.6; g.position.y = 0.0 + Math.abs(Math.sin(t * 3)) * 0.02; });
  return G(g);
}
function smallTree(h = 0.7, c = C.leaf) { return G(cyl(0.03, 0.04, h * 0.45, C.woodD, 0, 0, 0, 5), at(ico(h * 0.32, c), 0, h * 0.62, 0)); }
function note() {
  const g = G(ico(0.04, C.ink, 0, 0, 0), box(0.012, 0.16, 0.012, C.ink, 0.034, 0, 0));
  return g;
}
function house(w = 0.85, d = 0.65) {
  const g = G();
  g.add(box(w, 0.32, d, C.woodL, 0, 0, 0));
  for (let i = 0; i < 5; i++) g.add(box(0.02, 0.32, d + 0.01, C.woodD, -w / 2 + (i + 0.5) * (w / 5), 0, 0));
  g.add(box(0.16, 0.24, 0.02, C.ink, 0, 0, d / 2 + 0.005));
  const roof = new THREE.CylinderGeometry(0.0, 0.62, w * 1.15, 3, 1); roof.rotateZ(Math.PI / 2); roof.scale(1, 0.55, d * 1.25); roof.translate(0, 0.42, 0);
  const r = mesh(roof, M(C.slate)); r.rotation.y = 0; g.add(r);
  return g;
}
// 泰雅族風格服裝：紅、白（苧麻）、黑三種底色，衣身織有白黑菱形紋帶
const ATAYAL = { red: '#a8202b', white: '#ece3cf', black: '#2a211b' };
function atayalBase(cloth) {
  const c = String(cloth).toLowerCase();
  if (c === '#f2b705') return { base: c, kind: 'guide' }; // 小嚮導維持黃衣（遊戲線索）
  const hex = c.replace('#', ''); const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  if (r > 200 && g > 190) return { base: ATAYAL.white, kind: 'white' };          // 白、淡黃 → 苧麻白衣
  if (r > 150 && g < 90) return { base: ATAYAL.red, kind: 'red' };                // 紅 → 紅衣
  return { base: ATAYAL.black, kind: 'black' };                                    // 深藍、綠、紫等 → 黑衣
}
// 每個人物輪流使用不同的紋樣與色調，避免大家穿得一模一樣
const TONES = { red: ['#a8202b', '#8c1b26', '#b8342c'], white: ['#ece3cf', '#e2d4b4', '#f2ece0'], black: ['#2a211b', '#3a2f2a', '#1f2a2e'] };
const clothMats = new Map();
let clothN = 0;
function atayalOutfit(cloth) {
  let { kind } = atayalBase(cloth);
  if (kind === 'guide') kind = 'white'; // 非小嚮導的黃衣人物改穿苧麻白衣
  const n = clothN++;
  const v = n % 5, tone = TONES[kind][Math.floor(n / 5) % 3];
  const key = kind + v + tone;
  let m = clothMats.get(key);
  if (!m) {
    const t = canvasTex('atayal-' + key, 64, 64, (x) => {
      const R = ATAYAL.red, W = ATAYAL.white, K = ATAYAL.black;
      const accent = kind === 'red' ? K : R, band = kind === 'white' ? K : W, dark = kind === 'white' ? W : K;
      x.fillStyle = tone; x.fillRect(0, 0, 64, 64);
      const diaRow = (y, r, bg) => { for (const cx of [8, 24, 40, 56]) { dia(x, cx, y, r, dark); dia(x, cx, y, r * 0.5, R); dia(x, cx, y, r * 0.2, bg); } };
      if (v === 0) { // 下擺菱形紋帶
        if (kind === 'white') { x.fillStyle = R; for (const y of [6, 14, 22]) x.fillRect(0, y, 64, 3); } else { x.fillStyle = accent; x.fillRect(0, 8, 64, 3); }
        x.fillStyle = band; x.fillRect(0, 34, 64, 20); x.fillStyle = accent; x.fillRect(0, 32, 64, 2); x.fillRect(0, 54, 64, 2); diaRow(44, 8, band);
      } else if (v === 1) { // 胸前菱形紋帶
        x.fillStyle = band; x.fillRect(0, 10, 64, 18); x.fillStyle = accent; x.fillRect(0, 8, 64, 2); x.fillRect(0, 28, 64, 2); diaRow(19, 7, band);
        x.fillStyle = accent; x.fillRect(0, 52, 64, 3);
      } else if (v === 2) { // 直條紋（苧麻衣常見）
        x.fillStyle = kind === 'red' ? K : R; for (const cx of [4, 20, 36, 52]) x.fillRect(cx, 0, 5, 64);
        x.fillStyle = kind === 'white' ? K : W; for (const cx of [10, 26, 42, 58]) x.fillRect(cx, 0, 2, 64);
      } else if (v === 3) { // 滿版小菱形
        for (let row = 0; row < 4; row++) for (let i = 0; i < 4; i++) { const cx = 8 + i * 16 + (row % 2) * 8, cy = 8 + row * 16; dia(x, cx, cy, 6, band); dia(x, cx, cy, 3, accent); }
      } else { // 雙細帶＋下擺菱形
        x.fillStyle = band; x.fillRect(0, 12, 64, 4); x.fillRect(0, 20, 64, 4); x.fillStyle = accent; x.fillRect(0, 16, 64, 4);
        x.fillStyle = band; x.fillRect(0, 40, 64, 14); diaRow(47, 6, band);
      }
    }, [3, 1]);
    m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, flatShading: true });
    clothMats.set(key, m);
  }
  const sleeve = v === 3 && kind !== 'white' ? ATAYAL.white : v === 2 && kind === 'white' ? ATAYAL.white : tone;
  const belt = v === 1 ? (kind === 'red' ? ATAYAL.white : ATAYAL.red) : kind === 'red' ? ATAYAL.black : ATAYAL.red;
  return { mat: m, sleeve, belt };
}
function atayalCloth(cloth) { return atayalOutfit(cloth).mat; }

function textileStrip(w, h, rep) {
  return mesh(new THREE.BoxGeometry(w, h, 0.015), new THREE.MeshStandardMaterial({ map: textile(rep), roughness: 1 }));
}

// ── 細項造景（回傳物件與標籤高度）
const B = {
  '開墾與播種': () => {
    const g = G(plot(0.85, 0.65));
    for (let i = 0; i < 8; i++) g.add(at(cone(0.025, 0.08, C.leafL), -0.32 + (i % 4) * 0.21, 0.05, -0.2 + Math.floor(i / 4) * 0.33));
    g.add(at(cyl(0.035, 0.045, 0.14, '#3a2e26', 0, 0, 0, 5), 0.48, 0, 0.18), at(cyl(0.03, 0.04, 0.1, '#3a2e26', 0, 0, 0, 5), 0.46, 0, -0.2));
    g.add(at(person({ cloth: C.red }), -0.48, 0, 0.1));
    return [g, 0.75];
  },
  '育苗除疏及間作管理': () => {
    const g = G(plot(0.8, 0.55));
    for (let i = 0; i < 12; i++) g.add(milletPlant(-0.33 + (i % 4) * 0.22, -0.18 + Math.floor(i / 4) * 0.18));
    const pole = cyl(0.02, 0.025, 0.85, C.bamboo, 0.48, 0, -0.1, 5);
    const rope = box(0.5, 0.008, 0.008, C.woodD, 0.24, 0.78, -0.1);
    g.add(pole, rope);
    for (let i = 0; i < 3; i++) { const tube = cyl(0.02, 0.02, 0.14, C.bamboo, 0.12 + i * 0.12, 0.6, -0.1, 5); g.add(tube); animated.push((t) => { tube.rotation.z = Math.sin(t * 3 + i) * 0.25; }); }
    return [g, 1.0];
  },
  '苧麻栽植與管理': () => {
    const g = G(plot(0.75, 0.55));
    for (let i = 0; i < 7; i++) {
      const x = -0.28 + (i % 4) * 0.19, z = -0.15 + Math.floor(i / 4) * 0.28;
      g.add(cyl(0.01, 0.014, 0.6, C.leaf, x, 0.05, z, 4));
      for (let k = 0; k < 3; k++) { const lf = ico(0.07, k % 2 ? C.leafL : '#b9c9a6', x + 0.04, 0.3 + k * 0.12, z); lf.scale.set(1.2, 0.3, 0.8); lf.rotation.y = k * 2; g.add(lf); }
    }
    return [g, 0.85];
  },
  '三石灶與工寮': () => [G(at(hut(0.7, 0.55, 0.12), -0.12, 0, -0.08), at(fire(), 0.42, 0, 0.28)), 1.0],
  '播種祭': () => {
    const g = G(plot(0.55, 0.45));
    for (let i = 0; i < 6; i++) g.add(at(cone(0.022, 0.06, C.leafL), -0.18 + (i % 3) * 0.18, 0.05, -0.1 + Math.floor(i / 3) * 0.2));
    g.add(at(person({ cloth: C.red }), 0.4, 0, 0), at(person({ cloth: C.white }), 0.4, 0, -0.28), at(basket(0.07, 0.1), 0.25, 0, 0.25));
    return [g, 0.75];
  },
  '收割祭': () => {
    const g = hangBar(rack(0.75, 0.62), 0.75, 0.62);
    for (let i = 0; i < 4; i++) { const s = cyl(0.05, 0.025, 0.24, C.millet, -0.27 + i * 0.18, 0.34, 0, 6); g.add(s); }
    g.add(at(person({ cloth: C.red }), 0.05, 0, 0.34));
    return [g, 0.85];
  },
  '感恩祖靈祭': () => {
    const g = G(fire(1.2));
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; g.add(at(person({ cloth: i % 2 ? C.white : C.red }), Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36, -a + Math.PI / 2)); }
    return [g, 0.8];
  },
  '小米醃肉': () => [G(jar(0.32, '#6b4a33'), at(box(0.22, 0.03, 0.14, C.woodL, 0, 0, 0), 0.25, 0, 0.12), at(box(0.12, 0.03, 0.06, '#c86f63', 0, 0, 0), 0.25, 0.03, 0.12)), 0.6],
  '小米酒': () => [G(jar(0.38, C.jar), at(jar(0.26, '#9a6a48'), 0.24, 0, 0.1), at(cyl(0.03, 0.03, 0.12, C.bamboo, 0, 0, 0, 6), -0.2, 0, 0.16)), 0.65],
  '小米糕': () => {
    const g = G(box(0.5, 0.06, 0.36, C.woodL, 0, 0, 0));
    for (let i = 0; i < 3; i++) { const lf = box(0.14, 0.01, 0.12, C.leaf, -0.15 + i * 0.15, 0.06, 0); g.add(lf, cyl(0.05, 0.055, 0.05, '#e8c867', -0.15 + i * 0.15, 0.07, 0, 8)); }
    return [g, 0.45];
  },
  '米篩': () => {
    const sieve = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 14), new THREE.MeshStandardMaterial({ map: weave(C.bamboo, [5, 5]), roughness: 1 }), 0, 0.33, 0);
    sieve.rotation.x = 1.15;
    const g = G(sieve, cyl(0.02, 0.02, 0.32, C.woodD, 0, 0, -0.14, 5), box(0.4, 0.02, 0.1, C.soilL, 0, 0, 0.2));
    for (let i = 0; i < 6; i++) g.add(at(ico(0.02, C.millet), -0.12 + i * 0.05, 0.03, 0.2));
    return [g, 0.75];
  },
  '杵臼': () => {
    const pestle = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), M(C.woodL), 0.03, 0.55, 0); pestle.rotation.z = 0.15;
    return [G(cyl(0.16, 0.13, 0.3, C.wood, 0, 0, 0, 8), cyl(0.12, 0.12, 0.02, C.woodD, 0, 0.29, 0, 8), pestle), 1.0];
  },
  '蒸桶': () => [G(at(fire(0.9), 0, 0, 0), cyl(0.17, 0.14, 0.34, C.woodL, 0, 0.12, 0, 9), cyl(0.18, 0.18, 0.03, C.woodD, 0, 0.3, 0, 9), cyl(0.18, 0.18, 0.03, C.woodD, 0, 0.16, 0, 9)), 0.8],
  '傳統織布器具': () => {
    const g = G(cyl(0.025, 0.025, 0.55, C.wood, -0.3, 0, 0, 5), cyl(0.025, 0.025, 0.55, C.wood, 0.3, 0, 0, 5));
    const bar1 = box(0.7, 0.04, 0.04, C.woodD, 0, 0.5, 0), bar2 = box(0.7, 0.04, 0.04, C.woodD, 0, 0.1, 0.3);
    const warp = textileStrip(0.5, 0.48, [2, 2]); warp.position.set(0, 0.33, 0.15); warp.rotation.x = -0.65;
    g.add(bar1, bar2, warp);
    return [g, 0.8];
  },
  '女用背簍': () => [G(basket(0.2, 0.4), at(box(0.03, 0.3, 0.015, C.woodD, 0, 0, 0), -0.08, 0.12, -0.17), at(box(0.03, 0.3, 0.015, C.woodD, 0, 0, 0), 0.08, 0.12, -0.17)), 0.65],
  '置物籃': () => [G(at(basket(0.19, 0.14, true), -0.14, 0, 0), at(basket(0.13, 0.1, true), 0.2, 0, 0.08)), 0.45],
  '數位工具應用': () => {
    const tab = box(0.2, 0.14, 0.015, M('#7fb6e0', { emissive: '#3a78b8', emissiveIntensity: 0.6 }), 0, 0.33, 0); tab.rotation.x = -0.4;
    return [G(box(0.45, 0.03, 0.3, C.woodL, 0, 0.27, 0), cyl(0.02, 0.02, 0.27, C.woodD, -0.18, 0, 0, 4), cyl(0.02, 0.02, 0.27, C.woodD, 0.18, 0, 0, 4), tab, at(person({ cloth: C.red }), 0, 0, 0.3, Math.PI)), 0.8];
  },
  '表達能力練習': () => [G(box(0.22, 0.32, 0.18, C.wood, 0, 0, 0), at(person({ cloth: '#1d2386' }), 0, 0, -0.2), at(person({ cloth: C.red, child: true }), -0.3, 0, 0.32, Math.PI), at(person({ cloth: C.white, child: true }), 0.25, 0, 0.36, Math.PI)), 0.75],
  '學習成果分享': () => [G(easel(BOARDS.poster()), at(person({ cloth: C.red }), 0.38, 0, 0.12)), 0.95],

  '苧麻製線工序': () => {
    const g = hangBar(rack(0.8, 0.62), 0.8, 0.62);
    for (let i = 0; i < 5; i++) { const sk = cyl(0.03, 0.05, 0.28, i === 3 ? C.red : '#e8e2d2', -0.3 + i * 0.15, 0.32, 0, 6); g.add(sk); }
    g.add(at(cyl(0.14, 0.12, 0.16, '#5a4a3c', 0, 0, 0, 8), 0.3, 0, 0.32), at(cyl(0.12, 0.12, 0.02, '#9a2a2a', 0, 0, 0, 8), 0.3, 0.15, 0.32));
    return [g, 0.85];
  },
  'gaga與傳統信仰': () => {
    const g = G(cyl(0.03, 0.04, 0.75, C.woodD, 0, 0, 0, 5), box(0.4, 0.025, 0.025, C.woodD, 0.05, 0.72, 0));
    g.add(at(bird(), 0.1, 0.8, 0), at(fire(0.8), -0.32, 0, 0.25));
    return [g, 1.1];
  },
  'gaga與人的一生': () => [G(at(person({ cloth: C.red }), -0.2, 0, 0), at(person({ cloth: C.white, h: 0.6 }), 0.05, 0, -0.05), at(person({ cloth: C.red, child: true }), 0.28, 0, 0.1), at(person({ cloth: '#e8c867', child: true, h: 0.4 }), -0.02, 0, 0.25)), 0.7],
  '家的發展與族譜建置': () => [G(at(house(0.75, 0.55), -0.15, 0, -0.1), at(signBoard(BOARDS.tree(), 0.42, 0.32), 0.42, 0, 0.3, -0.5)), 1.0],
  'gaga團體與部落組織': () => {
    const g = G();
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(cyl(0.03, 0.03, 0.5, C.woodD, a * 0.34, 0, b * 0.28, 5)));
    g.add(at(thatchRoof(0.85, 0.72, 0.3), 0, 0.5, 0));
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.add(at(person({ cloth: i % 2 ? C.white : C.red, sit: true }), Math.cos(a) * 0.2, 0, Math.sin(a) * 0.17, -a + Math.PI / 2)); }
    return [g, 0.95];
  },
  '泰雅傳統服飾': () => {
    const cloth = textileStrip(0.42, 0.42, [2, 2]); cloth.position.set(0, 0.42, 0);
    return [G(cyl(0.025, 0.03, 0.7, C.woodD, 0, 0, -0.03, 5), box(0.55, 0.03, 0.03, C.woodD, 0, 0.64, -0.03), cloth,
      at(box(0.1, 0.02, 0.02, C.white, 0, 0, 0), -0.12, 0.2, 0.01), at(ico(0.03, '#e8e2d2'), 0.14, 0.2, 0.02)), 0.95];
  },
  '編織工藝器具': () => {
    const box1 = box(0.5, 0.16, 0.22, C.wood, 0, 0, 0);
    const bow = mesh(new THREE.TorusGeometry(0.2, 0.015, 4, 10, Math.PI), M(C.woodD), 0.1, 0.18, 0.22); bow.rotation.y = 0.2;
    return [G(box1, box(0.44, 0.02, 0.18, C.woodD, 0, 0.16, 0), bow), 0.55];
  },
  '布匹織作': () => {
    const g = G(at(person({ cloth: C.red, sit: true }), 0, 0, 0.32, Math.PI));
    const cloth = textileStrip(0.36, 0.7, [1.5, 3]); cloth.rotation.x = -Math.PI / 2 + 0.25; cloth.position.set(0, 0.22, -0.05);
    g.add(cloth, box(0.5, 0.12, 0.14, C.wood, 0, 0.02, 0.22), cyl(0.03, 0.03, 0.45, C.woodD, 0, 0, -0.42, 5), box(0.45, 0.03, 0.03, C.woodD, 0, 0.4, -0.42));
    return [g, 0.75];
  },
  '肩背帶': () => { const s = textileStrip(0.1, 0.55, [0.5, 3]); s.position.set(0, 0.45, 0); return [G(cyl(0.025, 0.03, 0.8, C.woodD, 0, 0, -0.02, 5), box(0.24, 0.025, 0.025, C.woodD, 0, 0.76, -0.02), s), 1.0]; },
  '腰帶': () => { const r = mesh(new THREE.TorusGeometry(0.14, 0.04, 4, 14), new THREE.MeshStandardMaterial({ map: textile([3, 0.5]) }), 0, 0.2, 0); r.rotation.x = Math.PI / 2; return [G(cyl(0.1, 0.12, 0.16, C.woodL, 0, 0, 0, 8), r), 0.5]; },
  '頭帶': () => {
    const r = mesh(new THREE.TorusGeometry(0.11, 0.03, 4, 14), new THREE.MeshStandardMaterial({ map: textile([3, 0.5]) }), 0, 0.42, 0); r.rotation.x = Math.PI / 2;
    return [G(cyl(0.025, 0.03, 0.32, C.woodD, 0, 0, 0, 5), ico(0.1, '#d8c7a8', 0, 0.42, 0, 1), r), 0.7];
  },
  '資料蒐集技巧': () => {
    const g = G(box(0.28, 0.05, 0.2, '#1d2386', 0, 0, 0), box(0.26, 0.05, 0.19, C.red, 0.02, 0.05, 0), box(0.25, 0.05, 0.18, '#0b6e44', -0.01, 0.1, 0));
    const lens = mesh(new THREE.TorusGeometry(0.08, 0.015, 5, 12), M(C.ink), 0.22, 0.25, 0.1); lens.rotation.y = 0.6;
    g.add(lens, at(person({ cloth: C.red }), -0.32, 0, 0.12));
    return [g, 0.7];
  },
  '問題意識培養': () => [G(signBoard(BOARDS.q(), 0.42, 0.4)), 1.0],

  '穀倉': () => {
    const g = G();
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { g.add(cyl(0.03, 0.03, 0.4, C.woodD, a * 0.2, 0, b * 0.2, 5), cyl(0.08, 0.08, 0.02, C.slate, a * 0.2, 0.26, b * 0.2, 8)); });
    g.add(box(0.55, 0.36, 0.55, C.woodL, 0, 0.4, 0), at(thatchRoof(0.66, 0.66, 0.42), 0, 0.76, 0));
    return [g, 1.35];
  },
  '家屋': () => [G(house(0.8, 0.6)), 0.95],
  '瞭望台': () => {
    const g = G();
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(cyl(0.025, 0.035, 1.25, C.woodD, a * 0.16, 0, b * 0.16, 5)));
    g.add(box(0.46, 0.04, 0.46, C.woodL, 0, 0.95, 0), box(0.46, 0.12, 0.02, C.wood, 0, 0.99, 0.22), box(0.46, 0.12, 0.02, C.wood, 0, 0.99, -0.22));
    g.add(at(thatchRoof(0.52, 0.52, 0.28), 0, 1.25, 0), at(person({ cloth: C.red, h: 0.4 }), 0, 0.99, 0));
    const ladder = box(0.12, 1.0, 0.02, C.wood, 0, 0, 0); ladder.position.set(0, 0.5, 0.3); ladder.rotation.x = -0.25; g.add(ladder);
    return [g, 1.7];
  },
  '工寮': () => [G(hut(0.6, 0.48, 0.1)), 0.95],
  '狩獵生態與體驗': () => {
    const boar = G(box(0.36, 0.18, 0.18, '#4a3a2e', 0, 0.08, 0), box(0.14, 0.13, 0.13, '#3e3027', 0.22, 0.1, 0), box(0.04, 0.06, 0.06, '#c9a98a', 0.3, 0.1, 0));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => boar.add(box(0.04, 0.09, 0.04, '#3e3027', a * 0.12, 0, b * 0.06)));
    animated.push((t) => { boar.position.x = Math.sin(t * 0.5) * 0.12; boar.rotation.y = Math.cos(t * 0.5) > 0 ? 0 : Math.PI; });
    return [G(boar, at(smallTree(0.75, '#5f8a48'), -0.4, 0, -0.2), at(person({ cloth: C.red }), -0.3, 0, 0.3, 0.8)), 0.75];
  },
  '漁撈生態與體驗': () => {
    const g = G(cyl(0.38, 0.38, 0.03, M(C.water, { roughness: 0.3 }), 0, 0, 0, 12), at(ico(0.08, C.stone), 0.32, 0.04, -0.18), at(ico(0.06, C.stone), -0.3, 0.03, 0.2));
    for (let i = 0; i < 3; i++) { const f = box(0.08, 0.025, 0.03, '#e2843a', 0, 0.035, 0); g.add(f); animated.push((t) => { const a = t * 0.8 + i * 2.1; f.position.set(Math.cos(a) * 0.2, 0.035, Math.sin(a) * 0.16); f.rotation.y = -a; }); }
    g.add(at(person({ cloth: C.white }), 0.42, 0, 0.18, -1.2));
    return [g, 0.65];
  },
  '泰雅族起源與遷徙': () => {
    const r1 = ico(0.42, '#8f8b80', -0.12, 0.38, 0, 0); r1.scale.set(0.6, 1.1, 0.8); r1.rotation.z = 0.12;
    const r2 = ico(0.4, '#9d998e', 0.16, 0.36, 0.02, 0); r2.scale.set(0.55, 1.05, 0.8); r2.rotation.z = -0.1;
    return [G(r1, r2, at(smallTree(0.5, '#5f8a48'), 0.45, 0, 0.25)), 1.25];
  },
  '部落山川與傳統領域': () => {
    const g = G(box(0.7, 0.04, 0.55, C.woodL, 0, 0.25, 0), cyl(0.025, 0.025, 0.25, C.woodD, -0.28, 0, 0, 4), cyl(0.025, 0.025, 0.25, C.woodD, 0.28, 0, 0, 4));
    const top = mesh(new THREE.BoxGeometry(0.66, 0.01, 0.5), new THREE.MeshStandardMaterial({ map: BOARDS.map() }), 0, 0.295, 0); g.add(top);
    g.add(at(cone(0.1, 0.16, '#6f8f5a'), -0.12, 0.29, -0.08), at(cone(0.08, 0.12, '#7b9a62'), 0.05, 0.29, -0.12));
    g.add(cyl(0.006, 0.006, 0.16, C.ink, 0.2, 0.29, 0.12, 3), box(0.06, 0.04, 0.005, C.red, 0.23, 0.42, 0.12));
    return [g, 0.75];
  },
  '部落的族群關係': () => [G(at(hut(0.42, 0.34, 0.06), -0.3, 0, -0.15, 0.3), at(hut(0.42, 0.34, 0.06, '#8a7a5a'), 0.32, 0, -0.1, -0.3), at(person({ cloth: C.red }), -0.1, 0, 0.25, 0.9), at(person({ cloth: '#1d2386' }), 0.12, 0, 0.25, -0.9)), 0.8],
  '口簧琴': () => {
    const g = G(at(person({ cloth: C.red }), 0, 0, 0), box(0.12, 0.015, 0.02, C.bamboo, 0.0, 0.42, 0.1));
    const n1 = note(), n2 = note(); g.add(n1, n2);
    animated.push((t) => { n1.position.set(0.15 + Math.sin(t) * 0.03, 0.55 + ((t * 0.3) % 0.4), 0.05); n2.position.set(-0.12, 0.6 + (((t * 0.3) + 0.2) % 0.4), 0.02); });
    return [g, 1.0];
  },
  '漁筌': () => {
    const trap = mesh(new THREE.ConeGeometry(0.14, 0.55, 9, 1, true), new THREE.MeshStandardMaterial({ map: weave(C.bamboo, [4, 3]), side: THREE.DoubleSide, roughness: 1 }), 0, 0.14, 0);
    trap.rotation.z = Math.PI / 2;
    return [G(cyl(0.3, 0.3, 0.02, M(C.water, { roughness: 0.3 }), -0.05, 0, 0, 10), trap), 0.5];
  },
  '弓箭': () => {
    const bow = mesh(new THREE.TorusGeometry(0.3, 0.018, 4, 12, Math.PI * 0.8), M(C.woodD), 0, 0.42, 0); bow.rotation.z = Math.PI / 2 + Math.PI * 0.1;
    const string = box(0.006, 0.5, 0.006, '#e8e2d2', -0.06, 0.17, 0);
    const g = G(cyl(0.02, 0.025, 0.75, C.wood, -0.25, 0, -0.04, 5), bow, string);
    for (let i = 0; i < 3; i++) { const a = cyl(0.008, 0.008, 0.45, C.woodL, 0.22 + i * 0.05, 0, 0.1, 4); a.rotation.z = 0.1; g.add(a); }
    g.add(cyl(0.06, 0.05, 0.24, C.rattan, 0.27, 0, 0.1, 7));
    return [g, 0.9];
  },
  '藤帽': () => {
    const hat = mesh(new THREE.SphereGeometry(0.15, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: weave(C.rattan, [4, 2]), roughness: 1 }), 0, 0.46, 0);
    return [G(cyl(0.025, 0.03, 0.46, C.woodD, 0, 0, 0, 5), hat, cyl(0.17, 0.17, 0.015, C.woodD, 0, 0.46, 0, 10)), 0.75];
  },
  '背簍': () => [G(basket(0.22, 0.46), at(box(0.03, 0.34, 0.015, C.woodD, 0, 0, 0), -0.09, 0.14, -0.19), at(box(0.03, 0.34, 0.015, C.woodD, 0, 0, 0), 0.09, 0.14, -0.19)), 0.7],
  '研究主題': () => [G(cyl(0.015, 0.015, 0.75, C.woodD, 0, 0, 0, 4), box(0.26, 0.16, 0.01, '#7a2e8e', 0.13, 0.55, 0)), 0.9],
  '問題與假設': () => [G(signBoard(BOARDS.q(), 0.38, 0.34)), 0.95],
  '研究設計': () => [G(easel(BOARDS.plan())), 0.95],
  '資料蒐集與紀錄': () => {
    const g = G();
    for (let i = 0; i < 3; i++) { const l = cyl(0.01, 0.01, 0.45, C.ink, 0, 0, 0, 3); const a = (i / 3) * Math.PI * 2; l.position.set(Math.cos(a) * 0.08, 0.2, Math.sin(a) * 0.08); l.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3); g.add(l); }
    g.add(box(0.14, 0.09, 0.08, C.ink, 0, 0.43, 0), cyl(0.03, 0.03, 0.06, '#555', 0, 0, 0, 8).rotateX(Math.PI / 2).translateY(0.0));
    g.children[g.children.length - 1].position.set(0, 0.475, 0.07);
    g.add(at(person({ cloth: C.red }), -0.25, 0, -0.05, 0.5));
    return [g, 0.75];
  },
  '資料分析與整理': () => [G(signBoard(BOARDS.chart(), 0.44, 0.34)), 0.95],
  '成果發表': () => [G(box(0.2, 0.3, 0.16, C.wood, 0, 0, 0.1), at(person({ cloth: '#7a2e8e' }), 0, 0, -0.1), at(easel(BOARDS.poster()), 0.35, 0, -0.15, -0.4)), 0.95],
};

export function buildItem(name, accent) {
  const f = B[name];
  if (!f) {
    const g = G(cyl(0.06, 0.07, 0.5, C.woodD, 0, 0, 0, 6), at(ico(0.18, accent), 0, 0.68, 0));
    return { obj: g, h: 1.0 };
  }
  const [obj, h] = f();
  return { obj, h };
}

// 會走路的人：雙腿、手臂可擺動
export function makeWalker({ cloth = C.red, child = false, guide = false } = {}) {
  const s = child ? 0.75 : 1;
  const g = new THREE.Group();
  const legLen = 0.2 * s, bodyH = 0.3 * s;
  const mkLimb = (len, w, color, x, y) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0);
    const geo = new THREE.BoxGeometry(w, len, w); geo.translate(0, -len / 2, 0);
    const m = new THREE.Mesh(geo, M(color)); m.castShadow = true; pivot.add(m);
    g.add(pivot); return pivot;
  };
  const legL = mkLimb(legLen, 0.055 * s, '#3a2e26', -0.045 * s, legLen);
  const legR = mkLimb(legLen, 0.055 * s, '#3a2e26', 0.045 * s, legLen);
  const fit = guide ? null : atayalOutfit(cloth);
  const body = cyl(0.085 * s, 0.12 * s, bodyH, guide ? M(cloth) : fit.mat, 0, legLen - 0.01, 0, 8);
  const stripe = cyl(0.104 * s, 0.108 * s, 0.035 * s, M(guide ? C.red : fit.belt), 0, legLen + bodyH * 0.62, 0, 8);
  g.add(body, stripe);
  const sl = guide ? cloth : fit.sleeve;
  const armL = mkLimb(0.2 * s, 0.04 * s, sl, -0.11 * s, legLen + bodyH * 0.92);
  const armR = mkLimb(0.2 * s, 0.04 * s, sl, 0.11 * s, legLen + bodyH * 0.92);
  const head = new THREE.Group(); head.position.set(0, legLen + bodyH + 0.08 * s, 0);
  head.add(ico(0.085 * s, C.skin, 0, 0, 0, 1));
  const hair = mesh(new THREE.SphereGeometry(0.088 * s, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), M(C.hair), 0, 0.012, -0.008);
  head.add(hair);
  if (guide) {
    head.add(cyl(0.092 * s, 0.092 * s, 0.035, M(C.red), 0, 0.02, 0, 8));
    const bk = basket(0.09, 0.2); bk.position.set(0, legLen + bodyH * 0.25, -0.13); g.add(bk);
  }
  g.add(head);
  g.userData.isPerson = true;
  g.userData.headY = legLen + bodyH + 0.2 * s;
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.person = g; } });
  return { g, legL, legR, armL, armR, head };
}

// 給 app 使用
export { person as makePerson, box, cyl, cone, ico, G, at, C, mesh, signBoard, easel, BOARDS, canvasTex, dia, textileStrip, thatchRoof, hut, house, fire, milletPlant, plot, basket, jar, rack, hangBar, smallTree, bird, textile, weave };
