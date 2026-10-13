// Lógica pura de los 6 comunes de ritmo medio (kamikaze, escudo, brincador, francotirador, divisor, ladrón): sin motor, probada en test/enemies_comunes.test.ts.
type P = { x: number; z: number };

/** ¿`from` está del lado de adelante del bicho? (fwd normalizado en el plano; minCos = coseno del medio ángulo del frente). */
export function inFront(fwd: P, pos: P, from: P, minCos: number) {
  const dx = from.x - pos.x, dz = from.z - pos.z, l = Math.hypot(dx, dz);
  return l > 1e-3 && (fwd.x * dx + fwd.z * dz) / l > minCos;
}

/** Pieza más cercana (por posición) dentro de `max` metros; -1 = ninguna. */
export function nearestIdx<T>(pos: P, items: T[], at: (t: T) => P, max: number) {
  let bi = -1, bd = max * max;
  for (let i = 0; i < items.length; i++) { const p = at(items[i]), d = (p.x - pos.x) ** 2 + (p.z - pos.z) ** 2; if (d < bd) { bd = d; bi = i; } }
  return bi;
}

/** Desplazamientos (x, z) de las `n` crías de un divisor, repartidas en círculo de radio r. */
export const splitSpots = (n: number, r: number): P[] => Array.from({ length: n }, (_, i) => ({ x: Math.cos((i / n) * Math.PI * 2 + 0.6) * r, z: Math.sin((i / n) * Math.PI * 2 + 0.6) * r }));
