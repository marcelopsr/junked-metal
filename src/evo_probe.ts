// Sonda de evolución de autos (solo dev, `?evo`; la maneja scripts/evo.mjs). Arma el auto REAL (carModel) con un genoma de prueba,
// mide su geometría y sus siluetas, y opcionalmente renderiza las vistas. Criterios y bandas: docs/EVO_VEHICULOS.md.
// Siluetas por rasterizado propio de triángulos (sin GPU): deterministas y baratas. Vistas PNG con la GPU y los materiales reales.
import * as B from "@babylonjs/core";
import { carModel, factoryColor, type CarKind } from "./models";
import { GENES, genome, original, setGenomeOverride, type Genome } from "./car_genes";
import { SHADOW_ONLY } from "./models/common";
import { CARS } from "./car";
import { CreateScreenshotUsingRenderTargetAsync as shot } from "@babylonjs/core/Misc/screenshotTools.js"; // ruta profunda: solo esta sonda dev la usa (fuera de la fachada bjs.ts)

const N = 128, FRAME = 3.6, CY = 0.3; // grilla de silueta (px), lado del cuadro en metros, altura del centro del cuadro
type Mask = Uint8Array;
type Tris = { body: number[]; wheels: number[] }; // xyz por vértice, 3 vértices por triángulo (mundo)
type WheelInfo = { c: B.Vector3; r: number; w: number; front: boolean };

// ---------- Geometría ----------
const isAntenna = (x: number, y: number, z: number) => y > 0.25 && Math.abs(x - 0.38) < 0.1 && Math.abs(z + 0.7) < 0.1; // antena fija de todos los autos (no es diseño: fuera de caja y siluetas)
function collect(body: B.Mesh, wheels: { m: B.AbstractMesh; front: boolean; r: number }[], antenna?: B.Mesh): { t: Tris; wi: WheelInfo[] } {
  const t: Tris = { body: [], wheels: [] };
  const wheelSet = new Set(wheels.map((w) => w.m));
  for (const m of [body, ...body.getChildMeshes(false)]) {
    if (m.layerMask === SHADOW_ONLY || !m.isEnabled() || !m.isVisible || (antenna && (m === antenna || m.isDescendantOf(antenna)))) continue; // antena animada de car.ts: tampoco es diseño
    const src = m instanceof B.InstancedMesh ? m.sourceMesh : (m as B.Mesh);
    const pos = src.getVerticesData(B.VertexBuffer.PositionKind), idx = src.getIndices();
    if (!pos || !idx) continue;
    m.computeWorldMatrix(true);
    const W = m.getWorldMatrix(), out = wheelSet.has(m) ? t.wheels : t.body, v = new B.Vector3();
    for (let i = 0; i < idx.length; i += 3) {
      const tri: number[] = [];
      for (let k = 0; k < 3; k++) { const j = idx[i + k] * 3; B.Vector3.TransformCoordinatesFromFloatsToRef(pos[j], pos[j + 1], pos[j + 2], W, v); tri.push(v.x, v.y, v.z); }
      if (out === t.body && isAntenna(tri[0], tri[1], tri[2]) && isAntenna(tri[3], tri[4], tri[5]) && isAntenna(tri[6], tri[7], tri[8])) continue;
      out.push(...tri);
    }
  }
  const wi = wheels.map((w) => { w.m.computeWorldMatrix(true); const bb = w.m.getBoundingInfo().boundingBox; return { c: w.m.getAbsolutePosition().clone(), r: bb.extendSize.y, w: bb.extendSize.x * 2, front: w.front }; }); // medidas reales (tacos incluidos), no las nominales
  return { t, wi };
}

function bbox(a: number[]) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < a.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], a[i + k]); hi[k] = Math.max(hi[k], a[i + k]); }
  return { lo, hi, size: hi.map((h, k) => h - lo[k]) };
}

/** Puntos de la carrocería (vértices, centros y medios de aristas) dentro de la goma de una rueda (anillo de 0,55 r a r: la maza recibe brazos y amortiguadores a propósito);
 *  las delanteras se prueban dobladas ±0,45 rad (giro visual de car.ts). */
