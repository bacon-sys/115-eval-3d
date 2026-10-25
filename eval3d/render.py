"""把 Notion 匯出的 markdown（content/*.md）轉成網站閱讀頁的 HTML 片段 → src/pages.json
逐字保留內文；只轉換版面標記（表格、切換區塊、圖說、欄位、提示框、影片、嵌入）。"""
import json, re, html, urllib.parse

dims = json.load(open('content/dims.json'))['dims']
imgs = json.load(open('content/images.json'))
CODES = [i['code'] for d in dims for i in d['indicators']]
ID2REF = {}
TITLE = {}
for d in dims:
    ID2REF[d['id']] = ('d%d' % d['n'], d['icon'], d['title'])
    for i in d['indicators']:
        ID2REF[i['id']] = (i['code'], None, f"{i['code']} {i['title']}")
ID2REF['3c81d191518e817b9b3feb91979aedc2'] = ('home', '🏫', '大同國中115學年度實驗教育評鑑網站')
ICON = {'1-1': '🌱', '1-2': '📋', '2-1': '🏘️', '2-2': '🎓', '2-3': '👩‍🏫', '3-1': '🌿', '3-2': '🧭', '3-3': '📝', '3-4': '🪶',
        '4-1': '📊', '4-2': '🤝', '5-1': '📜', '5-2': '🔍', '5-3': '🗂️', '6-1': '🏘️', '6-2': '🌾', '6-3': '💡'}
for k, v in list(ID2REF.items()):
    if v[1] is None: ID2REF[k] = (v[0], ICON[v[0]], v[2])

warn = []

def mention(m):
    url = m.group(1)
    mid = url.rstrip('/').split('/')[-1].replace('-', '')
    if mid in ID2REF:
        ref, icon, title = ID2REF[mid]
        return f'<a class="mention" href="#p{ref}" data-page="{ref}"><span class="mi">{icon}</span>{html.escape(title)}</a>'
    warn.append('unknown mention ' + url)
    return f'<a href="{url}" target="_blank" rel="noopener">{url}</a>'

def inline(s):
    s = re.sub(r'<mention url="([^"]+)"\s*/>', mention, s)
    s = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', lambda m: f'<a href="{m.group(2)}" target="_blank" rel="noopener">{m.group(1)}</a>', s)
    s = re.sub(r'<span color="([a-z_]+)">', lambda m: f'<span class="c-{m.group(1)}">', s)
    s = s.replace('<br />', '<br>')
    return s

def img_of(name):
    name = urllib.parse.unquote(name)
    if name not in imgs or 'full' not in imgs[name]:
        warn.append('missing image ' + name); return None
    return imgs[name]

def figure_btn(im, cap, thumb=True):
    src = im['thumb'] if thumb else im['full']
    capa = html.escape(cap, quote=True)
    w, h = im['w'], im['h']
    return (f'<button type="button" class="ph" data-full="{im["full"]}" data-cap="{capa}" aria-label="放大照片：{capa}">'
            f'<img src="{src}" alt="{capa}" loading="lazy" width="{w}" height="{h}"></button>')

def yt(url):
    m = re.search(r'youtu\.be/([\w-]+)', url) or re.search(r'shorts/([\w-]+)', url) or re.search(r'[?&]v=([\w-]+)', url)
    return m.group(1) if m else None

def collect(lines, i, tag):
    """從 lines[i]（開頭標籤所在行）收集到對應的結尾標籤，回傳 (內部行, 下一行索引)"""
    depth, j, inner = 0, i, []
    open_re = re.compile(rf'^<{tag}\b(?!.*/>\s*$)')
    close = f'</{tag}>'
    while j < len(lines):
        ln = lines[j]
        if open_re.match(ln): depth += 1
        if ln.strip() == close:
            depth -= 1
            if depth == 0: return inner[1:], j + 1
        inner.append(ln); j += 1
    raise ValueError(f'unclosed {tag} at {i}')

