// Audio 100% procedural con WebAudio (sin archivos). Se enciende con el primer gesto del usuario.
let ctx: AudioContext | null = null;
let master: GainNode, fxBus: GainNode, engBus: GainNode, musicBus: GainNode;
let noise: AudioBuffer;
// Volúmenes 0..1 (Configuración → Audio). El motor va por su propio canal.
const vol = { master: 1, sfx: 1, engine: 1, music: 0.7, mute: false };
let eng: { src: AudioBufferSourceNode; f: BiquadFilterNode; g: GainNode; tf: BiquadFilterNode; tg: GainNode; duck: GainNode } | null = null;

// ?mute en la URL: sin audio en absoluto (pruebas automáticas)
const silent = new URLSearchParams(location.search).has("mute");

export function initAudio() {
  if (silent) return;
  if (ctx) { void ctx.resume(); return; }
  ctx = new AudioContext();
  master = ctx.createGain();
  fxBus = ctx.createGain(); engBus = ctx.createGain(); musicBus = ctx.createGain();
  fxBus.connect(master); engBus.connect(master); musicBus.connect(master);
  setAudio(vol);
  const comp = ctx.createDynamicsCompressor(); // evita saturar con 100 golpes a la vez
  master.connect(comp).connect(ctx.destination);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
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
  if (mState) startMusic(); // música pedida antes del primer gesto
}

export function setAudio(o: Partial<typeof vol>) {
  Object.assign(vol, o);
  if (!ctx) return;
  master.gain.setTargetAtTime(vol.mute ? 0 : vol.master * 0.5, ctx.currentTime, 0.05);
  fxBus.gain.setTargetAtTime(vol.sfx, ctx.currentTime, 0.05);
  engBus.gain.setTargetAtTime(vol.engine, ctx.currentTime, 0.05);
  musicBus.gain.setTargetAtTime(vol.music * 0.45 * (duck ? 0.25 : 1), ctx.currentTime, duck ? 0.15 : 0.4);
}

// Timbre por auto: [multiplicador de rpm, Hz del cuerpo de cada explosión, mezcla de ruido 0..1, irregularidad 0..1]
const ENGINES: Record<string, [number, number, number, number]> = {
  buggy: [1, 95, 0.45, 0.25], monster: [0.75, 70, 0.4, 0.35], formula: [1.35, 120, 0.55, 0.15], tanque: [0.6, 60, 0.35, 0.4],
  carrera: [1.25, 110, 0.6, 0.2], axel: [1.45, 130, 0.5, 0.2], helado: [0.9, 85, 0.3, 0.3], combi: [0.7, 75, 0.4, 0.45],
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

function tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(fxBus); duckEngine();
  o.start(t);
  o.stop(t + dur + 0.02);
}

function hiss(filter: BiquadFilterType, f0: number, f1: number, dur: number, vol: number) {
  if (!ctx) return;
  const t = ctx.currentTime, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noise;
  fl.type = filter;
  fl.frequency.setValueAtTime(f0, t);
  fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl).connect(g).connect(fxBus); duckEngine();
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
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
  ram: (power: number) => { tone("sine", 160, 45, 0.18, Math.min(0.5, 0.2 + power * 0.01)); hiss("lowpass", 1800, 200, 0.12, 0.25); },
  explosion: () => gate("boom", 8) && (hiss("lowpass", 1400, 60, 0.6, 0.45), tone("sine", 90, 30, 0.45, 0.35)),
  zap: () => gate("zap", 10) && hiss("highpass", 6000, 2500, 0.1, 0.12),
  hurt: () => gate("hurt", 6) && (tone("square", 300, 120, 0.16, 0.1), tone("triangle", 150, 70, 0.16, 0.12)), // chirrido de juguete
  ignite: () => { hiss("bandpass", 1800, 400, 0.35, 0.28); tone("sine", 120, 45, 0.3, 0.22); },
  radioChirp: () => { tone("sine", 1800, 1200, 0.04, 0.08); tone("sine", 2400, 1600, 0.04, 0.06, 0.03); },
  steamHiss: () => hiss("highpass", 3500, 1200, 0.28, 0.16),
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
  boss: () => { tone("sawtooth", 70, 40, 1.2, 0.3); hiss("lowpass", 600, 80, 1.2, 0.25); },
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
};


