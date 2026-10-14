import * as B from "@babylonjs/core";
import { box, cyl, merge, sph, tor } from "../models";
import { canvasTex, M, pbr, shadows } from "../render";
import { rng } from "../rng";
import type { Climate } from "../run";
import type { Kind } from "../enemies";
import { HALF, bare, floor, occluders, registerHeavyProp, scene, stat } from "./common";
import { ball, freeSpot, int, piles, puddles, toyRamps } from "../world_layout";

// La cocina (ENCORE y Taller), muebles contra las paredes +z y -x (la cámara de partida mira hacia +z): baldosas en damero, mesadas con alacenas contra dos paredes, heladera, horno encendido, mesa con sillas
// (techo: el auto pasa por abajo) y utensilios gigantes tirados. Mismo tamaño que el desván (half 140, salida (0, 0) libre).
export const KITCHEN_CLIMATE: Climate = { id: "cocina", name: "LUZ DE COCINA", sun: [0.3, -1, 0.25], sunColor: "#ffd3a0", sunI: 2.8, hemiI: 1.3, sky: ["#6a4a3c", "#e8a878", "#ffd9a8", "#7a5a3c"], exposure: 1.05, fog: 0.004, ramp: ["#2a1810", "#c08050", "#fff0d8"] };
export const TABLE_K = { x: 60, z: -55, w: 60, d: 40, h: 30 }; // mesa: centro, ancho, largo, alto de la tapa

// Tabla de aparición de la cocina: multiplica los pesos de spawnTable (enemies.ts) para enemigos EXISTENTES; run_drive.ts la aplica cuando zoneId === "cocina".
// Comunes nuevos con sentido de cocina: brincador (salta muebles), divisor (cucaracha que se parte), ladrón (migas = gemas).
export const KITCHEN_SPAWN: Partial<Record<Kind, number>> = { hormiga: 1.6, mosca: 1.8, babosa: 1.4, polilla: 1.3, escarabajo: 1.3, robot: 0.5, friccion: 0.6, brincador: 1.5, divisor: 1.4, ladron: 1.3 };
type Plague = { mult: Partial<Record<Kind, number>>; from: Partial<Record<Kind, number>> };
/** La plaga de la partida con los pesos de la cocina encima (multiplican). */
export const kitchenPlague = (p?: Plague): Plague => {
  const mult: Partial<Record<Kind, number>> = { ...p?.mult };
  for (const [k, w] of Object.entries(KITCHEN_SPAWN) as [Kind, number][]) mult[k] = w * (p?.mult[k] ?? 1);
  return { from: p?.from ?? {}, mult };
};

// Baldosas en damero crema/terracota (4 por lado de textura) con juntas y desgaste
const tileTex = () => canvasTex(256, (c, s) => {
  const q = s / 4;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? "#E53935" : "#FFF3D6"; c.fillRect(i * q, j * q, q, q); }
  for (let i = 0; i < 3000; i++) { c.fillStyle = ["#00000022", "#ffffff22", "#5a3a2a22"][i % 3]; c.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 3, 1 + Math.random() * 3); }
  c.strokeStyle = "#ffffff"; c.lineWidth = 3;
  for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * q, 0); c.lineTo(i * q, s); c.moveTo(0, i * q); c.lineTo(s, i * q); c.stroke(); }
});

