// 閱讀頁：17 項指標、6 個構面頁與首頁的完整內容
import PAGES from './pages.json';

const $ = (s, el = document) => el.querySelector(s);
const NUM = ['', '一', '二', '三', '四', '五', '六'];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function createReader({ DIMS, onClose }) {
  const ORDER = ['home'];
  DIMS.forEach((d) => { ORDER.push('d' + d.n); d.inds.forEach((i) => ORDER.push(i.code)); });
  const indOf = (ref) => { for (const d of DIMS) for (const i of d.inds) if (i.code === ref) return i; return null; };
  const dimOf = (ref) => (/^d\d$/.test(ref) ? DIMS[+ref[1] - 1] : null);
  const dimName = (d) => d.title.replace(/^構面.　?/, '');
  const titleOf = (ref) => {
    if (ref === 'home') return '大同國中 115 學年度實驗教育評鑑網站';
    const d = dimOf(ref); if (d) return d.title;
    const i = indOf(ref); return `${i.code} ${i.title}`;
  };
  const colorOf = (ref) => { const d = dimOf(ref) || (indOf(ref) || {}).dim; return d ? d.c : '#be1e2d'; };

  const root = $('#reader'), art = $('#rdArticle'), side = $('#rdSide'), crumb = $('#rdCrumb'), pager = $('#rdPager'), scroller = $('#rdScroll');
  let cur = null;

  // 側欄：全站目錄
  function renderSide() {
    const sec = (PAGES[cur].toc || []);
    const link = (ref, label, cls = '') => `<a class="sl${cls}${ref === cur ? ' on' : ''}" href="#p${ref}"${ref === cur ? ' aria-current="page"' : ''}>${label}</a>`;
    let h = link('home', '🏫 首頁：學校簡介與願景');
    if (cur === 'home' && sec.length) h += secList(sec);
    for (const d of DIMS) {
      h += `<div class="sg" style="--dc:${d.c}">${link('d' + d.n, `<span class="sn">構面${NUM[d.n]}</span>${esc(dimName(d))}<span class="sw">${d.weight}</span>`, ' dim')}`;
      for (const i of d.inds) {
        h += link(i.code, `<span class="sc">${i.code}</span>${esc(i.title)}`, ' ind');
        if (i.code === cur && sec.length) h += secList(sec);
      }
      h += '</div>';
    }
    side.innerHTML = `<nav aria-label="全站目錄">${h}</nav>`;
    side.querySelectorAll('[data-sec]').forEach((b) => b.addEventListener('click', () => { const el = document.getElementById(b.dataset.sec); if (el) scroller.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' }); closeSide(); }));
    side.querySelectorAll('a.sl').forEach((a) => a.addEventListener('click', closeSide));
    const on = side.querySelector('.sl.on'); if (on) on.scrollIntoView({ block: 'center' });
  }
  const secList = (sec) => `<div class="secs">${sec.map((s) => `<button type="button" data-sec="${s.id}">${esc(s.t)}</button>`).join('')}</div>`;

  function head(ref) {
    if (ref === 'home') return `<header class="ph0 home"><div class="kick">宜蘭縣立大同國民中學・115 學年度原住民族實驗教育評鑑</div><h1>大同國中 115 學年度實驗教育評鑑網站</h1>
      <p class="hn">本網站為 Notion 評鑑網站之 3D 導覽版，內容與 Notion 正式版相同。網站更新：__UPDATED__</p></header>`;
    const d = dimOf(ref);
    if (d) return `<header class="ph0" style="--dc:${d.c};--tint:${d.tint}"><div class="kick">構面${NUM[d.n]}・配分 ${d.weight}</div><h1><span class="pi">${d.icon}</span>${esc(dimName(d))}</h1>
      <button type="button" class="tomap" data-map="d${d.n}">在 3D 地圖中查看</button></header>`;
    const i = indOf(ref);
    return `<header class="ph0" style="--dc:${i.dim.c};--tint:${i.dim.tint}"><div class="kick"><a href="#pd${i.dim.n}">構面${NUM[i.dim.n]}　${esc(dimName(i.dim))}</a></div>
      <h1><span class="code">${i.code}</span><span>${i.icon} ${esc(i.title)}</span></h1>
      <button type="button" class="tomap" data-map="${i.code}">在 3D 地圖中查看</button></header>`;
  }

  function renderPager() {
    const k = ORDER.indexOf(cur), p = ORDER[k - 1], n = ORDER[k + 1];
    const card = (ref, dir) => ref ? `<a class="pg ${dir}" href="#p${ref}" style="--dc:${colorOf(ref)}"><small>${dir === 'prev' ? '← 上一頁' : '下一頁 →'}</small><b>${esc(titleOf(ref))}</b></a>` : '<span></span>';
    pager.innerHTML = card(p, 'prev') + card(n, 'next');
  }

  function open(ref) {
    if (!PAGES[ref]) return false;
    const changed = cur !== ref;
    cur = ref;
    root.style.setProperty('--dc', colorOf(ref));
    if (changed) {
      art.innerHTML = head(ref) + `<div class="prose">${PAGES[ref].html}</div>`;
      crumb.innerHTML = ref === 'home' ? '首頁' : dimOf(ref) ? `構面${NUM[dimOf(ref).n]}` : `構面${NUM[indOf(ref).dim.n]} › <b>${ref}</b>`;
      renderSide(); renderPager();
      wire();
      scroller.scrollTop = 0;
      document.title = `${titleOf(ref)}｜大同國中實驗教育評鑑`;
    }
    if (root.hidden) { root.hidden = false; document.body.classList.add('reading'); requestAnimationFrame(() => root.classList.add('in')); }
    art.focus({ preventScroll: true });
    return true;
  }
  function close() {
    if (root.hidden) return;
    root.classList.remove('in'); root.hidden = true; document.body.classList.remove('reading');
    closeLightbox();
    document.title = '大同國中實驗教育評鑑・3D 導覽';
  }
  const isOpen = () => !root.hidden;

  // 內文互動：照片放大、iframe 自動高度、回地圖
  let photos = [];
  function wire() {
    photos = [...art.querySelectorAll('.ph')];
    photos.forEach((b, k) => b.addEventListener('click', () => openLightbox(k)));
    art.querySelectorAll('iframe[data-autosize]').forEach((f) => f.addEventListener('load', () => {
      try { const h = f.contentDocument.documentElement.scrollHeight; if (h > 80) f.style.height = h + 8 + 'px'; } catch (e) { /* 跨網域時維持預設高度 */ }
    }));
    art.querySelectorAll('[data-map]').forEach((b) => b.addEventListener('click', () => onClose(b.dataset.map)));
  }

  // 燈箱
  const lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), lbCount = $('#lbCount');
  let lk = 0, lastFocus = null;
  function showLb() {
    const b = photos[lk];
    lbImg.src = b.dataset.full; lbImg.alt = b.dataset.cap;
    lbCap.textContent = b.dataset.cap;
    lbCount.textContent = `${lk + 1} / ${photos.length}`;
  }
  function openLightbox(k) { lastFocus = document.activeElement; lk = k; showLb(); lb.hidden = false; $('#lbClose').focus(); }
  function closeLightbox() { if (lb.hidden) return; lb.hidden = true; lbImg.removeAttribute('src'); if (lastFocus) lastFocus.focus(); }
  const stepLb = (d) => { lk = (lk + d + photos.length) % photos.length; showLb(); };
  $('#lbClose').addEventListener('click', closeLightbox);
  $('#lbPrev').addEventListener('click', () => stepLb(-1));
  $('#lbNext').addEventListener('click', () => stepLb(1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lbstage')) closeLightbox(); });
  let tx = null;
  lb.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) stepLb(dx < 0 ? 1 : -1); tx = null; });

  addEventListener('keydown', (e) => {
    if (!lb.hidden) {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowRight') stepLb(1);
      else if (e.key === 'ArrowLeft') stepLb(-1);
      e.stopImmediatePropagation();
    } else if (isOpen() && e.key === 'Escape') { if (document.body.classList.contains('side-open')) closeSide(); else onClose(cur); e.stopImmediatePropagation(); }
  }, true);

  // 手機：目錄抽屜
  function closeSide() { document.body.classList.remove('side-open'); $('#rdTocBtn').setAttribute('aria-expanded', 'false'); }
  $('#rdTocBtn').addEventListener('click', () => { const o = !document.body.classList.contains('side-open'); document.body.classList.toggle('side-open', o); $('#rdTocBtn').setAttribute('aria-expanded', String(o)); });
  $('#rdScrim').addEventListener('click', closeSide);
  $('#rdMap').addEventListener('click', () => onClose(cur));
  $('#rdPrint').addEventListener('click', () => { art.querySelectorAll('details').forEach((d) => { d.open = true; }); print(); });
  $('#rdTop').addEventListener('click', () => scroller.scrollTo({ top: 0, behavior: 'smooth' }));
  scroller.addEventListener('scroll', () => { $('#rdTop').classList.toggle('show', scroller.scrollTop > 900); }, { passive: true });

  return { open, close, isOpen, current: () => cur, el: art, scroller, titleOf, colorOf };
}
