import * as B from "@babylonjs/core";
import { box, cyl, merge, rbox, sph, tor, tube, wheel } from "./models";
import { applyClimate, canvasTex, glow, lamp, LOOK, M, menuLights, pbr, setDof, shadows } from "./render";
import { ambient } from "./fx";
import { brick, canvasTexture, KIT, kitPut, M3C, type KitId } from "./kit3d";
import { showWorld } from "./world";

// Escenas de los menús (no de la partida). Sistema de configuración:
// - SETS: escenarios físicos (cuarto + utilería fija), armados la primera vez que se ven y lejos entre sí (solo uno encendido).
// - SCENES: una entrada por sección (cámara, auto de muestra, utilería del kit modular de kit3d.ts con variaciones y animación ambiental,
//   ajustes de luz). Una escena nueva = un objeto más en SCENES; el menú (menu.ts) y main.ts no cambian.
// El mundo de juego se esconde mientras tanto (showWorld) y la luz de partida vuelve con menuOff().

type V3 = [number, number, number];
type SetId = "shelf" | "bench" | "clean";
type Clim = Parameters<typeof applyClimate>[0];
type Lamp = { spot: V3; to: V3; glow: V3; spotI: number; glowI: number; cone: number };
type Cam = { pos: V3; target: V3; fov?: number };
/** Utilería de una sección: pieza del kit (kit3d.ts), tamaño `u`, dónde y cómo; `v` = variación (color de la chapa o id del cartel); `anim` = animación ambiental. */
type Prop = { kit: KitId; u: number; at: V3; rot?: V3; v?: string; anim?: "swing" | "spin" };
/** Escena de una sección del menú. Todas las coordenadas son locales a su escenario (`set`). */
export type MenuScene = { set: SetId; cam: Cam; camV?: Cam; car?: V3; props?: Prop[]; clim?: Partial<Clim>; lamp?: Partial<Lamp>; dof?: number };

// ---------- Escenarios físicos: el cuarto y su utilería fija, armados una vez; lejos entre sí (solo uno encendido) ----------
const SETS: Record<SetId, { origin: V3; build: (low: boolean) => [B.Mesh[], B.Mesh[]]; clim: Clim; lamp: Lamp; dof: number }> = {
  // ESTANTE de juguetes de noche: luna por la ventana, lámpara hongo, guirnalda. La ficha del bestiario pone su pedestal en el origen.
  shelf: { origin: [0, 0, 0], build: (low) => shelfBuild(low), dof: 0.8,
    clim: { sun: [0.35, -0.6, 0.72], sunColor: "#bfe0e0", sunI: 1.6, hemiI: 0.42, amb: "#a8c8c4", ground: "#5f7f7c",
      sky: ["#0b2226", "#1f4a50", "#3f7476", "#12302f"], exposure: 1, fog: 0.004, ramp: ["#000000", "#808080", "#ffffff"] },
    lamp: { spot: [8, 13, 8], to: [-1, 0, 0], glow: [22, 4.6, -3], spotI: 5, glowI: 2.2, cone: 0.9 } },
  // MESA de taller tipo diorama: flexo, tablero perforado, cajoneras
  bench: { origin: [0, 0, 400], build: (low) => benchBuild(low), dof: 0.65,
    clim: { sun: [-0.3, -0.85, -0.45], sunColor: "#ffd9a0", sunI: 2.8, hemiI: 1.0, amb: "#f2cf9c", ground: "#b98f63",
      sky: ["#2a5a8a", "#f0b070", "#ffd8a0", "#2a4a6a"], exposure: 1.5, fog: 0.005, ramp: ["#000000", "#808080", "#ffffff"] },
    lamp: { spot: [2.5, 6.4, -1], to: [-0.5, 0, 1.5], glow: [3, 8.5, -1.5], spotI: 8.5, glowI: 1.8, cone: 1.2 } },
  // GALPÓN limpio (configuración): pared de ladrillo, piso de chapa, casi nada en el medio para que el panel respire
  clean: { origin: [0, 0, -400], build: () => cleanBuild(), dof: 0.5,
    clim: { sun: [0.2, -0.8, -0.5], sunColor: "#ffd6a8", sunI: 0.9, hemiI: 0.35, amb: "#8a7a6a", ground: "#3b3833",
      sky: ["#0b0f14", "#14181f", "#1f2937", "#0b0f14"], exposure: 1, fog: 0.006, ramp: ["#000000", "#808080", "#ffffff"] },
    lamp: { spot: [0, 26, 10], to: [0, 0, -6], glow: [-14, 24.5, -4], spotI: 7, glowI: 2.4, cone: 1.1 } },
};

// ---------- Secciones: crear una escena nueva = agregar un objeto acá ----------
// cam/camV: encuadre (camV = celular vertical). car: dónde va el auto de muestra. props: utilería propia (se ve solo en esa sección).
// Los encuadres dejan libre la zona donde va el panel: principal a la izquierda, garaje a la derecha.
export const SCENES: Record<string, MenuScene> = {
  title: { set: "shelf", cam: { pos: [2.3, 1, 4.4], target: [-0.3, 0.75, 0] }, camV: { pos: [3.9, 1.7, 8], target: [0, 0.75, 0] }, car: [0, 0, 0] },
  main: { set: "shelf", cam: { pos: [-0.5, 3, 10.5], target: [2.7, 1.4, -1] }, camV: { pos: [5.4, 1.4, 14], target: [0, -2.6, 0] }, car: [0, 0, 0],
    props: [
      { kit: "crate", u: 2.6, at: [-4.6, 0, -4], rot: [0, 0.25, 0] }, { kit: "crate", u: 1.8, at: [-4.4, 1.95, -3.8], rot: [0, -0.2, 0], v: M3C.amarillo },
      { kit: "sign", u: 3, at: [-11, 0, -4.8], rot: [0, 0.15, 0], v: "junked" },
      { kit: "cageLamp", u: 3.4, at: [-4.5, 16.6, 0.5], anim: "swing" },
    ] },
  bestiary: { set: "shelf", cam: { pos: [-5, 4.2, 9.5], target: [-9.5, 0.6, 0.5] },
    props: [
      ...[[-4.4, 2, M3C.verde], [-3, 1.1, M3C.rojo], [-1.7, 2.4, M3C.morado], [-5.6, 3.5, M3C.amarillo]].map(([x, z, c]) => ({ kit: "jar" as const, u: 1.5, at: [x, 0, z] as V3, v: c as string })),
      { kit: "sign", u: 1.3, at: [-9.5, 0, -3.8], v: "specimens" },
    ] },
  beast: { set: "shelf", cam: { pos: [0, 3, 8], target: [0, 1, 0] } }, // main.ts recalcula SHOTS.beast según el bicho
  credits: { set: "shelf", cam: { pos: [10, 3.2, 15], target: [4, 10.5, -60] } },
  garage: { set: "bench", clim: { sunI: 0.5, hemiI: 0.22, amb: "#7a5a3c", exposure: 1.7 }, lamp: { spotI: 55, cone: 0.5, glowI: 1.2 }, cam: { pos: [2, 4, 11], target: [-2.2, 2.2, 1] }, camV: { pos: [2.6, 3.8, 14], target: [0, -2.8, 1] }, car: [0, 0.9, 1], // 0.9 = tope de la peana (stand): a y=0 el auto quedaba enterrado en ella
    props: [
      { kit: "toolbox", u: 3.4, at: [-9, 0, -7], rot: [0, 0.3, 0] }, { kit: "crate", u: 4, at: [13, 0, -12.5], rot: [0, 0.15, 0] },
      { kit: "sign", u: 6, at: [-1, 9.5, -16.2], v: "playfix" },
      { kit: "cageLamp", u: 4, at: [-5, 14, -6], anim: "swing" },
    ] },
  shop: { set: "bench", cam: { pos: [-4, 8, 14], target: [10, 9, -14] },
    props: [
      { kit: "vise", u: 3.2, at: [26, 0, 5], rot: [0, -0.4, 0] }, { kit: "toolbox", u: 4, at: [-4, 0, -9], rot: [0, -0.2, 0], v: M3C.amarillo },
      { kit: "sign", u: 9, at: [29, 13, -16.2], v: "goodmetal" }, { kit: "pipe", u: 6, at: [6, 34, -16], rot: [0, 0, 0] },
      { kit: "cageLamp", u: 5, at: [14, 40, -4], anim: "swing" },
    ] },
  config: { set: "clean", cam: { pos: [0, 9, 34], target: [0, 8, 0] }, camV: { pos: [0, 10, 48], target: [0, 8, 0] },
    props: [
      { kit: "crate", u: 7, at: [-24, 0, -8], rot: [0, 0.2, 0] }, { kit: "crate", u: 5, at: [-23, 5.3, -8], rot: [0, -0.15, 0], v: M3C.amarillo },
      { kit: "barrel", u: 8, at: [23, 0, -9] }, { kit: "toolbox", u: 4, at: [17, 0, -5], rot: [0, -0.5, 0] },
      { kit: "sign", u: 6, at: [-14, 15, -17.6], v: "junked" }, { kit: "pipe", u: 9, at: [10, 24, -17] },
      { kit: "cageLamp", u: 5, at: [-14, 30, -4], anim: "swing" },
    ] },
};
const sceneOf = (scr: string) => (SCENES[scr] ? scr : "main");
const add = (o: V3, p: V3): V3 => [o[0] + p[0], o[1] + p[1], o[2] + p[2]];
// Encuadres en coordenadas del mundo: [cámara x, y, z, mira x, y, z]. main.ts los lee (y la ficha escribe SHOTS.beast en este mismo objeto).
export const SHOTS: Record<string, number[]> = {};
for (const [k, s] of Object.entries(SCENES)) {
  const o = SETS[s.set].origin;
  SHOTS[k] = [...add(o, s.cam.pos), ...add(o, s.cam.target)];
  if (s.camV) SHOTS[k + "_v"] = [...add(o, s.camV.pos), ...add(o, s.camV.target)];
}
/** Dónde va el auto de muestra en cada pantalla (null = sin auto). */
export const carSpot = (scr: string) => { const s = SCENES[scr]; return s?.car ? new B.Vector3(...add(SETS[s.set].origin, s.car)) : null; };
/** Campo de visión del encuadre de cada pantalla. */
export const menuFov = (scr: string) => SCENES[sceneOf(scr)].cam.fov ?? 0.85;
export const CAR_YAW = 0.95; // estante: el auto mira hacia la cámara en 3/4

const PAST = ["#c98a5a", "#8a5a3a", "#5f8a9a", "#6f8f7a", "#c9a14a", "#a0452a", "#7f9a9c"];
// Pintura limpia (plástico/madera pintada de la paleta): sin manchas de óxido. `_` conserva la firma vieja de wornMat.
const wornMat = (base: string, _p?: string | null, _s?: number) => M.matte(base);
const W = (c: string) => M.matte(c), P = (c: string) => M.plastic(c);
const unfog = (key: string, c: string) => { const m = pbr(key, { color: c, emissive: c }); m.fogEnabled = false; return m; };

// Libros parados en fila desde x0 hacia +x (lomo hacia la cámara, +z); i0 cambia la secuencia de alturas y colores
function books(x0: number, y: number, z: number, n: number, i0 = 0): B.Mesh[] {
  const out: B.Mesh[] = [];
  let x = x0;
  for (let i = i0; i < i0 + n; i++) {
    const t = 0.9 + ((i * 53) % 5) * 0.16, h = 5 + ((i * 37) % 10) * 0.2, d = 4 + ((i * 29) % 4) * 0.25;
    out.push(box(t, h, d, W(PAST[i % PAST.length]), [x + t / 2, y + h / 2, z]), box(t + 0.02, 0.35, d + 0.02, W("#fbf1e2"), [x + t / 2, y + h * 0.78, z]));
    x += t + 0.05;
  }
  return out;
}

