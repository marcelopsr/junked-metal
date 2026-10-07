// Modo arcade: match-3 en gabinete de chatarra (nivel 1). Lógica en match3_logic.ts.
import * as B from "@babylonjs/core";
import "./match3.css";
import { current as menuScr, openM3Config } from "./menu";
import { applyClimate, M, pbr, setDark } from "./render";
import { music, SFX } from "./sfx";
import { DUSK } from "./run";
import {
  M3_GOAL_QTY,
  M3_GOAL_TYPES,
  M3_MOVES,
  M3_NAMES,
  M3_SIZE,
  cloneBoard,
  m3Rng,
  newMatch3,
  resetMatch3,
  startPlay,
  swapCells,
  trySwap,
  type Match3State,
  type M3Board,
  type M3ResolveStep,
} from "./match3_logic";

type Deps = { scene: B.Scene; cam: B.FreeCamera; onExit(): void };
let D: Deps;
let active = false;
let st: Match3State;
let rng: () => number;
let resolving = false;
let sel: { x: number; y: number } | null = null;
let dragFrom: { x: number; y: number } | null = null;

const PIECE_COL = ["#c9a227", "#8a9a82", "#7fbf5a", "#6fb3c4", "#e0a030"];
const PIECE_GLOW = ["#e0c040", "#b9d3a4", "#8dff6a", "#9ad4e8", "#f0c050"];

let root: B.TransformNode | null = null;
let m3Light: B.PointLight | null = null;
let screenMesh: B.Mesh | null = null;
let tex: B.DynamicTexture | null = null;
let texCtx: CanvasRenderingContext2D | null = null;
const TEX_PX = 480;
const PAD = 8;
const CELL = (TEX_PX - PAD * 2) / M3_SIZE;

type AnimPiece = { x: number; y: number; type: number; offX: number; offY: number; alpha: number; pop: number };
let vis: AnimPiece[][] = [];
let armed: { x: number; y: number } | null = null;

const DUR = { swap: 0.14, reject: 0.1, clear: 0.22, fall: 0.2, spawn: 0.24, shuffle: 0.35 };
type AnimPhase =
  | { kind: "swap"; ax: number; ay: number; bx: number; by: number; t: number; pre: M3Board }
  | { kind: "reject"; ax: number; ay: number; bx: number; by: number; t: number; pre: M3Board }
  | { kind: "clear"; cells: { x: number; y: number }[]; t: number }
  | { kind: "fall"; moves: M3ResolveStep["fell"]; t: number }
  | { kind: "spawn"; spawns: M3ResolveStep["spawned"]; t: number };
let animPhase: AnimPhase | null = null;
let animSteps: M3ResolveStep[] = [];
let animStepIdx = 0;
let vBoard: M3Board | null = null;
let fallOff: Record<string, number> = {};
let spawnOff: Record<string, number> = {};
let pendingReshuffle = false;

let ui: HTMLElement | null = null;
let paused = false;
let quitAsk = false;
let resizeObs: (() => void) | null = null;

const reducedMotion = () => document.body.classList.contains("calm") || matchMedia("(prefers-reduced-motion: reduce)").matches;
const animMul = () => (reducedMotion() ? 0.15 : 1);

function $m(id: string) { return document.getElementById(id)!; }

function uiBlocksPlay() {
  if (!ui) return true;
  return paused || quitAsk || st.phase !== "play" || !$m("m3-overlay").classList.contains("hidden");
}

function fitMatch3Camera() {
  const eng = D.scene.getEngine();
  const aspect = eng.getRenderWidth() / Math.max(eng.getRenderHeight(), 1);
  const narrow = aspect < 0.82;
  const dist = narrow ? 2.62 : aspect > 1.45 ? 2.18 : 2.35;
  const y = narrow ? 1.06 : 1.15;
  D.cam.position.set(0, y, -dist);
  D.cam.setTarget(new B.Vector3(0, y, 0.2));
  D.cam.fov = narrow ? 0.84 : 0.75;
}

