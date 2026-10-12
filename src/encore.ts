// ENCORE (docs/ENCORE): estado de la expedición y sus fases. Puro (sin motor ni DOM): main.ts lo avanza, lee la fase y aplica los efectos.
// Flujo: stage → (aterriza el teleportador) → teleporter → stay | (pact →) advance → ... → vote → encore | final → won.
// Decisiones de diseño: D-005 (cuatro escenarios por ciclo), D-025 (teleportador), D-031 (votación ENCORE! / FINAL ACT), D-029 (jefe final fijo), pactos (docs/ENCORE/01_DESIGN/08_PACTS.md).

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
  pactS: 15,           // ventana de la oferta de pactos (al elegir AVANZAR); si vence, se rechaza sin penalidad
  bossIntroS: 12,      // segundos de arena vacía antes de que entre el jefe del FINAL ACT
  finalBoss: "aspiradora" as const, // jefe secreto de prueba (R0_SURVIVOR.md §10); el sorteo entre FINALS llega con la run completa
};

export type Phase = "stage" | "teleporter" | "stay" | "pact" | "vote" | "final" | "won";
/** Lo que pasó en un paso; es también la clave de la frase del Director. */
export type Ev = "tele_land" | "tele_ready" | "stay" | "pact_offer" | "pact_yes" | "pact_no" | "advance" | "vote" | "encore" | "final_act" | "won";
export type Run = {
  seed: number; loop: number; stage: number; phase: Phase;
  stageT: number;   // segundos en el escenario (solo corre en `stage`)
  timer: number;    // segundos que quedan de la ventana abierta (decisión, estadía o votación)
  landed: boolean;  // el teleportador ya aterrizó en este escenario
  stayT: number;    // segundos quedándose en este escenario (suben la amenaza)
  stays: number;    // veces que se eligió quedarse en este escenario
  pacts: { id: string; left: number }[]; // pactos activos; left = escenarios que les quedan contando el actual (Infinity = resto de la run)
  offer: [string, string] | null;        // ids ofrecidos mientras la fase es `pact`
};

export const newRun = (seed: number): Run => ({ seed, loop: 0, stage: 0, phase: "stage", stageT: 0, timer: 0, landed: false, stayT: 0, stays: 0, pacts: [], offer: null });

/** Semilla de cada escenario: (seed, 0, 0) es la de la run; la votación y el FINAL ACT usan los índices `stages` y `stages + 1`. */
export const stageSeed = (seed: number, loop: number, stage: number) => (seed + loop * 0x9e3779b1 + stage * 0x85ebca6b) >>> 0;

/** Índice de escenario que le toca a la semilla según la fase (la votación y el FINAL ACT son escenarios propios). */
export const sceneIdx = (r: Run) => (r.phase === "vote" ? ENC.stages : r.phase === "final" || r.phase === "won" ? ENC.stages + 1 : r.stage);

/** Segundos de dificultad que se suman al reloj del escenario: sube por escenario, por vuelta y mientras uno se queda. */
export const paceOf = (r: Run) => (r.loop * ENC.stages + r.stage) * ENC.paceStageS + r.stayT * ENC.stayRamp;

const reset = (r: Run) => { r.phase = "stage"; r.stageT = 0; r.timer = 0; r.landed = false; r.stayT = 0; r.stays = 0; r.offer = null; };
/** Se sale de un escenario (o de la votación): cada pacto con duración pierde uno y los vencidos se van. */
const leave = (r: Run) => { r.pacts = r.pacts.map((a) => ({ id: a.id, left: a.left - 1 })).filter((a) => a.left > 0); };
function advance(r: Run): Ev {
  leave(r);
  if (r.stage + 1 < ENC.stages) { r.stage++; reset(r); return "advance"; }
  r.phase = "vote"; r.timer = ENC.voteS; return "vote";
}
function vote(r: Run, i: 0 | 1): Ev {
  leave(r);
  if (i === 0) { r.loop++; r.stage = 0; reset(r); return "encore"; }
  r.phase = "final"; r.stageT = 0; return "final_act";
}

