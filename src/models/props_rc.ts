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

type Prop = { parts: B.Mesh[]; r: number; col?: (x: number, z: number, ry: number) => void };
const wood = () => P("#B07A4A", 0.7), woodD = () => P(C.marron, 0.75);

const toolbox = (): Prop => ({
  r: 7,
  parts: [
    rbox(12, 3.6, 5, 0.4, P(C.rojo, 0.45), [0, 1.8, 0]), rbox(12.2, 1.4, 5.2, 0.5, P("#B71C1C", 0.45), [0, 4.3, 0]),
    box(5, 0.5, 0.5, P("#9E9E9E", 0.3, 1), [0, 5.3, 0]), box(0.5, 1.4, 0.5, P("#9E9E9E", 0.3, 1), [-2.4, 4.9, 0]), box(0.5, 1.4, 0.5, P("#9E9E9E", 0.3, 1), [2.4, 4.9, 0]),
    box(1, 1, 0.4, P(C.amarillo, 0.4, 0.8), [-3.5, 3.4, 2.65]), box(1, 1, 0.4, P(C.amarillo, 0.4, 0.8), [3.5, 3.4, 2.65]),
  ],
  col: (x, z, ry) => stat(box(12, 5, 5, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, 2.5, z, ry]).isVisible = false,
});

const pallet = (): Prop => {
  const parts: B.Mesh[] = [];
  for (const x of [-3.2, 0, 3.2]) parts.push(box(1, 0.9, 7, woodD(), [x, 0.45, 0]));
  for (let i = 0; i < 5; i++) parts.push(rbox(8, 0.5, 1.2, 0.12, wood(), [0, 1.15, -3 + i * 1.5]));
  return { parts, r: 5.5, col: (x, z, ry) => stat(box(8, 1.4, 7, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, 0.7, z, ry]).isVisible = false };
};

const crate = (s = 3): Prop => ({
  r: s * 0.9,
  parts: [rbox(s, s, s, 0.2, wood(), [0, s / 2, 0]), ...[-1, 1].flatMap((k) => [box(s + 0.1, 0.35, 0.35, woodD(), [0, s / 2, k * s * 0.4]), box(0.35, s + 0.1, 0.35, woodD(), [k * s * 0.4, s / 2, 0])])],
  col: (x, z, ry) => stat(box(s, s, s, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, s / 2, z, ry]).isVisible = false,
});

const barrel = (c: string): Prop => ({
  r: 4.5,
  parts: [cyl(3.2, 3.2, 4.4, P(c, 0.45), [0, 2.2, 0], undefined, 16), ...[1, 3.3].map((y) => tor(3.3, 0.18, P("#FAFAFA", 0.5), [0, y, 0], undefined, 16)), cyl(3, 3, 0.15, P("#9E9E9E", 0.4, 0.8), [0, 4.45, 0], undefined, 16)],
  col: (x, z) => stat(cyl(3.2, 3.2, 4.4, M.matte("#000"), [0, 0, 0], undefined, 12), B.PhysicsShapeType.CYLINDER, {}, [x, 2.2, z]).isVisible = false,
});

const tires = (n: number): Prop => ({
  r: 6.5,
  parts: Array.from({ length: n }, (_, i) => tor(4.2, 1.5, P(i % 2 ? C.amarillo : C.rojo, 0.55), [0, 0.75 + i * 1.4, 0], undefined, 14)),
  col: (x, z) => stat(cyl(5, 5, 1.4 * n, M.matte("#000"), [0, 0, 0], undefined, 10), B.PhysicsShapeType.CYLINDER, {}, [x, 0.7 * n, z]).isVisible = false,
});

const rock = (r: number): Prop => ({
  r: r * 2.4,
  parts: [sph(r * 2, P("#9E9E9E", 0.85), [0, r * 0.55, 0], [1.1, 0.7, 0.9], 4), sph(r * 1.2, P("#8a8a8a", 0.9), [r * 0.7, r * 0.3, r * 0.3], [1, 0.7, 1], 4)],
  col: (x, z) => stat(sph(r * 2, M.matte("#000"), [0, 0, 0], [1.1, 0.7, 0.9], 4), B.PhysicsShapeType.CONVEX_HULL, {}, [x, r * 0.55, z]).isVisible = false,
});

