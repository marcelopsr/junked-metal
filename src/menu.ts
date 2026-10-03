// Front-end: título, menú principal, garaje, taller, configuración, bestiario, créditos, pausa y resultados.
// Una sola pila de pantallas dentro de #fe; teclado, gamepad y mouse mueven el mismo foco.
import "./menu.css";
import type { DefaultRenderingPipeline, Scene } from "@babylonjs/core";
import { CARS } from "./car";
import { DEF, type Kind } from "./enemies";
import { KEYS, PAD, padPressed, type Action } from "./input";
import { PAINTS, RIMS, type CarKind } from "./models";
import { LOOK, look, setQuality, type Quality } from "./render";
import { initAudio, setAudio, SFX } from "./sfx";
import { PASSIVES, WEAPONS, type PassiveId, type WeaponId } from "./weapons";

const $ = (id: string) => document.getElementById(id)!;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// ---------- Guardado ----------
export type RunRec = { t: number; kills: number; lv: number; seed: number; win: boolean };
type Save = {
  scrap: number; best: number; perm: { hp: number; dmg: number; spd: number; mag: number }; cars: CarKind[]; car: CarKind; quality: Quality; paint: string; rim: string; zoom: number;
  mute: boolean; vol: { master: number; sfx: number; engine: number };
  bloom: boolean; outline: boolean; retro: number; shake: boolean;
  keys: Partial<Record<Action, string>>; pad: { dead: number; sens: number }; rumble: boolean; touch: number;
  hud: number; calm: boolean; dmgNums: boolean;
  seen: Kind[]; slain: Partial<Record<Kind, number>>; runs: RunRec[];
};
const DEFAULT: Save = {
  scrap: 0, best: 0, perm: { hp: 0, dmg: 0, spd: 0, mag: 0 }, cars: ["buggy"], car: "buggy", quality: "auto", paint: "", rim: "", zoom: 1.35,
  mute: false, vol: { master: 1, sfx: 1, engine: 1 }, bloom: true, outline: true, retro: 1, shake: true,
  keys: {}, pad: { dead: 0.15, sens: 1 }, rumble: true, touch: 1, hud: 1, calm: false, dmgNums: true,
  seen: [], slain: {}, runs: [],
};
export const save: Save = (() => {
  try {
    const s = JSON.parse(localStorage.getItem("rcfight2") ?? "{}");
    return { ...structuredClone(DEFAULT), ...s, perm: { ...DEFAULT.perm, ...s.perm }, vol: { ...DEFAULT.vol, ...s.vol }, pad: { ...DEFAULT.pad, ...s.pad } };
  } catch { return structuredClone(DEFAULT); }
})();
export const persist = () => { const j = JSON.stringify(save); try { localStorage.setItem("rcfight2", j); } catch { /* sin storage */ } idb("put", j); };

