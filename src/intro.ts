// Intro de 4 cuadros, la previa de una pelea: 1) el cartel de la liga, 2) los rivales posan, 3) el auto RC entra y frena, 4) logo.
// Ilustración en canvas 2D de 192x108 escalada sin filtrar (píxel visible, como el resto del juego), dibujada por código: cero assets.
// Solo en el primer arranque (save.intro) y desde Créditos → "Ver intro". Cualquier tecla, botón o toque la salta.
import "./intro.css";
import { persist, save } from "./menu";
import { initAudio, SFX } from "./sfx";
import { skipHint } from "./replay";
import { activePad } from "./input";

const W = 192, H = 108;
let on = false;
let seek: number | null = null; // solo dev: congela la intro en el segundo N (window.__introAt) para revisar el arte
if (import.meta.env.DEV) Object.assign(window, { __introAt: (n: number | null) => (seek = n) });
/** ¿Hay una intro encima? main.ts deja de leer el gamepad del menú mientras tanto. */
export const introOn = () => on;

// ---------- Utilidades de dibujo ----------
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (v: number) => { v = clamp(v); return v * v * (3 - 2 * v); };
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// Azar fijo por índice: lo estático (estrellas, pasto) no parpadea entre cuadros. Es solo visual.
const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const R = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
const calm = () => document.body.classList.contains("calm"); // "Reducir parpadeos": sin titileos de luz

// Cielo en degradé con trama Bayer 4x4 (5 pasos): se arma una vez y se pinta cada cuadro
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const skies = new Map<string, ImageData>();
function sky(g: CanvasRenderingContext2D, top: string, bottom: string, h: number) {
  const key = top + bottom + h;
  let d = skies.get(key);
  if (!d) {
    d = g.createImageData(W, h);
    const a = rgb(top), b = rgb(bottom), N = 5;
    for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) {
      const v = (y / (h - 1)) * (N - 1), lo = Math.floor(v), s = (lo + (v - lo > BAYER[(y & 3) * 4 + (x & 3)] / 16 ? 1 : 0)) / (N - 1), i = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) d.data[i + c] = a[c] + (b[c] - a[c]) * s;
      d.data[i + 3] = 255;
    }
    skies.set(key, d);
  }
  g.putImageData(d, 0, 0);
}
function moon(g: CanvasRenderingContext2D, x: number, y: number) {
  g.globalAlpha = 0.12; R(g, x - 9, y - 9, 18, 18, "#b9d3a4"); g.globalAlpha = 0.2; R(g, x - 6, y - 6, 12, 12, "#d6e8c8"); g.globalAlpha = 1;
  R(g, x - 4, y - 3, 8, 6, "#d6e8c8"); R(g, x - 3, y - 4, 6, 8, "#d6e8c8"); R(g, x - 4, y - 1, 2, 2, "#a8bd96");
}
function stars(g: CanvasRenderingContext2D, t: number, n: number, maxY: number) {
  for (let i = 0; i < n; i++) { const tw = calm() ? 1 : 0.5 + 0.5 * Math.sin(t * (1 + hash(i + 9) * 2) + i); g.globalAlpha = 0.3 + 0.6 * tw * hash(i + 3); R(g, hash(i) * W, hash(i + 40) * maxY, 1, 1, "#d6e8c8"); }
  g.globalAlpha = 1;
}
// Brizna de pasto: triángulo de 1-3 px de ancho que se dobla con el viento
function blade(g: CanvasRenderingContext2D, x: number, base: number, h: number, lean: number, c: string) {
  for (let k = 0; k < h; k += 2) R(g, x + lean * (k / h) ** 2 * 3, base - k, k > h * 0.6 ? 1 : 2, 2, c);
}
function grassStrip(g: CanvasRenderingContext2D, t: number, y: number, c1: string, c2: string, seed: number) {
  R(g, 0, y, W, H - y, c1);
  for (let x = 0; x < W; x += 3) blade(g, x + hash(x + seed) * 2, y + 2, 4 + hash(x * 1.7 + seed) * 7, Math.sin(t * 1.4 + x * 0.3) * 0.8, c2);
}
// Ojos que brillan: dos puntos con halo; parpadean
function eyes(g: CanvasRenderingContext2D, x: number, y: number, c: string, t: number, k = 1) {
  if (!calm() && ((t * 2.2 + x) % 5) < 0.14) return;
  g.globalAlpha = 0.25 * k; R(g, x - 2, y - 1, 9, 4, c); g.globalAlpha = k;
  R(g, x, y, 2, 2, c); R(g, x + 5, y, 2, 2, c); g.globalAlpha = 1;
}

