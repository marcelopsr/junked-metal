// Sistema base Folded 2.5D (ver docs/ART_DIRECTION.md, "Folded 2.5D"): materiales, trim sheet, calcos y kit de geometría.
// Paleta: PAL en kit3d.ts. Todo se genera una vez (canvas → textura chica sin filtrar) y se cachea; los materiales pasan por
// snapMat (render.ts) para pixelar vértices igual que el resto del mundo. Sin pipelines nuevos: PBR estándar con variantes por parámetro.
import * as B from "@babylonjs/core";
import { lcg, PAL, wornCanvas, wornTex } from "./kit3d";
import { snapMat } from "./render";

/** Folded 2.5D activo en todo el juego (antes bandera `?folded2`). Los GLB viejos y los procedurales previos quedan sin usar (ASSET_INVENTORY).
 *  ponytail: constante en vez de borrar las ramas viejas de models.ts/world.ts/glb.ts; borrarlas cuando no se necesite comparar. */
export const FOLDED_SLICE = true;

type V3 = [number, number, number];
type Ctx = CanvasRenderingContext2D;
const sc = () => B.Engine.LastCreatedScene!;

// ---------- Materiales ----------
const cache = new Map<string, B.PBRMaterial>();
const once = (key: string, make: (m: B.PBRMaterial) => void) => {
  let m = cache.get(key);
  if (m) return m;
  m = new B.PBRMaterial("fold" + key, sc());
  make(m); snapMat(m); cache.set(key, m);
  return m;
};
const orm = (rough: number, metal: number) => `rgb(255,${(rough * 255) | 0},${(metal * 255) | 0})`;
const flat = (key: string, color: string, rough: number, metal: number, emissive?: string) => once(key, (m) => {
  m.albedoColor = B.Color3.FromHexString(color).toLinearSpace(); m.roughness = rough; m.metallic = metal;
  if (emissive) m.emissiveColor = B.Color3.FromHexString(emissive);
  m.metadata = { tile: () => tile(key, (a, o, e, x, y) => {
    a.fillStyle = color; a.fillRect(x, y, TS, TS); o.fillStyle = orm(rough, metal); o.fillRect(x, y, TS, TS);
    if (emissive) { e.fillStyle = emissive; e.fillRect(x, y, TS, TS); }
  }) };
});

