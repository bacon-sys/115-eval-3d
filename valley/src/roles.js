// 角色小人：依角色換上不同的泰雅族服飾（紅、白、黑三色與菱形紋），並加上可辨識的配件與手上的物品
// 主網站與三年山徑共用這個檔案（修改後請同步複製到 valley/src/roles.js）
import * as THREE from 'three';

const K = {
  red: '#a8202b', redD: '#8c1b26', white: '#ece3cf', whiteD: '#d9cdb0', black: '#2a211b', blackL: '#3a302a',
  skin: '#b8835c', hair: '#2a211b', gray: '#8a857d', silver: '#dcd6cb', rattan: '#b8935a', wood: '#7a5a40', woodD: '#55402f',
  yellow: '#f2b705', paper: '#faf6ec', gold: '#c9a227',
};

// ── 材質與貼圖快取
const mats = new Map();
function M(color, opt = {}) {
  const key = color + JSON.stringify(opt);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, ...opt }));
  return mats.get(key);
}
const texs = new Map();
function tex(key, w, h, draw, rep) {
  if (texs.has(key)) return texs.get(key);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); }
  texs.set(key, t); return t;
}
const texMats = new Map();
function TM(key, w, h, draw, rep, opt = {}) {
  if (!texMats.has(key)) texMats.set(key, new THREE.MeshStandardMaterial({ map: tex(key, w, h, draw, rep), roughness: 0.95, flatShading: true, ...opt }));
  return texMats.get(key);
}
function dia(x, cx, cy, r, fill) { x.beginPath(); x.moveTo(cx, cy - r); x.lineTo(cx + r, cy); x.lineTo(cx, cy + r); x.lineTo(cx - r, cy); x.closePath(); x.fillStyle = fill; x.fill(); }

// ── 泰雅織紋：base 為底色（red／white／black），pat 為紋樣
// hem：下擺菱形紋帶、chest：胸前菱形紋帶、stripe：直條紋、grid：滿版小菱形、double：雙細帶加下擺菱形
function clothMat(base, pat) {
  return TM(`cl-${base}-${pat}`, 64, 64, (x) => {
    const R = K.red, W = K.white, B = K.black;
    const bg = K[base];
    const accent = base === 'red' ? B : R, band = base === 'white' ? B : W, dark = base === 'white' ? W : B;
    x.fillStyle = bg; x.fillRect(0, 0, 64, 64);
    const diaRow = (y, r, bgc) => { for (const cx of [8, 24, 40, 56]) { dia(x, cx, y, r, dark); dia(x, cx, y, r * 0.5, R); dia(x, cx, y, r * 0.2, bgc); } };
    if (pat === 'hem') {
      if (base === 'white') { x.fillStyle = R; for (const y of [6, 14, 22]) x.fillRect(0, y, 64, 3); } else { x.fillStyle = accent; x.fillRect(0, 8, 64, 3); }
      x.fillStyle = band; x.fillRect(0, 36, 64, 20); x.fillStyle = accent; x.fillRect(0, 34, 64, 2); x.fillRect(0, 56, 64, 2); diaRow(46, 8, band);
    } else if (pat === 'chest') {
      x.fillStyle = band; x.fillRect(0, 8, 64, 18); x.fillStyle = accent; x.fillRect(0, 6, 64, 2); x.fillRect(0, 26, 64, 2); diaRow(17, 7, band);
      x.fillStyle = accent; x.fillRect(0, 52, 64, 3);
    } else if (pat === 'stripe') {
      x.fillStyle = base === 'red' ? B : R; for (const cx of [4, 20, 36, 52]) x.fillRect(cx, 0, 5, 64);
      x.fillStyle = base === 'white' ? B : W; for (const cx of [10, 26, 42, 58]) x.fillRect(cx, 0, 2, 64);
    } else if (pat === 'grid') {
      for (let row = 0; row < 4; row++) for (let i = 0; i < 4; i++) { const cx = 8 + i * 16 + (row % 2) * 8, cy = 8 + row * 16; dia(x, cx, cy, 6, band); dia(x, cx, cy, 3, accent); }
    } else { // double
      x.fillStyle = band; x.fillRect(0, 10, 64, 4); x.fillRect(0, 18, 64, 4); x.fillStyle = accent; x.fillRect(0, 14, 64, 4);
      x.fillStyle = band; x.fillRect(0, 40, 64, 16); diaRow(48, 7, band);
    }
  }, [3, 1]);
}
// 窄織帶（頭帶、斜背帶、背帶）：紅底白黑菱形
const bandMat = (base = 'red') => TM('band-' + base, 64, 16, (x) => {
  x.fillStyle = K[base]; x.fillRect(0, 0, 64, 16);
  const inner = base === 'red' ? K.white : K.red, core = base === 'black' ? K.white : K.black;
  x.fillStyle = inner; x.fillRect(0, 1, 64, 2); x.fillRect(0, 13, 64, 2);
  for (let i = 0; i < 4; i++) { dia(x, 8 + i * 16, 8, 5, inner); dia(x, 8 + i * 16, 8, 2.5, core); }
}, [2, 1]);
const weaveMat = (base, key = base) => TM('wv-' + key, 32, 32, (x) => {
  x.fillStyle = base; x.fillRect(0, 0, 32, 32);
  x.fillStyle = 'rgba(0,0,0,.22)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) x.fillRect(i * 8, j * 8, 8, 8);
  x.fillStyle = 'rgba(255,255,255,.15)'; for (let i = 0; i < 4; i++) x.fillRect(0, i * 8, 32, 1);
}, [3, 2]);

