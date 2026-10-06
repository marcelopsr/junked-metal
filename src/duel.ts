// Modo Demolición: fabricación RoboCraft (default) o armado 3×3 legado (?duel=legacy). Arena melee, mejor de 3.
import * as B from "@babylonjs/core";
import "./hud.css";
import "./duel.css";
import { BAL } from "./balance";
import { damageNumber } from "./ui";
import { impact } from "./fx";
import { input, isTouch, padPressed, pb } from "./input";
import { box, cyl, merge, wheel } from "./models";
import { applyClimate, canvasTex, M, pbr, setLamp, shadows, TEX } from "./render";
import {
  cycleColor, cyclePreset, duelMat, loadDuelPaint, PAINT_SLOTS, PRESET_LABEL, rivalPaintFromBalance,
  saveDuelPaint, SLOT_LABEL, SWATCHES, type DuelPaintState, type PaintSlot,
} from "./duel_paint";
import {
  blockDef, buildColliderMesh, type Cell, type LivingBuild, type RobotBuild, TEMPLATES, aabbOfBuild, cellWorldCenter,
  cogOfBuild, defaultBuild, livingFromBuild, paintBuildMesh, pickHitCellIndex, placementGhostMesh, rivalBuild, saveBuild,
  statsOfBuild, stripCell, validateBuild, visualPivotOffset,
} from "./duel_build";
import { type FabApi, mountFabricacion } from "./duel_fabricacion";
import { save } from "./menu";
import { engineStop, music, SFX } from "./sfx";
import { clearLayout, showWorld } from "./world";
import { CLIMATES } from "./run";

const LEGACY_ARMADO = typeof location !== "undefined" && new URLSearchParams(location.search).get("duel") === "legacy";

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
const WORKBENCH_TABLE_SURFACE = WORKBENCH_TABLE_TOP + 0.055; // centro del tablero + mitad de espesor
/** Raíz del robot: malla con offset +0.15; ruedas en y≈0 local → apoyar en la mesa. */
const WORKBENCH_ROBOT_Y = WORKBENCH_TABLE_SURFACE - 0.15;
/** Cámara fija en armado (sin órbita). */
const ARMADO_CAM = { yaw: 0.38, dist: 3.85, height: 2.45, targetY: WORKBENCH_TABLE_SURFACE + 0.22 };
const wbLampPos = new B.Vector3(0.15, WORKBENCH_TABLE_SURFACE + 1.25, 0.55);
const wbLampFwd = new B.Vector3(-0.12, -0.62, -0.78);
const wbLampPosLive = new B.Vector3();
let wbFill: B.PointLight | null = null;
let fabBenchKey: B.SpotLight | null = null;
let fabBenchBounce: B.PointLight | null = null;
let fabCamLight: B.DirectionalLight | null = null;
const fabCamLightDir = new B.Vector3();
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
  /** Fabricación: vida global + desgaste por bloque. */
  living?: LivingBuild;
  duelPaint?: DuelPaintState;
  wearFlash?: { idx: number; until: number; max: number; name: string };
};

let active = false;
let phase: "fabricar" | "armado" | "countdown" | "fight" | "inter" | "results" = "fabricar";
let ui: HTMLElement;
let cfg: RobotConfig = { chassis: "caja", wheels: "estandar", weapon: "trompo" };
let idx = { c: 0, w: 0, a: 0 };
let playerBuild: RobotBuild = defaultBuild();
let fab: FabApi | null = null;
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
let shotCamFrozen = false;
let previewFabRoot: B.TransformNode | null = null;
let fabPlaceGhostRoot: B.TransformNode | null = null;
let fabPlaceGhost: B.Mesh | null = null;
let fabPreviewGlow: B.PointLight | null = null;
/** Offsets de cámara en fabricación (arrastre en viewport; sin órbita automática). */
let fabCamOff = { yaw: 0, pitch: 0 };
let fabCamDistMul = 1;
const fabCamTarget = new B.Vector3(0, ARMADO_CAM.targetY, 0);
let fabCamUnbind: (() => void) | null = null;
let fabVpObs: ResizeObserver | null = null;
let fabVpOnResize: (() => void) | null = null;

function cfgFromBuild(b: RobotBuild): RobotConfig {
  const st = statsOfBuild(b, false);
  const weapon: WeaponId = st.weaponId === "none" ? "pala" : st.weaponId;
  let wheels: WheelsId = "estandar";
  let nStd = 0, nGig = 0, nOru = 0;
  for (const c of b.cells) {
    if (c.blockId === "rueda_std") nStd++;
    if (c.blockId === "rueda_gig") nGig++;
    if (c.blockId === "oruga") nOru++;
  }
  if (nOru >= nGig && nOru >= nStd && nOru > 0) wheels = "orugas";
  else if (nGig >= nStd && nGig > 0) wheels = "gigantes";
  let chassis: ChassisId = "caja";
  if (b.cells.some((c) => c.blockId === "cuna_blk")) chassis = "cuna";
  else if (b.cells.some((c) => c.blockId === "plancha_blk")) chassis = "plancha";
  return { chassis, wheels, weapon };
}

function dismissLoadOverlay() {
  const el = document.getElementById("load");
  if (!el) return;
  el.classList.add("hidden", "out");
  el.classList.remove("in");
}

function applyArmadoCam() {
  const { yaw, dist, height, targetY } = ARMADO_CAM;
  deps.cam.position.set(Math.sin(yaw) * dist, height, Math.cos(yaw) * dist);
  deps.cam.setTarget(new B.Vector3(0, targetY, 0));
  syncWorkbenchLights();
}

/** Faro sobre la mesa (main no llama setLamp en duelo; sin esto el visor queda casi a oscuras). */
function syncWorkbenchLights() {
  if (phase !== "fabricar" && phase !== "armado") return;
  const scene = deps.scene;
  if (phase === "fabricar") {
    const t = fabCamTarget;
    wbLampPosLive.set(t.x + 0.42, WORKBENCH_TABLE_SURFACE + 0.26, t.z + 0.52);
    setLamp(wbLampPosLive, wbLampFwd, false, 0);
  } else {
    setLamp(wbLampPos, wbLampFwd, false, 0);
  }
  if (!wbFill) {
    wbFill = new B.PointLight("wbFill", new B.Vector3(-0.75, WORKBENCH_TABLE_TOP + 1.05, 0.35), scene);
    wbFill.diffuse = B.Color3.FromHexString("#ffc890");
    wbFill.intensity = 1.15;
    wbFill.range = 5.5;
  }
  if (phase === "fabricar") {
    wbFill.intensity = 3.4;
    wbFill.range = 11;
    wbFill.position.set(fabCamTarget.x - 0.75, WORKBENCH_TABLE_TOP + 1.35, fabCamTarget.z + 0.35);
  } else {
    wbFill.intensity = 1.15;
    wbFill.range = 5.5;
    wbFill.position.set(-0.75, WORKBENCH_TABLE_TOP + 1.05, 0.35);
  }
  wbFill.setEnabled(true);
  if (phase === "fabricar") {
    if (!fabCamLight) {
      fabCamLight = new B.DirectionalLight("fabCamLight", new B.Vector3(0, -1, 0), scene);
      fabCamLight.diffuse = B.Color3.FromHexString("#fff8f0");
      fabCamLight.intensity = 3.4;
    }
    fabCamLight.setEnabled(true);
    fabCamLightDir.copyFrom(fabCamTarget).subtractInPlace(deps.cam.position).normalize();
    fabCamLight.direction = fabCamLightDir;
  } else fabCamLight?.setEnabled(false);
}

