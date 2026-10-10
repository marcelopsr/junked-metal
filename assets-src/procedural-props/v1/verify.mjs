import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {launch,BASE,VIEWPORTS} from '../../../scripts/lib/browser.mjs';
const root=fileURLToPath(new URL('.',import.meta.url)),catalog=JSON.parse(await readFile(root+'assets.json','utf8'));
assert.equal(catalog.assets.length,15);assert.equal(new Set(catalog.assets.map(a=>a.id)).size,15);
const binaryChecks=[];
for(const a of catalog.assets){
 assert(!a.model.includes('..'));const file=await readFile(root+a.model);assert.equal(file.length,a.bytes);assert.equal(createHash('sha256').update(file).digest('hex'),a.sha256);
 assert.equal(file.readUInt32LE(0),0x46546c67);assert.equal(file.readUInt32LE(4),2);assert.equal(file.readUInt32LE(8),file.length);
 const length=file.readUInt32LE(12);assert.equal(file.readUInt32LE(16),0x4e4f534a);const doc=JSON.parse(file.subarray(20,20+length).toString()),bin=file.subarray(28+length);
 assert.equal(file.readUInt32LE(24+length),0x004e4942);assert.equal(doc.buffers.length,1);assert(!doc.buffers[0].uri);assert(!doc.skins&&!doc.animations);
 let tris=0,primitives=0,minY=Infinity,maxY=-Infinity;
 for(const mesh of doc.meshes)for(const p of mesh.primitives){
  assert.equal(p.mode??4,4);assert(p.attributes.POSITION!==undefined&&p.attributes.NORMAL!==undefined&&p.attributes.TEXCOORD_0!==undefined);assert(p.indices!==undefined);primitives++;
  const indices=doc.accessors[p.indices],positions=doc.accessors[p.attributes.POSITION];assert.equal(indices.count%3,0);tris+=indices.count/3;
  minY=Math.min(minY,positions.min[1]);maxY=Math.max(maxY,positions.max[1]);
  for(const key of ['POSITION','NORMAL','TEXCOORD_0']){
   const accessor=doc.accessors[p.attributes[key]],view=doc.bufferViews[accessor.bufferView],n=key==='TEXCOORD_0'?2:3;assert.equal(accessor.componentType,5126);assert.equal(accessor.count,positions.count);
   const stride=view.byteStride??n*4,offset=(view.byteOffset??0)+(accessor.byteOffset??0);assert(offset+(accessor.count-1)*stride+n*4<=bin.length);
   for(let i=0;i<accessor.count;i++)for(let c=0;c<n;c++)assert(Number.isFinite(bin.readFloatLE(offset+i*stride+c*4)),a.id+' '+key);
  }
  const view=doc.bufferViews[indices.bufferView],offset=(view.byteOffset??0)+(indices.byteOffset??0),size={5121:1,5123:2,5125:4}[indices.componentType];assert(size);assert(offset+indices.count*size<=bin.length);
  for(let i=0;i<indices.count;i++){const value=size===1?bin.readUInt8(offset+i):size===2?bin.readUInt16LE(offset+i*2):bin.readUInt32LE(offset+i*4);assert(value<positions.count);}
 }
 for(const material of doc.materials){assert(material.normalTexture);assert(material.pbrMetallicRoughness.baseColorTexture);assert(material.pbrMetallicRoughness.metallicRoughnessTexture);}
 assert(doc.images.every(i=>i.bufferView!==undefined&&!i.uri));assert.equal(tris,a.triangles);assert(tris<12000);assert(primitives<=4);assert(Math.abs(minY)<1e-5&&maxY>0);assert(a.sameSeedChecked);
 binaryChecks.push({id:a.id,triangles:tris,primitives,minY,maxY,embeddedTextures:true,finiteAttributes:true});
}
for(const family of new Set(catalog.assets.map(a=>a.family))){const group=catalog.assets.filter(a=>a.family===family);assert.equal(group.length,3);assert.equal(new Set(group.map(a=>a.geometrySha256)).size,3);}
for(const path of catalog.textures){const data=await readFile(root+path);assert.equal(data.readUInt32BE(16),512);assert.equal(data.readUInt32BE(20),512);}
await mkdir(root+'evidence',{recursive:true});const browser=await launch(),results=[];
try{for(const vp of ['pc','cel']){
 const v=VIEWPORTS[vp],context=await browser.newContext({...v,viewport:{width:v.width,height:v.height}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(BASE+'/assets-src/procedural-props/v1/index.html',{waitUntil:'domcontentloaded'});try{await page.waitForFunction(()=>typeof window.__propsInfo==='function',null,{timeout:90000});}catch(error){console.error(JSON.stringify({errors,status:await page.locator('#status').textContent()}));throw error;}
 await page.evaluate(()=>window.__propsFreeze());await page.evaluate(()=>document.fonts.ready);
 const info=await page.evaluate(()=>window.__propsInfo());assert.equal(info.loaded,15);assert.equal(info.geometry.length,15);
 for(const g of info.geometry){const a=catalog.assets.find(a=>a.id===g.id);assert.equal(g.triangles,a.triangles);assert(g.vertices>0);}
 assert.equal(await page.locator('.card').count(),5);assert.equal(await page.locator('.links a').count(),15);
 for(const mode of ['day','night']){await page.locator(`[data-light="${mode}"]`).click();await page.evaluate(()=>window.__propsTick());assert.equal((await page.evaluate(()=>window.__propsInfo())).lighting,mode);await page.locator('canvas').screenshot({path:root+`evidence/${vp}-all-${mode}.png`});}
 await page.evaluate(()=>window.__propsLight('day'));
 for(const a of catalog.assets){await page.locator('#asset').selectOption(a.id);await page.evaluate(()=>window.__propsTick());assert.equal((await page.evaluate(()=>window.__propsInfo())).selected,a.id);}
 if(vp==='pc')for(const family of new Set(catalog.assets.map(a=>a.family))){const a=catalog.assets.find(a=>a.family===family);for(const yaw of [0,90,180,270]){await page.evaluate(({id,yaw})=>window.__propsView(id,yaw),{id:a.id,yaw});await page.locator('canvas').screenshot({path:root+`evidence/${family}-${yaw}.png`});}}
 await page.locator('#asset').selectOption('all');await page.locator('#reset').click();await page.evaluate(()=>window.__propsTick());
 const allInFrame=await page.evaluate(()=>{const s=window.__propsScene,m=s.getTransformMatrix().m;return s.meshes.filter(mesh=>mesh.getTotalVertices()&& !['floor','sky'].includes(mesh.name)).every(mesh=>{mesh.computeWorldMatrix(true);return mesh.getBoundingInfo().boundingBox.vectorsWorld.every(({x,y,z})=>{const w=x*m[3]+y*m[7]+z*m[11]+m[15];return w>0&&Math.abs((x*m[0]+y*m[4]+z*m[8]+m[12])/w)<.99&&Math.abs((x*m[1]+y*m[5]+z*m[9]+m[13])/w)<.99;});});});assert(allInFrame,'El conjunto debe caber completo en el visor');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow);assert.deepEqual(errors,[]);await page.screenshot({path:root+`evidence/gallery-${vp}.png`,fullPage:true});
 results.push({viewport:vp,loaded:info.loaded,selectedAllVariants:true,lights:true,reset:true,allInFrame,overflow,errors});await context.close();
}}finally{await browser.close();}
await writeFile(root+'evidence/verification.json',JSON.stringify({date:'2026-10-10',binaryChecks,results},null,2)+'\n');console.log(JSON.stringify({models:binaryChecks.length,results}));
