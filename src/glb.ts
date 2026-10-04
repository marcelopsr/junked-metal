import * as B from "@babylonjs/core";
import { DEF, type Kind } from "./enemies";
import { flatten } from "./models";
import { M, pbr, shadows } from "./render";

// Bichos importados de GLB con esqueleto. La animación se hornea en una textura (VAT: una matriz por hueso y cuadro) y
// cada enemigo es una instancia que solo elige su cuadro: cientos animados con los mismos draw calls que uno.
// Los bichos de GLB (hoy la hormiga) no tienen modelo procedural: main.ts no crea ninguno hasta que la tarea "bichos"
// termina (bestiario, partida; en dev, lab y __sim esperan a __ready). Si un GLB no carga, queda un error claro en consola.
//
// Qué espera este sistema de un GLB (ejemplo: assets-src/ant/export_clean.py):
// - Una malla con esqueleto, triangulada, pesos normalizados y como máximo 4 huesos por vértice.
// - Acciones "walk" (ciclo: el último cuadro repite el primero; se hornean WALK cuadros) y "attack" (de ida, ATTACK
//   cuadros; opcional: sin ella ataca con la caminata). Exportar con export_force_sampling=False (solo los huesos animados).
// - Orientación: en Blender Z arriba y la cabeza hacia +Y. El punto más bajo de la pose de reposo se apoya en y = 0.
// - Escala: GLB[kind].scale (metros del juego por unidad de Blender). El colisionador sigue siendo DEF[kind].size.
// - Materiales: "Body" se pinta con DEF[kind].color (M.plastic; los jefes con clips usan el color del propio GLB), "Eye..." emisivo (M.glow con GLB[kind].eye o rojo),
//   cualquier otro M.plastic con su color base del GLB (p. ej. el saco de ácido de la escupidora).
// - Archivo: public/models/<file>.glb, comprimido con `gltf-transform optimize --compress quantize` (sin meshopt ni
//   draco: Babylon baja sus decodificadores de un CDN).
// clips (opcional; jefes con muchas acciones, hoy Felipe y Eulalio): se hornean TODAS las acciones del GLB (nombre = nombre de la
// acción en Blender, a 24 cuadros por segundo; ciclan idle, walk, run y rage, el resto queda en su último cuadro) y enemies.ts
// elige cuál mostrar con glbPlay. El valor son los m/s de suelo a los que el ciclo walk y el run no patinan (la zancada del modelo).
// atk/hit (opcional): el bicho dispara su propio ataque (enemies.ts) y la animación dura atk segundos; el golpe (escupida,
// arremetida) sale en la fracción hit de ella. Sin atk ataca al tocar al auto (touchCd), como la hormiga.
export const GLB: Partial<Record<Kind, { file: string; scale: number; eye?: string; atk?: number; hit?: number; clips?: [walk: number, run: number] }>> = {
  hormiga: { file: "ant", scale: 2 },
  escupidora: { file: "escupidora", scale: 1, eye: "#ffb020", atk: 0.83, hit: 0.65 }, // assets-src/escupidora
  escarabajo: { file: "escarabajo", scale: 1, eye: "#d0ff60", atk: 1, hit: 0.33 }, // assets-src/escarabajo
  perro: { file: "perro", scale: 1, eye: "#3a2418", clips: [2.3, 13] }, // assets-src/perro (Felipe)
  gato: { file: "gato", scale: 1.1, eye: "#a8ff3a", clips: [2.3, 15.4] }, // assets-src/gato (Eulalio)
};

const WALK = 10, ATTACK = 6; // cuadros horneados: walk 0..9, attack 10..15
const CLIP_FPS = 24, LOOPS = ["idle", "walk", "run", "rage"];
const clips = new Map<Kind, Record<string, { from: number; n: number; loop: boolean }>>();
const tpls = new Map<Kind, B.Mesh>();
export const glbTpl = (k: Kind) => tpls.get(k);
export const glbStats: Record<string, { loadMs: number; bakeMs: number; vatBytes: number; tris: number; bones: number }> = {};

