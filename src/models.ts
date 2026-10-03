import * as B from "@babylonjs/core";
import earcut from "earcut";
import { M, pbr, shadows } from "./render";

// Modelos procedurales. Las piezas se fusionan en una sola malla (con multi-material)
// y los enemigos se dibujan como instancias: cientos en pantalla con pocos draw calls.

let scene: B.Scene;
export const initModels = (s: B.Scene) => (scene = s);

type V3 = [number, number, number];
const v = (a: V3) => new B.Vector3(...a);

function place(m: B.Mesh, mat: B.Material, pos: V3, rot?: V3, scl?: V3) {
  m.material = mat;
  m.position = v(pos);
  if (rot) m.rotation = v(rot);
  if (scl) m.scaling = v(scl);
  return m;
}
export const box = (w: number, h: number, d: number, mat: B.Material, pos: V3, rot?: V3) =>
  place(B.MeshBuilder.CreateBox("p", { width: w, height: h, depth: d }, scene), mat, pos, rot);
export const cyl = (top: number, bot: number, h: number, mat: B.Material, pos: V3, rot?: V3, tess = 12) =>
  place(B.MeshBuilder.CreateCylinder("p", { diameterTop: top, diameterBottom: bot, height: h, tessellation: tess }, scene), mat, pos, rot);
export const sph = (d: number, mat: B.Material, pos: V3, scl?: V3, seg = 8) =>
  place(B.MeshBuilder.CreateSphere("p", { diameter: d, segments: seg }, scene), mat, pos, undefined, scl);
export const tor = (d: number, t: number, mat: B.Material, pos: V3, rot?: V3, tess = 16) =>
  place(B.MeshBuilder.CreateTorus("p", { diameter: d, thickness: t, tessellation: tess }, scene), mat, pos, rot);
export const tube = (path: V3[], r: number, mat: B.Material) => {
  const m = B.MeshBuilder.CreateTube("p", { path: path.map(v), radius: r, tessellation: 6 }, scene);
  m.material = mat;
  return m;
};

// Perfil lateral [adelante(z), alto(y)] extruido a lo ancho (x), centrado en x.
export function extrude(profile: [number, number][], width: number, mat: B.Material, pos: V3) {
  const m = B.MeshBuilder.ExtrudePolygon("p", { shape: profile.map(([z, y]) => new B.Vector3(z, 0, y)), depth: width }, scene, earcut);
  m.rotation.set(-Math.PI / 2, -Math.PI / 2, 0);
  m.bakeCurrentTransformIntoVertices();
  const c = m.getBoundingInfo().boundingBox.center;
  m.position.set(-c.x, 0, 0);
  m.bakeCurrentTransformIntoVertices();
  m.position = v(pos);
  m.material = mat;
  return m;
}

export function merge(name: string, parts: B.Mesh[]) {
  const m = B.Mesh.MergeMeshes(parts, true, true, undefined, false, true)!;
  m.name = name;
  m.receiveShadows = true;
  return m;
}

// ---------- Plantillas instanciables ----------
const templates = new Map<string, B.Mesh>();
export function template(name: string, build: () => B.Mesh[], scale = 1) {
  let t = templates.get(name);
  if (!t) {
    t = merge(name, build());
    if (scale !== 1) { t.scaling.setAll(scale); t.bakeCurrentTransformIntoVertices(); }
    t.position.y = -500; // la fuente queda escondida; se dibujan las instancias
    shadows.addShadowCaster(t);
    templates.set(name, t);
  }
  return t;
}

export function wheel(d: number, w: number, rim: string) {
  return merge("wheel", [
    cyl(d, d, w, M.rubber(), [0, 0, 0], [0, 0, Math.PI / 2], 16),
    tor(d * 0.98, w * 0.35, M.rubber(), [w * 0.3, 0, 0], [0, 0, Math.PI / 2], 16),
    tor(d * 0.98, w * 0.35, M.rubber(), [-w * 0.3, 0, 0], [0, 0, Math.PI / 2], 16),
    cyl(d * 0.6, d * 0.6, w * 1.04, M.metal(rim), [0, 0, 0], [0, 0, Math.PI / 2], 10),
    cyl(d * 0.2, d * 0.2, w * 1.12, M.metal(), [0, 0, 0], [0, 0, Math.PI / 2], 6),
  ]);
}

