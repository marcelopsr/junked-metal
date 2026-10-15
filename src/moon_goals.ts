import * as B from "@babylonjs/core";
import { BAL } from "./balance";
import { FX } from "./fx";
import { box, cyl, sph, template, tor } from "./models";
import { alignYaw, hd, LUNA, MOON, onFloor, ringAt } from "./moon";
export { COOP } from "./moon_events";
import { nodrizaDrops, SHIP_IO } from "./moon_ships";
import { pbr } from "./render";
import { rng } from "./rng";
import { obstacles } from "./world";
import { banner } from "./ui";
import { primeraVez } from "./encore_run";

// ---------- Objetivos en la superficie y cohete de escape (fase 3, docs/LUNA.md puntos 2 y 3) ----------
// Cada luna_obj_cada_s aparece un objetivo lejos del auto (baliza alta + radar): juntar celdas a tiempo o quedarse en la zona de una antena.
// Al salir el gusano (jefe final) aterriza el cohete: quedarse luna_cohete_s en su zona = victoria "Escape". Premio de objetivo = el de la nodriza (SHIP_IO.reward).
const A = BAL.ataques;
/** main.ts llena win: victoria alternativa por escape (en ENCORE, activar el teleportador: tele = true cambia el rótulo de la barra). */
export const GOAL_IO: { win: (p: B.Vector3) => void; tele: boolean; scrap: () => number; hpFrac: (who: number) => number; pay: (scrap: number, hpFrac: number, who: number) => void; offer: (kind: "cofre" | "maquina" | "especial", who: number) => void; half: number; phase: () => string } = { win: () => {}, tele: false, half: 0, scrap: () => 0, hpFrac: () => 1, pay: () => {}, offer: () => {}, phase: () => "" };

const mats = () => {
  const glow = (n: string, c: string, a = 1) => { const m = pbr(n, { color: c, rough: 0.3, emissive: c, alpha: a }); m.fogEnabled = false; m.emissiveIntensity = 2.4; return m; };
  return { y: glow("objLuz", "#ffb347"), beam: glow("objHaz", "#ffb347", 0.22), hull: pbr("naveCasco", { color: "#5b6168", rough: 0.45, metal: 0.8 }), rust: pbr("naveOxido", { color: "#8a5a3a", rough: 0.8, metal: 0.3 }), dark: pbr("naveOscuro", { color: "#24262b", rough: 0.6, metal: 0.5 }) };
};
// Baliza: haz de 60 m sin niebla, se ve desde el otro lado del horizonte cercano
const beaconTpl = () => template("obj_baliza", () => { const L = mats(); return [cyl(1.2, 2.4, 60, L.beam, [0, 30, 0], undefined, 10)]; });
const cellTpl = () => template("obj_celda", () => { const L = mats(); return [cyl(0.9, 0.9, 1.4, L.dark, [0, 0.7, 0], undefined, 8), cyl(0.6, 0.6, 1.5, L.y, [0, 0.7, 0], undefined, 8), box(1.1, 0.2, 1.1, L.rust, [0, 1.5, 0], [0.2, 0.4, 0])]; });
const antennaTpl = () => template("obj_antena", () => { const L = mats(); return [ // mástil de chapa plegada con plato torcido y luz
  box(2.4, 0.5, 2.4, L.rust, [0, 0.25, 0], [0, 0.4, 0]), cyl(0.35, 0.6, 7, L.hull, [0, 3.5, 0], undefined, 6), cyl(3.2, 0.6, 0.8, L.dark, [0, 6.6, 0.4], [0.6, 0, 0], 10),
  sph(0.6, L.y, [0, 7.4, 0], undefined, 4), box(1.6, 0.15, 0.6, L.rust, [0.6, 2.4, 0], [0, 0, 0.5])]; });
// Juguete de chapa pintada (ref318): huevo crema con paneles naranja, ojos de buey cian, banda luminosa, tres patas articuladas, puerta abierta con rampa y antena con bolita.
const dim = (m: B.PBRMaterial, k: number) => { m.emissiveIntensity = k; return m; }; // pantallas y lentes: con 2 se queman a blanco
const toy = (n: string, color: string, o: { rough?: number; metal?: number; glow?: boolean; alpha?: number } = {}) => { const m = pbr(n, { color, rough: o.rough ?? 0.55, metal: o.metal ?? 0.15, ...(o.glow ? { emissive: color } : {}), ...(o.alpha ? { alpha: o.alpha } : {}) }); if (o.glow) m.emissiveIntensity = 2; return m; };
// Lascas de pintura (desgaste): cajitas finas pegadas a las aristas de la cara frontal (+z) de una caja; posiciones de un hash fijo, sin rng().
const chips = (m: B.Material, cx: number, cy: number, cz: number, w: number, h: number, d: number, n: number, s: number) => Array.from({ length: n }, (_, i) => {
  const u = mix(s + i * 3), v = mix(s + i * 3 + 1), l = 0.14 + 0.22 * mix(s + i * 3 + 2), side = i % 2 ? 1 : -1;
  return i % 3 ? box(l, 0.09, 0.04, m, [cx + (u - 0.5) * w, cy + side * (h / 2 - 0.05), cz + d / 2 + 0.01]) : box(0.09, l, 0.04, m, [cx + side * (w / 2 - 0.05), cy + (v - 0.5) * h, cz + d / 2 + 0.01]); });
