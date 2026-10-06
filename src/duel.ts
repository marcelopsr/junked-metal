// Modo Demolición: armado 3×3, arena acero, melee Havok, mejor de 3. (No confundir con battle/globos en kart.ts)
import * as B from "@babylonjs/core";
import "./duel.css";
import { BAL } from "./balance";
import { damageNumber } from "./ui";
import { impact } from "./fx";
import { input, padPressed, pb } from "./input";
import { box, cyl, merge, wheel } from "./models";
import { applyClimate, canvasTex, M, pbr, shadows, TEX } from "./render";
import {
  cycleColor, cyclePreset, duelMat, loadDuelPaint, PAINT_SLOTS, PRESET_LABEL, rivalPaintFromBalance,
  saveDuelPaint, SLOT_LABEL, SWATCHES, type DuelPaintState, type PaintSlot,
} from "./duel_paint";
import { save } from "./menu";
import { engineStop, music, SFX } from "./sfx";
import { buildGrass, clearLayout, setZone, showWorld } from "./world";
import { CLIMATES } from "./run";

const D = BAL.duelo;
const CH = ["caja", "cuna", "plancha"] as const;
const WH = ["estandar", "gigantes", "orugas"] as const;
const AR = ["trompo", "sierra", "pala"] as const;
export type ChassisId = (typeof CH)[number];
export type WheelsId = (typeof WH)[number];
export type WeaponId = (typeof AR)[number];
export type RobotConfig = { chassis: ChassisId; wheels: WheelsId; weapon: WeaponId };

/** Nombres y lore de pieza (§35); balance numérico sigue en balance.json. */
const PIECE: Record<ChassisId | WheelsId | WeaponId, { label: string; lore: string }> = {
  caja: { label: "Caja blindada", lore: "Chapa doble: aguanta el abrazo y el remordimiento." },
  cuna: { label: "Cuña baja", lore: "Punta afilada para besar el chasis rival sin pedir permiso." },
  plancha: { label: "Plancha veloz", lore: "Aerodinámica de cartón: vuela… hacia el piso." },
  estandar: { label: "Ruedas estándar", lore: "Goma de supermercado; agarre honesto, sin letra chica." },
  gigantes: { label: "Ruedas gigantes", lore: "Aplastan bordillos y la autoestima del rival." },
  orugas: { label: "Orugas", lore: "Tracción de tanque de juguete; el giro se rinde." },
  trompo: { label: "Trompo", lore: "RPM arriba, dignidad abajo: el filo no negocia." },
  sierra: { label: "Sierra", lore: "Chispas, alboroto y un filo que pide disculpas tarde." },
  pala: { label: "Pala", lore: "Empuje primero; el daño es un efecto secundario educado." },
};

type Deps = { scene: B.Scene; cam: B.FreeCamera; onExit(): void };
let deps: Deps;
const $d = (id: string) => document.getElementById(id)!;

const ARENA = 25, HALF = ARENA / 2;
const WORKBENCH_TABLE_TOP = 0.78;
const WORKBENCH_ROBOT_Y = WORKBENCH_TABLE_TOP + 0.14;
type PieceCat = "chassis" | "wheels" | "weapon";
const PIECE_CAT_KEY: Record<PieceCat, "c" | "w" | "a"> = { chassis: "c", wheels: "w", weapon: "a" };
const PIECE_CAT_IDS: Record<PieceCat, readonly string[]> = { chassis: CH, wheels: WH, weapon: AR };
const UP = B.Vector3.Up();
const ray = new B.PhysicsRaycastResult(), rayFrom = new B.Vector3(), rayTo = new B.Vector3();
const fFwd = new B.Vector3(), fRight = new B.Vector3(), fForce = new B.Vector3(), fTorque = new B.Vector3(), fVel = new B.Vector3();

type Bot = {
  id: number; human: boolean; name: string; cfg: RobotConfig;
  root: B.Mesh; vis: B.TransformNode; body: B.PhysicsBody; agg: B.PhysicsAggregate;
  hp: number; hpMax: number; hitAt: number; rpm: number; flipped: boolean;
  camYaw: number; camPos: B.Vector3; stats: { maxSpd: number; accel: number; turn: number; grip: number; push: number; dano: number; knock: number };
  mass: number; warnMul: number;
  dmgOut: number; dmgIn: number;
};

let active = false;
let phase: "armado" | "countdown" | "fight" | "inter" | "results" = "armado";
let ui: HTMLElement;
let cfg: RobotConfig = { chassis: "caja", wheels: "estandar", weapon: "trompo" };
let idx = { c: 0, w: 0, a: 0 };
let mesh: B.Mesh[] = [];
let bots: Bot[] = [];
let score = [0, 0], round = 0, t = 0, countdown = 0, paused = false;
let autoPlayer = false, god = false;
let loadoutWarn = false;
let lastHit = new Map<string, number>();
let matchDmg = { dealt: 0, taken: 0 };
let camShake = 0;
let playerPaint = loadDuelPaint();
let paintSlot: PaintSlot = "chassis_body";
let flipCd = 0;
let pendingPiece: { cat: PieceCat; id: string } | null = null;
let armadoCamYaw = 0.55;

export function initDuel(d: Deps) { deps = d; ensureUi(); }

export function duelActive() { return active; }

export function comboCheck(c: RobotConfig): "ok" | "warn" | "ban" {
  const { chassis, wheels, weapon } = c;
  if (chassis === "plancha" && wheels === "gigantes") return "ban";
  if (chassis === "plancha" && (weapon === "sierra" || weapon === "trompo")) return "warn";
  if (chassis === "cuna" && wheels === "orugas" && weapon === "trompo") return "warn";
  return "ok";
}

