"""手冊第 34–35 頁跨頁：歲時祭儀與三年課程（左）＋校園文化學習場域地圖（右）。
內容來源：
- 歲時循環：網站 6-2「泰雅歲時祭儀年度循環圖」（img/full/3631cc4c47.png）之月份與說明
- 三年課程：三年山徑 valley/src/data.js 之 21 主題與四構面（DIMS、DIM_NOTE）
- 文化場域：網站 2-1 文化場域表（場域、主要教學用途）；位置依學校校舍配置圖與老師說明
版面同使用指南：以 A4 實際 mm 排版（guide_pages 的 .gdp／.gd／.gm）。
"""
import html
from guide_pages import _page

e = html.escape

# ───────── 左頁：歲時祭儀與三年課程 ─────────
EVENTS = [  # 月份（學年順序 8..7）, 標題, 族語, 說明（取自 6-2 年度循環圖）, 色
    ('9 月、11 月', 'magu byaling', '祭儀準備期', '備儀分工、醃肉與小米酒、陷阱製作、獵物捕捉，並持續觀測月相。', '#C7A048'),
    ('10 月', '感恩祖靈祭', 'Cmyus', '以親手製作之祭品獻祭，回顧一年並感謝祖靈。', '#9A84B6'),
    ('12 月', '小米播種祭', 'Smgatu', '由部落耆老帶領，師生於清晨依傳統儀式流程共同完成祭儀。', '#C9706A'),
    ('2 月', '播種', 'tmubux', '於校園小米田實際進行播種作業。', '#6F93B8'),
    ('6 月', '採收／小米收割祭', 'kmluh', '師生共同收割，依傳統流程辦理儀式。', '#6E9C7A'),
]
MONTHS = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7]
MARK = {9: 0, 11: 0, 10: 1, 12: 2, 2: 3, 6: 4}  # 月份 → EVENTS 索引

GRADES = [('七年級', '燒墾生活'), ('八年級', 'gaga 家庭與編織'), ('九年級', '山林智慧')]
DIMS = [('自然與環境', '人與自然', '#5E8F6B', '#E3EDE2'), ('組織與結構', '人與社會', '#C07A4E', '#F5E8DC'),
        ('記憶與技藝', '人與他人', '#B8657A', '#F4E3E7'), ('省思與回顧', '人與自己', '#8A72A6', '#ECE5F2')]
TOPICS = {  # 依三年山徑 data.js（id 1–21）
    ('七年級', 0): ['燒墾管理'], ('七年級', 1): ['小米祭典', '小米祭饌'],
    ('七年級', 2): ['竹製生活器具(1)', '木製生活器具(1)', '藤製生活器具(1)'], ('七年級', 3): ['專題基礎實務(1)'],
    ('八年級', 0): ['苧麻製線與染線'], ('八年級', 1): ['傳統信仰與生命禮俗', '家與gaga團體'],
    ('八年級', 2): ['泰雅服飾與工藝', '傳統地機編織', '弓織技藝應用'], ('八年級', 3): ['專題基礎實務(2)'],
    ('九年級', 0): ['傳統建築與生活', '漁獵生態體驗'], ('九年級', 1): ['族群遷徙與歷史'],
    ('九年級', 2): ['竹製生活器具(2)', '木製生活器具(2)', '藤製生活器具(2)'], ('九年級', 3): ['專題研究實作'],
}
FIELDS = {'七年級': [(1, '小米田'), (6, '工寮'), (8, '青年學習場域')], '八年級': [(2, '苧麻園'), (7, '文化廊道')],
          '九年級': [(4, '傳統穀倉'), (3, '傳統家屋'), (5, '瞭望台'), (None, '後山獵徑')]}


def timeline_svg():
    W, H = 1000, 140
    x0, x1 = 40, 960
    step = (x1 - x0) / 12
    s = [f'<svg viewBox="0 0 {W} {H}" class="x-tl" xmlns="http://www.w3.org/2000/svg">']
    # 學期底色
    s.append(f'<rect x="{x0}" y="42" width="{step * 6:.1f}" height="34" rx="17" fill="#EFE7DA"/>')
    s.append(f'<rect x="{x0 + step * 6:.1f}" y="42" width="{step * 6:.1f}" height="34" rx="17" fill="#E6EEE6"/>')
    s.append(f'<text x="{x0 + step * 3:.1f}" y="114" class="sem">上學期</text>')
    s.append(f'<text x="{x0 + step * 9:.1f}" y="114" class="sem">下學期</text>')
    for i, m in enumerate(MONTHS):
        cx = x0 + step * (i + .5)
        if m in MARK:
            c = EVENTS[MARK[m]][4]
            s.append(f'<circle cx="{cx:.1f}" cy="59" r="23" fill="{c}"/>')
            s.append(f'<text x="{cx:.1f}" y="66" class="mn on">{m}</text>')
        else:
            s.append(f'<circle cx="{cx:.1f}" cy="59" r="17" fill="#fff" stroke="#D8CFBF" stroke-width="2"/>')
            s.append(f'<text x="{cx:.1f}" y="65" class="mn">{m}</text>')
    # 小米生長箭頭（播種 → 採收）
    a, b = x0 + step * (MONTHS.index(2) + .5), x0 + step * (MONTHS.index(6) + .5)
    s.append(f'<path d="M{a + 26:.1f} 59 L{b - 30:.1f} 59" stroke="#9DB79F" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>')
    s.append(f'<text x="{(a + b) / 2:.1f}" y="22" class="grow">小米生長</text>')
    s.append('</svg>')
    return ''.join(s)