const cone = (): Prop => ({
  r: 2.5,
  parts: [box(2.6, 0.3, 2.6, P(C.naranja, 0.5), [0, 0.15, 0]), cyl(0.5, 2, 3.2, P(C.naranja, 0.45), [0, 1.9, 0], undefined, 12), cyl(0.95, 1.25, 0.7, P("#FAFAFA", 0.5), [0, 2.3, 0], undefined, 12)],
  col: (x, z) => stat(cyl(0.8, 2, 3.4, M.matte("#000"), [0, 0, 0], undefined, 8), B.PhysicsShapeType.CYLINDER, {}, [x, 1.7, z]).isVisible = false,
});

// Valla de juguete: postes y travesaños pintados (rojo/blanco/azul/amarillo según x), nada de madera cruda
const fence = (c = C.rojo): Prop => ({
  r: 5,
  parts: [...[-3.6, 0, 3.6].map((x) => rbox(0.8, 5, 0.8, 0.15, P(x ? "#FAFAFA" : c, 0.45), [x, 2.5, 0])), ...[1.6, 3.6].map((y) => rbox(8, 0.9, 0.35, 0.1, P(y > 2 ? c : "#FAFAFA", 0.45), [0, y, 0.45]))],
  col: (x, z, ry) => stat(box(8, 5, 0.9, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, 2.5, z, ry]).isVisible = false,
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

/** Patio: coloca los props en posiciones fijas (lejos de rects, posibles esquinas de pileta y spawn). x, z, ry. */
export function buildRcProps() {
  const parts: B.Mesh[] = [];
  const put = (p: Prop, x: number, z: number, ry = 0, y = 0) => {
    const R = B.Matrix.RotationY(ry), T = B.Matrix.Translation(x, y, z);
    const sc = new B.Vector3(), q = new B.Quaternion(), pos = new B.Vector3();
    for (const m of p.parts) {
      m.computeWorldMatrix(true).multiply(R).multiply(T).decompose(sc, q, pos);
      m.scaling.copyFrom(sc); m.rotationQuaternion = q; m.position.copyFrom(pos);
      parts.push(m);
    }
    p.col?.(x, z, ry);
    bare.push({ x, z, r: p.r });
  };
  put(toolbox(), 30, 100, 0.4);
  put(pallet(), -30, 110, 0.2); put(pallet(), -30, 110, 0.7, 1.4); put(crate(3), -26, 108, 0.5, 2.8);
  put(pallet(), -8, 125, -0.3); put(crate(3), -6, 124, 0.2, 1.4); put(crate(2.4), -10, 127, 1.1, 1.4);
  put(barrel(C.azul), 100, 60); put(barrel(C.rojo), 104, 63); put(barrel(C.azul), 101, 67);
  put(barrel(C.rojo), -110, -20); put(barrel(C.azul), -113, -17);
  for (let i = 0; i < 4; i++) put(cone(), -12 + i * 8, 62 - i * 1.5);
  put(tires(3), -20, -100); put(tires(2), -14, -103);
  put(doghouse(), 115, -90, -0.5);
  for (let i = 0; i < 3; i++) put(fence([C.rojo, C.azul, C.amarillo][i]), 60 + i * 8.5, -105);
  put(rock(4), 130, 20); put(rock(3), 126, 25, 1); put(rock(5), -120, -40); put(rock(2.5), 40, 135);
  put(plant(), -5, 95); put(plant(), 60, -70); put(plant(), 140, 100);
  for (const [x, z] of [[-125, 90], [125, 110], [-130, -60], [130, -60]] as const) put(pine(16 + (x + z) % 5), x, z);
  const m = merge("rcProps", parts);
  m.isPickable = false; m.freezeWorldMatrix?.();
  shadows.addShadowCaster(m);
}

/** Casa de maqueta (reemplaza a `house()` de zones/common en el patio): misma fachada al sur del patio, colores planos, techo rojo. Sin colisionador (como antes: la frena la cerca). */
export function toyHouse() {
  const GS = HALF * 2 + 60, K = HALF / 100, z = HALF + 14;
  const win = [-70, -25, 45, 90];
  const parts = [
    rbox(GS, 70, 6, 0.6, P("#FFF3D6", 0.6), [0, 35, z]), // pared crema
    box(GS, 5, 7, P("#9E9E9E", 0.7), [0, 2.5, z - 0.5]), // zócalo
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
  shadows.addShadowCaster(merge("toyCrown", lobes)); // facetada (segmentos 3) y en dos verdes planos
  bare.push({ x, z, r: 6 });
}