function wheelHits(body: number[], wi: WheelInfo[]) {
  let hits = 0;
  const pts: number[] = [];
  for (let i = 0; i < body.length; i += 9) {
    for (let k = 0; k < 9; k++) pts.push(body[i + k]);
    for (const [a, b] of [[0, 3], [3, 6], [6, 0]]) pts.push((body[i + a] + body[i + b]) / 2, (body[i + a + 1] + body[i + b + 1]) / 2, (body[i + a + 2] + body[i + b + 2]) / 2);
    pts.push((body[i] + body[i + 3] + body[i + 6]) / 3, (body[i + 1] + body[i + 4] + body[i + 7]) / 3, (body[i + 2] + body[i + 5] + body[i + 8]) / 3);
  }
  for (const w of wi) for (const yaw of w.front ? [-0.45, 0, 0.45] : [0]) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    for (let i = 0; i < pts.length; i += 3) {
      const dx = pts[i] - w.c.x, dy = pts[i + 1] - w.c.y, dz = pts[i + 2] - w.c.z;
      const lx = dx * c - dz * s, lz = dx * s + dz * c; // al marco de la rueda (eje en x)
      const d = Math.hypot(dy, lz); if (Math.abs(lx) < w.w / 2 - 0.01 && d < w.r - 0.01 && d > w.r * 0.55) hits++;
    }
  }
  return hits;
}

/** Piezas sueltas: vóxeles de 3 cm sobre la superficie de todos los triángulos y componentes conexas (26 vecinos). */
function components(all: number[]) {
  const V = 0.03, b = bbox(all), nx = Math.ceil(b.size[0] / V) + 3, ny = Math.ceil(b.size[1] / V) + 3, nz = Math.ceil(b.size[2] / V) + 3;
  const grid = new Uint8Array(nx * ny * nz), id = (x: number, y: number, z: number) => x + nx * (y + ny * z);
  const mark = (x: number, y: number, z: number) => { grid[id(((x - b.lo[0]) / V | 0) + 1, ((y - b.lo[1]) / V | 0) + 1, ((z - b.lo[2]) / V | 0) + 1)] = 1; };
  for (let i = 0; i < all.length; i += 9) {
    const e = Math.max(Math.hypot(all[i] - all[i + 3], all[i + 1] - all[i + 4], all[i + 2] - all[i + 5]), Math.hypot(all[i + 3] - all[i + 6], all[i + 4] - all[i + 7], all[i + 5] - all[i + 8]), Math.hypot(all[i] - all[i + 6], all[i + 1] - all[i + 7], all[i + 2] - all[i + 8]));
    const n = Math.max(1, Math.ceil(e / (V * 0.5)));
    for (let u = 0; u <= n; u++) for (let v = 0; v <= n - u; v++) {
      const a = u / n, c = v / n, w = 1 - a - c;
      mark(all[i] * w + all[i + 3] * a + all[i + 6] * c, all[i + 1] * w + all[i + 4] * a + all[i + 7] * c, all[i + 2] * w + all[i + 5] * a + all[i + 8] * c);
    }
  }
  let comps = 0; const stack: number[] = [];
  for (let s = 0; s < grid.length; s++) {
    if (grid[s] !== 1) continue;
    comps++; grid[s] = 2; stack.push(s);
    while (stack.length) {
      const q = stack.pop()!, x = q % nx, y = ((q / nx) | 0) % ny, z = (q / (nx * ny)) | 0;
      for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy, Z = z + dz;
        if (X < 0 || Y < 0 || Z < 0 || X >= nx || Y >= ny || Z >= nz) continue;
        const j = id(X, Y, Z); if (grid[j] === 1) { grid[j] = 2; stack.push(j); }
      }
    }
  }
  return comps;
}

