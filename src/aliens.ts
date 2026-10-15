// Aliens de chatarra de la luna (docs/LUNA.md, fase 2): mismo idioma Folded que las hormigas (chapa plegada, remaches) con luces
// alienígenas verdes y cian que no se apagan con la niebla (de lejos, en el lado oscuro, se ven las luces). Acá viven sus modelos
// (procedurales con caminata horneada: glb.ts los trata como un bicho Folded más) y su IA; enemies.ts y glb.ts solo los registran.
// Los 8: enjambre, tirador de onda, saltador lunar, emboscador de cráter, flotante, tanque, explosivo y curandero. Solo aparecen en la luna (spawnTable).
import * as B from "@babylonjs/core";
import { FOLD } from "./folded";
import { along, kit, piv } from "./folded_slice";
import { pbr, shadows } from "./render";
import { cyl, template, tor, sph } from "./models";
import { BAL } from "./balance";
import { rng } from "./rng";
import { FX } from "./fx";
import { alignYaw, alt, arc, at, flatL, FOOT, hd, hflat, LUNA, MOON, onFloor, rad, toLocal, yawOf } from "./moon";
import type { Enemy, Kind } from "./enemies";

/** Tipos alien (la nave nodriza los suelta con LUNA.spawn). */
export const ALIENS = ["enjambre", "tirador", "saltador", "emboscador", "flotante", "tanque", "explosivo", "curandero"] as const;
export type Alien = (typeof ALIENS)[number];
export const isAlien = (k: string): k is Alien => (ALIENS as readonly string[]).includes(k);

const ATK = BAL.ataques;
type V3 = [number, number, number];
const GREEN = "#7dff5a", CYAN = "#3ff2ff";
// Luz alienígena: emisivo fuerte y sin niebla (como enemyLights de moon.ts); queda como su propia submalla al fusionar
const glow = (c: string) => { const m = pbr("alienGlow" + c, { color: c, rough: 0.3, emissive: c }); m.fogEnabled = false; m.emissiveIntensity = 2; return m; };
// Paleta de chapa gastada (ref169/171/173): óxido de casco, crema saltada de placas, bronce de articulaciones, rojo de pintura; la luz alien solo vive en ojos
// (eye) y en lo que el juego lee por color: núcleo y mecha del explosivo, reactor del tanque, rayo/onda (glow verde/cian).
const hull = () => FOLD.painted("#8a3a1e", 0.85, 81), plate = () => FOLD.painted("#c9b48a", 0.8, 82), shell = () => FOLD.painted("#4a2a18", 0.7, 86);
const bronze = () => FOLD.painted("#a8803c", 0.6, 87), olive = () => FOLD.painted("#5b6130", 0.8, 85), red = () => FOLD.painted("#c42a14", 0.7, 88);
const eye = () => { const m = pbr("alienOjo", { color: "#a82a10", emissive: "#ff4a1a", rough: 0.3 }); m.fogEnabled = false; m.emissiveIntensity = 2; return m; };
const ember = () => { const m = pbr("alienBrasa", { color: "#d4600c", emissive: "#ff9a1a", rough: 0.3 }); m.fogEnabled = false; m.emissiveIntensity = 2; return m; };

// ---------- Patas (mismo esquema que la hormiga de folded_slice.ts: un hueso por pata, cadera + rumbo) ----------
type Hip = [V3, number];
type Kit = ReturnType<typeof kit>;
function legs(K: Kit, hips: Hip[], knee: V3, foot: V3, w: number, b0: number) {
  const { G, strut, bone } = K, mat = shell();
  let b = b0;
  for (const [[hx, hy, hz], yaw] of hips) for (const s of [1, -1]) {
    bone(b++);
    const a = s > 0 ? yaw : Math.PI - yaw, P = (x: number, y: number, z: number): V3 => [hx * s + x * Math.cos(a) + z * Math.sin(a), hy + y, hz - x * Math.sin(a) + z * Math.cos(a)];
    const kn = P(...knee), ft = P(...foot);
    G.box(w * 1.3, w * 1.3, w * 1.3, FOLD.bare(), P(0, 0, 0));
    strut(P(0, 0, 0), kn, w, w * 1.2, mat); G.box(w * 1.3, w * 1.3, w * 1.3, FOLD.bare(), kn);
    strut(kn, ft, w * 0.75, w * 0.9, mat); G.box(w * 1.4, w * 0.5, w * 1.6, FOLD.dark(), ft);
  }
  bone(0);
}
/** Caminata en trípode: patas alternadas en fase opuesta (como antPose). */
function legPose(out: B.Matrix[], hips: Hip[], walk: number, amp = 0.42, lift = 0.3) {
  const ph = walk * Math.PI * 2;
  hips.forEach(([[hx, hy, hz]], i) => { for (const s of [1, -1]) {
    const f = ph + ((i + (s > 0 ? 0 : 1)) % 2 ? Math.PI : 0);
    out.push(piv(new B.Vector3(hx * s, hy, hz), B.Matrix.RotationZ(s * Math.max(0, Math.cos(f)) * lift).multiply(B.Matrix.RotationY(Math.sin(f) * amp))));
  } });
  return out;
}

