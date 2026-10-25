import asyncio
from playwright.async_api import async_playwright
IDS=[1,2,3,5,8,10,11,13,16,17,18,21]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1100,'height':720})
        await pg.route('**/fonts.g*/**', lambda r: r.abort())
        await pg.goto('file:///home/claude/valley/dist/三年山徑_大同國中泰雅文化課程.html', wait_until='commit', timeout=120000)
        await pg.wait_for_timeout(8000)
        await pg.screenshot(path='shots/ov.png', timeout=180000)
        for i in IDS:
            await pg.evaluate(f"document.querySelectorAll('.ilabel')[{i-1}].click()")
            await pg.wait_for_timeout(4000)
            await pg.screenshot(path=f'shots/f{i:02d}.png', timeout=180000, clip={'x':0,'y':0,'width':640,'height':720})
        await b.close()
asyncio.run(main())
