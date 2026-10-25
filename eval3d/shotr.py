import asyncio, sys
from playwright.async_api import async_playwright
PAGES = sys.argv[1].split(',')
MOB = len(sys.argv) > 2
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        vp = {'width':390,'height':844} if MOB else {'width':1440,'height':900}
        pg = await b.new_page(viewport=vp, is_mobile=MOB, has_touch=MOB, device_scale_factor=1)
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('**/fonts.g*/**', lambda r: r.abort())
        await pg.route('**/youtube-nocookie.com/**', lambda r: r.abort())
        await pg.route('**/drive.google.com/**', lambda r: r.abort())
        await pg.route('**/github.io/**', lambda r: r.abort())
        await pg.route('**/mindomo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8765/index.html?debug#p'+PAGES[0].split(':')[0], wait_until='commit', timeout=120000)
        await pg.wait_for_timeout(5000)
        for k, spec in enumerate(PAGES):
            ref, _, scroll = spec.partition(':')
            await pg.evaluate(f"location.hash='#p{ref}'")
            await pg.wait_for_timeout(1500)
            if scroll:
                if scroll.startswith('lb'):
                    await pg.evaluate("document.querySelectorAll('#rdArticle .ph')[%d].click()" % int(scroll[2:] or 0))
                elif scroll.startswith('s'):
                    await pg.evaluate("(()=>{const e=document.getElementById('%s');document.getElementById('rdScroll').scrollTop=e.offsetTop-10})()" % scroll)
                else:
                    await pg.evaluate(f"document.getElementById('rdScroll').scrollTop={scroll}")
                await pg.wait_for_timeout(1200)
            await pg.screenshot(path=f'shots/r{"m" if MOB else ""}{k}.png', timeout=120000)
        print('errors', errs[:5])
        await b.close()
asyncio.run(main())
