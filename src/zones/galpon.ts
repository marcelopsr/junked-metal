import * as B from "@babylonjs/core";
import { box, merge } from "../models";
import { M, pbr, shadows } from "../render";
import { rng } from "../rng";
import { FOLD, FOLD_PAINT } from "../folded";
import { HALF, bare, concreteTex, floor, occluders, scene, skin, stat, woodM } from "./common";
import { ball, between, canAt, freeSpot, giantTools, int, paintCans, piles, puddles, ramp, slopeBoard, toyRamps } from "../world_layout";

// Mesa de trabajo del galpón (ENCORE): centro, medidas y alto de la tapa. Plataforma: se sube por la rampa del lado +x y se baja saltando.
export const TABLE = { x: -70, z: -60, w: 44, d: 28, h: 12 };

// Piso de cemento con manchas, estantes de atrezo contra el fondo, mesa de trabajo como plataforma y, por semilla, cajas de herramientas gigantes, latas y cajas de chapa.
// La salida (0, 0) queda libre y el auto arranca mirando a -z: la cámara queda en +z, lejos de estantes y mesa (todos al fondo y a un lado), así que nada la tapa al empezar.
export function shedBuild() {
  floor("concrete", "#ffffff", concreteTex, 0.75, "concrete", 18);
  // Manchas de aceite fijas: un solo dibujo (discos fusionados, como los charcos)
  const oil = pbr("oilStain", { color: "#16130f", rough: 0.35, alpha: 0.7 });
  oil.zOffset = -3;
  const stains: B.Mesh[] = [];
  for (const [x, z, sx, sz] of [[-30, 25, 9, 6], [40, -20, 7, 5], [-95, 10, 6, 4], [70, 60, 10, 6], [10, -95, 8, 5], [-20, -30, 5, 4]]) {
    const d = B.MeshBuilder.CreateDisc("oilStain", { radius: 1, tessellation: 14 }, scene); d.rotation.x = Math.PI / 2; d.scaling.set(sx, sz, 1); d.position.set(x, 0.025, z); d.material = oil; stains.push(d);
  }
  merge("oilStains", stains).receiveShadows = true;
  // Paredes altas de chapa (se tramean si tapan al auto)
  const paint = M.matte("#7b7f74"), band = M.matte("#3c4542"), steel = M.metal("#a4aab0");
  for (const [x, z, w, d] of [[0, -HALF - 1, HALF * 2 + 4, 2], [HALF + 1, 0, 2, HALF * 2 + 4], [-HALF - 1, 0, 2, HALF * 2 + 4], [0, HALF + 1, HALF * 2 + 4, 2]]) occluders.push(merge("gwall", [box(w, 56, d, paint, [x, 28, z]), box(w + 0.6, 5, d + 0.6, band, [x, 2.5, z])]));
  // Estantes de atrezo contra el fondo: seis módulos en una sola malla y un colisionador largo
  const sp: B.Mesh[] = [], sz = -HALF + 5.5;
  for (let i = 0; i < 6; i++) {
    const cx = -105 + i * 42;
    for (const [dx, dz] of [[-17.5, -4.5], [17.5, -4.5], [-17.5, 4.5], [17.5, 4.5]]) sp.push(box(1, 46, 1, M.metal("#7a8088"), [cx + dx, 23, sz + dz]));
    for (const y of [2, 14, 26, 38]) {
      sp.push(box(36, 0.8, 10, M.metal("#8a9098"), [cx, y, sz]));
      for (let x = cx - 16; x < cx + 16;) { const w = 4 + rng() * 5, h = 3 + rng() * 6; sp.push(box(w, h, 7, M.matte(["#b08850", "#9a7444", "#c49a64", "#b8322a"][int(0, 3)]), [x + w / 2, y + 0.4 + h / 2, sz])); x += w + 1 + rng() * 2; }
    }
  }
  const shelves = merge("estantes", sp);
  shadows.addShadowCaster(shelves);
  occluders.push(shelves);
  stat(box(252, 46, 10, band, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [0, 23, sz]).isVisible = false;
  // Mesa de trabajo: tapa, patas, morsa y tablero; los colisionadores van aparte e invisibles. Rampa de subida del lado +x.
  const { x: tx, z: tz, w: tw, d: td, h: th } = TABLE, wood = woodM(), leg = M.metal("#4a5058");
  const table = merge("mesaTrabajo", [
    box(tw, 1.2, td, wood, [tx, th - 0.6, tz]), box(tw, 1.6, 1.2, leg, [tx, th - 2, tz + td / 2 - 1]), box(tw, 1.6, 1.2, leg, [tx, th - 2, tz - td / 2 + 1]),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz2) => box(1.8, th - 1.2, 1.8, leg, [tx + sx * (tw / 2 - 1.5), (th - 1.2) / 2, tz + sz2 * (td / 2 - 1.5)]))),
    box(5, 3, 4, M.metal("#2f5f8a"), [tx - 14, th + 1.5, tz - 8]), box(1, 1, 6, M.metal("#9aa0a6"), [tx - 14, th + 2, tz - 4]),
    box(tw - 4, 0.5, 0.5, M.matte("#8a1810"), [tx, th - 6, tz - td / 2 + 0.8]),
  ]);
  shadows.addShadowCaster(table);
  occluders.push(table);
  stat(box(tw, 1.2, td, leg, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [tx, th - 0.6, tz]).isVisible = false;
  for (const sx of [-1, 1]) for (const sz2 of [-1, 1]) stat(box(1.8, th - 1.2, 1.8, leg, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [tx + sx * (tw / 2 - 1.5), (th - 1.2) / 2, tz + sz2 * (td / 2 - 1.5)]).isVisible = false;
  ramp(M.metal("#b8322a"), tx + tw / 2 + 28, tz, -Math.PI / 2, 9, 28, th, 0, 0, 0, [slopeBoard(9.4, 28, th, wood)]);
  for (const dx of [-12, 0, 12]) bare.push({ x: tx + dx, z: tz, r: 16 }); // para la IA, los cofres y el teleportador: la mesa es un obstáculo
}

export function shedLayout() {
  // Tapa de la mesa: premio de la plataforma (tres latas rompibles)
  for (let k = 0; k < 3; k++) canAt(TABLE.x - 12 + k * 12, TABLE.h, TABLE.z + between(-6, 6), int(0, 4));
  toyRamps(int(2, 3), [0, 1]);
  // Cajas de herramientas gigantes: obstáculos macizos; la caja visible es una instancia de una sola plantilla
  const red = M.matte("#b8322a"), dark = M.matte("#7a1f19"), steel = M.metal("#a4aab0");
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
  piles(int(2, 3), [FOLD_PAINT[0], FOLD_PAINT[1], FOLD_PAINT[2]], (c) => FOLD.painted(c, 0.8, 37), 3, true);
  puddles(int(3, 6), pbr("oil", { color: "#0c0b0a", rough: 0.05, metal: 0.4, alpha: 0.9 }));
  ball();
}

