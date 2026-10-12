// ENCORE (docs/ENCORE): estado de la expedición y sus fases. Puro (sin motor ni DOM): main.ts lo avanza, lee la fase y aplica los efectos.
// Flujo: stage → (aterriza el teleportador) → teleporter → stay | advance → ... → vote → encore | final → won.
// Decisiones de diseño: D-005 (cuatro escenarios por ciclo), D-025 (teleportador), D-031 (votación ENCORE! / FINAL ACT), D-029 (jefe final fijo).

export const ENC = {
  // ponytail: todos los valores son provisorios y sin playtest (docs/ENCORE/R0/R1_SLICE.md); se afinan con el playbook "Que duela quedarse".
  stages: 4,           // escenarios por ciclo antes de la votación (D-005, D-031)
  miniS: 75,           // segundo del escenario en que llega su minijefe (una nave lunar)
  teleS: 150,          // segundo en que aterriza el teleportador (el cohete de moon_goals.ts, a luna_cohete_dist del auto)
  decideS: 20,         // ventana para elegir QUEDARSE o AVANZAR; si vence, el show avanza solo
  stayS: 60,           // segundos extra al quedarse, antes de volver a preguntar
  stayRamp: 1,         // segundos de dificultad extra por segundo quedándose: la amenaza sube al doble de ritmo
  paceStageS: 120,     // segundos de dificultad que suma cada escenario (y cada vuelta suma `stages` escenarios)
  voteS: 20,           // ventana de la votación; si vence, ¡ENCORE!
  bossIntroS: 12,      // segundos de arena vacía antes de que entre el jefe del FINAL ACT
  finalBoss: "aspiradora" as const, // jefe secreto de prueba (R0_SURVIVOR.md §10); el sorteo entre FINALS llega con la run completa
};

export type Phase = "stage" | "teleporter" | "stay" | "vote" | "final" | "won";
/** Lo que pasó en un paso; es también la clave de la frase del Director. */
export type Ev = "tele_land" | "tele_ready" | "stay" | "advance" | "vote" | "encore" | "final_act" | "won";
export type Run = {
  seed: number; loop: number; stage: number; phase: Phase;
  stageT: number;   // segundos en el escenario (solo corre en `stage`)
  timer: number;    // segundos que quedan de la ventana abierta (decisión, estadía o votación)
  landed: boolean;  // el teleportador ya aterrizó en este escenario
  stayT: number;    // segundos quedándose en este escenario (suben la amenaza)
  stays: number;    // veces que se eligió quedarse en este escenario
};

export const newRun = (seed: number): Run => ({ seed, loop: 0, stage: 0, phase: "stage", stageT: 0, timer: 0, landed: false, stayT: 0, stays: 0 });

/** Semilla de cada escenario: (seed, 0, 0) es la de la run; la votación y el FINAL ACT usan los índices `stages` y `stages + 1`. */
export const stageSeed = (seed: number, loop: number, stage: number) => (seed + loop * 0x9e3779b1 + stage * 0x85ebca6b) >>> 0;

/** Índice de escenario que le toca a la semilla según la fase (la votación y el FINAL ACT son escenarios propios). */
export const sceneIdx = (r: Run) => (r.phase === "vote" ? ENC.stages : r.phase === "final" || r.phase === "won" ? ENC.stages + 1 : r.stage);

/** Segundos de dificultad que se suman al reloj del escenario: sube por escenario, por vuelta y mientras uno se queda. */
export const paceOf = (r: Run) => (r.loop * ENC.stages + r.stage) * ENC.paceStageS + r.stayT * ENC.stayRamp;

const reset = (r: Run) => { r.phase = "stage"; r.stageT = 0; r.timer = 0; r.landed = false; r.stayT = 0; r.stays = 0; };
function advance(r: Run): Ev {
  if (r.stage + 1 < ENC.stages) { r.stage++; reset(r); return "advance"; }
  r.phase = "vote"; r.timer = ENC.voteS; return "vote";
}
function vote(r: Run, i: 0 | 1): Ev {
  if (i === 0) { r.loop++; r.stage = 0; reset(r); return "encore"; }
  r.phase = "final"; r.stageT = 0; return "final_act";
}

/** Avanza los relojes. Devuelve lo que ocurrió, si algo. */
export function tick(r: Run, dt: number): Ev | null {
  if (r.phase === "stage") {
    r.stageT += dt;
    if (!r.landed && r.stageT >= ENC.teleS) { r.landed = true; return "tele_land"; }
  } else if (r.phase === "teleporter") {
    if ((r.timer -= dt) <= 0) return advance(r); // el show no espera
  } else if (r.phase === "stay") {
    r.stayT += dt;
    if ((r.timer -= dt) <= 0) { r.phase = "teleporter"; r.timer = ENC.decideS; r.stays++; return "tele_ready"; }
  } else if (r.phase === "vote") {
    if ((r.timer -= dt) <= 0) return vote(r, 0);
  } else if (r.phase === "final") r.stageT += dt;
  return null;
}

