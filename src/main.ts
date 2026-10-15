import { tut, tutEnd, tutOffers, tutOn, tutStart } from "./tutorial";
import { hudDesafio, hudAire, hudAviso, hudSpinBtn, hudLibreOff, hudMeta, hudTruco, hudTuercas } from "./ui";
import { BARRIO_LOGRO, BARRIO_NOMBRE, barrioCompleto, metasStep, type MetaEv } from "./free_goals";
import { chObjetivo, chStep, chTruco, DESAFIOS, fmtMarca, fmtMs, medalla, MEDALLA, newCh, fantasmaAt, fantasmaCp, fantasmaDec, fantasmaEnc, fmtDif, FANTASMA_DT, type ChEvent, type Muestra } from "./free_challenges";
import { ghostOn, ghostOff, ghostPose } from "./free_ghost";
import { bestUpdate, newTrick, nutNear, nutsCount, roam, trickLive, trickStep, NUT_N } from "./free_tricks";
import { spawnNuts } from "./free_nuts";
import { hudHurt, scrapNumber, hudMate, hudQuad, banner, bannerClear, damageNumber, hudAbility, hudArrows, hudBoss, hudDrive, hudEnc, hudJump, hudSlots, hudKill, hudRadar, hudUpdate, hudWorkshop, initHud, pickOffer, dirSub, radioBoss, radioEvent, selectOffer, showOffers, uiTick } from "./ui";
import * as B from "@babylonjs/core";
import havokWasm from "@babylonjs/havok/lib/esm/HavokPhysics.wasm?url";
import { Car, CARS, drive, setCarPassive } from "./car";
import type { CarKind } from "./models";
import { DEF, DOG_RAM, Enemy, pickWeighted, spawnTable, type Kind, ROAR } from "./enemies";
import { radio } from "./radio";
import { engineSfx, engineStop, initAudio, music, moonAmbience, encoreAmbience, musicDuck, rainSfx, setEngineKind, SFX, SPACE, FREE } from "./sfx";
import { ambient, burst, clearFx, contactShadows, corpse, debris, FX, fxSpeed, impact, initFx, mark, rainWet, splat, tickFx, tickRain } from "./fx";
import { activePad, btnName, camCycle, coopCtl, coopSkip, ctl, input, isTouch, keyHit, KEYS, KEYS2, padPressed, pads, padSnap, pb, pollInput, pollMate, pollPad, RACE, setupTouch } from "./input";
import { carGlbProgress, loadCarGlbs } from "./carGlb";
import { GLB, glbFootprint, glbProgress, glbStats, glbTpl, loadGlbs } from "./glb";
import { initRunLoader, runTasks, loaderOk, T_BICHOS, T_EFECTOS, worldTask, afterFrames, launchRun, prefetchMode, goRace, goMatch3, goLibre, kartM, m3M } from "./run_loader";
import { boot, bootEnd, ensure, ensureAll, idle, launch, preload, startPreload, times, type Task } from "./loading";
import { carModel, cyl, enemyTemplate, initModels, LEGS, legTemplate, nutTemplate as nutTpl, sph, template, wingTemplate } from "./models";
import { CAM_MODES, CAM_NAMES, type CamMode } from "./savefmt";
import { encCfg, encMax, ABIL_ICON, applySettings, beastRec, BV, carOpts, current, shownCar, startPick, dailySeed, fmt, initMenu, keyName, today, menuPad, openOver, openPause, openPauseLibre, peek, persist, reset, save, type RunRec } from "./menu";
import { run, freshRun } from "./run_state";
import { ABILITIES, abilCd as abilCdOf, abilK, type AbilityId } from "./abilities";
import { PILOTS, pilotStats, setPactCount, startWeapons } from "./pilots";
import { ACH, type AchId } from "./achievements";
import { applyClimate, gfxInfo, glitchHit, PRESETS as PRESETS_DEV, presetOf, look, M, pbr, setDark, setLamp, setSplit, setupRender, shadows, G } from "./render";
import { escapeReset, evoOffer, fuse, LIVE, levelOffers, makeWeapon, mountFor, passiveStats, setScoop, WEAPONS, type Ctx, type Offer, type PassiveId, type PStats, type Weapon, type WeaponId } from "./weapons";
import { setDrawDist, buildLayout, floorAt, HALF, initWorld, hitBreakables, hitHeavyProps, heavyProps, obstacles, occluders, setWind, setZone, showWorld, spawnPoint, underRoof, worldReady, ZONES, zoneClimate, zoneDust, zoneId, zoneTick } from "./world";
import { CLIMATES, DUSK, ESCAPE_WIN, FINAL_WIN, makeProfile, mixClimate, nightfall, RAIN, danoRecibido, type Profile } from "./run";
import { newSeed, rng, seedRng } from "./rng";
import { daily as fetchDaily, weekly as fetchWeekly, track, type Msg, type Net } from "./net";
import { initNetClient, netSnap, netClientTick, netEnd, getNet, getNetBytes, getNetLv, getCardBy, setCardBy, advanceCardBy, getNetPools, getNetBuf, getNetIn, getNetSeed, isSpectating } from "./net_client";
import { BAL, xpNeed } from "./balance";
import * as RR from "./rerun";
import { initCoop, mateStart, mateViews, mateClear, matePlace, mateSync, hurtP, mateDown, mateLead, mateRevive, mateInput, mateTick, mateCam, mateHurt, type Player } from "./coop";
import { initOutro, grant, endRun, startOutro, outroTick, endOutro, rpStart, rpEnd, rpHud, rp, stageHurt, setStageHurt, hitAt, setHitAt, recordHit, runAch, resetRunAch, outroAt, setOutroAt, ts, outroZ, resetOutroState } from "./outro";
import { initCombat, boom, cs, gemTpl, pilaTpl, imanTpl, dmgOut, damage, explode, kill, dropGems, dropPickup, smashed, toScreen, type Gem, type Pickup } from "./combat";
import { initProgression, gainXp, offersFor, openOffers, reroll, choose, openChest, byTag } from "./progression";
import { initHudTick, updateHud, setKmh } from "./hud_tick";
import { introOn, playIntro } from "./intro";
import { craterHumeante, evBase, evFog, evInit, evPace, evReset, evShow, lunaDev, lunaEv, panTo } from "./moon_events";
import { hitShip, SHIP_IO, SHIP_NAME, shipBar, shipFor, shipsClear, shipSpawn, shipsTick, shipTargets, type ShipId } from "./moon_ships";
import { alignYaw, alt, at, deform, moonCar, teleport, EARTH_DIR, enemyLights, flatL, FOOT, ROLL, grav, hd, hflat, initMoon, LUNA, MOON, moonTick, onFloor, orient, rad, rel, ringAt, setMoon, skyVisible, SUN_DIR, toLocal, upAt, upv, W, advance, yawOf, below } from "./moon";
import * as E from "./encore";
import { initEncoreRun, erun, encPrior, paceS, pfx, dirq, encExtra, encG, encLog, setErun, setEncPrior, encClear, encRecompute, encApply, encSecrets, encPick, votes, encVote, encPlan, encScene, minorShip, minorMini, moonPlace, carPlace, tip, say, calmFirst, zoneMagnet } from "./encore_run";
import { COOP, chestsLeft, chestsOpened, shopAt, shopDev, goalBar, goalBlips, goalForce, goalsClear, goalStats, goalsTick, GOAL_IO, rocketForce, rocketLand, shopPlan, shopReset, spotsPlan } from "./moon_goals";
import { skyClear, skyInfo, skyLaunch, skyPace, skyTick } from "./moon_sky";
import { aplicarRegla } from "./weekly";
import { ALIENS, alienWave, armorMul, healTick, isAlien } from "./aliens";
import { wormForce, wormHeadTpl, wormOut } from "./moon_worm";
import { CAR_YAW, carSpot, menuFov, menuOff, menuTick, SHOTS } from "./menuscene";
import { beastTick, PED_H, setupBeastCam } from "./bestiary_preview";
import { raceCfg, TRACKS } from "./kart_cfg";
import "./match3.css"; import "./race.css"; // hojas de los modos de carga perezosa: estáticas para quedar ANTES de kit.css (race.css solo se importa acá)
import { initRunTick, tickEnemies, tickWeapons, tickPickups, type Frame, type Spit } from "./run_tick";
import { initRunDrive, resetDrive, tickWeather, tickAbility, tickDrive, tickRam, tickSpawner, tickYardEvents, tickVitals } from "./run_drive";
import { initCameraRig, cameraTick, camReset, CAMS } from "./camera_rig";
import { initPhoto, photoOn, photoApply } from "./photo-mode";
import "./kit.css"; // kit de UI compartido: se carga después de todas las hojas (ver src/kit.css)

const $ = (id: string) => document.getElementById(id)!;
const R = BAL.ritmo, ATK = BAL.ataques; // balance.json: ritmo de la partida y ataques de bichos y jefes
// Partida de 10 minutos: dos minijefes (sueltan cofres de evolución) y el jefe final a las 10:00
let RUN_BOSSES: [number, Kind][] = [];
let wasGrounded = true, coyoteT = 0;

// Guardado (localStorage "rcfight2"): type Save y DEFAULT viven en menu.ts

// ---------- Motor (WebGL2 por defecto; WebGPU si se eligió en Configuración → Imagen o con ?webgpu; ?webgl lo fuerza) ----------
const canvas = $("c") as HTMLCanvasElement;
const low = isTouch;
// Havok (JS + wasm de 2 MB) sale del paquete de arranque: se baja y compila en paralelo con el motor y la escena
const havok = import("@babylonjs/havok").then((m) => m.default({ locateFile: () => havokWasm }));
const wantGpu = !location.search.includes("webgl") && (location.search.includes("webgpu") || save.gpu === "webgpu");
const GPU = wantGpu ? (await import("@babylonjs/core/Engines/webgpuEngine.js")).WebGPUEngine : null; // WebGPU solo a pedido: no entra al paquete de arranque
let gpuEng: B.AbstractEngine | null = null;
if (GPU && (await GPU.IsSupportedAsync)) {
  try { const gpu = new GPU(canvas, { antialias: true, stencil: true }); await gpu.initAsync(); gpuEng = gpu; }
  catch (e) { console.warn("WebGPU falló, se usa WebGL", e); } // ponytail: si falla después de crear el contexto el canvas puede quedar tomado; recargar con ?webgl
}
const engine: B.AbstractEngine = gpuEng ?? new B.Engine(canvas, true, { stencil: true }, true);
boot("Iniciando el motor", 0.15);
const scene = new B.Scene(engine);
scene.enablePhysics(new B.Vector3(0, -25, 0), new B.HavokPlugin(true, await havok));
initMoon(scene); // luna (moon.ts): gravedad radial y piso analítico; antes de la cámara lenta, que envuelve el mismo paso
scene.skipPointerMovePicking = true;

boot("Preparando la escena", 0.4);
const cam = new B.FreeCamera("cam", new B.Vector3(0, 30, -40), scene);
cam.fov = 0.85;
cam.minZ = 1; // más cerca el z-buffer pierde precisión y los decales del piso parpadean
cam.maxZ = 1500;
const camTarget = new B.Vector3();
const camH = new B.Vector3(0, 0, 1), camUp = new B.Vector3(0, 1, 0);

setupRender(scene, cam, low);
initModels(scene);
// Los bichos importados (glb.ts) y el resto de lo pesado se precargan en segundo plano desde la portada (tareas más abajo)
initFx(scene, low);
seedRng(20260929); // el patio es siempre el mismo
initWorld(scene, low); // el patio se arma recién al jugar (setZone): los menús tienen escenas propias (menuscene.ts)
applyClimate(DUSK);
if (isTouch) setupTouch((k) => zoomBy(1 / k)); // pellizco: abrir los dedos acerca
initHud();

// ---------- Estado de la partida ----------

