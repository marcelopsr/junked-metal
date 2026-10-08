// Dibujo 2D de Junket Crush sobre el canvas de la pantalla del gabinete: piezas, especiales, obstáculos, efectos y la Ruta del Desguace.
// Sin estado de juego: recibe lo que pinta. Paleta M3C (kit3d.ts).
import { M3C } from "./match3_scene";
import { CARGO, CORE, SP, colorOf, spOf, type Goal, type LevelDef, type Tool } from "./match3_logic";

type C = CanvasRenderingContext2D;
export const PIECE_NAMES = ["Tuerca", "Cristal", "Batería", "Chip", "Componente", "Resorte"];
export const PIECE_COL = [M3C.amarillo, M3C.rojo, M3C.verde, M3C.azul, M3C.texto2, M3C.naranja];
const INK = "#0B0F14";

const poly = (c: C, pts: number[][]) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
const hexA = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, k: number) => { const A = hexA(a), Bc = hexA(b); return `rgb(${A.map((v, i) => Math.round(v + (Bc[i] - v) * k)).join(",")})`; };
function shade(c: C, col: string, cx: number, cy: number, r: number) {
  const g = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  g.addColorStop(0, mix(col, "#ffffff", 0.45)); g.addColorStop(0.5, col); g.addColorStop(1, mix(col, "#000000", 0.45));
  return g;
}

/** Pieza común por color (forma propia: se distingue sin color). */
function drawBase(c: C, type: number, cx: number, cy: number, r: number) {
  const col = PIECE_COL[type] ?? "#888";
  c.lineWidth = Math.max(1.5, r * 0.11); c.strokeStyle = INK; c.lineJoin = "round";
  if (type === 0) { // tuerca hexagonal
    const hex = (rr: number) => Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });
    poly(c, hex(r)); c.fillStyle = shade(c, col, cx, cy, r); c.fill(); c.stroke();
    poly(c, hex(r * 0.72)); c.strokeStyle = "rgba(255,255,255,0.25)"; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = "#2a1c05"; c.beginPath(); c.arc(cx, cy, r * 0.36, 0, Math.PI * 2); c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
  } else if (type === 1) { // cristal
    const w = r * 0.68;
    poly(c, [[cx, cy - r * 1.08], [cx + w, cy], [cx, cy + r * 1.08], [cx - w, cy]]); c.fillStyle = col; c.fill(); c.stroke();
    c.fillStyle = "rgba(255,255,255,0.35)"; poly(c, [[cx, cy - r * 1.08], [cx - w, cy], [cx, cy]]); c.fill();
    c.fillStyle = "rgba(0,0,0,0.3)"; poly(c, [[cx, cy + r * 1.08], [cx + w, cy], [cx, cy]]); c.fill();
  } else if (type === 2) { // batería
    const w = r * 0.62, hh = r * 0.98;
    c.fillStyle = "#9CA3AF"; c.fillRect(cx - w * 0.35, cy - hh - r * 0.18, w * 0.7, r * 0.2);
    c.beginPath(); c.roundRect(cx - w, cy - hh, w * 2, hh * 2, w * 0.3); c.fillStyle = shade(c, col, cx, cy, r); c.fill(); c.stroke();
    c.fillStyle = M3C.amarilloClaro; poly(c, [[cx + w * 0.15, cy - hh * 0.6], [cx - w * 0.45, cy + hh * 0.08], [cx - w * 0.02, cy + hh * 0.08], [cx - w * 0.2, cy + hh * 0.55], [cx + w * 0.45, cy - hh * 0.12], [cx + w * 0.02, cy - hh * 0.12]]); c.fill();
    c.lineWidth = 1.2; c.stroke();
  } else if (type === 3) { // chip
    const q = r * 0.78;
    c.fillStyle = "#9CA3AF";
    for (let i = -1; i <= 1; i++) for (const s of [-1, 1]) { c.fillRect(cx + i * q * 0.55 - r * 0.08, cy + s * q - (s < 0 ? r * 0.28 : 0), r * 0.16, r * 0.28); c.fillRect(cx + s * q - (s < 0 ? r * 0.28 : 0), cy + i * q * 0.55 - r * 0.08, r * 0.28, r * 0.16); }
    c.beginPath(); c.roundRect(cx - q, cy - q, q * 2, q * 2, r * 0.15); c.fillStyle = shade(c, col, cx, cy, r); c.fill(); c.stroke();
    c.fillStyle = M3C.cian; c.fillRect(cx - q * 0.5, cy - q * 0.5, q, q);
  } else if (type === 4) { // componente con tornillos
    const w = r * 1.05, hh = r * 0.62;
    c.beginPath(); c.roundRect(cx - w, cy - hh, w * 2, hh * 2, hh * 0.35); c.fillStyle = shade(c, col, cx, cy, r); c.fill(); c.stroke();
    c.fillStyle = "#374151"; c.fillRect(cx - w * 0.45, cy - hh * 0.45, w * 0.9, hh * 0.9);
    for (const s of [-1, 1]) { c.fillStyle = "#e5e7eb"; c.beginPath(); c.arc(cx + s * w * 0.72, cy, r * 0.15, 0, Math.PI * 2); c.fill(); c.stroke(); }
  } else { // resorte
    c.strokeStyle = INK; c.lineWidth = r * 0.42;
    const coil = () => { c.beginPath(); for (let i = 0; i <= 4; i++) { const yy = cy - r + (i / 4) * r * 2; c.moveTo(cx - r * 0.75, yy - r * 0.18); c.lineTo(cx + r * 0.75, yy + r * 0.18); } };
    coil(); c.stroke(); c.strokeStyle = col; c.lineWidth = r * 0.24; coil(); c.stroke();
  }
}

