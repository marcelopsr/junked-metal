// Junked Metal — Banco Cinematográfico 3D de Evaluación Visual
// Ensamblaje maestro de modelos PBR, vegetación orgánica, iluminación física y cámaras.
import * as B from '@babylonjs/core';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import '@babylonjs/loaders/glTF/index.js';
import '@babylonjs/core/Meshes/thinInstanceMesh.js';
import { canvasTexture, lcg } from './kit3d';
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
camera.minZ = 0.05;
camera.maxZ = 160;
camera.fov = 0.65;
camera.lowerRadiusLimit = 4.5;
camera.upperRadiusLimit = 32;
camera.upperBetaLimit = Math.PI / 2 - 0.015;
camera.attachControl(canvas, true);

scene.imageProcessingConfiguration.toneMappingEnabled = true;
scene.imageProcessingConfiguration.toneMappingType = B.ImageProcessingConfiguration.TONEMAPPING_ACES;
scene.imageProcessingConfiguration.contrast = 1.1;
scene.fogMode = B.Scene.FOGMODE_EXP2;
scene.fogDensity = 0.008;

const color = B.Color3.FromHexString;
const random = lcg(813);

// Cielo y Luna física
const skyTexture = canvasTexture(scene, 'sky', 512, 256, () => {});
const skyMat = new B.StandardMaterial('sky', scene);
skyMat.disableLighting = true;
skyMat.fogEnabled = false;
skyMat.emissiveTexture = skyTexture;
const sky = B.MeshBuilder.CreateSphere('sky', { diameter: 140, segments: 16, sideOrientation: B.Mesh.BACKSIDE }, scene);
sky.material = skyMat;
sky.infiniteDistance = true;
sky.isPickable = false;

const moonMat = new B.PBRMaterial('moon', scene);
moonMat.emissiveColor = color('#fff4d6');
const moon = B.MeshBuilder.CreateSphere('moon', { diameter: 2.4, segments: 24 }, scene);
moon.material = moonMat;
moon.position.set(-17, 18, 25);

const probe = new B.ReflectionProbe('skyReflection', 128, scene);
probe.renderList = [sky];
probe.refreshRate = B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
scene.environmentTexture = probe.cubeTexture;

// Luces principales
const hemi = new B.HemisphericLight('ambient', new B.Vector3(0, 1, 0), scene);
hemi.groundColor = color('#2e2118');

const sun = new B.DirectionalLight('sun', new B.Vector3(-0.45, -1, -0.35), scene);
sun.position.set(10, 20, 12);

const key = new B.SpotLight('warmKey', new B.Vector3(-3, 7, 5), new B.Vector3(0.3, -1, -0.65).normalize(), 1.6, 2, scene);
key.diffuse = color('#ffd39a');
key.falloffType = B.Light.FALLOFF_STANDARD;
key.range = 25;

const rim = new B.DirectionalLight('rim', new B.Vector3(0.35, -0.5, 0.65), scene);
rim.diffuse = color('#8cb4df');

// Luces cálidas puntuales para la catenaria Edison
const edisonLights: B.PointLight[] = [];
for (let i = 0; i < 3; i++) {
  const pl = new B.PointLight(`edisonBulbLight_${i}`, new B.Vector3(-6 + i * 6, 4.5, -4.5), scene);
  pl.diffuse = color('#ffa640');
  pl.range = 14;
  pl.intensity = 10;
  edisonLights.push(pl);
}

// Faros del Buggy (Warm tungsten spotlights)
const buggyLampL = new B.SpotLight('buggyLampL', new B.Vector3(-1.6, 0.45, 0.8), new B.Vector3(0.1, -0.15, 1).normalize(), 1.2, 2, scene);
buggyLampL.diffuse = color('#ffd175');
buggyLampL.range = 14;
buggyLampL.intensity = 8;

const buggyLampR = new B.SpotLight('buggyLampR', new B.Vector3(-2.0, 0.45, 0.8), new B.Vector3(0.1, -0.15, 1).normalize(), 1.2, 2, scene);
buggyLampR.diffuse = color('#ffd175');
buggyLampR.range = 14;
buggyLampR.intensity = 8;

// Generadores de sombras con Percentage Closer Filtering (PCF)
const sunShadow = new B.ShadowGenerator(mobile ? 1024 : 2048, sun);
sunShadow.usePercentageCloserFiltering = true;
sunShadow.bias = 0.0003;
sunShadow.normalBias = 0.025;