const rocketTpl = () => template("obj_cohete", () => {
  const cream = toy("cohCrema", "#d9cdb4", { rough: 0.6 }), ora = toy("cohNaranja", "#e8731c"), steel = toy("cohAcero", "#6c6a68", { rough: 0.4, metal: 0.8 }), glow = toy("cohCian", "#3de6ff", { glow: true }), dark = toy("cohHueco", "#2a2623", { rough: 0.7 });
  const legs = [0, 2.1, 4.2].flatMap((a) => { const s = Math.sin(a), c = Math.cos(a); return [
    box(0.9, 3.4, 0.9, ora, [s * 2.9, 1.9, c * 2.9], [c * 0.55, a, -s * 0.55]), cyl(1.9, 2.3, 0.35, steel, [s * 3.6, 0.18, c * 3.6], undefined, 10), cyl(0.9, 0.9, 0.5, steel, [s * 2.3, 3.4, c * 2.3], [Math.PI / 2, 0, 0], 8)]; });
  const rivets = Array.from({ length: 10 }, (_, i) => { const a = i * 0.63; return sph(0.28, steel, [Math.sin(a) * 2.78, 7.1, Math.cos(a) * 2.78], undefined, 4); });
  return [
    cyl(5.2, 5.8, 3.4, cream, [0, 3.6, 0], undefined, 12), cyl(3.4, 5.2, 3, cream, [0, 6.8, 0], undefined, 12), cyl(1, 3.4, 3.6, ora, [0, 10, 0], undefined, 12), // casco: panza, hombros, nariz naranja
    cyl(5.45, 5.45, 0.5, steel, [0, 5.4, 0], undefined, 12), cyl(3.7, 3.7, 0.35, steel, [0, 8.3, 0], undefined, 12), // cinchas
    cyl(5.5, 5.5, 0.18, glow, [0, 5.4, 0], undefined, 12), cyl(1.1, 1.1, 0.5, steel, [0, 11.9, 0], undefined, 8), cyl(0.18, 0.18, 1.6, steel, [0, 12.7, 0], undefined, 5), sph(0.6, ora, [0, 13.6, 0], undefined, 4), // banda luminosa, antena
    cyl(1.5, 1.5, 0.35, steel, [0, 3.7, 3.0], [Math.PI / 2, 0, 0], 10), cyl(1.1, 1.1, 0.4, glow, [0, 3.7, 3.05], [Math.PI / 2, 0, 0], 10), // ojo de buey bajo
    cyl(1.4, 1.4, 0.35, steel, [1.4, 7.3, 2.45], [Math.PI / 2 - 0.2, 0.5, 0], 10), cyl(1, 1, 0.4, glow, [1.4, 7.3, 2.5], [Math.PI / 2 - 0.2, 0.5, 0], 10),
    box(2.2, 3.2, 0.5, dark, [-1.4, 2.3, 3.55], [0, -0.45, 0]), box(0.2, 3.2, 0.12, ora, [-0.4, 2.3, 3.85], [0, -0.45, 0]), box(2.2, 3.4, 0.35, ora, [-3.3, 2.7, 3.3], [0, -1.2, 0]), // puerta abierta con hueco y hoja naranja
    box(1.6, 0.18, 3.2, steel, [-0.6, 0.6, 4.6], [0.38, -0.1, 0]), // rampa
    cyl(0.9, 0.9, 2.2, steel, [0.4, 1.7, 3.6], undefined, 8), box(2.6, 0.5, 1.8, ora, [2.6, 3.7, 2.4], [0, -0.7, 0]), // caño y panel de ventilas
    cyl(3.4, 4.2, 0.7, steel, [0, 0.35, 0], undefined, 12), tor(3.2, 0.25, glow, [0, 0.2, 0], undefined, 12), ...legs, ...rivets];
});
// ENCORE: el cohete es el teleportador. Escenario de show de chatarra: tarima con focos + marco giratorio de bombillas + haz. Un solo dibujo estático y un marco que gira (2 instancias).
const teleMats = () => { const L = mats(), bulb = pbr("teleFoco", { color: "#ffd9a0", rough: 0.3, emissive: "#ffb347" }); bulb.fogEnabled = false; return { ...L, bulb, beam: pbr("teleHaz", { color: "#ffb347", rough: 0.3, emissive: "#ffb347", alpha: 0.18 }) }; };
const teleBaseTpl = () => template("obj_tele_base", () => { const L = teleMats(); return [
  cyl(7, 7.4, 0.5, L.dark, [0, 0.25, 0], undefined, 12), cyl(5.2, 5.6, 0.3, L.rust, [0, 0.65, 0], undefined, 12), cyl(4.4, 4.4, 0.1, L.bulb, [0, 0.83, 0], undefined, 12),
  ...[0, 1, 2, 3].map((i) => { const a = i * Math.PI / 2 + 0.78; return box(0.5, 2.6, 0.5, L.hull, [Math.sin(a) * 3.3, 1.5, Math.cos(a) * 3.3], [0.15 * Math.cos(a), 0, -0.15 * Math.sin(a)]); }), // trusses torcidos
  ...[0, 1, 2, 3].map((i) => { const a = i * Math.PI / 2 + 0.78; return sph(0.6, L.bulb, [Math.sin(a) * 3.5, 2.9, Math.cos(a) * 3.5], undefined, 4); }),
  cyl(3.6, 3.6, 14, L.beam, [0, 7.8, 0], undefined, 10)]; });
const teleFrameTpl = () => template("obj_tele_marco", () => { const L = teleMats(); return [ // aro vertical de chapa con focos, gira sobre su eje
  tor(5.4, 0.5, L.hull, [0, 3.6, 0], [Math.PI / 2, 0, 0], 14), tor(4.4, 0.15, L.rust, [0, 3.6, 0], [Math.PI / 2, 0, 0], 14),
  ...Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return sph(0.55, L.bulb, [Math.sin(a) * 2.7, 3.6 + Math.cos(a) * 2.7, 0], undefined, 4); }),
  box(0.4, 1.4, 0.4, L.rust, [0, 0.9, 0.3], [0.2, 0, 0.1])]; });
// R5: foco del FINAL ACT: pie de chapa, cabeza con lámpara y haz alto (sin niebla); se coloca en anillo (spotsPlan).
const spotTpl = () => template("obj_foco", () => { const L = teleMats(); return [
  cyl(0.9, 1.4, 1, L.dark, [0, 0.5, 0], undefined, 8), cyl(0.2, 0.3, 5, L.hull, [0, 3.5, 0], undefined, 6), sph(1.1, L.bulb, [0, 6.2, 0], undefined, 5), cyl(4, 0.8, 70, L.beam, [0, 41, 0], undefined, 10)]; });
const ringTpl = () => template("obj_aro", () => { const L = mats(); return [tor(2, 0.08, L.y, [0, 0, 0], undefined, 32)]; }); // zona: aro escalado al radio

// ---------- ENCORE: cofres de pago y máquina de opciones (docs/ENCORE/R0/R1_SLICE.md, "Cofres") ----------
// 3 cofres (cuestan tornillos de la run) y 1 máquina (cobra vida actual) por escenario; sitio y orden salen de un hash de (semilla, escenario), nunca del rng() de la partida.
// Cofre de chatarra (ref312): caja de chapa turquesa, tapa de tablas con cinchas y esquineros amarillos, cierre central, asa y antena con bolita. Huella 2,2 x 1,5 como el anterior.
const chestTpl = () => template("obj_cofre_pago", () => {
  const teal = toy("cofTurquesa", "#2f7f86", { rough: 0.6, metal: 0.3 }), yel = toy("cofAmarillo", "#e0a420"), wood = toy("cofMadera", "#6b4529", { rough: 0.85, metal: 0 }), steel = toy("cofAcero", "#55524f", { rough: 0.45, metal: 0.8 }), rust = toy("cofOxido", "#8a4a24", { rough: 0.8, metal: 0.3 });
  const corners = [-1, 1].flatMap((x) => [-1, 1].flatMap((z) => [box(0.5, 0.95, 0.5, steel, [x * 1.0, 0.55, z * 0.62]), box(0.62, 0.34, 0.62, yel, [x * 1.0, 1.35, z * 0.62]), sph(0.2, rust, [x * 1.0, 1.55, z * 0.62], undefined, 4), box(0.6, 0.18, 0.6, steel, [x * 1.0, 0.09, z * 0.62])]));
  return [
    box(2.0, 0.85, 1.4, teal, [0, 0.55, 0]), box(1.7, 0.6, 0.12, steel, [0, 0.62, 0.7]), box(1.9, 0.5, 1.3, wood, [0, 1.2, 0]), // cuerpo y tapa de tablas
    box(0.3, 0.52, 1.5, steel, [0.45, 1.22, 0], [0, 0, 0]), box(0.3, 0.52, 1.5, steel, [-0.45, 1.22, 0]), box(2.2, 0.2, 1.55, steel, [0, 0.98, 0]), // cinchas y faja
    box(0.8, 0.5, 0.18, steel, [0, 1.05, 0.78]), box(0.5, 0.6, 0.12, steel, [0, 0.6, 0.78]), box(0.32, 0.32, 0.1, yel, [0, 0.62, 0.86]), // cierre
    box(0.55, 0.08, 0.1, yel, [0.9, 1.5, 0.3], [0, 0.15, 0]), box(0.55, 0.08, 0.1, yel, [0.9, 1.5, 0.05], [0, 0.15, 0]),
    tor(0.55, 0.07, steel, [-1.12, 0.65, 0], [0, Math.PI / 2, 0], 8), cyl(0.12, 0.16, 0.9, steel, [0.95, 1.9, -0.5], undefined, 6), sph(0.3, rust, [0.95, 2.4, -0.5], undefined, 4), ...corners,
    ...chips(rust, 0, 0.55, 0.7, 2.0, 0.85, 0, 12, 11), ...chips(toy("cofLasca", "#b4aca0", { rough: 0.5, metal: 0.7 }), 0, 0.55, 0.7, 2.0, 0.85, 0, 8, 41)]; });