// ---------- Enjambre: cápsula hexagonal chica con núcleo cian, aguijón y 4 patas. Huesos: 0 cuerpo, 1-4 patas ----------
const SW_HIPS: Hip[] = [[[0.15, 0.28, 0.1], 0.5], [[0.15, 0.28, -0.1], -0.5]];
function swarmBody() {
  const K = kit(), { G } = K;
  along(G, 0.34, 0.42, 0.5, hull(), [0, 0.3, 0]);
  G.plate([0, 0.5, -0.1], [Math.PI / 2, 0, 0], 0.24, 0.24, plate());
  G.sph(0.24, plate(), [0, 0.46, 0.08]); // domo crema
  G.sph(0.15, eye(), [0, 0.34, 0.26]); // ojo
  for (const [x, z] of [[0, 0.1], [0.14, -0.04], [-0.14, -0.04], [0.1, -0.2], [-0.1, -0.2]]) G.cyl(0.01, 0.2, plate(), [x, 0.74, z], undefined, 5, 0.08); // pinches (ref169)
  G.rivets([-0.2, 0.3, 0.3], [0.2, 0.3, 0.3], 4, [0, 0, 1]);
  G.cyl(0.02, 0.22, FOLD.bare(), [0, 0.3, -0.35], [-Math.PI / 2, 0, 0], 6, 0.1); // aguijón
  legs(K, SW_HIPS, [0.2, 0.12, 0], [0.4, -0.28, 0.02], 0.045, 1);
  return K.done(1.4);
}
const swarmPose = (_v: number, walk: number, atk: number) => legPose([B.Matrix.Translation(0, 0.03 * Math.abs(Math.sin(walk * Math.PI * 4)), 0.1 * Math.sin(atk * Math.PI))], SW_HIPS, walk, 0.5, 0.35);

// ---------- Tirador de onda: vaina sobre 4 patas con la pistolita arriba (emisor de anillos cian). Huesos: 0 cuerpo, 1-4 patas, 5 arma ----------
const SH_HIPS: Hip[] = [[[0.24, 0.5, 0.18], 0.6], [[0.24, 0.5, -0.18], -0.6]];
const GUN = new B.Vector3(0, 1.0, 0);
function shooterBody() {
  const K = kit(), { G, bone } = K, g = eye(), br = bronze();
  along(G, 0.62, 0.5, 0.62, hull(), [0, 0.62, 0]);
  along(G, 0.68, 0.68, 0.06, br, [0, 0.62, 0.08]); // faja de bronce
  G.rivets([-0.24, 0.8, 0.31], [0.24, 0.8, 0.31], 5, [0, 0, 1]);
  G.plate([0, 0.94, -0.02], [Math.PI / 2, 0, 0], 0.36, 0.44, plate());
  G.cyl(0.3, 0.2, shell(), [0, 0.3, 0], undefined, 6, 0.12); // panza
  for (const s of [-1, 1]) G.box(0.1, 0.06, 0.04, g, [s * 0.12, 0.7, 0.31]); // ojos
  bone(5);
  G.box(0.2, 0.12, 0.24, FOLD.dark(), [0, 1.0, 0]);
  along(G, 0.12, 0.16, 0.56, FOLD.bare(), [0, 1.06, 0.3]); // caño
  for (const s of [-1, 1]) G.box(0.05, 0.08, 0.2, br, [s * 0.09, 1.06, 0.22]); // bobinas de carga
  along(G, 0.34, 0.34, 0.04, ember(), [0, 1.06, 0.58]); // emisor: dos anillos de brasa
  along(G, 0.24, 0.24, 0.04, ember(), [0, 1.06, 0.64]);
  along(G, 0.42, 0.18, 0.1, plate(), [0, 1.06, 0.52]); // plato
  bone(0);
  legs(K, SH_HIPS, [0.3, 0.22, 0], [0.62, -0.5, 0.02], 0.07, 1);
  return K.done(2);
}
function shooterPose(_v: number, walk: number, atk: number) {
  const out = legPose([B.Matrix.Translation(0, -0.04 * atk, 0)], SH_HIPS, walk);
  const kick = atk > 0.85 ? (1 - atk) / 0.15 : 0; // al disparar: retroceso
  out.push(piv(GUN, B.Matrix.RotationX(-0.25 * Math.min(1, atk / 0.85) + 0.03 * Math.sin(walk * Math.PI * 4))).multiply(B.Matrix.Translation(0, -0.04 * atk, -0.14 * kick)));
  return out;
}

