// Front-end: título, menú principal, garaje, taller, configuración, bestiario, créditos, pausa y resultados.
// Una sola pila de pantallas dentro de #fe; teclado, gamepad y mouse mueven el mismo foco.
import "./menu.css";
import type { DefaultRenderingPipeline, Scene } from "@babylonjs/core";
import { CARS } from "./car";
import { costos } from "./balance";
import { DEF, type Kind } from "./enemies";
import { ctl, KEYS, PAD, padPressed, type Action } from "./input";
import { DECAL_BLANK, DECAL_N, DECAL_PAL, PAINTS, PARTS, RIMS, validDecal, type CarKind, type CarOpts, type Slot } from "./models";
import { PILOTS, type PilotId } from "./pilots";
import { icon } from "./icons";
import { applyGfx, G, maxMsaa, PRESETS, presetOf, type AA, type Detail, type Fsr, type Preset, type ShadowQ } from "./render";
import { initAudio, setAudio, SFX } from "./sfx";
import { PASSIVES, WEAPONS, type PassiveId, type WeaponId } from "./weapons";
import { setDrawDist, ZONES, type ZoneId } from "./world";
import { isTouch, padsConnected } from "./input";
import { bestRace, MEDAL, medalOf, raceCfg, saveRaceCfg, TRACKS, trackName } from "./kart";
import { ACH, type AchId } from "./achievements";
import { ABILITIES, CURSES, type AbilityId, type CurseId } from "./abilities";
import { FINALS, type Elite } from "./run";
import { parseSave } from "./savefmt";

const $ = (id: string) => document.getElementById(id)!;
export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// ---------- Guardado ----------
export type RunRec = { t: number; kills: number; lv: number; seed: number; win: boolean };
// Totales históricos de carrera (Bestiario → Estadísticas): se suman en endRun (main.ts). Las bajas por tipo viven en save.slain.
// Registro propio de cada bicho (ficha del Bestiario): primera vista (AAAA-MM-DD), daño recibido de ese tipo, daño infligido por arma y zonas
export type BeastRec = { first?: string; hurt: number; by: Record<string, number>; zones: ZoneId[] };
export type Stats = { runs: number; wins: number; time: number; dist: number; dmg: Record<string, number>; zone: Partial<Record<ZoneId, { t: number; kills: number }>> };
export type Save = {
  intro: boolean; // ya se vio la intro del primer arranque
  scrap: number; best: number; perm: { hp: number; dmg: number; spd: number; mag: number; reroll: number; cards: number; extra: number; revive: number; xp: number }; cars: CarKind[]; car: CarKind;
  pilot: PilotId; unlocked: string[]; kit: Record<Slot, string>; paint: string; rim: string; zoom: number;
  mute: boolean; vol: { master: number; sfx: number; engine: number; music: number };
  bloom: boolean; lookv: number; shake: boolean; fps: boolean; hudSolid: boolean; hint: boolean;
  // Imagen (render.ts, Gfx): resolución (escala manual o FSR), suavizado, calidad (preset = el que coincide con los cuatro ajustes, o "custom") y pantalla.
  gfxv: number; scale: number; fsr: Fsr; fsrSharp: number; aa: AA; sharpen: number;
  preset: Preset | "custom"; shadowQ: ShadowQ; detail: Detail; texRes: number; aniso: number;
  fpsCap: number; menuFps: number; fov: number; bright: number; gamma: number; // menuFps: tope de cuadros solo en los menús (0 = el mismo que el juego)
  keys: Partial<Record<Action, string>>; pad: { dead: number; sens: number }; rumble: boolean; touch: number;
  hud: number; calm: boolean; dmgNums: boolean;
  decals: string[]; decalSel: number; // calcos del capó: 3 diseños ("" = vacío, si no, DECAL_N² dígitos) y el aplicado (-1 = ninguno)
  stats: Stats;
  seen: Kind[]; slain: Partial<Record<Kind, number>>; beast: Partial<Record<Kind, BeastRec>>; runs: RunRec[]; daily: { day: string; best: number }; zone: ZoneId;
  ach: AchId[];
  ability: AbilityId; curses: CurseId[]; endless: number; // habilidad activa elegida, maldiciones de la próxima partida y récord del modo sin fin (s)
};
// Escala de render de fábrica: apunta a ~1080 px de alto en compu y ~720 en táctil (100% = nativa del dispositivo; en pantallas densas sale menos de 100%)
const SCALE0 = Math.min(1, Math.max(0.5, Math.round(((isTouch ? 720 : 1080) / (innerHeight * (devicePixelRatio || 1))) * 20) / 20));
const DEFAULT: Save = {
  intro: false,
  scrap: 0, best: 0, perm: { hp: 0, dmg: 0, spd: 0, mag: 0, reroll: 0, cards: 0, extra: 0, revive: 0, xp: 0 }, cars: ["buggy"], car: "buggy",
  pilot: "soldadito", unlocked: [], kit: { wing: "serie", decal: "nada", lamp: "calido", exhaust: "nada" }, paint: "", rim: "", zoom: 1.35,
  mute: false, vol: { master: 1, sfx: 1, engine: 1, music: 0.7 }, bloom: true, lookv: 6, shake: true, fps: false, hudSolid: false, hint: true,
  gfxv: 1, scale: SCALE0, fsr: "off", fsrSharp: 0.9, aa: isTouch ? "fxaa" : "none", sharpen: 0, preset: "medio", ...PRESETS.medio, fpsCap: 0, menuFps: isTouch ? 30 : 60, fov: 49, bright: 1, gamma: 1,
  keys: {}, pad: { dead: 0.15, sens: 1 }, rumble: true, touch: 1, hud: 1, calm: false, dmgNums: true,
  decals: ["", "", ""], decalSel: -1, stats: { runs: 0, wins: 0, time: 0, dist: 0, dmg: {}, zone: {} },
  seen: [], slain: {}, beast: {}, runs: [], daily: { day: "", best: 0 }, zone: "patio", ach: [],
  ability: "bombardeo", curses: [], endless: 0,
};
// La validación y migración viven en savefmt.ts (sin DOM, con tests); acá solo se le pasa lo que depende del juego
export const save: Save = parseSave((() => { try { return localStorage.getItem("rcfight2"); } catch { return null; } })(), DEFAULT, { abilities: ABILITIES, curses: CURSES, kinds: Object.keys(DEF), zones: ZONES, isTouch, validDecal, presetOf });
/** Registro de un bicho (lo crea vacío la primera vez); lo llena main.ts fuera de las pruebas de dev. */
export const beastRec = (k: Kind) => (save.beast[k] ??= { hurt: 0, by: {}, zones: [] });
// Se escribe 300 ms después del último cambio (sliders y rueda disparan muchos seguidos)
let persistT = 0;
const flush = () => { clearTimeout(persistT); const j = JSON.stringify(save); try { localStorage.setItem("rcfight2", j); } catch { /* sin storage */ } void idb("put", j); };
export const persist = () => { clearTimeout(persistT); persistT = setTimeout(flush, 300) as unknown as number; };
addEventListener("pagehide", () => { if (persistT) flush(); });