// ---------- Atlas: todas las chapas pintadas y colores lisos en celdas de 64 px de UNA textura (albedo + metal/rugosidad + emisivo) ----------
// Las piezas armadas con kit() de folded_slice.ts remapean sus UV a su celda (toTile) y usan un solo material: una plantilla Folded
// queda en 2-3 submallas (atlas, trim, calcos) en vez de una por color. 16x16 celdas = 256 materiales distintos.
const AT = 1024, TS = 64, PER = AT / TS;
let atl: { alb: B.DynamicTexture; orm: B.DynamicTexture; em: B.DynamicTexture; mat: B.PBRMaterial } | null = null;
const tiles = new Map<string, number>();
const cx = (t: B.DynamicTexture) => t.getContext() as unknown as Ctx;
function atlas() {
  if (atl && !atl.mat.getScene()?.isDisposed) return atl;
  const mk = (n: string, fill: string) => { const t = new B.DynamicTexture(n, AT, sc(), false, B.Texture.NEAREST_SAMPLINGMODE); cx(t).fillStyle = fill; cx(t).fillRect(0, 0, AT, AT); return t; };
  const alb = mk("foldAtlasA", "#808080"), om = mk("foldAtlasO", orm(0.6, 0.1)), em = mk("foldAtlasE", "#000000");
  em.gammaSpace = false; // como emissiveColor (hex sin pasar a lineal)
  const m = new B.PBRMaterial("foldAtlas", sc());
  m.albedoTexture = alb; m.metallicTexture = om; m.roughness = 1; m.metallic = 1; m.emissiveTexture = em; m.emissiveColor = B.Color3.White();
  m.useRoughnessFromMetallicTextureGreen = true; m.useMetallnessFromMetallicTextureBlue = true; m.useRoughnessFromMetallicTextureAlpha = false;
  snapMat(m); tiles.clear();
  return (atl = { alb, orm: om, em, mat: m });
}
function tile(key: string, draw: (a: Ctx, o: Ctx, e: Ctx, x: number, y: number) => void) {
  const A = atlas();
  let i = tiles.get(key);
  if (i !== undefined) return i;
  i = tiles.size;
  if (i >= PER * PER) throw new Error("atlas Folded lleno (256 celdas): agrandar AT");
  draw(cx(A.alb), cx(A.orm), cx(A.em), (i % PER) * TS, ((i / PER) | 0) * TS);
  A.alb.update(false); A.orm.update(false); A.em.update(false);
  tiles.set(key, i);
  return i;
}
/** El material único del atlas. */
export const foldAtlas = () => atlas().mat;
/** Celda del atlas de un material FOLD (painted, bare, rust, dark, rubber, plastic, screen, emissive) o undefined (trim, calcos, otros). */
export const foldTile = (m: B.Material) => (m.metadata as { tile?: () => number } | null)?.tile?.();
/** Lleva las UV (0..1) de la malla a la celda t (medio texel adentro: sin sangrado con NEAREST). */
export function toTile(m: B.Mesh, t: number) {
  const uv = m.getVerticesData(B.VertexBuffer.UVKind);
  if (!uv) return;
  const x = (t % PER) * TS, y = ((t / PER) | 0) * TS, c = (v: number) => Math.min(1, Math.max(0, v));
  for (let k = 0; k < uv.length; k += 2) { uv[k] = (x + 0.5 + c(uv[k]) * (TS - 1)) / AT; uv[k + 1] = (y + 0.5 + c(uv[k + 1]) * (TS - 1)) / AT; }
  m.setVerticesData(B.VertexBuffer.UVKind, uv);
}
/** Biblioteca de materiales. `wear` 0..1: pintura saltada en bordes y mugre; sobre 0,4 el óxido avanza desde esquinas y el borde de apoyo. */
export const FOLD = {
  painted: (c: string, wear = 0.6, seed = 11) => once(`p${c}|${wear}|${seed}`, (m) => {
    const t = wornTex(sc(), seed, c, null, 64, wear, Math.max(0, wear - 0.4) / 0.6); // óxido en esquinas y apoyo, no manchas
    m.albedoTexture = t.alb; m.metallicTexture = t.orm; m.roughness = 1; m.metallic = 1;
    m.useRoughnessFromMetallicTextureGreen = true; m.useMetallnessFromMetallicTextureBlue = true; m.useRoughnessFromMetallicTextureAlpha = false;
    m.metadata = { tile: () => tile(`p${c}|${wear}|${seed}`, (a, o, _e, x, y) => {
      const w = wornCanvas(seed, c, null, wear, Math.max(0, wear - 0.4) / 0.6); a.drawImage(w.a, x, y, TS, TS); o.drawImage(w.o, x, y, TS, TS);
    }) };
  }),
  bare: () => flat("bare", PAL.metalClaro, 0.32, 1),
  rust: () => flat("rust", PAL.oxido, 0.95, 0.25),
  dark: () => flat("dark", PAL.negro, 0.7, 0.4),
  /** Goma con polvo de tierra que se junta hacia los cantos de la celda (hombros de la banda, borde de apoyo de los tacos). */
  rubber: () => once("rubber", (m) => {
    m.albedoColor = B.Color3.FromHexString(PAL.goma).toLinearSpace(); m.roughness = 0.9; m.metallic = 0;
    m.metadata = { tile: () => tile("rubber", (a, o, _e, x, y) => {
      a.fillStyle = PAL.goma; a.fillRect(x, y, TS, TS); o.fillStyle = orm(0.88, 0); o.fillRect(x, y, TS, TS);
      for (let i = 0; i < 8; i++) { // franjas de polvo: densas en el borde, se apagan hacia el centro (abajo más, es el apoyo)
        const k = 1 - i / 8; a.fillStyle = `rgba(110,88,60,${0.5 * k})`; o.fillStyle = orm(1, 0);
        a.fillRect(x, y + i * 2, TS, 2); a.fillRect(x, y + TS - 2 - i * 3, TS, 3); if (k > 0.6) o.fillRect(x, y + TS - 3 - i * 3, TS, 3);
      }
    }) };
  }),
  /** Quitina: oscura, lisa y con brillo (rugosidad baja), filo más oscuro y mate en los cantos; sin desgaste de chapa. */
  chitin: (c: string) => once("ch" + c, (m) => {
    m.albedoColor = B.Color3.FromHexString(c).toLinearSpace(); m.roughness = 0.3; m.metallic = 0.15;
    m.metadata = { tile: () => tile("ch" + c, (a, o, _e, x, y) => {
      a.fillStyle = c; a.fillRect(x, y, TS, TS); o.fillStyle = orm(0.28, 0.15); o.fillRect(x, y, TS, TS);
      a.fillStyle = "rgba(0,0,0,0.35)"; o.fillStyle = orm(0.55, 0.05);
      for (const r of [[0, 0, TS, 6], [0, TS - 6, TS, 6], [0, 0, 6, TS], [TS - 6, 0, 6, TS]]) { a.fillRect(x + r[0], y + r[1], r[2], r[3]); o.fillRect(x + r[0], y + r[1], r[2], r[3]); }
      a.fillStyle = "rgba(255,240,220,0.12)"; a.fillRect(x + 10, y + 12, TS - 20, 8); // reflejo ancho (se lee de lejos, no es detalle)
    }) };
  }),
  /** Tornillos y remaches: acero con óxido acumulado en la unión (la celda entera es la cabeza: se oxida el anillo exterior). */
  bolt: () => once("bolt", (m) => {
    m.albedoColor = B.Color3.FromHexString(PAL.oxido).toLinearSpace(); m.roughness = 0.8; m.metallic = 0.4;
    m.metadata = { tile: () => tile("bolt", (a, o, _e, x, y) => {
      a.fillStyle = PAL.oxido; a.fillRect(x, y, TS, TS); o.fillStyle = orm(0.95, 0.25); o.fillRect(x, y, TS, TS);
      a.fillStyle = PAL.metalClaro; a.fillRect(x + 16, y + 16, TS - 32, TS - 32); o.fillStyle = orm(0.35, 1); o.fillRect(x + 16, y + 16, TS - 32, TS - 32);
    }) };
  }),
  plastic: (c: string) => flat("ip" + c, c, 0.55, 0),
  screen: (c: string = PAL.cian) => flat("scr" + c, "#05080b", 0.15, 0, c),
  emissive: (c: string) => flat("em" + c, c, 0.4, 0, c),
  /** Trim sheet (franjas de TRIM) sobre chapa. */
  trim: () => once("trim", (m) => { m.albedoTexture = trimTex(); m.roughness = 0.6; m.metallic = 0.5; }),
  /** Calcos (atlas DECALS) con recorte por alfa. */
  decal: () => once("decal", (m) => {
    m.albedoTexture = decalTex(); m.useAlphaFromAlbedoTexture = true; m.transparencyMode = B.PBRMaterial.PBRMATERIAL_ALPHATEST;
    m.roughness = 0.75; m.metallic = 0; m.zOffset = -2;
  }),
};
/** Chapas para utilería del mundo (tonos de las láminas, un punto apagados para no competir con enemigos). */
export const FOLD_PAINT = [PAL.petroleo, PAL.rojoChapa, "#c98a1a", "#4a5560", "#3d6b3a"] as const;