let state: "menu" | "play" | "level" | "pause" | "over" | "outro" | "race" | "match3" | "net" = "menu"; // net: cliente online (R6b), dibuja los snapshots del anfitrión sin simular
// R6a: estado por jugador (docs/ENCORE/R0/R6_RED.md §4). players[0] = J1; `lead` = el que guía: maneja la cámara `cam` con sus modos, el input global
// y las armas de verdad (`weapons`); los otros llevan copias montadas en su auto. car === null = caído (vuelve en el próximo escenario).
// Compartidos (como antes): XP, nivel, armas, pasivas, tornillos y pactos.
const NO_IN = { throttle: 0, steer: 0, boost: false, drift: false, ability: false, jump: false, moveX: 0, moveY: 0, move: false };
const KINDS = Object.keys(DEF) as Kind[];
const rid = new WeakMap<Enemy, number>(); let ridN = 0;
const rrQ = (e: B.TransformNode) => e.rotationQuaternion ?? B.Quaternion.FromEulerAngles(e.rotation.x, e.rotation.y, e.rotation.z);
/** Muestra de la película (rerun.ts): lo que se ve ahora mismo. */
const rrTake = () => { const p = lead.car!.root.position, q = rrQ(lead.car!.root); return [p.x, p.y, p.z, q.x, q.y, q.z, q.w, run.time, run.kills, run.level, ...enemies.flatMap((e) => { const q = rrQ(e.node), p = e.pos; if (!rid.has(e)) rid.set(e, ++ridN); return [rid.get(e)!, KINDS.indexOf(e.kind), p.x, p.y, p.z, q.x, q.y, q.z, q.w]; })]; };
const rqa = new B.Quaternion(), rqb = new B.Quaternion();
const rqRead = (o: B.Quaternion, a: number[], i: number) => o.set(a[i], a[i + 1], a[i + 2], a[i + 3]);
/** Reproduce la película: sin simular, mueve el auto y las mallas de enemigos entre dos muestras (interpolación lineal). */
function rpPlay(dt: number) {
  const f = RR.rec.f; rp.t += dt * rp.x;
  const i = Math.floor(rp.t / RR.DT), c = lead.car;
  if (i >= f.length - 1 || !c) { rpEnd(); return; }
  const a = f[i], b = f[i + 1], k = rp.t / RR.DT - i, H = RR.HEAD, S = RR.STRIDE;
  c.root.position.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
  c.root.rotationQuaternion ??= new B.Quaternion();
  B.Quaternion.SlerpToRef(rqRead(rqa, a, 3), rqRead(rqb, b, 3), k, c.root.rotationQuaternion);
  const nb = new Map<number, number>(); for (let o = H; o < b.length; o += S) nb.set(b[o], o);
  const seen = new Set<number>();
  for (let o = H; o < a.length; o += S) {
    const id = a[o], ob = nb.get(id) ?? o, bb = nb.get(id) ? b : a; seen.add(id);
    let e = rp.en.get(id);
    if (!e) { spawnEnemy(KINDS[a[o + 1]], new B.Vector3(a[o + 2], a[o + 3], a[o + 4])); e = enemies[enemies.length - 1]; rp.en.set(id, e); }
    const px = a[o + 2] + (bb[ob + 2] - a[o + 2]) * k, py = a[o + 3] + (bb[ob + 3] - a[o + 3]) * k, pz = a[o + 4] + (bb[ob + 4] - a[o + 4]) * k;
    e.body.setLinearVelocity(new B.Vector3(bb[ob + 2] - a[o + 2], bb[ob + 3] - a[o + 3], bb[ob + 4] - a[o + 4]).scaleInPlace(1 / RR.DT)); // para que las patas caminen (animate lee la velocidad)
    e.node.position.set(px, py, pz);
    e.node.rotationQuaternion ??= new B.Quaternion();
    B.Quaternion.SlerpToRef(rqRead(rqa, a, o + 5), rqRead(rqb, bb, ob + 5), k, e.node.rotationQuaternion);
    e.animate(dt);
  }
  for (const [id, e] of rp.en) if (!seen.has(id)) { e.dispose(); enemies.splice(enemies.indexOf(e), 1); rp.en.delete(id); } // murió o salió de la muestra
  rpHud(a[7], a[8], a[9]);
}
const newPlayer = (id: number, c: B.FreeCamera): Player => ({ id, in: id === 1 ? input : NO_IN, car: null, hp: 100, maxHp: 100, boost: 100, fs: 0, touch: 0, jumpCd: 0, coyote: 0, cam: c, h: new B.Vector3(0, 0, 1), up: new B.Vector3(0, 1, 0), tgt: new B.Vector3(), weapons: [], sig: "" });
const players: Player[] = [newPlayer(1, cam)];
let lead = players[0];
/** Los que no guían, en orden de jugador (sus índices 1.. son los `who` de los eventos, contando solo los vivos). */
const others = () => players.filter((p) => p !== lead);
let weapons: Weapon[] = [];
let st: PStats = passiveStats({}, save.perm);
let jingleT = 0;
let profile: Profile;
let simulating = false; // true durante __sim: sin DOM ni efectos caros
let duel = -1, forceSeed = 0; // solo dev (__bossDuel): tope de bichos normales vivos (-1 = partida normal) y semilla forzada
let enemies: Enemy[] = [];
let gems: Gem[] = [];
let pickups: Pickup[] = [];
let spits: Spit[] = [];
const SPIT_CAP = 72; // ponytail: ácido y tuercas en oleadas densas; sobre el tope se pierde el más viejo (como pickups_tope)
function pushSpit(s: Spit) {
  if (spits.length >= SPIT_CAP) { const old = spits.shift()!; old.m.dispose(); }
  spits.push(s);
}
const _stunV = new B.Vector3();
const flemaTpl = () => template("flema", () => [sph(0.55, pbr("flema", { color: "#9acd32", rough: 0.1, emissive: "#3a5a00", alpha: 0.85 }), [0, 0, 0])]);
const spitTpl = () => template("spit", () => [sph(0.55, pbr("acid", { color: "#ff3a1f", rough: 0.1, emissive: "#c01800", alpha: 0.9 }), [0, 0, 0])]);
let fpsT = 0;
let cycleS = -1; // tramo del ciclo atardecer → noche ya aplicado
let darkK = 1, apagon = false, musicS = "", musicT = 0; // musicS/T: estado musical y reloj de refresco
let shake = 0, camYaw = 0;
addEventListener("camcycle", () => {
  if (state !== "play") return; // la carrera maneja sus propias cámaras (kart.ts)
  save.camMode = CAM_MODES[(CAM_MODES.indexOf(save.camMode) + 1) % CAM_MODES.length]; persist();
  banner(`CÁMARA · ${CAM_NAMES[save.camMode].toUpperCase()}`, 1.2);
});
let ball: { m: B.Mesh; agg: B.PhysicsAggregate; life: number; hit?: boolean } | null = null;
let offers: Offer[] = [];
let offerSel = 0;
const evoNotified = new Set<string>();


// Habilidad activa (abilities.ts): enfriamiento, segundos activa, petardos por caer y ritmo del mundo (cámara lenta)
let abilCar: Car | null = null; // R7b: auto que disparó la habilidad (bombardeo alrededor suyo)
let shieldM: B.Mesh | null = null; // burbuja del escudo, hija del auto (se libera con él)
// Combo de manejo: multiplicador de XP (x1 a x2) que se pierde al recibir daño
// Maldiciones (horde = multiplicador de enemigos, curseK = de tornillos) y modo sin fin
// Lo ya cobrado en el endRun anterior (vencer al jefe final y seguir en modo sin fin): el siguiente suma solo la diferencia

let hitStop = 0, lastHpFrac = 1, motorFxT = 0, cintaUntil = 0, cintaAt = -1e9; // Cinta aislante: hasta cuándo no recibe daño y cuándo tapó el último golpe


// ---------- Flujo ----------
function recompute() {
  setPactCount(erun ? erun.pacts.length : 0); // pactos vigentes (los vencidos ya salieron en leave); recompute corre al cambiar de fase (encEnter)
  st = pilotStats(passiveStats(run.passives, save.perm), save.pilot);
  setCarPassive(libre ? libreKind : save.car, st);
  encRecompute(grossScrap()); // ENCORE: cobra lo ganado con el efecto que se va y toma los pactos activos (neutros en Supervivencia)
  st.dmg *= pfx.dmg; st.speedMul *= pfx.speed; st.magnet *= zoneMagnet(); st.xp *= pfx.xp; st.regen += pfx.regen;
  if (pfx.taken !== 1) st.armor = 1 - (1 - st.armor) * pfx.taken; // daño recibido x taken
  if (run.noRepair) st.regen = 0; // maldición Sin reparaciones
  const newMax = Math.round((lead.car!.def.hp + st.maxHp) * st.hpMul * pfx.maxHp); // Tanque extra: vida máxima x hpMul
  LIVE.luck = st.luck; LIVE.radar = st.radar; LIVE.aviso = st.aviso;
  lead.hp += Math.max(0, newMax - lead.maxHp);
  lead.maxHp = newMax;
  if (pfx.maxHp !== 1) lead.hp = Math.min(lead.hp, lead.maxHp); // el pacto que baja la vida máxima recorta también la vida actual
  lead.car!.setMass(lead.car!.def.mass * st.mass);
  // Cada arma se ve montada en el auto y crece con el nivel
  for (const w of weapons) {
    if (!w.mount) { w.mount = mountFor(w.id, lead.car!); shadows.addShadowCaster(w.mount); }
    w.mount.scaling.setAll(1 + (w.lv - 1) * 0.06 + (w.evolved ? 0.25 : 0));
  }
  for (const m of others()) mateSync(m);
}

// Vista previa en las cartas: la pieza aparece montada en el auto mientras la mirás
let preview: B.Mesh | null = null;

function clearRun() {
  libre = false; $("hud").classList.remove("libre"); clearTimeout(libreCartelT); $("barrio").classList.add("hidden");
  ghostStop(); roam.on = false; roam.extra = roam.air = 0; libreNuts?.dispose(); libreNuts = null; hudLibreOff();
  Object.assign(run, freshRun()); resetDrive();
  mateClear();
  encClear(); GOAL_IO.tele = false; GOAL_IO.half = 0;
  setMoon(false); // la luna se enciende solo en una partida de Supervivencia en la luna (startRun)
  evReset(); // luna: meteoritos, erupciones, tinte rojo y ambiente (moon_events.ts)
  shipsClear(); // naves de la luna (moon_ships.ts)
  goalsClear(); // luna: objetivos en la superficie y cohete (moon_goals.ts)
  skyClear(); // luna: proyectiles del Sol y la Tierra (moon_sky.ts)
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
  evoNotified.clear();
  clearFx();
  rainK = 0; rainBanner = false; rainSfx(0);
  yardPulseIdx = 0; yardPulseT = 0;
  evtPre = { swarm: false, ball: false, rain: false, elites: new Set(), boss: new Set() };
  lead.car?.dispose();
  lead.car = null;
  applyClimate(zoneClimate() ?? DUSK); // al volver al menú, atardecer (o el tubo del garaje)
}

