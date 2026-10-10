// Modo Carrera estilo Mario Kart: circuito cerrado en el patio, 10 corredores (1-2 humanos con pantalla dividida + IA),
// cajas de objetos, derrape con mini-turbo, vueltas, posiciones, Lakitu (reaparición) y copa de 3 carreras.
// El módulo se engancha a main.ts por initKart / startRace / raceTick; todo lo que crea se libera en endRace.
import * as B from "@babylonjs/core";
import { Car, CARS, drive } from "./car";
import { burst, FX, mark } from "./fx";
import { icon } from "./icons";
import { keyHit, padsConnected, pollPlayer, type PlayerCtl } from "./input";
import { box, cyl, merge, pilotParts, sph, type CarKind, type CarOpts } from "./models";
import { applyClimate, canvasTex, M, pbr, setSplit, setLamp, shadows, surface } from "./render";
import { rng, seedRng } from "./rng";
import { engineSfx, engineStop, music, SFX } from "./sfx";
import { buildGrass, buildLayout, clearLayout, setZone, zoneClimate } from "./world";
import { DUSK } from "./run";
import { PAL, wornMat } from "./kit3d";
import { FOLD, TRIM } from "./folded";
import { buildTrackData, DS, MEDAL, medalOf, medalTimes, raceCfg, recordTime, times, TRACKS, type RaceCtl, type Track } from "./kart_cfg";
// Luz de carrera: la misma mañana con sol bajo (sombras largas, volumen) con que arranca la partida, con menos niebla para separar planos
const RACE_CLIM = { ...DUSK, fog: DUSK.fog * 0.4 };
import { carOpts } from "./menu"; // kart.ts se carga a pedido (main.ts goRace): el menú ya está evaluado

type Deps = { scene: B.Scene; cam: B.FreeCamera; onExit(): void; load?(label: string, zone: string, go: () => void): void }; // load: pantalla de carga entre carreras (main.ts)
let D: Deps;
let cam2: B.FreeCamera | null = null;
export function initKart(d: Deps) { D = d; }

// ---------- Circuito ----------
let W = 9; // medio ancho de la pista (cambia por circuito)
let LAPS = 3, gridGap = 7;
let trk: Track;

// ---------- Estado de la carrera ----------
type Item = "turbo" | "petardo" | "chicle" | "misil" | "escudo" | "rayo";
const ITEM_ICON: Record<Item, string> = { turbo: "turbo", petardo: "petardos", chicle: "gomitas", misil: "bengalas", escudo: "lego", rayo: "tesla" };
const ITEM_NAME: Record<Item, string> = { turbo: "Turbo", petardo: "Petardo", chicle: "Chicle", misil: "Misil", escudo: "Escudo", rayo: "Rayo" };
type Racer = {
  id: number; name: string; car: Car; human: number; ctl?: PlayerCtl; color: string;
  top: number; acc: number; turn: number; grip: number; skill: number; lane: number;
  idx: number; lap: number; frac: number; prog: number; fin: number; place: number; points: number;
  item: Item | null; itemAt: number; useAt: number; prevItemBtn: boolean;
  boost: number; slow: number; spin: number; shield: number; inv: number; spinRot: number;
  drifting: number; charge: number; offT: number; stuckT: number; camYaw: number; camPos: B.Vector3; fs: number; lastLap: number; auto: boolean; laki: number; hits: number;
  aggr: number; drifter: boolean; early: boolean; bubble?: B.Mesh; boxT: number;
  balloons: number; out: boolean; balls: B.Mesh[]; wp: B.Vector3 | null; wpT: number; lapT: number; lapBest: number;
  slip?: number;
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
let mode: "race" | "battle" = "race";
const ARENA = { c: new B.Vector3(-70, 0, 50), r: 46 };
let battleT = 150;
let podiumOn = false, active = false, t = 0, countdown = 3.4, finishedAt = -1, resultsOn = false, trackNo = 0, raceNo = 1;
let cup: Record<number, number> = {};
let mapCv: HTMLCanvasElement, mapCtx: CanvasRenderingContext2D;

export const raceActive = () => active;

const POINTS = [15, 12, 10, 8, 7, 6, 5, 3, 2, 1];
const NAMES = ["Soldadito", "Muñeca", "Robot", "Dino", "Figura", "Chispa", "Tuerca", "Pistón", "Resorte", "Gomita"];
const PAINTS = ["#d62828", "#1d4ed8", "#16a34a", "#e0a030", "#9a6fb5", "#2a9d8f", "#f08dbd", "#ff7a3a", "#35c9ff", "#b6ff6a"];
// Personalidad de la IA: [agresividad 0..1 (ataca antes y se pega a los rivales), usa derrape de mini-turbo]
const PERSONA: [number, boolean][] = [[0.9, true], [0.3, false], [0.6, true], [0.8, false], [0.2, true], [0.5, false], [1, true], [0.4, true], [0.7, false], [0.1, false]];
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
  const rm = road.material = surface(pbr("raceRoad", { color: "#ffffff", rough: 0.92, tex: roadTex() }), "asphalt", [Math.round((2 * W) / 3), 14 / 3]); // grano cada ~3 m
  rm.zOffset = -2;
  const curb = (a: number, b: number) => {
    const m = ribbon(a, b, 0.07, 6, (i) => (Math.floor(i / 2) % 2 ? [0.95, 0.95, 0.95, 1] : [0.86, 0.14, 0.14, 1]));
    const cm = m.material = surface(pbr("raceCurb", { color: "#ffffff", rough: 0.7 }), "concrete", 4);
    cm.zOffset = -3;
  };
  curb(-W - 1.8, -W); curb(W, W + 1.8);
  // Línea de salida: tablero a cuadros + pórtico de chapa Folded
  const { P, T, R } = trk, s0 = P[0], yaw = Math.atan2(T[0].x, T[0].z);
  const line = B.MeshBuilder.CreatePlane("startLine", { width: W * 2, height: 3.2 }, D.scene);
  line.rotation = new B.Vector3(Math.PI / 2, yaw, 0); line.position.set(s0.x, 0.09, s0.z);
  const chk = canvasTex(128, (c, s) => { const n = 8; for (let i = 0; i < n * 2; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? "#14181F" : "#f3f4f6"; c.fillRect((i * s) / (n * 2), (j * s) / 2, s / (n * 2) + 1, s / 2 + 1); } });
  const lm = line.material = pbr("raceLine", { color: "#ffffff", rough: 0.7, tex: chk });
  lm.zOffset = -4;
  mesh.push(line);
  const hazBox = (w: number, h: number, d: number, p: [number, number, number], r?: [number, number, number]) => {
    const v1 = 1 - TRIM.hazard / 8, v0 = v1 - 1 / 8, u = Math.max(w, d) / (h * 8), uv = new B.Vector4(0, v0 + 0.002, u, v1 - 0.002);
    const b = B.MeshBuilder.CreateBox("haz", { width: w, height: h, depth: d, faceUV: [uv, uv, uv, uv, uv, uv] }, D.scene);
    b.position.set(...p); if (r) b.rotation.set(...r); b.material = FOLD.trim(); return b;
  };
  const arch: B.Mesh[] = [], pilMat = FOLD.painted(PAL.grisChapa, 0.75, 330), rustM = FOLD.rust();
  for (const sd of [-1, 1]) {
    const px = s0.x + R[0].x * sd * (W + 3), pz = s0.z + R[0].z * sd * (W + 3);
    arch.push(
      box(1.5, 12, 1.5, pilMat, [px, 6, pz], [0, yaw, 0]),
      hazBox(1.9, 1.6, 1.9, [px, 0.8, pz], [0, yaw, 0]),
      box(1.7, 0.5, 1.7, rustM, [px, 11.8, pz], [0, yaw, 0]),
    );
  }
  const banner = B.MeshBuilder.CreateBox("arch", { width: (W + 3) * 2 + 1.6, height: 3.2, depth: 0.9 }, D.scene);
  banner.position.set(s0.x, 12.6, s0.z); banner.rotation.y = yaw;
  const bt = canvasTex(256, (c, s) => {
    c.fillStyle = "#14181F"; c.fillRect(0, 0, s, s);
    c.fillStyle = "#b5651d"; c.fillRect(0, 0, s, 18); c.fillRect(0, s - 18, s, 18);
    c.fillStyle = "#FFB400"; for (let i = -s; i < s * 2; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 16, 0); c.lineTo(i + 4, 18); c.lineTo(i - 12, 18); c.fill(); c.beginPath(); c.moveTo(i, s - 18); c.lineTo(i + 16, s - 18); c.lineTo(i + 4, s); c.lineTo(i - 12, s); c.fill(); }
    c.fillStyle = "#000000"; c.font = "700 84px Rajdhani, sans-serif"; c.textAlign = "center"; c.fillText("START", s / 2 + 4, s * 0.64 + 4);
    c.fillStyle = "#FFB400"; c.fillText("START", s / 2, s * 0.64);
  });
  banner.material = pbr("raceBanner", { color: "#ffffff", rough: 0.55, metal: 0.25, tex: bt, emissive: "#261c08" });
  arch.push(banner);
  for (const m of arch) { shadows.addShadowCaster(m); mesh.push(m); }
  // Cajas de objetos (5 filas de 3): caja de telemetría con marco oscuro, remaches y signo en Rajdhani
  const boxMat = () => {
    const qt = canvasTex(128, (c, s) => {
      c.fillStyle = "#0e2938"; c.fillRect(0, 0, s, s);
      c.strokeStyle = "#00C2FF"; c.lineWidth = 10; c.strokeRect(8, 8, s - 16, s - 16);
      c.strokeStyle = "#14181F"; c.lineWidth = 4; c.strokeRect(2, 2, s - 4, s - 4);
      c.fillStyle = "#FFB400"; for (const [x, y] of [[16, 16], [s - 16, 16], [16, s - 16], [s - 16, s - 16]]) { c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); }
      c.fillStyle = "#000000"; c.font = "700 92px Rajdhani, sans-serif"; c.textAlign = "center"; c.fillText("?", s / 2 + 3, s * 0.76 + 3);
      c.fillStyle = "#7fe3ff"; c.fillText("?", s / 2, s * 0.76);
    });
    return pbr("raceBox", { color: "#ffffff", rough: 0.28, metal: 0.2, tex: qt, emissive: "#0d4a66" });
  };
  const qm = boxMat();
  for (const f of [0.1, 0.3, 0.5, 0.7, 0.9]) for (const o of [-5, 0, 5]) {
    const i = Math.floor(f * trk.N), at = P[i].add(R[i].scale(o)); at.y = 1.5;
    const m = B.MeshBuilder.CreateBox("itemBox", { size: 1.8 }, D.scene);
    m.position.copyFrom(at); m.material = qm; m.isPickable = false;
    boxes.push({ m, at, t: 0 }); mesh.push(m);
  }
  // Placas de turbo
  const ch = canvasTex(128, (c, s) => {
    c.fillStyle = "#14181F"; c.fillRect(0, 0, s, s);
    c.strokeStyle = "#b5651d"; c.lineWidth = 8; c.strokeRect(4, 4, s - 8, s - 8);
    for (let k = 0; k < 3; k++) {
      c.fillStyle = k === 0 ? "#ffe066" : "#FFB400";
      c.beginPath(); c.moveTo(s * 0.14, s * (0.88 - k * 0.28)); c.lineTo(s * 0.5, s * (0.6 - k * 0.28)); c.lineTo(s * 0.86, s * (0.88 - k * 0.28));
      c.lineTo(s * 0.86, s * (0.74 - k * 0.28)); c.lineTo(s * 0.5, s * (0.46 - k * 0.28)); c.lineTo(s * 0.14, s * (0.74 - k * 0.28)); c.fill();
    }
  });
  const pm = pbr("racePad", { color: "#ffffff", rough: 0.45, tex: ch, emissive: "#8a4e00" });
  pm.zOffset = -4;
  for (const [f, o] of [[0.17, 3], [0.47, -3], [0.77, 3]] as const) {
    const i = Math.floor(f * trk.N), at = P[i].add(R[i].scale(o));
    const m = B.MeshBuilder.CreatePlane("pad", { width: 5, height: 7 }, D.scene);
    m.rotation = new B.Vector3(Math.PI / 2, Math.atan2(T[i].x, T[i].z), 0); m.position.set(at.x, 0.1, at.z); m.material = pm; m.isPickable = false;
    pads.push({ at, m }); mesh.push(m);
  }
  // Rampitas en dos rectas (el cuerpo toma la pose de la malla al crearse: se inclina ANTES del PhysicsAggregate)
  for (const f of [0.34, 0.84]) {
    const i = Math.floor(f * trk.N), p = P[i], ry = Math.atan2(T[i].x, T[i].z);
    const r = B.MeshBuilder.CreateBox("ramp", { width: W * 1.2, height: 0.5, depth: 9 }, D.scene);
    r.position.set(p.x, 0.5, p.z); r.rotation = new B.Vector3(-0.2, ry, 0);
    r.material = FOLD.painted(PAL.amarillo, 0.78, 331);
    new B.PhysicsAggregate(r, B.PhysicsShapeType.BOX, { mass: 0, friction: 0.4 }, D.scene);
    const lip = hazBox(W * 1.2 + 0.1, 0.54, 1.1, [0, 0.02, 4.0]);
    lip.parent = r; lip.isPickable = false;
    mesh.push(r, lip);
  }
  // Hormigas que cruzan la pista
  for (const [f, ph] of [[0.22, 0], [0.4, 2], [0.57, 4], [0.66, 1], [0.82, 3], [0.95, 5]] as const) {
    const i = Math.floor(f * trk.N);
    const m = B.MeshBuilder.CreateSphere("ant", { diameter: 1.4, segments: 5 }, D.scene);
    m.scaling.set(0.9, 0.6, 1.5); m.material = FOLD.chitin("#6e3520");
    shadows.addShadowCaster(m);
    ants.push({ m, c: P[i].clone(), n: R[i].clone(), ph, sp: 0.5 + (ph % 3) * 0.12, hit: 0 });
    mesh.push(m);
  }
  decorate(TRACKS[trackNo].crowd);
}

