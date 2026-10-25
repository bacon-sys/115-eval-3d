// 全文閱讀版（不載入 3D）：給不支援 WebGL 的裝置，或網址加 ?text
import DATA from './data.json';
import { createReader } from './reader.js';
import { createSearch, highlight } from './search.js';

const $ = (s) => document.querySelector(s);
const DIMS = DATA.dims;
DIMS.forEach((d) => d.inds.forEach((i) => { i.dim = d; }));
document.body.classList.add('no3d', 'ready');
const reader = createReader({ DIMS, onClose: () => {} });
let pendingQ = null, pendingSec = null;
const search = createSearch({ titleOf: reader.titleOf, colorOf: reader.colorOf, go: (ref, q, sec) => {
  pendingQ = q; pendingSec = sec;
  if (location.hash === '#p' + ref) { reader.open(ref); highlight(reader.el, q, reader.scroller, sec); pendingQ = null; } else location.hash = '#p' + ref;
} });
$('#rdSearch').addEventListener('click', () => search.open());
function route() {
  const m = /^#p(.+)$/.exec(decodeURIComponent(location.hash));
  if (!(m && reader.open(m[1]))) reader.open('home');
  if (pendingQ) { highlight(reader.el, pendingQ, reader.scroller, pendingSec); pendingQ = null; }
}
addEventListener('hashchange', route);
route();
