import * as B from "@babylonjs/core";
import { box, cyl, merge, sph, template, tor, tube } from "./models";
import { debris, splat } from "./fx";
import { canvasTex, M, pbr, shadows, TEX } from "./render";
import { rng, seedRng } from "./rng";
import type { Climate } from "./run";

// Zonas de juego. Un auto RC mide ~2 unidades (1 u ≈ 4,5 cm): una maceta es un edificio, un auto real es una montaña.
// Cada zona = tabla de datos + build (lo fijo) + layout (lo que cambia con la semilla), armadas con las mismas piezas.
// HALF es un `let` exportado: los importadores (HUD, bot, límites) ven el valor de la zona actual.
export let HALF = 160;

let scene: B.Scene;
let lowQ = false;
// El cuerpo toma la pose de la malla al crearse: posicionar SIEMPRE antes (at), nunca después.
const stat = (m: B.Mesh, shape: B.PhysicsShapeType, o: Partial<B.PhysicsAggregateParameters> = {}, at?: [number, number, number, number?]) => {
  if (at) { m.position.set(at[0], at[1], at[2]); if (at[3] !== undefined) m.rotation.y = at[3]; }
  new B.PhysicsAggregate(m, shape, { mass: 0, friction: 0.6, ...o }, scene);
  shadows.addShadowCaster(m);
  m.receiveShadows = true;
  return m;
};
const dyn = (m: B.Mesh, shape: B.PhysicsShapeType, mass: number) => {
  new B.PhysicsAggregate(m, shape, { mass, friction: 0.5, restitution: 0.3 }, scene);
  shadows.addShadowCaster(m);
  m.receiveShadows = true;
  return m;
};
// Texturas procedurales: una por clave (cambiar de zona no las vuelve a dibujar)
const texs: Record<string, B.Texture> = {};
const tex = (k: string, f: () => B.Texture) => (texs[k] ??= f());
const woodM = () => pbr("wood", { color: "#ffffff", rough: 0.75, tex: tex("wood", TEX.wood) });

// ---------- Objetos rompibles ----------
// bits: colores de lo que salta al romperse un "cofre" (pot). Sin bits: tierra y hojas de maceta.
export type Breakable = { m: B.Mesh; hp: number; r: number; color: string; extras: B.Mesh[]; pot: boolean; bits?: string[] };
export const breakables: Breakable[] = [];
const breakable = (m: B.Mesh, hp: number, r: number, color: string, pot: boolean | string[] = false, extras: B.Mesh[] = []) =>
  (breakables.push({ m, hp, r, color, extras, pot: !!pot, bits: Array.isArray(pot) ? pot : undefined }), m);

// Daño en área a objetos de la zona. Devuelve dónde se rompieron los "cofres" (sueltan premios).
export function hitBreakables(pos: B.Vector3, r: number, dmg: number) {
  const pots: B.Vector3[] = [];
  for (let i = breakables.length - 1; i >= 0; i--) {
    const b = breakables[i];
    if (B.Vector3.Distance(b.m.getAbsolutePosition(), pos) > r + b.r || (b.hp -= dmg) > 0) continue;
    const p = b.m.getAbsolutePosition().clone();
    debris(p, b.color, b.pot ? 16 : 6, b.pot ? 9 : 6, b.pot ? 1.6 : 1);
    if (b.pot) {
      if (b.bits) { for (const c of b.bits) debris(p.add(new B.Vector3(0, 2, 0)), c, 10, 7, 1.2); splat(p.x, p.z, b.bits[0], 3); }
      else { debris(p, "#4a3420", 10, 6, 1.2); debris(p.add(new B.Vector3(0, 4, 0)), "#3f8f2f", 8, 5, 1.4); }
      pots.push(p);
    }
    b.m.physicsBody?.dispose();
    b.m.dispose();
    for (const x of b.extras) x.dispose();
    breakables.splice(i, 1);
  }
  return pots;
}

// Mallas fijas que pueden tapar al auto: la cámara las tramea (main.ts). Las copas quedan fuera: están por encima de la cámara.
export const occluders: B.Mesh[] = [];
// ¿Está bajo techo? (mesa del patio, auto real y banco del garaje). La cámara baja y se acerca (main.ts).
export const underRoof = (p: B.Vector3) => !!Z.roof?.(p);

// Zonas sin pasto ni props (círculos)
const bare: { x: number; z: number; r: number }[] = [];
const isBare = (x: number, z: number) => bare.some((b) => Math.hypot(x - b.x, z - b.z) < b.r) || Z.rects.some(([cx, cz, w, d]) => Math.abs(x - cx) < w && Math.abs(z - cz) < d);

// ---------- Tabla de zonas ----------
export type ZoneId = "patio" | "garaje" | "jardin";
type Zone = {
  name: string; short: string; desc: string; half: number; // short: botón del menú principal
  cost: number; // tornillos en el Taller (0 = siempre abierta)
  grass: number; grassH: number; // densidad de matas relativa al patio (0 = sin pasto) y alto
  rects: [number, number, number, number][]; // rectángulos sin pasto ni props: centro x, z, medio ancho, medio largo
  roof?: (p: B.Vector3) => boolean;
  climate?: Climate; // luz fija (interior): reemplaza el ciclo atardecer → noche
  dust?: [number, number, number, number][];
  build(): void; layout(): void;
};
// Interior del garaje: tubo fluorescente frío, sin cielo ni luna. Inclinado a propósito: casi vertical, las sombras en cascada se rompen.
const TUBO: Climate = { id: "tubo", name: "TUBO FLUORESCENTE", sun: [0.4, -1, 0.3], sunColor: "#dff2e6", sunI: 3, hemiI: 1.2, sky: ["#0b0d0d", "#121615", "#161b1a", "#0b0d0d"], exposure: 1.1, fog: 0.005, ramp: ["#0c1214", "#4a6a62", "#eef6e8"] };

// ponytail: precios provisorios (Taller → Zonas), a calibrar con el balance de tornillos
export const ZONE_COST = { garaje: 700, jardin: 1000 }; // curva de precios: como un auto o algo más (menu.ts, Taller)
export const ZONES: Record<ZoneId, Zone> = {
  patio: { name: "Patio trasero", short: "Patio", desc: "Pileta, mesa de jardín y la huerta.", half: 160, cost: 0, grass: 1, grassH: 1,
    rects: [[0, -30, 24, 17], [50, 45, 21, 16]],
    roof: (p) => Math.abs(p.x) < 17 && Math.abs(p.z + 30) < 15 && p.y < 16, // tapa de la mesa: 34x30 en (0,-30), a 16 de alto
    build: patioBuild, layout: patioLayout },
  garaje: { name: "Garaje de la casa", short: "Garaje", desc: "Cemento con aceite, un auto en caballetes y el tubo que parpadea.", half: 80, cost: ZONE_COST.garaje, grass: 0, grassH: 1,
    rects: [[30, 0, 22, 50], [-45, -72, 26, 9], [38, -75, 19, 6], [-75, 40, 6, 36], [-68, -50, 11, 11]],
    roof: (p) => (Math.abs(p.x - 30) < 20 && Math.abs(p.z) < 48 && p.y < 9) || (Math.abs(p.x + 45) < 25 && Math.abs(p.z + 72) < 7 && p.y < 18),
    climate: TUBO, dust: [[-20, 25, 8, 32], [-20, -25, 8, 32], [-45, -76, 28, 6]], build: garageBuild, layout: garageLayout },
  jardin: { name: "Jardín delantero", short: "Jardín", desc: "Césped cortado, aspersores que empujan y la calle de límite.", half: 140, cost: ZONE_COST.jardin, grass: 1.3, grassH: 0.5,
    rects: [[12, 8, 5, 132], [0, -132, 220, 8], [-55, 35, 25, 8]],
    build: frontBuild, layout: frontLayout },
};
let Z: Zone = ZONES.patio;
export let zoneId: ZoneId = "patio";
/** Luz fija de la zona (garaje) o undefined: la partida sigue el ciclo de la semilla. */
export const zoneClimate = () => Z.climate;
/** Columnas de polvo bajo los tubos del garaje [x, z, ancho, largo] (reemplazan a las luciérnagas) o undefined. */
export const zoneDust = () => Z.dust;

