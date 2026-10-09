// Junket Crush: campaña match-3 dentro de la pantalla de un gabinete de chapa (diorama en match3_scene.ts).
// Motor puro en match3_logic.ts, niveles en match3_levels.ts, dibujo en match3_draw.ts. Acá: flujo (mapa → nivel → resultado),
// animación de los pasos que devuelve el motor, entrada (toque, arrastre, teclado, joystick del panel) y guardado.
import * as B from "@babylonjs/core";
import "./match3.css";
import { current as menuScr, openM3Config, persist, save } from "./menu";
import { applyClimate, setDark } from "./render";
import { showWorld } from "./world";
import { buildArcade, M3C, type Arcade } from "./match3_scene";
import { music, SFX } from "./sfx";
import { DUSK } from "./run";
import { LEVELS } from "./match3_levels";
import {
  CARGO, CRATE, EMPTY, HOLE, TOOLS, cloneBoard, colorOf, finale, goalProgress, mk, newMatch3, spOf, startPlay, starsFor, trySwap, useTool,
  type Blast, type Goal, type M3Board, type M3ResolveStep, type Match3State, type Tool,
} from "./match3_logic";
import {
  MAP_H, PIECE_COL, PIECE_NAMES, drawChain, drawCrate, drawGoalIcon, drawMap, drawPiece, drawRust, drawStar, drawToolIcon, iconURL, nodePos,
} from "./match3_draw";

type Deps = { scene: B.Scene; cam: B.FreeCamera; onExit(): void };
let D: Deps;
let active = false;
let mode: "map" | "level" = "map";
let st: Match3State | null = null;
let lvIdx = 0;
let attempt = 0;
let baseSeed = 20261007;
let resolving = false;
let sel: { x: number; y: number } | null = null;
let armed: { x: number; y: number } | null = null;
let tool: Tool | null = null;
let dragFrom: { x: number; y: number } | null = null;
let dragPx = { x: 0, y: 0 };
let T = 0; // reloj de la pantalla (animaciones idle)

const TOOL_NAME: Record<Tool, string> = { martillo: "Martillo", sierra: "Sierra", iman: "Imán", llave: "Llave" };
const TOOL_HELP: Record<Tool, string> = {
  martillo: "MARTILLO: tocar una pieza o caja",
  sierra: "SIERRA: tocar una fila",
  iman: "IMÁN: tocar una pieza para llevarse todas iguales",
  llave: "LLAVE: mover dos piezas vecinas sin gastar movimiento",
};

let arcade: Arcade | null = null;
let tex: B.DynamicTexture | null = null;
let texCtx: CanvasRenderingContext2D | null = null;
let dispTex: B.DynamicTexture | null = null;
let dispCtx: CanvasRenderingContext2D | null = null;
const TEX_PX = 512;
const PAD = 10;
const DISP_W = 512, DISP_H = 106;
// geometría del tablero del nivel actual (cambia con el tamaño)
let CELL = 62, OX = PAD, OY = PAD;
function layoutBoard() {
  if (!st) return;
  const n = Math.max(st.w, st.h);
  CELL = (TEX_PX - PAD * 2) / n;
  OX = PAD + ((n - st.w) * CELL) / 2;
  OY = PAD + ((n - st.h) * CELL) / 2;
}

// ── Progreso guardado ──────────────────────────────────────────────────
const prog = () => save.m3;
const starsOf = (i: number) => prog().stars[LEVELS[i].id] ?? 0;
/** Último nivel abierto: el siguiente al último ganado. */
const openIdx = () => { let i = 0; while (i < LEVELS.length - 1 && starsOf(i) > 0) i++; return i; };
const toolCount = (t: Tool) => (st?.tools[t] ?? 0) + (prog().tools[t] ?? 0);
function spendTool(t: Tool) {
  if (st && (st.tools[t] ?? 0) > 0) st.tools[t]!--;
  else { prog().tools[t] = Math.max(0, (prog().tools[t] ?? 0) - 1); persist(); }
}
function recordWin(i: number, score: number) {
  const lv = LEVELS[i], p = prog(), first = !(p.stars[lv.id] > 0);
  const stars = starsFor(lv, score), newBest = score > (p.best[lv.id] ?? 0);
  p.stars[lv.id] = Math.max(p.stars[lv.id] ?? 0, stars);
  if (newBest) p.best[lv.id] = score;
  if (first && lv.reward) for (const [t, n] of Object.entries(lv.reward)) p.tools[t as Tool] = (p.tools[t as Tool] ?? 0) + (n ?? 0);
  persist();
  return { first, stars, newBest };
}

// ── Animación de los pasos del motor ───────────────────────────────────
const reducedMotion = () => document.body.classList.contains("calm") || matchMedia("(prefers-reduced-motion: reduce)").matches;
const animMul = () => (reducedMotion() ? 0.15 : 1);
type Snap = { board: M3Board; crate: number[][]; lock: number[][]; rust: number[][] };
const snap = (s: Match3State): Snap => ({ board: cloneBoard(s.board), crate: cloneBoard(s.crate), lock: cloneBoard(s.lock), rust: cloneBoard(s.rust) });
let V: Snap | null = null; // lo que se ve mientras se anima (el motor ya resolvió todo)
let off: Record<string, number> = {}; // desplazamiento vertical (en celdas) de cada pieza que cae
type Anim =
  | { kind: "swap" | "reject"; ax: number; ay: number; bx: number; by: number; t: number }
  | { kind: "clear"; step: M3ResolveStep; t: number; dur: number }
  | { kind: "drop"; t: number; dur: number; dist: Record<string, number> }
  | { kind: "pause"; t: number; dur: number };
let anim: Anim | null = null;
let steps: M3ResolveStep[] = [];
let stepIdx = 0;
let afterAnim: (() => void) | null = null;
let banner: { txt: string; t: number; col: string } | null = null;
let comboTxt: { txt: string; t: number } | null = null;
let shownScore = 0;
let finaleDone = false;
let later: { t: number; fn: () => void } | null = null; // panel de resultado con un respiro (avanza con el reloj del juego, no con setTimeout)

// efectos (en px de la textura)
type Part = { x: number; y: number; vx: number; vy: number; life: number; max: number; col: string; sz: number; spin: number };
const parts: Part[] = [];
const beams: { x: number; y: number; k: "h" | "v"; t: number }[] = [];
const rings: { x: number; y: number; r: number; t: number; col: string }[] = [];
const bolts: { x: number; y: number; tx: number; ty: number; t: number }[] = [];
const floats: { x: number; y: number; txt: string; t: number; col: string; big: boolean }[] = [];
let shake = 0, flash = 0, lastChain = 0;

const cx = (x: number) => OX + (x + 0.5) * CELL;
const cy = (y: number) => OY + (y + 0.5) * CELL;
function burst(x: number, y: number, col: string, n: number, speed = 160) {
  if (parts.length > 260) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random());
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: 0, max: 0.35 + Math.random() * 0.35, col, sz: 2 + Math.random() * 4, spin: Math.random() * 6 });
  }
}

function view(): Snap | null { return V ?? (st ? { board: st.board, crate: st.crate, lock: st.lock, rust: st.rust } : null); }