// Precarga todo en segundo plano desde la portada (tarea "bichos" de main.ts); launch() espera lo que falte antes de la partida. No rechaza (el arranque sigue): cada falla o demora (8 s) va a la consola.
let settled = 0; // GLB ya resueltos (cargados o fallidos): progreso real de la pantalla de carga
export const glbProgress = () => settled / Object.keys(GLB).length;
export function loadGlbs(scene: B.Scene) {
  const all = Promise.all((Object.keys(GLB) as Kind[]).map((k) => load(scene, k).catch((e) => console.error(`GLB ${k}: no cargó models/${GLB[k]!.file}.glb; ese bicho no se puede crear`, e)).finally(() => settled++)));
  const late = new Promise<void>((r) => setTimeout(() => { const f = (Object.keys(GLB) as Kind[]).filter((k) => !tpls.has(k)); if (f.length) console.error("GLB: tardan más de 8 s, el juego arranca sin", f); r(); }, 8000));
  return Promise.race([all, late]);
}

async function load(scene: B.Scene, kind: Kind) {
  const o = GLB[kind]!, t0 = performance.now();
  await import("@babylonjs/loaders/glTF/2.0"); // el navegador lo baja una sola vez para todos los bichos
  const c = await B.LoadAssetContainerAsync(`models/${o.file}.glb`, scene); // relativa: el build usa base "./"
  c.addAllToScene();
  const t1 = performance.now();
  const sk = c.skeletons[0];
  // Las partes en crudo (sin el __root__ que convierte de mano derecha): la conversión va en la matriz fija
  const parts = c.meshes.filter((m): m is B.Mesh => m instanceof B.Mesh && m.getTotalVertices() > 0);
  for (const m of parts) { m.parent = null; m.position.setAll(0); m.rotationQuaternion = null; m.rotation.setAll(0); m.scaling.setAll(1); m.computeWorldMatrix(true); m.refreshBoundingInfo(); }
  const minY = Math.min(...parts.map((m) => m.getBoundingInfo().minimum.y));
  // Corrección fija horneada en cada matriz: z invertida (glTF es de mano derecha; la cabeza queda hacia +z), escala y apoyo en y = 0
  const fix = B.Matrix.Scaling(o.scale, o.scale, -o.scale).multiply(B.Matrix.Translation(0, -minY * o.scale, 0));
  // Pose de reposo de los nodos: los huesos que una acción no anima vuelven a ella antes de hornear la siguiente
  const rest = c.transformNodes.map((n) => [n, n.position.clone(), n.rotationQuaternion?.clone(), n.scaling.clone()] as const);
  const frames: Float32Array[] = [];
  const bake = (g: B.AnimationGroup, n: number, loop: boolean) => {
    for (const [nd, p, q, s] of rest) { nd.position.copyFrom(p); if (q) nd.rotationQuaternion!.copyFrom(q); nd.scaling.copyFrom(s); }
    g.start(false);
    for (let i = 0; i < n; i++) {
      g.goToFrame(g.from + (g.to - g.from) * i / (loop ? n : n - 1));
      sk.prepare(true);
      const m = sk.getTransformMatrices(parts[0]), out = new Float32Array(m.length);
      for (let b = 0; b < m.length / 16; b++) B.Matrix.FromArray(m, b * 16).multiply(fix).copyToArray(out, b * 16);
      frames.push(out);
    }
    g.stop();
  };
  for (const g of c.animationGroups) g.stop();
  if (o.clips) {
    const tab: Record<string, { from: number; n: number; loop: boolean }> = {};
    for (const g of c.animationGroups) {
      const fps = g.targetedAnimations[0].animation.framePerSecond, loop = LOOPS.includes(g.name), n = Math.max(2, Math.round((g.to - g.from) / fps * CLIP_FPS)) + (loop ? 0 : 1); // las de ida incluyen el último cuadro: el índice = el cuadro de Blender
      tab[g.name] = { from: frames.length, n, loop };
      bake(g, n, loop);
    }
    clips.set(kind, tab);
  } else {
    const walk = c.animationGroups.find((a) => a.name === "walk")!;
    bake(walk, WALK, true);
    bake(c.animationGroups.find((a) => a.name === "attack") ?? walk, ATTACK, false);
  }
  const data = new Float32Array(frames.length * frames[0].length);
  frames.forEach((f, i) => data.set(f, i * f.length));

  // Una sola malla (submallas por material) que se instancia; el esqueleto queda solo para que el shader declare los pesos
  const mesh = parts.length > 1 ? B.Mesh.MergeMeshes(parts, true, true, undefined, false, true)! : parts[0];
  mesh.flipFaces(); // la z invertida da vuelta el orden de los triángulos
  mesh.name = kind + "Glb";
  mesh.skeleton = sk;
  mesh.numBoneInfluencers = 4;
  const mat = (m: B.Material | null) => {
    if (m?.name.startsWith("Eye")) return M.glow(o.eye ?? "#ff3020");
    if (!m || (m.name === "Body" && !o.clips)) return M.plastic(DEF[kind].color);
    const p = m as B.PBRMaterial, hex = p.albedoColor.toGammaSpace().toHexString();
    if (o.clips) return pbr("fur" + hex + p.roughness, { color: hex, rough: p.roughness ?? 0.8 }); // jefes de pelo: mate, con el color y la rugosidad del GLB (Body incluido)
    if (p.alpha >= 1) return pbr("pl" + hex, { color: hex, rough: 0.32, coat: 0.5 }); // = M.plastic(hex)
    // translúcido (saco de ácido de la escupidora): conserva alpha y emisivo del GLB
    return pbr("pl" + hex + p.alpha, { color: hex, rough: 0.2, coat: 0.5, alpha: p.alpha, emissive: p.emissiveColor.toGammaSpace().toHexString() });
  };
  if (mesh.material instanceof B.MultiMaterial) mesh.material.subMaterials = mesh.material.subMaterials.map(mat);
  else mesh.material = mat(mesh.material);
  flatten(mesh); // colores de material a color de vértice: menos submallas = menos dibujos por pasada
  for (const n of c.transformNodes) if (!n.parent) n.dispose(); // __root__ y huesos ya no se dibujan ni se actualizan
  for (const m of c.materials) if (!scene.meshes.some((x) => x.material === m)) m.dispose();
  const vat = new B.BakedVertexAnimationManager(scene);
  vat.texture = new B.VertexAnimationBaker(scene, sk).textureFromBakedVertexData(data);
  mesh.bakedVertexAnimationManager = vat;
  mesh.registerInstancedBuffer("bakedVertexAnimationSettingsInstanced", 4);
  mesh.instancedBuffers.bakedVertexAnimationSettingsInstanced = new B.Vector4(0, WALK - 1, 0, 0);
  mesh.receiveShadows = true;
  mesh.position.y = -500; // la fuente queda escondida, como las plantillas de models.ts
  shadows.addShadowCaster(mesh);
  tpls.set(kind, mesh);
  glbStats[kind] = { loadMs: t1 - t0, bakeMs: performance.now() - t1, vatBytes: data.byteLength, tris: mesh.getTotalIndices() / 3, bones: sk.bones.length };
}

