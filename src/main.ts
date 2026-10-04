import { banner, damageNumber, hudAbility, hudArrows, hudBoss, hudDrive, hudSlots, hudKill, hudRadar, hudUpdate, initHud, pickOffer, selectOffer, showOffers, uiTick } from "./ui";
import * as B from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import havokWasm from "@babylonjs/havok/lib/esm/HavokPhysics.wasm?url";
import { Car, CARS, drive } from "./car";
import { DEF, Enemy, pickWeighted, spawnTable, type Kind } from "./enemies";
import { engineSfx, engineStop, initAudio, music, musicDuck, rainSfx, setEngineKind, SFX } from "./sfx";
import { ambient, burst, clearFx, corpse, debris, FX, fxSpeed, impact, initFx, mark, rainWet, splat, tickFx, tickRain } from "./fx";
import { ctl, input, isTouch, KEYS, padPressed, padSnap, pollInput, setupTouch } from "./input";
import { carModel, cyl, initModels, nutTemplate as nutTpl, sph, template } from "./models";
import { carOpts, current, dailySeed, fmt, initMenu, keyName, today, menuPad, openOver, openPause, persist, reset, save, type RunRec } from "./menu";
import { ABILITIES, type AbilityId } from "./abilities";
import { pilotStats, startWeapons } from "./pilots";
import { ACH, type AchId } from "./achievements";
import { adaptQuality, applyClimate, glitchHit, look, M, pbr, setDark, setLamp, setQuality, setupRender, shadows } from "./render";
import { evoOffer, fuse, levelOffers, makeWeapon, mountFor, passiveStats, setScoop, WEAPONS, type Ctx, type Offer, type PassiveId, type PStats, type Weapon, type WeaponId } from "./weapons";
import { buildLayout, buildWorld, HALF, hitBreakables, obstacles, occluders, setWind, setZone, spawnPoint, underRoof, ZONES, zoneClimate, zoneDust, zoneId, zoneTick } from "./world";
import { CLIMATES, DUSK, FINAL_WIN, makeProfile, mixClimate, nightfall, RAIN, type Profile } from "./run";
import { newSeed, rng, seedRng } from "./rng";
import { OUTRO_GUARD, OUTRO_S, OUTRO_SNAP, outroUi, showPhoto, slowScale, snap } from "./replay";
import { introOn, playIntro } from "./intro";
import { initKart, raceCfg, raceTick, setRaceCar, startRace } from "./kart";

const $ = (id: string) => document.getElementById(id)!;
// Partida de 10 minutos: dos minijefes (sueltan cofres de evolución) y el jefe final a las 10:00
let RUN_BOSSES: [number, Kind][] = [];
let warned = false;

// Guardado (localStorage "rcfight2"): type Save y DEFAULT viven en menu.ts

// ---------- Motor (WebGL2 por defecto, WebGPU con ?webgpu) ----------
const canvas = $("c") as HTMLCanvasElement;
const low = isTouch;
let engine: B.AbstractEngine;
if (location.search.includes("webgpu") && (await B.WebGPUEngine.IsSupportedAsync)) {
  const gpu = new B.WebGPUEngine(canvas, { antialias: true, stencil: true });
  await gpu.initAsync();
  engine = gpu;
} else engine = new B.Engine(canvas, true, { stencil: true }, true);
const scene = new B.Scene(engine);
scene.enablePhysics(new B.Vector3(0, -25, 0), new B.HavokPlugin(true, await HavokPhysics({ locateFile: () => havokWasm })));
scene.skipPointerMovePicking = true;

const cam = new B.FreeCamera("cam", new B.Vector3(0, 30, -40), scene);
cam.fov = 0.85;
cam.minZ = 0.3;
cam.maxZ = 1500;

setupRender(scene, cam, low);
initModels(scene);
initFx(scene, low);
seedRng(20260929); // el patio es siempre el mismo
buildWorld(scene, low);
buildLayout(); // patio del menú (semilla fija); el loop del menú pasa a la zona elegida (save.zone)
applyClimate(DUSK);
setQuality(save.quality);
if (isTouch) setupTouch((k) => zoomBy(1 / k)); // pellizco: abrir los dedos acerca
initHud();

// ---------- Estado de la partida ----------
type Gem = { m: B.InstancedMesh; xp: number; pull: boolean; vy: number };
type Pickup = { m: B.Mesh; type: "pila" | "iman" | "cofre" };
type Spit = { m: B.InstancedMesh; v: B.Vector3; life: number };

let state: "menu" | "play" | "level" | "pause" | "over" | "outro" | "race" = "menu";
let car: Car | null = null;
let weapons: Weapon[] = [];
let passives: Partial<Record<PassiveId, number>> = {};
let st: PStats = passiveStats({}, save.perm);
let hp = 100, maxHp = 100, boost = 100, jingleT = 0;
let bestStreak = 0, bestHit = 0, bossKills = 0; // mejores momentos de la partida (pantalla final)
let xp = 0, level = 1, pendingLevels = 0;
let time = 0, kills = 0, runScrap = 0;
let runDist = 0; // metros manejados en la partida (estadísticas de carrera)
let rerolls = 0, revives = 0, offerTitle = ""; // del taller: Dado cargado y Batería de reserva
let runSeed = 0;
let profile: Profile;
let simulating = false; // true durante __sim: sin DOM ni efectos caros
let enemies: Enemy[] = [];
let gems: Gem[] = [];
let pickups: Pickup[] = [];
let spits: Spit[] = [];
const spitTpl = () => template("spit", () => [sph(0.55, pbr("acid", { color: "#ff3a1f", rough: 0.1, emissive: "#c01800", alpha: 0.9 }), [0, 0, 0])]);
let cycleS = -1; // tramo del ciclo atardecer → noche ya aplicado
let darkK = 1, apagon = false, musicS = "", musicT = 0; // musicS/T: estado musical y reloj de refresco
let spawnAcc = 0, swarmT = 60, chestT = 100, ballT = 75, bossIdx = 0;
let shake = 0, camYaw = 0, dustT = 0, roofK = 0;
let ball: { m: B.Mesh; agg: B.PhysicsAggregate; life: number; hit?: boolean } | null = null;
let offers: Offer[] = [];
let offerSel = 0;

const xpNeed = (l: number) => Math.floor(4 + l * 2.5 + l * l * 0.3);

// Habilidad activa (abilities.ts): enfriamiento, segundos activa, petardos por caer y ritmo del mundo (cámara lenta)
let abil: AbilityId = "bombardeo", abilCd = 0, abilOn = 0, worldK = 1, bombs = 0, bombT = 0;
let shieldM: B.Mesh | null = null; // burbuja del escudo, hija del auto (se libera con él)
// Combo de manejo: multiplicador de XP (x1 a x2) que se pierde al recibir daño
let driveMul = 1, driftT = 0, airT = 0, airHit = false, trickT = 0; // trickT: segundos desde el último truco
// Maldiciones (horde = multiplicador de enemigos, curseK = de tornillos) y modo sin fin
let horde = 1, curseK = 1, noRepair = false, endless = false, finalKind: Kind = "perro";
// Lo ya cobrado en el endRun anterior (vencer al jefe final y seguir en modo sin fin): el siguiente suma solo la diferencia
let bank: { t: number; scrap: number; dmg: Record<string, number>; rec?: RunRec } | null = null;

let touchIFrame = 0, hitStop = 0, smokeT = 0, skidT = 0, lastHpFrac = 1, smashCd = 0;

// Macetas rotas sueltan tuercas y a veces una pila
const smashed = (pots: B.Vector3[]) => { for (const p of pots) { SFX.break(); dropGems(p, 8); if (rng() < 0.35) dropPickup(p, "pila"); shake = Math.max(shake, 0.5); } };

// ---------- Plantillas de recolectables ----------
const gemTpl = (v: 1 | 5 | 20) => template("gem" + v, () => [
  cyl(0.5, 0.5, 0.22, pbr("gem" + v, { color: v === 1 ? "#cbd5e1" : v === 5 ? "#facc15" : "#38bdf8", rough: 0.3, metal: 0.6, emissive: v === 1 ? "#5a6878" : v === 5 ? "#c09010" : "#1890c8" }), [0, 0.3, 0], [0.4, 0, 0], 6),
  cyl(0.22, 0.22, 0.24, M.matte("#1e293b"), [0, 0.3, 0], [0.4, 0, 0], 6),
], v === 20 ? 1.5 : 1);

function dropGems(pos: B.Vector3, amount: number) {
  if (gems.length > 350) { gainXp(amount); return; } // tope: se absorbe directo
  while (amount > 0) {
    const v: 1 | 5 | 20 = amount >= 20 ? 20 : amount >= 5 ? 5 : 1;
    amount -= v;
    const m = gemTpl(v).createInstance("gem");
    m.position.set(pos.x + (rng() - 0.5) * 1.5, 0, pos.z + (rng() - 0.5) * 1.5);
    gems.push({ m, xp: v, pull: false, vy: 5 + Math.random() * 4 }); // salta al caer (visual: Math.random, no toca la semilla)
  }
}

function dropPickup(pos: B.Vector3, type: Pickup["type"]) {
  if (type === "pila" && noRepair) return; // Sin reparaciones: tampoco caen pilas
  let m: B.Mesh;
  if (type === "pila") m = cyl(0.8, 0.8, 1.6, M.plastic("#22c55e"), [pos.x, 0.8, pos.z], [0, 0, Math.PI / 2], 12);
  else if (type === "iman") m = sph(1.2, M.plastic("#ef4444"), [pos.x, 0.8, pos.z]);
  else {
    m = cyl(2.2, 2.2, 1.6, M.metal("#d4a017"), [pos.x, 0.8, pos.z], undefined, 6);
    const beam = cyl(1.4, 1.4, 60, pbr("beam", { color: "#fde68a", emissive: "#fbbf24", alpha: 0.25 }), [0, 30, 0], undefined, 8);
    beam.parent = m;
  }
  shadows.addShadowCaster(m);
  pickups.push({ m, type });
}

// ---------- Flujo ----------
function recompute() {
  st = pilotStats(passiveStats(passives, save.perm), save.pilot);
  if (noRepair) st.regen = 0; // maldición Sin reparaciones
  const newMax = car!.def.hp + st.maxHp;
  hp += Math.max(0, newMax - maxHp);
  maxHp = newMax;
  car!.setMass(car!.def.mass * st.mass);
  // Cada arma se ve montada en el auto y crece con el nivel
  for (const w of weapons) {
    if (!w.mount) { w.mount = mountFor(w.id, car!); shadows.addShadowCaster(w.mount); }
    w.mount.scaling.setAll(1 + (w.lv - 1) * 0.06 + (w.evolved ? 0.25 : 0));
  }
}

