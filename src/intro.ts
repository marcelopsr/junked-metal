// Intro de 4 cuadros: 1) la casa apaga la luz, 2) los bichos salen del pasto, 3) el auto RC se enciende entre juguetes, 4) logo.
// Ilustración en canvas 2D de 192x108 escalada sin filtrar (píxel visible, como el resto del juego), dibujada por código: cero assets.
// Solo en el primer arranque (save.intro) y desde Créditos → "Ver intro". Cualquier tecla, botón o toque la salta.
import "./intro.css";
import { persist, save } from "./menu";
import { initAudio, SFX } from "./sfx";
import { skipHint } from "./replay";

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

// ---------- Cuadro 1: la casa apaga la luz ----------
const WINS: [number, number][] = [[64, 50], [116, 50], [62, 66], [122, 66]], OFF = [1.3, 1.9, 2.5, 3.0];
function house(g: CanvasRenderingContext2D, t: number) {
  sky(g, "#070b14", "#1c2840", 88);
  stars(g, t, 28, 40); moon(g, 160, 20);
  for (let x = 0; x < 46; x += 8) { R(g, x, 74, 6, 14, "#0a0f12"); R(g, x + 1, 72, 4, 2, "#0a0f12"); R(g, x + 2, 71, 2, 1, "#0a0f12"); } // cerca
  R(g, 0, 78, 46, 2, "#0a0f12"); R(g, 0, 85, 46, 2, "#0a0f12");
  // Casa: cuerpo, techo con filo de luna, chimenea y puerta
  R(g, 52, 46, 90, 42, "#0c111b"); R(g, 139, 46, 3, 42, "#1d2b44");
  for (let i = 0; i < 25; i++) { R(g, 46 + i * 2, 46 - i, 100 - i * 4, 1, "#080c14"); R(g, 144 - i * 2, 46 - i, 2, 1, "#22324f"); } // techo con filo de luna a la derecha
  R(g, 118, 22, 8, 16, "#0a0f18"); R(g, 117, 21, 10, 2, "#1d2b44");
  R(g, 92, 64, 10, 24, "#06080d");
  // Ventanas: cada una se apaga en su momento (parpadean un instante antes)
  const lamp = t < 3.4 || (!calm() && t < 3.6 && ((t * 18) | 0) % 2 === 0);
  WINS.forEach(([x, y], i) => {
    const lit = t < OFF[i] - 0.25 || (!calm() && t < OFF[i] && ((t * 16) | 0) % 2 === 0);
    if (lit) { g.globalAlpha = 0.1; R(g, x - 4, y - 4, 20, 18, "#e0a030"); g.globalAlpha = 0.18; R(g, x - 2, y - 2, 16, 14, "#e0a030"); g.globalAlpha = 1; } // halo de luz
    R(g, x - 1, y - 1, 14, 12, "#06080d");
    R(g, x, y, 12, 10, lit ? "#e0a030" : "#101826");
    if (lit) R(g, x, y, 12, 4, "#ffd27a");
    R(g, x + 5, y, 2, 10, "#06080d"); R(g, x, y + 4, 12, 2, "#06080d");
  });
  if (lamp) { g.globalAlpha = 0.12; R(g, 85, 59, 8, 8, "#ffd27a"); g.globalAlpha = 1; R(g, 88, 62, 2, 3, "#ffd27a"); } else R(g, 88, 62, 2, 3, "#1a2236");
  grassStrip(g, t, 86, "#0b160d", "#153018", 5);
  // Ojos rojos en el pasto, recién cuando todo quedó a oscuras
  if (t > 3.5) eyes(g, 30, 94, "#ff3020", t, ease((t - 3.5) / 0.4));
  g.globalAlpha = 0.5 * ease((t - 3.0) / 1.2); R(g, 0, 0, W, H, "#02040a"); g.globalAlpha = 1;
}