// ---------- Trim sheet: 8 franjas horizontales de 256x32 que se repiten a lo largo (u) ----------
export const TRIM = { hazard: 0, junta: 1, remaches: 2, rejilla: 3, borde: 4, perfil: 5, tornillos: 6, oxido: 7 } as const;
export type TrimId = keyof typeof TRIM;
let trimT: B.DynamicTexture | null = null;
function trimTex() {
  if (trimT && !trimT.getScene()?.isDisposed) return trimT;
  const t = new B.DynamicTexture("foldTrim", { width: 256, height: 256 }, sc(), false, B.Texture.NEAREST_SAMPLINGMODE);
  const c = t.getContext() as unknown as Ctx, r = lcg(5), H = 32;
  const row = (i: number, base: string) => { c.fillStyle = base; c.fillRect(0, i * H, 256, H); return i * H; };
  let y = row(TRIM.hazard, PAL.amarillo); c.fillStyle = PAL.fondo;
  for (let x = -H; x < 256; x += 32) { c.beginPath(); c.moveTo(x, y + H); c.lineTo(x + 16, y + H); c.lineTo(x + 16 + H, y); c.lineTo(x + H, y); c.fill(); }
  y = row(TRIM.junta, PAL.metalOsc); c.fillStyle = "#07090b"; c.fillRect(0, y + 14, 256, 4);
  c.fillStyle = PAL.metalClaro; for (let x = 4; x < 256; x += 9) c.fillRect(x, y + 11 + ((r() * 3) | 0), 6, 3); // cordón de soldadura
  y = row(TRIM.remaches, PAL.chapa);
  for (let x = 16; x < 256; x += 32) { c.fillStyle = PAL.chapaOsc; c.beginPath(); c.arc(x + 1, y + 17, 6, 0, 7); c.fill(); c.fillStyle = PAL.metalClaro; c.beginPath(); c.arc(x, y + 16, 5, 0, 7); c.fill(); }
  y = row(TRIM.rejilla, PAL.metalOsc); c.fillStyle = "#050607"; for (let x = 4; x < 256; x += 16) c.fillRect(x, y + 6, 10, 20);
  y = row(TRIM.borde, PAL.naranja); c.fillStyle = PAL.metalClaro;
  for (let x = 0; x < 256; x += 3) { const d = (r() ** 2) * 14; c.fillRect(x, y, 3, d); c.fillRect(x, y + H - (r() ** 2) * 10, 3, 10); }
  y = row(TRIM.perfil, PAL.metalClaro); const g = c.createLinearGradient(0, y, 0, y + H); g.addColorStop(0, "#d6dbe0"); g.addColorStop(0.5, PAL.metalClaro); g.addColorStop(1, "#4a4f55");
  c.fillStyle = g; c.fillRect(0, y, 256, H);
  y = row(TRIM.tornillos, PAL.metalOsc);
  for (let x = 16; x < 256; x += 32) { c.fillStyle = PAL.metalClaro; c.beginPath(); for (let k = 0; k < 6; k++) c.lineTo(x + Math.cos(k * 1.047) * 8, y + 16 + Math.sin(k * 1.047) * 8); c.fill(); c.fillStyle = PAL.negro; c.fillRect(x - 6, y + 15, 12, 2); }
  y = row(TRIM.oxido, PAL.oxido); for (let i = 0; i < 120; i++) { c.fillStyle = r() < 0.5 ? "#7a4524" : "#2a1a10"; c.fillRect(r() * 256, y + r() * H, 2 + r() * 6, 2 + r() * 4); }
  t.update(); t.wrapU = B.Texture.WRAP_ADDRESSMODE; t.wrapV = B.Texture.CLAMP_ADDRESSMODE;
  return (trimT = t);
}