function massOf(c: RobotConfig) {
  return BAL.dueloChasis[c.chassis].masa_kg + BAL.dueloRuedas[c.wheels].masa_kg + BAL.dueloArmas[c.weapon].masa_kg;
}
function hpMaxOf(c: RobotConfig) {
  return D.hp_base + BAL.dueloChasis[c.chassis].hp_bonus;
}
function statsOf(c: RobotConfig, warn: boolean) {
  const ch = BAL.dueloChasis[c.chassis], wh = BAL.dueloRuedas[c.wheels], ar = BAL.dueloArmas[c.weapon];
  const tr = ch.traccion_mul * wh.traccion_mul * (warn ? D.warn_traccion_mul : 1);
  return {
    maxSpd: 14 * ch.vel_max_mul * wh.vel_max_mul,
    accel: 22 * tr,
    turn: 2.8 * tr,
    grip: 4.5 * tr,
    push: ar.push_mul,
    dano: ar.dano_base,
    knock: ar.knock_up_n,
  };
}

function paintRobot(c: RobotConfig, paint: DuelPaintState) {
  const z = paint.zones;
  const parts: B.Mesh[] = [];
  const mb = duelMat(z.chassis_body), mt = duelMat(z.chassis_trim);
  const tire = duelMat(z.wheel_tire), rim = duelMat(z.wheel_rim);
  const wBody = duelMat(z.weapon_body), wEdge = duelMat(z.weapon_edge);
  if (c.chassis === "caja") parts.push(box(1.4, 0.55, 2, mb, [0, 0.35, 0]));
  else if (c.chassis === "cuna") parts.push(box(1.2, 0.35, 2.1, mb, [0, 0.28, 0.1]), box(1.3, 0.08, 0.5, mt, [0, 0.15, 1.05]));
  else parts.push(box(1.5, 0.18, 2.2, mb, [0, 0.2, 0]));
  if (c.wheels === "orugas") {
    parts.push(box(0.35, 0.25, 1.8, tire, [-0.75, 0.2, 0]), box(0.35, 0.25, 1.8, tire, [0.75, 0.2, 0]));
    parts.push(box(0.12, 0.18, 1.6, rim, [-0.75, 0.22, 0]), box(0.12, 0.18, 1.6, rim, [0.75, 0.22, 0]));
  } else {
    const d = c.wheels === "gigantes" ? 0.55 : 0.38, lift = BAL.dueloRuedas[c.wheels].lift_m;
    const wy = d * 0.5 + lift;
    for (const x of [-0.7, 0.7]) for (const zpos of [-0.65, 0.65]) {
      const wh = wheel(d, 0.22, paint.zones.wheel_rim.color, c.wheels === "gigantes" ? "todoterreno" : "");
      wh.position.set(x, wy, zpos); wh.rotation.z = Math.PI / 2;
      parts.push(wh);
    }
  }
  if (c.weapon === "trompo") parts.push(cyl(0.45, 0.45, 0.12, wEdge, [0, 0.45, 0.85]));
  else if (c.weapon === "sierra") parts.push(box(0.08, 0.35, 0.7, wBody, [0.55, 0.4, 0.6]), cyl(0.35, 0.35, 0.04, wEdge, [0.85, 0.38, 0.6], [0, 0, Math.PI / 2]));
  else parts.push(box(0.9, 0.45, 0.15, wBody, [0, 0.35, 1.05]), box(0.85, 0.08, 0.12, wEdge, [0, 0.52, 1.05]));
  return merge("duelBot", parts);
}

function makeBot(id: number, human: boolean, c: RobotConfig, at: B.Vector3, name: string, paint: DuelPaintState, warn = false): Bot {
  const scene = deps.scene;
  const m = paintRobot(c, paint);
  const root = B.MeshBuilder.CreateBox("duelCol", { width: 1.4, height: 0.5, depth: 2 }, scene);
  root.isVisible = false;
  root.position.copyFrom(at);
  const vis = new B.TransformNode("duelVis", scene);
  vis.parent = root;
  m.parent = vis;
  m.position.y = 0.15;
  shadows.addShadowCaster(m);
  const mass = massOf(c);
  const ch = BAL.dueloChasis[c.chassis];
  const cogY = ch.cog_y_m;
  const agg = new B.PhysicsAggregate(root, B.PhysicsShapeType.BOX, { mass, friction: D.phys_friction_bot, restitution: 0.15, extents: new B.Vector3(1.3, 0.45, 1.9) }, scene);
  const body = agg.body;
  body.setMassProperties({ mass, inertia: new B.Vector3(mass * 0.35, mass * 0.8, mass * 0.35), centerOfMass: new B.Vector3(0, cogY - 0.25, 0) });
  return {
    id, human, name, cfg: c, root, vis, body, agg, hp: hpMaxOf(c), hpMax: hpMaxOf(c), hitAt: 0, rpm: 0, flipped: false,
    camYaw: 0, camPos: at.clone().add(new B.Vector3(0, 6, -10)), stats: statsOf(c, warn), mass, warnMul: warn ? D.warn_traccion_mul : 1,
    dmgOut: 0, dmgIn: 0,
  };
}

