import subprocess, pathlib
subprocess.run(['npx','esbuild','src/app.js','--bundle','--format=iife','--minify','--outfile=build/app.min.js','--log-level=warning'],check=True)
js = pathlib.Path('build/app.min.js').read_text().replace('</script','<\\/script')
html = pathlib.Path('src/template.html').read_text().replace('/*APP*/', js)
out = pathlib.Path('dist'); out.mkdir(exist_ok=True)
(out/'valley.html').write_text(html)
offline = '<!doctype html>\n<html lang="zh-Hant">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n' + html + '\n</body>\n</html>\n'
(out/'三年山徑_大同國中泰雅文化課程.html').write_text(offline)
print(len(html)//1024, 'KB')