def attrs(line):
    return dict(re.findall(r'(\w[\w-]*)="([^"]*)"', line))

def table(inner, a):
    rows = []
    if any(l.startswith('|') for l in inner):
        for l in inner:
            if l.startswith('|'):
                rows.append([c.strip() for c in l.strip().strip('|').split(' | ')])
    else:
        cur, cell, intd = None, [], False
        for l in inner:
            s = l.strip()
            if s == '<tr>': cur = []
            elif s == '</tr>': rows.append(cur)
            elif s == '<td>': cell, intd = [], True
            elif s == '</td>': cur.append('<br>'.join(cell)); intd = False
            elif intd: cell.append(l)
    hr = a.get('header-row') == 'true'; hc = a.get('header-column') == 'true'
    out = ['<div class="tablewrap"><table class="%s">' % ('fit' if a.get('fit-page-width') == 'true' else '')]
    for r, row in enumerate(rows):
        out.append('<tr>')
        for c, cell in enumerate(row):
            th = (hr and r == 0) or (hc and c == 0)
            tg = 'th' if th else 'td'
            sc = ' scope="col"' if hr and r == 0 else (' scope="row"' if th else '')
            out.append(f'<{tg}{sc}>{inline(cell)}</{tg}>')
        out.append('</tr>')
    out.append('</table></div>')
    return ''.join(out)

def caption_block(lines, i, tag):
    """處理 <image>/<video>/<embed> 單行或含說明文字之區塊"""
    ln = lines[i]
    if ln.rstrip().endswith('/>'): return attrs(ln), '', i + 1
    inner, nxt = collect(lines, i, tag)
    return attrs(ln), ' '.join(x.strip() for x in inner if x.strip()), nxt

