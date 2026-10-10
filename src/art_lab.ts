// Banco independiente: no importa main.ts, Havok, guardado ni los modelos activos de las partidas.
import * as B from '@babylonjs/core';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import '@babylonjs/loaders/glTF/index.js';
import '@babylonjs/core/Meshes/thinInstanceMesh.js';
import { canvasTexture, lcg, wornTex } from './kit3d';
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/700.css';
import './art_lab.css';

const canvas = document.querySelector<HTMLCanvasElement>('#art-canvas')!;
const status = document.querySelector<HTMLElement>('#art-status')!;
const mobile = matchMedia('(pointer: coarse)').matches;
const engine = new B.Engine(canvas, true, { stencil: true }, true);
engine.setHardwareScalingLevel(1 / Math.min(devicePixelRatio, 2));
const scene = new B.Scene(engine);
const camera = new ArcRotateCamera('art-camera', 1.1, 1.3, 13, new B.Vector3(0, 1, 0), scene);
camera.minZ = .05; camera.maxZ = 150; camera.fov = .65;
camera.lowerRadiusLimit = 5; camera.upperRadiusLimit = 30;
camera.upperBetaLimit = Math.PI / 2 - .015;
camera.attachControl(canvas, true);
scene.imageProcessingConfiguration.toneMappingEnabled = true;
scene.imageProcessingConfiguration.toneMappingType = B.ImageProcessingConfiguration.TONEMAPPING_ACES;
scene.imageProcessingConfiguration.contrast = 1.08;
scene.fogMode = B.Scene.FOGMODE_EXP2; scene.fogDensity = .009;

const color = B.Color3.FromHexString;
const material = (name: string, hex: string, rough = .8, metal = 0) => {
  const m = new B.PBRMaterial(name, scene); m.albedoColor = color(hex).toLinearSpace(); m.roughness = rough; m.metallic = metal;
  m.environmentIntensity = .65; m.maxSimultaneousLights = 4; return m;
};
const soil = material('soil', '#ffffff', .95);
const grassMat = material('grass', '#344c23', .9);
const wood = material('fenceWood', '#63543d', .94);
wood.albedoColor=B.Color3.White();
wood.albedoTexture=canvasTexture(scene,'woodGrain',256,512,c=>{
 const r=lcg(90);c.fillStyle='#675b45';c.fillRect(0,0,256,512);
 for(let i=0;i<150;i++){c.strokeStyle=r()>.5?'#4b412f':'#786b50';c.lineWidth=.5+r()*2;c.beginPath();const x=r()*256;c.moveTo(x,0);c.bezierCurveTo(x+12,170,x-10,340,x+5,512);c.stroke();}
});
const wire = material('wire', '#202627', .8);
const bulbMat = material('bulb', '#ffcf79', .3);
bulbMat.emissiveColor = color('#ffbb63').scale(2);
const moonMat = material('moon', '#f6efcf');moonMat.emissiveColor = color('#fff1d1');
const skyTexture = canvasTexture(scene, 'sky', 512, 256, () => {});
const skyMat = new B.StandardMaterial('sky', scene); skyMat.disableLighting = true; skyMat.fogEnabled = false;skyMat.emissiveTexture = skyTexture;
const sky = B.MeshBuilder.CreateSphere('sky', { diameter: 120, segments: 16, sideOrientation: B.Mesh.BACKSIDE }, scene);
sky.material = skyMat;sky.infiniteDistance = true;sky.isPickable = false;
const moon = B.MeshBuilder.CreateSphere('moon', {diameter:2.2,segments:24},scene);moon.material=moonMat;moon.position.set(-17,18,25);
const probe = new B.ReflectionProbe('skyReflection', 128, scene);
probe.renderList = [sky];probe.refreshRate = B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE; scene.environmentTexture = probe.cubeTexture;

// Relieve de grano independiente del albedo generado; no reconstruye sus piedras.
const size = 512, random = lcg(813), heights = new Float32Array(size * size);
for (let i = 0; i < heights.length; i++) heights[i] = random();
soil.albedoTexture = new B.Texture('assets-src/cinematic-3d/earth-albedo.png',scene);
soil.bumpTexture = canvasTexture(scene,'earthNormal',size,size,c=>{
  const image=c.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=(heights[y*size+(x+1)%size]-heights[y*size+(x+size-1)%size])*.4;
    const dy=(heights[((y+1)%size)*size+x]-heights[((y+size-1)%size)*size+x])*.4;
    const n=new B.Vector3(-dx,-dy,1).normalize();image.data.set([(n.x*.5+.5)*255,(n.y*.5+.5)*255,(n.z*.5+.5)*255,255],(y*size+x)*4);
  } c.putImageData(image,0,0);
});
for(const t of [soil.albedoTexture,soil.bumpTexture] as B.Texture[]){t.uScale=t.vScale=8;t.anisotropicFilteringLevel=8;}
const ground=B.MeshBuilder.CreateGround('earth',{width:46,height:46,subdivisions:64,updatable:true},scene);ground.material=soil;ground.receiveShadows=true;
const positions=ground.getVerticesData(B.VertexBuffer.PositionKind)!;
for(let i=0;i<positions.length;i+=3){const x=positions[i],z=positions[i+2];positions[i+1]=Math.sin(x*.7)*Math.cos(z*.5)*.05;}
ground.updateVerticesData(B.VertexBuffer.PositionKind,positions);
const normals:number[]=[];B.VertexData.ComputeNormals(positions,ground.getIndices()!,normals);ground.updateVerticesData(B.VertexBuffer.NormalKind,normals);

