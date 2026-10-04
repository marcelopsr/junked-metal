// Pilotos: figuritas de juguete con ventajas y una contra. Se eligen en el garaje y se aplican sobre las stats
// de la partida (main.ts: recompute). El modelo vive en models.ts (pilotParts).
import { rng } from "./rng";
import { WEAPONS, type PStats, type WeaponId } from "./weapons";
import { BAL } from "./balance";

export type PilotId = "soldadito" | "muneca" | "robot" | "dino" | "figura";
type Rec = { ach: string[] }; // logros del guardado (achievements.ts)
// Modificadores de cada piloto: columnas de la tabla pilotos de balance.json (neutros: multiplicadores en 1 y sumas en 0)
const modOf = (id: PilotId) => (st: PStats) => {
  const p = BAL.pilotos[id];
  st.dmg *= p.dano_mult; st.maxHp += p.vida_mas; st.magnet *= p.iman_mult; st.regen += p.regen_mas;
  if (p.blindaje_mult !== 1) st.armor = 1 - (1 - st.armor) * p.blindaje_mult; // sin esta guarda, 1 - (1 - x) cambiaría el último decimal
  st.armor += p.blindaje_mas; st.speedMul *= p.velocidad_mult; st.mass *= p.peso_mult; st.cooldown *= p.recarga_mult; st.xp *= p.xp_mult;
};
export const PILOTS: Record<PilotId, { name: string; pros: string[]; con: string; cost: number; lore: string; ach?: { txt: string; ok: (s: Rec) => boolean }; start: WeaponId; mod: (st: PStats) => void }> = {
  soldadito: { name: "Soldadito de plástico", pros: ["+10% daño", "+10 vida"], con: "-10% imán", cost: BAL.pilotos.soldadito.precio, lore: "Veterano de la caja de juguetes. Perdió el fusil en la alfombra, nunca la actitud.", start: BAL.pilotos.soldadito.arma_inicial as WeaponId,
    mod: modOf("soldadito") },
  muneca: { name: "Muñeca de trapo", pros: ["Regenera +1 vida/s", "+25% imán"], con: "-20 vida máxima", cost: BAL.pilotos.muneca.precio, lore: "Remendada tantas veces que ya no le teme a nada. Cada costura es una anécdota.", start: BAL.pilotos.muneca.arma_inicial as WeaponId,
    mod: modOf("muneca") },
  robot: { name: "Robot de lata", pros: ["Arranca con Antena Tesla", "+12% blindaje"], con: "-8% velocidad", cost: BAL.pilotos.robot.precio, lore: "Funciona con dos pilas y un rencor enorme contra el control remoto de la tele.", start: BAL.pilotos.robot.arma_inicial as WeaponId,
    mod: modOf("robot") },
  dino: { name: "Dinosaurio", pros: ["+40 vida", "+25% peso al embestir"], con: "Armas 10% más lentas", cost: BAL.pilotos.dino.precio, lore: "Extinto en el resto del mundo, vigente en este patio. Ruge con efectos de sonido incluidos.", start: BAL.pilotos.dino.arma_inicial as WeaponId,
    ach: { txt: "Derrota a un minijefe", ok: (s) => ["rey", "cortadora", "tarantula"].some((a) => s.ach.includes(a)) },
    mod: modOf("dino") },
  figura: { name: "Figura de acción", pros: ["+15% XP", "+6% velocidad", "Arranca con Petardos"], con: "Recibe 10% más daño", cost: BAL.pilotos.figura.precio, lore: "Doce puntos de articulación y una frase de combate grabada que solo dice cuando nadie escucha.", start: BAL.pilotos.figura.arma_inicial as WeaponId,
    ach: { txt: "Sobrevive 10 minutos", ok: (s) => s.ach.includes("diez") },
    mod: modOf("figura") },
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
