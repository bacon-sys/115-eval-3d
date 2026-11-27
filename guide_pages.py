"""評鑑網站（3D 導覽）使用指南：手冊第 4–5 頁（跨頁）。
截圖在 img/guide/；標示圓點位置以截圖座標（CSS px）換算百分比。
版面以 A4 實際尺寸（mm）排：trim 內放一層 zoom 抵銷手冊的 B5→A4 放大。
"""
import html

e = html.escape
Z = 182 / 210  # 抵銷 .trim 的 zoom（210/182）


def pin(n, x, y, w, h):
    return f'<span class="g-pin" style="left:{x / w * 100:.2f}%;top:{y / h * 100:.2f}%">{n}</span>'


def pins(lst, w, h):
    return ''.join(pin(n, x, y, w, h) for n, x, y in lst)


def keys(items, cols=1):
    return (f'<ul class="g-keys c{cols}">' +
            ''.join(f'<li><span class="g-n">{n}</span><span>{t}</span></li>' for n, t in items) + '</ul>')


def shot(img, pl=''):
    return f'<div class="g-shot"><img src="img/guide/{img}" alt="">{pl}</div>'


def head(no, t, sub=''):
    return (f'<div class="g-sh"><span class="g-no">步驟 {no}</span><span class="g-st">{t}</span>'
            f'{f"<small>{sub}</small>" if sub else ""}</div>')


OV = pins([(1, 610, 236), (2, 718, 196), (3, 985, 266), (4, 615, 336), (5, 1262, 38), (6, 166, 689)], 1440, 720)
PN = pins([(1, 18, 44), (2, 334, 44), (3, 20, 302), (4, 368, 290)], 524, 345)
RL = pins([(5, 20, 77), (6, 20, 177), (7, 20, 395)], 524, 439)
WK = pins([(1, 303, 245), (2, 240, 190), (3, 560, 118)], 700, 380)
TK = pins([(4, 318, 268)], 445, 312)

CSS = f"""
.gdp .gd{{zoom:{Z:.6f};position:absolute;left:0;top:0;width:210mm;height:297mm}}
.gdp .gm{{position:absolute;top:15.5mm;bottom:14mm}}
.gdp.l .gm{{left:19.6mm;right:21.9mm}}
.gdp.r .gm{{left:21.9mm;right:19.6mm}}
.gd .kick{{font-size:9.2pt}}
.gd h1{{font-size:19.6pt;font-weight:700;letter-spacing:.05em;margin:2mm 0 1.6mm}}
.g-lead{{font-size:10pt;line-height:1.85;color:#4a4743}}
.g-url{{font-weight:700;color:var(--ink);letter-spacing:.02em;white-space:nowrap}}
.g-sec{{margin-top:3.8mm}}
.g-sec.first{{margin-top:0}}
.g-sh{{display:flex;align-items:center;gap:3mm;background:#EBE3D5;border-left:1.6mm solid var(--mark);border-radius:0 2mm 2mm 0;padding:1.8mm 3.5mm;margin-bottom:2.8mm}}
.g-no{{background:var(--mark);color:#fff;font-size:9.5pt;font-weight:700;letter-spacing:.06em;border-radius:1.2mm;padding:.5mm 2.4mm}}
.g-st{{font-size:12.5pt;font-weight:700;letter-spacing:.03em}}
.g-sh small{{margin-left:auto;font-size:8.8pt;color:var(--sub)}}
.g-shot{{position:relative;border-radius:2mm;overflow:hidden;box-shadow:0 0 0 .25mm #D4CAB9;background:#E8E1D4}}
.g-shot img{{display:block;width:100%}}
.g-pin{{position:absolute;transform:translate(-50%,-50%);width:5.6mm;height:5.6mm;border-radius:50%;background:#22201E;color:#fff;font-size:8.8pt;font-weight:700;display:grid;place-items:center;box-shadow:0 0 0 .7mm #fff,0 .5mm 1.6mm rgba(0,0,0,.35)}}
.g-keys{{list-style:none;margin-top:2.6mm;display:grid;gap:1.3mm 6mm;font-size:9.3pt;line-height:1.75}}
.g-keys.c2{{grid-template-columns:1fr 1fr}}
.g-keys li{{display:flex;gap:2.2mm;align-items:flex-start}}
.g-n{{flex:none;width:4.6mm;height:4.6mm;border-radius:50%;background:#22201E;color:#fff;font-size:7.6pt;font-weight:700;display:grid;place-items:center;margin-top:.9mm}}
.g-keys b{{font-weight:700}}
.g-ops{{margin-top:2.6mm;display:flex;gap:2mm;flex-wrap:wrap;font-size:9pt}}
.g-ops span{{background:#ECE6DB;border-radius:1.2mm;padding:.9mm 2.6mm}}
.g-ops b{{color:var(--mark)}}
.g-two{{display:grid;grid-template-columns:1fr 1fr;gap:6mm;align-items:start}}
.g-tools{{display:grid;grid-template-columns:22mm 1fr;gap:5mm;align-items:start}}
.g-tl{{width:100%;border-collapse:collapse;font-size:9.2pt;line-height:1.7}}
.g-tl td{{padding:.9mm 0;border-bottom:.25mm solid var(--line);vertical-align:top}}
.g-tl td:first-child{{width:22mm;font-weight:700;white-space:nowrap;padding-right:2mm}}
.g-tl tr.g td{{border-bottom:.5mm solid #C9BFAE}}
.g-tl em{{font-style:normal;color:var(--mark);font-weight:700}}
.g-cap{{font-size:8.8pt;color:#6F685F;margin-top:1.6mm;line-height:1.6}}
"""