/** Clima y focos extra solo en fabricar; la arena de pelea vuelve a mediodía en beginMatch. */
function installFabricarLighting() {
  // Mediodía acotado a la mesa: legible sin esperar al farol del auto (lampK≈0 de día).
  const medio = CLIMATES.find((c) => c.id === "mediodia")!;
  applyClimate({ ...medio, exposure: medio.exposure * 1.28, hemiI: medio.hemiI * 1.4, fog: 0.0025 });
  deps.scene.environmentIntensity = 0.82;
  shadows.darkness = 0.32;
  const scene = deps.scene;
  if (!fabBenchKey) {
    fabBenchKey = new B.SpotLight(
      "fabBenchKey",
      new B.Vector3(1.2, 3.05, 1.45),
      new B.Vector3(-0.38, -0.93, -0.33),
      Math.PI / 2.3,
      2.6,
      scene,
    );
    fabBenchKey.diffuse = B.Color3.FromHexString("#fff8ec");
    fabBenchKey.intensity = 7.2;
    fabBenchKey.range = 22;
  }
  fabBenchKey.setEnabled(true);
  if (!fabBenchBounce) {
    fabBenchBounce = new B.PointLight("fabBenchBounce", new B.Vector3(0, 1.48, 0.22), scene);
    fabBenchBounce.diffuse = B.Color3.FromHexString("#ffe4bc");
    fabBenchBounce.intensity = 3.1;
    fabBenchBounce.range = 9.5;
  }
  fabBenchBounce.setEnabled(true);
  syncWorkbenchLights();
}

function disposeWorkbenchLights() {
  wbFill?.dispose();
  wbFill = null;
  fabBenchKey?.dispose();
  fabBenchKey = null;
  fabBenchBounce?.dispose();
  fabBenchBounce = null;
  fabCamLight?.dispose();
  fabCamLight = null;
}

function syncFabCamTargetFromPreview() {
  if (!previewFabRoot) {
    fabCamTarget.set(0, ARMADO_CAM.targetY, 0);
    return;
  }
  const vis = previewFabRoot.getChildTransformNodes()[0];
  const m = vis?.getChildMeshes()[0];
  if (!m) return;
  previewFabRoot.computeWorldMatrix(true);
  m.computeWorldMatrix(true);
  fabCamTarget.copyFrom(m.getBoundingInfo().boundingBox.centerWorld);
}

function resetCamViewportFull() {
  deps.cam.viewport = new B.Viewport(0, 0, 1, 1);
}

/** Recorta el render 3D al rectángulo #duel-fab-viewport (el canvas sigue fullscreen). */
function syncFabricarCamViewport() {
  if (phase !== "fabricar") {
    resetCamViewportFull();
    return;
  }
  const el = document.getElementById("duel-fab-viewport");
  const canvas = deps.scene.getEngine().getRenderingCanvas();
  if (!el || !canvas) return;
  const vr = el.getBoundingClientRect();
  const cr = canvas.getBoundingClientRect();
  if (cr.width < 1 || cr.height < 1 || vr.width < 4) return;
  const x = (vr.left - cr.left) / cr.width;
  const w = vr.width / cr.width;
  const h = vr.height / cr.height;
  const y = (cr.bottom - vr.bottom) / cr.height;
  deps.cam.viewport = new B.Viewport(x, y, w, h);
}

function refreshFabricarCam() {
  syncFabricarCamViewport();
  applyFabricarCam();
}

function unbindFabricarViewportSync() {
  fabVpObs?.disconnect();
  fabVpObs = null;
  if (fabVpOnResize) window.removeEventListener("resize", fabVpOnResize);
  fabVpOnResize = null;
  resetCamViewportFull();
}

function bindFabricarViewportSync() {
  unbindFabricarViewportSync();
  const el = document.getElementById("duel-fab-viewport");
  const canvas = deps.scene.getEngine().getRenderingCanvas();
  if (!el || !canvas) return;
  fabVpOnResize = () => refreshFabricarCam();
  window.addEventListener("resize", fabVpOnResize);
  fabVpObs = new ResizeObserver(() => refreshFabricarCam());
  fabVpObs.observe(el);
  fabVpObs.observe(canvas);
  requestAnimationFrame(() => requestAnimationFrame(refreshFabricarCam));
}

function applyFabricarCam() {
  syncFabCamTargetFromPreview();
  const { yaw, dist, height, targetY } = ARMADO_CAM;
  const a = yaw + fabCamOff.yaw;
  const p = fabCamOff.pitch;
  const d = dist * fabCamDistMul * Math.cos(p);
  const lift = height - targetY + Math.sin(p) * dist * 0.85;
  const t = fabCamTarget;
  deps.cam.position.set(t.x + Math.sin(a) * d, t.y + lift, t.z + Math.cos(a) * d);
  deps.cam.setTarget(t);
  syncWorkbenchLights();
}

function unbindFabCamDrag() {
  fabCamUnbind?.();
  fabCamUnbind = null;
}

function bindFabCamDrag(el: HTMLElement | null) {
  unbindFabCamDrag();
  if (!el) return;
  let drag = false;
  let lx = 0;
  let ly = 0;
  const end = () => { drag = false; };
  const onDown = (e: PointerEvent) => {
    if (shotCamFrozen || phase !== "fabricar") return;
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest(".duel-fab-zoom, .duel-fab-zoom .duel-fab-btn")) return;
    drag = true;
    lx = e.clientX;
    ly = e.clientY;
    el.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!drag || shotCamFrozen || phase !== "fabricar") return;
    const dx = e.clientX - lx;
    const dy = e.clientY - ly;
    const yawMul = e.pointerType === "touch" ? 0.0032 : 0.0024;
    const pitchMul = e.pointerType === "touch" ? 0.0025 : 0.0019;
    fabCamOff.yaw += dx * yawMul;
    fabCamOff.pitch = Math.max(-0.4, Math.min(0.34, fabCamOff.pitch - dy * pitchMul));
    lx = e.clientX;
    ly = e.clientY;
    applyFabricarCam();
  };
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  const zoomClamp = (mul: number) => Math.max(0.5, Math.min(1.42, mul));
  const onWheel = (e: WheelEvent) => {
    if (shotCamFrozen || phase !== "fabricar") return;
    e.preventDefault();
    const k = e.deltaY > 0 ? 1.06 : 0.94;
    fabCamDistMul = zoomClamp(fabCamDistMul * k);
    applyFabricarCam();
  };
  let pinch0 = 0;
  const pinchDist = (ev: TouchEvent) => {
    if (ev.touches.length < 2) return 0;
    const a = ev.touches[0], b = ev.touches[1];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };
  const onTouchStart = (e: TouchEvent) => {
    if (shotCamFrozen || phase !== "fabricar" || e.touches.length < 2) return;
    pinch0 = pinchDist(e);
    e.preventDefault();
  };
  const onTouchMove = (e: TouchEvent) => {
    if (shotCamFrozen || phase !== "fabricar" || e.touches.length < 2 || pinch0 < 1) return;
    const d = pinchDist(e);
    if (d > 1) fabCamDistMul = zoomClamp(fabCamDistMul * (pinch0 / d));
    pinch0 = d;
    applyFabricarCam();
    e.preventDefault();
  };
  const onTouchEnd = () => { pinch0 = 0; };
  el.addEventListener("wheel", onWheel, { passive: false });
  el.addEventListener("touchstart", onTouchStart, { passive: false });
  el.addEventListener("touchmove", onTouchMove, { passive: false });
  el.addEventListener("touchend", onTouchEnd);
  el.addEventListener("touchcancel", onTouchEnd);
  fabCamUnbind = () => {
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", end);
    el.removeEventListener("pointercancel", end);
    el.removeEventListener("wheel", onWheel);
    el.removeEventListener("touchstart", onTouchStart);
    el.removeEventListener("touchmove", onTouchMove);
    el.removeEventListener("touchend", onTouchEnd);
    el.removeEventListener("touchcancel", onTouchEnd);
  };
}

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