// Elipse rellena en bloques; oell le suma un contorno oscuro (así los personajes se leen sobre el fondo)
function ell(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, c: string) {
  for (let dy = -ry; dy <= ry; dy++) { const w = Math.round(rx * Math.sqrt(1 - (dy / (ry + 0.5)) ** 2)); R(g, cx - w, cy + dy, 2 * w + 1, 1, c); }
}
const oell = (g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, c: string, line = "#140a06") => { ell(g, cx, cy, rx + 1, ry + 1, line); ell(g, cx, cy, rx, ry, c); };

// Letras de 3x5 para carteles y placas (solo las que hacen falta)
const GLYPH: Record<string, string> = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111", G: "011100101101011", H: "101101111101101",
  I: "111010010010111", J: "001001001101010", L: "100100100100111", M: "101111111101101", O: "010101101101010", P: "110101110100100", R: "110101110101101",
  S: "011100010001110", T: "111010010010010", U: "101101101101111",
};
const textW = (s: string, k = 1) => [...s].reduce((a, ch) => a + (ch === " " ? 2 : 4) * k, 0) - k;
function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, c: string, k = 1) {
  for (const ch of s) {
    const bits = GLYPH[ch];
    if (bits) for (let i = 0; i < 15; i++) if (bits[i] === "1") R(g, x + (i % 3) * k, y + ((i / 3) | 0) * k, k, k, c);
    x += (ch === " " ? 2 : 4) * k;
  }
}

// Fondo común del patio de noche: cielo petróleo, cerca, pasto y un círculo de tierra apisonada (el "ring")
function backdrop(g: CanvasRenderingContext2D, t: number, gy: number, moonAt?: [number, number]) {
  sky(g, "#061214", "#173a3e", gy + 2);
  stars(g, t, 26, 30);
  if (moonAt) moon(g, moonAt[0], moonAt[1]);
  R(g, 0, gy - 14, W, 12, "#0a0f12");
  for (let x = 0; x < W; x += 7) { R(g, x, gy - 18, 5, 16, "#0a0f12"); R(g, x + 1, gy - 20, 3, 2, "#0a0f12"); }
  grassStrip(g, t, gy - 2, "#0b160d", "#153018", 5);
  const cy = Math.round((gy + H) / 2) + 3, ry = Math.round((H - gy) / 2) - 1;
  ell(g, 96, cy, 94, ry, "#3a281a"); ell(g, 96, cy, 92, ry - 1, "#2c1d12");
}
// Hilo de focos cálidos entre dos puntos, con comba; los focos se prenden de a uno desde `from`
const BULB = ["#ffb347", "#e0602a", "#ffe9a0"];
function garland(g: CanvasRenderingContext2D, t: number, x0: number, y0: number, x1: number, y1: number, sag: number, n: number, from = 0, dim = 1) {
  const at = (u: number) => y0 + (y1 - y0) * u + sag * 4 * u * (1 - u);
  for (let x = x0; x <= x1; x++) R(g, x, at((x - x0) / (x1 - x0)), 1, 1, "#0a0806");
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, x = x0 + (x1 - x0) * u, y = at(u) + 1, on = t > from + i * 0.07;
    if (on) { g.globalAlpha = 0.22 * dim; ell(g, x, y + 1, 3, 3, BULB[i % 3]); g.globalAlpha = dim; R(g, x - 1, y, 2, 3, BULB[i % 3]); R(g, x - 1, y, 1, 1, "#fff3c8"); g.globalAlpha = 1; }
    else R(g, x - 1, y, 2, 3, "#2a2018");
  }
}