// Lluvia: ruido filtrado en bucle por el canal de efectos (respeta volumen y mute); k 0..1, 0 = silencio
let rainG: GainNode | null = null;
export function rainSfx(k: number) {
  if (!ctx || (!rainG && k <= 0)) return;
  if (!rainG) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter();
    s.buffer = buf; s.loop = true;
    hp.type = "highpass"; hp.frequency.value = 900;
    lp.type = "lowpass"; lp.frequency.value = 9500;
    rainG = ctx.createGain(); rainG.gain.value = 0;
    s.connect(hp).connect(lp).connect(rainG).connect(fxBus);
    s.start();
  }
  rainG.gain.setTargetAtTime(k * 0.1, ctx.currentTime, 0.5);
}

// ---------- Música ----------
// Synthwave lo-fi sintetizado en vivo. Una grilla de 64 pasos (4 compases de semicorcheas) corre siempre:
// los estados no la reinician, solo encienden y apagan capas (crossfade), así el tempo no se corta.
// Cinta: saturación suave + pasabajos + retardo modulado (wow lento y flutter rápido) + swing flojo.
export type MusicState = "menu" | "run" | "boss" | "blackout" | "over" | "race" | "battle";
const LAYERS = ["pad", "bass", "arp", "kick", "snare", "hat", "heart"] as const;
type Layer = (typeof LAYERS)[number];
//                           pad  bass  arp  kick snare hat  heart
const MIX: Record<MusicState, number[]> = {
  menu:     [1,   0.6,  0.35, 0,   0,   0,   0],
  run:      [0.3, 0.8,  0.6,  0.9, 0.8, 0.6, 0],
  boss:     [0.45, 1,   0.75, 1,   1,   0.7, 0],
  blackout: [0,   0.9,  0,    0,   0,   0,   1],
  over:     [0,   0,    0,    0,   0,   0,   0],
  race:     [0.35, 0.9, 0.85, 1,   0.9, 0.85, 0],
  battle:   [0.45, 1,   0.8,  1,   1,   0.9,  0],
};
const BPM: Record<MusicState, number> = { menu: 104, run: 122, boss: 136, blackout: 100, over: 100, race: 140, battle: 150 };
// [raíz MIDI, tercera]: la partida va por C-Am-F-G (mayor, alegre); el jefe por Am-Bb-Am-E (frigio, tenso)
const CALM = [[36, 4], [33, 3], [29, 4], [31, 4]], TENSE = [[33, 3], [34, 4], [33, 3], [40, 4]];
const ARP = [0, 2, 1, 3, 2, 4, 3, 5, 4, 3, 2, 3, 1, 2, 0, 1]; // índices sobre los tonos del acorde (2 octavas)
const hz = (n: number) => 440 * 2 ** ((n - 69) / 12);

let mState: MusicState | null = null, mInt = 0, mTimer = 0, mStep = 0, mNext = 0, mBpm = 100, duck = false;
let mixIn: GainNode;
const lay = {} as Record<Layer, GainNode>;

function startMusic() {
  if (!ctx) return;
  if (!mixIn) {
    mixIn = ctx.createGain();
    const sat = ctx.createWaveShaper(), curve = new Float32Array(1025);
    for (let i = 0; i < 1025; i++) curve[i] = Math.tanh((i / 512 - 1) * 1.4);
    sat.curve = curve;
    const lp = ctx.createBiquadFilter(), dl = ctx.createDelay(0.05);
    lp.type = "lowpass"; lp.frequency.value = 6500;
    dl.delayTime.value = 0.015;
    for (const [f, depth] of [[0.7, 0.0012], [5.3, 0.0003]]) { // wow lento + flutter rápido
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; g.gain.value = depth;
      o.connect(g).connect(dl.delayTime); o.start();
    }
    mixIn.connect(sat).connect(lp).connect(dl).connect(musicBus);
    for (const l of LAYERS) { lay[l] = ctx.createGain(); lay[l].gain.value = 0; lay[l].connect(mixIn); }
    setAudio({});
  }
  applyMix(false);
  if (mState === "over") return outro();
  if (!mTimer) { mNext = ctx.currentTime + 0.08; mStep = 0; mTick(); }
}