function buildWorkbench() {
  const scene = deps.scene;
  const floor = B.MeshBuilder.CreateGround("wbFloor", { width: 14, height: 14 }, scene);
  floor.position.y = 0.01;
  floor.receiveShadows = true;
  floor.material = pbr("wbFloor", { color: "#2a2e28", rough: 0.92, tex: canvasTex(128, (g, s) => {
    g.fillStyle = "#2a2e28"; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 80; i++) { g.fillStyle = i % 3 ? "#353a32" : "#222620"; g.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 4, 1); }
  }) });
  mesh.push(floor);
  const top = box(3.4, 0.11, 2.6, pbr("wbTop", { color: "#7a5c3a", rough: 0.78, tex: TEX.wood() }), [0, WORKBENCH_TABLE_TOP, 0]);
  top.receiveShadows = true; shadows.addShadowCaster(top); mesh.push(top);
  for (const [x, z] of [[-1.45, -1], [1.45, -1], [-1.45, 1], [1.45, 1]] as const) {
    mesh.push(box(0.14, WORKBENCH_TABLE_TOP - 0.05, 0.14, M.metal("#4a4e54"), [x, (WORKBENCH_TABLE_TOP - 0.05) / 2, z]));
  }
  mesh.push(box(0.35, 0.22, 2.8, M.metal("#3a3e44"), [0, WORKBENCH_TABLE_TOP + 0.16, -1.15]));
  mesh.push(box(7, 2.8, 0.25, M.matte("#14120f"), [0, 1.45, -3.8]));
}

function setPiece(cat: PieceCat, id: string) {
  const arr = PIECE_CAT_IDS[cat];
  const i = arr.indexOf(id);
  if (i < 0) return;
  idx[PIECE_CAT_KEY[cat]] = i;
  pendingPiece = null;
  syncArmado();
}

function buildArena() {
  const scene = deps.scene;
  const tex = canvasTex(128, (g, s) => {
    g.fillStyle = "#6f7480"; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) { g.strokeStyle = i % 2 ? "#8a8f9a" : "#5a5e68"; g.beginPath(); g.moveTo(Math.random() * s, 0); g.lineTo(Math.random() * s, s); g.stroke(); }
  });
  const fl = B.MeshBuilder.CreateGround("duelFloor", { width: ARENA, height: ARENA }, scene);
  fl.position.y = 0.02; fl.receiveShadows = true;
  fl.material = pbr("duelFloor", { color: "#888", rough: 0.85, tex }); mesh.push(fl);
  new B.PhysicsAggregate(fl, B.PhysicsShapeType.BOX, { mass: 0, friction: D.phys_friction_floor, restitution: 0.1 }, scene);
  const h = 2.5, t = 0.8;
  for (const [px, pz, sx, sz] of [[0, -HALF, ARENA, t], [0, HALF, ARENA, t], [-HALF, 0, t, ARENA], [HALF, 0, t, ARENA]] as const) {
    const w = box(sx, h, sz, M.metal("#555"), [px, h / 2, pz]);
    new B.PhysicsAggregate(w, B.PhysicsShapeType.BOX, { mass: 0, friction: D.phys_friction_bot, restitution: D.phys_wall_restitution }, scene);
    mesh.push(w);
  }
}

function cleanup() {
  for (const b of bots) { b.agg.dispose(); b.root.dispose(); }
  bots = [];
  previewBot?.agg.dispose(); previewBot?.root.dispose(); previewBot = null;
  for (const m of mesh) { m.physicsBody?.dispose(); m.dispose(); }
  mesh = [];
  lastHit.clear();
}

function wireWorkbenchUi() {
  const tray = ui.querySelector(".duel-wb-tray")!;
  tray.addEventListener("dragstart", (e) => {
    const ev = e as DragEvent;
    const chip = (ev.target as HTMLElement).closest("[data-piece]") as HTMLElement | null;
    if (!chip || !ev.dataTransfer) return;
    ev.dataTransfer.setData("text/plain", chip.dataset.piece!);
    ev.dataTransfer.effectAllowed = "copy";
    chip.classList.add("dragging");
    chip.setAttribute("aria-grabbed", "true");
  });
  tray.addEventListener("dragend", (e) => {
    const chip = (e.target as HTMLElement).closest("[data-piece]") as HTMLElement | null;
    chip?.classList.remove("dragging");
    chip?.setAttribute("aria-grabbed", "false");
    ui.querySelectorAll(".duel-drop.drag-over").forEach((el) => el.classList.remove("drag-over"));
  });
  ui.querySelectorAll(".duel-drop").forEach((zone) => {
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("drag-over"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("drag-over");
      const raw = (e as DragEvent).dataTransfer?.getData("text/plain");
      if (!raw) return;
      const [cat, id] = raw.split(":") as [PieceCat, string];
      if ((zone as HTMLElement).dataset.slot !== cat) return;
      setPiece(cat, id);
    });
    zone.addEventListener("click", () => {
      if (!pendingPiece) return;
      const slot = (zone as HTMLElement).dataset.slot as PieceCat;
      if (pendingPiece.cat !== slot) return;
      setPiece(slot, pendingPiece.id);
    });
    zone.addEventListener("keydown", (e) => {
      const ke = e as KeyboardEvent;
      if (ke.key !== "Enter" && ke.key !== " ") return;
      ke.preventDefault();
      (zone as HTMLElement).click();
    });
  });
  tray.addEventListener("click", (e) => {
    const chip = (e.target as HTMLElement).closest("[data-piece]") as HTMLElement | null;
    if (!chip) return;
    const [cat, id] = chip.dataset.piece!.split(":") as [PieceCat, string];
    pendingPiece = { cat, id };
    ui.querySelectorAll(".duel-chip").forEach((c) => { c.classList.remove("pending"); c.setAttribute("aria-pressed", c.classList.contains("on") ? "true" : "false"); });
    chip.classList.add("pending");
    chip.setAttribute("aria-pressed", "true");
    ui.querySelectorAll(".duel-drop").forEach((z) => {
      const el = z as HTMLElement;
      const on = el.dataset.slot === cat;
      el.classList.toggle("pick-target", on);
      el.setAttribute("aria-label", on ? `Zona ${el.dataset.slot}, pieza seleccionada` : `Zona ${el.dataset.slot}`);
    });
  });
}

