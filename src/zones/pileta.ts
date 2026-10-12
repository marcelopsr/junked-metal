import * as B from "@babylonjs/core";
import { box, cyl, merge, tor } from "../models";
import { M, canvasTex, pbr, shadows, surface } from "../render";
import { rng } from "../rng";
import { HALF, bare, concreteTex, decal, occluders, scene, stat, tex } from "./common";
import { ball, giantTools, int, paintCans, piles, puddles, ramp, slopeBoard, toyRamps } from "../world_layout";

// La pileta vacía (ENCORE y Taller): explanada de cemento (y = 0) con un pozo rectangular. De la explanada se baja por tres escalones a la playa (-5);
// la playa baja por una rampa a la parte honda (-16) y sale por otra rampa al borde norte. El desnivel es físico: el suelo se arma en tajadas (sin la caja única de floor()).
// x crece hacia la parte honda. La salida (0, 0) queda en la explanada, a 25 m del borde.
export const PIT = { x0: 25, x1: 115, z0: -50, z1: 50, hi: -5, lo: -16, r0: 50, r1: 80 }; // pozo, nivel de la playa, nivel hondo, tramo de la rampa honda (x)

/** Altura del suelo en (x, z): explanada 0, escalones, playa, rampa honda, fondo y rampa de salida (misma geometría que poolBuild). Para gemas y cosas que caen. */
export function pitY(x: number, z: number) {
  const { x0, x1, z0, z1, hi, lo, r0, r1 } = PIT;
  if (x <= x0 || x >= x1 || Math.abs(z) >= z1) return 0;
  if (x > 31 && x < 45 && z < z0 + 26) return hi + ((z0 + 26 - z) / 26) * -hi; // rampa de salida al borde norte
  if (Math.abs(z) < 8 && x < x0 + 9) return x < x0 + 3 ? -1.25 : x < x0 + 6 ? -2.5 : -3.75; // escalones
  if (x < r0) return hi;
  if (x > r1) return lo;
  return Math.abs(z) < 12 ? lo + ((r1 - x) / (r1 - r0)) * (hi - lo) : lo; // rampa honda (24 de ancho); al costado queda el fondo
}

// UV por posición del mundo (el azulejo y el cemento no se estiran en paredes ni en pisos de cualquier tamaño). per = metros por repetición.
function worldUV(m: B.Mesh, per: number, ox = 0, oz = 0) {
  const p = m.getVerticesData(B.VertexBuffer.PositionKind)!, n = m.getVerticesData(B.VertexBuffer.NormalKind)!, uv: number[] = [];
  for (let i = 0; i < p.length / 3; i++) {
    const x = p[3 * i] + ox, y = p[3 * i + 1], z = p[3 * i + 2] + oz, ax = Math.abs(n[3 * i]), ay = Math.abs(n[3 * i + 1]), az = Math.abs(n[3 * i + 2]);
    uv.push(...(ay >= ax && ay >= az ? [x, z] : ax >= az ? [z, y] : [x, y]).map((v) => v / per));
  }
  m.setVerticesData(B.VertexBuffer.UVKind, uv);
}
const hidden = (m: B.Mesh) => ((m.isVisible = false), m);
const slab = (x0: number, x1: number, z0: number, z1: number, top: number, thick = 2) =>
  hidden(stat(box(x1 - x0, thick, z1 - z0, M.matte("#888"), [0, 0, 0]), B.PhysicsShapeType.BOX, { friction: 0.7 }, [(x0 + x1) / 2, top - thick / 2, (z0 + z1) / 2]));

const tileTex = () => canvasTex(256, (c, s) => {
  c.fillStyle = "#7fb7b8"; c.fillRect(0, 0, s, s);
  for (let i = 0; i < 3500; i++) { c.fillStyle = ["#6aa3a5", "#9ccaca", "#5b8f90", "#b9d6cf"][i % 4]; c.globalAlpha = 0.18 + Math.random() * 0.3; c.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 4, 1 + Math.random() * 4); }
  c.globalAlpha = 1; c.strokeStyle = "#cfd8d2"; c.lineWidth = 3;
  for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * s / 4, 0); c.lineTo(i * s / 4, s); c.moveTo(0, i * s / 4); c.lineTo(s, i * s / 4); c.stroke(); } // azulejos de ~3,3 m de mundo
  for (let i = 0; i < 14; i++) { c.fillStyle = "#3d4a2a"; c.globalAlpha = 0.12 + Math.random() * 0.2; c.beginPath(); c.arc(Math.random() * s, Math.random() * s, 4 + Math.random() * 14, 0, 6.3); c.fill(); } // moho
  c.globalAlpha = 1;
});