// Respaldo del guardado en IndexedDB + pedido de almacenamiento persistente (el navegador no lo borra por espacio;
// instalado como app, Safari tampoco a los 7 días). Si localStorage quedó vacío y hay respaldo, se restaura y recarga.
function idb(op: "put" | "get", j?: string): Promise<string | undefined> {
  return new Promise((ok) => {
    try {
      const r = indexedDB.open("junkedmetal", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("kv");
      r.onsuccess = () => { const st = r.result.transaction("kv", op === "put" ? "readwrite" : "readonly").objectStore("kv"), q = op === "put" ? st.put(j, "save") : st.get("save"); q.onsuccess = () => { ok(q.result as string | undefined); r.result.close(); }; q.onerror = () => { ok(undefined); r.result.close(); }; };
      r.onerror = () => ok(undefined);
    } catch { ok(undefined); }
  });
}
void navigator.storage?.persist?.().catch(() => {});
let hasLocal = true;
try { hasLocal = !!localStorage.getItem("rcfight2"); } catch { /* almacenamiento bloqueado */ }
if (!hasLocal) void idb("get").then((j) => { if (j) { try { localStorage.setItem("rcfight2", j); location.reload(); } catch { /* sin storage */ } } });

// Exportar / importar la partida como archivo .json
function exportSave() {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(save)], { type: "application/json" }));
  a.download = `junked-metal-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function importSave() {
  const i = document.createElement("input");
  i.type = "file"; i.accept = ".json,application/json";
  i.onchange = async () => {
    try {
      const s = JSON.parse(await i.files![0].text());
      if (typeof s !== "object" || !s || typeof s.scrap !== "number") throw 0;
      localStorage.setItem("rcfight2", JSON.stringify(s)); idb("put", JSON.stringify(s)); location.reload();
    } catch { alert("El archivo no es una partida válida."); }
  };
  i.click();
}

// ---------- Carrera (kart.ts): opciones de la largada ----------
const nextOf = <T,>(a: T[], v: T) => a[(a.indexOf(v) + 1) % a.length];
function cycleRace(k: string) {
  const c = raceCfg;
  if (k === "players") c.players = c.players === 1 ? 2 : 1;
  else if (k === "p1") c.p1 = nextOf(["kbd", "pad0", "pad1"], c.p1);
  else if (k === "p2") c.p2 = nextOf(["pad0", "pad1", "kbd2"], c.p2);
  else if (k === "cc") c.cc = nextOf([50, 100, 150] as const, c.cc);
  else if (k === "laps") c.laps = c.laps === 3 ? 5 : 3;
  else if (k === "cup") c.cup = !c.cup;
  else if (k === "track") c.track = ((c.track + 1) % 3) as 0 | 1 | 2;
  else if (k === "car2") { const o = save.cars.length ? save.cars : (["buggy"] as CarKind[]); c.car2 = nextOf(o, o.includes(c.car2) ? c.car2 : o[0]); }
  saveRaceCfg();
}
function renderRace() {
  const c = raceCfg, ctl = { kbd: "Teclado", pad0: "Joystick 1", pad1: "Joystick 2", kbd2: "Teclado (flechas)" };
  $("rcPlayers").textContent = `Jugadores · ${c.players}${c.players === 2 ? " (pantalla dividida)" : ""}`;
  $("rcP1").textContent = `Control J1 · ${ctl[c.p1]}`;
  $("rcP2").textContent = `Control J2 · ${ctl[c.p2]}`;
  $("rcCar2").textContent = `Auto J2 · ${CARS[c.car2]?.name ?? c.car2}`;
  for (const id of ["rcP2", "rcCar2"]) $(id).classList.toggle("hidden", c.players === 1);
  $("rcCC").textContent = `Cilindrada · ${c.cc}cc ${c.cc === 50 ? "(fácil)" : c.cc === 100 ? "(medio)" : "(difícil)"}`;
  $("rcLaps").textContent = `Vueltas · ${c.laps}`;
  $("rcCup").textContent = c.cup ? "Modo · Copa de 3 pistas" : "Modo · Carrera suelta";
  $("rcTrack").textContent = `Pista · ${trackName(c.track)}`;
  $("rcTrack").classList.toggle("hidden", c.cup);
  const rec = TRACKS.map((tk, i) => { const b = bestRace(i); return `${tk.zone === "patio" ? "Patio" : tk.zone === "jardin" ? "Jardín" : "Garaje"} ${b ? fmt(b.t) + " " + (MEDAL[medalOf(i, c.laps, b.cc, b.t)] || "") : "—"}`; }).join(" · ");
  $("rcHelp").textContent = `Récords: ${rec}. J1: auto del Garaje (${CARS[save.car].name}). Joysticks conectados: ${padsConnected()}. Teclado J1: W A S D, Espacio derrapa, E usa objeto. Flechas: J2 con Shift derecha y Enter.`;
}

// ---------- Ajustes ----------
type Api = { scene: Scene; play(daily?: boolean): void; resume(): void; quit(): void; pause(): void; endless(): void; race(): void; battle(): void };
let api: Api;

export function applySettings() {
  const msaa = maxMsaa();
  if (save.aa.startsWith("msaa") && +save.aa.slice(4) > msaa) save.aa = msaa >= 4 ? "msaa4" : msaa >= 2 ? "msaa2" : "fxaa"; // un guardado de otra tarjeta: lo máximo que admite esta
  applyGfx(save);
  setDrawDist(G.draw);
  const glow = api.scene.getGlowLayerByName("bloom");
  if (glow) glow.isEnabled = save.bloom;
  const pipe = api.scene.postProcessRenderPipelineManager.supportedPipelines.find((p) => p.name === "pipe") as DefaultRenderingPipeline | undefined;
  if (pipe) pipe.bloomEnabled = save.bloom;
  $("fps").classList.toggle("hidden", !save.fps);
  document.body.classList.toggle("hud-solid", save.hudSolid);
  setAudio({ ...save.vol, mute: save.mute });
  $("muted").classList.toggle("hidden", !save.mute);
  for (const a of Object.keys(save.keys) as Action[]) if (KEYS[a]) KEYS[a][0] = save.keys[a]!;
  Object.assign(PAD, save.pad);
  const root = document.documentElement.style;
  root.setProperty("--hud-scale", String(save.hud));
  root.setProperty("--touch-scale", String(save.touch));
  document.body.classList.toggle("calm", save.calm);
}
const commit = () => { save.preset = presetOf(save); persist(); applySettings(); };
const KEYS0 = Object.fromEntries(Object.entries(KEYS).map(([a, v]) => [a, v[0]])) as Record<Action, string>;
/** Vuelve las opciones (imagen, audio, controles, accesibilidad) a los valores de fábrica; el progreso no se toca. */
function resetCfg() {
  const D = structuredClone(DEFAULT);
  Object.assign(save, { scale: D.scale, fsr: D.fsr, fsrSharp: D.fsrSharp, aa: D.aa, sharpen: D.sharpen, preset: D.preset, shadowQ: D.shadowQ, detail: D.detail, texRes: D.texRes, aniso: D.aniso, fpsCap: D.fpsCap, menuFps: D.menuFps, fov: D.fov, bright: D.bright, gamma: D.gamma, bloom: D.bloom, fps: D.fps, hudSolid: D.hudSolid, hint: D.hint, zoom: D.zoom, shake: D.shake, vol: D.vol, hud: D.hud, calm: D.calm, dmgNums: D.dmgNums, pad: D.pad, rumble: D.rumble, touch: D.touch, mute: D.mute, keys: {} });
  for (const a of Object.keys(KEYS0) as Action[]) KEYS[a][0] = KEYS0[a];
  commit();
}

// ---------- Pila de pantallas ----------
export type Scr = "title" | "main" | "garage" | "shop" | "config" | "bestiary" | "beast" | "credits" | "pause" | "over" | "race";
const stack: Scr[] = [];
const ret = new Map<Scr, HTMLElement>(); // foco a recuperar al volver
export const current = () => stack.at(-1) ?? null;

let shownAt = 0;
function show() {
  binding = null; // una reasignación a medias no sobrevive al cambio de pantalla
  shownAt = performance.now();
  const s = current();
  $("fe").classList.toggle("hidden", !s);
  $("fe").classList.toggle("ingame", stack[0] === "pause" || stack[0] === "over"); // en partida: velo oscuro también en Configuración
  if (!s) return;
  for (const el of document.querySelectorAll<HTMLElement>(".scr")) el.classList.toggle("on", el.id === "scr-" + s);
  if (s === "garage") renderGarage();
  if (s === "shop") renderShop();
  if (s === "main") renderMain();
  if (s === "race") renderRace();
  if (s === "bestiary") renderBestiary();
  if (s === "beast") renderBeast();
  if (s === "config") renderConfig();
  // Cambio de canal: estática breve + encendido de tubo (keyframes tune de style.css)
  const fe = $("fe");
  fe.classList.remove("zap"); void fe.offsetWidth; fe.classList.add("zap");
  SFX.static();
  const f = ret.get(s);
  (f && f.isConnected && f.offsetParent ? f : focusables()[0])?.focus({ preventScroll: false });
}
export function go(s: Scr) {
  const top = current();
  if (top && document.activeElement instanceof HTMLElement) ret.set(top, document.activeElement);
  ret.delete(s);
  stack.push(s);
  show();
}
function back() {
  const s = current();
  if (!s || s === "title" || s === "main") return;
  SFX.back();
  if (s === "pause") return api.resume();
  if (s === "over") return api.quit();
  if (s === "garage" && editing) { editing = false; renderGarage(); return focusSel('[data-dact="edit"]'); } // Esc / B: sale del editor, no del garaje
  stack.pop();
  show();
  if (s === "beast") { focusSel(`[data-beast="${BV.kind}"]`); BV.kind = null; } // vuelve a la ficha chica del bicho que se estaba viendo
}
/** Reemplaza la pila entera (null = en juego, sin menú). */
export function reset(s: Scr | null) {
  stack.length = 0;
  ret.clear();
  if (s) stack.push(s);
  show();
}

// ---------- Foco: navegación espacial ----------
const focusables = () => [...document.querySelectorAll<HTMLElement>(`#scr-${current()} :is(button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex])`)].filter((e) => e.offsetParent);
const SCROLL = "#cars, #shop, #opts, #binfo"; // listas con scroll propio
function move(dx: number, dy: number) {
  const cur = document.activeElement as HTMLElement, els = focusables();
  if (!els.includes(cur)) return els[0]?.focus();
  // Grilla del editor de calcos: el cursor recorre las celdas; en el borde el foco sigue de largo
  if (cur.id === "dgrid") { const x = dcx + dx, y = dcy + dy; if (x >= 0 && x < DECAL_N && y >= 0 && y < DECAL_N) { dcx = x; dcy = y; drawGrid(); return SFX.blip(); } }
  // Perillas: izquierda/derecha cambian el valor en vez de mover el foco
  if (dx && cur instanceof HTMLInputElement && cur.type === "range") { dx > 0 ? cur.stepUp() : cur.stepDown(); cur.dispatchEvent(new Event("input", { bubbles: true })); return SFX.blip(); }
  if (dx && cur instanceof HTMLSelectElement) { let i = cur.selectedIndex, n = cur.length; do i = (i + dx + cur.length) % cur.length; while (cur.options[i].disabled && n-- > 0); cur.selectedIndex = i; cur.dispatchEvent(new Event("change", { bubbles: true })); return SFX.blip(); }
  // Posición de layout (sin transformaciones: el encendido de tubo aplasta la pantalla al entrar). En Configuración cuenta la fila entera.
  const box = (e: HTMLElement) => {
    const r = (e.closest(".row") ?? e) as HTMLElement;
    let x = 0, y = 0;
    for (let n: HTMLElement | null = r; n; n = n.offsetParent as HTMLElement | null) { x += n.offsetLeft - n.scrollLeft; y += n.offsetTop - n.scrollTop; }
    const c = r.closest<HTMLElement>(SCROLL); // offsetTop no descuenta el scroll de una lista que no es offsetParent
    if (c) { x -= c.scrollLeft; y -= c.scrollTop; }
    return { x, y, width: r.offsetWidth, height: r.offsetHeight };
  };
  const a = box(cur), ax = a.x + a.width / 2, ay = a.y + a.height / 2;
  // Listas con scroll propio (garaje, taller, opciones): primero se recorre la lista; para entrar desde afuera solo cuenta lo visible
  const home = cur.closest<HTMLElement>(SCROLL);
  const shown = (el: HTMLElement) => {
    const c = el.closest<HTMLElement>(SCROLL);
    if (!c || c === home) return true;
    const e = el.getBoundingClientRect(), r = c.getBoundingClientRect();
    return e.bottom > r.top + 4 && e.top < r.bottom - 4;
  };
  let best: HTMLElement | null = null, bs = Infinity;
  for (const [inList, pool] of [[true, home ? els.filter((e) => home.contains(e)) : []], [false, els.filter((e) => !home?.contains(e) && shown(e))]] as const) {
    for (const el of pool) {
      if (el === cur) continue;
      const b = box(el), x = b.x + b.width / 2 - ax, y = b.y + b.height / 2 - ay;
      const along = x * dx + y * dy, side = Math.abs(x * dy - y * dx);
      if (along <= 2 || (inList && side > along)) continue; // dentro de la lista, solo hacia adelante (45 grados)
      if (dx && current() === "beast" && Math.abs(y) > a.height / 2) continue; // ficha: izquierda/derecha solo dentro de la misma fila
      const sc = along + side * 2.5;
      if (sc < bs) { bs = sc; best = el; }
    }
    if (best) break;
  }
  if (!best && dx && current() === "beast") return beastStep(dx); // ficha: en el borde de la fila, las flechas cambian de bicho
  best?.focus();
}
const activate = () => { if (performance.now() - shownAt < 400) return; // un turbo/A mantenido no salta la pantalla recién abierta
  const el = document.activeElement as HTMLElement; if (el?.closest("#fe") && !(el instanceof HTMLInputElement)) el.click(); };

// ---------- Teclado ----------
let binding: Action | null = null;
addEventListener("pointerdown", () => initAudio());
addEventListener("keydown", (e) => {
  initAudio();
  if (binding) { // reasignar tecla
    e.preventDefault();
    if (e.code !== "Escape") { save.keys[binding] = e.code; commit(); }
    const b = binding;
    binding = null;
    renderConfig();
    return (document.querySelector(`[data-bind="${b}"]`) as HTMLElement).focus();
  }
  if (e.code === "KeyM") { save.mute = !save.mute; return commit(); }
  const s = current();
  if (!s) { if (e.code === "Escape" || e.code === "KeyP") api.pause(); return; }
  if (s === "title") { if (!e.repeat && !/^(Shift|Control|Alt|Meta)/.test(e.code)) { e.preventDefault(); SFX.accept(); go("main"); } return; }
  if (s === "garage" && editing && (e.ctrlKey || e.metaKey) && e.code === "KeyZ") { e.preventDefault(); return undo(); }
  if (s === "garage" && document.activeElement?.id === "dgrid" && /^Digit[0-8]$/.test(e.code)) { e.preventDefault(); return setCol(+e.code[5]); }
  if (s === "beast" && /^(KeyQ|KeyE|PageUp|PageDown)$/.test(e.code)) { e.preventDefault(); return beastStep(e.code === "KeyE" || e.code === "PageDown" ? 1 : -1); } // ficha: bicho anterior / siguiente
  const dir: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  if (dir[e.code]) { e.preventDefault(); move(...dir[e.code]); }
  else if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); if (!e.repeat) activate(); }
  else if (e.code === "Escape" || e.code === "Backspace" || (e.code === "KeyP" && s === "pause")) { e.preventDefault(); back(); }
});

