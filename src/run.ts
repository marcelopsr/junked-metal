import type { Kind } from "./enemies";
import { rng } from "./rng";

// Perfil de una partida: todo sale de la semilla. Cada eje cambia cómo se VE y cómo se JUEGA,
// para que dos partidas nunca se sientan iguales aunque el patio sea reconocible.

export type Climate = { id: string; name: string; sun: [number, number, number]; sunColor: string; sunI: number; hemiI: number; sky: [string, string, string, string]; exposure: number; fog: number; ramp: [string, string, string] };
// Noches luminosas y días, todos con el mismo post retro. "ramp" = paleta del clima (sombra, medio, luz) que el post mezcla con el color.
export const CLIMATES: Climate[] = [
  { id: "noche", name: "NOCHE DE LUNA", sun: [-0.4, -1, 0.3], sunColor: "#7f9bd6", sunI: 2.25, hemiI: 0.7, sky: ["#04060c", "#0a101c", "#111a2a", "#05070a"], exposure: 1.1, fog: 0.01, ramp: ["#0b1020", "#3a5a70", "#e8e0c0"] },
  { id: "niebla", name: "NIEBLA", sun: [-0.3, -1, 0.3], sunColor: "#9fb5a6", sunI: 1.75, hemiI: 0.9, sky: ["#0c1311", "#1a2622", "#26332d", "#0a0f0d"], exposure: 1.15, fog: 0.022, ramp: ["#0f1a16", "#5a7a66", "#d8e8d0"] },
  { id: "farol", name: "FAROL ÁMBAR", sun: [0.6, -0.8, -0.3], sunColor: "#ff9b3d", sunI: 3.25, hemiI: 0.55, sky: ["#080504", "#1a0f08", "#2a1a0c", "#070402"], exposure: 1.1, fog: 0.013, ramp: ["#1a0c06", "#8a4a1a", "#ffd890"] },
  { id: "madrugada", name: "MADRUGADA", sun: [-0.7, -0.5, 0.4], sunColor: "#6fb3c4", sunI: 3, hemiI: 0.8, sky: ["#0a1822", "#1c3340", "#2e4a52", "#0a1210"], exposure: 1.1, fog: 0.015, ramp: ["#08161c", "#3a7a80", "#e0f4f0"] },
  { id: "manana", name: "MAÑANA", sun: [-0.7, -0.6, 0.4], sunColor: "#ffe2b8", sunI: 2.6, hemiI: 0.5, sky: ["#4a8fd8", "#b9dcff", "#fff1dc", "#7a8f5a"], exposure: 1, fog: 0.004, ramp: ["#1c2430", "#7a9a60", "#fff4dc"] },
  { id: "atardecer", name: "ATARDECER", sun: [0.85, -0.3, -0.35], sunColor: "#ffa060", sunI: 2.4, hemiI: 0.35, sky: ["#34407a", "#e58a5a", "#ffd08a", "#5a5a40"], exposure: 1.05, fog: 0.006, ramp: ["#2a1428", "#c06040", "#ffe0a0"] },
  { id: "nublado", name: "NUBLADO", sun: [-0.3, -1, 0.3], sunColor: "#e8ecf0", sunI: 1.2, hemiI: 0.9, sky: ["#8a96a3", "#b8c2cc", "#d7dde2", "#6f7a5c"], exposure: 1.1, fog: 0.008, ramp: ["#1a1e22", "#6a7a70", "#eef0f0"] },
];

