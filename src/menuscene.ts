import * as B from "@babylonjs/core";
import { box, cyl, merge, sph, tor, tube, wheel } from "./models";
import { applyClimate, canvasTex, glow, lamp, LOOK, M, menuLights, pbr, setDof, shadows } from "./render";
import { ambient } from "./fx";
import { showWorld } from "./world";

// Escenas de los menús (no de la partida), pastel suave y cálido con profundidad de campo:
// - ESTANTE de juguetes de noche (título, principal, bestiario, ficha, créditos): luna por la ventana, lámpara hongo, guirnalda.
//   El estante está en el origen: la ficha del bestiario (main.ts, beastTick) pone su pedestal ahí, sobre la tabla.
// - MESA de taller tipo diorama (garaje, taller, configuración): flexo sobre el auto, tablero de herramientas, cajoneras.
// Cada escena = dos mallas fusionadas (cuarto sin sombras propias + utilería que proyecta), armadas la primera vez que se ven.
// El mundo de juego se esconde mientras tanto (showWorld) y la luz de partida vuelve con menuOff().

type V3 = [number, number, number];
type Id = "shelf" | "bench";
const BENCH = new B.Vector3(0, 0, 400); // la mesa queda lejos del estante: nunca se ven juntas (solo una escena encendida)
const b = (x: number, y: number, z: number) => [x + BENCH.x, y + BENCH.y, z + BENCH.z];

// Encuadres: [cámara x, y, z, mira x, y, z]. main.ts los lee (y la ficha escribe SHOTS.beast en este mismo objeto).
export const SHOTS: Record<string, number[]> = {
  title: [2.3, 1, 4.4, -0.3, 0.75, 0],
  main: [-0.5, 3, 10.5, -6.3, 1.4, -1],
  bestiary: [-5, 4.2, 9.5, -9.5, 0.6, 0.5],
  credits: [10, 3.2, 15, 4, 10.5, -60],
  garage: [...b(2, 4, 11), ...b(-2.2, 2.2, 1)],
  shop: [...b(-4, 8, 14), ...b(10, 9, -14)],
  config: [...b(10, 4.2, 11), ...b(14.5, 1, 3.5)],
  // Celular vertical (_v): el auto centrado y más lejos; en principal y garaje queda arriba, sobre el menú
  title_v: [3.9, 1.7, 8, 0, 0.75, 0], main_v: [3.6, 1.2, 9.5, 0, 2.6, 0], garage_v: [...b(2.6, 2.8, 12), ...b(0, 2.6, 1)],
};
const SCENE: Record<string, Id> = { garage: "bench", shop: "bench", config: "bench" }; // el resto, estante
const sceneOf = (scr: string): Id => SCENE[scr] ?? "shelf";
/** Dónde va el auto de muestra en cada pantalla (null = sin auto). */
export const carSpot = (scr: string) => (scr === "garage" ? new B.Vector3(BENCH.x, BENCH.y, BENCH.z + 1) : scr === "title" || scr === "main" ? B.Vector3.Zero() : null);
export const CAR_YAW = 0.95; // estante: el auto mira hacia la cámara en 3/4