// Vista previa en las cartas: la pieza aparece montada en el auto mientras la mirás
let preview: B.Mesh | null = null;
function previewOffer(i: number) {
  preview?.dispose();
  preview = null;
  const o = offers[i];
  if (!car || !o || (o.kind !== "weapon" && o.kind !== "evo")) return;
  const owned = weapons.find((w) => w.id === o.id);
  if (!owned) preview = mountFor(o.id as WeaponId, car);
  else if (owned.mount) owned.mount.scaling.setAll(1.25 + (o.kind === "evo" ? 0.2 : 0));
}

function clearRun() {
  for (const e of enemies) e.dispose();
  for (const w of weapons) w.dispose();
  for (const g of gems) g.m.dispose();
  for (const p of pickups) p.m.dispose();
  for (const s of spits) s.m.dispose();
  spits = [];
  if (ball) { ball.agg.dispose(); ball.m.dispose(); ball = null; }
  preview?.dispose();
  preview = null;
  enemies = []; weapons = []; gems = []; pickups = [];
  clearFx();
  rainK = 0; rainBanner = false; rainSfx(0);
  car?.dispose();
  car = null;
  applyClimate(zoneClimate() ?? DUSK); // al volver al menú, atardecer (o el tubo del garaje)
}

let daily = false;
function startRun(d = false) {
  daily = d;
  initAudio(); music("run", 0); musicS = "run";
  titleArt(false); // ?lab arranca desde el título
  clearRun();
  // Semilla de la partida: ?seed=N la fija (reproducible), si no, una nueva
  // Zona: el diario siempre en el patio; ?zone=garaje|jardin (solo dev) la fuerza. Se arma antes de sembrar: no toca la semilla.
  setZone(daily ? "patio" : (import.meta.env.DEV && new URLSearchParams(location.search).get("zone")) || save.zone);
  runSeed = Number(new URLSearchParams(location.search).get("seed")) || (daily ? dailySeed() : newSeed());
  seedRng(runSeed);
  // Perfil de la partida: clima, plaga, orden de minijefes, ritmo de eventos y un patio distinto
  profile = makeProfile(runSeed);
  profile.climate = zoneClimate() ?? profile.climate; // interior (garaje): luz fija
  cycleS = -1;
  buildLayout();
  RUN_BOSSES = [[200, profile.minis[0]], [400, profile.minis[1]], [600, profile.final]];
  finalKind = RUN_BOSSES[RUN_BOSSES.length - 1][1]; // jefe final: vencerlo gana la partida
  const curses = daily ? [] : save.curses; // el desafío diario no admite maldiciones
  horde = curses.includes("horda") ? 1.5 : 1; noRepair = curses.includes("sinrep"); curseK = 1 + 0.3 * curses.length;
  endless = false; bank = null;
  abil = save.ability; abilCd = abilOn = bombs = 0; worldK = 1; shieldM = null;
  driveMul = 1; driftT = airT = trickT = 0; hudDrive(1);
  car = new Car(scene, save.car, carOpts());
  lastHpFrac = 1;
  passives = {};
  bestStreak = bestHit = bossKills = 0;
  setScoop(save.car === "helado"); setEngineKind(save.car);
  weapons = startWeapons(save.pilot, save.perm.extra).map(makeWeapon);
  if (save.car === "helado" && !weapons.some((w) => w.id === "gomitas")) weapons.unshift(makeWeapon("gomitas")); // arma de partida del camión: bochas de helado
  jingleT = 2;
  rerolls = save.perm.reroll; revives = save.perm.revive;
  maxHp = car.def.hp;
  recompute();
  hp = maxHp; boost = 100;
  xp = 0; level = 1; pendingLevels = 0;
  time = 0; kills = 0; runScrap = 0; runDist = 0; runAch = []; hitAt = 0;
  spawnAcc = 0; swarmT = 90 + profile.swarmEvery * 0.5; chestT = profile.chestEvery; ballT = profile.ballEvery; bossIdx = 0; warned = false; apagon = false;
  camYaw = 0; ts = 1; outroZ = 1; outroAt = null; fxSpeed(1);
  state = "play";
  scene.physicsEnabled = true;
  reset(null);
  $("levelup").classList.add("hidden");
  for (const k in dmgOut) delete dmgOut[k];
  $("hud").classList.remove("hidden");
  hudBoss(null);
  banner(`${profile.climate.name} · ${profile.plague.name}`, 3);
  // Guía de controles los primeros segundos (se va sola)
  const hint = $("hint");
  for (const k of hint.querySelectorAll<HTMLElement>("kbd[data-k]")) k.textContent = keyName(KEYS[k.dataset.k as keyof typeof KEYS][0]); // teclas reasignadas
  hint.classList.remove("hidden", "fade");
  setTimeout(() => hint.classList.add("fade"), 9000);
  setTimeout(() => hint.classList.add("hidden"), 9700);
}

// Logros (achievements.ts): las pruebas de dev (__sim, lab, god) no otorgan nada ni tocan el guardado
let runAch: string[] = [], hitAt = 0; // logros de esta partida (pantalla final) y último golpe recibido
function grant(id: AchId) {
  if (simulating || LAB.on || god || save.ach.includes(id)) return;
  save.ach.push(id);
  const a: { name: string; reward?: string; scrap?: number } = ACH[id];
  if (a.scrap) runScrap += a.scrap; // endRun lo suma al guardado y se ve en "Tornillos" de la pantalla final
  if (a.reward?.startsWith("part:") && !save.unlocked.includes(a.reward)) save.unlocked.push(a.reward);
  runAch.push(a.name);
  persist();
  // ponytail: aviso diferido 1,5 s para no pisar el cartel del evento que lo disparó (fusión, jefe); sin cola de carteles
  setTimeout(() => state === "play" && banner(`LOGRO · ${a.name.toUpperCase()}`, 2.5), 1500);
}
// Guardados anteriores a los logros: minijefes ya derrotados y récord de 10 minutos cuentan (sin aviso)
for (const k of ["rey", "cortadora", "tarantula"] as const) if (save.slain[k] && !save.ach.includes(k)) save.ach.push(k);
if (save.best >= 600 && !save.ach.includes("diez")) save.ach.push("diez");

function endRun(win: boolean, why: string) {
  if (win) grant(`gana_${save.car}`);
  if (win && daily) grant("diario");
  if (time >= 600) grant("diez");
  // Modo sin fin: récord propio de lo aguantado después de vencer al jefe final
  const lasted = endless ? Math.floor(time - bank!.t) : 0;
  if (endless) why += ` Modo sin fin: ${fmt(lasted)} más${lasted > save.endless ? ", récord nuevo" : ""}.`;
  worldK = 1; abilOn = bombs = 0; fxSpeed(1); // ninguna habilidad sigue durante el cierre
  if (runAch.length) why += ` Logros: ${runAch.join(", ")}.`;
  state = simulating ? "over" : "outro"; // el cierre en cámara lenta (outroTick) abre los resultados
  engineStop(); music("over"); rainSfx(0);
  // Tornillos: los de la partida más tiempo y bajas, con el extra de las maldiciones (+30% cada una)
  const earned = Math.floor((runScrap + Math.floor(time / 20) + Math.floor(kills / 25)) * curseK);
  const prevBest = save.best, record = Math.floor(time) > save.best;
  const rec: RunRec = { t: Math.floor(time), kills, lv: level, seed: runSeed, win };
  if (!simulating && !LAB.on) { // las pruebas de dev no tocan el guardado real
    save.scrap += earned - (bank?.scrap ?? 0); // al terminar el modo sin fin, solo lo que faltaba cobrar
    save.endless = Math.max(save.endless, lasted);
    save.best = Math.max(save.best, Math.floor(time));
    // Estadísticas de carrera (Bestiario): totales, daño por arma y mejor marca de la zona jugada
    const S = save.stats, zr = S.zone[zoneId] ?? { t: 0, kills: 0 };
    if (!bank) { S.runs++; if (win) S.wins++; }
    S.time += time - (bank?.t ?? 0); S.dist += runDist; // runDist vuelve a 0 al seguir en modo sin fin
    for (const [src, v] of Object.entries(dmgOut)) S.dmg[src] = (S.dmg[src] ?? 0) + v - (bank?.dmg[src] ?? 0);
    S.zone[zoneId] = { t: Math.max(zr.t, Math.floor(time)), kills: Math.max(zr.kills, kills) };
    // Top 5 por tiempo (y bajas para desempatar)
    if (daily) save.daily = { day: today(), best: Math.max(save.daily.day === today() ? save.daily.best : 0, Math.floor(time)) };
    save.runs = [...save.runs.filter((r) => r !== bank?.rec), rec].sort((a, b) => b.t - a.t || b.kills - a.kills).slice(0, 5);
    persist();
  }
  $("hud").classList.add("hidden");
  const more = win && !endless; // venció al jefe final: los resultados ofrecen "Seguir jugando"
  bank = { t: time, scrap: earned, dmg: { ...dmgOut }, rec };
  const res = { win, title: endless ? "FIN DEL SIN FIN" : undefined, why, time, kills, level, scrap: earned, record, more, dmg: { ...dmgOut }, seed: `${profile.climate.name} · ${profile.plague.name} · Semilla ${runSeed}`, prevBest, bestStreak, bestHit: Math.round(bestHit), bossKills, ach: [...runAch], car: save.car };
  if (simulating) openOver(res); else startOutro(res);
}

