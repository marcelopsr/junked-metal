import * as B from "@babylonjs/core";
import { G } from "./render";
import { rng, seedRng } from "./rng";
import { precio } from "./balance";
import { ENCORE_DUSK, type Climate } from "./run";
import { LUNA_CLIMATE, MOON, moonBuild, moonReset, ringAt } from "./moon";
import { HALF, Z, type Zone, type ZoneId, bare, heavyProps, layoutMeshes, lowQ, occluders, plankTpl, retex, scene, setHalf, setScene, setZ, st, texs, undo, worldMeshes, zoneId } from "./zones/common";
import { buildLayout, clearLayout, grassTuft, setDrawDist } from "./world_layout";
import { clouds } from "./grass";
import { buildRcProps } from "./models/props_rc";
import { patioBuild, patioLayout } from "./zones/patio";
import { garageBuild, garageLayout } from "./zones/garaje";
import { TABLE, shedBuild, shedLayout } from "./zones/galpon";
import { atticBuild, atticLayout } from "./zones/desvan";
import { frontBuild, frontLayout } from "./zones/jardin";
import { PIT, pitY, poolBuild, poolLayout } from "./zones/pileta";
import { KITCHEN_CLIMATE, TABLE_K, kitchenBuild, kitchenLayout } from "./zones/cocina";