function goalsHtml(compact = false) {
  return M3_GOAL_TYPES.map((t) => {
    const n = st.collected[t] ?? 0;
    const pct = Math.min(100, Math.round((n / M3_GOAL_QTY) * 100));
    const done = n >= M3_GOAL_QTY;
    return `<div class="m3-goal m3-shape-${t}${done ? " done" : ""}" role="progressbar" aria-valuemin="0" aria-valuemax="${M3_GOAL_QTY}" aria-valuenow="${n}" aria-label="${M3_NAMES[t]}: ${n} de ${M3_GOAL_QTY}">
      <span class="m3-gicon" aria-hidden="true"></span>
      <span class="m3-gtext">${compact ? M3_NAMES[t].slice(0, 3) : M3_NAMES[t]}</span>
      <span class="m3-gbar"><i style="width:${pct}%"></i></span>
      <span class="m3-gnum">${n}/${M3_GOAL_QTY}</span>
    </div>`;
  }).join("");
}

function setTouchMatch3(on: boolean) {
  const touch = document.getElementById("touch");
  if (!touch) return;
  touch.classList.toggle("match3-only", on);
  if (on) touch.classList.remove("hidden");
  else touch.classList.add("hidden");
}

export function match3PauseToggle() {
  if (!active || st.phase !== "play" || resolving || menuScr() === "config") return;
  if (paused) {
    paused = false;
    quitAsk = false;
    $m("m3-pause").classList.remove("on");
    $m("m3-pause").setAttribute("aria-hidden", "true");
    $m("m3-confirm")?.classList.add("hidden");
  } else {
    paused = true;
    $m("m3-pause").classList.add("on");
    $m("m3-pause").setAttribute("aria-hidden", "false");
    ($m("m3-resume") as HTMLButtonElement).focus();
  }
}

function syncVisFromBoard(board: M3Board = st.board) {
  vis = [];
  for (let y = 0; y < M3_SIZE; y++) {
    const row: AnimPiece[] = [];
    for (let x = 0; x < M3_SIZE; x++) {
      const t = board[y][x];
      const k = `${x},${y}`;
      row.push({
        x, y, type: t,
        offX: 0,
        offY: fallOff[k] ?? spawnOff[k] ?? 0,
        alpha: t < 0 ? 0 : 1,
        pop: 0,
      });
    }
    vis.push(row);
  }
}

function drawPiece(c: CanvasRenderingContext2D, type: number, cx: number, cy: number, size: number, pop = 0) {
  const r = size * 0.38 * (1 + pop * 0.2);
  c.fillStyle = PIECE_COL[type] ?? "#888";
  c.strokeStyle = "#0b0d0a";
  c.lineWidth = 2;
  if (type === 0) {
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = "#2c3a28";
    c.beginPath();
    c.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
    c.fill();
  } else if (type === 1) {
    c.fillRect(cx - r, cy - r * 0.35, r * 2, r * 0.7);
    for (let i = -1; i <= 1; i++) {
      c.fillRect(cx - r * 0.15, cy - r + i * r * 0.55, r * 0.3, r * 0.25);
    }
    c.strokeRect(cx - r, cy - r * 0.35, r * 2, r * 0.7);
  } else if (type === 2) {
    c.fillStyle = PIECE_GLOW[type];
    c.fillRect(cx - r * 0.55, cy - r * 0.9, r * 1.1, r * 1.8);
    c.strokeRect(cx - r * 0.55, cy - r * 0.9, r * 1.1, r * 1.8);
    c.fillStyle = "#141813";
    c.fillRect(cx - r * 0.2, cy + r * 0.5, r * 0.4, r * 0.35);
  } else if (type === 3) {
    c.fillStyle = PIECE_COL[type];
    c.fillRect(cx - r, cy - r * 0.7, r * 2, r * 1.4);
    for (let i = 0; i < 4; i++) {
      c.fillStyle = i % 2 ? "#141813" : PIECE_GLOW[type];
      c.fillRect(cx - r + (i % 2) * r, cy - r * 0.7 + Math.floor(i / 2) * r * 0.7, r, r * 0.7);
    }
    c.strokeRect(cx - r, cy - r * 0.7, r * 2, r * 1.4);
  } else {
    c.beginPath();
    c.moveTo(cx, cy - r);
    c.lineTo(cx + r * 0.35, cy);
    c.lineTo(cx, cy + r);
    c.lineTo(cx - r * 0.35, cy);
    c.closePath();
    c.fill();
    c.stroke();
  }
}

