import * as B from "@babylonjs/core";
import { box, cyl, merge, sph, tor, tube, wheel } from "./models";
import { applyClimate, canvasTex, glow, lamp, LOOK, M, menuLights, pbr, setDof, shadows } from "./render";
import { ambient } from "./fx";
import { brick, canvasTexture, KIT, kitPut, M3C, wornMat, type KitId } from "./kit3d";
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
    clim: { sun: [-0.3, -0.85, -0.45], sunColor: "#cfe4e2", sunI: 1.1, hemiI: 0.5, amb: "#e0c8b0", ground: "#5f8a88",
      sky: ["#16353a", "#c98a5a", "#e0b090", "#16353a"], exposure: 1, fog: 0.005, ramp: ["#000000", "#808080", "#ffffff"] },
    lamp: { spot: [2.5, 6.4, -1], to: [-0.5, 0, 1.5], glow: [3, 8.5, -1.5], spotI: 7, glowI: 1.4, cone: 1.2 } },
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
  garage: { set: "bench", cam: { pos: [2, 4, 11], target: [-2.2, 2.2, 1] }, camV: { pos: [2.6, 3.8, 14], target: [0, -2.8, 1] }, car: [0, 0, 1],
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
  const peach = W("#d8b094"), wood = wornMat("#8a5a36", "#5c3a24", 19), woodD = wornMat("#5c3a24", null, 27), metal = M.metal("#cfd3dc");
  const fDark = wornMat("#262a30", null, 23), fTeal = wornMat("#3a6b7c", "#263840", 41), fOrange = wornMat(M3C.naranja, null, 11), fYellow = wornMat(M3C.amarillo, null, 37), fRed = wornMat("#a0452a", null, 31);
  const fDrawers = [fOrange, fTeal, fYellow, fRed, fTeal, fOrange, fYellow, fRed, fTeal];
  // Texturas que repiten distinto a lo ancho y a lo alto: agujeros del tablero perforado y grilla de la base de corte
  const tx = (c0: string, draw: (c: CanvasRenderingContext2D, s: number) => void, u: number, v: number) => { const t = canvasTex(64, (c, s) => { c.fillStyle = c0; c.fillRect(0, 0, s, s); draw(c, s); }); t.uScale = u; t.vScale = v; return t; };
  const peg = pbr("pegboard", { color: "#ffffff", rough: 0.9, tex: tx("#d8c29e", (c, s) => { c.fillStyle = "#8a7054"; c.beginPath(); c.arc(s / 2, s / 2, s * 0.12, 0, 7); c.fill(); }, 68, 30) });
  const mat = pbr("cutmat", { color: "#ffffff", rough: 0.85, tex: tx("#4c7c66", (c, s) => { c.strokeStyle = "#82b49c"; c.lineWidth = 1.5; c.strokeRect(0, 0, s, s); }, 16, 11) });
  // Cuarto: piso, techo, pared con el tablero perforado, laterales
  const room = [
    box(180, 1, 140, W("#8a664c"), [0, -30.5, 0]), box(180, 2, 140, W("#3c5a5c"), [0, 50, 0]),
    box(180, 82, 2, peach, [0, 10, -18]), box(2, 82, 140, peach, [-70, 10, 0]), box(2, 82, 140, peach, [70, 10, 0]),
    box(68, 30, 0.6, peg, [0, 15.5, -16.6]),
    box(70, 1.2, 1.2, fDark, [0, 31, -16.4]), box(70, 1.2, 1.2, fDark, [0, 0.4, -16.4]),
  ];
  const props = [
    // mesa de taller con canto de chapa plegada y patas robustas, base de corte verde bajo el auto
    box(66, 2, 28, wood, [0, -1, -2]), box(66.2, 0.8, 0.5, fDark, [0, -1.4, 12.1]),
    ...[[-31, -14], [31, -14], [-31, 10], [31, 10]].map(([x, z]) => box(2.4, 28, 2.4, fDark, [x, -16, z])),
    box(16, 0.08, 11, mat, [0, 0.04, 1.5]),
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
    // flexo industrial Folded: base pesada de chapa, brazo articulado oscuro y pantalla facetada con foco adentro (sin atravesar el cono)
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
    // repuestos: dos ruedas, batería con bornes y cables, tornillos y tuercas, latas de pintura, destornillador suelto, taza enlozada
    place(wheel(2, 1, "#8a5a3a"), [6.5, 0.5, 6.5], [0, 0.4, Math.PI / 2]), place(wheel(2, 1, "#3a6b7c"), [8.6, 1.0, 4.4], [0, -0.3, 0]),
    box(3.6, 1.4, 1.7, fTeal, [-14, 0.7, 4.5]), box(3.65, 0.45, 1.75, fDark, [-14, 1.25, 4.5]),
    tube([[-12.2, 0.6, 4.2], [-10.8, 0.2, 5.6], [-9, 0.2, 5.8]], 0.12, fRed), tube([[-12.2, 0.6, 4.8], [-11, 0.2, 6.6], [-9.4, 0.2, 7]], 0.12, fDark),
    ...[[3, 8], [4.2, 8.8], [-5, 7.5], [10.5, 8], [-6.8, 6.4]].map(([x, z], i) => (i % 2 ? tor(0.6, 0.24, metal, [x, 0.12, z], undefined, 6) : cyl(0.28, 0.28, 1.2, metal, [x, 0.14, z], [0, i, Math.PI / 2], 6))),
    ...[0, 1, 2, 3].flatMap((i) => [cyl(1.5, 1.5, 1.7, fDrawers[i], [-21 + i * 1.9, 0.85, 7.5 - (i % 2) * 1.2], undefined, 8), cyl(1.6, 1.6, 0.35, metal, [-21 + i * 1.9, 1.85, 7.5 - (i % 2) * 1.2], undefined, 8)]),
    cyl(0.9, 0.9, 2.6, fYellow, [3.4, 0.45, 9.8], [0, 0.5, Math.PI / 2], 6), cyl(0.25, 0.25, 3, metal, [5.8, 0.45, 8.4], [0, 0.5, Math.PI / 2], 6),
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
    box(7.5, 0.3, 4.8, metal, [0, 2.65, 0]),
    box(7.2, 0.15, 0.8, rubber, [0, 2.85, 1.8]),
    box(7.2, 0.15, 0.8, rubber, [0, 2.85, -1.8]),
  ];
  const s = merge("pitStand", parts);
  s.position.set(-7.5, 0, -3.5);
  s.rotation.y = 0.25;
  return [s];
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
    tube([[2.7, 0.8, 0.6], [4.4, 0.3, 1.0], [5.8, 0.1, 1.8]], 0.09, fDark)
  ];
  const c = merge("lipoCharger", parts);
  c.position.set(-17.5, 0, -2.5);
  c.rotation.y = 0.35;
  return [c];
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
