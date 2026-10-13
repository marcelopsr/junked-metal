// Genes de los autos: la geometría de cada carrocería como parámetros con rango (diseño generativo, ver docs/EVO_VEHICULOS.md).
// `def` = el número que estaba escrito a mano en el modelo: el genoma por defecto reproduce el auto original tal cual.
// Los rangos son los límites de mutación (`npm run evo` no sale de ellos) y se eligieron para no romper la identidad ni las anclas
// del garaje (asiento, alerón, calcos). `car_genes.json` guarda el genoma elegido por auto (lo escribe `npm run evo -- --export`).
import chosen from "./car_genes.json";

export type Gene = { id: string; comp: string; min: number; max: number; def: number; int?: boolean };
export type Genome = Record<string, number>;

const g = (comp: string, id: string, def: number, min: number, max: number, int = false): Gene => ({ id, comp, def, min, max, ...(int ? { int } : {}) });

// Ruedas de los autos que no son el buggy: multiplicadores sobre las anclas de carModel (1 = original)
// Evaluador visual (monster, fórmula): achicar ruedas o meterlas rompe el juguete RC en todos los autos → rueda_k ≥ 1, trocha_k ≥ 0,97
const RUEDAS = [g("ruedas", "rueda_k", 1, 1, 1.15), g("ruedas", "trocha_k", 1, 0.97, 1.06), g("ruedas", "batalla_k", 1, 0.9, 1.1)];