function trayGroup(cat: PieceCat, lab: string, cur: string) {
  const chips = PIECE_CAT_IDS[cat].map((id) => {
    const p = PIECE[id as ChassisId | WheelsId | WeaponId];
    const on = id === cur;
    return `<button type="button" class="duel-chip${on ? " on" : ""}" draggable="true" role="listitem" data-piece="${cat}:${id}" aria-pressed="${on}" aria-grabbed="false" title="${p.lore}">${p.label}</button>`;
  }).join("");
  return `<div class="duel-tray-col"><span class="duel-tray-lab">${lab}</span><div class="duel-tray-chips" role="list">${chips}</div></div>`;
}

function ensureUi() {
  if (ui) return;
  ui = document.createElement("div");
  ui.id = "duel-ui";
  ui.innerHTML = `<div id="duel-arm" class="duel-wb"><header class="duel-wb-head"><h1>ARMADO</h1><p class="duel-wb-hint">Arrastre cada pieza al robot</p><p class="duel-wb-fallback">O seleccione pieza y zona en el robot</p></header>
<div class="duel-wb-main"><aside class="duel-wb-side" aria-labelledby="duel-sec-stats"><h2 id="duel-sec-stats" class="duel-sec-h">Telemetría</h2><div class="duel-bars" role="group" aria-label="Estimación del robot"></div>
<details class="duel-paint-wrap" id="duel-paint-details"><summary class="duel-paint-sum">Pintura <span class="duel-opt">(opcional)</span></summary><div class="duel-paint" id="duel-paint"></div></details>
<p class="duel-warn" id="duel-warn" role="status" aria-live="polite"></p></aside>
<div class="duel-wb-stage" aria-hidden="false"><div class="duel-wb-zones">
<div class="duel-drop" data-slot="chassis" tabindex="0" role="button" aria-label="Zona chasis"><span class="duel-drop-lab">Chasis</span><span class="duel-drop-val" id="duel-slot-c"></span></div>
<div class="duel-drop" data-slot="wheels" tabindex="0" role="button" aria-label="Zona ruedas"><span class="duel-drop-lab">Ruedas</span><span class="duel-drop-val" id="duel-slot-w"></span></div>
<div class="duel-drop" data-slot="weapon" tabindex="0" role="button" aria-label="Zona arma"><span class="duel-drop-lab">Arma</span><span class="duel-drop-val" id="duel-slot-a"></span></div>
</div></div></div>
<section class="duel-wb-tray-wrap" aria-labelledby="duel-sec-tray"><h2 id="duel-sec-tray" class="duel-sec-h">Piezas</h2><div class="duel-wb-tray"></div></section>
<button type="button" class="duel-cta" id="duel-confirm">Confirmar armado</button></div>
<div id="duel-hud"><div class="duel-hp-row"><span id="duel-en">RIVAL</span><span id="duel-you">TÚ</span></div><div class="duel-hp-row"><div class="duel-hp enemy"><i id="duel-hpE"></i></div><div class="duel-hp you"><i id="duel-hpP"></i></div></div><div class="duel-score" id="duel-score"></div></div>
<div id="duel-inter"><p id="duel-inter-t"></p><button type="button" id="duel-next">SIGUIENTE ASALTO</button></div>
<div id="duel-res"><div class="duel-polaroid"><p id="duel-res-t"></p><dl id="duel-res-stats"></dl></div><button type="button" id="duel-again">REINTENTAR</button><button type="button" id="duel-exit">MENÚ</button></div>
<button type="button" id="duel-flip">ENDEREZAR</button>`;
  document.body.appendChild(ui);
  const pause = document.createElement("div");
  pause.id = "duel-pause";
  pause.innerHTML = `<p>PAUSA</p><button type="button" id="duel-resume">REANUDAR</button><button type="button" id="duel-quit">ABANDONAR</button>`;
  document.body.appendChild(pause);
  wireWorkbenchUi();
  $d("duel-confirm").onclick = () => { if (comboCheck(cfg) !== "ban") beginMatch(); };
  $d("duel-next").onclick = () => startRound();
  $d("duel-again").onclick = () => { score = [0, 0]; round = 0; showArmado(); };
  $d("duel-exit").onclick = () => exitDuel();
  $d("duel-flip").onclick = () => flipPlayer();
  $d("duel-resume").onclick = () => { paused = false; $d("duel-pause").classList.remove("on"); };
  $d("duel-quit").onclick = () => { score = [0, 2]; endMatch(true); };
  ui.querySelector("#duel-paint-details")!.addEventListener("toggle", () => syncPaintUi());
  ui.querySelector("#duel-paint")!.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const slot = t.closest("[data-pzone]") as HTMLElement | null;
    if (slot?.dataset.pzone) { paintSlot = slot.dataset.pzone as PaintSlot; syncPaintUi(); return; }
    const sw = t.closest("[data-sw]") as HTMLElement | null;
    if (sw?.dataset.sw) {
      playerPaint.zones[paintSlot] = { ...playerPaint.zones[paintSlot], color: sw.dataset.sw };
      persistPaint(); syncArmado(); return;
    }
    if (t.closest("[data-preset]")) {
      playerPaint.zones[paintSlot] = cyclePreset(playerPaint.zones[paintSlot], 1);
      persistPaint(); syncArmado();
    }
  });
  addEventListener("keydown", (e) => {
    if (!active || phase !== "armado") return;
    if (e.key === "q" || e.key === "Q") { playerPaint.zones[paintSlot] = cycleColor(playerPaint.zones[paintSlot], -1); persistPaint(); syncArmado(); }
    if (e.key === "r" || e.key === "R") { playerPaint.zones[paintSlot] = cyclePreset(playerPaint.zones[paintSlot], 1); persistPaint(); syncArmado(); }
  });
}

