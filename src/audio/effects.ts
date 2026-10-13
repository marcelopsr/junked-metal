// SFX de impactos, motor, armas y UI (ver audio/context.ts para el AudioContext y los buses).
import { ctx, fxBus, engBus, noise, onInit } from "./context";
let eng: { src: AudioBufferSourceNode; f: BiquadFilterNode; g: GainNode; tf: BiquadFilterNode; tg: GainNode; duck: GainNode } | null = null;
const ENGINES: Record<string, [number, number, number, number]> = {
  buggy: [1, 95, 0.45, 0.25], monster: [0.75, 70, 0.4, 0.35], formula: [1.35, 120, 0.55, 0.15], tanque: [0.6, 60, 0.35, 0.4],
  carrera: [1.25, 110, 0.6, 0.2], axel: [1.45, 130, 0.5, 0.2], helado: [0.9, 85, 0.3, 0.3], combi: [0.7, 75, 0.4, 0.45],
  hover: [1.1, 100, 0.7, 0.1], topadora: [0.55, 55, 0.4, 0.5], triciclo: [1.15, 105, 0.45, 0.2],
  murcielago: [0.9, 80, 0.5, 0.35], misterio: [0.7, 75, 0.4, 0.4], clasico: [0.95, 90, 0.4, 0.25], jeep: [0.85, 85, 0.45, 0.35], moto: [1.5, 135, 0.5, 0.15], monopatin: [1.3, 120, 0.25, 0.1],
};
const BASE_HZ = 40; // frecuencia de encendido con la que se graba el bucle; playbackRate la lleva a las rpm reales
const bufs = new Map<string, AudioBuffer>();
// ponytail: 48 explosiones fijas en bucle (~1,2 s) en vez de un AudioWorklet; el jitter se repite cada 1,2 s, imperceptible bajo el wobble de rpm
function cycleBuf(kind: string) {
  const c = ctx!, [, body, nmix, rough] = ENGINES[kind] ?? ENGINES.buggy, sr = c.sampleRate, n = 48, per = sr / BASE_HZ;
  const b = c.createBuffer(1, Math.round(n * per), sr), d = b.getChannelData(0);
  let lp = 0;
  for (let k = 0; k < n; k++) {
    const t0 = Math.round(k * per + (Math.random() - 0.5) * per * 0.3 * rough); // jitter de tiempo
    const amp = (k % 7 === 3 && Math.random() < rough) ? 0.25 : 0.7 + Math.random() * 0.3; // a veces "falla" una explosión
    const len = Math.round(per * 0.9);
    for (let i = 0; i < len; i++) {
      const j = (t0 + i + d.length) % d.length, x = i / sr;
      const env = Math.exp(-x * 90); // golpe corto (~11 ms)
      lp += ((Math.random() * 2 - 1) - lp) * 0.25; // ruido ya oscurecido
      d[j] += amp * env * ((1 - nmix) * Math.sin(2 * Math.PI * body * x) * Math.exp(-x * 40) + nmix * lp * 2.2);
    }
  }
  let mx = 0; for (const v of d) mx = Math.max(mx, Math.abs(v));
  for (let i = 0; i < d.length; i++) d[i] /= mx;
  return b;
}
let engMul = 1, engKind = "buggy";
export function setEngineKind(kind: string) {
  engKind = kind; engMul = (ENGINES[kind] ?? ENGINES.buggy)[0];
  if (!ctx || !eng) return;
  if (!bufs.has(kind)) bufs.set(kind, cycleBuf(kind));
  const s = ctx.createBufferSource(); // cambiar de buffer exige otro nodo (solo al elegir auto)
  s.buffer = bufs.get(kind)!; s.loop = true; s.playbackRate.value = eng.src.playbackRate.value || 1;
  s.connect(eng.f); s.start();
  if (eng.src.buffer) eng.src.stop();
  eng.src = s;
}
// Petardeo: 2-3 chasquidos graves al soltar el acelerador o derrapando (raro: nodos sueltos solo ahí)
function backfire() {
  if (!ctx || !eng || !gate("bf", 1.5)) return;
  const t0 = ctx.currentTime;
  for (let i = 0, n = 2 + (Math.random() < 0.4 ? 1 : 0); i < n; i++) {
    const t = t0 + i * (0.05 + Math.random() * 0.06), s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; fl.type = "lowpass"; fl.frequency.value = 900 + Math.random() * 500;
    g.gain.setValueAtTime(0.09 * (1 - i * 0.25), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    s.connect(fl).connect(g).connect(eng.duck); s.start(t, Math.random() * 0.5); s.stop(t + 0.08);
  }
}
let duckT = 0;
// Disparos y golpes bajan el motor un poco y por poco tiempo (sidechain leve)
function duckEngine() {
  if (!ctx || !eng || ctx.currentTime - duckT < 0.05) return;
  duckT = ctx.currentTime;
  eng.duck.gain.cancelScheduledValues(duckT);
  eng.duck.gain.setTargetAtTime(0.55, duckT, 0.01);
  eng.duck.gain.setTargetAtTime(1, duckT + 0.06, 0.18);
}
// Ruido de ruedas por piso: [frecuencia del pasabanda, Q, volumen a tope, brillo del motor]
const FLOORS: Record<string, [number, number, number, number]> = {
  pasto: [700, 0.6, 0.016, 0.85], // roce sordo
  tierra: [320, 0.5, 0.022, 0.8], // rumor grave
  baldosa: [2200, 1.4, 0.010, 1.05], // traqueteo fino
  cemento: [1500, 2.5, 0.008, 1.1], // siseo
};
let steadyT = 0, avg = 0, lastThr = 0, lastT = 0;
// Llamar cada frame: el tono sigue a la velocidad (poco), el volumen al acelerador y baja solo si nada cambia
export function engineSfx(speed01: number, throttle: number, boosting: boolean, drift = false, floor = "pasto") {
  if (!ctx || !eng) return;
  const t = ctx.currentTime, dt = Math.min(0.1, t - lastT); lastT = t;
  const [ff, fq, fv, bright] = FLOORS[floor] ?? FLOORS.pasto;
  // Cansancio: a velocidad pareja, sin turbo ni derrape, el motor baja hasta la mitad en ~4 s (tras 2 s); vuelve al cambiar algo
  avg += (speed01 - avg) * Math.min(1, dt * 1.5);
  const steady = !boosting && !drift && throttle >= 0 && Math.abs(speed01 - avg) < 0.04 && Math.abs(throttle - lastThr) < 0.2;
  steadyT = steady ? steadyT + dt : 0;
  const tired = 1 - 0.5 * Math.min(1, Math.max(0, (steadyT - 2) / 4));
  // Variación lenta (dos senos sin período común): las rpm nunca quedan clavadas
  const wob = Math.sin(t * 0.37) * Math.sin(t * 0.13 + 1);
  if (lastThr > 0.6 && throttle < 0.15 && speed01 > 0.3 && Math.random() < 0.7) backfire(); // soltar el acelerador
  if (drift && speed01 > 0.4 && Math.random() < dt * 0.8) backfire();
  lastThr = throttle;
  const hz = (22 + speed01 * 48 + Math.max(0, throttle) * 10 + (boosting ? 14 : 0)) * engMul * (1 + wob * 0.03); // encendidos/s: ralentí ~22, a fondo ~80
  eng.src.playbackRate.setTargetAtTime(hz / BASE_HZ, t, 0.12);
  eng.f.frequency.setTargetAtTime((380 + speed01 * 700 + (boosting ? 350 : 0)) * bright, t, 0.1); // nunca pasa de ~1,5 kHz: sin zumbido agudo
  eng.g.gain.setTargetAtTime((0.04 + Math.abs(throttle) * 0.03 + (boosting ? 0.02 : 0)) * tired, t, steady ? 0.8 : 0.1);
  eng.tf.frequency.setTargetAtTime(ff * (0.8 + speed01 * 0.4), t, 0.1); eng.tf.Q.value = fq;
  eng.tg.gain.setTargetAtTime(fv * speed01 * (drift ? 2 : 1) * (0.75 + 0.25 * tired), t, 0.1);
}
// Prueba de sonido (Configuración → Audio): guion simulado sin jugar, ~14 s. [hasta s, velocidad, acelerador, turbo, derrape]
const TEST: [number, number, number, boolean, boolean][] = [[2, 0, 0, false, false], [4, 0.6, 1, false, false], [8, 0.6, 0.6, false, false], [10, 1, 1, true, false], [11, 0.8, 0, false, false], [12.5, 0.7, 1, false, true], [14, 0.1, -1, false, false]];
let testT = 0;
export function engineTest(kind: string) {
  if (!ctx) return;
  setEngineKind(kind); clearInterval(testT);
  const t0 = ctx.currentTime;
  let sp = 0;
  testT = window.setInterval(() => {
    const e = ctx!.currentTime - t0, st = TEST.find((x) => e < x[0]);
    if (!st) { clearInterval(testT); engineStop(); return; }
    sp += (st[1] - sp) * 0.06; // la velocidad sigue al guion con inercia
    engineSfx(sp, st[2], st[3], st[4], "pasto");
  }, 33);
}
export function engineStop() { if (ctx && eng) { eng.g.gain.setTargetAtTime(0, ctx.currentTime, 0.1); eng.tg.gain.setTargetAtTime(0, ctx.currentTime, 0.1); } }

// ---------- Primitivas ----------
const recent = new Map<string, number>();
// Limita cuántas veces por segundo suena lo mismo (hordas = cientos de golpes)
function gate(key: string, perSec: number) {
  const now = performance.now(), last = recent.get(key) ?? 0;
  if (now - last < 1000 / perSec) return false;
  recent.set(key, now);
  return true;
}

function tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0, pan?: number) {
  if (!ctx) return;
  const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (pan !== undefined && ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(panner).connect(fxBus);
  } else {
    g.connect(fxBus);
  }
  duckEngine();
  o.start(t);
  o.stop(t + dur + 0.02);
}

