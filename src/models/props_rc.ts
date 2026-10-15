import * as B from "@babylonjs/core";
import { box, cyl, merge, rbox, sph, tor } from "../models";
import { M, pbr, shadows } from "../render";
import { rng } from "../rng";
import { HALF, bare, occluders, stat } from "../zones/common";

// Props "RC Race Mini Worlds" (docs/ART_DIRECTION.md Vigente): objetos cotidianos a escala gigante, juguete/diorama.
// Todo el visual es UNA malla fusionada (un dibujo por submalla) + colisionadores invisibles. Registra su huella en `bare` ANTES del layout por semilla
// (decisión del usuario 2026-10-14): nada del layout se superpone, a costa de que el layout de cada semilla cambie respecto de antes.
const C = { rojo: "#E53935", amarillo: "#FBC02D", azul: "#42A5F5", verde: "#66BB6A", naranja: "#FB8C00", marron: "#795548" };
const P = (c: string, rough = 0.5, metal = 0) => pbr(`rc${c}${rough}${metal}`, { color: c, rough, metal });

// k: escala de pista (el auto RC mide ~2 x 1,6): las piezas se modelan en unidades grandes y put() las achica; los colisionadores usan la misma k
type Prop = { parts: B.Mesh[]; r: number; k?: number; col?: (x: number, z: number, ry: number) => void };
const wood = () => P("#B07A4A", 0.7), woodD = () => P(C.marron, 0.75);

// Caja de herramientas (ref24): cuerpo rojo, tapa más oscura, esquineros metálicos grises, manija negra y dos trabas
const toolbox = (k = 0.17): Prop => {
  const gm = P("#9E9E9E", 0.3, 1), blk = P("#1c1c1e", 0.6), parts: B.Mesh[] = [rbox(12, 3.6, 5, 0.4, P(C.rojo, 0.45), [0, 1.8, 0]), rbox(12.2, 1.4, 5.2, 0.5, P("#B71C1C", 0.45), [0, 4.3, 0])];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(box(0.9, 3.9, 0.9, gm, [sx * 5.85, 1.95, sz * 2.45]), box(0.95, 1.5, 0.95, gm, [sx * 5.9, 4.3, sz * 2.5]));
  parts.push(box(5, 0.5, 0.5, blk, [0, 5.6, 0]), box(0.5, 1.5, 0.5, blk, [-2.4, 5.0, 0]), box(0.5, 1.5, 0.5, blk, [2.4, 5.0, 0]));
  for (const x of [-3.5, 3.5]) parts.push(box(1.3, 1.2, 0.35, gm, [x, 3.4, 2.7]), box(0.9, 0.5, 0.35, blk, [x, 4.0, 2.75]));
  return { r: 7, k, parts, col: (x, z, ry) => stat(box(12 * k, 5 * k, 5 * k, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, 2.5 * k, z, ry]).isVisible = false };
};

// Palet (ref22): 3 travesaños abajo, 9 tacos, 3 tablones arriba; 8 x 1,4 x 7
const pallet = (k = 0.35): Prop => {
  const parts: B.Mesh[] = [];
  for (const z of [-3, 0, 3]) {
    parts.push(rbox(8, 0.4, 1.3, 0.08, woodD(), [0, 0.2, z]), rbox(8, 0.3, 2.2, 0.08, wood(), [0, 1.25, z * 0.87]));
    for (const x of [-3.2, 0, 3.2]) parts.push(box(1.3, 0.7, 1.3, woodD(), [x, 0.75, z]));
  }
  return { parts, r: 5.5, k, col: (x, z, ry) => stat(box(8 * k, 1.4 * k, 7 * k, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, 0.7 * k, z, ry]).isVisible = false };
};

const crate = (s = 3, k = 0.5): Prop => ({
  r: s * 0.9, k,
  parts: [rbox(s, s, s, 0.2, wood(), [0, s / 2, 0]), ...[-1, 1].flatMap((k) => [box(s + 0.1, 0.35, 0.35, woodD(), [0, s / 2, k * s * 0.4]), box(0.35, s + 0.1, 0.35, woodD(), [k * s * 0.4, s / 2, 0])])],
  col: (x, z, ry) => stat(box(s * k, s * k, s * k, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, (s * k) / 2, z, ry]).isVisible = false,
});

const barrel = (c: string, k = 0.36): Prop => ({
  r: 4.5, k,
  parts: [cyl(3.2, 3.2, 4.4, P(c, 0.45), [0, 2.2, 0], undefined, 16), ...[1, 3.3].map((y) => tor(3.3, 0.18, P("#FAFAFA", 0.5), [0, y, 0], undefined, 16)), cyl(3, 3, 0.15, P("#9E9E9E", 0.4, 0.8), [0, 4.45, 0], undefined, 16)],
  col: (x, z) => stat(cyl(3.2 * k, 3.2 * k, 4.4 * k, M.matte("#000"), [0, 0, 0], undefined, 12), B.PhysicsShapeType.CYLINDER, {}, [x, 2.2 * k, z]).isVisible = false,
});

