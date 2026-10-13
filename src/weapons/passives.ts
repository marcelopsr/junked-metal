import { BAL } from "../balance";

// ---------- Pasivas ----------
export type PassiveId = "iman" | "resorte" | "turbo" | "litio" | "capacitor" | "lego" | "lupa" | "cinta" | "pila" | "escape" | "llavero" | "paragolpes" | "antena" | "bidon" | "llamas";
export const PASSIVES: Record<PassiveId, { name: string; desc: string }> = {
  iman: { name: "Imán de heladera", desc: "+30% radio de recolección. Atrae tuercas y nada más, por una vez" },
  resorte: { name: "Resorte", desc: "+12% área y velocidad de proyectiles. Rebota, como el ánimo" },
  turbo: { name: "Motor turbo", desc: "+6% velocidad, turbo se recarga más rápido. Llegar antes a ningún lado" },
  litio: { name: "Pila de litio", desc: "+20 vida máxima y regeneración. Dura más que cualquier relación" },
  capacitor: { name: "Capacitor", desc: "-8% tiempo de recarga de armas. Menos espera, como si existiera" },
  lego: { name: "Paragolpes LEGO", desc: "-8% daño recibido, más peso. Pisarlo duele, y no solo en los pies" },
  lupa: { name: "Lupa", desc: "+8% daño de todas las armas. Se usa para leer la letra chica" },
  cinta: { name: "Cinta aislante", desc: "Ignora el siguiente golpe cada 30 s; menos segundos por nivel. Arregla todo, menos la dignidad" },
  pila: { name: "Pila recargable", desc: "La habilidad del piloto se recarga 10% más rápido por nivel. Carga completa, paciencia aparte" },
  escape: { name: "Caño de escape", desc: "Al derrapar o usar el turbo suelta fuego detrás que quema a los bichos. Multa de tránsito incluida" },
  llavero: { name: "Llavero de la suerte", desc: "+8% de tornillos y de pilas e imanes soltados por nivel. Abre puertas, a veces cajones" },
  paragolpes: { name: "Defensa de caucho", desc: "Cada choque fuerte contra rocas o tambores suelta una onda que daña y empuja a los bichos cercanos. Chocar sale gratis" },
  antena: { name: "Antena de radio", desc: "+25% de alcance del radar y avisos de jefes y eventos con más anticipación. Se escucha todo, hasta lo que conviene ignorar" },
  bidon: { name: "Tanque extra", desc: "+15% de vida máxima por nivel y cura un poco al subir de nivel. Llenar el tanque es de sabios" },
  llamas: { name: "Calcomanía de llamas", desc: "+5% de daño por nivel y 10% más a velocidad máxima. No corre más, pero se ve que sí" },
};

// Valores vivos que el juego recalcula y que leen módulos sin acceso a PStats (combate, radar, avisos, drops). Un solo jugador: no hay copias por auto.
export const LIVE = { dmg: 1, luck: 1, radar: 1, aviso: 1 };

export function passiveStats(p: Partial<Record<PassiveId, number>>, perm: { hp: number; dmg: number; spd: number; mag: number; xp?: number; arm?: number; reg?: number; tur?: number; ram?: number; cdr?: number }) {
  const l = (id: PassiveId) => p[id] ?? 0;
  const P = BAL.pasivas, T = BAL.precios; // los efectos del taller (por nivel) están en precios.efecto
  const tl = (k: "arm" | "reg" | "tur" | "ram" | "cdr") => T[k].efecto * (perm[k] ?? 0);
  return {
    magnet: P.iman.base * (1 + P.iman.por_nivel * l("iman")) * (1 + T.mag.efecto * perm.mag),
    area: 1 + P.resorte.por_nivel * l("resorte"),
    speedMul: (1 + P.turbo.por_nivel * l("turbo")) * (1 + T.spd.efecto * perm.spd),
    boostRegen: P.turbo.base2 * (1 + P.turbo.por_nivel2 * l("turbo")) * (1 + tl("tur")),
    boostUse: 1 / (1 + tl("tur")), // gasto del turbo: la Nafta de encendedor lo hace durar más
    maxHp: P.litio.por_nivel * l("litio") + T.hp.efecto * perm.hp,
    regen: P.litio.base2 + P.litio.por_nivel2 * l("litio") + tl("reg"),
    cooldown: Math.pow(P.capacitor.por_nivel, l("capacitor")) * Math.pow(1 - T.cdr.efecto, perm.cdr ?? 0),
    armor: 1 - Math.pow(P.lego.por_nivel, l("lego")) * Math.pow(1 - T.arm.efecto, perm.arm ?? 0), // multiplicativo: nunca llega a 1
    ram: 1 + tl("ram"), // daño de embestida (Paragolpes de fierro)
    mass: 1 + P.lego.por_nivel2 * l("lego"),
    dmg: (1 + T.dmg.efecto * perm.dmg) * (1 + P.lupa.por_nivel * l("lupa")) * (1 + P.llamas.por_nivel * l("llamas")),
    xp: 1 + T.xp.efecto * (perm.xp ?? 0),
    cinta: l("cinta") ? P.cinta.base - P.cinta.por_nivel * (l("cinta") - 1) : 0, // segundos entre golpes tapados (0 = sin la pasiva)
    abilRate: 1 + P.pila.por_nivel * l("pila"), // la recarga de la habilidad se divide por esto
    escape: l("escape") ? P.escape.base + P.escape.por_nivel * l("escape") : 0, // daño por segundo del fuego del escape
    escapeR: P.escape.base2 + P.escape.por_nivel2 * l("escape"),
    scrap: 1 + P.llavero.por_nivel * l("llavero"),
    luck: 1 + P.llavero.por_nivel2 * l("llavero"), // multiplica la probabilidad de soltar pilas e imanes
    bumper: l("paragolpes") ? P.paragolpes.base + P.paragolpes.por_nivel * l("paragolpes") : 0, // daño de la onda del choque
    bumperR: P.paragolpes.base2 + P.paragolpes.por_nivel2 * l("paragolpes"),
    radar: 1 + P.antena.por_nivel * l("antena"),
    aviso: 1 + P.antena.por_nivel2 * l("antena"),
    hpMul: 1 + P.bidon.por_nivel * l("bidon"),
    lvHeal: P.bidon.base2 * l("bidon"), // fracción de vida máxima que cura cada nivel
    llamasVel: l("llamas") ? P.llamas.base2 : 0, // bono extra a velocidad máxima
  };
}
export type PStats = ReturnType<typeof passiveStats>;
