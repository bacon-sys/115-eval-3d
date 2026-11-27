#!/usr/bin/env python3
"""大同國中 115 評鑑評鑑導讀手冊：由網站 data.json ＋ 簡報對照產生 HTML，再以 Playwright 輸出 B5 PDF。
用法：python3 build.py [sample|full]
"""
import json, sys, html, pathlib

ROOT = pathlib.Path(__file__).parent
DATA = json.load(open('/home/claude/src/eval3d/src/data.json'))
SITE = 'https://bacon-sys.github.io/115-eval-3d/'
NUMZH = '〇一二三四五六'

# ── 簡報章節與頁碼（交接說明第五節；簡報各頁「對應指標」標籤） ──
CHAPTERS = [  # key, 名稱, 族語, 頁範圍, 色
    ('open', '開場', '', (2, 3), 'neu'),
    ('land', '愛土地', 'mlahang rhzyal', (4, 7), 'sage'),
    ('resp', '負責', 'ssyan inlungan', (8, 11), 'terra'),
    ('coop', '合作', 'pkrraw', (12, 16), 'mist'),
    ('grat', '感恩', 'smyuk kinhuway', (17, 21), 'plum'),
    ('close', '收束', '', (22, 24), 'neu'),
]
SLIDES = [  # 頁, 標題（取自簡報）, 對應指標（簡報標籤順序）
    (2, '學校概況與願景：帶著孩子，共同踏上成為 Tayal balay 的道路', ['1-1', '2-2', '5-1']),
    (3, '簡報架構：為什麼以四項特質為軸線？', ['1-1', '1-2', '3-3', '6-3']),
    (5, '建置 8 處文化場域，讓土地與文化走進日常學習', ['2-1', '4-2']),
    (6, '以小米生命週期為軸，三年完整走過泰雅歲時生活', ['6-2']),
    (7, '讓科學與土地智慧對話：自然科 6 份文化回應教案', ['3-1', '6-3']),
    (9, '為教學品質負責：教師團隊的專業精進', ['2-3', '3-1', '6-3']),
    (10, '為每個孩子的學習負責：學力支持與升學銜接', ['3-2', '2-2']),
    (11, '練習為言行負責：magu byaling 期間的省思與和解', ['6-3', '1-1', '3-4']),
    (13, '課程中的換工與分工，讓學生在共作中學會相互扶持', ['1-1', '3-3', '6-3', '3-4']),
    (14, '耆老、文化教師與多元人力共同承擔文化課程', ['2-3', '3-1', '6-1']),
    (15, '面對真實爭議，依循 gaga 共同修復關係', ['6-1', '6-3']),
    (16, '以理解建立合作基礎：主動走進部落、連結家長', ['6-1', '2-2']),
    (18, '從祭儀到祖居地，學生親身走過感謝祖靈的歷程', ['6-2', '6-3']),
    (19, '認識自己的根，感謝文化的傳授', ['3-4', '3-2']),
    (20, '畢業之後，延續文化學習、不忘來處', ['3-4', '2-2']),
    (21, '把耆老所教帶回部落，讓文化走向世界', ['6-3', '6-1', '3-4']),
    (22, '共同基礎：依計畫、依法規穩健執行', ['1-2', '4-1', '4-2', '5-1', '5-2', '5-3']),
    (23, '回應前次評鑑：前次 13 項建議，逐項回應', ['6-3']),
    (24, '民族教育省思：我們持續追問的五個問題', ['6-3']),
]
COVER_PAGES = {4: '愛土地', 8: '負責', 12: '合作', 17: '感恩'}


def chapter_of(p):
    for c in CHAPTERS:
        if c[3][0] <= p <= c[3][1]:
            return c
    raise ValueError(p)


# ── 手冊頁碼：第 4–5 頁使用指南、第 6–7 頁對照跨頁，構面頁＋指標頁從第 8 頁起 ──
PAGE_OF = {}
_pg = 8
for dm in DATA['dims']:
    PAGE_OF[f"d{dm['n']}"] = _pg; _pg += 1
    for ind in dm['inds']:
        PAGE_OF[ind['code']] = _pg; _pg += 1

