import asyncio, sys
from playwright.async_api import async_playwright
STEPS = sys.argv[1].split(',') if len(sys.argv) > 1 else ['0']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        for name,w,h,mob in [('desk',1440,900,False),('mob',390,844,True)]:
            if 'nomob' in STEPS and mob: continue
            pg = await b.new_page(viewport={'width':w,'height':h}, is_mobile=mob, has_touch=mob, device_scale_factor=1)
            errs=[]; pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None); pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.route('**/fonts.g*/**', lambda r: r.abort())
            await pg.goto('file:///home/claude/eval3d/site/index.html?debug', wait_until='commit', timeout=120000)
            await pg.wait_for_timeout(12000)
            await pg.screenshot(path=f'shots/{name}-0.png', timeout=180000)
            for st in STEPS:
                if st in ('0','nomob'): continue
                await pg.evaluate('__t.' + st.replace('~', ','))
                await pg.wait_for_timeout(7000)
                await pg.screenshot(path=f'shots/{name}-{STEPS.index(st)}.png', timeout=180000)
            print(name, errs[:5])
        await b.close()
asyncio.run(main())