// ---------- Siluetas ----------
const VIEWS = {
  lateral: (x: number, y: number, z: number) => [z, y - CY],
  frontal: (x: number, y: number, z: number) => [x, y - CY],
  superior: (x: number, _y: number, z: number) => [x, z],
  juego: (x: number, y: number, z: number) => { const p = 0.7; return [x, (y - CY) * Math.cos(p) + z * Math.sin(p)]; }, // cámara de partida: detrás y arriba (~40°)
  tres_cuartos: (x: number, y: number, z: number) => { const a = Math.PI / 4, p = 0.5, xr = x * Math.cos(a) - z * Math.sin(a), zr = x * Math.sin(a) + z * Math.cos(a); return [xr, (y - CY) * Math.cos(p) - zr * Math.sin(p)]; },
} as const;
type View = keyof typeof VIEWS;

function raster(tris: number[], view: View, m: Mask = new Uint8Array(N * N)) {
  const P = VIEWS[view], k = N / FRAME, px = (u: number) => u * k + N / 2;
  for (let i = 0; i < tris.length; i += 9) {
    const [u0, v0] = P(tris[i], tris[i + 1], tris[i + 2]), [u1, v1] = P(tris[i + 3], tris[i + 4], tris[i + 5]), [u2, v2] = P(tris[i + 6], tris[i + 7], tris[i + 8]);
    const ax = px(u0), ay = px(v0), bx = px(u1), by = px(v1), cx = px(u2), cy = px(v2);
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(area) < 1e-9) continue;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(N - 1, Math.ceil(Math.max(ax, bx, cx)));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(N - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const qx = x + 0.5, qy = y + 0.5;
      const w0 = ((bx - qx) * (cy - qy) - (by - qy) * (cx - qx)) / area, w1 = ((cx - qx) * (ay - qy) - (cy - qy) * (ax - qx)) / area;
      if (w0 >= 0 && w1 >= 0 && w0 + w1 <= 1) m[(N - 1 - y) * N + x] = 1;
    }
  }
  return m;
}
const count = (m: Mask) => { let n = 0; for (const v of m) n += v; return n; };
const iou = (a: Mask, b: Mask) => { let i = 0, u = 0; for (let j = 0; j < a.length; j++) { i += a[j] & b[j]; u += a[j] | b[j]; } return u ? i / u : 1; };
/** Qué tanto de la silueta sobrevive a lo lejos: bajarla a N/k px (celda llena si cubre ≥ 50 %), volverla a subir y comparar. */
function lowIoU(m: Mask, k = 8) {
  const n = N / k, up = new Uint8Array(N * N);
  for (let cy = 0; cy < n; cy++) for (let cx = 0; cx < n; cx++) {
    let s = 0; for (let y = 0; y < k; y++) for (let x = 0; x < k; x++) s += m[(cy * k + y) * N + cx * k + x];
    if (s * 2 >= k * k) for (let y = 0; y < k; y++) for (let x = 0; x < k; x++) up[(cy * k + y) * N + cx * k + x] = 1;
  }
  return iou(m, up);
}
function shape(m: Mask) {
  let x0 = N, x1 = -1, y0 = N, y1 = -1, per = 0, cx = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!m[y * N + x]) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); cx += x;
    if (x === 0 || y === 0 || x === N - 1 || y === N - 1 || !m[y * N + x - 1] || !m[y * N + x + 1] || !m[(y - 1) * N + x] || !m[(y + 1) * N + x]) per++;
  }
  const area = count(m), w = x1 - x0 + 1, h = y1 - y0 + 1;
  return { area, w, h, fill: area / (w * h), compact: (per * per) / (4 * Math.PI * Math.max(1, area)), cx: (cx / Math.max(1, area) - N / 2) * FRAME / N };
}
/** Fracción de la silueta lateral por encima de y (m): cuánto pesa lo alto (alerón, jaula) frente al cuerpo. */
const upper = (m: Mask, y: number) => { const row = Math.floor(N / 2 - (y - CY) * N / FRAME); let a = 0; for (let i = 0; i < row * N; i++) a += m[i]; return a / Math.max(1, count(m)); };
const b64 = (m: Mask) => { let s = ""; for (let i = 0; i < m.length; i += 8) { let b = 0; for (let k = 0; k < 8; k++) b |= m[i + k] << k; s += String.fromCharCode(b); } return btoa(s); };

