// 全站搜尋：逐字比對各頁內文（中文不需斷詞，空白分隔多個關鍵字時須同時符合）
import INDEX from './search.json';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const norm = (s) => s.toLowerCase().replace(/[－–—]/g, '-').replace(/[\s　]+/g, ' ');

export function createSearch({ titleOf, colorOf, go }) {
  const box = $('#search'), input = $('#sInput'), list = $('#sResults'), count = $('#sCount');
  const DATA = INDEX.map(([ref, sec, head, text]) => ({ ref, sec, head, text, n: norm(text) }));
  let lastFocus = null, timer = 0;

  function snippet(text, terms) {
    const n = norm(text);
    const at = Math.max(0, n.indexOf(terms[0]));
    const start = Math.max(0, at - 30), end = Math.min(text.length, at + 90);
    let s = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    s = esc(s);
    for (const t of terms) {
      const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      s = s.replace(re, (m) => `<mark>${m}</mark>`);
    }
    return s;
  }
  function run() {
    const q = norm(input.value.trim());
    if (!q) { list.innerHTML = ''; count.textContent = '可搜尋 17 項指標、6 個構面頁與首頁的全文。'; return; }
    const terms = q.split(' ').filter(Boolean);
    const hits = DATA.filter((d) => terms.every((t) => d.n.includes(t)));
    count.textContent = hits.length ? `找到 ${hits.length} 筆` + (hits.length > 80 ? '（列出前 80 筆）' : '') : '找不到符合的內容，試試較短的關鍵字。';
    const groups = new Map();
    for (const h of hits.slice(0, 80)) { if (!groups.has(h.ref)) groups.set(h.ref, []); groups.get(h.ref).push(h); }
    list.innerHTML = [...groups].map(([ref, hs]) => `
      <section class="sgrp" style="--dc:${colorOf(ref)}"><h3>${esc(titleOf(ref))}<span>${hs.length}</span></h3>
      ${hs.map((h) => `<button type="button" class="shit" data-ref="${ref}" data-sec="${h.sec}" data-q="${esc(terms[0])}" data-k="${hs.indexOf(h)}">${h.head ? `<small>${esc(h.head)}</small>` : ''}<span>${snippet(h.text, terms)}</span></button>`).join('')}
      </section>`).join('');
    list.querySelectorAll('.shit').forEach((b) => b.addEventListener('click', () => { close(); go(b.dataset.ref, b.dataset.q, b.dataset.sec); }));
  }
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 120); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const f = list.querySelector('.shit'); if (f) f.click(); } });
  function open() { lastFocus = document.activeElement; box.hidden = false; document.body.classList.add('searching'); input.focus(); input.select(); run(); }
  function close() { if (box.hidden) return; box.hidden = true; document.body.classList.remove('searching'); if (lastFocus && lastFocus.isConnected) lastFocus.focus(); }
  $('#sClose').addEventListener('click', close);
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  addEventListener('keydown', (e) => {
    if (!box.hidden && e.key === 'Escape') { close(); e.stopImmediatePropagation(); return; }
    if (box.hidden && e.key === '/' && !e.target.closest('input, textarea, select')) { e.preventDefault(); open(); }
  }, true);
  return { open, close };
}

// 在閱讀頁中標示關鍵字並捲動到第一個出現處
export function highlight(root, q, scroller, sec) {
  root.querySelectorAll('mark.hit').forEach((m) => m.replaceWith(...m.childNodes));
  if (!q) return;
  const lower = q.toLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) if (walker.currentNode.nodeValue.toLowerCase().includes(lower)) nodes.push(walker.currentNode);
  let first = null;
  for (const node of nodes) {
    const v = node.nodeValue, i = v.toLowerCase().indexOf(lower);
    const mark = document.createElement('mark'); mark.className = 'hit';
    const after = node.splitText(i); after.splitText(q.length);
    mark.appendChild(after.cloneNode(true)); after.replaceWith(mark);
    if (!first) first = mark;
  }
  const anchor = sec && root.querySelector('#' + sec);
  if (anchor) { const after = [...root.querySelectorAll('mark.hit')].find((m) => anchor.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING); if (after) first = after; }
  if (first) {
    const det = first.closest('details'); if (det) det.open = true;
    setTimeout(() => { const r = first.getBoundingClientRect(), s = scroller.getBoundingClientRect(); scroller.scrollTop += r.top - s.top - s.height / 3; }, 60);
  }
}