const tires = (n: number, k = 0.25): Prop => ({
  r: 6.5, k,
  parts: Array.from({ length: n }, (_, i) => tor(4.2, 1.5, P(i % 2 ? C.amarillo : C.rojo, 0.55), [0, 0.75 + i * 1.4, 0], undefined, 14)),
  col: (x, z) => stat(cyl(5 * k, 5 * k, 1.4 * n * k, M.matte("#000"), [0, 0, 0], undefined, 10), B.PhysicsShapeType.CYLINDER, {}, [x, 0.7 * n * k, z]).isVisible = false,
});

const rock = (r: number): Prop => ({
  r: r * 2.4,
  parts: [sph(r * 2, P("#9E9E9E", 0.85), [0, r * 0.55, 0], [1.1, 0.7, 0.9], 4), sph(r * 1.2, P("#8a8a8a", 0.9), [r * 0.7, r * 0.3, r * 0.3], [1, 0.7, 1], 4)],
  col: (x, z) => stat(sph(r * 2, M.matte("#000"), [0, 0, 0], [1.1, 0.7, 0.9], 4), B.PhysicsShapeType.CONVEX_HULL, {}, [x, r * 0.55, z]).isVisible = false,
});

// Cono de obra (ref11): cuerpo naranja con dos franjas blancas, boca oscura arriba y base cuadrada negra más ancha. Cuerpo: diámetro 2 abajo (y 0,3) a 0,5 arriba (y 3,5)
const cone = (k = 0.46): Prop => {
  const dia = (y: number) => 2 - (1.5 * (y - 0.3)) / 3.2, band = (y0: number, y1: number) => cyl(dia(y1) + 0.08, dia(y0) + 0.08, y1 - y0, P("#FAFAFA", 0.5), [0, (y0 + y1) / 2, 0], undefined, 12);
  return {
    r: 2.5, k,
    parts: [rbox(3.2, 0.3, 3.2, 0.12, P("#1c1c1c", 0.8), [0, 0.15, 0]), cyl(1.7, 2.2, 0.3, P(C.naranja, 0.45), [0, 0.45, 0], undefined, 12), cyl(0.5, 2, 3.2, P(C.naranja, 0.45), [0, 1.9, 0], undefined, 12), band(0.85, 1.45), band(1.95, 2.55), cyl(0.34, 0.34, 0.05, P("#1c1c1c", 0.8), [0, 3.5, 0], undefined, 10)],
    col: (x, z) => stat(cyl(0.8 * k, 2 * k, 3.4 * k, M.matte("#000"), [0, 0, 0], undefined, 8), B.PhysicsShapeType.CYLINDER, {}, [x, 1.7 * k, z]).isVisible = false,
  };
};

// Rampa de salto de madera (ref10): cuarto de tubo de 7 tablones en dos tonos sobre costillas, caballete atrás con travesaños y bulones. Sube hacia +x; 4 x 3 x 1,5 (k=1)
// ponytail: el colisionador es solo la caja del caballete (la curva es visual, el auto la atraviesa); inclinado necesitaría rotación completa en stat()
const woodRamp = (k = 1): Prop => {
  const parts: B.Mesh[] = [], R = 6.1, th = 0.717, N = 10, pt = (t: number): [number, number] => [-2 + R * Math.sin(t) - 0.0, R * (1 - Math.cos(t))];
  const wa = P("#B07A4A", 0.7), wb = P("#8C5A32", 0.7), dk = P("#5a3a20", 0.75), bolt = P("#2a2a2c", 0.5, 0.6);
  for (let i = 0; i < N; i++) {
    const t0 = (i / N) * th, t1 = ((i + 1) / N) * th, [x0, y0] = pt(t0), [x1, y1] = pt(t1), tm = (t0 + t1) / 2;
    parts.push(rbox(Math.hypot(x1 - x0, y1 - y0) + 0.1, 0.2, 3, 0.05, i % 2 ? wb : wa, [(x0 + x1) / 2 + Math.sin(tm) * 0.1, (y0 + y1) / 2 - Math.cos(tm) * 0.1, 0], [0, 0, tm]));
    for (const z of [-1.45, 1.45]) parts.push(rbox(Math.hypot(x1 - x0, y1 - y0) + 0.05, 0.4, 0.2, 0.05, dk, [(x0 + x1) / 2 + Math.sin(tm) * 0.3, (y0 + y1) / 2 - Math.cos(tm) * 0.3, z], [0, 0, tm]));
  }
  parts.push(rbox(0.7, 0.2, 3, 0.06, wa, [2.15, 1.4, 0])); // tablero plano arriba
  for (const z of [-1.4, 1.4]) {
    parts.push(rbox(0.3, 1.5, 0.25, 0.05, wa, [2.2, 0.75, z]), rbox(3, 0.25, 0.25, 0.05, dk, [0.9, 0.12, z]), box(1.8, 0.2, 0.2, dk, [1.4, 0.7, z], [0, 0, 0.65]));
    parts.push(box(0.15, 0.18, 0.18, bolt, [2.36, 1.2, z]), box(0.15, 0.18, 0.18, bolt, [2.36, 0.25, z]));
  }
  parts.push(rbox(0.25, 0.25, 3, 0.05, dk, [2.2, 0.15, 0]), rbox(0.25, 0.25, 3, 0.05, dk, [2.2, 1.3, 0]));
  return { r: 3.2, k, parts, col: (x, z, ry) => stat(box(0.8 * k, 1.5 * k, 3 * k, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x + Math.cos(ry) * 2.2 * k, 0.75 * k, z - Math.sin(ry) * 2.2 * k, ry]).isVisible = false };
};