// ---------- Cierre en cámara lenta ----------
// Al morir o ganar el mundo sigue vivo ~5 s reales a 0,2x (física, bichos, partículas, lluvia) con la cámara orbitando el auto; luego los resultados.
// Cualquier tecla, botón o toque lo salta. La foto de los resultados se toma a los 0,5 s (replay.ts).
let outroAt: B.Vector3 | null = null; // victoria: dónde murió el jefe final; la cámara del cierre apunta ahí (derrota: null = el auto)
let ts = 1, outroZ = 1, outroT = 0, outroSkip = false, outroShot = false, outroRes: Parameters<typeof openOver>[0] | null = null;
function startOutro(res: NonNullable<typeof outroRes>) {
  outroRes = res; outroT = 0; outroSkip = false; outroShot = false;
  scene.physicsEnabled = false; // se avanza a mano, con el tiempo escalado
  for (const sp of spits) sp.m.dispose();
  spits = [];
  if (hp <= 0 && car) { // el auto se desarma
    FX.explosion(car.pos.add(new B.Vector3(0, 0.5, 0)), 2);
    debris(car.pos, save.paint || "#d62828", 14, 9, 0.9);
    SFX.explosion();
  }
  outroUi(true);
}
function outroTick(dt: number) {
  outroT += dt;
  if (outroT >= OUTRO_GUARD) for (let i = 0; i < 12; i++) if (i < 6 || i > 7) outroSkip ||= padPressed(i); // botones, no gatillos ni cruceta (el stick cuenta como cruceta)
  ts = slowScale(outroT);
  const sdt = dt * ts;
  for (const e of enemies) { e.update(sdt, car!.pos); e.animate(sdt); }
  (scene.getPhysicsEngine() as unknown as { _step(d: number): void })._step(sdt);
  fxSpeed(ts);
  outroZ = 1 - 0.5 * Math.min(1, outroT / 3);
  camYaw += dt * 0.45;
  if (!outroShot && outroT >= OUTRO_SNAP) { outroShot = true; snap(engine); }
  if (outroT >= OUTRO_S || outroSkip) endOutro();
}
function endOutro() {
  state = "over";
  ts = 1; outroZ = 1; outroAt = null; fxSpeed(1); outroUi(false);
  scene.physicsEnabled = true;
  openOver(outroRes!);
  void showPhoto({ zone: ZONES[zoneId].name, time: fmt(time), kills, car: CARS[car!.kind].name, win: outroRes!.win });
  outroRes = null;
}
const skipOutro = (e: Event) => { if (state === "outro" && outroT >= OUTRO_GUARD && !(e instanceof KeyboardEvent && (e.repeat || /^(Shift|Control|Alt|Meta)/.test(e.code)))) outroSkip = true; };
addEventListener("keydown", skipOutro);
addEventListener("pointerdown", skipOutro);

function toMenu() {
  if (LAB.on) { LAB.on = false; god = false; }
  engineStop(); music("menu");
  persist(); // bestiario visto en la partida abandonada
  clearRun();
  state = "menu";
  scene.physicsEnabled = true;
  $("hud").classList.add("hidden");
  reset("main");
}


// ---------- Nivel / cofre ----------
function gainXp(n: number) {
  xp += n * st.xp * driveMul;
  while (xp >= xpNeed(level)) { xp -= xpNeed(level); level++; pendingLevels++; }
}

// Sin reparaciones: fuera las cartas de curación y la Pila de litio (regenera); se pide una de más para no quedar corto
function offersFor() {
  const n = 3 + save.perm.cards;
  return noRepair ? levelOffers(weapons, passives, n + 1).filter((o) => o.kind !== "heal" && o.id !== "litio").slice(0, n) : levelOffers(weapons, passives, n);
}
function openOffers(list: Offer[], title: string) {
  if (!list.length) return; // Sin reparaciones con todo al máximo: no hay nada que ofrecer
  state = "level";
  scene.physicsEnabled = false;
  offers = list;
  offerSel = 0;
  SFX.levelUp();
  engineStop();
  showOffers(title, list, 0, choose, previewOffer);
  offerTitle = title;
  const can = rerolls > 0 && list[0]?.kind !== "evo";
  $("luHint").textContent = `${list.map((_, i) => i + 1).join(" · ")} o clic — Enter confirma${can ? ` · R o Y re-sortea (${rerolls})` : ""}`;
  $("luHint").onclick = can ? reroll : null;
}
// Re-sorteo de cartas (Dado cargado): mismas reglas, cartas nuevas. Las evoluciones no se re-sortean.
function reroll() {
  if (state !== "level" || rerolls <= 0 || offers[0]?.kind === "evo" || document.querySelector("#offers .picked")) return;
  rerolls--;
  preview?.dispose();
  preview = null;
  openOffers(offersFor(), offerTitle);
}

function choose(i: number) {
  if (state !== "level") return;
  preview?.dispose();
  preview = null;
  const o = offers[i];
  if (o.kind === "weapon") {
    const w = weapons.find((x) => x.id === o.id);
    if (w) w.lv++; else weapons.push(makeWeapon(o.id as WeaponId));
  } else if (o.kind === "passive") passives[o.id as PassiveId] = o.lv!;
  else if (o.kind === "evo") { weapons.find((x) => x.id === o.id)!.evolved = true; banner(o.title.toUpperCase()); }
  else if (o.kind === "fusion") { weapons = fuse(weapons, o.id as WeaponId); banner(o.title.toUpperCase()); if (o.id in ACH) grant(o.id as AchId); }
  else hp = Math.min(maxHp, hp + 40);
  recompute();
  state = "play";
  scene.physicsEnabled = true;
}

function openChest() {
  const evo = evoOffer(weapons, passives);
  openOffers(evo ? [evo] : offersFor(), evo ? (evo.kind === "fusion" ? "Cofre · Fusión" : "Cofre · Evolución") : "Cofre");
}

function pause() {
  if (state !== "play") return;
  state = "pause"; scene.physicsEnabled = false; engineStop(); musicDuck(true);
  openPause({
    weapons: weapons.map((w) => ({ id: w.id, lv: w.lv, evolved: w.evolved })),
    passives: (Object.entries(passives) as [PassiveId, number][]).map(([id, lv]) => ({ id, lv })),
    stats: [["Carrocería", `${Math.ceil(hp)} / ${maxHp}`], ["Velocidad", `${Math.round(car!.def.speed * st.speedMul * 3.6)} km/h`], ["Embestida", `x${car!.def.ram}`], ["Daño", `${Math.round(st.dmg * 100)}%`], ["Blindaje", `${Math.round(st.armor * 100)}%`], ["Imán", `${st.magnet.toFixed(1)} m`]],
    seed: `${profile.climate.name} · ${profile.plague.name} · Semilla ${runSeed}`,
  });
}
function resume() {
  if (state !== "pause") return;
  state = "play"; scene.physicsEnabled = true; reset(null); musicDuck(false);
}

// Esc / P / M y la navegación de menús viven en menu.ts; acá solo las cartas de mejora
addEventListener("keydown", (e) => {
  if (state === "level" && /^Digit[1-4]$/.test(e.code)) { const i = +e.code.slice(5) - 1; if (i < offers.length) pickOffer(i); }
  if (e.code === "Enter" && state === "level") pickOffer(offerSel);
  if (e.code === "KeyR" && state === "level") reroll();
});
function goRace() {
  initAudio(); clearRun(); titleArt(false);
  state = "race"; reset(null);
  $("hud").classList.add("hidden");
  setRaceCar(save.car);
  startRace();
}
if (import.meta.env.DEV && /[?&]race\b/.test(location.search)) setTimeout(() => { const q = new URLSearchParams(location.search); if (q.get("players") === "2") { raceCfg.players = 2; raceCfg.p2 = "kbd2"; } goRace(); }, 1500); // solo dev: ?race[&players=2] arranca la carrera
initKart({ scene, cam, onExit: () => { state = "menu"; music("menu"); applyClimate(zoneClimate() ?? DUSK); reset("main"); } });
initMenu({ scene, play: startRun, resume, quit: toMenu, pause, endless: goEndless, race: goRace });
music("menu"); // suena cuando haya primer gesto (initAudio)
// Intro de 4 cuadros: solo en el primer arranque (save.intro); ?intro la fuerza, ?mute y ?lab (pruebas) no la muestran
{ const force = /[?&]intro\b/.test(location.search); if (force || (!save.intro && !/[?&](mute|lab)\b/.test(location.search))) playIntro(!force); }

// ---------- Combate ----------
const toScreen = (p: B.Vector3) => B.Vector3.Project(p, B.Matrix.IdentityReadOnly, scene.getTransformMatrix(), cam.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()));
// Daño infligido por fuente (pantalla de resultados): dmgSrc = arma que está actuando
const dmgOut: Record<string, number> = {};
let dmgSrc = "";
function damage(e: Enemy, dmg: number, knock?: B.Vector3, crit = false) {
  if (dmgSrc) dmgOut[dmgSrc] = (dmgOut[dmgSrc] ?? 0) + Math.min(dmg, Math.max(0, e.hp));
  e.hp -= dmg;
  bestHit = Math.max(bestHit, dmg);
  if (dmg >= 4) SFX.impact(dmgSrc, crit);
  if (dmg >= 5 && !simulating && save.dmgNums) {
    const sp = toScreen(e.pos.add(new B.Vector3(0, e.def.size[1] + 0.3, 0)));
    const k = innerWidth / engine.getRenderWidth();
    if (sp.z < 1) damageNumber(sp.x * k, sp.y * k, dmg, crit);
  }
  if (dmg >= 60 || e.def.boss && dmg >= 20) hitStop = Math.max(hitStop, crit ? 0.06 : 0.035);
  // Impacto: destello, chispas, pedazos y squash del bicho; la sacudida de cámara depende del arma
  if (dmg >= 4 && !simulating) shake = Math.max(shake, impact(e.node, e.pos.add(new B.Vector3(0, e.def.size[1] * 0.5, 0)), e.def.color, Math.max(e.def.size[0], e.def.size[2]) * (e.def.scale ?? 1), dmgSrc, crit, !!e.def.boss));
  if (knock && !e.def.boss) e.body.applyImpulse(knock.scale(e.def.mass), e.pos);
}

function explode(pos: B.Vector3, r: number, dmg: number) {
  FX.explosion(pos.add(new B.Vector3(0, 0.5, 0)), r);
  SFX.explosion();
  mark("scorch", pos.x, pos.z, Math.random() * 6, r * 0.55, 14);
  smashed(hitBreakables(pos, r, dmg));
  shake = Math.max(shake, 0.25);
  for (const e of enemies) {
    const d = B.Vector3.Distance(e.pos, pos);
    if (d < r + e.radius) damage(e, dmg, e.pos.subtract(pos).normalize().addInPlace(new B.Vector3(0, 0.6, 0)).scale(6));
  }
}

