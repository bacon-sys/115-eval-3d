import asyncio
from playwright.async_api import async_playwright
CODES = ['1-1','1-2','2-1','2-2','2-3','3-1','3-2','3-3','3-4','4-1','4-2','5-1','5-2','5-3','6-1','6-2','6-3']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1200,'height':760}, device_scale_factor=1)
        await pg.route('**/fonts.g*/**', lambda r: r.abort())
        await pg.goto('file:///home/claude/eval3d/site/index.html?debug', wait_until='commit', timeout=120000)
        await pg.wait_for_timeout(10000)
        for c in CODES:
            await pg.evaluate(f"__t.openInd('{c}')")
            await pg.wait_for_timeout(4500)
            await pg.screenshot(path=f'shots/i{c}.png', clip={'x':0,'y':0,'width':700,'height':760}, timeout=180000)
        await b.close()
asyncio.run(main())