// Arena de batalla: suelo de damero, muro circular físico de bloques rojos y blancos, cajas de objetos repartidas
function buildArena() {
  const { c, r } = ARENA;
  const floorTex = canvasTex(256, (g, sz) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? "#8a8f9a" : "#6f7480"; g.fillRect((i * sz) / 8, (j * sz) / 8, sz / 8 + 1, sz / 8 + 1); } g.strokeStyle = "#ffd84d"; g.lineWidth = 6; g.beginPath(); g.arc(sz / 2, sz / 2, sz * 0.18, 0, 7); g.stroke(); });
  const fl = B.MeshBuilder.CreateDisc("arenaFloor", { radius: r, tessellation: 48 }, D.scene);
  fl.rotation.x = Math.PI / 2; fl.position.set(c.x, 0.06, c.z); fl.receiveShadows = true; fl.isPickable = false;
  const am = fl.material = pbr("arenaFloor", { color: "#ffffff", rough: 0.9, tex: floorTex }); am.zOffset = -2; mesh.push(fl);
  // Muro: bloques rotados ANTES del PhysicsAggregate (el cuerpo toma la pose de la malla al crearse)
  const seg = 36, len = (2 * Math.PI * (r + 1.5)) / seg + 0.4;
  for (let k = 0; k < seg; k++) {
    const a = (k / seg) * Math.PI * 2, b = B.MeshBuilder.CreateBox("arenaWall", { width: len, height: 3.2, depth: 2 }, D.scene);
    b.position.set(c.x + Math.cos(a) * (r + 1.5), 1.6, c.z + Math.sin(a) * (r + 1.5)); b.rotation.y = -a + Math.PI / 2;
    b.material = k % 2 ? FOLD.painted(PAL.grisChapa, 0.75, 332) : FOLD.painted(PAL.rojoChapa, 0.8, 333); shadows.addShadowCaster(b);
    new B.PhysicsAggregate(b, B.PhysicsShapeType.BOX, { mass: 0, friction: 0.1, restitution: 0.6 }, D.scene);
    mesh.push(b);
  }
  // Cajas de objetos: anillo interior + centro
  const qt = canvasTex(128, (g, sz) => {
    g.fillStyle = "#0e2938"; g.fillRect(0, 0, sz, sz);
    g.strokeStyle = "#00C2FF"; g.lineWidth = 10; g.strokeRect(8, 8, sz - 16, sz - 16);
    g.fillStyle = "#7fe3ff"; g.font = "700 92px Rajdhani, sans-serif"; g.textAlign = "center"; g.fillText("?", sz / 2, sz * 0.76);
  });
  const qm = pbr("raceBox", { color: "#ffffff", rough: 0.28, metal: 0.2, tex: qt, emissive: "#0d4a66" });
  const ring = (n: number, k0: number): [number, number][] => Array.from({ length: n }, (_, k) => [Math.cos((k / n) * 6.283 + k0) * r * (n > 6 ? 0.68 : 0.32), Math.sin((k / n) * 6.283 + k0) * r * (n > 6 ? 0.68 : 0.32)]);
  const spots: [number, number][] = [[0, 0], ...ring(5, 0.4), ...ring(9, 0)];
  for (const [dx, dz] of spots) {
    const at = new B.Vector3(c.x + dx, 1.5, c.z + dz), m = B.MeshBuilder.CreateBox("itemBox", { size: 1.8 }, D.scene);
    m.position.copyFrom(at); m.material = qm; m.isPickable = false; boxes.push({ m, at, t: 0 }); mesh.push(m);
  }
}