// ---------- Saltador lunar: cuña con cabeza de rana, patas traseras de resorte y toberas. Huesos: 0 cuerpo, 1-2 traseras, 3-4 delanteras ----------
function jumperBody() {
  const K = kit(), { G, strut, bone } = K, g = eye(), sh = shell();
  G.box(0.5, 0.3, 0.7, hull(), [0, 0.5, 0], [-0.25, 0, 0]);
  G.box(0.42, 0.22, 0.3, sh, [0, 0.66, 0.38]);
  G.plate([0, 0.67, -0.05], [Math.PI / 2 - 0.25, 0, 0], 0.34, 0.4, plate());
  for (const s of [-1, 1]) {
    G.sph(0.14, g, [s * 0.15, 0.79, 0.46]); // ojos
    for (const y of [0.52, 0.58, 0.64]) G.box(0.12, 0.025, 0.12, bronze(), [s * 0.4, y, 0.02]); // aros del resorte
    along(G, 0.14, 0.2, 0.22, FOLD.dark(), [s * 0.17, 0.5, -0.42]); // toberas
    G.box(0.1, 0.1, 0.03, ember(), [s * 0.17, 0.5, -0.54]);
  }
  for (const s of [1, -1]) { // traseras: muslo hacia adelante y arriba, canilla larga atrás (resorte de rana)
    bone(s > 0 ? 1 : 2);
    const hip: V3 = [s * 0.27, 0.45, -0.18], kn: V3 = [s * 0.4, 0.62, 0.08], ft: V3 = [s * 0.38, 0.05, -0.3];
    G.box(0.1, 0.1, 0.1, FOLD.bare(), hip); strut(hip, kn, 0.1, 0.12, sh); G.box(0.1, 0.1, 0.1, FOLD.bare(), kn);
    strut(kn, ft, 0.07, 0.08, sh); G.box(0.14, 0.04, 0.3, FOLD.dark(), [ft[0], 0.02, -0.28]);
  }
  for (const s of [1, -1]) {
    bone(s > 0 ? 3 : 4);
    strut([s * 0.17, 0.42, 0.3], [s * 0.24, 0.04, 0.44], 0.06, 0.07, sh); G.box(0.1, 0.04, 0.12, FOLD.dark(), [s * 0.24, 0.02, 0.46]);
  }
  bone(0);
  G.rivets([-0.18, 0.7, 0.28], [0.18, 0.7, 0.28], 4, [0, 0.3, 1]);
  return K.done(2);
}
function jumperPose(_v: number, walk: number, atk: number) {
  const hop = Math.max(0, Math.sin(walk * Math.PI * 2)), c = atk; // atk = agazapado (0 parado, 1 a fondo)
  const body = B.Matrix.RotationX(0.15 * c).multiply(B.Matrix.Translation(0, 0.06 * hop - 0.16 * c, 0));
  const out = [body];
  for (const s of [1, -1]) out.push(piv(new B.Vector3(s * 0.27, 0.45, -0.18), B.Matrix.RotationX(-0.5 * hop + 0.45 * c)).multiply(body));
  for (const s of [1, -1]) out.push(piv(new B.Vector3(s * 0.17, 0.42, 0.3), B.Matrix.RotationX(0.35 * hop - 0.3 * c)).multiply(body));
  return out;
}

// ---------- Emboscador de cráter: caparazón chato con tapa de roca, tenazas y un señuelo de luz en una antena (lo único que asoma enterrado).
// Huesos: 0 cuerpo, 1-4 patas, 5 tenazas ----------
const AM_HIPS: Hip[] = [[[0.48, 0.32, 0.22], 0.5], [[0.48, 0.32, -0.22], -0.5]];
const LURE = 1.32; // altura del señuelo: enterrado a alien_emboscador_hondo, asoma LURE − hondo
function ambushBody() {
  const K = kit(), { G, strut, bone } = K, g = eye(), lid = FOLD.painted("#6b6a2e", 0.8, 83);
  G.box(1.05, 0.3, 1.0, hull(), [0, 0.38, 0]);
  G.box(1.3, 0.08, 1.2, lid, [0, 0.56, -0.02]); // tapa (se confunde con el regolito)
  for (const x of [-0.3, 0.3]) G.bend([x, 0.61, -0.55], [x, 0.61, 0.5], 0.03, lid);
  G.rivets([-0.6, 0.6, 0.56], [0.6, 0.6, 0.56], 7, [0, 0, 1]);
  G.box(0.7, 0.07, 0.04, FOLD.dark(), [0, 0.36, 0.51]); // boca
  for (const [x, z, h, t] of [[-0.55, 0.3, 0.6, 0.35], [0.55, 0.3, 0.7, -0.35], [-0.35, -0.5, 0.8, 0.2], [0.4, -0.5, 0.55, -0.2], [0, -0.6, 0.65, 0]]) G.cyl(0.01, h, plate(), [x, 0.56 + h / 2, z], [0.15, 0, t], 5, 0.18); // estacas de roca (ref169)
  for (const [x, y] of [[-0.18, 0.47], [0.18, 0.47], [0, 0.5]]) G.sph(0.1, g, [x, y, 0.5]); // ojos
  G.tube([[0, 0.6, 0.2], [0, 1.0, 0.24], [0, 1.24, 0.38], [0, LURE - 0.05, 0.5]], 0.025, FOLD.dark()); // antena
  G.sph(0.16, ember(), [0, LURE, 0.52]); // señuelo
  bone(5);
  for (const s of [-1, 1]) {
    strut([s * 0.34, 0.34, 0.45], [s * 0.3, 0.3, 0.86], 0.09, 0.1, shell());
    G.box(0.08, 0.08, 0.2, FOLD.bare(), [s * 0.24, 0.3, 0.94], [0, -s * 0.5, 0]);
  }
  bone(0);
  legs(K, AM_HIPS, [0.3, 0.22, 0], [0.6, -0.32, 0.02], 0.08, 1);
  return K.done(2);
}
function ambushPose(_v: number, walk: number, atk: number) {
  const out = legPose([B.Matrix.Identity()], AM_HIPS, walk, 0.38, 0.28);
  out.push(piv(new B.Vector3(0, 0.34, 0.45), B.Matrix.RotationX(-0.6 * Math.sin(atk * Math.PI)))); // tarascón
  return out;
}

