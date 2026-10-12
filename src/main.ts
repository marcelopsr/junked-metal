import { hudMate, hudQuad, banner, bannerClear, damageNumber, hudAbility, hudArrows, hudBoss, hudDrive, hudEnc, hudJump, hudSlots, hudKill, hudRadar, hudUpdate, hudWorkshop, initHud, pickOffer, dirSub, radioBoss, radioEvent, selectOffer, showOffers, uiTick } from "./ui";
import * as B from "@babylonjs/core";
import havokWasm from "@babylonjs/havok/lib/esm/HavokPhysics.wasm?url";
import { Car, CARS, drive } from "./car";
import { DEF, DOG_RAM, Enemy, pickWeighted, spawnTable, type Kind, ROAR } from "./enemies";
import { engineSfx, engineStop, initAudio, music, moonAmbience, musicDuck, rainSfx, setEngineKind, SFX, SPACE } from "./sfx";
import { ambient, burst, clearFx, contactShadows, corpse, debris, FX, fxSpeed, impact, initFx, mark, rainWet, splat, tickFx, tickRain } from "./fx";
import { activePad, btnName, camCycle, coopCtl, coopSkip, ctl, input, isTouch, keyHit, KEYS, KEYS2, padPressed, pads, padSnap, pb, pollInput, pollMate, pollPad, RACE, setupTouch } from "./input";
import { carGlbProgress, loadCarGlbs } from "./carGlb";
import { GLB, glbFootprint, glbProgress, glbStats, glbTpl, loadGlbs } from "./glb";
import { boot, bootEnd, ensure, ensureAll, idle, launch, preload, startPreload, times, type Task } from "./loading";
import { carModel, cyl, enemyTemplate, initModels, LEGS, legTemplate, nutTemplate as nutTpl, sph, template, wingTemplate } from "./models";
import { CAM_MODES, CAM_NAMES, type CamMode } from "./savefmt";
import { encCfg, encMax, ABIL_ICON, applySettings, beastRec, BV, carOpts, current, shownCar, startPick, dailySeed, fmt, initMenu, keyName, today, menuPad, openOver, openPause, persist, reset, save, type RunRec } from "./menu";
import { ABILITIES, abilCd as abilCdOf, abilK, type AbilityId } from "./abilities";
import { pilotStats, startWeapons } from "./pilots";
import { ACH, type AchId } from "./achievements";
import { applyClimate, gfxInfo, glitchHit, PRESETS as PRESETS_DEV, presetOf, look, M, pbr, setDark, setLamp, setSplit, setupRender, shadows, G } from "./render";
import { evoOffer, fuse, levelOffers, makeWeapon, mountFor, passiveStats, setScoop, WEAPONS, type Ctx, type Offer, type PassiveId, type PStats, type Weapon, type WeaponId } from "./weapons";
import { setDrawDist, buildLayout, floorAt, HALF, initWorld, hitBreakables, hitHeavyProps, heavyProps, obstacles, occluders, setWind, setZone, showWorld, spawnPoint, underRoof, worldReady, ZONES, zoneClimate, zoneDust, zoneId, zoneTick } from "./world";
import { CLIMATES, DUSK, ESCAPE_WIN, FINAL_WIN, makeProfile, mixClimate, nightfall, RAIN, type Profile } from "./run";
import { newSeed, rng, seedRng } from "./rng";
import { cfLoginUrl, getToken, LOGIN_URL, loginKey, loginUrl, NET_HOST, setToken, takeToken, type Msg, type Net } from "./net"; // net.ts es chico; peerjs sigue en su chunk dinámico
import { BAL, xpNeed } from "./balance";
import { OUTRO_GUARD, OUTRO_S, OUTRO_SNAP, outroStatLine, outroUi, showPhoto, slowScale, snap } from "./replay";
import { introOn, playIntro } from "./intro";
import { craterHumeante, evBase, evFog, evInit, evPace, evReset, evShow, lunaDev, lunaEv, panTo } from "./moon_events";
import { hitShip, SHIP_IO, SHIP_NAME, shipBar, shipFor, shipsClear, shipSpawn, shipsTick, shipTargets, type ShipId } from "./moon_ships";
import { alignYaw, alt, at, deform, moonCar, teleport, EARTH_DIR, enemyLights, flatL, FOOT, ROLL, grav, hd, hflat, initMoon, LUNA, MOON, moonTick, onFloor, orient, rad, rel, ringAt, setMoon, skyVisible, SUN_DIR, toLocal, upAt, upv, W, advance, yawOf, below } from "./moon";
import * as E from "./encore";
import { COOP, chestsLeft, chestsOpened, shopAt, shopDev, goalBar, goalBlips, goalForce, goalsClear, goalStats, goalsTick, GOAL_IO, rocketForce, rocketLand, shopPlan, shopReset, spotsPlan } from "./moon_goals";
import { skyClear, skyInfo, skyLaunch, skyPace, skyTick } from "./moon_sky";
import { ALIENS, alienWave, armorMul, healTick, isAlien } from "./aliens";
import { wormForce, wormHeadTpl, wormOut } from "./moon_worm";
import { CAR_YAW, carSpot, menuFov, menuOff, menuTick, SHOTS } from "./menuscene";
import { raceCfg, TRACKS } from "./kart_cfg";
import "./duel.css"; import "./match3.css"; import "./race.css"; // hojas de los modos de carga perezosa: estáticas para quedar ANTES de kit.css (race.css solo se importa acá)
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
type Gem = { m: B.InstancedMesh; xp: number; pull: boolean; vy: number };
type Pickup = { m: B.AbstractMesh; type: "pila" | "iman" | "cofre" };
type Spit = { m: B.InstancedMesh; v: B.Vector3; life: number; k?: Kind; float?: boolean }; // k: quién lo tiró (daño recibido por tipo); float: luna, sin caída (onda alien)

let state: "menu" | "play" | "level" | "pause" | "over" | "outro" | "race" | "duel" | "match3" | "net" = "menu"; // net: cliente online (R6b), dibuja los snapshots del anfitrión sin simular
// R6a: estado por jugador (docs/ENCORE/R0/R6_RED.md §4). players[0] = J1; `lead` = el que guía: maneja la cámara `cam` con sus modos, el input global
// y las armas de verdad (`weapons`); los otros llevan copias montadas en su auto. car === null = caído (vuelve en el próximo escenario).
// Compartidos (como antes): XP, nivel, armas, pasivas, tornillos y pactos.
const NO_IN = { throttle: 0, steer: 0, boost: false, drift: false, ability: false, jump: false, moveX: 0, moveY: 0, move: false };
type Player = { id: number; in: typeof NO_IN; car: Car | null; hp: number; maxHp: number; boost: number; fs: number; touch: number; jumpCd: number; coyote: number; cam: B.FreeCamera; h: B.Vector3; up: B.Vector3; tgt: B.Vector3; weapons: Weapon[]; sig: string };
const newPlayer = (id: number, c: B.FreeCamera): Player => ({ id, in: id === 1 ? input : NO_IN, car: null, hp: 100, maxHp: 100, boost: 100, fs: 0, touch: 0, jumpCd: 0, coyote: 0, cam: c, h: new B.Vector3(0, 0, 1), up: new B.Vector3(0, 1, 0), tgt: new B.Vector3(), weapons: [], sig: "" });
const players: Player[] = [newPlayer(1, cam)];
let lead = players[0];
/** Los que no guían, en orden de jugador (sus índices 1.. son los `who` de los eventos, contando solo los vivos). */
const others = () => players.filter((p) => p !== lead);
let weapons: Weapon[] = [];
let passives: Partial<Record<PassiveId, number>> = {};
let st: PStats = passiveStats({}, save.perm);
let jingleT = 0;
let bestStreak = 0, bestHit = 0, bossKills = 0, bestDriveMul = 1; // mejores momentos de la partida (pantalla final)
let xp = 0, level = 1, pendingLevels = 0;
let time = 0, kills = 0, runScrap = 0;
let runDist = 0; // metros manejados en la partida (estadísticas de carrera)
let rerolls = 0, revives = 0, offerTitle = ""; // del taller: Dado cargado y Batería de reserva
let runSeed = 0;
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
const _moveF = new B.Vector3(), _moveR = new B.Vector3(), _moveWant = new B.Vector3(), _moveFwd = new B.Vector3(), _spawnOff = new B.Vector3(), _ahead = new B.Vector3(), _stunV = new B.Vector3();
const spitTpl = () => template("spit", () => [sph(0.55, pbr("acid", { color: "#ff3a1f", rough: 0.1, emissive: "#c01800", alpha: 0.9 }), [0, 0, 0])]);
let fpsT = 0;
let cycleS = -1; // tramo del ciclo atardecer → noche ya aplicado
let darkK = 1, apagon = false, musicS = "", musicT = 0; // musicS/T: estado musical y reloj de refresco
let spawnAcc = 0, groupT = 0, swarmT = 60, chestT = 100, ballT = 75, bossIdx = 0;
let shake = 0, camYaw = 0, dustT = 0, roofK = 0, dynK = 1;
// Modos de cámara de partida (Configuración → Juego, se alternan con Cambiar cámara). back/up = metros detrás y arriba (por el zoom del usuario),
// look = cuánto mira por delante del auto, yaw fijo = no gira con el auto (el stick sigue siendo "hacia dónde ir" en pantalla)
const CAMS: Record<CamMode, { back: number; up: number; look: number; yaw?: number }> = {
  actual: { back: 15, up: 13, look: 3 },
  cenital: { back: 2, up: 24, look: 0, yaw: 0 }, // casi vertical: norte (+z) arriba; ×1,8 en pantalla vertical (angosta); la altura se acota para que el anillo de aparición quede fuera de cuadro
  iso: { back: 12, up: 19, look: 0, yaw: Math.PI / 4 }, // diagonal 45° en planta, inclinada 58° hacia abajo (a 45° veía hasta el horizonte)
  baja: { back: 8, up: 4.5, look: 6 },
  dinamica: { back: 15, up: 13, look: 3 }, // la de persecución, multiplicada por dynK (más bichos cerca o más velocidad = más lejos)
};
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
let abil: AbilityId = "bombardeo", abilLv = 0, abilCd = 0, abilOn = 0, worldK = 1, bombs = 0, bombT = 0;
let abilCar: Car | null = null; // R7b: auto que disparó la habilidad (bombardeo alrededor suyo)
let shieldM: B.Mesh | null = null; // burbuja del escudo, hija del auto (se libera con él)
// Combo de manejo: multiplicador de XP (x1 a x2) que se pierde al recibir daño
let driveMul = 1, driftT = 0, airT = 0, airHit = false, trickT = 0, jumpCd = 0; // trickT: segundos desde el último truco
// Maldiciones (horde = multiplicador de enemigos, curseK = de tornillos) y modo sin fin
let horde = 1, curseK = 1, noRepair = false, endless = false, finalKind: Kind = "perro";
// Lo ya cobrado en el endRun anterior (vencer al jefe final y seguir en modo sin fin): el siguiente suma solo la diferencia
let bank: { t: number; scrap: number; dmg: Record<string, number>; rec?: RunRec } | null = null;

let touchIFrame = 0, hitStop = 0, smokeT = 0, skidT = 0, lastHpFrac = 1, smashCd = 0, boostSec = 0, motorFxT = 0;

// Macetas rotas sueltan tuercas y a veces una pila
const smashed = (pots: B.Vector3[]) => { for (const p of pots) { SFX.break(); dropGems(p, R.maceta_xp); if (rng() < R.maceta_pila_prob) dropPickup(p, "pila"); shake = Math.max(shake, 0.5); } };

// ---------- Plantillas de recolectables ----------
const gemTpl = (v: 1 | 5 | 20) => template("gem" + v, () => [
  cyl(0.5, 0.5, 0.22, pbr("gem" + v, { color: v === 1 ? "#cbd5e1" : v === 5 ? "#facc15" : "#38bdf8", rough: 0.3, metal: 0.6, emissive: v === 1 ? "#5a6878" : v === 5 ? "#c09010" : "#1890c8" }), [0, 0.3, 0], [0.4, 0, 0], 6),
  cyl(0.22, 0.22, 0.24, M.matte("#1e293b"), [0, 0.3, 0], [0.4, 0, 0], 6),
], v === 20 ? 1.5 : 1);

function dropGems(pos: B.Vector3, amount: number) {
  if (gems.length > R.gemas_tope) { gainXp(amount); return; } // tope: se absorbe directo
  while (amount > 0) {
    const v: 1 | 5 | 20 = amount >= 20 ? 20 : amount >= 5 ? 5 : 1;
    amount -= v;
    const m = gemTpl(v).createInstance("gem");
    const jx = (rng() - 0.5) * 1.5, jz = (rng() - 0.5) * 1.5;
    if (MOON.on) onFloor(at(pos, jx, 0, jz), 0, m.position); else m.position.set(pos.x + jx, 0, pos.z + jz);
    gems.push({ m, xp: v, pull: false, vy: 5 + Math.random() * 4 }); // salta al caer (visual: Math.random, no toca la semilla)
  }
}

const PICKUP_CAP = R.pickups_tope; // por tipo; sin tope, a los 7-9 min había cientos en el piso (mallas + sombras) y la pestaña se caía
const pilaTpl = () => template("pila", () => [cyl(0.8, 0.8, 1.6, pbr("pila", { color: "#22c55e", rough: 0.45, emissive: "#1a8040" }), [0, 0, 0], [0, 0, Math.PI / 2], 12)]);
const imanTpl = () => template("iman", () => [sph(1.2, pbr("iman", { color: "#ef4444", rough: 0.35, metal: 0.35, emissive: "#c02020" }), [0, 0, 0])]);
function dropPickup(pos: B.Vector3, type: Pickup["type"]) {
  if (type === "pila" && noRepair) return; // Sin reparaciones: tampoco caen pilas
  let m: B.AbstractMesh;
  // Pilas e imanes: instancias de plantilla (caen de a cientos) con tope; al pasarlo se va la más vieja de su tipo
  if (type !== "cofre") {
    let first = -1, n = 0;
    for (let i = 0; i < pickups.length; i++) { if (pickups[i].type === type) { n++; if (first < 0) first = i; } }
    if (n >= PICKUP_CAP && first >= 0) { pickups[first].m.dispose(); pickups.splice(first, 1); }
    m = (type === "pila" ? pilaTpl() : imanTpl()).createInstance(type);
    onFloor(pos, 0.8, m.position); orient(m);
  } else {
    m = cyl(2.2, 2.2, 1.6, M.metal("#d4a017"), [pos.x, 0.8, pos.z], undefined, 6);
    const beam = cyl(1.4, 1.4, 60, pbr("beam", { color: "#fde68a", emissive: "#fbbf24", alpha: 0.25 }), [0, 30, 0], undefined, 8);
    beam.parent = m;
    if (MOON.on) { onFloor(pos, 0.8, m.position); orient(m); } // luna: el haz sale para arriba del lugar
    shadows.addShadowCaster(m as B.Mesh); // las instancias ya proyectan sombra por su plantilla
  }
  pickups.push({ m, type });
}