// Pista viva: banderines de chapa, público de juguetes en la salida, globos y pilas de neumáticos en las curvas
function decorate(crowd: boolean) {
  const { P, T, R, N } = trk;
  const place = (base: B.Mesh, mats: B.Matrix[]) => {
    const buf = new Float32Array(mats.length * 16); mats.forEach((m, i) => m.copyToArray(buf, i * 16));
    base.thinInstanceSetBuffer("matrix", buf, 16, true); base.isPickable = false; base.alwaysSelectAsActiveMesh = true; mesh.push(base);
  };
  const mat = (x: number, y: number, z: number, yaw: number, s = 1) => B.Matrix.Compose(new B.Vector3(s, s, s), B.Quaternion.FromEulerAngles(0, yaw, 0), new B.Vector3(x, y, z));
  // Banderines de chapa de 4 colores a ambos lados cada ~13 m
  const colors = [PAL.rojoChapa, PAL.amarillo, PAL.cian, PAL.verde], poleM = FOLD.bare();
  colors.forEach((c, k) => {
    const base = merge("flag", [cyl(0.18, 0.18, 5, poleM, [0, 2.5, 0], undefined, 5), box(0.1, 1.05, 1.55, FOLD.painted(c, 0.6, 334 + k), [0, 4.4, 0.8])]);
    const ms: B.Matrix[] = [];
    for (let i = k * 4; i < N; i += 16) for (const sd of [-1, 1]) { const p = P[i].add(R[i].scale(sd * (W + 4))); ms.push(mat(p.x, 0, p.z, Math.atan2(T[i].x, T[i].z) + (sd > 0 ? 0 : Math.PI))); }
    place(base, ms);
  });
  // Público: figuritas gigantes en dos filas a cada lado de la recta de salida
  const ms: Record<string, B.Matrix[]> = {};
  if (crowd) for (let n = -7; n <= 7; n++) for (const sd of [-1, 1]) for (const row of [0, 1]) {
    const i = (n * 2 + N) % N, p = P[i].add(R[i].scale(sd * (W + 8 + row * 4.5))), id = PILOT_IDS[(n + 7 + row * 2 + (sd > 0 ? 1 : 0)) % PILOT_IDS.length];
    (ms[id] ??= []).push(mat(p.x, 1.2 + row * 1.2, p.z, Math.atan2(-sd * R[i].x, -sd * R[i].z), 3.2));
  }
  for (const id of PILOT_IDS) if (crowd && ms[id]) place(merge("crowd", pilotParts(id)), ms[id]);
  // Tribunas bajas detrás del público
  if (crowd) for (const sd of [-1, 1]) {
    const i = 0, p = P[i].add(R[i].scale(sd * (W + 8 + 7))), b = box(3, 3, 52, sd > 0 ? FOLD.painted(PAL.petroleo, 0.8, 338) : FOLD.painted(PAL.rojoChapa, 0.8, 339), [p.x, 1.5, p.z], [0, Math.atan2(T[i].x, T[i].z), 0]);
    b.isPickable = false; mesh.push(b);
  }
  // Globos en el arco
  const bl = merge("balloons", [0, 1, 2, 3, 4, 5].map((k) => sph(2.2, FOLD.painted(colors[k % 4], 0.45, 340 + (k % 4)), [Math.cos(k * 1.1) * 1.4, 14.5 + (k % 3) * 1.2, Math.sin(k * 1.1) * 1.4], [1, 1.2, 1], 6)));
  place(bl, [-1, 1].map((sd) => { const q = P[0].add(R[0].scale(sd * (W + 3))); return mat(q.x, 0, q.z, 0); }));
  // Carteles de curva de chapa con marco industrial: uno por curva cerrada, a la salida de la recta, mirando al que llega
  const sign = (dirRight: boolean) => canvasTex(128, (g, sz) => {
    g.fillStyle = "#FFB400"; g.fillRect(0, 0, sz, sz);
    g.strokeStyle = "#14181F"; g.lineWidth = 12; g.strokeRect(6, 6, sz - 12, sz - 12);
    g.fillStyle = "#14181F";
    for (let k = 0; k < 2; k++) {
      const x0 = sz * (0.2 + k * 0.28);
      g.beginPath();
      if (dirRight) { g.moveTo(x0, sz * 0.2); g.lineTo(x0 + sz * 0.24, sz * 0.5); g.lineTo(x0, sz * 0.8); g.lineTo(x0 + sz * 0.1, sz * 0.5); }
      else { g.moveTo(sz - x0, sz * 0.2); g.lineTo(sz - x0 - sz * 0.24, sz * 0.5); g.lineTo(sz - x0, sz * 0.8); g.lineTo(sz - x0 - sz * 0.1, sz * 0.5); }
      g.closePath(); g.fill();
    }
  });
  const signMat = [sign(false), sign(true)].map((tx, k) => pbr("raceSign" + k, { color: "#ffffff", rough: 0.55, metal: 0.2, tex: tx, emissive: "#523800" }));
  let lastSign = -99;
  for (let i = 4; i < N - 4; i++) {
    const a = angleAhead(i);
    if (Math.abs(a) > 0.55 && i - lastSign > 14 && Math.abs(angleAhead(i - 3)) <= Math.abs(a) * 0.7) {
      lastSign = i;
      const turnRight = a < 0, out = turnRight ? -1 : 1; // lado exterior de la curva
      const j = (i - 6 + N) % N, q = P[j].add(R[j].scale(out * (W + 4)));
      const post = cyl(0.28, 0.28, 3.2, poleM, [q.x, 1.6, q.z], undefined, 6);
      const pl = B.MeshBuilder.CreateBox("curveSign", { width: 4.4, height: 2.8, depth: 0.16 }, D.scene);
      pl.position.set(q.x, 3.6, q.z); pl.rotation.y = Math.atan2(T[j].x, T[j].z) + Math.PI; pl.material = signMat[turnRight ? 1 : 0]; pl.isPickable = false;
      shadows.addShadowCaster(pl); mesh.push(post, pl);
    }
  }
  // Neumáticos apilados fuera de las curvas más cerradas: caucho Folded con llanta interior pintada
  const tire = merge("tires", [0, 1, 2].flatMap((k) => {
    const t = B.MeshBuilder.CreateTorus("t", { diameter: 2.2, thickness: 0.8, tessellation: 10 }, D.scene);
    t.position.y = 0.4 + k * 0.8; t.material = FOLD.rubber();
    const rim = cyl(1.3, 1.3, 0.55, FOLD.painted(k % 2 ? PAL.rojoChapa : PAL.amarillo, 0.7, 344 + k), [0, 0.4 + k * 0.8, 0], undefined, 8);
    return [t, rim];
  }));
  const tms: B.Matrix[] = [];
  for (let i = 0; i < N; i += 3) { const a = angleAhead(i); if (Math.abs(a) > 0.5) { const out = Math.sign(a); for (let k = 0; k < 3; k++) { const j = (i + k * 2) % N, p = P[j].add(R[j].scale(out * (W + 4.5 + k * 0.4))); tms.push(mat(p.x, 0, p.z, 0)); } } }
  if (tms.length) place(tire, tms);
  // Vallas de chapa Folded: paneles oxidados del lado de afuera en las rectas, sin z-fighting entre tapa y panel
  const plate = merge("scrapFence", [
    box(4.2, 2.1, 0.14, FOLD.painted(PAL.petroleo, 0.85, 347), [0, 1.05, 0]),
    box(4.4, 0.28, 0.24, FOLD.rust(), [0, 2.24, 0]),
    cyl(0.18, 0.18, 2.6, poleM, [-2.0, 1.3, -0.14], undefined, 6),
    cyl(0.18, 0.18, 2.6, poleM, [2.0, 1.3, -0.14], undefined, 6),
  ]);
  const fms: B.Matrix[] = [];
  for (let i = 2; i < N; i += 5) {
    if (Math.abs(angleAhead(i)) > 0.4 || i < 10 || i > N - 10) continue; // curvas: neumáticos; salida: público
    for (const sd of [-1, 1]) {
      const h = (i * 7 + (sd > 0 ? 3 : 0)) % 5, p = P[i].add(R[i].scale(sd * (W + 6 + h * 0.3)));
      fms.push(B.Matrix.Compose(new B.Vector3(1, 0.8 + h * 0.1, 1), B.Quaternion.FromEulerAngles((h - 2) * 0.04, Math.atan2(T[i].x, T[i].z) + (h - 2) * 0.08, 0), new B.Vector3(p.x, 0, p.z)));
    }
  }
  if (fms.length) { place(plate, fms); shadows.addShadowCaster(plate); }
}
let roadTx: B.Texture | null = null;
const roadTex = () => roadTx ??= canvasTex(256, (c, s) => {
  c.fillStyle = "#6e6a66"; c.fillRect(0, 0, s, s);
  for (let i = 0; i < 1800; i++) { c.fillStyle = Math.random() < 0.5 ? "#7d7873" : "#5c5854"; c.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
  // Huella de las ruedas: dos franjas más oscuras y lisas donde pisa todo el pelotón, y alguna gota de aceite en el medio de cada carril
  for (const u of [0.3, 0.7]) { const g = c.createLinearGradient(s * (u - 0.12), 0, s * (u + 0.12), 0); g.addColorStop(0, "rgba(40,38,36,0)"); g.addColorStop(0.5, "rgba(40,38,36,.28)"); g.addColorStop(1, "rgba(40,38,36,0)"); c.fillStyle = g; c.fillRect(0, 0, s, s); }
  for (let i = 0; i < 5; i++) { const x = s * (Math.random() < 0.5 ? 0.3 : 0.7) + (Math.random() - 0.5) * 20, y = Math.random() * s, r = 3 + Math.random() * 6; c.fillStyle = "rgba(25,22,20,.35)"; c.beginPath(); c.ellipse(x, y, r, r * 1.6, 0, 0, 7); c.fill(); }
  c.fillStyle = "#e8e4d4"; c.fillRect(s / 2 - 3, 0, 6, s * 0.5); // línea central discontinua
});

// ---------- Corredores ----------
function makeRacers() {
  racers = []; humans = [];
  const kinds = Object.keys(CARS) as CarKind[];
  const nH = raceCfg.players;
  // Un solo jugador con Teclado 1: también maneja con Teclado 2 (las flechas)
  const pc = (c: RaceCtl): PlayerCtl => (c.startsWith("pad") ? { pad: +c[3] } : c === "kbd" && nH === 1 ? "kbd+2" : (c as "kbd" | "kbd2"));
  const ctl1 = pc(raceCfg.p1), ctl2 = pc(raceCfg.p2);
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
    let idx = 0, p: B.Vector3, yaw: number;
    if (mode === "battle") { const a = (i / 10) * Math.PI * 2 + 0.3; p = new B.Vector3(ARENA.c.x + Math.cos(a) * (ARENA.r - 12), 0, ARENA.c.z + Math.sin(a) * (ARENA.r - 12)); yaw = Math.atan2(-Math.cos(a), -Math.sin(a)) + 0; yaw = Math.atan2(ARENA.c.x - p.x, ARENA.c.z - p.z); }
    else {
      const row = Math.floor(grid / 2), side = grid % 2 ? 1 : -1, back = 6 + row * gridGap + (side > 0 ? gridGap / 2 : 0);
      idx = (trk.N - Math.round(back / DS) + trk.N) % trk.N;
      p = trk.P[idx].add(trk.R[idx].scale(side * 3.6)); yaw = Math.atan2(trk.T[idx].x, trk.T[idx].z);
    }
    const own = human === 0 ? carOpts() : {}; // jugador 1: los colores por zona del garaje (sin elegir, el de su número de largada)
    const opts: CarOpts = { paint: own.paint ?? PAINTS[i % PAINTS.length], trim: own.trim, rim: own.rim, pilot: PILOT_IDS[i % PILOT_IDS.length], lamp: "calido", fixed: true };
    const car = new Car(D.scene, kind, opts, { x: p.x, z: p.z, yaw });
    car.setMass(1 + (CARS[kind].mass - 1) * 0.4); // masas parecidas: los choques empujan sin que el tanque arrase
    const r: Racer = {
      id: i, name: human >= 0 ? `Jugador ${human + 1}` : NAMES[i % NAMES.length], car, human, ctl: human === 0 ? ctl1 : human === 1 ? ctl2 : undefined, color: opts.paint!,
      top: ks[0], acc: ks[1], turn: ks[2], grip: ks[3], skill: 0.9 + rng() * 0.16, lane: (rng() - 0.5) * 8,
      idx, lap: 0, frac: 0, prog: 0, fin: 0, place: grid + 1, points: 0, item: null, itemAt: 0, useAt: 0, prevItemBtn: false,
      boost: 0, slow: 0, spin: 0, shield: 0, inv: 0, spinRot: 0, drifting: 0, charge: 0, offT: 0, stuckT: 0, camYaw: yaw, camPos: new B.Vector3(), fs: 0, lastLap: 0, auto: false, laki: 0, hits: 0,
      aggr: PERSONA[i % PERSONA.length][0], drifter: PERSONA[i % PERSONA.length][1], early: false, boxT: 0,
      balloons: 3, out: false, balls: [], wp: null, wpT: 0, lapT: 0, lapBest: 0,
      slip: 0,
    };
    if (mode === "battle") for (let k = 0; k < 3; k++) { const b = sph(1.1, pbr("balloon" + r.color, { color: r.color, rough: 0.25, emissive: r.color }), [(k - 1) * 0.6, 2.3 + (k === 1 ? 0.35 : 0), 0], [1, 1.2, 1], 6); b.parent = car.root; r.balls.push(b); }
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
    <div class="rp" data-p="0"><div class="rpos"><b>1</b><i>/10</i></div><div class="rlap"></div><div class="rtime"></div><div class="ritem"></div><div class="rspd"></div><div class="rmsg"></div></div>
    <div class="rp" data-p="1"><div class="rpos"><b>1</b><i>/10</i></div><div class="rlap"></div><div class="rtime"></div><div class="ritem"></div><div class="rspd"></div><div class="rmsg"></div></div>
    <canvas id="rmap" width="160" height="160"></canvas>
    <div id="rflash"></div>
    <div id="rcount"></div>
    <div id="rtab"></div>
    <div id="rpause" class="rover hidden"><div class="rbox"><div class="rtitle">PAUSA</div><div class="rsub"></div><nav><button data-r="resume" class="primary">Seguir</button><button data-r="restart">Reiniciar</button><button data-r="exit">Salir al menú</button></nav></div></div>
    <div id="rres" class="hidden"><div class="rtitle"></div><table></table><div id="rinfo"></div><nav><button data-r="next" class="primary">Siguiente carrera</button><button data-r="again">Revancha</button><button data-r="exit">Menú</button></nav></div>`;
  document.body.appendChild(dom);
  mapCv = $r("#rmap") as HTMLCanvasElement; mapCtx = mapCv.getContext("2d")!;
  dom.addEventListener("click", (e) => {
    const k = (e.target as HTMLElement).dataset.r;
    if (k === "next") nextRace(); else if (k === "again") { cup = {}; raceNo = 1; if (mode === "battle") startBattle(); else startRace(true); } else if (k === "exit") exitRace();
    else if (k === "resume") setPause(false); else if (k === "restart") { setPause(false); if (mode === "battle") startBattle(); else startRace(true); }
  });
  addEventListener("keydown", (e) => { if (active && keyHit("pause", e.code) && !resultsOn) setPause(!paused); });
}

export function startRace(keepCup = false) {
  ensureDom();
  endRace(true);
  mode = "race";
  setZone(TRACKS[raceCfg.cup ? (raceNo - 1) % TRACKS.length : raceCfg.track].zone, false); clearLayout(); buildGrass(); // sin el layout de la partida (se tiraba enseguida), pero con pasto
  D.scene.physicsEnabled = true;
  if (!keepCup) { cup = {}; raceNo = 1; }
  trackNo = raceCfg.cup ? (raceNo - 1) % TRACKS.length : raceCfg.track;
  const def = TRACKS[trackNo];
  W = def.w; gridGap = def.gap; LAPS = raceCfg.laps + def.extra;
  trk = buildTrackData(def);
  applyClimate(zoneClimate() ?? RACE_CLIM);
  seedRng(20261003 + raceNo);
  buildTrack();
  music("race");
  begin();
}

/** Modo batalla: arena cerrada en el patio, 3 globos por corredor, el último en pie gana. */
export function startBattle() {
  ensureDom();
  endRace(true);
  mode = "battle";
  setZone("patio", false); clearLayout(); buildGrass();
  D.scene.physicsEnabled = true;
  cup = {}; raceNo = 1; battleT = 150;
  applyClimate(RACE_CLIM);
  seedRng(20261004);
  buildArena();
  music("battle");
  trk = buildTrackData(TRACKS[0]); // muestras mínimas para helpers de ranking; no se dibuja
  begin();
}

function begin() {
  humanCar(0); // asegura la clave
  makeRacers();
  t = 0; countdown = 3.4; finishedAt = -1; resultsOn = false; active = true;
  const split = raceCfg.players === 2;
  if (split) {
    if (!cam2) { cam2 = new B.FreeCamera("cam2", new B.Vector3(0, 10, -10), D.scene); cam2.minZ = 1; cam2.maxZ = 1500; }
    cam2.fov = 0.95; D.cam.viewport = new B.Viewport(0, 0, 0.5, 1); cam2.viewport = new B.Viewport(0.5, 0, 0.5, 1);
    D.scene.activeCameras = [D.cam, cam2];
    setSplit(cam2, true);
  } else { D.cam.viewport = new B.Viewport(0, 0, 1, 1); D.scene.activeCameras = null; D.scene.activeCamera = D.cam; }
  D.cam.fov = 0.95;
  for (const r of racers) { r.camPos = r.car.pos.clone(); }
  dom!.classList.remove("hidden");
  dom!.classList.toggle("split", split); dom!.classList.remove("podium");
  $r("#rres").classList.add("hidden");
  document.getElementById("fe")?.classList.add("hidden");
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
  for (const r of racers) { try { r.car.dispose(); } catch { /* el cuerpo ya se liberó (podio o eliminado) */ } }
  for (const p of projs) p.m.dispose();
  for (const c of chicles) c.m.dispose();
  for (const m of mesh) { m.physicsBody?.dispose(); m.dispose(); }
  for (const g of rings) g.m.dispose();
  rings.length = 0; podiumOn = false;
  racers = []; humans = []; projs = []; chicles = []; boxes = []; pads = []; ants = []; mesh = [];
}
export function exitRace() {
  endRace();
  seedRng(20260929); buildLayout();
  D.onExit();
}
function nextRace() {
  raceNo++;
  const t = TRACKS[raceCfg.cup ? (raceNo - 1) % TRACKS.length : raceCfg.track];
  if (D.load) D.load(`Siguiente: ${t.name}`, t.zone, () => startRace(true)); else startRace(true);
}

// ---------- IA y manejo ----------
const clamp = B.Scalar.Clamp;
const hear = (r: Racer) => r.human >= 0 || (humans[0] ? B.Vector3.DistanceSquared(humans[0].car.pos, r.car.pos) < 1600 : false);
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
  if (r.human >= 0) {
    const itEl = dom?.querySelector(`.rp[data-p="${r.human}"] .ritem`) as HTMLElement | null;
    if (itEl) { itEl.classList.remove("used"); void itEl.offsetWidth; itEl.classList.add("used"); setTimeout(() => itEl?.classList.remove("used"), 300); }
  }
  const f = fwdOf(r), pos = r.car.pos;
  if (it === "turbo") { r.boost = Math.max(r.boost, 1.6); if (hear(r)) SFX.miniTurbo(); }
  else if (it === "escudo") { r.shield = 7; if (hear(r)) SFX.shield(); }
  else if (it === "petardo") { if (hear(r)) SFX.whoosh(); spawnProj(r, "petardo", pos.add(f.scale(2.4)).add(new B.Vector3(0, 0.6, 0)), f.scale(52)); }
  else if (it === "misil") {
    if (hear(r)) SFX.whoosh();
    const ahead = mode === "battle"
      ? racers.filter((o) => o !== r && !o.out).sort((a, b) => B.Vector3.DistanceSquared(a.car.pos, pos) - B.Vector3.DistanceSquared(b.car.pos, pos))[0]
      : racers.filter((o) => o !== r && o.lap * trk.N + o.idx > r.lap * trk.N + r.idx).sort((a, b) => (a.lap * trk.N + a.idx) - (b.lap * trk.N + b.idx))[0];
    spawnProj(r, "misil", pos.add(f.scale(2.4)).add(new B.Vector3(0, 0.8, 0)), f.scale(42), ahead);
  } else if (it === "chicle") {
    const m = sph(1.3, pbr("raceGum", { color: "#ff6ec7", rough: 0.2, emissive: "#6a1050" }), [pos.x - f.x * 3, 0.6, pos.z - f.z * 3], [1, 0.5, 1], 6);
    chicles.push({ m, owner: r, life: 40, arm: 0.6 }); if (hear(r)) SFX.splat();
  } else if (it === "rayo") {
    for (const o of racers) if (o !== r && !o.out) { if (o.shield > 0) o.shield = 0; else { o.slow = 4.5; hurtRacer(o, 1.0); } }
    SFX.boss(); flash();
  }
  if (hear(r) && it !== "rayo") SFX.click();
}
// Onda expansiva: disco que crece y se desvanece
const rings: { m: B.Mesh; life: number }[] = [];
function ring(p: B.Vector3) {
  const m = B.MeshBuilder.CreateTorus("ring", { diameter: 2, thickness: 0.25, tessellation: 20 }, D.scene);
  m.position.set(p.x, 0.3, p.z); m.material = pbr("raceRing", { color: "#fff3a0", rough: 0.3, emissive: "#ffd84d", alpha: 0.8 }); m.isPickable = false;
  rings.push({ m, life: 0.5 });
}
function flash() { const el = $r("#rflash"); el.classList.remove("on"); void el.offsetWidth; el.classList.add("on"); }
function spawnProj(owner: Racer, kind: "petardo" | "misil", at: B.Vector3, v: B.Vector3, target?: Racer) {
  const m = kind === "petardo" ? cyl(0.5, 0.5, 1.1, pbr("raceShell", { color: "#ef4444", rough: 0.4, emissive: "#6a1010" }), [at.x, at.y, at.z], [Math.PI / 2, 0, 0], 8)
    : cyl(0.0, 0.6, 1.8, pbr("raceMissile", { color: "#ffb02e", rough: 0.4, emissive: "#a05a00" }), [at.x, at.y, at.z], [Math.PI / 2, 0, 0], 8);
  projs.push({ m, kind, owner, v, life: kind === "misil" ? 6 : 4, target });
}
function hurtRacer(r: Racer, dur: number) {
  if (r.out || r.inv > 0) return;
  r.hits++;
  if (r.shield > 0) { r.shield = 0; SFX.break(); return; }
  if (mode === "battle" && dur >= 1.05) popBalloon(r);
  if (r.out) return; // el último globo: el auto ya salió de la física
  r.spin = dur; r.spinRot = 0; r.boost = 0; r.drifting = 0; r.charge = 0;
  r.car.body.setLinearVelocity(r.car.body.getLinearVelocity().scale(0.35));
  burst(r.car.pos.add(new B.Vector3(0, 0.6, 0)), { n: 28, color: "#ffd84d", color2: "#ff7a3a", size: [0.3, 0.7], power: [5, 12], life: [0.3, 0.7] });
  FX.explosion(r.car.pos.add(new B.Vector3(0, 0.4, 0)), 0.9);
  ring(r.car.pos);
  if (hear(r)) SFX.boing();
}

function battleAi(r: Racer, dt: number) {
  const pos = r.car.pos, f = fwdOf(r);
  const foes = racers.filter((o) => o !== r && !o.out);
  const foe = foes.sort((a, b) => B.Vector3.DistanceSquared(a.car.pos, pos) - B.Vector3.DistanceSquared(b.car.pos, pos))[0];
  const armed = r.item === "petardo" || r.item === "misil" || r.item === "chicle" || r.item === "rayo";
  let goal: B.Vector3 | null = null;
  if (armed && foe) goal = foe.car.pos;
  else if (!r.item) { // a buscar una caja
    const bx = boxes.filter((b) => b.t <= 0).sort((a, b) => B.Vector3.DistanceSquared(a.at, pos) - B.Vector3.DistanceSquared(b.at, pos))[0];
    if (bx) goal = bx.at;
  }
  if (!goal) { r.wpT -= dt; if (!r.wp || r.wpT <= 0 || B.Vector3.DistanceSquared(r.wp, pos) < 100) { const a = rng() * 6.283, d = rng() * (ARENA.r - 10); r.wp = new B.Vector3(ARENA.c.x + Math.cos(a) * d, 0, ARENA.c.z + Math.sin(a) * d); r.wpT = 4; } goal = r.wp; }
  const toC = ARENA.c.subtract(pos); toC.y = 0;
  if (toC.length() > ARENA.r - 7) goal = ARENA.c; // lejos del muro
  const dx = goal.x - pos.x, dz = goal.z - pos.z, ang = Math.atan2(f.x * dz - f.z * dx, f.x * dx + f.z * dz), dist = Math.hypot(dx, dz);
  let item = false;
  if (r.item && t > r.useAt) {
    if (r.item === "petardo") item = !!foe && (Math.abs(ang) < 0.3 && dist < 50 || t > r.useAt + 3);
    else if (r.item === "misil") item = !!foe && dist < 70;
    else if (r.item === "chicle") item = !!foe && dist < 24;
    else if (r.item === "rayo") item = true;
    else item = true;
    if (t > r.useAt + 8) item = true;
  }
  return { throttle: Math.abs(ang) > 1.2 ? 0.4 : 1, steer: clamp(-ang * 2.6, -1, 1), drift: false, item };
}

function popBalloon(r: Racer) {
  if (r.out) return;
  r.balloons--;
  r.balls[r.balloons]?.setEnabled(false);
  burst(r.car.pos.add(new B.Vector3(0, 2.4, 0)), { n: 14, color: r.color, size: [0.2, 0.5], power: [3, 8], life: [0.3, 0.7] });
  if (r.balloons <= 0) {
    r.out = true; r.fin = t;
    FX.explosion(r.car.pos, 1.4); SFX.explosion();
    r.car.agg.dispose(); r.car.root.setEnabled(false); r.car.root.position.set(0, -500, 0); // fuera de juego: ningún objeto lo alcanza
    if (r.human >= 0) say(r.human, "¡Sin globos!");
  } else if (r.human >= 0) say(r.human, `${r.balloons} globo${r.balloons > 1 ? "s" : ""}`);
}

function aiInput(r: Racer, dt: number) {
  if (mode === "battle") return battleAi(r, dt);
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
  // Los agresivos buscan al rival de adelante cuando está cerca y se le pegan
  if (r.aggr > 0.5) {
    const ahead = racers.filter((o) => o !== r && prog(o) > prog(r) && B.Vector3.DistanceSquared(o.car.pos, pos) < 28 * 28).sort((a, b) => prog(a) - prog(b))[0];
    if (ahead) { const dl = (ahead.car.pos.x - pos.x) * trk.R[r.idx].x + (ahead.car.pos.z - pos.z) * trk.R[r.idx].z; r.lane = clamp(r.lane + dl * 0.02 * dt * 60 * r.aggr, -W + 2.5, W - 2.5); }
  }
  // Derrape en las curvas fuertes (los que saben) para cargar mini-turbo
  const curve = angleAhead(r.idx);
  const wantDrift = r.drifter && Math.abs(curve) > 0.42 && r.fs > 14 && r.spin <= 0;
  // Objetos: ofensivos solo con un blanco cerca (según agresividad), turbo en la recta, escudo cuando hay proyectil, chicle con alguien detrás
  let item = false;
  if (r.item && t > r.useAt) {
    const behind = racers.some((o) => o !== r && prog(o) < prog(r) && B.Vector3.DistanceSquared(o.car.pos, pos) < 22 * 22);
    const near = racers.some((o) => o !== r && prog(o) > prog(r) && B.Vector3.DistanceSquared(o.car.pos, pos) < (16 + 16 * r.aggr) ** 2);
    if (r.item === "turbo") item = Math.abs(curve) < 0.25;
    else if (r.item === "escudo") item = projs.some((p) => p.owner !== r && B.Vector3.DistanceSquared(p.m.position, pos) < 400) || t > r.useAt + 6;
    else if (r.item === "chicle") item = behind || t > r.useAt + 8;
    else if (r.item === "rayo") item = r.aggr > 0.4 || t > r.useAt + 4;
    else item = near || t > r.useAt + 7 - r.aggr * 4;
  }
  return { throttle: thr, steer: wantDrift ? Math.sign(steer || curve) * Math.max(0.5, Math.abs(steer)) : steer, drift: wantDrift, item };
}
function angleAhead(i: number) { const a = trk.T[i], b = trk.T[(i + 8) % trk.N]; return Math.atan2(a.x * b.z - a.z * b.x, a.x * b.x + a.z * b.z); }

function cc() { return raceCfg.cc === 50 ? 0.82 : raceCfg.cc === 100 ? 0.95 : 1.1; }

function stepRacer(r: Racer, dt: number) {
  if (r.out) return;
  const c = r.car, pos = c.pos;
  // Progreso en el circuito
  let off = false;
  if (mode === "race") {
    const prev = r.idx;
    r.idx = nearestIdx(r);
    const N = trk.N;
    if (prev > N * 0.75 && r.idx < N * 0.25 && r.fin === 0) { r.lap++; onLap(r); }
    else if (prev < N * 0.25 && r.idx > N * 0.75) r.lap--;
    const d = pos.subtract(trk.P[r.idx]), lat = d.x * trk.R[r.idx].x + d.z * trk.R[r.idx].z;
    off = Math.abs(lat) > W + 1.2;
    r.offT = off ? r.offT + dt : Math.max(0, r.offT - dt * 2);
  }
  r.boost = Math.max(0, r.boost - dt); r.slow = Math.max(0, r.slow - dt); r.shield = Math.max(0, r.shield - dt); r.inv = Math.max(0, r.inv - dt);
  c.root.visibility = r.inv > 0 ? (Math.floor(t * 12) % 2 ? 0.4 : 1) : 1;
  if (r.shield > 0 && !r.bubble) { r.bubble = sph(3.4, pbr("raceBubble", { color: "#7de8ff", rough: 0.1, emissive: "#2a8ab0", alpha: 0.32 }), [0, 0.5, 0], undefined, 8); r.bubble.parent = c.root; }
  if (r.bubble) { r.bubble.setEnabled(r.shield > 0); r.bubble.scaling.setAll(1 + Math.sin(t * 8) * 0.04); }

  let inp: { throttle: number; steer: number; drift: boolean; item: boolean };
  const frozen = countdown > 0 || r.spin > 0;
  if (r.human >= 0 && !r.auto) inp = pollPlayer(r.ctl!);
  else inp = aiInput(r, dt);
  // Salida con cohete: acelerar justo en el último segundo de la cuenta da turbo; antes de tiempo, el motor se ahoga
  if (countdown > 0 && r.human >= 0 && !r.auto) { if (inp.throttle > 0 && countdown > 0.9) r.early = true; }
  if (countdown <= 0 && t < 0.05 && r.human >= 0 && !r.auto) { if (!r.early && inp.throttle > 0) { r.boost = 1.1; say(r.human, "¡SALIDA TURBO!"); } else if (r.early) { r.slow = 0.8; } }
  if (r.fin > 0 && mode === "race") inp = aiInput(r, dt), r.auto = true;
  // Objeto
  if (inp.item && !r.prevItemBtn && r.item && !frozen) useItem(r);
  r.prevItemBtn = inp.item;
  if (r.item === null && r.itemAt > 0 && t > r.itemAt) { /* ruleta terminada */ }

  // Velocidad máxima según estado
  const mul = cc() * (r.human >= 0 ? 1 : 0.97 * r.skill * (mode === "race" ? rubber(r) : 1));
  let top = r.top * mul * (off ? 0.5 : 1) * (r.boost > 0 ? 1.45 : 1) * (r.slow > 0 ? 0.55 : 1);
  // Derrape con mini-turbo
  const sp = r.fs;
  if (mode === "race" && r.human >= 0 && sp > 10) {
    const ahead = racers.some((o) => o !== r && o.fin === 0 && (() => {
      const d = o.car.pos.subtract(pos);
      const fwd = fwdOf(r);
      const dot = d.x * fwd.x + d.z * fwd.z;
      const lat = Math.abs(d.x * -fwd.z + d.z * fwd.x);
      return dot > 2 && dot < 11 && lat < 2.2;
    })());
    r.slip = ahead ? Math.min(1.5, (r.slip || 0) + dt) : Math.max(0, (r.slip || 0) - dt * 2);
    if ((r.slip ?? 0) > 0.6) top *= 1.15;
  } else if (r.slip) {
    r.slip = Math.max(0, r.slip - dt * 2);
  }
  if (!frozen && inp.drift && sp > 9 && Math.abs(inp.steer) > 0.25 && r.drifting === 0) r.drifting = Math.sign(inp.steer);
  if (r.drifting !== 0) {
    if (!inp.drift || sp < 7) {
      if (r.charge > 1.5) { r.boost = Math.max(r.boost, 1.2); if (hear(r)) SFX.miniTurbo(); } else if (r.charge > 0.75) { r.boost = Math.max(r.boost, 0.6); if (hear(r)) SFX.miniTurbo(); }
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
  if (r.drifting !== 0 && Math.random() < (r.charge > 1.5 ? 0.9 : r.charge > 0.75 ? 0.75 : 0.55)) {
    const fwd = fwdOf(r), rt = new B.Vector3(fwd.z, 0, -fwd.x), rear = pos.add(new B.Vector3(0, 0.22, 0)).subtract(fwd.scale(1.05));
    const lv2 = r.charge > 1.5, lv1 = r.charge > 0.75;
    const col1 = lv2 ? "#ff9d2e" : lv1 ? "#4aa8ff" : "#ffffff", col2 = lv2 ? "#ffd84d" : lv1 ? "#9be3ff" : "#cfe3f2";
    for (const s of [-0.62, 0.62]) burst(rear.add(rt.scale(s)), { n: lv2 ? 3 : lv1 ? 2 : 1, color: col1, color2: col2, size: lv2 ? [0.16, 0.32] : [0.11, 0.22], power: lv2 ? [3, 7] : [2, 5], life: [0.15, 0.3], gravity: -8 });
  }
  if (off && Math.abs(out.fs) > 5 && Math.random() < 0.5) FX.dust(pos);
  if (r.boost > 0 && Math.random() < 0.7) FX.sparks(pos.subtract(fwdOf(r).scale(1.2)).add(new B.Vector3(0, 0.3, 0)));
  // Lakitu: se salió demasiado, se cayó o quedó trabado
  r.stuckT = Math.abs(out.fs) < 1.2 && countdown <= 0 && r.fin === 0 ? r.stuckT + dt : 0;
  if (import.meta.env.DEV && r.stuckT > 1.5 && r.stuckT - dt <= 1.5) stuckLog.push({ n: r.name, idx: r.idx, x: Math.round(pos.x), z: Math.round(pos.z), t: Math.round(t) });
  if (mode === "battle") {
    if (r.stuckT > 4 || pos.y < -3 || (c.root.up.y < 0.3 && r.spin <= 0)) lakitu(r);
    return;
  }
  if (r.offT > 3 || r.stuckT > 4 || pos.y < -3 || (c.root.up.y < 0.3 && r.spin <= 0)) lakitu(r);
  // Posición fina para rankear
  const T = trk.T[r.idx]; r.frac = clamp((pos.x - trk.P[r.idx].x) * T.x + (pos.z - trk.P[r.idx].z) * T.z, 0, DS) / DS;
  r.prog = (r.idx + r.frac) / trk.N;
}
function rubber(r: Racer) {
  if (!humans.length) return 1;
  const mine = r.lap * trk.N + r.idx;
  let lead = 0; for (const h of humans) lead = Math.max(lead, h.lap * trk.N + h.idx);
  const gap = (mine - lead) * DS;
  return gap > 60 ? 0.9 : gap < -45 ? 1.12 : 1;
}
function lakitu(r: Racer) {
  r.laki++;
  const i = r.idx, c = r.car;
  const p = mode === "battle" ? new B.Vector3(ARENA.c.x + (rng() - 0.5) * 20, 0, ARENA.c.z + (rng() - 0.5) * 20) : trk.P[i];
  const yaw = mode === "battle" ? rng() * 6.28 : Math.atan2(trk.T[i].x, trk.T[i].z);
  c.body.disablePreStep = false;
  c.root.position.set(p.x, c.def.size[1] / 2 + 0.6, p.z);
  c.root.rotationQuaternion = B.Quaternion.FromEulerAngles(0, yaw, 0);
  c.body.setLinearVelocity(B.Vector3.Zero()); c.body.setAngularVelocity(B.Vector3.Zero());
  relink.push({ c, f: 3 });
  r.offT = r.stuckT = 0; r.inv = 1.8; r.spin = 0; r.drifting = 0; r.boost = 0;
  c.vis.rotation.set(0, 0, 0);
  if (r.human >= 0) { say(r.human, "¡Lakitu al rescate!"); SFX.lakitu(); }
}
const relink: { c: Car; f: number }[] = [];
const stuckLog: { n: string; idx: number; x: number; z: number; t: number }[] = [];

function onLap(r: Racer) {
  const lt = r.lap >= 2 ? t - r.lapT : 0;
  const isBest = lt > 0 && (!r.lapBest || lt <= r.lapBest);
  if (isBest) r.lapBest = lt;
  r.lapT = t;
  if (r.lap > LAPS) {
    r.fin = t; r.place = racers.filter((o) => o.fin > 0).length;
    if (r.human >= 0) { say(r.human, `¡Llegaste ${r.place}º!${isBest ? " · ¡VUELTA RÉCORD!" : ""}`); SFX.levelUp(); if (finishedAt < 0) finishedAt = t; }
  } else if (r.human >= 0 && r.lap >= 1) {
    const lapMsg = r.lap === LAPS ? "¡ÚLTIMA VUELTA!" : `VUELTA ${r.lap}`;
    const timeMsg = lt > 0 ? ` · ${fmt(lt)}${isBest ? " ¡RÉCORD!" : ""}` : "";
    say(r.human, `${lapMsg}${timeMsg}`); SFX.lap();
    if (r.lap === LAPS) music("boss", 1);
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
      r.item = weightedItem(placeOf(r)); r.itemAt = t; r.useAt = t + 1.5 + rng() * 3.5;
      b.t = mode === "battle" ? 2.2 : 3.5; b.m.isVisible = false;
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
  for (const g of [...rings]) { g.life -= dt; g.m.scaling.setAll(1 + (0.5 - g.life) * 12); g.m.visibility = Math.max(0, g.life * 2); if (g.life <= 0) { g.m.dispose(); rings.splice(rings.indexOf(g), 1); } }
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
const battleScore = (r: Racer) => (r.out ? -1000 + r.fin : r.balloons * 100 + 50);
const placeOf = (r: Racer) => mode === "battle" ? 1 + racers.filter((o) => o !== r && battleScore(o) > battleScore(r)).length : 1 + racers.filter((o) => o !== r && ((o.fin > 0 && r.fin === 0) || (o.fin > 0 && r.fin > 0 && o.fin < r.fin) || (o.fin === 0 && r.fin === 0 && prog(o) > prog(r)))).length;
const prog = (r: Racer) => r.lap * trk.N + r.idx + r.frac;

// ---------- Cámaras y HUD ----------
function camFor(r: Racer, c: B.FreeCamera, dt: number) {
  if (mode === "battle" && r.out && !podiumOn) { // eliminado: la cámara mira la arena desde arriba
    const a = t * 0.3;
    c.position.set(ARENA.c.x + Math.sin(a) * 60, 42, ARENA.c.z + Math.cos(a) * 60); c.setTarget(ARENA.c); return;
  }
  if (mode === "race" && r.fin > 0 && !podiumOn) { // cámara de victoria: orbita despacio alrededor del auto que cruzó la meta
    const a = (t - r.fin) * 0.9 + r.camYaw + Math.PI, p = r.car.pos;
    c.position.copyFrom(new B.Vector3(p.x + Math.sin(a) * 9, p.y + 3.2, p.z + Math.cos(a) * 9));
    c.setTarget(p.add(new B.Vector3(0, 1, 0)));
    return;
  }
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
    const posEl = p.querySelector(".rpos") as HTMLElement;
    const pl = mode === "battle" ? racers.filter((o) => !o.out).length : placeOf(h);
    posEl.querySelector("b")!.textContent = String(pl);
    posEl.querySelector("i")!.textContent = mode === "battle" ? "/10 en pie" : "/10";
    posEl.dataset.pl = mode === "race" ? String(Math.min(4, pl)) : "";
    const lapEl = p.querySelector(".rlap") as HTMLElement;
    lapEl.textContent = mode === "battle" ? (h.out ? "ELIMINADO" : "●".repeat(h.balloons) + " " + Math.max(0, Math.ceil(battleT - t)) + " s") : `VUELTA ${clamp(h.lap, 1, LAPS)}/${LAPS}`;
    lapEl.classList.toggle("final", mode === "race" && clamp(h.lap, 1, LAPS) === LAPS);
    if (mode === "race") {
      const mt = medalTimes(trackNo, raceCfg.laps, raceCfg.cc), elapsed = h.fin > 0 ? h.fin : Math.max(0, t);
      const mTag = elapsed <= mt[0] ? `<span class="rmedal m3">ORO ${fmt(mt[0])}</span>` : elapsed <= mt[1] ? `<span class="rmedal m2">PLATA ${fmt(mt[1])}</span>` : elapsed <= mt[2] ? `<span class="rmedal m1">BRONCE ${fmt(mt[2])}</span>` : "";
      const rtEl = p.querySelector(".rtime") as HTMLElement;
      const html = `<span>${fmt(Math.max(0, t - h.lapT))}${h.lapBest ? " · MEJOR " + fmt(h.lapBest) : ""}</span>${mTag}`;
      if (rtEl.dataset.h !== html) { rtEl.dataset.h = html; rtEl.innerHTML = html; }
    } else p.querySelector(".rtime")!.textContent = "";
    const spdEl = p.querySelector(".rspd") as HTMLElement;
    const revTag = h.fs < -0.5 ? `<b class="rrev">R</b>` : "";
    const slipTag = (h.slip ?? 0) > 0.6 ? `<b class="rslip">REBUFO</b>` : "";
    const slipMaxTag = (h.slip ?? 0) > 1.2 ? '<b class="rslip-max">¡SUCCIÓN!</b>' : "";
    const airTag = h.car.pos.y > 0.85 ? '<b class="rair">EN EL AIRE</b>' : "";
    const spinTag = h.spin > 0.05 || h.out ? '<b class="rspin">¡TROMPO!</b>' : "";
    const maxTag = !spinTag && h.fs >= h.top * 0.96 ? '<b class="rmax">MÁXIMA</b>' : "";
    const prevPl = (h as any).prevPl as number | undefined;
    const overTag = prevPl !== undefined && pl < prevPl ? '<b class="rover">¡REBASE!</b>' : "";
    (h as any).prevPl = pl;
    const isLastLap = h.lap >= LAPS && mode !== "battle";
    const finalTag = isLastLap && h.prog > 0.85 ? '<b class="rfinal">SECTOR FINAL</b>' : "";
    const perfTag = h.drifting !== 0 && h.charge >= 1.8 ? '<b class="rperfect">¡PERFECTO!</b>' : "";
    const tTag = h.boost > 0 ? `<b class="rturbo on">TURBO</b>` : h.drifting !== 0 ? (h.charge > 1.5 ? `<b class="rturbo t2">TURBO 2</b>` : h.charge > 0.75 ? `<b class="rturbo t1">TURBO 1</b>` : `<b class="rturbo t0">DERRAPE</b>`) : "";
    const shTag = h.shield > 0 ? `<b class="rshield">ESCUDO ${Math.ceil(h.shield)}s</b>` : "";
    const wTag = projs.some((pr) => pr.kind === "misil" && pr.target === h) ? `<b class="rwarn">¡MISIL!</b>` : "";
    const closeRival = racers.some((o) => o !== h && !o.out && o.car.pos.subtract(h.car.pos).length() < 3.5);
    const thTag = !wTag && closeRival ? '<b class="rthreat">¡CERCA!</b>' : "";
    const aheadRival = racers.some((o) => {
      if (o === h || o.out) return false;
      const d = o.car.pos.subtract(h.car.pos);
      const fwd = fwdOf(h);
      const dot = d.x * fwd.x + d.z * fwd.z;
      return dot > 0.5 && dot < 2.5 && d.length() < 2.8;
    });
    const aheadTag = aheadRival ? '<b class="rahead">RIVAL DELANTE</b>' : "";
    const backTag = h.fs < -0.5 ? '<b class="rback">MARCHA ATRÁS</b>' : "";
    const spdHtml = `<span>${Math.round(Math.abs(h.fs) * 3.6)} km/h</span>${revTag}${slipTag}${slipMaxTag}${airTag}${spinTag}${maxTag}${overTag}${finalTag}${perfTag}${tTag}${shTag}${wTag}${thTag}${aheadTag}${backTag}`;
    if (spdEl.dataset.h !== spdHtml) { spdEl.dataset.h = spdHtml; spdEl.innerHTML = spdHtml; }
    const it = p.querySelector(".ritem") as HTMLElement, key = h.item ?? "";
    if (it.dataset.k !== key) { it.dataset.k = key; it.innerHTML = h.item ? `${icon(ITEM_ICON[h.item], 36)}<span>${ITEM_NAME[h.item]}</span>` : ""; it.classList.toggle("full", !!h.item); }
    const m = p.querySelector(".rmsg") as HTMLElement; if (t > msgT[h.human]) m.classList.remove("on");
    p.classList.toggle("drift", h.drifting !== 0 && h.charge > 0.75);
    p.classList.toggle("drift2", h.drifting !== 0 && h.charge > 1.5);
  }
  // Mini-mapa
  if (mapCtx) {
    const s = 160, k = s / 290;
    mapCtx.clearRect(0, 0, s, s);
    mapCtx.lineWidth = 7; mapCtx.strokeStyle = "rgba(255,255,255,.55)"; mapCtx.beginPath();
    if (mode === "battle") { const kk = (s * 0.42) / ARENA.r; mapCtx.arc(s / 2, s / 2, ARENA.r * kk, 0, 7); } else
    trk.P.forEach((p, i) => { const x = s / 2 + p.x * k, y = s / 2 - p.z * k; i ? mapCtx.lineTo(x, y) : mapCtx.moveTo(x, y); });
    mapCtx.closePath(); mapCtx.stroke();
    if (mode !== "battle") {
      const p0 = trk.P[0], r0 = trk.R[0], fx = s / 2 + p0.x * k, fy = s / 2 - p0.z * k;
      mapCtx.save(); mapCtx.strokeStyle = "#ffd84d"; mapCtx.lineWidth = 2.5;
      mapCtx.beginPath(); mapCtx.moveTo(fx - r0.x * 6, fy + r0.z * 6); mapCtx.lineTo(fx + r0.x * 6, fy - r0.z * 6); mapCtx.stroke();
      mapCtx.restore();
    }
    for (const r of racers) {
      if (r.out) continue;
      const p = mode === "battle" ? r.car.pos.subtract(ARENA.c).scale((s * 0.42) / ARENA.r / k) : r.car.pos;
      const mx = s / 2 + p.x * k, my = s / 2 - p.z * k;
      if (r.human >= 0) {
        const f = fwdOf(r); mapCtx.strokeStyle = "#ffd84d"; mapCtx.lineWidth = 2; mapCtx.beginPath(); mapCtx.moveTo(mx, my); mapCtx.lineTo(mx + f.x * 8, my - f.z * 8); mapCtx.stroke();
        mapCtx.fillStyle = "#ffd84d"; mapCtx.strokeStyle = "#0b0f14"; mapCtx.lineWidth = 1.5; mapCtx.beginPath(); mapCtx.arc(mx, my, 5, 0, 7); mapCtx.fill(); mapCtx.stroke();
      } else {
        mapCtx.fillStyle = r.color; mapCtx.beginPath(); mapCtx.arc(mx, my, 3.2, 0, 7); mapCtx.fill();
      }
    }
  }
  const cdEl = $r("#rcount");
  cdEl.textContent = countdown > 0 ? (countdown > 3 ? "" : String(Math.ceil(countdown))) : t < 1.2 ? "¡YA!" : "";
  cdEl.className = countdown > 0 ? "on" : t < 1.2 ? "go on" : "";
  // Tabla en vivo (derecha): primeros 5 y, si quedó afuera, el jugador con su puesto real (fila separada)
  const rank = [...racers].sort((a, b) => placeOf(a) - placeOf(b)).map((r, i) => ({ r, i })).filter(({ r, i }) => i < 5 || r.human >= 0);
  const tabHtml = rank.map(({ r, i }) => {
    const st = mode === "battle"
      ? `<small class="rt-st">${r.out ? "FUERA" : "●".repeat(r.balloons)}</small>`
      : `<small class="rt-st">${r.fin > 0 ? "META" : r.shield > 0 ? "ESCUDO" : r.boost > 0 ? "TURBO" : ""}</small>`;
    return `<div class="${r.human >= 0 ? "me" : ""}${i >= 5 ? " far" : ""}"><b>${i + 1}</b><i style="background:${r.color}"></i><span>${r.name}</span>${st}</div>`;
  }).join("");
  const tabEl = $r("#rtab");
  if (tabEl.dataset.h !== tabHtml) { tabEl.dataset.h = tabHtml; tabEl.innerHTML = tabHtml; }
}

function showResults() {
  resultsOn = true; music("menu"); SFX.finish();
  const order = mode === "battle" ? [...racers].sort((a, b) => battleScore(b) - battleScore(a)) : [...racers].sort((a, b) => (a.fin || 1e9) - (b.fin || 1e9) || prog(b) - prog(a));
  order.forEach((r, i) => { r.place = i + 1; cup[r.id] = (cup[r.id] ?? 0) + POINTS[i]; });
  const maxCup = raceCfg.cup && mode === "race" ? Math.max(...racers.map((r) => cup[r.id] ?? 0)) : -1;
  const last = mode === "battle" || !raceCfg.cup || raceNo >= 3;
  const tb = order.map((r, i) => `<tr class="${r.human >= 0 ? "me" : ""}"><td>${i + 1}</td><td><i style="background:${r.color}"></i>${r.name}</td><td>${mode === "battle" ? (r.out ? "fuera " + fmt(r.fin) : "●".repeat(r.balloons)) : r.fin ? fmt(r.fin) : "—"}</td><td>+${POINTS[i]}</td><td>${cup[r.id]}${raceCfg.cup && mode === "race" && (cup[r.id] ?? 0) === maxCup && maxCup > 0 ? '<b class="cup-lead">LÍDER</b>' : ""}</td></tr>`).join("");
  $r("#rres .rtitle").textContent = mode === "battle" ? "Batalla de globos" : raceCfg.cup && mode === "race" && !last ? `${TRACKS[trackNo].name} · COPA (${raceNo}/3)` : `${TRACKS[trackNo].name} · carrera ${raceNo}${raceCfg.cup ? "/3" : ""}`;
  $r("#rres table").innerHTML = `<tr><th>#</th><th>Corredor</th><th>Tiempo</th><th>Pts</th><th>Total</th></tr>${tb}`;
  ($r("#rres [data-r=next]") as HTMLElement).style.display = last ? "none" : "";
  if (last && raceCfg.cup && mode === "race") { const champ = Object.entries(cup).sort((a, b) => b[1] - a[1])[0]; const r = racers.find((x) => x.id === +champ[0])!; $r("#rres .rtitle").textContent = `COPA: gana ${r.name} con ${champ[1]} puntos`; }
  const info: string[] = [];
  if (mode === "race") for (const h of humans) if (h.fin > 0) {
    const prevBest = times[String(trackNo)]?.[0]?.t;
    const medal = medalOf(trackNo, raceCfg.laps, raceCfg.cc, h.fin), isBest = recordTime(trackNo, { t: h.fin, lap: h.lapBest, car: h.car.kind, cc: raceCfg.cc });
    const mt = medalTimes(trackNo, raceCfg.laps, raceCfg.cc);
    const recHtml = isBest
      ? ` · <em class="rbest">¡NUEVO RÉCORD!${prevBest && prevBest > h.fin ? ` (-${(prevBest - h.fin).toFixed(2)} s)` : ""}</em>`
      : prevBest ? ` · <span class="rdiff">+${(h.fin - prevBest).toFixed(2)} s vs récord</span>` : "";
    info.push(`<b>${h.name}</b>: ${fmt(h.fin)} · mejor vuelta ${h.lapBest ? fmt(h.lapBest) : "—"}${recHtml} · <span class="medal rmedal m${medal}">${medal ? "MEDALLA DE " + MEDAL[medal] : "sin medalla"}</span><br><small>Objetivos: oro ${fmt(mt[0])} · plata ${fmt(mt[1])} · bronce ${fmt(mt[2])}</small>`);
  }
  if (mode === "race" && times[String(trackNo)]) info.push(`<small>Mejores de la pista: ${times[String(trackNo)].map((x, i) => `${i + 1}. ${fmt(x.t)}`).join(" · ")}</small>`);
  $r("#rinfo").innerHTML = info.join("<br>");
  buildPodium(order);
  $r("#rres").classList.remove("hidden");
  (($r("#rres button:not([style*='none'])")) as HTMLElement)?.focus();
}
// Podio 3D junto a la salida: los tres primeros en bloques de oro/plata/bronce, los demás se ocultan; cámara que orbita
let podiumBase = new B.Vector3(), podiumDir = new B.Vector3(0, 0, 1);
function buildPodium(order: Racer[]) {
  const p0 = trk.P[0].add(trk.R[0].scale(W + 30)), dir = trk.R[0].scale(-1).normalize();
  podiumBase.copyFrom(p0); podiumDir.copyFrom(dir);
  const yaw = Math.atan2(dir.x, dir.z), right = new B.Vector3(dir.z, 0, -dir.x);
  const slots: [number, number, string][] = [[0, 3.4, "#ffc24d"], [-5.6, 2.2, "#d0d7de"], [5.6, 1.4, "#c47a3e"]];
  const topM = FOLD.bare(), hazM = FOLD.trim(), v1 = 1 - TRIM.hazard / 8, v0 = v1 - 1 / 8, uv = new B.Vector4(0, v0 + 0.002, 2.2, v1 - 0.002);
  slots.forEach(([off, h, col], i) => {
    const cx = p0.x + right.x * off, cz = p0.z + right.z * off;
    const b = box(5, h, 5, FOLD.painted(col, 0.45, 700 + i), [cx, h / 2, cz], [0, yaw, 0]);
    const cap = box(5.2, 0.18, 5.2, topM, [cx, h - 0.08, cz], [0, yaw, 0]);
    const band = B.MeshBuilder.CreateBox("podHaz", { width: 5.08, height: 0.28, depth: 5.08, faceUV: [uv, uv, uv, uv, uv, uv] }, D.scene);
    band.position.set(cx, h - 0.34, cz); band.rotation.set(0, yaw, 0); band.material = hazM;
    const tx = canvasTex(64, (g, sz) => {
      g.fillStyle = "#14181F"; g.fillRect(0, 0, sz, sz);
      g.strokeStyle = col; g.lineWidth = 6; g.strokeRect(4, 4, sz - 8, sz - 8);
      g.fillStyle = col; g.font = "900 44px Rajdhani, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(String(i + 1), sz / 2, sz / 2 + 2);
    });
    const pl = box(1.1, 1.1, 0.14, pbr("podPl" + i, { color: "#ffffff", rough: 0.5, metal: 0.2, tex: tx, emissive: "#1a1408" }), [cx + dir.x * 2.52, Math.max(0.65, h * 0.45), cz + dir.z * 2.52], [0, yaw + Math.PI, 0]);
    for (const m of [b, cap, band, pl]) { m.isPickable = false; shadows.addShadowCaster(m); mesh.push(m); }
    const r = order[i]; if (!r) return;
    r.car.agg.dispose(); // sin física: el auto es solo una malla sobre el bloque
    r.car.root.position.set(cx, h + r.car.def.size[1] / 2 + 0.3, cz);
    r.car.root.rotationQuaternion = B.Quaternion.FromEulerAngles(0, yaw, 0);
    r.car.vis.rotation.set(0, 0, 0); r.car.root.visibility = 1;
    r.spin = 0; r.bubble?.setEnabled(false);
    burst(r.car.root.position.add(new B.Vector3(0, 1.5, 0)), { n: 40, color: "#ffd84d", color2: "#ff9bd4", size: [0.2, 0.5], power: [3, 9], life: [0.8, 1.6], gravity: -6 });
  });
  for (const r of order.slice(3)) r.car.root.setEnabled(false);
  podiumOn = true;
  D.cam.viewport = new B.Viewport(0, 0, 1, 1); D.scene.activeCameras = null; D.scene.activeCamera = D.cam;
  if (cam2) setSplit(cam2, false);
  dom!.classList.remove("split"); dom!.classList.add("podium");
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
  if (on) {
    $r("#rpause .rsub").textContent = mode === "battle"
      ? `Batalla de globos · Patio · ${Math.max(0, Math.ceil(battleT - t))} s restantes`
      : `${TRACKS[trackNo].name} · ${raceCfg.cup ? `Copa (${raceNo}/3)` : "Carrera"} · ${raceCfg.cc}cc · Vuelta ${clamp(humans[0]?.lap ?? 1, 1, LAPS)}/${LAPS}`;
    engineStop(); ($r("#rpause button") as HTMLElement).focus();
  }
}
export function raceTick(dt: number) {
  if (!active || paused) return;
  for (let i = relink.length - 1; i >= 0; i--) { if (--relink[i].f <= 0) { relink[i].c.body.disablePreStep = true; relink.splice(i, 1); } }
  if (countdown > 0) {
    const was = Math.ceil(countdown);
    countdown -= dt;
    if (countdown > 0 && Math.ceil(countdown) !== was && countdown < 3) SFX.countBeep(false);
    if (countdown <= 0) { SFX.countBeep(true); t = 0; }
  } else t += dt;
  if (podiumOn) {
    const a = Math.sin(t * 0.45) * 0.55, front = podiumDir.clone(), side = new B.Vector3(podiumDir.z, 0, -podiumDir.x);
    const portrait = D.scene.getEngine().getRenderWidth() < D.scene.getEngine().getRenderHeight();
    const dist = portrait ? 28 : 33;
    D.cam.position.set(podiumBase.x + front.x * dist * Math.cos(a) + side.x * dist * Math.sin(a), portrait ? 7.5 : 8, podiumBase.z + front.z * dist * Math.cos(a) + side.z * dist * Math.sin(a));
    D.cam.setTarget(podiumBase.add(new B.Vector3(0, portrait ? -2.2 : 2.5, 0)).add(side.scale(portrait ? 0 : -9)));
    D.cam.fov = 0.8;
    setLamp(D.cam.position, podiumBase.subtract(D.cam.position).normalize(), true, dt);
    for (const r of racers) if (r.place <= 3) r.car.vis.rotation.y += dt * 0.7;
    hud();
    return;
  }
  for (const r of racers) stepRacer(r, dt);
  if (countdown <= 0) stepWorld(dt);
  // Fin de la batalla: queda uno en pie, cayeron todos los humanos o se acabó el tiempo
  if (mode === "battle" && !resultsOn && countdown <= 0) {
    const alive = racers.filter((o) => !o.out);
    if (alive.length <= 1 || t > battleT || humans.every((h) => h.out) && t - Math.max(...humans.map((h) => h.fin)) > 3) { if (alive[0]) alive[0].fin = alive[0].fin || t; showResults(); }
  }
  // Fin de carrera: cuando terminan todos los humanos (o 25 s después del primero)
  if (mode === "race" && !resultsOn && humans.length && (humans.every((h) => h.fin > 0) && t - Math.max(...humans.map((h) => h.fin)) > 2.5 || finishedAt > 0 && t - finishedAt > 25)) showResults();
  const h0 = humans[0];
  if (h0) { camFor(h0, D.cam, dt); engineSfx(clamp(Math.abs(h0.fs) / 30, 0, 1), 1, h0.boost > 0); setLamp(h0.car.pos, h0.car.root.forward, false, dt); }
  if (humans[1] && cam2) camFor(humans[1], cam2, dt);
  hud();
}

// Solo dev: piloto automático para los humanos y estado de la carrera (pruebas con capturas)
if (import.meta.env.DEV) Object.assign(window, {
  __race: {
    auto: (on = true) => { for (const h of humans) h.auto = on; },
    sim: (secs: number) => { // avanza la carrera sin dibujar (paso fijo); corta a los ~30 s reales
      const pe = D.scene.getPhysicsEngine() as unknown as { _step(d: number): void }, w0 = performance.now(), end = t + secs + (countdown > 0 ? countdown : 0);
      while ((t < end || countdown > 0) && performance.now() - w0 < 30000 && !resultsOn) { for (const r of racers) r.car.root.computeWorldMatrix(true); raceTick(1 / 60); pe._step(1 / 60); }
      return { t: Math.round(t), results: resultsOn, order: [...racers].sort((a, b) => placeOf(a) - placeOf(b)).map((r) => `${r.name}:${r.lap}.${r.idx}${r.fin ? "F" + Math.round(r.fin) : ""}`).join(" "), laki: racers.map((r) => r.laki + "/" + r.hits).join(" ") };
    },
    dbg: () => { const m = D.scene.getMeshByName("ribbon"); const v = m?.getVerticesData("position") ?? []; return { n: v.length / 3, nan: v.some((x) => !Number.isFinite(x)), vis: m?.isVisible, en: m?.isEnabled(), N: trk.N, y: v[1], mat: m?.material?.name, alpha: m?.material?.alpha, bb: m?.getBoundingInfo().boundingBox.extendSizeWorld.asArray() }; },
    fix: (y: number, z: number) => { for (const m of D.scene.meshes) if (m.name === "ribbon") { m.position.y = y; if (m.material) m.material.zOffset = z; } },
    ground: () => D.scene.meshes.filter((m) => m.name === "ground" || m.name === "patio" || m.name === "cloud").map((m) => m.name + " y=" + m.position.y.toFixed(3) + " zo=" + (m.material?.zOffset ?? "-") + " dw=" + (m.material as unknown as { disableDepthWrite?: boolean })?.disableDepthWrite),
    stuck: () => stuckLog,
    laki: () => racers.map((r) => r.laki + "/" + r.hits),
    info: () => ({ t, countdown, lap: humans.map((h) => h.lap), idx: humans.map((h) => h.idx), place: humans.map((h) => placeOf(h)), fin: racers.map((r) => Math.round(r.fin)), resultsOn, item: humans.map((h) => h.item), speeds: racers.map((r) => Math.round(r.fs)) }),
    give: (it: Item) => { for (const h of humans) { h.item = it; h.useAt = 1e9; } },
    use: () => { for (const h of humans) useItem(h); },
    skip: () => { for (const r of racers) { r.lap = LAPS; } },
    podium: () => { countdown = 0; t = 96; racers.forEach((r, i) => { r.fin = 92.4 + i * 2.1; r.lapBest = 29.8 + i * 0.7; }); if (!resultsOn) showResults(); },
  },
});