def ritual_page(num, diamond):
    cards = ''.join(
        f'<div class="x-ev" style="--c:{c}"><p class="x-evm">{m}</p><p class="x-evt"><b>{t}</b><i>{z}</i></p><p class="x-evd">{e(d)}</p></div>'
        for m, t, z, d, c in EVENTS)
    head = ''.join(f'<th><span class="x-g">{g}</span><b>{t}</b></th>' for g, t in GRADES)
    rows = ''
    for k, (dn, ds, c, tint) in enumerate(DIMS):
        cells = ''.join('<td>' + ''.join(f'<span class="x-tp" style="--c:{c};--t:{tint}">{e(t)}</span>' for t in TOPICS[(g, k)]) + '</td>'
                        for g, _ in GRADES)
        rows += f'<tr><th class="x-dn" style="--c:{c}"><b>{dn}</b><small>{ds}</small></th>{cells}</tr>'
    fld = ''.join('<td>' + ''.join((f'<span class="x-fd"><span class="x-no">{n}</span>{t}</span>' if n else f'<span class="x-fd x-nn">{t}</span>') for n, t in FIELDS[g]) + '</td>'
                  for g, _ in GRADES)
    rows += f'<tr class="x-frow"><th class="x-dn"><b>主要場域</b><small>對照右頁地圖</small></th>{fld}</tr>'
    inner = f'''<p class="kick">{diamond()}<span>歲時與課程</span></p>
<h1>歲時祭儀與三年課程</h1>
<p class="g-lead">以小米生命週期為軸線，串連祭儀、農事與學生實作；三年文化課程依四個構面，安排 21 個主題。</p>
<div class="g-sec"><div class="x-sh">一學年的歲時循環<small>依網站 6-2 泰雅歲時祭儀年度循環</small></div>
{timeline_svg()}
<div class="x-evs">{cards}<p class="x-evq">從 magu byaling 到祭儀的完整歷程，使學生理解泰雅族歲時生活與祖靈信仰、土地倫理之間的深刻連結。</p></div></div>
<div class="g-sec"><div class="x-sh">三年文化課程：四構面 × 21 個主題<small>依三年山徑（課程地圖）</small></div>
<table class="x-ct"><thead><tr><th></th>{head}</tr></thead><tbody>{rows}</tbody></table>
<p class="g-cap">每個主題依主要學習重點歸入一個構面，實際課程常跨越多個構面。主要場域依網站 2-1 文化場域之教學用途與學校說明。</p></div>'''
    return _page(num, inner)


# ───────── 右頁：校園文化學習場域地圖 ─────────
SITES = [  # 編號, 場域, 精簡用途（依網站 2-1；烤火屋依老師說明）, 照片
    (1, '小米田', '七年級燒墾管理、開墾播種、摘穗打米', 's1'),
    (2, '苧麻園', '八年級苧麻栽植、刮麻製線與染線', 's2'),
    (3, '傳統家屋', '傳統建築工法教學；祭儀與文化課程情境學習', 's3'),
    (4, '傳統穀倉（2 座）', '九年級傳統建築單元，耆老到校與學生共作', 's4'),
    (5, '瞭望台', '傳統聚落空間結構之教學展示', 's5'),
    (6, '工寮（2 座）', '七年級工寮搭建與三石灶實作；戶外課程據點', 's6'),
    (7, '文化廊道', '地機編織等技藝課程操作；學生作品展示', 's7'),
    (8, '青年學習場域', '文化課程共作、成果展示、祭儀與部落活動', 's8'),
    (9, '烤火屋', '耆老講述建築修繕經驗與文化意涵，學生圍火傾聽、討論與記錄', 's9'),
]


def tree(x, y, s=1.0, c='#7FB07A', c2='#5E9560'):
    return (f'<g transform="translate({x},{y}) scale({s})"><rect x="-4" y="0" width="8" height="18" rx="3" fill="#9C7656"/>'
            f'<circle cx="0" cy="-10" r="22" fill="{c2}"/><circle cx="-8" cy="-16" r="15" fill="{c}"/><circle cx="9" cy="-14" r="13" fill="{c}"/></g>')


def pine(x, y, s=1.0, c='#4F8A5E', c2='#5E9A69'):
    return (f'<g transform="translate({x},{y}) scale({s})"><rect x="-3" y="0" width="6" height="12" fill="#8C6A4E"/>'
            f'<path d="M0 -44 L18 -8 L-18 -8Z" fill="{c}"/><path d="M0 -30 L22 4 L-22 4Z" fill="{c2}"/></g>')