// Respaldo del guardado en IndexedDB + pedido de almacenamiento persistente (el navegador no lo borra por espacio;
// instalado como app, Safari tampoco a los 7 días). Si localStorage quedó vacío y hay respaldo, se restaura y recarga.
function idb(op: "put" | "get", j?: string): Promise<string | undefined> {
  return new Promise((ok) => {
    try {
      const r = indexedDB.open("junkedmetal", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("kv");
      r.onsuccess = () => { const st = r.result.transaction("kv", op === "put" ? "readwrite" : "readonly").objectStore("kv"), q = op === "put" ? st.put(j, "save") : st.get("save"); q.onsuccess = () => ok(q.result as string | undefined); q.onerror = () => ok(undefined); };
      r.onerror = () => ok(undefined);
    } catch { ok(undefined); }
  });
}
void navigator.storage?.persist?.().catch(() => {});
if (!localStorage.getItem("rcfight2")) void idb("get").then((j) => { if (j) { try { localStorage.setItem("rcfight2", j); location.reload(); } catch { /* sin storage */ } } });

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
type Api = { scene: Scene; play(): void; resume(): void; quit(): void; pause(): void };
let api: Api;
let L0 = { grain: 0, scan: 0, ca: 0, outline: 0 }; // look de fábrica: la perilla "post retro" lo escala

export function applySettings() {
  setQuality(save.quality);
  const glow = api.scene.getGlowLayerByName("bloom");
  if (glow) glow.isEnabled = save.bloom;
  const pipe = api.scene.postProcessRenderPipelineManager.supportedPipelines.find((p) => p.name === "pipe") as DefaultRenderingPipeline | undefined;
  if (pipe) pipe.bloomEnabled = save.bloom;
  look({ grain: L0.grain * save.retro, scan: L0.scan * save.retro, ca: L0.ca * save.retro, outline: save.outline ? L0.outline : 0 });
  setAudio({ ...save.vol, mute: save.mute });
  $("muted").classList.toggle("hidden", !save.mute);
  for (const a of Object.keys(save.keys) as Action[]) KEYS[a][0] = save.keys[a]!;
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

function show() {
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
function move(dx: number, dy: number) {
  const cur = document.activeElement as HTMLElement, els = focusables();
  if (!els.includes(cur)) return els[0]?.focus();
  // Perillas: izquierda/derecha cambian el valor en vez de mover el foco
  if (dx && cur instanceof HTMLInputElement && cur.type === "range") { dx > 0 ? cur.stepUp() : cur.stepDown(); cur.dispatchEvent(new Event("input", { bubbles: true })); return SFX.blip(); }
  if (dx && cur instanceof HTMLSelectElement) { cur.selectedIndex = (cur.selectedIndex + dx + cur.length) % cur.length; cur.dispatchEvent(new Event("change", { bubbles: true })); return SFX.blip(); }
  // Posición de layout (sin transformaciones: el encendido de tubo aplasta la pantalla al entrar). En Configuración cuenta la fila entera.
  const box = (e: HTMLElement) => {
    const r = (e.closest(".row") ?? e) as HTMLElement;
    let x = 0, y = 0;
    for (let n: HTMLElement | null = r; n; n = n.offsetParent as HTMLElement | null) { x += n.offsetLeft - n.scrollLeft; y += n.offsetTop - n.scrollTop; }
    return { x, y, width: r.offsetWidth, height: r.offsetHeight };
  };
  const a = box(cur), ax = a.x + a.width / 2, ay = a.y + a.height / 2;
  let best: HTMLElement | null = null, bs = Infinity;
  for (const el of els) {
    if (el === cur) continue;
    const b = box(el), x = b.x + b.width / 2 - ax, y = b.y + b.height / 2 - ay;
    const along = x * dx + y * dy;
    if (along <= 2) continue;
    const sc = along + Math.abs(x * dy - y * dx) * 2.5;
    if (sc < bs) { bs = sc; best = el; }
  }
  best?.focus();
}
const activate = () => { const el = document.activeElement as HTMLElement; if (el?.closest("#fe") && !(el instanceof HTMLInputElement)) el.click(); };

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
  const gp = navigator.getGamepads?.()[0];
  const ax = gp?.axes[0] ?? 0, ay = gp?.axes[1] ?? 0;
  const d = btn[3] || ay < -0.5 ? "u" : btn[4] || ay > 0.5 ? "d" : btn[5] || ax < -0.5 ? "l" : btn[6] || ax > 0.5 ? "r" : "";
  if (!d) { padDir = ""; return; }
  // Stick: primer paso al toque, después repite cada 0,14 s
  if (d !== padDir || (padRep -= dt) <= 0) { padRep = d === padDir ? 0.14 : 0.38; padDir = d; move(d === "l" ? -1 : d === "r" ? 1 : 0, d === "u" ? -1 : d === "d" ? 1 : 0); }
}

// ---------- Pantallas ----------
function renderMain() {
  $("mainInfo").textContent = `${save.scrap} tornillos · récord ${fmt(save.best)}`;
}

const SHOP: { k: keyof Save["perm"]; name: string; desc: string }[] = [
  { k: "hp", name: "Chasis reforzado", desc: "+10 vida" }, { k: "dmg", name: "Piñón afilado", desc: "+10% daño" },
  { k: "spd", name: "Motor rebobinado", desc: "+4% velocidad" }, { k: "mag", name: "Imán de parlante", desc: "+10% imán" },
];
const shopCost = (l: number) => 15 * (l + 1);
const bar = (v: number, max: number) => `<i style="width:${Math.min(100, (v / max) * 100)}%"></i>`;
function renderShop() {
  $("bank").textContent = `${save.scrap} tornillos`;
  $("shop").innerHTML = SHOP.map((s) => {
    const l = save.perm[s.k], cost = shopCost(l);
    return `<button class="carc perk" data-k="${s.k}" ${save.scrap < cost || l >= 5 ? "disabled" : ""}><b>${s.name}</b>${s.desc}<div class="pips">${"<i class=on></i>".repeat(l)}${"<i></i>".repeat(5 - l)}</div><div class="price">${l >= 5 ? "MÁXIMO" : `${cost} tornillos`}</div></button>`;
  }).join("");
}
function renderGarage() {
  $("bankG").textContent = `${save.scrap} tornillos`;
  $("cars").innerHTML = (Object.keys(CARS) as CarKind[]).map((k) => {
    const c = CARS[k], own = save.cars.includes(k);
    return `<div tabindex="0" class="carc ${save.car === k ? "sel" : ""} ${own ? "" : "locked"}" data-k="${k}"><b>${c.name}</b>${c.desc}<div class="st"><span>Carrocería</span>${bar(c.hp, 220)}<span>Velocidad</span>${bar(c.speed, 19)}<span>Embestida</span>${bar(c.ram, 4.5)}</div>${own ? "" : `<div class="price">Bloqueado · ${c.cost} tornillos</div>`}</div>`;
  }).join("");
  const cur = save.paint || PAINTS[0], rim = save.rim || RIMS[0];
  $("paint").innerHTML = `<span>Pintura</span>${PAINTS.map((c) => `<button class="sw ${c === cur ? "on" : ""}" data-paint="${c}" style="background:${c}" aria-label="pintura ${c}"></button>`).join("")}`
    + `<span>Llantas</span>${RIMS.map((c) => `<button class="sw rim ${c === rim ? "on" : ""}" data-rim="${c}" style="background:${c}" aria-label="llantas ${c}"></button>`).join("")}`;
}

// Configuración: filas generadas desde datos. data-set = número (perilla o lista), data-tog = sí/no
type Row = [label: string, kind: "range", path: string, min: number, max: number, step: number, unit?: "%" | "x"] | [label: string, kind: "tog", path: string] | [label: string, kind: "sel", path: string, opts: [string, string][]] | [label: string, kind: "bind", action: Action] | [label: string, kind: "note"] | [label: string, kind: "btn", act: string];
const TABS: Record<string, { name: string; rows: Row[] }> = {
  gfx: { name: "Gráficos", rows: [
    ["Calidad", "sel", "quality", [["auto", "Auto"], ["ultra", "Ultra 720p"], ["calidad", "Calidad 600p"], ["equilibrado", "Equilibrado 480p"], ["rendimiento", "Rendimiento 360p"]]],
    ["Bloom", "tog", "bloom"], ["Contornos", "tog", "outline"],
    ["Post retro (grano, scanlines, aberración)", "range", "retro", 0, 1.5, 0.1, "%"],
    ["Zoom de cámara", "range", "zoom", 0.8, 2, 0.05, "x"], ["Temblor de pantalla", "tog", "shake"],
  ] },
  audio: { name: "Audio", rows: [
    ["Volumen general", "range", "vol.master", 0, 1, 0.05, "%"], ["Efectos", "range", "vol.sfx", 0, 1, 0.05, "%"], ["Motor", "range", "vol.engine", 0, 1, 0.05, "%"],
    ["Silencio (M)", "tog", "mute"], ["Todavía no hay música: el canal llega cuando haya pistas.", "note"],
  ] },
  ctl: { name: "Controles", rows: [
    ["Acelerar", "bind", "up"], ["Frenar / atrás", "bind", "down"], ["Girar izquierda", "bind", "left"], ["Girar derecha", "bind", "right"],
    ["Turbo", "bind", "boost"], ["Derrape", "bind", "drift"],
    ["Flechas también manejan. Esc pausa · M sonido · rueda o - / = zoom", "note"],
    ["Zona muerta del stick", "range", "pad.dead", 0.05, 0.4, 0.01, "%"], ["Sensibilidad del stick", "range", "pad.sens", 0.5, 2, 0.05, "x"],
    ["Vibración", "tog", "rumble"], ["Tamaño de controles táctiles", "range", "touch", 0.7, 1.4, 0.05, "x"],
    ["Gamepad: stick hacia donde se quiere ir · A turbo · B derrape · gatillos acelerar/frenar", "note"],
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
const keyName = (c?: string) => (c ?? "").replace(/^Key|^Digit/, "").replace("Left", " izq").replace("Right", " der").replace("Space", "Espacio").replace(/^Arrow/, "Flecha ").toUpperCase();
const show2 = (v: number, u?: string) => (u === "%" ? `${Math.round(v * 100)}%` : `${v.toFixed(2)}x`);
function renderConfig() {
  $("tabs").innerHTML = Object.entries(TABS).map(([id, t]) => `<button class="tab ${id === tab ? "on" : ""}" data-tab="${id}">${t.name}</button>`).join("");
  $("opts").innerHTML = TABS[tab].rows.map((r) => {
    if (r[1] === "note") return `<div class="note">${r[0]}</div>`;
    if (r[1] === "btn") return `<button class="row" data-act="${r[2]}"><span>${r[0]}</span><b>&gt;</b></button>`;
    if (r[1] === "bind") return `<button class="row" data-bind="${r[2]}"><span>${r[0]}</span><b>${binding === r[2] ? "PRESIONA UNA TECLA" : keyName(KEYS[r[2]][0])}</b></button>`;
    if (r[1] === "tog") return `<button class="row" data-tog="${r[2]}"><span>${r[0]}</span><b>${val(r[2]) ? "SÍ" : "NO"}</b></button>`;
    if (r[1] === "sel") return `<label class="row"><span>${r[0]}</span><select data-set="${r[2]}">${r[3].map(([v, n]) => `<option value="${v}" ${val(r[2]) === v ? "selected" : ""}>${n}</option>`).join("")}</select></label>`;
    const v = val(r[2]) as number;
    return `<label class="row"><span>${r[0]}</span><input type="range" data-set="${r[2]}" data-u="${r[6]}" min="${r[3]}" max="${r[4]}" step="${r[5]}" value="${v}"><output>${show2(v, r[6])}</output></label>`;
  }).join("");
}

function renderBestiary() {
  $("beasts").innerHTML = (Object.keys(DEF) as Kind[]).map((k) => {
    const d = DEF[k], seen = save.seen.includes(k), n = save.slain[k] ?? 0;
    if (!seen) return `<div tabindex="0" class="carc ficha locked"><b>???</b>Sin datos. Todavía no apareció en el patio.</div>`;
    return `<div tabindex="0" class="carc ficha ${d.boss ? "boss" : ""}"><b>${d.name}</b>${d.boss ? "Jefe" : "Plaga"} · ${n} ${n === 1 ? "baja" : "bajas"}<div class="st"><span>Vida</span>${bar(d.hp, d.boss ? 8000 : 90)}<span>Velocidad</span>${bar(d.speed, 18)}<span>Daño</span>${bar(d.dmg, d.boss ? 45 : 12)}<span>Peso</span>${bar(d.mass, d.boss ? 100 : 3)}</div><div class="price">${d.xp ? `${d.xp} tuercas de XP` : "Fin de la partida"}</div></div>`;
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
export function openOver(r: { win: boolean; why: string; time: number; kills: number; level: number; scrap: number; record: boolean; dmg: Record<string, number>; seed: string }) {
  $("overTitle").textContent = r.win ? "VICTORIA" : "FIN DE LA PARTIDA";
  $("overTxt").textContent = r.why;
  $("overStats").innerHTML = [["Tiempo", fmt(r.time)], ["Bajas", r.kills], ["Nivel", r.level], ["Tornillos", "+" + r.scrap]].map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join("");
  $("overRec").classList.toggle("hidden", !r.record);
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

// ---------- Arranque ----------
export function initMenu(a: Api) {
  api = a;
  L0 = { grain: LOOK.grain, scan: LOOK.scan, ca: LOOK.ca, outline: LOOK.outline };
  applySettings();
  const fe = $("fe");
  fe.addEventListener("focusin", () => SFX.blip());
  // Mouse: el foco sigue al puntero solo si se mueve (pointerover le robaría el foco al teclado al cambiar de pantalla)
  fe.addEventListener("pointermove", (e) => { const el = (e.target as HTMLElement).closest<HTMLElement>("button:not(:disabled), select, input, [tabindex]"); if (el && el !== document.activeElement) el.focus({ preventScroll: true }); });
  fe.addEventListener("click", (e) => {
    const t = e.target as HTMLElement, d = (t.closest("[data-go],[data-act],[data-k],[data-paint],[data-rim],[data-tab],[data-tog],[data-bind]") as HTMLElement | null)?.dataset;
    if (current() === "title") { SFX.accept(); return go("main"); }
    if (!d) return;
    SFX.accept();
    if (d.go) go(d.go as Scr);
    else if (d.act === "play") api.play();
    else if (d.act === "back") back();
    else if (d.act === "export") exportSave();
    else if (d.act === "import") importSave();
    else if (d.act === "resume") api.resume();
    else if (d.act === "quit") api.quit();
    else if (d.act === "install") void installEv?.prompt().finally(() => { installEv = null; $("install").classList.add("hidden"); }); // el evento sirve una sola vez
    else if (d.tab) { tab = d.tab; renderConfig(); (document.querySelector(`[data-tab="${tab}"]`) as HTMLElement).focus(); }
    else if (d.tog) { const [o, k] = ref(d.tog); o[k] = !o[k]; commit(); renderConfig(); (document.querySelector(`[data-tog="${d.tog}"]`) as HTMLElement).focus(); }
    else if (d.bind) { binding = d.bind as Action; renderConfig(); (document.querySelector(`[data-bind="${d.bind}"]`) as HTMLElement).focus(); }
    else if (d.paint || d.rim) { if (d.paint) save.paint = d.paint; else save.rim = d.rim!; persist(); renderGarage(); (document.querySelector(`[data-${d.paint ? "paint" : "rim"}="${d.paint ?? d.rim}"]`) as HTMLElement).focus(); }
    else if (d.k && current() === "garage") {
      const k = d.k as CarKind;
      if (!save.cars.includes(k)) { if (save.scrap < CARS[k].cost) return; save.scrap -= CARS[k].cost; save.cars.push(k); }
      save.car = k; persist(); renderGarage(); (document.querySelector(`.carc[data-k="${k}"]`) as HTMLElement).focus();
    } else if (d.k && current() === "shop") {
      const k = d.k as keyof Save["perm"], cost = shopCost(save.perm[k]);
      if (save.scrap < cost || save.perm[k] >= 5) return;
      save.scrap -= cost; save.perm[k]++; persist(); renderShop();
      const b = document.querySelector<HTMLButtonElement>(`#shop [data-k="${k}"]`)!;
      (b.disabled ? focusables()[0] : b)?.focus();
    }
  });
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