let dailyInfo: { date: string; seed: number } | null = null; // del servidor, solo vale para el diario en curso
let weeklyInfo: { week: string; seed: number; regla: string } | null = null, weeklyOn = false, offerFilter: ((id: string) => boolean) | null = null; // desafío semanal (weekly.ts)
let daily = false, encore = import.meta.env.DEV && /[?&]encore\b/.test(location.search); // encore: modo ENCORE (docs/ENCORE); ?encore (dev) lo deja armado y arranca solo
let guestE: Enemy | null = null; // R3: cola del Director, reloj de enjambres del OVERLOAD, invitado del BOSS_GUEST
// R7a/c (ENCORE de 2 a 4, solo compu): coop = jugadores pedidos al largar (1 = solo); los jugadores viven en `players` (R6a)
let coop = 1, spawnN = 0;
/** Compañeros con auto (los caídos esperan el próximo escenario); su orden es el de los índices `who` 1.. de los eventos. */
const liveM = () => others().filter((m) => m.car);
/** Tornillos brutos de la run: partida + tiempo + bajas (sin maldiciones ni pactos). */
const grossScrap = () => run.runScrap + Math.floor((run.time + encPrior) / R.tornillos_div_tiempo) + Math.floor(run.kills * TOUGH.xp / R.tornillos_div_bajas);
const zoneFor = (d: boolean) => d ? "patio" : encore ? "luna" : (import.meta.env.DEV && new URLSearchParams(location.search).get("zone")) || save.zone;
function startRun(d = false) {
  daily = d;
  if (!simulating && !LAB.on) track("run_start", { mode: encore ? "encore" : d ? "diario" : "supervivencia", car: save.car });
  initAudio(); music("run", 0); musicS = "run";
  menuOff(); // ?lab arranca desde el título
  clearRun();
  // Semilla de la partida: ?seed=N la fija (reproducible), si no, una nueva
  // Zona: el diario siempre en el patio; ?zone=garaje|jardin (solo dev) la fuerza. Se arma antes de sembrar: no toca la semilla.
  setZone(zoneFor(daily)); // ya armado por la precarga (tarea "patio") salvo que cambie la zona o el tope de texturas
  setMoon(zoneId === "luna");
  run.runSeed = forceSeed || getNetSeed() || Number(new URLSearchParams(location.search).get("seed")) || (weeklyOn && weeklyInfo?.seed) || (daily ? dailyInfo?.seed || dailySeed() : newSeed());
  seedRng(run.runSeed);
  if (!encore && coop === 1 && !getNet() && !simulating && !LAB.on && duel < 0) RR.recStart(); else RR.rec.on = RR.rec.done = false; // se graba solo la partida solitaria
  // Perfil de la partida: clima, plaga, orden de minijefes, ritmo de eventos y un patio distinto
  profile = makeProfile(run.runSeed);
  profile.climate = zoneClimate() ?? profile.climate; // interior (garaje): luz fija
  if (encore && !simulating) { radio.auto(); radio.prefer(["noche", "farol", "madrugada"].includes(profile.climate.id) ? "noche" : "encore"); } // la radio de la expedición (noche pide Aceite Lento)
  if (MOON.on) profile.rainAt = Infinity; // en la luna no llueve
  cycleS = -1;
  buildLayout();
  RUN_BOSSES = [[R.jefe1_s, profile.minis[0]], [R.jefe2_s, profile.minis[1]], [R.jefe_final_s, MOON.on ? "gusano" : profile.final]]; // luna: el jefe final es el gusano lunar (moon_worm.ts)
  run.finalKind = RUN_BOSSES[RUN_BOSSES.length - 1][1]; // jefe final: vencerlo gana la partida
  // ponytail: maldiciones ocultas por ahora (decisión del usuario); volver a `daily ? [] : save.curses` y mostrar #curseBtn para reactivarlas
  const curses: typeof save.curses = [];
  run.horde = curses.includes("horda") ? R.maldicion_horda : 1; run.noRepair = curses.includes("sinrep"); run.curseK = 1 + R.maldicion_tornillos * curses.length;
  run.endless = false; run.bank = null;
  run.weeklyK = 1; offerFilter = null;
  if (weeklyOn && weeklyInfo) aplicarRegla(weeklyInfo.regla, { setTimeScale: (k) => (run.weeklyK = k), filtrarOfertas: (f) => (offerFilter = f), bloquearCuras: () => { run.noRepair = true; } });
  else weeklyInfo = null;
  weeklyOn = false;
  run.abil = save.ability; run.abilLv = (save.abilLv[run.abil] ?? 0) + (PILOTS[save.pilot]?.abil === run.abil ? 1 : 0); run.abilCd = run.abilOn = run.bombs = 0; run.worldK = 1; shieldM = null; // afinidad: la habilidad del piloto rinde un nivel más
  run.driveMul = 1; run.driftT = run.airT = run.trickT = 0; run.jumpCd = 0; run.boostSec = 0; motorFxT = 0; hudDrive(1);
  lead.car = new Car(scene, save.car, carOpts());
  lastHpFrac = 1;
  run.passives = {}; escapeReset(); cintaAt = -1e9;
  run.bestStreak = run.bestHit = run.bossKills = 0; run.bestDriveMul = 1;
  setScoop(save.car === "helado"); setEngineKind(save.car);
  weapons = startWeapons(save.pilot, save.perm.extra, startPick()).map(makeWeapon);
  if (save.car === "helado" && !weapons.some((w) => w.id === "gomitas")) weapons.unshift(makeWeapon("gomitas")); // arma de partida del camión: bochas de helado
  jingleT = 2;
  run.rerolls = save.perm.reroll; run.revives = save.perm.revive;
  lead.maxHp = lead.car.def.hp;
  recompute();
  lead.hp = lead.maxHp; lead.boost = 100;
  run.xp = 0; run.level = 1; run.pendingLevels = 0;
  run.time = 0; run.kills = 0; run.runScrap = 0; run.runDist = 0; resetRunAch(); setHitAt(0);
  run.spawnAcc = 0; run.groupT = 0; run.swarmT = R.enjambre_primero_base + profile.swarmEvery * R.enjambre_primero_mult; run.chestT = profile.chestEvery; run.ballT = profile.ballEvery; run.bossIdx = 0; wasGrounded = true; coyoteT = 0; apagon = false;
  run.ovT = 0; guestE = null; dirSub(null);
  if (encore && MOON.on) { setErun(E.newRun(run.runSeed, save.encore.secrets)); GOAL_IO.tele = true; shopReset(); encPlan(); encScene(true); }
  if (erun && coop > 1) mateStart(coop); // R7a/c: de 2 a 4 jugadores en pantalla dividida (solo compu)
  camYaw = 0; camReset(); resetOutroState(); fxSpeed(1); camH.set(0, 0, 1); camUp.set(0, 1, 0);
  state = "play";
  scene.physicsEnabled = false; // T39: en play el mundo avanza a mano (update + _step); con true Babylon da un paso extra con dt real y la repetición diverge
  reset(null);
  $("levelup").classList.add("hidden");
  for (const k in dmgOut) delete dmgOut[k];
  for (const k in dmgBy) delete dmgBy[k];
  $("hud").classList.remove("hidden");
  hudBoss(null);
  hudWorkshop(save.perm);
  if (erun) { say("start"); tip("start"); const h = E.hint(erun); if (h) say("hint", h); } else banner(`${profile.climate.name} · ${profile.plague.name}`, 3);
  tutEnd(); if (!erun && !simulating && !LAB.on && !save.tutorialHecho && !save.stats.runs && !save.runs.length) tutStart(() => { save.tutorialHecho = true; persist(); }); // primera partida: tutorial (ENCORE ya tiene sus avisos)
  // Guía de controles los primeros segundos (se va sola)
  const hint = $("hint");
  for (const k of hint.querySelectorAll<HTMLElement>("kbd[data-k]")) k.textContent = keyName(KEYS[k.dataset.k as keyof typeof KEYS][0]); // teclas reasignadas
  hint.classList.toggle("coop", players.length > 1 && !getNet()); // R7b: con 2 jugadores, sobre la línea divisoria (no tapa la mitad de abajo) y con las teclas del J2
  if (players.length > 1 && !getNet()) { const kb = (c: string) => `<kbd>${keyName(c)}</kbd>`, k2 = RACE.kb2; $("hintJ2").innerHTML = coopCtl() === "kbd2" ? `J2 ${kb(k2.up[0])}${kb(k2.down[0])}${kb(k2.left[0])}${kb(k2.right[0])} manejo · ${kb(k2.item[0])} turbo · ${kb(k2.drift[0])} derrape · ${kb(KEYS2.jump[0])} salto · ${kb(KEYS2.ability[0])} habilidad` : `J2 segundo joystick · ${btnName(pb("jump"))} salto · ${btnName(pb("ability"))} habilidad`; if (coop > 2) $("hintJ2").innerHTML += ` · ${coop === 3 ? "J3 tercer joystick" : "J3 y J4 tercer y cuarto joystick"}`; }
  hint.querySelector(".tip")!.textContent = erun ? "Las armas disparan solas. Embiste rápido, junta tuercas y llega al teleportador." : "Las armas disparan solas. Embiste rápido, junta tuercas y sobrevive 10 minutos.";
  const showHint = save.hint && !(erun && save.controlesVistos); // T55: ENCORE no repite una guía ya vista
  if (showHint) hint.classList.remove("hidden", "fade"); else hint.classList.add("hidden");
  hintOn = showHint; // se apaga en update() con la primera entrada o a los HINT_S de partida
}
let hintOn = false;
const HINT_S = 7;

