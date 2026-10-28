// 模擬 GitHub Pages：主網站在 github.io 時，三年山徑應開 datong-trail（含教案下載）
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path');
const SITE=path.resolve(__dirname,'../site'), DT=process.env.DT||'/home/claude/dt';
(async()=>{const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1280,height:800}});
await ctx.route('https://bacon-sys.github.io/**',async r=>{const u=new URL(r.request().url());let f;
 if(u.pathname.startsWith('/115-eval-3d/')){f=path.join(SITE,u.pathname.slice(13)||'index.html');}
 else if(u.pathname.startsWith('/datong-trail/')){f=path.join(DT,u.pathname.slice(14));}
 if(f&&(f.endsWith('/')||(fs.existsSync(f)&&fs.statSync(f).isDirectory())))f=path.join(f,'index.html'); if(f&&fs.existsSync(f)&&fs.statSync(f).isFile()) return r.fulfill({path:f}); return r.fulfill({status:404,body:''});});
await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{try{localStorage.setItem('eval3d-tour','1')}catch(e){}});
await p.goto('https://bacon-sys.github.io/115-eval-3d/#valley',{waitUntil:'domcontentloaded'});await p.waitForTimeout(9000);
console.log('frame src',await p.evaluate(()=>document.getElementById('valleyFrame').src));
console.log('newtab',await p.evaluate(()=>document.getElementById('valleyNewTab').href));
const fr=p.frames().find(f=>f.url().includes('datong-trail'));
console.log('trail frame', !!fr);
await p.screenshot({path:(process.env.SHOTS||'/tmp/shots/')+'trail.png'});
const old=await ctx.newPage(); await old.goto('https://bacon-sys.github.io/115-eval-3d/valley/',{waitUntil:'commit'}); await old.waitForURL(/datong-trail/,{timeout:15000,waitUntil:'commit'}); console.log('old valley/ ->',old.url());
console.log('errors',errs);await b.close();})();
