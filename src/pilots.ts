// Pilotos: figuritas de juguete con ventajas y una contra. Se eligen en el garaje y se aplican sobre las stats
// de la partida (main.ts: recompute). El modelo vive en models.ts (pilotParts).
import { rng } from "./rng";
import { WEAPONS, type PStats, type WeaponId } from "./weapons";

export type PilotId = "soldadito" | "muneca" | "robot" | "dino" | "figura";
type Rec = { ach: string[] }; // logros del guardado (achievements.ts)
export const PILOTS: Record<PilotId, { name: string; pros: string[]; con: string; cost: number; lore: string; ach?: { txt: string; ok: (s: Rec) => boolean }; start: WeaponId; mod: (st: PStats) => void }> = {
  soldadito: { name: "Soldadito de plástico", pros: ["+10% daño", "+10 vida"], con: "-10% imán", cost: 0, lore: "Veterano de la caja de juguetes. Perdió el fusil en la alfombra, nunca la actitud.", start: "gomitas",
    mod: (st) => { st.dmg *= 1.1; st.maxHp += 10; st.magnet *= 0.9; } },
  muneca: { name: "Muñeca de trapo", pros: ["Regenera +1 vida/s", "+25% imán"], con: "-20 vida máxima", cost: 450, lore: "Remendada tantas veces que ya no le teme a nada. Cada costura es una anécdota.", start: "gomitas",
    mod: (st) => { st.regen += 1; st.magnet *= 1.25; st.maxHp -= 20; } },
  robot: { name: "Robot de lata", pros: ["Arranca con Antena Tesla", "+12% blindaje"], con: "-8% velocidad", cost: 650, lore: "Funciona con dos pilas y un rencor enorme contra el control remoto de la tele.", start: "tesla",
    mod: (st) => { st.armor = 1 - (1 - st.armor) * 0.88; st.speedMul *= 0.92; } },
  dino: { name: "Dinosaurio", pros: ["+40 vida", "+25% peso al embestir"], con: "Armas 10% más lentas", cost: 0, lore: "Extinto en el resto del mundo, vigente en este patio. Ruge con efectos de sonido incluidos.", start: "gomitas",
    ach: { txt: "Derrota a un minijefe", ok: (s) => ["rey", "cortadora", "tarantula"].some((a) => s.ach.includes(a)) },
    mod: (st) => { st.maxHp += 40; st.mass *= 1.25; st.cooldown *= 1.1; } },
  figura: { name: "Figura de acción", pros: ["+15% XP", "+6% velocidad", "Arranca con Petardos"], con: "Recibe 10% más daño", cost: 0, lore: "Doce puntos de articulación y una frase de combate grabada que solo dice cuando nadie escucha.", start: "petardos",
    ach: { txt: "Sobrevive 10 minutos", ok: (s) => s.ach.includes("diez") },
    mod: (st) => { st.xp *= 1.15; st.speedMul *= 1.06; st.armor -= 0.1; } },
};

export const pilotStats = (st: PStats, id: PilotId) => { (PILOTS[id] ?? PILOTS.soldadito).mod(st); return st; };

/** Armas con las que arranca la partida: la del piloto y, con la Caja de repuestos, otra al azar (de la semilla). */
export function startWeapons(id: PilotId, extra: number): WeaponId[] {
  const w = [(PILOTS[id] ?? PILOTS.soldadito).start];
  if (extra > 0) {
    const pool = (Object.keys(WEAPONS) as WeaponId[]).filter((k) => k !== "lanza" && !w.includes(k));
    w.push(pool[Math.floor(rng() * pool.length)]);
  }
  return w;
}
