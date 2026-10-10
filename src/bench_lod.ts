// Junked Metal — Benchmark Cuantitativo de Horda y LODs (Supervivencia)
import * as B from '@babylonjs/core';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import '@babylonjs/loaders/glTF/index.js';
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/700.css';
import './art_lab.css';

const canvas = document.querySelector<HTMLCanvasElement>('#bench-canvas')!;
const status = document.querySelector<HTMLElement>('#bench-status')!;
const mobile = matchMedia('(pointer: coarse)').matches;
const engine = new B.Engine(canvas, true, { stencil: false }, true);
engine.setHardwareScalingLevel(1 / Math.min(devicePixelRatio, 2));

const scene = new B.Scene(engine);
const camera = new ArcRotateCamera('bench-camera', Math.PI / 2 + 0.35, 1.15, 28, new B.Vector3(0, 0.8, 0), scene);
camera.minZ = 0.1;
camera.maxZ = 180;
camera.fov = 0.65;
camera.attachControl(canvas, true);

const hemi = new B.HemisphericLight('ambient', new B.Vector3(0, 1, 0), scene);
hemi.intensity = 0.75;
hemi.diffuse = B.Color3.FromHexString('#8cb4df');

const dir = new B.DirectionalLight('sun', new B.Vector3(-0.4, -1, -0.3).normalize(), scene);
dir.intensity = 1.2;
dir.diffuse = B.Color3.FromHexString('#fff0cb');

// Suelo simple de pruebas
const ground = B.MeshBuilder.CreateGround('ground', { width: 120, height: 120 }, scene);
const groundMat = new B.StandardMaterial('groundMat', scene);
groundMat.diffuseColor = B.Color3.FromHexString('#3b2b1e');
ground.material = groundMat;

type Scenario = 'lod0_20' | 'lod1_20' | 'lod1_50' | 'lod1_100';
let activeScenario: Scenario = 'lod1_50';
let animated = true;
let time = 0;

interface SpawnedEntity {
  root: B.TransformNode;
  animationGroup?: B.AnimationGroup;
}

const entities: SpawnedEntity[] = [];

try {
  status.textContent = 'Cargando contenedores LOD0 y LOD1…';
  const [lod0Asset, lod1Asset] = await Promise.all([
    B.LoadAssetContainerAsync('assets-src/cinematic-3d/frenchie.glb', scene),
    B.LoadAssetContainerAsync('assets-src/cinematic-3d/gemini-performance/frenchie_lod1.glb', scene),
  ]);

  function clearEntities() {
    for (const e of entities) {
      if (e.animationGroup) e.animationGroup.stop();
      e.root.dispose(false, true);
    }
    entities.length = 0;
  }

  function setScenario(scen: Scenario) {
    activeScenario = scen;
    clearEntities();

    const isLOD1 = scen.startsWith('lod1');
    const count = scen.endsWith('20') ? 20 : scen.endsWith('50') ? 50 : 100;
    const asset = isLOD1 ? lod1Asset : lod0Asset;

    const cols = Math.ceil(Math.sqrt(count));
    const spacing = 2.4;
    const offsetX = ((cols - 1) * spacing) / 2;
    const offsetZ = ((Math.ceil(count / cols) - 1) * spacing) / 2;

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * spacing - offsetX;
      const z = row * spacing - offsetZ;

      const entries = asset.instantiateModelsToScene(name => `${name}_${i}`, false);
      const root = new B.TransformNode(`entity_${i}`, scene);
      for (const node of entries.rootNodes) node.parent = root;

      root.scaling.setAll(0.25);
      root.position.set(x, 0.05, z);
      root.rotation.y = Math.PI;

      const runAnim = entries.animationGroups.find(a => a.name.toLowerCase().includes('run')) ?? entries.animationGroups[0];
      if (runAnim) {
        runAnim.start(true);
        runAnim.goToFrame(runAnim.from + (i * 3) % (runAnim.to - runAnim.from));
      }

      entities.push({ root, animationGroup: runAnim });
    }

    for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-scenario]')) {
      btn.setAttribute('aria-pressed', String(btn.dataset.scenario === scen));
    }
    status.textContent = `Horda activa: ${count} unidades (${isLOD1 ? 'LOD1 Optimizado' : 'LOD0 Héroe'}) · ${scene.getActiveIndices() / 3} triángulos`;
  }

  setScenario('lod1_50');

  function tick(n = 1, dt = 1 / 60) {
    for (let i = 0; i < n; i++) {
      if (animated) time += dt;
      scene.render();
    }
  }

  const info = () => ({
    scenario: activeScenario,
    count: entities.length,
    triangles: scene.getActiveIndices() / 3,
    meshes: scene.meshes.length,
    render: [engine.getRenderWidth(), engine.getRenderHeight()],
  });

  await scene.whenReadyAsync();

  Object.assign(window, {
    __bench: (scen: Scenario) => {
      setScenario(scen);
      tick(2);
      return info();
    },
    __benchInfo: info,
    __benchTick: tick,
    __benchFreeze: () => engine.stopRenderLoop(),
    __benchScene: scene,
  });

  for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-scenario]')) {
    btn.onclick = () => setScenario(btn.dataset.scenario as Scenario);
  }

  document.querySelector<HTMLButtonElement>('#bench-motion')!.onclick = e => {
    animated = !animated;
    (e.currentTarget as HTMLButtonElement).setAttribute('aria-pressed', String(animated));
  };

  engine.runRenderLoop(() => tick(1, Math.min(0.05, engine.getDeltaTime() / 1000)));
} catch (error) {
  status.textContent = 'Error al cargar los modelos de benchmark.';
  console.error(error);
}

addEventListener('resize', () => engine.resize());
addEventListener('pagehide', () => {
  engine.stopRenderLoop();
  scene.dispose();
  engine.dispose();
}, { once: true });
