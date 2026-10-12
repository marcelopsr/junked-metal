// Carga de la partida y de los modos (extraído de main.ts, Paso 7): tareas pesadas de la cola de loading.ts + loaders perezosos de carrera/duelo/match-3.
import * as B from "@babylonjs/core";
import { carGlbProgress, loadCarGlbs } from "./carGlb";
import { GLB, glbProgress, loadGlbs } from "./glb";
import { idle, launch, type Task } from "./loading";
import { dirtyWaterTemplate, enemyTemplate, LEGS, legTemplate, nutTemplate, wingTemplate } from "./models";
import { DEF, type Kind } from "./enemies";
import { wormHeadTpl } from "./moon_worm";
import { worldReady } from "./world";
import { TRACKS, raceCfg } from "./kart_cfg";
import { initAudio } from "./sfx";
import { menuOff } from "./menuscene";
import { encCfg, encMax, reset, save } from "./menu";
import { daily as fetchDaily, weekly as fetchWeekly } from "./net";
import { isTouch } from "./input";
const $ = (id: string) => document.getElementById(id)!;

export interface RunLoaderContext {
  scene: B.Scene; cam: B.FreeCamera;
  getState: () => string; setState: (s: "race" | "duel" | "match3") => void; zoneFor: (d: boolean) => string;
  setZone: (z: string, b: boolean) => void; showWorld: (v: boolean) => void;
  tpls: (() => unknown)[]; // plantillas que define main.ts (gema, pila, imán, baba)
  onExitMode: () => void;
  clearRun: () => void; startRun: (daily: boolean) => void;
  setRun: { encore: (v: boolean) => void; coop: (v: number) => void; dailyInfo: (v: { date: string; seed: number } | null) => void; weeklyInfo: (v: { week: string; seed: number; regla: string } | null) => void; weeklyOn: (v: boolean) => void };
}
let c!: RunLoaderContext;
export function initRunLoader(ctx: RunLoaderContext) { c = ctx; }