// Máquina de opciones (ref320): caja azul con pintura saltada, tres vitrinas con piezas, placas de latón, perillas, bandeja, asa y antena. Huella 2 x 1,6, alto 3,4.
const machineTpl = () => template("obj_maquina", () => {
  const blue = toy("maqAzul", "#2f5f94", { rough: 0.6, metal: 0.35 }), brass = toy("maqLaton", "#b88a3c", { rough: 0.4, metal: 0.85 }), steel = toy("maqAcero", "#58565a", { rough: 0.45, metal: 0.8 }), glass = toy("maqVidrio", "#a9d6e8", { rough: 0.1, metal: 0, alpha: 0.35 }), dark = toy("maqHueco", "#26272b", { rough: 0.7 }), fondo = toy("maqFondo", "#a9b1b9", { rough: 0.5, metal: 0.3 });
  const col = [-0.62, 0, 0.62], bits = ["#c8683c", "#8a8f96", "#d9b05a"];
  return [
    box(2, 2.6, 1.5, blue, [0, 1.6, 0]), box(2.15, 0.25, 1.65, blue, [0, 3.0, 0]), box(1.9, 0.2, 1.4, steel, [0, 0.3, 0]), // caja, tapa y zócalo
    ...[-1, 1].flatMap((x) => [-1, 1].flatMap((z) => [cyl(0.5, 0.6, 0.18, steel, [x * 0.85, 0.09, z * 0.6], undefined, 8), box(0.3, 0.3, 0.3, brass, [x * 1.0, 0.7, z * 0.7])])), // patas y escuadras
    ...col.flatMap((x, i) => [box(0.62, 0.89, 0.06, dark, [x, 2.35, 0.77]), box(0.5, 0.77, 0.06, fondo, [x, 2.35, 0.82]), sph(0.34, toy(`maqPieza${i}`, bits[i], { metal: 0.6 }), [x, 2.2, 0.92], undefined, 5), box(0.5, 0.75, 0.04, glass, [x, 2.35, 1.06]), box(0.44, 0.14, 0.08, brass, [x, 1.72, 0.78]), cyl(0.36, 0.36, 0.14, brass, [x, 1.3, 0.78], [Math.PI / 2, 0, 0], 10), box(0.16, 0.26, 0.14, steel, [x, 1.3, 0.88], [0, 0, 0.5])]),
    box(0.9, 0.3, 0.5, steel, [0, 0.8, 0.95], [0.25, 0, 0]), // bandeja
    box(1.2, 0.06, 0.1, steel, [0, 3.35, 0]), box(0.1, 0.18, 0.1, steel, [-0.6, 3.25, 0]), box(0.1, 0.18, 0.1, steel, [0.6, 3.25, 0]), // asa
    box(0.1, 0.9, 0.6, dark, [1.03, 1.2, 0.1]), cyl(0.05, 0.1, 1.4, steel, [-0.85, 3.8, -0.3], [0, 0, 0.18], 5), sph(0.3, brass, [-0.97, 4.5, -0.3], undefined, 4),
    ...chips(toy("maqLasca", "#b8b0a4", { rough: 0.5, metal: 0.7 }), 0, 1.6, 0.75, 2, 2.6, 0, 10, 77), ...chips(toy("maqOxido", "#8a4a24", { rough: 0.8, metal: 0.3 }), 0, 1.6, 0.75, 2, 2.6, 0, 12, 91)]; });
// ---------- ENCORE fase 1: escenografía del Director y objetos de pactos/rutas/sobrecarga (refs 311, 313-317, 319), solo decorativos ----------
// Cofre especial (ref313): caja granate con tapa abovedada, fajas y esquineros de latón, cerradura redonda con ojo de cerradura, gema ámbar y patas.
const specialChestTpl = () => template("obj_cofre_especial", () => {
  const red = toy("cfeGranate", "#8e1b2a", { rough: 0.6, metal: 0.3 }), brass = toy("cfeLaton", "#b88a2e", { rough: 0.4, metal: 0.85 }), steel = toy("cfeAcero", "#3d3b3a", { rough: 0.5, metal: 0.8 }), gem = dim(toy("cfeGema", "#ff9a1f", { glow: true }), 1);
  const corners = [-1, 1].flatMap((x) => [-1, 1].flatMap((z) => [box(0.5, 0.95, 0.5, brass, [x * 1.0, 0.55, z * 0.62]), box(0.3, 0.3, 0.3, steel, [x * 1.02, 0.15, z * 0.64]), cyl(0.55, 0.7, 0.2, steel, [x * 1.0, 0.1, z * 0.62], undefined, 6)]));
  return [
    box(2.0, 0.9, 1.4, red, [0, 0.65, 0]), box(2.1, 0.12, 1.5, steel, [0, 0.95, 0]), cyl(1.4, 1.4, 2.0, red, [0, 1.0, 0], [0, 0, Math.PI / 2], 14), // cuerpo, faja y tapa abovedada (cilindro tumbado)
    ...[-0.62, 0.62].map((x) => cyl(1.5, 1.5, 0.16, brass, [x, 1.0, 0], [0, 0, Math.PI / 2], 14)), // dos arcos de latón sobre la tapa
    tor(0.8, 0.14, brass, [0, 0.62, 0.74], [Math.PI / 2, 0, 0], 12), cyl(0.38, 0.38, 0.1, steel, [0, 0.62, 0.76], [Math.PI / 2, 0, 0], 8), box(0.1, 0.22, 0.06, red, [0, 0.62, 0.83]), // cerradura
    box(0.3, 0.3, 0.3, brass, [0, 0.62, 0.78]), box(0.3, 0.3, 0.3, brass, [0, 1.15, 0.7]), tor(0.45, 0.07, brass, [0, 1.7, 0.1], undefined, 8), sph(0.36, gem, [0, 1.7, 0.1], undefined, 4), // ojo, gema ámbar
    box(0.25, 0.1, 0.4, brass, [1.05, 0.7, 0], [0, 0, 0]), cyl(0.12, 0.12, 0.7, brass, [1.12, 0.65, 0], [Math.PI / 2, 0, 0], 6), ...corners]; });
