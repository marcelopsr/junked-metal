// Modo Carrera estilo Mario Kart: circuito cerrado en el patio, 10 corredores (1-2 humanos con pantalla dividida + IA),
// cajas de objetos, derrape con mini-turbo, vueltas, posiciones, Lakitu (reaparición) y copa de 3 carreras.
// El módulo se engancha a main.ts por initKart / startRace / raceTick; todo lo que crea se libera en endRace.
import * as B from "@babylonjs/core";
import "./race.css";
import { Car, CARS, drive } from "./car";
import { burst, FX, mark } from "./fx";
import { icon } from "./icons";
import { padsConnected, pollPlayer, type PlayerCtl } from "./input";
import { cyl, sph, type CarKind, type CarOpts } from "./models";
import { applyClimate, canvasTex, M, pbr, setSplit, setLamp, shadows } from "./render";
import { rng, seedRng } from "./rng";
import { engineSfx, engineStop, music, SFX } from "./sfx";
import { buildLayout, clearLayout, setZone } from "./world";
import { CLIMATES } from "./run";

// ---------- Configuración (se guarda aparte del guardado del juego) ----------
export type RaceCfg = { players: 1 | 2; p1: "kbd" | "pad0" | "pad1"; p2: "pad0" | "pad1" | "kbd2"; cc: 50 | 100 | 150; laps: 3 | 5; cup: boolean; car2: CarKind };
const CFG_KEY = "rcfight-race";
export const raceCfg: RaceCfg = { players: 1, p1: "kbd", p2: "pad0", cc: 100, laps: 3, cup: true, car2: "formula" };
try { Object.assign(raceCfg, JSON.parse(localStorage.getItem(CFG_KEY) ?? "{}")); } catch { /* sin storage */ }
export const saveRaceCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(raceCfg)); } catch { /* sin storage */ } };

type Deps = { scene: B.Scene; cam: B.FreeCamera; onExit(): void };
let D: Deps;
let cam2: B.FreeCamera | null = null;
export function initKart(d: Deps) { D = d; }

// ---------- Circuito ----------
const W = 9; // medio ancho de la pista
const DS = 3.2; // separación entre muestras
const BASE: [number, number][] = [[0, -110], [60, -112], [108, -88], [126, -32], [116, 22], [100, 80], [60, 118], [0, 126], [-60, 116], [-108, 84], [-126, 26], [-118, -34], [-98, -84], [-50, -110]];
const VARIANTS = ["Circuito del Patio", "Patio al revés", "Patio espejo"];
type Track = { P: B.Vector3[]; T: B.Vector3[]; R: B.Vector3[]; N: number; len: number };
let trk: Track;

function buildTrackData(variant: number): Track {
  let pts = BASE.map(([x, z]) => new B.Vector3(variant === 2 ? -x : x, 0, z));
  if (variant === 1) pts = pts.reverse();
  // Catmull-Rom cerrada → polilínea densa → muestras a distancia pareja
  const dense: B.Vector3[] = [], n = pts.length;
  for (let i = 0; i < n; i++) for (let s = 0; s < 24; s++) dense.push(B.Vector3.CatmullRom(pts[(i + n - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n], s / 24));
  const cum = [0];
  for (let i = 1; i <= dense.length; i++) cum.push(cum[i - 1] + B.Vector3.Distance(dense[i % dense.length], dense[i - 1]));
  const len = cum[dense.length], N = Math.round(len / DS), P: B.Vector3[] = [];
  let j = 0;
  for (let i = 0; i < N; i++) {
    const d = (i / N) * len;
    while (cum[j + 1] < d) j++;
    P.push(B.Vector3.Lerp(dense[j], dense[(j + 1) % dense.length], (d - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j])));
  }
  const T = P.map((p, i) => P[(i + 1) % N].subtract(P[(i + N - 1) % N]).normalize());
  const R = T.map((t) => new B.Vector3(t.z, 0, -t.x));
  return { P, T, R, N, len: len };
}

// ---------- Estado de la carrera ----------
type Item = "turbo" | "petardo" | "chicle" | "misil" | "escudo" | "rayo";
const ITEM_ICON: Record<Item, string> = { turbo: "turbo", petardo: "petardos", chicle: "gomitas", misil: "bengalas", escudo: "lego", rayo: "tesla" };
const ITEM_NAME: Record<Item, string> = { turbo: "Turbo", petardo: "Petardo", chicle: "Chicle", misil: "Misil", escudo: "Escudo", rayo: "Rayo" };
type Racer = {
  id: number; name: string; car: Car; human: number; ctl?: PlayerCtl; color: string;
  top: number; acc: number; turn: number; grip: number; skill: number; lane: number;
  idx: number; lap: number; frac: number; fin: number; place: number; points: number;
  item: Item | null; itemAt: number; useAt: number; prevItemBtn: boolean;
  boost: number; slow: number; spin: number; shield: number; inv: number; spinRot: number;
  drifting: number; charge: number; offT: number; stuckT: number; camYaw: number; camPos: B.Vector3; fs: number; lastLap: number; auto: boolean;
};
type Proj = { m: B.Mesh; kind: "petardo" | "misil"; owner: Racer; v: B.Vector3; life: number; target?: Racer };
type Chicle = { m: B.Mesh; owner: Racer; life: number; arm: number };
type Box = { m: B.Mesh; at: B.Vector3; t: number };
type Pad = { at: B.Vector3; m: B.Mesh };
type Ant = { m: B.Mesh; c: B.Vector3; n: B.Vector3; ph: number; sp: number; hit: number };

let racers: Racer[] = [];
let humans: Racer[] = [];
let projs: Proj[] = [], chicles: Chicle[] = [], boxes: Box[] = [], pads: Pad[] = [], ants: Ant[] = [];
let mesh: B.AbstractMesh[] = [];
let active = false, t = 0, countdown = 3.4, finishedAt = -1, resultsOn = false, variant = 0, raceNo = 1;
let cup: Record<number, number> = {};
let mapCv: HTMLCanvasElement, mapCtx: CanvasRenderingContext2D;

export const raceActive = () => active;