FT = '115 學年度原住民族實驗教育評鑑｜宜蘭縣立大同國民中學｜評鑑導讀手冊'


def _page(num, inner):
    side = 'r' if num % 2 else 'l'
    foot = f'<footer class="ft {side}"><span class="pn">{num}</span><span class="fl">{FT}</span></footer>'
    return (f'<section class="page {side} gdp" data-n="{num}"><div class="trim">'
            f'<div class="gd"><div class="gm">{inner}</div></div>{foot}</div></section>')


def guide_pages(first, diamond):
    p1 = f'''<p class="kick">{diamond()}<span>使用指南</span></p>
<h1>評鑑網站（3D 導覽）使用指南</h1>
<p class="g-lead">網站以湖中島嶼呈現六大構面、17 項指標：中央是學校，周圍為構面島，吊橋連到各指標平台。<br>網址：<span class="g-url">bacon-sys.github.io/115-eval-3d/</span>　文字版：<span class="g-url">…/115-eval-3d/#phome</span></p>
<div class="g-sec">{head(1, '認識全景地圖')}
<div style="width:76%;margin:0 auto">{shot('overview_c.jpg', OV)}</div>
{keys([(1, '<b>學校島</b>：點選可閱讀學校首頁（簡介與願景）'), (4, '<b>三年山徑</b>：七至九年級泰雅文化課程地圖，含各單元教案'),
       (2, '<b>構面名牌</b>：顏色代表構面，右側數字為配分'), (5, f'<b>工具列</b>：各項功能見第 {first + 1} 頁步驟 3'),
       (3, '<b>指標代碼</b>：點選開啟指標卡；滑鼠停留顯示名稱'), (6, '<b>圖例</b>：六個構面的顏色與配分')], 2)}
<div class="g-ops"><span><b>左鍵拖曳</b>　旋轉視角</span><span><b>右鍵拖曳</b>　移動地圖</span><span><b>滾輪</b>　縮放</span><span><b>回到全景</b>　回到整體視角</span></div>
</div>
<div class="g-sec">{head(2, '點指標，看指標卡', '以 3-4、3-3 為例')}
<div class="g-two" style="grid-template-columns:1.277fr 1fr">
<div>{shot('panel_c.jpg', PN)}
{keys([(1, '<b>上一項／下一項</b>：依指標順序逐項瀏覽'), (2, '<b>搜尋、指標總覽</b>：不必關閉指標卡即可切換'),
       (3, '<b>閱讀完整內容</b>：進入該指標全文頁'), (4, '<b>佐證資料夾</b>：開啟該指標之雲端佐證')])}</div>
<div>{shot('rel_c.jpg', RL)}
{keys([(5, '<b>相關指標</b>：內文明寫互相引用的指標，地圖上以弧線相連'),
       (6, '<b>出處</b>：直接跳到全文中寫出這項關聯的段落'),
       (7, '<b>所屬主題串聯</b>：點選後沿這條跨構面路線一站一站瀏覽')])}</div>
</div></div>'''

    p2 = f'''<div class="g-sec first">{head(3, '善用右側工具列', '時間有限時最實用')}
<div class="g-tools">
<div>{shot('tools_c.jpg')}</div>
<table class="g-tl">
<tr><td>回到全景</td><td>隨時回到整體視角</td></tr>
<tr><td>指標總覽</td><td><em>全部指標</em>：17 項指標清單，依構面排列。<br><em>相關指標</em>：11 組內文明寫的指標關聯；點選一組，地圖只留下這條弧線與帶著佐證往返的島民</td></tr>
<tr><td>搜尋</td><td>全站全文搜尋，結果可直接跳到段落</td></tr>
<tr class="g"><td>全文閱讀</td><td>文字版，左側目錄可跳到各構面、指標與各節；按「回 3D 地圖」回到該指標位置</td></tr>
<tr><td>導覽路線</td><td><em>認識學校</em>：亮點與創新、課程與教學現場、三年山徑。<br><em>主題串聯</em>：6 條跨構面路線，如泰雅文化課程、學生學習與成效。<br><em>評鑑查核</em>：如依序走完 17 項指標、數據與成效</td></tr>
<tr class="g"><td>自動播放</td><td>附字幕運鏡介紹全島，可切換慢速與背景配樂</td></tr>
<tr><td>顯示設定</td><td>開關名牌、島民與動畫；切換場景時間</td></tr>
<tr><td>☀ ／ ？</td><td>切換白天、黃昏、夜晚／再看一次操作說明</td></tr>
</table></div>
<div class="g-two" style="margin-top:3.5mm">
<div>{shot('routes_c.jpg')}<p class="g-cap">導覽路線：選一條路線後，地圖下方出現逐站導覽列</p></div>
<div>{shot('rellist_c.jpg')}<p class="g-cap">「相關指標」分頁：列出關聯內容、帶佐證的島民與出處</p></div>
</div></div>
<div class="g-sec">{head(4, '看懂吊橋上的島民', '最有特色、也最容易忽略的設計')}
<div class="g-two" style="grid-template-columns:78mm 1fr">
<div>{shot('walk_c.jpg', WK)}</div>
<div>{keys([(1, '<b>帶著佐證</b>：名牌寫「角色｜物品 → 目的地」，如學生帶著回饋問卷送往 3-3'),
            (2, '<b>回程</b>：送達後空手「返回」，再取下一份'),
            (3, '<b>弧線</b>：相關指標之間的連線；開啟某指標時，只留下與它有關的弧線與島民')])}</div>
</div>
<div class="g-two" style="grid-template-columns:51mm 1fr;margin-top:2.6mm;align-items:center">
<div>{shot('talk_c.jpg', TK)}</div>
<div>{keys([(4, '<b>點選島民</b>：他會說明帶著什麼、從哪裡送到哪裡、兩項指標有什麼關聯；可直接「去」該指標或「讀出處」')])}
<p class="g-cap" style="margin-top:2mm;font-size:9.3pt;line-height:1.8;color:var(--ink)">穿黃衣的小嚮導則從 1-1 依序走到 6-3。</p></div>
</div></div>'''
    return [_page(first, p1), _page(first + 1, p2)]