// Valla de juguete: postes y travesaños pintados (rojo/blanco/azul/amarillo según x), nada de madera cruda
const fence = (c = C.rojo, k = 0.36): Prop => ({
  r: 5, k,
  parts: [...[-3.6, 0, 3.6].map((x) => rbox(0.8, 5, 0.8, 0.15, P(x ? "#FAFAFA" : c, 0.45), [x, 2.5, 0])), ...[1.6, 3.6].map((y) => rbox(8, 0.9, 0.35, 0.1, P(y > 2 ? c : "#FAFAFA", 0.45), [0, y, 0.45]))],
  col: (x, z, ry) => stat(box(8 * k, 5 * k, 0.9 * k, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, 2.5 * k, z, ry]).isVisible = false,
});

const plant = (): Prop => ({
  r: 4.5,
  parts: [cyl(3.4, 2.4, 3, P("#C0623B", 0.7), [0, 1.5, 0], undefined, 10), tor(3.5, 0.3, P("#A9502F", 0.7), [0, 3, 0], undefined, 10), ...[0, 1, 2, 3, 4].map((k) => sph(2.4, P(k % 2 ? C.verde : "#4CAF50", 0.6), [Math.cos(k * 1.26) * 1.1, 4.3 + (k % 2) * 0.6, Math.sin(k * 1.26) * 1.1], [1, 1.3, 1], 4))],
  col: (x, z) => stat(cyl(3.4, 2.4, 3, M.matte("#000"), [0, 0, 0], undefined, 8), B.PhysicsShapeType.CYLINDER, {}, [x, 1.5, z]).isVisible = false,
});

const pine = (h = 16): Prop => ({
  r: 4,
  parts: [cyl(1.2, 1.6, h * 0.25, P(C.marron, 0.9), [0, h * 0.125, 0], undefined, 8), ...[0, 1, 2].map((k) => cyl(0.2, 7 - k * 1.8, h * 0.4, P(k % 2 ? C.verde : "#4CAF50", 0.7), [0, h * 0.3 + k * h * 0.22 + h * 0.2, 0], undefined, 8))],
  col: (x, z) => stat(cyl(1.4, 1.6, h * 0.5, M.matte("#000"), [0, 0, 0], undefined, 8), B.PhysicsShapeType.CYLINDER, {}, [x, h * 0.25, z]).isVisible = false,
});

const doghouse = (): Prop => ({
  r: 8,
  parts: [
    rbox(9, 5.5, 8, 0.4, P(C.rojo, 0.5), [0, 2.75, 0]),
    box(10.4, 0.5, 5.2, P(C.marron, 0.7), [0, 7, -2.1], [0.8, 0, 0]), // faldón trasero
    box(10.4, 0.5, 5.2, P(C.marron, 0.7), [0, 7, 2.1], [-0.8, 0, 0]),
    box(3, 3.6, 0.3, M.matte("#2b1d17"), [0, 1.8, 4.1]), cyl(3, 3, 0.3, M.matte("#2b1d17"), [0, 3.6, 4.1], [Math.PI / 2, 0, 0], 12),
    box(9.4, 0.5, 8.4, P("#FAFAFA", 0.6), [0, 0.25, 0]),
  ],
  col: (x, z, ry) => stat(box(9, 8, 8, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, 4, z, ry]).isVisible = false,
});

// Láminas RC Race: pila de neumáticos negros con tacos, barrera de flechas, banderines entre postes, torre de agua
// Neumático de prop (ref117/ref76): toro de cuerpo redondeado (tubo 0,29 del diámetro: el hueco central se ve desde arriba), banda de tacos en bloque
// y aro de polvo marrón arriba para que se lea el volumen. v: 0 negro, 1 rojo, 2 gris. s escala (5,7 = diámetro total original); ~330 triángulos con tacos y aro.
// Con `up` el neumático está de pie (eje en z). tacos=0 omite la banda y el aro (versión barata para los muros).
const TIRE: [string, string][] = [["#1c1c1c", "#262626"], ["#C62828", "#8E1B1B"], ["#8a8a8a", "#6f6f6f"]];
const tire = (v: number, x: number, y: number, z: number, s = 1, a0 = 0, tacos = 10, up = false): B.Mesh[] => {
  const [c, cb] = TIRE[v], m = P(c, 0.9), mb = P(cb, 0.9), dust = P("#6b5340", 0.95), R = 2.85 * s, h = 1.6 * s;
  const out = [tor(4.1 * s, h, m, [x, y, z], up ? [Math.PI / 2, 0, 0] : undefined, 12)];
  if (!tacos) return out;
  for (let k = 0; k < tacos; k++) {
    const a = a0 + (k * Math.PI * 2) / tacos, ca = Math.cos(a), sa = Math.sin(a);
    out.push(box(0.55 * s, 0.9 * s, 0.9 * s, mb, up ? [x + ca * R, y + sa * R, z] : [x + ca * R, y, z + sa * R], up ? [0, 0, a] : [0, -a, 0]));
  }
  out.push(tor(3.5 * s, 0.3 * s, dust, [x, y + (up ? 0 : h * 0.43), z + (up ? h * 0.43 : 0)], up ? [Math.PI / 2, 0, 0] : undefined, 6)); // aro de polvo
  return out;
};
const tireStack = (n: number, k = 0.25, red = false): Prop => ({
  r: 6, k,
  parts: Array.from({ length: n }, (_, i) => tire(red && i % 2 === 0 ? 1 : i % 3 === 2 ? 2 : 0, 0, 0.75 + i * 1.5, 0, 1, i * 0.4)).flat(),
  col: (x, z) => stat(cyl(5 * k, 5 * k, 1.5 * n * k, M.matte("#000"), [0, 0, 0], undefined, 10), B.PhysicsShapeType.CYLINDER, {}, [x, 0.75 * n * k, z]).isVisible = false,
});