const keyShadow = new B.ShadowGenerator(mobile ? 1024 : 2048, key);
keyShadow.usePercentageCloserFiltering = true;
keyShadow.bias = 0.0003;
keyShadow.normalBias = 0.025;

const cast = (mesh: B.AbstractMesh) => {
  sunShadow.addShadowCaster(mesh, true);
  keyShadow.addShadowCaster(mesh, true);
  mesh.receiveShadows = true;
};

// Pipeline de renderizado cinemático con Bloom y Depth of Field
const pipeline = new B.DefaultRenderingPipeline('cinema', true, scene, [camera]);
pipeline.samples = mobile ? 1 : 4;
pipeline.fxaaEnabled = mobile;
pipeline.bloomEnabled = true;
pipeline.bloomThreshold = 1.05;
pipeline.bloomWeight = 0.18;
pipeline.bloomKernel = 32;

let lighting: 'day' | 'night' = 'night';
let view: 'close' | 'game' | 'orbit' = 'close';
let actor: 'frenchie' | 'eulalio' | 'both' = 'frenchie';
let animated = true;
let time = 0;

function light(mode: typeof lighting) {
  lighting = mode;
  const night = mode === 'night';
  hemi.intensity = night ? 0.45 : 0.95;
  hemi.diffuse = color(night ? '#6882a8' : '#e0ebee');
  sun.shadowEnabled = !night;
  key.shadowEnabled = night;
  sun.intensity = night ? 0.12 : 2.5;
  sun.diffuse = color(night ? '#a8c6ea' : '#fff0cb');
  key.intensity = night ? 15 : 0;
  rim.intensity = night ? 1.4 : 0;
  for (const pl of edisonLights) pl.intensity = night ? 11 : 0;
  buggyLampL.intensity = night ? 9 : 0;
  buggyLampR.intensity = night ? 9 : 0;
  scene.clearColor = B.Color4.FromHexString(night ? '#0c1524ff' : '#87acc9ff');
  scene.fogColor = color(night ? '#122033' : '#a2b6c5');
  scene.fogDensity = night ? 0.008 : 0.0045;
  scene.imageProcessingConfiguration.exposure = night ? 1.15 : 1;
  moon.setEnabled(night);

  const c = skyTexture.getContext() as unknown as CanvasRenderingContext2D;
  const g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, night ? '#020814' : '#488dcc');
  g.addColorStop(0.48, night ? '#142c48' : '#adcedc');
  g.addColorStop(1, night ? '#141d18' : '#53633d');
  c.fillStyle = g;
  c.fillRect(0, 0, 512, 256);
  skyTexture.update();
  probe.refreshRate = B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;

  for (const el of document.querySelectorAll<HTMLButtonElement>('[data-light]')) {
    el.setAttribute('aria-pressed', String(el.dataset.light === mode));
  }
}

function framing(mode: typeof view, yaw = 0) {
  view = mode;
  camera.target.set(0, mode === 'game' ? 0.5 : 1.1, 0);
  camera.alpha = Math.PI / 2 + 0.27 + (yaw * Math.PI) / 180;
  camera.beta = mode === 'game' ? 0.42 : mode === 'orbit' ? 1.1 : 1.49;
  camera.radius = mobile ? 26 : mode === 'game' ? 19 : mode === 'orbit' ? 14 : 12;
  pipeline.depthOfFieldEnabled = !mobile && mode === 'close';
  pipeline.depthOfField.focusDistance = camera.radius * 1000;
  pipeline.depthOfField.fStop = 3.8;
  pipeline.depthOfField.lensSize = 48;
  for (const el of document.querySelectorAll<HTMLButtonElement>('[data-view]')) {
    el.setAttribute('aria-pressed', String(el.dataset.view === mode));
  }
}

light('night');
framing('close');