function paintScreen() {
  if (!texCtx) return;
  const c = texCtx;
  c.fillStyle = "#10170d";
  c.fillRect(0, 0, TEX_PX, TEX_PX);
  c.strokeStyle = "#2c3a28";
  c.lineWidth = 2;
  c.strokeRect(PAD, PAD, TEX_PX - PAD * 2, TEX_PX - PAD * 2);
  const board = (animPhase?.kind === "swap" || animPhase?.kind === "reject")
    ? animPhase.pre
    : (vBoard ?? st.board);
  let swapToward = 0;
  let swapA: { ax: number; ay: number; bx: number; by: number } | null = null;
  if (animPhase?.kind === "swap" || animPhase?.kind === "reject") {
    const ph = animPhase;
    const dur = (ph.kind === "reject" ? DUR.reject * 2 : DUR.swap) * animMul();
    const raw = Math.min(1, ph.t / dur);
    swapToward = ph.kind === "reject"
      ? (raw <= 0.5 ? raw * 2 : (1 - raw) * 2)
      : raw;
    swapToward = swapToward * (2 - swapToward);
    swapA = ph;
  }
  const clearing = animPhase?.kind === "clear" ? new Set(animPhase.cells.map((c) => `${c.x},${c.y}`)) : null;
  const clearK = animPhase?.kind === "clear"
    ? Math.min(1, animPhase.t / (DUR.clear * animMul()))
    : 0;
  for (let y = 0; y < M3_SIZE; y++) {
    for (let x = 0; x < M3_SIZE; x++) {
      const p = vis[y]?.[x];
      const t = board[y]?.[x] ?? -1;
      if (!p || t < 0) continue;
      let ox = p.offX;
      let oy = p.offY;
      let alpha = p.alpha;
      let pop = p.pop;
      if (swapA && swapToward > 0) {
        if (x === swapA.ax && y === swapA.ay) {
          ox += (swapA.bx - swapA.ax) * swapToward;
          oy += (swapA.by - swapA.ay) * swapToward;
        } else if (x === swapA.bx && y === swapA.by) {
          ox += (swapA.ax - swapA.bx) * swapToward;
          oy += (swapA.ay - swapA.by) * swapToward;
        }
      }
      if (clearing?.has(`${x},${y}`)) {
        alpha = 1 - clearK;
        pop = clearK * 0.45;
      }
      if (alpha <= 0.02) continue;
      const cx = PAD + (x + 0.5 + ox) * CELL;
      const cy = PAD + (y + 0.5 + oy) * CELL;
      c.globalAlpha = alpha;
      drawPiece(c, p.type, cx, cy, CELL, pop);
      const pick = (sel && sel.x === x && sel.y === y) || (armed && armed.x === x && armed.y === y);
      if (pick && st.phase === "play" && !resolving) {
        c.strokeStyle = armed && armed.x === x && armed.y === y ? "#e0a030" : "#8dff6a";
        c.lineWidth = 3;
        c.strokeRect(cx - CELL * 0.5 + 2, cy - CELL * 0.5 + 2, CELL - 4, CELL - 4);
      }
      c.globalAlpha = 1;
    }
  }
  if (!reducedMotion()) {
    c.fillStyle = "rgba(141, 255, 106, 0.03)";
    for (let i = 0; i < TEX_PX; i += 4) c.fillRect(0, i, TEX_PX, 1);
  }
  tex?.update();
}

function needsExitConfirm() {
  return st.phase === "play" && (st.movesLeft < M3_MOVES || M3_GOAL_TYPES.some((t) => (st.collected[t] ?? 0) > 0));
}