// ---------- Gamepad (llamar cada frame mientras haya menú) ----------
let padRep = 0, padDir = "";
export function menuPad(dt: number) {
  const s = current();
  if (!s) return;
  const btn = [0, 1, 9, 12, 13, 14, 15].map((i) => padPressed(i)); // A, B, Start, dpad
  if (s === "title") { if (btn.some(Boolean)) { initAudio(); SFX.accept(); go("main"); } return; }
  if (btn[0]) activate();
  if (btn[1]) back();
  if (btn[2] && s === "pause") back();
  if (s === "beast") beastPad(dt);
  if (s === "garage" && document.activeElement?.id === "dgrid") { if (padPressed(4)) setCol((dcol + 8) % 9); if (padPressed(5)) setCol((dcol + 1) % 9); } // LB / RB: color
  if (s === "garage" && editing && padPressed(2)) undo(); // X: deshacer
  const gp = navigator.getGamepads?.()[0];
  const ax = gp?.axes[0] ?? 0, ay = gp?.axes[1] ?? 0;
  const d = btn[3] || ay < -0.5 ? "u" : btn[4] || ay > 0.5 ? "d" : btn[5] || ax < -0.5 ? "l" : btn[6] || ax > 0.5 ? "r" : "";
  if (!d) { padDir = ""; return; }
  // Stick: primer paso al toque, después repite cada 0,14 s
  if (d !== padDir || (padRep -= dt) <= 0) { padRep = d === padDir ? 0.14 : 0.38; padDir = d; move(d === "l" ? -1 : d === "r" ? 1 : 0, d === "u" ? -1 : d === "d" ? 1 : 0); }
}

// ---------- Pantallas ----------
// Desafío diario: misma semilla para todos ese día (fecha local), récord propio que se reinicia cada día
export const today = () => new Date().toLocaleDateString("sv"); // AAAA-MM-DD
export const dailySeed = () => Number(today().replaceAll("-", ""));
// Maldiciones: +30% tornillos cada una (se suman). El desafío diario las ignora.
const CURSE_SETS: CurseId[][] = [[], ["horda"], ["sinrep"], ["horda", "sinrep"]];
const curseTxt = () => save.curses.length ? `${save.curses.length > 1 ? "Maldiciones" : "Maldición"} · ${save.curses.map((c) => `${CURSES[c].name} (${CURSES[c].short})`).join(" y ")} · +${save.curses.length * 30}% tornillos` : "Maldiciones · Ninguna";
function renderMain() {
  $("mainInfo").textContent = `${save.scrap} tornillos · récord ${fmt(save.best)}`;
  const b = save.daily.day === today() ? save.daily.best : 0;
  $("dailyBtn").textContent = b ? `Desafío diario · ${fmt(b)}` : "Desafío diario";
  if (!owns("zone:" + save.zone)) save.zone = "patio"; // guardado importado con una zona sin comprar
  $("zoneBtn").textContent = `Zona · ${ZONES[save.zone].short}`;
  $("curseBtn").textContent = curseTxt();
  if (save.endless) $("mainInfo").textContent += ` · sin fin +${fmt(save.endless)}`;
}

// ---------- Taller y garaje ----------
// Mejoras permanentes: el precio de cada nivel está en `cost` (su largo es el máximo). Equipo: cambian cómo se juega cada partida.
// Curva (partida típica ≈ 100 tornillos): chasis 1-5 de 20 a 100 (una mejora por partida al empezar), 6-10 de 180 a 660
// (una línea completa ≈ 23 partidas); autos, pilotos y zonas 400-1000 (4-10 partidas); revivir 2 y cuarta ranura 1800-2200 (20+).
type PermK = keyof Save["perm"];
// Los precios por nivel están en balance.json (tabla precios; el chasis sigue 20 x nivel y después x1,5 con +0,45 por nivel, redondeado a 5)
const PERKS: { k: PermK; cat: "chasis" | "equipo"; name: string; desc: string; cost: number[] }[] = [
  { k: "hp", cat: "chasis", name: "Chasis reforzado", desc: "+10 vida", cost: costos("hp") }, { k: "dmg", cat: "chasis", name: "Piñón afilado", desc: "+10% daño", cost: costos("dmg") },
  { k: "spd", cat: "chasis", name: "Motor rebobinado", desc: "+4% velocidad", cost: costos("spd") }, { k: "mag", cat: "chasis", name: "Imán de parlante", desc: "+10% imán", cost: costos("mag") },
  { k: "xp", cat: "equipo", name: "Contador de tuercas", desc: "+5% XP por nivel", cost: costos("xp") },
  { k: "reroll", cat: "equipo", name: "Dado cargado", desc: "+1 re-sorteo de cartas por partida (R o botón Y)", cost: costos("reroll") },
  { k: "extra", cat: "equipo", name: "Caja de repuestos", desc: "Arranca con un arma extra al azar", cost: costos("extra") },
  { k: "revive", cat: "equipo", name: "Batería de reserva", desc: "Revive una vez por partida con media vida", cost: costos("revive") },
  { k: "cards", cat: "equipo", name: "Cuarta ranura", desc: "+1 opción en cada mejora y cofre", cost: costos("cards") },
];
const PERK_ICON: Record<PermK, string> = { hp: "litio", dmg: "lupa", spd: "turbo", mag: "iman", xp: "capacitor", reroll: "resorte", extra: "cofre", revive: "heal", cards: "evo" };
const opts = (sl: Slot) => PARTS[sl].opts as Record<string, readonly [string, number]>;
// Desbloqueables: car:<auto>, pilot:<piloto>, part:<ranura>:<opción>. Los pilotos con logro no se compran.
type Unlock = { id: string; name: string; desc: string; cost: number; ach?: string };
const UNLOCKS = {
  autos: () => (Object.keys(CARS) as CarKind[]).filter((k) => CARS[k].cost).map((k): Unlock => ({ id: "car:" + k, name: CARS[k].name, desc: CARS[k].desc, cost: CARS[k].cost })),
  pilotos: () => (Object.keys(PILOTS) as PilotId[]).filter((k) => PILOTS[k].cost || PILOTS[k].ach).map((k): Unlock => {
    const p = PILOTS[k];
    return { id: "pilot:" + k, name: p.name, desc: `${p.pros.join(" · ")} · Contra: ${p.con}`, cost: p.cost, ach: p.ach?.txt };
  }),
  zonas: () => (Object.keys(ZONES) as ZoneId[]).filter((k) => ZONES[k].cost).map((k): Unlock => ({ id: "zone:" + k, name: ZONES[k].name, desc: ZONES[k].desc, cost: ZONES[k].cost })),
  piezas: () => (Object.keys(PARTS) as Slot[]).flatMap((sl) => Object.entries(opts(sl)).filter(([, [, c]]) => c).map(([o, [n, c]]): Unlock => ({ id: `part:${sl}:${o}`, name: n, desc: PARTS[sl].name, cost: c }))),
};
function owns(id: string) {
  const [t, k, o] = id.split(":");
  if (t === "car") return save.cars.includes(k as CarKind);
  if (t === "zone") return k in ZONES && (!ZONES[k as ZoneId].cost || save.unlocked.includes(id));
  if (t === "pilot") { const p = PILOTS[k as PilotId]; return !!p && (p.ach ? p.ach.ok(save) : !p.cost || save.unlocked.includes(id)); }
  return opts(k as Slot)?.[o]?.[1] === 0 || save.unlocked.includes(id);
}
const ownedZones = () => (Object.keys(ZONES) as ZoneId[]).filter((k) => owns("zone:" + k));
function priceOf(id: string) {
  const [t, k, o] = id.split(":");
  if (t === "car") return CARS[k as CarKind]?.cost;
  if (t === "zone") return ZONES[k as ZoneId]?.cost;
  if (t === "pilot") { const p = PILOTS[k as PilotId]; return p && !p.ach ? p.cost : undefined; }
  return opts(k as Slot)?.[o]?.[1];
}
// ¿Alcanzan los tornillos para algo del Taller? (mejoras, autos, pilotos, piezas o zonas)
const canBuy = () => PERKS.some((p) => (p.cost[save.perm[p.k]] ?? Infinity) <= save.scrap)
  || Object.values(UNLOCKS).some((f) => f().some((u) => !u.ach && !owns(u.id) && u.cost <= save.scrap));
function buy(id: string) {
  const c = priceOf(id);
  if (owns(id) || c === undefined || save.scrap < c) return false;
  save.scrap -= c;
  if (id.startsWith("car:")) save.cars.push(id.slice(4) as CarKind); else save.unlocked.push(id);
  persist();
  return true;
}
/** Lo que hay que mostrar sobre el auto (garaje, portada y partida). */
export const carOpts = (): CarOpts => ({ paint: save.paint || undefined, rim: save.rim || undefined, ...save.kit, pilot: save.pilot, sticker: save.decals[save.decalSel] || undefined });

