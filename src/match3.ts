// Modo arcade: match-3 dentro de la pantalla de un gabinete de chapa (diorama en match3_scene.ts). Lógica 2D pura en match3_logic.ts.
import * as B from "@babylonjs/core";
import "./match3.css";
import { current as menuScr, openM3Config } from "./menu";
import { applyClimate, setDark } from "./render";
import { buildArcade, M3C, type Arcade } from "./match3_scene";
import { music, SFX } from "./sfx";
import { DUSK } from "./run";
import {
  M3_GOAL_QTY,
  M3_GOAL_TYPES,
  M3_MOVES,
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
let dragPx = { x: 0, y: 0 };

// Cinco familias: forma + color (se distinguen sin color). Nombres de presentación; la lógica solo conoce el número de tipo.
const NAMES = ["Tuerca", "Cristal", "Batería", "Chip", "Componente"];
const PIECE_COL = [M3C.amarillo, M3C.rojo, M3C.verde, M3C.azul, M3C.texto2];

let arcade: Arcade | null = null;
let tex: B.DynamicTexture | null = null;
let texCtx: CanvasRenderingContext2D | null = null;
let dispTex: B.DynamicTexture | null = null;
let dispCtx: CanvasRenderingContext2D | null = null;
let scrMat: B.PBRMaterial | null = null;
let dispMat: B.PBRMaterial | null = null;
const TEX_PX = 512;
const PAD = 10;
const CELL = (TEX_PX - PAD * 2) / M3_SIZE;
const DISP_W = 512, DISP_H = 106;

type AnimPiece = { x: number; y: number; type: number; offX: number; offY: number; alpha: number; pop: number };
let vis: AnimPiece[][] = [];
let armed: { x: number; y: number } | null = null;
let banner = 0; // segundos que queda el aviso de tablero reorganizado

const DUR = { swap: 0.14, reject: 0.26, clear: 0.26, fall: 0.2, spawn: 0.24 };
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

// Cámara fija de persona parada frente a la máquina. Encaja display + pantalla (nunca se recortan);
// en compu se aleja para mostrar el taller y se corre a la derecha para ver el lateral; en celular se acerca.
function fitMatch3Camera() {
  if (!arcade) return;
  const eng = D.scene.getEngine();
  const w = eng.getRenderWidth(), h = Math.max(eng.getRenderHeight(), 1), aspect = w / h;
  const roomy = aspect > 1.2 && h > 520; // compu / notebook
  const fov = roomy ? 0.68 : 0.62;
  const t = Math.tan(fov / 2);
  const target = arcade.mustSee.reduce((a, v) => a.add(v), B.Vector3.Zero()).scale(1 / arcade.mustSee.length);
  // el panel de control (bocha del joystick) entra en el encuadre: queda abajo, debajo del tablero
  const knob = arcade.stickPick[1].getAbsolutePosition();
  const xs = arcade.mustSee.map((v) => v.x), ys = [...arcade.mustSee.map((v) => v.y), knob.y - 0.03];
  target.y = (Math.max(...ys) + Math.min(...ys)) / 2;
  const needW = Math.max(...xs) - Math.min(...xs) + (aspect < 0.8 ? 0.06 : 0.14), needH = Math.max(...ys) - Math.min(...ys) + 0.12;
  let dist = Math.max(needH / (2 * t), needW / (2 * t * aspect));
  if (roomy) { dist = Math.max(dist, 1.05 / (2 * t)); target.y += 0.06; }
  const sideX = roomy ? Math.min(0.55, dist * 0.32) : aspect > 1 ? 0.2 : 0.08;
  D.cam.fov = fov;
  D.cam.minZ = 0.05;
  D.cam.position.set(sideX, target.y + 0.18, target.z - dist);
  D.cam.setTarget(target);
}

function goalsHtml(compact = false) {
  return M3_GOAL_TYPES.map((t) => {
    const n = st.collected[t] ?? 0;
    const pct = Math.min(100, Math.round((n / M3_GOAL_QTY) * 100));
    const done = n >= M3_GOAL_QTY;
    return `<div class="m3-goal m3-shape-${t}${done ? " done" : ""}" role="progressbar" aria-valuemin="0" aria-valuemax="${M3_GOAL_QTY}" aria-valuenow="${n}" aria-label="${NAMES[t]}: ${n} de ${M3_GOAL_QTY}">
      <span class="m3-gicon" aria-hidden="true"></span>
      <span class="m3-gtext">${NAMES[t]}</span>
      <span class="m3-gbar"><i style="width:${pct}%"></i></span>
      <span class="m3-gnum">${n}/${M3_GOAL_QTY}</span>
    </div>`;
  }).join("");
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

const poly = (c: CanvasRenderingContext2D, pts: number[][]) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
/** Degradé de arriba-izquierda (luz) a abajo-derecha (sombra): volumen simple a partir de un color. */
function shade(c: CanvasRenderingContext2D, col: string, cx: number, cy: number, r: number, k = 1) {
  const g = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  const base = B.Color3.FromHexString(col);
  g.addColorStop(0, B.Color3.Lerp(base, B.Color3.White(), 0.45 * k).toHexString());
  g.addColorStop(0.5, col);
  g.addColorStop(1, base.scale(0.55).toHexString());
  return g;
}

/** Pieza con volumen simple (≈60 % de la celda). `lift` la eleva (sombra más larga), `glow` la ilumina antes de desaparecer. */
function drawPiece(c: CanvasRenderingContext2D, type: number, cx: number, cy: number, size: number, scale = 1, lift = 0, glow = 0) {
  const r = size * 0.37 * scale;
  if (r < 1) return;
  const col = PIECE_COL[type] ?? "#888";
  const ink = "#0B0F14";
  // sombra en el fondo del socket
  c.fillStyle = "rgba(0,0,0,0.5)";
  c.beginPath(); c.ellipse(cx + r * 0.12 + lift * 3, cy + r * 0.2 + lift * 5, r * 0.95, r * 0.95, 0, 0, Math.PI * 2); c.fill();
  cy -= lift * 4;
  if (glow > 0) { c.shadowColor = M3C.amarilloClaro; c.shadowBlur = 14 * glow; }
  c.lineWidth = 2.5; c.strokeStyle = ink; c.lineJoin = "round";
  if (type === 0) { // tuerca hexagonal con agujero
    const hex = (rr: number) => Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });
    poly(c, hex(r)); c.fillStyle = shade(c, col, cx, cy, r); c.fill(); c.stroke();
    c.shadowBlur = 0;
    poly(c, hex(r * 0.72)); c.strokeStyle = "rgba(255,255,255,0.25)"; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = "#2a1c05"; c.beginPath(); c.arc(cx, cy, r * 0.36, 0, Math.PI * 2); c.fill();
    c.strokeStyle = ink; c.lineWidth = 2; c.stroke();
  } else if (type === 1) { // cristal: rombo vertical facetado
    const w = r * 0.68;
    poly(c, [[cx, cy - r * 1.08], [cx + w, cy], [cx, cy + r * 1.08], [cx - w, cy]]); c.fillStyle = col; c.fill(); c.stroke();
    c.shadowBlur = 0;
    c.fillStyle = "rgba(255,255,255,0.35)"; poly(c, [[cx, cy - r * 1.08], [cx - w, cy], [cx, cy]]); c.fill();
    c.fillStyle = "rgba(0,0,0,0.3)"; poly(c, [[cx, cy + r * 1.08], [cx + w, cy], [cx, cy]]); c.fill();
    c.fillStyle = "rgba(255,255,255,0.7)"; poly(c, [[cx - w * 0.45, cy - r * 0.25], [cx - w * 0.2, cy - r * 0.6], [cx - w * 0.1, cy - r * 0.45]]); c.fill();
  } else if (type === 2) { // batería vertical con borne y rayo
    const w = r * 0.62, hh = r * 0.98;
    c.fillStyle = "#9CA3AF"; c.fillRect(cx - w * 0.35, cy - hh - r * 0.18, w * 0.7, r * 0.2); c.strokeRect(cx - w * 0.35, cy - hh - r * 0.18, w * 0.7, r * 0.2);
    c.beginPath(); c.roundRect(cx - w, cy - hh, w * 2, hh * 2, w * 0.3); c.fillStyle = shade(c, col, cx, cy, r); c.fill(); c.stroke();
    c.shadowBlur = 0;
    c.fillStyle = "rgba(0,0,0,0.35)"; c.fillRect(cx - w + 2, cy + hh * 0.55, w * 2 - 4, hh * 0.3);
    c.fillStyle = M3C.amarilloClaro; poly(c, [[cx + w * 0.15, cy - hh * 0.6], [cx - w * 0.45, cy + hh * 0.08], [cx - w * 0.02, cy + hh * 0.08], [cx - w * 0.2, cy + hh * 0.55], [cx + w * 0.45, cy - hh * 0.12], [cx + w * 0.02, cy - hh * 0.12]]); c.fill();
    c.lineWidth = 1.2; c.stroke();
  } else if (type === 3) { // chip cuadrado con patas
    const q = r * 0.78;
    c.fillStyle = "#9CA3AF";
    for (let i = -1; i <= 1; i++) for (const s of [-1, 1]) { c.fillRect(cx + i * q * 0.55 - 2.5, cy + s * q - (s < 0 ? r * 0.28 : 0), 5, r * 0.28); c.fillRect(cx + s * q - (s < 0 ? r * 0.28 : 0), cy + i * q * 0.55 - 2.5, r * 0.28, 5); }
    c.beginPath(); c.roundRect(cx - q, cy - q, q * 2, q * 2, 4); c.fillStyle = shade(c, col, cx, cy, r); c.fill(); c.stroke();
    c.shadowBlur = 0;
    c.fillStyle = M3C.cian; c.globalAlpha *= 0.85; c.fillRect(cx - q * 0.5, cy - q * 0.5, q, q); c.globalAlpha /= 0.85;
    c.strokeStyle = "rgba(11,15,20,0.6)"; c.lineWidth = 1.5; c.strokeRect(cx - q * 0.5, cy - q * 0.5, q, q);
  } else { // componente horizontal con dos tornillos
    const w = r * 1.05, hh = r * 0.62;
    c.fillStyle = "#4b5563"; c.fillRect(cx - w * 0.5, cy - hh - r * 0.16, w * 0.3, r * 0.18); c.fillRect(cx + w * 0.2, cy - hh - r * 0.16, w * 0.3, r * 0.18);
    c.beginPath(); c.roundRect(cx - w, cy - hh, w * 2, hh * 2, hh * 0.35); c.fillStyle = shade(c, col, cx, cy, r); c.fill(); c.stroke();
    c.shadowBlur = 0;
    c.fillStyle = "#374151"; c.fillRect(cx - w * 0.45, cy - hh * 0.45, w * 0.9, hh * 0.9);
    for (const s of [-1, 1]) { c.fillStyle = "#e5e7eb"; c.beginPath(); c.arc(cx + s * w * 0.72, cy, r * 0.15, 0, Math.PI * 2); c.fill(); c.stroke(); }
  }
  c.shadowBlur = 0;
}