export const GENES: Record<string, Gene[]> = {
  buggy: [
    g("chasis", "stance", 0, -0.06, 0.08), // altura de toda la carrocería sobre el eje
    g("chasis", "piso_largo", 2.0, 1.7, 2.15),
    g("chasis", "chasis_alto", 0.06, 0.06, 0.22), // piso con volumen (bandeja) en vez de tabla
    g("carroceria", "tina_ancho", 0.82, 0.74, 0.95), // más angosta deja huecos con la trocha (ronda 1)
    g("carroceria", "tina_alto", 0.26, 0.18, 0.36),
    g("carroceria", "tina_largo", 1.5, 1.2, 1.7),
    g("carroceria", "tina_z", -0.05, -0.2, 0.1),
    g("capo", "trompa_largo", 0.56, 0.4, 0.75),
    g("capo", "trompa_incl", 0.3, 0.08, 0.6),
    g("capo", "trompa_ancho", 0.72, 0.55, 0.86),
    g("cabina", "jaula_alto", 0.98, 0.82, 1.1),
    g("cabina", "jaula_frente", 0.82, 0.68, 1.0),
    g("cabina", "jaula_ancho", 0.36, 0.32, 0.44), // angosta se hunde en la bañera (ronda 1)
    g("cabina", "jaula_rake", 0.1, 0, 0.25),
    g("motor", "motor_alto", 0.22, 0.18, 0.34), // motor y rejilla se leen desde la cámara de partida (atrás)
    g("motor", "motor_z", -0.62, -0.76, -0.5),
    g("motor", "motor_ancho", 0.62, 0.5, 0.8), // ronda 2: desde atrás el motor y la rejilla no se distinguen
    g("escapes", "escape_largo", 0.3, 0.2, 0.46),
    g("escapes", "escape_d", 0.07, 0.05, 0.11),
    g("escapes", "escape_alza", 0, -0.08, 0.25), // cuánto suben las bocas (0 = horizontales)
    g("guardabarros", "guarda_radio", 0.47, 0.44, 0.72),
    g("guardabarros", "guarda_ancho", 0.4, 0.3, 0.48),
    g("guardabarros", "guarda_arco", 0.75, 0.5, 1.05),
    g("suspension", "amort_grosor", 0.06, 0.04, 0.09),
    g("ruedas", "rueda_d", 0.8, 0.7, 1.1), // juguete RC exagerado (ciclo estructural): hasta +38 %
    g("ruedas", "rueda_w", 0.36, 0.3, 0.44),
    g("ruedas", "trocha", 0.72, 0.66, 0.82),
    g("ruedas", "batalla", 0.72, 0.62, 0.84),
    g("faros", "faro_ancho", 0.1, 0.07, 0.16),
    g("faros", "faro_x", 0.24, 0.16, 0.3),
    g("paragolpes", "paragolpe_ancho", 1.0, 0.8, 1.12),
    g("aleron", "aleron_alto", 0.9, 0.78, 0.95), // ronda 1 de evaluación visual: el alerón grande se lee como techo flotante → rangos hacia más chico
    g("aleron", "aleron_cuerda", 0.38, 0.26, 0.42),
    g("aleron", "aleron_incl", 0.12, 0, 0.3),
    g("aleron", "aleron_ancho", 1.35, 1.05, 1.4),
    g("aleron", "aleron_soporte", 0.05, 0.05, 0.14), // soportes más gruesos: que el alerón no se lea flotando
  ],
  monster: [
    g("chasis", "chasis_alto", 0.14, 0.14, 0.4), // chasis que baja hacia los ejes: la caja no queda despegada
    g("carroceria", "caja_y", 0.62, 0.55, 0.75),
    g("carroceria", "caja_ancho", 1.15, 1.0, 1.3),
    g("carroceria", "caja_alto", 0.36, 0.28, 0.46),
    g("carroceria", "caja_largo", 2.1, 1.9, 2.25),
    g("cabina", "cabina_ancho", 1.0, 0.85, 1.1),
    g("cabina", "cabina_alto", 0.36, 0.28, 0.48),
    g("cabina", "cabina_largo", 1.0, 0.8, 1.2),
    g("cabina", "cabina_z", -0.2, -0.4, 0),
    g("suspension", "amort_grosor", 0.09, 0.06, 0.13),
    g("paragolpes", "paragolpe_ancho", 1.3, 1.1, 1.45),
    ...RUEDAS.map((x) => (x.id === "rueda_k" ? { ...x, max: 1.4 } : x)), // juguete RC exagerado: ruedas hasta +40 %
  ],
  formula: [
    g("capo", "trompa_ancho", 0.5, 0.36, 0.6),
    g("capo", "trompa_largo", 1.2, 1.0, 1.4),
    g("capo", "trompa_alto", 0.16, 0.12, 0.22),
    g("carroceria", "cuerpo_ancho", 0.8, 0.66, 0.9),
    g("carroceria", "cuerpo_alto", 0.24, 0.18, 0.265), // techo +10 %: alto deja de ser fórmula (evaluador)
    g("pontones", "ponton_ancho", 0.28, 0.2, 0.36),
    g("pontones", "ponton_largo", 0.8, 0.6, 1.0),
    g("tomas", "toma_alto", 0.2, 0.14, 0.34),
    g("aleron", "aleron_del_ancho", 1.4, 1.15, 1.5),
    ...RUEDAS,
  ],
  tanque: [ // orugas fijas (sin genes de rueda): las ruedas de rodaje no se ven y la oruga es casco
    g("orugas", "oruga_alto", 0.42, 0.38, 0.5), // pisos del evaluador: orugas, torreta y cañón son la identidad
    g("carroceria", "casco_ancho", 1.1, 0.95, 1.2),
    g("carroceria", "casco_alto", 0.32, 0.26, 0.4),
    g("torreta", "torreta_ancho", 0.9, 0.9, 1.05),
    g("torreta", "torreta_alto", 0.3, 0.24, 0.4),
    g("torreta", "torreta_largo", 0.9, 0.81, 1.05),
    g("canon", "canon_largo", 1.1, 0.8, 1.4),
    g("canon", "canon_d", 0.13, 0.1, 0.18),
  ],
  carrera: [
    g("carroceria", "cuerpo_ancho", 0.8, 0.7, 0.9),
    g("carroceria", "cuerpo_alto", 0.22, 0.18, 0.28),
    g("carroceria", "cuerpo_largo", 2.0, 1.8, 2.1),
    g("cabina", "cabina_ancho", 0.62, 0.5, 0.72),
    g("cabina", "cabina_alto", 0.18, 0.14, 0.26),
    g("cabina", "cabina_largo", 0.7, 0.55, 0.9),
    g("cabina", "cabina_z", -0.25, -0.4, -0.1),
    ...RUEDAS,
  ],
  axel: [
    g("cabina", "cabina_ancho", 0.9, 0.78, 1.0),
    g("cabina", "cabina_alto", 0.3, 0.24, 0.4),
    g("cabina", "cabina_largo", 1.2, 1.0, 1.4),
    g("cabina", "jaula_alto", 0.76, 0.6, 0.9),
    g("ruedas", "tapa_d", 0.5, 0.4, 0.7),
    ...RUEDAS.filter((x) => x.id !== "batalla_k"), // un solo eje
  ],
  helado: [
    g("carroceria", "caja_alto", 0.95, 0.8, 1.05),
    g("carroceria", "caja_largo", 1.45, 1.25, 1.6),
    g("cabina", "cabina_alto", 0.34, 0.26, 0.44),
    g("accesorios", "toldo_ancho", 0.22, 0.14, 0.34),
    g("accesorios", "cucurucho", 1, 1.1, 1.35), // escala del cucurucho del techo: su identidad (piso elevado a 1.1 para consolidar tamaño)
    ...RUEDAS,
  ],
  combi: [
    g("carroceria", "cuerpo_ancho", 1.08, 0.95, 1.25),
    g("carroceria", "cuerpo_alto", 0.5, 0.38, 0.62),
    g("carroceria", "cuerpo_largo", 2.3, 2.0, 2.5),
    g("cabina", "techo_alto", 0.42, 0.32, 0.54),
    g("accesorios", "v_escala", 1.0, 0.8, 1.3),
    ...RUEDAS,
  ],
};

let override: Record<string, Genome> = {}; // solo la sonda de evolución (evo_probe.ts) lo usa: prueba genomas sin tocar el JSON

/** Genoma vigente de un auto: def ← elegido en car_genes.json ← override de la sonda. Vacío si el auto aún no tiene genes. */
export function genome(kind: string): Genome {
  const spec = GENES[kind];
  if (!spec) return {};
  const out: Genome = {};
  const pick = (chosen as Record<string, { g?: Genome }>)[kind]?.g ?? {};
  for (const x of spec) out[x.id] = override[kind]?.[x.id] ?? pick[x.id] ?? x.def;
  return out;
}
export const original = (kind: string): Genome => Object.fromEntries((GENES[kind] ?? []).map((x) => [x.id, x.def]));
export const setGenomeOverride = (kind: string, g: Genome | null) => { if (g) override[kind] = g; else delete override[kind]; };
