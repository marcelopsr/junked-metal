// Audio 100% procedural con WebAudio (sin archivos). Se enciende con el primer gesto del usuario.
let ctx: AudioContext | null = null;
let master: GainNode, fxBus: GainNode, engBus: GainNode, musicBus: GainNode;
let noise: AudioBuffer;
// Volúmenes 0..1 (Configuración → Audio). El motor va por su propio canal.
const vol = { master: 1, sfx: 1, engine: 1, music: 0.7, mute: false };
let eng: { o1: OscillatorNode; o2: OscillatorNode; f: BiquadFilterNode; g: GainNode } | null = null;

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
  // Motor eléctrico RC: dos sierras desafinadas por un pasabajos
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o1.type = o2.type = "sawtooth";
  o2.detune.value = 14;
  f.type = "lowpass";
  g.gain.value = 0;
  o1.connect(f); o2.connect(f); f.connect(g).connect(engBus);
  o1.start(); o2.start();
  eng = { o1, o2, f, g };
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

// Llamar cada frame: el tono sigue a la velocidad, el volumen al acelerador
export function engineSfx(speed01: number, throttle: number, boosting: boolean) {
  if (!ctx || !eng) return;
  const t = ctx.currentTime, hz = 55 + speed01 * 170 + (boosting ? 40 : 0);
  eng.o1.frequency.setTargetAtTime(hz, t, 0.05);
  eng.o2.frequency.setTargetAtTime(hz * 1.5, t, 0.05);
  eng.f.frequency.setTargetAtTime(400 + speed01 * 1800 + (boosting ? 900 : 0), t, 0.05);
  eng.g.gain.setTargetAtTime(0.025 + Math.abs(throttle) * 0.035 + (boosting ? 0.03 : 0), t, 0.08);
}
export function engineStop() { if (ctx && eng) eng.g.gain.setTargetAtTime(0, ctx.currentTime, 0.1); }

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
  o.connect(g).connect(fxBus);
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
  s.connect(fl).connect(g).connect(fxBus);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

