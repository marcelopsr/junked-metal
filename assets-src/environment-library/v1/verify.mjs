// Un navegador, servidor existente y candado compartido; no modifica recursos.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {launch,BASE,VIEWPORTS} from '../../../scripts/lib/browser.mjs';
const root=fileURLToPath(new URL('.',import.meta.url)),catalog=JSON.parse(await readFile(root+'assets.json','utf8'));
assert.equal(catalog.assets.length,4);assert.equal(new Set(catalog.assets.map(a=>a.id)).size,4);
for(const a of catalog.assets){
 for(const [path,hash]of [[a.source,a.sourceSha256],[a.texture,a.textureSha256],[a.prompt,null]]){assert(!path.includes('..'));const bytes=await readFile(root+path);assert(bytes.length>0);if(hash)assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);}
 assert(a.width>=1000&&a.height===a.width);assert(a.textureBytes<a.sourceBytes);
}
await mkdir(root+'evidence',{recursive:true});const browser=await launch(),results=[];
try{for(const name of ['pc','cel']){
 const v=VIEWPORTS[name],context=await browser.newContext({...v,viewport:{width:v.width,height:v.height}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(BASE+'/assets-src/environment-library/v1/index.html',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelectorAll('.card').length===4);
 const decoded=await page.evaluate(async()=>{
  const data=await(await fetch('./assets.json')).json(),out=[];
  for(const a of data.assets){let previous=null;for(const path of [a.source,a.texture]){
   const img=new Image();img.src=path;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   let transparent=0,semi=0,opaque=0,edgeMax=0,equal=true;const alpha=new Uint8Array(canvas.width*canvas.height);
   for(let n=0;n<alpha.length;n++){const value=pixels[n*4+3];alpha[n]=value;if(!value)transparent++;else if(value===255)opaque++;else semi++;if(previous&&previous[n]!==value)equal=false;if(n<canvas.width||n>=alpha.length-canvas.width||n%canvas.width===0||n%canvas.width===canvas.width-1)edgeMax=Math.max(edgeMax,value);}
   previous=alpha;out.push({id:a.id,path,width:canvas.width,height:canvas.height,transparent,semi,opaque,edgeMax,alphaEqual:equal});
  }}await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));return out;
 });assert.equal(decoded.length,8);
 // La generación puede dejar ruido de alpha 1/255 en el borde; conservar la fuente sin retocarla.
 for(const img of decoded){const a=catalog.assets.find(a=>a.id===img.id);assert.equal(img.width,a.width);assert.equal(img.height,a.height);assert.equal(img.transparent,a.alpha.transparentPixels);assert.equal(img.semi,a.alpha.semiTransparentPixels);assert.equal(img.opaque,a.alpha.opaquePixels);assert(img.edgeMax<=1,'Only alpha noise up to 1/255 may touch the outer edge');assert(img.alphaEqual);}
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow);
 const square=await page.evaluate(()=>[...document.querySelectorAll('.card img')].every(i=>{const r=i.getBoundingClientRect();return Math.abs(r.width-r.height)<1;}));assert(square);
 await page.screenshot({path:root+`evidence/gallery-${name}.png`,fullPage:true});
 for(const a of catalog.assets){
  await page.locator(`[data-asset="${a.id}"] button`).click();assert(await page.locator('dialog').isVisible());assert.equal(await page.locator('dialog img').count(),5);
  await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('dialog img')].map(i=>i.decode()));for(const f of document.querySelectorAll('#previews .surface')){const img=new Image();img.src=f.style.backgroundImage.slice(5,-2);await img.decode();}});
  assert(!(await page.locator('dialog').evaluate(d=>d.scrollWidth>d.clientWidth)));
  if(name==='pc')await page.locator('dialog').screenshot({path:root+`evidence/composite-${a.id}.png`});
  await page.locator('#opacity').evaluate(input=>input.value='50');await page.locator('#opacity').dispatchEvent('input');assert.equal(await page.locator('#opacity-value').textContent(),'50 %');assert(await page.locator('dialog img').evaluateAll(imgs=>imgs.every(i=>i.style.opacity==='0.5')));
  await page.keyboard.press('Escape');assert(!(await page.locator('dialog').isVisible()));
 }
 assert.deepEqual(errors,[]);results.push({viewport:name,decoded,dialogs:4,compositions:20,opacityControl:true,square,overflow,errors});await context.close();
}}finally{await browser.close();}
await writeFile(root+'evidence/verification.json',JSON.stringify({date:'2026-10-10',results},null,2)+'\n');console.log(JSON.stringify(results.map(({decoded,...r})=>({...r,decoded:decoded.length}))));