function hiss(filter: BiquadFilterType, f0: number, f1: number, dur: number, vol: number, pan?: number, dist?: number): void;
function hiss(dur: number, vol: number, f0: number, f1: number, pan?: number, dist?: number): void;
function hiss(
  a: BiquadFilterType | number,
  b: number,
  c: number,
  d: number,
  e?: number,
  f?: number,
  gArg?: number,
) {
  if (!ctx) return;
  let filter: BiquadFilterType = "bandpass";
  let f0: number, f1: number, dur: number, vol: number, pan: number | undefined, dist: number | undefined;
  if (typeof a === "string") {
    filter = a;
    f0 = b;
    f1 = c;
    dur = d;
    vol = e ?? 0.1;
    pan = f;
    dist = gArg;
  } else {
    dur = a;
    vol = b;
    f0 = c;
    f1 = d;
    pan = e;
    dist = f;
  }
  const finalF0 = dist !== undefined ? Math.max(450, f0 / (1 + dist * 0.025)) : f0;
  const t = ctx.currentTime, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noise;
  fl.type = filter;
  fl.frequency.setValueAtTime(Math.max(20, finalF0), t);
  fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl).connect(g);
  if (pan !== undefined && ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(panner).connect(fxBus);
  } else {
    g.connect(fxBus);
  }
  duckEngine();
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

/**
 * Crea o configura un nodo de filtro pasabajos para simular oclusión acústica por obstáculos sólidos.
 */
export function occludeLowpass(cutoff = 700, q = 1.0): BiquadFilterNode | null {
  if (!ctx) return null;
  const fl = ctx.createBiquadFilter();
  fl.type = "lowpass";
  fl.frequency.setValueAtTime(cutoff, ctx.currentTime);
  fl.Q.setValueAtTime(q, ctx.currentTime);
  return fl;
}

/** Micro-chasquidos de pérdida de tracción y gravilla proyectada contra chasis/pasos de rueda. */
export function wheelSpin(slip?: number, pan?: number) {
  SFX.wheelSpin(slip, pan);
}

