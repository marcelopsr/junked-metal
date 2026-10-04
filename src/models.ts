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
  place(B.MeshBuilder.CreateCylinder("p", { diameterTop: top, diameterBottom: bot, height: h, tessellation: tess <= 6 ? tess : Math.min(32, tess * 2) }, scene), mat, pos, rot); // calidad: el doble de lados salvo formas hexagonales a propósito
export const sph = (d: number, mat: B.Material, pos: V3, scl?: V3, seg = 8) =>
  place(B.MeshBuilder.CreateSphere("p", { diameter: d, segments: seg <= 4 ? seg : Math.min(24, seg * 2) }, scene), mat, pos, undefined, scl);
export const tor = (d: number, t: number, mat: B.Material, pos: V3, rot?: V3, tess = 14) =>
  place(B.MeshBuilder.CreateTorus("p", { diameter: d, thickness: t, tessellation: tess <= 6 ? tess : Math.min(40, tess * 2) }, scene), mat, pos, rot);
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
    cyl(d * 0.62, d * 0.62, w * 1.04, M.metal(rim), [0, 0, 0], [0, 0, Math.PI / 2], 20),
    cyl(d * 0.48, d * 0.48, w * 1.08, M.matte("#1d2026"), [0, 0, 0], [0, 0, Math.PI / 2], 20), // fondo oscuro de la llanta
    ...[0, 1, 2, 3, 4].map((k) => box(w * 1.1, d * 0.46, d * 0.07, M.metal(rim), [0, 0, 0], [(k * Math.PI * 2) / 5, 0, 0])), // 5 rayos
    cyl(d * 0.2, d * 0.2, w * 1.14, M.metal(), [0, 0, 0], [0, 0, Math.PI / 2], 14),
  ]);
}

// ---------- Autos del jugador ----------
export type CarModel = { body: B.Mesh; wheels: { m: B.Mesh; front: boolean; r: number }[]; paint: B.PBRMaterial };
export type CarKind = "buggy" | "monster" | "formula" | "tanque" | "carrera" | "axel" | "helado" | "combi";

// Paletas del taller
export const PAINTS = ["#d62828", "#1d4ed8", "#16a34a", "#f59e0b", "#e5e7eb", "#18181b", "#7c3aed", "#ea580c"];
export const RIMS = ["#ffc300", "#c0c0c0", "#18181b", "#ef4444"];

// Piezas visuales del garaje: [nombre, precio en tornillos]. La primera opción de cada ranura viene de fábrica.
export const PARTS = {
  wing: { name: "Alerón", opts: { serie: ["De serie", 0], alto: ["Alerón alto", 60], doble: ["Biplano", 110] } },
  decal: { name: "Calcos", opts: { nada: ["Sin calcos", 0], numero: ["Número", 40], rayo: ["Rayo", 60], damero: ["Damero", 90] } },
  lamp: { name: "Faro", opts: { calido: ["Cálido", 0], ambar: ["Ámbar", 50], cian: ["Cian", 80], violeta: ["Violeta", 120] } },
  exhaust: { name: "Escape", opts: { nada: ["Sin escape", 0], doble: ["Doble caño", 60], chimenea: ["Chimeneas", 100] } },
} as const satisfies Record<string, { name: string; opts: Record<string, readonly [string, number]> }>;
export type Slot = keyof typeof PARTS;
// Faro: [emisivo de las ópticas, luz del SpotLight]. Nada rojo ni verde (código de amenaza y disparos propios).
const LAMPS: Record<string, [string, string]> = { calido: ["#fff3b0", "#ffe9c2"], ambar: ["#ffb347", "#ffc77a"], cian: ["#9be7ff", "#bdefff"], violeta: ["#c9a7ff", "#d8c2ff"] };
export type CarOpts = { paint?: string; rim?: string; wing?: string; decal?: string; lamp?: string; exhaust?: string; pilot?: string; sticker?: string };

// Calco propio del capó (editor del garaje): grilla DECAL_N × DECAL_N, un carácter por celda: "0" = transparente, "1".."8" = DECAL_PAL[n-1].
// Colores de la paleta de UI (docs/ART_DIRECTION.md); sin el rojo de amenaza.
export const DECAL_N = 16;
export const DECAL_PAL = ["#0b0d0a", "#b9d3a4", "#5f7355", "#8dff6a", "#6fb3c4", "#e0a030", "#9a6fb5", "#c8d84a"];
export const DECAL_BLANK = "0".repeat(DECAL_N * DECAL_N);
export const validDecal = (s: unknown): s is string => typeof s === "string" && /^[0-8]+$/.test(s) && s.length === DECAL_N * DECAL_N;
// Dónde va el calco en cada auto: [y, z, lado, cabeceo], sobre la superficie superior que más ve la cámara de partida (detrás y arriba, ~40°).
// Buggy y Fórmula: el plato del alerón de serie. Monster: el techo de la cabina. Tanque: la cubierta trasera. Autito: la cola, que mira a la cámara.
// Con un alerón elegido (alto/doble) el calco va sobre su plato, porque tapa la cubierta o la cola (ver carModel); el techo del Monster no lo tapa.
const SPOT: Record<CarKind, [number, number, number, number]> = {
  buggy: [0.933, -1.0, 0.34, 0.12], monster: [1.212, -0.2, 0.54, 0], formula: [0.653, -1.15, 0.28, 0], tanque: [0.512, -0.8, 0.34, 0], carrera: [0.352, -0.72, 0.4, -0.38], axel: [0.66, -0.3, 0.34, 0], helado: [0.97, 0.55, 0.34, 0], combi: [1.04, -0.1, 0.4, 0],
};

// Dónde va cada cosa en cada auto: deck = [y, z] del alerón, side = calco lateral [x, y, z], exh = [y, z] del escape,
// seat = cadera del piloto + escala, lamps = ópticas [x, y, z, diámetro] (se espejan en x salvo x = 0).
const ANCH: Record<CarKind, { deck: [number, number]; side: V3; exh: [number, number]; seat: [number, number, number, number]; lamps: [number, number, number, number][]; paint: string; rim: string }> = {
  buggy: { deck: [0.62, -0.98], side: [0.485, 0.3, -0.35], exh: [0.25, -1.1], seat: [0, 0.38, 0.02, 0.8], lamps: [[0.3, 0.3, 1.1, 0.14]], paint: "#d62828", rim: "#ffc300" },
  monster: { deck: [0.8, -0.95], side: [0.585, 0.68, -0.15], exh: [0.55, -1.05], seat: [0, 0.78, -0.12, 0.9], lamps: [[0.36, 1.23, 0.15, 0.1], [0.12, 1.23, 0.15, 0.1]], paint: "#1d4ed8", rim: "#c0c0c0" },
  formula: { deck: [0.32, -1.15], side: [0.355, 0.13, 0.55], exh: [0.15, -1.25], seat: [0, 0.2, -0.05, 0.75], lamps: [[0.18, 0.08, 1.3, 0.08]], paint: "#16a34a", rim: "#e5e7eb" },
  tanque: { deck: [0.5, -0.92], side: [0.56, 0.3, 0.15], exh: [0.32, -1.02], seat: [0, 0.8, -0.2, 0.85], lamps: [[0.38, 0.42, 1.02, 0.12]], paint: "#6b7a3a", rim: "#3a3f2a" },
  carrera: { deck: [0.36, -0.82], side: [0.405, 0.2, 0.35], exh: [0.14, -1.02], seat: [0, 0.26, -0.3, 0.75], lamps: [[0.25, 0.2, 1.0, 0.12]], paint: "#2a9d8f", rim: "#e5e7eb" },
  axel: { deck: [0.6, -0.5], side: [0.46, 0.15, 0], exh: [0.1, -0.85], seat: [0, 0.2, 0, 0.8], lamps: [[0.28, 0.3, 0.7, 0.16]], paint: "#e8e4d4", rim: "#b8321f" },
  helado: { deck: [0.95, -1.0], side: [0.56, 0.5, -0.4], exh: [0.2, -1.1], seat: [0, 0.5, 0.72, 0.7], lamps: [[0.4, 0.4, 1.22, 0.14]], paint: "#f08dbd", rim: "#f3ead2" },
  combi: { deck: [1.0, -0.95], side: [0.54, 0.55, -0.1], exh: [0.2, -1.15], seat: [0, 0.42, 0.45, 0.7], lamps: [[0.4, 0.4, 1.2, 0.18]], paint: "#4cc3c9", rim: "#e5e7eb" },
};

