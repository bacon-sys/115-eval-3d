import subprocess, pathlib, json, shutil
subprocess.run(['python3', 'extract.py'], check=True, stdout=subprocess.DEVNULL)
subprocess.run(['python3', 'render.py'], check=True)
subprocess.run(['npx','esbuild','src/main.js','--bundle','--format=iife','--minify','--loader:.json=json','--charset=utf8','--outfile=build/app.min.js','--log-level=warning'],check=True)
import datetime
now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8)))
js = pathlib.Path('build/app.min.js').read_text().replace('</script','<\\/script').replace('__UPDATED__', f'{now.year} 年 {now.month} 月 {now.day} 日')
html = pathlib.Path('src/template.html').read_text().replace('/*APP*/', js)
out = pathlib.Path('dist'); out.mkdir(exist_ok=True)
(out/'index.html').write_text(html)   # artifact 用（片段）
full = '<!doctype html>\n<html lang="zh-Hant">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n' + html + '\n</body>\n</html>\n'
pathlib.Path('site').mkdir(exist_ok=True)
pathlib.Path('site/index.html').write_text(full)  # GitHub Pages 用（完整文件）
# 三年山徑一併放進網站
v = pathlib.Path('site/valley'); v.mkdir(exist_ok=True)
shutil.copy('../valley/dist/三年山徑_大同國中泰雅文化課程.html', v/'index.html')
print(len(html)//1024, 'KB')