function showExitConfirm(then: () => void) {
  quitAsk = true;
  const box = $m("m3-confirm");
  box.classList.remove("hidden");
  box.setAttribute("aria-hidden", "false");
  const yes = $m("m3-confirm-yes");
  const no = $m("m3-confirm-no");
  const close = () => {
    quitAsk = false;
    box.classList.add("hidden");
    box.setAttribute("aria-hidden", "true");
    yes.onclick = null;
    no.onclick = null;
  };
  yes.onclick = () => { close(); then(); };
  no.onclick = () => { close(); (paused ? $m("m3-resume") : $m("m3-play"))?.focus(); };
  no.focus();
}

function requestExit() {
  const go = () => exitMatch3();
  if (needsExitConfirm()) showExitConfirm(go);
  else go();
}

function syncHud() {
  if (!ui) return;
  const hud = $m("m3-hud");
  const movesWarn = st.movesLeft <= 3 && st.phase === "play";
  hud.innerHTML = `<span class="m3-moves${movesWarn ? " low" : ""}">Movimientos <b>${st.movesLeft}</b></span><div class="m3-goals-row">${goalsHtml(true)}</div>`;
  const hint = $m("m3-hint");
  hint.classList.toggle("hidden", st.phase !== "play" || resolving);
  const ov = $m("m3-overlay");
  const panel = $m("m3-panel");
  ui.classList.toggle("m3-playing", st.phase === "play" && !paused);
  if (st.phase === "ready") {
    ov.classList.remove("hidden");
    panel.innerHTML = `<p class="m3-title">CHATARRA ALINEADA</p><div class="m3-goals-vis">${goalsHtml(false)}</div><p class="m3-meta">${M3_MOVES} movimientos · sin obstáculos</p><p class="m3-instr">Cada pieza del pedido tiene forma distinta. Tocar o arrastrar entre vecinas; sin match de 3, el movimiento se revierte.</p><div class="m3-btns"><button type="button" class="primary" id="m3-play">Jugar</button><button type="button" id="m3-menu">Menú</button></div>`;
    $m("m3-play").onclick = () => { startPlay(st); ov.classList.add("hidden"); SFX.accept(); };
    $m("m3-menu").onclick = () => requestExit();
    $m("m3-play").focus();
  } else if (st.phase === "win") {
    paused = false;
    $m("m3-pause").classList.remove("on");
    ov.classList.remove("hidden");
    panel.innerHTML = `<p class="m3-title">MESA COMPLETA</p><div class="m3-goals-vis">${goalsHtml(false)}</div><div class="m3-btns"><button type="button" class="primary" id="m3-retry">Jugar de nuevo</button><button type="button" id="m3-exit">Volver</button></div>`;
    $m("m3-retry").onclick = () => { resetMatch3(st); syncVisFromBoard(); syncHud(); paintScreen(); SFX.accept(); };
    $m("m3-exit").onclick = () => exitMatch3();
    ($m("m3-retry") as HTMLButtonElement).focus();
    SFX.finish();
  } else if (st.phase === "lose") {
    paused = false;
    $m("m3-pause").classList.remove("on");
    ov.classList.remove("hidden");
    panel.innerHTML = `<p class="m3-title">SIN MOVIMIENTOS</p><p class="m3-sub">Se agotaron los movimientos antes de completar el pedido.</p><div class="m3-goals-vis">${goalsHtml(false)}</div><div class="m3-btns"><button type="button" class="primary" id="m3-retry">Reintentar</button><button type="button" id="m3-exit">Volver</button></div>`;
    $m("m3-retry").onclick = () => { resetMatch3(st); syncVisFromBoard(); syncHud(); paintScreen(); SFX.accept(); };
    $m("m3-exit").onclick = () => exitMatch3();
    ($m("m3-retry") as HTMLButtonElement).focus();
  } else {
    ov.classList.add("hidden");
  }
}