function startSteps(list: M3ResolveStep[], done: () => void) {
  steps = list; stepIdx = 0; afterAnim = done;
  if (!steps.length || reducedMotion()) { endSteps(); return; }
  beginStep();
}
function beginStep() {
  const s = steps[stepIdx];
  if (!s) return endSteps();
  if (s.crates) { // la trituradora escupe cajas
    for (const c of s.crates) { V!.board[c.y][c.x] = CRATE; V!.crate[c.y][c.x] = 1; rings.push({ x: cx(c.x), y: cy(c.y), r: CELL, t: 0, col: M3C.rojo }); burst(cx(c.x), cy(c.y), "#8a5a2b", 10); }
    banner = { txt: "LA TRITURADORA ESCUPE CHATARRA", t: 1.3, col: M3C.rojo }; shake = Math.max(shake, 8); SFX.break();
    anim = { kind: "pause", t: 0, dur: 0.55 * animMul() };
    return;
  }
  if (s.shuffled) { banner = { txt: "SIN JUGADAS: REORGANIZANDO", t: 1.2, col: M3C.amarillo }; SFX.m3Swap(); anim = { kind: "pause", t: 0, dur: 0.6 * animMul() }; return; }
  // limpieza: efectos al empezar
  for (const b of s.blasts) fireFx(b, s);
  for (const c of s.cleared) {
    const col = c.v === CARGO ? M3C.amarillo : PIECE_COL[colorOf(c.v)] ?? M3C.texto2;
    burst(cx(c.x), cy(c.y), col, s.cleared.length > 20 ? 3 : 8, 190);
    if (c.v === CARGO) { floats.push({ x: cx(c.x), y: cy(c.y), txt: "¡MOTOR!", t: 0, col: M3C.amarillo, big: true }); SFX.pickup(); }
  }
  for (const h of s.hits) if (h.k === "crate") burst(cx(h.x), cy(h.y), "#8a5a2b", 8, 200); else if (h.k === "chain") burst(cx(h.x), cy(h.y), M3C.metalClaro, 6);
  if (s.hits.some((h) => h.k === "crate" || h.k === "chain")) SFX.break();
  if (s.cleared.length) SFX.m3Clear();
  if (s.cleared.length >= 4) shake = Math.max(shake, 3 + Math.min(4, s.cleared.length - 4)); // micro sacudida en combos de 4+
  if (s.chain >= 1) { lastChain = s.chain + 1; comboTxt = { txt: s.chain >= 4 ? `¡REACCIÓN EN CADENA x${s.chain + 1}!` : `CADENA x${s.chain + 1}`, t: 0 }; SFX.streak(s.chain * 15); }
  if (s.gain && s.cleared.length) {
    const mx = s.cleared.reduce((a, c) => a + c.x, 0) / s.cleared.length, my = s.cleared.reduce((a, c) => a + c.y, 0) / s.cleared.length;
    floats.push({ x: cx(mx), y: cy(my), txt: `+${s.gain}`, t: 0, col: s.chain ? M3C.cian : M3C.texto, big: s.gain >= 300 });
  }
  anim = { kind: "clear", step: s, t: 0, dur: (s.blasts.length ? 0.34 : 0.22) * animMul() };
}
function fireFx(b: Blast, s: M3ResolveStep) {
  const x = cx(b.x), y = cy(b.y);
  if (b.k === "h" || b.k === "v") { beams.push({ x, y, k: b.k, t: 0 }); SFX.zap(); shake = Math.max(shake, 4); }
  else if (b.k === "cross") { beams.push({ x, y, k: "h", t: 0 }, { x, y, k: "v", t: 0 }); SFX.zap(); shake = Math.max(shake, 6); }
  else if (b.k === "bomb") { rings.push({ x, y, r: CELL * (1.6 + (b.r ?? 1)), t: 0, col: M3C.naranja }); if (b.r !== 0) { SFX.explosion(); shake = Math.max(shake, 7 + (b.r ?? 1) * 4); } else SFX.impact("martillo"); }
  else if (b.k === "core") { for (const c of s.cleared.slice(0, 40)) bolts.push({ x, y, tx: cx(c.x), ty: cy(c.y), t: 0 }); flash = 0.35; SFX.levelUp(); shake = Math.max(shake, 6); }
  else { // combos gordos: sobrecarga del tablero
    rings.push({ x, y, r: CELL * 4, t: 0, col: M3C.cian }, { x, y, r: CELL * 2.5, t: -0.08, col: M3C.amarillo });
    for (let d = -1; d <= 1; d++) beams.push({ x: x + d * CELL, y, k: "v", t: 0 }, { x, y: y + d * CELL, k: "h", t: 0 });
    flash = 0.6; shake = 16; SFX.explosion();
  }
}
/** Aplica la limpieza del paso sobre lo visible y arma la caída. */
function endClear(s: M3ResolveStep) {
  const v = V!;
  for (const c of s.cleared) v.board[c.y][c.x] = EMPTY;
  for (const h of s.hits) {
    if (h.k === "crate") { v.crate[h.y][h.x] = h.left; if (h.left <= 0) v.board[h.y][h.x] = EMPTY; }
    else if (h.k === "chain") v.lock[h.y][h.x] = 0;
    else v.rust[h.y][h.x] = 0;
  }
  for (const m of s.made) { v.board[m.y][m.x] = m.v; v.lock[m.y][m.x] = 0; rings.push({ x: cx(m.x), y: cy(m.y), r: CELL * 0.9, t: 0, col: M3C.amarilloClaro }); }
  if (s.made.length) SFX.blip();
  const dist: Record<string, number> = {};
  for (const f of s.fell) { v.board[f.fromY][f.x] = EMPTY; }
  for (const f of s.fell) { v.board[f.toY][f.x] = f.type; dist[`${f.x},${f.toY}`] = f.toY - f.fromY; }
  for (const p of s.spawned) { v.board[p.y][p.x] = p.type; dist[`${p.x},${p.y}`] = p.dy; }
  const maxD = Math.max(0, ...Object.values(dist));
  if (!maxD) return nextStep();
  off = {};
  for (const k in dist) off[k] = -dist[k];
  anim = { kind: "drop", t: 0, dur: (0.12 + 0.045 * maxD) * animMul(), dist };
}
function nextStep() { stepIdx++; if (stepIdx < steps.length) beginStep(); else endSteps(); }
function endSteps() {
  anim = null; V = null; off = {}; steps = []; resolving = false; lastChain = 0;
  const f = afterAnim; afterAnim = null;
  f?.();
}
function tickAnim(dt: number) {
  if (!anim) return;
  anim.t += dt;
  if (anim.kind === "swap" || anim.kind === "reject") {
    const dur = (anim.kind === "swap" ? 0.15 : 0.28) * animMul();
    if (anim.t >= dur) {
      if (anim.kind === "reject") { anim = null; resolving = false; V = null; return; }
      const a = anim; anim = null;
      // aplicar el intercambio a lo visible y seguir con los pasos
      const t0 = V!.board[a.ay][a.ax]; V!.board[a.ay][a.ax] = V!.board[a.by][a.bx]; V!.board[a.by][a.bx] = t0;
      if (steps.length) beginStep(); else endSteps();
    }
  } else if (anim.kind === "clear") { if (anim.t >= anim.dur) endClear(anim.step); }
  else if (anim.kind === "drop") {
    const k = Math.min(1, anim.t / anim.dur);
    for (const key in anim.dist) {
      // caída con aceleración y un rebote corto al apoyar
      const d = anim.dist[key];
      const e = k * k;
      off[key] = k < 1 ? -d * (1 - e) : 0;
    }
    if (k >= 1) { off = {}; land = 0.12; nextStep(); }
  } else if (anim.kind === "pause" && anim.t >= anim.dur) nextStep();
}
let land = 0; // aplastado breve al apoyar

// ── Pantalla ───────────────────────────────────────────────────────────
function paintScreen() {
  if (!texCtx) return;
  const c = texCtx;
  c.fillStyle = "#06090c"; c.fillRect(0, 0, TEX_PX, TEX_PX);
  if (mode === "map") paintMap(c); else paintBoard(c);
  // CRT muy sutil
  c.fillStyle = "rgba(0,0,0,0.12)"; for (let i = 0; i < TEX_PX; i += 3) c.fillRect(0, i, TEX_PX, 1);
  const v = c.createRadialGradient(TEX_PX / 2, TEX_PX / 2, TEX_PX * 0.45, TEX_PX / 2, TEX_PX / 2, TEX_PX * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.35)");
  c.fillStyle = v; c.fillRect(0, 0, TEX_PX, TEX_PX);
  tex?.update();
}

let mapSel = 0, mapScroll = MAP_H - TEX_PX;
const mapTarget = () => Math.max(0, Math.min(MAP_H - TEX_PX, nodePos(mapSel).y - TEX_PX * 0.6));
function paintMap(c: CanvasRenderingContext2D) {
  drawMap(c, TEX_PX, { levels: LEVELS, stars: LEVELS.map((_, i) => starsOf(i)), sel: mapSel, open: openIdx(), t: T, scroll: mapScroll });
  // ficha del nivel elegido al pie
  const lv = LEVELS[mapSel];
  c.fillStyle = "rgba(11,15,20,0.9)"; c.fillRect(0, TEX_PX - 58, TEX_PX, 58);
  c.textAlign = "left"; c.textBaseline = "middle";
  c.fillStyle = M3C.texto2; c.font = "700 16px Rajdhani, sans-serif"; c.fillText(`NIVEL ${mapSel + 1} · ${lv.zone.toUpperCase()}`, 14, TEX_PX - 42);
  c.fillStyle = M3C.texto; c.font = "700 26px Rajdhani, sans-serif"; c.fillText(lv.name.toUpperCase(), 14, TEX_PX - 18);
  c.textAlign = "right"; c.fillStyle = M3C.amarillo; c.font = "700 18px Rajdhani, sans-serif";
  c.fillText(Math.sin(T * 4) > -0.3 ? "BOTÓN: JUGAR" : "", TEX_PX - 14, TEX_PX - 18);
}

