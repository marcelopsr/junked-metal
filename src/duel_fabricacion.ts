// UI de fabricación RoboCraft (rejilla + cajón). La escena 3D la actualiza duel.ts vía onChange.
import "./hud.css";
import "./duel_fabricacion.css";
import { icon } from "./icons";
import { isTouch } from "./input";
import { SFX } from "./sfx";
import { BAL } from "./balance";
import {
  type BlockCat, type Cell, type RobotBuild, type Rot,
  TEMPLATES, allBlockIds,   blockDef, blocksByCat, canPlace, cellAt, footprint, massOfBuild,
  mirrorBuildX, moveCell, occupied, placeCell, removeAt, saveBuild, statsOfBuild, validateBuild, wheelCount,
} from "./duel_build";

const D = BAL.duelo;
const CATS: { id: BlockCat; lab: string; ico: string }[] = [
  { id: "chasis", lab: "Chasis", ico: "fab_chasis" },
  { id: "movimiento", lab: "Ruedas", ico: "fab_rueda" },
  { id: "arma", lab: "Arma", ico: "fab_arma" },
  { id: "especial", lab: "Especial", ico: "fab_especial" },
  { id: "cosmetico", lab: "Extra", ico: "fab_extra" },
];

const ROT_ARROW = ["↑", "→", "↓", "←"];

function layerPlanoLabel(y: number, maxY: number): string {
  if (y === 0) return "Plano base";
  if (y >= maxY) return "Plano superior";
  return `Plano altura ${y}`;
}

export type FabApi = {
  root: HTMLElement;
  getBuild(): RobotBuild;
  setBuild(b: RobotBuild): void;
  sync(): void;
  refreshGhost(): void;
  openDrawer(on?: boolean): void;
  destroy(): void;
};