from content_data import IND, RESP, REFL

e = html.escape
LINES = '<i></i>' * 40
import re
_NUM = re.compile(r'(\d[\d,.]*\s?(?:人次|人（[\d.]+%）|人|份|%|％|場次|場|案|元|項|類|位|處|件|篇|次|段))')


def boldnum(t):
    return _NUM.sub(r'<b class="k">\1</b>', t)


def diamond(cls='dm'):
    return (f'<svg class="{cls}" viewBox="0 0 30 12" aria-hidden="true">'
            '<path d="M6 1 11 6 6 11 1 6Z" fill="none" stroke="currentColor" stroke-width="1.1"/>'
            '<path d="M15 2.5 18.5 6 15 9.5 11.5 6Z" fill="currentColor"/>'
            '<path d="M24 1 29 6 24 11 19 6Z" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>')


def tabs(active, side):
    out = []
    for n in range(1, 7):
        out.append(f'<div class="tab{" on" if n == active else ""}" style="top:{34 + (n - 1) * 26}mm">'
                   f'<span>{NUMZH[n]}</span></div>')
    return f'<div class="tabs {side}">{"".join(out)}</div>'


def page(num, body, cls='', tab=None, foot=True):
    side = 'r' if num % 2 else 'l'
    f = (f'<footer class="ft {side}"><span class="pn">{num}</span>'
         f'<span class="fl">115 學年度原住民族實驗教育評鑑｜宜蘭縣立大同國民中學｜評鑑導讀手冊</span></footer>') if foot else ''
    t = tabs(tab, side) if tab else ''
    return (f'<section class="page {side} {cls}" data-n="{num}"><div class="trim">{t}'
            f'<div class="m">{body}</div>{f}</div></section>')


# ── 封面 ──
def cover():
    body = f'''
<div class="cv-top"><span class="cv-kick">評鑑導讀手冊</span>{diamond()}</div>
<figure class="cv-ph"><img src="img/cover.jpg" alt=""></figure>
<blockquote class="cv-q">「我發現是這塊土地<br><span class="ind">賦予給我這個身分——Tayal。」</span></blockquote>
<p class="cv-by">—— 畢業校友・Pinsbkan 尋根之旅</p>
<div class="cv-bot">
  <div><p class="cv-t1">115 學年度宜蘭縣原住民族實驗教育評鑑</p>
  <p class="cv-t2">宜蘭縣立大同國民中學</p></div>
  <div class="cv-rt"><p class="cv-book">{diamond()}評鑑導讀手冊</p><p class="cv-date">115.12.23</p></div>
</div>'''
    return page(1, body, 'cover', foot=False)


# ── 跨頁：四特質 × 指標對照 ──
def chip(code, main=False, pg=True):
    i = f'<i>{PAGE_OF[code]}</i>' if pg else ''
    return f'<span class="chip{" main" if main else ""}"><b>{code}</b>{i}</span>'


def pchip(label, pg, main=False):
    return f'<span class="chip{" main" if main else ""}"><b>{label}（第 {pg} 頁）</b></span>'


# 主要翻閱頁：預設為簡報「對應指標」標籤之第一項；P13、P21 依建議調整；P23、P24 指向專頁
MAIN_OVERRIDE = {13: '3-3', 21: '6-1'}
EXTRA_PAGE = {23: ('13 項建議', 31), 24: ('五項省思', 32)}


def slide_chips(p, codes):
    if p in EXTRA_PAGE:
        lab, pg = EXTRA_PAGE[p]
        return pchip(lab, pg, True) + ''.join(chip(x, pg=False) for x in codes)
    m = MAIN_OVERRIDE.get(p, codes[0])
    ordered = [m] + [x for x in codes if x != m]
    return ''.join(chip(x, x == m, pg=False) for x in ordered)


