import * as B from "@babylonjs/core";
type V3 = [number, number, number];
import { box, cyl, merge, sph, tor } from "../models";
import { M, pbr, shadows, TEX } from "../render";
import { rng } from "../rng";
import { HALF, bare, decal, floor, occluders, scene, skin, stat } from "./common";
import { ball, freeSpot, giantTools, int, paintCans, piles, puddles, toyRamps } from "../world_layout";

// Tablones oscuros, paredes de chapa, vigas bajas y juguetes gigantes rotos como obstáculos. Mismo tamaño y reglas que el galpón (salida (0, 0) libre).
export function atticBuild() {
  floor("r53madera", "#ffffff", () => { const x = new B.Texture("./textures/r53-madera-gastada.webp", scene); x.wrapU = x.wrapV = B.Texture.WRAP_ADDRESSMODE; return x; }, 0.75, "concrete", 6);
  const paint = M.matte("#c98a4a"), band = M.matte("#795548");
  for (const [x, z, w, d] of [[0, -HALF - 1, HALF * 2 + 4, 2], [HALF + 1, 0, 2, HALF * 2 + 4], [-HALF - 1, 0, 2, HALF * 2 + 4], [0, HALF + 1, HALF * 2 + 4, 2]]) occluders.push(merge("gwall", [box(w, 56, d, paint, [x, 28, z]), box(w + 0.6, 5, d + 0.6, band, [x, 2.5, z])]));
  atticContrast();
}