export function poolBuild() {
  const { x0, x1, z0, z1, hi, lo, r0, r1 } = PIT, GS = HALF * 2 + 700, h = GS / 2, W = x1 - x0, D = z1 - z0;
  // --- Explanada: cuatro tajadas alrededor del pozo (visible + colisionador). Misma textura y detalle que floor(), con UV de mundo.
  const tx = tex("concretePit", concreteTex); tx.uScale = tx.vScale = GS / 18;
  const deckM = surface(pbr("concretePit", { color: "#ffffff", rough: 0.8, tex: tx }), "concrete", Math.round(GS / 4.5));
  for (const [a, b, c, d] of [[-h, h, -h, z0], [-h, h, z1, h], [-h, x0, z0, z1], [x1, h, z0, z1]]) {
    const g = B.MeshBuilder.CreateGround("deck", { width: b - a, height: d - c, subdivisions: Math.max(2, Math.round((b - a) / 14)) }, scene);
    g.position.set((a + b) / 2, 0, (c + d) / 2);
    const p = g.getVerticesData(B.VertexBuffer.PositionKind)!, uv: number[] = [];
    for (let i = 0; i < p.length / 3; i++) uv.push((p[3 * i] + g.position.x + h) / GS, (p[3 * i + 2] + g.position.z + h) / GS);
    g.setVerticesData(B.VertexBuffer.UVKind, uv);
    g.material = deckM; g.receiveShadows = true;
    slab(a, b, c, d, 0);
  }
  // --- Pozo: fondo hondo, bloque de la playa, escalones. Colisionadores invisibles; el azulejo es una sola malla.
  slab(x0, x1, z0, z1, lo);
  hidden(stat(box(50 - x0, hi - lo, D, M.matte("#888"), [0, 0, 0]), B.PhysicsShapeType.BOX, { friction: 0.7 }, [(x0 + 50) / 2, (hi + lo) / 2, 0]));
  const steps: [number, number][] = [[3, -1.25], [6, -2.5], [9, -3.75]]; // [largo desde el borde, nivel de la tapa]: cada contrahuella de 1,25
  for (const [len, top] of steps) hidden(stat(box(len, top - hi, 16, M.matte("#888"), [0, 0, 0]), B.PhysicsShapeType.BOX, { friction: 0.7 }, [x0 + len / 2, (top + hi) / 2, 0]));
  const tile = pbr("tilePit", { color: "#ffffff", rough: 0.3, metal: 0.05, tex: tex("tilePit", tileTex) });
  const grime = M.matte("#2c3a2a"), white = M.matte("#d8e2dc");
  const vis: B.Mesh[] = [
    box(W, 1, D, tile, [(x0 + x1) / 2, lo - 0.5, 0]), // fondo
    box(50 - x0, hi - lo, D, tile, [(x0 + 50) / 2, (hi + lo) / 2, 0]), // playa
    ...steps.map(([len, top]) => box(len, top - hi, 16, tile, [x0 + len / 2, (top + hi) / 2, 0])),
    box(W + 2, -lo, 1, tile, [(x0 + x1) / 2, lo / 2, z0 - 0.5]), box(W + 2, -lo, 1, tile, [(x0 + x1) / 2, lo / 2, z1 + 0.5]), // paredes norte y sur
    box(1, -lo, D, tile, [x0 - 0.5, lo / 2, 0]), box(1, -lo, D, tile, [x1 + 0.5, lo / 2, 0]), // oeste y este
    // Borde de azulejo (labio blanco de 0,5) y marca de nivel de agua sucia
    box(W + 4, 0.5, 2, white, [(x0 + x1) / 2, 0.25, z0 - 1]), box(W + 4, 0.5, 2, white, [(x0 + x1) / 2, 0.25, z1 + 1]),
    box(2, 0.5, D, white, [x0 - 1, 0.25, 0]), box(2, 0.5, D, white, [x1 + 1, 0.25, 0]),
    box(W - 52 + 25, 0.9, 0.15, grime, [(50 + x1) / 2 + 12, -3.5, z0 + 0.1]), box(W - 52 + 25, 0.9, 0.15, grime, [(50 + x1) / 2 + 12, -3.5, z1 - 0.1]), box(0.15, 0.9, D, grime, [x1 - 0.1, -3.5, 0]),
    box(4, 0.2, 4, M.matte("#1a1f1c"), [x1 - 10, lo + 0.1, 0]), // desagüe
  ];
  for (let i = 0; i < 4; i++) vis.push(box(4.2, 0.12, 0.3, M.metal("#6b7075"), [x1 - 10, lo + 0.25, -1.5 + i])); // rejilla
  // Hojas secas y barro en el fondo y la playa (decorado fijo)
  const leaves = [M.matte("#7a5a2a"), M.matte("#5c6b2a"), M.matte("#8a6a34"), M.matte("#4a3a22")];
  for (let i = 0; i < 90; i++) {
    const deep = rng() < 0.65, x = deep ? x1 - 2 - rng() * 62 : x0 + 2 + rng() * 22, z = z0 + 2 + rng() * (D - 4), y = x > r1 || deep ? lo : hi;
    if (deep && x > r0 - 1 && x < r1 + 1) continue; // la rampa no se alfombra
    vis.push(box(0.6 + rng() * 0.8, 0.06, 0.4 + rng() * 0.6, leaves[i % 4], [x, y + 0.04, z], [0, rng() * 6.3, 0]));
  }
  // Flotador desinflado: aro chato rosa y blanco tirado en la parte honda
  vis.push(tor(7, 2.2, M.plastic("#f472b6"), [x1 - 28, lo + 0.5, -18], [0, 0, 0]), tor(7, 2.25, M.plastic("#f5f5f4"), [x1 - 28, lo + 0.52, -18], [0, 0.7, 0], 6));
  // Escalerilla de caño cromado en la pared oeste, junto a los escalones
  for (const dz of [-9, 9]) vis.push(cyl(0.25, 0.25, 3.5, M.metal("#c4c9cf"), [x0 - 1.4, 1.6, dz], undefined, 8), cyl(0.2, 0.2, 5, M.metal("#c4c9cf"), [x0 - 1.4, 3.4, dz], [Math.PI / 2, 0, 0], 8));
  const pit = merge("pozo", vis);
  worldUV(pit, 13.2);
  pit.receiveShadows = true;
  shadows.addShadowCaster(pit);
  occluders.push(pit);
  // Rampa honda (de la parte honda sube a la playa) y rampa de salida al borde norte (de la playa a la explanada)
  const wet = M.matte("#6f9a98");
  ramp(wet, r1, 0, -Math.PI / 2, 24, r1 - r0, hi - lo, 0, 0, lo);
  ramp(wet, 38, z0 + 26, Math.PI, 14, 26, -hi, 0, 0, hi);
  // Charco verde de agua vieja en la parte honda
  decal("charcoPileta", 26, 18, x1 - 20, 16, pbr("pitWater", { color: "#27432f", rough: 0.05, metal: 0.3, alpha: 0.85 }), lo + 0.06);
  // Trampolín roto en la explanada sur: rampa de 3,5 que lanza hacia el pozo (cae en la parte honda); la tabla está partida y el pedestal oxidado
  // Tabla de tablones claros con veta y bandas antideslizantes (antes: plástico blanco liso) + soporte: patas y travesaño bajo el borde alto, tope de resorte al pie
  const tabla = canvasTex(256, (c, s) => {
    c.fillStyle = "#cbb89a"; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? "#d8c7aa" : "#bfa987"; c.fillRect((i * s) / 6, 0, s / 6, s); c.fillStyle = "#6a5638"; c.fillRect((i * s) / 6, 0, 3, s); }
    c.strokeStyle = "#8a7552"; c.globalAlpha = 0.4; for (let i = 0; i < 90; i++) { const x = Math.random() * s; c.beginPath(); c.moveTo(x, Math.random() * s); c.lineTo(x + Math.random() * 3, Math.random() * s); c.stroke(); }
    c.globalAlpha = 1; c.fillStyle = "#4a4a44"; for (let y = 10; y < s; y += 28) c.fillRect(0, y, s, 5); // bandas antideslizantes
  });
  const board = pbr("trampTabla", { color: "#ffffff", rough: 0.6, tex: tabla }), crack = M.matte("#1d2528"), steel = M.metal("#8a4a24");
  const deco = [slopeBoard(6.4, 14, 3.5, board, 0.3), box(6.5, 0.4, 0.5, crack, [0, 1.9, 9], [-Math.atan2(3.5, 14) + 0.05, 0.25, 0]), box(0.4, 1.4, 0.5, steel, [-2.8, 3.2, 14]),
    ...[-3.4, 3.4].flatMap((x) => [cyl(0.28, 0.28, 3.4, steel, [x, 1.7, 13.4], undefined, 8), cyl(0.2, 0.2, 2.6, steel, [x, 1.1, 8], undefined, 8)]), // patas
    box(7, 0.35, 0.35, steel, [0, 3.1, 13.4]), box(7, 0.3, 0.3, steel, [0, 0.9, 8]), // travesaños
    cyl(0.5, 0.5, 0.5, M.metal("#c4c9cf"), [0, 0.25, 0.4], undefined, 10)]; // tope de resorte
  ramp(M.metal("#8a4a24"), x1 - 22, z1 + 30, Math.PI, 6, 14, 3.5, 0, 0, 0, deco);
  // Para la IA, los cofres y el teleportador: el pozo es un obstáculo (nada nace adentro; el auto entra por su cuenta)
  for (const cx of [x0 + 15, (x0 + x1) / 2, x1 - 15]) for (const cz of [-32, 0, 32]) bare.push({ x: cx, z: cz, r: 27 });
}

export function poolLayout() {
  toyRamps(int(1, 2), [0, 1]);
  giantTools();
  paintCans(int(3, 6));
  piles(int(2, 3), ["#d94a3a", "#e0b030", "#3a7bd9", "#4aa860"], (c) => M.plastic(c), 3); // flotadores de colores en pila
  puddles(int(3, 5), pbr("pitPuddle", { color: "#27432f", rough: 0.05, metal: 0.3, alpha: 0.8 }));
  ball();
}
