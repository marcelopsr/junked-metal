import type { Kind } from "./enemies";
import { rng } from "./rng";

// Perfil de una partida: todo sale de la semilla. Cada eje cambia cómo se VE y cómo se JUEGA,
// para que dos partidas nunca se sientan iguales aunque el patio sea reconocible.

export type Climate = { id: string; name: string; sun: [number, number, number]; sunColor: string; sunI: number; hemiI: number; sky: [string, string, string, string]; exposure: number };
export const CLIMATES: Climate[] = [
  { id: "manana", name: "MAÑANA", sun: [-0.7, -0.6, 0.4], sunColor: "#ffe2b8", sunI: 2.6, hemiI: 0.4, sky: ["#4a8fd8", "#b9dcff", "#fff1dc", "#7a8f5a"], exposure: 1.1 },
  { id: "mediodia", name: "MEDIODÍA", sun: [-0.25, -1, 0.2], sunColor: "#fff6e6", sunI: 3.4, hemiI: 0.35, sky: ["#3d8bd9", "#a8d4ff", "#f2f0e6", "#7a8f5a"], exposure: 1.05 },
  { id: "atardecer", name: "ATARDECER", sun: [0.85, -0.3, -0.35], sunColor: "#ffa060", sunI: 2.4, hemiI: 0.3, sky: ["#34407a", "#e58a5a", "#ffd08a", "#5a5a40"], exposure: 1.15 },
  { id: "nublado", name: "NUBLADO", sun: [-0.3, -1, 0.3], sunColor: "#e8ecf0", sunI: 1.1, hemiI: 0.9, sky: ["#8a96a3", "#b8c2cc", "#d7dde2", "#6f7a5c"], exposure: 1.2 },
];

// Plaga: cambia la mezcla de enemigos (multiplicador de peso) y adelanta la llegada de algunos (minuto)
export type Plague = { name: string; mult: Partial<Record<Kind, number>>; from: Partial<Record<Kind, number>> };
export const PLAGUES: Plague[] = [
  { name: "PLAGA DE HORMIGAS", mult: { hormiga: 1.6, friccion: 0.8 }, from: {} },
  { name: "INVASIÓN DE JUGUETES", mult: { friccion: 2, robot: 1.8, hormiga: 0.6 }, from: { robot: 0.8 } },
  { name: "LLUVIA DE ÁCIDO", mult: { escupidora: 2.4 }, from: { escupidora: 0.6 } },
  { name: "ESCARABAJOS TEMPRANOS", mult: { escarabajo: 1.5 }, from: { escarabajo: 2.5 } },
  { name: "PATIO MIXTO", mult: { hormiga: 0.8, friccion: 1.3, robot: 1.3, escupidora: 1.3 }, from: { robot: 1, escupidora: 1 } },
];

export type Profile = { seed: number; climate: Climate; plague: Plague; minis: Kind[]; swarmEvery: number; ballEvery: number; chestEvery: number };

export function makeProfile(seed: number): Profile {
  const pick = <T>(a: T[]) => a[Math.floor(rng() * a.length)];
  return {
    seed,
    climate: pick(CLIMATES),
    plague: pick(PLAGUES),
    minis: rng() < 0.5 ? ["rey", "cortadora"] : ["cortadora", "rey"],
    swarmEvery: 45 + rng() * 35,
    ballEvery: 60 + rng() * 45,
    chestEvery: 95 + rng() * 50,
  };
}
