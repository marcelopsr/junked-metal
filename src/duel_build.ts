// Fabricación RoboCraft: build de celdas, validación, stats, mesh y plantillas.
import * as B from "@babylonjs/core";
import { BAL } from "./balance";
import { box, cyl, merge, wheel } from "./models";
import { M, pbr } from "./render";
import type { DuelPaintState } from "./duel_paint";

export type Rot = 0 | 1 | 2 | 3;
export type Cell = { x: number; y: number; z: number; rot: Rot; blockId: string };
export type RobotBuild = { cells: Cell[] };
export type BlockCat = "chasis" | "movimiento" | "arma" | "especial" | "cosmetico";

export type BlockDef = {
  id: string; nombre: string; cat: BlockCat;
  sx: number; sy: number; sz: number;
  masa_kg: number; hp: number; wheel_count: number;
  vel_max_mul: number; traccion_mul: number;
  dano_base: number; push_mul: number; rpm_max: number; rpm_carga_s: number; knock_up_n: number;
  cog_y_m: number;
};

const D = BAL.duelo;

export function blockDef(id: string): BlockDef {
  const r = BAL.dueloBloques[id] as BlockDef;
  return r;
}

export function allBlockIds(): string[] {
  return Object.keys(BAL.dueloBloques);
}

export function blocksByCat(cat: BlockCat): BlockDef[] {
  return allBlockIds().map(blockDef).filter((b) => b.cat === cat);
}

/** Footprint en celdas tras rotación 90° en Y (sx/sz intercambian en rot impar). */
export function footprint(def: BlockDef, rot: Rot): { sx: number; sy: number; sz: number } {
  const odd = rot % 2 === 1;
  return { sx: odd ? def.sz : def.sx, sy: def.sy, sz: odd ? def.sx : def.sz };
}

export function occupied(cell: Cell): string[] {
  const def = blockDef(cell.blockId);
  const { sx, sy, sz } = footprint(def, cell.rot);
  const keys: string[] = [];
  for (let dx = 0; dx < sx; dx++) for (let dy = 0; dy < sy; dy++) for (let dz = 0; dz < sz; dz++) {
    keys.push(`${cell.x + dx},${cell.y + dy},${cell.z + dz}`);
  }
  return keys;
}

function occupancyMap(build: RobotBuild): Map<string, number> {
  const m = new Map<string, number>();
  build.cells.forEach((c, i) => { for (const k of occupied(c)) m.set(k, i); });
  return m;
}

function neighbors(key: string): string[] {
  const [x, y, z] = key.split(",").map(Number);
  return [`${x + 1},${y},${z}`, `${x - 1},${y},${z}`, `${x},${y + 1},${z}`, `${x},${y - 1},${z}`, `${x},${y},${z + 1}`, `${x},${y},${z - 1}`];
}

export type BuildCheck = { level: "ok" | "warn" | "ban"; msg: string };

export function massOfBuild(build: RobotBuild): number {
  return build.cells.reduce((s, c) => s + blockDef(c.blockId).masa_kg, 0);
}

export function wheelCount(build: RobotBuild): number {
  return build.cells.reduce((s, c) => s + blockDef(c.blockId).wheel_count, 0);
}