function shelfBuild(low: boolean): [B.Mesh[], B.Mesh[]] {
  const wall = W("#3c5a5c"), trim = W("#f4e6d4"), wood = W("#e0b98c"), woodD = W("#cfa77c");
  // Cuarto: piso, techo, pared del fondo con ventana (hueco x -32..-2, y -2..30), laterales, zócalo, alfombra
  const room = [
    box(200, 1, 160, W("#c99f7c"), [0, -26.5, 0]), box(200, 2, 160, W("#2a4446"), [0, 51, 0]),
    box(68, 78, 2, wall, [-66, 12, -61]), box(98, 78, 2, wall, [47, 12, -61]), box(30, 24, 2, wall, [-17, -14, -61]), box(30, 21, 2, wall, [-17, 40.5, -61]),
    box(2, 78, 160, wall, [-100, 12, 0]), box(2, 78, 160, wall, [96, 12, 0]), box(196, 3, 0.6, trim, [0, -24.5, -59.8]),
    cyl(56, 56, 0.3, W("#2a4a4c"), [0, -25.9, -24], undefined, 10),
    // marco, cruz y alféizar de la ventana
    box(32, 1.2, 1.4, trim, [-17, 30.6, -60]), box(32, 1.2, 1.4, trim, [-17, -2.6, -60]), box(1.2, 34, 1.4, trim, [-32.6, 14, -60]), box(1.2, 34, 1.4, trim, [-1.4, 14, -60]),
    box(0.8, 32, 0.8, trim, [-17, 14, -60]), box(30, 0.8, 0.8, trim, [-17, 14, -60]), box(36, 1, 4, trim, [-17, -3.2, -58.5]),
    // cortinas durazno a los costados
    ...[-38.5, 4.5].flatMap((x) => [0, 1, 2, 3].map((i) => cyl(2.3, 2.9, 42, W(i % 2 ? "#24484c" : "#2f5a5e"), [x + i * 1.7, 11, -58.2], undefined, 8))),
    box(46, 0.8, 0.8, W("#d8b48a"), [-17, 32.5, -58]),
    // luna y estrellas afuera (sin niebla, para que se lean a lo lejos)
    sph(30, unfog("moonM", "#fff3d6"), [-62, 92, -330], undefined, 10),
    ...(low ? [] : [[-40, 40], [-10, 60], [-90, 30], [20, 45], [-55, 15], [-25, 80], [-75, 70]].map(([x, y], i) => sph(i % 3 ? 1.6 : 2.4, unfog("starM", "#fff8e6"), [x * 3, y * 3, -320]))),
  ];
  if (!low) {
    // cama en el rincón (manta menta, almohada) y póster de un auto
    room.push(box(38, 6, 40, woodD, [-62, -23, -38]), box(36, 3, 38, W("#fbf1e2"), [-62, -18.5, -38]), box(37, 1.4, 26, W("#6f8f7a"), [-62, -16.4, -31]),
      sph(9, W("#fbf1e2"), [-62, -15.5, -53], [1.6, 0.5, 0.8]), box(38, 16, 2, woodD, [-62, -14, -58.6]),
      box(15, 19, 0.3, W("#5f8a9a"), [32, 18, -59.8]), box(9, 2.6, 0.2, W("#8a5a3a"), [32, 15, -59.6]), cyl(2.2, 2.2, 0.2, W("#b5582a"), [29, 13.6, -59.5], [Math.PI / 2, 0, 0], 8), cyl(2.2, 2.2, 0.2, W("#b5582a"), [35, 13.6, -59.5], [Math.PI / 2, 0, 0], 8));
  }
  // Guirnalda de luces sobre la pared del fondo (bokeh con la profundidad de campo)
  const step = low ? 9 : 4.5, lights = ["#ffd6a0", "#ffb070", "#b8f0d8", "#bfe0ff", "#fff1a8"];
  const sag = (x: number) => 37 - 5 * Math.cos(((x + 90) / 60) * Math.PI) ** 2;
  const path: V3[] = [];
  for (let x = -92, i = 0; x <= 92; x += step, i++) {
    path.push([x, sag(x) + 0.5, -59.3]);
    room.push(sph(1.1, M.glow(lights[i % lights.length]), [x, sag(x) - 0.4, -59], [1, 1.3, 1]));
  }
  room.push(tube(path, 0.08, W("#3a4a4c")));

  // Estante (utilería: proyecta sombras). Tabla de arriba en y = 0, de x -26 a 26 y de z -6 a 5; sin fondo: se ve el cuarto detrás
  const props = [
    box(54, 1.4, 11, wood, [0, -0.7, -0.5]), box(54, 1.4, 11, wood, [0, 17.3, -0.5]), box(54, 1.4, 11, wood, [0, -13.5, -0.5]), box(54, 1.4, 11, wood, [0, -25.3, -0.5]),
    box(1.4, 44, 11, woodD, [-27.7, -4, -0.5]), box(1.4, 44, 11, woodD, [27.7, -4, -0.5]),
    // libros parados a la izquierda y uno inclinado
    ...books(-26.8, 0, -2.5, 10),
    box(1.2, 6, 4.4, W("#7f9a9c"), [-13.2, 2.9, -2.5], [0, 0, -0.32]),
    // la guía de bichos abierta con la lupa (pantalla del bestiario)
    box(7, 0.2, 4.8, W("#4f6e70"), [-9.5, 0.1, 1.4]), box(3.3, 0.3, 4.4, W("#fbf1e2"), [-11.1, 0.32, 1.4], [0, 0, 0.07]), box(3.3, 0.3, 4.4, W("#fbf1e2"), [-7.9, 0.32, 1.4], [0, 0, -0.07]),
    box(1.6, 0.05, 1.2, W("#6f8f7a"), [-7.6, 0.5, 0.6]), box(2, 0.05, 0.3, W("#c98a5a"), [-11, 0.5, 0.4]), box(1.6, 0.05, 0.3, W("#c98a5a"), [-11.2, 0.5, 1.2]),
    tor(2.3, 0.32, P("#b5582a"), [-8.2, 0.75, 2.6], undefined, 10), cyl(2.1, 2.1, 0.06, M.glass(), [-8.2, 0.75, 2.6], undefined, 10),
    cyl(0.45, 0.45, 2.8, P("#b5582a"), [-6.2, 0.7, 3.8], [Math.PI / 2, -0.9, 0], 6),
    // cono de tránsito de juguete
    box(2.2, 0.3, 2.2, P("#ffb38a"), [-15.5, 0.15, 3]), cyl(0.3, 1.7, 2.6, P("#ffb38a"), [-15.5, 1.6, 3], undefined, 8), cyl(0.95, 1.2, 0.45, P("#fbf1e2"), [-15.5, 1.7, 3], undefined, 8),
    // cubos de madera
    box(1.9, 1.9, 1.9, P("#5f8a9a"), [9.5, 0.95, 1.8]), box(1.9, 1.9, 1.9, P("#c9a14a"), [11.6, 0.95, 1.2], [0, 0.35, 0]), box(1.9, 1.9, 1.9, P("#a0452a"), [10.5, 2.85, 1.5], [0, 0.7, 0]),
    // trompo acostado
    cyl(1.8, 0.1, 1.8, P("#c98a5a"), [6.8, 0.75, 3.2], [0, 0, 1.2], 8), cyl(0.25, 0.25, 0.8, W("#d8b48a"), [6, 1.1, 3.2], [0, 0, 1.2], 6),
    // osito sentado
    sph(3.4, W("#e0b08a"), [17, 1.8, -2.6], [1, 1.1, 0.9]), sph(2.7, W("#e0b08a"), [17, 4.4, -2.4]), sph(1.1, W("#e0b08a"), [16, 5.5, -2.5]), sph(1.1, W("#e0b08a"), [18, 5.5, -2.5]),
    sph(1.2, W("#f6dcc0"), [17, 4.1, -1.2], [1, 0.8, 0.8]), sph(0.3, W("#3a2f45"), [16.5, 4.8, -1.2]), sph(0.3, W("#3a2f45"), [17.5, 4.8, -1.2]), sph(0.35, W("#3a2f45"), [17, 4.25, -0.65]),
    sph(1.3, W("#e0b08a"), [15.3, 2.2, -1.6]), sph(1.3, W("#e0b08a"), [18.7, 2.2, -1.6]), sph(1.4, W("#e0b08a"), [16, 0.6, -0.8]), sph(1.4, W("#e0b08a"), [18, 0.6, -0.8]),
    // lámpara hongo (la luz cálida del estante)
    cyl(2.2, 2.7, 0.6, P("#fbf1e2"), [22.5, 0.3, -3], undefined, 10), cyl(0.8, 0.9, 3.4, P("#fbf1e2"), [22.5, 2.2, -3], undefined, 8),
    sph(5, M.glow("#ffcf96"), [22.5, 4.6, -3], [1, 0.55, 1], 10),
    // repisa de arriba: maceta con suculenta y frasco de botones
    cyl(3, 2.4, 2.8, P("#8a5a3a"), [-18, 19.4, -2], undefined, 8), sph(2.4, W("#9fd3a8"), [-18, 21.4, -2], [1, 0.8, 1]), sph(1.6, W("#6f8f7a"), [-17, 22.3, -1.6]),
    cyl(2.6, 2.6, 3.4, M.glass(), [12, 19.7, -2], undefined, 10), cyl(2.7, 2.7, 0.5, P("#c98a5a"), [12, 21.6, -2], undefined, 10),
  ];
  if (!low) props.push(
    // repisa de abajo: más libros y una caja de juguetes
    ...books(-26.5, -12.8, -2, 16, 5), box(11, 5, 7, P("#5f8a9a"), [19.5, -10.3, -1.5]), box(11.2, 0.6, 7.2, P("#fbf1e2"), [19.5, -7.7, -1.5]),
  );
  return [room, props];
}