// ---------- Cuadro 1: el cartel de la liga ----------
function liga(g: CanvasRenderingContext2D, t: number) {
  backdrop(g, t, 84, [170, 9]);
  for (const x of [6, 186]) R(g, x - 1, 22, 3, 64, "#1a120a"); // postes de la guirnalda
  for (const x of [38, 148]) { R(g, x, 32, 6, 56, "#1c1008"); R(g, x + 1, 32, 4, 56, "#4a2c16"); R(g, x + 1, 32, 1, 56, "#7a4a26"); }
  // Tablón pintado: tablas con vetas, marco oscuro y clavos
  R(g, 34, 30, 124, 29, "#1c1008"); R(g, 36, 32, 120, 25, "#6b3f20");
  for (let y = 32; y < 57; y += 8) R(g, 36, y, 120, 1, "#3a2010");
  R(g, 36, 33, 120, 1, "#8a5a30");
  for (const [x, y] of [[38, 34], [152, 34], [38, 53], [152, 53]]) R(g, x, y, 2, 2, "#c9a060");
  const s = "LIGA DEL PATIO", sx = Math.round(96 - textW(s, 2) / 2);
  text(g, s, sx + 2, 41, "#1a0c06", 2); text(g, s, sx, 39, "#ffd27a", 2);
  // Cartelito colgado
  for (const x of [72, 118]) R(g, x, 59, 1, 5, "#8a8a80");
  const tag = "SOLO BICHOS", tw = textW(tag) + 8;
  R(g, 96 - tw / 2 - 1, 63, tw + 2, 11, "#140a06"); R(g, 96 - tw / 2, 64, tw, 9, "#8a3a1c"); R(g, 96 - tw / 2, 64, tw, 1, "#c8683a");
  text(g, tag, 96 - textW(tag) / 2, 66, "#ffe9c2");
  // Cuerdas del ring con sus postes
  for (const x of [14, 178]) { R(g, x - 2, 70, 5, 32, "#140a06"); R(g, x - 1, 70, 3, 31, "#6b3f20"); R(g, x, 69, 1, 1, "#e0a030"); }
  for (const [y, c] of [[78, "#a23a24"], [87, "#c9a060"]] as const) for (let x = 16; x < 178; x++) R(g, x, y + Math.round(2.2 * Math.sin(((x - 16) / 162) * Math.PI)), 1, 1, c);
  for (let x = 0; x < W; x += 5) blade(g, x + hash(x) * 3, 108, 3 + hash(x * 2.3) * 5, Math.sin(t * 1.5 + x * 0.3) * 0.8, "#1c4022");
  // Focos: sobre el tablón y en las puntas; arrancan de a uno y recién ahí el patio se ilumina
  const lit = ease((t - 0.3) / 1.2);
  g.globalAlpha = 0.07 * lit; ell(g, 96, 48, 88, 32, "#e0a030"); g.globalAlpha = 0.07 * lit; ell(g, 96, 52, 56, 20, "#ffd27a"); g.globalAlpha = 1;
  garland(g, t, 6, 22, 36, 33, 5, 5, 0.3); garland(g, t, 158, 33, 186, 22, 5, 5, 0.9);
  garland(g, t, 40, 29, 152, 29, 0, 9, 0.5);
  if (!calm()) for (let i = 0; i < 2; i++) { const a = t * 2.2 + i * 3; if (t > 1.6) R(g, 70 + i * 52 + Math.round(Math.cos(a) * 9), 26 + Math.round(Math.sin(a * 1.3) * 4), 1, 1, "#c8d4a0"); } // polillas
  g.globalAlpha = 0.5 * (1 - lit); R(g, 0, 0, W, H, "#02080a"); g.globalAlpha = 1;
}