const bar = (v: number, max: number) => `<i style="width:${Math.min(100, (v / max) * 100)}%"></i>`;
const tabsHtml = (all: Record<string, string>, on: string, attr: string) => Object.entries(all).map(([id, n]) => `<button class="tab ${id === on ? "on" : ""}" data-${attr}="${id}">${n}</button>`).join("");
const STABS = { chasis: "Chasis", equipo: "Equipo de partida", autos: "Autos", pilotos: "Pilotos", piezas: "Piezas", zonas: "Zonas" };
let stab: keyof typeof STABS = "chasis";
function renderShop() {
  $("bank").textContent = `${save.scrap} tornillos`;
  $("stabs").innerHTML = tabsHtml(STABS, stab, "stab");
  $("shop").innerHTML = stab === "chasis" || stab === "equipo"
    ? PERKS.filter((p) => p.cat === stab).map((p) => {
      const l = save.perm[p.k], max = p.cost.length, cost = p.cost[l];
      return `<button class="carc perk" data-k="${p.k}" ${l >= max || save.scrap < cost ? "disabled" : ""}><b class="wi">${icon(PERK_ICON[p.k], 22)}${p.name}</b>${p.desc}<div class="pips">${"<i class=on></i>".repeat(l)}${"<i></i>".repeat(max - l)}</div><div class="price">${l >= max ? "MÁXIMO" : `${cost} tornillos`}</div></button>`;
    }).join("")
    : UNLOCKS[stab]().map((u) => {
      const own = owns(u.id);
      return `<button class="carc perk" data-buy="${u.id}" ${own || u.ach || save.scrap < u.cost ? "disabled" : ""}><b>${u.name}</b>${u.desc}<div class="price">${own ? "EN EL GARAJE" : u.ach ? `Logro: ${u.ach}` : `${u.cost} tornillos`}</div></button>`;
    }).join("");
}
const GTABS = { auto: "Auto", piloto: "Piloto", habilidad: "Habilidad", pintura: "Pintura", piezas: "Piezas" };
let gtab: keyof typeof GTABS = "auto";
function renderGarage() {
  if (gtab !== "piezas") editing = false;
  $("scr-garage").classList.toggle("editing", editing); // modo edición: solo el editor, con toda la altura
  $("bankG").textContent = `${save.scrap} tornillos`;
  $("gtabs").innerHTML = tabsHtml(GTABS, gtab, "gtab");
  $("paint").classList.toggle("hidden", gtab !== "pintura");
  $("cars").classList.toggle("hidden", gtab === "pintura");
  const lock = (id: string, ach?: string) => (owns(id) ? "" : `<div class="price">${ach ? `Logro: ${ach}` : `Bloqueado · ${priceOf(id)} tornillos`}</div>`);
  if (gtab === "auto") $("cars").innerHTML = (Object.keys(CARS) as CarKind[]).map((k) => {
    const c = CARS[k];
    return `<div tabindex="0" class="carc ${save.car === k ? "sel" : ""} ${owns("car:" + k) ? "" : "locked"}" data-k="${k}"><b>${c.name}</b>${c.desc}<div class="st"><span>Carrocería</span>${bar(c.hp, 300)}<span>Velocidad</span>${bar(c.speed, 21)}<span>Embestida</span>${bar(c.ram, 5.5)}</div>${lock("car:" + k)}</div>`;
  }).join("");
  else if (gtab === "piloto") $("cars").innerHTML = (Object.keys(PILOTS) as PilotId[]).map((k) => {
    const p = PILOTS[k], id = "pilot:" + k;
    return `<div tabindex="0" class="carc pilot ${save.pilot === k ? "sel" : ""} ${owns(id) ? "" : "locked"}" data-pilot="${k}"><b>${p.name}</b>${p.pros.map((x) => `<div class="pro">${x}</div>`).join("")}<div class="con">${p.con}</div>${lock(id, p.ach?.txt)}</div>`;
  }).join("");
  else if (gtab === "habilidad") $("cars").innerHTML = (Object.keys(ABILITIES) as AbilityId[]).map((k) => {
    const a = ABILITIES[k];
    return `<div tabindex="0" class="carc pilot ${save.ability === k ? "sel" : ""}" data-abil="${k}"><b>${a.name}</b>${a.desc}<div class="price">Enfriamiento ${a.cd} s</div></div>`;
  }).join("");
  else if (gtab === "piezas") $("cars").innerHTML = editing ? "" : (Object.keys(PARTS) as Slot[]).map((sl) => `<div class="slot"><span>${PARTS[sl].name}</span>${Object.entries(opts(sl)).map(([o, [n, c]]) => {
    const own = owns(`part:${sl}:${o}`);
    return `<button class="opt ${save.kit[sl] === o ? "on" : ""} ${own ? "" : "locked"}" data-part="${sl}:${o}">${n}${own ? "" : ` · ${c}`}</button>`;
  }).join("")}</div>`).join("");
  if (gtab === "piezas") { $("cars").insertAdjacentHTML("beforeend", decalHtml()); drawGrid(); }
  const cur = save.paint || PAINTS[0], rim = save.rim || RIMS[0];
  $("paint").innerHTML = `<span>Pintura</span>${PAINTS.map((c) => `<button class="sw ${c === cur ? "on" : ""}" data-paint="${c}" style="background:${c}" aria-label="pintura ${c}"></button>`).join("")}`
    + `<span>Llantas</span>${RIMS.map((c) => `<button class="sw rim ${c === rim ? "on" : ""}" data-rim="${c}" style="background:${c}" aria-label="llantas ${c}"></button>`).join("")}`;
}
// ---------- Editor de calcos (garaje → Piezas): grilla DECAL_N², 8 colores de DECAL_PAL, 3 diseños ----------
// Se edita un borrador (`draft`); Guardar lo escribe en la ranura `eslot` y lo aplica al capó. Cursor de celdas para teclado y gamepad.
// ponytail: deshacer sin rehacer (60 pasos); el borrador sin guardar se pierde al cambiar de diseño.
let hist: string[] = [], strokeSnap = false; // historial para deshacer: borradores previos, uno por trazo
let editing = false, eslot = Math.max(0, save.decalSel), draft = save.decals[eslot] || DECAL_BLANK, dcol = 4, dcx = 0, dcy = 0, stroke = false, erasing = false;
const dirty = () => draft !== (save.decals[eslot] || DECAL_BLANK);
const DHINT = { keys: "Clic o arrastre pinta, clic derecho borra · Flechas mueven el cursor, Enter pinta · 1 a 8 cambian el color, 0 borra · Ctrl+Z o Cmd+Z deshace", pad: "Stick o cruceta mueven el cursor · A pinta · LB y RB cambian el color · X deshace", touch: "Arrastra el dedo sobre la grilla para pintar" };
function decalHtml() {
  const slots = [0, 1, 2].map((i) => `<button class="opt ${save.decalSel === i ? "on" : ""} ${eslot === i ? "edit" : ""} ${save.decals[i] ? "" : "locked"}" data-dsel="${i}">Diseño ${i + 1}</button>`).join("");
  return `<div class="slot"><span>Calco de capó</span><button class="opt ${save.decalSel < 0 ? "on" : ""}" data-dsel="-1">Sin calco</button>${slots}${editing ? "" : `<button class="opt" data-dact="edit">Editar</button>`}</div>`
    + (!editing ? "" : `<div class="dedit"><canvas id="dgrid" tabindex="0" width="256" height="256" aria-label="Grilla del calco"></canvas><div class="dside">`
    + `<div class="dpal">${DECAL_PAL.map((c, k) => `<button class="sw ${dcol === k + 1 ? "on" : ""}" data-dcol="${k + 1}" style="background:${c}" aria-label="color ${k + 1}"></button>`).join("")}</div>`
    + `<div class="dbtn"><button class="opt ${dcol === 0 ? "on" : ""}" data-dcol="0">Borrar</button><button class="opt" data-dact="undo">Deshacer</button><button class="opt" data-dact="clear">Vaciar</button><button class="opt" data-dact="save">Guardar</button><button class="opt" data-dact="done">Listo</button></div>`
    + `<div id="dstat"></div></div></div><div class="note">${DHINT[ctl]}</div>`);
}
function drawGrid() {
  const cv = document.getElementById("dgrid") as HTMLCanvasElement | null;
  if (!cv) return;
  const c = cv.getContext("2d")!, k = cv.width / DECAL_N;
  for (let i = 0; i < draft.length; i++) {
    const x = i % DECAL_N, y = (i / DECAL_N) | 0, n = +draft[i];
    c.fillStyle = n ? DECAL_PAL[n - 1] : (x + y) % 2 ? "#2a3326" : "#1f271c"; // damero = transparente
    c.fillRect(x * k, y * k, k, k);
  }
  c.strokeStyle = "#0b0d0a66"; c.lineWidth = 1; c.beginPath();
  for (let i = 0; i <= DECAL_N; i++) { c.moveTo(i * k + 0.5, 0); c.lineTo(i * k + 0.5, cv.height); c.moveTo(0, i * k + 0.5); c.lineTo(cv.width, i * k + 0.5); }
  c.stroke();
  if (document.activeElement === cv) { c.strokeStyle = "#8dff6a"; c.lineWidth = 2; c.setLineDash([4, 3]); c.strokeRect(dcx * k + 1, dcy * k + 1, k - 2, k - 2); c.setLineDash([]); }
  $("dstat").textContent = `Diseño ${eslot + 1}${dirty() ? " · sin guardar" : ""}`;
}
function setCell(x: number, y: number, n: number) {
  dcx = x; dcy = y;
  const i = y * DECAL_N + x;
  if (draft[i] !== String(n)) { if (strokeSnap || !stroke) snap(); strokeSnap = false; draft = draft.slice(0, i) + n + draft.slice(i + 1); }
  drawGrid();
}
const snap = () => { if (hist.at(-1) !== draft) { hist.push(draft); if (hist.length > 60) hist.shift(); } };
function undo() { const p = hist.pop(); if (p === undefined) return; draft = p; drawGrid(); SFX.back(); }
const setCol = (n: number) => { dcol = n; for (const b of document.querySelectorAll<HTMLElement>("[data-dcol]")) b.classList.toggle("on", +b.dataset.dcol! === n); };
const cellOf = (e: PointerEvent, cv: HTMLElement) => { const r = cv.getBoundingClientRect(), f = (v: number, o: number, s: number) => Math.min(DECAL_N - 1, Math.max(0, Math.floor(((v - o) / s) * DECAL_N))); return [f(e.clientX, r.left, r.width), f(e.clientY, r.top, r.height)] as const; };

const focusSel = (q: string) => { const e = document.querySelector<HTMLButtonElement>(q); (e && !e.disabled ? e : focusables()[0])?.focus(); };

