// 委員審閱入口（開場卡）與側欄搜尋／總覽鈕
const { chromium } = require('playwright');
const D=process.env.SHOTS||'/tmp/shots/';
const vp=process.argv[2]||'d';
(async()=>{
 const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await b.newPage(vp==='m'?{viewport:{width:390,height:844},hasTouch:true,isMobile:true}:{viewport:{width:1280,height:720}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8765/?time=day'); await p.waitForTimeout(6000);
 const vis=(s)=>p.evaluate((s)=>{const e=document.querySelector(s);return !!e&&!e.hidden&&e.offsetParent!==null},s);
 console.log('tour open', await vis('#tour'), 'read btn', await vis('#tourRead'));
 await p.screenshot({path:D+`r_${vp}_tour1.png`});
 await p.click('#tourNext'); await p.waitForTimeout(300); console.log('step2 read btn', await vis('#tourRead'));
 await p.click('#tourSkip'); await p.waitForTimeout(300);
 await p.evaluate(()=>{try{localStorage.removeItem('eval3d-tour')}catch(e){}}); await p.reload(); await p.waitForTimeout(6000);
 await p.click('#tourRead'); await p.waitForTimeout(1500);
 console.log('hash', await p.evaluate(()=>location.hash), 'reader', await p.evaluate(()=>document.getElementById('reader').className), 'tour hidden', await p.evaluate(()=>document.getElementById('tour').hidden));
 await p.screenshot({path:D+`r_${vp}_reader.png`});
 await p.evaluate(()=>{location.hash='#i2-3'}); await p.waitForTimeout(3000);
 console.log('pico visible', await vis('#pSearch'), await vis('#pList'));
 await p.screenshot({path:D+`r_${vp}_panel.png`});
 if(vp!=='m'){
  await p.click('#pSearch'); await p.waitForTimeout(600); console.log('search open', await vis('#search'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  await p.click('#pList'); await p.waitForTimeout(1200);
  console.log('list open', await p.evaluate(()=>document.getElementById('list')?.classList.contains('open')??document.querySelector('#listBody').closest('aside').classList.contains('open')), 'panel open', await p.evaluate(()=>document.getElementById('panel').classList.contains('open')), 'hash', await p.evaluate(()=>location.hash));
  await p.screenshot({path:D+`r_${vp}_list.png`});
 }
 console.log('errors', errs); await b.close();
})();
