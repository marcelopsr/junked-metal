import * as B from "@babylonjs/core";
import { box, merge } from "../models";
import { M, pbr, TEX } from "../render";
import { rng } from "../rng";
import { HALF, bare, floor, occluders, skin, stat } from "./common";
import { ball, freeSpot, giantTools, int, paintCans, piles, puddles, toyRamps } from "../world_layout";

// Tablones oscuros, paredes de chapa, vigas bajas y juguetes gigantes rotos como obstáculos. Mismo tamaño y reglas que el galpón (salida (0, 0) libre).
export function atticBuild() {
  floor("attic", "#b79a74", TEX.wood, 0.85, "concrete", 22);
  const paint = M.matte("#5b4a3a"), band = M.matte("#2e241c");
  for (const [x, z, w, d] of [[0, -HALF - 1, HALF * 2 + 4, 2], [HALF + 1, 0, 2, HALF * 2 + 4], [-HALF - 1, 0, 2, HALF * 2 + 4], [0, HALF + 1, HALF * 2 + 4, 2]]) occluders.push(merge("gwall", [box(w, 56, d, paint, [x, 28, z]), box(w + 0.6, 5, d + 0.6, band, [x, 2.5, z])]));
}
export function atticLayout() {
  toyRamps(int(2, 3), [0, 1]);
  // Baúles de juguetes: obstáculos macizos
  const wood = M.matte("#7a4a24"), strap = M.metal("#a4aab0");
  for (let i = 0, n = int(4, 6); i < n; i++) {
    const p = freeSpot(10); if (!p) continue;
    skin(stat(box(14, 8, 8, wood, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [p[0], 4, p[1], rng() * 6.3]), "baulJuguetes", () => [
      box(14, 6, 8, wood, [0, -1, 0]), box(14.4, 2, 8.4, M.matte("#5c3718"), [0, 3, 0]), box(1.2, 8, 8.5, strap, [-4, 0, 0]), box(1.2, 8, 8.5, strap, [4, 0, 0]),
    ]);
    bare.push({ x: p[0], z: p[1], r: 9 });
  }
  giantTools();
  paintCans(int(4, 7));
  piles(int(3, 4), ["#d94a3a", "#e0b030", "#3a7bd9", "#4aa860"], (c) => M.plastic(c), 3); // cubos de letras
  puddles(int(2, 4), pbr("dust", { color: "#3a3028", rough: 0.9, alpha: 0.6 }));
  ball();
}