function persistPaint() { saveDuelPaint(playerPaint); }

const SWATCH_NAMES: Record<string, string> = {
  "#d62828": "Rojo", "#1d4ed8": "Azul", "#2a9d8f": "Verde azulado", "#e85d04": "Naranja",
  "#4a5058": "Gris", "#e5e7eb": "Blanco", "#ffc300": "Amarillo", "#6b7a3a": "Oliva",
};

function syncPaintUi() {
  const el = $d("duel-paint");
  const open = ($d("duel-paint-details") as HTMLDetailsElement).open;
  const z = playerPaint.zones[paintSlot];
  const tabs = PAINT_SLOTS.map((s) => `<button type="button" class="pz${s === paintSlot ? " on" : ""}" data-pzone="${s}" aria-pressed="${s === paintSlot}">${SLOT_LABEL[s]}</button>`).join("");
  const sw = SWATCHES.map((c) => {
    const name = SWATCH_NAMES[c] ?? c;
    const on = c === z.color;
    return `<button type="button" class="sw${on ? " on" : ""}" data-sw="${c}" style="background:${c}" aria-label="Color ${name}" aria-pressed="${on}"></button>`;
  }).join("");
  el.innerHTML = open
    ? `<p class="duel-paint-hint"><span class="duel-paint-hint-lab">Atajos:</span> <kbd>Q</kbd> color anterior · <kbd>R</kbd> siguiente material</p>
<fieldset class="duel-fs"><legend>Zona a pintar</legend><div class="duel-pzones">${tabs}</div></fieldset>
<fieldset class="duel-fs"><legend>Color</legend><div class="duel-sw">${sw}</div></fieldset>
<p class="duel-paint-meta"><span class="duel-paint-mat-lab">Material:</span> <strong>${PRESET_LABEL[z.preset]}</strong> · <button type="button" data-preset>Siguiente material</button></p>`
    : "";
}

function syncArmado() {
  cfg = { chassis: CH[idx.c], wheels: WH[idx.w], weapon: AR[idx.a] };
  const cc = comboCheck(cfg);
  const ch = CH[idx.c], wh = WH[idx.w], ar = AR[idx.a];
  ($d("duel-slot-c") as HTMLElement).textContent = PIECE[ch].label;
  ($d("duel-slot-w") as HTMLElement).textContent = PIECE[wh].label;
  ($d("duel-slot-a") as HTMLElement).textContent = PIECE[ar].label;
  ui.querySelector(".duel-wb-tray")!.innerHTML = trayGroup("chassis", "Chasis", ch) + trayGroup("wheels", "Ruedas", wh) + trayGroup("weapon", "Arma", ar);
  ui.querySelectorAll(".duel-drop").forEach((z) => {
    const el = z as HTMLElement;
    const match = pendingPiece && el.dataset.slot === pendingPiece.cat;
    el.classList.toggle("pick-target", !!match);
    el.classList.toggle("equipped", true);
  });
  const m = massOf(cfg), st = statsOf(cfg, cc === "warn");
  const bars = ui.querySelector(".duel-bars")!;
  const norm = (v: number, max: number) => Math.round(100 * v / max);
  const bar = (lab: string, pct: number) => `<div class="duel-bar"><span class="duel-bar-lab">${lab}</span><i role="presentation"><span style="width:${pct}%"></span></i><span class="duel-bar-pct" aria-hidden="true">${pct}%</span></div>`;
  bars.innerHTML = bar("Masa", norm(m, 5.5)) + bar("Velocidad", norm(st.maxSpd, 16)) + bar("Vida", norm(hpMaxOf(cfg), 130));
  const w = $d("duel-warn");
  w.className = "duel-warn" + (cc === "ban" ? " ban" : "");
  w.textContent = cc === "ban" ? "Combo inválido: cambie las ruedas." : cc === "warn" ? "Advertencia: tracción −5% en este combo." : "";
  ($d("duel-confirm") as HTMLButtonElement).disabled = cc === "ban";
  syncPaintUi();
  previewArmado();
}

let previewBot: Bot | null = null;
function previewArmado() {
  previewBot?.agg.dispose(); previewBot?.root.dispose(); previewBot = null;
  const at = new B.Vector3(0, WORKBENCH_ROBOT_Y, 0);
  previewBot = makeBot(9, true, cfg, at, "Preview", playerPaint, comboCheck(cfg) === "warn");
  // ponytail: Havok en armado: cuerpo estático para que shots y preview no deriven
  previewBot.body.setMotionType(B.PhysicsMotionType.STATIC);
  previewBot.body.setLinearVelocity(B.Vector3.Zero());
  previewBot.body.setAngularVelocity(B.Vector3.Zero());
}

