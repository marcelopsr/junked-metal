import * as B from "@babylonjs/core";
import type { CarKind } from "./models";
import { flatten } from "./models";
import { M, pbr } from "./render";

// Autos RC estáticos (oleada 2). Sin esqueleto: una malla multi-material por CarKind.
// Archivo: public/models/cars/<kind>.glb — ver docs/OLEADA2_CARS_BLENDER.md
export const CAR_GLB: Record<CarKind, { file: string }> = {
  buggy: { file: "buggy" },
  monster: { file: "monster" },
  formula: { file: "formula" },
  tanque: { file: "tanque" },
  carrera: { file: "carrera" },
  axel: { file: "axel" },
  helado: { file: "helado" },
  combi: { file: "combi" },
};

const tpls = new Map<CarKind, B.Mesh>();
let loadPromise: Promise<void> | undefined;
let failed = new Set<CarKind>();

export const carGlbTpl = (k: CarKind) => tpls.get(k);
export const carGlbFailed = (k: CarKind) => failed.has(k);
export const carGlbProgress = () => (tpls.size + failed.size) / Object.keys(CAR_GLB).length;

const remapMat = (name: string, paint: string, trim: string) => {
  if (name === "Paint") return pbr("carPaintTpl", { color: paint, rough: 0.4, coat: 0.8 });
  if (name === "Trim") return pbr("carTrimTpl", { color: trim, rough: 0.38, coat: 0.5 });
  if (name === "Glass") return M.glass();
  if (name === "Metal") return M.metal();
  if (name === "Rubber") return M.rubber();
  if (name === "Pilot") return M.plastic("#55642c");
  if (name === "Lamp") return M.glow("#fff3b0");
  return M.matte("#2b2d31");
};

function applyCarMats(mesh: B.Mesh, paint: string, trim: string) {
  const map = (m: B.Material | null | undefined) => {
    if (!m) return M.matte("#2b2d31");
    return remapMat(m.name, paint, trim);
  };
  if (mesh.material instanceof B.MultiMaterial) mesh.material.subMaterials = mesh.material.subMaterials.map(map);
  else mesh.material = map(mesh.material);
  flatten(mesh);
}

async function loadOne(scene: B.Scene, kind: CarKind) {
  const o = CAR_GLB[kind];
  try {
    await import("@babylonjs/loaders/glTF/2.0");
    const c = await B.LoadAssetContainerAsync(`models/cars/${o.file}.glb`, scene);
    c.addAllToScene();
    const parts = c.meshes.filter((m): m is B.Mesh => m instanceof B.Mesh && m.getTotalVertices() > 0);
    for (const m of parts) {
      m.parent = null;
      m.position.setAll(0);
      m.rotationQuaternion = null;
      m.rotation.setAll(0);
      m.scaling.setAll(1);
      m.computeWorldMatrix(true);
    }
    const mesh = parts.length > 1 ? B.Mesh.MergeMeshes(parts, true, true, undefined, false, true)! : parts[0];
    mesh.name = kind + "CarGlb";
    mesh.position.y = -500;
    mesh.isPickable = false;
    mesh.setEnabled(false);
    tpls.set(kind, mesh);
    for (const m of c.meshes) if (m !== mesh && !m.parent) m.dispose();
    for (const mat of c.materials) if (!scene.meshes.some((x) => x.material === mat)) mat.dispose();
  } catch (e) {
    failed.add(kind);
    console.error(`CAR GLB ${kind}: no cargó models/cars/${o.file}.glb; carModel usa procedural`, e);
  }
}

export function loadCarGlbs(scene: B.Scene) {
  if (!loadPromise) {
    const kinds = Object.keys(CAR_GLB) as CarKind[];
    loadPromise = Promise.all(kinds.map((k) => loadOne(scene, k))).then(() => {});
  }
  return loadPromise;
}

/** Clon del hull con pintura del taller (la plantilla queda en y=-500). */
export function carGlbHull(kind: CarKind, paint: string, trim: string): B.Mesh | null {
  const t = tpls.get(kind);
  if (!t) return null;
  const m = t.clone(kind + "Hull", null)!;
  m.setEnabled(true);
  m.position.y = 0;
  applyCarMats(m, paint, trim);
  return m;
}
