// Garaje: pintura por zona y editor de calcos (extraído de menu.ts).
import { btnChip, ctl, pb } from "../input";
import { DECAL_BLANK, DECAL_N, DECAL_PAL, factoryColor, GARAGE_DECALS, GARAGE_FINISHES, PAINTS, type GarageDecalId } from "../models";
import { ACH, type AchId } from "../achievements";
import { SFX } from "../sfx";
// Sin import de valores de "../menu" (ciclo): menu.ts los entrega por initPaint(m) al final de su evaluación.
type Menu = Pick<typeof import("../menu"), "$"|"focusSel"|"peek"|"persist"|"renderGarage"|"save"|"shownCar"|"tabsHtml">;
let { $, focusSel, peek, persist, renderGarage, save, shownCar, tabsHtml } = {} as Menu;


// Colores y calcos extra: se desbloquean con logros existentes (save.ach). Sin campos nuevos en el guardado: el calco se copia como grilla normal (validDecal).
const A = (rows: string[]) => rows.join("");
export const LOCKED_PAINTS: Record<string, [string, string]> = { // color -> [logro, nombre]
  "#39ff14": ["chispazo", "Verde cortocircuito"], "#ff2d95": ["globos", "Magenta cumpleaños"], "#7a1f1f": ["rey", "Burdeos real"],
  "#e8d9a8": ["tarantula", "Hueso de inquilina"], "#0a2a6b": ["encore_final", "Azul telón"], "#ffd23f": ["diez", "Amarillo horas extra"],
};
export const DECAL_TPL: Record<string, { name: string; ach: string; grid: string }> = {
  rayo: { name: "Rayo", ach: "gana_formula", grid: A(["0000000000000000","0000000066600000","0000000666000000","0000006660000000","0000066600000000","0000666666666000","0000066666660000","0000000066600000","0000000666000000","0000006660000000","0000006600000000","0000066000000000","0000060000000000","0000000000000000","0000000000000000","0000000000000000"]) },
  calavera: { name: "Calavera de tuerca", ach: "gato", grid: A(["0000000000000000","0000222222220000","0002222222222000","0022222222222200","0022112222112200","0022112222112200","0022112222112200","0002222112222000","0000222222220000","0000221212120000","0000221212120000","0000022222200000","0000333333330000","0003300000033000","0000333333330000","0000000000000000"]) },
  llamas: { name: "Llamas", ach: "anillo", grid: A(["0000000000000000","0000060000000000","0000066000600000","0000066006660000","0006066606660000","0006666666660600","0066666666666600","0066655666556660","0666655566655660","0666655556555660","0666555555555660","0666555555555660","0066555555555600","0066655555556600","0006666666666000","0000066666660000"]) },
  numero: { name: "Carrera 07", ach: "intacto", grid: A(["0000000000000000","0222222222222220","0211111111111120","0211111111111120","0211222222221120","0211111111121120","0211111111211120","0211111112111120","0211111121111120","0211111211111120","0211112111111120","0211111111111120","0211111111111120","0222222222222220","0000000000000000","0000000000000000"]) },
};
const has = (a: string) => save.ach.includes(a as never);

export const PZ = { paint: "Carrocería", trim: "Detalles", rim: "Llantas" };
export let pz: keyof typeof PZ = "paint";