function paintBoard(c: CanvasRenderingContext2D) {
  const vw = view();
  if (!st || !vw) return;
  const sx = shake ? (Math.random() - 0.5) * shake : 0, sy = shake ? (Math.random() - 0.5) * shake : 0;
  c.save(); c.translate(sx, sy);
  const a = anim;
  const swapK = a && a.kind === "swap" ? (() => { const k = Math.min(1, a.t / (0.15 * animMul())); return k * (2 - k); })() : 0;
  const rejK = a && a.kind === "reject" ? Math.min(1, a.t / (0.28 * animMul())) : 0;
  const clearing = a && a.kind === "clear" ? new Set(a.step.cleared.map((q) => `${q.x},${q.y}`)) : null;
  const hurt = a && a.kind === "clear" ? new Set(a.step.hits.filter((h) => h.k === "crate").map((q) => `${q.x},${q.y}`)) : null;
  const clearK = a && a.kind === "clear" ? Math.min(1, a.t / a.dur) : 0;
  const isAt = (p: { x: number; y: number } | null, x: number, y: number) => !!p && p.x === x && p.y === y;
  const playing = st.phase === "play" && !uiBlocksPlay() && !resolving;
  // 1) casillas
  for (let y = 0; y < st.h; y++) for (let x = 0; x < st.w; x++) {
    if (vw.board[y][x] === HOLE) continue;
    let light: string | null = null;
    if (a && (a.kind === "swap" || a.kind === "reject") && ((x === a.ax && y === a.ay) || (x === a.bx && y === a.by))) light = a.kind === "swap" ? M3C.exito : M3C.error;
    else if (clearing?.has(`${x},${y}`)) light = M3C.amarilloClaro;
    else if (playing && isAt(armed, x, y)) light = M3C.amarillo;
    else if (playing && isAt(sel, x, y)) light = tool ? M3C.naranja : M3C.cian;
    else if (playing && tool === "sierra" && sel && sel.y === y) light = "rgba(255,145,56,0.5)";
    drawSocket(c, x, y, light);
    if (vw.rust[y][x]) drawRust(c, OX + x * CELL, OY + y * CELL, CELL);
  }
  // 2) piezas, cajas y cadenas
  for (let y = 0; y < st.h; y++) for (let x = 0; x < st.w; x++) {
    const v = vw.board[y][x];
    if (v === CRATE) {
      drawCrate(c, OX + x * CELL, OY + y * CELL, CELL, vw.crate[y][x], hurt?.has(`${x},${y}`) && clearK < 0.5 ? 1 : 0);
      if (st.lv.boss && vw.crate[y][x] >= 2) drawJaw(c, OX + x * CELL, OY + y * CELL, CELL); // placas de la trituradora
      continue;
    }
    if (v < 0) continue;
    let ox = 0, oy = off[`${x},${y}`] ?? 0, scale = 1, glow = 0, lift = 0;
    if (a && (a.kind === "swap" || a.kind === "reject")) {
      const isA = x === a.ax && y === a.ay, isB = x === a.bx && y === a.by;
      if (isA || isB) {
        const dx = isA ? a.bx - a.ax : a.ax - a.bx, dy = isA ? a.by - a.ay : a.ay - a.by;
        if (a.kind === "swap") { ox += dx * swapK; oy += dy * swapK; lift = Math.sin(swapK * Math.PI); }
        else { const w = Math.sin(rejK * Math.PI * 6) * 0.14 * (1 - rejK); ox += dx * 0.22 * Math.sin(rejK * Math.PI) + (dy ? w : 0); oy += dy * 0.22 * Math.sin(rejK * Math.PI) + (dx ? w : 0); }
      }
    }
    if (clearing?.has(`${x},${y}`)) {
      if (clearK < 0.35) { glow = clearK / 0.35; scale = 1 + glow * 0.15; }
      else { glow = 1; scale = 1.15 * (1 - (clearK - 0.35) / 0.65); }
    }
    if (playing && (isAt(sel, x, y) || isAt(armed, x, y))) lift = 1;
    const sq = land > 0 && !a ? land / 0.12 : 0; // aplastado al aterrizar: ancho y bajo
    if (scale <= 0.02) continue;
    const px = OX + (x + 0.5 + ox) * CELL, py = OY + (y + 0.5 + oy) * CELL;
    if (py < OY - CELL * 0.4) continue; // todavía arriba del tablero
    if (clearing?.has(`${x},${y}`) && clearK < 0.3) { c.fillStyle = `rgba(255,240,200,${(0.3 - clearK) * 2})`; c.fillRect(OX + x * CELL + 2, OY + y * CELL + 2, CELL - 4, CELL - 4); } // destello de la casilla
    if (sq) { const fy = py + CELL * 0.35; c.save(); c.translate(px, fy); c.scale(1 + sq * 0.2, 1 - sq * 0.25); c.translate(-px, -fy); }
    drawPiece(c, v, px, py, CELL, scale, lift, glow, T);
    if (sq) c.restore();
    if (vw.lock[y][x]) drawChain(c, px, py, CELL);
  }
  // 3) efectos
  for (const b of beams) {
    const k = b.t / 0.32, w = CELL * 0.7 * (1 - k);
    c.fillStyle = `rgba(0,194,255,${0.7 * (1 - k)})`;
    if (b.k === "h") c.fillRect(0, b.y - w / 2, TEX_PX, w); else c.fillRect(b.x - w / 2, 0, w, TEX_PX);
    c.fillStyle = `rgba(255,255,255,${0.9 * (1 - k)})`;
    if (b.k === "h") c.fillRect(0, b.y - w / 6, TEX_PX, w / 3); else c.fillRect(b.x - w / 6, 0, w / 3, TEX_PX);
  }
  for (const r of rings) { if (r.t < 0) continue; const k = r.t / 0.4; c.strokeStyle = r.col; c.globalAlpha = 1 - k; c.lineWidth = 8 * (1 - k) + 1; c.beginPath(); c.arc(r.x, r.y, r.r * (0.3 + k * 0.9), 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; }
  for (const b of bolts) {
    const k = b.t / 0.3; c.strokeStyle = `rgba(160,230,255,${1 - k})`; c.lineWidth = 2.5; c.beginPath(); c.moveTo(b.x, b.y);
    for (let i = 1; i <= 4; i++) { const f = i / 4; c.lineTo(b.x + (b.tx - b.x) * f + (i < 4 ? (Math.random() - 0.5) * 18 : 0), b.y + (b.ty - b.y) * f + (i < 4 ? (Math.random() - 0.5) * 18 : 0)); }
    c.stroke();
  }
  for (const p of parts) { const k = p.life / p.max; c.globalAlpha = 1 - k; c.fillStyle = p.col; c.save(); c.translate(p.x, p.y); c.rotate(p.spin * p.life); c.fillRect(-p.sz / 2, -p.sz / 2, p.sz, p.sz * 0.6); c.restore(); }
  c.globalAlpha = 1;
  for (const f of floats) {
    const k = f.t / 0.9; c.globalAlpha = Math.min(1, 2 * (1 - k)); c.textAlign = "center"; c.textBaseline = "middle";
    c.font = `700 ${f.big ? 34 : 24}px Rajdhani, sans-serif`; c.lineWidth = 4; c.strokeStyle = M3C.fondo; c.strokeText(f.txt, f.x, f.y - k * 40); c.fillStyle = f.col; c.fillText(f.txt, f.x, f.y - k * 40);
  }
  c.globalAlpha = 1;
  c.restore();
  if (flash > 0) { c.fillStyle = `rgba(255,255,255,${Math.min(0.5, flash)})`; c.fillRect(0, 0, TEX_PX, TEX_PX); }
  if (comboTxt) {
    const k = comboTxt.t / 1.1, s = 1 + Math.max(0, 0.3 - comboTxt.t) * 2;
    c.save(); c.globalAlpha = Math.min(1, 3 * (1 - k)); c.translate(TEX_PX / 2, TEX_PX * 0.3); c.scale(s, s);
    c.font = "700 40px Rajdhani, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 6; c.strokeStyle = M3C.fondo; c.strokeText(comboTxt.txt, 0, 0); c.fillStyle = M3C.amarillo; c.fillText(comboTxt.txt, 0, 0);
    c.restore();
  }
  if (banner) {
    c.fillStyle = "rgba(11,15,20,0.88)"; c.fillRect(0, TEX_PX / 2 - 30, TEX_PX, 60);
    c.fillStyle = banner.col; c.font = "700 32px Rajdhani, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(banner.txt, TEX_PX / 2, TEX_PX / 2 + 2);
  }
  if (st.lv.hazard && st.phase === "play") { // cuenta regresiva de la trituradora
    const left = st.lv.hazard.every - (st.used % st.lv.hazard.every);
    c.fillStyle = "rgba(11,15,20,0.88)"; c.fillRect(TEX_PX - 150, 0, 150, 30);
    c.fillStyle = left === 1 ? M3C.rojo : M3C.texto2; c.font = "700 18px Rajdhani, sans-serif"; c.textAlign = "right"; c.textBaseline = "middle";
    c.fillText(left === 1 ? "TRITURADORA: YA" : `TRITURADORA: ${left}`, TEX_PX - 8, 16);
  }
  if (tool && st.phase === "play") {
    c.fillStyle = "rgba(11,15,20,0.85)"; c.fillRect(0, TEX_PX - 34, TEX_PX, 34);
    c.fillStyle = M3C.naranja; c.font = "700 20px Rajdhani, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(TOOL_HELP[tool], TEX_PX / 2, TEX_PX - 16);
  }
}
/** Placa de la trituradora: chapa roja con dientes y franja de peligro (caja de 2 golpes del jefe). */
function drawJaw(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.fillStyle = M3C.rojoChapa; c.fillRect(x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88);
  c.save(); c.beginPath(); c.rect(x + s * 0.06, y + s * 0.62, s * 0.88, s * 0.2); c.clip();
  for (let i = -2; i < 8; i++) { c.fillStyle = i % 2 ? M3C.amarillo : M3C.fondo; c.beginPath(); c.moveTo(x + i * s * 0.16, y + s * 0.82); c.lineTo(x + (i + 1) * s * 0.16, y + s * 0.82); c.lineTo(x + (i + 2) * s * 0.16, y + s * 0.62); c.lineTo(x + (i + 1) * s * 0.16, y + s * 0.62); c.fill(); }
  c.restore();
  c.fillStyle = M3C.metalClaro;
  for (let i = 0; i < 4; i++) { const tx = x + s * (0.12 + i * 0.2); c.beginPath(); c.moveTo(tx, y + s * 0.18); c.lineTo(tx + s * 0.08, y + s * 0.48); c.lineTo(tx + s * 0.16, y + s * 0.18); c.fill(); }
  c.strokeStyle = M3C.fondo; c.lineWidth = s * 0.05; c.strokeRect(x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88);
}
function drawSocket(c: CanvasRenderingContext2D, x: number, y: number, light: string | null) {
  const px = OX + x * CELL, py = OY + y * CELL, g = Math.max(2, CELL * 0.05), r = CELL * 0.1;
  c.fillStyle = "#0B0F14"; c.fillRect(px, py, CELL, CELL);
  c.fillStyle = M3C.fondo2; c.beginPath(); c.roundRect(px + g, py + g, CELL - g * 2, CELL - g * 2, r); c.fill();
  c.fillStyle = "rgba(0,0,0,0.55)"; c.fillRect(px + g + 2, py + g + 1, CELL - g * 2 - 4, CELL * 0.1);
  c.strokeStyle = M3C.panel; c.lineWidth = 1.5; c.beginPath(); c.roundRect(px + g, py + g, CELL - g * 2, CELL - g * 2, r); c.stroke();
  c.fillStyle = "rgba(255,255,255,0.07)"; c.fillRect(px + g + 2, py + CELL - g - CELL * 0.08, CELL - g * 2 - 4, CELL * 0.06); // bisel inferior
  if (light) { c.save(); c.shadowColor = light; c.shadowBlur = 10; c.strokeStyle = light; c.lineWidth = 3.5; c.beginPath(); c.roundRect(px + g + 1, py + g + 1, CELL - g * 2 - 2, CELL - g * 2 - 2, r); c.stroke(); c.restore(); }
}
function tickFx(dt: number) {
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life += dt; p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.life >= p.max) parts.splice(i, 1); }
  for (const arr of [beams, bolts] as { t: number }[][]) for (let i = arr.length - 1; i >= 0; i--) { arr[i].t += dt; if (arr[i].t > 0.32) arr.splice(i, 1); }
  for (let i = rings.length - 1; i >= 0; i--) { rings[i].t += dt; if (rings[i].t > 0.4) rings.splice(i, 1); }
  for (let i = floats.length - 1; i >= 0; i--) { floats[i].t += dt; if (floats[i].t > 0.9) floats.splice(i, 1); }
  if (comboTxt && (comboTxt.t += dt) > 1.1) comboTxt = null;
  if (banner && (banner.t -= dt) <= 0) banner = null;
  shake = Math.max(0, shake - dt * 40); flash = Math.max(0, flash - dt * 2); land = Math.max(0, land - dt);
}

