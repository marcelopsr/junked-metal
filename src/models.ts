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
export type CarKind = "buggy" | "monster" | "formula" | "tanque" | "carrera";

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
export type CarOpts = { paint?: string; rim?: string; wing?: string; decal?: string; lamp?: string; exhaust?: string; pilot?: string };

// Dónde va cada cosa en cada auto: deck = [y, z] del alerón, side = calco lateral [x, y, z], exh = [y, z] del escape,
// seat = cadera del piloto + escala, lamps = ópticas [x, y, z, diámetro] (se espejan en x salvo x = 0).
const ANCH: Record<CarKind, { deck: [number, number]; side: V3; exh: [number, number]; seat: [number, number, number, number]; lamps: [number, number, number, number][]; paint: string; rim: string }> = {
  buggy: { deck: [0.62, -0.98], side: [0.485, 0.3, -0.35], exh: [0.25, -1.1], seat: [0, 0.38, 0.02, 0.8], lamps: [[0.3, 0.3, 1.1, 0.14]], paint: "#d62828", rim: "#ffc300" },
  monster: { deck: [0.8, -0.95], side: [0.585, 0.68, -0.15], exh: [0.55, -1.05], seat: [0, 0.78, -0.12, 0.9], lamps: [[0.36, 1.23, 0.15, 0.1], [0.12, 1.23, 0.15, 0.1]], paint: "#1d4ed8", rim: "#c0c0c0" },
  formula: { deck: [0.32, -1.15], side: [0.355, 0.13, 0.55], exh: [0.15, -1.25], seat: [0, 0.2, -0.05, 0.75], lamps: [[0.18, 0.08, 1.3, 0.08]], paint: "#16a34a", rim: "#e5e7eb" },
  tanque: { deck: [0.5, -0.92], side: [0.56, 0.3, 0.15], exh: [0.32, -1.02], seat: [0, 0.8, -0.2, 0.85], lamps: [[0.38, 0.42, 1.02, 0.12]], paint: "#6b7a3a", rim: "#3a3f2a" },
  carrera: { deck: [0.36, -0.82], side: [0.405, 0.2, 0.35], exh: [0.14, -1.02], seat: [0, 0.26, -0.3, 0.75], lamps: [[0.25, 0.2, 1.0, 0.12]], paint: "#2a9d8f", rim: "#e5e7eb" },
};

export function carModel(kind: CarKind, o: CarOpts = {}): CarModel {
  const A = ANCH[kind];
  const ws: { pos: V3; d: number; w: number; steer?: boolean }[] = [];
  let parts: B.Mesh[];
  let stock: B.Mesh[] = []; // alerón de serie (se reemplaza si se elige otro)
  const paint = pbr("paint" + kind + o.paint, { color: o.paint ?? A.paint, rough: 0.22 });
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
    if (kind === "polilla") {
      // Cuerpo peludo y antenas plumosas; las alas van aparte (wingTemplate) para aletear
      const fur = M.matte("#8a7a5a");
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
      const hair = M.matte("#3a2a20"), dark = M.matte("#1e1510");
      return [
        sph(1.3, hair, [0, 0.55, -0.75], [1, 0.8, 1.15], 10),
        sph(0.8, M.matte("#8a4a22"), [0, 0.86, -0.85], [1, 0.35, 1], 8),
        sph(0.95, dark, [0, 0.45, 0.3], [1, 0.6, 1.15], 10),
        cyl(0.05, 0.16, 0.35, M.plastic("#0c0806"), [0.13, 0.25, 0.85], [2.6, 0, 0], 5),
        cyl(0.05, 0.16, 0.35, M.plastic("#0c0806"), [-0.13, 0.25, 0.85], [2.6, 0, 0], 5),
        cyl(0.07, 0.09, 0.5, dark, [0.25, 0.35, 0.8], [1.2, 0, -0.4], 5),
        cyl(0.07, 0.09, 0.5, dark, [-0.25, 0.35, 0.8], [1.2, 0, 0.4], 5),
        sph(0.14, M.glow("#ff4fd8"), [0.09, 0.66, 0.68]),
        sph(0.14, M.glow("#ff4fd8"), [-0.09, 0.66, 0.68]),
        ...[[0.2, 0.62, 0.6], [-0.2, 0.62, 0.6], [0.14, 0.7, 0.52], [-0.14, 0.7, 0.52]].map((p) => sph(0.07, M.glow("#ff4fd8"), p as V3, undefined, 4)),
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
// yaw (opcional): abre cada pata hacia adelante/atrás (lado derecho; el izquierdo se espeja)
export const LEGS: Record<string, { hips: [number, number, number][]; len: number; r: number; color: string; scale: number; yaw?: number[] }> = {
  hormiga: { hips: [[0.16, 0.3, -0.18], [0.16, 0.3, 0], [0.16, 0.3, 0.18]], len: 0.8, r: 0.035, color: "#2a150c", scale: 1 },
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
