#!/usr/bin/env python3
"""把手冊用到的字從 Noto CJK TC（CFF）子集化並轉成 TrueType 外框，
讓 Chromium 輸出 PDF 時以 CIDFontType2 內嵌（避免 Type 3 字型，印刷廠預檢較友善）。
用法：python3 fonts.py file1.html [file2.html ...]
"""
import sys, re, html, pathlib
from fontTools.ttLib import TTCollection, TTFont, newTable
from fontTools import subset
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen

OUT = pathlib.Path(__file__).parent / 'fonts'
OUT.mkdir(exist_ok=True)
SRC = '/usr/share/fonts/opentype/noto/'
FACES = [('NotoSansCJK-Regular.ttc', 'BkSans', 400), ('NotoSansCJK-Medium.ttc', 'BkSans', 500),
         ('NotoSansCJK-Bold.ttc', 'BkSans', 700), ('NotoSerifCJK-Regular.ttc', 'BkSerif', 400),
         ('NotoSerifCJK-Bold.ttc', 'BkSerif', 700)]


def text_of(files):
    s = set(chr(c) for c in range(0x20, 0x7f))
    for f in files:
        t = pathlib.Path(f).read_text()
        t = re.sub(r'<style>.*?</style>', '', t, flags=re.S)
        t = html.unescape(re.sub(r'<[^>]+>', ' ', t))
        s |= set(t)
    s |= set('頁：「」——・，。、；（）～％→↗×｜')
    return ''.join(sorted(s))


def tc_face(path):
    col = TTCollection(path)
    for f in col.fonts:
        if 'TC' in f['name'].getDebugName(1):
            return f
    raise SystemExit('找不到 TC 字面：' + path)


def otf_to_ttf(font):
    gs = font.getGlyphSet()
    glyf = newTable('glyf'); glyf.glyphOrder = font.getGlyphOrder(); glyf.glyphs = {}
    for name in font.getGlyphOrder():
        pen = TTGlyphPen(gs)
        gs[name].draw(Cu2QuPen(pen, 1.0, reverse_direction=True))
        glyf.glyphs[name] = pen.glyph()
    font['glyf'] = glyf
    font['loca'] = newTable('loca')
    font['maxp'] = maxp = newTable('maxp'); maxp.tableVersion = 0x00010000
    for k in ('maxZones', 'maxTwilightPoints', 'maxStorage', 'maxFunctionDefs', 'maxInstructionDefs',
              'maxStackElements', 'maxSizeOfInstructions', 'maxComponentElements'):
        setattr(maxp, k, 0)
    maxp.maxZones = 1
    del font['CFF ']
    if 'VORG' in font: del font['VORG']
    font['head'].glyphDataFormat = 0
    font['post'].formatType = 2.0; font['post'].extraNames = []; font['post'].mapping = {}
    font.sfntVersion = '\x00\x01\x00\x00'
    font.recalcBBoxes = True


def main(files):
    text = text_of(files)
    css = []
    for fn, fam, w in FACES:
        f = tc_face(SRC + fn)
        opt = subset.Options(); opt.layout_features = ['*']; opt.name_IDs = ['*']; opt.notdef_outline = True
        sub = subset.Subsetter(opt); sub.populate(text=text); sub.subset(f)
        otf_to_ttf(f)
        out = OUT / f'{fam}-{w}.ttf'
        f.save(out)
        css.append(f'@font-face{{font-family:"{fam}";font-weight:{w};src:url("fonts/{out.name}") format("truetype")}}')
        print(out.name, len(text), 'chars', out.stat().st_size // 1024, 'KB')
    (OUT.parent / 'fonts.css').write_text('\n'.join(css) + '\n')


if __name__ == '__main__':
    main(sys.argv[1:])