/** Socket físico: hueco oscuro con borde sutil, sombra interna arriba y tornillito en la esquina. `light` = estado (selección/válido/inválido/match). */
function drawSocket(c: CanvasRenderingContext2D, x: number, y: number, light: string | null) {
  const px = PAD + x * CELL, py = PAD + y * CELL, g = 3;
  c.fillStyle = "#0B0F14"; c.fillRect(px, py, CELL, CELL);
  c.fillStyle = M3C.fondo2; c.beginPath(); c.roundRect(px + g, py + g, CELL - g * 2, CELL - g * 2, 6); c.fill();
  c.fillStyle = "rgba(0,0,0,0.55)"; c.fillRect(px + g + 2, py + g + 1, CELL - g * 2 - 4, 6);              // sombra interna del borde superior
  c.fillStyle = "rgba(255,255,255,0.05)"; c.fillRect(px + g + 2, py + CELL - g - 3, CELL - g * 2 - 4, 2);   // canto inferior que recibe luz
  c.strokeStyle = M3C.panel; c.lineWidth = 1.5; c.beginPath(); c.roundRect(px + g, py + g, CELL - g * 2, CELL - g * 2, 6); c.stroke();
  if (light) {
    c.save(); c.shadowColor = light; c.shadowBlur = 10; c.strokeStyle = light; c.lineWidth = 3.5;
    c.beginPath(); c.roundRect(px + g + 1, py + g + 1, CELL - g * 2 - 2, CELL - g * 2 - 2, 6); c.stroke(); c.restore();
  }
}

