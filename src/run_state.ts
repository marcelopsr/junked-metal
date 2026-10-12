// Estado de PARTIDA de Supervivencia/ENCORE agrupado (antes eran `let` sueltos en main.ts). Solo datos puros: sin mallas, escena, cámara ni red.
import type { Kind } from "./enemies";
import type { RunRec } from "./menu";
import type { AbilityId } from "./abilities";
import type { PassiveId } from "./weapons";

export interface RunState {
  // progreso
  xp: number; level: number; pendingLevels: number;
  time: number; kills: number; runScrap: number; runDist: number; runSeed: number;
  rerolls: number; revives: number; offerTitle: string; // del taller: Dado cargado y Batería de reserva
  // mejores momentos (pantalla final)
  bestStreak: number; bestHit: number; bossKills: number; bestDriveMul: number;
  // reloj del director
  spawnAcc: number; groupT: number; swarmT: number; chestT: number; ballT: number; bossIdx: number; ovT: number;
  // eventos de mitad de partida: evtT próximo (0 = sin agendar), evtId activo (0 ninguno, 1 lluvia, 2 invasión, 3 apagón), evtNext elegido con rng
  evtT: number; evtId: number; evtEnd: number; evtNext: number; evtWarned: boolean; evtGemT: number; lluviaGems: number;
  // maldiciones, modo sin fin y jefe final
  horde: number; curseK: number; noRepair: boolean; endless: boolean; finalKind: Kind; weeklyK: number;
  bank: { t: number; scrap: number; dmg: Record<string, number>; rec?: RunRec } | null; // lo ya cobrado en el endRun anterior
  // pasivas y habilidad activa
  passives: Partial<Record<PassiveId, number>>;
  abil: AbilityId; abilLv: number; abilCd: number; abilOn: number; worldK: number; bombs: number; bombT: number;
  // combo de manejo
  driveMul: number; driftT: number; airT: number; airHit: boolean; trickT: number; jumpCd: number; boostSec: number;
}

export const freshRun = (): RunState => ({
  xp: 0, level: 1, pendingLevels: 0,
  time: 0, kills: 0, runScrap: 0, runDist: 0, runSeed: 0,
  rerolls: 0, revives: 0, offerTitle: "",
  bestStreak: 0, bestHit: 0, bossKills: 0, bestDriveMul: 1,
  spawnAcc: 0, groupT: 0, swarmT: 60, chestT: 100, ballT: 75, bossIdx: 0, ovT: 0,
  evtT: 0, evtId: 0, evtEnd: 0, evtNext: 0, evtWarned: false, evtGemT: 0, lluviaGems: 0,
  horde: 1, curseK: 1, noRepair: false, endless: false, finalKind: "perro", weeklyK: 1,
  bank: null,
  passives: {},
  abil: "bombardeo", abilLv: 0, abilCd: 0, abilOn: 0, worldK: 1, bombs: 0, bombT: 0,
  driveMul: 1, driftT: 0, airT: 0, airHit: false, trickT: 0, jumpCd: 0, boostSec: 0,
});

export const run: RunState = freshRun();