// ── 基本形狀
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; return m; }
const mt = (c) => (typeof c === 'string' ? M(c) : c);
const box = (w, h, d, c, x = 0, y = 0, z = 0) => mesh(new THREE.BoxGeometry(w, h, d), mt(c), x, y, z);
const cyl = (rt, rb, h, c, x = 0, y = 0, z = 0, seg = 8) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mt(c), x, y, z);
const G = (...k) => { const g = new THREE.Group(); k.flat().forEach((o) => o && g.add(o)); return g; };

// ── 角色設定（顏色與配件都依角色固定，看到外型就能分辨身分）
// s：身形大小、cloth：[底色, 紋樣]、long：長衣（蓋到小腿）、sleeve：袖色、leg：褲色、hair：髮色
// hat：headband 織紋頭帶／rattan 藤帽、extra：配件
export const ROLES = {
  student:  { name: '學生', s: 0.8, cloth: ['white', 'hem'], sleeve: K.white, leg: K.black, extra: ['backpack'] },
  teacher:  { name: '老師', s: 1, cloth: ['white', 'stripe'], sleeve: K.white, leg: K.blackL, extra: ['vest', 'bag'] },
  culture:  { name: '文化教師', s: 1, cloth: ['white', 'hem'], long: true, sleeve: K.white, leg: K.black, hat: 'headband', extra: [] },
  leader:   { name: '帶隊教師', s: 1, cloth: ['black', 'stripe'], sleeve: K.black, leg: K.black, hat: 'rattan', extra: ['flag'] },
  alumni:   { name: '畢業校友', s: 1.04, cloth: ['red', 'chest'], sleeve: K.red, leg: K.black, extra: ['sash', 'ponytail'] },
  staff:    { name: '行政人員', s: 1, cloth: ['black', 'grid'], sleeve: K.black, leg: K.blackL, extra: ['lanyard'] },
  advisor:  { name: '協作中心輔導委員', s: 1, cloth: ['white', 'stripe'], sleeve: K.whiteD, leg: K.blackL, hair: K.gray, extra: ['glasses', 'sashBlack'] },
  elder:    { name: '部落耆老', s: 0.96, cloth: ['red', 'grid'], long: true, sleeve: K.red, leg: K.black, hair: K.silver, hat: 'headband', extra: ['cane'] },
  g7:       { name: '七年級學生', s: 0.78, cloth: ['white', 'hem'], sleeve: K.white, leg: K.black, extra: [] },
  g8:       { name: '八年級學生', s: 0.86, cloth: ['red', 'chest'], sleeve: K.white, leg: K.black, extra: [] },
  g9:       { name: '九年級學生', s: 0.94, cloth: ['black', 'double'], sleeve: K.black, leg: K.black, extra: [] },
  guide:    { name: '小嚮導', s: 1, yellow: true, sleeve: K.yellow, leg: '#3a2e26', hat: 'redband', extra: ['basket'] },
};