function benchBuild(low: boolean): [B.Mesh[], B.Mesh[]] {
  const peach = W("#c08650"), wood = wornMat("#b07a4a", "#5c3a24", 19), woodD = wornMat("#8c5a32", null, 27), metal = M.metal("#cfd3dc");
  // paleta de juguete (ref8): madera, rojo #E53935, amarillo #FBC02D, azul #42A5F5; el negro mate queda para detalles
  const fDark = wornMat("#4a2f1d", null, 23), fTeal = wornMat("#42A5F5", null, 41), fOrange = wornMat(M3C.naranja, null, 11), fYellow = wornMat("#FBC02D", null, 37), fRed = wornMat("#E53935", null, 31);
  const fDrawers = [fOrange, fTeal, fYellow, fRed, fTeal, fOrange, fYellow, fRed, fTeal];
  // Texturas que repiten distinto a lo ancho y a lo alto: agujeros del tablero perforado y grilla de la base de corte
  const tx = (c0: string, draw: (c: CanvasRenderingContext2D, s: number) => void, u: number, v: number) => { const t = canvasTex(64, (c, s) => { c.fillStyle = c0; c.fillRect(0, 0, s, s); draw(c, s); }); t.uScale = u; t.vScale = v; return t; };
  // tablones verticales de madera cálida: junta oscura a la izquierda y vetas; la base de corte pasa a tablas claras
  const peg = pbr("pegboard", { color: "#8a7a6a", rough: 0.9, tex: tx("#B07A4A", (c, s) => { c.fillStyle = "#8C5A32"; c.fillRect(0, 0, s * 0.07, s); c.fillStyle = "#9a6538"; for (const x of [0.3, 0.55, 0.8]) c.fillRect(s * x, 0, 2, s); c.fillStyle = "#5c3a24"; c.fillRect(s * 0.4, s * 0.2, 3, 3); }, 34, 2) });
  const mat = pbr("cutmat", { color: "#ffffff", rough: 0.85, tex: tx("#151a19", (c, s) => { c.strokeStyle = "#2a3a34"; c.lineWidth = 2; c.strokeRect(0, 0, s, s); }, 16, 11) });
  // Cuarto: piso, techo, pared con el tablero perforado, laterales
  // garaje de noche (ref321): piso de hormigón con manchas, paredes oscuras para que la luz de taller recorte al auto
  const conc = pbr("gConcrete", { color: "#8a8580", rough: 0.9, tex: (() => { const t = new B.Texture("./textures/c-hormigon-grietas.webp", lamp.getScene()); t.wrapU = t.wrapV = B.Texture.WRAP_ADDRESSMODE; t.uScale = 6; t.vScale = 5; return t; })() });
  const dark = W("#2a211b"), stain = M.matte("#0c0a09");
  const room = [
    box(180, 1, 140, conc, [0, -30.5, 0]), box(180, 2, 140, W("#1a1412"), [0, 50, 0]),
    box(180, 82, 2, dark, [0, 10, -18]), box(2, 82, 140, dark, [-70, 10, 0]), box(2, 82, 140, dark, [70, 10, 0]),
    cyl(9, 9, 0.1, stain, [-12, -29.9, 22], undefined, 10), cyl(5, 5, 0.1, stain, [18, -29.9, 30], undefined, 8),
    // estantes con cajas y latas (izquierda) y lámpara de taller colgante sobre el auto
    box(26, 0.8, 4, wood, [-40, 20, -14.5]), box(26, 0.8, 4, wood, [-40, 11, -14.5]),
    box(5, 4, 3.4, fYellow, [-48, 22.4, -14.5]), box(6, 3.2, 3.4, fTeal, [-41, 22, -14.5]), box(4.4, 5, 3.4, fRed, [-34, 22.8, -14.5]),
    ...[0, 1, 2, 3, 4].map((i) => cyl(1.5, 1.5, 3.2, [fRed, fYellow, fTeal, fOrange, fYellow][i], [-48 + i * 3.6, 13, -14.5], undefined, 8)),
    box(7, 4.4, 3.4, fDark, [-32, 13.4, -14.5]),
    cyl(0.12, 0.12, 20, fDark, [-6, 40, -4], undefined, 4), cyl(1.2, 5.2, 3, fRed, [-6, 28.5, -4], undefined, 10), sph(1.3, M.glow("#ffe2a8"), [-6, 27.2, -4]),
    box(68, 30, 0.6, peg, [0, 15.5, -16.6]),
    // estante de madera con cajas de colores (como en los estantes de ref8)
    box(20, 0.8, 4, wood, [5, 8, -14.5]), box(5, 3.4, 3.4, fRed, [-1, 10.1, -14.5]), box(4.4, 2.8, 3.4, fTeal, [4, 9.8, -14.5]), box(4, 2.2, 3.4, fYellow, [8.4, 9.5, -14.5]),
    box(70, 1.2, 1.2, fDark, [0, 31, -16.4]), box(70, 1.2, 1.2, fDark, [0, 0.4, -16.4]),
  ];
  // Peana de calibración / soporte de pits (Pit Stand) y cargador inteligente LiPo digital con puertos XT60
  const stand = [ // caballete rojo (ref8): base ancha, dos patas inclinadas, travesaño y franja amarilla; el tope sigue en y = 0.9
    box(3.4, 0.25, 4.6, fRed, [0, 0.12, 1]),
    box(0.35, 0.8, 3.8, fRed, [-1.15, 0.5, 1], [0, 0, 0.18]), box(0.35, 0.8, 3.8, fRed, [1.15, 0.5, 1], [0, 0, -0.18]),
    box(2.7, 0.18, 4, fRed, [0, 0.84, 1]), box(2.2, 0.06, 0.4, fYellow, [0, 0.95, 2.9]),
    box(2.6, 0.08, 0.6, M.rubber(), [0, 0.94, -0.6]), box(2.6, 0.08, 0.6, M.rubber(), [0, 0.94, 2.6]),
  ];
  const charger = [
    box(1.8, 0.8, 2.4, M.matte("#18181b"), [4.5, 0.4, 2.5], [0, -0.2, 0]),
    box(1.2, 0.02, 0.9, M.glow("#38bdf8"), [4.5, 0.81, 2.5], [0, -0.2, 0]),
    box(0.4, 0.3, 0.3, M.plastic("#eab308"), [5.4, 0.4, 2.3], [0, -0.2, 0])
  ];
  // pila de neumáticos, carro de herramientas rojo con cajones y dos tambores (ref8)
  const rub = M.matte("#2e2824");
  const tires = [0, 1, 2].flatMap((i) => [tor(3.6, 1.5, rub, [8, 0.75 + i * 1.5, -1 - i * 0.12], undefined, 12), cyl(1.2, 1.2, 0.2, fYellow, [8, 0.75 + i * 1.5, -1 - i * 0.12], undefined, 8)]);
  const cart = [
    box(7, 5.4, 4.2, fRed, [14, 2.7, -4]), box(7.4, 0.5, 4.6, fDark, [14, 5.6, -4]),
    ...[0, 1, 2].flatMap((r) => [box(6.2, 1.4, 0.3, fRed, [14, 1 + r * 1.6, -1.8]), box(6, 0.18, 0.35, metal, [14, 1.55 + r * 1.6, -1.55]), box(6.2, 0.1, 0.35, rub, [14, 0.28 + r * 1.6, -1.75])]),
    ...[[-3, 0], [3, 0]].map(([x]) => cyl(0.5, 0.5, 0.4, rub, [14 + x, 0.5, -1.9], [Math.PI / 2, 0, 0], 8)),
    cyl(0.7, 0.8, 1.6, fYellow, [12.5, 6.6, -4]), tor(1.8, 0.2, metal, [12.5, 7.45, -4], undefined, 8),
  ];
  const drums = [[fRed, 5], [fTeal, 8.6]].flatMap(([m, x]) => [cyl(2, 2, 4.4, m as B.Material, [x as number, 2.2, -8], undefined, 12), tor(4, 0.2, metal, [x as number, 3.1, -8], undefined, 12), tor(4, 0.2, metal, [x as number, 1.3, -8], undefined, 12)]);
  // achica un grupo de utilería sobre el suelo: (cx, cz) de origen -> (tx, tz)
  const fit = (n: string, parts: B.Mesh[], [cx, cz]: [number, number], k: number, [tx, tz]: [number, number]) => {
    const m = merge("bench_" + n, parts); m.scaling.setAll(k); m.position.set(tx - cx * k, 0, tz - cz * k); m.computeWorldMatrix(true); m.bakeCurrentTransformIntoVertices(); return m;
  };
  const props = [
    fit("tires", tires, [8, -1.2], 0.6, [5.5, -5]), fit("cart", cart, [14, -4], 0.75, [-1, -12.5]), fit("drums", drums, [6.8, -8], 0.55, [3.5, -12]),
    // mesa de taller con canto de chapa plegada y patas robustas, base de corte verde bajo el auto
    box(66, 2, 28, wood, [0, -1, -2]), box(66.2, 0.8, 0.5, fDark, [0, -1.4, 12.1]),
    ...[[-31, -14], [31, -14], [-31, 10], [31, 10]].map(([x, z]) => box(2.4, 28, 2.4, fDark, [x, -16, z])),
    box(16, 0.08, 11, mat, [0, 0.04, 1.5]),
    ...stand,
    ...charger,
    xt60Lead(metal, fDark),
    screwTray(metal, fDark),
    // herramientas colgadas en chapa gastada: llave, destornilladores, martillo, pinza, rollos de cable y cinta
    box(0.9, 8, 0.4, metal, [-26, 15.5, -16]), tor(2.4, 0.7, metal, [-26, 20.4, -16], [Math.PI / 2, 0, 0], 8),
    ...[[fRed, -21], [fTeal, -19], [fYellow, -17]].flatMap(([m, x]) => [cyl(1.1, 1.1, 3.2, m as B.Material, [x as number, 20.5, -15.8], undefined, 6), cyl(0.3, 0.3, 4.4, metal, [x as number, 16.7, -15.8], undefined, 6)]),
    box(0.8, 8, 0.6, woodD, [-11, 15.5, -15.8]), box(4.2, 1.5, 1.5, fDark, [-11, 20, -15.8]),
    box(0.5, 6, 0.4, metal, [-5.6, 17, -15.8], [0, 0, 0.18]), box(0.5, 6, 0.4, metal, [-4.4, 17, -15.8], [0, 0, -0.18]),
    box(0.9, 3, 0.6, fOrange, [-6.2, 13.6, -15.7], [0, 0, 0.18]), box(0.9, 3, 0.6, fOrange, [-3.8, 13.6, -15.7], [0, 0, -0.18]),
    tor(3.8, 1.3, fRed, [5, 20, -15.6], [Math.PI / 2, 0, 0], 10), tor(2.6, 1.1, fTeal, [11, 19.6, -15.6], [Math.PI / 2, 0, 0], 10),
    // repisa con frascos de piezas y tapas de chapa
    box(20, 0.8, 4, wood, [24, 24, -14.5]),
    ...[0, 1, 2, 3].flatMap((i) => [cyl(2.2, 2.2, 3, M.glass(), [17.5 + i * 4.3, 25.9, -14.5], undefined, 8), cyl(1.9, 1.9, 1.6, fDrawers[i], [17.5 + i * 4.3, 25.2, -14.5], undefined, 8), cyl(2.3, 2.3, 0.5, fDark, [17.5 + i * 4.3, 27.6, -14.5], undefined, 8)]),
    // cajonera industrial de chapa plegada 3x3 (pantalla del taller)
    box(14.2, 8.6, 6, fDark, [22, 4.3, -10]),
    ...[0, 1, 2].flatMap((r) => [0, 1, 2].flatMap((k) => [box(4, 2.3, 0.35, fDrawers[(r * 3 + k) % fDrawers.length], [17.6 + k * 4.4, 1.5 + r * 2.7, -6.9]), box(1.4, 0.35, 0.4, metal, [17.6 + k * 4.4, 1.5 + r * 2.7, -6.65])])),
    // flexo de juguete: base, brazo articulado y pantalla facetada con foco adentro (sin atravesar el cono)
    cyl(3.4, 3.8, 0.7, fTeal, [9, 0.35, -6], undefined, 8), cyl(2.2, 2.6, 0.35, fDark, [9, 0.8, -6], undefined, 8),
    tube([[9, 0.9, -6], [7.5, 7.2, -5]], 0.34, fDark), tube([[7.5, 7.2, -5], [3.5, 8.7, -1.9]], 0.34, fDark),
    sph(0.85, metal, [9, 0.95, -6]), sph(0.85, metal, [7.5, 7.2, -5]), sph(0.8, metal, [3.5, 8.7, -1.9]),
    cyl(1.5, 1.6, 0.7, fDark, [3.25, 8.45, -1.72], [0.35, 0, 0.35], 8),
    cyl(1.4, 3.8, 2.4, fTeal, [2.9, 7.6, -1.4], [0.35, 0, 0.35], 8),
    sph(1.1, M.glow("#fff0c8"), [2.68, 7.0, -1.18]),
    // transmisor RC de chapa gastada
    ...transmitter(fDark, fOrange, fRed, metal),
    // soporte de pits (Pit Stand), cargador inteligente LiPo digital y botes de silicona/spray
    ...pitStand(fDark, metal, M.rubber()),
    ...lipoCharger(fTeal, metal, fDark),
    ...siliconeOils(fYellow, fRed, metal),
    // organizador escalonado de llaves Allen, comprobador de celdas LiPo, morsa, taladro, fresadora, compresor, generador y carretel de juguete
    allenRack(metal, fDark),
    cellMeter(fDark, metal),
    place(toy("benchVise"), [-28, 0, 10], [0, 0.55, 0]),
    place(toy("drillPress"), [-30, 0, -8], [0, 0.35, 0]),
    place(toy("millingMachine"), [-33, 0, 5], [0, 0.4, 0]),
    place(toy("airCompressor"), [-30, 0, 16], [0, -0.3, 0]),
    place(toy("gasGenerator"), [-28, 0, 20], [0, 0.2, 0]),
    digitalTireGauge(metal, fDark),
    airHoseAndBlowGun(metal, fDark),
    magnifierLamp(metal, fDark),
    machineLamp(metal, fDark),
    drillViseAndChips(metal, fDark),
    balanceLead(),
    place(toy("hoseReel"), [-33, 11, 14], [0, 0.4, 0]),
    place(frlAirUnit(metal, fDark), [-33, 9, 8], [0, 0, 0]),
    // repuestos: dos ruedas, batería con bornes y cables, tornillos y tuercas, latas de pintura, destornillador suelto, taza enlozada
    place(wheel(2, 1, "#8a5a3a"), [6.5, 0.5, 6.5], [0, 0.4, Math.PI / 2]), place(wheel(2, 1, "#3a6b7c"), [8.6, 1.0, 4.4], [0, -0.3, 0]),
    box(3.6, 1.4, 1.7, fTeal, [-14, 0.7, 4.5]), box(3.65, 0.45, 1.75, fDark, [-14, 1.25, 4.5]),
    tube([[-12.2, 0.6, 4.2], [-10.8, 0.2, 5.6], [-9, 0.2, 5.8]], 0.12, fRed), tube([[-12.2, 0.6, 4.8], [-11, 0.2, 6.6], [-9.4, 0.2, 7]], 0.12, fDark),
    ...[[-0.6, 8], [4.8, 7.2], [-5, 7.5], [10.5, 8], [-6.8, 6.4]].map(([x, z], i) => (i % 2 ? tor(0.6, 0.24, metal, [x, 0.12, z], undefined, 6) : cyl(0.28, 0.28, 1.2, metal, [x, 0.14, z], [0, i, Math.PI / 2], 6))),
    ...[0, 1, 2, 3].flatMap((i) => [cyl(1.5, 1.5, 1.7, fDrawers[i], [-21 + i * 1.9, 0.85, 7.5 - (i % 2) * 1.2], undefined, 8), cyl(1.6, 1.6, 0.35, metal, [-21 + i * 1.9, 1.85, 7.5 - (i % 2) * 1.2], undefined, 8)]),
    cyl(0.9, 0.9, 2.6, fYellow, [4.2, 0.45, 10.2], [0, 0.5, Math.PI / 2], 6), cyl(0.25, 0.25, 3, metal, [6.6, 0.45, 8.8], [0, 0.5, Math.PI / 2], 6),
  ];
  if (!low) props.push(cyl(2.6, 2.4, 3, fRed, [-25, 1.5, -3], undefined, 8), tor(1.6, 0.35, fRed, [-23.6, 1.6, -3], [Math.PI / 2, 0, 0], 8), cyl(2.2, 2.2, 0.1, W("#4a2e1b"), [-25, 2.95, -3], undefined, 8));
  return [room, props];
}
function pitStand(fDark: B.Material, metal: B.Material, rubber: B.Material): B.Mesh[] {
  const parts = [
    cyl(5.6, 6.2, 0.4, fDark, [0, 0.2, 0], undefined, 8),
    cyl(2.8, 3.0, 0.15, metal, [0, 0.42, 0], undefined, 8),
    tor(0.5, 0.18, metal, [0.4, 0.52, 0.3], undefined, 6),
    cyl(0.2, 0.2, 0.8, metal, [-0.5, 0.52, -0.2], [0, 0.4, Math.PI / 2], 6),
    cyl(1.4, 1.6, 2.2, metal, [0, 1.4, 0], undefined, 8),
    tor(1.8, 0.25, fDark, [0, 2.4, 0], undefined, 8),
    // Arandela de teflón autolubricada y collar giratorio 360° en aluminio
    cyl(2.4, 2.4, 0.08, M.plastic("#f8fafc"), [0, 2.48, 0], undefined, 12),
    tor(2.2, 0.15, metal, [0, 2.52, 0], undefined, 12),
    // Plato superior giratorio 360° en aluminio con marcas graduadas de alineación
    box(7.5, 0.3, 4.8, metal, [0, 2.65, 0]),
    cyl(2.6, 2.6, 0.08, metal, [0, 2.76, 0], undefined, 16),
    // Dial circular graduado con marcas de alineación 360° y cuadrantes
    cyl(2.2, 2.2, 0.04, fDark, [0, 2.81, 0], undefined, 16),
    box(0.1, 0.05, 0.45, metal, [0, 2.83, 0.85]),
    box(0.1, 0.05, 0.45, metal, [0, 2.83, -0.85]),
    box(0.45, 0.05, 0.1, metal, [0.85, 2.83, 0]),
    box(0.45, 0.05, 0.1, metal, [-0.85, 2.83, 0]),
    ...[Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].map((a) =>
      box(0.08, 0.05, 0.28, metal, [Math.cos(a) * 0.82, 2.83, Math.sin(a) * 0.82], [0, -a, 0])
    ),
    box(0.16, 0.06, 0.24, M.plastic("#ef4444"), [0, 2.83, 1.15]),
    // Orificios calibrados de sujeción para purgado y mantenimiento de amortiguadores
    cyl(0.7, 0.7, 0.06, fDark, [-2.6, 2.81, 0], undefined, 8),
    cyl(0.7, 0.7, 0.06, fDark, [2.6, 2.81, 0], undefined, 8),
    tor(0.78, 0.07, metal, [-2.6, 2.81, 0], undefined, 8),
    tor(0.78, 0.07, metal, [2.6, 2.81, 0], undefined, 8),
    // Tiras de goma antideslizante para posar chasis
    box(7.2, 0.15, 0.8, rubber, [0, 2.85, 1.8]),
    box(7.2, 0.15, 0.8, rubber, [0, 2.85, -1.8]),
  ];
  const s = merge("pitStand", parts);
  s.position.set(-7.5, 0, -3.5);
  s.rotation.y = 0.25;
  return [s];
}
export function allenRack(metal: B.Material, fDark: B.Material): B.Mesh {
  const anodized = M.metal("#0284c7");
  const ringColors = ["#ef4444", "#eab308", "#3b82f6", "#18181b"]; // 1.5, 2.0, 2.5, 3.0 mm
  const shaftDiameters = [0.12, 0.16, 0.2, 0.24];
  const parts: B.Mesh[] = [
    // Base escalonada CNC en aluminio anodizado azul
    box(4.8, 0.3, 2.0, anodized, [0, 0.15, 0]),
    box(4.9, 0.06, 2.1, anodized, [0, 0.03, 0]),
  ];
  for (let i = 0; i < 4; i++) {
    const x = -1.65 + i * 1.1;
    const hStep = 0.55 + i * 0.2;
    // Bloque escalonado para cada destornillador
    parts.push(
      box(1.05, hStep, 1.8, anodized, [x, 0.3 + hStep / 2, 0]),
      tor(0.7, 0.08, metal, [x, 0.3 + hStep + 0.02, 0], undefined, 8),
      cyl(0.52, 0.52, 0.06, fDark, [x, 0.3 + hStep + 0.03, 0], undefined, 8)
    );
    const yHandleBottom = 0.3 + hStep + 0.05;
    const dH = 0.74;
    // Mango cilíndrico moleteado en aluminio con anillos de colores distintivos
    parts.push(
      cyl(0.52, dH, 0.3, metal, [x, yHandleBottom + 0.15, 0], undefined, 8),
      cyl(dH, dH, 1.6, metal, [x, yHandleBottom + 1.1, 0], undefined, 10),
      tor(dH * 0.96, 0.05, fDark, [x, yHandleBottom + 0.6, 0], undefined, 8),
      tor(dH * 0.96, 0.05, fDark, [x, yHandleBottom + 0.95, 0], undefined, 8),
      tor(dH * 0.96, 0.05, fDark, [x, yHandleBottom + 1.3, 0], undefined, 8),
      tor(dH * 0.96, 0.05, fDark, [x, yHandleBottom + 1.65, 0], undefined, 8),
      cyl(dH * 1.02, dH * 1.02, 0.26, M.plastic(ringColors[i]), [x, yHandleBottom + 1.95, 0], undefined, 8),
      cyl(0.66, 0.72, 0.25, anodized, [x, yHandleBottom + 2.2, 0], undefined, 8),
      sph(0.48, metal, [x, yHandleBottom + 2.35, 0])
    );
    // Vástago de acero templado pulido extendiéndose hacia abajo en el orificio calibrado
    const dS = shaftDiameters[i];
    parts.push(
      cyl(dS, dS, hStep + 0.2, metal, [x, 0.3 + (hStep + 0.2) / 2, 0], undefined, 6)
    );
  }
  const s = merge("allenRack", parts);
  s.position.set(16, 0, -4.5);
  s.rotation.y = -0.15;
  return s;
}
export function cellMeter(fDark: B.Material, metal: B.Material): B.Mesh {
  const poly = M.matte("#18181b");
  const parts: B.Mesh[] = [
    // Carcasa compacta de policarbonato mate
    box(2.6, 0.42, 1.6, poly, [0, 0.21, 0]),
    box(2.5, 0.06, 1.5, poly, [0, 0.43, 0]),
    box(0.8, 0.02, 0.18, fDark, [-0.65, 0.47, 0.55]),
    // 3 pulsadores táctiles frontales (Mode, Cell, Type)
    cyl(0.22, 0.22, 0.08, metal, [0.3, 0.48, 0.55], undefined, 8),
    cyl(0.22, 0.22, 0.08, metal, [0.65, 0.48, 0.55], undefined, 8),
    cyl(0.22, 0.22, 0.08, metal, [1.0, 0.48, 0.55], undefined, 8),
    // Pantalla LCD azul/cian reflectiva brillante con segmentos de lectura
    box(1.7, 0.04, 0.85, fDark, [0, 0.46, -0.15]),
    box(1.55, 0.03, 0.72, M.glow("#38bdf8"), [0, 0.48, -0.15]),
    box(0.32, 0.04, 0.16, fDark, [-0.48, 0.5, -0.15]),
    box(0.32, 0.04, 0.16, fDark, [-0.1, 0.5, -0.15]),
    box(0.32, 0.04, 0.16, fDark, [0.28, 0.5, -0.15]),
    box(1.1, 0.03, 0.06, fDark, [-0.05, 0.5, 0.12]),
    box(0.45, 0.03, 0.08, fDark, [0.38, 0.5, -0.32]),
    // Puerto de pines de balanceo multipin JST-XH en plástico blanco en el lateral
    box(0.22, 0.28, 1.1, M.plastic("#f8fafc"), [1.32, 0.23, -0.1]),
  ];
  for (let p = 0; p < 7; p++) {
    parts.push(
      box(0.08, 0.08, 0.08, metal, [1.37, 0.23, -0.48 + p * 0.14]),
      box(0.04, 0.12, 0.08, fDark, [1.41, 0.23, -0.48 + p * 0.14])
    );
  }
  const s = merge("cellMeter", parts);
  s.position.set(-10, 0, 4.2);
  s.rotation.y = 0.35;
  return s;
}

