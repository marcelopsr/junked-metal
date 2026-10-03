// Front-end: título, menú principal, garaje, taller, configuración, bestiario, créditos, pausa y resultados.
// Una sola pila de pantallas dentro de #fe; teclado, gamepad y mouse mueven el mismo foco.
import "./menu.css";
import type { DefaultRenderingPipeline, Scene } from "@babylonjs/core";
import { CARS } from "./car";
import { DEF, type Kind } from "./enemies";
import { ctl, KEYS, PAD, padPressed, type Action } from "./input";
import { DECAL_BLANK, DECAL_N, DECAL_PAL, PAINTS, PARTS, RIMS, validDecal, type CarKind, type CarOpts, type Slot } from "./models";
import { PILOTS, type PilotId } from "./pilots";
import { LOOK, look, setQuality, type Quality } from "./render";
import { initAudio, setAudio, SFX } from "./sfx";
import { PASSIVES, WEAPONS, type PassiveId, type WeaponId } from "./weapons";
import { ZONES, type ZoneId } from "./world";
import { ACH, type AchId } from "./achievements";
import { ABILITIES, CURSES, type AbilityId, type CurseId } from "./abilities";

const $ = (id: string) => document.getElementById(id)!;
export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// ---------- Guardado ----------
export type RunRec = { t: number; kills: number; lv: number; seed: number; win: boolean };
// Totales históricos de carrera (Bestiario → Estadísticas): se suman en endRun (main.ts). Las bajas por tipo viven en save.slain.
export type Stats = { runs: number; wins: number; time: number; dist: number; dmg: Record<string, number>; zone: Partial<Record<ZoneId, { t: number; kills: number }>> };
type Save = {
  intro: boolean; // ya se vio la intro del primer arranque
  scrap: number; best: number; perm: { hp: number; dmg: number; spd: number; mag: number; reroll: number; cards: number; extra: number; revive: number; xp: number }; cars: CarKind[]; car: CarKind;
  pilot: PilotId; unlocked: string[]; kit: Record<Slot, string>; quality: Quality; paint: string; rim: string; zoom: number;
  mute: boolean; vol: { master: number; sfx: number; engine: number; music: number };
  bloom: boolean; outline: boolean; retro: number; clean: boolean; shake: boolean;
  keys: Partial<Record<Action, string>>; pad: { dead: number; sens: number }; rumble: boolean; touch: number;
  hud: number; calm: boolean; dmgNums: boolean;
  decals: string[]; decalSel: number; // calcos del capó: 3 diseños ("" = vacío, si no, DECAL_N² dígitos) y el aplicado (-1 = ninguno)
  stats: Stats;
  seen: Kind[]; slain: Partial<Record<Kind, number>>; runs: RunRec[]; daily: { day: string; best: number }; zone: ZoneId;
  ach: AchId[];
  ability: AbilityId; curses: CurseId[]; endless: number; // habilidad activa elegida, maldiciones de la próxima partida y récord del modo sin fin (s)
};
const DEFAULT: Save = {
  intro: false,
  scrap: 0, best: 0, perm: { hp: 0, dmg: 0, spd: 0, mag: 0, reroll: 0, cards: 0, extra: 0, revive: 0, xp: 0 }, cars: ["buggy"], car: "buggy",
  pilot: "soldadito", unlocked: [], kit: { wing: "serie", decal: "nada", lamp: "calido", exhaust: "nada" }, quality: "auto", paint: "", rim: "", zoom: 1.35,
  mute: false, vol: { master: 1, sfx: 1, engine: 1, music: 0.7 }, bloom: true, outline: true, retro: 1, clean: true, shake: true,
  keys: {}, pad: { dead: 0.15, sens: 1 }, rumble: true, touch: 1, hud: 1, calm: false, dmgNums: true,
  decals: ["", "", ""], decalSel: -1, stats: { runs: 0, wins: 0, time: 0, dist: 0, dmg: {}, zone: {} },
  seen: [], slain: {}, runs: [], daily: { day: "", best: 0 }, zone: "patio", ach: [],
  ability: "bombardeo", curses: [], endless: 0,
};
export const save: Save = (() => {
  try {
    const s = JSON.parse(localStorage.getItem("rcfight2") ?? "{}");
    for (const k of ["seen", "runs", "cars", "unlocked", "ach"] as const) if (k in s && !Array.isArray(s[k])) delete s[k]; // import malformado: se ignora el campo
    if (typeof s.keys !== "object" || !s.keys) delete s.keys;
    if (!(s.ability in ABILITIES)) delete s.ability;
    s.curses = Array.isArray(s.curses) ? s.curses.filter((c: string) => c in CURSES) : [];
    if (typeof s.stats !== "object" || !s.stats) delete s.stats;
    // Calcos: siempre 3 ranuras y solo diseños válidos; el aplicado debe apuntar a una ranura con diseño
    const decals = [0, 1, 2].map((i) => (validDecal(s.decals?.[i]) ? s.decals[i] : ""));
    const decalSel = Number.isInteger(s.decalSel) && decals[s.decalSel] ? s.decalSel : -1;
    return { ...structuredClone(DEFAULT), ...s, decals, decalSel, perm: { ...DEFAULT.perm, ...s.perm }, kit: { ...DEFAULT.kit, ...s.kit }, vol: { ...DEFAULT.vol, ...s.vol }, pad: { ...DEFAULT.pad, ...s.pad },
      stats: { ...DEFAULT.stats, ...s.stats, dmg: { ...s.stats?.dmg }, zone: { ...s.stats?.zone } } };
  } catch { return structuredClone(DEFAULT); }
})();
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