// Tamaño [ancho, alto, largo] de cada auto (el mismo de CARS en car.ts; se repite aquí para no crear un import circular)
const CARS_SIZE: Record<CarKind, [number, number, number]> = { buggy: [1.3, 0.7, 2.3], monster: [1.8, 1.1, 2.4], formula: [1.3, 0.55, 2.8], tanque: [1.75, 0.9, 2.4], carrera: [1.1, 0.5, 2.1], axel: [1.9, 1.0, 1.7], helado: [1.3, 0.95, 2.4], combi: [1.45, 1.0, 2.4] };
export function carModel(kind: CarKind, o: CarOpts = {}): CarModel {
  const A = ANCH[kind];
  const ws: { pos: V3; d: number; w: number; steer?: boolean }[] = [];
  let parts: B.Mesh[];
  let stock: B.Mesh[] = []; // alerón de serie (se reemplaza si se elige otro)
  const paint = pbr("paint" + kind + o.paint, { color: o.paint ?? A.paint, rough: 0.4, coat: 0.8 });
  if (kind === "buggy") {
    parts = [
      box(1.05, 0.1, 2.1, M.matte("#2b2d31"), [0, 0.02, 0]),
      extrude([[-1.05, 0.05], [1.0, 0.05], [1.12, 0.2], [0.6, 0.36], [0.1, 0.42], [-0.45, 0.52], [-1.0, 0.46], [-1.1, 0.25]], 0.95, paint, [0, 0.05, 0]),
      sph(0.62, M.glass(), [0, 0.52, 0.12], [1, 0.55, 1.4]),
      tube([[-0.42, 0.45, -0.5], [-0.38, 0.95, -0.3], [0.38, 0.95, -0.3], [0.42, 0.45, -0.5]], 0.035, M.metal("#222")),
      tube([[-0.42, 0.45, 0.45], [-0.3, 0.8, 0.1], [0.3, 0.8, 0.1], [0.42, 0.45, 0.45]], 0.035, M.metal("#222")),
      box(1.1, 0.14, 0.16, M.rubber(), [0, 0.12, 1.16]),
      ...[[-0.55, 0.65], [0.55, 0.65], [-0.55, -0.7], [0.55, -0.7]].map(([x, z]) => cyl(0.1, 0.1, 0.45, M.metal("#ffc300"), [x, 0.3, z], [0, 0, x > 0 ? -0.5 : 0.5], 6)),
    ];
    stock = [
      box(1.35, 0.05, 0.38, M.plastic("#ffc300"), [0, 0.9, -1.0], [0.12, 0, 0]),
      box(0.05, 0.4, 0.15, M.matte("#222"), [0.4, 0.68, -0.95]),
      box(0.05, 0.4, 0.15, M.matte("#222"), [-0.4, 0.68, -0.95]),
    ];
    for (const [x, z] of [[-0.72, 0.72], [0.72, 0.72], [-0.72, -0.72], [0.72, -0.72]]) ws.push({ pos: [x, 0, z], d: 0.8, w: 0.36 });
  } else if (kind === "monster") {
    parts = [
      box(1.0, 0.14, 1.9, M.matte("#2b2d31"), [0, 0.35, 0]),
      extrude([[-1.0, 0], [1.05, 0], [1.1, 0.3], [0.55, 0.35], [0.3, 0.75], [-0.6, 0.75], [-0.8, 0.4], [-1.05, 0.35]], 1.15, paint, [0, 0.45, 0]),
      box(1.0, 0.3, 0.05, M.glass(), [0, 0.95, 0.42], [-0.5, 0, 0]),
      box(1.3, 0.1, 0.3, M.metal(), [0, 0.5, 1.12]),
      box(1.3, 0.1, 0.3, M.metal(), [0, 0.5, -1.12]),
      box(1.0, 0.08, 0.2, M.matte("#222"), [0, 1.2, 0.15]),
      ...[[-0.45, 0.7], [0.45, 0.7], [-0.45, -0.7], [0.45, -0.7]].map(([x, z]) => cyl(0.14, 0.14, 0.6, M.metal("#ef4444"), [x, 0.2, z], [0, 0, x > 0 ? -0.6 : 0.6], 6)),
    ];
    for (const [x, z] of [[-0.8, 0.72], [0.8, 0.72], [-0.8, -0.72], [0.8, -0.72]]) ws.push({ pos: [x, -0.05, z], d: 1.15, w: 0.5 });
  } else if (kind === "formula") {
    parts = [
      extrude([[-1.25, 0], [1.3, 0], [1.4, 0.08], [0.8, 0.18], [0.2, 0.25], [-0.2, 0.42], [-0.8, 0.38], [-1.2, 0.2]], 0.7, paint, [0, 0.0, 0]),
      box(1.4, 0.04, 0.3, M.plastic("#111"), [0, 0.02, 1.35]),
      tube([[-0.25, 0.3, 0.2], [0, 0.48, 0.1], [0.25, 0.3, 0.2]], 0.03, M.metal("#222")),
      box(1.0, 0.18, 0.7, M.plastic("#111"), [0, 0.1, -0.2]),
    ];
    stock = [
      box(1.2, 0.05, 0.3, paint, [0, 0.62, -1.15]),
      box(0.05, 0.3, 0.3, M.plastic("#111"), [0.55, 0.47, -1.15]),
      box(0.05, 0.3, 0.3, M.plastic("#111"), [-0.55, 0.47, -1.15]),
    ];
    for (const [x, z] of [[-0.62, 0.9], [0.62, 0.9], [-0.66, -0.85], [0.66, -0.85]]) ws.push({ pos: [x, 0, z], d: z < 0 ? 0.72 : 0.6, w: z < 0 ? 0.42 : 0.3 });
  } else if (kind === "tanque") {
    // Tanque de juguete: orugas de goma con ruedas de rodaje (no doblan), casco y torreta con cañón
    const olive = M.matte("#3f4628");
    parts = [
      ...[-0.72, 0.72].flatMap((x) => [
        box(0.3, 0.42, 2.0, M.rubber(), [x, 0.02, 0]),
        cyl(0.42, 0.42, 0.3, M.rubber(), [x, 0.02, 1.0], [0, 0, Math.PI / 2], 10),
        cyl(0.42, 0.42, 0.3, M.rubber(), [x, 0.02, -1.0], [0, 0, Math.PI / 2], 10),
        box(0.36, 0.05, 2.3, olive, [x, 0.28, 0]),
      ]),
      extrude([[-1.0, 0.15], [0.85, 0.15], [1.08, 0.3], [0.8, 0.5], [-0.95, 0.5], [-1.05, 0.35]], 1.1, paint, [0, 0, 0]),
      cyl(0.95, 1.0, 0.32, paint, [0, 0.66, -0.15], undefined, 10),
      cyl(0.5, 0.55, 0.08, olive, [0, 0.86, -0.2], undefined, 8),
      cyl(0.13, 0.13, 1.1, M.metal("#3a3f2a"), [0, 0.68, 0.75], [Math.PI / 2, 0, 0], 8),
      cyl(0.18, 0.18, 0.16, M.metal("#3a3f2a"), [0, 0.68, 1.3], [Math.PI / 2, 0, 0], 8),
      box(0.5, 0.06, 0.16, M.matte("#e0a030"), [0, 0.52, 1.0]),
    ];
    for (const z of [-0.6, -0.2, 0.2, 0.6]) for (const x of [-0.72, 0.72]) ws.push({ pos: [x, 0.02, z], d: 0.36, w: 0.34, steer: false });
  } else if (kind === "axel") {
    // Axel (Twisted Metal): dos ruedas gigantes con una jaula-cabina colgando del eje; el piloto va en el centro
    const steel = M.metal("#444a52"), red = M.plastic("#b8321f");
    parts = [
      cyl(0.16, 0.16, 1.9, steel, [0, 0, 0], [0, 0, Math.PI / 2], 8),
      box(0.95, 0.12, 1.25, M.matte("#2b2d31"), [0, -0.12, 0]),
      extrude([[-0.65, -0.1], [0.65, -0.1], [0.72, 0.1], [0.45, 0.28], [-0.6, 0.3], [-0.7, 0.1]], 0.9, paint, [0, 0.0, 0]),
      tube([[-0.42, 0.28, -0.55], [-0.42, 0.78, -0.2], [0.42, 0.78, -0.2], [0.42, 0.28, -0.55]], 0.04, steel),
      tube([[-0.42, 0.28, 0.5], [-0.42, 0.75, 0.2], [0.42, 0.75, 0.2], [0.42, 0.28, 0.5]], 0.04, steel),
      tube([[-0.42, 0.78, -0.2], [-0.42, 0.75, 0.2]], 0.04, steel), tube([[0.42, 0.78, -0.2], [0.42, 0.75, 0.2]], 0.04, steel),
      ...[-1, 1].flatMap((s) => [cyl(0.5, 0.5, 0.06, red, [s * 0.98, 0, 0], [0, 0, Math.PI / 2], 8), cyl(0, 0.16, 0.2, steel, [s * 1.1, 0, 0], [0, 0, -s * Math.PI / 2], 6)]),
    ];
    for (const x of [-0.82, 0.82]) ws.push({ pos: [x, 0, 0], d: 1.6, w: 0.42, steer: false });
  } else if (kind === "helado") {
    // Camioncito de helados: cabina rosa, caja crema con ventanilla de atención, toldo y un cucurucho gigante en el techo
    const cream = M.matte("#f3ead2"), pink = M.plastic("#f08dbd");
    parts = [
      box(1.0, 0.14, 2.3, M.matte("#2b2d31"), [0, 0.05, 0]),
      box(1.1, 0.95, 1.45, cream, [0, 0.58, -0.4]),
      extrude([[0.3, 0.1], [1.15, 0.1], [1.2, 0.3], [1.1, 0.55], [0.82, 0.9], [0.3, 0.9]], 1.1, paint, [0, 0, 0]),
      box(1.0, 0.3, 0.04, M.glass(), [0, 0.7, 0.85], [-0.6, 0, 0]),
      ...[-1, 1].flatMap((s) => [box(0.02, 0.4, 0.75, M.glass(), [s * 0.56, 0.72, -0.4]), box(0.18, 0.05, 0.85, s > 0 ? pink : cream, [s * 0.63, 0.97, -0.4], [0, 0, -s * 0.35]), box(0.04, 0.12, 0.85, paint, [s * 0.56, 0.3, -0.4])]),
      cyl(0.46, 0.02, 0.62, M.matte("#d9a15a"), [0, 1.37, -0.4], undefined, 6),
      sph(0.5, pink, [0, 1.8, -0.4], undefined, 6), sph(0.4, cream, [0, 2.1, -0.4], undefined, 6), sph(0.14, M.plastic("#c1121f"), [0, 2.34, -0.4], undefined, 4),
    ];
    for (const [x, z] of [[-0.62, 0.78], [0.62, 0.78], [-0.62, -0.75], [0.62, -0.75]]) ws.push({ pos: [x, 0, z], d: 0.62, w: 0.3 });
  } else if (kind === "combi") {
    // Combi (furgoneta hippie): carrocería de dos tonos, techo crema, ventanas laterales y luces redondas
    const cream = M.matte("#d9cba6");
    parts = [
      box(1.0, 0.12, 2.3, M.matte("#2b2d31"), [0, 0.05, 0]),
      extrude([[-1.12, 0.05], [1.12, 0.05], [1.22, 0.25], [1.17, 0.6], [0.98, 1.0], [-0.98, 1.05], [-1.14, 0.9]], 1.08, paint, [0, 0, 0]),
      box(0.7, 0.07, 1.9, cream, [0, 1.04, -0.02]),
      box(0.9, 0.34, 0.04, M.glass(), [0, 0.8, 0.98], [-0.55, 0, 0]),
      ...[-1, 1].flatMap((s) => [box(0.02, 0.32, 0.5, M.glass(), [s * 0.55, 0.78, 0.7]), box(0.02, 0.32, 0.6, M.glass(), [s * 0.55, 0.78, -0.05]), box(0.02, 0.32, 0.6, M.glass(), [s * 0.55, 0.78, -0.75]), box(0.03, 0.14, 2.2, cream, [s * 0.55, 0.42, -0.05])]),
      box(0.5, 0.06, 0.04, cream, [0, 0.4, 1.23]), box(1.1, 0.1, 0.12, M.metal(), [0, 0.12, 1.2]), box(1.1, 0.1, 0.12, M.metal(), [0, 0.12, -1.18]),
    ];
    for (const [x, z] of [[-0.62, 0.75], [0.62, 0.75], [-0.62, -0.75], [0.62, -0.75]]) ws.push({ pos: [x, 0, z], d: 0.62, w: 0.3 });
  } else {
    // Autito de carreras a fricción: carrocería redonda de lata, ruedas finas, paragolpes cromados
    parts = [
      box(0.7, 0.06, 1.7, M.matte("#2b2d31"), [0, 0.0, 0]),
      extrude([[-1.0, 0], [0.95, 0], [1.05, 0.12], [0.9, 0.26], [0.25, 0.3], [0.0, 0.46], [-0.42, 0.47], [-0.72, 0.34], [-1.0, 0.24]], 0.8, paint, [0, 0.0, 0]),
      box(0.62, 0.16, 0.04, M.glass(), [0, 0.4, 0.12], [-0.6, 0, 0]),
      tube([[-0.38, 0.12, 1.06], [0, 0.1, 1.12], [0.38, 0.12, 1.06]], 0.04, M.metal("#e5e7eb")),
      tube([[-0.38, 0.12, -1.04], [0, 0.1, -1.1], [0.38, 0.12, -1.04]], 0.04, M.metal("#e5e7eb")),
      cyl(0.08, 0.08, 0.14, M.metal("#e5e7eb"), [0.43, 0.18, -0.2], [0, 0, Math.PI / 2], 8), // llave de cuerda
    ];
    for (const [x, z] of [[-0.46, 0.66], [0.46, 0.66], [-0.46, -0.66], [0.46, -0.66]]) ws.push({ pos: [x, 0, z], d: 0.52, w: 0.18 });
  }

  // Detalle de juguete realista (todos los autos): aros cromados en los faros, luces traseras, espejos, parrilla y escapes
  {
    const [bw, bh, bl] = CARS_SIZE[kind], chrome = M.metal("#e6e9ee"), tail = M.glow("#ff3a2a");
    for (const [x, y, z, d] of A.lamps) for (const s of x ? [1, -1] : [1]) parts.push(tor(d * 1.35, d * 0.22, chrome, [x * s, y, z - d * 0.1], [Math.PI / 2, 0, 0], 12));
    if (kind !== "axel" && kind !== "tanque") {
      for (const sd of [-1, 1]) parts.push(box(0.16, 0.07, 0.04, tail, [sd * bw * 0.34, bh * 0.55, -bl * 0.5 + 0.02])); // luces traseras
      parts.push(box(bw * 0.7, 0.06, 0.05, chrome, [0, bh * 0.28, bl * 0.5 - 0.02])); // paragolpes cromado
    }
    if (kind === "buggy" || kind === "monster" || kind === "helado" || kind === "combi") {
      const my = kind === "monster" ? bh * 1.1 : kind === "buggy" ? bh * 0.85 : bh * 0.78;
      for (const sd of [-1, 1]) parts.push(box(0.16, 0.06, 0.1, M.plastic("#1b1e24"), [sd * (bw / 2 + 0.1), my, bl * 0.12]), cyl(0.03, 0.03, 0.16, M.metal("#9aa0a6"), [sd * (bw / 2 + 0.04), my - 0.05, bl * 0.12], [0, 0, Math.PI / 2], 6)); // espejos
    }
    if (kind === "monster" || kind === "helado" || kind === "combi") {
      parts.push(box(bw * 0.5, 0.2, 0.04, M.matte("#14171c"), [0, bh * 0.38, bl * 0.5 + 0.01]));
      for (let k = 0; k < 4; k++) parts.push(box(bw * 0.46, 0.015, 0.05, chrome, [0, bh * 0.3 + k * 0.045, bl * 0.5 + 0.03])); // parrilla con rejilla
    }
    if (kind !== "axel") for (const sd of [-1, 1]) parts.push(cyl(0.07, 0.07, 0.2, chrome, [sd * bw * 0.22, 0.14, -bl * 0.5 - 0.04], [Math.PI / 2, 0, 0], 12), cyl(0.045, 0.045, 0.22, M.matte("#101010"), [sd * bw * 0.22, 0.14, -bl * 0.5 - 0.05], [Math.PI / 2, 0, 0], 10)); // escapes
  }

  // Ópticas del faro (color elegido) + luz del faro en la escena
  const lamp = LAMPS[o.lamp ?? "calido"] ?? LAMPS.calido;
  for (const [x, y, z, d] of A.lamps) for (const s of x ? [1, -1] : [1]) parts.push(sph(d, M.glow(lamp[0]), [x * s, y, z]));
  const spot = scene.getLightByName("lamp");
  if (spot) spot.diffuse = B.Color3.FromHexString(lamp[1]);

  // Alerón
  const [dy, dz] = A.deck, small = kind === "carrera", wingW = kind === "monster" || kind === "tanque" ? 1.2 : small ? 0.85 : 1.1;
  if (o.wing === "alto" || o.wing === "doble") {
    const plate = o.wing === "alto" ? paint : M.plastic("#18181b");
    const top = (o.wing === "alto" ? 0.5 : 0.48) * (small ? 0.7 : 1);
    parts.push(
      ...[-0.3, 0.3].map((x) => box(0.05, top, 0.12, M.matte("#222"), [x, dy + top / 2, dz])),
      box(wingW, 0.05, 0.4, plate, [0, dy + top, dz - 0.04], [0.14, 0, 0]),
      ...[-1, 1].map((s) => box(0.04, o.wing === "alto" ? 0.2 : 0.36, 0.44, o.wing === "alto" ? M.plastic("#18181b") : paint, [s * wingW / 2, dy + top - (o.wing === "alto" ? 0.04 : 0.12), dz - 0.04])),
    );
    if (o.wing === "doble") parts.push(box(wingW, 0.05, 0.34, plate, [0, dy + top - 0.24, dz - 0.02], [0.1, 0, 0]));
    stock.forEach((m) => m.dispose());
  } else parts.push(...stock);

  // Calcos laterales (espejados)
  const [sx, sy, sz] = A.side;
  for (const s of [1, -1]) {
    const x = s * sx;
    if (o.decal === "numero") parts.push(cyl(0.3, 0.3, 0.02, M.plastic("#e8e4d4"), [x, sy, sz], [0, 0, Math.PI / 2], 14), box(0.03, 0.16, 0.05, M.plastic("#111"), [x + s * 0.005, sy, sz]), box(0.03, 0.04, 0.08, M.plastic("#111"), [x + s * 0.005, sy + 0.07, sz + 0.03]));
    else if (o.decal === "rayo") parts.push(...([[0.12, 0.05, 0.22, 0.5], [0.0, 0.0, 0.2, -0.4], [-0.12, -0.05, 0.22, 0.5]] as const).map(([dz2, dy2, len, r]) => box(0.02, 0.06, len, M.plastic("#e0a030"), [x, sy + dy2, sz + dz2], [r, 0, 0])));
    else if (o.decal === "damero") for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) parts.push(box(0.02, 0.07, 0.07, M.plastic((i + j) % 2 ? "#e8e4d4" : "#111"), [x, sy - 0.035 + j * 0.07, sz - 0.14 + i * 0.07]));
  }

  // Calco propio (textura NEAREST 16x16 con alfa; el material se reusa por diseño)
  if (validDecal(o.sticker) && o.sticker !== DECAL_BLANK) {
    const onWing = kind !== "monster" && (o.wing === "alto" || o.wing === "doble"); // plato del alerón: top = el mismo de arriba, +0,033 = medio grosor y holgura
    const [hy, hz, hs, hp] = onWing ? [dy + (o.wing === "alto" ? 0.5 : 0.48) * (small ? 0.7 : 1) + 0.033, dz - 0.04, 0.34, 0.14] : SPOT[kind];
    const mat = pbr("calco" + o.sticker, { color: "#ffffff", rough: 0.4 });
    if (!mat.albedoTexture) {
      const t = new B.DynamicTexture("calco", DECAL_N, scene, false, B.Texture.NEAREST_SAMPLINGMODE);
      const c = t.getContext() as unknown as CanvasRenderingContext2D;
      for (let i = 0; i < o.sticker.length; i++) { const n = +o.sticker[i]; if (n) { c.fillStyle = DECAL_PAL[n - 1]; c.fillRect(i % DECAL_N, (i / DECAL_N) | 0, 1, 1); } }
      t.update();
      t.hasAlpha = true;
      mat.albedoTexture = t;
      mat.emissiveTexture = t; mat.emissiveColor = new B.Color3(0.3, 0.3, 0.3); // autoiluminado a medias: de noche y lejos del faro igual se lee
      mat.useAlphaFromAlbedoTexture = true;
      mat.transparencyMode = B.Material.MATERIAL_ALPHATEST;
    }
    const p = B.MeshBuilder.CreatePlane("calco", { size: hs }, scene);
    p.rotation.x = Math.PI / 2 + hp;
    p.position.set(0, hy, hz);
    p.material = mat;
    parts.push(p);
  }

  // Escape
  const [ey, ez] = A.exh;
  if (o.exhaust === "doble") for (const x of [-0.22, 0.22]) parts.push(cyl(0.11, 0.11, 0.34, M.metal("#d0d0d0"), [x, ey, ez - 0.05], [Math.PI / 2, 0, 0], 8), cyl(0.07, 0.07, 0.02, M.matte("#111"), [x, ey, ez - 0.23], [Math.PI / 2, 0, 0], 8));
  else if (o.exhaust === "chimenea") for (const x of [-0.3, 0.3]) parts.push(cyl(0.09, 0.11, 0.6, M.metal("#d0d0d0"), [x, ey + 0.3, ez + 0.12], undefined, 8), cyl(0.08, 0.08, 0.03, M.glow("#ff8a3d"), [x, ey + 0.61, ez + 0.12], undefined, 8));

  // Piloto sentado (o asomado por la escotilla del tanque)
  const [px, py, pz, ps] = A.seat;
  for (const m of pilotParts(o.pilot ?? "soldadito")) { m.position.scaleInPlace(ps).addInPlaceFromFloats(px, py, pz); m.scaling.scaleInPlace(ps); parts.push(m); }

  // Antena, siempre: es un auto RC
  parts.push(cyl(0.03, 0.03, 1.3, M.metal("#111"), [0.38, 0.95, -0.7], undefined, 4), sph(0.12, M.plastic("#ff4d6d"), [0.38, 1.6, -0.7]));
  const rim = o.rim ?? A.rim;
  const body = merge("carBody", parts);
  const wheels = ws.map((w) => {
    const m = wheel(w.d, w.w, rim);
    m.position = v(w.pos);
    m.parent = body;
    return { m, front: w.steer !== false && w.pos[2] > 0, r: w.d / 2 };
  });
  return { body, wheels, paint };
}