export function mountFabricacion(
  host: HTMLElement,
  opts: {
    onChange(b: RobotBuild): void;
    onConfirm(): void;
    onLayout?(): void;
    onZoom?(mul: number): void;
    onMenu?(): void;
    onResetCam?(): void;
    onHoverCell?(info: { probe: Cell; can: boolean; erase: boolean } | null): void;
  },
): FabApi {
  let build: RobotBuild = { cells: [] };
  let selected = "chapa";
  let cat: BlockCat = "chasis";
  let layerY = 1;
  let rot: Rot = 0;
  let erase = false;
  let drawerOpen = !isTouch;
  let placedFlash: string | null = null;
  let placedFlashT = 0;
  let rejectFlashT = 0;
  let ghostPin: { x: number; z: number } | null = null;
  /** Bloque ya colocado elegido para mover o reorientar (R). */
  let picked: Cell | null = null;
  let gridDrag = false;
  /** Arrastre para mover pieza seleccionada (suelta en destino; no pinta en cada celda). */
  let dragMove = false;
  let lastPaintKey = "";
  let validAnchorsSig = "";
  let validAnchors = new Set<string>();
  const undo: RobotBuild[] = [];

  const root = document.createElement("div");
  root.id = "duel-fab";
  root.className = "duel-fab";
  root.innerHTML = `<header class="duel-fab-head"><div class="duel-fab-nav">
<button type="button" class="duel-fab-btn duel-fab-nav-btn" id="duel-fab-menu">Menú principal</button>
<button type="button" class="duel-fab-btn duel-fab-nav-btn" id="duel-fab-cam-reset">Recentrar vista</button>
</div>
<p class="duel-fab-kicker">Demolición · mesa RC</p><h1 class="duel-fab-title">Fabricación</h1>
<p class="duel-fab-hint">Vista 3D arriba · rejilla abajo: cada bloque se ve en la mesa al colocarlo</p>
<p class="duel-fab-fallback">Arrastrar vista · R gira pieza · M espejo · Z deshacer · plantillas a la izquierda</p></header>
<div class="duel-fab-main">
<aside class="duel-fab-side h-panel" aria-labelledby="duel-fab-stats"><h2 id="duel-fab-stats" class="duel-sec-h">Telemetría</h2>
<div class="duel-fab-bars" id="duel-fab-bars"></div>
<div class="duel-fab-paint-preview" id="duel-fab-paint-preview" aria-label="Vista previa de pintura" hidden></div>
<details class="duel-paint-wrap" id="duel-fab-paint-details"><summary class="duel-paint-sum">Pintura <span class="duel-opt">(opcional)</span></summary><div class="duel-paint" id="duel-fab-paint"></div></details>
<div class="duel-fab-tpl" id="duel-fab-tpl"></div>
<p class="duel-fab-warn" id="duel-fab-warn" role="status" aria-live="polite"></p></aside>
<div class="duel-fab-center">
<div class="duel-fab-viewport duel-fab-visor" id="duel-fab-viewport" role="region" aria-label="Vista del robot en la mesa">
<span class="duel-fab-corner tl" aria-hidden="true"></span><span class="duel-fab-corner tr" aria-hidden="true"></span>
<span class="duel-fab-corner bl" aria-hidden="true"></span><span class="duel-fab-corner br" aria-hidden="true"></span>
<span class="duel-fab-visor-tag">VISOR 3D</span>
<div class="duel-fab-paint-chip" id="duel-fab-paint-chip" hidden aria-hidden="true"></div>
<div class="duel-fab-zoom" aria-label="Zoom de cámara">
<button type="button" class="duel-fab-btn duel-fab-zoom-btn" id="duel-fab-zoom-out" aria-label="Alejar"></button>
<button type="button" class="duel-fab-btn duel-fab-zoom-btn" id="duel-fab-zoom-in" aria-label="Acercar"></button>
</div>
<p class="duel-fab-view-hint">Arrastrar vista · rueda o +/− · pellizco zoom</p>
<p class="duel-fab-empty" id="duel-fab-empty" hidden>Sin piezas: elegir bloque y tocar la rejilla, o una plantilla</p>
</div>
<div class="duel-fab-build h-panel">
<header class="duel-fab-build-head">
<p class="duel-fab-equip" id="duel-fab-equip" aria-live="polite"></p>
<p class="duel-fab-coach" id="duel-fab-coach" hidden></p>
<p class="duel-fab-rot-hint" id="duel-fab-rot-hint"></p>
</header>
<div class="duel-fab-grid-wrap">
<div class="duel-fab-grid-row">
<div class="duel-fab-layers-rail" aria-labelledby="duel-fab-layers-title">
<p id="duel-fab-layers-title" class="duel-fab-layers-title">${icon("fab_layers", 14)} Perfil Y</p>
<div class="duel-fab-prof-wrap">
<div class="duel-fab-prof-ticks" id="duel-fab-prof-ticks" aria-hidden="true"></div>
<div class="duel-fab-profile" id="duel-fab-profile" aria-hidden="true"></div>
</div>
<div class="duel-fab-layers" id="duel-fab-layers" role="tablist" aria-label="Alturas del robot"></div>
</div>
<div class="duel-fab-grid-main">
<div class="duel-fab-layer">
<div class="duel-fab-layer-lab">
<span class="duel-sec-h">Plano de montaje</span>
<span id="duel-fab-ylab" class="duel-fab-ylab">Plano altura 1</span>
<span id="duel-fab-ydim" class="duel-fab-ydim">Altura 1 de 3</span>
</div>
<div class="duel-fab-layer-nav">
<button type="button" class="duel-fab-btn duel-fab-plane-btn" id="duel-fab-ydown" aria-label="Ver plano inferior"></button>
<button type="button" class="duel-fab-btn duel-fab-plane-btn" id="duel-fab-yup" aria-label="Ver plano superior"></button>
</div></div>
<div class="duel-fab-grid" id="duel-fab-grid" role="grid" aria-label="Rejilla de fabricación"></div>
<div class="duel-fab-tools">
<button type="button" class="duel-fab-btn duel-fab-tool-btn" id="duel-fab-rot">${icon("fab_rot", 16)} Girar (R)</button>
<button type="button" class="duel-fab-btn duel-fab-tool-btn" id="duel-fab-mir">${icon("fab_mirror", 16)} Espejo (M)</button>
<button type="button" class="duel-fab-btn duel-fab-tool-btn" id="duel-fab-undo">${icon("fab_undo", 16)} Deshacer (Z)</button>
<button type="button" class="duel-fab-btn duel-fab-tool-btn" id="duel-fab-erase">${icon("fab_erase", 16)} Borrar</button>
<button type="button" class="duel-fab-btn" id="duel-fab-clear">Vaciar</button>
</div></div></div></div></div></div>
<aside class="duel-fab-drawer h-panel" id="duel-fab-drawer">
<div class="duel-fab-drawer-head">
<button type="button" class="duel-fab-drawer-tab duel-fab-btn" id="duel-fab-drawer-toggle" aria-controls="duel-fab-drawer-panel" aria-expanded="true">Ocultar catálogo</button>
</div>
<div class="duel-fab-drawer-panel" id="duel-fab-drawer-panel">
<div class="duel-fab-tabs" id="duel-fab-tabs" role="tablist"></div>
<div class="duel-fab-inv" id="duel-fab-inv" role="list"></div>
</div></aside></div>
<button type="button" class="duel-cta" id="duel-fab-confirm">Confirmar fabricación</button>`;
  host.appendChild(root);

  const $ = (id: string) => root.querySelector("#" + id) as HTMLElement;

  function pushUndo() {
    undo.push(structuredClone(build));
    if (undo.length > 40) undo.shift();
  }

  function apply(next: RobotBuild) {
    build = next;
    saveBuild(build);
    opts.onChange(build);
    sync();
  }

  function syncDrawer() {
    const drawer = $("duel-fab-drawer");
    const btn = $("duel-fab-drawer-toggle") as HTMLButtonElement;
    drawer.classList.toggle("closed", !drawerOpen);
    const nudge = isTouch && !drawerOpen && build.cells.length === 0;
    drawer.classList.toggle("nudge-catalog", nudge);
    btn.classList.toggle("nudge", nudge);
    btn.setAttribute("aria-expanded", String(drawerOpen));
    btn.textContent = drawerOpen ? "Ocultar catálogo" : (nudge ? "Abrir catálogo de piezas" : "Mostrar catálogo");
    opts.onLayout?.();
  }

  function syncInv() {
    $("duel-fab-tabs").innerHTML = CATS.map((c) =>
      `<button type="button" role="tab" data-cat="${c.id}" class="duel-fab-tab${c.id === cat ? " on" : ""}" aria-selected="${c.id === cat}"><span class="duel-fab-tab-ico">${icon(c.ico, 18)}</span><span>${c.lab}</span></button>`).join("");
    const list = blocksByCat(cat);
    $("duel-fab-inv").innerHTML = list.map((b) =>
      `<button type="button" class="duel-fab-blk duel-fab-btn${b.id === selected ? " on" : ""}" data-blk="${b.id}" role="listitem" title="${b.nombre}">${b.nombre}<br><span class="duel-fab-blk-meta">${b.masa_kg} kg · ${b.sx}×${b.sy}×${b.sz}</span></button>`).join("");
  }

  function layerHasBlocks(y: number) {
    return build.cells.some((c) => {
      const fp = footprint(blockDef(c.blockId), c.rot);
      return y >= c.y && y < c.y + fp.sy;
    });
  }

  function layerTag(y: number, maxY: number): string {
    if (y === 0) return "base";
    if (y >= maxY) return "tope";
    return `${y}`;
  }

  /** Celdas XZ ocupadas en un plano Y (0–1 respecto al área de rejilla). */
  function layerFillRatio(y: number): number {
    const half = D.grid_half_xz;
    const span = half * 2 + 1;
    const maxCells = span * span;
    const keys = new Set<string>();
    for (const c of build.cells) {
      const { sx, sy, sz } = footprint(blockDef(c.blockId), c.rot);
      for (let dy = 0; dy < sy; dy++) {
        if (c.y + dy !== y) continue;
        for (let dx = 0; dx < sx; dx++) for (let dz = 0; dz < sz; dz++) keys.add(`${c.x + dx},${c.z + dz}`);
      }
    }
    return keys.size / maxCells;
  }

  function syncLayers() {
    const maxY = D.grid_max_y;
    const btns: string[] = [];
    const prof: string[] = [];
    const ticks: string[] = [];
    for (let y = maxY; y >= 0; y--) {
      const has = layerHasBlocks(y);
      const on = y === layerY;
      const fill = has ? layerFillRatio(y) : 0;
      const pct = Math.round(fill * 100);
      const dense = fill >= 0.45 ? " dense" : "";
      prof.push(`<div class="duel-fab-prof-seg${on ? " on" : ""}${has ? " has" : ""}${dense}" style="--ly-fill:${pct}%" title="Plano ${layerPlanoLabel(y, maxY)}${has ? ` · ${pct}% rejilla` : ""}"></div>`);
      ticks.push(`<span class="duel-fab-prof-tick${on ? " on" : ""}">${y}</span>`);
    }
    for (let y = 0; y <= maxY; y++) {
      const has = layerHasBlocks(y);
      const tag = layerTag(y, maxY);
      const fill = has ? layerFillRatio(y) : 0;
      const pct = Math.round(fill * 100);
      btns.push(`<button type="button" role="tab" class="duel-fab-ly${y === layerY ? " on" : ""}${has ? " has" : ""}" data-ly="${y}" aria-selected="${y === layerY}" aria-label="${layerPlanoLabel(y, maxY)}${has ? `, ${pct}% de la rejilla ocupada` : ""}"><span class="duel-fab-ly-fill" style="--ly-fill:${pct}%"></span><span class="duel-fab-ly-n">Y${y}</span><span class="duel-fab-ly-t">${tag}</span></button>`);
    }
    $("duel-fab-layers").innerHTML = btns.join("");
    $("duel-fab-profile").innerHTML = prof.join("");
    $("duel-fab-prof-ticks").innerHTML = ticks.join("");
    $("duel-fab-ydim").textContent = `Altura ${layerY} de ${maxY}`;
  }

  function syncGrid() {
    const half = D.grid_half_xz;
    const n = half * 2 + 1;
    const grid = $("duel-fab-grid");
    grid.style.gridTemplateColumns = `repeat(${n}, 2.1rem)`;
    const occ = new Map<string, string>();
    for (const c of build.cells) {
      const def = blockDef(c.blockId);
      // mark all occupied by short name
      const { sx, sy, sz } = footprint(def, c.rot);
      for (let dx = 0; dx < sx; dx++) for (let dy = 0; dy < sy; dy++) for (let dz = 0; dz < sz; dz++) {
        if (c.y + dy === layerY) occ.set(`${c.x + dx},${c.z + dz}`, def.nombre.slice(0, 4));
      }
    }
    const cells: string[] = [];
    for (let z = half; z >= -half; z--) for (let x = -half; x <= half; x++) {
      const key = `${x},${z}`;
      const lab = occ.get(key);
      const onLayer = layerHasBlocks(layerY);
      const flash = placedFlash === key ? " just-placed" : "";
      cells.push(`<button type="button" class="duel-fab-cell${lab ? " filled" : ""}${!onLayer && !lab ? " dim" : ""}${flash}" data-x="${x}" data-z="${z}" aria-label="Celda ${x}, ${layerPlanoLabel(layerY, D.grid_max_y)}, ${z}${lab ? ": " + lab : ""}">${lab ?? ""}</button>`);
    }
    grid.innerHTML = cells.join("");
    $("duel-fab-ylab").textContent = layerPlanoLabel(layerY, D.grid_max_y);
    applyGridPinHighlight();
  }

  function probeAt(x: number, z: number): Cell {
    if (picked) return { ...picked, x, y: layerY, z };
    return { x, y: layerY, z, rot, blockId: selected };
  }

  function canActAt(x: number, z: number): boolean {
    if (erase) return false;
    if (picked) return moveCell(build, picked.x, picked.y, picked.z, x, layerY, z) !== null;
    return canPlace(build, probeAt(x, z));
  }

  function layerFootKeys(cell: Cell): Set<string> {
    const keys = new Set<string>();
    for (const k of occupied(cell)) {
      const [fx, fy, fz] = k.split(",").map(Number);
      if (fy === layerY) keys.add(`${fx},${fz}`);
    }
    return keys;
  }

  function recomputeValidAnchors() {
    const sig = `${build.cells.length}|${picked?.x},${picked?.y},${picked?.z}|${layerY}|${rot}|${selected}|${erase}`;
    if (sig === validAnchorsSig) return;
    validAnchorsSig = sig;
    validAnchors = new Set<string>();
    if (erase) return;
    const half = D.grid_half_xz;
    for (let z = half; z >= -half; z--) {
      for (let x = -half; x <= half; x++) {
        if (canActAt(x, z)) validAnchors.add(`${x},${z}`);
      }
    }
  }

  function allValidFootKeys(): Set<string> {
    const keys = new Set<string>();
    for (const anchor of validAnchors) {
      const [x, z] = anchor.split(",").map(Number);
      for (const k of layerFootKeys(probeAt(x, z))) keys.add(k);
    }
    return keys;
  }

  function applyGridPinHighlight() {
    recomputeValidAnchors();
    const pickedKeys = picked ? layerFootKeys(picked) : new Set<string>();
    let placeZoneKeys = new Set<string>();
    if (!erase) {
      if (build.cells.length === 0 && ghostPin && canActAt(ghostPin.x, ghostPin.z)) {
        for (const k of layerFootKeys(probeAt(ghostPin.x, ghostPin.z))) placeZoneKeys.add(k);
      } else if (build.cells.length > 0) {
        placeZoneKeys = allValidFootKeys();
      }
    }
    const footKeys = new Set<string>();
    const footBadKeys = new Set<string>();
    const pinOk = ghostPin && !erase && canActAt(ghostPin.x, ghostPin.z);
    if (ghostPin && !erase) {
      const keys = layerFootKeys(probeAt(ghostPin.x, ghostPin.z));
      for (const k of keys) (pinOk ? footKeys : footBadKeys).add(k);
    }
    const def = blockDef(picked?.blockId ?? selected);
    const showRot = def.cat === "movimiento";
    const rotShow = picked?.rot ?? rot;
    gridEl.querySelectorAll(".duel-fab-cell").forEach((btn) => {
      const el = btn as HTMLButtonElement;
      const x = +el.dataset.x!, z = +el.dataset.z!;
      const key = `${x},${z}`;
      const pinned = ghostPin?.x === x && ghostPin?.z === z;
      el.classList.toggle("pin", pinned);
      el.classList.toggle("picked", pickedKeys.has(key));
      const lab = el.classList.contains("filled");
      const footOk = footKeys.has(key);
      const footBad = footBadKeys.has(key);
      el.classList.toggle("can", footOk && !lab);
      el.classList.toggle("foot", footOk);
      el.classList.toggle("foot-bad", footBad && !footOk);
      el.classList.toggle("valid-anchor", build.cells.length > 0 && validAnchors.has(key) && !pickedKeys.has(key) && !lab);
      el.classList.toggle("place-zone", placeZoneKeys.has(key) && !pickedKeys.has(key) && !footOk && !footBad);
      const blocked = pinned && !erase && !lab && !pinOk;
      el.classList.toggle("no-can", blocked);
      el.classList.toggle("rot-hint", showRot && footOk && pinned);
      let rotG = el.querySelector(".duel-fab-rot-g");
      if (showRot && footOk && pinned) {
        if (!rotG) {
          rotG = document.createElement("span");
          rotG.className = "duel-fab-rot-g";
          rotG.setAttribute("aria-hidden", "true");
          el.appendChild(rotG);
        }
        rotG.textContent = ROT_ARROW[rotShow];
      } else rotG?.remove();
      let xMark = el.querySelector(".duel-fab-x");
      if (blocked) {
        if (!xMark) {
          xMark = document.createElement("span");
          xMark.className = "duel-fab-x";
          xMark.setAttribute("aria-hidden", "true");
          xMark.textContent = "×";
          el.appendChild(xMark);
        }
        const base = `Celda ${x}, ${layerPlanoLabel(layerY, D.grid_max_y)}, ${z}`;
        el.setAttribute("aria-label", `${base}, no cabe aquí`);
      } else if (!lab) {
        xMark?.remove();
        const base = `Celda ${x}, ${layerPlanoLabel(layerY, D.grid_max_y)}, ${z}`;
        el.setAttribute("aria-label", footOk || pinOk ? `${base}, colocable` : base);
      } else if (pickedKeys.has(key)) {
        el.setAttribute("aria-label", `Pieza seleccionada en ${x}, ${z}`);
      }
    });
  }

  const COACH_DONE_KEY = "duel_fab_coach_v1";

  function syncCoach() {
    const el = $("duel-fab-coach");
    try {
      if (localStorage.getItem(COACH_DONE_KEY) === "1") { el.hidden = true; return; }
    } catch { /* */ }
    const hasSeat = build.cells.some((c) => c.blockId === "asiento_rc");
    const wheels = wheelCount(build);
    const hasWeapon = build.cells.some((c) => blockDef(c.blockId).cat === "arma");
    let msg = "";
    if (!hasSeat) msg = "Paso 1 · Colocar el asiento RC (tab Especial o una plantilla).";
    else if (wheels < D.min_ruedas) {
      msg = `Paso 2 · Mínimo ${D.min_ruedas} ruedas (oruga ×2). Tocar pieza colocada para seleccionar; zonas verdes = destinos válidos.`;
    } else if (!hasWeapon) msg = "Paso 3 · Añadir un arma (tab Arma). Arrastrar en huecos verdes para colocar varias.";
    else {
      el.hidden = true;
      try { localStorage.setItem(COACH_DONE_KEY, "1"); } catch { /* */ }
      return;
    }
    el.textContent = msg;
    el.hidden = false;
  }

  function syncBars() {
    syncCoach();
    const chk = validateBuild(build);
    const st = statsOfBuild(build, chk.level === "warn");
    const masa = massOfBuild(build);
    const bar = (lab: string, pct: number) => {
      const p = Math.min(100, Math.round(pct));
      return `<div class="duel-fab-bar"><span class="duel-fab-bar-lab">${lab}</span><div class="h-track" role="presentation"><div style="width:${p}%"></div></div><span class="duel-fab-bar-pct">${p}%</span></div>`;
    };
    $("duel-fab-bars").innerHTML =
      bar("Masa", 100 * masa / D.masa_max_kg) +
      bar("Velocidad", 100 * st.maxSpd / 16) +
      bar("Vida", 100 * st.hpMax / 220) +
      `<p class="duel-fab-meta">Ruedas ${wheelCount(build)}/${D.min_ruedas} · Piezas ${build.cells.length}</p>`;
    const w = $("duel-fab-warn");
    w.className = "duel-fab-warn" + (chk.level === "ban" ? " ban" : "");
    w.textContent = chk.msg;
    ($("duel-fab-confirm") as HTMLButtonElement).disabled = chk.level === "ban" || build.cells.length === 0;
    const def = blockDef(selected);
    $("duel-fab-equip").textContent = picked
      ? `Seleccionada: ${blockDef(picked.blockId).nombre} · anclas verdes = destinos válidos · arrastrar y soltar · R · Esc`
      : erase
        ? "Modo borrar: tocar una celda ocupada"
        : `Pieza activa: ${def.nombre} · tocar pieza colocada para seleccionar`;
    const equip = $("duel-fab-equip");
    equip.classList.toggle("reject-flash", rejectFlashT > 0 && performance.now() < rejectFlashT);
    const rh = $("duel-fab-rot-hint");
    const isWheel = def.cat === "movimiento";
    rh.innerHTML = erase ? "" : isWheel
      ? `Orientación ${ROT_ARROW[rot]} (${rot * 90}°) · tecla R · rueda sobre el plano`
      : `Giro ${rot * 90}° · tecla R · ${def.sx}×${def.sy}×${def.sz} celdas`;
    ($("duel-fab-erase") as HTMLButtonElement).classList.toggle("on", erase);
    const empty = $("duel-fab-empty");
    empty.hidden = build.cells.length > 0;
    root.classList.toggle("has-build", build.cells.length > 0);
    root.classList.toggle("erase-mode", erase);
    root.classList.toggle("show-place-zones", !erase);
  }

  function syncTpl() {
    $("duel-fab-tpl").innerHTML = Object.entries(TEMPLATES).map(([id, t]) =>
      `<button type="button" class="duel-fab-btn" data-tpl="${id}">${t.label}</button>`).join("");
  }

  function firstCanProbe(): Cell | null {
    const half = D.grid_half_xz;
    for (let z = half; z >= -half; z--) {
      for (let x = -half; x <= half; x++) {
        const probe: Cell = { x, y: layerY, z, rot, blockId: selected };
        if (canPlace(build, probe)) return probe;
      }
    }
    return null;
  }

  function refreshGhost() {
    if (erase) {
      if (ghostPin && cellAt(build, ghostPin.x, layerY, ghostPin.z)) {
        const probe: Cell = { x: ghostPin.x, y: layerY, z: ghostPin.z, rot: 0, blockId: selected };
        opts.onHoverCell?.({ probe, can: false, erase: true });
      } else opts.onHoverCell?.(null);
      return;
    }
    if (ghostPin) {
      const probe = probeAt(ghostPin.x, ghostPin.z);
      const can = canActAt(ghostPin.x, ghostPin.z);
      opts.onHoverCell?.({ probe, can, erase: false });
      return;
    }
    const probe = firstCanProbe();
    if (probe) opts.onHoverCell?.({ probe, can: true, erase: false });
    else opts.onHoverCell?.(null);
  }

  function sync() {
    syncDrawer();
    syncInv();
    syncLayers();
    syncGrid();
    syncBars();
    syncTpl();
    refreshGhost();
  }

  function onKey(e: KeyboardEvent) {
    if (!root.isConnected || !document.getElementById("duel-ui")?.classList.contains("fabricar")) return;
    if (e.key === "Escape") { picked = null; sync(); return; }
    if (e.key === "r" || e.key === "R") {
      if (picked) {
        const nr = ((picked.rot + 1) % 4) as Rot;
        const i = build.cells.findIndex((c) => c.x === picked!.x && c.y === picked!.y && c.z === picked!.z);
        if (i >= 0) {
          pushUndo();
          const cells = build.cells.slice();
          cells[i] = { ...cells[i], rot: nr };
          picked = { ...cells[i] };
          apply({ cells });
        }
      } else { rot = ((rot + 1) % 4) as Rot; sync(); }
      return;
    }
    if (e.key === "m" || e.key === "M") { pushUndo(); apply(mirrorBuildX(build)); }
    if (e.key === "z" || e.key === "Z") {
      const prev = undo.pop();
      if (prev) { build = prev; saveBuild(build); opts.onChange(build); sync(); }
    }
  }

  function selectFromGrid(x: number, z: number) {
    const c = cellAt(build, x, layerY, z);
    if (!c) return;
    picked = { ...c };
    selected = c.blockId;
    rot = c.rot;
    cat = blockDef(c.blockId).cat;
    erase = false;
    ghostPin = { x, z };
    sync();
  }

  function paintCellAt(x: number, z: number) {
    const key = `${x},${z}`;
    if (erase) {
      const had = cellAt(build, x, layerY, z);
      if (!had) { SFX.duelFabReject(); rejectFlashT = performance.now() + 320; syncBars(); return; }
      SFX.duelFabErase();
      pushUndo();
      if (picked && picked.x === had.x && picked.y === had.y && picked.z === had.z) picked = null;
      apply(removeAt(build, x, layerY, z));
      return;
    }
    if (picked) {
      if (picked.x === x && picked.y === layerY && picked.z === z) return;
      const moved = moveCell(build, picked.x, picked.y, picked.z, x, layerY, z);
      if (!moved) {
        SFX.duelFabReject();
        rejectFlashT = performance.now() + 320;
        ghostPin = { x, z };
        applyGridPinHighlight();
        syncBars();
        refreshGhost();
        return;
      }
      SFX.duelFabPlace();
      pushUndo();
      apply(moved);
      const anchor = cellAt(build, x, layerY, z);
      picked = anchor ? { ...anchor } : null;
      lastPaintKey = key;
      return;
    }
    const probe = probeAt(x, z);
    if (!canPlace(build, probe)) {
      SFX.duelFabReject();
      rejectFlashT = performance.now() + 320;
      ghostPin = { x, z };
      applyGridPinHighlight();
      syncBars();
      refreshGhost();
      return;
    }
    const next = placeCell(build, probe);
    if (!next) return;
    SFX.duelFabPlace();
    placedFlash = key;
    placedFlashT = performance.now();
    pushUndo();
    apply(next);
    const clearFlash = () => {
      if (placedFlash !== key) return;
      placedFlash = null;
      gridEl.querySelector(`.duel-fab-cell[data-x="${x}"][data-z="${z}"]`)?.classList.remove("just-placed");
    };
    requestAnimationFrame(() => { if (performance.now() - placedFlashT <= 380) clearFlash(); });
    setTimeout(clearFlash, 420);
    lastPaintKey = key;
  }

  const gridEl = $("duel-fab-grid");
  const cellFromEvent = (e: Event) => {
    const cell = (e.target as HTMLElement).closest(".duel-fab-cell") as HTMLElement | null;
    return cell?.dataset.x != null ? cell : null;
  };
  const emitHover = (cell: HTMLElement | null) => {
    if (!cell?.dataset.x) { refreshGhost(); return; }
    const x = +cell.dataset.x!, z = +cell.dataset.z!;
    const probe = probeAt(x, z);
    if (erase) {
      if (cell.classList.contains("filled")) opts.onHoverCell?.({ probe, can: false, erase: true });
      else opts.onHoverCell?.(null);
      return;
    }
    const can = canActAt(x, z);
    opts.onHoverCell?.({ probe, can, erase: false });
  };
  gridEl.addEventListener("mouseover", (e) => {
    const cell = (e.target as HTMLElement).closest(".duel-fab-cell") as HTMLElement | null;
    if (cell?.dataset.x != null) {
      ghostPin = { x: +cell.dataset.x, z: +cell.dataset.z! };
      applyGridPinHighlight();
    }
    emitHover(cell);
  });
  gridEl.addEventListener("mouseleave", () => { ghostPin = null; applyGridPinHighlight(); refreshGhost(); });

  gridEl.addEventListener("pointerdown", (e) => {
    const cell = cellFromEvent(e);
    if (!cell) return;
    const x = +cell.dataset.x!, z = +cell.dataset.z!;
    ghostPin = { x, z };
    applyGridPinHighlight();
    refreshGhost();
    if (cell.classList.contains("filled") && !erase) {
      selectFromGrid(x, z);
      return;
    }
    if (erase) {
      paintCellAt(x, z);
      return;
    }
    gridDrag = true;
    dragMove = !!picked;
    lastPaintKey = "";
    gridEl.setPointerCapture(e.pointerId);
    if (!picked) paintCellAt(x, z);
  });

  gridEl.addEventListener("pointermove", (e) => {
    const cell = cellFromEvent(e);
    if (cell?.dataset.x != null) {
      ghostPin = { x: +cell.dataset.x, z: +cell.dataset.z! };
      applyGridPinHighlight();
      emitHover(cell);
    }
    if (!gridDrag || erase || dragMove) return;
    if (!cell) return;
    const x = +cell.dataset.x!, z = +cell.dataset.z!;
    const key = `${x},${z}`;
    if (key === lastPaintKey) return;
    if (cell.classList.contains("filled")) return;
    if (!canActAt(x, z)) return;
    paintCellAt(x, z);
  });

  const endGridDrag = (e: PointerEvent) => {
    if (gridDrag && dragMove && ghostPin && !erase && picked) {
      const { x, z } = ghostPin;
      if (!(picked.x === x && picked.y === layerY && picked.z === z) && canActAt(x, z)) paintCellAt(x, z);
    }
    if (gridEl.hasPointerCapture(e.pointerId)) gridEl.releasePointerCapture(e.pointerId);
    gridDrag = false;
    dragMove = false;
  };
  gridEl.addEventListener("pointerup", endGridDrag);
  gridEl.addEventListener("pointercancel", endGridDrag);

  root.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const ly = t.closest("[data-ly]") as HTMLElement | null;
    if (ly?.dataset.ly != null) { layerY = +ly.dataset.ly; ghostPin = null; picked = null; syncGrid(); syncBars(); refreshGhost(); return; }
    const tab = t.closest("[data-cat]") as HTMLElement | null;
    if (tab?.dataset.cat) { cat = tab.dataset.cat as BlockCat; const first = blocksByCat(cat)[0]; if (first) selected = first.id; erase = false; ghostPin = null; picked = null; sync(); return; }
    const blk = t.closest("[data-blk]") as HTMLElement | null;
    if (blk?.dataset.blk) { selected = blk.dataset.blk; erase = false; ghostPin = null; picked = null; sync(); return; }
    const tpl = t.closest("[data-tpl]") as HTMLElement | null;
    if (tpl?.dataset.tpl && TEMPLATES[tpl.dataset.tpl]) {
      pushUndo();
      apply(structuredClone(TEMPLATES[tpl.dataset.tpl].build));
    }
  });

  const zoomIn = $("duel-fab-zoom-in");
  const zoomOut = $("duel-fab-zoom-out");
  zoomIn.innerHTML = icon("fab_zoom_in", 18);
  zoomOut.innerHTML = icon("fab_zoom_out", 18);
  const stopZoom = (e: Event) => e.stopPropagation();
  zoomIn.addEventListener("pointerdown", stopZoom);
  zoomOut.addEventListener("pointerdown", stopZoom);
  zoomIn.onclick = (e) => { e.stopPropagation(); opts.onZoom?.(0.88); };
  zoomOut.onclick = (e) => { e.stopPropagation(); opts.onZoom?.(1.14); };
  $("duel-fab-menu").onclick = () => opts.onMenu?.();
  $("duel-fab-cam-reset").onclick = () => opts.onResetCam?.();
  ($("duel-fab-ydown") as HTMLButtonElement).innerHTML = icon("fab_plane_down", 18);
  ($("duel-fab-yup") as HTMLButtonElement).innerHTML = icon("fab_plane_up", 18);
  $("duel-fab-drawer-toggle").onclick = () => { drawerOpen = !drawerOpen; syncDrawer(); };
  $("duel-fab-ydown").onclick = () => { layerY = Math.max(0, layerY - 1); syncGrid(); syncBars(); };
  $("duel-fab-yup").onclick = () => { layerY = Math.min(D.grid_max_y, layerY + 1); syncGrid(); syncBars(); };
  $("duel-fab-rot").onclick = () => { rot = ((rot + 1) % 4) as Rot; sync(); };
  $("duel-fab-mir").onclick = () => { pushUndo(); apply(mirrorBuildX(build)); };
  $("duel-fab-undo").onclick = () => {
    const prev = undo.pop();
    if (prev) { build = prev; saveBuild(build); opts.onChange(build); sync(); }
  };
  $("duel-fab-erase").onclick = () => { erase = !erase; ghostPin = null; picked = null; syncBars(); syncGrid(); refreshGhost(); };
  $("duel-fab-clear").onclick = () => { pushUndo(); apply({ cells: [] }); };
  $("duel-fab-confirm").onclick = () => {
    const chk = validateBuild(build);
    if (chk.level !== "ban" && build.cells.length) opts.onConfirm();
  };
  addEventListener("keydown", onKey);

  sync();

  return {
    root,
    getBuild: () => build,
    setBuild: (b) => { build = structuredClone(b); sync(); opts.onChange(build); },
    sync,
    refreshGhost,
    openDrawer: (on = true) => { drawerOpen = on; syncDrawer(); },
    destroy: () => {
      removeEventListener("keydown", onKey);
      root.remove();
    },
  };
}

export function fabBlockIds(): string[] { return allBlockIds(); }