function paintScreen() {
  if (!texCtx) return;
  const c = texCtx;
  c.fillStyle = "#06090c";
  c.fillRect(0, 0, TEX_PX, TEX_PX);
  const board = (animPhase?.kind === "swap" || animPhase?.kind === "reject") ? animPhase.pre : (vBoard ?? st.board);
  const ph = animPhase;
  const swapK = ph?.kind === "swap" ? (() => { const k = Math.min(1, ph.t / (DUR.swap * animMul())); return k * (2 - k); })() : 0;
  const rejK = ph?.kind === "reject" ? Math.min(1, ph.t / (DUR.reject * animMul())) : 0;
  const clearing = ph?.kind === "clear" ? new Set(ph.cells.map((q) => `${q.x},${q.y}`)) : null;
  const clearK = ph?.kind === "clear" ? Math.min(1, ph.t / (DUR.clear * animMul())) : 0;
  const isAt = (p: { x: number; y: number } | null, x: number, y: number) => !!p && p.x === x && p.y === y;
  const playing = st.phase === "play" && !uiBlocksPlay();
  // 1) sockets con su luz de estado
  for (let y = 0; y < M3_SIZE; y++) for (let x = 0; x < M3_SIZE; x++) {
    let light: string | null = null;
    if (ph && (ph.kind === "swap" || ph.kind === "reject") && ((x === ph.ax && y === ph.ay) || (x === ph.bx && y === ph.by))) light = ph.kind === "swap" ? M3C.exito : M3C.error;
    else if (clearing?.has(`${x},${y}`)) light = M3C.amarilloClaro;
    else if (playing && !resolving && isAt(armed, x, y)) light = M3C.amarillo;
    else if (playing && !resolving && isAt(sel, x, y)) light = M3C.cian;
    drawSocket(c, x, y, light);
  }
  // 2) piezas encastradas
  for (let y = 0; y < M3_SIZE; y++) for (let x = 0; x < M3_SIZE; x++) {
    const p = vis[y]?.[x];
    const t = board[y]?.[x] ?? -1;
    if (!p || t < 0) continue;
    let ox = p.offX, oy = p.offY, scale = 1, glow = 0, lift = 0;
    if (ph && (ph.kind === "swap" || ph.kind === "reject")) {
      const isA = x === ph.ax && y === ph.ay, isB = x === ph.bx && y === ph.by;
      if (isA || isB) {
        const dx = isA ? ph.bx - ph.ax : ph.ax - ph.bx, dy = isA ? ph.by - ph.ay : ph.ay - ph.by;
        if (ph.kind === "swap") { ox += dx * swapK; oy += dy * swapK; lift = Math.sin(swapK * Math.PI); }
        else { const amp = 0.14 * (1 - rejK); const w = Math.sin(rejK * Math.PI * 6) * amp; ox += dx * 0.22 * Math.sin(rejK * Math.PI) + (dy ? w : 0); oy += dy * 0.22 * Math.sin(rejK * Math.PI) + (dx ? w : 0); }
      }
    }
    if (clearing?.has(`${x},${y}`)) {
      // brillo → encoger → desaparecer
      if (clearK < 0.35) { glow = clearK / 0.35; scale = 1 + glow * 0.12; }
      else { glow = 1; scale = 1.12 * (1 - (clearK - 0.35) / 0.65); }
    }
    if (playing && !resolving && (isAt(sel, x, y) || isAt(armed, x, y))) lift = 1;
    if (scale <= 0.02) continue;
    c.globalAlpha = p.alpha;
    drawPiece(c, p.type, PAD + (x + 0.5 + ox) * CELL, PAD + (y + 0.5 + oy) * CELL, CELL, scale, lift, glow);
    c.globalAlpha = 1;
  }
  if (banner > 0) {
    c.fillStyle = "rgba(11,15,20,0.85)"; c.fillRect(0, TEX_PX / 2 - 34, TEX_PX, 68);
    c.fillStyle = M3C.amarillo; c.font = "700 40px Rajdhani, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("SIN JUGADAS: REORGANIZANDO", TEX_PX / 2, TEX_PX / 2 + 2);
  }
  // CRT muy sutil: líneas quietas y viñeta en las esquinas (sin deformar ni parpadear)
  c.fillStyle = "rgba(0,0,0,0.12)";
  for (let i = 0; i < TEX_PX; i += 3) c.fillRect(0, i, TEX_PX, 1);
  const v = c.createRadialGradient(TEX_PX / 2, TEX_PX / 2, TEX_PX * 0.45, TEX_PX / 2, TEX_PX / 2, TEX_PX * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.35)");
  c.fillStyle = v; c.fillRect(0, 0, TEX_PX, TEX_PX);
  tex?.update();
}