let worldMeshes: B.AbstractMesh[] = [];
let undo: (() => void)[] = [];
export function buildWorld(s: B.Scene, low: boolean, id: ZoneId = "patio") {
  scene = s; lowQ = low;
  plankTpl(); // las plantillas se crean antes de la foto: no se liberan al cambiar de zona
  const before = new Set(scene.meshes);
  tuft = grassTuft(); // primero, como siempre: el orden de rng() del mundo no cambia entre zonas
  Z = ZONES[id] ?? ZONES.patio; zoneId = ZONES[id] ? id : "patio";
  HALF = Z.half;
  tuftCount = Math.round((low ? 12000 : 45000) * Z.grass * (HALF / 160) ** 2); // 45000 en el patio de 320
  occluders.length = 0;
  bare.length = 0;
  Z.build();
  // Paredes físicas del borde (lo visible lo pone cada zona)
  for (const [x, z, w, d] of [[0, HALF, HALF * 2 + 10, 2], [0, -HALF, HALF * 2 + 10, 2], [HALF, 0, 2, HALF * 2 + 10], [-HALF, 0, 2, HALF * 2 + 10]]) {
    const wall = B.MeshBuilder.CreateBox("wall", { width: w, height: 60, depth: d }, scene);
    wall.position.set(x, 30, z);
    wall.isVisible = false;
    new B.PhysicsAggregate(wall, B.PhysicsShapeType.BOX, { mass: 0 }, scene);
  }
  staticBare = bare.length;
  worldMeshes = scene.meshes.filter((m) => !before.has(m));
}

/** Cambia de zona: rehace mundo y layout (semilla fija del mundo). Devuelve false si ya era la zona actual. */
export function setZone(id: string) {
  if (id === zoneId || !(id in ZONES)) return false;
  clearLayout();
  for (const m of worldMeshes) { m.physicsBody?.dispose(); m.dispose(); }
  for (const f of undo) f();
  undo = [];
  seedRng(20260929);
  buildWorld(scene, lowQ, id as ZoneId);
  buildLayout();
  return true;
}

// ---------- Piezas comunes del mundo ----------
// Suelo visible + colisionador. La textura repite con la misma densidad de texel que el patio original.
function floor(key: string, color: string, t: () => B.Texture, rough = 0.95) {
  const GS = HALF * 2 + 60, tx = tex(key, t);
  tx.uScale = tx.vScale = (14 * GS) / 260;
  const ground = B.MeshBuilder.CreateGround("ground", { width: GS, height: GS }, scene);
  ground.material = pbr(key, { color, rough, tex: tx });
  ground.receiveShadows = true;
  const gcol = B.MeshBuilder.CreateBox("gcol", { width: GS, height: 2, depth: GS }, scene);
  gcol.position.y = -1;
  gcol.isVisible = false;
  new B.PhysicsAggregate(gcol, B.PhysicsShapeType.BOX, { mass: 0, friction: 0.7 }, scene);
}
const decal = (name: string, w: number, h: number, x: number, z: number, mat: B.Material, y = 0.02) => {
  const g = B.MeshBuilder.CreateGround(name, { width: w, height: h }, scene);
  g.position.set(x, y, z);
  g.material = mat;
  g.receiveShadows = true;
  return g;
};
// Cemento con juntas de losa (piso del garaje)
const concreteTex = () => canvasTex(256, (c, s) => {
  c.fillStyle = "#8d8f8a"; c.fillRect(0, 0, s, s);
  for (let i = 0; i < 5000; i++) { c.fillStyle = ["#7a7c77", "#9a9c96", "#6c6e6a"][i % 3]; c.globalAlpha = 0.3 + Math.random() * 0.4; c.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 3, 1 + Math.random() * 3); }
  c.globalAlpha = 1;
  c.strokeStyle = "#5a5c58"; c.lineWidth = 3; c.strokeRect(0, 0, s, s);
});

const plankTpl = () => template("plank", () => [box(2, 7, 0.4, woodM(), [0, 3.5, 0]), box(2, 0.3, 0.6, M.matte("#6b4a2b"), [0, 5.5, -0.3])]);