// Color del charco de cada insecto = color de sus ojos (models.ts)
const BUG_GOO: Partial<Record<Kind, string>> = { hormiga: "#ff3020", escupidora: "#ffb020", escarabajo: "#9acd32", polilla: "#c9a0ff" };
const CONFETI = ["#ffd84d", "#ff9bd4", "#7de8ff", "#b6ff6a", "#ffa05a"];
function kill(e: Enemy) {
  kills++;
  bestStreak = Math.max(bestStreak, hudKill()); if (e.def.boss) bossKills++;
  if (hudKill() > 0 && hudKill() % 10 === 0) SFX.streak(hudKill());
  if (!simulating && hudKill() > 0 && hudKill() % 25 === 0) banner(`RACHA x${hudKill()}`, 1.2);
  if (hudKill() >= 100) grant("racha");
  if (!simulating && !LAB.on) save.slain[e.kind] = (save.slain[e.kind] ?? 0) + 1;
  SFX.kill();
  FX.death(e.pos.add(new B.Vector3(0, 0.5, 0)), e.def.boss);
  debris(e.pos, e.def.color, e.def.boss ? 30 : e.kind === "hormiga" ? 4 : 7, e.def.boss ? 14 : 6, e.def.scale ?? (e.def.boss ? 3 : 1));
  if (!simulating) debris(e.pos, CONFETI[Math.floor(Math.random() * CONFETI.length)], e.def.boss ? 14 : 3, e.def.boss ? 12 : 7, e.def.boss ? 1.2 : 0.5); // confeti de color: cada baja se ve festiva
  const juice = !simulating && !e.def.boss;
  if (juice && BUG_GOO[e.kind]) splat(e.pos.x, e.pos.z, BUG_GOO[e.kind]!, Math.max(e.def.size[0], e.def.size[2]) * 0.55);
  if (juice && (e.kind === "friccion" || e.kind === "robot")) { debris(e.pos, "#b8bcc2", 5, 8, 0.45); debris(e.pos, "#d4a017", 3, 9, 0.35); FX.sparks(e.pos.add(new B.Vector3(0, 0.5, 0))); }
  if (e.def.xp) dropGems(e.pos, e.def.xp);
  if (e.def.boss) {
    shake = 1.5;
    runScrap += 25;
    if (e.kind === "rey" || e.kind === "cortadora" || e.kind === "tarantula") grant(e.kind);
    if (e.kind === finalKind && !endless) { outroAt = e.pos.clone(); e.dispose(); return endRun(true, FINAL_WIN[finalKind] ?? "El jefe final quedó fuera de combate."); }
    dropPickup(e.pos, "cofre");
    hudBoss(null);
  } else {
    const r = rng();
    if (r < 0.035) dropPickup(e.pos, "pila");
    else if (r < 0.041) dropPickup(e.pos, "iman");
  }
  if (e.elite) { dropPickup(e.pos, "cofre"); e.aura?.dispose(); } // la élite suelta cofre; el aura no queda en el cadáver
  // Los insectos quedan patas arriba unos segundos; el resto desaparece
  if (juice && BUG_GOO[e.kind]) { e.agg.dispose(); corpse(e.node, e.def.size[1] * (e.def.scale ?? 1)); } else e.dispose();
}

function spawnEnemy(kind: Kind, p: B.Vector3) {
  enemies.push(new Enemy(kind, p, 1 + time / 200));
  if (!LAB.on && !save.seen.includes(kind)) save.seen.push(kind); // bestiario
}

