// Ambientes: lluvia, luna y escenarios ENCORE.
import { ctx, fxBus, fxLP, noise, duck, onInit, onLevel } from "./context";
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
let ambG: GainNode | null = null;
export function moonAmbience(on: boolean) {
  if (!ctx) return;
  const t = ctx.currentTime;
  fxLP.frequency.setTargetAtTime(on ? 2400 : 22000, t, 0.4);
  if (on && !ambG) {
    ambG = ctx.createGain(); ambG.gain.value = 0; ambG.connect(fxBus);
    const mix = ctx.createGain(); mix.gain.value = 0.7; mix.connect(ambG);
    for (const [f, v] of [[41, 0.5], [41.8, 0.5], [82.3, 0.18], [123, 0.08]]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; g.gain.value = v; o.connect(g).connect(mix); o.start(); } // dos senos casi iguales: el batido lento es el "zumbido"
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.08; lg.gain.value = 0.25; lfo.connect(lg).connect(mix.gain); lfo.start(); // respira cada ~12 s
    const n = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), ng = ctx.createGain(); n.buffer = noise; n.loop = true; lp.type = "lowpass"; lp.frequency.value = 90; ng.gain.value = 0.4; n.connect(lp).connect(ng).connect(mix); n.start();
  }
  ambG?.gain.setTargetAtTime(on ? 0.1 : 0, t, on ? 1.5 : 0.4);
}
// Ambiente propio de cada escenario ENCORE (zona + variante): zumbido de utilería, viento, grillos y estática de show, en bucle por el canal de efectos
// (respeta volumen de efectos y ?mute). Al cambiar de id, crossfade de 2 s; null o pausa lo apagan.
let encCur: { id: string; g: GainNode; src: AudioScheduledSourceNode[] } | null = null, encWant = false;
export const encoreAmbId = () => (encWant ? encCur?.id ?? null : null);
const encLvl = () => { if (encCur && ctx) encCur.g.gain.setTargetAtTime(encWant && !duck ? 1 : 0, ctx.currentTime, 1); };
let encPend: [string | null, string] | null = null;
export function encoreAmbience(zone: string | null, variant = "") {
  encPend = zone ? [zone, variant] : null; // se recuerda el último pedido: initAudio lo arranca
  if (!ctx) return;
  const id = zone ? `${zone}|${variant}` : null;
  if (!id) { encWant = false; return encLvl(); }
  if (encWant && encCur?.id === id) return;
  encWant = true;
  const old = encCur, t = ctx.currentTime;
  old?.g.gain.setTargetAtTime(0, t, 0.7); if (old) setTimeout(() => { for (const n of old.src) n.stop(); old.g.disconnect(); }, 4000); // tras el crossfade se detienen sus fuentes: no quedan voces sonando sin salida
  const g = ctx.createGain(), src: AudioScheduledSourceNode[] = []; g.gain.value = 0; g.connect(fxBus); encCur = { id, g, src };
  let h = 0; for (const c of variant) h = (h * 31 + c.charCodeAt(0)) >>> 0; // la variante mueve el tono del zumbido y cuánta estática hay
  const hum = 48 + (h % 24), stat = 0.012 + ((h >> 5) % 5) * 0.008;
  const osc = (type: OscillatorType, f: number, v: number, dest: AudioNode = g) => { const o = ctx!.createOscillator(), x = ctx!.createGain(); o.type = type; o.frequency.value = f; x.gain.value = v; o.connect(x).connect(dest); o.start(); src.push(o); return x; };
  const bed = (ft: BiquadFilterType, f: number, v: number, q = 0.7) => { const n = ctx!.createBufferSource(), fl = ctx!.createBiquadFilter(), x = ctx!.createGain(); n.buffer = noise; n.loop = true; fl.type = ft; fl.frequency.value = f; fl.Q.value = q; x.gain.value = v; n.connect(fl).connect(x).connect(g); n.start(Math.random()); src.push(n); return x; };
  osc("sine", hum, 0.05); osc("sine", hum * 2.01, 0.015); // zumbido
  bed("highpass", 5000, stat); // estática de show
  if (zone !== "luna") { const w = bed("bandpass", 380, 0.05, 0.6), l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 0.13; lg.gain.value = 0.03; l.connect(lg).connect(w.gain); l.start(); src.push(l); } // viento que sube y baja
  if (zone === "jardin" || /MEDIANOCHE|ESTRENO/.test(variant)) { const gr = osc("sine", 4300, 0, g), l = ctx.createOscillator(), lg = ctx.createGain(); l.type = "square"; l.frequency.value = 7; lg.gain.value = 0.012; l.connect(lg).connect(gr.gain); l.start(); src.push(l); } // grillos: pulsos de 7 Hz
  encLvl();
}

onLevel(encLvl);
onInit(() => { if (encPend) encoreAmbience(encPend[0], encPend[1]); }); // ambiente ENCORE pedido antes del primer gesto
