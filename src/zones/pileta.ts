import * as B from "@babylonjs/core";
import { box, cyl, merge, sph, tor } from "../models";
import { M, canvasTex, pbr, shadows, surface } from "../render";
import { rng } from "../rng";
import { HALF, bare, decal, occluders, sandTex, scene, stat, tex } from "./common";
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
  c.fillStyle = "#3fb8f0"; c.fillRect(0, 0, s, s);
  for (let i = 0; i < 3500; i++) { c.fillStyle = ["#2aa6e6", "#6fd0fa", "#1e90d0", "#b3e5fc"][i % 4]; c.globalAlpha = 0.18 + Math.random() * 0.3; c.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 4, 1 + Math.random() * 4); }
  c.globalAlpha = 1; c.strokeStyle = "#ffffff"; c.lineWidth = 3;
  for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * s / 4, 0); c.lineTo(i * s / 4, s); c.moveTo(0, i * s / 4); c.lineTo(s, i * s / 4); c.stroke(); } // azulejos de ~3,3 m de mundo
  for (let i = 0; i < 14; i++) { c.fillStyle = "#81D4FA"; c.globalAlpha = 0.12 + Math.random() * 0.2; c.beginPath(); c.arc(Math.random() * s, Math.random() * s, 4 + Math.random() * 14, 0, 6.3); c.fill(); } // moho
  c.globalAlpha = 1;
});

// Juguetes de playa a escala del auto (2-3 m) en la explanada, lejos del pozo y de la salida (0, 0): una malla fusionada, un colisionador invisible por objeto, lugar reservado en `bare`.
function beachToys() {
  const parts: B.Mesh[] = [], R = M.plastic("#E53935"), Y = M.plastic("#FBC02D"), Bl = M.plastic("#42A5F5"), G = M.plastic("#66BB6A"), O = M.plastic("#FB8C00"), P = M.plastic("#8E24AA"), W = M.plastic("#FAFAFA"), sand = M.matte("#E6C27A");
  const put = (x: number, z: number, w: number, h: number, d: number, r: number) => { hidden(stat(box(w, h, d, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, h / 2, z])); bare.push({ x, z, r }); };
  const bucket = (x: number, z: number, c: B.Material, lid: B.Material) => { parts.push(cyl(6, 4.4, 5.2, c, [x, 2.6, z], undefined, 14), tor(6.2, 0.5, lid, [x, 5.1, z], undefined, 14), tor(5.4, 0.4, W, [x, 6, z], [0, 0, 0.0], 8)); put(x, z, 5.6, 5.2, 5.6, 5); };
  const spade = (x: number, z: number, c: B.Material, ry: number) => { parts.push(box(3.2, 0.5, 3.6, c, [x, 0.25, z], [0, ry, 0]), box(0.8, 0.7, 5.6, c, [x + Math.sin(ry) * 4.6, 0.35, z + Math.cos(ry) * 4.6], [0, ry, 0])); put(x, z, 5, 0.7, 5, 5); };
  const ring = (x: number, z: number, c: B.Material, s: B.Material) => { parts.push(tor(6.2, 2.2, c, [x, 1.1, z], undefined, 14), tor(6.25, 2.3, s, [x, 1.12, z], [0, 0.6, 0], 6)); put(x, z, 7, 2.2, 7, 6); };
  const castle = (x: number, z: number) => { parts.push(cyl(5.6, 8, 3, sand, [x, 1.5, z], undefined, 14), cyl(3.6, 5, 2.6, sand, [x, 4.3, z], undefined, 12), cyl(0.2, 2.6, 2.6, sand, [x, 6.9, z], undefined, 10), box(0.15, 1.2, 0.8, R, [x + 0.4, 9.2, z]), box(0.15, 3.4, 0.15, Gy, [x, 8.6, z])); put(x, z, 7, 8, 7, 7); };
  const Gy = M.metal("#9E9E9E");
  bucket(-30, 30, R, Y); bucket(-45, -35, Bl, W); bucket(-80, 15, G, Y);
  spade(-15, -30, Y, 0.4); spade(-55, 40, R, 2.2); spade(-75, -10, P, 4);
  ring(-60, 10, Y, W); ring(-20, -55, O, W);
  parts.push(sph(4.4, R, [10, 2.2, 40], undefined, 8), tor(4.5, 0.5, W, [10, 2.2, 40], [Math.PI / 2, 0, 0], 12), tor(4.5, 0.5, Y, [10, 2.2, 40], [0, 0, 0], 12)); put(10, 40, 4.4, 4.4, 4.4, 5); // pelota
  castle(-35, 55); castle(5, -50); castle(-90, -50);
  parts.push(sph(4, Y, [-70, 2, -30], [1, 0.9, 1.2], 6), sph(2.6, Y, [-70, 4.6, -28.6], undefined, 6), box(1.2, 0.5, 1, O, [-70, 4.5, -27.2]), box(0.5, 0.5, 0.2, M.matte("#222"), [-69.2, 5.1, -27.5])); put(-70, -30, 4.4, 6, 5, 5); // patito
  // Segundo anillo (8-25 u de la salida, bajo < 1,5): conchas, paletas y estrellas de mar, hacia +z y los costados (el pozo empieza en x=25).
  const shell = (x: number, z: number, c: B.Material) => { parts.push(sph(1.1, c, [x, 0.4, z], [1, 0.45, 0.8], 6), box(0.15, 0.5, 1.6, W, [x, 0.3, z], [0, 0.5, 0])); put(x, z, 2, 0.8, 2, 3); };
  const star = (x: number, z: number, c: B.Material) => { for (let a = 0; a < 3; a++) parts.push(box(3, 0.3, 0.7, c, [x, 0.15, z], [0, a * 1.05, 0])); put(x, z, 3, 0.4, 3, 3); };
  shell(-12, 14, W); shell(0, 23, Y); shell(-24, 5, W); shell(-8, 24, O);
  star(11, 13, R); star(-21, 19, O); star(14, 24, P); star(-14, -12, R);
  parts.push(cyl(2.2, 1.6, 1.4, Bl, [18, 0.7, 18], undefined, 10), tor(2.2, 0.25, W, [18, 1.4, 18], undefined, 10)); put(18, 18, 4, 1.4, 4, 3); // baldecito
  parts.push(box(2.4, 0.4, 2.6, G, [-19, 0.2, -10], [0, 0.4, 0]), box(0.5, 0.5, 3, G, [-19, 0.25, -12.6], [0, 0.4, 0])); put(-19, -11, 3.4, 0.5, 4, 4); // palita
  merge("juguetesPileta", parts).receiveShadows = true;
}