// Contraste de composición (recetas de industrial/ciudad): manchas oscuras orgánicas de borde suave (una textura radial compartida), cinta de enmascarar clara en los tablones y libros oscuros que proyectan sombra.
// Generador local fijo: no toca rng() del layout.
const lcg = (s: number) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
function atticContrast() {
  const N = 256, t = new B.DynamicTexture("desvanManchaTex", N, scene, true), c = t.getContext() as unknown as CanvasRenderingContext2D, q = lcg(5), o = lcg(613);
  c.clearRect(0, 0, N, N);
  for (let i = 0; i < 11; i++) { const bx = N / 2 + (q() - 0.5) * 110, by = N / 2 + (q() - 0.5) * 80, rr = 30 + q() * 40, g = c.createRadialGradient(bx, by, 0, bx, by, rr); g.addColorStop(0, "rgba(14,8,6,0.95)"); g.addColorStop(0.55, "rgba(16,9,7,0.8)"); g.addColorStop(1, "rgba(16,9,7,0)"); c.fillStyle = g; c.fillRect(bx - rr, by - rr, rr * 2, rr * 2); }
  t.update(); t.hasAlpha = true;
  const ink = pbr("desvanMancha" + scene.uniqueId, { color: "#ffffff", rough: 0.5, metal: 0, tex: t }) as B.PBRMaterial;
  if (ink.albedoTexture !== t) t.dispose(); // material cacheado: la textura nueva sobra
  ink.useAlphaFromAlbedoTexture = true; ink.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  for (let i = 0; i < 38; i++) { const a = o() * 6.283, d = 5 + o() * 36, w = 7 + o() * 11; decal("desvanMan" + i, w, w * (0.6 + o() * 0.4), Math.cos(a) * d, Math.sin(a) * d, ink, 0.07 + i * 0.001).isPickable = false; }
  { // Rayos de luz de ventana sobre el piso (aditivos, degradé): claros junto al auto para el cuadro vertical del celular
    const lt = new B.DynamicTexture("desvanLuzTex", 64, scene, true), lc = lt.getContext() as unknown as CanvasRenderingContext2D, lg = lc.createRadialGradient(32, 32, 0, 32, 32, 32);
    lg.addColorStop(0, "rgba(255,255,255,1)"); lg.addColorStop(0.6, "rgba(255,255,255,0.7)"); lg.addColorStop(1, "rgba(255,255,255,0)"); lc.fillStyle = lg; lc.fillRect(0, 0, 64, 64); lt.update(); lt.hasAlpha = true;
    const lm = new B.StandardMaterial("desvanLuz" + scene.uniqueId, scene); lm.opacityTexture = lt; lm.disableLighting = true; lm.emissiveColor = new B.Color3(0.75, 0.55, 0.3); lm.diffuseColor = B.Color3.Black(); lm.specularColor = B.Color3.Black(); lm.alphaMode = B.Engine.ALPHA_ADD; lm.backFaceCulling = false;
    decal("desvanLuz1", 16, 9, 2, -7, lm, 0.12).isPickable = false; decal("desvanLuz2", 16, 9, -3, 6, lm, 0.12).isPickable = false;
  }
  // Cinta de enmascarar crema (dos rectas y una cruz junto a la salida) y círculos de tiza: marcas planas, el piso sigue libre
  const tape = M.matte("#F1E6C8"), blue = M.matte("#42A5F5"), parts: B.Mesh[] = [];
  for (const x of [-9, 9]) for (let z = -70; z < 48; z += 6) parts.push(box(1.4, 0.08, 6, ((z + 70) / 6 | 0) % 2 ? M.matte("#17181c") : tape, [x, 0.1, z + 3]));
  for (let x = -60; x < 60; x += 6) parts.push(box(4, 0.08, 0.9, tape, [x + 2, 0.1, -26]));
  for (const sg of [-1, 1]) for (let k = -3; k <= 3; k++) parts.push(box(0.8, 0.08, 5, k % 2 ? blue : tape, [sg * 22 + k * 1.5, 0.1, 10])); // rayuela
  const m = merge("desvanCinta", parts); m.isPickable = false; m.receiveShadows = true;
  // Libros y bloques oscuros cerca de la salida (lados y fondo, pasillos de 18+ m): sombra larga sobre el tablón
  const dk = M.plastic("#1d2433"), dk2 = M.plastic("#2a1a22"), books: B.Mesh[] = [];
  for (const [x, z, ry] of [[-24, -4, 0.5], [26, -8, -0.2], [5, -50, 0.6], [-12, -52, 0.1], [-17, -16, 0.3], [18, -34, -0.4], [-30, -40, 0.8], [14, 28, 0.1]]) {
    books.push(box(7, 1.6, 5, dk, [x, 0.8, z], [0, ry, 0]), box(6.4, 1.6, 4.6, dk2, [x + 0.3, 2.4, z], [0, ry + 0.2, 0]), box(5.6, 1.6, 4.2, dk, [x, 4, z], [0, ry - 0.15, 0]));
    stat(box(7, 5.6, 5.4, dk, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, 2.8, z, ry]).isVisible = false;
    bare.push({ x, z, r: 6 });
  }
  const bm = merge("desvanLibros", books); bm.isPickable = false; shadows.addShadowCaster(bm); bm.receiveShadows = true;
}