SEC = [0]
def blocks(lines):
    out, i = [], 0
    while i < len(lines):
        ln = lines[i]; s = ln.strip()
        if not s: i += 1; continue
        if s == '<p />': out.append('<p class="sp"></p>'); i += 1; continue
        if s.startswith('<columns>'):
            inner, i = collect(lines, i, 'columns')
            cols, k = [], 0
            while k < len(inner):
                if inner[k].strip().startswith('<column'):
                    a = attrs(inner[k]); ci, k = collect(inner, k, 'column')
                    cols.append((float(a.get('ratio', 0)) or None, blocks(ci)))
                else: k += 1
            n = len(cols)
            tpl = ' '.join(f'{(r or 100 / n):.2f}fr' for r, _ in cols)
            out.append(f'<div class="cols" style="--tpl:{tpl}">' + ''.join(f'<div class="col">{b}</div>' for _, b in cols) + '</div>')
            continue
        if s.startswith('<callout'):
            a = attrs(s); inner, i = collect(lines, i, 'callout')
            out.append(f'<div class="callout bg-{a.get("color", "gray_bg")}"><span class="ci" aria-hidden="true">{a.get("icon", "")}</span><div class="cb">{blocks(inner)}</div></div>')
            continue
        if s.startswith('<toggle'):
            a = attrs(s); inner, i = collect(lines, i, 'toggle')
            k = 0
            while not inner[k].strip(): k += 1
            summ = inline(inner[k].strip())
            cls = 'tg' + (' h4' if a.get('heading') else '') + (f' bg-{a["color"]}' if a.get('color') else '')
            out.append(f'<details class="{cls}"><summary>{summ}</summary><div class="tb">{blocks(inner[k + 1:])}</div></details>')
            continue
        if s.startswith('<table'):
            a = attrs(s); inner, i = collect(lines, i, 'table')
            out.append(table(inner, a)); continue
        if s.startswith('<gallery'):
            a = attrs(s); inner, i = collect(lines, i, 'gallery')
            figs = []
            for l in inner:
                if '|' not in l: continue
                _, name, cap = [x.strip() for x in l.split(' | ', 2)]
                im = img_of(name)
                if im: figs.append(f'<figure>{figure_btn(im, cap)}<figcaption>{inline(cap)}</figcaption></figure>')
            out.append(f'<div class="gallery" style="--cols:{a.get("cols", 3)}">' + ''.join(figs) + '</div>')
            continue
        if s.startswith('<image'):
            a, cap, i = caption_block(lines, i, 'image')
            name = re.search(r'name=([^&"]+)', a['source']).group(1)
            im = img_of(name)
            if im: out.append(f'<figure class="img">{figure_btn(im, cap, thumb=False)}' + (f'<figcaption>{inline(cap)}</figcaption>' if cap else '') + '</figure>')
            continue
        if s.startswith('<video'):
            a, cap, i = caption_block(lines, i, 'video')
            vid = yt(a['source']); short = 'shorts' in a['source']
            if not vid: warn.append('video ' + a['source'])
            out.append(f'<figure class="video{" short" if short else ""}"><div class="vf"><iframe src="https://www.youtube-nocookie.com/embed/{vid}" title="{html.escape(cap or "影片", quote=True)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>'
                       + (f'<figcaption>{inline(cap)}</figcaption>' if cap else '') + '</figure>')
            continue
        if s.startswith('<embed'):
            a, cap, i = caption_block(lines, i, 'embed')
            src = a['source']
            capq = html.escape(cap or '嵌入內容', quote=True)
            if 'drive.google.com/drive/folders/' in src:
                fid = re.search(r'folders/([\w-]+)', src).group(1)
                out.append(f'<div class="drive"><div class="dh"><span class="dico" aria-hidden="true">📁</span><b>佐證資料夾（Google 雲端硬碟）</b><a href="{src}" target="_blank" rel="noopener">在新分頁開啟 ↗</a></div>'
                           f'<iframe src="https://drive.google.com/embeddedfolderview?id={fid}#list" title="佐證資料夾" loading="lazy"></iframe></div>')
            elif src.startswith('notion-file-block'):
                name = urllib.parse.unquote(re.search(r'name=([^&"]+)', src).group(1))
                out.append(f'<figure class="embed local"><iframe src="embed/{name}" title="{capq}" loading="lazy" data-autosize></iframe>' + (f'<figcaption>{inline(cap)}</figcaption>' if cap else '') + '</figure>')
            else:
                tall = 'mindomo' in src
                out.append(f'<figure class="embed{" tall" if tall else ""}"><iframe src="{src}" title="{capq}" loading="lazy" allowfullscreen></iframe>'
                           f'<figcaption>{inline(cap) + "　" if cap else ""}<a href="{src}" target="_blank" rel="noopener">在新分頁開啟 ↗</a></figcaption></figure>')
            continue
        if s.startswith('<p color='):
            a = attrs(s); inner, i = collect(lines, i, 'p')
            out.append(f'<p class="c-{a["color"]}">{inline(" ".join(x.strip() for x in inner))}</p>'); continue
        m = re.match(r'^(#{2,4}) (.+)$', s)
        if m:
            lv = len(m.group(1)); SEC[0] += 1
            out.append(f'<h{lv} id="s{SEC[0]}">{inline(m.group(2))}</h{lv}>'); i += 1; continue
        if s == '---': out.append('<hr>'); i += 1; continue
        if s.startswith('> '):
            q = []
            while i < len(lines) and lines[i].startswith('> '): q.append(inline(lines[i][2:])); i += 1
            out.append('<blockquote>' + '<br>'.join(q) + '</blockquote>'); continue
        if re.match(r'^[-*] ', s):
            it = []
            while i < len(lines) and re.match(r'^[-*] ', lines[i]): it.append(inline(lines[i][2:].strip())); i += 1
            out.append('<ul>' + ''.join(f'<li>{x}</li>' for x in it) + '</ul>'); continue
        m = re.match(r'^(\d+)\. ', s)
        if m:
            start, it = int(m.group(1)), []
            while i < len(lines) and re.match(r'^\d+\. ', lines[i]): it.append(inline(re.sub(r'^\d+\. ', '', lines[i]).strip())); i += 1
            out.append(f'<ol start="{start}">' if start != 1 else '<ol>'); out.append(''.join(f'<li>{x}</li>' for x in it) + '</ol>'); continue
        if s.startswith('<') and not re.match(r'^<(b|i|span|mention|a|br)\b', s):
            warn.append('unhandled: ' + s[:60])
        out.append(f'<p>{inline(s)}</p>'); i += 1
    return ''.join(out)