const hemi=new B.HemisphericLight('ambient',new B.Vector3(0,1,0),scene);
hemi.groundColor=color('#39281b');
const sun=new B.DirectionalLight('sun',new B.Vector3(-.45,-1,-.35),scene);sun.position.set(10,20,12);
const key=new B.SpotLight('warmKey',new B.Vector3(-3,7,5),new B.Vector3(.3,-1,-.65).normalize(),1.6,2,scene);
key.diffuse=color('#ffd39a');key.falloffType=B.Light.FALLOFF_STANDARD;key.range=25;
const rim=new B.DirectionalLight('rim',new B.Vector3(.3,-.5,.6),scene);rim.diffuse=color('#8cb4df');
const sunShadow=new B.ShadowGenerator(mobile?1024:2048,sun);sunShadow.usePercentageCloserFiltering=true;sunShadow.bias=.0003;sunShadow.normalBias=.025;
const keyShadow=new B.ShadowGenerator(mobile?1024:2048,key);keyShadow.usePercentageCloserFiltering=true;keyShadow.bias=.0003;keyShadow.normalBias=.025;
const cast=(mesh:B.AbstractMesh)=>{sunShadow.addShadowCaster(mesh,true);keyShadow.addShadowCaster(mesh,true);mesh.receiveShadows=true;};

const fence:B.Mesh[]=[];
for(let i=0;i<31;i++){
 const plank=B.MeshBuilder.CreateBox('fence',{width:.58,height:3.2+(i%3)*.12,depth:.14},scene);plank.material=wood;
 plank.position.set((i-15)*.63,1.5,-8);plank.rotation.z=Math.sin(i*5)*.012;plank.receiveShadows=true;fence.push(plank);
}
for(const y of [.5,2.3]){const rail=B.MeshBuilder.CreateBox('fenceRail',{width:20,height:.16,depth:.16},scene);rail.position.set(0,y,-7.86);rail.material=wood;}
// shortcut: pasto en láminas; sustituir por matas curvas al refinar el acabado cercano.
const blade=B.MeshBuilder.CreatePlane('grassBlade',{width:.16,height:.85,sideOrientation:B.Mesh.DOUBLESIDE,updatable:true},scene);
const v=blade.getVerticesData(B.VertexBuffer.PositionKind)!;for(let i=0;i<v.length;i+=3){if(v[i+1]>.1){v[i]*=.1;v[i+2]=.15;}v[i+1]+=.42;}blade.updateVerticesData(B.VertexBuffer.PositionKind,v);blade.material=grassMat;
const matrices:number[]=[];
for(let i=0;i<(mobile?1800:4200);i++){
 const x=(random()-.5)*25,z=(random()-.5)*23;
 if(Math.abs(x)<4.7&&Math.abs(z)<3.7)continue;
 const scale=.35+random()*1.2;
 const matrix=B.Matrix.Compose(new B.Vector3(scale,scale,scale),B.Quaternion.RotationYawPitchRoll(random()*6.28,0,0),new B.Vector3(x,0,z));matrices.push(...matrix.m);
}
blade.thinInstanceSetBuffer('matrix',new Float32Array(matrices),16);blade.isPickable=false;
const pebble=B.MeshBuilder.CreateSphere('pebble',{diameter:.12,segments:5},scene);pebble.material=material('stone','#786a52',.88);
const stones:number[]=[];
for(let i=0;i<450;i++){
 const k=.3+random()*1.3;stones.push(...B.Matrix.Compose(new B.Vector3(k,k*.5,k),B.Quaternion.RotationYawPitchRoll(random()*6.28,0,0),new B.Vector3((random()-.5)*28,.03,(random()-.5)*20)).m);
}pebble.thinInstanceSetBuffer('matrix',new Float32Array(stones),16);

