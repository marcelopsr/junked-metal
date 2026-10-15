// Paseo libre: desafíos opcionales (contrarreloj de obstáculos, trucos en el skatepark, bajada de la nieve). Lógica pura (sin motor ni DOM),
// probada en test/free_challenges.test.ts. El cartel/arco de inicio vive en cada barrio (src/zones/libre_*.ts); main.ts (libreHud) la alimenta.

import { BAL } from "./balance";

export type DesafioId ="obs" | "skate" | "nieve";
/** tiempo: gana el menor tiempo (ms) al cruzar la meta (bx, bz, br); puntos: suma los trucos limpios durante `limite` segundos. */
export type Desafio = { id: DesafioId; nombre: string; tipo: "tiempo" | "puntos"; ax: number; az: number; ar: number; bx?: number; bz?: number; br?: number; limite: number; cp?: [number, number, number][] };
export const DESAFIOS: Desafio[] = [
  // Largada y meta del carril de la cinta (libre_obstaculos.ts: gate(140, -140) y gate(246, -230)); cp = puntos de control en orden [x, z, radio]: las dos esquinas de la S
  { id: "obs", nombre: "CONTRARRELOJ DE OBSTÁCULOS", tipo: "tiempo", ax: 140, az: -140, ar: 9, bx: 246, bz: -230, br: 11, limite: 300, cp: [[250, -162, 14], [140, -207, 14]] },
  // Arco del skatepark (libre_skate.ts, junto a la entrada de la avenida)
  { id: "skate", nombre: "TRUCOS EN EL SKATEPARK", tipo: "puntos", ax: -70, az: 40, ar: 8, limite: 60 },
  // Arco de largada de la pista (libre_nieve.ts, s = 26) y llegada al lago congelado
  // cp: dos curvas de la pista (CP de libre_nieve.ts), fuera de la línea recta entre largada y lago
  { id: "nieve", nombre: "BAJADA DE LA NIEVE", tipo: "tiempo", ax: -105, az: -200, ar: 9, bx: -196, bz: -94, br: 14, limite: 300, cp: [[-172, -164, 14], [-176, -116, 14]] },
];
export type DesafioBest = Record<DesafioId, number>; // tiempo en ms (0 = sin marca) o puntos
export const newBest = (): DesafioBest => ({ obs: 0, skate: 0, nieve: 0 });

export type ChState = { d: Desafio | null; t: number; pts: number; lock: DesafioId | null; cp: number }; // lock: arco ya cruzado (no reinicia hasta salir de él); cp: puntos de control ya pasados
export const newCh = (): ChState => ({ d: null, t: 0, pts: 0, lock: null, cp: 0 });
export type ChEvent = { kind: "inicio" | "punto" | "fin" | "fallo"; d: Desafio; ms: number; pts: number; record: boolean } | null;

/** Próximo destino de la contrarreloj en curso (siguiente punto de control o la meta) con cuántos puntos van; null si no hay desafío de tiempo. */
export function chObjetivo(s: ChState) {
  const d = s.d;
  if (!d || d.tipo !== "tiempo") return null;
  const c = d.cp?.[s.cp], n = d.cp?.length ?? 0;
  return { x: c ? c[0] : d.bx!, z: c ? c[1] : d.bz!, i: s.cp, n };
}

const dist = (x: number, z: number, cx: number, cz: number) => Math.hypot(x - cx, z - cz);

/** ¿Es mejor la marca? El tiempo gana si es menor (0 = sin marca); los puntos, si es mayor (y > 0). */
export const mejora = (d: Desafio, best: number, v: number) => v > 0 && (d.tipo === "tiempo" ? best === 0 || v < best : v > best);