// ---------- Cuadro 2: los rivales posan ----------
const bob = (t: number, k: number) => (calm() || Math.sin(t * 4 + k) < 0 ? 0 : 1);
function ant(g: CanvasRenderingContext2D, cx: number, fy: number, t: number) {
  const y = fy - bob(t, 0), D = "#140a06", C = "#a8401f", C2 = "#d2693a", Hi = "#f0a070", sw = calm() ? 0 : Math.round(Math.sin(t * 3) * 1.2);
  for (const dx of [-7, 2]) { R(g, cx + dx, y - 11, 5, 11, D); R(g, cx + dx + 1, y - 11, 3, 9, C); R(g, cx + dx - 2, y - 3, 9, 3, D); R(g, cx + dx - 1, y - 3, 7, 2, C2); }
  oell(g, cx, y - 18, 8, 8, C); R(g, cx - 4, y - 24, 3, 2, Hi);
  R(g, cx - 12, y - 22, 24, 6, D); R(g, cx - 11, y - 21, 22, 4, C2); R(g, cx - 11, y - 21, 22, 1, Hi); R(g, cx - 11, y - 20, 3, 3, C); R(g, cx + 8, y - 20, 3, 3, C);
  for (const s of [-1, 1]) for (let i = 1; i < 7; i++) R(g, cx + s * (3 + i) + (s * sw * i) / 4, y - 41 - i * 2, 2, 2, D); // antenas
  for (const s of [-1, 1]) R(g, cx + s * 10 + (s * sw * 6) / 4 - 1, y - 54, 4, 4, C2);
  oell(g, cx, y - 33, 9, 8, C2); R(g, cx - 6, y - 40, 4, 1, Hi);
  R(g, cx - 7, y - 37, 5, 5, "#f4ecd8"); R(g, cx + 2, y - 37, 5, 5, "#f4ecd8");
  R(g, cx - 4, y - 35, 2, 2, "#10100a"); R(g, cx + 5, y - 35, 2, 2, "#10100a");
  R(g, cx - 7, y - 37, 5, 2, C2); R(g, cx + 2, y - 37, 5, 1, C2); R(g, cx - 7, y - 35, 5, 1, D); R(g, cx + 2, y - 36, 5, 1, D); // párpados caídos
  R(g, cx - 7, y - 39, 5, 1, D); R(g, cx + 2, y - 41, 5, 1, D); // una ceja arriba
  R(g, cx - 3, y - 29, 6, 1, D); R(g, cx + 3, y - 30, 2, 1, D); R(g, cx - 6, y - 28, 2, 3, D); R(g, cx + 4, y - 28, 2, 3, D);
}
function beetle(g: CanvasRenderingContext2D, cx: number, fy: number, t: number) {
  const y = fy - bob(t, 1.7), D = "#08140e", S = "#2a8a6a", S2 = "#41b58a", Sd = "#1c6a50";
  for (const dx of [-8, 2]) { R(g, cx + dx, y - 9, 6, 9, D); R(g, cx + dx + 1, y - 9, 4, 7, Sd); R(g, cx + dx - 2, y - 3, 10, 3, D); R(g, cx + dx - 1, y - 3, 8, 2, S); }
  for (const s of [-1, 1]) { const x = cx + s * 14; R(g, x - 4, y - 33, 8, 4, D); R(g, x - 3 + (s > 0 ? 1 : 0), y - 32, 4, 2, Sd); R(g, x - 3 - s * 1, y - 31, 6, 14, D); R(g, x - 2 - s * 1, y - 30, 4, 12, Sd); R(g, x - 3 - s * 1, y - 19, 6, 4, D); R(g, x - 2 - s * 1, y - 18, 4, 2, S2); }
  oell(g, cx, y - 22, 13, 14, S, D); R(g, cx, y - 34, 1, 25, D); R(g, cx - 9, y - 31, 2, 9, S2); R(g, cx + 5, y - 31, 2, 7, S2); R(g, cx - 10, y - 20, 1, 6, Sd);
  R(g, cx - 2, y - 55, 5, 9, D); R(g, cx - 1, y - 54, 3, 8, Sd); R(g, cx + 1, y - 57, 4, 3, D); R(g, cx + 2, y - 56, 2, 1, Sd); // cuerno
  oell(g, cx, y - 41, 8, 5, Sd, D); R(g, cx - 4, y - 45, 4, 1, S2);
  R(g, cx - 8, y - 44, 16, 4, "#050505"); R(g, cx - 6, y - 44, 3, 1, "#e8c070"); R(g, cx + 2, y - 44, 3, 1, "#e8c070"); // lentes oscuros
  R(g, cx - 4, y - 38, 8, 3, D); R(g, cx - 3, y - 38, 6, 1, "#f4ecd8"); R(g, cx + 3, y - 39, 2, 1, D); // sonrisa de costado
}
function cat(g: CanvasRenderingContext2D, cx: number, fy: number, t: number) {
  const y = fy - bob(t, 3.1), D = "#140a06", O = "#e8832a", O2 = "#ffa24a", Cr = "#ffd9a0", St = "#b8561a", sw = calm() ? 0 : Math.sin(t * 2.6) * 3;
  for (let i = 0; i < 11; i++) { const x = Math.round(cx + 13 + Math.sin(i * 0.5) * 5 + sw * i * 0.18), yy = y - 3 - i * 3; R(g, x - 1, yy - 1, 5, 5, D); }
  for (let i = 0; i < 11; i++) { const x = Math.round(cx + 13 + Math.sin(i * 0.5) * 5 + sw * i * 0.18), yy = y - 3 - i * 3; R(g, x, yy, 3, 3, i > 8 ? St : O); }
  oell(g, cx, y - 14, 11, 13, O); ell(g, cx, y - 9, 6, 8, Cr); R(g, cx - 5, y - 22, 2, 5, St); R(g, cx + 3, y - 22, 2, 5, St);
  for (const dx of [-9, 3]) { R(g, cx + dx - 1, y - 4, 8, 4, D); R(g, cx + dx, y - 4, 6, 3, Cr); }
  R(g, cx - 8, y - 20, 17, 5, D); R(g, cx - 7, y - 19, 15, 3, O2); R(g, cx - 7, y - 19, 3, 3, Cr); R(g, cx + 5, y - 19, 3, 3, Cr); // brazos cruzados
  R(g, cx - 7, y - 26, 14, 3, "#a82a2a"); R(g, cx - 1, y - 24, 3, 3, "#ffb347"); // collar con chapita
  for (const s of [-1, 1]) for (let r = 0; r < 8; r++) { // orejas
    const w = 2 + r, xl = cx - 11 - (r >> 1), x = s < 0 ? xl : 2 * cx - xl - w, top = y - 53 + r;
    R(g, x - 1, top - (r ? 0 : 1), w + 2, 1, D); R(g, x, top, w, 1, O);
    if (r > 3) R(g, s < 0 ? xl + 1 : 2 * cx - xl - w + w - 3, top, 2, 1, "#e06a6a");
  }
  oell(g, cx, y - 34, 13, 9, O);
  R(g, cx - 1, y - 43, 1, 3, St); R(g, cx - 5, y - 42, 1, 2, St); R(g, cx + 4, y - 42, 1, 2, St);
  for (const dx of [-9, 4]) { R(g, dx + cx, y - 37, 5, 3, "#d8e060"); R(g, dx + cx + 2, y - 37, 1, 3, D); R(g, dx + cx, y - 37, 5, 1, St); R(g, dx + cx - 1, y - 39, 7, 1, D); } // ojos entrecerrados
  ell(g, cx, y - 29, 5, 3, Cr); R(g, cx - 1, y - 31, 3, 1, "#e06a6a"); R(g, cx - 3, y - 28, 2, 1, D); R(g, cx + 1, y - 28, 2, 1, D); R(g, cx + 3, y - 29, 2, 1, D); R(g, cx + 4, y - 28, 5, 1, "#c8b890"); // sonrisa y palillo
  for (const s of [-1, 1]) for (const dy of [-31, -29]) R(g, s < 0 ? cx - 18 : cx + 14, y + dy, 5, 1, Cr);
}
const RIVALS: [string, number, number, typeof ant][] = [["HORMIGA", 40, 0.5, ant], ["ESCARABAJO", 96, 1.5, beetle], ["EULALIO", 152, 2.5, cat]];
function rivales(g: CanvasRenderingContext2D, t: number) {
  backdrop(g, t, 84);
  const fy = 91;
  for (const [, cx, at] of RIVALS) { // conos de luz de los focos: se prenden un momento antes de que caiga cada uno
    const k = ease((t - at + 0.4) / 0.4);
    if (!k) continue;
    g.save(); g.beginPath(); g.moveTo(cx - 4, 6); g.lineTo(cx + 4, 6); g.lineTo(cx + 26, 100); g.lineTo(cx - 26, 100); g.closePath(); g.clip();
    const gr = g.createLinearGradient(0, 6, 0, 100); gr.addColorStop(0, `rgba(255,226,170,${0.34 * k})`); gr.addColorStop(1, `rgba(255,226,170,${0.08 * k})`);
    g.fillStyle = gr; g.fillRect(0, 0, W, 108); g.restore();
    g.globalAlpha = 0.25 * k; ell(g, cx, fy + 2, 24, 5, "#ffd27a"); g.globalAlpha = 1;
  }
  for (const [name, cx, at, who] of RIVALS) {
    const p = ease((t - at) / 0.35);
    if (t > at) who(g, cx, Math.round(fy - (1 - p) * 70 + (t < at + 0.5 && p >= 1 ? 1 : 0)), t); // cae de arriba y se asienta
    const q = ease((t - at - 0.7) / 0.3);
    if (q) { // placa con el nombre: baja y aparece
      const w = textW(name) + 8, x = Math.round(cx - w / 2), y = 96 - Math.round((1 - q) * 4);
      g.globalAlpha = q; R(g, x - 1, y - 1, w + 2, 9, "#140a06"); R(g, x, y, w, 7, "#4a2c16"); R(g, x, y, w, 1, "#c8803a"); text(g, name, x + 4, y + 1, "#ffd27a"); g.globalAlpha = 1;
    }
  }
  for (const [, cx, at] of RIVALS) { R(g, cx - 6, 1, 12, 4, "#0a0806"); R(g, cx - 4, 4, 8, 2, ease((t - at + 0.4) / 0.4) ? "#fff0c0" : "#4a4030"); } // focos del techo
}