// Zonas de juego. Un auto RC mide ~2 unidades (1 u ≈ 4,5 cm): una maceta es un edificio, un auto real es una montaña.
// Cada zona = tabla de datos + build (lo fijo) + layout (lo que cambia con la semilla), armadas con las mismas piezas.
// HALF es un `let` exportado (vive en zones/common.ts, que lo re-exporta acá): los importadores (HUD, bot, límites) ven el valor de la zona actual.
// Piezas del módulo partido: zones/{patio,garaje,galpon,desvan,jardin,common}.ts, world_layout.ts (layout por partida) y grass.ts (viento + pasto).
export { HALF, zoneId, breakables, heavyProps, occluders, underRoof, hitBreakables, hitHeavyProps, registerHeavyProp, type Breakable, type HeavyProp, type ZoneId } from "./zones/common";
export { buildGrass, buildLayout, clearLayout, setDrawDist } from "./world_layout";
export { setWind } from "./grass";
export { zoneTick } from "./zones/jardin";
const TUBO: Climate = { id: "tubo", name: "TUBO FLUORESCENTE", sun: [0.4, -1, 0.3], sunColor: "#dff2e6", sunI: 3, hemiI: 1.2, sky: ["#0b0d0d", "#121615", "#161b1a", "#0b0d0d"], exposure: 1.1, fog: 0.005, ramp: ["#0c1214", "#4a6a62", "#eef6e8"] };
// ponytail: precios provisorios (Taller → Zonas), a calibrar con el balance de tornillos
export const ZONE_COST = { garaje: precio("zona_garaje"), jardin: precio("zona_jardin"), desvan: precio("zona_desvan"), pileta: precio("zona_pileta"), cocina: precio("zona_cocina") }; // curva de precios: como un auto o algo más (menu.ts, Taller)
const ZONES_BASE: Record<Exclude<ZoneId, "galpon" | "desvan" | "pileta" | "cocina">, Zone> = {
  patio: { name: "Patio trasero", short: "Patio", desc: "Pileta, mesa de jardín y una huerta abandonada junto con los buenos propósitos.", half: 160, cost: 0, grass: 1, grassH: 1,
    rects: [[0, -30, 24, 17], [50, 45, 21, 16], [-48, 20, 24, 18]],
    roof: (p) => Math.abs(p.x) < 17 && Math.abs(p.z + 30) < 15 && p.y < 16, // tapa de la mesa: 34x30 en (0,-30), a 16 de alto
    build: patioBuild, layout: patioLayout },
  garaje: { name: "Garaje de la casa", short: "Garaje", desc: "Cemento con aceite, un auto en caballetes y un tubo que parpadea desde el divorcio.", half: 80, cost: ZONE_COST.garaje, grass: 0, grassH: 1,
    rects: [[30, 0, 22, 50], [-45, -72, 26, 9], [38, -75, 19, 6], [-75, 40, 6, 36], [-68, -50, 11, 11]],
    roof: (p) => (Math.abs(p.x - 30) < 20 && Math.abs(p.z) < 48 && p.y < 9) || (Math.abs(p.x + 45) < 25 && Math.abs(p.z + 72) < 7 && p.y < 18),
    climate: TUBO, dust: [[-20, 25, 8, 32], [-20, -25, 8, 32], [-45, -76, 28, 6]], build: garageBuild, layout: garageLayout },
  jardin: { name: "Jardín delantero", short: "Jardín", desc: "Césped cortado, aspersores que empujan y la calle de límite. Se ve bien desde afuera, como todo.", half: 140, cost: ZONE_COST.jardin, grass: 1.3, grassH: 0.5,
    rects: [[12, 8, 5, 132], [0, -132, 220, 8], [-55, 35, 25, 8]],
    build: frontBuild, layout: frontLayout },
  // Luna (moon.ts): esfera de verdad con gravedad radial; half grande = sin paredes ni borde en el radar
  luna: { name: "Luna", short: "Luna", desc: "Un planeta chico: el horizonte se curva a cada metro y del lado oscuro solo se ven las luces de lo que se acerca.", half: 1000, cost: 0, grass: 0, grassH: 1,
    rects: [], climate: LUNA_CLIMATE, build: () => moonBuild(scene, lowQ), layout: moonReset },
};
export const ZONES = ZONES_BASE as Record<ZoneId, Zone>; // galpón y desván se agregan abajo
// Galpón de utilería: solo lo usa ENCORE (variante EL GALPÓN DE UTILERÍA). No enumerable: los menús recorren Object.keys(ZONES) y no debe aparecer como zona elegible ni comprable.
ZONES.galpon = { name: "Galpón de utilería", short: "Galpón", desc: "Cemento manchado, estantes de atrezo y una mesa de trabajo que hace de tarima.", half: 140, cost: 0, grass: 0, grassH: 1,
  rects: [[TABLE.x, TABLE.z, TABLE.w / 2 + 2, TABLE.d / 2 + 2]],
  roof: (p) => Math.abs(p.x - TABLE.x) < TABLE.w / 2 - 2 && Math.abs(p.z - TABLE.z) < TABLE.d / 2 - 2 && p.y < TABLE.h - 3,
  build: shedBuild, layout: shedLayout };
Object.defineProperty(ZONES, "galpon", { enumerable: false });
// Desván de los juguetes rotos: zona comprable (Taller → Zonas) y variante de ENCORE.
ZONES.desvan = { name: "Desván de los juguetes rotos", short: "Desván", desc: "Tablones torcidos, un baúl del tamaño de un auto y juguetes que ya nadie arregla.", half: 140, cost: ZONE_COST.desvan, grass: 0, grassH: 1,
  rects: [], build: atticBuild, layout: atticLayout };
// La pileta vacía: zona comprable y variante de ENCORE. Un pozo de 100x100 (playa a -5, parte honda a -16, unidos por rampa) en una explanada de cemento.
ZONES.pileta = { name: "La pileta vacía", short: "Pileta", desc: "Una pileta sin agua: playa, parte honda con rampa, escalones, un trampolín roto y hojas secas. Se baja con ganas y se vuelve a subir por la rampa.", half: 140, cost: ZONE_COST.pileta, grass: 0, grassH: 1,
  rects: [[(PIT.x0 + PIT.x1) / 2, 0, (PIT.x1 - PIT.x0) / 2 + 2, PIT.z1 + 2]], build: poolBuild, layout: poolLayout };
