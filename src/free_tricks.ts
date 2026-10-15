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
/** 24 tuercas fijas [x, y, z, radio extra]: cada una exige algo, ninguna se junta pasando por el suelo abierto (sondas de Free Roam, ver informe).
 *  Radio de recogida = libre_radio_tuerca + extra. y = centro de la tuerca: sobre las que van encima de una pieza, 2-2,5 m más que el auto parado en ella (el suelo queda fuera de alcance);
 *  las de aire llevan extra para tolerar la trayectoria (megarrampa) o menos (mini-rampa: trayectoria angosta). Las de bowl y pileta (y 1,4) solo se alcanzan bajando adentro. */
export const NUTS: [number, number, number, number?][] = [
  // plaza: sobre el trampolín de los atajos noreste y sureste (hay que subirlo)
  [34, 3.5, 46], [41.45, 3.5, -41.45],
  // parque: cruzar el puente del laguito y la plataforma de cada tobogán
  [130, 2.9, 51], [177.1, 4.65, 65], [190.9, 4.65, 37],
  // skatepark: bowl grande, bowl chico, aire de la megarrampa, aire de la mini-rampa norte, cubierta del half-pipe, mesa de aterrizaje de la megarrampa
  [-110, 1.4, 105], [-45, 1.4, 140], [-216, 12, 150, 1.5], [-250, 3.2, 68, -1.5], [-150, 9.6, 230], [-179, 7.7, 150],
  // acuático: meseta de la torre, tobogán rojo a media bajada, tobogán amarillo casi al final, pileta vacía, pileta grande
  [226, 12.5, 152], [207.9, 8.15, 189.1], [225.5, 4.1, 219.9], [80, 1.4, 232], [120, 1.4, 175],
  // nieve: cima del mirador, cima de la loma alta, cima de la loma del oeste, tramo final de la pista (tercera lomita)
  [-105, 12.4, -218], [-212, 5.5, -168], [-238, 5.3, -196], [-157.5, 4.8, -128.1],
  // circuito: sobre el balancín, dentro del túnel, sobre el puente angosto, en la mesa del salto 2
  [224, 4.2, -185], [160, 3, -185], [191, 4.6, -185], [225, 3.75, -230],
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
