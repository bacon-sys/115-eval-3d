import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        for name,w,h,mob in [('desk',1440,900,False),('mob',390,844,True)]:
            pg = await b.new_page(viewport={'width':w,'height':h}, is_mobile=mob, has_touch=mob, device_scale_factor=1)
            errs=[]; pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None); pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.route('**/fonts.g*/**', lambda r: r.abort()); await pg.goto('file:///home/claude/valley/dist/三年山徑_大同國中泰雅文化課程.html', wait_until='commit', timeout=120000)
            await pg.wait_for_timeout(9000)
            await pg.screenshot(path=f'shots/{name}-0.png', timeout=180000)
            await pg.evaluate("document.querySelectorAll('.ilabel')[14].click()")
            await pg.wait_for_timeout(6000)
            await pg.screenshot(path=f'shots/{name}-1.png', timeout=180000)
            print(name, errs[:5])
        await b.close()
asyncio.run(main())
