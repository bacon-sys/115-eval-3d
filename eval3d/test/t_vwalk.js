const { chromium } = require('playwright');
const D=process.env.SHOTS||'/tmp/shots/';
(async()=>{
 const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await b.newPage({viewport:{width:1440,height:900}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{try{localStorage.setItem('sannian-tour','1')}catch(e){}});
 await p.goto('http://localhost:8765/valley/?time=day&debug'); await p.waitForTimeout(8000);
 const info = await p.evaluate(()=>{const V=window.__vl; V.advance(20); return V.walkers.map(w=>[w.kind, w.roleName||'', w.cfg?w.cfg.a+'>'+w.cfg.b:w.at.id, Math.round(w.s), Math.round(w.leg?w.leg.len:0)]).concat(V.ISLANDS.map(i=>i.id+':'+i.stop.x.toFixed(1)));});
 console.log(JSON.stringify(info));
 await p.waitForTimeout(1500);
 await p.screenshot({path:D+'vw_over.png',timeout:150000});
 // close up on island 1-3 area
 for (const id of [1, 8]) {
   await p.evaluate((id)=>{ location.hash='#i'+String(id).padStart(2,'0'); }, id);
   await p.waitForTimeout(500);
   await p.evaluate((id)=>{ const V=window.__vl; }, id);
 }
 await p.goto('http://localhost:8765/valley/?time=day&debug#i08'); await p.waitForTimeout(9000);
 await p.evaluate(()=>window.__vl.advance(6)); await p.waitForTimeout(1500);
 await p.screenshot({path:D+'vw_i08.png',timeout:150000});
 // click journey student
 const pos = await p.evaluate(()=>{const V=window.__vl; const f=V.journey.cur.g; const v=f.position.clone(); v.y+=0.4; v.project(V.camera); return {x:(v.x*0.5+0.5)*innerWidth,y:(-v.y*0.5+0.5)*innerHeight};});
 console.log(pos);
 console.log('errs',errs); await b.close();
})();