def millet(x, y, s=1.0):
    return (f'<g transform="translate({x},{y}) scale({s})"><path d="M0 0 Q2 -22 0 -40" stroke="#8FA65B" stroke-width="3" fill="none"/>'
            f'<path d="M0 -38 Q10 -36 12 -22" stroke="#C9A23C" stroke-width="7" fill="none" stroke-linecap="round"/>'
            f'<path d="M0 -14 Q-10 -18 -14 -10" stroke="#8FA65B" stroke-width="3" fill="none"/></g>')


def ramie(x, y, s=1.0):
    return (f'<g transform="translate({x},{y}) scale({s})"><path d="M0 0 L0 -34" stroke="#5C8A4F" stroke-width="3"/>'
            f'<ellipse cx="-9" cy="-26" rx="10" ry="6" fill="#6FA35D" transform="rotate(-30 -9 -26)"/>'
            f'<ellipse cx="9" cy="-18" rx="10" ry="6" fill="#7DB36A" transform="rotate(30 9 -18)"/>'
            f'<ellipse cx="-8" cy="-10" rx="9" ry="5" fill="#6FA35D" transform="rotate(-25 -8 -10)"/>'
            f'<ellipse cx="0" cy="-36" rx="6" ry="9" fill="#8BBF75"/></g>')


def granary(x, y, s=1.0):
    """傳統穀倉：高腳、防鼠板、木牆、茅草屋頂（密閉）"""
    return (f'<g transform="translate({x},{y}) scale({s})"><path d="M-26 0 V-26 M26 0 V-26 M-8 0 V-26 M8 0 V-26" stroke="#7A5A40" stroke-width="5"/>'
            '<ellipse cx="0" cy="-28" rx="34" ry="6" fill="#6B4E38"/><rect x="-30" y="-62" width="60" height="34" rx="4" fill="#B88A5E"/>'
            '<path d="M-14 -62 V-28 M2 -62 V-28 M18 -62 V-28" stroke="#9A6F49" stroke-width="2"/>'
            '<path d="M-44 -58 L0 -96 L44 -58Z" fill="#C9A56A"/><path d="M-44 -58 L0 -96 L44 -58" fill="none" stroke="#A88850" stroke-width="3"/></g>')


def hut(x, y, s=1.0):
    """工寮：四柱、單斜屋頂、三石灶（開放）"""
    return (f'<g transform="translate({x},{y}) scale({s})"><path d="M-40 0 V-44 M40 0 V-44 M-40 -44 L40 -60" stroke="#7A5A40" stroke-width="6"/>'
            '<path d="M-52 -40 L52 -66 L56 -54 L-48 -28Z" fill="#9C8A5A"/><circle cx="-6" cy="-10" r="8" fill="#7B7468"/><circle cx="10" cy="-10" r="8" fill="#7B7468"/><circle cx="2" cy="-22" r="8" fill="#7B7468"/>'
            '<path d="M2 -32 Q-4 -40 2 -48" stroke="#E07B3E" stroke-width="5" fill="none" stroke-linecap="round"/></g>')


def pavilion(x, y):
    """青年學習場域：長形開放式涼亭（側面），低斜屋頂、整排木柱、柴堆與長桌"""
    posts = ''.join(f'<rect x="{px - 3}" y="-50" width="6" height="50" fill="#7A5A40"/>' for px in range(-74, 80, 21))
    return (f'<g transform="translate({x},{y})">'
            '<rect x="-84" y="-2" width="168" height="8" rx="4" fill="#CDBB9C"/>'
            f'{posts}'
            '<rect x="-46" y="-22" width="52" height="5" rx="2" fill="#9C7656"/><path d="M-40 -17 V-4 M0 -17 V-4" stroke="#9C7656" stroke-width="3"/>'
            '<g fill="#A97B57"><circle cx="30" cy="-6" r="6"/><circle cx="42" cy="-6" r="6"/><circle cx="54" cy="-6" r="6"/><circle cx="36" cy="-16" r="6"/><circle cx="48" cy="-16" r="6"/></g>'
            '<g fill="#C9A982"><circle cx="30" cy="-6" r="2.5"/><circle cx="42" cy="-6" r="2.5"/><circle cx="54" cy="-6" r="2.5"/><circle cx="36" cy="-16" r="2.5"/><circle cx="48" cy="-16" r="2.5"/></g>'
            '<path d="M-96 -46 L96 -46 L84 -66 L-84 -66Z" fill="#8E8778"/>'
            '<path d="M-96 -46 L96 -46" stroke="#6E6759" stroke-width="4"/>'
            + ''.join(f'<path d="M{px} -66 L{px + 3} -46" stroke="#A9A293" stroke-width="2"/>' for px in range(-80, 90, 12)) +
            '</g>')