def render(md):
    SEC[0] = 0
    lines = md.split('\n')
    # 3-3 頁待補照片提示不放上 3D 網站
    return blocks(lines)

def toc(h):
    return [{'id': m.group(1), 't': re.sub(r'<[^>]+>', '', m.group(2))} for m in re.finditer(r'<h2 id="(s\d+)">(.*?)</h2>', h)]

pages = {}
for d in dims:
    for ind in d['indicators']:
        h = render(open(f'content/{ind["code"]}.md').read())
        pages[ind['code']] = {'html': h, 'toc': toc(h)}

# 首頁：依 Notion 原文（伍、評鑑構面導覽）直接轉換
h = render(open('content/home.md').read())
pages['home'] = {'html': h, 'toc': toc(h)}

# 構面頁
for d in dims:
    parts = [f'<p class="lead">{html.escape(d["desc"])}</p><p class="c-gray">{html.escape(d["guide"].replace("請點選下方指標卡片", "點選下方指標卡片"))}</p><div class="indcards">']
    for i in d['indicators']:
        parts.append(f'<a class="indcard" href="#p{i["code"]}" data-page="{i["code"]}"><span class="code">{i["code"]}</span><span class="t"><b>{ICON[i["code"]]} {html.escape(i["title"])}</b>'
                     + (f'<small>{html.escape(i["sub"])}</small>' if i.get('sub') else '') + '<ul>' + ''.join(f'<li>{html.escape(p)}</li>' for p in i['points']) + '</ul></span></a>')
    parts.append('</div>')
    pages['d%d' % d['n']] = {'html': ''.join(parts), 'toc': []}

json.dump(pages, open('src/pages.json', 'w'), ensure_ascii=False)
print('pages', len(pages), 'size', sum(len(p['html']) for p in pages.values()) // 1024, 'KB')
print('\n'.join(sorted(set(warn))) or 'no warnings')

# ── 全站搜尋索引：依區塊切段，記錄所在段落標題
from html.parser import HTMLParser
class Chunker(HTMLParser):
    BLOCK = {'p', 'li', 'tr', 'blockquote', 'figcaption', 'summary', 'h2', 'h3', 'h4'}
    def __init__(self):
        super().__init__(); self.out = []; self.stack = []; self.sec = ''; self.head = ''; self.buf = None; self.depth = 0
    def handle_starttag(self, tag, a):
        a = dict(a)
        if tag in ('h2', 'h3') and a.get('id'): self.sec = a['id']; self.head = ''
        if tag in self.BLOCK and self.buf is None: self.buf = []; self.btag = tag
        elif tag in ('td', 'th') and self.buf is not None: self.buf.append('　')
        elif tag == 'br' and self.buf is not None: self.buf.append(' ')
    def handle_endtag(self, tag):
        if self.buf is not None and tag == self.btag:
            t = re.sub(r'\s+', ' ', ''.join(self.buf)).strip()
            if tag in ('h2', 'h3'): self.head = t
            if t: self.out.append({'s': self.sec, 'h': self.head, 't': t})
            self.buf = None
    def handle_data(self, d):
        if self.buf is not None: self.buf.append(d)
search = []
for ref, p in pages.items():
    c = Chunker(); c.feed(p['html'])
    for ch in c.out:
        search.append([ref, ch['s'], ch['h'], ch['t']])
json.dump(search, open('src/search.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('search chunks', len(search))