export function magnifierLamp(metal: B.Material, fDark: B.Material): B.Mesh {
  const parts: B.Mesh[] = [];

  // 1. Mordaza C de fundición con tornillo de apriete sujeta al borde lateral de la mesa de trabajo [-32, 0, 0]
  parts.push(
    box(1.8, 0.28, 1.6, fDark, [-32, 0.14, 0]),
    box(0.4, 2.6, 1.6, fDark, [-32.8, -1.05, 0]),
    box(1.6, 0.35, 1.6, fDark, [-32.1, -2.2, 0]),
    cyl(0.28, 0.28, 1.4, metal, [-31.8, -2.8, 0], undefined, 8),
    cyl(0.8, 0.8, 0.12, metal, [-31.8, -2.05, 0], undefined, 8),
    cyl(0.14, 0.14, 1.4, metal, [-31.8, -3.4, 0], [Math.PI / 2, 0, 0], 6),
    sph(0.22, metal, [-31.8, -3.4, 0.7]),
    sph(0.22, metal, [-31.8, -3.4, -0.7]),
    cyl(1.3, 1.5, 0.5, fDark, [-32, 0.45, 0], undefined, 10),
    cyl(0.7, 0.7, 0.35, metal, [-32, 0.8, 0], undefined, 8),
    box(0.7, 0.9, 0.8, fDark, [-32, 1.35, 0]),
    cyl(0.2, 0.2, 0.9, metal, [-32, 1.35, 0], [0, 0, Math.PI / 2], 6),
    cyl(0.65, 0.65, 0.25, fDark, [-32.5, 1.35, 0], [0, 0, Math.PI / 2], 8)
  );

  // 2. Brazos dobles paralelos articulados en varilla de acero pulido con codos basculantes y muelles tensores
  parts.push(
    tube([[-32, 1.35, -0.26], [-26, 8.2, 0.14]], 0.1, metal),
    tube([[-32, 1.35, 0.26], [-26, 8.2, 0.66]], 0.1, metal),
    tube([[-31.1, 2.4, -0.26], [-31.1, 2.4, 0.26]], 0.08, metal),
    tube([[-26.9, 7.2, 0.14], [-26.9, 7.2, 0.66]], 0.08, metal),
    cyl(0.16, 0.16, 0.75, metal, [-31.6, 1.8, 0.0], [Math.PI / 2, 0, 0], 6),
    cyl(0.16, 0.16, 0.75, metal, [-27.2, 6.8, 0.4], [Math.PI / 2, 0, 0], 6),
    tube([[-31.6, 1.8, -0.2], [-27.2, 6.8, 0.2]], 0.07, metal),
    tube([[-31.6, 1.8, 0.2], [-27.2, 6.8, 0.6]], 0.07, metal)
  );
  for (let k = 1; k <= 5; k++) {
    parts.push(
      tor(0.16, 0.04, metal, [-31.6 + k * 0.73, 1.8 + k * 0.83, -0.2 + k * 0.066], [0.65, 0, 0], 6),
      tor(0.16, 0.04, metal, [-31.6 + k * 0.73, 1.8 + k * 0.83, 0.2 + k * 0.066], [0.65, 0, 0], 6)
    );
  }

  // Codo basculante intermedio con tensor
  parts.push(
    cyl(1.2, 1.2, 0.8, fDark, [-26, 8.2, 0.4], [Math.PI / 2, 0, 0], 12),
    cyl(0.3, 0.3, 1.05, metal, [-26, 8.2, 0.4], [Math.PI / 2, 0, 0], 8),
    cyl(0.55, 0.55, 0.2, fDark, [-26, 8.2, 0.88], [Math.PI / 2, 0, 0], 8),
    box(0.25, 0.75, 1.3, fDark, [-26, 8.2, 0.95], [0, 0.3, 0])
  );

  // Tramo superior del pantógrafo
  parts.push(
    tube([[-26, 8.2, 0.28], [-18, 6.8, 1.48]], 0.1, metal),
    tube([[-26, 8.2, 0.52], [-18, 6.8, 1.72]], 0.1, metal),
    tube([[-24.8, 8.0, 0.28], [-24.8, 8.0, 0.52]], 0.08, metal),
    tube([[-19.2, 7.0, 1.48], [-19.2, 7.0, 1.72]], 0.08, metal),
    tube([[-25.2, 8.4, 0.4], [-19.5, 7.3, 1.6]], 0.06, metal)
  );
  for (let k = 1; k <= 4; k++) {
    parts.push(
      tor(0.14, 0.035, metal, [-25.2 + k * 1.14, 8.4 - k * 0.22, 0.4 + k * 0.24], [-0.2, 0.3, 0], 6)
    );
  }

  // Articulación de muñeca / rótula
  parts.push(
    sph(0.5, metal, [-18, 6.8, 1.6]),
    box(0.6, 0.7, 0.5, fDark, [-17.5, 6.6, 1.7], [0.2, 0.4, -0.2]),
    cyl(0.18, 0.18, 0.7, metal, [-17.5, 6.6, 1.7], [Math.PI / 2, 0, 0], 6),
    tube([[-18, 6.8, 1.6], [-16.8, 6.2, 1.9], [-15.8, 5.8, 2.1]], 0.16, metal)
  );

  // 3. Cabezal anular circular en plástico oscuro con lente de aumento central (M.glass()) y anillo perimetral LED (M.glow("#f8fafc"))
  const headCenter: V3 = [-14.2, 5.2, 2.4];
  const headRot: V3 = [0.35, -0.4, 0.2];
  const headParts: B.Mesh[] = [
    tor(3.2, 0.45, fDark, [0, 0, 0], undefined, 16),
    cyl(3.8, 4.0, 0.35, fDark, [0, 0.05, 0], undefined, 16),
    tor(2.2, 0.18, fDark, [0, 0, 0], undefined, 16),
    cyl(2.1, 2.1, 0.1, M.glass(), [0, 0.02, 0], undefined, 16),
    sph(2.8, M.glass(), [0, 0.02, 0], [1, 0.08, 1], 12),
    tor(2.7, 0.16, M.glow("#f8fafc"), [0, -0.12, 0], undefined, 16),
    cyl(2.9, 2.9, 0.06, M.glow("#f8fafc"), [0, -0.14, 0], undefined, 16),
    box(0.35, 0.22, 0.7, fDark, [2.1, 0, 0], [0, 0.25, 0]),
    cyl(0.2, 0.2, 0.5, metal, [2.25, 0, 0], [0, 0, Math.PI / 2], 6),
    box(0.3, 0.2, 0.4, fDark, [-1.9, 0.2, 0]),
    box(0.16, 0.12, 0.24, M.glow("#22c55e"), [-1.9, 0.28, 0]),
    cyl(0.6, 0.6, 0.5, fDark, [-2.1, 0, 0], [Math.PI / 2, 0, 0], 8)
  ];
  const headMesh = merge("magnifierHead", headParts);
  place(headMesh, headCenter, headRot);
  headMesh.computeWorldMatrix(true);
  headMesh.bakeCurrentTransformIntoVertices();
  parts.push(headMesh);

  return merge("magnifierLamp", parts);
}