// ---------- Update ----------
function update(dt: number) {
  if (!simulating && !document.hidden) adaptQuality(engine.getFps(), dt);
  const c = car!;
  time += dt;
  // Ciclo de luz: se reaplica solo cuando cambió lo suficiente (repinta cielo y sonda)
  // Lluvia: empieza a la fracción profile.rainAt de la partida; la intensidad sube suave
  const raining = time / 600 >= profile.rainAt;
  if (raining && !rainBanner) { rainBanner = true; banner("LLUVIA", 2); }
  rainK = LAB.on && raining ? 1 : rainK + ((raining ? 1 : 0) - rainK) * Math.min(1, dt * RAIN.ramp);
  const s = nightfall(LAB.on ? LAB.t : time / 600);
  if (!simulating && Math.abs(s - cycleS) > 0.01) { cycleS = s; applyClimate(zoneClimate() ?? mixClimate(DUSK, profile.climate, s)); }

  // --- Habilidad activa (efectos con el reloj real; wdt = paso del mundo, más corto en cámara lenta) ---
  abilCd -= dt;
  if (input.ability && abilCd <= 0) useAbility(c);
  if (abilOn > 0 && (abilOn -= dt) <= 0) { worldK = 1; fxSpeed(1); if (shieldM) shieldM.isVisible = false; }
  if (abil === "escudo" && abilOn > 0) hp = Math.min(maxHp, hp + maxHp * 0.1 * dt); // 30% en 3 s
  if (bombs > 0 && (bombT -= dt) <= 0) {
    bombs--; bombT = 0.12;
    const a = rng() * Math.PI * 2, d = 3 + rng() * 11;
    dmgSrc = "bombardeo"; explode(new B.Vector3(c.pos.x + Math.cos(a) * d, 0, c.pos.z + Math.sin(a) * d), 3.5, 30 * st.dmg); dmgSrc = "";
  }
  const wdt = dt * worldK;

  // --- Manejo ---
  let throttle = input.throttle, steer = input.steer;
  if (input.move) {
    // Dirección relativa a la cámara: el auto gira solo hacia donde apunta el stick
    const f = new B.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw)), r = new B.Vector3(f.z, 0, -f.x);
    const want = r.scale(input.moveX).addInPlace(f.scale(input.moveY));
    const fwd = c.root.forward.clone(); fwd.y = 0; fwd.normalize();
    const diff = Math.atan2(B.Vector3.Cross(fwd, want).y, B.Vector3.Dot(fwd, want.normalizeToNew()));
    steer = B.Scalar.Clamp(diff * 2.5, -1, 1);
    throttle = Math.min(1, want.length());
  }
  const ariete = weapons.some((w) => w.id === "lanza" && w.evolved);
  const boosting = input.boost && boost > 3 && throttle >= 0;
  lampBoost = boosting;
  boost = boosting ? boost - 40 * dt : Math.min(100, boost + st.boostRegen * dt);
  const maxSpeed = c.def.speed * st.speedMul * (boosting ? 1.55 : 1);
  const r = drive(c.body, c.root, dt, {
    throttle: boosting ? 1 : throttle, steer, speed: maxSpeed,
    accel: c.def.accel * (boosting ? 1.8 : 1),
    turn: c.def.turn * (input.drift ? 1.4 : 1),
    grip: (input.drift ? 1.3 : c.def.grip) * (1 - (1 - RAIN.grip) * rainK), // mojado: el auto agarra menos
  });
  c.animate(dt, steer, r.fs, maxSpeed);
  { const zp = zoneTick(dt, c.pos); if (zp) c.body.setLinearVelocity(c.body.getLinearVelocity().addInPlace(zp)); } // aspersores del jardín
  engineSfx(Math.min(1, Math.abs(r.fs) / (c.def.speed * 1.55)), throttle, boosting);
  if (c.kind === "helado" && (jingleT -= dt) <= 0) { SFX.jingle(); jingleT = 16; }
  runDist += Math.abs(r.fs) * dt;
  // Combo de manejo: derrape largo, salto y aterrizaje limpio suben el multiplicador de XP (tope x2); un golpe lo corta (hurt)
  if (r.grounded) {
    if (airT >= 0.5 && !airHit) trick(Math.abs(r.ls) < 3 && Math.abs(r.fs) > 5 ? "SALTO LIMPIO" : "SALTO", Math.abs(r.ls) < 3 && Math.abs(r.fs) > 5 ? 0.2 : 0.1);
    airT = 0; airHit = false;
    driftT = input.drift && Math.hypot(r.fs, r.ls) > 6 ? driftT + dt : 0; // velocidad total: derrapando casi toda va de costado
    if (driftT >= 1.5) { driftT = 0; trick("DERRAPE LARGO", 0.1); }
  } else airT += dt;
  // Sin trucos por 8 s el multiplicador baja solo, 0,1 por segundo hasta x1
  if ((trickT += dt) > 8 && driveMul > 1) { driveMul = Math.max(1, driveMul - 0.1 * dt); if (!simulating) hudDrive(driveMul); }
  lastKmh = r.fs * 3.6; lastMaxKmh = c.def.speed * st.speedMul * 1.55 * 3.6;
  // Marcas de neumático al derrapar / patinar
  if (r.grounded && (Math.abs(r.ls) > 3.5 || (input.drift && Math.abs(r.fs) > 5)) && (skidT -= dt) <= 0) {
    skidT = 0.025;
    const yaw = Math.atan2(c.root.forward.x, c.root.forward.z);
    for (const w of c.model.wheels) if (!w.front) { const p = w.m.getAbsolutePosition(); mark("skid", p.x, p.z, yaw, 1, 7); }
  }
  // Daño visible: humo con media vida, humo negro y chispas con poca
  if (hp < maxHp * 0.5 && (smokeT -= dt) <= 0) {
    smokeT = hp < maxHp * 0.25 ? 0.06 : 0.14;
    const p = c.pos.add(new B.Vector3(0, 0.6, 0)).addInPlace(c.root.forward.scale(0.6));
    FX.smoke(p, hp < maxHp * 0.25);
    if (hp < maxHp * 0.25 && Math.random() < 0.3) FX.sparks(p);
  }
  if ((dustT -= dt) <= 0 && r.grounded && (Math.abs(r.ls) > 3 || boosting)) { dustT = 0.05; const rear = c.pos.add(c.root.forward.scale(-1.1)); FX.dust(rear); if (boosting) FX.sparks(rear.add(new B.Vector3(0, 0.3, 0))); }
  // Embestir objetos del patio los rompe
  const spd = Math.abs(r.fs);
  if (spd > 9 && (smashCd -= dt) <= 0) { const pots = hitBreakables(c.pos, 1.3, spd * c.def.ram * 1.5); if (pots.length) smashCd = 0.3; smashed(pots); }
  if (Math.abs(c.pos.x) > HALF + 5 || Math.abs(c.pos.z) > HALF + 5 || c.pos.y < -5) hp = 0;

  // --- Aparición de enemigos ---
  // Tope de vivos y ritmo: con el bot que pelea jefes (devbot.ts) quedó en ~50% de victorias (__sim, 40 semillas).
  // ponytail: más densidad casi no baja la tasa (más bichos = más XP); el techo real está en las fusiones repetidas
  const maxAlive = Math.min(low ? 110 : 200, (25 + time / 2.2) * horde); // Horda: +50%. Tope 200 en compu, 110 en táctil, por rendimiento
  // Aparecen sesgados hacia donde vas: manejar no es escapar gratis
  const cvel = c.body.getLinearVelocity();
  const ahead = c.pos.add(new B.Vector3(cvel.x, 0, cvel.z).scale(1.6));
  spawnAcc += (1 + time / 16) * wdt * horde;
  const normals = enemies.filter((e) => !e.def.boss).length;
  // Con la cámara más alejada que el zoom por defecto (1.35) el anillo de aparición se abre igual, para no verlos nacer
  // Anillo fijo, fuera de cuadro aun con el zoom máximo (2): la partida no cambia según el zoom elegido
  while (spawnAcc >= 1) { spawnAcc--; if (normals < maxAlive) spawnEnemy(pickWeighted(spawnTable(time, profile.plague)), spawnPoint(ahead, 36, 54)); }
  if ((swarmT -= dt) <= 0) {
    swarmT = profile.swarmEvery;
    banner("ENJAMBRE", 1.4);
    const ns = Math.round((16 + time / 12) * horde); // el enjambre crece con la partida
    for (let i = 0; i < ns; i++) { const a = (i / ns) * Math.PI * 2; const p = new B.Vector3(c.pos.x + Math.cos(a) * 22, 1, c.pos.z + Math.sin(a) * 22); if (Math.abs(p.x) < HALF - 3 && Math.abs(p.z) < HALF - 3) spawnEnemy("hormiga", p); }
  }
  if (time - Math.max(hitAt, 300) >= 60) grant("intacto"); // 60 s sin daño, contando desde el minuto 5
  if (!warned && time >= 570) { warned = true; banner(`${DEF[finalKind].name} SE ACERCA`, 3); }
  // Apagón: 4 s antes de cada jefe se apagan luna y ambiente (queda el faro); vuelve en 3 s tras la entrada
  if (!simulating) {
    const next = RUN_BOSSES[bossIdx]?.[0] ?? Infinity, prev = RUN_BOSSES[bossIdx - 1]?.[0] ?? -Infinity;
    const d = Math.max(Math.min(1, Math.max(0, (time - next + 4) / 1.5)), Math.max(0, 1 - (time - prev) / 3));
    if (d > 0 || darkK < 1) { darkK = 1 - 0.88 * d; setDark(darkK); }
    if (!apagon && time >= next - 4) { apagon = true; banner("APAGÓN", 2); }
  }
  if (bossIdx < RUN_BOSSES.length && time >= RUN_BOSSES[bossIdx][0]) {
    apagon = false;
    const kind = RUN_BOSSES[bossIdx++][1];
    spawnEnemy(kind, spawnPoint(c.pos, 30, 36));
    if (endless) { // modo sin fin: otro jefe repetido en 2 min (rotan los tres de la partida) y cada vez con más vida
      RUN_BOSSES.push([time + 120, RUN_BOSSES[RUN_BOSSES.length % 3][1]]);
      const b = enemies[enemies.length - 1]; b.hp = b.maxHp *= time / 600;
    }
    banner(DEF[kind].name, 2.5);
    hudBoss(DEF[kind].name, 1);
    SFX.boss();
  }
  // Élites (run.ts: 2-3 por partida, sin rng): la aparición común más reciente (mejor si no es hormiga) se vuelve élite
  for (const [t, k] of profile.elites) if (t <= time && t > time - dt) {
    const pool = enemies.filter((x) => !x.def.boss && !x.elite).reverse(), e = pool.find((x) => x.kind !== "hormiga") ?? pool[0];
    if (e) { e.makeElite(k); banner(k === "rapida" ? "ÉLITE RÁPIDA" : "ÉLITE BLINDADA", 2); }
  }

  // --- Enemigos ---
  const cv = c.body.getLinearVelocity();
  const carR = Math.max(c.def.size[0], c.def.size[2]) / 2;
  let contactHit = 0;
  for (const e of enemies) {
    const ev = e.stun > 0 ? stunned(e, wdt) : e.update(wdt, c.pos);
    if (ev === "spit") {
      // Apunta adonde vas a estar (predicción simple): esquivar = cambiar de rumbo
      const cvl = c.body.getLinearVelocity(), from = e.pos.add(new B.Vector3(0, 0.6, 0));
      const t = B.Vector3.Distance(from, c.pos) / 16, aim = c.pos.add(new B.Vector3(cvl.x, 0, cvl.z).scale(t * 0.8));
      const m = spitTpl().createInstance("sp");
      m.position.copyFrom(from);
      spits.push({ m, v: aim.subtract(from).normalize().scale(16), life: 2.2 });
    }
    if (e.stun <= 0) e.animate(wdt);
    if (ev === "slam") {
      FX.slam(e.pos, 10);
      mark("scorch", e.pos.x, e.pos.z, 0, 7, 10);
      shake = 1.2;
      if (B.Vector3.Distance(e.pos, c.pos) < 11) hurt(25, false, "salto " + e.kind);
      for (const o of enemies) if (o !== e && B.Vector3.Distance(o.pos, e.pos) < 10) damage(o, 999);
    }
    // Jefes finales nuevos (enemies.ts): tuercas en abanico, barrido en arco, cables y succión
    if (ev === "fan") for (const d of e.fan) { const m = nutTpl().createInstance("nut"); m.position.copyFrom(e.pos).addInPlace(new B.Vector3(d.x * 3.4, 0.7, d.z * 3.4)); spits.push({ m, v: d.scale(16), life: 2.2 }); }
    if (ev === "slash") { hurt(28, false, "barrido " + e.kind); FX.sparks(c.pos); }
    if (ev === "shock") { hurt(6, false, "cables"); FX.sparks(c.pos); }
    if (e.pull && e.stun <= 0) { const d = new B.Vector3(e.pos.x - c.pos.x, 0, e.pos.z - c.pos.z).normalize().scaleInPlace(e.pull * wdt); c.body.setLinearVelocity(c.body.getLinearVelocity().addInPlace(d)); }
    const dist = Math.hypot(e.pos.x - c.pos.x, e.pos.z - c.pos.z);
    if (!e.def.boss && !e.elite && dist > 75) { e.hp = -1e9; continue; } // muy lejos: se recicla (la élite no: lleva cofre)
    if (e.kind === "cortadora" && e.stun <= 0) for (const o of enemies) if (o !== e && !o.def.boss && B.Vector3.Distance(o.pos, e.pos) < e.radius + 0.5) damage(o, 999); // corta todo
    if (dist < e.radius + carR && c.pos.y - e.pos.y < e.def.size[1] + 0.5) {
      const dir = new B.Vector3(e.pos.x - c.pos.x, 0, e.pos.z - c.pos.z).normalize();
      const rel = B.Vector3.Dot(cv, dir); // solo cuenta TU velocidad hacia el enemigo
      if (rel > 5 && e.ramCd <= 0) {
        const lanza = weapons.find((w) => w.id === "lanza");
        const dmg = rel * c.def.ram * (1 + 0.35 * (lanza?.lv ?? 0)) * (boosting ? (c.kind === "axel" ? 1.6 : 1.3) : 1) * st.dmg * (lanza?.evolved ? 1.5 : 1);
        dmgSrc = "embestida";
        damage(e, dmg, dir.scale(rel * 0.8).addInPlace(new B.Vector3(0, rel * 0.2, 0)), true);
        FX.sparks(e.pos.add(new B.Vector3(0, 0.5, 0)));
        SFX.ram(rel);
        e.ramCd = 0.3;
        shake = Math.max(shake, 0.25);
        if (ariete) explode(e.pos, 4, dmg * 0.5);
        dmgSrc = "";
        // Embestir algo más pesado que vos tiene costo: rebote y daño (salvo Ariete)
        if (e.def.mass > c.def.mass * st.mass * 1.8 && !ariete) {
          if (e.touchCd <= 0) { hurt(e.def.dmg * 0.4, false, "rebote " + e.kind); e.touchCd = 0.8; }
          c.body.applyImpulse(dir.scale(-rel * 0.9 * c.def.mass).addInPlace(new B.Vector3(0, 1.5, 0)), c.pos);
        }
      } else if (rel <= 5 && !(ariete && boosting) && e.touchCd <= 0 && e.stun <= 0) {
        contactHit = Math.max(contactHit, e.def.dmg * 0.4); // el golpe más fuerte, no la suma
        dmgBy["contacto " + e.kind] = (dmgBy["contacto " + e.kind] ?? 0) + e.def.dmg * 0.6;
        e.touchCd = 0.8;
        // Un jefe te despide lejos: nunca quedás atrapado contra él
        if (e.def.boss) c.body.applyImpulse(dir.scale(-14 * c.def.mass).addInPlace(new B.Vector3(0, 4 * c.def.mass, 0)), c.pos);
      }
    }
  }
  // Invulnerabilidad de contacto: como mucho un golpe cada 0,5 s aunque te rodeen
  if ((touchIFrame -= dt) <= 0 && contactHit) { hurt(contactHit, true, "_contacto"); SFX.hurt(); touchIFrame = 0.6; }
  for (const e of enemies.filter((x) => x.hp <= 0)) {
    enemies.splice(enemies.indexOf(e), 1);
    if (e.hp < -1e8) e.dispose(); else kill(e);
    if (state !== "play") return;
  }
  const boss = enemies.find((e) => e.def.boss);
  if (boss) hudBoss(boss.def.name, Math.max(0, boss.hp / boss.maxHp));
  { const ms = boss ? "boss" : apagon ? "blackout" : "run"; if (!simulating && (ms !== musicS || (musicT -= dt) <= 0)) { musicS = ms; musicT = 1; music(ms, time / 600); } } // música: cambio de estado al instante, intensidad cada ~1 s

  // --- Ácido de escupidoras ---
  for (let i = spits.length - 1; i >= 0; i--) {
    const s = spits[i];
    s.m.position.addInPlace(s.v.scale(wdt));
    s.v.y -= 3 * wdt;
    let dead = (s.life -= wdt) <= 0 || s.m.position.y < 0.1;
    if (B.Vector3.Distance(s.m.position, c.pos) < carR + 0.3) { hurt(7, false, "ácido"); FX.hit(s.m.position); dead = true; }
    if (dead) { mark("scorch", s.m.position.x, s.m.position.z, Math.random() * 6, 0.6, 5); s.m.dispose(); spits.splice(i, 1); }
  }

  // --- Armas ---
  const ctx: Ctx = { scene, car: c, enemies, dt, st, fs: r.fs, damage, explode };
  for (const w of weapons) { dmgSrc = w.id; w.update(ctx); }
  dmgSrc = "";

  // --- Recolección ---
  const mag2 = st.magnet * st.magnet;
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i];
    const dx = c.pos.x - g.m.position.x, dz = c.pos.z - g.m.position.z, d2 = dx * dx + dz * dz;
    if (d2 < mag2) g.pull = true;
    g.m.rotation.y += dt * 2;
    if (g.vy !== 0 || g.m.position.y > 0) { g.vy -= 22 * dt; g.m.position.y = Math.max(0, g.m.position.y + g.vy * dt); if (g.m.position.y === 0) g.vy = g.vy < -4 ? -g.vy * 0.35 : 0; } // rebota una o dos veces
    if (g.pull) { const d = Math.sqrt(d2), sp = Math.min(d, (18 + 20 / (d + 0.5)) * dt); g.m.position.x += (dx / d) * sp; g.m.position.z += (dz / d) * sp; }
    if (d2 < 1.2) { gainXp(g.xp); SFX.gem(); if (g.xp > 1) FX.xp(g.m.position); g.m.dispose(); gems.splice(i, 1); }
  }
  for (const p of [...pickups]) {
    p.m.rotation.y += dt * 2;
    if (B.Vector3.Distance(p.m.position, c.pos) < 2.2) {
      SFX.pickup();
      if (p.type === "pila") hp = Math.min(maxHp, hp + 30);
      else if (p.type === "iman") for (const g of gems) g.pull = true;
      else openChest();
      p.m.dispose();
      pickups.splice(pickups.indexOf(p), 1);
      if (state !== "play") return;
    }
  }

  // --- Eventos del patio ---
  if ((chestT -= dt) <= 0) { chestT = profile.chestEvery; dropPickup(spawnPoint(c.pos, 20, 35), "cofre"); banner("COFRE EN EL PATIO", 1.6); }
  if ((ballT -= dt) <= 0 && !ball) {
    // Una pelota gigante cruza el patio aplastando todo
    ballT = profile.ballEvery;
    const from = spawnPoint(c.pos, 40, 45);
    const m = sph(8, pbr("bigball", { color: "#f97316", rough: 0.45 }), [from.x, 4, from.z], undefined, 16);
    shadows.addShadowCaster(m);
    const agg = new B.PhysicsAggregate(m, B.PhysicsShapeType.SPHERE, { mass: 30, restitution: 0.5 }, scene);
    agg.body.setLinearVelocity(c.pos.subtract(from).normalize().scale(26));
    ball = { m, agg, life: 7 };
    banner("¡PELOTA!", 1.2);
  }
  if (ball) {
    dmgSrc = "pelota";
    for (const e of enemies) if (!e.def.boss && B.Vector3.Distance(e.pos, ball.m.position) < 4 + e.radius) damage(e, 999);
    dmgSrc = "";
    if (!ball.hit && B.Vector3.Distance(c.pos, ball.m.position) < 4 + carR) { ball.hit = true; hurt(20, false, "pelota"); }
    if ((ball.life -= wdt) <= 0) { ball.agg.dispose(); ball.m.dispose(); ball = null; }
  }

  hp = Math.min(maxHp, hp + st.regen * dt);
  if (hp <= 0 && revives > 0) { revives--; hp = maxHp * 0.5; explode(c.pos, 9, 150); banner("BATERÍA DE RESERVA", 2); }
  if (hp <= 0) return endless ? endRun(true, "El auto quedó destrozado en el modo sin fin.") : endRun(false, "El auto quedó destrozado.");
  if (pendingLevels > 0 && state === "play") { pendingLevels--; openOffers(offersFor(), `Nivel ${level - pendingLevels}`); }
}