/** AVANZAR elegido: si queda un escenario por jugar y hay dos pactos libres, el Director ofrece antes de cargarlo (con la ventana vencida, el show avanza solo y no ofrece). */
function go(r: Run): Ev {
  const o = r.stage + 1 < ENC.stages ? pactOffer(r) : null;
  if (!o) return advance(r);
  r.phase = "pact"; r.offer = o; r.timer = ENC.pactS; return "pact_offer";
}
/** Responde a la oferta: 0 o 1 acepta ese pacto, 2 (o ventana vencida) rechaza sin penalidad. Después carga el escenario siguiente. */
function choosePact(r: Run, i: 0 | 1 | 2): Ev {
  const id = i === 2 ? undefined : r.offer?.[i];
  if (id) r.pacts.push({ id, left: pactOf(id).stages + 1 }); // el +1 lo descuenta el `leave` de este mismo avance
  advance(r);
  return id ? "pact_yes" : "pact_no";
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
  } else if (r.phase === "pact") {
    if ((r.timer -= dt) <= 0) return choosePact(r, 2);
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

/** Elige la opción 0 o 1 de lo que muestre `ask` (2 = rechazar, solo en la oferta de pactos). */
export function pick(r: Run, i: 0 | 1 | 2): Ev | null {
  if (r.phase === "pact") return choosePact(r, i);
  if (i === 2) return null;
  if (r.phase === "teleporter") { if (i === 1) return go(r); r.phase = "stay"; r.timer = ENC.stayS; return "stay"; }
  if (r.phase === "stay") return i === 1 ? go(r) : null;
  if (r.phase === "vote") return vote(r, i);
  return null;
}

/** El jefe del FINAL ACT cayó. */
export function bossDown(r: Run): Ev | null {
  if (r.phase !== "final") return null;
  r.phase = "won"; return "won";
}

// ---------- Pactos del Director (docs/ENCORE/01_DESIGN/08_PACTS.md, 05_DATA/prototype_pacts.json) ----------
// Al elegir AVANZAR el Director ofrece 2 pactos: ventaja + costo, ambos visibles y verdaderos (el texto sale de los mismos números que se aplican).
// Se aceptan o se rechazan sin penalidad; la ventana vencida es rechazar. Duran `stages` escenarios (Infinity = resto de la run). Cambiar a mano los números de
// la tabla basta: el texto, la oferta y la aplicación los leen de ahí. Multiplicadores: 1 = sin cambio (regen suma vida por segundo, heal repara una fracción al aceptar).
export type Fx = { dmg: number; speed: number; maxHp: number; xp: number; scrap: number; spawn: number; taken: number; regen: number };
export type Pact = { id: string; name: string; tag: string; stages: number; gain: Partial<Fx> & { heal?: number }; cost: Partial<Fx> & { heal?: number } };
// ponytail: valores provisorios y sin playtest; el voto de equipo, el secreto y los pactos QUICK del diseño necesitan cooperativo y quedan fuera.
export const PACTS: Pact[] = [
  { id: "garantia", name: "SALUD EN GARANTÍA", tag: "GARANTÍA", stages: Infinity, gain: { dmg: 1.35 }, cost: { maxHp: 0.7 } },
  { id: "sorpresa", name: "PRODUCCIÓN SORPRESA", tag: "SORPRESA", stages: 2, gain: { xp: 1.5 }, cost: { spawn: 1.3 } },
  { id: "chatarra", name: "DOBLE O CHATARRA", tag: "CHATARRA", stages: Infinity, gain: { scrap: 1.5 }, cost: { spawn: 1.25 } },
  { id: "patrocinio", name: "PATROCINIO DEFECTUOSO", tag: "PATROCINIO", stages: 2, gain: { speed: 1.2 }, cost: { taken: 1.25 } },
  { id: "maquillaje", name: "RETOQUE DE MAQUILLAJE", tag: "RETOQUE", stages: 2, gain: { heal: 0.6 }, cost: { dmg: 0.8 } },
  { id: "nocturno", name: "PROGRAMA NOCTURNO", tag: "NOCTURNO", stages: 1, gain: { regen: 2 }, cost: { spawn: 1.4 } },
];
export const pactOf = (id: string): Pact => PACTS.find((p) => p.id === id)!;
export const NO_FX: Fx = { dmg: 1, speed: 1, maxHp: 1, xp: 1, scrap: 1, spawn: 1, taken: 1, regen: 0 };
const FX_KEYS = Object.keys(NO_FX) as (keyof Fx)[];
/** Efecto combinado de los pactos activos (multiplica; regen suma). Con null o sin pactos es NO_FX: la Supervivencia no cambia. */
export function pactFx(r: Run | null): Fx {
  const f = { ...NO_FX };
  if (r) for (const a of r.pacts) { const p = pactOf(a.id); for (const o of [p.gain, p.cost]) for (const k of FX_KEYS) { const v = o[k]; if (v !== undefined) f[k] = k === "regen" ? f[k] + v : f[k] * v; } }
  return f;
}
/** Los dos pactos de la oferta de este escenario, o null si no quedan dos libres. Hash propio de (semilla, vuelta, escenario): no gasta el rng() de la partida. */
export function pactOffer(r: Run): [string, string] | null {
  const key = (i: number) => mix(r.seed + 0x5ac7 + r.loop * 7919 + r.stage * 15485863 + i * 104729);
  const free = PACTS.map((p, i) => ({ p, k: key(i) })).filter(({ p }) => !r.pacts.some((a) => a.id === p.id)).sort((a, b) => a.k - b.k);
  return free.length < 2 ? null : [free[0].p.id, free[1].p.id];
}
const LABEL: Record<keyof Fx, string> = { dmg: "DAÑO", speed: "VELOCIDAD", maxHp: "VIDA MÁXIMA", xp: "XP", scrap: "TORNILLOS", spawn: "ENEMIGOS", taken: "DAÑO RECIBIDO", regen: "VIDA/S" };
/** Términos de un lado del pacto como líneas para la UI: "+35% DAÑO", "-30% VIDA MÁXIMA", "+2 VIDA/S", "REPARA 60% DE LA VIDA AL ACEPTAR". */
export function fxText(o: Pact["gain"]): string[] {
  const t = FX_KEYS.filter((k) => o[k] !== undefined).map((k) => { const v = o[k]!; if (k === "regen") return `+${v} ${LABEL[k]}`; const pc = Math.round((v - 1) * 100); return `${pc > 0 ? "+" : "-"}${Math.abs(pc)}% ${LABEL[k]}`; });
  if (o.heal) t.push(`REPARA ${Math.round(o.heal * 100)}% DE LA VIDA AL ACEPTAR`);
  return t;
}
const durText = (n: number) => (n === Infinity ? "RESTO DE LA RUN" : n === 1 ? "PRÓXIMO ESCENARIO" : `PRÓXIMOS ${n} ESCENARIOS`);
export type PactView = { name: string; gain: string[]; cost: string[]; dur: string };
const viewOf = (p: Pact): PactView => ({ name: p.name, gain: fxText(p.gain), cost: fxText(p.cost), dur: durText(p.stages) });
/** Para el HUD: pactos activos con su etiqueta corta, lo que les queda y los términos completos (title). */
export function activePacts(r: Run): { tag: string; left: string; terms: string }[] {
  return r.pacts.map((a) => { const p = pactOf(a.id); return { tag: p.tag, left: a.left === Infinity ? "RUN" : `${a.left} ESC`, terms: `${p.name}: ${fxText(p.gain).join(", ")} / ${fxText(p.cost).join(", ")}` }; });
}

// ---------- Variantes de escenario (docs/ENCORE/R0/R1_SLICE.md § Variantes) ----------
// Cada escenario de una vuelta usa una variante distinta: dónde llega el auto en la esfera, cráteres extra, ritmo de meteoritos / erupciones / astros y la nave del minijefe.
// Todo sale de (semilla, vuelta, escenario) con un hash propio (`mix`): no gasta el rng() de la partida. Los intervalos son multiplicadores (< 1 = más seguido).
export type Variant = {
  name: string; line: string;               // el Director las anuncia por banner al llegar: "NOMBRE. línea"
  at: "salida" | "oscuro" | "tierra" | "sol"; // dónde llega el auto: salida (polo, de día), lado oscuro, bajo la Tierra, de frente al Sol
  craters: [n: number, rMin: number, rMax: number]; // cráteres extra alrededor de la llegada (tope total de la luna: DENT_CAP, hoy 40; con n <= 10 sobra para los de la partida)
  rain: number; quake: number; sky: number; // intervalo de meteoritos, de erupciones y de lanzamientos del Sol / la Tierra
  ship: "bombardera" | "abductora" | "caza" | null; // minijefe fijo (null = el que elija la semilla)
};
export const VARIANTS: Variant[] = [
  { name: "LA TARIMA", line: "EL CLÁSICO: LUZ, POLVO Y NADA QUE ENVIDIAR.", at: "salida", craters: [0, 0, 0], rain: 1, quake: 1, sky: 1, ship: null },
  { name: "EL LADO OSCURO", line: "SIN SOL NI PÚBLICO. SOLO LAS ERUPCIONES ALUMBRAN.", at: "oscuro", craters: [5, 4, 8], rain: 1.4, quake: 0.55, sky: 1, ship: "abductora" },
  { name: "CAMPO DE CRÁTERES", line: "EL PISO ES UN QUESO. LOS METEORITOS ESTÁN DE GIRA.", at: "tierra", craters: [10, 5, 11], rain: 0.6, quake: 1.6, sky: 1, ship: "caza" },
  { name: "SOL DE FRENTE", line: "REFLECTORES AL MÁXIMO. EL SOL TAMBIÉN TIRA.", at: "sol", craters: [3, 3, 6], rain: 1.2, quake: 1, sky: 0.55, ship: "bombardera" },
];
/** Hash sin estado: n → [0, 1). Un paso de mulberry32. */
const mix = (n: number) => { let t = (n + 0x6d2b79f5) | 0; t = Math.imul(t ^ (t >>> 15), 1 | t); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
/** Variante del escenario actual (null en la votación y el FINAL ACT). Una vuelta usa todas las variantes sin repetir; el primer escenario de la run es siempre LA TARIMA, donde arranca el auto. */
export function variantOf(r: Run): Variant | null {
  const idx = sceneIdx(r);
  if (idx >= ENC.stages) return null;
  const o = VARIANTS.map((_, i) => i);
  for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(mix(r.seed + r.loop * 7919 + i * 104729) * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } // Fisher-Yates con el hash
  if (!r.loop) o.unshift(...o.splice(o.indexOf(0), 1)); // vuelta 0: LA TARIMA primero
  return VARIANTS[o[idx % o.length]];
}
/** Cráteres extra de la variante: ángulo, distancia (m) a la llegada y radio; nunca a menos de 14 m de la llegada. */
export function craterPlan(v: Variant, r: Run): { a: number; d: number; r: number }[] {
  const base = stageSeed(r.seed, r.loop, sceneIdx(r)), [n, lo, hi] = v.craters;
  return Array.from({ length: n }, (_, i) => { const rad = lo + mix(base + i * 3 + 1) * (hi - lo); return { a: mix(base + i * 3) * Math.PI * 2, d: 14 + rad + mix(base + i * 3 + 2) * 32, r: rad }; });
}

/** Para el HUD: título de la ventana abierta, textos de los dos botones (null = sin botón) y duración total; en la oferta, además los términos de cada pacto y el botón de rechazo. */
export function ask(r: Run): { title: string; opts: [string | null, string | null]; total: number; pacts?: [PactView, PactView]; reject?: string } | null {
  if (r.phase === "pact" && r.offer) { const [a, b] = r.offer.map((id) => viewOf(pactOf(id))); return { title: "PACTO DEL DIRECTOR", opts: [a.name, b.name], total: ENC.pactS, pacts: [a, b], reject: "RECHAZAR" }; }
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
  pact_offer: ["TENGO DOS TRATOS PARA USTEDES. LA LETRA CHICA ESTÁ A LA VISTA.", "UN PACTO, SIN PRESIONES. BUENO, CON POCA PRESIÓN."],
  pact_yes: ["¡TRATO HECHO! ME ENCANTAN LOS CLIENTES CON FE.", "FIRMADO. YO CUMPLO, ASÍ QUE CUMPLAN USTEDES."],
  pact_no: ["¿NADA? PRUDENTE. ABURRIDO, PERO PRUDENTE.", "SIN TRATO, SIN RENCORES. LA OFERTA SE ENFRÍA."],
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