// ---------- Autos del jugador ----------
export type CarModel = { body: B.Mesh; wheels: { m: B.Mesh; front: boolean; r: number }[]; paint: B.PBRMaterial };
export type CarKind = "buggy" | "monster" | "formula";

// Paletas del taller
export const PAINTS = ["#d62828", "#1d4ed8", "#16a34a", "#f59e0b", "#e5e7eb", "#18181b", "#7c3aed", "#ea580c"];
export const RIMS = ["#ffc300", "#c0c0c0", "#18181b", "#ef4444"];

export function carModel(kind: CarKind, paintHex?: string, rimHex?: string): CarModel {
  const ws: { pos: V3; d: number; w: number }[] = [];
  let parts: B.Mesh[];
  let rim: string;
  const paint = pbr("paint" + kind + paintHex, { color: paintHex ?? { buggy: "#d62828", monster: "#1d4ed8", formula: "#16a34a" }[kind], rough: 0.22 });
  if (kind === "buggy") {
    rim = "#ffc300";
    parts = [
      box(1.05, 0.1, 2.1, M.matte("#2b2d31"), [0, 0.02, 0]),
      extrude([[-1.05, 0.05], [1.0, 0.05], [1.12, 0.2], [0.6, 0.36], [0.1, 0.42], [-0.45, 0.52], [-1.0, 0.46], [-1.1, 0.25]], 0.95, paint, [0, 0.05, 0]),
      sph(0.62, M.glass(), [0, 0.52, 0.12], [1, 0.55, 1.4]),
      tube([[-0.42, 0.45, -0.5], [-0.38, 0.95, -0.3], [0.38, 0.95, -0.3], [0.42, 0.45, -0.5]], 0.035, M.metal("#222")),
      tube([[-0.42, 0.45, 0.45], [-0.3, 0.8, 0.1], [0.3, 0.8, 0.1], [0.42, 0.45, 0.45]], 0.035, M.metal("#222")),
      box(1.35, 0.05, 0.38, M.plastic("#ffc300"), [0, 0.9, -1.0], [0.12, 0, 0]),
      box(0.05, 0.4, 0.15, M.matte("#222"), [0.4, 0.68, -0.95]),
      box(0.05, 0.4, 0.15, M.matte("#222"), [-0.4, 0.68, -0.95]),
      box(1.1, 0.14, 0.16, M.rubber(), [0, 0.12, 1.16]),
      sph(0.14, M.glow("#fff3b0"), [0.3, 0.3, 1.1]),
      sph(0.14, M.glow("#fff3b0"), [-0.3, 0.3, 1.1]),
      ...[[-0.55, 0.65], [0.55, 0.65], [-0.55, -0.7], [0.55, -0.7]].map(([x, z]) => cyl(0.1, 0.1, 0.45, M.metal("#ffc300"), [x, 0.3, z], [0, 0, x > 0 ? -0.5 : 0.5], 6)),
    ];
    for (const [x, z] of [[-0.72, 0.72], [0.72, 0.72], [-0.72, -0.72], [0.72, -0.72]]) ws.push({ pos: [x, 0, z], d: 0.8, w: 0.36 });
  } else if (kind === "monster") {
    rim = "#c0c0c0";
    parts = [
      box(1.0, 0.14, 1.9, M.matte("#2b2d31"), [0, 0.35, 0]),
      extrude([[-1.0, 0], [1.05, 0], [1.1, 0.3], [0.55, 0.35], [0.3, 0.75], [-0.6, 0.75], [-0.8, 0.4], [-1.05, 0.35]], 1.15, paint, [0, 0.45, 0]),
      box(1.0, 0.3, 0.05, M.glass(), [0, 0.95, 0.42], [-0.5, 0, 0]),
      box(1.3, 0.1, 0.3, M.metal(), [0, 0.5, 1.12]),
      box(1.3, 0.1, 0.3, M.metal(), [0, 0.5, -1.12]),
      ...[-0.36, -0.12, 0.12, 0.36].map((x) => sph(0.1, M.glow("#fffbe0"), [x, 1.23, 0.15])),
      box(1.0, 0.08, 0.2, M.matte("#222"), [0, 1.2, 0.15]),
      ...[[-0.45, 0.7], [0.45, 0.7], [-0.45, -0.7], [0.45, -0.7]].map(([x, z]) => cyl(0.14, 0.14, 0.6, M.metal("#ef4444"), [x, 0.2, z], [0, 0, x > 0 ? -0.6 : 0.6], 6)),
    ];
    for (const [x, z] of [[-0.8, 0.72], [0.8, 0.72], [-0.8, -0.72], [0.8, -0.72]]) ws.push({ pos: [x, -0.05, z], d: 1.15, w: 0.5 });
  } else {
    rim = "#e5e7eb";
    parts = [
      extrude([[-1.25, 0], [1.3, 0], [1.4, 0.08], [0.8, 0.18], [0.2, 0.25], [-0.2, 0.42], [-0.8, 0.38], [-1.2, 0.2]], 0.7, paint, [0, 0.0, 0]),
      box(1.4, 0.04, 0.3, M.plastic("#111"), [0, 0.02, 1.35]),
      box(1.2, 0.05, 0.3, paint, [0, 0.62, -1.15]),
      box(0.05, 0.3, 0.3, M.plastic("#111"), [0.55, 0.47, -1.15]),
      box(0.05, 0.3, 0.3, M.plastic("#111"), [-0.55, 0.47, -1.15]),
      sph(0.34, M.plastic("#fbbf24"), [0, 0.4, -0.05]),
      tube([[-0.25, 0.3, 0.2], [0, 0.48, 0.1], [0.25, 0.3, 0.2]], 0.03, M.metal("#222")),
      box(1.0, 0.18, 0.7, M.plastic("#111"), [0, 0.1, -0.2]),
    ];
    for (const [x, z] of [[-0.62, 0.9], [0.62, 0.9], [-0.66, -0.85], [0.66, -0.85]]) ws.push({ pos: [x, 0, z], d: z < 0 ? 0.72 : 0.6, w: z < 0 ? 0.42 : 0.3 });
  }
  // Antena, siempre: es un auto RC
  parts.push(cyl(0.03, 0.03, 1.3, M.metal("#111"), [0.38, 0.95, -0.7], undefined, 4), sph(0.12, M.plastic("#ff4d6d"), [0.38, 1.6, -0.7]));
  if (rimHex) rim = rimHex;
  const body = merge("carBody", parts);
  const wheels = ws.map((w) => {
    const m = wheel(w.d, w.w, rim);
    m.position = v(w.pos);
    m.parent = body;
    return { m, front: w.pos[2] > 0, r: w.d / 2 };
  });
  return { body, wheels, paint };
}