// ── Display (movimientos, objetivos, puntaje con marcas de estrella) ────
function goalLeft(g: Goal) { return st ? g.n - goalProgress(st, g) : g.n; }
function paintDisplay() {
  if (!dispCtx) return;
  const c = dispCtx, W = DISP_W, H = DISP_H;
  c.fillStyle = "#07090c"; c.fillRect(0, 0, W, H);
  c.fillStyle = M3C.fondo2; c.fillRect(4, 4, 140, H - 8); c.fillRect(150, 4, W - 154, H - 8);
  c.textBaseline = "middle";
  if (mode === "map" || !st) {
    const lv = LEVELS[mapSel] ?? LEVELS[0], p = prog(), stN = p.stars[lv.id] ?? 0, best = p.best[lv.id] ?? 0;
    c.fillStyle = M3C.texto2; c.font = "700 18px Rajdhani, sans-serif"; c.textAlign = "center";
    c.fillText(lv.boss ? "JEFE · NV" : "NIVEL", 74, 20);
    c.font = "700 62px Rajdhani, sans-serif";
    c.fillStyle = "rgba(255,180,0,0.08)"; c.fillText("88", 74, 64);
    c.fillStyle = lv.boss ? M3C.error : M3C.amarillo; c.fillText(String(mapSel + 1).padStart(2, "0"), 74, 64);
    c.textAlign = "left";
    c.fillStyle = M3C.amarillo; c.font = "700 28px Rajdhani, sans-serif";
    c.fillText(lv.name.toUpperCase(), 166, 34);
    c.fillStyle = M3C.texto2; c.font = "700 17px Rajdhani, sans-serif";
    c.fillText(`${lv.moves} MOVIMIENTOS · ${best ? `RÉCORD ${best} PTS` : "SIN MARCA REGISTRADA"}`, 166, 70);
    for (let k = 0; k < 3; k++) drawStar(c, W - 78 + k * 26, 32, 10, k < stN);
  } else {
    const low = st.movesLeft <= 3 && st.phase === "play";
    c.fillStyle = M3C.texto2; c.font = "700 18px Rajdhani, sans-serif"; c.textAlign = "center";
    c.fillText(st.movesLeft === 1 && st.phase === "play" ? "ÚLTIMO" : "MOVIMIENTOS", 74, 20);
    c.font = "700 62px Rajdhani, sans-serif";
    c.fillStyle = "rgba(255,180,0,0.08)"; c.fillText("88", 74, 64);
    c.fillStyle = low ? M3C.error : M3C.amarillo; c.fillText(String(st.movesLeft).padStart(2, "0"), 74, 64);
    const gs = st.lv.goals, gw = (W - 164) / gs.length;
    gs.forEach((g, i) => {
      const x = 158 + i * gw, left = goalLeft(g), done = left <= 0;
      if (done) {
        c.fillStyle = "rgba(34,197,94,0.16)"; c.strokeStyle = M3C.exito; c.lineWidth = 1.5;
        c.beginPath(); c.roundRect(x + 2, 14, Math.min(gw - 8, 108), 54, 6); c.fill(); c.stroke();
      }
      drawGoalIcon(c, g, x + 26, 42, 48);
      c.textAlign = "left"; c.fillStyle = done ? M3C.exito : M3C.texto; c.font = `700 ${g.k === "score" ? 26 : 36}px Rajdhani, sans-serif`;
      c.fillText(done ? "OK" : String(left), x + 54, 44);
    });
    const nvTxt = `NV ${lvIdx + 1}/${LEVELS.length}`;
    c.font = "700 15px Rajdhani, sans-serif";
    const nw = Math.ceil(c.measureText(nvTxt).width) + 12;
    c.fillStyle = "#0b0f14"; c.strokeStyle = M3C.borde; c.lineWidth = 1;
    c.beginPath(); c.roundRect(W - 8 - nw, 6, nw, 20, 4); c.fill(); c.stroke();
    c.fillStyle = M3C.cian; c.textAlign = "right"; c.fillText(nvTxt, W - 14, 16);
    if (lastChain >= 2) {
      const chTxt = `CADENA ×${lastChain}`;
      const cw = Math.ceil(c.measureText(chTxt).width) + 12;
      const cx0 = W - 12 - nw - cw;
      c.fillStyle = "rgba(255,180,0,0.18)"; c.strokeStyle = M3C.amarillo; c.lineWidth = 1.2;
      c.beginPath(); c.roundRect(cx0, 6, cw, 20, 4); c.fill(); c.stroke();
      c.fillStyle = M3C.amarilloClaro; c.textAlign = "right"; c.fillText(chTxt, cx0 + cw - 6, 16);
    }
    // puntaje con tres marcas de estrella
    const bx = 158, bw = W - 172, by = H - 22, max = st.lv.stars[2] * 1.08, k = Math.min(1, shownScore / max);
    c.fillStyle = "#07090c"; c.fillRect(bx, by, bw, 12);
    c.fillStyle = M3C.amarillo; c.fillRect(bx, by, bw * k, 12);
    c.strokeStyle = "rgba(255,255,255,0.22)"; c.lineWidth = 1; c.strokeRect(bx, by, bw, 12);
    st.lv.stars.forEach((s) => {
      const sx = bx + (bw * s) / max;
      c.fillStyle = shownScore >= s ? "#ffffff" : "rgba(255,255,255,0.55)";
      c.fillRect(sx - 1, by - 2, 2, 16);
      drawStar(c, sx, by + 6, 9, shownScore >= s);
    });
    c.fillStyle = M3C.texto; c.font = "700 18px Rajdhani, sans-serif"; c.textAlign = "left"; c.fillText(String(Math.round(shownScore)), 12, H - 14);
  }
  c.fillStyle = "rgba(0,0,0,0.14)"; for (let i = 0; i < H; i += 3) c.fillRect(0, i, W, 1);
  dispTex?.update();
}