// Configuración: filas generadas desde datos. data-set = número (perilla o lista), data-tog = sí/no.
// Cada pestaña agrupa por tema con títulos de sección ("sect"); DESC explica en una línea lo que no se entiende solo.
type Row = [label: string, kind: "range", path: string, min: number, max: number, step: number, unit?: "%" | "x" | "°"] | [label: string, kind: "tog", path: string] | [label: string, kind: "sel", path: string, opts: [string, string][]] | [label: string, kind: "bind", action: Action] | [label: string, kind: "note"] | [label: string, kind: "btn", act: string] | [label: string, kind: "sect"];
const DESC: Record<string, string> = {
  scale: "Porcentaje de la resolución de la pantalla con que se dibuja el juego (100% es la nativa). Menos escala sube los fps a costa de nitidez.",
  fsr: "Escalado FSR 1 de AMD: dibuja a menor resolución y sube a la nativa con un filtro que conserva los bordes. Reemplaza a la escala manual.",
  fsrSharp: "Nitidez del paso final de FSR (RCAS). Más alta marca más los bordes; demasiada deja halos.",
  preset: "Fija de una vez sombras, detalle del mundo, texturas y filtrado. Cambiar cualquiera de esos cuatro pasa a Personalizado.",
  shadowQ: "Sombras del sol: resolución del mapa y cascadas. Apagadas rinde mucho más en equipos modestos.",
  detail: "Densidad del pasto, cantidad de partículas y restos, y distancia de dibujo de los objetos. El pasto se aplica al empezar la próxima partida.",
  texRes: "Resolución de las texturas del suelo, la tierra y las baldosas. Se aplica al empezar la próxima partida.",
  aniso: "Mantiene nítidas las texturas vistas en ángulo, como el suelo lejano. x16 es lo más nítido.",
  aa: "Suaviza los bordes dentados. FXAA es liviano; MSAA es más nítido y más pesado.",
  sharpen: "Realza el detalle fino. Funciona con cualquier suavizado, también con Ninguno.",
  fpsCap: "Tope de cuadros por segundo. Un tope bajo ahorra batería y calor; Sin límite sigue la tasa de la pantalla.",
  menuFps: "Tope de cuadros por segundo solo en los menús, la portada y el bestiario (la partida usa el límite de arriba). 30 ahorra batería y calor; Igual que el juego usa el mismo límite.",
  fov: "Ángulo de visión de la cámara en partida. Más ancho muestra más patio y achica todo.",
  bright: "Brillo general de la imagen.",
  gamma: "Aclara u oscurece los medios tonos sin tocar los negros ni los blancos.",
  bloom: "Resplandor suave en luces y objetos brillantes.",
  fps: "Muestra en la parte superior los fps, los ms por cuadro, la resolución interna real y la escala o el modo FSR.",
  fullscreen: "Pasa el juego a pantalla completa (también con F11).",
  zoom: "Qué tan lejos se ve el auto. También con la rueda del mouse o - / =.",
  shake: "Sacudida de cámara al recibir o dar golpes fuertes.",
  dmgNums: "Cifras de daño flotando sobre los enemigos.",
  hint: "Muestra la guía de teclas al empezar cada partida.",
  hud: "Escala de todo el HUD (barras, reloj, radar).",
  hudSolid: "Fondo casi opaco en el HUD para leerlo mejor sobre pasto claro.",
  calm: "Quita parpadeos, destellos y sacudidas que molestan.",
  "pad.dead": "Cuánto hay que mover el stick antes de que cuente.",
  "pad.sens": "Qué tan rápido responde el stick.",
  rumble: "Vibración del mando en golpes.",
  touch: "Tamaño del stick y los botones en pantalla.",
};
const TABS: Record<string, { name: string; rows: Row[] }> = {
  gfx: { name: "Imagen", rows: [
    ["Resolución", "sect"],
    ["Escala de render", "range", "scale", 0.5, 1, 0.05, "%"],
    ["Escalado FSR", "sel", "fsr", [["off", "Apagado"], ["ultra", "Ultra calidad (77%)"], ["calidad", "Calidad (67%)"], ["equilibrado", "Equilibrado (59%)"], ["rendimiento", "Rendimiento (50%)"]]],
    ["Nitidez de FSR", "range", "fsrSharp", 0, 1, 0.05, "%"],
    ["Calidad", "sect"],
    ["Preajuste", "sel", "preset", [["bajo", "Bajo"], ["medio", "Medio"], ["alto", "Alto"], ["ultra", "Ultra"], ["custom", "Personalizado"]]],
    ["Sombras", "sel", "shadowQ", [["off", "Apagadas"], ["low", "Bajas (1024, 2 cascadas)"], ["mid", "Medias (2048, 3 cascadas)"], ["high", "Altas (4096, 4 cascadas)"]]],
    ["Detalle del mundo", "sel", "detail", [["bajo", "Bajo"], ["medio", "Medio"], ["alto", "Alto"], ["ultra", "Ultra"]]],
    ["Texturas", "sel", "texRes", [["256", "256 px"], ["512", "512 px"]]],
    ["Filtrado anisótropo", "sel", "aniso", [["1", "x1"], ["2", "x2"], ["4", "x4"], ["8", "x8"], ["16", "x16"]]],
    ["Suavizado", "sect"],
    ["Suavizado de bordes", "sel", "aa", [["none", "Ninguno (más nítido)"], ["fxaa", "FXAA"], ["msaa2", "MSAA x2"], ["msaa4", "MSAA x4"], ["msaa8", "MSAA x8"]]],
    ["Nitidez", "range", "sharpen", 0, 1, 0.05, "%"],
    ["Pantalla", "sect"],
    ["Límite de FPS", "sel", "fpsCap", [["30", "30"], ["60", "60"], ["120", "120"], ["0", "Sin límite"]]],
    ["FPS de los menús", "sel", "menuFps", [["30", "30"], ["60", "60"], ["0", "Igual que el juego"]]],
    ["Mostrar estadísticas", "tog", "fps"],
    ["Campo de visión", "range", "fov", 40, 70, 1, "°"],
    ["Brillo", "range", "bright", 0.6, 1.4, 0.05, "%"], ["Gamma", "range", "gamma", 0.7, 1.4, 0.05, "x"],
    ["Bloom", "tog", "bloom"], ["Pantalla completa", "btn", "fullscreen"],
  ] },
  game: { name: "Juego", rows: [
    ["Cámara", "sect"],
    ["Zoom de cámara", "range", "zoom", 0.8, 2, 0.05, "x"], ["Temblor de pantalla", "tog", "shake"],
    ["Pantalla", "sect"],
    ["Tamaño del HUD", "range", "hud", 0.8, 1.5, 0.05, "x"], ["Números de daño", "tog", "dmgNums"], ["Guía de controles al empezar", "tog", "hint"],
  ] },
  audio: { name: "Audio", rows: [
    ["Volumen general", "range", "vol.master", 0, 1, 0.05, "%"],
    ["Mezcla", "sect"],
    ["Efectos", "range", "vol.sfx", 0, 1, 0.05, "%"], ["Motor", "range", "vol.engine", 0, 1, 0.05, "%"], ["Música", "range", "vol.music", 0, 1, 0.05, "%"],
    ["Silencio (M)", "tog", "mute"],
  ] },
  ctl: { name: "Controles", rows: [
    ["Teclado", "sect"],
    ["Acelerar", "bind", "up"], ["Frenar / atrás", "bind", "down"], ["Girar izquierda", "bind", "left"], ["Girar derecha", "bind", "right"],
    ["Turbo", "bind", "boost"], ["Derrape", "bind", "drift"], ["Habilidad", "bind", "ability"],
    ["Las flechas también manejan. Esc pausa · M sonido · rueda o - / = zoom.", "note"],
    ["Carrera: J1 con W A S D, Espacio derrapa, E usa el objeto. J2 con flechas, Shift derecha y Enter.", "note"],
    ["Joystick", "sect"],
    ["Zona muerta del stick", "range", "pad.dead", 0.05, 0.4, 0.01, "%"], ["Sensibilidad del stick", "range", "pad.sens", 0.5, 2, 0.05, "x"], ["Vibración", "tog", "rumble"],
    ["Stick hacia donde se quiere ir · A turbo · B derrape · X habilidad · gatillos acelerar y frenar. En carrera: A/gatillo derecho acelera, B/gatillo izquierdo frena, RB o X derrapa, Y o LB usa el objeto.", "note"],
    ["Táctil", "sect"],
    ["Tamaño de controles táctiles", "range", "touch", 0.7, 1.4, 0.05, "x"],
  ] },
  a11y: { name: "Accesibilidad", rows: [
    ["Lectura", "sect"],
    ["Tamaño del HUD", "range", "hud", 0.8, 1.5, 0.05, "x"], ["HUD con fondo sólido", "tog", "hudSolid"], ["Números de daño", "tog", "dmgNums"],
    ["Movimiento", "sect"],
    ["Reducir parpadeos y destellos", "tog", "calm"], ["Temblor de pantalla", "tog", "shake"],
  ] },
  data: { name: "Datos", rows: [
    ["El progreso se guarda en este navegador. Un archivo de respaldo permite llevarlo a otro dispositivo.", "note"],
    ["Respaldo", "sect"],
    ["Exportar partida", "btn", "export"], ["Importar partida", "btn", "import"],
    ["Opciones", "sect"],
    ["Restablecer opciones de imagen, audio y controles", "btn", "resetcfg"],
  ] },
};
let tab = "gfx";
let resetArmed = false;
const ref = (p: string) => { const k = p.split("."); let o = save as unknown as Record<string, unknown>; while (k.length > 1) o = o[k.shift()!] as Record<string, unknown>; return [o, k[0]] as const; };
const val = (p: string) => { const [o, k] = ref(p); return o[k]; };
export const keyName = (c?: string) => (c ?? "").replace(/^Key|^Digit/, "").replace("Left", " izq").replace("Right", " der").replace("Space", "Espacio").replace(/^Arrow/, "Flecha ").toUpperCase();
const show2 = (v: number, u?: string) => (u === "%" ? `${Math.round(v * 100)}%` : u === "°" ? `${Math.round(v)}°` : `${v.toFixed(2)}x`);
/** Opciones que no se pueden usar con los ajustes actuales: motivo en texto (la fila queda apagada) o "" si está disponible. */
const unavailable = (path: string) => (path === "scale" && save.fsr !== "off" ? "FSR está activo y reemplaza a la escala manual." : path === "fsrSharp" && save.fsr === "off" ? "Solo con el escalado FSR activo." : "");
/** Lista de una opción con lo que admite este dispositivo (MSAA hasta el máximo de la tarjeta). */
const choices = (path: string, list: [string, string][]): [string, string, boolean][] => list.map(([v, n]) => {
  if (path === "aa" && v.startsWith("msaa") && +v.slice(4) > maxMsaa()) return null;
  if (path === "preset" && v === "custom" && save.preset !== "custom") return null;
  return [v, n, false] as [string, string, boolean];
}).filter((o): o is [string, string, boolean] => !!o);
function renderConfig() {
  $("tabs").innerHTML = Object.entries(TABS).map(([id, t]) => `<button class="tab ${id === tab ? "on" : ""}" data-tab="${id}">${t.name}</button>`).join("");
  // En táctil, Controles deja solo lo táctil (sin teclas ni gamepad)
  const touchOnly = tab === "ctl" && ctl === "touch";
  const rows = TABS[tab].rows.filter((r) => (touchOnly ? (r[1] === "sect" ? r[0] === "Táctil" : r[2] === "touch") : true));
  const d = (path: string) => (DESC[path] ? `<small>${DESC[path]}</small>` : "") + (unavailable(path) ? `<small class="why">${unavailable(path)}</small>` : "");
  $("opts").innerHTML = rows.map((r) => {
    if (r[1] === "sect") return `<div class="sect">${r[0]}</div>`;
    if (r[1] === "note") return `<div class="note">${r[0]}</div>`;
    if (r[1] === "btn") return `<button class="row" data-act="${r[2]}"><span class="lb">${r[2] === "resetcfg" && resetArmed ? "¿Seguro? Pulsa otra vez para restablecer" : r[0]}${d(r[2])}</span><b>&gt;</b></button>`;
    if (r[1] === "bind") return `<button class="row" data-bind="${r[2]}"><span class="lb">${r[0]}</span><b>${binding === r[2] ? "PRESIONA UNA TECLA" : keyName(KEYS[r[2]][0])}</b></button>`;
    if (r[1] === "tog") return `<button class="row" data-tog="${r[2]}"><span class="lb">${r[0]}${d(r[2])}</span><b>${val(r[2]) ? "SÍ" : "NO"}</b></button>`;
    if (r[1] === "sel") return `<label class="row ${unavailable(r[2]) ? "off" : ""}"><span class="lb">${r[0]}${d(r[2])}</span><select data-set="${r[2]}" ${unavailable(r[2]) ? "disabled" : ""}>${choices(r[2], r[3]).map(([v, n, no]) => `<option value="${v}" ${String(val(r[2])) === v ? "selected" : ""} ${no ? "disabled" : ""}>${n}</option>`).join("")}</select></label>`;
    const v = val(r[2]) as number;
    return `<label class="row ${unavailable(r[2]) ? "off" : ""}"><span class="lb">${r[0]}${d(r[2])}</span><input type="range" data-set="${r[2]}" data-u="${r[6]}" min="${r[3]}" max="${r[4]}" step="${r[5]}" value="${v}" ${unavailable(r[2]) ? "disabled" : ""}><output>${show2(v, r[6])}</output></label>`;
  }).join("");
}