// Terminal de pactos (ref319): pedestal granate, cabeza inclinada con pantalla verde, botón crema y botón rojo, placas de latón, ranura, asas de tubo y antena con bolita. Alto 3,4.
const terminalTpl = () => template("obj_terminal_pactos", () => {
  const red = toy("terGranate", "#8e1b2a", { rough: 0.6, metal: 0.3 }), brass = toy("terLaton", "#b88a2e", { rough: 0.4, metal: 0.85 }), steel = toy("terAcero", "#3d3b3a", { rough: 0.5, metal: 0.8 }), scr = dim(toy("terPantalla", "#52d46a", { glow: true }), 0.7), cream = toy("terCrema", "#e8dcc0", { rough: 0.7 }), rbtn = toy("terRojo", "#d8231f", { rough: 0.5 });
  return [
    box(1.2, 0.3, 1.2, steel, [0, 0.15, 0]), box(0.95, 1.6, 0.85, red, [0, 1.1, 0]), box(0.55, 0.9, 0.08, brass, [0, 1.0, 0.45]), box(0.1, 1.1, 0.6, steel, [-0.5, 1.4, -0.05]), // base, columna, placa
    box(1.15, 0.85, 0.95, red, [0, 2.3, 0.05], [0.35, 0, 0]), box(0.75, 0.5, 0.08, scr, [0, 2.55, 0.5], [0.35, 0, 0]), box(0.9, 0.62, 0.08, steel, [0, 2.55, 0.46], [0.35, 0, 0]), // cabeza y pantalla
    cyl(0.26, 0.26, 0.14, cream, [0.25, 2.1, 0.62], [1.2, 0, 0], 8), cyl(0.26, 0.26, 0.14, rbtn, [-0.25, 2.1, 0.62], [1.2, 0, 0], 8), box(0.7, 0.2, 0.06, brass, [0, 1.82, 0.62], [0.35, 0, 0]), box(0.5, 0.06, 0.06, steel, [0, 1.62, 0.5]),
    tor(0.95, 0.13, brass, [-0.72, 2.3, 0.05], [0, 0, Math.PI / 2], 10), tor(0.95, 0.13, brass, [0.72, 2.3, 0.05], [0, 0, Math.PI / 2], 10),
    ...chips(toy("terLasca", "#b8b0a4", { rough: 0.5, metal: 0.7 }), 0, 1.1, 0.425, 0.95, 1.6, 0, 8, 5), ...chips(toy("terOxido", "#8a4a24", { rough: 0.8, metal: 0.3 }), 0, 1.1, 0.425, 0.95, 1.6, 0, 8, 23),
    cyl(0.1, 0.12, 1.4, steel, [-0.5, 3.3, -0.3], undefined, 5), sph(0.26, brass, [-0.5, 4.05, -0.3], undefined, 4),
    ...[-1, 1].flatMap((x) => [-1, 1].map((z) => cyl(0.4, 0.55, 0.3, steel, [x * 0.55, 0.15, z * 0.5], undefined, 6)))]; });
// TV del Director (ref314): caja crema y turquesa oxidada con pantalla cian en espiral, perillas, luz roja, rejillas, dos antenas y cuatro patas. Mira a +z. Ancho 2,6.
const tvTpl = () => template("obj_tv_director", () => {
  const cream = toy("tvCrema", "#cfc6a8", { rough: 0.6, metal: 0.2 }), teal = toy("tvTurquesa", "#3b7d7a", { rough: 0.65, metal: 0.3 }), rust = toy("tvOxido", "#7b4a2c", { rough: 0.8, metal: 0.4 }), dark = toy("tvOscuro", "#26272b", { rough: 0.7 }), scr = dim(toy("tvPantalla", "#0f4a58", { glow: true }), 0.35), spi = dim(toy("tvEspiral", "#6fe6ff", { glow: true }), 0.8), red = toy("tvLuz", "#ff2a1a", { glow: true });
  return [
    box(2.6, 1.8, 1.8, teal, [0, 1.5, 0]), box(2.6, 1.8, 0.14, cream, [0, 1.5, 0.84]), box(2.05, 1.4, 0.08, dark, [0.2, 1.5, 0.9]), box(1.8, 1.15, 0.08, scr, [0.2, 1.5, 0.95]), // casco, marco y pantalla
    ...Array.from({ length: 44 }, (_, i) => { const t = i / 43, a = t * Math.PI * 4.2, r = 0.06 + 0.5 * t, x = 0.2 + Math.cos(a) * r, y = 1.5 + Math.sin(a) * r * 0.95; return box(0.12 + 0.1 * t, 0.045 + 0.04 * t, 0.03, spi, [x, y, 1.0], [0, 0, a + Math.PI / 2]); }), // espiral emisiva
    box(0.55, 1.5, 0.08, rust, [-1.05, 1.5, 0.92]), ...[0, 1].map((i) => [cyl(0.34, 0.34, 0.12, cream, [-1.05, 1.95 - i * 0.45, 0.98], [Math.PI / 2, 0, 0], 8), box(0.06, 0.3, 0.06, dark, [-1.05, 1.95 - i * 0.45, 1.06], [0, 0, 0.5 + i])]).flat(), sph(0.14, red, [-1.05, 1.0, 1.0], undefined, 4), box(0.4, 0.3, 0.06, dark, [-1.05, 0.7, 0.99]),
    box(0.1, 1.0, 0.7, dark, [1.32, 1.5, 0.2]), box(0.1, 0.5, 0.6, rust, [1.34, 1.2, 0.5]), // rejilla y parches del costado
    cyl(0.9, 1.1, 0.25, rust, [0, 2.5, -0.1], undefined, 8), cyl(0.05, 0.08, 2.2, rust, [-0.6, 3.5, -0.4], [0, 0, 0.9], 5), cyl(0.05, 0.08, 2.4, rust, [0.5, 3.6, -0.3], [0, 0, -0.45], 5), sph(0.16, rust, [-1.4, 4.35, -0.4], undefined, 4), sph(0.16, rust, [0.95, 4.65, -0.3], undefined, 4), // antenas
    ...[-1, 1].flatMap((x) => [-1, 1].map((z) => cyl(0.18, 0.3, 0.7, rust, [x * 1.1, 0.35, z * 0.7], [0.3 * z, 0, -0.3 * x], 5))), box(2.4, 0.1, 0.1, rust, [0, 0.55, 0.7]), box(2.4, 0.1, 0.1, rust, [0, 0.55, -0.7])]; });
// Foco del Director (ref315): cuerpo granate tumbado sobre trípode, lente ámbar, cuatro aletas negras, perilla de latón, asa y cable enrollado. Mira a +z. Alto 2,6.
const spotDirTpl = () => template("obj_foco_director", () => {
  const red = toy("fdGranate", "#8e1b2a", { rough: 0.6, metal: 0.3 }), brass = toy("fdLaton", "#b88a2e", { rough: 0.4, metal: 0.85 }), dark = toy("fdNegro", "#1f1f22", { rough: 0.7, metal: 0.3 }), lens = dim(toy("fdLente", "#ff9e2a", { glow: true }), 0.4);
  return [
    cyl(1.1, 1.1, 1.3, red, [0, 1.9, 0], [Math.PI / 2, 0, 0], 12), cyl(1.25, 1.25, 0.2, dark, [0, 1.9, 0.7], [Math.PI / 2, 0, 0], 12), sph(1.9, lens, [0, 1.9, 0.76], [1, 1, 0.32], 12), tor(1.3, 0.07, dark, [0, 1.9, 0.82], [Math.PI / 2, 0, 0], 12), // cuerpo, aro y lente abombada
    box(0.95, 0.75, 0.06, dark, [0, 2.75, 1.0], [-0.5, 0, 0]), box(0.95, 0.75, 0.06, dark, [0, 1.05, 1.0], [0.5, 0, 0]), box(0.06, 0.8, 0.8, dark, [0.95, 1.9, 1.0], [0, 0.5, 0]), box(0.06, 0.8, 0.8, dark, [-0.95, 1.9, 1.0], [0, -0.5, 0]), // aletas
    box(0.9, 0.12, 0.12, brass, [0, 2.65, 0.1]), cyl(0.3, 0.3, 0.24, brass, [-0.7, 1.9, -0.1], [0, 0, Math.PI / 2], 8), ...[0, 1, 2, 3].map((i) => tor(0.85, 0.15, dark, [-0.7 - i * 0.17, 1.3, -0.4], [0, 0, Math.PI / 2], 10)), cyl(0.07, 0.07, 1.2, dark, [-1.1, 0.7, -0.35], [0.4, 0, 0.3], 5), // cable enrollado
    cyl(0.25, 0.25, 0.6, dark, [0, 1.0, 0], undefined, 6), ...[0, 1, 2].map((i) => { const a = i * Math.PI * 2 / 3 + 0.4; return cyl(0.12, 0.16, 1.3, red, [Math.sin(a) * 0.4, 0.5, Math.cos(a) * 0.4], [Math.cos(a) * 0.45, 0, -Math.sin(a) * 0.45], 5); })]; });