// ── Interfaz HTML (paneles, herramientas, pausa) ───────────────────────
let ui: HTMLElement | null = null;
let paused = false;
let quitAsk = false;
let resizeObs: (() => void) | null = null;
function $m(id: string) { return document.getElementById(id)!; }
function uiBlocksPlay() { return !ui || !st || paused || quitAsk || st.phase !== "play" || !$m("m3-overlay").classList.contains("hidden"); }

const goalLabel = (g: Goal) => g.k === "score" ? "Puntos" : g.k === "piece" ? PIECE_NAMES[g.t] + "s" : g.k === "crate" ? "Cajas" : g.k === "rust" ? "Óxido" : g.k === "chain" ? "Cadenas" : "Motores";
const goalImg = (g: Goal) => iconURL(`g-${g.k}-${"t" in g ? g.t : ""}`, (c, s) => drawGoalIcon(c, g, s / 2, s / 2, s * 0.9));
const toolImg = (t: Tool) => iconURL(`t-${t}`, (c, s) => drawToolIcon(c, t, s / 2, s / 2, s * 0.9));
function goalsHtml(showProgress: boolean) {
  if (!st) return "";
  return st.lv.goals.map((g) => {
    const n = goalProgress(st!, g), done = n >= g.n, pct = Math.round((n / g.n) * 100);
    return `<div class="m3-goal${done ? " done" : ""}" role="progressbar" aria-valuemin="0" aria-valuemax="${g.n}" aria-valuenow="${n}" aria-label="${goalLabel(g)}: ${n} de ${g.n}">
      <img class="m3-gicon" src="${goalImg(g)}" alt="">
      <span class="m3-gtext">${goalLabel(g)}</span>
      <span class="m3-gbar"><i style="width:${showProgress ? pct : 0}%"></i></span>
      <span class="m3-gnum">${showProgress ? `${n}/${g.n}` : g.n}</span>
    </div>`;
  }).join("");
}
const starsHtml = (n: number) => `<div class="m3-stars" aria-label="${n} de 3 estrellas">${[0, 1, 2].map((i) => `<svg viewBox="-12 -12 24 24" class="${i < n ? "on" : ""}" style="--i:${i}"><polygon points="${Array.from({ length: 10 }, (_, k) => { const a = -Math.PI / 2 + (k / 10) * Math.PI * 2, r = k % 2 ? 4.5 : 10.5; return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`; }).join(" ")}"/></svg>`).join("")}</div>`;
const toolsHtml = (tools: Partial<Record<Tool, number>>) => Object.entries(tools).filter(([, n]) => n).map(([t, n]) => `<span class="m3-chip"><img src="${toolImg(t as Tool)}" alt="">${TOOL_NAME[t as Tool]} x${n}</span>`).join("");

function showPanel(html: string, focus: string) {
  const ov = $m("m3-overlay"), panel = $m("m3-panel");
  ov.classList.remove("hidden");
  panel.innerHTML = html;
  ($m(focus) as HTMLButtonElement | null)?.focus();
}
function hidePanel() { $m("m3-overlay").classList.add("hidden"); }

function syncHud() {
  if (!ui) return;
  ui.classList.toggle("m3-playing", mode === "level" && st?.phase === "play" && !paused);
  $m("m3-pausebtn").classList.toggle("hidden", !(mode === "level" && st?.phase === "play"));
  syncTools();
  if (st) $m("m3-hud").textContent = `Movimientos ${st.movesLeft}. ${st.lv.goals.map((g) => `${goalLabel(g)}: faltan ${Math.max(0, goalLeft(g))}`).join(". ")}`;
  paintDisplay();
}
function syncTools() {
  const bar = $m("m3-tools");
  const on = mode === "level" && st?.phase === "play" && !paused && TOOLS.some((t) => toolCount(t) > 0);
  bar.classList.toggle("hidden", !on);
  if (!on) return;
  bar.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
    const t = b.dataset.tool as Tool, n = toolCount(t);
    b.disabled = n <= 0 || resolving;
    b.classList.toggle("on", tool === t);
    b.querySelector("b")!.textContent = String(n);
  });
}

function showIntro() {
  if (!st) return;
  const lv = st.lv, best = prog().best[lv.id];
  showPanel(`<p class="m3-kicker">Nivel ${lvIdx + 1} · ${lv.zone}</p><p class="m3-title${lv.boss ? " bad" : ""}">${lv.name.toUpperCase()}</p>
    <p class="m3-sub">${lv.desc}</p>
    <div class="m3-goals-vis">${goalsHtml(false)}</div>
    <p class="m3-meta">${lv.moves} movimientos${best ? ` · récord ${best}` : ""}</p>
    <p class="m3-tiers">Metas: ★ ${lv.stars[0]} · ★★ ${lv.stars[1]} · ★★★ ${lv.stars[2]}</p>
    <p class="m3-tip"><b>Nuevo</b>${lv.tip}</p>
    ${lv.tools ? `<div class="m3-chips"><span>Herramientas de prueba:</span>${toolsHtml(lv.tools)}</div>` : ""}
    <div class="m3-btns"><button type="button" class="primary" id="m3-play">Jugar</button><button type="button" id="m3-map">Mapa</button></div>`, "m3-play");
  $m("m3-play").onclick = () => { if (!st) return; startPlay(st); hidePanel(); syncHud(); SFX.accept(); };
  $m("m3-map").onclick = () => toMap();
}
function showWin(res: { first: boolean; stars: number; newBest: boolean }) {
  if (!st) return;
  const lv = st.lv, last = lvIdx >= LEVELS.length - 1;
  const reward = res.first && lv.reward ? `<div class="m3-chips"><span>Recompensa:</span>${toolsHtml(lv.reward)}</div>` : "";
  showPanel(`<p class="m3-kicker">Nivel ${lvIdx + 1} · ${lv.name}</p><p class="m3-title ok">${last ? "TRITURADORA APAGADA" : "PEDIDO COMPLETO"}</p>
    ${starsHtml(res.stars)}
    <p class="m3-score">${st.got.score}${res.newBest ? ` <span class="m3-best">nuevo récord</span>` : ""}</p>
    ${res.stars < 3 ? `<p class="m3-tiers">Siguiente estrella (${res.stars + 1}★): ${lv.stars[res.stars]} pts (faltaron ${Math.max(1, lv.stars[res.stars] - st.got.score)})</p>` : `<p class="m3-tiers ok">¡Nivel perfeccionado con 3 estrellas!</p>`}
    ${last && res.first ? `<p class="m3-sub">La Ruta del Desguace queda abierta de punta a punta. Se vienen más turnos en el taller.</p>` : ""}
    ${reward}
    <div class="m3-btns">${last ? "" : `<button type="button" class="primary" id="m3-next">Siguiente</button>`}<button type="button" id="m3-retry">Repetir</button><button type="button" id="m3-map">Mapa</button></div>`, last ? "m3-map" : "m3-next");
  if (!last) $m("m3-next").onclick = () => { mapSel = lvIdx + 1; startLevel(lvIdx + 1); };
  $m("m3-retry").onclick = () => startLevel(lvIdx);
  $m("m3-map").onclick = () => toMap();
}
function showLose() {
  if (!st) return;
  const miss = st.lv.goals.filter((g) => goalLeft(g) > 0).map((g) => `${goalLabel(g).toLowerCase()} (faltaron ${goalLeft(g)})`).join(", ");
  showPanel(`<p class="m3-kicker">Nivel ${lvIdx + 1} · ${st.lv.name}</p><p class="m3-title bad">SIN MOVIMIENTOS</p>
    <p class="m3-sub">Quedó pendiente: ${miss}.</p>
    <p class="m3-tiers">Puntaje alcanzado: ${st.got.score} pts${prog().best[st.lv.id] ? ` · Récord: ${prog().best[st.lv.id]} pts` : ""}</p>
    <div class="m3-goals-vis">${goalsHtml(true)}</div>
    <div class="m3-btns"><button type="button" class="primary" id="m3-retry">Reintentar</button><button type="button" id="m3-map">Mapa</button></div>`, "m3-retry");
  $m("m3-retry").onclick = () => startLevel(lvIdx);
  $m("m3-map").onclick = () => toMap();
}

/** Después de cada acción: victoria (con sobrecarga final), derrota o seguir. */
function afterAction() {
  if (!st) return;
  syncHud();
  if (st.phase === "win" && !finaleDone) {
    finaleDone = true;
    banner = { txt: st.movesLeft > 0 ? "SOBRECARGA FINAL" : "PEDIDO COMPLETO", t: 1.2, col: M3C.verde };
    SFX.m3Win();
    if (st.movesLeft > 0) {
      const pre = snap(st);
      const f = finale(st);
      for (const m of f.made) pre.board[m.y][m.x] = m.v; // las sierras aparecen ya puestas
      V = pre; resolving = true;
      anim = { kind: "pause", t: 0, dur: 0.7 * animMul() };
      steps = f.steps; stepIdx = -1; afterAnim = () => afterAction(); // la pausa avanza al primer paso
      return;
    }
  }
  if (st.phase === "win") { const r = recordWin(lvIdx, st.got.score); later = { t: 0.5, fn: () => showWin(r) }; }
  else if (st.phase === "lose") { SFX.back(); later = { t: 0.4, fn: () => showLose() }; }
}