// ---------- Cuadro 3: el auto RC entra y frena ----------
// Dibujo del auto de costado (coordenadas originales); se pinta a escala 2 desde car()
function carSprite(g: CanvasRenderingContext2D, t: number, tx: number, brake: boolean) {
  const cy = 0, body = "#d62828";
  R(g, 25, cy + 5, 36, 6, body); R(g, 33, cy, 18, 6, body); R(g, 36, cy + 1, 12, 4, "#1a2530"); R(g, 22, cy + 2, 6, 3, "#9a1c1c");
  R(g, 26, cy + 5, 34, 1, "#ff6a50"); R(g, 33, cy, 18, 1, "#ff6a50");
  R(g, 25, cy + 9, 36, 2, "#0a0e14"); R(g, 58, cy + 7, 3, 3, "#ffe9c2");
  R(g, 25, cy + 7, 2, 2, brake ? "#ff3020" : "#ff6a30");
  for (const wx of [30, 53]) { R(g, wx - 5, cy + 7, 10, 10, "#0a0a0a"); R(g, wx - 4, cy + 6, 8, 12, "#0a0a0a"); R(g, wx - 2, cy + 10, 4, 4, "#5f6a72"); R(g, wx - 2 + (((tx * 0.5) | 0) & 3), cy + 11, 1, 2, "#0a0a0a"); }
  R(g, 30, cy - 12, 1, 12, "#5f6a72"); R(g, 29, cy - 14, 3, 3, !calm() && ((t * 4) | 0) % 2 ? "#e0a030" : "#2a2418");
}
const CAR_Y = 62, CK = 1.5; // escala del auto en el cuadro 3
const carX = (t: number) => Math.round(-150 + 176 * (1 - (1 - clamp((t - 0.2) / 1.9)) ** 2)); // frena de golpe: entra rápido y llega despacio
function car(g: CanvasRenderingContext2D, t: number) {
  backdrop(g, t, 70, [24, 14]);
  garland(g, t, 0, 36, W, 36, 12, 16, 0, 0.55);
  const tx = carX(t), p = clamp((t - 0.2) / 1.9), brake = p > 0.4 && p < 1, v = 1 - p, hop = t > 2.1 && t < 2.3 ? -1 : 0;
  const shake = t > 2.5 && !calm() ? ((t * 30) | 0) % 2 : 0, ty = CAR_Y + 9 + hop + shake, ox = 21; // escala CK: centrado y apoyado en el mismo piso que a 2x
  // Haz del faro, ya encendido al entrar
  const lx = tx + ox + 61 * CK, ly = ty + 8 * CK, len = 150, lampOn = t > 0.2;
  if (lampOn) {
    g.save(); g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + len, ly - 28); g.lineTo(lx + len, ly + 34); g.closePath(); g.clip();
    const gr = g.createLinearGradient(lx, 0, lx + len, 0); gr.addColorStop(0, "rgba(255,233,194,.5)"); gr.addColorStop(1, "rgba(255,233,194,.05)");
    g.fillStyle = gr; g.fillRect(0, 40, W, 68); g.restore();
    g.globalAlpha = 0.3; ell(g, lx, ly, 6, 5, "#ffe9c2"); g.globalAlpha = 1;
  }
  // Líneas de velocidad
  for (let i = 0; i < 5 && v > 0.12; i++) R(g, tx - 6 - hash(i) * 20 - 24 * v, 72 + i * 6, 6 + 26 * v, 1, "#4a6a6a");
  // Humo del escape: bocanadas que suben y se agrandan; siguen saliendo con el auto parado
  for (let i = 0; i < 60; i++) {
    const age = t - (0.15 + i * 0.09);
    if (age < 0 || age > 0.9) continue;
    g.globalAlpha = 0.45 * (1 - age / 0.9); ell(g, carX(0.15 + i * 0.09) + ox + 24 * CK - age * 14, ty + 8 * CK - age * 12, 2 + Math.round(age * 4), 2 + Math.round(age * 3), "#7a8478"); g.globalAlpha = 1;
  }
  // Chispas del chasis al frenar
  for (let j = 0; j < 18; j++) {
    const tb = 0.95 + j * 0.05, age = t - tb;
    if (age < 0 || age > 0.4) continue;
    R(g, carX(tb) + ox + 29 * CK + (hash(j) - 0.5) * 14 - age * 24, ty + 17 * CK - age * 34 * hash(j + 7) + age * age * 110, 3, 2, j % 2 ? "#ffd27a" : "#ff8a30");
  }
  g.save(); g.translate(Math.round(tx + ox), ty); g.scale(CK, CK); carSprite(g, t, tx, brake); g.restore();
  // Destello en el parabrisas ya detenido
  const sp = clamp((t - 2.6) / 0.4);
  if (sp > 0 && sp < 1 || calm() && t > 2.6) { const s = calm() ? 2 : 1 + Math.round(2 * Math.sin(sp * Math.PI)), x = Math.round(tx + ox + CK * 48), y = Math.round(ty + 3 * CK); R(g, x - s, y, 2 * s + 1, 1, "#fff"); R(g, x, y - s, 1, 2 * s + 1, "#fff"); }
}

