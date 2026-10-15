// Habilidad activa (común a todos los pilotos): se elige en el garaje (save.ability) y se usa en partida con su botón.
// Solo datos: el efecto de cada una vive en main.ts (useAbility). cd = enfriamiento en segundos, dur = lo que dura activa.
import { BAL } from "./balance";

const R = BAL.ritmo;
const pct = (x: number) => Math.round(x * 100); // los textos con números salen de la tabla ritmo (test/texto_numeros.test.ts) // enfriamiento y duración: tabla ritmo de balance.json
export type AbilityId = "bombardeo" | "escudo" | "emp" | "lenta" | "turbo";
export const ABILITIES: Record<AbilityId, { name: string; short: string; desc: string; cd: number; dur: number }> = {
  bombardeo: { name: "Bombardeo de petardos", short: "PETARDOS", desc: "Una lluvia de petardos cae alrededor del auto. Resolución de conflictos, estilo patio.", cd: R.habilidad_bombardeo_cd, dur: R.habilidad_bombardeo_dur },
  escudo: { name: "Escudo que cura", short: "ESCUDO", desc: `${R.habilidad_escudo_dur} s sin recibir daño mientras recupera ${pct(R.escudo_cura_s * R.habilidad_escudo_dur)}% de la vida. Licencia médica exprés.`, cd: R.habilidad_escudo_cd, dur: R.habilidad_escudo_dur },
  emp: { name: "Pulso EMP", short: "EMP", desc: `Aturde ${R.emp_aturde_s} s a todos los enemigos cercanos, salvo a los jefes: ellos tienen influencias.`, cd: R.habilidad_emp_cd, dur: R.habilidad_emp_dur },
  lenta: { name: "Cámara lenta", short: "LENTA", desc: `El mundo va al ${pct(R.lenta_mundo)}% durante ${R.habilidad_lenta_dur} s, como cualquier trámite. El auto no se frena.`, cd: R.habilidad_lenta_cd, dur: R.habilidad_lenta_dur },
  turbo: { name: "Turbo de plaza", short: "TURBO", desc: `${R.habilidad_turbo_dur} s a más velocidad y con la embestida mucho más fuerte. Frenar es para cobardes.`, cd: R.habilidad_turbo_cd, dur: R.habilidad_turbo_dur },
};

// Nivel de cada habilidad (Taller → Habilidades, save.abilLv: 0 = de fábrica, hasta costos("hab_<id>").length):
// menos enfriamiento y más efecto (petardos, segundos de escudo, aturdido del EMP, segundos de cámara lenta). Números en ritmo.
export const abilCd = (id: AbilityId, lv: number) => ABILITIES[id].cd * (1 - R.habilidad_cd_nivel * lv);
export const abilK = (lv: number) => 1 + R.habilidad_efecto_nivel * lv;

// Maldiciones opcionales antes de jugar (fila del menú principal). Combinables; el desafío diario no las permite.
export type CurseId = "horda" | "sinrep";
export const CURSES: Record<CurseId, { name: string; short: string; desc: string }> = {
  horda: { name: "Horda", short: `+${pct(R.maldicion_horda - 1)}% enemigos`, desc: `+${pct(R.maldicion_horda - 1)}% enemigos, +${pct(R.maldicion_tornillos)}% tornillos. Más carga, más comisión` },
  sinrep: { name: "Sin reparaciones", short: "sin curación", desc: `Sin cartas de curación, regeneración ni pilas, +${pct(R.maldicion_tornillos)}% tornillos. Cobertura médica cancelada` },
};