// ---------- Flotante: platillo de chapa con cúpula de luz y tres tentáculos de cable colgando. Huesos: 0 cuerpo, 1-3 tentáculos ----------
const FL_A = [0, 1, 2].map((i) => Math.PI / 6 + (i * Math.PI * 2) / 3); // rumbo de cada tentáculo
function floaterBody() {
  const K = kit(), { G, bone } = K, g = ember();
  G.cyl(1.15, 0.18, hull(), [0, 0.72, 0], undefined, 8, 0.7); // platillo (ancho arriba)
  G.cyl(0.8, 0.08, plate(), [0, 0.84, 0], undefined, 8, 1.1); // tapa
  G.sph(0.5, plate(), [0, 0.9, 0]); // cúpula
  G.sph(0.17, eye(), [0, 0.6, 0.0]); // ojo de vientre
  for (let i = 0; i < 3; i++) { const a = Math.PI / 2 + (i * Math.PI * 2) / 3, x = Math.sin(a) * 0.95, z = Math.cos(a) * 0.95; G.cyl(0.06, 0.2, bronze(), [x, 0.9, z], undefined, 5); G.cyl(0.5, 0.03, olive(), [x, 1.02, z], undefined, 8); } // tres rotores (ref169)
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; G.box(0.09, 0.05, 0.09, g, [Math.sin(a) * 0.5, 0.7, Math.cos(a) * 0.5]); } // luces del borde
    FL_A.forEach((a, i) => {
    bone(1 + i);
    const x = Math.sin(a) * 0.24, z = Math.cos(a) * 0.24;
    G.tube([[x, 0.64, z], [x * 1.25, 0.42, z * 1.25], [x * 1.1, 0.22, z * 1.1], [x * 0.8, 0.06, z * 0.8]], 0.03, FOLD.dark());
    G.sph(0.09, g, [x * 0.8, 0.06, z * 0.8]);
  });
  bone(0);
  return K.done(1.4);
}
function floaterPose(_v: number, walk: number, atk: number) {
  const ph = walk * Math.PI * 2, out = [B.Matrix.Translation(0, 0.05 * Math.sin(ph), 0)];
  FL_A.forEach((a, i) => { // se mecen; al picar (atk) se abren hacia afuera como garras
    const ax = new B.Vector3(Math.cos(a), 0, -Math.sin(a)); // eje tangente: el tentáculo se abre en su plano radial
    out.push(piv(new B.Vector3(Math.sin(a) * 0.24, 0.64, Math.cos(a) * 0.24), B.Matrix.RotationAxis(ax, -0.25 * Math.sin(ph + i * 2.1) - 0.7 * Math.sin(atk * Math.PI))).multiply(out[0]));
  });
  return out;
}

// ---------- Tanque: casco bajo sobre 6 patas, placa frontal gruesa inclinada con remaches (el blindaje se ve) y el reactor cian expuesto
// atrás (por donde conviene pegarle). Huesos: 0 cuerpo, 1-6 patas ----------
const TK_HIPS: Hip[] = [[[0.5, 0.48, 0.45], 0.5], [[0.56, 0.48, 0], 0], [[0.5, 0.48, -0.45], -0.5]];
function tankBody() {
  const K = kit(), { G } = K, g = eye(), armor = FOLD.painted("#6b6a2e", 0.8, 84);
  G.box(1.1, 0.5, 1.5, hull(), [0, 0.66, -0.05]);
  G.box(1.2, 0.08, 1.3, plate(), [0, 0.95, -0.12]); // techo
  G.box(1.56, 1.0, 0.16, armor, [0, 0.62, 0.8], [-0.3, 0, 0]); // placa frontal: tapa todo el frente
  for (const s of [-1, 1]) G.box(0.14, 0.82, 0.5, armor, [s * 0.74, 0.62, 0.6], [0, -s * 0.35, 0]); // alas de la placa
  G.rivets([-0.62, 1.04, 0.69], [0.62, 1.04, 0.69], 8, [0, 0.3, 1]);
  G.rivets([-0.62, 0.22, 0.95], [0.62, 0.22, 0.95], 8, [0, 0.3, 1]);
  for (const s of [-1, 1]) G.box(0.16, 0.1, 0.05, g, [s * 0.22, 0.76, 0.88], [-0.3, 0, 0]); // ojos de la mirilla
  for (const s of [-1, 1]) { // orugas de juguete (ref287): bloque de goma con tacos y ruedas guía de bronce
    G.box(0.3, 0.46, 1.9, FOLD.dark(), [s * 0.96, 0.3, -0.05]);
    for (let i = 0; i < 6; i++) G.box(0.36, 0.5, 0.1, shell(), [s * 0.96, 0.3, -0.9 + i * 0.36]);
    for (const z of [-0.85, 0.75]) G.cyl(0.42, 0.34, bronze(), [s * 1.14, 0.3, z], [0, 0, Math.PI / 2], 8);
  }
  along(G, 0.52, 0.52, 0.3, shell(), [0, 0.7, -0.86]);
  G.sph(0.44, ember(), [0, 0.7, -1.0]); // reactor de atrás
  legs(K, TK_HIPS, [0.3, 0.25, 0], [0.62, -0.48, 0.02], 0.1, 1);
  return K.done(2);
}
const tankPose = (_v: number, walk: number, atk: number) => legPose([B.Matrix.Translation(0, 0.02 * Math.abs(Math.sin(walk * Math.PI * 2)), 0.08 * Math.sin(atk * Math.PI))], TK_HIPS, walk, 0.3, 0.22);

