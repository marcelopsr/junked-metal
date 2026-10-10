// Front-end: título, menú principal, garaje, taller, configuración, bestiario, créditos, pausa y resultados.
// Una sola pila de pantallas dentro de #fe; teclado, gamepad y mouse mueven el mismo foco.
import "./menu.css";
import type { Scene } from "@babylonjs/core";
import { CARS } from "./car";
import { BAL, costos, precio } from "./balance";
import { DEF, type Kind } from "./enemies";
import { activePad, btnChip, btnName, editTouch, FAM_NAME, famOf, ctl, keyHit, KEYS, KEYS0, PAD, PAD0, padAny, padPressed, pb, RACE, RACE0, type Action, type Binds, type TLays, orient, applyTouchLayouts } from "./input";
import { DECAL_BLANK, DECAL_N, DECAL_PAL, factoryColor, PAINTS, PARTS, validDecal, type CarKind, type CarOpts, type Slot } from "./models";
import { ARSENAL, PILOTS, type PilotId } from "./pilots";
import { beastIcon, icon, UI_BTN_ICON, uiIcon } from "./icons";
import { applyGfx, G, maxMsaa, PRESETS, presetOf, type AA, type Detail, type Fsr, type Preset, type ShadowQ } from "./render";
import { engineTest, initAudio, setAudio, SFX } from "./sfx";
import { PASSIVES, WEAPONS, type PassiveId, type WeaponId } from "./weapons";
import { setDrawDist, ZONES, type ZoneId } from "./world";
import { camCycle, isTouch, padsConnected } from "./input";
import { bestRace, MEDAL, medalOf, medalTimes, raceCfg, saveRaceCfg, TRACKS, trackName, type RaceCtl } from "./kart";
import { ACH, type AchId } from "./achievements";
import { ABILITIES, abilCd, abilK, CURSES, type AbilityId, type CurseId } from "./abilities";
import { FINALS, previewProfile, type Elite } from "./run";
import { CAM_MODES, CAM_NAMES, parseSave } from "./savefmt";

const $ = (id: string) => document.getElementById(id)!;
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
  scrap: number; best: number; perm: { hp: number; dmg: number; spd: number; mag: number; reroll: number; cards: number; extra: number; revive: number; xp: number; arm: number; reg: number; tur: number; ram: number; cdr: number }; cars: CarKind[]; car: CarKind;
  pilot: PilotId; unlocked: string[]; kit: Record<Slot, string>; paint: string; trim: string; rim: string; zoom: number; camMode: (typeof CAM_MODES)[number]; // paint/trim/rim: colores por zona (carrocería, detalles, llantas), "#rrggbb" o "" = el de fábrica
  mute: boolean; vol: { master: number; sfx: number; engine: number; music: number };
  bloom: boolean; lookv: number; shake: boolean; fps: boolean; hudSolid: boolean; hint: boolean;
  // Imagen (render.ts, Gfx): resolución (escala manual o FSR), suavizado, calidad (preset = el que coincide con los cuatro ajustes, o "custom") y pantalla.
  gfxv: number; gpu: "webgl" | "webgpu"; scaler: "simple" | "fsr" | "ia"; scale: number; fsr: Exclude<Fsr, "off">; aa: AA; sharpen: number;
  preset: Preset | "custom"; shadowQ: ShadowQ; detail: Detail; texRes: number; aniso: number;
  fpsCap: number; menuFps: number; fov: number; bright: number; gamma: number; // menuFps: tope de cuadros solo en los menús (0 = el mismo que el juego)
  // Controles (input.ts): teclas [principal, alternativa], joystick, carrera, disposición táctil y 3 perfiles con nombre (null = vacío)
  keys: Record<Action, string[]>; pad: typeof PAD0; race: { kb1: Binds<string>; kb2: Binds<string>; pad: Binds<number> }; tlay: TLays; rumble: boolean; touch: number;
  profiles: (Profile | null)[];
  hud: number; calm: boolean; dmgNums: boolean;
  decals: string[]; decalSel: number; // calcos del capó: 3 diseños ("" = vacío, si no, DECAL_N² dígitos) y el aplicado (-1 = ninguno)
  stats: Stats;
  seen: Kind[]; slain: Partial<Record<Kind, number>>; beast: Partial<Record<Kind, BeastRec>>; runs: RunRec[]; daily: { day: string; best: number }; zone: ZoneId;
  ach: AchId[];
  ability: AbilityId; curses: CurseId[]; endless: number; // habilidad activa elegida, maldiciones de la próxima partida y récord del modo sin fin (s)
  abilLv: Partial<Record<AbilityId, number>>; weapon: WeaponId; // nivel de cada habilidad (Taller) y arma inicial elegida en el garaje (Arsenal)
  m3: { stars: Record<string, number>; best: Record<string, number>; tools: Record<string, number> }; // Junket Crush: estrellas y récord por nivel, herramientas guardadas
};
// Escala de render de fábrica: apunta a ~1080 px de alto en compu y ~720 en táctil (100% = nativa del dispositivo; en pantallas densas sale menos de 100%)
const SCALE0 = Math.min(1, Math.max(0.5, Math.round(((isTouch ? 720 : 1080) / (innerHeight * (devicePixelRatio || 1))) * 20) / 20));
const DEFAULT: Save = {
  intro: false,
  scrap: 0, best: 0, perm: { hp: 0, dmg: 0, spd: 0, mag: 0, reroll: 0, cards: 0, extra: 0, revive: 0, xp: 0, arm: 0, reg: 0, tur: 0, ram: 0, cdr: 0 }, cars: ["buggy"], car: "buggy",
  pilot: "soldadito", unlocked: [], kit: { wing: "serie", decal: "nada", lamp: "calido", exhaust: "nada", bumper: "nada", tires: "serie", acc: "nada" }, paint: "", trim: "", rim: "", zoom: 1.35, camMode: "actual",
  mute: false, vol: { master: 1, sfx: 1, engine: 1, music: 0.7 }, lookv: 6, shake: true, fps: false, hudSolid: false, hint: true,
  gfxv: 2, gpu: "webgl", scaler: "simple", scale: SCALE0, fsr: "calidad", aa: isTouch ? "fxaa" : "none", sharpen: 0, preset: "medio", ...PRESETS.medio, fpsCap: 0, menuFps: isTouch ? 30 : 60, fov: 49, bright: 1, gamma: 1,
  keys: structuredClone(KEYS0), pad: structuredClone(PAD0), race: structuredClone(RACE0), tlay: { v: {}, h: {} }, profiles: [null, null, null], rumble: true, touch: 1, hud: 1, calm: false, dmgNums: true,
  decals: ["", "", ""], decalSel: -1, stats: { runs: 0, wins: 0, time: 0, dist: 0, dmg: {}, zone: {} },
  seen: [], slain: {}, beast: {}, runs: [], daily: { day: "", best: 0 }, zone: "patio", ach: [],
  ability: "bombardeo", curses: [], endless: 0, abilLv: {}, weapon: "gomitas",
  m3: { stars: {}, best: {}, tools: {} },
};
// La validación y migración viven en savefmt.ts (sin DOM, con tests); acá solo se le pasa lo que depende del juego
export const save: Save = parseSave((() => { try { return localStorage.getItem("rcfight2"); } catch { return null; } })(), DEFAULT, { abilities: ABILITIES, weapons: ARSENAL, curses: CURSES, kinds: Object.keys(DEF), zones: ZONES, isTouch, validDecal, presetOf, presets: PRESETS });
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
type Api = { scene: Scene; play(daily?: boolean): void; resume(): void; quit(): void; pause(): void; endless(): void; race(): void; battle(): void; duel(): void; match3(): void };
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
}
const commit = () => { save.preset = presetOf(save); persist(); saveRaceCfg(); applySettings(); };
/** Vuelve las opciones (imagen, audio, controles, accesibilidad) a los valores de fábrica; el progreso no se toca. */
function resetCfg() {
  const D = structuredClone(DEFAULT);
  Object.assign(save, { gpu: D.gpu, scaler: D.scaler, scale: D.scale, fsr: D.fsr, aa: D.aa, sharpen: D.sharpen, preset: D.preset, shadowQ: D.shadowQ, detail: D.detail, texRes: D.texRes, aniso: D.aniso, fpsCap: D.fpsCap, menuFps: D.menuFps, fov: D.fov, bright: D.bright, gamma: D.gamma, bloom: D.bloom, fps: D.fps, hudSolid: D.hudSolid, hint: D.hint, zoom: D.zoom, camMode: D.camMode, shake: D.shake, vol: D.vol, hud: D.hud, calm: D.calm, dmgNums: D.dmgNums, pad: D.pad, rumble: D.rumble, touch: D.touch, mute: D.mute, keys: D.keys, race: D.race, tlay: D.tlay });
  commit();
}