// ---------- Calcos: atlas 4x2 de 128 px con alfa ----------
export const DECALS = ["warning", "numero", "flecha", "calavera", "label", "rayon", "mancha", "voltaje"] as const;
export type DecalId = (typeof DECALS)[number];
let decalT: B.DynamicTexture | null = null;
function decalTex() {
  if (decalT && !decalT.getScene()?.isDisposed) return decalT;
  const t = new B.DynamicTexture("foldDecals", { width: 512, height: 256 }, sc(), true);
  t.hasAlpha = true;
  const c = t.getContext() as unknown as Ctx, r = lcg(9);
  c.clearRect(0, 0, 512, 256);
  c.textAlign = "center"; c.textBaseline = "middle";
  const tri = (x: number, y: number, s: number, fill: string, ink: string) => {
    c.fillStyle = ink; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 1.1, y + s * 0.8); c.lineTo(x - s * 1.1, y + s * 0.8); c.fill();
    c.fillStyle = fill; c.beginPath(); c.moveTo(x, y - s + 12); c.lineTo(x + s * 1.1 - 14, y + s * 0.8 - 6); c.lineTo(x - s * 1.1 + 14, y + s * 0.8 - 6); c.fill();
  };
  const cell = (i: number, draw: (x: number, y: number) => void) => { const x = (i % 4) * 128 + 64, y = ((i / 4) | 0) * 128 + 64; draw(x, y); };
  cell(0, (x, y) => { tri(x, y, 52, PAL.amarillo, PAL.fondo); c.fillStyle = PAL.fondo; c.font = "700 64px Rajdhani, sans-serif"; c.fillText("!", x, y + 10); });
  cell(1, (x, y) => { c.font = "700 92px Rajdhani, sans-serif"; c.lineWidth = 8; c.strokeStyle = PAL.fondo; c.strokeText("07", x, y + 4); c.fillStyle = PAL.texto; c.fillText("07", x, y + 4); });
  cell(2, (x, y) => { c.fillStyle = PAL.amarillo; c.beginPath(); [[-50, -16], [8, -16], [8, -42], [54, 0], [8, 42], [8, 16], [-50, 16]].forEach(([a, b]) => c.lineTo(x + a, y + b)); c.fill(); });
  cell(3, (x, y) => {
    c.fillStyle = "#e9dcc4"; c.beginPath(); c.arc(x, y - 10, 40, 0, 7); c.fill(); c.fillRect(x - 24, y + 14, 48, 30);
    c.fillStyle = PAL.fondo; c.beginPath(); c.arc(x - 16, y - 10, 11, 0, 7); c.arc(x + 16, y - 10, 11, 0, 7); c.fill();
    for (let k = -1; k <= 1; k++) c.fillRect(x + k * 12 - 3, y + 24, 6, 20);
  });
  cell(4, (x, y) => { c.fillStyle = PAL.grisChapa; c.fillRect(x - 58, y - 26, 116, 52); c.fillStyle = PAL.fondo; c.fillRect(x - 52, y - 20, 104, 40); c.fillStyle = PAL.amarillo; c.font = "700 34px Rajdhani, sans-serif"; c.fillText("JM-04", x, y + 2); });
  cell(5, (x, y) => { c.strokeStyle = "rgba(200,205,210,.85)"; for (let k = 0; k < 6; k++) { c.lineWidth = 1 + r() * 2.5; c.beginPath(); const a = y - 40 + r() * 80; c.moveTo(x - 58, a); c.lineTo(x + 58, a - 30 + r() * 20); c.stroke(); } });
  cell(6, (x, y) => { c.fillStyle = "rgba(14,10,6,.8)"; for (let k = 0; k < 14; k++) { c.beginPath(); c.arc(x + (r() - 0.5) * 70, y + (r() - 0.5) * 60, 8 + r() * 22, 0, 7); c.fill(); } });
  cell(7, (x, y) => { tri(x, y, 52, PAL.amarillo, PAL.fondo); c.fillStyle = PAL.fondo; c.beginPath(); [[6, -26], [-14, 6], [0, 6], [-6, 34], [16, -2], [2, -2]].forEach(([a, b]) => c.lineTo(x + a, y + b)); c.fill(); });
  t.update();
  return (decalT = t);
}