// Luz de cada escena: luna (sol de la escena, con sombras) lavanda, ambiente pastel y rebote durazno
type Clim = Parameters<typeof applyClimate>[0];
const CLIM: Record<Id, Clim> = {
  shelf: { sun: [0.35, -0.6, 0.72], sunColor: "#b9b0ff", sunI: 1.6, hemiI: 0.42, amb: "#c8b8f0", ground: "#f2c4a6",
    sky: ["#2a285a", "#6c5fa8", "#f2b8aa", "#3a3060"], exposure: 1, fog: 0.004, ramp: ["#000000", "#808080", "#ffffff"] },
  bench: { sun: [-0.3, -0.85, -0.45], sunColor: "#c9c2ff", sunI: 1.1, hemiI: 0.5, amb: "#f4dccb", ground: "#c4b2e6",
    sky: ["#3a2f55", "#d9b4a6", "#ecc6b4", "#3a2f55"], exposure: 1, fog: 0.005, ramp: ["#000000", "#808080", "#ffffff"] },
};
const DOF: Record<Id, number> = { shelf: 0.8, bench: 0.65 }; // cuánto se desenfoca el fondo lejano
// Lámpara de cada escena: foco (de dónde, hacia dónde) y resplandor cálido (la pantalla de la lámpara / la bombita del flexo)
const LAMP: Record<Id, { spot: B.Vector3; to: B.Vector3; glow: B.Vector3; spotI: number; glowI: number; cone: number }> = {
  shelf: { spot: new B.Vector3(8, 13, 8), to: new B.Vector3(-1, 0, 0), glow: new B.Vector3(22, 4.6, -3), spotI: 5, glowI: 2.2, cone: 0.9 },
  bench: { spot: new B.Vector3(...(b(2.5, 6.4, -1) as V3)), to: new B.Vector3(...(b(-0.5, 0, 1.5) as V3)), glow: new B.Vector3(...(b(3, 8.5, -1.5) as V3)), spotI: 7, glowI: 1.4, cone: 1.2 },
};