function applyMix(fast: boolean) {
  if (!ctx || !mState) return;
  MIX[mState].forEach((g, i) => lay[LAYERS[i]].gain.setTargetAtTime(g, ctx!.currentTime, fast ? 0.2 : 0.9));
}

/** Estado musical; intensity 0..1 (solo importa en "run": más capas y más densidad). Se puede llamar seguido. */
export function music(s: MusicState, intensity = 0) {
  mInt = Math.min(1, Math.max(0, intensity));
  if (duck) { duck = false; setAudio({}); }
  const changed = s !== mState;
  mState = s;
  if (!ctx) return; // sin audio (?mute o antes del primer gesto): se arranca en initAudio
  if (!mixIn) return startMusic();
  if (changed) { applyMix(s !== "run" && s !== "menu"); if (s === "over") outro(); }
  if (!mTimer && s !== "over") { mNext = ctx.currentTime + 0.08; mStep = 0; mTick(); }
}
/** Pausa: baja el volumen de la música sin cortarla. */
export function musicDuck(on: boolean) { duck = on; setAudio({}); }

// Voz de música: oscilador con ataque/caída por una capa; lp > 0 agrega un pasabajos que se cierra (pluck sucio)
function mv(layer: Layer, type: OscillatorType, f: number, t: number, dur: number, g: number, lp = 0, atk = 0.005, det = 0) {
  const c = ctx!, o = c.createOscillator(), a = c.createGain();
  o.type = type; o.frequency.value = f; o.detune.value = det;
  a.gain.setValueAtTime(0.0001, t);
  a.gain.linearRampToValueAtTime(g, t + atk);
  a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (lp) {
    const fl = c.createBiquadFilter();
    fl.type = "lowpass";
    fl.frequency.setValueAtTime(lp * 3, t);
    fl.frequency.exponentialRampToValueAtTime(lp, t + dur * 0.6);
    o.connect(fl).connect(a);
  } else o.connect(a);
  a.connect(lay[layer]);
  o.start(t); o.stop(t + dur + 0.05);
}
function mnoise(layer: Layer, filter: BiquadFilterType, f: number, t: number, dur: number, g: number) {
  const c = ctx!, s = c.createBufferSource(), fl = c.createBiquadFilter(), a = c.createGain();
  s.buffer = noise; fl.type = filter; fl.frequency.value = f;
  a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl).connect(a).connect(lay[layer]);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
function mkick(layer: Layer, t: number, g: number, f0 = 150, f1 = 42, dur = 0.2) {
  const o = ctx!.createOscillator(), a = ctx!.createGain();
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
  a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(a).connect(lay[layer]);
  o.start(t); o.stop(t + dur + 0.02);
}

// Cierre corto de la partida: arpegio descendente en La menor y un bajo largo, directo al mix (sin capas)
function outro() {
  if (!ctx) return;
  clearTimeout(mTimer); mTimer = 0;
  const t = ctx.currentTime + 0.1;
  lay.pad.gain.setTargetAtTime(1, t, 0.05); // las capas están a 0: el cierre usa la de pad
  [76, 72, 69, 64, 57].forEach((n, i) => mv("pad", "square", hz(n), t + i * 0.22, 0.5, 0.1, 1800));
  mv("pad", "sawtooth", hz(33), t, 2.6, 0.3, 300, 0.05);
  mv("pad", "sine", hz(45), t, 3, 0.25, 0, 0.2);
}