// ---------- Ajustes ----------
type Api = { scene: Scene; play(daily?: boolean): void; resume(): void; quit(): void; pause(): void; endless(): void };
let api: Api;
let L0 = { grain: 0, scan: 0, ca: 0, pal: 0, outline: 0 }; // look de fábrica: la perilla "post retro" lo escala

export function applySettings() {
  setQuality(save.quality);
  const glow = api.scene.getGlowLayerByName("bloom");
  if (glow) glow.isEnabled = save.bloom;
  const pipe = api.scene.postProcessRenderPipelineManager.supportedPipelines.find((p) => p.name === "pipe") as DefaultRenderingPipeline | undefined;
  if (pipe) pipe.bloomEnabled = save.bloom;
  const rk = save.clean ? 0 : save.retro;
  look({ grain: L0.grain * rk, scan: L0.scan * rk, ca: L0.ca * rk, pal: L0.pal * rk, outline: save.outline ? L0.outline : 0 });
  setAudio({ ...save.vol, mute: save.mute });
  $("muted").classList.toggle("hidden", !save.mute);
  for (const a of Object.keys(save.keys) as Action[]) if (KEYS[a]) KEYS[a][0] = save.keys[a]!;
  Object.assign(PAD, save.pad);
  const root = document.documentElement.style;
  root.setProperty("--hud-scale", String(save.hud));
  root.setProperty("--touch-scale", String(save.touch));
  document.body.classList.toggle("calm", save.calm);
}
const commit = () => { persist(); applySettings(); };

// ---------- Pila de pantallas ----------
export type Scr = "title" | "main" | "garage" | "shop" | "config" | "bestiary" | "credits" | "pause" | "over";
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
  if (s === "bestiary") renderBestiary();
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
}
/** Reemplaza la pila entera (null = en juego, sin menú). */
export function reset(s: Scr | null) {
  stack.length = 0;
  ret.clear();
  if (s) stack.push(s);
  show();
}

