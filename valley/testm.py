import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('**/fonts.g*/**', lambda r: r.abort())
        await pg.goto('file:///home/claude/valley/dist/三年山徑_大同國中泰雅文化課程.html', wait_until='commit', timeout=120000)
        await pg.wait_for_timeout(9000); await pg.screenshot(path='shots/m-tour.png', timeout=180000)
        await pg.evaluate("document.querySelector('#tourSkip').click()")
        await pg.evaluate("document.querySelector('#pathBtn').click()")
        await pg.wait_for_timeout(3000); await pg.screenshot(path='shots/m-path.png', timeout=180000)
        await pg.evaluate("document.querySelector('#listBtn').click()")
        await pg.wait_for_timeout(2000); await pg.screenshot(path='shots/m-list.png', timeout=180000)
        await pg.evaluate("document.querySelector('#findBtn').click()")
        await pg.wait_for_timeout(2500); await pg.screenshot(path='shots/m-game.png', timeout=180000)
        print(errs)
        await b.close()
asyncio.run(main())