// ---------- Cuadro 2: los bichos salen del pasto ----------
const EYES: [number, number, string, number][] = [[28, 82, "#ff3020", 0.4], [62, 78, "#ffb020", 0.8], [96, 84, "#9acd32", 1.2], [128, 80, "#ff3020", 1.5], [160, 83, "#c9a0ff", 1.8], [44, 90, "#ff3020", 2.1], [112, 90, "#ffb020", 2.4], [176, 87, "#9acd32", 2.7]];
// Cabezas que asoman del pasto: silueta con filo de luna, ojos de color, antenas que se mecen y mandíbulas
const HEAD = [[4, 6], [2, 10], [1, 12], [0, 14], [0, 14], [0, 14], [1, 12], [2, 10], [4, 6]], SHELL = [[6, 10], [3, 16], [1, 20], [0, 22], [0, 22], [0, 22], [0, 22]];
function head(g: CanvasRenderingContext2D, x: number, y: number, t: number, eye: string, beetle = false) {
  const k = beetle ? 2 : 1.6, c = beetle ? "#0b1f14" : "#06080a", rim = beetle ? "#3f9a5a" : "#3a4d60";
  const P = (a: number, b: number, w: number, h: number, col: string) => R(g, x + a * k, y + b * k, Math.ceil(w * k), Math.ceil(h * k), col);
  if (beetle) { SHELL.forEach(([o, w], r) => { P(o, r, w, 1, r === 0 ? rim : c); }); P(10, 1, 1, 6, "#10281a"); P(22, 3, 5, 4, c); P(23, 4, 1, 1, eye); P(26, 1, 2, 3, c); return; }
  HEAD.forEach(([o, w], r) => P(o, r, w, 1, r < 1 ? rim : c));
  P(2, 3, 2, 2, eye); P(10, 3, 2, 2, eye);
  P(3, 9, 2, 2, c); P(9, 9, 2, 2, c); P(3, 11, 1, 1, rim); P(10, 11, 1, 1, rim); // mandíbulas
  for (let i = 1; i < 8; i++) { const sw = Math.sin(t * 3 + i * 0.4) * i * 0.25; P(3 - i * 1.1 + sw, -i * 1.6, 1, 2, c); P(10 + i * 1.1 + sw, -i * 1.6, 1, 2, c); }
}
function bugs(g: CanvasRenderingContext2D, t: number) {
  sky(g, "#05070d", "#25384f", 76);
  R(g, 0, 76, W, H - 76, "#0a140c"); stars(g, t, 22, 30); moon(g, 30, 18);
  for (let x = 0; x < W; x += 2) blade(g, x, 100, 14 + hash(x + 1) * 16, Math.sin(t * 1.3 + x * 0.2) * 0.8, "#0c1a0e"); // pasto del fondo
  for (const [x, y, c, at] of EYES) if (t > at) eyes(g, x, y, c, t, ease((t - at) / 0.3));
  // Hormigas y un escarabajo asoman del pasto (suben desde abajo)
  for (const [x, top, at, eye] of [[26, 76, 2.0, "#ff3020"], [78, 72, 2.5, "#ffb020"], [150, 78, 2.9, "#ff3020"]] as const) if (t > at) head(g, x, top + 30 * (1 - ease((t - at) / 0.9)), t, eye);
  if (t > 3.2) head(g, 108, 62 + 34 * (1 - ease((t - 3.2) / 1.0)), t, "#9acd32", true);
  for (let x = 0; x < W; x += 2) blade(g, x + 1, 106, 12 + hash(x + 7) * 14, Math.sin(t * 1.6 + x * 0.25) * 0.9, "#14301a"); // pasto del medio
  for (let x = 0; x < W; x += 3) blade(g, x, 112, 8 + hash(x + 2) * 14, Math.sin(t * 1.9 + x * 0.3) * 1.2, "#1c4022"); // y del frente
}