// ---------- Explosivo: núcleo verde enjaulado en aros de chapa sobre 4 patitas, con mecha de luz cian. Al armarse (atk) se infla y
// tiembla. Huesos: 0 cuerpo, 1-4 patas ----------
const EX_HIPS: Hip[] = [[[0.2, 0.32, 0.12], 0.6], [[0.2, 0.32, -0.12], -0.6]];
const EX_C = new B.Vector3(0, 0.56, 0); // centro del núcleo
function bomberBody() {
  const K = kit(), { G } = K;
  G.sph(0.66, glow(GREEN), [0, 0.56, 0]); // núcleo
  for (const [y, w] of [[0.36, 0.56], [0.56, 0.74], [0.76, 0.56]]) G.cyl(w, 0.1, bronze(), [0, y, 0], undefined, 8); // aros de flejes de la jaula
  for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + Math.PI / 4; G.box(0.06, 0.5, 0.06, plate(), [Math.sin(a) * 0.31, 0.56, Math.cos(a) * 0.31]); } // barrotes
  G.cyl(0.07, 0.3, FOLD.dark(), [0, 0.94, 0], undefined, 6);
  G.rivets([-0.3, 0.36, 0.42], [0.3, 0.36, 0.42], 4, [0, 0, 1]);
  G.sph(0.15, ember(), [0, 1.12, 0]); // baliza
  for (const s of [-1, 1]) G.sph(0.07, eye(), [s * 0.12, 0.6, 0.4]); // ojos
  legs(K, EX_HIPS, [0.18, 0.1, 0], [0.36, -0.3, 0.02], 0.045, 1);
  return K.done(1.4);
}
function bomberPose(_v: number, walk: number, atk: number) {
  const s = 1 + 0.28 * atk, j = 0.03 * atk * Math.sin(atk * 60);
  return legPose([piv(EX_C, B.Matrix.Scaling(s, s, s)).multiply(B.Matrix.Translation(j, 0.04 * Math.abs(Math.sin(walk * Math.PI * 4)), 0))], EX_HIPS, walk, 0.5, 0.35);
}

// ---------- Curandero: torre fina sobre 4 patas largas con cabeza de luz y un plato emisor (hexagonal) que gira. Huesos: 0 cuerpo, 1-4 patas,
// 5 cabeza ----------
const CU_HIPS: Hip[] = [[[0.18, 0.55, 0.14], 0.7], [[0.18, 0.55, -0.14], -0.7]];
const CU_HEAD = new B.Vector3(0, 1.42, 0); // de acá sale el rayo (healTick)
function healerBody() {
  const K = kit(), { G, bone } = K;
  G.cyl(0.36, 0.7, hull(), [0, 0.86, 0], undefined, 6, 0.52);
  G.cyl(0.56, 0.14, plate(), [0, 0.5, 0], undefined, 6);
  G.box(0.3, 0.3, 0.04, plate(), [0, 0.92, 0.3]); // botiquín crema (ref171)
  G.box(0.2, 0.06, 0.03, red(), [0, 0.92, 0.33]); G.box(0.06, 0.2, 0.03, red(), [0, 0.92, 0.33]); // cruz roja
  G.rivets([-0.12, 0.8, 0.31], [0.12, 1.04, 0.31], 4, [0, 0, 1]);
  for (const s of [-1, 1]) G.tube([[s * 0.12, 1.2, -0.05], [s * 0.3, 1.5, -0.1], [s * 0.34, 1.72, -0.12]], 0.02, FOLD.dark()); // antenas
  bone(5);
  G.cyl(0.18, 0.2, FOLD.dark(), [0, 1.26, 0], undefined, 6);
  G.cyl(0.86, 0.05, plate(), [0, 1.36, 0], undefined, 6); // plato
  G.cyl(0.7, 0.03, bronze(), [0, 1.39, 0], undefined, 6); // anillo de bronce del plato
  G.sph(0.34, plate(), [0, 1.5, 0]); // cabeza
  G.sph(0.13, eye(), [0, 1.52, 0.27]); // ojo
  bone(0);
  legs(K, CU_HIPS, [0.28, 0.2, 0], [0.56, -0.55, 0.02], 0.05, 1);
  return K.done(1.4);
}
function healerPose(_v: number, walk: number, atk: number) {
  const out = legPose([B.Matrix.Translation(0, 0.03 * Math.abs(Math.sin(walk * Math.PI * 2)), 0)], CU_HIPS, walk, 0.36, 0.3);
  out.push(B.Matrix.RotationY((walk * Math.PI) / 3).multiply(B.Matrix.Translation(0, 0.08 * Math.sin(atk * Math.PI), 0))); // el plato hexagonal gira 60° por ciclo: el giro no salta
  return out;
}

/** Plantillas Folded con caminata horneada (glb.ts las agrega a PROC). */
export const ALIEN_PROC: Record<Alien, { build: (vis: number) => B.Mesh[]; bones: number; pose: (vis: number, walk: number, atk: number) => B.Matrix[] }> = {
  enjambre: { build: swarmBody, bones: 5, pose: swarmPose },
  tirador: { build: shooterBody, bones: 6, pose: shooterPose },
  saltador: { build: jumperBody, bones: 5, pose: jumperPose },
  emboscador: { build: ambushBody, bones: 6, pose: ambushPose },
  flotante: { build: floaterBody, bones: 4, pose: floaterPose },
  tanque: { build: tankBody, bones: 7, pose: tankPose },
  explosivo: { build: bomberBody, bones: 5, pose: bomberPose },
  curandero: { build: healerBody, bones: 6, pose: healerPose },
};
/** Registro en GLB (glb.ts): sin archivo; atk = segundos de su animación de ataque (carga del tirador, agazapada del saltador, mecha del explosivo). */
export const ALIEN_GLB = {
  enjambre: { file: "enjambre", scale: 1 },
  tirador: { file: "tirador", scale: 1, atk: ATK.alien_tirador_aviso_s },
  saltador: { file: "saltador", scale: 1, atk: ATK.alien_saltador_aviso_s },
  emboscador: { file: "emboscador", scale: 1 },
  flotante: { file: "flotante", scale: 1 },
  tanque: { file: "tanque", scale: 1 },
  explosivo: { file: "explosivo", scale: 1, atk: ATK.alien_explosivo_aviso_s },
  curandero: { file: "curandero", scale: 1 },
};