// ---------- Sonidos del juego ----------
let combo = 0, comboT = 0;
// Melodía del camioncito de helados (ponytail: notas fijas, onda triangular; ~6 s)
const JINGLE: [number, number][] = [[392, 0], [392, 0.22], [440, 0.44], [494, 0.66], [392, 0.88], [494, 1.1], [440, 1.32], [294, 1.76], [392, 2.2], [392, 2.42], [440, 2.64], [494, 2.86], [392, 3.08], [392, 3.3], [330, 3.52], [392, 3.96]];
export const SFX = {
  // Racha de bajas: tono ascendente según el tamaño de la racha; fanfarria corta al superar 50
  streak: (n: number) => { const f = 523 * 2 ** (Math.min(n, 100) / 100); tone("triangle", f, f * 1.25, 0.14, 0.1); if (n % 50 === 0) [1, 1.25, 1.5, 2].forEach((m, i) => tone("square", 523 * m, 523 * m, 0.12, 0.06, i * 0.07)); },
  // Carrera: cuenta regresiva (bocina corta y una larga y aguda al largar), objetos, vueltas y Lakitu
  countBeep: (go: boolean) => go ? (tone("square", 880, 880, 0.55, 0.12), tone("triangle", 1320, 1320, 0.55, 0.08)) : tone("square", 440, 440, 0.18, 0.1),
  // Radio del Director: clic de micrófono + ráfaga de estática (<300 ms, bajo); el aviso de primera partida es más suave y corto
  radio: (soft = false) => { if (soft) { hiss("bandpass", 2600, 1800, 0.07, 0.03); tone("sine", 1100, 1000, 0.05, 0.02, 0.02); } else { tone("square", 1800, 700, 0.025, 0.04); hiss("bandpass", 3200, 1400, 0.16, 0.05, undefined, 0); tone("sine", 900, 880, 0.05, 0.025, 0.14); } },
  whoosh: () => hiss("bandpass", 900, 3600, 0.22, 0.2),
  splat: () => { hiss("lowpass", 1200, 300, 0.18, 0.25); tone("sine", 220, 90, 0.16, 0.2); },
  boing: () => { tone("sine", 160, 520, 0.18, 0.2); tone("triangle", 520, 140, 0.3, 0.14, 0.12); },
  shield: () => { tone("triangle", 600, 1200, 0.2, 0.12); tone("triangle", 900, 1800, 0.2, 0.08, 0.08); },
  miniTurbo: () => { hiss("highpass", 4000, 9000, 0.3, 0.16); tone("square", 500, 1400, 0.25, 0.07); },
  lap: () => [660, 880, 1100].forEach((f, i) => tone("triangle", f, f, 0.14, 0.09, i * 0.08)),
  lakitu: () => { tone("sine", 900, 300, 0.5, 0.12); tone("triangle", 450, 150, 0.5, 0.08); },
  finish: () => [523, 659, 784, 1047, 1318].forEach((f, i) => tone("square", f, f, 0.18, 0.08, i * 0.09)),
  jingle: () => JINGLE.forEach(([f, d]) => tone("triangle", f, f * 0.995, 0.2, 0.07, d)),
  hit: () => gate("hit", 18) && (tone("sine", 700, 320, 0.05, 0.12), hiss("bandpass", 2400, 900, 0.04, 0.08)),
  kill: (racha = 0) => gate("kill", racha >= 25 ? 22 : 14) && (tone("sine", 520, 180, 0.1, 0.14), tone("triangle", 260, 90, 0.12, 0.08)), // boing
  ram: (powerOrPan: number = 10, pan?: number, dist?: number) => {
    const isPanOnly = pan === undefined && Math.abs(powerOrPan) <= 1;
    const pwr = isPanOnly ? 10 : powerOrPan;
    const p = isPanOnly ? powerOrPan : pan;
    const dGain = dist !== undefined ? Math.max(0.15, 1 / (1 + dist * 0.04)) : 1;
    tone("sine", 160, 45, 0.18, Math.min(0.5, (0.2 + pwr * 0.01) * dGain), 0, p);
    hiss("lowpass", 1800, 200, 0.12, 0.25 * dGain, p, dist);
  },
  explosion: () => gate("boom", 8) && (hiss("lowpass", 1400, 60, 0.6, 0.45), tone("sine", 90, 30, 0.45, 0.35)),
  zap: (pan?: number) => { tone("sawtooth", 300, 1200, 0.06, 0.14, 0, pan); },
  hurt: () => gate("hurt", 6) && (tone("square", 300, 120, 0.16, 0.1), tone("triangle", 150, 70, 0.16, 0.12)), // chirrido de juguete
  ignite: () => { hiss("bandpass", 1800, 400, 0.35, 0.28); tone("sine", 120, 45, 0.3, 0.22); },
  radioChirp: () => { tone("sine", 1800, 1200, 0.04, 0.08); tone("sine", 2400, 1600, 0.04, 0.06, 0.03); },
  steamHiss: () => hiss("highpass", 3500, 1200, 0.28, 0.16),
  relayClick: () => { tone("square", 1600, 800, 0.015, 0.08); tone("square", 1200, 400, 0.02, 0.07, 0.02); },
  overtake: () => { tone("sine", 620, 1240, 0.08, 0.12); tone("triangle", 1240, 1860, 0.08, 0.08, 0.04); },
  podiumFanfare: () => {
    tone("triangle", 523.25, 523.25, 0.1, 0.12);
    tone("triangle", 659.25, 659.25, 0.1, 0.12, 0.08);
    tone("triangle", 783.99, 783.99, 0.1, 0.12, 0.16);
    tone("triangle", 1046.5, 1046.5, 0.22, 0.24, 0.24);
  },
  scrapClink: (pan?: number) => { tone("triangle", 2200, 1800, 0.04, 0.08, 0, pan); tone("sine", 3200, 2400, 0.03, 0.06, 0.02, pan); },
  collisionWarning: (pan?: number) => { tone("sawtooth", 880, 880, 0.05, 0.08, 0, pan); tone("sawtooth", 880, 880, 0.05, 0.08, 0.08, pan); },
  spatialAlert: (pan: number, dist?: number) => {
    const dGain = dist !== undefined ? Math.max(0.12, 1 / (1 + dist * 0.04)) : 1;
    tone("triangle", 1046.5, 783.99, 0.08, 0.12 * dGain, 0, pan);
  },
  spatialHiss: (pan: number, dur = 0.15, dist?: number) => {
    const dGain = dist !== undefined ? Math.max(0.15, 1 / (1 + dist * 0.04)) : 1;
    hiss(dur, 0.12 * dGain, 1200, 0, pan, dist);
  },
  scrape: (pan?: number) => { hiss("bandpass", 2200, 600, 0.08, 0.14, pan); },
  drift: (pwr?: number, pan?: number, floor?: "asfalto" | "tierra" | "hierba") => {
    if (!gate("drift", 16)) return;
    const isPanOnly = pan === undefined && pwr !== undefined && pwr < 0;
    const actualPan = isPanOnly ? pwr : pan;
    const intensity = isPanOnly ? 1 : pwr === undefined ? 1 : Math.max(0, Math.min(2.5, pwr));
    if (intensity <= 0.01) return;
    const fType = floor ?? "asfalto";
    if (fType === "tierra") {
      hiss("lowpass", 450, 160, 0.14, 0.13 * intensity, actualPan);
      hiss("bandpass", 320, 90, 0.11, 0.10 * intensity, actualPan);
      tone("triangle", 130, 50, 0.08, 0.06 * intensity, 0, actualPan);
    } else if (fType === "hierba") {
      hiss("lowpass", 320, 120, 0.13, 0.08 * intensity, actualPan);
      hiss("bandpass", 280, 140, 0.09, 0.05 * intensity, actualPan);
    } else {
      hiss("bandpass", 1200, 420, 0.13, 0.12 * intensity, actualPan);
      tone("sawtooth", 1180, 580, 0.10, 0.04 * intensity, 0, actualPan);
      tone("sine", 1220, 720, 0.11, 0.04 * intensity, 0, actualPan);
    }
  },
  /** Efecto Doppler para adelantamientos y pasadas a alta velocidad de rivales. */
  dopplerBy: (relSpeed: number, pan?: number, dist?: number) => {
    if (!gate("doppler", 6)) return;
    const sp = Math.max(3, Math.min(60, Math.abs(relSpeed)));
    const dGain = dist !== undefined ? Math.max(0.1, 1 / (1 + dist * 0.045)) : 1;
    const dur = Math.max(0.22, Math.min(0.48, 0.36 + sp * 0.002));
    const fTop = Math.min(1800, 360 + sp * 24);
    const fBottom = Math.max(65, (160 + sp * 6) * 0.48);
    tone("sawtooth", fTop, fBottom, dur, 0.09 * dGain, 0, pan);
    tone("triangle", fTop * 0.55, fBottom * 0.6, dur, 0.11 * dGain, 0, pan);
    const hissTop = Math.min(3600, 1100 + sp * 40);
    const hissBottom = Math.max(160, 280);
    hiss("bandpass", hissTop, hissBottom, dur, 0.15 * dGain, pan, dist);
  },
  boostSurge: () => {
    SFX.turboRelay();
    tone("triangle", 220, 880, 0.15, 0.18);
    tone("sawtooth", 440, 1100, 0.12, 0.15, 0.04);
  },
  turboRelay: () => { tone("square", 1800, 400, 0.015, 0.1); tone("triangle", 220, 80, 0.03, 0.12, 0.015); },
  wheelSpin: (slip = 1, pan?: number) => {
    if (!gate("wheelspin", 12)) return;
    const s = Math.max(0.1, Math.min(2.5, slip));
    tone("triangle", 220, 140, 0.05, 0.08 * s, 0, pan);
    hiss("bandpass", 2800, 900, 0.06, 0.12 * s, pan);
  },
  brakeScreech: (pan?: number) => { tone("sawtooth", 950, 420, 0.12, 0.16, 0, pan); tone("triangle", 600, 300, 0.08, 0.12, 0.03, pan); },
  teslaDischarge: (pan?: number, dist?: number) => {
    if (!gate("tesla-arc", 16)) return;
    const dGain = dist !== undefined ? Math.max(0.12, 1 / (1 + dist * 0.04)) : 1;
    tone("sawtooth", 450, 1800, 0.08, 0.16 * dGain, 0, pan);
    hiss(0.09, 0.14 * dGain, 2800, 600, pan, dist);
  },
  lipoFull: () => { tone("sine", 587.33, 880, 0.08, 0.14); tone("triangle", 880, 1174.66, 0.1, 0.18, 0.06); },
  bodyThud: (impulseOrPan?: number, panArg?: number, dist?: number, mat?: "wood" | "metal" | "soft") => {
    if (!gate("body-thud", 8)) return;
    const isPanOnly = panArg === undefined && impulseOrPan !== undefined && Math.abs(impulseOrPan) <= 1;
    const p = isPanOnly ? impulseOrPan : panArg;
    const imp = isPanOnly || impulseOrPan === undefined ? 5 : impulseOrPan;
    const dGain = dist !== undefined ? Math.max(0.12, 1 / (1 + dist * 0.04)) : 1;
    const vol = Math.min(0.35, (0.08 + imp * 0.02) * dGain);
    const cutoff = mat === "metal" ? 1400 : mat === "wood" ? 450 : mat === "soft" ? 280 : 600;
    tone("sine", 140, 50, 0.12, vol, 0, p);
    hiss("lowpass", cutoff, 150, 0.1, vol * 0.8, p, dist);
  },
  /** Choque contra props de taller y patio: sonido metálico sordo y resonante en tambores vs. crujido sordo elástico en neumáticos */
  propCrash: (type: "drum" | "tire" | "wood", spd = 12, pan?: number) => {
    if (!gate("prop-crash", 6)) return;
    const intensity = Math.min(2.5, Math.max(0.6, spd / 10));
    if (type === "drum") {
      // Tambor de chapa de combustible: gong/resonancia metálica hueca
      tone("square", 180, 85, 0.22, 0.18 * intensity, 0, pan);
      tone("triangle", 340, 110, 0.28, 0.14 * intensity, 0.02, pan);
      hiss("bandpass", 1600, 320, 0.2, 0.22 * intensity, pan);
    } else if (type === "tire") {
      // Pila de neumáticos: crujido de caucho comprimido sordo y amortiguado
      tone("sine", 110, 45, 0.25, 0.22 * intensity, 0, pan);
      hiss("lowpass", 320, 90, 0.22, 0.26 * intensity, pan);
    } else {
      // Madera/cajas: crujido seco
      tone("triangle", 240, 90, 0.12, 0.16 * intensity, 0, pan);
      hiss("bandpass", 850, 200, 0.15, 0.2 * intensity, pan);
    }
  },
  lipoLowWarn: () => {
    if (!gate("lipo-warn", 0.4)) return;
    tone("square", 2400, 2400, 0.04, 0.06);
    tone("square", 2400, 2400, 0.04, 0.06, 0.08);
  },
  gravelThud: (impulse = 5, pan?: number, dist?: number) => {
    if (!gate("gravel-thud", 10)) return;
    const dGain = dist !== undefined ? Math.max(0.12, 1 / (1 + dist * 0.04)) : 1;
    const vol = Math.min(0.3, (0.07 + impulse * 0.02) * dGain);
    tone("sine", 110, 45, 0.14, vol, 0, pan);
    hiss("bandpass", 1600, 400, 0.12, vol * 0.9, pan, dist);
  },
  regenWhine: (spd = 10, pan?: number) => {
    if (!gate("regen-whine", 6)) return;
    const s = Math.max(2, Math.min(45, spd));
    const fStart = Math.min(2200, 600 + s * 35);
    tone("triangle", fStart, fStart * 0.45, 0.16, 0.07, 0, pan);
  },
  // Impacto sobre un bicho según la fuente del daño (dmgSrc de main.ts). Lo que ya suena por su cuenta (explosión, rayo, embestida) no se repite.
  impact: (src: string, crit = false) => {
    if (crit) tone("square", 880, 440, 0.05, 0.06);
    switch (src) {
      case "gomitas": return gate("i-gom", 16) && (tone("sine", 520, 190, 0.07, 0.14), hiss("bandpass", 1500, 700, 0.04, 0.1)); // pop de goma
      case "clips": return gate("i-clip", 16) && (tone("triangle", 2100, 1500, 0.05, 0.1), hiss("highpass", 7000, 4000, 0.04, 0.12)); // tintineo de metal
      case "agua": case "globos": return gate("i-agua", 10) && hiss("bandpass", 1100, 500, 0.09, 0.14); // chapoteo
      case "chispero": case "anillo": return gate("i-fire", 8) && hiss("lowpass", 2200, 500, 0.12, 0.12); // chisporroteo
      case "pelota": return gate("i-ball", 6) && tone("sine", 110, 40, 0.16, 0.3); // golpe sordo
      case "petardos": case "chispazo": case "tesla": case "embestida": return; // ya suenan explosion / zap / ram
      default: return gate("hit", 18) && hiss("bandpass", 2400, 900, 0.06, 0.18);
    }
  },
  gem: () => {
    if (!gate("gem", 42)) return;
    const now = performance.now();
    combo = now - comboT < 350 ? Math.min(combo + 1, 24) : 0;
    comboT = now;
    const f = 660 * Math.pow(2, combo / 24); // cada tuerca seguida sube el tono
    tone("sine", f, f * 1.5, 0.07, 0.07);
  },
  pickup: () => gate("pickup", 12) && (tone("triangle", 520, 1040, 0.12, 0.15), tone("triangle", 780, 1560, 0.12, 0.1, 0.06)),
  levelUp: () => [523, 659, 784, 1047].forEach((f, i) => tone("square", f, f, 0.12, 0.07, i * 0.07)),
  boss: () => {
    // Rugido sordo grave
    tone("sawtooth", 70, 40, 1.2, 0.3);
    hiss("lowpass", 600, 80, 1.2, 0.25);
    // Alarma industrial diegética de advertencia en frecuencia FM (interferencia y choque)
    gate("boss-alarm", 1) && (
      tone("square", 440, 330, 0.22, 0.12),
      tone("sawtooth", 220, 110, 0.35, 0.18, 0.08),
      hiss("bandpass", 1800, 600, 0.18, 0.15, undefined, 0.05)
    );
  },
  break: () => { hiss("bandpass", 1600, 300, 0.25, 0.3); tone("triangle", 300, 120, 0.15, 0.15); },
  /** Bloque que se desprende en Demolición fabricación: rueda = goma, chapa = metal. */
  duelPartBreak: (wheel: boolean) => {
    if (wheel) {
      gate("d-wheel", 12) && (tone("sine", 180, 90, 0.12, 0.16), hiss("bandpass", 900, 350, 0.08, 0.14));
    } else {
      gate("d-metal", 12) && (tone("triangle", 420, 180, 0.08, 0.12), hiss("bandpass", 2800, 700, 0.06, 0.16));
    }
  },
  /** Colocación en rejilla de fabricación Demolición. */
  duelFabPlace: () => gate("fab-pl", 22) && (tone("triangle", 640, 960, 0.06, 0.1), hiss("bandpass", 2200, 800, 0.04, 0.12)),
  duelFabReject: () => gate("fab-rj", 28) && (tone("square", 280, 140, 0.07, 0.09), hiss("bandpass", 900, 200, 0.05, 0.1)),
  duelFabErase: () => gate("fab-er", 24) && (tone("triangle", 360, 200, 0.05, 0.08), hiss("bandpass", 1400, 400, 0.04, 0.1)),
  click: () => tone("square", 900, 900, 0.03, 0.05),
  // Interfaz: bip de foco, clic de radio al aceptar, estática al cambiar de pantalla
  blip: () => gate("blip", 25) && tone("square", 1320, 1320, 0.025, 0.035),
  accept: () => { hiss("bandpass", 3200, 1800, 0.04, 0.2); tone("square", 520, 260, 0.05, 0.05, 0.02); },
  back: () => tone("square", 440, 220, 0.06, 0.04),
  static: () => hiss("bandpass", 5000, 1200, 0.22, 0.09),
  /** Arcade match-3: intercambio, línea eliminada, click mecánico y fanfarria de nivel. */
  m3Click: () => gate("m3ck", 28) && (tone("square", 1200, 600, 0.02, 0.06), hiss("bandpass", 3400, 1400, 0.025, 0.08)),
  m3Swap: () => gate("m3sw", 20) && (tone("triangle", 440, 880, 0.05, 0.11), hiss("bandpass", 2600, 1100, 0.035, 0.14)),
  m3Clear: () => gate("m3cl", 14) && (tone("square", 740, 370, 0.07, 0.09), tone("triangle", 1100, 550, 0.06, 0.08), hiss("lowpass", 3200, 800, 0.05, 0.14)),
  m3Win: () => [523, 659, 784, 1047, 1318].forEach((f, i) => {
    tone("triangle", f, f * 1.01, 0.22, 0.1, i * 0.07);
    tone("square", f * 0.5, f * 0.5, 0.18, 0.04, i * 0.07);
  }),
  /** Crujido y vibración de alta frecuencia de policarbonato al rozar bordillos o peraltes de hormigón. */
  curbRattle: (spd = 10, pan?: number) => {
    if (!gate("curb-rattle", 10)) return;
    const s = Math.max(2, Math.min(40, Math.abs(spd)));
    const vol = Math.min(0.24, 0.06 + s * 0.005);
    tone("triangle", 320, 160, 0.06, vol * 0.8, 0, pan);
    hiss("bandpass", 1800, 600, 0.05, vol, pan);
    tone("triangle", 280, 140, 0.05, vol * 0.6, 0.02, pan);
  },
  /** Alarma sonora bitonal Failsafe de advertencia de receptor RX en límite de cobertura. */
  rfFailsafeAlarm: () => {
    if (!gate("rf-failsafe", 0.5)) return;
    tone("square", 1950, 1950, 0.05, 0.08);
    tone("square", 2600, 2600, 0.06, 0.09, 0.06);
  },
  /** Zumbido y temblor PWM del servomotor de dirección analógico al girar con esfuerzo. */
  servoChatter: (steer = 0, spd = 10) => {
    if (!gate("servo-chat", 8)) return;
    const st = Math.abs(steer);
    if (st < 0.35) return;
    const vol = Math.min(0.14, 0.03 + st * 0.07);
    tone("square", 4200, 4100, 0.03, vol * 0.45);
    tone("triangle", 2100, 2300, 0.04, vol * 0.65);
  },
  /** Resonancia elástica armónica de la varilla de antena flexible de 2.4 GHz al rozar o colisionar. */
  antennaTwang: (pan?: number) => {
    if (!gate("ant-twang", 4)) return;
    tone("sine", 680, 240, 0.22, 0.14, 0, pan);
    tone("triangle", 1360, 480, 0.11, 0.08, 0, pan);
  },
  /** Silbido y conmutación ultrasónica PWM de transistores MOSFET del ESC al acelerar con carga. */
  escWhine: (spd = 10, load = 1) => {
    if (!gate("esc-whine", 6)) return;
    const s = Math.max(2, Math.min(45, Math.abs(spd)));
    const vol = Math.min(0.12, 0.02 + load * 0.05);
    const f = Math.min(14500, 7800 + s * 140);
    tone("sine", f, f * 0.98, 0.08, vol * 0.7);
    tone("square", f * 0.5, f * 0.49, 0.05, vol * 0.3);
  },
  /** Chirrido mecánico de compresión de muelles y casquillos de nylon de suspensión. */
  chassisSqueak: (impulse = 5, pan?: number) => {
    if (!gate("chassis-sqk", 8)) return;
    const vol = Math.min(0.18, 0.04 + impulse * 0.02);
    tone("triangle", 1850, 920, 0.06, vol * 0.75, 0, pan);
    hiss("bandpass", 3200, 1400, 0.04, vol * 0.6, pan);
  },
  /** Tintineo metálico agudo de llaves y herramientas sobre la bandeja o banco de trabajo. */
  toolClink: (pitch = 1, pan?: number) => {
    if (!gate("tool-clink", 8)) return;
    const p = Math.max(0.6, Math.min(1.8, pitch));
    tone("triangle", 3400 * p, 4800 * p, 0.04, 0.12, 0, pan);
    tone("sine", 6200 * p, 3100 * p, 0.08, 0.08, 0.01, pan);
    hiss("bandpass", 4200 * p, 1200, 0.03, 0.09, pan);
  },
  /** Chasquido plástico y contacto de fricción dorada al enchufar conector XT60/Deans. */
  xt60Snap: (pan?: number) => {
    if (!gate("xt60-snap", 4)) return;
    tone("triangle", 880, 220, 0.03, 0.14, 0, pan);
    hiss("bandpass", 2800, 1400, 0.04, 0.16, pan);
    tone("square", 440, 180, 0.02, 0.1, 0.02, pan);
  },
  /** Crujido de husillo roscado y apriete de mordazas de fundición de hierro. */
  viseCreak: (pan?: number) => {
    if (!gate("vise-creak", 6)) return;
    tone("sawtooth", 520, 310, 0.09, 0.12, 0, pan);
    hiss("bandpass", 1600, 800, 0.06, 0.08, pan);
  },
  /** Siseo térmico y chisporroteo de resina/flux de estaño al soldar conectores en el taller. */
  solderingSizzle: (pan?: number) => {
    if (!gate("solder-sizzle", 4)) return;
    hiss("bandpass", 4800, 1800, 0.08, 0.14, pan);
    hiss("highpass", 6500, 2000, 0.05, 0.09, pan);
    tone("sine", 1200, 800, 0.03, 0.04, 0.02, pan);
  },
  /** Zumbido analógico de transformador PWM y pitido de confirmación de celda LiPo balanceada. */
  chargerHum: (pan?: number) => {
    if (!gate("charger-hum", 3)) return;
    tone("sawtooth", 120, 120, 0.15, 0.08, 0, pan);
    tone("sine", 240, 240, 0.12, 0.06, 0, pan);
    tone("sine", 2800, 2800, 0.04, 0.09, 0.1, pan);
  },
  /** Micro-chasquidos aperiódicos de contracción térmica de aluminio y disipadores tras exigir el motor. */
  coolDownTicks: (pan?: number) => {
    if (!gate("cooldown-ticks", 3)) return;
    const p = 0.9 + Math.random() * 0.3;
    tone("sine", 6800 * p, 4200 * p, 0.02, 0.07, 0, pan);
    hiss("highpass", 7200 * p, 1500, 0.015, 0.08, pan);
  },
  /** Zumbido analógico de tubo fluorescente de taller de 50/60 Hz con micro-estática diegética de fondo. */
  fluorescentBuzz: (vol = 0.05, pan?: number) => {
    if (!gate("fl-buzz", 1)) return;
    tone("sawtooth", 100, 100, 0.4, vol * 0.6, 0, pan);
    tone("sine", 50, 50, 0.4, vol * 0.8, 0, pan);
    hiss("bandpass", 1200, 300, 0.25, vol * 0.3, pan);
  },
  /** Chorro de aire comprimido a presión de pistola neumática para limpieza de chasis y virutas. */
  airBlow: (duration = 0.22, pan?: number) => {
    if (!gate("air-blow", 5)) return;
    const dur = Math.max(0.08, Math.min(0.6, duration));
    hiss("bandpass", 3200, 1600, dur, 0.22, 0, pan);
    hiss("highpass", 4800, 2200, dur * 0.8, 0.16, 0.01, pan);
    tone("triangle", 180, 80, 0.04, 0.12, 0, pan);
  },
  /** Ticks rápidos de trinquete de micro-brida Zip-Tie de nylon al tensarse contra el chasis. */
  zipTieZip: (pan?: number) => {
    if (!gate("ziptie-zip", 4)) return;
    for (let i = 0; i < 5; i++) {
      const delay = i * 0.018;
      const p = 1 + i * 0.08;
      tone("triangle", 2800 * p, 4200 * p, 0.012, 0.08, delay, pan);
      tone("square", 3400 * p, 2100 * p, 0.008, 0.05, delay, pan);
    }
  },
  /** Carraca metálica de llave de vaso con micro-trinquetes mecánicos de cromo-vanadio. */
  ratchetSocketWrench: (pan?: number) => {
    if (!gate("ratchet-wrench", 4)) return;
    for (let i = 0; i < 6; i++) {
      const delay = i * 0.022;
      const p = 1 + (i % 2) * 0.15;
      tone("triangle", 4200 * p, 5600 * p, 0.012, 0.09, delay, pan);
      hiss("highpass", 6200 * p, 1800, 0.008, 0.06, delay, pan);
      tone("square", 1200 * p, 800 * p, 0.006, 0.04, delay, pan);
    }
  },
  /** Purga rápida de condensados de filtro FRL o válvula de sobrepresión de calderín. */
  airPurge: (pan?: number) => {
    if (!gate("air-purge", 4)) return;
    tone("triangle", 480, 160, 0.02, 0.15, 0, pan);
    hiss("bandpass", 4400, 2400, 0.07, 0.25, 0, pan);
    hiss("highpass", 7200, 3000, 0.05, 0.18, 0.01, pan);
  },
  /** Pistonada rítmica y carga de calderín de compresor de taller monofásico de correa. */
  compressorChug: (pan?: number) => {
    if (!gate("comp-chug", 4)) return;
    for (let i = 0; i < 4; i++) {
      const delay = i * 0.065;
      tone("sawtooth", 58, 32, 0.04, 0.16, delay, pan);
      tone("triangle", 120, 60, 0.03, 0.12, delay, pan);
      hiss("bandpass", 800, 400, 0.025, 0.08, delay, pan);
    }
  },
  /** Micro-soplido seco de purga de neumático al ajustar presión en el manómetro digital. */
  tireBleed: (pan?: number) => {
    if (!gate("tire-bleed", 4)) return;
    tone("sine", 1400, 400, 0.015, 0.08, 0, pan);
    hiss("bandpass", 5200, 1800, 0.035, 0.18, 0, pan);
    hiss("highpass", 6800, 2400, 0.025, 0.12, 0.005, pan);
  },
};