// ---------- Foco: navegación espacial ----------
const focusables = () => [...document.querySelectorAll<HTMLElement>(`#scr-${current()} :is(button:not(:disabled), select, input, [tabindex])`)].filter((e) => e.offsetParent);
const SCROLL = "#cars, #shop, #opts"; // listas con scroll propio
function move(dx: number, dy: number) {
  const cur = document.activeElement as HTMLElement, els = focusables();
  if (!els.includes(cur)) return els[0]?.focus();
  // Grilla del editor de calcos: el cursor recorre las celdas; en el borde el foco sigue de largo
  if (cur.id === "dgrid") { const x = dcx + dx, y = dcy + dy; if (x >= 0 && x < DECAL_N && y >= 0 && y < DECAL_N) { dcx = x; dcy = y; drawGrid(); return SFX.blip(); } }
  // Perillas: izquierda/derecha cambian el valor en vez de mover el foco
  if (dx && cur instanceof HTMLInputElement && cur.type === "range") { dx > 0 ? cur.stepUp() : cur.stepDown(); cur.dispatchEvent(new Event("input", { bubbles: true })); return SFX.blip(); }
  if (dx && cur instanceof HTMLSelectElement) { cur.selectedIndex = (cur.selectedIndex + dx + cur.length) % cur.length; cur.dispatchEvent(new Event("change", { bubbles: true })); return SFX.blip(); }
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
      const sc = along + side * 2.5;
      if (sc < bs) { bs = sc; best = el; }
    }
    if (best) break;
  }
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
const CH = Array.from({ length: 10 }, (_, l) => Math.round((20 * (l + 1) * (l < 5 ? 1 : 1.5 + (l - 5) * 0.45)) / 5) * 5);
const PERKS: { k: PermK; cat: "chasis" | "equipo"; name: string; desc: string; cost: number[] }[] = [
  { k: "hp", cat: "chasis", name: "Chasis reforzado", desc: "+10 vida", cost: CH }, { k: "dmg", cat: "chasis", name: "Piñón afilado", desc: "+10% daño", cost: CH },
  { k: "spd", cat: "chasis", name: "Motor rebobinado", desc: "+4% velocidad", cost: CH }, { k: "mag", cat: "chasis", name: "Imán de parlante", desc: "+10% imán", cost: CH },
  { k: "xp", cat: "equipo", name: "Contador de tuercas", desc: "+5% XP por nivel", cost: [80, 180, 320, 500] },
  { k: "reroll", cat: "equipo", name: "Dado cargado", desc: "+1 re-sorteo de cartas por partida (R o botón Y)", cost: [100, 250, 450] },
  { k: "extra", cat: "equipo", name: "Caja de repuestos", desc: "Arranca con un arma extra al azar", cost: [500] },
  { k: "revive", cat: "equipo", name: "Batería de reserva", desc: "Revive una vez por partida con media vida", cost: [600, 1800] },
  { k: "cards", cat: "equipo", name: "Cuarta ranura", desc: "+1 opción en cada mejora y cofre", cost: [2200] },
];
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
      return `<button class="carc perk" data-k="${p.k}" ${l >= max || save.scrap < cost ? "disabled" : ""}><b>${p.name}</b>${p.desc}<div class="pips">${"<i class=on></i>".repeat(l)}${"<i></i>".repeat(max - l)}</div><div class="price">${l >= max ? "MÁXIMO" : `${cost} tornillos`}</div></button>`;
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