export function validateBuild(build: RobotBuild): BuildCheck {
  const seats = build.cells.filter((c) => c.blockId === "asiento_rc");
  if (seats.length === 0) return { level: "ban", msg: "Falta el asiento RC." };
  if (seats.length > 1) return { level: "ban", msg: "Solo puede haber un asiento RC." };
  const occ = occupancyMap(build);
  const seatKeys = new Set(occupied(seats[0]));
  const seen = new Set<string>();
  const q = [...seatKeys];
  for (const k of q) seen.add(k);
  while (q.length) {
    const k = q.pop()!;
    for (const n of neighbors(k)) {
      if (!occ.has(n) || seen.has(n)) continue;
      seen.add(n); q.push(n);
    }
  }
  for (const k of occ.keys()) {
    if (!seen.has(k)) return { level: "ban", msg: "Hay piezas sin conectar al asiento." };
  }
  if (wheelCount(build) < D.min_ruedas) {
    return { level: "ban", msg: `Se necesitan al menos ${D.min_ruedas} ruedas (oruga cuenta como 2).` };
  }
  const masa = massOfBuild(build);
  if (masa > D.masa_max_kg) return { level: "ban", msg: `Masa ${masa.toFixed(1)} kg supera el tope (${D.masa_max_kg} kg).` };
  const half = D.grid_half_xz, maxY = D.grid_max_y;
  for (const c of build.cells) {
    for (const k of occupied(c)) {
      const [x, y, z] = k.split(",").map(Number);
      if (x < -half || x > half || z < -half || z > half || y < 0 || y > maxY) {
        return { level: "ban", msg: "Una pieza queda fuera de la mesa." };
      }
    }
  }
  const hasWeapon = build.cells.some((c) => blockDef(c.blockId).cat === "arma");
  if (!hasWeapon) return { level: "warn", msg: "Sin arma: solo embestida débil." };
  const cog = cogOfBuild(build);
  if (cog.y > 0.55) return { level: "warn", msg: "Centro de gravedad alto: riesgo de volcado." };
  return { level: "ok", msg: "" };
}

export function cogOfBuild(build: RobotBuild): B.Vector3 {
  let mx = 0, my = 0, mz = 0, m = 0;
  const g = D.grid_m;
  for (const c of build.cells) {
    const def = blockDef(c.blockId);
    const { sx, sy, sz } = footprint(def, c.rot);
    const cx = (c.x + sx * 0.5 - 0.5) * g;
    const cy = (c.y + sy * 0.5 - 0.5) * g + def.cog_y_m;
    const cz = (c.z + sz * 0.5 - 0.5) * g;
    mx += cx * def.masa_kg; my += cy * def.masa_kg; mz += cz * def.masa_kg;
    m += def.masa_kg;
  }
  if (m < 1e-6) return new B.Vector3(0, 0.25, 0);
  return new B.Vector3(mx / m, my / m, mz / m);
}

export type BuildStats = {
  mass: number; hpMax: number; maxSpd: number; accel: number; turn: number; grip: number;
  push: number; dano: number; knock: number; weaponId: "trompo" | "sierra" | "pala" | "none";
  hasTrompo: boolean;
};

export function statsOfBuild(build: RobotBuild, warn: boolean): BuildStats {
  const masa = massOfBuild(build);
  const hp = D.hp_base + build.cells.reduce((s, c) => s + blockDef(c.blockId).hp, 0);
  let vel = 1, trac = 1, nMove = 0;
  let dano = 1, push = 0.4, knock = 0, rpmMax = 0, rpmCarga = 0;
  let weaponId: BuildStats["weaponId"] = "none";
  for (const c of build.cells) {
    const d = blockDef(c.blockId);
    if (d.cat === "movimiento" || d.cat === "chasis") {
      vel *= d.vel_max_mul; trac *= d.traccion_mul; nMove++;
    }
    if (d.cat === "arma" && d.dano_base >= dano) {
      dano = d.dano_base; push = d.push_mul; knock = d.knock_up_n;
      rpmMax = d.rpm_max; rpmCarga = d.rpm_carga_s;
      weaponId = d.id === "trompo" || d.id === "sierra" || d.id === "pala" ? d.id : weaponId;
    }
  }
  if (nMove === 0) { vel = 0.85; trac = 0.85; }
  const warnMul = warn ? D.warn_traccion_mul : 1;
  const tr = trac * warnMul;
  return {
    mass: masa,
    hpMax: hp,
    maxSpd: 14 * vel,
    accel: 22 * tr,
    turn: 2.8 * tr,
    grip: 4.5 * tr,
    push, dano, knock,
    weaponId,
    hasTrompo: rpmMax > 0,
  };
}