// ---------- Bandas de proporción (juicio de diseño documentado en docs/EVO_VEHICULOS.md) ----------
const BANDS: Record<string, Record<string, [number, number]>> = {
  buggy: {
    ruedas_visibles: [0.6, 0.85], // RC: se lee por las ruedas grandes y expuestas
    stance: [0.6, 0.75], // diámetro de rueda / alto total: juguete chato y "pisador"
    masa_atras: [-0.3, -0.02], // centroide lateral detrás del centro (motor trasero), en batallas
    llenado_lateral: [0.42, 0.62], // < flaco y ruidoso (se pierde a lo lejos), > ladrillo
    alto_largo: [0.48, 0.6],
    aleron_ancho: [0.55, 0.7], // rondas 2-3: el alerón de serie no debe cruzar todo el ancho entre ruedas (se cumplía agrandando la bañera); el original da 0,75
    pintura_visible: [0.22, 0.45], // ciclo 2: desde la cámara de partida, a 48 px, más presencia del color de identidad (el original da 0,18)
    masa_alta: [0, 0.065], // techo: lo alto (alerón, jaula) no crece sobre la bañera (evaluación visual, ronda 1); el original da 0,052
  },
};
/** Autos sin bandas propias: las proporciones quedan a ±10 % de su original (barandas, no empujan) y la pintura visible tiene que crecer ≥ 5 %. */
const AUTO = ["ruedas_visibles", "stance", "masa_atras", "llenado_lateral", "alto_largo", "masa_alta"];
function autoBands(b: { m: Record<string, unknown>; paint?: number }) {
  const out: Record<string, [number, number]> = {};
  for (const k of AUTO) { const v = b.m[k] as number, t = Math.max(0.03, Math.abs(v) * 0.1); out[k] = [v - t, v + t]; }
  out.pintura_visible = [(b.paint ?? 0) * 1.05, 0.7]; // empuje suave: con +15 % la evolución engordaba carrocerías a costa de las ruedas (evaluador, monster y fórmula)
  return out;
}
const band = (x: number, [lo, hi]: [number, number]) => Math.max(0, lo - x, x - hi) / (hi - lo);

// ---------- Evaluación ----------
type Base = { masks: Record<View, Mask>; despeje: number; tris: number; size: number[]; comps: number; height: number; hits: number; degen: number; m: Record<string, unknown>; paint?: number };
const bases = new Map<string, Base>();
let others: Mask[] | null = null;

function build(kind: CarKind, g: Genome | null) {
  setGenomeOverride(kind, g);
  try { return carModel(kind, { fixed: true }); } finally { setGenomeOverride(kind, null); }
}

function measure(kind: CarKind, g: Genome | null) {
  const cm = build(kind, g);
  const { t, wi } = collect(cm.body, cm.wheels, cm.antenna);
  const all = [...t.body, ...t.wheels];
  const masks = Object.fromEntries((Object.keys(VIEWS) as View[]).map((v) => [v, raster(all, v)])) as Record<View, Mask>;
  const sideBody = raster(t.body, "lateral"), sideWheels = raster(t.wheels, "lateral");
  let vis = 0; for (let j = 0; j < sideWheels.length; j++) vis += sideWheels[j] & (sideBody[j] ^ 1);
  const b = bbox(all), bb = bbox(t.body), wheelBottom = Math.min(...wi.map((w) => w.c.y - w.r));
  const nan = all.some((x) => !Number.isFinite(x));
  let degen = 0;
  for (let i = 0; i < all.length; i += 9) {
    const ux = all[i + 3] - all[i], uy = all[i + 4] - all[i + 1], uz = all[i + 5] - all[i + 2], vx = all[i + 6] - all[i], vy = all[i + 7] - all[i + 1], vz = all[i + 8] - all[i + 2];
    if (Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) < 1e-10) degen++;
  }
  const side = shape(masks.lateral), wheelD = 2 * Math.max(...wi.map((w) => w.r)), wb = Math.max(0.1, (Math.max(...wi.map((w) => w.c.z)) - Math.min(...wi.map((w) => w.c.z))) / 2);
  const m = {
    tris: all.length / 9, submallas: cm.body.subMeshes?.length ?? 1, ancho: b.size[0], alto: b.size[1], largo: b.size[2],
    despeje: bb.lo[1] - wheelBottom, choques_rueda: wheelHits(t.body, wi), piezas: components(all), degenerados: degen, nan,
    ruedas_visibles: vis / Math.max(1, count(sideWheels)), stance: wheelD / b.size[1], masa_atras: side.cx / wb,
    llenado_lateral: side.fill, alto_largo: side.h / side.w, compacidad: side.compact,
    legible: { lateral: lowIoU(masks.lateral), juego: lowIoU(masks.juego), tres_cuartos: lowIoU(masks.tres_cuartos) },
    masa_alta: upper(masks.lateral, 0.72),
    aleron_ancho: g && g.aleron_ancho ? g.aleron_ancho / (2 * g.trocha + g.rueda_w) : 0, // ancho del alerón / ancho total entre caras externas de las ruedas (medidas exactas)
  };
  cm.body.dispose();
  return { m, masks };
}