// Baliza de ruta (ref311): caja naranja con trípode, plato satelital, antena, ojo cian y dos flechas (azul a la izquierda, amarilla a la derecha). Ancho 4,2, alto 3,6.
const routeBeaconTpl = () => template("obj_baliza_ruta", () => {
  const ora = toy("brNaranja", "#e8731c", { rough: 0.6, metal: 0.3 }), steel = toy("brAcero", "#5d5a58", { rough: 0.45, metal: 0.8 }), blue = toy("brAzul", "#3a6fae"), yel = toy("brAmarillo", "#e8b81c"), eye = dim(toy("brOjo", "#34e0f5", { glow: true }), 1);
  return [
    box(1.5, 1.0, 1.1, ora, [0, 1.9, 0]), box(0.7, 0.14, 0.2, steel, [0, 2.5, 0]), cyl(0.5, 0.7, 0.3, steel, [0, 1.25, 0], undefined, 8), // caja, asa y cuello
    tor(0.62, 0.1, steel, [0, 1.9, 0.56], undefined, 10), sph(0.5, eye, [0, 1.9, 0.52], [1, 1, 0.5], 4), // ojo cian
    box(1.1, 0.5, 0.1, yel, [-1.4, 1.9, 0]), cyl(0.0, 0.9, 0.7, yel, [-2.2, 1.9, 0], [0, 0, Math.PI / 2], 3), box(1.0, 0.45, 0.1, blue, [1.35, 1.9, 0]), cyl(0.0, 0.8, 0.6, blue, [2.0, 1.9, 0], [0, 0, -Math.PI / 2], 3), // flechas
    cyl(0.1, 0.14, 1.0, steel, [-0.55, 2.9, -0.2], undefined, 5), sph(0.2, steel, [-0.55, 3.45, -0.2], undefined, 4),
    cyl(0.2, 0.2, 0.3, steel, [0.35, 2.55, -0.1], undefined, 6), cyl(1.9, 0.5, 0.5, ora, [0.55, 3.35, -0.1], [-0.9, 0.2, 0], 12), cyl(0.12, 0.12, 0.9, steel, [0.55, 3.55, 0.25], [-0.9, 0.2, 0], 5), sph(0.22, eye, [0.6, 3.95, 0.5], undefined, 4), // plato
    ...[0, 1, 2].map((i) => { const a = i * Math.PI * 2 / 3 + 0.6; return cyl(0.2, 0.3, 1.4, ora, [Math.sin(a) * 0.5, 0.55, Math.cos(a) * 0.5], [Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5], 5); })]; });
// Núcleo de sobrecarga (ref316): cápsula cian entre aros de chapa, carcasa naranja y gris, mangueras negras, patas y antena. Largo 5, alto 3,2. Pulsa en overloadPulse().
const coreGlow = () => dim(toy("nucCian", "#38e8f8", { glow: true }), 1);
const overloadCoreTpl = () => template("obj_nucleo", () => {
  const ora = toy("nucNaranja", "#e8731c", { rough: 0.6, metal: 0.3 }), steel = toy("nucAcero", "#5d5a58", { rough: 0.45, metal: 0.8 }), hose = toy("nucManguera", "#222427", { rough: 0.7 }), dark = toy("nucOscuro", "#2b2a2a", { rough: 0.6, metal: 0.5 });
  return [
    box(4.2, 0.4, 1.6, steel, [0.2, 1.0, 0]), cyl(1.9, 1.9, 2.4, coreGlow(), [0.6, 2.1, 0], [0, 0, Math.PI / 2], 12), // zócalo y cápsula
    ...[-0.3, 0.7, 1.5].map((x) => cyl(2.1, 2.1, 0.22, steel, [x, 2.1, 0], [0, 0, Math.PI / 2], 12)), ...[0.2, 1.1].map((x) => cyl(2.12, 2.12, 0.1, ora, [x, 2.1, 0], [0, 0, Math.PI / 2], 12)), // aros y flejes
    box(1.2, 2.2, 1.7, steel, [-1.9, 2.0, 0]), box(0.6, 1.5, 1.75, ora, [-1.6, 2.0, 0]), box(1.4, 0.5, 1.2, ora, [-1.9, 3.35, 0]), cyl(0.45, 0.5, 0.5, ora, [-0.9, 3.3, 0.2], undefined, 8), // cabeza de máquina
    ...[0, 1, 2].flatMap((i) => [tor(1.2 + i * 0.1, 0.24, hose, [-1.2 + i * 0.25, 1.9 + i * 0.3, 1.0 - i * 0.05], [Math.PI / 2, 0, 0.5 * i], 8), cyl(0.5, 0.5, 0.3, ora, [-1.9, 1.5 + i * 0.5, 0.95], [Math.PI / 2, 0, 0], 8)]), // mangueras en arco entre la cabeza y la cápsula
    cyl(0.1, 0.14, 1.4, dark, [-2.0, 4.2, 0.2], undefined, 5), sph(0.2, ora, [-2.0, 4.95, 0.2], undefined, 4),
    ...[-1, 1].flatMap((x) => [-1, 1].map((z) => box(0.9, 0.9, 0.7, ora, [x * 1.9 + 0.2, 0.45, z * 0.75], [0, 0, -0.2 * x]))), ...[-1, 1].map((z) => box(4.4, 0.25, 0.3, steel, [0.2, 1.4, z * 0.85]))]; });
// Recicladora (ref317): tolva verde con franjas naranjas, rodillos de dientes, volante con manija, cubeta lateral, tubos de cobre y antena con luz ámbar. Huella 4 x 3,2, alto 3,6.
const recyclerTpl = () => template("obj_recicladora", () => {
  const grn = toy("recVerde", "#6f7d3c", { rough: 0.7, metal: 0.35 }), ora = toy("recNaranja", "#e8731c"), steel = toy("recAcero", "#5d5a58", { rough: 0.45, metal: 0.8 }), cu = toy("recCobre", "#b0663a", { rough: 0.45, metal: 0.8 }), dark = toy("recHueco", "#25262a", { rough: 0.7 }), amb = dim(toy("recAmbar", "#ffb23a", { glow: true }), 1);
  return [
    box(3.4, 1.3, 2.5, grn, [0, 0.95, 0]), box(3.5, 0.7, 0.14, ora, [0, 0.7, 1.28], [0, 0, 0]), box(3.5, 0.7, 0.1, dark, [0.4, 0.7, 1.3]), ...[-1.4, -0.5, 0.4].map((x) => box(0.3, 0.7, 0.14, ora, [x, 0.7, 1.3], [0, 0, 0.6])), // cuerpo y franja de peligro
    cyl(3.6, 2.4, 1.6, grn, [-0.2, 2.3, 0], [0, Math.PI / 4, 0], 4), cyl(3.1, 2.0, 1.5, dark, [-0.2, 2.35, 0], [0, Math.PI / 4, 0], 4), box(1.0, 1.1, 0.1, ora, [-0.2, 2.2, 1.45], [-0.45, 0, 0]), // tolva
    cyl(0.9, 0.9, 2.4, steel, [-0.3, 1.7, 0.2], [0, 0, Math.PI / 2], 8), ...[-1, -0.4, 0.2, 0.8].map((x) => cyl(1.3, 1.3, 0.3, steel, [x - 0.3, 1.7, 0.2], [0, 0, Math.PI / 2], 6)), // rodillos con dientes
    tor(1.5, 0.15, steel, [-2.0, 1.8, 0.2], [0, Math.PI / 2, 0], 12), cyl(0.2, 0.2, 1.4, steel, [-2.0, 1.8, 0.2], [0, 0, Math.PI / 2], 5), cyl(0.3, 0.3, 0.9, ora, [-2.5, 1.3, 0.2], [0, 0, Math.PI / 2], 6), // volante y manija
    box(1.3, 0.9, 1.5, grn, [2.2, 0.9, 0.3]), box(1.1, 0.7, 1.3, dark, [2.2, 1.1, 0.3]), box(0.1, 0.7, 1.0, ora, [2.85, 0.9, 0.3]), // cubeta lateral
    cyl(0.25, 0.25, 2.0, cu, [1.5, 2.3, -0.6], undefined, 6), cyl(0.5, 0.5, 0.9, amb, [1.5, 2.4, -0.6], undefined, 8), cyl(0.08, 0.08, 1.6, steel, [1.7, 3.4, -1.0], undefined, 5), sph(0.3, amb, [1.7, 4.2, -1.0], undefined, 4),
    ...[-1, 1].flatMap((x) => [-1, 1].map((z) => box(0.9, 0.2, 0.9, steel, [x * 1.5, 0.1, z * 1.1])))]; });