// Trasfondo de cada bicho (el de los pilotos vive en pilots.ts)
const LORE: Record<Kind, string> = {
  hormiga: "Trabaja en equipo, cobra en migas y jura que el patio es suyo desde antes que la casa. Nunca viene sola: donde hay una, hay una fila entera esperando su parte.",
  escupidora: "Probó el jugo de limón una vez y desde entonces escupe por principio. Sabe que el blanco que va derecho es el más fácil, y lo disfruta.",
  friccion: "Un solo cambio: adelante. Frenar nunca figuró en el manual. Lo cargaron frotándolo contra la alfombra una tarde entera y todavía le queda envión.",
  robot: "Le dieron cuerda hace años y todavía no terminó de enojarse. La llave de la espalda gira sola cuando se impacienta, que es siempre.",
  polilla: "Viene por el faro y se queda por la pelea. Nadie le explicó que la luz no se come. Confunde el faro con la luna y la luna con el faro: ataca a los dos.",
  escarabajo: "Blindado de fábrica, lento por convicción. Considera que embestir es una forma de saludar. Su caparazón ya aguantó dos inviernos y una bota; un auto a control remoto no lo preocupa.",
  rey: "Se coronó solo, con una tapita de gaseosa. Exige reverencias y migas de galleta. Su corte son todos los escarabajos del patio, aunque ninguno lo votó.",
  cortadora: "Despertó un domingo a las siete de la mañana y decidió que el pasto no alcanzaba. Corta mangueras, macetas y todo lo que se cruce en su línea.",
  tarantula: "Ocho patas, cero paciencia. Teje redes por pasatiempo y emboscadas por oficio. Vive debajo del tanque de agua y sale cuando escucha un motor.",
  perro: "Felipe, bulldog francés y dueño del patio. Sufre de zoomies, ladra a la nada, entierra juguetes y no negocia. Nadie sabe qué ve con ese ojo.",
  gato: "Eulalio el michu, naranja y de energía infinita. Gira, salta, cambia de idea a mitad de salto y jamás cae donde dijo que iba a caer. Duerme dieciocho horas y usa las otras seis para esto.",
  aspiradora: "Programada para limpiar la casa, se escapó por la gatera. Considera que todo el patio es una pelusa, y en su mapa hay un solo punto marcado: el auto.",
  cortacercos: "Lo dejaron enchufado después de podar el ligustro. Desde entonces, todo le parece un cerco. Zumba sin parar y deja cables pelados por donde pasa.",
};
// Cómo ataca y cómo esquivarlo (sale del comportamiento real de enemies.ts)
const HOW: Record<Kind, [string, string]> = {
  hormiga: ["Corre derecho al auto y muerde por contacto. Llega en grupos y en columnas detrás de una líder.", "Sola no es nada: lo peligroso es quedar rodeado. Mantener el auto en movimiento y abrir paso con embestidas."],
  escupidora: ["Se frena a unos 16 metros, apunta y escupe ácido hacia donde el auto va a estar.", "El disparo calcula el rumbo: un volantazo justo después de que se detiene lo hace fallar."],
  friccion: ["Rápido y sin frenos: va en línea recta contra el auto y golpea por contacto.", "Se pasa de largo con facilidad. Un giro corto en el último momento lo deja atrás."],
  robot: ["Se planta, gira hasta apuntar y sale disparado en línea recta durante un segundo.", "Mientras apunta quieto hay tiempo: salir de su línea de carga hacia un costado."],
  polilla: ["Revolotea delante del faro y cada tanto se lanza en picada contra el parabrisas.", "Sigue hacia donde apunta el faro: un giro brusco la deja en el aire."],
  escarabajo: ["Lento y muy pesado. Empuja por contacto, y embestirlo de frente devuelve parte del golpe.", "Sin Ariete no conviene chocarlo de frente: rodearlo y castigarlo con armas a distancia."],
  rey: ["Escarabajo gigante: persigue sin pausa y aplasta por contacto con mucho daño.", "Gira despacio: dar vueltas amplias a su alrededor y nunca quedar contra una pared."],
  cortadora: ["Apunta quieta y carga en línea recta durante casi tres segundos, cortando todo lo que encuentra.", "La pausa antes de cargar es el aviso: cruzar de costado su trayectoria, nunca escapar en línea recta delante de ella."],
  tarantula: ["Dos ataques anunciados en rojo: un aro a su alrededor antes de una ráfaga de seis escupitajos, y un aro donde va a caer de un salto.", "Salir del aro antes de que se llene. En el salto, el punto de caída se fija a mitad del aviso: cambiar de rumbo en ese momento."],
  perro: ["Salta y aplasta todo en 11 metros al caer, embiste en línea recta por un carril marcado en rojo, hace zoomies en zigzag al doble de velocidad o gira como un trompo.", "Mientras está en el aire, mirar la sombra y alejarse del punto de caída. Ante el carril rojo, salir de costado: después de embestir frena torpe y queda expuesto. En los zoomies, no cruzarse en su camino."],
  gato: ["Zigzaguea y elige al azar: salto con aro rojo, trompo que rueda hacia el auto o un arranque de costado a toda velocidad.", "El aro marca dónde cae: salir antes de que se llene. Ante el trompo, frenar y dejarlo pasar."],
  aspiradora: ["Un aro rojo enorme anuncia la succión: arrastra al auto hacia ella y después suelta tres ráfagas de tuercas en abanico.", "Acelerar hacia afuera del aro apenas aparece. Las ráfagas dejan huecos entre tuerca y tuerca: pasar por ellos."],
  cortacercos: ["Anuncia un barrido en arco con un sector rojo de 10 metros y siembra cables con chispas en el piso.", "Salir del sector antes del barrido y no pisar los cables: electrocutan mientras se está encima."],
};
// Fase 2 (minijefes por debajo de la mitad de vida; jefes finales en su segunda barra; enemies.ts: enraged)
const PHASE2: Partial<Record<Kind, string>> = { gato: " y maúlla para llamar polillas", perro: " y salta más seguido" };
const BTABS = { bichos: "Bichos", pilotos: "Pilotos", logros: "Logros", stats: "Estadísticas" };
let btab: keyof typeof BTABS = "bichos";
/** Nombre visible de un premio de logro (part:<ranura>:<opción> o pilot:<id>). */
const rewardName = (id: string) => { const [t, k, o] = id.split(":"); return t === "pilot" ? PILOTS[k as PilotId].name : `${PARTS[k as Slot].name} ${opts(k as Slot)[o][0]}`; };
/** Tiempo largo legible: "2 h 05 min" o "7 min 12 s". */
const longTime = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min ${String(Math.floor(s % 60)).padStart(2, "0")} s`; };
/** Estadísticas de carrera: fichas con los totales históricos (save.stats y save.slain). */
function statsHtml() {
  const s = save.stats, kv = (a: string, b: string | number) => `<div class="kv"><span>${a}</span><b>${b}</b></div>`;
  const card = (title: string, big: string, extra = "") => `<div tabindex="0" class="carc ficha"><b>${title}</b><div class="big">${big}</div>${extra}</div>`;
  const fav = Object.entries(s.dmg).filter(([id]) => id in WEAPONS).sort((a, b) => b[1] - a[1])[0];
  const kinds = (Object.keys(DEF) as Kind[]).filter((k) => (save.slain[k] ?? 0) > 0);
  const total = kinds.reduce((n, k) => n + save.slain[k]!, 0);
  return card("Partidas", String(s.runs), s.runs ? `${s.wins} ${s.wins === 1 ? "ganada" : "ganadas"} · ${Math.round((s.wins / s.runs) * 100)}%` : "Sin partidas completas todavía.")
    + card("Tiempo jugado", longTime(s.time))
    + card("Recorrido", `${(s.dist / 1000).toFixed(1).replace(".", ",")} km`, "Distancia total manejada.")
    + card("Arma favorita", fav ? WEAPONS[fav[0] as WeaponId].name : "Sin datos", fav ? `${Math.round(fav[1])} de daño acumulado` : "Se define con el daño de cada partida.")
    + `<div tabindex="0" class="carc ficha"><b>Bajas por tipo</b><div class="big">${total}</div>${kinds.map((k) => kv(DEF[k].name, save.slain[k]!)).join("") || "Sin bajas todavía."}</div>`
    + `<div tabindex="0" class="carc ficha"><b>Mejores marcas por zona</b>${(Object.keys(ZONES) as ZoneId[]).map((z) => { const r = s.zone[z]; return kv(ZONES[z].short, r ? `${fmt(r.t)} · ${r.kills} bajas` : "—"); }).join("")}</div>`;
}
function renderBestiary() {
  $("btabs").innerHTML = tabsHtml(BTABS, btab, "btab");
  $("beasts").innerHTML = btab === "stats" ? statsHtml() : btab === "logros" ? (Object.keys(ACH) as AchId[]).map((k) => {
    const a: { name: string; txt: string; reward?: string; scrap?: number } = ACH[k], ok = save.ach.includes(k);
    return `<div tabindex="0" class="carc ficha logro ${ok ? "" : "locked"}"><span class="sello">${ok ? "LOGRADO" : "???"}</span><b class="wi">${icon("evo", 22)}${a.name}</b>${a.txt}${a.reward || a.scrap ? `<div class="price">Premio: ${a.reward ? rewardName(a.reward) : `${a.scrap} tornillos`}</div>` : ""}</div>`;
  }).join("")
    : btab === "pilotos" ? (Object.keys(PILOTS) as PilotId[]).map((k) => {
      const p = PILOTS[k];
      return `<div tabindex="0" class="carc ficha pilot ${owns("pilot:" + k) ? "" : "locked"}"><b>${p.name}</b>${p.pros.map((x) => `<div class="pro">${x}</div>`).join("")}<div class="con">${p.con}</div><div class="lore">${p.lore}</div></div>`;
    }).join("")
    : (Object.keys(DEF) as Kind[]).map((k) => {
      // Todo visible desde el inicio; lo propio (bajas) dice "Sin registros todavía" hasta que aparezca. Clic, Enter o A abren la ficha completa.
      const d = DEF[k], n = save.slain[k] ?? 0, met = save.seen.includes(k) || n > 0;
      return `<div tabindex="0" class="carc ficha ${d.boss ? "boss" : ""}" data-beast="${k}"><b class="wi">${d.boss ? icon("jefe", 22) : ""}${d.name}</b>${rankOf(k)} · ${met ? `${n} ${n === 1 ? "baja" : "bajas"}` : "Sin registros todavía"}<div class="lore">${LORE[k]}</div><div class="st"><span>Vida</span>${bar(d.hp, d.boss ? 8000 : 90)}<span>Velocidad</span>${bar(d.speed, 18)}<span>Daño</span>${bar(d.dmg, d.boss ? 45 : 12)}<span>Peso</span>${bar(d.mass, d.boss ? 100 : 3)}</div><div class="price">${d.xp ? `${d.xp} tuercas de XP` : "Fin de la partida"}</div></div>`;
    }).join("");
  $("records").innerHTML = save.runs.length
    ? `<tr><th>#</th><th>Tiempo</th><th>Bajas</th><th>Nivel</th><th>Semilla</th></tr>` + save.runs.map((r, i) => `<tr><td>${i + 1}</td><td>${fmt(r.t)}${r.win ? " V" : ""}</td><td>${r.kills}</td><td>${r.lv}</td><td>${r.seed}</td></tr>`).join("")
    : `<tr><td>Sin partidas todavía.</td></tr>`;
}

