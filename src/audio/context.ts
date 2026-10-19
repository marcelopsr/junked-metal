// Audio 100% procedural con WebAudio (sin archivos). Se enciende con el primer gesto del usuario.
// Estado compartido (mState y encPend viven en music.ts / ambience.ts y se aplican por onInit): los demás módulos lo importan como binding vivo (solo lectura) y lo cambian con los setters.
export let ctx: AudioContext | null = null;
export let master: GainNode, fxBus: GainNode, engBus: GainNode, musicBus: GainNode;
export let fxLP: BiquadFilterNode, engLP: BiquadFilterNode;
export let noise: AudioBuffer;
// Volúmenes 0..1 (Configuración → Audio). El motor va por su propio canal.
const vol = { master: 1, sfx: 1, engine: 1, music: 0.7, mute: false };
export let duck = false; // música en pausa (bajita)
export const setDuck = (v: boolean) => { duck = v; };

// Ganchos para evitar ciclos: cada módulo registra su arranque (se llaman al final de initAudio, en orden de registro) y su ajuste de nivel.
const inits: (() => void)[] = [], levels: (() => void)[] = [];
export const onInit = (f: () => void) => { inits.push(f); };
export const onLevel = (f: () => void) => { levels.push(f); };

// ?mute en la URL: sin audio en absoluto (pruebas automáticas)
const silent = new URLSearchParams(location.search).has("mute");

export function initAudio() {
  if (silent) return;
  if (ctx) { void ctx.resume(); return; }
  ctx = new AudioContext();
  master = ctx.createGain();
  fxBus = ctx.createGain(); engBus = ctx.createGain(); musicBus = ctx.createGain();
  fxLP = ctx.createBiquadFilter(); fxLP.type = "lowpass"; fxLP.frequency.value = 22000; fxLP.Q.value = 0.5; // transparente; moonAmbience() lo cierra en la luna (sonidos amortiguados)
  engLP = ctx.createBiquadFilter(); engLP.type = "lowpass"; engLP.frequency.value = 22000; engLP.Q.value = 0.5; // motor en vacío lunar
  // Compresor solo de efectos (la radio no pasa por él: no sube ni baja con cada golpe) y limitador suave maestro.
  const comp = ctx.createDynamicsCompressor(); // evita saturar con 100 golpes a la vez
  comp.threshold.value = -18; comp.ratio.value = 4;
  fxBus.connect(fxLP).connect(comp).connect(master); engBus.connect(engLP).connect(master); musicBus.connect(master);
  setAudio(vol);
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -3; lim.knee.value = 3; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.25;
  master.connect(lim).connect(ctx.destination);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  for (const f of inits) f();
}

export function setAudio(o: Partial<typeof vol>) {
  Object.assign(vol, o);
  if (!ctx) return;
  master.gain.setTargetAtTime(vol.mute ? 0 : vol.master * 0.5, ctx.currentTime, 0.05);
  fxBus.gain.setTargetAtTime(vol.sfx, ctx.currentTime, 0.05);
  engBus.gain.setTargetAtTime(vol.engine, ctx.currentTime, 0.05);
  musicBus.gain.setTargetAtTime(vol.music * 0.45 * (duck ? 0.25 : 1), ctx.currentTime, duck ? 0.15 : 0.4);
  for (const f of levels) f();
}

