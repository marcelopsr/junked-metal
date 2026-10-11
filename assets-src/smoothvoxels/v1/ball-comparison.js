import * as B from '@babylonjs/core';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import '@babylonjs/loaders/glTF/index.js';
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/700.css';

const canvas = document.querySelector('#view');
const status = document.querySelector('#status');
const variantSelect = document.querySelector('#variant');
const proposalLabel = document.querySelector('#proposalLabel');
const resetBtn = document.querySelector('#reset');

const engine = new B.Engine(canvas, true, { preserveDrawingBuffer: true, antialias: true }, true);
const scene = new B.Scene(engine);
scene.clearColor = B.Color4.FromHexString('#252825ff');

// Cámara centrada entre ambos modelos a la misma altura
const camera = new ArcRotateCamera('camera', -Math.PI / 2, 1.14, 18, new B.Vector3(0, 2.5, 0), scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 6;
camera.upperRadiusLimit = 40;
camera.wheelPrecision = 30;

const ambient = new B.HemisphericLight('ambient', B.Vector3.Up(), scene);
ambient.intensity = 0.9;

const sun = new B.DirectionalLight('sun', new B.Vector3(-0.45, -1, -0.35), scene);
sun.position.set(16, 32, 20);
sun.intensity = 2.2;

const shadows = new B.ShadowGenerator(1024, sun);
shadows.usePercentageCloserFiltering = true;

// Suelo del patio
const floor = B.MeshBuilder.CreateGround('floor', { width: 40, height: 30 }, scene);
const groundMat = new B.PBRMaterial('ground', scene);
groundMat.albedoColor = B.Color3.FromHexString('#68543a');
groundMat.roughness = 0.96;
floor.material = groundMat;
floor.receiveShadows = true;
floor.position.y = 0;

// 1. REPRODUCCIÓN EXACTA DEL ORIGINAL DE SRC/WORLD.TS:890 (diámetro = 5, y = 2.5)
function createOriginalBall() {
  const ballTex = new B.DynamicTexture('ballOrigTex', 256, scene, true);
  const ctx = ballTex.getContext();
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#111111';
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 4; j++) {
      if ((i + j) % 2) {
        ctx.beginPath();
        ctx.arc(i * 32 + 16, j * 64 + 32, 12, 0, 7);
        ctx.fill();
      }
    }
  }
  ballTex.update();

  const ballMat = new B.PBRMaterial('origBallMat', scene);
  ballMat.albedoColor = B.Color3.White();
  ballMat.albedoTexture = ballTex;
  ballMat.roughness = 0.4;

  const mesh = B.MeshBuilder.CreateSphere('origBall', { diameter: 5, segments: 16 }, scene);
  mesh.material = ballMat;
  mesh.position.set(-3.8, 2.5, 0);
  mesh.receiveShadows = true;
  shadows.addShadowCaster(mesh);
  return mesh;
}

const origBall = createOriginalBall();

// 2. CANDIDATOS SMOOTHPIXEL (GLB) - exactamente a la misma escala (diámetro = 5)
const variants = {
  football: { file: './exports/football-ball.glb', label: 'PROPUESTA · FÚTBOL SMOOTHPIXEL' },
  tennis: { file: './exports/tennis-ball.glb', label: 'PROPUESTA · TENIS SMOOTHPIXEL' },
  beach: { file: './exports/beach-ball.glb', label: 'PROPUESTA · PLAYA SMOOTHPIXEL' }
};

const loadedRoots = new Map();

async function loadVariant(key) {
  if (loadedRoots.has(key)) return loadedRoots.get(key);
  const info = variants[key];
  const container = await B.LoadAssetContainerAsync(info.file, scene);
  container.addAllToScene();

  const root = new B.TransformNode('root_' + key, scene);
  // Escala para igualar diámetro = 5 exacto (el vox original tiene radio 43 * step 0.025 = 1.075 -> diámetro 2.15 -> escala = 5 / 2.15 = 2.325)
  root.scaling.setAll(2.325);
  root.position.set(3.8, 0, 0);

  for (const node of container.rootNodes) node.parent = root;
  for (const mesh of container.meshes) {
    if (mesh.getTotalVertices()) {
      shadows.addShadowCaster(mesh);
      mesh.receiveShadows = true;
    }
  }

  loadedRoots.set(key, root);
  return root;
}

async function setVariant(key) {
  status.textContent = `Cargando variante ${key}…`;
  for (const [k, r] of loadedRoots) {
    r.setEnabled(false);
  }

  const root = await loadVariant(key);
  root.setEnabled(true);
  proposalLabel.textContent = variants[key].label;
  status.textContent = 'Comparación lista · Arrastre para girar, rueda para zoom';
}

variantSelect.onchange = () => {
  setVariant(variantSelect.value);
};

resetBtn.onclick = () => {
  camera.alpha = -Math.PI / 2;
  camera.beta = 1.14;
  camera.radius = 18;
  camera.setTarget(new B.Vector3(0, 2.5, 0));
};

try {
  await setVariant('football');
  await scene.whenReadyAsync();
  engine.runRenderLoop(() => scene.render());
} catch (err) {
  status.textContent = 'Error al cargar modelos.';
  console.error(err);
}

addEventListener('resize', () => engine.resize());
addEventListener('pagehide', () => {
  scene.dispose();
  engine.dispose();
}, { once: true });