def spread_left():
    rows = []
    for c in CHAPTERS:
        key, name, tay, (a, b), col = c
        items = [s for s in SLIDES if a <= s[0] <= b]
        head = (f'<div class="ch-h {col}"><span class="ch-n">{name}</span>'
                f'<span class="ch-t">{tay}</span><span class="ch-r">P{a}–{b}</span></div>')
        lis = ''.join(f'<li><span class="sp">P{p}</span><span class="st">{e(t)}</span>'
                      f'<span class="cs">{slide_chips(p, codes)}</span></li>' for p, t, codes in items)
        rows.append(f'<div class="ch {col}">{head}<ul>{lis}</ul></div>')
    body = f'''
<header class="sh"><p class="kick">{diamond()}<span>簡報 × 手冊對照</span></p>
<h1>四項核心特質 × 17 項指標</h1>
<p class="lead">簡報以四項核心特質為軸線；本手冊依六大構面編排。左頁依簡報順序、右頁依指標；各指標之手冊頁碼見右頁最右欄。</p></header>
<div class="legend"><span class="sub">依簡報順序</span><span class="chip main"><b>2-1</b></span>＝主要翻閱頁　<span class="chip"><b>4-2</b></span>＝延伸參考</div>
{"".join(rows)}'''
    return page(6, body, 'spread-l')


def spread_right():
    cols = CHAPTERS
    # 指標 → 各章節出現頁
    hits = {}
    for p, t, codes in SLIDES:
        for x in codes:
            hits.setdefault(x, {}).setdefault(chapter_of(p)[0], []).append(p)
    th = ''.join(f'<th class="{c[4]}"><span class="cn">{c[1]}</span><span class="cr">P{c[3][0]}–{c[3][1]}</span></th>' for c in cols)
    trs = []
    for dm in DATA['dims']:
        trs.append(f'<tr class="dimrow"><td colspan="{len(cols) + 2}"><span class="dn">構面{NUMZH[dm["n"]]}</span>'
                   f'{e(dm["title"].split("　")[1])}<span class="dw">{dm["weight"]}</span></td></tr>')
        for ind in dm['inds']:
            h = hits.get(ind['code'], {})
            tds = ''.join(f'<td class="{c[4]}">' + (''.join(f'<span class="pp">P{p}</span>' for p in h.get(c[0], [])) or '') + '</td>' for c in cols)
            trs.append(f'<tr><td class="ic"><b>{ind["code"]}</b><span>{e(ind["title"])}</span></td>'
                       f'{tds}<td class="mp">{PAGE_OF[ind["code"]]}</td></tr>')
    body = f'''
<header class="sh sh-r"><p class="kick"><span>簡報 × 手冊對照</span></p>
<p class="lead2">每項指標在簡報中出現的頁碼依所屬章節排列，最右欄為手冊頁碼。</p>
<div class="legend"><span class="sub">依指標查找</span></div></header>
<table class="mx"><thead><tr><th class="ich">指標</th>{th}<th class="mph">手冊頁</th></tr></thead>
<tbody>{"".join(trs)}</tbody></table>
<p class="mx-note">17 項指標在簡報中皆有落點。P4、P8、P12、P17 為章名頁（學生原話），P25 為結尾頁，未標示指標。</p>'''
    return page(7, body, 'spread-r')


# ── 指標頁 ──
def dim_of(code):
    return next(d for d in DATA['dims'] if any(i['code'] == code for i in d['inds']))


def ind_of(code):
    return next(i for i in dim_of(code)['inds'] if i['code'] == code)


def slide_groups(code):
    by = {}
    for p, t, codes in SLIDES:
        if code in codes:
            by.setdefault(chapter_of(p), []).append(p)
    return by


def trait_tags(code):
    return ''.join(f'<span class="tr {c[4]}"><b>{c[1]}</b>{"・".join("P" + str(p) for p in ps)}</span>'
                   for c, ps in slide_groups(code).items())


