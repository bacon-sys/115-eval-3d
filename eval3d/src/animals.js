// 小動物點綴：台灣山豬、山羌、台灣獼猴、飛鼠（低多邊形，數量少、只做裝飾）
// 這個檔案在評鑑網站與三年山徑兩邊共用，內容保持一致
import * as THREE from 'three';

const mats = new Map();
function M(color) {
  if (!mats.has(color)) mats.set(color, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.95 }));
  return mats.get(color);
}
function part(geo, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, M(color)); m.position.set(x, y, z); m.castShadow = true; return m;
}
const B = (w, h, d, c, x, y, z) => part(new THREE.BoxGeometry(w, h, d), c, x, y, z);
const I = (r, c, x, y, z) => part(new THREE.IcosahedronGeometry(r, 0), c, x, y, z);
const K = (r, h, c, x, y, z, seg = 4) => part(new THREE.ConeGeometry(r, h, seg), c, x, y, z);
// 腿：以髖部為軸心擺動
function leg(len, w, c, x, y, z) {
  const p = new THREE.Group(); p.position.set(x, y, z);
  const g = new THREE.BoxGeometry(w, len, w); g.translate(0, -len / 2, 0);
  p.add(part(g, c)); return p;
}

// ── 台灣山豬：深褐色、背上一道鬃毛、白色獠牙（面向 +z）
export function makeBoar() {
  const g = new THREE.Group(), body = new THREE.Group();
  const c = '#3d3029', d = '#2a211c';
  body.add(B(0.2, 0.17, 0.38, c, 0, 0.2, 0), B(0.05, 0.05, 0.34, d, 0, 0.3, -0.01));
  const head = new THREE.Group(); head.position.set(0, 0.21, 0.19);
  head.add(B(0.15, 0.13, 0.13, c, 0, 0, 0.04), B(0.09, 0.08, 0.1, '#5a463a', 0, -0.02, 0.14), B(0.07, 0.05, 0.015, '#7a5f50', 0, -0.02, 0.195),
    B(0.015, 0.045, 0.015, '#efe6d2', 0.045, 0.005, 0.15), B(0.015, 0.045, 0.015, '#efe6d2', -0.045, 0.005, 0.15),
    K(0.03, 0.06, d, 0.055, 0.08, 0.0), K(0.03, 0.06, d, -0.055, 0.08, 0.0));
  body.add(head, B(0.02, 0.07, 0.02, d, 0, 0.24, -0.2));
  const legs = [leg(0.13, 0.045, d, 0.06, 0.13, 0.12), leg(0.13, 0.045, d, -0.06, 0.13, 0.12), leg(0.13, 0.045, d, 0.06, 0.13, -0.13), leg(0.13, 0.045, d, -0.06, 0.13, -0.13)];
  legs.forEach((l) => body.add(l));
  g.add(body);
  return { g, body, legs, head, kind: 'boar' };
}

// ── 山羌：紅褐色小鹿、細長腿、短角
export function makeMuntjac() {
  const g = new THREE.Group(), body = new THREE.Group();
  const c = '#a3643a', d = '#6b4428';
  body.add(B(0.13, 0.13, 0.3, c, 0, 0.27, 0), B(0.1, 0.03, 0.24, '#dcb88e', 0, 0.21, 0), B(0.04, 0.06, 0.03, '#f1e6d2', 0, 0.3, -0.16));
  const neck = new THREE.Group(); neck.position.set(0, 0.31, 0.12);
  const ng = new THREE.BoxGeometry(0.06, 0.16, 0.06); ng.translate(0, 0.07, 0);
  const nk = part(ng, c); nk.rotation.x = 0.35; neck.add(nk);
  const head = new THREE.Group(); head.position.set(0, 0.15, 0.06);
  head.add(B(0.08, 0.07, 0.12, c, 0, 0, 0.03), B(0.05, 0.045, 0.05, d, 0, -0.01, 0.1),
    K(0.025, 0.06, c, 0.045, 0.05, -0.01), K(0.025, 0.06, c, -0.045, 0.05, -0.01),
    B(0.012, 0.07, 0.012, '#d8c7a0', 0.022, 0.06, 0.0), B(0.012, 0.07, 0.012, '#d8c7a0', -0.022, 0.06, 0.0));
  neck.add(head);
  body.add(neck);
  const legs = [leg(0.21, 0.028, d, 0.045, 0.22, 0.1), leg(0.21, 0.028, d, -0.045, 0.22, 0.1), leg(0.21, 0.028, d, 0.045, 0.22, -0.1), leg(0.21, 0.028, d, -0.045, 0.22, -0.1)];
  legs.forEach((l) => body.add(l));
  g.add(body);
  return { g, body, legs, neck, kind: 'muntjac' };
}