// La partida va del atardecer (DUSK) a la noche de la semilla: anochece a mitad de partida y El Perro llega a medianoche.
export const DUSK = CLIMATES.find((c) => c.id === "atardecer")!;
export const NIGHTS = CLIMATES.filter((c) => ["noche", "niebla", "farol", "madrugada"].includes(c.id));
const lerp = (a: number, b: number, s: number) => a + (b - a) * s;
const lerpHex = (a: string, b: string, s: number) => {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  return "#" + [16, 8, 0].map((k) => Math.round(lerp((x >> k) & 255, (y >> k) & 255, s)).toString(16).padStart(2, "0")).join("");
};
export function mixClimate(a: Climate, b: Climate, s: number): Climate {
  return {
    ...b,
    sun: a.sun.map((v, i) => lerp(v, b.sun[i], s)) as Climate["sun"],
    sunColor: lerpHex(a.sunColor, b.sunColor, s), sunI: lerp(a.sunI, b.sunI, s), hemiI: lerp(a.hemiI, b.hemiI, s),
    sky: a.sky.map((c, i) => lerpHex(c, b.sky[i], s)) as Climate["sky"],
    exposure: lerp(a.exposure, b.exposure, s), fog: lerp(a.fog, b.fog, s),
    ramp: a.ramp.map((c, i) => lerpHex(c, b.ramp[i], s)) as Climate["ramp"],
  };
}
// Tramo del ciclo según el progreso 0..1 de la partida: atardecer hasta 20%, noche cerrada desde 65%
export const nightfall = (p: number) => { const x = Math.min(1, Math.max(0, (p - 0.2) / 0.45)); return x * x * (3 - 2 * x); };

// Plaga: cambia la mezcla de enemigos (multiplicador de peso) y adelanta la llegada de algunos (minuto)
export type Plague = { name: string; mult: Partial<Record<Kind, number>>; from: Partial<Record<Kind, number>> };
export const PLAGUES: Plague[] = [
  { name: "PLAGA DE HORMIGAS", mult: { hormiga: 1.6, friccion: 0.8 }, from: {} },
  { name: "INVASIÓN DE JUGUETES", mult: { friccion: 2, robot: 1.8, hormiga: 0.6 }, from: { robot: 0.8 } },
  { name: "LLUVIA DE ÁCIDO", mult: { escupidora: 2.4 }, from: { escupidora: 0.6 } },
  { name: "ESCARABAJOS TEMPRANOS", mult: { escarabajo: 1.5 }, from: { escarabajo: 2.5 } },
  { name: "PATIO MIXTO", mult: { hormiga: 0.8, friccion: 1.3, robot: 1.3, escupidora: 1.3 }, from: { robot: 1, escupidora: 1 } },
];

// Lluvia: modificador de clima que activan algunas semillas. DISEÑO: valores a decidir por el usuario.
export const RAIN = {
  chance: 0.25,       // fracción de semillas con lluvia
  from: [0.5, 0.7],   // empieza entre estas fracciones de la partida (0 = inicio, 1 = 10:00)
  grip: 0.8,          // multiplicador del agarre lateral con lluvia plena (1 = sin efecto; menos = el auto patina más)
  ramp: 0.4,          // 1/s: qué tan rápido sube la intensidad al empezar (0,4 = ~6 s)
  wetSecs: 60,        // segundos de lluvia hasta el suelo empapado y los charcos al máximo
};

export type Profile = { seed: number; climate: Climate; plague: Plague; minis: Kind[]; swarmEvery: number; ballEvery: number; chestEvery: number; rainAt: number };

// Los dos minijefes de la partida: 2 de 3 en orden, con UNA sola tirada (no corre el resto del perfil de la semilla)
const MINIS: Kind[] = ["rey", "cortadora", "tarantula"];
const pickMinis = (r: number): Kind[] => { const i = Math.floor(r * 6), a = i % 3; return [MINIS[a], MINIS[(a + 1 + (i >= 3 ? 1 : 0)) % 3]]; };

// Lluvia derivada de la semilla SIN gastar rng(): así el patio, la plaga y el resto de cada semilla existente no cambian.
// Un solo valor reparte ambas cosas: r < chance = llueve, y r/chance (uniforme) elige cuándo empieza. Infinity = no llueve.
const rainAt = (seed: number) => { const r = (seed * 0.6180339887) % 1; return r < RAIN.chance ? RAIN.from[0] + (r / RAIN.chance) * (RAIN.from[1] - RAIN.from[0]) : Infinity; };

export function makeProfile(seed: number): Profile {
  const pick = <T>(a: T[]) => a[Math.floor(rng() * a.length)];
  return {
    seed,
    climate: pick(NIGHTS),
    plague: pick(PLAGUES),
    minis: pickMinis(rng()),
    swarmEvery: 45 + rng() * 35,
    ballEvery: 60 + rng() * 45,
    chestEvery: 95 + rng() * 50,
    rainAt: rainAt(seed),
  };
}