let god = false; // solo dev
let lampBoost = false, moteT = 0, flyT = 0;
let rainK = 0, rainBanner = false; // lluvia: intensidad 0..1 y aviso ya mostrado
// Zoom de cámara: rueda del mouse o teclas - / = (0.8 cerca … 2 lejos), se guarda
const zoomBy = (k: number) => { save.zoom = Math.min(2, Math.max(0.8, save.zoom * k)); persist(); };
addEventListener("wheel", (ev) => state === "play" && zoomBy(ev.deltaY > 0 ? 1.08 : 1 / 1.08), { passive: true });
addEventListener("keydown", (ev) => { if (ev.key === "-" || ev.key === "=" || ev.key === "+") zoomBy(ev.key === "-" ? 1.1 : 1 / 1.1); });
const LAB = { on: false, back: 15, up: 13, t: 1 }; // modo lab (solo dev): mundo congelado para probar el look
const dmgBy: Record<string, number> = {}; // solo dev: de dónde viene el daño
function hurt(n: number, continuous = false, src = "?") {
  if (god || (abil === "escudo" && abilOn > 0)) return; // escudo: invulnerable
  airHit = true;
  if (driveMul > 1) { driveMul = 1; hudDrive(1); } // el combo de manejo cae con cualquier golpe
  hitAt = time;
  dmgBy[src] = (dmgBy[src] ?? 0) + n * (1 - st.armor);
  hp -= n * (1 - st.armor);
  if (!simulating && car && !save.calm) { FX.sparks(car.pos.add(new B.Vector3(0, 0.5, 0))); if (!continuous) debris(car.pos, save.paint || "#d62828", 2, 5, 0.5); } // chispas (y pedazos de pintura en los golpes fuertes) al recibir daño
  if (!continuous) {
    shake = Math.max(shake, 0.5);
    if (!simulating && !save.calm) glitchHit();
    if (!simulating && save.rumble) void navigator.getGamepads?.()[0]?.vibrationActuator?.playEffect("dual-rumble", { duration: 140, strongMagnitude: 0.6, weakMagnitude: 0.4 });
  }
}

// ---------- Habilidad activa ----------
function useAbility(c: Car) {
  const a = ABILITIES[abil];
  abilCd = a.cd; abilOn = a.dur;
  if (abil === "bombardeo") { bombs = 10; bombT = 0; }
  else if (abil === "escudo") {
    if (!shieldM) { shieldM = sph(Math.max(...c.def.size) * 1.5, pbr("escudo", { color: "#8dff6a", emissive: "#3f9a2a", alpha: 0.18 }), [0, 0.2, 0]); shieldM.parent = c.root; shieldM.isPickable = false; }
    shieldM.isVisible = true;
    SFX.pickup();
  } else if (abil === "emp") {
    for (const e of enemies) if (!e.def.boss && !e.airborne && B.Vector3.Distance(e.pos, c.pos) < 14 + e.radius) e.stun = 2;
    if (!simulating) burst(c.pos.add(new B.Vector3(0, 0.6, 0)), { n: 90, color: "#8dff6a", color2: "#6fb3c4", size: [0.2, 0.6], power: [14, 22], life: [0.25, 0.5], gravity: 0 });
    SFX.zap(); shake = Math.max(shake, 0.4);
  } else { worldK = 0.4; fxSpeed(0.4); }
}
// Aturdido (Pulso EMP): sin IA ni ataques, se frena en el lugar y chisporrotea; los enfriamientos siguen corriendo
function stunned(e: Enemy, dt: number) {
  e.stun -= dt; e.ramCd -= dt; e.touchCd -= dt; e.hitCd -= dt;
  const v = e.body.getLinearVelocity();
  e.body.setLinearVelocity(new B.Vector3(v.x * 0.85, v.y, v.z * 0.85));
  e.body.setAngularVelocity(B.Vector3.Zero());
  if (!simulating && Math.random() < dt * 5) FX.sparks(e.pos.add(new B.Vector3(0, e.def.size[1] * 0.6, 0)));
  return undefined;
}
// Cámara lenta: el paso de Havok (también el de __sim y el del cierre) avanza el mundo a worldK y al auto no.
// El auto entra con la velocidad escalada 1/k, sale con la real y recupera la gravedad que el paso corto no le dio.
// ponytail: los choques auto-enemigo se resuelven con la velocidad escalada (empujan 2,5 veces más); alcanza para 3 s de efecto
{
  const pe = scene.getPhysicsEngine() as unknown as { _step(d: number): void; gravity: B.Vector3 }, step0 = pe._step.bind(pe);
  pe._step = (d: number) => {
    if (worldK === 1 || !car) return step0(d);
    const b = car.body, k = worldK;
    b.setLinearVelocity(b.getLinearVelocity().scaleInPlace(1 / k)); b.setAngularVelocity(b.getAngularVelocity().scaleInPlace(1 / k));
    step0(d * k);
    const v = b.getLinearVelocity().scaleInPlace(k); v.y += pe.gravity.y * d * (1 - k * k);
    b.setLinearVelocity(v); b.setAngularVelocity(b.getAngularVelocity().scaleInPlace(k));
  };
}
// Combo de manejo: cada maniobra suma al multiplicador de XP, con tope x2
function trick(name: string, k: number) { trickT = 0; driveMul = Math.min(2, driveMul + k); if (!simulating) hudDrive(driveMul, name); }

// ---------- Modo sin fin: "Seguir jugando" en los resultados tras vencer al jefe final ----------
function goEndless() {
  if (state !== "over" || endless || !car || !bank) return;
  endless = true; runDist = 0; // lo manejado hasta acá ya se sumó a las estadísticas
  state = "play"; scene.physicsEnabled = true; reset(null);
  music("run", 1); musicS = "run";
  $("hud").classList.remove("hidden");
  RUN_BOSSES.push([time + 120, RUN_BOSSES[RUN_BOSSES.length % 3][1]]);
  banner("MODO SIN FIN", 2.5);
}

let hudT = 0, lastKmh = 0, lastMaxKmh = 80;
function updateHud(dt: number) {
  hudSlots(weapons.map((w) => ({ id: w.id, lv: w.lv, evolved: w.evolved, cd: w.cdFrac })), (Object.entries(passives) as [PassiveId, number][]).map(([id, lv]) => ({ id, lv })));
  // Flechas hacia jefes y cofres fuera de pantalla
  const W = engine.getRenderWidth(), H = engine.getRenderHeight(), k = innerWidth / W, out: { x: number; y: number; kind: "jefe" | "cofre" }[] = [];
  const targets: [B.Vector3, "jefe" | "cofre"][] = [...enemies.filter((e) => e.def.boss).map((e) => [e.pos, "jefe"] as [B.Vector3, "jefe"]), ...pickups.filter((p) => p.type === "cofre").map((p) => [p.m.position, "cofre"] as [B.Vector3, "cofre"])];
  for (const [p, kind] of targets) {
    const sp = toScreen(p);
    let x = sp.x, y = sp.y;
    if (sp.z > 1) { x = W - x; y = H; } // detrás de la cámara
    if (sp.z > 1 || x < 0 || x > W || y < 0 || y > H) out.push({ x: x * k, y: y * k, kind });
  }
  hudArrows(out);
  if ((hudT -= dt) > 0) return;
  hudT = 0.05;
  hudRadar(
    { x: car!.pos.x, z: car!.pos.z, yaw: Math.atan2(car!.root.forward.x, car!.root.forward.z), up: camYaw },
    [...enemies.map((e) => ({ x: e.pos.x, z: e.pos.z, kind: e.def.boss ? ("jefe" as const) : ("enemigo" as const) })),
     ...pickups.filter((p) => p.type === "cofre").map((p) => ({ x: p.m.position.x, z: p.m.position.z, kind: "cofre" as const }))]);
  // Daño visible: pintura gastada y piezas que saltan al cruzar 50% y 25%
  const frac = Math.max(0, hp / maxHp);
  car!.wear(frac);
  for (const t of [0.5, 0.25]) if (lastHpFrac > t && frac <= t) { debris(car!.pos, save.paint || "#d62828", 8, 7, 0.8); FX.sparks(car!.pos); shake = Math.max(shake, 0.6); }
  lastHpFrac = frac;
  hudUpdate({ hp, maxHp, boost, xp, need: xpNeed(level), level, time, kills, kmh: lastKmh, maxKmh: lastMaxKmh });
  hudAbility(ABILITIES[abil].short, ctl === "pad" ? "X" : keyName(KEYS.ability[0]), 1 - Math.max(0, abilCd) / ABILITIES[abil].cd, abilOn > 0);
}