def num_html(n):
    long = ' long' if len(n['big']) > 6 else ''
    note = f'<p class="nn">{e(n["note"]).replace(chr(10), "<br>")}</p>' if n['note'] else ''
    return (f'<div class="num"><p class="nb{long}">{e(n["big"])}<small>{e(n["unit"])}</small></p>'
            f'<p class="nl">{e(n["label"])}</p>{note}</div>')


def ind_page(code):
    dm, ind, x = dim_of(code), ind_of(code), IND[code]
    num = PAGE_OF[code]
    summ = ''.join(f'<div><dt>{e(a)}</dt><dd>{boldnum(e(b))}</dd></div>' for a, b in x['summary'])
    nums = ''.join(num_html(n) for n in x['nums'])
    ph = x['photo']
    phh = f'<figure class="ph"><img src="img/{ph[0]}" alt=""><figcaption>{e(ph[1])}</figcaption></figure>' if ph else ''
    body = f'''
<header class="ih">
  <p class="kick">{diamond()}<span>構面{NUMZH[dm["n"]]}　{e(dm["title"].split("　")[1])}</span><span class="w">配分 {dm["weight"]}</span></p>
  <h1><span class="code">{code}</span>{e(ind["title"])}</h1>
</header>
<div class="quote"><span class="lab">指標原文</span><p>{e(ind["quote"])}</p></div>
<div class="slides"><span class="lab">簡報對應</span>{trait_tags(code)}</div>
<div class="sum"><p class="lab">{x.get("label", "學校現況說明（摘要）")}</p><dl>{summ}</dl></div>
<div class="row2{' nophoto' if not ph else ''}{' one' if len(x['nums']) == 1 else ''}">
  <div class="nums"><p class="lab">關鍵數字</p>{nums}</div>
  {phh}
</div>
{f'<p class="caution"><span class="lab">判讀提醒</span>{e(x["caution"][0])}<span class="cs-src">簡報 {x["caution"][1]}</span></p>' if x.get('caution') else ''}
<div class="notes"><p class="lab">筆記</p><div class="lines">{LINES}</div></div>'''
    return page(num, body, 'ind' + (' dense' if len(x['summary']) > 5 else '') + ('' if ph else ' sparse'), tab=dm['n'])


# ── 構面頁 ──
RESP_OF_DIM = {1: 0, 2: 1, 3: 2, 4: 3, 6: 4}
# 各指標配分：取自自評報告書「評鑑項目與指標總表」
IND_WEIGHT = {'1-1': 10, '1-2': 10, '2-1': 7, '2-2': 7, '2-3': 6, '3-1': 8, '3-2': 7, '3-3': 7, '3-4': 8, '4-1': 3, '4-2': 2, '5-1': 1, '5-2': 1, '5-3': 3, '6-1': 5, '6-2': 7, '6-3': 8}
DIM_PHOTO = {  # 取自網站各指標頁照片
    1: ('f3a44d5c7e.jpg', '文化領域教學研究會，文化教師與協同教師共同檢視各年段課程實施進度與學生學習情形。'),
    2: ('37266da62b.jpg', '傳統穀倉'),
    3: ('0cf17984fc.jpg', '八年級弓織實作課程'),
    4: ('7a7e838c9b.jpg', '112 年度營造原住民族文化學習場域計畫－文化廊道改善後空間'),
    5: ('4dce9b316b.jpg', '全校路跑賽暨推動交通安全教育活動'),
    6: ('2b9d0ffb53.jpg', 'magu byaling 期間之小米酒製作'),
}


