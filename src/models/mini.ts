import * as B from "@babylonjs/core";
import { M, pbr } from "../render";
import { type V3, box, cyl, sph, tor, tube, rbox } from "./common";

// Dirección de arte diorama de juguete (Junked Metal Encore): autos RC de juguete modulares. Chasis común (placa negra) + piezas encastrables:
// carrocería de plástico pintado con bordes redondeados, alerón con soportes, ruedas de goma con taco y llanta de color,
// amortiguadores con resorte de color, antena con punta roja y barra de luces delantera emisiva.
export const PAL = { rojo: "#E53935", amarillo: "#FBC02D", azul: "#42A5F5", verde: "#66BB6A", naranja: "#FB8C00", morado: "#8E24AA", blanco: "#F5F5F5", negro: "#17181c" };
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
  buggy: [PAL.rojo, PAL.amarillo], monster: [PAL.azul, PAL.naranja], formula: [PAL.amarillo, PAL.rojo], tanque: [PAL.verde, PAL.naranja],
  carrera: [PAL.naranja, PAL.azul], axel: [PAL.morado, PAL.amarillo], helado: [PAL.azul, PAL.rojo], combi: [PAL.verde, PAL.blanco],
  hover: [PAL.azul, PAL.morado], topadora: [PAL.amarillo, PAL.naranja], triciclo: [PAL.rojo, PAL.azul], murcielago: [PAL.morado, PAL.amarillo],
  misterio: [PAL.verde, PAL.morado], clasico: [PAL.azul, PAL.blanco], jeep: [PAL.verde, PAL.naranja], moto: [PAL.rojo, PAL.blanco], monopatin: [PAL.amarillo, PAL.rojo],
};
const toy = (c: string) => pbr("mini" + c, { color: c, rough: 0.35, coat: 0.4 }); // plástico pintado: rugosidad 0,35, sin metal
type W = { pos: V3; d: number; w: number };

