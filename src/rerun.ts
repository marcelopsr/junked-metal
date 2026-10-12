// Repetición tipo película: 10 muestras por segundo de lo visible (auto, enemigos, HUD). No se re-simula nada: main.ts (rpPlay) solo mueve mallas.
// Muestra = [px,py,pz, qx,qy,qz,qw, tiempo, bajas, nivel, ...por enemigo: id, tipo, px,py,pz, qx,qy,qz,qw]. Solo partida solitaria (sin ENCORE, red ni coop).
import type { Enemy } from "./enemies";
export const DT = 0.1, HEAD = 10, STRIDE = 9;
// ponytail: tope 10 min (6000 muestras, unos pocos MB); pasado el tope se deja de grabar y la película cubre solo los primeros 10 min.
const MAX = 6000;
export const rec = { on: false, f: [] as number[][], done: false, acc: 0 };
export const rp = { on: false, t: 0, x: 1, en: new Map<number, Enemy>() };

export function recStart() { Object.assign(rec, { on: true, f: [], done: false, acc: DT }); }
/** Llamar cada cuadro de juego: llama a `take` 10 veces por segundo. */
export function recTick(dt: number, take: () => number[]) {
  for (rec.acc += dt; rec.acc >= DT && rec.f.length < MAX; rec.acc -= DT) rec.f.push(take());
}
/** Cierra la grabación: queda disponible para "Ver repetición" si hubo partida. */
export function recStop() { rec.on = false; rec.done = rec.f.length > 1; }