// ---------- IA (enemies.ts → think, en el marco local del bicho) ----------
// Devuelve: número = multiplicador de la persecución común (negativo = se aleja); texto = evento para main.ts; null = ya movió el cuerpo.
type AI = (e: Enemy, dt: number, to: B.Vector3, dist: number) => number | string | null;
let packOwed = 0; // compañeros de enjambre ya pedidos que todavía no pensaron (no piden otra manada)
const fly = new WeakMap<Enemy, { from: B.Vector3; t: number }>();
const _p = new B.Vector3();
const floating = new WeakSet<Enemy>();
/** Gira hacia to a lo sumo turn rad/s y avanza solo hacia donde mira (el tanque: se lo puede rodear). En el marco local, como la IA. */
function crawl(e: Enemy, dt: number, to: B.Vector3, speed: number, turn: number) {
  const f = MOON.on ? flatL(e.node.forward, e.pos) : e.node.forward.clone(); f.y = 0; f.normalize();
  const diff = Math.atan2(f.z * to.x - f.x * to.z, f.x * to.x + f.z * to.z), v = e.body.getLinearVelocity(), k = Math.min(1, dt * 4);
  const s = speed * Math.max(0, Math.cos(diff));
  e.body.setLinearVelocity(new B.Vector3(v.x + (f.x * s - v.x) * k, v.y, v.z + (f.z * s - v.z) * k));
  e.body.setAngularVelocity(new B.Vector3(0, B.Scalar.Clamp(diff * 4, -turn, turn), 0));
}
const slowMul = (e: Enemy) => (e.slow > 0 ? ATK.bicho_lento_mult : 1);
export const ALIEN_AI: Record<Alien, AI> = {
  // Llega en manada (el primero pide al resto alrededor suyo) y zigzaguea de a muchos hasta estar encima
  enjambre: (e, _dt, to, dist) => {
    if (!e.state) {
      e.state = 1;
      if (packOwed > 0) packOwed--;
      else if (LUNA.spawn) {
        const n = ATK.alien_enjambre_grupo - 1;
        packOwed += n;
        for (let i = 0; i < n; i++) { const a = rng() * 6.3, r = 1.5 + rng() * 2.5; LUNA.spawn("enjambre" as Kind, at(e.pos, Math.cos(a) * r, 0, Math.sin(a) * r)); }
      }
    }
    if (dist > 4) { const w = Math.sin(e.clock * 3 + e.walk) * 0.6, x = to.x, z = to.z; to.x = x * Math.cos(w) + z * Math.sin(w); to.z = -x * Math.sin(w) + z * Math.cos(w); }
    return 1;
  },
  // Guarda distancia; se planta, carga la pistolita (aviso: chispas + el caño que sube) y suelta un anillo lento hacia donde está el auto
  tirador: (e, dt, _to, dist) => {
    if (e.atk >= 0) {
      if ((e.atk += dt) < ATK.alien_tirador_aviso_s) return 0;
      e.atk = -1; e.timer = ATK.alien_tirador_cada_s;
      return "wave";
    }
    e.timer -= dt;
    if (dist < ATK.alien_tirador_cerca) return -0.8; // retrocede mirando al auto
    if (dist > ATK.alien_tirador_distancia) return 1;
    if (e.timer <= 0) { e.atk = 0; return "spit_aim"; }
    return 0;
  },
  // Se agazapa con un aro donde va a caer (fijo: moverse es esquivarlo) y salta en un arco largo de baja gravedad (arc de moon.ts)
  saltador: (e, dt, to, dist) => {
    const R = ATK.alien_saltador_radio, wind = ATK.alien_saltador_aviso_s;
    if (e.state === 2) {
      const f = fly.get(e)!;
      f.t += dt / ATK.alien_saltador_vuelo_s;
      arc(f.from, e.land, Math.min(1, f.t), ATK.alien_saltador_altura, _p);
      const v = _p.subtractInPlace(e.pos).scaleInPlace(1 / Math.max(dt, 1e-3)); // la velocidad que lo lleva al punto del arco
      e.body.setLinearVelocity(MOON.on ? toLocal(v, e.pos) : v.clone()); e.body.setAngularVelocity(B.Vector3.Zero());
      if (f.t >= 1) { e.state = 0; e.atk = -1; e.timer = ATK.alien_saltador_cada_s; e.body.setGravityFactor(1); e.showTele(null); FX.dust(e.pos); }
      return null;
    }
    if (e.state === 1) {
      e.showTele(e.land, R, (e.atk += dt) / wind);
      if (e.atk < wind) return 0;
      e.state = 2; e.atk = 0; e.body.setGravityFactor(0); // en el aire lo lleva el arco (atk 0 = patas estiradas)
      const f = fly.get(e) ?? fly.set(e, { from: new B.Vector3(), t: 0 }).get(e)!;
      f.from.copyFrom(e.pos); f.t = 0;
      return null;
    }
    e.timer -= dt;
    if (e.timer <= 0 && dist > ATK.alien_saltador_min && dist < ATK.alien_saltador_alcance) {
      e.state = 1; e.atk = 0;
      onFloor(at(e.pos, to.x * dist, 0, to.z * dist), 0, e.land); // cae donde está el auto ahora
      return 0;
    }
    return 1;
  },
  // Enterrado (solo asoma el señuelo de luz), se acerca bajo tierra si el auto está lejos; cerca, salta encima y persigue un rato
  emboscador: (e, dt, to, dist) => {
    if (e.state === 0) {
      if (MOON.on) FOOT.set(e.body, -ATK.alien_emboscador_hondo); // el piso de moon.ts lo sostiene bajo la superficie
      e.touchCd = Math.max(e.touchCd, 0.3); // enterrado no muerde
      if (dist > ATK.alien_emboscador_radio) return dist > 25 ? 0.35 : 0;
      FOOT.delete(e.body); e.state = 1; e.timer = ATK.alien_emboscador_activo_s;
      e.body.setLinearVelocity(new B.Vector3(to.x * ATK.alien_emboscador_salto, 7, to.z * ATK.alien_emboscador_salto));
      FX.dust(e.pos);
      return "spit_aim"; // chispas + marca en el piso donde salió
    }
    if ((e.timer -= dt) <= 0 && dist > ATK.alien_emboscador_radio * 2) e.state = 0; // lejos otra vez: se vuelve a enterrar
    return 1;
  },
  // Vuela a altura fija sobre el radio de la luna (no sigue el piso: pasa por encima de cráteres y montículos), ronda al auto
  // y cada tanto baja en picada contra él; después vuelve a subir
  flotante: (e, dt, to, dist) => {
    if (!floating.has(e)) { floating.add(e); e.body.setGravityFactor(0); e.dir = rng() < 0.5 ? 1 : -1; } // e.dir: sentido de la ronda
    const v = e.body.getLinearVelocity(), dive = e.state === 1;
    let sp = e.def.speed * e.spd * slowMul(e), ev: string | null = null;
    if ((e.timer -= dt) <= 0 || (dive && e.touchCd > 0.5)) { // terminó la picada (o ya mordió): sube
      if (dive) { e.state = 0; e.timer = ATK.alien_flotante_cada_s; }
      else if (dist < ATK.alien_flotante_orbita * 1.6) { e.state = 1; e.timer = ATK.alien_flotante_picada_s; ev = "spit_aim"; } // aviso: chispas
    }
    let rx: number, tz: number; // hacia el auto / de costado
    if (e.state === 1) { sp *= ATK.alien_flotante_picada_vel; rx = 1; tz = 0; }
    else { rx = B.Scalar.Clamp((dist - ATK.alien_flotante_orbita) / 3, -0.6, 1); tz = 0.7 * e.dir; }
    const wx = (to.x * rx + to.z * tz) * sp, wz = (to.z * rx - to.x * tz) * sp;
    const hy = e.state === 1 ? 0.4 - (MOON.on ? alt(e.pos) : e.pos.y) : (MOON.on ? MOON.R : 0) + ATK.alien_flotante_altura - rad(e.pos);
    const k = Math.min(1, dt * 4), f = MOON.on ? flatL(e.node.forward, e.pos) : e.node.forward.clone(); f.y = 0; f.normalize();
    e.body.setLinearVelocity(new B.Vector3(v.x + (wx - v.x) * k, B.Scalar.Clamp(hy * 4, -12, 8), v.z + (wz - v.z) * k));
    e.body.setAngularVelocity(new B.Vector3(0, B.Scalar.Clamp(Math.atan2(f.z * to.x - f.x * to.z, f.x * to.x + f.z * to.z) * 6, -6, 6), 0));
    return ev;
  },
  // Lento y de giro corto: siempre encara al auto con la placa (armorMul), así que hay que rodearlo
  tanque: (e, dt, to) => { crawl(e, dt, to, e.def.speed * e.spd * slowMul(e), ATK.alien_tanque_giro); return null; },
  // Corre al auto; cerca se planta, se arma con un aro en el piso del tamaño de la explosión y revienta ("boom": main.ts daña y deja un cráter)
  explosivo: (e, dt, _to, dist) => {
    if (e.atk >= 0) {
      e.showTele(e.pos, ATK.alien_explosivo_radio, e.atk / ATK.alien_explosivo_aviso_s);
      return (e.atk += dt) >= ATK.alien_explosivo_aviso_s ? "boom" : 0;
    }
    if (dist < ATK.alien_explosivo_arma) e.atk = 0;
    return 1;
  },
  // Se queda atrás de los demás (a distancia del auto, como el tirador); el rayo que cura lo maneja healTick desde main.ts
  curandero: (_e, _dt, _to, dist) => (dist < ATK.alien_curandero_cerca ? -0.8 : dist > ATK.alien_curandero_distancia ? 1 : 0),
};