// ---------- Loop ----------
const camTarget = new B.Vector3();
// Encuadres del menú: [cámara x, y, z, mira x, y, z]. Casa al fondo en z ≈ 110, auto del garaje en el origen.
const SHOTS: Record<string, number[]> = {
  title: [0, 48, -95, 0, 4, 20], main: [32, 15, -40, 0, 2, 0], garage: [0, 2.1, -6.2, 1.7, 0.7, 0], shop: [7, 2.6, -8, -2, 1.2, 6],
  config: [-34, 9, -22, 0, 1, 30], bestiary: [6, 9, 55, 0, 30, 110], credits: [0, 4, -24, 10, 38, 90],
};
// Encuadres propios de cada zona (lo que falta sale de SHOTS). Garaje: el auto real ocupa x 10..50 y la casa no existe.
const ZSHOTS: Record<string, Record<string, number[]>> = {
  garaje: { main: [-30, 14, -45, 8, 4, 12], config: [-12, 9, -30, 12, 3, 22], bestiary: [-45, 14, -30, -45, 28, -80], credits: [18, 6, -32, 38, 26, -80] },
  jardin: { bestiary: [6, 9, 45, 0, 30, 140], credits: [0, 4, -24, 10, 38, 130] },
};
const shot = (scr: string) => ZSHOTS[zoneId]?.[scr] ?? SHOTS[scr] ?? SHOTS.main;
let previewKey = "", previewR = 0;
// Portada del título: auto en primer plano a ras del pasto mirando a la luna, bichos acechando al fondo, roca oscura delante.
// Se arma al entrar al título y se desarma al salir. Los bichos son Enemy normales sin IA (solo animate).
let art: { bugs: Enemy[]; rock: B.Mesh; yaw: number } | null = null;
function titleArt(on: boolean) {
  if (!on) {
    if (!art) return;
    for (const e of art.bugs) e.dispose();
    art.rock.dispose();
    art = null;
    applyClimate(zoneClimate() ?? DUSK);
    return;
  }
  if (art) return;
  applyClimate(zoneClimate() ?? DUSK);
  const L = (scene.getLightByName("sun") as B.DirectionalLight).direction;
  const v = new B.Vector3(-L.x, 0, -L.z).normalize(), side = new B.Vector3(v.z, 0, -v.x); // v: hacia la luna (contraluz)
  const cp = v.scale(-4.4).addInPlace(side.scale(1.7));
  SHOTS.title = [cp.x, 0.42, cp.z, v.x * 3 - side.x * 0.5, 0.8, v.z * 3 - side.z * 0.5];
  const bugs = ([["escarabajo", 7, -4.2], ["hormiga", 5, 3.4], ["hormiga", 6.5, 5], ["robot", 10, -7]] as [Kind, number, number][]).map(([kind, d, sd]) => {
    const p = v.scale(d).addInPlace(side.scale(sd));
    const e = new Enemy(kind, new B.Vector3(p.x, 0.1, p.z), 1);
    e.body.disablePreStep = false; // quietos y mirando al auto: el cuerpo sigue a la malla
    e.node.rotationQuaternion = B.Quaternion.RotationYawPitchRoll(Math.atan2(-p.x, -p.z), 0, 0);
    return e;
  });
  const rp = cp.add(v.scale(1.9)).addInPlace(side.scale(-2.1));
  const rock = sph(1.5, M.matte("#120e0b"), [rp.x, 0.05, rp.z], [1.3, 0.45, 1]);
  art = { bugs, rock, yaw: Math.atan2(-v.x, -v.z) - 1.3 };
  // La portada aparece ya encuadrada (sin viajar desde la cámara inicial, que pasa sobre la mesa)
  cam.position.set(SHOTS.title[0], SHOTS.title[1], SHOTS.title[2]);
  camTarget.set(SHOTS.title[3], SHOTS.title[4], SHOTS.title[5]);
}
scene.onBeforeRenderObservable.add(() => {
  padSnap();
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
  pollInput();

  if (state === "level") {
    if (padPressed(14)) { offerSel = (offerSel + offers.length - 1) % offers.length; selectOffer(offerSel); }
    if (padPressed(15)) { offerSel = (offerSel + 1) % offers.length; selectOffer(offerSel); }
    if (padPressed(0)) pickOffer(offerSel);
    if (padPressed(3)) reroll();
  } else if (state === "play") { if (padPressed(9)) pause(); }
  else if (state === "outro") outroTick(dt);
  else if (state === "race") raceTick(dt);
  else if (!introOn()) menuPad(dt); // con la intro encima el menú no escucha el gamepad

  if (state === "play") {
    // Hit-stop: congela el mundo un par de cuadros en los golpes fuertes
    if (hitStop > 0) { hitStop -= dt; scene.physicsEnabled = false; }
    else { scene.physicsEnabled = true; update(LAB.on ? 1e-4 : dt); }
    updateHud(dt);
  }
  tickFx(dt * ts);
  uiTick(dt);

  // Cámara 3/4 elevada. Con teclado sigue el rumbo del auto; con stick queda fija
  // (si rotara, la dirección del stick cambiaría mientras girás).
  const k = 1 - Math.exp(-5 * dt);
  setWind(performance.now() / 1000, car?.pos ?? null);
  if (state === "race") {
    // la carrera maneja sus propias cámaras (kart.ts)
  } else if (car) {
    if (!input.move && state === "play") {
      const f = car.root.forward;
      const target = Math.atan2(f.x, f.z);
      camYaw += Math.atan2(Math.sin(target - camYaw), Math.cos(target - camYaw)) * (1 - Math.exp(-2 * dt));
    }
    // Al elegir mejoras la cámara se acerca y gira a 3/4 frontal para ver la pieza montada
    const close = state === "level";
    const yaw = close ? camYaw + 2.5 : camYaw;
    setLamp(car.pos, car.root.forward, lampBoost, dt);
    if (!simulating) { tickRain(dt * ts, car.pos, car.root.forward, rainK); rainSfx(rainK); }
    // Polvo que flota dentro del haz del faro
    if (!simulating && (moteT -= dt) <= 0) {
      moteT = 0.09;
      const f = car.root.forward, d = 3 + Math.random() * 11, sd = (Math.random() - 0.5) * d * 0.9;
      ambient("mote", new B.Vector3(car.pos.x + f.x * d + f.z * sd, 0.4 + Math.random() * 2.2, car.pos.z + f.z * d - f.x * sd));
    }
    // Luciérnagas alrededor del auto cuando ya anocheció; en el garaje, polvo bajo los tubos
    const dust = zoneDust();
    if (!simulating && dust && (flyT -= dt) <= 0) {
      flyT = 0.05;
      const [x, z, w, d] = dust[Math.floor(Math.random() * dust.length)];
      ambient("mote", new B.Vector3(x + (Math.random() - 0.5) * w, 0.5 + Math.random() * 12, z + (Math.random() - 0.5) * d));
    } else if (!simulating && !dust && profile.climate.day && (flyT -= dt) <= 0) {
      flyT = 0.15; // de día: pétalos y mariposas en vez de luciérnagas
      const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 24;
      ambient("petal", new B.Vector3(car.pos.x + Math.cos(a) * r, 0.4 + Math.random() * 3, car.pos.z + Math.sin(a) * r));
    } else if (!simulating && !dust && cycleS > 0.5 && (flyT -= dt) <= 0) {
      flyT = 0.12 / cycleS;
      const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 22;
      ambient("fly", new B.Vector3(car.pos.x + Math.cos(a) * r, 0.5 + Math.random() * 2.5, car.pos.z + Math.sin(a) * r));
    }
    const back = new B.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    // Bajo la mesa la cámara baja y se acerca (roofK suaviza entrar y salir); afuera vuelve al zoom del usuario
    roofK += ((underRoof(car.pos) ? 1 : 0) - roofK) * (1 - Math.exp(-3 * dt));
    const zm = (LAB.on ? 1 : save.zoom) * outroZ, zb = B.Scalar.Lerp(zm, 0.7, roofK), zu = B.Scalar.Lerp(zm, 0.4, roofK);
    const fp = state === "outro" && outroAt ? outroAt : car.pos; // foco de la cámara
    const want = fp.subtract(back.scale(close ? 5.5 : LAB.back * zb)).addInPlace(new B.Vector3(0, close ? 3.2 : LAB.up * zu, 0));
    cam.position = B.Vector3.Lerp(cam.position, want, close ? 1 - Math.exp(-8 * dt) : k);
    B.Vector3.LerpToRef(camTarget, close ? car.pos.add(new B.Vector3(0, -1.4, 0)) : fp.add(back.scale(3)), close ? 0.2 : k * 1.5, camTarget);
    // Lo que queda entre cámara y auto se tramea (screen-door en render.ts) mientras tapa
    if (!simulating) {
      const to = car.pos.add(new B.Vector3(0, 0.6, 0)).subtractInPlace(cam.position), len = to.length();
      const ray = new B.Ray(cam.position, to.scaleInPlace(1 / len), len);
      for (const m of occluders) m.visibility = ray.intersectsMesh(m, true).hit ? 0.999 : 1;
    }
  } else {
    { // en el menú también: lo que tape el encuadre (la mesa al viajar entre pantallas) se tramea
      const to = camTarget.subtract(cam.position), len = to.length();
      const ray = new B.Ray(cam.position, to.scaleInPlace(1 / Math.max(len, 1e-3)), len);
      for (const m of occluders) m.visibility = ray.intersectsMesh(m, true).hit ? 0.999 : 1;
    }
    // Diorama: cada pantalla del menú tiene su encuadre; la cámara viaja con lerp suave y se mece un poco
    const scr = current() ?? "main", t = performance.now() / 1000;
    // Fondo = zona elegida: al cambiarla se rehace el mundo y la cámara salta al encuadre nuevo (sin viajar atravesando paredes)
    if (setZone(save.zone)) {
      applyClimate(zoneClimate() ?? DUSK);
      const [x, y, z, a, b, c] = shot(scr);
      cam.position.set(x, y, z); camTarget.set(a, b, c);
    }
    titleArt(scr === "title");
    const [px, py, pz, tx, ty, tz] = shot(scr);
    const sw = scr === "garage" ? 0.15 : scr === "title" ? 0.12 : 2.5, kk = 1 - Math.exp(-2.2 * dt);
    B.Vector3.LerpToRef(cam.position, new B.Vector3(px + Math.sin(t * 0.13) * sw, py + Math.sin(t * 0.21) * sw * 0.3, pz + Math.cos(t * 0.11) * sw), kk, cam.position);
    B.Vector3.LerpToRef(camTarget, new B.Vector3(tx, ty, tz), kk, camTarget);
    // Título y garaje: el auto elegido en el centro del patio (reusa `preview`, que clearRun libera)
    if (scr === "garage" || scr === "title") {
      const key = save.car + JSON.stringify(carOpts());
      if (!preview || previewKey !== key) {
        preview?.dispose();
        const m = carModel(save.car, carOpts());
        preview = m.body;
        previewR = Math.max(...m.wheels.map((w) => w.r));
        preview.position.y = previewR;
        shadows.addShadowCaster(preview, true);
        previewKey = key;
      }
      if (scr === "garage") { preview.rotation.y += dt * 0.6; preview.rotation.z = 0; preview.position.y = previewR; }
      else if (art) {
        // Portada: vaivén de suspensión, faro que titila, polvo en el haz y luciérnagas
        preview.rotation.y = art.yaw;
        preview.position.y = previewR + Math.sin(t * 2.3) * 0.012;
        preview.rotation.z = Math.sin(t * 1.7) * 0.012;
        const f = new B.Vector3(Math.sin(art.yaw), 0, Math.cos(art.yaw));
        setLamp(preview.position, f, Math.random() < 0.025, dt);
        if ((moteT -= dt) <= 0) { moteT = 0.06; const d = 1.5 + Math.random() * 7, sd = (Math.random() - 0.5) * d * 0.7; ambient("mote", new B.Vector3(f.x * d + f.z * sd, 0.3 + Math.random() * 1.2, f.z * d - f.x * sd)); }
        if (!zoneDust() && (flyT -= dt) <= 0) { flyT = 0.18; const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 12; ambient("fly", new B.Vector3(Math.cos(a) * r, 0.4 + Math.random() * 2, Math.sin(a) * r)); }
        for (const e of art.bugs) e.animate(dt);
      }
    } else if (preview) { preview.dispose(); preview = null; }
  }
  shake = Math.max(0, shake - dt * 2);
  const s = save.shake ? shake * shake * 0.8 : 0;
  if (state !== "race") cam.setTarget(camTarget.add(new B.Vector3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, 0)));
});

