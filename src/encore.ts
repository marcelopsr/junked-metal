// ENCORE (docs/ENCORE): estado de la expedición y sus fases. Puro (sin motor ni DOM): main.ts lo avanza, lee la fase y aplica los efectos.
// Flujo: stage → (aterriza el teleportador) → teleporter → stay | (pact →) advance → ... → vote → encore | final → won.
// Decisiones de diseño: D-005 (cuatro escenarios por ciclo), D-025 (teleportador), D-031 (votación ENCORE! / FINAL ACT), D-029 (jefe final fijo), pactos (docs/ENCORE/01_DESIGN/08_PACTS.md).

import type { Kind } from "./enemies";
import { BAL } from "./balance";

export const ENC = {
  // ponytail: todos los valores son provisorios y sin playtest (docs/ENCORE/R0/R1_SLICE.md); se afinan con el playbook "Que duela quedarse".
  stages: 4,           // escenarios por ciclo antes de la votación (D-005, D-031)
  miniS: 75,           // segundo del escenario en que llega su minijefe (una nave lunar)
  teleS: 150,          // segundo en que aterriza el teleportador (el cohete de moon_goals.ts, a luna_cohete_dist del auto)
  decideS: 20,         // ventana para elegir QUEDARSE o AVANZAR; si vence, el show avanza solo
  stayS: 60,           // segundos extra al quedarse, antes de volver a preguntar
  stayScrap: 0.1,      // H17: cada quedarse suma +10 % de tornillos (acumulable en toda la expedición) y deja un cofre extra en el escenario
  stayRamp: 1,         // segundos de dificultad extra por segundo quedándose: la amenaza sube al doble de ritmo
  paceStageS: 120,     // segundos de dificultad que suma cada escenario (y cada vuelta suma `stages` escenarios)
  routeS: 15,          // ventana para elegir destino entre dos variantes (tras la oferta de pactos); si vence, el primero
  voteS: 20,           // ventana de la votación; si vence, ¡ENCORE!
  pactS: 15,           // ventana de la oferta de pactos (al elegir AVANZAR); si vence, se rechaza sin penalidad
  bossIntroS: 12,      // segundos de arena vacía antes de que entre el jefe del FINAL ACT
  eventP0: 0.2,        // R3: probabilidad de evento al abordar el teleportador en el primer escenario...
  eventStep: 0.08,     // ...más esto por cada escenario jugado (vuelta * stages + escenario), hasta eventMax
  eventMax: 0.75,
  overloadS: 25,       // OVERLOAD: segundos de carga que hay que aguantar
  overloadEvery: 6,    // OVERLOAD: segundos entre enjambres durante la carga
  overloadK: 2.5,      // OVERLOAD: multiplicador del tamaño del enjambre
  overloadMax: 80,     // OVERLOAD: tope de bichos por enjambre
  dirGapS: 5,          // Director: segundos mínimos entre el inicio de una frase y la siguiente (incluye los dirShowS en pantalla)
  dirShowS: 3.6,       // Director: segundos que dura el subtítulo
  dirTtlS: 15,         // Director: una frase que espera más que esto ya quedó vieja y se descarta
  dirAfterHold: 2,     // Director: al cerrarse una decisión se muestran a lo sumo las 2 frases más nuevas retenidas
  dirCap: 4,           // Director: frases en espera; al pasarse se pierde la de menor prioridad
};

// ---------- R5: jefe secreto del FINAL ACT (D-029) ----------
// ponytail: `perro` queda fuera del sorteo. En la Luna su salto lanza hacia el +Y del mundo (UP.scale(22)) y su embestida fija la velocidad con ejes del mundo
// (dir = sin/cos(aim)), mientras que `to`, `fwd` y `vel()` están en el marco local de la esfera: fuera del polo el salto sale torcido y la embestida corre hacia un lado
// que no es el del carril rojo. Entra al sorteo cuando enemies.ts lo pase al marco local (flatL/upAt/toWorld) como ya hacen la tarántula y el gato.
export const FINAL_POOL = ["aspiradora", "cortacercos", "caja"] as const;
export type FinalKind = (typeof FINAL_POOL)[number];
export const FINAL_NAME: Record<FinalKind, string> = { aspiradora: "LA ASPIRADORA ROBOT", cortacercos: "EL CORTACERCOS ELÉCTRICO", caja: "LA CAJA DE MÚSICA ROTA" };
/** Jefe secreto de la expedición: hash de la semilla de la run (sin rng()), fijo en todas las vueltas. */
export const finalOf = (seed: number): FinalKind => FINAL_POOL[Math.floor(mix(seed + 0xf1a1) * FINAL_POOL.length)];

export type Phase = "stage" | "teleporter" | "stay" | "pact" | "route" | "overload" | "guest" | "vote" | "final" | "won";
/** Lo que pasó en un paso; es también la clave de la frase del Director. */
export type Ev = "tele_land" | "tele_ready" | "overload" | "guest" | "stay" | "pact_offer" | "pact_yes" | "pact_no" | "route_offer" | "advance" | "vote" | "encore" | "final_act" | "won";
export type Run = {
  seed: number; loop: number; stage: number; phase: Phase;
  stageT: number;   // segundos en el escenario (solo corre en `stage`)
  timer: number;    // segundos que quedan de la ventana abierta (decisión, estadía o votación)
  landed: boolean;  // el teleportador ya aterrizó en este escenario
  stayT: number;    // segundos quedándose en este escenario (suben la amenaza)
  stays: number;    // veces que se eligió quedarse en este escenario
  pacts: { id: string; left: number }[]; // pactos activos; left = escenarios que les quedan contando el actual (Infinity = resto de la run)
  offer: [string, string] | null;        // ids ofrecidos mientras la fase es `pact`
  routes: [number, number] | null;       // índices de VARIANTS ofrecidos mientras la fase es `route` (destinos del escenario siguiente)
  route: number | null;                  // destino elegido para el escenario actual (null = el que sortea variantOf)
  guest: (typeof GUESTS)[number] | null; // minijefe invitado mientras la fase es `guest`
  taken: string[];  // R5: ids de los pactos aceptados en toda la run, en orden (para el reporte)
  went: number[];   // R5: índices de VARIANTS elegidos como destino en toda la run, en orden
  lp: { off: number; yes: number; bold: number }; // vuelta actual: pactos ofrecidos y aceptados, destinos elegidos que eran los de más riesgo (secretos)
  stayN: number;    // H17: veces que se eligió quedarse en toda la expedición (cada una suma ENC.stayScrap de tornillos)
  known: readonly string[]; // secretos ya guardados en el perfil (save.encore.secrets): habilitan los pactos especiales
  found: SecretId[]; // secretos del Director descubiertos en esta run (main.ts los pasa a save.encore.secrets)
  first?: boolean;  // primera expedición del guardado (encore_run.ts lo fija): no ofrece pactos
  hold?: boolean;   // la oferta de pactos abierta es la primera de la vida del guardado: sin reloj, espera la elección
};
/** R3: eventos del teleportador al abordarlo. */
export type TeleEvent = "OVERLOAD" | "BOSS_GUEST" | "NINGUNO";
export const GUESTS = ["rey", "cortadora", "tarantula", "gato"] as const;