// ---------- Free Roam (goLibre en run_loader.ts) ----------
// ponytail: Free Roam reusa el estado "play" con este flag (cámara, pausa, modo foto y cartas ya funcionan); update() solo maneja, sin reloj, bichos ni derrota. Techo: un estado propio si el modo necesita su propia cámara o pausa.
let libre = false, libreKind: CarKind = "buggy"; // libreKind: el auto del modo (todos disponibles; no toca el guardado)
let libreLuz = 4, libreT = 0, libreAcc = 0, libreLugar = -1, libreCartelT = 0, libreLugares: { name: string; cx: number; cz: number }[] = []; // luz: 0 amanecer, 1 día, 2 atardecer, 3 noche, 4 automático
const LUZ_FIJA = ["madrugada", "mediodia", "encore", "noche"], LUZ_CICLO = ["encore", "noche", "madrugada", "manana", "mediodia"], LUZ_TRAMO_S = 192; // ciclo completo = 5 × 192 s = 16 min
const climaId = (id: string) => CLIMATES.find((c) => c.id === id)!;
/** Luz del paseo: fija o ciclo lento mezclando climas que ya existen (mixClimate). */
function libreLight() {
  if (libreLuz < 4) return applyClimate(climaId(LUZ_FIJA[libreLuz]));
  const x = (libreT / LUZ_TRAMO_S) % LUZ_CICLO.length, i = Math.floor(x), f = x - i;
  applyClimate(mixClimate(climaId(LUZ_CICLO[i]), climaId(LUZ_CICLO[(i + 1) % LUZ_CICLO.length]), f * f * (3 - 2 * f)));
}
let libreCh = newCh(), chFinT = 0, chMsg = { title: "", big: "", sub: "" };
/** Objetivos de barrio (free_goals.ts): avisa cada uno nuevo y, al completar un barrio, otorga su pintura (logro barrio_*). */
function libreMeta(ev: MetaEv) {
  const hechas = save.libre.metas, nuevas = metasStep(hechas, ev);
  if (!nuevas.length) return;
  SFX.pickup(); persist();
  const m = nuevas[0], b = m.barrio, fin = barrioCompleto(hechas, b);
  hudMeta(fin ? `${BARRIO_NOMBRE[b]} COMPLETO` : "OBJETIVO CUMPLIDO", fin ? "NUEVA PINTURA EN EL GARAJE" : m.txt);
  if (fin) grant(BARRIO_LOGRO[b]);
}
/** Desafíos de Paseo libre: arco de inicio -> reloj/puntaje en el HUD -> récord en save.libre.desafio. */
// Fantasma del récord: grabación del intento en curso (rec) y reproducción del guardado (gRows, gCp = segundos del fantasma en cada punto de control y la meta)
let rec: Muestra[] = [], gRows: Muestra[] | null = null, gCp: number[] = [], gDif = { txt: "", ok: true };
const ghostStop = () => { gRows = null; gDif.txt = ""; ghostOff(); };
function libreGhost(e: ChEvent) {
  const d = libreCh.d, c = lead.car!;
  if (e?.kind === "inicio") {
    ghostStop(); rec = [];
    gRows = save.libre.ghost ? fantasmaDec(save.libre.fantasma[e.d.id]) : null;
    if (gRows) { gCp = fantasmaCp(e.d, gRows); ghostOn(scene, libreKind, carOpts()); }
  }
  if (!d) { if (!gRows) return; ghostStop(); return; } // terminó o falló: el fantasma desaparece
  for (; rec.length * FANTASMA_DT <= libreCh.t; ) { const q = c.root.rotationQuaternion; rec.push([c.pos.x, c.pos.y, c.pos.z, q?.x ?? 0, q?.y ?? 0, q?.z ?? 0, q?.w ?? 1, libreCh.pts]); }
  if (!gRows) return;
  const g = fantasmaAt(gRows, libreCh.t);
  ghostPose(g);
  if (d.tipo === "puntos") { const v = libreCh.pts - g[7]; gDif = { txt: fmtDif("puntos", v), ok: v >= 0 }; }
  else if (e?.kind === "punto" && gCp[libreCh.cp - 1] >= 0) { const v = libreCh.t - gCp[libreCh.cp - 1]; gDif = { txt: fmtDif("tiempo", v), ok: v <= 0 }; }
}
function libreChallenge(dt: number) {
  const p = lead.car!.pos, best = save.libre.desafio, gPrev = gRows, gLast = best[libreCh.d?.id ?? "obs"] / 1000, gPts = gRows?.[gRows.length - 1][7] ?? 0; // el fantasma que se vencía (su tiempo es el récord anterior), antes de que el nuevo lo reemplace
  const e = chStep(libreCh, dt, p.x, p.z, best);
  libreGhost(e);
  if (e?.kind === "inicio" || e?.kind === "punto") { SFX.pickup(); chFinT = 0; }
  if (e && e.kind !== "inicio" && e.kind !== "punto") {
    SFX.pickup(); chFinT = 5; persist();
    const med = e.kind === "fin" ? medalla(e.d.id, e.d.tipo === "tiempo" ? e.ms : e.pts) : 0, medTxt = med ? `MEDALLA DE ${MEDALLA[med]}` : "";
    const dif = e.kind === "fin" && gPrev ? (e.d.tipo === "tiempo" ? (gLast >= 0 ? fmtDif("tiempo", e.ms / 1000 - gLast) : "") : fmtDif("puntos", e.pts - gPts)) : "";
    if (e.kind === "fin" && e.record) { const q = lead.car!.root.rotationQuaternion; rec.push([p.x, p.y, p.z, q?.x ?? 0, q?.y ?? 0, q?.z ?? 0, q?.w ?? 1, e.pts]); save.libre.fantasma[e.d.id] = fantasmaEnc(rec); } // la última muestra es la meta
    chMsg = e.kind === "fallo" ? { title: e.d.nombre, big: "TIEMPO AGOTADO", sub: "" }
      : { title: e.d.nombre, big: e.d.tipo === "tiempo" ? fmtMs(e.ms) : `${e.pts} PTS`, sub: [medTxt, dif && `${dif} VS FANTASMA`, e.record ? "NUEVO RÉCORD" : `RÉCORD ${fmtMarca(e.d, best[e.d.id])}`].filter(Boolean).join(" · ") };
    if (e.record || med) FX.sparks(p.add(new B.Vector3(0, 0.8, 0)), 16);
    if (e.kind === "fin") libreMeta({ k: "fin", d: e.d.id, medalla: med });
  }
  const d = libreCh.d, ob = chObjetivo(libreCh);
  // Contrarreloj: la línea de abajo guía al próximo punto de control (o la meta) con su distancia; trucos: récord
  if (d) { chFinT = 0; const left = Math.max(0, d.limite - libreCh.t); hudDesafio(d.nombre, d.tipo === "tiempo" ? fmtMs(Math.round(libreCh.t * 1000)) : `${libreCh.pts} PTS · ${Math.ceil(left)} S`, ob ? `${ob.i < ob.n ? `PUNTO ${ob.i + 1}/${ob.n}` : "META"} · ${Math.round(Math.hypot(ob.x - p.x, ob.z - p.z))} M` : `RÉCORD ${fmtMarca(d, best[d.id])}`, false, gRows ? gDif : undefined); }
  else if (chFinT > 0 && (chFinT -= dt) > 0) hudDesafio(chMsg.title, chMsg.big, chMsg.sub, true);
  else hudDesafio("");
}
let takeX = 0, takeZ = 0, avisoT = 0, libreNuts: ReturnType<typeof spawnNuts> | null = null, libreTrick = newTrick(), turns = 0;
/** Trucos (aire, giros, vueltas, aterrizaje, combo) y tuercas doradas; `grounded` sale de drive(). */
function libreTricks(dt: number, grounded: boolean) {
  const c = lead.car!, body = c.body, w = body.getAngularVelocity(), up = c.root.up, fw = c.root.forward, rt = c.root.right, s = save.libre;
  const wU = Math.abs(B.Vector3.Dot(w, up)), wF = B.Vector3.Dot(w, fw), wR = B.Vector3.Dot(w, rt);
  const end = trickStep(libreTrick, dt, grounded, wU, Math.hypot(wF, wR), up.y);
  const prevAir = roam.air, prevTurns = turns;
  roam.flip = libreTrick.flip; roam.air = libreTrick.air; // lo lee libreDrive (control en el aire)
  turns = Math.floor(libreTrick.yaw / Math.PI) + Math.floor(libreTrick.flip / (2 * Math.PI)); // medios giros + vueltas completas en este vuelo
  if (prevAir === 0 && libreTrick.air > 0) { takeX = c.pos.x; takeZ = c.pos.z; } // despegue: de acá se mide el largo del salto
  if (prevAir < 0.15 && roam.air >= 0.15) FREE.takeoff();
  else if (!grounded && turns > prevTurns) FREE.whoosh();
  hudAire(grounded ? "" : trickLive(libreTrick));
  hudSpinBtn(!grounded && roam.air > 0.15);
  if (!s.aviso && !grounded && roam.air > 0.4) { s.aviso = true; avisoT = 3.5; persist(); } // una sola vez en la vida del guardado
  avisoT = grounded ? 0 : Math.max(0, avisoT - dt);
  hudAviso(avisoT > 0 ? `EN EL AIRE: ${ctl === "touch" ? "BOTÓN GIRO" : ctl === "pad" ? btnName(pb("spin")) : keyName(KEYS.spin[0])} PARA GIRAR` : "");
  if (end) {
    const up2 = bestUpdate(s.best, end), rec = up2.includes("salto") || up2.includes("combo") ? "RÉCORD" : "";
    hudTruco(end.name, end.pts, end.mult, end.clean, rec);
    if (end.clean) chTruco(libreCh, end.pts);
    libreMeta({ k: "truco", x: c.pos.x, z: c.pos.z, clean: end.clean, dist: Math.hypot(c.pos.x - takeX, c.pos.z - takeZ), mult: end.mult, yawDeg: end.yawDeg, flips: end.flips });
    if (end.clean) { FREE.landClean(); if (end.mult > 1) FREE.combo(end.mult); FX.dust(c.pos); FX.sparks(c.pos.add(new B.Vector3(0, 0.6, 0)), end.mult > 1 || rec ? 14 : 8); }
    else FREE.landDirty();
    if (up2.length) persist();
  }
  libreNuts?.tick(dt);
  const i = nutNear(s.tuercas, c.pos.x, c.pos.y, c.pos.z);
  if (i >= 0) {
    s.tuercas = s.tuercas.slice(0, i) + "1" + s.tuercas.slice(i + 1);
    libreNuts?.take(i); FREE.nut(); FX.sparks(c.pos.add(new B.Vector3(0, 0.8, 0)), 12);
    const n = nutsCount(s.tuercas); hudTuercas(n, NUT_N, true);
    if (n >= NUT_N) { FREE.nutAll(); grant("tuercas"); } // desbloquea la pintura Dorado tuerca (garaje, colores de logro)
    persist(); libreMeta({ k: "tuercas", bits: s.tuercas });
  }
}
function libreHud(dt: number, grounded: boolean) {
  libreTricks(dt, grounded); libreChallenge(dt);
  const c = lead.car!, p = c.pos;
  libreMeta({ k: "pos", x: p.x, z: p.z });
  if (libreLuz === 4 && (libreAcc += dt) > 0.5) { libreAcc = 0; libreT += 0.5; libreLight(); } // ponytail: 2 Hz; si applyClimate pesa, subir el paso
  let best = -1, bd = 110; // cartel al acercarse a menos de 110 m del centro de un lugar
  libreLugares.forEach((l, i) => { const d = Math.hypot(p.x - l.cx, p.z - l.cz); if (d < bd) { bd = d; best = i; } });
  if (best !== libreLugar) {
    libreLugar = best;
    if (best >= 0) { FREE.sign(); const b = $("barrio"); b.textContent = libreLugares[best].name; b.classList.remove("hidden", "show"); void b.offsetWidth; b.classList.add("show"); clearTimeout(libreCartelT); libreCartelT = window.setTimeout(() => b.classList.add("hidden"), 3000); }
  }
}
/** Radar con los barrios; corre después de updateHud (que también lo alimenta, vacío, cada 0,05 s). */
function libreRadar() {
  const c = lead.car!, p = c.pos;
  hudRadar({ x: p.x, z: p.z, yaw: Math.atan2(c.root.forward.x, c.root.forward.z), up: camYaw }, libreLugares.map((l) => ({ x: l.cx, z: l.cz, kind: "obj" as const })));
}
function startLibre() {
  libreKind = peek.car ?? save.car; peek.car = undefined;
  initAudio(); music("run", 0); musicS = "run";
  if (!simulating) track("run_start", { mode: "libre", car: libreKind });
  menuOff();
  clearRun(); // deja libre = false y la luz de la zona (ya armada como "libre")
  libre = true; libreLugar = -1; libreT = 0; libreAcc = 0;
  roam.on = true; roam.extra = 0; libreTrick = newTrick(); libreCh = newCh(); chFinT = 0;
  void import("./zones/libre").then((m) => { libreLugares = m.LUGARES; });
  void import("./zones/libre_nieve").then((m) => { roam.hielo = m.lagoHielo; });
  libreNuts = spawnNuts(save.libre.tuercas); hudTuercas(nutsCount(save.libre.tuercas), NUT_N);
  libreMeta({ k: "tuercas", bits: save.libre.tuercas }); // tuercas ya juntadas antes de existir los objetivos
  $("hud").classList.add("libre"); $("barrio").classList.add("hidden");
  setZone("libre"); setMoon(false);
  run.runSeed = 20261015; seedRng(run.runSeed); // el mapa es fijo; la semilla solo define el perfil que lee la cámara
  profile = makeProfile(run.runSeed);
  profile.climate = zoneClimate() ?? profile.climate;
  if (!simulating) { radio.auto(); radio.prefer("freeroam"); }
  cycleS = -1;
  buildLayout();
  lead.car = new Car(scene, libreKind, carOpts());
  setScoop(libreKind === "helado"); setEngineKind(libreKind);
  lead.maxHp = lead.car.def.hp;
  recompute();
  lead.hp = lead.maxHp; lead.boost = 100;
  wasGrounded = true; coyoteT = 0; hintOn = false;
  camYaw = 0; camReset(); resetOutroState(); fxSpeed(1); camH.set(0, 0, 1); camUp.set(0, 1, 0);
  state = "play";
  scene.physicsEnabled = false;
  reset(null);
  $("levelup").classList.add("hidden");
  $("hud").classList.remove("hidden"); // HUD mínimo: solo radar de barrios y cartel (hud.css #hud.libre)
  if (libreLuz < 4) libreLight();
  $("hint").classList.add("hidden");
}