// Configuración: filas generadas desde datos. data-set = número (perilla o lista), data-tog = sí/no
type Row = [label: string, kind: "range", path: string, min: number, max: number, step: number, unit?: "%" | "x"] | [label: string, kind: "tog", path: string] | [label: string, kind: "sel", path: string, opts: [string, string][]] | [label: string, kind: "bind", action: Action] | [label: string, kind: "note"] | [label: string, kind: "btn", act: string];
const TABS: Record<string, { name: string; rows: Row[] }> = {
  gfx: { name: "Gráficos", rows: [
    ["Calidad", "sel", "quality", [["auto", "Auto"], ["ultra", "Ultra 1440p"], ["calidad", "Calidad 1080p"], ["equilibrado", "Equilibrado 720p"], ["rendimiento", "Rendimiento 540p"]]],
    ["Bloom", "tog", "bloom"], ["Contornos", "tog", "outline"], ["Look limpio (sin grano, scanlines ni paleta)", "tog", "clean"],
    ["Look retro (grano, scanlines, aberración, paleta; 0% = limpio)", "range", "retro", 0, 1.5, 0.1, "%"],
    ["Zoom de cámara", "range", "zoom", 0.8, 2, 0.05, "x"], ["Temblor de pantalla", "tog", "shake"],
  ] },
  audio: { name: "Audio", rows: [
    ["Volumen general", "range", "vol.master", 0, 1, 0.05, "%"], ["Efectos", "range", "vol.sfx", 0, 1, 0.05, "%"], ["Motor", "range", "vol.engine", 0, 1, 0.05, "%"],
    ["Música", "range", "vol.music", 0, 1, 0.05, "%"], ["Silencio (M)", "tog", "mute"],
  ] },
  ctl: { name: "Controles", rows: [
    ["Acelerar", "bind", "up"], ["Frenar / atrás", "bind", "down"], ["Girar izquierda", "bind", "left"], ["Girar derecha", "bind", "right"],
    ["Turbo", "bind", "boost"], ["Derrape", "bind", "drift"], ["Habilidad", "bind", "ability"],
    ["Flechas también manejan. Esc pausa · M sonido · rueda o - / = zoom", "note"],
    ["Zona muerta del stick", "range", "pad.dead", 0.05, 0.4, 0.01, "%"], ["Sensibilidad del stick", "range", "pad.sens", 0.5, 2, 0.05, "x"],
    ["Vibración", "tog", "rumble"], ["Tamaño de controles táctiles", "range", "touch", 0.7, 1.4, 0.05, "x"],
    ["Gamepad: stick hacia donde se quiere ir · A turbo · B derrape · X habilidad · gatillos acelerar/frenar", "note"],
  ] },
  a11y: { name: "Accesibilidad", rows: [
    ["Tamaño de texto del HUD", "range", "hud", 0.8, 1.5, 0.05, "x"], ["Reducir parpadeos y glitch", "tog", "calm"], ["Números de daño", "tog", "dmgNums"],
  ] },
  data: { name: "Partida", rows: [
    ["El progreso se guarda en este navegador. Un archivo de respaldo permite llevarlo a otro dispositivo.", "note"],
    ["Exportar partida", "btn", "export"], ["Importar partida", "btn", "import"],
  ] },
};
let tab = "gfx";
const ref = (p: string) => { const k = p.split("."); let o = save as unknown as Record<string, unknown>; while (k.length > 1) o = o[k.shift()!] as Record<string, unknown>; return [o, k[0]] as const; };
const val = (p: string) => { const [o, k] = ref(p); return o[k]; };
export const keyName = (c?: string) => (c ?? "").replace(/^Key|^Digit/, "").replace("Left", " izq").replace("Right", " der").replace("Space", "Espacio").replace(/^Arrow/, "Flecha ").toUpperCase();
const show2 = (v: number, u?: string) => (u === "%" ? `${Math.round(v * 100)}%` : `${v.toFixed(2)}x`);
function renderConfig() {
  $("tabs").innerHTML = Object.entries(TABS).map(([id, t]) => `<button class="tab ${id === tab ? "on" : ""}" data-tab="${id}">${t.name}</button>`).join("");
  // En táctil, Controles deja solo lo táctil (sin teclas ni gamepad)
  $("opts").innerHTML = TABS[tab].rows.filter((r) => tab !== "ctl" || ctl !== "touch" || r[2] === "touch").map((r) => {
    if (r[1] === "note") return `<div class="note">${r[0]}</div>`;
    if (r[1] === "btn") return `<button class="row" data-act="${r[2]}"><span>${r[0]}</span><b>&gt;</b></button>`;
    if (r[1] === "bind") return `<button class="row" data-bind="${r[2]}"><span>${r[0]}</span><b>${binding === r[2] ? "PRESIONA UNA TECLA" : keyName(KEYS[r[2]][0])}</b></button>`;
    if (r[1] === "tog") return `<button class="row" data-tog="${r[2]}"><span>${r[0]}</span><b>${val(r[2]) ? "SÍ" : "NO"}</b></button>`;
    if (r[1] === "sel") return `<label class="row"><span>${r[0]}</span><select data-set="${r[2]}">${r[3].map(([v, n]) => `<option value="${v}" ${val(r[2]) === v ? "selected" : ""}>${n}</option>`).join("")}</select></label>`;
    const v = val(r[2]) as number;
    return `<label class="row"><span>${r[0]}</span><input type="range" data-set="${r[2]}" data-u="${r[6]}" min="${r[3]}" max="${r[4]}" step="${r[5]}" value="${v}"><output>${show2(v, r[6])}</output></label>`;
  }).join("");
}