/** Escenografía ENCORE: solo mira (sin colisión ni lógica). c0 = llegada del escenario; todo sale de un hash de (semilla, escenario), nunca del rng(). */
let arrive: B.Vector3 | null = null, directorSet: B.InstancedMesh[] = [], phaseSet: B.InstancedMesh[] = [], phaseSeen = "", decorSeed = 0, coreI: B.InstancedMesh | null = null;
const face = (m: B.InstancedMesh, to: B.Vector3) => { m.rotationQuaternion = alignYaw(m.position, Math.atan2(to.x - m.position.x, to.z - m.position.z)); return m; }; // ponytail: asume +z local = adelante y plano cercano; en la luna curva el yaw es aproximado
const decorAt = (a: number, d: number) => inYard(ringAt(arrive!, a, d, 0));
/** Cofre especial en p (ref313), sin llamarla todavía: la lógica del cofre viene en la tarea siguiente. Devuelve las instancias (quien la llame las libera con dispose). */
export function specialChestPlace(p: B.Vector3, to?: B.Vector3) { const m = put(specialChestTpl, p, "cofreEspecial"); return to ? face(m, to) : m; }
/** Recicladora en p (ref317), sin llamarla todavía. */
export function recyclerPlace(p: B.Vector3, to?: B.Vector3) { const m = put(recyclerTpl, p, "recicladora"); return to ? face(m, to) : m; }
function decorDrop() { for (const m of directorSet) m.dispose(); for (const m of phaseSet) m.dispose(); directorSet = []; phaseSet = []; phaseSeen = ""; coreI = null; }
/** TV y foco del Director junto a la llegada (se arma en shopPlan, cada escenario). */
function decorPlan(seed: number, stage: number, c0: B.Vector3) {
  decorDrop(); arrive = c0.clone(); decorSeed = seed + 0x51d + stage * 32452867;
  const a = mix(decorSeed) * Math.PI * 2, tv = decorAt(a, 15), sp = decorAt(a + 0.32, 15.5);
  directorSet = [face(put(tvTpl, tv, "tvDirector"), c0), face(put(spotDirTpl, sp, "focoDirector"), c0)];
}
/** Objetos por fase de la expedición (solo lectura de erun): terminal en pact, baliza junto al teleportador en route, núcleo en overload. */
function decorTick(time: number) {
  const ph = arrive ? GOAL_IO.phase() : "";
  if (ph !== phaseSeen) {
    for (const m of phaseSet) m.dispose(); phaseSet = []; coreI = null; phaseSeen = ph;
    if (ph === "pact") phaseSet = [face(put(terminalTpl, decorAt(mix(decorSeed + 1) * Math.PI * 2, 11), "terminalPactos"), arrive!)];
    else if (ph === "route") { const at = rocket?.p ?? decorAt(mix(decorSeed + 2) * Math.PI * 2, 20); phaseSet = [face(put(routeBeaconTpl, ringAt(at, mix(decorSeed + 3) * Math.PI * 2, 6, 0), "balizaRuta"), at)]; }
    else if (ph === "overload") { coreI = face(put(overloadCoreTpl, decorAt(mix(decorSeed + 4) * Math.PI * 2, 13), "nucleoSobrecarga"), arrive!); phaseSet = [coreI]; }
  }
  if (coreI) coreI.scaling.setAll(1 + Math.sin(time * 6) * 0.02); // ponytail: latido por escala (la cápsula comparte material con otros usos: sin emisivo animado)
}

