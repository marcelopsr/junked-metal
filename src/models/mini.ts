import * as B from "@babylonjs/core";
import { M, pbr } from "../render";
import { canvasTex, type V3, box, cyl, sph, tor, tube, rbox } from "./common";

// Dirección de arte diorama de juguete (Junked Metal Encore): autos RC de juguete modulares. Chasis común (placa negra) + piezas encastrables:
// carrocería de plástico pintado con bordes redondeados, alerón con soportes, ruedas de goma con taco y llanta de color,
// amortiguadores con resorte de color, antena con punta roja y barra de luces delantera emisiva.
export const PAL = { rojo: "#E53935", amarillo: "#FBC02D", azul: "#42A5F5", verde: "#66BB6A", naranja: "#FB8C00", morado: "#8E24AA", blanco: "#F5F5F5", negro: "#17181c" };
const CREMA = "#F2E6C8";
export type Arch = "buggy" | "truck" | "rally" | "monster" | "drift" | "toy";
/** Arquetipo de cada auto según su forma (no hay autos nuevos: se re-visten los de siempre). */
export const ARCH: Record<string, Arch> = {
  buggy: "buggy", jeep: "buggy",
  tanque: "truck", helado: "truck", combi: "truck", topadora: "truck",
  carrera: "rally", clasico: "rally",
  monster: "monster", axel: "monster",
  formula: "drift", murcielago: "drift", moto: "drift",
  hover: "toy", triciclo: "toy", misterio: "toy", monopatin: "toy",
};
/** Pintura de fábrica y color de acento (llanta, resortes, alerón) de cada auto. */
export const MINI_COLORS: Record<string, [string, string]> = {
  buggy: [PAL.rojo, PAL.amarillo], monster: [PAL.azul, PAL.naranja], formula: [PAL.amarillo, PAL.rojo], tanque: ["#F2B705", "#F2B705"],
  carrera: [PAL.naranja, PAL.azul], axel: [PAL.morado, PAL.amarillo], helado: [CREMA, "#F06292"], combi: [PAL.verde, PAL.blanco],
  hover: ["#D9A21B", "#3C322B"], topadora: [PAL.amarillo, PAL.naranja], triciclo: ["#1F8A8A", PAL.naranja], murcielago: ["#5B3A9A", "#C8793A"],
  misterio: ["#8BC34A", "#26C6DA"], clasico: [PAL.rojo, CREMA], jeep: [PAL.verde, PAL.naranja], moto: [PAL.azul, CREMA], monopatin: ["#E8654F", "#2AA6A6"],
};
const toy = (c: string) => pbr("mini" + c, { color: c, rough: 0.35, coat: 0.4 }); // plástico pintado: rugosidad 0,35, sin metal
const SPRING = () => pbr("minispring", { color: "#E53935", rough: 0.3, coat: 0.6 }); // resorte rojo: es suspensión, no el auto del jugador
type W = { pos: V3; d: number; w: number };