function ensureUi() {
  if (ui) return;
  ui = document.createElement("div");
  ui.id = "match3-ui";
  ui.innerHTML = `<div class="m3-hud" id="m3-hud" aria-live="polite"></div><div class="m3-hint" id="m3-hint">Intercambiar piezas vecinas y juntar 3 iguales</div>
<div class="m3-overlay hidden" id="m3-overlay"><div class="m3-panel" id="m3-panel"></div></div>
<div class="m3-pause" id="m3-pause" role="dialog" aria-modal="true" aria-labelledby="m3-pause-t" aria-hidden="true">
<p class="m3-title" id="m3-pause-t">PAUSA</p><div class="m3-btns">
<button type="button" class="primary" id="m3-resume">Reanudar</button><button type="button" id="m3-pause-restart">Reiniciar</button><button type="button" id="m3-config">Opciones</button><button type="button" id="m3-quit">Abandonar</button></div></div>
<div class="m3-confirm hidden" id="m3-confirm" role="alertdialog" aria-labelledby="m3-confirm-t" aria-hidden="true"><div class="m3-panel m3-confirm-box">
<p class="m3-title" id="m3-confirm-t">¿Abandonar partida?</p><p class="m3-sub">El progreso de este intento no se guarda.</p>
<div class="m3-btns"><button type="button" id="m3-confirm-no">Seguir jugando</button><button type="button" class="primary" id="m3-confirm-yes">Abandonar</button></div></div></div>`;
  document.body.appendChild(ui);
  $m("m3-resume").onclick = () => match3PauseToggle();
  $m("m3-pause-restart").onclick = () => {
    const restart = () => { resetMatch3(st); paused = false; $m("m3-pause").classList.remove("on"); syncVisFromBoard(); syncHud(); paintScreen(); SFX.accept(); };
    if (needsExitConfirm()) showExitConfirm(restart);
    else restart();
  };
  $m("m3-config").onclick = () => { if (active) openM3Config(); };
  $m("m3-quit").onclick = () => requestExit();
  document.getElementById("tPause")?.addEventListener("click", () => {
    if (!active || st.phase !== "play" || resolving) return;
    match3PauseToggle();
  }, true);
}

function buildCabinet() {
  disposeCabinet();
  root = new B.TransformNode("m3root", D.scene);
  const body = B.MeshBuilder.CreateBox("m3body", { width: 1.05, height: 1.85, depth: 0.72 }, D.scene);
  body.parent = root;
  body.position.y = 0.95;
  body.material = M.metal("#3a3f38");
  const panel = B.MeshBuilder.CreateBox("m3panel", { width: 0.92, height: 0.62, depth: 0.04 }, D.scene);
  panel.parent = root;
  panel.position.set(0, 1.22, 0.34);
  panel.material = pbr("m3scr", { color: "#0a0c08", rough: 0.9, emissive: "#1a2218" });
  tex = new B.DynamicTexture("m3tex", TEX_PX, D.scene, false);
  tex.hasAlpha = false;
  (panel.material as B.PBRMaterial).albedoTexture = tex;
  texCtx = tex.getContext() as unknown as CanvasRenderingContext2D;
  screenMesh = panel;
  const marquee = B.MeshBuilder.CreateBox("m3marq", { width: 0.7, height: 0.12, depth: 0.06 }, D.scene);
  marquee.parent = root;
  marquee.position.set(0, 1.58, 0.38);
  marquee.material = pbr("m3mq", { color: "#1a1510", emissive: "#806018" });
  const legL = B.MeshBuilder.CreateBox("m3leg", { width: 0.08, height: 0.5, depth: 0.08 }, D.scene);
  legL.parent = root;
  legL.position.set(-0.35, 0.25, 0.2);
  legL.material = M.metal("#2a2e28");
  const legR = legL.clone("m3legR");
  legR.parent = root;
  legR.position.x = 0.35;
  const floor = B.MeshBuilder.CreateGround("m3floor", { width: 6, height: 6 }, D.scene);
  floor.parent = root;
  floor.position.y = 0;
  floor.material = pbr("m3fl", { color: "#1a1c18", rough: 0.95 });
  root.position.set(0, 0, 0);
  m3Light = new B.PointLight("m3lamp", new B.Vector3(0.2, 1.45, -0.8), D.scene);
  m3Light.intensity = 1.35;
  m3Light.diffuse = new B.Color3(0.92, 0.88, 0.72);
  m3Light.specular = new B.Color3(0.3, 0.35, 0.28);
}