// Neumático de pie semienterrado (borde de camino): sin colisionador, solo visual
const tireHalf = (red = false): Prop => ({ r: 2, k: 0.4, parts: tire(red ? 1 : 0, 0, 0.6, 0, 1, 0, 10, true) });

// Barrera metálica (ref21): viga con franjas rojas y blancas, patas en escuadra (pie + riostra) y bulones; k=1/3 la deja en 3 x 1,2
const metalBarrier = (k = 1 / 3): Prop => {
  const parts: B.Mesh[] = [], gm = P("#9E9E9E", 0.35, 0.9), bolt = P("#2a2a2c", 0.5, 0.6);
  for (let i = 0; i < 6; i++) parts.push(rbox(1.5, 1.5, 0.6, 0.08, P(i % 2 ? "#FAFAFA" : C.rojo, 0.5), [-3.75 + i * 1.5, 3.1, 0]));
  for (const sx of [-1, 1]) {
    parts.push(box(0.5, 2.4, 0.5, gm, [sx * 3.8, 1.2, 0]), box(0.6, 0.35, 2.8, gm, [sx * 3.8, 0.18, 0]), box(0.25, 1.7, 0.25, gm, [sx * 3.8, 1.0, 0.7], [0.75, 0, 0]), box(0.25, 1.7, 0.25, gm, [sx * 3.8, 1.0, -0.7], [-0.75, 0, 0]));
    for (const z of [-1, 1]) parts.push(box(0.35, 0.35, 0.15, bolt, [sx * 3.8, 0.4, z * 1.2]), box(0.35, 0.2, 0.2, bolt, [sx * 3.8, 2.3, z * 0.3]));
  }
  return { r: 5.5, k, parts, col: (x, z, ry) => stat(box(9 * k, 3.6 * k, 1 * k, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, 1.8 * k, z, ry]).isVisible = false };
};

// Arco de largada (ref20/23): dos postes de madera con cartel de damero; ancho 40 a lo largo de x local. Colisionador solo en los postes
const startArch = (k = 0.65): Prop => {
  const parts: B.Mesh[] = [rbox(37, 4.8, 0.6, 0.1, P("#FAFAFA", 0.5), [0, 13, 0]), rbox(37.6, 0.5, 0.9, 0.05, woodD(), [0, 15.5, 0]), rbox(37.6, 0.5, 0.9, 0.05, woodD(), [0, 10.5, 0])], blk = P("#1c1c1e", 0.5);
  for (const s of [-1, 1]) {
    parts.push(rbox(1.6, 16, 1.6, 0.15, woodD(), [s * 18.8, 8, 0]), rbox(3, 0.8, 3, 0.1, P("#4E342E", 0.7), [s * 18.8, 0.4, 0]), box(0.4, 3, 0.4, woodD(), [s * 17.2, 11, 0], [0, 0, s * 0.7]));
    for (const f of [-1, 1]) parts.push(box(0.3, 0.3, 0.2, P("#9E9E9E", 0.3, 1), [s * 18.8, 14.5, f * 0.85]));
  }
  for (let c = 0; c < 24; c++) for (let r = 0; r < 3; r++) if ((c + r) % 2) for (const f of [-1, 1]) parts.push(box(1.5, 1.5, 0.1, blk, [-17.25 + c * 1.5, 11.5 + r * 1.5, f * 0.33]));
  return { r: 21, k, parts, col: (x, z, ry) => { for (const s of [-18.8, 18.8]) stat(box(1.6 * k, 16 * k, 1.6 * k, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x + Math.cos(ry) * s * k, 8 * k, z - Math.sin(ry) * s * k, ry]).isVisible = false; } };
};

// Gradas de madera (ref20, abajo a la derecha): 4 escalones sobre soportes con barandas; frente a +z, sube hacia -z; 14 x 6 x 10
const bleachers = (k = 0.5): Prop => {
  const parts: B.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const h = (i + 1) * 1.5, z = 3.75 - i * 2.5;
    parts.push(rbox(14, 0.4, 2.5, 0.08, i % 2 ? wood() : woodD(), [0, h, z]), box(14, h, 0.3, woodD(), [0, h / 2, z + 1.1]));
  }
  for (const x of [-6.8, 0, 6.8]) parts.push(box(0.5, 6, 0.5, woodD(), [x, 3, -5.6]), box(0.4, 3, 0.4, woodD(), [x, 1.5, 3.2]));
  for (const s of [-1, 1]) parts.push(box(0.3, 0.3, 11, wood(), [s * 7, 4.2, -0.8], [0.5, 0, 0]), box(0.3, 4, 0.3, wood(), [s * 7, 2.2, 4.8]), box(0.3, 2, 0.3, wood(), [s * 7, 1, -5.4]));
  parts.push(box(14, 0.3, 0.3, wood(), [0, 7.5, -5.6]));
  return { r: 9, k, parts, col: (x, z, ry) => stat(box(14 * k, 6 * k, 10 * k, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, 3 * k, z, ry]).isVisible = false };
};