try {
  // Carga asíncrona de los paquetes cinematográficos PBR
  const [dog, cat, car, vegAsset, fenceAsset, lightsAsset, groundAsset] = await Promise.all([
    B.LoadAssetContainerAsync('assets-src/cinematic-3d/frenchie.glb', scene),
    B.LoadAssetContainerAsync('assets-src/cinematic-3d/eulalio.glb', scene),
    B.LoadAssetContainerAsync('assets-src/cinematic-3d/buggy.glb', scene),
    B.LoadAssetContainerAsync('assets-src/cinematic-3d/vegetation.glb', scene),
    B.LoadAssetContainerAsync('assets-src/cinematic-3d/fence_boundary.glb', scene),
    B.LoadAssetContainerAsync('assets-src/cinematic-3d/patio_lights.glb', scene),
    B.LoadAssetContainerAsync('assets-src/cinematic-3d/ground_terrain.glb', scene),
  ]);

  dog.addAllToScene();
  cat.addAllToScene();
  car.addAllToScene();
  vegAsset.addAllToScene();
  fenceAsset.addAllToScene();
  lightsAsset.addAllToScene();
  groundAsset.addAllToScene();

  // Ensamblaje y anclaje del Frenchie, Eulalio y Buggy
  const dogRoot = new B.TransformNode('frenchie', scene);
  const catRoot = new B.TransformNode('eulalio', scene);
  const carRoot = new B.TransformNode('buggy', scene);
  for (const node of dog.rootNodes) node.parent = dogRoot;
  for (const node of cat.rootNodes) node.parent = catRoot;
  for (const node of car.rootNodes) node.parent = carRoot;

  function updateActors(mode: typeof actor) {
    actor = mode;
    if (mode === 'frenchie') {
      dogRoot.setEnabled(true);
      catRoot.setEnabled(false);
      dogRoot.scaling.setAll(0.27);
      dogRoot.position.set(2.1, 0.025, 0.1);
      dogRoot.rotation.y = Math.PI - 0.18;
    } else if (mode === 'eulalio') {
      dogRoot.setEnabled(false);
      catRoot.setEnabled(true);
      catRoot.scaling.setAll(0.27);
      catRoot.position.set(2.1, 0.025, 0.1);
      catRoot.rotation.y = Math.PI - 0.18;
    } else { // both
      dogRoot.setEnabled(true);
      catRoot.setEnabled(true);
      dogRoot.scaling.setAll(0.27);
      dogRoot.position.set(1.0, 0.025, 0.3);
      dogRoot.rotation.y = Math.PI - 0.22;

      catRoot.scaling.setAll(0.27);
      catRoot.position.set(2.8, 0.025, 0.2);
      catRoot.rotation.y = Math.PI - 0.15;
    }
    for (const el of document.querySelectorAll<HTMLButtonElement>('[data-actor]')) {
      el.setAttribute('aria-pressed', String(el.dataset.actor === mode));
    }
  }
  updateActors('frenchie');

  carRoot.position.set(-1.8, 0.04, 0.3);
  carRoot.rotation.y = Math.PI + 0.25;

  // Orientar y anclar los props de fondo y límites
  const fenceNode = scene.getMeshByName('Fence_AgedSection_5m');
  if (fenceNode) {
    fenceNode.position.set(0, 0, -8);
    // Clonar sección para cubrir el fondo panorámico
    const fenceR = fenceNode.clone('Fence_AgedSection_R', null);
    if (fenceR) fenceR.position.set(5, 0, -8);
    const fenceL = fenceNode.clone('Fence_AgedSection_L', null);
    if (fenceL) fenceL.position.set(-5, 0, -8);
  }

  const barrier = scene.getTransformNodeByName('SafetyBarrier_Straight');
  if (barrier) {
    barrier.position.set(0, 0, -4.2);
  }

  const garland = scene.getTransformNodeByName('Garland_Edison_Span');
  if (garland) {
    garland.position.set(0, 4.8, -4.5);
  }

  // Material PBR de la carrocería del Buggy
  const paint = car.materials.find(m => m.name === 'Paint') as B.PBRMaterial | undefined;
  if (paint) {
    paint.clearCoat.isEnabled = true;
    paint.clearCoat.intensity = 0.4;
    paint.clearCoat.roughness = 0.22;
    paint.roughness = 0.52;
    paint.metallic = 0.12;
  }

  // Neumáticos mates oscuros
  const rubber = car.materials.find(m => m.name === 'Rubber') as B.PBRMaterial | undefined;
  if (rubber) {
    rubber.albedoColor = color('#181b1e').toLinearSpace();
    rubber.roughness = 0.94;
    rubber.metallic = 0.02;
    rubber.metallicTexture = null;
  }

  // Metales y cromados
  const chrome = car.materials.find(m => m.name === 'Chrome') as B.PBRMaterial | undefined;
  if (chrome) {
    chrome.roughness = 0.12;
    chrome.metallic = 0.95;
    chrome.albedoColor = color('#e8ecf0').toLinearSpace();
  }
  const metal = car.materials.find(m => m.name === 'Metal') as B.PBRMaterial | undefined;
  if (metal) {
    metal.roughness = 0.32;
    metal.metallic = 0.85;
  }

  // Faros y filamentos emisivos
  const lamp = car.materials.find(m => m.name === 'Lamp') as B.PBRMaterial | undefined;
  if (lamp) {
    lamp.emissiveColor = color('#ffd175');
    lamp.roughness = 0.15;
  }

  const visor = car.materials.find(m => m.name === 'PilotVisor') as B.PBRMaterial | undefined;
  if (visor) {
    visor.emissiveColor = color('#ffea78');
  }

  const filament = lightsAsset.materials.find(m => m.name === 'M_Filament_Incandescent') as B.PBRMaterial | undefined;
  if (filament) {
    filament.emissiveColor = color('#ff9e3b');
  }

  // Material del Frenchie: Pelaje mate orgánico de bulldog (roughness ~0.82, cero metalicidad, sin falso brillo lacado)
  const frenchieCoat = dog.materials.find(m => m.name === 'FrenchieCoat') as B.PBRMaterial | undefined;
  if (frenchieCoat) {
    frenchieCoat.metallicTexture = null; // Evitar el ORM horneado plano
    frenchieCoat.roughness = 0.82;
    frenchieCoat.metallic = 0.0;
    frenchieCoat.environmentIntensity = 0.55;
    frenchieCoat.subSurface.isTranslucencyEnabled = true;
    frenchieCoat.subSurface.translucencyIntensity = 0.15;
  }

  // Material de Eulalio: Pelaje mate naranja atigrado, ojos almendrados verdes
  const eulalioCoat = cat.materials.find(m => m.name === 'EulalioCoat') as B.PBRMaterial | undefined;
  if (eulalioCoat) {
    eulalioCoat.metallicTexture = null;
    eulalioCoat.roughness = 0.82;
    eulalioCoat.metallic = 0.0;
    eulalioCoat.environmentIntensity = 0.55;
    eulalioCoat.subSurface.isTranslucencyEnabled = true;
    eulalioCoat.subSurface.translucencyIntensity = 0.15;
  }

  // Sombras y materiales PBR del entorno
  for (const m of [...dog.materials, ...cat.materials, ...car.materials, ...vegAsset.materials, ...fenceAsset.materials, ...groundAsset.materials]) {
    if (m instanceof B.PBRMaterial) {
      m.environmentIntensity = 0.65;
      m.maxSimultaneousLights = 6;
    }
  }

  for (const m of [...dog.meshes, ...cat.meshes, ...car.meshes, ...fenceAsset.meshes, ...groundAsset.meshes]) {
    if (m.getTotalVertices() > 0) cast(m);
  }

  // Instanciación de matas orgánicas de pasto (thin instances) con corredor visual despejado
  const fineGrass = scene.getMeshByName('GrassTuft_Fine') as B.Mesh | null;
  const broadGrass = scene.getMeshByName('GrassTuft_Broad') as B.Mesh | null;
  const matrices: number[] = [];
  const fineCount = mobile ? 800 : 2000;

  for (let i = 0; i < fineCount; i++) {
    const x = (random() - 0.5) * 26;
    const z = (random() - 0.5) * 24;
    // Despejar el área central y el cono frontal hacia la cámara para encuadre nítido de los modelos
    const distCenter = Math.sqrt((x * 0.75) ** 2 + z ** 2);
    if (distCenter < 4.2) continue;
    if (z > -2 && z < 7 && Math.abs(x) < 4.5) continue; // Corredor de cámara

    const scale = 0.45 + random() * 0.9;
    const matrix = B.Matrix.Compose(
      new B.Vector3(scale, scale, scale),
      B.Quaternion.RotationYawPitchRoll(random() * 6.28, (random() - 0.5) * 0.1, 0),
      new B.Vector3(x, 0, z)
    );
    matrices.push(...matrix.m);
  }

  if (fineGrass) {
    fineGrass.thinInstanceSetBuffer('matrix', new Float32Array(matrices), 16);
    fineGrass.isPickable = false;
  }

  if (broadGrass) {
    const broadMatrices: number[] = [];
    const broadCount = mobile ? 300 : 700;
    for (let i = 0; i < broadCount; i++) {
      const x = (random() - 0.5) * 25;
      const z = (random() - 0.5) * 23;
      if (Math.abs(x) < 4.0 && Math.abs(z) < 3.0) continue;
      const scale = 0.5 + random() * 0.9;
      const matrix = B.Matrix.Compose(
        new B.Vector3(scale, scale, scale),
        B.Quaternion.RotationYawPitchRoll(random() * 6.28, 0, 0),
        new B.Vector3(x, 0, z)
      );
      broadMatrices.push(...matrix.m);
    }
    broadGrass.thinInstanceSetBuffer('matrix', new Float32Array(broadMatrices), 16);
    broadGrass.isPickable = false;
  }

  // Clips de animación del Frenchie
  for (const a of dog.animationGroups) a.stop();
  const dogIdle = dog.animationGroups.find(a => a.name.toLowerCase().includes('idle'));
  if (!dogIdle) throw new Error('El frenchie no contiene el clip idle');
  let activeDogClip = dogIdle;
  activeDogClip.start(true);

  // Clips de animación de Eulalio
  for (const a of cat.animationGroups) a.stop();
  const catIdle = cat.animationGroups.find(a => a.name.toLowerCase().includes('idle'));
  if (!catIdle) throw new Error('Eulalio no contiene el clip idle');
  let activeCatClip = catIdle;
  activeCatClip.start(true);

  // Ruedas independientes identificables por regex
  const wheels = car.transformNodes.filter(n => /^Wheel_(-1|1)_(-0\.9|0\.92)$/.test(n.name));

  function tick(n = 1, dt = 1 / 60) {
    if (!Number.isInteger(n) || n < 1 || n > 1200) throw new RangeError('Cuadros: 1..1200');
    for (let i = 0; i < n; i++) {
      if (animated) time += dt;
      if (dogRoot.isEnabled()) {
        activeDogClip.goToFrame(activeDogClip.from + (time * 24) % Math.max(1, activeDogClip.to - activeDogClip.from));
      }
      if (catRoot.isEnabled()) {
        activeCatClip.goToFrame(activeCatClip.from + (time * 24) % Math.max(1, activeCatClip.to - activeCatClip.from));
      }
      scene.render();
    }
  }

  const info = () => ({
    lighting,
    view,
    actor,
    animated,
    time,
    meshes: scene.meshes.length,
    triangles: scene.getActiveIndices() / 3,
    clips: dog.animationGroups.map(a => a.name),
    clip: actor === 'eulalio' ? activeCatClip.name : activeDogClip.name,
    catClips: cat.animationGroups.map(a => a.name),
    wheels: wheels.length,
    grassInstances: matrices.length / 16,
    render: [engine.getRenderWidth(), engine.getRenderHeight()],
  });

  await scene.whenReadyAsync();

  Object.assign(window, {
    __art: (opts: { light?: typeof lighting; view?: typeof view; yaw?: number; animated?: boolean; time?: number; clip?: string; actor?: typeof actor }) => {
      if (opts.actor) updateActors(opts.actor);
      if (opts.clip) {
        if (actor === 'eulalio') {
          const next = cat.animationGroups.find(a => a.name === opts.clip);
          if (!next) throw new RangeError('Clip de Eulalio desconocido');
          activeCatClip.stop();
          activeCatClip = next;
          activeCatClip.start(true);
        } else {
          const next = dog.animationGroups.find(a => a.name === opts.clip);
          if (!next) throw new RangeError('Clip desconocido');
          activeDogClip.stop();
          activeDogClip = next;
          activeDogClip.start(true);
        }
        time = 0;
      }
      if (opts.light) light(opts.light);
      if (opts.view || opts.yaw !== undefined) framing(opts.view ?? view, opts.yaw ?? 0);
      if (opts.animated !== undefined) animated = opts.animated;
      if (opts.time !== undefined) time = opts.time;
      tick();
      return info();
    },
    __artInfo: info,
    __artTick: tick,
    __artFreeze: () => engine.stopRenderLoop(),
    __artScene: scene,
  });

  for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-view]')) {
    btn.onclick = () => framing(btn.dataset.view as typeof view);
  }
  for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-light]')) {
    btn.onclick = () => light(btn.dataset.light as typeof lighting);
  }
  for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-actor]')) {
    btn.onclick = () => updateActors(btn.dataset.actor as typeof actor);
  }
  document.querySelector<HTMLButtonElement>('#art-motion')!.onclick = e => {
    animated = !animated;
    (e.currentTarget as HTMLButtonElement).setAttribute('aria-pressed', String(animated));
  };

  status.textContent = 'Junked Metal 3D · Buggy industrial, Frenchie anatómico, Eulalio y entorno';
  engine.runRenderLoop(() => tick(1, Math.min(0.05, engine.getDeltaTime() / 1000)));
} catch (error) {
  status.textContent = 'No se pudo cargar la escena. Revisar los recursos GLB.';
  console.error(error);
}

addEventListener('resize', () => engine.resize());
addEventListener('pagehide', () => {
  engine.stopRenderLoop();
  scene.dispose();
  engine.dispose();
}, { once: true });
