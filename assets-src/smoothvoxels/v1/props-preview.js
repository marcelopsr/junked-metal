import * as B from '@babylonjs/core';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import '@babylonjs/loaders/glTF/index.js';
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/700.css';

const canvas=document.querySelector('#view'),status=document.querySelector('#status'),select=document.querySelector('#asset'),badge=document.querySelector('#badge');
const assets=[['planter','Maceta de terracota'],['paint-can','Lata de pintura RC'],['rusty-drum','Bidón oxidado']];
const engine=new B.Engine(canvas,true,{preserveDrawingBuffer:true,antialias:true},true),scene=new B.Scene(engine);scene.clearColor=B.Color4.FromHexString('#292c28ff');
const camera=new ArcRotateCamera('camera',-Math.PI/2,1.08,5.2,new B.Vector3(0,.5,0),scene);camera.attachControl(canvas,true);camera.lowerRadiusLimit=1.2;camera.upperRadiusLimit=12;camera.wheelPrecision=35;
const hemi=new B.HemisphericLight('ambient',B.Vector3.Up(),scene);hemi.intensity=.9;const sun=new B.DirectionalLight('sun',new B.Vector3(-.45,-1,-.35),scene);sun.position.set(5,9,6);sun.intensity=2;
const shadows=new B.ShadowGenerator(1024,sun);shadows.usePercentageCloserFiltering=true;
const floor=B.MeshBuilder.CreateGround('floor',{width:12,height:12},scene),mat=new B.PBRMaterial('ground',scene);mat.albedoColor=B.Color3.FromHexString('#68543a');mat.roughness=.96;floor.material=mat;floor.receiveShadows=true;floor.position.y=-.015;
const loaded=new Map();
try{
 for(const [i,[id,name]]of assets.entries()){const container=await B.LoadAssetContainerAsync(`./exports/${id}.glb`,scene);container.addAllToScene();const root=new B.TransformNode(id+'-placement',scene);root.position.set((i-1)*1.45,-.25,0);if(id==='paint-can')root.rotation.y=-Math.PI/2;for(const node of container.rootNodes)node.parent=root;for(const mesh of container.meshes)if(mesh.getTotalVertices())shadows.addShadowCaster(mesh);root.setEnabled(false);loaded.set(id,{root,container,name});}
 const selectAsset=()=>{const id=select.value,all=id==='all';for(const [key,item]of loaded){item.root.setEnabled(all||key===id);item.root.position.x=all?(assets.findIndex(a=>a[0]===key)-1)*1.45:0;}badge.textContent=all?'TRES RECURSOS · VISTA COMPARATIVA':loaded.get(id).name.toLocaleUpperCase('es');camera.alpha=-Math.PI/2;camera.beta=1.08;camera.radius=all?5.3:id==='rusty-drum'?3.9:3.5;camera.setTarget(new B.Vector3(0,.5,0));};
 select.onchange=selectAsset;document.querySelector('#reset').onclick=selectAsset;selectAsset();await scene.whenReadyAsync();status.textContent='3 modelos listos · arrastre para girar · rueda para acercar';engine.runRenderLoop(()=>scene.render());
}catch(error){status.textContent='No se pudo cargar uno de los modelos 3D.';console.error(error);}
addEventListener('resize',()=>engine.resize());addEventListener('pagehide',()=>{scene.dispose();engine.dispose();},{once:true});