// Casa al fondo (da escala): fachada con ventanas encendidas y siluetas
function house() {
  const GS = HALF * 2 + 60, K = HALF / 100;
  const h = merge("house", [
    box(GS, 90, 6, M.matte("#efe6d8"), [0, 45, HALF + 14]),
    box(GS, 3, 10, M.matte("#8a5a44"), [0, 1.5, HALF + 12]),
    ...[-70, -25, 45, 90].map((x, i) => box(26, 30, 1, i === 1 ? M.glass() : M.glow(i % 2 ? "#ffb15c" : "#ffcf8a"), [x * K, 42, HALF + 10.6])),
    // Siluetas en las ventanas encendidas (alguien mirando afuera)
    box(7, 14, 0.4, M.matte("#1a1410"), [-66 * K, 36, HALF + 10]), sph(6, M.matte("#1a1410"), [-66 * K, 46, HALF + 10], [1, 1, 0.2], 6),
    box(5, 10, 0.4, M.matte("#1a1410"), [84 * K, 34, HALF + 10]),
    ...[-70, -25, 45, 90].map((x) => box(29, 33, 0.6, M.matte("#ffffff"), [x * K, 42, HALF + 10.9])),
    box(22, 40, 1, pbr("door", { color: "#ffffff", rough: 0.6, tex: tex("door", TEX.wood) }), [10 * K, 20, HALF + 10.6]),
  ]);
  h.receiveShadows = true;
  occluders.push(h);
}
// Árbol: tronco enorme, copa fuera de cuadro (sombras de hojas igual)
function tree(x: number, z: number) {
  occluders.push(stat(cyl(7, 9, 70, pbr("bark", { color: "#ffffff", rough: 0.95, tex: tex("bark", TEX.bark) }), [x, 35, z]), B.PhysicsShapeType.CYLINDER));
  for (let k = 0; k < 5; k++) shadows.addShadowCaster(sph(40, M.matte("#2f6b2a"), [x + (rng() - 0.5) * 30, 72 + rng() * 10, z + (rng() - 0.5) * 30], [1, 0.7, 1], 6));
  bare.push({ x, z, r: 6 });
}
// Auto real (1 u ≈ 4,5 cm: 96 de largo). lift = altura del piso de la carrocería; en caballetes el RC pasa por abajo.
function realCar(x: number, z: number, ry: number, lift: number, solid: boolean, paint: string) {
  const pm = pbr("carPaint" + paint, { color: paint, rough: 0.35 }), dark = M.matte("#1a1a1a"), hub = Math.max(7, lift + 1);
  const parts = [
    box(40, 13, 96, pm, [0, lift + 6.5, 0]),
    box(36, 11, 50, pm, [0, lift + 18.5, -4]),
    box(36.4, 7, 44, M.glass(), [0, lift + 19, -4]), // ventanillas
    box(33, 7, 0.4, M.glass(), [0, lift + 19, 21.1]), box(33, 7, 0.4, M.glass(), [0, lift + 19, -29.1]),
    ...[48.5, -48.5].map((bz) => box(41, 3, 3, dark, [0, lift + 3, bz])),
    ...[-13, 13].map((bx) => box(8, 3, 0.5, M.matte("#e8e4d0"), [bx, lift + 9, 48.2])),
    ...[-13, 13].map((bx) => box(8, 3, 0.5, M.matte("#8a1810"), [bx, lift + 9, -48.2])),
  ];
  const wheels: [number, number][] = [[-19, 31], [19, 31], [-19, -31], [19, -31]];
  for (const [wx, wz] of wheels) parts.push(cyl(14, 14, 8, M.rubber(), [wx, hub, wz], [0, 0, Math.PI / 2], 14), cyl(8, 8, 8.4, M.metal("#9aa0a6"), [wx, hub, wz], [0, 0, Math.PI / 2], 10));
  const m = merge("realCar", parts);
  m.position.set(x, 0, z); m.rotation.y = ry;
  shadows.addShadowCaster(m);
  if (!solid) return m;
  occluders.push(m);
  const c = Math.cos(ry), s = Math.sin(ry), at = (lx: number, ly: number, lz: number): [number, number, number, number] => [x + lx * c + lz * s, ly, z - lx * s + lz * c, ry];
  stat(box(40, 24, 96, dark, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, at(0, lift + 12, 0)).isVisible = false;
  for (const [wx, wz] of wheels) {
    stat(box(8, 14, 14, dark, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, at(wx, hub, wz)).isVisible = false;
    // Caballete bajo cada rueda (lo único que estorba abajo)
    const [sx, , sz] = at(wx * 0.7, 0, wz);
    stat(merge("stand", [cyl(1.2, 4.5, lift, M.metal("#b8322a"), [0, lift / 2, 0], undefined, 4), box(3, 0.8, 3, M.metal("#b8322a"), [0, lift, 0])]), B.PhysicsShapeType.CYLINDER, {}, [sx, 0, sz]);
    bare.push({ x: sx, z: sz, r: 3 });
  }
  return m;
}

// ---------- Patio trasero ----------
function patioBuild() {
  const K = HALF / 100; // escala de lo que se diseñó para el patio de 200
  // Mesa de jardín gigante: la cámara se mete abajo (roof) y la tapa se tramea si tapa el auto (occluders)
  for (const [x, z] of [[-14, -18], [14, -18], [-14, -42], [14, -42]]) occluders.push(stat(cyl(1.4, 1.4, 16, M.metal("#f1f5f9"), [x, 8, z], undefined, 10), B.PhysicsShapeType.CYLINDER));
  const top = box(34, 0.8, 30, M.matte("#f1f5f9"), [0, 16.4, -30]);
  shadows.addShadowCaster(top);
  occluders.push(top);

  // Suelo: césped + baldosas + huerta
  floor("grass", "#ffffff", TEX.grass);
  decal("patio", 48, 34, 0, -30, pbr("tiles", { color: "#ffffff", rough: 0.6, tex: tex("tiles", TEX.tiles) }));
  const dirt = decal("dirt", 42, 32, 50, 45, pbr("dirt", { color: "#ffffff", rough: 1, tex: tex("dirt", TEX.dirt) }));
  // Surcos: lomos de tierra medio enterrados (radio 1,5, asoman 0,5): hacen saltar al auto pero se suben de costado
  for (let r = 0; r < 4; r++) stat(cyl(3, 3, 40, dirt.material!, [50, -1, 35 + r * 7], [0, 0, Math.PI / 2], 10), B.PhysicsShapeType.CYLINDER);
  for (let r = 0; r < 4; r++) for (let i = 0; i < 7; i++) {
    const x = 34 + i * 5.3, z = 35 + r * 7;
    for (let k = 0; k < 4; k++) { const l = sph(1.4, M.matte("#3f8f2f"), [x + Math.cos(k * 1.6) * 0.7, 1, z + Math.sin(k * 1.6) * 0.7], [1, 0.35, 1.8]); l.rotation.y = k * 1.6; shadows.addShadowCaster(l); }
  }

  // Cerca de madera (instancias)
  const plank = plankTpl();
  for (let i = -HALF; i < HALF; i += 2.1) for (const [x, z, ry] of [[i, HALF, 0], [i, -HALF, 0], [HALF, i, Math.PI / 2], [-HALF, i, Math.PI / 2]] as const) {
    const p = plank.createInstance("pl");
    p.position.set(x, 0, z);
    p.rotation.y = ry;
    p.scaling.y = 0.9 + rng() * 0.2;
  }
  house();
  for (const [x, z] of [[-75, -70], [78, -60], [-80, 70], [70, 85]]) tree(x * K, z * K);
}

function patioLayout() {
  const K = HALF / 100;
  // Pileta inflable: en una de varias esquinas del patio
  const [px, pz] = [[-48, 38], [55, -20], [-50, -55], [-60, 5]][int(0, 3)].map((v) => v * K);
  const pool = merge("pool", [
    tor(26, 3.4, M.plastic("#38bdf8"), [0, 1.7, 0], undefined, 32),
    tor(26, 3.4, M.plastic("#f8fafc"), [0, 4.6, 0], undefined, 32),
    water(),
  ]);
  pool.position.set(px, 0, pz);
  stat(pool, B.PhysicsShapeType.MESH);
  bare.push({ x: px, z: pz, r: 16 });

  // TRAMO: puente angosto de tablones sobre la pileta. Caerse = al agua: piso invisible a 3 m y dos tablas de natación para salir.
  const bry = rng() * Math.PI;
  plankBridge(px, pz, bry);
  stat(cyl(23, 23, 3, M.matte("#4fb3e8"), [px, 1.5, pz], undefined, 16), B.PhysicsShapeType.CYLINDER).isVisible = false;
  for (const s of [-1, 1]) { const ry = bry + (s * Math.PI) / 2; ramp(M.plastic("#facc15"), px + Math.sin(ry) * 4, pz + Math.cos(ry) * 4, ry, 3, 7.3, 3.8, 0, 0, 3); }

  toyRamps(int(3, 5), [0, 1, 2, 3]);
  if (rng() < 0.75) planterAlley();
  if (rng() < 0.75) toyScatter();
  pots(int(5, 10));
  rocks(int(10, 26));
  gnomes(int(1, 3));
  hose();
  wateringCan();
  piles(int(1, 3), ["#ef4444", "#3b82f6", "#facc15", "#22c55e", "#a855f7"], M.plastic);
  brickWalls(int(1, 2));
  puddles(int(3, 10), pbr("puddle", { color: "#3b4a52", rough: 0.03, metal: 0.2, alpha: 0.85 }));
  ball();
}

// ---------- Garaje ----------
function garageBuild() {
  floor("concrete", "#ffffff", concreteTex, 0.75);
  // Manchas de aceite fijas: debajo del auto y frente al banco
  const oil = pbr("oilStain", { color: "#16130f", rough: 0.35, alpha: 0.7 });
  for (const [x, z, sx, sz] of [[30, 20, 9, 6], [26, -18, 6, 5], [-40, -55, 7, 4], [-10, 40, 5, 4]]) { const d = B.MeshBuilder.CreateDisc("oilStain", { radius: 1, tessellation: 14 }, scene); d.rotation.x = Math.PI / 2; d.scaling.set(sx, sz, 1); d.position.set(x, 0.025, z); d.material = oil; d.receiveShadows = true; }
  // Paredes altas (se tramean si tapan al auto); al frente, el portón de chapa
  const paint = M.matte("#6f7d78"), band = M.matte("#3c4542"), steel = M.metal("#a4aab0");
  for (const [x, z, w, d] of [[0, -HALF - 1, HALF * 2 + 4, 2], [HALF + 1, 0, 2, HALF * 2 + 4], [-HALF - 1, 0, 2, HALF * 2 + 4], [0, HALF + 1, HALF * 2 + 4, 2]]) {
    const parts = [box(w, 56, d, paint, [x, 28, z]), box(w + 0.6, 5, d + 0.6, band, [x, 2.5, z])];
    if (z > HALF) for (let k = 0; k < 12; k++) parts.push(box(70, 3.2, 0.8, steel, [10, 2 + k * 3.5, HALF - 0.2]));
    occluders.push(merge("gwall", parts));
  }
  // Banco de trabajo (techo bajo: la cámara se mete abajo) con morsa, tablero de herramientas y su tubo
  const wood = woodM(), bz = -HALF + 8;
  for (const [x, z] of [[-68, bz - 5], [-22, bz - 5], [-68, bz + 5], [-22, bz + 5]]) stat(box(1.6, 18, 1.6, M.metal("#4a5058"), [x, 9, z]), B.PhysicsShapeType.BOX);
  const bench = merge("bench", [
    box(50, 1.2, 14, wood, [-45, 18, bz]),
    box(5, 3, 4, M.metal("#2f5f8a"), [-28, 20, bz + 3]), box(1, 1, 6, M.metal("#9aa0a6"), [-28, 20.5, bz + 6]),
  ]);
  shadows.addShadowCaster(bench);
  occluders.push(bench);
  const tools = [box(3, 14, 0.6, M.matte("#2b2f36"), [-62, 32, -HALF + 0.6]), box(10, 2, 0.6, M.matte("#2b2f36"), [-50, 36, -HALF + 0.6]), box(2, 12, 0.6, M.matte("#8a1810"), [-40, 30, -HALF + 0.6]), tor(6, 1, M.matte("#2b2f36"), [-30, 33, -HALF + 0.6], [Math.PI / 2, 0, 0], 12)];
  merge("pegboard", [box(50, 24, 0.5, M.matte("#b89a6a"), [-45, 32, -HALF + 0.3]), ...tools]);
  // Tubos fluorescentes: uno sobre el banco y dos en el techo. Parpadean (luz del sol del clima TUBO + emisivo)
  const tubeM = pbr("tubo", { color: "#eafff4", rough: 0.4, emissive: "#d8f5ea" });
  merge("tubes", [
    box(30, 1.6, 2.4, steel, [-45, 47, -HALF + 1.5]), box(28, 1, 1, tubeM, [-45, 46.2, -HALF + 2.4]),
    ...[-25, 25].flatMap((tz) => [box(4, 1.6, 34, steel, [-20, 54, tz]), box(1, 1, 32, tubeM, [-20, 53.2, tz])]),
  ]);
  flicker(tubeM);
  // Estantería metálica con cajas y latas
  const parts: B.Mesh[] = [];
  for (const [x, z] of [[20.5, -HALF + 1], [55.5, -HALF + 1], [20.5, -HALF + 10], [55.5, -HALF + 10]]) parts.push(box(1, 46, 1, M.metal("#7a8088"), [x, 23, z]));
  for (const y of [2, 14, 26, 38]) {
    parts.push(box(36, 0.8, 10, M.metal("#8a9098"), [38, y, -HALF + 5.5]));
    for (let x = 22; x < 52;) { const w = 5 + rng() * 6, h = 4 + rng() * 6; parts.push(box(w, h, 7, M.matte(["#b08850", "#9a7444", "#c49a64"][int(0, 2)]), [x + w / 2, y + 0.4 + h / 2, -HALF + 5.5])); x += w + 1 + rng() * 2; }
  }
  const shelf = merge("shelf", parts);
  shadows.addShadowCaster(shelf);
  occluders.push(shelf);
  stat(box(36, 46, 10, band, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [38, 23, -HALF + 5.5]).isVisible = false;
  // Bicicleta apoyada en la pared izquierda
  const frame = M.metal("#2a6fdb"), bp: B.Mesh[] = [];
  for (const wz of [-20, 20]) bp.push(tor(28, 1.4, M.rubber(), [0, 14, wz], [0, 0, Math.PI / 2], 24), cyl(0.5, 0.5, 26, M.metal("#9aa0a6"), [0, 14, wz], [Math.PI / 2, 0, 0], 4));
  bp.push(tube([[0, 14, -20], [0, 16, -2], [0, 30, 4], [0, 30, 16], [0, 14, 20]], 0.8, frame), tube([[0, 16, -2], [0, 30, 16]], 0.8, frame), tube([[0, 30, 4], [0, 34, 2]], 0.6, frame));
  bp.push(box(4, 1.4, 8, M.matte("#1a1a1a"), [0, 35, 2]), cyl(0.8, 0.8, 16, M.metal("#9aa0a6"), [0, 36, 18], [0, 0, Math.PI / 2], 6));
  const bike = merge("bike", bp);
  bike.position.set(-75, 0, 40); bike.rotation.z = 0.12; // apoyada en la pared
  shadows.addShadowCaster(bike);
  occluders.push(bike);
  stat(box(6, 34, 46, band, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [-76, 17, 40]).isVisible = false;
  // Pila de cubiertas
  stat(merge("tires", [0, 1, 2, 3].map((i) => tor(16, 5.5, M.rubber(), [0, 2.75 + i * 5.3, 0], undefined, 18))), B.PhysicsShapeType.CYLINDER, {}, [-68, 0, -50]);
  // El auto de la casa, en caballetes: abajo es zona techada
  realCar(30, 0, 0, 9, true, "#8a2a2a");
}

function garageLayout() {
  // TRAMO: tablón sobre dos caballetes y, abajo, bulones sueltos que hacen patinar
  const px = between(-45, -28), pz = between(-8, 22), bry = (rng() < 0.5 ? 0 : Math.PI) + (rng() - 0.5) * 0.3;
  plankBridge(px, pz, bry, M.metal("#b8322a"));
  for (let k = 0; k < 16; k++) {
    const t = (rng() - 0.5) * 26, e = (rng() - 0.5) * 8;
    dyn(cyl(1.4, 1.4, 0.9, M.metal("#9aa0a6"), [px + Math.sin(bry) * t + Math.cos(bry) * e, 0.45, pz + Math.cos(bry) * t - Math.sin(bry) * e], undefined, 6), B.PhysicsShapeType.CYLINDER, 0.2);
  }
  toyRamps(int(2, 3), [0, 1]);
  giantTools();
  paintCans(int(4, 7));
  piles(int(2, 3), ["#b08850", "#9a7444", "#c49a64"], M.matte, 3);
  puddles(int(3, 6), pbr("oil", { color: "#0c0b0a", rough: 0.05, metal: 0.4, alpha: 0.9 }));
  ball();
}

// Parpadeo del tubo: baja luz y emisivo en ráfagas cortas. Solo visual (Math.random); se apaga con "calma".
// Se aplica antes de dibujar la cámara y se deshace después: el ciclo y el apagón de main.ts no se enteran.
function flicker(mat: B.PBRMaterial) {
  const sun = scene.getLightByName("sun")!, hemi = scene.getLightByName("hemi")!, base = mat.emissiveColor.clone();
  let saved: number[] | null = null, burst = 0, hold = 0, f = 1, last = performance.now();
  const o1 = scene.onBeforeCameraRenderObservable.add(() => {
    if (saved) return;
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (document.body.classList.contains("calm")) f = 1;
    else {
      if (burst <= 0 && Math.random() < dt * 0.2) burst = 0.4 + Math.random() * 0.8;
      burst -= dt;
      if ((hold -= dt) <= 0) { hold = 0.05 + Math.random() * 0.1; f = burst > 0 && Math.random() < 0.5 ? 0.35 : 1; }
    }
    saved = [sun.intensity, hemi.intensity];
    sun.intensity *= f; hemi.intensity *= 0.6 + 0.4 * f;
    mat.emissiveColor.copyFrom(base).scaleInPlace(f);
  });
  const o2 = scene.onAfterRenderObservable.add(() => { if (saved) { [sun.intensity, hemi.intensity] = saved; saved = null; } });
  undo.push(() => { scene.onBeforeCameraRenderObservable.remove(o1); scene.onAfterRenderObservable.remove(o2); mat.emissiveColor.copyFrom(base); });
}

// ---------- Jardín delantero ----------
function frontBuild() {
  floor("lawn", "#b8f0a0", TEX.grass, 0.9);
  // Franjas de corte del césped
  const mow = pbr("mow", { color: "#e8ffd0", rough: 0.9, alpha: 0.08 });
  for (let i = 0; i < 12; i += 2) decal("mow", HALF * 2, (HALF * 2) / 12, 0, -HALF + ((i + 0.5) * HALF * 2) / 12, mow, 0.015);
  // Vereda (baldosas), cordón y calle: la calle es el límite (pared física en z = -HALF)
  const vt = tex("vereda", TEX.tiles);
  const vereda = decal("vereda", HALF * 2 + 60, 16, 0, -HALF + 8, pbr("vereda", { color: "#ffffff", rough: 0.85, tex: vt }), 0.03);
  vt.uScale = Math.round((HALF * 2 + 60) / 16); vt.vScale = 1;
  vereda.receiveShadows = true;
  merge("street", [
    box(HALF * 2 + 60, 1.4, 2, M.matte("#a8a8a0"), [0, 0.7, -HALF - 1]),
    box(HALF * 2 + 260, 0.1, 90, M.matte("#2a2c2e"), [0, 0.02, -HALF - 47]),
    ...Array.from({ length: 16 }, (_, i) => box(12, 0.12, 1.2, M.matte("#c9a227"), [-HALF - 60 + i * 28, 0.05, -HALF - 47])),
    cyl(2, 2.4, 90, M.metal("#5a6068"), [70, 45, -HALF - 5], undefined, 8), box(2, 2, 24, M.metal("#5a6068"), [70, 89, -HALF - 15]),
    box(5, 2, 8, M.glow("#ffcf8a"), [70, 87.5, -HALF - 25]),
  ]);
  realCar(-50, -HALF - 20, Math.PI / 2, 4, false, "#2f4f7a"); // estacionado en la calle (solo se ve)
  // Camino de lajas a la puerta
  const stone = pbr("stone", { color: "#ffffff", rough: 0.9, tex: tex("stone", TEX.stone) });
  for (let z = -HALF + 20; z < HALF - 6; z += 9) { const d = B.MeshBuilder.CreateDisc("laja", { radius: 3.6, tessellation: 7 }, scene); d.rotation.set(Math.PI / 2, rng() * 6, 0); d.position.set(12 + (rng() - 0.5) * 2, 0.03, z); d.material = stone; d.receiveShadows = true; }
  house();
  // Ligustros a los costados
  for (const sx of [-1, 1]) {
    const hp = [box(7, 11, HALF * 2 + 10, M.matte("#2f6b2a"), [sx * (HALF + 3.5), 5.5, 0])];
    for (let z = -HALF; z < HALF; z += 7) hp.push(sph(8 + rng() * 3, M.matte(rng() < 0.5 ? "#2f6b2a" : "#3a7a32"), [sx * (HALF + 3.5), 11, z], [1, 0.6, 1], 6));
    const hedge = merge("hedge", hp);
    shadows.addShadowCaster(hedge);
    occluders.push(hedge);
  }
  // Buzón junto a la vereda
  const mx = HALF - 24, mz = -HALF + 22;
  stat(cyl(1.8, 1.8, 22, woodM(), [mx, 11, mz], undefined, 6), B.PhysicsShapeType.CYLINDER);
  shadows.addShadowCaster(merge("mailbox", [box(6, 6, 12, M.metal("#2b2f36"), [mx, 25, mz]), cyl(6, 6, 12, M.metal("#2b2f36"), [mx, 28, mz], [Math.PI / 2, 0, 0], 12), box(0.4, 5, 1.2, M.plastic("#d62828"), [mx + 3.3, 28, mz + 3])]));
  bare.push({ x: mx, z: mz, r: 3 });
  // TRAMO: cantero elevado. Se sube por la rampa del lado del camino y se sale volando por el otro extremo (abierto).
  const brick = M.matte("#9a4a2a"), cx = -55, cz = 35;
  for (const dz of [-6.3, 6.3]) stat(box(48, 2.6, 1.4, brick, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [cx, 1.3, cz + dz]);
  stat(box(46, 2.2, 11.2, pbr("dirt", { color: "#ffffff", rough: 1, tex: tex("dirt", TEX.dirt) }), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [cx - 1, 1.1, cz]);
  const fl: B.Mesh[] = [];
  for (let x = cx - 22; x < cx + 20; x += 3.5) for (const dz of [-3.6, 3.6]) {
    fl.push(cyl(0.3, 0.3, 3, M.matte("#3f8f2f"), [x, 3.6, cz + dz], undefined, 4), sph(1.8, M.plastic(["#f43f5e", "#facc15", "#a855f7", "#f8fafc"][int(0, 3)]), [x, 5.2, cz + dz]));
  }
  shadows.addShadowCaster(merge("flowers", fl));
  for (let k = -2; k <= 2; k++) bare.push({ x: cx + k * 10, z: cz, r: 7.5 }); // para la IA y el bot: el cantero es un obstáculo
  ramp(brick, cx + 34, cz, -Math.PI / 2, 9, 10, 2.6, 0, 0, 0, [slopeBoard(9.4, 10, 2.6, woodM())]);
  tree(78, 70);
}

function frontLayout() {
  // TRAMO: fila de aspersores que barren el césped y empujan al auto; más alguno suelto
  const sp = freeSpot(22);
  if (sp) { const ry = rng() * Math.PI; for (let k = -1; k <= 1; k++) sprinkler(sp[0] + Math.sin(ry) * k * 13, sp[1] + Math.cos(ry) * k * 13); }
  for (let i = 0, n = int(1, 2); i < n; i++) { const p = freeSpot(8); if (p) sprinkler(p[0], p[1]); }
  toyRamps(int(2, 3), [0, 3]);
  gnomes(int(3, 6));
  pots(int(2, 4));
  rocks(int(4, 9));
  hose();
  wateringCan();
  puddles(int(2, 5), pbr("puddle", { color: "#3b4a52", rough: 0.03, metal: 0.2, alpha: 0.85 }));
  ball();
}

// Aspersor: el chorro gira (zoneTick) y empuja lo que encuentra
type Sprinkler = { x: number; z: number; ph: number; jet: B.Mesh };
const sprinklers: Sprinkler[] = [];
let sprT = 0;
function sprinkler(x: number, z: number) {
  stat(merge("sprinkler", [cyl(2.4, 3, 1.2, M.plastic("#1f6f3a"), [0, 0.6, 0], undefined, 10), cyl(0.8, 0.8, 1.2, M.metal("#9aa0a6"), [0, 1.6, 0], undefined, 8)]), B.PhysicsShapeType.CYLINDER, {}, [x, 0, z]);
  const jet = tube([[0, 1.8, 0], [0, 4.2, 4], [0, 4.8, 8], [0, 3.4, 12], [0, 0.6, 15]], 0.3, pbr("chorro", { color: "#bfe8ff", rough: 0.1, emissive: "#3a6a80", alpha: 0.55 }));
  jet.position.set(x, 0, z);
  jet.isPickable = false;
  sprinklers.push({ x, z, ph: rng() * 6.3, jet });
  bare.push({ x, z, r: 2 });
}
/** Llamar cada paso de la partida: gira los aspersores y devuelve el empujón (velocidad a sumar) o null. Determinista (dt). */
export function zoneTick(dt: number, p: B.Vector3) {
  if (!sprinklers.length) return null;
  sprT += dt;
  let push: B.Vector3 | null = null;
  for (const s of sprinklers) {
    const a = s.ph + sprT * 1.3;
    s.jet.rotation.y = a;
    const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz);
    if (d > 15 || d < 1.5 || p.y > 5) continue;
    const da = Math.atan2(dx, dz) - a;
    if (Math.abs(Math.atan2(Math.sin(da), Math.cos(da))) > 0.32) continue;
    (push ??= new B.Vector3()).addInPlace(new B.Vector3(dx / d, 0, dz / d).scaleInPlace(38 * dt * (1 - d / 18)));
  }
  return push;
}

// ---------- Layout por partida (depende de la semilla) ----------
let layoutMeshes: B.AbstractMesh[] = [];
let tuft: B.Mesh;
let tuftCount = 22000;
let staticBare = 0;
const clear = (x: number, z: number, r: number, m: number) => !isBare(x, z) && !bare.some((b) => Math.hypot(x - b.x, z - b.z) < b.r + r) && Math.hypot(x, z) > 14 + r && Math.abs(x) < HALF - m && Math.abs(z) < HALF - m;
// Busca un lugar libre al azar (con semilla). null si no encuentra.
// m: margen al borde
function freeSpot(r: number, m = 10): [number, number] | null {
  for (let i = 0; i < 40; i++) { const x = (rng() - 0.5) * (HALF - m) * 2, z = (rng() - 0.5) * (HALF - m) * 2; if (clear(x, z, r, m)) return [x, z]; }
  return null;
}
const between = (a: number, b: number) => a + rng() * (b - a);
const int = (a: number, b: number) => Math.floor(between(a, b + 1));

// Rampa maciza (prisma): sube L hasta H, meseta T, baja Lb (0 = corte vertical: borde de salto). Ancho W.
// Local: el pie en z=0, sube hacia +z. Se posa ANTES del aggregate (trampa de Havok).
function ramp(mat: B.Material, x: number, z: number, ry: number, W: number, L: number, H: number, T = 0, Lb = 0, y = 0, deco: B.Mesh[] = []) {
  const pr = [[0, 0], [L, H], ...(T ? [[L + T, H]] : []), [L + T + Lb, 0]];
  const n = pr.length, pos: number[] = [], ind: number[] = [];
  for (const sx of [-W / 2, W / 2]) for (const [pz, py] of pr) pos.push(sx, py, pz);
  for (let i = 1; i < n - 1; i++) ind.push(0, i, i + 1, n, n + i + 1, n + i); // caras laterales
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; ind.push(i, n + j, j, i, n + i, n + j); } // contorno
  const m = new B.Mesh("ramp", scene), vd = new B.VertexData();
  vd.positions = pos; vd.indices = ind;
  vd.applyToMesh(m);
  m.convertToFlatShadedMesh();
  m.material = mat;
  stat(m, B.PhysicsShapeType.CONVEX_HULL, { friction: 0.5 }, [x, y, z, ry]);
  const len = L + T + Lb;
  bare.push({ x: x + (Math.sin(ry) * len) / 2, z: z + (Math.cos(ry) * len) / 2, r: len / 2 + 1 });
  if (deco.length) { const d = merge("rampDeco", deco); d.position.set(x, y, z); d.rotation.y = ry; shadows.addShadowCaster(d); } // solo visual: se posa después sin problema
}
// Tablón apoyado sobre la subida de una rampa (adorno, coordenadas locales de ramp)
const slopeBoard = (W: number, L: number, H: number, mat: B.Material, th = 0.3) => box(W, th, Math.hypot(L, H), mat, [0, H / 2 + th / 2, L / 2], [-Math.atan2(H, L), 0, 0]);

// Puente angosto de tablones: dos rampas de 7 de alto y un tablero de 3,2 de ancho y 30 de largo, centrado en (px, pz)
function plankBridge(px: number, pz: number, bry: number, rampMat: B.Material = M.matte("#b45309")) {
  const wood = woodM(), bdx = Math.sin(bry), bdz = Math.cos(bry);
  for (const s of [-1, 1]) ramp(rampMat, px + bdx * 31 * s, pz + bdz * 31 * s, s < 0 ? bry : bry + Math.PI, 3.2, 16, 7, 0, 0, 0, [slopeBoard(3.6, 16, 7, wood)]);
  stat(box(3.6, 0.5, 30.4, wood, [px, 6.75, pz], [0, bry, 0]), B.PhysicsShapeType.BOX);
  bare.push({ x: px, z: pz, r: 16 });
}

// Rampas de juguete: n por partida, tipo (de kinds) / lugar / rumbo según la semilla
function toyRamps(n: number, kinds: number[]) {
  const orange = M.plastic("#f97316"), rail = M.plastic("#c2410c"), wood = woodM(), brick = M.matte("#b45309"), dirtM = pbr("dirt", { color: "#ffffff", rough: 1, tex: tex("dirt", TEX.dirt) });
  for (let i = 0, off = int(0, kinds.length - 1); i < n; i++) {
    const sp = freeSpot(16, 30); if (!sp) continue; // lejos del borde: la pista curva y el aterrizaje ocupan ~25 m
    const ry = Math.atan2(-sp[0], -sp[1]) + (rng() - 0.5) * 1.6, dx = Math.sin(ry), dz = Math.cos(ry); // saltan hacia el medio
    const kind = kinds[(off + i) % kinds.length];
    if (kind === 0) {
      // Tabla sobre una pila de ladrillos: salto corto y seco
      ramp(brick, sp[0] - dx * 6.5, sp[1] - dz * 6.5, ry, 4, 10, 2.6, 0, 3, 0, [slopeBoard(4.4, 10, 2.6, wood)]);
    } else if (kind === 1) {
      // Pista de autitos de plástico: curva en el piso que termina en un trampolín naranja
      const sg = rng() < 0.5 ? -1 : 1, R = 14, deco: B.Mesh[] = [];
      for (let k = 0; k < 12; k++) {
        const a0 = (k / 12) * 1.6, a1 = ((k + 1) / 12) * 1.6;
        const p0 = [sg * (R - R * Math.cos(a0)), -R * Math.sin(a0)], p1 = [sg * (R - R * Math.cos(a1)), -R * Math.sin(a1)];
        const mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2, yaw = Math.atan2(p1[0] - p0[0], p1[1] - p0[1]), len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + 0.1;
        deco.push(box(3.4, 0.1, len, orange, [mx, 0.05, mz], [0, yaw, 0]));
        for (const e of [-1.8, 1.8]) deco.push(box(0.25, 0.35, len, rail, [mx + Math.cos(yaw) * e, 0.17, mz - Math.sin(yaw) * e], [0, yaw, 0]));
      }
      for (const e of [-1.8, 1.8]) { const b = slopeBoard(0.25, 8, 2.2, rail, 0.35); b.position.x = e; b.position.y += 0.15; deco.push(b); }
      const fx = sp[0] - dx * 6, fz = sp[1] - dz * 6;
      ramp(orange, fx, fz, ry, 3.4, 8, 2.2, 0, 4, 0, deco);
      for (let k = 1; k < 4; k++) { const a = (k / 4) * 1.6, lx = sg * (R - R * Math.cos(a)), lz = -R * Math.sin(a); bare.push({ x: fx + lx * Math.cos(ry) + lz * dx, z: fz - lx * Math.sin(ry) + lz * dz, r: 3 }); }
    } else if (kind === 2) {
      // Tobogán caído: rampa larga con plataforma arriba, la escalera tirada al costado
      const deco = [slopeBoard(3, 14, 4, M.plastic("#ef4444"), 0.2)];
      for (const e of [-1.7, 1.7]) { const b = slopeBoard(0.3, 14, 4, M.plastic("#ef4444"), 0.7); b.position.x = e; b.position.y += 0.3; deco.push(b); }
      for (const e of [3.4, 5]) deco.push(cyl(0.4, 0.4, 9, M.metal("#94a3b8"), [e, 0.2, 6], [Math.PI / 2, 0, 0], 6));
      for (let k = 0; k < 5; k++) deco.push(cyl(0.25, 0.25, 1.6, M.metal("#94a3b8"), [4.2, 0.2, 2.5 + k * 1.8], [0, 0, Math.PI / 2], 6));
      ramp(M.plastic("#facc15"), sp[0] - dx * 9.75, sp[1] - dz * 9.75, ry, 3.6, 14, 4, 1.5, 4, 0, deco);
    } else {
      // Montículos de tierra en fila: lomas que hacen volar al auto con turbo
      for (let k = -1; k <= 1; k++) {
        const x = sp[0] + dx * k * 10, z = sp[1] + dz * k * 10;
        stat(sph(14, dirtM, [x, -1.5, z], [1, 0.46, 1], 12), B.PhysicsShapeType.CONVEX_HULL, { friction: 0.6 });
        bare.push({ x, z, r: 6 });
      }
    }
  }
}

// TRAMO: pasillo entre macetas de cemento (no se rompen ni dan premio: es un desfiladero, no un cofre)
function planterAlley() {
  const sp = freeSpot(20);
  if (!sp) return;
  const ry = rng() * Math.PI, dx = Math.sin(ry), dz = Math.cos(ry), parts: B.Mesh[] = [];
  for (let k = 0; k < 8; k++) for (const e of [-3.6, 3.6]) {
    const t = (k - 3.5) * 4.4, x = sp[0] + dx * t + dz * e, z = sp[1] + dz * t - dx * e;
    stat(cyl(3.2, 3.2, 2.6, M.matte("#8a8f94"), [x, 1.3, z], undefined, 10), B.PhysicsShapeType.CYLINDER).isVisible = false;
    parts.push(cyl(3.2, 2.6, 2.6, M.matte("#8a8f94"), [x, 1.3, z], undefined, 10), cyl(2.8, 2.8, 0.2, M.matte("#4a3420"), [x, 2.55, z], undefined, 10));
    for (let l = 0; l < 3; l++) { const a = l * 2.1 + k; const lf = sph(2, M.matte(l % 2 ? "#3f8f2f" : "#4ea83a"), [x + Math.cos(a) * 0.6, 3.3, z + Math.sin(a) * 0.6], [0.4, 0.2, 1.4]); lf.rotation.set(0.6, -a + Math.PI / 2, 0); parts.push(lf); }
    bare.push({ x, z, r: 1.8 });
  }
  shadows.addShadowCaster(merge("planters", parts));
}

// TRAMO: juguetes desparramados (bloques y pelotitas sueltas que hacen patinar)
function toyScatter() {
  const sp = freeSpot(13);
  if (!sp) return;
  const toy = ["#ef4444", "#3b82f6", "#facc15", "#22c55e", "#a855f7"];
  for (let k = 0; k < 26; k++) {
    const a = rng() * 6.3, r = Math.sqrt(rng()) * 11, s = between(0.7, 1.5), c = toy[int(0, 4)];
    breakable(dyn(box(s, s * between(0.6, 1), s * between(1, 2), M.plastic(c), [sp[0] + Math.cos(a) * r, s / 2, sp[1] + Math.sin(a) * r], [0, rng() * 6.3, 0]), B.PhysicsShapeType.BOX, 0.3), 25, s * 0.7, c);
  }
  for (let k = 0; k < 5; k++) { const a = rng() * 6.3, r = Math.sqrt(rng()) * 10; dyn(sph(1.4, M.plastic(toy[k]), [sp[0] + Math.cos(a) * r, 0.7, sp[1] + Math.sin(a) * r], undefined, 10), B.PhysicsShapeType.SPHERE, 0.4); }
  bare.push({ x: sp[0], z: sp[1], r: 12 });
}

// Macetas con plantas (cofres: sueltan premios): cantidad, lugar y tamaño según la semilla
function pots(n: number) {
  const list: [number, number, number][] = [];
  for (let i = 0; i < n; i++) { const sc = between(0.8, 1.35), p = freeSpot(6 * sc); if (p) { list.push([p[0], p[1], sc]); bare.push({ x: p[0], z: p[1], r: 3 * sc }); } }
  for (const [x, z, sc] of list) {
    const pot = stat(merge("pot", [
      cyl(5 * sc, 4 * sc, 4 * sc, M.matte("#c2410c"), [0, 2 * sc, 0], undefined, 16),
      cyl(5.4 * sc, 5.4 * sc, 0.6 * sc, M.matte("#9a3412"), [0, 3.9 * sc, 0], undefined, 16),
      cyl(4.6 * sc, 4.6 * sc, 0.2 * sc, M.matte("#4a3420"), [0, 4.1 * sc, 0], undefined, 16),
    ]), B.PhysicsShapeType.CYLINDER, {}, [x, 0, z]);
    const extras: B.Mesh[] = [];
    breakable(pot, 120 * sc, 2.6 * sc, "#c2410c", true, extras);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      const leaf = sph(3 * sc, M.matte(k % 2 ? "#3f8f2f" : "#4ea83a"), [x + Math.cos(a) * 1.3 * sc, 5.5 * sc, z + Math.sin(a) * 1.3 * sc], [0.4, 0.2, 1.4]);
      leaf.rotation.set(0.6, -a + Math.PI / 2, 0);
      shadows.addShadowCaster(leaf);
      extras.push(leaf);
    }
    const flower = sph(1.2 * sc, M.plastic(["#f43f5e", "#facc15", "#a855f7"][Math.floor(rng() * 3)]), [x, 7 * sc, z]);
    shadows.addShadowCaster(flower);
    extras.push(flower);
  }
}
// Latas de pintura (los cofres del garaje): al romperse salpican su color
function paintCans(n: number) {
  for (let i = 0; i < n; i++) {
    const p = freeSpot(5); if (!p) continue;
    const c = ["#d62828", "#2a6fdb", "#f2c14e", "#3a9d5d", "#e8e8e0"][int(0, 4)], tin = M.metal("#b8bcc2");
    const can = stat(merge("lata", [
      cyl(4.4, 4.4, 5, tin, [0, 2.5, 0], undefined, 14), cyl(4.5, 4.5, 2.6, M.matte(c), [0, 2.6, 0], undefined, 14),
      cyl(4.2, 4.2, 0.2, M.metal("#8a8e94"), [0, 5.05, 0], undefined, 14), tor(3.4, 0.2, M.metal("#8a8e94"), [0, 5.4, 0], [Math.PI / 2, 0, 0], 10),
    ]), B.PhysicsShapeType.CYLINDER, {}, [p[0], 0, p[1]]);
    breakable(can, 90, 2.4, c, [c, "#b8bcc2"]);
    bare.push({ x: p[0], z: p[1], r: 2.5 });
  }
}
// Herramientas gigantes tiradas en el piso del garaje: llave, martillo y destornillador
function giantTools() {
  const steel = M.metal("#8f969e");
  const kit: (() => B.Mesh)[] = [
    () => merge("llave", [box(16, 1, 2.6, steel, [0, 0.5, 0]), box(4.5, 1, 6, steel, [8, 0.5, 0]), box(3, 1.02, 2, M.matte("#20242a"), [9.4, 0.5, 0])]),
    () => merge("martillo", [cyl(1.6, 1.6, 14, woodM(), [0, 0.8, 0], [0, 0, Math.PI / 2], 8), box(2.6, 2.6, 7, steel, [7.5, 1.3, 0])]),
    () => merge("destornillador", [cyl(2.4, 2.4, 6, M.plastic("#c0392b"), [0, 1.2, 0], [0, 0, Math.PI / 2], 8), cyl(0.6, 0.6, 9, steel, [7.5, 1.2, 0], [0, 0, Math.PI / 2], 6)]),
  ];
  for (const make of kit) {
    const sp = freeSpot(9); if (!sp) continue;
    stat(make(), B.PhysicsShapeType.CONVEX_HULL, {}, [sp[0], 0, sp[1], rng() * 6.3]);
    bare.push({ x: sp[0], z: sp[1], r: 8 });
  }
}

function rocks(n: number) {
  for (let i = 0; i < n; i++) {
    const spot = freeSpot(4);
    if (!spot) continue;
    const [x, z] = spot;
    const r = B.MeshBuilder.CreatePolyhedron("rock", { type: 2, size: 1 }, scene);
    r.convertToFlatShadedMesh();
    r.material = pbr("stone", { color: "#ffffff", rough: 0.9, tex: tex("stone", TEX.stone) });
    r.scaling.set(1.5 + rng() * 3, 0.8 + rng() * 1.5, 1.5 + rng() * 3);
    r.rotation.y = rng() * 6;
    r.position.set(x, r.scaling.y * 0.4, z);
    stat(r, B.PhysicsShapeType.CONVEX_HULL);
    bare.push({ x, z, r: r.scaling.x });
  }
}

function gnomes(n: number) {
  const list: [number, number, number][] = [];
  for (let i = 0; i < n; i++) { const p = freeSpot(5); if (p) { list.push([p[0], p[1], rng() * 6.3]); bare.push({ x: p[0], z: p[1], r: 2.5 }); } }
  for (const [x, z, ry] of list) stat(merge("gnome", [
    cyl(2.4, 3.6, 4, M.plastic("#2563eb"), [0, 2, 0], undefined, 12),
    cyl(2.6, 2.6, 0.5, M.plastic("#78350f"), [0, 2.6, 0], undefined, 12),
    sph(2.4, M.plastic("#f5c7a9"), [0, 5, 0]),
    cyl(0.1, 2.6, 2.4, M.plastic("#f8fafc"), [0, 3.6, 0.8], [Math.PI - 0.3, 0, 0], 10),
    cyl(0.05, 2.6, 3.4, M.plastic("#dc2626"), [0, 7, 0], [-0.2, 0, 0], 12),
    sph(0.6, M.plastic("#f59e9e"), [0, 5, 1.15]),
  ]), B.PhysicsShapeType.CYLINDER, {}, [x, 0, z, ry]);
}

// Manguera enrollada con su tramo serpenteando por el pasto
function hose() {
  const hs = freeSpot(8);
  if (!hs) return;
  const [hx, hz] = hs;
  const h = merge("hose", [0, 1, 2, 3].map((i) => tor(9 - i * 0.2, 0.9, M.plastic("#22c55e"), [0, 0.45 + i * 0.85, 0], undefined, 24)));
  h.position.set(hx, 0, hz);
  stat(h, B.PhysicsShapeType.MESH);
  bare.push({ x: hx, z: hz, r: 5 });
  const a0 = rng() * 6.3, path: [number, number, number][] = [[hx + Math.cos(a0) * 4.6, 0.4, hz + Math.sin(a0) * 4.6]];
  for (let k = 1; k < 5; k++) path.push([path[k - 1][0] + Math.cos(a0 + (rng() - 0.5)) * 9, 0.4, path[k - 1][2] + Math.sin(a0 + (rng() - 0.5)) * 9]);
  tube(path, 0.45, M.plastic("#22c55e")).receiveShadows = true;
}

function wateringCan() {
  const cs = freeSpot(5) ?? [-70, -40];
  bare.push({ x: cs[0], z: cs[1], r: 3 });
  stat(merge("can", [
    cyl(5, 5, 6, M.metal("#15803d"), [0, 3, 0], undefined, 16),
    tube([[0, 2, 2.4], [0, 5, 5], [0, 6.5, 6.5]], 0.35, M.metal("#15803d")),
    tor(4, 0.4, M.metal("#15803d"), [0, 6.8, -1], [0, Math.PI / 2, Math.PI / 2], 12),
  ]), B.PhysicsShapeType.CYLINDER, {}, [cs[0], 0, cs[1]]);
}

// Pilas de bloques o cajas (pirámides empujables y rompibles) de lado s
function piles(np: number, cols: string[], mat: (c: string) => B.Material, s = 2) {
  for (let pile = 0; pile < np; pile++) {
    const sp = freeSpot(8); if (!sp) continue;
    const [bx, bz] = sp, rows = int(2, 4);
    for (let r = 0; r < rows; r++) for (let i = 0; i < rows - r + 1; i++) { const c = cols[int(0, cols.length - 1)]; breakable(dyn(box(s, s, s, mat(c), [bx + (i - (rows - r) / 2) * s * 1.1, s / 2 + r * s * 1.025, bz]), B.PhysicsShapeType.BOX, 0.3 * s), 40, s * 0.6, c); }
    bare.push({ x: bx, z: bz, r: 3 * s });
  }
}
function brickWalls(n: number) {
  for (let w = 0; w < n; w++) {
    const sp = freeSpot(8); if (!sp) continue;
    const [wx, wz] = sp;
    for (let i = 0; i < 8; i++) breakable(dyn(box(3, 1.4, 1.5, M.matte("#b45309"), [wx + (i % 4) * 3.1 - 4.6, 0.7 + Math.floor(i / 4) * 1.45, wz]), B.PhysicsShapeType.BOX, 1.2), 60, 1.5, "#b45309");
    bare.push({ x: wx, z: wz, r: 7 });
  }
}
// Charcos (agua o aceite): espejos en el piso
function puddles(n: number, mat: B.Material) {
  for (let i = 0; i < n; i++) {
    const spot = freeSpot(5); if (!spot) continue;
    const [x, z] = spot;
    const pd = B.MeshBuilder.CreateDisc("puddle", { radius: 1, tessellation: 20 }, scene);
    pd.rotation.x = Math.PI / 2;
    pd.scaling.set(3 + rng() * 4, 2 + rng() * 3, 1);
    pd.position.set(x, 0.035, z);
    pd.material = mat;
    pd.receiveShadows = true;
    bare.push({ x, z, r: pd.scaling.x });
  }
}
function ball() {
  const ballTex = tex("ball", () => canvasTex(256, (c, s) => { c.fillStyle = "#fafafa"; c.fillRect(0, 0, s, s); c.fillStyle = "#111"; for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) { c.beginPath(); c.arc(i * 32 + 16, j * 64 + 32, 12, 0, 7); c.fill(); } }));
  const bs = freeSpot(4) ?? [10, 10];
  dyn(sph(5, pbr("ball", { color: "#ffffff", rough: 0.4, tex: ballTex }), [bs[0], 2.5, bs[1]], undefined, 16), B.PhysicsShapeType.SPHERE, 2);
}

export function clearLayout() {
  for (const m of layoutMeshes) { m.physicsBody?.dispose(); m.dispose(); }
  layoutMeshes = [];
  breakables.length = 0;
  bare.length = staticBare;
  sprinklers.length = 0;
  sprT = 0;
}

export function buildLayout() {
  clearLayout();
  const before = new Set(scene.meshes);
  Z.layout();
  layoutMeshes = scene.meshes.filter((m) => !before.has(m));

  // Pasto: miles de matas como thin instances de una sola malla (evita lo que ocupa el layout)
  const n = tuftCount;
  const mats = new Float32Array(Math.max(1, n) * 16);
  const q = new B.Quaternion(), sc = new B.Vector3(), p = new B.Vector3(), m = new B.Matrix();
  let k = 0;
  for (let tries = 0; k < n && tries < n * 3; tries++) {
    const x = (rng() - 0.5) * (HALF - 1) * 2, z = (rng() - 0.5) * (HALF - 1) * 2;
    if (isBare(x, z)) continue;
    const s = 0.6 + rng() * 0.9;
    sc.set(s, s * (0.7 + rng() * 0.8) * Z.grassH, s);
    B.Quaternion.RotationYawPitchRollToRef(rng() * 6.3, 0, 0, q);
    p.set(x, 0, z);
    B.Matrix.ComposeToRef(sc, q, p, m);
    m.copyToArray(mats, k++ * 16);
  }
  tuft.isVisible = k > 0;
  if (k) tuft.thinInstanceSetBuffer("matrix", mats.subarray(0, k * 16), 16, true);
}

function water() {
  const w = B.MeshBuilder.CreateDisc("w", { radius: 12, tessellation: 32 }, scene);
  w.rotation.x = Math.PI / 2;
  w.position.y = 3.2;
  w.material = pbr("water", { color: "#4fb3e8", rough: 0.02, alpha: 0.8 });
  return w;
}

function grassTuft() {
  const pos: number[] = [], ind: number[] = [], col: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rng();
    const r = rng() * 0.25, w = 0.07, h = 0.25 + rng() * 0.3; // bajo: no tapar enemigos de 0.6
    const bx = Math.cos(a) * r, bz = Math.sin(a) * r, lean = 0.2 + rng() * 0.2;
    const px = -Math.sin(a) * w, pz = Math.cos(a) * w;
    const b = pos.length / 3;
    pos.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, bx + Math.cos(a) * lean, h, bz + Math.sin(a) * lean);
    ind.push(b, b + 1, b + 2);
    const g = 0.75 + rng() * 0.25;
    col.push(0.16 * g, 0.2 * g, 0.1 * g, 1, 0.16 * g, 0.2 * g, 0.1 * g, 1, 0.36 * g, 0.38 * g, 0.2 * g, 1); // pasto seco, apagado
  }
  const m = new B.Mesh("tuft", scene);
  const vd = new B.VertexData();
  vd.positions = pos; vd.indices = ind; vd.colors = col;
  vd.normals = [];
  B.VertexData.ComputeNormals(pos, ind, vd.normals);
  vd.applyToMesh(m);
  const mat = pbr("tuftMat", { color: "#ffffff", rough: 0.9 });
  if (!mat.pluginManager?.getPlugin("Wind")) new WindPlugin(mat); // el material se reusa al cambiar de zona
  mat.backFaceCulling = false;
  mat.twoSidedLighting = true;
  m.material = mat;
  m.receiveShadows = true;
  m.isPickable = false;
  return m;
}

