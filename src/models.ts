import * as B from "@babylonjs/core";
import earcut from "earcut";
import { precio } from "./balance";
import { carGlbHull, carGlbTpl } from "./carGlb";
import { M, pbr, shadows } from "./render";
import { FOLDED_SLICE } from "./folded";
import { carHull, foldLeg, foldWheel, mothWing } from "./folded_slice";

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
// Teselación según el tamaño en pantalla (antes duplicaba todos los lados: una esfera de 16 segmentos = 1.296 triángulos, un neumático 4.096).
// D = medida × tessK (escala de la plantilla que se arma, o 2,5 en los autos, que se ven de cerca en el garaje) → lados por tramo [<0,3 · <0,6 · <1,5 · <4 · más].
// Los lados que pide quien arma la pieza (tess ≤ 6, esfera ≤ 4) son a propósito y no se tocan.
let tessK = 1;
const tier = (D: number, a: number[]) => a[D < 0.3 ? 0 : D < 0.6 ? 1 : D < 1.5 ? 2 : D < 4 ? 3 : 4];
export const cyl = (top: number, bot: number, h: number, mat: B.Material, pos: V3, rot?: V3, tess = 12) =>
  place(B.MeshBuilder.CreateCylinder("p", { diameterTop: top, diameterBottom: bot, height: h, tessellation: tess <= 6 ? tess : Math.min(tess * 2, tier(Math.max(top, bot) * tessK, [8, 12, 16, 24, 32])) }, scene), mat, pos, rot);
export const sph = (d: number, mat: B.Material, pos: V3, scl?: V3, seg = 8) =>
  place(B.MeshBuilder.CreateSphere("p", { diameter: d, segments: seg <= 4 ? seg : Math.min(seg * 2, tier(d * tessK * (scl ? Math.max(...scl) : 1), [4, 6, 8, 10, 12])) }, scene), mat, pos, undefined, scl);
// Toro propio: `na` lados alrededor y `nc` en el corte del tubo (el de Babylon usa los mismos para ambos: un aro fino de 40 → 3.200 triángulos)
function ring(R: number, r: number, na: number, nc: number) {
  const P: number[] = [], N: number[] = [], U: number[] = [], I: number[] = [];
  for (let i = 0; i <= na; i++) for (let j = 0; j <= nc; j++) {
    const a = (i / na) * 2 * Math.PI, b = (j / nc) * 2 * Math.PI, ca = Math.cos(a), sa = Math.sin(a), nx = Math.cos(b), ny = Math.sin(b);
    P.push((R + r * nx) * ca, r * ny, (R + r * nx) * sa); N.push(nx * ca, ny, nx * sa); U.push(i / na, j / nc);
    if (i < na && j < nc) { const k = i * (nc + 1) + j; I.push(k, k + nc + 1, k + 1, k + 1, k + nc + 1, k + nc + 2); }
  }
  const m = new B.Mesh("p", scene), vd = new B.VertexData();
  Object.assign(vd, { positions: P, normals: N, uvs: U, indices: I });
  vd.applyToMesh(m);
  return m;
}
export const tor = (d: number, t: number, mat: B.Material, pos: V3, rot?: V3, tess = 14) =>
  place(ring(d / 2, t / 2, tess <= 6 ? tess : Math.min(tess * 2, tier(d * tessK, [10, 16, 24, 40, 40])), tess <= 6 ? tess : tier(t * tessK, [4, 6, 6, 8, 10])), mat, pos, rot);
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

/** Fusiona piezas en una malla y aplana sus colores (flatten): una submalla = un dibujo por pasada (cámara, brillo y cada cascada de sombra). `keep`: materiales que se animan y no se hornean. */
export function merge(name: string, parts: B.Mesh[], keep?: B.Material[]) {
  // Piezas ya aplanadas (con color de vértice) mezcladas con otras sin él: Babylon no fusiona atributos distintos; las que faltan reciben blanco
  if (parts.some((p) => p.isVerticesDataPresent(B.VertexBuffer.ColorKind))) for (const p of parts) if (!p.isVerticesDataPresent(B.VertexBuffer.ColorKind)) p.setVerticesData(B.VertexBuffer.ColorKind, new Float32Array(p.getTotalVertices() * 4).fill(1), false, 4);
  const m = B.Mesh.MergeMeshes(parts, true, true, undefined, false, true);
  if (!m) throw new Error(`merge ${name}: MergeMeshes devolvió null (${parts.length} piezas)`);
  m.name = name;
  m.receiveShadows = true;
  flatten(m, keep);
  return m;
}

// Aplana colores de una malla fusionada: cada pieza pintada (sin textura, emisivo ni transparencia) pasa a color de vértice y los materiales
// de una misma clase (rugosidad, metal, barniz) se funden en uno. Baja ~25 submallas a ~6: un draw por submalla y por pasada (cuarto, sombras x3, profundidad, brillo). Mismo look. `keep`: materiales que se animan en juego (la pintura que se gasta) y no se pueden hornear.
export function flatten(m: B.Mesh, keep: B.Material[] = []) {
  const multi = m.material;
  if (!(multi instanceof B.MultiMaterial)) return;
  const nv = m.getTotalVertices(), idx = m.getIndices()!, old = m.getVerticesData(B.VertexBuffer.ColorKind), col = old ? Float32Array.from(old) : new Float32Array(nv * 4).fill(1); // si ya estaba aplanada (pieza de otra fusión) conserva sus colores
  const groups = new Map<B.Material, B.SubMesh[]>();
  for (const sm of m.subMeshes) {
    let mat = multi.subMaterials[sm.materialIndex]!;
    if (mat instanceof B.PBRMaterial && !mat.albedoTexture && !mat.detailMap.isEnabled && mat.emissiveColor.equals(B.Color3.Black()) && mat.alpha === 1 && !mat.name.startsWith("vc") && !keep.includes(mat)) {
      const c = mat.albedoColor, k = mat.clearCoat.isEnabled ? mat.clearCoat.intensity : 0;
      for (let v = sm.verticesStart * 4, e = (sm.verticesStart + sm.verticesCount) * 4; v < e; v += 4) { col[v] = c.r; col[v + 1] = c.g; col[v + 2] = c.b; }
      mat = pbr(`vc${mat.roughness}|${mat.metallic}|${k}`, { color: "#ffffff", rough: mat.roughness ?? 0.5, metal: mat.metallic ?? 0, coat: k });
    }
    (groups.get(mat) ?? groups.set(mat, []).get(mat)!).push(sm);
  }
  const out = new Uint32Array(idx.length), mats: B.Material[] = [], ranges: [number, number][] = [];
  let n = 0;
  for (const [mat, subs] of groups) {
    const a = n;
    for (const sm of subs) for (let i = 0; i < sm.indexCount; i++) out[n++] = idx[sm.indexStart + i];
    mats.push(mat); ranges.push([a, n - a]);
  }
  const nm = new B.MultiMaterial(m.name + "_vc", m.getScene());
  nm.subMaterials = mats;
  m.setVerticesData(B.VertexBuffer.ColorKind, col, false, 4);
  m.setIndices(out, nv);
  m.releaseSubMeshes();
  ranges.forEach(([a, c], i) => new B.SubMesh(i, 0, nv, a, c, m));
  m.material = nm;
  multi.dispose();
}

// ---------- Plantillas instanciables ----------
const templates = new Map<string, B.Mesh>();
export function template(name: string, build: () => B.Mesh[], scale = 1) {
  let t = templates.get(name);
  if (!t) {
    tessK = scale;
    try { t = merge(name, build()); } finally { tessK = 1; }
    if (scale !== 1) { t.scaling.setAll(scale); t.bakeCurrentTransformIntoVertices(); }
    t.position.y = -500; // la fuente queda escondida; se dibujan las instancias
    shadows.addShadowCaster(t);
    templates.set(name, t);
  }
  return t;
}