// ── 台灣獼猴：坐姿，灰褐色毛、粉色臉
export function makeMonkey() {
  const g = new THREE.Group();
  const c = '#7f705e', f = '#e3a08c';
  g.add(B(0.14, 0.17, 0.11, c, 0, 0.12, 0), B(0.16, 0.06, 0.15, c, 0, 0.04, 0.02),
    B(0.04, 0.04, 0.1, c, 0.05, 0.03, 0.09), B(0.04, 0.04, 0.1, c, -0.05, 0.03, 0.09));
  const tail = new THREE.Group(); tail.position.set(0, 0.04, -0.06);
  const tg = new THREE.BoxGeometry(0.03, 0.03, 0.12); tg.translate(0, 0, -0.06); tail.add(part(tg, c));
  g.add(tail);
  const head = new THREE.Group(); head.position.set(0, 0.25, 0.0);
  head.add(I(0.07, c, 0, 0, 0), B(0.08, 0.07, 0.03, f, 0, -0.005, 0.055), I(0.022, f, 0.07, 0.01, 0), I(0.022, f, -0.07, 0.01, 0),
    B(0.014, 0.014, 0.01, '#2a211b', 0.018, 0.012, 0.072), B(0.014, 0.014, 0.01, '#2a211b', -0.018, 0.012, 0.072));
  g.add(head);
  const armL = leg(0.12, 0.035, c, -0.085, 0.19, 0.01), armR = leg(0.12, 0.035, c, 0.085, 0.19, 0.01);
  armL.rotation.x = -0.6; armR.rotation.x = -0.6;
  g.add(armL, armR);
  return { g, head, armL, armR, tail, kind: 'monkey' };
}

// ── 飛鼠（大赤鼯鼠）：紅褐色，滑翔時展開飛膜
export function makeFlyingSquirrel() {
  const g = new THREE.Group(), body = new THREE.Group();
  const c = '#94492a', l = '#d9a77c';
  body.add(B(0.09, 0.07, 0.18, c, 0, 0, 0), I(0.05, c, 0, 0.02, 0.11), B(0.05, 0.03, 0.03, l, 0, 0.0, 0.15),
    K(0.018, 0.04, c, 0.03, 0.07, 0.1), K(0.018, 0.04, c, -0.03, 0.07, 0.1));
  const tg = new THREE.BoxGeometry(0.05, 0.05, 0.22); tg.translate(0, 0, -0.11);
  const tail = part(tg, '#6e3520'); tail.position.set(0, 0.01, -0.08); body.add(tail);
  const wing = part(new THREE.BoxGeometry(0.34, 0.012, 0.18), '#a85a36', 0, -0.01, 0.0);
  body.add(wing);
  g.add(body);
  return { g, body, wing, tail, kind: 'squirrel' };
}