const ropePoints:B.Vector3[]=[];
for(let i=0;i<=40;i++){const x=-10+i*.5;ropePoints.push(new B.Vector3(x,5.3-.8*(1-(x/10)**2),-5));}
const rope=B.MeshBuilder.CreateTube('string',{path:ropePoints,radius:.022,tessellation:6},scene);rope.material=wire;
const bulbs:B.Mesh[]=[];
for(let i=0;i<16;i++){
 const x=-9+i*1.2,y=5.3-.8*(1-(x/10)**2);
 const bulb=B.MeshBuilder.CreateSphere('lightbulb',{diameter:.17,segments:8},scene);bulb.position.set(x,y-.13,-5);bulb.material=bulbMat;bulbs.push(bulb);
}
// Casa y árboles lejanos con volumen: pueden verse desde cualquier ángulo.
const houseMat=material('houseWall','#546171',.95),roofMat=material('roof','#282e38',.95);
const house=B.MeshBuilder.CreateBox('house',{width:7,height:5,depth:5},scene);house.position.set(3,2.5,-15);house.material=houseMat;
const roof=B.MeshBuilder.CreateCylinder('roof',{diameterTop:0,diameterBottom:10,height:3,tessellation:4},scene);roof.position.set(3,6,-15);roof.rotation.y=Math.PI/4;roof.scaling.z=.8;roof.material=roofMat;
const windowMat=material('windowLight','#b9a272');windowMat.emissiveColor=color('#ffd189').scale(.65);
for(const x of [1.5,4.5]){const win=B.MeshBuilder.CreateBox('window',{width:.9,height:1.3,depth:.04},scene);win.position.set(x,3.5,-12.47);win.material=windowMat;}
const leafMat=material('treeLeaves','#233c2b',.97),trunkMat=material('treeTrunk','#493c2c',.94);
for(const x of [-15,-11,11,15]){
 const trunk=B.MeshBuilder.CreateCylinder('treeTrunk',{height:9,diameterTop:.3,diameterBottom:.7,tessellation:8},scene);trunk.position.set(x,4.5,-12);trunk.material=trunkMat;
 for(let i=0;i<5;i++){const canopy=B.MeshBuilder.CreateSphere('canopy',{diameter:5,segments:12},scene);canopy.position.set(x+Math.sin(i*3)*2.1,8+Math.cos(i)*1.3,-12+Math.cos(i*3)*2);canopy.scaling.y=.7;canopy.material=leafMat;}
}
probe.position.set(0,2,0);probe.renderList=[sky,ground,...fence,...bulbs,house,roof];
const pipeline=new B.DefaultRenderingPipeline('cinema',true,scene,[camera]);pipeline.samples=mobile?1:4;pipeline.fxaaEnabled=mobile;
pipeline.bloomEnabled=true;pipeline.bloomThreshold=1.1;pipeline.bloomWeight=.15;pipeline.bloomKernel=32;

let lighting:'day'|'night'='night',view:'close'|'game'|'orbit'='close',animated=true,time=0;
function light(mode:typeof lighting){
 lighting=mode;const night=mode==='night';
 hemi.intensity=night?.5:.9;hemi.diffuse=color(night?'#7693ba':'#dfebed');
 sun.shadowEnabled=!night;key.shadowEnabled=night;sun.intensity=night?.15:2.4;sun.diffuse=color(night?'#b7d2ef':'#fff0cb');
 key.intensity=night?16:0;rim.intensity=night?1.1:0;
 scene.clearColor=B.Color4.FromHexString(night?'#101b2dff':'#87acc9ff');scene.fogColor=color(night?'#142438':'#a2b6c5');scene.fogDensity=night?.009:.005;
 scene.imageProcessingConfiguration.exposure=night?1.15:1;moon.setEnabled(night);
 const c=skyTexture.getContext() as unknown as CanvasRenderingContext2D,g=c.createLinearGradient(0,0,0,256);
 g.addColorStop(0,night?'#020814':'#488dcc');g.addColorStop(.48,night?'#183452':'#adcedc');g.addColorStop(1,night?'#182016':'#53633d');c.fillStyle=g;c.fillRect(0,0,512,256);skyTexture.update();probe.refreshRate=B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
 for(const m of bulbs)m.setEnabled(night);
 for(const el of document.querySelectorAll<HTMLButtonElement>('[data-light]'))el.setAttribute('aria-pressed',String(el.dataset.light===mode));
}
function framing(mode:typeof view,yaw=0){
 view=mode;camera.target.set(0,mode==='game'?.5:1.2,0);
 camera.alpha=Math.PI/2+.27+yaw*Math.PI/180;camera.beta=mode==='game'?.42:mode==='orbit'?1.1:1.49;
 camera.radius=mobile?26:mode==='game'?19:mode==='orbit'?14:12;
 pipeline.depthOfFieldEnabled=!mobile&&mode==='close';pipeline.depthOfField.focusDistance=camera.radius*1000;pipeline.depthOfField.fStop=4;pipeline.depthOfField.lensSize=45;
 for(const el of document.querySelectorAll<HTMLButtonElement>('[data-view]'))el.setAttribute('aria-pressed',String(el.dataset.view===mode));
}
light('night');framing('close');

