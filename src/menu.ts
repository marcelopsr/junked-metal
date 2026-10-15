// Front-end: título, menú principal, garaje, taller, configuración, bestiario, créditos, pausa y resultados.
// Una sola pila de pantallas dentro de #fe; teclado, gamepad y mouse mueven el mismo foco.
import "./menu.css";
import "./aviso";
import { novedades } from "./novedades";
import type { Scene } from "@babylonjs/core";
import { CARS } from "./car";
import { BAL, costos, precio } from "./balance";
import { BEAST_PORTRAITS, DEF, type Kind } from "./enemies";
import { activePad, btnChip, btnName, editTouch, ctl, keyHit, KEYS, KEYS0, PAD, PAD0, padPressed, pb, RACE, RACE0, type Action, type Binds, type PadAct, type TLays, orient, applyTouchLayouts } from "./input";
import { PAINTS, PARTS, validDecal, type CarKind, type CarOpts, type Slot } from "./models";
import { ARSENAL, PILOTS, PILOT_PORTRAITS, type PilotId } from "./pilots";
import { beastIcon, icon, PERK_ICON, UI_BTN_ICON, uiIcon } from "./icons";
import { applyGfx, G, maxMsaa, PRESETS, presetOf, type AA, type Detail, type Fsr, type Preset, type ShadowQ } from "./render";
import { engineTest, initAudio, setAudio, SFX } from "./sfx";
import { PASSIVES, WEAPONS, type PassiveId, type WeaponId } from "./weapons";
import { setDrawDist, ZONES, type ZoneId } from "./world";
import { camCycle, isTouch, padsConnected } from "./input";
import { bestRace, MEDAL, medalOf, medalTimes, raceCfg, saveRaceCfg, TRACKS, trackName, type RaceCtl } from "./kart_cfg";
import { ACH, type AchId } from "./achievements";
import { ABILITIES, abilCd, abilK, CURSES, type AbilityId, type CurseId } from "./abilities";
import { setModoTranquilo, type Elite } from "./run";
import { CAM_MODES, CAM_NAMES, parseSave } from "./savefmt";
import { PACTS, SECRETS, VARIANTS } from "./encore";
import { leaderboard, salas } from "./net";

import { initBeast, BV, type BeastAnim, beastPad, beastStep, KINDS, openBeast, rankOf, renderBeast, zoomBeast } from "./menu/beast_sheet";
import { initAccount, renderAcct, renderDaily, renderMyStats, renderWeekly } from "./menu/account";
import { LORE, BIOMETRICS } from "./menu/beast_data";
import { initBindings, bindKey, bindPad, binding, bindRow, cancelBind, ctlAct, esc, padTest, padTestHtml, resetBind, toggleBind } from "./menu/bindings";
import { decalHtml, dcol, drawGrid, editing, gridPointers, gridStep, initPaint, paintAtCursor, paintClick, pz, renderPaint, setCol, setEditing, undo } from "./menu/garage_paint";
export { BV, type BeastAnim };

export const $ = (id: string) => document.getElementById(id)!;
export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// ---------- Guardado ----------
export type Profile = { name: string } & Pick<Save, "keys" | "pad" | "race" | "tlay" | "touch">;
export type RunRec = { t: number; kills: number; lv: number; seed: number; win: boolean };
// Totales históricos de carrera (Bestiario → Estadísticas): se suman en endRun (main.ts). Las bajas por tipo viven en save.slain.
// Registro propio de cada bicho (ficha del Bestiario): primera vista (AAAA-MM-DD), daño recibido de ese tipo, daño infligido por arma y zonas
export type BeastRec = { first?: string; hurt: number; by: Record<string, number>; zones: ZoneId[] };
export type Stats = { runs: number; wins: number; time: number; dist: number; dmg: Record<string, number>; zone: Partial<Record<ZoneId, { t: number; kills: number }>> };
export type Save = {
  intro: boolean; // ya se vio la intro del primer arranque
  novedadesVistas: string; // fecha (AAAA-MM-DD) de la última novedad mostrada en el cartel "Qué hay de nuevo" ("" = ninguna)
  scrap: number; best: number; perm: { hp: number; dmg: number; spd: number; mag: number; reroll: number; cards: number; extra: number; revive: number; xp: number; arm: number; reg: number; tur: number; ram: number; cdr: number }; cars: CarKind[]; car: CarKind;
  pilot: PilotId; unlocked: string[]; kit: Record<Slot, string>; paint: string; trim: string; rim: string; finish: string; zoom: number; camMode: (typeof CAM_MODES)[number]; // paint/trim/rim: colores por zona (carrocería, detalles, llantas), "#rrggbb" o "" = el de fábrica; finish: textura PBR
  mute: boolean; vol: { master: number; sfx: number; engine: number; music: number };
  bloom: boolean; lookv: number; shake: boolean; fps: boolean; hudSolid: boolean; hint: boolean;
  // Imagen (render.ts, Gfx): resolución (escala manual o FSR), suavizado, calidad (preset = el que coincide con los cuatro ajustes, o "custom") y pantalla.
  gfxv: number; gpu: "webgl" | "webgpu"; scaler: "simple" | "fsr" | "ia"; scale: number; fsr: Exclude<Fsr, "off">; aa: AA; sharpen: number;
  preset: Preset | "custom"; shadowQ: ShadowQ; detail: Detail; texRes: number; aniso: number;
  fpsCap: number; menuFps: number; fov: number; bright: number; gamma: number; // menuFps: tope de cuadros solo en los menús (0 = el mismo que el juego)
  // Controles (input.ts): teclas [principal, alternativa], joystick, carrera, disposición táctil y 3 perfiles con nombre (null = vacío)
  keys: Record<Action, string[]>; pad: typeof PAD0; race: { kb1: Binds<string>; kb2: Binds<string>; pad: Binds<number> }; tlay: TLays; rumble: boolean; touch: number;
  profiles: (Profile | null)[];
  hud: number; calm: boolean; cb: boolean; dmgNums: boolean; tranquilo: boolean; tutorialHecho: boolean; controlesVistos: boolean;
  decals: string[]; decalSel: number; // calcos del capó: 3 diseños ("" = vacío, si no, DECAL_N² dígitos) y el aplicado (-1 = ninguno)
  stats: Stats;
  seen: Kind[]; slain: Partial<Record<Kind, number>>; beast: Partial<Record<Kind, BeastRec>>; runs: RunRec[]; daily: { day: string; best: number }; zone: ZoneId;
  ach: AchId[];
  ability: AbilityId; curses: CurseId[]; endless: number; // habilidad activa elegida, maldiciones de la próxima partida y récord del modo sin fin (s)
  abilLv: Partial<Record<AbilityId, number>>; weapon: WeaponId; // nivel de cada habilidad (Taller) y arma inicial elegida en el garaje (Arsenal)
  encore: { best: { loop: number; stage: number; t: number }; wins: number; runs: number; lastLoop: number; lastCause: string; secrets: string[]; tips: string[]; seenPacts: string[]; seenVariants: string[] }; // ENCORE: mejor expedición (vuelta, escenario, segundos), ganadas, partidas y la última derrota (vuelta y causa, "" = sin derrota; memoria del Director); aparte de Supervivencia
  m3: { stars: Record<string, number>; best: Record<string, number>; tools: Record<string, number> }; // Junket Crush: estrellas y récord por nivel, herramientas guardadas
};
// Escala de render de fábrica: apunta a ~1080 px de alto en compu y ~720 en táctil (100% = nativa del dispositivo; en pantallas densas sale menos de 100%)
const SCALE0 = Math.min(1, Math.max(0.5, Math.round(((isTouch ? 720 : 1080) / (innerHeight * (devicePixelRatio || 1))) * 20) / 20));
const reduceMotion = typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false);
export const DEFAULT: Save = {
  intro: false, novedadesVistas: "",
  scrap: 2000, best: 0, perm: { hp: 0, dmg: 0, spd: 0, mag: 0, reroll: 0, cards: 0, extra: 0, revive: 0, xp: 0, arm: 0, reg: 0, tur: 0, ram: 0, cdr: 0 }, cars: ["buggy"], car: "buggy",
  pilot: "soldadito", unlocked: [], kit: { wing: "serie", decal: "nada", lamp: "calido", exhaust: "nada", bumper: "nada", tires: "serie", acc: "nada" }, paint: "", trim: "", rim: "", finish: "", zoom: 1.35, camMode: "actual",
  mute: false, vol: { master: 1, sfx: 1, engine: 1, music: 0.7 }, lookv: 6, shake: !reduceMotion, fps: false, hudSolid: false, hint: true,
  gfxv: 2, gpu: "webgl", scaler: "simple", scale: SCALE0, fsr: "calidad", aa: isTouch ? "fxaa" : "none", sharpen: 0, preset: "medio", ...PRESETS.medio, fpsCap: 0, menuFps: isTouch ? 30 : 60, fov: 49, bright: 1, gamma: 1,
  keys: structuredClone(KEYS0), pad: structuredClone(PAD0), race: structuredClone(RACE0), tlay: { v: {}, h: {} }, profiles: [null, null, null], rumble: true, touch: 1, hud: 1,
  calm: reduceMotion, cb: false, dmgNums: true, tranquilo: false, tutorialHecho: false, controlesVistos: false,
  decals: ["", "", ""], decalSel: -1, stats: { runs: 0, wins: 0, time: 0, dist: 0, dmg: {}, zone: {} },
  seen: [], slain: {}, beast: {}, runs: [], daily: { day: "", best: 0 }, zone: "patio", ach: [],
  ability: "bombardeo", curses: [], endless: 0, abilLv: {}, weapon: "gomitas",
  encore: { best: { loop: 0, stage: 0, t: 0 }, wins: 0, runs: 0, lastLoop: 0, lastCause: "", secrets: [], tips: [], seenPacts: [], seenVariants: [] },
  m3: { stars: {}, best: {}, tools: {} },
};
// La validación y migración viven en savefmt.ts (sin DOM, con tests); acá solo se le pasa lo que depende del juego
export const save: Save = parseSave((() => { try { return localStorage.getItem("rcfight2"); } catch { return null; } })(), DEFAULT, { abilities: ABILITIES, weapons: ARSENAL, curses: CURSES, kinds: Object.keys(DEF), zones: ZONES, isTouch, validDecal, presetOf, presets: PRESETS });
// ponytail: por ahora autos y zonas vienen liberados (y pilotos y piezas en owns, 2000 tornillos en DEFAULT); borrar estas líneas cuando vuelvan a comprarse
for (const k of Object.keys(CARS) as CarKind[]) if (!save.cars.includes(k)) save.cars.push(k);
for (const k of Object.keys(ZONES)) if (!save.unlocked.includes("zone:" + k)) save.unlocked.push("zone:" + k);
// Instalación nueva: "Reducir parpadeos" parte activado si el sistema pide menos movimiento (quien ya tiene guardado conserva su elección)
try { if (localStorage.getItem("rcfight2") === null) save.calm = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* sin almacenamiento */ }
// Solo en la Mac del autor (localhost): ?tornillos=N fija los tornillos del guardado y se limpia de la dirección. La versión publicada no lo atiende.
{ const q = new URLSearchParams(location.search), t = Number(q.get("tornillos"));
  if (["localhost", "127.0.0.1"].includes(location.hostname) && Number.isFinite(t) && t >= 0 && q.has("tornillos")) {
    save.scrap = Math.floor(t); try { localStorage.setItem("rcfight2", JSON.stringify(save)); } catch { /* sin almacenamiento */ }
    q.delete("tornillos"); history.replaceState(null, "", location.pathname + (q.size ? "?" + q : "") + location.hash);
  } }
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

// ---------- ENCORE: jugadores (R7a). Dos = pantalla dividida, SOLO en compu: en táctil el selector no aparece y siempre es 1 (como raceCfg.players) ----------
// R7c: 3 y 4 en 2x2; J3 y J4 solo con joystick, así que esas cantidades piden 3 o 4 joysticks conectados (el selector las saltea y lo avisa)
export const encCfg = { players: 1 as 1 | 2 | 3 | 4 };
export const encMax = () => (isTouch ? 1 : Math.max(2, Math.min(4, padsConnected())));
function renderEncP() {
  if (isTouch) encCfg.players = 1;
  if (encCfg.players > encMax()) encCfg.players = encMax() as 2 | 3;
  const n = encCfg.players, m = encMax();
  $("encPlayers").textContent = `Jugadores · ${n}${n > 1 ? " (pantalla dividida)" : ""}${n > 1 && m === 2 ? " · 3 o 4 piden 3 o 4 joysticks" : n > 1 && m === 3 ? " · 4 pide 4 joysticks" : ""}`;
  $("encPlayers").classList.toggle("hidden", isTouch);
}
for (const ev of ["gamepadconnected", "gamepaddisconnected"]) addEventListener(ev, () => renderEncP());

// ---------- Carrera (kart.ts): opciones de la largada ----------
const nextOf = <T,>(a: T[], v: T) => a[(a.indexOf(v) + 1) % a.length];
function cycleRace(k: string) {
  const c = raceCfg;
  if (k === "players") c.players = c.players === 1 ? 2 : 1;
  else if (k === "p1" || k === "p2") { // con dos jugadores no se repite el control del otro
    const o = k === "p1" ? c.p2 : c.p1; let v = c[k];
    do v = nextOf(Object.keys(CTL_NAME) as RaceCtl[], v); while (c.players === 2 && v === o);
    c[k] = v;
  }
  else if (k === "cc") c.cc = nextOf([50, 100, 150] as const, c.cc);
  else if (k === "laps") c.laps = c.laps === 3 ? 5 : 3;
  else if (k === "cup") c.cup = !c.cup;
  else if (k === "track") c.track = ((c.track + 1) % 3) as 0 | 1 | 2;
  else if (k === "car2") { const o = save.cars.length ? save.cars : (["buggy"] as CarKind[]); c.car2 = nextOf(o, o.includes(c.car2) ? c.car2 : o[0]); }
  saveRaceCfg();
}
export const CTL_NAME: Record<RaceCtl, string> = { kbd: "Teclado 1", kbd2: "Teclado 2", pad0: "Joystick 1", pad1: "Joystick 2" };
const k2 = (a: string[]) => a.filter(Boolean).map(keyName).join(" o ") || "—";
const raceKeys = (t: "kb1" | "kb2") => { const r = RACE[t]; return `${t === "kb1" ? "Teclado 1" : "Teclado 2"}: ${[r.up, r.left, r.down, r.right].map((x) => keyName(x[0])).join(" ")} maneja, ${k2(r.drift)} derrapa, ${k2(r.item)} usa el objeto.`; };
function renderRace() {
  if (isTouch) raceCfg.players = 1; // en el teléfono no hay pantalla dividida (una pantalla chica y un solo control táctil)
  const c = raceCfg, ctl = CTL_NAME;
  $("rcPlayers").textContent = `Jugadores · ${c.players}${c.players === 2 ? " (pantalla dividida)" : ""}`;
  $("rcP1").textContent = `Control J1 · ${ctl[c.p1]}`;
  $("rcP2").textContent = `Control J2 · ${ctl[c.p2]}`;
  $("rcCar2").textContent = `Auto J2 · ${CARS[c.car2]?.name ?? c.car2}`;
  for (const id of ["rcP2", "rcCar2"]) $(id).classList.toggle("hidden", c.players === 1);
  $("rcPlayers").classList.toggle("hidden", isTouch);
  $("rcP1").classList.toggle("wide", isTouch);
  $("rcCC").textContent = `Cilindrada · ${c.cc}cc ${c.cc === 50 ? "(fácil)" : c.cc === 100 ? "(medio)" : "(difícil)"}`;
  $("rcLaps").textContent = `Vueltas · ${c.laps}`;
  $("rcCup").textContent = c.cup ? "Modo · Copa de 3 pistas" : "Modo · Carrera suelta";
  $("rcCup").classList.toggle("wide", c.cup);
  $("rcTrack").textContent = `Pista · ${trackName(c.track)}`;
  $("rcTrack").classList.toggle("hidden", c.cup);
  $("rcBrief").innerHTML = TRACKS.map((tk, i) => {
    const zName = tk.zone === "patio" ? "Patio" : tk.zone === "jardin" ? "Jardín" : "Garaje";
    const b = bestRace(i), m = b ? medalOf(i, c.laps, b.cc, b.t) : 0, [g, s, br] = medalTimes(i, c.laps, c.cc);
    return `<div class="carc rcCard ${!c.cup && c.track === i ? "sel" : ""}" data-rctrack="${i}">`
      + `<div class="rcHead"><b>${zName}</b><span class="rmedal m${m}">${m ? MEDAL[m] : "SIN MARCA"}</span><em>${b ? fmt(b.t) : "—"}</em></div>`
      + `<div class="rcGoals"><span class="mg">Oro ${fmt(g)}</span><span class="ms">Plata ${fmt(s)}</span><span class="mb">Bronce ${fmt(br)}</span></div>`
      + `</div>`;
  }).join("");
  const k1 = isTouch ? "Control táctil" : c.p1 === "kbd" ? raceKeys("kb1") : c.p1 === "kbd2" ? raceKeys("kb2") : `${ctl[c.p1]} (${padsConnected()} conectado${padsConnected() === 1 ? "" : "s"})`;
  const k2Txt = c.players === 2 ? ` · J2 (${CARS[c.car2]?.name ?? c.car2}): ${c.p2 === "kbd" ? raceKeys("kb1") : c.p2 === "kbd2" ? raceKeys("kb2") : ctl[c.p2]}` : "";
  $("rcHelp").textContent = `J1 (${CARS[save.car].name}) · ${k1}${k2Txt}`;
}

