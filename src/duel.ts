// Modo Demolición: armado 3×3, arena acero, melee Havok, mejor de 3. (No confundir con battle/globos en kart.ts)
import * as B from "@babylonjs/core";
import "./duel.css";
import { BAL } from "./balance";
import { damageNumber } from "./ui";
import { burst, impact } from "./fx";
import { input, padPressed, pb } from "./input";
import { box, cyl, merge, wheel } from "./models";
import { applyClimate, canvasTex, M, pbr, shadows } from "./render";
import { save } from "./menu";
import { engineStop, music, SFX } from "./sfx";
import { buildGrass, clearLayout, setZone } from "./world";
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
const UP = B.Vector3.Up();
const ray = new B.PhysicsRaycastResult(), rayFrom = new B.Vector3(), rayTo = new B.Vector3();

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

function paintRobot(c: RobotConfig, colors?: { body: string; trim: string }) {
  // ponytail: pintura por zona §34 (duel_paint) pendiente; variación mínima por tipo de pieza
  const tint: Record<ChassisId, string> = { caja: "#4a5058", cuna: "#3d4550", plancha: "#5a6068" };
  const body = colors?.body ?? tint[c.chassis], trim = colors?.trim ?? "#e85d04";
  const parts: B.Mesh[] = [];
  const mb = M.matte(body), mt = M.metal(trim);
  if (c.chassis === "caja") parts.push(box(1.4, 0.55, 2, mb, [0, 0.35, 0]));
  else if (c.chassis === "cuna") parts.push(box(1.2, 0.35, 2.1, mb, [0, 0.28, 0.1]), box(1.3, 0.08, 0.5, mt, [0, 0.15, 1.05]));
  else parts.push(box(1.5, 0.18, 2.2, mb, [0, 0.2, 0]));
  if (c.wheels === "orugas") {
    parts.push(box(0.35, 0.25, 1.8, M.rubber(), [-0.75, 0.2, 0]), box(0.35, 0.25, 1.8, M.rubber(), [0.75, 0.2, 0]));
  } else {
    const d = c.wheels === "gigantes" ? 0.55 : 0.38, lift = BAL.dueloRuedas[c.wheels].lift_m;
    for (const x of [-0.7, 0.7]) for (const z of [-0.65, 0.65]) {
      const wh = wheel(d, 0.22, "#333", c.wheels === "gigantes" ? "todoterreno" : "");
      wh.position.set(x, lift, z); wh.rotation.z = Math.PI / 2;
      parts.push(wh);
    }
  }
  if (c.weapon === "trompo") parts.push(cyl(0.45, 0.45, 0.12, mt, [0, 0.45, 0.85]));
  else if (c.weapon === "sierra") parts.push(box(0.08, 0.35, 0.7, M.metal("#888"), [0.55, 0.4, 0.6]), cyl(0.35, 0.35, 0.04, M.metal("#ccc"), [0.85, 0.38, 0.6], [0, 0, Math.PI / 2]));
  else parts.push(box(0.9, 0.45, 0.15, mt, [0, 0.35, 1.05]));
  return merge("duelBot", parts);
}

function makeBot(id: number, human: boolean, c: RobotConfig, at: B.Vector3, name: string, colors?: { body: string; trim: string }, warn = false): Bot {
  const scene = deps.scene;
  const m = paintRobot(c, colors);
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
  const agg = new B.PhysicsAggregate(root, B.PhysicsShapeType.BOX, { mass, friction: 0.35, restitution: 0.15, extents: new B.Vector3(1.3, 0.45, 1.9) }, scene);
  const body = agg.body;
  body.setMassProperties({ mass, inertia: new B.Vector3(mass * 0.35, mass * 0.8, mass * 0.35), centerOfMass: new B.Vector3(0, cogY - 0.25, 0) });
  return {
    id, human, name, cfg: c, root, vis, body, agg, hp: hpMaxOf(c), hpMax: hpMaxOf(c), hitAt: 0, rpm: 0, flipped: false,
    camYaw: 0, camPos: at.clone().add(new B.Vector3(0, 6, -10)), stats: statsOf(c, warn), mass, warnMul: warn ? D.warn_traccion_mul : 1,
    dmgOut: 0, dmgIn: 0,
  };
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
  new B.PhysicsAggregate(fl, B.PhysicsShapeType.BOX, { mass: 0, friction: 0.4, restitution: 0.1 }, scene);
  const h = 2.5, t = 0.8;
  for (const [px, pz, sx, sz] of [[0, -HALF, ARENA, t], [0, HALF, ARENA, t], [-HALF, 0, t, ARENA], [HALF, 0, t, ARENA]] as const) {
    const w = box(sx, h, sz, M.metal("#555"), [px, h / 2, pz]);
    new B.PhysicsAggregate(w, B.PhysicsShapeType.BOX, { mass: 0, friction: 0.2, restitution: 0.5 }, scene);
    mesh.push(w);
  }
}