let bichosOk = false, autosOk = false, plantillasOk = false, efectosOk = false, fxN = 0, fxTotal = 1;
export const loaderOk = () => bichosOk;
export const T_BICHOS: Task = { id: "bichos", label: "Cargando bichos", w: 3, done: () => bichosOk, run: async () => { await loadGlbs(c.scene); bichosOk = true; }, prog: glbProgress };
export const T_AUTOS: Task = { id: "autos", label: "Cargando autos", w: 2, done: () => autosOk, run: async () => { await loadCarGlbs(c.scene); autosOk = true; }, prog: carGlbProgress };
// Plantillas instanciadas que la partida crearía al vuelo (un hipo al primer bicho, tuerca o pila): se arman antes, de a una por hueco libre
export const T_PLANTILLAS: Task = { id: "plantillas", label: "Cargando bichos", w: 2, done: () => plantillasOk, prog: () => fxN / fxTotal, run: async () => {
  const jobs: (() => unknown)[] = [...c.tpls, nutTemplate, dirtyWaterTemplate];
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
export const worldTask = (zone: () => string): Task => ({ id: "patio", label: "Armando el patio", w: 5, done: () => worldReady(zone()), run: () => { c.setZone(zone(), false); if (c.getState() === "menu" || c.getState() === "match3") c.showWorld(false); } });
// Compila los shaders de todos los materiales ya creados (en paralelo si el navegador puede) para que el primer cuadro de partida no se trabe
// ponytail: solo los materiales que existen al correr (no los de armas ni de una zona que se arma después); techo: precompilar con los defines de cada plantilla de arma
export const T_EFECTOS: Task = { id: "efectos", label: "Preparando efectos", w: 3, done: () => efectosOk, prog: () => fxN / fxTotal, run: async () => {
  const jobs: [B.Material, B.Mesh][] = [], seen = new Set<B.Material>();
  for (const m of c.scene.meshes) {
    if (!(m instanceof B.Mesh) || !m.getTotalVertices()) continue;
    for (const mat of m.material instanceof B.MultiMaterial ? m.material.subMaterials : [m.material]) if (mat && !seen.has(mat)) { seen.add(mat); jobs.push([mat, m]); }
  }
  fxTotal = jobs.length;
  const compile = (mat: B.Material, mesh: B.Mesh) => Promise.race([mat.forceCompilationAsync(mesh, { useInstances: mesh.position.y < -400 }).catch(() => undefined), new Promise<void>((r) => setTimeout(r, 2000))]); // headless: sin tope un shader cuelga ensureAll; 2 s basta para los que compilan y shots no superan 90 s
  for (fxN = 0; fxN < jobs.length; fxN += 6) { await Promise.all(jobs.slice(fxN, fxN + 6).map(([mat, m]) => compile(mat, m))); await idle(); } // las plantillas viven en y = -500
  fxN = fxTotal; efectosOk = true;
} };
/** Espera n cuadros dibujados (con tope de 1,5 s: con la pestaña oculta no hay cuadros). */
export const afterFrames = (n: number) => new Promise<void>((r) => {
  let k = 0;
  const done = () => { c.scene.onAfterRenderObservable.remove(o); clearTimeout(t); r(); };
  const o = c.scene.onAfterRenderObservable.add(() => { if (++k >= n) done(); }), t = setTimeout(done, 1500);
});

export const runTasks = (zone: () => string): Task[] => [T_BICHOS, T_AUTOS, T_PLANTILLAS, worldTask(zone), T_EFECTOS];
export const raceZone = (battle: boolean) => battle ? "patio" : TRACKS[raceCfg.cup ? 0 : raceCfg.track].zone;
// Carrera (kart.ts) también en chunk aparte: se carga al elegirla
export let kartM: typeof import("./kart") | null = null;
export async function loadKart() {
  if (!kartM) { const m = await import("./kart"); m.initKart({ scene: c.scene, cam: c.cam, onExit: c.onExitMode, load: (label, zone, go) => { void launch([worldTask(() => zone), T_EFECTOS], label, go, () => afterFrames(2), true); } }); kartM = m; } // la luz del menú la pone menuTick
}

// Duelo y match-3 se cargan al entrar (chunks aparte): la portada no los necesita
export let duelM: typeof import("./duel") | null = null, m3M: typeof import("./match3") | null = null;
const modeOpts = () => ({ scene: c.scene, cam: c.cam, onExit: c.onExitMode });
export async function loadDuel() {
  if (!duelM) { const m = await import("./duel"); m.initDuel(modeOpts()); duelM = m; if (import.meta.env.DEV) Object.assign(window, { __duel: m.duelDev }); }
}
export async function loadMatch3() {
  if (!m3M) { const m = await import("./match3"); m.initMatch3(modeOpts()); m3M = m; if (import.meta.env.DEV) Object.assign(window, { __match3: m.match3Dev }); }
}
export function launchRun(d = false, enc = false, n = 0, then?: () => void, wk = false) {
  c.setRun.encore(enc); c.setRun.coop(n || (enc && !isTouch ? Math.min(encCfg.players, encMax()) : 1)); // R7a/c: de 2 a 4 jugadores solo en ENCORE y solo en compu (3-4 si siguen conectados los joysticks)
  initAudio(); // el gesto del jugador es este clic: el audio se activa acá, no tras la carga
  c.setRun.dailyInfo(null); c.setRun.weeklyInfo(null); c.setRun.weeklyOn(false);
  const dp = wk ? Promise.race([fetchWeekly(), new Promise<null>((r) => setTimeout(r, 2500))]).then((x) => { c.setRun.weeklyInfo(x); c.setRun.weeklyOn(!!x); }) : d ? Promise.race([fetchDaily(), new Promise<null>((r) => setTimeout(r, 2500))]).then((x) => { c.setRun.dailyInfo(x); }) : Promise.resolve(); // sin red o sin sesión: semilla local, sin ranking
  void dp.then(() => launch(runTasks(() => c.zoneFor(d)), "Encendiendo el auto", () => { c.startRun(d); then?.(); }, () => afterFrames(2)));
}
export function goRace(battle = false) {
  initAudio();
  void loadKart().then(() => launch([worldTask(() => raceZone(battle)), T_EFECTOS], battle ? "Inflando los globos" : "Preparando la largada", () => enterRace(battle), () => afterFrames(2)));
}
function enterRace(battle: boolean) {
  initAudio(); c.clearRun(); menuOff();
  c.setState("race"); reset(null);
  $("hud").classList.add("hidden");
  kartM!.setRaceCar(save.car);
  if (battle) kartM!.startBattle(); else kartM!.startRace();
}
function enterDuel() {
  initAudio(); c.clearRun(); menuOff();
  c.setState("duel"); reset(null);
  $("hud").classList.add("hidden");
  document.getElementById("touch")?.classList.add("hidden");
  duelM!.startDuel();
}
export function goDuel() {
  initAudio();
  void loadDuel().then(() => launch([T_EFECTOS], "Preparando demolición", () => enterDuel(), () => afterFrames(2)));
}
function enterMatch3() {
  initAudio(); c.clearRun(); menuOff();
  c.setState("match3"); reset(null);
  $("hud").classList.add("hidden");
  const q = new URLSearchParams(location.search);
  const seed = q.has("seed") ? Number(q.get("seed")) : 20261007;
  m3M!.startMatch3(Number.isFinite(seed) ? seed : 20261007);
}
export function goMatch3() {
  initAudio();
  void loadMatch3().then(() => launch([], "Encendiendo gabinete", () => enterMatch3(), () => afterFrames(2)));
}