// R6a: toda decisión de un jugador entra por acá (la costura para la red: el anfitrión aplicará los comandos de cada participante).
// Hoy los menús y botones son locales y las mandan como el que guía; la compra en la máquina, como quien la activó.
export type Cmd = { k: "card"; i: number } | { k: "reroll" } | { k: "enc"; i: 0 | 1 | 2 } | { k: "buy"; scrap: number; hpFrac: number };
function applyCommand(playerId: number, cmd: Cmd) {
  const net = getNet();
  if (net && !net.host) { if (isSpectating()) return; if (cmd.k !== "buy") { net.send({ t: "c", c: cmd }, true); if (cmd.k === "enc") banner("VOTO ENVIADO", 1.2); } return; } // R6b: el cliente no decide, le pide al anfitrión
  const p = players.find((x) => x.id === playerId) ?? lead;
  if ((cmd.k === "card" || cmd.k === "reroll") && net?.host && p.id !== getCardBy()) return; // R6c: online elige las cartas uno por vez (cardBy)
  if (cmd.k === "card") choose(cmd.i, p); // cartas: compartidas; la reparación cura a quien elige
  else if (cmd.k === "reroll") reroll();
  else if (cmd.k === "enc") encVote(p.id, cmd.i); // pactos, rutas y votos del teleportador (encore.ts pick)
  else { run.runScrap -= cmd.scrap; p.hp -= p.hp * cmd.hpFrac; } // máquina de opciones: tornillos y vida de quien compra
}
/** Jugador de un índice `who` de los eventos (0 = el que guía, 1.. = compañeros vivos). */
const whoP = (who = 0) => (who && liveM()[who - 1]) || lead;
$("encA").onpointerdown = (ev) => { ev.preventDefault(); applyCommand(lead.id, { k: "enc", i: 0 }); }; // pointerdown + sin foco: Espacio (turbo) no vuelve a apretar el botón
$("encB").onpointerdown = (ev) => { ev.preventDefault(); applyCommand(lead.id, { k: "enc", i: 1 }); };
$("encC").onpointerdown = (ev) => { ev.preventDefault(); applyCommand(lead.id, { k: "enc", i: 2 }); }; // RECHAZAR (solo en la oferta de pactos)

// ---------- R6b: ENCORE online de 2 (net_client.ts, docs/ENCORE/R0/R6_RED.md opción A) ----------
initNetClient({
  get lead() { return lead; },
  setLead: (p) => (lead = p),
  get players() { return players; },
  get enemies() { return enemies; },
  setEnemies: (e) => (enemies = e),
  get weapons() { return weapons; },
  setWeapons: (w) => (weapons = w),
  get spits() { return spits; },
  scene,
  engine,
  get state() { return state; },
  setState: (s) => (state = s),
  get time() { return run.time; },
  setTime: (t) => (run.time = t),
  get level() { return run.level; },
  setLevel: (lv) => (run.level = lv),
  get xp() { return run.xp; },
  setXp: (x) => (run.xp = x),
  get runScrap() { return run.runScrap; },
  setRunScrap: (s) => (run.runScrap = s),
  get erun() { return erun; },
  setErun,
  get zoneId() { return zoneId; },
  setZone: (z, b) => setZone(z, b),
  setMoon: (m) => setMoon(m),
  setCycleS: (c) => (cycleS = c),
  get offers() { return offers; },
  setOffers: (o) => (offers = o),
  get offerTitle() { return run.offerTitle; },
  get offerSel() { return offerSel; },
  setOfferSel: (s) => (offerSel = s),
  save,
  input,
  applyCommand: (id, cmd) => applyCommand(id, cmd),
  launchRun: (d, netOnline, n, then) => launchRun(d, netOnline, n, then),
  toMenu: () => toMenu(),
  banner: (t, s) => banner(t, s),
  openOffers,
  mateClear: () => mateClear(),
  newSeed: () => newSeed(),
  reset: (mode) => reset(mode),
  spitTpl: () => spitTpl(),
});

// ---------- R7a/c: ENCORE de 2 a 4 en compu, pantalla dividida (coop.ts) ----------
initCoop({
  get coop() { return coop; },
  get lead() { return lead; },
  setLead: (p) => (lead = p),
  players,
  others,
  liveM,
  scene,
  cam,
  camH,
  camUp,
  camTarget,
  get st() { return st; },
  get god() { return god; },
  save,
  input,
  get weapons() { return weapons; },
  setWeapons: (w) => (weapons = w),
  carOpts,
  newPlayer,
  getNet,
  setSpawnN: (n) => (spawnN = n),
  getShieldM: () => shieldM,
  clearShieldM: () => { shieldM = null; },
  clearPreview: () => { preview = null; },
  setLastHpFrac: (f) => (lastHpFrac = f),
  setCamYaw: (y) => (camYaw = y),
  banner: (t, s) => banner(t, s),
  hurt: (n, continuous, src) => hurt(n, continuous, src),
  get abil() { return run.abil; },
  get abilOn() { return run.abilOn; },
  carJump: (c, r) => carJump(c, r),
  cams: CAMS,
});

// ---------- Logros, Repetición y Cierre en cámara lenta (outro.ts) ----------
initProgression({
  scene, players, get lead() { return lead; }, get enemies() { return enemies; }, get st() { return st; },
  get weapons() { return weapons; }, setWeapons: (w) => (weapons = w),
  get state() { return state; }, setState: (s) => (state = s),
  get offers() { return offers; }, setOffers: (o) => (offers = o), setOfferSel: (v) => (offerSel = v),
  get preview() { return preview; }, setPreview: (m) => (preview = m),
  get offerFilter() { return offerFilter; }, evoNotified,
  get simulating() { return simulating; }, get daily() { return daily; }, get lab() { return LAB; },
  liveM: () => liveM(), recompute: () => recompute(), applyCommand: (id, cmd) => applyCommand(id, cmd),
});
initHudTick({
  engine, low,
  get weapons() { return weapons; }, get enemies() { return enemies; }, get pickups() { return pickups; }, get gems() { return gems; },
  get lead() { return lead; }, players, others,
  get camYaw() { return camYaw; }, get shake() { return shake; }, setShake: (v) => (shake = v),
  get simulating() { return simulating; }, get lampBoost() { return lampBoost; },
  get lastHpFrac() { return lastHpFrac; }, setLastHpFrac: (f) => (lastHpFrac = f),
  toScreen: (p) => toScreen(p),
});
initOutro({
  save,
  get erun() { return erun; },
  get time() { return run.time; },
  setTime: (t) => (run.time = t),
  get encPrior() { return encPrior; },
  setEncPrior,
  get runSeed() { return run.runSeed; },
  setRunSeed: (s) => (run.runSeed = s),
  get daily() { return daily; },
  get dailyInfo() { return dailyInfo; },
  get weeklyInfo() { return weeklyInfo; },
  get bank() { return run.bank; },
  setBank: (b) => (run.bank = b),
  get endless() { return run.endless; },
  get lead() { return lead; },
  players,
  get weapons() { return weapons; },
  get dmgBy() { return dmgBy; },
  get dmgOut() { return dmgOut; },
  get profile() { return profile; },
  get kills() { return run.kills; },
  get level() { return run.level; },
  get simulating() { return simulating; },
  get god() { return god; },
  get labOn() { return LAB.on; },
  get state() { return state; },
  setState: (s) => (state = s),
  get zoneId() { return zoneId; },
  get runDist() { return run.runDist; },
  grossScrap: () => grossScrap(),
  get encExtra() { return encExtra; },
  get encG() { return encG; },
  get curseK() { return run.curseK * st.scrap; }, // maldiciones x Llavero de la suerte
  get pfx() { return pfx; },
  get bestStreak() { return run.bestStreak; },
  get bestHit() { return run.bestHit; },
  get bestDriveMul() { return run.bestDriveMul; },
  get bossKills() { return run.bossKills; },
  setWorldK: (k) => (run.worldK = k),
  resetAbil: () => { run.abilOn = run.bombs = 0; },
  addRunScrap: (s) => { if (!simulating && s >= 1) scrapNumber(Math.round(s)); return (run.runScrap += s); },
  banner: (t, s) => banner(t, s),
  launchRun: (d, netOnline, n, then) => launchRun(d, netOnline, n, then),
  toMenu: () => toMenu(),
  setForceSeed: (s) => (forceSeed = s),
  scene,
  engine,
  get enemies() { return enemies; },
  get spits() { return spits; },
  clearSpits: () => {
    for (const sp of spits) sp.m.dispose();
    spits = [];
  },
  addCamYaw: (dy) => (camYaw += dy),
});

function toMenu() {
  tutEnd();
  netEnd();
  if (LAB.on) { LAB.on = false; god = false; }
  if (m3M?.match3Active()) m3M.exitMatch3();
  engineStop(); music("menu"); radio.prefer("menu");
  persist(); // bestiario visto en la partida abandonada
  clearRun();
  state = "menu";
  scene.physicsEnabled = true;
  $("hud").classList.add("hidden");
  reset("main");
}



function pause() {
  if (state !== "play") return;
  state = "pause"; scene.physicsEnabled = false; engineStop(); musicDuck(true);
  if (libre) return openPauseLibre(libreLuz);
  const evoLine = weapons.filter((w) => w.evolved).map((w) => WEAPONS[w.id].evoName).join(" · ");
  const totDmg = Object.values(dmgOut).reduce((a, b) => a + b, 0);
  openPause({
    weapons: weapons.map((w) => {
      const d = Math.round(dmgOut[w.id] ?? 0);
      return { id: w.id, lv: w.lv, evolved: w.evolved, dmg: d, pct: totDmg > 0 ? Math.round((d / totDmg) * 100) : 0 };
    }),
    passives: (Object.entries(run.passives) as [PassiveId, number][]).map(([id, lv]) => ({ id, lv })),
    stats: [["Carrocería", `${Math.ceil(lead.hp)} / ${lead.maxHp}`], ["Velocidad", `${Math.round(lead.car!.def.speed * st.speedMul * 3.6)} km/h`], ["Embestida", `x${lead.car!.def.ram}`], ["Daño", `${Math.round(st.dmg * 100)}%`], ["Blindaje", `${Math.round(st.armor * 100)}%`], ["Imán", `${st.magnet.toFixed(1)} m`]],
    run: [["Nivel", `NV ${run.level}${run.pendingLevels ? ` (+${run.pendingLevels} pend.)` : ""}`], ["Tiempo", fmt(run.time)], ["Daño total", Math.round(totDmg).toLocaleString("es")], ["Combo manejo", `×${run.driveMul.toFixed(2)} (pico ×${run.bestDriveMul.toFixed(2)})`], ["Re-sorteos", String(run.rerolls)], ...(evoLine ? [["Evoluciones", evoLine] as [string, string]] : [])],
    seed: `${profile.climate.name} · ${profile.plague.name} · Semilla ${run.runSeed}`,
  });
}
function resume() {
  if (state !== "pause") return;
  state = "play"; scene.physicsEnabled = false; reset(null); musicDuck(false);
}

// Esc / P / M y la navegación de menús viven en menu.ts; acá solo las cartas de mejora
addEventListener("keydown", (e) => {
  const lv = state === "level" || getNetLv(); // R6c: el cliente online también ve las cartas
  if (lv && /^Digit[1-4]$/.test(e.code)) { const i = +e.code.slice(5) - 1; if (i < offers.length) pickOffer(i); }
  if (e.code === "Enter" && lv) pickOffer(offerSel);
  if (keyHit("reroll", e.code) && lv) applyCommand(lead.id, { k: "reroll" });
});
// ---------- Carga (run_loader.ts) ----------
initRunLoader({ scene, cam, getState: () => state, setState: (s) => { state = s; }, zoneFor, setZone, showWorld,
  tpls: [() => gemTpl(1), () => gemTpl(5), () => gemTpl(20), pilaTpl, imanTpl, spitTpl],
  onExitMode: () => { state = "menu"; music("menu"); radio.prefer("menu"); reset("main"); },
  clearRun, startRun, startLibre,
  setRun: { encore: (v) => { encore = v; }, coop: (v) => { coop = v; }, dailyInfo: (v) => { dailyInfo = v; }, weeklyInfo: (v) => { weeklyInfo = v; }, weeklyOn: (v) => { weeklyOn = v; } } });