// ---------- Ajustes ----------
type Api = { scene: Scene; play(daily?: boolean, encore?: boolean): void; weekly(): void; resume(): void; quit(): void; pause(): void; endless(): void; race(): void; battle(): void; duel(): void; match3(): void };
let api: Api;

export function applySettings() {
  const msaa = maxMsaa();
  if (save.aa.startsWith("msaa") && +save.aa.slice(4) > msaa) save.aa = msaa >= 4 ? "msaa4" : msaa >= 2 ? "msaa2" : "fxaa"; // un guardado de otra tarjeta: lo máximo que admite esta
  applyGfx(save);
  setDrawDist(G.draw);
  $("fps").classList.toggle("hidden", !save.fps);
  document.body.classList.toggle("hud-solid", save.hudSolid);
  setAudio({ ...save.vol, mute: save.mute });
  $("muted").classList.toggle("hidden", !save.mute);
  Object.assign(KEYS, save.keys); Object.assign(PAD, save.pad); Object.assign(RACE, save.race); // mismas listas: lo que cambia el menú en save ya rige
  const root = document.documentElement.style;
  root.setProperty("--hud-scale", String(save.hud));
  root.setProperty("--touch-scale", String(save.touch));
  applyTouchLayouts(save.tlay, save.touch);
  document.body.classList.toggle("calm", save.calm);
  document.body.classList.toggle("cb", save.cb);
  setModoTranquilo(!!save.tranquilo);
}
export const commit = () => { save.preset = presetOf(save); persist(); saveRaceCfg(); applySettings(); };
/** Vuelve las opciones (imagen, audio, controles, accesibilidad) a los valores de fábrica; el progreso no se toca. */
function resetCfg() {
  const D = structuredClone(DEFAULT);
  Object.assign(save, { gpu: D.gpu, scaler: D.scaler, scale: D.scale, fsr: D.fsr, aa: D.aa, sharpen: D.sharpen, preset: D.preset, shadowQ: D.shadowQ, detail: D.detail, texRes: D.texRes, aniso: D.aniso, fpsCap: D.fpsCap, menuFps: D.menuFps, fov: D.fov, bright: D.bright, gamma: D.gamma, bloom: D.bloom, fps: D.fps, hudSolid: D.hudSolid, hint: D.hint, zoom: D.zoom, camMode: D.camMode, shake: D.shake, vol: D.vol, hud: D.hud, calm: D.calm, cb: D.cb, dmgNums: D.dmgNums, pad: D.pad, rumble: D.rumble, touch: D.touch, mute: D.mute, keys: D.keys, race: D.race, tlay: D.tlay });
  commit();
}

// ---------- Pila de pantallas ----------
/** T34: lista de salas en curso con botón Mirar; Mirar emite el evento "mirar" (detail = código) y main.ts conecta con espectar(). */
$("netWatch").onclick = async () => {
  const ol = $("netSalas"), rows = await salas();
  ol.classList.remove("hidden");
  ol.replaceChildren(...(rows ?? []).map((r) => { const li = document.createElement("li"), b = document.createElement("button"); li.append(`${r.host} · ${fmt(r.seg)} · ${r.espectadores} mirando `); b.textContent = "Mirar"; b.onclick = () => dispatchEvent(new CustomEvent("mirar", { detail: r.code })); li.append(b); return li; }));
  if (!rows?.length) { const li = document.createElement("li"); li.textContent = rows ? "No hay partidas en curso." : "Sin sesión o sin conexión."; ol.append(li); }
};
/** Codex de ENCORE: lo descubierto con su texto; lo pendiente, "???". Todo con textContent. */
function renderCodex() {
  const e = save.encore, fill = (id: string, rows: [string, string][]) => $(id).replaceChildren(...rows.map(([a, b]) => { const li = document.createElement("li"), t = document.createElement("b"); t.textContent = a; if (a.startsWith("???")) { t.setAttribute("role", "img"); t.setAttribute("aria-label", a === "???" ? "Sin descubrir" : `${a.slice(4)} sin descubrir`); } li.append(t, b ? ` · ${b}` : ""); return li; }));
  const NM: Record<string, string> = { dmg: "daño", speed: "velocidad", maxHp: "vida máx.", xp: "XP", scrap: "tornillos", spawn: "enemigos", taken: "daño recibido", regen: "regeneración", heal: "reparación" };
  const fx = (g: object) => Object.entries(g).map(([k, v]) => `${NM[k] ?? k} x${v}`).join(", ");
  const miss = (n: number): [string, string][] => n ? [[`??? x${n}`, "sin descubrir"]] : []; // lo pendiente va en una sola línea con contador
  const sec = SECRETS.filter((x) => e.secrets.includes(x.id)), pa = PACTS.filter((p) => e.seenPacts.includes(p.id)), va = VARIANTS.filter((v) => e.seenVariants.includes(v.name));
  $("cdxCount").textContent = `Secretos ${sec.length}/${SECRETS.length} · Pactos ${pa.length}/${PACTS.length} · Destinos ${va.length}/${VARIANTS.length}`;
  fill("cdxSec", SECRETS.map((x) => e.secrets.includes(x.id) ? [x.name, x.lore] : ["???", x.how]));
  fill("cdxPact", [...pa.map((p): [string, string] => [p.name, `ganancia ${fx(p.gain)} / costo ${fx(p.cost)}`]), ...miss(PACTS.length - pa.length)]);
  fill("cdxVar", [...va.map((v): [string, string] => [v.name, v.line]), ...miss(VARIANTS.length - va.length)]);
}
initAccount({ $, fmt, today: () => today(), dailySeed: () => dailySeed(), go: (s) => go(s), current: () => current(), back: () => back(), kitStripHtml: () => kitStripHtml(), daily: () => save.daily });
export type Scr = "title" | "main" | "garage" | "shop" | "config" | "bestiary" | "beast" | "credits" | "daily" | "pause" | "over" | "race" | "duel" | "match3" | "play" | "modes" | "encore" | "codex" | "cuenta" | "weekly";
const stack: Scr[] = [];
const ret = new Map<Scr, HTMLElement>(); // foco a recuperar al volver
export const current = () => stack.at(-1) ?? null;

let shownAt = 0;
function show() {
  resetBind(); // una reasignación a medias no sobrevive al cambio de pantalla
  shownAt = performance.now();
  const s = current();
  $("fe").classList.toggle("hidden", !s);
  $("fe").classList.toggle("ingame", stack[0] === "pause" || stack[0] === "over"); // en partida: velo oscuro también en Configuración
  if (s) $("scrAnnounce").textContent = document.querySelector(`#scr-${s} [role=heading]`)?.textContent ?? "";
  const hud = document.getElementById("hud"); if (hud) hud.inert = !!s; // con menú abierto el HUD no recibe Tab
  if (!s) return;
  for (const el of document.querySelectorAll<HTMLElement>(".scr")) el.classList.toggle("on", el.id === "scr-" + s);
  if (s === "title") $("titleGo").classList.toggle("hidden", !save.encore.runs); // «Seguir» solo para quien ya largó una expedición
  if (s === "garage") renderGarage();
  if (s === "shop") renderShop();
  if (s === "main") renderMain();
  if (s === "play") renderPlay();
  if (s === "encore") { renderEncP(); carLbl(); const e = save.encore; $("encRec").textContent = e.runs ? `Mejor expedición: vuelta ${e.best.loop + 1}, escenario ${e.best.stage + 1} · ${fmt(e.best.t)} · ${e.wins} ${e.wins === 1 ? "ganada" : "ganadas"} de ${e.runs}` : "Sin expediciones registradas todavía."; $("encSec").innerHTML = SECRETS.filter((x) => e.secrets.includes(x.id)).map((x) => `<li><b>${x.name}</b> · ${x.lore}</li>`).join("") || `<li>Secretos del Director: ${SECRETS.length} sin descubrir.</li>`; } // Contenido 3: secretos descubiertos (textos propios, sin HTML del guardado)
  if (s === "codex") { renderCodex(); renderMyStats(); }
  if (s === "cuenta") renderAcct();
  if (s === "encore") void leaderboard().then((rows) => { const box = $("encLb"), ol = $("encLbList"); box.classList.toggle("hidden", !rows?.length); ol.replaceChildren(...(rows ?? []).slice(0, 10).map((r) => { const li = document.createElement("li"); li.textContent = `${r.name} · vuelta ${r.loop + 1}, escenario ${r.stage + 1} · ${fmt(r.t)}`; return li; })); });
  if (s === "daily") renderDaily();
  if (s === "weekly") renderWeekly();
  if (s === "modes" || s === "match3") refreshModes();
  if (s === "race") renderRace();
  if (s === "bestiary") { renderBestiary(); if (!ret.get("bestiary")) $("beasts").scrollTop = 0; }
  if (s === "beast") renderBeast();
  if (s === "config") renderConfig();
  // Cambio de canal: estática breve + encendido de tubo (keyframes tune de style.css)
  const fe = $("fe");
  fe.classList.remove("zap"); void fe.offsetWidth; fe.classList.add("zap");
  SFX.static();
  const f = ret.get(s);
  (f && f.isConnected && f.offsetParent ? f : (s === "encore" ? document.querySelector<HTMLElement>('#scr-encore [data-act="encorego"]') : null) ?? focusables()[0])?.focus({ preventScroll: false }); // ENCORE: Largar primero aunque "Cómo se juega" (summary) esté antes en el orden
}
export function go(s: Scr) {
  peek.car = peek.pilot = peek.part = peek.paint = peek.finish = undefined; // la vista previa no sale del garaje
  const top = current();
  if (top && document.activeElement instanceof HTMLElement) ret.set(top, document.activeElement);
  ret.delete(s);
  stack.push(s);
  show();
}
// Confirmación de compra: toda compra (taller, garaje, arsenal, habilidades, chasis) pasa por acá antes de gastar tornillos
let askFn: (() => void) | null = null, askBack: HTMLElement | null = null, askEl = "ask"; // askEl: #ask (compra) o #ctlg (guía de controles); mismos botones askyes/askno
function askOpen(id: string, then: () => void) {
  askEl = id; askFn = then; askBack = document.activeElement as HTMLElement;
  $(id).classList.remove("hidden");
  askInert(true);
  ($(id).querySelector('[data-act="askyes"]') as HTMLElement).focus();
}
function askBuy(name: string, cost: number, then: () => void) {
  if (save.scrap < cost) return; // no alcanza: no hay nada que confirmar
  $("askD").textContent = `¿Comprar ${name} por ${cost} tornillos? Después de la compra quedan ${save.scrap - cost}.`;
  askOpen("ask", then);
}
function askClose() {
  $(askEl).classList.add("hidden"); askFn = null; askInert(false); askBack?.focus();
  if (askEl === "ctlg" && !save.controlesVistos) { save.controlesVistos = true; persist(); } // cerrarla de cualquier modo (Entendido, Esc, B) cuenta como vista
}
/** Guía de controles (T24): una tarjeta con lo del dispositivo en uso. Sale sola antes de la primera partida y se repite desde Configuración → Controles. */
export function controlsGuide(then: () => void = () => {}, mini = false) {
  const k = (a: Action) => `<kbd>${esc(keyName(KEYS[a][0]))}</kbd>`, p = (a: PadAct) => btnChip(pb(a));
  const rows: [string, string][] = ctl === "pad" ? [
    ...(PAD.mode === "stick" ? [["Mover", `Stick ${PAD.stick === "left" ? "izquierdo" : "derecho"}, hacia donde ir`]] : [["Acelerar", p("accel")], ["Frenar", p("brake")], ["Girar", `Stick ${PAD.stick === "left" ? "izquierdo" : "derecho"}`]]) as [string, string][],
    ["Turbo", p("boost")], ["Derrape", p("drift")], ["Salto", p("jump")], ["Habilidad", p("ability")], ["Pausa", p("pause")],
  ] : ctl === "touch" ? [
    ["Mover", "Stick de la pantalla"], ["Turbo, derrape, salto y habilidad", "Botones de la pantalla"], ["Pausa", "Botón II"],
  ] : [
    ["Mover", k("up") + k("left") + k("down") + k("right")], ["Turbo", k("boost")], ["Derrape", k("drift")], ["Salto", k("jump")], ["Habilidad", k("ability")], ["Pausa", k("pause")],
  ];
  // mini (primera vez): solo lo de mover (táctil: más los botones) y que las armas disparan solas
  const mov = ctl === "touch" ? 2 : ctl === "pad" && PAD.mode !== "stick" ? 3 : 1;
  $("ctlgB").innerHTML = (mini ? rows.slice(0, mov) : rows).map(([a, b]) => `<div class="kv"><span>${a}</span><b>${b}</b></div>`).join("")
    + (mini ? `<p class="note">Las armas disparan solas. El resto de los controles está en Configuración.</p>`
      : `<p class="note">Las armas disparan solas: al auto le toca moverse, juntar tuercas y esquivar. Esta guía queda en Configuración, pestaña Controles.</p>`);
  askOpen("ctlg", then);
}
/** Con el modal abierto lo de atrás no recibe foco ni Tab (inert) y el lector lo trata como diálogo. */
function askInert(on: boolean) { for (const el of document.querySelectorAll<HTMLElement>("#fe > .scr")) el.inert = on; }

let m3ConfigReturn = false;
/** Configuración global mientras el arcade match-3 sigue en pausa (sin duplicar opciones). */
export function openM3Config() {
  m3ConfigReturn = true;
  stack.length = 0;
  stack.push("config");
  $("fe").classList.add("ingame");
  show();
}

