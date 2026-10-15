// ENCORE: expedición de escenarios encadenados (extraído de main.ts, Paso 3). Estado de la expedición + acciones; el mundo llega por EncoreRunContext.
import * as B from "@babylonjs/core";
import * as E from "./encore";
import { BAL } from "./balance";
import { banner, hudBoss } from "./ui";
import { clearFx, sparks } from "./fx";
import { DEF, pickWeighted, spawnTable, type Enemy, type Kind } from "./enemies";
import { encoreAmbience, SFX, SPACE } from "./sfx";
import { buildLayout, groundY, HALF, setZone, spawnPoint, zoneId } from "./world";
import { makeProfile, type Profile } from "./run";
import { seedRng } from "./rng";
import { track } from "./net";
import { persist, save } from "./menu";
import { getNet } from "./net_client";
import { grant, setHitAt, setStageHurt, stageHurt } from "./outro";
import { alignYaw, CENTER, deform, EARTH_DIR, hflat, MOON, moonCar, onFloor, ringAt, setMoon, SUN_DIR, teleport, upAt, yawOf } from "./moon";
import { evPace, evReset, evShow } from "./moon_events";
import { GOAL_IO, goalBlips, goalsClear, rocketLand, shopPlan, spotsPlan } from "./moon_goals";
import { shipFor, shipsClear } from "./moon_ships";
import { skyClear, skyPace } from "./moon_sky";
import { mateRevive, type Player } from "./coop";
import * as IV from "./encore_events";
import { lcg } from "./kit3d";
import { dimSky, setDark } from "./render";
import { utilDispose, utilFree, utilNew, utilSet, type Util } from "./models/utileria";
import { NO_ZONE, zonesDispose, zonesInit, zonesTick, type ZoneFx } from "./pact_zones";

/** Lo que la expedición necesita del resto de main.ts: propiedades (get/set) y callbacks; lo que ya es export de otro módulo se importa directo. */
export interface EncoreRunContext {
  simulating: boolean; LAB: { on: boolean }; state: string; level: number;
  lead: Player; players: Player[]; others: () => Player[];
  cam: B.FreeCamera; camH: B.Vector3; camUp: B.Vector3; camTarget: B.Vector3; camYaw: number;
  time: number; runSeed: number; profile: Profile; finalKind: Kind; RUN_BOSSES: [number, Kind][];
  swarmT: number; chestT: number; ballT: number; spawnAcc: number; groupT: number; bossIdx: number;
  apagon: boolean; shake: number; cycleS: number; guestE: Enemy | null; ovT: number;
  enemies: Enemy[]; gems: { m: B.InstancedMesh }[]; pickups: { m: B.AbstractMesh }[]; spits: { m: B.InstancedMesh }[];
  ball: { m: B.Mesh; agg: B.PhysicsAggregate; life: number; hit?: boolean } | null;
  evtPre: { swarm: boolean; ball: boolean; rain: boolean; elites: Set<number>; boss: Set<number> };
  recompute: () => void; hurt?: (n: number, continuous?: boolean, src?: string) => void; /* zonas de pacto: el daño de los cables; main.ts debe pasar hurt */ spawnEnemy: (kind: Kind, p: B.Vector3) => void; dropPickup: (pos: B.Vector3, type: "pila" | "iman" | "cofre") => void;
}
let cx!: EncoreRunContext;
export function initEncoreRun(ctx: EncoreRunContext) { cx = ctx; }

