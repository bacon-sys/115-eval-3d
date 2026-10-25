import re, json, pathlib
C = pathlib.Path('content')
order = ['home','1-1','1-2','2-1','2-2','2-3','3-1','3-2','3-3','3-4','4-1','4-2','5-1','5-2','5-3','6-1','6-2','6-3']
rows=[]
for k in order:
    s=(C/f'{k}.md').read_text()
    text=re.sub(r'<[^>]+>','',s); text=re.sub(r'\(https?://[^)]+\)','',text)
    chars=len(re.sub(r'[\s|#>\-\*\[\]（）]','',text))
    imgs=re.findall(r'<image source="notion-file-block://[^"]*?name=([^"&]+)',s)
    gal=re.findall(r'^[0-9a-f-]{36}/[0-9a-f-]{36} \| ([^|]+?) \|',s,re.M)
    import urllib.parse
    photos=[urllib.parse.unquote(x) for x in imgs]+[x.strip() for x in gal]
    heic=[p for p in photos if p.lower().endswith('.heic')]
    vids=re.findall(r'<video source="([^"]+)"',s)
    embeds=re.findall(r'<embed source="([^"]+)"',s)
    drive=[e for e in embeds if 'drive.google' in e]
    gh_embed=[e for e in embeds if 'github.io' in e]
    nfile=[urllib.parse.unquote(e.split('name=')[-1]) for e in embeds if e.startswith('notion-file-block')]
    other=[e for e in embeds if 'mindomo' in e]
    ghlinks=sorted(set(re.findall(r'https://bacon-sys\.github\.io/[^)\s"]+',s)))
    rows.append(dict(page=k,chars=chars,photos=len(photos),heic=len(heic),videos=len(vids),
        drive=len(drive),gh_links=len(ghlinks),gh_embed=len(gh_embed),notion_html=nfile,other_embed=other,
        tables=s.count('<table'),toggles=s.count('<toggle'),todo=('🚧' in s)))
json.dump(rows,open('inventory.json','w'),ensure_ascii=False,indent=1)
tot=lambda f: sum(r[f] for r in rows)
print(f"{'頁':6}{'字數':>7}{'照片':>5}{'HEIC':>5}{'影片':>5}{'表格':>5}{'收合':>5}{'互動頁':>6}{'Drive':>6}  Notion內嵌HTML")
for r in rows: print(f"{r['page']:6}{r['chars']:>7}{r['photos']:>5}{r['heic']:>5}{r['videos']:>5}{r['tables']:>5}{r['toggles']:>5}{r['gh_links']:>6}{r['drive']:>6}  {', '.join(r['notion_html'])}{' ⚠待補' if r['todo'] else ''}{' +'+r['other_embed'][0][:30] if r['other_embed'] else ''}")
print('合計', tot('chars'), tot('photos'), tot('heic'), tot('videos'), tot('tables'), tot('toggles'), tot('drive'))
