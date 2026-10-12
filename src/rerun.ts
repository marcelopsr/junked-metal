// Repetición mínima (T39): semilla + inputs por cuadro + cartas elegidas. Solo partida solitaria (sin ENCORE, red ni coop).
// Determinismo: main.ts avanza el mundo con paso manual (update(dt) + _step(dt), mismo orden que __sim) y graba el dt real de cada cuadro,
// así que la repetición reproduce exactamente la misma secuencia de pasos. El resto del azar de juego sale de rng.ts (semilla).
// ponytail: depende de que ninguna lógica de juego use Math.random() (solo efectos visuales); el garaje/mejoras del guardado se toman del
// momento de ver la repetición, no del de la partida; si cambian, puede divergir. Subir a repetición con snapshot del perfil si hace falta.
export type Inp = { throttle: number; steer: number; boost: boolean; drift: boolean; ability: boolean; jump: boolean; moveX: number; moveY: number; move: boolean };
const W = 6; // números por cuadro: dt, throttle, steer, bits, moveX, moveY
export const rec = { on: false, seed: 0, daily: false, f: [] as number[], cards: [] as number[], done: false };
export const rp = { on: false, i: 0, c: 0, x: 1 };

export function recStart(seed: number, daily: boolean) { Object.assign(rec, { on: true, seed, daily, f: [], cards: [], done: false }); }
export function recFrame(dt: number, n: Inp) {
  rec.f.push(dt, n.throttle, n.steer, +n.boost | (+n.drift << 1) | (+n.ability << 2) | (+n.jump << 3) | (+n.move << 4), n.moveX, n.moveY);
}
/** Cierra la grabación: queda disponible para "Ver repetición" si hubo partida. */
export function recStop() { rec.on = false; rec.done = rec.f.length > 0; }
export const frames = () => rec.f.length / W;
/** Pone en `n` los inputs del cuadro i y devuelve su dt (null si se acabó). */
export function replayFrame(i: number, n: Inp): number | null {
  const o = i * W, f = rec.f;
  if (o >= f.length) return null;
  const b = f[o + 3];
  Object.assign(n, { throttle: f[o + 1], steer: f[o + 2], boost: !!(b & 1), drift: !!(b & 2), ability: !!(b & 4), jump: !!(b & 8), move: !!(b & 16), moveX: f[o + 4], moveY: f[o + 5] });
  return f[o];
}
