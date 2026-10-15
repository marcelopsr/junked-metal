// Radio global: 4 estaciones de archivos (public/music/<estacion>/<tema>.m4a), siempre suena y se cambia desde cualquier pantalla.
// Sale por musicBus (volumen "Música" de Configuración, pausa con musicDuck y ?mute ya resueltos en audio/context.ts).
// AAC en .m4a y no OGG: Safari/iOS no reproduce Ogg Vorbis. Dos <audio> (A/B) para el crossfade; solo el tema en curso está cargado.
import { ctx, musicBus, onInit } from "./audio/context";import { musicUnder } from "./audio/music";

export type StationId = "chatarra" | "aceite" | "astral" | "oxido-fritanga";
export type Moment = "menu" | "encore" | "jefe" | "freeroam" | "noche" | "derrota";
export interface Station { id: StationId; name: string; tagline: string; tracks: string[] }

export const STATIONS: Station[] = [
  { id: "chatarra", name: "Chatarra FM 98,6", tagline: "Tech house para el motor",
    tracks: ["neon-circuit-145", "neon-circuit-climax-160", "electric-dream", "synthwave-house-loop", "roy-batty-boombox", "cyber-power", "funky-house"] },
  { id: "aceite", name: "Aceite Lento FM", tagline: "Deep house y chillwave de noche",
    tracks: ["deep-care", "atmospheric-house-1", "atmospheric-house-2", "chillwave-nightdrive", "dreamstate", "chillwave-loop", "midnight-cruiser", "glory-hotel-lofi"] },
  { id: "astral", name: "Tuerca Astral", tagline: "Trip y psicodelia",
    tracks: ["trippy-toe", "trippy-chilly-monster-hop", "look-trippy", "happy-trip-to-mars", "out-of-world-trippy", "spacenomad-2", "nebula", "psytrance-for-a-game"] },
  { id: "oxido-fritanga", name: "Radio Óxido y Fritanga", tagline: "Melancólica y ambient",
    tracks: ["steller-dreams", "november-snow", "long-winter", "cold-night", "magic-space", "space-ambient"] },
];

// Estación preferida por momento; "only" fija temas propios (jefe, derrota) si hay que cambiar de tema.
const MOMENTS: Record<Moment, { st: StationId; only?: string[] }> = {
  menu: { st: "oxido-fritanga" },
  encore: { st: "chatarra" },
  jefe: { st: "chatarra", only: ["cyber-power", "neon-circuit-climax-160"] },
  freeroam: { st: "astral" },
  noche: { st: "aceite" },
  derrota: { st: "oxido-fritanga", only: ["long-winter", "cold-night"] },
};

const FADE = 1.5; // s de crossfade
const url = (s: StationId, t: string) => `${import.meta.env.BASE_URL}music/${s}/${t}.m4a`;
const byId = (id: StationId) => STATIONS.find(s => s.id === id)!;

let want = false;               // el juego pidió que suene
let manual = false;             // el jugador eligió estación: prefer() ya no la cambia
let st: Station = STATIONS[0];
let cur = "";                   // tema en curso
let bag: string[] = [];         // aleatorio sin repetir hasta agotar la estación
const hist: string[] = [];      // temas ya sonados (prev)
let base: Moment = "menu";      // último momento "de fondo" (para volver tras el jefe)
let a = 0;                      // elemento activo (0/1)
let els: { el: HTMLAudioElement; g: GainNode }[] | null = null;
let duckG: GainNode | null = null;  // ducking de la radio (jefe, avisos críticos, hordas)
let bossTrack = false;              // el tema en curso lo puso el jefe
let horde = false, boss = false;

/** Ducking con rampa suave: jefe o aviso crítico -6 dB, horda densa -4 dB. */
function applyDuck() {
  if (!ctx || !duckG) return;
  const b = document.getElementById("banner"), alert = !!b && !b.classList.contains("hidden") && !b.classList.contains("out") && b.classList.contains("event-pulse");
  const db = boss || alert ? -6 : horde ? -4 : 0;
  duckG.gain.setTargetAtTime(10 ** (db / 20), ctx.currentTime, db ? 0.25 : 0.9); // baja rápido, sube lento
}