function cleanup() {
  for (const b of bots) { b.agg.dispose(); b.root.dispose(); }
  bots = [];
  for (const m of mesh) { m.physicsBody?.dispose(); m.dispose(); }
  mesh = [];
  lastHit.clear();
}

function ensureUi() {
  if (ui) return;
  ui = document.createElement("div");
  ui.id = "duel-ui";
  ui.innerHTML = `<div id="duel-arm"><h1>ARMADO</h1><p class="sub">Arena de acero, mejor de tres. Solo melee: chasis, ruedas y un arma.</p><p class="sub">Sin proyectiles. El rival no perdona combos torpes.</p><div class="duel-cols"></div><p class="duel-lore" id="duel-lore"></p><div class="duel-bars"></div><p class="duel-warn" id="duel-warn"></p><button type="button" id="duel-confirm">CONFIRMAR</button></div>
<div id="duel-hud"><div class="duel-hp-row"><span id="duel-en">RIVAL</span><span id="duel-you">TÚ</span></div><div class="duel-hp-row"><div class="duel-hp enemy"><i id="duel-hpE"></i></div><div class="duel-hp you"><i id="duel-hpP"></i></div></div><div class="duel-score" id="duel-score"></div></div>
<div id="duel-inter"><p id="duel-inter-t"></p><button type="button" id="duel-next">SIGUIENTE ASALTO</button></div>
<div id="duel-res"><div class="duel-polaroid"><p id="duel-res-t"></p><dl id="duel-res-stats"></dl></div><button type="button" id="duel-again">REINTENTAR</button><button type="button" id="duel-exit">MENÚ</button></div>
<button type="button" id="duel-flip">ENDEREZAR</button>`;
  document.body.appendChild(ui);
  const pause = document.createElement("div");
  pause.id = "duel-pause";
  pause.innerHTML = `<p>PAUSA</p><button type="button" id="duel-resume">REANUDAR</button><button type="button" id="duel-quit">ABANDONAR</button>`;
  document.body.appendChild(pause);
  ui.querySelector(".duel-cols")!.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("[data-duel]") as HTMLElement | null;
    if (!b) return;
    const [col, dir] = b.dataset.duel!.split(":") as ["c" | "w" | "a", "m" | "p"];
    const key = col === "c" ? "c" : col === "w" ? "w" : "a";
    const arr = col === "c" ? CH : col === "w" ? WH : AR;
    idx[key] = (idx[key] + (dir === "p" ? 1 : arr.length - 1)) % arr.length;
    syncArmado();
  });
  $d("duel-confirm").onclick = () => { if (comboCheck(cfg) !== "ban") beginMatch(); };
  $d("duel-next").onclick = () => startRound();
  $d("duel-again").onclick = () => { score = [0, 0]; round = 0; showArmado(); };
  $d("duel-exit").onclick = () => exitDuel();
  $d("duel-flip").onclick = () => flipPlayer();
  $d("duel-resume").onclick = () => { paused = false; $d("duel-pause").classList.remove("on"); };
  $d("duel-quit").onclick = () => { score = [0, 2]; endMatch(true); };
}