// ---------- Pintura por zona (garaje → Pintura): paleta + selector libre (tono, saturación, brillo) ----------
// Las perillas son <input type="range">: mouse, dedo, flechas y el stick (move() ya las mueve) sin código propio. Gratis: los colores no cuestan tornillos.
const zoneColor = () => save[pz] || factoryColor(shownCar())[pz];
const hex2hsv = (h: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  const hue = !d ? 0 : mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [Math.round(hue * 60), mx ? Math.round((d / mx) * 100) : 0, Math.round(mx * 100)];
};
const hsv2hex = (h: number, s: number, v: number) => "#" + [5, 3, 1].map((n) => { const k = (n + h / 60) % 6; return Math.round((v / 100) * (1 - (s / 100) * Math.max(0, Math.min(k, 4 - k, 1))) * 255).toString(16).padStart(2, "0"); }).join("");
const isGlossy = (c: string) => {
  const [, s, v] = hex2hsv(c);
  const isMetallic = ["#c0c0c0", "#d4af37", "#b87333", "#5b6470"].includes(c.toLowerCase());
  return isMetallic || (s >= 60 && v >= 60);
};
type PaintFilter = "todos" | "brillo" | "mates";
let pfilt: PaintFilter = "todos";
// Fondos de las barras: cada una muestra hacia dónde va el color con las otras dos fijas
function hsvBars(h: number, sat: number, v: number) {
  const el = $("paint");
  el.style.setProperty("--hue", hsv2hex(h, 100, 100)); el.style.setProperty("--sat0", hsv2hex(h, 0, v)); el.style.setProperty("--sat1", hsv2hex(h, 100, v)); el.style.setProperty("--val1", hsv2hex(h, sat, 100));
  const c = hsv2hex(h, sat, v), chip = document.getElementById("pzchip"), dot = document.getElementById("pzdot"), lbl = document.getElementById("swLabel");
  if (chip) { chip.style.background = c; chip.textContent = c.toUpperCase(); }
  if (dot) dot.style.background = c;
  if (lbl) lbl.textContent = `CÓD. PNT ${c.toUpperCase()} · TONO TALLER`;
}
export function renderPaint() {
  const cur = zoneColor(), [h, sat, v] = hex2hsv(cur), mine = !!save[pz];
  const bar = (k: string, lab: string, max: number, val: number) => `<label class="hrow"><span>${lab}</span><input type="range" data-hsv="${k}" min="0" max="${max}" step="${k === "h" ? 5 : 2}" value="${val}" aria-label="${lab}"></label>`;
  const customZones = (["paint", "trim", "rim"] as (keyof typeof PZ)[]).filter((z) => !!save[z]).length;
  const decalTag = save.decalSel >= 0 && save.decals[save.decalSel] ? `CALCO #${save.decalSel + 1} ACTIVO` : "SIN CALCO EN CAPÓ";
  const statusPill = `<div class="paint-status"><span id="pztBadge" class="paint-badge">PATRONES: ${customZones}/3 ZONAS</span><span class="decal-badge">${decalTag}</span></div>`;
  const PFILTS: [PaintFilter, string][] = [
    ["todos", "TODOS"],
    ["brillo", "BRILLO/METAL"],
    ["mates", "MATES"],
  ];
  const filterBar = `<div class="paint-filters">${PFILTS.map(([f, lab]) => `<button class="p-filter ${pfilt === f ? "active" : ""}" data-pfilt="${f}">${lab}</button>`).join("")}</div>`;
  const isHidden = (c: string) => (pfilt === "brillo" && !isGlossy(c)) || (pfilt === "mates" && isGlossy(c));
  const finishBar = pz === "paint" ? `<div class="paint-finishes"><span class="fin-lab">TEXTURA PBR:</span><button class="opt ${!save.finish ? "on" : ""}" data-pfin="" title="Laca brillante lisa de fábrica">Laca lisa</button>${Object.entries(GARAGE_FINISHES).map(([id, f]) => `<button class="opt ${save.finish === id ? "on" : ""}" data-pfin="${id}" title="${f.desc}">${f.name}</button>`).join("")}</div>` : "";
  $("paint").innerHTML = statusPill + `<div class="tabs pzt">${tabsHtml(PZ, pz, "pz")}</div>`
    + finishBar
    + filterBar
    + `<div class="pal">${PAINTS.map((c) => `<button class="${["sw", isGlossy(c) && "glossy", mine && c === cur && "on", isHidden(c) && "hidden"].filter(Boolean).join(" ")}" data-sw="${c}" style="background:${c}" aria-label="${PZ[pz]} ${c}"></button>`).join("")}</div>`
    + `<div class="pal">${Object.entries(LOCKED_PAINTS).map(([c, [a, n]]) => has(a) ? `<button class="sw glossy ${mine && c === cur ? "on" : ""}" data-sw="${c}" style="background:${c}" title="${n}" aria-label="${PZ[pz]} ${n}"></button>` : `<button class="sw locked" disabled style="background:${c};opacity:.35" title="${n} · Logro: ${ACH[a as AchId].txt}" aria-label="${n}, bloqueado. Logro: ${ACH[a as AchId].txt}"></button>`).join("")}</div>`
    + `<div class="note">${Object.values(LOCKED_PAINTS).length - Object.keys(LOCKED_PAINTS).filter((c) => has(LOCKED_PAINTS[c][0])).length ? "Candado: " + Object.keys(LOCKED_PAINTS).filter((c) => !has(LOCKED_PAINTS[c][0])).map((c) => `${LOCKED_PAINTS[c][1]} (Logro: ${ACH[LOCKED_PAINTS[c][0] as AchId].txt})`).join(" · ") : "Todos los colores de logro desbloqueados."}</div>`
    + `<div id="swLabel" class="sw-label">CÓD. PNT ${cur.toUpperCase()} · TONO TALLER</div>`
    + `<div class="hsv"><div class="hsvt"><span><i id="pzdot" class="sw-dot" style="background:${cur}"></i>${PZ[pz]} · ${mine ? "Personalizado" : "De fábrica"}</span><b id="pzchip"></b><button class="opt ${mine ? "" : "on"}" data-pdef="1">De fábrica</button></div>`
    + bar("h", "Tono", 360, h) + bar("s", "Saturación", 100, sat) + bar("v", "Brillo", 100, v) + `</div>`
    + `<div class="note">${pz === "trim" ? "Detalles: alerón, paragolpes, defensas y accesorios." : pz === "rim" ? "Llantas de las cuatro ruedas (o de las que haya)." : "Carrocería: la chapa entera."} Pintar es gratis: el patio cobra en otras cosas.</div>`;
  hsvBars(h, sat, v);
  $("paint").querySelectorAll<HTMLElement>(".paint-finishes [data-pfin]").forEach((b) => {
    const fin = b.dataset.pfin ?? "";
    const setPeek = () => {
      SFX.blip();
      peek.finish = fin || undefined;
    };
    const clearPeek = () => {
      if (peek.finish === (fin || undefined)) {
        peek.finish = undefined;
      }
    };
    b.addEventListener("mouseenter", setPeek);
    b.addEventListener("mouseleave", clearPeek);
    b.addEventListener("focus", setPeek);
    b.addEventListener("blur", clearPeek);
  });
  $("paint").querySelectorAll<HTMLElement>(".pal .sw").forEach((b) => {
    const c = b.dataset.sw;
    if (!c) return;
    const setPeek = () => {
      SFX.blip();
      peek.paint = c;
      const chip = document.getElementById("pzchip"), dot = document.getElementById("pzdot"), lbl = document.getElementById("swLabel");
      if (chip) { chip.style.background = c; chip.textContent = c.toUpperCase(); }
      if (dot) dot.style.background = c;
      if (lbl) lbl.textContent = `CÓD. PNT ${c.toUpperCase()} · TONO TALLER`;
    };
    const clearPeek = () => {
      if (peek.paint === c) {
        peek.paint = undefined;
        const base = zoneColor();
        const chip = document.getElementById("pzchip"), dot = document.getElementById("pzdot"), lbl = document.getElementById("swLabel");
        if (chip) { chip.style.background = base; chip.textContent = base.toUpperCase(); }
        if (dot) dot.style.background = base;
        if (lbl) lbl.textContent = `CÓD. PNT ${base.toUpperCase()} · TONO TALLER`;
      }
    };
    b.addEventListener("mouseenter", setPeek);
    b.addEventListener("mouseleave", clearPeek);
    b.addEventListener("focus", setPeek);
    b.addEventListener("blur", clearPeek);
  });
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
export let editing = false;
export let dcol = 4;
let eslot = 0, draft = DECAL_BLANK, dcx = 0, dcy = 0, stroke = false, erasing = false;
const dirty = () => draft !== (save.decals[eslot] || DECAL_BLANK);
const DHINT = { keys: () => "Clic o arrastre pinta, clic derecho borra · Flechas mueven el cursor, Enter pinta · 1 a 8 cambian el color, 0 borra · Ctrl+Z o Cmd+Z deshace", pad: () => `Stick o cruceta mueven el cursor · ${btnChip(pb("ok"))} pinta · ${btnChip(4)} y ${btnChip(5)} cambian el color · ${btnChip(2)} deshace`, touch: () => "Arrastra el dedo sobre la grilla para pintar" };
export function decalHtml() {
  const slots = [0, 1, 2].map((i) => `<button class="opt ${save.decalSel === i ? "on" : ""} ${eslot === i ? "edit" : ""} ${save.decals[i] ? "" : "locked"}" data-dsel="${i}">Diseño ${i + 1}</button>`).join("");
  const scrapDecals = (Object.entries(GARAGE_DECALS) as [GarageDecalId, { name: string; src: string; desc: string }][]).map(([id, info]) => {
    const isAct = save.decalSel >= 0 && save.decals[save.decalSel] === id;
    return `<button class="opt decal-opt ${isAct ? "on" : ""}" data-dpre="${id}" title="${info.desc}"><img class="decal-thumb" src="${info.src}" alt="${info.name}" width="20" height="20" /> ${info.name}</button>`;
  }).join("");
  const tpl = Object.entries(DECAL_TPL).map(([id, t]) => has(t.ach)
    ? `<button class="opt" data-dtpl="${id}" title="Copia el diseño a la ranura en edición">${t.name}</button>`
    : `<button class="opt locked" disabled title="Logro: ${ACH[t.ach as AchId].txt}">Candado · ${t.name} · Logro: ${ACH[t.ach as AchId].txt}</button>`).join("");
  return `<div class="slot"><span>Calcos de logro</span>${tpl}</div><div class="slot decal-scrap-slot"><span>Calcos de chatarra (HD)</span>${scrapDecals}</div>`
    + `<div class="slot"><span>Calco propio de capó</span><button class="opt ${save.decalSel < 0 ? "on" : ""}" data-dsel="-1">Sin calco</button>${slots}${editing ? "" : `<button class="opt" data-dact="edit">Editar</button>`}</div>`
    + (!editing ? "" : `<div class="dedit"><canvas id="dgrid" tabindex="0" width="256" height="256" aria-label="Grilla del calco"></canvas><div class="dside">`
    + `<div class="dpal">${DECAL_PAL.map((c, k) => `<button class="sw ${dcol === k + 1 ? "on" : ""}" data-dcol="${k + 1}" style="background:${c}" aria-label="color ${k + 1}"></button>`).join("")}</div>`
    + `<div class="dbtn"><button class="opt ${dcol === 0 ? "on" : ""}" data-dcol="0">Borrar</button><button class="opt" data-dact="undo">Deshacer</button><button class="opt" data-dact="clear">Vaciar</button><button class="opt" data-dact="save">Guardar</button><button class="opt" data-dact="done">Listo</button></div>`
    + `<div id="dstat"></div></div></div><div class="note">${DHINT[ctl]()}</div>`);
}
export function drawGrid() {
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
export function undo() { const p = hist.pop(); if (p === undefined) return; draft = p; drawGrid(); SFX.back(); }
export const setCol = (n: number) => { dcol = n; for (const b of document.querySelectorAll<HTMLElement>("[data-dcol]")) b.classList.toggle("on", +b.dataset.dcol! === n); };
const cellOf = (e: PointerEvent, cv: HTMLElement) => { const r = cv.getBoundingClientRect(), f = (v: number, o: number, s: number) => Math.min(DECAL_N - 1, Math.max(0, Math.floor(((v - o) / s) * DECAL_N))); return [f(e.clientX, r.left, r.width), f(e.clientY, r.top, r.height)] as const; };


/** Cambios de estado del editor que menu.ts pide desde fuera (set de `editing`, paso del cursor con el teclado). */
export const setEditing = (v: boolean) => { editing = v; };
export function gridStep(dx: number, dy: number) { const x = dcx + dx, y = dcy + dy; if (x < 0 || x >= DECAL_N || y < 0 || y >= DECAL_N) return false; dcx = x; dcy = y; drawGrid(); return true; }
/** Clics de calcos y pintura (data-dsel, dpre, dcol, dact, sw, pdef, pfin, pz, pfilt). Devuelve si lo atendió. */
export function paintClick(d: DOMStringMap): boolean {
    if (d.dsel !== undefined) { // elegir diseño: se edita y, si ya tiene dibujo, se aplica al capó
      const n = +d.dsel;
      if (n < 0) save.decalSel = -1;
      else { eslot = n; draft = save.decals[n] || DECAL_BLANK; hist = []; if (save.decals[n]) save.decalSel = n; }
      persist(); renderGarage(); focusSel(`[data-dsel="${n}"]`);
    }
    else if (d.dpre) { // aplicar calco oficial de chatarra (HD) a la ranura actual
      const pre = d.dpre;
      if (save.decalSel >= 0 && save.decals[save.decalSel] === pre) {
        save.decals[save.decalSel] = "";
        save.decalSel = -1;
      } else {
        if (save.decalSel < 0) save.decalSel = eslot;
        save.decals[save.decalSel] = pre;
        draft = pre;
      }
      persist(); renderGarage(); focusSel(`[data-dpre="${pre}"]`);
    }
    else if (d.dtpl) { const t = DECAL_TPL[d.dtpl]; if (t && has(t.ach)) { snap(); draft = t.grid; drawGrid(); if (!editing) { save.decals[eslot] = draft; save.decalSel = eslot; persist(); } renderGarage(); focusSel(`[data-dtpl="${d.dtpl}"]`); } }
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
    else if (d.sw && LOCKED_PAINTS[d.sw] && !has(LOCKED_PAINTS[d.sw][0])) return true;
    else if (d.sw || d.pdef) { peek.paint = undefined; save[pz] = d.sw ?? ""; persist(); renderPaint(); focusSel(d.sw ? `[data-sw="${d.sw}"]` : "[data-pdef]"); }
    else if (d.pfin !== undefined) { peek.finish = undefined; save.finish = d.pfin; persist(); renderPaint(); focusSel(`[data-pfin="${d.pfin}"]`); }
    else if (d.pz) { peek.paint = undefined; pz = d.pz as typeof pz; renderPaint(); focusSel(`[data-pz="${pz}"]`); }
    else if (d.pfilt) { peek.paint = undefined; pfilt = d.pfilt as typeof pfilt; renderPaint(); focusSel(`[data-pfilt="${pfilt}"]`); }
    else return false;
  return true;
}
/** Grilla de calcos con puntero: se engancha una vez al contenedor #fe. */
export function gridPointers(fe: HTMLElement) {
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
}
export const paintAtCursor = () => setCell(dcx, dcy, dcol);
/** Estado inicial del editor desde el guardado; menu.ts lo llama tras crear `save` (este módulo se evalúa antes que menu.ts). */
export function initPaint(m: Menu) { ({ $, focusSel, peek, persist, renderGarage, save, shownCar, tabsHtml } = m); eslot = Math.max(0, save.decalSel); draft = save.decals[eslot] || DECAL_BLANK; }