def pavilion_v(x, y, w, h):
    """青年學習場域（直式）：長形屋頂由上往下延伸、南端露出山牆面的整排木柱、長桌與柴堆"""
    rh = h - 64                       # 屋頂長度
    out = [f'<g transform="translate({x},{y})">']
    out.append(f'<rect x="0" y="0" width="{w}" height="{h}" rx="12" fill="#E4D8C2"/>')
    # 屋頂（兩坡，左寬右窄＝斜上方視角）＋橫向竹片
    out.append(f'<path d="M4 6 H{w - 4} V{rh} H4Z" fill="#8E8778"/>')
    out.append(f'<path d="M{w * .62:.0f} 6 H{w - 4} V{rh} H{w * .62:.0f}Z" fill="#77705F"/>')
    out.append(''.join(f'<path d="M6 {yy} H{w - 6}" stroke="#A9A293" stroke-width="2"/>' for yy in range(18, rh - 4, 13)))
    out.append(f'<path d="M{w * .62:.0f} 6 V{rh}" stroke="#5F584A" stroke-width="5"/>')
    out.append(f'<path d="M4 {rh} H{w - 4}" stroke="#5F584A" stroke-width="4"/>')
    # 南端山牆面：木柱、長桌、柴堆
    out.append(f'<rect x="8" y="{h - 10}" width="{w - 16}" height="6" rx="3" fill="#CDBB9C"/>')
    out.append(''.join(f'<rect x="{px}" y="{rh}" width="6" height="{h - rh - 8}" fill="#7A5A40"/>' for px in range(10, w - 10, 22)))
    out.append(f'<rect x="22" y="{h - 30}" width="40" height="5" rx="2" fill="#9C7656"/>')
    out.append(''.join(f'<circle cx="{cx}" cy="{cy}" r="5" fill="#A97B57"/>' for cx, cy in [(78, h - 16), (88, h - 16), (98, h - 16), (83, h - 25), (93, h - 25)]))
    out.append('</g>')
    return ''.join(out)


def label(x, y, n, t, anchor='l'):
    """編號圓點＋白底名牌；anchor: l 名牌在右、r 名牌在左、t 名牌在下"""
    w = 34 + len(t) * 29
    if anchor == 'l':
        bx, by = x + 14, y - 21
    elif anchor == 'r':
        bx, by = x - 14 - w, y - 21
    else:
        bx, by = x - w / 2, y + 20
    return (f'<g class="lb"><rect x="{bx:.0f}" y="{by:.0f}" width="{w}" height="42" rx="21" fill="#FFFDF7" stroke="#D9CBB6" stroke-width="2"/>'
            f'<text x="{bx + w / 2:.0f}" y="{by + 30:.0f}" class="lt">{t}</text>'
            f'<circle cx="{x}" cy="{y}" r="24" fill="#A9654C" stroke="#fff" stroke-width="5"/>'
            f'<text x="{x}" y="{y + 9}" class="ln">{n}</text></g>')


def dot(x, y, n):
    """同類第二座場域：只放編號圓點"""
    return (f'<g class="lb"><circle cx="{x}" cy="{y}" r="24" fill="#A9654C" stroke="#fff" stroke-width="5"/>'
            f'<text x="{x}" y="{y + 9}" class="ln">{n}</text></g>')


def tag(x, y, t, w=None, cls='st'):
    w = w or (30 + len(t) * 23)
    return (f'<g><rect x="{x - w / 2:.0f}" y="{y - 20}" width="{w}" height="38" rx="19" fill="#FFFDF7" stroke="#D9CBB6" stroke-width="2" opacity=".96"/>'
            f'<text x="{x}" y="{y + 7}" class="{cls}">{t}</text></g>')


def plain(x, y, t, cls='pl'):
    return f'<text x="{x}" y="{y}" class="{cls}">{t}</text>'


def bldg(x, y, w, h, lines, fill='#F2D9D3', cls='bl'):
    out = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill}"/>'
    n = len(lines); lh = 30 if cls == 'bl' else 26
    for i, t in enumerate(lines):
        out += plain(x + w / 2, y + h / 2 + 9 + (i - (n - 1) / 2) * lh, t, cls)
    return out