// erun = estado de la expedición (encore.ts; null = Supervivencia). encPrior = segundos de escenarios anteriores (`time` es el reloj del escenario);
// paceS = segundos de dificultad extra (E.paceOf); pfx = efecto de los pactos activos; encExtra/encG = tornillos extra liquidados y brutos al liquidarlos.
// Live bindings: main.ts los lee directo; para escribir, setErun/setEncPrior/encClear/encRecompute.
export let erun: E.Run | null = null, encPrior = 0, paceS = 0, pfx: E.Fx = E.NO_FX, dirq = E.newDirQ(), encExtra = 0, encG = 0;
export const encLog: { loop: number; stage: number; t: number }[] = []; // solo dev (__encBot)
export const setErun = (r: E.Run | null) => { erun = r; };
export const setEncPrior = (p: number) => { encPrior = p; };
/** clearRun: vuelve a Supervivencia (sin expedición, cola del Director vacía). */
export function encClear() { erun = null; encPrior = paceS = 0; encExtra = encG = 0; pfx = E.NO_FX; dirq = E.newDirQ(); saidSecrets = []; if (ip?.plan && ip.st.s && !ip.st.e) iIo.end(ip.plan.id); ip = null; dropsFree(); utilDispose(); zonesDispose(); zfx = NO_ZONE; zKey = ""; }
// Zonas de pacto (pact_zones.ts): efecto del piso sobre el auto, sumado al de los pactos. zfx lo toma recompute (velocidad, XP, tornillos, regen) y main.ts lo lee para el imán (zoneMagnet).
let zfx: ZoneFx = NO_ZONE, zKey = "", zT = 0;
export const zoneMagnet = () => zfx.magnetMul;
const zoned = (f: E.Fx): E.Fx => (f === E.NO_FX ? f : { ...f, speed: f.speed * zfx.speedMul, xp: f.xp * zfx.xpMul, scrap: f.scrap * zfx.scrapMul, regen: f.regen + zfx.regen });
/** Punto del piso bajo (x,z) del plano de las zonas. ponytail: en la luna se proyecta a la esfera; lejos del polo la distancia se distorsiona y el disco no se inclina (techo: ~40 m del polo). */
const zpt = (x: number, z: number, h = 0) => MOON.on ? onFloor(new B.Vector3(x, CENTER.y + Math.sqrt(Math.max(0, MOON.R * MOON.R - x * x - z * z)), z), h) : new B.Vector3(x, groundY(x, z) + h, z);
/** Cada cuadro (desde encApply, que main.ts llama siempre): avanza las zonas con el reloj del escenario y aplica daño, chispas y trampilla; si el efecto cambia, recompute. */
function zonesStep() {
  if (!erun || !cx.lead.car) return;
  const dt = Math.min(0.1, Math.max(0, cx.time - zT)); zT = cx.time;
  const p = cx.lead.car.pos, t = zonesTick(dt, p);
  const k = [t.regen, t.speedMul, t.xpMul, t.scrapMul, t.magnetMul].join(); // ponytail: sin histéresis; pisar el borde repite recompute (barato, pero no por cuadro)
  if (k !== zKey) { zKey = k; zfx = t; cx.recompute(); }
  if (t.dps && dt) cx.hurt?.(t.dps * dt, true, "zona cables");
  if (!cx.simulating) for (const s of t.sparks) sparks(zpt(s.x, s.z, 0.3), 3);
  if (t.spawns.length) for (const s of t.spawns) for (let i = 0; i < s.n; i++) {
    const a = (i / s.n) * Math.PI * 2;
    cx.spawnEnemy(pickWeighted(spawnTable(cx.time + paceS, cx.profile.plague)), zpt(s.x + Math.cos(a) * 1.5, s.z + Math.sin(a) * 1.5, 0.5));
  }
}
// Interrupción del Director a mitad de escenario (encore_events.ts): plan por escenario, reloj y efectos.
let ip: { key: string; plan: IV.Plan | null; st: IV.St } | null = null, iT = 0, iKind: Kind = "hormiga";
const iDrops: { p: B.Vector3; t: number; u: Util | null }[] = []; // utilería en el aire: punto de impacto, segundos que faltan y su malla (marca + objeto)
const DROP_S = 1.5, DROP_R = 2.4; // segundos de aviso/caída y radio de daño (la marca de peligro cierra hasta este radio)
let iN = 0;
const dropsFree = () => { for (const d of iDrops) if (d.u) utilFree(d.u); iDrops.length = 0; };
const iLcg = lcg(7); // ponytail: semilla fija; solo decide dónde cae la sombra (visual y daño), no el layout
const iPt = (r: number) => { const c = cx.lead.car!.pos, a = iLcg() * Math.PI * 2, d = iLcg() * r; return zpt(c.x + Math.cos(a) * d, c.z + Math.sin(a) * d, 0.2); };
const iIo: IV.Io = {
  warn: (id) => { if (cx.simulating) return; const t = IV.INT_TXT[id]; E.dirPush(dirq, t.line, 9); dirq.cool = 0; /* prioridad máxima y sin esperar el hueco: la frase sale ya y no queda detrás de otra */ banner(`PELIGRO · ${t.name}`, 2.5, { tone: "warn", tag: "DIRECTOR" }); SPACE.interrupt("aviso"); },
  start: (id) => {
    if (!cx.simulating && !save.encore.seenInts.includes(id)) { save.encore.seenInts.push(id); persist(); } // Cartelera: interrupción vista
    const c = cx.lead.car!.pos, n = BAL.interrupciones[id].valor;
    if (id === "corte") for (let i = 0; i < n; i++) cx.dropPickup(spawnPoint(c, 30, 40), "cofre");
    if (id === "sangre") iKind = pickWeighted(spawnTable(cx.time + paceS, cx.profile.plague));
    if (!cx.simulating) SPACE.interrupt(id === "utileria" ? "hit" : id);
  },
  frame: (id, dt, k) => {
    if (id === "luces" && !cx.simulating) { setDark(1 - BAL.interrupciones.luces.valor * k); if (!MOON.on) dimSky(1 - BAL.interrupciones.luces.valor * k); } // el cielo oscurece con la luz (en la luna lo pinta moon.ts)
    if (id === "corte") for (const e of cx.enemies) if (!e.def.boss) e.stun = Math.max(e.stun, 0.3); // congelados mientras dura
    if (id === "utileria") for (let i = iDrops.length - 1; i >= 0; i--) {
      const d = iDrops[i]; d.t -= dt;
      if (d.t > 0) { if (d.u) utilSet(d.u, d.p, 1 - d.t / DROP_S, DROP_R); continue; } // aviso: aro de peligro en el piso que se cierra y el objeto bajando
      iDrops.splice(i, 1); if (d.u) utilFree(d.u);
      if (!cx.simulating) { sparks(d.p, 14); SPACE.interrupt("hit"); }
      cx.shake = Math.max(cx.shake, 0.5);
      const c = cx.lead.car!.pos;
      if (Math.hypot(c.x - d.p.x, c.z - d.p.z) < DROP_R) cx.hurt?.(BAL.interrupciones.utileria.valor * cx.lead.maxHp, false, "utilería");
    }
  },
  pulse: (id) => {
    if (id === "utileria") iDrops.push({ p: iPt(7), t: DROP_S, u: cx.simulating ? null : utilNew(iN++) });
    if (id === "sangre") for (let i = 0; i < BAL.interrupciones.sangre.valor; i++) cx.spawnEnemy(iKind, spawnPoint(cx.lead.car!.pos, 24, 32));
  },
  end: (id) => {
    if (id === "luces") { setDark(1); dimSky(1); }
    if (id === "sangre") { cx.dropPickup(spawnPoint(cx.lead.car!.pos, 6, 10), "iman"); if (!cx.simulating) SPACE.interrupt("fin"); }
    dropsFree();
  },
};
function interruptStep() {
  const r = erun!, key = `${r.seed}:${r.loop}:${r.stage}`, t = cx.time;
  if (!ip || ip.key !== key) {
    if (ip?.plan && ip.st.s && !ip.st.e) iIo.end(ip.plan.id); // escenario nuevo con una en curso: apaga lo suyo
    ip = { key, st: IV.newSt(), plan: r.phase === "stage" ? IV.planOf(r.seed, r.loop, r.stage, E.zoneOf(r) === "luna", primeraVez() && !r.loop && !r.stage) : null }; dropsFree(); iT = t;
  }
  const dt = Math.min(0.1, Math.max(0, t - iT)); iT = t;
  if (ip.plan) IV.step(ip.plan, ip.st, r.stageT, dt, iIo, r.phase !== "stage" || E.decisionOpen(r));
}
/** recompute: liquida lo ganado con el efecto que se va y toma el de los pactos activos. */
export function encRecompute(g: number) { if (erun) { encExtra += E.scrapExtra(g, encG, pfx.scrap); encG = g; } pfx = zoned(E.pactFx(erun)); }