let warm = false;
async function evaluate(scene: B.Scene, kind: CarKind, g: Genome) {
  others ??= (Object.keys(CARS) as CarKind[]).filter((k) => k !== kind).map((k) => measure(k, null).masks.lateral); // primero: armar autos cambia estado de la escena (luz del faro) y la medida de color tiene que verlo siempre igual
  if (!warm) { warm = true; await paintShare(scene, kind, original(kind)); } // y una captura de calentamiento
  const base = baseline(kind), { m, masks } = measure(kind, g);
  (m as Record<string, unknown>).pintura_visible = await paintShare(scene, kind, g);
  const ident = { lateral: iou(masks.lateral, base.masks.lateral), frontal: iou(masks.frontal, base.masks.frontal), superior: iou(masks.superior, base.masks.superior) };
  others ??= (Object.keys(CARS) as CarKind[]).filter((k) => k !== kind).map((k) => measure(k, null).masks.lateral);
  const parecido = Math.max(...others.map((o) => iou(masks.lateral, o)));
  base.paint ??= await paintShare(scene, kind, original(kind));
  const bands = BANDS[kind] ?? autoBands(base);
  const prop = Object.fromEntries(Object.entries(bands).map(([k, b]) => [k, band((m as unknown as Record<string, number>)[k], b)]));
  // Objetivos a minimizar (Pareto): ninguno se suma a otro, así una mejora no puede comprarse sacrificando un aspecto esencial.
  const obj = [
    1 - (m.legible.lateral + m.legible.juego + m.legible.tres_cuartos) / 3, // pérdida de legibilidad a distancia (costado, 3/4 y cámara de partida)
    Object.values(prop).reduce((a, b) => a + b, 0), // error de proporciones (fuera de banda)
    m.tris / base.tris, // costo de render
    parecido, // parecido al resto de la flota (identidad)
  ];
  // Restricciones duras (0 = cumple): identidad, físicas, animación, errores geométricos, presupuesto.
  const r = {
    identidad: Math.max(0, 0.75 - ident.lateral) + Math.max(0, 0.75 - ident.superior) + Math.max(0, 0.8 - ident.frontal),
    choques_rueda: m.choques_rueda > base.hits ? 0.1 + (m.choques_rueda - base.hits) / 50 : 0, // relativas al original: lo que ya se juega es válido por definición
    despeje: Math.max(0, Math.min(0.25, base.despeje) - 0.005 - m.despeje), // ≥ 0,25 m o lo del original si es menos (orugas del tanque)
    caja: Math.max(0, m.ancho - base.size[0] * 1.06) + Math.max(0, m.largo - base.size[2] * 1.08) + Math.max(0, m.alto - base.height - 0.15),
    triangulos: Math.max(0, m.tris / base.tris - 1.3),
    piezas_sueltas: Math.max(0, m.piezas - base.comps),
    errores: (m.nan ? 1 : 0) + Math.max(0, m.degenerados - base.degen) / 10,
  };
  const viol = Object.values(r).reduce((a, b) => a + b, 0);
  return { obj, viol, m: { ...m, identidad: ident, parecido, prop, restr: r }, masks: { lateral: b64(masks.lateral), tres_cuartos: b64(masks.tres_cuartos) } };
}