/** El auto activó el teleportador: abre la decisión. */
export function boarded(r: Run): Ev | null {
  if (r.phase !== "stage" || !r.landed) return null;
  r.phase = "teleporter"; r.timer = ENC.decideS; return "tele_ready";
}

/** Elige la opción 0 o 1 de lo que muestre `options`. */
export function pick(r: Run, i: 0 | 1): Ev | null {
  if (r.phase === "teleporter") { if (i === 1) return advance(r); r.phase = "stay"; r.timer = ENC.stayS; return "stay"; }
  if (r.phase === "stay") return i === 1 ? advance(r) : null;
  if (r.phase === "vote") return vote(r, i);
  return null;
}

/** El jefe del FINAL ACT cayó. */
export function bossDown(r: Run): Ev | null {
  if (r.phase !== "final") return null;
  r.phase = "won"; return "won";
}

/** Para el HUD: título de la ventana abierta, textos de los dos botones (null = sin botón) y duración total. */
export function ask(r: Run): { title: string; opts: [string | null, string | null]; total: number } | null {
  if (r.phase === "teleporter") return { title: "TELEPORTADOR LISTO", opts: ["QUEDARSE", "AVANZAR"], total: ENC.decideS };
  if (r.phase === "stay") return { title: "SIGUE LA FUNCIÓN · PRÓXIMA DECISIÓN", opts: [null, "AVANZAR YA"], total: ENC.stayS };
  if (r.phase === "vote") return { title: "EL PÚBLICO VOTA", opts: ["¡ENCORE!", "FINAL ACT"], total: ENC.voteS };
  return null;
}

/** Contador del HUD: [prefijo, texto, es escenario numerado]. */
export function tag(r: Run): [string, string, boolean] {
  if (r.phase === "vote") return ["", "BAMBALINAS", false];
  if (r.phase === "final" || r.phase === "won") return ["", "FINAL ACT", false];
  return ["ESCENARIO ", `${r.stage + 1}/${ENC.stages}${r.loop ? ` · VUELTA ${r.loop + 1}` : ""}`, true];
}

// ---------- El Director (docs/ENCORE/02_NARRATIVE/01_DIRECTOR_BIBLE.md, 05_DATA/dialogue_cues.csv) ----------
// Presentador macabro de show. Frases cortas para el aviso de radio; no revelan quién es. La variante sale del escenario, nunca del rng() de la partida.
export type LineId = Ev | "start" | "boss_intro";
const LINES: Record<LineId, string[]> = {
  start: ["¡LUCES ENCENDIDAS! GRAVEDAD OPCIONAL, DIGNIDAD NO INCLUIDA.", "SONRÍAN PARA EL PÚBLICO. NO PREGUNTEN DÓNDE ESTÁ EL PÚBLICO."],
  tele_land: ["¡LLEGÓ EL TELEPORTADOR! QUÉ DECEPCIÓN PARA EL EQUIPO DE ESCONDITES.", "TELEPORTADOR EN ESCENA. LA PRODUCCIÓN LO ESCONDIÓ CON CARIÑO."],
  tele_ready: ["LA PUERTA ESTÁ ABIERTA. ¿SE QUEDAN O CAMBIAMOS DE CANAL?", "¡ELENCO LISTO! QUE NADIE OLVIDE RESPIRAR. DECIDAN."],
  stay: ["¿SE QUEDAN? ¡ADORO LA INSISTENCIA! LA PRODUCCIÓN TAMBIÉN.", "OTRA TOMA, ENTONCES. LOS PELIGROS SE ESTIRAN, ASÍ QUE ESTÍRENSE."],
  advance: ["¡CAMBIO DE ESCENARIO! NO TOQUEN NADA, ES UTILERÍA.", "SIGUIENTE ESCENA. EL ESCENARIO ES NUEVO, LOS PROBLEMAS SON DE ARCHIVO."],
  vote: ["¡FIN DEL CUARTO ACTO! EL PÚBLICO VOTA: ¡ENCORE! O FINAL ACT.", "EL PÚBLICO ESTÁ DIVIDIDO. YO, NO: QUIERO UN FINAL ESPECTACULAR."],
  encore: ["¡OTRA VUELTA! EL PÚBLICO EXIGE MÁS. Y YO SOY EL PÚBLICO.", "¡QUE EMPIECE EL BIS! ESTA VEZ CON MÁS ENTUSIASMO DE MI PARTE."],
  final_act: ["¡EL ÚLTIMO ACTO! NADIE ABANDONA EL ESCENARIO ANTES DEL APLAUSO.", "FINAL ACT. APAGUEN SUS CELULARES, ENCIENDAN SUS MOTORES."],
  boss_intro: ["LES PREPARÉ UN INVITADO. NO ESPEREN BUENOS MODALES."],
  won: ["¡GANADORES! NO CONFUNDAN ESTO CON HABER ESCAPADO."],
};
export function line(id: LineId, r: Run): string {
  const v = LINES[id];
  return v[(r.loop * ENC.stages + r.stage + r.stays) % v.length];
}