// Dos postes de madera y cuerda con banderines; el colisionador son solo los postes. Ancho 18 a lo largo de x local
const bunting = (k = 0.4): Prop => {
  const cols = [C.rojo, C.amarillo, C.azul, C.verde, C.naranja], parts: B.Mesh[] = [];
  for (const s of [-9, 9]) parts.push(cyl(0.6, 0.8, 12, woodD(), [s, 6, 0], undefined, 8), box(1.8, 0.5, 0.5, woodD(), [s, 11, 0]));
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, x = -9 + 18 * t, y = 10.6 - Math.sin(t * Math.PI) * 2.2;
    parts.push(box(1.6, 0.12, 0.12, P("#3E2723", 0.8), [x, y, 0]));
    if (i % 1 === 0 && i < 12) parts.push(box(1, 1.3, 0.1, P(cols[i % 5], 0.55), [x + 0.8, y - 0.75, 0], [0, 0, 0.12 * (i % 2 ? 1 : -1)]));
  }
  return { r: 11, k, parts, col: (x, z, ry) => { for (const s of [-9, 9]) stat(cyl(0.8 * k, 0.8 * k, 12 * k, M.matte("#000"), [0, 0, 0], undefined, 6), B.PhysicsShapeType.CYLINDER, {}, [x + Math.cos(ry) * s * k, 6 * k, z - Math.sin(ry) * s * k]).isVisible = false; } };
};

// Torre de agua de madera (fuera de la valla, solo visual)
const waterTower = (): B.Mesh[] => {
  const w = woodD(), parts: B.Mesh[] = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) parts.push(box(1.8, 36, 1.8, w, [sx * 7.5, 18, sz * 7.5], [-sz * 0.07, 0, sx * 0.07]));
  for (const y of [8, 18, 28]) for (const s of [-1, 1]) parts.push(box(17 - y * 0.18, 1, 1, w, [0, y, s * (7.5 - y * 0.05)]), box(1, 1, 17 - y * 0.18, w, [s * (7.5 - y * 0.05), y, 0]));
  parts.push(cyl(12, 12, 16, wood(), [0, 44, 0], undefined, 14), ...[39, 44, 49].map((y) => tor(24.4, 0.7, P("#4E342E", 0.6), [0, y, 0], undefined, 14)), cyl(0, 13.5, 8, P(C.rojo, 0.5), [0, 56, 0], undefined, 14), cyl(0.5, 0.5, 6, P("#9E9E9E", 0.4, 0.8), [0, 62, 0], undefined, 6));
  return parts;
};

// Kit de bordes (ref68): siluetas oscuras continuas de primer plano. Medidas reales (k=1): neumático ~1,4, barrera 1,6 x 1.
const yelS = () => P("#C9A227", 0.6);
const boxCol = (w: number, h: number, d: number) => (x: number, z: number, ry: number) => stat(box(w, h, d, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, h / 2, z, ry]).isVisible = false;
/** Muro de neumáticos apilados de a 3, estacas amarillas cada 2 pilas. Largo a lo largo de x local. */
const tireWall = (len: number): Prop => {
  const parts: B.Mesh[] = [], n = Math.round(len / 1.45);
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 1.45;
    for (let j = 0; j < 3; j++) parts.push(...tire((i + j) % 5 === 4 ? 1 : (i * 3 + j) % 7 === 5 ? 2 : 0, x, 0.25 + j * 0.5, 0, 0.245, i + j, j === 2 ? 8 : 0)); // solo el de arriba lleva tacos y aro
    if (i % 2 === 0) parts.push(box(0.28, 2.0, 0.28, i % 4 ? yelS() : P(C.amarillo, 0.6), [x + 0.72, 1.0, 0.8]));
  }
  return { parts, r: len / 2, col: boxCol(n * 1.45, 1.5, 1.4) };
};
/** Bloque New Jersey (base ancha, cuerpo inclinado), rojo o blanco, 2 huecos arriba. Largo 1,6 a lo largo de x local. */
const jerseyBarrier = (red: boolean): Prop => {
  const c = P(red ? C.rojo : "#F2F2F2", 0.5), d = P("#1a1a1c", 0.7);
  return { r: 1, col: boxCol(1.6, 1, 0.7), parts: [rbox(1.6, 0.35, 0.7, 0.08, c, [0, 0.175, 0]), rbox(1.55, 0.4, 0.5, 0.08, c, [0, 0.55, 0]), rbox(1.5, 0.3, 0.3, 0.08, c, [0, 0.85, 0]), ...[-0.4, 0.4].map((x) => cyl(0.24, 0.24, 0.04, d, [x, 1.0, 0], undefined, 8))] };
};
/** Cartel de chevrons amarillo y negro sobre dos postes, cara hacia +z local. Ancho 4. */
const chevronSign = (): Prop => {
  const bk = P("#17171a", 0.6), y = P(C.amarillo, 0.55), parts: B.Mesh[] = [rbox(4, 1.5, 0.15, 0.05, bk, [0, 1.4, 0]), ...[-1.7, 1.7].map((x) => box(0.2, 2.2, 0.2, yelS(), [x, 1.1, -0.15]))];
  for (const x of [-1.2, 0, 1.2]) for (const s of [-1, 1]) parts.push(box(0.3, 0.8, 0.05, y, [x - 0.3 * 0 + 0.0, 1.4 + s * 0.28, 0.1], [0, 0, -s * 0.9]));
  return { parts, r: 2.2, col: boxCol(4, 2.4, 0.4) };
};
/** Reflector en trípode: patas amarillas, mástil gris y foco ámbar emisivo. */
const floodlight = (): Prop => {
  const parts: B.Mesh[] = [cyl(0.1, 0.1, 3.2, P("#8a8d91", 0.4, 0.8), [0, 2.0, 0], undefined, 6), box(0.8, 0.7, 0.5, P("#2a2a2e", 0.5), [0, 3.7, 0]), box(0.6, 0.5, 0.1, M.glow("#ffb02e"), [0, 3.7, 0.3])];
  for (let i = 0; i < 3; i++) { const a = i * 2.094; parts.push(box(0.1, 2.2, 0.1, yelS(), [Math.sin(a) * 0.55, 1.0, Math.cos(a) * 0.55], [Math.cos(a) * 0.45, 0, -Math.sin(a) * 0.45])); }
  return { parts, r: 1.2, col: boxCol(1.2, 3.5, 1.2) };
};