function syncArmado() {
  cfg = { chassis: CH[idx.c], wheels: WH[idx.w], weapon: AR[idx.a] };
  const cc = comboCheck(cfg);
  const cols = ui.querySelector(".duel-cols")!;
  const ch = CH[idx.c], wh = WH[idx.w], ar = AR[idx.a];
  cols.innerHTML = [
    ["CHASIS", "c", PIECE[ch].label],
    ["RUEDAS", "w", PIECE[wh].label],
    ["ARMA", "a", PIECE[ar].label],
  ].map(([lab, col, nom]) => `<div class="duel-col"><b>${lab}</b><div class="name">${nom}</div><button type="button" data-duel="${col}:m">‹</button> <button type="button" data-duel="${col}:p">›</button></div>`).join("");
  $d("duel-lore").textContent = `${PIECE[ch].lore} · ${PIECE[wh].lore} · ${PIECE[ar].lore}`;
  const m = massOf(cfg), st = statsOf(cfg, cc === "warn");
  const bars = ui.querySelector(".duel-bars")!;
  const norm = (v: number, max: number) => `${Math.round(100 * v / max)}%`;
  bars.innerHTML = `<div class="duel-bar">Masa<i><span style="width:${norm(m, 5.5)}"></span></i></div><div class="duel-bar">Vel<i><span style="width:${norm(st.maxSpd, 16)}"></span></i></div><div class="duel-bar">Vida<i><span style="width:${norm(hpMaxOf(cfg), 130)}"></span></i></div>`;
  const w = $d("duel-warn");
  w.className = "duel-warn" + (cc === "ban" ? " ban" : "");
  w.textContent = cc === "ban" ? "Combo inválido: cambiá las ruedas." : cc === "warn" ? "Advertencia: tracción −5% en este combo." : "";
  ($d("duel-confirm") as HTMLButtonElement).disabled = cc === "ban";
  previewArmado();
}

let previewBot: Bot | null = null;
function previewArmado() {
  previewBot?.agg.dispose(); previewBot?.root.dispose(); previewBot = null;
  previewBot = makeBot(9, true, cfg, new B.Vector3(0, 0.5, 0), "Preview", undefined, comboCheck(cfg) === "warn");
  deps.cam.setTarget(new B.Vector3(0, 0.5, 0));
  deps.cam.position.set(0, 4, -7);
}

function showArmado() {
  ensureUi(); cleanup(); phase = "armado";
  setZone("patio", false); clearLayout(); buildGrass();
  applyClimate(CLIMATES.find((c) => c.id === "mediodia")!);
  deps.scene.physicsEnabled = true;
  ui.className = "on armado";
  syncArmado();
  document.getElementById("fe")?.classList.add("hidden");
}

export function startDuel() {
  active = true; score = [0, 0]; round = 0; loadoutWarn = comboCheck(cfg) === "warn";
  showArmado();
}

function rivalCfg(): RobotConfig {
  const r = BAL.dueloRival.cuna_industrial;
  return { chassis: r.chasis_id as ChassisId, wheels: r.ruedas_id as WheelsId, weapon: r.arma_id as WeaponId };
}

function beginMatch() {
  loadoutWarn = comboCheck(cfg) === "warn";
  matchDmg = { dealt: 0, taken: 0 };
  previewBot?.agg.dispose(); previewBot?.root.dispose(); previewBot = null;
  cleanup(); buildArena();
  music("battle");
  ui.className = "on fight";
  startRound();
}

function startRound() {
  for (const b of bots) { b.agg.dispose(); b.root.dispose(); }
  bots = []; lastHit.clear();
  round++;
  const r = BAL.dueloRival.cuna_industrial;
  bots.push(makeBot(0, true, cfg, new B.Vector3(-4, 0.6, 0), "TÚ", undefined, loadoutWarn));
  bots.push(makeBot(1, false, rivalCfg(), new B.Vector3(4, 0.6, 0), r.nombre, { body: r.cuerpo_color, trim: r.bandas_color }));
  for (const b of bots) { b.hp = b.hpMax; b.rpm = 0; b.flipped = false; b.hitAt = 0; }
  phase = "countdown"; countdown = 3.4; t = 0;
  ui.className = "on fight";
  $d("duel-inter").parentElement!.className = "on fight";
  updateHud();
}

