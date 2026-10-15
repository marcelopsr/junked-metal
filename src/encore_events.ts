// ENCORE: interrupción del Director a mitad de escenario (entre el minijefe y el teleportador). Lógica pura: sorteo y reloj; los efectos los pone encore_run.ts por `Io`.
import { BAL } from "./balance";
import { lcg } from "./kit3d";

export type IntId = "luces" | "utileria" | "corte" | "sangre";
export const INT_IDS: IntId[] = ["luces", "utileria", "corte", "sangre"];
/** Nombre en el letrero y frase del Director (el aviso sale `aviso_s` antes de empezar). */
export const INT_TXT: Record<IntId, { name: string; line: string }> = {
  luces: { name: "CAMBIO DE LUCES", line: "Cambio de luces. El público ya no ve nada, y el elenco tampoco: queda el faro." },
  utileria: { name: "LLUVIA DE UTILERÍA", line: "Se suelta la utilería del techo. Debajo de cada sombra conviene no estar." },
  corte: { name: "CORTE COMERCIAL", line: "Corte comercial. Todo el elenco quieto, y hay un cofre al otro lado del escenario." },
  sangre: { name: "EL PÚBLICO PIDE SANGRE", line: "El público pide sangre. Una sola especie en escena. Si el elenco sobrevive, habrá aplausos." },
};
export interface Plan { id: IntId; at: number }
export interface St { w: boolean; s: boolean; e: boolean; acc: number }
export const newSt = (): St => ({ w: false, s: false, e: false, acc: 0 });
/** Lo que el juego pone: aviso, arranque, cada cuadro (k = 0-1, entra y sale suave), repetición cada `cada_s`, fin. */
export interface Io { warn(id: IntId): void; start(id: IntId): void; frame(id: IntId, dt: number, k: number): void; pulse(id: IntId): void; end(id: IntId): void }

const R = () => BAL.ritmo;
/** Generador de la lluvia de utilería: misma (semilla, vuelta, escenario) = misma secuencia de posiciones. */
export const dropRng = (seed: number, loop: number, stage: number) => lcg((seed * 6007 + loop * 211 + stage * 31 + 7) % 2147483646 + 1);
/** Sorteo por semilla de la expedición, vuelta y escenario (generador local `lcg`: no toca el rng() de la partida). null = sin interrupción. */
export function planOf(seed: number, loop: number, stage: number, luna: boolean, quiet: boolean): Plan | null {
  if (quiet) return null;
  const u = lcg((seed * 7919 + loop * 131 + stage * 17 + 1) % 2147483646 + 1);
  const w = INT_IDS.map((id) => BAL.interrupciones[id][luna ? "peso_luna" : "peso_tierra"]);
  let x = u() * w.reduce((a, b) => a + b, 0), i = 0;
  while (i < w.length - 1 && (x -= w[i]) > 0) i++;
  const id = INT_IDS[i], d0 = R().interrupcion_desde_s, d1 = R().interrupcion_hasta_s;
  return { id, at: Math.max(d0 + BAL.interrupciones[id].aviso_s, d0 + u() * (d1 - d0)) };
}
/** Avanza con el reloj del escenario `t` (en pausa o con una decisión abierta no se llama: `abort` cierra lo que esté en curso). */
export function step(p: Plan, s: St, t: number, dt: number, io: Io, abort = false) {
  const d = BAL.interrupciones[p.id], fin = p.at + d.dura_s;
  if (s.e) return;
  if (abort) { if (s.s) { s.e = true; io.end(p.id); } return; }
  if (!s.w && t >= p.at - d.aviso_s) { s.w = true; io.warn(p.id); }
  if (t < p.at) return;
  if (!s.s) { s.s = true; io.start(p.id); }
  if (t < fin) {
    io.frame(p.id, dt, Math.min(1, t - p.at, (fin - t) / 1.5));
    if (d.cada_s && (s.acc += dt) >= d.cada_s) { s.acc -= d.cada_s; io.pulse(p.id); }
  } else { s.e = true; io.end(p.id); }
}
