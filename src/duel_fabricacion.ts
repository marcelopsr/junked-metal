// UI de fabricación RoboCraft (rejilla + cajón). La escena 3D la actualiza duel.ts vía onChange.
import "./duel_fabricacion.css";
import { isTouch } from "./input";
import { BAL } from "./balance";
import {
  type BlockCat, type Cell, type RobotBuild, type Rot,
  TEMPLATES, allBlockIds, blockDef, blocksByCat, canPlace, massOfBuild,
  mirrorBuildX, placeCell, removeAt, saveBuild, statsOfBuild, validateBuild, wheelCount,
} from "./duel_build";

const D = BAL.duelo;
const CATS: { id: BlockCat; lab: string }[] = [
  { id: "chasis", lab: "Chasis" },
  { id: "movimiento", lab: "Ruedas" },
  { id: "arma", lab: "Arma" },
  { id: "especial", lab: "Especial" },
  { id: "cosmetico", lab: "Extra" },
];

export type FabApi = {
  root: HTMLElement;
  getBuild(): RobotBuild;
  setBuild(b: RobotBuild): void;
  sync(): void;
  openDrawer(on?: boolean): void;
  destroy(): void;
};

export function mountFabricacion(
  host: HTMLElement,
  opts: { onChange(b: RobotBuild): void; onConfirm(): void },
): FabApi {
  let build: RobotBuild = { cells: [] };
  let selected = "chapa";
  let cat: BlockCat = "chasis";
  let layerY = 1;
  let rot: Rot = 0;
  let erase = false;
  let drawerOpen = !isTouch;
  const undo: RobotBuild[] = [];

  const root = document.createElement("div");
  root.id = "duel-fab";
  root.className = "duel-fab";
  root.innerHTML = `<header class="duel-fab-head"><h1>FABRICACIÓN</h1>
<p class="duel-fab-hint">Rejilla abajo · vista 3D arriba: el robot se ve en la mesa al colocar bloques</p>
<p class="duel-fab-fallback">Arrastrar la vista · R rota pieza · M espejo · Z deshacer · plantillas a la izquierda</p></header>
<div class="duel-fab-main">
<aside class="duel-fab-side" aria-labelledby="duel-fab-stats"><h2 id="duel-fab-stats" class="duel-sec-h">Telemetría</h2>
<div class="duel-bars" id="duel-fab-bars"></div>
<div class="duel-fab-tpl" id="duel-fab-tpl"></div>
<p class="duel-fab-warn" id="duel-fab-warn" role="status" aria-live="polite"></p></aside>
<div class="duel-fab-center">
<div class="duel-fab-viewport" id="duel-fab-viewport" role="region" aria-label="Vista del robot en la mesa">
<p class="duel-fab-view-hint">Arrastrar para girar la vista</p>
<p class="duel-fab-empty" id="duel-fab-empty" hidden>Sin piezas: elegir bloque y tocar la rejilla, o una plantilla</p>
</div>
<div class="duel-fab-build">
<p class="duel-fab-equip" id="duel-fab-equip" aria-live="polite"></p>
<div class="duel-fab-grid-wrap">
<div class="duel-fab-layer"><button type="button" id="duel-fab-ydown" aria-label="Bajar capa">−</button>
<span id="duel-fab-ylab">Capa Y: 1</span>
<button type="button" id="duel-fab-yup" aria-label="Subir capa">+</button></div>
<div class="duel-fab-grid" id="duel-fab-grid" role="grid" aria-label="Rejilla de fabricación"></div>
<div class="duel-fab-tools">
<button type="button" id="duel-fab-rot">Rotar (R)</button>
<button type="button" id="duel-fab-mir">Espejo (M)</button>
<button type="button" id="duel-fab-undo">Deshacer (Z)</button>
<button type="button" id="duel-fab-erase">Borrar</button>
<button type="button" id="duel-fab-clear">Vaciar</button>
</div></div></div></div>
<aside class="duel-fab-drawer" id="duel-fab-drawer">
<button type="button" class="duel-fab-drawer-tab" id="duel-fab-drawer-toggle" aria-controls="duel-fab-drawer-panel" aria-expanded="true">Ocultar piezas</button>
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
    btn.setAttribute("aria-expanded", String(drawerOpen));
    btn.textContent = drawerOpen ? "Ocultar piezas" : "Piezas";
  }

  function syncInv() {
    $("duel-fab-tabs").innerHTML = CATS.map((c) =>
      `<button type="button" role="tab" data-cat="${c.id}" class="${c.id === cat ? "on" : ""}" aria-selected="${c.id === cat}">${c.lab}</button>`).join("");
    const list = blocksByCat(cat);
    $("duel-fab-inv").innerHTML = list.map((b) =>
      `<button type="button" class="duel-fab-blk${b.id === selected ? " on" : ""}" data-blk="${b.id}" role="listitem" title="${b.nombre}">${b.nombre}<br><span style="color:#7a9470;font-size:0.58rem">${b.masa_kg} kg · ${b.sx}×${b.sy}×${b.sz}</span></button>`).join("");
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
      const { sx, sy, sz } = (() => {
        const odd = c.rot % 2 === 1;
        return { sx: odd ? def.sz : def.sx, sy: def.sy, sz: odd ? def.sx : def.sz };
      })();
      for (let dx = 0; dx < sx; dx++) for (let dy = 0; dy < sy; dy++) for (let dz = 0; dz < sz; dz++) {
        if (c.y + dy === layerY) occ.set(`${c.x + dx},${c.z + dz}`, def.nombre.slice(0, 4));
      }
    }
    const cells: string[] = [];
    for (let z = half; z >= -half; z--) for (let x = -half; x <= half; x++) {
      const key = `${x},${z}`;
      const lab = occ.get(key);
      const probe: Cell = { x, y: layerY, z, rot, blockId: selected };
      const can = !erase && canPlace(build, probe);
      cells.push(`<button type="button" class="duel-fab-cell${lab ? " filled" : ""}${can ? " can" : ""}" data-x="${x}" data-z="${z}" aria-label="Celda ${x},${layerY},${z}${lab ? ": " + lab : ""}">${lab ?? ""}</button>`);
    }
    grid.innerHTML = cells.join("");
    $("duel-fab-ylab").textContent = `Capa Y: ${layerY}`;
  }

  function syncBars() {
    const chk = validateBuild(build);
    const st = statsOfBuild(build, chk.level === "warn");
    const masa = massOfBuild(build);
    const bar = (lab: string, pct: number) =>
      `<div class="duel-bar"><span class="duel-bar-lab">${lab}</span><i role="presentation"><span style="width:${Math.min(100, pct)}%"></span></i><span class="duel-bar-pct" aria-hidden="true">${Math.round(pct)}%</span></div>`;
    $("duel-fab-bars").innerHTML =
      bar("Masa", 100 * masa / D.masa_max_kg) +
      bar("Velocidad", 100 * st.maxSpd / 16) +
      bar("Vida", 100 * st.hpMax / 220) +
      `<p style="font-size:0.65rem;color:#7a9470;margin:0.35rem 0 0">Ruedas ${wheelCount(build)}/${D.min_ruedas} · Piezas ${build.cells.length}</p>`;
    const w = $("duel-fab-warn");
    w.className = "duel-fab-warn" + (chk.level === "ban" ? " ban" : "");
    w.textContent = chk.msg;
    ($("duel-fab-confirm") as HTMLButtonElement).disabled = chk.level === "ban" || build.cells.length === 0;
    const def = blockDef(selected);
    $("duel-fab-equip").textContent = erase
      ? "Modo borrar: tocar una celda ocupada"
      : `Bloque: ${def.nombre} · rot ${rot * 90}°`;
    ($("duel-fab-erase") as HTMLButtonElement).classList.toggle("on", erase);
    const empty = $("duel-fab-empty");
    empty.hidden = build.cells.length > 0;
    root.classList.toggle("has-build", build.cells.length > 0);
  }

  function syncTpl() {
    $("duel-fab-tpl").innerHTML = Object.entries(TEMPLATES).map(([id, t]) =>
      `<button type="button" data-tpl="${id}">${t.label}</button>`).join("");
  }

  function sync() {
    syncDrawer();
    syncInv();
    syncGrid();
    syncBars();
    syncTpl();
  }

  function onKey(e: KeyboardEvent) {
    if (!root.isConnected || !document.getElementById("duel-ui")?.classList.contains("fabricar")) return;
    if (e.key === "r" || e.key === "R") { rot = ((rot + 1) % 4) as Rot; sync(); }
    if (e.key === "m" || e.key === "M") { pushUndo(); apply(mirrorBuildX(build)); }
    if (e.key === "z" || e.key === "Z") {
      const prev = undo.pop();
      if (prev) { build = prev; saveBuild(build); opts.onChange(build); sync(); }
    }
  }

  root.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const tab = t.closest("[data-cat]") as HTMLElement | null;
    if (tab?.dataset.cat) { cat = tab.dataset.cat as BlockCat; const first = blocksByCat(cat)[0]; if (first) selected = first.id; erase = false; sync(); return; }
    const blk = t.closest("[data-blk]") as HTMLElement | null;
    if (blk?.dataset.blk) { selected = blk.dataset.blk; erase = false; sync(); return; }
    const cell = t.closest(".duel-fab-cell") as HTMLElement | null;
    if (cell?.dataset.x != null) {
      const x = +cell.dataset.x!, z = +cell.dataset.z!;
      if (erase) {
        pushUndo();
        apply(removeAt(build, x, layerY, z));
      } else {
        const next = placeCell(build, { x, y: layerY, z, rot, blockId: selected });
        if (next) { pushUndo(); apply(next); }
      }
      return;
    }
    const tpl = t.closest("[data-tpl]") as HTMLElement | null;
    if (tpl?.dataset.tpl && TEMPLATES[tpl.dataset.tpl]) {
      pushUndo();
      apply(structuredClone(TEMPLATES[tpl.dataset.tpl].build));
    }
  });

  $("duel-fab-drawer-toggle").onclick = () => { drawerOpen = !drawerOpen; syncDrawer(); };
  $("duel-fab-ydown").onclick = () => { layerY = Math.max(0, layerY - 1); syncGrid(); syncBars(); };
  $("duel-fab-yup").onclick = () => { layerY = Math.min(D.grid_max_y, layerY + 1); syncGrid(); syncBars(); };
  $("duel-fab-rot").onclick = () => { rot = ((rot + 1) % 4) as Rot; sync(); };
  $("duel-fab-mir").onclick = () => { pushUndo(); apply(mirrorBuildX(build)); };
  $("duel-fab-undo").onclick = () => {
    const prev = undo.pop();
    if (prev) { build = prev; saveBuild(build); opts.onChange(build); sync(); }
  };
  $("duel-fab-erase").onclick = () => { erase = !erase; syncBars(); syncGrid(); };
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
    openDrawer: (on = true) => { drawerOpen = on; syncDrawer(); },
    destroy: () => {
      removeEventListener("keydown", onKey);
      root.remove();
    },
  };
}

export function fabBlockIds(): string[] { return allBlockIds(); }