// ---------- ENCORE (encore.ts): escenarios encadenados con teleportador, votación y FINAL ACT ----------
/** Frase del Director por el aviso de radio. */
export const tip = (id: keyof typeof E.TIPS) => { if (cx.simulating || cx.LAB.on) return; const t = E.tipOnce(save.encore, id); if (t) { E.dirPush(dirq, t, 3); persist(); } }; // primera partida guiada: cada aviso sale una sola vez en la vida del guardado
export const say = (id: E.LineId, txt = E.line(id, erun!, save.encore)) => E.dirPush(dirq, txt, E.dirPri(id)); // cola propia (encore.ts): no se pisa con la radio ni entre frases
/** Agenda del escenario según la fase: un minijefe (nave); en la votación y el FINAL ACT, arena vacía donde solo entra el jefe. */
export function encPlan() {
  const r = erun!, calm = r.phase === "vote" || r.phase === "final";
  cx.finalKind = E.finalOf(r.seed); // R5: jefe secreto sorteado por la semilla de la run; en ENCORE solo el jefe del FINAL ACT cierra la partida (el gusano lunar no sale)
  cx.RUN_BOSSES = r.phase === "final" ? [[E.ENC.bossIntroS, cx.finalKind]] : calm ? [] : [[E.ENC.miniS, cx.profile.minis[0]]];
  if (calm) { cx.swarmT = cx.chestT = cx.ballT = Infinity; cx.profile.elites = []; }
}
/** Escenario nuevo con el mismo auto, armas, nivel, XP y vida: borra lo del anterior y lo rearma con la semilla derivada (cx.runSeed, escenario). */
export function encEnter() {
  const r = erun!;
  const v0 = E.variantOf(r); if (v0 && !save.encore.seenVariants.includes(v0.name)) { save.encore.seenVariants.push(v0.name); persist(); } // Codex: destino jugado
  cx.guestE = null; cx.ovT = 0;
  evReset(); shipsClear(); goalsClear(); skyClear();
  for (const e of cx.enemies) { e.hp = -1e9; e.dispose(); } // hp negativo: las armas con blanco fijo (trompo) lo sueltan
  for (const g of cx.gems) g.m.dispose();
  for (const p of cx.pickups) p.m.dispose();
  for (const sp of cx.spits) sp.m.dispose();
  if (cx.ball) { cx.ball.agg.dispose(); cx.ball.m.dispose(); cx.ball = null; }
  cx.enemies = []; cx.gems = []; cx.pickups = []; cx.spits = [];
  clearFx();
  cx.evtPre = { swarm: false, ball: false, rain: false, elites: new Set(), boss: new Set() };
  cx.apagon = false;
  hudBoss(null);
  const z = E.zoneOf(r); // Contenido 3: un escenario por vuelta (desde la segunda) en una zona plana; auto, armas y XP siguen igual
  if (z !== zoneId) { setZone(z, false); setMoon(z === "luna"); cx.cycleS = -1; }
  encoreAmbience(z, v0?.name); // ambiente propio del escenario (crossfade)
  GOAL_IO.half = MOON.on ? 0 : HALF; // teleportador y cofres dentro del patio
  encPrior += cx.time; cx.time = 0; setHitAt(0); setStageHurt(false);
  cx.runSeed = E.stageSeed(r.seed, r.loop, E.sceneIdx(r));
  seedRng(cx.runSeed);
  cx.profile = makeProfile(cx.runSeed);
  cx.profile.rainAt = Infinity; // en la luna no llueve
  buildLayout(); // luna: vuelve a como la armó el mundo (sin cráteres)
  encScene(); // variante: cráteres extra, ritmo de eventos y llegada del auto (encore.ts)
  paceS = E.paceOf(r);
  cx.spawnAcc = cx.groupT = 0; cx.swarmT = BAL.ritmo.enjambre_primero_base + cx.profile.swarmEvery * BAL.ritmo.enjambre_primero_mult; cx.chestT = cx.profile.chestEvery; cx.ballT = cx.profile.ballEvery; cx.bossIdx = 0;
  encPlan();
  zfx = NO_ZONE; zKey = ""; zT = 0;
  if (r.pacts.length && r.phase !== "vote" && r.phase !== "final") zonesInit({ seed: cx.runSeed, loop: r.loop, stage: r.stage, pacts: r.pacts.map((a) => a.id), avoid: goalBlips(), floorY: (x, z) => zpt(x, z).y }); else zonesDispose();
  cx.recompute(); // pactos vencidos al salir del escenario anterior
  cx.others().forEach(mateRevive); // R7a: los caídos vuelven en el escenario nuevo, junto al que guía
  cx.shake = Math.max(cx.shake, 1.2);
}
/** Punto del piso de la luna en la dirección d (unitaria, desde el centro). */
export const moonPt = (d: B.Vector3, lift = 0) => onFloor(d.scale(MOON.R).addInPlace(new B.Vector3(0, -MOON.R, 0)), lift);
/** Lleva el auto (quieto) a la dirección d de la luna, mirando hacia aim, y recoloca la cámara detrás. */
export const moonPlace = (d: B.Vector3, aim: B.Vector3) => carPlace(moonPt(d, cx.lead.car!.def.size[1] / 2 + 0.3), aim);
/** Lleva el auto (quieto) al punto p, mirando hacia aim (luna o zona plana), y recoloca la cámara detrás. */
export function carPlace(p: B.Vector3, aim: B.Vector3) {
  const c = cx.lead.car!;
  c.root.position.copyFrom(p); c.root.rotationQuaternion = alignYaw(p, yawOf(aim, p));
  c.body.setLinearVelocity(B.Vector3.Zero()); c.body.setAngularVelocity(B.Vector3.Zero());
  moonCar(c.body, upAt(p));
  teleport(c.body);
  cx.camH.copyFrom(hflat(aim.clone(), p).normalize()); cx.camUp.copyFrom(upAt(p)); cx.camYaw = yawOf(cx.camH, p);
  cx.cam.position.copyFrom(p).addInPlace(cx.camH.scale(-15)).addInPlace(cx.camUp.scale(13)); cx.camTarget.copyFrom(p);
  return p;
}
// Llegada de cada variante (E.Variant.at): dirección del lugar y hacia dónde mira el auto. Las mismas que __luna.go.
export const ARRIVE: Record<E.Variant["at"], [B.Vector3, B.Vector3]> = {
  salida: [B.Vector3.Up(), new B.Vector3(0, 0, 1)],
  oscuro: [SUN_DIR.scale(-1).addInPlace(new B.Vector3(0.25, 0.2, 0)).normalize(), SUN_DIR], // de espaldas al Sol, mirando hacia la luz
  tierra: [new B.Vector3(0, 1, 0).addInPlace(EARTH_DIR.scale(-0.66)).normalize(), EARTH_DIR],
  sol: [SUN_DIR.add(B.Vector3.Up()).normalize(), SUN_DIR],
};
/** Variante del escenario (encore.ts): ritmo de eventos, cráteres extra alrededor de la llegada y, salvo el primer escenario (ya está en su lugar), llegada del auto. */
export function encScene(first = false) {
  const v = E.variantOf(erun!);
  if (!MOON.on) { // Contenido 3: escenario terrestre: llegada al centro de la zona (donde arranca la Supervivencia), sin cráteres ni eventos lunares
    const c0 = new B.Vector3(0, 0, 0);
    shopPlan(erun!.seed, E.sceneIdx(erun!), c0);
    carPlace(new B.Vector3(0, cx.lead.car!.def.size[1] / 2 + 0.3, 0), new B.Vector3(0, 0, -1)); // mirando a -z: la cámara queda en +z, no sobre la mesa del patio (tapa en z -15..-45, se trameaba toda la pantalla)
    return;
  }
  evPace(v?.rain, v?.quake); skyPace(v?.sky);
  if (!v) { if (erun!.phase === "final") finalArena(); return; } // votación: sin cambios
  const [d, aim] = ARRIVE[v.at], c0 = moonPt(d);
  for (const k of E.craterPlan(v, erun!)) deform(ringAt(c0, k.a, k.d, 0), k.r, k.r * 0.28); // profundidad como los cráteres fijos grandes
  shopPlan(erun!.seed, E.sceneIdx(erun!), c0); // cofres de pago y máquina de opciones (moon_goals.ts)
  if (!first) moonPlace(d, aim);
}
/** FINAL ACT (R5): arena propia en la salida: cráteres en anillo, focos y luz de show; el auto vuelve al centro. */
export function finalArena() {
  const [d, aim] = ARRIVE.salida, c0 = moonPt(d), a = E.arenaPlan(erun!);
  for (const k of a.craters) deform(ringAt(c0, k.a, k.d, 0), k.r, k.r * 0.28);
  spotsPlan(c0, a.spots); evShow(true); evPace(E.ARENA.rain); skyPace(E.ARENA.sky);
  moonPlace(d, aim);
}
/** Minijefe i-ésimo de la luna: el de la variante o, sin ella, el que elige la semilla. */
export const minorShip = (i: number) => (erun && E.variantOf(erun)?.ship) || shipFor(i, cx.runSeed);
export const minorMini = () => { const v = erun && E.variantOf(erun); return (v && (MOON.on || v.zone) && E.miniOf(erun!)) || null; }; // H13: variante con minijefe propio (enemigo, no nave); en tierra solo si la variante trae su zona
/** Aplica lo que pasó en la expedición: efectos en el mundo y frase del Director. */
let pactOff = ""; // ids ofrecidos del último pacto (para telemetría si se rechaza)
export function encApply(ev: E.Ev | null) {
  zonesStep();
  if (erun) { erun.solo = cx.players.length < 2; if (E.decisionOpen(erun)) document.getElementById("hint")?.classList.add("hidden"); } // la guía de controles no tapa el pie de una oferta o decisión abierta
  if (erun && cx.lead.car) interruptStep();
  if (!ev || !erun) return;
  if (ev === "pact_offer" && erun.offer) { if (!cx.simulating && !cx.LAB.on && !save.encore.seenPacts.length) erun.hold = true; const n = erun.offer.filter((id) => !save.encore.seenPacts.includes(id)); if (n.length) { save.encore.seenPacts.push(...n); persist(); } } // Codex: pactos vistos
  if (!cx.simulating && !cx.LAB.on) { // telemetría ENCORE (datos chicos; tipos [a-z_])
    const r = erun, base = { stage: r.stage, loop: r.loop };
    if (ev === "pact_offer") pactOff = r.offer ? r.offer.join("+") : "";
    else if (ev === "pact_yes" || ev === "pact_no") track("pact_pick", { id: ev === "pact_yes" ? r.pacts[r.pacts.length - 1].id : pactOff, accepted: ev === "pact_yes", ...base });
    if (ev === "stay" || ev === "pact_offer" || ev === "route_offer" || ev === "vote") track("stage_end", { choice: ev === "stay" ? "stay" : "advance", ...base, t: Math.floor(cx.time), hp: +Math.min(1, cx.lead.hp / cx.lead.maxHp).toFixed(2), lv: cx.level });
    if (ev === "advance") track("route_pick", { variant: r.route, stage: r.stage, loop: r.loop });
  }
  if (ev === "tele_land") rocketLand(cx.lead.car!.pos, true); // el cohete de moon_goals.ts hace de teleportador; el aviso es el del Director
  else if (ev === "advance" || ev === "encore" || ev === "vote" || ev === "final_act") { if (!stageHurt) grant("encore_impecable"); if (ev === "encore" && erun.loop >= 2) grant("encore_vuelta3"); encEnter(); } // pact_* y route_offer no cargan nada: el escenario nuevo llega al elegir destino ("advance")
  if (ev === "pact_yes") { cx.recompute(); const p = E.pactOf(erun.pacts[erun.pacts.length - 1].id); if (p.gain.heal) for (const m of cx.players) if (m.car) m.hp = Math.min(cx.lead.maxHp, m.hp + cx.lead.maxHp * p.gain.heal); } // el pacto ya está en `pfx` (encEnter → cx.recompute); falta la cura instantánea
  const pact = ev === "pact_yes" || ev === "pact_no", v = ev === "advance" || ev === "encore" ? E.variantOf(erun) : null; // al llegar a un escenario nuevo, el Director anuncia su variante en vez de la frase suelta
  if (ev === "tele_land" || ev === "tele_ready") tip("tele"); else if (ev === "pact_offer") tip("pact"); else if (ev === "vote") tip("vote");
  if (ev === "stay") cx.dropPickup(spawnPoint(cx.lead.car!.pos, 12, 25), "cofre"); // H17: cada quedarse garantiza un cofre extra
  if (ev === "overload") cx.ovT = 0; // el primer enjambre de la carga sale ya
  if (ev === "guest") { const g = erun.guest!, c = cx.lead.car!; cx.spawnEnemy(g, spawnPoint(c.pos, 30, 36)); cx.guestE = cx.enemies[cx.enemies.length - 1]; hudBoss(DEF[g].name, 1, g); SFX.boss(); }
  if (pact) { say(ev); if (erun.phase === "route") say("route_offer"); } // la respuesta al trato y, enseguida, la oferta de destinos
  const z = E.zoneOf(erun);
  if (v) say("advance", z !== "luna" ? E.EARTH[z].join(". ") : `${v.name}. ${v.line}`); // Contenido 3: el escenario terrestre se presenta como escenografía
  if (v) { const af = E.afinOf(v); if (af) say("advance", `EL PÚBLICO APLAUDE ${af.armas.map((id) => BAL.armas[id].nombre.toUpperCase()).join(" Y ")} EN ESTE ESCENARIO.`); } // afinidad del destino elegido (balance.json, tabla afinidad)
  encSecrets();
  if (ev === "advance" || ev === "encore") { const h = E.hint(erun); if (h) say("hint", h); } // R5: pista del jefe secreto de este escenario
  else if (!pact) say(ev);
}
/** Contenido 3: secretos recién descubiertos en la run: el Director suelta el fragmento (se guardan al terminar, endRun). */
let saidSecrets: string[] = [];
export function encSecrets() {
  if (!erun) return;
  for (const id of erun.found) if (!saidSecrets.includes(id)) { saidSecrets.push(id); E.dirPush(dirq, E.secretLine(erun, id), 4); }
}
/** Primera expedición del guardado (sin expediciones terminadas): sin pactos, arranque tranquilo y carta recomendada. Fuera de sim y lab. */
export const primeraVez = () => !!erun && !cx.simulating && !cx.LAB.on && !save.encore.runs;
/** Arranque tranquilo: true los primeros `ritmo.primera_calma_s` s de la primera expedición (el spawner de run_drive.ts debe tratarlo como `calm`). */
export const calmFirst = () => primeraVez() && erun!.loop === 0 && erun!.stage === 0 && cx.time < BAL.ritmo.primera_calma_s;
export const encPick = (i: 0 | 1 | 2) => { if (cx.state === "play" && erun) { erun.first = primeraVez(); encApply(E.pick(erun, i)); } };
/** R6c: online de 2 cada decisión del teleportador es un voto; con los dos votos gana el del anfitrión (J1): coincidir o empatar da lo mismo.
 *  Si el cliente no vota, decide el reloj de la ventana (encore.ts tick), como en solitario. Sin red o sin J2 decide el primero que vota. */
export const votes = new Map<number, 0 | 1 | 2>();
let voteKey = "";
export function encVote(id: number, i: 0 | 1 | 2) {
  const host = cx.players[0].id, mate = cx.players.find((x) => x.id !== host);
  if (!getNet()?.host || !mate) { votes.clear(); encPick(i); return; }
  const k = erun ? `${erun.phase}:${erun.loop}:${erun.stage}:${erun.stays}` : "";
  if (k !== voteKey) { votes.clear(); voteKey = k; } // otra ventana: los votos viejos no cuentan
  votes.set(id, i);
  if (votes.size < 2) { banner(`VOTO J${id} · FALTA J${id === host ? mate.id : host}`, 1.5); return; }
  const v = votes.get(host)!; votes.clear(); encPick(v);
}