/** Pieza (común, especial, núcleo o carga). `t` = tiempo (animación de los especiales). */
export function drawPiece(c: C, v: number, cx: number, cy: number, size: number, scale = 1, lift = 0, glow = 0, t = 0) {
  const r = size * 0.4 * scale;
  if (r < 1) return;
  c.fillStyle = "rgba(0,0,0,0.5)";
  c.beginPath(); c.ellipse(cx + r * 0.12 + lift * 3, cy + r * 0.2 + lift * 5, r * 0.95, r * 0.95, 0, 0, Math.PI * 2); c.fill();
  cy -= lift * 4;
  if (glow > 0) { c.shadowColor = M3C.amarilloClaro; c.shadowBlur = 14 * glow; }
  if (v === CORE) drawCore(c, cx, cy, r, t);
  else if (v === CARGO) drawCargo(c, cx, cy, r);
  else {
    const s = spOf(v);
    if (s) { // aura del especial: late para que se note en el tablero
      c.save(); c.globalAlpha *= 0.35 + 0.2 * Math.sin(t * 6); c.fillStyle = s === SP.BOMB ? M3C.naranja : s === SP.CROSS ? M3C.especial : M3C.cian;
      c.beginPath(); c.arc(cx, cy, r * 1.25, 0, Math.PI * 2); c.fill(); c.restore();
    }
    drawBase(c, colorOf(v), cx, cy, r);
    c.shadowBlur = 0;
    // brillo especular arriba a la izquierda: da volumen sin textura
    c.fillStyle = "rgba(255,255,255,0.32)"; c.beginPath(); c.ellipse(cx - r * 0.32, cy - r * 0.42, r * 0.28, r * 0.13, -0.6, 0, Math.PI * 2); c.fill();
    if (s === SP.H || s === SP.V) drawSaw(c, cx, cy, r, s === SP.H, t);
    else if (s === SP.BOMB) drawBombMark(c, cx, cy, r, t);
    else if (s === SP.CROSS) drawPressMark(c, cx, cy, r);
  }
  c.shadowBlur = 0;
}

