// Datos del modo Carrera que el menú y la portada necesitan sin cargar kart.ts (chunk aparte, a pedido):
// configuración guardada, circuitos, mejores tiempos y medallas.
import * as B from "@babylonjs/core";
import type { CarKind } from "./models";

// ---------- Configuración (se guarda aparte del guardado del juego) ----------
export type RaceCtl = "kbd" | "kbd2" | "pad0" | "pad1";
export type RaceCfg = { players: 1 | 2; p1: RaceCtl; p2: RaceCtl; cc: 50 | 100 | 150; laps: 3 | 5; cup: boolean; car2: CarKind; track: 0 | 1 | 2 };
const CFG_KEY = "rcfight-race";
export const raceCfg: RaceCfg = { players: 1, p1: "kbd", p2: "pad0", cc: 100, laps: 3, cup: true, car2: "formula", track: 0 };
try { Object.assign(raceCfg, JSON.parse(localStorage.getItem(CFG_KEY) ?? "{}")); } catch { /* sin storage */ }
export const saveRaceCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(raceCfg)); } catch { /* sin storage */ } };

// ---------- Mejores tiempos y medallas (se guardan aparte, por pista) ----------
export type TimeRec = { t: number; lap: number; car: string; cc: number };
const TIMES_KEY = "rcfight-times";
export const times: Record<string, TimeRec[]> = (() => { try { return JSON.parse(localStorage.getItem(TIMES_KEY) ?? "{}"); } catch { return {}; } })();
const saveTimes = () => { try { localStorage.setItem(TIMES_KEY, JSON.stringify(times)); } catch { /* sin storage */ } };
export const MEDAL = ["", "BRONCE", "PLATA", "ORO"] as const;
/** Tiempos objetivo para una carrera de `laps` vueltas en la pista `i`: oro / plata / bronce (segundos). Se calculan con el largo del circuito. */
export function medalTimes(i: number, laps: number, cc: number) {
  const def = TRACKS[i], len = trackLen(def), t0 = (laps + def.extra) * len / (26 * (cc / 0.95 > 1 ? 1.1 : 1));
  return [t0 * 1.06, t0 * 1.18, t0 * 1.35];
}
const lenCache: Record<string, number> = {};
function trackLen(def: TrackDef) { return lenCache[def.name] ??= buildTrackData(def).len; }
export function medalOf(i: number, laps: number, cc: number, t: number) { const m = medalTimes(i, laps, cc); return t <= m[0] ? 3 : t <= m[1] ? 2 : t <= m[2] ? 1 : 0; }
export const bestRace = (i: number) => times[String(i)]?.[0];
export function recordTime(i: number, rec: TimeRec) {
  const l = (times[String(i)] ??= []);
  l.push(rec); l.sort((a, b) => a.t - b.t); times[String(i)] = l.slice(0, 5);
  saveTimes();
  return l[0] === rec;
}
export const DS = 3.2; // separación entre muestras
// Circuitos: la zona define el escenario fijo (el layout se limpia). La salida es el primer punto; delante hay recta para la parrilla.
export type TrackDef = { name: string; zone: "patio" | "jardin" | "garaje"; w: number; gap: number; extra: number; crowd: boolean; pts: [number, number][] };
export const TRACKS: TrackDef[] = [
  { name: "Circuito del Patio", zone: "patio", w: 9, gap: 7, extra: 0, crowd: true, pts: [[0, -110], [60, -112], [104, -84], [128, -40], [122, 10], [96, 36], [118, 66], [96, 98], [52, 120], [0, 128], [-55, 118], [-100, 92], [-128, 48], [-102, 14], [-126, -26], [-112, -70], [-60, -102]] },
  // Jardín: el cantero elevado (-55,35), el árbol (78,70) y el buzón quedan dentro o fuera de la pista
  { name: "Circuito del Jardín", zone: "jardin", w: 9, gap: 7, extra: 0, crowd: true, pts: [[0, -100], [60, -104], [102, -72], [116, -24], [94, -2], [118, 28], [114, 74], [92, 108], [40, 122], [-14, 124], [-66, 110], [-106, 76], [-102, 34], [-124, 4], [-112, -52], [-60, -100]] },
  // Garaje: pista angosta con un tramo BAJO el auto de la casa (x = 30), vuelta corta (+2 vueltas)
  { name: "Circuito del Garaje", zone: "garaje", w: 6, gap: 5, extra: 2, crowd: false, pts: [[-48, 45], [-48, -30], [-38, -54], [-5, -58], [30, -48], [30, 0], [30, 45], [24, 62], [-10, 68], [-42, 64]] },
];
export const trackName = (i: number) => TRACKS[i].name;
export type Track = { P: B.Vector3[]; T: B.Vector3[]; R: B.Vector3[]; N: number; len: number };
export function buildTrackData(def: TrackDef): Track {
  const pts = def.pts.map(([x, z]) => new B.Vector3(x, 0, z));
  // Catmull-Rom cerrada → polilínea densa → muestras a distancia pareja
  const dense: B.Vector3[] = [], n = pts.length;
  for (let i = 0; i < n; i++) for (let s = 0; s < 24; s++) dense.push(B.Vector3.CatmullRom(pts[(i + n - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n], s / 24));
  const cum = [0];
  for (let i = 1; i <= dense.length; i++) cum.push(cum[i - 1] + B.Vector3.Distance(dense[i % dense.length], dense[i - 1]));
  const len = cum[dense.length], N = Math.round(len / DS), P: B.Vector3[] = [];
  let j = 0;
  for (let i = 0; i < N; i++) {
    const d = (i / N) * len;
    while (cum[j + 1] < d) j++;
    P.push(B.Vector3.Lerp(dense[j], dense[(j + 1) % dense.length], (d - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j])));
  }
  const T = P.map((p, i) => P[(i + 1) % N].subtract(P[(i + N - 1) % N]).normalize());
  const R = T.map((t) => new B.Vector3(t.z, 0, -t.x));
  return { P, T, R, N, len: len };
}
