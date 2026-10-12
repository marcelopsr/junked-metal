// Configuración → Controles: asignación de teclas y botones, probar joystick (extraído de menu.ts).
import { activePad, btnChip, btnName, FAM_NAME, famOf, PAD, padAny } from "../input";
import { raceCfg } from "../kart_cfg";
// Sin import de valores de "../menu" (ciclo): menu.ts los entrega por initBindings(m) al final de su evaluación.
type Menu = Pick<typeof import("../menu"), "commit"|"current"|"DEFAULT"|"focusSel"|"keyName"|"renderConfig"|"save"|"setArmed"|"TABS"> & { armed: () => string | null };
let { commit, current, DEFAULT, focusSel, keyName, renderConfig, save, setArmed, TABS } = {} as Omit<Menu, "armed">, armed = (): string | null => null;
export function initBindings(m: Menu) { ({ commit, current, DEFAULT, focusSel, keyName, renderConfig, save, setArmed, TABS, armed } = m); }

// ---------- Controles: asignaciones ----------
// Ruta de una ranura: "<tabla>.<acción>.<n>". Tablas: k teclado, p joystick, r1/r2 teclados de carrera, rp joystick de carrera.
type Slots = Record<string, (string | number)[]>;
const TBL: Record<string, () => Slots> = { k: () => save.keys, p: () => save.pad.btn, r1: () => save.race.kb1, r2: () => save.race.kb2, rp: () => save.race.pad };
const isPad = (path: string) => /^(p|rp)\./.test(path);
const NAV = ["ok", "back"]; // aceptar/volver son del menú: no chocan con los botones de manejo
const slotOf = (path: string) => { const [t, a, i] = path.split("."); return [TBL[t]()[a], +i] as const; };
let labels: Record<string, string> | undefined; // perezoso: TABS vive en menu.ts, que se evalúa después de este módulo
const LABEL = (p: string) => (labels ??= Object.fromEntries(TABS.ctl.rows.filter((r) => r[1] === "bind").map((r) => [r[2], r[0]])))[p];
const slotTxt = (path: string, v: string | number) => (isPad(path) ? (v === -1 ? "—" : btnChip(v as number)) : v ? keyName(v as string) : "—");
export const esc = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
export let binding: string | null = null, bindT = 0; // ranura esperando tecla o botón y cuándo empezó (6 s sin nada cancela)
export let dup: { path: string; other: string; prev: string | number } | null = null; // repetida recién asignada: se ofrece intercambiar
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
export const cancelBind = () => { const b = binding; binding = null; renderConfig(); if (b) focusSel(`[data-bind="${b}"]`); };
export function bindRow(label: string, path: string) {
  const [t, a] = path.split("."), vs = TBL[t]()[a];
  let h = `<div class="row multi bind"><span class="lb">${label}</span>${vs.map((v, i) => `<button class="slot2" data-bind="${path}.${i}">${binding === `${path}.${i}` ? "…" : slotTxt(path, v)}</button>`).join("")}</div>`;
  if (binding?.startsWith(path + ".")) h += `<div class="note bindnote">${isPad(path) ? `Presiona un botón del joystick para «${label}» · Esc, un clic o 6 s sin tocar nada cancela`
    : `Presiona una tecla para «${label}» · ${a === "pause" ? "Esc queda asignada; un clic o 6 s sin tocar nada cancela" : "Esc cancela · Retroceso deja la ranura vacía"}`}</div>`;
  if (dup?.path.startsWith(path + ".")) { const [arr, i] = slotOf(dup.path);
    h += `<div class="row multi dup"><span class="lb"><small class="why">${isPad(path) ? btnName(arr[i] as number) : keyName(arr[i] as string)} también está en «${LABEL(dup.other.split(".").slice(0, 2).join("."))}»${dup.other.startsWith("r") && dup.other[1] !== path[1] ? ` (${dup.other.startsWith("r1") ? "Teclado 1" : "Teclado 2"})` : ""}.</small></span>`
      + `<button data-act="swap">Intercambiar</button><button data-act="keepdup">Dejar repetida</button></div>`; }
  return h;
}
/** Captura de tecla (keydown de menu.ts); devuelve true si la consumió. */
export function bindKey(e: KeyboardEvent) {
  if (!binding) return false;
  e.preventDefault();
  if (e.repeat) return true; // la tecla que abrió la captura sigue apretada
  if (isPad(binding)) { if (e.code === "Escape") cancelBind(); return true; }
  if (e.code === "Escape" && !binding.startsWith("k.pause.")) cancelBind();
  else setSlot(binding, e.code === "Backspace" || e.code === "Delete" ? "" : e.code);
  return true;
}
/** Captura de botón (menuPad, cada cuadro); devuelve true mientras espera. */
export function bindPad() {
  if (!binding) return false;
  if (performance.now() - bindT > 6000) { cancelBind(); return true; }
  if (isPad(binding)) { const i = padAny(); if (i >= 0) setSlot(binding, i); }
  return true;
}
export function ctlAct(act: string) {
  const [a, x] = act.split(":"), again = armed() === act;
  setArmed(null);
  if (a === "swap" && dup) { const [arr, i] = slotOf(dup.other); arr[i] = dup.prev; const p = dup.path; dup = null; commit(); renderConfig(); return focusSel(`[data-bind="${p}"]`); }
  if (a === "keepdup") { const p = dup?.path; dup = null; renderConfig(); return focusSel(`[data-bind="${p}"]`); }
  const twoStep = a === "reset" || (a === "psave" && save.profiles[+x]);
  if (twoStep && !again) { // primer clic: pide confirmar (se desarma solo a los 4 s)
    setArmed(act); renderConfig(); focusSel(`[data-act="${act}"]`);
    return void setTimeout(() => { if (armed() === act) { setArmed(null); if (current() === "config") { renderConfig(); focusSel(`[data-act="${act}"]`); } } }, 4000);
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
export const padTestHtml = () => `<div class="ptest" id="ptest"><div class="pt-id"></div><div class="pt-row">${[0, 1].map((k) => `<div class="pt-st"><div class="pt-ring"><i class="dz"></i><i class="dot"></i></div><span>Stick ${k ? "derecho" : "izquierdo"}</span><em></em></div>`).join("")}`
  + `<div class="pt-tr">${[6, 7].map((i) => `<div>${btnName(i)}<b><i></i></b></div>`).join("")}</div></div><div class="pt-bt">${[...Array(17).keys()].map((i) => `<kbd class="pb ${famOf()}" data-b="${i}">${btnName(i)}</kbd>`).join("")}</div></div>`;
export function padTest() {
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


export const resetBind = () => { binding = null; dup = null; };
export const toggleBind = (path: string) => { binding = binding === path ? null : path; bindT = performance.now(); dup = null; };