/** Sierra: dos flechas dentadas en el sentido que barre. */
function drawSaw(c: C, cx: number, cy: number, r: number, horiz: boolean, t: number) {
  c.save(); c.translate(cx, cy); if (!horiz) c.rotate(Math.PI / 2);
  c.fillStyle = M3C.texto; c.strokeStyle = INK; c.lineWidth = 1.5;
  c.beginPath(); c.rect(-r * 1.05, -r * 0.13, r * 2.1, r * 0.26); c.fill(); c.stroke();
  const ph = (t * 3) % 1;
  for (let i = 0; i < 5; i++) { const x = -r * 0.9 + ((i + ph) / 5) * r * 1.8; poly(c, [[x, -r * 0.13], [x + r * 0.12, -r * 0.3], [x + r * 0.24, -r * 0.13]]); c.fill(); }
  for (const s of [-1, 1]) { poly(c, [[s * r * 1.32, 0], [s * r * 0.98, -r * 0.3], [s * r * 0.98, r * 0.3]]); c.fillStyle = M3C.cian; c.fill(); c.stroke(); }
  c.restore();
}
/** Bomba de chatarra: anillo de remaches y mecha encendida. */
function drawBombMark(c: C, cx: number, cy: number, r: number, t: number) {
  c.strokeStyle = INK; c.lineWidth = 2;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.fillStyle = M3C.naranja; c.beginPath(); c.arc(cx + Math.cos(a) * r * 1.02, cy + Math.sin(a) * r * 1.02, r * 0.14, 0, Math.PI * 2); c.fill(); c.stroke(); }
  c.fillStyle = Math.sin(t * 18) > 0 ? M3C.amarilloClaro : M3C.rojo; c.beginPath(); c.arc(cx + r * 0.7, cy - r * 0.95, r * 0.18, 0, Math.PI * 2); c.fill();
}
/** Prensa (T): cruz de vigas violetas. */
function drawPressMark(c: C, cx: number, cy: number, r: number) {
  c.fillStyle = M3C.especial; c.strokeStyle = INK; c.lineWidth = 1.5;
  c.beginPath(); c.rect(cx - r * 1.15, cy - r * 0.12, r * 2.3, r * 0.24); c.rect(cx - r * 0.12, cy - r * 1.15, r * 0.24, r * 2.3); c.fill(); c.stroke();
  c.fillStyle = M3C.texto; c.beginPath(); c.arc(cx, cy, r * 0.2, 0, Math.PI * 2); c.fill(); c.stroke();
}
/** Núcleo: reactor redondo con engranaje girando y rayos. */
function drawCore(c: C, cx: number, cy: number, r: number, t: number) {
  const g = c.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 1.1);
  g.addColorStop(0, "#ffffff"); g.addColorStop(0.35, M3C.cian); g.addColorStop(1, "#0b3a55");
  c.fillStyle = g; c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.arc(cx, cy, r * 1.05, 0, Math.PI * 2); c.fill(); c.stroke();
  c.save(); c.translate(cx, cy); c.rotate(t * 2);
  c.strokeStyle = "rgba(11,15,20,0.75)"; c.lineWidth = r * 0.16;
  for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(r * 0.3, 0); c.lineTo(r * 0.82, 0); c.stroke(); }
  c.restore();
  PIECE_COL.slice(0, 5).forEach((col, i) => { const a = t * 1.5 + (i / 5) * Math.PI * 2; c.fillStyle = col; c.beginPath(); c.arc(cx + Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.72, r * 0.13, 0, Math.PI * 2); c.fill(); });
}
/** Carga: bloque de motor con franjas de peligro y flecha hacia abajo. */
export function drawCargo(c: C, cx: number, cy: number, r: number) {
  c.strokeStyle = INK; c.lineWidth = 2.5;
  c.beginPath(); c.roundRect(cx - r, cy - r * 0.8, r * 2, r * 1.6, r * 0.2); c.fillStyle = shade(c, "#6b7280", cx, cy, r); c.fill(); c.stroke();
  for (let i = -1; i <= 1; i++) { c.fillStyle = "#1f2937"; c.fillRect(cx + i * r * 0.55 - r * 0.12, cy - r * 1.05, r * 0.24, r * 0.3); }
  c.save(); c.beginPath(); c.rect(cx - r, cy + r * 0.35, r * 2, r * 0.45); c.clip();
  for (let i = -4; i < 6; i++) { c.fillStyle = i % 2 ? M3C.amarillo : INK; poly(c, [[cx - r + i * r * 0.35, cy + r * 0.8], [cx - r + (i + 1) * r * 0.35, cy + r * 0.8], [cx - r + (i + 2) * r * 0.35, cy + r * 0.35], [cx - r + (i + 1) * r * 0.35, cy + r * 0.35]]); c.fill(); }
  c.restore();
  c.fillStyle = M3C.amarillo; poly(c, [[cx, cy + r * 0.25], [cx - r * 0.42, cy - r * 0.2], [cx - r * 0.15, cy - r * 0.2], [cx - r * 0.15, cy - r * 0.6], [cx + r * 0.15, cy - r * 0.6], [cx + r * 0.15, cy - r * 0.2], [cx + r * 0.42, cy - r * 0.2]]); c.fill(); c.lineWidth = 1.5; c.stroke();
}