export function balanceLead(): B.Mesh {
  const poly = M.plastic("#f8fafc");
  const dark = M.matte("#18181b");
  const metal = M.metal("#cfd3dc");
  const parts: B.Mesh[] = [
    // 1. Conector de balanceo JST-XH en el lateral de la batería LiPo [-12.2, 0.75, 4.5]
    box(0.25, 0.22, 0.48, poly, [-12.2, 0.75, 4.5]),
    cyl(0.08, 0.08, 0.12, metal, [-12.1, 0.75, 4.38], [0, 0, Math.PI / 2], 4),
    cyl(0.08, 0.08, 0.12, metal, [-12.1, 0.75, 4.5], [0, 0, Math.PI / 2], 4),
    cyl(0.08, 0.08, 0.12, metal, [-12.1, 0.75, 4.62], [0, 0, Math.PI / 2], 4),
    box(0.35, 0.2, 0.45, poly, [-11.95, 0.75, 4.5]),

    // 2. Conector JST-XH insertado en el puerto del cellMeter [-8.65, 0.23, 4.62]
    box(0.32, 0.22, 0.55, poly, [-8.65, 0.23, 4.62], [0, 0.35, 0]),
    box(0.18, 0.18, 0.42, dark, [-8.85, 0.23, 4.68], [0, 0.35, 0]),

    // 3. 3 cables finos flexibles curvados (rojo, blanco, negro) conectando ambos puertos
    tube([
      [-11.75, 0.75, 4.40],
      [-11.2, 0.42, 4.32],
      [-10.6, 0.12, 4.28],
      [-10.0, 0.06, 4.30],
      [-9.5, 0.08, 4.38],
      [-9.1, 0.14, 4.50],
      [-8.85, 0.23, 4.58]
    ], 0.045, M.plastic("#ef4444")),
    tube([
      [-11.75, 0.75, 4.50],
      [-11.15, 0.40, 4.42],
      [-10.55, 0.11, 4.38],
      [-9.95, 0.06, 4.40],
      [-9.45, 0.08, 4.48],
      [-9.05, 0.14, 4.58],
      [-8.85, 0.23, 4.65]
    ], 0.045, poly),
    tube([
      [-11.75, 0.75, 4.60],
      [-11.1, 0.38, 4.52],
      [-10.5, 0.10, 4.48],
      [-9.9, 0.06, 4.50],
      [-9.4, 0.08, 4.58],
      [-9.0, 0.14, 4.66],
      [-8.85, 0.23, 4.72]
    ], 0.045, dark),

    // Abrazaderas / termorretráctil de retención de mazo
    tor(0.12, 0.04, dark, [-11.0, 0.32, 4.42], [0, 0.25, Math.PI / 2], 8),
    tor(0.12, 0.04, dark, [-9.9, 0.06, 4.40], [0, 0.15, Math.PI / 2], 8)
  ];
  return merge("balanceLead", parts);
}

export function machineLamp(metal: B.Material, fDark: B.Material): B.Mesh {
  const parts: B.Mesh[] = [
    // Base magnética / brida sujeta a la máquina
    box(0.8, 0.6, 0.8, fDark, [-30.2, 5.8, -7.2]),
    cyl(0.3, 0.3, 0.4, metal, [-30.2, 6.2, -7.2]),
    // Brazo articulado tubular doble con codos de apriete por palomilla
    tube([[-30.2, 6.4, -7.2], [-29.5, 7.6, -6.6], [-28.8, 6.8, -6.2]], 0.08, metal),
    sph(0.24, metal, [-29.5, 7.6, -6.6]),
    sph(0.24, metal, [-28.8, 6.8, -6.2]),
    // Campana reflectora cónica en verde forja con borde oscuro
    cyl(0.6, 1.4, 1.1, M.matte("#164e63"), [-28.8, 6.2, -6.2], [0.4, 0, 0], 12),
    tor(1.36, 0.08, fDark, [-28.8, 5.7, -6.0], [0.4, 0, 0], 12),
    // Foco emisor puntual cálido diegético
    sph(0.45, M.glow("#fff0c8"), [-28.8, 5.8, -6.0])
  ];
  return merge("machineLamp", parts);
}

export function drillViseAndChips(metal: B.Material, fDark: B.Material): B.Mesh {
  const parts: B.Mesh[] = [
    // Mini-morsa de máquina amarrada a las ranuras del taladro
    box(1.4, 0.4, 1.8, fDark, [-30, 3.85, -7.35], [0, 0.35, 0]),
    box(1.2, 0.28, 0.22, metal, [-30, 4.15, -7.95], [0, 0.35, 0]),
    box(1.2, 0.28, 0.22, metal, [-30, 4.15, -7.15], [0, 0.35, 0]),
    cyl(0.14, 0.14, 1.1, metal, [-30, 3.9, -6.5], [Math.PI / 2, 0.35, 0], 6),
    box(0.1, 0.6, 0.1, metal, [-30, 3.9, -5.9], [0, 0.35, 0]),
    // Cúmulo de virutas torneadas espiraladas en acero brillante sobre el plato
    tor(0.18, 0.04, metal, [-29.4, 3.75, -7.1], [0.6, 0.2, 0.4], 6),
    tor(0.14, 0.035, metal, [-29.6, 3.75, -7.6], [0.3, 0.8, -0.2], 6),
    tor(0.2, 0.045, metal, [-30.5, 3.75, -7.4], [-0.5, 0.4, 0.6], 6),
    tor(0.16, 0.038, metal, [-30.3, 3.75, -6.9], [0.2, -0.6, 0.3], 6)
  ];
  return merge("drillViseAndChips", parts);
}

export function airHoseAndBlowGun(metal: B.Material, fDark: B.Material): B.Mesh {
  const hoseMat = M.plastic("#eab308");
  const brassMat = M.metal("#d97706");
  const parts: B.Mesh[] = [];

  // 1. Cuerpo principal de la pistola de soplado en aluminio pulido (ergonómico)
  parts.push(
    box(0.42, 0.46, 1.25, metal, [11.8, 0.35, 7.2], [0, 0.3, 0]),
    // Ojal superior de colgado
    tor(0.36, 0.08, metal, [12.0, 0.58, 7.65], [0, 0.3, 0], 8),
    // Tapón trasero moleteado de ajuste de caudal de aire
    cyl(0.24, 0.24, 0.12, brassMat, [12.22, 0.35, 7.92], [0, 0.3, Math.PI / 2], 6),
    // Empuñadura angulada ergonómica en aluminio
    box(0.38, 1.15, 0.52, metal, [12.1, 0.28, 7.55], [-0.3, 0.3, 0]),
    // Incrustaciones de agarre texturizadas en plástico negro
    box(0.42, 0.88, 0.26, fDark, [12.05, 0.28, 7.42], [-0.3, 0.3, 0]),
    tor(0.36, 0.05, fDark, [12.1, 0.14, 7.6], [-0.3, 0.3, 0], 8)
  );

  // 2. Gatillo de accionamiento tipo palanca en plástico negro
  parts.push(
    box(0.14, 0.82, 0.14, fDark, [11.75, 0.30, 7.15], [-0.15, 0.3, 0]),
    cyl(0.08, 0.08, 0.44, metal, [11.78, 0.48, 7.05], [0, 0.3, Math.PI / 2], 6)
  );

  // 3. Boquilla tubular delgada curvada hacia abajo en acero pulido con boquilla de seguridad cónica
  parts.push(
    // Racor roscado hexagonal de acople de boquilla
    cyl(0.28, 0.28, 0.14, brassMat, [11.5, 0.35, 6.6], [0.3, 0, 0], 6),
    // Tubo curvado de soplado en acero pulido
    tube([
      [11.45, 0.35, 6.5],
      [11.1, 0.35, 5.8],
      [10.8, 0.28, 5.2],
      [10.6, 0.20, 4.7]
    ], 0.042, metal),
    // Boquilla de seguridad cónica (OSHA safety tip) con orificios de alivio
    cyl(0.12, 0.22, 0.24, metal, [10.58, 0.19, 4.65], [-0.35, 0.3, 0], 8),
    tor(0.22, 0.035, metal, [10.62, 0.20, 4.72], [-0.35, 0.3, 0], 8),
    cyl(0.06, 0.06, 0.05, fDark, [10.54, 0.18, 4.58], [-0.35, 0.3, 0], 6)
  );

  // 4. Racor de acople rápido macho en latón dorado en la base de la empuñadura
  parts.push(
    cyl(0.32, 0.32, 0.16, brassMat, [12.35, 0.18, 7.82], [-0.3, 0.3, 0], 6),
    cyl(0.22, 0.16, 0.24, brassMat, [12.46, 0.16, 7.94], [-0.3, 0.3, 0], 8),
    tor(0.22, 0.04, metal, [12.46, 0.16, 7.94], [-0.3, 0.3, 0], 8),
    cyl(0.25, 0.25, 0.18, fDark, [12.56, 0.17, 8.04], [-0.3, 0.3, 0], 8),
    tor(0.20, 0.035, metal, [12.65, 0.18, 8.14], [-0.3, 0.3, 0], 8)
  );

  // 5. Manguera espiralada helicoidal de poliuretano amarillo de alta resistencia
  const coils = 9;
  const stepsPerCoil = 12;
  const totalSteps = coils * stepsPerCoil;
  const hosePath: V3[] = [
    [12.6, 0.18, 8.08],
    [12.75, 0.22, 8.28],
    [12.95, 0.32, 8.48]
  ];
  for (let i = 0; i <= totalSteps; i++) {
    const t = i / totalSteps;
    const a = t * coils * Math.PI * 2;
    const r = 0.38;
    const cx = 13.0 + t * 0.95;
    const cz = 8.55 + t * 3.25;
    const cy = 0.42 + Math.sin(a) * r * 0.85;
    const px = cx + Math.cos(a) * 0.24;
    hosePath.push([px, Math.max(0.08, cy), cz]);
  }
  // Caída desde el borde de la mesa (z=12.1) hacia la zona del compresor en el piso
  hosePath.push(
    [14.05, 0.34, 11.9],
    [14.15, 0.12, 12.15],
    [14.1, -0.6, 12.35],
    [13.9, -1.8, 12.5],
    [13.7, -3.2, 12.6]
  );
  parts.push(tube(hosePath, 0.065, hoseMat));

  return merge("airHoseAndBlowGun", parts);
}