// ── 手上的物品（造型）
const PROPS = {
  brochure: () => { const g = G(); [-1, 0, 1].forEach((k) => { const p = box(0.06, 0.13, 0.006, k ? K.paper : M('#be1e2d'), k * 0.055, 0, Math.abs(k) * 0.012); p.rotation.y = k * 0.35; g.add(p); }); return g; },
  stack: () => G(box(0.17, 0.12, 0.13, K.paper), box(0.175, 0.012, 0.135, '#be1e2d', 0, 0.02, 0)),
  textile: () => { const r = cyl(0.045, 0.045, 0.28, clothMat('red', 'grid'), 0, 0, 0, 10); r.rotation.z = Math.PI / 2; return G(r); },
  sheets: () => G(box(0.14, 0.18, 0.012, K.wood), box(0.12, 0.15, 0.006, K.paper, 0, -0.01, 0.009), box(0.05, 0.02, 0.01, '#9a9a9a', 0, 0.085, 0.01)),
  award: () => G(box(0.19, 0.14, 0.014, K.gold), box(0.16, 0.11, 0.006, K.paper, 0, 0, 0.009), cyl(0.014, 0.014, 0.006, '#be1e2d', 0.05, -0.03, 0.013, 10).rotateX(Math.PI / 2)),
  binder: () => G(box(0.15, 0.19, 0.04, '#2f4f8a'), box(0.01, 0.17, 0.042, '#e7edf5', -0.07, 0, 0)),
  book: () => G(box(0.14, 0.18, 0.03, '#a8202b'), box(0.13, 0.17, 0.032, K.paper, 0.004, 0, 0)).rotateZ(0),
  notebook: () => G(box(0.13, 0.17, 0.022, '#4c7a4a'), box(0.12, 0.16, 0.024, K.paper, 0.004, 0, 0)),
  clipboard: () => G(box(0.15, 0.2, 0.012, K.woodD), box(0.12, 0.15, 0.006, K.paper, 0, -0.015, 0.009), box(0.008, 0.12, 0.008, '#2f4f8a', 0.04, -0.01, 0.015)),
  booklet: () => G(box(0.13, 0.17, 0.016, '#e0b84a'), box(0.09, 0.02, 0.018, '#a8202b', 0, 0.04, 0)),
  chart: () => G(box(0.17, 0.13, 0.012, TM('chartp', 64, 48, (x) => {
    x.fillStyle = K.paper; x.fillRect(0, 0, 64, 48); x.fillStyle = '#2a211b'; x.fillRect(6, 40, 52, 2);
    [[10, 18, '#0b6e44'], [22, 28, '#e2571c'], [34, 14, '#cc1452'], [46, 32, '#2f4f8a']].forEach(([px, h, c]) => { x.fillStyle = c; x.fillRect(px, 40 - h, 8, h); });
  }))),
  sieve: () => { const d = cyl(0.14, 0.14, 0.025, weaveMat('#c9b26e', 'bamboo'), 0, 0, 0, 14); d.rotation.x = Math.PI / 2; return G(d, (() => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.012, 5, 16), M(K.woodD)); return r; })()); },
  bamboo: () => { const g = G(); [-0.03, 0, 0.03].forEach((o, i) => { const p = cyl(0.016, 0.016, 0.5, '#9fb455', o, i * 0.012, 0, 6); p.rotation.x = Math.PI / 2 - 0.25; g.add(p); }); return g; },
  wood: () => { const l = cyl(0.05, 0.055, 0.32, K.wood, 0, 0, 0, 7); l.rotation.z = Math.PI / 2; return G(l, cyl(0.04, 0.04, 0.33, '#a8835c', 0, 0, 0, 7).rotateZ(Math.PI / 2)); },
  rattan: () => { const g = G(); for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.09 - i * 0.012, 0.01, 4, 14), M(K.rattan)); t.position.z = i * 0.012; g.add(t); } return g; },
  ramie: () => { const g = G(); for (let i = 0; i < 5; i++) { const p = cyl(0.008, 0.01, 0.42, '#6f9a4f', (i - 2) * 0.012, (i % 2) * 0.01, 0, 4); p.rotation.x = Math.PI / 2 - 0.3 + i * 0.02; g.add(p); } g.add(box(0.03, 0.03, 0.03, '#b8935a')); return g; },
  thread: () => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.03, 6, 14), M('#efe6cf')); return G(t, box(0.02, 0.07, 0.07, '#a8202b', 0.075, 0, 0)); },
  tablet: () => G(box(0.17, 0.12, 0.012, '#2a2a2e'), box(0.15, 0.1, 0.004, '#7fb0c9', 0, 0, 0.008)),
  poles: () => { const g = G(); [-0.02, 0.02, 0].forEach((o, i) => { const p = cyl(0.014, 0.014, 0.55, i === 2 ? '#a8835c' : '#9fb455', o, i * 0.012, 0, 6); p.rotation.x = Math.PI / 2 - 0.25; g.add(p); }); return g; },
};
const ON_SHOULDER = new Set(['bamboo', 'poles', 'ramie']); // 長條物扛在肩上