function baseline(kind: CarKind): Base {
  let b = bases.get(kind);
  if (!b) { const { m, masks } = measure(kind, original(kind)); b = { masks, despeje: m.despeje, tris: m.tris, size: [m.ancho, m.alto, m.largo], comps: m.piezas, height: m.alto, hits: m.choques_rueda, degen: m.degenerados, m }; bases.set(kind, b); }
  return b;
}

// ---------- Vistas PNG (materiales reales) y OBJ ----------
const CAMS: Record<string, [number, number, number]> = { frontal: [0, 0, 1], lateral: [1, 0, 0], trasera: [0, 0, -1], superior: [0, 1, -0.001], tres_cuartos: [1, 0.75, 1], juego: [0, 0.84, -1] }; // juego: detrás y arriba ~40°, como la cámara de partida
// ---------- Color (ciclo 2): render real desde la cámara de partida a 48 px ----------
const hue = (r: number, g: number, b: number) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return [0, 0, mx]; const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(h * 60 + 360) % 360, d / mx, mx]; };
async function pixels(url: string) {
  const im = new Image(); im.src = url; await im.decode();
  const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const x = c.getContext("2d")!; x.drawImage(im, 0, 0);
  return x.getImageData(0, 0, c.width, c.height).data;
}
/** Fracción de los píxeles del auto (los que no son fondo) con el tono de su pintura de fábrica (±22°, saturados). */
async function paintShare(scene: B.Scene, kind: CarKind, g: Genome) {
  const url = (await views(scene, kind, g, 48, ["juego"], false)).juego, d = await pixels(url);
  const [ph] = hue(...(B.Color3.FromHexString(factoryColor(kind).paint).asArray() as [number, number, number]));
  let car = 0, paint = 0;
  for (let i = 0; i < d.length; i += 4) {
    const [h, s, v] = hue(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
    if (Math.abs(d[i] - 31) + Math.abs(d[i + 1] - 33) + Math.abs(d[i + 2] - 38) < 18) continue; // fondo (clearColor)
    car++; if (s > 0.45 && v > 0.2 && Math.min(Math.abs(h - ph), 360 - Math.abs(h - ph)) < 22) paint++;
  }
  return paint / Math.max(1, car);
}
/** Hoja comparativa: una fila por variante (la primera, el original), una columna por vista. Para el evaluador visual. */
async function sheet(scene: B.Scene, kind: CarKind, gs: Genome[], names: string[], vs = ["juego", "tres_cuartos", "trasera", "lateral"], notes: string[] = []) {
  const S = 192, c = document.createElement("canvas"); c.width = S * (vs.length + 1) + 170; c.height = S * gs.length; const x = c.getContext("2d")!;
  x.fillStyle = "#0b0f14"; x.fillRect(0, 0, c.width, c.height); x.font = "bold 16px sans-serif"; x.fillStyle = "#ff9138";
  for (let i = 0; i < gs.length; i++) {
    const v = await views(scene, kind, gs[i], S, vs);
    x.fillText(names[i], 6, i * S + 24);
    x.font = "12px monospace"; x.fillStyle = "#d8dde3"; (notes[i] ?? "").split("\n").forEach((l, k) => x.fillText(l, 6, i * S + 48 + k * 15)); x.font = "bold 16px sans-serif"; x.fillStyle = "#ff9138";
    const far = new Image(); far.src = (await views(scene, kind, gs[i], 48, ["juego"])).juego; await far.decode();
    x.imageSmoothingEnabled = false; x.drawImage(far, 170 + vs.length * S, i * S, S, S); x.imageSmoothingEnabled = true; // lejos: 48 px ampliados sin suavizar
    for (let j = 0; j < vs.length; j++) { const im = new Image(); im.src = v[vs[j]]; await im.decode(); x.drawImage(im, 170 + j * S, i * S); }
  }
  return c.toDataURL("image/png");
}
let floorM: B.StandardMaterial | null = null;
/** `floor`: piso gris verdoso bajo las ruedas para que el negro de las gomas no se funda con el fondo (solo imágenes para mirar; la medida de color usa fondo liso). */
async function views(scene: B.Scene, kind: CarKind, g: Genome, size = 256, only?: string[], floor = true) {
  const cm = build(kind, g), out: Record<string, string> = {};
  await scene.whenReadyAsync(); // texturas del atlas cargadas: sin esto la primera captura de la página sale sin color
  let fl: B.Mesh | null = null;
  if (floor) {
    fl = B.MeshBuilder.CreateGround("evoFloor", { width: 6, height: 6 }, scene);
    fl.position.y = Math.min(...cm.wheels.map((w) => w.m.position.y - w.r)) - 0.01;
    floorM ??= Object.assign(new B.StandardMaterial("evoFloor", scene), { emissiveColor: B.Color3.FromHexString("#4d5844"), disableLighting: true });
    fl.material = floorM;
  }
  const cam = new B.FreeCamera("evoCam", B.Vector3.Zero(), scene);
  cam.mode = B.Camera.ORTHOGRAPHIC_CAMERA; cam.minZ = 0.1; cam.maxZ = 50;
  const h = FRAME / 2 * 0.92; cam.orthoLeft = -h; cam.orthoRight = h; cam.orthoTop = h; cam.orthoBottom = -h;
  const tgt = new B.Vector3(0, CY, 0);
  for (const [name, d] of Object.entries(CAMS)) {
    if (only && !only.includes(name)) continue;
    cam.position = tgt.add(new B.Vector3(...d).normalize().scale(12)); cam.setTarget(tgt);
    out[name] = await shot(scene.getEngine(), cam, { width: size, height: size }, "image/png", 4);
  }
  if (!only) { cam.position = tgt.add(new B.Vector3(...CAMS.juego).normalize().scale(12)); cam.setTarget(tgt); } // a lo lejos: cámara de partida a 48 px (tamaño aproximado en pantalla)
  if (!only) out.lejos = await shot(scene.getEngine(), cam, { width: 48, height: 48 }, "image/png", 1);
  cam.dispose(); cm.body.dispose(); fl?.dispose();
  return out;
}
function obj(kind: CarKind, g: Genome) {
  const cm = build(kind, g), { t } = collect(cm.body, cm.wheels, cm.antenna), all = [...t.body, ...t.wheels];
  let s = `# ${kind} (genoma evolucionado, Junked Metal)\n`;
  for (let i = 0; i < all.length; i += 3) s += `v ${all[i].toFixed(4)} ${all[i + 1].toFixed(4)} ${all[i + 2].toFixed(4)}\n`;
  for (let i = 1; i <= all.length / 3; i += 3) s += `f ${i} ${i + 1} ${i + 2}\n`;
  cm.body.dispose();
  return s;
}

export function evoProbe(scene: B.Scene) {
  scene.clearColor = new B.Color4(0.12, 0.13, 0.15, 1);
  // ponytail: cada diámetro/ancho de rueda nuevo deja una fuente de rueda cacheada (wheelInst); se redondea a cm para acotarlo
  const round = (g: Genome) => { const o = { ...g }; for (const k of ["rueda_d", "rueda_w"]) if (k in o) o[k] = Math.round(o[k] * 100) / 100; return o; };
  Object.assign(window, { __evo: {
    spec: (kind: string) => GENES[kind] ?? null,
    eval: async (kind: CarKind, gs: Genome[]) => { const out = []; for (const g of gs) { const r = round(g); out.push({ g: r, ...await evaluate(scene, kind, r) }); } return out; },
    sheet: (kind: CarKind, gs: Genome[], names: string[], notes?: string[]) => sheet(scene, kind, gs.map(round), names, undefined, notes),
    vigente: (kind: string) => genome(kind),
    original: (kind: string) => original(kind),
    kinds: () => Object.keys(CARS),
    views: (kind: CarKind, g: Genome, size?: number) => views(scene, kind, round(g), size),
    obj: (kind: CarKind, g: Genome) => obj(kind, round(g)),
  } });
}