/** Un cuadro. Cruzar el arco de inicio lo arma; salir y volver a cruzarlo reinicia la contrarreloj. Guarda el récord en `best` y lo informa en el evento. */
export function chStep(s: ChState, dt: number, x: number, z: number, best: DesafioBest): ChEvent {
  const dentro = DESAFIOS.find((d) => dist(x, z, d.ax, d.az) < d.ar);
  if (dentro && dentro.id !== s.lock && !(s.d === dentro && dentro.tipo === "puntos")) { s.d = dentro; s.t = 0; s.pts = 0; s.cp = 0; s.lock = dentro.id; return { kind: "inicio", d: dentro, ms: 0, pts: 0, record: false }; }
  if (dentro?.id !== s.lock) s.lock = null;
  const d = s.d;
  if (!d) return null;
  s.t += dt;
  const fin = (kind: "fin" | "fallo", ms: number, pts: number): ChEvent => {
    const v = d.tipo === "tiempo" ? ms : pts, record = kind === "fin" && mejora(d, best[d.id], v);
    if (record) best[d.id] = v;
    s.d = null;
    return { kind, d, ms, pts, record };
  };
  const c = d.cp?.[s.cp];
  if (c && dist(x, z, c[0], c[1]) < c[2]) { s.cp++; return { kind: "punto", d, ms: Math.round(s.t * 1000), pts: 0, record: false }; }
  if (d.tipo === "tiempo" && !c && dist(x, z, d.bx!, d.bz!) < d.br!) return fin("fin", Math.round(s.t * 1000), 0); // la meta solo cuenta con todos los puntos de control pasados
  if (s.t >= d.limite) return d.tipo === "puntos" ? fin("fin", 0, s.pts) : fin("fallo", 0, 0);
  return null;
}

/** Suma un truco limpio al desafío de puntos en curso. */
export const chTruco = (s: ChState, pts: number) => { if (s.d?.tipo === "puntos") s.pts += pts; };

/** Texto del reloj: "1:05,3". */
export const fmtMs = (ms: number) => `${Math.floor(ms / 60000)}:${(((ms % 60000) / 1000).toFixed(1).replace(".", ",")).padStart(4, "0")}`;
export const fmtMarca = (d: Desafio, v: number) => (v <= 0 ? "SIN MARCA" : d.tipo === "tiempo" ? fmtMs(v) : `${v} PTS`);

// ---------- Medallas (bronce / plata / oro): umbrales en balance.json (libre_medallas) ----------
export type Medalla = 0 | 1 | 2 | 3;
export const MEDALLA = ["", "BRONCE", "PLATA", "ORO"];
const MENOR = ["obs", "nieve"]; // en estos gana el tiempo menor
/** Medalla de una marca (0 = sin medalla). */
export function medalla(id: string, v: number): Medalla {
  if (!(v > 0)) return 0;
  const r = BAL.libreMedallas[id], ok = (m: number) => (MENOR.includes(id) ? v <= m : v >= m);
  return ok(r.oro) ? 3 : ok(r.plata) ? 2 : ok(r.bronce) ? 1 : 0;
}
/** Récords de trucos (save.libre.best) con su nombre y formato, para la pausa. */
export const RECORDS: { id: string; nombre: string; fmt: (v: number) => string }[] = [
  { id: "aire", nombre: "MÁS TIEMPO EN EL AIRE", fmt: (v) => `${(v / 1000).toFixed(1).replace(".", ",")} S` },
  { id: "giro", nombre: "GIRO MÁS LARGO", fmt: (v) => `${v}°` },
  { id: "vuelta", nombre: "MÁS VUELTAS DE CAMPANA", fmt: (v) => `${v}` },
  { id: "salto", nombre: "MEJOR TRUCO", fmt: (v) => `${v} PTS` },
  { id: "combo", nombre: "MEJOR COMBO", fmt: (v) => `${v} PTS` },
];

// ---------- Fantasma del récord: el mejor intento de cada desafío, comprimido en una cadena base64 (save.libre.fantasma) ----------
/** Una muestra: x, y, z, qx, qy, qz, qw, puntos acumulados. Cada 0,1 s. */
export type Muestra = number[];
export const FANTASMA_DT = 0.1;
/** Tope de la cadena guardada (~20 KB): 11 bytes por muestra = ~1500 muestras (150 s). ponytail: un intento más largo no deja fantasma (sin delta ni zlib; subir el tope o comprimir si hiciera falta). */
export const FANTASMA_MAX = 22000;
const BYTES = 11;
/** Codifica: posición en cm (int16), quaternion con w >= 0 en int8 (w se recalcula) y puntos (uint16). "" si no entra en el tope. */
export function fantasmaEnc(m: Muestra[]): string {
  if (m.length < 2 || Math.ceil(m.length * BYTES / 3) * 4 > FANTASMA_MAX) return "";
  const dv = new DataView(new ArrayBuffer(m.length * BYTES));
  m.forEach((r, i) => {
    const o = i * BYTES, s = r[6] < 0 ? -1 : 1, c = (v: number, a: number) => Math.max(-a, Math.min(a, Math.round(v)));
    for (let k = 0; k < 3; k++) dv.setInt16(o + k * 2, c(r[k] * 100, 32767), true);
    for (let k = 0; k < 3; k++) dv.setInt8(o + 6 + k, c(r[3 + k] * s * 127, 127));
    dv.setUint16(o + 9, Math.max(0, c(r[7], 65535)), true);
  });
  let bin = ""; new Uint8Array(dv.buffer).forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}