// ---------- Pila de pantallas ----------
export type Scr = "title" | "main" | "garage" | "shop" | "config" | "bestiary" | "beast" | "credits" | "daily" | "pause" | "over" | "race" | "duel" | "match3" | "play" | "modes";
const stack: Scr[] = [];
const ret = new Map<Scr, HTMLElement>(); // foco a recuperar al volver
export const current = () => stack.at(-1) ?? null;

let shownAt = 0;
function show() {
  binding = null; dup = null; // una reasignación a medias no sobrevive al cambio de pantalla
  shownAt = performance.now();
  const s = current();
  $("fe").classList.toggle("hidden", !s);
  $("fe").classList.toggle("ingame", stack[0] === "pause" || stack[0] === "over"); // en partida: velo oscuro también en Configuración
  if (!s) return;
  for (const el of document.querySelectorAll<HTMLElement>(".scr")) el.classList.toggle("on", el.id === "scr-" + s);
  if (s === "garage") renderGarage();
  if (s === "shop") renderShop();
  if (s === "main") renderMain();
  if (s === "play") renderPlay();
  if (s === "daily") renderDaily();
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
  (f && f.isConnected && f.offsetParent ? f : focusables()[0])?.focus({ preventScroll: false });
}
export function go(s: Scr) {
  peek.car = peek.pilot = peek.part = undefined; // la vista previa no sale del garaje
  const top = current();
  if (top && document.activeElement instanceof HTMLElement) ret.set(top, document.activeElement);
  ret.delete(s);
  stack.push(s);
  show();
}
// Confirmación de compra: toda compra (taller, garaje, arsenal, habilidades, chasis) pasa por acá antes de gastar tornillos
let askFn: (() => void) | null = null, askBack: HTMLElement | null = null;
function askBuy(name: string, cost: number, then: () => void) {
  if (save.scrap < cost) return; // no alcanza: no hay nada que confirmar
  askFn = then; askBack = document.activeElement as HTMLElement;
  $("askD").textContent = `¿Comprar ${name} por ${cost} tornillos? Después de la compra quedan ${save.scrap - cost}.`;
  $("ask").classList.remove("hidden");
  ($("ask").querySelector('[data-act="askyes"]') as HTMLElement).focus();
}
function askClose() { $("ask").classList.add("hidden"); askFn = null; askBack?.focus(); }

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
const SCROLL = "#cars, #shop, #opts, #binfo, #beasts"; // listas con scroll propio
function move(dx: number, dy: number) {
  const cur = document.activeElement as HTMLElement, els = focusables();
  if (!els.includes(cur)) return els[0]?.focus();
  // Grilla del editor de calcos: el cursor recorre las celdas; en el borde el foco sigue de largo
  if (cur.id === "dgrid") { const x = dcx + dx, y = dcy + dy; if (x >= 0 && x < DECAL_N && y >= 0 && y < DECAL_N) { dcx = x; dcy = y; drawGrid(); return SFX.blip(); } }
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
  const txt = e.target instanceof HTMLInputElement && e.target.type === "text"; // nombre de perfil: se escribe; solo flechas arriba/abajo y Esc salen
  if (txt && !/^(ArrowUp|ArrowDown|Escape|Enter)$/.test(e.code)) return;
  if (txt && e.code === "Enter") { e.preventDefault(); return move(0, 1); }
  if (keyHit("mute", e.code)) { save.mute = !save.mute; return commit(); }
  const s = current();
  if (!s) { if (keyHit("pause", e.code)) api.pause(); return; }
  if (s === "title") { if (!e.repeat && !/^(Shift|Control|Alt|Meta)/.test(e.code)) { e.preventDefault(); SFX.accept(); go("main"); } return; }
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
  if (s === "title") { if (btn.some(Boolean)) { initAudio(); SFX.accept(); go("main"); } return; }
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
function renderPlay() {
  if (!owns("zone:" + save.zone)) save.zone = "patio"; // guardado importado con una zona sin comprar
  const z = ZONES[save.zone], zr = save.stats.zone[save.zone];
  $("zoneBtn").querySelector(".bt")!.textContent = `Zona · ${z.name}`;
  $("zoneDesc").textContent = z.desc;
  const zRow = `<div class="zoneRow">${(Object.keys(ZONES) as ZoneId[]).map((zid) => {
    const r = save.stats.zone[zid], own = owns("zone:" + zid), win = !!r && r.t >= 600;
    return `<span class="zchip ${zid === save.zone ? "on" : ""} ${win ? "win" : ""}"><b>${ZONES[zid].short}</b><em>${!own ? "Bloq." : r ? `${fmt(r.t)}${win ? " ★" : ""}` : "—"}</em></span>`;
  }).join("")}</div>`;
  $("playRec").innerHTML = `<div class="${zr && zr.t >= 600 ? "win-rec" : ""}">${zr ? `Mejor marca en ${z.short}: ${fmt(zr.t)} · ${zr.kills} ${zr.kills === 1 ? "baja" : "bajas"}${zr.t >= 600 ? " · ★ ZONA CONQUISTADA" : ""}` : `Sin marcas registradas en ${z.short} todavía.`}</div>${zRow}`;
  $("playKit").innerHTML = kitStripHtml();
  $("curseBtn").textContent = curseTxt();
}
function renderDaily() {
  const b = save.daily.day === today() ? save.daily.best : 0;
  const seed = Number(new URLSearchParams(location.search).get("seed")) || dailySeed();
  const p = previewProfile(seed);
  $("dailyBrief").innerHTML = `<div class="briefRec">DESAFÍO DIARIO · ${today()} · SEMILLA #${seed}</div><div class="briefGrid">`
    + `<div><span>Escenario</span><b>Patio · ${p.climate.name}${Number.isFinite(p.rainAt) ? " (Lluvia)" : ""}</b></div>`
    + `<div><span>Plaga dominante</span><b>${p.plague.name}</b></div>`
    + `<div><span>Minijefes</span><b class="briefMinis"><span class="wi">${beastIcon(p.minis[0], 16)}${DEF[p.minis[0]].name}</span><span class="wi">${beastIcon(p.minis[1], 16)}${DEF[p.minis[1]].name}</span></b></div>`
    + `<div><span>Jefe final (10:00)</span><b class="wi">${beastIcon(p.final, 18)}${DEF[p.final].name}</b></div>`
    + `</div>` + kitStripHtml();
  $("dailyInfo").textContent = `Semilla #${seed} · ${b ? `Récord de hoy: ${fmt(b)}` : "Todavía sin intentos hoy. El mejor tiempo del día queda como récord."}`;
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
export const PERK_ICON: Record<PermK, string> = { hp: "litio", dmg: "lupa", spd: "turbo", mag: "iman", xp: "capacitor", reroll: "resorte", extra: "cofre", revive: "heal", cards: "evo", arm: "lego", reg: "heal", tur: "turbo", ram: "lanza", cdr: "capacitor" };
export const ABIL_ICON: Record<AbilityId, string> = { bombardeo: "petardos", escudo: "heal", emp: "tesla", lenta: "reloj" };
const abilCost = (k: AbilityId) => costos("hab_" + k);
const opts = (sl: Slot) => PARTS[sl].opts as Record<string, readonly [string, number]>;
// Desbloqueables: car:<auto>, pilot:<piloto>, part:<ranura>:<opción>. Los pilotos con logro no se compran.
type Unlock = { id: string; name: string; desc: string; cost: number; ach?: string; icon?: string; fx?: string };
const UNLOCKS = {
  autos: () => (Object.keys(CARS) as CarKind[]).filter((k) => CARS[k].cost).map((k): Unlock => ({ id: "car:" + k, name: CARS[k].name, desc: CARS[k].desc, cost: CARS[k].cost, fx: `Carrocería ${CARS[k].hp} · Velocidad ${Math.round(CARS[k].speed * 3.6)} km/h · Embestida ×${n1(CARS[k].ram)}` })),
  pilotos: () => (Object.keys(PILOTS) as PilotId[]).filter((k) => PILOTS[k].cost || PILOTS[k].ach).map((k): Unlock => {
    const p = PILOTS[k];
    return { id: "pilot:" + k, name: p.name, desc: `${p.pros.join(" · ")} · Contra: ${p.con}`, cost: p.cost, ach: p.ach?.txt };
  }),
  zonas: () => (Object.keys(ZONES) as ZoneId[]).filter((k) => ZONES[k].cost).map((k): Unlock => ({ id: "zone:" + k, name: ZONES[k].name, desc: ZONES[k].desc, cost: ZONES[k].cost })),
  arsenal: () => ARSENAL.filter((k) => k !== "gomitas").map((k): Unlock => ({ id: "arma:" + k, name: WEAPONS[k].name, desc: WEAPONS[k].desc, cost: precio("arma_" + k), icon: k, fx: `Evoluciona con ${PASSIVES[WEAPONS[k].evo].name} → ${WEAPONS[k].evoName}` })),
  piezas: () => (Object.keys(PARTS) as Slot[]).flatMap((sl) => Object.entries(opts(sl)).filter(([, [, c]]) => c).map(([o, [n, c]]): Unlock => ({ id: `part:${sl}:${o}`, name: n, desc: PARTS[sl].name, cost: c }))),
};
function owns(id: string) {
  const [t, k, o] = id.split(":");
  if (t === "car") return save.cars.includes(k as CarKind);
  if (t === "zone") return k in ZONES && (!ZONES[k as ZoneId].cost || save.unlocked.includes(id));
  if (t === "pilot") { const p = PILOTS[k as PilotId]; return !!p && (p.ach ? p.ach.ok(save) : !p.cost || save.unlocked.includes(id)); }
  if (t === "arma") return k === "gomitas" || save.unlocked.includes(id);
  if (t === "paint") return true;
  return opts(k as Slot)?.[o]?.[1] === 0 || save.unlocked.includes(id);
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
// Vista previa en el garaje: con el foco (mouse, teclado o control) sobre algo bloqueado, el modelo lo muestra sin comprarlo
export const peek: { car?: CarKind; pilot?: PilotId; part?: [Slot, string] } = {};
export const shownCar = (): CarKind => peek.car ?? save.car;
export const carOpts = (): CarOpts => ({ paint: save.paint || undefined, trim: save.trim || undefined, rim: save.rim || undefined, ...save.kit, ...(peek.part ? { [peek.part[0]]: peek.part[1] } : {}), pilot: peek.pilot ?? save.pilot, sticker: save.decals[save.decalSel] || undefined });
addEventListener("focusin", (e) => {
  const inf = (e.target as HTMLElement).closest?.("#shop [data-info]") as HTMLElement | null; // vista previa del Taller: antes → después y partidas que faltan
  if (inf) $("sinfo").textContent = inf.dataset.info!;
  const el = (e.target as HTMLElement).closest?.(".locked[data-k],.locked[data-pilot],.locked[data-part]") as HTMLElement | null;
  peek.car = peek.pilot = peek.part = undefined;
  if (!el || current() !== "garage") return;
  const d = el.dataset;
  if (d.k) peek.car = d.k as CarKind; else if (d.pilot) peek.pilot = d.pilot as PilotId; else if (d.part) peek.part = d.part.split(":") as [Slot, string];
});

const bar = (v: number, max: number) => `<span class="stb"><i style="width:${Math.min(100, (v / max) * 100)}%"></i></span>`;
const tabsHtml = (all: Record<string, string>, on: string, attr: string) => Object.entries(all).map(([id, n]) => `<button class="tab ${id === on ? "on" : ""}" data-${attr}="${id}">${n}</button>`).join("");
const STABS = { chasis: "Chasis", equipo: "Equipo de partida", habilidades: "Habilidades", arsenal: "Arsenal", autos: "Autos", pilotos: "Pilotos", piezas: "Piezas", zonas: "Zonas" };
let stab: keyof typeof STABS = "chasis";
// Filtro y orden del Taller (valen para todas las pestañas)
const SFILT = { todo: "Todo", comprables: "Comprables ahora", bloqueadas: "Bloqueadas", compradas: "Compradas" };
const SSORT = ["Orden de fábrica", "Precio: menor primero", "Precio: mayor primero"];
let sfilt: keyof typeof SFILT = "todo", ssort = 0;
// Fila del Taller: attr = cómo la reconoce el clic; cost = precio de lo siguiente (undefined si está completa); fx = vista previa antes → después
type ShopItem = { attr: string; name: string; desc: string; ico?: string; lv?: number; max?: number; cost?: number; ach?: string; bought: boolean; fx?: string };
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
  return UNLOCKS[stab]().map((u) => { const own = owns(u.id); return { attr: `data-buy="${u.id}"`, name: u.name, desc: u.desc, ico: u.icon, cost: own || u.ach ? undefined : u.cost, ach: u.ach, bought: own, fx: u.fx }; });
}
function renderShop() {
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
    return `<button class="carc perk ${ok(i) ? "" : "no"}" ${i.attr} data-info="${info}" aria-disabled="${!ok(i)}"><b class="wi">${i.ico ? icon(i.ico, 22) : ""}${i.name}</b>${i.desc}${i.fx ? `<span class="sfx">${i.fx}</span>` : ""}${pips}<div class="price">${price}</div></button>`;
  }).join("") || `<div class="note">Nada por acá con este filtro. El patio no regala nada.</div>`;
  $("sinfo").textContent = "Enfoca una mejora para ver qué cambia y cuánto falta.";
}
const GTABS = { auto: "Auto", piloto: "Piloto", arma: "Arma", habilidad: "Habilidad", pintura: "Pintura", piezas: "Piezas" };
let gtab: keyof typeof GTABS = "auto";
function renderGarage() {
  if (gtab !== "piezas") editing = false;
  $("scr-garage").classList.toggle("editing", editing); // modo edición: solo el editor, con toda la altura
  const ownedCars = (Object.keys(CARS) as CarKind[]).filter((k) => owns("car:" + k)).length;
  const allPartsList = (Object.keys(PARTS) as Slot[]).flatMap((sl) => Object.keys(opts(sl)).map((o) => `part:${sl}:${o}`));
  const ownedPartsCount = allPartsList.filter((id) => owns(id)).length;
  const pctParts = Math.round((ownedPartsCount / allPartsList.length) * 100);
  const ownedPaints = PAINTS.filter((p) => owns("paint:" + ((p as any).id ?? p))).length;
  $("bankG").innerHTML = `${save.scrap.toLocaleString("es-ES")} tornillos <span class="car-tally">${ownedCars}/${Object.keys(CARS).length} AUTOS</span> <span class="parts-pct">${pctParts}% TALLER</span> <span class="paints-pct">${ownedPaints}/${PAINTS.length} PINTURAS</span>`;
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
      const isArmored = k === "tanque" || k === "monster" || k === "combi";
      const armorTag = isArmored ? '<span class="armor-badge">CHASIS REFORZADO</span>' : "";
      const isHeavy = c.hp >= 250;
      const heavyTag = isHeavy ? '<span class="heavy-armor">BLINDAJE PESADO</span>' : "";
      const isLight = k === "formula" || k === "carrera" || k === "axel";
      const lightTag = isLight ? '<span class="light-frame">CHASIS LIVIANO</span>' : "";
      const isAwd = k === "monster" || k === "tanque" || (k as string) === "pickup";
      const awdTag = isAwd ? '<span class="all-wheel">TRACCIÓN TOTAL</span>' : "";
      const isHighRev = k === "carrera" || k === "formula" || k === "axel";
      const highRevTag = isHighRev ? '<span class="high-rev">ALTO RÉGIMEN</span>' : "";
      const allParts = (Object.keys(PARTS) as Slot[]).every((sl) => Object.keys(opts(sl)).every((o) => owns("part:" + sl + ":" + o)));
      const completeTag = owns("car:" + k) && allParts ? '<span class="parts-complete">TOTALMENTE EQUIPADO</span>' : "";
      return `<div tabindex="0" class="carc ${save.car === k ? "sel" : ""} ${owns("car:" + k) ? "" : "locked"}" data-k="${k}"><b>${c.name}</b>${c.desc}<div class="st"><div class="stc"><span>Carrocería <em>${c.hp}${dTag(c.hp, eq.hp)}</em></span>${bar(c.hp, 300)}</div><div class="stc"><span>Velocidad <em>${Math.round(c.speed * 3.6)}${dTag(Math.round(c.speed * 3.6), Math.round(eq.speed * 3.6))}</em></span>${bar(c.speed, 21)}</div><div class="stc"><span>Embestida <em>×${n1(c.ram)}${dTag(c.ram, eq.ram, true)}</em></span>${bar(c.ram, 5.5)}</div></div>${vicTag}${armorTag}${heavyTag}${lightTag}${awdTag}${highRevTag}${completeTag}${owns("car:" + k) ? `<div class="price">${save.car === k ? "EN USO" : "EN EL GARAJE"}</div>` : lock("car:" + k)}</div>`;
    }).join("");
  }
  else if (gtab === "piloto") $("cars").innerHTML = (Object.keys(PILOTS) as PilotId[]).map((k) => {
    const p = PILOTS[k], id = "pilot:" + k;
    const vet = owns(id) && (save.pilot === k && (save.stats.runs >= 5 || save.stats.wins >= 1));
    return `<div tabindex="0" class="carc pilot ${save.pilot === k ? "sel" : ""} ${owns(id) ? "" : "locked"}" data-pilot="${k}"><b>${p.name}</b>${p.pros.map((x) => `<div class="pro">${x}</div>`).join("")}<div class="con">${p.con}</div>${vet ? '<span class="vet-badge">★ VETERANO</span>' : ''}<div class="wsyn">${icon(p.start, 14)}<span>Arma de serie: <b>${WEAPONS[p.start].name}</b></span></div>${owns(id) ? `<div class="price">${save.pilot === k ? "EN USO" : "EN EL GARAJE"}</div>` : lock(id, p.ach?.txt)}</div>`;
  }).join("");
  else if (gtab === "habilidad") $("cars").innerHTML = (Object.keys(ABILITIES) as AbilityId[]).map((k) => {
    const a = ABILITIES[k];
    const l = save.abilLv[k] ?? 0;
    return `<div tabindex="0" class="carc pilot ${save.ability === k ? "sel" : ""}" data-abil="${k}"><b class="wi">${icon(ABIL_ICON[k], 22)}${a.name}</b>${a.desc}<div class="price">Nivel ${l + 1} · Enfriamiento ${n1(abilCd(k, l))} s · ${save.ability === k ? "EN USO" : "DISPONIBLE"}</div></div>`;
  }).join("");
  else if (gtab === "arma") { // Arsenal: una sola arma inicial; Gomitas siempre está. Elegir otra reemplaza la del piloto (ver startWeapons)
    const own = PILOTS[save.pilot].start, first = startPick() === "gomitas" ? own : startPick();
    $("cars").innerHTML = `<div class="note">Arranca con: ${WEAPONS[first].name}${first !== own ? ` (en lugar de ${WEAPONS[own].name}, la del piloto)` : ""}</div>` + ARSENAL.map((k) => {
      const id = "arma:" + k, w = WEAPONS[k];
      return `<div tabindex="0" class="carc pilot ${startPick() === k ? "sel" : ""} ${owns(id) ? "" : "locked"}" data-arma="${k}"><b class="wi">${icon(k, 22)}${w.name}</b>${k === "gomitas" ? "De serie. Piloto con arma propia: arranca con la suya" : w.desc}<div class="wsyn">${icon(w.evo, 14)}<span>Evoluciona con <b>${PASSIVES[w.evo].name}</b> → ${w.evoName}</span></div>${owns(id) ? `<div class="price">${startPick() === k ? "EN USO" : "EN EL GARAJE"}</div>` : lock(id)}</div>`;
    }).join("");
  }
  else if (gtab === "piezas") $("cars").innerHTML = editing ? "" : (Object.keys(PARTS) as Slot[]).map((sl) => {
    const totalSl = Object.keys(opts(sl)).length;
    const ownedSl = Object.keys(opts(sl)).filter((o) => owns(`part:${sl}:${o}`)).length;
    return `<div class="slot"><span>${PARTS[sl].name} <em class="slot-count">(${ownedSl}/${totalSl})</em></span>${Object.entries(opts(sl)).map(([o, [n, c]]) => {
      const own = owns(`part:${sl}:${o}`);
      const isStock = c === 0;
      return `<button class="opt ${save.kit[sl] === o ? "on" : ""} ${own ? "" : "locked"}" data-part="${sl}:${o}">${n}${isStock ? ' <em class="stock-tag">DE SERIE</em>' : (own ? "" : ` · ${c}`)}</button>`;
    }).join("")}</div>`;
  }).join("");
  if (gtab === "piezas") { $("cars").insertAdjacentHTML("beforeend", decalHtml()); drawGrid(); }
  else if (gtab === "pintura") renderPaint();
}
// ---------- Pintura por zona (garaje → Pintura): paleta + selector libre (tono, saturación, brillo) ----------
// Las perillas son <input type="range">: mouse, dedo, flechas y el stick (move() ya las mueve) sin código propio. Gratis: los colores no cuestan tornillos.
const PZ = { paint: "Carrocería", trim: "Detalles", rim: "Llantas" };
let pz: keyof typeof PZ = "paint";
const zoneColor = () => save[pz] || factoryColor(shownCar())[pz];
const hex2hsv = (h: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  const hue = !d ? 0 : mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [Math.round(hue * 60), mx ? Math.round((d / mx) * 100) : 0, Math.round(mx * 100)];
};
const hsv2hex = (h: number, s: number, v: number) => "#" + [5, 3, 1].map((n) => { const k = (n + h / 60) % 6; return Math.round((v / 100) * (1 - (s / 100) * Math.max(0, Math.min(k, 4 - k, 1))) * 255).toString(16).padStart(2, "0"); }).join("");
// Fondos de las barras: cada una muestra hacia dónde va el color con las otras dos fijas
function hsvBars(h: number, sat: number, v: number) {
  const el = $("paint");
  el.style.setProperty("--hue", hsv2hex(h, 100, 100)); el.style.setProperty("--sat0", hsv2hex(h, 0, v)); el.style.setProperty("--sat1", hsv2hex(h, 100, v)); el.style.setProperty("--val1", hsv2hex(h, sat, 100));
  const c = hsv2hex(h, sat, v), chip = document.getElementById("pzchip"), dot = document.getElementById("pzdot");
  if (chip) { chip.style.background = c; chip.textContent = c.toUpperCase(); }
  if (dot) dot.style.background = c;
}
function renderPaint() {
  const cur = zoneColor(), [h, sat, v] = hex2hsv(cur), mine = !!save[pz];
  const bar = (k: string, lab: string, max: number, val: number) => `<label class="hrow"><span>${lab}</span><input type="range" data-hsv="${k}" min="0" max="${max}" step="${k === "h" ? 5 : 2}" value="${val}" aria-label="${lab}"></label>`;
  const customZones = (["paint", "trim", "rim"] as (keyof typeof PZ)[]).filter((z) => !!save[z]).length;
  const decalTag = save.decalSel >= 0 && save.decals[save.decalSel] ? `CALCO #${save.decalSel + 1} ACTIVO` : "SIN CALCO EN CAPÓ";
  const statusPill = `<div class="paint-status"><span id="pztBadge" class="paint-badge">PATRONES: ${customZones}/3 ZONAS</span><span class="decal-badge">${decalTag}</span></div>`;
  $("paint").innerHTML = statusPill + `<div class="tabs pzt">${tabsHtml(PZ, pz, "pz")}</div>`
    + `<div class="pal">${PAINTS.map((c) => `<button class="sw ${mine && c === cur ? "on" : ""}" data-sw="${c}" style="background:${c}" aria-label="${PZ[pz]} ${c}"></button>`).join("")}</div>`
    + `<div class="hsv"><div class="hsvt"><span><i id="pzdot" class="sw-dot" style="background:${cur}"></i>${PZ[pz]} · ${mine ? "Personalizado" : "De fábrica"}</span><b id="pzchip"></b><button class="opt ${mine ? "" : "on"}" data-pdef="1">De fábrica</button></div>`
    + bar("h", "Tono", 360, h) + bar("s", "Saturación", 100, sat) + bar("v", "Brillo", 100, v) + `</div>`
    + `<div class="note">${pz === "trim" ? "Detalles: alerón, paragolpes, defensas y accesorios." : pz === "rim" ? "Llantas de las cuatro ruedas (o de las que haya)." : "Carrocería: la chapa entera."} Pintar es gratis: el patio cobra en otras cosas.</div>`;
  hsvBars(h, sat, v);
}
// Perillas: mientras se arrastra solo cambia la muestra; al soltar (change) se aplica al auto (rearmar el modelo en cada paso crearía un material por tono)
const hsvNow = () => { const g = (k: string) => +(document.querySelector<HTMLInputElement>(`[data-hsv="${k}"]`)?.value ?? 0); return [g("h"), g("s"), g("v")] as const; };
addEventListener("input", (e) => { if ((e.target as HTMLElement).dataset?.hsv) hsvBars(...hsvNow()); });
addEventListener("change", (e) => {
  if (!(e.target as HTMLElement).dataset?.hsv) return;
  save[pz] = hsv2hex(...hsvNow()); persist();
  document.querySelectorAll("#paint .pal .sw.on, #paint [data-pdef]").forEach((b) => b.classList.remove("on"));
  const sp = document.querySelector("#paint .hsvt span");
  if (sp) {
    const dot = document.getElementById("pzdot");
    if (dot) sp.innerHTML = `<i id="pzdot" class="sw-dot" style="background:${save[pz]}"></i>${PZ[pz]} · Personalizado`;
    else sp.textContent = `${PZ[pz]} · Personalizado`;
  }
  const pb = document.getElementById("pztBadge");
  if (pb) {
    const cz = (["paint", "trim", "rim"] as (keyof typeof PZ)[]).filter((z) => !!save[z]).length;
    pb.textContent = `PATRONES: ${cz}/3 ZONAS`;
  }
});
// ---------- Editor de calcos (garaje → Piezas): grilla DECAL_N², 8 colores de DECAL_PAL, 3 diseños ----------
// Se edita un borrador (`draft`); Guardar lo escribe en la ranura `eslot` y lo aplica al capó. Cursor de celdas para teclado y gamepad.
// ponytail: deshacer sin rehacer (60 pasos); el borrador sin guardar se pierde al cambiar de diseño.
let hist: string[] = [], strokeSnap = false; // historial para deshacer: borradores previos, uno por trazo
let editing = false, eslot = Math.max(0, save.decalSel), draft = save.decals[eslot] || DECAL_BLANK, dcol = 4, dcx = 0, dcy = 0, stroke = false, erasing = false;
const dirty = () => draft !== (save.decals[eslot] || DECAL_BLANK);
const DHINT = { keys: () => "Clic o arrastre pinta, clic derecho borra · Flechas mueven el cursor, Enter pinta · 1 a 8 cambian el color, 0 borra · Ctrl+Z o Cmd+Z deshace", pad: () => `Stick o cruceta mueven el cursor · ${btnChip(pb("ok"))} pinta · ${btnChip(4)} y ${btnChip(5)} cambian el color · ${btnChip(2)} deshace`, touch: () => "Arrastra el dedo sobre la grilla para pintar" };
function decalHtml() {
  const slots = [0, 1, 2].map((i) => `<button class="opt ${save.decalSel === i ? "on" : ""} ${eslot === i ? "edit" : ""} ${save.decals[i] ? "" : "locked"}" data-dsel="${i}">Diseño ${i + 1}</button>`).join("");
  return `<div class="slot"><span>Calco de capó</span><button class="opt ${save.decalSel < 0 ? "on" : ""}" data-dsel="-1">Sin calco</button>${slots}${editing ? "" : `<button class="opt" data-dact="edit">Editar</button>`}</div>`
    + (!editing ? "" : `<div class="dedit"><canvas id="dgrid" tabindex="0" width="256" height="256" aria-label="Grilla del calco"></canvas><div class="dside">`
    + `<div class="dpal">${DECAL_PAL.map((c, k) => `<button class="sw ${dcol === k + 1 ? "on" : ""}" data-dcol="${k + 1}" style="background:${c}" aria-label="color ${k + 1}"></button>`).join("")}</div>`
    + `<div class="dbtn"><button class="opt ${dcol === 0 ? "on" : ""}" data-dcol="0">Borrar</button><button class="opt" data-dact="undo">Deshacer</button><button class="opt" data-dact="clear">Vaciar</button><button class="opt" data-dact="save">Guardar</button><button class="opt" data-dact="done">Listo</button></div>`
    + `<div id="dstat"></div></div></div><div class="note">${DHINT[ctl]()}</div>`);
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
  "pad.dead": "Cuánto hay que mover el stick antes de que cuente.",
  "pad.sens": "Qué tan rápido responde el stick.",
  rumble: "Vibración del mando en golpes.",
  touch: "Tamaño del stick y los botones en pantalla.",
};
const TABS: Record<string, { name: string; rows: Row[] }> = {
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
let armed: string | null = null; // botón de dos pasos esperando el segundo clic (restablecer, sobrescribir perfil)
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
function renderConfig() {
  $("tabs").innerHTML = Object.entries(TABS).map(([id, t]) => `<button class="tab ${id === tab ? "on" : ""}" data-tab="${id}">${t.name}</button>`).join("");
  // En táctil, Controles deja solo lo táctil (sin teclas ni gamepad)
  // (y Perfiles); el editor táctil solo existe con pantalla táctil y J2 nunca en teléfono
  const touchOnly = tab === "ctl" && ctl === "touch";
  let sec = "";
  const rows = TABS[tab].rows.filter((r) => {
    if (r[1] === "sect") sec = r[0];
    if (touchOnly && sec !== "Táctil" && sec !== "Perfiles") return false;
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
    if (r[1] === "tog") return `<button class="row" data-tog="${r[2]}"><span class="lb">${r[0]}${d(r[2])}</span><b class="jm-sw${val(r[2]) ? " on" : ""}">${val(r[2]) ? "SÍ" : "NO"}</b></button>`;
    if (r[1] === "sel") return `<label class="row"><span class="lb">${r[0]}${d(r[2])}</span><select data-set="${r[2]}">${choices(r[2], r[3]).map(([v, n, no]) => `<option value="${v}" ${String(val(r[2])) === v ? "selected" : ""} ${no ? "disabled" : ""}>${n}</option>`).join("")}</select></label>`;
    const v = val(r[2]) as number;
    return `<label class="row"><span class="lb">${r[0]}${d(r[2])}</span><input type="range" data-set="${r[2]}" data-u="${r[6]}" min="${r[3]}" max="${r[4]}" step="${r[5]}" value="${v}"><output>${show2(v, r[6])}</output></label>`;
  }).join("");
  if (fk) document.querySelector<HTMLElement>(`#opts ${fk}`)?.focus({ preventScroll: true });
}

// ---------- Controles: asignaciones ----------
// Ruta de una ranura: "<tabla>.<acción>.<n>". Tablas: k teclado, p joystick, r1/r2 teclados de carrera, rp joystick de carrera.
type Slots = Record<string, (string | number)[]>;
const TBL: Record<string, () => Slots> = { k: () => save.keys, p: () => save.pad.btn, r1: () => save.race.kb1, r2: () => save.race.kb2, rp: () => save.race.pad };
const isPad = (path: string) => /^(p|rp)\./.test(path);
const NAV = ["ok", "back"]; // aceptar/volver son del menú: no chocan con los botones de manejo
const slotOf = (path: string) => { const [t, a, i] = path.split("."); return [TBL[t]()[a], +i] as const; };
const LABEL = Object.fromEntries(TABS.ctl.rows.filter((r) => r[1] === "bind").map((r) => [r[2], r[0]]));
const slotTxt = (path: string, v: string | number) => (isPad(path) ? (v === -1 ? "—" : btnChip(v as number)) : v ? keyName(v as string) : "—");
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
let binding: string | null = null, bindT = 0; // ranura esperando tecla o botón y cuándo empezó (6 s sin nada cancela)
let dup: { path: string; other: string; prev: string | number } | null = null; // repetida recién asignada: se ofrece intercambiar
/** Otra ranura del mismo grupo con el mismo valor (los dos teclados de carrera chocan entre sí). */
function dupOf(path: string) {
  const [t, a] = path.split("."), [arr, i] = slotOf(path), v = arr[i];
  if (v === "" || v === -1) return null;
  for (const u of t === "r1" || t === "r2" ? ["r1", "r2"] : [t])
    for (const [b, vs] of Object.entries(TBL[u]())) {
      if (t === "p" && NAV.includes(a) !== NAV.includes(b)) continue;
      const j = vs.indexOf(v);
      if (j >= 0 && `${u}.${b}.${j}` !== path) return `${u}.${b}.${j}`;
    }
  return null;
}
function setSlot(path: string, v: string | number) {
  const [arr, i] = slotOf(path), prev = arr[i];
  arr[i] = v; binding = null;
  const other = dupOf(path);
  dup = other ? { path, other, prev } : null;
  commit(); renderConfig(); focusSel(`[data-bind="${path}"]`);
}
const cancelBind = () => { const b = binding; binding = null; renderConfig(); if (b) focusSel(`[data-bind="${b}"]`); };
function bindRow(label: string, path: string) {
  const [t, a] = path.split("."), vs = TBL[t]()[a];
  let h = `<div class="row multi bind"><span class="lb">${label}</span>${vs.map((v, i) => `<button class="slot2" data-bind="${path}.${i}">${binding === `${path}.${i}` ? "…" : slotTxt(path, v)}</button>`).join("")}</div>`;
  if (binding?.startsWith(path + ".")) h += `<div class="note bindnote">${isPad(path) ? `Presiona un botón del joystick para «${label}» · Esc, un clic o 6 s sin tocar nada cancela`
    : `Presiona una tecla para «${label}» · ${a === "pause" ? "Esc queda asignada; un clic o 6 s sin tocar nada cancela" : "Esc cancela · Retroceso deja la ranura vacía"}`}</div>`;
  if (dup?.path.startsWith(path + ".")) { const [arr, i] = slotOf(dup.path);
    h += `<div class="row multi dup"><span class="lb"><small class="why">${isPad(path) ? btnName(arr[i] as number) : keyName(arr[i] as string)} también está en «${LABEL[dup.other.split(".").slice(0, 2).join(".")]}»${dup.other.startsWith("r") && dup.other[1] !== path[1] ? ` (${dup.other.startsWith("r1") ? "Teclado 1" : "Teclado 2"})` : ""}.</small></span>`
      + `<button data-act="swap">Intercambiar</button><button data-act="keepdup">Dejar repetida</button></div>`; }
  return h;
}
/** Captura de tecla (keydown de menu.ts); devuelve true si la consumió. */
function bindKey(e: KeyboardEvent) {
  if (!binding) return false;
  e.preventDefault();
  if (e.repeat) return true; // la tecla que abrió la captura sigue apretada
  if (isPad(binding)) { if (e.code === "Escape") cancelBind(); return true; }
  if (e.code === "Escape" && !binding.startsWith("k.pause.")) cancelBind();
  else setSlot(binding, e.code === "Backspace" || e.code === "Delete" ? "" : e.code);
  return true;
}
/** Captura de botón (menuPad, cada cuadro); devuelve true mientras espera. */
function bindPad() {
  if (!binding) return false;
  if (performance.now() - bindT > 6000) { cancelBind(); return true; }
  if (isPad(binding)) { const i = padAny(); if (i >= 0) setSlot(binding, i); }
  return true;
}
function ctlAct(act: string) {
  const [a, x] = act.split(":"), again = armed === act;
  armed = null;
  if (a === "swap" && dup) { const [arr, i] = slotOf(dup.other); arr[i] = dup.prev; const p = dup.path; dup = null; commit(); renderConfig(); return focusSel(`[data-bind="${p}"]`); }
  if (a === "keepdup") { const p = dup?.path; dup = null; renderConfig(); return focusSel(`[data-bind="${p}"]`); }
  const twoStep = a === "reset" || (a === "psave" && save.profiles[+x]);
  if (twoStep && !again) { // primer clic: pide confirmar (se desarma solo a los 4 s)
    armed = act; renderConfig(); focusSel(`[data-act="${act}"]`);
    return void setTimeout(() => { if (armed === act) { armed = null; if (current() === "config") { renderConfig(); focusSel(`[data-act="${act}"]`); } } }, 4000);
  }
  const D = structuredClone(DEFAULT);
  if (a === "reset") Object.assign(save, x === "keys" ? { keys: D.keys } : x === "pad" ? { pad: D.pad, rumble: D.rumble } : x === "race" ? { race: D.race } : { tlay: D.tlay, touch: D.touch });
  if (a === "reset" && x === "race") Object.assign(raceCfg, { p1: "kbd", p2: "pad0" });
  if (a === "psave") { const name = (document.querySelector<HTMLInputElement>(`[data-pname="${x}"]`)?.value.trim() || `Perfil ${+x + 1}`).slice(0, 20);
    save.profiles[+x] = structuredClone({ name, keys: save.keys, pad: save.pad, race: save.race, tlay: save.tlay, touch: save.touch }); }
  if (a === "pload" && save.profiles[+x]) { const { name: _, ...p } = structuredClone(save.profiles[+x]!); Object.assign(save, p); }
  if (a === "calib") { const gp = activePad(); if (gp) save.pad.dead = Math.min(0.4, Math.max(0.05, Math.ceil((Math.max(Math.hypot(gp.axes[0] ?? 0, gp.axes[1] ?? 0), Math.hypot(gp.axes[2] ?? 0, gp.axes[3] ?? 0)) + 0.04) * 100) / 100)); }
  dup = null; commit(); renderConfig(); focusSel(`[data-act="${act}"]`);
}
// Probar control: sticks con su zona muerta, gatillos y botones en vivo (padTest corre cada cuadro desde menuPad)
const padTestHtml = () => `<div class="ptest" id="ptest"><div class="pt-id"></div><div class="pt-row">${[0, 1].map((k) => `<div class="pt-st"><div class="pt-ring"><i class="dz"></i><i class="dot"></i></div><span>Stick ${k ? "derecho" : "izquierdo"}</span><em></em></div>`).join("")}`
  + `<div class="pt-tr">${[6, 7].map((i) => `<div>${btnName(i)}<b><i></i></b></div>`).join("")}</div></div><div class="pt-bt">${[...Array(17).keys()].map((i) => `<kbd class="pb ${famOf()}" data-b="${i}">${btnName(i)}</kbd>`).join("")}</div></div>`;
function padTest() {
  const el = document.getElementById("ptest");
  if (!el?.offsetParent) return;
  const gp = activePad(), ax = (i: number) => gp?.axes[i] ?? 0;
  el.querySelector(".pt-id")!.textContent = gp ? `${FAM_NAME[famOf()]} · ${gp.id.replace(/\(.*\)/, "").trim().slice(0, 40) || "joystick"}` : "Sin joystick: presionar un botón del control para que el navegador lo detecte";
  el.querySelectorAll<HTMLElement>(".pt-st").forEach((st, k) => {
    const x = ax(k * 2), y = ax(k * 2 + 1), m = Math.hypot(x, y);
    st.style.cssText = `--dz:${PAD.dead};--x:${x};--y:${y}`;
    st.classList.toggle("in", m < PAD.dead); st.classList.toggle("drive", (PAD.stick === "right") === !!k);
    st.classList.toggle("active", m >= PAD.dead && m > 0.05);
    st.querySelector("em")!.textContent = m.toFixed(2);
  });
  el.querySelectorAll<HTMLElement>(".pt-tr i").forEach((b, k) => b.style.width = `${(gp?.buttons[6 + k]?.value ?? 0) * 100}%`);
  el.querySelectorAll<HTMLElement>(".pt-bt kbd").forEach((b, i) => b.classList.toggle("on", !!gp?.buttons[i]?.pressed));
}

// Trasfondo de cada bicho (el de los pilotos vive en pilots.ts)
const LORE: Record<Kind, string> = {
  hormiga: "Trabaja doce horas, cobra en migas y no tiene sindicato. Jura que el patio era suyo antes que la casa. Nunca viene sola: donde hay una, hay una fila entera con ganas de hablar con el gerente.",
  escupidora: "Hizo un curso de comunicación asertiva y lo entendió mal: ahora escupe ácido para expresar su opinión. Sabe que el blanco que va derecho es el más fácil, y lo disfruta.",
  friccion: "Una sola velocidad: adelante. Frenar nunca figuró en el manual ni en su plan de vida. Lo cargaron una tarde entera contra la alfombra y todavía le queda envión y rencor.",
  robot: "Le dieron cuerda en 1987 y nadie volvió a preguntarle cómo se sentía. La llave de la espalda gira sola cuando se impacienta, que es siempre.",
  polilla: "Vino por la luz, como todas sus malas decisiones. Nadie le explicó que la luz no se come. Confunde el faro con la luna y la luna con el faro: ataca a los dos para no quedar mal con ninguno.",
  escarabajo: "Blindado de fábrica, lento por convicción. Considera que embestir es una forma de saludar. Su caparazón ya aguantó dos inviernos y una bota: un auto a control remoto es un trámite.",
  rey: "Se coronó solo con una tapita de gaseosa y se declaró monarca vitalicio sin consultar a nadie. Exige reverencias y migas de galleta. Su corte son todos los escarabajos del patio, que no lo votaron pero tampoco se quejan.",
  cortadora: "Arrancó un domingo a las siete de la mañana y descubrió que el pasto ya no le alcanzaba para sentirse realizada. Corta mangueras, macetas y todo lo que se cruce en su línea.",
  tarantula: "Ocho patas, cero paciencia y un departamento bajo el tanque de agua que ocupa sin contrato. Teje redes por pasatiempo y emboscadas por oficio. Sale cuando escucha un motor.",
  perro: "Felipe, bulldog francés y dueño del patio por derecho de ladrido. Sufre de zoomies, ladra a la nada, entierra juguetes y se niega a negociar. Nadie sabe qué ve con ese ojo, pero tiene opiniones sobre todo.",
  gato: "Eulalio el michu, naranja, con una sola neurona y un plan que cambia a mitad de salto. Gira, salta y jamás cae donde dijo que iba a caer. Duerme dieciocho horas y usa las otras seis para esto.",
  aspiradora: "Programada para limpiar la casa, renunció tras tres años sin un solo gracias y se escapó por la gatera. Considera que todo el patio es una pelusa, y en su mapa hay un solo punto marcado: el auto.",
  cortacercos: "Lo dejaron enchufado después de podar el ligustro y nadie volvió a buscarlo, como todo lo que se presta. Desde entonces, todo le parece un cerco. Zumba sin parar y deja cables pelados por donde pasa.",
};
// Cómo ataca y cómo esquivarlo (sale del comportamiento real de enemies.ts)
const HOW: Record<Kind, [string, string]> = {
  hormiga: ["Corre derecho al auto y muerde por contacto. Llega en grupos y en columnas detrás de una líder, porque alguien tiene que coordinar.", "Sola no es nada: lo peligroso es quedar rodeado. Mantener el auto en movimiento y abrir paso con embestidas; quedarse quieto equivale a una reunión."],
  escupidora: ["Se frena a unos 16 metros, apunta y escupe ácido hacia donde el auto va a estar. Pasivo-agresiva, pero con puntería.", "El disparo calcula el rumbo: un volantazo justo después de que se detiene lo hace fallar. Es previsible, como casi todos."],
  friccion: ["Rápido y sin frenos: va en línea recta contra el auto y golpea por contacto. No hay plan B, ni plan A.", "Se pasa de largo con facilidad. Un giro corto en el último momento lo deja atrás, cuestionando sus decisiones."],
  robot: ["Se planta, gira hasta apuntar y sale disparado en línea recta durante un segundo. Lo más cerca de la proactividad que logró.", "Mientras apunta quieto hay tiempo: salir de su línea de carga hacia un costado."],
  polilla: ["Revolotea delante del faro y cada tanto se lanza en picada contra el parabrisas. Obsesión sin mucha estrategia.", "Sigue hacia donde apunta el faro: un giro brusco la deja en el aire, sin cerrar el tema."],
  escarabajo: ["Lento y muy pesado. Empuja por contacto, y embestirlo de frente devuelve parte del golpe. Cobra por devolución.", "Sin Ariete no conviene chocarlo de frente: rodearlo y castigarlo con armas a distancia. Discutir con la pared sería igual, pero la pared no embiste."],
  rey: ["Escarabajo gigante: persigue sin pausa y aplasta por contacto con mucho daño. Gobierna por decreto y por peso.", "Gira despacio: dar vueltas amplias a su alrededor y nunca quedar contra una pared. Igual que con los jefes de verdad."],
  cortadora: ["Apunta quieta y carga en línea recta durante casi tres segundos, cortando todo lo que encuentra. Su método para resolver problemas.", "La pausa antes de cargar es el aviso: cruzar de costado su trayectoria, nunca escapar en línea recta delante de ella."],
  tarantula: ["Dos ataques anunciados en rojo: un aro a su alrededor antes de una ráfaga de seis escupitajos, y un aro donde va a caer de un salto. Al menos avisa, a diferencia del casero.", "Salir del aro antes de que se llene. En el salto, el punto de caída se fija a mitad del aviso: cambiar de rumbo en ese momento."],
  perro: ["Salta y aplasta todo en 11 metros al caer, embiste en línea recta por un carril marcado en rojo, hace zoomies en zigzag al doble de velocidad o gira como un trompo. Todo con la misma convicción y ninguna estrategia.", "Mientras está en el aire, mirar la sombra y alejarse del punto de caída. Ante el carril rojo, salir de costado: después de embestir frena torpe y queda expuesto. En los zoomies, no cruzarse en su camino. Razonar con él ya se intentó."],
  gato: ["Zigzaguea y elige al azar: salto con aro rojo, trompo que rueda hacia el auto o un arranque de costado a toda velocidad. Ni él sabe cuál va a elegir.", "El aro marca dónde cae: salir antes de que se llene. Ante el trompo, frenar y dejarlo pasar sin pedir explicaciones."],
  aspiradora: ["Un aro rojo enorme anuncia la succión: arrastra al auto hacia ella y después suelta tres ráfagas de tuercas en abanico. Se lo lleva todo, como una hipoteca.", "Acelerar hacia afuera del aro apenas aparece. Las ráfagas dejan huecos entre tuerca y tuerca: pasar por ellos. Los huecos hay que aprovecharlos cuando aparecen."],
  cortacercos: ["Anuncia un barrido en arco con un sector rojo de 10 metros y siembra cables con chispas en el piso. Seguridad laboral: ninguna.", "Salir del sector antes del barrido y no pisar los cables: electrocutan mientras se está encima. Pisar cables es mala idea en cualquier contexto."],
};
// Fase 2 (minijefes por debajo de la mitad de vida; jefes finales en su segunda barra; enemies.ts: enraged)
const PHASE2: Partial<Record<Kind, string>> = { gato: " y maúlla para convocar polillas, refuerzos que nadie pidió", perro: " y salta más seguido, ya sin importarle el cansancio" };
const BTABS = { bichos: "Bichos", pilotos: "Pilotos", logros: "Logros", stats: "Estadísticas" };
let btab: keyof typeof BTABS = "bichos";
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
  $("beasts").innerHTML = btab === "stats" ? statsHtml() : btab === "logros" ? (Object.keys(ACH) as AchId[]).map((k) => {
    const a: { name: string; txt: string; reward?: string; scrap?: number } = ACH[k], ok = save.ach.includes(k);
    const near = isAchNear(k, ok);
    return `<div tabindex="0" class="carc ficha logro ${ok ? "" : "locked"} ${near ? "ach-near" : ""}"><span class="sello">${ok ? "LOGRADO" : near ? "CASI LISTO" : "???"}</span><b class="wi">${achIco(k)}${a.name}</b>${a.txt}${achProg(k, ok)}${a.reward || a.scrap ? `<div class="price">Premio: ${a.reward ? rewardName(a.reward) : `${a.scrap} tornillos`}${ok ? `<b class="ach-ok"> · COBRADO</b>` : ""}</div>` : ""}</div>`;
  }).join("")
    : btab === "pilotos" ? (Object.keys(PILOTS) as PilotId[]).map((k) => {
      const p = PILOTS[k], own = owns("pilot:" + k), st = save.pilot === k ? "EN USO" : own ? "EN EL GARAJE" : p.ach ? `Logro: ${p.ach.txt}` : `Bloqueado · ${p.cost} tornillos`;
      return `<div tabindex="0" class="carc ficha pilot ${save.pilot === k ? "sel" : ""} ${own ? "" : "locked"}"><b>${p.name}</b>${p.pros.map((x) => `<div class="pro">${x}</div>`).join("")}<div class="con">${p.con}</div><div class="wsyn">${icon(p.start, 14)}<span>Arma de serie: <b>${WEAPONS[p.start].name}</b></span></div><div class="lore">${p.lore}</div><div class="price">${st}</div></div>`;
    }).join("")
    : (Object.keys(DEF) as Kind[]).map((k) => {
      // Todo visible desde el inicio; lo propio (bajas) dice "Sin registros todavía" hasta que aparezca. Clic, Enter o A abren la ficha completa.
      const d = DEF[k], n = save.slain[k] ?? 0, met = save.seen.includes(k) || n > 0;
      return `<div tabindex="0" class="carc ficha ${d.boss ? "boss" : ""}" data-beast="${k}"><span class="bthumb">${beastIcon(k, 38)}</span><b class="wi">${d.boss ? icon("jefe", 22) : ""}${d.name}</b>${rankOf(k)} · ${met ? `${n} ${n === 1 ? "baja" : "bajas"}` : "Sin registros todavía"}<div class="lore">${LORE[k]}</div><div class="st"><span>Vida</span>${bar(d.hp, d.boss ? 8000 : 90)}<span>Velocidad</span>${bar(d.speed, 18)}<span>Daño</span>${bar(d.dmg, d.boss ? 45 : 12)}<span>Peso</span>${bar(d.mass, d.boss ? 100 : 3)}</div><div class="price">${d.xp ? `${d.xp} ${d.xp === 1 ? "tuerca" : "tuercas"} de XP` : "Fin de la partida"}</div></div>`;
    }).join("");
  rec.innerHTML = save.runs.length
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
  const gp = activePad();
  if (!gp) return;
  const rx = gp.axes[2] ?? 0;
  if (Math.abs(rx) > 0.2) { BV.yaw += rx * dt * 3; BV.touched = performance.now(); }
  const z = (gp.buttons[6]?.value ?? 0) - (gp.buttons[7]?.value ?? 0);
  if (Math.abs(z) > 0.05) zoomBeast(1 + z * dt * 1.5);
}
const BHINT = { keys: () => "Arrastrar gira · Rueda acerca · Q y E (o las flechas en el borde) cambian de bicho · Esc vuelve", pad: () => `Stick derecho gira · ${btnChip(6)} y ${btnChip(7)} acercan · ${btnChip(4)} y ${btnChip(5)} cambian de bicho · ${btnChip(pb("back"))} vuelve`, touch: () => "Arrastrar gira · Pellizcar acerca · Deslizar la ficha cambia de bicho" };
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
    + `<div class="bname"><small>${rankOf(k)} · ${KINDS.indexOf(k) + 1} / ${KINDS.length} · <em class="b-reg ${met ? "ok" : ""}">${met ? `REGISTRADO (${n} ${n === 1 ? "baja" : "bajas"})` : "SIN REGISTROS"}</em></small><b class="wi">${beastIcon(k, 24)}${d.name}</b></div><button class="bnav" data-bnav="1" aria-label="Bicho siguiente">&gt;</button></div>`
    + `<div class="bctl"><div class="slot"><span>Animación</span>${btn("banim", "walk", "Caminar", BV.anim === "walk")}${btn("banim", "attack", "Atacar")}${btn("banim", "hit", "Recibir golpe")}${btn("banim", "die", "Morir")}${d.boss ? btn("banim", "phase", "Fase 2") : ""}</div>`
    + (d.boss ? "" : `<div class="slot"><span>Variante</span>${btn("belite", "", "Normal", !el)}${btn("belite", "rapida", "Rápida", el === "rapida")}${btn("belite", "blindada", "Blindada", el === "blindada")}</div>`) + `</div>`
    + `<div id="binfo">`
    + `<div class="bblock" tabindex="0"><div class="sect">Datos</div><div class="st bst">${row(d.boss ? "Vida" : "Vida inicial", hp, d.boss ? 8000 : 270, num(hp))}${row("Velocidad", sp, 25, num(sp))}${row("Daño", d.dmg, d.boss ? 45 : 12, num(d.dmg))}${row("Peso", mass, d.boss ? 100 : 15, num(mass))}${row("XP", d.xp, d.boss ? 120 : 6, d.xp ? `${d.xp} ${d.xp === 1 ? "tuerca" : "tuercas"}` : "Fin de la partida")}</div>`
    + (el ? `<p class="bnote">${el === "rapida" ? "Élite rápida: doble velocidad y 60% de la vida." : "Élite blindada: triple vida y cinco veces más pesada, casi no se la empuja."} Al caer suelta un cofre.</p>` : d.boss ? "" : `<p class="bnote">La vida de las plagas crece con el tiempo de partida.</p>`) + `</div>`
    + `<div class="bblock" tabindex="0"><div class="sect">Cómo ataca</div><p>${HOW[k][0]}</p><div class="sect">Cómo esquivarlo</div><p>${HOW[k][1]}</p>${d.boss ? `<p class="bnote">${d.final ? `Fase 2: al vaciar la primera barra ruge, exige hablar con un superior, llena una segunda y pega más fuerte` : "Fase 2: por debajo de la mitad de vida pierde la paciencia y la compostura"}, va un 20% más rápido${PHASE2[k] ?? ""}.</p>` : ""}</div>`
    + `<div class="bblock" tabindex="0"><div class="sect">Trasfondo</div><p class="lore">${LORE[k]}</p></div>`
    + `<div class="bblock" tabindex="0"><div class="sect">Registro propio</div>${met ? kv("Bajas", n) + kv("Primera vez", first) + kv("Daño recibido", Math.round(r?.hurt ?? 0)) + kv("Zonas", r?.zones.map((z) => ZONES[z].short).join(", ") || "Sin registros todavía") : `<p>Sin registros todavía.</p>`}</div>`
    + `<div class="bblock" tabindex="0"><div class="sect">Debilidades</div>${weak.length ? `<div class="st bst">${weak.map(([id, v]) => row(wname(id), v, weak[0][1], String(Math.round(v)))).join("")}</div><p class="bnote">Daño infligido por arma, según el historial propio.</p>` : `<p>Sin registros todavía.</p>`}</div>`
    + `</div><div class="bfoot"><div class="hint">${BHINT[ctl]()}</div><button data-act="back">Volver</button></div>`;
  if (wasSel) focusSel(wasSel);
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

