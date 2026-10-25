import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':800,'height':600})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('**/fonts.g*/**', lambda r: r.abort())
        await pg.goto('file:///home/claude/valley/dist/三年山徑_大同國中泰雅文化課程.html', wait_until='commit', timeout=120000)
        await pg.wait_for_function('window.__ISL', timeout=120000)
        r = await pg.evaluate('''() => { const I = window.__ISL; let out=[]; for (let i=0;i<I.length;i++) for (let j=i+1;j<I.length;j++){ const d=Math.hypot(I[i].x-I[j].x,I[i].z-I[j].z); const need=I[i].R+I[j].R+0.6; if(d<need) out.push([I[i].id,I[j].id,+d.toFixed(2),+need.toFixed(2)]);} return {out, pos: I.map(i=>[i.id,+i.x.toFixed(1),+i.z.toFixed(1),+i.top.toFixed(1),+i.R.toFixed(2)])}; }''')
        print(json.dumps(r)); print(errs)
        await b.close()
asyncio.run(main())