try{
 const [dog,car]=await Promise.all(['frenchie','buggy'].map(name=>B.LoadAssetContainerAsync(`assets-src/cinematic-3d/${name}.glb`,scene)));
 dog.addAllToScene();car.addAllToScene();
 const dogRoot=new B.TransformNode('frenchie',scene),carRoot=new B.TransformNode('buggy',scene);
 for(const node of dog.rootNodes)node.parent=dogRoot;for(const node of car.rootNodes)node.parent=carRoot;
 dogRoot.scaling.setAll(.27);dogRoot.position.set(2.1,.025,.1);dogRoot.rotation.y=Math.PI-.18;
 carRoot.position.set(-1.8,.04,.3);carRoot.rotation.y=Math.PI+.25;
 const paint=car.materials.find(m=>m.name==='Paint') as B.PBRMaterial|undefined;
 if(paint){paint.clearCoat.isEnabled=true;paint.clearCoat.intensity=.5;paint.clearCoat.roughness=.22;const textures=wornTex(scene,431,'#e6a51e',null,512,.45,.3);textures.alb.updateSamplingMode(B.Texture.TRILINEAR_SAMPLINGMODE);textures.orm.updateSamplingMode(B.Texture.TRILINEAR_SAMPLINGMODE);paint.albedoColor=B.Color3.White();paint.albedoTexture=textures.alb;paint.metallicTexture=textures.orm;paint.useRoughnessFromMetallicTextureGreen=true;paint.useMetallnessFromMetallicTextureBlue=true;}
 for(const m of [...dog.materials,...car.materials])if(m instanceof B.PBRMaterial){m.environmentIntensity=.65;m.maxSimultaneousLights=4;}
 for(const m of [...dog.meshes,...car.meshes])if(m.getTotalVertices()>0)cast(m);
 for(const a of dog.animationGroups)a.stop();
 const idle=dog.animationGroups.find(a=>a.name.toLowerCase().includes('idle'));if(!idle)throw new Error('El frenchie no contiene el clip idle');let activeClip=idle;activeClip.start(true);
 const wheels=car.transformNodes.filter(n=>/^Wheel_(-1|1)_(-0\.9|0\.92)$/.test(n.name));
  function tick(n=1,dt=1/60){if(!Number.isInteger(n)||n<1||n>1200)throw new RangeError('Cuadros: 1..1200');for(let i=0;i<n;i++){
   if(animated)time+=dt;
   activeClip.goToFrame(activeClip.from+(time*24)%Math.max(1,activeClip.to-activeClip.from));
   scene.render();
 }}
 const info=()=>({lighting,view,animated,time,meshes:scene.meshes.length,triangles:scene.getActiveIndices()/3,clips:dog.animationGroups.map(a=>a.name),clip:activeClip.name,wheels:wheels.length,grassInstances:matrices.length/16,render:[engine.getRenderWidth(),engine.getRenderHeight()]});
 await scene.whenReadyAsync();
 Object.assign(window,{__art:(opts:{light?:typeof lighting;view?:typeof view;yaw?:number;animated?:boolean;time?:number;clip?:string})=>{
   if(opts.clip){const next=dog.animationGroups.find(a=>a.name===opts.clip);if(!next)throw new RangeError('Clip desconocido');activeClip.stop();activeClip=next;activeClip.start(true);time=0;}
   if(opts.light)light(opts.light);if(opts.view||opts.yaw!==undefined)framing(opts.view??view,opts.yaw??0);if(opts.animated!==undefined)animated=opts.animated;if(opts.time!==undefined)time=opts.time;tick();return info();
 },__artInfo:info,__artTick:tick,__artFreeze:()=>engine.stopRenderLoop(),__artScene:scene});
 for(const btn of document.querySelectorAll<HTMLButtonElement>('[data-view]'))btn.onclick=()=>framing(btn.dataset.view as typeof view);
 for(const btn of document.querySelectorAll<HTMLButtonElement>('[data-light]'))btn.onclick=()=>light(btn.dataset.light as typeof lighting);
 document.querySelector<HTMLButtonElement>('#art-motion')!.onclick=e=>{animated=!animated;(e.currentTarget as HTMLButtonElement).setAttribute('aria-pressed',String(animated));};
 status.textContent='Modelos 3D reales · Materiales PBR · Primera aproximación';
 engine.runRenderLoop(()=>tick(1,Math.min(.05,engine.getDeltaTime()/1000)));
}catch(error){status.textContent='No se pudo cargar la escena. Revisar los recursos GLB.';console.error(error);}
addEventListener('resize',()=>engine.resize());
addEventListener('pagehide',()=>{engine.stopRenderLoop();scene.dispose();engine.dispose();},{once:true});