// ---------- Cuadro 4: logo ----------
function logo(g: CanvasRenderingContext2D, t: number) {
  sky(g, "#05070d", "#1a2638", 90);
  stars(g, t, 40, 60);
  R(g, 0, 74, W, H - 74, "#0b150d");
  const k = ease(t / 0.8);
  g.save(); g.beginPath(); g.moveTo(40, 94); g.lineTo(40 + 170 * k, 66); g.lineTo(40 + 170 * k, 108); g.closePath(); g.clip();
  const gr = g.createLinearGradient(40, 0, 210, 0); gr.addColorStop(0, "rgba(255,233,194,.45)"); gr.addColorStop(1, "rgba(255,233,194,0)");
  g.fillStyle = gr; g.fillRect(0, 60, W, 50); g.restore();
  R(g, 20, 92, 22, 5, "#d62828"); R(g, 25, 88, 11, 5, "#d62828"); R(g, 27, 89, 7, 3, "#1a2530"); R(g, 38, 94, 3, 2, "#ffe9c2"); R(g, 22, 96, 6, 6, "#0a0a0a"); R(g, 34, 96, 6, 6, "#0a0a0a");
  for (let x = 0; x < W; x += 3) blade(g, x, 108, 6 + hash(x + 4) * 10, Math.sin(t * 1.5 + x * 0.3), "#1c4022");
  for (const [x, y, c] of [[100, 84, "#ff3020"], [132, 88, "#ffb020"], [168, 85, "#9acd32"], [78, 90, "#ff3020"]] as const) eyes(g, x, y, c, t, 0.9);
}

