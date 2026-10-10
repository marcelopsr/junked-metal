// Banco 3D local: un navegador Metal, sin servidor nuevo. node scripts/cinematic-check.mjs
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {launch,BASE,VIEWPORTS} from './lib/browser.mjs';
const directory='.shots/cinematic-3d';await mkdir(directory,{recursive:true});
const browser=await launch({perf:true}),checks=[];
try{for(const vp of ['pc','cel']){
 const v=VIEWPORTS[vp],ctx=await browser.newContext({...v,viewport:{width:v.width,height:v.height}}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text());}});
 await page.goto(BASE+'/art-lab.html?mute',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof window.__art==='function',{},{timeout:90000});
 await page.evaluate(()=>{window.__artFreeze();window.__art({animated:false,time:0});});
 await page.evaluate(()=>document.fonts.ready);
 const initial=await page.evaluate(()=>window.__artInfo());assert.equal(initial.wheels,4);assert.equal(initial.clips.length,7);
 const boneBefore=await page.evaluate(()=>[...window.__artScene.skeletons[0].getTransformMatrices(window.__artScene.getMeshByName('Perro'))]);
 await page.evaluate(()=>window.__art({time:.7}));
 const boneAfter=await page.evaluate(()=>[...window.__artScene.skeletons[0].getTransformMatrices(window.__artScene.getMeshByName('Perro'))]);
 assert.notDeepEqual(boneBefore,boneAfter,'Idle must animate the skeleton');
 for(const clip of initial.clips){
  await page.evaluate(clip=>window.__art({clip,time:.35}),clip);
  const finite=await page.evaluate(()=>[...window.__artScene.skeletons[0].getTransformMatrices(window.__artScene.getMeshByName('Perro'))].every(Number.isFinite));assert(finite,clip+' must have finite bone matrices');
 }
 await page.evaluate(()=>window.__art({clip:'idle',time:0}));
 const shots=[];
 for(const light of ['night','day'])for(const view of ['close','game']){
  const info=await page.evaluate(o=>window.__art({...o,animated:false,time:0}),{light,view});
  await page.evaluate(async()=>{await window.__artScene.whenReadyAsync();window.__artTick(6);});
  await page.screenshot({path:`${directory}/${vp}-${light}-${view}.png`});shots.push({light,view,...info});
 }
 if(vp==='pc')for(const yaw of [0,90,180,270]){
  await page.evaluate(yaw=>window.__art({light:'day',view:'orbit',yaw}),yaw);await page.evaluate(()=>window.__artTick(4));
  await page.screenshot({path:`${directory}/${vp}-orbit-${yaw}.png`});
 }
 await page.locator('[data-light=night]').click();await page.locator('[data-view=close]').click();
 assert.equal(await page.locator('[data-light=night]').getAttribute('aria-pressed'),'true');
 await page.evaluate(async()=>{await window.__artScene.whenReadyAsync();window.__artTick(4);});
 const perf=await page.evaluate(()=>{
  const scene=window.__artScene,e=scene.getEngine();const times=[];
  for(let i=0;i<60;i++){
   const t=performance.now();window.__artTick();e._gl.readPixels(0,0,1,1,e._gl.RGBA,e._gl.UNSIGNED_BYTE,new Uint8Array(4));if(i>=10)times.push(performance.now()-t);
  }
  times.sort((a,b)=>a-b);const before=e._drawCalls.current;window.__artTick();
  return {medianMs:times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)],draws:e._drawCalls.current-before,triangles:scene.getActiveIndices()/3,meshes:scene.meshes.length,render:[e.getRenderWidth(),e.getRenderHeight()],renderer:e.getGlInfo().renderer};
 });
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow);assert.deepEqual(errors,[]);
 if(vp==='pc'){
  await mkdir(`${directory}/frames`,{recursive:true});
  await page.evaluate(()=>window.__art({light:'night',view:'orbit',animated:false}));
  await page.evaluate(async()=>{await window.__artScene.whenReadyAsync();window.__artTick(4);});
  for(let frame=0;frame<96;frame++){
   await page.evaluate(frame=>window.__art({yaw:-35+frame*3.75,time:frame/12}),frame);
   await page.screenshot({path:`${directory}/frames/${String(frame).padStart(4,'0')}.png`});
  }
 }
 checks.push({viewport:vp,initial,shots,animatedSkeleton:true,clipsFinite:initial.clips,controls:true,overflow,errors,perf});await ctx.close();
}}finally{await browser.close();}
await writeFile(`${directory}/verification.json`,JSON.stringify(checks,null,2));console.log(JSON.stringify(checks.map(({viewport,perf,initial})=>({viewport,perf,clips:initial.clips,wheels:initial.wheels})),null,2));
