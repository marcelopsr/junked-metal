import * as B from '@babylonjs/core';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import '@babylonjs/loaders/glTF/index.js';
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/700.css';

const canvas = document.querySelector('#view'), status = document.querySelector('#status');
const engine = new B.Engine(canvas, true, { preserveDrawingBuffer: true, antialias: true }, true);
const scene = new B.Scene(engine);
scene.clearColor = B.Color4.FromHexString('#292c28ff');
const camera = new ArcRotateCamera('camera', -Math.PI / 2, 1.12, 49, new B.Vector3(0, 12, 0), scene);
camera.attachControl(canvas, true); camera.lowerRadiusLimit = 24; camera.upperRadiusLimit = 110; camera.wheelPrecision = 30;
const fitCamera = () => { camera.setTarget(new B.Vector3(0, 12, 0)); camera.radius = Math.max(49, 63 / (engine.getRenderWidth() / engine.getRenderHeight())); };
const ambient = new B.HemisphericLight('ambient', B.Vector3.Up(), scene); ambient.intensity = 0.85;
const sun = new B.DirectionalLight('sun', new B.Vector3(-0.45, -1, -0.35), scene); sun.position.set(20, 35, 24); sun.intensity = 2.1;
const shadows = new B.ShadowGenerator(1024, sun); shadows.usePercentageCloserFiltering = true;
const floor = B.MeshBuilder.CreateGround('floor', { width: 100, height: 70 }, scene);
const groundMat = new B.PBRMaterial('earth', scene); groundMat.albedoColor = B.Color3.FromHexString('#68543a'); groundMat.roughness = 0.96; floor.material = groundMat; floor.position.y = -0.2; floor.receiveShadows = true;
const tireMat = new B.PBRMaterial('currentFoldedRubber', scene); tireMat.albedoColor = B.Color3.FromHexString('#0c0d10'); tireMat.roughness = 0.9;

// Reproduce el perfil de src/models.ts tor(16, 5.5, …) y la pila de world.ts.
function ring(name, major, minor, around, section) {
  const positions = [], indices = [];
  for (let i = 0; i <= around; i++) for (let j = 0; j <= section; j++) {
    const a = Math.PI * 2 * i / around, b = Math.PI * 2 * j / section;
    positions.push((major + minor * Math.cos(b)) * Math.cos(a), minor * Math.sin(b), (major + minor * Math.cos(b)) * Math.sin(a));
    if (i < around && j < section) { const k = i * (section + 1) + j; indices.push(k, k + section + 1, k + 1, k + 1, k + section + 1, k + section + 2); }
  }
  const normals = []; B.VertexData.ComputeNormals(positions, indices, normals);
  const data = new B.VertexData(); data.positions = positions; data.indices = indices; data.normals = normals;
  const mesh = new B.Mesh(name, scene); data.applyToMesh(mesh); mesh.material = tireMat; return mesh;
}
for (let i = 0; i < 3; i++) { const m = ring('actual-tire-' + i, 8, 2.75, 40, 10); m.position.set(-14, 2.75 + i * 5.3, 0); shadows.addShadowCaster(m); }

try {
  const container = await B.LoadAssetContainerAsync('../../smoothvoxels/v1/exports/folded-stack.glb', scene);
  container.addAllToScene();
  const voxel = new B.TransformNode('smoothVoxelCandidate', scene);
  for (const node of container.rootNodes) node.parent = voxel;
  for (const mesh of container.meshes) if (mesh.getTotalVertices()) shadows.addShadowCaster(mesh);
  voxel.rotation.x = Math.PI / 2;
  voxel.position.set(14, 8, -13.25); voxel.scaling.setAll(10);
  await scene.whenReadyAsync();
  fitCamera();
  status.textContent = 'Ambas pilas cargadas · vista comparativa';
  document.querySelector('#reset').onclick = () => { camera.alpha = -Math.PI / 2; camera.beta = 1.12; fitCamera(); };
  engine.runRenderLoop(() => scene.render());
} catch (error) { status.textContent = 'No se pudo cargar el GLB voxel.'; console.error(error); }
addEventListener('resize', () => { engine.resize(); fitCamera(); });
addEventListener('pagehide', () => { scene.dispose(); engine.dispose(); }, { once: true });
