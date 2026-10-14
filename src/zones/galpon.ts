import * as B from "@babylonjs/core";
import { box, cyl, merge, rbox } from "../models";
import { M, pbr, shadows } from "../render";
import { rng } from "../rng";
import { HALF, bare, concreteTex, floor, occluders, scene, skin, stat, woodM } from "./common";
import { ball, between, canAt, freeSpot, giantTools, int, paintCans, piles, puddles, ramp, slopeBoard, toyRamps } from "../world_layout";

// Mesa de trabajo del galpón (ENCORE): centro, medidas y alto de la tapa. Plataforma: se sube por la rampa del lado +x y se baja saltando.
export const TABLE = { x: -70, z: -60, w: 44, d: 28, h: 12 };

// Piso de cemento con manchas, estantes de atrezo contra el fondo, mesa de trabajo como plataforma y, por semilla, cajas de herramientas gigantes, latas y cajas de chapa.
// La salida (0, 0) queda libre y el auto arranca mirando a -z: la cámara queda en +z, lejos de estantes y mesa (todos al fondo y a un lado), así que nada la tapa al empezar.
const toy = (c: string, rough = 0.5) => pbr(`toy${c}`, { color: c, rough, metal: 0 });

export function shedBuild() {
  floor("concrete", "#ffffff", concreteTex, 0.75, "concrete", 18);
  // Manchas de aceite fijas: un solo dibujo (discos fusionados, como los charcos)
  const oil = toy("#FBC02D", 0.6); // marcas de pintura amarilla en el piso, no aceite
  oil.zOffset = -3;
  const stains: B.Mesh[] = [];
  for (const [x, z, sx, sz] of [[-30, 25, 9, 6], [40, -20, 7, 5], [-95, 10, 6, 4], [70, 60, 10, 6], [10, -95, 8, 5], [-20, -30, 5, 4]]) {
    const d = B.MeshBuilder.CreateDisc("oilStain", { radius: 1, tessellation: 14 }, scene); d.rotation.x = Math.PI / 2; d.scaling.set(sx, sz, 1); d.position.set(x, 0.025, z); d.material = oil; stains.push(d);
  }
  merge("oilStains", stains).receiveShadows = true;
  // Paredes altas de chapa (se tramean si tapan al auto)
  const paint = toy("#CFD8DC", 0.7), band = toy("#42A5F5", 0.5);
  for (const [x, z, w, d] of [[0, -HALF - 1, HALF * 2 + 4, 2], [HALF + 1, 0, 2, HALF * 2 + 4], [-HALF - 1, 0, 2, HALF * 2 + 4], [0, HALF + 1, HALF * 2 + 4, 2]]) occluders.push(merge("gwall", [box(w, 56, d, paint, [x, 28, z]), box(w + 0.6, 5, d + 0.6, band, [x, 2.5, z])]));
  // Estantes de atrezo contra el fondo: seis módulos en una sola malla y un colisionador largo
  const sp: B.Mesh[] = [], sz = -HALF + 5.5;
  for (let i = 0; i < 6; i++) {
    const cx = -105 + i * 42;
    for (const [dx, dz] of [[-17.5, -4.5], [17.5, -4.5], [-17.5, 4.5], [17.5, 4.5]]) sp.push(box(1, 46, 1, toy("#9E9E9E"), [cx + dx, 23, sz + dz]));
    for (const y of [2, 14, 26, 38]) {
      sp.push(box(36, 0.8, 10, toy("#FAFAFA"), [cx, y, sz]));
      for (let x = cx - 16; x < cx + 16;) { const w = 4 + rng() * 5, h = 3 + rng() * 6; sp.push(box(w, h, 7, toy(["#FBC02D", "#42A5F5", "#66BB6A", "#E53935"][int(0, 3)]), [x + w / 2, y + 0.4 + h / 2, sz])); x += w + 1 + rng() * 2; }
    }
  }
  const shelves = merge("estantes", sp);
  shadows.addShadowCaster(shelves);
  occluders.push(shelves);
  skyline(sz);
  stat(box(252, 46, 10, band, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [0, 23, sz]).isVisible = false;
  // Mesa de trabajo: tapa, patas, morsa y tablero; los colisionadores van aparte e invisibles. Rampa de subida del lado +x.
  const { x: tx, z: tz, w: tw, d: td, h: th } = TABLE, wood = woodM(), leg = toy("#9E9E9E");
  const table = merge("mesaTrabajo", [
    box(tw, 1.2, td, wood, [tx, th - 0.6, tz]), box(tw, 1.6, 1.2, leg, [tx, th - 2, tz + td / 2 - 1]), box(tw, 1.6, 1.2, leg, [tx, th - 2, tz - td / 2 + 1]),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz2) => box(1.8, th - 1.2, 1.8, leg, [tx + sx * (tw / 2 - 1.5), (th - 1.2) / 2, tz + sz2 * (td / 2 - 1.5)]))),
    box(5, 3, 4, toy("#42A5F5"), [tx - 14, th + 1.5, tz - 8]), box(1, 1, 6, M.metal("#9aa0a6"), [tx - 14, th + 2, tz - 4]),
    box(tw - 4, 0.5, 0.5, toy("#E53935"), [tx, th - 6, tz - td / 2 + 0.8]),
  ]);
  shadows.addShadowCaster(table);
  occluders.push(table);
  stat(box(tw, 1.2, td, leg, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [tx, th - 0.6, tz]).isVisible = false;
  for (const sx of [-1, 1]) for (const sz2 of [-1, 1]) stat(box(1.8, th - 1.2, 1.8, leg, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [tx + sx * (tw / 2 - 1.5), (th - 1.2) / 2, tz + sz2 * (td / 2 - 1.5)]).isVisible = false;
  ramp(toy("#FB8C00"), tx + tw / 2 + 28, tz, -Math.PI / 2, 9, 28, th, 0, 0, 0, [slopeBoard(9.4, 28, th, wood)]);
  for (const dx of [-12, 0, 12]) bare.push({ x: tx + dx, z: tz, r: 16 }); // para la IA, los cofres y el teleportador: la mesa es un obstáculo
}

/** Industrial de juguete sobre los estantes del fondo: contenedores apilados, tambores de colores y dos grúas torre. Solo visual: sin colisión, sin rng(). */
function skyline(sz: number) {
  const cols = ["#E53935", "#FBC02D", "#42A5F5", "#66BB6A", "#FB8C00", "#8E24AA"], parts: B.Mesh[] = [], top = 46.8;
  const container = (x: number, y: number, c: string, long = 18) => {
    parts.push(rbox(long, 7, 8, 0.5, toy(c, 0.5), [x, y + 3.5, sz]));
    for (let k = -long / 2 + 2; k < long / 2; k += 2.4) parts.push(box(0.5, 6.4, 8.2, toy("#FAFAFA", 0.5), [x + k, y + 3.5, sz])); // nervaduras
  };
  for (let i = 1; i < 5; i++) {
    const cx = -105 + i * 42;
    container(cx - 9.5, top, cols[(i * 2) % 6]); container(cx + 9.5, top, cols[(i * 2 + 1) % 6]);
    if (i % 2) container(cx, top + 7, cols[(i * 2 + 3) % 6], 20);
    else for (const [dx, c] of [[-5, 2], [0, 0], [5, 1]] as const) parts.push(cyl(3.2, 3.2, 4.4, toy(cols[c]), [cx + dx - 9.5, top + 9.2, sz], undefined, 14), cyl(3.3, 3.3, 0.5, toy("#FAFAFA"), [cx + dx - 9.5, top + 11.2, sz], undefined, 14), cyl(3.3, 3.3, 0.5, toy("#FAFAFA"), [cx + dx - 9.5, top + 7.8, sz], undefined, 14));
  }
  for (const cx of [-105, 105]) { // grúa torre de juguete: mástil amarillo, pluma roja con contrapeso y gancho
    parts.push(rbox(4, 4, 4, 0.4, toy("#9E9E9E"), [cx, top + 2, sz]), box(2, 26, 2, toy("#FBC02D"), [cx, top + 17, sz]), rbox(3.4, 3, 3.4, 0.5, toy("#42A5F5"), [cx, top + 31, sz]));
    const s = cx < 0 ? 1 : -1;
    parts.push(box(34, 1.6, 1.6, toy("#E53935"), [cx + s * 10, top + 33, sz]), rbox(6, 4, 4, 0.5, toy("#9E9E9E"), [cx - s * 8, top + 31, sz]), box(0.3, 14, 0.3, toy("#FAFAFA"), [cx + s * 20, top + 26, sz]), rbox(2, 2, 2, 0.4, toy("#FB8C00"), [cx + s * 20, top + 18.5, sz]));
  }
  const m = merge("galponSkyline", parts);
  m.isPickable = false; m.receiveShadows = true;
  shadows.addShadowCaster(m);
}

export function shedLayout() {
  // Tapa de la mesa: premio de la plataforma (tres latas rompibles)
  for (let k = 0; k < 3; k++) canAt(TABLE.x - 12 + k * 12, TABLE.h, TABLE.z + between(-6, 6), int(0, 4));
  toyRamps(int(2, 3), [0, 1]);
  // Cajas de herramientas gigantes: obstáculos macizos; la caja visible es una instancia de una sola plantilla
  const red = toy("#E53935"), dark = toy("#B71C1C"), steel = toy("#9E9E9E", 0.4);
  for (let i = 0, n = int(4, 6); i < n; i++) {
    const p = freeSpot(10); if (!p) continue;
    skin(stat(box(14, 8, 7.4, dark, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [p[0], 4, p[1], rng() * 6.3]), "cajaHerrG", () => [
      box(14, 6, 7, red, [0, -1, 0]), box(14.4, 2, 7.4, dark, [0, 3, 0]), box(8, 0.8, 0.8, steel, [0, 4.6, 0]),
      box(0.8, 2, 0.8, steel, [-4, 4, 0]), box(0.8, 2, 0.8, steel, [4, 4, 0]), box(1.4, 1.4, 0.3, steel, [-4.5, 1.8, 3.6]), box(1.4, 1.4, 0.3, steel, [4.5, 1.8, 3.6]),
    ]);
    bare.push({ x: p[0], z: p[1], r: 9 });
  }
  giantTools();
  paintCans(int(5, 8));
  piles(int(2, 3), ["#E53935", "#FBC02D", "#42A5F5"], (c) => toy(c), 3, true);
  puddles(int(3, 6), pbr("oil", { color: "#42A5F5", rough: 0.05, metal: 0, alpha: 0.85 }));
  ball();
}