def dim_page(dm):
    num = PAGE_OF[f"d{dm['n']}"]
    name = dm['title'].split('　')[1]
    rows = ''.join(f'<tr><td class="dt-c">{i["code"]}</td><td class="dt-t">{e(i["title"])}</td><td class="dt-w">{IND_WEIGHT[i["code"]]}</td><td class="dt-p">{PAGE_OF[i["code"]]}</td></tr>' for i in dm['inds'])
    cards = f'<table class="dtab"><thead><tr><th>指標</th><th></th><th>配分</th><th>手冊頁</th></tr></thead><tbody>{rows}</tbody></table>'
    ri = RESP_OF_DIM.get(dm['n'])
    resp = (f'<p class="dp-r">前次評鑑（112 學年度）本構面委員建議 <b>{len(RESP[ri][1])} 項</b>，回應摘要見第 31 頁。</p>'
            if ri is not None else '<p class="dp-r">前次評鑑（112 學年度）本構面無具體建議事項。</p>')
    body = f'''<div class="dp-hero"><p class="kick">{diamond()}<span>構面{NUMZH[dm["n"]]}</span></p>
<p class="dp-n">{NUMZH[dm["n"]]}</p><h1 class="dp-t">{e(name)}</h1>
<p class="dp-w"><span>配分</span><b>{dm["weight"]}</b><span class="dp-c">本構面 {len(dm["inds"])} 項指標</span></p></div>
<figure class="dp-ph"><img src="img/{DIM_PHOTO[dm['n']][0]}" alt=""><figcaption>{e(DIM_PHOTO[dm['n']][1])}</figcaption></figure>
<div class="dp-list">{cards}</div>{resp}'''
    return page(num, body, 'dimp', tab=dm['n'])


# ── 第 2 頁：使用說明＋目錄 ──
def toc_page():
    guide = [
        '本手冊依評鑑六大構面編排，每項指標一頁，依序為指標原文、簡報對應、學校現況說明（摘要）、關鍵數字與照片，頁底留有筆記欄。',
        '簡報以四項核心特質為軸線；簡報各頁對應之指標與手冊頁碼，見第 6–7 頁。',
        '頁面外緣之色塊為構面索引（一至六），可快速翻至各構面。',
        '17 項指標完整內容請見評鑑網站，網址與 QR code 見封底。',
    ]
    g = ''.join(f'<li>{e(t)}</li>' for t in guide)
    front = [('學校概況', 3), ('評鑑網站（3D 導覽）使用指南', 4), ('四項核心特質 × 17 項指標', 6)]
    back = [('前次評鑑 13 項建議回應摘要', 31), ('民族教育省思', 32), ('綜合座談筆記', 33), ('評鑑網站', 36)]
    def row(t, p, cls=''):
        return f'<li class="{cls}"><span class="tt">{t}</span><span class="dots"></span><span class="tp">{p}</span></li>'
    dims = ''
    for dm in DATA['dims']:
        inds = ''.join(row(f'<b>{i["code"]}</b>　{e(i["title"])}', PAGE_OF[i["code"]], 'sub') for i in dm['inds'])
        head = row(f'構面{NUMZH[dm["n"]]}　{e(dm["title"].split("　")[1])}<span class="w">{dm["weight"]}</span>', PAGE_OF['d' + str(dm['n'])], 'dim')
        dims += f'<div class="td"><ul>{head}{inds}</ul></div>'
    body = f'''<header class="sh"><p class="kick">{diamond()}<span>使用說明</span></p><h1>如何使用本手冊</h1></header>
<ol class="guide">{g}</ol>
<p class="lab toc-lab">目錄</p>
<ul class="toc">{"".join(row(t, p) for t, p in front)}</ul>
<div class="toc-dims">{dims}</div>
<ul class="toc">{"".join(row(t, p) for t, p in back)}</ul>'''
    return page(2, body, 'tocp')