function disposeCabinet() {
  m3Light?.dispose();
  m3Light = null;
  if (root) {
    root.getChildMeshes().forEach((m) => m.dispose());
    root.dispose();
  }
  tex?.dispose();
  root = null;
  screenMesh = null;
  tex = null;
  texCtx = null;
}

function cellFromPick(px: number, py: number): { x: number; y: number } | null {
  if (!screenMesh) return null;
  const pick = D.scene.pick(px, py, (m) => m === screenMesh);
  if (!pick?.hit || !pick.getTextureCoordinates) return null;
  const uv = pick.getTextureCoordinates();
  if (!uv) return null;
  const u = uv.x;
  const v = 1 - uv.y;
  const gx = (u * TEX_PX - PAD) / CELL;
  const gy = (v * TEX_PX - PAD) / CELL;
  const x = Math.floor(gx);
  const y = Math.floor(gy);
  if (x < 0 || x >= M3_SIZE || y < 0 || y >= M3_SIZE) return null;
  return { x, y };
}

function applyStepClear(b: M3Board, step: M3ResolveStep) {
  for (const c of step.cleared) b[c.y][c.x] = -1;
}

function applyStepFall(b: M3Board, step: M3ResolveStep) {
  for (const f of step.fell) {
    b[f.fromY][f.x] = -1;
    b[f.toY][f.x] = f.type;
  }
}

function applyStepSpawn(b: M3Board, step: M3ResolveStep) {
  for (const s of step.spawned) b[s.y][s.x] = s.type;
}

function beginStepClear() {
  const step = animSteps[animStepIdx];
  if (!step) return finishResolveAnim();
  animPhase = { kind: "clear", cells: step.cleared.map((c) => ({ x: c.x, y: c.y })), t: 0 };
  SFX.m3Clear();
}

function beginStepFall(step: M3ResolveStep) {
  fallOff = {};
  for (const f of step.fell) {
    const k = `${f.x},${f.toY}`;
    fallOff[k] = f.fromY - f.toY;
  }
  applyStepFall(vBoard!, step);
  syncVisFromBoard(vBoard!);
  animPhase = { kind: "fall", moves: step.fell, t: 0 };
}

function beginStepSpawn(step: M3ResolveStep) {
  spawnOff = {};
  for (const s of step.spawned) {
    const k = `${s.x},${s.y}`;
    spawnOff[k] = -(s.y + 1);
  }
  applyStepSpawn(vBoard!, step);
  syncVisFromBoard(vBoard!);
  animPhase = { kind: "spawn", spawns: step.spawned, t: 0 };
}

function finishResolveAnim() {
  animPhase = null;
  animSteps = [];
  animStepIdx = 0;
  vBoard = null;
  fallOff = {};
  spawnOff = {};
  resolving = false;
  syncVisFromBoard();
  syncHud();
  if (pendingReshuffle) {
    pendingReshuffle = false;
    SFX.m3Swap();
  }
  paintScreen();
}

function startResolveAnim(ax: number, ay: number, bx: number, by: number, pre: M3Board, steps: M3ResolveStep[], reshuffled: boolean) {
  pendingReshuffle = reshuffled;
  animSteps = steps;
  animStepIdx = 0;
  resolving = true;
  vBoard = cloneBoard(pre);
  swapCells(vBoard, ax, ay, bx, by);
  animPhase = { kind: "swap", ax, ay, bx, by, t: 0, pre: cloneBoard(pre) };
  syncVisFromBoard(animPhase.pre);
  paintScreen();
}

function startRejectAnim(ax: number, ay: number, bx: number, by: number, pre: M3Board) {
  resolving = true;
  animPhase = { kind: "reject", ax, ay, bx, by, t: 0, pre: cloneBoard(pre) };
  syncVisFromBoard(pre);
  paintScreen();
}

