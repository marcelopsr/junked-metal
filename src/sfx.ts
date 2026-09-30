// Audio 100% procedural con WebAudio (sin archivos). Se enciende con el primer gesto del usuario.
let ctx: AudioContext | null = null;
let master: GainNode;
let noise: AudioBuffer;
let muted = false;
let eng: { o1: OscillatorNode; o2: OscillatorNode; f: BiquadFilterNode; g: GainNode } | null = null;

// ?mute en la URL: sin audio en absoluto (pruebas automáticas)
const silent = new URLSearchParams(location.search).has("mute");

export function initAudio() {
  if (silent) return;
  if (ctx) { void ctx.resume(); return; }
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = 0.5;
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
  o1.connect(f); o2.connect(f); f.connect(g).connect(master);
  o1.start(); o2.start();
  eng = { o1, o2, f, g };
}

export function toggleMute() {
  muted = !muted;
  if (ctx) master.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.05);
  return muted;
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
  o.connect(g).connect(master);
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
  s.connect(fl).connect(g).connect(master);
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
};