type Shop = { kind: "cofre" | "maquina" | "especial"; p: B.Vector3; prog: number; ms: B.InstancedMesh[] };
const SHOP_RADIO = 4.5, SHOP_S = 1.6, SHOP_VIDA = 0.25; // zona (m), segundos que hay que permanecer, fracción de vida actual que cobra la máquina
let shops: Shop[] = [], shopStage = 0, opened = 0, warnAt = 0;
const mix = (n: number) => { let t = (n + 0x6d2b79f5) | 0; t = Math.imul(t ^ (t >>> 15), 1 | t); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; // el mismo hash que encore.ts (allá no se exporta)
/** Precio en tornillos: sube con cada cofre abierto de la run (+60 % c/u) y con el escenario (+25 % c/u). */
export const chestPrice = (open: number, stage: number) => Math.round(A.cofre_precio_base * (1 + 0.6 * open) * (1 + 0.25 * stage));
/** Cofre especial: k × el precio de un cofre común en ese momento. */
export const specialPrice = (open: number, stage: number) => Math.round(A.cofre_especial_precio_k * chestPrice(open, stage));
/** Nueva expedición: cuenta de cofres abiertos en cero. */
export const shopReset = () => { opened = 0; };
/** Cofres de pago que quedan en el escenario (secreto "aplausos": 0 tras abrir el último). */
export const chestsLeft = () => shops.filter((s) => s.kind === "cofre").length;
/** Cofres de pago abiertos en la run (para el reporte de ENCORE). */
export const chestsOpened = () => opened;
/** Solo dev (__enc.shop): mueve el primer cofre o máquina que quede al punto c (el auto lo activa quedándose ahí). */
export const shopDev = (k: "cofre" | "maquina" | "especial", c: B.Vector3) => { const s = shops.find((x) => x.kind === k); if (s) s.p.copyFrom(c); return !!s; };
/** Solo dev (__enc.goto): posición del i-ésimo cofre o de la máquina que queda en el escenario. */
export const shopAt = (k: "cofre" | "maquina" | "especial", i = 0) => shops.filter((x) => x.kind === k)[i]?.p;
/** Coloca 3 cofres y 1 máquina alrededor de c0 (llegada del escenario); orden, ángulo y distancia salen de (seed, stage). */
export function shopPlan(seed: number, stage: number, c0: B.Vector3) {
  shopDrop(); shopStage = stage; decorPlan(seed, stage, c0);
  const base = seed + 0x7c3 + stage * 15485863, rot = mix(base) * 4, a0 = mix(base + 1) * Math.PI * 2, mach = Math.floor(mix(base + 2) * 4);
  for (let i = 0; i < 4; i++) {
    const kind = i === mach ? "maquina" : "cofre", p = inYard(ringAt(c0, a0 + ((i + rot) % 4) * Math.PI / 2 + (mix(base + 10 + i) - 0.5) * 0.5, 40 + mix(base + 20 + i) * 70, 0));
    const r = put(ringTpl, p, "aro"); r.position.copyFrom(onFloor(p, 0.15)); r.scaling.setAll(SHOP_RADIO / 2);
    shops.push({ kind, p, prog: 0, ms: [put(kind === "cofre" ? chestTpl : machineTpl, p, kind), r] });
  }
  if (stage >= 1) { // cofre especial: desde el 2.º escenario de la vuelta, uno por escenario, en un ángulo propio
    const p = inYard(ringAt(c0, a0 + mix(base + 30) * Math.PI * 2, 40 + mix(base + 31) * 70, 0)), r = put(ringTpl, p, "aro"); r.position.copyFrom(onFloor(p, 0.15)); r.scaling.setAll(SHOP_RADIO / 2);
    shops.push({ kind: "especial", p, prog: 0, ms: [specialChestPlace(p), r] });
  }
}
let spots: B.InstancedMesh[] = [];
/** Focos del FINAL ACT alrededor de c0 (posiciones de encore.arenaPlan); goalsClear los quita. */
export function spotsPlan(c0: B.Vector3, ps: { a: number; d: number }[]) { for (const m of spots) m.dispose(); spots = ps.map((s) => put(spotTpl, ringAt(c0, s.a, s.d, 0), "foco")); }
function shopDrop() { for (const s of shops) for (const m of s.ms) m.dispose(); shops = []; }
const shopNear = (car: B.Vector3) => shops.find((s) => hd(car, s.p) < SHOP_RADIO);
function shopTick(dt: number, time: number, cars: B.Vector3[], quiet: boolean) {
  const who = Math.max(0, cars.findIndex(shopNear)), car = cars[who]; // R7b: activa el primero que esté en una (ese paga y elige)
  for (const s of shops) if (s !== shopNear(car)) s.prog = 0;
  const s = shopNear(car); if (!s) return;
  const price = s.kind === "especial" ? specialPrice(opened, shopStage) : chestPrice(opened, shopStage), short = s.kind !== "maquina" ? price - GOAL_IO.scrap() : 0, weak = s.kind === "maquina" && GOAL_IO.hpFrac(who) * (1 - SHOP_VIDA) < 0.05;
  if (short > 0 || weak) { // sin fondos: aviso cada 4 s, no avanza
    if (!quiet && time > warnAt) { warnAt = time + 4; banner(weak ? "VIDA INSUFICIENTE PARA LA MÁQUINA" : `FALTAN ${short} TORNILLOS`, 1.6, { tag: "RADIO", ico: "cofre", tone: "warn" }); }
    s.prog = 0; return;
  }
  s.prog += dt;
  if (s.prog < SHOP_S) return;
  if (s.kind !== "maquina") { GOAL_IO.pay(price, 0, who); if (s.kind === "cofre") opened++; } else GOAL_IO.pay(0, SHOP_VIDA, who);
  if (!quiet) FX.shock(s.p);
  for (const m of s.ms) m.dispose();
  shops.splice(shops.indexOf(s), 1);
  GOAL_IO.offer(s.kind, who);
}

type Goal = { kind: "celdas" | "antena" | "cohete"; p: B.Vector3; t: number; prog: number; drop: number; cells: { p: B.Vector3; m: B.InstancedMesh }[]; ms: B.InstancedMesh[]; spin?: B.InstancedMesh };
let goal: Goal | null = null, rocket: Goal | null = null, next = A.luna_obj_primero_s, alt = 0;
const stats = { hechos: 0, aparecidos: 0 };

/** Contenido 3 (ENCORE en zona plana): GOAL_IO.half > 0 recorta el punto al patio, 12 m antes del borde, y lo saca de los muebles (obstacles de world.ts, +4 m de holgura). */
// ponytail: empuja radialmente hasta 12 pasadas; si el patio está tan lleno que no hay salida, queda donde terminó (no pasa en los layouts actuales).
const inYard = (p: B.Vector3) => {
  const h = GOAL_IO.half - 12; if (MOON.on || h <= 0) return p;
  const fit = () => { p.x = Math.max(-h, Math.min(h, p.x)); p.z = Math.max(-h, Math.min(h, p.z)); };
  fit();
  for (let i = 0; i < 12; i++) {
    const o = obstacles().find((b) => Math.hypot(p.x - b.x, p.z - b.z) < b.r + 4); if (!o) break;
    const d = Math.hypot(p.x - o.x, p.z - o.z) || 1, k = (o.r + 4.5) / d; p.x = o.x + (p.x - o.x) * k; p.z = o.z + (p.z - o.z) * k; fit();
  }
  return p;
};
function put(tpl: () => B.Mesh, p: B.Vector3, name: string) { const m = tpl().createInstance(name); onFloor(p, 0, m.position); m.rotationQuaternion = alignYaw(m.position, 0); return m; }
function make(kind: Goal["kind"], car: B.Vector3, dist: number, ang = rng() * Math.PI * 2): Goal {
  const p = inYard(ringAt(car, ang, dist, 0)), g: Goal = { kind, p, t: 0, prog: 0, drop: 0, cells: [], ms: [put(beaconTpl, p, "baliza")] };
  if (kind === "celdas") {
    const n = A.luna_obj_celdas_min + (rng() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) { const c = ringAt(p, (i / n) * Math.PI * 2 + rng(), A.luna_obj_celdas_radio * (0.4 + rng() * 0.6), 0); g.cells.push({ p: c, m: put(cellTpl, c, "celda") }); }
  } else {
    if (kind === "cohete" && GOAL_IO.tele) { g.ms.push(put(teleBaseTpl, p, "tele")); g.spin = put(teleFrameTpl, p, "teleMarco"); g.ms.push(g.spin); }
    else g.ms.push(put(kind === "antena" ? antennaTpl : rocketTpl, p, kind));
    if (kind === "cohete" && GOAL_IO.tele) { const r = put(rocketTpl, p, "teleCohete"); r.scaling.setAll(0.55); g.ms.push(r); } // ENCORE: el cohete de ref318 al centro del marco (escala 0,55 para que el aro gire por fuera)
    const r = put(ringTpl, p, "aro"); r.position.copyFrom(onFloor(p, 0.15)); r.scaling.setAll((kind === "antena" ? A.luna_obj_antena_radio : A.luna_cohete_radio) / 2); g.ms.push(r);
  }
  return g;
}
function drop(g: Goal) { for (const m of g.ms) m.dispose(); for (const c of g.cells) c.m.dispose(); }

/** Al salir el jefe final de la luna: aterriza el cohete lejos del auto. */
export function rocketLand(car: B.Vector3, quiet: boolean) {
  if ((!MOON.on && !GOAL_IO.tele) || rocket) return; // ENCORE: el teleportador también aterriza en los escenarios terrestres
  rocket = make("cohete", car, A.luna_cohete_dist);
  if (!quiet) { banner("COHETE DE ESCAPE EN LA SUPERFICIE", 3, { tag: "RADIO", ico: "jefe", tone: "now" }); FX.shock(rocket.p); }
}
/** Dev: objetivo ya, a dist m del auto. */
export function goalForce(kind: "celdas" | "antena", car: B.Vector3, dist = 20, ang?: number) { if (goal) drop(goal); goal = make(kind, car, dist, ang); stats.aparecidos++; }
export function rocketForce(car: B.Vector3, dist = 20, ang?: number) { if (rocket) drop(rocket); rocket = make("cohete", car, dist, ang); }

/** Radar: objetivo activo, celdas que faltan y cohete. */
export const goalBlips = () => [...(goal ? (goal.cells.length ? goal.cells.map((c) => c.p) : [goal.p]) : []), ...(rocket ? [rocket.p] : []), ...shops.map((s) => s.p)];
/** Barra (la del jefe): progreso del objetivo o del cohete. Cohete primero (solo con el auto adentro). */
export function goalBar(car: B.Vector3) {
  if (rocket && rocket.prog > 0 && hd(car, rocket.p) < A.luna_cohete_radio) return { name: GOAL_IO.tele ? "TELEPORTADOR · ACTIVANDO" : "ABORDAJE DEL COHETE", pct: rocket.prog / A.luna_cohete_s };
  if (goal?.kind === "antena" && goal.prog > 0) return { name: "ANTENA · ENLACE", pct: goal.prog / A.luna_obj_antena_s };
  const s = shops.find((x) => x.prog > 0) ?? shopNear(car);
  if (s) return { name: s.kind === "cofre" ? `COFRE · ${chestPrice(opened, shopStage)} TORNILLOS` : s.kind === "especial" ? `COFRE ESPECIAL · ${specialPrice(opened, shopStage)} TORNILLOS` : `MÁQUINA DE OPCIONES · -${SHOP_VIDA * 100} % DE VIDA`, pct: s.prog / SHOP_S };
  return null;
}
export const goalStats = () => `objetivos ${stats.hechos}/${stats.aparecidos}${rocket ? " · cohete" : ""}`;

/** Cada cuadro (solo luna). */
/** cars = autos vivos (0 = el que guía: los objetivos aparecen alrededor suyo); cualquiera junta celdas, mantiene la antena, compra y aborda (R7b). */
export function goalsTick(dt: number, time: number, cars: B.Vector3[], quiet: boolean) {
  if (!MOON.on && !GOAL_IO.tele) return;
  const car = cars[0], near = (p: B.Vector3, r: number) => cars.some((c) => hd(c, p) < r);
  if (GOAL_IO.tele && shops.length) shopTick(dt, time, cars, quiet);
  if (GOAL_IO.tele) decorTick(time);
  for (const m of goal?.cells ?? []) m.m.rotationQuaternion = alignYaw(m.m.position, time * 1.5);
  if (MOON.on && !goal && time >= next) { // objetivos de superficie: solo en la luna
    const kind = (alt++ + (rng() < 0.5 ? 0 : 1)) % 2 ? "antena" : "celdas"; // alternados, el primero al azar
    goal = make(kind, car, A.luna_obj_dist); stats.aparecidos++;
    if (!quiet) banner(kind === "celdas" ? "CELDAS DE ENERGÍA EN LA SUPERFICIE · RECOGER ANTES DEL CORTE" : "ANTENA EN LA SUPERFICIE · MANTENER LA ZONA", 3.2, { tag: "RADIO", ico: "cofre", tone: "warn" });
  }
  if (goal) {
    const g = goal; g.t += dt;
    let done = false, lost = false;
    if (g.kind === "celdas") {
      for (let i = g.cells.length - 1; i >= 0; i--) if (near(g.cells[i].p, A.luna_obj_celda_toma)) {
        if (!quiet) FX.shock(g.cells[i].p);
        g.cells[i].m.dispose(); g.cells.splice(i, 1);
        if (!quiet && g.cells.length) banner(`CELDA RECOGIDA · FALTAN ${g.cells.length}`, 1.4, { tag: "RADIO", ico: "cofre" });
      }
      done = !g.cells.length; lost = g.t > A.luna_obj_celdas_s;
    } else {
      if (near(g.p, A.luna_obj_antena_radio)) {
        g.prog += dt;
        if ((g.drop -= dt) <= 0 && LUNA.spawn) { // llegan bichos desde el borde de la zona
          g.drop = A.luna_obj_antena_bichos_cada_s;
          const k = nodrizaDrops(time);
          for (let i = 0; i < A.luna_obj_antena_bichos; i++) LUNA.spawn(k[Math.floor(rng() * k.length)], ringAt(g.p, rng() * Math.PI * 2, A.luna_obj_antena_radio + 8, 0.5));
        }
      }
      done = g.prog >= A.luna_obj_antena_s; lost = g.t > A.luna_obj_antena_limite_s;
    }
    if (done || lost) {
      if (done) { stats.hechos++; SHIP_IO.reward(onFloor(car, 0.5), A.luna_obj_premio_xp, false); }
      if (!quiet) banner(done ? "OBJETIVO CUMPLIDO · CARGA LIBERADA" : "OBJETIVO PERDIDO · SEÑAL CORTADA", 2.4, { tag: "RADIO", ico: "cofre", tone: done ? "now" : undefined });
      drop(g); goal = null; next = time + A.luna_obj_cada_s;
    }
  }
  if (rocket?.spin) { // giro del marco y pulso de los focos (el material es solo del teleportador)
    rocket.spin.rotationQuaternion = alignYaw(rocket.spin.position, time * (rocket.prog > 0 ? 3 : 0.8));
    (teleMats().bulb as B.PBRMaterial).emissiveIntensity = 2.2 + Math.sin(time * 5) * 1.2 + (rocket.prog > 0 ? 1.5 : 0);
  }
  teleTag(!quiet && GOAL_IO.tele && !!rocket && rocket.prog === 0 && GOAL_IO.phase() === "stage" && primeraVez());
  if (rocket) {
    if (near(rocket.p, A.luna_cohete_radio)) rocket.prog += dt; else rocket.prog = 0;
    if (rocket.prog >= A.luna_cohete_s) { const p = rocket.p.clone(); rocket.prog = 0; GOAL_IO.win(p); }
  }
}

/** Primera expedición: pegatina «SUBIR» anclada sobre el teleportador mientras está listo (se va al empezar a abordar). */
let tag: HTMLElement | null = null;
const TAG_UP = new B.Vector3(0, 5, 0);
function teleTag(on: boolean) {
  if (!on || !rocket) { tag?.classList.add("hidden"); return; }
  const sc = rocket.ms[0].getScene(), cam = sc.activeCameras?.[0] ?? sc.activeCamera, e = sc.getEngine();
  if (!cam) return;
  const w = e.getRenderWidth(), h = e.getRenderHeight();
  const v = B.Vector3.Project(rocket.p.add(TAG_UP), B.Matrix.IdentityReadOnly, sc.getTransformMatrix(), cam.viewport.toGlobal(w, h));
  if (!tag) { tag = Object.assign(document.createElement("div"), { id: "teleTag", textContent: "SUBIR" }); (document.getElementById("hud") ?? document.body).appendChild(tag); }
  const x = v.x * innerWidth / w, y = v.y * innerHeight / h, off = v.z < 0 || v.z > 1 || x < 0 || x > innerWidth || y < 0 || y > innerHeight; // fuera de cuadro la marca la da el radar
  tag.classList.toggle("hidden", off);
  if (!off) tag.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
}

/** Partida nueva / fin. */
export function goalsClear() {
  teleTag(false);
  if (goal) drop(goal); if (rocket) drop(rocket); shopDrop(); decorDrop(); arrive = null; for (const m of spots) m.dispose(); spots = [];
  goal = rocket = null; next = A.luna_obj_primero_s; alt = 0;
  stats.hechos = stats.aparecidos = 0;
}