export function miniHull(kind: string, paint: B.Material, accent: string, lamp: string, ws: W[], size: [number, number, number]) {
  const pm = paint as B.PBRMaterial; // pintura saltada: máscara compartida (bordes y salpicaduras que oscurecen hacia gris); no pisa acabados con textura
  if (pm.albedoTexture === null) pm.albedoTexture = canvasTex("chip", 256, (g, n) => {
    g.fillStyle = "#fff"; g.fillRect(0, 0, n, n);
    let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    g.fillStyle = "#6b6b6b";
    for (let i = 0; i < 70; i++) { const e = i < 40, x = e ? (r() < 0.5 ? r() * 0.06 : 1 - r() * 0.06) * n : r() * n, y = e ? r() * n : r() * n, q = 2 + r() * 4; g.fillRect(x, y, q, q * (0.6 + r())); }
    for (let i = 0; i < 25; i++) g.fillRect(r() * n, (r() < 0.5 ? r() * 0.05 : 1 - r() * 0.05) * n, 2 + r() * 4, 2 + r() * 3);
  });
  const arch = ARCH[kind] ?? "toy", acc = toy(accent), blk = toy(PAL.negro), wht = toy(PAL.blanco), glass = M.glass(), glow = M.glow(lamp);
  const [sw, H, L] = size;
  const xm = Math.max(...ws.map((w) => Math.abs(w.pos[0]))), wm = Math.max(...ws.map((w) => w.w)), zs = ws.map((w) => w.pos[2]);
  const Lc = Math.max(Math.max(...zs) - Math.min(...zs) + Math.max(...ws.map((w) => w.d)) * 0.5, L * 0.8);
  const Wd = xm > 0.2 ? Math.min(2 * (xm - wm / 2) - 0.04, sw) : sw * 0.45; // ancho de carrocería: entre las ruedas
  const lift = kind === "monster" ? 0.42 : kind === "axel" ? 0.1 : 0;
  const parts: B.Mesh[] = [], stock: B.Mesh[] = [];
  const add = (...m: B.Mesh[]) => parts.push(...m);
  const bar = (y: number, z: number, w: number) => add(rbox(w, 0.08, 0.1, 0.03, blk, [0, y, z]), rbox(w * 0.88, 0.045, 0.03, 0.015, glow, [0, y, z + 0.055])); // barra de luces delantera (emisiva)
  const wing = (dy: number, dz: number, ww: number, ph = 0.26) => stock.push( // alerón: plato, dos soportes y placas laterales
    rbox(ww, 0.06, 0.4, 0.02, acc, [0, dy + 0.5, dz], [0.12, 0, 0]),
    ...[-1, 1].map((s) => cyl(0.07, 0.07, 0.56, blk, [s * ww * 0.3, dy + 0.24, dz + 0.02], undefined, 6)),
    ...[-1, 1].map((s) => rbox(ph > 0.26 ? 0.07 : 0.05, ph, 0.46, 0.015, wht, [s * ww / 2, dy + 0.5 + (ph - 0.26) / 2, dz], [0.12, 0, 0])));
  const track = (x: number, w: number, y: number, len: number) => add(rbox(w, 0.46, len, 0.14, blk, [x, y, 0]), rbox(w * 1.02, 0.05, len * 0.82, 0.02, acc, [x, y + 0.26, 0]));
  add(rbox(Wd * 0.9, 0.1, Lc * 0.94, 0.035, blk, [0, 0.02 + lift * 0.5, 0])); // chasis común

  if (arch === "buggy") {
    const cab = Wd * 0.56; // cabina más angosta que el chasis: se lee el escalón
    add(rbox(Wd * 0.94, H * 0.36, Lc * 0.5, 0.1, paint, [0, lift + H * 0.27, -Lc * 0.06]), // tina
      rbox(Wd * 0.8, H * 0.2, Lc * 0.36, 0.08, paint, [0, lift + H * 0.3, Lc * 0.28], [0.2, 0, 0]), rbox(Wd * 0.6, H * 0.12, Lc * 0.2, 0.05, paint, [0, lift + H * 0.3, Lc * 0.44], [0.3, 0, 0]), // capó en cuña
      rbox(Wd * 0.78, H * 0.3, Lc * 0.2, 0.08, paint, [0, lift + H * 0.3, -Lc * 0.4]), rbox(Wd * 0.84, 0.09, 0.12, 0.04, blk, [0, lift + 0.12, Lc * 0.5]),
      rbox(cab, H * 0.3, Lc * 0.26, 0.09, paint, [0, lift + H * 0.58, -Lc * 0.06]), rbox(cab * 0.9, H * 0.26, 0.05, 0.02, glass, [0, lift + H * 0.58, Lc * 0.09], [-0.5, 0, 0]), // cabina + parabrisas inclinado
      ...[-1, 1].map((s) => rbox(0.06, H * 0.2, Lc * 0.3, 0.03, blk, [s * Wd * 0.47, lift + H * 0.14, -Lc * 0.06])), // entradas de aire laterales
      rbox(Wd * 0.62, 0.1, Lc * 0.14, 0.04, blk, [0, lift + 0.1, -Lc * 0.46], [-0.35, 0, 0])); // difusor negro
    add(...[-1, 1].map((s) => rbox(Wd * 0.22, 0.1, 0.07, 0.03, M.glow("#ff2a1a"), [s * Wd * 0.3, lift + H * 0.36, -Lc * 0.5 - 0.02]))); // luces traseras rojas emisivas
    const top = lift + H * 0.5, hoop = (z: number, h: number) => tube([[-Wd * 0.45, top, z], [-Wd * 0.4, h, z - 0.1], [Wd * 0.4, h, z - 0.1], [Wd * 0.45, top, z]], 0.035, acc);
    add(hoop(-Lc * 0.14, top + 0.5), hoop(Lc * 0.1, top + 0.4));
    bar(top + 0.46, Lc * 0.1 - 0.1, Wd * 0.8);
    if (kind === "jeep") add(rbox(Wd * 0.7, 0.06, 0.04, 0.02, wht, [0, lift + H * 0.3, Lc * 0.49]), box(Wd * 0.9, 0.3, 0.03, glass, [0, top + 0.16, Lc * 0.1 + 0.04], [-0.3, 0, 0]));
    const top2 = lift + H * 0.4 + 0.012; // franjas negras diagonales sobre el capó
    add(...[-1, 1].map((s) => rbox(0.1, 0.014, Lc * 0.3, 0.005, blk, [s * Wd * 0.18, top2, Lc * 0.3], [0.2, s * 0.5, 0])));
    if (kind === "buggy") wing(0.62, -Lc * 0.43, Wd * 1.05, 0.42);
  } else if (arch === "rally") { // el clásico se arma entero en «Rasgos»
    if (kind !== "clasico") add(rbox(Wd, H * 0.44, Lc * 0.92, 0.12, paint, [0, H * 0.3, 0]), rbox(Wd * 0.8, H * 0.38, Lc * 0.4, 0.12, glass, [0, H * 0.66, -Lc * 0.06]),
      rbox(Wd * 0.78, 0.07, Lc * 0.34, 0.035, paint, [0, H * 0.87, -Lc * 0.06]), rbox(Wd * 0.2, 0.025, Lc * 0.8, 0.012, wht, [0, H * 0.525, Lc * 0.02]), // franja blanca
      rbox(Wd * 1.02, 0.09, 0.12, 0.04, blk, [0, 0.1, Lc * 0.47]), rbox(Wd * 1.02, 0.09, 0.12, 0.04, blk, [0, 0.1, -Lc * 0.47]));
    if (kind !== "clasico") bar(H * 0.55, Lc * 0.38, Wd * 0.7);
    if (kind === "carrera") wing(0.36, -Lc * 0.44, Wd * 1.0);
    else if (kind !== "clasico") add(rbox(Wd * 0.4, 0.05, 0.2, 0.02, acc, [0, H * 0.92, -Lc * 0.06]));
  } else if (arch === "monster") {
    add(...[-1, 1].map((s) => rbox(0.1, 0.12, Lc * 0.85, 0.04, blk, [s * Wd * 0.3, lift + 0.1, 0])));
    if (kind === "monster") {
      add(rbox(Wd * 0.98, H * 0.46, Lc * 0.46, 0.12, paint, [0, lift + H * 0.5, -Lc * 0.02]), rbox(Wd * 0.9, H * 0.6, Lc * 0.36, 0.1, paint, [0, lift + H * 0.98, -Lc * 0.04]), rbox(Wd * 0.8, H * 0.3, 0.05, 0.02, glass, [0, lift + H * 1.04, Lc * 0.15], [-0.25, 0, 0]), rbox(Wd * 0.8, H * 0.3, 0.05, 0.02, glass, [0, lift + H * 1.04, -Lc * 0.23], [0.25, 0, 0]),
        rbox(Wd * 0.9, H * 0.22, Lc * 0.3, 0.09, paint, [0, lift + H * 0.38, Lc * 0.3]), rbox(Wd * 0.9, H * 0.2, Lc * 0.24, 0.09, paint, [0, lift + H * 0.38, -Lc * 0.34]),
        rbox(Wd * 0.85, 0.1, 0.12, 0.04, blk, [0, lift + 0.16, Lc * 0.5]));
      wing(0.8, -Lc * 0.44, Wd * 1.0);
    } else { // Axel: dos ruedas gigantes y una jaula-cabina colgando del eje
      add(cyl(0.16, 0.16, 1.9, blk, [0, 0, 0], [0, 0, Math.PI / 2], 8), rbox(Wd * 0.8, H * 0.4, Lc * 0.6, 0.12, paint, [0, lift + H * 0.3, 0]),
        tube([[-Wd * 0.38, lift + H * 0.45, -0.5], [-Wd * 0.38, lift + H * 0.9, -0.2], [Wd * 0.38, lift + H * 0.9, -0.2], [Wd * 0.38, lift + H * 0.45, -0.5]], 0.04, acc),
        tube([[-Wd * 0.38, lift + H * 0.45, 0.5], [-Wd * 0.38, lift + H * 0.85, 0.2], [Wd * 0.38, lift + H * 0.85, 0.2], [Wd * 0.38, lift + H * 0.45, 0.5]], 0.04, acc));
      bar(lift + H * 0.5, Lc * 0.28, Wd * 0.6);
    }
  } else if (arch === "drift") {
    if (kind === "moto") { /* se arma entera en «Rasgos» */
    } else {
      const low = kind === "formula";
      add(rbox(Wd, H * 0.46, Lc * 0.62, 0.1, paint, [0, H * 0.3, -Lc * 0.04]), rbox(Wd * 0.4, H * 0.3, Lc * 0.3, 0.09, paint, [0, H * 0.24, Lc * 0.34]),
        rbox(Wd * (low ? 0.5 : 0.62), H * 0.38, Lc * 0.26, 0.1, glass, [0, H * 0.62, -Lc * 0.1]), rbox(Wd * 1.0, 0.05, 0.16, 0.02, acc, [0, 0.07, Lc * 0.5]), // alerón/splitter delantero
        ...[-1, 1].map((s) => rbox(0.14, H * 0.3, Lc * 0.46, 0.06, acc, [s * Wd * 0.5, H * 0.2, -Lc * 0.04]))); // pontones laterales
      bar(H * 0.44, Lc * 0.46, Wd * 0.5);
      if (low) wing(0.32, -Lc * 0.44, Wd * 1.25); // el murciélago lleva aletas (más abajo) en vez de alerón
    }
  } else if (arch === "truck") {
    if (kind === "tanque" || kind === "topadora") {
      for (const s of [-1, 1]) track(s * Math.max(xm, 0.72), 0.34, 0.05, Lc * 0.92);
      if (kind === "tanque") add(rbox(Wd, H * 0.4, Lc * 0.78, 0.1, paint, [0, H * 0.34, 0]), rbox(Wd * 0.78, H * 0.3, Lc * 0.34, 0.14, paint, [0, H * 0.68, -Lc * 0.06]),
        cyl(0.2, 0.2, Lc * 0.46, blk, [0, H * 0.72, Lc * 0.28], [Math.PI / 2, 0, 0], 8), cyl(0.28, 0.28, 0.1, acc, [0, H * 0.72, Lc * 0.5], [Math.PI / 2, 0, 0], 8));
      // la topadora se arma en «Rasgos»
      if (kind === "tanque") bar(H * 0.56, Lc * 0.38, Wd * 0.6);
    } else {
      const van = kind === "combi", ice = kind === "helado";
      add(rbox(Wd, H * 0.52, Lc * 0.92, 0.12, paint, [0, H * 0.3, 0]), rbox(Wd * 1.0, H * 0.3, Lc * 0.5, 0.1, glass, [0, H * 0.7, Lc * 0.1]),
        rbox(Wd * 1.02, 0.07, van ? Lc * 0.88 : Lc * 0.52, 0.03, van ? wht : paint, [0, H * 0.87, van ? 0 : Lc * 0.1]), rbox(Wd * 1.04, 0.09, 0.12, 0.04, blk, [0, 0.1, Lc * 0.48]), rbox(Wd * 1.04, 0.09, 0.12, 0.04, blk, [0, 0.1, -Lc * 0.48]));
      if (ice) add(rbox(Wd * 1.0, H * 0.42, Lc * 0.42, 0.1, wht, [0, H * 0.7, -Lc * 0.28]), rbox(Wd * 1.1, 0.06, Lc * 0.4, 0.02, acc, [0, H * 0.94, -Lc * 0.28], [0, 0, 0]),
        cyl(0.8, 0.06, 0.9, toy("#D9A066"), [0, H * 1.3, -Lc * 0.28], undefined, 8), sph(0.8, acc, [0, H * 1.95, -Lc * 0.28], undefined, 6), sph(0.55, toy(CREMA), [0, H * 2.3, -Lc * 0.28], undefined, 6), sph(0.2, acc, [0, H * 2.6, -Lc * 0.28], undefined, 4)); // cucurucho gigante: cono, bola rosa y remolino crema
      else add(rbox(Wd * 1.02, H * 0.14, Lc * 0.9, 0.05, wht, [0, H * 0.4, 0]));
      bar(van ? H * 1.1 : H * 0.94, Lc * 0.28, Wd * 0.7);
    }
  } else { // toy
    if (kind === "hover") { // ref242: faldón inflable negro, casco angular facetado amarillo, cabina de vidrio, barra de luces, ventilador en jaula, alerón con soportes, turbinas laterales
      const hy = toy("#D9A21B"), y0 = H * 0.38, cz = -Lc * 0.04, ch = H * 1.0; // hy: amarillo de tubos y resortes
      add(rbox(sw * 0.98, 0.22, Lc * 1.0, 0.11, toy("#26221e"), [0, 0.06, 0]),
        rbox(Wd, H * 0.42, Lc * 0.8, 0.04, paint, [0, y0, 0]), // casco bajo, aristas vivas
        rbox(Wd * 0.8, H * 0.2, Lc * 0.34, 0.03, paint, [0, y0 + H * 0.1, Lc * 0.36], [0.28, 0, 0]), rbox(Wd * 0.5, 0.05, Lc * 0.3, 0.02, blk, [0, y0 + H * 0.24, Lc * 0.38], [0.28, 0, 0]), // capó en cuña con panel oscuro
        ...[-1, 1].flatMap((s) => [rbox(0.12, H * 0.3, Lc * 0.46, 0.03, paint, [s * Wd * 0.46, y0 + H * 0.3, cz - Lc * 0.04], [0, 0, s * 0.25]), box(0.04, H * 0.18, Lc * 0.2, blk, [s * (Wd / 2 + 0.01), y0 + H * 0.1, cz - Lc * 0.16])]), // hombros inclinados y rejillas
        rbox(Wd * 0.6, H * 0.34, Lc * 0.3, 0.03, glass, [0, ch * 0.7, cz + Lc * 0.04], [-0.12, 0, 0]), rbox(Wd * 0.64, 0.06, Lc * 0.3, 0.02, blk, [0, ch * 0.7 + H * 0.2, cz - Lc * 0.02], [-0.1, 0, 0]), // cabina facetada y techo
        ...[-1, 1].map((s) => box(0.05, H * 0.34, 0.05, hy, [s * Wd * 0.3, ch * 0.7, cz - Lc * 0.12], [0, 0, s * -0.1])), // parantes amarillos
        tube([[-Wd * 0.38, y0 + H * 0.2, cz + Lc * 0.2], [-Wd * 0.3, ch * 0.7 + H * 0.2, cz + Lc * 0.12], [Wd * 0.3, ch * 0.7 + H * 0.2, cz + Lc * 0.12], [Wd * 0.38, y0 + H * 0.2, cz + Lc * 0.2]], 0.035, hy), // tubo de jaula sobre el parabrisas
        ...[-1, 1].flatMap((s) => [tor(0.5, 0.07, acc, [s * (Wd * 0.5 + 0.12), 0.3, Lc * 0.22], undefined, 12), cyl(0.12, 0.12, 0.12, blk, [s * (Wd * 0.5 + 0.12), 0.3, Lc * 0.22], undefined, 6)]), // turbinas laterales
        tor(0.95, 0.06, blk, [0, 0.95, -Lc * 0.4], [Math.PI / 2, 0, 0], 12), tor(0.95, 0.04, acc, [0, 0.95, -Lc * 0.4 - 0.12], [Math.PI / 2, 0, 0], 12), cyl(0.12, 0.12, 0.2, blk, [0, 0.95, -Lc * 0.4], [Math.PI / 2, 0, 0], 8),
        box(0.9, 0.04, 0.12, acc, [0, 0.95, -Lc * 0.4], [0, 0, 0.5]), box(0.9, 0.04, 0.12, acc, [0, 0.95, -Lc * 0.4], [0, 0, -0.5]), box(0.9, 0.04, 0.12, acc, [0, 0.95, -Lc * 0.4], [0, 0, 1.5]),
        ...[-1, 1].map((s) => cyl(0.07, 0.07, 0.7, blk, [s * 0.45, 0.62, -Lc * 0.4], undefined, 6)),
        rbox(Wd * 1.25, 0.06, 0.42, 0.02, hy, [0, 1.52, -Lc * 0.54], [0.1, 0, 0]), rbox(Wd * 0.5, 0.065, 0.3, 0.02, blk, [0, 1.525, -Lc * 0.54], [0.1, 0, 0]), // alerón: plato amarillo con centro negro
        ...[-1, 1].flatMap((s) => [rbox(0.06, 0.26, 0.46, 0.015, hy, [s * Wd * 0.625, 1.56, -Lc * 0.54], [0.1, 0, 0]), cyl(0.045, 0.045, 0.62, blk, [s * Wd * 0.28, 1.2, -Lc * 0.5], [0, 0, s * 0.12], 6)])); // placas laterales y dos soportes
      bar(ch * 0.7 + H * 0.28, cz + Lc * 0.1, Wd * 0.55); // barra de luces del techo
    } else if (kind === "triciclo") {
      add(rbox(0.6, H * 0.34, Lc * 0.6, 0.12, paint, [0, H * 0.38, Lc * 0.14]), rbox(Wd * 1.1, H * 0.5, 0.8, 0.1, toy(CREMA), [0, H * 0.55, -0.6]), rbox(Wd * 1.14, 0.06, 0.86, 0.03, acc, [0, H * 0.82, -0.6]),
        tube([[-0.32, H * 0.55, 0.62], [-0.3, H * 0.92, 0.5], [0.3, H * 0.92, 0.5], [0.32, H * 0.55, 0.62]], 0.035, blk));
      bar(H * 0.62, Lc * 0.4, 0.5);
    } else if (kind === "misterio") {
      add(rbox(Wd, H * 0.58, Lc * 0.9, 0.2, paint, [0, H * 0.34, 0]), sph(Wd * 0.95, glass, [0, H * 0.74, Lc * 0.14], [1, 0.6, 1], 6), rbox(Wd * 1.02, 0.14, Lc * 0.9, 0.05, acc, [0, H * 0.3, 0]),
        rbox(Wd * 1.04, 0.09, 0.12, 0.04, blk, [0, 0.1, Lc * 0.48]));
      bar(H * 0.9, Lc * 0.3, Wd * 0.6);
    } else { // monopatín: tabla con kicks, dos ejes y un domo
      add(rbox(0.46, 0.08, Lc * 0.62, 0.04, paint, [0, 0.14, 0]), ...[-1, 1].map((s) => rbox(0.46, 0.08, 0.26, 0.04, acc, [0, 0.2, s * Lc * 0.36], [s * 0.35, 0, 0])),
        ...[-0.5, 0.5].map((z) => cyl(0.05, 0.05, 0.5, blk, [0, 0.04, z], [0, 0, Math.PI / 2], 6)), rbox(0.3, 0.2, 0.34, 0.1, acc, [0, 0.32, 0.1]));
      bar(0.28, Lc * 0.4, 0.34);
    }
  }

  // Rasgos de cada lámina de referencia (ref100-111), pensados para leerse a la distancia de juego
  const cr = toy(CREMA), chrome = toy("#C9CED3"), cop = toy("#C8793A"), front = Lc * 0.5, tx = Math.max(xm, 0.72);
  const rx = Math.PI / 2;
  if (kind === "jeep") {
    const y = lift + H * 0.3, top = lift + H * 0.5;
    add(...[-3, -2, -1, 0, 1, 2, 3].map((i) => box(0.05, H * 0.3, 0.05, blk, [i * Wd * 0.06, y, front + 0.06])), // parrilla de barras verticales
      ...[-1, 1].flatMap((s) => [tor(0.36, 0.07, chrome, [s * Wd * 0.34, y, front + 0.04], [rx, 0, 0]), // faros redondos con aro
        tube([[s * Wd * 0.4, top + 0.5, -Lc * 0.14 - 0.1], [s * Wd * 0.4, top + 0.4, Lc * 0.1 - 0.1]], 0.035, acc)]), // jaula antivuelco: largueros
      cyl(0.8, 0.8, 0.24, blk, [0, lift + H * 0.55, -front - 0.22], [rx, 0, 0], 12), cyl(0.42, 0.42, 0.26, acc, [0, lift + H * 0.55, -front - 0.22], [rx, 0, 0], 8)); // rueda de auxilio atrás
  } else if (kind === "clasico") { // cupé de los años 50: guardabarros bulbosos, habitáculo alto atrás, parrilla y paragolpes cromados, faros redondos sobre los guardabarros
    const gl = glow;
    add(rbox(Wd, H * 0.4, Lc * 0.7, 0.12, paint, [0, H * 0.33, -Lc * 0.07]), rbox(Wd * 1.05, H * 0.2, Lc * 0.56, 0.08, cr, [0, H * 0.2, -Lc * 0.04]), // carrocería y faldón crema
      rbox(Wd * 0.66, H * 0.36, Lc * 0.36, 0.14, paint, [0, H * 0.46, Lc * 0.3], [0.1, 0, 0]), // capó largo
      rbox(Wd * 0.8, H * 0.42, Lc * 0.42, 0.16, glass, [0, H * 0.74, -Lc * 0.12]), rbox(Wd * 0.84, H * 0.18, Lc * 0.46, 0.07, paint, [0, H * 0.96, -Lc * 0.12]), // habitáculo y techo abombado
      rbox(Wd * 0.8, H * 0.36, Lc * 0.26, 0.14, paint, [0, H * 0.46, -Lc * 0.4], [-0.15, 0, 0]), // baúl
      ...[-1, 1].flatMap((s) => [-1, 1].map((f) => box(0.06, H * 0.4, 0.06, paint, [s * Wd * 0.4, H * 0.72, -Lc * 0.12 + f * Lc * 0.2]))), // parantes
      rbox(Wd * 0.5, H * 0.62, 0.1, 0.05, chrome, [0, H * 0.4, front + 0.04]), ...[-2, -1, 0, 1, 2].map((i) => box(0.03, H * 0.5, 0.03, blk, [i * Wd * 0.08, H * 0.4, front + 0.1])), // parrilla alta
      rbox(Wd * 1.2, 0.1, 0.1, 0.04, chrome, [0, 0.1, front + 0.2]), rbox(Wd * 1.1, 0.1, 0.1, 0.04, chrome, [0, 0.1, -front - 0.14]), // paragolpes
      ...[-1, 1].flatMap((s) => [box(0.07, H * 0.34, 0.08, chrome, [s * Wd * 0.3, 0.14, front + 0.2]), box(0.16, 0.04, Lc * 0.4, blk, [s * (Wd / 2 + 0.05), 0.1, 0]), // topes y estribos
        tor(0.36, 0.06, chrome, [s * Wd * 0.62, H * 0.6, front + 0.2], [rx, 0, 0]), sph(0.26, gl, [s * Wd * 0.62, H * 0.6, front + 0.24], undefined, 6)]), box(0.04, 0.03, Lc * 0.3, chrome, [0, H * 0.64, Lc * 0.3])); // faros redondos con aro y filete cromado del capó
    for (const w of ws) { const f = w.pos[2] > 0; add(sph(1, paint, [w.pos[0], w.d * 0.5, w.pos[2] + (f ? 0.04 : -0.02)], [w.w * 1.45, w.d * 0.72, w.d * (f ? 1.5 : 1.55)], 10)); } // guardabarros bulbosos de color
  } else if (kind === "misterio") {
    const flower = (s: number, y: number, z: number, r: number) => {
      const x = s * (Wd / 2 + 0.03);
      add(cyl(r * 1.0, r * 1.0, 0.06, toy(PAL.amarillo), [x + s * 0.02, y, z], [0, 0, rx], 8));
      for (let k = 0; k < 5; k++) { const a = k * Math.PI * 0.4; add(cyl(r * 0.95, r * 0.95, 0.05, toy(PAL.naranja), [x, y + Math.sin(a) * r * 0.95, z + Math.cos(a) * r * 0.95], [0, 0, rx], 8)); }
    };
    for (const s of [-1, 1]) { flower(s, H * 0.46, -Lc * 0.22, 0.2); flower(s, H * 0.3, Lc * 0.14, 0.12); } // flores naranjas en relieve
    add(rbox(Wd * 0.5, 0.04, Lc * 0.6, 0.02, acc, [0, H * 0.61, -Lc * 0.12])); // franja celeste en el techo
  } else if (kind === "murcielago") {
    for (const s of [-1, 1]) {
      const p: V3 = [s * Wd * 0.42, H * 0.62 + 0.38, -Lc * 0.4], r: V3 = [-0.45, 0, s * 0.1];
      add(rbox(0.07, 0.95, 0.7, 0.02, blk, p, r), rbox(0.09, 0.7, 0.5, 0.02, paint, p, r), rbox(0.1, 0.05, 0.62, 0.02, cop, p, [-0.45, 0, s * 0.1 + 0.0])); // aleta de murciélago: negra, violeta y filo cobre
      add(...[-0.22, 0, 0.22].map((z) => box(0.05, 0.16, 0.14, blk, [p[0], p[1] - 0.5, p[2] - 0.3 + z * 0.0 + z], [-0.45, 0, 0])));
    }
    add(cyl(0, Wd * 0.5, Lc * 0.3, blk, [0, H * 0.24, front + 0.08], [rx, 0, 0], 4), cyl(0, Wd * 0.2, Lc * 0.12, cop, [0, H * 0.24, front + 0.3], [rx, 0, 0], 4)); // morro en punta con la punta de cobre
  } else if (kind === "helado") {
    const sx = Wd * 0.5 + 0.22;
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) add(box(0.5, 0.04, Lc * 0.4 / 6, i % 2 ? wht : acc, [s * sx, H * 0.98, -Lc * 0.28 + (i - 2.5) * Lc * 0.4 / 6], [0, 0, -s * 0.35])); // toldo rayado rosa y blanco
  } else if (kind === "topadora") { // cargadora: pala ancha delante con dientes, brazos y pistones, cabina con jaula y faros de techo, motor atrás
    const steel = toy("#6E7276"), zp = Lc * 0.55, bw = (tx + 0.17) * 2 + 0.25; // pala más ancha que las orugas: se lee desde atrás
    for (const s of [-1, 1]) add(...[-1, 1].map((f) => cyl(0.5, 0.5, 0.34, blk, [s * tx, 0.08, f * Lc * 0.46], [0, 0, rx], 10)), // ruedas guía de las orugas
      ...[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => box(0.38, 0.05, 0.08, acc, [s * tx, 0.3, i * Lc * 0.1])), // tacos de oruga
      rbox(0.14, 0.18, 1.3, 0.04, paint, [s * (tx - 0.26), 0.4, Lc * 0.28], [0.19, 0, 0]), cyl(0.14, 0.14, 0.8, paint, [s * (tx - 0.38), 0.66, Lc * 0.2], [rx + 0.25, 0, 0], 8), cyl(0.07, 0.07, 0.95, chrome, [s * (tx - 0.38), 0.62, Lc * 0.28], [rx + 0.25, 0, 0], 6), // brazo, pistón y vástago
      box(0.1, 0.75, 0.9, paint, [s * (bw / 2 - 0.05), 0.2, zp + 0.4])); // lateral de la pala
    add(rbox(Wd * 0.8, H * 0.28, Lc * 0.62, 0.1, paint, [0, H * 0.28, -Lc * 0.06]), rbox(Wd * 0.82, H * 0.42, Lc * 0.34, 0.12, paint, [0, H * 0.46, -Lc * 0.36]), box(Wd * 0.5, 0.16, 0.03, blk, [0, H * 0.5, -Lc * 0.54]), // casco y capó del motor
      rbox(Wd * 0.8, H * 0.42, Lc * 0.32, 0.1, glass, [0, H * 0.78, -Lc * 0.02]), box(Wd * 0.8, 0.07, Lc * 0.34, paint, [0, H * 0.96, -Lc * 0.02]), // cabina y techo
      ...[-1, 1].flatMap((s) => [-1, 1].map((f) => box(0.07, H * 0.46, 0.07, blk, [s * Wd * 0.42, H * 0.78, -Lc * 0.02 + f * Lc * 0.16])).concat([box(0.2, 0.12, 0.12, blk, [s * Wd * 0.28, H * 1.03, Lc * 0.1]), box(0.14, 0.07, 0.03, glow, [s * Wd * 0.28, H * 1.03, Lc * 0.1 + 0.07])])), // parantes y faros de techo
      box(bw, 0.07, 0.9, steel, [0, -0.12, zp + 0.4]), rbox(bw, H * 0.8, 0.12, 0.05, paint, [0, 0.3, zp - 0.02], [-0.2, 0, 0]), rbox(bw, 0.14, 0.16, 0.05, paint, [0, -0.05, zp + 0.85]), // piso, respaldo y labio de la pala
      ...[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => box(0.14, 0.1, 0.24, blk, [i * bw * 0.105, -0.12, zp + 1.0]))); // dientes de la pala
  } else if (kind === "tanque") {
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { const d = i % 4 ? 0.34 : 0.44; add(cyl(d, d, 0.05, acc, [s * (tx + 0.19), 0.05, (i - 2) * Lc * 0.19], [0, 0, rx], 10)); } // ruedas amarillas de las orugas
    add(rbox(Wd * 0.6, H * 0.2, Lc * 0.3, 0.1, acc, [0, H * 0.9, -Lc * 0.06]), cyl(0.3, 0.3, Lc * 0.46, blk, [0, H * 0.72, Lc * 0.34], [rx, 0, 0], 8), cyl(Wd * 0.7, Wd * 0.7, 0.08, blk, [0, H * 0.5, -Lc * 0.06], undefined, 12), cyl(0.34, 0.34, 0.14, blk, [0, H * 0.72, Lc * 0.14], [rx, 0, 0], 8), cyl(0.3, 0.3, 0.2, acc, [0, H * 0.72, Lc * 0.56], [rx, 0, 0], 8)); // aro de la torreta, mantelete y freno del cañón
  } else if (kind === "combi") {
    add(rbox(Wd * 1.0, H * 0.22, Lc * 0.84, 0.1, cr, [0, H * 0.96, 0]), // techo alto crema
      ...[-1, 1].flatMap((s) => [cyl(0.3, 0.3, 0.08, blk, [s * Wd * 0.16, H * 0.24, front + 0.02], [rx, 0, 0], 10), sph(0.2, glow, [s * Wd * 0.16, H * 0.24, front + 0.07], undefined, 4)])); // faros auxiliares
  } else if (kind === "monster") {
    const cage = (z: number) => tube([[-Wd * 0.42, lift + H * 0.7, z], [-Wd * 0.4, lift + H * 1.45, z], [Wd * 0.4, lift + H * 1.45, z], [Wd * 0.42, lift + H * 0.7, z]], 0.04, acc);
    add(cage(Lc * 0.15), cage(-Lc * 0.23), tube([[0, lift + H * 1.45, Lc * 0.15], [0, lift + H * 1.45, -Lc * 0.23]], 0.04, acc), // jaula
      ...[-1, 1].flatMap((s) => [cyl(0.3, 0.3, 0.1, blk, [s * Wd * 0.26, lift + H * 1.5, Lc * 0.17], [rx, 0, 0], 10), sph(0.2, glow, [s * Wd * 0.26, lift + H * 1.5, Lc * 0.17 + 0.07], undefined, 4), // 2 faros redondos
        box(0.14, 0.03, Lc * 0.3, blk, [s * Wd * 0.15, lift + H * 0.5, Lc * 0.3]), box(0.14, 0.03, Lc * 0.34, blk, [s * Wd * 0.15, lift + H * 1.29, -Lc * 0.04])])); // franjas negras
  } else if (kind === "moto") { // deportiva: horquilla, carenado con parabrisas y faro, tanque, asiento claro y cola
    for (const s of [-1, 1]) add(cyl(0.07, 0.07, 0.8, chrome, [s * 0.1, 0.36, 0.7], [-0.4, 0, 0], 6), rbox(0.08, 0.4, 0.9, 0.03, acc, [s * 0.17, 0.26, 0.05]), box(0.05, 0.05, 0.12, blk, [s * 0.31, 0.82, 0.5])); // horquilla, carenados y puños
    add(rbox(0.24, 0.36, 0.6, 0.08, blk, [0, 0.12, 0]), rbox(0.3, 0.26, 0.55, 0.12, paint, [0, 0.54, 0.22]), rbox(0.3, 0.14, 0.62, 0.06, cr, [0, 0.52, -0.4]), rbox(0.28, 0.22, 0.5, 0.1, paint, [0, 0.58, -0.72], [-0.2, 0, 0]), // motor, tanque, asiento y cola
      rbox(0.4, 0.42, 0.4, 0.16, paint, [0, 0.58, 0.64]), box(0.3, 0.3, 0.04, glass, [0, 0.9, 0.56], [-0.55, 0, 0]), rbox(0.14, 0.12, 0.1, 0.04, glow, [0, 0.54, 0.86]), // carenado, parabrisas y faro
      box(0.26, 0.08, 0.64, paint, [0, 0.5, 0.86]), tube([[-0.31, 0.82, 0.5], [0, 0.8, 0.54], [0.31, 0.82, 0.5]], 0.025, blk), cyl(0.07, 0.07, 0.5, chrome, [0.17, 0.12, -0.45], [rx, 0, 0], 6), box(0.1, 0.05, 0.03, M.glow("#ff2a1a"), [0, 0.64, -0.99])); // guardabarros, manubrio, escape y luz trasera
  } else if (kind === "monopatin") {
    add(cyl(0.07, 0.07, 0.55, acc, [0, 0.45, Lc * 0.34], undefined, 6), tube([[-0.25, 0.74, Lc * 0.34], [0.25, 0.74, Lc * 0.34]], 0.035, blk), rbox(0.2, 0.02, Lc * 0.5, 0.01, cr, [0, 0.19, 0])); // columna, manubrio y franja crema
  }

  // Contraste y presencia: guardabarros negros sobre las ruedas, paragolpes-jaula negro y calcos blancos con el número (disco)
  if (xm > 0.2 && arch !== "truck" && kind !== "clasico" || kind === "combi" || kind === "helado") for (const w of ws) if (w.d >= 0.5)
    add(box(w.w * 1.2, 0.05, w.d * (arch === "buggy" ? 0.5 : 0.78), arch === "buggy" ? acc : blk, [w.pos[0], w.pos[1] + w.d * 0.5 + 0.03, w.pos[2]]));
  if (arch === "buggy" || arch === "monster" && kind === "monster" || arch === "rally" && kind !== "clasico") {
    const zf = Lc * 0.5, zb = -Lc * 0.5, y0 = lift + 0.12;
    for (const [z, f] of [[zf, 1], [zb, -1]] as [number, number][]) add(tube([[-Wd * 0.46, y0, z - f * 0.1], [-Wd * 0.48, y0 + 0.1, z + f * 0.1], [Wd * 0.48, y0 + 0.1, z + f * 0.1], [Wd * 0.46, y0, z - f * 0.1]], 0.04, blk));
    add(rbox(Wd * 0.7, 0.14, 0.14, 0.05, blk, [0, y0 + 0.02, zf + 0.04]));
    if (arch === "buggy") add(...[-1.5, -0.5, 0.5, 1.5].map((i) => cyl(0.05, 0.05, 0.02, M.matte("#050506"), [i * Wd * 0.12, y0 + 0.02, zf + 0.115], [Math.PI / 2, 0, 0], 8))); // agujeros del paragolpes
  }
  if (xm > 0.2 && arch !== "monster" && !(arch === "truck" && (kind === "tanque" || kind === "topadora"))) {
    const dy = lift + H * (arch === "buggy" ? 0.3 : 0.32), dx = Wd / 2 + 0.012;
    add(...[-1, 1].map((s) => cyl(0.2, 0.2, 0.02, wht, [s * dx, dy, -Lc * 0.04], [0, 0, Math.PI / 2], 10)));
    if (arch === "buggy") add(cyl(0.2, 0.2, 0.02, wht, [0, lift + H * 0.35 + 0.012, Lc * 0.33], undefined, 10), rbox(Wd * 0.12, 0.02, Lc * 0.5, 0.01, wht, [0, lift + H * 0.455, -Lc * 0.04]));
  }
  // Amortiguadores visibles: varilla negra + resorte de color, del costado de la carrocería a la maza de cada rueda
  if (xm > 0.2 && kind !== "tanque" && kind !== "topadora" && kind !== "axel" && kind !== "clasico") for (const w of ws) { // el clásico los lleva bajo los guardabarros
    const s = Math.sign(w.pos[0]), [wx, , wz] = w.pos, ya = lift + H * 0.5, xb = s * (Wd / 2 - 0.02), xw = s * (Math.abs(wx) - w.w / 2 - 0.02), yw = w.d * 0.25;
    const dx = xw - xb, dy = yw - ya, len = Math.hypot(dx, dy), rot: V3 = [0, 0, -Math.atan2(dx, dy)], mid: V3 = [(xb + xw) / 2, (ya + yw) / 2, wz];
    add(cyl(0.06, 0.06, len, blk, mid, rot, 6), cyl(0.14, 0.14, len * 0.6, kind === "hover" ? toy(PAL.amarillo) : SPRING(), mid, rot, 8), sph(0.16, blk, [xb, ya, wz], undefined, 4));
  }
  // Luces delanteras de los costados
  if (kind !== "monopatin" && kind !== "moto" && kind !== "clasico" && kind !== "topadora") for (const s of [-1, 1]) add(cyl(0.12, 0.12, 0.05, blk, [s * Wd * 0.34, Math.max(H * 0.3, 0.2) + lift, Lc * 0.48 - 0.01], [Math.PI / 2, 0, 0], 8), sph(0.19, glow, [s * Wd * 0.34, Math.max(H * 0.3, 0.2) + lift, Lc * 0.48 + 0.02], undefined, 4));
  return { parts, stock };
}