export function openOver(r: { win: boolean; why: string; time: number; kills: number; level: number; scrap: number; record: boolean; dmg: Record<string, number>; hurt?: Record<string, number>; seed: string; more?: boolean; title?: string; prevBest?: number; bestStreak?: number; bestHit?: number; bestDrive?: number; bossKills?: number; evos?: string[]; ach?: string[]; car?: string }) {
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
    const k = b.dataset.go ?? b.dataset.act!, id = UI_BTN_ICON[k] ?? (k === "playmenu" || k === "playgo" ? "jugar" : undefined);
    if (id && !b.classList.contains("lnk") && (!b.classList.contains("primary") || /^(play|playmenu|playgo|resume|race|daily)$/.test(k))) b.insertAdjacentHTML("afterbegin", uiIcon(id, 22, !b.classList.contains("primary")));
  }
  $("tPause").innerHTML = uiIcon("pausa", 26);
  applySettings();
  ctlTexts();
  $("teReset").addEventListener("click", () => { save.tlay = { v: {}, h: {} }; persist(); applySettings(); editTouch(true, {}, save.touch, (l) => { save.tlay[orient()] = l; persist(); }); }); // restablece las dos orientaciones
  $("teDone").addEventListener("click", () => tedit(false));
  $("tPause").addEventListener("click", () => (current() === "pause" ? api.resume() : api.pause())); // botón táctil: igual que Esc/Start
  $("tCam").addEventListener("click", camCycle); // botón táctil: igual que C / View
  const fe = $("fe");
  fe.addEventListener("focusin", () => SFX.blip());
  // Mouse: el foco sigue al puntero solo si se mueve (pointerover le robaría el foco al teclado al cambiar de pantalla)
  fe.addEventListener("pointermove", (e) => { const el = (e.target as HTMLElement).closest<HTMLElement>("button:not(:disabled), select, input, [tabindex]"); if (el && el !== document.activeElement) el.focus({ preventScroll: true }); });
  fe.addEventListener("click", (e) => {
    const t = e.target as HTMLElement, d = (t.closest("[data-go],[data-rc],[data-rctrack],[data-act],[data-k],[data-sw],[data-pdef],[data-pz],[data-tab],[data-tog],[data-bind],[data-gtab],[data-stab],[data-btab],[data-buy],[data-pilot],[data-part],[data-abil],[data-hab],[data-sf],[data-ss],[data-arma],[data-dsel],[data-dcol],[data-dact],[data-beast],[data-bnav],[data-banim],[data-belite]") as HTMLElement | null)?.dataset;
    if (current() === "title") { SFX.accept(); return go("main"); }
    if (d?.act === "askyes") { const f = askFn; askClose(); SFX.accept(); f?.(); return; }
    if (d?.act === "askno") { askClose(); return; }
    if (askFn) return; // con la confirmación abierta no se toca nada más
    const nm = (t.closest("[data-buy],[data-pilot],[data-part],[data-arma],[data-hab],[data-k]")?.querySelector("b")?.textContent ?? "esto").trim();
    if (t.id === "dgrid") { if (!e.detail) setCell(dcx, dcy, dcol); return; } // Enter / A sobre la grilla (el mouse y el dedo pintan en pointerdown)
    if (binding && d?.bind !== binding) { cancelBind(); if (!d?.bind) return; } // un clic fuera cancela la captura
    if (!d) return;
    SFX.accept();
    if (d.go) go(d.go as Scr);
    else if (d.rc) { cycleRace(d.rc); renderRace(); }
    else if (d.rctrack !== undefined) { raceCfg.cup = false; raceCfg.track = +d.rctrack as 0 | 1 | 2; saveRaceCfg(); renderRace(); }
    else if (d.act === "race") api.race();
    else if (d.act === "battle") api.battle();
    else if (d.act === "duelgo") api.duel();
    else if (d.act === "match3go") api.match3();
    else if (d.act === "play" || d.act === "playgo") api.play();
    else if (d.act === "playmenu") { if (ownedZones().length > 1) go("play"); else api.play(); } // con una sola zona no hay nada que elegir: largar directo
    else if (d.act === "daily") api.play(true);
    else if (d.act === "endless") api.endless();
    else if (d.act === "curse") { // ciclo: ninguna → Horda → Sin reparaciones → ambas
      const all = CURSE_SETS.map((c) => c.join()), i = all.indexOf(save.curses.join());
      save.curses = [...CURSE_SETS[(i + 1) % CURSE_SETS.length]]; persist(); renderPlay();
    }
    else if (d.act === "zone") { // el fondo cambia en el loop del menú (main.ts); estática como al cambiar de canal
      const zs = ownedZones(); save.zone = zs[(zs.indexOf(save.zone) + 1) % zs.length]; persist(); renderPlay();
      fe.classList.remove("zap"); void fe.offsetWidth; fe.classList.add("zap"); SFX.static();
    }
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
    else if (d.act === "resume") api.resume();
    else if (d.act === "quit") api.quit();
    else if (d.act === "install") void installEv?.prompt().finally(() => { installEv = null; $("install").classList.add("hidden"); }); // el evento sirve una sola vez
    else if (d.tab) { tab = d.tab; renderConfig(); $("opts").scrollTop = 0; (document.querySelector(`[data-tab="${tab}"]`) as HTMLElement).focus(); }
    else if (d.tog) { const [o, k] = ref(d.tog); o[k] = !o[k]; commit(); renderConfig(); (document.querySelector(`[data-tog="${d.tog}"]`) as HTMLElement).focus(); }
    else if (d.bind) { binding = binding === d.bind ? null : d.bind; bindT = performance.now(); dup = null; renderConfig(); focusSel(`[data-bind="${d.bind}"]`); }
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
    else if (d.sw || d.pdef) { save[pz] = d.sw ?? ""; persist(); renderPaint(); focusSel(d.sw ? `[data-sw="${d.sw}"]` : "[data-pdef]"); }
    else if (d.pz) { pz = d.pz as typeof pz; renderPaint(); focusSel(`[data-pz="${pz}"]`); }
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
    else if (d.btab) { btab = d.btab as typeof btab; renderBestiary(); $("beasts").scrollTop = 0; focusSel(`[data-btab="${btab}"]`); }
    else if (d.stab) { stab = d.stab as typeof stab; renderShop(); $("shop").scrollTop = 0; focusSel(`[data-stab="${stab}"]`); }
    else if (d.buy) { const id = d.buy, c = priceOf(id); if (owns(id) || c === undefined) return; askBuy(nm, c, () => { if (!buy(id)) return; renderShop(); focusSel(`[data-buy="${id}"]`); }); }
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
