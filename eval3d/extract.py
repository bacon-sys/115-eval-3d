"""Build src/data.json for the 3D map: dims, indicators, quote, outline, photo previews, Drive link."""
import json, re, urllib.parse, os

dims = json.load(open('content/dims.json'))['dims']
imgs = json.load(open('content/images.json'))

SHORT = {
    '1-1': '理念落實', '1-2': '計畫書符合', '2-1': '學習環境與設備', '2-2': '入學與就學', '2-3': '師資與增能',
    '3-1': '課程教學', '3-2': '多元學習與適性', '3-3': '多元評量', '3-4': '文化認知與認同',
    '4-1': '經費運用', '4-2': '外部資源', '5-1': '法規與精神', '5-2': '排除規定', '5-3': '縣訂訪評',
    '6-1': '部落與家長', '6-2': '歲時生活', '6-3': '創新與省思',
}
ICON = {'1-1': '🌱', '1-2': '📋', '2-1': '🏘️', '2-2': '🎓', '2-3': '👩‍🏫', '3-1': '🌿', '3-2': '🧭', '3-3': '📝', '3-4': '🪶',
        '4-1': '📊', '4-2': '🤝', '5-1': '📜', '5-2': '🔍', '5-3': '🗂️', '6-1': '🏘️', '6-2': '🌾', '6-3': '💡'}
# Notion 色票（文字色，較飽和，適合 3D）
COLOR = {'blue': '#337EA9', 'green': '#448361', 'purple': '#9065B0', 'orange': '#D9730D', 'yellow': '#CB912F', 'pink': '#C14C8A'}
# 介面用色（白字底色）：橘、金加深到對比 4.5:1 以上；島嶼、旗幟、圖例仍用 COLOR
UI_COLOR = {'orange': '#B45F0B', 'yellow': '#9A6E24'}
TINT = {'blue': '#E7F3F8', 'green': '#EDF3EC', 'purple': '#F6F3F9', 'orange': '#FBECDD', 'yellow': '#FBF3DB', 'pink': '#FAF1F5'}

def strip(s):
    s = re.sub(r'<br\s*/?>', ' ', s)
    return re.sub(r'<[^>]+>', '', s).strip()

def photos_of(t):
    out = []
    for m in re.finditer(r'^[0-9a-f-]+/[0-9a-f-]+ \| ([^|]+?) \| (.*)$', t, re.M):
        name = urllib.parse.unquote(m.group(1).strip())
        if name in imgs and 'thumb' in imgs[name]:
            out.append({'t': imgs[name]['thumb'], 'c': strip(m.group(2))})
    for m in re.finditer(r'<image source="[^"]*name=([^"&]+)"\s*/?>(?:\s*([^<]*?)\s*</image>)?', t):
        name = urllib.parse.unquote(m.group(1))
        if name in imgs and 'thumb' in imgs[name]:
            out.append({'t': imgs[name]['thumb'], 'c': (m.group(2) or '').strip()})
    return out

out = {'dims': []}
for D in dims:
    d = {'n': D['n'], 'icon': D['icon'], 'title': D['title'], 'weight': D['weight'], 'c': COLOR[D['color']], 'ui': UI_COLOR.get(D['color'], COLOR[D['color']]), 'tint': TINT[D['color']],
         'desc': D['desc'], 'inds': []}
    for I in D['indicators']:
        code = I['code']
        t = open(f'content/{code}.md').read()
        q = re.search(r'^> (.+)$', t, re.M).group(1)
        heads = [strip(h) for h in re.findall(r'^## (.+)$', t, re.M)]
        drive = re.search(r'https://drive\.google\.com/drive/folders/[^"?]+', t)
        ph = photos_of(t)
        inter = len(re.findall(r'<embed source="https://[^"]*github\.io', t)) + len(re.findall(r'\]\(https://bacon-sys\.github\.io', t))
        d['inds'].append({'code': code, 'icon': ICON[code], 'short': SHORT[code], 'title': I['title'], 'quote': strip(q),
                          'points': I['points'], 'outline': heads, 'drive': drive.group(0) if drive else None,
                          'photos': ph[:3], 'nphotos': len(ph), 'ninter': inter})
    out['dims'].append(d)
os.makedirs('src', exist_ok=True)
json.dump(out, open('src/data.json', 'w'), ensure_ascii=False, indent=1)
for d in out['dims']:
    for i in d['inds']:
        print(i['code'], i['nphotos'], 'photos', i['ninter'], 'inter', bool(i['drive']), '|', i['quote'][:30])
