// node assets-src/material-library/v1/verify.mjs — un navegador, servidor existente y cierre garantizado.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch,BASE,VIEWPORTS} from '../../../scripts/lib/browser.mjs';
const root=fileURLToPath(new URL('.',import.meta.url)),catalog=JSON.parse(await readFile(root+'assets.json','utf8'));
assert.equal(catalog.assets.length,8);assert.equal(new Set(catalog.assets.map(a=>a.id)).size,8);
for(const a of catalog.assets){for(const path of [a.source,a.texture,a.prompt]){assert(!path.includes('..'));assert((await readFile(root+path)).length>0);}assert(a.width>1000&&a.height===a.width);assert(a.textureBytes<a.sourceBytes);}
await mkdir(root+'evidence',{recursive:true});
const browser=await launch(),results=[];
try{for(const name of ['pc','cel']){
 const v=VIEWPORTS[name],context=await browser.newContext({...v,viewport:{width:v.width,height:v.height}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(BASE+'/assets-src/material-library/v1/index.html',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelectorAll('.card').length===8);
 const decoded=await page.evaluate(async()=>{
  const data=await(await fetch('./assets.json')).json(),out=[];
  for(const a of data.assets){for(const path of [a.source,a.texture]){const img=new Image();img.src=path;await img.decode();out.push({path,width:img.naturalWidth,height:img.naturalHeight});}}
  await document.fonts.ready;return out;
 });assert.equal(decoded.length,16);for(const img of decoded){assert.equal(img.width,1254);assert.equal(img.height,1254);}
 await page.evaluate(async()=>{for(const i of document.images)i.loading='eager';await Promise.all([...document.images].map(i=>i.decode()));scrollTo(0,0);});
 const square=await page.evaluate(()=>[...document.querySelectorAll('.card img')].every(i=>{const r=i.getBoundingClientRect();return Math.abs(r.width-r.height)<1;}));assert(square,'Gallery images must keep a square aspect ratio');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow);
 await page.screenshot({path:root+`evidence/gallery-${name}.png`,fullPage:true});
 for(const a of catalog.assets){
  await page.locator(`[data-asset="${a.id}"] button`).click();assert(await page.locator('dialog').isVisible());
  if(name==='pc')await page.locator('dialog').screenshot({path:root+`evidence/repeat-${a.id}.png`});
  await page.keyboard.press('Escape');assert(!(await page.locator('dialog').isVisible()));
 }
 assert.deepEqual(errors,[]);results.push({viewport:name,decoded:decoded.length,dialogs:8,square,overflow,errors});await context.close();
}}finally{await browser.close();}
await writeFile(root+'evidence/verification.json',JSON.stringify({date:'2026-10-10',results},null,2)+'\n');console.log(JSON.stringify(results));