def map_svg():
    W, H = 1600, 1500
    s = [f'<svg viewBox="0 0 {W} {H}" class="x-map" xmlns="http://www.w3.org/2000/svg">',
         '<defs><pattern id="dia" width="40" height="40" patternUnits="userSpaceOnUse">'
         '<rect width="40" height="40" fill="#C2524A"/><path d="M20 4 L34 20 L20 36 L6 20Z" fill="#FFF7EE"/>'
         '<path d="M20 12 L27 20 L20 28 L13 20Z" fill="#C2524A"/></pattern>'
         '<pattern id="weave" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#B98A5E"/>'
         '<path d="M12 3 L21 12 L12 21 L3 12Z" fill="none" stroke="#F3E3C8" stroke-width="2.5"/></pattern>'
         '<pattern id="slate" width="36" height="18" patternUnits="userSpaceOnUse"><rect width="36" height="18" fill="#8E8778"/>'
         '<path d="M0 17 H36 M18 0 V17" stroke="#A9A293" stroke-width="2"/></pattern>'
         '<pattern id="solar" width="30" height="20" patternUnits="userSpaceOnUse"><rect width="30" height="20" fill="#5D7FA6"/>'
         '<path d="M0 0H30M0 10H30M15 0V20" stroke="#8FB0D2" stroke-width="1.5"/></pattern></defs>',
         f'<rect width="{W}" height="{H}" rx="40" fill="#EAF0DF"/>']
    # ── 北側：獨立山
    s.append('<path d="M0 560 Q60 300 210 170 Q300 95 380 150 Q470 230 520 560Z" fill="#8DBA7F"/>')
    s.append('<path d="M60 560 Q120 360 240 250 Q300 205 350 240 Q420 300 450 560Z" fill="#7AAE70"/>')
    s.append('<path d="M138 300 Q260 250 418 300 L424 330 Q262 282 130 332Z" fill="#C2524A"/>')
    for i in range(6):
        cx = 170 + i * 44; cy = 300 - (14 if 1 <= i <= 4 else 4)
        s.append(f'<path d="M{cx} {cy - 9} L{cx + 9} {cy} L{cx} {cy + 9} L{cx - 9} {cy}Z" fill="#FFF7EE"/>')
    s.append('<circle cx="235" cy="380" r="11" fill="#2F3A2C"/><circle cx="325" cy="380" r="11" fill="#2F3A2C"/>'
             '<circle cx="239" cy="376" r="3.5" fill="#fff"/><circle cx="329" cy="376" r="3.5" fill="#fff"/>'
             '<path d="M245 425 Q280 455 315 425" stroke="#2F3A2C" stroke-width="7" fill="none" stroke-linecap="round"/>'
             '<ellipse cx="210" cy="415" rx="16" ry="9" fill="#E8A39A" opacity=".7"/><ellipse cx="350" cy="415" rx="16" ry="9" fill="#E8A39A" opacity=".7"/>')
    s += [pine(90, 520, .9), pine(140, 470, .8), pine(430, 500, .85), pine(470, 540, .7)]
    s.append(tag(285, 504, '獨立山', 190, 'mt'))
    # 跑道
    s.append('<ellipse cx="1040" cy="118" rx="330" ry="92" fill="#D9A57E"/>'
             '<ellipse cx="1040" cy="118" rx="296" ry="64" fill="none" stroke="#F3E3D3" stroke-width="3"/>'
             '<ellipse cx="1040" cy="118" rx="262" ry="44" fill="#9CC48E"/>')
    s.append(plain(1040, 128, '200 米 PU 跑道', 'pl'))
    # 小米田區
    s.append('<rect x="560" y="232" width="960" height="214" rx="44" fill="#E7D9A8" stroke="#D2BF86" stroke-width="3"/>')
    for row in range(3):
        for col in range(14):
            x = 830 + col * 44 + (row % 2) * 20; y = 296 + row * 52
            if x < 1380 and not (row == 2 and 880 < x < 1010):
                s.append(millet(x, y, .9))
    # 苧麻園
    s.append('<rect x="578" y="250" width="150" height="178" rx="30" fill="#D5E4BE"/>')
    for x, y in [(610, 300), (650, 290), (690, 302), (620, 352), (662, 344), (702, 356), (612, 410), (654, 398), (696, 410)]:
        s.append(ramie(x, y, .9))
    # 烤火屋（半開放：柱子＋矮竹牆＋人字屋頂＋炊煙）
    s.append('<g transform="translate(790,290)"><path d="M-34 0 V-40 M34 0 V-40 M0 0 V-40" stroke="#7A5A40" stroke-width="5"/>'
             '<rect x="-38" y="-18" width="26" height="18" fill="#C9AE7E"/><rect x="12" y="-18" width="26" height="18" fill="#C9AE7E"/>'
             '<path d="M-34 -18 V0 M-26 -18 V0 M-18 -18 V0 M18 -18 V0 M26 -18 V0 M34 -18 V0" stroke="#A88E5E" stroke-width="2"/>'
             '<path d="M-6 -4 Q0 -16 6 -4Z" fill="#E07B3E"/>'
             '<path d="M-48 -36 L0 -70 L48 -36 L44 -32 L0 -62 L-44 -32Z" fill="#8A6A4A"/>'
             '<circle cx="18" cy="-80" r="8" fill="#E9E4DC"/><circle cx="28" cy="-96" r="11" fill="#EFEBE5"/></g>')
    # 穀倉（農園左側）
    s.append(granary(790, 410))
    # 工寮 ×2：農園右端、光電球場上方
    s.append(hut(1440, 402))
    s.append(hut(948, 436, .85))
    # 光電球場
    s.append('<rect x="560" y="458" width="960" height="84" rx="18" fill="url(#solar)" stroke="#4E6E93" stroke-width="3"/>')
    s.append(tag(1180, 500, '光電球場', 170))
    # ── 泰雅路四段
    s.append('<rect x="0" y="562" width="1600" height="86" fill="#B9B4AA"/>'
             '<path d="M0 605 H1600" stroke="#FFFDF7" stroke-width="5" stroke-dasharray="34 26"/>')
    s.append(tag(1365, 605, '泰雅路四段', 190))
    s.append('<g transform="translate(470,575)"><rect x="0" y="0" width="150" height="58" rx="16" fill="#4E7DB5"/>'
             '<rect x="14" y="10" width="26" height="20" rx="4" fill="#DCEBF7"/><rect x="48" y="10" width="26" height="20" rx="4" fill="#DCEBF7"/>'
             '<rect x="82" y="10" width="26" height="20" rx="4" fill="#DCEBF7"/><rect x="116" y="10" width="24" height="26" rx="4" fill="#DCEBF7"/>'
             '<circle cx="34" cy="58" r="11" fill="#3B3936"/><circle cx="116" cy="58" r="11" fill="#3B3936"/></g>')
    s.append('<g transform="translate(800,594)"><path d="M0 34 Q4 6 30 4 H70 Q92 6 100 34Z" fill="#D9675A"/>'
             '<rect x="34" y="10" width="20" height="16" rx="3" fill="#F6E6E1"/><rect x="58" y="10" width="20" height="16" rx="3" fill="#F6E6E1"/>'
             '<circle cx="24" cy="36" r="9" fill="#3B3936"/><circle cx="78" cy="36" r="9" fill="#3B3936"/></g>')
    # ── 南側校園
    s.append('<rect x="20" y="666" width="1560" height="620" rx="36" fill="#F3EDE2"/>')
    s.append('<g><rect x="150" y="652" width="86" height="34" rx="8" fill="#8C7B69"/><text x="193" y="676" class="gt">側門</text></g>')
    s.append('<g><rect x="1010" y="652" width="86" height="34" rx="8" fill="#8C7B69"/><text x="1053" y="676" class="gt">大門</text></g>')
    # 左列：停車場、宿舍、廁所、儲藏室
    s.append(bldg(44, 706, 200, 120, ['停車場'], '#DDD8CF'))
    s.append(bldg(44, 846, 170, 130, ['教職員', '宿舍']))
    s.append(bldg(44, 990, 170, 60, ['廁所'], '#E1E6EC', 'bs'))
    s.append(bldg(44, 1064, 170, 70, ['儲藏室']))
    # 風雨操場
    s.append('<rect x="262" y="726" width="200" height="270" rx="20" fill="#C9D3DD"/><rect x="282" y="746" width="160" height="230" rx="12" fill="none" stroke="#F4F7FA" stroke-width="4"/>'
             + plain(362, 860, '風雨', 'bl') + plain(362, 894, '操場', 'bl'))
    # 操場（全區草地）
    s.append('<path d="M490 712 H1000 Q1030 712 1030 742 V972 Q1030 1000 1000 1000 H520 Q490 1000 490 970Z" fill="#A9CF8E"/>')
    s.append(plain(650, 880, '操場', 'fld'))
    s += [tree(520, 830, .9), tree(560, 960, .8), tree(950, 760, .8, '#8DBE85', '#6FA36D')]
    # 瞭望台（往上、靠近樹）
    s.append('<g transform="translate(880,812)"><path d="M-22 0 L-14 -96 M22 0 L14 -96 M-18 -40 H18 M-16 -70 H16" stroke="#7A5A40" stroke-width="6" stroke-linecap="round"/>'
             '<rect x="-28" y="-112" width="56" height="18" rx="4" fill="#A97B57"/><path d="M-36 -110 L0 -142 L36 -110Z" fill="#C9A56A"/></g>')
    # 青年學習場域（依網站照片：長形開放式涼亭，低斜屋頂、整排木柱、柴堆）
    s.append(pavilion_v(1046, 708, 116, 300))
    # 家屋、第二座穀倉
    s.append('<g transform="translate(1290,748)"><rect x="-70" y="-30" width="140" height="56" rx="8" fill="#A47A58"/>'
             '<path d="M-90 -26 L0 -76 L90 -26Z" fill="#7E6A55"/><path d="M-90 -26 L0 -76 L90 -26" fill="none" stroke="#5F5040" stroke-width="4"/>'
             '<rect x="-12" y="-4" width="24" height="30" rx="3" fill="#5E4434"/></g>')
    s.append(granary(1478, 776, .95))
    # 七、八、九年級文化教室、文化廊道
    for i, g in enumerate(['七年級', '八年級', '九年級']):
        s.append(bldg(1212 + i * 120, 836, 112, 62, [g, '文化教室'], '#F2D9D3', 'bs'))
    s.append('<rect x="1212" y="906" width="352" height="36" rx="10" fill="url(#weave)" stroke="#9C7452" stroke-width="3"/>')
    # 中央廚房、工具間、自然實驗室、廁所
    s.append(bldg(1262, 952, 302, 104, ['中央廚房・用餐區', '烹飪教室'], '#F2D9D3', 'bs'))
    s.append(bldg(1262, 1070, 190, 56, ['工具間'], '#E7E1D6', 'bs'))
    s.append(bldg(1262, 1138, 190, 60, ['自然實驗室'], '#F2D9D3', 'bs'))
    s.append(bldg(1262, 1210, 190, 56, ['廁所'], '#E1E6EC', 'bs'))
    # 教學行政大樓（前棟）、專科教室大樓（後棟）
    s.append(bldg(262, 1028, 880, 66, ['教學行政大樓（前棟）']))
    s.append(bldg(700, 1118, 460, 80, ['專科教室大樓（後棟）・圖書館'], '#EBD0CA', 'bs'))
    # 後山獵徑：入口在儲藏室與專科教室大樓之間的空地，往下延伸為整片後山林地
    s.append('<path d="M0 1262 Q160 1236 330 1258 Q520 1284 720 1262 Q930 1240 1120 1266 Q1340 1290 1600 1258 V1500 H0Z" fill="#7FAE76"/>')
    s.append('<path d="M0 1330 Q220 1300 460 1330 Q700 1356 960 1326 Q1240 1300 1600 1334 V1500 H0Z" fill="#6E9E68"/>')
    # 林木
    import random
    rnd = random.Random(7)
    for k in range(60):
        x = 24 + (k % 34) * 46 + rnd.randint(-14, 14) + (23 if k >= 34 else 0); y = (1300 if k < 34 else 1395) + rnd.randint(0, 2) * 34 + rnd.randint(-8, 8)
        if (300 < x < 480 and y > 1270) or (640 < x < 1200 and y > 1420):
            continue
        s.append(pine(x, y, .62 + rnd.random() * .25, '#3F7550', '#4E8A5E') if k % 3 else tree(x, y, .65, '#86B77C', '#5E9560'))
    # 入口空地＋步道
    s.append('<path d="M420 1176 Q400 1230 360 1268 Q300 1330 380 1380 Q460 1428 400 1490" stroke="#EAD8B6" stroke-width="12" fill="none" stroke-linecap="round"/>')
    s.append('<path d="M420 1176 Q400 1230 360 1268 Q300 1330 380 1380 Q460 1428 400 1490" stroke="#C9AE84" stroke-width="3" fill="none" stroke-dasharray="10 12"/>')
    s.append('<path d="M372 1376 Q560 1400 720 1372" stroke="#EAD8B6" stroke-width="9" fill="none" stroke-linecap="round"/>')
    for px, py in [(330, 1312), (350, 1296), (560, 1392), (590, 1386)]:
        s.append(f'<g transform="translate({px},{py})" fill="#7A5E44"><ellipse cx="0" cy="0" rx="6" ry="7"/><circle cx="-7" cy="-9" r="3"/><circle cx="0" cy="-12" r="3"/><circle cx="7" cy="-9" r="3"/></g>')
    # 入口木牌
    s.append('<g transform="translate(470,1196)"><path d="M0 0 V40" stroke="#7A5A40" stroke-width="6"/><rect x="-58" y="-22" width="116" height="36" rx="6" fill="#B88A5E" stroke="#7A5A40" stroke-width="3"/>'
             '<text x="0" y="3" class="gt">獵徑入口</text></g>')
    s.append(tag(920, 1458, '後山獵徑（狩獵課程場域）', 400, 'mt'))
    # 樹、藍鵲、指北
    s += [tree(470, 700, .6), tree(1520, 1150, .75), tree(1530, 1240, .65)]
    for bx, by in [(560, 120), (1420, 60)]:
        s.append(f'<g transform="translate({bx},{by})"><ellipse cx="0" cy="0" rx="18" ry="11" fill="#3E6FB0"/><circle cx="16" cy="-7" r="8" fill="#2F3B57"/>'
                 f'<path d="M-16 2 L-58 16 L-54 6 L-16 -4Z" fill="#3E6FB0"/><path d="M22 -7 L32 -4 L22 -2Z" fill="#E0663E"/></g>')
    s.append('<g transform="translate(1530,240)"><circle r="34" fill="#FFFDF7" stroke="#D9CBB6" stroke-width="2"/>'
             '<path d="M0 -26 L9 4 L0 -2 L-9 4Z" fill="#A9654C"/><text x="0" y="24" class="st">N</text></g>')
    # 編號名牌
    s += [label(1060, 268, 1, '小米田', 'l'),
          label(652, 420, 2, '苧麻園', 't'),
          label(1214, 808, 3, '傳統家屋', 'l'),
          label(842, 340, 4, '傳統穀倉', 'l'),
          dot(1478, 796, 4),
          label(838, 690, 5, '瞭望台', 'r'),
          label(1440, 290, 6, '工寮', 'r'),
          dot(1004, 414, 6),
          label(1226, 924, 7, '文化廊道', 'l'),
          label(1032, 860, 8, '青年學習場域', 'r'),
          label(744, 230, 9, '烤火屋', 'r')]
    s.append('</svg>')
    return ''.join(s)