/** Caja de madera (1 golpe) o con flejes de acero (2). */
export function drawCrate(c: C, x: number, y: number, s: number, hp: number, hurt = 0) {
  const p = s * 0.06;
  c.fillStyle = hurt ? M3C.amarilloClaro : "#8a5a2b"; c.fillRect(x + p, y + p, s - 2 * p, s - 2 * p);
  c.fillStyle = "#6e4320"; for (let i = 1; i < 4; i++) c.fillRect(x + p, y + p + (i * (s - 2 * p)) / 4 - 1, s - 2 * p, 2);
  c.strokeStyle = "#3a2414"; c.lineWidth = s * 0.07; c.strokeRect(x + p * 1.5, y + p * 1.5, s - 3 * p, s - 3 * p);
  c.beginPath(); c.moveTo(x + p * 2, y + p * 2); c.lineTo(x + s - p * 2, y + s - p * 2); c.stroke();
  if (hp >= 2) {
    c.fillStyle = M3C.metalClaro; c.fillRect(x + p, y + s * 0.28, s - 2 * p, s * 0.1); c.fillRect(x + p, y + s * 0.62, s - 2 * p, s * 0.1);
    c.fillStyle = INK; for (const yy of [0.33, 0.67]) for (const xx of [0.18, 0.82]) { c.beginPath(); c.arc(x + s * xx, y + s * yy, s * 0.03, 0, Math.PI * 2); c.fill(); }
  }
}
/** Cadena cruzada encima de una pieza encadenada. */
export function drawChain(c: C, cx: number, cy: number, s: number) {
  c.save(); c.translate(cx, cy);
  for (const a of [Math.PI / 4, -Math.PI / 4]) {
    c.save(); c.rotate(a);
    for (let i = -2; i <= 2; i++) { c.strokeStyle = INK; c.lineWidth = s * 0.09; c.beginPath(); c.ellipse(i * s * 0.17, 0, s * 0.11, s * 0.07, 0, 0, Math.PI * 2); c.stroke(); c.strokeStyle = M3C.metalClaro; c.lineWidth = s * 0.045; c.stroke(); }
    c.restore();
  }
  c.fillStyle = M3C.amarillo; c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); c.roundRect(-s * 0.1, -s * 0.06, s * 0.2, s * 0.17, 2); c.fill(); c.stroke();
  c.restore();
}
/** Mancha de óxido en el fondo de la casilla. */
export function drawRust(c: C, x: number, y: number, s: number) {
  c.fillStyle = "rgba(160,72,24,0.55)"; c.beginPath(); c.roundRect(x + s * 0.08, y + s * 0.08, s * 0.84, s * 0.84, s * 0.12); c.fill();
  c.fillStyle = "rgba(92,58,36,0.9)";
  for (const [a, b, rr] of [[0.25, 0.3, 0.1], [0.7, 0.25, 0.08], [0.6, 0.7, 0.12], [0.28, 0.72, 0.07]]) { c.beginPath(); c.arc(x + s * a, y + s * b, s * rr, 0, Math.PI * 2); c.fill(); }
}