// ---------- Kit de geometría ----------
/** Arma piezas y se las pasa a `add(malla, material)` (quien la usa decide: fusionar por material, como el gabinete, o dejarlas sueltas).
 *  Remaches y tornillos se acumulan como matrices; `thin()` los convierte en thin instances al final. */
export function geoKit(scene: B.Scene, add: (m: B.Mesh, mat: B.Material) => B.Mesh) {
  const box = (w: number, h: number, d: number, m: B.Material, p: V3, r?: V3, parent?: B.TransformNode) => {
    const b = B.MeshBuilder.CreateBox("p", { width: w, height: h, depth: d }, scene);
    b.position.set(...p); if (r) b.rotation.set(...r);
    if (parent) { b.parent = parent; b.computeWorldMatrix(true); b.setParent(null); }
    return add(b, m);
  };
  const cyl = (d: number, h: number, m: B.Material, p: V3, r?: V3, tess = 8, d2 = d) => {
    const c = B.MeshBuilder.CreateCylinder("p", { diameterTop: d, diameterBottom: d2, height: h, tessellation: tess }, scene);
    c.position.set(...p); if (r) c.rotation.set(...r);
    return add(c, m);
  };
  const sph = (d: number, m: B.Material, p: V3) => { const s = B.MeshBuilder.CreateSphere("p", { diameter: d, segments: 6 }, scene); s.position.set(...p); return add(s, m); };
  const tube = (path: V3[], r: number, m: B.Material) => add(B.MeshBuilder.CreateTube("p", { path: path.map((q) => new B.Vector3(...q)), radius: r, tessellation: 6 }, scene), m);
  /** Doblez de chapa: canto redondeado entre dos placas (cilindro de pocos lados a lo largo de la arista). */
  const bend = (a: V3, b: V3, r: number, m: B.Material) => {
    const A = new B.Vector3(...a), Bv = new B.Vector3(...b), d = Bv.subtract(A), L = d.length();
    const c = B.MeshBuilder.CreateCylinder("p", { diameter: r * 2, height: L, tessellation: 6 }, scene);
    c.position = A.add(d.scale(0.5));
    c.rotationQuaternion = B.Quaternion.FromUnitVectorsToRef(B.Vector3.Up(), d.normalize(), new B.Quaternion());
    return add(c, m);
  };
  const rivetM: B.Matrix[] = [], boltM: B.Matrix[] = [];
  const line = (list: B.Matrix[]) => (a: V3, b: V3, count: number, n: V3) => {
    const A = new B.Vector3(...a), Bv = new B.Vector3(...b), N = new B.Vector3(...n).normalize();
    const q = B.Quaternion.FromUnitVectorsToRef(B.Vector3.Up(), N, new B.Quaternion());
    for (let i = 0; i < count; i++) list.push(B.Matrix.Compose(B.Vector3.One(), q, B.Vector3.Lerp(A, Bv, count > 1 ? i / (count - 1) : 0.5)));
  };
  /** Remaches (cabeza de 6 lados) en fila de a a b sobre una cara de normal n. */
  const rivets = line(rivetM);
  /** Tornillos hexagonales (más gruesos que el remache). */
  const bolts = line(boltM);
  /** Convierte remaches/tornillos acumulados en thin instances (una malla cada uno). */
  const thin = (m: B.Material, parent?: B.TransformNode, scale = 1) => {
    const mk = (name: string, list: B.Matrix[], o: { diameterTop: number; diameterBottom: number; height: number }) => {
      if (!list.length) return null;
      const s = B.MeshBuilder.CreateCylinder(name, { ...o, diameterTop: o.diameterTop * scale, diameterBottom: o.diameterBottom * scale, height: o.height * scale, tessellation: 6 }, scene);
      s.material = m; s.isPickable = false; if (parent) s.parent = parent;
      const buf = new Float32Array(list.length * 16); list.forEach((q, i) => q.copyToArray(buf, i * 16));
      s.thinInstanceSetBuffer("matrix", buf, 16, true);
      return s;
    };
    return [mk("rivet", rivetM, { diameterTop: 0.012, diameterBottom: 0.016, height: 0.008 }), mk("bolt", boltM, { diameterTop: 0.022, diameterBottom: 0.022, height: 0.012 })];
  };
  // Piezas compuestas: en coordenadas locales de un nodo (pos + giro) que luego se suelta para la fusión.
  const node = (p: V3, r: V3 = [0, 0, 0]) => { const n = new B.TransformNode("k", scene); n.position.set(...p); n.rotation.set(...r); n.computeWorldMatrix(true); return n; };
  const W = (n: B.TransformNode, v: V3) => { const q = B.Vector3.TransformCoordinates(new B.Vector3(...v), n.getWorldMatrix()); return [q.x, q.y, q.z] as V3; };
  const N = (n: B.TransformNode, v: V3) => { const q = B.Vector3.TransformNormal(new B.Vector3(...v), n.getWorldMatrix()); return [q.x, q.y, q.z] as V3; };
  const Mx = { steel: FOLD.bare(), rust: FOLD.rust(), dark: FOLD.dark(), rubber: FOLD.rubber() };
  const piece = <T extends unknown[]>(build: (n: B.TransformNode, ...a: T) => void) => (p: V3, r: V3 | undefined, ...a: T) => { const n = node(p, r); build(n, ...a); n.dispose(); };
  return {
    box, cyl, sph, tube, bend, rivets, bolts, thin, rivetM, boltM,
    /** Panel plegado: chapa de espesor t con los cantos de arriba y abajo doblados hacia atrás (mira a -z). */
    panel: piece((n, w: number, h: number, m: B.Material, t: number = 0.02) => {
      box(w, h, t, m, [0, 0, 0], undefined, n);
      for (const s of [-1, 1]) { box(w, t, t * 3, m, [0, s * (h / 2 - t / 2), t * 1.5], undefined, n); bend(W(n, [-w / 2, s * h / 2, -t / 2]), W(n, [w / 2, s * h / 2, -t / 2]), t * 0.6, m); }
    }),
    /** Placa atornillada: chapa fina separada del soporte con un tornillo por esquina. */
    plate: piece((n, w: number, h: number, m: B.Material) => {
      box(w, h, 0.008, m, [0, 0, 0], undefined, n);
      for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bolts(W(n, [x * (w / 2 - 0.02), y * (h / 2 - 0.02), -0.004]), W(n, [x * (w / 2 - 0.02), y * (h / 2 - 0.02), -0.004]), 1, N(n, [0, 0, -1]));
    }),
    /** Caja plegada: cuerpo, flejes con remaches en las 4 caras y pestañas de la tapa dobladas hacia afuera. */
    foldBox: piece((n, w: number, h: number, d: number, m: B.Material) => {
      box(w, h, d, m, [0, h / 2, 0], undefined, n);
      for (const y of [0.03, h - 0.03]) box(w + 0.02, 0.04, d + 0.02, Mx.rust, [0, y, 0], undefined, n);
      for (const s of [-1, 1]) {
        box(w * 0.8, 0.012, 0.08, m, [0, h + 0.012, s * (d / 2 + 0.03)], [s * -0.5, 0, 0], n);
        box(0.08, 0.012, d * 0.8, m, [s * (w / 2 + 0.03), h + 0.012, 0], [0, 0, s * 0.5], n);
        rivets(W(n, [-w * 0.4, 0.03, s * (d / 2 + 0.011)]), W(n, [w * 0.4, 0.03, s * (d / 2 + 0.011)]), 4, N(n, [0, 0, s]));
        rivets(W(n, [s * (w / 2 + 0.011), 0.03, -d * 0.4]), W(n, [s * (w / 2 + 0.011), 0.03, d * 0.4]), 4, N(n, [s, 0, 0]));
      }
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bend(W(n, [x * w / 2, 0.05, z * d / 2]), W(n, [x * w / 2, h - 0.05, z * d / 2]), 0.012, m);
    }),
    /** Perfil en L a lo largo de x. */
    profile: piece((n, len: number, s: number, m: B.Material) => { box(len, s, 0.01, m, [0, s / 2, 0], undefined, n); box(len, 0.01, s, m, [0, 0, s / 2], undefined, n); }),
    /** Rejilla: marco y n listones inclinados (mira a -z). */
    grate: piece((n, w: number, h: number, count: number, m: B.Material) => {
      for (const s of [-1, 1]) { box(0.02, h, 0.03, m, [s * w / 2, 0, 0], undefined, n); box(w + 0.02, 0.02, 0.03, m, [0, s * h / 2, 0], undefined, n); }
      for (let i = 0; i < count; i++) box(w, 0.012, 0.025, Mx.dark, [0, -h / 2 + (h * (i + 0.5)) / count, 0], [0.5, 0, 0], n);
    }),
    /** Bisagra: caño a lo largo de x y dos hojas. */
    hinge: piece((n, len: number, m: B.Material) => {
      cyl(0.022, len, Mx.steel, W(n, [0, 0, 0]), undefined, 6).rotationQuaternion = B.Quaternion.FromUnitVectorsToRef(B.Vector3.Up(), new B.Vector3(...N(n, [1, 0, 0])).normalize(), new B.Quaternion());
      for (const s of [-1, 1]) box(len * 0.45, 0.004, 0.05, m, [s * len * 0.25, 0, s * 0.03], undefined, n);
    }),
    /** Rueda: cubierta con banda de rodadura, llanta y maza con tornillos; eje en x. */
    wheel: piece((n, d: number, w: number) => {
      const ax = new B.Vector3(...N(n, [1, 0, 0])).normalize(), q = B.Quaternion.FromUnitVectorsToRef(B.Vector3.Up(), ax, new B.Quaternion());
      const c = (dd: number, h: number, m: B.Material, tess: number) => { cyl(dd, h, m, W(n, [0, 0, 0]), undefined, tess).rotationQuaternion = q.clone(); };
      c(d, w, Mx.rubber, 12); c(d * 0.62, w * 1.04, Mx.steel, 10); c(d * 0.25, w * 1.2, Mx.rust, 6); // maza: unión que junta óxido
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; box(w * 1.02, d * 0.06, d * 0.08, Mx.rubber, [0, Math.cos(a) * d * 0.5, Math.sin(a) * d * 0.5], [a, 0, 0], n); }
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; for (const s of [-1, 1]) bolts(W(n, [s * w * 0.52, Math.cos(a) * d * 0.18, Math.sin(a) * d * 0.18]), W(n, [s * w * 0.52, Math.cos(a) * d * 0.18, Math.sin(a) * d * 0.18]), 1, N(n, [s, 0, 0])); }
    }),
    /** Soporte en L con cartela (escuadra), apoyado en y = 0. */
    bracket: piece((n, s: number, m: B.Material) => {
      box(s, 0.012, s * 0.6, m, [0, 0.006, 0], undefined, n); box(s, s, 0.012, m, [0, s / 2, -s * 0.3], undefined, n);
      for (const x of [-1, 1]) box(0.012, s * 0.7, s * 0.7, m, [x * s * 0.4, s * 0.25, -s * 0.05], [Math.PI / 4, 0, 0], n);
      bolts(W(n, [-s * 0.25, s * 0.6, -s * 0.31]), W(n, [s * 0.25, s * 0.6, -s * 0.31]), 2, N(n, [0, 0, -1]));
    }),
    /** Franja de trim (TRIM) con volumen: largo len, alto h, espesor t; la textura se repite a lo largo. */
    trimStrip: piece((n, len: number, h: number, row: TrimId, t: number = 0.01) => {
      const v1 = 1 - TRIM[row] / 8, v0 = v1 - 1 / 8, u = len / (h * 8), uv = new B.Vector4(0, v0 + 0.002, u, v1 - 0.002);
      const b = B.MeshBuilder.CreateBox("p", { width: len, height: h, depth: t, faceUV: [uv, uv, uv, uv, uv, uv] }, scene);
      b.parent = n; b.computeWorldMatrix(true); b.setParent(null); add(b, FOLD.trim());
    }),
    /** Calco (DECALS) de lado s apoyado sobre una cara que mira a -z; el material lo despega del fondo (zOffset). */
    decal: piece((n, id: DecalId, s: number) => {
      const i = DECALS.indexOf(id), cu = (i % 4) / 4, cv = 1 - (((i / 4) | 0) + 1) / 2;
      const p = B.MeshBuilder.CreatePlane("p", { size: s }, scene);
      const uv = p.getVerticesData(B.VertexBuffer.UVKind)!;
      for (let k = 0; k < uv.length; k += 2) { uv[k] = cu + uv[k] * 0.25; uv[k + 1] = cv + uv[k + 1] * 0.5; }
      p.setVerticesData(B.VertexBuffer.UVKind, uv);
      p.parent = n; p.position.z = -0.002; p.computeWorldMatrix(true); p.setParent(null); add(p, FOLD.decal());
    }),
  };
}
export type GeoKit = ReturnType<typeof geoKit>;