// La cocina: zona comprable y variante de ENCORE. Baldosas, mesadas en L, heladera, horno y una mesa con sillas que hace de techo.
ZONES.cocina = { name: "La cocina", short: "Cocina", desc: "Baldosas en damero, mesadas en L, una heladera que zumba y una mesa con sillas para pasar por abajo. Algo huele a quemado.", half: 140, cost: ZONE_COST.cocina, grass: 0, grassH: 1,
  rects: [[-20, HALF - 13, 92, 15], [-HALF + 13, 35, 15, 77], [105, HALF - 22, 24, 22], [TABLE_K.x, TABLE_K.z, TABLE_K.w / 2 + 14, TABLE_K.d / 2 + 14]],
  roof: (p) => Math.abs(p.x - TABLE_K.x) < TABLE_K.w / 2 - 2 && Math.abs(p.z - TABLE_K.z) < TABLE_K.d / 2 - 2 && p.y < TABLE_K.h - 3,
  climate: KITCHEN_CLIMATE, build: kitchenBuild, layout: kitchenLayout };
setZ(ZONES.patio, "patio");
/** Luz fija de la zona (garaje) o undefined: la partida sigue el ciclo de la semilla. */
// ponytail: import dinámico para no cerrar el ciclo world ↔ encore_run (falla con "ZONES before initialization"); techo: si encore_run dejara de exportar `erun`, pasar el flag por un setter.
let erunNow: () => unknown = () => null;
void import("./encore_run").then((m) => { erunNow = () => m.erun; });
export const zoneClimate = () => Z.climate ?? (erunNow() ? ENCORE_DUSK : undefined); // ENCORE: atardecer cálido fijo en las zonas sin luz propia (patio, jardín, galpón, desván, pileta); la luna y la cocina traen la suya
/** Piso bajo un punto (ruido de ruedas en sfx.ts). Copia a mano los decals de cada build: si se mueven, actualizar acá. */
export type Floor = "pasto" | "baldosa" | "tierra" | "cemento";
export function floorAt(x: number, z: number): Floor {
  if (zoneId === "garaje" || zoneId === "galpon") return "cemento";
  if (zoneId === "desvan" || zoneId === "cocina") return "baldosa"; // tablones: el sonido de madera/baldosa, sin tierra ni pasto
  if (zoneId === "pileta") return x > PIT.x0 && x < PIT.x1 && Math.abs(z) < PIT.z1 ? "baldosa" : "tierra"; // azulejo dentro del pozo, cemento en la explanada
  if (zoneId === "luna") return "tierra";
  if (zoneId === "jardin") return z < -HALF + 16 || Math.abs(x - 12) < 4 ? "baldosa" : "pasto"; // vereda y camino de lajas
  if (Math.abs(x) < 24 && Math.abs(z + 30) < 17) return "baldosa";
  if (Math.abs(x + 48) < 24 && Math.abs(z - 20) < 18) return "tierra";
  return Math.abs(x - 50) < 21 && Math.abs(z - 45) < 16 ? "tierra" : "pasto";
}
/** Altura del piso bajo un punto (0 salvo en el pozo de la pileta). */
export const groundY = (x: number, z: number) => (zoneId === "pileta" ? pitY(x, z) : 0);
/** Columnas de polvo bajo los tubos del garaje [x, z, ancho, largo] (reemplazan a las luciérnagas) o undefined. */
export const zoneDust = () => Z.dust;