/** Patio: coloca los props en posiciones fijas (lejos de rects, posibles esquinas de pileta y spawn). x, z, ry. */
export function buildRcProps() {
  const parts: B.Mesh[] = [];
  const put = (p: Prop, x: number, z: number, ry = 0, y = 0) => {
    const k = p.k ?? 1, S = B.Matrix.Scaling(k, k, k), R = B.Matrix.RotationY(ry), T = B.Matrix.Translation(x, y, z);
    const sc = new B.Vector3(), q = new B.Quaternion(), pos = new B.Vector3();
    for (const m of p.parts) {
      m.computeWorldMatrix(true).multiply(S).multiply(R).multiply(T).decompose(sc, q, pos);
      m.scaling.copyFrom(sc); m.rotationQuaternion = q; m.position.copyFrom(pos);
      parts.push(m);
    }
    p.col?.(x, z, ry);
    bare.push({ x, z, r: p.r * k });
  };
  put(toolbox(), 30, 100, 0.4);
  put(pallet(), -30, 110, 0.2); put(pallet(), -30, 110, 0.7, 0.5); put(crate(3), -26, 108, 0.5, 1);
  put(pallet(), -8, 125, -0.3); put(crate(3), -6, 124, 0.2, 0.5); put(crate(2.4), -10, 127, 1.1, 0.5);
  put(barrel(C.azul), 100, 60); put(barrel(C.rojo), 104, 63); put(barrel(C.azul), 101, 67);
  put(barrel(C.rojo), -110, -20); put(barrel(C.azul), -113, -17);
  for (let i = 0; i < 10; i++) put(cone(), -14 + i * 3.2, 62 - i * 1.2 + (i % 2) * 1.5);
  put(tires(3), -20, -100); put(tires(2), -18, -102);
  put(doghouse(), 115, -90, -0.5);
  for (let i = 0; i < 3; i++) put(fence([C.rojo, C.azul, C.amarillo][i]), 60 + i * 3.4, -105);
  put(rock(4), 130, 20); put(rock(3), 126, 25, 1); put(rock(5), -120, -40); put(rock(2.5), 40, 135);
  put(plant(), -5, 95); put(plant(), 60, -70); put(plant(), 140, 100);
  for (const [x, z] of [[-125, 90], [125, 110], [-130, -60], [130, -60]] as const) put(pine(16 + (x + z) % 5), x, z);
  // Densidad a lo largo de los caminos de tierra (mismos [x, z, ancho, largo, ángulo] que `grassPaths` de zones/patio.ts), fuera de los bordillos, y un anillo suelto por el pasto
  const PATHS = [[-33, 10, 16, 38, 2.11], [-1, 16, 12.5, 48, 0.87], [33, 38.5, 14, 38, 1.16], [-7, 1, 11, 37, -0.49]] as const;
  const kinds = [() => tireStack(2 + (n % 3), 0.25, n % 2 === 0), metalBarrier, () => barrel(C.azul), cone, () => tireStack(2, 0.25, true), toolbox, metalBarrier, () => crate(2.6), () => fence(C.amarillo), () => barrel(C.rojo)];
  let n = 0;
  for (const [x, z, w0, len, a] of PATHS) {
    const w = w0 * 2.1; // mismo ancho que patio.ts
    const dx = Math.sin(a), dz = Math.cos(a), nx = Math.cos(a), nz = -Math.sin(a);
    for (const s of [-1, 1]) for (let t = -len * 0.45; t <= len * 0.45; t += 6, n++) {
      const off = s * (w / 2 + 9 + (n % 3) * 1.2), px = x + dx * t + nx * off, pz = z + dz * t + nz * off; // +9 (antes +5): con +5 quedaban pasillos de 2-5 m contra muros de neumáticos y barreras donde el auto se trababa (sim semilla 17)
      if (Math.hypot(px, pz) < 16 || Math.abs(px) > 130 || Math.abs(pz) > 130) continue;
      if (n % 2) { const q = off - s * 2.6; put(tireHalf(n % 4 === 1), x + dx * t + nx * q, z + dz * t + nz * q, a + Math.PI / 2); }
      put(kinds[n % kinds.length](), px, pz, n % 3 === 1 ? a - Math.PI / 2 : n * 1.3);
    }
  }
  // Tramos cortos visibles desde la cámara de partida (autorizado romper la regla de 16): costados y adelante, frente libre |x| < 8
  put(tireWall(7), -11.5, 13, -Math.PI / 2); put(tireWall(6), 12, 19, -Math.PI / 2);
  for (let i = 0; i < 4; i++) put(jerseyBarrier(i % 2 === 0), 11.5, 7.5 + i * 1.7, -Math.PI / 2);
  // Bordes (ref68/ref70): muro de neumáticos por fuera, barreras por dentro, carteles de chevrons y reflectores
  PATHS.forEach(([x, z, w0, len, a], pi) => {
    const w = w0 * 2.1, dx = Math.sin(a), dz = Math.cos(a), nx = Math.cos(a), nz = -Math.sin(a);
    const at = (t: number, off: number) => [x + dx * t + nx * off, z + dz * t + nz * off] as const, ok = (px: number, pz: number) => Math.hypot(px, pz) >= 16 && Math.abs(px) < 130 && Math.abs(pz) < 130;
    const so = pi % 2 ? 1 : -1; // lado exterior del tramo
    for (const t of [-len * 0.42, -len * 0.2, len * 0.02, len * 0.24, len * 0.44]) { const [px, pz] = at(t, so * (w / 2 + 2.6)); if (ok(px, pz)) put(tireWall(8 + ((pi + Math.round(t)) % 3 + 3 * 0) * 3), px, pz, a - Math.PI / 2); }
    for (let i = 0; i < 12; i++) { const [px, pz] = at(-len * 0.4 + i * 3.6 + (i > 5 ? 8 : 0), -so * (w / 2 + 2.2)); if (ok(px, pz)) put(jerseyBarrier((i + pi) % 2 === 0), px, pz, a - Math.PI / 2); } // huecos de 2 m: con 1,7 m las barreras formaban una pared continua y el auto quedaba encajonado contra los props (sim semillas 2/13/17)
    if (pi !== 3) { const [px, pz] = at(len * 0.32, so * (w / 2 + 1.8)); if (ok(px, pz)) put(chevronSign(), px, pz, Math.atan2(-so * nx, -so * nz)); }
    if (pi < 3) { const [px, pz] = at(-len * 0.1, -so * (w / 2 + 9)); if (ok(px, pz)) put(floodlight(), px, pz); }
  });
  for (const [x, z, ry] of [[-40, 45, 0.5], [30, -10, -0.3], [-60, -15, 1.2], [60, 25, 0.1], [0, 75, 0.2], [15, -45, -0.6], [-35, 80, 0.4], [75, -35, 1.5]] as const) put(bunting(), x, z, ry);
  for (const [x, z] of [[-80, 50], [85, 70], [-90, -70], [90, -20], [10, -85], [-55, 100], [55, 105], [-100, 10], [105, 25], [-25, -60], [45, -60], [0, 40]] as const) put([() => tireStack(4, 0.25, true), metalBarrier, toolbox, () => barrel(C.azul)][(x + z + 400) % 4](), x, z, x * 0.07);
  for (const [x, z, ry] of [[-130, 100, 0], [130, 135, 0], [-140, -120, 0], [140, -130, 0], [-110, 140, 0], [20, 140, 0]] as const) put(metalBarrier(), x, z, ry + 0.2);
  for (const [x, z] of [[-70, -105], [10, -118], [100, -120], [-135, 30], [135, 55], [-40, 130], [60, 135]] as const) put(pine(17 + (x + z + 300) % 6), x, z);
  // Rampas de madera junto a los caminos de tierra (a un costado, no encima)
  for (const [x, z, ry] of [[17.6, 17.3, 0.9], [20.9, 46.3, -1.2], [-32.8, -5.2, 2.3], [-12, -13, 0.4]] as const) put(woodRamp(), x, z, ry);
  // Arco de largada cruzando el camino de tierra [33, 38.5] (perpendicular a su eje, lejos de la salida), gradas de fondo en los bordes
  put(startArch(), 33 + Math.sin(1.16) * 8, 38.5 + Math.cos(1.16) * 8, 1.16);
  put(bleachers(), -100, 128, Math.PI); put(bleachers(), 112, -128, 0.1);
  const tower = merge("rcTower", waterTower()); tower.position.set(-75, 0, -176); tower.rotation.y = 0.5; tower.bakeCurrentTransformIntoVertices(); tower.isPickable = false; shadows.addShadowCaster(tower);
  const m = merge("rcProps", parts);
  m.isPickable = false; m.freezeWorldMatrix?.();
  shadows.addShadowCaster(m);
}