// Figuritas de juguete que manejan: cadera en el origen, ~0,5 de alto, mirando a +z
export function pilotParts(id: string): B.Mesh[] {
  const arms = (mat: B.Material) => [-1, 1].map((s) => box(0.07, 0.07, 0.24, mat, [s * 0.13, 0.2, 0.1], [0.35, 0, 0]));
  if (id === "muneca") {
    const cloth = M.matte("#b4507a"), skin = M.matte("#f1d3b3"), hair = M.matte("#d9772b");
    return [
      cyl(0.18, 0.28, 0.28, cloth, [0, 0.14, 0], undefined, 8), ...arms(skin),
      sph(0.21, skin, [0, 0.39, 0]), sph(0.23, hair, [0, 0.44, -0.03], [1, 0.6, 1]),
      sph(0.09, hair, [0.13, 0.36, -0.02]), sph(0.09, hair, [-0.13, 0.36, -0.02]),
      sph(0.035, M.plastic("#111"), [0.05, 0.4, 0.095], undefined, 4), sph(0.035, M.plastic("#111"), [-0.05, 0.4, 0.095], undefined, 4),
    ];
  }
  if (id === "robot") {
    const tin = M.metal("#6b8fb5");
    return [
      box(0.24, 0.26, 0.18, tin, [0, 0.14, 0]), ...arms(M.metal("#9ca3af")),
      box(0.2, 0.17, 0.17, tin, [0, 0.37, 0]), box(0.15, 0.04, 0.02, M.glow("#6fb3c4"), [0, 0.38, 0.09]),
      cyl(0.015, 0.015, 0.12, M.metal("#111"), [0, 0.5, 0], undefined, 4), sph(0.05, M.glow("#e0a030"), [0, 0.57, 0], undefined, 4),
    ];
  }
  if (id === "dino") {
    const g = M.plastic("#3f8f45"), belly = M.plastic("#a7c957");
    return [
      cyl(0.2, 0.26, 0.28, g, [0, 0.14, 0], undefined, 8), box(0.14, 0.18, 0.04, belly, [0, 0.13, 0.11]), ...arms(g),
      box(0.17, 0.15, 0.28, g, [0, 0.39, 0.05]), box(0.15, 0.04, 0.2, belly, [0, 0.32, 0.09]),
      sph(0.04, M.plastic("#111"), [0.07, 0.43, 0.13], undefined, 4), sph(0.04, M.plastic("#111"), [-0.07, 0.43, 0.13], undefined, 4),
      ...[0.48, 0.32, 0.18].map((y, i) => cyl(0, 0.07, 0.08, M.plastic("#e0a030"), [0, y, -0.1 - i * 0.02], [-0.6, 0, 0], 4)),
    ];
  }
  if (id === "figura") {
    const skin = M.plastic("#c98a56");
    return [
      box(0.28, 0.26, 0.16, M.matte("#2b2d31"), [0, 0.14, 0]), ...arms(skin),
      sph(0.19, skin, [0, 0.38, 0]), sph(0.2, M.matte("#1a1410"), [0, 0.43, -0.02], [1, 0.5, 1]),
      tor(0.19, 0.03, M.plastic("#e0a030"), [0, 0.42, 0], undefined, 10),
    ];
  }
  // soldadito de plástico verde: todo de un color, casco con ala
  const army = M.plastic("#55642c");
  return [
    cyl(0.19, 0.24, 0.28, army, [0, 0.14, 0], undefined, 8), ...arms(army), box(0.16, 0.16, 0.08, army, [0, 0.16, -0.13]),
    sph(0.19, army, [0, 0.37, 0]), sph(0.23, army, [0, 0.42, 0], [1, 0.55, 1]), tor(0.24, 0.025, army, [0, 0.41, 0], undefined, 10),
  ];
}