// El mundo se arma recién en la primera partida (setZone): los menús tienen escenas propias (menuscene.ts) y no lo cargan.
let built = false;
export const initWorld = (s: B.Scene, low: boolean) => setScene(s, low);
/** Menús: esconde (o vuelve a mostrar) el mundo de juego ya armado; los cuerpos físicos quedan donde están. */
export function showWorld(on: boolean) { for (const m of [...worldMeshes, ...layoutMeshes, ...clouds]) m.setEnabled(on); }
export function buildWorld(s: B.Scene, low: boolean, id: ZoneId = "patio") {
  setScene(s, low);
  plankTpl(); // las plantillas se crean antes de la foto: no se liberan al cambiar de zona
  const before = new Set(scene.meshes);
  st.tuft = grassTuft(); // primero, como siempre: el orden de rng() del mundo no cambia entre zonas
  setZ(ZONES[id] ?? ZONES.patio, ZONES[id] ? id : "patio");
  setHalf(Z.half);
  st.tuftCount = Math.round(12000 * Z.grass * (HALF / 160) ** 2); // 12000 en el patio de 320: base fija, el Detalle (G.grass) recorta o agrega después sin tocar rng()
  occluders.length = 0;
  bare.length = 0;
  heavyProps.length = 0;
  Z.build();
  if (id === "patio") buildRcProps(); // props RC con posiciones fijas: registran su huella en bare antes del layout (el layout por semilla cambia respecto de antes)
  // Paredes físicas del borde (lo visible lo pone cada zona); la luna no tiene borde
  if (id !== "luna") for (const [x, z, w, d] of [[0, HALF, HALF * 2 + 10, 2], [0, -HALF, HALF * 2 + 10, 2], [HALF, 0, 2, HALF * 2 + 10], [-HALF, 0, 2, HALF * 2 + 10]]) {
    const wall = B.MeshBuilder.CreateBox("wall", { width: w, height: 60, depth: d }, scene);
    wall.position.set(x, 30, z);
    wall.isVisible = false;
    new B.PhysicsAggregate(wall, B.PhysicsShapeType.BOX, { mass: 0 }, scene);
  }
  st.staticBare = bare.length;
  worldMeshes.length = 0; worldMeshes.push(...scene.meshes.filter((m) => !before.has(m)));
}

/** ¿Ya está armado el mundo de esta zona? (la precarga de main.ts lo arma en los menús) */
export const worldReady = (id: string) => built && zoneId === id;
/** Cambia de zona: rehace mundo y layout (semilla fija del mundo). Devuelve false si ya era la zona actual.
 *  layout = false: solo el mundo (quien llama arma después su propio layout con semilla: partida y carrera lo rehacen siempre). */
let texBuilt = 0; // tope de texturas con el que se dibujaron las actuales
export function setZone(id: string, layout = true) {
  if (Object.keys(texs).length && texBuilt !== G.texCap) retex();
  texBuilt = G.texCap;
  if ((built && id === zoneId) || !(id in ZONES)) return false;
  built = true;
  clearLayout();
  for (const m of worldMeshes) { m.physicsBody?.dispose(); m.dispose(); }
  for (const f of undo) f();
  undo.length = 0;
  seedRng(20260929);
  buildWorld(scene, lowQ, id as ZoneId);
  if (layout) buildLayout();
  setDrawDist(G.draw);
  return true;
}

// Obstáculos de la zona (círculos) para IA / bot
export const obstacles = () => bare;

// Punto de aparición aleatorio en un anillo alrededor del jugador, dentro de la zona
export function spawnPoint(center: B.Vector3, rMin: number, rMax: number) {
  if (MOON.on) { const a = rng() * Math.PI * 2; return ringAt(center, a, rMin + rng() * (rMax - rMin)); } // luna: anillo sobre la esfera (distancias por la superficie)
  for (let i = 0; i < 10; i++) {
    const a = rng() * Math.PI * 2, r = rMin + rng() * (rMax - rMin);
    const x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r;
    if (Math.abs(x) < HALF - 4 && Math.abs(z) < HALF - 4 && !bare.some((b) => Math.hypot(x - b.x, z - b.z) < b.r + 2)) return new B.Vector3(x, 1, z);
  }
  return new B.Vector3(B.Scalar.Clamp(center.x + rMin, -HALF + 5, HALF - 5), 1, B.Scalar.Clamp(center.z, -HALF + 5, HALF - 5));
}