// ---------- Flujo ----------
function recompute() {
  st = pilotStats(passiveStats(passives, save.perm), save.pilot);
  if (erun) { const g = grossScrap(); encExtra += E.scrapExtra(g, encG, pfx.scrap); encG = g; } // ENCORE: lo ganado con el efecto que se va se cobra con ese efecto
  pfx = E.pactFx(erun); // ENCORE: pactos activos (neutros en Supervivencia: x1, +0)
  st.dmg *= pfx.dmg; st.speedMul *= pfx.speed; st.xp *= pfx.xp; st.regen += pfx.regen;
  if (pfx.taken !== 1) st.armor = 1 - (1 - st.armor) * pfx.taken; // daño recibido x taken
  if (noRepair) st.regen = 0; // maldición Sin reparaciones
  const newMax = pfx.maxHp === 1 ? lead.car!.def.hp + st.maxHp : Math.round((lead.car!.def.hp + st.maxHp) * pfx.maxHp);
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
function previewOffer(i: number) {
  preview?.dispose();
  preview = null;
  const o = offers[i];
  if (!lead.car || !o || (o.kind !== "weapon" && o.kind !== "evo")) return;
  const owned = weapons.find((w) => w.id === o.id);
  if (!owned) preview = mountFor(o.id as WeaponId, lead.car);
  else if (owned.mount) owned.mount.scaling.setAll(1.25 + (o.kind === "evo" ? 0.2 : 0));
}

function clearRun() {
  mateClear();
  erun = null; encPrior = paceS = 0; encExtra = encG = 0; GOAL_IO.tele = false; GOAL_IO.half = 0; pfx = E.NO_FX;
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

let daily = false, encore = import.meta.env.DEV && /[?&]encore\b/.test(location.search); // encore: modo ENCORE (docs/ENCORE); ?encore (dev) lo deja armado y arranca solo
// ENCORE: erun = estado de la expedición (encore.ts; null = Supervivencia, que no toca nada de esto). encPrior = segundos de los escenarios anteriores
// (`time` es el reloj del escenario); paceS = segundos de dificultad extra que suman escenario, vuelta y estadía (E.paceOf).
let dirq = E.newDirQ(), ovT = 0, guestE: Enemy | null = null; // R3: cola del Director, reloj de enjambres del OVERLOAD, invitado del BOSS_GUEST
let erun: E.Run | null = null, encPrior = 0, paceS = 0, pfx: E.Fx = E.NO_FX; // pfx = efecto de los pactos activos (recompute)
// R7a/c (ENCORE de 2 a 4, solo compu): coop = jugadores pedidos al largar (1 = solo); los jugadores viven en `players` (R6a)
let coop = 1, spawnN = 0;
/** Compañeros con auto (los caídos esperan el próximo escenario); su orden es el de los índices `who` 1.. de los eventos. */
const liveM = () => others().filter((m) => m.car);
let encExtra = 0, encG = 0; // R5: tornillos extra de pactos y rutas ya liquidados, y los brutos de la run al liquidarlos (se liquida al cambiar el efecto, no al morir)
/** Tornillos brutos de la run: partida + tiempo + bajas (sin maldiciones ni pactos). */
const grossScrap = () => runScrap + Math.floor((time + encPrior) / R.tornillos_div_tiempo) + Math.floor(kills * TOUGH.xp / R.tornillos_div_bajas);
const zoneFor = (d: boolean) => d ? "patio" : encore ? "luna" : (import.meta.env.DEV && new URLSearchParams(location.search).get("zone")) || save.zone;
function startRun(d = false) {
  daily = d;
  initAudio(); music("run", 0); musicS = "run";
  menuOff(); // ?lab arranca desde el título
  clearRun();
  // Semilla de la partida: ?seed=N la fija (reproducible), si no, una nueva
  // Zona: el diario siempre en el patio; ?zone=garaje|jardin (solo dev) la fuerza. Se arma antes de sembrar: no toca la semilla.
  setZone(zoneFor(daily)); // ya armado por la precarga (tarea "patio") salvo que cambie la zona o el tope de texturas
  setMoon(zoneId === "luna");
  runSeed = forceSeed || netSeed || Number(new URLSearchParams(location.search).get("seed")) || (daily ? dailySeed() : newSeed());
  seedRng(runSeed);
  // Perfil de la partida: clima, plaga, orden de minijefes, ritmo de eventos y un patio distinto
  profile = makeProfile(runSeed);
  profile.climate = zoneClimate() ?? profile.climate; // interior (garaje): luz fija
  if (MOON.on) profile.rainAt = Infinity; // en la luna no llueve
  cycleS = -1;
  buildLayout();
  RUN_BOSSES = [[R.jefe1_s, profile.minis[0]], [R.jefe2_s, profile.minis[1]], [R.jefe_final_s, MOON.on ? "gusano" : profile.final]]; // luna: el jefe final es el gusano lunar (moon_worm.ts)
  finalKind = RUN_BOSSES[RUN_BOSSES.length - 1][1]; // jefe final: vencerlo gana la partida
  // ponytail: maldiciones ocultas por ahora (decisión del usuario); volver a `daily ? [] : save.curses` y mostrar #curseBtn para reactivarlas
  const curses: typeof save.curses = [];
  horde = curses.includes("horda") ? R.maldicion_horda : 1; noRepair = curses.includes("sinrep"); curseK = 1 + R.maldicion_tornillos * curses.length;
  endless = false; bank = null;
  abil = save.ability; abilLv = save.abilLv[abil] ?? 0; abilCd = abilOn = bombs = 0; worldK = 1; shieldM = null;
  driveMul = 1; driftT = airT = trickT = 0; jumpCd = 0; boostSec = 0; motorFxT = 0; hudDrive(1);
  lead.car = new Car(scene, save.car, carOpts());
  lastHpFrac = 1;
  passives = {};
  bestStreak = bestHit = bossKills = 0; bestDriveMul = 1;
  setScoop(save.car === "helado"); setEngineKind(save.car);
  weapons = startWeapons(save.pilot, save.perm.extra, startPick()).map(makeWeapon);
  if (save.car === "helado" && !weapons.some((w) => w.id === "gomitas")) weapons.unshift(makeWeapon("gomitas")); // arma de partida del camión: bochas de helado
  jingleT = 2;
  rerolls = save.perm.reroll; revives = save.perm.revive;
  lead.maxHp = lead.car.def.hp;
  recompute();
  lead.hp = lead.maxHp; lead.boost = 100;
  xp = 0; level = 1; pendingLevels = 0;
  time = 0; kills = 0; runScrap = 0; runDist = 0; runAch = []; hitAt = 0;
  spawnAcc = 0; groupT = 0; swarmT = R.enjambre_primero_base + profile.swarmEvery * R.enjambre_primero_mult; chestT = profile.chestEvery; ballT = profile.ballEvery; bossIdx = 0; wasGrounded = true; coyoteT = 0; apagon = false;
  dirq = E.newDirQ(); ovT = 0; guestE = null; dirSub(null); saidSecrets = [];
  if (encore && MOON.on) { erun = E.newRun(runSeed); GOAL_IO.tele = true; shopReset(); encPlan(); encScene(true); }
  if (erun && coop > 1) mateStart(coop); // R7a/c: de 2 a 4 jugadores en pantalla dividida (solo compu)
  camYaw = 0; dynK = 1; ts = 1; outroZ = 1; outroAt = null; fxSpeed(1); camH.set(0, 0, 1); camUp.set(0, 1, 0);
  state = "play";
  scene.physicsEnabled = true;
  reset(null);
  $("levelup").classList.add("hidden");
  for (const k in dmgOut) delete dmgOut[k];
  for (const k in dmgBy) delete dmgBy[k];
  $("hud").classList.remove("hidden");
  hudBoss(null);
  hudWorkshop(save.perm);
  if (erun) { say("start"); const h = E.hint(erun); if (h) say("hint", h); } else banner(`${profile.climate.name} · ${profile.plague.name}`, 3);
  // Guía de controles los primeros segundos (se va sola)
  const hint = $("hint");
  for (const k of hint.querySelectorAll<HTMLElement>("kbd[data-k]")) k.textContent = keyName(KEYS[k.dataset.k as keyof typeof KEYS][0]); // teclas reasignadas
  hint.classList.toggle("coop", players.length > 1 && !net); // R7b: con 2 jugadores, sobre la línea divisoria (no tapa la mitad de abajo) y con las teclas del J2
  if (players.length > 1 && !net) { const kb = (c: string) => `<kbd>${keyName(c)}</kbd>`, k2 = RACE.kb2; $("hintJ2").innerHTML = coopCtl() === "kbd2" ? `J2 ${kb(k2.up[0])}${kb(k2.down[0])}${kb(k2.left[0])}${kb(k2.right[0])} manejo · ${kb(k2.item[0])} turbo · ${kb(k2.drift[0])} derrape · ${kb(KEYS2.jump[0])} salto · ${kb(KEYS2.ability[0])} habilidad` : `J2 segundo joystick · ${btnName(pb("jump"))} salto · ${btnName(pb("ability"))} habilidad`; if (coop > 2) $("hintJ2").innerHTML += ` · ${coop === 3 ? "J3 tercer joystick" : "J3 y J4 tercer y cuarto joystick"}`; }
  if (save.hint) hint.classList.remove("hidden", "fade"); else hint.classList.add("hidden");
  hintOn = save.hint; // se apaga en update() con la primera entrada o a los HINT_S de partida
}
let hintOn = false;
const HINT_S = 7;

// ---------- ENCORE (encore.ts): escenarios encadenados con teleportador, votación y FINAL ACT ----------
/** Frase del Director por el aviso de radio. */
const say = (id: E.LineId, txt = E.line(id, erun!, save.encore)) => E.dirPush(dirq, txt, E.dirPri(id)); // cola propia (encore.ts): no se pisa con la radio ni entre frases
/** Agenda del escenario según la fase: un minijefe (nave); en la votación y el FINAL ACT, arena vacía donde solo entra el jefe. */
function encPlan() {
  const r = erun!, calm = r.phase === "vote" || r.phase === "final";
  finalKind = E.finalOf(r.seed); // R5: jefe secreto sorteado por la semilla de la run; en ENCORE solo el jefe del FINAL ACT cierra la partida (el gusano lunar no sale)
  RUN_BOSSES = r.phase === "final" ? [[E.ENC.bossIntroS, finalKind]] : calm ? [] : [[E.ENC.miniS, profile.minis[0]]];
  if (calm) { swarmT = chestT = ballT = Infinity; profile.elites = []; }
}
/** Escenario nuevo con el mismo auto, armas, nivel, XP y vida: borra lo del anterior y lo rearma con la semilla derivada (runSeed, escenario). */
function encEnter() {
  const r = erun!;
  guestE = null; ovT = 0;
  evReset(); shipsClear(); goalsClear(); skyClear();
  for (const e of enemies) { e.hp = -1e9; e.dispose(); } // hp negativo: las armas con blanco fijo (trompo) lo sueltan
  for (const g of gems) g.m.dispose();
  for (const p of pickups) p.m.dispose();
  for (const sp of spits) sp.m.dispose();
  if (ball) { ball.agg.dispose(); ball.m.dispose(); ball = null; }
  enemies = []; gems = []; pickups = []; spits = [];
  clearFx();
  evtPre = { swarm: false, ball: false, rain: false, elites: new Set(), boss: new Set() };
  apagon = false;
  hudBoss(null);
  const z = E.zoneOf(r); // Contenido 3: un escenario por vuelta (desde la segunda) en una zona plana; auto, armas y XP siguen igual
  if (z !== zoneId) { setZone(z, false); setMoon(z === "luna"); cycleS = -1; }
  GOAL_IO.half = MOON.on ? 0 : HALF; // teleportador y cofres dentro del patio
  encPrior += time; time = 0; hitAt = 0;
  runSeed = E.stageSeed(r.seed, r.loop, E.sceneIdx(r));
  seedRng(runSeed);
  profile = makeProfile(runSeed);
  profile.rainAt = Infinity; // en la luna no llueve
  buildLayout(); // luna: vuelve a como la armó el mundo (sin cráteres)
  encScene(); // variante: cráteres extra, ritmo de eventos y llegada del auto (encore.ts)
  paceS = E.paceOf(r);
  spawnAcc = groupT = 0; swarmT = R.enjambre_primero_base + profile.swarmEvery * R.enjambre_primero_mult; chestT = profile.chestEvery; ballT = profile.ballEvery; bossIdx = 0;
  encPlan();
  recompute(); // pactos vencidos al salir del escenario anterior
  others().forEach(mateRevive); // R7a: los caídos vuelven en el escenario nuevo, junto al que guía
  shake = Math.max(shake, 1.2);
}
/** Punto del piso de la luna en la dirección d (unitaria, desde el centro). */
const moonPt = (d: B.Vector3, lift = 0) => onFloor(d.scale(MOON.R).addInPlace(new B.Vector3(0, -MOON.R, 0)), lift);
/** Lleva el auto (quieto) a la dirección d de la luna, mirando hacia aim, y recoloca la cámara detrás. */
const moonPlace = (d: B.Vector3, aim: B.Vector3) => carPlace(moonPt(d, lead.car!.def.size[1] / 2 + 0.3), aim);
/** Lleva el auto (quieto) al punto p, mirando hacia aim (luna o zona plana), y recoloca la cámara detrás. */
function carPlace(p: B.Vector3, aim: B.Vector3) {
  const c = lead.car!;
  c.root.position.copyFrom(p); c.root.rotationQuaternion = alignYaw(p, yawOf(aim, p));
  c.body.setLinearVelocity(B.Vector3.Zero()); c.body.setAngularVelocity(B.Vector3.Zero());
  moonCar(c.body, upAt(p));
  teleport(c.body);
  camH.copyFrom(hflat(aim.clone(), p).normalize()); camUp.copyFrom(upAt(p)); camYaw = yawOf(camH, p);
  cam.position.copyFrom(p).addInPlace(camH.scale(-15)).addInPlace(camUp.scale(13)); camTarget.copyFrom(p);
  return p;
}
// Llegada de cada variante (E.Variant.at): dirección del lugar y hacia dónde mira el auto. Las mismas que __luna.go.
const ARRIVE: Record<E.Variant["at"], [B.Vector3, B.Vector3]> = {
  salida: [B.Vector3.Up(), new B.Vector3(0, 0, 1)],
  oscuro: [SUN_DIR.scale(-1).addInPlace(new B.Vector3(0.25, 0.2, 0)).normalize(), SUN_DIR], // de espaldas al Sol, mirando hacia la luz
  tierra: [new B.Vector3(0, 1, 0).addInPlace(EARTH_DIR.scale(-0.66)).normalize(), EARTH_DIR],
  sol: [SUN_DIR.add(B.Vector3.Up()).normalize(), SUN_DIR],
};
/** Variante del escenario (encore.ts): ritmo de eventos, cráteres extra alrededor de la llegada y, salvo el primer escenario (ya está en su lugar), llegada del auto. */
function encScene(first = false) {
  const v = E.variantOf(erun!);
  if (!MOON.on) { // Contenido 3: escenario terrestre: llegada al centro de la zona (donde arranca la Supervivencia), sin cráteres ni eventos lunares
    const c0 = new B.Vector3(0, 0, 0);
    shopPlan(erun!.seed, E.sceneIdx(erun!), c0);
    carPlace(new B.Vector3(0, lead.car!.def.size[1] / 2 + 0.3, 0), new B.Vector3(0, 0, 1));
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
function finalArena() {
  const [d, aim] = ARRIVE.salida, c0 = moonPt(d), a = E.arenaPlan(erun!);
  for (const k of a.craters) deform(ringAt(c0, k.a, k.d, 0), k.r, k.r * 0.28);
  spotsPlan(c0, a.spots); evShow(true); evPace(E.ARENA.rain); skyPace(E.ARENA.sky);
  moonPlace(d, aim);
}
/** Minijefe i-ésimo de la luna: el de la variante o, sin ella, el que elige la semilla. */
const minorShip = (i: number) => (erun && E.variantOf(erun)?.ship) || shipFor(i, runSeed);
/** Aplica lo que pasó en la expedición: efectos en el mundo y frase del Director. */
function encApply(ev: E.Ev | null) {
  if (!ev || !erun) return;
  if (ev === "tele_land") rocketLand(lead.car!.pos, true); // el cohete de moon_goals.ts hace de teleportador; el aviso es el del Director
  else if (ev === "advance" || ev === "encore" || ev === "vote" || ev === "final_act") encEnter(); // pact_* y route_offer no cargan nada: el escenario nuevo llega al elegir destino ("advance")
  if (ev === "pact_yes") { recompute(); const p = E.pactOf(erun.pacts[erun.pacts.length - 1].id); if (p.gain.heal) for (const m of players) if (m.car) m.hp = Math.min(lead.maxHp, m.hp + lead.maxHp * p.gain.heal); } // el pacto ya está en `pfx` (encEnter → recompute); falta la cura instantánea
  const pact = ev === "pact_yes" || ev === "pact_no", v = ev === "advance" || ev === "encore" ? E.variantOf(erun) : null; // al llegar a un escenario nuevo, el Director anuncia su variante en vez de la frase suelta
  if (ev === "overload") ovT = 0; // el primer enjambre de la carga sale ya
  if (ev === "guest") { const g = erun.guest!, c = lead.car!; spawnEnemy(g, spawnPoint(c.pos, 30, 36)); guestE = enemies[enemies.length - 1]; hudBoss(DEF[g].name, 1, g); SFX.boss(); }
  if (pact) { say(ev); if (erun.phase === "route") say("route_offer"); } // la respuesta al trato y, enseguida, la oferta de destinos
  const z = E.zoneOf(erun);
  if (v) say("advance", z !== "luna" ? E.EARTH[z].join(". ") : `${v.name}. ${v.line}`); // Contenido 3: el escenario terrestre se presenta como escenografía
  encSecrets();
  if (ev === "advance" || ev === "encore") { const h = E.hint(erun); if (h) say("hint", h); } // R5: pista del jefe secreto de este escenario
  else if (!pact) say(ev);
}
/** Contenido 3: secretos recién descubiertos en la run: el Director suelta el fragmento (se guardan al terminar, endRun). */
let saidSecrets: string[] = [];
function encSecrets() {
  if (!erun) return;
  for (const id of erun.found) if (!saidSecrets.includes(id)) { saidSecrets.push(id); E.dirPush(dirq, E.secretLine(erun, id), 4); }
}
const encPick = (i: 0 | 1 | 2) => { if (state === "play" && erun) encApply(E.pick(erun, i)); };
// R6a: toda decisión de un jugador entra por acá (la costura para la red: el anfitrión aplicará los comandos de cada participante).
// Hoy los menús y botones son locales y las mandan como el que guía; la compra en la máquina, como quien la activó.
type Cmd = { k: "card"; i: number } | { k: "reroll" } | { k: "enc"; i: 0 | 1 | 2 } | { k: "buy"; scrap: number; hpFrac: number };
function applyCommand(playerId: number, cmd: Cmd) {
  if (net && !net.host) { if (cmd.k !== "buy") { net.send({ t: "c", c: cmd }, true); if (cmd.k === "enc") banner("VOTO ENVIADO", 1.2); } return; } // R6b: el cliente no decide, le pide al anfitrión
  const p = players.find((x) => x.id === playerId) ?? lead;
  if ((cmd.k === "card" || cmd.k === "reroll") && net?.host && p.id !== cardBy) return; // R6c: online elige las cartas uno por vez (cardBy)
  if (cmd.k === "card") choose(cmd.i, p); // cartas: compartidas; la reparación cura a quien elige
  else if (cmd.k === "reroll") reroll();
  else if (cmd.k === "enc") encVote(p.id, cmd.i); // pactos, rutas y votos del teleportador (encore.ts pick)
  else { runScrap -= cmd.scrap; p.hp -= p.hp * cmd.hpFrac; } // máquina de opciones: tornillos y vida de quien compra
}
/** R6c: online de 2 cada decisión del teleportador es un voto; con los dos votos gana el del anfitrión (J1): coincidir o empatar da lo mismo.
 *  Si el cliente no vota, decide el reloj de la ventana (encore.ts tick), como en solitario. Sin red o sin J2 decide el primero que vota. */
const votes = new Map<number, 0 | 1 | 2>();
let voteKey = "";
function encVote(id: number, i: 0 | 1 | 2) {
  const host = players[0].id, mate = players.find((x) => x.id !== host);
  if (!net?.host || !mate) { votes.clear(); encPick(i); return; }
  const k = erun ? `${erun.phase}:${erun.loop}:${erun.stage}:${erun.stays}` : "";
  if (k !== voteKey) { votes.clear(); voteKey = k; } // otra ventana: los votos viejos no cuentan
  votes.set(id, i);
  if (votes.size < 2) { banner(`VOTO J${id} · FALTA J${id === host ? mate.id : host}`, 1.5); return; }
  const v = votes.get(host)!; votes.clear(); encPick(v);
}
/** Jugador de un índice `who` de los eventos (0 = el que guía, 1.. = compañeros vivos). */
const whoP = (who = 0) => (who && liveM()[who - 1]) || lead;
$("encA").onpointerdown = (ev) => { ev.preventDefault(); applyCommand(lead.id, { k: "enc", i: 0 }); }; // pointerdown + sin foco: Espacio (turbo) no vuelve a apretar el botón
$("encB").onpointerdown = (ev) => { ev.preventDefault(); applyCommand(lead.id, { k: "enc", i: 1 }); };
$("encC").onpointerdown = (ev) => { ev.preventDefault(); applyCommand(lead.id, { k: "enc", i: 2 }); }; // RECHAZAR (solo en la oferta de pactos)

// ---------- R6b: ENCORE online de 2 (net.ts, docs/ENCORE/R0/R6_RED.md opción A) ----------
// Anfitrión = J1 y simula todo; el input del cliente mueve a players[1] como un control local y sus comandos pasan por applyCommand.
// Cliente = J2: no simula (state "net", física apagada); dibuja autos y bichos de los snapshots con 100 ms de interpolación y su cámara sigue a su auto.
// ponytail: sin compensar latencia ni predecir el auto propio (R6c): el cliente ve su auto con RTT/2 + 100 ms de retraso.
// ponytail: sin rejoin (R6d): si se corta, el anfitrión sigue solo y el cliente vuelve al menú.
// ponytail: el cliente no replica gemas ni efectos; proyectiles aproximados y cartas por turnos (R6c); ve los autos con el modelo de su propio garaje.
let net: Net | null = null, netSeed = 0, netT = 0;
const NET_HZ = 15, NET_DELAY = 100;
let netIn = { ...NO_IN };
const q1 = (n: number) => Math.round(n * 10) / 10, q2 = (n: number) => Math.round(n * 100) / 100, q3 = (n: number) => Math.round(n * 1000) / 1000;
const quatOf = (n: B.TransformNode) => n.rotationQuaternion ?? B.Quaternion.FromEulerVector(n.rotation);
const netIds = new WeakMap<Enemy, number>();
let netNext = 1;
type PSnap = [number, ...number[]]; // [id] = caído; [id, x, y, z, qx, qy, qz, qw, vx, vy, vz, hp, maxHp]
type ESnap = [number, Kind, number, number, number, number, number, number, number, number, number]; // id, tipo, pos, quat, vida, vida máx.
type Snap = { T: number; z: string; xp: number; lv: number; sc: number; run: E.Run | null; p: PSnap[]; e: ESnap[]; j: number[]; w: number[] }; // j/w: proyectiles de bichos y de armas, [x, y, z] planos a 0,1 m
const NET_PROJ = 60; // tope por tipo de proyectil y snapshot (los más allá del radio no van)
let netBytes = 0; // solo dev: bytes de snapshot enviados (JSON), para medir kB/s en test:net
/** Proyectiles de armas (aproximado): todo arreglo de un arma con { m: InstancedMesh } (balas, trompos, olas...). */
function weaponShots(out: number[], near: (v: B.Vector3) => boolean) {
  for (const w of [...weapons, ...players.flatMap((m) => (m === lead ? [] : m.weapons))])
    for (const v of Object.values(w)) if (Array.isArray(v)) for (const o of v) {
      if (out.length >= NET_PROJ * 3) return;
      const m = (o as { m?: unknown })?.m;
      if (m instanceof B.InstancedMesh && m.isEnabled() && near(m.position)) out.push(q1(m.position.x), q1(m.position.y), q1(m.position.z));
    }
}
function netSnap() {
  const c2 = players[1]?.car?.pos ?? lead.car?.pos, R2 = 70 * 70, e: ESnap[] = [];
  for (const en of enemies) {
    if (e.length >= 120 || !c2 || B.Vector3.DistanceSquared(en.pos, c2) > R2) continue; // solo lo que el cliente puede ver cerca de su auto
    let id = netIds.get(en); if (!id) netIds.set(en, (id = netNext++));
    const q = quatOf(en.node);
    e.push([id, en.kind, q2(en.pos.x), q2(en.pos.y), q2(en.pos.z), q3(q.x), q3(q.y), q3(q.z), q3(q.w), Math.ceil(en.hp), Math.ceil(en.maxHp)]);
  }
  const p = players.map((pl): PSnap => {
    const c = pl.car; if (!c) return [pl.id];
    const q = quatOf(c.root), v = c.body.getLinearVelocity();
    return [pl.id, q2(c.pos.x), q2(c.pos.y), q2(c.pos.z), q3(q.x), q3(q.y), q3(q.z), q3(q.w), q2(v.x), q2(v.y), q2(v.z), Math.ceil(pl.hp), pl.maxHp];
  });
  const near = (v: B.Vector3) => !!c2 && B.Vector3.DistanceSquared(v, c2) <= R2, j: number[] = [], w: number[] = [];
  for (const sp of spits) if (j.length < NET_PROJ * 3 && near(sp.m.position)) j.push(q1(sp.m.position.x), q1(sp.m.position.y), q1(sp.m.position.z));
  weaponShots(w, near);
  const msg = { t: "s", s: { T: q2(time), z: zoneId, xp, lv: level, sc: runScrap, run: erun, p, e, j, w } satisfies Snap };
  if (import.meta.env.DEV) netBytes += JSON.stringify(msg).length;
  net!.send(msg);
}
const bool = (v: unknown) => v === true;
const axis = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0);
/** Mensajes del cliente al anfitrión: se validan (frontera de confianza). */
function netHostMsg(m: Msg) {
  if (m.t === "i" && m.i && typeof m.i === "object") {
    const i = m.i as Record<string, unknown>;
    netIn = { throttle: axis(i.throttle), steer: axis(i.steer), moveX: axis(i.moveX), moveY: axis(i.moveY), boost: bool(i.boost), drift: bool(i.drift), ability: bool(i.ability), jump: bool(i.jump), move: bool(i.move) };
  } else if (m.t === "c" && players[1]) { // R6c: votos del teleportador, cartas (en su turno) y re-sorteo; las compras siguen del anfitrión
    const c = m.c as Cmd;
    if (c?.k === "enc" && (c.i === 0 || c.i === 1 || c.i === 2)) applyCommand(players[1].id, { k: "enc", i: c.i });
    else if (c?.k === "card" && Number.isInteger(c.i) && c.i >= 0 && c.i < offers.length && state === "level") applyCommand(players[1].id, { k: "card", i: c.i });
    else if (c?.k === "reroll") applyCommand(players[1].id, { k: "reroll" });
  }
}
const netBuf: { at: number; s: Snap; e: Map<number, ESnap> }[] = [];
const netE = new Map<number, Enemy>();
let netLv = false; // cliente: cartas a la vista (las elige quien diga el anfitrión)
let cardBy = 1, cardTurn = 0; // R6c: id de quien elige las cartas abiertas; online se alterna en cada oferta (nivel o cofre), empieza el anfitrión
// Proyectiles en el cliente: un pool de instancias por tipo, sin interpolar (aproximado, 15 Hz).
const netShotTpl = () => template("netshot", () => [sph(0.35, pbr("netshot", { color: "#ffd23f", emissive: "#a07000" }), [0, 0, 0])]);
const netPools: Record<"j" | "w", B.InstancedMesh[]> = { j: [], w: [] };
function netShots(k: "j" | "w", xs: number[] = []) {
  const pool = netPools[k], n = Math.min(xs.length / 3, NET_PROJ);
  while (pool.length < n) pool.push((k === "j" ? spitTpl() : netShotTpl()).createInstance("ns" + k));
  pool.forEach((m, i) => { m.setEnabled(i < n); if (i < n) m.position.set(xs[i * 3], xs[i * 3 + 1], xs[i * 3 + 2]); });
}
function netClientMsg(m: Msg) {
  if (m.t === "go" && typeof m.seed === "number") { netSeed = m.seed; launchRun(false, true, 2, netClientBegin); }
  else if (m.t === "s") { const s = m.s as Snap; netBuf.push({ at: performance.now(), s, e: new Map(s.e.map((x) => [x[0], x])) }); if (netBuf.length > 8) netBuf.shift(); }
  else if (m.t === "end") { netEnd(); netBack("La partida terminó en el anfitrión."); }
  else if (m.t === "lv" && Array.isArray(m.o) && state === "net") { // R6c: cartas abiertas en el anfitrión; elige el cliente si by es su id
    const list = m.o as Offer[], mine = m.by === lead.id, title = String(m.title);
    offers = list; offerSel = 0; netLv = true;
    const show = () => showOffers(title, list, 0, (i) => (mine ? applyCommand(lead.id, { k: "card", i }) : show()), undefined, mine ? `Turno de elegir: J${lead.id}` : `Elige J${m.by}`);
    show(); SFX.levelUp();
  } else if (m.t === "lvx") { netLv = false; $("levelup").classList.add("hidden"); }
}
/** Cliente: ya armada la run con la semilla del anfitrión, pasa a dibujar lo que llega. J2 guía la cámara principal. */
function netClientBegin() {
  const [j1, j2] = players;
  [j1.cam, j2.cam] = [j2.cam, j1.cam]; lead = j2;
  for (const w of weapons) w.dispose(); weapons = []; // las armas son del anfitrión
  state = "net"; scene.physicsEnabled = false; netBuf.length = 0;
}
const _nq = new B.Quaternion(), _nv = new B.Vector3();
function netClientTick() {
  if (net) net.send({ t: "i", i: { ...input } }); // input del cliente cada cuadro, canal no fiable
  if (!netBuf.length) return;
  const rt = performance.now() - NET_DELAY;
  let i = netBuf.length - 1; while (i > 0 && netBuf[i - 1].at > rt) i--;
  const b = netBuf[i], a = netBuf[Math.max(0, i - 1)], k = b === a || b.at === a.at ? 1 : Math.max(0, Math.min(1, (rt - a.at) / (b.at - a.at))), ext = b.at < rt ? Math.min(0.2, (rt - b.at) / 1000) : 0;
  const s = b.s;
  time = s.T; xp = s.xp; level = s.lv; runScrap = s.sc;
  if (s.z !== zoneId && s.z in ZONES) { setZone(s.z); setMoon(s.z === "luna"); cycleS = -1; } // Contenido 3: el anfitrión cambió de zona (escenario terrestre o vuelta a la luna)
  if (s.run) { erun = s.run; for (const p of erun.pacts) p.left ??= Infinity; } // JSON: Infinity llega como null
  for (const ps of s.p) {
    const pl = players.find((x) => x.id === ps[0]), c = pl?.car; if (!pl || !c) continue;
    c.root.setEnabled(ps.length > 1);
    if (ps.length === 1) { pl.hp = 0; continue; }
    const pa = a.s.p.find((x) => x[0] === ps[0]), A = pa && pa.length > 1 ? pa : ps;
    B.Vector3.LerpToRef(_nv.set(A[1], A[2], A[3]), new B.Vector3(ps[1], ps[2], ps[3]), k, c.root.position);
    c.root.position.addInPlaceFromFloats(ps[8] * ext, ps[9] * ext, ps[10] * ext); // sin snapshot nuevo: sigue con su velocidad un rato
    B.Quaternion.SlerpToRef(_nq.set(A[4], A[5], A[6], A[7]), new B.Quaternion(ps[4], ps[5], ps[6], ps[7]), k, (c.root.rotationQuaternion ??= new B.Quaternion()));
    pl.hp = ps[11]; pl.maxHp = ps[12];
  }
  for (const [id, en] of netE) if (!b.e.has(id)) { en.dispose(); netE.delete(id); }
  for (const [id, x] of b.e) {
    let en = netE.get(id);
    if (!en || en.kind !== x[1]) { en?.dispose(); en = new Enemy(x[1], new B.Vector3(x[2], x[3], x[4]), 1); netE.set(id, en); }
    const y = a.e.get(id) ?? x;
    B.Vector3.LerpToRef(_nv.set(y[2], y[3], y[4]), new B.Vector3(x[2], x[3], x[4]), k, en.node.position);
    B.Quaternion.SlerpToRef(_nq.set(y[5], y[6], y[7], y[8]), new B.Quaternion(x[5], x[6], x[7], x[8]), k, (en.node.rotationQuaternion ??= new B.Quaternion()));
    en.hp = x[9]; en.maxHp = x[10];
    en.animate(engine.getDeltaTime() / 1000);
  }
  enemies = [...netE.values()]; // radar y flechas del HUD
  netShots("j", s.j); netShots("w", s.w);
}
/** Cierra la conexión (sin avisar a nadie). Los bichos de muestra del cliente se van con clearRun (están en `enemies`). */
function netEnd() {
  const n = net; net = null; netSeed = 0; netE.clear(); netBuf.length = 0; netLv = false;
  for (const k of ["j", "w"] as const) { for (const m of netPools[k]) m.dispose(); netPools[k] = []; }
  n?.close();
}
function netStatus(t: string) { $("netStatus").textContent = t; }
/** Cliente: vuelve a la pantalla de ENCORE con el aviso. */
function netBack(why: string) {
  if (state !== "menu") toMenu();
  reset("encore"); netStatus(why);
}
async function netHost() {
  netEnd(); netStatus("Creando sala…");
  try {
    const n = (net = await (await import("./net")).hostRoom((code) => netStatus(`Sala ${code} · esperando al otro jugador`)));
    n.onMsg = netHostMsg;
    n.onClose = (why) => {
      if (net !== n) return;
      if (state === "menu") { netStatus(why); net = null; return; }
      mateClear(); net = null; banner("J2 DESCONECTADO · SE SIGUE EN SOLITARIO", 3); // el anfitrión sigue jugando solo
      if (state === "level" && cardBy !== players[0].id) { cardBy = players[0].id; openOffers(offers, offerTitle, true); } // le tocaba al J2: elige el anfitrión
    };
    await n.ready;
    if (net !== n) return;
    const seed = newSeed(); netSeed = seed;
    n.send({ t: "go", seed }, true);
    netStatus(`Sala ${n.code} · conectado`);
    launchRun(false, true, 2);
  } catch (e) { netStatus(`No se pudo crear la sala (${(e as Error).message}).`); net = null; }
}
async function netJoin() {
  const code = (await import("./net")).cleanCode(($("netCode") as HTMLInputElement).value);
  if (code.length !== 6) { netStatus("El código tiene 6 caracteres."); return; }
  netEnd(); netStatus(`Conectando a ${code}…`);
  const n = (net = await (await import("./net")).joinRoom(code));
  n.onMsg = netClientMsg;
  n.onClose = (why) => { if (net !== n) return; netEnd(); netBack(why); };
  await n.ready;
  if (net === n) netStatus(`Conectado a ${code} · esperando la largada`);
}
// R6c: login del servidor propio (solo con VITE_NET_HOST): vuelve con #token=... y queda en localStorage
if (NET_HOST) {
  if (takeToken()) netStatus("Sesión iniciada.");
  const b = $("netLogin"); b.classList.remove("hidden"); if (getToken()) b.textContent = "Sesión iniciada · volver a entrar";
  b.onclick = () => location.assign(loginUrl());
  if (LOGIN_URL) { const c = $("netCfLogin"); c.classList.remove("hidden"); c.onclick = () => location.assign(cfLoginUrl()); } // opción principal; GitHub y clave quedan de alternativa
  const sess = () => { const on = !!getToken(); $("netSession").textContent = on ? "Sesión iniciada" : "Sin sesión"; $("netLogout").classList.toggle("hidden", !on); };
  $("netKeyBox").classList.remove("hidden"); sess();
  $("netKeyGo").onclick = async () => {
    const k = $("netKey") as HTMLInputElement;
    if (!k.value.trim()) { netStatus("Escribir la clave de grupo."); return; }
    try { await loginKey(k.value.trim()); k.value = ""; netStatus("Sesión iniciada."); } catch (e) { netStatus((e as Error).message); }
    sess();
  };
  $("netLogout").onclick = () => { setToken(""); netStatus("Sesión cerrada."); sess(); };
}
$("netHost").onclick = () => void netHost();
$("netJoin").onclick = () => void netJoin();

// ---------- R7a/c: ENCORE de 2 a 4 en compu, pantalla dividida (2: arriba J1 / abajo J2; 3-4: 2x2 J1 J2 / J3 J4) ----------
// `lead` (el que guía) usa `input`, la cámara `cam` y las armas de verdad; los demás de `players` usan su `in`, su cámara y copias de las armas. Si cae el que guía, el primer compañero vivo pasa a guiar (mateLead) y nada más del juego cambia.
// ponytail: XP, nivel, armas, pasivas, tornillos, combo de manejo y el enfriamiento de la habilidad son compartidos (R7b: cualquiera la dispara desde su auto)
const TOP = new B.Viewport(0, 0.5, 1, 0.5), BOTTOM = new B.Viewport(0, 0, 1, 0.5), _camM2 = new B.Matrix();
const QUAD = [new B.Viewport(0, 0.5, 0.5, 0.5), new B.Viewport(0.5, 0.5, 0.5, 0.5), new B.Viewport(0, 0, 0.5, 0.5), new B.Viewport(0.5, 0, 0.5, 0.5)];
const vpOf = (pn: number) => (coop === 2 ? (pn === 1 ? TOP : BOTTOM) : QUAD[pn - 1]); // cada jugador conserva su cuadro aunque pase a guiar
const mateColor = (pn: number) => pn === 3 ? "#2ea043" : pn === 4 ? "#e8e8e8" : (save.paint || "").toLowerCase() === "#1f6feb" ? "#f2c230" : "#1f6feb"; // otro color por jugador para distinguirlos
function mateCar(m: Player) {
  m.car = new Car(scene, save.car, { ...carOpts(), paint: mateColor(m.id) });
  m.hp = m.maxHp = lead.maxHp; m.boost = 100; m.fs = 0; m.touch = 0; m.jumpCd = m.coyote = 0; m.sig = "";
  m.car.setMass(m.car.def.mass * st.mass);
  mateArm(m);
}
function mateStart(n: number) {
  spawnN = 0;
  for (let pn = 2; pn <= n; pn++) {
    const c2 = new B.FreeCamera(`cam${pn}`, cam.position.clone(), scene);
    c2.minZ = cam.minZ; c2.maxZ = cam.maxZ;
    const m = newPlayer(pn, c2);
    players.push(m);
    mateCar(m); matePlace(m); if (!net) setSplit(c2, true); // una sola vez por cámara: addCamera dos veces reusa el postproceso
  }
  mateViews();
  if (n > 2) setDrawDist(G.draw); // R7c: setSplit bajó el detalle (render.ts quadK); la distancia de dibujo se aplica sobre el mundo ya armado
}
/** Viewports por jugador (vpOf); las cámaras extra comparten el postproceso (setSplit, como la carrera). */
function mateViews() {
  if (net) { scene.activeCameras = null; scene.activeCamera = cam; return; } // R6b: online cada uno ve solo su auto, pantalla entera
  for (const p of players) p.cam.viewport = vpOf(p.id); // lead.cam === cam
  scene.activeCameras = [cam, ...others().map((m) => m.cam)];
}
/** Fin de la partida: queda solo J1 (con el auto y la cámara del que guiaba, que clearRun desarma). */
function mateClear() {
  if (players.length === 1) return;
  const quad = players.length > 2, j1 = players[0];
  for (const m of others()) {
    for (const w of m.weapons) w.dispose();
    m.car?.dispose();
    if (scene.activeCameras?.includes(m.cam)) setSplit(m.cam, false); // solo las de pantalla dividida (online no se suman)
    m.cam.dispose();
  }
  if (lead !== j1) { j1.car = lead.car; j1.hp = lead.hp; j1.maxHp = lead.maxHp; j1.boost = lead.boost; }
  j1.cam = cam; j1.in = input; j1.weapons = []; j1.sig = "";
  players.length = 1; lead = j1;
  cam.viewport = new B.Viewport(0, 0, 1, 1); scene.activeCameras = null; scene.activeCamera = cam;
  if (quad) setDrawDist(G.draw);
}
/** Cada compañero junto al que guía (4 m a su derecha; el J3 a la izquierda y el J4 a 8 m), quieto y mirando para el mismo lado; la cámara detrás. */
function matePlace(m: Player) {
  const c = m.car!, p = onFloor(at(lead.car!.pos, [4, -4, 8][others().indexOf(m)] ?? 4, 0, 0), c.def.size[1] / 2 + 0.3);
  c.root.position.copyFrom(p); c.root.rotationQuaternion = alignYaw(p, yawOf(lead.car!.root.forward, lead.car!.pos));
  c.body.setLinearVelocity(B.Vector3.Zero()); c.body.setAngularVelocity(B.Vector3.Zero());
  moonCar(c.body, upAt(p)); teleport(c.body);
  const f = flatL(lead.car!.root.forward, lead.car!.pos);
  m.up.copyFrom(upAt(p)); m.h.copyFrom(W(f.x, 0, f.z, p).normalize());
  m.cam.position.copyFrom(p).addInPlace(m.h.scale(-15)).addInPlace(m.up.scale(13)); m.tgt.copyFrom(p);
}
/** Copias de las armas del que guía, montadas en el auto del compañero (se rehacen solo si cambió algo). */
function mateArm(m: Player) {
  const sig = weapons.map((w) => w.id + w.lv + (w.evolved ? "E" : "")).join();
  if (!m.car || sig === m.sig) return;
  for (const w of m.weapons) { w.dispose(); w.mount?.dispose(); }
  m.weapons = weapons.map((w) => { const x = makeWeapon(w.id); x.lv = w.lv; x.evolved = w.evolved; x.mount = mountFor(x.id, m.car!); x.mount.scaling.setAll(1 + (x.lv - 1) * 0.06 + (x.evolved ? 0.25 : 0)); return x; });
  m.sig = sig;
}
/** recompute(): misma vida máxima, masa y armas que el que guía. */
function mateSync(m: Player) {
  if (m.car) { m.hp = Math.min(lead.maxHp, m.hp + Math.max(0, lead.maxHp - m.maxHp)); m.car.setMass(m.car.def.mass * st.mass); mateArm(m); }
  m.maxHp = lead.maxHp;
}
function mateHurt(m: Player | undefined, n: number) { if (!god && !(abil === "escudo" && abilOn > 0) && m?.car) m.hp -= n * (1 - st.armor); } // escudo: protege a todos
/** Daño a un jugador: el que guía pasa por hurt() (combo, sacudida, registro); los demás solo pierden vida. */
const hurtP = (p: Player | undefined, n: number, continuous: boolean, src: string) => (p === lead ? hurt(n, continuous, src) : mateHurt(p, n));
function mateBoom(c: Car) { FX.explosion(c.pos.add(upv(c.pos, 0.5)), 2); debris(c.pos, save.paint || "#d62828", 14, 9, 0.9); SFX.explosion(); }
/** Cae un compañero: se desarma y queda fuera hasta el próximo escenario. */
function mateDown(m: Player) {
  mateBoom(m.car!);
  for (const w of m.weapons) w.dispose();
  if (shieldM?.parent === m.car!.root) shieldM = null; // la burbuja se va con el auto
  m.weapons = []; m.sig = ""; m.car!.dispose(); m.car = null; m.hp = 0;
  banner(`J${m.id} FUERA HASTA EL PRÓXIMO ESCENARIO`, 2.5);
}
/** Cae el que guía con algún compañero vivo: el primero vivo pasa a guiar con sus copias de las armas; la cámara principal y el estado de cámara se cruzan (cada uno conserva su cuadro). */
function mateLead() {
  const m = liveM()[0], d = lead, dead = d.car!;
  mateBoom(dead);
  for (const w of weapons) w.dispose();
  weapons = m.weapons; m.weapons = []; m.sig = "";
  if (shieldM?.parent === dead.root) shieldM = null; // R7b: si la puso otro, sigue en su auto
  dead.dispose(); preview = null;
  d.car = null; d.hp = 0;
  m.boost = d.boost; // como en R7a: el turbo no se cruza, lo hereda quien pasa a guiar
  const p = cam.position.clone(); cam.position.copyFrom(m.cam.position); m.cam.position.copyFrom(p);
  const h = camH.clone(), u = camUp.clone(), t = camTarget.clone(); camH.copyFrom(m.h); camUp.copyFrom(m.up); camTarget.copyFrom(m.tgt); m.h.copyFrom(h); m.up.copyFrom(u); m.tgt.copyFrom(t);
  [d.cam, m.cam] = [m.cam, d.cam]; [d.h, m.h] = [m.h, d.h]; [d.up, m.up] = [m.up, d.up]; [d.tgt, m.tgt] = [m.tgt, d.tgt]; // el caído se queda con la cámara extra y su estado
  lead = m; lastHpFrac = lead.hp / lead.maxHp;
  camYaw = yawOf(camH, lead.car!.pos);
  mateViews();
  banner(`J${d.id} FUERA HASTA EL PRÓXIMO ESCENARIO`, 2.5);
}
/** Escenario nuevo: el caído vuelve con la vida llena; todos juntos en la llegada. */
function mateRevive(m: Player) {
  if (!m.car) mateCar(m);
  matePlace(m);
}
/** Input por jugador: J1 teclado (sin las teclas de J2) y primer joystick; J2 Teclado 2 o segundo joystick (input.ts coopCtl); J3 y J4 solo joysticks 3 y 4 (pollPad). */
function mateInput() {
  pollInput({ skip: coopSkip(), pad: pads()[0] ?? null });
  const by = [{ ...input }, pollMate()]; // R7b: J2 con salto y habilidad (input.ts KEYS2 o el joystick)
  for (let pn = 3; pn <= coop; pn++) by.push(pollPad(pn - 1));
  for (const p of players) p.in = by[p.id - 1];
  Object.assign(input, lead.in);
}
/** Manejo de un compañero: el mismo drive() con turbo y salto propios; sin combo ni marcas. */
function mateTick(m: Player, dt: number) {
  const c = m.car!, i = m.in;
  const boosting = i.boost && m.boost > R.turbo_umbral && i.throttle >= 0;
  m.boost = boosting ? m.boost - R.turbo_gasto * st.boostUse * dt : Math.min(100, m.boost + st.boostRegen * dt);
  const maxSpeed = c.def.speed * st.speedMul * (boosting ? R.turbo_vel : 1);
  const r = drive(c.body, c.root, dt, { throttle: boosting ? 1 : i.throttle, steer: i.steer, speed: maxSpeed, accel: c.def.accel * (boosting ? R.turbo_acel : 1), turn: c.def.turn * (i.drift ? R.derrape_giro : 1), grip: i.drift ? R.derrape_agarre : c.def.grip });
  c.animate(dt, i.steer, r.fs, maxSpeed);
  m.fs = r.fs;
  m.jumpCd = Math.max(0, m.jumpCd - dt); m.coyote = r.grounded ? R.salto_coyote_s : Math.max(0, m.coyote - dt);
  if (i.jump && (r.grounded || m.coyote > 0) && m.jumpCd <= 0) { m.jumpCd = R.salto_cd_s; m.coyote = 0; carJump(c, r); }
  if (alt(c.pos) < -5) m.hp = 0;
  m.hp = Math.min(lead.maxHp, m.hp + st.regen * dt);
  c.wear(Math.max(0, m.hp / lead.maxHp));
}
/** Cámara de un compañero: persecución "actual" con el zoom del jugador, en el marco local de la luna (como moonCam, sin modos). */
function mateCam(m: Player, dt: number) {
  const c = m.car!, k = 1 - Math.exp(-5 * dt);
  B.Vector3.LerpToRef(m.up, upAt(c.pos), 1 - Math.exp(-8 * dt), m.up).normalize();
  let hy = yawOf(hflat(m.h, c.pos), c.pos);
  const t = yawOf(c.root.forward, c.pos); hy += Math.atan2(Math.sin(t - hy), Math.cos(t - hy)) * (1 - Math.exp(-2 * dt));
  m.h.copyFrom(W(Math.sin(hy), 0, Math.cos(hy), c.pos));
  const P = CAMS.actual, z = save.zoom;
  B.Vector3.LerpToRef(m.cam.position, c.pos.subtract(m.h.scale(P.back * z)).addInPlace(m.up.scale(P.up * z)), k, m.cam.position);
  B.Vector3.LerpToRef(m.tgt, c.pos.add(m.h.scale(P.look)), k * 1.5, m.tgt);
  m.cam.fov = cam.fov;
  B.Matrix.LookAtLHToRef(m.cam.position, m.tgt, m.up, _camM2); _camM2.invert();
  B.Quaternion.FromRotationMatrixToRef(_camM2, (m.cam.rotationQuaternion ??= new B.Quaternion()));
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
for (const k of ["rey", "cortadora", "tarantula", "gato"] as const) if (save.slain[k] && !save.ach.includes(k)) save.ach.push(k);
if (save.best >= 600 && !save.ach.includes("diez")) save.ach.push("diez");

function endRun(win: boolean, why: string) {
  if (erun) { time += encPrior; encPrior = 0; runSeed = erun.seed; } // ENCORE: el tiempo y la semilla de la expedición, no los del último escenario
  if (win) grant(`gana_${save.car}`);
  if (win && daily) grant("diario");
  if (time >= 600 && !erun) grant("diez"); // ENCORE no cuenta para el logro de Supervivencia
  // Modo sin fin: récord propio de lo aguantado después de vencer al jefe final
  const lasted = endless ? Math.floor(time - bank!.t) : 0;
  if (endless) why += ` Modo sin fin: ${fmt(lasted)} más${lasted > save.endless ? ", récord nuevo" : ""}.`;
  worldK = 1; abilOn = bombs = 0; fxSpeed(1); // ninguna habilidad sigue durante el cierre
  if (runAch.length) why += ` Logros: ${runAch.join(", ")}.`;
  if (net?.host) { net.send({ t: "end" }, true); setTimeout(netEnd, 1000); } // R6b: el cliente vuelve al menú con el aviso
  state = simulating ? "over" : "outro"; // el cierre en cámara lenta (outroTick) abre los resultados
  engineStop(); music("over"); rainSfx(0); moonAmbience(false);
  // Tornillos: los de la partida más tiempo y bajas, con el extra de las maldiciones (+30% cada una)
  const gross = grossScrap(), earned = Math.floor((gross + (erun ? encExtra + E.scrapExtra(gross, encG, pfx.scrap) : 0)) * curseK * (erun ? 1 : pfx.scrap)); // ENCORE: el extra de pactos y rutas se acumuló por escenario; el tramo actual se liquida con el efecto vigente
  const eb = save.encore.best, encBetter = !!erun && (erun.loop > eb.loop || (erun.loop === eb.loop && (erun.stage > eb.stage || (erun.stage === eb.stage && Math.floor(time) > eb.t))));
  const prevBest = erun ? eb.t : save.best, record = erun ? encBetter : Math.floor(time) > save.best;
  const topHit = (Object.entries(dmgBy).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "accidente").replace(/[^\p{L}\d .,-]/gu, "").slice(0, 40);
  const enc = erun ? E.report(erun, { chests: chestsOpened(), cause: win ? "Venció al jefe del FINAL ACT" : `Daño de ${topHit}` }) : undefined; // R5: reporte de la expedición
  const rec: RunRec = { t: Math.floor(time), kills, lv: level, seed: runSeed, win };
  if (!simulating && !LAB.on) { // las pruebas de dev no tocan el guardado real
    save.scrap += earned - (bank?.scrap ?? 0); // al terminar el modo sin fin, solo lo que faltaba cobrar
    save.endless = Math.max(save.endless, lasted);
    if (!erun) save.best = Math.max(save.best, Math.floor(time));
    // Estadísticas de carrera (Bestiario): totales, daño por arma y mejor marca de la zona jugada
    const S = save.stats, zr = S.zone[zoneId] ?? { t: 0, kills: 0 };
    if (erun) { const E = save.encore; E.runs++; if (win) E.wins++; E.lastLoop = erun.loop; E.lastCause = win ? "" : topHit; if (encBetter) E.best = { loop: erun.loop, stage: erun.stage, t: Math.floor(time) }; for (const id of erun.found) if (!E.secrets.includes(id)) E.secrets.push(id); } // ENCORE: récord propio; tornillos, tiempo, daño y bestiario sí cuentan
    else if (!bank) { S.runs++; if (win) S.wins++; }
    S.time += time - (bank?.t ?? 0); S.dist += runDist; // runDist vuelve a 0 al seguir en modo sin fin
    for (const [src, v] of Object.entries(dmgOut)) S.dmg[src] = (S.dmg[src] ?? 0) + v - (bank?.dmg[src] ?? 0);
    if (!erun) S.zone[zoneId] = { t: Math.max(zr.t, Math.floor(time)), kills: Math.max(zr.kills, kills) };
    // Top 5 por tiempo (y bajas para desempatar)
    if (daily) save.daily = { day: today(), best: Math.max(save.daily.day === today() ? save.daily.best : 0, Math.floor(time)) };
    if (!erun) save.runs = [...save.runs.filter((r) => r !== bank?.rec), rec].sort((a, b) => b.t - a.t || b.kills - a.kills).slice(0, 5);
    persist();
  }
  $("hud").classList.add("hidden");
  bannerClear();
  const more = win && !endless && !erun; // venció al jefe final: los resultados ofrecen "Seguir jugando"
  bank = { t: time, scrap: earned, dmg: { ...dmgOut }, rec };
  const evos = weapons.filter((w) => w.evolved).map((w) => WEAPONS[w.id].evoName);
  const res = { win, title: endless ? "FIN DEL SIN FIN" : undefined, why, time, kills, level, scrap: earned, record, more, dmg: { ...dmgOut }, hurt: { ...dmgBy }, seed: `${profile.climate.name} · ${profile.plague.name} · Semilla ${runSeed}`, prevBest, bestStreak, bestHit: Math.round(bestHit), bestDrive: bestDriveMul, bossKills, evos, ach: [...runAch], car: save.car, enc };
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
  if (lead.hp <= 0 && lead.car) { // el auto se desarma
    FX.explosion(lead.car.pos.add(upv(lead.car.pos, 0.5)), 2);
    debris(lead.car.pos, save.paint || "#d62828", 14, 9, 0.9);
    SFX.explosion();
  }
  outroUi(true, outroStatLine({ time: fmt(time), kills, level, drive: res.bestDrive ?? 1, evos: res.evos ?? [] }));
}
function outroTick(dt: number) {
  outroT += dt;
  if (outroT >= OUTRO_GUARD) for (let i = 0; i < 12; i++) if (i < 6 || i > 7) outroSkip ||= padPressed(i); // botones, no gatillos ni cruceta (el stick cuenta como cruceta)
  ts = slowScale(outroT);
  const sdt = dt * ts;
  for (const e of enemies) { e.update(sdt, lead.car!.pos); e.animate(sdt); }
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
  void showPhoto({ zone: ZONES[zoneId].name, time: fmt(time), kills, car: CARS[lead.car!.kind].name, win: outroRes!.win });
  outroRes = null;
}
const skipOutro = (e: Event) => { if (state === "outro" && outroT >= OUTRO_GUARD && !(e instanceof KeyboardEvent && (e.repeat || /^(Shift|Control|Alt|Meta)/.test(e.code)))) outroSkip = true; };
addEventListener("keydown", skipOutro);
addEventListener("pointerdown", skipOutro);

function toMenu() {
  netEnd();
  if (LAB.on) { LAB.on = false; god = false; }
  if (duelM?.duelActive()) duelM.exitDuel();
  if (m3M?.match3Active()) m3M.exitMatch3();
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
  const early = time < R.xp_temprana_s ? R.xp_temprana_mult : 1;
  xp += n * st.xp * driveMul * early;
  while (xp >= xpNeed(level)) { xp -= xpNeed(level); level++; pendingLevels++; }
}

// Sin reparaciones: fuera las cartas de curación y la Pila de litio (regenera); se pide una de más para no quedar corto
function offersFor() {
  const n = 3 + save.perm.cards;
  return noRepair ? levelOffers(weapons, passives, n + 1).filter((o) => o.kind !== "heal" && o.id !== "litio").slice(0, n) : levelOffers(weapons, passives, n);
}
function openOffers(list: Offer[], title: string, keep = false) {
  if (!list.length) return; // Sin reparaciones con todo al máximo: no hay nada que ofrecer
  if (!keep) cardBy = net?.host && players[1] && cardTurn++ % 2 ? players[1].id : players[0].id; // R6c: online se alterna quién elige
  const mine = !net || cardBy === players[0].id; // en el anfitrión el jugador local es players[0] aunque guíe el J2
  net?.send({ t: "lv", title, o: list, by: cardBy }, true);
  state = "level";
  scene.physicsEnabled = false;
  offers = list;
  offerSel = 0;
  SFX.levelUp();
  engineStop();
  const c = lead.car!;
  let near = 0, bossNear = false;
  for (const e of enemies) {
    if (hd(e.pos, c.pos) > 24) continue;
    if (e.def.boss) bossNear = true;
    else near++;
  }
  const threat = bossNear ? "boss" : near ? "near" : "";
  const sub = bossNear ? "Jefe en radio corto" : near ? `${near} contacto${near === 1 ? "" : "s"} en radio` : "";
  const show = () => showOffers(title, list, 0, (i) => (mine ? applyCommand(cardBy, { k: "card", i }) : show()), previewOffer, mine ? sub : `Elige J${cardBy}`, mine ? threat : "");
  show();
  offerTitle = title;
  const frac = lead.hp / lead.maxHp;
  $("luHpFill").style.transform = `scaleX(${frac})`;
  $("luHpN").textContent = `${Math.ceil(lead.hp)}/${lead.maxHp}`;
  $("luHp").classList.toggle("lu-hp--low", frac < 0.35);
  const can = mine && rerolls > 0 && list[0]?.kind !== "evo";
  const rr = $("luReroll");
  rr.classList.toggle("hidden", !can);
  if (can) { rr.textContent = `Re-sortear (${rerolls})`; rr.onclick = () => applyCommand(cardBy, { k: "reroll" }); } else rr.onclick = null;
  $("luHint").textContent = isTouch ? "Toca una carta para elegirla" : `${list.map((_, i) => i + 1).join(" · ")} o clic — Enter confirma${can ? ` · ${keyName(KEYS.reroll[0])} o ${btnName(pb("reroll"))}` : ""}`;
  $("luHint").onclick = null;
}
// Re-sorteo de cartas (Dado cargado): mismas reglas, cartas nuevas. Las evoluciones no se re-sortean.
function reroll() {
  if (state !== "level" || rerolls <= 0 || offers[0]?.kind === "evo" || document.querySelector("#offers .picked")) return;
  rerolls--;
  preview?.dispose();
  preview = null;
  openOffers(offersFor(), offerTitle, true);
}

function choose(i: number, by = lead) {
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
  else by.hp = Math.min(by.maxHp, by.hp + R.carta_reparacion);
  recompute();
  if (!simulating && (o.kind === "weapon" || o.kind === "passive")) {
    for (const w of weapons) {
      if (!w.evolved && w.lv >= 5 && passives[WEAPONS[w.id].evo] && !evoNotified.has(w.id)) {
        evoNotified.add(w.id);
        banner(`EVOLUCIÓN LISTA · ${WEAPONS[w.id].evoName.toUpperCase()} (COFRE)`, 2.4);
      }
    }
  }
  state = "play";
  scene.physicsEnabled = true;
  net?.send({ t: "lvx" }, true); // R6c: el cliente cierra las cartas
}

/** R7b: " · J2" si con 2 jugadores lo activó el otro (who = 1) o el que guía es el J2; vacío con 1 jugador. Las cartas son de los dos y elige cualquiera. */
const byTag = (who = 0) => (players.length > 1 ? ` · J${(who && liveM()[who - 1]?.id) || lead.id}` : "");
function openChest(who = 0) {
  const evo = evoOffer(weapons, passives);
  openOffers(evo ? [evo] : offersFor(), (evo ? (evo.kind === "fusion" ? "Cofre · Fusión" : "Cofre · Evolución") : "Cofre") + byTag(who));
}

function pause() {
  if (state !== "play") return;
  state = "pause"; scene.physicsEnabled = false; engineStop(); musicDuck(true);
  const evoLine = weapons.filter((w) => w.evolved).map((w) => WEAPONS[w.id].evoName).join(" · ");
  const totDmg = Object.values(dmgOut).reduce((a, b) => a + b, 0);
  openPause({
    weapons: weapons.map((w) => {
      const d = Math.round(dmgOut[w.id] ?? 0);
      return { id: w.id, lv: w.lv, evolved: w.evolved, dmg: d, pct: totDmg > 0 ? Math.round((d / totDmg) * 100) : 0 };
    }),
    passives: (Object.entries(passives) as [PassiveId, number][]).map(([id, lv]) => ({ id, lv })),
    stats: [["Carrocería", `${Math.ceil(lead.hp)} / ${lead.maxHp}`], ["Velocidad", `${Math.round(lead.car!.def.speed * st.speedMul * 3.6)} km/h`], ["Embestida", `x${lead.car!.def.ram}`], ["Daño", `${Math.round(st.dmg * 100)}%`], ["Blindaje", `${Math.round(st.armor * 100)}%`], ["Imán", `${st.magnet.toFixed(1)} m`]],
    run: [["Nivel", `NV ${level}${pendingLevels ? ` (+${pendingLevels} pend.)` : ""}`], ["Tiempo", fmt(time)], ["Daño total", Math.round(totDmg).toLocaleString("es")], ["Combo manejo", `×${driveMul.toFixed(2)} (pico ×${bestDriveMul.toFixed(2)})`], ["Re-sorteos", String(rerolls)], ...(evoLine ? [["Evoluciones", evoLine] as [string, string]] : [])],
    seed: `${profile.climate.name} · ${profile.plague.name} · Semilla ${runSeed}`,
  });
}
function resume() {
  if (state !== "pause") return;
  state = "play"; scene.physicsEnabled = true; reset(null); musicDuck(false);
}

// Esc / P / M y la navegación de menús viven en menu.ts; acá solo las cartas de mejora
addEventListener("keydown", (e) => {
  const lv = state === "level" || netLv; // R6c: el cliente online también ve las cartas
  if (lv && /^Digit[1-4]$/.test(e.code)) { const i = +e.code.slice(5) - 1; if (i < offers.length) pickOffer(i); }
  if (e.code === "Enter" && lv) pickOffer(offerSel);
  if (keyHit("reroll", e.code) && lv) applyCommand(lead.id, { k: "reroll" });
});
// ---------- Carga (loading.ts) ----------
// Tareas pesadas que se hacen solas en los menús (un hueco libre por vez) y que launch() completa tras Jugar / Carrera con pantalla de carga.
// Peso (w) ~ ms de la tarea en una PC rápida, redondeado; el orden de la cola es el de la precarga.
let bichosOk = false, autosOk = false, plantillasOk = false, efectosOk = false, fxN = 0, fxTotal = 1;
const T_BICHOS: Task = { id: "bichos", label: "Cargando bichos", w: 3, done: () => bichosOk, run: async () => { await loadGlbs(scene); bichosOk = true; }, prog: glbProgress };
const T_AUTOS: Task = { id: "autos", label: "Cargando autos", w: 2, done: () => autosOk, run: async () => { await loadCarGlbs(scene); autosOk = true; }, prog: carGlbProgress };
// Plantillas instanciadas que la partida crearía al vuelo (un hipo al primer bicho, tuerca o pila): se arman antes, de a una por hueco libre
const T_PLANTILLAS: Task = { id: "plantillas", label: "Cargando bichos", w: 2, done: () => plantillasOk, prog: () => fxN / fxTotal, run: async () => {
  const jobs: (() => unknown)[] = [() => gemTpl(1), () => gemTpl(5), () => gemTpl(20), pilaTpl, imanTpl, spitTpl, nutTpl];
  for (const k of Object.keys(DEF) as Kind[]) {
    if (!GLB[k]) jobs.push(() => (k === "gusano" ? wormHeadTpl() : enemyTemplate(k, DEF[k].scale)));
    if (LEGS[k]) jobs.push(() => legTemplate(k));
    if (k === "polilla") jobs.push(() => wingTemplate());
  }
  fxTotal = jobs.length;
  for (fxN = 0; fxN < jobs.length; fxN++) { jobs[fxN](); await idle(); }
  plantillasOk = true;
} };
/** Mundo de una zona (sin el layout con semilla, que arma cada partida). En los menús queda escondido (showWorld). */
const worldTask = (zone: () => string): Task => ({ id: "patio", label: "Armando el patio", w: 5, done: () => worldReady(zone()), run: () => { setZone(zone(), false); if (state === "menu" || state === "match3") showWorld(false); } });
// Compila los shaders de todos los materiales ya creados (en paralelo si el navegador puede) para que el primer cuadro de partida no se trabe
// ponytail: solo los materiales que existen al correr (no los de armas ni de una zona que se arma después); techo: precompilar con los defines de cada plantilla de arma
const T_EFECTOS: Task = { id: "efectos", label: "Preparando efectos", w: 3, done: () => efectosOk, prog: () => fxN / fxTotal, run: async () => {
  const jobs: [B.Material, B.Mesh][] = [], seen = new Set<B.Material>();
  for (const m of scene.meshes) {
    if (!(m instanceof B.Mesh) || !m.getTotalVertices()) continue;
    for (const mat of m.material instanceof B.MultiMaterial ? m.material.subMaterials : [m.material]) if (mat && !seen.has(mat)) { seen.add(mat); jobs.push([mat, m]); }
  }
  fxTotal = jobs.length;
  const compile = (mat: B.Material, mesh: B.Mesh) => Promise.race([mat.forceCompilationAsync(mesh, { useInstances: mesh.position.y < -400 }).catch(() => undefined), new Promise<void>((r) => setTimeout(r, 2000))]); // headless: sin tope un shader cuelga ensureAll; 2 s basta para los que compilan y shots no superan 90 s
  for (fxN = 0; fxN < jobs.length; fxN += 6) { await Promise.all(jobs.slice(fxN, fxN + 6).map(([mat, m]) => compile(mat, m))); await idle(); } // las plantillas viven en y = -500
  fxN = fxTotal; efectosOk = true;
} };
preload([T_BICHOS, T_AUTOS, T_PLANTILLAS, worldTask(() => zoneFor(false)), T_EFECTOS], () => state === "menu");
/** Espera n cuadros dibujados (con tope de 1,5 s: con la pestaña oculta no hay cuadros). */
const afterFrames = (n: number) => new Promise<void>((r) => {
  let k = 0;
  const done = () => { scene.onAfterRenderObservable.remove(o); clearTimeout(t); r(); };
  const o = scene.onAfterRenderObservable.add(() => { if (++k >= n) done(); }), t = setTimeout(done, 1500);
});
function launchRun(d = false, enc = false, n = 0, then?: () => void) {
  encore = enc; coop = n || (enc && !isTouch ? Math.min(encCfg.players, encMax()) : 1); // R7a/c: de 2 a 4 jugadores solo en ENCORE y solo en compu (3-4 si siguen conectados los joysticks)
  initAudio(); // el gesto del jugador es este clic: el audio se activa acá, no tras la carga
  void launch([T_BICHOS, T_AUTOS, T_PLANTILLAS, worldTask(() => zoneFor(d)), T_EFECTOS], "Encendiendo el auto", () => { startRun(d); then?.(); }, () => afterFrames(2));
}
const raceZone = (battle: boolean) => battle ? "patio" : TRACKS[raceCfg.cup ? 0 : raceCfg.track].zone;
// Carrera (kart.ts) también en chunk aparte: se carga al elegirla
let kartM: typeof import("./kart") | null = null;
async function loadKart() {
  if (!kartM) { const m = await import("./kart"); m.initKart({ scene, cam, onExit: () => { state = "menu"; music("menu"); reset("main"); }, load: (label, zone, go) => { void launch([worldTask(() => zone), T_EFECTOS], label, go, () => afterFrames(2), true); } }); kartM = m; } // la luz del menú la pone menuTick
}
function goRace(battle = false) {
  initAudio();
  void loadKart().then(() => launch([worldTask(() => raceZone(battle)), T_EFECTOS], battle ? "Inflando los globos" : "Preparando la largada", () => enterRace(battle), () => afterFrames(2)));
}
function enterRace(battle: boolean) {
  initAudio(); clearRun(); menuOff();
  state = "race"; reset(null);
  $("hud").classList.add("hidden");
  kartM!.setRaceCar(save.car);
  if (battle) kartM!.startBattle(); else kartM!.startRace();
}
// Duelo y match-3 se cargan al entrar (chunks aparte): la portada no los necesita
let duelM: typeof import("./duel") | null = null, m3M: typeof import("./match3") | null = null;
const modeOpts = () => ({ scene, cam, onExit: () => { state = "menu"; music("menu"); reset("main"); } });
async function loadDuel() {
  if (!duelM) { const m = await import("./duel"); m.initDuel(modeOpts()); duelM = m; if (import.meta.env.DEV) Object.assign(window, { __duel: m.duelDev }); }
}
async function loadMatch3() {
  if (!m3M) { const m = await import("./match3"); m.initMatch3(modeOpts()); m3M = m; if (import.meta.env.DEV) Object.assign(window, { __match3: m.match3Dev }); }
}
function enterDuel() {
  initAudio(); clearRun(); menuOff();
  state = "duel"; reset(null);
  $("hud").classList.add("hidden");
  document.getElementById("touch")?.classList.add("hidden");
  duelM!.startDuel();
}
function goDuel() {
  initAudio();
  void loadDuel().then(() => launch([T_EFECTOS], "Preparando demolición", () => enterDuel(), () => afterFrames(2)));
}
function enterMatch3() {
  initAudio(); clearRun(); menuOff();
  state = "match3"; reset(null);
  $("hud").classList.add("hidden");
  const q = new URLSearchParams(location.search);
  const seed = q.has("seed") ? Number(q.get("seed")) : 20261007;
  m3M!.startMatch3(Number.isFinite(seed) ? seed : 20261007);
}
function goMatch3() {
  initAudio();
  void loadMatch3().then(() => launch([], "Encendiendo gabinete", () => enterMatch3(), () => afterFrames(2)));
}
if (import.meta.env.DEV && /[?&]duel\b/.test(location.search)) setTimeout(() => goDuel(), 1500);
if (import.meta.env.DEV && /[?&]match3\b/.test(location.search)) setTimeout(() => goMatch3(), 1500);
// ponytail: el banco Folded (`?folded`, solo dev) reusa el estado "match3" (cámara libre, sin auto); un estado propio si crece
if (import.meta.env.DEV && /[?&]folded\b/.test(location.search)) setTimeout(() => void launch([], "Banco Folded", () => {
  clearRun(); menuOff(); showWorld(false); state = "match3"; reset(null); $("hud").classList.add("hidden");
  void import("./folded_lab").then((m) => { applyClimate(DUSK); setDark(0.22); m.foldedLab(scene, cam); });
}, () => afterFrames(2)), 1500);
if (import.meta.env.DEV && /[?&]race\b/.test(location.search)) setTimeout(() => { const q = new URLSearchParams(location.search); if (q.get("players") === "2" && !isTouch) { raceCfg.players = 2; raceCfg.p2 = "kbd2"; } if (q.get("track")) { raceCfg.cup = false; raceCfg.track = Number(q.get("track")) as 0 | 1 | 2; } goRace(q.has("battle")); }, 1500); // solo dev: ?race[&players=2] arranca la carrera
// Portada: fuentes del menú, dos cuadros dibujados (arma la escena del estante) y recién ahí se cierra la pantalla de carga; la precarga arranca con la portada ya a la vista
boot("Cargando fuentes", 0.7);
await Promise.race([Promise.all(['500 16px Rajdhani', '700 16px Rajdhani'].map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 1500))]);
boot("Armando el menú", 0.9);
void afterFrames(2).then(() => { void bootEnd(); startPreload(900); });
initMenu({ scene, play: launchRun, resume, quit: toMenu, pause, endless: goEndless, race: () => goRace(), battle: () => goRace(true), duel: goDuel, match3: goMatch3 });
music("menu"); // suena cuando haya primer gesto (initAudio)
// Intro de 4 cuadros: en cada carga de la página o apertura de la app instalada (cualquier tecla la salta); ?mute y ?lab (pruebas) no la muestran, ?intro la fuerza
{ const force = /[?&]intro\b/.test(location.search); if (force || !/[?&](mute|lab)\b/.test(location.search)) playIntro(!force); }

// ---------- Combate ----------
const toScreen = (p: B.Vector3) => B.Vector3.Project(p, B.Matrix.IdentityReadOnly, players.length > 1 ? cam.getTransformationMatrix() : scene.getTransformMatrix(), /* R7a: con varias cámaras la de la escena es la última dibujada */ cam.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()));
// Daño infligido por fuente (pantalla de resultados): dmgSrc = arma que está actuando
const dmgOut: Record<string, number> = {};
let dmgSrc = "";
function damage(e: Enemy, dmg: number, knock?: B.Vector3, crit = false) {
  if (e.kind === "gusano" && !wormOut(e)) return; // gusano lunar: enterrado no recibe daño
  if (hitShip(e, dmg)) return; // luna: las naves son blancos de las armas (moon_ships.ts shipTargets)
  if (lead.car && isAlien(e.kind)) { const k = armorMul(e, lead.car.pos); if (k < 1) { dmg *= k; if (e.kind === "tanque" && !simulating) FX.sparks(e.pos.add(upv(e.pos, 0.6))); } } // tanque alien (aliens.ts): placa frontal y escudo del curandero
  if (dmgSrc) {
    const eff = Math.min(dmg, Math.max(0, e.hp));
    dmgOut[dmgSrc] = (dmgOut[dmgSrc] ?? 0) + eff;
    if (!simulating && !LAB.on) { const by = beastRec(e.kind).by; by[dmgSrc] = (by[dmgSrc] ?? 0) + eff; } // debilidades (ficha del bestiario)
  }
  e.hp -= dmg;
  bestHit = Math.max(bestHit, dmg);
  if (dmg >= 4) SFX.impact(dmgSrc, crit);
  if (dmg >= 5 && !simulating && save.dmgNums) {
    const sp = toScreen(e.pos.add(upv(e.pos, e.def.size[1] + 0.3)));
    const k = innerWidth / engine.getRenderWidth();
    if (sp.z < 1) damageNumber(sp.x * k, sp.y * k, dmg, crit);
  }
  if (dmg >= 60 || e.def.boss && dmg >= 20) hitStop = Math.max(hitStop, crit ? 0.06 : 0.035);
  // Impacto: destello, chispas, pedazos y squash del bicho; la sacudida de cámara depende del arma
  if (dmg >= 4 && !simulating) shake = Math.max(shake, impact(e.node, e.pos.add(upv(e.pos, e.def.size[1] * 0.5)), e.def.color, Math.max(e.def.size[0], e.def.size[2]) * (e.def.scale ?? 1), dmgSrc, crit, !!e.def.boss));
  if (knock && !e.def.boss) e.body.applyImpulse(knock.scale(e.def.mass), e.pos);
}

function explode(pos: B.Vector3, r: number, dmg: number) {
  FX.explosion(pos.add(upv(pos, 0.5)), r);
  SFX.explosion();
  mark("scorch", pos, Math.random() * 6, r * 0.55, 14);
  smashed(hitBreakables(pos, r, dmg));
  shake = Math.max(shake, 0.25);
  for (const e of enemies) {
    const d = B.Vector3.Distance(e.pos, pos);
    if (d < r + e.radius) damage(e, dmg, e.pos.subtract(pos).normalize().addInPlace(upv(e.pos, 0.6)).scale(6));
  }
}

// Explosivo alien: daña a todo lo de adentro del aro y deja un cráter de verdad. Se usa al armarse y al morir por daño (otros explosivos del radio reviente en cadena)
const boomed = new WeakSet<Enemy>();
function boom(e: Enemy) {
  if (boomed.has(e) || !lead.car) return;
  boomed.add(e); // una sola explosión por bicho (la cadena no vuelve sobre sí misma)
  if (hd(lead.car.pos, e.pos) < ATK.alien_explosivo_radio + Math.max(lead.car.def.size[0], lead.car.def.size[2]) / 2) hurt(ATK.alien_explosivo_dano, false, "explosión " + e.kind, e.kind);
  explode(e.pos, ATK.alien_explosivo_radio, ATK.alien_explosivo_dano_bicho);
  if (MOON.on) { deform(e.pos, ATK.alien_explosivo_crater_r, ATK.alien_explosivo_crater_hondo); craterHumeante(e.pos, ATK.alien_explosivo_crater_r, !simulating); }
}

// Color del charco de cada insecto = color de sus ojos (models.ts)
const BUG_GOO: Partial<Record<Kind, string>> = { hormiga: "#ff3020", escupidora: "#ffb020", escarabajo: "#9acd32", polilla: "#c9a0ff" };
const CONFETI = ["#ffd84d", "#ff9bd4", "#7de8ff", "#b6ff6a", "#ffa05a"];
function kill(e: Enemy) {
  if (e.kind === "explosivo" && e.hp > -1e8) boom(e); // murió por daño (clear/boom ponen -1e9)
  kills++;
  const s = hudKill(); // una sola llamada: cada hudKill() suma una baja (antes se llamaba 5 veces y el cartel mostraba otro número)
  bestStreak = Math.max(bestStreak, s); if (e.def.boss) bossKills++;
  if (s >= 20 && s % 20 === 0) SFX.streak(s);
  else if (s < 20 && s % 10 === 0) SFX.streak(s);
  if (!simulating && (s === 50 || s % 100 === 0)) banner(`RACHA x${s}`, 1.2); // cartel central solo en hitos
  if (s >= 100) grant("racha");
  if (!simulating && !LAB.on) save.slain[e.kind] = (save.slain[e.kind] ?? 0) + 1;
  SFX.kill(s);
  FX.death(e.pos.add(upv(e.pos, 0.5)), e.def.boss);
  debris(e.pos, e.def.color, e.def.boss ? 30 : e.kind === "hormiga" ? 4 : 7, e.def.boss ? 14 : 6, e.def.scale ?? (e.def.boss ? 3 : 1));
  if (!simulating) debris(e.pos, CONFETI[Math.floor(Math.random() * CONFETI.length)], e.def.boss ? 14 : 3, e.def.boss ? 12 : 7, e.def.boss ? 1.2 : 0.5); // confeti de color: cada baja se ve festiva
  const juice = !simulating && !e.def.boss;
  if (juice && BUG_GOO[e.kind]) splat(e.pos, BUG_GOO[e.kind]!, Math.max(e.def.size[0], e.def.size[2]) * 0.55);
  if (juice && (e.kind === "friccion" || e.kind === "robot")) { debris(e.pos, "#b8bcc2", 5, 8, 0.45); debris(e.pos, "#d4a017", 3, 9, 0.35); FX.sparks(e.pos.add(upv(e.pos, 0.5))); }
  if (e.def.xp) dropGems(e.pos, e.def.xp * (e.def.boss ? 1 : TOUGH.xp * (MOON.on ? R.luna_xp_mult : 1)));
  if (e.def.boss) {
    shake = 1.5;
    runScrap += R.tornillos_jefe;
    if (e.kind === "rey" || e.kind === "cortadora" || e.kind === "tarantula" || e.kind === "gato") grant(e.kind);
    if (e.kind === finalKind && !endless) {
      outroAt = e.pos.clone(); leave(e);
      const why = FINAL_WIN[finalKind] ?? "El jefe final quedó fuera de combate. Su seguro ya fue notificado.";
      return endRun(true, erun && E.bossDown(erun) ? `${E.line("won", erun)} ${why}` : why); // ENCORE: el Director cierra el show en los resultados
    }
    dropPickup(e.pos, "cofre");
    hudBoss(null);
  } else {
    const r = rng();
    if (r < R.drop_pila_prob) dropPickup(e.pos, "pila");
    else if (r < R.drop_pila_prob + R.drop_iman_prob) dropPickup(e.pos, "iman");
  }
  if (e.elite) { dropPickup(e.pos, "cofre"); e.aura?.dispose(); } // la élite suelta cofre; el aura no queda en el cadáver
  // Los insectos quedan patas arriba unos segundos; el resto desaparece
  if (juice && BUG_GOO[e.kind]) { e.agg.dispose(); corpse(e.node, e.def.size[1] * (e.def.scale ?? 1)); } else leave(e);
}
// Jefes GLB con clips (Felipe, Eulalio): quedan en el piso reproduciendo su muerte; el resto de los jefes desaparece
function leave(e: Enemy) {
  if (GLB[e.kind]?.clips) { e.die(); corpse(e.node, 0, (dt) => e.animate(dt)); } else e.dispose();
}

// Juego de autos: menos bichos pero más duros, para esquivarlos manejando (decisión del usuario 2026-10-04)
const coopHp = () => 1 + R.coop_vida_por_jugador * (players.length - 1), coopRate = () => 1 + R.coop_ritmo_por_jugador * (players.length - 1); // R7c: con 1 solo valen 1
const TOUGH = { count: R.dureza_cantidad, hp: R.dureza_vida, dmg: R.dureza_dano, xp: R.dureza_xp };
function spawnEnemy(kind: Kind, p: B.Vector3) {
  const en = new Enemy(kind, p, (1 + (time + paceS) / R.vida_escala_seg) * TOUGH.hp); // los jefes ignoran hpMul
  en.hp = en.maxHp *= coopHp(); // R7c: vida por jugador (jefes incluidos)
  enemies.push(en);
  if (MOON.on && !isAlien(kind) && kind !== "gusano") enemyLights(enemies[enemies.length - 1].node, kind, DEF[kind].size); // los aliens traen sus luces (aliens.ts); luna: versión "robot con luces" (ojos y baliza que atraviesan la niebla)
  if (!LAB.on && !save.seen.includes(kind)) save.seen.push(kind); // bestiario
  if (!LAB.on && !simulating) { const b = beastRec(kind); b.first ??= today(); if (!b.zones.includes(zoneId)) b.zones.push(zoneId); } // registro propio
}

// Fase 2 de la luna (moon.ts LUNA.spawn): un bicho en cualquier punto de la esfera (se apoya en el piso del lugar)
LUNA.spawn = (kind, p) => spawnEnemy(kind, onFloor(p, 0.5));
evInit({ // moon_events.ts: daño y sacudida viven acá
  hurt: (n, continuous, src, who) => hurtWho(n, continuous, src, who),
  blast: (p, r, dmg, src) => { dmgSrc = src; for (const e of enemies) if (B.Vector3.Distance(e.pos, p) < r + e.radius) damage(e, dmg, e.pos.subtract(p).normalize().addInPlace(upv(e.pos, 0.6)).scale(6)); dmgSrc = ""; },
  shake: (k) => { shake = Math.max(shake, k); },
  sim: () => simulating,
});
SHIP_IO.hurt = (n, src, who) => hurtWho(n, false, src, who);
COOP.n = () => players.length;
GOAL_IO.win = (p) => { if (state !== "play" || endless) return; if (erun) return encApply(E.boarded(erun)); /* ENCORE: el cohete es el teleportador, no el final */ outroAt = p.clone(); endRun(true, ESCAPE_WIN); };
GOAL_IO.scrap = () => Math.floor(runScrap + Math.floor(time / R.tornillos_div_tiempo) + Math.floor(kills * TOUGH.xp / R.tornillos_div_bajas));
// R7b: who = índice en los autos vivos (0 = el que guía, 1 = el otro); la máquina cobra vida a quien la activa y las cartas (compartidas) dicen quién abrió
GOAL_IO.hpFrac = (who) => whoP(who).hp / lead.maxHp;
GOAL_IO.pay = (n, h, who) => applyCommand(whoP(who).id, { k: "buy", scrap: n, hpFrac: h });
GOAL_IO.offer = (k, who) => { if (k === "cofre" && erun && !chestsLeft()) { E.discover(erun, "aplausos"); encSecrets(); } if (k === "cofre") openChest(who); else openOffers(offersFor(), "Máquina de opciones" + byTag(who)); };
SHIP_IO.reward = (p, xp, boss) => { dropGems(p, xp); dropPickup(p, "cofre"); if (boss) { bossKills++; runScrap += R.tornillos_jefe; shake = 1.5; } };

// ---------- Update ----------
function update(dt: number) {
  const c = lead.car!;
  time += dt;
  if (erun) { encApply(E.tick(erun, dt)); const d = E.dirTick(dirq, dt); if (d) dirSub(d, E.ENC.dirShowS); } // ENCORE: aterriza el teleportador, vencen las ventanas de decisión y votación
  const calm = erun?.phase === "vote" || erun?.phase === "final", tp = time + paceS, hordeK = horde * pfx.spawn; // calm: sin apariciones (solo el jefe del FINAL ACT); tp: reloj de dificultad
  if (hintOn && (time > HINT_S || input.throttle || input.steer || input.move || input.boost || input.drift || input.jump || input.ability)) { hintOn = false; $("hint").classList.add("fade"); }
  // Ciclo de luz: se reaplica solo cuando cambió lo suficiente (repinta cielo y sonda)
  // Lluvia: empieza a la fracción profile.rainAt de la partida; la intensidad sube suave
  const rainAtS = profile.rainAt * 600, warnS = R.aviso_evento_s;
  if (!rainBanner && !evtPre.rain && time >= rainAtS - warnS && time < rainAtS) { evtPre.rain = true; radioEvent("lluvia_pre"); }
  const raining = time >= rainAtS;
  if (raining && !rainBanner) { rainBanner = true; radioEvent("lluvia"); }
  rainK = LAB.on && raining ? 1 : rainK + ((raining ? 1 : 0) - rainK) * Math.min(1, dt * RAIN.ramp);
  const s = nightfall(LAB.on ? LAB.t : time / 600);
  if (!simulating && Math.abs(s - cycleS) > 0.01) { cycleS = s; applyClimate(evBase(zoneClimate() ?? mixClimate(DUSK, profile.climate, s))); }

  // --- Habilidad activa (efectos con el reloj real; wdt = paso del mundo, más corto en cámara lenta) ---
  abilCd -= dt;
  if (input.ability && abilCd <= 0) useAbility(c);
  else for (const m of liveM()) if (m.in.ability && abilCd <= 0) useAbility(m.car!); // R7b: cualquiera la dispara desde su auto (enfriamiento compartido)
  if (abilOn > 0 && (abilOn -= dt) <= 0) { worldK = 1; fxSpeed(1); if (shieldM) shieldM.isVisible = false; }
  if (abil === "escudo" && abilOn > 0) for (const m of players) if (m.car) m.hp = Math.min(lead.maxHp, m.hp + lead.maxHp * R.escudo_cura_s * dt); // 30% en 3 s (a todos)
  if (bombs > 0 && (bombT -= dt) <= 0) {
    bombs--; bombT = R.bombardeo_intervalo_s;
    const a = rng() * Math.PI * 2, d = 3 + rng() * 11, c = abilCar && !abilCar.root.isDisposed() ? abilCar : lead.car!; // R7b: caen alrededor de quien la disparó
    dmgSrc = "bombardeo"; explode(MOON.on ? onFloor(at(c.pos, Math.cos(a) * d, 0, Math.sin(a) * d), 0) : new B.Vector3(c.pos.x + Math.cos(a) * d, 0, c.pos.z + Math.sin(a) * d), R.bombardeo_radio, R.bombardeo_dano * st.dmg); dmgSrc = "";
  }
  const wdt = dt * worldK, cars = [c, ...liveM().map((m) => m.car!)], carPs = cars.map((x) => x.pos); // R7b: autos vivos (0 = el que guía) para los eventos de la luna
  if (MOON.on && !calm) lunaEv(wdt, time, carPs, Math.max(c.def.size[0], c.def.size[2]) / 2, camYaw); // luna: lluvia de meteoritos y erupciones (moon_events.ts)

  // --- Manejo ---
  let throttle = input.throttle, steer = input.steer;
  if (input.move) {
    // Dirección relativa a la cámara: el auto gira solo hacia donde apunta el stick
    _moveF.set(Math.sin(camYaw), 0, Math.cos(camYaw));
    _moveR.set(_moveF.z, 0, -_moveF.x);
    _moveWant.set(_moveR.x * input.moveX + _moveF.x * input.moveY, 0, _moveR.z * input.moveX + _moveF.z * input.moveY);
    _moveFwd.copyFrom(MOON.on ? flatL(c.root.forward, c.pos) : c.root.forward); _moveFwd.y = 0; _moveFwd.normalize(); // luna: camYaw y el rumbo, en el marco local del auto
    const wl = _moveWant.length();
    throttle = Math.min(1, wl);
    if (wl > 1e-6) _moveWant.scaleInPlace(1 / wl);
    const diff = Math.atan2(B.Vector3.Cross(_moveFwd, _moveWant).y, B.Vector3.Dot(_moveFwd, _moveWant));
    steer = B.Scalar.Clamp(diff * 2.5, -1, 1);
  }
  const ariete = weapons.some((w) => w.id === "lanza" && w.evolved);
  const boosting = input.boost && lead.boost > R.turbo_umbral && throttle >= 0;
  lampBoost = boosting;
  boostSec = boosting ? boostSec + dt : 0;
  lead.boost = boosting ? lead.boost - R.turbo_gasto * st.boostUse * dt : Math.min(100, lead.boost + st.boostRegen * dt);
  const maxSpeed = c.def.speed * st.speedMul * (boosting ? R.turbo_vel : 1);
  const r = drive(c.body, c.root, dt, {
    throttle: boosting ? 1 : throttle, steer, speed: maxSpeed,
    accel: c.def.accel * (boosting ? R.turbo_acel : 1),
    turn: c.def.turn * (input.drift ? R.derrape_giro : 1),
    grip: (() => {
      let g = (input.drift ? R.derrape_agarre : c.def.grip) * (1 - (1 - RAIN.grip) * rainK);
      if (!input.drift && rainK > 0) g *= 1 + R.lluvia_control * (1 - rainK);
      return g;
    })(),
  });
  if (r.impactSpeed > 4.0 && !simulating) {
    SFX.bodyThud(r.impactSpeed, r.impactPan);
    shake = Math.max(shake, Math.min(0.45, r.impactSpeed * 0.035));
  }
  c.animate(dt, steer, r.fs, maxSpeed);
  if (jumpCd > 0) jumpCd -= dt;
  if (r.grounded) coyoteT = R.salto_coyote_s;
  else coyoteT = Math.max(0, coyoteT - dt);
  const canJump = (r.grounded || coyoteT > 0) && jumpCd <= 0;
  if (input.jump && canJump) { jumpCd = R.salto_cd_s; coyoteT = 0; carJump(c, r); }
  const ms = liveM(); // R7a/c: compañeros con auto (vacío = solo o todos fuera); mismo orden que `cars` 1..
  for (const m of ms) mateTick(m, dt);
  if (yardPulseIdx < YARD_PULSES.length && time >= YARD_PULSES[yardPulseIdx]) {
    yardPulseIdx++; yardPulseT = 10;
    if (!simulating && !MOON.on) { banner(zoneId === "jardin" ? "SOBREPRESIÓN EN ASPERSORES" : "PICOS DE TENSIÓN EN EL PATIO", 2.2); FX.sparks(c.pos.add(new B.Vector3(0, 0.6, 0))); }
  }
  if (yardPulseT > 0) yardPulseT = Math.max(0, yardPulseT - dt);
  { const zp = zoneTick(dt, c.pos, yardPulseT > 0); if (zp) c.body.setLinearVelocity(c.body.getLinearVelocity().addInPlace(zp)); } // aspersores del jardín
  engineSfx(Math.min(1, Math.abs(r.fs) / (c.def.speed * R.turbo_vel)), throttle, boosting, input.drift, floorAt(c.pos.x, c.pos.z));
  if (c.kind === "helado" && (jingleT -= dt) <= 0) { SFX.jingle(); jingleT = 16; }
  runDist += Math.abs(r.fs) * dt;
  // Combo de manejo: derrape largo, salto y aterrizaje limpio suben el multiplicador de XP (tope x2); un golpe lo corta (hurt)
  if (r.grounded) {
    const landing = !wasGrounded && airT >= 0.12;
    if (landing && !simulating) {
      const land = c.pos.add(c.root.forward.scale(-0.6));
      FX.dust(land);
      if (airT > 0.55) shake = Math.max(shake, Math.min(0.45, 0.12 + airT * 0.25));
    }
    if (airT >= 0.5 && !airHit) trick(Math.abs(r.ls) < 3 && Math.abs(r.fs) > 5 ? "SALTO LIMPIO" : "SALTO", Math.abs(r.ls) < 3 && Math.abs(r.fs) > 5 ? R.combo_salto_limpio : R.combo_salto);
    airT = 0; airHit = false;
    driftT = input.drift && Math.hypot(r.fs, r.ls) > 6 ? driftT + dt : 0; // velocidad total: derrapando casi toda va de costado
    if (driftT >= R.combo_derrape_s) { driftT = 0; trick("DERRAPE LARGO", R.combo_derrape); }
  } else airT += dt;
  wasGrounded = r.grounded;
  // Sin trucos por 8 s el multiplicador baja solo, 0,1 por segundo hasta x1
  if ((trickT += dt) > R.combo_espera_s && driveMul > 1) { driveMul = Math.max(1, driveMul - R.combo_baja_s * dt); if (!simulating) hudDrive(driveMul); }
  lastKmh = r.fs * 3.6; lastMaxKmh = c.def.speed * st.speedMul * R.turbo_vel * 3.6;
  // Marcas de neumático, chirrido y humo al derrapar / patinar
  if (r.grounded && (Math.abs(r.ls) > 3.5 || (input.drift && Math.abs(r.fs) > 5)) && (skidT -= dt) <= 0) {
    skidT = 0.025;
    const yaw = yawOf(c.root.forward, c.pos);
    const fl = floorAt(c.pos.x, c.pos.z);
    for (const w of c.model.wheels) {
      if (!w.front) {
        const wp = w.m.getAbsolutePosition();
        mark("skid", wp, yaw, 1, 7);
        if (!simulating && (fl === "cemento" || fl === "tierra" || zoneId === "garaje")) {
          FX.tireFriction(wp, 2);
        }
      }
    }
    if (!simulating && Math.random() < 0.28) {
      SFX.brakeScreech();
    }
  }
  // Daño visible: humo con media vida, humo negro y chispas con poca
  if (lead.hp < lead.maxHp * 0.5 && (smokeT -= dt) <= 0) {
    smokeT = lead.hp < lead.maxHp * 0.25 ? 0.06 : 0.14;
    const p = c.pos.add(upv(c.pos, 0.6)).addInPlace(c.root.forward.scale(0.6));
    FX.smoke(p, lead.hp < lead.maxHp * 0.25);
    if (lead.hp < lead.maxHp * 0.25 && Math.random() < 0.3) FX.sparks(p);
  }
  if ((dustT -= dt) <= 0 && r.grounded && (Math.abs(r.ls) > 3 || boosting)) { dustT = 0.05; const rear = c.pos.add(c.root.forward.scale(-1.1)); FX.dust(rear); if (boosting) FX.sparks(rear.add(upv(rear, 0.3))); }
  if (boostSec > 1.5 && (motorFxT -= dt) <= 0) {
    motorFxT = 0.08;
    const motorPos = c.pos.add(c.root.forward.scale(-0.45)).addInPlace(new B.Vector3(0, 0.35, 0));
    FX.motorThermalFriction(motorPos, Math.min(2, boostSec - 1.2));
  } else if (boostSec <= 1.5) {
    motorFxT = 0;
  }
  // Embestir objetos del patio los rompe y despide chispas/fricción según el material
  const spd = Math.abs(r.fs);
  if (spd > 9 && (smashCd -= dt) <= 0) {
    const pots = hitBreakables(c.pos, 1.3, spd * c.def.ram * 1.5);
    const heavyHit = hitHeavyProps(c.pos, 1.3, spd);
    if (pots.length || heavyHit) {
      smashCd = 0.25;
      if (pots.length) smashed(pots);
      if (!simulating) {
        if (heavyHit === "drum") {
          SFX.propCrash("drum", spd);
          FX.rustSparks(c.pos, 18);
        } else if (heavyHit === "tire") {
          SFX.propCrash("tire", spd);
          FX.tireFriction(c.pos, 14);
        } else {
          SFX.bodyThud(spd * 0.4);
          FX.rustSparks(c.pos, 14);
          if (spd > 14) FX.tireFriction(c.pos, 10);
        }
      }
    }
  }
  // Destello de chispas bajo el haz del faro al pasar rasante cerca de tambores y chapas en la oscuridad
  if (!simulating && spd > 11 && Math.random() < 0.2) {
    const fwd = c.root.forward;
    for (const hp of heavyProps) {
      if (hp.type === "drum") {
        const d = B.Vector3.Distance(hp.m.position, c.pos);
        if (d > 1.8 && d < 6.5) {
          const toP = hp.m.position.subtract(c.pos).normalize();
          if (B.Vector3.Dot(fwd, toP) > 0.7) {
            FX.sparks(hp.m.position.add(new B.Vector3(0, 1.2, 0)), 3);
            break;
          }
        }
      }
    }
  }
  if (MOON.on ? alt(c.pos) < -5 : Math.abs(c.pos.x) > HALF + 5 || Math.abs(c.pos.z) > HALF + 5 || c.pos.y < -5) lead.hp = 0;

  // --- Aparición de enemigos ---
  // Tope de vivos y ritmo: con el bot que pelea jefes (devbot.ts) quedó en ~50% de victorias (__sim, 40 semillas).
  // ponytail: más densidad casi no baja la tasa (más bichos = más XP); el techo real está en las fusiones repetidas
  const maxAlive = duel >= 0 ? duel : calm ? 0 : Math.min(low ? R.tope_vivos_tactil : R.tope_vivos_pc, (R.tope_vivos_base + tp / R.tope_vivos_seg) * hordeK * TOUGH.count * coopRate()) * (MOON.on ? R.luna_tope_mult : 1); // Horda: +50%. Tope 100 en compu, 60 en táctil
  // Aparecen sesgados hacia donde vas: manejar no es escapar gratis
  const cv = c.body.getLinearVelocity();
  hflat(_spawnOff.copyFrom(cv), c.pos).scaleInPlace(R.spawn_adelanto_s);
  _ahead.copyFrom(c.pos).addInPlace(_spawnOff);
  let normals = 0;
  for (const e of enemies) if (!e.def.boss) normals++;
  spawnAcc += (R.spawn_base + tp / R.spawn_seg) * wdt * hordeK * TOUGH.count * coopRate() * (MOON.on ? R.luna_aparicion_mult : 1);
  // Con la cámara más alejada que el zoom por defecto (1.35) el anillo de aparición se abre igual, para no verlos nacer
  // Anillo fijo, fuera de cuadro aun con el zoom máximo (2): la partida no cambia según el zoom elegido
  while (spawnAcc >= 1) { spawnAcc--; if (normals < maxAlive) spawnEnemy(pickWeighted(spawnTable(tp, profile.plague)), spawnPoint(ms.length && (spawnN = (spawnN + 1) % (ms.length + 1)) ? ms[spawnN - 1].car!.pos : _ahead, R.spawn_anillo_min, R.spawn_anillo_max)); } // R7a: con 2 autos, una aparición alrededor de cada uno
  // Formaciones: columna de hormigas (ordenadas tras una líder) o escarabajo con escolta de autitos a fricción
  if (tp > R.formacion_desde_s && (groupT -= dt) <= 0 && normals < maxAlive - R.formacion_margen) {
    groupT = R.formacion_cada_min + rng() * R.formacion_cada_rango;
    const p0 = spawnPoint(_ahead, R.spawn_anillo_min, R.spawn_anillo_max), ant = tp < R.formacion_hormiga_hasta_s || rng() < R.formacion_hormiga_prob;
    spawnEnemy(ant ? "hormiga" : "escarabajo", p0);
    const lead = enemies[enemies.length - 1];
    const n = ant ? R.formacion_hormigas_base + Math.floor(tp / R.formacion_hormigas_seg) : R.formacion_escolta;
    for (let i = 1; i <= n; i++) {
      const a = (i / n) * 6.28, slot = ant ? new B.Vector3(0, 0, 1.8 * i) : new B.Vector3(Math.sin(a) * 4.5, 0, Math.cos(a) * 4.5);
      spawnEnemy(ant ? "hormiga" : "friccion", at(p0, slot.x, 0, -slot.z));
      const f = enemies[enemies.length - 1];
      f.leader = lead; f.slot.copyFrom(slot); f.spd = R.formacion_vel;
    }
    if (!simulating) banner(ant ? "COLUMNA" : "ESCOLTA", 1.2);
  }
  if (!evtPre.swarm && swarmT > 0 && swarmT <= warnS) { evtPre.swarm = true; radioEvent("enjambre_pre"); }
  if (erun?.phase === "overload" && (ovT -= dt) <= 0) { ovT = E.ENC.overloadEvery; swarmT = 0; } // OVERLOAD: enjambres seguidos durante la carga
  if ((swarmT -= dt) <= 0) {
    evtPre.swarm = false;
    swarmT = profile.swarmEvery;
    radioEvent("enjambre");
    const ov = erun?.phase === "overload", ns0 = Math.round((R.enjambre_base + tp / R.enjambre_seg) * hordeK * TOUGH.count * coopRate() * (ov ? E.ENC.overloadK : 1)), ns = ov ? Math.min(ns0, E.ENC.overloadMax) : ns0; // el enjambre crece con la partida
    for (let i = 0; i < ns; i++) { const a = (i / ns) * Math.PI * 2; const p = MOON.on ? ringAt(c.pos, a, R.enjambre_radio) : new B.Vector3(c.pos.x + Math.cos(a) * R.enjambre_radio, 1, c.pos.z + Math.sin(a) * R.enjambre_radio); if (Math.abs(p.x) < HALF - 3 && Math.abs(p.z) < HALF - 3) spawnEnemy("hormiga", p); }
  }
  if (time - Math.max(hitAt, 300) >= 60) grant("intacto"); // 60 s sin daño, contando desde el minuto 5
  const bossWarnS = R.aviso_jefe_s;
  for (let bi = bossIdx; bi < RUN_BOSSES.length; bi++) {
    const [bt, bk] = RUN_BOSSES[bi];
    if (!evtPre.boss.has(bi) && time >= bt - bossWarnS && time < bt) {
      evtPre.boss.add(bi);
      const fin = !endless && bi === RUN_BOSSES.length - 1 && bk === finalKind;
      if (!simulating && erun?.phase === "final") say("boss_intro"); // FINAL ACT: la presentación la hace el Director
      else if (!simulating) radioBoss("pre", MOON.on && bk !== finalKind ? SHIP_NAME[minorShip(bi)] : DEF[bk].name, fin); // luna: los minijefes son naves
    }
  }
  // Apagón: 4 s antes de cada jefe se apagan luna y ambiente (queda el faro); vuelve en 3 s tras la entrada
  if (!simulating) {
    const next = RUN_BOSSES[bossIdx]?.[0] ?? Infinity, prev = RUN_BOSSES[bossIdx - 1]?.[0] ?? -Infinity;
    const d = Math.max(Math.min(1, Math.max(0, (time - next + 4) / 1.5)), Math.max(0, 1 - (time - prev) / 3));
    if (d > 0 || darkK < 1) { darkK = 1 - 0.88 * d; setDark(darkK); }
    if (!apagon && time >= next - 4) { apagon = true; banner("APAGÓN, SIN SERVICIO", 2); }
  }
  if (bossIdx < RUN_BOSSES.length && time >= RUN_BOSSES[bossIdx][0]) {
    apagon = false;
    const kind = RUN_BOSSES[bossIdx++][1], ship = MOON.on && kind !== finalKind ? minorShip(bossIdx - 1) : null; // luna: minijefe = nave (moon_ships.ts)
    if (ship) shipSpawn(ship, c.pos, time); else spawnEnemy(kind, spawnPoint(c.pos, 30, 36));
    if (MOON.on && kind === finalKind && !endless && !erun) rocketLand(c.pos, simulating); // luna: con el gusano aterriza el cohete de escape (moon_goals.ts)
    if (endless) { // modo sin fin: otro jefe repetido en 2 min (rotan los tres de la partida) y cada vez con más vida
      RUN_BOSSES.push([time + R.sinfin_cada_s, RUN_BOSSES[RUN_BOSSES.length % 3][1]]);
      if (!ship) { const b = enemies[enemies.length - 1]; b.hp = b.maxHp *= time / R.sinfin_vida_div; }
    }
    const bname = ship ? SHIP_NAME[ship] : DEF[kind].name;
    const fin = !endless && kind === finalKind;
    if (!simulating) radioBoss("now", bname, fin);
    banner(bname, 2.5);
    hudBoss(bname, 1, ship ? undefined : kind);
    SFX.boss();
  }
  for (let ei = 0; ei < profile.elites.length; ei++) {
    const [t, k] = profile.elites[ei];
    if (!evtPre.elites.has(ei) && time >= t - warnS && time < t) {
      evtPre.elites.add(ei);
      radioEvent(k === "rapida" ? "elite_rapida_pre" : "elite_blindada_pre");
    }
  }
  // Élites (run.ts: 2-3 por partida, sin rng): la aparición común más reciente (mejor si no es hormiga) se vuelve élite
  for (const [t, k] of profile.elites) if (t <= time && t > time - dt) {
    let e: Enemy | undefined, fallback: Enemy | undefined;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const x = enemies[i];
      if (x.def.boss || x.elite) continue;
      fallback ??= x;
      if (x.kind !== "hormiga") { e = x; break; }
    }
    e ??= fallback;
    if (e) { e.makeElite(k); radioEvent(k === "rapida" ? "elite_rapida" : "elite_blindada"); }
  }

  // --- Enemigos ---
  const carR = Math.max(c.def.size[0], c.def.size[2]) / 2;
  let contactHit = 0, contactBy: Kind | undefined;
  const mateHit = ms.map(() => 0), mcv = ms.map((m) => m.car!.body.getLinearVelocity()), mateR = ms.map((m) => Math.max(m.car!.def.size[0], m.car!.def.size[2]) / 2);
  for (const e of enemies) {
    // En formación va al lugar que le toca junto a su líder; cerca del auto (o sin líder) ataca por su cuenta
    let d1 = hd(e.pos, c.pos), m1 = Infinity, near = c.pos; // R7a/c: persigue al auto vivo más cercano
    for (const m of ms) { const d = hd(e.pos, m.car!.pos); if (d < m1) { m1 = d; if (d < d1) near = m.car!.pos; } }
    const nd = Math.min(d1, m1);
    const ld = e.leader && e.leader.hp > 0 && nd > 14 ? e.leader : null;
    if (e.leader && !ld && nd <= 14) e.leader = null;
    const tgt = ld ? ld.pos.add(ld.node.right.scale(e.slot.x)).addInPlace(ld.node.forward.scale(-e.slot.z)) : near;
    const ev = e.stun > 0 && e.kind !== "gusano" ? stunned(e, wdt) : e.update(wdt, tgt); // el gusano no se aturde (lo mueve su IA, también enterrado)
    if (ev === "spit_aim" && !simulating) { const f = e.node.forward; FX.sparks(e.pos.add(upv(e.pos, 0.5))); mark("scorch", e.pos, yawOf(f, e.pos), 0.35, 4); }
    if (ev === "worm_up" || ev === "worm_down") { // gusano lunar (moon_worm.ts): cráter al salir y al hundirse; al salir golpea lo que esté encima
      deform(e.land, ATK.gusano_aviso_radio, ATK.gusano_crater_hondo); craterHumeante(e.land, ATK.gusano_aviso_radio, !simulating);
      if (!simulating) { FX.dust(e.land); FX.sparks(onFloor(e.land, 0.5), 14); shake = Math.max(shake, 0.4); }
      if (ev === "worm_up") ms.forEach((m, j) => hd(m.car!.pos, e.land) < ATK.gusano_aviso_radio + mateR[j] && mateHurt(m, e.def.dmg * TOUGH.dmg * (e.enraged ? ATK.segunda_barra_dano : 1))); // R7b/c: también a los otros autos
      if (ev === "worm_up" && hd(c.pos, e.land) < ATK.gusano_aviso_radio + carR) hurt(e.def.dmg * TOUGH.dmg * (e.enraged ? ATK.segunda_barra_dano : 1), false, "salida " + e.kind, e.kind);
    }
    if (ev === "boom") { boom(e); e.hp = -1e9; continue; } // explosivo alien (aliens.ts): se fue sin dejar premio
    if (e.kind === "curandero" && e.stun <= 0) healTick(e, enemies, wdt, !simulating); // rayo que cura (aliens.ts)
    if (ev === "wave") { pushSpit(alienWave(e, c.pos)); if (!simulating) SPACE.alienWave(panTo(c.pos, e.pos, camYaw), hd(c.pos, e.pos)); } // tirador de onda (aliens.ts): anillo lento, se esquiva
    if (ev === "spit") {
      // Apunta adonde vas a estar (predicción simple): esquivar = cambiar de rumbo
      const cvl = c.body.getLinearVelocity(), from = at(e.pos, 0, 0.6, 0);
      const t = B.Vector3.Distance(from, c.pos) / ATK.acido_vel, aim = c.pos.add(hflat(cvl.clone(), c.pos).scale(t * 0.8));
      const m = spitTpl().createInstance("sp");
      m.position.copyFrom(from);
      pushSpit({ m, v: aim.subtract(from).normalize().scale(ATK.acido_vel), life: 2.2, k: e.kind });
    }
    if (e.stun <= 0) e.animate(wdt);
    if (e.phaseUp) { e.phaseUp = false; banner(`${e.def.name} PIERDE LA PACIENCIA`, 2); shake = Math.max(shake, 1); SFX.boss(); }
    if (ev === "meow") { // Eulalio llama polillas alrededor suyo
      banner("¡MIAU!", 1.2);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.28 + rng(); spawnEnemy("polilla", at(e.pos, Math.sin(a) * 6, 0, Math.cos(a) * 6)); }
    }
    if (ev === "slam") {
      FX.slam(e.pos, 10);
      mark("scorch", e.pos, 0, 7, 10);
      shake = 1.2;
      if (B.Vector3.Distance(e.pos, c.pos) < ATK.salto_radio) hurt(ATK.salto_dano, false, "salto " + e.kind, e.kind);
      for (const o of enemies) if (o !== e && B.Vector3.Distance(o.pos, e.pos) < ATK.salto_aplasta_radio) damage(o, 999);
    }
    // Jefes finales nuevos (enemies.ts): tuercas en abanico, barrido en arco, cables y succión
    if (ev === "fan") for (const d of e.fan) { const m = nutTpl().createInstance("nut"); at(e.pos, d.x * 3.4, 0.7, d.z * 3.4, m.position); pushSpit({ m, v: W(d.x, d.y, d.z, e.pos).scale(ATK.acido_vel), life: 2.2, k: e.kind }); } // e.fan: marco local del jefe
    if (ev === "slash") { hurt(ATK.cortacercos_barrido_dano, false, "barrido " + e.kind, e.kind); FX.sparks(c.pos); }
    if (ev === "shock") { hurt(ATK.cortacercos_cable_dano, false, "cables", e.kind); FX.sparks(c.pos); }
    if (e.pull && e.stun <= 0) { const d = hflat(e.pos.subtract(c.pos), c.pos).normalize().scaleInPlace(e.pull * wdt); c.body.setLinearVelocity(c.body.getLinearVelocity().addInPlace(d)); }
    const dist = hd(e.pos, c.pos);
    if (!e.def.boss && !e.elite && ms.reduce((d, m) => Math.min(d, hd(e.pos, m.car!.pos)), dist) > R.reciclar_distancia) { e.hp = -1e9; continue; } // muy lejos: se recicla (la élite no: lleva cofre)
    if (e.kind === "cortadora" && e.stun <= 0) for (const o of enemies) if (o !== e && !o.def.boss && B.Vector3.Distance(o.pos, e.pos) < e.radius + 0.5) damage(o, 999); // corta todo
    if (dist < e.radius + carR && rad(c.pos) - rad(e.pos) < e.def.size[1] + 0.5) {
      const dir = hflat(e.pos.subtract(c.pos), c.pos).normalize();
      const rel = B.Vector3.Dot(cv, dir); // solo cuenta TU velocidad hacia el enemigo
      if (rel > R.embestida_vel_min && e.ramCd <= 0) {
        const lanza = weapons.find((w) => w.id === "lanza");
        const dmg = rel * c.def.ram * (1 + BAL.armas.lanza.dano_nivel * (lanza?.lv ?? 0)) * (boosting ? (c.kind === "axel" ? R.embestida_turbo_axel : R.embestida_turbo) : 1) * st.dmg * st.ram * (lanza?.evolved ? BAL.armas.lanza.dano_evo_mult : 1);
        dmgSrc = "embestida";
        damage(e, dmg, dir.scale(rel * 0.8).addInPlace(upv(e.pos, rel * 0.2)), true);
        FX.sparks(e.pos.add(upv(e.pos, 0.5)));
        SFX.ram(rel);
        if ((e.def.boss || e.elite || e.def.mass > 50) && rel > 3.5) {
          const pan = panTo(c.pos, e.pos, camYaw); // luna: en el marco local del auto
          SFX.bodyThud(rel, pan);
        }
        e.ramCd = R.embestida_recarga_s;
        shake = Math.max(shake, 0.25);
        if (ariete) explode(e.pos, BAL.armas.lanza.area_evo, dmg * BAL.armasExtra.lanza_ariete_dano);
        dmgSrc = "";
        // Embestir algo más pesado que vos tiene costo: rebote y daño (salvo Ariete)
        if (e.def.mass > c.def.mass * st.mass * R.embestida_rebote_masa && !ariete) {
          if (e.touchCd <= 0) { hurt(e.def.dmg * R.contacto_dano * TOUGH.dmg, false, "rebote " + e.kind, e.kind); e.touchCd = R.contacto_recarga_s; }
          c.body.applyImpulse(dir.scale(-rel * R.embestida_rebote * c.def.mass).addInPlace(upv(c.pos, R.embestida_rebote_y)), c.pos);
        }
      } else if (rel <= R.embestida_vel_min && !(ariete && boosting) && e.touchCd <= 0 && e.stun <= 0) {
        const cd = e.def.dmg * R.contacto_dano * (e.def.boss ? 1 : TOUGH.dmg);
        if (cd > contactHit) contactBy = e.kind;
        contactHit = Math.max(contactHit, cd); // el golpe más fuerte, no la suma
        e.touchCd = R.contacto_recarga_s;
        if (!e.def.boss) e.body.applyImpulse(dir.scale(R.contacto_empuje_bicho * e.def.mass), e.pos);
        // Un jefe te despide lejos: nunca quedás atrapado contra él
        if (e.def.boss) {
          c.body.applyImpulse(dir.scale(-R.contacto_jefe_empuje * c.def.mass).addInPlace(upv(c.pos, 4 * c.def.mass)), c.pos);
          const pan = panTo(c.pos, e.pos, camYaw); // luna: en el marco local del auto
          SFX.bodyThud(6, pan);
        } else if (e.elite) {
          const pan = panTo(c.pos, e.pos, camYaw); // luna: en el marco local del auto
          SFX.bodyThud(4, pan);
        }
      }
    }
    for (let j = 0; j < ms.length; j++) { const mc = ms[j].car!; if (!(e.hp > 0 && hd(e.pos, mc.pos) < e.radius + mateR[j] && rad(mc.pos) - rad(e.pos) < e.def.size[1] + 0.5)) continue; // R7a/c: los otros autos embisten o reciben el contacto (sin rebote ni Ariete)
      const dir = hflat(e.pos.subtract(mc.pos), mc.pos).normalize(), rel = B.Vector3.Dot(mcv[j], dir);
      if (rel > R.embestida_vel_min && e.ramCd <= 0) { dmgSrc = "embestida"; damage(e, rel * mc.def.ram * st.dmg * st.ram, dir.scale(rel * 0.8).addInPlace(upv(e.pos, rel * 0.2)), true); dmgSrc = ""; e.ramCd = R.embestida_recarga_s; SFX.ram(rel); }
      else if (rel <= R.embestida_vel_min && e.touchCd <= 0 && e.stun <= 0) { mateHit[j] = Math.max(mateHit[j], e.def.dmg * R.contacto_dano * (e.def.boss ? 1 : TOUGH.dmg)); e.touchCd = R.contacto_recarga_s; }
    }
  }
  for (const m of others()) if ((m.touch -= dt) <= 0 && mateHit[ms.indexOf(m)]) { mateHurt(m, mateHit[ms.indexOf(m)]); m.touch = R.contacto_invuln_s; SFX.hurt(); }
  // Invulnerabilidad de contacto: como mucho un golpe cada 0,5 s aunque te rodeen
  if ((touchIFrame -= dt) <= 0 && contactHit) {
    hurt(contactHit, true, contactBy ? "contacto " + contactBy : "contacto", contactBy);
    SFX.hurt();
    if (contactHit > 8) SFX.bodyThud(contactHit * 0.4);
    if (MOON.on) { // luna: el mismo empujón con vectores del plano tangente del auto
      const P = new B.Vector3(); let n = 0;
      for (const e of enemies) { if (e.def.boss || e.hp <= 0 || hd(e.pos, c.pos) > carR + e.radius + 0.5) continue; P.addInPlace(c.pos.subtract(e.pos)); n++; }
      hflat(P, c.pos);
      if (n > 0) {
        P.scaleInPlace(1 / (P.length() || 1));
        c.body.applyImpulse(P.scale(R.contacto_empuje_auto * c.def.mass * (1 + 0.15 * Math.min(n - 1, 6))), c.pos);
        const vel = c.body.getLinearVelocity(), inward = -B.Vector3.Dot(vel, P);
        if (inward > 0) c.body.setLinearVelocity(vel.addInPlace(P.scale(inward * 0.45)));
      }
    } else {
    let px = 0, pz = 0, n = 0;
    for (const e of enemies) {
      if (e.def.boss || e.hp <= 0) continue;
      if (hd(e.pos, c.pos) > carR + e.radius + 0.5) continue;
      px += c.pos.x - e.pos.x; pz += c.pos.z - e.pos.z; n++;
    }
    if (n > 0) {
      const len = Math.hypot(px, pz) || 1, ux = px / len, uz = pz / len;
      const imp = R.contacto_empuje_auto * c.def.mass * (1 + 0.15 * Math.min(n - 1, 6));
      c.body.applyImpulse(new B.Vector3(ux * imp, 0, uz * imp), c.pos);
      const vel = c.body.getLinearVelocity(), inward = -(vel.x * ux + vel.z * uz);
      if (inward > 0) c.body.setLinearVelocity(new B.Vector3(vel.x + ux * inward * 0.45, vel.y, vel.z + uz * inward * 0.45));
    }
    }
    touchIFrame = R.contacto_invuln_s;
  }
  // Bichos normales cerca del auto: no se amontonan en un solo punto
  const sepR = R.enemigo_separacion, sepR2 = sepR * sepR;
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    if (a.def.boss || a.elite || a.hp <= 0 || hd(a.pos, c.pos) > 14) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j];
      if (b.def.boss || b.elite || b.hp <= 0) continue;
      if (MOON.on) { // luna: separación en 3D (los vecinos están a 1-2 m: la cuerda es el plano tangente)
        const D = b.pos.subtract(a.pos), d2 = D.lengthSquared();
        if (d2 < 1e-4 || d2 > sepR2) continue;
        const d = Math.sqrt(d2); D.scaleInPlace(((sepR - d) / sepR) * 12 * wdt / d);
        a.body.applyImpulse(D.scale(-a.def.mass), a.pos); b.body.applyImpulse(D.scale(b.def.mass), b.pos);
        continue;
      }
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d2 = dx * dx + dz * dz;
      if (d2 < 1e-4 || d2 > sepR2) continue;
      const d = Math.sqrt(d2), k = ((sepR - d) / sepR) * 12 * wdt;
      a.body.applyImpulse(new B.Vector3(-(dx / d) * k * a.def.mass, 0, -(dz / d) * k * a.def.mass), a.pos);
      b.body.applyImpulse(new B.Vector3((dx / d) * k * b.def.mass, 0, (dz / d) * k * b.def.mass), b.pos);
    }
  }
  for (let i = enemies.length - 1; i >= 0; i--) { // jefe final: la primera barra vacía no lo mata
    const e = enemies[i];
    if (e.hp > 0 || e.rearm()) continue;
    enemies.splice(i, 1);
    if (e.hp < -1e8) e.dispose(); else kill(e);
    if (state !== "play") return;
  }
  if (guestE && !enemies.includes(guestE)) { guestE = null; if (erun) encApply(E.guestDown(erun)); } // BOSS_GUEST: el invitado cayó
  const boss = enemies.find((e) => e.def.boss);
  const gb = (MOON.on || erun) && lead.car ? goalBar(lead.car.pos) : null; // luna: progreso de la antena o del cohete en la barra de jefe
  if (gb) hudBoss(gb.name, gb.pct);
  else if (boss) hudBoss(boss.def.name, Math.max(0, boss.hp / boss.maxHp), boss.kind, boss.enraged);
  else { const sb = MOON.on ? shipBar() : null; hudBoss(sb?.name ?? null, sb?.pct); } // naves de la luna: misma barra de jefe; sin nada, la barra se va (si no, quedaba la del último cofre o máquina)
  { const ms = boss ? "boss" : apagon ? "blackout" : "run"; if (!simulating && (ms !== musicS || (musicT -= dt) <= 0)) { musicS = ms; musicT = 1; music(ms, time / 600); } } // música: cambio de estado al instante, intensidad cada ~1 s

  // --- Ácido de escupidoras ---
  for (let i = spits.length - 1; i >= 0; i--) {
    const s = spits[i];
    if (MOON.on && s.float) advance(s.m.position, s.v, wdt); // onda alien: pegada a la curva; advance recorre d·|v|: con v sin normalizar, d = wdt
    else if (MOON.on) { // ácido y tuercas: avance por la curva + caída hacia el centro (la misma cuenta que el v.y -= 3·dt del patio)
      const p = s.m.position, vr = B.Vector3.Dot(s.v, upAt(p)) - 3 * wdt;
      advance(p, hflat(s.v, p), wdt);
      const u = upAt(p); p.addInPlace(u.scale(vr * wdt)); s.v.addInPlace(u.scaleInPlace(vr));
    }
    else { s.m.position.addInPlace(s.v.scale(wdt)); s.v.y -= 3 * wdt; }
    let dead = (s.life -= wdt) <= 0 || below(s.m.position, 0.1);
    if (B.Vector3.Distance(s.m.position, c.pos) < carR + 0.3) { hurt(ATK.acido_dano, false, "ácido", s.k); FX.hit(s.m.position); dead = true; }
    else { const j = ms.findIndex((m, k) => B.Vector3.Distance(s.m.position, m.car!.pos) < mateR[k] + 0.3); if (j >= 0) { mateHurt(ms[j], ATK.acido_dano); FX.hit(s.m.position); dead = true; } }
    if (dead) { mark("scorch", s.m.position, Math.random() * 6, 0.6, 5); s.m.dispose(); spits.splice(i, 1); }
  }
  if (MOON.on && !calm) skyTick(wdt, time, carPs, simulating ? null : cam, hurtWho, enemies, camYaw); // luna: el Sol y la Tierra lanzan bichos (moon_sky.ts)

  // --- Armas ---
  if (MOON.on && !calm) shipsTick(dt, time, cars, simulating, camYaw); // naves alienígenas (moon_ships.ts): nodriza recurrente y minijefes
  if ((MOON.on || erun) && !calm) { goalsTick(dt, time, carPs, simulating); if (state !== "play") return; } // objetivos y cohete (moon_goals.ts); el cohete puede ganar la partida
  const ctx: Ctx = { scene, car: c, enemies: MOON.on ? shipTargets(enemies.some((e) => e.kind === "gusano" && !wormOut(e)) ? enemies.filter((e) => e.kind !== "gusano" || wormOut(e)) : enemies, c.pos) : enemies, dt, st, fs: r.fs, damage, explode };
  for (const w of weapons) { dmgSrc = w.id; w.update(ctx); }
  for (const m of ms) { const mctx: Ctx = { ...ctx, car: m.car!, fs: m.fs }; for (const w of m.weapons) { dmgSrc = w.id; w.update(mctx); } } // R7a/c: los otros autos disparan copias de las mismas armas desde su lugar
  dmgSrc = "";

  // --- Recolección ---
  const mag2 = st.magnet * st.magnet;
  const fwdFlat = c.root.forward.clone(); fwdFlat.y = 0;
  if (fwdFlat.lengthSquared() > 1e-6) fwdFlat.normalize();
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i];
    if (MOON.on) { // luna: lo mismo con la altura sobre el piso del lugar y el imán por la superficie
      const gp = g.m.position, D = hflat(c.pos.subtract(gp), gp), d2 = D.lengthSquared();
      if (d2 < mag2) g.pull = true;
      g.m.rotation.y += dt * 2;
      let h = Math.max(0, alt(gp));
      if (g.vy !== 0 || h > 0) { g.vy -= 22 * dt; h = Math.max(0, h + g.vy * dt); if (h === 0) g.vy = g.vy < -4 ? -g.vy * 0.35 : 0; }
      if (g.pull) { const d = Math.sqrt(d2) || 0.01; advance(gp, D.scale(1 / d), Math.min(d, (22 + 28 / (d + 0.5)) * dt)); }
      onFloor(gp, h, gp); orient(g.m);
      if (!simulating) {
        const gl = Math.sqrt(d2), f = c.root.forward, lampK = gl > 0.4 && gl < 20 ? Math.max(0, -B.Vector3.Dot(f, D) / gl) * (1 - gl / 20) : 0;
        g.m.scaling.setAll((g.xp === 20 ? 1.5 : g.xp === 5 ? 1.05 : 0.95) * (1 + lampK * 0.24 + (g.pull ? 0.08 : 0)));
      }
      if (d2 < 1.2 || ms.some((m) => B.Vector3.DistanceSquared(gp, m.car!.pos) < 1.5)) { gainXp(g.xp); SFX.gem(); if (g.xp > 1) FX.xp(gp); g.m.dispose(); gems.splice(i, 1); } // R7a: XP compartida, junta cualquiera de los dos
      continue;
    }
    const dx = c.pos.x - g.m.position.x, dz = c.pos.z - g.m.position.z, d2 = dx * dx + dz * dz;
    if (d2 < mag2) g.pull = true;
    g.m.rotation.y += dt * 2;
    if (g.vy !== 0 || g.m.position.y > 0) { g.vy -= 22 * dt; g.m.position.y = Math.max(0, g.m.position.y + g.vy * dt); if (g.m.position.y === 0) g.vy = g.vy < -4 ? -g.vy * 0.35 : 0; } // rebota una o dos veces
    if (g.pull) { const d = Math.sqrt(d2) || 0.01, sp = Math.min(d, (22 + 28 / (d + 0.5)) * dt); g.m.position.x += (dx / d) * sp; g.m.position.z += (dz / d) * sp; }
    if (!simulating) {
      const gl = Math.sqrt(d2), lampK = gl > 0.4 && gl < 20 && fwdFlat.lengthSquared() > 0 ? Math.max(0, (fwdFlat.x * (-dx) + fwdFlat.z * (-dz)) / gl) * (1 - gl / 20) : 0;
      const base = g.xp === 20 ? 1.5 : g.xp === 5 ? 1.05 : 0.95;
      g.m.scaling.setAll(base * (1 + lampK * 0.24 + (g.pull ? 0.08 : 0)));
    }
    if (d2 < 1.2) { gainXp(g.xp); SFX.gem(); if (g.xp > 1) FX.xp(g.m.position); g.m.dispose(); gems.splice(i, 1); }
  }
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.m.rotation.y += dt * 2; orient(p.m);
    const byMate = B.Vector3.Distance(p.m.position, c.pos) >= 2.2 ? ms.findIndex((m) => B.Vector3.Distance(p.m.position, m.car!.pos) < 2.2) + 1 : 0; // R7a/c: la pila cura a quien la junta (1.. = índice en ms + 1)
    if (byMate || B.Vector3.Distance(p.m.position, c.pos) < 2.2) {
      SFX.pickup();
      if (p.type === "pila" && byMate) ms[byMate - 1].hp = Math.min(lead.maxHp, ms[byMate - 1].hp + R.pila_cura);
      else if (p.type === "pila") lead.hp = Math.min(lead.maxHp, lead.hp + R.pila_cura);
      else if (p.type === "iman") for (const g of gems) g.pull = true;
      else openChest(byMate);
      p.m.dispose();
      pickups.splice(i, 1);
      if (state !== "play") return;
    }
  }

  // --- Eventos del patio ---
  if ((chestT -= dt) <= 0) { chestT = profile.chestEvery; dropPickup(spawnPoint(c.pos, 20, 35), "cofre"); radioEvent("cofre"); }
  if (!evtPre.ball && !ball && ballT > 0 && ballT <= warnS) { evtPre.ball = true; radioEvent("pelota_pre"); }
  if ((ballT -= dt) <= 0 && !ball) {
    evtPre.ball = false;
    // Una pelota gigante cruza el patio aplastando todo
    ballT = profile.ballEvery;
    const from = spawnPoint(c.pos, 40, 45);
    const m = sph(R.pelota_diametro, pbr("bigball", { color: "#f97316", rough: 0.45 }), [from.x, 4, from.z], undefined, 16);
    if (MOON.on) onFloor(from, 4, m.position); // antes del cuerpo físico
    shadows.addShadowCaster(m);
    const agg = new B.PhysicsAggregate(m, B.PhysicsShapeType.SPHERE, { mass: R.pelota_masa, restitution: 0.5 }, scene);
    FOOT.set(agg.body, R.pelota_diametro / 2); ROLL.add(agg.body); // luna: rueda (moon.ts)
    agg.body.setLinearVelocity((MOON.on ? hflat(c.pos.subtract(from), from) : c.pos.subtract(from)).normalize().scale(R.pelota_vel));
    ball = { m, agg, life: R.pelota_vida_s };
    radioEvent("pelota");
  }
  if (ball) {
    dmgSrc = "pelota";
    for (const e of enemies) if (!e.def.boss && B.Vector3.Distance(e.pos, ball.m.position) < R.pelota_diametro / 2 + e.radius) damage(e, 999);
    dmgSrc = "";
    if (!ball.hit && B.Vector3.Distance(c.pos, ball.m.position) < R.pelota_diametro / 2 + carR) { ball.hit = true; hurt(R.pelota_dano, false, "pelota"); }
    if ((ball.life -= wdt) <= 0) { ball.agg.dispose(); ball.m.dispose(); ball = null; }
  }

  lead.hp = Math.min(lead.maxHp, lead.hp + st.regen * dt);
  if (lead.hp <= 0 && revives > 0) { revives--; lead.hp = lead.maxHp * R.revive_vida; explode(c.pos, R.revive_radio, R.revive_dano); banner("PRÓRROGA: BATERÍA DE RESERVA", 2); }
  for (const m of others()) if (m.car && m.hp <= 0) mateDown(m); // R7a: el compañero cae y vuelve en el escenario siguiente
  if (lead.hp <= 0 && liveM().length) mateLead(); // R7a: cae el que guía; el otro sigue y toma su lugar (armas, cámara y XP compartidas)
  if (lead.hp <= 0) return endless ? endRun(true, "El auto quedó destrozado en el modo sin fin. Las horas extra no se pagan.") : endRun(false, "El auto quedó destrozado. Se aceptan reclamos, pero nadie los lee.");
  if (pendingLevels > 0 && state === "play") { pendingLevels--; openOffers(offersFor(), `Nivel ${level - pendingLevels}`); }
}

