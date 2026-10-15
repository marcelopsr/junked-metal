// Paseo libre: trucos (aire, giros, vueltas, combo) y tuercas doradas. Lógica pura (sin motor ni DOM), probada en test/free_tricks.test.ts.
// Los números viven en balance.json (ritmo.libre_*). El motor lo alimenta main.ts (libreHud) y la física del aire/hielo/bajadas run_drive.ts (libreDrive).
import { BAL } from "./balance";

const R = BAL.ritmo;

/** Estado del Paseo libre que comparten main.ts y run_drive.ts: no toca ENCORE (on = false fuera del modo). */
export const roam = { on: false, hielo: null as { cx: number; cz: number; rx: number; rz: number } | null, extra: 0, air: 0 };
/** Dentro de la elipse del lago congelado (libre_nieve.ts: lagoHielo). */
export const enHielo = (x: number, z: number) => !!roam.hielo && ((x - roam.hielo.cx) / roam.hielo.rx) ** 2 + ((z - roam.hielo.cz) / roam.hielo.rz) ** 2 < 1;

// ---------- Trucos ----------
export type TrickState = { air: number; yaw: number; flip: number; gap: number; chain: boolean; combo: number; chainPts: number };
export const newTrick = (): TrickState => ({ air: 0, yaw: 0, flip: 0, gap: 99, chain: false, combo: 0, chainPts: 0 });
export type TrickEnd = { name: string; pts: number; mult: number; clean: boolean; air: number; yawDeg: number; flips: number; chainPts: number };

const deg = (r: number) => (r * 180) / Math.PI;
const halves = (yawDeg: number) => Math.floor((yawDeg + 30) / 180); // medios giros: 150 grados ya cuentan como 180
const flipsOf = (flipDeg: number) => Math.floor((flipDeg + 60) / 360);
const FLIPS = ["", "VUELTA", "DOBLE VUELTA", "TRIPLE VUELTA"];

/** Un cuadro. wYaw = velocidad de giro sobre el eje vertical del auto, wFlip = sobre los otros dos (rad/s, valores absolutos);
 *  upY = cuánto apunta el techo hacia arriba (1 = recto). Devuelve el truco al aterrizar (limpio o sucio) o null. */
export function trickStep(s: TrickState, dt: number, grounded: boolean, wYaw: number, wFlip: number, upY: number): TrickEnd | null {
  s.gap += dt;
  if (!grounded) {
    if (s.air === 0) s.chain = s.gap < R.libre_combo_s; // despega: ¿sigue la cadena?
    s.air += dt; s.yaw += wYaw * dt; s.flip += wFlip * dt;
    return null;
  }
  const air = s.air, yawDeg = deg(s.yaw), flipDeg = deg(s.flip);
  s.air = s.yaw = s.flip = 0;
  if (air < R.libre_aire_min_s) return null;
  const hs = halves(yawDeg), fl = flipsOf(flipDeg), clean = upY >= R.libre_limpio_up;
  const parts = [hs > 0 && (hs === 1 ? "MEDIO GIRO" : `GIRO ${hs * 180}`), fl > 0 && (FLIPS[fl] ?? `${fl} VUELTAS`)].filter(Boolean) as string[];
  const name = parts.length ? parts.join(" + ") : air >= 1.2 ? "AIRE LARGO" : "SALTO";
  const base = air * R.libre_pts_aire + (hs / 2) * R.libre_pts_giro + fl * R.libre_pts_vuelta;
  if (!clean) { s.combo = 0; s.gap = 99; s.chainPts = 0; return { name, pts: 0, mult: 1, clean, air, yawDeg, flips: fl, chainPts: 0 }; }
  s.combo = s.chain ? Math.min(R.libre_combo_tope, s.combo + 1) : 1;
  const pts = Math.round(base * s.combo);
  s.chainPts = (s.chain ? s.chainPts : 0) + pts; s.gap = 0;
  return { name, pts, mult: s.combo, clean, air, yawDeg, flips: fl, chainPts: s.chainPts };
}

/** Texto del contador en vuelo ("1,2 s · 1 giro") o "" si todavía no es un truco. */
export function trickLive(s: TrickState) {
  if (s.air < R.libre_aire_min_s) return "";
  const hs = halves(deg(s.yaw)), fl = flipsOf(deg(s.flip));
  return [`${s.air.toFixed(1).replace(".", ",")} s`, hs > 0 && (hs === 1 ? "medio giro" : `${hs * 180}°`), fl > 0 && `${fl} ${fl === 1 ? "vuelta" : "vueltas"}`].filter(Boolean).join(" · ");
}

/** Récords guardados (save.libre.best): aire en ms, giro en grados, vuelta en cantidad, mejor truco y mejor combo en puntos. Devuelve cuáles subieron. */
export type LibreBest = { aire: number; giro: number; vuelta: number; salto: number; combo: number };
export function bestUpdate(b: LibreBest, t: TrickEnd) {
  const up: (keyof LibreBest)[] = [];
  if (!t.clean) return up;
  const put = (k: keyof LibreBest, v: number) => { if (v > b[k]) { b[k] = v; up.push(k); } };
  put("aire", Math.round(t.air * 1000)); put("giro", Math.round(t.yawDeg)); put("vuelta", t.flips); put("salto", t.pts); put("combo", t.chainPts);
  return up;
}

// ---------- Tuercas doradas ----------
/** 24 tuercas fijas [x, y, z, radio extra]: las del aire piden un salto bien hecho (radio mayor), el resto, llegar. y = centro de la tuerca. */
export const NUTS: [number, number, number, number?][] = [
  // calles y plaza
  [0, 1.4, 38], [270, 1.4, 0], [-270, 1.4, 0],
  // parque: sobre el puente del laguito
  [130, 1.6, 51],
  // skatepark: bowl grande, bowl chico, funbox, aire sobre el borde del half-pipe, aire de la megarrampa
  [-110, 1.4, 105], [-45, 1.4, 140], [-207, 2.6, 90], [-150, 10, 224, 1.5], [-216, 12, 150, 1.5],
  // acuático: meseta de la torre, pileta grande, pileta vacía, aire sobre el trampolín, piletas bajas
  [226, 12.5, 152], [120, 1.4, 175], [80, 1.4, 232], [100, 6.5, 120, 1.5], [186, 1.4, 140],
  // nieve: cima del mirador, cima de loma, aire entre lomas, centro del lago, final de la pista
  [-105, 12, -218], [-212, 5.5, -168], [-217, 6, -150, 1.5], [-195, 1.4, -70], [-198, 1.4, -104],
  // circuito: largada, loma del carril A, aire del salto 1 y del salto 2, meta
  [140, 1.4, -140], [216, 2.6, -140], [162, 4, -230, 1.5], [220, 5.5, -230, 1.5], [246, 1.4, -230],
];
export const NUT_N = NUTS.length;
export const nutsOk = (bits: string) => /^[01]{24}$/.test(bits);
export const nutsCount = (bits: string) => [...bits].filter((c) => c === "1").length;
/** Índice de la tuerca (no juntada) al alcance de p, o -1. */
export function nutNear(bits: string, x: number, y: number, z: number) {
  for (let i = 0; i < NUT_N; i++) {
    if (bits[i] === "1") continue;
    const n = NUTS[i], r = R.libre_radio_tuerca + (n[3] ?? 0);
    if ((x - n[0]) ** 2 + (y - n[1]) ** 2 + (z - n[2]) ** 2 < r * r) return i;
  }
  return -1;
}