function wire() {
  if (els || !ctx) return;
  duckG = ctx.createGain(); duckG.connect(musicBus);
  els = [0, 1].map(() => {
    const el = new Audio(); el.preload = "none";
    const g = ctx!.createGain(); g.gain.value = 0;
    ctx!.createMediaElementSource(el).connect(g).connect(duckG!);
    let tm = 0; // red trabada (stalled/waiting) más de 2 s o pausa no pedida: vuelve la sintetizada hasta que reanude
    const back = () => { if (!tm) tm = window.setTimeout(() => { tm = 0; musicUnder(false); }, 2000); };
    el.addEventListener("playing", () => { clearTimeout(tm); tm = 0; musicUnder(true); }); // suena la radio: la sintetizada se apaga
    el.addEventListener("error", () => musicUnder(false));  // no cargó: queda la sintetizada de respaldo
    el.addEventListener("stalled", back); el.addEventListener("waiting", back);
    el.addEventListener("pause", () => { if (want && !el.ended && els?.[a].el === el) back(); });
    return { el, g };
  });
  els.forEach((e, i) => e.el.addEventListener("ended", () => { if (i === a) next(); }));
  window.setInterval(applyDuck, 250); // ponytail: sondeo del aviso en el DOM (#banner); un evento de ui.ts lo haría directo
}

function pick(only?: string[]) {
  if (!bag.length) bag = st.tracks.filter(t => t !== cur).sort(() => Math.random() - 0.5);
  if (only) {
    const o = only.filter(t => st.tracks.includes(t) && t !== cur);
    if (o.length) { const t = o[Math.floor(Math.random() * o.length)]; bag = bag.filter(b => b !== t); return t; }
  }
  return bag.pop()!;
}

function start(track: string, back = false) {
  wire();
  if (!els || !ctx) return; // sin audio (?mute o antes del primer gesto): onInit retoma
  if (!back && cur) hist.push(`${st.id}/${cur}`);
  const old = els[a], nw = els[a ^ 1], t = ctx.currentTime;
  a ^= 1; cur = track;
  nw.el.src = url(st.id, track);
  nw.g.gain.cancelScheduledValues(t); nw.g.gain.setValueAtTime(0, t); nw.g.gain.linearRampToValueAtTime(1, t + FADE);
  old.g.gain.cancelScheduledValues(t); old.g.gain.setValueAtTime(old.g.gain.value, t); old.g.gain.linearRampToValueAtTime(0, t + FADE);
  nw.el.play().catch(() => {}); // bloqueado hasta el gesto: onInit/play() lo reintenta
  setTimeout(() => { if (els![a] !== old) old.el.pause(); }, FADE * 1000 + 100);
}

function begin(only?: string[]) { if (want) start(pick(only)); }
function next() { begin(); }

onInit(() => { wire(); if (want && !cur) begin(); else if (want && els) void els[a].el.play().catch(() => {}); });

export const radio = {
  stations: STATIONS,
  /** Enciende la radio (opcionalmente en una estación). Llamar tras un gesto del usuario o dejar que initAudio la retome. */
  play(station?: StationId) {
    want = true;
    if (station) { st = byId(station); bag = []; }
    if (!cur || station) begin(); else if (els) void els[a].el.play().catch(() => {});
  },
  next, // saltar al siguiente tema (aleatorio) de la estación
  prev() { // vuelve al tema anterior (también de otra estación)
    const p = hist.pop(); if (!p) return;
    const [s, t] = p.split("/"); st = byId(s as StationId); start(t, true);
  },
  /** Cambia de estación a mano (el jugador): desde entonces prefer() no la pisa. */
  setStation(id: StationId) { manual = true; st = byId(id); bag = []; begin(); },
  /** Siguiente estación del dial. */
  nextStation() { radio.setStation(STATIONS[(STATIONS.indexOf(st) + 1) % STATIONS.length].id); },
  /** El juego pide la estación de su momento; no corta si ya suena y no pisa la elección manual. */
  prefer(m: Moment) {
    if (m !== "jefe" && m !== "derrota") base = m;
    if (manual) return;
    bossTrack = m === "jefe";
    const p = MOMENTS[m];
    const sameSt = st.id === p.st;
    if (sameSt && (!p.only || p.only.includes(cur))) return;
    st = byId(p.st); if (!sameSt) bag = [];
    begin(p.only);
  },
  /** Vuelve al momento de fondo (tras un jefe) y cambia de tema sin esperar a que termine el del jefe. */
  resume() {
    const was = bossTrack, c = cur;
    bossTrack = false;
    radio.prefer(base);
    if (was && cur === c) begin();
  },
  /** Ducking por estado de la partida: jefe vivo y horda densa (los avisos críticos se detectan solos). */
  duck(o: { boss?: boolean; horde?: boolean }) {
    if (o.boss === boss && o.horde === horde) return;
    boss = !!o.boss; horde = !!o.horde; applyDuck();
  },
  duckGain: () => duckG?.gain.value ?? 1,
  /** Vuelve a dejar que los momentos elijan la estación. */
  auto() { manual = false; },
  stop() { want = false; musicUnder(false); els?.forEach(e => e.el.pause()); },
  info: () => ({ station: st.id, name: st.name, track: cur, playing: !!els && !els[a].el.paused, time: els?.[a].el.currentTime ?? 0, manual }),
};

if (import.meta.env.DEV) (window as unknown as { __radio: typeof radio }).__radio = radio;
