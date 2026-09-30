// Azar con semilla (mulberry32) para TODO lo que decide la partida: patio, apariciones, drops, cartas.
// Misma semilla + mismos controles = misma partida (reproducible y simulable a toda velocidad).
// Lo puramente visual (partículas, sacudida) sigue con Math.random: no afecta el resultado.
let s = 1;
export const seedRng = (n: number) => { s = n >>> 0 || 1; };
export function rng() {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const newSeed = () => (Math.random() * 2 ** 32) >>> 0;
