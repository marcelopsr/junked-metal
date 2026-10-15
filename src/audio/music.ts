// Música procedural por estados y capas.
import { ctx, musicBus, noise, duck, setDuck, setAudio, onInit } from "./context";
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

let mState: MusicState | null = null, mInt = 0, mTimer = 0, mStep = 0, mNext = 0, mBpm = 100;
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
    synthOut = ctx.createGain(); synthOut.gain.value = under;
    mixIn.connect(sat).connect(lp).connect(dl).connect(synthOut).connect(musicBus);
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
  const changed = s !== mState;
  if (changed && duck) { setDuck(false); setAudio({}); } // solo un cambio de estado saca de la pausa (antes lo hacía cada llamada)
  mState = s;
  if (!ctx) return; // sin audio (?mute o antes del primer gesto): se arranca en initAudio
  if (!mixIn) return startMusic();
  if (changed) { applyMix(s !== "run" && s !== "menu"); if (s === "over") outro(); }
  if (!mTimer && s !== "over") { mNext = ctx.currentTime + 0.08; mStep = 0; mTick(); }
}
let synthOut: GainNode | null = null, under = 1;
/** La radio suena: la sintetizada se apaga (vuelve sola si la radio no carga o se detiene). */
export function musicUnder(on: boolean) { under = on ? 0 : 1; if (ctx && synthOut) synthOut.gain.setTargetAtTime(under, ctx.currentTime, 0.5); }
export const synthLevel = () => under; // para pruebas: 0 = radio sonando, 1 = sintetizada
/** Pausa: baja el volumen de la música sin cortarla. */
export function musicDuck(on: boolean) { setDuck(on); setAudio({}); }

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

onInit(() => { if (mState) startMusic(); }); // música pedida antes del primer gesto