function tickAnim(dt: number) {
  if (!animPhase) return;
  animPhase.t += dt;
  const m = animMul();
  if (animPhase.kind === "swap") {
    if (animPhase.t >= DUR.swap * m) {
      syncVisFromBoard(vBoard!);
      if (animSteps.length) beginStepClear();
      else finishResolveAnim();
    }
    paintScreen();
    return;
  }
  if (animPhase.kind === "reject") {
    if (animPhase.t >= DUR.reject * 2 * m) {
      resolving = false;
      animPhase = null;
      syncVisFromBoard();
    }
    paintScreen();
    return;
  }
  if (animPhase.kind === "clear") {
    const dur = DUR.clear * m;
    if (animPhase.t >= dur) {
      const step = animSteps[animStepIdx];
      applyStepClear(vBoard!, step);
      syncVisFromBoard(vBoard!);
      if (step.fell.length) beginStepFall(step);
      else if (step.spawned.length) beginStepSpawn(step);
      else advanceCascadeStep();
    }
    paintScreen();
    return;
  }
  if (animPhase.kind === "fall") {
    const dur = DUR.fall * m;
    const k = Math.min(1, animPhase.t / dur);
    const ease = 1 - (1 - k) ** 2;
    for (const f of animPhase.moves) {
      const key = `${f.x},${f.toY}`;
      fallOff[key] = (f.fromY - f.toY) * (1 - ease);
    }
    syncVisFromBoard(vBoard!);
    if (k >= 1) {
      fallOff = {};
      const step = animSteps[animStepIdx];
      if (step.spawned.length) beginStepSpawn(step);
      else advanceCascadeStep();
    }
    paintScreen();
    return;
  }
  if (animPhase.kind === "spawn") {
    const dur = DUR.spawn * m;
    const k = Math.min(1, animPhase.t / dur);
    const ease = 1 - (1 - k) ** 2;
    for (const s of animPhase.spawns) {
      const key = `${s.x},${s.y}`;
      spawnOff[key] = -(s.y + 1) * (1 - ease);
    }
    syncVisFromBoard(vBoard!);
    if (k >= 1) {
      spawnOff = {};
      advanceCascadeStep();
    }
    paintScreen();
  }
}

function advanceCascadeStep() {
  animStepIdx++;
  if (animStepIdx < animSteps.length) beginStepClear();
  else finishResolveAnim();
}

function attemptSwap(ax: number, ay: number, bx: number, by: number) {
  if (resolving || uiBlocksPlay()) return;
  const pre = cloneBoard(st.board);
  const r = trySwap(st, ax, ay, bx, by, rng);
  if (!r.ok) {
    if (r.reason === "no_match") {
      SFX.duelFabReject();
      if (!reducedMotion()) startRejectAnim(ax, ay, bx, by, pre);
    }
    return;
  }
  SFX.m3Swap();
  sel = null;
  armed = null;
  syncHud();
  if (reducedMotion()) {
    syncVisFromBoard();
    paintScreen();
    return;
  }
  startResolveAnim(ax, ay, bx, by, pre, r.steps, r.reshuffled);
}

function onPointerDown(e: PointerEvent) {
  if (!active || uiBlocksPlay() || resolving) return;
  const rect = (D.scene.getEngine().getRenderingCanvas() as HTMLCanvasElement).getBoundingClientRect();
  const c = cellFromPick(e.clientX - rect.left, e.clientY - rect.top);
  if (!c) return;
  e.preventDefault();
  dragFrom = c;
  sel = c;
  paintScreen();
}

function onPointerUp(e: PointerEvent) {
  if (!dragFrom || !active) return;
  const rect = (D.scene.getEngine().getRenderingCanvas() as HTMLCanvasElement).getBoundingClientRect();
  const c = cellFromPick(e.clientX - rect.left, e.clientY - rect.top) ?? dragFrom;
  const f = dragFrom;
  dragFrom = null;
  if (c.x === f.x && c.y === f.y) return;
  if (Math.abs(c.x - f.x) + Math.abs(c.y - f.y) === 1) attemptSwap(f.x, f.y, c.x, c.y);
  else sel = c;
  paintScreen();
}

