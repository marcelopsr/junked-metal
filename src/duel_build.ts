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

/** Mueve un bloque anclado en (from*) a un nuevo anclaje si cabe. */
export function moveCell(
  build: RobotBuild, fromX: number, fromY: number, fromZ: number, toX: number, toY: number, toZ: number,
): RobotBuild | null {
  const cell = cellAt(build, fromX, fromY, fromZ);
  if (!cell) return null;
  const stripped = removeAt(build, fromX, fromY, fromZ);
  const moved: Cell = { ...cell, x: toX, y: toY, z: toZ };
  return placeCell(stripped, moved);
}

/** Bloque anclado en una celda de rejilla (para preview de borrado). */
export function cellAt(build: RobotBuild, x: number, y: number, z: number): Cell | null {
  const idx = occupancyMap(build).get(`${x},${y},${z}`);
  if (idx === undefined) return null;
  return build.cells[idx] ?? null;
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
  const weld = pbr("fbWeld", { color: "#2a3830", rough: 0.55, metal: 0.45 });
  const rivet = pbr("fbRiv", { color: "#3a4a42", rough: 0.4, metal: 0.65 });
  const parts: B.Mesh[] = [];
  const pushChassis = (w: number, h: number, d: number, px: number, py: number, pz: number) => {
    parts.push(box(w * 0.96, h * 0.94, d * 0.96, mb, [px, py, pz]));
    parts.push(box(w * 1.02, h * 0.1, d * 1.02, weld, [px, py + h * 0.42, pz]));
    const r = g * 0.045;
    for (const [ox, oz] of [[-w * 0.38, -d * 0.38], [w * 0.38, -d * 0.38], [-w * 0.38, d * 0.38], [w * 0.38, d * 0.38]] as const) {
      parts.push(cyl(r, r, h * 0.08, rivet, [px + ox, py + h * 0.44, pz + oz]));
    }
  };
  /** Chapa troquelada: cuerpo + labio y cantos biselados (se fusiona en merge). */
  const pushChapaStamp = (
    w: number, h: number, d: number, px: number, py: number, pz: number,
    body = wBody, edge = wEdge, lite = false,
  ) => {
    parts.push(box(w * 0.9, h * 0.88, d * 0.9, body, [px, py, pz]));
    parts.push(box(w * 1.01, h * 0.1, d * 1.01, edge, [px, py + h * 0.42, pz]));
    if (lite) {
      parts.push(box(w * 1.01, h * 0.05, d * 0.18, edge, [px, py - h * 0.36, pz]));
      return;
    }
    parts.push(box(w * 1.01, h * 0.06, d * 0.22, edge, [px, py - h * 0.38, pz]));
    const cham = Math.min(w, d, h) * 0.11;
    for (const [ox, oz, sx, sz] of [
      [-w * 0.42, -d * 0.42, cham, cham], [w * 0.42, -d * 0.42, cham, cham],
      [-w * 0.42, d * 0.42, cham, cham], [w * 0.42, d * 0.42, cham, cham],
    ] as const) {
      parts.push(box(sx, h * 0.78, sz, edge, [px + ox, py, pz + oz]));
    }
    const rr = g * 0.032;
    for (const [ox, oz] of [[-w * 0.32, 0], [w * 0.32, 0], [0, -d * 0.32], [0, d * 0.32]] as const) {
      parts.push(cyl(rr, rr, h * 0.06, rivet, [px + ox, py + h * 0.44, pz + oz]));
    }
  };
  for (const c of build.cells) {
    const def = blockDef(c.blockId);
    const { sx, sy, sz } = footprint(def, c.rot);
    const px = (c.x + sx * 0.5 - 0.5) * g;
    const py = (c.y + sy * 0.5) * g;
    const pz = (c.z + sz * 0.5 - 0.5) * g;
    const w = sx * g * 0.97, h = sy * g * 0.94, d = sz * g * 0.97;
    if (def.cat === "movimiento") {
      if (c.blockId === "oruga") {
        parts.push(box(w * 0.7, h * 0.7, d, tire, [px, py, pz]));
        parts.push(box(w * 0.35, h * 0.45, d * 0.85, rim, [px, py + h * 0.06, pz]));
      } else {
        const diam = c.blockId === "rueda_gig" ? g * 0.95 : g * 0.7;
        const wheelY = py;
        const baseQ = B.Quaternion.RotationAxis(B.Axis.Z, Math.PI / 2);
        const yawQ = B.Quaternion.RotationAxis(B.Axis.Y, c.rot * (Math.PI / 2));
        const q = yawQ.multiply(baseQ);
        const wh = wheel(diam, g * 0.35, z.wheel_rim.color, c.blockId === "rueda_gig" ? "todoterreno" : "");
        wh.position.set(px, wheelY, pz);
        wh.rotationQuaternion = q;
        parts.push(wh);
        const tread = box(g * 0.11, diam * 0.55, g * 0.07, tire, [diam * 0.46, 0, 0]);
        tread.position.set(px, wheelY, pz);
        tread.rotationQuaternion = q.clone();
        parts.push(tread);
        const stripe = box(g * 0.06, diam * 0.12, g * 0.09, rim, [diam * 0.38, diam * 0.08, 0]);
        stripe.position.set(px, wheelY + diam * 0.03, pz);
        stripe.rotationQuaternion = q.clone();
        parts.push(stripe);
      }
    } else if (def.cat === "arma") {
      if (c.blockId === "trompo") {
        pushChapaStamp(g * 0.55, g * 0.22, g * 0.55, px, py - g * 0.06, pz);
        pushChapaStamp(g * 0.42, g * 0.08, g * 0.42, px, py + g * 0.02, pz, wEdge, wBody, true);
        parts.push(cyl(g * 0.36, g * 0.36, g * 0.18, wEdge, [px, py + g * 0.08, pz]));
        parts.push(box(g * 0.12, g * 0.06, g * 0.12, weld, [px, py + g * 0.2, pz]));
      } else if (c.blockId === "sierra") {
        pushChapaStamp(g * 0.22, g * 0.38, g * 0.62, px - g * 0.08, py, pz);
        pushChapaStamp(g * 0.18, g * 0.28, g * 0.2, px - g * 0.02, py - g * 0.04, pz, weld, wBody, true);
        parts.push(cyl(g * 0.28, g * 0.28, g * 0.07, wEdge, [px + g * 0.26, py, pz], [0, 0, Math.PI / 2]));
        parts.push(box(g * 0.04, g * 0.32, g * 0.32, wEdge, [px + g * 0.26, py, pz], [0, 0, Math.PI / 2]));
        for (let i = -2; i <= 2; i++) {
          parts.push(box(g * 0.025, g * 0.26, g * 0.04, wEdge, [px + g * 0.26, py + i * g * 0.1, pz + g * 0.17], [0, 0, Math.PI / 2]));
        }
      } else if (c.blockId === "pala") {
        pushChapaStamp(w * 0.35, h * 0.55, d * 0.28, px - w * 0.12, py, pz);
        pushChapaStamp(w * 0.55, h * 0.75, d * 0.12, px + w * 0.18, py + h * 0.05, pz, wEdge, wBody);
        pushChapaStamp(w * 0.2, h * 0.35, d * 0.22, px - w * 0.02, py - h * 0.08, pz, weld, wEdge, true);
      } else {
        pushChapaStamp(w * 0.55, h * 0.35, d * 0.55, px, py - h * 0.22, pz, weld, wBody, true);
        pushChapaStamp(w, h * 0.85, d * 0.35, px, py, pz);
      }
    } else if (c.blockId === "asiento_rc") {
      pushChapaStamp(w * 0.88, h * 0.22, d * 0.88, px, py - h * 0.32, pz, mb, weld);
      pushChapaStamp(w * 0.22, h * 0.45, d * 0.7, px - w * 0.34, py, pz, mt, weld, true);
      pushChapaStamp(w * 0.22, h * 0.45, d * 0.7, px + w * 0.34, py, pz, mt, weld, true);
      parts.push(box(w * 0.7, h * 0.5, d * 0.7, mt, [px, py * 0.85, pz]));
      parts.push(box(w * 0.55, h * 0.35, d * 0.25, M.matte("#1a1e18"), [px, py + h * 0.15, pz - d * 0.15]));
    } else if (c.blockId === "muneco") {
      pushChapaStamp(g * 0.38, g * 0.12, g * 0.38, px, py - g * 0.2, pz, mb, weld, true);
      parts.push(cyl(g * 0.12, g * 0.12, g * 0.35, M.matte("#c4a574"), [px, py, pz]));
      parts.push(cyl(g * 0.14, g * 0.14, g * 0.14, M.matte("#2a2d28"), [px, py + g * 0.22, pz]));
    } else if (c.blockId === "puerta") {
      pushChapaStamp(w * 0.28, h, d, px, py, pz, mt, weld);
    } else if (c.blockId === "cuna_blk") {
      pushChassis(w, h * 0.55, d, px, py * 0.7, pz);
      parts.push(box(w * 1.05, h * 0.18, d * 0.35, mt, [px, py * 0.35, pz + d * 0.35]));
    } else if (c.blockId === "plancha_blk") {
      pushChassis(w, h * 0.35, d, px, py * 0.45, pz);
    } else if (c.blockId === "chapa_u") {
      pushChassis(w, h * 0.25, d, px, py * 0.4, pz);
      pushChassis(w * 0.2, h, d, px - w * 0.35, py, pz);
      pushChassis(w * 0.2, h, d, px + w * 0.35, py, pz);
    } else if (def.cat === "chasis" || def.cat === "cosmetico") {
      pushChassis(w, h, d, px, py, pz);
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

function tintGhostMesh(root: B.Mesh, valid: boolean) {
  const alpha = valid ? 0.5 : 0.36;
  const stack: B.AbstractMesh[] = [root];
  while (stack.length) {
    const mesh = stack.pop()!;
    if (mesh instanceof B.Mesh && mesh.material) {
      const mat = mesh.material as B.PBRMaterial;
      mat.alpha = alpha;
      mat.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
      mat.needDepthPrePass = true;
      if (valid) mat.emissiveColor = B.Color3.FromHexString("#6a9a48").scale(0.22);
      else mat.emissiveColor = B.Color3.FromHexString("#a04040").scale(0.28);
    }
    stack.push(...mesh.getChildMeshes(false));
  }
}

/** Silueta del bloque real (misma malla que en pelea) al apuntar una celda en fabricación. */
export function placementGhostMesh(probe: Cell, valid: boolean, paint: DuelPaintState): B.Mesh {
  const m = paintBuildMesh({ cells: [probe] }, paint);
  tintGhostMesh(m, valid);
  return m;
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