export const newRun = (seed: number, known: readonly string[] = []): Run => ({ seed, loop: 0, stage: 0, phase: "stage", stageT: 0, timer: 0, landed: false, stayT: 0, stays: 0, pacts: [], offer: null, routes: null, route: null, guest: null, taken: [], went: [], lp: { off: 0, yes: 0, bold: 0 }, stayN: 0, known, found: [] });

/** Semilla de cada escenario: (seed, 0, 0) es la de la run; la votación y el FINAL ACT usan los índices `stages` y `stages + 1`. */
export const stageSeed = (seed: number, loop: number, stage: number) => (seed + loop * 0x9e3779b1 + stage * 0x85ebca6b) >>> 0;

/** Índice de escenario que le toca a la semilla según la fase (la votación y el FINAL ACT son escenarios propios). */
export const sceneIdx = (r: Run) => (r.phase === "vote" ? ENC.stages : r.phase === "final" || r.phase === "won" ? ENC.stages + 1 : r.stage);

/** Segundos de dificultad que se suman al reloj del escenario: sube por escenario, por vuelta y mientras uno se queda. */
export const paceOf = (r: Run) => (r.loop * ENC.stages + r.stage) * ENC.paceStageS + r.stayT * ENC.stayRamp;

const reset = (r: Run) => { r.phase = "stage"; r.stageT = 0; r.timer = 0; r.landed = false; r.stayT = 0; r.stays = 0; r.offer = null; r.routes = null; r.route = null; r.guest = null; };
/** Se sale de un escenario (o de la votación): cada pacto con duración pierde uno y los vencidos se van. */
const leave = (r: Run) => { r.pacts = r.pacts.map((a) => ({ id: a.id, left: a.left - 1 })).filter((a) => a.left > 0); };
function advance(r: Run): Ev {
  leave(r);
  if (r.stage + 1 < ENC.stages) { r.phase = "route"; r.offer = null; r.routes = routeOffer(r); r.timer = ENC.routeS; return "route_offer"; } // el escenario siguiente se elige antes de cargarlo
  if (r.lp.off >= 2 && !r.lp.yes) discover(r, "audiencia"); // la vuelta se cerró sin firmar nada
  if (r.lp.bold >= ENC.stages - 1) discover(r, "bambalinas"); // todos los destinos de la vuelta fueron los de más riesgo
  r.phase = "vote"; r.timer = ENC.voteS; return "vote";
}
function vote(r: Run, i: 0 | 1): Ev {
  leave(r);
  if (i === 0) { r.loop++; r.stage = 0; reset(r); r.lp = { off: 0, yes: 0, bold: 0 }; return "encore"; }
  r.phase = "final"; r.stageT = 0; return "final_act";
}

/** AVANZAR elegido: si queda un escenario por jugar y hay dos pactos libres, el Director ofrece antes de cargarlo (con la ventana vencida, el show avanza solo y no ofrece). */
function go(r: Run): Ev {
  const o = r.stage + 1 < ENC.stages && !r.first ? pactOffer(r) : null;
  if (!o) return advance(r);
  r.phase = "pact"; r.offer = o; r.timer = ENC.pactS; r.lp.off++; return "pact_offer";
}
/** Responde a la oferta: 0 o 1 acepta ese pacto, 2 (o ventana vencida) rechaza sin penalidad. Después carga el escenario siguiente. */
function choosePact(r: Run, i: 0 | 1 | 2): Ev {
  r.hold = false;
  const id = i === 2 ? undefined : r.offer?.[i];
  if (id) { r.lp.yes++; r.taken.push(id); r.pacts.push({ id, left: pactOf(id).stages + 1 }); } // el +1 lo descuenta el `leave` de este mismo avance
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
  } else if (r.phase === "overload") {
    if ((r.timer -= dt) <= 0) return ready(r);
  } else if (r.phase === "stay") {
    r.stayT += dt;
    if ((r.timer -= dt) <= 0) { r.phase = "teleporter"; r.timer = ENC.decideS; if (++r.stays >= 3) discover(r, "eco"); return "tele_ready"; }
  } else if (r.phase === "pact") {
    if (!r.hold && (r.timer -= dt) <= 0) return choosePact(r, 2);
  } else if (r.phase === "route") {
    if ((r.timer -= dt) <= 0) return chooseRoute(r, 0);
  } else if (r.phase === "vote") {
    if ((r.timer -= dt) <= 0) return vote(r, 0);
  } else if (r.phase === "final") r.stageT += dt;
  return null;
}

const ready = (r: Run): Ev => { r.phase = "teleporter"; r.timer = ENC.decideS; return "tele_ready"; };
/** Evento del teleportador de este escenario: hash propio de (semilla, vuelta, escenario), sin gastar el rng() de la partida; la probabilidad sube con el escenario y la vuelta. */
export function teleEvent(r: Run): TeleEvent {
  const p = Math.min(ENC.eventMax, ENC.eventP0 + ENC.eventStep * (r.loop * ENC.stages + r.stage));
  const u = mix(r.seed + 0x3e1f + r.loop * 104723 + r.stage * 15485867);
  return u >= p ? "NINGUNO" : u < p / 2 ? "OVERLOAD" : "BOSS_GUEST";
}
/** El auto activó el teleportador: abre la decisión, o antes un evento (OVERLOAD: aguantar la carga; BOSS_GUEST: vencer al invitado). */
export function boarded(r: Run): Ev | null {
  if (r.phase !== "stage" || !r.landed) return null;
  const e = teleEvent(r);
  if (e === "OVERLOAD") { r.phase = "overload"; r.timer = ENC.overloadS; return "overload"; }
  if (e === "BOSS_GUEST") { r.phase = "guest"; r.guest = GUESTS[Math.floor(mix(r.seed + 0x6e57 + r.loop * 7907 + r.stage * 32452867) * GUESTS.length)]; return "guest"; }
  return ready(r);
}
/** El invitado cayó: el teleportador queda listo. */
export function guestDown(r: Run): Ev | null { if (r.phase !== "guest") return null; r.guest = null; return ready(r); }

/** Responde a la oferta de destinos: el escenario siguiente toma la variante elegida (y su recompensa). */
function chooseRoute(r: Run, i: 0 | 1): Ev {
  const [a, b] = r.routes!, v = r.routes![i];
  if (riskOf(v) >= riskOf(i ? a : b)) r.lp.bold++;
  r.went.push(v);
  r.stage++; reset(r); r.route = v;
  return "advance";
}