/** AABB en metros centrado en origen de build (celdas). */
/** Offset del mesh visual / collider respecto al nodo `vis` (metros). */
export function visualPivotOffset(build: RobotBuild): B.Vector3 {
  const aabb = aabbOfBuild(build);
  const ext = aabb.size;
  return new B.Vector3(
    -(aabb.min.x + aabb.max.x) * 0.5,
    -aabb.min.y - ext.y * 0.5 + 0.02,
    -(aabb.min.z + aabb.max.z) * 0.5,
  );
}

/** Malla de cajas por celda para Havok MESH (origen = espacio del build, sin pivot). */
export function buildColliderMesh(build: RobotBuild): B.Mesh {
  const g = D.grid_m;
  const hide = M.matte("#101010");
  hide.alpha = 0;
  const parts: B.Mesh[] = [];
  for (const c of build.cells) {
    const def = blockDef(c.blockId);
    const { sx, sy, sz } = footprint(def, c.rot);
    const px = (c.x + sx * 0.5 - 0.5) * g;
    const py = (c.y + sy * 0.5) * g;
    const pz = (c.z + sz * 0.5 - 0.5) * g;
    const w = sx * g * 0.9, h = sy * g * 0.9, d = sz * g * 0.9;
    parts.push(box(w, h, d, hide, [px, py, pz]));
  }
  if (!parts.length) parts.push(box(0.3, 0.2, 0.3, hide, [0, 0.1, 0]));
  return merge("duelColBuild", parts);
}

export function aabbOfBuild(build: RobotBuild): { min: B.Vector3; max: B.Vector3; size: B.Vector3 } {
  const g = D.grid_m;
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const c of build.cells) {
    for (const k of occupied(c)) {
      const [x, y, z] = k.split(",").map(Number);
      minX = Math.min(minX, x * g - g / 2); maxX = Math.max(maxX, x * g + g / 2);
      minY = Math.min(minY, y * g); maxY = Math.max(maxY, y * g + g);
      minZ = Math.min(minZ, z * g - g / 2); maxZ = Math.max(maxZ, z * g + g / 2);
    }
  }
  if (!Number.isFinite(minX)) {
    return { min: new B.Vector3(-0.5, 0, -0.5), max: new B.Vector3(0.5, 0.4, 0.5), size: new B.Vector3(1, 0.4, 1) };
  }
  const min = new B.Vector3(minX, minY, minZ);
  const max = new B.Vector3(maxX, maxY, maxZ);
  return { min, max, size: max.subtract(min) };
}

export function canPlace(build: RobotBuild, cell: Cell): boolean {
  const def = blockDef(cell.blockId);
  if (!def) return false;
  if (cell.blockId === "asiento_rc" && build.cells.some((c) => c.blockId === "asiento_rc")) return false;
  const half = D.grid_half_xz, maxY = D.grid_max_y;
  const occ = occupancyMap(build);
  const keys = occupied(cell);
  for (const k of keys) {
    if (occ.has(k)) return false;
    const [x, y, z] = k.split(",").map(Number);
    if (x < -half || x > half || z < -half || z > half || y < 0 || y > maxY) return false;
  }
  if (build.cells.length === 0) return true;
  for (const k of keys) {
    for (const n of neighbors(k)) if (occ.has(n)) return true;
  }
  return false;
}

export function placeCell(build: RobotBuild, cell: Cell): RobotBuild | null {
  if (!canPlace(build, cell)) return null;
  return { cells: [...build.cells, cell] };
}

export function removeAt(build: RobotBuild, x: number, y: number, z: number): RobotBuild {
  const key = `${x},${y},${z}`;
  const occ = occupancyMap(build);
  const idx = occ.get(key);
  if (idx === undefined) return build;
  return { cells: build.cells.filter((_, i) => i !== idx) };
}

export function mirrorBuildX(build: RobotBuild): RobotBuild {
  return {
    cells: build.cells.map((c) => {
      const def = blockDef(c.blockId);
      const { sx } = footprint(def, c.rot);
      return { ...c, x: -c.x - (sx - 1), rot: ((4 - c.rot) % 4) as Rot };
    }),
  };
}