function showArmado() {
  ensureUi(); cleanup(); phase = "armado";
  pendingPiece = null;
  armadoCamYaw = 0.55;
  showWorld(false); clearLayout();
  applyClimate(CLIMATES.find((c) => c.id === "farol")!);
  buildWorkbench();
  deps.scene.physicsEnabled = true;
  ui.className = "on armado";
  syncArmado();
  document.getElementById("fe")?.classList.add("hidden");
}

export function startDuel() {
  active = true; score = [0, 0]; round = 0; loadoutWarn = comboCheck(cfg) === "warn";
  playerPaint = loadDuelPaint();
  showArmado();
}

function rivalCfg(): RobotConfig {
  const r = BAL.dueloRival.cuna_industrial;
  return { chassis: r.chasis_id as ChassisId, wheels: r.ruedas_id as WheelsId, weapon: r.arma_id as WeaponId };
}

function beginMatch() {
  loadoutWarn = comboCheck(cfg) === "warn";
  matchDmg = { dealt: 0, taken: 0 };
  cleanup();
  setZone("patio", false);
  showWorld(true);
  buildGrass();
  applyClimate(CLIMATES.find((c) => c.id === "mediodia")!);
  buildArena();
  music("battle");
  ui.className = "on fight";
  startRound();
}

function startRound() {
  for (const b of bots) { b.agg.dispose(); b.root.dispose(); }
  bots = []; lastHit.clear();
  round++;
  const r = BAL.dueloRival.cuna_industrial;
  bots.push(makeBot(0, true, cfg, new B.Vector3(-4, 0.6, 0), playerPaint.name || "TÚ", playerPaint, loadoutWarn));
  bots.push(makeBot(1, false, rivalCfg(), new B.Vector3(4, 0.6, 0), r.nombre, rivalPaintFromBalance(r), false));
  for (const b of bots) { b.hp = b.hpMax; b.rpm = 0; b.flipped = false; b.hitAt = 0; }
  phase = "countdown"; countdown = 3.4; t = 0;
  ui.className = "on fight";
  updateHud();
}

function grounded(body: B.PhysicsBody, mesh: B.Mesh) {
  const hh = 0.35;
  rayFrom.copyFrom(mesh.position); rayTo.copyFrom(rayFrom); rayTo.y -= hh + 0.5;
  (deps.scene.getPhysicsEngine() as B.PhysicsEngineV2).raycastToRef(rayFrom, rayTo, ray, { ignoreBody: body });
  return ray.hasHit;
}

// ponytail: un applyForce por cuadro; varios applyForce compiten y vibran en bordes
function clampDuelVec(v: B.Vector3, max: number) {
  const sq = v.lengthSquared();
  if (sq > max * max && sq > 1e-8) v.scaleInPlace(max / Math.sqrt(sq));
}

function stepDuelPhysics(b: Bot, dt: number, throttle: number, steer: number, weaponBtn: boolean) {
  const mesh = b.root;
  mesh.computeWorldMatrix(true);
  const upDot = B.Vector3.Dot(mesh.up, UP);
  b.flipped = upDot < D.phys_flip_up_dot;
  const onGround = grounded(b.body, mesh);
  if (b.cfg.weapon === "trompo" && weaponBtn) b.rpm = Math.min(1, b.rpm + dt / BAL.dueloArmas.trompo.rpm_carga_s);
  else b.rpm = Math.max(0, b.rpm - dt * 0.8);

  fFwd.copyFrom(mesh.forward); fFwd.y = 0;
  if (fFwd.lengthSquared() < 1e-4) fFwd.set(0, 0, 1); else fFwd.normalize();
  B.Vector3.CrossToRef(UP, fFwd, fRight);
  const s = b.stats;
  const driveMul = b.flipped ? D.phys_volcado_drive_mul : 1;
  const pos = mesh.getAbsolutePosition();
  const fCap = b.mass * D.phys_force_cap_mul;
  const tCap = b.mass * D.phys_torque_cap_mul;

  b.body.getLinearVelocityToRef(fVel);
  const fs = B.Vector3.Dot(fVel, fFwd), ls = B.Vector3.Dot(fVel, fRight);

  fForce.set(0, 0, 0);
  fTorque.set(0, 0, 0);

  if (onGround && Math.abs(throttle) > 0.01) {
    const acc = throttle > 0 ? s.accel * throttle : throttle * s.accel * D.phys_reverse_mul;
    fForce.x += fFwd.x * acc * b.mass * driveMul;
    fForce.z += fFwd.z * acc * b.mass * driveMul;
  } else if (onGround && Math.abs(fs) > D.phys_grip_fwd_min_spd) {
    const g = -fs * s.grip * b.mass * D.phys_grip_fwd_k * driveMul;
    fForce.x += fFwd.x * g;
    fForce.z += fFwd.z * g;
  }
  if (onGround && Math.abs(ls) > D.phys_grip_lat_min_spd) {
    const g = -ls * s.grip * b.mass * D.phys_grip_lat_k;
    fForce.x += fRight.x * g;
    fForce.z += fRight.z * g;
  }
  if (onGround && fs > s.maxSpd) {
    const g = -(fs - s.maxSpd) * b.mass * D.phys_spd_cap_k;
    fForce.x += fFwd.x * g;
    fForce.z += fFwd.z * g;
  }

  if (onGround && !b.flipped) {
    const steerK = B.Scalar.Clamp(Math.abs(fs) / 5, 0.25, 1);
    fTorque.y += steer * s.turn * b.mass * D.phys_steer_k * steerK;
    const av = b.body.getAngularVelocity();
    fTorque.x += -av.x * b.mass * D.phys_ang_damp_xy;
    fTorque.z += -av.z * b.mass * D.phys_ang_damp_xy;
  } else if (!onGround) {
    const av = b.body.getAngularVelocity();
    fTorque.x += -av.x * b.mass * D.phys_ang_damp_air;
    fTorque.z += -av.z * b.mass * D.phys_ang_damp_air;
    fTorque.y += steer * s.turn * b.mass * D.phys_steer_air_k;
    if (Math.abs(throttle) > 0.01) {
      fForce.x += fFwd.x * throttle * s.accel * b.mass * D.phys_accel_air_k;
      fForce.z += fFwd.z * throttle * s.accel * b.mass * D.phys_accel_air_k;
    }
  }

  if (b.cfg.weapon === "trompo" && b.rpm > 0.2) fTorque.y += b.rpm * b.mass * D.phys_trompo_torque_k;
  if (upDot < 0.25 && onGround) {
    fTorque.x += mesh.right.x * b.mass * D.phys_self_right_k;
    fTorque.z += mesh.right.z * b.mass * D.phys_self_right_k;
  }

  clampDuelVec(fForce, fCap);
  if (fForce.lengthSquared() > 1e-6) b.body.applyForce(fForce, pos);
  clampDuelVec(fTorque, tCap);
  if (fTorque.lengthSquared() > 1e-6) b.body.applyTorque(fTorque);
}