# ── 第 3 頁：學校概況（取自簡報 P2、P3） ──
def profile_page():
    traits = [('愛土地', 'mlahang rhzyal', 'sage'), ('負責', 'ssyan inlungan', 'terra'),
              ('合作', 'pkrraw', 'mist'), ('感恩', 'smyuk kinhuway', 'plum')]
    tr = ''.join(f'<div class="pt {c}"><b>{a}</b><i>{b}</i></div>' for a, b, c in traits)
    body = f'''<header class="sh"><p class="kick">{diamond()}<span>學校概況與願景</span><span class="pg-ref">簡報 P2–P3</span></p>
<h1>帶著孩子，共同踏上成為 Tayal balay 的道路</h1></header>
<div class="stats">
  <div><p class="sb">33<small>位</small></p><p class="sl">學生，全數為泰雅族</p></div>
  <div><p class="sb">4<small>個部落</small></p><p class="sl">南山・四季<br>茂安・英士</p></div>
  <div><p class="sb">107<small>學年度</small></p><p class="sl">轉型實驗教育</p></div>
  <div><p class="sb">119.7.31</p><p class="sl">核定期程（107.8.1 起）</p></div>
</div>
<div class="vision"><p class="vt">Tayal balay<span>（真正的泰雅人）</span></p>
<p class="vd">自 gaga（祖靈的話語與訓誡）中，全校師生共同析出四項核心特質</p>
<div class="ptraits">{tr}</div></div>
<p class="lab mech-lab">四項特質在課程中的落實機制</p>
<div class="mech">
  <div><p class="mn">01</p><p class="mt">三年主題課程</p><ul><li>七年級　燒墾生活</li><li>八年級　gaga 家庭與編織</li><li>九年級　山林智慧</li></ul></div>
  <div><p class="mn">02</p><p class="mt">雙軌融入</p><ul><li><b>明示</b>：課程設計、課堂常規、公開授課觀察表</li><li><b>暗示</b>：歲時農耕、祭儀分工、耆老身教</li></ul></div>
  <div><p class="mn">03</p><p class="mt">檢視與評量</p><ul><li>每週教學研究會檢視融入情形</li><li>質性成績單描述學生展現特質事例</li></ul></div>
</div>
<div class="prev"><p class="lab">112 學年度評鑑委員建議（摘錄）</p>
<p class="pq">「建議於特定評鑑項目，以『愛土地、負責、合作、感恩』四項人格特質為軸線，更具體呈現計畫理念之落實狀況。」</p>
<p class="pa">本次簡報以四項特質為主軸，同時呈現學校的支持行動與學生的具體表現。</p></div>'''
    return page(3, body, 'prof')


# ── 第 31 頁：前次 13 項建議回應 ──
def resp_page():
    rows, k = '', 0
    for grp, items in RESP:
        rows += f'<tr class="g"><td colspan="3">{e(grp)}<span>{len(items)} 項</span></td></tr>'
        for a, b in items:
            k += 1
            rows += f'<tr><td class="no">{k}</td><td class="ra">{e(a)}</td><td class="rb">{boldnum(e(b))}</td></tr>'
    body = f'''<header class="sh"><p class="kick">{diamond()}<span>回應前次評鑑</span><span class="pg-ref">簡報 P23｜指標 6-3</span></p>
<h1>前次 13 項建議，逐項回應</h1>
<p class="lead">依「宜蘭縣 112 學年度原住民族實驗教育評鑑結果報告書」委員書面審查意見摘錄，對照本校回應作法。112 學年度六個項目與本次構面相同；項目五（相關法規之遵行）委員未提具體建議。</p></header>
<table class="rt"><thead><tr><th></th><th>委員建議（摘要）</th><th>本校回應（摘要）</th></tr></thead><tbody>{rows}</tbody></table>'''
    return page(31, body, 'respp')


# ── 第 32 頁：五項省思 ──
def refl_page():
    nm = '一二三四五'
    blocks = ''
    for i, (q, d, act, refs) in enumerate(REFL):
        chips = ''.join(chip(r, pg=False) for r in refs)
        blocks += f'''<div class="rf"><p class="rf-h"><span class="rf-n">省思{nm[i]}</span>{e(q)}</p>
<p class="rf-d">{e(d)}</p><p class="rf-a"><span class="lab">對應作為</span>{boldnum(e(act))}<span class="rf-c">{chips}</span></p></div>'''
    body = f'''<header class="sh"><p class="kick">{diamond()}<span>民族教育省思</span><span class="pg-ref">簡報 P24｜指標 6-3</span></p>
<h1>我們持續追問的五個問題</h1></header>
<div class="rfs">{blocks}</div>'''
    return page(32, body, 'reflp')