// ---------- Enemigos ----------

export function enemyTemplate(kind: string, scale = 1): B.Mesh {
  return template(kind, () => {
    if (kind === "hormiga") {
      const m = M.plastic("#a0522d");
      return [
        sph(0.75, m, [0, 0.3, -0.55], [1, 0.8, 1.25]),
        sph(0.42, m, [0, 0.3, 0]),
        sph(0.5, m, [0, 0.35, 0.45]),
        cyl(0.03, 0.03, 0.6, m, [0.12, 0.6, 0.75], [0.7, 0, 0.3], 4),
        cyl(0.03, 0.03, 0.6, m, [-0.12, 0.6, 0.75], [0.7, 0, -0.3], 4),
        sph(0.13, M.glow("#ff3020"), [0.13, 0.42, 0.66]),
        sph(0.13, M.glow("#ff3020"), [-0.13, 0.42, 0.66]),
      ];
    }
    if (kind === "escupidora") {
      const m = M.plastic("#d2381c");
      return [
        sph(1.0, pbr("acidSac", { color: "#9acd32", rough: 0.2, emissive: "#2a3a00", alpha: 0.9 }), [0, 0.45, -0.7], [1, 0.85, 1.2]),
        sph(0.45, m, [0, 0.35, 0]),
        sph(0.6, m, [0, 0.42, 0.5]),
        cyl(0.05, 0.12, 0.35, m, [0.12, 0.35, 0.85], [1.4, 0, 0], 5),
        cyl(0.05, 0.12, 0.35, m, [-0.12, 0.35, 0.85], [1.4, 0, 0], 5),
        cyl(0.03, 0.03, 0.7, m, [0.14, 0.75, 0.8], [0.6, 0, 0.3], 4),
        cyl(0.03, 0.03, 0.7, m, [-0.14, 0.75, 0.8], [0.6, 0, -0.3], 4),
        sph(0.27, M.glow("#ffb020"), [0.17, 0.55, 0.74]),
        sph(0.27, M.glow("#ffb020"), [-0.17, 0.55, 0.74]),
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
        sph(0.18, M.glow("#fff4d0"), [0.3, 0.22, 0.78]),
        sph(0.18, M.glow("#fff4d0"), [-0.3, 0.22, 0.78]),
        ...[[-0.42, 0.45], [0.42, 0.45], [-0.42, -0.45], [0.42, -0.45]].map(([x, z]) => cyl(0.42, 0.42, 0.18, M.rubber(), [x, 0.12, z], [0, 0, Math.PI / 2], 10)),
      ];
    }
    if (kind === "robot") {
      const tin = M.metal("#ef4444");
      return [
        box(0.9, 0.8, 0.7, tin, [0, 0.55, 0]),
        box(0.6, 0.45, 0.5, M.metal(), [0, 1.2, 0]),
        sph(0.21, M.glow("#facc15"), [0.14, 1.25, 0.26]),
        sph(0.21, M.glow("#facc15"), [-0.14, 1.25, 0.26]),
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
        cyl(1.6, 1.8, 1.6, M.metal("#6b7f99"), [0, 3.6, 0.3], undefined, 12),
        box(3, 0.4, 0.6, M.matte("#111"), [0, 3.1, -2.6]),
        tube([[-1.8, 2.2, -2.8], [-1.8, 5, -5], [-1.8, 7.5, -6.2], [1.8, 7.5, -6.2], [1.8, 5, -5], [1.8, 2.2, -2.8]], 0.16, M.metal("#111")),
        ...[[-2.8, 2.4], [2.8, 2.4], [-2.8, -2.4], [2.8, -2.4]].map(([x, z]) => cyl(1.8, 1.8, 0.7, M.rubber(), [x, 0.9, z], [0, 0, Math.PI / 2], 16)),
        ...[[-3.2, 2.4], [3.2, 2.4], [-3.2, -2.4], [3.2, -2.4]].map(([x, z]) => cyl(0.9, 0.9, 0.15, M.metal("#fbbf24"), [x, 0.9, z], [0, 0, Math.PI / 2], 10)),
      ];
    }
    if (kind === "polilla") {
      // Cuerpo peludo y antenas plumosas; las alas van aparte (wingTemplate) para aletear
      const fur = M.matte("#d8c690");
      return [
        sph(0.5, fur, [0, 0, -0.35], [0.8, 0.75, 1.5]),
        sph(0.42, M.matte("#a8966c"), [0, 0.02, 0.08]),
        sph(0.3, fur, [0, 0.02, 0.36]),
        cyl(0.02, 0.06, 0.55, fur, [0.14, 0.22, 0.6], [0.9, 0, -0.5], 4),
        cyl(0.02, 0.06, 0.55, fur, [-0.14, 0.22, 0.6], [0.9, 0, 0.5], 4),
        sph(0.13, M.glow("#c9a0ff"), [0.1, 0.05, 0.47]),
        sph(0.13, M.glow("#c9a0ff"), [-0.1, 0.05, 0.47]),
      ];
    }
    if (kind === "tarantula") {
      // Cefalotórax + abdomen peludo con banda, quelíceros y racimo de ojos; las 8 patas van aparte (LEGS)
      const hair = M.matte("#7a55a8"), dark = M.matte("#6b4a3a");
      return [
        sph(1.3, hair, [0, 0.55, -0.75], [1, 0.8, 1.15], 10),
        sph(0.8, M.matte("#8a4a22"), [0, 0.86, -0.85], [1, 0.35, 1], 8),
        sph(0.95, dark, [0, 0.45, 0.3], [1, 0.6, 1.15], 10),
        cyl(0.05, 0.16, 0.35, M.plastic("#4a2a1a"), [0.13, 0.25, 0.85], [2.6, 0, 0], 5),
        cyl(0.05, 0.16, 0.35, M.plastic("#4a2a1a"), [-0.13, 0.25, 0.85], [2.6, 0, 0], 5),
        cyl(0.07, 0.09, 0.5, dark, [0.25, 0.35, 0.8], [1.2, 0, -0.4], 5),
        cyl(0.07, 0.09, 0.5, dark, [-0.25, 0.35, 0.8], [1.2, 0, 0.4], 5),
        sph(0.14, M.glow("#ff4fd8"), [0.09, 0.66, 0.68]),
        sph(0.14, M.glow("#ff4fd8"), [-0.09, 0.66, 0.68]),
        ...[[0.2, 0.62, 0.6], [-0.2, 0.62, 0.6], [0.14, 0.7, 0.52], [-0.14, 0.7, 0.52]].map((p) => sph(0.07, M.glow("#ff4fd8"), p as V3, undefined, 4)),
      ];
    }
    if (kind === "aspiradora") {
      // Disco robot con paragolpes, torreta láser, boca de succión y cepillos laterales; sensores rojos al frente
      const shell = M.plastic("#7a8fa6"), dark = M.matte("#111");
      return [
        cyl(6.1, 6.4, 1.1, shell, [0, 0.7, 0], undefined, 24),
        cyl(5.2, 5.6, 0.25, M.metal("#6b7a8a"), [0, 1.35, 0], undefined, 24),
        tor(6.3, 0.32, M.rubber(), [0, 0.5, 0], undefined, 24),
        cyl(1.2, 1.35, 0.5, dark, [0, 1.7, -0.9], undefined, 12),
        cyl(1.1, 1.1, 0.1, M.plastic("#c8ccd2"), [0, 1.5, 1.1], undefined, 16),
        box(3, 0.3, 0.4, M.matte("#0b0b0b"), [0, 0.35, 2.9]),
        sph(0.45, M.glow("#ff2a1a"), [0.9, 0.95, 2.95]),
        sph(0.45, M.glow("#ff2a1a"), [-0.9, 0.95, 2.95]),
        ...[-1, 1].flatMap((s) => [
          cyl(1.5, 1.5, 0.06, M.matte("#555"), [s * 2.5, 0.12, 2.3], undefined, 6),
          ...[0, 1, 2].map((k) => box(0.08, 0.05, 1.9, M.matte("#888"), [s * 2.5, 0.16, 2.3], [0, k * 1.05, 0])),
        ]),
      ];
    }
    if (kind === "cortacercos") {
      // Motor naranja con manija en D, espada con dientes y el cable de alimentación saliendo de atrás; LED rojo de encendido
      const body = M.plastic("#e0a030"), dark = M.matte("#1a1a1a"), steel = M.metal("#9ca3af");
      return [
        box(2.4, 1.5, 3, body, [0, 1.15, -2.6]),
        sph(2.6, body, [0, 1.8, -2.6], [1, 0.45, 1.2], 10),
        box(2.5, 0.5, 2.4, dark, [0, 0.45, -2.6]),
        tor(2.2, 0.22, dark, [0, 2.1, -0.9], [Math.PI / 2, 0, 0], 14),
        tube([[0, 1.6, -4.1], [0, 2.6, -4.6], [0, 2.4, -5.1], [0, 1.3, -4.9]], 0.18, dark),
        box(0.7, 0.18, 5.6, steel, [0, 0.9, 2.6]),
        ...Array.from({ length: 10 }, (_, i) => [-1, 1].map((s) => box(0.35, 0.12, 0.2, M.metal("#d6dbe1"), [s * 0.48, 0.9, 0.2 + i * 0.55]))).flat(),
        sph(0.3, M.glow("#ff2a1a"), [0.6, 1.95, -1.3]),
        sph(0.3, M.glow("#ff2a1a"), [-0.6, 1.95, -1.3]),
        tube([[0, 0.9, -4.1], [0, 0.3, -4.7], [0.6, 0.1, -5.4]], 0.12, dark),
      ];
    }
    if (kind === "gato") {
      // Eulalio: gato naranja atigrado, ojos verdes enormes, cola en S
      const fur = M.plastic("#f28c28"), stripe = M.matte("#c96a12"), cream = M.matte("#ffe3b8"), pink = M.plastic("#ff9bb3");
      return [
        sph(3.6, fur, [0, 2.5, -0.2], [1, 0.85, 1.55], 14),
        ...[-1.6, -0.6, 0.5, 1.5].map((z) => box(3.1, 0.35, 0.4, stripe, [0, 4.1, z], [0.05, 0, 0])),
        sph(2.5, cream, [0, 1.6, 1.4], [0.8, 0.5, 1], 10),
        sph(2.7, fur, [0, 3.4, 3.3], [1.1, 1, 1], 14),
        ...[-0.5, 0, 0.5].map((x) => box(0.18, 0.7, 0.2, stripe, [x, 4.7, 3.9])),
        ...[-1, 1].flatMap((s) => [
          cyl(0, 1.2, 1.5, fur, [s * 1.2, 5.1, 3.1], [0, 0, -s * 0.2], 8), cyl(0, 0.8, 1.1, pink, [s * 1.2, 5.0, 3.3], [0, 0, -s * 0.2], 8),
          sph(0.95, M.glow("#a8ff3a"), [s * 0.85, 3.7, 4.55]), box(0.18, 0.85, 0.12, M.plastic("#111"), [s * 0.85, 3.7, 5.0]),
          box(1.1, 0.07, 0.07, M.matte("#fff7e8"), [s * 1.5, 3.05, 5.0], [0, 0, s * 0.18]), box(1.1, 0.07, 0.07, M.matte("#fff7e8"), [s * 1.5, 2.85, 5.0], [0, 0, -s * 0.18]),
          cyl(0.55, 0.6, 2.4, fur, [s * 1.1, 1.2, 2.4], undefined, 10), sph(0.9, cream, [s * 1.1, 0.2, 2.7], [1, 0.6, 1.3], 8),
          cyl(0.55, 0.6, 2.4, fur, [s * 1.1, 1.2, -2.4], undefined, 10), sph(0.9, cream, [s * 1.1, 0.2, -2.1], [1, 0.6, 1.3], 8),
        ]),
        sph(0.5, pink, [0, 3.0, 5.2], [1.3, 0.8, 0.8], 6),
        tube([[0, 2.5, -3.6], [0, 2.2, -5.2], [0.8, 3.6, -6.0], [0.2, 5.4, -5.6], [-0.6, 6.4, -5.0]], 0.38, fur),
        sph(0.8, stripe, [-0.6, 6.5, -5.0], undefined, 8),
      ];
    }
    // Felipe: bulldog francés (jefe final) — cabezón, orejas de murciélago, hocico chato, lengua afuera y los ojos desparejos
    const fur = M.plastic("#d9b38a"), mask = M.matte("#4a3426"), white = M.plastic("#fffdf5"), pink = M.plastic("#ff7aa0"), brown = M.matte("#c9a273");
    return [
      sph(5.2, fur, [0, 3.5, -0.4], [0.92, 0.82, 1.35], 14),
      sph(3.2, white, [0, 3.0, 2.2], [0.8, 0.9, 0.5], 10),
      sph(4.2, fur, [0, 5.4, 3.6], [1.25, 1, 1], 14),
      sph(2.6, mask, [0, 4.9, 5.5], [1.3, 0.75, 0.7], 10),
      box(1.1, 0.7, 0.4, M.plastic("#111"), [0, 5.3, 6.15]),
      ...[-1, 1].map((s) => box(0.07, 0.8, 0.07, mask, [s * 0.35, 4.55, 6.1])),
      ...[0, 1, 2].map((k) => tor(2.4 - k * 0.3, 0.14, brown, [0, 6.5 + k * 0.4, 4.8 - k * 0.3], [Math.PI / 2.6, 0, 0], 14)),
      ...[-1, 1].flatMap((s) => [
        cyl(1.0, 1.5, 3.2, fur, [s * 2.0, 8.0, 3.1], [-0.15, 0, -s * 0.28], 14), cyl(0.6, 1.0, 2.5, pink, [s * 2.0, 7.95, 3.3], [-0.15, 0, -s * 0.28], 12),
        cyl(1.1, 1.2, 2.2, fur, [s * 1.5, 1.1, 2.6], undefined, 12), sph(1.5, white, [s * 1.5, 0.4, 3.0], [1, 0.55, 1.3], 8),
        cyl(1.1, 1.2, 2.2, fur, [s * 1.5, 1.1, -2.6], undefined, 12), sph(1.5, white, [s * 1.5, 0.4, -2.2], [1, 0.55, 1.3], 8),
      ]),
      // ojos desparejos: uno enorme con la pupila arriba, otro chico con la pupila abajo y de costado
      sph(1.7, white, [1.25, 6.4, 5.1], undefined, 12), sph(0.7, M.plastic("#111"), [1.4, 6.9, 5.85], undefined, 8), sph(0.28, M.glow("#ff2a1a"), [1.0, 7.1, 6.3], undefined, 6),
      sph(1.1, white, [-1.35, 6.2, 5.2], undefined, 12), sph(0.5, M.plastic("#111"), [-1.0, 5.8, 5.85], undefined, 8),
      box(1.1, 0.25, 2.0, pink, [0.2, 4.1, 6.4], [0.5, 0, 0.12]), sph(0.6, pink, [0.3, 3.4, 7.3], [1, 0.4, 1.3], 8),
      box(5.6, 0.7, 0.9, M.plastic("#dc2626"), [0, 4.1, 2.4]), sph(0.6, M.metal("#ffd24d"), [0, 3.5, 3.0], [1, 1.2, 0.3], 8),
      sph(1.2, fur, [0, 4.0, -4.1], undefined, 8),
    ];
  }, scale);
}

