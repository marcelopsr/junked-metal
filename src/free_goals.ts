// Paseo libre: objetivos por barrio (estilo Tony Hawk). Lógica pura (sin motor ni DOM), probada en test/free_goals.test.ts.
// Se guardan como ids en save.libre.metas; completar todos los de un barrio otorga el logro `barrio_*` (pintura del garaje, ver achievements.ts y menu/garage_paint.ts).
import type { DesafioId } from "./free_challenges";

export type BarrioId = "skate" | "parque" | "acuatico" | "nieve" | "obstaculos";
export const BARRIO_NOMBRE: Record<BarrioId, string> = { skate: "Skatepark", parque: "Parque", acuatico: "Parque acuático", nieve: "Bosque nevado", obstaculos: "Circuito de obstáculos" };
/** Centros (los mismos que zones/libre_*.ts): "en el barrio" = a menos de BARRIO_R metros. */
const CENTRO: Record<BarrioId, [number, number]> = { skate: [-150, 150], parque: [130, 51], acuatico: [152, 180], nieve: [-150, -150], obstaculos: [150, -150] };
const BARRIO_R = 130;
/** Logro (y pintura) que regala cada barrio completo. */
export const BARRIO_LOGRO = { skate: "barrio_skate", parque: "barrio_parque", acuatico: "barrio_acuatico", nieve: "barrio_nieve", obstaculos: "barrio_obstaculos" } as const;

/** Lo que el motor informa: un truco al aterrizar, la posición, las tuercas juntadas o un desafío terminado. */
export type MetaEv =
  | { k: "truco"; x: number; z: number; clean: boolean; dist: number; mult: number; yawDeg: number; flips: number }
  | { k: "pos"; x: number; z: number }
  | { k: "tuercas"; bits: string }
  | { k: "fin"; d: DesafioId; medalla: number };

export type Meta = { id: string; barrio: BarrioId; txt: string; ok: (e: MetaEv) => boolean };
const en = (b: BarrioId, e: { x: number; z: number }) => Math.hypot(e.x - CENTRO[b][0], e.z - CENTRO[b][1]) < BARRIO_R;
const cerca = (x: number, z: number, r: number) => (e: MetaEv) => e.k === "pos" && Math.hypot(e.x - x, e.z - z) < r;
/** Tuercas [a, b) de la lista fija de free_tricks.ts (NUTS): plaza 0-1, parque 2-4, skate 5-10, acuático 11-15, nieve 16-19, circuito 20-23. */
const tuercas = (a: number, b: number) => (e: MetaEv) => e.k === "tuercas" && !e.bits.slice(a, b).includes("0");
const salto = (b: BarrioId, m: number) => (e: MetaEv) => e.k === "truco" && e.clean && e.dist >= m && en(b, e);
const combo = (b: BarrioId, n: number) => (e: MetaEv) => e.k === "truco" && e.clean && e.mult >= n && en(b, e);
const desafio = (d: DesafioId, med: number) => (e: MetaEv) => e.k === "fin" && e.d === d && e.medalla >= med;

export const METAS: Meta[] = [
  { id: "skate_tuercas", barrio: "skate", txt: "Juntar las 6 tuercas del skatepark", ok: tuercas(5, 11) },
  { id: "skate_salto", barrio: "skate", txt: "Saltar 35 m en el skatepark", ok: salto("skate", 35) },
  { id: "skate_combo", barrio: "skate", txt: "Combo ×3 en el skatepark", ok: combo("skate", 3) },
  { id: "skate_bowl", barrio: "skate", txt: "Bajar al bowl chico escondido", ok: cerca(-45, 140, 9) },
  { id: "skate_plata", barrio: "skate", txt: "Terminar TRUCOS EN EL SKATEPARK con plata", ok: desafio("skate", 2) },
  { id: "parque_tuercas", barrio: "parque", txt: "Juntar las 3 tuercas del parque", ok: tuercas(2, 5) },
  { id: "parque_salto", barrio: "parque", txt: "Saltar 18 m en el parque", ok: salto("parque", 18) },
  { id: "parque_combo", barrio: "parque", txt: "Combo ×2 en el parque", ok: combo("parque", 2) },
  { id: "parque_puente", barrio: "parque", txt: "Cruzar el puente del laguito", ok: cerca(130, 51, 6) },
  { id: "parque_giro", barrio: "parque", txt: "Aterrizar limpio un giro completo", ok: (e) => e.k === "truco" && e.clean && e.yawDeg >= 330 && en("parque", e) },
  { id: "acuatico_tuercas", barrio: "acuatico", txt: "Juntar las 5 tuercas del parque acuático", ok: tuercas(11, 16) },
  { id: "acuatico_salto", barrio: "acuatico", txt: "Saltar 25 m en el parque acuático", ok: salto("acuatico", 25) },
  { id: "acuatico_combo", barrio: "acuatico", txt: "Combo ×2 en el parque acuático", ok: combo("acuatico", 2) },
  { id: "acuatico_pileta", barrio: "acuatico", txt: "Bajar a la pileta vacía escondida", ok: cerca(80, 232, 9) },
  { id: "acuatico_vuelta", barrio: "acuatico", txt: "Aterrizar limpio una vuelta de campana", ok: (e) => e.k === "truco" && e.clean && e.flips >= 1 && en("acuatico", e) },
  { id: "nieve_tuercas", barrio: "nieve", txt: "Juntar las 4 tuercas del bosque nevado", ok: tuercas(16, 20) },
  { id: "nieve_salto", barrio: "nieve", txt: "Saltar 25 m en el bosque nevado", ok: salto("nieve", 25) },
  { id: "nieve_combo", barrio: "nieve", txt: "Combo ×2 en el bosque nevado", ok: combo("nieve", 2) },
  { id: "nieve_mirador", barrio: "nieve", txt: "Subir al mirador de la cima", ok: cerca(-105, -218, 9) },
  { id: "nieve_plata", barrio: "nieve", txt: "Terminar BAJADA DE LA NIEVE con plata", ok: desafio("nieve", 2) },
  { id: "obstaculos_tuercas", barrio: "obstaculos", txt: "Juntar las 4 tuercas del circuito", ok: tuercas(20, 24) },
  { id: "obstaculos_tunel", barrio: "obstaculos", txt: "Atravesar el túnel de cartón", ok: cerca(160, -185, 6) },
  { id: "obstaculos_plata", barrio: "obstaculos", txt: "Terminar CONTRARRELOJ con plata", ok: desafio("obs", 2) },
  { id: "obstaculos_oro", barrio: "obstaculos", txt: "Terminar CONTRARRELOJ con oro", ok: desafio("obs", 3) },
];
export const META_IDS = METAS.map((m) => m.id);
export const BARRIOS = Object.keys(BARRIO_NOMBRE) as BarrioId[];

/** Aplica un evento: agrega a `hechas` las metas cumplidas y devuelve las nuevas. */
export function metasStep(hechas: string[], e: MetaEv): Meta[] {
  const nuevas = METAS.filter((m) => !hechas.includes(m.id) && m.ok(e));
  for (const m of nuevas) hechas.push(m.id);
  return nuevas;
}
/** ¿Todos los objetivos del barrio están hechos? */
export const barrioCompleto = (hechas: string[], b: BarrioId) => METAS.every((m) => m.barrio !== b || hechas.includes(m.id));
