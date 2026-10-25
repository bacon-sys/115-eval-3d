const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await b.newPage({viewport:{width:800,height:600}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{try{localStorage.setItem('eval3d-tour','1')}catch(e){}});
 await p.goto('http://localhost:8765/?time=day&debug'); await p.waitForTimeout(8000);
 const out = await p.evaluate(()=>{
  const E=window.__e3d, T=E.THREE; const root=E.school.group; root.updateMatrixWorld(true);
  // obstacles: meshes in school root whose world bbox intersects walker height band and are not ground
  const obs=[]; const tmp=new T.Vector3(), sc=new T.Vector3();
  const add=(o,name)=>{ if(!o.geometry.boundingBox) o.geometry.computeBoundingBox(); o.getWorldScale(sc); obs.push({o, inv:o.matrixWorld.clone().invert(), lb:o.geometry.boundingBox.clone(), s:Math.max(sc.x,sc.y,sc.z), name}); };
  root.traverse(o=>{ if(!o.isMesh) return; const bb=new T.Box3().setFromObject(o); const sz=bb.getSize(new T.Vector3());
    if (sz.x>6||sz.z>6) return;
    if (bb.max.y < 1.2 || bb.min.y > 1.12+1.05) return;
    add(o,'');
  });
  E.scene.children.forEach(g=>{ if(g.isGroup && g!==root){ const bb=new T.Box3().setFromObject(g); const sz=bb.getSize(new T.Vector3()); if(sz.x<1&&sz.z<1&&Math.hypot(bb.min.x,bb.min.z)<7.5) g.traverse(o=>{if(o.isMesh) add(o,'lantern')}); } });
  const res=[]; const P=new T.Vector3();
  for (const w of E.walkers){ if(!w.leg) continue; const L=w.leg.len;
    for(let s=0;s<L;s+=0.1){
      let i=1; while(i<w.leg.cum.length-1&&w.leg.cum[i]<s)i++; const k=(s-w.leg.cum[i-1])/Math.max(1e-6,w.leg.cum[i]-w.leg.cum[i-1]); P.lerpVectors(w.leg.pts[i-1],w.leg.pts[i],k);
      if (Math.hypot(P.x,P.z)>6.8) continue;
      for (const hy of [0.2,0.5,0.85]) { let hit=null;
       for (const o of obs){ const q=P.clone(); q.y+=hy; q.applyMatrix4(o.inv); const e=o.lb.clone().expandByScalar(0.16/o.s); if(e.containsPoint(q)){ hit=o; break; } }
       if(hit){ const c=new T.Box3().setFromObject(hit.o).getCenter(new T.Vector3()); res.push((w.cfg?w.cfg.a+'>'+w.cfg.b:'g')+' @('+P.x.toFixed(1)+','+P.z.toFixed(1)+') h'+hy+' obj('+c.x.toFixed(2)+','+c.y.toFixed(2)+','+c.z.toFixed(2)+') '+hit.name+' '+hit.o.geometry.type); break; } }
    }}
  return [obs.length, [...new Set(res)].slice(0,60)];
 });
 console.log(JSON.stringify(out,null,1)); console.log(errs); await b.close();
})();