// ---------- Patas articuladas (instancias animadas aparte) ----------
// Pata del lado derecho: cadera en el origen, fémur hacia arriba y afuera, tibia hasta el piso.
// yaw (opcional): abre cada pata hacia adelante/atrás (lado derecho; el izquierdo se espeja)
export const LEGS: Record<string, { hips: [number, number, number][]; len: number; r: number; color: string; scale: number; yaw?: number[] }> = {
  hormiga: { hips: [[0.16, 0.3, -0.18], [0.16, 0.3, 0], [0.16, 0.3, 0.18]], len: 0.8, r: 0.035, color: "#a0522d", scale: 1 },
  escupidora: { hips: [[0.18, 0.34, -0.2], [0.18, 0.34, 0], [0.18, 0.34, 0.2]], len: 0.9, r: 0.04, color: "#5a160a", scale: 1 },
  escarabajo: { hips: [[0.5, 0.38, -0.5], [0.5, 0.38, 0], [0.5, 0.38, 0.5]], len: 1.0, r: 0.06, color: "#111111", scale: 1 },
  rey: { hips: [[0.5, 0.38, -0.5], [0.5, 0.38, 0], [0.5, 0.38, 0.5]], len: 1.0, r: 0.06, color: "#111111", scale: 3.5 },
  tarantula: { hips: [[0.32, 0.45, -0.05], [0.36, 0.45, 0.18], [0.36, 0.45, 0.4], [0.3, 0.45, 0.6]], len: 1.5, r: 0.09, color: "#2a1d16", scale: 3, yaw: [0.75, 0.25, -0.25, -0.7] },
};
export function legTemplate(kind: string) {
  const L = LEGS[kind];
  const hy = L.hips[0][1];
  return template("leg_" + kind, () => [
    tube([[0, 0, 0], [L.len * 0.45, L.len * 0.35, 0], [L.len * 0.95, -hy, 0]], L.r, M.plastic(L.color)),
    sph(L.r * 3, M.plastic(L.color), [L.len * 0.45, L.len * 0.35, 0], undefined, 4),
  ], L.scale);
}