def map_page(num, diamond):
    cards = ''.join(f'''<div class="x-sc"><img src="img/sites/{p}.jpg" alt=""><div><p class="x-sn"><span class="x-no">{n}</span>{e(t)}</p><p class="x-su">{e(d)}</p></div></div>'''
                    for n, t, d, p in SITES)
    inner = f'''<p class="kick">{diamond()}<span>校園文化場域</span></p>
<h1>校園文化學習場域地圖</h1>
<p class="g-lead">逐年與部落耆老合作建置泰雅傳統建築群，使校園具備泰雅微型部落之功能。</p>
<div class="x-mapbox">{map_svg()}</div>
<div class="x-scs">{cards}</div>
<p class="g-cap">場域與教學用途依網站 2-1（烤火屋依學校說明）；位置依學校校舍配置圖繪製，非等比例。</p>'''
    return _page(num, inner)


CSS = """
.tocp .toc li{padding-top:1.05mm;padding-bottom:1.05mm}
.x-sh{display:flex;align-items:baseline;gap:3mm;font-size:12pt;font-weight:700;letter-spacing:.03em;padding-bottom:1.6mm;border-bottom:.35mm solid var(--ink);margin-bottom:2.4mm}
.x-sh small{margin-left:auto;font-size:8.6pt;font-weight:400;color:var(--sub);letter-spacing:0}
.x-tl{display:block;width:100%;height:auto}
.x-tl .mn{font-size:22px;font-weight:700;text-anchor:middle;fill:#8A8174}
.x-tl .mn.on{fill:#fff;font-size:24px}
.x-tl .sem{font-size:20px;text-anchor:middle;fill:#8A8174;letter-spacing:4px}
.x-tl .ev{font-size:20px;font-weight:700;text-anchor:middle;font-style:italic}
.x-tl .grow{font-size:18px;text-anchor:middle;fill:#7E9C80}
.x-evs{display:grid;grid-template-columns:repeat(3,1fr);gap:2.4mm;margin-top:1.6mm}
.x-ev{border-left:1.4mm solid var(--c);background:#FBF8F2;border-radius:0 2mm 2mm 0;padding:1.8mm 2.8mm;box-shadow:0 0 0 .25mm #E3DACB}
.x-evm{font-size:8.6pt;font-weight:700;color:var(--c)}
.x-evt{font-size:10.2pt;line-height:1.4;margin-top:.4mm}
.x-evt i{font-style:italic;font-weight:400;color:var(--sub);margin-left:1.6mm;font-size:9pt}
.x-evq{font-size:9pt;line-height:1.75;color:var(--sub);padding:1.8mm 2.8mm;align-self:center}
.x-evd{font-size:8.8pt;line-height:1.65;color:#4a4743;margin-top:.6mm}
.x-ct{width:100%;border-collapse:separate;border-spacing:1.6mm;margin:-1.6mm;width:calc(100% + 3.2mm);font-size:9pt}
.x-ct thead th{background:#EBE3D5;border-radius:1.6mm;padding:1.6mm 2mm;text-align:left;line-height:1.35}
.x-ct thead th:first-child{background:none}
.x-ct .x-g{display:block;font-size:8pt;font-weight:400;color:var(--sub)}
.x-ct thead b{font-size:10.4pt}
.x-ct td{vertical-align:top;padding:1mm 0}
.x-dn{width:26mm;text-align:left;border-left:1.2mm solid var(--c,#9C958A);padding:1mm 2mm;line-height:1.35;vertical-align:top}
.x-dn b{display:block;font-size:9.4pt}
.x-dn small{font-size:8pt;color:var(--sub)}
.x-tp{display:inline-block;background:var(--t);color:#3B3936;border-radius:1.2mm;padding:.5mm 2mm;margin:0 1.2mm 1.2mm 0;font-size:9pt;line-height:1.5}
.x-frow th,.x-frow td{border-top:.3mm dashed #CDBFA9;padding-top:2mm}
.x-fd{display:inline-flex;align-items:center;gap:1.2mm;margin:0 2.4mm 1mm 0;font-size:9pt;font-weight:700}
.x-fd.x-nn{border:.3mm dashed #8FAE88;border-radius:1.2mm;padding:0 1.6mm;color:#4E7A52}
.x-no{flex:none;width:4.6mm;height:4.6mm;border-radius:50%;background:#A9654C;color:#fff;font-size:7.6pt;font-weight:700;display:inline-grid;place-items:center}
.x-map .fld{font-size:34px;font-weight:700;text-anchor:middle;fill:#6E9A5E;letter-spacing:6px}
.x-scs{display:grid;grid-template-columns:repeat(3,1fr);gap:2.2mm 3mm;margin-top:3mm}
.x-sc{display:flex;gap:2.2mm;align-items:flex-start}
.x-sc img{flex:none;width:22mm;height:16.5mm;object-fit:cover;border-radius:1.4mm;box-shadow:0 0 0 .25mm #D4CAB9}
.x-sn{display:flex;align-items:center;gap:1.2mm;font-size:9.2pt;font-weight:700;line-height:1.35}
.x-su{font-size:8.2pt;line-height:1.55;color:#4a4743;margin-top:.5mm}
.x-mapbox{margin-top:3mm;border-radius:3mm;overflow:hidden}
.x-map{display:block;width:100%;height:auto}
.x-map text{font-family:var(--sans)}
.x-map .mt{font-size:30px;font-weight:700;text-anchor:middle;fill:#3B3936;letter-spacing:2px}
.x-map .st{font-size:22px;font-weight:700;text-anchor:middle;fill:#4A4038}
.x-map .pl{font-size:26px;font-weight:700;text-anchor:middle;fill:#5C4A3A}
.x-map .bl{font-size:24px;font-weight:700;text-anchor:middle;fill:#7A5E55}
.x-map .bs{font-size:20px;font-weight:700;text-anchor:middle;fill:#7A5E55}
.x-map .gt{font-size:20px;font-weight:700;text-anchor:middle;fill:#fff}
.x-map .lt{font-size:27px;font-weight:700;text-anchor:middle;fill:#3B3936}
.x-map .ln{font-size:27px;font-weight:700;text-anchor:middle;fill:#fff}
.x-sites{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:1.6mm 6mm;margin-top:3.4mm;font-size:9pt;line-height:1.7}
.x-sites li{display:flex;gap:2mm;align-items:flex-start}
.x-sites .x-no{margin-top:.8mm}
"""
