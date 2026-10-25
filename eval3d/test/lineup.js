import * as THREE from 'three';
import { makeRoleWalker, poseWalker, ROLES } from '../src/roles.js';
const r = new THREE.WebGLRenderer({ antialias: true }); r.setSize(1500, 520); r.setPixelRatio(1); document.body.appendChild(r.domElement);
r.outputColorSpace = THREE.SRGBColorSpace;
const sc = new THREE.Scene(); sc.background = new THREE.Color('#dfe9e2');
sc.add(new THREE.HemisphereLight(0xffffff, 0x887766, 1.6)); const dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(2, 5, 6); sc.add(dl);
const cam = new THREE.PerspectiveCamera(30, 1500 / 520, 0.1, 100);
const list = [['student', 'sheets', '📝'], ['teacher', 'brochure', '📄'], ['culture', 'book', '📘'], ['leader', 'clipboard', '🗒️'], ['alumni', 'textile', '🧶'], ['staff', 'chart', '📊'], ['advisor', 'binder', '📁'], ['elder', 'bamboo', '🎋'], ['g7', 'ramie', '🌿'], ['g8', 'thread', '🧵'], ['g9', 'tablet', '📱'], ['guide', null, null]];
const back = new URLSearchParams(location.search).has('back');
list.forEach(([k, p, ic], i) => {
  const w = makeRoleWalker(k, { prop: p, icon: ic });
  w.g.position.x = (i - (list.length - 1) / 2) * 0.42; w.g.rotation.y = back ? Math.PI + 0.5 : 0.35;
  poseWalker(w, 0.6, 0.4); sc.add(w.g);
});
cam.position.set(0, 0.55, 3.1); cam.lookAt(0, 0.38, 0);
r.render(sc, cam);
document.title = 'done';