export function frlAirUnit(metal: B.Material, fDark: B.Material): B.Mesh {
  const brassMat = M.metal("#d97706");
  const glassMat = M.glass();
  const dialWhite = M.plastic("#f8fafc");
  const needleRed = M.plastic("#ef4444");
  const parts: B.Mesh[] = [];

  // 1. Pletina de montaje mural y bloque colector superior en aluminio mecanizado
  // Pletina mural de fijación a la pared izquierda
  parts.push(
    box(0.14, 2.4, 4.8, metal, [0.07, 0.4, 0]),
    box(0.18, 0.4, 4.9, fDark, [0.09, 0.4, 0]),
    // 4 tornillos de anclaje mural en esquinas
    cyl(0.22, 0.22, 0.12, fDark, [0.15, 1.3, -2.0], [0, 0, Math.PI / 2], 6),
    cyl(0.22, 0.22, 0.12, fDark, [0.15, 1.3, 2.0], [0, 0, Math.PI / 2], 6),
    cyl(0.22, 0.22, 0.12, fDark, [0.15, -0.5, -2.0], [0, 0, Math.PI / 2], 6),
    cyl(0.22, 0.22, 0.12, fDark, [0.15, -0.5, 2.0], [0, 0, Math.PI / 2], 6),
    // Separadores / cartelas de soporte entre pletina y colector
    box(0.55, 0.45, 0.5, metal, [0.42, 0.5, -1.6]),
    box(0.55, 0.45, 0.5, metal, [0.42, 0.5, 1.6]),
    // Bloques colectores modulares mecanizados (Filtro, Regulador, Lubricador)
    box(1.25, 1.15, 1.35, metal, [0.95, 0.5, -1.6]),
    box(1.35, 1.25, 1.45, metal, [1.0, 0.5, 0]),
    box(1.25, 1.15, 1.35, metal, [0.95, 0.5, 1.6]),
    // Bridas modulares intermedias de unión con tornillería
    box(1.4, 1.2, 0.24, fDark, [0.98, 0.5, -0.8]),
    box(1.4, 1.2, 0.24, fDark, [0.98, 0.5, 0.8]),
    cyl(0.12, 0.12, 0.1, metal, [1.62, 0.85, -0.8], [0, 0, Math.PI / 2], 6),
    cyl(0.12, 0.12, 0.1, metal, [1.62, 0.15, -0.8], [0, 0, Math.PI / 2], 6),
    cyl(0.12, 0.12, 0.1, metal, [1.62, 0.85, 0.8], [0, 0, Math.PI / 2], 6),
    cyl(0.12, 0.12, 0.1, metal, [1.62, 0.15, 0.8], [0, 0, Math.PI / 2], 6),
    // Racores roscados en los extremos (entrada y salida)
    cyl(0.48, 0.48, 0.32, brassMat, [0.95, 0.5, -2.35], [Math.PI / 2, 0, 0], 6),
    cyl(0.45, 0.45, 0.35, brassMat, [0.95, 0.5, 2.35], [Math.PI / 2, 0, 0], 6)
  );

  // 2. Vaso decantador de filtro de partículas y condensados en policarbonato con rejilla metálica
  parts.push(
    // Anillo roscado de acople superior
    cyl(1.15, 1.15, 0.22, fDark, [0.95, -0.15, -1.6], undefined, 12),
    // Vaso transparente de policarbonato
    cyl(1.02, 0.92, 2.25, glassMat, [0.95, -1.25, -1.6], undefined, 16),
    // Cartucho filtrante interno de bronce sinterizado y deflector centrífugo
    cyl(0.62, 0.62, 1.3, brassMat, [0.95, -0.9, -1.6], undefined, 10),
    cyl(0.85, 0.25, 0.16, fDark, [0.95, -0.38, -1.6], undefined, 10),
    // Nivel decantado de condensados acumulados en el fondo
    cyl(0.86, 0.82, 0.4, M.plastic("#38bdf8"), [0.95, -1.82, -1.6], undefined, 12),
    // Anillos protectores superior e inferior de la rejilla
    cyl(1.12, 1.12, 0.16, metal, [0.95, -0.32, -1.6], undefined, 12),
    cyl(1.0, 1.0, 0.16, metal, [0.95, -2.28, -1.6], undefined, 12)
  );
  // Rejilla metálica protectora ranurada alrededor del vaso de filtro
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    parts.push(
      box(0.08, 1.8, 0.08, metal, [
        0.95 + Math.cos(a) * 0.54,
        -1.3,
        -1.6 + Math.sin(a) * 0.54
      ])
    );
  }
  // Válvula inferior de purga automática de condensados con mando manual estriado
  parts.push(
    cyl(0.42, 0.42, 0.45, brassMat, [0.95, -2.52, -1.6], undefined, 6),
    tor(0.34, 0.07, fDark, [0.95, -2.58, -1.6], undefined, 8),
    cyl(0.18, 0.18, 0.32, metal, [0.95, -2.85, -1.6], undefined, 8)
  );

  // 3. Regulador de presión central con pomo giratorio y micro-manómetro analógico
  parts.push(
    // Cuello superior del regulador
    cyl(0.96, 0.96, 0.85, metal, [1.0, 1.45, 0], undefined, 12),
    // Anillo de bloqueo de presión
    cyl(0.92, 0.92, 0.18, metal, [1.0, 1.82, 0], undefined, 8),
    // Pomo giratorio estriado de ajuste en composite negro
    cyl(0.82, 0.82, 0.65, fDark, [1.0, 2.1, 0], undefined, 12),
    cyl(0.72, 0.72, 0.07, metal, [1.0, 2.44, 0], undefined, 8)
  );
  // Ranuras verticales del pomo
  for (let k = 0; k < 6; k++) {
    const ka = (k * Math.PI) / 3;
    parts.push(
      box(0.06, 0.55, 0.06, metal, [
        1.0 + Math.cos(ka) * 0.42,
        2.1,
        Math.sin(ka) * 0.42
      ])
    );
  }
  // Micro-manómetro analógico frontal (orientado hacia +X hacia el centro del taller)
  parts.push(
    // Racor de conexión entre bloque y manómetro
    cyl(0.26, 0.26, 0.38, brassMat, [1.74, 0.5, 0], [0, 0, Math.PI / 2], 6),
    // Caja trasera del manómetro en cromo/aluminio
    cyl(1.12, 1.12, 0.32, metal, [2.05, 0.5, 0], [0, 0, Math.PI / 2], 16),
    // Esfera blanca de lectura
    cyl(1.0, 1.0, 0.04, dialWhite, [2.19, 0.5, 0], [0, 0, Math.PI / 2], 16),
    // Bisel cromado perimetral
    tor(1.0, 0.11, metal, [2.19, 0.5, 0], [0, Math.PI / 2, 0], 16),
    // Lente transparente frontal
    cyl(0.98, 0.98, 0.02, glassMat, [2.22, 0.5, 0], [0, 0, Math.PI / 2], 16),
    // Aguja indicadora roja marcando presión de red (~6 bar)
    box(0.03, 0.38, 0.04, needleRed, [2.2, 0.63, 0.08], [0, 0, -0.4]),
    cyl(0.12, 0.12, 0.06, metal, [2.21, 0.5, 0], [0, 0, Math.PI / 2], 8)
  );
  // Marcas perimetrales graduadas en la esfera del manómetro
  for (let m = 0; m < 5; m++) {
    const ma = -0.9 + m * 0.45;
    parts.push(
      box(0.02, 0.08, 0.03, fDark, [
        2.2,
        0.5 + Math.sin(ma) * 0.38,
        Math.cos(ma) * 0.38
      ], [ma, 0, 0])
    );
  }

  // 4. Vaso lubricador de aceite neumático en policarbonato con visor de gotas en latón
  parts.push(
    // Anillo roscado de acople superior
    cyl(1.15, 1.15, 0.22, fDark, [0.95, -0.15, 1.6], undefined, 12),
    // Vaso transparente de policarbonato
    cyl(1.02, 0.92, 2.25, glassMat, [0.95, -1.25, 1.6], undefined, 16),
    // Aceite neumático transparente/dorado en el fondo
    cyl(0.88, 0.82, 1.25, brassMat, [0.95, -1.48, 1.6], undefined, 14),
    // Tubo de aspiración capilar sumergido con filtro sinterizado
    cyl(0.08, 0.08, 1.85, brassMat, [0.95, -1.15, 1.6], undefined, 6),
    sph(0.18, brassMat, [0.95, -1.98, 1.6]),
    // Anillos protectores de la rejilla
    cyl(1.12, 1.12, 0.16, metal, [0.95, -0.32, 1.6], undefined, 12),
    cyl(1.0, 1.0, 0.16, metal, [0.95, -2.28, 1.6], undefined, 12)
  );
  // Rejilla metálica protectora ranurada alrededor del vaso lubricador
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    parts.push(
      box(0.08, 1.8, 0.08, metal, [
        0.95 + Math.cos(a) * 0.54,
        -1.3,
        1.6 + Math.sin(a) * 0.54
      ])
    );
  }
  // Visor de gotas / caudal de aceite en latón superior
  parts.push(
    cyl(0.58, 0.58, 0.36, brassMat, [0.95, 1.22, 1.6], undefined, 8),
    cyl(0.44, 0.44, 0.48, glassMat, [0.95, 1.58, 1.6], undefined, 10),
    sph(0.44, glassMat, [0.95, 1.8, 1.6]),
    // Boquilla dosificadora de micro-gotas en latón y micro-gota
    cyl(0.12, 0.12, 0.28, brassMat, [0.95, 1.62, 1.6], undefined, 6),
    sph(0.09, brassMat, [0.95, 1.48, 1.6]),
    // Tornillo micrométrico superior de regulación de goteo
    cyl(0.25, 0.25, 0.24, metal, [0.95, 2.08, 1.6], undefined, 6),
    box(0.04, 0.06, 0.2, fDark, [0.95, 2.18, 1.6])
  );

  // 5. Bajante vertical de tubería rígida de cobre/latón con dos abrazaderas murales
  // Conexión acodada desde la entrada del filtro hacia la bajante mural
  parts.push(
    cyl(0.38, 0.38, 0.42, brassMat, [0.95, 0.5, -2.5], [Math.PI / 2, 0, 0], 8),
    sph(0.34, brassMat, [0.95, 0.5, -2.68]),
    tube([
      [0.95, 0.5, -2.68],
      [0.32, 0.5, -2.68],
      [0.32, 0.5, -2.5]
    ], 0.12, brassMat),
    sph(0.32, brassMat, [0.32, 0.5, -2.5]),
    // Tubo vertical de cobre/latón bajando directo hacia la mesa de trabajo (y = -9)
    tube([
      [0.32, 0.5, -2.5],
      [0.32, -9.0, -2.5]
    ], 0.13, brassMat),
    // Válvula de bola de corte rápido con palanca roja cerca de la mesa
    cyl(0.36, 0.36, 0.42, brassMat, [0.32, -8.1, -2.5], undefined, 8),
    box(0.08, 0.14, 0.68, needleRed, [0.46, -8.05, -2.2], [0.3, 0, 0]),
    // Conector rápido hembra de salida en la base
    cyl(0.34, 0.34, 0.32, brassMat, [0.32, -8.8, -2.5], undefined, 8)
  );
  // Abrazaderas murales de fijación a la pared (y = -3.2 y y = -6.8)
  for (const yClamp of [-3.2, -6.8]) {
    parts.push(
      // Pletina base contra la pared
      box(0.08, 0.45, 0.88, metal, [0.04, yClamp, -2.5]),
      // Abrazadera omega envolvente
      box(0.34, 0.26, 0.36, metal, [0.2, yClamp, -2.5]),
      // Junta aislante de goma
      box(0.08, 0.22, 0.32, fDark, [0.31, yClamp, -2.5]),
      // Tornillos de anclaje de la abrazadera a pared
      cyl(0.1, 0.1, 0.1, fDark, [0.09, yClamp, -2.8], [0, 0, Math.PI / 2], 6),
      cyl(0.1, 0.1, 0.1, fDark, [0.09, yClamp, -2.2], [0, 0, Math.PI / 2], 6)
    );
  }

  return merge("frlAirUnit", parts);
}