// ---------- Sonido espacial (mapa Luna) ----------
// Sin aire no hay viento ni agudos: ambiente = zumbido grave, y todo el canal de efectos pasa por un pasabajos (sonidos amortiguados).
// API para quien engancha cosas de la luna (moon_events.ts, naves, aliens, Sol/Tierra). pan -1..1 (panTo() de moon_events.ts lo saca en el marco local
// del auto), dist en metros (baja el volumen), size ~0,75..1,25. Los de bucle se llaman cada cuadro con k 0..1 (0 = silencio y se apaga solo).
//   moonAmbience(on)                       ambiente + pasabajos de la luna (lo prende moon_events al empezar y lo apaga main al terminar)
//   SPACE.meteorWhistle(pan, dist, dur)    silbido que sube de volumen mientras el meteorito baja (dur = segundos de caída)
//   SPACE.meteorImpact(pan, dist, size)    golpe sordo + temblor (caída de meteorito)
//   SPACE.rumble(pan, dist, dur, vol)      temblor grave (falla que se agrieta)
//   SPACE.eruptionBlast(pan, dist)         estallido de gas al abrirse la erupción
//   SPACE.lava(k)                          bucle: burbujeo grave de la erupción
//   SPACE.mothership(k, pan, doppler)      bucle: zumbido de la nave nodriza; k = cercanía (0 apaga), doppler -1 (se aleja) .. +1 (se acerca)
//   SPACE.alienWave(pan, dist)             disparo de onda alien: barrido descendente con vibrato
//   SPACE.sunLaunch(pan, dist)             bola de fuego que sale del Sol
//   SPACE.earthLaunch(pan, dist)           cohetito que sale de la Tierra
//   SPACE.skyImpact("sol" | "tierra", pan, dist)   impacto en el piso de lo que lanzaron
const dGain = (dist?: number) => (dist === undefined ? 1 : Math.max(0.1, 1 / (1 + dist * 0.04)));
/** Barrido de oscilador con subida (peak = fracción de dur donde llega al máximo) y vibrato opcional (wob Hz). */
function sweep(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, pan = 0, peak = 0.5, wob = 0) {
  if (!ctx) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * peak); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (wob) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = wob; lg.gain.value = f0 * 0.06; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur + 0.02); }
  p.pan.value = Math.max(-1, Math.min(1, pan));
  o.connect(g).connect(p).connect(fxBus); o.start(t); o.stop(t + dur + 0.02);
}
/** Ruido filtrado con la misma subida/caída que sweep(). */
function swell(filter: BiquadFilterType, f0: number, f1: number, dur: number, vol: number, pan = 0, peak = 0.5) {
  if (!ctx) return;
  const t = ctx.currentTime, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner();
  s.buffer = noise; fl.type = filter; fl.frequency.setValueAtTime(Math.max(20, f0), t); fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * peak); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  p.pan.value = Math.max(-1, Math.min(1, pan));
  s.connect(fl).connect(g).connect(p).connect(fxBus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
let lavaG: GainNode | null = null, shipN: { g: GainNode; f: BiquadFilterNode; o: OscillatorNode[]; p: StereoPannerNode } | null = null;
export const SPACE = {
  meteorWhistle: (pan = 0, dist?: number, dur = 1.4) => { const g = dGain(dist); sweep("sine", 2600, 520, dur, 0.06 * g, pan, 0.7); swell("bandpass", 3400, 700, dur, 0.09 * g, pan, 0.8); },
  meteorImpact: (pan = 0, dist?: number, size = 1) => {
    const g = dGain(dist);
    tone("sine", 95 / size ** 0.3, 26, 0.55, 0.4 * g, 0, pan); tone("sine", 60, 30, 0.4, 0.2 * g, 0.12, pan);
    hiss("lowpass", 700, 50, 0.7, 0.34 * g, pan); swell("bandpass", 500, 120, 0.8, 0.1 * g, pan, 0.2); // lluvia de polvo y piedras
  },
  rumble: (pan = 0, dist?: number, dur = 2, vol = 0.2) => { const g = dGain(dist); swell("lowpass", 120, 60, dur, vol * g, pan, 0.4); sweep("sine", 48, 38, dur, vol * 0.8 * g, pan, 0.4); },
  eruptionBlast: (pan = 0, dist?: number) => {
    const g = dGain(dist);
    swell("bandpass", 500, 1800, 1.0, 0.25 * g, pan, 0.15); swell("lowpass", 1200, 200, 1.4, 0.3 * g, pan, 0.2); tone("sine", 70, 30, 0.6, 0.35 * g, 0, pan);
  },
  lava: (k: number) => {
    if (!ctx || (!lavaG && k <= 0)) return;
    if (!lavaG) {
      const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), o = ctx.createOscillator(), og = ctx.createGain();
      s.buffer = noise; s.loop = true; fl.type = "bandpass"; fl.frequency.value = 260; fl.Q.value = 1.2;
      lavaG = ctx.createGain(); lavaG.gain.value = 0; lavaG.connect(fxBus);
      s.connect(fl).connect(lavaG); s.start();
      o.frequency.value = 52; og.gain.value = 0.7; o.connect(og).connect(lavaG); o.start();
    }
    lavaG.gain.setTargetAtTime(Math.min(1, k) * 0.14, ctx.currentTime, 0.3);
  },
  mothership: (k: number, pan = 0, doppler = 0) => {
    if (!ctx || (!shipN && k <= 0)) return;
    if (!shipN) {
      const g = ctx.createGain(), f = ctx.createBiquadFilter(), p = ctx.createStereoPanner(), o: OscillatorNode[] = [];
      g.gain.value = 0; f.type = "lowpass"; f.Q.value = 2; g.connect(f).connect(p).connect(fxBus);
      for (const [type, hz] of [["sawtooth", 50], ["sawtooth", 50.7], ["sine", 100]] as [OscillatorType, number][]) { const x = ctx.createOscillator(); x.type = type; x.frequency.value = hz; x.connect(g); x.start(); o.push(x); }
      shipN = { g, f, o, p };
    }
    const t = ctx.currentTime, c = Math.max(0, Math.min(1, k));
    shipN.g.gain.setTargetAtTime(c * c * 0.16, t, 0.15);
    shipN.f.frequency.setTargetAtTime(180 + 900 * c, t, 0.15);
    shipN.p.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), t, 0.1);
    shipN.o[0].frequency.setTargetAtTime(50 * (1 + 0.07 * doppler), t, 0.2); shipN.o[1].frequency.setTargetAtTime(50.7 * (1 + 0.07 * doppler), t, 0.2); shipN.o[2].frequency.setTargetAtTime(100 * (1 + 0.07 * doppler), t, 0.2);
  },
  alienWave: (pan = 0, dist?: number) => { const g = dGain(dist); sweep("sawtooth", 1500, 260, 0.45, 0.07 * g, pan, 0.1, 38); sweep("sine", 900, 150, 0.4, 0.08 * g, pan, 0.1); },
  sunLaunch: (pan = 0, dist?: number) => { const g = dGain(dist); swell("bandpass", 300, 1200, 0.9, 0.2 * g, pan, 0.3); sweep("sawtooth", 90, 50, 0.9, 0.08 * g, pan, 0.2); },
  earthLaunch: (pan = 0, dist?: number) => { const g = dGain(dist); sweep("triangle", 300, 1400, 0.7, 0.06 * g, pan, 0.3); swell("bandpass", 2000, 600, 0.8, 0.12 * g, pan, 0.25); },
  skyImpact: (kind: "sol" | "tierra", pan = 0, dist?: number) => {
    const g = dGain(dist);
    if (kind === "sol") { tone("sine", 80, 28, 0.5, 0.36 * g, 0, pan); hiss("lowpass", 1100, 80, 0.6, 0.3 * g, pan); }
    else { tone("triangle", 240, 110, 0.12, 0.14 * g, 0, pan); tone("sine", 100, 36, 0.4, 0.3 * g, 0.03, pan); hiss("bandpass", 1800, 300, 0.25, 0.16 * g, pan); }
  },
};