// ── Acciones del jugador ───────────────────────────────────────────────
function attemptSwap(ax: number, ay: number, bx: number, by: number, free = false) {
  if (!st || resolving || uiBlocksPlay()) return;
  const pre = snap(st);
  const r = trySwap(st, ax, ay, bx, by, free);
  sel = null; armed = null;
  if (!r.ok) {
    if (r.reason === "no_match" || r.reason === "fixed") { SFX.duelFabReject(); if (!reducedMotion()) { V = pre; resolving = true; anim = { kind: "reject", ax, ay, bx, by, t: 0 }; } }
    return;
  }
  if (free) { spendTool("llave"); tool = null; }
  SFX.m3Swap();
  if (r.combo) { comboTxt = { txt: r.combo, t: 0 }; }
  syncHud();
  V = pre; resolving = true;
  steps = r.steps; stepIdx = 0; afterAnim = () => afterAction();
  if (reducedMotion()) { endSteps(); return; }
  anim = { kind: "swap", ax, ay, bx, by, t: 0 };
}
function applyTool(x: number, y: number) {
  if (!st || !tool || tool === "llave" || resolving || uiBlocksPlay() || toolCount(tool) <= 0) return;
  const pre = snap(st), t = tool;
  const r = useTool(st, t, x, y);
  if (!r) { SFX.duelFabReject(); return; }
  spendTool(t); tool = null; sel = null;
  SFX.accept();
  V = pre; resolving = true;
  syncHud();
  startSteps(r, () => afterAction());
}
function armTool(t: Tool | null) {
  if (!st || st.phase !== "play" || resolving) return;
  tool = t && tool !== t && toolCount(t) > 0 ? t : null;
  armed = null;
  SFX.click();
  syncTools();
}

// ── Flujo ──────────────────────────────────────────────────────────────
function toMap() {
  later = null; mode = "map"; st = null; V = null; anim = null; resolving = false; tool = null; sel = null; armed = null;
  paused = false; $m("m3-pause").classList.remove("on");
  mapSel = Math.min(mapSel, openIdx());
  hidePanel(); syncHud(); SFX.back();
}
function startLevel(i: number) {
  later = null; lvIdx = i; mode = "level"; attempt++;
  st = newMatch3(LEVELS[i], baseSeed + i * 1009 + attempt);
  layoutBoard();
  V = null; anim = null; resolving = false; tool = null; sel = null; armed = null; finaleDone = false; shownScore = 0; lastChain = 0;
  parts.length = beams.length = rings.length = bolts.length = floats.length = 0; banner = null; comboTxt = null;
  paused = false; $m("m3-pause").classList.remove("on");
  showIntro(); syncHud(); SFX.accept();
}
function openSelected() {
  if (mapSel > openIdx()) { SFX.duelFabReject(); return; }
  startLevel(mapSel);
}

export function match3PauseToggle() {
  if (!active || mode !== "level" || !st || st.phase !== "play" || resolving || menuScr() === "config") return;
  paused = !paused;
  quitAsk = false;
  if (paused && st) {
    $m("m3-pause-t").textContent = `PAUSA · NV ${lvIdx + 1}`;
    $m("m3-pause-meta").textContent = `${st.lv.name} · Puntaje: ${st.got.score} · Movimientos: ${st.movesLeft}`;
  }
  $m("m3-pause").classList.toggle("on", paused);
  $m("m3-pause").setAttribute("aria-hidden", String(!paused));
  $m("m3-confirm")?.classList.add("hidden");
  if (paused) ($m("m3-resume") as HTMLButtonElement).focus();
  syncHud();
}
const needsExitConfirm = () => mode === "level" && !!st && st.phase === "play" && st.used > 0;
function showExitConfirm(then: () => void) {
  quitAsk = true;
  const box = $m("m3-confirm"), yes = $m("m3-confirm-yes"), no = $m("m3-confirm-no");
  box.classList.remove("hidden"); box.setAttribute("aria-hidden", "false");
  const close = () => { quitAsk = false; box.classList.add("hidden"); box.setAttribute("aria-hidden", "true"); yes.onclick = null; no.onclick = null; };
  yes.onclick = () => { close(); then(); };
  no.onclick = () => { close(); (paused ? $m("m3-resume") : $m("m3-overlay"))?.focus(); };
  no.focus();
}
/** Atrás: del nivel al mapa (confirmando si ya se jugó), del mapa afuera del gabinete. */
function goBack() {
  if (mode === "map") return exitMatch3();
  if (needsExitConfirm()) showExitConfirm(toMap); else toMap();
}

function ensureUi() {
  if (ui) return;
  ui = document.createElement("div");
  ui.id = "match3-ui";
  ui.innerHTML = `<div class="m3-hud" id="m3-hud" aria-live="polite"></div><button type="button" class="m3-pausebtn hidden" id="m3-pausebtn" aria-label="Pausa"><i></i><i></i></button>
<div class="m3-tools hidden" id="m3-tools" role="toolbar" aria-label="Herramientas del taller">${TOOLS.map((t, i) => `<button type="button" data-tool="${t}" aria-label="${TOOL_NAME[t]} (tecla ${i + 1})"><img src="${toolImg(t)}" alt=""><span>${TOOL_NAME[t]}</span><b>0</b></button>`).join("")}</div>
<div class="m3-hint hidden" id="m3-hint"></div>
<div class="m3-overlay hidden" id="m3-overlay"><div class="m3-panel" id="m3-panel"></div></div>
<div class="m3-pause" id="m3-pause" role="dialog" aria-modal="true" aria-labelledby="m3-pause-t" aria-hidden="true">
<p class="m3-title" id="m3-pause-t">PAUSA</p><p class="m3-tiers" id="m3-pause-meta"></p><p class="m3-sub m3-pause-help">Juntar 3 o más iguales. 4 = sierra, L = bomba, T = prensa, 5 = núcleo. Dos especiales juntos se combinan.</p><div class="m3-btns">
<button type="button" class="primary" id="m3-resume">Reanudar</button><button type="button" id="m3-pause-restart">Reiniciar</button><button type="button" id="m3-pause-map">Mapa</button><button type="button" id="m3-config">Opciones</button><button type="button" id="m3-quit">Salir del gabinete</button></div></div>
<div class="m3-confirm hidden" id="m3-confirm" role="alertdialog" aria-labelledby="m3-confirm-t" aria-hidden="true"><div class="m3-panel m3-confirm-box">
<p class="m3-title" id="m3-confirm-t">¿Abandonar el nivel?</p><p class="m3-sub">Las estrellas ya ganadas se conservan; este intento no.</p>
<div class="m3-btns"><button type="button" id="m3-confirm-no">Seguir jugando</button><button type="button" class="primary" id="m3-confirm-yes">Abandonar</button></div></div></div>`;
  document.body.appendChild(ui);
  ui.querySelectorAll<HTMLButtonElement>("#m3-tools button").forEach((b) => { b.onclick = () => armTool(b.dataset.tool as Tool); });
  $m("m3-resume").onclick = () => match3PauseToggle();
  $m("m3-pausebtn").onclick = () => { if (!resolving) match3PauseToggle(); };
  $m("m3-pause-restart").onclick = () => { const go = () => startLevel(lvIdx); if (needsExitConfirm()) showExitConfirm(go); else go(); };
  $m("m3-pause-map").onclick = () => goBack();
  $m("m3-config").onclick = () => { if (active) openM3Config(); };
  $m("m3-quit").onclick = () => { if (needsExitConfirm()) showExitConfirm(exitMatch3); else exitMatch3(); };
  document.getElementById("tPause")?.addEventListener("click", () => { if (active && !resolving) match3PauseToggle(); }, true);
}