/** Display montado sobre la pantalla: contador de movimientos (izquierda) y objetivo (derecha). */
function paintDisplay() {
  if (!dispCtx || !st) return;
  const c = dispCtx, W = DISP_W, H = DISP_H;
  c.fillStyle = "#07090c"; c.fillRect(0, 0, W, H);
  c.fillStyle = M3C.fondo2; c.fillRect(4, 4, 170, H - 8); c.fillRect(182, 4, W - 186, H - 8);
  c.textBaseline = "middle";
  const low = st.movesLeft <= 3 && st.phase === "play";
  c.fillStyle = M3C.texto2; c.font = "700 20px Rajdhani, sans-serif"; c.textAlign = "center";
  c.fillText(st.movesLeft === 1 && st.phase === "play" ? "ÚLTIMO MOVIMIENTO" : "MOVIMIENTOS", 89, 22);
  c.font = "700 66px Rajdhani, sans-serif";
  c.fillStyle = "rgba(255,180,0,0.08)"; c.fillText("88", 89, 68);                   // segmentos apagados del contador
  c.fillStyle = low ? M3C.error : M3C.amarillo; c.fillText(String(st.movesLeft).padStart(2, "0"), 89, 68);
  c.fillStyle = M3C.texto2; c.font = "700 20px Rajdhani, sans-serif"; c.textAlign = "left"; c.fillText("OBJETIVO", 196, 22);
  M3_GOAL_TYPES.forEach((t, i) => {
    const n = Math.min(st.collected[t] ?? 0, M3_GOAL_QTY), x = 196 + i * 154, done = n >= M3_GOAL_QTY;
    drawPiece(c, t, x + 22, 68, 58);
    c.fillStyle = done ? M3C.exito : M3C.texto; c.font = "700 36px Rajdhani, sans-serif"; c.textAlign = "left";
    c.fillText(`${n}/${M3_GOAL_QTY}`, x + 48, 70);
  });
  c.fillStyle = "rgba(0,0,0,0.14)"; for (let i = 0; i < H; i += 3) c.fillRect(0, i, W, 1);
  dispTex?.update();
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
  paintDisplay();
  $m("m3-pausebtn").classList.toggle("hidden", st.phase !== "play");
  const hint = $m("m3-hint");
  hint.classList.add("hidden"); // la ayuda vive en la entrada y en la pausa: durante el juego no tapa el panel de control
  const ov = $m("m3-overlay");
  const panel = $m("m3-panel");
  ui.classList.toggle("m3-playing", st.phase === "play" && !paused);
  if (st.phase === "ready") {
    ov.classList.remove("hidden");
    panel.innerHTML = `<p class="m3-kicker">Objetivo</p><p class="m3-title">JUNKET CRUSH</p><div class="m3-goals-vis">${goalsHtml(false)}</div><p class="m3-meta">${M3_MOVES} movimientos · sin obstáculos</p><p class="m3-instr">Cada pieza tiene forma propia. Tocar o arrastrar entre vecinas para alinear 3 iguales; si no se alinean, vuelven a su lugar.</p><div class="m3-btns"><button type="button" class="primary" id="m3-play">Jugar</button><button type="button" id="m3-menu">Menú</button></div>`;
    $m("m3-play").onclick = () => {
      startPlay(st);
      ov.classList.add("hidden");
      syncHud();
      paintScreen();
      SFX.accept();
    };
    $m("m3-menu").onclick = () => requestExit();
    $m("m3-play").focus();
  } else if (st.phase === "win") {
    paused = false;
    $m("m3-pause").classList.remove("on");
    ov.classList.remove("hidden");
    panel.innerHTML = `<p class="m3-title ok">PEDIDO COMPLETO</p><div class="m3-goals-vis">${goalsHtml(false)}</div><div class="m3-btns"><button type="button" class="primary" id="m3-retry">Jugar de nuevo</button><button type="button" id="m3-exit">Volver</button></div>`;
    $m("m3-retry").onclick = () => { resetMatch3(st); syncVisFromBoard(); syncHud(); paintScreen(); SFX.accept(); };
    $m("m3-exit").onclick = () => exitMatch3();
    ($m("m3-retry") as HTMLButtonElement).focus();
    SFX.finish();
  } else if (st.phase === "lose") {
    paused = false;
    $m("m3-pause").classList.remove("on");
    ov.classList.remove("hidden");
    panel.innerHTML = `<p class="m3-title bad">SIN MOVIMIENTOS</p><p class="m3-sub">Se agotaron los movimientos antes de completar el pedido.</p><div class="m3-goals-vis">${goalsHtml(false)}</div><div class="m3-btns"><button type="button" class="primary" id="m3-retry">Reintentar</button><button type="button" id="m3-exit">Volver</button></div>`;
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
  ui.innerHTML = `<div class="m3-hud" id="m3-hud" aria-live="polite"></div><button type="button" class="m3-pausebtn hidden" id="m3-pausebtn" aria-label="Pausa"><i></i><i></i></button><div class="m3-hint" id="m3-hint">Arrastrar una pieza hacia su vecina, o tocar una y después la otra, para juntar 3 iguales</div>
<div class="m3-overlay hidden" id="m3-overlay"><div class="m3-panel" id="m3-panel"></div></div>
<div class="m3-pause" id="m3-pause" role="dialog" aria-modal="true" aria-labelledby="m3-pause-t" aria-hidden="true">
<p class="m3-title" id="m3-pause-t">PAUSA</p><p class="m3-sub m3-pause-help">Arrastrar una pieza hacia su vecina, o tocar una y después la otra, para juntar 3 iguales.</p><div class="m3-btns">
<button type="button" class="primary" id="m3-resume">Reanudar</button><button type="button" id="m3-pause-restart">Reiniciar</button><button type="button" id="m3-config">Opciones</button><button type="button" id="m3-quit">Abandonar</button></div></div>
<div class="m3-confirm hidden" id="m3-confirm" role="alertdialog" aria-labelledby="m3-confirm-t" aria-hidden="true"><div class="m3-panel m3-confirm-box">
<p class="m3-title" id="m3-confirm-t">¿Abandonar partida?</p><p class="m3-sub">El progreso de este intento no se guarda.</p>
<div class="m3-btns"><button type="button" id="m3-confirm-no">Seguir jugando</button><button type="button" class="primary" id="m3-confirm-yes">Abandonar</button></div></div></div>`;
  document.body.appendChild(ui);
  $m("m3-resume").onclick = () => match3PauseToggle();
  $m("m3-pausebtn").onclick = () => { if (!resolving) match3PauseToggle(); };
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
  arcade = buildArcade(D.scene);
  // Pantalla y display: emisivos sin iluminación (la imagen la da el propio tubo); el vidrio de adelante pone el reflejo.
  const mk = (name: string, w: number, h: number) => {
    const t = new B.DynamicTexture(name, { width: w, height: h }, D.scene, true);
    t.hasAlpha = false;
    const m = new B.PBRMaterial(name + "M", D.scene);
    m.disableLighting = true; m.fogEnabled = false; m.metallic = 0; m.roughness = 1; m.environmentIntensity = 0; m.albedoColor = B.Color3.Black(); m.emissiveColor = B.Color3.White(); m.emissiveTexture = t;
    return { t, m };
  };
  const s = mk("m3tex", TEX_PX, TEX_PX), d = mk("m3disp", DISP_W, DISP_H);
  tex = s.t; scrMat = s.m; arcade.screen.material = s.m;
  dispTex = d.t; dispMat = d.m; arcade.display.material = d.m; arcade.display.isPickable = false;
  texCtx = tex.getContext() as unknown as CanvasRenderingContext2D;
  dispCtx = dispTex.getContext() as unknown as CanvasRenderingContext2D;
}

function disposeCabinet() {
  arcade?.dispose();
  for (const o of [tex, dispTex, scrMat, dispMat]) o?.dispose();
  arcade = null; tex = dispTex = null; scrMat = dispMat = null; texCtx = dispCtx = null;
}

/** Botón de pausa montado en el bisel: se proyecta el punto 3D a pantalla (recortado al borde visible). */
function placePauseBtn() {
  if (!arcade || !ui) return;
  const eng = D.scene.getEngine(), canvas = eng.getRenderingCanvas() as HTMLCanvasElement;
  const r = canvas.getBoundingClientRect();
  const p = B.Vector3.Project(arcade.pauseAnchor, B.Matrix.Identity(), D.scene.getTransformMatrix(), D.cam.viewport.toGlobal(r.width, r.height));
  const b = $m("m3-pausebtn"), half = 26;
  b.style.left = `${Math.min(Math.max(p.x, half + 6), r.width - half - 6) - half}px`;
  b.style.top = `${Math.min(Math.max(p.y, half + 6), r.height - half - 6) - half}px`;
}

function cellFromPick(px: number, py: number): { x: number; y: number } | null {
  if (!arcade) return null;
  const screen = arcade.screen;
  const pick = D.scene.pick(px, py, (m) => m === screen);
  if (!pick?.hit) return null;
  const uv = pick.getTextureCoordinates();
  if (!uv) return null;
  const x = Math.floor((uv.x * TEX_PX - PAD) / CELL);
  const y = Math.floor(((1 - uv.y) * TEX_PX - PAD) / CELL);
  if (x < 0 || x >= M3_SIZE || y < 0 || y >= M3_SIZE) return null;
  return { x, y };
}

/** Centro de una celda en píxeles de la ventana (para pruebas: tocar exactamente donde se ve la pieza). */
function cellPx(x: number, y: number) {
  if (!arcade) return null;
  const local = new B.Vector3(((PAD + (x + 0.5) * CELL) / TEX_PX - 0.5), (0.5 - (PAD + (y + 0.5) * CELL) / TEX_PX), 0).scale(arcade.screen.getBoundingInfo().boundingBox.extendSize.x * 2);
  const w = B.Vector3.TransformCoordinates(local, arcade.screen.computeWorldMatrix(true));
  const r = (D.scene.getEngine().getRenderingCanvas() as HTMLCanvasElement).getBoundingClientRect();
  const p = B.Vector3.Project(w, B.Matrix.Identity(), D.scene.getTransformMatrix(), D.cam.viewport.toGlobal(r.width, r.height));
  return { x: p.x + r.left, y: p.y + r.top };
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
    banner = 0.9;
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
    if (animPhase.t >= DUR.reject * m) {
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

// Joystick y botón del panel: decorativos e interactivos. Solo se pickean esas mallas y solo si el toque no cayó en el tablero.
let stickDrag: { x: number; y: number } | null = null;
const stickTilt = { x: 0, z: 0 };
let capT = 0;
let stickRep = 0;
const STICK_MAX = 0.4; // ~23°
function propPick(px: number, py: number) {
  if (!arcade) return null;
  const a = arcade;
  const pk = D.scene.pick(px, py, (m) => m === a.cap || a.stickPick.includes(m as B.Mesh));
  return pk?.hit ? (pk.pickedMesh === a.cap ? "btn" : "stick") : null;
}
function onPointerMove(e: PointerEvent) {
  if (!stickDrag) return;
  const k = 0.012; // radianes por píxel
  const clamp = (v: number) => Math.max(-STICK_MAX, Math.min(STICK_MAX, v));
  stickTilt.z = clamp(-(e.clientX - stickDrag.x) * k);
  stickTilt.x = clamp((e.clientY - stickDrag.y) * k * -1);
  const m = Math.hypot(stickTilt.x, stickTilt.z);
  if (m > STICK_MAX) { stickTilt.x *= STICK_MAX / m; stickTilt.z *= STICK_MAX / m; }
}
function tickProps(dt: number) {
  if (!arcade) return;
  if (!stickDrag) { const f = Math.exp(-14 * dt); stickTilt.x *= f; stickTilt.z *= f; } // vuelve suave al centro
  // Joystick como flechas: pasado el 60 % del tope, una flecha en la dirección dominante; manteniendo, se repite cada 0,35 s
  const ax = Math.abs(stickTilt.z), ay = Math.abs(stickTilt.x);
  if (Math.max(ax, ay) > STICK_MAX * 0.6) {
    stickRep -= dt;
    if (stickRep <= 0) { navKey(ax > ay ? (stickTilt.z < 0 ? "ArrowRight" : "ArrowLeft") : (stickTilt.x < 0 ? "ArrowDown" : "ArrowUp")); stickRep = 0.35; }
  } else stickRep = 0;
  arcade.stick.rotation.set(stickTilt.x, 0, stickTilt.z);
  if (capT > 0) capT = Math.max(0, capT - dt);
  const down = capT > 0 ? 1 : 0;
  arcade.cap.position.y = -0.009 * down;
  arcade.capMat.emissiveColor = B.Color3.FromHexString(M3C.rojo).scale(down ? 1 : 0.25);
}

function onPointerDown(e: PointerEvent) {
  if (!active) return;
  const rect = (D.scene.getEngine().getRenderingCanvas() as HTMLCanvasElement).getBoundingClientRect();
  const c = uiBlocksPlay() || resolving ? null : cellFromPick(e.clientX - rect.left, e.clientY - rect.top);
  if (!c) {
    const pr = $m("m3-overlay").classList.contains("hidden") && !paused && !quitAsk ? propPick(e.clientX - rect.left, e.clientY - rect.top) : null;
    if (pr === "stick") { e.preventDefault(); stickDrag = { x: e.clientX, y: e.clientY }; }
    else if (pr === "btn") { e.preventDefault(); capT = 0.16; SFX.click(); navKey("Enter"); } // botón rojo = Enter
    return;
  }
  e.preventDefault();
  if (sel && Math.abs(c.x - sel.x) + Math.abs(c.y - sel.y) === 1) {
    const f = sel;
    sel = null;
    attemptSwap(f.x, f.y, c.x, c.y);
    paintScreen();
    return;
  }
  dragFrom = c;
  dragPx = { x: e.clientX, y: e.clientY };
  sel = c;
  paintScreen();
}

function onPointerUp(e: PointerEvent) {
  stickDrag = null;
  if (!dragFrom || !active) return;
  const rect = (D.scene.getEngine().getRenderingCanvas() as HTMLCanvasElement).getBoundingClientRect();
  const f = dragFrom;
  dragFrom = null;
  // Arrastre: alcanza con moverse ~media pieza hacia un lado; si no, cuenta como toque (selección).
  const dx = e.clientX - dragPx.x, dy = e.clientY - dragPx.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < Math.max(14, rect.width * 0.02)) return;
  const sx = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0;
  const sy = sx ? 0 : Math.sign(dy);
  const tx = f.x + sx, ty = f.y + sy;
  if (tx < 0 || ty < 0 || tx >= M3_SIZE || ty >= M3_SIZE) return;
  sel = null;
  attemptSwap(f.x, f.y, tx, ty);
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
  if (navKey(e.code)) e.preventDefault();
}

/** Flechas + Enter sobre el tablero (teclado, y joystick/botón del panel). Devuelve true si la tecla se usó. */
function navKey(code: string) {
  if (!(st.phase === "play" && !resolving && !uiBlocksPlay())) return false;
  {
    if (code === "Enter" || code === "Space") {
      if (!sel) sel = { x: 0, y: 0 };
      if (!armed) { armed = { ...sel }; paintScreen(); return true; }
      if (armed.x === sel.x && armed.y === sel.y) { armed = null; sel = null; paintScreen(); return true; }
      attemptSwap(armed.x, armed.y, sel.x, sel.y);
      armed = null;
      return true;
    }
    if (!sel) sel = { x: 0, y: 0 };
    let nx = sel.x;
    let ny = sel.y;
    if (code === "ArrowLeft") nx--;
    else if (code === "ArrowRight") nx++;
    else if (code === "ArrowUp") ny--;
    else if (code === "ArrowDown") ny++;
    else return false;
    if (nx < 0 || nx >= M3_SIZE || ny < 0 || ny >= M3_SIZE) return true;
    sel = { x: nx, y: ny };
    paintScreen();
    return true;
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
  setDark(0.22);
  fitMatch3Camera();
  placePauseBtn();
  document.body.classList.add("match3-play");
  document.getElementById("touch")?.classList.add("match3-only", "hidden"); // los controles táctiles del auto no aplican: la pausa está montada en el gabinete
  music("menu");
  const canvas = D.scene.getEngine().getRenderingCanvas() as HTMLCanvasElement;
  canvas.style.touchAction = "none";
  canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
  canvas.addEventListener("pointerup", onPointerUp, { passive: false });
  canvas.addEventListener("pointercancel", () => { dragFrom = null; stickDrag = null; });
  addEventListener("pointermove", onPointerMove);
  addEventListener("keydown", onKey);
  resizeObs = () => { fitMatch3Camera(); placePauseBtn(); };
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
  document.getElementById("touch")?.classList.remove("match3-only");
  if (resizeObs) { removeEventListener("resize", resizeObs); resizeObs = null; }
  disposeCabinet();
  const canvas = D.scene.getEngine().getRenderingCanvas() as HTMLCanvasElement;
  canvas.style.touchAction = "";
  canvas.removeEventListener("pointerdown", onPointerDown);
  canvas.removeEventListener("pointerup", onPointerUp);
  removeEventListener("pointermove", onPointerMove);
  stickDrag = null; capT = 0;
  removeEventListener("keydown", onKey);
  D.onExit();
}

export function match3Tick(dt: number) {
  if (!active) return;
  tickAnim(dt);
  tickProps(dt);
  if (banner > 0) { banner = Math.max(0, banner - dt); if (!animPhase) paintScreen(); }
  placePauseBtn();
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
  cellPx,
  board: () => st?.board.map((r) => r.slice()),
  sel: () => sel,
  props: () => (arcade ? { tilt: Math.hypot(arcade.stick.rotation.x, arcade.stick.rotation.z), rx: arcade.stick.rotation.x, rz: arcade.stick.rotation.z, cap: arcade.cap.position.y } : null),
  propPx: (which: "stick" | "btn") => {
    if (!arcade) return null;
    const m = which === "btn" ? arcade.cap : arcade.stickPick[1];
    const r = (D.scene.getEngine().getRenderingCanvas() as HTMLCanvasElement).getBoundingClientRect();
    const p = B.Vector3.Project(m.getAbsolutePosition(), B.Matrix.Identity(), D.scene.getTransformMatrix(), D.cam.viewport.toGlobal(r.width, r.height));
    return { x: p.x + r.left, y: p.y + r.top };
  },
  ready: () => {
    syncHud();
    paintScreen();
  },
};