// ---------- Ficha completa de un bicho (Bestiario → elegir una ficha) ----------
// La parte 3D la arma main.ts (beastTick) leyendo BV cada cuadro: crea el bicho al abrir y lo libera al cerrar o cambiar.
// anim = animación pedida; seq cambia en cada pedido (repetir el mismo botón la vuelve a correr). touched = último giro a mano (ms).
export type BeastAnim = "" | "walk" | "attack" | "hit" | "die" | "phase";
export const BV = { kind: null as Kind | null, anim: "" as BeastAnim, seq: 0, elite: "" as Elite | "", yaw: 0.6, zoom: 1, touched: 0 };
const KINDS = Object.keys(DEF) as Kind[];
function rankOf(k: Kind) { return !DEF[k].boss ? "Plaga" : FINALS.includes(k) ? "Jefe final" : "Minijefe"; }
const zoomBeast = (k: number) => { BV.zoom = Math.min(1.8, Math.max(0.45, BV.zoom * k)); };
function openBeast(k: Kind) { Object.assign(BV, { kind: k, anim: "", elite: "", yaw: 0.6, zoom: 1, touched: 0 }); go("beast"); }
function beastStep(dir: number) {
  if (!BV.kind) return;
  SFX.blip();
  Object.assign(BV, { kind: KINDS[(KINDS.indexOf(BV.kind) + dir + KINDS.length) % KINDS.length], anim: "", elite: "", zoom: 1 });
  renderBeast();
  $("bmsg").textContent = "";
}
// Gamepad en la ficha: LB / RB cambian de bicho, stick derecho gira, gatillos acercan (RT) y alejan (LT)
function beastPad(dt: number) {
  if (padPressed(4)) beastStep(-1);
  if (padPressed(5)) beastStep(1);
  const gp = navigator.getGamepads?.()[0];
  if (!gp) return;
  const rx = gp.axes[2] ?? 0;
  if (Math.abs(rx) > 0.2) { BV.yaw += rx * dt * 3; BV.touched = performance.now(); }
  const z = (gp.buttons[6]?.value ?? 0) - (gp.buttons[7]?.value ?? 0);
  if (Math.abs(z) > 0.05) zoomBeast(1 + z * dt * 1.5);
}
const BHINT = { keys: "Arrastrar gira · Rueda acerca · Q y E (o las flechas en el borde) cambian de bicho · Esc vuelve", pad: "Stick derecho gira · Gatillos acercan · LB y RB cambian de bicho · B vuelve", touch: "Arrastrar gira · Pellizcar acerca · Deslizar la ficha cambia de bicho" };
function renderBeast() {
  const k = BV.kind;
  if (!k) return;
  // El foco vuelve al mismo botón después de rearmar el panel
  const was = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>("#bpanel [data-bnav], #bpanel [data-banim], #bpanel [data-belite]");
  const wasSel = was && (["bnav", "banim", "belite"] as const).map((a) => (was.dataset[a] !== undefined ? `[data-${a}="${was.dataset[a]}"]` : "")).join("");
  const d = DEF[k], r = save.beast[k], n = save.slain[k] ?? 0, el = BV.elite, met = save.seen.includes(k) || n > 0 || !!r;
  // Las élites cambian vida, velocidad y peso como en makeElite (enemies.ts)
  const hp = d.hp * (el === "rapida" ? 0.6 : el === "blindada" ? 3 : 1), sp = d.speed * (el === "rapida" ? 2 : 1), mass = d.mass * (el === "blindada" ? 5 : 1);
  const num = (v: number) => (v >= 10 ? String(Math.round(v)) : v.toFixed(1).replace(".", ",").replace(",0", ""));
  const row = (a: string, v: number, max: number, txt: string) => `<span>${a}</span>${bar(v, max)}<em>${txt}</em>`;
  const kv = (a: string, b: string | number) => `<div class="kv"><span>${a}</span><b>${b}</b></div>`;
  const btn = (attr: string, v: string, label: string, on = false) => `<button class="opt ${on ? "on" : ""}" data-${attr}="${v}">${label}</button>`;
  const weak = Object.entries(r?.by ?? {}).filter(([id]) => id in WEAPONS || id === "embestida").sort((a, b) => b[1] - a[1]).slice(0, 3);
  const wname = (id: string) => (id in WEAPONS ? WEAPONS[id as WeaponId].name : "Embestida");
  const first = r?.first ? r.first.split("-").reverse().join("/") : save.seen.includes(k) ? "Sin fecha (antes del registro)" : "Todavía no";
  $("bpanel").innerHTML = `<div class="bhead"><button class="bnav" data-bnav="-1" aria-label="Bicho anterior">&lt;</button>`
    + `<div class="bname"><small>${rankOf(k)} · ${KINDS.indexOf(k) + 1} / ${KINDS.length}</small><b>${d.name}</b></div><button class="bnav" data-bnav="1" aria-label="Bicho siguiente">&gt;</button></div>`
    + `<div class="bctl"><div class="slot"><span>Animación</span>${btn("banim", "walk", "Caminar", BV.anim === "walk")}${btn("banim", "attack", "Atacar")}${btn("banim", "hit", "Recibir golpe")}${btn("banim", "die", "Morir")}${d.boss ? btn("banim", "phase", "Fase 2") : ""}</div>`
    + (d.boss ? "" : `<div class="slot"><span>Variante</span>${btn("belite", "", "Normal", !el)}${btn("belite", "rapida", "Rápida", el === "rapida")}${btn("belite", "blindada", "Blindada", el === "blindada")}</div>`) + `</div>`
    + `<div id="binfo">`
    + `<div class="bblock" tabindex="0"><div class="sect">Datos</div><div class="st bst">${row(d.boss ? "Vida" : "Vida inicial", hp, d.boss ? 8000 : 270, num(hp))}${row("Velocidad", sp, 25, num(sp))}${row("Daño", d.dmg, d.boss ? 45 : 12, num(d.dmg))}${row("Peso", mass, d.boss ? 100 : 15, num(mass))}${row("XP", d.xp, d.boss ? 120 : 6, d.xp ? `${d.xp} ${d.xp === 1 ? "tuerca" : "tuercas"}` : "Fin de la partida")}</div>`
    + (el ? `<p class="bnote">${el === "rapida" ? "Élite rápida: doble velocidad y 60% de la vida." : "Élite blindada: triple vida y cinco veces más pesada, casi no se la empuja."} Al caer suelta un cofre.</p>` : d.boss ? "" : `<p class="bnote">La vida de las plagas crece con el tiempo de partida.</p>`) + `</div>`
    + `<div class="bblock" tabindex="0"><div class="sect">Cómo ataca</div><p>${HOW[k][0]}</p><div class="sect">Cómo esquivarlo</div><p>${HOW[k][1]}</p>${d.boss ? `<p class="bnote">${d.final ? `Fase 2: al vaciar la primera barra ruge y llena una segunda, pega más fuerte` : "Fase 2: por debajo de la mitad de vida se enfurece"}, va un 20% más rápido${PHASE2[k] ?? ""}.</p>` : ""}</div>`
    + `<div class="bblock" tabindex="0"><div class="sect">Trasfondo</div><p class="lore">${LORE[k]}</p></div>`
    + `<div class="bblock" tabindex="0"><div class="sect">Registro propio</div>${met ? kv("Bajas", n) + kv("Primera vez", first) + kv("Daño recibido", Math.round(r?.hurt ?? 0)) + kv("Zonas", r?.zones.map((z) => ZONES[z].short).join(", ") || "Sin registros todavía") : `<p>Sin registros todavía.</p>`}</div>`
    + `<div class="bblock" tabindex="0"><div class="sect">Debilidades</div>${weak.length ? `<div class="st bst">${weak.map(([id, v]) => row(wname(id), v, weak[0][1], String(Math.round(v)))).join("")}</div><p class="bnote">Daño infligido por arma, según el historial propio.</p>` : `<p>Sin registros todavía.</p>`}</div>`
    + `</div><div class="bfoot"><div class="hint">${BHINT[ctl]}</div><button data-act="back">Volver</button></div>`;
  if (wasSel) focusSel(wasSel);
}

// ---------- Pausa y resultados (los datos los arma main.ts) ----------
type Kit = { weapons: { id: WeaponId; lv: number; evolved: boolean }[]; passives: { id: PassiveId; lv: number }[]; stats: [string, string][]; seed: string };
const pips = (l: number) => `<span class="pips">${"<i class=on></i>".repeat(l)}${"<i></i>".repeat(Math.max(0, 5 - l))}</span>`;
export function openPause(k: Kit) {
  $("kitW").innerHTML = k.weapons.map((w) => `<li><span class="wi">${icon(w.id, 20)}${w.evolved ? WEAPONS[w.id].evoName : WEAPONS[w.id].name}</span>${w.evolved ? "<b>EVO</b>" : pips(w.lv)}</li>`).join("");
  $("kitP").innerHTML = k.passives.map((p) => `<li><span class="wi">${icon(p.id, 20)}${PASSIVES[p.id].name}</span>${pips(p.lv)}</li>`).join("") || "<li><span>Ninguna</span></li>";
  $("kitS").innerHTML = k.stats.map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join("");
  $("pauseSeed").textContent = k.seed;
  reset("pause");
}
export function openOver(r: { win: boolean; why: string; time: number; kills: number; level: number; scrap: number; record: boolean; dmg: Record<string, number>; seed: string; more?: boolean; title?: string; prevBest?: number; bestStreak?: number; bestHit?: number; bossKills?: number; ach?: string[]; car?: string }) {
  $("overEndless").classList.toggle("hidden", !r.more); // venció al jefe final: puede seguir en modo sin fin
  $("overTitle").textContent = r.title ?? (r.win ? "VICTORIA" : "FIN DE LA PARTIDA");
  $("overTxt").textContent = r.why;
  // Comparación con el récord de tiempo: ▲ mejor, ▼ peor
  const dT = r.prevBest ? Math.floor(r.time) - r.prevBest : 0, dTxt = r.prevBest ? `<em class="${dT >= 0 ? "up" : "dn"}">${dT >= 0 ? "▲" : "▼"} ${fmt(Math.abs(dT))}</em>` : "";
  $("overStats").innerHTML = [["Tiempo", fmt(r.time) + dTxt], ["Bajas", r.kills], ["Nivel", r.level], ["Tornillos", "+" + r.scrap]].map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join("");
  const best = [["Racha más larga", "x" + (r.bestStreak ?? 0)], ["Golpe más fuerte", String(r.bestHit ?? 0)], ["Jefes derrotados", String(r.bossKills ?? 0)]];
  $("overBest").innerHTML = best.map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join("");
  $("overRew").innerHTML = [`<li><span>Tornillos</span><b>+${r.scrap}</b></li>`, ...(r.ach ?? []).map((a) => `<li><span>Logro</span><b>${a}</b></li>`)].join("");
  $("overRepeat").textContent = "Repetir";
  $("overRec").classList.toggle("hidden", !r.record);
  $("overShop").classList.toggle("hidden", !canBuy());
  const rows = Object.entries(r.dmg).sort((a, b) => b[1] - a[1]), top = rows[0]?.[1] || 1;
  const name = (id: string) => (id in WEAPONS ? WEAPONS[id as WeaponId].name : id[0].toUpperCase() + id.slice(1));
  $("overDmg").innerHTML = rows.map(([id, v]) => `<li><span class="wi">${id in WEAPONS ? icon(id, 18) : ""}${name(id)}</span><i style="width:${(v / top) * 100}%"></i><b>${Math.round(v)}</b></li>`).join("") || "<li><span>Sin daño infligido</span></li>";
  $("overSeed").textContent = r.seed;
  reset("over");
}

// ---------- Instalar como app (PWA): solo si el navegador lo ofrece ----------
let installEv: (Event & { prompt(): Promise<void> }) | null = null;
const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
if ("serviceWorker" in navigator && !import.meta.env.DEV) navigator.serviceWorker.register("./sw.js").catch(() => {});
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEv = e as typeof installEv; $("install").classList.remove("hidden"); });
addEventListener("appinstalled", () => { installEv = null; $("install").classList.add("hidden"); });
if (!standalone && /iP(hone|ad|od)/.test(navigator.userAgent)) $("iosHint").classList.remove("hidden");

// ---------- Textos según el último control usado ----------
const CTL_TXT = { keys: ["PRESIONA CUALQUIER TECLA", " · Esc sigue · M sonido"], pad: ["PRESIONA A", " · Start sigue"], touch: ["TOCA LA PANTALLA", " · el botón de pausa sigue"] };
let ctlShown = ctl;
function ctlTexts() {
  const [press, hint] = CTL_TXT[ctl];
  document.querySelector("#scr-title .press")!.textContent = press;
  $("pauseHint").textContent = hint;
  if (current() === "config" && tab === "ctl" && (ctl === "touch") !== (ctlShown === "touch")) renderConfig();
  if (current() === "beast" && ctl !== ctlShown) renderBeast(); // la guía de controles de la ficha
  ctlShown = ctl;
}
addEventListener("ctl", ctlTexts);

