import * as B from '@babylonjs/core';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import '@babylonjs/loaders/glTF/index.js';
import '@babylonjs/core/Meshes/thinInstanceMesh.js';
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/700.css';
const canvas=document.querySelector('#viewer'),status=document.querySelector('#status'),select=document.querySelector('#asset');
const engine=new B.Engine(canvas,true,{preserveDrawingBuffer:true},true),scene=new B.Scene(engine);
engine.setHardwareScalingLevel(1);scene.clearColor=B.Color4.FromHexString('#18222cff');
scene.imageProcessingConfiguration.toneMappingEnabled=true;scene.imageProcessingConfiguration.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;
const camera=new ArcRotateCamera('camera',-1.2,1.02,10,new B.Vector3(0,.2,0),scene);camera.attachControl(canvas,true);camera.minZ=.01;camera.lowerRadiusLimit=.25;camera.upperRadiusLimit=22;camera.upperBetaLimit=Math.PI/2-.02;
const hemi=new B.HemisphericLight('ambient',B.Vector3.Up(),scene),sun=new B.DirectionalLight('key',new B.Vector3(-.4,-1,-.3),scene);sun.position.set(4,8,6);
const shadow=new B.ShadowGenerator(1024,sun);shadow.usePercentageCloserFiltering=true;shadow.normalBias=.004;
const floor=B.MeshBuilder.CreateGround('floor',{width:14,height:9},scene),floorMat=new B.PBRMaterial('floorMat',scene);floor.material=floorMat;floor.receiveShadows=true;floorMat.roughness=.95;
floorMat.albedoTexture=new B.Texture('../../material-library/v1/textures/03-worn-concrete.webp',scene);floorMat.albedoTexture.uScale=5;floorMat.albedoTexture.vScale=3;
// La sonda local evita depender de una imagen HDR remota.
const sky=B.MeshBuilder.CreateSphere('sky',{diameter:100,sideOrientation:B.Mesh.BACKSIDE},scene),skyMat=new B.StandardMaterial('skyMat',scene);sky.material=skyMat;skyMat.disableLighting=true;skyMat.emissiveColor=B.Color3.FromHexString('#738392');sky.infiniteDistance=true;sky.isPickable=false;
const probe=new B.ReflectionProbe('ambientProbe',64,scene);probe.renderList=[sky];probe.refreshRate=B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;scene.environmentTexture=probe.cubeTexture;
let lighting='day',selected='all';const loaded=new Map(),sharedMaterials=new Map();let catalog;
function light(mode){lighting=mode;const night=mode==='night';sun.diffuse=B.Color3.FromHexString(night?'#ffd093':'#fff1d8');sun.intensity=night?2.7:3;hemi.diffuse=B.Color3.FromHexString(night?'#6984aa':'#d8e3ed');hemi.intensity=night?.35:.8;skyMat.emissiveColor=B.Color3.FromHexString(night?'#101b2a':'#738392');probe.cubeTexture.resetRefreshCounter();scene.environmentIntensity=night?.25:.7;for(const b of document.querySelectorAll('[data-light]'))b.setAttribute('aria-pressed',String(b.dataset.light===mode));}
function frame(id='all',yaw=0){
 if(id!=='all'&&!loaded.has(id))throw new RangeError('Recurso desconocido');selected=id;select.value=id;
 for(const [key,{root}]of loaded){root.setEnabled(id==='all'||key===id);if(id!=='all'&&key===id)camera.target.set(root.position.x,.22,root.position.z);}
 if(id==='all')camera.target.set(0,.2,0);
 camera.radius=id==='all'?10*Math.max(1,1.65/(engine.getRenderWidth()/engine.getRenderHeight())):Math.max(.7,...catalog.assets.find(a=>a.id===id).dimensionsMeters)*2.25;camera.alpha=-1.2+yaw*Math.PI/180;camera.beta=1.02;
}
try{
 const response=await fetch('./assets.json');if(!response.ok)throw new Error('Catálogo no disponible');catalog=await response.json();
 for(let i=0;i<catalog.assets.length;i++){
  const a=catalog.assets[i],container=await B.LoadAssetContainerAsync(a.model,scene);container.addAllToScene();const root=new B.TransformNode(a.id+'-placement',scene);
  for(const node of container.rootNodes)node.parent=root;
  const row=catalog.seeds.indexOf(a.seed),col=Math.floor(i/catalog.seeds.length);root.position.set((col-2)*1.9,0,(row-1)*1.9);
  for(const mesh of container.meshes){if(mesh.getTotalVertices()){mesh.receiveShadows=true;shadow.addShadowCaster(mesh);}}
  for(const m of container.materials){if(sharedMaterials.has(m.name)){const shared=sharedMaterials.get(m.name);for(const mesh of container.meshes)if(mesh.material===m)mesh.material=shared;for(const multi of container.multiMaterials)multi.subMaterials=multi.subMaterials.map(old=>old===m?shared:old);m.dispose(false,true);}else sharedMaterials.set(m.name,m);}
  loaded.set(a.id,{root,container});const option=document.createElement('option');option.value=a.id;option.textContent=a.name+' · semilla '+a.seed;select.append(option);
 }
 for(const family of new Set(catalog.assets.map(a=>a.family))){
  const entries=catalog.assets.filter(a=>a.family===family),first=entries[0],card=document.createElement('article');card.className='card';const h=document.createElement('h2');h.textContent=first.name;const p=document.createElement('p');p.textContent=first.uses.join(' · ');const metrics=document.createElement('p');metrics.textContent=`${Math.min(...entries.map(a=>a.triangles))}–${Math.max(...entries.map(a=>a.triangles))} triángulos por variante`;const links=document.createElement('div');links.className='links';for(const a of entries){const link=document.createElement('a');link.href=a.model;link.download='';link.textContent='GLB '+a.seed;links.append(link);}card.append(h,p,metrics,links);document.querySelector('#cards').append(card);
 }
 light('day');frame();await scene.whenReadyAsync();scene.render();
 status.textContent=`${loaded.size} variantes · ${(catalog.assets.reduce((n,a)=>n+a.bytes,0)/1e6).toFixed(2)} MB de GLB · girar para revisar volumen`;
 select.onchange=()=>frame(select.value);for(const b of document.querySelectorAll('[data-light]'))b.onclick=()=>light(b.dataset.light);document.querySelector('#reset').onclick=()=>frame(selected);
 const info=()=>({loaded:loaded.size,selected,lighting,ids:[...loaded.keys()],materials:sharedMaterials.size,geometry:[...loaded].map(([id,{container}])=>({id,meshes:container.meshes.filter(m=>m.getTotalVertices()>0).length,vertices:container.meshes.reduce((n,m)=>n+m.getTotalVertices(),0),triangles:container.meshes.reduce((n,m)=>n+m.getTotalIndices()/3,0)}))});
 Object.assign(window,{__propsInfo:info,__propsScene:scene,__propsFreeze:()=>engine.stopRenderLoop(),__propsView:(id,yaw=0)=>{frame(id,yaw);scene.render();return info();},__propsLight:mode=>{light(mode);scene.render();return info();},__propsTick:()=>scene.render()});
 // El visor dibuja solo mientras la página está visible.
 const render=()=>scene.render();engine.runRenderLoop(render);document.addEventListener('visibilitychange',()=>document.hidden?engine.stopRenderLoop():engine.runRenderLoop(render));
}catch(error){status.textContent='No se pudo cargar la biblioteca 3D.';console.error(error);}
addEventListener('resize',()=>{engine.resize();if(catalog)frame(selected);});addEventListener('pagehide',()=>{scene.dispose();engine.dispose();},{once:true});