// ---------- Onda del tirador: anillo cian que viaja lento a la altura del auto (main.ts lo mueve como el ácido) ----------
const waveTpl = () => template("alienOnda", () => [tor(1.5, 0.16, glow(CYAN), [0, 0, 0], [Math.PI / 2, 0, 0], 16), sph(0.36, glow(GREEN), [0, 0, 0], undefined, 6)]);
/** Proyectil de la onda (forma de los escupitajos de main.ts): sale del caño y va derecho hacia donde estaba el auto al disparar. */
export function alienWave(e: Enemy, car: B.Vector3) {
  const from = at(e.pos, 0, 1.2, 0), dir = car.subtract(from).normalize(), m = waveTpl().createInstance("onda");
  m.position.copyFrom(from);
  // ponytail: la orientación se fija al salir; en la luna el anillo se inclina un poco al recorrer la curva (≤25°); techo: reorientarlo por cuadro
  if (MOON.on) m.rotationQuaternion = alignYaw(from, yawOf(dir, from)); else m.rotation.y = Math.atan2(dir.x, dir.z);
  return { m, v: dir.scale(ATK.alien_onda_vel), life: ATK.alien_onda_vida_s, k: e.kind, float: true }; // float: sin caída (main.ts)
}

// ---------- Tanque: blindaje frontal ----------
const FRONT = Math.cos((ATK.alien_tanque_frente_grados * Math.PI) / 180);
/** Multiplicador del daño que recibe e si el golpe viene de from (main.ts damage(), con la posición del auto): el tanque casi no siente
 *  lo que le entra por delante de la placa. ponytail: el origen es el auto, no el proyectil (todas las armas salen del auto); una explosión
 *  ajena (meteorito) desde atrás también cuenta por dónde está el auto. Techo: pasar el origen real del golpe a damage(). */