// Thin instances: una malla, muchas matrices (patas de mesa y sillas, asientos, respaldos). Un solo dibujo por familia.
const thin = (m: B.Mesh, mats: B.Matrix[]) => {
  m.thinInstanceAdd(mats);
  m.receiveShadows = true;
  shadows.addShadowCaster(m);
  return m;
};
const T = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0) => B.Matrix.Compose(new B.Vector3(sx, sy, sz), B.Quaternion.FromEulerAngles(0, ry, 0), new B.Vector3(x, y, z));
const hiddenBox = (w: number, h: number, d: number, x: number, y: number, z: number) => (stat(box(w, h, d, M.matte("#555"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, y, z]).isVisible = false);

export function kitchenBuild() {
  floor("kitchenTile", "#ffffff", tileTex, 0.55, "concrete", 18); // baldosa de ~4,5 m (dos autos)
  const paint = M.matte("#FFE082"), band = M.matte("#E53935");
  for (const [x, z, w, d] of [[0, -HALF - 1, HALF * 2 + 4, 2], [HALF + 1, 0, 2, HALF * 2 + 4], [-HALF - 1, 0, 2, HALF * 2 + 4], [0, HALF + 1, HALF * 2 + 4, 2]]) occluders.push(merge("kwall", [box(w, 110, d, paint, [x, 55, z]), box(w + 0.6, 5, d + 0.6, band, [x, 2.5, z])]));

  // Mesadas en L (norte y oeste): bajo mesada con puertas, tapa de granito, alacenas arriba. Una malla por mesada, un colisionador macizo.
  const cab = M.matte("#42A5F5"), top = pbr("granite", { color: "#FFF3D6", rough: 0.35 }), knob = M.metal("#b8bcc2"), D = 26, H = 36;
  const counter = (x0: number, x1: number, alongX: boolean) => {
    const L = x1 - x0, c = (x0 + x1) / 2, at = (u: number, y: number, v: number): [number, number, number] => (alongX ? [u, y, HALF - v] : [-HALF + v, y, u]);
    const sz = (a: number, b: number, d: number): [number, number, number] => (alongX ? [a, b, d] : [d, b, a]);
    const parts = [box(...sz(L, H - 2, D), cab, at(c, (H - 2) / 2, D / 2)), box(...sz(L + 1, 2, D + 2), top, at(c, H - 1, D / 2 + 0.5)), box(...sz(L, 3, D - 3), band, at(c, 1.5, D / 2 - 1.5))];
    for (let u = x0 + 7; u < x1 - 4; u += 14) parts.push(box(...sz(12, H - 8, 0.4), cab, at(u, H / 2, D + 0.2)), box(...sz(3, 0.8, 0.8), knob, at(u, H - 8, D + 0.6))); // puertas y tiradores
    parts.push(box(...sz(L, 26, 14), cab, at(c, 78, 7)), box(...sz(L + 2, 1.6, 15), band, at(c, 64.2, 7.5))); // alacenas: por encima del auto y de la cámara baja
    const m = merge("counter", parts);
    shadows.addShadowCaster(m); m.receiveShadows = true; occluders.push(m);
    const [w, , d] = sz(L, H, D), [cx, , cz] = at(c, 0, D / 2);
    hiddenBox(w, H, d, cx, H / 2, cz);
  };
  counter(-110, 70, true);
  counter(-40, 110, false);

  // Horno en la mesada norte: frente oscuro con la ventana encendida (calor) y anafes arriba
  const ovenX = -20, oz = HALF - D;
  merge("oven", [
    box(30, 30, 1, M.metal("#2b2f36"), [ovenX, 17, oz - 0.6]), box(20, 12, 0.6, M.glow("#ff8a2a"), [ovenX, 16, oz - 1.2]), box(22, 1.4, 1.6, knob, [ovenX, 26, oz - 1.6]),
    ...[[-8, -6], [8, -6], [-8, -18], [8, -18]].map(([dx, dz]) => tor(4, 0.7, M.metal("#1a1a1a"), [ovenX + dx, H + 0.4, oz - dz], undefined, 14)),
  ]);
  // Pileta de lavar con canilla (mesada oeste)
  merge("sink", [box(1, 4, 30, M.metal("#9aa0a6"), [-HALF + D - 13, H + 0.1, 40]), tor(0.9, 0.6, knob, [-HALF + 4, H + 12, 40], [0, 0, Math.PI / 2], 8), cyl(0.9, 0.9, 14, knob, [-HALF + 4, H + 6, 40], undefined, 8)]);

  // Heladera en la esquina noreste: maciza, con puertas, manijas y un imán
  const fx = 105, fz = HALF - 22;
  const fridge = merge("fridge", [
    box(44, 110, 40, M.plastic("#66BB6A"), [0, 55, 0]), box(44.4, 0.8, 40.4, M.matte("#9aa0a6"), [0, 72, 0]),
    box(1.6, 30, 2, knob, [-16, 88, -20.6]), box(1.6, 44, 2, knob, [-16, 46, -20.6]), box(5, 5, 0.6, M.plastic("#d62828"), [8, 92, -20.4]),
  ]);
  fridge.position.set(fx, 0, fz); shadows.addShadowCaster(fridge); occluders.push(fridge);
  hiddenBox(44, 110, 40, fx, 55, fz);

  // Mesa con cuatro sillas. Patas, asientos y respaldos en thin instances; colisionadores invisibles solo en las patas (el auto pasa por abajo).
  const { x: tx, z: tz, w: tw, d: td, h: th } = TABLE_K, wood = pbr("kwood", { color: "#c98a4a", rough: 0.6 });
  const tableTop = box(tw, 2, td, wood, [tx, th + 1, tz]); shadows.addShadowCaster(tableTop); tableTop.receiveShadows = true; occluders.push(tableTop);
  const legs: B.Matrix[] = [], seats: B.Matrix[] = [], backs: B.Matrix[] = [];
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const lx = tx + dx * (tw / 2 - 3), lz = tz + dz * (td / 2 - 3);
    legs.push(T(lx, th / 2, lz, 1, th, 1)); hiddenBox(2.4, th, 2.4, lx, th / 2, lz);
  }
  for (const [dx, dz, ry] of [[0, -1, 0], [0, 1, Math.PI], [-1, 0, Math.PI / 2], [1, 0, -Math.PI / 2]]) {
    const cx = tx + dx * (tw / 2 + 4), cz = tz + dz * (td / 2 + 4), c = Math.cos(ry), s = Math.sin(ry);
    seats.push(T(cx, 17, cz, 1, 1, 1, ry));
    backs.push(T(cx + dx * 7.5, 27, cz + dz * 7.5, 1, 1, 1, ry)); // respaldo del lado de afuera
    for (const [ox, oz] of [[-6.5, -6.5], [6.5, -6.5], [-6.5, 6.5], [6.5, 6.5]]) {
      const lx = cx + ox * c + oz * s, lz = cz - ox * s + oz * c;
      legs.push(T(lx, 8, lz, 0.8, 16, 0.8)); hiddenBox(1.8, 16, 1.8, lx, 8, lz);
    }
  }
  thin(cyl(1, 1, 1, wood, [0, 0, 0], undefined, 8), legs);
  thin(box(16, 1.6, 16, wood, [0, 0, 0]), seats);
  thin(box(16, 18, 1.4, wood, [0, 0, 0]), backs);
  // Lámpara colgante cálida sobre la mesa
  merge("lamp", [cyl(0.3, 0.3, 40, M.matte("#1a1a1a"), [tx, 90, tz], undefined, 4), cyl(4, 12, 8, M.matte("#E53935"), [tx, 68, tz], undefined, 14), sph(3.4, M.glow("#ffd59a"), [tx, 64.5, tz], undefined, 10)]);

  // Tachos de basura a pedal (se abollan al chocarlos: hitHeavyProps). Fijos: heavyProps se vacía al rearmar el mundo, no por partida.
  const binM = M.plastic("#FB8C00");
  for (const [x, z] of [[-HALF + 34, -60], [-HALF + 34, -74], [HALF - 14, -30]]) {
    const b = stat(merge("tacho", [cyl(10, 9, 16, binM, [0, 8, 0], undefined, 14), cyl(10.4, 10.4, 1.2, M.matte("#2b2f36"), [0, 16.4, 0], undefined, 14), box(4, 1, 3, M.matte("#2b2f36"), [0, 0.5, 5.5])]), B.PhysicsShapeType.CYLINDER, {}, [x, 0, z]);
    registerHeavyProp(b, "drum");
    bare.push({ x, z, r: 7 });
  }
}