const STORE_KEY = "duel_build";

export function saveBuild(b: RobotBuild) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(b)); } catch { /* */ }
}

export function loadBuild(): RobotBuild | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as RobotBuild;
    if (!o?.cells || !Array.isArray(o.cells)) return null;
    return o;
  } catch { return null; }
}

export function emptyBuild(): RobotBuild { return { cells: [] }; }

/** Plantillas equivalentes a los combos 3×3 clásicos. */
export const TEMPLATES: Record<string, { label: string; build: RobotBuild }> = {
  caja: {
    label: "Caja blindada",
    build: {
      cells: [
        { x: 0, y: 1, z: 0, rot: 0, blockId: "asiento_rc" },
        { x: -1, y: 1, z: 0, rot: 0, blockId: "chapa" },
        { x: 1, y: 1, z: 0, rot: 0, blockId: "chapa" },
        { x: 0, y: 1, z: -1, rot: 0, blockId: "chapa" },
        { x: 0, y: 1, z: 1, rot: 0, blockId: "chapa" },
        { x: -1, y: 1, z: -1, rot: 0, blockId: "chapa" },
        { x: 1, y: 1, z: -1, rot: 0, blockId: "puerta" },
        { x: -1, y: 1, z: 1, rot: 0, blockId: "chapa" },
        { x: 1, y: 1, z: 1, rot: 0, blockId: "chapa" },
        // Ruedas bajo las chapas (conexión vertical)
        { x: -1, y: 0, z: -1, rot: 0, blockId: "rueda_std" },
        { x: 1, y: 0, z: -1, rot: 0, blockId: "rueda_std" },
        { x: -1, y: 0, z: 1, rot: 0, blockId: "rueda_std" },
        { x: 1, y: 0, z: 1, rot: 0, blockId: "rueda_std" },
        { x: 0, y: 1, z: 2, rot: 0, blockId: "trompo" },
        { x: 0, y: 2, z: 0, rot: 0, blockId: "muneco" },
      ],
    },
  },
  cuna: {
    label: "Cuña industrial",
    build: {
      cells: [
        { x: 0, y: 1, z: -1, rot: 0, blockId: "asiento_rc" },
        { x: 0, y: 1, z: 0, rot: 0, blockId: "cuna_blk" },
        { x: -1, y: 1, z: -1, rot: 0, blockId: "chapa" },
        { x: 1, y: 1, z: -1, rot: 0, blockId: "chapa" },
        { x: -1, y: 0, z: -1, rot: 0, blockId: "oruga" },
        { x: 1, y: 0, z: -1, rot: 0, blockId: "oruga" },
        { x: 0, y: 1, z: 2, rot: 0, blockId: "pala" },
        { x: 0, y: 2, z: -1, rot: 0, blockId: "muneco" },
      ],
    },
  },
  plancha: {
    label: "Plancha veloz",
    build: {
      cells: [
        { x: 0, y: 1, z: 1, rot: 0, blockId: "asiento_rc" },
        { x: -1, y: 1, z: -1, rot: 0, blockId: "plancha_blk" },
        // plancha ocupa (-1..0, 1, -1..0); ruedas bajo esquinas
        { x: -1, y: 0, z: -1, rot: 0, blockId: "rueda_gig" },
        { x: 0, y: 0, z: -1, rot: 0, blockId: "rueda_gig" },
        { x: -1, y: 0, z: 0, rot: 0, blockId: "rueda_std" },
        { x: 0, y: 0, z: 0, rot: 0, blockId: "rueda_std" },
        { x: 1, y: 1, z: 1, rot: 0, blockId: "chapa" },
        { x: 1, y: 1, z: 0, rot: 0, blockId: "sierra" },
      ],
    },
  },
};

