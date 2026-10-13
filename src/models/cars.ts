import * as B from "@babylonjs/core";
import { precio } from "../balance";
import { carGlbHull, carGlbTpl } from "../carGlb";
import { M, pbr, shadows } from "../render";
import { FOLDED_SLICE } from "../folded";
import { carHull } from "../folded_slice";
import { genome } from "../car_genes";
import { type V3, box, cyl, sph, tor, tube, extrude, merge, wheelInst, shadowProxy, v, scene, setTessK } from "./common";

// ---------- Autos del jugador ----------
/** `cast`: lo que entra a la lista de proyectores de sombra (gemelas de una submalla; ver shadowProxy), en vez de la carrocería y las ruedas. */
export type CarModel = { body: B.Mesh; wheels: { m: B.AbstractMesh; front: boolean; r: number }[]; paint: B.PBRMaterial; cast: B.AbstractMesh[]; antenna?: B.Mesh };
export type CarKind = "buggy" | "monster" | "formula" | "tanque" | "carrera" | "axel" | "helado" | "combi" | "hover" | "topadora" | "triciclo" | "murcielago" | "misterio" | "clasico" | "jeep" | "moto" | "monopatin";

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

// Acabados temáticos de chapa de carrocería (albedo/acabado en public/textures/paints/)
export const GARAGE_FINISHES = {
  "finish:rust": { name: "Óxido extremo", src: "textures/paints/paint-rust-extreme.webp", normal: "textures/paints/paint-rust-extreme_normal.webp", desc: "Chapa intensamente corroída con herrumbre y picaduras", rough: 0.85, metal: 0.15 },
  "finish:cracked": { name: "Craquelado", src: "textures/paints/paint-cracked.webp", normal: "textures/paints/paint-cracked_normal.webp", desc: "Pintura automotriz cuarteada dejando ver metal base", rough: 0.65, metal: 0.2 },
  "finish:mud": { name: "Barro seco", src: "textures/paints/paint-mud.webp", normal: "textures/paints/paint-mud_normal.webp", desc: "Lodo y arcilla seca salpicada sobre la carrocería", rough: 0.9, metal: 0.05 },
} as const;
export type GarageFinishId = keyof typeof GARAGE_FINISHES;

export type CarOpts = { paint?: string; trim?: string; rim?: string; wing?: string; decal?: string; lamp?: string; exhaust?: string; bumper?: string; tires?: string; acc?: string; pilot?: string; sticker?: string; finish?: string; fixed?: boolean }; // fixed: la pintura no se gasta (carrera, garaje): se hornea y ahorra una submalla

// Calco propio del capó (editor del garaje): grilla DECAL_N × DECAL_N, un carácter por celda: "0" = transparente, "1".."8" = DECAL_PAL[n-1].
// Colores de la paleta de UI (docs/ART_DIRECTION.md); sin el rojo de amenaza.
export const DECAL_N = 16;
export const DECAL_PAL = ["#0b0d0a", "#b9d3a4", "#5f7355", "#8dff6a", "#6fb3c4", "#e0a030", "#9a6fb5", "#c8d84a"];
export const DECAL_BLANK = "0".repeat(DECAL_N * DECAL_N);

// Calcomanías de chatarra oficiales con transparencia (HD WebP en public/images/decals/)
export const GARAGE_DECALS = {
  "decal:dorsal_07": { name: "Dorsal 07", src: "images/decals/decal_dorsal_07.webp", desc: "Dorsal vintage oxidado stencil 07" },
  "decal:flames": { name: "Llamas", src: "images/decals/decal_flames.webp", desc: "Llamas de soplete sobre chapa" },
  "decal:junkoil": { name: "Junk-Oil", src: "images/decals/decal_junkoil.webp", desc: "Grasa y lubricante de grafito" },
} as const;
export type GarageDecalId = keyof typeof GARAGE_DECALS;

export const validDecal = (s: unknown): s is string => typeof s === "string" && ((/^[0-8]+$/.test(s) && s.length === DECAL_N * DECAL_N) || s in GARAGE_DECALS);
// Dónde va el calco en cada auto: [y, z, lado, cabeceo], sobre la superficie superior que más ve la cámara de partida (detrás y arriba, ~40°).
// Buggy y Fórmula: el plato del alerón de serie. Monster: el techo de la cabina. Tanque: arriba de la torreta (la escotilla tapa el centro). Autito: la cola, que mira a la cámara.
// Con un alerón elegido (alto/doble) el calco va sobre su plato, porque tapa la cubierta o la cola (ver carModel); el techo del Monster no lo tapa.
const SPOT: Record<CarKind, [number, number, number, number]> = {
  buggy: [0.933, -1.0, 0.34, 0.12], monster: [1.212, -0.2, 0.54, 0], formula: [0.653, -1.15, 0.28, 0], tanque: [0.825, -0.15, 0.6, 0], carrera: [0.352, -0.72, 0.4, -0.38], axel: [0.66, -0.3, 0.34, 0], helado: [0.97, 0.55, 0.34, 0], combi: [1.04, -0.1, 0.4, 0],
  hover: [0.62, -0.5, 0.45, 0], topadora: [1.12, -0.5, 0.45, 0], triciclo: [0.78, -0.55, 0.38, 0],
  murcielago: [0.6, -0.5, 0.36, 0], misterio: [1.18, -0.5, 0.4, 0], clasico: [0.7, -0.1, 0.3, 0], jeep: [0.52, 0.1, 0.4, 0], moto: [0.62, -0.1, 0.0, 0], monopatin: [0.2, -0.2, 0.0, 0],
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
  hover: { deck: [0.62, -1.0], side: [0.6, 0.3, 0], exh: [0.4, -1.1], seat: [0, 0.4, 0.1, 0.8], lamps: [[0.4, 0.38, 1.1, 0.12]], paint: "#f3f4f6", rim: "#4cc3c9" },
  topadora: { deck: [1.12, -0.95], side: [0.62, 0.45, -0.2], exh: [0.9, 0.6], seat: [0, 0.62, -0.3, 0.8], lamps: [[0.4, 0.55, 1.15, 0.14]], paint: "#f5b301", rim: "#2b2d31" },
  triciclo: { deck: [0.78, -0.82], side: [0.5, 0.35, -0.55], exh: [0.18, -0.95], seat: [0, 0.42, 0.1, 0.7], lamps: [[0, 0.5, 0.95, 0.14]], paint: "#e8553d", rim: "#f3ead2" },
  murcielago: { deck: [0.6, -1.1], side: [0.5, 0.3, -0.2], exh: [0.38, -1.5], seat: [0, 0.36, -0.05, 0.7], lamps: [[0.3, 0.2, 1.46, 0.1]], paint: "#262a33", rim: "#ff7a1a" },
  misterio: { deck: [1.14, -0.95], side: [0.56, 0.55, -0.1], exh: [0.2, -1.15], seat: [0, 0.5, 0.2, 0.7], lamps: [[0.4, 0.34, 1.26, 0.16]], paint: "#7fd6b8", rim: "#f3ead2" },
  clasico: { deck: [0.62, -1.0], side: [0.54, 0.3, -0.1], exh: [0.2, -1.3], seat: [0, 0.4, -0.1, 0.65], lamps: [[0.37, 0.3, 1.23, 0.14]], paint: "#aab2bf", rim: "#e5e7eb" },
  jeep: { deck: [0.9, -1.0], side: [0.56, 0.4, 0.1], exh: [0.2, -1.1], seat: [0, 0.5, -0.1, 0.75], lamps: [[0.4, 0.46, 0.97, 0.16]], paint: "#667a2e", rim: "#2b2d31" },
  moto: { deck: [0.55, -0.9], side: [0.17, 0.46, 0.2], exh: [0.2, -0.95], seat: [0, 0.62, -0.25, 0.55], lamps: [[0, 0.46, 1.03, 0.14]], paint: "#1d6fd6", rim: "#e5e7eb" },
  monopatin: { deck: [0.3, -0.7], side: [0.25, 0.14, 0], exh: [0.1, -0.7], seat: [0, 0.55, 0, 0.55], lamps: [[0, 0.18, 0.73, 0.06]], paint: "#e8553d", rim: "#ffd23f" },
};
/** Colores de fábrica por zona (el garaje arranca el selector libre desde acá cuando no hay uno elegido). */
export const factoryColor = (k: CarKind) => ({ paint: ANCH[k].paint, trim: "#c9ccd1", rim: ANCH[k].rim });