export function miniHull(kind: string, paint: B.Material, accent: string, lamp: string, ws: W[], size: [number, number, number]) {
  const arch = ARCH[kind] ?? "toy", acc = toy(accent), blk = toy(PAL.negro), wht = toy(PAL.blanco), glass = M.glass(), glow = M.glow(lamp);
  const [sw, H, L] = size;
  const xm = Math.max(...ws.map((w) => Math.abs(w.pos[0]))), wm = Math.max(...ws.map((w) => w.w)), zs = ws.map((w) => w.pos[2]);
  const Lc = Math.max(Math.max(...zs) - Math.min(...zs) + Math.max(...ws.map((w) => w.d)) * 0.5, L * 0.8);
  const Wd = xm > 0.2 ? Math.min(2 * (xm - wm / 2) - 0.04, sw) : sw * 0.45; // ancho de carrocería: entre las ruedas
  const lift = kind === "monster" ? 0.42 : kind === "axel" ? 0.1 : 0;
  const parts: B.Mesh[] = [], stock: B.Mesh[] = [];
  const add = (...m: B.Mesh[]) => parts.push(...m);
  const bar = (y: number, z: number, w: number) => add(rbox(w, 0.08, 0.1, 0.03, blk, [0, y, z]), rbox(w * 0.88, 0.045, 0.03, 0.015, glow, [0, y, z + 0.055])); // barra de luces delantera (emisiva)
  const wing = (dy: number, dz: number, ww: number) => stock.push( // alerón: plato, dos soportes y placas laterales
    rbox(ww, 0.05, 0.36, 0.02, acc, [0, dy + 0.3, dz], [0.1, 0, 0]),
    ...[-1, 1].map((s) => cyl(0.06, 0.06, 0.34, blk, [s * ww * 0.3, dy + 0.14, dz + 0.02], undefined, 6)),
    ...[-1, 1].map((s) => rbox(0.04, 0.2, 0.42, 0.015, paint, [s * ww / 2, dy + 0.3, dz], [0.1, 0, 0])));
  const track = (x: number, w: number, y: number, len: number) => add(rbox(w, 0.46, len, 0.14, blk, [x, y, 0]), rbox(w * 1.02, 0.05, len * 0.82, 0.02, acc, [x, y + 0.26, 0]));
  add(rbox(Wd * 0.9, 0.1, Lc * 0.94, 0.035, blk, [0, 0.02 + lift * 0.5, 0])); // chasis común

  if (arch === "buggy") {
    add(rbox(Wd, H * 0.38, Lc * 0.62, 0.1, paint, [0, lift + H * 0.28, -Lc * 0.04]), rbox(Wd * 0.76, H * 0.26, Lc * 0.3, 0.08, paint, [0, lift + H * 0.22, Lc * 0.33]),
      rbox(Wd * 0.8, H * 0.3, Lc * 0.2, 0.08, paint, [0, lift + H * 0.28, -Lc * 0.4]), rbox(Wd * 0.84, 0.09, 0.12, 0.04, blk, [0, lift + 0.12, Lc * 0.5]));
    const top = lift + H * 0.5, hoop = (z: number, h: number) => tube([[-Wd * 0.45, top, z], [-Wd * 0.4, h, z - 0.1], [Wd * 0.4, h, z - 0.1], [Wd * 0.45, top, z]], 0.035, acc);
    add(hoop(-Lc * 0.14, top + 0.5), hoop(Lc * 0.1, top + 0.4));
    bar(top + 0.46, Lc * 0.1 - 0.1, Wd * 0.8);
    if (kind === "jeep") add(rbox(Wd * 0.7, 0.06, 0.04, 0.02, wht, [0, lift + H * 0.3, Lc * 0.49]), box(Wd * 0.9, 0.3, 0.03, glass, [0, top + 0.16, Lc * 0.1 + 0.04], [-0.3, 0, 0]));
    if (kind === "buggy") wing(0.62, -Lc * 0.43, Wd * 1.05);
  } else if (arch === "rally") {
    add(rbox(Wd, H * 0.44, Lc * 0.92, 0.12, paint, [0, H * 0.3, 0]), rbox(Wd * 0.8, H * 0.38, Lc * 0.4, 0.12, glass, [0, H * 0.66, -Lc * 0.06]),
      rbox(Wd * 0.78, 0.07, Lc * 0.34, 0.035, paint, [0, H * 0.87, -Lc * 0.06]), rbox(Wd * 0.2, 0.025, Lc * 0.8, 0.012, wht, [0, H * 0.525, Lc * 0.02]), // franja blanca
      rbox(Wd * 1.02, 0.09, 0.12, 0.04, blk, [0, 0.1, Lc * 0.47]), rbox(Wd * 1.02, 0.09, 0.12, 0.04, blk, [0, 0.1, -Lc * 0.47]));
    bar(H * 0.55, Lc * 0.38, Wd * 0.7);
    if (kind === "carrera") wing(0.36, -Lc * 0.44, Wd * 1.0);
    else add(rbox(Wd * 0.4, 0.05, 0.2, 0.02, acc, [0, H * 0.92, -Lc * 0.06]));
  } else if (arch === "monster") {
    add(...[-1, 1].map((s) => rbox(0.1, 0.12, Lc * 0.85, 0.04, blk, [s * Wd * 0.3, lift + 0.1, 0])));
    if (kind === "monster") {
      add(rbox(Wd * 0.98, H * 0.46, Lc * 0.46, 0.12, paint, [0, lift + H * 0.5, -Lc * 0.02]), rbox(Wd * 0.9, H * 0.6, Lc * 0.36, 0.1, paint, [0, lift + H * 0.98, -Lc * 0.04]), rbox(Wd * 0.8, H * 0.3, 0.05, 0.02, glass, [0, lift + H * 1.04, Lc * 0.15], [-0.25, 0, 0]), rbox(Wd * 0.8, H * 0.3, 0.05, 0.02, glass, [0, lift + H * 1.04, -Lc * 0.23], [0.25, 0, 0]),
        rbox(Wd * 0.9, H * 0.22, Lc * 0.3, 0.09, paint, [0, lift + H * 0.38, Lc * 0.3]), rbox(Wd * 0.9, H * 0.2, Lc * 0.24, 0.09, paint, [0, lift + H * 0.38, -Lc * 0.34]),
        rbox(Wd * 0.85, 0.1, 0.12, 0.04, blk, [0, lift + 0.16, Lc * 0.5]));
      bar(lift + H * 1.4, Lc * 0.1, Wd * 0.8);
      wing(0.8, -Lc * 0.44, Wd * 1.0);
    } else { // Axel: dos ruedas gigantes y una jaula-cabina colgando del eje
      add(cyl(0.16, 0.16, 1.9, blk, [0, 0, 0], [0, 0, Math.PI / 2], 8), rbox(Wd * 0.8, H * 0.4, Lc * 0.6, 0.12, paint, [0, lift + H * 0.3, 0]),
        tube([[-Wd * 0.38, lift + H * 0.45, -0.5], [-Wd * 0.38, lift + H * 0.9, -0.2], [Wd * 0.38, lift + H * 0.9, -0.2], [Wd * 0.38, lift + H * 0.45, -0.5]], 0.04, acc),
        tube([[-Wd * 0.38, lift + H * 0.45, 0.5], [-Wd * 0.38, lift + H * 0.85, 0.2], [Wd * 0.38, lift + H * 0.85, 0.2], [Wd * 0.38, lift + H * 0.45, 0.5]], 0.04, acc));
      bar(lift + H * 0.5, Lc * 0.28, Wd * 0.6);
    }
  } else if (arch === "drift") {
    if (kind === "moto") {
      add(rbox(0.26, H * 0.42, Lc * 0.5, 0.1, paint, [0, H * 0.45, 0.05]), rbox(0.24, 0.1, Lc * 0.28, 0.04, blk, [0, H * 0.68, -0.2]), rbox(0.34, 0.3, 0.3, 0.12, acc, [0, H * 0.62, 0.4]),
        tube([[-0.28, H * 0.78, 0.38], [0, H * 0.76, 0.4], [0.28, H * 0.78, 0.38]], 0.03, blk), rbox(0.1, 0.1, 0.1, 0.04, glow, [0, H * 0.6, 0.62]));
      bar(H * 0.82, 0.42, 0.34);
    } else {
      const low = kind === "formula";
      add(rbox(Wd, H * 0.46, Lc * 0.62, 0.1, paint, [0, H * 0.3, -Lc * 0.04]), rbox(Wd * 0.4, H * 0.3, Lc * 0.3, 0.09, paint, [0, H * 0.24, Lc * 0.34]),
        rbox(Wd * (low ? 0.5 : 0.62), H * 0.38, Lc * 0.26, 0.1, glass, [0, H * 0.62, -Lc * 0.1]), rbox(Wd * 1.0, 0.05, 0.16, 0.02, acc, [0, 0.07, Lc * 0.5]), // alerón/splitter delantero
        ...[-1, 1].map((s) => rbox(0.14, H * 0.3, Lc * 0.46, 0.06, acc, [s * Wd * 0.5, H * 0.2, -Lc * 0.04]))); // pontones laterales
      bar(H * 0.44, Lc * 0.46, Wd * 0.5);
      if (!low) add(...[-1, 1].map((s) => rbox(0.05, 0.3, 0.32, 0.02, acc, [s * Wd * 0.3, H * 0.62, -Lc * 0.4], [0.2, 0, 0]))); // aletas
      wing(kind === "formula" ? 0.32 : 0.6, -Lc * (low ? 0.44 : 0.4), Wd * 1.25);
    }
  } else if (arch === "truck") {
    if (kind === "tanque" || kind === "topadora") {
      for (const s of [-1, 1]) track(s * Math.max(xm, 0.72), 0.34, 0.05, Lc * 0.92);
      if (kind === "tanque") add(rbox(Wd, H * 0.4, Lc * 0.78, 0.1, paint, [0, H * 0.34, 0]), rbox(Wd * 0.78, H * 0.3, Lc * 0.34, 0.14, paint, [0, H * 0.68, -Lc * 0.06]),
        cyl(0.2, 0.2, Lc * 0.46, blk, [0, H * 0.72, Lc * 0.28], [Math.PI / 2, 0, 0], 8), cyl(0.28, 0.28, 0.1, acc, [0, H * 0.72, Lc * 0.5], [Math.PI / 2, 0, 0], 8));
      else {
        add(rbox(Wd, H * 0.34, Lc * 0.76, 0.1, paint, [0, H * 0.4, -Lc * 0.04]), rbox(Wd * 0.85, H * 0.36, Lc * 0.28, 0.1, glass, [0, H * 0.74, -Lc * 0.08]), rbox(Wd * 0.95, 0.06, Lc * 0.34, 0.03, blk, [0, H * 0.94, -Lc * 0.08]),
          rbox(sw * 1.05, H * 0.55, 0.14, 0.05, acc, [0, H * 0.34, Lc * 0.56], [-0.12, 0, 0]), cyl(0.12, 0.12, 0.5, blk, [Wd * 0.3, H * 0.9, Lc * 0.14], undefined, 8));
      }
      bar(H * 0.56, Lc * (kind === "tanque" ? 0.38 : 0.42), Wd * 0.6);
    } else {
      const van = kind === "combi", ice = kind === "helado";
      add(rbox(Wd, H * 0.52, Lc * 0.92, 0.12, paint, [0, H * 0.3, 0]), rbox(Wd * 1.0, H * 0.3, Lc * 0.5, 0.1, glass, [0, H * 0.7, Lc * 0.1]),
        rbox(Wd * 1.02, 0.07, van ? Lc * 0.88 : Lc * 0.52, 0.03, van ? wht : paint, [0, H * 0.87, van ? 0 : Lc * 0.1]), rbox(Wd * 1.04, 0.09, 0.12, 0.04, blk, [0, 0.1, Lc * 0.48]), rbox(Wd * 1.04, 0.09, 0.12, 0.04, blk, [0, 0.1, -Lc * 0.48]));
      if (ice) add(rbox(Wd * 1.0, H * 0.42, Lc * 0.42, 0.1, wht, [0, H * 0.7, -Lc * 0.28]), rbox(Wd * 1.1, 0.06, Lc * 0.4, 0.02, acc, [0, H * 0.94, -Lc * 0.28], [0, 0, 0]),
        cyl(0.46, 0.04, 0.5, toy(PAL.amarillo), [0, H * 1.2, -Lc * 0.28], undefined, 8), sph(0.42, wht, [0, H * 1.55, -Lc * 0.28], undefined, 6), sph(0.12, toy(PAL.rojo), [0, H * 1.8, -Lc * 0.28], undefined, 4));
      else add(rbox(Wd * 1.02, H * 0.14, Lc * 0.9, 0.05, wht, [0, H * 0.4, 0]));
      bar(H * 0.94, Lc * 0.28, Wd * 0.7);
    }
  } else { // toy
    if (kind === "hover") {
      add(rbox(Wd * 1.2, 0.16, Lc * 0.96, 0.07, blk, [0, 0.02, 0]), rbox(Wd, H * 0.46, Lc * 0.84, 0.16, paint, [0, H * 0.36, 0]), rbox(Wd * 0.7, 0.05, Lc * 0.62, 0.02, wht, [0, H * 0.6, 0]),
        sph(0.55, glass, [0, H * 0.74, Lc * 0.14], [1, 0.7, 1.3], 6), tor(0.95, 0.06, blk, [0, 0.95, -Lc * 0.4], [Math.PI / 2, 0, 0], 12),
        box(0.9, 0.04, 0.12, acc, [0, 0.95, -Lc * 0.4], [0, 0, 0.5]), box(0.9, 0.04, 0.12, acc, [0, 0.95, -Lc * 0.4], [0, 0, -0.5]), ...[-1, 1].map((s) => cyl(0.07, 0.07, 0.7, blk, [s * 0.45, 0.62, -Lc * 0.4], undefined, 6)));
      bar(H * 0.62, Lc * 0.36, Wd * 0.6);
    } else if (kind === "triciclo") {
      add(rbox(0.6, H * 0.34, Lc * 0.6, 0.12, paint, [0, H * 0.38, Lc * 0.14]), rbox(Wd * 1.1, H * 0.5, 0.8, 0.1, wht, [0, H * 0.55, -0.6]), rbox(Wd * 1.14, 0.06, 0.86, 0.03, acc, [0, H * 0.82, -0.6]),
        tube([[-0.32, H * 0.55, 0.62], [-0.3, H * 0.92, 0.5], [0.3, H * 0.92, 0.5], [0.32, H * 0.55, 0.62]], 0.035, blk));
      bar(H * 0.62, Lc * 0.4, 0.5);
    } else if (kind === "misterio") {
      add(rbox(Wd, H * 0.58, Lc * 0.9, 0.2, paint, [0, H * 0.34, 0]), sph(Wd * 0.95, glass, [0, H * 0.74, Lc * 0.14], [1, 0.6, 1], 6), rbox(Wd * 1.02, 0.14, Lc * 0.9, 0.05, acc, [0, H * 0.3, 0]),
        ...[-1, 1].map((s) => sph(0.2, toy(PAL.naranja), [s * Wd * 0.52, H * 0.46, -Lc * 0.2], undefined, 4)), rbox(Wd * 1.04, 0.09, 0.12, 0.04, blk, [0, 0.1, Lc * 0.48]));
      bar(H * 0.9, Lc * 0.3, Wd * 0.6);
    } else { // monopatín: tabla con kicks, dos ejes y un domo
      add(rbox(0.46, 0.08, Lc * 0.62, 0.04, paint, [0, 0.14, 0]), ...[-1, 1].map((s) => rbox(0.46, 0.08, 0.26, 0.04, acc, [0, 0.2, s * Lc * 0.36], [s * 0.35, 0, 0])),
        ...[-0.5, 0.5].map((z) => cyl(0.05, 0.05, 0.5, blk, [0, 0.04, z], [0, 0, Math.PI / 2], 6)), rbox(0.3, 0.2, 0.34, 0.1, acc, [0, 0.32, 0.1]));
      bar(0.28, Lc * 0.4, 0.34);
    }
  }

  // Amortiguadores visibles: varilla negra + resorte de color, del costado de la carrocería a la maza de cada rueda
  if (xm > 0.2 && kind !== "tanque" && kind !== "topadora" && kind !== "axel") for (const w of ws) {
    const s = Math.sign(w.pos[0]), [wx, , wz] = w.pos, ya = lift + H * 0.5, xb = s * (Wd / 2 - 0.02), xw = s * (Math.abs(wx) - w.w / 2 - 0.02), yw = w.d * 0.25;
    const dx = xw - xb, dy = yw - ya, len = Math.hypot(dx, dy), rot: V3 = [0, 0, -Math.atan2(dx, dy)], mid: V3 = [(xb + xw) / 2, (ya + yw) / 2, wz];
    add(cyl(0.045, 0.045, len, blk, mid, rot, 6), cyl(0.1, 0.1, len * 0.6, acc, mid, rot, 8));
  }
  // Luces delanteras de los costados
  if (kind !== "monopatin" && kind !== "moto") for (const s of [-1, 1]) add(sph(0.13, glow, [s * Wd * 0.34, Math.max(H * 0.3, 0.2) + lift, Lc * 0.48], undefined, 4));
  return { parts, stock };
}
