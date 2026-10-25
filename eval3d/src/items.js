// 17 項指標平台上的主題造景（平台半徑約 2.4，頂面 y = 0）
import * as THREE from 'three';
import {
  M, box, cyl, cone, ico, G, at, C, mesh, signBoard, easel, BOARDS, canvasTex, buildItem, makePerson as person,
  basket, smallTree, hut, house, fire, textileStrip, animated,
} from './scenery.js';

const item = (name, x, z, ry = 0, s = 1.5) => { const { obj } = buildItem(name, '#888'); return at(obj, x, 0, z, ry, s); };
const P = (cloth, x, z, ry = 0, s = 1.5, opt = {}) => at(person({ cloth, ...opt }), x, 0, z, ry, s);

function flag(color, h = 1.5) {
  const g = G(cyl(0.025, 0.03, h, C.woodD, 0, 0, 0, 5));
  const f = box(0.42, 0.26, 0.02, M(color), 0, 0, 0);
  f.geometry.translate(0.21, 0, 0);
  f.position.set(0.02, h - 0.3, 0);
  g.add(f);
  const off = Math.random() * 6;
  animated.push((t) => { f.rotation.y = Math.sin(t * 2.2 + off) * 0.35; });
  return g;
}
function bigTree(s = 1) {
  return G(cyl(0.09 * s, 0.14 * s, 1.0 * s, C.woodD, 0, 0, 0, 6),
    at(ico(0.62 * s, '#5f8f47'), 0, 1.25 * s, 0), at(ico(0.45 * s, '#76a456'), 0.25 * s, 1.6 * s, 0.1 * s), at(ico(0.38 * s, '#6b9a50'), -0.3 * s, 1.45 * s, -0.15 * s));
}
function books(n = 3, colors = ['#1d2386', '#be1e2d', '#0b6e44', '#c58b10']) {
  const g = G();
  for (let i = 0; i < n; i++) { const b = box(0.36, 0.08, 0.26, colors[i % colors.length], 0, i * 0.08, 0); b.rotation.y = (i % 2 ? 0.12 : -0.08); g.add(b); }
  return g;
}
const docTex = () => canvasTex('doc', 128, 160, (x, w, h) => {
  x.fillStyle = '#fbf6ea'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#be1e2d'; x.fillRect(16, 16, 60, 10);
  x.fillStyle = '#9a8f80'; for (let i = 0; i < 9; i++) x.fillRect(16, 40 + i * 12, i % 3 === 2 ? 64 : 96, 4);
  x.strokeStyle = '#be1e2d'; x.lineWidth = 4; x.beginPath(); x.arc(98, 134, 14, 0, 7); x.stroke();
});
const boardTex = () => canvasTex('blackboard', 160, 96, (x, w, h) => {
  x.fillStyle = '#2f5a46'; x.fillRect(0, 0, w, h);
  x.strokeStyle = '#e8efe6'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(20, 30); x.lineTo(70, 30); x.moveTo(20, 48); x.lineTo(100, 48); x.moveTo(20, 66); x.lineTo(60, 66); x.stroke();
  const d = (cx, cy, r) => { x.beginPath(); x.moveTo(cx, cy - r); x.lineTo(cx + r, cy); x.lineTo(cx, cy + r); x.lineTo(cx - r, cy); x.closePath(); x.stroke(); };
  d(124, 48, 20); d(124, 48, 10);
});
function plaque(tex, w, h, x, y, z, ry = 0, tilt = 0) {
  const m = mesh(new THREE.BoxGeometry(w, h, 0.04), [M(C.wood), M(C.wood), M(C.wood), M(C.wood), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), M(C.wood)], x, y, z);
  m.rotation.set(tilt, ry, 0);
  return m;
}
function arrowSign(colors) {
  const g = G(cyl(0.035, 0.045, 1.5, C.woodD, 0, 0, 0, 6));
  colors.forEach((c, i) => {
    const a = G(box(0.5, 0.13, 0.04, c, 0.2, 0, 0));
    const tip = cone(0.1, 0.14, c, 0, 0, 0, 3); tip.rotation.z = -Math.PI / 2; tip.position.set(0.5, 0.065, 0); a.add(tip);
    a.position.y = 1.25 - i * 0.24; a.rotation.y = i * 1.6 - 0.6;
    g.add(a);
  });
  return g;
}
function globe() {
  const tex = canvasTex('globe', 128, 64, (x, w, h) => {
    x.fillStyle = '#5f9cc4'; x.fillRect(0, 0, w, h); x.fillStyle = '#88b36a';
    [[20, 20, 18, 12], [56, 30, 14, 20], [90, 18, 22, 14], [100, 42, 10, 8], [30, 44, 10, 8]].forEach(([a, b, c, d]) => { x.beginPath(); x.ellipse(a, b, c, d, 0, 0, 7); x.fill(); });
  });
  const sp = mesh(new THREE.SphereGeometry(0.3, 14, 10), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), 0, 0.72, 0);
  animated.push((t) => { sp.rotation.y = t * 0.4; });
  const ring = mesh(new THREE.TorusGeometry(0.34, 0.015, 4, 20, Math.PI), M('#c9a24a'), 0, 0.72, 0); ring.rotation.z = Math.PI / 2;
  return G(cyl(0.12, 0.16, 0.06, C.woodD, 0, 0, 0, 8), cyl(0.025, 0.025, 0.4, C.woodD, 0, 0.05, 0, 5), sp, ring);
}
function bars(heights, color) {
  const g = G(box(1.2, 0.04, 0.5, C.woodL, 0, 0, 0));
  heights.forEach((h, i) => g.add(box(0.26, h, 0.3, M(color), -0.38 + i * 0.38, 0.04, 0)));
  return g;
}
function coins(n) { const g = G(); for (let i = 0; i < n; i++) g.add(cyl(0.11, 0.11, 0.035, M('#d9b443', { metalness: 0.4, roughness: 0.4 }), (i % 2) * 0.01, i * 0.036, 0, 12)); return g; }
function scales() {
  const pan = (x) => G(cyl(0.005, 0.005, 0.3, C.ink, x, -0.3, 0, 3), cyl(0.18, 0.12, 0.04, M('#c9a24a', { metalness: 0.3 }), x, -0.34, 0, 10));
  const top = G(box(0.9, 0.04, 0.04, '#7a6a52', 0, -0.02, 0), pan(-0.42), pan(0.42));
  top.position.y = 1.0;
  animated.push((t) => { top.rotation.z = Math.sin(t * 0.8) * 0.06; });
  return G(cyl(0.16, 0.2, 0.06, C.woodD, 0, 0, 0, 8), cyl(0.03, 0.035, 1.0, '#7a6a52', 0, 0, 0, 6), top);
}
function scroll() {
  const g = G(cyl(0.03, 0.035, 1.2, C.woodD, -0.45, 0, 0, 5), cyl(0.03, 0.035, 1.2, C.woodD, 0.45, 0, 0, 5));
  const roll = cyl(0.06, 0.06, 1.05, '#c8a46a', 0, 0, 0, 10); roll.rotation.z = Math.PI / 2; roll.position.set(0, 1.12, 0.02);
  const roll2 = roll.clone(); roll2.position.y = 0.32;
  const sheet = plaque(docTex(), 0.86, 0.78, 0, 0.72, 0.03);
  g.add(roll, roll2, sheet);
  return g;
}
function magnifier() {
  const ring = mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 18), M('#3a2e26'), 0, 0, 0);
  const glass = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 18), new THREE.MeshStandardMaterial({ color: '#cfe8f0', transparent: true, opacity: 0.45, roughness: 0.1 }), 0, 0, 0);
  glass.rotation.x = Math.PI / 2;
  const handle = cyl(0.05, 0.06, 0.5, '#7a4a2a', 0, -0.78, 0, 6);
  const g = G(ring, glass, handle);
  g.position.y = 0.95; g.rotation.z = 0.5;
  const w = G(g);
  animated.push((t) => { g.position.x = Math.sin(t * 0.7) * 0.12; });
  return w;
}
function pavilion(color) {
  const g = G();
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(cyl(0.025, 0.025, 0.5, C.woodD, a * 0.18, 0, b * 0.18, 5)));
  const roof = new THREE.ConeGeometry(0.36, 0.3, 4); roof.rotateY(Math.PI / 4); roof.translate(0, 0.65, 0);
  g.add(mesh(roof, M(color)), box(0.42, 0.05, 0.42, C.woodL, 0, 0, 0));
  return g;
}
function tower() {
  const g = G();
  const n = 5;
  for (let i = 0; i < n; i++) g.add(cyl(0.34 - i * 0.04, 0.38 - i * 0.04, 0.4, i % 2 ? '#f1ebdf' : '#be1e2d', 0, i * 0.4, 0, 8));
  g.add(cyl(0.22, 0.22, 0.04, C.ink, 0, n * 0.4, 0, 8));
  const lamp = cyl(0.16, 0.16, 0.3, M('#ffd77a', { emissive: '#ffb733', emissiveIntensity: 1.2 }), 0, n * 0.4 + 0.04, 0, 8);
  const cap = cone(0.24, 0.24, C.ink, 0, n * 0.4 + 0.34, 0, 8);
  const light = new THREE.PointLight(0xffc35a, 2.5, 6, 2); light.position.set(0, n * 0.4 + 0.2, 0);
  light.userData.nightLight = { day: 0.6, night: 6, dist: 6 }; lamp.userData.nightLamp = { day: 0.8, night: 2.2 };
  g.add(lamp, cap, light);
  return g;
}
function medal() {
  const disk = cyl(0.26, 0.26, 0.05, M('#c9cdd2', { metalness: 0.7, roughness: 0.3 }), 0, 0, 0, 18);
  disk.rotation.x = Math.PI / 2; disk.position.y = 0.95;
  const ribbon = box(0.12, 0.4, 0.02, '#be1e2d', 0, 1.15, -0.01);
  const g = G(cyl(0.025, 0.03, 1.4, C.woodD, 0, 0, -0.05, 5), ribbon, disk);
  animated.push((t) => { disk.rotation.z = t * 0.9; });
  return g;
}
function gate() {
  const g = G(box(0.16, 1.2, 0.16, '#d8cfc0', -0.62, 0, 0), box(0.16, 1.2, 0.16, '#d8cfc0', 0.62, 0, 0), box(1.5, 0.22, 0.2, '#be1e2d', 0, 1.2, 0));
  const tex = canvasTex('gateSign', 128, 24, (x, w, h) => {
    x.fillStyle = '#be1e2d'; x.fillRect(0, 0, w, h);
    const d = (cx) => { x.beginPath(); x.moveTo(cx, 3); x.lineTo(cx + 9, 12); x.lineTo(cx, 21); x.lineTo(cx - 9, 12); x.closePath(); x.fillStyle = '#fffdf8'; x.fill(); };
    for (let i = 0; i < 6; i++) d(12 + i * 21);
  });
  g.add(plaque(tex, 1.46, 0.18, 0, 1.31, 0.09));
  return g;
}
function crates() {
  return G(box(0.4, 0.34, 0.4, '#b08a5a', 0, 0, 0), box(0.36, 0.3, 0.36, '#a07a4c', 0.42, 0, 0.05), at(box(0.34, 0.28, 0.34, '#c09a68', 0, 0, 0), 0.2, 0.34, 0, 0.3));
}
function moon() {
  const m = mesh(new THREE.SphereGeometry(0.32, 14, 10), new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#f6dc8a', emissiveIntensity: 0.7, roughness: 1 }), 0, 0, 0);
  animated.push((t) => { m.position.y = Math.sin(t * 0.8) * 0.08; });
  const g = G(m); g.userData.noLabelBox = true; return g;
}

// 依指標代碼回傳造景群組
export const SCENES = {
  '1-1': () => {
    const g = G(at(bigTree(1.35), 0, 0, -0.1));
    [['#448361', -1.25, 0.55], ['#D9730D', 1.25, 0.55], ['#337EA9', -1.0, -1.0], ['#9065B0', 1.0, -1.0]].forEach(([c, x, z]) => g.add(at(flag(c), x, 0, z)));
    g.add(P(C.red, 0.55, 0.95, -0.4, 1.4, { child: true }), P('#1d2386', -0.4, 1.15, 0.5, 1.4, { child: true }));
    return g;
  },
  '1-2': () => {
    const g = G(at(signBoard(BOARDS.plan(), 0.9, 0.66), -0.55, -0.7, 0.25, 1.4));
    ['#6A4432', '#BE1E2D', '#1D2386'].forEach((c, i) => g.add(box(0.5, 0.22 + i * 0.22, 0.6, c, 0.15 + i * 0.5, 0, 0.5)));
    g.add(P(C.red, 1.15, 0.5, -0.3, 1.3, { child: true }), at(scroll(), 1.05, -0.95, -0.4, 0.9));
    return g;
  },
  '2-1': () => G(item('家屋', -0.75, -0.55, 0.3, 1.6), item('穀倉', 1.0, -0.5, -0.2, 1.4), item('瞭望台', 0.2, 0.95, 0.4, 1.05), at(smallTree(0.9), -1.3, 0, 0.8)),
  '2-2': () => {
    const g = G(at(gate(), 0, 0, 0.45, 1.3));
    g.add(P(C.red, -0.25, -0.75, 0, 1.4, { child: true }), P('#1d2386', 0.3, -0.95, 0.2, 1.4, { child: true }), P('#f2b705', 0.05, 1.2, Math.PI, 1.4));
    g.add(at(arrowSign(['#337EA9', '#448361', '#D9730D']), 1.25, 0, -0.35, 0, 1.05));
    return g;
  },
  '2-3': () => {
    const g = G(cyl(0.03, 0.03, 0.9, C.woodD, -0.65, 0, -0.95, 5), cyl(0.03, 0.03, 0.9, C.woodD, 0.65, 0, -0.95, 5), plaque(boardTex(), 1.5, 0.9, 0, 1.1, -0.93));
    g.add(P('#337EA9', -1.05, -0.6, 0.6, 1.5), P(C.white, 1.05, -0.55, -0.6, 1.5));
    [[-0.6, 0.55], [0, 0.75], [0.6, 0.55]].forEach(([x, z], i) => g.add(P([C.red, '#1d2386', '#0b6e44'][i], x, z, Math.PI, 1.35, { child: true, sit: true })));
    return g;
  },
  '3-1': () => G(item('育苗除疏及間作管理', -0.55, -0.4, 0.2, 1.7), at(books(4), 1.05, 0, 0.55, 0.4, 1.3), P(C.white, 0.9, -0.55, -0.6, 1.5), P(C.red, 0.35, 0.95, 2.6, 1.4, { child: true })),
  '3-2': () => G(at(arrowSign(['#be1e2d', '#337EA9', '#448361', '#D9730D']), -0.15, 0, -0.3, 0, 1.15), at(globe(), 1.05, 0, -0.65, 0, 1.3),
    P(C.red, -0.9, 0.7, 0.6, 1.4, { child: true }), P('#9065B0', 0.45, 0.9, -0.5, 1.4, { child: true }), at(books(2, ['#9065B0', '#448361']), -1.15, 0, -0.7, 0.3, 1.1)),
  '3-3': () => G(item('資料分析與整理', -0.8, -0.55, 0.3, 1.5), item('學習成果分享', 0.75, -0.4, -0.35, 1.45), at(books(3, ['#e8c867', '#e2843a', '#9065B0']), -0.2, 0, 0.85, 0.2, 1.2), P('#1d2386', 0.4, 0.95, 2.9, 1.3, { child: true })),
  '3-4': () => G(item('布匹織作', -0.45, 0.1, 0.25, 1.65), item('泰雅傳統服飾', 0.95, -0.5, -0.4, 1.5), P(C.red, 1.0, 0.75, -0.5, 1.45, { child: true }), item('頭帶', -1.2, -0.8, 0.2, 1.2)),
  '4-1': () => G(at(bars([0.55, 0.8, 1.05], '#D9730D'), -0.25, 0, -0.3, 0.2, 1.3), at(coins(6), 1.05, 0, 0.55), at(coins(4), 1.3, 0, 0.25), at(books(2, ['#6a4432', '#c58b10']), -0.75, 0, 0.85, -0.3, 1.1), P('#1d2386', 0.4, 0.95, 2.8, 1.4)),
  '4-2': () => G(P(C.red, -0.35, 0.2, Math.PI / 2, 1.5), P('#337EA9', 0.35, 0.2, -Math.PI / 2, 1.5), at(crates(), -1.05, 0, -0.75, 0.3, 1.3), at(hut(0.7, 0.55, 0.12), 0.95, 0, -0.75, -0.3, 1.4), at(basket(0.16, 0.28), 1.1, 0, 0.85, 0, 1.3)),
  '5-1': () => G(at(scroll(), -0.35, 0, -0.55, 0.25, 1.35), at(scales(), 1.0, 0, 0.3, -0.3, 1.2), P('#1d2386', -0.6, 0.85, 2.6, 1.4)),
  '5-2': () => G(at(signBoard(docTex(), 0.7, 0.85), -0.25, 0, -0.55, 0.2, 1.45), at(magnifier(), 0.75, 0, 0.1, -0.4, 1.3), P(C.red, -1.0, 0.75, 0.8, 1.4)),
  '5-3': () => {
    const g = G();
    ['#337EA9', '#448361', '#D9730D', '#9065B0', '#C14C8A'].forEach((c, i) => { const a = -1.0 + i * 0.5; g.add(at(pavilion(c), Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.0 + 0.15, -a, 1.25)); });
    g.add(P('#1d2386', 0, 0.95, Math.PI, 1.4, { child: true }));
    return g;
  },
  '6-1': () => G(at(hut(0.6, 0.48, 0.1), -1.05, 0, -0.75, 0.4, 1.35), at(house(0.7, 0.55), 1.05, 0, -0.85, -0.4, 1.3), item('感恩祖靈祭', 0, 0.45, 0, 1.45)),
  '6-2': () => G(item('收割祭', -0.7, -0.35, 0.3, 1.5), item('穀倉', 0.95, -0.55, -0.3, 1.25), at(moon(), -1.05, 1.35, -0.75, 0, 0.6), item('育苗除疏及間作管理', 0.2, 1.0, 0, 1.05)),
  '6-3': () => G(at(tower(), -0.35, 0, -0.35, 0, 1.1), at(medal(), 1.05, 0, 0.2, -0.4, 1.15), P(C.red, 0.4, 0.95, 2.7, 1.4, { child: true }), P(C.white, -1.0, 0.8, 0.7, 1.4)),
};
