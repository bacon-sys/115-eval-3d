const { chromium } = require('playwright');
const D=process.env.SHOTS||'/tmp/shots/';
const vp=process.argv[2]||'d';
(async()=>{
 const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
 const p=await b.newPage(vp==='m'?{viewport:{width:390,height:844},hasTouch:true,isMobile:true}:{viewport:{width:1366,height:820}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{try{localStorage.setItem('eval3d-tour','1')}catch(e){}});
 await p.goto('http://localhost:8765/?time=day'); await p.waitForTimeout(8000);
 const op=()=>p.evaluate(()=>getComputedStyle(document.getElementById('hint')).opacity);
 console.log('hint at 8s', await op());
 await p.screenshot({path:D+`t_${vp}_0.png`});
 await p.waitForTimeout(6000); console.log('hint at 14s', await op());
 if(vp==='m'){ await p.tap('#menuBtn'); await p.waitForTimeout(500); await p.screenshot({path:D+`t_m_menu.png`});
   await p.tap('#helpBtn'); await p.waitForTimeout(500); console.log('menu open after help?', await p.evaluate(()=>document.querySelector('.tools').classList.contains('open')));
 } else { await p.click('#helpBtn'); await p.waitForTimeout(500); }
 await p.screenshot({path:D+`t_${vp}_help.png`});
 console.log('help visible', await p.evaluate(()=>!document.getElementById('helpPop').hidden));
 await p.click('#tourOpen'); await p.waitForTimeout(600); console.log('tour open', await p.evaluate(()=>!document.getElementById('tour').hidden), await p.textContent('#tourTitle'));
 await p.click('#tourSkip'); await p.waitForTimeout(400);
 if(vp==='m'){ await p.tap('#menuBtn'); await p.waitForTimeout(300); await p.tap('#viewBtn'); } else await p.click('#viewBtn');
 await p.waitForTimeout(600); await p.screenshot({path:D+`t_${vp}_view.png`});
 console.log('view', await p.evaluate(()=>document.getElementById('viewPanel').innerText.replace(/\n+/g,' / ')));
 console.log('errors', errs); await b.close();
})();