function aiStep(b: Bot, dt: number, target: Bot) {
  const p = b.root.position, d = target.root.position.subtract(p); d.y = 0;
  const dist = d.length();
  const fwd = b.root.forward; fwd.y = 0; fwd.normalize();
  const cross = fwd.x * d.z - fwd.z * d.x;
  const steer = B.Scalar.Clamp(cross * 0.8, -1, 1);
  const aggr = 0.55 + round * 0.12;
  const throttle = dist > 3 ? aggr : dist < 1.8 ? -0.5 : 0.3;
  stepDuelPhysics(b, dt, throttle, steer, dist < 2.5);
}

function contactDamage() {
  const now = t;
  for (let i = 0; i < bots.length; i++) for (let j = i + 1; j < bots.length; j++) {
    const a = bots[i], b = bots[j];
    if (a.hp <= 0 || b.hp <= 0) continue;
    const pa = a.root.position, pb = b.root.position;
    const dist = B.Vector3.Distance(pa, pb);
    if (dist > 2.2) continue;
    const rel = B.Vector3.Distance(a.body.getLinearVelocity(), b.body.getLinearVelocity());
    const relN = B.Scalar.Clamp(rel / 12, 0, 1);
    const key = `${a.id}-${b.id}`;
    if (now - (lastHit.get(key) ?? 0) < D.melee_cd_s) continue;
    lastHit.set(key, now);
    for (const [atk, vic] of [[a, b], [b, a]] as const) {
      let dmg = atk.stats.dano * (1 + D.melee_vel_coef * relN + D.melee_masa_coef * (atk.mass / 5));
      if (atk.cfg.weapon === "trompo") dmg *= 0.35 + 0.65 * atk.rpm;
      if (vic.flipped) dmg *= D.volcado_vuln_mul;
      if (god && vic.human) dmg = 0;
      vic.hp -= dmg; vic.hitAt = now;
      if (atk.human) { atk.dmgOut += dmg; matchDmg.dealt += dmg; }
      if (vic.human) { vic.dmgIn += dmg; matchDmg.taken += dmg; }
      if (dmg >= 3) {
        SFX.impact(atk.cfg.weapon, false);
        const sh = impact(vic.vis.getChildMeshes()[0] ?? vic.root, vic.root.position, vic.human ? "#b9d3a4" : "#d12a1c", 1, atk.cfg.weapon, dmg >= 8, false);
        camShake = Math.max(camShake, sh * 2.2);
        if (vic.human || atk.human) damageNumber(innerWidth / 2 + (vic.human ? -40 : 40), 120, Math.round(dmg), false);
      }
      if (atk.stats.knock > 0 && rel > 4) vic.body.applyImpulse(new B.Vector3(0, atk.stats.knock * atk.mass * 0.15, 0), vic.root.getAbsolutePosition());
      if (atk.cfg.weapon === "pala" && rel > 2) {
        const push = vic.root.position.subtract(atk.root.position); push.y = 0; push.normalize();
        vic.body.applyImpulse(push.scale(atk.stats.push * atk.mass * rel * 0.08), vic.root.getAbsolutePosition());
      }
    }
  }
}

function flipPlayer() {
  if (flipCd > 0) return;
  const p = bots.find((b) => b.human);
  if (!p || B.Vector3.Dot(p.root.up, UP) > 0.55) return;
  const yaw = Math.atan2(p.root.forward.x, p.root.forward.z);
  const pos = p.root.position.clone();
  p.root.rotationQuaternion = B.Quaternion.FromEulerAngles(0, yaw, 0);
  p.root.position.copyFrom(pos);
  p.body.setLinearVelocity(B.Vector3.Zero());
  p.body.setAngularVelocity(B.Vector3.Zero());
  p.body.applyImpulse(new B.Vector3(0, p.mass * 2, 0), p.root.getAbsolutePosition());
  p.flipped = false;
  flipCd = D.flip_cd_s;
}