// Estilo de rueda (garaje → Ruedas): "" de serie, oruga (tacos chatos; la banda va en la carrocería), todoterreno (tacos grandes),
// lisa (de carrera: ancha y sin flancos) y rayos (8 rayos finos de colores). Todo en la misma malla: sigue siendo una instancia por rueda.
const SPOKES = ["#ef4444", "#f59e0b", "#facc15", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6"];
export function wheel(d: number, w: number, rim: string, style = "") {
  const around = (n: number, f: (a: number) => B.Mesh) => Array.from({ length: n }, (_, k) => f((k * Math.PI * 2) / n));
  if (style === "fold") return merge("wheel", foldWheel(d, w, rim)); // vertical slice Folded (?folded2)
  const lisa = style === "lisa", W = lisa ? w * 1.25 : w;
  return merge("wheel", [
    cyl(d, d, W, M.rubber(), [0, 0, 0], [0, 0, Math.PI / 2], 16),
    ...(lisa ? [] : [-1, 1].map((sd) => tor(d * 0.98, w * 0.35, M.rubber(), [sd * w * 0.3, 0, 0], [0, 0, Math.PI / 2], 16))),
    ...(style === "todoterreno" ? around(10, (a) => box(w * 1.2, d * 0.12, d * 0.17, M.rubber(), [0, Math.sin(a) * d * 0.5, Math.cos(a) * d * 0.5], [a, 0, 0])) : []),
    ...(style === "oruga" ? around(14, (a) => box(w * 1.1, d * 0.06, d * 0.09, M.rubber(), [0, Math.sin(a) * d * 0.5, Math.cos(a) * d * 0.5], [a, 0, 0])) : []),
    cyl(d * 0.62, d * 0.62, W * 1.04, M.metal(style === "rayos" ? "#e5e7eb" : rim), [0, 0, 0], [0, 0, Math.PI / 2], 20),
    cyl(d * 0.52, d * 0.52, W * 1.1, M.plastic("#f0f2f5"), [0, 0, 0], [0, 0, Math.PI / 2], 20), // banda blanca toy
    cyl(d * 0.46, d * 0.46, W * 1.12, M.matte("#0a0b0e"), [0, 0, 0], [0, 0, Math.PI / 2], 20),
    ...(style === "rayos" ? around(8, (a) => box(W * 1.1, d * 0.46, d * 0.04, M.plastic(SPOKES[Math.round((a / Math.PI / 2) * 8) % 8]), [0, 0, 0], [a, 0, 0]))
      : around(5, (a) => box(W * 1.1, d * 0.46, d * 0.07, M.metal(rim), [0, 0, 0], [a, 0, 0]))), // 5 rayos
    cyl(d * 0.2, d * 0.2, W * 1.14, M.metal(), [0, 0, 0], [0, 0, Math.PI / 2], 14),
  ]);
}

// Sombras de los autos: la carrocería (y cada rueda) tiene varias submallas, una por material, y cada cascada de sombra las dibuja todas aunque el mapa solo
// guarda la silueta. Una malla gemela de UNA submalla (los triángulos opacos: el vidrio no proyectaba, sigue igual) hace ese trabajo: es hija de la original (misma pose),
// vive en una capa que ninguna cámara dibuja y es la única que entra a la lista de proyectores (ver `cast` en CarModel).
const SHADOW_ONLY = 0x10000000;
let proxyMat: B.StandardMaterial | undefined;
function shadowProxy(m: B.Mesh) {
  const multi = m.material;
  if (!(multi instanceof B.MultiMaterial)) return null;
  const idx = m.getIndices()!, ind: number[] = [];
  for (const sm of m.subMeshes) {
    const mat = multi.subMaterials[sm.materialIndex];
    if (mat && mat.alpha < 1) continue;
    for (let i = 0; i < sm.indexCount; i++) ind.push(idx[sm.indexStart + i]);
  }
  const p = new B.Mesh(m.name + "Sh", scene), vd = new B.VertexData();
  vd.positions = m.getVerticesData(B.VertexBuffer.PositionKind)!; vd.normals = m.getVerticesData(B.VertexBuffer.NormalKind)!; vd.indices = ind;
  vd.applyToMesh(p);
  p.material = proxyMat ??= new B.StandardMaterial("shadowOnly", scene);
  p.layerMask = SHADOW_ONLY;
  p.isPickable = false;
  return p;
}

// Las ruedas de todos los autos son instancias de una fuente por (diámetro, ancho, llanta): Babylon dibuja todas juntas en una sola llamada por submalla
// (40 ruedas de la carrera = 3 dibujos por pasada en vez de 160). Se arman con la teselación de los autos (tessK) y quedan en caché.
const wheelSrc = new Map<string, B.Mesh>(), wheelSh = new Map<string, B.Mesh | null>(); // fuentes por (diámetro, ancho, llanta); gemelas de sombra por (diámetro, ancho): la silueta no depende de la llanta
function wheelInst(d: number, w: number, rim: string, style = "") {
  const k = `${d}|${w}|${style}`;
  let m = wheelSrc.get(`${k}|${rim}`);
  if (!m) {
    m = wheel(d, w, rim, style);
    m.position.y = -500; // la fuente queda escondida, como las plantillas: se dibujan las instancias
    m.isPickable = false;
    wheelSrc.set(`${k}|${rim}`, m);
    if (!wheelSh.has(k)) { const sh = shadowProxy(m); if (sh) sh.position.y = -500; wheelSh.set(k, sh); if (sh) shadows.addShadowCaster(sh); }
    if (!wheelSh.get(k)) shadows.addShadowCaster(m); // sin gemela (una sola submalla): la fuente misma proyecta
  }
  const inst = m.createInstance("wheel"), shi = wheelSh.get(k)?.createInstance("wheelSh");
  if (shi) { shi.parent = inst; shi.layerMask = SHADOW_ONLY; }
  return { inst, cast: shi ?? inst };
}

// ---------- Autos del jugador ----------
/** `cast`: lo que entra a la lista de proyectores de sombra (gemelas de una submalla; ver shadowProxy), en vez de la carrocería y las ruedas. */
export type CarModel = { body: B.Mesh; wheels: { m: B.AbstractMesh; front: boolean; r: number }[]; paint: B.PBRMaterial; cast: B.AbstractMesh[] };
export type CarKind = "buggy" | "monster" | "formula" | "tanque" | "carrera" | "axel" | "helado" | "combi";

// Paletas del taller
// Una sola paleta para las tres zonas (carrocería, detalles, llantas): vivos, pasteles y tonos metálicos. Los primeros 8 son los de siempre.
export const PAINTS = ["#d62828", "#1d4ed8", "#16a34a", "#f59e0b", "#e5e7eb", "#18181b", "#7c3aed", "#ea580c",
  "#ffc300", "#2a9d8f", "#ff4fa3", "#6b7a3a", "#0f3d3e", "#4cc3c9",
  "#f4a6c1", "#a8d8ea", "#b8e0b0", "#fde68a", "#c9b6e4", "#ffc8a2",
  "#c0c0c0", "#d4af37", "#b87333", "#5b6470"];

// Piezas visuales del garaje: [nombre, precio en tornillos]. La primera opción de cada ranura viene de fábrica.
export const PARTS = {
  wing: { name: "Alerón", opts: { serie: ["De serie", 0], alto: ["Alerón alto", precio("pieza_wing_alto")], doble: ["Biplano", precio("pieza_wing_doble")] } },
  decal: { name: "Calcos", opts: { nada: ["Sin calcos", 0], numero: ["Número", precio("pieza_decal_numero")], rayo: ["Rayo", precio("pieza_decal_rayo")], damero: ["Damero", precio("pieza_decal_damero")] } },
  lamp: { name: "Faro", opts: { calido: ["Cálido", 0], ambar: ["Ámbar", precio("pieza_lamp_ambar")], cian: ["Cian", precio("pieza_lamp_cian")], violeta: ["Violeta", precio("pieza_lamp_violeta")] } },
  exhaust: { name: "Escape", opts: { nada: ["Sin escape", 0], doble: ["Doble caño", precio("pieza_exhaust_doble")], chimenea: ["Chimeneas", precio("pieza_exhaust_chimenea")] } },
  bumper: { name: "Defensas", opts: { nada: ["De serie", 0], cano: ["Paragolpes de caño", precio("pieza_bumper_cano")], antivuelco: ["Barra antivuelco", precio("pieza_bumper_antivuelco")], laterales: ["Defensas laterales", precio("pieza_bumper_laterales")] } },
  tires: { name: "Ruedas", opts: { serie: ["De serie", 0], oruga: ["Orugas", precio("pieza_tires_oruga")], todoterreno: ["Todoterreno", precio("pieza_tires_todoterreno")], lisas: ["Lisas de carrera", precio("pieza_tires_lisas")], rayos: ["Rayos de colores", precio("pieza_tires_rayos")] } },
  acc: { name: "Accesorio", opts: { nada: ["Ninguno", 0], pelotita: ["Antena con pelotita", precio("pieza_acc_pelotita")], bocina: ["Bocina de payaso", precio("pieza_acc_bocina")], matafuego: ["Matafuego", precio("pieza_acc_matafuego")], dados: ["Dados de peluche", precio("pieza_acc_dados")], banderita: ["Banderita", precio("pieza_acc_banderita")] } },
} as const satisfies Record<string, { name: string; opts: Record<string, readonly [string, number]> }>;
export type Slot = keyof typeof PARTS;
// Faro: [emisivo de las ópticas, luz del SpotLight]. Nada rojo ni verde (código de amenaza y disparos propios).
const LAMPS: Record<string, [string, string]> = { calido: ["#fff3b0", "#ffe9c2"], ambar: ["#ffb347", "#ffc77a"], cian: ["#9be7ff", "#bdefff"], violeta: ["#c9a7ff", "#d8c2ff"] };
export type CarOpts = { paint?: string; trim?: string; rim?: string; wing?: string; decal?: string; lamp?: string; exhaust?: string; bumper?: string; tires?: string; acc?: string; pilot?: string; sticker?: string; fixed?: boolean }; // fixed: la pintura no se gasta (carrera, garaje): se hornea y ahorra una submalla

// Calco propio del capó (editor del garaje): grilla DECAL_N × DECAL_N, un carácter por celda: "0" = transparente, "1".."8" = DECAL_PAL[n-1].
// Colores de la paleta de UI (docs/ART_DIRECTION.md); sin el rojo de amenaza.
export const DECAL_N = 16;
export const DECAL_PAL = ["#0b0d0a", "#b9d3a4", "#5f7355", "#8dff6a", "#6fb3c4", "#e0a030", "#9a6fb5", "#c8d84a"];
export const DECAL_BLANK = "0".repeat(DECAL_N * DECAL_N);
export const validDecal = (s: unknown): s is string => typeof s === "string" && /^[0-8]+$/.test(s) && s.length === DECAL_N * DECAL_N;
// Dónde va el calco en cada auto: [y, z, lado, cabeceo], sobre la superficie superior que más ve la cámara de partida (detrás y arriba, ~40°).
// Buggy y Fórmula: el plato del alerón de serie. Monster: el techo de la cabina. Tanque: arriba de la torreta (la escotilla tapa el centro). Autito: la cola, que mira a la cámara.
// Con un alerón elegido (alto/doble) el calco va sobre su plato, porque tapa la cubierta o la cola (ver carModel); el techo del Monster no lo tapa.
const SPOT: Record<CarKind, [number, number, number, number]> = {
  buggy: [0.933, -1.0, 0.34, 0.12], monster: [1.212, -0.2, 0.54, 0], formula: [0.653, -1.15, 0.28, 0], tanque: [0.825, -0.15, 0.6, 0], carrera: [0.352, -0.72, 0.4, -0.38], axel: [0.66, -0.3, 0.34, 0], helado: [0.97, 0.55, 0.34, 0], combi: [1.04, -0.1, 0.4, 0],
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
/** Colores de fábrica por zona (el garaje arranca el selector libre desde acá cuando no hay uno elegido). */
export const factoryColor = (k: CarKind) => ({ paint: ANCH[k].paint, trim: "#c9ccd1", rim: ANCH[k].rim });

// Tamaño [ancho, alto, largo] de cada auto (el mismo de CARS en car.ts; se repite aquí para no crear un import circular)
const CARS_SIZE: Record<CarKind, [number, number, number]> = { buggy: [1.3, 0.7, 2.3], monster: [1.8, 1.1, 2.4], formula: [1.3, 0.55, 2.8], tanque: [1.75, 0.9, 2.4], carrera: [1.1, 0.5, 2.1], axel: [1.9, 1.0, 1.7], helado: [1.3, 0.95, 2.4], combi: [1.45, 1.0, 2.4] };
export function carModel(kind: CarKind, o: CarOpts = {}): CarModel {
  const A = ANCH[kind];
  tessK = 2.5;
  const ws: { pos: V3; d: number; w: number; steer?: boolean }[] = [];
  let parts: B.Mesh[];
  let stock: B.Mesh[] = []; // alerón de serie (se reemplaza si se elige otro)
  const paint = pbr("paint" + kind + o.paint, { color: o.paint ?? A.paint, rough: 0.4, coat: 0.8 });
  const trimHex = o.trim ?? "#c9ccd1";
  const fb = FOLDED_SLICE; // Folded (?folded2): carrocerías de chapa (carHull), ruedas foldWheel en las anclas de siempre
  const useGlb = !fb && !!carGlbTpl(kind);
  const glbHull = useGlb ? carGlbHull(kind, o.paint ?? A.paint, trimHex) : null;
  if (glbHull) parts = [glbHull];
  else if (fb) parts = carHull(kind, paint, LAMPS[o.lamp ?? "calido"]?.[0] ?? LAMPS.calido[0]); // ruedas y alerón de serie: bloque de abajo
  else if (kind === "buggy") {
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
      ...[[-0.45, 0.7], [0.45, 0.7], [-0.45, -0.7], [0.45, -0.7]].flatMap(([x, z]) => [cyl(0.14, 0.14, 0.6, M.metal("#ef4444"), [x, 0.2, z], [0, 0, x > 0 ? -0.6 : 0.6], 6), cyl(0.17, 0.17, 0.35, M.metal("#111"), [x, 0.2, z], [0, 0, x > 0 ? -0.6 : 0.6], 6)]),
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

  // Ruedas (mismas anclas con hull GLB o procedural)
  if ((useGlb || fb) && ws.length === 0) {
    if (kind === "buggy") for (const [x, z] of [[-0.72, 0.72], [0.72, 0.72], [-0.72, -0.72], [0.72, -0.72]]) ws.push({ pos: [x, 0, z], d: 0.8, w: 0.36 });
    else if (kind === "monster") for (const [x, z] of [[-0.8, 0.72], [0.8, 0.72], [-0.8, -0.72], [0.8, -0.72]]) ws.push({ pos: [x, -0.05, z], d: 1.15, w: 0.5 });
    else if (kind === "formula") for (const [x, z] of [[-0.62, 0.9], [0.62, 0.9], [-0.66, -0.85], [0.66, -0.85]]) ws.push({ pos: [x, 0, z], d: z < 0 ? 0.72 : 0.6, w: z < 0 ? 0.42 : 0.3 });
    else if (kind === "tanque") for (const z of [-0.6, -0.2, 0.2, 0.6]) for (const x of [-0.72, 0.72]) ws.push({ pos: [x, 0.02, z], d: 0.36, w: 0.34, steer: false });
    else if (kind === "axel") for (const x of [-0.82, 0.82]) ws.push({ pos: [x, 0, 0], d: 1.6, w: 0.42, steer: false });
    else if (kind === "helado") for (const [x, z] of [[-0.62, 0.78], [0.62, 0.78], [-0.62, -0.75], [0.62, -0.75]]) ws.push({ pos: [x, 0, z], d: 0.62, w: 0.3 });
    else if (kind === "combi") for (const [x, z] of [[-0.62, 0.75], [0.62, 0.75], [-0.62, -0.75], [0.62, -0.75]]) ws.push({ pos: [x, 0, z], d: 0.62, w: 0.3 });
    else for (const [x, z] of [[-0.46, 0.66], [0.46, 0.66], [-0.46, -0.66], [0.46, -0.66]]) ws.push({ pos: [x, 0, z], d: 0.52, w: 0.18 });
    if (kind === "buggy" || kind === "formula") {
      stock = [
        box(1.35, 0.05, 0.38, M.plastic("#ffc300"), [0, 0.9, -1.0], [0.12, 0, 0]),
        box(0.05, 0.4, 0.15, M.matte("#222"), [0.4, 0.68, -0.95]),
        box(0.05, 0.4, 0.15, M.matte("#222"), [-0.4, 0.68, -0.95]),
      ];
      if (kind === "formula") {
        stock = [
          box(1.2, 0.05, 0.3, paint, [0, 0.62, -1.15]),
          box(0.05, 0.3, 0.3, M.plastic("#111"), [0.55, 0.47, -1.15]),
          box(0.05, 0.3, 0.3, M.plastic("#111"), [-0.55, 0.47, -1.15]),
        ];
      }
    }
  }

  // Franjas de pintura / molduras (lectura en garaje y a distancia; trim del taller si hay)
  if (!useGlb && !fb) {
    const [bw, bh, bl] = CARS_SIZE[kind];
    const trimM = M.plastic(o.trim ?? "#c9ccd1");
    const dark = M.matte("#14171c");
    const stripe = (w: number, h: number, l: number, mat: B.Material, pos: V3, rot?: V3) => parts.push(box(w, h, l, mat, pos, rot));
    if (kind === "buggy") {
      stripe(bw * 0.96, 0.07, bl * 0.88, dark, [0, bh * 0.2, 0]);
      stripe(0.05, bh * 0.42, bl * 0.55, trimM, [bw * 0.5, bh * 0.48, 0.02]);
      for (const sd of [-1, 1]) stripe(0.12, 0.22, 0.55, M.plastic("#ffc300"), [sd * bw * 0.42, bh * 0.55, -bl * 0.15]);
    } else if (kind === "monster") {
      for (const sd of [-1, 1]) stripe(0.22, 0.35, bl * 0.55, M.plastic("#ef4444"), [sd * (bw * 0.5 + 0.08), bh * 0.55, 0]);
      stripe(bw * 0.55, 0.12, 0.08, dark, [0, bh * 0.92, bl * 0.38]);
    } else if (kind === "formula") {
      stripe(0.12, 0.04, bl * 0.75, M.plastic("#f8fafc"), [0, bh * 0.12, 0.05]);
      stripe(bw * 0.35, 0.06, 0.35, trimM, [0, bh * 0.08, bl * 0.42]);
    } else if (kind === "tanque") {
      stripe(bw * 0.82, 0.08, bl * 0.35, dark, [0, bh * 0.72, bl * 0.08]);
      for (const z of [-0.35, 0.35]) stripe(0.14, bh * 0.55, 0.14, trimM, [bw * 0.38, bh * 0.48, z]);
    } else if (kind === "carrera") {
      stripe(0.08, 0.05, bl * 0.7, M.plastic("#f8fafc"), [bw * 0.48, bh * 0.38, 0]);
      stripe(0.08, 0.05, bl * 0.7, M.plastic("#111"), [-bw * 0.48, bh * 0.38, 0]);
    } else if (kind === "axel") {
      stripe(0.55, 0.1, 0.55, dark, [0, bh * 0.05, 0]);
      for (const sd of [-1, 1]) tor(0.52, 0.04, M.plastic("#facc15"), [sd * 0.98, 0, 0], [0, 0, Math.PI / 2], 8);
    } else if (kind === "helado") {
      stripe(bw * 0.85, 0.08, 0.12, M.plastic("#fff0f5"), [0, bh * 0.62, -bl * 0.35]);
      stripe(0.55, 0.06, bl * 0.5, trimM, [bw * 0.52, bh * 0.55, -0.15]);
    } else if (kind === "combi") {
      for (let i = 0; i < 4; i++) stripe(0.06, 0.14, 0.45, i % 2 ? trimM : M.matte("#d9cba6"), [bw * 0.52, bh * 0.35 + i * 0.16, -bl * 0.2 + i * 0.35]);
      stripe(bw * 0.75, 0.06, 0.2, dark, [0, bh * 0.18, bl * 0.48]);
    }
  }

  // Detalle de juguete realista (todos los autos): aros cromados en los faros, luces traseras, espejos, parrilla y escapes
  if (!useGlb && !fb) {
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
    if (kind === "monster" || kind === "helado" || kind === "combi" || kind === "tanque") {
      parts.push(box(bw * 0.5, 0.2, 0.04, M.matte("#14171c"), [0, bh * 0.38, bl * 0.5 + 0.01]));
      for (let k = 0; k < 4; k++) parts.push(box(bw * 0.46, 0.015, 0.05, chrome, [0, bh * 0.3 + k * 0.045, bl * 0.5 + 0.03])); // parrilla con rejilla
    }
    if (kind === "combi" || kind === "buggy") {
      const ry = kind === "combi" ? bh * 0.42 : bh * 0.35;
      for (const sd of [-1, 1]) {
        for (const rz of [-0.6, -0.3, 0, 0.3, 0.6]) {
          parts.push(sph(0.018, chrome, [sd * (bw * 0.49), ry, rz * (bl * 0.45)], undefined, 4));
        }
      }
    }
    if (kind === "formula") {
      parts.push(
        ...[-0.22, 0.22].map((x) => cyl(0.012, 0.012, 0.35, chrome, [x, 0.16, bl * 0.44], [0.4, 0, x > 0 ? -0.2 : 0.2], 6))
      );
    }
    if (kind === "formula" || kind === "carrera") {
      for (const sd of [-1, 1]) {
        for (const rz of [-bl * 0.36, bl * 0.36]) {
          parts.push(cyl(0.018, 0.018, 0.02, chrome, [sd * (bw * 0.52), 0.12, rz], [0, 0, Math.PI / 2], 6));
        }
      }
    }
    if ((kind as string) === "deportivo" || (kind as string) === "pickup" || kind === "combi") {
      parts.push(cyl(0.024, 0.024, 0.015, chrome, [bw * 0.49, bh * 0.45, -bl * 0.3], [0, 0, Math.PI / 2], 8));
    }
    if (kind !== "tanque") {
      const ax = bw * 0.35, ay = bh * 0.7, az = -bl * 0.42;
      parts.push(
        cyl(0.008, 0.008, 0.65, M.metal("#71717a"), [ax, ay + 0.32, az], [0.1, 0, 0.05], 4),
        box(0.01, 0.08, 0.12, M.plastic("#ef4444"), [ax, ay + 0.6, az - 0.06])
      );
    }
    if (kind !== "axel") for (const sd of [-1, 1]) parts.push(cyl(0.07, 0.07, 0.2, chrome, [sd * bw * 0.22, 0.14, -bl * 0.5 - 0.04], [Math.PI / 2, 0, 0], 12), cyl(0.045, 0.045, 0.22, M.matte("#101010"), [sd * bw * 0.22, 0.14, -bl * 0.5 - 0.05], [Math.PI / 2, 0, 0], 10)); // escapes
  }

  // Ópticas del faro (color elegido) + luz del faro en la escena
  const lamp = LAMPS[o.lamp ?? "calido"] ?? LAMPS.calido;
  if (!useGlb && !fb) for (const [x, y, z, d] of A.lamps) for (const s of x ? [1, -1] : [1]) parts.push(sph(d, M.glow(lamp[0]), [x * s, y, z]));
  const spot = scene.getLightByName("lamp");
  if (spot) spot.diffuse = B.Color3.FromHexString(lamp[1]);

  // Alerón
  const [dy, dz] = A.deck, small = kind === "carrera", wingW = kind === "monster" || kind === "tanque" ? 1.2 : small ? 0.85 : 1.1;
  if (o.wing === "alto" || o.wing === "doble") {
    const fin = M.plastic(o.trim ?? "#18181b"), plate = o.wing === "alto" ? paint : fin; // detalles: aletas (alto) o planos (biplano)
    const top = (o.wing === "alto" ? 0.5 : 0.48) * (small ? 0.7 : 1);
    parts.push(
      ...[-0.3, 0.3].map((x) => box(0.05, top, 0.12, M.matte("#222"), [x, dy + top / 2, dz])),
      ...[-0.22, 0.22].map((x) => cyl(0.015, 0.015, top * 1.1, M.metal("#9aa0a6"), [x, dy + top * 0.45, dz - 0.02], [0.3, 0, 0], 6)),
      box(wingW, 0.05, 0.4, plate, [0, dy + top, dz - 0.04], [0.14, 0, 0]),
      ...[-1, 1].map((s) => box(0.04, o.wing === "alto" ? 0.2 : 0.36, 0.44, o.wing === "alto" ? fin : paint, [s * wingW / 2, dy + top - (o.wing === "alto" ? 0.04 : 0.12), dz - 0.04])),
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

  // Defensas, accesorios y banda de las orugas: piezas del garaje, fusionadas con la carrocería (cero dibujos extra). Anclas: tamaño del auto, asiento y alerón.
  const [px, py, pz, ps] = A.seat;
  {
    const [bw, bh, bl] = CARS_SIZE[kind], tubeM = M.metal(o.trim ?? "#c9ccd1"), dark = M.matte("#1b1e24");
    const acc = (c: string) => M.plastic(o.trim ?? c); // color principal de cada accesorio: el de detalles si hay uno elegido
    if (o.bumper === "cano") parts.push(cyl(0.07, 0.07, bw * 0.95, tubeM, [0, bh * 0.32, bl * 0.5 + 0.12], [0, 0, Math.PI / 2], 8), ...[-1, 1].map((sd) => cyl(0.06, 0.06, 0.2, tubeM, [sd * bw * 0.3, bh * 0.32, bl * 0.5 + 0.03], [Math.PI / 2, 0, 0], 6)));
    else if (o.bumper === "antivuelco") { const h = py + 0.55 * ps, x = bw * 0.36, z = pz - 0.3 * ps; parts.push(tube([[-x, py - 0.1, z], [-x, h, z], [x, h, z], [x, py - 0.1, z]], 0.035, tubeM), cyl(0.05, 0.05, x * 2, dark, [0, h, z], [0, 0, Math.PI / 2], 6)); }
    else if (o.bumper === "laterales") for (const sd of [-1, 1]) parts.push(cyl(0.06, 0.06, bl * 0.55, tubeM, [sd * (bw / 2 + 0.07), bh * 0.22, 0], [Math.PI / 2, 0, 0], 8), ...[-1, 1].map((e) => box(0.1, 0.04, 0.04, tubeM, [sd * (bw / 2 + 0.02), bh * 0.22, e * bl * 0.22])));
    if (o.tires === "oruga") for (const sd of [-1, 1]) { // banda de goma por lado, de la rueda delantera a la trasera
      const side = ws.filter((w) => Math.sign(w.pos[0]) === sd); if (side.length < 2) continue;
      const zs = side.map((w) => w.pos[2]), d = Math.max(...side.map((w) => w.d)), ww = side[0].w * 1.15;
      for (const up of [1, -1]) parts.push(box(ww, d * 0.1, Math.max(...zs) - Math.min(...zs) + d * 0.6, M.rubber(), [side[0].pos[0], side[0].pos[1] + up * d * 0.5, (Math.max(...zs) + Math.min(...zs)) / 2]));
    }
    if (o.acc === "pelotita") parts.push(cyl(0.025, 0.025, 0.5, M.metal("#111"), [-0.38, 1.0, -0.7], undefined, 4), sph(0.3, acc("#ffd23f"), [-0.38, 1.35, -0.7]), tor(0.3, 0.04, M.plastic("#ff4d6d"), [-0.38, 1.35, -0.7], undefined, 6));
    else if (o.acc === "bocina") { const x = bw * 0.3, y = bh * 0.7, z = bl * 0.25; parts.push(sph(0.2, acc("#e11d48"), [x, y, z - 0.12]), cyl(0.04, 0.16, 0.24, M.metal("#d4a72c"), [x, y, z + 0.06], [Math.PI / 2, 0, 0], 8)); }
    else if (o.acc === "matafuego") { const x = bw / 2 + 0.02, z = -bl * 0.18; parts.push(cyl(0.13, 0.13, 0.32, acc("#d62828"), [x, bh * 0.45, z], undefined, 8), cyl(0.06, 0.06, 0.06, M.matte("#111"), [x, bh * 0.45 + 0.19, z], undefined, 6), box(0.03, 0.03, 0.12, M.matte("#111"), [x, bh * 0.45 + 0.22, z + 0.05])); }
    else if (o.acc === "dados") for (const [dx, r] of [[-0.07, 0.4], [0.07, -0.3]] as const) parts.push(box(0.1, 0.1, 0.1, acc("#f9a8d4"), [px + 0.2 + dx, py + 0.5 * ps, pz + 0.35 * ps], [r, r, 0]), box(0.11, 0.025, 0.025, M.plastic("#111"), [px + 0.2 + dx, py + 0.5 * ps, pz + 0.35 * ps], [r, r, 0]));
    else if (o.acc === "banderita") { const x = -bw * 0.38, z = -bl * 0.42; parts.push(cyl(0.025, 0.025, 1.0, M.metal("#e5e7eb"), [x, bh * 0.5 + 0.5, z], undefined, 4), box(0.02, 0.2, 0.32, acc("#f97316"), [x, bh * 0.5 + 0.88, z - 0.16])); }
  }

  // Piloto sentado (GLB trae soldadito blockout; otro piloto sustituye)
  const pilotId = o.pilot ?? "soldadito";
  if (!useGlb || pilotId !== "soldadito") for (const m of pilotParts(pilotId)) { m.position.scaleInPlace(ps).addInPlaceFromFloats(px, py, pz); m.scaling.scaleInPlace(ps); parts.push(m); }

  // Antena, siempre: es un auto RC
  parts.push(cyl(0.03, 0.03, 1.3, M.metal("#111"), [0.38, 0.95, -0.7], undefined, 4), sph(0.12, M.plastic("#ff4d6d"), [0.38, 1.6, -0.7]));
  const rim = o.rim ?? A.rim;
  // Hull GLB ya está aplanado (vertex color): fusionarlo con piezas del garaje suele hacer fallar MergeMeshes.
  let body: B.Mesh;
  if (useGlb && glbHull) {
    body = glbHull;
    body.name = "carBody";
    body.receiveShadows = true;
    for (const p of parts) if (p !== glbHull) { p.parent = body; shadows.addShadowCaster(p); }
  } else body = merge("carBody", parts, useGlb || o.fixed ? [] : [paint]);
  const cast: B.AbstractMesh[] = [];
  const bodySh = shadowProxy(body);
  if (bodySh) bodySh.parent = body;
  cast.push(bodySh ?? body);
  const wheels = ws.map((w) => {
    const { inst: m, cast: c } = wheelInst(w.d, w.w, rim, fb && (!o.tires || o.tires === "serie") && kind !== "tanque" ? "fold" : o.tires === "serie" ? "" : o.tires === "lisas" ? "lisa" : o.tires ?? "");
    m.position = v(w.pos);
    m.parent = body;
    cast.push(c);
    return { m, front: w.steer !== false && w.pos[2] > 0, r: w.d / 2 };
  });
  tessK = 1;
  return { body, wheels, paint, cast };
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
  const army = M.plastic("#55642c"), face = M.matte("#3d4a22");
  return [
    cyl(0.19, 0.24, 0.28, army, [0, 0.14, 0], undefined, 8), ...arms(army), box(0.16, 0.16, 0.08, army, [0, 0.16, -0.13]),
    sph(0.19, army, [0, 0.37, 0]), sph(0.23, army, [0, 0.42, 0], [1, 0.55, 1]), tor(0.24, 0.025, M.plastic("#e0a030"), [0, 0.41, 0], undefined, 10),
    box(0.14, 0.05, 0.02, face, [0, 0.4, 0.1]),
    sph(0.035, M.plastic("#111"), [0.05, 0.42, 0.11], undefined, 4), sph(0.035, M.plastic("#111"), [-0.05, 0.42, 0.11], undefined, 4),
  ];
}

// ---------- Enemigos ----------

const VIS_1C = 1.22; // oleada 1c: silueta más legible en bestiario (no toca DEF.size ni colisión)
const vis1c = (k: string, s: number) => s * (["friccion", "robot", "cortadora", "aspiradora", "cortacercos"].includes(k) ? VIS_1C : 1);

export function enemyTemplate(kind: string, scale = 1): B.Mesh {
  return template(kind, () => {
    // Plaga/jefes con GLB (glb.ts): hormiga, escupidora, escarabajo, friccion, robot, rey, tarantula, cortadora, aspiradora, cortacercos, perro, gato
    if (kind === "rey") {
      // Minijefe: elytra ancha, costura y cuerno; ojos lima como escarabajo (GLB)
      const shell = M.metal("#d4a017"), shellHi = M.metal("#e8bc28");
      const dark = M.plastic("#111");
      return [
        sph(1.78, shell, [0, 0.56, -0.22], [1, 0.78, 1.48], 10),
        sph(1.35, shellHi, [0, 0.74, -0.38], [1, 0.42, 1.15], 8),
        box(0.06, 0.58, 2.05, dark, [0, 0.8, -0.22]),
        box(0.42, 0.1, 1.55, dark, [0, 0.54, -0.22]),
        sph(0.88, dark, [0, 0.44, 1.02]),
        cyl(0.04, 0.26, 1.05, dark, [0, 0.8, 1.48], [1.02, 0, 0], 6),
        sph(0.14, shellHi, [0, 0.98, 2.02]),
        sph(0.34, M.glow("#d0ff60"), [0.32, 0.56, 1.38]),
        sph(0.34, M.glow("#d0ff60"), [-0.32, 0.56, 1.38]),
        sph(0.14, M.glow("#b8e838"), [0, 0.64, 1.28], undefined, 4),
        box(0.18, 0.42, 1.35, M.plastic("#f5f0c8"), [0.62, 0.72, -0.22]),
        box(0.18, 0.42, 1.35, M.plastic("#f5f0c8"), [-0.62, 0.72, -0.22]),
      ];
    }
    // ponytail: siluetas oleada2 (Kenney toy car / wind-up bot); extraer a models/enemies/{friccion,robot}.ts si crece más
    if (kind === "friccion") {
      const orange = M.plastic("#ff6b0a");
      const dark = M.matte("#0d0a08");
      const chrome = M.metal("#f0f4ff");
      const lamp = M.glow("#fff8e8");
      return [
        box(0.72, 0.06, 1.55, dark, [0, 0.03, 0]),
        extrude([[-1.02, 0.04], [0.98, 0.04], [1.08, 0.14], [0.92, 0.28], [0.35, 0.34], [0.05, 0.52], [-0.35, 0.5], [-0.78, 0.38], [-1.02, 0.22]], 0.76, orange, [0, 0.06, 0]),
        box(0.48, 0.22, 0.38, M.glass(), [0, 0.44, -0.05], [-0.55, 0, 0]),
        box(0.58, 0.04, 0.14, orange, [0, 0.48, -0.82]),
        box(0.02, 0.18, 0.1, orange, [0.28, 0.54, -0.82]),
        box(0.02, 0.18, 0.1, orange, [-0.28, 0.54, -0.82]),
        tube([[-0.36, 0.14, 1.02], [0, 0.11, 1.08], [0.36, 0.14, 1.02]], 0.035, chrome),
        box(0.06, 0.04, 0.55, M.plastic("#f8fafc"), [0, 0.38, 0.35]),
        ...[[0.32, 0.2], [-0.32, 0.2]].flatMap(([x, y]) => [tor(0.22, 0.035, chrome, [x, y, 0.92], [Math.PI / 2, 0, 0], 10), sph(0.16, lamp, [x, y, 0.97], undefined, 6)]),
        cyl(0.09, 0.09, 0.18, chrome, [0.42, 0.22, -0.15], [0, 0, Math.PI / 2], 8),
        ...[[-0.4, 0.48], [0.4, 0.48], [-0.4, -0.48], [0.4, -0.48]].map(([x, z]) => cyl(0.46, 0.46, 0.2, M.rubber(), [x, 0.14, z], [0, 0, Math.PI / 2], 10)),
        ...[[-0.4, 0.48], [0.4, 0.48]].map(([x, z]) => sph(0.1, orange, [x, 0.32, z], undefined, 4)),
      ];
    }
    if (kind === "robot") {
      const tin = M.metal("#ff3b30");
      const tinDark = M.metal("#991b1b");
      const joint = M.metal("#b8c0cc");
      const lamp = M.glow("#ffe566");
      const chrome = M.metal("#d4a017");
      const arm = (sx: number) => [
        cyl(0.1, 0.1, 0.35, joint, [sx * 0.48, 0.78, 0.12], [0, 0, -sx * 0.7], 8),
        box(0.16, 0.48, 0.16, tin, [sx * 0.62, 0.62, 0.28], [0.4, 0, -sx * 0.5]),
        cyl(0.08, 0.1, 0.22, joint, [sx * 0.72, 0.42, 0.38], [0.5, 0, 0], 8),
      ];
      return [
        box(0.42, 0.12, 0.55, tinDark, [0.28, 0.08, 0.05]),
        box(0.42, 0.12, 0.55, tinDark, [-0.28, 0.08, 0.05]),
        cyl(0.14, 0.16, 0.22, joint, [0.28, 0.24, 0.05], undefined, 8),
        cyl(0.14, 0.16, 0.22, joint, [-0.28, 0.24, 0.05], undefined, 8),
        cyl(0.52, 0.58, 0.72, tin, [0, 0.68, 0], undefined, 10),
        cyl(0.48, 0.52, 0.08, tinDark, [0, 0.32, 0], undefined, 10),
        box(0.7, 0.55, 0.45, tin, [0, 0.72, 0.02]),
        cyl(0.38, 0.42, 0.32, tin, [0, 1.28, 0.02], undefined, 10),
        sph(0.4, tin, [0, 1.48, 0.02], [1, 0.75, 1], 8),
        box(0.52, 0.14, 0.06, M.matte("#111"), [0, 1.32, 0.24]),
        box(0.38, 0.08, 0.06, M.metal("#d4a017"), [0, 0.52, 0.26]),
        sph(0.14, lamp, [0.16, 1.34, 0.28], undefined, 6),
        sph(0.14, lamp, [-0.16, 1.34, 0.28], undefined, 6),
        cyl(0.025, 0.025, 0.38, joint, [0, 1.7, 0], undefined, 4),
        sph(0.07, M.glow("#e0a030"), [0, 1.92, 0], undefined, 4),
        ...arm(1),
        ...arm(-1),
        cyl(0.06, 0.06, 0.12, joint, [0, 0.72, -0.38], [Math.PI / 2, 0, 0], 6),
        tor(0.22, 0.045, chrome, [0, 0.76, -0.48], [Math.PI / 2, 0, 0], 12),
        ...[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a) => box(0.06, 0.32, 0.05, chrome, [Math.sin(a) * 0.22, 0.76, -0.48 - Math.cos(a) * 0.22], [0, a, 0])),
      ];
    }
    if (kind === "cortadora") {
      // Juguete ride-on: plataforma gris, capó rojo alto, volante y barra de corte al frente (lectura a distancia)
      const red = M.plastic("#dc2626"), deck = M.metal("#8b95a3"), dark = M.matte("#141414");
      return [
        cyl(5.8, 6.2, 1.05, deck, [0, 0.82, -0.15], undefined, 16),
        box(6.4, 0.35, 2.2, dark, [0, 0.42, 2.85]),
        box(6.2, 0.22, 0.55, M.metal("#d6dbe1"), [0, 0.58, 3.35]),
        extrude([[-3.2, 0], [3.2, 0], [3.2, 1.05], [2.2, 2.05], [-0.2, 2.35], [-3.2, 1.35]], 4.8, red, [0, 1.22, -0.35]),
        box(2.2, 0.55, 1.4, M.plastic("#b91c1c"), [0, 2.05, -0.2]),
        cyl(2.05, 2.15, 0.35, dark, [0, 3.35, 0.15], undefined, 10),
        box(2.5, 0.12, 0.12, M.metal("#d6dbe1"), [0, 3.55, 0.15]),
        box(0.12, 0.12, 2.5, M.metal("#d6dbe1"), [0, 3.55, 0.15]),
        box(3.4, 0.45, 0.7, dark, [0, 3.05, -2.75]),
        tube([[-2, 2.35, -2.95], [-2, 5.2, -5.2], [-2, 7.8, -6.35], [2, 7.8, -6.35], [2, 5.2, -5.2], [2, 2.35, -2.95]], 0.2, dark),
        box(0.85, 0.12, 3.6, M.plastic("#facc15"), [2.55, 1.35, -0.1]),
        ...[[-2.95, 2.35], [2.95, 2.35], [-2.95, -2.55], [2.95, -2.55]].map(([x, z]) => cyl(2, 2, 0.85, M.rubber(), [x, 0.88, z], [0, 0, Math.PI / 2], 12)),
        ...[[-3.35, 2.35], [3.35, 2.35], [-3.35, -2.55], [3.35, -2.55]].map(([x, z]) => cyl(1.05, 1.05, 0.2, M.metal("#fbbf24"), [x, 0.88, z], [0, 0, Math.PI / 2], 8)),
      ];
    }
    if (kind === "polilla") {
      // Cuerpo peludo y antenas plumosas; las alas van aparte (wingTemplate) para aletear
      const fur = M.matte("#d8c690");
      const eye = pbr("mothEye", { color: "#c9a0ff", emissive: "#f0d8ff", rough: 0.35 });
      const eyeCore = pbr("mothEyeCore", { color: "#ffffff", emissive: "#ffffff", rough: 0.2 });
      return [
        sph(0.54, fur, [0, 0, -0.38], [0.85, 0.78, 1.55]),
        sph(0.46, M.matte("#a8966c"), [0, 0.03, 0.1]),
        sph(0.34, fur, [0, 0.03, 0.4]),
        ...[-1, 1].flatMap((sx) => [
          tube([[sx * 0.08, 0.12, 0.44], [sx * 0.16, 0.25, 0.52], [sx * 0.25, 0.38, 0.55]], 0.02, fur),
          sph(0.06, fur, [sx * 0.14, 0.21, 0.48], [1.3, 0.6, 0.8]),
          sph(0.06, fur, [sx * 0.22, 0.33, 0.54], [1.3, 0.6, 0.8]),
          sph(0.2, eye, [sx * 0.11, 0.06, 0.5]),
          sph(0.08, eyeCore, [sx * 0.11, 0.06, 0.52]),
        ]),
      ];
    }
    if (kind === "tarantula") {
      // Cefalotórax + abdomen con banda naranja, quelíceros gruesos; 8 patas en LEGS
      const hair = M.matte("#7a55a8"), band = M.plastic("#c87830"), dark = M.matte("#4a3228");
      return [
        sph(1.5, hair, [0, 0.6, -0.82], [1, 0.88, 1.22], 10),
        tor(1.08, 0.24, band, [0, 0.64, -0.58], [Math.PI / 2, 0, 0], 12),
        sph(1.0, M.matte("#8a4a22"), [0, 0.92, -0.9], [1, 0.38, 1.05], 8),
        sph(1.08, dark, [0, 0.5, 0.34], [1, 0.68, 1.22], 10),
        cyl(0.07, 0.22, 0.48, M.plastic("#2a1810"), [0.17, 0.28, 0.98], [2.55, 0, 0], 5),
        cyl(0.07, 0.22, 0.48, M.plastic("#2a1810"), [-0.17, 0.28, 0.98], [2.55, 0, 0], 5),
        cyl(0.1, 0.13, 0.68, dark, [0.3, 0.4, 0.9], [1.25, 0, -0.38], 5),
        cyl(0.1, 0.13, 0.68, dark, [-0.3, 0.4, 0.9], [1.25, 0, 0.38], 5),
        sph(0.18, M.glow("#ff4fd8"), [0.12, 0.7, 0.74]),
        sph(0.18, M.glow("#ff4fd8"), [-0.12, 0.7, 0.74]),
        ...[[0.22, 0.64, 0.62], [-0.22, 0.64, 0.62], [0.16, 0.72, 0.54], [-0.16, 0.72, 0.54], [0, 0.76, 0.66]].map((p) => sph(0.08, M.glow("#ff4fd8"), p as V3, undefined, 4)),
      ];
    }
    if (kind === "aspiradora") {
      // Disco bajo tipo juguete: paragolpes negro, domo gris, torreta y ojos rojos grandes al frente (+z)
      const shell = M.plastic("#7a8fa6"), dark = M.matte("#111"), bumper = M.rubber();
      return [
        tor(6.45, 0.42, bumper, [0, 0.48, 0], undefined, 20),
        cyl(6.15, 6.45, 0.75, shell, [0, 0.62, 0], undefined, 20),
        sph(4.2, shell, [0, 1.05, 0], [1, 0.42, 1], 8),
        cyl(5.4, 5.7, 0.2, M.metal("#5c6b7a"), [0, 1.22, 0], undefined, 18),
        box(4.8, 0.14, 0.35, M.plastic("#facc15"), [0, 1.28, 0.2]),
        cyl(1.45, 1.55, 0.65, dark, [0, 1.75, -0.35], undefined, 10),
        sph(0.75, M.glow("#ff2a1a"), [0, 2.05, 0.15], undefined, 6),
        cyl(1.35, 1.35, 0.14, M.plastic("#c8ccd2"), [0, 1.55, 1.05], undefined, 12),
        box(3.6, 0.38, 0.55, dark, [0, 0.32, 3.05]),
        sph(0.62, M.glow("#ff2a1a"), [1.05, 0.88, 3.12]),
        sph(0.62, M.glow("#ff2a1a"), [-1.05, 0.88, 3.12]),
        ...[-1, 1].flatMap((s) => [
          cyl(1.65, 1.65, 0.1, dark, [s * 2.75, 0.14, 2.45], undefined, 6),
          ...[0, 1, 2].map((k) => box(0.14, 0.08, 2.1, M.matte("#9ca3af"), [s * 2.75, 0.2, 2.45], [0, k * 1.15, 0])),
        ]),
      ];
    }
    if (kind === "cortacercos") {
      // Herramienta eléctrica toy: bloque naranja atrás, mango en D, espada larga dentada hacia +z
      const body = M.plastic("#e0a030"), dark = M.matte("#1a1a1a"), steel = M.metal("#9ca3af");
      return [
        box(2.65, 1.65, 3.2, body, [0, 1.12, -2.75]),
        sph(2.85, body, [0, 1.95, -2.65], [1, 0.5, 1.15], 8),
        box(2.7, 0.55, 2.6, dark, [0, 0.42, -2.7]),
        box(0.55, 0.35, 1.1, M.plastic("#c2410c"), [0, 1.05, -1.35]),
        tor(2.35, 0.28, dark, [0, 2.25, -0.75], [Math.PI / 2, 0, 0], 12),
        tube([[0, 1.75, -4.25], [0, 2.85, -4.85], [0, 2.55, -5.35], [0, 1.35, -5.05]], 0.22, dark),
        box(0.35, 0.55, 0.45, dark, [0.95, 2.05, -0.55]),
        box(0.85, 0.28, 5.9, steel, [0, 0.92, 2.75]),
        box(0.55, 0.22, 5.5, M.metal("#6b7280"), [0, 0.78, 2.75]),
        ...Array.from({ length: 8 }, (_, i) => [-1, 1].map((s) => box(0.42, 0.18, 0.28, M.metal("#e5e7eb"), [s * 0.52, 0.92, -0.15 + i * 0.72]))).flat(),
        sph(0.42, M.glow("#ff2a1a"), [0.72, 2.15, -1.15]),
        sph(0.42, M.glow("#ff2a1a"), [-0.72, 2.15, -1.15]),
        tube([[0, 0.92, -4.25], [0, 0.28, -4.95], [0.75, 0.08, -5.65]], 0.16, dark),
      ];
    }
    throw new Error(`enemyTemplate: ${kind} no tiene modelo procedural (los GLB van por glb.ts)`);
  }, vis1c(kind, scale));
}

// ---------- Patas articuladas (instancias animadas aparte) ----------
// Pata del lado derecho: cadera en el origen, fémur hacia arriba y afuera, tibia hasta el piso.
// yaw (opcional): abre cada pata hacia adelante/atrás (lado derecho; el izquierdo se espeja)
export const LEGS: Record<string, { hips: [number, number, number][]; len: number; r: number; color: string; scale: number; yaw?: number[]; knee?: string }> = {
  rey: { hips: [[0.58, 0.36, -0.55], [0.62, 0.36, 0], [0.58, 0.36, 0.55]], len: 1.14, r: 0.095, color: "#3c4450", scale: 3.5, knee: "#6ef040" },
  tarantula: { hips: [[0.38, 0.44, -0.12], [0.42, 0.44, 0.14], [0.42, 0.44, 0.38], [0.36, 0.44, 0.62]], len: 1.62, r: 0.125, color: "#4a3228", scale: 3, yaw: [0.82, 0.28, -0.28, -0.78], knee: "#ff6fe8" },
};
// Fémur + tibia + tarso; espejo en enemies.ts. Fuente Blender: build_rey_leg / build_tarantula_leg (proc2/meshes.py).
function articulatedLegMeshes(L: (typeof LEGS)[string], hair: boolean) {
  const hy = L.hips[0][1];
  const leg = M.plastic(L.color);
  const kneeMat = L.knee ? M.glow(L.knee) : leg;
  const knee: V3 = [L.len * 0.48, L.len * 0.32, 0];
  const foot: V3 = [L.len * 0.98, -hy + 0.02, 0.06];
  return [
    tube([[0, 0, 0], [L.len * 0.25, L.len * 0.22, 0], knee], L.r * 1.05, leg),
    tube([knee, [L.len * 0.72, L.len * 0.05, 0.03], foot], L.r * 0.82, leg),
    sph(L.r * 2.5, leg, [L.len * 0.2, L.len * 0.16, 0], [1.12, 0.88, 1.08], 4),
    sph(L.r * 3.3, kneeMat, knee, undefined, 4),
    sph(L.r * 1.9, leg, foot, [1.25, 0.32, 0.95], 4),
    cyl(L.r * 0.7, L.r * 0.3, L.r * 1.4, leg, foot, [0.15, 0, 0.35], 4),
    ...(hair ? [0.32, 0.52, 0.72].map((t) => sph(0.2, M.matte(L.color), [L.len * (0.5 + t * 0.35), L.len * (0.26 - t * 0.2), 0.02], [1.35, 0.55, 1.15], 3)) : []),
  ];
}
export function legTemplate(kind: string) {
  const L = LEGS[kind];
  return template("leg_" + kind, () => FOLDED_SLICE ? foldLeg(L) : articulatedLegMeshes(L, kind === "tarantula"), L.scale);
}

// Ala de polilla: bisagra que nace en el tórax (x = 0), ala anterior y posterior con venas y ocelos
export const wingTemplate = (side: 1 | -1 = 1) => template("wing_polilla_" + (side > 0 ? "R" : "L"), () => {
  if (FOLDED_SLICE) return mothWing(side); // vertical slice Folded (?folded2)
  const wing = pbr("mothWing", { color: "#d4c090", rough: 0.86, alpha: 0.92 });
  const wingH = pbr("mothWingH", { color: "#a89068", rough: 0.88, alpha: 0.9 });
  const spot = pbr("mothWingSpot", { color: "#e8d8b0", rough: 0.7, alpha: 0.85 });
  const vein = M.matte("#5a4830");
  const dark = M.matte("#2a1810");
  const joint = M.matte("#8a7550");
  const s = side;
  return [
    // Raíz y bisagra articulada: conecta directamente al costado del tórax (x = 0)
    sph(0.12, joint, [s * 0.04, 0, 0], [1.2, 0.8, 0.9], 4),
    tube([[0, 0, 0], [s * 0.16, 0.02, 0], [s * 0.38, 0.03, -0.02]], 0.03, vein),
    // Ala anterior (forewing): pala aerodinámica ancha
    sph(1.2, wing, [s * 0.72, 0.02, -0.04], [1.35, 0.04, 1.05], 6),
    sph(0.68, wingH, [s * 0.52, -0.01, 0.18], [1.18, 0.05, 0.88], 5),
    sph(0.38, wingH, [s * 0.88, 0.0, 0.04], [1.15, 0.04, 0.8], 5),
    // Ala posterior (hindwing): más corta y redondeada, debajo hacia atrás
    sph(0.85, wing, [s * 0.48, -0.02, -0.24], [1.1, 0.04, 0.95], 5),
    sph(0.42, wingH, [s * 0.68, -0.02, -0.22], [1.05, 0.04, 0.85], 5),
    // Ocelo y marcas oscuras
    sph(0.28, dark, [s * 0.78, 0.03, -0.06], [1.1, 0.08, 1.0], 4),
    sph(0.18, spot, [s * 0.78, 0.04, -0.06], [1.05, 0.06, 0.9], 4),
    ...[[s * 0.46, 0.05, 0.08], [s * 0.88, -0.01, -0.16], [s * 0.32, 0.08, 0.28], [s * 0.62, 0.06, 0.22]].map(
      (p) => sph(0.18, dark, p as V3, [1.15, 0.07, 1.05], 4)
    ),
    // Venas estructurales que nacen del tronco
    tube([[s * 0.16, 0.02, 0], [s * 0.65, 0.03, 0.05], [s * 1.05, 0.0, -0.08]], 0.012, vein),
    tube([[s * 0.16, 0.02, 0], [s * 0.52, 0.01, 0.18], [s * 0.82, -0.01, 0.14]], 0.01, vein),
    tube([[s * 0.16, 0.02, 0], [s * 0.45, -0.01, -0.22], [s * 0.75, -0.02, -0.28]], 0.01, vein),
  ];
}, FOLDED_SLICE ? 1.3 : 1); // slice: alas más grandes, se leen desde la cámara de partida

// Llave de cuerda para el robot a cuerda (gira en vivo en la espalda al caminar o idle)
export const windKeyTemplate = () => template("wind_key", () => {
  const chrome = M.metal("#d4a017");
  const joint = M.metal("#b8c0cc");
  return [
    cyl(0.06, 0.06, 0.16, joint, [0, 0, 0], [Math.PI / 2, 0, 0], 6),
    tor(0.24, 0.045, chrome, [0, 0, -0.08], [Math.PI / 2, 0, 0], 12),
    ...[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a) =>
      box(0.06, 0.32, 0.05, chrome, [Math.sin(a) * 0.22, 0, -0.08 - Math.cos(a) * 0.22], [0, a, 0])
    ),
  ];
});
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
    d.material = pbr("teleFillArc", { color: "#ff2a1a", rough: 1, emissive: "#c01808", alpha: 0.28 });
    const edge: V3[] = [[0, 0.02, 0], ...Array.from({ length: 13 }, (_, i) => { const a = -Math.PI / 3 + (i * Math.PI) / 18; return [Math.sin(a), 0.02, Math.cos(a)] as V3; }), [0, 0.02, 0]];
    return [d, tube(edge, 0.045, M.glow("#ff2a1a")), tor(1.88, 0.04, M.glow("#ff5a45"), [0, 0.02, 0], [Math.PI / 2, 0, 0], 20)];
  });
  shadows.removeShadowCaster(t);
  return t;
}
// Aura de élite (radio 1, se escala por instancia): aro en el piso + halo emisivo tenue. Amarilla = rápida, gris metálica = blindada
// "rabia" = halo rojo de la fase 2 de los jefes (enemies.ts setRage)
export function auraTemplate(t: string) {
  const c = t === "rapida" ? "#ffd84a" : t === "rabia" ? "#ff3a2a" : "#b8c0c8";
  const a = template("aura_" + t, () => [
    tor(2, 0.07, M.glow(c), [0, 0.06, 0], undefined, 20),
    sph(2.1, pbr("aura_" + t, { color: c, rough: 0.3, metal: t === "blindada" ? 0.9 : 0, emissive: t === "rapida" ? "#8a6a00" : t === "rabia" ? "#c01808" : "#4a5058", alpha: t === "rabia" ? 0.24 : 0.18 }), [0, 0.55, 0], [1, 0.7, 1], 10),
  ]);
  shadows.removeShadowCaster(a);
  return a;
}
// Cable del cortacercos tirado en el piso (7 m a lo largo de z) con chispas rojas: es ataque enemigo
export function cableTemplate() {
  const t = template("cable", () => [
    cyl(0.26, 0.26, 7, M.matte("#141414"), [0, 0, 0], [Math.PI / 2, 0, 0], 6),
    ...[-3.2, -1.6, 0, 1.6, 3.2].map((z, i) => box(0.38, 0.22, 0.55, M.plastic(i % 2 ? "#e0a030" : "#141414"), [0, 0.04, z])),
    ...[-3.4, -1.7, 0, 1.7, 3.4].map((z) => sph(0.34, M.glow("#ff2a1a"), [0, 0.1, z], undefined, 5)),
  ]);
  shadows.removeShadowCaster(t);
  return t;
}
// Tuerca roja que dispara la aspiradora (ataque enemigo)
export const nutTemplate = () => template("tuerca", () => [
  tor(0.78, 0.28, pbr("nutRed", { color: "#ff3a1f", rough: 0.3, metal: 0.6, emissive: "#c01800" }), [0, 0, 0], [Math.PI / 2, 0, 0], 6),
  cyl(0.32, 0.32, 0.12, M.matte("#1a1a1a"), [0, 0, 0], [Math.PI / 2, 0, 0], 6),
]);