// ── 物品小圖示（浮在頭上）：emoji 畫在圓形徽章裡；跟著場景縮放（約一顆頭大），鏡頭拉遠時淡出
const iconTex = new Map();
function iconSprite(emoji, ring) {
  const key = emoji + ring;
  if (!iconTex.has(key)) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 96;
    const x = cv.getContext('2d');
    x.beginPath(); x.arc(48, 48, 44, 0, 7); x.fillStyle = '#fffdf8'; x.fill();
    x.lineWidth = 4; x.strokeStyle = ring; x.stroke();
    x.font = '54px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(emoji, 48, 52);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; iconTex.set(key, t);
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex.get(key), transparent: true, depthWrite: false }));
  return sp;
}

// ── 建立角色小人
// 回傳 { g, legL, legR, armL, armR, head, role, setCarry(bool), icon, prop, headY }
export function makeRoleWalker(roleKey, { prop = null, icon = null, ring = '#be1e2d' } = {}) {
  const R = ROLES[roleKey];
  const s = R.s;
  const g = new THREE.Group();
  const legLen = 0.2 * s, bodyH = 0.3 * s;
  const mkLimb = (len, w, color, x, y, parent = g) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0);
    const geo = new THREE.BoxGeometry(w, len, w); geo.translate(0, -len / 2, 0);
    pivot.add(new THREE.Mesh(geo, M(color))); parent.add(pivot); return pivot;
  };
  const legL = mkLimb(legLen, 0.055 * s, R.leg, -0.045 * s, legLen);
  const legR = mkLimb(legLen, 0.055 * s, R.leg, 0.045 * s, legLen);
  // 衣身：長衣從小腿開始，短衣從腰開始
  const bodyMat = R.yellow ? M(K.yellow) : clothMat(...R.cloth);
  const y0 = R.long ? legLen * 0.35 : legLen - 0.01, h = legLen + bodyH - y0;
  const body = cyl(0.085 * s, (R.long ? 0.135 : 0.12) * s, h, bodyMat, 0, y0 + h / 2, 0, 8);
  const beltC = R.yellow ? '#be1e2d' : R.cloth[0] === 'red' ? K.black : R.cloth[0] === 'white' ? K.red : K.red;
  const belt = cyl(0.104 * s, 0.108 * s, 0.035 * s, beltC, 0, legLen + bodyH * 0.38, 0, 8);
  g.add(body, belt);
  const shoulderY = legLen + bodyH * 0.92;
  const armL = mkLimb(0.2 * s, 0.04 * s, R.sleeve, -0.11 * s, shoulderY);
  const armR = mkLimb(0.2 * s, 0.04 * s, R.sleeve, 0.11 * s, shoulderY);
  const hands = [armL, armR].map((a) => { const hnd = box(0.045 * s, 0.04 * s, 0.045 * s, K.skin, 0, -0.21 * s, 0); a.add(hnd); return hnd; });
  // 頭
  const head = new THREE.Group(); head.position.set(0, legLen + bodyH + 0.08 * s, 0);
  head.add(mesh(new THREE.IcosahedronGeometry(0.085 * s, 1), M(K.skin)));
  head.add(mesh(new THREE.SphereGeometry(0.088 * s, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), M(R.hair || K.hair), 0, 0.012, -0.008));
  if (R.hat === 'headband' || R.hat === 'redband') {
    const hb = cyl(0.091 * s, 0.091 * s, 0.035 * s, R.hat === 'redband' ? M('#be1e2d') : bandMat('red'), 0, 0.03 * s, 0, 10); head.add(hb);
  } else if (R.hat === 'rattan') {
    head.add(mesh(new THREE.SphereGeometry(0.1 * s, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), weaveMat(K.rattan, 'rattanCap'), 0, 0.02 * s, 0));
    head.add(cyl(0.104 * s, 0.104 * s, 0.018 * s, K.woodD, 0, 0.022 * s, 0, 10));
  }
  for (const ex of R.extra) {
    if (ex === 'backpack') {
      g.add(box(0.15 * s, 0.17 * s, 0.07 * s, bandMat('red'), 0, legLen + bodyH * 0.6, -0.12 * s));
      g.add(box(0.152 * s, 0.03 * s, 0.072 * s, K.black, 0, legLen + bodyH * 0.6 + 0.07 * s, -0.12 * s));
    } else if (ex === 'vest') {
      const v = mesh(new THREE.CylinderGeometry(0.092 * s, 0.118 * s, bodyH * 0.82, 8, 1, true, 0.3, Math.PI * 2 - 0.6), clothMat('black', 'chest'), 0, legLen + bodyH * 0.5, 0);
      v.material = v.material.clone(); v.material.side = THREE.DoubleSide; g.add(v);
    } else if (ex === 'bag') { // 泰雅織紋側背包
      const strap = box(0.02 * s, 0.4 * s, 0.012 * s, bandMat('red'), 0, legLen + bodyH * 0.55, 0.1 * s); strap.rotation.z = 0.75; g.add(strap);
      const back = box(0.02 * s, 0.4 * s, 0.012 * s, bandMat('red'), 0, legLen + bodyH * 0.55, -0.1 * s); back.rotation.z = 0.75; g.add(back);
      g.add(box(0.11 * s, 0.11 * s, 0.05 * s, clothMat('red', 'grid'), 0.14 * s, legLen + bodyH * 0.12, 0.02 * s));
    } else if (ex === 'sash' || ex === 'sashBlack') {
      const m = bandMat(ex === 'sash' ? 'black' : 'red');
      for (const zz of [0.105, -0.105]) { const b = box(0.05 * s, 0.42 * s, 0.012 * s, m, 0, legLen + bodyH * 0.55, zz * s); b.rotation.z = -0.7; g.add(b); }
    } else if (ex === 'ponytail') {
      head.add(box(0.04 * s, 0.12 * s, 0.04 * s, K.hair, 0, -0.04 * s, -0.09 * s));
    } else if (ex === 'lanyard') {
      for (const sx of [-1, 1]) { const st = box(0.012 * s, 0.13 * s, 0.006 * s, '#2f6fb5', sx * 0.028 * s, shoulderY - 0.06 * s, 0.092 * s); st.rotation.z = sx * 0.35; g.add(st); }
      g.add(box(0.06 * s, 0.075 * s, 0.008 * s, K.paper, 0, shoulderY - 0.14 * s, 0.1 * s), box(0.06 * s, 0.018 * s, 0.009 * s, '#2f6fb5', 0, shoulderY - 0.11 * s, 0.1 * s));
    } else if (ex === 'glasses') {
      for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.022 * s, 0.006 * s, 4, 10), M('#1e1a17')); r.position.set(sx * 0.032 * s, 0.005 * s, 0.083 * s); head.add(r); }
      head.add(box(0.025 * s, 0.006 * s, 0.006 * s, '#1e1a17', 0, 0.008 * s, 0.085 * s));
    } else if (ex === 'flag') { // 帶隊小旗：左手持竿
      const pole = cyl(0.008 * s, 0.008 * s, 0.62 * s, K.woodD, 0, 0.1 * s, 0.03 * s, 5); armL.add(pole);
      const fl = mesh(new THREE.PlaneGeometry(0.2 * s, 0.13 * s), TM('flagtex', 64, 40, (x) => {
        x.fillStyle = K.red; x.fillRect(0, 0, 64, 40); x.fillStyle = K.white; x.fillRect(0, 4, 64, 3); x.fillRect(0, 33, 64, 3);
        for (const cx of [12, 32, 52]) { dia(x, cx, 20, 9, K.white); dia(x, cx, 20, 5, K.black); dia(x, cx, 20, 2, K.red); }
      }, null, { side: THREE.DoubleSide }), -0.1 * s, 0.34 * s, 0.03 * s);
      armL.add(fl); g.userData.flag = fl;
    } else if (ex === 'cane') {
      const cl = shoulderY - 0.12 * s; // 從手握處到地面
      armR.add(cyl(0.01 * s, 0.012 * s, cl, K.woodD, 0, -0.12 * s - cl / 2 + 0.04 * s, 0.03 * s, 5), box(0.05 * s, 0.018 * s, 0.018 * s, K.woodD, 0.012 * s, -0.1 * s, 0.03 * s));
    } else if (ex === 'basket') {
      const bk = G(cyl(0.09 * s, 0.054 * s, 0.2 * s, weaveMat(K.rattan, 'basketW'), 0, 0.1 * s, 0, 10), cyl(0.094 * s, 0.094 * s, 0.03 * s, K.woodD, 0, 0.185 * s, 0, 10));
      bk.position.set(0, legLen + bodyH * 0.25, -0.13 * s); g.add(bk);
    }
  }
  g.add(head);
  // 手上的物品
  let propG = null, iconS = null;
  if (prop && PROPS[prop]) {
    propG = PROPS[prop]();
    propG.scale.setScalar(s);
    if (ON_SHOULDER.has(prop)) propG.position.set(0.1 * s, shoulderY + 0.035 * s, 0.02 * s); // 扛在右肩，前後方向
    else propG.position.set(0, legLen + bodyH * 0.5, 0.155 * s); // 捧在胸前
    g.add(propG);
  }
  if (icon) { iconS = iconSprite(icon, ring); iconS.scale.setScalar(0.22 * s); iconS.position.set(0, legLen + bodyH + 0.28 * s, 0); g.add(iconS); }
  g.userData.isPerson = true;
  const headY = legLen + bodyH + 0.2 * s;
  g.userData.headY = headY;
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.person = g; } });
  const w = { g, legL, legR, armL, armR, head, role: roleKey, roleName: R.name, prop: propG, icon: iconS, headY, carrying: false, shoulder: prop && ON_SHOULDER.has(prop) };
  w.setCarry = (on) => { w.carrying = on; if (propG) propG.visible = on; if (iconS) iconS.visible = on; };
  w.setCarry(!!prop);
  return w;
}

