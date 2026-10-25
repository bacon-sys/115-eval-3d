import json,re,html
pages=json.load(open('src/pages.json'))
def text_md(t):
    t=re.sub(r'<(image|embed|video)[^>]*>','',t)
    t=re.sub(r'<mention[^>]*/>','\n',t)
    t=re.sub(r'\]\([^)]*\)',']',t)
    t=re.sub(r'<[^>]+>',' ',t)
    t=re.sub(r'^[0-9a-f-]+/[0-9a-f-]+ \| [^|]+ \| ','',t,flags=re.M)
    t=re.sub(r'^(\d+\.|[-*]) ','',t,flags=re.M)
    return t
bad=0;tot=0
for code,p in pages.items():
    if code.startswith('d'): continue
    md=open(f'content/{code}.md').read()
    ht=re.sub(r'\s+','',html.unescape(re.sub(r'<[^>]+>',' ',p['html'])))
    runs=[r for r in re.findall(r'[^\n<>|#\[\]]{4,}',text_md(md)) if re.search(r'[一-鿿]',r)]
    tot+=len(runs)
    miss=[r for r in runs if re.sub(r'\s+','',r.strip()) not in ht]
    if miss: bad+=1; print(code,'missing',len(miss),miss[:3])
print('文字段落檢查',tot,'段；有缺漏的頁面：',bad)