const POINTS = [15, 12, 10, 8, 7, 6, 5, 3, 2, 1];
const NAMES = ["Soldadito", "Muñeca", "Robot", "Dino", "Figura", "Chispa", "Tuerca", "Pistón", "Resorte", "Gomita"];
const PAINTS = ["#d62828", "#1d4ed8", "#16a34a", "#e0a030", "#9a6fb5", "#2a9d8f", "#f08dbd", "#ff7a3a", "#35c9ff", "#b6ff6a"];
const PILOT_IDS = ["soldadito", "muneca", "robot", "dino", "figura"];
// Estadísticas de carrera por auto: [velocidad máx, aceleración, giro, agarre en derrape]
const KSTAT: Record<CarKind, [number, number, number, number]> = {
  buggy: [26, 34, 2.6, 7], monster: [24, 28, 2.3, 8], formula: [29, 38, 2.9, 6], tanque: [22, 24, 2.0, 9], carrera: [28, 40, 3.1, 5],
  axel: [27, 36, 3.0, 6], helado: [24, 30, 2.4, 8], combi: [23, 26, 2.2, 9],
};

// ---------- Construcción del circuito ----------
function ribbon(off0: number, off1: number, y: number, vScale: number, colorFn?: (i: number) => [number, number, number, number]) {
  const pos: number[] = [], uv: number[] = [], ind: number[] = [], col: number[] = [], { P, R, N } = trk;
  for (let i = 0; i <= N; i++) {
    const p = P[i % N], r = R[i % N];
    pos.push(p.x + r.x * off0, y, p.z + r.z * off0, p.x + r.x * off1, y, p.z + r.z * off1);
    uv.push(0, (i * DS) / vScale, 1, (i * DS) / vScale);
    if (colorFn) { const c = colorFn(i); col.push(...c, ...c); }
    if (i < N) { const a = i * 2; ind.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const m = new B.Mesh("ribbon", D.scene), vd = new B.VertexData();
  vd.positions = pos; vd.indices = ind; vd.uvs = uv; if (colorFn) vd.colors = col;
  vd.normals = []; B.VertexData.ComputeNormals(pos, ind, vd.normals);
  vd.applyToMesh(m);
  m.receiveShadows = true; m.isPickable = false;
  mesh.push(m);
  return m;
}

function buildTrack() {
  const road = ribbon(-W, W, 0.05, 14);
  road.material = pbr("raceRoad", { color: "#ffffff", rough: 0.92, tex: roadTex() });
  const curb = (a: number, b: number) => {
    const m = ribbon(a, b, 0.07, 6, (i) => (Math.floor(i / 2) % 2 ? [0.95, 0.95, 0.95, 1] : [0.86, 0.14, 0.14, 1]));
    m.material = pbr("raceCurb", { color: "#ffffff", rough: 0.7 });
  };
  curb(-W - 1.8, -W); curb(W, W + 1.8);
  // Línea de salida: tablero a cuadros + arco
  const { P, T, R } = trk, s0 = P[0], yaw = Math.atan2(T[0].x, T[0].z);
  const line = B.MeshBuilder.CreatePlane("startLine", { width: W * 2, height: 3.2 }, D.scene);
  line.rotation.x = Math.PI / 2; line.position.set(s0.x, 0.09, s0.z); line.rotation.y = yaw;
  line.rotation = new B.Vector3(Math.PI / 2, yaw, 0);
  const chk = canvasTex(128, (c, s) => { const n = 8; for (let i = 0; i < n * 2; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? "#111" : "#fff"; c.fillRect((i * s) / (n * 2), (j * s) / 2, s / (n * 2) + 1, s / 2 + 1); } });
  line.material = pbr("raceLine", { color: "#ffffff", rough: 0.7, tex: chk });
  mesh.push(line);
  const arch: B.Mesh[] = [];
  for (const sd of [-1, 1]) arch.push(cyl(1.2, 1.2, 12, M.plastic("#f4f7fa"), [s0.x + R[0].x * sd * (W + 3), 6, s0.z + R[0].z * sd * (W + 3)], undefined, 8));
  const banner = B.MeshBuilder.CreateBox("arch", { width: (W + 3) * 2, height: 3, depth: 0.6 }, D.scene);
  banner.position.set(s0.x, 12.5, s0.z); banner.rotation.y = yaw;
  const bt = canvasTex(256, (c, s) => { c.fillStyle = "#1d4ed8"; c.fillRect(0, 0, s, s); c.fillStyle = "#fff"; c.font = "bold 90px sans-serif"; c.textAlign = "center"; c.fillText("SALIDA", s / 2, s * 0.62); });
  banner.material = pbr("raceBanner", { color: "#ffffff", rough: 0.6, tex: bt });
  arch.push(banner);
  for (const m of arch) { shadows.addShadowCaster(m); mesh.push(m); }
  // Cajas de objetos (5 filas de 3)
  const qt = canvasTex(128, (c, s) => { c.fillStyle = "#35c9ff"; c.fillRect(0, 0, s, s); c.strokeStyle = "#fff"; c.lineWidth = 8; c.strokeRect(6, 6, s - 12, s - 12); c.fillStyle = "#fff"; c.font = "bold 100px sans-serif"; c.textAlign = "center"; c.fillText("?", s / 2, s * 0.76); });
  const qm = pbr("raceBox", { color: "#ffffff", rough: 0.3, tex: qt, emissive: "#1a5a7a" });
  for (const f of [0.1, 0.3, 0.5, 0.7, 0.9]) for (const o of [-5, 0, 5]) {
    const i = Math.floor(f * trk.N), at = P[i].add(R[i].scale(o)); at.y = 1.5;
    const m = B.MeshBuilder.CreateBox("itemBox", { size: 1.8 }, D.scene);
    m.position.copyFrom(at); m.material = qm; m.isPickable = false;
    boxes.push({ m, at, t: 0 }); mesh.push(m);
  }
  // Placas de turbo
  const ch = canvasTex(128, (c, s) => { c.fillStyle = "#ffb02e"; c.fillRect(0, 0, s, s); c.fillStyle = "#fff"; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(s * 0.15, s * (0.9 - k * 0.3)); c.lineTo(s * 0.5, s * (0.6 - k * 0.3)); c.lineTo(s * 0.85, s * (0.9 - k * 0.3)); c.lineTo(s * 0.85, s * (0.78 - k * 0.3)); c.lineTo(s * 0.5, s * (0.48 - k * 0.3)); c.lineTo(s * 0.15, s * (0.78 - k * 0.3)); c.fill(); } });
  const pm = pbr("racePad", { color: "#ffffff", rough: 0.5, tex: ch, emissive: "#a05a00" });
  for (const [f, o] of [[0.17, 3], [0.47, -3], [0.77, 3]] as const) {
    const i = Math.floor(f * trk.N), at = P[i].add(R[i].scale(o));
    const m = B.MeshBuilder.CreatePlane("pad", { width: 5, height: 7 }, D.scene);
    m.rotation = new B.Vector3(Math.PI / 2, Math.atan2(T[i].x, T[i].z), 0); m.position.set(at.x, 0.1, at.z); m.material = pm; m.isPickable = false;
    pads.push({ at, m }); mesh.push(m);
  }
  // Rampitas en dos rectas (el cuerpo toma la pose de la malla al crearse: se inclina ANTES del PhysicsAggregate)
  for (const f of [0.34, 0.84]) {
    const i = Math.floor(f * trk.N), p = P[i];
    const r = B.MeshBuilder.CreateBox("ramp", { width: 9, height: 0.5, depth: 9 }, D.scene);
    r.position.set(p.x, 0.5, p.z); r.rotation = new B.Vector3(-0.2, Math.atan2(T[i].x, T[i].z), 0);
    r.material = pbr("raceRamp", { color: "#ffc24d", rough: 0.6 });
    new B.PhysicsAggregate(r, B.PhysicsShapeType.BOX, { mass: 0, friction: 0.4 }, D.scene);
    mesh.push(r);
  }
  // Hormigas que cruzan la pista
  for (const [f, ph] of [[0.22, 0], [0.4, 2], [0.57, 4], [0.66, 1], [0.82, 3], [0.95, 5]] as const) {
    const i = Math.floor(f * trk.N);
    const m = B.MeshBuilder.CreateSphere("ant", { diameter: 1.4, segments: 5 }, D.scene);
    m.scaling.set(0.9, 0.6, 1.5); m.material = M.plastic("#a0522d");
    shadows.addShadowCaster(m);
    ants.push({ m, c: P[i].clone(), n: R[i].clone(), ph, sp: 0.5 + (ph % 3) * 0.12, hit: 0 });
    mesh.push(m);
  }
  // Pasto bajo y árboles ya existen en el patio; el patio queda de fondo
}
let roadTx: B.Texture | null = null;
const roadTex = () => roadTx ??= canvasTex(256, (c, s) => {
  c.fillStyle = "#6e6a66"; c.fillRect(0, 0, s, s);
  for (let i = 0; i < 1800; i++) { c.fillStyle = Math.random() < 0.5 ? "#7d7873" : "#5c5854"; c.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
  c.fillStyle = "#e8e4d4"; c.fillRect(s / 2 - 3, 0, 6, s * 0.5); // línea central discontinua
});

// ---------- Corredores ----------
function makeRacers() {
  racers = []; humans = [];
  const kinds = Object.keys(CARS) as CarKind[];
  const nH = raceCfg.players;
  const ctl1: PlayerCtl = raceCfg.p1 === "kbd" ? (nH === 2 && raceCfg.p2 === "kbd2" ? "kbd1" : nH === 2 ? "kbd1" : "kbd1+arrows") : { pad: raceCfg.p1 === "pad0" ? 0 : 1 };
  const ctl2: PlayerCtl = raceCfg.p2 === "kbd2" ? "kbd2" : { pad: raceCfg.p2 === "pad0" ? 0 : 1 };
  const picks: CarKind[] = [];
  for (let i = 0; i < 10; i++) picks.push(i === 0 ? humanCar(0) : i === 1 && nH === 2 ? raceCfg.car2 : kinds[(i * 3 + raceNo) % kinds.length]);
  // Parrilla: los humanos salen atrás (como arrancando en el fondo) y la IA se reparte
  const order = [...Array(10).keys()].reverse();
  const slots = order.map((o) => o); // posición 0 = pole
  const humanSlots = nH === 2 ? [8, 9] : [9];
  const aiSlots = slots.filter((s) => !humanSlots.includes(s)).sort((a, b) => a - b);
  let ai = 0;
  for (let i = 0; i < 10; i++) {
    const human = i < nH ? i : -1, grid = human >= 0 ? humanSlots[human] : aiSlots[ai++];
    const kind = picks[i], ks = KSTAT[kind];
    const row = Math.floor(grid / 2), side = grid % 2 ? 1 : -1, back = 6 + row * 7 + (side > 0 ? 3.5 : 0);
    const idx = (trk.N - Math.round(back / DS) + trk.N) % trk.N;
    const p = trk.P[idx].add(trk.R[idx].scale(side * 3.6)), yaw = Math.atan2(trk.T[idx].x, trk.T[idx].z);
    const opts: CarOpts = { paint: PAINTS[i % PAINTS.length], pilot: PILOT_IDS[i % PILOT_IDS.length], lamp: "calido" };
    const car = new Car(D.scene, kind, opts, { x: p.x, z: p.z, yaw });
    car.setMass(CARS[kind].mass * 1.2);
    const r: Racer = {
      id: i, name: human >= 0 ? `Jugador ${human + 1}` : NAMES[i % NAMES.length], car, human, ctl: human === 0 ? ctl1 : human === 1 ? ctl2 : undefined, color: PAINTS[i % PAINTS.length],
      top: ks[0], acc: ks[1], turn: ks[2], grip: ks[3], skill: 0.9 + rng() * 0.16, lane: (rng() - 0.5) * 8,
      idx, lap: 0, frac: 0, fin: 0, place: grid + 1, points: 0, item: null, itemAt: 0, useAt: 0, prevItemBtn: false,
      boost: 0, slow: 0, spin: 0, shield: 0, inv: 0, spinRot: 0, drifting: 0, charge: 0, offT: 0, stuckT: 0, camYaw: yaw, camPos: new B.Vector3(), fs: 0, lastLap: 0, auto: false,
    };
    racers.push(r);
    if (human >= 0) humans.push(r);
  }
}
const humanCar = (h: number): CarKind => (h === 0 ? p1Car : raceCfg.car2);
/** El auto del jugador 1 es el del garaje (main.ts lo pasa antes de empezar). */
let p1Car: CarKind = "buggy";
export const setRaceCar = (k: CarKind) => { p1Car = k; };

// ---------- Arranque / cierre ----------
let dom: HTMLElement | null = null;
const $r = (s: string) => dom!.querySelector(s) as HTMLElement;

function ensureDom() {
  if (dom) return;
  dom = document.createElement("div");
  dom.id = "race";
  dom.className = "hidden";
  dom.innerHTML = `
    <div class="rp" data-p="0"><div class="rpos"><b>1</b><i>/10</i></div><div class="rlap"></div><div class="ritem"></div><div class="rspd"></div><div class="rmsg"></div></div>
    <div class="rp" data-p="1"><div class="rpos"><b>1</b><i>/10</i></div><div class="rlap"></div><div class="ritem"></div><div class="rspd"></div><div class="rmsg"></div></div>
    <canvas id="rmap" width="160" height="160"></canvas>
    <div id="rcount"></div>
    <div id="rtab"></div>
    <div id="rpause" class="hidden"><div class="rtitle">PAUSA</div><nav><button data-r="resume" class="primary">Seguir</button><button data-r="restart">Reiniciar</button><button data-r="exit">Salir al menú</button></nav></div>
    <div id="rres" class="hidden"><div class="rtitle"></div><table></table><nav><button data-r="next" class="primary">Siguiente carrera</button><button data-r="again">Revancha</button><button data-r="exit">Menú</button></nav></div>`;
  document.body.appendChild(dom);
  mapCv = $r("#rmap") as HTMLCanvasElement; mapCtx = mapCv.getContext("2d")!;
  dom.addEventListener("click", (e) => {
    const k = (e.target as HTMLElement).dataset.r;
    if (k === "next") nextRace(); else if (k === "again") { cup = {}; raceNo = 1; startRace(true); } else if (k === "exit") exitRace();
    else if (k === "resume") setPause(false); else if (k === "restart") { setPause(false); startRace(true); }
  });
  addEventListener("keydown", (e) => { if (active && e.code === "Escape" && !resultsOn) setPause(!paused); });
}

export function startRace(keepCup = false) {
  ensureDom();
  endRace(true);
  setZone("patio"); clearLayout();
  D.scene.physicsEnabled = true;
  if (!keepCup) { cup = {}; raceNo = 1; }
  variant = (raceNo - 1) % VARIANTS.length;
  trk = buildTrackData(variant);
  applyClimate(CLIMATES.find((c) => c.id === "mediodia")!);
  seedRng(20261003 + raceNo);
  buildTrack();
  humanCar(0); // asegura la clave
  makeRacers();
  t = 0; countdown = 3.4; finishedAt = -1; resultsOn = false; active = true;
  const split = raceCfg.players === 2;
  if (split) {
    if (!cam2) { cam2 = new B.FreeCamera("cam2", new B.Vector3(0, 10, -10), D.scene); cam2.minZ = 0.3; cam2.maxZ = 1500; }
    cam2.fov = 0.95; D.cam.viewport = new B.Viewport(0, 0, 0.5, 1); cam2.viewport = new B.Viewport(0.5, 0, 0.5, 1);
    D.scene.activeCameras = [D.cam, cam2];
    setSplit(cam2, true);
  } else { D.cam.viewport = new B.Viewport(0, 0, 1, 1); D.scene.activeCameras = null; D.scene.activeCamera = D.cam; }
  D.cam.fov = 0.95;
  for (const r of racers) { r.camPos = r.car.pos.clone(); }
  dom!.classList.remove("hidden");
  dom!.classList.toggle("split", split);
  $r("#rres").classList.add("hidden");
  document.getElementById("fe")?.classList.add("hidden");
  music("run", 0.7);
  for (const r of humans) { r.camPos = r.car.pos.subtract(fwdOf(r).scale(9)).add(new B.Vector3(0, 5, 0)); }
}

function fwdOf(r: Racer) { const f = r.car.root.forward; return new B.Vector3(f.x, 0, f.z).normalize(); }

export function endRace(silent = false) {
  paused = false; D.scene.physicsEnabled = true; dom?.querySelector("#rpause")?.classList.add("hidden");
  if (!active && silent) { cleanup(); return; }
  cleanup();
  active = false;
  engineStop();
  if (cam2) { setSplit(cam2, false); }
  D.cam.viewport = new B.Viewport(0, 0, 1, 1); D.scene.activeCameras = null; D.scene.activeCamera = D.cam;
  dom?.classList.add("hidden");
  dom?.classList.remove("split");
}
function cleanup() {
  for (const r of racers) r.car.dispose();
  for (const p of projs) p.m.dispose();
  for (const c of chicles) c.m.dispose();
  for (const m of mesh) { m.physicsBody?.dispose(); m.dispose(); }
  racers = []; humans = []; projs = []; chicles = []; boxes = []; pads = []; ants = []; mesh = [];
}
export function exitRace() {
  endRace();
  seedRng(20260929); buildLayout();
  D.onExit();
}
function nextRace() { raceNo++; startRace(true); }

// ---------- IA y manejo ----------
const clamp = B.Scalar.Clamp;
function nearestIdx(r: Racer) {
  const p = r.car.pos, { P, N } = trk;
  let best = r.idx, bd = 1e9;
  for (let k = -4; k <= 14; k++) { const j = (r.idx + k + N) % N, d = (P[j].x - p.x) ** 2 + (P[j].z - p.z) ** 2; if (d < bd) { bd = d; best = j; } }
  return best;
}

function weightedItem(place: number): Item {
  // Más atrás = mejores objetos (como Mario Kart)
  const back = clamp((place - 1) / 9, 0, 1);
  const table: [Item, number][] = [["chicle", 3 - 2 * back], ["petardo", 3], ["turbo", 2 + 3 * back], ["escudo", 2], ["misil", back * 3.2], ["rayo", back > 0.7 ? 1.6 : 0]];
  let s = 0; for (const [, w] of table) s += w;
  let x = Math.random() * s;
  for (const [it, w] of table) { if ((x -= w) <= 0) return it; }
  return "turbo";
}

function useItem(r: Racer) {
  const it = r.item; if (!it) return;
  r.item = null;
  const f = fwdOf(r), pos = r.car.pos;
  if (it === "turbo") { r.boost = Math.max(r.boost, 1.6); SFX.levelUp(); }
  else if (it === "escudo") { r.shield = 7; SFX.pickup(); }
  else if (it === "petardo") spawnProj(r, "petardo", pos.add(f.scale(2.4)).add(new B.Vector3(0, 0.6, 0)), f.scale(52));
  else if (it === "misil") {
    const ahead = racers.filter((o) => o !== r && o.lap * trk.N + o.idx > r.lap * trk.N + r.idx).sort((a, b) => (a.lap * trk.N + a.idx) - (b.lap * trk.N + b.idx))[0];
    spawnProj(r, "misil", pos.add(f.scale(2.4)).add(new B.Vector3(0, 0.8, 0)), f.scale(42), ahead);
  } else if (it === "chicle") {
    const m = sph(1.3, pbr("raceGum", { color: "#ff6ec7", rough: 0.2, emissive: "#6a1050" }), [pos.x - f.x * 3, 0.6, pos.z - f.z * 3], [1, 0.5, 1], 6);
    chicles.push({ m, owner: r, life: 40, arm: 0.6 });
  } else if (it === "rayo") {
    for (const o of racers) if (o !== r) { if (o.shield > 0) o.shield = 0; else { o.slow = 4.5; hurtRacer(o, 1.0); } }
    SFX.boss();
  }
  SFX.click();
}
function spawnProj(owner: Racer, kind: "petardo" | "misil", at: B.Vector3, v: B.Vector3, target?: Racer) {
  const m = kind === "petardo" ? cyl(0.5, 0.5, 1.1, pbr("raceShell", { color: "#ef4444", rough: 0.4, emissive: "#6a1010" }), [at.x, at.y, at.z], [Math.PI / 2, 0, 0], 8)
    : cyl(0.0, 0.6, 1.8, pbr("raceMissile", { color: "#ffb02e", rough: 0.4, emissive: "#a05a00" }), [at.x, at.y, at.z], [Math.PI / 2, 0, 0], 8);
  projs.push({ m, kind, owner, v, life: kind === "misil" ? 6 : 4, target });
}
function hurtRacer(r: Racer, dur: number) {
  if (r.inv > 0) return;
  if (r.shield > 0) { r.shield = 0; SFX.break(); return; }
  r.spin = dur; r.spinRot = 0; r.boost = 0; r.drifting = 0; r.charge = 0;
  r.car.body.setLinearVelocity(r.car.body.getLinearVelocity().scale(0.35));
  burst(r.car.pos.add(new B.Vector3(0, 0.6, 0)), { n: 18, color: "#ffd84d", color2: "#ff7a3a", size: [0.2, 0.5], power: [4, 10], life: [0.3, 0.6] });
  if (r.human >= 0) SFX.hurt();
}

function aiInput(r: Racer, dt: number) {
  const { P, R, N } = trk;
  const look = Math.round(5 + Math.abs(r.fs) * 0.22 * (r.skill));
  const j = (r.idx + look) % N, tg = P[j].add(R[j].scale(r.lane * clamp(1 - Math.abs(angleAhead(r.idx)) * 2, 0.2, 1)));
  const pos = r.car.pos, f = fwdOf(r);
  const dx = tg.x - pos.x, dz = tg.z - pos.z, ang = Math.atan2(f.x * dz - f.z * dx, f.x * dx + f.z * dz); // + = a la izquierda en este sistema
  const steer = clamp(-ang * 2.6, -1, 1);
  let thr = 1;
  if (Math.abs(ang) > 0.8 && Math.abs(r.fs) > 16) thr = 0.35;
  // Esquivar chicles y hormigas cercanas
  for (const c of chicles) if (c.owner !== r) { const d = B.Vector3.Distance(c.m.position, pos); if (d < 12 && (c.m.position.subtract(pos).x * f.x + c.m.position.subtract(pos).z * f.z) > 0) r.lane += (pos.x - c.m.position.x) * 0.01 * dt * 60; }
  r.lane = clamp(r.lane, -W + 2.5, W - 2.5);
  // Uso de objetos con un retardo humano
  let item = false;
  if (r.item && t > r.useAt) item = true;
  return { throttle: thr, steer, drift: false, item };
}
function angleAhead(i: number) { const a = trk.T[i], b = trk.T[(i + 8) % trk.N]; return Math.atan2(a.x * b.z - a.z * b.x, a.x * b.x + a.z * b.z); }

function cc() { return raceCfg.cc === 50 ? 0.82 : raceCfg.cc === 100 ? 0.95 : 1.1; }

function stepRacer(r: Racer, dt: number) {
  const c = r.car, pos = c.pos;
  // Progreso en el circuito
  const prev = r.idx;
  r.idx = nearestIdx(r);
  const N = trk.N;
  if (prev > N * 0.75 && r.idx < N * 0.25 && r.fin === 0) { r.lap++; onLap(r); }
  else if (prev < N * 0.25 && r.idx > N * 0.75) r.lap--;
  const d = pos.subtract(trk.P[r.idx]), lat = d.x * trk.R[r.idx].x + d.z * trk.R[r.idx].z;
  const off = Math.abs(lat) > W + 1.2;
  r.offT = off ? r.offT + dt : Math.max(0, r.offT - dt * 2);
  r.boost = Math.max(0, r.boost - dt); r.slow = Math.max(0, r.slow - dt); r.shield = Math.max(0, r.shield - dt); r.inv = Math.max(0, r.inv - dt);
  c.root.visibility = r.inv > 0 ? (Math.floor(t * 12) % 2 ? 0.4 : 1) : 1;

  let inp: { throttle: number; steer: number; drift: boolean; item: boolean };
  const frozen = countdown > 0 || r.spin > 0;
  if (r.human >= 0 && !r.auto) inp = pollPlayer(r.ctl!);
  else inp = aiInput(r, dt);
  if (r.fin > 0) inp = aiInput(r, dt), r.auto = true;
  // Objeto
  if (inp.item && !r.prevItemBtn && r.item && !frozen) useItem(r);
  r.prevItemBtn = inp.item;
  if (r.item === null && r.itemAt > 0 && t > r.itemAt) { /* ruleta terminada */ }

  // Velocidad máxima según estado
  const mul = cc() * (r.human >= 0 ? 1 : 0.97 * r.skill * rubber(r));
  let top = r.top * mul * (off ? 0.5 : 1) * (r.boost > 0 ? 1.45 : 1) * (r.slow > 0 ? 0.55 : 1);
  // Derrape con mini-turbo
  const sp = r.fs;
  if (!frozen && inp.drift && sp > 9 && Math.abs(inp.steer) > 0.25 && r.drifting === 0) r.drifting = Math.sign(inp.steer);
  if (r.drifting !== 0) {
    if (!inp.drift || sp < 7) {
      if (r.charge > 1.5) { r.boost = Math.max(r.boost, 1.2); SFX.levelUp(); } else if (r.charge > 0.75) r.boost = Math.max(r.boost, 0.6);
      r.drifting = 0; r.charge = 0;
    } else { if (Math.sign(inp.steer) === r.drifting || inp.steer === 0) r.charge += dt * (Math.abs(inp.steer) > 0.4 ? 1 : 0.5); }
  }
  let steer = inp.steer, grip = r.grip;
  if (r.drifting !== 0) { steer = clamp(r.drifting * 0.55 + inp.steer * 0.75, -1, 1); grip = 2.4; }
  if (frozen) { steer = 0; }
  const out = drive(c.body, c.root, dt, { throttle: frozen ? 0 : inp.throttle, steer, speed: top, accel: r.acc * (r.boost > 0 ? 2 : 1), turn: r.turn * (r.drifting ? 1.35 : 1), grip });
  r.fs = out.fs;
  if (r.spin > 0) { r.spin -= dt; r.spinRot += dt * 12; c.vis.rotation.y = r.spinRot; c.body.setAngularVelocity(B.Vector3.Zero()); if (r.spin <= 0) { c.vis.rotation.y = 0; r.inv = 1.2; } }
  c.animate(dt, steer, out.fs, top);
  // Chispas del derrape (azul → naranja) y polvo fuera de pista
  if (r.drifting !== 0 && Math.random() < 0.6) burst(pos.add(new B.Vector3(0, 0.2, 0)).subtract(fwdOf(r).scale(1.1)), { n: 2, color: r.charge > 1.5 ? "#ff9d2e" : r.charge > 0.75 ? "#4aa8ff" : "#ffffff", size: [0.12, 0.25], power: [2, 5], life: [0.15, 0.3], gravity: -8 });
  if (off && Math.abs(out.fs) > 5 && Math.random() < 0.5) FX.dust(pos);
  if (r.boost > 0 && Math.random() < 0.7) FX.sparks(pos.subtract(fwdOf(r).scale(1.2)).add(new B.Vector3(0, 0.3, 0)));
  // Lakitu: se salió demasiado, se cayó o quedó trabado
  r.stuckT = Math.abs(out.fs) < 1.2 && countdown <= 0 && r.fin === 0 ? r.stuckT + dt : 0;
  if (r.offT > 3 || r.stuckT > 4 || pos.y < -3 || (c.root.up.y < 0.3 && r.spin <= 0)) lakitu(r);
  // Posición fina para rankear
  const T = trk.T[r.idx]; r.frac = clamp((pos.x - trk.P[r.idx].x) * T.x + (pos.z - trk.P[r.idx].z) * T.z, 0, DS) / DS;
}
function rubber(r: Racer) {
  if (!humans.length) return 1;
  const mine = r.lap * trk.N + r.idx;
  let lead = 0; for (const h of humans) lead = Math.max(lead, h.lap * trk.N + h.idx);
  const gap = (mine - lead) * DS;
  return gap > 60 ? 0.9 : gap < -45 ? 1.12 : 1;
}
function lakitu(r: Racer) {
  const i = r.idx, p = trk.P[i], yaw = Math.atan2(trk.T[i].x, trk.T[i].z), c = r.car;
  c.body.disablePreStep = false;
  c.root.position.set(p.x, c.def.size[1] / 2 + 0.6, p.z);
  c.root.rotationQuaternion = B.Quaternion.FromEulerAngles(0, yaw, 0);
  c.body.setLinearVelocity(B.Vector3.Zero()); c.body.setAngularVelocity(B.Vector3.Zero());
  relink.push({ c, f: 3 });
  r.offT = r.stuckT = 0; r.inv = 1.8; r.spin = 0; r.drifting = 0; r.boost = 0;
  c.vis.rotation.set(0, 0, 0);
  if (r.human >= 0) { say(r.human, "¡Lakitu al rescate!"); SFX.back(); }
}
const relink: { c: Car; f: number }[] = [];

function onLap(r: Racer) {
  if (r.lap > raceCfg.laps) {
    r.fin = t; r.place = racers.filter((o) => o.fin > 0).length;
    if (r.human >= 0) { say(r.human, `¡Llegaste ${r.place}º!`); SFX.levelUp(); if (finishedAt < 0) finishedAt = t; }
  } else if (r.human >= 0 && r.lap >= 1) {
    say(r.human, r.lap === raceCfg.laps ? "¡ÚLTIMA VUELTA!" : `VUELTA ${r.lap}`);
    if (r.lap === raceCfg.laps) music("boss", 1);
  }
}
const msgT: number[] = [0, 0];
function say(h: number, text: string) { const el = dom!.querySelector(`.rp[data-p="${h}"] .rmsg`) as HTMLElement; el.textContent = text; el.classList.remove("on"); void el.offsetWidth; el.classList.add("on"); msgT[h] = t + 2; }

// ---------- Objetos del mundo ----------
function stepWorld(dt: number) {
  const spinT = t;
  for (const b of boxes) {
    if (b.t > 0) { b.t -= dt; b.m.isVisible = b.t <= 0; if (b.t > 0) continue; }
    b.m.rotation.y += dt * 2; b.m.position.y = b.at.y + Math.sin(spinT * 3 + b.at.x) * 0.25;
    for (const r of racers) if (!r.item && B.Vector3.DistanceSquared(r.car.pos, b.at) < 6) {
      r.item = weightedItem(placeOf(r)); r.itemAt = t; r.useAt = t + 1.5 + Math.random() * 3.5;
      b.t = 3.5; b.m.isVisible = false;
      if (r.human >= 0) SFX.pickup();
      burst(b.at, { n: 8, color: "#7de8ff", size: [0.2, 0.4], power: [3, 7], life: [0.3, 0.5], gravity: 0 });
    }
  }
  for (const p of pads) for (const r of racers) if (Math.abs(r.car.pos.x - p.at.x) < 3.2 && Math.abs(r.car.pos.z - p.at.z) < 4.2) { if (r.boost < 1) { r.boost = 1.2; if (r.human >= 0) SFX.accept(); } }
  for (const a of ants) {
    const s = Math.sin(spinT * a.sp + a.ph) * (W + 3);
    a.m.position.set(a.c.x + a.n.x * s, 0.5, a.c.z + a.n.z * s);
    a.m.rotation.y = Math.atan2(a.n.x * Math.cos(spinT * a.sp + a.ph), a.n.z * Math.cos(spinT * a.sp + a.ph)) + Math.PI / 2;
    a.hit = Math.max(0, a.hit - dt);
    for (const r of racers) if (a.hit <= 0 && B.Vector3.DistanceSquared(r.car.pos, a.m.position) < 3.2) { a.hit = 1; hurtRacer(r, 0.9); FX.death(a.m.position.add(new B.Vector3(0, 0.3, 0)), false); }
  }
  for (const c of [...chicles]) {
    c.life -= dt; c.arm -= dt;
    let gone = c.life <= 0;
    if (c.arm <= 0) for (const r of racers) if (B.Vector3.DistanceSquared(r.car.pos, c.m.position) < 3.6) { hurtRacer(r, 1.1); gone = true; }
    if (gone) { c.m.dispose(); chicles.splice(chicles.indexOf(c), 1); }
  }
  for (const p of [...projs]) {
    p.life -= dt;
    if (p.kind === "misil" && p.target) {
      const want = p.target.car.pos.subtract(p.m.position); want.y = 0; want.normalize();
      const cur = p.v.clone().normalize(); const nv = B.Vector3.Lerp(cur, want, Math.min(1, dt * 3)).normalize().scale(42); p.v.copyFrom(nv);
    }
    p.m.position.addInPlace(p.v.scale(dt));
    p.m.lookAt(p.m.position.add(p.v)); p.m.rotation.x += Math.PI / 2;
    if (Math.random() < dt * 25) FX.trail(p.m.position, p.kind === "misil" ? "#ffb02e" : "#ff6b6b");
    let gone = p.life <= 0;
    for (const r of racers) if (r !== p.owner || p.life < (p.kind === "misil" ? 5.7 : 3.7)) if (B.Vector3.DistanceSquared(r.car.pos, p.m.position) < 4) { hurtRacer(r, 1.3); gone = true; FX.death(p.m.position, false); SFX.explosion(); break; }
    if (gone) { p.m.dispose(); projs.splice(projs.indexOf(p), 1); }
  }
}
const placeOf = (r: Racer) => 1 + racers.filter((o) => o !== r && ((o.fin > 0 && r.fin === 0) || (o.fin > 0 && r.fin > 0 && o.fin < r.fin) || (o.fin === 0 && r.fin === 0 && prog(o) > prog(r)))).length;
const prog = (r: Racer) => r.lap * trk.N + r.idx + r.frac;

// ---------- Cámaras y HUD ----------
function camFor(r: Racer, c: B.FreeCamera, dt: number) {
  const f = fwdOf(r), target = Math.atan2(f.x, f.z);
  r.camYaw += Math.atan2(Math.sin(target - r.camYaw), Math.cos(target - r.camYaw)) * (1 - Math.exp(-(r.drifting ? 3 : 7) * dt));
  const back = new B.Vector3(Math.sin(r.camYaw), 0, Math.cos(r.camYaw));
  const dist = 9 + clamp(r.fs / 30, 0, 1) * 2.5, want = r.car.pos.subtract(back.scale(dist)).add(new B.Vector3(0, 4.8, 0));
  B.Vector3.LerpToRef(r.camPos, want, 1 - Math.exp(-9 * dt), r.camPos);
  c.position.copyFrom(r.camPos);
  c.setTarget(r.car.pos.add(back.scale(5)).add(new B.Vector3(0, 1.2, 0)));
  c.fov = B.Scalar.Lerp(c.fov, r.boost > 0 ? 1.2 : 0.95, 1 - Math.exp(-6 * dt));
}

function hud() {
  for (const h of humans) {
    const p = dom!.querySelector(`.rp[data-p="${h.human}"]`) as HTMLElement;
    p.querySelector(".rpos b")!.textContent = String(placeOf(h));
    p.querySelector(".rlap")!.textContent = `VUELTA ${clamp(h.lap, 1, raceCfg.laps)}/${raceCfg.laps}`;
    p.querySelector(".rspd")!.textContent = `${Math.round(Math.abs(h.fs) * 3.6)} km/h`;
    const it = p.querySelector(".ritem") as HTMLElement, key = h.item ?? "";
    if (it.dataset.k !== key) { it.dataset.k = key; it.innerHTML = h.item ? `${icon(ITEM_ICON[h.item], 36)}<span>${ITEM_NAME[h.item]}</span>` : ""; }
    const m = p.querySelector(".rmsg") as HTMLElement; if (t > msgT[h.human]) m.classList.remove("on");
    p.classList.toggle("drift", h.drifting !== 0 && h.charge > 0.75);
    p.classList.toggle("drift2", h.drifting !== 0 && h.charge > 1.5);
  }
  // Mini-mapa
  if (mapCtx) {
    const s = 160, k = s / 290;
    mapCtx.clearRect(0, 0, s, s);
    mapCtx.lineWidth = 7; mapCtx.strokeStyle = "rgba(255,255,255,.55)"; mapCtx.beginPath();
    trk.P.forEach((p, i) => { const x = s / 2 + p.x * k, y = s / 2 - p.z * k; i ? mapCtx.lineTo(x, y) : mapCtx.moveTo(x, y); });
    mapCtx.closePath(); mapCtx.stroke();
    for (const r of racers) { const p = r.car.pos; mapCtx.fillStyle = r.human >= 0 ? "#ffd84d" : r.color; mapCtx.beginPath(); mapCtx.arc(s / 2 + p.x * k, s / 2 - p.z * k, r.human >= 0 ? 5 : 3.2, 0, 7); mapCtx.fill(); }
  }
  const cdEl = $r("#rcount");
  cdEl.textContent = countdown > 0 ? (countdown > 3 ? "" : String(Math.ceil(countdown))) : t < 1.2 ? "¡YA!" : "";
  cdEl.className = countdown > 0 ? "on" : t < 1.2 ? "go on" : "";
  // Tabla en vivo (derecha): primeros 5
  const rank = [...racers].sort((a, b) => placeOf(a) - placeOf(b)).slice(0, 5);
  $r("#rtab").innerHTML = rank.map((r, i) => `<div class="${r.human >= 0 ? "me" : ""}"><b>${i + 1}</b><i style="background:${r.color}"></i>${r.name}</div>`).join("");
}

function showResults() {
  resultsOn = true;
  const order = [...racers].sort((a, b) => (a.fin || 1e9) - (b.fin || 1e9) || prog(b) - prog(a));
  order.forEach((r, i) => { r.place = i + 1; cup[r.id] = (cup[r.id] ?? 0) + POINTS[i]; });
  const last = !raceCfg.cup || raceNo >= 3;
  const tb = order.map((r, i) => `<tr class="${r.human >= 0 ? "me" : ""}"><td>${i + 1}</td><td><i style="background:${r.color}"></i>${r.name}</td><td>${r.fin ? fmt(r.fin) : "—"}</td><td>+${POINTS[i]}</td><td>${cup[r.id]}</td></tr>`).join("");
  $r("#rres .rtitle").textContent = `${VARIANTS[variant]} · carrera ${raceNo}${raceCfg.cup ? "/3" : ""}`;
  $r("#rres table").innerHTML = `<tr><th>#</th><th>Corredor</th><th>Tiempo</th><th>Pts</th><th>Total</th></tr>${tb}`;
  ($r("#rres [data-r=next]") as HTMLElement).style.display = last ? "none" : "";
  if (last && raceCfg.cup) { const champ = Object.entries(cup).sort((a, b) => b[1] - a[1])[0]; const r = racers.find((x) => x.id === +champ[0])!; $r("#rres .rtitle").textContent = `COPA: gana ${r.name} con ${champ[1]} puntos`; }
  $r("#rres").classList.remove("hidden");
  (($r("#rres button:not([style*='none'])")) as HTMLElement)?.focus();
}
const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

// ---------- Cuadro a cuadro ----------
let paused = false;
/** Gamepad en las pantallas de la carrera: Start pausa; A acciona el botón enfocado; izquierda/derecha cambian el foco. */
export const racePause = () => { if (active && !resultsOn) setPause(!paused); };
export function racePadMenu(dir: number) {
  const btns = [...dom!.querySelectorAll<HTMLElement>("#rres button, #rpause button")].filter((b) => b.offsetParent);
  if (!btns.length) return;
  const i = btns.indexOf(document.activeElement as HTMLElement);
  btns[(i + dir + btns.length) % btns.length].focus();
}
export const raceClick = () => { if (resultsOn || paused) (document.activeElement as HTMLElement)?.click(); };
function setPause(on: boolean) {
  paused = on; D.scene.physicsEnabled = !on;
  $r("#rpause").classList.toggle("hidden", !on);
  if (on) { engineStop(); ($r("#rpause button") as HTMLElement).focus(); }
}
export function raceTick(dt: number) {
  if (!active || paused) return;
  for (let i = relink.length - 1; i >= 0; i--) { if (--relink[i].f <= 0) { relink[i].c.body.disablePreStep = true; relink.splice(i, 1); } }
  if (countdown > 0) {
    const was = Math.ceil(countdown);
    countdown -= dt;
    if (countdown > 0 && Math.ceil(countdown) !== was && countdown < 3) SFX.blip();
    if (countdown <= 0) { SFX.accept(); t = 0; }
  } else t += dt;
  for (const r of racers) stepRacer(r, dt);
  if (countdown <= 0) stepWorld(dt);
  // Fin de carrera: cuando terminan todos los humanos (o 25 s después del primero)
  if (!resultsOn && humans.length && (humans.every((h) => h.fin > 0) && t - Math.max(...humans.map((h) => h.fin)) > 2.5 || finishedAt > 0 && t - finishedAt > 25)) showResults();
  const h0 = humans[0];
  if (h0) { camFor(h0, D.cam, dt); engineSfx(clamp(Math.abs(h0.fs) / 30, 0, 1), 1, h0.boost > 0); setLamp(h0.car.pos, h0.car.root.forward, false, dt); }
  if (humans[1] && cam2) camFor(humans[1], cam2, dt);
  hud();
}

// Solo dev: piloto automático para los humanos y estado de la carrera (pruebas con capturas)
if (import.meta.env.DEV) Object.assign(window, {
  __race: {
    auto: (on = true) => { for (const h of humans) h.auto = on; },
    info: () => ({ t, countdown, lap: humans.map((h) => h.lap), idx: humans.map((h) => h.idx), place: humans.map((h) => placeOf(h)), fin: racers.map((r) => Math.round(r.fin)), resultsOn, item: humans.map((h) => h.item), speeds: racers.map((r) => Math.round(r.fs)) }),
    give: (it: Item) => { for (const h of humans) { h.item = it; h.useAt = 1e9; } },
    use: () => { for (const h of humans) useItem(h); },
    skip: () => { for (const r of racers) { r.lap = raceCfg.laps; } },
  },
});