export function poolBuild() {
  beachToys();
  const { x0, x1, z0, z1, hi, lo, r0, r1 } = PIT, GS = HALF * 2 + 700, h = GS / 2, W = x1 - x0, D = z1 - z0;
  // --- Explanada: cuatro tajadas alrededor del pozo (visible + colisionador). Misma textura y detalle que floor(), con UV de mundo.
  const tx = tex("sandPit", sandTex); tx.uScale = tx.vScale = GS / 18;
  const deckM = surface(pbr("sandPit", { color: "#ffffff", rough: 0.92, tex: tx }), "concrete", Math.round(GS / 4.5));
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
  // Paredes del pozo (invisibles, 6 de grosor, de bajo el fondo a la explanada) y piso de seguridad lejano: las losas de la explanada miden 2 y el auto las atravesaba.
  const wall = (xa: number, xb: number, za: number, zb: number) => slab(xa, xb, za, zb, 0.5, 0.5 - lo + 4);
  wall(x0 - 6, x1 + 6, z0 - 6, z0); wall(x0 - 6, x1 + 6, z1, z1 + 6); wall(x0 - 6, x0, z0, z1); wall(x1, x1 + 6, z0, z1);
  slab(-h, h, -h, h, -30); // ponytail: red de seguridad bajo el mundo; la caída solo se corta, no se devuelve al auto
  hidden(stat(box(50 - x0, hi - lo, D, M.matte("#888"), [0, 0, 0]), B.PhysicsShapeType.BOX, { friction: 0.7 }, [(x0 + 50) / 2, (hi + lo) / 2, 0]));
  const steps: [number, number][] = [[3, -1.25], [6, -2.5], [9, -3.75]]; // [largo desde el borde, nivel de la tapa]: cada contrahuella de 1,25
  for (const [len, top] of steps) hidden(stat(box(len, top - hi, 16, M.matte("#888"), [0, 0, 0]), B.PhysicsShapeType.BOX, { friction: 0.7 }, [x0 + len / 2, (top + hi) / 2, 0]));
  const tile = pbr("tilePit", { color: "#ffffff", rough: 0.3, metal: 0.05, tex: tex("tilePit", tileTex) });
  const grime = M.matte("#1E88E5"), white = M.matte("#FFF3D6");
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
    box(4, 0.2, 4, M.matte("#1565C0"), [x1 - 10, lo + 0.1, 0]), // desagüe
  ];
  for (let i = 0; i < 4; i++) vis.push(box(4.2, 0.12, 0.3, M.metal("#6b7075"), [x1 - 10, lo + 0.25, -1.5 + i])); // rejilla
  // Hojas secas y barro en el fondo y la playa (decorado fijo)
  const leaves = [M.matte("#FB8C00"), M.matte("#66BB6A"), M.matte("#FBC02D"), M.matte("#E53935")];
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
  const wet = M.matte("#4FC3F7");
  ramp(wet, r1, 0, -Math.PI / 2, 24, r1 - r0, hi - lo, 0, 0, lo);
  ramp(wet, 38, z0 + 26, Math.PI, 14, 26, -hi, 0, 0, hi);
  // Charco verde de agua vieja en la parte honda
  decal("charcoPileta", 26, 18, x1 - 20, 16, pbr("pitWater", { color: "#29B6F6", rough: 0.05, metal: 0.3, alpha: 0.85 }), lo + 0.06);
  // Trampolín roto en la explanada sur: rampa de 3,5 que lanza hacia el pozo (cae en la parte honda); la tabla está partida y el pedestal oxidado
  // Tabla de tablones claros con veta y bandas antideslizantes (antes: plástico blanco liso) + soporte: patas y travesaño bajo el borde alto, tope de resorte al pie
  const tabla = canvasTex(256, (c, s) => {
    c.fillStyle = "#cbb89a"; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? "#d8c7aa" : "#bfa987"; c.fillRect((i * s) / 6, 0, s / 6, s); c.fillStyle = "#6a5638"; c.fillRect((i * s) / 6, 0, 3, s); }
    c.strokeStyle = "#8a7552"; c.globalAlpha = 0.4; for (let i = 0; i < 90; i++) { const x = Math.random() * s; c.beginPath(); c.moveTo(x, Math.random() * s); c.lineTo(x + Math.random() * 3, Math.random() * s); c.stroke(); }
    c.globalAlpha = 1; c.fillStyle = "#4a4a44"; for (let y = 10; y < s; y += 28) c.fillRect(0, y, s, 5); // bandas antideslizantes
  });
  const board = pbr("trampTabla", { color: "#ffffff", rough: 0.6, tex: tabla }), crack = M.matte("#1d2528"), steel = M.metal("#E53935");
  const deco = [slopeBoard(6.4, 14, 3.5, board, 0.3), box(6.5, 0.4, 0.5, crack, [0, 1.9, 9], [-Math.atan2(3.5, 14) + 0.05, 0.25, 0]), box(0.4, 1.4, 0.5, steel, [-2.8, 3.2, 14]),
    ...[-3.4, 3.4].flatMap((x) => [cyl(0.28, 0.28, 3.4, steel, [x, 1.7, 13.4], undefined, 8), cyl(0.2, 0.2, 2.6, steel, [x, 1.1, 8], undefined, 8)]), // patas
    box(7, 0.35, 0.35, steel, [0, 3.1, 13.4]), box(7, 0.3, 0.3, steel, [0, 0.9, 8]), // travesaños
    cyl(0.5, 0.5, 0.5, M.metal("#c4c9cf"), [0, 0.25, 0.4], undefined, 10)]; // tope de resorte
  ramp(M.metal("#E53935"), x1 - 22, z1 + 30, Math.PI, 6, 14, 3.5, 0, 0, 0, deco);
  // Para la IA, los cofres y el teleportador: el pozo es un obstáculo (nada nace adentro; el auto entra por su cuenta)
  for (const cx of [x0 + 15, (x0 + x1) / 2, x1 - 15]) for (const cz of [-32, 0, 32]) bare.push({ x: cx, z: cz, r: 27 });
}

export function poolLayout() {
  toyRamps(int(1, 2), [0, 1]);
  giantTools();
  paintCans(int(3, 6));
  piles(int(2, 3), ["#d94a3a", "#e0b030", "#3a7bd9", "#4aa860"], (c) => M.plastic(c), 3); // flotadores de colores en pila
  puddles(int(3, 5), pbr("pitPuddle", { color: "#29B6F6", rough: 0.05, metal: 0.3, alpha: 0.8 }));
  ball();
}