def notes_page(num, kick='綜合座談', title='綜合座談筆記'):
    body = f'''<header class="sh"><p class="kick">{diamond()}<span>{kick}</span></p><h1>{title}</h1></header>
<div class="notes full"><div class="lines">{LINES}</div></div>'''
    return page(num, body, 'notes-p')


def back_cover(num):
    links = [('qr_3d.svg', '評鑑網站（3D 導覽）', 'bacon-sys.github.io/115-eval-3d/'),
             ('qr_notion.svg', '評鑑網站（Notion 版）', 'helix-mitten-106.notion.site/<br>3c81d191518e817b9b3feb91979aedc2'),
             ('qr_trail.svg', '三年山徑（課程地圖）', 'bacon-sys.github.io/datong-trail/'),
             ('qr_sitemap.svg', '評鑑網站地圖', 'bacon-sys.github.io/115-eval-sitemap/')]
    cards = ''.join(f'<div class="bq"><img src="img/{q}" alt=""><p class="bl">{e(t)}</p><p class="url">{u}</p></div>'
                    for q, t, u in links)
    body = f'''<p class="bc-h">17 項指標完整內容請見評鑑網站</p>
<div class="bc-grid">{cards}</div>
<div class="bc-bot">{diamond()}<p class="bc-s">宜蘭縣立大同國民中學</p><p class="bc-t">115 學年度宜蘭縣原住民族實驗教育評鑑｜評鑑導讀手冊</p></div>'''
    return page(num, body, 'back', foot=False)


from guide_pages import guide_pages, CSS as GUIDE_CSS
CSS = (ROOT / 'book.css').read_text() + GUIDE_CSS


def build(mode, bleed):
    if mode == 'sample':
        pages = [cover(), *guide_pages(4, diamond), spread_left(), spread_right(), ind_page('3-4'), back_cover(36)]
    else:
        pages = [cover(), toc_page(), profile_page(), *guide_pages(4, diamond), spread_left(), spread_right()]
        for dm in DATA['dims']:
            pages.append(dim_page(dm))
            pages += [ind_page(i['code']) for i in dm['inds']]
        pages += [resp_page(), refl_page(), notes_page(33), notes_page(34, '筆記', '筆記'), notes_page(35, '筆記', '筆記'), back_cover(36)]
    b = 3 if bleed else 0
    doc = f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<style>:root{{--b:{b}mm;--z:{210/182}}} @page{{size:{210 + 2 * b}mm {297 + 2 * b}mm;margin:0}}</style>
<link rel="stylesheet" href="fonts.css"><style>{CSS}</style></head><body>{"".join(pages)}</body></html>'''
    out = ROOT / f'{mode}{"_bleed" if bleed else ""}.html'
    out.write_text(doc)
    return out


def pdf(htmlp, pdfp):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        br = p.chromium.launch()
        pg = br.new_page()
        pg.goto(htmlp.resolve().as_uri())
        pg.wait_for_load_state('networkidle')
        # 溢出檢查
        over = pg.evaluate('''() => [...document.querySelectorAll('.page')].map(s => {
            const m = s.querySelector('.m, .gm'); return [s.dataset.n, m.scrollHeight - m.clientHeight]}).filter(a => a[1] > 1)''')
        if over: print('⚠ 溢出：', over)
        pg.pdf(path=str(pdfp), prefer_css_page_size=True, print_background=True)
        br.close()


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'sample'
    hs = [build(mode, bl) for bl in (False, True)]
    import fonts; fonts.main([str(h) for h in hs])
    for h in hs:
        pdf(h, h.with_suffix('.pdf'))
        print('→', h.with_suffix('.pdf'))