// Utensilios gigantes tirados en el piso: cuchara, tenedor, espátula y cucharón (obstáculos macizos con casco convexo)
const UTENSILS: (() => B.Mesh)[] = [
  () => merge("cuchara", [cyl(1.2, 1.2, 26, M.metal("#FB8C00"), [-6, 1.2, 0], [0, 0, Math.PI / 2], 8), sph(9, M.metal("#FB8C00"), [12, 1.4, 0], [1.3, 0.3, 1], 12)]),
  () => merge("tenedor", [box(24, 1.4, 2.4, M.metal("#66BB6A"), [-6, 0.7, 0]), box(6, 1.4, 8, M.metal("#66BB6A"), [8, 0.7, 0]), ...[-3, -1, 1, 3].map((dz) => box(9, 1.2, 1, M.metal("#66BB6A"), [15.5, 0.6, dz]))]),
  () => merge("espatula", [cyl(1.6, 1.6, 18, M.plastic("#795548"), [-8, 1.6, 0], [0, 0, Math.PI / 2], 8), box(12, 0.8, 10, M.metal("#FBC02D"), [7, 0.4, 0])]),
  () => merge("cucharon", [cyl(1, 1, 24, M.metal("#8E24AA"), [-6, 1.2, 0], [0, 0, Math.PI / 2], 8), sph(10, M.metal("#8E24AA"), [12, 3, 0], [1, 0.6, 1], 12)]),
];
export function kitchenLayout() {
  toyRamps(int(1, 2), [0, 1]);
  for (const make of UTENSILS) {
    if (rng() < 0.25) continue; // no siempre están todos
    const p = freeSpot(14); if (!p) continue;
    stat(make(), B.PhysicsShapeType.CONVEX_HULL, {}, [p[0], 0, p[1], rng() * 6.3]);
    bare.push({ x: p[0], z: p[1], r: 13 });
  }
  piles(int(2, 3), ["#e0b030", "#d94a3a", "#3a7bd9"], (c) => M.matte(c), 3); // cajas de cereal y de fósforos apiladas
  puddles(int(2, 4), pbr("milk", { color: "#f4f1e8", rough: 0.15, alpha: 0.85 })); // leche derramada
  ball();
}