// ---------- Enemigos ----------

export function enemyTemplate(kind: string, scale = 1): B.Mesh {
  return template(kind, () => {
    if (kind === "hormiga") {
      const m = M.plastic("#2a150c");
      return [
        sph(0.75, m, [0, 0.3, -0.55], [1, 0.8, 1.25]),
        sph(0.42, m, [0, 0.3, 0]),
        sph(0.5, m, [0, 0.35, 0.45]),
        cyl(0.03, 0.03, 0.6, m, [0.12, 0.6, 0.75], [0.7, 0, 0.3], 4),
        cyl(0.03, 0.03, 0.6, m, [-0.12, 0.6, 0.75], [0.7, 0, -0.3], 4),
        sph(0.17, M.glow("#ff3020"), [0.13, 0.42, 0.66]),
        sph(0.17, M.glow("#ff3020"), [-0.13, 0.42, 0.66]),
      ];
    }
    if (kind === "escupidora") {
      const m = M.plastic("#5a160a");
      return [
        sph(1.0, pbr("acidSac", { color: "#9acd32", rough: 0.2, emissive: "#2a3a00", alpha: 0.9 }), [0, 0.45, -0.7], [1, 0.85, 1.2]),
        sph(0.45, m, [0, 0.35, 0]),
        sph(0.6, m, [0, 0.42, 0.5]),
        cyl(0.05, 0.12, 0.35, m, [0.12, 0.35, 0.85], [1.4, 0, 0], 5),
        cyl(0.05, 0.12, 0.35, m, [-0.12, 0.35, 0.85], [1.4, 0, 0], 5),
        cyl(0.03, 0.03, 0.7, m, [0.14, 0.75, 0.8], [0.6, 0, 0.3], 4),
        cyl(0.03, 0.03, 0.7, m, [-0.14, 0.75, 0.8], [0.6, 0, -0.3], 4),
        sph(0.19, M.glow("#ffb020"), [0.17, 0.55, 0.74]),
        sph(0.19, M.glow("#ffb020"), [-0.17, 0.55, 0.74]),
      ];
    }
    if (kind === "escarabajo" || kind === "rey") {
      const shell = kind === "rey" ? M.metal("#d4a017") : pbr("beetle", { color: "#2f7d4a", rough: 0.25, metal: 0.7 });
      const dark = M.plastic("#111");
      return [
        sph(1.6, shell, [0, 0.5, -0.15], [1, 0.6, 1.3], 10),
        box(0.03, 0.5, 1.9, dark, [0, 0.72, -0.15]),
        sph(0.75, dark, [0, 0.4, 0.95]),
        cyl(0.02, 0.2, 0.9, dark, [0, 0.75, 1.35], [1.0, 0, 0], 6),
        sph(0.22, M.glow("#d0ff60"), [0.24, 0.52, 1.24]),
        sph(0.22, M.glow("#d0ff60"), [-0.24, 0.52, 1.24]),
      ];
    }
    if (kind === "friccion") {
      return [
        extrude([[-0.75, 0], [0.75, 0], [0.8, 0.18], [0.3, 0.26], [0, 0.45], [-0.5, 0.45], [-0.75, 0.25]], 0.8, M.plastic("#f97316"), [0, 0.1, 0]),
        box(0.6, 0.2, 0.05, M.glass(), [0, 0.45, 0.1], [-0.6, 0, 0]),
        sph(0.12, M.glow("#fff4d0"), [0.3, 0.22, 0.78]),
        sph(0.12, M.glow("#fff4d0"), [-0.3, 0.22, 0.78]),
        ...[[-0.42, 0.45], [0.42, 0.45], [-0.42, -0.45], [0.42, -0.45]].map(([x, z]) => cyl(0.42, 0.42, 0.18, M.rubber(), [x, 0.12, z], [0, 0, Math.PI / 2], 10)),
      ];
    }
    if (kind === "robot") {
      const tin = M.metal("#b91c1c");
      return [
        box(0.9, 0.8, 0.7, tin, [0, 0.55, 0]),
        box(0.6, 0.45, 0.5, M.metal(), [0, 1.2, 0]),
        sph(0.14, M.glow("#facc15"), [0.14, 1.25, 0.26]),
        sph(0.14, M.glow("#facc15"), [-0.14, 1.25, 0.26]),
        cyl(0.02, 0.02, 0.35, M.metal(), [0, 1.6, 0], undefined, 4),
        box(0.18, 0.6, 0.18, tin, [0.56, 0.55, 0.1], [0.5, 0, 0]),
        box(0.18, 0.6, 0.18, tin, [-0.56, 0.55, 0.1], [0.5, 0, 0]),
        box(0.3, 0.2, 0.4, M.metal("#333"), [0.25, 0.1, 0]),
        box(0.3, 0.2, 0.4, M.metal("#333"), [-0.25, 0.1, 0]),
        cyl(0.08, 0.08, 0.35, M.metal("#d4a017"), [0, 0.6, -0.5], [Math.PI / 2, 0, 0], 6),
        box(0.5, 0.25, 0.05, M.metal("#d4a017"), [0, 0.6, -0.7]),
      ];
    }
    if (kind === "cortadora") {
      const red = M.plastic("#dc2626");
      return [
        cyl(5.6, 6, 1.2, M.metal("#9ca3af"), [0, 0.9, 0], undefined, 20),
        extrude([[-3, 0], [3, 0], [3, 0.8], [1.5, 1.6], [-2.5, 1.6], [-3, 1]], 4.6, red, [0, 1.3, 0]),
        cyl(1.6, 1.8, 1.6, M.metal("#374151"), [0, 3.6, 0.3], undefined, 12),
        box(3, 0.4, 0.6, M.matte("#111"), [0, 3.1, -2.6]),
        tube([[-1.8, 2.2, -2.8], [-1.8, 5, -5], [-1.8, 7.5, -6.2], [1.8, 7.5, -6.2], [1.8, 5, -5], [1.8, 2.2, -2.8]], 0.16, M.metal("#111")),
        ...[[-2.8, 2.4], [2.8, 2.4], [-2.8, -2.4], [2.8, -2.4]].map(([x, z]) => cyl(1.8, 1.8, 0.7, M.rubber(), [x, 0.9, z], [0, 0, Math.PI / 2], 16)),
        ...[[-3.2, 2.4], [3.2, 2.4], [-3.2, -2.4], [3.2, -2.4]].map(([x, z]) => cyl(0.9, 0.9, 0.15, M.metal("#fbbf24"), [x, 0.9, z], [0, 0, Math.PI / 2], 10)),
      ];
    }
    // perro: jefe final
    const fur = M.matte("#a0673a");
    const light = M.matte("#e8c9a0");
    return [
      box(3, 3, 6.5, fur, [0, 5, 0]),
      box(2.6, 1.2, 5, light, [0, 3.7, 0.2]),
      box(2.4, 2.4, 2.6, fur, [0, 7, 3.8]),
      box(1.5, 1.2, 1.6, light, [0, 6.4, 5.5]),
      sph(0.6, M.plastic("#111"), [0, 6.9, 6.3]),
      sph(0.35, M.glow("#ff2a1a"), [0.65, 7.8, 5.1]),
      sph(0.35, M.glow("#ff2a1a"), [-0.65, 7.8, 5.1]),
      box(0.5, 1.8, 1, M.matte("#6b3f1d"), [1.3, 7.6, 3.4], [0, 0, -0.4]),
      box(0.5, 1.8, 1, M.matte("#6b3f1d"), [-1.3, 7.6, 3.4], [0, 0, 0.4]),
      ...[[-1, 2.4], [1, 2.4], [-1, -2.4], [1, -2.4]].map(([x, z]) => box(1, 4, 1, fur, [x, 2, z])),
      ...[[-1, 2.6], [1, 2.6], [-1, -2.2], [1, -2.2]].map(([x, z]) => box(1.2, 0.5, 1.5, light, [x, 0.25, z])),
      box(0.5, 0.5, 2.8, fur, [0, 6.8, -4.2], [-0.6, 0, 0]),
      box(3.1, 0.5, 0.6, M.plastic("#dc2626"), [0, 6.6, 2.6]),
    ];
  }, scale);
}