engine.runRenderLoop(() => scene.render());
addEventListener("resize", () => engine.resize());

// Solo dev: avanzar frames a mano y atajos de prueba (pestaña oculta = sin requestAnimationFrame)
if (import.meta.env.DEV) import("./devbot").then((m) => Object.assign(window, {
  __bot: m.bot,
  // Adelantar el tiempo: simula la partida con paso fijo y SIN dibujar, conducida por el bot.
  // Determinista: misma semilla (?seed=N) = mismo resultado. Devuelve un resumen.
  __sim: (secs: number, dt = 1 / 60) => {
    const pe = scene.getPhysicsEngine() as unknown as { _step(d: number): void };
    const w0 = performance.now(), end = time + secs;
    simulating = true;
    m.resetBot();
    while (time < end && (state === "play" || state === "level") && performance.now() - w0 < 35000) {
      if (state === "level") {
        // Como una persona competente: evolución/fusión; con poca vida, supervivencia; subir armas propias hacia la evolución,
        // la pasiva que evoluciona un arma propia, armas nuevas hasta 4 (el Lápiz-lanza solo rinde embistiendo), daño y recarga
        const low = hp < maxHp * 0.6, evoP = new Set(weapons.filter((w) => !w.evolved).map((w) => WEAPONS[w.id].evo as string));
        const pref = (o: Offer) => o.kind === "evo" || o.kind === "fusion" ? 9 : low && (o.id === "litio" || o.id === "lego" || o.kind === "heal") ? 8
          : o.kind === "weapon" && weapons.some((w) => w.id === o.id) ? 7 : o.kind === "passive" && evoP.has(o.id) && !passives[o.id as PassiveId] ? 6
          : o.kind === "weapon" && o.id !== "lanza" && weapons.length < 4 ? 5 : o.id === "lupa" || o.id === "capacitor" ? 4
          : o.kind === "passive" && evoP.has(o.id) ? 3 : o.kind === "weapon" && o.id !== "lanza" ? 2 : o.kind === "passive" ? 1 : 0;
        choose(offers.reduce((b, o, i) => (pref(o) > pref(offers[b]) ? i : b), 0));
        continue;
      }
      car!.root.computeWorldMatrix(true);
      for (const e of enemies) e.node.computeWorldMatrix(true);
      // Lo que una persona ve del jefe: aros rojos de la tarántula, el perro en el aire (cae cerca de su sombra), la cortadora cargando, ácido en vuelo
      const b = enemies.find((e) => e.def.boss), zones: { x: number; z: number; r: number }[] = [];
      if (b?.tele[0]?.isVisible) zones.push({ x: b.tele[0].position.x, z: b.tele[0].position.z, r: b.tele[0].scaling.x });
      if (b?.kind === "perro" && b.airborne) { const bv = b.body.getLinearVelocity(), t = (bv.y + Math.sqrt(Math.max(0, bv.y * bv.y + 50 * b.pos.y))) / 25; zones.push({ x: b.pos.x + bv.x * t, z: b.pos.z + bv.z * t, r: 11 }); }
      for (const s of spits) zones.push({ x: s.m.position.x + s.v.x * 0.3, z: s.m.position.z + s.v.z * 0.3, r: 1.2 });
      for (const cb of b?.cables ?? []) zones.push({ x: (cb.a.x + cb.b.x) / 2, z: (cb.a.z + cb.b.z) / 2, r: 3.5 }); // cables del cortacercos
      const bb = b && { x: b.pos.x, z: b.pos.z, kind: b.kind, fx: b.node.forward.x, fz: b.node.forward.z, charge: b.kind === "cortadora" && b.state === 1, ram: weapons.some((w) => w.id === "lanza" && w.evolved) };
      Object.assign(input, m.botSteer(car!, enemies.filter((e) => !e.def.boss).map((e) => e.pos), obstacles(), bb, zones), { move: false, drift: false });
      update(dt);
      pe._step(dt);
      tickFx(dt);
    }
    simulating = false;
    $("levelup").classList.add("hidden");
    const boss = enemies.find((e) => e.def.boss);
    return `${fmt(time)} nv${level} hp${Math.round(hp)}/${maxHp} en${enemies.length} bajas ${kills} [${weapons.map((w) => w.id + (w.evolved ? "★" : w.lv)).join(" ")}] ${state}${boss ? ` JEFE ${boss.def.name} ${Math.round((boss.hp / boss.maxHp) * 100)}%` : ""}${state === "over" ? " · " + $("overTitle").textContent + ": " + $("overTxt").textContent : ""} · ${profile.climate.name}/${profile.plague.name} · semilla ${runSeed} · tornillos ${Math.floor((runScrap + Math.floor(time / 20) + Math.floor(kills / 25)) * curseK)} · ${((performance.now() - w0) / 1000).toFixed(1)} s reales`;
  },
}));
if (import.meta.env.DEV && location.search.includes("lab")) setTimeout(() => (window as unknown as { __lab(o: object): void }).__lab({ climate: new URLSearchParams(location.search).get("climate") ?? undefined, t: Number(new URLSearchParams(location.search).get("t") ?? 1), boss: location.search.includes("boss"), rain: location.search.includes("rain") }), 800);
if (import.meta.env.DEV) Object.assign(window, {
  __tick: (n: number) => { const g = engine.getDeltaTime; engine.getDeltaTime = () => 1000 / 60; for (let i = 0; i < n; i++) { engine.beginFrame(); scene.render(); engine.endFrame(); } engine.getDeltaTime = g; },
  __killAll: () => enemies.forEach((e) => { if (!e.def.boss) e.hp = 0; }),
  __time: (s: number) => (time = s),
  __xp: (n: number) => gainXp(n),
  __god: () => (god = true),
  // Dispara una habilidad sin enfriamiento (no toca el guardado): __abil("emp")
  __abil: (id?: AbilityId) => { if (!car || state !== "play") return "sin partida"; if (id) abil = id; abilCd = 0; useAbility(car); return abil; },
  __endless: () => { goEndless(); return { endless, next: RUN_BOSSES.at(-1) }; },
  __dmg: () => { const r = JSON.stringify(dmgBy); for (const k in dmgBy) delete dmgBy[k]; return r; },
  __out: () => JSON.stringify(Object.fromEntries(Object.entries(dmgOut).map(([k, v]) => [k, Math.round(v)]))), // daño infligido por arma
  __outro: () => { hp = -1; }, // fuerza la derrota (cierre en cámara lenta)
  __killBoss: () => enemies.forEach((e) => { if (e.def.boss) e.hp = 0; }),
  __info: () => ({ state, time, level, hp, enemies: enemies.length, gems: gems.length, weapons: weapons.map((w) => w.id + w.lv), fps: engine.getFps(), abil, abilCd, abilOn, worldK, stun: enemies.filter((e) => e.stun > 0).length, driveMul, endless, next: RUN_BOSSES[bossIdx] }),
  __car: () => car && { p: car.pos, f: car.root.forward },
  __look: look,
  // Modo lab: arranca una partida congelada con una fila de cada enemigo delante del auto y la cámara a mano.
  // t = momento del ciclo (0 atardecer … 1 noche). __lab({ climate: "niebla", t: 0.4, boss: true, back: 15, up: 13, look: { lampI: 8 } }) ; ?lab en la URL lo corre solo.
  __lab: (o: { climate?: string; t?: number; boss?: boolean; back?: number; up?: number; look?: Parameters<typeof look>[0]; frames?: number; rain?: boolean } = {}) => {
    if (state !== "menu") toMenu();
    startRun();
    god = true; LAB.on = true; LAB.back = o.back ?? 15; LAB.up = o.up ?? 13;
    $("hint").classList.add("hidden");
    const k = CLIMATES.find((c) => c.id === o.climate); if (k) profile.climate = k;
    LAB.t = o.t ?? 1; cycleS = -1;
    if (o.rain) { profile.rainAt = 0; rainWet(0.8); }
    if (o.look) look(o.look);
    const kinds = (Object.keys(DEF) as Kind[]).filter((x) => o.boss || !DEF[x].boss);
    const f = car!.root.forward, r = new B.Vector3(f.z, 0, -f.x);
    kinds.forEach((kd, i) => spawnEnemy(kd, car!.pos.add(f.scale(8 + (i % 2) * 5)).addInPlace(r.scale((i - (kinds.length - 1) / 2) * 5.5)).addInPlace(new B.Vector3(0, 1, 0))));
    for (let i = 0; i < (o.frames ?? 90); i++) { engine.beginFrame(); scene.render(); engine.endFrame(); }
    $("banner").classList.add("hidden");
    return `lab: ${profile.climate.name} · ${kinds.join(",")}`;
  },
  __scene: scene,
  __carObj: () => car,
});