function grounded(body: B.PhysicsBody, mesh: B.Mesh) {
  const hh = 0.35;
  rayFrom.copyFrom(mesh.position); rayTo.copyFrom(rayFrom); rayTo.y -= hh + 0.5;
  (deps.scene.getPhysicsEngine() as B.PhysicsEngineV2).raycastToRef(rayFrom, rayTo, ray, { ignoreBody: body });
  return ray.hasHit;
}

function stepBot(b: Bot, dt: number, throttle: number, steer: number, weaponBtn: boolean) {
  const mesh = b.root;
  mesh.computeWorldMatrix(true);
  const fwd = mesh.forward.clone(); fwd.y = 0; if (fwd.lengthSquared() < 1e-4) fwd.set(0, 0, 1); else fwd.normalize();
  const right = B.Vector3.Cross(UP, fwd);
  if (!grounded(b.body, mesh)) {
    b.flipped = B.Vector3.Dot(mesh.up, UP) < 0.35;
    return;
  }
  b.flipped = false;
  if (b.cfg.weapon === "trompo" && weaponBtn) b.rpm = Math.min(1, b.rpm + dt / BAL.dueloArmas.trompo.rpm_carga_s);
  else b.rpm = Math.max(0, b.rpm - dt * 0.8);
  // ponytail: fuerzas Havok simplificadas vía velocidad objetivo (estable en web); subir a applyForce si el playtest lo pide
  const v = b.body.getLinearVelocity();
  let fs = B.Vector3.Dot(v, fwd), ls = B.Vector3.Dot(v, right);
  const s = b.stats;
  if (throttle > 0) fs = Math.min(fs + s.accel * throttle * dt, s.maxSpd * throttle);
  else if (throttle < 0) fs = fs > 0 ? fs - s.accel * 1.4 * dt : Math.max(fs + s.accel * throttle * dt, -s.maxSpd * 0.45);
  else fs *= 1 - Math.min(1, 2 * dt);
  ls *= Math.max(0, 1 - s.grip * dt);
  const nv = fwd.scale(fs).addInPlace(right.scale(ls)); nv.y = v.y;
  b.body.setLinearVelocity(nv);
  b.body.setAngularVelocity(new B.Vector3(0, steer * s.turn * B.Scalar.Clamp(fs / 5, -1, 1), 0));
  if (b.cfg.weapon === "trompo" && b.rpm > 0.2) b.body.applyTorque(new B.Vector3(0, b.rpm * b.mass * 0.4, 0));
}

function aiStep(b: Bot, dt: number, target: Bot) {
  const p = b.root.position, d = target.root.position.subtract(p); d.y = 0;
  const dist = d.length();
  const fwd = b.root.forward; fwd.y = 0; fwd.normalize();
  const cross = fwd.x * d.z - fwd.z * d.x;
  const steer = B.Scalar.Clamp(cross * 0.8, -1, 1);
  const aggr = 0.55 + round * 0.12;
  const throttle = dist > 3 ? aggr : dist < 1.8 ? -0.5 : 0.3;
  stepBot(b, dt, throttle, steer, dist < 2.5);
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
  const p = bots.find((b) => b.human);
  if (!p?.flipped) return;
  p.root.rotationQuaternion = B.Quaternion.FromEulerAngles(0, p.root.rotation.y, 0);
  p.body.setLinearVelocity(B.Vector3.Zero());
  p.body.setAngularVelocity(B.Vector3.Zero());
  p.flipped = false;
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
  ui.classList.toggle("flipped", !!p.flipped);
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
  if (phase === "armado") { deps.scene.physicsEnabled = true; previewBot && stepBot(previewBot, dt, 0, 0, false); return; }
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
    else stepBot(p, dt, input.move ? input.moveY : input.throttle, input.move ? -input.moveX : input.steer, input.ability || padPressed(pb("ability")));
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
  active = false; paused = false;
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