// ---------- Patas articuladas (instancias animadas aparte) ----------
// Pata del lado derecho: cadera en el origen, fémur hacia arriba y afuera, tibia hasta el piso.
export const LEGS: Record<string, { hips: [number, number, number][]; len: number; r: number; color: string; scale: number }> = {
  hormiga: { hips: [[0.16, 0.3, -0.18], [0.16, 0.3, 0], [0.16, 0.3, 0.18]], len: 0.8, r: 0.035, color: "#2a150c", scale: 1 },
  escupidora: { hips: [[0.18, 0.34, -0.2], [0.18, 0.34, 0], [0.18, 0.34, 0.2]], len: 0.9, r: 0.04, color: "#5a160a", scale: 1 },
  escarabajo: { hips: [[0.5, 0.38, -0.5], [0.5, 0.38, 0], [0.5, 0.38, 0.5]], len: 1.0, r: 0.06, color: "#111111", scale: 1 },
  rey: { hips: [[0.5, 0.38, -0.5], [0.5, 0.38, 0], [0.5, 0.38, 0.5]], len: 1.0, r: 0.06, color: "#111111", scale: 3.5 },
};
export function legTemplate(kind: string) {
  const L = LEGS[kind];
  const hy = L.hips[0][1];
  return template("leg_" + kind, () => [
    tube([[0, 0, 0], [L.len * 0.45, L.len * 0.35, 0], [L.len * 0.95, -hy, 0]], L.r, M.plastic(L.color)),
    sph(L.r * 3, M.plastic(L.color), [L.len * 0.45, L.len * 0.35, 0], undefined, 4),
  ], L.scale);
}
