// 滑鼠停在縮成代碼的指標標籤上：標籤展開後代碼應留在滑鼠下、不來回跳動
const { chromium } = require('playwright');
const url = process.argv[2] || 'http://localhost:8765/';
(async()=>{const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1280,height:800}});
await p.addInitScript(()=>{try{localStorage.setItem('eval3d-tour','1')}catch(e){}});
await p.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
await p.goto(url+'?time=day',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(9000);
const comp = await p.evaluate(()=>[...document.querySelectorAll('.ilabel.compact')].filter(e=>e.style.visibility!=='hidden').map(e=>{const r=e.getBoundingClientRect();return {t:e.textContent.trim().slice(0,12),x:r.x+r.width/2,y:r.y+r.height/2};}));
console.log('compact labels', comp.map(c=>c.t).join(' / '));
let bad=0;
for (const c of comp) {
  await p.mouse.move(c.x, c.y); const seq=[];
  for (let i=0;i<24;i++){ await p.waitForTimeout(80); seq.push(await p.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y)?.closest('.ilabel');return e?(e.classList.contains('compact')?'c':'F'):'-';},[c.x,c.y])); }
  const s=seq.join(''); const flips=(s.match(/(.)(?!\1)/g)||[]).length-1; if (flips>1) bad++;
  console.log(c.t.padEnd(14), s, 'changes', flips);
  await p.mouse.move(5,790); await p.waitForTimeout(400);
}
console.log('unstable', bad); await b.close();})();