// Ala de polilla (lado derecho, bisagra en el origen): se instancia de a dos y aletea en Enemy.animate
export const wingTemplate = () => template("wing_polilla", () => [
  sph(1.2, pbr("mothWing", { color: "#b8a77c", rough: 0.9, alpha: 0.92 }), [0.6, 0, -0.15], [1, 0.05, 0.95], 6),
  sph(0.3, M.matte("#4a3a28"), [0.72, 0.04, -0.2], [1, 0.1, 1], 4),
]);
// Telegráfico de ataque enemigo en el piso (rojo = amenaza): aro + disco tenue, radio 1, se escala por instancia
export function teleTemplate() {
  const t = template("tele", () => {
    const d = B.MeshBuilder.CreateDisc("p", { radius: 1, tessellation: 28 }, scene);
    d.rotation.x = Math.PI / 2;
    d.material = pbr("teleFill", { color: "#ff2a1a", rough: 1, emissive: "#a01008", alpha: 0.22 });
    return [d, tor(2, 0.05, M.glow("#ff2a1a"), [0, 0.01, 0], undefined, 28)];
  });
  shadows.removeShadowCaster(t); // es luz en el piso, no un objeto
  return t;
}
// Sector de 120° (barrido del cortacercos), radio 1, centrado en +z: misma lógica que teleTemplate
export function sectorTemplate() {
  const t = template("teleArc", () => {
    const d = B.MeshBuilder.CreateDisc("p", { radius: 1, tessellation: 24, arc: 1 / 3 }, scene);
    d.rotation.z = Math.PI / 6; d.bakeCurrentTransformIntoVertices(); // arco de 30° a 150°: centro en +y
    d.rotation.x = Math.PI / 2; d.bakeCurrentTransformIntoVertices(); // acostado: centro en +z
    d.material = pbr("teleFill", { color: "#ff2a1a", rough: 1, emissive: "#a01008", alpha: 0.22 });
    const edge: V3[] = [[0, 0.01, 0], ...Array.from({ length: 13 }, (_, i) => { const a = -Math.PI / 3 + (i * Math.PI) / 18; return [Math.sin(a), 0.01, Math.cos(a)] as V3; }), [0, 0.01, 0]];
    return [d, tube(edge, 0.02, M.glow("#ff2a1a"))];
  });
  shadows.removeShadowCaster(t);
  return t;
}
// Aura de élite (radio 1, se escala por instancia): aro en el piso + halo emisivo tenue. Amarilla = rápida, gris metálica = blindada
export function auraTemplate(t: string) {
  const c = t === "rapida" ? "#ffd84a" : "#b8c0c8";
  const a = template("aura_" + t, () => [
    tor(2, 0.07, M.glow(c), [0, 0.06, 0], undefined, 20),
    sph(2.1, pbr("aura_" + t, { color: c, rough: 0.3, metal: t === "rapida" ? 0 : 0.9, emissive: t === "rapida" ? "#8a6a00" : "#4a5058", alpha: 0.18 }), [0, 0.55, 0], [1, 0.7, 1], 10),
  ]);
  shadows.removeShadowCaster(a);
  return a;
}
// Cable del cortacercos tirado en el piso (7 m a lo largo de z) con chispas rojas: es ataque enemigo
export function cableTemplate() {
  const t = template("cable", () => [
    cyl(0.18, 0.18, 7, M.matte("#141414"), [0, 0, 0], [Math.PI / 2, 0, 0], 6),
    ...[-3.4, -1.7, 0, 1.7, 3.4].map((z) => sph(0.24, M.glow("#ff2a1a"), [0, 0.06, z], undefined, 4)),
  ]);
  shadows.removeShadowCaster(t);
  return t;
}
// Tuerca roja que dispara la aspiradora (ataque enemigo)
export const nutTemplate = () => template("tuerca", () => [tor(0.6, 0.22, pbr("nutRed", { color: "#ff3a1f", rough: 0.3, metal: 0.6, emissive: "#c01800" }), [0, 0, 0], [Math.PI / 2, 0, 0], 6)]);
