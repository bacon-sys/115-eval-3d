"""Compress referenced photos from the Notion export into web-sized files.
Output: site/img/full/<id>.jpg|png (<=1600px), site/img/thumb/<id>.jpg (<=640px), content/images.json manifest.
EXIF (incl. GPS) is stripped; orientation is applied first."""
import json, re, glob, os, sys, hashlib, shutil, urllib.parse
from PIL import Image, ImageOps
import pillow_heif
pillow_heif.register_heif_opener()

SRC = '/mnt/user-data/uploads/評鑑3D素材'
OUT = 'site/img'
os.makedirs(f'{OUT}/full', exist_ok=True); os.makedirs(f'{OUT}/thumb', exist_ok=True)
os.makedirs('site/embed', exist_ok=True)

refs = {}
for f in sorted(glob.glob('content/*.md')):
    pg = os.path.basename(f)[:-3]; t = open(f).read()
    for m in re.finditer(r'^[0-9a-f-]+/[0-9a-f-]+ \| ([^|]+?) \| ', t, re.M):
        refs.setdefault(urllib.parse.unquote(m.group(1).strip()), set()).add(pg)
    for m in re.finditer(r'name=([^"&]+)"', t):
        refs.setdefault(urllib.parse.unquote(m.group(1)), set()).add(pg)

man_path = 'content/images.json'
manifest = json.load(open(man_path)) if os.path.exists(man_path) else {}
missing = []
for name, pages in sorted(refs.items()):
    src = os.path.join(SRC, name)
    if name.endswith('.html'):
        if os.path.exists(src):
            body = open(src, encoding='utf-8').read()
            if not body.lstrip().lower().startswith('<!doctype'):
                body = ('<!doctype html>\n<html lang="zh-Hant">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
                        '<style>body{margin:0;font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif}</style>\n</head>\n<body>\n' + body + '\n</body>\n</html>\n')
            open(f'site/embed/{name}', 'w', encoding='utf-8').write(body); manifest[name] = {'embed': f'embed/{name}'}
        else: missing.append((name, sorted(pages)))
        continue
    if name in manifest and os.path.exists('site/' + manifest[name]['full']):
        continue
    if not os.path.exists(src):
        missing.append((name, sorted(pages))); continue
    iid = hashlib.sha1(name.encode()).hexdigest()[:10]
    im = ImageOps.exif_transpose(Image.open(src))
    # keep PNG for small graphics/diagrams (few colours or transparency), JPEG otherwise
    is_png = name.lower().endswith('.png') and os.path.getsize(src) < 700_000
    if im.mode in ('RGBA', 'LA', 'P') and not is_png:
        bg = Image.new('RGB', im.size, (255, 255, 255)); im2 = im.convert('RGBA'); bg.paste(im2, mask=im2.split()[-1]); im = bg
    full = im.copy(); full.thumbnail((1600, 1600), Image.LANCZOS)
    if is_png:
        fp = f'img/full/{iid}.png'; full.save('site/' + fp, optimize=True)
    else:
        fp = f'img/full/{iid}.jpg'; full.convert('RGB').save('site/' + fp, quality=80, optimize=True, progressive=True)
    th = im.convert('RGB') if im.mode != 'RGB' else im.copy()
    if im.mode in ('RGBA', 'LA', 'P'):
        bg = Image.new('RGB', im.size, (255, 255, 255)); i2 = im.convert('RGBA'); bg.paste(i2, mask=i2.split()[-1]); th = bg
    th.thumbnail((640, 640), Image.LANCZOS)
    tp = f'img/thumb/{iid}.jpg'; th.save('site/' + tp, quality=76, optimize=True, progressive=True)
    manifest[name] = {'full': fp, 'thumb': tp, 'w': full.width, 'h': full.height}
    print('ok', name, full.size, os.path.getsize('site/' + fp) // 1024, 'KB')

json.dump(manifest, open(man_path, 'w'), ensure_ascii=False, indent=1)
print('\nprocessed', len(manifest), 'of', len(refs), '| missing', len(missing))
json.dump(missing, open('content/missing.json', 'w'), ensure_ascii=False, indent=1)