function back() {
  if (askFn) return askClose(); // Esc / B cierran la confirmación sin comprar
  const s = current();
  if (s === "config" && m3ConfigReturn) {
    m3ConfigReturn = false;
    stack.pop();
    show();
    document.getElementById("m3-resume")?.focus({ preventScroll: true });
    return;
  }
  if (!s || s === "title" || s === "main") return;
  SFX.back();
  if (s === "pause") return api.resume();
  if (s === "over") return api.quit();
  if (s === "garage" && editing) { setEditing(false); renderGarage(); return focusSel('[data-dact="edit"]'); } // Esc / B: sale del editor, no del garaje
  peek.paint = peek.finish = undefined;
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
export const focusables = () => {
  const root = askFn ? "#" + askEl : `#scr-${current()}`;
  return [...document.querySelectorAll<HTMLElement>(`${root} :is(button:not(:disabled), select:not(:disabled), input:not(:disabled), summary, [tabindex])`)].filter((e) => e.offsetParent);
};
const SCROLL = "#cars, #shop, #opts, #binfo, #beasts"; // listas con scroll propio
function move(dx: number, dy: number) {
  const cur = document.activeElement as HTMLElement, els = focusables();
  if (!els.includes(cur)) return els[0]?.focus();
  // Grilla del editor de calcos: el cursor recorre las celdas; en el borde el foco sigue de largo
  if (cur.id === "dgrid" && gridStep(dx, dy)) return SFX.blip();
  // Perillas: izquierda/derecha cambian el valor en vez de mover el foco
  if (dx && cur instanceof HTMLInputElement && cur.type === "range") { dx > 0 ? cur.stepUp() : cur.stepDown(); cur.dispatchEvent(new Event("input", { bubbles: true })); if (cur.dataset.hsv) cur.dispatchEvent(new Event("change", { bubbles: true })); return SFX.blip(); }
  if (dx && cur instanceof HTMLSelectElement) { let i = cur.selectedIndex, n = cur.length; do i = (i + dx + cur.length) % cur.length; while (cur.options[i].disabled && n-- > 0); cur.selectedIndex = i; cur.dispatchEvent(new Event("change", { bubbles: true })); return SFX.blip(); }
  // Posición de layout (sin transformaciones: el encendido de tubo aplasta la pantalla al entrar). En Configuración cuenta la fila entera.
  const box = (e: HTMLElement) => {
    const r = (e.closest(".row:not(.multi)") ?? e) as HTMLElement; // filas con varios botones (teclas, perfiles): cuenta cada botón
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
addEventListener("pointerdown", () => initAudio());
addEventListener("keydown", (e) => {
  initAudio();
  if (bindKey(e)) return; // reasignando una tecla o un botón
  if (document.body.classList.contains("tedit")) { if (e.code === "Escape" || e.code === "Enter") { e.preventDefault(); tedit(false); } return; }
  if (askFn && e.code === "Tab") { // diálogo abierto: Tab da la vuelta dentro de él (afuera de #fe quedan el chat rápido y otros botones sueltos)
    e.preventDefault(); const f = focusables(); f[(f.indexOf(document.activeElement as HTMLElement) + (e.shiftKey ? f.length - 1 : 1)) % f.length]?.focus(); return;
  }
  const txt = e.target instanceof HTMLInputElement && /^(text|password|search|number)$/.test(e.target.type); // nombre de perfil o clave: se escribe; solo flechas arriba/abajo y Esc salen
  if (txt && !/^(ArrowUp|ArrowDown|Escape|Enter)$/.test(e.code)) return;
  if (txt && e.code === "Enter") { e.preventDefault(); return move(0, 1); }
  if (keyHit("mute", e.code)) { save.mute = !save.mute; return commit(); }
  const s = current();
  if (!s) { if (keyHit("pause", e.code)) api.pause(); return; }
  if (s === "title") { if (document.activeElement?.id === "titleGo" && /^(Enter|Space|NumpadEnter)$/.test(e.code)) return; /* el clic nativo del botón largar */ if (!e.repeat && !/^(Shift|Control|Alt|Meta)/.test(e.code)) { e.preventDefault(); SFX.accept(); go("main"); } return; }
  if (s === "garage" && editing && (e.ctrlKey || e.metaKey) && e.code === "KeyZ") { e.preventDefault(); return undo(); }
  if (s === "garage" && document.activeElement?.id === "dgrid" && /^Digit[0-8]$/.test(e.code)) { e.preventDefault(); return setCol(+e.code[5]); }
  if (s === "beast" && /^(KeyQ|KeyE|PageUp|PageDown)$/.test(e.code)) { e.preventDefault(); return beastStep(e.code === "KeyE" || e.code === "PageDown" ? 1 : -1); } // ficha: bicho anterior / siguiente
  const dir: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  if (dir[e.code]) { e.preventDefault(); move(...dir[e.code]); }
  else if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); if (!e.repeat) activate(); }
  else if (e.code === "Escape" || e.code === "Backspace" || (keyHit("pause", e.code) && s === "pause")) { e.preventDefault(); back(); }
});

// ---------- Gamepad (llamar cada frame mientras haya menú) ----------
let padRep = 0, padDir = "";
export function menuPad(dt: number) {
  const s = current();
  if (!s) return;
  if (s === "config") padTest();
  if (bindPad()) return; // esperando un botón: el resto del menú no escucha
  if (document.body.classList.contains("tedit")) { if (padPressed(pb("back")) || padPressed(pb("ok"))) tedit(false); return; }
  const btn = [pb("ok"), pb("back"), pb("pause"), 12, 13, 14, 15].map((i) => padPressed(i)); // aceptar, volver, pausa, cruceta
  if (s === "title") { if (btn[0] && document.activeElement?.id === "titleGo") { if (performance.now() - shownAt > 400) $("titleGo").click(); return; } if (btn.some(Boolean)) { initAudio(); SFX.accept(); go("main"); } return; }
  if (btn[0]) activate();
  if (btn[1]) back();
  if (btn[2] && s === "pause") back();
  if (s === "beast") beastPad(dt);
  if (s === "garage" && document.activeElement?.id === "dgrid") { if (padPressed(4)) setCol((dcol + 8) % 9); if (padPressed(5)) setCol((dcol + 1) % 9); } // LB / RB: color
  if (s === "garage" && editing && padPressed(2)) undo(); // X: deshacer
  const gp = activePad();
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
  $("dailyRec").textContent = b ? fmt(b) : ""; // el texto va en <span>/<small>: tocar el botón entero borraría su ícono
  if (save.endless) $("mainInfo").textContent += ` · sin fin +${fmt(save.endless)}`;
  const nuevo = !save.encore.runs; // hasta terminar la primera expedición, Jugar es lo único que compite en el menú
  for (const id of ["dailyBtn", "weeklyBtn"]) $(id).classList.toggle("hidden", nuevo);
  document.querySelector<HTMLElement>('#scr-main [data-go="modes"]')!.classList.toggle("hidden", nuevo);
}

// Supervivencia y Desafío diario: ficha de largada con el equipo actual, récord de zona y condiciones de la semilla del día
function kitStripHtml() {
  const own = PILOTS[save.pilot].start, w = startPick() === "gomitas" ? own : startPick(), ab = save.ability;
  return `<div class="briefKit">`
    + `<div><span>Auto</span><b>${CARS[save.car].name}</b></div>`
    + `<div><span>Piloto</span><b>${PILOTS[save.pilot].name}</b></div>`
    + `<div><span>Arma inicial</span><b class="wi">${icon(w, 16)}${WEAPONS[w].name}</b></div>`
    + `<div><span>Habilidad</span><b class="wi">${icon(ABIL_ICON[ab], 16)}${ABILITIES[ab].name}</b></div>`
    + `</div>`;
}
const carLbl = () => document.querySelectorAll('[data-act="pcar"] .bt').forEach((e) => { e.textContent = `Auto · ${CARS[save.car].name}`; });
function renderPlay() {
  if (!owns("zone:" + save.zone)) save.zone = "patio"; // guardado importado con una zona sin comprar
  const z = ZONES[save.zone], zr = save.stats.zone[save.zone];
  $("zoneBtn").querySelector(".bt")!.textContent = `Zona · ${z.name}`;
  $("zoneDesc").textContent = z.desc;
  carLbl();
  const zRow = `<div class="zoneRow">${(Object.keys(ZONES) as ZoneId[]).map((zid) => {
    const r = save.stats.zone[zid], own = owns("zone:" + zid), win = !!r && r.t >= 600;
    return `<span class="zchip ${zid === save.zone ? "on" : ""} ${win ? "win" : ""}"><b>${ZONES[zid].short}</b><em>${!own ? "Bloq." : r ? `${fmt(r.t)}${win ? " ★" : ""}` : "—"}</em></span>`;
  }).join("")}</div>`;
  $("playRec").innerHTML = `<div class="${zr && zr.t >= 600 ? "win-rec" : ""}">${zr ? `Mejor marca en ${z.short}: ${fmt(zr.t)} · ${zr.kills} ${zr.kills === 1 ? "baja" : "bajas"}${zr.t >= 600 ? " · ★ ZONA CONQUISTADA" : ""}` : `Sin marcas registradas en ${z.short} todavía.`}</div>${zRow}`;
  $("playKit").innerHTML = kitStripHtml();
  $("curseBtn").textContent = curseTxt();
}
function refreshModes() {
  const rb = (save as { raceBest?: Record<string, number> }).raceBest ?? {};
  let rDone = 0, rMeds = 0;
  TRACKS.forEach((tk, i) => {
    const b = bestRace(i), t = b?.t ?? rb[tk.zone] ?? rb[String(i)];
    if (typeof t === "number" && t > 0) {
      rDone++;
      if (medalOf(i, raceCfg.laps, b?.cc ?? raceCfg.cc, t) > 0) rMeds++;
    }
  });
  $("progRace").textContent = rDone ? `Pistas completadas: ${rDone} / ${TRACKS.length} · Medallas: ${rMeds} / ${TRACKS.length}` : "Copa de 3 circuitos · Sin tiempos registrados";
  let m3Unl = 1, m3Stars = 0;
  try {
    const raw = JSON.parse(localStorage.getItem("rc_match3_v1") || "null");
    const stObj: Record<string, number> = raw && typeof raw.stars === "object" && raw.stars ? raw.stars : save.m3.stars;
    const vals = Object.values(stObj).filter((v): v is number => typeof v === "number" && v > 0);
    m3Stars = Math.min(30, vals.reduce((a, b) => a + b, 0));
    m3Unl = typeof raw?.unlocked === "number" ? Math.max(1, Math.min(10, Math.floor(raw.unlocked))) : Math.min(10, 1 + vals.length);
  } catch { /* sin storage */ }
  $("progM3").textContent = `Campaña: Nivel ${m3Unl} / 10 · Estrellas: ${m3Stars} / 30`;
  $("m3Brief").innerHTML = `<div class="briefGrid">`
    + `<div><span>Campaña</span><b>Nivel ${m3Unl} / 10</b></div>`
    + `<div><span>Estrellas</span><b>${m3Stars} / 30</b></div>`
    + `</div>`
    + `<div class="briefRec">${m3Stars > 0 ? `Progreso en La Ruta del Desguace: nivel ${m3Unl} habilitado.` : "Diez niveles de clasificación de chatarra · Sin marcas registradas todavía."}</div>`;
}

// ---------- Taller y garaje ----------
// Mejoras permanentes: el precio de cada nivel está en `cost` (su largo es el máximo). Equipo: cambian cómo se juega cada partida.
// Curva (partida típica ≈ 100 tornillos): chasis 1-5 de 20 a 100 (una mejora por partida al empezar), 6-10 de 180 a 660
// (una línea completa ≈ 23 partidas); autos, pilotos y zonas 400-1000 (4-10 partidas); revivir 2 y cuarta ranura 1800-2200 (20+).
type PermK = keyof Save["perm"];
// Los precios por nivel están en balance.json (tabla precios; el chasis sigue 20 x nivel y después x1,5 con +0,45 por nivel, redondeado a 5).
// fx = [qué cambia, valor con l niveles comprados]: la vista previa del Taller muestra el nivel actual → el siguiente.
const T = BAL.precios, n1 = (x: number) => String(Math.round(x * 10) / 10).replace(".", ",");
const pct = (k: PermK) => (l: number) => `${Math.round((1 + T[k].efecto * l) * 100)}%`;
const PERKS: { k: PermK; cat: "chasis" | "equipo"; name: string; desc: string; cost: number[]; fx: [string, (l: number) => string] }[] = [
  { k: "hp", cat: "chasis", name: "Chasis reforzado", desc: "+10 vida", cost: costos("hp"), fx: ["Vida", (l) => `${CARS[save.car].hp + T.hp.efecto * l}`] },
  { k: "dmg", cat: "chasis", name: "Piñón afilado", desc: "+10% daño", cost: costos("dmg"), fx: ["Daño", pct("dmg")] },
  { k: "spd", cat: "chasis", name: "Motor rebobinado", desc: "+4% velocidad", cost: costos("spd"), fx: ["Velocidad", pct("spd")] },
  { k: "mag", cat: "chasis", name: "Imán de parlante", desc: "+10% imán", cost: costos("mag"), fx: ["Imán", pct("mag")] },
  { k: "arm", cat: "chasis", name: "Placa de lata", desc: "-2% daño recibido. Abollada pero digna", cost: costos("arm"), fx: ["Daño recibido", (l) => `${Math.round(Math.pow(1 - T.arm.efecto, l) * 100)}%`] },
  { k: "reg", cat: "chasis", name: "Cinta aisladora", desc: "+0,1 vida por segundo. Lo arregla todo, mal", cost: costos("reg"), fx: ["Regeneración", (l) => `${n1(T.reg.efecto * l)} vida/s`] },
  { k: "tur", cat: "chasis", name: "Nafta de encendedor", desc: "+6% turbo: dura más y se recarga antes", cost: costos("tur"), fx: ["Turbo", pct("tur")] },
  { k: "ram", cat: "chasis", name: "Paragolpes de fierro", desc: "+8% daño al embestir. Seguro no cubre", cost: costos("ram"), fx: ["Embestida", pct("ram")] },
  { k: "cdr", cat: "chasis", name: "Gatillo engrasado", desc: "-2% tiempo de recarga de todas las armas", cost: costos("cdr"), fx: ["Tiempo de recarga", (l) => `${Math.round(Math.pow(1 - T.cdr.efecto, l) * 100)}%`] },
  { k: "xp", cat: "equipo", name: "Contador de tuercas", desc: "+5% XP por nivel", cost: costos("xp"), fx: ["XP", pct("xp")] },
  { k: "reroll", cat: "equipo", name: "Dado cargado", desc: "+1 re-sorteo de cartas por partida (R o botón Y)", cost: costos("reroll"), fx: ["Re-sorteos", (l) => `${l}`] },
  { k: "extra", cat: "equipo", name: "Caja de repuestos", desc: "Arranca con un arma extra al azar, además de la elegida", cost: costos("extra"), fx: ["Armas extra", (l) => `${l}`] },
  { k: "revive", cat: "equipo", name: "Batería de reserva", desc: "Revive una vez por partida con media vida", cost: costos("revive"), fx: ["Revividas", (l) => `${l}`] },
  { k: "cards", cat: "equipo", name: "Cuarta ranura", desc: "+1 opción en cada mejora y cofre", cost: costos("cards"), fx: ["Opciones por carta", (l) => `${3 + l}`] },
];
// Íconos: también los usará la mesa de taller 3D para mostrar cada mejora como pieza (id = clave de perm, hab:<habilidad>, arma:<arma>)
export const ABIL_ICON: Record<AbilityId, string> = { bombardeo: "petardos", escudo: "heal", emp: "tesla", lenta: "reloj", turbo: "turbo" };
const abilCost = (k: AbilityId) => costos("hab_" + k);
const opts = (sl: Slot) => PARTS[sl].opts as Record<string, readonly [string, number]>;
// Desbloqueables: car:<auto>, pilot:<piloto>, part:<ranura>:<opción>. Los pilotos con logro no se compran.
type Unlock = { id: string; name: string; desc: string; cost: number; ach?: string; icon?: string; fx?: string; slot?: string };
const UNLOCKS = {
  autos: () => (Object.keys(CARS) as CarKind[]).filter((k) => CARS[k].cost).map((k): Unlock => ({ id: "car:" + k, name: CARS[k].name, desc: CARS[k].desc, cost: CARS[k].cost, fx: `Carrocería ${CARS[k].hp} · Velocidad ${Math.round(CARS[k].speed * 3.6)} km/h · Embestida ×${n1(CARS[k].ram)}` })),
  pilotos: () => (Object.keys(PILOTS) as PilotId[]).filter((k) => PILOTS[k].cost || PILOTS[k].ach).map((k): Unlock => {
    const p = PILOTS[k];
    return { id: "pilot:" + k, name: p.name, desc: `${p.pros.join(" · ")} · Contra: ${p.con}`, cost: p.cost, ach: p.ach?.txt };
  }),
  zonas: () => (Object.keys(ZONES) as ZoneId[]).filter((k) => ZONES[k].cost).map((k): Unlock => ({ id: "zone:" + k, name: ZONES[k].name, desc: ZONES[k].desc, cost: ZONES[k].cost })),
  arsenal: () => ARSENAL.filter((k) => k !== "gomitas").map((k): Unlock => ({ id: "arma:" + k, name: WEAPONS[k].name, desc: WEAPONS[k].desc, cost: precio("arma_" + k), icon: k, fx: `Evoluciona con ${PASSIVES[WEAPONS[k].evo].name} → ${WEAPONS[k].evoName}` })),
  piezas: () => (Object.keys(PARTS) as Slot[]).flatMap((sl) => Object.entries(opts(sl)).filter(([, [, c]]) => c).map(([o, [n, c]]): Unlock => ({ id: `part:${sl}:${o}`, name: n, desc: PARTS[sl].name, cost: c, slot: sl }))),
};
function owns(id: string) {
  const [t, k, o] = id.split(":");
  if (t === "car") return save.cars.includes(k as CarKind);
  if (t === "zone") return k in ZONES && (!ZONES[k as ZoneId].cost || save.unlocked.includes(id));
  if (t === "pilot") return k in PILOTS; // ponytail: pilotos liberados para la prueba con amigos; antes: logro o compra
  if (t === "arma") return k === "gomitas" || save.unlocked.includes(id);
  if (t === "paint") return true;
  return o in (opts(k as Slot) ?? {}); // ponytail: piezas liberadas para la prueba con amigos; antes: gratis o compradas
}
const ownedZones = () => (Object.keys(ZONES) as ZoneId[]).filter((k) => owns("zone:" + k));
function priceOf(id: string) {
  const [t, k, o] = id.split(":");
  if (t === "car") return CARS[k as CarKind]?.cost;
  if (t === "zone") return ZONES[k as ZoneId]?.cost;
  if (t === "pilot") { const p = PILOTS[k as PilotId]; return p && !p.ach ? p.cost : undefined; }
  if (t === "arma") return ARSENAL.includes(k as WeaponId) && k !== "gomitas" ? precio("arma_" + k) : undefined;
  return opts(k as Slot)?.[o]?.[1];
}
// ¿Alcanzan los tornillos para algo del Taller? (mejoras, autos, pilotos, piezas o zonas)
const canBuy = () => PERKS.some((p) => (p.cost[save.perm[p.k]] ?? Infinity) <= save.scrap)
  || (Object.keys(ABILITIES) as AbilityId[]).some((k) => (abilCost(k)[save.abilLv[k] ?? 0] ?? Infinity) <= save.scrap)
  || Object.values(UNLOCKS).some((f) => f().some((u) => !u.ach && !owns(u.id) && u.cost <= save.scrap));
function buy(id: string) {
  const c = priceOf(id);
  if (owns(id) || c === undefined || save.scrap < c) return false;
  save.scrap -= c;
  if (id.startsWith("car:")) save.cars.push(id.slice(4) as CarKind); else save.unlocked.push(id);
  persist();
  return true;
}
/** Arma inicial de la partida: la elegida en el garaje si está comprada (si no, Gomitas). Ver startWeapons (pilots.ts). */
export const startPick = (): WeaponId => (owns("arma:" + save.weapon) ? save.weapon : "gomitas");
/** Lo que hay que mostrar sobre el auto (garaje, portada y partida). */
// Vista previa en el garaje: con el foco (mouse, teclado o control) sobre algo bloqueado o muestra de pintura, el modelo lo muestra
export type PeekPart = [Slot, string] | { slot: Slot; opt: string };
export const peek: { car?: CarKind; pilot?: PilotId; part?: PeekPart; paint?: string; finish?: string } = {};
export const shownCar = (): CarKind => peek.car ?? save.car;
export const carOpts = (): CarOpts => ({
  paint: (pz === "paint" && peek.paint !== undefined ? peek.paint : save.paint) || undefined,
  trim: (pz === "trim" && peek.paint !== undefined ? peek.paint : save.trim) || undefined,
  rim: (pz === "rim" && peek.paint !== undefined ? peek.paint : save.rim) || undefined,
  finish: (pz === "paint" && peek.finish !== undefined ? peek.finish : save.finish) || undefined,
  ...save.kit,
  ...(peek.part ? (Array.isArray(peek.part) ? { [peek.part[0]]: peek.part[1] } : { [peek.part.slot]: peek.part.opt }) : {}),
  pilot: peek.pilot ?? save.pilot,
  sticker: save.decals[save.decalSel] || undefined,
});
addEventListener("focusin", (e) => {
  const inf = (e.target as HTMLElement).closest?.("#shop [data-info]") as HTMLElement | null; // vista previa del Taller: antes → después y partidas que faltan
  if (inf) $("sinfo").textContent = inf.dataset.info!;
  const sw = (e.target as HTMLElement).closest?.("#paint [data-sw]") as HTMLElement | null;
  if (!sw) peek.paint = undefined;
  const shopPart = (e.target as HTMLElement).closest?.('#shop [data-buy^="part:"]') as HTMLElement | null;
  const el = (e.target as HTMLElement).closest?.(".locked[data-k],.locked[data-pilot],.locked[data-part]") as HTMLElement | null;
  peek.car = peek.pilot = undefined;
  if (shopPart && current() === "shop") {
    const [, sl, o] = (shopPart.dataset.buy ?? "").split(":") as [string, Slot, string];
    if (sl && o) peek.part = Object.assign([sl, o] as [Slot, string], { slot: sl, opt: o });
    return;
  }
  if (!el || current() !== "garage") {
    if (!shopPart) peek.part = undefined;
    return;
  }
  peek.part = undefined;
  const d = el.dataset;
  if (d.k) peek.car = d.k as CarKind; else if (d.pilot) peek.pilot = d.pilot as PilotId; else if (d.part) peek.part = d.part.split(":") as [Slot, string];
});

export const bar = (v: number, max: number) => `<span class="stb"><i style="width:${Math.min(100, (v / max) * 100)}%"></i></span>`;
export const tabsHtml = (all: Record<string, string>, on: string, attr: string) => Object.entries(all).map(([id, n]) => `<button class="tab ${id === on ? "on" : ""}" role="tab" aria-selected="${id === on}" data-${attr}="${id}">${n}</button>`).join("");
const STABS = { chasis: "Chasis", equipo: "Equipo de partida", habilidades: "Habilidades", arsenal: "Arsenal", autos: "Autos", pilotos: "Pilotos", piezas: "Piezas", zonas: "Zonas" };
let stab: keyof typeof STABS = "chasis";
// Filtro y orden del Taller (valen para todas las pestañas)
const SFILT = { todo: "Todo", comprables: "Comprables ahora", bloqueadas: "Bloqueadas", compradas: "Compradas" };
const SSORT = ["Orden de fábrica", "Precio: menor primero", "Precio: mayor primero"];
let sfilt: keyof typeof SFILT = "todo", ssort = 0;
// Fila del Taller: attr = cómo la reconoce el clic; cost = precio de lo siguiente (undefined si está completa); fx = vista previa antes → después
type ShopItem = { attr: string; name: string; desc: string; ico?: string; lv?: number; max?: number; cost?: number; ach?: string; bought: boolean; fx?: string; slot?: string };
// Texto de costo: si ya se puede comprar, o cuántos tornillos faltan y unas cuántas partidas son (estimado)
const tipicas = (c: number) => { const f = c - save.scrap, n = Math.ceil(f / BAL.ritmo.tornillos_partida_tipica); return f <= 0 ? "Se puede comprar ahora" : `Faltan ${f} tornillos (${n === 1 ? "una partida" : `unas ${n} partidas`})`; };
function shopItems(): ShopItem[] {
  if (stab === "chasis" || stab === "equipo") return PERKS.filter((p) => p.cat === stab).map((p) => {
    const l = save.perm[p.k], max = p.cost.length, [lab, f] = p.fx;
    return { attr: `data-k="${p.k}"`, name: p.name, desc: p.desc, ico: PERK_ICON[p.k], lv: l, max, cost: p.cost[l], bought: l > 0, fx: `${lab} ${f(l)}${l < max ? ` → ${f(l + 1)}` : ""}` };
  });
  if (stab === "habilidades") return (Object.keys(ABILITIES) as AbilityId[]).map((k) => {
    const l = save.abilLv[k] ?? 0, c = abilCost(k), max = c.length, a = ABILITIES[k];
    const fx = (x: number) => `Enfriamiento ${n1(abilCd(k, x))} s · efecto ${Math.round(abilK(x) * 100)}%`;
    return { attr: `data-hab="${k}"`, name: a.name, desc: `${a.desc} · Nivel ${l + 1} (${n1(abilCd(k, l))} s)`, ico: ABIL_ICON[k], lv: l, max, cost: c[l], bought: l > 0, fx: l < max ? `${fx(l)} → ${fx(l + 1)}` : fx(l) };
  });
  return UNLOCKS[stab]().map((u) => { const own = owns(u.id); return { attr: `data-buy="${u.id}"`, name: u.name, desc: u.desc, ico: u.icon, cost: own || u.ach ? undefined : u.cost, ach: u.ach, bought: own, fx: u.fx, slot: u.slot }; });
}
const SLOT_LABELS: Record<string, string> = {
  wing: "AERODINÁMICA",
  bumper: "BLINDAJE",
  wheel: "TRACCIÓN",
  tires: "TRACCIÓN",
  gear: "TRANSMISIÓN",
  susp: "SUSPENSIÓN",
  engine: "MOTORIZACIÓN",
};
function renderShop() {
  if (stab !== "piezas" && current() === "shop") peek.part = undefined;
  $("bank").textContent = `${save.scrap.toLocaleString("es-ES")} tornillos`;
  $("stabs").innerHTML = tabsHtml(STABS, stab, "stab");
  const allItems = shopItems();
  const ok = (i: ShopItem) => i.cost !== undefined && i.cost <= save.scrap;
  const buyN = allItems.filter(ok).length;
  const sfiltLabels: Record<keyof typeof SFILT, string> = { ...SFILT, comprables: `Comprables ahora (${buyN})` };
  $("sfilt").innerHTML = tabsHtml(sfiltLabels, sfilt, "sf") + `<button class="tab" data-ss="1">${SSORT[ssort]}</button>`;
  let items = allItems.filter((i) => sfilt === "todo" || (sfilt === "comprables" ? ok(i) : sfilt === "compradas" ? i.bought : i.cost !== undefined ? !ok(i) : !!i.ach && !i.bought));
  if (ssort) items = items.sort((x, y) => ((x.cost ?? Infinity) - (y.cost ?? Infinity)) * (ssort === 1 ? 1 : -1) || 0);
  $("shop").innerHTML = items.map((i) => {
    const done = i.cost === undefined, info = [i.fx, done ? (i.ach && !i.bought ? `Se gana con un logro: ${i.ach}` : i.max ? "Nivel máximo" : "Ya está en el garaje") : tipicas(i.cost!)].filter(Boolean).join(" · ");
    const pips = i.max ? `<div class="pips">${"<i class=on></i>".repeat(i.lv!)}${"<i></i>".repeat(i.max - i.lv!)}</div>` : "";
    const price = done ? (i.max ? "MÁXIMO" : i.ach && !i.bought ? `Logro: ${i.ach}` : "EN EL GARAJE") : `${i.cost} tornillos`;
    const p = i;
    const partsMatch = stab === "piezas" ? /data-buy="part:([^:]+):([^"]+)"/.exec(p.attr) : null;
    const slotKey = (p.slot || (partsMatch ? partsMatch[1] : (stab === "piezas" && p.attr.includes('data-buy="part:') ? p.attr.split(":")[1] : undefined))) as Slot | undefined;
    const optKey = partsMatch ? partsMatch[2] : (stab === "piezas" && p.attr.includes('data-buy="part:') ? p.attr.split(":")[2]?.replace(/"$/, "") : undefined);
    let slotBadge = "";
    if (stab === "piezas" && slotKey) {
      const slotLabel = SLOT_LABELS[slotKey] || slotKey.toUpperCase();
      const isMounted = optKey !== undefined && (save.kit?.[slotKey] === optKey || (optKey === "def" && !save.kit?.[slotKey]));
      slotBadge = `<span class="slot-badge">${slotLabel}</span>` + (isMounted ? ` <span class="slot-badge mounted">MONTADO</span>` : "");
    }
    const isOwnedPart = stab === "piezas" && !!optKey && owns(`part:${slotKey}:${optKey}`);
    const isMounted = optKey !== undefined && (save.kit?.[slotKey!] === optKey || (optKey === "def" && !save.kit?.[slotKey!]));
    const canClick = ok(i) || isOwnedPart;
    const priceText = isOwnedPart ? (isMounted ? "MONTADO EN AUTO" : "EN GARAJE · TOCAR PARA MONTAR") : price;
    return `<button class="carc perk ${canClick ? "" : "no"} ${isMounted ? "active-part" : ""}" ${i.attr} data-info="${info}" aria-disabled="${!canClick}">${slotBadge}<b class="wi">${i.ico ? icon(i.ico, 22) : ""}${i.name}</b>${i.desc}${i.fx ? `<span class="sfx">${i.fx}</span>` : ""}${pips}<div class="price">${isOwnedPart ? `<span class="mount-hint ${isMounted ? "on" : ""}">${priceText}</span>` : price}</div></button>`;
  }).join("") || `<div class="note">Nada por acá con este filtro. El patio no regala nada.</div>`;
  $("sinfo").textContent = (matchMedia("(hover: none)").matches ? "Tocar" : "Enfocar") + " una mejora para ver qué cambia y cuánto falta.";
  if (stab === "piezas") {
    $("shop").querySelectorAll<HTMLElement>('[data-buy^="part:"]').forEach((b) => {
      const parts = (b.dataset.buy ?? "").split(":");
      const slot = parts[1] as Slot, opt = parts[2];
      if (!slot || !opt) return;
      const setPeek = () => {
        peek.part = Object.assign([slot, opt] as [Slot, string], { slot, opt });
      };
      const clearPeek = (e?: FocusEvent) => {
        if (e && (e.relatedTarget as HTMLElement)?.closest?.("#ask")) return;
        const curSlot = Array.isArray(peek.part) ? peek.part[0] : peek.part?.slot;
        const curOpt = Array.isArray(peek.part) ? peek.part[1] : peek.part?.opt;
        if (curSlot === slot && curOpt === opt) {
          peek.part = undefined;
        }
      };
      b.addEventListener("mouseenter", setPeek);
      b.addEventListener("mouseleave", () => clearPeek());
      b.addEventListener("focus", setPeek);
      b.addEventListener("blur", clearPeek);
    });
  }
}
const GTABS = { auto: "Auto", piloto: "Piloto", arma: "Arma", habilidad: "Habilidad", pintura: "Pintura", piezas: "Piezas" };
let gtab: keyof typeof GTABS = "auto";
export function renderGarage() {
  if (gtab !== "piezas") setEditing(false);
  $("scr-garage").classList.toggle("editing", editing); // modo edición: solo el editor, con toda la altura
  const ownedCars = (Object.keys(CARS) as CarKind[]).filter((k) => owns("car:" + k)).length;
  const allPartsList = (Object.keys(PARTS) as Slot[]).flatMap((sl) => Object.keys(opts(sl)).map((o) => `part:${sl}:${o}`));
  const ownedPartsCount = allPartsList.filter((id) => owns(id)).length;
  const pctParts = Math.round((ownedPartsCount / allPartsList.length) * 100);
  const ownedPaints = PAINTS.filter((p) => owns("paint:" + ((p as any).id ?? p))).length;
  const hasAero = Boolean(save.kit.wing && save.kit.wing !== "nada" && save.kit.bumper && save.kit.bumper !== "nada");
  const aeroPkgTag = hasAero ? '<span class="aero-pkg">PAQUETE AERO</span>' : "";
  const hasOffroad = Boolean(save.car === "monster" || save.car === "buggy" || save.kit.tires === "todoterreno");
  const rallyPkgTag = hasOffroad ? '<span class="rally-pkg">PAQUETE OFF-ROAD</span>' : "";
  const hasAwd = Boolean(save.car === "monster" || save.car === "tanque" || (save.car as string) === "pickup");
  const awdPkgTag = hasAwd ? '<span class="all-wheel">TRACCIÓN TOTAL</span>' : "";
  $("bankG").innerHTML = `${save.scrap.toLocaleString("es-ES")} tornillos <span class="car-tally">${ownedCars}/${Object.keys(CARS).length} AUTOS</span> <span class="parts-pct">${pctParts}% TALLER</span>${aeroPkgTag}${rallyPkgTag}${awdPkgTag} <span class="paints-pct">${ownedPaints}/${PAINTS.length} PINTURAS</span>`;
  $("gtabs").innerHTML = tabsHtml(GTABS, gtab, "gtab");
  $("paint").classList.toggle("hidden", gtab !== "pintura");
  $("cars").classList.toggle("hidden", gtab === "pintura");
  const lock = (id: string, ach?: string) => (owns(id) ? "" : `<div class="price">${ach ? `Logro: ${ach}` : `Bloqueado · ${priceOf(id)} tornillos`}</div>`);
  if (gtab === "auto") {
    const eq = CARS[save.car];
    const dTag = (v: number, b: number, isX = false) => Math.abs(v - b) < 0.05 ? "" : `<b class="cdlt ${v > b ? "up" : "dn"}">${v > b ? "+" : ""}${isX ? n1(v - b) : Math.round(v - b)}</b>`;
    $("cars").innerHTML = (Object.keys(CARS) as CarKind[]).map((k) => {
      const c = CARS[k];
      const won = save.ach.includes(("gana_" + k) as AchId);
      const vicTag = owns("car:" + k) ? (won ? '<span class="car-vic won">★ VICTORIA REGISTRADA</span>' : '<span class="car-vic pending">PENDIENTE DE VICTORIA</span>') : "";
      const isArmored = k === "tanque" || k === "monster" || k === "combi" || k === "topadora" || k === "misterio" || k === "murcielago";
      const armorTag = isArmored ? '<span class="armor-badge">CHASIS REFORZADO</span>' : "";
      const isHeavy = c.hp >= 250;
      const heavyTag = isHeavy ? '<span class="heavy-armor">BLINDAJE PESADO</span>' : "";
      const isLight = k === "formula" || k === "carrera" || k === "axel" || k === "triciclo" || k === "moto" || k === "monopatin";
      const lightTag = isLight ? '<span class="light-frame">CHASIS LIVIANO</span>' : "";
      const isAwd = k === "monster" || k === "tanque" || k === "jeep" || (k as string) === "pickup";
      const awdTag = isAwd ? '<span class="all-wheel">TRACCIÓN TOTAL</span>' : "";
      const isHighRev = k === "carrera" || k === "formula" || k === "axel" || k === "moto";
      const highRevTag = isHighRev ? '<span class="high-rev">ALTO RÉGIMEN</span>' : "";
      const allParts = (Object.keys(PARTS) as Slot[]).every((sl) => Object.keys(opts(sl)).every((o) => owns("part:" + sl + ":" + o)));
      const completeTag = owns("car:" + k) && allParts ? '<span class="parts-complete">TOTALMENTE EQUIPADO</span>' : "";
      return `<div tabindex="0" role="button" aria-pressed="${save.car === k}" aria-disabled="${!owns("car:" + k)}" class="carc ${save.car === k ? "sel" : ""} ${owns("car:" + k) ? "" : "locked"}" data-k="${k}"><b>${c.name}</b>${c.desc}<div class="st"><div class="stc"><span>Carrocería <em>${c.hp}${dTag(c.hp, eq.hp)}</em></span>${bar(c.hp, 300)}</div><div class="stc"><span>Velocidad <em>${Math.round(c.speed * 3.6)}${dTag(Math.round(c.speed * 3.6), Math.round(eq.speed * 3.6))}</em></span>${bar(c.speed, 21)}</div><div class="stc"><span>Embestida <em>×${n1(c.ram)}${dTag(c.ram, eq.ram, true)}</em></span>${bar(c.ram, 5.5)}</div></div>${vicTag}${armorTag}${heavyTag}${lightTag}${awdTag}${highRevTag}${completeTag}${owns("car:" + k) ? `<div class="price">${save.car === k ? "EN USO" : "EN EL GARAJE"}</div>` : lock("car:" + k)}</div>`;
    }).join("");
  }
  else if (gtab === "piloto") $("cars").innerHTML = (Object.keys(PILOTS) as PilotId[]).map((k) => {
    const p = PILOTS[k], id = "pilot:" + k;
    const vet = owns(id) && (save.pilot === k && (save.stats.runs >= 5 || save.stats.wins >= 1));
    const portraitSrc = vet && PILOT_PORTRAITS.veterano ? PILOT_PORTRAITS.veterano : PILOT_PORTRAITS[k];
    const portraitHtml = portraitSrc
      ? `<div class="pilot-portrait"><img src="${portraitSrc}" alt="${p.name}" width="64" height="64" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
      : "";
    return `<div tabindex="0" role="button" aria-pressed="${save.pilot === k}" aria-disabled="${!owns(id)}" class="carc pilot ${save.pilot === k ? "sel" : ""} ${owns(id) ? "" : "locked"}" data-pilot="${k}">${portraitHtml}<b>${p.name}</b>${p.pros.map((x) => `<div class="pro">${x}</div>`).join("")}<div class="con">${p.con}</div><div class="wsyn"><span>Afinidad (+1 nv): <b>${ABILITIES[p.abil].name}</b> · ${p.abilTxt}</span></div>${vet ? '<span class="vet-badge">★ VETERANO</span>' : ''}<div class="wsyn">${icon(p.start, 14)}<span>Arma de serie: <b>${WEAPONS[p.start].name}</b></span></div>${owns(id) ? `<div class="price">${save.pilot === k ? "EN USO" : "EN EL GARAJE"}</div>` : lock(id, p.ach?.txt)}</div>`;
  }).join("");
  else if (gtab === "habilidad") $("cars").innerHTML = (Object.keys(ABILITIES) as AbilityId[]).map((k) => {
    const a = ABILITIES[k];
    const l = save.abilLv[k] ?? 0;
    return `<div tabindex="0" role="button" aria-pressed="${save.ability === k}" class="carc pilot ${save.ability === k ? "sel" : ""}" data-abil="${k}"><b class="wi">${icon(ABIL_ICON[k], 22)}${a.name}</b>${a.desc}<div class="price">Nivel ${l + 1} · Enfriamiento ${n1(abilCd(k, l))} s · ${save.ability === k ? "EN USO" : "DISPONIBLE"}</div></div>`;
  }).join("");
  else if (gtab === "arma") { // Arsenal: una sola arma inicial; Gomitas siempre está. Elegir otra reemplaza la del piloto (ver startWeapons)
    const own = PILOTS[save.pilot].start, first = startPick() === "gomitas" ? own : startPick();
    $("cars").innerHTML = `<div class="note">Arranca con: ${WEAPONS[first].name}${first !== own ? ` (en lugar de ${WEAPONS[own].name}, la del piloto)` : ""}</div>` + ARSENAL.map((k) => {
      const id = "arma:" + k, w = WEAPONS[k];
      return `<div tabindex="0" role="button" aria-pressed="${startPick() === k}" aria-disabled="${!owns(id)}" class="carc pilot ${startPick() === k ? "sel" : ""} ${owns(id) ? "" : "locked"}" data-arma="${k}"><b class="wi">${icon(k, 22)}${w.name}</b>${k === "gomitas" ? "De serie. Piloto con arma propia: arranca con la suya" : w.desc}<div class="wsyn">${icon(w.evo, 14)}<span>Evoluciona con <b>${PASSIVES[w.evo].name}</b> → ${w.evoName}</span></div>${owns(id) ? `<div class="price">${startPick() === k ? "EN USO" : "EN EL GARAJE"}</div>` : lock(id)}</div>`;
    }).join("");
  }
  else if (gtab === "piezas") $("cars").innerHTML = editing ? "" : (Object.keys(PARTS) as Slot[]).map((sl) => {
    const totalSl = Object.keys(opts(sl)).length;
    const ownedSl = Object.keys(opts(sl)).filter((o) => owns(`part:${sl}:${o}`)).length;
    const aeroTag = sl === "wing" && hasAero ? ' <span class="aero-pkg">PAQUETE AERO</span>' : "";
    const rallyTag = sl === "tires" && hasOffroad ? ' <span class="rally-pkg">PAQUETE OFF-ROAD</span>' : "";
    return `<div class="slot"><span>${PARTS[sl].name}${aeroTag}${rallyTag} <em class="slot-count">(${ownedSl}/${totalSl})</em></span>${Object.entries(opts(sl)).map(([o, [n, c]]) => {
      const own = owns(`part:${sl}:${o}`);
      const isStock = c === 0;
      return `<button class="opt ${save.kit[sl] === o ? "on" : ""} ${own ? "" : "locked"}" data-part="${sl}:${o}">${n}${isStock ? ' <em class="stock-tag">DE SERIE</em>' : (own ? "" : ` · ${c}`)}</button>`;
    }).join("")}</div>`;
  }).join("");
  if (gtab === "piezas") { $("cars").insertAdjacentHTML("beforeend", decalHtml()); drawGrid(); }
  else if (gtab === "pintura") renderPaint();
}
export const focusSel = (q: string) => { const e = document.querySelector<HTMLButtonElement>(q); (e && !e.disabled ? e : focusables()[0])?.focus(); };

// Configuración: filas generadas desde datos. data-set = número (perilla o lista), data-tog = sí/no.
// Cada pestaña agrupa por tema con títulos de sección ("sect"); DESC explica en una línea lo que no se entiende solo.
type Row = [label: string, kind: "range", path: string, min: number, max: number, step: number, unit?: "%" | "x" | "°"] | [label: string, kind: "tog", path: string] | [label: string, kind: "sel", path: string, opts: [string, string][]] | [label: string, kind: "bind", path: string] | [label: string, kind: "padtest"] | [label: string, kind: "prof", i: number] | [label: string, kind: "note"] | [label: string, kind: "btn", act: string] | [label: string, kind: "sect"];
const DESC: Record<string, string> = {
  scale: "Porcentaje de la resolución de la pantalla con que se dibuja el juego (100% es la nativa). Menos escala sube los fps a costa de nitidez.",
  gpu: "WebGPU suele aliviar al procesador con muchos enemigos en pantalla; WebGL funciona en todos los equipos. Se aplica al volver a abrir el juego. Si WebGPU falla, arranca con WebGL.",
  scaler: "Simple dibuja a un porcentaje fijo de la pantalla. FSR 1 de AMD dibuja más chico y reconstruye los bordes al subir a la nativa. IA dibuja a la mitad y una red neuronal la agranda al doble: imagen más limpia, sin píxeles visibles, a cambio de más trabajo de la tarjeta; pide el motor WebGPU. En pantalla dividida de carrera FSR se apaga y vale la escala simple.",
  fsr: "Cuánto baja FSR la resolución antes de reconstruirla: Ultra calidad 77%, Calidad 67%, Equilibrado 59%, Rendimiento 50%.",
  preset: "Fija de una vez sombras, detalle del mundo, texturas, filtrado y bloom. Cambiar cualquiera de esos cinco pasa a Personalizado.",
  shadowQ: "Sombras de la luna: tamaño del mapa y cascadas. Con una cascada solo hay sombras cerca del auto. Apagadas rinde mucho más en equipos modestos.",
  detail: "Densidad del pasto, cantidad de partículas y restos, y distancia de dibujo de los objetos. El pasto se aplica al empezar la próxima partida.",
  texRes: "Resolución de las texturas del suelo, la tierra y las baldosas. Se aplica al empezar la próxima partida.",
  aniso: "Mantiene nítidas las texturas vistas en ángulo, como el suelo lejano. x16 es lo más nítido.",
  aa: "Suaviza los bordes dentados. FXAA es liviano; MSAA es más nítido y más pesado.",
  sharpen: "Realza el detalle fino. Con FSR ajusta su paso de nitidez (RCAS); sin FSR, un realce común. Demasiada deja halos.",
  fpsCap: "Tope de cuadros por segundo. Un tope bajo ahorra batería y calor; Sin límite sigue la tasa de la pantalla.",
  menuFps: "Tope de cuadros por segundo solo en los menús, la portada y el bestiario (la partida usa el límite de arriba). 30 ahorra batería y calor; Igual que el juego usa el mismo límite.",
  fov: "Ángulo de visión de la cámara en partida. Más ancho muestra más patio y achica todo.",
  bright: "Brillo general de la imagen.",
  gamma: "Aclara u oscurece los medios tonos sin tocar los negros ni los blancos.",
  bloom: "Resplandor suave en luces y objetos brillantes. Lo fija el preajuste.",
  fps: "Muestra en la parte superior los fps, los ms por cuadro, la resolución interna real y la escala o el modo FSR.",
  fullscreen: "Pasa el juego a pantalla completa (también con F11).",
  camMode: "Encuadre de la partida. En partida se alterna con Cambiar cámara (C, View/Select o el botón CAM).",
  zoom: "Qué tan lejos se ve el auto. También con la rueda del mouse o - / =.",
  shake: "Sacudida de cámara al recibir o dar golpes fuertes.",
  dmgNums: "Cifras de daño flotando sobre los enemigos.",
  hint: "Muestra la guía de teclas al empezar cada partida.",
  hud: "Escala de todo el HUD (barras, reloj, radar).",
  hudSolid: "Fondo casi opaco en el HUD para leerlo mejor sobre pasto claro.",
  calm: "Quita parpadeos, destellos y sacudidas que molestan.",
  cb: "Cambia los colores de vida, pactos y peligros por otros que se distinguen con daltonismo.",
  tranquilo: "Modo Tranquilo: se recibe la mitad del daño y los bichos tienen 70% de vida (los jefes no).",
  "pad.dead": "Cuánto hay que mover el stick antes de que cuente.",
  "pad.sens": "Qué tan rápido responde el stick.",
  rumble: "Vibración del mando en golpes.",
  touch: "Tamaño del stick y los botones en pantalla.",
};
export const TABS: Record<string, { name: string; rows: Row[] }> = {
  gfx: { name: "Imagen", rows: [
    ["Resolución", "sect"],
    ["Motor gráfico", "sel", "gpu", [["webgl", "WebGL"], ["webgpu", "WebGPU"]]],
    ["Escalado", "sel", "scaler", [["simple", "Simple"], ["fsr", "FSR"], ["ia", "IA (WebSR)"]]],
    ["Escala de render", "range", "scale", 0.5, 1, 0.05, "%"],
    ["Modo FSR", "sel", "fsr", [["ultra", "Ultra calidad (77%)"], ["calidad", "Calidad (67%)"], ["equilibrado", "Equilibrado (59%)"], ["rendimiento", "Rendimiento (50%)"]]],
    ["Nitidez", "range", "sharpen", 0, 1, 0.05, "%"],
    ["Calidad", "sect"],
    ["Preajuste", "sel", "preset", [["bajo", "Bajo"], ["medio", "Medio"], ["alto", "Alto"], ["ultra", "Ultra"], ["custom", "Personalizado"]]],
    ["Sombras", "sel", "shadowQ", [["off", "Apagadas"], ["low", "Bajas (128 px, 1 cascada)"], ["mid", "Medias (256 px, 1 cascada)"], ["high", "Altas (1024 px, 2 cascadas)"]]],
    ["Detalle del mundo", "sel", "detail", [["bajo", "Bajo"], ["medio", "Medio"], ["alto", "Alto"], ["ultra", "Ultra"]]],
    ["Texturas", "sel", "texRes", [["128", "128 px"], ["256", "256 px"], ["512", "512 px"]]],
    ["Filtrado anisótropo", "sel", "aniso", [["1", "x1"], ["2", "x2"], ["4", "x4"], ["8", "x8"], ["16", "x16"]]],
    ["Bloom", "tog", "bloom"],
    ["Suavizado", "sect"],
    ["Suavizado de bordes", "sel", "aa", [["none", "Ninguno (más nítido)"], ["fxaa", "FXAA"], ["msaa2", "MSAA x2"], ["msaa4", "MSAA x4"], ["msaa8", "MSAA x8"]]],
    ["Color", "sect"],
    ["Brillo", "range", "bright", 0.6, 1.4, 0.05, "%"], ["Gamma", "range", "gamma", 0.7, 1.4, 0.05, "x"],
    ["Rendimiento", "sect"],
    ["Límite de FPS", "sel", "fpsCap", [["30", "30"], ["60", "60"], ["120", "120"], ["0", "Sin límite"]]],
    ["FPS de los menús", "sel", "menuFps", [["30", "30"], ["60", "60"], ["0", "Igual que el juego"]]],
    ["Mostrar estadísticas", "tog", "fps"],
    ["Pantalla", "sect"],
    ["Campo de visión", "range", "fov", 40, 70, 1, "°"],
    ["Pantalla completa", "btn", "fullscreen"],
  ] },
  game: { name: "Juego", rows: [
    ["Cámara", "sect"],
    ["Modo de cámara", "sel", "camMode", CAM_MODES.map((m) => [m, CAM_NAMES[m]])],
    ["Zoom de cámara", "range", "zoom", 0.8, 2, 0.05, "x"], ["Temblor de pantalla", "tog", "shake"],
    ["Pantalla", "sect"],
    ["Tamaño del HUD", "range", "hud", 0.8, 1.5, 0.05, "x"], ["Números de daño", "tog", "dmgNums"], ["Guía de controles al empezar", "tog", "hint"],
  ] },
  audio: { name: "Audio", rows: [
    ["Volumen general", "range", "vol.master", 0, 1, 0.05, "%"],
    ["Mezcla", "sect"],
    ["Efectos", "range", "vol.sfx", 0, 1, 0.05, "%"], ["Motor", "range", "vol.engine", 0, 1, 0.05, "%"], ["Música", "range", "vol.music", 0, 1, 0.05, "%"],
    ["Silencio (M)", "tog", "mute"],
    ["Prueba de sonido", "sect"],
    ["Ralentí, aceleración, velocidad pareja, turbo, derrape y frenada con el auto elegido en el Garaje (~14 s).", "note"],
    ["Probar motor", "btn", "engtest"],
  ] },
  ctl: { name: "Controles", rows: [
    ["Guía", "sect"],
    ["Ver guía de controles", "btn", "ctlguide"],
    ["Perfiles", "sect"],
    ["Tres perfiles con nombre guardan teclado, joystick, carrera y táctil juntos. Guardar copia lo actual; Usar lo carga.", "note"],
    ["Perfil 1", "prof", 0], ["Perfil 2", "prof", 1], ["Perfil 3", "prof", 2],
    ["Teclado", "sect"],
    ["Dos teclas por acción: principal y alternativa. Los menús siguen con flechas, Enter y Esc; la rueda del mouse también hace zoom.", "note"],
    ["Acelerar", "bind", "k.up"], ["Frenar / atrás", "bind", "k.down"], ["Girar izquierda", "bind", "k.left"], ["Girar derecha", "bind", "k.right"],
    ["Turbo", "bind", "k.boost"], ["Derrape", "bind", "k.drift"], ["Salto", "bind", "k.jump"], ["Habilidad", "bind", "k.ability"], ["Cambiar cámara", "bind", "k.cam"], ["Re-sortear cartas", "bind", "k.reroll"],
    ["Pausa", "bind", "k.pause"], ["Sonido", "bind", "k.mute"], ["Acercar", "bind", "k.zoomIn"], ["Alejar", "bind", "k.zoomOut"],
    ["Restablecer teclado", "btn", "reset:keys"],
    ["Joystick", "sect"],
    ["Modo de manejo", "sel", "pad.mode", [["trig", "Gatillos acelerar y frenar"], ["stick", "Stick hacia donde ir"]]],
    ["Stick que maneja", "sel", "pad.stick", [["left", "Izquierdo"], ["right", "Derecho"]]],
    ["Invertir eje horizontal", "tog", "pad.invX"], ["Invertir eje vertical", "tog", "pad.invY"],
    ["Zona muerta del stick", "range", "pad.dead", 0.05, 0.4, 0.01, "%"], ["Sensibilidad del stick", "range", "pad.sens", 0.5, 2, 0.05, "x"], ["Vibración", "tog", "rumble"],
    ["Acelerar", "bind", "p.accel"], ["Frenar", "bind", "p.brake"], ["Turbo", "bind", "p.boost"], ["Derrape", "bind", "p.drift"], ["Salto", "bind", "p.jump"], ["Habilidad", "bind", "p.ability"],
    ["Re-sortear cartas", "bind", "p.reroll"], ["Cambiar cámara", "bind", "p.cam"], ["Pausa", "bind", "p.pause"], ["Menú: aceptar", "bind", "p.ok"], ["Menú: volver", "bind", "p.back"],
    ["Restablecer joystick", "btn", "reset:pad"],
    ["Probar control", "sect"],
    ["", "padtest"],
    ["Calibrar zona muerta con los sticks sueltos", "btn", "calib"],
    ["Carrera y batalla", "sect"],
    ["Control J1", "sel", "rc.p1", Object.entries(CTL_NAME)], ["Control J2", "sel", "rc.p2", Object.entries(CTL_NAME)],
    ["Teclado 1", "note"],
    ["Acelerar", "bind", "r1.up"], ["Frenar / atrás", "bind", "r1.down"], ["Girar izquierda", "bind", "r1.left"], ["Girar derecha", "bind", "r1.right"], ["Derrape", "bind", "r1.drift"], ["Usar objeto", "bind", "r1.item"],
    ["Teclado 2", "note"],
    ["Acelerar", "bind", "r2.up"], ["Frenar / atrás", "bind", "r2.down"], ["Girar izquierda", "bind", "r2.left"], ["Girar derecha", "bind", "r2.right"], ["Derrape", "bind", "r2.drift"], ["Usar objeto", "bind", "r2.item"],
    ["Joystick (gira con el stick elegido o la cruceta)", "note"],
    ["Acelerar", "bind", "rp.accel"], ["Frenar / atrás", "bind", "rp.brake"], ["Derrape", "bind", "rp.drift"], ["Usar objeto", "bind", "rp.item"],
    ["Restablecer carrera", "btn", "reset:race"],
    ["Táctil", "sect"],
    ["Tamaño de controles táctiles", "range", "touch", 0.7, 1.4, 0.05, "x"],
    ["Editar controles táctiles", "btn", "tedit"],
    ["Restablecer táctil", "btn", "reset:touch"],
  ] },
  a11y: { name: "Accesibilidad", rows: [
    ["Lectura", "sect"],
    ["Tamaño del HUD", "range", "hud", 0.8, 1.5, 0.05, "x"], ["HUD con fondo sólido", "tog", "hudSolid"], ["Números de daño", "tog", "dmgNums"],
    ["Movimiento", "sect"],
    ["Modo Tranquilo", "tog", "tranquilo"], ["Reducir parpadeos y destellos", "tog", "calm"], ["Modo daltónico", "tog", "cb"], ["Temblor de pantalla", "tog", "shake"],
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
export const setArmed = (v: string | null) => { armed = v; };
export let armed: string | null = null; // botón de dos pasos esperando el segundo clic (restablecer, sobrescribir perfil)
const ref = (p: string) => { const k = p.split("."); let o = (k[0] === "rc" ? (k.shift(), raceCfg) : save) as unknown as Record<string, unknown>; while (k.length > 1) o = o[k.shift()!] as Record<string, unknown>; return [o, k[0]] as const; };
const val = (p: string) => { const [o, k] = ref(p); return o[k]; };
const KN: Record<string, string> = { ArrowUp: "Flecha arriba", ArrowDown: "Flecha abajo", ArrowLeft: "Flecha izq", ArrowRight: "Flecha der", Space: "Espacio", Escape: "Esc", Equal: "=", Minus: "-", Period: ".", Comma: ",", Enter: "Enter",
  NumpadAdd: "Num +", NumpadSubtract: "Num -" };
export const keyName = (c?: string) => (KN[c ?? ""] ?? (c ?? "").replace(/^Key|^Digit/, "").replace(/^Numpad/, "Num ").replace("Left", " izq").replace("Right", " der")).toUpperCase();
const show2 = (v: number, u?: string) => (u === "%" ? `${Math.round(v * 100)}%` : u === "°" ? `${Math.round(v)}°` : `${v.toFixed(2)}x`);
/** Fila que no aplica con el modo de escalado elegido: no se dibuja (tampoco recibe foco con teclado o mando). */
const hiddenRow = (path: string) => (path === "scale" && save.scaler !== "simple") || (path === "fsr" && save.scaler !== "fsr");
/** Aviso de combinación: nota corta bajo el control cuando dos ajustes chocan, o "". */
const warn = (path: string) => {
  if (path !== "aa") return "";
  if (save.aa === "fxaa" && save.sharpen > 0.5) return "FXAA y nitidez alta se anulan en parte.";
  if (save.aa === "msaa8" && save.scaler === "simple" && save.scale < 0.75) return "MSAA x8 con escala baja: mucho costo, poca mejora.";
  return "";
};
/** Lista de una opción con lo que admite este dispositivo (MSAA hasta el máximo de la tarjeta). */
const choices = (path: string, list: [string, string][]): [string, string, boolean][] => list.map(([v, n]) => {
  if (path === "aa" && v.startsWith("msaa") && +v.slice(4) > maxMsaa()) return null;
  if (path === "preset" && v === "custom" && save.preset !== "custom") return null;
  if (path === "scaler" && v === "ia" && save.gpu !== "webgpu") return [v, `${n} (requiere WebGPU)`, true] as [string, string, boolean];
  if (path === "gpu" && v === "webgpu" && !("gpu" in navigator)) return [v, `${n} (no disponible)`, true] as [string, string, boolean];
  return [v, n, false] as [string, string, boolean];
}).filter((o): o is [string, string, boolean] => !!o);
export function renderConfig() {
  $("tabs").innerHTML = Object.entries(TABS).map(([id, t]) => `<button class="tab ${id === tab ? "on" : ""}" role="tab" aria-selected="${id === tab}" data-tab="${id}">${t.name}</button>`).join("");
  // En táctil, Controles deja solo lo táctil (sin teclas ni gamepad)
  // (y Perfiles); el editor táctil solo existe con pantalla táctil y J2 nunca en teléfono
  const touchOnly = tab === "ctl" && ctl === "touch";
  let sec = "";
  const rows = TABS[tab].rows.filter((r) => {
    if (r[1] === "sect") sec = r[0];
    if (touchOnly && sec !== "Táctil" && sec !== "Perfiles" && sec !== "Guía") return false;
    if ((r[2] === "tedit" && !isTouch) || (r[2] === "rc.p2" && isTouch)) return false;
    return !(typeof r[2] === "string" && hiddenRow(r[2]));
  });
  const fa = document.activeElement as HTMLElement | null; // el foco sobrevive al redibujo (cambio de control, captura)
  const fk = fa?.closest("#opts") ? ["data-bind", "data-act", "data-tog", "data-set", "data-pname"].map((k) => fa.getAttribute(k) !== null && `[${k}="${fa.getAttribute(k)}"]`).find(Boolean) : null;
  const d = (path: string) => (DESC[path] ? `<small>${DESC[path]}</small>` : "") + (warn(path) ? `<small class="why">${warn(path)}</small>` : "");
  $("opts").innerHTML = rows.map((r) => {
    if (r[1] === "sect") return `<div class="sect">${r[0]}</div>`;
    if (r[1] === "note") return `<div class="note">${r[0]}</div>`;
    if (r[1] === "btn") return `<button class="row" data-act="${r[2]}"><span class="lb">${armed === r[2] ? "¿Seguro? Presiona otra vez para restablecer" : r[0]}${d(r[2])}</span><b>&gt;</b></button>`;
    if (r[1] === "bind") return bindRow(r[0], r[2]);
    if (r[1] === "padtest") return padTestHtml();
    if (r[1] === "prof") { const p = save.profiles[r[2]], a = `psave:${r[2]}`;
      return `<div class="row multi prof"><input type="text" data-pname="${r[2]}" maxlength="20" value="${esc(p?.name ?? r[0])}" aria-label="Nombre del perfil ${r[2] + 1}"><span class="lb"><small>${p ? "Guardado" : "Vacío"}</small></span>`
        + `<button data-act="${a}">${armed === a ? "¿Sobrescribir?" : "Guardar"}</button><button data-act="pload:${r[2]}" ${p ? "" : "disabled"}>Usar</button></div>`; }
    if (r[1] === "tog") return `<button class="row" role="switch" aria-checked="${!!val(r[2])}" data-tog="${r[2]}"><span class="lb">${r[0]}${d(r[2])}</span><b class="jm-sw${val(r[2]) ? " on" : ""}">${val(r[2]) ? "SÍ" : "NO"}</b></button>`;
    if (r[1] === "sel") return `<label class="row"><span class="lb">${r[0]}${d(r[2])}</span><select data-set="${r[2]}">${choices(r[2], r[3]).map(([v, n, no]) => `<option value="${v}" ${String(val(r[2])) === v ? "selected" : ""} ${no ? "disabled" : ""}>${n}</option>`).join("")}</select></label>`;
    const v = val(r[2]) as number;
    return `<label class="row"><span class="lb">${r[0]}${d(r[2])}</span><input type="range" data-set="${r[2]}" data-u="${r[6]}" min="${r[3]}" max="${r[4]}" step="${r[5]}" value="${v}"><output>${show2(v, r[6])}</output></label>`;
  }).join("");
  if (fk) document.querySelector<HTMLElement>(`#opts ${fk}`)?.focus({ preventScroll: true });
}

const BTABS = { bichos: "Bichos", pilotos: "Pilotos", logros: "Logros", stats: "Estadísticas" };
let btab: keyof typeof BTABS = "bichos";
let bfilt: "todos" | "agiles" | "blindados" | "jefes" = "todos";
/** Nombre visible de un premio de logro (part:<ranura>:<opción> o pilot:<id>). */
const rewardName = (id: string) => {
  const [t, k, o] = id.split(":");
  if (t === "pilot") return PILOTS[k as PilotId].name;
  const s = PARTS[k as Slot].name, n = opts(k as Slot)[o][0];
  return n.toLowerCase().startsWith(s.toLowerCase()) ? n : `${s} · ${n}`;
};
/** Tiempo largo legible: "2 h 05 min" o "7 min 12 s". */
const longTime = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min ${String(Math.floor(s % 60)).padStart(2, "0")} s`; };
/** Ícono SVG propio para cada logro según su categoría (auto, jefe, fusión o hazaña). */
const achIco = (k: AchId) => k.startsWith("gana_") ? uiIcon("vehiculo", 20) : k in DEF ? beastIcon(k as Kind, 22)
  : k === "chispazo" || k === "globos" || k === "anillo" ? icon(k, 22)
  : icon(k === "racha" ? "senal" : k === "intacto" ? "lego" : k === "diez" ? "litio" : "evo", 22);
/** Progreso contextual para logros con avance medible (tiempo, bajas de jefe o auto en el garaje). */
function achProg(k: AchId, ok: boolean) {
  if (k === "diez" && !ok && save.best > 0) return `<div class="achProg"><span>Mejor marca: <b>${fmt(Math.min(600, save.best))} / 10:00</b></span>${bar(save.best, 600)}</div>`;
  if (k === "diario" && !ok && save.daily.best > 0) return `<div class="achProg"><span>Mejor marca hoy: <b>${fmt(Math.min(600, save.daily.best))} / 10:00</b></span>${bar(save.daily.best, 600)}</div>`;
  if (k in DEF && (save.slain[k as Kind] ?? 0) > 0) return `<div class="achProg"><span>Bajas registradas: <b>${save.slain[k as Kind]}</b></span></div>`;
  if (k.startsWith("gana_") && !ok) return `<div class="achProg"><span>${owns("car:" + k.slice(5)) ? "Auto en el garaje · falta ganar la partida" : "Requiere desbloquear el auto en el Taller"}</span></div>`;
  return "";
}
const isAchNear = (k: AchId, ok: boolean) => !ok && ((k === "diez" && save.best >= 420) || (k === "diario" && save.daily.best >= 420) || (k.startsWith("gana_") && owns("car:" + k.slice(5))));
/** Estadísticas de carrera: fichas con los totales históricos (save.stats y save.slain). */
function statsHtml() {
  const s = save.stats, kv = (a: string, b: string | number) => `<div class="kv"><span>${a}</span><b>${b}</b></div>`;
  const card = (title: string, big: string, extra = "") => `<div tabindex="0" class="carc ficha"><b>${title}</b><div class="big">${big}</div>${extra}</div>`;
  const topW = Object.entries(s.dmg).filter(([id, v]) => id in WEAPONS && v > 0).sort((a, b) => b[1] - a[1]);
  const fav = topW[0];
  const kinds = (Object.keys(DEF) as Kind[]).filter((k) => (save.slain[k] ?? 0) > 0).sort((a, b) => (save.slain[b] ?? 0) - (save.slain[a] ?? 0));
  const total = kinds.reduce((n, k) => n + save.slain[k]!, 0), maxS = kinds[0] ? save.slain[kinds[0]]! : 1;
  const rank = total >= 2500 ? "Leyenda del Patio" : total >= 500 ? "Chatarrero Veterano" : total >= 100 ? "Cazador de Plagas" : "Aprendiz de Patio";
  return card("Partidas", String(s.runs), s.runs ? `<div>${s.wins} ${s.wins === 1 ? "ganada" : "ganadas"} · ${Math.round((s.wins / s.runs) * 100)}%</div>${bar(s.wins, s.runs)}` : "Sin partidas completas. Todavía no hay nada que lamentar.")
    + card("Tiempo jugado", longTime(s.time), save.best ? kv("Mejor tiempo", `${fmt(save.best)}${save.endless ? ` (+${fmt(save.endless)})` : ""}`) : "Tiempo total en el patio.")
    + card("Recorrido", `${(s.dist / 1000).toFixed(1).replace(".", ",")} km`, "Distancia total manejada, sin llegar a ningún lado.")
    + `<div tabindex="0" class="carc ficha"><b>Arma favorita</b><div class="big wi">${fav ? icon(fav[0], 26) + WEAPONS[fav[0] as WeaponId].name : "Sin datos"}</div>${topW.length ? topW.slice(0, 3).map(([id, v], i) => `<div class="kv stRow"><span class="wi">${icon(id, 15)}${WEAPONS[id as WeaponId].name}</span>${bar(v, fav[1])}<b>${Math.round(v)}${i === 0 && v >= 50000 ? ' <em class="fav-badge">MAESTRÍA</em>' : ""}</b></div>`).join("") : "Se define con el daño de cada partida. Aún sin favoritos."}</div>`
    + `<div tabindex="0" class="carc ficha"><b>Bajas por tipo · <span class="st-rank">${rank}</span></b><div class="big">${total}</div>${kinds.map((k) => `<div class="kv stRow"><span class="wi">${beastIcon(k, 16)}${DEF[k].name}</span>${bar(save.slain[k]!, maxS)}<b>${save.slain[k]}</b></div>`).join("") || "Sin bajas todavía. El patio sigue en paz."}</div>`
    + `<div tabindex="0" class="carc ficha"><b>Mejores marcas por zona</b>${(Object.keys(ZONES) as ZoneId[]).map((z) => { const r = s.zone[z]; return kv(ZONES[z].short, r ? `${fmt(r.t)} · ${r.kills} bajas` : "—"); }).join("")}</div>`;
}
function renderBestiary() {
  $("scr-bestiary").dataset.btab = btab;
  const rec = $("records"), recSect = rec.previousElementSibling as HTMLElement | null;
  rec.classList.toggle("hidden", btab !== "stats");
  recSect?.classList.toggle("hidden", btab !== "stats");
  const bCounts: Record<keyof typeof BTABS, string> = {
    bichos: `Bichos (${(Object.keys(DEF) as Kind[]).filter((k) => save.seen.includes(k) || (save.slain[k] ?? 0) > 0).length}/${KINDS.length})`,
    pilotos: `Pilotos (${(Object.keys(PILOTS) as PilotId[]).filter((k) => owns("pilot:" + k)).length}/${Object.keys(PILOTS).length})`,
    logros: `Logros (${save.ach.length}/${Object.keys(ACH).length})`,
    stats: "Estadísticas",
  };
  $("btabs").innerHTML = tabsHtml(bCounts, btab, "btab");
  const bfiltsEl = $("bfilts");
  if (btab === "bichos") {
    bfiltsEl.classList.remove("hidden");
    const BFILT_LABELS: Record<typeof bfilt, string> = {
      todos: "Todas las criaturas",
      agiles: "Plagas ágiles",
      blindados: "Criaturas blindadas",
      jefes: "Jefes y minijefes",
    };
    bfiltsEl.innerHTML = (Object.keys(BFILT_LABELS) as (typeof bfilt)[]).map((f) =>
      `<button class="tab ${bfilt === f ? "on" : ""}" role="tab" aria-selected="${bfilt === f}" data-bfilt="${f}">${BFILT_LABELS[f]}</button>`
    ).join("");
  } else {
    bfiltsEl.classList.add("hidden");
  }
  const isAgile = (k: Kind) => DEF[k].speed >= 8.5 && !DEF[k].boss;
  const isArmored = (k: Kind) => (DEF[k].mass >= 5 || DEF[k].hp >= 40) && !DEF[k].boss;
  const matchFilt = (k: Kind) => {
    if (bfilt === "jefes") return DEF[k].boss;
    if (bfilt === "agiles") return isAgile(k);
    if (bfilt === "blindados") return isArmored(k);
    return true;
  };
  const filteredKinds = (Object.keys(DEF) as Kind[]).filter(matchFilt);
  $("beasts").innerHTML = btab === "stats" ? statsHtml() : btab === "logros" ? (Object.keys(ACH) as AchId[]).map((k) => {
    const a: { name: string; txt: string; reward?: string; scrap?: number } = ACH[k], ok = save.ach.includes(k);
    const near = isAchNear(k, ok);
    return `<div tabindex="0" class="carc ficha logro ${ok ? "" : "locked"} ${near ? "ach-near" : ""}"><span class="sello">${ok ? "LOGRADO" : near ? "CASI LISTO" : "???"}</span><b class="wi">${achIco(k)}${a.name}</b>${a.txt}${achProg(k, ok)}${a.reward || a.scrap ? `<div class="price">Premio: ${a.reward ? rewardName(a.reward) : `${a.scrap} tornillos`}${ok ? `<b class="ach-ok"> · COBRADO</b>` : ""}</div>` : ""}</div>`;
  }).join("")
    : btab === "pilotos" ? (Object.keys(PILOTS) as PilotId[]).map((k) => {
      const p = PILOTS[k], own = owns("pilot:" + k), st = save.pilot === k ? "EN USO" : own ? "EN EL GARAJE" : p.ach ? `Logro: ${p.ach.txt}` : `Bloqueado · ${p.cost} tornillos`;
      const portraitSrc = PILOT_PORTRAITS[k];
      const portraitHtml = portraitSrc
        ? `<div class="pilot-portrait"><img src="${portraitSrc}" alt="${p.name}" width="64" height="64" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
        : "";
      return `<div tabindex="0" class="carc ficha pilot ${save.pilot === k ? "sel" : ""} ${own ? "" : "locked"}">${portraitHtml}<b>${p.name}</b>${p.pros.map((x) => `<div class="pro">${x}</div>`).join("")}<div class="con">${p.con}</div><div class="wsyn"><span>Afinidad (+1 nv): <b>${ABILITIES[p.abil].name}</b> · ${p.abilTxt}</span></div><div class="wsyn">${icon(p.start, 14)}<span>Arma de serie: <b>${WEAPONS[p.start].name}</b></span></div><div class="lore">${p.lore}</div><div class="price">${st}</div></div>`;
    }).join("")
    : filteredKinds.map((k) => {
      // Todo visible desde el inicio; lo propio (bajas) dice "Sin registros todavía" hasta que aparezca. Clic, Enter o A abren la ficha completa.
      const d = DEF[k], n = save.slain[k] ?? 0, met = save.seen.includes(k) || n > 0;
      const portraitSrc = BEAST_PORTRAITS[k];
      const portraitHtml = portraitSrc
        ? `<div class="beast-portrait"><img src="${portraitSrc}" alt="${d.name}" width="58" height="58" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
        : "";
      const bio = BIOMETRICS[k];
      const bioFast = bio ? `<div class="b-tactical"><span class="b-bio-chip"><b>BLINDAJE:</b> ${bio.armor}</span><span class="b-bio-chip blind"><b>PUNTO CIEGO:</b> ${bio.blindSpot}</span></div>` : "";
      return `<div tabindex="0" class="carc ficha ${d.boss ? "boss" : ""}" data-beast="${k}">${portraitHtml}<span class="bthumb">${beastIcon(k, 38)}</span><b class="wi">${d.boss ? icon("jefe", 22) : ""}${d.name}</b>${rankOf(k)} · <span class="b-kills">${met ? `${n} ${n === 1 ? "baja registrada" : "bajas registradas"}` : "Sin registros todavía"}</span><div class="lore">${LORE[k]}</div>${bioFast}<div class="st"><span>Vida</span>${bar(d.hp, d.boss ? 8000 : 90)}<span>Velocidad</span>${bar(d.speed, 18)}<span>Daño</span>${bar(d.dmg, d.boss ? 45 : 12)}<span>Peso</span>${bar(d.mass, d.boss ? 100 : 3)}</div><div class="price">${d.xp ? `${d.xp} ${d.xp === 1 ? "tuerca" : "tuercas"} de XP` : "Fin de la partida"}</div></div>`;
    }).join("");
  rec.innerHTML = save.runs.length
    ? `<tr><th>#</th><th>Tiempo</th><th>Bajas</th><th>Nivel</th><th>Semilla</th></tr>` + save.runs.map((r, i) => `<tr><td>${i + 1}</td><td>${fmt(r.t)}${r.win ? " V" : ""}</td><td>${r.kills}</td><td>${r.lv}</td><td>${r.seed}</td></tr>`).join("")
    : `<tr><td>Sin partidas todavía.</td></tr>`;
}


// ---------- Pausa y resultados (los datos los arma main.ts) ----------
type Kit = { weapons: { id: WeaponId; lv: number; evolved: boolean; dmg?: number; pct?: number }[]; passives: { id: PassiveId; lv: number }[]; stats: [string, string][]; run: [string, string][]; seed: string };
const pips = (l: number) => `<span class="pips">${"<i class=on></i>".repeat(l)}${"<i></i>".repeat(Math.max(0, 5 - l))}</span>`;
export function openPause(k: Kit) {
  $("kitW").innerHTML = k.weapons.map((w) => {
    const def = WEAPONS[w.id], ev = def.evo, hasP = k.passives.some((p) => p.id === ev);
    const syn = !w.evolved ? `<small class="wsynP ${hasP ? "on" : ""}">Evo: ${PASSIVES[ev].name}</small>` : "";
    return `<li style="--w-pct:${w.pct ?? 0}%"><span class="wi">${icon(w.id, 20)}<span class="wn"><em>${w.evolved ? def.evoName : def.name}</em><small class="wdmg">${w.dmg ? `${w.dmg.toLocaleString("es")} · ${w.pct}%` : "0 daño"}</small>${syn}</span></span>${w.evolved ? "<b>EVO</b>" : pips(w.lv)}</li>`;
  }).join("");
  $("kitP").innerHTML = k.passives.map((p) => {
    const eqW = k.weapons.filter((w) => !w.evolved && WEAPONS[w.id].evo === p.id).map((w) => WEAPONS[w.id].name);
    const allW = (Object.keys(WEAPONS) as WeaponId[]).filter((id) => WEAPONS[id].desc && WEAPONS[id].evo === p.id).map((id) => WEAPONS[id].name);
    return `<li><span class="wi">${icon(p.id, 20)}<span class="wn"><em>${PASSIVES[p.id].name}</em><small class="wsynP ${eqW.length ? "on" : ""}">Evo: ${(eqW.length ? eqW : allW).join(" · ")}</small></span></span>${pips(p.lv)}</li>`;
  }).join("") || "<li><span>Ninguna</span></li>";
  $("kitS").innerHTML = k.stats.map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join("");
  $("kitR").innerHTML = k.run.map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join("");
  $("pauseSeed").textContent = `${CARS[save.car].name} · ${PILOTS[save.pilot].name} · ${ABILITIES[save.ability].name} · ${ZONES[save.zone].short} · ${k.seed}`;
  reset("pause");
}

export function openOver(r: { win: boolean; why: string; time: number; kills: number; level: number; scrap: number; record: boolean; dmg: Record<string, number>; hurt?: Record<string, number>; seed: string; more?: boolean; title?: string; prevBest?: number; bestStreak?: number; bestHit?: number; bestDrive?: number; bossKills?: number; evos?: string[]; ach?: string[]; car?: string; enc?: [string, string][] }) {
  $("overEndless").classList.toggle("hidden", !r.more); // venció al jefe final: puede seguir en modo sin fin
  $("overTitle").textContent = r.title ?? (r.win ? "VICTORIA" : "FIN DE LA PARTIDA");
  $("overTxt").textContent = r.why;
  // Comparación con el récord de tiempo: ▲ mejor, ▼ peor
  const dT = r.prevBest ? Math.floor(r.time) - r.prevBest : 0, dTxt = r.prevBest ? `<em class="${dT >= 0 ? "up" : "dn"}">${dT >= 0 ? "▲" : "▼"} ${fmt(Math.abs(dT))}</em>` : "";
  $("overStats").innerHTML = [["Tiempo", fmt(r.time) + dTxt], ["Bajas", r.kills], ["Nivel", r.level], ["Tornillos", "+" + r.scrap]].map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join("");
  const best = [["Racha más larga", "x" + (r.bestStreak ?? 0)], ["Pico de manejo", `×${(r.bestDrive ?? 1).toFixed(2)}`], ["Golpe más fuerte", String(r.bestHit ?? 0)], ["Jefes derrotados", String(r.bossKills ?? 0)]];
  if (r.evos?.length) best.push(["Evoluciones", r.evos.join(" · ")]);
  $("overBest").innerHTML = best.map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join("");
  $("overRew").innerHTML = [`<li><span>Tornillos</span><b>+${r.scrap}</b></li>`, ...(r.ach ?? []).map((a) => `<li><span>Logro</span><b>${a}</b></li>`)].join("");
  $("overEncT").classList.toggle("hidden", !r.enc); $("overEnc").classList.toggle("hidden", !r.enc);
  $("overEnc").innerHTML = (r.enc ?? []).map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join(""); // ENCORE: reporte de la expedición
  $("overRepeat").textContent = "Repetir";
  $("overRec").classList.toggle("hidden", !r.record);
  $("overShop").classList.toggle("hidden", !canBuy());
  const rows = Object.entries(r.dmg).sort((a, b) => b[1] - a[1]), top = rows[0]?.[1] || 1;
  const name = (id: string) => (id in WEAPONS ? WEAPONS[id as WeaponId].name : id in ABILITIES ? ABILITIES[id as AbilityId].name : id[0].toUpperCase() + id.slice(1));
  const dmgIco = (id: string) => (id in WEAPONS ? icon(id, 18) : id in ABIL_ICON ? icon(ABIL_ICON[id as AbilityId], 18) : id === "embestida" ? icon("lanza", 18) : icon("mortero", 18));
  $("overDmg").innerHTML = rows.map(([id, v]) => `<li><span class="wi">${dmgIco(id)}<em>${name(id)}</em></span>${bar(v, top)}<b>${Math.round(v)}</b></li>`).join("") || "<li><span>Sin daño infligido</span></li>";
  const hurt = Object.entries(r.hurt ?? {}).sort((a, b) => b[1] - a[1]), hurtTop = hurt[0]?.[1] || 1;
  const hurtKind = (id: string): Kind | null => {
    if (id in DEF) return id as Kind;
    const [p, k] = id.split(" ");
    if ((p === "contacto" || p === "rebote" || p === "salto" || p === "barrido") && k in DEF) return k as Kind;
    if (id === "cucaracha") return "escarabajo";
    if (id === "ácido") return "escupidora";
    if (id === "cables") return "cortacercos";
    return null;
  };
  const hurtIco = (id: string) => {
    const hk = hurtKind(id);
    return hk ? beastIcon(hk, 18) : id === "pelota" ? icon("mortero", 18) : icon("blindaje", 18);
  };
  const hurtName = (id: string) => {
    const [p, k] = id.split(" ");
    if ((p === "contacto" || p === "rebote" || p === "salto" || p === "barrido") && k) return `${p[0].toUpperCase() + p.slice(1)} · ${DEF[k as Kind]?.name ?? k}`;
    return DEF[id as Kind]?.name ?? id[0].toUpperCase() + id.slice(1);
  };
  $("overHurt").innerHTML = hurt.map(([id, v]) => `<li><span class="wi">${hurtIco(id)}<em>${hurtName(id)}</em></span>${bar(v, hurtTop)}<b>${Math.round(v)}</b></li>`).join("") || "<li><span>Sin daño recibido</span></li>";
  $("overSeed").textContent = `${CARS[save.car].name} · ${PILOTS[save.pilot].name} · ${ABILITIES[save.ability].name} · ${ZONES[save.zone].short} · ${r.seed}`;
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
const CTL_TXT = { keys: () => ["PRESIONA CUALQUIER TECLA", ` · ${keyName(KEYS.pause[0])} sigue · ${keyName(KEYS.mute[0])} sonido`], pad: () => [`PRESIONA ${btnName(pb("ok"))}`, ` · ${btnName(pb("pause"))} sigue`], touch: () => ["TOCA LA PANTALLA", " · el botón de pausa sigue"] };
let ctlShown = ctl;
function ctlTexts() {
  const [press, hint] = CTL_TXT[ctl]();
  document.querySelector("#scr-title .press")!.textContent = press;
  $("pauseHint").textContent = hint;
  if (current() === "config" && tab === "ctl" && !binding) renderConfig(); // filas táctiles y nombres de botones según el control
  if (current() === "beast" && ctl !== ctlShown) renderBeast(); // la guía de controles de la ficha
  ctlShown = ctl;
}
addEventListener("ctl", ctlTexts);

// Editor táctil: los controles en pantalla se arrastran (input.ts editTouch); Listo, Esc o el botón de volver lo cierran
function tedit(on: boolean) {
  editTouch(on, save.tlay[orient()], save.touch, (l) => { save.tlay[orient()] = l; persist(); }); // edita la orientación actual (la otra se edita girando el teléfono)
  $("tedit").classList.toggle("hidden", !on);
  if (!on) { applySettings(); focusSel('[data-act="tedit"]'); }
}

// ---------- Arranque ----------
export function initMenu(a: Api) {
  api = a;
  // Íconos de la familia de interfaz en los botones fijos (solo presentación: no cambia texto ni acción)
  for (const b of document.querySelectorAll<HTMLButtonElement>("#fe button[data-go], #fe button[data-act]")) {
    const k = b.dataset.go ?? b.dataset.act!, id = UI_BTN_ICON[k] ?? (k === "playmenu" || k === "playgo" || k === "encorego" || k === "encore" ? "jugar" : undefined);
    if (id && !b.classList.contains("lnk") && (!b.classList.contains("primary") || /^(play|playmenu|playgo|encore|encorego|resume|race|daily)$/.test(k))) b.insertAdjacentHTML("afterbegin", uiIcon(id, 22, !b.classList.contains("primary")));
  }
  $("tPause").innerHTML = uiIcon("pausa", 26);
  $("tJump").innerHTML = uiIcon("salto", 28) + "SALTO";
  applySettings();
  ctlTexts();
  $("teReset").addEventListener("click", () => { save.tlay = { v: {}, h: {} }; persist(); applySettings(); editTouch(true, {}, save.touch, (l) => { save.tlay[orient()] = l; persist(); }); }); // restablece las dos orientaciones
  $("teDone").addEventListener("click", () => tedit(false));
  $("tPause").addEventListener("click", () => (current() === "pause" ? api.resume() : api.pause())); // botón táctil: igual que Esc/Start
  $("tCam").addEventListener("click", camCycle); // botón táctil: igual que C / View
  const fe = $("fe");
  $("c").tabIndex = -1; $("c").setAttribute("aria-hidden", "true"); // el canvas no es parada de Tab (Babylon le pone tabindex)
  for (const sc of document.querySelectorAll<HTMLElement>(".scr")) { // título de cada pantalla = encabezado y nombre de la sección
    const t = sc.querySelector<HTMLElement>(".otitle, .brand");
    if (t) { t.id ||= sc.id + "-t"; t.setAttribute("role", "heading"); t.setAttribute("aria-level", "1"); sc.setAttribute("aria-labelledby", t.id); }
  }
  fe.addEventListener("focusin", () => SFX.blip());
  // Mouse: el foco sigue al puntero solo si se mueve (pointerover le robaría el foco al teclado al cambiar de pantalla)
  fe.addEventListener("pointermove", (e) => { const el = (e.target as HTMLElement).closest<HTMLElement>("button:not(:disabled), select, input, [tabindex]"); if (el && el !== document.activeElement) el.focus({ preventScroll: true }); });
  fe.addEventListener("click", (e) => {
    const t = e.target as HTMLElement, d = (t.closest("[data-go],[data-rc],[data-rctrack],[data-act],[data-k],[data-sw],[data-pdef],[data-pz],[data-pfilt],[data-tab],[data-tog],[data-bind],[data-gtab],[data-stab],[data-btab],[data-buy],[data-pilot],[data-part],[data-abil],[data-hab],[data-sf],[data-ss],[data-arma],[data-dsel],[data-dpre],[data-dtpl],[data-pfin],[data-dcol],[data-dact],[data-beast],[data-bnav],[data-banim],[data-belite]") as HTMLElement | null)?.dataset;
    if (current() === "title" && d?.act !== "encorego") { SFX.accept(); return go("main"); }
    if (d?.act === "askyes") { const f = askFn; askClose(); SFX.accept(); f?.(); return; }
    if (d?.act === "askno") { askClose(); return; }
    if (askFn) return; // con la confirmación abierta no se toca nada más
    const nm = (t.closest("[data-buy],[data-pilot],[data-part],[data-arma],[data-hab],[data-k]")?.querySelector("b")?.textContent ?? "esto").trim();
    if (t.id === "dgrid") { if (!e.detail) paintAtCursor(); return; } // Enter / A sobre la grilla (el mouse y el dedo pintan en pointerdown)
    if (binding && d?.bind !== binding) { cancelBind(); if (!d?.bind) return; } // un clic fuera cancela la captura
    if (!d) return;
    if (d.go === "encore" && !save.encore.runs) { SFX.accept(); const largar = () => api.play(false, true); if (save.controlesVistos) largar(); else controlsGuide(largar, true); return; } // primera vez: Jugar va directo a largar (sin la pantalla ENCORE); la guía mínima es el único alto
    if (!save.controlesVistos && /^(play|playgo|encorego|daily|weekly)$/.test(d.act ?? "")) { const b = t.closest<HTMLElement>("[data-act]")!; SFX.accept(); controlsGuide(() => b.click()); return; } // primera partida: antes de largar, la guía de controles
    SFX.accept();
    if (d.go) go(d.go as Scr);
    else if (d.rc) { cycleRace(d.rc); renderRace(); }
    else if (d.rctrack !== undefined) { raceCfg.cup = false; raceCfg.track = +d.rctrack as 0 | 1 | 2; saveRaceCfg(); renderRace(); }
    else if (d.act === "race") api.race();
    else if (d.act === "battle") api.battle();
    else if (d.act === "duelgo") api.duel();
    else if (d.act === "match3go") api.match3();
    else if (d.act === "play" || d.act === "playgo") api.play();
    else if (d.act === "encorego") api.play(false, true);
    else if (d.act === "encplayers") { encCfg.players = (encCfg.players >= encMax() ? 1 : encCfg.players + 1) as 1 | 2 | 3 | 4; renderEncP(); }
    else if (d.act === "playmenu") { if (ownedZones().length > 1) go("play"); else api.play(); } // con una sola zona no hay nada que elegir: largar directo
    else if (d.act === "daily") api.play(true);
    else if (d.act === "weekly") api.weekly();
    else if (d.act === "endless") api.endless();
    else if (d.act === "curse") { // ciclo: ninguna → Horda → Sin reparaciones → ambas
      const all = CURSE_SETS.map((c) => c.join()), i = all.indexOf(save.curses.join());
      save.curses = [...CURSE_SETS[(i + 1) % CURSE_SETS.length]]; persist(); renderPlay();
    }
    else if (d.act === "zone") { // el fondo cambia en el loop del menú (main.ts); estática como al cambiar de canal
      const zs = ownedZones(); save.zone = zs[(zs.indexOf(save.zone) + 1) % zs.length]; persist(); renderPlay();
      fe.classList.remove("zap"); void fe.offsetWidth; fe.classList.add("zap"); SFX.static();
    }
    else if (d.act === "pcar") { const cs = save.cars.length ? save.cars : [save.car]; save.car = cs[(cs.indexOf(save.car) + 1) % cs.length]; persist(); renderPlay(); carLbl(); } // T46: auto elegido antes de largar, queda en el guardado
    else if (d.act === "back") back();
    else if (d.act === "fullscreen") { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.(); }
    else if (d.act === "resetcfg") { // dos pasos: el primer clic pide confirmar (se desarma solo a los 4 s)
      if (armed !== "resetcfg") { armed = "resetcfg"; renderConfig(); focusSel('[data-act="resetcfg"]'); setTimeout(() => { if (armed === "resetcfg") { armed = null; if (current() === "config") renderConfig(); } }, 4000); }
      else { armed = null; resetCfg(); renderConfig(); focusSel('[data-act="resetcfg"]'); }
    }
    else if (d.act === "engtest") { initAudio(); engineTest(save.car); }
    else if (d.act === "tedit") tedit(true);
    else if (d.act && /^(reset:|psave:|pload:|swap|keepdup|calib)/.test(d.act)) ctlAct(d.act);
    else if (d.act === "export") exportSave();
    else if (d.act === "import") importSave();
    else if (d.act === "controls") { tab = "ctl"; go("config"); }
    else if (d.act === "ctlguide") controlsGuide();
    else if (d.act === "resume") api.resume();
    else if (d.act === "quit") api.quit();
    else if (d.act === "install") void installEv?.prompt().finally(() => { installEv = null; $("install").classList.add("hidden"); }); // el evento sirve una sola vez
    else if (d.tab) { tab = d.tab; renderConfig(); $("opts").scrollTop = 0; (document.querySelector(`[data-tab="${tab}"]`) as HTMLElement).focus(); }
    else if (d.tog) { const [o, k] = ref(d.tog); o[k] = !o[k]; commit(); renderConfig(); (document.querySelector(`[data-tog="${d.tog}"]`) as HTMLElement).focus(); }
    else if (d.bind) { toggleBind(d.bind); renderConfig(); focusSel(`[data-bind="${d.bind}"]`); }
    else if (paintClick(d)) { /* calcos y pintura: garage_paint.ts */ }
    else if (d.gtab) { peek.paint = undefined; gtab = d.gtab as typeof gtab; renderGarage(); $("cars").scrollTop = 0; focusSel(`[data-gtab="${gtab}"]`); }
    else if (d.beast) openBeast(d.beast as Kind);
    else if (d.bnav) beastStep(+d.bnav);
    else if (d.banim) { // Caminar queda en bucle hasta volver a pulsarlo; el resto corre una vez
      BV.anim = d.banim === "walk" && BV.anim === "walk" ? "" : d.banim as BeastAnim; BV.seq++;
      $("bmsg").textContent = d.banim === "phase" && BV.kind ? `${DEF[BV.kind].name} SE ENFURECE` : "";
      $("bmsg").classList.remove("pop"); void $("bmsg").offsetWidth; $("bmsg").classList.add("pop");
      renderBeast();
    }
    else if (d.belite !== undefined) { BV.elite = d.belite as Elite | ""; BV.anim = ""; renderBeast(); }
    else if (d.btab) { btab = d.btab as typeof btab; renderBestiary(); $("beasts").scrollTop = 0; focusSel(`[data-btab="${btab}"]`); }
    else if (d.bfilt) { bfilt = d.bfilt as typeof bfilt; renderBestiary(); $("beasts").scrollTop = 0; focusSel(`[data-bfilt="${bfilt}"]`); }
    else if (d.stab) { stab = d.stab as typeof stab; renderShop(); $("shop").scrollTop = 0; focusSel(`[data-stab="${stab}"]`); }
    else if (d.buy) {
      const id = d.buy, c = priceOf(id);
      if (owns(id) && id.startsWith("part:")) {
        const partsMatch = /^part:([^:]+):(.+)$/.exec(id);
        if (partsMatch) {
          const slot = partsMatch[1] as Slot, opt = partsMatch[2];
          save.kit = save.kit || {};
          if (save.kit[slot] === opt) {
            delete save.kit[slot];
          } else {
            save.kit[slot] = opt;
          }
          persist();
          renderShop();
          focusSel(`[data-buy="${id}"]`);
          const el = document.querySelector<HTMLElement>(`[data-buy="${id}"]`);
          if (el) {
            el.classList.add("bought-pulse");
            setTimeout(() => el.classList.remove("bought-pulse"), 600);
          }
          SFX.scrapClink();
          return;
        }
      }
      if (owns(id) || c === undefined) return;
      askBuy(nm, c, () => {
        if (!buy(id)) return;
        renderShop();
        focusSel(`[data-buy="${id}"]`);
        if (id.startsWith("part:")) {
          const el = document.querySelector<HTMLElement>(`[data-buy="${id}"]`) ?? (t.closest<HTMLElement>("[data-buy]") ?? t);
          if (el) {
            el.classList.add("bought-pulse");
            setTimeout(() => el.classList.remove("bought-pulse"), 600);
          }
        }
      });
    }
    else if (d.sf) { sfilt = d.sf as typeof sfilt; renderShop(); focusSel(`[data-sf="${sfilt}"]`); }
    else if (d.ss) { ssort = (ssort + 1) % SSORT.length; renderShop(); focusSel("[data-ss]"); }
    else if (d.hab) {
      const k = d.hab as AbilityId, l = save.abilLv[k] ?? 0, cost = abilCost(k)[l];
      if (cost === undefined || save.scrap < cost) return;
      askBuy(`${nm} nivel ${l + 1}`, cost, () => { save.scrap -= cost; save.abilLv[k] = l + 1; persist(); renderShop(); focusSel(`[data-hab="${k}"]`); });
    }
    else if (d.arma) {
      const a = d.arma, use = () => { save.weapon = a as WeaponId; persist(); renderGarage(); focusSel(`[data-arma="${a}"]`); };
      if (owns("arma:" + a)) use(); else { const c = priceOf("arma:" + a); if (c !== undefined) askBuy(nm, c, () => { if (buy("arma:" + a)) use(); }); }
    }
    else if (d.abil) { save.ability = d.abil as AbilityId; persist(); renderGarage(); focusSel(`[data-abil="${d.abil}"]`); }
    else if (d.pilot) {
      const id = "pilot:" + d.pilot, pk = d.pilot, use = () => { save.pilot = pk as PilotId; persist(); renderGarage(); focusSel(`[data-pilot="${pk}"]`); };
      if (owns(id)) use(); else { const c = priceOf(id); if (c !== undefined) askBuy(nm, c, () => { if (buy(id)) use(); }); }
    } else if (d.part) {
      const [sl, o] = d.part.split(":") as [Slot, string];
      const pp = d.part, use = () => { save.kit[sl] = o; persist(); renderGarage(); focusSel(`[data-part="${pp}"]`); };
      if (owns("part:" + pp)) use(); else { const c = priceOf("part:" + pp); if (c !== undefined) askBuy(nm, c, () => { if (buy("part:" + pp)) use(); }); }
    } else if (d.k && current() === "garage") {
      const k = d.k as CarKind;
      const use = () => { save.car = k; persist(); renderGarage(); focusSel(`.carc[data-k="${k}"]`); };
      if (owns("car:" + k)) use(); else { const c = priceOf("car:" + k); if (c !== undefined) askBuy(nm, c, () => { if (buy("car:" + k)) use(); }); }
    } else if (d.k && current() === "shop") {
      const p = PERKS.find((x) => x.k === d.k)!, cost = p.cost[save.perm[p.k]];
      if (cost === undefined || save.scrap < cost) return;
      askBuy(`${nm} nivel ${save.perm[p.k] + 1}`, cost, () => { save.scrap -= cost; save.perm[p.k]++; persist(); renderShop(); focusSel(`#shop [data-k="${p.k}"]`); });
    }
  });
  gridPointers(fe);
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
  fe.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement;
    if (!t.dataset.set || t.type !== "range") return;
    const [o, k] = ref(t.dataset.set);
    o[k] = +t.value;
    (t.nextElementSibling as HTMLElement).textContent = show2(+t.value, t.dataset.u);
    commit();
    // La nota del suavizado depende de la nitidez y la escala: se rehace sin redibujar la lista (la perilla sigue con el foco)
    const lb = document.querySelector('select[data-set="aa"]')?.closest(".row")?.querySelector(".lb");
    if (lb) { lb.querySelector(".why")?.remove(); if (warn("aa")) lb.insertAdjacentHTML("beforeend", `<small class="why">${warn("aa")}</small>`); }
  });
  fe.addEventListener("change", (e) => {
    const n = (e.target as HTMLElement).dataset.pname; // renombrar un perfil ya guardado
    if (n !== undefined && save.profiles[+n]) { save.profiles[+n]!.name = (e.target as HTMLInputElement).value.trim().slice(0, 20) || `Perfil ${+n + 1}`; persist(); return; }
    const t = e.target as HTMLSelectElement;
    if (t.tagName !== "SELECT" || !t.dataset.set) return;
    const [o, k] = ref(t.dataset.set);
    if (t.selectedOptions[0]?.disabled) { renderConfig(); return focusSel(`select[data-set="${t.dataset.set}"]`); } // opción no disponible: se ignora
    if (k === "preset") { if (t.value in PRESETS) Object.assign(save, PRESETS[t.value as Preset]); } // el preajuste fija de una vez sus cinco ajustes
    else o[k] = typeof o[k] === "number" ? +t.value : t.value;
    commit();
    renderConfig(); focusSel(`select[data-set="${t.dataset.set}"]`); // otras filas dependen de esta (preajuste, FSR)
  });
  reset("title");
}
// Módulos de pantalla sin import de este archivo: reciben lo que necesitan acá, ya evaluado todo el módulo.
initPaint({ $, focusSel, peek, persist, renderGarage, save, shownCar, tabsHtml });
initBindings({ commit, current, DEFAULT, focusSel, keyName, renderConfig, save, setArmed, TABS, armed: () => armed });
initBeast({ $, bar, focusSel, go, save });
novedades(); // cartel "Qué hay de nuevo" tras la intro