// ── Íconos de objetivos y herramientas (también para el HTML, vía dataURL) ─
export function drawGoalIcon(c: C, g: Goal, cx: number, cy: number, s: number) {
  if (g.k === "piece") drawPiece(c, g.t, cx, cy, s);
  else if (g.k === "crate") drawCrate(c, cx - s * 0.42, cy - s * 0.42, s * 0.84, 2);
  else if (g.k === "rust") { c.fillStyle = M3C.fondo2; c.fillRect(cx - s * 0.42, cy - s * 0.42, s * 0.84, s * 0.84); drawRust(c, cx - s * 0.42, cy - s * 0.42, s * 0.84); }
  else if (g.k === "chain") { drawPiece(c, 4, cx, cy, s * 0.8); drawChain(c, cx, cy, s * 0.9); }
  else if (g.k === "cargo") drawCargo(c, cx, cy, s * 0.36);
  else { c.fillStyle = M3C.amarillo; c.font = `700 ${s * 0.42}px Rajdhani, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("PTS", cx, cy); }
}
export function drawToolIcon(c: C, tool: Tool, cx: number, cy: number, s: number) {
  const r = s * 0.4;
  c.lineJoin = "round"; c.strokeStyle = INK; c.lineWidth = s * 0.06;
  if (tool === "martillo") {
    c.save(); c.translate(cx, cy); c.rotate(-0.6);
    c.fillStyle = "#8a5a2b"; c.fillRect(-r * 0.12, -r * 0.2, r * 0.24, r * 1.25); c.strokeRect(-r * 0.12, -r * 0.2, r * 0.24, r * 1.25);
    c.fillStyle = shade(c, M3C.metalClaro, 0, -r * 0.45, r); c.fillRect(-r * 0.75, -r * 0.75, r * 1.5, r * 0.6); c.strokeRect(-r * 0.75, -r * 0.75, r * 1.5, r * 0.6);
    c.fillStyle = M3C.amarillo; c.fillRect(-r * 0.75, -r * 0.75, r * 0.25, r * 0.6);
    c.restore();
  } else if (tool === "sierra") {
    c.save(); c.translate(cx, cy);
    c.fillStyle = M3C.metalClaro; c.beginPath();
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, rr = i % 2 ? r * 0.82 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = M3C.rojo; c.beginPath(); c.arc(0, 0, r * 0.32, 0, Math.PI * 2); c.fill(); c.stroke();
    c.restore();
  } else if (tool === "iman") {
    c.lineCap = "butt"; c.lineWidth = r * 0.42;
    c.strokeStyle = INK; c.beginPath(); c.arc(cx, cy - r * 0.05, r * 0.6, Math.PI, 0); c.lineTo(cx + r * 0.6, cy + r * 0.7); c.moveTo(cx - r * 0.6, cy + r * 0.7); c.lineTo(cx - r * 0.6, cy - r * 0.05); c.stroke();
    c.lineWidth = r * 0.28; c.strokeStyle = M3C.rojo; c.beginPath(); c.arc(cx, cy - r * 0.05, r * 0.6, Math.PI, 0); c.lineTo(cx + r * 0.6, cy + r * 0.35); c.moveTo(cx - r * 0.6, cy + r * 0.35); c.lineTo(cx - r * 0.6, cy - r * 0.05); c.stroke();
    c.fillStyle = M3C.texto; c.fillRect(cx - r * 0.74, cy + r * 0.4, r * 0.28, r * 0.32); c.fillRect(cx + r * 0.46, cy + r * 0.4, r * 0.28, r * 0.32);
  } else {
    c.save(); c.translate(cx, cy); c.rotate(-0.75);
    c.fillStyle = shade(c, M3C.metalClaro, 0, 0, r);
    c.beginPath(); c.roundRect(-r * 0.14, -r * 0.55, r * 0.28, r * 1.45, r * 0.1); c.fill(); c.stroke();
    c.beginPath(); c.arc(0, -r * 0.7, r * 0.38, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = M3C.fondo2; c.fillRect(-r * 0.13, -r * 1.12, r * 0.26, r * 0.45);
    c.restore();
  }
}
const iconCache = new Map<string, string>();
export function iconURL(key: string, paint: (c: C, s: number) => void, s = 64) {
  let u = iconCache.get(key);
  if (u) return u;
  const cv = document.createElement("canvas"); cv.width = cv.height = s;
  paint(cv.getContext("2d")!, s);
  u = cv.toDataURL(); iconCache.set(key, u);
  return u;
}

// ── Ruta del Desguace ──────────────────────────────────────────────────
export type MapView = { levels: LevelDef[]; stars: number[]; sel: number; open: number; t: number; scroll: number };
/** Posiciones de los nodos en coordenadas de mapa (512 de ancho; el 1 abajo, el último arriba). */
export const MAP_H = 1260;
export function nodePos(i: number) {
  const y = MAP_H - 200 - i * 110;
  const x = 256 + Math.sin(i * 1.25 + 0.4) * 150;
  return { x, y };
}
const ZONES: { y: number; name: string; tint: string }[] = [
  { y: MAP_H, name: "TALLER CHICO", tint: "#1c1a17" },
  { y: 900, name: "MONTAÑA DE CHATARRA", tint: "#211a14" },
  { y: 680, name: "ZONA DE CLASIFICACIÓN", tint: "#141c1e" },
  { y: 460, name: "FÁBRICA OXIDADA", tint: "#21160f" },
  { y: 345, name: "DEPÓSITO DE MAQUINARIA", tint: "#171a1f" },
  { y: 235, name: "PLANTA DE RECICLAJE", tint: "#122017" },
  { y: 125, name: "LA TRITURADORA", tint: "#1e1012" },
];
export function drawMap(c: C, W: number, m: MapView) {
  const oy = -m.scroll;
  c.save(); c.translate(0, oy);
  // franjas de zona con su nombre pintado en la chapa
  ZONES.forEach((z, i) => {
    const top = ZONES[i + 1]?.y ?? 0;
    c.fillStyle = z.tint; c.fillRect(0, top, W, z.y - top);
    c.fillStyle = "rgba(255,255,255,0.04)"; for (let yy = top; yy < z.y; yy += 22) c.fillRect(0, yy, W, 1);
    c.save(); c.fillStyle = "rgba(181,101,29,0.35)"; c.font = "700 20px Rajdhani, sans-serif"; c.textAlign = "left"; c.fillText(z.name, 12, z.y - 14); c.restore();
  });
  drawScenery(c, W, m.t);
  // camino de huellas: encendido hasta el último nivel abierto
  for (let i = 0; i < m.levels.length - 1; i++) {
    const a = nodePos(i), b = nodePos(i + 1), lit = i + 1 <= m.open;
    c.strokeStyle = lit ? "rgba(255,180,0,0.55)" : "rgba(156,163,175,0.18)"; c.lineWidth = 10; c.setLineDash([12, 10]); c.lineDashOffset = lit ? -m.t * 20 : 0;
    c.beginPath(); c.moveTo(a.x, a.y); c.bezierCurveTo(a.x, a.y - 60, b.x, b.y + 60, b.x, b.y); c.stroke();
  }
  c.setLineDash([]);
  m.levels.forEach((lv, i) => drawNode(c, i, lv, m));
  c.restore();
  // marco de título fijo
  c.fillStyle = "rgba(11,15,20,0.88)"; c.fillRect(0, 0, W, 44);
  c.fillStyle = M3C.amarillo; c.font = "700 28px Rajdhani, sans-serif"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText("RUTA DEL DESGUACE", 14, 23);
  const tot = m.stars.reduce((a, b) => a + b, 0);
  c.textAlign = "right"; c.fillStyle = M3C.texto; c.fillText(`${tot}/${m.levels.length * 3}`, W - 14, 23);
  drawStar(c, W - 92, 22, 11, true);
}
export function drawStar(c: C, cx: number, cy: number, r: number, on: boolean) {
  poly(c, Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, rr = i % 2 ? r * 0.45 : r; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; }));
  c.fillStyle = on ? M3C.amarillo : "#2a2f37"; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
}
function drawNode(c: C, i: number, lv: LevelDef, m: MapView) {
  const { x, y } = nodePos(i), locked = i > m.open, done = m.stars[i] > 0, cur = i === m.sel;
  const r = lv.boss ? 40 : 33;
  if (cur) { c.strokeStyle = M3C.cian; c.lineWidth = 4; c.globalAlpha = 0.5 + 0.5 * Math.sin(m.t * 5); c.beginPath(); c.arc(x, y, r + 9, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; }
  // tuerca gigante como nodo
  const hex = Array.from({ length: 6 }, (_, k) => { const a = (k / 6) * Math.PI * 2 + Math.PI / 6; return [x + Math.cos(a) * r, y + Math.sin(a) * r]; });
  poly(c, hex);
  c.fillStyle = locked ? "#2a2f37" : done ? shade(c, M3C.amarillo, x, y, r) : shade(c, M3C.naranja, x, y, r);
  if (lv.boss && !locked) c.fillStyle = shade(c, M3C.rojo, x, y, r);
  c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
  c.fillStyle = locked ? "#14181F" : INK; c.beginPath(); c.arc(x, y, r * 0.58, 0, Math.PI * 2); c.fill();
  c.textAlign = "center"; c.textBaseline = "middle";
  if (locked) { // candado
    c.strokeStyle = M3C.texto2; c.lineWidth = 3; c.beginPath(); c.arc(x, y - 4, 6, Math.PI, 0); c.stroke();
    c.fillStyle = M3C.texto2; c.fillRect(x - 8, y - 3, 16, 12);
  } else { c.fillStyle = M3C.texto; c.font = `700 ${lv.boss ? 32 : 28}px Rajdhani, sans-serif`; c.fillText(String(i + 1), x, y + 1); }
  if (done) for (let s = 0; s < 3; s++) drawStar(c, x - 22 + s * 22, y + r + 11, 10, s < m.stars[i]);
  if (cur && !locked) drawCarMarker(c, x + r + 16, y - 8, m.t);
}
/** El autito RC del jugador estacionado al lado del nivel elegido. */
function drawCarMarker(c: C, x: number, y: number, t: number) {
  const b = Math.sin(t * 8) * 1.5;
  c.save(); c.translate(x, y + b);
  c.fillStyle = "rgba(0,0,0,0.4)"; c.beginPath(); c.ellipse(0, 12 - b, 16, 4, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = M3C.rojoChapa; c.strokeStyle = INK; c.lineWidth = 2;
  c.beginPath(); c.roundRect(-15, -4, 30, 11, 3); c.fill(); c.stroke();
  c.beginPath(); c.roundRect(-7, -11, 14, 8, 2); c.fillStyle = M3C.cian; c.fill(); c.stroke();
  c.fillStyle = INK; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 9, 8, 5, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = M3C.amarilloClaro; c.fillRect(13, -1, 3, 3);
  c.restore();
}
/** Siluetas de cada zona (montañas de chatarra, chimenea con humo, grúa, trituradora con dientes). */
function drawScenery(c: C, W: number, t: number) {
  const dark = "#0e1013";
  // taller chico: persiana con banda amarilla
  c.fillStyle = dark; c.fillRect(W - 150, 1110, 130, 100); c.fillStyle = "#2a2f37"; for (let i = 0; i < 7; i++) c.fillRect(W - 144, 1116 + i * 12, 118, 6);
  c.fillStyle = M3C.amarillo; c.fillRect(W - 150, 1102, 130, 8);
  // montañas de chatarra
  c.fillStyle = "#17130f";
  poly(c, [[0, 900], [60, 780], [110, 840], [170, 740], [240, 860], [260, 900]]); c.fill();
  poly(c, [[W, 900], [W - 70, 770], [W - 150, 860], [W - 170, 900]]); c.fill();
  c.strokeStyle = "#2c241b"; c.lineWidth = 3; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(20 + i * 26, 860 - (i % 3) * 20); c.lineTo(36 + i * 26, 870 - (i % 2) * 24); c.stroke(); }
  // clasificación: cinta transportadora con cajas que avanzan
  const by = 600;
  c.fillStyle = dark; c.fillRect(0, by, W, 18); c.fillStyle = "#2a2f37"; for (let i = 0; i < 26; i++) c.fillRect(((i * 22 + t * 30) % (W + 22)) - 22, by + 4, 12, 10);
  for (let i = 0; i < 4; i++) { const xx = ((i * 140 + t * 30) % (W + 40)) - 40; c.fillStyle = "#6e4320"; c.fillRect(xx, by - 18, 22, 18); }
  // fábrica oxidada: galpón con chimenea y humo
  const fy = 380;
  c.fillStyle = dark; poly(c, [[W - 170, fy + 75], [W - 170, fy + 10], [W - 110, fy - 20], [W - 50, fy + 10], [W - 50, fy + 75]]); c.fill();
  c.fillRect(W - 90, fy - 70, 22, 70);
  for (let i = 0; i < 4; i++) { const k = (t * 0.4 + i / 4) % 1; c.fillStyle = `rgba(120,120,120,${0.25 * (1 - k)})`; c.beginPath(); c.arc(W - 79 + Math.sin(k * 6 + i) * 10, fy - 75 - k * 70, 10 + k * 16, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = "rgba(255,180,0,0.5)"; for (let i = 0; i < 3; i++) c.fillRect(W - 156 + i * 34, fy + 30, 18, 12);
  // depósito: grúa con gancho que se balancea
  const gx = 90, gy = 245;
  c.strokeStyle = "#2c2f35"; c.lineWidth = 6; c.beginPath(); c.moveTo(gx, gy + 100); c.lineTo(gx, gy); c.lineTo(gx + 120, gy); c.stroke();
  const sw = Math.sin(t * 1.2) * 8; c.lineWidth = 2; c.beginPath(); c.moveTo(gx + 100, gy); c.lineTo(gx + 100 + sw, gy + 50); c.stroke();
  c.fillStyle = M3C.amarillo; c.fillRect(gx + 92 + sw, gy + 50, 16, 10);
  // planta de reciclaje: tanques verdes
  for (let i = 0; i < 3; i++) { c.fillStyle = "#16301f"; c.fillRect(W - 170 + i * 50, 150, 36, 70); c.fillStyle = "#22553a"; c.fillRect(W - 170 + i * 50, 150, 36, 8); }
  // trituradora: dos rodillos dentados girando
  const ty = 72, x0 = 220;
  c.fillStyle = "#24161a"; c.fillRect(x0, ty - 46, 230, 96);
  c.fillStyle = M3C.rojoChapa; c.fillRect(x0, ty - 56, 230, 12);
  for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? M3C.amarillo : INK; c.fillRect(x0 + i * 23, ty - 56, 23, 5); }
  for (const [rx, dir] of [[x0 + 70, 1], [x0 + 160, -1]] as const) {
    c.save(); c.translate(rx, ty); c.rotate(t * 1.6 * dir);
    c.fillStyle = "#4b5563"; c.beginPath(); for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, rr = k % 2 ? 30 : 38; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill();
    c.strokeStyle = INK; c.lineWidth = 2; c.stroke(); c.fillStyle = INK; c.beginPath(); c.arc(0, 0, 8, 0, Math.PI * 2); c.fill();
    c.restore();
  }
}