// ---------- Guion ----------
const FRAMES: { text: string; dur: number; draw: (g: CanvasRenderingContext2D, t: number) => void }[] = [
  { text: "Once de la noche. Los humanos duermen. Arranca la liga más ilegal del barrio.", dur: 5.0, draw: liga },
  { text: "En esta esquina: hormigas, escarabajos y un gato con serios problemas de actitud.", dur: 5.0, draw: rivales },
  { text: "En la otra: un auto a control remoto, tres pilas recicladas y cero sentido común.", dur: 5.2, draw: car },
  { text: "", dur: 4.4, draw: logo },
];

/** Reproduce la intro. auto = primer arranque: queda anotado en el guardado para no repetirla sola. */
export function playIntro(auto = false, done?: () => void) {
  if (on) return;
  on = true;
  if (auto) { save.intro = true; persist(); }
  const el = document.createElement("div");
  el.id = "intro";
  el.innerHTML = `<div class="i-stage"><canvas width="${W}" height="${H}"></canvas><div class="i-logo"><div class="brand">JUNKED METAL</div><div class="tag">Diez minutos. Tres jefes. Y al final, siempre, Felipe.</div></div></div><div class="i-cap"></div><div class="i-skip">${skipHint()}</div>`;
  document.body.append(el);
  const stage = el.querySelector<HTMLElement>(".i-stage")!, cap = el.querySelector<HTMLElement>(".i-cap")!, logoEl = el.querySelector<HTMLElement>(".i-logo")!;
  const g = el.querySelector("canvas")!.getContext("2d")!;
  const total = FRAMES.reduce((a, f) => a + f.dur, 0), t0 = performance.now();
  let idx = -1, prevPad: boolean[] = [], out = false;

  const finish = () => {
    if (out) return;
    out = true;
    removeEventListener("keydown", onKey, true);
    removeEventListener("pointerdown", skip);
    stage.classList.remove("tune");
    el.classList.add("off"); // apagado de tubo; después se retira
    setTimeout(() => { el.remove(); on = false; done?.(); }, calm() ? 50 : 420);
  };
  const skip = () => { initAudio(); if (performance.now() - t0 > 300) finish(); }; // 0,3 s de guarda: la tecla que la abrió sigue apretada
  const onKey = (e: KeyboardEvent) => {
    if (e.repeat || /^(Shift|Control|Alt|Meta)/.test(e.code)) return;
    e.stopImmediatePropagation(); e.preventDefault(); // que el título de atrás no avance con la misma tecla
    skip();
  };
  addEventListener("keydown", onKey, true);
  addEventListener("pointerdown", skip);

  const loop = () => {
    if (out) return;
    const now = seek ?? (performance.now() - t0) / 1000;
    const pad = (activePad()?.buttons ?? []).map((b) => b.pressed);
    if (pad.some((p, i) => p && !prevPad[i])) skip();
    prevPad = pad;
    if (now >= total) return finish();
    let acc = 0, i = 0;
    while (i < FRAMES.length - 1 && now >= acc + FRAMES[i].dur) acc += FRAMES[i++].dur;
    const f = FRAMES[i], t = now - acc;
    if (i !== idx) { // cambio de cuadro: estática breve y encendido de tubo
      idx = i;
      stage.classList.remove("tune"); void stage.offsetWidth; stage.classList.add("tune");
      logoEl.classList.toggle("on", i === FRAMES.length - 1);
      SFX.static();
    }
    f.draw(g, t);
    const n = Math.floor(clamp((t - 0.3) * 38, 0, f.text.length));
    cap.textContent = f.text.slice(0, n);
    cap.classList.toggle("typing", n < f.text.length);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

document.getElementById("introBtn")?.addEventListener("click", () => playIntro());