// ---------- Sonidos del juego ----------
let combo = 0, comboT = 0;
export const SFX = {
  hit: () => gate("hit", 18) && hiss("bandpass", 2400, 900, 0.06, 0.18),
  kill: () => gate("kill", 14) && (tone("triangle", 420, 140, 0.09, 0.12), hiss("lowpass", 3000, 400, 0.08, 0.1)),
  ram: (power: number) => { tone("sine", 160, 45, 0.18, Math.min(0.5, 0.2 + power * 0.01)); hiss("lowpass", 1800, 200, 0.12, 0.25); },
  explosion: () => gate("boom", 8) && (hiss("lowpass", 1400, 60, 0.6, 0.45), tone("sine", 90, 30, 0.45, 0.35)),
  zap: () => gate("zap", 10) && hiss("highpass", 6000, 2500, 0.1, 0.12),
  hurt: () => gate("hurt", 6) && tone("square", 140, 70, 0.14, 0.12),
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
    if (!gate("gem", 30)) return;
    const now = performance.now();
    combo = now - comboT < 350 ? Math.min(combo + 1, 24) : 0;
    comboT = now;
    const f = 660 * Math.pow(2, combo / 24); // cada tuerca seguida sube el tono
    tone("sine", f, f * 1.5, 0.07, 0.07);
  },
  pickup: () => { tone("triangle", 520, 1040, 0.12, 0.15); tone("triangle", 780, 1560, 0.12, 0.1, 0.06); },
  levelUp: () => [523, 659, 784, 1047].forEach((f, i) => tone("square", f, f, 0.12, 0.07, i * 0.07)),
  boss: () => { tone("sawtooth", 70, 40, 1.2, 0.3); hiss("lowpass", 600, 80, 1.2, 0.25); },
  break: () => { hiss("bandpass", 1600, 300, 0.25, 0.3); tone("triangle", 300, 120, 0.15, 0.15); },
  click: () => tone("square", 900, 900, 0.03, 0.05),
  // Interfaz: bip de foco, clic de radio al aceptar, estática al cambiar de pantalla
  blip: () => gate("blip", 25) && tone("square", 1320, 1320, 0.025, 0.035),
  accept: () => { hiss("bandpass", 3200, 1800, 0.04, 0.2); tone("square", 520, 260, 0.05, 0.05, 0.02); },
  back: () => tone("square", 440, 220, 0.06, 0.04),
  static: () => hiss("bandpass", 5000, 1200, 0.22, 0.09),
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
    lp.type = "lowpass"; lp.frequency.value = 6500;
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
export type MusicState = "menu" | "run" | "boss" | "blackout" | "over";
const LAYERS = ["pad", "bass", "arp", "kick", "snare", "hat", "heart"] as const;
type Layer = (typeof LAYERS)[number];
//                           pad  bass  arp  kick snare hat  heart
const MIX: Record<MusicState, number[]> = {
  menu:     [1,   0.6,  0.35, 0,   0,   0,   0],
  run:      [0.3, 0.8,  0.6,  0.9, 0.8, 0.6, 0],
  boss:     [0.45, 1,   0.75, 1,   1,   0.7, 0],
  blackout: [0,   0.9,  0,    0,   0,   0,   1],
  over:     [0,   0,    0,    0,   0,   0,   0],
};
const BPM: Record<MusicState, number> = { menu: 100, run: 100, boss: 100, blackout: 100, over: 100 };
// [raíz MIDI, tercera]: la partida va por Am-F-C-G; el jefe por Am-Bb-Am-E (frigio, tenso)
const CALM = [[33, 3], [29, 4], [36, 4], [31, 4]], TENSE = [[33, 3], [34, 4], [33, 3], [40, 4]];
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
    for (let i = 0; i < 1025; i++) curve[i] = Math.tanh((i / 512 - 1) * 2.2);
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
  const st = mState!, g = MIX[st], k = s & 15, [root, third] = (st === "boss" ? TENSE : CALM)[s >> 4];
  const on = (l: Layer) => g[LAYERS.indexOf(l)] > 0.02;
  const big = st === "boss" ? 1 : mInt, play = st === "run" || st === "boss";
  const t = t0 + (k & 1 ? sd * 0.1 : 0); // swing flojo: se siente a mano
  const bar = sd * 16;
  if (k === 0 && on("pad")) for (const n of [root + 12, root + 12 + third, root + 19]) {
    mv("pad", "sawtooth", hz(n), t, bar * 1.05, 0.06, st === "menu" ? 900 : 1400, bar * 0.4, -9);
    mv("pad", "sawtooth", hz(n), t, bar * 1.05, 0.06, st === "menu" ? 900 : 1400, bar * 0.4, 9);
  }
  if (on("bass")) {
    if (st === "blackout") { if (k === 0) mv("bass", "sine", hz(root), t, bar, 0.5, 0, 0.3); }
    else if (st === "menu") { if (k % 8 === 0) mv("bass", "triangle", hz(root), t, sd * 7.5, 0.35, 500); }
    else if (big < 0.3) { if (k % 8 === 0) mv("bass", "sawtooth", hz(root), t, sd * 5, 0.3, 380); }
    else if (big < 0.6) { if (k % 2 === 0) mv("bass", "sawtooth", hz(root + (k % 8 === 6 ? 12 : 0)), t, sd * 1.8, 0.3, 420); }
    else mv("bass", "sawtooth", hz(root + (k % 4 === 3 ? 12 : k % 8 === 6 ? 7 : 0)), t, sd * 1.5, k % 4 ? 0.22 : 0.32, 450);
  }
  if (on("arp") && (st !== "run" || big > 0.12)) {
    const every = st === "menu" ? 4 : st === "boss" || big >= 0.5 ? 1 : 2;
    if (k % every === 0) {
      const ch = [0, third, 7, 12, 12 + third, 19][ARP[k]];
      if (st === "menu") mv("arp", "triangle", hz(root + 24 + ch), t, sd * 4, 0.1);
      else mv("arp", "square", hz(root + 24 + ch), t, sd * 1.4, 0.07, 1900);
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