function onKey(e: KeyboardEvent) {
  if (!active || e.repeat) return;
  if (menuScr() === "config") return;
  if (quitAsk && !$m("m3-confirm").classList.contains("hidden")) {
    if (e.code === "Escape") { e.preventDefault(); $m("m3-confirm-no").click(); }
    return;
  }
  if (e.code === "Escape") {
    e.preventDefault();
    if (paused) { match3PauseToggle(); return; }
    if (st.phase === "play" && !resolving) match3PauseToggle();
    else if (st.phase === "ready") requestExit();
    else if (st.phase === "win" || st.phase === "lose") exitMatch3();
    return;
  }
  if (st.phase === "play" && !resolving && !uiBlocksPlay()) {
    if (e.code === "Enter" || e.code === "Space") {
      if (!sel) sel = { x: 0, y: 0 };
      e.preventDefault();
      if (!armed) { armed = { ...sel }; paintScreen(); return; }
      if (armed.x === sel.x && armed.y === sel.y) { armed = null; sel = null; paintScreen(); return; }
      attemptSwap(armed.x, armed.y, sel.x, sel.y);
      armed = null;
      return;
    }
    if (!sel) sel = { x: 0, y: 0 };
    let nx = sel.x;
    let ny = sel.y;
    if (e.code === "ArrowLeft") nx--;
    else if (e.code === "ArrowRight") nx++;
    else if (e.code === "ArrowUp") ny--;
    else if (e.code === "ArrowDown") ny++;
    else return;
    e.preventDefault();
    if (nx < 0 || nx >= M3_SIZE || ny < 0 || ny >= M3_SIZE) return;
    sel = { x: nx, y: ny };
    paintScreen();
  }
}

export function initMatch3(d: Deps) {
  D = d;
  ensureUi();
}

export function match3Active() { return active; }

export function startMatch3(seed = 20261007) {
  ensureUi();
  buildCabinet();
  st = newMatch3(seed);
  rng = m3Rng(st.seed);
  syncVisFromBoard();
  active = true;
  paused = false;
  resolving = false;
  sel = null;
  ui!.classList.add("on");
  syncHud();
  paintScreen();
  applyClimate(DUSK);
  setDark(0.48);
  fitMatch3Camera();
  document.body.classList.add("match3-play");
  setTouchMatch3(true);
  music("menu");
  const canvas = D.scene.getEngine().getRenderingCanvas() as HTMLCanvasElement;
  canvas.style.touchAction = "none";
  canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
  canvas.addEventListener("pointerup", onPointerUp, { passive: false });
  canvas.addEventListener("pointercancel", () => { dragFrom = null; });
  addEventListener("keydown", onKey);
  resizeObs = () => fitMatch3Camera();
  addEventListener("resize", resizeObs);
}

export function exitMatch3() {
  if (!active) return;
  active = false;
  paused = false;
  quitAsk = false;
  resolving = false;
  animPhase = null;
  vBoard = null;
  ui?.classList.remove("on", "m3-playing");
  $m("m3-pause")?.classList.remove("on");
  $m("m3-confirm")?.classList.add("hidden");
  document.body.classList.remove("match3-play");
  setTouchMatch3(false);
  if (resizeObs) { removeEventListener("resize", resizeObs); resizeObs = null; }
  disposeCabinet();
  const canvas = D.scene.getEngine().getRenderingCanvas() as HTMLCanvasElement;
  canvas.style.touchAction = "";
  canvas.removeEventListener("pointerdown", onPointerDown);
  canvas.removeEventListener("pointerup", onPointerUp);
  removeEventListener("keydown", onKey);
  D.onExit();
}

export function match3Tick(dt: number) {
  if (!active) return;
  tickAnim(dt);
}

export const match3Dev = {
  info: () => (st ? { phase: st.phase, moves: st.movesLeft, collected: st.collected, seed: st.seed } : { phase: "off" }),
  setPhase: (p: "win" | "lose") => {
    if (!st) return;
    startPlay(st);
    st.phase = p;
    syncHud();
    paintScreen();
  },
  start: () => startPlay(st),
  swap: (ax: number, ay: number, bx: number, by: number) => {
    if (!st) return null;
    startPlay(st);
    const r = trySwap(st, ax, ay, bx, by, rng);
    if (r.ok) syncVisFromBoard();
    syncHud();
    paintScreen();
    return r;
  },
  ready: () => {
    syncHud();
    paintScreen();
  },
};