function attachBuildPhysics(root: B.Mesh, build: RobotBuild, mass: number, warn: boolean) {
  const cog = cogOfBuild(build);
  const aabb = aabbOfBuild(build);
  const ext = aabb.size;
  const agg = new B.PhysicsAggregate(root, B.PhysicsShapeType.MESH, { mass, friction: D.phys_friction_bot, restitution: 0.15 }, deps.scene);
  const body = agg.body;
  body.setMassProperties({
    mass,
    inertia: new B.Vector3(mass * 0.35, mass * 0.8, mass * 0.35),
    centerOfMass: new B.Vector3(cog.x * 0.15, Math.min(0.35, cog.y - ext.y * 0.35), cog.z * 0.15),
  });
  return { agg, body };
}

function makeBotFromBuild(id: number, human: boolean, build: RobotBuild, at: B.Vector3, name: string, paint: DuelPaintState, warn = false): Bot {
  const scene = deps.scene;
  const st = statsOfBuild(build, warn);
  const c = cfgFromBuild(build);
  const root = buildColliderMesh(build);
  root.name = "duelCol";
  root.isVisible = false;
  const pivot = visualPivotOffset(build);
  root.position.copyFrom(at);
  root.position.y = Math.max(at.y, aabbOfBuild(build).size.y * 0.5 + 0.05);
  const vis = new B.TransformNode("duelVis", scene);
  vis.parent = root;
  vis.position.set(-pivot.x, -pivot.y, -pivot.z);
  const m = paintBuildMesh(build, paint);
  m.parent = vis;
  m.position.copyFrom(pivot);
  shadows.addShadowCaster(m);
  const mass = Math.max(0.8, st.mass);
  const { agg, body } = attachBuildPhysics(root, build, mass, warn);
  return {
    id, human, name, cfg: c, root, vis, body, agg, hp: st.hpMax, hpMax: st.hpMax, hitAt: 0, rpm: 0, flipped: false,
    camYaw: 0, camPos: at.clone().add(new B.Vector3(0, 6, -10)),
    stats: { maxSpd: st.maxSpd, accel: st.accel, turn: st.turn, grip: st.grip, push: st.push, dano: st.dano, knock: st.knock },
    mass, warnMul: warn ? D.warn_traccion_mul : 1, dmgOut: 0, dmgIn: 0,
    living: livingFromBuild(build), duelPaint: paint,
  };
}

function refreshBuildBotVisual(b: Bot) {
  if (!b.living || !b.duelPaint) return;
  for (const ch of b.vis.getChildMeshes()) ch.dispose();
  const build = b.living.build;
  const pivot = visualPivotOffset(build);
  const m = paintBuildMesh(build, b.duelPaint);
  m.parent = b.vis;
  m.position.copyFrom(pivot);
  shadows.addShadowCaster(m);
  const st = statsOfBuild(build, b.warnMul < 1);
  b.cfg = cfgFromBuild(build);
  b.mass = Math.max(0.8, st.mass);
  b.stats = { maxSpd: st.maxSpd, accel: st.accel, turn: st.turn, grip: st.grip, push: st.push, dano: st.dano, knock: st.knock };
  rebuildBuildBotPhysics(b);
}

function rebuildBuildBotPhysics(b: Bot) {
  if (!b.living) return;
  const build = b.living.build;
  const lin = b.body.getLinearVelocity();
  const ang = b.body.getAngularVelocity();
  const pos = b.root.position.clone();
  const rot = b.root.rotationQuaternion?.clone();
  const pivot = visualPivotOffset(build);
  b.agg.dispose();
  b.root.dispose();
  const root = buildColliderMesh(build);
  root.name = "duelCol";
  root.isVisible = false;
  root.position.copyFrom(pos);
  if (rot) root.rotationQuaternion = rot;
  b.vis.parent = root;
  b.vis.position.set(-pivot.x, -pivot.y, -pivot.z);
  const { agg, body } = attachBuildPhysics(root, build, b.mass, b.warnMul < 1);
  body.setLinearVelocity(lin);
  body.setAngularVelocity(ang);
  b.root = root;
  b.agg = agg;
  b.body = body;
}

function partBreakWorldPos(b: Bot, cell: Cell) {
  const p = cellWorldCenter(cell);
  return b.root.getAbsolutePosition().add(new B.Vector3(p.x, p.y, p.z));
}

function applyBuildPartWear(vic: Bot, atk: Bot, dmg: number) {
  if (!vic.living) return;
  const local = atk.root.position.subtract(vic.root.position);
  local.y = 0;
  const idx = pickHitCellIndex(vic.living.build, local.x, local.z);
  if (idx < 0) return;
  const cell = vic.living.build.cells[idx];
  const def = blockDef(cell.blockId);
  vic.living.partHp[idx] -= dmg * D.part_wear_mul;
  if (vic.human) {
    vic.wearFlash = { idx, until: t + 1.6, max: def.hp, name: def.nombre };
  }
  if (vic.living.partHp[idx] > 0) return;
  const wheel = def.cat === "movimiento";
  SFX.duelPartBreak(wheel);
  const wpos = partBreakWorldPos(vic, cell);
  impact(vic.vis.getChildMeshes()[0] ?? vic.root, wpos, vic.human ? "#c9a227" : "#8a6a20", 0.85, wheel ? "gomitas" : "clips", true, false);
  const seatGone = stripCell(vic.living, idx);
  if (seatGone) vic.hp = 0;
  if (vic.wearFlash?.idx === idx) vic.wearFlash = undefined;
  refreshBuildBotVisual(vic);
}

function clearFabPlaceGhost() {
  fabPlaceGhost?.dispose();
  fabPlaceGhost = null;
  fabPlaceGhostRoot?.dispose();
  fabPlaceGhostRoot = null;
}