// ── Gabinete 3D ────────────────────────────────────────────────────────
function buildCabinet() {
  if (arcade) { arcade.show(true); return; } // armado en una entrada anterior: se reusa (la pantalla se repinta al empezar)
  arcade = buildArcade(D.scene);
  // Pantalla y display: emisivos sin iluminación (la imagen la da el propio tubo); el vidrio de adelante pone el reflejo.
  const mkT = (name: string, w: number, h: number) => {
    const t = new B.DynamicTexture(name, { width: w, height: h }, D.scene, true);
    t.hasAlpha = false;
    const m = new B.PBRMaterial(name + "M", D.scene);
    m.disableLighting = true; m.fogEnabled = false; m.metallic = 0; m.roughness = 1; m.environmentIntensity = 0; m.albedoColor = B.Color3.Black(); m.emissiveColor = B.Color3.White(); m.emissiveTexture = t;
    return { t, m };
  };
  const s = mkT("m3tex", TEX_PX, TEX_PX), d = mkT("m3disp", DISP_W, DISP_H);
  tex = s.t; arcade.screen.material = s.m;
  dispTex = d.t; arcade.display.material = d.m; arcade.display.isPickable = false;
  texCtx = tex.getContext() as unknown as CanvasRenderingContext2D;
  dispCtx = dispTex.getContext() as unknown as CanvasRenderingContext2D;
}
// Cámara fija frente a la máquina, centrada en la pantalla: tablero ~65 % del alto en compu, casi todo el ancho en celular;
// el display de objetivos entra entero y la marquesina asoma arriba.
function fitMatch3Camera() {
  if (!arcade) return;
  const eng = D.scene.getEngine();
  const w = eng.getRenderWidth(), h = Math.max(eng.getRenderHeight(), 1), aspect = w / h;
  const fov = 0.62, t = Math.tan(fov / 2);
  const ms = arcade.mustSee, target = ms.reduce((acc, v) => acc.add(v), B.Vector3.Zero()).scale(1 / ms.length);
  const xs = ms.map((v) => v.x), ys = ms.map((v) => v.y);
  const needW = Math.max(...xs) - Math.min(...xs) + 0.02, needH = (Math.max(...ys) - Math.min(...ys)) / 0.72;
  const dist = Math.max(needH / (2 * t), needW / (2 * t * aspect));
  target.y += 0.07; // deja asomar la marquesina
  D.cam.fov = fov;
  D.cam.minZ = 0.05;
  D.cam.position.set(target.x, target.y + 0.12, target.z - dist);
  D.cam.setTarget(target);
}
function placePauseBtn() {
  if (!arcade || !ui) return;
  const canvas = D.scene.getEngine().getRenderingCanvas() as HTMLCanvasElement;
  const r = canvas.getBoundingClientRect();
  const p = B.Vector3.Project(arcade.pauseAnchor, B.Matrix.Identity(), D.scene.getTransformMatrix(), D.cam.viewport.toGlobal(r.width, r.height));
  const b = $m("m3-pausebtn"), half = 26;
  b.style.left = `${Math.min(Math.max(p.x, half + 6), r.width - half - 6) - half}px`;
  b.style.top = `${Math.min(Math.max(p.y, half + 6), r.height - half - 6) - half}px`;
}
/** Punto de la pantalla (en px de la textura) bajo el puntero, o null. */
function texFromPick(px: number, py: number): { u: number; v: number } | null {
  if (!arcade) return null;
  const screen = arcade.screen;
  const pick = D.scene.pick(px, py, (m) => m === screen);
  if (!pick?.hit) return null;
  const uv = pick.getTextureCoordinates();
  return uv ? { u: uv.x * TEX_PX, v: (1 - uv.y) * TEX_PX } : null;
}
function cellAt(u: number, v: number) {
  if (!st) return null;
  const x = Math.floor((u - OX) / CELL), y = Math.floor((v - OY) / CELL);
  return x < 0 || y < 0 || x >= st.w || y >= st.h ? null : { x, y };
}
function texToPx(u: number, v: number) {
  if (!arcade) return null;
  const local = new B.Vector3(u / TEX_PX - 0.5, 0.5 - v / TEX_PX, 0).scale(arcade.screen.getBoundingInfo().boundingBox.extendSize.x * 2);
  const w = B.Vector3.TransformCoordinates(local, arcade.screen.computeWorldMatrix(true));
  const r = (D.scene.getEngine().getRenderingCanvas() as HTMLCanvasElement).getBoundingClientRect();
  const p = B.Vector3.Project(w, B.Matrix.Identity(), D.scene.getTransformMatrix(), D.cam.viewport.toGlobal(r.width, r.height));
  return { x: p.x + r.left, y: p.y + r.top };
}
const cellPx = (x: number, y: number) => texToPx(OX + (x + 0.5) * CELL, OY + (y + 0.5) * CELL);

// ── Entrada ────────────────────────────────────────────────────────────
let stickDrag: { x: number; y: number } | null = null;
const stickTilt = { x: 0, z: 0 };
let capT = 0, stickRep = 0;
const STICK_MAX = 0.4;
function propPick(px: number, py: number) {
  if (!arcade) return null;
  const a = arcade;
  const pk = D.scene.pick(px, py, (m) => m === a.cap || a.stickPick.includes(m as B.Mesh));
  return pk?.hit ? (pk.pickedMesh === a.cap ? "btn" : "stick") : null;
}
function onPointerMove(e: PointerEvent) {
  if (!stickDrag) return;
  const k = 0.012, clamp = (v: number) => Math.max(-STICK_MAX, Math.min(STICK_MAX, v));
  stickTilt.z = clamp(-(e.clientX - stickDrag.x) * k);
  stickTilt.x = clamp(-(e.clientY - stickDrag.y) * k);
  const m = Math.hypot(stickTilt.x, stickTilt.z);
  if (m > STICK_MAX) { stickTilt.x *= STICK_MAX / m; stickTilt.z *= STICK_MAX / m; }
}
function tickProps(dt: number) {
  if (!arcade) return;
  if (!stickDrag) { const f = Math.exp(-14 * dt); stickTilt.x *= f; stickTilt.z *= f; }
  const ax = Math.abs(stickTilt.z), ay = Math.abs(stickTilt.x);
  if (Math.max(ax, ay) > STICK_MAX * 0.6) {
    stickRep -= dt;
    if (stickRep <= 0) { navKey(ax > ay ? (stickTilt.z < 0 ? "ArrowRight" : "ArrowLeft") : (stickTilt.x < 0 ? "ArrowDown" : "ArrowUp")); stickRep = 0.35; }
  } else stickRep = 0;
  arcade.stick.rotation.set(stickTilt.x, 0, stickTilt.z);
  if (capT > 0) capT = Math.max(0, capT - dt);
  arcade.cap.position.y = capT > 0 ? -0.009 : 0;
  arcade.capMat.emissiveColor = B.Color3.FromHexString(M3C.rojo).scale(capT > 0 ? 1 : 0.25);
}
const overlayOpen = () => !$m("m3-overlay").classList.contains("hidden") || paused || quitAsk;
function onPointerDown(e: PointerEvent) {
  if (!active) return;
  const rect = (D.scene.getEngine().getRenderingCanvas() as HTMLCanvasElement).getBoundingClientRect();
  const px = e.clientX - rect.left, py = e.clientY - rect.top;
  const hit = overlayOpen() || resolving ? null : texFromPick(px, py);
  if (hit && mode === "map") {
    e.preventDefault();
    const my = hit.v + mapScroll;
    if (hit.v > TEX_PX - 58) { openSelected(); return; } // la ficha del pie también abre
    const i = LEVELS.findIndex((_, k) => Math.hypot(nodePos(k).x - hit.u, nodePos(k).y - my) < 40);
    if (i >= 0) { if (i > openIdx()) { SFX.duelFabReject(); return; } mapSel = i; SFX.click(); openSelected(); }
    return;
  }
  const c = hit && mode === "level" && !uiBlocksPlay() ? cellAt(hit.u, hit.v) : null;
  if (!c) {
    const pr = !overlayOpen() ? propPick(px, py) : null;
    if (pr === "stick") { e.preventDefault(); stickDrag = { x: e.clientX, y: e.clientY }; }
    else if (pr === "btn") { e.preventDefault(); capT = 0.16; SFX.click(); navKey("Enter"); }
    return;
  }
  e.preventDefault();
  if (tool && tool !== "llave") { applyTool(c.x, c.y); return; }
  if (sel && Math.abs(c.x - sel.x) + Math.abs(c.y - sel.y) === 1) { const f = sel; sel = null; attemptSwap(f.x, f.y, c.x, c.y, tool === "llave"); return; }
  dragFrom = c; dragPx = { x: e.clientX, y: e.clientY }; sel = c;
}
function onPointerUp(e: PointerEvent) {
  stickDrag = null;
  if (!dragFrom || !active || !st) return;
  const rect = (D.scene.getEngine().getRenderingCanvas() as HTMLCanvasElement).getBoundingClientRect();
  const f = dragFrom; dragFrom = null;
  const dx = e.clientX - dragPx.x, dy = e.clientY - dragPx.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < Math.max(14, rect.width * 0.02)) return;
  const sx = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0, sy = sx ? 0 : Math.sign(dy);
  const tx = f.x + sx, ty = f.y + sy;
  if (tx < 0 || ty < 0 || tx >= st.w || ty >= st.h) return;
  sel = null;
  attemptSwap(f.x, f.y, tx, ty, tool === "llave");
}
function onKey(e: KeyboardEvent) {
  if (!active || e.repeat || menuScr() === "config") return;
  if (quitAsk && !$m("m3-confirm").classList.contains("hidden")) { if (e.code === "Escape") { e.preventDefault(); $m("m3-confirm-no").click(); } return; }
  if (e.code === "Escape") {
    e.preventDefault();
    if (paused) return match3PauseToggle();
    if (tool) return armTool(null);
    if (mode === "level" && st?.phase === "play" && !resolving) return match3PauseToggle();
    if (!resolving) goBack();
    return;
  }
  const n = ["Digit1", "Digit2", "Digit3", "Digit4"].indexOf(e.code);
  if (n >= 0 && mode === "level") { e.preventDefault(); armTool(TOOLS[n]); return; }
  if (navKey(e.code)) e.preventDefault();
}
/** Flechas + Enter (teclado y joystick/botón del panel): en el mapa eligen nivel, en el tablero mueven el cursor. */
function navKey(code: string) {
  if (mode === "map") {
    if (overlayOpen()) return false;
    if (code === "Enter" || code === "Space") { openSelected(); return true; }
    const d = code === "ArrowUp" || code === "ArrowRight" ? 1 : code === "ArrowDown" || code === "ArrowLeft" ? -1 : 0;
    if (!d) return false;
    const n = Math.max(0, Math.min(openIdx(), mapSel + d));
    if (n !== mapSel) { mapSel = n; SFX.blip(); }
    return true;
  }
  if (!st || resolving || uiBlocksPlay()) {
    return false;
  }
  if (code === "Enter" || code === "Space") {
    if (!sel) sel = { x: 0, y: 0 };
    if (tool && tool !== "llave") { applyTool(sel.x, sel.y); return true; }
    if (!armed) { armed = { ...sel }; return true; }
    if (armed.x === sel.x && armed.y === sel.y) { armed = null; return true; }
    attemptSwap(armed.x, armed.y, sel.x, sel.y, tool === "llave");
    return true;
  }
  if (!sel) sel = { x: 0, y: 0 };
  let nx = sel.x, ny = sel.y;
  if (code === "ArrowLeft") nx--; else if (code === "ArrowRight") nx++; else if (code === "ArrowUp") ny--; else if (code === "ArrowDown") ny++; else return false;
  if (nx >= 0 && ny >= 0 && nx < st.w && ny < st.h) sel = { x: nx, y: ny };
  return true;
}