export function paintBuildMesh(build: RobotBuild, paint: DuelPaintState): B.Mesh {
  const g = D.grid_m;
  const occ = occupancyMap(build);
  const z = paint.zones;
  const mb = pbr("fbCh", { color: z.chassis_body.color, rough: 0.55, metal: z.chassis_body.preset === "metal" ? 0.7 : 0.1 });
  const mt = pbr("fbTrim", { color: z.chassis_trim.color, rough: 0.5 });
  const tire = pbr("fbTire", { color: z.wheel_tire.color, rough: 0.9 });
  const rim = pbr("fbRim", { color: z.wheel_rim.color, rough: 0.4, metal: 0.5 });
  const wBody = pbr("fbWb", { color: z.weapon_body.color, rough: 0.45, metal: 0.4 });
  const wEdge = pbr("fbWe", { color: z.weapon_edge.color, rough: 0.35, metal: 0.6 });
  const parts: B.Mesh[] = [];
  for (const c of build.cells) {
    const def = blockDef(c.blockId);
    const { sx, sy, sz } = footprint(def, c.rot);
    const px = (c.x + sx * 0.5 - 0.5) * g;
    const py = (c.y + sy * 0.5) * g;
    const pz = (c.z + sz * 0.5 - 0.5) * g;
    const w = sx * g * 0.97, h = sy * g * 0.94, d = sz * g * 0.97;
    const weld = pbr("fbWeld", { color: "#2a3830", rough: 0.55, metal: 0.45 });
    if (def.cat === "movimiento") {
      if (c.blockId === "oruga") {
        parts.push(box(w * 0.7, h * 0.7, d, tire, [px, py * 0.6, pz]));
        parts.push(box(w * 0.35, h * 0.45, d * 0.85, rim, [px, py * 0.65, pz]));
      } else {
        const diam = c.blockId === "rueda_gig" ? g * 0.95 : g * 0.7;
        const wh = wheel(diam, g * 0.35, z.wheel_rim.color, c.blockId === "rueda_gig" ? "todoterreno" : "");
        wh.position.set(px, diam * 0.5, pz);
        wh.rotationQuaternion = B.Quaternion.RotationYawPitchRoll(c.rot * (Math.PI / 2), 0, Math.PI / 2);
        parts.push(wh);
        const mark = box(g * 0.07, g * 0.14, g * 0.05, M.matte("#1a2218"), [diam * 0.42, 0, 0]);
        mark.position.set(px, diam * 0.52, pz);
        mark.rotationQuaternion = wh.rotationQuaternion.clone();
        parts.push(mark);
      }
    } else if (def.cat === "arma") {
      if (c.blockId === "trompo") parts.push(cyl(g * 0.4, g * 0.4, g * 0.2, wEdge, [px, py, pz]));
      else if (c.blockId === "sierra") {
        parts.push(box(g * 0.15, g * 0.35, g * 0.55, wBody, [px, py, pz]));
        parts.push(cyl(g * 0.28, g * 0.28, g * 0.08, wEdge, [px + g * 0.25, py, pz], [0, 0, Math.PI / 2]));
      } else parts.push(box(w, h * 0.85, d * 0.35, wBody, [px, py, pz]));
    } else if (c.blockId === "asiento_rc") {
      parts.push(box(w * 0.7, h * 0.5, d * 0.7, mt, [px, py * 0.85, pz]));
      parts.push(box(w * 0.55, h * 0.35, d * 0.25, M.matte("#1a1e18"), [px, py + h * 0.15, pz - d * 0.15]));
    } else if (c.blockId === "muneco") {
      parts.push(cyl(g * 0.12, g * 0.12, g * 0.35, M.matte("#c4a574"), [px, py, pz]));
      parts.push(cyl(g * 0.14, g * 0.14, g * 0.14, M.matte("#2a2d28"), [px, py + g * 0.22, pz]));
    } else if (c.blockId === "puerta") {
      parts.push(box(w * 0.25, h, d, mt, [px, py, pz]));
    } else if (c.blockId === "cuna_blk") {
      parts.push(box(w, h * 0.55, d, mb, [px, py * 0.7, pz]));
      parts.push(box(w * 1.05, h * 0.18, d * 0.35, mt, [px, py * 0.35, pz + d * 0.35]));
    } else if (c.blockId === "plancha_blk") {
      parts.push(box(w, h * 0.35, d, mb, [px, py * 0.45, pz]));
    } else if (c.blockId === "chapa_u") {
      parts.push(box(w, h * 0.25, d, mb, [px, py * 0.4, pz]));
      parts.push(box(w * 0.2, h, d, mb, [px - w * 0.35, py, pz]));
      parts.push(box(w * 0.2, h, d, mb, [px + w * 0.35, py, pz]));
    } else {
      parts.push(box(w, h, d, mb, [px, py, pz]));
      parts.push(box(w * 1.01, h * 0.12, d * 1.01, weld, [px, py + h * 0.44, pz]));
    }
  }
  const seamG = g * 0.028;
  const weldSeam = pbr("fbWeldSeam", { color: "#2a3830", rough: 0.55, metal: 0.45 });
  const seen = new Set<string>();
  for (const c of build.cells) {
    for (const k of occupied(c)) {
      const [x, y, z] = k.split(",").map(Number);
      const cx = x * g, cy = (y + 0.5) * g, cz = z * g;
      for (const n of neighbors(k)) {
        if (!occ.has(n)) continue;
        const pair = k < n ? `${k}|${n}` : `${n}|${k}`;
        if (seen.has(pair)) continue;
        seen.add(pair);
        const [nx, ny, nz] = n.split(",").map(Number);
        if (nx === x + 1) parts.push(box(seamG, g * 0.85, g * 0.92, weldSeam, [cx + g * 0.5, cy, cz]));
        else if (ny === y + 1) parts.push(box(g * 0.92, seamG, g * 0.92, weldSeam, [cx, cy + g * 0.5, cz]));
        else if (nz === z + 1) parts.push(box(g * 0.92, g * 0.85, seamG, weldSeam, [cx, cy, cz + g * 0.5]));
      }
    }
  }
  if (!parts.length) parts.push(box(0.3, 0.2, 0.3, mb, [0, 0.1, 0]));
  return merge("duelFabBot", parts);
}

