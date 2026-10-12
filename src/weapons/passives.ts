import { BAL } from "../balance";

// ---------- Pasivas ----------
export type PassiveId = "iman" | "resorte" | "turbo" | "litio" | "capacitor" | "lego" | "lupa";
export const PASSIVES: Record<PassiveId, { name: string; desc: string }> = {
  iman: { name: "Imán de heladera", desc: "+30% radio de recolección. Atrae tuercas y nada más, por una vez" },
  resorte: { name: "Resorte", desc: "+12% área y velocidad de proyectiles. Rebota, como el ánimo" },
  turbo: { name: "Motor turbo", desc: "+6% velocidad, turbo se recarga más rápido. Llegar antes a ningún lado" },
  litio: { name: "Pila de litio", desc: "+20 vida máxima y regeneración. Dura más que cualquier relación" },
  capacitor: { name: "Capacitor", desc: "-8% tiempo de recarga de armas. Menos espera, como si existiera" },
  lego: { name: "Paragolpes LEGO", desc: "-8% daño recibido, más peso. Pisarlo duele, y no solo en los pies" },
  lupa: { name: "Lupa", desc: "+8% daño de todas las armas. Se usa para leer la letra chica" },
};

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
    dmg: (1 + T.dmg.efecto * perm.dmg) * (1 + P.lupa.por_nivel * l("lupa")),
    xp: 1 + T.xp.efecto * (perm.xp ?? 0),
  };
}
export type PStats = ReturnType<typeof passiveStats>;