/** Casa de maqueta (reemplaza a `house()` de zones/common en el patio): misma fachada al sur del patio, colores planos, techo rojo. Sin colisionador (como antes: la frena la cerca). */
export function toyHouse() {
  const GS = HALF * 2 + 60, K = HALF / 100, z = HALF + 14;
  const win = [-70, -25, 45, 90];
  const parts = [
    rbox(GS, 70, 6, 0.6, P("#FFE7B0", 0.6), [0, 35, z]), // pared crema (más cálida para contrastar con cornisa y marcos)
    box(GS, 7, 7.4, P(C.marron, 0.7), [0, 3.5, z - 0.6]), // zócalo marrón
    ...[-1, 1].map((s) => box(6, 70, 7.4, P(C.azul, 0.5), [s * (GS / 2 - 3), 35, z - 0.6])), // esquineros azules
    box(GS, 2.4, 6.4, P(C.amarillo, 0.5), [0, 52, z]), // friso amarillo entre pisos
    box(GS + 6, 2.2, 3.2, P("#9E9E9E", 0.4, 0.5), [0, 68.5, z - 7.5]), // canaleta
    ...[-0.4, -0.2, 0, 0.2, 0.4].map((f) => box(GS + 9, 1.6, 7, P(f * 10 % 4 ? "#C62828" : "#B71C1C", 0.5), [0, 74 + (f + 0.4) * 22, z + 0.6 + (f + 0.4) * 9], [-0.5, 0, 0])), // franjas de tejas
    box(14, 24, 14, P("#8D5A44", 0.8), [GS * 0.3, 90, z + 6]), box(17, 3, 17, P("#9E9E9E", 0.7), [GS * 0.3, 103, z + 6]), // chimenea
    box(GS + 6, 4, 14, P("#FAFAFA", 0.5), [0, 72, z - 2]), // cornisa blanca
    box(GS + 8, 22, 14, P(C.rojo, 0.45), [0, 80, z + 4], [-0.5, 0, 0]), // faldón del techo rojo
    box(GS + 8, 3, 3, P("#B71C1C", 0.45), [0, 90, z + 8]), // cumbrera
    ...win.flatMap((x, i) => [
      rbox(30, 34, 1.2, 0.4, P("#FAFAFA", 0.5), [x * K, 40, HALF + 10.6]), // marco blanco
      box(25, 29, 0.6, i === 1 ? P(C.azul, 0.2) : M.glow(i % 2 ? "#ffcf8a" : "#fff1b8"), [x * K, 40, HALF + 9.9]),
      box(1.2, 29, 0.4, P("#FAFAFA", 0.5), [x * K, 40, HALF + 9.5]), box(25, 1.2, 0.4, P("#FAFAFA", 0.5), [x * K, 40, HALF + 9.5]), // cruz de la ventana
      box(8, 31, 1, P(C.azul, 0.5), [x * K - 19, 40, HALF + 10.4]), box(8, 31, 1, P(C.azul, 0.5), [x * K + 19, 40, HALF + 10.4]), // postigos
      rbox(32, 2.4, 3, 0.4, P(C.amarillo, 0.5), [x * K, 23.5, HALF + 10]), // alféizar
    ]),
    rbox(26, 42, 1.2, 0.4, P("#FAFAFA", 0.5), [10 * K, 21, HALF + 10.6]),
    rbox(22, 39, 1, 0.5, P(C.verde, 0.45), [10 * K, 20, HALF + 10]), // puerta verde
    sph(2.4, P(C.amarillo, 0.3, 0.6), [10 * K + 7, 20, HALF + 9.3], undefined, 8), // pomo
  ];
  const h = merge("toyHouse", parts);
  h.receiveShadows = true; h.isPickable = false;
  occluders.push(h);
}

/** Árbol de juguete (reemplaza a `tree()` de zones/common): mismo colisionador (cilindro 7-9 × 70) y las MISMAS 15 llamadas a rng() para no mover el layout por semilla. */
export function toyTree(x: number, z: number) {
  occluders.push(stat(cyl(6, 8, 70, P(C.marron, 0.8), [x, 35, z], undefined, 10), B.PhysicsShapeType.CYLINDER));
  const lobes: B.Mesh[] = [];
  for (let k = 0; k < 5; k++) lobes.push(sph(40, P(k % 2 ? C.verde : "#4CAF50", 0.65), [x + (rng() - 0.5) * 30, 72 + rng() * 10, z + (rng() - 0.5) * 30], [1, 0.8, 1], 3));
  lobes.push(cyl(0, 30, 28, P(C.verde, 0.65), [x, 100, z], undefined, 6)); // punta cónica de maqueta (sin rng)
  lobes.push(cyl(9, 11, 6, P(C.marron, 0.8), [x, 3, z], undefined, 10)); // base de raíces
  shadows.addShadowCaster(merge("toyCrown", lobes)); // facetada (segmentos 3) y en dos verdes planos
  bare.push({ x, z, r: 6 });
}
