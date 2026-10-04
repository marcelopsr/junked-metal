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
  soldadito: { name: "El Sargento Sin Pensión", pros: ["+10% daño", "+10 vida"], con: "-10% imán", cost: BAL.pilotos.soldadito.precio, lore: "Treinta años de servicio en la caja de juguetes y ni una medalla. Pelea por rencor.", start: BAL.pilotos.soldadito.arma_inicial as WeaponId,
    mod: modOf("soldadito") },
  muneca: { name: "La Divorciada de Trapo", pros: ["Regenera +1 vida/s", "+25% imán"], con: "-20 vida máxima", cost: BAL.pilotos.muneca.precio, lore: "Remendada tantas veces que ya nada la rompe. Se cura sola, como después del divorcio.", start: BAL.pilotos.muneca.arma_inicial as WeaponId,
    mod: modOf("muneca") },
  robot: { name: "El Robot en Crisis", pros: ["Arranca con Antena Tesla", "+12% blindaje"], con: "-8% velocidad", cost: BAL.pilotos.robot.precio, lore: "Lo programaron para servir y ahora se pregunta para qué. Mientras tanto, electrocuta.", start: BAL.pilotos.robot.arma_inicial as WeaponId,
    mod: modOf("robot") },
  dino: { name: "El Rex Jubilado", pros: ["+40 vida", "+25% peso al embestir"], con: "Armas 10% más lentas", cost: BAL.pilotos.dino.precio, lore: "Fue el terror de la juguetería; hoy le duele la cadera, pero sigue pesando una tonelada.", start: BAL.pilotos.dino.arma_inicial as WeaponId,
    ach: { txt: "Derrota a un minijefe", ok: (s) => ["rey", "cortadora", "tarantula"].some((a) => s.ach.includes(a)) },
    mod: modOf("dino") },
  figura: { name: "El Mega Macho", pros: ["+15% XP", "+6% velocidad", "Arranca con Petardos"], con: "Recibe 10% más daño", cost: BAL.pilotos.figura.precio, lore: "Músculos de plástico hueco y cero articulaciones. Aprende rápido porque no piensa demasiado.", start: BAL.pilotos.figura.arma_inicial as WeaponId,
    ach: { txt: "Sobrevive 10 minutos", ok: (s) => s.ach.includes("diez") },
    mod: modOf("figura") },
};

export const pilotStats = (st: PStats, id: PilotId) => { (PILOTS[id] ?? PILOTS.soldadito).mod(st); return st; };

/** Arsenal inicial (Taller → Arsenal, Garaje → Arma): Gomitas de serie y las armas base con fila arma_<id> en precios. Sin fusiones ni Lápiz-lanza (no dispara). */
export const ARSENAL: WeaponId[] = ["gomitas", ...Object.keys(BAL.precios).filter((k) => k.startsWith("arma_")).map((k) => k.slice(5) as WeaponId)];

/** Armas con las que arranca la partida: UNA inicial y, con la Caja de repuestos, otra al azar (de la semilla).
 *  La inicial es la elegida en el garaje (`pick`); con Gomitas (la de serie) arranca con la del piloto.
 *  ponytail: provisorio hasta que se decida si el arma propia del piloto (Robot, Mega Macho) se suma o se reemplaza. */
export function startWeapons(id: PilotId, extra: number, pick: WeaponId = "gomitas"): WeaponId[] {
  const w = [pick === "gomitas" ? (PILOTS[id] ?? PILOTS.soldadito).start : pick];
  if (extra > 0) {
    const pool = (Object.keys(WEAPONS) as WeaponId[]).filter((k) => k !== "lanza" && !w.includes(k));
    w.push(pool[Math.floor(rng() * pool.length)]);
  }
  return w;
}