/** Decodifica; null si la cadena está corrupta (no es base64, largo que no cuadra o demasiado larga). */
export function fantasmaDec(s: unknown): Muestra[] | null {
  if (typeof s !== "string" || s.length > FANTASMA_MAX || !/^[A-Za-z0-9+/]*={0,2}$/.test(s)) return null;
  let raw: string;
  try { raw = atob(s); } catch { return null; }
  if (raw.length < 2 * BYTES || raw.length % BYTES) return null;
  const u = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) u[i] = raw.charCodeAt(i);
  const dv = new DataView(u.buffer), out: Muestra[] = [];
  for (let o = 0; o < u.length; o += BYTES) {
    const x = dv.getInt8(o + 6) / 127, y = dv.getInt8(o + 7) / 127, z = dv.getInt8(o + 8) / 127;
    out.push([dv.getInt16(o, true) / 100, dv.getInt16(o + 2, true) / 100, dv.getInt16(o + 4, true) / 100, x, y, z, Math.sqrt(Math.max(0, 1 - x * x - y * y - z * z)), dv.getUint16(o + 9, true)]);
  }
  return out;
}
/** Lo que queda en el guardado: la cadena si es válida, si no vacío. */
export const fantasmaOk = (s: unknown): string => (s === "" || fantasmaDec(s) ? (s as string) : "");
/** Muestra interpolada a los `t` segundos (se queda en la última). Los quaternions se mezclan lineal: quien la usa normaliza. */
export function fantasmaAt(m: Muestra[], t: number): Muestra {
  const f = Math.max(0, t) / FANTASMA_DT, i = Math.min(m.length - 1, Math.floor(f)), j = Math.min(m.length - 1, i + 1), k = Math.min(1, f - i);
  return m[i].map((v, n) => v + (m[j][n] - v) * k);
}
/** Segundos en que el fantasma pasó cada punto de control y la meta (mismo criterio que chStep); -1 si no llegó. */
export function fantasmaCp(d: Desafio, m: Muestra[]): number[] {
  const pts: [number, number, number][] = [...(d.cp ?? []), [d.bx ?? 0, d.bz ?? 0, d.br ?? 0]], out: number[] = [];
  m.forEach((r, i) => { const p = pts[out.length]; if (p && dist(r[0], r[2], p[0], p[1]) < p[2]) out.push(i * FANTASMA_DT); });
  while (out.length < pts.length) out.push(-1);
  return out;
}
/** Diferencia continua de tiempo: `t` del jugador menos el instante en que el fantasma estuvo más cerca de (x, z), buscando en una ventana de ±10 s alrededor de `t` (así la S no confunde tramos). */
export function fantasmaDif(m: Muestra[], t: number, x: number, z: number): number {
  const c = Math.round(t / FANTASMA_DT), w = 10 / FANTASMA_DT;
  let bi = Math.min(m.length - 1, Math.max(0, c)), bd = Infinity;
  for (let i = Math.max(0, c - w); i <= Math.min(m.length - 1, c + w); i++) { const d = dist(x, z, m[i][0], m[i][2]); if (d < bd) { bd = d; bi = i; } }
  return t - bi * FANTASMA_DT;
}
/** Diferencia en vivo: "-0,8 S" (tiempo; negativo = adelante) o "+120 PTS". */
export const fmtDif = (tipo: Desafio["tipo"], v: number) => tipo === "tiempo" ? `${v <= 0 ? "-" : "+"}${Math.abs(v).toFixed(1).replace(".", ",")} S` : `${v >= 0 ? "+" : "-"}${Math.abs(Math.round(v))} PTS`;
