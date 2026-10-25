const { chromium } = require('playwright');
const D=process.env.SHOTS||'/tmp/shots/';
const vp=process.argv[2]||'d';
(async()=>{
 const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
 const p=await b.newPage(vp==='m'?{viewport:{width:390,height:844},hasTouch:true,isMobile:true}:{viewport:{width:1366,height:820}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/ERR_TUNNEL|Failed to load/.test(m.text()))errs.push(m.text())});
 await p.addInitScript(()=>{try{localStorage.setItem('eval3d-tour','1')}catch(e){}
  const oc=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(dst,...r){ if(dst===this.context.destination&&!window.__an){ const a=this.context.createAnalyser(); a.fftSize=2048; oc.call(this,a); window.__an=a; window.__ac=this.context; } return oc.call(this,dst,...r); };
  window.__lvl=()=>{ if(!window.__an) return null; const d=new Float32Array(2048); window.__an.getFloatTimeDomainData(d); let m=0,s=0; for(const v of d){m=Math.max(m,Math.abs(v)); s+=v*v;} return {state:window.__ac.state, peak:+m.toFixed(3), rms:+Math.sqrt(s/d.length).toFixed(4)}; };
 });
 await p.goto('http://localhost:8765/?time=day&debug'); await p.waitForTimeout(9000);
 await p.click(vp==='m'?'#playBtn':'#playBtn').catch(async()=>{await p.evaluate(()=>document.getElementById('playBtn').click())});
 await p.waitForTimeout(5000);
 const lv=[]; for(let i=0;i<6;i++){ lv.push(await p.evaluate(()=>window.__lvl())); await p.waitForTimeout(700);} console.log('music on', JSON.stringify(lv));
 // 速度：量第一段長度（一般）
 const prog=async()=>p.evaluate(()=>{const m=/scaleX\(([\d.]+)\)/.exec(document.getElementById('playBar').style.transform);return m?+m[1]:0});
 await p.click('#playNext'); await p.click('#playNext'); await p.waitForTimeout(3500);
 await p.screenshot({path:D+`p_${vp}_stage.png`});
 console.log('caption:', await p.textContent('#playText'));
 let a=await prog(); await p.waitForTimeout(2000); let b2=await prog(); console.log('normal rate per 2s', (b2-a).toFixed(3));
 await p.click('#playSlow'); a=await prog(); await p.waitForTimeout(2000); b2=await prog(); console.log('slow rate per 2s', (b2-a).toFixed(3), await p.getAttribute('#playSlow','aria-pressed'));
 await p.click('#playMusic'); await p.waitForTimeout(2500); console.log('music off', JSON.stringify(await p.evaluate(()=>window.__lvl())), await p.getAttribute('#playMusic','aria-pressed'));
 await p.screenshot({path:D+`p_${vp}_toggles.png`});
 await p.click('#playMusic'); await p.waitForTimeout(3000); console.log('music back', JSON.stringify(await p.evaluate(()=>window.__lvl())));
 await p.click('#playPause'); await p.waitForTimeout(2500); console.log('paused', JSON.stringify(await p.evaluate(()=>window.__lvl())));
 await p.click('#playExit'); await p.waitForTimeout(4500); console.log('exit', JSON.stringify(await p.evaluate(()=>window.__lvl())));
 // 重新整理後設定是否保留
 await p.reload(); await p.waitForTimeout(8000); await p.evaluate(()=>document.getElementById('playBtn').click()); await p.waitForTimeout(1500);
 console.log('persist slow', await p.getAttribute('#playSlow','aria-pressed'), 'music', await p.getAttribute('#playMusic','aria-pressed'));
 console.log('errors', errs);
 await b.close();
})();