// ---------- Arranque ----------
export function initMenu(a: Api) {
  api = a;
  applySettings();
  ctlTexts();
  $("tPause").addEventListener("click", () => (current() === "pause" ? api.resume() : api.pause())); // botón táctil: igual que Esc/Start
  const fe = $("fe");
  fe.addEventListener("focusin", () => SFX.blip());
  // Mouse: el foco sigue al puntero solo si se mueve (pointerover le robaría el foco al teclado al cambiar de pantalla)
  fe.addEventListener("pointermove", (e) => { const el = (e.target as HTMLElement).closest<HTMLElement>("button:not(:disabled), select, input, [tabindex]"); if (el && el !== document.activeElement) el.focus({ preventScroll: true }); });
  fe.addEventListener("click", (e) => {
    const t = e.target as HTMLElement, d = (t.closest("[data-go],[data-rc],[data-act],[data-k],[data-paint],[data-rim],[data-tab],[data-tog],[data-bind],[data-gtab],[data-stab],[data-btab],[data-buy],[data-pilot],[data-part],[data-abil],[data-dsel],[data-dcol],[data-dact],[data-beast],[data-bnav],[data-banim],[data-belite]") as HTMLElement | null)?.dataset;
    if (current() === "title") { SFX.accept(); return go("main"); }
    if (t.id === "dgrid") { if (!e.detail) setCell(dcx, dcy, dcol); return; } // Enter / A sobre la grilla (el mouse y el dedo pintan en pointerdown)
    if (!d) return;
    SFX.accept();
    if (d.go) go(d.go as Scr);
    else if (d.rc) { cycleRace(d.rc); renderRace(); }
    else if (d.act === "race") api.race();
    else if (d.act === "battle") api.battle();
    else if (d.act === "play") api.play();
    else if (d.act === "daily") api.play(true);
    else if (d.act === "endless") api.endless();
    else if (d.act === "curse") { // ciclo: ninguna → Horda → Sin reparaciones → ambas
      const all = CURSE_SETS.map((c) => c.join()), i = all.indexOf(save.curses.join());
      save.curses = [...CURSE_SETS[(i + 1) % CURSE_SETS.length]]; persist(); renderMain();
    }
    else if (d.act === "zone") { // el fondo cambia en el loop del menú (main.ts); estática como al cambiar de canal
      const zs = ownedZones(); save.zone = zs[(zs.indexOf(save.zone) + 1) % zs.length]; persist(); renderMain();
      fe.classList.remove("zap"); void fe.offsetWidth; fe.classList.add("zap"); SFX.static();
    }
    else if (d.act === "back") back();
    else if (d.act === "fullscreen") { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.(); }
    else if (d.act === "resetcfg") { // dos pasos: el primer clic pide confirmar (se desarma solo a los 4 s)
      if (!resetArmed) { resetArmed = true; renderConfig(); focusSel('[data-act="resetcfg"]'); setTimeout(() => { if (resetArmed) { resetArmed = false; if (current() === "config") renderConfig(); } }, 4000); }
      else { resetArmed = false; resetCfg(); renderConfig(); focusSel('[data-act="resetcfg"]'); }
    }
    else if (d.act === "export") exportSave();
    else if (d.act === "import") importSave();
    else if (d.act === "resume") api.resume();
    else if (d.act === "quit") api.quit();
    else if (d.act === "install") void installEv?.prompt().finally(() => { installEv = null; $("install").classList.add("hidden"); }); // el evento sirve una sola vez
    else if (d.tab) { tab = d.tab; renderConfig(); $("opts").scrollTop = 0; (document.querySelector(`[data-tab="${tab}"]`) as HTMLElement).focus(); }
    else if (d.tog) { const [o, k] = ref(d.tog); o[k] = !o[k]; commit(); renderConfig(); (document.querySelector(`[data-tog="${d.tog}"]`) as HTMLElement).focus(); }
    else if (d.bind) { binding = d.bind as Action; renderConfig(); (document.querySelector(`[data-bind="${d.bind}"]`) as HTMLElement).focus(); }
    else if (d.dsel !== undefined) { // elegir diseño: se edita y, si ya tiene dibujo, se aplica al capó
      const n = +d.dsel;
      if (n < 0) save.decalSel = -1;
      else { eslot = n; draft = save.decals[n] || DECAL_BLANK; hist = []; if (save.decals[n]) save.decalSel = n; }
      persist(); renderGarage(); focusSel(`[data-dsel="${n}"]`);
    }
    else if (d.dcol !== undefined) setCol(+d.dcol);
    else if (d.dact === "save") { // guarda el borrador en la ranura y lo aplica; un borrador vacío libera la ranura
      save.decals[eslot] = draft === DECAL_BLANK ? "" : draft;
      if (save.decals[eslot]) save.decalSel = eslot; else if (save.decalSel === eslot) save.decalSel = -1;
      persist(); renderGarage(); focusSel(`[data-dact="save"]`);
    }
    else if (d.dact === "clear") { snap(); draft = DECAL_BLANK; drawGrid(); }
    else if (d.dact === "undo") undo();
    else if (d.dact === "edit") { editing = true; renderGarage(); focusSel("#dgrid"); }
    else if (d.dact === "done") { editing = false; renderGarage(); focusSel('[data-dact="edit"]'); }
    else if (d.paint || d.rim) { if (d.paint) save.paint = d.paint; else save.rim = d.rim!; persist(); renderGarage(); (document.querySelector(`[data-${d.paint ? "paint" : "rim"}="${d.paint ?? d.rim}"]`) as HTMLElement).focus(); }
    else if (d.gtab) { gtab = d.gtab as typeof gtab; renderGarage(); $("cars").scrollTop = 0; focusSel(`[data-gtab="${gtab}"]`); }
    else if (d.beast) openBeast(d.beast as Kind);
    else if (d.bnav) beastStep(+d.bnav);
    else if (d.banim) { // Caminar queda en bucle hasta volver a pulsarlo; el resto corre una vez
      BV.anim = d.banim === "walk" && BV.anim === "walk" ? "" : d.banim as BeastAnim; BV.seq++;
      $("bmsg").textContent = d.banim === "phase" && BV.kind ? `${DEF[BV.kind].name} SE ENFURECE` : "";
      $("bmsg").classList.remove("pop"); void $("bmsg").offsetWidth; $("bmsg").classList.add("pop");
      renderBeast();
    }
    else if (d.belite !== undefined) { BV.elite = d.belite as Elite | ""; BV.anim = ""; renderBeast(); }
    else if (d.btab) { btab = d.btab as typeof btab; renderBestiary(); focusSel(`[data-btab="${btab}"]`); }
    else if (d.stab) { stab = d.stab as typeof stab; renderShop(); $("shop").scrollTop = 0; focusSel(`[data-stab="${stab}"]`); }
    else if (d.buy) { if (!buy(d.buy)) return; renderShop(); focusSel(`[data-buy="${d.buy}"]`); }
    else if (d.abil) { save.ability = d.abil as AbilityId; persist(); renderGarage(); focusSel(`[data-abil="${d.abil}"]`); }
    else if (d.pilot) {
      const id = "pilot:" + d.pilot;
      if (!owns(id) && !buy(id)) return;
      save.pilot = d.pilot as PilotId; persist(); renderGarage(); focusSel(`[data-pilot="${d.pilot}"]`);
    } else if (d.part) {
      const [sl, o] = d.part.split(":") as [Slot, string];
      if (!owns("part:" + d.part) && !buy("part:" + d.part)) return;
      save.kit[sl] = o; persist(); renderGarage(); focusSel(`[data-part="${d.part}"]`);
    } else if (d.k && current() === "garage") {
      const k = d.k as CarKind;
      if (!owns("car:" + k) && !buy("car:" + k)) return;
      save.car = k; persist(); renderGarage(); focusSel(`.carc[data-k="${k}"]`);
    } else if (d.k && current() === "shop") {
      const p = PERKS.find((x) => x.k === d.k)!, cost = p.cost[save.perm[p.k]];
      if (cost === undefined || save.scrap < cost) return;
      save.scrap -= cost; save.perm[p.k]++; persist(); renderShop(); focusSel(`#shop [data-k="${p.k}"]`);
    }
  });
  // Grilla de calcos con puntero (mouse y táctil): arrastrar pinta, clic derecho borra; el cursor sigue al puntero
  const onGrid = (e: PointerEvent) => ((e.target as HTMLElement).id === "dgrid" ? (e.target as HTMLElement) : null);
  fe.addEventListener("pointerdown", (e) => {
    const cv = onGrid(e);
    if (!cv) return;
    cv.setPointerCapture(e.pointerId); cv.focus();
    stroke = true; strokeSnap = true; erasing = e.button === 2;
    setCell(...cellOf(e, cv), erasing ? 0 : dcol);
  });
  fe.addEventListener("pointermove", (e) => {
    const cv = onGrid(e);
    if (!cv) return;
    const [x, y] = cellOf(e, cv);
    if (stroke) setCell(x, y, erasing ? 0 : dcol); else if (x !== dcx || y !== dcy) { dcx = x; dcy = y; drawGrid(); }
  });
  for (const ev of ["pointerup", "pointercancel"]) fe.addEventListener(ev, () => { stroke = false; strokeSnap = false; });
  // Ficha de bicho: arrastrar sobre el escenario gira el modelo, dos dedos acercan, la rueda también; deslizar el panel cambia de bicho
  const stage = $("bstage"), pts = new Map<number, { x: number; y: number }>();
  let pinch = 0, swipe: { x: number; y: number } | null = null;
  stage.addEventListener("pointerdown", (e) => { stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); pinch = 0; });
  stage.addEventListener("pointermove", (e) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    if (pts.size === 1) { BV.yaw += (e.clientX - p.x) * 0.012; BV.touched = performance.now(); }
    p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 2) { const [a, b] = [...pts.values()], dd = Math.hypot(a.x - b.x, a.y - b.y); if (pinch && dd) zoomBeast(pinch / dd); pinch = dd; }
  });
  for (const ev of ["pointerup", "pointercancel"]) stage.addEventListener(ev, (e) => { pts.delete((e as PointerEvent).pointerId); pinch = 0; });
  stage.addEventListener("wheel", (e) => { e.preventDefault(); zoomBeast(e.deltaY > 0 ? 1.08 : 1 / 1.08); }, { passive: false });
  const panel = $("bpanel");
  panel.addEventListener("pointerdown", (e) => { swipe = e.pointerType === "mouse" ? null : { x: e.clientX, y: e.clientY }; });
  panel.addEventListener("pointerup", (e) => {
    const dx = swipe ? e.clientX - swipe.x : 0, dy = swipe ? e.clientY - swipe.y : 0;
    swipe = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) beastStep(dx < 0 ? 1 : -1);
  });
  fe.addEventListener("contextmenu", (e) => { if (onGrid(e as PointerEvent)) e.preventDefault(); });
  fe.addEventListener("focusin", drawGrid); fe.addEventListener("focusout", () => setTimeout(drawGrid)); // el cursor se ve solo con foco
  fe.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement;
    if (!t.dataset.set || t.type !== "range") return;
    const [o, k] = ref(t.dataset.set);
    o[k] = +t.value;
    (t.nextElementSibling as HTMLElement).textContent = show2(+t.value, t.dataset.u);
    commit();
  });
  fe.addEventListener("change", (e) => {
    const t = e.target as HTMLSelectElement;
    if (t.tagName !== "SELECT" || !t.dataset.set) return;
    const [o, k] = ref(t.dataset.set);
    if (t.selectedOptions[0]?.disabled) { renderConfig(); return focusSel(`select[data-set="${t.dataset.set}"]`); } // opción no disponible: se ignora
    if (k === "preset") { if (t.value in PRESETS) Object.assign(save, PRESETS[t.value as Preset]); } // el preajuste fija de una vez sus cuatro ajustes
    else o[k] = typeof o[k] === "number" ? +t.value : t.value;
    commit();
    renderConfig(); focusSel(`select[data-set="${t.dataset.set}"]`); // otras filas dependen de esta (preajuste, FSR)
  });
  reset("title");
}