preload(runTasks(() => zoneFor(false)), () => state === "menu");
if (import.meta.env.DEV && /[?&]match3\b/.test(location.search)) setTimeout(() => goMatch3(), 1500);
if (import.meta.env.DEV) { Object.assign(window, { __libre: goLibre }); if (/[?&]libre\b/.test(location.search)) setTimeout(() => goLibre(), 1500); } // dev: __libre() o ?libre arrancan Free Roam
// ponytail: el banco Folded (`?folded`, solo dev) reusa el estado "match3" (cámara libre, sin auto); un estado propio si crece
if (import.meta.env.DEV && /[?&]folded\b/.test(location.search)) setTimeout(() => void launch([], "Banco Folded", () => {
  clearRun(); menuOff(); showWorld(false); state = "match3"; reset(null); $("hud").classList.add("hidden");
  void import("./folded_lab").then((m) => { applyClimate(DUSK); setDark(0.22); m.foldedLab(scene, cam); });
}, () => afterFrames(2)), 1500);
// Sonda de evolución de autos (`?evo`, solo dev): la maneja `npm run evo` (scripts/evo.mjs); mismo arreglo que el banco Folded
if (import.meta.env.DEV && /[?&]evo\b/.test(location.search)) setTimeout(() => void launch([], "Evolución", () => {
  clearRun(); menuOff(); showWorld(false); state = "match3"; reset(null); $("hud").classList.add("hidden");
  void import("./evo_probe").then((m) => { applyClimate(CLIMATES.find((c) => c.day) ?? DUSK); m.evoProbe(scene); });
}, () => afterFrames(2)), 1500);
if (import.meta.env.DEV && /[?&]race\b/.test(location.search)) setTimeout(() => { const q = new URLSearchParams(location.search); if (q.get("players") === "2" && !isTouch) { raceCfg.players = 2; raceCfg.p2 = "kbd2"; } if (q.get("track")) { raceCfg.cup = false; raceCfg.track = Number(q.get("track")) as 0 | 1 | 2; } goRace(q.has("battle")); }, 1500); // solo dev: ?race[&players=2] arranca la carrera
// Portada: fuentes del menú, dos cuadros dibujados (arma la escena del estante) y recién ahí se cierra la pantalla de carga; la precarga arranca con la portada ya a la vista
boot("Cargando fuentes", 0.7);
await Promise.race([Promise.all(['400 16px "Bebas Neue"', '500 16px Inter'].map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 1500))]);
boot("Armando el menú", 0.9);
void afterFrames(2).then(() => { void bootEnd(); startPreload(900); });
initPhoto({ scene, canvas, inPause: () => state === "pause", onShot: () => grant("foto") });
for (const ev of ['pointerover', 'touchstart', 'focusin']) document.addEventListener(ev, prefetchMode, { passive: true, capture: true });
initMenu({ scene, play: launchRun, weekly: () => launchRun(false, false, 0, undefined, true), resume, quit: toMenu, pause, endless: goEndless, race: () => goRace(), battle: () => goRace(true), match3: goMatch3, libre: goLibre, luz: (i) => { libreLuz = i; libreAcc = 0; libreLight(); } });
music("menu"); radio.play(); radio.prefer("menu"); // suena cuando haya primer gesto (initAudio)
// Intro de 4 cuadros: solo con ?intro (cualquier tecla la salta)
if (/[?&]intro\b/.test(location.search)) playIntro(); // T53: ya no sale sola; solo con ?intro o desde Créditos → Ver intro


// Juego de autos: menos bichos pero más duros, para esquivarlos manejando (decisión del usuario 2026-10-04)
const coopHp = () => 1 + R.coop_vida_por_jugador * (players.length - 1), coopRate = () => 1 + R.coop_ritmo_por_jugador * (players.length - 1); // R7c: con 1 solo valen 1
const TOUGH = { count: R.dureza_cantidad, hp: R.dureza_vida, dmg: R.dureza_dano, xp: R.dureza_xp };
function spawnEnemy(kind: Kind, p: B.Vector3) {
  const en = new Enemy(kind, p, (1 + (run.time + paceS) / R.vida_escala_seg) * TOUGH.hp); // los jefes ignoran hpMul
  en.hp = en.maxHp *= coopHp(); // R7c: vida por jugador (jefes incluidos)
  enemies.push(en);
  if (MOON.on && !isAlien(kind) && kind !== "gusano") enemyLights(enemies[enemies.length - 1].node, kind, DEF[kind].size); // los aliens traen sus luces (aliens.ts); luna: versión "robot con luces" (ojos y baliza que atraviesan la niebla)
  if (!LAB.on && !save.seen.includes(kind)) save.seen.push(kind); // bestiario
  if (!LAB.on && !simulating) { const b = beastRec(kind); b.first ??= today(); if (!b.zones.includes(zoneId)) b.zones.push(zoneId); } // registro propio
}

// Fase 2 de la luna (moon.ts LUNA.spawn): un bicho en cualquier punto de la esfera (se apoya en el piso del lugar)
initCombat({
  engine, scene, cam, players,
  get lead() { return lead; }, get enemies() { return enemies; }, get gems() { return gems; }, get pickups() { return pickups; },
  get simulating() { return simulating; }, get toughXp() { return TOUGH.xp; }, get lab() { return LAB; },
  addShake: (v) => { shake = Math.max(shake, v); }, addHitStop: (v) => { hitStop = Math.max(hitStop, v); },
  gainXp, hurt: (n, k, s, b) => hurt(n, k, s, b), spawnEnemy: (k, p) => spawnEnemy(k, p),
});
LUNA.spawn = (kind, p) => spawnEnemy(kind, onFloor(p, 0.5));
evInit({ // moon_events.ts: daño y sacudida viven acá
  hurt: (n, continuous, src, who) => hurtWho(n, continuous, src, who),
  blast: (p, r, dmg, src) => { cs.src = src; for (const e of enemies) if (B.Vector3.Distance(e.pos, p) < r + e.radius) damage(e, dmg, e.pos.subtract(p).normalize().addInPlace(upv(e.pos, 0.6)).scale(6)); cs.src = ""; },
  shake: (k) => { shake = Math.max(shake, k); },
  sim: () => simulating,
});
SHIP_IO.hurt = (n, src, who) => hurtWho(n, false, src, who);
COOP.n = () => players.length;
GOAL_IO.win = (p) => { if (state !== "play" || run.endless) return; if (erun) return encApply(E.boarded(erun)); /* ENCORE: el cohete es el teleportador, no el final */ setOutroAt(p.clone()); endRun(true, ESCAPE_WIN); };
GOAL_IO.phase = () => erun?.phase ?? "";
GOAL_IO.scrap = () => Math.floor(run.runScrap + Math.floor(run.time / R.tornillos_div_tiempo) + Math.floor(run.kills * TOUGH.xp / R.tornillos_div_bajas));
// R7b: who = índice en los autos vivos (0 = el que guía, 1 = el otro); la máquina cobra vida a quien la activa y las cartas (compartidas) dicen quién abrió
GOAL_IO.hpFrac = (who) => whoP(who).hp / lead.maxHp;
GOAL_IO.pay = (n, h, who) => applyCommand(whoP(who).id, { k: "buy", scrap: n, hpFrac: h });
/** Cofre especial: evolución o fusión si hay una lista; si no, primero las mejoras de lo que ya se tiene (subir armas y pasivas propias) y se completa con el sorteo común. */
const openSpecial = (who: number) => {
  const evo = evoOffer(weapons, run.passives);
  const up = levelOffers(weapons, run.passives, 40).filter((o) => (o.kind === "weapon" || o.kind === "passive") && (o.lv ?? 1) > 1).slice(0, 3 + save.perm.cards);
  openOffers(evo ? [evo] : [...up, ...offersFor().filter((o) => !up.some((u) => u.id === o.id))].slice(0, 3 + save.perm.cards), (evo ? (evo.kind === "fusion" ? "Cofre especial · Fusión" : "Cofre especial · Evolución") : "Cofre especial") + byTag(who));
};
GOAL_IO.offer = (k, who) => { if (erun) tip("chest"); if (k === "cofre" && erun && !chestsLeft()) { E.discover(erun, "aplausos"); encSecrets(); } if (k === "cofre") openChest(who); else if (k === "especial") openSpecial(who); else openOffers(offersFor(), "Máquina de opciones" + byTag(who)); };
SHIP_IO.reward = (p, xp, boss) => { dropGems(p, xp); dropPickup(p, "cofre"); if (boss) { run.bossKills++; run.runScrap += R.tornillos_jefe; shake = 1.5; } };

// ---------- Update ----------

initRunTick({
  scene, cam, TOUGH, get lead() { return lead; }, get enemies() { return enemies; }, get gems() { return gems; }, get pickups() { return pickups; },
  get spits() { return spits; }, get weapons() { return weapons; }, get st() { return st; }, get state() { return state; }, get simulating() { return simulating; },
  get camYaw() { return camYaw; }, get guestE() { return guestE; }, set guestE(v) { guestE = v; }, get musicS() { return musicS; }, set musicS(v) { musicS = v; },
  get musicT() { return musicT; }, set musicT(v) { musicT = v; }, get apagon() { return apagon; }, set apagon(v) { apagon = v; }, get shake() { return shake; }, set shake(v) { shake = v; },
  hurt: (n, k, s, b) => hurt(n, k, s, b), hurtWho: (n, k, s, w) => hurtWho(n, k, s, w), others: () => others(), pushSpit: (s) => pushSpit(s),
  spawnEnemy: (k, p) => spawnEnemy(k, p), spitTpl: () => spitTpl(), flemaTpl: () => flemaTpl(), stunned: (e, dt) => stunned(e, dt),
});
initRunDrive({
  scene, coopRate, get lead() { return lead; }, get players() { return players; }, get st() { return st; }, get weapons() { return weapons; }, get enemies() { return enemies; }, get state() { return state; }, get simulating() { return simulating; }, get camYaw() { return camYaw; }, get profile() { return profile; }, get LAB() { return LAB; }, get TOUGH() { return TOUGH; }, get low() { return low; }, get duel() { return duel; }, get RUN_BOSSES() { return RUN_BOSSES; }, get abilCar() { return abilCar; }, get evtPre() { return evtPre; },
  get shieldM() { return shieldM; }, set shieldM(v) { shieldM = v; }, get coyoteT() { return coyoteT; }, set coyoteT(v) { coyoteT = v; }, get wasGrounded() { return wasGrounded; }, set wasGrounded(v) { wasGrounded = v; }, get rainK() { return rainK; }, set rainK(v) { rainK = v; }, get rainBanner() { return rainBanner; }, set rainBanner(v) { rainBanner = v; }, get cycleS() { return cycleS; }, set cycleS(v) { cycleS = v; }, get lampBoost() { return lampBoost; }, set lampBoost(v) { lampBoost = v; }, get yardPulseIdx() { return yardPulseIdx; }, set yardPulseIdx(v) { yardPulseIdx = v; }, get yardPulseT() { return yardPulseT; }, set yardPulseT(v) { yardPulseT = v; }, get jingleT() { return jingleT; }, set jingleT(v) { jingleT = v; }, get motorFxT() { return motorFxT; }, set motorFxT(v) { motorFxT = v; }, get spawnN() { return spawnN; }, set spawnN(v) { spawnN = v; }, get darkK() { return darkK; }, set darkK(v) { darkK = v; }, get apagon() { return apagon; }, set apagon(v) { apagon = v; }, get shake() { return shake; }, set shake(v) { shake = v; }, get ball() { return ball; }, set ball(v) { ball = v; },
  liveM: () => liveM(), others: () => others(), useAbility: (c) => useAbility(c), carJump: (c, r) => carJump(c, r), trick: (n, k) => trick(n, k), spawnEnemy: (k, p) => spawnEnemy(k, p), hudDrive: (k, n) => hudDrive(k, n), hurt: (n, k, s, b) => hurt(n, k, s, b),
});