// ---------- Música ----------
// Synthwave lo-fi sintetizado en vivo. Una grilla de 64 pasos (4 compases de semicorcheas) corre siempre:
// los estados no la reinician, solo encienden y apagan capas (crossfade), así el tempo no se corta.
// Cinta: saturación suave + pasabajos + retardo modulado (wow lento y flutter rápido) + swing flojo.

// Arranque del motor (al final de initAudio)
onInit(() => {
  if (!ctx) return;
  // Motor nafta de juguete: bucle de explosiones precalculado (ver cycleBuf) -> pasabajos -> recorte de medios-agudos -> duck -> canal
  const f = ctx.createBiquadFilter(), notch = ctx.createBiquadFilter(), g = ctx.createGain(), duck = ctx.createGain();
  f.type = "lowpass"; f.Q.value = 0.4;
  notch.type = "peaking"; notch.frequency.value = 2500; notch.Q.value = 0.8; notch.gain.value = -9; // hueco para disparos y golpes
  g.gain.value = 0;
  f.connect(notch).connect(g).connect(duck).connect(engBus);
  const src = ctx.createBufferSource();
  const tn = ctx.createBufferSource(), tf = ctx.createBiquadFilter(), tg = ctx.createGain();
  tn.buffer = noise; tn.loop = true; tf.type = "bandpass"; tg.gain.value = 0;
  tn.connect(tf).connect(tg).connect(duck); tn.start();
  eng = { src, f, g, tf, tg, duck };
  setEngineKind(engKind);
});