const PAST = ["#c7b3ec", "#f6c1a8", "#a9d8f0", "#b8e6c9", "#f7e3a1", "#f3b0c3", "#9fb4e8"];
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
  const wall = W("#b6a6dc"), trim = W("#f4e6d4"), wood = W("#e0b98c"), woodD = W("#cfa77c");
  // Cuarto: piso, techo, pared del fondo con ventana (hueco x -32..-2, y -2..30), laterales, zócalo, alfombra
  const room = [
    box(200, 1, 160, W("#c99f7c"), [0, -26.5, 0]), box(200, 2, 160, W("#8f83bd"), [0, 51, 0]),
    box(68, 78, 2, wall, [-66, 12, -61]), box(98, 78, 2, wall, [47, 12, -61]), box(30, 24, 2, wall, [-17, -14, -61]), box(30, 21, 2, wall, [-17, 40.5, -61]),
    box(2, 78, 160, wall, [-100, 12, 0]), box(2, 78, 160, wall, [96, 12, 0]), box(196, 3, 0.6, trim, [0, -24.5, -59.8]),
    cyl(56, 56, 0.3, W("#f3c2cf"), [0, -25.9, -24], undefined, 10),
    // marco, cruz y alféizar de la ventana
    box(32, 1.2, 1.4, trim, [-17, 30.6, -60]), box(32, 1.2, 1.4, trim, [-17, -2.6, -60]), box(1.2, 34, 1.4, trim, [-32.6, 14, -60]), box(1.2, 34, 1.4, trim, [-1.4, 14, -60]),
    box(0.8, 32, 0.8, trim, [-17, 14, -60]), box(30, 0.8, 0.8, trim, [-17, 14, -60]), box(36, 1, 4, trim, [-17, -3.2, -58.5]),
    // cortinas durazno a los costados
    ...[-38.5, 4.5].flatMap((x) => [0, 1, 2, 3].map((i) => cyl(2.3, 2.9, 42, W(i % 2 ? "#f6c1a8" : "#f9cfb8"), [x + i * 1.7, 11, -58.2], undefined, 8))),
    box(46, 0.8, 0.8, W("#d8b48a"), [-17, 32.5, -58]),
    // luna y estrellas afuera (sin niebla, para que se lean a lo lejos)
    sph(30, unfog("moonM", "#fff3d6"), [-62, 92, -330], undefined, 10),
    ...(low ? [] : [[-40, 40], [-10, 60], [-90, 30], [20, 45], [-55, 15], [-25, 80], [-75, 70]].map(([x, y], i) => sph(i % 3 ? 1.6 : 2.4, unfog("starM", "#fff8e6"), [x * 3, y * 3, -320]))),
  ];
  if (!low) {
    // cama en el rincón (manta menta, almohada) y póster de un auto
    room.push(box(38, 6, 40, woodD, [-62, -23, -38]), box(36, 3, 38, W("#fbf1e2"), [-62, -18.5, -38]), box(37, 1.4, 26, W("#b8e6c9"), [-62, -16.4, -31]),
      sph(9, W("#fbf1e2"), [-62, -15.5, -53], [1.6, 0.5, 0.8]), box(38, 16, 2, woodD, [-62, -14, -58.6]),
      box(15, 19, 0.3, W("#a9d8f0"), [32, 18, -59.8]), box(9, 2.6, 0.2, W("#f6c1a8"), [32, 15, -59.6]), cyl(2.2, 2.2, 0.2, W("#6c5fa8"), [29, 13.6, -59.5], [Math.PI / 2, 0, 0], 8), cyl(2.2, 2.2, 0.2, W("#6c5fa8"), [35, 13.6, -59.5], [Math.PI / 2, 0, 0], 8));
  }
  // Guirnalda de luces sobre la pared del fondo (bokeh con la profundidad de campo)
  const step = low ? 9 : 4.5, lights = ["#ffd6a0", "#ffb3c8", "#b8f0d8", "#bfe0ff", "#fff1a8"];
  const sag = (x: number) => 37 - 5 * Math.cos(((x + 90) / 60) * Math.PI) ** 2;
  const path: V3[] = [];
  for (let x = -92, i = 0; x <= 92; x += step, i++) {
    path.push([x, sag(x) + 0.5, -59.3]);
    room.push(sph(1.1, M.glow(lights[i % lights.length]), [x, sag(x) - 0.4, -59], [1, 1.3, 1]));
  }
  room.push(tube(path, 0.08, W("#5a4f7a")));

  // Estante (utilería: proyecta sombras). Tabla de arriba en y = 0, de x -26 a 26 y de z -6 a 5; sin fondo: se ve el cuarto detrás
  const props = [
    box(54, 1.4, 11, wood, [0, -0.7, -0.5]), box(54, 1.4, 11, wood, [0, 17.3, -0.5]), box(54, 1.4, 11, wood, [0, -13.5, -0.5]), box(54, 1.4, 11, wood, [0, -25.3, -0.5]),
    box(1.4, 44, 11, woodD, [-27.7, -4, -0.5]), box(1.4, 44, 11, woodD, [27.7, -4, -0.5]),
    // libros parados a la izquierda y uno inclinado
    ...books(-26.8, 0, -2.5, 10),
    box(1.2, 6, 4.4, W("#9fb4e8"), [-13.2, 2.9, -2.5], [0, 0, -0.32]),
    // la guía de bichos abierta con la lupa (pantalla del bestiario)
    box(7, 0.2, 4.8, W("#8f7bc0"), [-9.5, 0.1, 1.4]), box(3.3, 0.3, 4.4, W("#fbf1e2"), [-11.1, 0.32, 1.4], [0, 0, 0.07]), box(3.3, 0.3, 4.4, W("#fbf1e2"), [-7.9, 0.32, 1.4], [0, 0, -0.07]),
    box(1.6, 0.05, 1.2, W("#b8e6c9"), [-7.6, 0.5, 0.6]), box(2, 0.05, 0.3, W("#c7b3ec"), [-11, 0.5, 0.4]), box(1.6, 0.05, 0.3, W("#c7b3ec"), [-11.2, 0.5, 1.2]),
    tor(2.3, 0.32, P("#6c5fa8"), [-8.2, 0.75, 2.6], undefined, 10), cyl(2.1, 2.1, 0.06, M.glass(), [-8.2, 0.75, 2.6], undefined, 10),
    cyl(0.45, 0.45, 2.8, P("#6c5fa8"), [-6.2, 0.7, 3.8], [Math.PI / 2, -0.9, 0], 6),
    // cono de tránsito de juguete
    box(2.2, 0.3, 2.2, P("#ffb38a"), [-15.5, 0.15, 3]), cyl(0.3, 1.7, 2.6, P("#ffb38a"), [-15.5, 1.6, 3], undefined, 8), cyl(0.95, 1.2, 0.45, P("#fbf1e2"), [-15.5, 1.7, 3], undefined, 8),
    // cubos de madera
    box(1.9, 1.9, 1.9, P("#a9d8f0"), [9.5, 0.95, 1.8]), box(1.9, 1.9, 1.9, P("#f7e3a1"), [11.6, 0.95, 1.2], [0, 0.35, 0]), box(1.9, 1.9, 1.9, P("#f3b0c3"), [10.5, 2.85, 1.5], [0, 0.7, 0]),
    // trompo acostado
    cyl(1.8, 0.1, 1.8, P("#c7b3ec"), [6.8, 0.75, 3.2], [0, 0, 1.2], 8), cyl(0.25, 0.25, 0.8, W("#d8b48a"), [6, 1.1, 3.2], [0, 0, 1.2], 6),
    // osito sentado
    sph(3.4, W("#e0b08a"), [17, 1.8, -2.6], [1, 1.1, 0.9]), sph(2.7, W("#e0b08a"), [17, 4.4, -2.4]), sph(1.1, W("#e0b08a"), [16, 5.5, -2.5]), sph(1.1, W("#e0b08a"), [18, 5.5, -2.5]),
    sph(1.2, W("#f6dcc0"), [17, 4.1, -1.2], [1, 0.8, 0.8]), sph(0.3, W("#3a2f45"), [16.5, 4.8, -1.2]), sph(0.3, W("#3a2f45"), [17.5, 4.8, -1.2]), sph(0.35, W("#3a2f45"), [17, 4.25, -0.65]),
    sph(1.3, W("#e0b08a"), [15.3, 2.2, -1.6]), sph(1.3, W("#e0b08a"), [18.7, 2.2, -1.6]), sph(1.4, W("#e0b08a"), [16, 0.6, -0.8]), sph(1.4, W("#e0b08a"), [18, 0.6, -0.8]),
    // lámpara hongo (la luz cálida del estante)
    cyl(2.2, 2.7, 0.6, P("#fbf1e2"), [22.5, 0.3, -3], undefined, 10), cyl(0.8, 0.9, 3.4, P("#fbf1e2"), [22.5, 2.2, -3], undefined, 8),
    sph(5, M.glow("#ffcf96"), [22.5, 4.6, -3], [1, 0.55, 1], 10),
    // repisa de arriba: maceta con suculenta y frasco de botones
    cyl(3, 2.4, 2.8, P("#f6c1a8"), [-18, 19.4, -2], undefined, 8), sph(2.4, W("#9fd3a8"), [-18, 21.4, -2], [1, 0.8, 1]), sph(1.6, W("#b8e6c9"), [-17, 22.3, -1.6]),
    cyl(2.6, 2.6, 3.4, M.glass(), [12, 19.7, -2], undefined, 10), cyl(2.7, 2.7, 0.5, P("#c7b3ec"), [12, 21.6, -2], undefined, 10),
  ];
  if (!low) props.push(
    // repisa de abajo: más libros y una caja de juguetes
    ...books(-26.5, -12.8, -2, 16, 5), box(11, 5, 7, P("#a9d8f0"), [19.5, -10.3, -1.5]), box(11.2, 0.6, 7.2, P("#fbf1e2"), [19.5, -7.7, -1.5]),
  );
  return [room, props];
}