/** Elige la opción 0 o 1 de lo que muestre `ask` (2 = rechazar, solo en la oferta de pactos). */
export function pick(r: Run, i: 0 | 1 | 2): Ev | null {
  if (r.phase === "pact") return choosePact(r, i);
  if (i === 2) return null;
  if (r.phase === "route") return chooseRoute(r, i);
  if (r.phase === "teleporter") { if (i === 1) return go(r); r.phase = "stay"; r.timer = ENC.stayS; r.stayN++; return "stay"; }
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
export type Pact = { id: string; name: string; tag: string; stages: number; gain: Partial<Fx> & { heal?: number }; cost: Partial<Fx> & { heal?: number }; secret?: string; zona?: [string, "gain" | "cost"] }; // zona: línea de la carta que nombra la zona del piso (src/pact_zones.ts) y de qué lado cae
// ponytail: valores provisorios y sin playtest; el voto de equipo, el secreto y los pactos QUICK del diseño necesitan cooperativo y quedan fuera.
type PactTxt = Omit<Pact, "stages" | "gain" | "cost">;
// Números de la tabla `pactos` de balance.json: columnas g_<efecto> (ventaja) y c_<efecto> (costo); el valor neutro (1, o 0 en regen/heal) = el pacto no lo toca.
const pactNums = (t: PactTxt): Pact => {
  const row = BAL.pactos[t.id] as unknown as Record<string, number>;
  const side = (s: string) => Object.fromEntries(["dmg", "speed", "maxHp", "xp", "scrap", "spawn", "taken", "regen", "heal"].map((k) => [k, row[`${s}_${k}`]]).filter(([k, v]) => v !== (k === "regen" || k === "heal" ? 0 : 1)));
  return { ...t, stages: row.etapas || Infinity, gain: side("g"), cost: side("c") };
};
export const PACTS: Pact[] = ([
  { id: "garantia", name: "SALUD EN GARANTÍA", tag: "GARANTÍA" },
  { id: "sorpresa", name: "PRODUCCIÓN SORPRESA", tag: "SORPRESA", zona: [`ZONA FOCO EN EL PISO: XP x${BAL.pactosZonas.foco.valor}`, "gain"] },
  { id: "chatarra", name: "DOBLE O CHATARRA", tag: "CHATARRA" },
  { id: "patrocinio", name: "PATROCINIO DEFECTUOSO", tag: "PATROCINIO", zona: ["ZONA CABLES PELADOS EN EL PISO: DAÑAN", "cost"] },
  { id: "maquillaje", name: "RETOQUE DE MAQUILLAJE", tag: "RETOQUE", zona: ["ZONA CAMERINO EN EL PISO: CURA", "gain"] },
  { id: "ensayo", name: "ENSAYO GENERAL", tag: "ENSAYO" },
  { id: "entradas", name: "ENTRADAS AGOTADAS", tag: "ENTRADAS" },
  { id: "blindaje", name: "CAMERINO BLINDADO", tag: "BLINDAJE", zona: ["ZONA PEGAMENTO EN EL PISO: FRENA", "cost"] },
  { id: "seguro", name: "SEGURO DE ESCENA", tag: "SEGURO" },
  { id: "nocturno", name: "PROGRAMA NOCTURNO", tag: "NOCTURNO", zona: ["ZONA TRAMPILLA EN EL PISO: ESCUPE ENEMIGOS", "cost"] },
  { id: "cobro", name: "COBRO AL FINAL", tag: "COBRO", zona: ["ZONA IMÁN EN EL PISO: ATRAE TORNILLOS", "gain"] },
  { id: "bis", name: "¿UN BIS?", tag: "BIS" },
  { id: "permanencia", name: "CLÁUSULA DE PERMANENCIA", tag: "PERMANENCIA" },
  // Pactos del Director: uno por secreto del perfil, solo se ofrecen con ese secreto descubierto (más fuertes que los comunes; el costo habla del arco).
  { id: "aplausos", name: "APLAUSOS ENLATADOS", tag: "APLAUSOS", secret: "aplausos" }, // la ovación no tiene cable: nadie aprende nada de ella
  { id: "audiencia", name: "PÚBLICO FANTASMA", tag: "PÚBLICO", secret: "audiencia" }, // cero espectadores: el aforo se paga con carrocería
  { id: "eco", name: "TOMA REPETIDA", tag: "TOMA", secret: "eco" }, // la escena se repite, y los enemigos con ella
  { id: "bambalinas", name: "SEÑAL IMPOSIBLE", tag: "SEÑAL", secret: "bambalinas" }, // llega de donde no hay emisor, y golpea igual
] as PactTxt[]).map(pactNums);
export const pactOf = (id: string): Pact => PACTS.find((p) => p.id === id)!;
export const NO_FX: Fx = { dmg: 1, speed: 1, maxHp: 1, xp: 1, scrap: 1, spawn: 1, taken: 1, regen: 0 };
const FX_KEYS = Object.keys(NO_FX) as (keyof Fx)[];
/** Efecto combinado de los pactos activos (multiplica; regen suma). Con null o sin pactos es NO_FX: la Supervivencia no cambia. */
export function pactFx(r: Run | null): Fx {
  const f = { ...NO_FX };
  const objs: Partial<Fx>[] = [];
  if (r) { for (const a of r.pacts) { const p = pactOf(a.id); objs.push(p.gain, p.cost); } if (r.route !== null) objs.push(VARIANTS[r.route].reward); } // la recompensa del destino elegido vale solo en ese escenario (reset la borra)
  if (r?.stayN) f.scrap *= 1 + ENC.stayScrap * r.stayN; // H17: premio por quedarse
  for (const o of objs) for (const k of FX_KEYS) { const v = o[k]; if (v !== undefined) f[k] = k === "regen" ? f[k] + v : f[k] * v; }
  return f;
}
/** Los dos pactos de la oferta de este escenario, o null si no quedan dos libres. Hash propio de (semilla, vuelta, escenario): no gasta el rng() de la partida. */
export function pactOffer(r: Run): [string, string] | null {
  const key = (i: number) => mix(r.seed + 0x5ac7 + r.loop * 7919 + r.stage * 15485863 + i * 104729);
  const free = PACTS.map((p, i) => ({ p, k: key(i) })).filter(({ p }) => !r.pacts.some((a) => a.id === p.id)).sort((a, b) => a.k - b.k);
  const com = free.filter(({ p }) => !p.secret), sp = free.filter(({ p }) => p.secret && (r.known.includes(p.secret) || r.found.includes(p.secret as SecretId)));
  if (com.length >= 2 && sp.length && key(99) < 0.3) return [com[0].p.id, sp[0].p.id]; // 30%: un solo especial por oferta (el primero por hash), nunca dos
  return com.length < 2 ? null : [com[0].p.id, com[1].p.id];
}
const LABEL: Record<keyof Fx, string> = { dmg: "DAÑO", speed: "VELOCIDAD", maxHp: "VIDA MÁXIMA", xp: "XP", scrap: "TORNILLOS", spawn: "ENEMIGOS", taken: "DAÑO RECIBIDO", regen: "VIDA/S" };
/** Términos de un lado del pacto como líneas para la UI: "+35% DAÑO", "-30% VIDA MÁXIMA", "+2 VIDA/S", "REPARA 60% DE LA VIDA AL ACEPTAR". */
export function fxText(o: Pact["gain"]): string[] {
  const t = FX_KEYS.filter((k) => o[k] !== undefined).map((k) => { const v = o[k]!; if (k === "regen") return `+${v} ${LABEL[k]}`; const pc = Math.round((v - 1) * 100); return `${pc > 0 ? "+" : "-"}${Math.abs(pc)}% ${LABEL[k]}`; });
  if (o.heal) t.push(`REPARA ${Math.round(o.heal * 100)}% DE LA VIDA AL ACEPTAR`);
  return t;
}
const durText = (n: number) => (n === Infinity ? "RESTO DE LA RUN" : n === 1 ? "PRÓXIMO ESCENARIO" : `PRÓXIMOS ${n} ESCENARIOS`);
export type PactView = { special: boolean; name: string; gain: string[]; cost: string[]; dur: string };
const viewOf = (p: Pact): PactView => ({ special: !!p.secret, name: p.secret ? `PACTO DEL DIRECTOR: ${p.name}` : p.name, gain: [...fxText(p.gain), ...(p.zona?.[1] === "gain" ? [p.zona[0]] : [])], cost: [...fxText(p.cost), ...(p.zona?.[1] === "cost" ? [p.zona[0]] : [])], dur: durText(p.stages) });
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
  ship: "bombardera" | "abductora" | "caza" | null;
  zone?: EarthZone;                         // escenario terrestre propio: se juega eligiéndolo como destino; los biomas terrestres (EARTH_ZONES) también entran en el sorteo del escenario terrestre de cada vuelta
  mini?: Kind;                              // H13: si existe, el minijefe es este enemigo en vez de una nave // minijefe fijo (null = el que elija la semilla)
  risk: string; reward: Partial<Fx>; // cómo se ofrece como destino: riesgo (texto) y recompensa (se aplica de verdad en pactFx; el texto sale de ella)
};
export const VARIANTS: Variant[] = [
  { name: "LA TARIMA", line: "EL CLÁSICO: ARENA TIBIA Y ROCAS ROJAS.", at: "salida", craters: [0, 0, 0], rain: 1, quake: 1, sky: 1, ship: null, risk: "SIN SORPRESAS", reward: { xp: 1.1 } },
  { name: "EL LADO OSCURO", line: "SIN SOL NI PÚBLICO. SOLO ALUMBRA EL NEÓN.", at: "oscuro", craters: [5, 4, 8], rain: 1.4, quake: 0.55, sky: 1, ship: "abductora", risk: "SIN SOL · MÁS METEORITOS", reward: { xp: 1.3 } },
  { name: "CAMPO DE CRÁTERES", line: "EL PISO ES UN QUESO. LOS METEORITOS ESTÁN DE GIRA.", at: "tierra", craters: [10, 5, 11], rain: 0.6, quake: 1.6, sky: 1, ship: "caza", risk: "MÁS CRÁTERES Y ERUPCIONES", reward: { scrap: 1.3 } },
  { name: "SOL DE FRENTE", line: "REFLECTORES AL MÁXIMO. EL SOL TAMBIÉN TIRA.", at: "sol", craters: [3, 3, 6], rain: 1.2, quake: 1, sky: 0.55, ship: "bombardera", risk: "EL SOL DISPARA MÁS", reward: { scrap: 1.15, xp: 1.15 } },
  { name: "LLUVIA DE CHATARRA", line: "NEÓN Y CHATARRA DEL CIELO. NADIE PIDIÓ PARAGUAS.", at: "oscuro", craters: [4, 3, 6], rain: 0.45, quake: 1.2, sky: 1.3, ship: "caza", risk: "SIN SOL · METEORITOS SEGUIDOS", reward: { scrap: 1.4 } },
  { name: "NOCHE DE ESTRENO", line: "CARTELES MAGENTA Y CIAN, NAVES DE INVITADAS. QUÉ GALA.", at: "sol", craters: [2, 3, 5], rain: 1.3, quake: 1.2, sky: 0.7, ship: "abductora", risk: "MÁS NAVES Y LANZAMIENTOS", reward: { xp: 1.25 } },
  { name: "ENSAYO DE MEDIANOCHE", line: "NADIE DUERME. LA PRODUCCIÓN TAMPOCO, Y SE NOTA.", at: "tierra", craters: [8, 4, 9], rain: 0.5, quake: 1.4, sky: 0.8, ship: null, mini: "proyector", risk: "METEORITOS, ERUPCIONES Y LANZAMIENTOS", reward: { xp: 1.2, scrap: 1.2 } },
  { name: "EL GALPÓN DE UTILERÍA", line: "LA GRÚA DE FERIA ENSAYA SU NÚMERO ENTRE CAJAS.", at: "salida", craters: [0, 0, 0], rain: 1, quake: 1, sky: 1, ship: null, mini: "grua", zone: "galpon", risk: "SIN LUNA · LA GRÚA DE FERIA COMO MINIJEFE", reward: { scrap: 1.35, xp: 1.15 } },
  { name: "EL DESVÁN DE JUGUETES ROTOS", line: "UN PAYASO DE RESORTE SALTA SOLO.", at: "salida", craters: [0, 0, 0], rain: 1, quake: 1, sky: 1, ship: null, mini: "payaso", zone: "desvan", risk: "SIN LUNA · EL PAYASO DE RESORTE COMO MINIJEFE", reward: { scrap: 1.3, xp: 1.2 } },
  { name: "LA PILETA VACÍA", line: "EL LIMPIAFONDOS SIGUE DE GUARDIA, SIN AGUA Y SIN NADIE.", at: "salida", craters: [0, 0, 0], rain: 1, quake: 1, sky: 1, ship: null, mini: "limpiafondos", zone: "pileta", risk: "SIN LUNA · EL LIMPIAFONDOS COMO MINIJEFE · DESNIVELES", reward: { scrap: 1.35, xp: 1.25 } },
  // Minijefe: el de la semilla (sin `mini`) hasta que exista uno de cocina (TODO(enemigos-cocina) en zones/cocina.ts)
  { name: "LA COCINA", line: "EL HORNO QUEDÓ PRENDIDO Y ALGO SE MUEVE ENTRE LAS MIGAS.", at: "salida", craters: [0, 0, 0], rain: 1, quake: 1, sky: 1, ship: null, zone: "cocina", risk: "SIN LUNA · MÁS BICHOS DE COCINA", reward: { scrap: 1.3, xp: 1.2 } },
  // Biomas: también salen en el sorteo de la vuelta (EARTH_ZONES); acá como destino con recompensa
  { name: "EL BOSQUE DE PINOS", line: "ENTRE LOS PINOS SE OYEN PATAS. MUCHAS.", at: "salida", craters: [0, 0, 0], rain: 1, quake: 1, sky: 1, ship: null, zone: "bosque", risk: "SIN LUNA · TRONCOS Y ROCAS DE BORDE", reward: { scrap: 1.3, xp: 1.2 } },
  { name: "LA PISTA NEVADA", line: "EL PISO RESBALA Y EL PÚBLICO TIEMBLA.", at: "salida", craters: [0, 0, 0], rain: 1, quake: 1, sky: 1, ship: null, zone: "nieve", risk: "SIN LUNA · NIEVE Y CERCOS", reward: { scrap: 1.35, xp: 1.2 } },
  { name: "LA CIUDAD EN MINIATURA", line: "CALLES ANGOSTAS Y ESQUINAS CIEGAS.", at: "salida", craters: [0, 0, 0], rain: 1, quake: 1, sky: 1, ship: null, zone: "ciudad", risk: "SIN LUNA · CALLES ANGOSTAS", reward: { scrap: 1.3, xp: 1.25 } },
  { name: "EL POLÍGONO INDUSTRIAL", line: "CONTENEDORES, TAMBORES Y NADIE DE TURNO.", at: "salida", craters: [0, 0, 0], rain: 1, quake: 1, sky: 1, ship: null, zone: "industrial", risk: "SIN LUNA · CONTENEDORES Y TAMBORES", reward: { scrap: 1.35, xp: 1.25 } },
];
/** Hash sin estado: n → [0, 1). Un paso de mulberry32. */
const mix = (n: number) => { let t = (n + 0x6d2b79f5) | 0; t = Math.imul(t ^ (t >>> 15), 1 | t); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
/** Variante del escenario actual (null en la votación y el FINAL ACT). Una vuelta usa todas las variantes sin repetir; el primer escenario de la run es siempre LA TARIMA, donde arranca el auto. */
export function variantOf(r: Run): Variant | null {
  const idx = sceneIdx(r);
  if (idx >= ENC.stages) return null;
  if (r.route !== null) return VARIANTS[r.route]; // destino elegido
  const o = VARIANTS.flatMap((v, i) => (v.zone ? [] : [i])); // el sorteo solo usa las lunares: las de zona se juegan por elección
  for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(mix(r.seed + r.loop * 7919 + i * 104729) * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } // Fisher-Yates con el hash
  if (!r.loop) o.unshift(...o.splice(o.indexOf(0), 1)); // vuelta 0: LA TARIMA primero
  return VARIANTS[o[idx % o.length]];
}
/** Minijefe de enemigo de la variante actual (H13). El desván alterna entre el payaso y el muñeco de ventrílocuo según la semilla; el resto usa el fijo de la variante. */
export function miniOf(r: Run): Kind | null {
  const v = variantOf(r);
  if (v?.zone === "desvan") return mix(r.seed + 0xd357 + r.loop * 7919 + r.stage * 104729) < 0.5 ? "payaso" : "muneco";
  return v?.mini ?? null;
}
/** Variantes ya jugadas en la vuelta: la del primer escenario (sorteo) y los destinos elegidos después (los últimos `stage` de `went`). */
const playedInLoop = (r: Run) => [VARIANTS.indexOf(variantOf({ ...r, stage: 0, route: null, phase: "stage" })!), ...(r.stage ? r.went.slice(-r.stage) : [])];
/** Los dos destinos del escenario siguiente: variantes distintas y no jugadas en esta vuelta, estables por (semilla, vuelta, escenario) con hash propio (no gasta el rng() de la partida). */
export function routeOffer(r: Run): [number, number] {
  const played = playedInLoop(r);
  const o = VARIANTS.map((_, i) => ({ i, k: mix(r.seed + 0x70e1 + r.loop * 6151 + (r.stage + 1) * 32452843 + i * 49979687) })).filter(({ i }) => !played.includes(i) && (r.loop > 0 || !VARIANTS[i].zone)).sort((a, b) => a.k - b.k);
  return [o[0].i, o[1].i];
}
/** Riesgo de un destino: el producto de su recompensa (el Director paga más por lo más peligroso). */
export const riskOf = (i: number) => Object.values(VARIANTS[i].reward).reduce((a, x) => a * (x ?? 1), 1);
/** Riesgo y recompensa de un destino para la UI (misma forma que un pacto: VENTAJA = recompensa, COSTO = riesgo). */
const routeView = (i: number): PactView => { const v = VARIANTS[i]; return { special: false, name: v.name, gain: fxText(v.reward), cost: [v.risk], dur: "PRÓXIMO ESCENARIO" }; };

/** Cráteres extra de la variante: ángulo, distancia (m) a la llegada y radio; nunca a menos de 14 m de la llegada. */
export function craterPlan(v: Variant, r: Run): { a: number; d: number; r: number }[] {
  const base = stageSeed(r.seed, r.loop, sceneIdx(r)), [n, lo, hi] = v.craters;
  return Array.from({ length: n }, (_, i) => { const rad = lo + mix(base + i * 3 + 1) * (hi - lo); return { a: mix(base + i * 3) * Math.PI * 2, d: 14 + rad + mix(base + i * 3 + 2) * 32, r: rad }; });
}

/** Para el HUD: título de la ventana abierta, textos de los dos botones (null = sin botón) y duración total; en la oferta, además los términos de cada pacto y el botón de rechazo. */
export function ask(r: Run): { title: string; opts: [string | null, string | null]; total: number; pacts?: [PactView, PactView]; reject?: string } | null {
  if (r.phase === "pact" && r.offer) { const [a, b] = r.offer.map((id) => viewOf(pactOf(id))); return { title: "PACTO DEL DIRECTOR", opts: [a.name, b.name], total: ENC.pactS, pacts: [a, b], reject: "RECHAZAR" }; }
  if (r.phase === "route" && r.routes) { const [a, b] = [routeView(r.routes[0]), routeView(r.routes[1])]; return { title: "ELIJAN EL DESTINO", opts: [a.name, b.name], total: ENC.routeS, pacts: [a, b] }; }
  if (r.phase === "overload") return { title: "SOBRECARGA · AGUANTEN LA CARGA", opts: [null, null], total: ENC.overloadS };
  if (r.phase === "teleporter") return { title: "TELEPORTADOR LISTO", opts: [`QUEDARSE · COFRE EXTRA Y +${Math.round(ENC.stayScrap * 100)}% TORNILLOS`, "AVANZAR"], total: ENC.decideS };
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
export type LineId = Ev | "start" | "boss_intro" | "hint";
const LINES: Record<Exclude<LineId, "hint">, string[]> = {
  start: ["¡LUCES ENCENDIDAS! GRAVEDAD OPCIONAL, DIGNIDAD NO INCLUIDA.", "SONRÍAN PARA EL PÚBLICO. NO PREGUNTEN DÓNDE ESTÁ EL PÚBLICO.", "EL TELÓN SUBE. EL SEGURO DE VIDA, EN CAMBIO, BAJÓ."],
  tele_land: ["¡LLEGÓ EL TELEPORTADOR! QUÉ DECEPCIÓN PARA EL EQUIPO DE ESCONDITES.", "TELEPORTADOR EN ESCENA. LA PRODUCCIÓN LO ESCONDIÓ CON CARIÑO.", "EL TELEPORTADOR YA ESTÁ EN ESCENA. FINJAN SORPRESA, POR EL PÚBLICO."],
  tele_ready: ["LA PUERTA ESTÁ ABIERTA. ¿SE QUEDAN O CAMBIAMOS DE CANAL?", "¡ELENCO LISTO! QUE NADIE OLVIDE RESPIRAR. DECIDAN.", "PUERTA LISTA. EL PÚBLICO ADMIRA A LOS QUE DECIDEN RÁPIDO."],
  overload: ["SOBRECARGA EN EL TELEPORTADOR. LA CARGA ES LENTA, LOS VISITANTES NO.", "EL TELEPORTADOR SE ESTÁ CALENTANDO. AGUANTEN, QUE EL PÚBLICO APUESTA.", "CARGA AL LÍMITE. SI EXPLOTA, SERÁ UN GRAN NÚMERO FINAL."],
  guest: ["EL TELEPORTADOR NECESITA UN INVITADO. VENZAN AL INVITADO Y LA PUERTA SE ABRE.", "PERMÍTANME PRESENTAR A UN ALLEGADO. NO LO HICIERON ENOJAR, SOLO LLEGÓ ASÍ.", "HAY UN INVITADO ESPECIAL. TRAJO SU PROPIO ESCÁNDALO."],
  stay: ["¿SE QUEDAN? ¡ADORO LA INSISTENCIA! LA PRODUCCIÓN TAMBIÉN.", "OTRA TOMA, ENTONCES. LOS PELIGROS SE ESTIRAN, ASÍ QUE ESTÍRENSE.", "¿OTRA VEZ AQUÍ? LA PRODUCCIÓN LO TOMA COMO UN CUMPLIDO."],
  pact_offer: ["TENGO DOS TRATOS PARA USTEDES. LA LETRA CHICA ESTÁ A LA VISTA.", "UN PACTO, SIN PRESIONES. BUENO, CON POCA PRESIÓN.", "HOY HAY OFERTA ESPECIAL. LA LETRA CHICA ES LO ÚNICO CHICO."],
  pact_yes: ["¡TRATO HECHO! ME ENCANTAN LOS CLIENTES CON FE.", "FIRMADO. YO CUMPLO, ASÍ QUE CUMPLAN USTEDES.", "UNA FIRMA Y LISTO. QUÉ BONITA CALIGRAFÍA PARA SER CHATARRA."],
  pact_no: ["¿NADA? PRUDENTE. ABURRIDO, PERO PRUDENTE.", "SIN TRATO, SIN RENCORES. LA OFERTA SE ENFRÍA.", "SIN PACTO. EL DIRECTOR ANOTA SU DECEPCIÓN EN LA LIBRETA."],
  route_offer: ["DOS PUERTAS, DOS PROBLEMAS DISTINTOS. ELIJAN EL QUE MEJOR PAGUE.", "EL PRÓXIMO ESCENARIO TIENE DOS VERSIONES. LA RECOMPENSA CRECE CON EL RIESGO.", "DOS CAMINOS AL SIGUIENTE ACTO. NINGUNO TIENE BARANDA."],
  advance: ["¡CAMBIO DE ESCENARIO! NO TOQUEN NADA, ES UTILERÍA.", "SIGUIENTE ESCENA. EL ESCENARIO ES NUEVO, LOS PROBLEMAS SON DE ARCHIVO.", "TELÓN NUEVO, MISMA FUNCIÓN. PROHIBIDO IMPROVISAR CON EL DECORADO."],
  vote: ["¡FIN DEL CUARTO ACTO! EL PÚBLICO VOTA: ¡ENCORE! O FINAL ACT.", "EL PÚBLICO ESTÁ DIVIDIDO. YO, NO: QUIERO UN FINAL ESPECTACULAR.", "CAE EL TELÓN DEL ACTO. EL PÚBLICO VOTA Y YO TOMO NOTA."],
  encore: ["¡OTRA VUELTA! EL PÚBLICO EXIGE MÁS. Y YO SOY EL PÚBLICO.", "¡QUE EMPIECE EL BIS! ESTA VEZ CON MÁS ENTUSIASMO DE MI PARTE.", "EL PÚBLICO PIDIÓ BIS. QUÉ GENEROSIDAD LA SUYA CON SU VIDA."],
  final_act: ["¡EL ÚLTIMO ACTO! NADIE ABANDONA EL ESCENARIO ANTES DEL APLAUSO.", "FINAL ACT. APAGUEN SUS CELULARES, ENCIENDAN SUS MOTORES.", "SE ACABAN LOS ENSAYOS. ESTE ACTO SÍ SALE EN LA ETIQUETA."],
  boss_intro: ["LES PREPARÉ UN INVITADO. NO ESPEREN BUENOS MODALES.", "EL INVITADO ESTELAR YA SALIÓ. NO LE MOLESTEN LA ENTRADA.", "ÚLTIMO INVITADO DE LA NOCHE. DE RECIBIRLO ME OCUPO YO, DESDE LEJOS."],
  won: ["¡GANADORES! NO CONFUNDAN ESTO CON HABER ESCAPADO.", "APLAUSOS, DE VERDAD. QUÉ RARO: ES LA PRIMERA VEZ QUE NO MIENTO.", "FIN DE LA FUNCIÓN. LA GANANCIA ES MÍA, LA GLORIA ES SUYA."],
};
/** Memoria entre runs (save.encore): la primera frase de la expedición la menciona. */
export type Mem = { best: { loop: number }; runs: number; lastLoop: number; lastCause: string };
export function openingLine(m: Mem | undefined): string | null {
  if (!m || !m.runs) return null;
  if (m.lastCause) return `VOLVIÓ QUIEN CAYÓ EN LA VUELTA ${m.lastLoop + 1}. LA CULPA FUE DE «${m.lastCause.toUpperCase()}». EL PÚBLICO NO OLVIDA.`;
  if (m.best.loop > 0) return `OTRA VEZ AQUÍ. EXPEDICIÓN ${m.runs + 1}. LA MEJOR LLEGÓ A LA VUELTA ${m.best.loop + 1}: SUPÉRENLA.`;
  return `OTRA VEZ AQUÍ. EXPEDICIÓN ${m.runs + 1} Y EL PÚBLICO SIGUE SIN APLAUDIR.`;
}
export function line(id: LineId, r: Run, mem?: Mem): string {
  if (id === "hint") return hint(r) ?? "";
  if (id === "start") { const o = openingLine(mem); if (o) return o; }
  const v = LINES[id];
  const h = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, r.seed);
  return v[(Math.floor(mix(h + 0x11e5) * v.length) + r.loop * ENC.stages + r.stage + r.stays) % v.length]; // desfase por hash (semilla, momento) + avance de escenario: hay variedad entre runs y nunca se repite seguida
}

// ---------- Cola del Director (R3): sus frases no se pisan ni se pierden con la radio ----------
// Se muestran en un subtítulo propio (ui.ts dirSub), de a una, con `dirGapS` mínimo entre inicios. Gana la prioridad más alta (empate: la más vieja).
// Una frase que espera más de `dirTtlS` ya describe algo pasado y se descarta; si hay más de `dirCap` en espera se pierde la de menor prioridad.
export type DirQ = { q: { txt: string; pri: number; age: number }[]; cool: number; held?: boolean };
export const newDirQ = (): DirQ => ({ q: [], cool: 0 });
const PRI: Record<LineId, number> = { start: 3, won: 5, final_act: 5, boss_intro: 4, overload: 4, guest: 4, tele_ready: 3, vote: 3, encore: 3, tele_land: 2, advance: 2, pact_offer: 2, pact_yes: 2, pact_no: 2, route_offer: 2, hint: 2, stay: 1 };
export const dirPri = (id: LineId) => PRI[id];
export function dirPush(d: DirQ, txt: string, pri: number) {
  if (d.q.some((x) => x.txt === txt)) return;
  d.q.push({ txt, pri, age: 0 });
  if (d.q.length > ENC.dirCap) { let w = 0; d.q.forEach((x, i) => { if (x.pri < d.q[w].pri) w = i; }); d.q.splice(w, 1); }
}
/** Hay una decisión abierta (teleportador, pacto, destino, votación): el subtítulo taparía las opciones. */
export const decisionOpen = (r: Run | null) => !!r && (r.phase === "teleporter" || r.phase === "pact" || r.phase === "route" || r.phase === "vote");
/** Avanza dt segundos; devuelve la frase que toca mostrar ahora, si hay. Con `hold` (decisión abierta) las frases esperan sin envejecer; al soltar quedan las 2 más nuevas. */
export function dirTick(d: DirQ, dt: number, hold = false): string | null {
  if (hold) { d.held = true; return null; }
  if (d.held) { d.held = false; d.cool = 0; if (d.q.length > ENC.dirAfterHold) d.q.splice(0, d.q.length - ENC.dirAfterHold); } // ponytail: las viejas se descartan por orden de llegada, sin mirar prioridad
  d.cool = Math.max(0, d.cool - dt);
  for (const x of d.q) x.age += dt;
  d.q = d.q.filter((x) => x.age < ENC.dirTtlS);
  if (d.cool > 0 || !d.q.length) return null;
  let b = 0; d.q.forEach((x, i) => { if (x.pri > d.q[b].pri) b = i; });
  d.cool = ENC.dirGapS;
  return d.q.splice(b, 1)[0].txt;
}

// ---------- Primera partida guiada: avisos que se muestran una sola vez (ids guardados en save.encore.tips) ----------
export const TIPS = {
  start: "", // sin aviso largo al arrancar: cada mecánica se explica donde aparece (tele, chest, pact)
  chest: "COFRES Y MÁQUINAS DAN MEJORAS AL ACERCARSE.",
  tele: "TELEPORTADOR LISTO. ACERCARSE PARA SUBIR: QUEDARSE DA BOTÍN Y AMENAZA; AVANZAR CAMBIA DE ESCENARIO.",
  pact: "UN PACTO DA UNA VENTAJA A CAMBIO DE UN COSTO, POR UNOS ESCENARIOS. SE PUEDE RECHAZAR.",
  vote: "VOTACIÓN: ENCORE SIGUE CON OTRA VUELTA MÁS DIFÍCIL; FINAL ACT ENFRENTA AL JEFE FINAL Y CIERRA LA EXPEDICIÓN.",
} as const;
export const TIP_IDS: string[] = Object.keys(TIPS);
/** Texto del aviso si nunca se mostró (y lo marca como visto); null si ya se vio. */
export function tipOnce(e: { tips: string[] }, id: keyof typeof TIPS): string | null { if (!TIPS[id] || e.tips.includes(id)) return null; e.tips.push(id); return TIPS[id]; }

// ---------- R5: pistas del jefe secreto, arena del FINAL ACT, reporte y tornillos ----------
// Una pista por jefe y por escenario (se repiten en cada vuelta). Insinúan el jefe sin nombrarlo ni describir su forma entera.
const HINTS: Record<FinalKind, string[]> = {
  aspiradora: [
    "ALGO EN LA PRODUCCIÓN TIENE HAMBRE DE POLVO. NO PREGUNTEN POR QUÉ ESTÁ TAN LIMPIO.",
    "ESCUCHEN ESE ZUMBIDO REDONDO. SI EL PISO SE DESLIZA HACIA USTEDES, NO ES IMPRESIÓN.",
    "EL BIS TIENE UN EMPLEADO QUE NUNCA TERMINA DE BARRER. LE QUEDA POCA PACIENCIA Y MUCHA SUCCIÓN.",
    "EN BAMBALINAS HAY UN DISCO CON LUZ INTERMITENTE. SE CARGA SOLO Y NO SE DEJA ATRAPAR EN LAS ESQUINAS.",
  ],
  cortacercos: [
    "EL FINAL ACT USA CABLES. MUCHOS. NO LOS PISEN, QUE NO SON DECORACIÓN.",
    "HUELE A OZONO Y A PASTO RECIÉN CORTADO. LA PRODUCCIÓN PLANEA UN RECORTE DE PERSONAL.",
    "ALGO CHISPEA AL FONDO DEL ESCENARIO. DIRECTO, PAREJO Y CON MUY MALAS MANERAS.",
    "TIENEN UN INVITADO CON FILO. ESTÁ ENCHUFADO A TODO Y LE GUSTA PODAR EN LÍNEA RECTA.",
  ],
  caja: [
    "SE OYE UNA MELODÍA DESAFINADA DESDE EL DESVÁN. NADIE LE DIO CUERDA. NADIE SE ATREVE A PREGUNTAR.",
    "UN JUGUETE QUE SUENA SOLO NO ES UN JUGUETE, ES UN AVISO. SALTEN CUANDO EL SONIDO LES LLEGUE.",
    "ALGUIEN TIENE BAILARINAS DE PORCELANA SUELTAS POR EL ESCENARIO. NO ACEPTEN EL PRIMER VALS.",
    "LA ORQUESTA ESTÁ ROTA PERO TOCA IGUAL. EL PÚBLICO APLAUDE POR COMPASIÓN, NO POR OFICIO.",
  ],
};
/** Pista del jefe secreto para el escenario actual (null en la votación y el FINAL ACT, donde ya no hace falta). */
export const hint = (r: Run): string | null => { const h = sceneIdx(r) < ENC.stages ? HINTS[finalOf(r.seed)] : null; return h ? h[r.stage % h.length] : null; };

/** Arena propia del FINAL ACT: cráteres en anillo y focos alrededor de la salida, con luz de show (moon_events.evShow). Ángulo inicial por hash de la run. */
export const ARENA = { craters: 8, ringD: 36, craterR: 6.5, spots: 6, spotD: 58, rain: 1.5, sky: 0.8 }; // rain/sky: intervalos de meteoritos y del Sol (> 1 = menos seguido)
export function arenaPlan(r: Run): { craters: { a: number; d: number; r: number }[]; spots: { a: number; d: number }[] } {
  const base = stageSeed(r.seed, r.loop, ENC.stages + 1), a0 = mix(base) * Math.PI * 2, T = Math.PI * 2;
  return {
    craters: Array.from({ length: ARENA.craters }, (_, i) => ({ a: a0 + (i * T) / ARENA.craters, d: ARENA.ringD, r: ARENA.craterR * (0.85 + mix(base + i + 1) * 0.3) })),
    spots: Array.from({ length: ARENA.spots }, (_, i) => ({ a: a0 + ((i + 0.5) * T) / ARENA.spots, d: ARENA.spotD })),
  };
}

/** Escenarios superados: los de las vueltas anteriores, los de esta, y los cuatro si ya se llegó a la votación o más allá. */
export const cleared = (r: Run) => r.loop * ENC.stages + r.stage + (r.phase === "vote" || r.phase === "final" || r.phase === "won" ? 1 : 0);
/** Reporte de la run para la pantalla de resultados: [etiqueta, valor]. El jefe secreto se revela aquí, haya llegado o no al FINAL ACT. */
export function report(r: Run, o: { chests: number; cause: string }): [string, string][] {
  const list = (a: string[]) => (a.length ? a.join(", ") : "Ninguno");
  return [
    ["Vueltas", String(r.loop + 1)],
    ["Escenarios superados", String(cleared(r))],
    ["Pactos tomados", list(r.taken.map((id) => pactOf(id).name))],
    ["Rutas elegidas", list(r.went.map((i) => VARIANTS[i].name))],
    ["Cofres abiertos", String(o.chests)],
    ["Jefe secreto", FINAL_NAME[finalOf(r.seed)]],
    ["Causa de fin", o.cause],
  ];
}

/** Tornillos extra (o de menos) de un tramo con el multiplicador `k` de pactos y rutas vigente: lo ganado desde la última liquidación x (k - 1). main.ts lo acumula al cambiar el efecto y al salir de cada escenario. */
export const scrapExtra = (gross: number, last: number, k: number) => (gross - last) * (k - 1);

// ---------- Contenido 3: escenarios terrestres (docs/ENCORE/01_DESIGN/04_WORLDS_AND_ROUTES.md) ----------
// Desde la vuelta 1 (la segunda), un escenario de cada vuelta se juega en una zona plana presentada como escenografía del show. Zona y escenario salen de un hash de
// (semilla, vuelta), sin rng(). La votación y el FINAL ACT siguen en la Luna. La recompensa del destino elegido vale igual (pactFx lee r.route).
// ponytail: el garaje de la Supervivencia queda fuera (80 m de lado: teleportador a 80 m y cofres a 40-110 m quedarían amontonados contra la pared). En su lugar,
// el galpón (140 m, como el jardín) entra solo por la variante EL GALPÓN DE UTILERÍA (VARIANTS, `zone`): no sale en el sorteo de la vuelta.
export const EARTH = { patio: ["EL PATIO DE ENSAYO", "DECORADO DE CARTÓN, BICHOS DE VERDAD. ES SOLO UN ENSAYO, DICEN."], jardin: ["EL JARDÍN DE UTILERÍA", "PASTO DE PLÁSTICO Y ASPERSORES CON CONTRATO. NADA AQUÍ ES CASUAL."],
  galpon: ["EL GALPÓN DE UTILERÍA", "CEMENTO MANCHADO, ESTANTES DE ATREZO Y UNA MESA DE TRABAJO HACIENDO DE TARIMA."],
  desvan: ["EL DESVÁN DE LOS JUGUETES ROTOS", "TABLONES TORCIDOS, BAÚLES GIGANTES Y JUGUETES QUE YA NADIE ARREGLA."],
  pileta: ["LA PILETA VACÍA", "AZULEJOS, UNA PLAYA, UN FONDO CON RAMPA Y UN TRAMPOLÍN QUE YA NO TIENE A QUIÉN LANZAR."],
  cocina: ["LA COCINA", "BALDOSAS EN DAMERO, MESADAS COMO MURALLAS Y UNA MESA QUE HACE DE TECHO."],
  bosque: ["EL BOSQUE DE PINOS", "PINOS DE JUGUETE, MUSGO DE FIELTRO Y TRONCOS QUE HACEN DE BORDE."],
  nieve: ["LA PISTA NEVADA", "NIEVE DE TELGOPOR, HUELLAS AJENAS Y UN CERCO QUE NO FRENA A NADIE."],
  ciudad: ["LA CIUDAD EN MINIATURA", "ADOQUINES, CORDONES DE PIEDRA Y EDIFICIOS QUE MIRAN SIN INTERVENIR."],
  industrial: ["EL POLÍGONO INDUSTRIAL", "HORMIGÓN, CORDÓN AMARILLO Y NEGRO Y CONTENEDORES SIN DUEÑO."] } as const;
export type EarthZone = keyof typeof EARTH;
const EARTH_ZONES: EarthZone[] = ["patio", "jardin", "bosque", "nieve", "ciudad", "industrial"]; // los biomas también son destino; el galpón, el desván, la pileta y la cocina solo entran por su variante, no por el sorteo
/** Escenario terrestre de la vuelta (-1 en la vuelta 0). */
export const earthStage = (r: Run) => (r.loop < 1 ? -1 : Math.floor(mix(r.seed + 0xea27 + r.loop * 7907) * ENC.stages));
/** Zona del escenario actual: "luna" o la escenografía terrestre que le toca. */
export function zoneOf(r: Run): "luna" | EarthZone {
  if (sceneIdx(r) >= ENC.stages) return "luna";
  const vz = variantOf(r)?.zone; if (vz) return vz; // destino con zona propia (puede sumarse al escenario terrestre sorteado de la vuelta)
  if (!r.loop && !r.stage) return "patio"; // T54: el primer escenario de la expedición es siempre el patio, de día; la Luna viene después
  if (r.stage !== earthStage(r)) return "luna";
  return EARTH_ZONES[Math.floor(mix(r.seed + 0x2a7d + r.loop * 104723) * EARTH_ZONES.length)];
}

// ---------- Contenido 3: secretos del Director (docs/ENCORE/02_NARRATIVE/02_LORE_AND_SECRETS.md) ----------
// Cuatro hallazgos por conducta, deterministas (sin rng()): cada uno revela un fragmento del arco sin decir quién controla las pantallas.
export const SECRETS = [
  { id: "aplausos", name: "APLAUSOS SIN CABLE", how: "Abrir los tres cofres de un escenario.", lore: "UNA PANTALLA MUESTRA «APLAUSOS». NO TIENE CABLE. NUNCA LO TUVO." },
  { id: "audiencia", name: "CERO ESPECTADORES", how: "Rechazar todos los pactos de una vuelta.", lore: "UNA TERMINAL REGISTRA LA FUNCIÓN: CUATRO PARTICIPANTES, CERO ESPECTADORES." },
  { id: "eco", name: "TOMA REPETIDA", how: "Quedarse tres veces en un mismo escenario.", lore: "EL DIRECTOR REPITE UNA FRASE QUE NADIE DIJO EN ESTA FUNCIÓN. LA DICE CON VOZ DE PARTICIPANTE." },
  { id: "bambalinas", name: "SEÑAL IMPOSIBLE", how: "Elegir siempre el destino de más riesgo en una vuelta.", lore: "DETRÁS DEL TELÓN, LAS PANTALLAS RECIBEN SEÑAL DESDE LUGARES QUE NO EXISTEN." },
] as const;
export type SecretId = (typeof SECRETS)[number]["id"];
export const SECRET_IDS: readonly string[] = SECRETS.map((s) => s.id);
export function discover(r: Run, id: SecretId) { if (!r.found.includes(id)) r.found.push(id); }
/** Logros de fin de expedición (main.ts los otorga con grant): `secrets` = secretos ya guardados en el perfil, `win` = cayó el jefe del FINAL ACT. */
export function endAch(r: Run, win: boolean, secrets: readonly string[]): string[] {
  const all = new Set([...secrets, ...r.found]), out: string[] = [];
  if (SECRETS.every((s) => all.has(s.id))) out.push("encore_secretos");
  if (!win) return out;
  out.push("encore_final");
  if (r.pacts.length >= 3) out.push("encore_pactos");
  if (r.found.includes("eco")) out.push("encore_eco");
  if (r.went.includes(VARIANTS.findIndex((v) => v.name === "ENSAYO DE MEDIANOCHE"))) out.push("encore_medianoche");
  return out;
}
const SLIP = ["ESO NO ESTABA EN EL GUION.", "CORTEN. NO, NO CORTEN.", "LA PRODUCCIÓN NIEGA HABER DICHO ESTO."];
/** Frase del Director al descubrir un secreto: el desliz sale de un hash de (semilla, secreto), el fragmento es fijo. */
export function secretLine(r: Run, id: SecretId): string {
  const s = SECRETS.find((x) => x.id === id)!, h = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, r.seed);
  return `${SLIP[Math.floor(mix(h + 0x5ec7) * SLIP.length)]} ${s.lore}`;
}