// ── Ciclo de vida ──────────────────────────────────────────────────────
export function initMatch3(d: Deps) { D = d; ensureUi(); }
export function match3Active() { return active; }

// El gabinete vive en su propio taller de ladrillo: se apaga el patio entero al entrar
export function startMatch3(seed = 20261007) {
  ensureUi();
  showWorld(false);
  buildCabinet();
  baseSeed = seed;
  active = true; paused = false; resolving = false; sel = null;
  mode = "map"; st = null;
  mapSel = openIdx(); mapScroll = mapTarget();
  ui!.classList.add("on");
  hidePanel(); syncHud(); paintScreen();
  applyClimate(DUSK);
  setDark(0.22);
  fitMatch3Camera();
  placePauseBtn();
  document.body.classList.add("match3-play");
  document.getElementById("touch")?.classList.add("match3-only", "hidden");
  music("menu");
  const canvas = D.scene.getEngine().getRenderingCanvas() as HTMLCanvasElement;
  canvas.style.touchAction = "none";
  canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
  canvas.addEventListener("pointerup", onPointerUp, { passive: false });
  canvas.addEventListener("pointercancel", onCancel);
  addEventListener("pointermove", onPointerMove);
  addEventListener("keydown", onKey);
  resizeObs = () => { fitMatch3Camera(); placePauseBtn(); };
  addEventListener("resize", resizeObs);
  // dev: ?match3&lvl=N abre directo ese nivel
  const q = new URLSearchParams(location.search).get("lvl");
  if (import.meta.env.DEV && q) startLevel(Math.max(0, Math.min(LEVELS.length - 1, Number(q) - 1)));
}
const onCancel = () => { dragFrom = null; stickDrag = null; };

export function exitMatch3() {
  if (!active) return;
  active = false; paused = false; quitAsk = false; resolving = false; anim = null; V = null; st = null; tool = null;
  ui?.classList.remove("on", "m3-playing");
  $m("m3-pause")?.classList.remove("on");
  $m("m3-confirm")?.classList.add("hidden");
  hidePanel();
  document.body.classList.remove("match3-play");
  document.getElementById("touch")?.classList.remove("match3-only");
  if (resizeObs) { removeEventListener("resize", resizeObs); resizeObs = null; }
  arcade?.show(false); // queda armado y escondido para la próxima entrada (~40 ms menos)
  const canvas = D.scene.getEngine().getRenderingCanvas() as HTMLCanvasElement;
  canvas.style.touchAction = "";
  canvas.removeEventListener("pointerdown", onPointerDown);
  canvas.removeEventListener("pointerup", onPointerUp);
  canvas.removeEventListener("pointercancel", onCancel);
  removeEventListener("pointermove", onPointerMove);
  stickDrag = null; capT = 0;
  removeEventListener("keydown", onKey);
  D.onExit();
}

export function match3Tick(dt: number) {
  if (!active) return;
  T += dt;
  tickAnim(dt);
  tickFx(dt);
  tickProps(dt);
  if (later && (later.t -= dt) <= 0) { const f = later.fn; later = null; if (st) f(); }
  if (mode === "map") mapScroll += (mapTarget() - mapScroll) * Math.min(1, dt * 6);
  if (st) { const d = st.got.score - shownScore; shownScore = Math.abs(d) < 1 ? st.got.score : shownScore + d * Math.min(1, dt * 8); }
  paintScreen();
  paintDisplay();
  if (mode === "level") syncTools();
  placePauseBtn();
}

// ── Herramientas de desarrollo (window.__match3, solo dev) ─────────────
export const match3Dev = {
  info: () => st ? { mode, level: lvIdx + 1, phase: st.phase, moves: st.movesLeft, score: st.got.score, got: st.got, goals: st.lv.goals.map((g) => ({ ...g, done: goalProgress(st!, g) })), seed: st.seed, resolving }
    : { mode, phase: mode === "map" ? "map" : "off", open: openIdx() + 1, sel: mapSel + 1 },
  /** Abre el nivel N (1..10) en su panel de objetivos; `play` lo arranca directo. */
  level: (n: number, play = false) => { startLevel(Math.max(0, Math.min(LEVELS.length - 1, n - 1))); if (play && st) { startPlay(st); hidePanel(); syncHud(); } },
  map: () => toMap(),
  unlockAll: () => { for (const lv of LEVELS) prog().stars[lv.id] ||= 1; persist(); },
  resetProgress: () => { prog().stars = {}; prog().best = {}; prog().tools = {}; persist(); mapSel = 0; },
  give: (t: Tool, n = 3) => { prog().tools[t] = (prog().tools[t] ?? 0) + n; persist(); syncTools(); },
  /** Pone un especial: `put(x, y, "h"|"v"|"bomb"|"cross"|"core", color)`. */
  put: (x: number, y: number, k: "h" | "v" | "bomb" | "cross" | "core", color = 0) => { if (!st) return; st.board[y][x] = k === "core" ? 40 : mk(color, { h: 1, v: 2, bomb: 3, cross: 4 }[k]); },
  win: () => { if (!st) return; startPlay(st); hidePanel(); for (const g of st.lv.goals) { if (g.k === "score") st.got.score = Math.max(st.got.score, g.n); else if (g.k === "piece") st.got.piece[g.t] = g.n; else st.got[g.k] = g.n; } st.phase = "win"; afterAction(); },
  lose: () => { if (!st) return; startPlay(st); hidePanel(); st.movesLeft = 0; st.phase = "lose"; afterAction(); },
  setPhase: (p: "win" | "lose") => (p === "win" ? match3Dev.win() : match3Dev.lose()),
  start: () => { if (st) { startPlay(st); hidePanel(); syncHud(); } },
  swap: (ax: number, ay: number, bx: number, by: number) => { if (!st) return null; const r = trySwap(st, ax, ay, bx, by); syncHud(); if (r.ok) afterAction(); return r.ok ? { ok: true, combo: r.combo, steps: r.steps.length } : r; },
  tool: (t: Tool, x: number, y: number) => { armTool(t); applyTool(x, y); },
  board: () => st?.board.map((r) => r.map((v) => (v < 0 ? v : spOf(v) ? `${colorOf(v)}${"·hvbx"[spOf(v)]}` : v))),
  cellPx,
  nodePx: (i: number) => { const p = nodePos(i - 1); return texToPx(p.x, p.y - mapScroll); },
  sel: () => sel,
  props: () => (arcade ? { tilt: Math.hypot(arcade.stick.rotation.x, arcade.stick.rotation.z), rx: arcade.stick.rotation.x, rz: arcade.stick.rotation.z, cap: arcade.cap.position.y } : null),
  propPx: (which: "stick" | "btn") => {
    if (!arcade) return null;
    const m = which === "btn" ? arcade.cap : arcade.stickPick[1];
    const r = (D.scene.getEngine().getRenderingCanvas() as HTMLCanvasElement).getBoundingClientRect();
    const p = B.Vector3.Project(m.getAbsolutePosition(), B.Matrix.Identity(), D.scene.getTransformMatrix(), D.cam.viewport.toGlobal(r.width, r.height));
    return { x: p.x + r.left, y: p.y + r.top };
  },
  ready: () => { syncHud(); paintScreen(); },
};