// Trasfondo de cada bicho (el de los pilotos vive en pilots.ts)
const LORE: Partial<Record<Kind, string>> = {
  hormiga: "Trabaja en equipo, cobra en migas y jura que el patio es suyo desde antes que la casa.",
  escupidora: "Probó el jugo de limón una vez y desde entonces escupe por principio.",
  friccion: "Un solo cambio: adelante. Frenar nunca figuró en el manual.",
  robot: "Le dieron cuerda hace años y todavía no terminó de enojarse.",
  polilla: "Viene por el faro y se queda por la pelea. Nadie le explicó que la luz no se come.",
  escarabajo: "Blindado de fábrica, lento por convicción. Considera que embestir es una forma de saludar.",
  rey: "Se coronó solo, con una tapita de gaseosa. Exige reverencias y migas de galleta.",
  cortadora: "Despertó un domingo a las siete de la mañana y decidió que el pasto no alcanzaba.",
  tarantula: "Ocho patas, cero paciencia. Teje redes por pasatiempo y emboscadas por oficio.",
  perro: "El verdadero dueño del patio. Ladra a la nada, entierra juguetes y no negocia.",
  aspiradora: "Programada para limpiar la casa, se escapó por la gatera. Considera que todo el patio es una pelusa.",
  cortacercos: "Lo dejaron enchufado después de podar el ligustro. Desde entonces, todo le parece un cerco.",
};
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
    return `<div tabindex="0" class="carc ficha logro ${ok ? "" : "locked"}"><span class="sello">${ok ? "LOGRADO" : "???"}</span><b>${a.name}</b>${a.txt}${a.reward || a.scrap ? `<div class="price">Premio: ${a.reward ? rewardName(a.reward) : `${a.scrap} tornillos`}</div>` : ""}</div>`;
  }).join("")
    : btab === "pilotos" ? (Object.keys(PILOTS) as PilotId[]).map((k) => {
      const p = PILOTS[k];
      return `<div tabindex="0" class="carc ficha pilot ${owns("pilot:" + k) ? "" : "locked"}"><b>${p.name}</b>${p.pros.map((x) => `<div class="pro">${x}</div>`).join("")}<div class="con">${p.con}</div><div class="lore">${p.lore}</div></div>`;
    }).join("")
    : (Object.keys(DEF) as Kind[]).map((k) => {
      const d = DEF[k], seen = save.seen.includes(k), n = save.slain[k] ?? 0;
      if (!seen) return `<div tabindex="0" class="carc ficha locked"><b>???</b>Sin datos. Todavía no apareció en el patio.</div>`;
      return `<div tabindex="0" class="carc ficha ${d.boss ? "boss" : ""}"><b>${d.name}</b>${d.boss ? "Jefe" : "Plaga"} · ${n} ${n === 1 ? "baja" : "bajas"}${LORE[k] ? `<div class="lore">${LORE[k]}</div>` : ""}<div class="st"><span>Vida</span>${bar(d.hp, d.boss ? 8000 : 90)}<span>Velocidad</span>${bar(d.speed, 18)}<span>Daño</span>${bar(d.dmg, d.boss ? 45 : 12)}<span>Peso</span>${bar(d.mass, d.boss ? 100 : 3)}</div><div class="price">${d.xp ? `${d.xp} tuercas de XP` : "Fin de la partida"}</div></div>`;
    }).join("");
  $("records").innerHTML = save.runs.length
    ? `<tr><th>#</th><th>Tiempo</th><th>Bajas</th><th>Nivel</th><th>Semilla</th></tr>` + save.runs.map((r, i) => `<tr><td>${i + 1}</td><td>${fmt(r.t)}${r.win ? " V" : ""}</td><td>${r.kills}</td><td>${r.lv}</td><td>${r.seed}</td></tr>`).join("")
    : `<tr><td>Sin partidas todavía.</td></tr>`;
}