// ---------- Cuadro 3: el auto se enciende entre juguetes ----------
type Toy = (g: CanvasRenderingContext2D, lit: boolean) => void;
const dk = "#0a0e14", ed = "#18222f"; // silueta apagada y su filo de luna
const TOYS: Toy[] = [
  (g, lit) => { R(g, 94, 68, 12, 12, lit ? "#3a6fb0" : dk); R(g, 107, 68, 12, 12, lit ? "#e0a030" : dk); R(g, 100, 56, 12, 12, lit ? "#4a9a50" : dk); if (lit) { R(g, 100, 56, 12, 2, "#7fd085"); R(g, 94, 68, 12, 2, "#6a9fd8"); R(g, 107, 68, 12, 2, "#ffd27a"); R(g, 104, 60, 4, 4, "#d6e8c8"); } else R(g, 94, 68, 12, 1, ed); },
  (g, lit) => { R(g, 124, 66, 16, 14, lit ? "#e8762c" : dk); R(g, 126, 64, 12, 2, lit ? "#e8762c" : dk); R(g, 126, 80, 12, 1, lit ? "#e8762c" : dk); if (lit) { R(g, 124, 72, 16, 2, "#d6e8c8"); R(g, 127, 66, 4, 2, "#ffb27a"); } else R(g, 126, 64, 12, 1, ed); },
  (g, lit) => { const b = lit ? "#8a5a30" : dk; R(g, 148, 68, 14, 12, b); R(g, 150, 58, 10, 10, b); R(g, 148, 56, 4, 4, b); R(g, 158, 56, 4, 4, b); R(g, 146, 70, 3, 8, b); R(g, 161, 70, 3, 8, b); if (lit) { R(g, 152, 62, 2, 2, "#10170d"); R(g, 156, 62, 2, 2, "#10170d"); R(g, 153, 65, 4, 2, "#c89560"); R(g, 150, 58, 10, 1, "#b07a45"); } else R(g, 150, 58, 10, 1, ed); },
  (g, lit) => { const b = lit ? "#9aa4ad" : dk; R(g, 172, 66, 12, 14, b); R(g, 174, 58, 8, 7, lit ? "#b8c0c8" : dk); R(g, 177, 53, 2, 5, b); R(g, 176, 52, 4, 2, lit ? "#e0a030" : dk); R(g, 170, 68, 2, 8, b); R(g, 184, 68, 2, 8, b); if (lit) { R(g, 175, 60, 2, 2, "#e0a030"); R(g, 179, 60, 2, 2, "#e0a030"); R(g, 174, 70, 8, 4, "#5f6a72"); } else R(g, 172, 66, 12, 1, ed); },
];
function toys(g: CanvasRenderingContext2D, t: number) {
  sky(g, "#070b14", "#18243a", 66);
  stars(g, t, 24, 36); moon(g, 24, 18);
  R(g, 0, 56, W, 12, "#0a0e12"); for (let x = 0; x < W; x += 7) { R(g, x, 52, 5, 16, "#0a0e12"); R(g, x + 1, 50, 3, 2, "#0a0e12"); } // cerca al fondo
  R(g, 0, 66, W, 42, "#0e150f"); for (let x = 0; x < W; x += 4) blade(g, x, 70, 3 + hash(x) * 4, Math.sin(t + x) * 0.6, "#142a17");
  for (const [x, y, c] of [[170, 60, "#ff3020"], [183, 58, "#ff3020"]] as const) if (t > 0.5) eyes(g, x, y, c, t, 0.7); // acechan al fondo
  const power = ease((t - 1.0) / 0.3), lampK = t < 1.3 ? 0 : calm() || t > 1.75 ? 1 : ((t * 24) | 0) % 2; // faro: dos titileos y queda prendido
  for (const f of TOYS) f(g, false);
  if (lampK) {
    const len = ease((t - 1.3) / 0.7) * 150 + 20;
    g.save();
    g.beginPath(); g.moveTo(60, 75); g.lineTo(60 + len, 34); g.lineTo(60 + len, 104); g.closePath(); g.clip();
    const gr = g.createLinearGradient(60, 0, 60 + len, 0); gr.addColorStop(0, "rgba(255,233,194,.5)"); gr.addColorStop(1, "rgba(255,233,194,.06)");
    g.fillStyle = gr; g.fillRect(0, 40, W, 70);
    for (const f of TOYS) f(g, true);
    g.restore();
  }
  // Auto RC de costado: la carrocería recibe color al encender; el antenita titila
  const sh = t > 0.9 && t < 1.3 && !calm() ? ((t * 40) | 0) % 2 : 0, cy = 70 + sh;
  R(g, 25, cy + 5, 36, 6, power ? "#d62828" : "#2a1212"); R(g, 33, cy, 18, 6, power ? "#d62828" : "#2a1212"); R(g, 36, cy + 1, 12, 4, power ? "#1a2530" : "#0a0e14"); R(g, 22, cy + 2, 6, 3, power ? "#9a1c1c" : "#1a0c0c");
  R(g, 25, cy + 9, 36, 2, "#0a0e14"); R(g, 58, cy + 7, 3, 3, lampK ? "#ffe9c2" : "#3a3a30");
  if (power) R(g, 25, cy + 7, 2, 2, "#ff6a30");
  for (const wx of [30, 53]) { R(g, wx - 5, cy + 7, 10, 10, "#0a0a0a"); R(g, wx - 4, cy + 6, 8, 12, "#0a0a0a"); R(g, wx - 2, cy + 10, 4, 4, "#5f6a72"); }
  R(g, 30, cy - 12, 1, 12, "#5f6a72"); R(g, 29, cy - 14, 3, 3, power && ((t * 4) | 0) % 2 ? "#e0a030" : "#2a2418");
  if (t > 0.9 && t < 1.9) { g.globalAlpha = 0.35 * (1 - (t - 0.9)); R(g, 14 - (t - 0.9) * 10, 82 - (t - 0.9) * 8, 10, 6, "#5f6a5a"); g.globalAlpha = 1; } // polvito al arrancar
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
  { text: "Cada noche, cuando la casa se apaga, el patio cambia de dueño.", dur: 4.6, draw: house },
  { text: "Bajo el pasto viven hormigas, escarabajos y cosas peores.", dur: 4.2, draw: bugs },
  { text: "Un auto a control remoto, armado con chatarra, se enciende entre los juguetes olvidados.", dur: 4.8, draw: toys },
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
    const pad = (navigator.getGamepads?.()[0]?.buttons ?? []).map((b) => b.pressed);
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