function updateFabPlaceGhost(info: { probe: Cell; can: boolean; erase: boolean } | null) {
  clearFabPlaceGhost();
  if (!info || info.erase || phase !== "fabricar") return;
  const scene = deps.scene;
  const pivot = visualPivotOffset(playerBuild);
  const root = new B.TransformNode("fabGhostRoot", scene);
  root.position.set(0, WORKBENCH_TABLE_SURFACE, 0);
  const vis = new B.TransformNode("fabGhostVis", scene);
  vis.parent = root;
  vis.position.set(-pivot.x, -pivot.y, -pivot.z);
  const m = placementGhostMesh(info.probe, info.can, playerPaint);
  m.parent = vis;
  m.position.copyFrom(pivot);
  fabPlaceGhostRoot = root;
  fabPlaceGhost = m;
}

function previewFabricacion() {
  fabPreviewGlow?.dispose();
  fabPreviewGlow = null;
  previewFabRoot?.dispose();
  previewFabRoot = null;
  if (!playerBuild.cells.length) {
    fabCamTarget.set(0, ARMADO_CAM.targetY, 0);
    if (phase === "fabricar") applyFabricarCam();
    return;
  }
  const scene = deps.scene;
  const pivot = visualPivotOffset(playerBuild);
  const root = new B.TransformNode("fabPreview", scene);
  root.position.set(0, WORKBENCH_TABLE_SURFACE, 0);
  const vis = new B.TransformNode("fabVis", scene);
  vis.parent = root;
  vis.position.set(-pivot.x, -pivot.y, -pivot.z);
  const m = paintBuildMesh(playerBuild, playerPaint);
  m.parent = vis;
  m.position.copyFrom(pivot);
  shadows.addShadowCaster(m);
  fabPreviewGlow = new B.PointLight("fabPrevGlow", new B.Vector3(0, 0.45, 0.18), scene);
  fabPreviewGlow.parent = root;
  fabPreviewGlow.intensity = 3.2;
  fabPreviewGlow.diffuse = B.Color3.FromHexString("#fff6ea");
  fabPreviewGlow.range = 2.5;
  fabPreviewGlow.falloffType = B.Light.FALLOFF_STANDARD;
  previewFabRoot = root;
  syncFabCamTargetFromPreview();
  if (phase === "fabricar") applyFabricarCam();
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
  const blueprint = canvasTex(256, (g, s) => {
    g.fillStyle = "#152238";
    g.fillRect(0, 0, s, s);
    const step = s / 20;
    g.strokeStyle = "#2a4a6e";
    g.lineWidth = 1;
    for (let i = 0; i <= 20; i++) {
      g.beginPath(); g.moveTo(i * step, 0); g.lineTo(i * step, s); g.stroke();
      g.beginPath(); g.moveTo(0, i * step); g.lineTo(s, i * step); g.stroke();
    }
    g.strokeStyle = "#4a8ab8";
    g.setLineDash([5, 4]);
    g.strokeRect(step * 2, step * 2, step * 16, step * 12);
    g.setLineDash([]);
    g.fillStyle = "#6fb3c4";
    g.font = "bold 11px monospace";
    g.fillText("PLANO · 1200×900 mm", step * 2, step * 1.5);
    g.strokeStyle = "#3d6a94";
    g.beginPath(); g.moveTo(step * 2, step * 16); g.lineTo(step * 18, step * 16);
    g.moveTo(step * 18, step * 14); g.lineTo(step * 18, step * 16); g.stroke();
    g.fillText("1200", step * 9, step * 17.2);
  });
  const top = box(3.4, 0.11, 2.6, pbr("wbTop", { color: "#1a3050", rough: 0.92, tex: blueprint }), [0, WORKBENCH_TABLE_TOP, 0]);
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

const SLOT_UI: Record<PieceCat, string> = { chassis: "chasis", wheels: "ruedas", weapon: "arma" };

function selectPending(cat: PieceCat, id: string) {
  if (!PIECE_CAT_IDS[cat].includes(id)) return;
  pendingPiece = pendingPiece?.cat === cat && pendingPiece.id === id ? null : { cat, id };
  syncArmado();
}

function applyPieceDrop(raw: string, slot: PieceCat) {
  const [cat, id] = raw.split(":") as [PieceCat, string];
  if (cat !== slot || !PIECE_CAT_IDS[cat].includes(id)) return;
  setPiece(cat, id);
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
  hideDragGhost();
  clearFabPlaceGhost();
  disposeWorkbenchLights();
  for (const b of bots) { b.agg.dispose(); b.root.dispose(); }
  bots = [];
  previewBot?.agg.dispose(); previewBot?.root.dispose(); previewBot = null;
  previewFabRoot?.dispose();
  fabPreviewGlow = null;
  previewFabRoot = null;
  for (const m of mesh) { m.physicsBody?.dispose(); m.dispose(); }
  mesh = [];
  lastHit.clear();
}

let dragGhost: B.Mesh | null = null;
function ghostPieceMesh(cat: PieceCat): B.Mesh {
  const ghostMat = pbr("wbGhost", { color: "#9ccc7a", rough: 0.55, alpha: 0.62 });
  if (cat === "chassis") return box(0.85, 0.32, 1.2, ghostMat, [0, 0.16, 0]);
  if (cat === "wheels") {
    const wh = wheel(0.32, 0.14, "#6a7a5a", "");
    wh.position.set(0, 0.16, 0);
    return merge("wbGhostWh", [wh]);
  }
  return cyl(0.28, 0.28, 0.1, ghostMat, [0, 0.12, 0]);
}

function screenToWorkbench(clientX: number, clientY: number): B.Vector3 | null {
  const engine = deps.scene.getEngine();
  const canvas = engine.getRenderingCanvas();
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return null;
  const px = ((clientX - rect.left) / rect.width) * engine.getRenderWidth();
  const py = ((clientY - rect.top) / rect.height) * engine.getRenderHeight();
  const pickRay = deps.scene.createPickingRay(px, py, B.Matrix.Identity(), deps.cam, false);
  const dy = pickRay.direction.y;
  if (Math.abs(dy) < 1e-6) return null;
  const t = (WORKBENCH_TABLE_SURFACE - pickRay.origin.y) / dy;
  if (t < 0) return null;
  return pickRay.origin.add(pickRay.direction.scale(t));
}

function onDragGhostMove(e: DragEvent) {
  if (!dragGhost) return;
  const p = screenToWorkbench(e.clientX, e.clientY);
  if (p) dragGhost.position.set(p.x, WORKBENCH_TABLE_SURFACE + 0.06, p.z);
}

function showDragGhost(cat: PieceCat) {
  hideDragGhost();
  dragGhost = ghostPieceMesh(cat);
  shadows.addShadowCaster(dragGhost);
  addEventListener("dragover", onDragGhostMove);
}

function hideDragGhost() {
  removeEventListener("dragover", onDragGhostMove);
  dragGhost?.dispose();
  dragGhost = null;
}

let partsDrawerOpen = !isTouch;
function syncPartsDrawer() {
  const drawer = ui.querySelector("#duel-drawer");
  const btn = ui.querySelector("#duel-drawer-toggle") as HTMLButtonElement | null;
  if (!drawer || !btn) return;
  drawer.classList.toggle("closed", !partsDrawerOpen);
  btn.setAttribute("aria-expanded", String(partsDrawerOpen));
  btn.textContent = partsDrawerOpen ? "Ocultar piezas" : "Piezas";
}

let wbTrayWired = false;
function wireWorkbenchTray() {
  if (wbTrayWired) return;
  wbTrayWired = true;
  const tray = ui.querySelector(".duel-wb-tray")!;
  tray.addEventListener("dragstart", (e) => {
    const ev = e as DragEvent;
    const chip = (ev.target as HTMLElement).closest("[data-piece]") as HTMLElement | null;
    if (!chip || !ev.dataTransfer) return;
    ev.dataTransfer.setData("text/plain", chip.dataset.piece!);
    ev.dataTransfer.effectAllowed = "copy";
    chip.classList.add("dragging");
    chip.setAttribute("aria-grabbed", "true");
    const [cat] = chip.dataset.piece!.split(":") as [PieceCat, string];
    showDragGhost(cat);
    onDragGhostMove(ev);
  });
  tray.addEventListener("dragend", (e) => {
    const chip = (e.target as HTMLElement).closest("[data-piece]") as HTMLElement | null;
    chip?.classList.remove("dragging");
    chip?.setAttribute("aria-grabbed", "false");
    hideDragGhost();
    ui.querySelectorAll(".duel-drop.drag-over").forEach((el) => el.classList.remove("drag-over"));
  });
  tray.addEventListener("click", (e) => {
    const chip = (e.target as HTMLElement).closest("[data-piece]") as HTMLElement | null;
    if (!chip) return;
    const [cat, id] = chip.dataset.piece!.split(":") as [PieceCat, string];
    selectPending(cat, id);
  });
}

let wbStageWired = false;
function wireWorkbenchStage() {
  if (wbStageWired) return;
  wbStageWired = true;
  const stage = ui.querySelector(".duel-wb-stage")!;
  stage.addEventListener("dragover", (e) => {
    const zone = (e.target as HTMLElement).closest(".duel-drop[data-slot]") as HTMLElement | null;
    if (!zone) return;
    e.preventDefault();
    if ((e as DragEvent).dataTransfer) (e as DragEvent).dataTransfer!.dropEffect = "copy";
    ui.querySelectorAll(".duel-drop.drag-over").forEach((el) => { if (el !== zone) el.classList.remove("drag-over"); });
    zone.classList.add("drag-over");
  });
  stage.addEventListener("dragleave", (e) => {
    const zone = (e.target as HTMLElement).closest(".duel-drop[data-slot]");
    const rel = (e as DragEvent).relatedTarget as Node | null;
    if (zone && rel && zone.contains(rel)) return;
    (e.target as HTMLElement).closest(".duel-drop")?.classList.remove("drag-over");
  });
  stage.addEventListener("drop", (e) => {
    const zone = (e.target as HTMLElement).closest(".duel-drop[data-slot]") as HTMLElement | null;
    if (!zone) return;
    e.preventDefault();
    zone.classList.remove("drag-over");
    const raw = (e as DragEvent).dataTransfer?.getData("text/plain");
    if (!raw) return;
    applyPieceDrop(raw, zone.dataset.slot as PieceCat);
  });
  stage.addEventListener("click", (e) => {
    const zone = (e.target as HTMLElement).closest(".duel-drop[data-slot]") as HTMLElement | null;
    if (!zone || !pendingPiece) return;
    if (zone.dataset.slot !== pendingPiece.cat) return;
    setPiece(pendingPiece.cat, pendingPiece.id);
  });
}

function trayGroup(cat: PieceCat, lab: string, cur: string) {
  const chips = PIECE_CAT_IDS[cat].map((id) => {
    const p = PIECE[id as ChassisId | WheelsId | WeaponId];
    const on = id === cur;
    const pend = pendingPiece?.cat === cat && pendingPiece.id === id;
    return `<button type="button" class="duel-chip${on ? " on" : ""}${pend ? " pending" : ""}" draggable="true" role="listitem" data-piece="${cat}:${id}" aria-pressed="${on}" aria-grabbed="false" title="${p.lore}">${p.label}</button>`;
  }).join("");
  return `<div class="duel-tray-col"><span class="duel-tray-lab">${lab}</span><div class="duel-tray-chips" role="list">${chips}</div></div>`;
}

function robotDropZones(ch: ChassisId, wh: WheelsId, ar: WeaponId) {
  const mk = (cat: PieceCat) => {
    const id = cat === "chassis" ? ch : cat === "wheels" ? wh : ar;
    const lab = SLOT_UI[cat];
    const pick = pendingPiece?.cat === cat;
    return `<button type="button" class="duel-drop equipped${pick ? " pick-target" : ""}" data-slot="${cat}" aria-label="Zona de ${lab}: ${PIECE[id].label}. Arrastrar pieza o tocar con pieza seleccionada.">
<span class="duel-drop-lab">${lab}</span><span class="duel-drop-val">${PIECE[id].label}</span></button>`;
  };
  return mk("wheels") + mk("weapon") + mk("chassis");
}

function ensureUi() {
  if (ui) return;
  ui = document.createElement("div");
  ui.id = "duel-ui";
  ui.innerHTML = `<div id="duel-arm" class="duel-wb"><header class="duel-wb-head"><h1>ARMADO</h1><p class="duel-wb-hint">Arrastrar cada pieza al robot</p><p class="duel-wb-fallback">O elegir pieza y tocar la zona en el robot</p></header>
<div class="duel-wb-main"><aside class="duel-wb-side" aria-labelledby="duel-sec-stats"><h2 id="duel-sec-stats" class="duel-sec-h">Telemetría</h2><div class="duel-bars" role="group" aria-label="Estimación del robot"></div>
<details class="duel-paint-wrap" id="duel-paint-details"><summary class="duel-paint-sum">Pintura <span class="duel-opt">(opcional)</span></summary><div class="duel-paint" id="duel-paint"></div></details>
<p class="duel-warn" id="duel-warn" role="status" aria-live="polite"></p></aside>
<div class="duel-wb-center"><div class="duel-wb-stage" aria-label="Robot en mesa de taller"><div class="duel-wb-drops" id="duel-drops"></div></div>
<p class="duel-equip" id="duel-equip" aria-live="polite"></p></div>
<aside class="duel-wb-drawer" id="duel-drawer" aria-labelledby="duel-sec-tray"><button type="button" class="duel-drawer-tab" id="duel-drawer-toggle" aria-controls="duel-drawer-panel" aria-expanded="true">Ocultar piezas</button>
<div class="duel-drawer-panel" id="duel-drawer-panel"><section class="duel-wb-tray-wrap" aria-labelledby="duel-sec-tray"><h2 id="duel-sec-tray" class="duel-sec-h">Piezas</h2><div class="duel-wb-tray"></div></section></div></aside></div>
<button type="button" class="duel-cta" id="duel-confirm">Confirmar armado</button></div>
<div id="duel-hud" class="duel-hud h-panel"><div class="duel-hp-row"><span id="duel-en" class="duel-hud-lab enemy">RIVAL</span><span id="duel-you" class="duel-hud-lab you">PROPIO</span></div><div class="duel-hp-row duel-hp-bars"><div class="duel-hp-wrap enemy"><div class="h-track duel-hp-track enemy" role="presentation"><div id="duel-hpE"></div></div></div><div class="duel-hp-wrap you"><div class="h-track duel-hp-track you" role="presentation"><div id="duel-hpP"></div></div></div></div><div id="duel-part-wear" class="duel-part-wear hidden" aria-live="polite"><span id="duel-part-label">PIEZA</span><div class="h-track duel-hp-track part" role="presentation"><div id="duel-part-hp"></div></div></div><div class="duel-score" id="duel-score"></div></div>
<div id="duel-inter"><p id="duel-inter-t"></p><button type="button" id="duel-next">SIGUIENTE ASALTO</button></div>
<div id="duel-res"><div class="duel-polaroid"><p id="duel-res-t"></p><dl id="duel-res-stats"></dl></div><button type="button" id="duel-again">REINTENTAR</button><button type="button" id="duel-exit">MENÚ</button></div>
<button type="button" id="duel-flip">ENDEREZAR</button>
<div id="duel-count" class="duel-count" aria-live="polite"></div>`;
  document.body.appendChild(ui);
  const pause = document.createElement("div");
  pause.id = "duel-pause";
  pause.innerHTML = `<p>PAUSA</p><button type="button" id="duel-resume">REANUDAR</button><button type="button" id="duel-quit">ABANDONAR</button>`;
  document.body.appendChild(pause);
  wireWorkbenchTray();
  wireWorkbenchStage();
  $d("duel-drawer-toggle").onclick = () => { partsDrawerOpen = !partsDrawerOpen; syncPartsDrawer(); };
  $d("duel-confirm").onclick = () => { if (comboCheck(cfg) !== "ban") beginMatch(); };
  $d("duel-next").onclick = () => startRound();
  $d("duel-again").onclick = () => { score = [0, 0]; round = 0; backToWorkshop(); };
  $d("duel-exit").onclick = () => exitDuel();
  $d("duel-flip").onclick = () => flipPlayer();
  $d("duel-resume").onclick = () => { paused = false; $d("duel-pause").classList.remove("on"); };
  $d("duel-quit").onclick = () => { score = [0, 2]; endMatch(true); };
  document.getElementById("tPause")?.addEventListener("click", () => {
    if (!active || (phase !== "fight" && phase !== "countdown") || paused) return;
    paused = true;
    $d("duel-pause").classList.add("on");
  }, true);
  wirePaintPanel("duel-paint-details", "duel-paint", () => syncArmado());
  addEventListener("keydown", (e) => {
    if (!active || phase !== "armado") return;
    if (e.key === "q" || e.key === "Q") { playerPaint.zones[paintSlot] = cycleColor(playerPaint.zones[paintSlot], -1); persistPaint(); syncArmado(); }
    if (e.key === "r" || e.key === "R") { playerPaint.zones[paintSlot] = cyclePreset(playerPaint.zones[paintSlot], 1); persistPaint(); syncArmado(); }
  });
}

function persistPaint() { saveDuelPaint(playerPaint); }

type PaintUiTarget = { detailsId: string; panelId: string; refresh: () => void };
const PAINT_ARM: PaintUiTarget = { detailsId: "duel-paint-details", panelId: "duel-paint", refresh: () => syncArmado() };
const PAINT_FAB: PaintUiTarget = { detailsId: "duel-fab-paint-details", panelId: "duel-fab-paint", refresh: () => previewFabricacion() };

function onPaintPanelClick(e: Event, target: PaintUiTarget) {
  const t = e.target as HTMLElement;
  const slot = t.closest("[data-pzone]") as HTMLElement | null;
  if (slot?.dataset.pzone) { paintSlot = slot.dataset.pzone as PaintSlot; syncPaintUi(target); return; }
  const sw = t.closest("[data-sw]") as HTMLElement | null;
  if (sw?.dataset.sw) {
    playerPaint.zones[paintSlot] = { ...playerPaint.zones[paintSlot], color: sw.dataset.sw };
    persistPaint(); target.refresh(); syncPaintUi(target); return;
  }
  if (t.closest("[data-preset]")) {
    playerPaint.zones[paintSlot] = cyclePreset(playerPaint.zones[paintSlot], 1);
    persistPaint(); target.refresh(); syncPaintUi(target);
  }
}

function wirePaintPanel(detailsId: string, panelId: string, refresh: () => void) {
  const details = document.getElementById(detailsId) as HTMLDetailsElement | null;
  const panel = document.getElementById(panelId);
  if (!details || !panel || panel.dataset.paintWired) return;
  panel.dataset.paintWired = "1";
  const target: PaintUiTarget = { detailsId, panelId, refresh };
  details.addEventListener("toggle", () => syncPaintUi(target));
  panel.addEventListener("click", (e) => onPaintPanelClick(e, target));
}

const SWATCH_NAMES: Record<string, string> = {
  "#d62828": "Rojo", "#1d4ed8": "Azul", "#2a9d8f": "Verde azulado", "#e85d04": "Naranja",
  "#4a5058": "Gris", "#e5e7eb": "Blanco", "#ffc300": "Amarillo", "#6b7a3a": "Oliva",
};

function syncPaintUi(target: PaintUiTarget = PAINT_ARM) {
  const el = document.getElementById(target.panelId);
  const details = document.getElementById(target.detailsId) as HTMLDetailsElement | null;
  if (!el || !details) return;
  const open = details.open;
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
  ui.querySelector(".duel-wb-tray")!.innerHTML = trayGroup("chassis", "Chasis", ch) + trayGroup("wheels", "Ruedas", wh) + trayGroup("weapon", "Arma", ar);
  ui.querySelector("#duel-drops")!.innerHTML = robotDropZones(ch, wh, ar);
  const eq = $d("duel-equip");
  if (pendingPiece) {
    const p = PIECE[pendingPiece.id as ChassisId | WheelsId | WeaponId];
    eq.textContent = `Seleccionado: ${p.label} — arrastrar o tocar zona de ${SLOT_UI[pendingPiece.cat]} en el robot`;
  } else eq.textContent = `Equipado: ${PIECE[ch].label} · ${PIECE[wh].label} · ${PIECE[ar].label}`;
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

/** En táctil: solo stick + ARMA en pelea; ocultar turbo/derrape/cámara del modo supervivencia. */
function syncDuelTouch() {
  const inFight = phase === "countdown" || phase === "fight";
  document.body.classList.toggle("duel-fight", inFight);
  const touchEl = document.getElementById("touch");
  const ab = document.getElementById("tAbil");
  if (!isTouch) return;
  if (inFight) {
    touchEl?.classList.remove("hidden");
    if (ab) ab.textContent = "ARMA";
  } else {
    touchEl?.classList.add("hidden");
    if (ab) ab.textContent = "HAB";
  }
}

function showArmado() {
  unbindFabCamDrag();
  unbindFabricarViewportSync();
  fab?.destroy(); fab = null;
  ensureUi(); cleanup(); phase = "armado";
  pendingPiece = null;
  dismissLoadOverlay();
  showWorld(false); clearLayout();
  applyClimate(CLIMATES.find((c) => c.id === "farol")!);
  buildWorkbench();
  deps.scene.physicsEnabled = true;
  partsDrawerOpen = !isTouch;
  const arm = document.getElementById("duel-arm");
  if (arm) arm.style.display = "";
  const conf = document.getElementById("duel-confirm");
  if (conf) conf.style.display = "";
  ui.className = "on armado";
  syncArmado();
  syncPartsDrawer();
  applyArmadoCam();
  shotCamFrozen = true;
  document.getElementById("fe")?.classList.add("hidden");
  syncDuelTouch();
}

function showFabricar() {
  ensureUi(); cleanup(); phase = "fabricar";
  dismissLoadOverlay();
  showWorld(false); clearLayout();
  buildWorkbench();
  installFabricarLighting();
  deps.scene.physicsEnabled = true;
  // Ocultar panel legado de armado 3×3
  const arm = document.getElementById("duel-arm");
  if (arm) arm.style.display = "none";
  const conf = document.getElementById("duel-confirm");
  if (conf) conf.style.display = "none";
  fab?.destroy();
  fab = mountFabricacion(ui, {
    onChange: (b) => { playerBuild = b; cfg = cfgFromBuild(b); previewFabricacion(); refreshFabricarCam(); fab?.refreshGhost(); },
    onConfirm: () => beginMatch(),
    onLayout: () => refreshFabricarCam(),
    onZoom: (mul) => {
      fabCamDistMul = Math.max(0.5, Math.min(1.42, fabCamDistMul * mul));
      applyFabricarCam();
    },
    onHoverCell: (info) => updateFabPlaceGhost(info),
  });
  wirePaintPanel(PAINT_FAB.detailsId, PAINT_FAB.panelId, PAINT_FAB.refresh);
  fab.setBuild(playerBuild.cells.length ? playerBuild : defaultBuild());
  playerBuild = fab.getBuild();
  cfg = cfgFromBuild(playerBuild);
  ui.className = "on fabricar";
  fabCamOff = { yaw: 0, pitch: 0 };
  fabCamDistMul = 1;
  previewFabricacion();
  shotCamFrozen = false;
  bindFabricarViewportSync();
  bindFabCamDrag(document.getElementById("duel-fab-viewport"));
  document.getElementById("fe")?.classList.add("hidden");
  syncDuelTouch();
}

export function startDuel() {
  active = true; score = [0, 0]; round = 0;
  playerPaint = loadDuelPaint();
  playerBuild = defaultBuild();
  if (LEGACY_ARMADO) {
    loadoutWarn = comboCheck(cfg) === "warn";
    showArmado();
  } else {
    loadoutWarn = validateBuild(playerBuild).level === "warn";
    showFabricar();
  }
}

function rivalCfg(): RobotConfig {
  const r = BAL.dueloRival.cuna_industrial;
  return { chassis: r.chasis_id as ChassisId, wheels: r.ruedas_id as WheelsId, weapon: r.arma_id as WeaponId };
}

function beginMatch() {
  unbindFabricarViewportSync();
  shotCamFrozen = false;
  if (!LEGACY_ARMADO) {
    playerBuild = fab?.getBuild() ?? playerBuild;
    saveBuild(playerBuild);
    cfg = cfgFromBuild(playerBuild);
    loadoutWarn = validateBuild(playerBuild).level === "warn";
  } else loadoutWarn = comboCheck(cfg) === "warn";
  matchDmg = { dealt: 0, taken: 0 };
  fab?.destroy(); fab = null;
  cleanup();
  showWorld(false);
  clearLayout();
  applyClimate(CLIMATES.find((c) => c.id === "mediodia")!);
  deps.scene.environmentIntensity = 0.55;
  shadows.darkness = 0.5;
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
  if (LEGACY_ARMADO) {
    bots.push(makeBot(0, true, cfg, new B.Vector3(-4, 0.6, 0), playerPaint.name || "TÚ", playerPaint, loadoutWarn));
    bots.push(makeBot(1, false, rivalCfg(), new B.Vector3(4, 0.6, 0), r.nombre, rivalPaintFromBalance(r), false));
  } else {
    bots.push(makeBotFromBuild(0, true, playerBuild, new B.Vector3(-4, 0.6, 0), playerPaint.name || "TÚ", playerPaint, loadoutWarn));
    bots.push(makeBotFromBuild(1, false, rivalBuild(), new B.Vector3(4, 0.6, 0), r.nombre, rivalPaintFromBalance(r), false));
  }
  for (const b of bots) { b.hp = b.hpMax; b.rpm = 0; b.flipped = false; b.hitAt = 0; }
  phase = "countdown"; countdown = 3.4; t = 0;
  ui.className = "on fight";
  syncDuelTouch();
  updateHud();
  updateCountdownUi();
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
  const p = b.root.position;
  const d = target.root.position.subtract(p);
  d.y = 0;
  const dist = d.length();
  if (dist < 1e-3) return;
  const toT = d.normalize();
  const fwd = b.root.forward;
  fwd.y = 0;
  fwd.normalize();
  const dot = B.Vector3.Dot(fwd, toT);
  const cross = fwd.x * toT.z - fwd.z * toT.x;
  const steer = B.Scalar.Clamp(cross * 1.05, -1, 1);
  const aggr = 0.48 + round * 0.11;
  let throttle = 0;
  if (b.flipped) throttle = -0.25;
  else if (dist > 4.8) throttle = aggr;
  else if (dist > 2.6) throttle = aggr * (dist > 3.6 ? 0.9 : 0.55);
  else if (dist < 1.5) throttle = dot > 0.3 ? 0.5 : -0.4;
  else throttle = dot > 0.45 ? 0.62 * aggr : 0.2;
  const ram = dist < 2.4 && dot > 0.38;
  stepDuelPhysics(b, dt, throttle, steer, ram);
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
      if (atk.stats.dano >= 4 && atk.rpm > 0.05) dmg *= 0.35 + 0.65 * atk.rpm;
      if (vic.flipped) dmg *= D.volcado_vuln_mul;
      if (god && vic.human) dmg = 0;
      vic.hp -= dmg; vic.hitAt = now;
      applyBuildPartWear(vic, atk, dmg);
      if (atk.human) { atk.dmgOut += dmg; matchDmg.dealt += dmg; }
      if (vic.human) { vic.dmgIn += dmg; matchDmg.taken += dmg; }
      if (dmg >= 3) {
        SFX.impact(atk.cfg.weapon, false);
        const sh = impact(vic.vis.getChildMeshes()[0] ?? vic.root, vic.root.position, vic.human ? "#b9d3a4" : "#d12a1c", 1, atk.cfg.weapon, dmg >= 8, false);
        camShake = Math.max(camShake, sh * 2.2);
        if (vic.human || atk.human) damageNumber(innerWidth / 2 + (vic.human ? -40 : 40), 120, Math.round(dmg), false);
      }
      if (atk.stats.knock > 0 && rel > 4) vic.body.applyImpulse(new B.Vector3(0, atk.stats.knock * atk.mass * 0.15, 0), vic.root.getAbsolutePosition());
      if (atk.stats.push > 0.9 && rel > 2) {
        const push = vic.root.position.subtract(atk.root.position); push.y = 0; push.normalize();
        vic.body.applyImpulse(push.scale(atk.stats.push * atk.mass * rel * 0.075), vic.root.getAbsolutePosition());
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
    syncDuelTouch();
    $d("duel-inter-t").textContent = `Asalto ${round}: ${w === 0 ? "Victoria" : "Derrota"}. Marcador ${score[0]} – ${score[1]}`;
  }
}

function endMatch(forfeit: boolean) {
  phase = "results";
  syncDuelTouch();
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
    ["Loadout", LEGACY_ARMADO
      ? `${PIECE[cfg.chassis].label} / ${PIECE[cfg.wheels].label} / ${PIECE[cfg.weapon].label}`
      : `${playerBuild.cells.length} bloques · ${PIECE[cfg.weapon].label}`],
  ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  engineStop(); music("menu");
}

function updateHud() {
  const p = bots.find((b) => b.human), e = bots.find((b) => !b.human);
  if (!p || !e) return;
  ($d("duel-hpE") as HTMLElement).style.width = `${Math.round(100 * Math.max(0, e.hp / e.hpMax))}%`;
  ($d("duel-hpP") as HTMLElement).style.width = `${Math.round(100 * Math.max(0, p.hp / p.hpMax))}%`;
  $d("duel-en").textContent = e.name;
  $d("duel-you").textContent = p.name;
  $d("duel-score").textContent = `ASALTOS ${score[0]} – ${score[1]}`;
  const pw = $d("duel-part-wear");
  const flash = p.wearFlash;
  if (flash && t < flash.until && p.living && flash.idx < p.living.partHp.length) {
    pw.classList.remove("hidden");
    $d("duel-part-label").textContent = `INTEGRIDAD · ${flash.name}`;
    const ratio = Math.max(0, p.living.partHp[flash.idx] / flash.max);
    ($d("duel-part-hp") as HTMLElement).style.width = `${Math.round(100 * ratio)}%`;
  } else {
    pw.classList.add("hidden");
    if (flash && t >= flash.until) p.wearFlash = undefined;
  }
  ui.classList.toggle("flipped", !!p.flipped && flipCd <= 0);
  ($d("duel-flip") as HTMLButtonElement).disabled = flipCd > 0;
}

/** Cuenta atrás de salida (misma lógica que kart.ts / #rcount). */
function updateCountdownUi() {
  const el = $d("duel-count");
  if (phase === "countdown") {
    const show = countdown > 0 && countdown <= 3;
    el.textContent = show ? String(Math.ceil(countdown)) : "";
    el.className = "duel-count" + (show ? " on" : "");
    return;
  }
  if (phase === "fight" && t < 1.2) {
    el.textContent = "¡YA!";
    el.className = "duel-count go on";
    return;
  }
  el.textContent = "";
  el.className = "duel-count";
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
  if (phase === "armado") return;
  if (phase === "fabricar") return;
  if (phase === "countdown") {
    const was = Math.ceil(countdown);
    countdown -= dt;
    if (countdown > 0 && Math.ceil(countdown) !== was && countdown < 3) SFX.countBeep(false);
    if (countdown <= 0) {
      SFX.countBeep(true);
      phase = "fight";
      syncDuelTouch();
      t = 0;
    }
    updateCountdownUi();
    return;
  }
  if (phase === "fight") {
    t += dt;
    updateCountdownUi();
    if (padPressed(pb("pause"))) { paused = true; $d("duel-pause").classList.add("on"); return; }
    const p = bots.find((b) => b.human)!;
    let throttle = 0, steer = 0;
    const e = bots.find((b) => !b.human)!;
    if (autoPlayer) aiStep(p, dt, e);
    else stepDuelPhysics(p, dt, input.move ? input.moveY : input.throttle, input.move ? -input.moveX : input.steer, input.ability || padPressed(pb("ability")));
    aiStep(e, dt, p);
    contactDamage();
    updateHud();
    if (!shotCamFrozen) camFollow(p, dt);
    const w = roundWinner();
    if (w !== null) endRound(w);
  }
}

function setShotCamPose() {
  if (phase === "fabricar") refreshFabricarCam();
  else if (phase === "armado") applyArmadoCam();
  else {
    deps.cam.position.set(-6, 7.5, -11);
    deps.cam.setTarget(new B.Vector3(0, 0.6, 0));
  }
}

export function exitDuel() {
  if (!active) return;
  active = false; paused = false; autoPlayer = false; god = false; pendingPiece = null; shotCamFrozen = false;
  unbindFabCamDrag();
  unbindFabricarViewportSync();
  fab?.destroy(); fab = null;
  cleanup();
  ui.className = "";
  $d("duel-pause").classList.remove("on");
  document.body.classList.remove("duel-fight");
  document.getElementById("touch")?.classList.add("hidden");
  document.getElementById("tAbil") && (document.getElementById("tAbil")!.textContent = "HAB");
  document.getElementById("fe")?.classList.remove("hidden");
  engineStop();
  deps.onExit();
}

function backToWorkshop() {
  if (LEGACY_ARMADO) showArmado();
  else showFabricar();
}

export const duelDev = {
  confirm: () => { if (phase === "armado" || phase === "fabricar") beginMatch(); },
  auto: (on = true) => { autoPlayer = on; },
  god: () => { god = true; },
  kill: () => { const e = bots.find((b) => !b.human); if (e) e.hp = 0; },
  /** Pose fija para capturas headless (sin órbita ni follow). */
  shotCam: (on = true) => { shotCamFrozen = on; if (on) setShotCamPose(); },
  info: () => ({
    active, phase, score, round, cfg, pendingPiece, build: playerBuild, ghost3d: !!fabPlaceGhost,
    countdown: phase === "countdown" ? countdown : undefined,
    bots: bots.map((b) => ({ name: b.name, hp: b.hp, rpm: b.rpm, flipped: b.flipped })),
  }),
  refreshGhost: () => fab?.refreshGhost(),
  /** Equipa por API (headless / regresión legado). */
  equip: (cat: PieceCat, id: string) => setPiece(cat, id),
  openDrawer: (on = true) => {
    if (phase === "fabricar") fab?.openDrawer(on);
    else { partsDrawerOpen = on; syncPartsDrawer(); }
  },
  loadTemplate: (id: string) => {
    if (!TEMPLATES[id]) return;
    playerBuild = structuredClone(TEMPLATES[id].build);
    saveBuild(playerBuild);
    fab?.setBuild(playerBuild);
    cfg = cfgFromBuild(playerBuild);
    previewFabricacion();
    refreshFabricarCam();
  },
};
