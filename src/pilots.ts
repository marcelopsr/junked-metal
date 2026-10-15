// Pilotos: figuritas de juguete con ventajas y una contra. Se eligen en el garaje y se aplican sobre las stats
// de la partida (main.ts: recompute). El modelo vive en models.ts (pilotParts).
import { rng } from "./rng";
import { WEAPONS, type PStats, type WeaponId } from "./weapons";
import { BAL } from "./balance";
import type { AbilityId } from "./abilities";

export type PilotId = "soldadito" | "muneca" | "robot" | "dino" | "figura" | "abuela" | "astronauta" | "dinogoma" | "rusa" | "pirata" | "caballero" | "bombero" | "osito" | "mecanica" | "cocinero" | "mago" | "fantasma" | "doble";
type Rec = { ach: string[] }; // logros del guardado (achievements.ts)
// Modificadores de cada piloto: columnas de la tabla pilotos de balance.json (neutros: multiplicadores en 1 y sumas en 0)
const modOf = (id: PilotId) => (st: PStats) => {
  const p = BAL.pilotos[id];
  st.dmg *= p.dano_mult; st.maxHp += p.vida_mas; st.magnet *= p.iman_mult; st.regen += p.regen_mas;
  if (p.blindaje_mult !== 1) st.armor = 1 - (1 - st.armor) * p.blindaje_mult; // sin esta guarda, 1 - (1 - x) cambiaría el último decimal
  st.armor += p.blindaje_mas; st.speedMul *= p.velocidad_mult; st.mass *= p.peso_mult; st.cooldown *= p.recarga_mult; st.xp *= p.xp_mult;
};
export const PILOTS: Record<PilotId, { name: string; pros: string[]; con: string; cost: number; lore: string; abil: AbilityId; abilTxt: string; ach?: { txt: string; ok: (s: Rec) => boolean }; start: WeaponId; mod: (st: PStats) => void }> = {
  soldadito: { name: "El Sargento Sin Pensión", pros: ["+10% daño", "+10 vida"], con: "-10% imán", cost: BAL.pilotos.soldadito.precio, lore: "Treinta años de servicio en la caja de juguetes y ni una medalla. Pelea por rencor.", start: BAL.pilotos.soldadito.arma_inicial as WeaponId, abil: BAL.pilotos.soldadito.habilidad as AbilityId, abilTxt: BAL.pilotos.soldadito.habilidad_txt,
    mod: modOf("soldadito") },
  muneca: { name: "La Divorciada de Trapo", pros: ["Regenera +1 vida/s", "+25% imán"], con: "-20 vida máxima", cost: BAL.pilotos.muneca.precio, lore: "Remendada tantas veces que ya nada la rompe. Se cura sola, como después del divorcio.", start: BAL.pilotos.muneca.arma_inicial as WeaponId, abil: BAL.pilotos.muneca.habilidad as AbilityId, abilTxt: BAL.pilotos.muneca.habilidad_txt,
    mod: modOf("muneca") },
  robot: { name: "El Robot en Crisis", pros: ["Arranca con Antena Tesla", "+12% blindaje"], con: "-8% velocidad", cost: BAL.pilotos.robot.precio, lore: "Lo programaron para servir y ahora se pregunta para qué. Mientras tanto, electrocuta.", start: BAL.pilotos.robot.arma_inicial as WeaponId, abil: BAL.pilotos.robot.habilidad as AbilityId, abilTxt: BAL.pilotos.robot.habilidad_txt,
    mod: modOf("robot") },
  dino: { name: "El Rex Jubilado", pros: ["+40 vida", "+25% peso al embestir"], con: "Armas 10% más lentas", cost: BAL.pilotos.dino.precio, lore: "Fue el terror de la juguetería; hoy le duele la cadera, pero sigue pesando una tonelada.", start: BAL.pilotos.dino.arma_inicial as WeaponId, abil: BAL.pilotos.dino.habilidad as AbilityId, abilTxt: BAL.pilotos.dino.habilidad_txt,
    ach: { txt: "Derrota a un minijefe", ok: (s) => ["rey", "cortadora", "tarantula"].some((a) => s.ach.includes(a)) },
    mod: modOf("dino") },
  figura: { name: "El Mega Macho", pros: ["+15% XP", "+6% velocidad", "Arranca con Petardos"], con: "Recibe 10% más daño", cost: BAL.pilotos.figura.precio, lore: "Músculos de plástico hueco y cero articulaciones. Aprende rápido porque no piensa demasiado.", start: BAL.pilotos.figura.arma_inicial as WeaponId, abil: BAL.pilotos.figura.habilidad as AbilityId, abilTxt: BAL.pilotos.figura.habilidad_txt,
    ach: { txt: "Sobrevive 10 minutos", ok: (s) => s.ach.includes("diez") },
    mod: modOf("figura") },
  abuela: { name: "La Abuela de Porcelana", pros: ["+12% blindaje"], con: "-15 vida máxima y -5% velocidad", cost: BAL.pilotos.abuela.precio, lore: "Heredada de la vitrina, con una grieta por cada nieto. Pega como si la fueran a desheredar.", start: BAL.pilotos.abuela.arma_inicial as WeaponId, abil: BAL.pilotos.abuela.habilidad as AbilityId, abilTxt: BAL.pilotos.abuela.habilidad_txt,
    mod: modOf("abuela") },
  astronauta: { name: "El Astronauta de Plástico", pros: ["+30% imán", "+8% velocidad"], con: "-10 vida máxima", cost: BAL.pilotos.astronauta.precio, lore: "Prometieron la Luna y le dieron el patio. Recoge tornillos como quien junta polvo estelar.", start: BAL.pilotos.astronauta.arma_inicial as WeaponId, abil: BAL.pilotos.astronauta.habilidad as AbilityId, abilTxt: BAL.pilotos.astronauta.habilidad_txt,
    mod: modOf("astronauta") },
  dinogoma: { name: "El Dinosaurio de Goma Mordida", pros: ["+20% daño"], con: "Armas 10% más lentas", cost: BAL.pilotos.dinogoma.precio, lore: "Juguete de perro retirado con honores. Chilla al morder y nadie le discute el hueso.", start: BAL.pilotos.dinogoma.arma_inicial as WeaponId, abil: BAL.pilotos.dinogoma.habilidad as AbilityId, abilTxt: BAL.pilotos.dinogoma.habilidad_txt,
    ach: { txt: "Derrota a Eulalio el michu", ok: (s) => s.ach.includes("gato") },
    mod: modOf("dinogoma") },
  rusa: { name: "La Muñeca Rusa Desconfiada", pros: ["+25 vida", "+15% peso al embestir", "+10% XP"], con: "-10% daño y -5% velocidad", cost: BAL.pilotos.rusa.precio, lore: "Dentro de cada muñeca hay otra muñeca que tampoco se fía de ti. Aprende de todas.", start: BAL.pilotos.rusa.arma_inicial as WeaponId, abil: BAL.pilotos.rusa.habilidad as AbilityId, abilTxt: BAL.pilotos.rusa.habilidad_txt,
    mod: modOf("rusa") },
  pirata: { name: "El Pirata de Bañera", pros: ["+15 vida", "+15% imán", "+5% daño", "Arranca con Pistola de agua"], con: "-4% velocidad", cost: BAL.pilotos.pirata.precio, lore: "Naufragó en cada baño de espuma de la casa. Ahora busca tesoros entre las tuercas.", start: BAL.pilotos.pirata.arma_inicial as WeaponId, abil: BAL.pilotos.pirata.habilidad as AbilityId, abilTxt: BAL.pilotos.pirata.habilidad_txt,
    mod: modOf("pirata") },
  caballero: { name: "El Caballero de Lata Oxidada", pros: ["+15% blindaje", "+20 vida", "+20% peso al embestir"], con: "-10% velocidad", cost: BAL.pilotos.caballero.precio, lore: "Juró defender el castillo de cartón. El castillo se mojó; el juramento sigue en pie.", start: BAL.pilotos.caballero.arma_inicial as WeaponId, abil: BAL.pilotos.caballero.habilidad as AbilityId, abilTxt: BAL.pilotos.caballero.habilidad_txt,
    mod: modOf("caballero") },
  bombero: { name: "El Bombero Sin Manguera", pros: ["Armas 8% más rápidas", "Regenera +0,5 vida/s", "+5% velocidad"], con: "Sin ventajas de vida", cost: BAL.pilotos.bombero.precio, lore: "Perdió la manguera en una mudanza. Apaga los problemas a bengalazos.", start: BAL.pilotos.bombero.arma_inicial as WeaponId, abil: BAL.pilotos.bombero.habilidad as AbilityId, abilTxt: BAL.pilotos.bombero.habilidad_txt,
    mod: modOf("bombero") },
  osito: { name: "El Osito Prestado", pros: ["+60 vida", "+10% peso al embestir"], con: "-10% velocidad", cost: BAL.pilotos.osito.precio, lore: "Cosido a mano por una abuela y prestado sin permiso. Aguanta todo, menos que lo suelten.", start: BAL.pilotos.osito.arma_inicial as WeaponId, abil: BAL.pilotos.osito.habilidad as AbilityId, abilTxt: BAL.pilotos.osito.habilidad_txt,
    mod: modOf("osito") },
  mecanica: { name: "La Mecánica Sin Taller", pros: ["Regenera +1,5 vida/s", "Arranca con Tuercas"], con: "-10 vida máxima", cost: BAL.pilotos.mecanica.precio, lore: "Le quitaron el taller, no la llave inglesa. Arregla el auto mientras lo destroza.", start: BAL.pilotos.mecanica.arma_inicial as WeaponId, abil: BAL.pilotos.mecanica.habilidad as AbilityId, abilTxt: BAL.pilotos.mecanica.habilidad_txt,
    mod: modOf("mecanica") },
  cocinero: { name: "El Cocinero de Tornillos", pros: ["+60% imán", "Arranca con Chapitas"], con: "-10 vida máxima", cost: BAL.pilotos.cocinero.precio, lore: "Cree que los tornillos son fideos. Los junta con una cuchara gigante.", start: BAL.pilotos.cocinero.arma_inicial as WeaponId, abil: BAL.pilotos.cocinero.habilidad as AbilityId, abilTxt: BAL.pilotos.cocinero.habilidad_txt,
    mod: modOf("cocinero") },
  mago: { name: "El Mago de Cartón", pros: ["+15% daño", "Arranca con Confeti"], con: "-15 vida máxima y armas 8% más lentas", cost: BAL.pilotos.mago.precio, lore: "Su truco estrella es hacer desaparecer el sueldo. El confeti no explota, pero casi.", start: BAL.pilotos.mago.arma_inicial as WeaponId, abil: BAL.pilotos.mago.habilidad as AbilityId, abilTxt: BAL.pilotos.mago.habilidad_txt,
    mod: modOf("mago") },
  fantasma: { name: "El Fantasma de Sábana", pros: ["+10% velocidad", "+10% blindaje", "Arranca con Burbujas"], con: "-20 vida máxima", cost: BAL.pilotos.fantasma.precio, lore: "Una sábana con dos agujeros y mucho rencor. Los golpes le pasan de largo, casi siempre.", start: BAL.pilotos.fantasma.arma_inicial as WeaponId, abil: BAL.pilotos.fantasma.habilidad as AbilityId, abilTxt: BAL.pilotos.fantasma.habilidad_txt,
    mod: modOf("fantasma") },
  doble: { name: "El Doble de Riesgo", pros: ["+15% daño", "+25% XP", "Arranca con Cohete"], con: "Recibe 10% más daño", cost: BAL.pilotos.doble.precio, lore: "Hace las escenas peligrosas por otros. Cuanto más arriesga, más rápido aprende.", start: BAL.pilotos.doble.arma_inicial as WeaponId, abil: BAL.pilotos.doble.habilidad as AbilityId, abilTxt: BAL.pilotos.doble.habilidad_txt,
    mod: modOf("doble") },
};

export const pilotStats = (st: PStats, id: PilotId) => { (PILOTS[id] ?? PILOTS.soldadito).mod(st); return st; };

/** Retratos cinemáticos de pilotos para el garaje y bestiario */
export const PILOT_PORTRAITS: Partial<Record<PilotId | "veterano" | "novato", string>> = {
  veterano: "./images/pilots/pilot-veterano.webp",
  soldadito: "./images/pilots/pilot-soldadito.webp",
  muneca: "./images/pilots/pilot-muneca.webp",
  robot: "./images/pilots/pilot-robot.webp",
  dino: "./images/pilots/pilot-dino.webp",
  novato: "./images/pilots/pilot-novato.webp",
  figura: "./images/pilots/pilot-novato.webp", // Novato / temerario joven
  abuela: "./images/pilots/pilot-abuela.webp",
  astronauta: "./images/pilots/pilot-astronauta.webp",
  dinogoma: "./images/pilots/pilot-dinogoma.webp",
  rusa: "./images/pilots/pilot-rusa.webp",
  pirata: "./images/pilots/pilot-pirata.webp",
  caballero: "./images/pilots/pilot-caballero.webp",
  bombero: "./images/pilots/pilot-bombero.webp",
};

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