// Cada instancia lleva su propio vector (las instancias copian la referencia de la fuente). speed = 0: el cuadro lo
// decide el CPU con el desfase (z), así la cadencia sigue la velocidad real del bicho sin saltos de fase.
export function glbVat(node: B.InstancedMesh) {
  return (node.instancedBuffers.bakedVertexAnimationSettingsInstanced = new B.Vector4(0, WALK - 1, Math.random() * WALK, 0)) as B.Vector4;
}

// Jefes con clips: la instancia en el segundo t de la acción name (las cíclicas dan la vuelta, el resto queda en su último cuadro)
// ponytail: sin fundido entre acciones (VAT elige un solo cuadro); si el salto entre dos se nota, hornear cuadros de transición
export function glbPlay(v: B.Vector4, kind: Kind, name: string, t: number) {
  const c = clips.get(kind)![name], f = Math.max(0, t) * CLIP_FPS;
  v.set(c.from, c.from + c.n - 1, c.loop ? f % c.n : Math.min(c.n - 1, f), 0);
}

// Camina a cuadros según la velocidad; ataca (una vez, de ida) mientras attacking, o en el punto k (0..1) de su ataque
export function glbAnimate(v: B.Vector4, sp: number, dt: number, attacking: boolean, k = -1) {
  if (attacking || k >= 0) {
    if (v.x !== WALK) v.set(WALK, WALK + ATTACK - 1, 0, 0);
    v.z = k >= 0 ? Math.min(ATTACK - 1, k * (ATTACK - 1)) : Math.min(ATTACK - 1, v.z + dt * 16);
    return;
  }
  if (v.x !== 0) v.set(0, WALK - 1, 0, 0);
  v.z = (v.z + dt * Math.min(40, 4 + sp * 4.5)) % WALK;
}