// 物品圖示依鏡頭距離淡出：near 以內完整顯示，far 以外隱藏（全景時畫面保持乾淨）
const _ip = new THREE.Vector3();
export function fadeIcon(w, cam, near, far) {
  if (!w.icon || !w.carrying) return;
  w.icon.getWorldPosition(_ip);
  const k = Math.min(1, Math.max(0, (far - _ip.distanceTo(cam.position)) / (far - near)));
  w.icon.material.opacity = k; w.icon.visible = k > 0.02;
}

// 走路姿勢：捧東西時雙手在胸前，不擺手；扛在肩上時右手扶著
export function poseWalker(w, phase, amp) {
  const sw = Math.sin(phase) * amp;
  w.legL.rotation.x = sw; w.legR.rotation.x = -sw;
  if (w.carrying && w.prop && !w.shoulder) { w.armL.rotation.x = -0.95; w.armR.rotation.x = -0.95; w.armL.rotation.z = 0.22; w.armR.rotation.z = -0.22; }
  else if (w.carrying && w.shoulder) { w.armR.rotation.x = -1.9; w.armR.rotation.z = -0.1; w.armL.rotation.x = -sw * 0.8; w.armL.rotation.z = 0; }
  else { w.armL.rotation.x = -sw * 0.8; w.armR.rotation.x = sw * 0.8; w.armL.rotation.z = 0; w.armR.rotation.z = 0; }
  if (w.role === 'leader') w.armL.rotation.x = -0.35 - sw * 0.2; // 帶隊旗舉在前方
  if (w.role === 'elder') w.armR.rotation.x = -0.25 + sw * 0.2;   // 拄著拐杖
}