function update(dt: number) {
  const c = lead.car!;
  if (libre) { const F = { c } as Frame; tickDrive(F, dt); libreHud(dt, F.r.grounded); return; } // Free Roam: solo manejo (sin reloj, spawner, armas ni vitales)
  run.time += dt;
  if (erun) { encApply(E.tick(erun, dt)); const d = E.dirTick(dirq, dt, E.decisionOpen(erun)); if (d) { dirSub(d, E.ENC.dirShowS); if (!simulating && !LAB.on) SFX.radio((Object.values(E.TIPS) as string[]).includes(d)); } } // ENCORE: aterriza el teleportador, vencen las ventanas de decisión y votación
  const calm = erun?.phase === "vote" || erun?.phase === "final" || calmFirst(), tp = run.time + paceS, hordeK = run.horde * pfx.spawn; // calm: sin apariciones (solo el jefe del FINAL ACT); tp: reloj de dificultad
  if (tutOn() && (input.throttle || input.steer || input.move)) tut("move");
  if (hintOn && (run.time > HINT_S || input.throttle || input.steer || input.move || input.boost || input.drift || input.jump || input.ability)) { hintOn = false; $("hint").classList.add("fade"); }
  const F = { c, calm, tp, hordeK, warnS: R.aviso_evento_s * st.aviso, carR: Math.max(c.def.size[0], c.def.size[2]) / 2 } as Frame;
  tickWeather(F, dt);
  tickAbility(F, dt);
  tickDrive(F, dt);
  tickRam(F, dt);
  tickSpawner(F, dt);
  if (tickEnemies(F, dt) || tickWeapons(F, dt) || tickPickups(F, dt)) return;
  tickYardEvents(F, dt);
  tickVitals(F, dt);
}

let god = false; // solo dev
let lampBoost = false;
let rainK = 0, rainBanner = false; // lluvia: intensidad 0..1 y aviso ya mostrado
let yardPulseIdx = 0, yardPulseT = 0;
let evtPre = { swarm: false, ball: false, rain: false, elites: new Set<number>(), boss: new Set<number>() };
// Zoom de cámara: rueda del mouse o teclas - / = (0.8 cerca … 2 lejos), se guarda
const zoomBy = (k: number) => { save.zoom = Math.min(2, Math.max(0.8, save.zoom * k)); persist(); };
addEventListener("wheel", (ev) => state === "play" && zoomBy(ev.deltaY > 0 ? 1.08 : 1 / 1.08), { passive: true });
addEventListener("keydown", (ev) => {
  if (keyHit("zoomOut", ev.code)) zoomBy(1.1); else if (keyHit("zoomIn", ev.code)) zoomBy(1 / 1.1);
  if (!ev.repeat && (state === "play" || state === "race") && keyHit("cam", ev.code)) camCycle(); // cambiar cámara: solo el evento (input.ts)
  if (!ev.repeat && erun) { if (ev.code === "KeyZ") applyCommand(lead.id, { k: "enc", i: 0 }); else if (ev.code === "KeyX") applyCommand(lead.id, { k: "enc", i: 1 }); else if (ev.code === "KeyV") applyCommand(lead.id, { k: "enc", i: 2 }); } // ENCORE: decisión del teleportador, pactos y votación (Z/X, no 1/2: esas eligen carta y el mismo golpe de tecla las cruzaría; V rechaza el pacto, C ya es cámara)
});
const LAB = { on: false, back: 15, up: 13, t: 1 }; // modo lab (solo dev): mundo congelado para probar el look
initEncoreRun({
  hurt: (n, k, src) => hurt(n, k, src),
  get simulating() { return simulating; }, LAB, get state() { return state; }, get level() { return run.level; },
  get lead() { return lead; }, players, others,
  cam, camH, camUp, camTarget, get camYaw() { return camYaw; }, set camYaw(v) { camYaw = v; },
  get time() { return run.time; }, set time(v) { run.time = v; }, get runSeed() { return run.runSeed; }, set runSeed(v) { run.runSeed = v; },
  get profile() { return profile; }, set profile(v) { profile = v; }, get finalKind() { return run.finalKind; }, set finalKind(v) { run.finalKind = v; },
  get RUN_BOSSES() { return RUN_BOSSES; }, set RUN_BOSSES(v) { RUN_BOSSES = v; },
  get swarmT() { return run.swarmT; }, set swarmT(v) { run.swarmT = v; }, get chestT() { return run.chestT; }, set chestT(v) { run.chestT = v; }, get ballT() { return run.ballT; }, set ballT(v) { run.ballT = v; },
  get spawnAcc() { return run.spawnAcc; }, set spawnAcc(v) { run.spawnAcc = v; }, get groupT() { return run.groupT; }, set groupT(v) { run.groupT = v; }, get bossIdx() { return run.bossIdx; }, set bossIdx(v) { run.bossIdx = v; },
  get apagon() { return apagon; }, set apagon(v) { apagon = v; }, get shake() { return shake; }, set shake(v) { shake = v; }, get cycleS() { return cycleS; }, set cycleS(v) { cycleS = v; },
  get guestE() { return guestE; }, set guestE(v) { guestE = v; }, get ovT() { return run.ovT; }, set ovT(v) { run.ovT = v; },
  get enemies() { return enemies; }, set enemies(v) { enemies = v; }, get gems() { return gems; }, set gems(v) { gems = v as Gem[]; },
  get pickups() { return pickups; }, set pickups(v) { pickups = v as Pickup[]; }, get spits() { return spits; }, set spits(v) { spits = v as Spit[]; },
  get ball() { return ball; }, set ball(v) { ball = v; }, get evtPre() { return evtPre; }, set evtPre(v) { evtPre = v; },
  recompute: () => recompute(), spawnEnemy: (k, p) => spawnEnemy(k, p), dropPickup: (p, t) => dropPickup(p, t),
});
const dmgBy: Record<string, number> = {}; // solo dev: de dónde viene el daño
/** Daño de los eventos de la luna al auto `who` (0 = el que guía, 1 = el otro; R7b). */
function hurtWho(n: number, continuous: boolean, src: string, who: number) { hurtP(who ? liveM()[who - 1] : lead, n, continuous, src); }
function hurt(n: number, continuous = false, src = "?", by?: Kind) {
  n = danoRecibido(n);
  if (god || (run.abil === "escudo" && run.abilOn > 0)) return; // escudo: invulnerable
  if (st.cinta > 0) { // Cinta aislante: tapa un golpe cada tanto (y deja un respiro para que no la gaste el daño continuo)
    if (run.time < cintaUntil) return;
    if (run.time - cintaAt >= st.cinta) { cintaAt = run.time; cintaUntil = run.time + BAL.armasExtra.cinta_gracia_s; if (!simulating && lead.car) FX.sparks(lead.car.pos.add(upv(lead.car.pos, 0.8)), 14); return; }
  }
  if (by && DEF[by].final && enemies.some((e) => e.kind === by && e.enraged)) n *= ATK.segunda_barra_dano; // segunda barra: pega más fuerte
  if (by && !simulating && !LAB.on) beastRec(by).hurt += n * (1 - st.armor); // daño recibido por tipo (ficha del bestiario)
  run.airHit = true;
  if (run.driveMul > 1) { run.driveMul = 1; hudDrive(1); } // el combo de manejo cae con cualquier golpe
  recordHit(run.time);
  dmgBy[src] = (dmgBy[src] ?? 0) + n * (1 - st.armor);
  lead.hp -= n * (1 - st.armor);
  if (!simulating && n > 0) hudHurt(Math.min(1, (n * (1 - st.armor)) / Math.max(1, lead.maxHp) * (continuous ? 3 : 1))); // viñeta roja (contacto continuo: golpes chicos, se ve igual)
  if (!simulating && lead.car && !save.calm) { FX.sparks(lead.car.pos.add(upv(lead.car.pos, 0.5))); if (!continuous) debris(lead.car.pos, save.paint || "#d62828", 2, 5, 0.5); } // chispas (y pedazos de pintura en los golpes fuertes) al recibir daño
  if (!continuous) {
    shake = Math.max(shake, 0.5);
    if (!simulating && !save.calm) glitchHit();
    if (!simulating && save.rumble) void activePad()?.vibrationActuator?.playEffect("dual-rumble", { duration: 140, strongMagnitude: 0.6, weakMagnitude: 0.4 });
  }
}

/** Impulso del salto (con rampa) y su efecto; R7b: lo usan el que guía y el otro auto. */
function carJump(c: Car, r: { fs: number; slope?: number }) {
  const m = c.body.getMassProperties().mass || c.def.mass;
  const fwd = MOON.on ? flatL(c.root.forward, c.pos) : c.root.forward.clone(); fwd.y = 0;
  if (fwd.lengthSquared() > 1e-6) fwd.normalize();
  const ramp = r.slope ?? 0;
  const hx = Math.abs(r.fs) * R.salto_horiz * (1 + ramp * R.salto_rampa_h) * m;
  const vy = R.salto_impulso_v * (1 + ramp * R.salto_rampa_v) * m;
  c.body.applyImpulse(W(fwd.x * hx, vy, fwd.z * hx, c.pos), c.pos);
  if (!simulating) { SFX.boing(); const rear = c.pos.add(c.root.forward.scale(-0.8)); FX.dust(rear); shake = Math.max(shake, 0.18); }
}

// ---------- Habilidad activa ----------
function useAbility(c: Car) {
  tut("ability");
  const a = ABILITIES[run.abil];
  const k = abilK(run.abilLv); // nivel del Taller: más petardos, más segundos de escudo y de cámara lenta, más aturdido
  abilCar = c;
  run.abilCd = abilCdOf(run.abil, run.abilLv) / st.abilRate; run.abilOn = a.dur * (run.abil === "escudo" || run.abil === "lenta" || run.abil === "turbo" ? k : 1);
  if (run.abil === "bombardeo") { run.bombs = Math.round(R.bombardeo_petardos * k); run.bombT = 0; }
  else if (run.abil === "escudo") {
    if (!shieldM) { shieldM = sph(Math.max(...c.def.size) * 1.5, pbr("escudo", { color: "#8dff6a", emissive: "#3f9a2a", alpha: 0.18 }), [0, 0.2, 0]); shieldM.parent = c.root; shieldM.isPickable = false; }
    shieldM.parent = c.root; shieldM.isVisible = true; // R7b: en el auto de quien la disparó
    SFX.pickup();
  } else if (run.abil === "emp") {
    for (const e of enemies) if (!e.def.boss && !e.airborne && B.Vector3.Distance(e.pos, c.pos) < R.emp_radio + e.radius) e.stun = R.emp_aturde_s * k;
    if (!simulating) burst(c.pos.add(upv(c.pos, 0.6)), { n: 90, color: "#8dff6a", color2: "#6fb3c4", size: [0.2, 0.6], power: [14, 22], life: [0.25, 0.5], gravity: 0 });
    SFX.zap(); shake = Math.max(shake, 0.4);
  } else { run.worldK = R.lenta_mundo; fxSpeed(R.lenta_mundo); }
}
// Aturdido (Pulso EMP): sin IA ni ataques, se frena en el lugar y chisporrotea; los enfriamientos siguen corriendo
function stunned(e: Enemy, dt: number) {
  e.stun -= dt; e.ramCd -= dt; e.touchCd -= dt; e.hitCd -= dt;
  const v = e.body.getLinearVelocity();
  if (MOON.on) { const u = upAt(e.pos), vn = B.Vector3.Dot(v, u); _stunV.copyFrom(v).subtractInPlace(u.scale(vn)).scaleInPlace(0.85).addInPlace(u.scaleInPlace(vn)); }
  else _stunV.set(v.x * 0.85, v.y, v.z * 0.85);
  e.body.setLinearVelocity(_stunV);
  e.body.setAngularVelocity(B.Vector3.Zero());
  if (!simulating && Math.random() < dt * 5) FX.sparks(e.pos.add(upv(e.pos, e.def.size[1] * 0.6)));
  return undefined;
}
// Cámara lenta: el paso de Havok (también el de __sim y el del cierre) avanza el mundo a worldK y al auto no.
// El auto entra con la velocidad escalada 1/k, sale con la real y recupera la gravedad que el paso corto no le dio.
// ponytail: los choques auto-enemigo se resuelven con la velocidad escalada (empujan 2,5 veces más); alcanza para 3 s de efecto
{
  const pe = scene.getPhysicsEngine() as unknown as { _step(d: number): void; gravity: B.Vector3 }, step0 = pe._step.bind(pe);
  pe._step = (d: number) => {
    d *= run.weeklyK; // doble_velocidad: el mundo y los autos avanzan x1.5 por el mismo paso (un solo _step)
    if (run.worldK === 1 || !lead.car) return step0(d);
    const k = run.worldK, bs = [lead.car.body, ...liveM().map((m) => m.car!.body)]; // R7a/c: todos los autos van a velocidad real
    for (const b of bs) { b.setLinearVelocity(b.getLinearVelocity().scaleInPlace(1 / k)); b.setAngularVelocity(b.getAngularVelocity().scaleInPlace(1 / k)); }
    step0(d * k);
    for (const b of bs) {
      const v = b.getLinearVelocity().scaleInPlace(k);
      if (MOON.on) grav(v, b.transformNode.position, MOON.g * d * (1 - k * k)); else v.y += pe.gravity.y * d * (1 - k * k);
      b.setLinearVelocity(v); b.setAngularVelocity(b.getAngularVelocity().scaleInPlace(k));
    }
  };
}
// Combo de manejo: cada maniobra suma al multiplicador de XP, con tope x2
function trick(name: string, k: number) { run.trickT = 0; run.driveMul = Math.min(R.combo_tope, run.driveMul + k); run.bestDriveMul = Math.max(run.bestDriveMul, run.driveMul); if (!simulating) hudDrive(run.driveMul, name); }