// ---------- Viento + pasto que se aplasta al pasar el auto (shader de vértices) ----------
let windT = 0;
const windCar = new B.Vector3(0, -100, 0);
export function setWind(t: number, car: B.Vector3 | null) { windT = t; if (car) windCar.copyFrom(car); }

class WindPlugin extends B.MaterialPluginBase {
  constructor(m: B.Material) { super(m, "Wind", 200, { WIND: false }); this._enable(true); }
  getClassName() { return "WindPlugin"; }
  prepareDefines(d: B.MaterialDefines) { d["WIND"] = true; }
  getUniforms() {
    return { ubo: [{ name: "windTime", size: 1, type: "float" }, { name: "windCar", size: 3, type: "vec3" }], vertex: "uniform float windTime;\nuniform vec3 windCar;" };
  }
  bindForSubMesh(ubo: B.UniformBuffer) { ubo.updateFloat("windTime", windT); ubo.updateVector3("windCar", windCar); }
  getCustomCode(type: string) {
    if (type !== "vertex") return null;
    return {
      CUSTOM_VERTEX_UPDATE_WORLDPOS: `
        float gh = max(worldPos.y, 0.0);
        float gw = sin(windTime * 1.7 + worldPos.x * 0.33 + worldPos.z * 0.21) + 0.45 * sin(windTime * 3.3 + worldPos.z * 0.9);
        worldPos.xz += vec2(0.8, 0.5) * gw * gh * 0.16;
        vec2 gd = worldPos.xz - windCar.xz;
        float gp = 1.0 - smoothstep(0.7, 2.4, length(gd));
        worldPos.xz += normalize(gd + vec2(0.0001)) * gp * gh * 0.9;
        worldPos.y = mix(worldPos.y, worldPos.y * 0.15, gp);
      `,
    };
  }
}

// Obstáculos de la zona (círculos) para IA / bot
export const obstacles = () => bare;

// Punto de aparición aleatorio en un anillo alrededor del jugador, dentro de la zona
export function spawnPoint(center: B.Vector3, rMin: number, rMax: number) {
  for (let i = 0; i < 10; i++) {
    const a = rng() * Math.PI * 2, r = rMin + rng() * (rMax - rMin);
    const x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r;
    if (Math.abs(x) < HALF - 4 && Math.abs(z) < HALF - 4 && !bare.some((b) => Math.hypot(x - b.x, z - b.z) < b.r + 2)) return new B.Vector3(x, 1, z);
  }
  return new B.Vector3(B.Scalar.Clamp(center.x + rMin, -HALF + 5, HALF - 5), 1, B.Scalar.Clamp(center.z, -HALF + 5, HALF - 5));
}