export function defaultBuild(): RobotBuild {
  return loadBuild() ?? structuredClone(TEMPLATES.caja.build);
}

export function rivalBuild(): RobotBuild {
  return structuredClone(TEMPLATES.cuna.build);
}

/** Estado de combate: build vivo + integridad por índice de celda (paralela a la vida global). */
export type LivingBuild = { build: RobotBuild; partHp: number[] };

export function livingFromBuild(build: RobotBuild): LivingBuild {
  const b = structuredClone(build);
  return { build: b, partHp: b.cells.map((c) => blockDef(c.blockId).hp) };
}

export function cellWorldCenter(c: Cell): { x: number; y: number; z: number } {
  const g = D.grid_m;
  const def = blockDef(c.blockId);
  const { sx, sy, sz } = footprint(def, c.rot);
  return {
    x: (c.x + sx * 0.5 - 0.5) * g,
    y: (c.y + sy * 0.5) * g,
    z: (c.z + sz * 0.5 - 0.5) * g,
  };
}

/** Bloque más cercano al punto local (metros, origen = centro del robot). */
export function pickHitCellIndex(build: RobotBuild, localX: number, localZ: number): number {
  let best = -1, bestD = Infinity;
  build.cells.forEach((c, i) => {
    const p = cellWorldCenter(c);
    const d = (p.x - localX) ** 2 + (p.z - localZ) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

/** Quita celda i; devuelve si se destruyó el asiento. */
export function stripCell(living: LivingBuild, i: number): boolean {
  const id = living.build.cells[i]?.blockId;
  living.build.cells.splice(i, 1);
  living.partHp.splice(i, 1);
  return id === "asiento_rc";
}