function lipoCharger(fTeal: B.Material, metal: B.Material, fDark: B.Material): B.Mesh[] {
  const parts = [
    box(5.2, 1.6, 3.6, fTeal, [0, 0.8, 0]),
    box(2.8, 0.05, 1.2, M.glow("#06b6d4"), [0, 1.62, -0.4]),
    box(3.0, 0.04, 1.4, fDark, [0, 1.61, -0.4]),
    ...[-1.2, -0.4, 0.4, 1.2].map((x) => box(0.45, 0.12, 0.35, metal, [x, 1.66, 0.9])),
    cyl(0.35, 0.35, 0.4, M.plastic("#ef4444"), [2.7, 0.8, -0.6], [0, 0, Math.PI / 2], 6),
    cyl(0.35, 0.35, 0.4, fDark, [2.7, 0.8, 0.6], [0, 0, Math.PI / 2], 6),
    box(0.2, 0.4, 1.4, M.plastic("#fafafa"), [-2.65, 0.8, 0]),
    tube([[2.7, 0.8, -0.6], [4.2, 0.3, -0.2], [5.5, 0.1, 0.8]], 0.09, M.plastic("#ef4444")),
    tube([[2.7, 0.8, 0.6], [4.4, 0.3, 1.0], [5.8, 0.1, 1.8]], 0.09, fDark),
    box(0.65, 0.3, 0.45, M.plastic("#eab308"), [6.0, 0.15, 1.3], [0, 0.45, 0]),
    box(0.25, 0.28, 0.42, fDark, [5.7, 0.14, 1.3], [0, 0.45, 0]),
  ];
  const c = merge("lipoCharger", parts);
  c.position.set(-17.5, 0, -2.5);
  c.rotation.y = 0.35;
  return [c];
}
export function screwTray(metal: B.Material, fDark: B.Material): B.Mesh {
  const parts = [
    // Base cilíndrica achatada con reborde elevado en aluminio pulido
    cyl(3.4, 3.6, 0.24, metal, [0, 0.12, 0], undefined, 16),
    tor(3.3, 0.3, metal, [0, 0.24, 0], undefined, 16),
    // Fondo interior magnético de goma oscura
    cyl(2.9, 2.9, 0.06, fDark, [0, 0.18, 0], undefined, 16),
    // Tornillos Allen métricos M3 diminutos desparramados en el fondo
    cyl(0.18, 0.18, 0.7, metal, [0.35, 0.24, 0.25], [0, 0.6, Math.PI / 2], 6),
    cyl(0.34, 0.34, 0.2, metal, [0.08, 0.24, 0.1], [0, 0.6, Math.PI / 2], 6),
    cyl(0.18, 0.18, 0.7, metal, [-0.45, 0.24, -0.35], [0, -0.9, Math.PI / 2], 6),
    cyl(0.34, 0.34, 0.2, metal, [-0.72, 0.24, -0.18], [0, -0.9, Math.PI / 2], 6),
    cyl(0.18, 0.18, 0.65, metal, [0.6, 0.24, -0.45], [0, 1.3, Math.PI / 2], 6),
    cyl(0.34, 0.34, 0.2, metal, [0.86, 0.24, -0.38], [0, 1.3, Math.PI / 2], 6),
    cyl(0.18, 0.18, 0.7, metal, [-0.2, 0.24, 0.6], [0, -2.2, Math.PI / 2], 6),
    cyl(0.34, 0.34, 0.2, metal, [0.08, 0.24, 0.72], [0, -2.2, Math.PI / 2], 6),
    // Arandelas planas en acero
    tor(0.46, 0.1, metal, [-0.25, 0.23, -0.05], undefined, 8),
    tor(0.42, 0.09, metal, [0.4, 0.23, 0.7], undefined, 8),
    tor(0.5, 0.11, metal, [0.15, 0.23, -0.6], undefined, 8),
    // Pasadores R-clips de carrocería en acero
    tor(0.32, 0.06, metal, [-0.65, 0.24, 0.35], undefined, 8),
    cyl(0.08, 0.08, 0.7, metal, [-0.3, 0.24, 0.35], [0, 0, Math.PI / 2], 6),
    tor(0.24, 0.05, metal, [-0.3, 0.24, 0.45], undefined, 8),
    tor(0.32, 0.06, metal, [0.65, 0.24, -0.05], undefined, 8),
    cyl(0.08, 0.08, 0.7, metal, [0.35, 0.24, -0.15], [0, 0.6, Math.PI / 2], 6),
    tor(0.24, 0.05, metal, [0.4, 0.24, -0.24], undefined, 8),
  ];
  const s = merge("screwTray", parts);
  s.position.set(2.5, 0, 8.5);
  return s;
}
export function digitalTireGauge(metal: B.Material, fDark: B.Material): B.Mesh {
  const anodBlue = M.metal("#0284c7");
  const brass = M.metal("#d97706");
  const lcdGlow = M.glow("#38bdf8");
  const parts: B.Mesh[] = [];

  // 1. Carcasa de mano ergonómica en plástico azul anodizado con empuñadura bimateria engomada (fDark)
  parts.push(
    // Cuerpo principal ergonómico en azul anodizado
    box(1.15, 0.38, 2.3, anodBlue, [0, 0.19, 0]),
    // Biseles redondeados en los laterales
    cyl(0.36, 0.36, 2.2, anodBlue, [-0.54, 0.19, 0], [Math.PI / 2, 0, 0], 8),
    cyl(0.36, 0.36, 2.2, anodBlue, [0.54, 0.19, 0], [Math.PI / 2, 0, 0], 8),
    // Transición frontal estilizada hacia el cabezal de la boquilla
    box(0.95, 0.36, 0.55, anodBlue, [0, 0.19, 1.25]),
    cyl(0.85, 0.85, 0.36, anodBlue, [0, 0.19, 1.4], undefined, 12),
    // Culata / remate inferior redondeado con ojal pasante para cinta o lanyard
    cyl(0.88, 1.05, 0.45, anodBlue, [0, 0.19, -1.2], undefined, 10),
    tor(0.52, 0.08, fDark, [0, 0.19, -1.48], [Math.PI / 2, 0, 0], 10),
    cyl(0.24, 0.24, 0.18, metal, [0, 0.19, -1.48], [Math.PI / 2, 0, 0], 8),
    // Inserto de goma inferior antideslizante de base
    box(0.9, 0.04, 2.1, fDark, [0, 0.02, 0]),
    // Paneles laterales bimateria de elastómero antideslizante en composite negro
    box(0.1, 0.34, 1.85, fDark, [-0.58, 0.19, -0.12]),
    box(0.1, 0.34, 1.85, fDark, [0.58, 0.19, -0.12])
  );
  // Ranuras transversales antideslizantes para los dedos en los costados
  for (let r = 0; r < 5; r++) {
    const rz = -0.75 + r * 0.3;
    parts.push(
      box(0.14, 0.36, 0.09, fDark, [-0.58, 0.19, rz]),
      box(0.14, 0.36, 0.09, fDark, [0.58, 0.19, rz])
    );
  }

  // 2. Boquilla angular a 45° en latón pulido con collarín de asiento para válvulas Schrader/Presta
  parts.push(
    // Cuello de acople en azul anodizado en el extremo superior
    cyl(0.42, 0.42, 0.2, anodBlue, [0, 0.24, 1.52], [Math.PI / 4, 0, 0], 8),
    // Tuerca hexagonal mecanizada en latón en la transición
    cyl(0.44, 0.44, 0.12, brass, [0, 0.31, 1.59], [Math.PI / 4, 0, 0], 6),
    // Vástago cilíndrico angular a 45° en latón pulido
    cyl(0.28, 0.28, 0.55, brass, [0, 0.51, 1.79], [Math.PI / 4, 0, 0], 12),
    // Collarín de asiento para válvula (chuck head moleteado de modelismo)
    cyl(0.44, 0.44, 0.22, brass, [0, 0.70, 1.98], [Math.PI / 4, 0, 0], 16),
    tor(0.44, 0.08, brass, [0, 0.70, 1.98], [Math.PI / 4, 0, 0], 16),
    tor(0.46, 0.03, metal, [0, 0.65, 1.93], [Math.PI / 4, 0, 0], 12),
    // Junta interior de sellado neumático en composite negro
    cyl(0.24, 0.24, 0.08, fDark, [0, 0.76, 2.04], [Math.PI / 4, 0, 0], 12),
    // Vástago central depresor de obús de válvula Schrader/Presta en latón
    cyl(0.08, 0.08, 0.14, brass, [0, 0.76, 2.04], [Math.PI / 4, 0, 0], 6)
  );

  // 3. Micro-pantalla LCD azul retroiluminada mostrando lectura digital diegética en PSI
  parts.push(
    // Marco exterior biselado de la pantalla en composite negro
    box(0.92, 0.06, 1.14, fDark, [0, 0.39, 0.25]),
    // Filete metálico protector perimetral
    box(0.96, 0.04, 1.18, metal, [0, 0.37, 0.25]),
    // Panel LCD azul retroiluminado diegético
    box(0.76, 0.04, 0.94, lcdGlow, [0, 0.42, 0.25]),
    // Lente protectora frontal transparente de policarbonato
    box(0.80, 0.02, 0.98, M.glass(), [0, 0.45, 0.25]),
    // Segmentos digitales diegéticos (lectura fija de alta precisión "18.5 PSI" en fDark)
    // Dígito '1':
    box(0.04, 0.04, 0.28, fDark, [-0.22, 0.445, 0.35]),
    // Dígito '8':
    box(0.14, 0.04, 0.04, fDark, [-0.05, 0.445, 0.47]),
    box(0.14, 0.04, 0.04, fDark, [-0.05, 0.445, 0.35]),
    box(0.14, 0.04, 0.04, fDark, [-0.05, 0.445, 0.23]),
    box(0.04, 0.04, 0.28, fDark, [-0.11, 0.445, 0.35]),
    box(0.04, 0.04, 0.28, fDark, [0.01, 0.445, 0.35]),
    // Punto decimal:
    box(0.04, 0.04, 0.04, fDark, [0.08, 0.445, 0.22]),
    // Dígito '5':
    box(0.14, 0.04, 0.04, fDark, [0.19, 0.445, 0.47]),
    box(0.04, 0.04, 0.12, fDark, [0.13, 0.445, 0.41]),
    box(0.14, 0.04, 0.04, fDark, [0.19, 0.445, 0.35]),
    box(0.04, 0.04, 0.12, fDark, [0.25, 0.445, 0.29]),
    box(0.14, 0.04, 0.04, fDark, [0.19, 0.445, 0.23]),
    // Unidad diegética "PSI":
    box(0.04, 0.04, 0.14, fDark, [0.29, 0.445, 0.46]),
    box(0.06, 0.04, 0.06, fDark, [0.33, 0.445, 0.49]),
    box(0.08, 0.04, 0.10, fDark, [0.32, 0.445, 0.36])
  );

  // 4. Pulsador lateral metálico de purga micrométrica y botón pulsador frontal de encendido/puesta a cero
  parts.push(
    // Cuello lateral de la válvula de purga en latón
    cyl(0.24, 0.24, 0.12, brass, [-0.60, 0.22, 0.55], [0, 0, Math.PI / 2], 8),
    // Pulsador metálico estriado de alivio micrométrico de presión
    cyl(0.18, 0.18, 0.16, metal, [-0.70, 0.22, 0.55], [0, 0, Math.PI / 2], 12),
    tor(0.18, 0.03, metal, [-0.74, 0.22, 0.55], [0, 0, Math.PI / 2], 12),
    cyl(0.05, 0.05, 0.06, fDark, [-0.78, 0.22, 0.55], [0, 0, Math.PI / 2], 6),
    // Botón frontal circular de encendido / puesta a cero (Zero/Tare) bajo la pantalla
    cyl(0.38, 0.38, 0.04, fDark, [0, 0.39, -0.52], undefined, 12),
    cyl(0.28, 0.28, 0.08, metal, [0, 0.43, -0.52], undefined, 12),
    sph(0.09, lcdGlow, [0, 0.47, -0.52])
  );

  const g = merge("digitalTireGauge", parts);
  g.position.set(4.2, 0, 8.8);
  g.rotation.y = -0.25;
  return g;
}
function xt60Lead(metal: B.Material, fDark: B.Material): B.Mesh {
  const parts = [
    // Tramo de cable de silicona curvado de carga rápida (rojo y negro) sobre la alfombrilla de corte
    tube([[5.35, 0.4, 2.3], [4.6, 0.16, 2.2], [3.6, 0.12, 1.8], [2.6, 0.11, 1.4], [1.7, 0.11, 1.3], [1.25, 0.11, 1.05]], 0.08, M.plastic("#ef4444")),
    tube([[5.35, 0.4, 2.2], [4.5, 0.16, 2.05], [3.5, 0.12, 1.65], [2.5, 0.11, 1.25], [1.6, 0.11, 1.15], [1.18, 0.11, 0.95]], 0.08, fDark),
    // Conector hembra XT60 en plástico amarillo brillante apoyado sobre la alfombrilla de corte
    box(0.72, 0.32, 0.46, M.plastic("#eab308"), [0.85, 0.16, 0.95], [0, -0.4, 0]),
    box(0.26, 0.28, 0.42, fDark, [1.14, 0.16, 1.04], [0, -0.4, 0]),
    cyl(0.1, 0.1, 0.14, metal, [0.58, 0.16, 0.86], [0, -0.4, Math.PI / 2], 6),
    cyl(0.1, 0.1, 0.14, metal, [0.63, 0.16, 1.0], [0, -0.4, Math.PI / 2], 6),
  ];
  return merge("xt60Lead", parts);
}
function siliconeOils(fYellow: B.Material, fRed: B.Material, metal: B.Material): B.Mesh[] {
  const parts = [
    cyl(1.3, 1.4, 3.4, M.glass(), [0, 1.7, 0], undefined, 8),
    cyl(1.1, 1.2, 2.4, fYellow, [0, 1.3, 0], undefined, 8),
    cyl(0.3, 1.2, 1.0, fRed, [0, 3.8, 0], undefined, 8),
    cyl(0.15, 0.15, 0.8, fRed, [0, 4.4, 0], undefined, 6),
    cyl(1.6, 1.6, 4.8, metal, [2.6, 2.4, -0.4], undefined, 8),
    cyl(1.5, 1.5, 0.8, M.plastic("#2563eb"), [2.6, 5.0, -0.4], undefined, 8),
    cyl(0.1, 0.1, 1.2, fRed, [2.6, 5.2, 0.3], [Math.PI / 2, 0, 0], 4)
  ];
  const o = merge("siliconeOils", parts);
  o.position.set(13.8, 0, -5.2);
  o.rotation.y = -0.2;
  return [o];
}
function transmitter(fDark: B.Material, fOrange: B.Material, fRed: B.Material, metal: B.Material): B.Mesh[] {
  const parts = [
    box(5.2, 1.5, 3.2, fDark, [0, 0.95, 0]), box(5.5, 0.45, 3.5, fOrange, [0, 0.22, 0]),
    cyl(1.3, 1.3, 0.16, metal, [-1.4, 1.74, 0.3], undefined, 8), cyl(1.3, 1.3, 0.16, metal, [1.4, 1.74, 0.3], undefined, 8),
    cyl(0.22, 0.22, 1.3, metal, [-1.4, 2.2, 0.3], undefined, 6), sph(0.55, fRed, [-1.4, 2.9, 0.3]),
    cyl(0.22, 0.22, 1.3, metal, [1.4, 2.2, 0.3], [0.25, 0, 0], 6), sph(0.55, fRed, [1.4, 2.85, 0.45]),
    cyl(0.12, 0.25, 6.5, metal, [2.1, 4.6, -1.2], [-0.15, 0, -0.12], 6), sph(0.35, fOrange, [2.5, 7.8, -1.7]),
    box(1.8, 0.06, 0.8, M.glow("#7dffb0"), [0, 1.73, 1.05]),
  ];
  const t = merge("tx", parts);
  t.rotation.y = -0.45; t.position.set(14.5, 0, 3.5);
  return [t];
}
const place = (m: B.Mesh, pos: V3, rot: V3) => { m.position.set(...pos); m.rotation.set(...rot); return m; };