// Un paso de 16avo. Arreglo según estado e intensidad; los patrones se vuelven más densos al subir `big`
function mStepPlay(s: number, t0: number, sd: number) {
  const st = mState!, g = MIX[st], k = s & 15, [root, third] = (st === "boss" || st === "battle" ? TENSE : CALM)[s >> 4];
  const on = (l: Layer) => g[LAYERS.indexOf(l)] > 0.02;
  const racing = st === "race" || st === "battle", big = st === "boss" || racing ? 1 : mInt, play = st === "run" || st === "boss" || racing;
  const t = t0 + (k & 1 ? sd * 0.1 : 0); // swing flojo: se siente a mano
  const bar = sd * 16;
  if (k === 0 && on("pad")) for (const n of [root + 12, root + 12 + third, root + 19]) {
    mv("pad", "triangle", hz(n), t, bar * 1.05, 0.07, st === "menu" ? 1200 : 2200, bar * 0.3, -7);
    mv("pad", "triangle", hz(n), t, bar * 1.05, 0.07, st === "menu" ? 1200 : 2200, bar * 0.3, 7);
  }
  if (on("bass")) {
    if (st === "blackout") { if (k === 0) mv("bass", "sine", hz(root), t, bar, 0.5, 0, 0.3); }
    else if (st === "menu") { if (k % 8 === 0) mv("bass", "triangle", hz(root), t, sd * 7.5, 0.35, 500); }
    else if (st === "boss") mv("bass", "sawtooth", hz(root + (k % 4 === 3 ? 12 : k % 8 === 6 ? 7 : 0)), t, sd * 1.5, k % 4 ? 0.22 : 0.32, 450);
    else if (big < 0.3) { if (k % 4 === 0) mv("bass", "square", hz(root + (k % 8 === 4 ? 7 : 0)), t, sd * 2.6, 0.2, 700); } // raíz-quinta saltarina
    else { if (k % 2 === 0) mv("bass", "square", hz(root + [0, 12, 7, 12][(k >> 1) % 4]), t, sd * 1.7, 0.2, 800); }
  }
  if (on("arp") && (st !== "run" || big > 0.12)) {
    const every = st === "menu" ? 4 : st === "boss" || big >= 0.5 ? 1 : 2;
    if (k % every === 0) {
      const ch = [0, third, 7, 12, 12 + third, 19][ARP[k]];
      if (st === "menu") mv("arp", "triangle", hz(root + 24 + ch), t, sd * 4, 0.1);
      else mv("arp", st === "boss" ? "square" : "triangle", hz(root + 24 + ch), t, sd * 1.4, st === "boss" ? 0.07 : 0.14, 2600);
    }
  }
  if (play) {
    if (on("kick") && (k % 4 === 0 && (big >= 0.15 || k % 8 === 0) || big > 0.7 && k === 10)) mkick("kick", t, 0.9);
    if (on("snare") && big > 0.3 && (k === 4 || k === 12 || big > 0.75 && k === 15)) {
      const ghost = k === 15 ? 0.4 : 1;
      mnoise("snare", "bandpass", 1900, t, 0.16, 0.35 * ghost);
      mv("snare", "triangle", 200, t, 0.1, 0.25 * ghost);
    }
    if (on("hat") && big > 0.2 && (k % 4 === 2 || big > 0.5 && k % 2 === 0 || big > 0.8)) mnoise("hat", "highpass", 7500, t, 0.035, k % 4 === 2 ? 0.16 : 0.08);
  }
  if (on("heart") && k % 8 === 0) { // lub-dub
    mkick("heart", t, 0.8, 80, 38, 0.2);
    mkick("heart", t + 0.2, 0.5, 70, 36, 0.2);
  }
}

function mTick() {
  mTimer = 0;
  if (!ctx || !mState || mState === "over") return;
  const ahead = document.hidden ? 1.2 : 0.25; // pestaña oculta: el navegador frena los timers, se programa más adelante
  if (mNext < ctx.currentTime) mNext = ctx.currentTime + 0.03; // se atrasó (suspendido): no recuperar en ráfaga
  while (mNext < ctx.currentTime + ahead) {
    if (!(mStep & 15)) mBpm = BPM[mState]; // el tempo solo cambia entre compases
    const sd = 15 / mBpm; // 16avo = 60 / bpm / 4
    mStepPlay(mStep, mNext, sd);
    mNext += sd; mStep = (mStep + 1) & 63;
  }
  mTimer = window.setTimeout(mTick, 50);
}