// ---------- Modo sin fin: "Seguir jugando" en los resultados tras vencer al jefe final ----------
function goEndless() {
  if (state !== "over" || run.endless || !lead.car || !run.bank) return;
  run.endless = true; run.runDist = 0; // lo manejado hasta acá ya se sumó a las estadísticas
  state = "play"; scene.physicsEnabled = false; reset(null);
  music("run", 1); musicS = "run";
  $("hud").classList.remove("hidden");
  RUN_BOSSES.push([run.time + R.sinfin_cada_s, RUN_BOSSES[RUN_BOSSES.length % 3][1]]);
  banner("MODO SIN FIN: HORAS EXTRA", 2.5);
}


// ---------- Loop ----------

initCameraRig({
  engine, scene, cam, camH, camUp, camTarget, low, occluders, lab: LAB, liveM: () => liveM(),
  get lead() { return lead; }, get enemies() { return enemies; }, get state() { return state; }, get simulating() { return simulating; },
  get profile() { return profile; }, get cycleS() { return cycleS; }, get rainK() { return rainK; }, get lampBoost() { return lampBoost; },
  get camYaw() { return camYaw; }, set camYaw(v) { camYaw = v; }, get shake() { return shake; }, set shake(v) { shake = v; },
  get preview() { return preview; }, set preview(v) { preview = v; },
});

scene.onBeforeRenderObservable.add(() => {
  padSnap();
  const dt = Math.min((frameAcc || engine.getDeltaTime()) / 1000, 0.05);
  const net = getNet();
  if (net) { pollInput(); players[0].in = input; if (net.host && players[1]) players[1].in = getNetIn(); } // R6b: J2 remoto = su último input, como un control local
  else if (players.length > 1) mateInput(); else pollInput();

  if (state === "level") {
    if (padPressed(14)) { offerSel = (offerSel + offers.length - 1) % offers.length; selectOffer(offerSel); }
    if (padPressed(15)) { offerSel = (offerSel + 1) % offers.length; selectOffer(offerSel); }
    if (padPressed(pb("ok"))) pickOffer(offerSel);
    if (padPressed(pb("reroll"))) applyCommand(lead.id, { k: "reroll" });
  } else if (state === "play") { if (padPressed(pb("pause"))) pause(); else if (padPressed(pb("cam"))) camCycle(); else if (erun && padPressed(14)) applyCommand(lead.id, { k: "enc", i: 0 }); else if (erun && padPressed(15)) applyCommand(lead.id, { k: "enc", i: 1 }); else if (erun && padPressed(13)) applyCommand(lead.id, { k: "enc", i: 2 }); } // ENCORE: cruceta izquierda/derecha = opción 1/2, abajo = rechazar el pacto
  else if (state === "outro") outroTick(dt);
  else if (state === "over" && rp.on) rpPlay(dt);
  else if (state === "race") { const k = kartM!; if (padPressed(pb("pause"))) k.racePause(); if (padPressed(pb("ok"))) k.raceClick(); if (padPressed(pb("cam"))) camCycle(); if (padPressed(14)) k.racePadMenu(-1); if (padPressed(15)) k.racePadMenu(1); k.raceTick(dt); }
  else if (state === "match3") { if (padPressed(pb("pause"))) m3M?.match3PauseToggle(); m3M?.match3Tick(dt); }
  else if (state === "net") { // R6c: el cliente online navega cartas (netLv) y pactos/rutas/votos con el mando; el anfitrión valida el turno
    netClientTick(); updateHud(dt);
    if (getNetLv()) {
      if (padPressed(14)) { offerSel = (offerSel + offers.length - 1) % offers.length; selectOffer(offerSel); }
      if (padPressed(15)) { offerSel = (offerSel + 1) % offers.length; selectOffer(offerSel); }
      if (padPressed(pb("ok"))) pickOffer(offerSel);
      if (padPressed(pb("reroll"))) applyCommand(lead.id, { k: "reroll" });
    } else if (erun) { if (padPressed(14)) applyCommand(lead.id, { k: "enc", i: 0 }); else if (padPressed(15)) applyCommand(lead.id, { k: "enc", i: 1 }); else if (padPressed(13)) applyCommand(lead.id, { k: "enc", i: 2 }); }
  }
  else if (!introOn()) menuPad(dt); // con la intro encima el menú no escucha el gamepad

  if (state === "play") {
    // Hit-stop: congela el mundo un par de cuadros en los golpes fuertes
    scene.physicsEnabled = false;
    if (hitStop > 0) hitStop -= dt;
    else {
      update(LAB.on ? 1e-4 : dt);
      (scene.getPhysicsEngine() as unknown as { _step(d: number): void })._step(LAB.on ? 1e-4 : dt);
      if (RR.rec.on && state === "play") RR.recTick(dt, rrTake);
    }
    updateHud(dt);
    if (libre && lead.car) libreRadar();
  }
  if (getNet()?.host && (state === "play" || state === "level")) netSnap(dt);
  tickFx(dt * ts);
  uiTick(dt, state === "play" || state === "match3");
  if (save.fps && (fpsT -= dt) <= 0) { // estadísticas: fps y ms de los cuadros dibujados (no los del navegador), resolución interna real y escala o modo FSR
    fpsT = 0.5;
    const g = gfxInfo();
    $("fps").textContent = `${Math.round(1000 / frameMs)} fps · ${frameMs.toFixed(1).replace(".", ",")} ms\nInterna ${g.w}x${g.h} · ${g.mode}`;
  }

  // Cámara 3/4 elevada. Con teclado sigue el rumbo del auto; con stick queda fija
  // (si rotara, la dirección del stick cambiaría mientras girás).
  setWind(performance.now() / 1000, lead.car?.pos ?? null);
  if (!simulating) contactShadows(lead.car && (state === "play" || state === "level" || state === "outro" || state === "pause") ? lead.car.pos : null, enemies);
  cameraTick(dt);
});

// Límite de FPS (Configuración → Imagen): el navegador no deja fijar la tasa, así que se saltan cuadros del bucle y su tiempo se suma al dt del siguiente
let frameAcc = 0, frameMs = 16.7, skipMs = 0;
engine.runRenderLoop(() => {
  skipMs += engine.getDeltaTime();
  const cap = state === "menu" && save.menuFps ? save.menuFps : save.fpsCap; // en los menús manda su propio tope (Configuración → Imagen → FPS de los menús)
  if (cap && skipMs < 1000 / cap - 2) return;
  frameAcc = skipMs; frameMs += (skipMs - frameMs) * 0.1; skipMs = 0;
  scene.render();
  frameAcc = 0;
});
addEventListener("resize", () => engine.resize());

// Hooks de desarrollo e inspección (solo dev, fuera del bundle de producción)
if (import.meta.env.DEV) {
  void import("./dev-hooks").then((m) =>
    m.initDevHooks({
      engine, scene, cam, get camYaw() { return camYaw; }, times, get glbStats() { return glbStats; }, ensureAll, get bichosOk() { return loaderOk(); }, look, applySettings,
      get state() { return state; }, setState: (s) => (state = s),

      get time() { return run.time; }, setTime: (t) => (run.time = t),
      get level() { return run.level; }, setLevel: (lv) => (run.level = lv),
      get kills() { return run.kills; }, get runSeed() { return run.runSeed; },
      setForceSeed: (s) => (forceSeed = s),
      get simulating() { return simulating; }, setSimulating: (s) => (simulating = s),
      get god() { return god; }, setGod: (g) => (god = g),
      get duel() { return duel; }, setDuel: (d) => (duel = d),
      get endless() { return run.endless; },
      setRevives: (r) => (run.revives = r),
      save, get profile() { return profile; },
      setCycleS: (s) => (cycleS = s),
      rainWet,
      get lead() { return lead; }, get players() { return players; }, others, liveM, matePlace,
      get coop() { return coop; }, setCoop: (c) => (coop = c),
      isTouch,
      get weapons() { return weapons; }, setWeapons: (w) => (weapons = w),
      get passives() { return run.passives; }, setPassives: (p) => (run.passives = p),
      makeWeapon, recompute, gainXp, evoOffer,
      get enemies() { return enemies; }, get spits() { return spits; }, get gems() { return gems; }, spawnEnemy, spawnPoint, damage,
      get dmgBy() { return dmgBy; }, get dmgOut() { return dmgOut; },
      get RUN_BOSSES() { return RUN_BOSSES; }, get bossIdx() { return run.bossIdx; }, setBossIdx: (i) => (run.bossIdx = i),
      setFinalKind: (k) => (run.finalKind = k),
      setSwarmT: (t) => (run.swarmT = t),
      setGroupT: (t) => (run.groupT = t),
      setChestT: (t) => (run.chestT = t),
      setBallT: (t) => (run.ballT = t),
      get evtPre() { return evtPre; }, obstacles,
      get encore() { return encore; }, setEncore: (e) => (encore = e),
      get erun() { return erun; }, encLog, get encPrior() { return encPrior; }, get paceS() { return paceS; }, encApply,
      shopAt, shopDev, carPlace, onFloor, goalBlips,
      get runScrap() { return run.runScrap; }, setRunScrap: (s) => (run.runScrap = s),
      GOAL_IO,
      get net() { return getNet(); }, get netBytes() { return getNetBytes(); }, get netLv() { return getNetLv(); }, get cardBy() { return getCardBy(); }, get offers() { return offers; }, get votes() { return votes; }, get netPools() { return getNetPools(); }, get netBuf() { return getNetBuf(); }, get netIn() { return getNetIn(); },
      get MOON() { return MOON; }, SUN_DIR, EARTH_DIR, moonPlace, goalStats, get curseK() { return run.curseK; }, get TOUGH() { return TOUGH; }, get R() { return R; }, get LAB() { return LAB; },
      get abil() { return run.abil; }, setAbil: (a) => (run.abil = a),
      get abilLv() { return run.abilLv; }, setAbilLv: (lv) => (run.abilLv = lv),
      get abilCd() { return run.abilCd; }, setAbilCd: (cd) => (run.abilCd = cd),
      get abilOn() { return run.abilOn; }, useAbility,
      get worldK() { return run.worldK; }, get driveMul() { return run.driveMul; },
      input, startRun, toMenu, resume, goEndless, applyCommand, update, tickFx,
      get m3M() { return m3M; },
      $, fmt, hd, at,
    })
  );
}