function roundWinner(): number | null {
  const p = bots.find((b) => b.human)!, e = bots.find((b) => !b.human)!;
  if (p.hp <= 0 && e.hp <= 0) return 0;
  if (e.hp <= 0) return 0;
  if (p.hp <= 0) return 1;
  return null;
}

function endRound(w: number) {
  score[w]++;
  if (score[0] >= 2 || score[1] >= 2) endMatch(false);
  else {
    phase = "inter";
    ui.className = "on inter";
    $d("duel-inter-t").textContent = `Asalto ${round}: ${w === 0 ? "Victoria" : "Derrota"}. Marcador ${score[0]} – ${score[1]}`;
  }
}

function endMatch(forfeit: boolean) {
  phase = "results";
  if (forfeit) score = [0, 2];
  ui.className = "on results";
  const win = score[0] >= 2;
  const r = BAL.dueloRival.cuna_industrial;
  $d("duel-res-t").textContent = win ? "MEJOR DE TRES · VICTORIA" : forfeit ? "ABANDONO · DERROTA 2–0" : "MEJOR DE TRES · DERROTA";
  $d("duel-res-stats").innerHTML = [
    ["Marcador", `${score[0]} – ${score[1]}`],
    ["Daño infligido", `${Math.round(matchDmg.dealt)}`],
    ["Daño recibido", `${Math.round(matchDmg.taken)}`],
    ["Rival", r.nombre],
    ["Loadout", `${PIECE[cfg.chassis].label} / ${PIECE[cfg.wheels].label} / ${PIECE[cfg.weapon].label}`],
  ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  engineStop(); music("menu");
}

function updateHud() {
  const p = bots.find((b) => b.human), e = bots.find((b) => !b.human);
  if (!p || !e) return;
  ($d("duel-hpE") as HTMLElement).style.transform = `scaleX(${Math.max(0, e.hp / e.hpMax)})`;
  ($d("duel-hpP") as HTMLElement).style.transform = `scaleX(${Math.max(0, p.hp / p.hpMax)})`;
  $d("duel-en").textContent = e.name;
  $d("duel-you").textContent = p.name;
  $d("duel-score").textContent = `ASALTOS ${score[0]} – ${score[1]}`;
  ui.classList.toggle("flipped", !!p.flipped && flipCd <= 0);
  ($d("duel-flip") as HTMLButtonElement).disabled = flipCd > 0;
}

function camFollow(b: Bot, dt: number) {
  const fwd = b.root.forward; fwd.y = 0; fwd.normalize();
  const target = Math.atan2(fwd.x, fwd.z);
  b.camYaw += Math.atan2(Math.sin(target - b.camYaw), Math.cos(target - b.camYaw)) * (1 - Math.exp(-6 * dt));
  const back = new B.Vector3(Math.sin(b.camYaw), 0, Math.cos(b.camYaw));
  const want = b.root.position.subtract(back.scale(10)).add(new B.Vector3(0, 5.5, 0));
  B.Vector3.LerpToRef(b.camPos, want, 1 - Math.exp(-8 * dt), b.camPos);
  camShake = Math.max(0, camShake - dt * 2);
  const s = save.shake ? camShake * camShake * 0.8 : 0;
  deps.cam.position.copyFrom(b.camPos).addInPlace(new B.Vector3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, 0));
  deps.cam.setTarget(b.root.position.add(new B.Vector3(0, 0.8, 0)));
}

export function duelTick(dt: number) {
  if (!active || paused) return;
  if (phase === "inter" || phase === "results") return;
  if (flipCd > 0) flipCd = Math.max(0, flipCd - dt);
  if (phase === "armado") {
    armadoCamYaw += dt * 0.22;
    const r = 5.2, h = 3.35, ty = WORKBENCH_ROBOT_Y - 0.15;
    deps.cam.position.set(Math.sin(armadoCamYaw) * r, h, Math.cos(armadoCamYaw) * r);
    deps.cam.setTarget(new B.Vector3(0, ty, 0));
    return;
  }
  if (phase === "countdown") {
    countdown -= dt;
    if (countdown <= 0) phase = "fight";
    return;
  }
  if (phase === "fight") {
    t += dt;
    if (padPressed(pb("pause"))) { paused = true; $d("duel-pause").classList.add("on"); return; }
    const p = bots.find((b) => b.human)!;
    let throttle = 0, steer = 0;
    const e = bots.find((b) => !b.human)!;
    if (autoPlayer) aiStep(p, dt, e);
    else stepDuelPhysics(p, dt, input.move ? input.moveY : input.throttle, input.move ? -input.moveX : input.steer, input.ability || padPressed(pb("ability")));
    aiStep(e, dt, p);
    contactDamage();
    updateHud();
    camFollow(p, dt);
    const w = roundWinner();
    if (w !== null) endRound(w);
  }
}

export function exitDuel() {
  if (!active) return;
  active = false; paused = false; autoPlayer = false; god = false; pendingPiece = null;
  cleanup();
  ui.className = "";
  $d("duel-pause").classList.remove("on");
  document.getElementById("fe")?.classList.remove("hidden");
  engineStop();
  deps.onExit();
}

export const duelDev = {
  confirm: () => { if (phase === "armado") beginMatch(); },
  auto: (on = true) => { autoPlayer = on; },
  god: () => { god = true; },
  kill: () => { const e = bots.find((b) => !b.human); if (e) e.hp = 0; },
  info: () => ({ active, phase, score, round, cfg, bots: bots.map((b) => ({ name: b.name, hp: b.hp, rpm: b.rpm, flipped: b.flipped })) }),
};