let god = false; // solo dev
let lampBoost = false, moteT = 0, flyT = 0;
let rainK = 0, rainBanner = false; // lluvia: intensidad 0..1 y aviso ya mostrado
let yardPulseIdx = 0, yardPulseT = 0;
const YARD_PULSES = [225, 345] as const;
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
const dmgBy: Record<string, number> = {}; // solo dev: de dónde viene el daño
/** Daño de los eventos de la luna al auto `who` (0 = el que guía, 1 = el otro; R7b). */
function hurtWho(n: number, continuous: boolean, src: string, who: number) { hurtP(who ? liveM()[who - 1] : lead, n, continuous, src); }
function hurt(n: number, continuous = false, src = "?", by?: Kind) {
  if (god || (abil === "escudo" && abilOn > 0)) return; // escudo: invulnerable
  if (by && DEF[by].final && enemies.some((e) => e.kind === by && e.enraged)) n *= ATK.segunda_barra_dano; // segunda barra: pega más fuerte
  if (by && !simulating && !LAB.on) beastRec(by).hurt += n * (1 - st.armor); // daño recibido por tipo (ficha del bestiario)
  airHit = true;
  if (driveMul > 1) { driveMul = 1; hudDrive(1); } // el combo de manejo cae con cualquier golpe
  hitAt = time;
  dmgBy[src] = (dmgBy[src] ?? 0) + n * (1 - st.armor);
  lead.hp -= n * (1 - st.armor);
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
  const a = ABILITIES[abil];
  const k = abilK(abilLv); // nivel del Taller: más petardos, más segundos de escudo y de cámara lenta, más aturdido
  abilCar = c;
  abilCd = abilCdOf(abil, abilLv); abilOn = a.dur * (abil === "escudo" || abil === "lenta" ? k : 1);
  if (abil === "bombardeo") { bombs = Math.round(R.bombardeo_petardos * k); bombT = 0; }
  else if (abil === "escudo") {
    if (!shieldM) { shieldM = sph(Math.max(...c.def.size) * 1.5, pbr("escudo", { color: "#8dff6a", emissive: "#3f9a2a", alpha: 0.18 }), [0, 0.2, 0]); shieldM.parent = c.root; shieldM.isPickable = false; }
    shieldM.parent = c.root; shieldM.isVisible = true; // R7b: en el auto de quien la disparó
    SFX.pickup();
  } else if (abil === "emp") {
    for (const e of enemies) if (!e.def.boss && !e.airborne && B.Vector3.Distance(e.pos, c.pos) < R.emp_radio + e.radius) e.stun = R.emp_aturde_s * k;
    if (!simulating) burst(c.pos.add(upv(c.pos, 0.6)), { n: 90, color: "#8dff6a", color2: "#6fb3c4", size: [0.2, 0.6], power: [14, 22], life: [0.25, 0.5], gravity: 0 });
    SFX.zap(); shake = Math.max(shake, 0.4);
  } else { worldK = R.lenta_mundo; fxSpeed(R.lenta_mundo); }
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
    if (worldK === 1 || !lead.car) return step0(d);
    const k = worldK, bs = [lead.car.body, ...liveM().map((m) => m.car!.body)]; // R7a/c: todos los autos van a velocidad real
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
function trick(name: string, k: number) { trickT = 0; driveMul = Math.min(R.combo_tope, driveMul + k); bestDriveMul = Math.max(bestDriveMul, driveMul); if (!simulating) hudDrive(driveMul, name); }

// ---------- Modo sin fin: "Seguir jugando" en los resultados tras vencer al jefe final ----------
function goEndless() {
  if (state !== "over" || endless || !lead.car || !bank) return;
  endless = true; runDist = 0; // lo manejado hasta acá ya se sumó a las estadísticas
  state = "play"; scene.physicsEnabled = true; reset(null);
  music("run", 1); musicS = "run";
  $("hud").classList.remove("hidden");
  RUN_BOSSES.push([time + R.sinfin_cada_s, RUN_BOSSES[RUN_BOSSES.length % 3][1]]);
  banner("MODO SIN FIN: HORAS EXTRA", 2.5);
}

let hudT = 0, hudSlotF = 0, lastKmh = 0, lastMaxKmh = 80;
function updateHud(dt: number) {
  if (!low || (hudSlotF++ & 1) === 0) hudSlots(weapons.map((w) => ({ id: w.id, lv: w.lv, evolved: w.evolved, cd: w.cdFrac })), (Object.entries(passives) as [PassiveId, number][]).map(([id, lv]) => ({ id, lv })));
  // Flechas hacia jefes y cofres fuera de pantalla
  const W = engine.getRenderWidth(), H = engine.getRenderHeight(), k = innerWidth / W, out: { x: number; y: number; kind: "jefe" | "cofre"; dist?: number }[] = [];
  const targets: [B.Vector3, "jefe" | "cofre"][] = [...enemies.filter((e) => e.def.boss).map((e) => [e.pos, "jefe"] as [B.Vector3, "jefe"]), ...pickups.filter((p) => p.type === "cofre").map((p) => [p.m.position, "cofre"] as [B.Vector3, "cofre"])];
  for (const [p, kind] of targets) {
    const sp = toScreen(p);
    let x = sp.x, y = sp.y;
    if (sp.z > 1) { x = W - x; y = H; } // detrás de la cámara
    if (sp.z > 1 || x < 0 || x > W || y < 0 || y > H) out.push({ x: x * k, y: y * k, kind, dist: Math.round(hd(p, lead.car!.pos)) });
  }
  hudArrows(out);
  if ((hudT -= dt) > 0) return;
  hudT = 0.05;
  // Luna: el radar es el plano local del auto (el auto en el centro, cada punto con su rumbo y su distancia por la superficie)
  const xz = MOON.on ? (p: B.Vector3) => rel(p, lead.car!.pos) : (p: B.Vector3) => ({ x: p.x, z: p.z });
  const gemBlips = gems.length <= 40 ? gems.map((g) => ({ ...xz(g.m.position), kind: "gema" as const })) : [];
  const recBlips = pickups.length <= 24 ? pickups.filter((p) => p.type !== "cofre").map((p) => ({ ...xz(p.m.position), kind: "rec" as const })) : [];
  hudRadar(
    MOON.on ? { x: 0, z: 0, yaw: yawOf(lead.car!.root.forward, lead.car!.pos), up: camYaw } : { x: lead.car!.pos.x, z: lead.car!.pos.z, yaw: Math.atan2(lead.car!.root.forward.x, lead.car!.root.forward.z), up: camYaw },
    [...enemies.map((e) => ({ ...xz(e.pos), kind: e.def.boss ? ("jefe" as const) : e.elite ? ("elite" as const) : ("enemigo" as const) })),
     ...pickups.filter((p) => p.type === "cofre").map((p) => ({ ...xz(p.m.position), kind: "cofre" as const })),
     ...(MOON.on || erun ? goalBlips().map((p) => ({ ...xz(p), kind: "obj" as const })) : []),
     ...gemBlips, ...recBlips]);
  // Daño visible: pintura gastada y piezas que saltan al cruzar 50% y 25%
  const frac = Math.max(0, lead.hp / lead.maxHp);
  lead.car!.wear(frac);
  for (const t of [0.5, 0.25]) if (lastHpFrac > t && frac <= t) { debris(lead.car!.pos, save.paint || "#d62828", 8, 7, 0.8); FX.sparks(lead.car!.pos); shake = Math.max(shake, 0.6); }
  lastHpFrac = frac;
  const o = others(); hudMate(o.length === 1 ? { n: `J${o[0].id}`, hp: o[0].hp, max: o[0].maxHp, down: !o[0].car } : null);
  hudQuad(players.length > 2 ? players.map((p) => ({ hp: p.hp, max: p.maxHp, down: !p.car })) : null); // R7c: 3-4 jugadores, una vida por cuadro
  if (erun) { const a = E.ask(erun); hudEnc({ tag: E.tag(erun), pacts: E.activePacts(erun), ask: a && { title: a.title, opts: a.opts, left: erun.timer, frac: Math.max(0, erun.timer) / a.total, pacts: a.pacts, reject: a.reject } }); } else hudEnc(null);
  hudUpdate({
    hp: lead.hp, maxHp: lead.maxHp, boost: lead.boost, xp, need: xpNeed(level), level, pending: pendingLevels, time: time + encPrior, kills, kmh: lastKmh, maxKmh: lastMaxKmh,
    shield: abil === "escudo" && abilOn > 0,
    boostActive: lampBoost,
    distCenter: lead.car ? (MOON.on ? hd(lead.car.pos, B.Vector3.Zero()) : Math.hypot(lead.car.pos.x, lead.car.pos.z)) : 0,
    heat: Math.min(1, boostSec / 2.0),
  });
  hudAbility(ABILITIES[abil].short, ctl === "pad" ? btnName(pb("ability")) : keyName(KEYS.ability[0]), 1 - Math.max(0, abilCd) / abilCdOf(abil, abilLv), abilOn > 0, ABIL_ICON[abil], Math.max(0, abilCd));
  if (!simulating) hudJump(jumpCd <= 0 ? 1 : 1 - jumpCd / R.salto_cd_s);
}

// ---------- Loop ----------
const camTarget = new B.Vector3();
// Luna: la cámara guarda un rumbo (vector tangente) que viaja con el auto alrededor de la esfera y un "arriba" que sigue la vertical del lugar.
// camYaw = ese rumbo medido en el marco local del auto: el stick, el radar y el resto lo leen igual que en el patio.
const camH = new B.Vector3(0, 0, 1), camUp = new B.Vector3(0, 1, 0), _camM = new B.Matrix();
function moonCam(c: Car, dt: number, follow: boolean) {
  B.Vector3.LerpToRef(camUp, upAt(c.pos), 1 - Math.exp(-8 * dt), camUp).normalize();
  let hy = yawOf(hflat(camH, c.pos), c.pos);
  if (follow) { const t = yawOf(c.root.forward, c.pos); hy += Math.atan2(Math.sin(t - hy), Math.cos(t - hy)) * (1 - Math.exp(-2 * dt)); }
  if (state === "outro") hy += dt * 0.45; // el cierre orbita el auto (outroTick suma a camYaw, que acá se recalcula)
  camH.copyFrom(W(Math.sin(hy), 0, Math.cos(hy), c.pos));
  camYaw = hy;
  if (!simulating) { moonTick(dt, c.pos, cam); evFog(scene); }
}
// Encuadres del menú: SHOTS (menuscene.ts, derivados de SCENES), uno por pantalla dentro de su escenario
const shot = (scr: string) => (engine.getAspectRatio(cam) < 1 && SHOTS[scr + "_v"]) || SHOTS[scr] || SHOTS.main; // _v: encuadre de celular vertical
let previewKey = "", previewR = 0;
// ---------- Ficha del bestiario: el bicho sobre un pedestal en el centro del patio (origen, donde gira el auto del garaje) ----------
// Es un Enemy real (modelo, patas, aura de élite, telegráficos) sin IA: el cuerpo pasa a ANIMATED y sigue a la malla.
// Se crea al abrir la ficha o cambiar de bicho / variante y se libera al cerrarla. Las animaciones son guiones cortos con los mismos avisos y efectos del juego.
// Carrete de hilo: dos discos de madera clara, el cilindro del medio con hilo enrollado (vueltas más oscuras) y el disco de arriba a 1 de altura (donde se para el bicho)
const pedTpl = () => template("pedestal", () => {
  const wood = M.matte("#dcb77a"), thread = M.matte("#d6334f"), turn = M.matte("#9a2c44");
  return [cyl(1, 1, 0.1, wood, [0, 0.05, 0], undefined, 20), cyl(1, 1, 0.1, wood, [0, 0.95, 0], undefined, 20), cyl(0.8, 0.8, 0.8, thread, [0, 0.5, 0], undefined, 20),
    ...[0.25, 0.4, 0.55, 0.7, 0.85].map(y => cyl(0.82, 0.82, 0.04, turn, [0, y, 0], undefined, 20))];
});
const PED_H = 0.8; // alto del carrete (el bicho se para arriba)
// Ataque de cada bicho: aviso (aro propio, aro de caída o sector, con su radio real), duración del aviso y golpe (embestida, salto, escupida, succión)
const BATK: Partial<Record<Kind, { tele?: "self" | "land" | "arc"; r?: number; wind: number; hit: "lunge" | "hop" | "spit" | "dive" | "suck" | "swing" }>> = {
  escupidora: { wind: GLB.escupidora!.atk! * GLB.escupidora!.hit!, hit: "spit" }, escarabajo: { wind: GLB.escarabajo!.atk! * GLB.escarabajo!.hit!, hit: "lunge" }, robot: { wind: 0.9, hit: "lunge" }, cortadora: { wind: 1.2, hit: "lunge" }, polilla: { wind: 0.4, hit: "dive" },
  tarantula: { tele: "self", r: ATK.tarantula_rafaga_radio, wind: ATK.tarantula_rafaga_aviso_s, hit: "spit" }, gato: { tele: "land", r: ATK.salto_radio, wind: ATK.gato_salto_aviso_s, hit: "hop" }, perro: { wind: 0.5, hit: "hop" }, // perro: ver DOG_LANE (alterna con la embestida)
  aspiradora: { tele: "self", r: ATK.aspiradora_radio, wind: ATK.aspiradora_aviso_s, hit: "suck" }, cortacercos: { tele: "arc", r: ATK.cortacercos_radio, wind: ATK.cortacercos_aviso_s, hit: "swing" },
};
const DOG_LANE = { lane: true as const, tele: undefined, r: undefined, wind: DOG_RAM.wind, hit: "lunge" as const }; // segundo ataque de Felipe: la embestida con su carril rojo
const TAR_JUMP = { tele: "land" as const, r: ATK.salto_radio, wind: ATK.tarantula_salto_aviso_s, hit: "hop" as const }; // segundo ataque de la tarántula: salto con aro de caída
let beast: { e: Enemy; ped: B.InstancedMesh; pivot: B.TransformNode; key: string; seq: number; t: number; vel: B.Vector3; fx: number; atk: number } | null = null; // atk: ataques pedidos (la tarántula alterna ráfaga y salto)
function beastTick(dt: number, on: boolean) {
  const key = on && BV.kind ? BV.kind + BV.elite : "";
  if (beast && beast.key !== key) { beast.e.dispose(); beast.ped.dispose(); beast = null; }
  if (!key) return null;
  if (GLB[BV.kind!] && !glbTpl(BV.kind!)) { void ensure(T_BICHOS); return null; } // bicho importado todavía sin cargar: aparece solo al terminar
  const kind = BV.kind!, d = DEF[kind], span = Math.max(d.size[0], d.size[2]);
  if (!beast) {
    const e = new Enemy(kind, new B.Vector3(0, PED_H, 0), 1);
    const pivot = new B.TransformNode("beastPivot", scene);
    e.bindAttachPivot(pivot);
    e.node.rotationQuaternion = null;
    e.node.rotation.y = 0;
    e.body.setMotionType(B.PhysicsMotionType.ANIMATED);
    e.body.disablePreStep = false; // el cuerpo sigue a la malla (no cae ni empuja)
    if (BV.elite) e.makeElite(BV.elite);
    const vel = new B.Vector3();
    e.body.getLinearVelocity = () => vel; // ponytail: animate() mide la marcha con la velocidad del cuerpo; acá se la dicta la ficha
    const ped = pedTpl().createInstance("ped");
    ped.position.setAll(0); // la instancia nace donde está la plantilla escondida
    ped.scaling.set(span * 0.62 + 0.4, PED_H, span * 0.62 + 0.4);
    beast = { e, ped, pivot, key, seq: BV.seq, t: 9, vel, fx: 0, atk: 0 };
  }
  const b = beast, e = b.e, n = e.node, pivot = b.pivot;
  const vis = GLB[kind]?.visual ?? 1;
  if (b.seq !== BV.seq) { b.seq = BV.seq; b.t = 0; b.fx = 0; n.setEnabled(true); n.scaling.setAll(vis); if (BV.anim === "attack") b.atk++; }
  b.t += dt;
  if (performance.now() - BV.touched > 2500) BV.yaw += dt * 0.35; // giro lento si nadie lo toca
  const t = b.t, A = BV.anim, at = kind === "tarantula" && b.atk % 2 === 0 ? TAR_JUMP : kind === "perro" && b.atk % 2 === 0 ? DOG_LANE : BATK[kind] ?? { wind: 0.35, hit: "lunge" as const };
  const fwd = new B.Vector3(Math.sin(BV.yaw), 0, Math.cos(BV.yaw)), top = new B.Vector3(0, PED_H, 0);
  let lift = 0, push = 0, pitch = 0, roll = 0, sp = 0;
  e.showTele(null); e.touchCd = 0; e.atk = -1; e.play = null;
  if (A === "walk" || A === "phase") sp = d.speed * (A === "phase" ? 1.2 * 1.6 : 1) * (BV.elite === "rapida" ? 2 : 1);
  if (A === "phase" && t < ROAR) { sp = 0; if (GLB[kind]?.clips) e.play = ["rage", t]; } // ruge quieto antes de salir corriendo, como en partida
  if (A === "phase") { roll = Math.sin(t * 40) * 0.03 * Math.max(0, 1 - t / 2.2); if (t < dt * 1.5) { SFX.boss(); shake = Math.max(shake, 0.6); } e.vapor(dt); }
  e.setRage(A === "phase"); // tinte rojo de fase 2, como en partida
  if (A === "attack" && t < at.wind + 1.4) {
    const w = at.wind, k = Math.min(1, t / w), s = t - w; // s: segundos desde el golpe
    if ("lane" in at && t < w) e.showLane(fwd, k);
    else if (at.tele && t < w) e.showTele(at.tele === "land" ? top.add(fwd.scale(span * 0.4)) : top.clone(), at.r!, k);
    e.aim = BV.yaw;
    if (t < w) { pitch = -0.12 * k; roll = Math.sin(t * 50) * 0.02 * k; } // se carga: echa el peso atrás y tiembla
    else if (at.hit === "lunge" || at.hit === "swing") { push = Math.sin(Math.min(1, s / 0.5) * Math.PI) * span * 0.35; pitch = 0.1 * Math.max(0, 1 - s / 0.5); sp = s < 0.5 ? d.speed : 0; }
    else if (at.hit === "hop") { const h = Math.max(0, s * (1.1 - s)) * 4 * span * 0.5; lift = h; if (s < 1.1) pitch = -0.2 * Math.sin(s / 1.1 * Math.PI); }
    else if (at.hit === "dive") { push = Math.sin(Math.min(1, s / 0.4) * Math.PI) * span * 0.6; lift = -push * 0.3; pitch = 0.4 * Math.sin(Math.min(1, s / 0.4) * Math.PI); }
    else if (at.hit === "spit") pitch = 0.15 * Math.max(0, 1 - s / 0.3);
    else if (at.hit === "suck") { roll = Math.sin(t * 30) * 0.015; if (s < 1.2 && Math.random() < dt * 25) { const a = Math.random() * 6.3, r = 5 + Math.random() * 14; FX.dust(new B.Vector3(Math.sin(a) * r, 0.3, Math.cos(a) * r)); } } // como la succión real
    e.touchCd = t > w && s < 0.5 ? 1 : 0; // la hormiga GLB (glb.ts) muerde con touchCd
    if (GLB[kind]?.atk) { if (t < GLB[kind]!.atk!) e.atk = t; push = 0; } // escupidora y escarabajo: su animación de ataque (golpe en w; la arremetida ya la trae)
    // Efectos del golpe, una vez por paso (b.fx cuenta los que ya salieron)
    const front = top.add(fwd.scale(span * 0.6 + 0.6)).addInPlace(new B.Vector3(0, d.size[1] * 0.4, 0));
    if (s >= 0 && b.fx === 0) {
      b.fx = 1;
      if (at.hit === "lunge" || at.hit === "dive") { FX.sparks(front); FX.hit(front); }
      if (at.hit === "swing") for (let j = -2; j <= 2; j++) { const a = BV.yaw + j * 0.5; FX.sparks(new B.Vector3(Math.sin(a) * 8, 0.6, Math.cos(a) * 8)); }
    }
    if (at.hit === "spit" && s >= 0 && b.fx <= (kind === "tarantula" ? 6 : 1) && s >= (b.fx - 1) * 0.16) { // 1 escupida, o la ráfaga de 6 de la tarántula
      b.fx++;
      burst(front, { n: 10, color: "#ff3a1f", size: [0.25, 0.55], power: [6, 11], life: [0.25, 0.45], gravity: -8 });
    }
    if (at.hit === "suck" && s >= 1.2 && b.fx < 4) { b.fx++; for (let j = -3; j <= 3; j++) { const a = BV.yaw + j * 0.2; FX.sparks(top.add(new B.Vector3(Math.sin(a) * 4, 0.7, Math.cos(a) * 4))); } } // ráfagas de tuercas
    if (at.hit === "hop" && s >= 1.1 && b.fx === 1) { b.fx = 2; FX.slam(top, 10); shake = Math.max(shake, 0.8); }
    // Felipe y Eulalio (clips de Blender): la acción sigue los mismos tramos del aviso y del golpe
    if (GLB[kind]?.clips) e.play = at.hit === "hop" ? e.seq("jump", t < w ? 0 : s < 1.1 ? 1 : 2, t < w ? k : s < 1.1 ? s / 1.1 : (s - 1.1) / 0.4) : kind === "perro" ? e.seq("ram", t < w ? 0 : s < 0.5 ? 1 : 2, t < w ? k : s < 0.5 ? s / 0.5 : (s - 0.5) / 0.9) : null;
  }
  if (A === "hit" && t < dt * 1.5) { shake = Math.max(shake, impact(n, top.add(new B.Vector3(0, d.size[1] * 0.5, 0)), d.color, span * (d.scale ?? 1), "embestida", true, !!d.boss)); SFX.impact("embestida", true); }
  if (A === "die") {
    if (GLB[kind]?.clips && t < 3) { e.play = ["death", t]; if (t > 2.2 && b.fx === 0) { b.fx = 1; FX.death(top.add(new B.Vector3(0, 0.5, 0)), true); SFX.kill(); } n.scaling.setAll(t > 2.6 ? Math.max(0.01, (3 - t) / 0.4) : 1); } // juega su "death" y se achica
    else if (t < 0.45) { roll = (t / 0.45) * Math.PI * (d.boss ? 0.5 : 1); lift = Math.sin((t / 0.45) * Math.PI) * span * 0.3; } // vuelca (los insectos, patas arriba)
    else if (b.fx === 0) { b.fx = 1; FX.death(top.add(new B.Vector3(0, 0.5, 0)), !!d.boss); debris(top, d.color, d.boss ? 30 : 7, d.boss ? 14 : 6, d.scale ?? (d.boss ? 3 : 1)); SFX.kill(); n.setEnabled(false); }
    else if (t > 1.8 && !n.isEnabled()) { n.setEnabled(true); n.scaling.setAll(0.01); }
    if (t > 1.8 && !(GLB[kind]?.clips && t < 3)) { const k = Math.min(1, (t - 1.8) / 0.25); n.scaling.setAll(k < 1 ? k * 1.1 : 1); roll = 0; }
  }
  if (kind === "polilla") lift += 1.2 + Math.sin(performance.now() / 600) * 0.15; // vuela
  if (kind === "robot" && (A === "walk" || A === "phase")) {
    roll = Math.sin(t * 14) * 0.08;
    pitch = Math.sin(t * 28) * 0.03;
  }
  b.vel.copyFrom(fwd.scale(sp));
  pivot.position.set(fwd.x * push, PED_H + lift, fwd.z * push);
  pivot.rotationQuaternion = null;
  pivot.rotation.set(pitch, BV.yaw, roll);
  n.position.copyFrom(pivot.position);
  n.rotationQuaternion = null;
  n.rotation.copyFrom(pivot.rotation);
  if (n.isEnabled()) e.animate(A === "phase" ? dt * 1.5 : dt);
  return span;
}

scene.onBeforeRenderObservable.add(() => {
  padSnap();
  const dt = Math.min((frameAcc || engine.getDeltaTime()) / 1000, 0.05);
  if (net) { pollInput(); players[0].in = input; if (net.host && players[1]) players[1].in = netIn; } // R6b: J2 remoto = su último input, como un control local
  else if (players.length > 1) mateInput(); else pollInput();

  if (state === "level") {
    if (padPressed(14)) { offerSel = (offerSel + offers.length - 1) % offers.length; selectOffer(offerSel); }
    if (padPressed(15)) { offerSel = (offerSel + 1) % offers.length; selectOffer(offerSel); }
    if (padPressed(pb("ok"))) pickOffer(offerSel);
    if (padPressed(pb("reroll"))) applyCommand(lead.id, { k: "reroll" });
  } else if (state === "play") { if (padPressed(pb("pause"))) pause(); else if (padPressed(pb("cam"))) camCycle(); else if (erun && padPressed(14)) applyCommand(lead.id, { k: "enc", i: 0 }); else if (erun && padPressed(15)) applyCommand(lead.id, { k: "enc", i: 1 }); else if (erun && padPressed(13)) applyCommand(lead.id, { k: "enc", i: 2 }); } // ENCORE: cruceta izquierda/derecha = opción 1/2, abajo = rechazar el pacto
  else if (state === "outro") outroTick(dt);
  else if (state === "race") { const k = kartM!; if (padPressed(pb("pause"))) k.racePause(); if (padPressed(pb("ok"))) k.raceClick(); if (padPressed(pb("cam"))) camCycle(); if (padPressed(14)) k.racePadMenu(-1); if (padPressed(15)) k.racePadMenu(1); k.raceTick(dt); }
  else if (state === "duel") duelM!.duelTick(dt);
  else if (state === "match3") { if (padPressed(pb("pause"))) m3M?.match3PauseToggle(); m3M?.match3Tick(dt); }
  else if (state === "net") { // R6c: el cliente online navega cartas (netLv) y pactos/rutas/votos con el mando; el anfitrión valida el turno
    netClientTick(); updateHud(dt);
    if (netLv) {
      if (padPressed(14)) { offerSel = (offerSel + offers.length - 1) % offers.length; selectOffer(offerSel); }
      if (padPressed(15)) { offerSel = (offerSel + 1) % offers.length; selectOffer(offerSel); }
      if (padPressed(pb("ok"))) pickOffer(offerSel);
      if (padPressed(pb("reroll"))) applyCommand(lead.id, { k: "reroll" });
    } else if (erun) { if (padPressed(14)) applyCommand(lead.id, { k: "enc", i: 0 }); else if (padPressed(15)) applyCommand(lead.id, { k: "enc", i: 1 }); else if (padPressed(13)) applyCommand(lead.id, { k: "enc", i: 2 }); }
  }
  else if (!introOn()) menuPad(dt); // con la intro encima el menú no escucha el gamepad

  if (state === "play") {
    // Hit-stop: congela el mundo un par de cuadros en los golpes fuertes
    if (hitStop > 0) { hitStop -= dt; scene.physicsEnabled = false; }
    else { scene.physicsEnabled = true; update(LAB.on ? 1e-4 : dt); }
    updateHud(dt);
  }
  if (net?.host && (state === "play" || state === "level") && (netT -= dt) <= 0) { netT = 1 / NET_HZ; netSnap(); }
  tickFx(dt * ts);
  uiTick(dt, state === "play" || state === "duel" || state === "match3");
  if (save.fps && (fpsT -= dt) <= 0) { // estadísticas: fps y ms de los cuadros dibujados (no los del navegador), resolución interna real y escala o modo FSR
    fpsT = 0.5;
    const g = gfxInfo();
    $("fps").textContent = `${Math.round(1000 / frameMs)} fps · ${frameMs.toFixed(1).replace(".", ",")} ms\nInterna ${g.w}x${g.h} · ${g.mode}`;
  }

  // Cámara 3/4 elevada. Con teclado sigue el rumbo del auto; con stick queda fija
  // (si rotara, la dirección del stick cambiaría mientras girás).
  const k = 1 - Math.exp(-5 * dt);
  setWind(performance.now() / 1000, lead.car?.pos ?? null);
  if (!simulating) contactShadows(lead.car && (state === "play" || state === "level" || state === "outro" || state === "pause") ? lead.car.pos : null, enemies);
  if (state === "race" || state === "duel" || state === "match3") {
    // carrera / demolición manejan cámara en su módulo
  } else if (lead.car) {
    const cm = CAMS[save.camMode];
    if (MOON.on) moonCam(lead.car, dt, cm.yaw === undefined && !input.move && state === "play");
    else if (cm.yaw !== undefined) camYaw = cm.yaw;
    else if (!input.move && state === "play") {
      const f = lead.car.root.forward;
      const target = Math.atan2(f.x, f.z);
      camYaw += Math.atan2(Math.sin(target - camYaw), Math.cos(target - camYaw)) * (1 - Math.exp(-2 * dt));
    }
    // Al elegir mejoras la cámara se acerca y gira a 3/4 frontal para ver la pieza montada
    const close = state === "level";
    const yaw = close ? camYaw + 2.5 : camYaw;
    setLamp(lead.car.pos, lead.car.root.forward, lampBoost, dt, MOON.on ? lead.car.root.up : undefined);
    if (!simulating) { tickRain(dt * ts, lead.car.pos, lead.car.root.forward, rainK); rainSfx(rainK); }
    // Polvo que flota dentro del haz del faro
    if (!simulating && !MOON.on && (moteT -= dt) <= 0) { // luna: sin motas (son planas) ni bichitos de ambiente
      moteT = 0.09;
      const f = lead.car.root.forward, d = 3 + Math.random() * 11, sd = (Math.random() - 0.5) * d * 0.9;
      ambient("mote", new B.Vector3(lead.car.pos.x + f.x * d + f.z * sd, 0.4 + Math.random() * 2.2, lead.car.pos.z + f.z * d - f.x * sd));
    }
    // Luciérnagas alrededor del auto cuando ya anocheció; en el garaje, polvo bajo los tubos
    const dust = zoneDust();
    if (MOON.on) { /* sin ambiente en la luna */ }
    else if (!simulating && dust && (flyT -= dt) <= 0) {
      flyT = 0.05;
      const [x, z, w, d] = dust[Math.floor(Math.random() * dust.length)];
      ambient("mote", new B.Vector3(x + (Math.random() - 0.5) * w, 0.5 + Math.random() * 12, z + (Math.random() - 0.5) * d));
    } else if (!simulating && !dust && profile.climate.day && (flyT -= dt) <= 0) {
      flyT = 0.15; // de día: pétalos y mariposas en vez de luciérnagas
      const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 24;
      ambient("petal", new B.Vector3(lead.car.pos.x + Math.cos(a) * r, 0.4 + Math.random() * 3, lead.car.pos.z + Math.sin(a) * r));
    } else if (!simulating && !dust && cycleS > 0.5 && (flyT -= dt) <= 0) {
      flyT = 0.12 / cycleS;
      const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 22;
      ambient("fly", new B.Vector3(lead.car.pos.x + Math.cos(a) * r, 0.5 + Math.random() * 2.5, lead.car.pos.z + Math.sin(a) * r));
    }
    cam.fov = (save.fov * Math.PI) / 180; // Campo de visión (Configuración → Imagen): solo en partida; los encuadres de los menús usan el de fábrica
    const back = MOON.on ? W(Math.sin(yaw), 0, Math.cos(yaw), lead.car.pos) : new B.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); // luna: camYaw es del marco local del auto
    // Bajo la mesa la cámara baja y se acerca (roofK suaviza entrar y salir); afuera vuelve al zoom del usuario
    roofK += ((underRoof(lead.car.pos) ? 1 : 0) - roofK) * (1 - Math.exp(-3 * dt));
    // Dinámica: se aleja con bichos cerca (18 m) o a velocidad; muy lenta para no marear
    if (save.camMode === "dinamica" && state === "play") {
      let n = 0; for (const e of enemies) if (B.Vector3.DistanceSquared(e.pos, lead.car.pos) < 324) n++;
      const v = lead.car.body.getLinearVelocity().length() / lead.car.def.speed;
      dynK += (1 + 0.4 * Math.min(1, n / 25) + 0.15 * Math.min(1, v) - dynK) * (1 - Math.exp(-0.8 * dt));
    }
    // Bajo techo todos los modos se funden hacia la persecución (con el yaw del modo): desde arriba se vería la mesa
    // Persecución baja en teléfono: pantalla chica, se aleja y sube algo más (vertical, más: el ancho visible es poco) y mira menos adelante
    const cm2 = save.camMode === "baja" && isTouch ? (engine.getAspectRatio(cam) < 1 ? { back: 14, up: 9, look: 1 } : { back: 9.5, up: 5.5, look: 5 }) : cm;
    const lab = LAB.on && save.camMode === "actual", P = CAMS.actual;
    const gb = B.Scalar.Lerp(lab ? LAB.back : cm2.back, P.back, roofK), gl = B.Scalar.Lerp(cm2.look, P.look, roofK);
    let gu = B.Scalar.Lerp(lab ? LAB.up : cm2.up, P.up, roofK);
    const zm = (LAB.on ? 1 : save.zoom) * outroZ * (save.camMode === "dinamica" ? dynK : 1), zb = B.Scalar.Lerp(zm, 0.7, roofK), zu = B.Scalar.Lerp(zm, 0.4, roofK);
    gu *= zu;
    if (save.camMode === "cenital") { // la esquina del cuadro (a ras del piso) no pasa del anillo de aparición menos 3 m, con cualquier zoom, FOV y aspecto
      const th = Math.tan(cam.fov / 2), asp = engine.getAspectRatio(cam);
      gu = Math.min(gu * (asp < 1 ? 1.8 : 1), (R.spawn_anillo_min - 3) / Math.hypot(th, th * asp));
    }
    const fp = state === "outro" && outroAt ? outroAt : lead.car.pos; // foco de la cámara
    const want = fp.subtract(back.scale(close ? 5.5 : gb * zb)).addInPlace(MOON.on ? camUp.scale(close ? 3.2 : gu) : new B.Vector3(0, close ? 3.2 : gu, 0));
    cam.position = B.Vector3.Lerp(cam.position, want, close ? 1 - Math.exp(-8 * dt) : k);
    B.Vector3.LerpToRef(camTarget, close ? lead.car.pos.add(MOON.on ? camUp.scale(-1.4) : new B.Vector3(0, -1.4, 0)) : fp.add(back.scale(gl)), close ? 0.2 : k * 1.5, camTarget);
    // Lo que queda entre cámara y auto se tramea (screen-door en render.ts) mientras tapa
    if (!simulating) {
      const to = lead.car.pos.add(new B.Vector3(0, 0.6, 0)).subtractInPlace(cam.position), len = to.length();
      const ray = new B.Ray(cam.position, to.scaleInPlace(1 / len), len);
      for (const m of occluders) m.visibility = ray.intersectsMesh(m, true).hit ? 0.999 : 1;
    }
  } else {
    // Diorama: cada pantalla del menú tiene su encuadre en su escena (SCENES, menuscene.ts); la cámara viaja con lerp suave y se mece un poco
    const scr = current() ?? "main", t = performance.now() / 1000;
    cam.fov = menuFov(scr);
    // Escena de la pantalla (estante o mesa) con su luz y foco; al cambiar de escena la cámara corta al encuadre nuevo
    if (menuTick(scr, cam, scr === "beast" ? new B.Vector3(0, PED_H + 1, 0) : carSpot(scr)?.addInPlaceFromFloats(0, 0.6, 0) ?? camTarget, dt, low)) { // foco: el bicho, el auto o lo que mira la cámara
      const [x, y, z, a, b, c] = shot(scr);
      cam.position.set(x, y, z); camTarget.set(a, b, c);
    }
    // Ficha del bestiario: cámara propia según el tamaño del bicho; queda a la izquierda (o arriba en celular vertical) y la info al otro lado
    const bspan = beastTick(dt, scr === "beast");
    if (bspan !== null) {
      const d = DEF[BV.kind!], asp = engine.getAspectRatio(cam), th = Math.tan(cam.fov / 2), tall = asp < 1;
      const h = d.size[1], need = Math.max(bspan, d.size[2], h * 1.2) * (d.boss ? 1.9 : 1.5) + 1.5; // los jefes abren patas y cola más allá de su caja
      const dist = Math.max(need / (2 * th * asp * (tall ? 0.7 : 0.45)), (h + 1.5) / (2 * th * (tall ? 0.3 : 0.65))) * BV.zoom;
      const W = dist * th * asp, H = dist * th, ty0 = PED_H + h * 0.45;
      SHOTS.beast = [tall ? 0 : -W * 0.42, ty0 + dist * 0.36, dist, tall ? 0 : -W * 0.42, ty0 - (tall ? H * 0.58 : 0), 0]; // desde +z: del otro lado queda la mesa del patio
      setLamp(new B.Vector3(dist * 0.3, ty0, dist * 0.6), new B.Vector3(-0.3, 0, -0.6).normalize(), false, dt); // el faro alumbra la vitrina de frente
    }
    const [px0, py0, pz0, tx, ty, tz] = shot(scr);
    // Garaje: los autos grandes giran sobre su eje; la cámara se aleja según su tamaño para que no se corten
    const gz = scr === "garage" ? CARS[shownCar()].size : null, extra = gz ? Math.max(0, Math.max(gz[0] * 1.3, gz[2], gz[1] * 2) - 2.4) : 0, pull = 1 + extra * 0.4;
    const px = tx + (px0 - tx) * pull, py = ty + (py0 - ty) * pull, pz = tz + (pz0 - tz) * pull;
    const sw = scr === "beast" ? 0.05 : Math.hypot(px - tx, py - ty, pz - tz) * (scr === "garage" || scr === "title" ? 0.02 : 0.04), kk = 1 - Math.exp(-2.2 * dt);
    B.Vector3.LerpToRef(cam.position, new B.Vector3(px + Math.sin(t * 0.13) * sw, py + Math.sin(t * 0.21) * sw * 0.3, pz + Math.cos(t * 0.11) * sw), kk, cam.position);
    B.Vector3.LerpToRef(camTarget, new B.Vector3(tx, ty, tz), kk, camTarget);
    // Título, principal y garaje: el auto elegido sobre el estante o la mesa (reusa `preview`, que clearRun libera)
    const spot = carSpot(scr);
    if (spot) {
      const key = shownCar() + JSON.stringify(carOpts());
      if (!preview || previewKey !== key) {
        preview?.dispose();
        const m = carModel(shownCar(), { ...carOpts(), fixed: true });
        preview = m.body;
        previewR = -Math.min(...m.wheels.map((w) => w.m.position.y - w.r));
        for (const c of m.cast) shadows.addShadowCaster(c);
        previewKey = key;
        preview.rotation.y = CAR_YAW;
      }
      preview.position.set(spot.x, spot.y + previewR, spot.z);
      if (scr === "garage") { preview.rotation.y += dt * 0.6; preview.rotation.z = 0; }
      else { // estante: vaivén de suspensión, como en marcha lenta
        preview.rotation.y = CAR_YAW;
        preview.position.y += Math.sin(t * 2.3) * 0.012;
        preview.rotation.z = Math.sin(t * 1.7) * 0.012;
      }
    } else if (preview) { preview.dispose(); preview = null; }
  }
  shake = Math.max(0, shake - dt * 2);
  const s = save.shake ? shake * shake * 0.8 : 0;
  if (state !== "race" && state !== "duel" && state !== "match3") {
    const tgt = camTarget.add(new B.Vector3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, 0));
    if (MOON.on && lead.car) { // luna: el "arriba" de la cámara es la vertical del lugar (setTarget usa siempre +Y): rotación propia
      B.Matrix.LookAtLHToRef(cam.position, tgt, camUp, _camM); _camM.invert();
      B.Quaternion.FromRotationMatrixToRef(_camM, (cam.rotationQuaternion ??= new B.Quaternion()));
    } else {
      if (cam.rotationQuaternion) { (cam as { rotationQuaternion: B.Quaternion | null }).rotationQuaternion = null; cam.upVector.set(0, 1, 0); }
      cam.setTarget(tgt);
    }
    for (const m of liveM()) mateCam(m, dt);
  }
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

// Equipos del minuto 10 del bot (__sim con semillas 1, 4, 5, 7, 8, 9 y 10; solo cuentan las partidas que llegan vivas al jefe final, ~50%): los usa __bossDuel.
// Armas [id, nivel, evolucionada/fusión], pasivas por nivel y nivel de piloto (__team() devuelve esta forma para anotar uno nuevo).
type DuelTeam = { level: number; weapons: [WeaponId, number, boolean][]; passives: Partial<Record<PassiveId, number>> };
const DUEL_TEAMS: DuelTeam[] = [
  { level: 51, weapons: [["helado", 5, true], ["yoyo", 5, false], ["globos", 5, true], ["trompo", 5, false], ["chispazo", 5, true], ["bengalas", 4, false]], passives: { resorte: 2, litio: 1, capacitor: 3, lupa: 3, iman: 1 } },
  { level: 50, weapons: [["gomitas", 5, true], ["clips", 5, false], ["bocina", 5, false], ["bengalas", 5, false], ["chispazo", 5, true], ["trompo", 5, false]], passives: { resorte: 1, iman: 3, turbo: 4, litio: 2, lupa: 4, lego: 1 } },
  { level: 58, weapons: [["gomitas", 5, true], ["petardos", 5, true], ["bengalas", 5, true], ["trompo", 5, true], ["chispero", 5, false], ["helado", 5, false]], passives: { resorte: 3, iman: 5, litio: 5, lupa: 5, capacitor: 5, turbo: 5 } },
  { level: 55, weapons: [["gomitas", 5, true], ["trompo", 5, true], ["clips", 5, true], ["petardos", 5, true], ["bengalas", 5, false], ["yoyo", 5, false]], passives: { iman: 5, litio: 5, capacitor: 5, resorte: 5, lupa: 5, turbo: 1 } },
  { level: 50, weapons: [["chispero", 5, true], ["bocina", 5, false], ["yoyo", 5, false], ["bengalas", 5, false], ["globos", 5, true], ["clips", 5, false]], passives: { capacitor: 4, turbo: 2, resorte: 3, lupa: 4, lego: 1, litio: 1 } },
  { level: 56, weapons: [["trompo", 5, true], ["bocina", 5, false], ["globos", 5, true], ["chispazo", 5, true], ["anillo", 5, true]], passives: { resorte: 2, iman: 2, capacitor: 5, litio: 1, lupa: 3, turbo: 1 } },
  { level: 45, weapons: [["gomitas", 5, true], ["chispero", 5, false], ["petardos", 5, false], ["regla", 5, false], ["yoyoelec", 5, true]], passives: { resorte: 1, lupa: 2, litio: 5, iman: 3, capacitor: 2, turbo: 1 } },
];

// Un paso de la simulación sin dibujar, conducida por el bot (solo dev): elige mejora al subir de nivel o maneja un tick. Lo usan __sim y __bossDuel.
function botStep(m: typeof import("./devbot"), dt: number) {
  const pe = scene.getPhysicsEngine() as unknown as { _step(d: number): void };
  if (state === "level") {
    // Como una persona competente: evolución/fusión; con poca vida, supervivencia; subir armas propias hacia la evolución,
    // la pasiva que evoluciona un arma propia, armas nuevas hasta 4 (el Lápiz-lanza solo rinde embistiendo), daño y recarga
    const low = lead.hp < lead.maxHp * 0.6, evoP = new Set(weapons.filter((w) => !w.evolved).map((w) => WEAPONS[w.id].evo as string));
    const pref = (o: Offer) => o.kind === "evo" || o.kind === "fusion" ? 9 : low && (o.id === "litio" || o.id === "lego" || o.kind === "heal") ? 8
      : o.kind === "weapon" && weapons.some((w) => w.id === o.id) ? 7 : o.kind === "passive" && evoP.has(o.id) && !passives[o.id as PassiveId] ? 6
      : o.kind === "weapon" && o.id !== "lanza" && weapons.length < 4 ? 5 : o.id === "lupa" || o.id === "capacitor" ? 4
      : o.kind === "passive" && evoP.has(o.id) ? 3 : o.kind === "weapon" && o.id !== "lanza" ? 2 : o.kind === "passive" ? 1 : 0;
    applyCommand(lead.id, { k: "card", i: offers.reduce((b, o, i) => (pref(o) > pref(offers[b]) ? i : b), 0) });
    return;
  }
  lead.car!.root.computeWorldMatrix(true);
  for (const e of enemies) e.node.computeWorldMatrix(true);
  // Lo que una persona ve del jefe: aros rojos de la tarántula, el perro en el aire (cae cerca de su sombra), la cortadora cargando, ácido en vuelo
  const b = enemies.find((e) => e.def.boss), zones: { x: number; z: number; r: number }[] = [];
  if (b?.tele[0]?.isVisible && b.kind !== "aspiradora") zones.push({ x: b.tele[0].position.x, z: b.tele[0].position.z, r: Math.max(b.tele[0].scaling.x, b.tele[0].scaling.z) }); // el carril de Felipe es una elipse: se evita entero // el aro de la aspiradora es solo succión (sin daño): el bot se queda adentro, como una persona
  if (b?.kind === "perro" && b.airborne) { const bv = b.body.getLinearVelocity(), t = (bv.y + Math.sqrt(Math.max(0, bv.y * bv.y + 50 * b.pos.y))) / 25; zones.push({ x: b.pos.x + bv.x * t, z: b.pos.z + bv.z * t, r: 11 }); }
  for (const s of spits) zones.push({ x: s.m.position.x + s.v.x * 0.3, z: s.m.position.z + s.v.z * 0.3, r: 1.2 });
  for (const cb of b?.cables ?? []) zones.push({ x: (cb.a.x + cb.b.x) / 2, z: (cb.a.z + cb.b.z) / 2, r: 3.5 }); // cables del cortacercos
  const bb = b && { x: b.pos.x, z: b.pos.z, kind: b.kind, fx: b.node.forward.x, fz: b.node.forward.z, charge: b.kind === "cortadora" && b.state === 1, ram: weapons.some((w) => w.id === "lanza" && w.evolved) };
  if (MOON.on) { // luna: el bot ve todo en el plano local del auto (el auto en el origen; sin bordes, la órbita da la vuelta a la luna)
    const cp = lead.car!.pos, L = (p: B.Vector3) => rel(p, cp), mz: { x: number; z: number; r: number }[] = [];
    if (b?.tele[0]?.isVisible && b.kind !== "aspiradora") mz.push({ ...L(b.tele[0].position), r: Math.max(b.tele[0].scaling.x, b.tele[0].scaling.z) });
    for (const s of spits) mz.push({ ...L(s.m.position), r: 1.2 });
    for (const cb of b?.cables ?? []) mz.push({ ...L(B.Vector3.Center(cb.a, cb.b)), r: 3.5 });
    const f = flatL(lead.car!.root.forward, cp), v = toLocal(lead.car!.body.getLinearVelocity(), cp), bf = b && flatL(b.node.forward, cp);
    const lb = b && bf && { ...L(b.pos), kind: b.kind, fx: bf.x, fz: bf.z, charge: b.kind === "cortadora" && b.state === 1, ram: weapons.some((w) => w.id === "lanza" && w.evolved) };
    Object.assign(input, m.botSteer({ pos: { x: 0, z: 0 }, root: { forward: f }, body: { getLinearVelocity: () => v } }, enemies.filter((e) => !e.def.boss).map((e) => L(e.pos)), [], lb, mz, gems.map((g) => L(g.m.position))), { move: false, drift: false });
  } else Object.assign(input, m.botSteer(lead.car!, enemies.filter((e) => !e.def.boss).map((e) => e.pos), obstacles(), bb, zones, gems.map((g) => g.m.position)), { move: false, drift: false });
  update(dt);
  pe._step(dt);
  tickFx(dt);
}

// Solo dev: avanzar frames a mano y atajos de prueba (pestaña oculta = sin requestAnimationFrame)
// Los atajos aparecen con todo precargado (como cuando el arranque esperaba los GLB); ?lazy no espera, para probar la precarga real en segundo plano
const devReady = () => /[?&]lazy\b/.test(location.search) ? Promise.resolve() : ensureAll();
if (import.meta.env.DEV) import("./devbot").then((m) => devReady().then(() => Object.assign(window, {
  __bot: m.bot,
  // Adelantar el tiempo: simula la partida con paso fijo y SIN dibujar, conducida por el bot.
  // Determinista: misma semilla (?seed=N) = mismo resultado. Devuelve un resumen.
  __sim: (secs: number, dt = 1 / 60) => {
    const w0 = performance.now(), end = time + secs;
    simulating = true;
    m.resetBot();
    while (time < end && (state === "play" || state === "level") && performance.now() - w0 < 35000) botStep(m, dt);
    simulating = false;
    $("levelup").classList.add("hidden");
    const boss = enemies.find((e) => e.def.boss);
    return `${fmt(time)} nv${level} hp${Math.round(lead.hp)}/${lead.maxHp} en${enemies.length} bajas ${kills} [${weapons.map((w) => w.id + (w.evolved ? "★" : w.lv)).join(" ")}] ${state}${boss ? ` JEFE ${boss.def.name} ${Math.round((boss.hp / boss.maxHp) * 100)}%` : ""}${state === "over" ? " · " + $("overTitle").textContent + ": " + $("overTxt").textContent : ""} · ${profile.climate.name}/${profile.plague.name} · semilla ${runSeed}${MOON.on ? " · " + goalStats() : ""} · tornillos ${Math.floor((runScrap + Math.floor(time / R.tornillos_div_tiempo) + Math.floor(kills * TOUGH.xp / R.tornillos_div_bajas)) * curseK)} · ${((performance.now() - w0) / 1000).toFixed(1)} s reales`;
  },
  // Arranca una partida normal desde la consola (para __sim sin pasar por el menú): __play(3)
  __play: (seed = 1) => { if (state !== "menu") toMenu(); forceSeed = seed; startRun(); forceSeed = 0; return runSeed; },
  __team: () => ({ level, weapons: weapons.map((w) => [w.id, w.lv, w.evolved]), passives }), // el equipo actual con la forma de DUEL_TEAMS (para anotar equipos de __sim)
  // Duelo barato contra un jefe final: equipo del minuto 10 (DUEL_TEAMS; sin `team` rota con la semilla), el jefe con hasta `adds` bichos normales vivos (100 por defecto; en la partida real hay ~170-200 al minuto 10, 0 = duelo a solas) y el bot conduciendo sin dibujar.
  // __bossDuel("perro", { seed, god, adds, max }) → { segundos hasta vencerlo o morir, ganó, vidaRestante del jefe, auto }. god = el auto no muere (mide solo el tiempo de baja).
  __bossDuel: (kind: Kind, o: { seed?: number; god?: boolean; adds?: number; max?: number; team?: number | DuelTeam; dt?: number } = {}) => {
    const w0 = performance.now(), dt = o.dt ?? 1 / 60, seed = o.seed ?? 1, tm = typeof o.team === "object" ? o.team : DUEL_TEAMS[o.team ?? seed % DUEL_TEAMS.length]; // sin `team`, el equipo rota con la semilla
    if (state !== "menu") toMenu();
    forceSeed = seed; startRun(); forceSeed = 0;
    god = !!o.god; duel = o.adds ?? 100;
    for (const w of weapons) w.dispose();
    weapons = tm.weapons.map(([id, lv, evolved]) => { const w = makeWeapon(id); w.lv = lv; w.evolved = evolved; return w; });
    passives = { ...tm.passives }; level = tm.level;
    recompute(); lead.hp = lead.maxHp;
    time = 600; bossIdx = RUN_BOSSES.length; swarmT = groupT = chestT = ballT = Infinity; evtPre.boss = new Set(RUN_BOSSES.map((_, i) => i)); // minuto 10, sin jefes programados ni eventos
    finalKind = kind;
    spawnEnemy(kind, spawnPoint(lead.car!.pos, 30, 36));
    const boss = enemies[enemies.length - 1], t0 = time, lim = t0 + (o.max ?? 180);
    simulating = true; m.resetBot();
    while ((state === "play" || state === "level") && time < lim && performance.now() - w0 < 60000) botStep(m, dt);
    simulating = false; duel = -1; god = false;
    $("levelup").classList.add("hidden");
    return { kind, seed: runSeed, segundos: +(time - t0).toFixed(1), ganó: boss.hp <= 0, vidaRestante: Math.max(0, Math.round(boss.hp)), auto: Math.round(lead.hp), real: +((performance.now() - w0) / 1000).toFixed(2) };
  },
})));
if (import.meta.env.DEV && location.search.includes("lab")) void devReady().then(() => (window as unknown as { __lab(o: object): void }).__lab({ climate: new URLSearchParams(location.search).get("climate") ?? undefined, t: Number(new URLSearchParams(location.search).get("t") ?? 1), boss: location.search.includes("boss"), rain: location.search.includes("rain") }));
if (import.meta.env.DEV && /[?&]encore\b/.test(location.search)) void devReady().then(() => { if (state === "menu") { coop = isTouch ? 1 : Math.min(4, Math.max(1, Number(new URLSearchParams(location.search).get("players")) || 1)); startRun(); } }); // solo dev: ?encore[&seed=N][&players=2..4] arranca ENCORE directo
if (import.meta.env.DEV) Object.assign(window, {
  // ENCORE (solo dev): info() fase y reloj; land() hace aterrizar el teleportador ya; board() lo activa; pick(0|1) decide o vota; tick(s) corre s segundos de relojes de fase
  __enc: {
    mate: () => { const m = others()[0]; return m && { lead: lead.id, hp: Math.round(lead.hp), mateHp: Math.round(m.hp), mateUp: !!m.car, dist: m.car ? +hd(m.car.pos, lead.car!.pos).toFixed(1) : null, weapons: m.weapons.length, cams: scene.activeCameras?.length ?? 1, all: others().map((x) => ({ pn: x.id, hp: Math.round(x.hp), up: !!x.car })) }; }, // R7a/c
    hurt: (n: number, who = 1) => { if (players.length === 1) return "sin J2"; const m = players.find((x) => x.id === who); if (!m) return "no está"; m.hp -= n; return who; }, // R7a: daño directo a un jugador
    info: () => erun && { ...erun, variant: E.variantOf(erun)?.name ?? null, pace: paceS, time: +time.toFixed(1), prior: Math.round(encPrior), seed: runSeed, enemies: enemies.length, tag: E.tag(erun), ask: E.ask(erun), boss: enemies.find((e) => e.def.boss)?.kind ?? null },
    land: () => { if (!erun) return "sin ENCORE"; erun.stageT = E.ENC.teleS - 0.01; encApply(E.tick(erun, 0.02)); return erun.phase; },
    board: () => { if (erun) encApply(E.boarded(erun)); return erun?.phase; },
    pick: (i: 0 | 1) => { applyCommand(lead.id, { k: "enc", i }); return erun?.phase; },
    tick: (secs: number) => { if (erun) encApply(E.tick(erun, secs)); return erun?.phase; },
    tele: (who = 1) => { const c = players.find((x) => x.id === who)?.car; if (!c) return false; rocketForce(c.pos, 0, 0); return true; }, // R7 QA: teleportador (cohete) justo bajo el auto del jugador `who`
    goto: (kind: "cofre" | "maquina" = "cofre", i = 0) => { const p = shopAt(kind, i); return !!(p && lead.car && carPlace(onFloor(p.clone(), lead.car.def.size[1] / 2 + 0.3), p.add(lead.car.root.forward))); }, // solo dev: teletransporta el auto de J1 a un cofre o a la máquina (cuerpo, no solo malla)
    jump: (loop: number, stage: number) => { if (!erun) return "sin ENCORE"; erun.loop = loop; erun.stage = stage; erun.phase = "stage"; erun.stageT = 0; encApply("advance"); return E.zoneOf(erun); }, // solo dev: salta a (vuelta, escenario) como si se hubiera elegido el destino
    free: () => goalBlips().map((p) => ({ x: +p.x.toFixed(1), z: +p.z.toFixed(1), gap: +Math.min(...obstacles().map((b) => Math.hypot(p.x - b.x, p.z - b.z) - b.r)).toFixed(1) })), // solo dev: puntos de objetivos (teleportador, cofres, máquina) y holgura al mueble más cercano
    scrap: (n?: number) => { if (n !== undefined) runScrap += n - GOAL_IO.scrap(); return GOAL_IO.scrap(); }, // solo dev: fija (si se pasa n) y devuelve los tornillos totales
    shop: (k: "cofre" | "maquina" = "cofre", who = 0) => { const c = who ? players.find((x) => x.id === who)?.car : lead.car; if (!c) return false; runScrap = Math.max(runScrap, 999); return shopDev(k, c.pos); }, // trae un cofre o la máquina al auto (con tornillos de sobra)
  },
  // R6b (solo dev, scripts/net-test.mjs): estado del online
  __net: {
    info: () => ({ state, net: net && { host: net.host, code: net.code }, bytes: netBytes, cards: state === "level" || netLv ? { by: netLv ? null : cardBy, n: offers.length, sub: $("luSub").textContent } : null, level, votes: votes.size, shots: netPools.j.filter((m) => m.isEnabled()).length + netPools.w.filter((m) => m.isEnabled()).length, status: $("netStatus").textContent, phase: erun?.phase ?? null, time: +time.toFixed(2), enemies: enemies.length, buf: netBuf.length, netIn, p: players.map((pl) => ({ id: pl.id, hp: Math.round(pl.hp), pos: pl.car ? [+pl.car.pos.x.toFixed(2), +pl.car.pos.z.toFixed(2)] : null })), e0: enemies[0] ? [+enemies[0].pos.x.toFixed(2), +enemies[0].pos.z.toFixed(2)] : null }),
  },
  __tick: (n: number) => { const g = engine.getDeltaTime; engine.getDeltaTime = () => 1000 / 60; for (let i = 0; i < n; i++) { engine.beginFrame(); scene.render(); engine.endFrame(); } engine.getDeltaTime = g; },
  __killAll: () => enemies.forEach((e) => { if (!e.def.boss) e.hp = 0; }),
  __time: (s: number) => (time = s),
  __xp: (n: number) => gainXp(n),
  __god: () => (god = true),
  __w: (id: string, lv = 1, evolved = false) => { const w = makeWeapon(id as WeaponId); w.lv = lv; w.evolved = evolved; weapons = weapons.filter((x) => x.id !== id); weapons.push(w); recompute(); return weapons.map((x) => x.id + x.lv + (x.evolved ? "E" : "")); }, // solo dev: da un arma
  // Dispara una habilidad sin enfriamiento (no toca el guardado): __abil("emp")
  __abil: (id?: AbilityId) => { if (!lead.car || state !== "play") return "sin partida"; if (id) { abil = id; abilLv = save.abilLv[id] ?? 0; } abilCd = 0; useAbility(lead.car); return abil; },
  __endless: () => { goEndless(); return { endless, next: RUN_BOSSES.at(-1) }; },
  __dmg: () => { const r = JSON.stringify(dmgBy); for (const k in dmgBy) delete dmgBy[k]; return r; },
  __out: () => JSON.stringify(Object.fromEntries(Object.entries(dmgOut).map(([k, v]) => [k, Math.round(v)]))), // daño infligido por arma
  __outro: () => {
    god = false; revives = 0; lead.hp = -1;
    if (!Object.keys(dmgBy).length) Object.assign(dmgBy, { hormiga: 68, cucaracha: 42, escupidora: 25 });
    if (state === "pause") resume();
    $("levelup").classList.add("hidden"); state = "play";
  }, // fuerza la derrota (cierre en cámara lenta)
  __killBoss: () => enemies.forEach((e) => { if (e.def.boss) e.hp = 0; }),
  __info: () => state === "duel" ? { state, ...duelM!.duelDev.info(), fps: engine.getFps() } : state === "match3" ? { state, ...m3M?.match3Dev.info(), fps: engine.getFps() } : ({ state, time, level, hp: lead.hp, enemies: enemies.length, gems: gems.length, weapons: weapons.map((w) => w.id + w.lv), fps: engine.getFps(), abil, abilCd, abilOn, worldK, stun: enemies.filter((e) => e.stun > 0).length, driveMul, endless, next: RUN_BOSSES[bossIdx] }),
  __car: () => lead.car && { p: lead.car.pos, f: lead.car.root.forward },
  __look: look,
  // Opciones de Imagen sin pasar por el menú ni guardar: __cfg({ fsr: "rendimiento" }) o __cfg({ preset: "ultra" }); sin argumentos devuelve el estado
  __cfg: (o: Record<string, unknown> = {}) => { const { preset, ...rest } = o; Object.assign(save, preset ? PRESETS_DEV[preset as keyof typeof PRESETS_DEV] : {}, rest); save.preset = presetOf(save); applySettings(); return { preset: save.preset, aa: save.aa, ...gfxInfo() }; },
  // Modo lab: arranca una partida congelada con una fila de cada enemigo delante del auto y la cámara a mano.
  // t = momento del ciclo (0 atardecer … 1 noche). __lab({ climate: "niebla", t: 0.4, boss: true, back: 15, up: 13, look: { lampI: 8 } }) ; ?lab en la URL lo corre solo.
  __lab: (o: { climate?: string; t?: number; boss?: boolean; back?: number; up?: number; look?: Parameters<typeof look>[0]; frames?: number; rain?: boolean } = {}) => {
    if (!bichosOk) return "espera a __ready (la precarga sigue)";
    if (state !== "menu") toMenu();
    startRun();
    god = true; LAB.on = true; LAB.back = o.back ?? 15; LAB.up = o.up ?? 13;
    $("hint").classList.add("hidden");
    const k = CLIMATES.find((c) => c.id === o.climate); if (k) profile.climate = k;
    LAB.t = o.t ?? 1; cycleS = -1;
    if (o.rain) { profile.rainAt = 0; rainWet(0.8); }
    if (o.look) look(o.look);
    const kinds = (Object.keys(DEF) as Kind[]).filter((x) => o.boss || !DEF[x].boss);
    const f = lead.car!.root.forward, r = new B.Vector3(f.z, 0, -f.x);
    kinds.forEach((kd, i) => spawnEnemy(kd, lead.car!.pos.add(f.scale(8 + (i % 2) * 5)).addInPlace(r.scale((i - (kinds.length - 1) / 2) * 5.5)).addInPlace(new B.Vector3(0, 1, 0))));
    for (let i = 0; i < (o.frames ?? 90); i++) { engine.beginFrame(); scene.render(); engine.endFrame(); }
    $("banner").classList.add("hidden");
    return `lab: ${profile.climate.name} · ${kinds.join(",")}`;
  },
  // Un enemigo suelto delante del auto, sale del modo lab y corre su IA (probar jefes sin el resto): __spawn('gato', 20)
  __spawn: (kd: Kind, dist = 20) => { LAB.on = false; const f = lead.car!.root.forward; spawnEnemy(kd, lead.car!.pos.add(f.scale(dist)).addInPlace(new B.Vector3(0, 1, 0))); return enemies.length; },
  __minis: (a: Kind, b: Kind) => { RUN_BOSSES[0][1] = a; RUN_BOSSES[1][1] = b; }, // fuerza los dos minijefes de la partida (probar jefes con __sim)
  __scene: scene,
  __ready: ensureAll, __loadTimes: times, // precarga: promesa de que todo está listo y ms por tarea
  __glbStats: glbStats,
  // n hormigas en grilla delante del auto, quietas en modo lab, para medir el render: __ants(300)
  __ants: (n = 300) => { const f = lead.car!.root.forward, r = new B.Vector3(f.z, 0, -f.x), w = Math.ceil(Math.sqrt(n)); for (let i = 0; i < n; i++) spawnEnemy("hormiga", lead.car!.pos.add(f.scale(6 + Math.floor(i / w) * 1.8)).addInPlace(r.scale((i % w - w / 2) * 1.5)).addInPlace(new B.Vector3(0, 0.4, 0))); return enemies.length; },
  __carObj: () => lead.car,
  // Luna (solo dev): __luna.crater(radio, hondo, distancia) deforma delante del auto (hondo < 0 = montículo); go("oscuro"|"sol"|"tierra") lleva el auto;
  // ring(n, r) pone n bichos en un anillo a r m; sky() dice si el Sol y la Tierra se ven; info() estado
  __luna: {
    ship: (id: ShipId = "nodriza") => { if (!lead.car || !MOON.on) return "sin luna"; shipsClear(); const f = flatL(lead.car.root.forward, lead.car.pos).normalize(); shipSpawn(id, at(lead.car.pos, f.x * 14, 0, f.z * 14), time, true); return "ok"; }, // borra las naves y pone una 14 m delante del auto (moon_ships.ts)
    crater: (r = 7, depth = 2.6, dist = 12) => { if (!lead.car || !MOON.on) return "sin luna"; const f = flatL(lead.car.root.forward, lead.car.pos).normalize(); deform(at(lead.car.pos, f.x * dist, 0, f.z * dist), r, depth); return "ok"; },
    go: (where: "oscuro" | "sol" | "tierra" | [number, number, number] = "oscuro", faceSun = false) => { // faceSun: de frente al Sol (moon_sky.ts: que se vea en cuadro) // [x, y, z]: una dirección cualquiera desde el centro
      if (!lead.car || !MOON.on) return "sin luna";
      const d = (Array.isArray(where) ? new B.Vector3(...where) : where === "oscuro" ? SUN_DIR.scale(-1).addInPlace(new B.Vector3(0.25, 0.2, 0)) : where === "tierra" ? new B.Vector3(0, 1, 0).addInPlace(EARTH_DIR.scale(-0.66)) : SUN_DIR.add(B.Vector3.Up())).normalize(); // tierra: queda ~15° bajo la horizontal, sobre el horizonte que ve la cámara
      const aim = faceSun ? SUN_DIR : Array.isArray(where) ? new B.Vector3(0, 0, 1) : where === "tierra" ? EARTH_DIR : where === "sol" ? SUN_DIR.scale(-1) : SUN_DIR; // de frente a la Tierra; de espaldas al Sol; del lado oscuro, mirando hacia la luz
      const p = moonPlace(d, aim);
      return { p, alt: alt(p) };
    },
    ring: (n = 12, r = 22, kind: Kind = "hormiga") => { if (!lead.car) return 0; for (let i = 0; i < n; i++) spawnEnemy(kind, MOON.on ? ringAt(lead.car.pos, (i / n) * Math.PI * 2, r) : lead.car.pos.add(new B.Vector3(Math.cos((i / n) * 6.28) * r, 1, Math.sin((i / n) * 6.28) * r))); return enemies.length; },
    meteor: (n = 12) => lunaDev.meteors(n), // lluvia de meteoritos ya, con el mapa en rojo (moon_events.ts)
    erupt: () => (lead.car ? lunaDev.erupt(lead.car.pos, camYaw) : "sin auto"), // erupción ya, a 14 m delante
    sky: () => ({ sol: skyVisible(SUN_DIR, cam), tierra: skyVisible(EARTH_DIR, cam) }),
    astro: (sun = true) => { if (!lead.car || !MOON.on) return "sin luna"; skyLaunch(sun, lead.car.pos); return skyInfo(); }, // lanza ya un proyectil del Sol (true) o de la Tierra
    info: () => ({ on: MOON.on, alt: lead.car ? alt(lead.car.pos) : null, up: lead.car ? upAt(lead.car.pos) : null, enemies: enemies.length, spits: spits.length }),
    clear: () => { for (const e of enemies) if (!e.def.boss) e.hp = -1e9; return enemies.length; }, // borra los bichos sin contarlos como bajas (sin XP)
    killOne: (kind: Kind) => { const e = enemies.find((x) => x.kind === kind && x.hp > 0); if (e) damage(e, 1e5); return !!e; }, // mata a uno por daño (el explosivo revienta en cadena)
    wound: (f = 0.5) => { for (const e of enemies) if (e.hp > 0) e.hp = e.maxHp * f; return enemies.length; }, // deja a todos con f de vida (el curandero tiene a quién curar)
    // fila de bichos delante del auto (por defecto los aliens), a dist m y separados sep m; tough: no se mueren con las armas (capturas)
    // gusano lunar: lo pone y lo hace salir ya a dist m delante del auto (capturas)
    goal: (kind: "celdas" | "antena" = "celdas", dist = 16) => { if (!lead.car || !MOON.on) return "sin luna"; const f = flatL(lead.car.root.forward, lead.car.pos); goalForce(kind, lead.car.pos, dist, Math.atan2(f.z, f.x)); return "ok"; }, // objetivo ya, a dist m (moon_goals.ts)
    rocket: (dist = 16) => { if (!lead.car || !MOON.on) return "sin luna"; const f = flatL(lead.car.root.forward, lead.car.pos); rocketForce(lead.car.pos, dist, Math.atan2(f.z, f.x)); return "ok"; }, // cohete de escape ya, a dist m
    worm: (dist = 7) => { if (!lead.car || !MOON.on) return "sin luna"; const f = flatL(lead.car.root.forward, lead.car.pos).normalize(); spawnEnemy("gusano", onFloor(at(lead.car.pos, f.x * dist + f.z * 10, 0, f.z * dist - f.x * 10), 0)); /* de costado: el arco cruza delante del auto */ const e = enemies[enemies.length - 1]; e.hp = e.maxHp = 1e6; wormForce(e, onFloor(at(lead.car.pos, f.x * dist, 0, f.z * dist), 0)); return "ok"; },
    row: (kinds: Kind[] = [...ALIENS], dist = 10, sep = 3.2, tough = true) => { if (!lead.car || !MOON.on) return "sin luna"; const f = flatL(lead.car.root.forward, lead.car.pos).normalize(), n0 = enemies.length; kinds.forEach((k, i) => { const x = (i - (kinds.length - 1) / 2) * sep; spawnEnemy(k, onFloor(at(lead.car!.pos, f.x * dist + f.z * x, 0, f.z * dist - f.x * x), 0.5)); }); if (tough) for (const e of enemies.slice(n0)) e.hp = e.maxHp = 1e6; return enemies.length; },
  },
    killOne: (kind: Kind) => { const e = enemies.find((x) => x.kind === kind && x.hp > 0); if (e) damage(e, 1e5); return !!e; }, // mata a uno por daño (el explosivo revienta en cadena)
});