// ---------- Pausa y resultados (los datos los arma main.ts) ----------
type Kit = { weapons: { id: WeaponId; lv: number; evolved: boolean }[]; passives: { id: PassiveId; lv: number }[]; stats: [string, string][]; seed: string };
const pips = (l: number) => `<span class="pips">${"<i class=on></i>".repeat(l)}${"<i></i>".repeat(Math.max(0, 5 - l))}</span>`;
export function openPause(k: Kit) {
  $("kitW").innerHTML = k.weapons.map((w) => `<li><span>${w.evolved ? WEAPONS[w.id].evoName : WEAPONS[w.id].name}</span>${w.evolved ? "<b>EVO</b>" : pips(w.lv)}</li>`).join("");
  $("kitP").innerHTML = k.passives.map((p) => `<li><span>${PASSIVES[p.id].name}</span>${pips(p.lv)}</li>`).join("") || "<li><span>Ninguna</span></li>";
  $("kitS").innerHTML = k.stats.map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join("");
  $("pauseSeed").textContent = k.seed;
  reset("pause");
}
export function openOver(r: { win: boolean; why: string; time: number; kills: number; level: number; scrap: number; record: boolean; dmg: Record<string, number>; seed: string; more?: boolean; title?: string }) {
  $("overEndless").classList.toggle("hidden", !r.more); // venció al jefe final: puede seguir en modo sin fin
  $("overTitle").textContent = r.title ?? (r.win ? "VICTORIA" : "FIN DE LA PARTIDA");
  $("overTxt").textContent = r.why;
  $("overStats").innerHTML = [["Tiempo", fmt(r.time)], ["Bajas", r.kills], ["Nivel", r.level], ["Tornillos", "+" + r.scrap]].map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join("");
  $("overRec").classList.toggle("hidden", !r.record);
  $("overShop").classList.toggle("hidden", !canBuy());
  const rows = Object.entries(r.dmg).sort((a, b) => b[1] - a[1]), top = rows[0]?.[1] || 1;
  const name = (id: string) => (id in WEAPONS ? WEAPONS[id as WeaponId].name : id[0].toUpperCase() + id.slice(1));
  $("overDmg").innerHTML = rows.map(([id, v]) => `<li><span>${name(id)}</span><i style="width:${(v / top) * 100}%"></i><b>${Math.round(v)}</b></li>`).join("") || "<li><span>Sin daño infligido</span></li>";
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
  ctlShown = ctl;
}
addEventListener("ctl", ctlTexts);

// ---------- Arranque ----------
export function initMenu(a: Api) {
  api = a;
  L0 = { grain: LOOK.grain, scan: LOOK.scan, ca: LOOK.ca, pal: LOOK.pal, outline: LOOK.outline };
  applySettings();
  ctlTexts();
  $("tPause").addEventListener("click", () => (current() === "pause" ? api.resume() : api.pause())); // botón táctil: igual que Esc/Start
  const fe = $("fe");
  fe.addEventListener("focusin", () => SFX.blip());
  // Mouse: el foco sigue al puntero solo si se mueve (pointerover le robaría el foco al teclado al cambiar de pantalla)
  fe.addEventListener("pointermove", (e) => { const el = (e.target as HTMLElement).closest<HTMLElement>("button:not(:disabled), select, input, [tabindex]"); if (el && el !== document.activeElement) el.focus({ preventScroll: true }); });
  fe.addEventListener("click", (e) => {
    const t = e.target as HTMLElement, d = (t.closest("[data-go],[data-act],[data-k],[data-paint],[data-rim],[data-tab],[data-tog],[data-bind],[data-gtab],[data-stab],[data-btab],[data-buy],[data-pilot],[data-part],[data-abil],[data-dsel],[data-dcol],[data-dact]") as HTMLElement | null)?.dataset;
    if (current() === "title") { SFX.accept(); return go("main"); }
    if (t.id === "dgrid") { if (!e.detail) setCell(dcx, dcy, dcol); return; } // Enter / A sobre la grilla (el mouse y el dedo pintan en pointerdown)
    if (!d) return;
    SFX.accept();
    if (d.go) go(d.go as Scr);
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
    o[k] = t.value;
    commit();
  });
  reset("title");
}
