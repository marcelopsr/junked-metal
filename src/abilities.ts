// Habilidad activa (común a todos los pilotos): se elige en el garaje (save.ability) y se usa en partida con su botón.
// Solo datos: el efecto de cada una vive en main.ts (useAbility). cd = enfriamiento en segundos, dur = lo que dura activa.
import { BAL } from "./balance";

const R = BAL.ritmo; // enfriamiento y duración: tabla ritmo de balance.json
export type AbilityId = "bombardeo" | "escudo" | "emp" | "lenta";
export const ABILITIES: Record<AbilityId, { name: string; short: string; desc: string; cd: number; dur: number }> = {
  bombardeo: { name: "Bombardeo de petardos", short: "PETARDOS", desc: "Una lluvia de petardos cae alrededor del auto.", cd: R.habilidad_bombardeo_cd, dur: R.habilidad_bombardeo_dur },
  escudo: { name: "Escudo que cura", short: "ESCUDO", desc: "3 s sin recibir daño mientras recupera 30% de la vida.", cd: R.habilidad_escudo_cd, dur: R.habilidad_escudo_dur },
  emp: { name: "Pulso EMP", short: "EMP", desc: "Aturde 2 s a todos los enemigos cercanos, salvo a los jefes.", cd: R.habilidad_emp_cd, dur: R.habilidad_emp_dur },
  lenta: { name: "Cámara lenta", short: "LENTA", desc: "El mundo va al 40% durante 3 s. El auto no se frena.", cd: R.habilidad_lenta_cd, dur: R.habilidad_lenta_dur },
};

// Maldiciones opcionales antes de jugar (fila del menú principal). Combinables; el desafío diario no las permite.
export type CurseId = "horda" | "sinrep";
export const CURSES: Record<CurseId, { name: string; short: string; desc: string }> = {
  horda: { name: "Horda", short: "+50% enemigos", desc: "+50% enemigos, +30% tornillos" },
  sinrep: { name: "Sin reparaciones", short: "sin curación", desc: "Sin cartas de curación, regeneración ni pilas, +30% tornillos" },
};