export function armorMul(e: Enemy, from: B.Vector3) {
  const sh = (shieldUntil.get(e) ?? 0) > healClock ? ATK.alien_curandero_escudo : 1; // escudo del curandero (healTick)
  if (e.kind !== "tanque") return sh;
  const d = hflat(from.subtract(e.pos), e.pos), l = d.length();
  return sh * (l > 1e-3 && B.Vector3.Dot(e.node.forward, d) / l > FRONT ? ATK.alien_tanque_blindaje : 1);
}
const shieldUntil = new WeakMap<Enemy, number>();
let healClock = 0; // reloj propio (suma el dt de cada curandero: solo importa que avance; el escudo se renueva cada cuadro mientras el rayo lo toca)

// ---------- Curandero: rayo verde al aliado más herido en alcance y halo sobre él (instancias hijas: se van con el curandero) ----------
const beamTpl = () => { const t = template("alienRayo", () => [cyl(0.08, 0.08, 1, glow(GREEN), [0, 0.5, 0], undefined, 6)]); shadows.removeShadowCaster(t); return t; };
const haloTpl = () => { const t = template("alienHalo", () => [tor(2, 0.06, glow(GREEN), [0, 0.08, 0], undefined, 20), tor(1.5, 0.04, glow(CYAN), [0, 0.6, 0], undefined, 16)]); shadows.removeShadowCaster(t); return t; };
// Burbuja del escudo (esfera cian translúcida, diámetro 1; se escala al aliado): distingue el escudo de la cura
const bubbleTpl = () => { const t = template("alienEscudo", () => [sph(1, pbr("alienEscudoM", { color: "#3ff2ff", rough: 0.2, emissive: "#3ff2ff", alpha: 0.28 }), [0, 0, 0], undefined, 12)]); shadows.removeShadowCaster(t); return t; };
const heal = new WeakMap<Enemy, { beam: B.InstancedMesh; halo: B.InstancedMesh; bub: B.InstancedMesh }>();
const _inv = new B.Matrix(), _a = new B.Vector3(), _b = new B.Vector3(), UP = B.Vector3.Up();
/** Cada cuadro (main.ts, salvo aturdido): repone vida al aliado más herido dentro del alcance; vis = dibujar el rayo (no en __sim). */
export function healTick(e: Enemy, all: Enemy[], dt: number, vis: boolean) {
  let best: Enemy | null = null, low = 1;
  for (const o of all) {
    if (o === e || o.def.boss || o.hp <= 0) continue;
    const f = o.hp / o.maxHp;
    if (f < low && hd(o.pos, e.pos) < ATK.alien_curandero_radio) { low = f; best = o; }
  }
  healClock += dt;
  if (best) { best.hp = Math.min(best.maxHp, best.hp + best.maxHp * ATK.alien_curandero_cura * dt); shieldUntil.set(best, healClock + 0.25); }
  if (!vis) return;
  let fx = heal.get(e);
  if (!best) { if (fx) fx.beam.isVisible = fx.halo.isVisible = fx.bub.isVisible = false; return; }
  if (!fx) {
    fx = { beam: beamTpl().createInstance("rayo"), halo: haloTpl().createInstance("halo"), bub: bubbleTpl().createInstance("escudo") };
    fx.beam.parent = fx.halo.parent = fx.bub.parent = e.node; fx.beam.isPickable = fx.halo.isPickable = fx.bub.isPickable = false;
    fx.beam.rotationQuaternion = new B.Quaternion(); fx.halo.rotationQuaternion = new B.Quaternion();
    heal.set(e, fx);
  }
  fx.beam.isVisible = fx.halo.isVisible = fx.bub.isVisible = true;
  e.node.getWorldMatrix().invertToRef(_inv); // todo en el marco del curandero (son sus hijos)
  B.Vector3.TransformCoordinatesToRef(at(best.pos, 0, best.def.size[1] * 0.6, 0), _inv, _b);
  _b.subtractToRef(CU_HEAD, _a);
  fx.beam.position.copyFrom(CU_HEAD); fx.beam.scaling.set(1, _a.length(), 1);
  B.Quaternion.FromUnitVectorsToRef(UP, _a.normalize(), fx.beam.rotationQuaternion!);
  B.Vector3.TransformCoordinatesToRef(best.pos, _inv, fx.halo.position);
  B.Vector3.TransformCoordinatesToRef(at(best.pos, 0, best.def.size[1] * 0.5, 0), _inv, fx.bub.position);
  fx.bub.scaling.setAll(best.radius * 2.6 * (1 + 0.04 * Math.sin(e.clock * 10)));
  fx.halo.scaling.setAll(best.radius * 1.3 * (1 + 0.08 * Math.sin(e.clock * 8)));
  if (MOON.on && e.node.rotationQuaternion) B.Quaternion.InverseToRef(e.node.rotationQuaternion, fx.halo.rotationQuaternion!).multiplyInPlace(alignYaw(best.pos, 0)); // parado en el piso del aliado
}