function benchBuild(low: boolean): [B.Mesh[], B.Mesh[]] {
  const peach = W("#f1c7ae"), wood = W("#e2b58a"), woodD = W("#c99a70"), metal = M.metal("#cfd3dc");
  // Texturas que repiten distinto a lo ancho y a lo alto: agujeros del tablero perforado y grilla de la base de corte
  const tx = (c0: string, draw: (c: CanvasRenderingContext2D, s: number) => void, u: number, v: number) => { const t = canvasTex(64, (c, s) => { c.fillStyle = c0; c.fillRect(0, 0, s, s); draw(c, s); }); t.uScale = u; t.vScale = v; return t; };
  const peg = pbr("pegboard", { color: "#ffffff", rough: 0.9, tex: tx("#ead6b4", (c, s) => { c.fillStyle = "#b99a78"; c.beginPath(); c.arc(s / 2, s / 2, s * 0.12, 0, 7); c.fill(); }, 68, 30) });
  const mat = pbr("cutmat", { color: "#ffffff", rough: 0.85, tex: tx("#86c9a6", (c, s) => { c.strokeStyle = "#b4e2c8"; c.lineWidth = 1.5; c.strokeRect(0, 0, s, s); }, 16, 11) });
  // Cuarto: piso, techo, pared con el tablero perforado, laterales
  const room = [
    box(180, 1, 140, W("#b98f6e"), [0, -30.5, 0]), box(180, 2, 140, W("#c4b2e6"), [0, 50, 0]),
    box(180, 82, 2, peach, [0, 10, -18]), box(2, 82, 140, peach, [-70, 10, 0]), box(2, 82, 140, peach, [70, 10, 0]),
    box(68, 30, 0.6, peg, [0, 15.5, -16.6]),
    box(70, 1, 1, woodD, [0, 31, -16.4]), box(70, 1, 1, woodD, [0, 0.4, -16.4]),
  ];
  const props = [
    // mesa y patas, base de corte verde bajo el auto
    box(66, 2, 28, wood, [0, -1, -2]), box(66, 0.6, 0.4, woodD, [0, -1.6, 12.1]),
    ...[[-31, -14], [31, -14], [-31, 10], [31, 10]].map(([x, z]) => box(2.4, 28, 2.4, woodD, [x, -16, z])),
    box(16, 0.08, 11, mat, [0, 0.04, 1.5]),
    // herramientas colgadas: llave, destornilladores, martillo, pinza, rollos de cable y cinta
    box(0.9, 8, 0.4, metal, [-26, 15.5, -16]), tor(2.4, 0.7, metal, [-26, 20.4, -16], [Math.PI / 2, 0, 0], 8),
    ...[["#f3b0c3", -21], ["#a9d8f0", -19], ["#f7e3a1", -17]].flatMap(([c, x]) => [cyl(1.1, 1.1, 3.2, P(c as string), [x as number, 20.5, -15.8], undefined, 6), cyl(0.3, 0.3, 4.4, metal, [x as number, 16.7, -15.8], undefined, 6)]),
    box(0.8, 8, 0.6, woodD, [-11, 15.5, -15.8]), box(4.2, 1.5, 1.5, M.metal("#9aa0ab"), [-11, 20, -15.8]),
    box(0.5, 6, 0.4, metal, [-5.6, 17, -15.8], [0, 0, 0.18]), box(0.5, 6, 0.4, metal, [-4.4, 17, -15.8], [0, 0, -0.18]),
    box(0.9, 3, 0.6, P("#c7b3ec"), [-6.2, 13.6, -15.7], [0, 0, 0.18]), box(0.9, 3, 0.6, P("#c7b3ec"), [-3.8, 13.6, -15.7], [0, 0, -0.18]),
    tor(3.8, 1.3, P("#f3b0c3"), [5, 20, -15.6], [Math.PI / 2, 0, 0], 10), tor(2.6, 1.1, P("#a9d8f0"), [11, 19.6, -15.6], [Math.PI / 2, 0, 0], 10),
    // repisa con frascos de piezas
    box(20, 0.8, 4, wood, [24, 24, -14.5]),
    ...[0, 1, 2, 3].flatMap((i) => [cyl(2.2, 2.2, 3, M.glass(), [17.5 + i * 4.3, 25.9, -14.5], undefined, 8), cyl(1.9, 1.9, 1.6, P(PAST[i + 2]), [17.5 + i * 4.3, 25.2, -14.5], undefined, 8), cyl(2.3, 2.3, 0.5, P("#fbf1e2"), [17.5 + i * 4.3, 27.6, -14.5], undefined, 8)]),
    // cajonera lavanda de 3x3 (pantalla del taller)
    box(14, 8.4, 6, P("#c7b3ec"), [22, 4.2, -10]),
    ...[0, 1, 2].flatMap((r) => [0, 1, 2].flatMap((k) => [box(4, 2.3, 0.3, P(PAST[(r * 3 + k) % PAST.length]), [17.6 + k * 4.4, 1.5 + r * 2.7, -6.9]), sph(0.5, M.metal(), [17.6 + k * 4.4, 1.5 + r * 2.7, -6.6])])),
    // flexo celeste: base, brazos, resorte y pantalla con la bombita
    cyl(3.4, 3.8, 0.8, P("#9ccfe8"), [9, 0.4, -6], undefined, 10),
    tube([[9, 0.8, -6], [7.5, 7.2, -5]], 0.38, P("#9ccfe8")), tube([[7.5, 7.2, -5], [3.4, 8.6, -1.8]], 0.38, P("#9ccfe8")),
    sph(1, P("#fbf1e2"), [9, 0.9, -6]), sph(1, P("#fbf1e2"), [7.5, 7.2, -5]), sph(0.9, P("#fbf1e2"), [3.4, 8.6, -1.8]),
    cyl(1.2, 3.8, 2.6, P("#9ccfe8"), [2.8, 7.5, -1.3], [0.35, 0, 0.35], 10), sph(1.5, M.glow("#fff0c8"), [2.5, 6.5, -1]),
    // transmisor del auto (pantalla de configuración): cuerpo durazno, dos palancas, antena, pantallita
    ...transmitter(),
    // repuestos: dos ruedas, batería con cables, tornillos y tuercas, frascos de pintura, destornillador suelto, taza
    place(wheel(2, 1, "#f6c1a8"), [6.5, 0.5, 6.5], [0, 0.4, Math.PI / 2]), place(wheel(2, 1, "#a9d8f0"), [8.6, 1.0, 4.4], [0, -0.3, 0]),
    box(3.6, 1.4, 1.7, P("#a9d8f0"), [-14, 0.7, 4.5]), box(3.62, 0.5, 1.72, P("#fbf1e2"), [-14, 0.9, 4.5]),
    tube([[-12.2, 0.6, 4.2], [-10.8, 0.2, 5.6], [-9, 0.2, 5.8]], 0.12, P("#f3b0c3")), tube([[-12.2, 0.6, 4.8], [-11, 0.2, 6.6], [-9.4, 0.2, 7]], 0.12, P("#3a2f45")),
    ...[[3, 8], [4.2, 8.8], [-5, 7.5], [10.5, 8], [-6.8, 6.4]].map(([x, z], i) => (i % 2 ? tor(0.6, 0.24, metal, [x, 0.12, z], undefined, 6) : cyl(0.28, 0.28, 1.2, metal, [x, 0.14, z], [0, i, Math.PI / 2], 6))),
    ...[0, 1, 2, 3].flatMap((i) => [cyl(1.5, 1.5, 1.7, P(PAST[i]), [-21 + i * 1.9, 0.85, 7.5 - (i % 2) * 1.2], undefined, 8), cyl(1.6, 1.6, 0.35, P("#fbf1e2"), [-21 + i * 1.9, 1.85, 7.5 - (i % 2) * 1.2], undefined, 8)]),
    cyl(0.9, 0.9, 2.6, P("#f7e3a1"), [3.4, 0.45, 9.8], [0, 0.5, Math.PI / 2], 6), cyl(0.25, 0.25, 3, metal, [5.8, 0.45, 8.4], [0, 0.5, Math.PI / 2], 6),
  ];
  if (!low) props.push(cyl(2.6, 2.4, 3, P("#f3b0c3"), [-25, 1.5, -3], undefined, 10), tor(1.6, 0.35, P("#f3b0c3"), [-23.6, 1.6, -3], [Math.PI / 2, 0, 0], 8), cyl(2.2, 2.2, 0.1, W("#a0705a"), [-25, 2.95, -3], undefined, 10));
  for (const m of [...room, ...props]) m.position.addInPlace(BENCH);
  return [room, props];
}
function transmitter(): B.Mesh[] {
  const parts = [
    box(5.2, 1.6, 3.2, P("#f6c1a8"), [0, 0.9, 0]), box(5.4, 0.4, 3.4, P("#fbf1e2"), [0, 0.2, 0]),
    cyl(0.25, 0.25, 1.3, W("#3a2f45"), [-1.4, 2.2, 0.3], undefined, 6), sph(0.6, P("#c7b3ec"), [-1.4, 2.9, 0.3]),
    cyl(0.25, 0.25, 1.3, W("#3a2f45"), [1.4, 2.2, 0.3], [0.25, 0, 0], 6), sph(0.6, P("#c7b3ec"), [1.4, 2.85, 0.45]),
    cyl(0.12, 0.25, 6.5, M.metal(), [2.1, 4.6, -1.2], [-0.15, 0, -0.12], 6), sph(0.35, P("#f3b0c3"), [2.5, 7.8, -1.7]),
    box(1.8, 0.06, 0.8, M.glow("#b8ffd8"), [0, 1.73, 1.05]),
  ];
  const t = merge("tx", parts);
  t.rotation.y = -0.45; t.position.set(14.5, 0, 3.5);
  return [t];
}
const place = (m: B.Mesh, pos: V3, rot: V3) => { m.position.set(...pos); m.rotation.set(...rot); return m; };