// Props de juguete a escala del auto (2-3 u): una malla fusionada por zona y colisionadores invisibles (uno por prop) en el área central. Sin tapar la salida (freeSpot deja 18 u libres).
type Prop = { w: number; d: number; h: number; parts: B.Mesh[] };
function scatterProps(name: string, n: number, make: (k: number, at: (x: number, y: number, z: number) => [number, number, number], ry: number) => Prop) {
  const all: B.Mesh[] = [];
  for (let i = 0; i < n; i++) {
    const p = freeSpot(4, 100); if (!p) continue;
    const ry = rng() * 6.3, c = Math.cos(ry), s = Math.sin(ry);
    const pr = make(i, (x, y, z) => [p[0] + x * c + z * s, y, p[1] - x * s + z * c], ry);
    all.push(...pr.parts);
    stat(box(pr.w, pr.h, pr.d, M.matte("#9E9E9E"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [p[0], pr.h / 2, p[1], ry]).isVisible = false;
    bare.push({ x: p[0], z: p[1], r: Math.max(pr.w, pr.d) / 2 + 2 });
  }
  if (all.length) { const m = merge(name, all); m.isPickable = false; shadows.addShadowCaster(m); }
}

// Cartón corrugado kraft (textura continua; cada cara de la caja muestra un tile). Textura local: render.ts y common.ts son compartidos.
let cartonTex: B.Texture | undefined, cartonScene: B.Scene | undefined;
const cartonM = () => {
  if (cartonScene !== scene) { cartonScene = scene; cartonTex = new B.Texture("./textures/carton.webp", scene); cartonTex.wrapU = cartonTex.wrapV = B.Texture.WRAP_ADDRESSMODE; }
  return pbr("cartonKraft", { color: "#ffffff", rough: 0.85, metal: 0, tex: cartonTex });
};

const RED = "#E53935", YEL = "#FBC02D", BLU = "#42A5F5", GRN = "#66BB6A", ORA = "#FB8C00", PUR = "#8E24AA", BRN = "#795548";
function atticProp(k: number, at: (x: number, y: number, z: number) => [number, number, number], ry: number): Prop {
  const r: V3 = [0, ry, 0], P = (c: string) => M.plastic(c);
  switch (k % 6) {
    case 0: return { w: 3, d: 2, h: 2, parts: [box(3, 1.4, 2, P(BRN), at(0, 0.7, 0), r), box(3.2, 0.6, 2.2, P(ORA), at(0, 1.7, 0), r), box(0.4, 2, 2.3, M.metal(YEL), at(-0.9, 1, 0), r), box(0.4, 2, 2.3, M.metal(YEL), at(0.9, 1, 0), r)] }; // baúl
    case 1: return { w: 2.4, d: 1.8, h: 1.6, parts: [box(2.4, 0.5, 1.8, P(RED), at(0, 0.25, 0), r), box(2.2, 0.5, 1.7, P(BLU), at(0.1, 0.75, 0), [0, ry + 0.2, 0]), box(2.3, 0.5, 1.6, P(GRN), at(-0.1, 1.25, 0), [0, ry - 0.15, 0]), box(2, 0.4, 1.5, P(YEL), at(0, 1.7, 0), [0, ry + 0.3, 0])] }; // libros
    case 2: return { w: 2.4, d: 2.4, h: 1.8, parts: [box(2.4, 1.8, 2.4, cartonM(), at(0, 0.9, 0), r), box(0.5, 0.05, 2.45, P(YEL), at(0, 1.82, 0), r)] }; // caja de cartón
    case 3: return { w: 1.8, d: 1.8, h: 3, parts: [box(1.8, 0.3, 1.8, P(GRN), at(0, 0.15, 0), r), cyl(0.9, 1.2, 1.6, P(RED), at(0, 1.1, 0)), sph(0.8, P("#FFCC99"), at(0, 2.2, 0)), cyl(0.7, 0.9, 0.9, P(BLU), at(0, 2.75, 0))] }; // soldadito
    case 4: return { w: 5.6, d: 1.4, h: 1.8, parts: [box(1.8, 1.2, 1.3, P(BLU), at(-1.9, 0.8, 0), r), cyl(0.5, 0.5, 0.9, M.metal(YEL), at(-2.2, 1.8, 0)), ...[0, 1].map((i) => box(1.7, 0.9, 1.3, P(i ? PUR : RED), at(0.1 + i * 1.9, 0.75, 0), r)), ...[-2.4, -1.4, 0.1, 1.1, 2, 3].map((x) => cyl(0.5, 0.5, 1.5, M.matte("#222"), at(x, 0.25, 0), [Math.PI / 2, ry, 0], 8))] }; // tren
    default: return { w: 1.8, d: 1.8, h: 1.8, parts: [sph(1.8, P(k % 2 ? PUR : RED), at(0, 0.9, 0)), tor(1.7, 0.12, P(YEL), at(0, 0.9, 0), [0.6, ry, 0.3])] }; // ovillo
  }
}

// Segundo anillo (8-25 u de la salida, bajo < 1,5): objetos chicos en posiciones fijas, sobre todo hacia +z y a los costados, para que siempre haya algo en cuadro. Sin rng().
const NEAR: [number, number][] = [[-12, 14], [11, 13], [0, 23], [-21, 19], [20, 18], [-24, 5], [23, 4], [-8, 24], [14, 24], [-14, -12], [16, -11]];
function nearProps(name: string, make: (k: number, x: number, z: number) => B.Mesh[]) {
  const all: B.Mesh[] = [];
  NEAR.forEach(([x, z], k) => {
    all.push(...make(k, x, z));
    stat(box(2.4, 1.2, 2.4, M.matte("#9E9E9E"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, 0.6, z]).isVisible = false;
    bare.push({ x, z, r: 3 });
  });
  const m = merge(name, all); m.isPickable = false; shadows.addShadowCaster(m);
}
const atticNear = (k: number, x: number, z: number): B.Mesh[] => {
  const P = (c: string) => M.plastic(c), ry = k * 0.9, cols = [RED, YEL, BLU, GRN, ORA, PUR];
  switch (k % 4) {
    case 0: return [box(2.2, 0.35, 1.6, P(cols[k % 6]), [x, 0.18, z], [0, ry, 0]), box(2, 0.35, 1.5, P(cols[(k + 2) % 6]), [x, 0.52, z], [0, ry + 0.3, 0]), box(1.9, 0.35, 1.4, P(cols[(k + 4) % 6]), [x, 0.87, z], [0, ry - 0.2, 0])]; // libros
    case 1: return [box(1.2, 1.2, 1.2, P(cols[k % 6]), [x, 0.6, z], [0, ry, 0]), box(1.2, 1.2, 1.2, P(cols[(k + 1) % 6]), [x + 1.3, 0.6, z + 0.3], [0, ry + 0.5, 0])]; // bloques
    case 2: return [cyl(1.4, 1.4, 0.5, M.matte("#222"), [x, 0.7, z], [Math.PI / 2, ry, 0], 10), cyl(0.6, 0.6, 0.6, M.metal(YEL), [x, 0.7, z], [Math.PI / 2, ry, 0], 8)]; // rueda de juguete
    default: return [sph(1.2, P(cols[k % 6]), [x, 0.6, z]), tor(1.1, 0.1, P(YEL), [x, 0.6, z], [0.6, ry, 0.3])]; // pelotita
  }
};
export function atticLayout() {
  toyRamps(int(2, 3), [0, 1]);
  // Baúles de juguetes: obstáculos macizos
  const wood = M.matte("#d08a3c"), strap = M.metal("#FBC02D");
  for (let i = 0, n = int(4, 6); i < n; i++) {
    const p = freeSpot(10); if (!p) continue;
    skin(stat(box(14, 8, 8, wood, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [p[0], 4, p[1], rng() * 6.3]), "baulJuguetes", () => [
      box(14, 6, 8, wood, [0, -1, 0]), box(14.4, 2, 8.4, M.matte("#795548"), [0, 3, 0]), box(1.2, 8, 8.5, strap, [-4, 0, 0]), box(1.2, 8, 8.5, strap, [4, 0, 0]),
    ]);
    bare.push({ x: p[0], z: p[1], r: 9 });
  }
  scatterProps("desvanProps", int(10, 14), atticProp);
  nearProps("desvanCerca", atticNear);
  giantTools();
  paintCans(int(4, 7));
  piles(int(3, 4), ["#d94a3a", "#e0b030", "#3a7bd9", "#4aa860"], (c) => M.plastic(c), 3); // cubos de letras
  puddles(int(2, 4), pbr("dust", { color: "#42A5F5", rough: 0.35, alpha: 0.7 }));
  ball();
}