// Tamaño [ancho, alto, largo] de cada auto (el mismo de CARS en car.ts; se repite aquí para no crear un import circular)
const CARS_SIZE: Record<CarKind, [number, number, number]> = { buggy: [1.3, 0.7, 2.3], monster: [1.8, 1.1, 2.4], formula: [1.3, 0.55, 2.8], tanque: [1.75, 0.9, 2.4], carrera: [1.1, 0.5, 2.1], axel: [1.9, 1.0, 1.7], helado: [1.3, 0.95, 2.4], combi: [1.45, 1.0, 2.4], hover: [1.5, 0.7, 2.3], topadora: [1.7, 1.2, 2.5], triciclo: [1.2, 0.9, 2.0], murcielago: [1.3, 0.6, 2.8], misterio: [1.45, 1.1, 2.4], clasico: [1.15, 0.75, 2.5], jeep: [1.25, 1.0, 2.1], moto: [0.8, 0.9, 2.1], monopatin: [0.7, 0.5, 1.5] };
const HOVER_W = [[-0.6, 0.8], [0.6, 0.8], [-0.6, -0.8], [0.6, -0.8]];
const TRI_W: [number, number, number][] = [[0, 0.8, 0.7], [-0.58, -0.65, 0.85], [0.58, -0.65, 0.85]];
export function carModel(kind: CarKind, o: CarOpts = {}): CarModel {
  const q = genome(kind);
  const A = kind === "buggy" ? { ...ANCH.buggy, seat: [0, 0.38 + q.stance, 0.02, 0.8] as [number, number, number, number] } : ANCH[kind]; // el piloto sigue a la butaca
  setTessK(2.5);
  const ws: { pos: V3; d: number; w: number; steer?: boolean }[] = [];
  let parts: B.Mesh[];
  let stock: B.Mesh[] = []; // alerón de serie (se reemplaza si se elige otro)
  const finDef = o.finish && o.finish in GARAGE_FINISHES ? GARAGE_FINISHES[o.finish as GarageFinishId] : null;
  const paintKey = "paint" + kind + (o.paint ?? "") + (o.finish ?? "");
  const paintMatOpts: { color: string; rough: number; coat: number; metal?: number; tex?: B.Texture; bump?: B.Texture } = {
    color: o.paint ?? A.paint,
    rough: finDef?.rough ?? 0.4,
    coat: finDef ? 0.15 : 0.8,
    metal: finDef?.metal ?? 0,
  };
  if (finDef) {
    const ft = new B.Texture(finDef.src, scene);
    ft.uScale = ft.vScale = 2.0;
    ft.wrapU = ft.wrapV = B.Texture.WRAP_ADDRESSMODE;
    paintMatOpts.tex = ft;
    if ("normal" in finDef && finDef.normal) {
      const nt = new B.Texture(finDef.normal, scene);
      nt.uScale = nt.vScale = 2.0;
      nt.wrapU = nt.wrapV = B.Texture.WRAP_ADDRESSMODE;
      paintMatOpts.bump = nt;
    }
  }
  const paint = pbr(paintKey, paintMatOpts);
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
  } else if (kind === "hover") {
    // Aerodeslizador de bañera: casco de bañera blanca, falda de goma, hélice con jaula atrás; los patines de abajo apenas se ven
    const tub = M.matte("#e5e7eb"), skirt = M.rubber();
    parts = [
      box(1.5, 0.16, 2.3, skirt, [0, 0.0, 0]),
      extrude([[-1.05, 0.1], [1.05, 0.1], [1.15, 0.25], [1.0, 0.42], [-1.0, 0.45], [-1.15, 0.3]], 1.2, paint, [0, 0.05, 0]),
      box(1.0, 0.04, 1.7, tub, [0, 0.46, 0]),
      sph(0.55, M.glass(), [0, 0.6, 0.4], [1, 0.6, 1.2]),
      box(0.1, 0.3, 0.1, M.metal(), [0, 0.6, -0.8]),
      tor(0.95, 0.05, M.metal("#222"), [0, 0.95, -1.0], [0, 0, 0], 16),
      box(0.9, 0.04, 0.12, M.plastic("#4cc3c9"), [0, 0.95, -1.0], [0, 0, 0.5]),
      box(0.9, 0.04, 0.12, M.plastic("#4cc3c9"), [0, 0.95, -1.0], [0, 0, -0.5]),
      box(0.08, 0.7, 0.08, M.metal("#222"), [0.45, 0.65, -1.0]), box(0.08, 0.7, 0.08, M.metal("#222"), [-0.45, 0.65, -1.0]),
    ];
    stock = [box(1.1, 0.05, 0.3, M.plastic("#4cc3c9"), [0, 0.62, -1.0], [0.1, 0, 0])];
    for (const [x, z] of HOVER_W) ws.push({ pos: [x, 0, z], d: 0.3, w: 0.2 });
  } else if (kind === "topadora") {
    // Topadora de juguete: orugas amarillas, cabina de jaula, pala delantera y chimenea
    const dark = M.matte("#2b2d31");
    parts = [
      ...[-0.78, 0.78].flatMap((x) => [box(0.38, 0.5, 2.3, M.rubber(), [x, 0.05, 0]), cyl(0.5, 0.5, 0.38, M.rubber(), [x, 0.05, 1.1], [0, 0, Math.PI / 2], 10), cyl(0.5, 0.5, 0.38, M.rubber(), [x, 0.05, -1.1], [0, 0, Math.PI / 2], 10)]),
      box(1.2, 0.4, 2.0, paint, [0, 0.4, 0]),
      box(1.0, 0.45, 0.9, paint, [0, 0.85, 0.6]),
      box(1.0, 0.08, 1.0, dark, [0, 1.4, -0.3]),
      ...[[-0.45, -0.7], [0.45, -0.7], [-0.45, 0.1], [0.45, 0.1]].map(([x, z]) => box(0.06, 0.6, 0.06, dark, [x, 1.1, z])),
      box(0.9, 0.7, 0.8, M.glass(), [0, 0.95, -0.3]),
      box(1.9, 0.75, 0.14, M.metal("#9aa0a6"), [0, 0.35, 1.5], [-0.15, 0, 0]),
      ...[-0.7, 0.7].map((x) => box(0.12, 0.12, 0.6, dark, [x, 0.3, 1.2])),
      cyl(0.08, 0.1, 0.55, dark, [0.4, 0.95, 0.35], undefined, 8),
    ];
    stock = [];
    for (const z of [-0.7, -0.25, 0.25, 0.7]) for (const x of [-0.78, 0.78]) ws.push({ pos: [x, 0.02, z], d: 0.4, w: 0.36, steer: false });
  } else if (kind === "triciclo") {
    // Triciclo de reparto: rueda delantera con manubrio, dos traseras grandes y cajón de carga
    const crate = M.plastic("#f3ead2");
    parts = [
      extrude([[-0.9, 0.2], [0.6, 0.2], [0.85, 0.35], [0.5, 0.5], [-0.9, 0.5]], 0.7, paint, [0, 0.05, 0]),
      box(0.9, 0.5, 0.8, crate, [0, 0.62, -0.7]),
      box(0.95, 0.06, 0.85, paint, [0, 0.9, -0.7]),
      tube([[-0.3, 0.5, 0.7], [-0.3, 0.9, 0.55], [0.3, 0.9, 0.55], [0.3, 0.5, 0.7]], 0.04, M.metal("#222")),
      box(0.3, 0.1, 0.5, M.matte("#14171c"), [0, 0.62, 0.05]),
      cyl(0.03, 0.03, 0.7, M.metal(), [0, 0.2, 0.85], [0, 0, 0], 6),
    ];
    stock = [box(1.0, 0.04, 0.3, M.plastic("#f3ead2"), [0, 0.97, -1.0], [0.1, 0, 0])];
    for (const [x, z, d] of TRI_W) ws.push({ pos: [x, 0, z], d, w: 0.26 });
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
    if (kind === "buggy") for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) ws.push({ pos: [x * q.trocha, 0, z * q.batalla], d: q.rueda_d, w: q.rueda_w });
    else if (kind === "monster") for (const [x, z] of [[-0.8, 0.72], [0.8, 0.72], [-0.8, -0.72], [0.8, -0.72]]) ws.push({ pos: [x, -0.05, z], d: 1.15, w: 0.5 });
    else if (kind === "formula") for (const [x, z] of [[-0.62, 0.9], [0.62, 0.9], [-0.66, -0.85], [0.66, -0.85]]) ws.push({ pos: [x, 0, z], d: z < 0 ? 0.72 : 0.6, w: z < 0 ? 0.42 : 0.3 });
    else if (kind === "tanque") for (const z of [-0.6, -0.2, 0.2, 0.6]) for (const x of [-0.72, 0.72]) ws.push({ pos: [x, 0.02, z], d: 0.36, w: 0.34, steer: false });
    else if (kind === "axel") for (const x of [-0.82, 0.82]) ws.push({ pos: [x, 0, 0], d: 1.6, w: 0.42, steer: false });
    else if (kind === "helado") for (const [x, z] of [[-0.62, 0.78], [0.62, 0.78], [-0.62, -0.75], [0.62, -0.75]]) ws.push({ pos: [x, 0, z], d: 0.62, w: 0.3 });
    else if (kind === "combi") for (const [x, z] of [[-0.62, 0.75], [0.62, 0.75], [-0.62, -0.75], [0.62, -0.75]]) ws.push({ pos: [x, 0, z], d: 0.62, w: 0.3 });
    else if (kind === "hover") for (const [x, z] of HOVER_W) ws.push({ pos: [x, 0, z], d: 0.3, w: 0.2 });
    else if (kind === "topadora") for (const z of [-0.7, -0.25, 0.25, 0.7]) for (const x of [-0.78, 0.78]) ws.push({ pos: [x, 0.02, z], d: 0.4, w: 0.36, steer: false });
    else if (kind === "triciclo") for (const [x, z, d] of TRI_W) ws.push({ pos: [x, 0, z], d, w: 0.26 });
    else if (kind === "murcielago") for (const [x, z] of [[-0.62, 0.95], [0.62, 0.95], [-0.65, -0.9], [0.65, -0.9]]) ws.push({ pos: [x, 0, z], d: z < 0 ? 0.7 : 0.58, w: z < 0 ? 0.4 : 0.3 });
    else if (kind === "misterio") for (const [x, z] of [[-0.62, 0.8], [0.62, 0.8], [-0.62, -0.75], [0.62, -0.75]]) ws.push({ pos: [x, 0, z], d: 0.62, w: 0.3 });
    else if (kind === "clasico") for (const [x, z] of [[-0.56, 0.82], [0.56, 0.82], [-0.56, -0.85], [0.56, -0.85]]) ws.push({ pos: [x, 0, z], d: 0.56, w: 0.26 });
    else if (kind === "jeep") for (const [x, z] of [[-0.66, 0.7], [0.66, 0.7], [-0.66, -0.7], [0.66, -0.7]]) ws.push({ pos: [x, 0, z], d: 0.72, w: 0.32 });
    else if (kind === "moto") for (const z of [0.85, -0.85]) ws.push({ pos: [0, 0, z], d: 0.8, w: 0.2 });
    else if (kind === "monopatin") for (const [x, z] of [[-0.2, 0.5], [0.2, 0.5], [-0.2, -0.5], [0.2, -0.5]]) ws.push({ pos: [x, 0, z], d: 0.28, w: 0.14 });
    else for (const [x, z] of [[-0.46, 0.66], [0.46, 0.66], [-0.46, -0.66], [0.46, -0.66]]) ws.push({ pos: [x, 0, z], d: 0.52, w: 0.18 });
    if (kind === "buggy" || kind === "formula") {
      const wy = kind === "buggy" ? q.aleron_alto : 0.9, sh = wy - 0.9; // alerón de serie (genes del buggy); los soportes estiran la punta, la base queda
      stock = [
        box(q.aleron_ancho ?? 1.35, 0.05, q.aleron_cuerda ?? 0.38, M.plastic("#ffc300"), [0, wy, -1.0], [q.aleron_incl ?? 0.12, 0, 0]),
        box(0.05, 0.4 + sh, 0.15, M.matte("#222"), [0.4, 0.68 + sh / 2, -0.95]),
        box(0.05, 0.4 + sh, 0.15, M.matte("#222"), [-0.4, 0.68 + sh / 2, -0.95]),
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
    if ((kind as string) === "deportivo" || (kind as string) === "pickup") {
      parts.push(
        cyl(0.035, 0.02, 0.06, M.plastic("#ef4444"), [0, bh * 0.72, bl * 0.15], [Math.PI / 2, 0, 0], 8),
        cyl(0.022, 0.022, 0.02, chrome, [0, bh * 0.72, bl * 0.19], [Math.PI / 2, 0, 0], 8)
      );
    }
    if (kind === "buggy") {
      for (const sx of [-bw * 0.28, bw * 0.28]) {
        parts.push(cyl(0.012, 0.012, bh * 0.85, chrome, [sx, bh * 0.55, -bl * 0.05], [0.3, 0, 0], 6));
      }
    }
    if (kind === "monster" || kind === "combi") {
      for (const sx of [-bw * 0.18, bw * 0.18]) {
        parts.push(
          box(0.06, 0.04, 0.12, chrome, [sx, bh * 0.65, bl * 0.2]),
          box(0.04, 0.025, 0.04, M.metal("#09090b"), [sx, bh * 0.65, bl * 0.25])
        );
      }
    }
    if (kind === "buggy" || kind === "monster") {
      parts.push(
        box(0.08, 0.04, 0.12, M.plastic("#2563eb"), [0, bh * 0.45, -bl * 0.38]),
        cyl(0.006, 0.006, 0.06, M.plastic("#ef4444"), [0.02, bh * 0.47, -bl * 0.33], [0, 0, 0.4], 4),
        cyl(0.006, 0.006, 0.06, M.plastic("#18181b"), [-0.02, bh * 0.47, -bl * 0.33], [0, 0, -0.4], 4),
        box(0.02, 0.015, 0.025, M.plastic("#eab308"), [0, bh * 0.48, -bl * 0.3]),
        // Funda / tubo guía semirrígido cilíndrico y capuchón protector de goma para antena RF
        cyl(0.0035, 0.0035, 0.045, M.plastic("#18181b"), [0, bh * 0.45, -bl * 0.35], [0, 0, 0], 4),
        cyl(0.004, 0.004, 0.012, M.plastic("#ef4444"), [0, bh * 0.45 + 0.11, -bl * 0.35], [0, 0, 0], 4),
        // Tubo guía semirrígido de antena en flúor
        cyl(0.004, 0.004, 0.08, M.plastic("#22c55e"), [0, bh * 0.48, -bl * 0.35], [0, 0, 0], 4),
        // Clip de fijación de base de antena al chasis
        box(0.01, 0.008, 0.012, M.plastic("#18181b"), [0, bh * 0.42, -bl * 0.35])
      );
    }
    if (kind === "buggy" || kind === "monster" || kind === "formula" || kind === "carrera") {
      parts.push(
        box(0.04, 0.025, 0.045, M.metal("#3f3f46"), [0, bh * 0.42, -bl * 0.18]),
        cyl(0.006, 0.006, 0.08, M.plastic("#ef4444"), [0.01, bh * 0.425, -bl * 0.18 - 0.04], [Math.PI / 2, 0, 0], 4),
        cyl(0.006, 0.006, 0.08, M.plastic("#18181b"), [-0.01, bh * 0.425, -bl * 0.18 - 0.04], [Math.PI / 2, 0, 0], 4),
        // Manguitos termorretráctiles bicolor en las salidas del variador ESC
        // Salida positiva (+): manguito rojo vivo mate y virola de marcado polarizada
        cyl(0.008, 0.008, 0.016, M.matte("#dc2626"), [0.01, bh * 0.425, -bl * 0.18 - 0.025], [Math.PI / 2, 0, 0], 6),
        cyl(0.0088, 0.0088, 0.0035, M.plastic("#fef08a"), [0.01, bh * 0.425, -bl * 0.18 - 0.031], [Math.PI / 2, 0, 0], 6),
        // Salida negativa (-): manguito negro carbón mate y virola de marcado polarizada
        cyl(0.008, 0.008, 0.016, M.matte("#18181b"), [-0.01, bh * 0.425, -bl * 0.18 - 0.025], [Math.PI / 2, 0, 0], 6),
        cyl(0.0088, 0.0088, 0.0035, M.plastic("#fef08a"), [-0.01, bh * 0.425, -bl * 0.18 - 0.031], [Math.PI / 2, 0, 0], 6),
        // Banco de condensadores electrolíticos del ESC (filtro anti-picos de tensión) con fundas cilíndricas azules
        cyl(0.009, 0.009, 0.02, M.plastic("#0284c7"), [0.016, bh * 0.435, -bl * 0.18 + 0.012], [0, 0, 0], 8),
        cyl(0.009, 0.009, 0.02, M.plastic("#0284c7"), [-0.016, bh * 0.435, -bl * 0.18 + 0.012], [0, 0, 0], 8),
        cyl(0.007, 0.007, 0.003, chrome, [0.016, bh * 0.446, -bl * 0.18 + 0.012], [0, 0, 0], 6),
        cyl(0.007, 0.007, 0.003, chrome, [-0.016, bh * 0.446, -bl * 0.18 + 0.012], [0, 0, 0], 6)
      );
    }
    if (kind === "buggy" || kind === "monster" || (kind as string) === "carrera") {
      const spurY = bh * 0.28 + 0.014, spurZ = -bl * 0.22 - 0.0385, lexan = M.plastic("#94a3b8");
      parts.push(
        // Lata cilíndrica del motor 540 con ranura de ventilación
        cyl(0.044, 0.044, 0.065, chrome, [0, bh * 0.28, -bl * 0.22], [0, 0, Math.PI / 2], 10),
        cyl(0.04, 0.04, 0.015, M.metal("#18181b"), [0, bh * 0.28, -bl * 0.22 + 0.02], [0, 0, Math.PI / 2], 8),
        // Disipador térmico de aluminio anodizado azul envolviendo la carcasa con aletas de refrigeración radiales
        cyl(0.048, 0.048, 0.065, M.metal("#0284c7"), [0, bh * 0.28, -bl * 0.22], [0, 0, Math.PI / 2], 12),
        // 3 aletas anulares concéntricas de disipación térmica
        tor(0.052, 0.003, M.metal("#0284c7"), [-0.018, bh * 0.28, -bl * 0.22], [0, 0, Math.PI / 2], 10),
        tor(0.052, 0.003, M.metal("#0284c7"), [0, bh * 0.28, -bl * 0.22], [0, 0, Math.PI / 2], 10),
        tor(0.052, 0.003, M.metal("#0284c7"), [0.018, bh * 0.28, -bl * 0.22], [0, 0, Math.PI / 2], 10),
        // Placa soporte de motor en aluminio CNC con ranuras colisas para ajuste micrométrico de entrehierro piñón-corona
        box(0.005, 0.062, 0.054, M.metal("#0284c7"), [0.035, bh * 0.28, -bl * 0.22]),
        box(0.006, 0.006, 0.018, M.metal("#0f172a"), [0.035, bh * 0.28 + 0.014, -bl * 0.22]),
        box(0.006, 0.006, 0.018, M.metal("#0f172a"), [0.035, bh * 0.28 - 0.014, -bl * 0.22]),
        // Dos tornillos Allen M3 de fijación de motor
        cyl(0.006, 0.006, 0.006, chrome, [0.038, bh * 0.28 + 0.014, -bl * 0.22], [0, 0, Math.PI / 2], 6),
        cyl(0.006, 0.006, 0.006, chrome, [0.038, bh * 0.28 - 0.014, -bl * 0.22], [0, 0, Math.PI / 2], 6),
        // Piñón dentado de bronce en eje de salida
        cyl(0.014, 0.014, 0.012, M.metal("#d97706"), [0.042, bh * 0.28, -bl * 0.22], [0, 0, Math.PI / 2], 8),
        // Conjunto de Embrague Antirrebote (Slipper Clutch) y Corona Dentada Principal (Spur Gear)
        // Eje central de transmisión / slipper shaft de acero
        cyl(0.0045, 0.0045, 0.042, chrome, [0.050, spurY, spurZ], [0, 0, Math.PI / 2], 6),
        // Corona dentada principal de composite técnico blanco Delrin de gran diámetro engranando contigua al piñón de bronce
        cyl(0.068, 0.068, 0.007, M.plastic("#f8fafc"), [0.042, spurY, spurZ], [0, 0, Math.PI / 2], 16),
        // Rebaje interior de la corona dentada y zapatas de ferodo de fricción aprisionadas
        cyl(0.052, 0.052, 0.0073, M.plastic("#e2e8f0"), [0.042, spurY, spurZ], [0, 0, Math.PI / 2], 14),
        cyl(0.048, 0.048, 0.0078, M.matte("#78350f"), [0.042, spurY, spurZ], [0, 0, Math.PI / 2], 12),
        // 6 orificios circulares perimetrales de aligeramiento en la corona
        ...Array.from({ length: 6 }, (_, a) => {
          const ang = (a * Math.PI) / 3;
          return cyl(
            0.0075,
            0.0075,
            0.0076,
            M.matte("#09090b"),
            [0.042, spurY + Math.sin(ang) * 0.022, spurZ + Math.cos(ang) * 0.022],
            [0, 0, Math.PI / 2],
            6
          );
        }),
        // Dos platos de presión de fricción (Slipper Plates) de aluminio mecanizado anodizado
        // Plato de fricción interior (lado motor)
        cyl(0.046, 0.046, 0.003, M.metal("#0284c7"), [0.0365, spurY, spurZ], [0, 0, Math.PI / 2], 12),
        cyl(0.014, 0.014, 0.004, M.metal("#0284c7"), [0.033, spurY, spurZ], [0, 0, Math.PI / 2], 8),
        // Plato de fricción exterior
        cyl(0.046, 0.046, 0.003, M.metal("#0284c7"), [0.0475, spurY, spurZ], [0, 0, Math.PI / 2], 12),
        cyl(0.018, 0.018, 0.003, M.metal("#0284c7"), [0.0495, spurY, spurZ], [0, 0, Math.PI / 2], 8),
        // Arandela de asiento del muelle
        cyl(0.013, 0.013, 0.0015, chrome, [0.051, spurY, spurZ], [0, 0, Math.PI / 2], 8),
        // Muelle helicoidal de compresión de ajuste del slipper sobre el eje central
        tor(0.012, 0.0025, M.metal("#71717a"), [0.053, spurY, spurZ], [0, 0, Math.PI / 2], 10),
        tor(0.012, 0.0025, M.metal("#71717a"), [0.056, spurY, spurZ], [0, 0, Math.PI / 2], 10),
        tor(0.012, 0.0025, M.metal("#71717a"), [0.059, spurY, spurZ], [0, 0, Math.PI / 2], 10),
        tor(0.012, 0.0025, M.metal("#71717a"), [0.062, spurY, spurZ], [0, 0, Math.PI / 2], 10),
        // Arandela de apoyo de tuerca
        cyl(0.013, 0.013, 0.0015, chrome, [0.0635, spurY, spurZ], [0, 0, Math.PI / 2], 8),
        // Tuerca hexagonal autoblocante M4 con casquillo de freno de nylon azul en el extremo del eje
        cyl(0.009, 0.009, 0.004, chrome, [0.066, spurY, spurZ], [0, 0, Math.PI / 2], 6),
        cyl(0.0078, 0.0078, 0.002, M.plastic("#0284c7"), [0.0685, spurY, spurZ], [0, 0, Math.PI / 2], 8),
        cyl(0.004, 0.004, 0.002, chrome, [0.070, spurY, spurZ], [0, 0, Math.PI / 2], 6),
        // Cubierta Protectora de Engranajes de Lexan / Policarbonato Transparente (Clear Gear Cover Protector)
        // Carcasa envolvente contorneada adaptada a la silueta en 8 del piñón y la corona
        // Lóbulo principal envolvente sobre la corona dentada (Spur Gear) y conjunto del Slipper Clutch
        cyl(0.076, 0.076, 0.033, lexan, [0.0545, spurY, spurZ], [0, 0, Math.PI / 2], 16),
        cyl(0.076, 0.076, 0.0025, lexan, [0.0715, spurY, spurZ], [0, 0, Math.PI / 2], 16),
        // Lóbulo envolvente sobre el piñón de ataque del motor
        cyl(0.030, 0.030, 0.015, lexan, [0.045, bh * 0.28, -bl * 0.22], [0, 0, Math.PI / 2], 12),
        cyl(0.030, 0.030, 0.0025, lexan, [0.053, bh * 0.28, -bl * 0.22], [0, 0, Math.PI / 2], 12),
        // Cintura envolvente de unión en silueta en 8 protegiendo la zona de engrane piñón-corona
        box(0.024, 0.032, 0.042, lexan, [0.049, (bh * 0.28 + spurY) * 0.5, (-bl * 0.22 + spurZ) * 0.5], [-0.35, 0, 0]),
        box(0.0025, 0.030, 0.038, lexan, [0.0615, (bh * 0.28 + spurY) * 0.5, (-bl * 0.22 + spurZ) * 0.5], [-0.35, 0, 0]),
        // Nervaduras estructurales longitudinales de refuerzo moldeadas en la tapa para evitar deformación por calor o gravilla
        box(0.002, 0.0025, 0.048, lexan, [0.073, spurY + 0.018, spurZ]),
        box(0.002, 0.0025, 0.048, lexan, [0.073, spurY - 0.018, spurZ]),
        box(0.002, 0.0025, 0.034, lexan, [0.0635, (bh * 0.28 + spurY) * 0.5, (-bl * 0.22 + spurZ) * 0.5], [-0.35, 0, 0]),
        // Tapón circular de goma negra de acceso rápido centrado frente a la tuerca M4 del Slipper Clutch para ajuste con llave tubular
        cyl(0.016, 0.016, 0.003, M.rubber(), [0.0735, spurY, spurZ], [0, 0, Math.PI / 2], 12),
        tor(0.015, 0.0015, M.rubber(), [0.0748, spurY, spurZ], [0, 0, Math.PI / 2], 12),
        cyl(0.008, 0.008, 0.0012, M.matte("#09090b"), [0.0748, spurY, spurZ], [0, 0, Math.PI / 2], 8),
        // 2 tornillos Allen M3 de fijación en acero cromado fijando la cubierta a la placa bancada del motor
        // Tornillo M3 superior con orejeta de fijación en policarbonato
        box(0.004, 0.009, 0.009, lexan, [0.039, spurY + 0.033, spurZ + 0.010]),
        cyl(0.0055, 0.0055, 0.004, chrome, [0.042, spurY + 0.033, spurZ + 0.010], [0, 0, Math.PI / 2], 6),
        cyl(0.0028, 0.0028, 0.0012, M.metal("#09090b"), [0.044, spurY + 0.033, spurZ + 0.010], [0, 0, Math.PI / 2], 6),
        // Tornillo M3 inferior con orejeta de fijación en policarbonato
        box(0.004, 0.009, 0.009, lexan, [0.039, spurY - 0.033, spurZ - 0.010]),
        cyl(0.0055, 0.0055, 0.004, chrome, [0.042, spurY - 0.033, spurZ - 0.010], [0, 0, Math.PI / 2], 6),
        cyl(0.0028, 0.0028, 0.0012, M.metal("#09090b"), [0.044, spurY - 0.033, spurZ - 0.010], [0, 0, Math.PI / 2], 6),
        // Lengüetas soldadas de cobre/latón en los bornes del motor 540
        box(0.004, 0.008, 0.005, M.metal("#d4af37"), [0.015, bh * 0.302, -bl * 0.22 + 0.025]),
        box(0.004, 0.008, 0.005, M.metal("#d4af37"), [-0.015, bh * 0.302, -bl * 0.22 + 0.025]),
        // Cables de potencia flexibles ESC-Motor en silicona 12AWG rojo (+) y negro (-)
        cyl(0.005, 0.005, 0.07, M.plastic("#ef4444"), [0.015, bh * 0.33, -bl * 0.22 + 0.025], [0.4, 0, 0.3], 4),
        cyl(0.005, 0.005, 0.07, M.plastic("#18181b"), [-0.015, bh * 0.33, -bl * 0.22 + 0.025], [0.4, 0, -0.3], 4),
        // Manguitos termorretráctiles bicolor enfundando las soldaduras de los terminales del motor eléctrico Tipo 540:
        // Lengüeta positiva (+): manguito cilíndrico en rojo vivo mate cubriendo la lengüeta y el inicio del cable rojo 12AWG
        cyl(0.0075, 0.0075, 0.018, M.matte("#dc2626"), [0.014, bh * 0.308, -bl * 0.22 + 0.025], [0.4, 0, 0.3], 6),
        // Virola de marcado de polaridad (+) en amarillo pálido cerca del extremo del manguito
        cyl(0.0082, 0.0082, 0.0035, M.plastic("#fef08a"), [0.015, bh * 0.316, -bl * 0.22 + 0.025], [0.4, 0, 0.3], 6),
        // Lengüeta negativa (-): manguito cilíndrico en negro carbón mate cubriendo la lengüeta y el cable negro
        cyl(0.0075, 0.0075, 0.018, M.matte("#18181b"), [-0.014, bh * 0.308, -bl * 0.22 + 0.025], [0.4, 0, -0.3], 6),
        // Virola de marcado de polaridad (-) en amarillo pálido cerca del extremo del manguito
        cyl(0.0082, 0.0082, 0.0035, M.plastic("#fef08a"), [-0.015, bh * 0.316, -bl * 0.22 + 0.025], [0.4, 0, -0.3], 6),
        // Dos pequeños condensadores cilíndricos de desacoplo cerámicos/electrolíticos soldados directamente entre los polos del motor y la carcasa metálica con manguitos azules
        cyl(0.005, 0.005, 0.012, M.plastic("#0284c7"), [0.008, bh * 0.298, -bl * 0.22 + 0.027], [0.2, 0, 0.55], 6),
        cyl(0.005, 0.005, 0.012, M.plastic("#0284c7"), [-0.008, bh * 0.298, -bl * 0.22 + 0.027], [0.2, 0, -0.55], 6),
        // Patillas de soldadura de estaño/cromo uniendo los condensadores a las lengüetas y a la carcasa metálica
        cyl(0.0012, 0.0012, 0.008, chrome, [0.012, bh * 0.301, -bl * 0.22 + 0.026], [0.2, 0, 0.55], 4),
        cyl(0.0012, 0.0012, 0.008, chrome, [0.004, bh * 0.295, -bl * 0.22 + 0.027], [0.2, 0, 0.55], 4),
        cyl(0.0012, 0.0012, 0.008, chrome, [-0.012, bh * 0.301, -bl * 0.22 + 0.026], [0.2, 0, -0.55], 4),
        cyl(0.0012, 0.0012, 0.008, chrome, [-0.004, bh * 0.295, -bl * 0.22 + 0.027], [0.2, 0, -0.55], 4),
        // Condensadores cerámicos de supresión de interferencia RF soldados a la culata
        box(0.006, 0.006, 0.003, M.plastic("#eab308"), [0, bh * 0.31, -bl * 0.22 + 0.025]),
        box(0.006, 0.006, 0.003, M.plastic("#eab308"), [0, bh * 0.25, -bl * 0.22 + 0.025])
      );
    }
    if (kind === "buggy" || kind === "monster") {
      // Amortiguadores helicoidales de competición con muelles y collarines de precarga
      for (const sx of [-bw * 0.36, bw * 0.36]) {
        parts.push(
          cyl(0.012, 0.012, 0.09, M.metal("#dc2626"), [sx, bh * 0.34, bl * 0.26], [0, 0, sx > 0 ? 0.35 : -0.35], 6),
          cyl(0.005, 0.005, 0.11, chrome, [sx, bh * 0.30, bl * 0.26], [0, 0, sx > 0 ? 0.35 : -0.35], 4),
          tor(0.018, 0.003, chrome, [sx, bh * 0.35, bl * 0.26], [0, 0, sx > 0 ? 0.35 : -0.35], 8),
          tor(0.018, 0.003, chrome, [sx, bh * 0.32, bl * 0.26], [0, 0, sx > 0 ? 0.35 : -0.35], 8),
          cyl(0.016, 0.016, 0.01, M.metal("#d97706"), [sx, bh * 0.37, bl * 0.26], [0, 0, sx > 0 ? 0.35 : -0.35], 6)
        );
      }
    }
    if (kind === "monster") {
      for (let a = 0; a < 6; a++) {
        const ang = (a * Math.PI) / 3;
        parts.push(
          box(0.004, 0.012, 0.05, M.metal("#0284c7"), [
            -bw * 0.12 + Math.cos(ang) * 0.026,
            bh * 0.32 + Math.sin(ang) * 0.026,
            -bl * 0.28
          ], [0, 0, ang])
        );
      }
    }
    if (kind === "buggy" || kind === "formula" || kind === "carrera") {
      parts.push(
        // Servo de dirección en nylon oscuro con tapa sellada
        box(0.035, 0.025, 0.028, M.plastic("#18181b"), [0, bh * 0.24, bl * 0.32]),
        // Servo horn (brazo oscilante) en nylon blanco de competición
        cyl(0.006, 0.004, 0.016, M.plastic("#f4f4f5"), [0, bh * 0.26, bl * 0.335], [0.3, 0, 0], 6),
        // Resorte helicoidal del Servo Saver de protección del mecanismo de dirección
        cyl(0.008, 0.006, 0.014, chrome, [0, bh * 0.23, bl * 0.35], [0, 0, 0], 6),
        // Rótulas esféricas de reenvío (ball joints) en los extremos de pivote de los tensores de dirección
        sph(0.006, M.metal("#0284c7"), [-bw * 0.14, bh * 0.23, bl * 0.34]),
        sph(0.006, M.metal("#0284c7"), [bw * 0.14, bh * 0.23, bl * 0.34]),
        // Varillas de reenvío / tirantes ajustables (turnbuckles) hacia manguetas directrices
        cyl(0.003, 0.003, bw * 0.32, chrome, [-bw * 0.14, bh * 0.23, bl * 0.34], [0, 0, 0.35], 4),
        cyl(0.003, 0.003, bw * 0.32, chrome, [bw * 0.14, bh * 0.23, bl * 0.34], [0, 0, -0.35], 4),
        // Tensores roscados hexagonales ajustables (turnbuckle nuts) en titanio mecanizado en el punto medio
        cyl(0.008, 0.008, 0.012, M.metal("#64748b"), [-bw * 0.14, bh * 0.23, bl * 0.34], [0, 0, 0.35], 6),
        cyl(0.008, 0.008, 0.012, M.metal("#64748b"), [bw * 0.14, bh * 0.23, bl * 0.34], [0, 0, -0.35], 6)
      );
      // Bieletas de convergencia (Toe-Links) con tensores uniball ajustables en tren delantero y trasero descubiertos
      for (const zAx of [bl * 0.34, -bl * 0.28]) {
        for (const sx of [-1, 1]) {
          parts.push(
            // Rótulas esféricas uniball de acero pulido en los extremos interior y exterior
            sph(0.006, chrome, [sx * bw * 0.13, bh * 0.22, zAx]),
            sph(0.006, chrome, [sx * bw * 0.33, bh * 0.22, zAx]),
            // Varilla roscada central de acero
            cyl(0.003, 0.003, bw * 0.2, chrome, [sx * bw * 0.23, bh * 0.22, zAx], [0, 0, Math.PI / 2], 4),
            // Cuerpo hexagonal central en titanio anodizado azul
            cyl(0.007, 0.007, 0.018, M.metal("#0284c7"), [sx * bw * 0.23, bh * 0.22, zAx], [0, 0, Math.PI / 2], 6),
            // Marcas de rosca izquierda / derecha en los extremos del tensor
            cyl(0.0045, 0.0045, 0.003, chrome, [sx * bw * 0.23 - 0.011, bh * 0.22, zAx], [0, 0, Math.PI / 2], 6),
            cyl(0.0045, 0.0045, 0.003, chrome, [sx * bw * 0.23 + 0.011, bh * 0.22, zAx], [0, 0, Math.PI / 2], 6)
          );
        }
      }
    }
    if (kind === "formula" || kind === "buggy") {
      parts.push(
        cyl(0.008, 0.008, 0.01, M.plastic("#18181b"), [0, bh * 0.25, bl * 0.36]),
        box(0.004, 0.004, 0.022, M.plastic("#f8fafc"), [0, bh * 0.26, bl * 0.37], [0, 0.2, 0])
      );
      // Soporte inferior del chasis / bancada de mantenimiento: orificios de centrado mecanizados y almohadillas magnéticas para Pit Stand
      const bellyY = kind === "buggy" ? -0.028 : 0.002;
      for (const pz of [-bl * 0.24, bl * 0.24]) {
        parts.push(
          // Almohadilla magnética de apoyo en la panza plana del chasis que encaja sobre el Pit Stand de taller
          box(bw * 0.26, 0.004, 0.065, M.metal("#475569"), [0, bellyY, pz]),
          // Orificio de centrado mecanizado cónico para espiga de la bancada de boxes
          cyl(0.018, 0.012, 0.006, M.metal("#09090b"), [0, bellyY, pz], [0, 0, 0], 8),
          // Chaflán biselado perimetral del orificio en acero brillante
          tor(0.022, 0.002, chrome, [0, bellyY - 0.001, pz], [0, 0, 0], 8),
          // Insertos magnéticos laterales de fijación rápida
          cyl(0.008, 0.008, 0.005, M.metal("#94a3b8"), [-bw * 0.09, bellyY, pz], [0, 0, 0], 6),
          cyl(0.008, 0.008, 0.005, M.metal("#94a3b8"), [bw * 0.09, bellyY, pz], [0, 0, 0], 6)
        );
      }
    }
    if (kind === "buggy" || kind === "monster" || kind === "formula") {
      // Palieres de transmisión telescópicos articulados (CVDs) desde el diferencial a cada buje de rueda trasera
      for (const sx of [-1, 1]) {
        parts.push(
          // Vaso de salida del diferencial en acero templado
          cyl(0.012, 0.012, 0.018, M.metal("#27272a"), [sx * bw * 0.08, bh * 0.22, -bl * 0.28], [0, 0, Math.PI / 2], 6),
          // Eje del palier CVD cromado articulado en ángulo
          cyl(0.005, 0.005, bw * 0.28, chrome, [sx * bw * 0.22, bh * 0.22, -bl * 0.28], [0, 0, sx * 0.1], 4),
          // Campana de junta homocinética / fuelle de goma en buje de rueda
          cyl(0.014, 0.014, 0.015, M.rubber(), [sx * bw * 0.35, bh * 0.22, -bl * 0.28], [0, 0, Math.PI / 2], 6)
        );
      }
      // Tapa de registro del diferencial trasero en aluminio fundido con tornillos perimetrales Allen
      parts.push(
        box(bw * 0.14, bh * 0.12, 0.006, M.metal("#3f3f46"), [0, bh * 0.22, -bl * 0.29]),
        cyl(0.003, 0.003, 0.004, chrome, [-bw * 0.05, bh * 0.26, -bl * 0.294], [Math.PI / 2, 0, 0], 6),
        cyl(0.003, 0.003, 0.004, chrome, [bw * 0.05, bh * 0.26, -bl * 0.294], [Math.PI / 2, 0, 0], 6),
        cyl(0.003, 0.003, 0.004, chrome, [-bw * 0.05, bh * 0.18, -bl * 0.294], [Math.PI / 2, 0, 0], 6),
        cyl(0.003, 0.003, 0.004, chrome, [bw * 0.05, bh * 0.18, -bl * 0.294], [Math.PI / 2, 0, 0], 6)
      );
      // Barra estabilizadora trasera (sway bar) de alambre de acero con rótulas esféricas
      parts.push(
        // Alambre transversal central de torsión
        cyl(0.004, 0.004, bw * 0.44, M.metal("#94a3b8"), [0, bh * 0.36, -bl * 0.34], [0, 0, Math.PI / 2], 4),
        // Bieletas verticales a los trapecios de suspensión con rótulas anodizadas
        cyl(0.003, 0.003, 0.045, chrome, [-bw * 0.22, bh * 0.32, -bl * 0.32], [0.3, 0, 0], 4),
        cyl(0.003, 0.003, 0.045, chrome, [bw * 0.22, bh * 0.32, -bl * 0.32], [0.3, 0, 0], 4),
        sph(0.008, M.metal("#0284c7"), [-bw * 0.22, bh * 0.34, -bl * 0.33]),
        sph(0.008, M.metal("#0284c7"), [bw * 0.22, bh * 0.34, -bl * 0.33])
      );
    }
    if (kind === "buggy" || kind === "monster" || kind === "carrera") {
      parts.push(
        // Batería LiPo Hardcase de competición con carcasa de policarbonato y etiqueta de advertencia
        box(0.055, 0.024, 0.12, M.matte("#18181b"), [bw * 0.14, bh * 0.26, -bl * 0.08]),
        box(0.042, 0.001, 0.08, M.plastic("#f59e0b"), [bw * 0.14, bh * 0.273, -bl * 0.08]),
        // Conector XT60 de alta temperatura en nylon amarillo con chaflán polarizado
        box(0.013, 0.01, 0.016, M.plastic("#eab308"), [bw * 0.14, bh * 0.28, -bl * 0.02]),
        box(0.006, 0.008, 0.016, M.plastic("#eab308"), [bw * 0.14 + 0.005, bh * 0.283, -bl * 0.02], [0, 0, 0.45]),
        // Terminales dorados embutidos de baja resistencia
        cyl(0.0025, 0.0025, 0.008, M.metal("#d4af37"), [bw * 0.14 - 0.0035, bh * 0.285, -bl * 0.014], [Math.PI / 2, 0, 0], 6),
        cyl(0.0025, 0.0025, 0.008, M.metal("#d4af37"), [bw * 0.14 + 0.0035, bh * 0.285, -bl * 0.014], [Math.PI / 2, 0, 0], 6),
        // Manguitos termorretráctiles bicolor en las soldaduras del conector XT60
        cyl(0.0055, 0.0055, 0.012, M.matte("#dc2626"), [bw * 0.14 - 0.0035, bh * 0.285, -bl * 0.024], [Math.PI / 2, 0, 0], 6),
        cyl(0.0055, 0.0055, 0.012, M.matte("#18181b"), [bw * 0.14 + 0.0035, bh * 0.285, -bl * 0.024], [Math.PI / 2, 0, 0], 6),
        // Cables de silicona flexible 12AWG rojo (+) y negro (-) curvados saliendo hacia el variador ESC
        cyl(0.004, 0.004, 0.035, M.plastic("#ef4444"), [bw * 0.14 - 0.0035, bh * 0.285, -bl * 0.035], [0.35, 0, -0.25], 4),
        cyl(0.004, 0.004, 0.045, M.plastic("#ef4444"), [bw * 0.14 - 0.008, bh * 0.298, -bl * 0.065], [0.55, 0, -0.4], 4),
        cyl(0.004, 0.004, 0.035, M.plastic("#18181b"), [bw * 0.14 + 0.0035, bh * 0.285, -bl * 0.035], [0.35, 0, 0.25], 4),
        cyl(0.004, 0.004, 0.045, M.plastic("#18181b"), [bw * 0.14 + 0.008, bh * 0.298, -bl * 0.065], [0.55, 0, 0.4], 4),
        // Conector blanco de balanceo JST-XH de 3 pines con pines metálicos
        box(0.01, 0.006, 0.012, M.plastic("#fafafa"), [bw * 0.14, bh * 0.278, -bl * 0.005]),
        cyl(0.001, 0.001, 0.004, chrome, [bw * 0.14 - 0.0028, bh * 0.28, -bl * 0.001], [Math.PI / 2, 0, 0], 4),
        cyl(0.001, 0.001, 0.004, chrome, [bw * 0.14, bh * 0.28, -bl * 0.001], [Math.PI / 2, 0, 0], 4),
        cyl(0.001, 0.001, 0.004, chrome, [bw * 0.14 + 0.0028, bh * 0.28, -bl * 0.001], [Math.PI / 2, 0, 0], 4),
        // Cables finos de señal de balanceo
        cyl(0.0015, 0.0015, 0.022, M.plastic("#ef4444"), [bw * 0.14 - 0.0028, bh * 0.28, -bl * 0.014], [0.3, 0, 0], 4),
        cyl(0.0015, 0.0015, 0.022, M.plastic("#2563eb"), [bw * 0.14, bh * 0.281, -bl * 0.014], [0.3, 0, 0], 4),
        cyl(0.0015, 0.0015, 0.022, M.plastic("#18181b"), [bw * 0.14 + 0.0028, bh * 0.28, -bl * 0.014], [0.3, 0, 0], 4),
        // Cincha transversal en nylon negro y micro-hebilla de cierre rápido sujeta-batería
        box(0.012, 0.002, 0.075, M.plastic("#18181b"), [-bw * 0.12, bh * 0.28 + 0.018, 0]),
        box(0.014, 0.005, 0.012, M.plastic("#38bdf8"), [-bw * 0.12, bh * 0.28 + 0.02, 0.038]),
        // Micro-bridas de nylon negro (Zip-Ties) agrupando y fijando cables de silicona del motor y LiPo a los largueros del chasis
        // Brida 1: abrazadera toroidal en mazo de salida de cables LiPo 12AWG
        tor(0.007, 0.0018, M.plastic("#18181b"), [bw * 0.14, bh * 0.292, -bl * 0.048], [Math.PI / 2 + 0.4, 0, 0], 8),
        box(0.004, 0.003, 0.004, M.plastic("#18181b"), [bw * 0.14 + 0.0035, bh * 0.295, -bl * 0.048], [Math.PI / 2 + 0.4, 0, 0.2]),
        box(0.0015, 0.002, 0.007, M.plastic("#18181b"), [bw * 0.14 + 0.006, bh * 0.298, -bl * 0.05], [Math.PI / 2 + 0.6, 0.25, 0.5]),
        // Brida 2: fijación de cables LiPo al larguero longitudinal del chasis
        tor(0.007, 0.0018, M.plastic("#18181b"), [bw * 0.14 - 0.006, bh * 0.302, -bl * 0.075], [Math.PI / 2 + 0.5, 0, -0.2], 8),
        box(0.004, 0.003, 0.004, M.plastic("#18181b"), [bw * 0.14 - 0.003, bh * 0.306, -bl * 0.075], [Math.PI / 2 + 0.5, 0, 0.1]),
        box(0.0015, 0.002, 0.007, M.plastic("#18181b"), [bw * 0.14 - 0.001, bh * 0.31, -bl * 0.077], [Math.PI / 2 + 0.7, 0.35, 0.3]),
        // Brida 3: mazo de cables de potencia del motor 540 hacia la bancada y variador ESC
        tor(0.007, 0.0018, M.plastic("#18181b"), [0, bh * 0.33, -bl * 0.22 + 0.035], [Math.PI / 2 + 0.3, 0, 0], 8),
        box(0.004, 0.003, 0.004, M.plastic("#18181b"), [0.004, bh * 0.334, -bl * 0.22 + 0.035], [Math.PI / 2 + 0.3, 0, 0.25]),
        box(0.0015, 0.002, 0.007, M.plastic("#18181b"), [0.006, bh * 0.338, -bl * 0.22 + 0.033], [Math.PI / 2 + 0.5, 0.2, 0.55]),
        // Brida 4: fijación de mazo fino de balanceo JST y señal junto a la bandeja del chasis
        tor(0.007, 0.0018, M.plastic("#18181b"), [bw * 0.14 + 0.002, bh * 0.282, -bl * 0.016], [Math.PI / 2 + 0.25, 0, 0], 8),
        box(0.004, 0.003, 0.004, M.plastic("#18181b"), [bw * 0.14 + 0.006, bh * 0.285, -bl * 0.016], [Math.PI / 2 + 0.25, 0, -0.3]),
        box(0.0015, 0.002, 0.006, M.plastic("#18181b"), [bw * 0.14 + 0.008, bh * 0.288, -bl * 0.018], [Math.PI / 2 + 0.45, -0.2, -0.45])
      );
    }
    if (kind === "buggy" || kind === "formula" || kind === "carrera") {
      parts.push(
        // Micro-transponder personal de cronometraje por infrarrojos/RF (personal lap timing transponder) en la bandeja lateral del chasis
        // Carcasa prismática compacta en naranja de competición
        box(0.016, 0.011, 0.014, M.plastic("#f97316"), [-bw * 0.16, bh * 0.25, bl * 0.04]),
        // Pestaña de anclaje con tornillo M2 de fijación al chasis
        box(0.016, 0.002, 0.022, M.plastic("#f97316"), [-bw * 0.16, bh * 0.25 - 0.005, bl * 0.04]),
        cyl(0.003, 0.003, 0.004, chrome, [-bw * 0.16, bh * 0.25 - 0.003, bl * 0.04 + 0.008], [0, 0, 0], 6),
        // Ojo/LED emisor infrarrojo en cúpula semiesférica superior roja/ámbar
        sph(0.005, M.glow("#ef4444"), [-bw * 0.16, bh * 0.25 + 0.006, bl * 0.04 + 0.002], [1, 0.8, 1], 6),
        // Micro-LED testigo verde de sincronización con lazo de cronometraje
        sph(0.0025, M.glow("#22c55e"), [-bw * 0.16 + 0.0045, bh * 0.25 + 0.006, bl * 0.04 - 0.003], undefined, 4),
        // Circuito de encendido del chasis: interruptor estanco de alimentación general con capuchón protector de silicona roja/negra y rótulo de encendido
        // Base rectangular fijada al lateral de la bandeja de electrónica
        box(0.012, 0.008, 0.014, M.plastic("#18181b"), [-bw * 0.18, bh * 0.25, -bl * 0.02]),
        // Palanca basculante fijada al lateral de la bandeja de electrónica
        box(0.004, 0.006, 0.006, M.plastic("#ef4444"), [-bw * 0.18, bh * 0.25 + 0.005, -bl * 0.02], [0.35, 0, 0]),
        // Capuchón protector de silicona roja/negra
        cyl(0.007, 0.007, 0.003, M.plastic("#18181b"), [-bw * 0.18, bh * 0.25 + 0.004, -bl * 0.02], [0, 0, 0], 6),
        cyl(0.005, 0.005, 0.002, M.plastic("#ef4444"), [-bw * 0.18, bh * 0.25 + 0.005, -bl * 0.02], [0, 0, 0], 6),
        // Rótulo de encendido
        box(0.01, 0.001, 0.004, M.plastic("#ef4444"), [-bw * 0.18, bh * 0.25 + 0.004, -bl * 0.02 + 0.005])
      );
    }
    if (kind === "buggy" || kind === "monster" || kind === "formula") {
      // Torre de amortiguación delantera CNC en aluminio anodizado azul con taladros de anclaje
      parts.push(
        box(bw * 0.44, bh * 0.28, 0.008, M.metal("#0284c7"), [0, bh * 0.46, bl * 0.28]),
        cyl(0.006, 0.006, 0.012, M.metal("#0f172a"), [-bw * 0.16, bh * 0.54, bl * 0.28], [Math.PI / 2, 0, 0], 6),
        cyl(0.006, 0.006, 0.012, M.metal("#0f172a"), [bw * 0.16, bh * 0.54, bl * 0.28], [Math.PI / 2, 0, 0], 6),
        // Tirantes superiores de refuerzo de chasis en fibra de carbono mate
        cyl(0.004, 0.004, bl * 0.45, M.matte("#1e293b"), [-bw * 0.15, bh * 0.44, -bl * 0.06], [0.32, 0, -0.12], 4),
        cyl(0.004, 0.004, bl * 0.45, M.matte("#1e293b"), [bw * 0.15, bh * 0.44, -bl * 0.06], [0.32, 0, 0.12], 4)
      );
    }
    for (const sx of [-bw * 0.35, bw * 0.35]) {
      for (const sz of [-bl * 0.32, bl * 0.32]) {
        parts.push(
          cyl(0.005, 0.005, 0.04, M.plastic("#18181b"), [sx, bh * 0.72, sz], [0, 0, 0], 4),
          box(0.012, 0.003, 0.003, chrome, [sx, bh * 0.735, sz]),
          tor(0.007, 0.002, M.plastic("#0284c7"), [sx, bh * 0.725, sz], [Math.PI / 2, 0, 0], 6),
          tor(0.006, 0.0015, chrome, [sx > 0 ? sx + 0.008 : sx - 0.008, bh * 0.735, sz], [0, 0, 0], 8)
        );
      }
    }
    if (kind === "carrera" || (kind as string) === "deportivo") {
      parts.push(box(0.004, 0.09, 0.16, M.matte("#27272a"), [bw * 0.45, bh * 0.65, 0]));
    }
    if (kind === "carrera" || kind === "buggy" || (kind as string) === "deportivo") {
      // Tobera NACA de refrigeración de electrónica embutida en la superficie de la carrocería / capó
      // Conducto triangular divergente en bajorrelieve (M.matte("#111")) con marco de perfil afilado en el color de la moldura/chapa
      const nacaFrameMat = o.trim ? M.plastic(o.trim) : paint;
      const nacaZ = kind === "carrera" ? bl * 0.24 : kind === "buggy" ? bl * 0.19 : bl * 0.22;
      const nacaY = kind === "carrera" ? bh * 0.60 : kind === "buggy" ? bh * 0.62 : bh * 0.60;
      const nacaPitch = kind === "carrera" ? -0.06 : kind === "buggy" ? -0.10 : -0.08;
      parts.push(
        // Rampa interior en bajorrelieve: canal triangular descendente que guía el flujo de aire hacia la electrónica y bancada del motor
        box(0.022, 0.003, 0.04, M.matte("#111"), [0, nacaY - 0.002, nacaZ + 0.038], [nacaPitch - 0.08, 0, 0]),
        box(0.044, 0.003, 0.045, M.matte("#111"), [0, nacaY - 0.007, nacaZ], [nacaPitch - 0.14, 0, 0]),
        box(0.065, 0.004, 0.045, M.matte("#111"), [0, nacaY - 0.013, nacaZ - 0.038], [nacaPitch - 0.20, 0, 0]),
        // Garganta profunda de entrada de aire bajo la carrocería
        box(0.062, 0.016, 0.006, M.matte("#111"), [0, nacaY - 0.012, nacaZ - 0.06], [nacaPitch, 0, 0]),
        // Aleta deflectora longitudinal divisoria de flujo
        box(0.003, 0.012, 0.07, M.matte("#111"), [0, nacaY - 0.008, nacaZ - 0.02], [nacaPitch - 0.14, 0, 0]),
        // Marco de perfil afilado con labios laterales divergentes en color de moldura/chapa
        box(0.005, 0.007, 0.12, nacaFrameMat, [-0.021, nacaY, nacaZ], [nacaPitch, 0.23, 0]),
        box(0.005, 0.007, 0.12, nacaFrameMat, [0.021, nacaY, nacaZ], [nacaPitch, -0.23, 0]),
        // Visera superior transversal afilada sobre la boca de aspiración
        box(0.072, 0.005, 0.008, nacaFrameMat, [0, nacaY + 0.002, nacaZ - 0.062], [nacaPitch, 0, 0]),
        // Vértice afilado frontal donde convergen los flancos
        box(0.016, 0.004, 0.008, nacaFrameMat, [0, nacaY + 0.001, nacaZ + 0.062], [nacaPitch, 0, 0])
      );
    }
    if (kind === "formula" || kind === "buggy") {
      for (const sx of [-bw * 0.32, bw * 0.32]) {
        parts.push(cyl(0.008, 0.008, 0.16, chrome, [sx, bh * 0.25, bl * 0.36], [0, 0, sx > 0 ? 0.3 : -0.3], 4));
      }
    }
    if (kind === "formula" || kind === "buggy" || (kind as string) === "deportivo") {
      // Manguetas de dirección delanteras en aluminio mecanizado CNC
      for (const sx of [-bw * 0.38, bw * 0.38]) {
        parts.push(
          box(0.012, 0.024, 0.016, M.metal("#0284c7"), [sx, bh * 0.25, bl * 0.36]),
          cyl(0.004, 0.004, 0.028, chrome, [sx, bh * 0.25, bl * 0.36], [0, 0, 0], 4),
          // Tuercas ciegas hexagonales métricas de anclaje de rótulas
          cyl(0.006, 0.006, 0.008, chrome, [sx, bh * 0.25 + 0.014, bl * 0.36], [0, 0, 0], 6),
          cyl(0.006, 0.006, 0.008, chrome, [sx, bh * 0.25 - 0.014, bl * 0.36], [0, 0, 0], 6),
          // Soporte C-Hub envolvente
          box(0.016, 0.032, 0.012, M.metal("#0284c7"), [sx, bh * 0.25, bl * 0.36]),
          // Tornillos Kingpin superior e inferior de pivote de giro
          cyl(0.005, 0.005, 0.006, chrome, [sx, bh * 0.25 + 0.018, bl * 0.36], [0, 0, 0], 6),
          cyl(0.005, 0.005, 0.006, chrome, [sx, bh * 0.25 - 0.018, bl * 0.36], [0, 0, 0], 6)
        );
      }
    }
    for (const w of ws) {
      const [sx, wy, wz] = w.pos;
      parts.push(
        // Disco de freno cilíndrico fino en acero templado con ranurado radial montado en el interior de la llanta
        cyl(0.024, 0.024, 0.004, M.metal("#52525b"), [sx > 0 ? sx - 0.015 : sx + 0.015, wy, wz], [0, 0, Math.PI / 2], 12),
        // Pinza de freno (caliper) compacta en rojo competición anodizado abrazando el borde superior del disco
        box(0.008, 0.014, 0.012, M.plastic("#ef4444"), [sx > 0 ? sx - 0.015 : sx + 0.015, wy + 0.018, wz]),
        // Latiguillo flexible de freno mallado en acero inoxidable conectando la pinza con el pasarruedas
        cyl(0.003, 0.003, 0.035, M.metal("#94a3b8"), [sx > 0 ? sx - 0.025 : sx + 0.025, wy + 0.025, wz], [0.3, 0, sx > 0 ? -0.4 : 0.4], 4),
        // Micro-válvula de inflado Schrader en el reborde exterior de la llanta
        cyl(0.003, 0.003, 0.012, M.metal("#18181b"), [sx > 0 ? sx + 0.022 : sx - 0.022, wy + 0.028, wz], [0, 0, sx > 0 ? 0.3 : -0.3], 4),
        // Tuerca hexagonal central de rueda
        cyl(0.01, 0.01, 0.008, chrome, [sx > 0 ? sx + 0.02 : sx - 0.02, wy, wz], [0, 0, Math.PI / 2], 6),
        // Anillo de nylon azul métrico de bloqueo
        cyl(0.006, 0.006, 0.009, M.plastic("#2563eb"), [sx > 0 ? sx + 0.021 : sx - 0.021, wy, wz], [0, 0, Math.PI / 2], 6)
      );
    }
    if (kind !== "tanque") {
      parts.push(
        box(0.015, 0.01, 0.02, M.plastic("#18181b"), [-bw * 0.49, bh * 0.5, bl * 0.1]),
        box(0.006, 0.006, 0.006, M.plastic("#22c55e"), [-bw * 0.49, bh * 0.52, bl * 0.12])
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

  // Calco del capó (textura HD oficial o grilla NEAREST 16x16 propia con alfa; el material se reusa por diseño)
  if (validDecal(o.sticker) && o.sticker !== DECAL_BLANK) {
    const onWing = kind !== "monster" && (o.wing === "alto" || o.wing === "doble"); // plato del alerón: top = el mismo de arriba, +0,033 = medio grosor y holgura
    const [hy, hz, hs, hp] = onWing ? [dy + (o.wing === "alto" ? 0.5 : 0.48) * (small ? 0.7 : 1) + 0.033, dz - 0.04, 0.34, 0.14] : kind === "buggy" ? [q.aleron_alto + 0.033, -1.0, 0.34, q.aleron_incl] : SPOT[kind];
    const isHd = o.sticker in GARAGE_DECALS;
    const mat = pbr("calco" + o.sticker, { color: "#ffffff", rough: isHd ? 0.45 : 0.4 });
    if (!mat.albedoTexture) {
      if (isHd) {
        const tex = new B.Texture(GARAGE_DECALS[o.sticker as GarageDecalId].src, scene);
        tex.hasAlpha = true;
        mat.albedoTexture = tex;
        mat.emissiveTexture = tex;
        mat.emissiveColor = new B.Color3(0.25, 0.25, 0.25);
        mat.useAlphaFromAlbedoTexture = true;
        mat.transparencyMode = B.Material.MATERIAL_ALPHATESTANDBLEND;
      } else {
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
  let ant: B.Mesh | undefined;
  if (kind !== "tanque") {
    const [bw, bh, bl] = CARS_SIZE[kind];
    const ax = bw * 0.35, ay = bh * 0.7, az = -bl * 0.42;
    ant = cyl(0.007, 0.007, 0.65, M.metal("#71717a"), [0, 0.325, 0], undefined, 4);
    ant.position.set(ax, ay, az);
    ant.parent = body;
    // Pequeño banderín o capuchón en el extremo
    const cap = cyl(0.004, 0.004, 0.02, M.plastic("#ef4444"), [0, 0.64, 0], undefined, 4);
    cap.parent = ant;
    cast.push(ant);
  }
  const wheels = ws.map((w) => {
    const { inst: m, cast: c } = wheelInst(w.d, w.w, rim, fb && (!o.tires || o.tires === "serie") && kind !== "tanque" ? "fold" : o.tires === "serie" ? "" : o.tires === "lisas" ? "lisa" : o.tires ?? "");
    m.position = v(w.pos);
    m.parent = body;
    cast.push(c);
    return { m, front: w.steer !== false && w.pos[2] > 0, r: w.d / 2 };
  });
  setTessK(1);
  return { body, wheels, paint, cast, antenna: ant };
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
  if (id === "abuela") {
    const por = M.plastic("#f2efe9"), lil = M.matte("#9b7fc4");
    return [
      cyl(0.19, 0.27, 0.28, M.matte("#5d4a7a"), [0, 0.14, 0], undefined, 8), ...arms(por),
      sph(0.2, por, [0, 0.38, 0]), sph(0.12, lil, [0, 0.56, -0.02]), sph(0.2, lil, [0, 0.45, -0.04], [1, 0.55, 1]),
      tor(0.06, 0.012, M.metal("#222"), [0.065, 0.4, 0.17], undefined, 8), tor(0.06, 0.012, M.metal("#222"), [-0.065, 0.4, 0.17], undefined, 8),
    ];
  }
  if (id === "astronauta") {
    const w = M.plastic("#e8eaee");
    return [
      cyl(0.2, 0.25, 0.3, w, [0, 0.15, 0], undefined, 8), box(0.18, 0.22, 0.1, M.plastic("#9aa0a8"), [0, 0.17, -0.14]), ...arms(w),
      sph(0.23, w, [0, 0.4, 0]), sph(0.17, M.glow("#c9a227"), [0, 0.4, 0.06], [1, 0.85, 0.6]),
    ];
  }
  if (id === "dinogoma") {
    const g = M.plastic("#6bbf59");
    return [
      sph(0.22, g, [0, 0.17, 0], [1, 1.1, 1]), ...arms(g),
      box(0.17, 0.15, 0.3, g, [0, 0.4, 0.05]), box(0.13, 0.04, 0.12, M.plastic("#f4e9c8"), [0, 0.35, 0.18]),
      sph(0.04, M.plastic("#111"), [0.07, 0.46, 0.13], undefined, 4), sph(0.04, M.plastic("#111"), [-0.07, 0.46, 0.13], undefined, 4),
      sph(0.05, M.plastic("#3d7a32"), [0.1, 0.12, 0.2], undefined, 4),
    ];
  }
  if (id === "rusa") {
    const red = M.plastic("#c0392b"), skin = M.matte("#f1d3b3");
    return [
      sph(0.26, red, [0, 0.2, 0], [1, 1.15, 1]), sph(0.19, skin, [0, 0.41, 0.01]), sph(0.21, red, [0, 0.45, -0.03], [1, 0.7, 1]),
      box(0.06, 0.02, 0.02, M.plastic("#111"), [0.06, 0.43, 0.18], [0, 0, 0.3]), box(0.06, 0.02, 0.02, M.plastic("#111"), [-0.06, 0.43, 0.18], [0, 0, -0.3]),
      sph(0.15, M.plastic("#e0a030"), [0, 0.2, 0.2], [1, 1.2, 0.3]),
    ];
  }
  if (id === "pirata") {
    const skin = M.matte("#f1d3b3"), coat = M.matte("#7a2e2e");
    return [
      cyl(0.19, 0.25, 0.28, coat, [0, 0.14, 0], undefined, 8), ...arms(skin),
      sph(0.19, skin, [0, 0.38, 0]), cyl(0.24, 0.24, 0.06, M.matte("#1a1410"), [0, 0.5, 0], undefined, 8), box(0.3, 0.05, 0.12, M.matte("#1a1410"), [0, 0.53, 0]),
      box(0.07, 0.06, 0.02, M.plastic("#111"), [0.06, 0.4, 0.18]), sph(0.035, M.plastic("#111"), [-0.06, 0.4, 0.17], undefined, 4),
    ];
  }
  if (id === "caballero") {
    const tin = M.metal("#8a8f96"), rust = M.matte("#a0522d");
    return [
      cyl(0.2, 0.25, 0.28, tin, [0, 0.14, 0], undefined, 8), ...arms(tin), box(0.14, 0.18, 0.03, rust, [0.2, 0.15, 0.08]),
      cyl(0.17, 0.17, 0.24, tin, [0, 0.4, 0], undefined, 8), box(0.18, 0.025, 0.02, M.plastic("#111"), [0, 0.42, 0.17]),
      box(0.03, 0.12, 0.14, M.matte("#c0392b"), [0, 0.58, -0.02]),
    ];
  }
  if (id === "bombero") {
    const red = M.plastic("#c0392b"), skin = M.matte("#f1d3b3");
    return [
      cyl(0.19, 0.25, 0.28, M.matte("#2b2d31"), [0, 0.14, 0], undefined, 8), box(0.2, 0.03, 0.02, M.glow("#e0a030"), [0, 0.18, 0.13]), ...arms(skin),
      sph(0.19, skin, [0, 0.38, 0]), sph(0.22, red, [0, 0.45, -0.02], [1, 0.6, 1]), cyl(0.27, 0.27, 0.03, red, [0, 0.43, -0.04], undefined, 10),
      sph(0.035, M.plastic("#111"), [0.05, 0.4, 0.17], undefined, 4), sph(0.035, M.plastic("#111"), [-0.05, 0.4, 0.17], undefined, 4),
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