const rnd = (() => { let s = 12345; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

// 在一個圓形範圍內漫步：走一段、停一下（山羌停下時會低頭吃草，山豬會拱土）
export function wander(a, { cx, cz, r, ground, speed = 0.35, scale = 1 }) {
  const st = { x: cx, z: cz, tx: cx, tz: cz, yaw: rnd() * 6.28, mode: 'pause', timer: 1 + rnd() * 2, phase: 0, last: null };
  a.g.scale.setScalar(scale);
  const sp = speed * scale;
  return (t) => {
    const dt = st.last == null ? 0 : Math.min(0.1, t - st.last); st.last = t;
    if (st.mode === 'pause') {
      st.timer -= dt;
      if (a.neck) a.neck.rotation.x += ((1.25) - a.neck.rotation.x) * Math.min(1, dt * 3);
      if (a.head && a.kind === 'boar') a.head.rotation.x = 0.25 + Math.sin(t * 6) * 0.08;
      if (st.timer <= 0) {
        const ang = rnd() * 6.28, rr = Math.sqrt(rnd()) * r;
        st.tx = cx + Math.cos(ang) * rr; st.tz = cz + Math.sin(ang) * rr; st.mode = 'walk';
      }
    } else {
      if (a.neck) a.neck.rotation.x += (0 - a.neck.rotation.x) * Math.min(1, dt * 5);
      if (a.head && a.kind === 'boar') a.head.rotation.x *= 1 - Math.min(1, dt * 5);
      const dx = st.tx - st.x, dz = st.tz - st.z, dist = Math.hypot(dx, dz);
      const want = Math.atan2(dx, dz);
      let d = want - st.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      st.yaw += d * Math.min(1, dt * 4);
      if (Math.abs(d) < 0.6) {
        const step = Math.min(dist, sp * dt);
        st.x += Math.sin(st.yaw) * step; st.z += Math.cos(st.yaw) * step;
        st.phase += step / scale * 26;
      }
      if (dist < 0.03 * scale) { st.mode = 'pause'; st.timer = 2.5 + rnd() * 5; }
    }
    const moving = st.mode === 'walk' ? 1 : 0;
    const sw = Math.sin(st.phase) * 0.6 * moving;
    a.legs[0].rotation.x = sw; a.legs[3].rotation.x = sw; a.legs[1].rotation.x = -sw; a.legs[2].rotation.x = -sw;
    a.g.position.set(st.x, ground(st.x, st.z) + Math.abs(Math.cos(st.phase)) * 0.012 * scale * moving, st.z);
    a.g.rotation.y = st.yaw;
  };
}

// 坐著的猴子：轉頭張望、偶爾抓抓癢、尾巴輕晃
export function sitter(a, { scale = 1 } = {}) {
  a.g.scale.setScalar(scale);
  const base = a.g.rotation.y;
  return (t) => {
    a.head.rotation.y = Math.sin(t * 0.45) * 0.7 + Math.sin(t * 1.7) * 0.1;
    a.head.rotation.x = Math.sin(t * 0.3) * 0.12;
    const k = (t % 9) / 9;
    const scratch = k > 0.7 && k < 0.85 ? Math.sin((k - 0.7) / 0.15 * Math.PI) : 0;
    a.armR.rotation.x = -0.6 - scratch * 1.9 + (scratch ? Math.sin(t * 22) * 0.15 : 0);
    a.armR.rotation.z = scratch * 0.5;
    a.tail.rotation.y = Math.sin(t * 1.1) * 0.3;
    a.g.rotation.y = base + Math.sin(t * 0.13) * 0.4;
  };
}

// 飛鼠：在兩棵樹梢之間來回滑翔，中途下沉成弧線；停在樹上時收起飛膜
export function glider(a, { A, B: Bp, scale = 1, period = 16, sag = 1 }) {
  a.g.scale.setScalar(scale);
  const glide = 3.2;
  return (t) => {
    const cyc = t % (period * 2), leg = cyc < period ? 0 : 1, k = (cyc % period);
    const from = leg ? Bp : A, to = leg ? A : Bp;
    if (k < glide) {
      const u = k / glide, e = u * u * (3 - 2 * u);
      a.g.position.set(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e - Math.sin(Math.PI * e) * sag, from.z + (to.z - from.z) * e);
      a.g.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
      a.body.rotation.z = Math.sin(u * Math.PI * 2) * 0.25;
      a.body.rotation.x = (u - 0.5) * 0.5;
      a.wing.scale.set(1, 1, 1);
      a.tail.rotation.x = 0;
    } else {
      a.g.position.copy(to);
      a.body.rotation.set(-1.2, 0, 0);
      a.wing.scale.set(0.35, 1, 0.6);
      a.tail.rotation.x = 0.9 + Math.sin(t * 1.5) * 0.1;
      a.g.rotation.y = Math.atan2(to.x - from.x, to.z - from.z) + Math.PI;
    }
  };
}
