// Balance del juego: todos los números salen de balance.json, que se sincroniza con la planilla (scripts/balance-xlsx.mjs y
// scripts/balance-import.mjs; ver "Balance" en CLAUDE.md). Acá solo se lo expone tipado: BAL.enemigos.hormiga.vida, BAL.ritmo.dureza_vida.
import raw from "./balance.json";

// Pedir una fila o columna que no existe es un error de código o de planilla: tira en el acto (si no, sería un NaN silencioso).
const guard = <T extends object>(name: string, o: T): T =>
  new Proxy(o, { get: (t, k) => { if (typeof k === "string" && !(k in t)) throw new Error(`balance.json: no existe "${k}" en ${name}`); return (t as Record<string | symbol, unknown>)[k]; } });
// Tabla con forma de planilla: [{ id, ...columnas }] -> { id: fila }
const tab = <R extends { id: string }>(name: string, rows: R[]) => guard(name, Object.fromEntries(rows.map((r) => [r.id, guard(`${name}.${r.id}`, r)]))) as Record<string, R>;
// Tabla de dos columnas [{ id, valor, descripcion }] -> { id: valor }
const lista = (name: string, rows: { id: string; valor: number }[]) => guard(name, Object.fromEntries(rows.map((r) => [r.id, r.valor]))) as Record<string, number>;

export const BAL = {
  enemigos: tab("enemigos", raw.enemigos),
  armas: tab("armas", raw.armas),
  armasExtra: lista("armas_extra", raw.armas_extra),
  pasivas: tab("pasivas", raw.pasivas),
  ritmo: lista("ritmo", raw.ritmo),
  ataques: lista("ataques", raw.ataques),
  autos: tab("autos", raw.autos),
  pilotos: tab("pilotos", raw.pilotos),
  precios: tab("precios", raw.precios),
  plagas: raw.plagas,
};

// Precio de cada nivel de una mejora (el largo es el nivel máximo): las columnas nivel1..nivel10 en 0 no existen
export const costos = (id: string): number[] => {
  const r = BAL.precios[id] as unknown as Record<string, number>;
  return Array.from({ length: 10 }, (_, i) => r["nivel" + (i + 1)]).filter((c) => c > 0);
};
// Precio de una sola compra (zona, pieza)
export const precio = (id: string) => BAL.precios[id].nivel1;

// Experiencia para pasar de `l` al nivel siguiente (ritmo.xp_nivel_*): piso(base + l × lineal + l² × cuad)
export const xpNeed = (l: number) => Math.floor(BAL.ritmo.xp_nivel_base + l * BAL.ritmo.xp_nivel_lineal + l * l * BAL.ritmo.xp_nivel_cuad);