// Máquinas de taller de juguete (paleta Encore): cajas redondeadas y cilindros con pintura lisa; mismas posiciones y tamaños que las viejas piezas Folded.
function toy(kind: "benchVise" | "drillPress" | "millingMachine" | "airCompressor" | "gasGenerator" | "hoseReel"): B.Mesh {
  const c = (h: string) => M.plastic(h), red = c("#E53935"), yel = c("#FBC02D"), blu = c("#42A5F5"), grn = c("#66BB6A"), org = c("#FB8C00"), brn = c("#795548"), gry = c("#9E9E9E");
  const p: B.Mesh[] = [];
  if (kind === "benchVise") p.push(
    cyl(6.4, 6.8, 0.8, blu, [0, 0.4, 0]), rbox(3.6, 2.4, 4.4, 0.5, red, [0, 1.9, 0]), rbox(5.2, 1.4, 1.4, 0.4, red, [0, 2.4, 2.2]),
    rbox(1.2, 1.6, 0.8, 0.3, gry, [-1.2, 2.4, 3.1]), rbox(1.2, 1.6, 0.8, 0.3, gry, [1.2, 2.4, 3.1]),
    cyl(0.5, 0.5, 4.4, gry, [0, 1.2, 4.2], [Math.PI / 2, 0, 0], 8), cyl(0.5, 0.5, 3.6, yel, [0, 1.2, 6.2], [0, 0, Math.PI / 2], 8));
  else if (kind === "drillPress") p.push(
    rbox(3.4, 0.7, 4.2, 0.3, blu, [0, 0.35, 0.1]), cyl(1.1, 1.1, 8, gry, [0, 4.2, -1.1], undefined, 10), rbox(2.6, 2.2, 3.2, 0.5, yel, [0, 8.2, -0.3]),
    rbox(2.2, 1.4, 1.4, 0.4, red, [0, 6.6, 0.6]), cyl(0.5, 0.5, 2.6, gry, [0, 5.2, 1.4], undefined, 8), rbox(3.2, 0.5, 3, 0.2, org, [0, 2.4, 0.9]),
    cyl(0.3, 0.3, 2, gry, [2, 8.4, -0.3], [0, 0, Math.PI / 2], 6), sph(0.9, red, [2.9, 8.4, -0.3]));
  else if (kind === "millingMachine") p.push(
    rbox(3.8, 0.9, 4.8, 0.4, grn, [0, 0.45, -0.4]), rbox(2.2, 7, 2, 0.5, grn, [0, 4.2, -2]), rbox(3.4, 2.2, 3.4, 0.5, yel, [0, 8, -0.6]),
    cyl(0.8, 0.8, 2.2, gry, [0, 6.3, 0.6], undefined, 8), rbox(3.2, 0.9, 2.6, 0.3, org, [0, 2.4, 0.8]), rbox(3.6, 0.6, 3, 0.3, gry, [0, 3.1, 0.8]),
    sph(1, red, [2.6, 7.6, -0.6]));
  else if (kind === "airCompressor") p.push(
    cyl(4.4, 4.4, 7.6, red, [0, 2.6, 0], [Math.PI / 2, 0, 0], 16), rbox(1.6, 0.8, 4.4, 0.3, brn, [-1.3, 0.4, 0]), rbox(1.6, 0.8, 4.4, 0.3, brn, [1.3, 0.4, 0]),
    rbox(2.4, 2, 2.4, 0.5, yel, [0, 5.6, 0.4]), cyl(1.2, 1.2, 0.5, blu, [-1.4, 5.1, -1.8], [Math.PI / 2, 0, 0], 12), sph(0.8, gry, [1.2, 5.2, -1.6]));
  else if (kind === "gasGenerator") p.push(
    rbox(2.2, 0.5, 2.8, 0.2, brn, [0, 0.25, 0]), rbox(2.0, 1.8, 2.6, 0.5, org, [0, 1.4, 0]), rbox(1.2, 0.5, 2.2, 0.2, yel, [0, 2.45, 0]),
    sph(0.7, gry, [0.4, 2.9, 0.9]), rbox(0.7, 0.7, 0.3, 0.1, blu, [-0.6, 1.5, 1.4]));
  else p.push(
    rbox(1.4, 3.2, 0.3, 0.1, brn, [0, 0, -1.1]), cyl(2.8, 2.8, 0.7, org, [0, 0, -0.6], [Math.PI / 2, 0, 0], 16), cyl(1.4, 1.4, 1.1, yel, [0, 0, -0.5], [Math.PI / 2, 0, 0], 12),
    cyl(2.2, 2.2, 0.5, org, [0, 0, 0], [Math.PI / 2, 0, 0], 16), sph(0.7, red, [0.9, -1.7, 0.2]));
  return merge("toy_" + kind, p);
}


function cleanBuild(): [B.Mesh[], B.Mesh[]] {
  const scene = lamp.getScene();
  const bt = canvasTexture(scene, "menuBrick", 512, 256, brick); bt.uScale = 8; bt.vScale = 5; bt.wrapU = bt.wrapV = B.Texture.WRAP_ADDRESSMODE;
  const wall = pbr("menuBrickM", { color: "#ffffff", rough: 0.95, tex: bt });
  const floor = wornMat("#3b3833", null, 51);
  const room = [box(160, 1, 120, floor, [0, -0.5, 0]), box(160, 70, 2, wall, [0, 34, -19]), box(160, 2, 120, W("#14181f"), [0, 60, 0]),
    box(2, 70, 120, wall, [-60, 34, 0]), box(2, 70, 120, wall, [60, 34, 0])];
  return [room, []];
}

let curSet: SetId | null = null, curSec = "", fade = 1, moteT = 0, clock = 0;
const WARM = B.Color3.FromHexString("#ffc890");
const builtSet: Partial<Record<SetId, B.Mesh[]>> = {};
const builtSec: Record<string, { stat: B.Mesh[]; anim: { m: B.Mesh; a: "swing" | "spin"; ph: number }[] }> = {};
function buildSet(id: SetId, low: boolean) {
  const o = SETS[id].origin, [room, props] = SETS[id].build(low);
  const out = [merge("menu_" + id + "_room", room)];
  if (props.length) { const p = merge("menu_" + id + "_props", props); shadows.addShadowCaster(p); out.push(p); }
  for (const m of out) { m.position.addInPlace(new B.Vector3(...o)); m.isPickable = false; m.freezeWorldMatrix(); } // estáticos: sin recalcular la matriz cada cuadro
  return out;
}
function buildSec(k: string) {
  const s = SCENES[k], o = SETS[s.set].origin, stat: B.Mesh[] = [], anim: { m: B.Mesh; a: "swing" | "spin"; ph: number }[] = [];
  for (const p of s.props ?? []) {
    const parts = KIT[p.kit](p.u, p.v as never);
    for (const m of parts) { // el kit pinta con chapa gastada: en el menú todo es pintura lisa (el óxido pasa a madera pintada oscura)
      const n = m.material?.name ?? "";
      if (n === "kitrust") m.material = M.matte("#3a2f2a"); else if (n.startsWith("kit") && n.includes("|")) m.material = M.matte(n.slice(3).split("|")[0]);
    }
    if (p.anim) { // animada: malla propia con el pivote en su punto de apoyo (la lámpara cuelga de él)
      const m = merge("menu_" + k + "_" + p.kit, kitPut(parts, [0, 0, 0], p.rot));
      m.position.set(...add(o, p.at)); m.isPickable = false; shadows.addShadowCaster(m);
      anim.push({ m, a: p.anim, ph: anim.length * 1.7 });
    } else stat.push(...kitPut(parts, add(o, p.at), p.rot));
  }
  const out: B.Mesh[] = [];
  if (stat.length) { const m = merge("menu_" + k + "_props", stat); m.isPickable = false; m.freezeWorldMatrix(); shadows.addShadowCaster(m); out.push(m); }
  return { stat: out, anim };
}
const v3 = (o: V3, p: V3) => new B.Vector3(...add(o, p));

/** Cada cuadro del menú: enciende el escenario y la utilería de la sección (las arma la primera vez), luz, polvo, foco y animación ambiental.
 *  Devuelve true si cambió de escenario: main.ts corta la cámara al encuadre nuevo (la estática del menú tapa el corte y la escena aparece desde oscuro). */
export function menuTick(scr: string, cam: B.Camera, focus: B.Vector3, dt: number, low: boolean) {
  const k = sceneOf(scr), sc = SCENES[k], id = sc.set, set = SETS[id], cut = id !== curSet;
  if (cut) {
    if (!curSet) { showWorld(false); menuLights(true); }
    builtSet[id] ??= buildSet(id, low);
    for (const s of Object.keys(builtSet) as SetId[]) for (const m of builtSet[s]!) m.setEnabled(s === id);
    curSet = id; fade = 0;
  }
  if (k !== curSec) {
    builtSec[k] ??= buildSec(k);
    for (const [s, b] of Object.entries(builtSec)) for (const m of [...b.stat, ...b.anim.map((x) => x.m)]) m.setEnabled(s === k);
    curSec = k;
    applyClimate({ ...set.clim, ...sc.clim });
  }
  const L = { ...set.lamp, ...sc.lamp }, exp = sc.clim?.exposure ?? set.clim.exposure, o = set.origin, spot = v3(o, L.spot), to = v3(o, L.to);
  fade = Math.min(1, fade + dt * 2.5); clock += dt;
  lamp.getScene().imageProcessingConfiguration.exposure = exp * LOOK.exposure * (0.15 + 0.85 * fade * fade);
  lamp.position.copyFrom(spot); to.subtractToRef(spot, lamp.direction).normalize();
  lamp.intensity = L.spotI; lamp.angle = L.cone; glow.position.copyFrom(v3(o, L.glow)); glow.intensity = L.glowI;
  lamp.diffuse.copyFrom(WARM); // carModel pinta el foco con el faro del auto de muestra: en el menú manda la lámpara
  setDof(Math.max(1, B.Vector3.Dot(focus.subtract(cam.position), cam.getDirection(B.Axis.Z))), sc.dof ?? set.dof); // el desenfoque mide profundidad sobre el eje de la cámara, no distancia
  for (const x of builtSec[k].anim) { if (x.a === "swing") x.m.rotation.z = Math.sin(clock * 0.9 + x.ph) * 0.06; else x.m.rotation.y += dt * 0.5; }
  // Polvo que flota en el haz de la lámpara
  if ((moteT -= dt) <= 0) {
    moteT = low ? 0.16 : 0.07;
    const r = Math.random();
    ambient("mote", B.Vector3.Lerp(spot, to, 0.25 + r * 0.7).addInPlaceFromFloats((Math.random() - 0.5) * 6 * r, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 6 * r));
  }
  return cut;
}
/** Sale de los menús (partida o carrera): apaga las escenas, la profundidad de campo y la luz de lámpara; el mundo vuelve a verse. */
export function menuOff() {
  if (!curSet) return;
  for (const s of Object.keys(builtSet) as SetId[]) for (const m of builtSet[s]!) m.setEnabled(false);
  for (const b of Object.values(builtSec)) for (const m of [...b.stat, ...b.anim.map((x) => x.m)]) m.setEnabled(false);
  curSet = null; curSec = "";
  menuLights(false);
  setDof(0);
  showWorld(true);
}