let cur: Id | null = null, fade = 1, moteT = 0;
const WARM = B.Color3.FromHexString("#ffc890");
const built: Partial<Record<Id, B.Mesh[]>> = {};
function build(id: Id, low: boolean) {
  const [room, props] = id === "shelf" ? shelfBuild(low) : benchBuild(low);
  const r = merge("menu_" + id + "_room", room), p = merge("menu_" + id + "_props", props);
  r.isPickable = p.isPickable = false;
  shadows.addShadowCaster(p);
  return [r, p];
}

/** Cada cuadro del menú: enciende la escena de la pantalla (la arma la primera vez), luz, polvo y foco.
 *  Devuelve true si cambió de escena: main.ts corta la cámara al encuadre nuevo (la estática del menú tapa el corte y la escena aparece desde oscuro). */
export function menuTick(scr: string, cam: B.Camera, focus: B.Vector3, dt: number, low: boolean) {
  const id = sceneOf(scr), cut = id !== cur;
  if (cut) {
    if (!cur) { showWorld(false); menuLights(true); }
    built[id] ??= build(id, low);
    for (const k of Object.keys(built) as Id[]) for (const m of built[k]!) m.setEnabled(k === id);
    cur = id; fade = 0;
    applyClimate(CLIM[id]);
  }
  const sc = lamp.getScene(), L = LAMP[id];
  fade = Math.min(1, fade + dt * 2.5);
  sc.imageProcessingConfiguration.exposure = CLIM[id].exposure * LOOK.exposure * (0.15 + 0.85 * fade * fade);
  lamp.position.copyFrom(L.spot); L.to.subtractToRef(L.spot, lamp.direction).normalize();
  lamp.intensity = L.spotI; lamp.angle = L.cone; glow.position.copyFrom(L.glow); glow.intensity = L.glowI;
  lamp.diffuse.copyFrom(WARM); // carModel pinta el foco con el faro del auto de muestra: en el menú manda la lámpara
  setDof(Math.max(1, B.Vector3.Dot(focus.subtract(cam.position), cam.getDirection(B.Axis.Z))), DOF[id]); // el desenfoque mide profundidad sobre el eje de la cámara, no distancia
  // Polvo que flota en el haz de la lámpara
  if ((moteT -= dt) <= 0) {
    moteT = low ? 0.16 : 0.07;
    const k = Math.random();
    ambient("mote", B.Vector3.Lerp(L.spot, L.to, 0.25 + k * 0.7).addInPlaceFromFloats((Math.random() - 0.5) * 6 * k, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 6 * k));
  }
  return cut;
}
/** Sale de los menús (partida o carrera): apaga las escenas, la profundidad de campo y la luz de lámpara; el mundo vuelve a verse. */
export function menuOff() {
  if (!cur) return;
  for (const k of Object.keys(built) as Id[]) for (const m of built[k]!) m.setEnabled(false);
  cur = null;
  menuLights(false);
  setDof(0);
  showWorld(true);
}
