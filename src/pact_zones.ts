// Zonas de pacto en el piso (ENCORE): los pactos con zona dibujan su ventaja o su costo en la escena (ver .claude/trabajo/ZONAS-PACTO.md).
// La zona se SUMA al efecto global del pacto (pactFx). Lógica pura arriba (colocación por hash y efectos), dibujo abajo; quien integra
// llama zonesInit al cargar el escenario, zonesTick cada cuadro y zonesDispose al descargarlo. Sin rng(): colocación por hash propio, chispas con lcg.
import * as B from "@babylonjs/core";
import { BAL } from "./balance";
import { box, cyl, hazardMat, scene, template, tor } from "./models";
import { MOON, orient } from "./moon";
import { pbr, shadows } from "./render";

const R = BAL.ritmo;
const mix = (n: number) => { let t = (n + 0x6d2b79f5) | 0; t = Math.imul(t ^ (t >>> 15), 1 | t); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; // el mismo hash que encore.ts (allá no se exporta)
const RISK = new Set(["pegamento", "cables", "trampilla"]); // lado de riesgo: borde rayado; el resto es beneficio (alfombra cuadrada, sin rayado)
const defs = Object.values(BAL.pactosZonas);

export type P2 = { x: number; z: number };
/** Efecto de las zonas sobre un punto: los multiplicadores se multiplican y regen/dps se suman. Sin zonas es NO_ZONE. */
export type ZoneFx = { regen: number; magnetMul: number; scrapMul: number; xpMul: number; speedMul: number; dps: number };
export const NO_ZONE: ZoneFx = { regen: 0, magnetMul: 1, scrapMul: 1, xpMul: 1, speedMul: 1, dps: 0 };
/** Resultado de zonesTick: efecto en el auto + bichos que la trampilla escupe en este cuadro + puntos donde sale una chispa (cables, solo visual). */
export type ZoneTick = ZoneFx & { spawns: { x: number; z: number; n: number }[]; sparks: P2[] };
export type ZoneInfo = { id: string; x: number; z: number; r: number; risk: boolean; active: boolean };
export type ZoneCtx = {
  seed: number; loop: number; stage: number;
  pacts: string[]; // ids de los pactos activos (cualquier orden; el índice del pacto en esta lista entra al hash, así que pasarlos en el orden de run.pacts)
  avoid?: P2[]; // salida (teleportador), cofres y aros de objetivo: ninguna zona cae a zona_libre_m de ellos
  floorY?: (x: number, z: number) => number; // altura del piso (luna); por defecto plano
};

/** Zonas que crea un conjunto de pactos activos (la tabla pactos_zonas, filtrada). */
export const zonasDe = (pacts: string[]) => defs.filter((d) => pacts.includes(d.pacto));

type Slot = { d: (typeof defs)[number]; idx: number; k: number; st: "wait" | "warn" | "on" | "done"; t: number; n: number; x: number; z: number; acc: number; m: B.InstancedMesh | null };
let ctx: ZoneCtx | null = null, slots: Slot[] = [], clock = 0;

const dist = (a: P2, b: P2) => Math.hypot(a.x - b.x, a.z - b.z);
const visible = () => slots.filter((s) => s.st === "warn" || s.st === "on");

/**
 * Dónde cae la zona `d` (slot k, aparición n) con el auto en `car`. Función pura del hash (semilla, vuelta, escenario, pacto, k, n, intento):
 * anillo de zona_dist_min..zona_dist_max alrededor del auto; las de beneficio van a ≤ zona_premio_cerca de BORDE a borde de una zona de riesgo activa si hay.
 * Descarta lo que pisa `avoid` o otra zona visible. Null si ninguno de los 6 intentos sirve (el llamador reintenta más tarde).
 */
export function zonaLugar(c: ZoneCtx, d: Slot["d"], pactIdx: number, k: number, n: number, car: P2, vivas: { x: number; z: number; r: number; risk: boolean }[]): P2 | null {
  const base = c.seed + 0x7a0e + c.loop * 7919 + c.stage * 15485863 + pactIdx * 104729 + k * 1299709 + n * 31;
  const risk = vivas.filter((v) => v.risk);
  for (let a = 0; a < 6; a++) {
    const h = (i: number) => mix(base + a * 7 + i);
    const ang = h(0) * Math.PI * 2;
    let o: P2 = car, dd = R.zona_dist_min + h(1) * (R.zona_dist_max - R.zona_dist_min);
    if (!RISK.has(d.id) && risk.length) { const v = risk[Math.floor(h(2) * risk.length)]; o = v; dd = v.r + d.radio + 1 + h(1) * (R.zona_premio_cerca - 1); }
    const p = { x: o.x + Math.cos(ang) * dd, z: o.z + Math.sin(ang) * dd };
    if ((c.avoid ?? []).some((q) => dist(p, q) < R.zona_libre_m)) continue;
    if (vivas.some((v) => dist(p, v) < v.r + d.radio)) continue;
    return p;
  }
  return null;
}

/** Efecto de una lista de zonas activas sobre el punto (x,z). Pura: para el auto, y para una gema con xpMul. */
export function zonaFx(zs: { id: string; x: number; z: number; r: number }[], x: number, z: number): ZoneFx {
  const f = { ...NO_ZONE };
  for (const q of zs) {
    if (Math.hypot(q.x - x, q.z - z) > q.r) continue;
    const d = BAL.pactosZonas[q.id];
    if (d.efecto === "regen") f.regen += d.valor;
    else if (d.efecto === "iman_mult") { f.magnetMul *= d.valor; f.scrapMul *= R.zona_iman_tornillos; }
    else if (d.efecto === "xp_mult") f.xpMul *= d.valor;
    else if (d.efecto === "speed_mult") f.speedMul *= d.valor;
    else if (d.efecto === "dps") f.dps += d.valor;
  }
  return f;
}

// ---------- Dibujo: una plantilla fusionada por zona (radio 1, se escala por instancia) ----------
function tpl(id: string) {
  return template("zona_" + id, () => {
    const mk = (key: string, color: string, emissive: string, alpha = 1) => { const m = pbr(key, { color, rough: 1, emissive, alpha }); m.fogEnabled = false; return m; };
    if (RISK.has(id)) {
      const fill = { pegamento: ["#6b3f12", "#2e1a06", 0.55], cables: ["#ff2a1a", "#a01008", 0.18], trampilla: ["#3a2618", "#1a0f08", 1] }[id] as [string, string, number];
      const d = B.MeshBuilder.CreateDisc("p", { radius: 1, tessellation: 28 }, scene);
      d.rotation.x = Math.PI / 2; d.material = mk("zona_" + id, ...fill);
      const band = tor(2, 0.24, hazardMat(), [0, 0.03, 0], undefined, 28);
      band.scaling.y = 0.6; band.bakeCurrentTransformIntoVertices(); // banda plana en el piso, como el telegráfico
      return [d, band];
    }
    // Alfombra cuadrada de esquinas redondeadas (lado 2, radio de esquina 0,25): dos cajas cruzadas + cuatro cilindros
    const col = { camerino: ["#d9a86a", "#6a4a24"], iman: ["#2f7f86", "#123c40"], foco: ["#e8b53a", "#7a5a10"] }[id] as [string, string];
    const m = mk("zona_" + id, col[0], col[1]);
    const t = 0.05, c = 0.25, e = 1 - c;
    const parts = [box(2, t, 2 - 2 * c, m, [0, t / 2, 0]), box(2 - 2 * c, t, 2, m, [0, t / 2, 0]), ...[[-e, -e], [e, -e], [-e, e], [e, e]].map(([x, z]) => cyl(2 * c, 2 * c, t, m, [x, t / 2, z], undefined, 8))];
    parts.push(tor(1.7, 0.05, mk("zona_borde_bien", "#7be08a", "#2f8a40"), [0, t, 0], undefined, 28)); // aro verde fino: "bien", distinto del rayado de riesgo y del rojo de los avisos de jefe
    if (id === "camerino") { const cinta = mk("zona_camerino_cinta", "#d7263d", "#5a0f18"); parts.push(box(0.2, t + 0.01, 0.8, cinta, [0, t / 2, 0]), box(0.8, t + 0.01, 0.2, cinta, [0, t / 2, 0])); } // cruz de cinta
    return parts;
  });
}
function show(s: Slot) {
  const m = (s.m ??= (() => { const t = tpl(s.d.id); shadows.removeShadowCaster(t); const i = t.createInstance("zona_" + s.d.id); i.isPickable = false; return i; })());
  m.setEnabled(true);
  const k = s.st === "warn" ? 0.2 + 0.8 * (1 - s.t / R.zona_aviso_s) : 1; // el aro crece durante el aviso
  m.position.set(s.x, (ctx?.floorY?.(s.x, s.z) ?? 0) + 0.12 + (MOON.on ? (s.d.radio * s.d.radio) / (2 * MOON.R) : 0), s.z); // luna: patio: el relieve fino del suelo se comía la alfombra con 0,04; luna: además el piso se curva (flecha r²/2R) m.scaling.set(s.d.radio * k, 1, s.d.radio * k);
  if (MOON.on) { m.rotation.set(0, 0, 0); orient(m); } // luna: la normal de la esfera; sin esto el disco queda inclinado y semienterrado
}

// ---------- Ciclo de vida ----------
/** Escenario nuevo: arma una ranura por cada zona de los pactos activos. Libera lo anterior. */
export function zonesInit(c: ZoneCtx) {
  zonesDispose();
  ctx = c; clock = 0;
  for (const d of zonasDe(c.pacts)) for (let k = 0; k < d.max; k++) slots.push({ d, idx: c.pacts.indexOf(d.pacto), k, st: "wait", t: k * 3, n: 0, x: 0, z: 0, acc: 0, m: null }); // la 2.ª del mismo tipo entra 3 s después
}
/** Descarga el escenario (o la partida): las instancias se desactivan; las plantillas quedan para el próximo armado. */
export function zonesDispose() {
  for (const s of slots) s.m?.dispose();
  slots = []; ctx = null;
}
const lcgSeed = (n: number) => { let k = (Math.floor(n) % 2147483646) + 1; return () => ((k = (k * 16807) % 2147483647) / 2147483647); };

/** Avanza `dt` s con el auto en `car` y devuelve lo que valen las zonas en el auto. Quien integra aplica regen/dps (por segundo), speedMul, magnetMul, scrapMul y xpMul, y siembra los bichos de `spawns`. */
export function zonesTick(dt: number, car: P2): ZoneTick {
  const out: ZoneTick = { ...NO_ZONE, spawns: [], sparks: [] };
  if (!ctx) return out;
  clock += dt;
  for (const s of slots) {
    if (s.st === "done") continue;
    s.t -= dt;
    if (s.st === "wait" && s.t <= 0) {
      const vivas = visible().length >= R.zona_tope ? null : zonaLugar(ctx, s.d, s.idx, s.k, s.n, car, visible().map((v) => ({ x: v.x, z: v.z, r: v.d.radio, risk: RISK.has(v.d.id) })));
      if (!vivas) s.t = 1; // tope o sin sitio: reintenta en 1 s
      else { Object.assign(s, { x: vivas.x, z: vivas.z, st: "warn", t: R.zona_aviso_s, n: s.n + 1, acc: R.trampilla_cada_s }); }
    } else if (s.st === "warn" && s.t <= 0) { s.st = "on"; s.t = s.d.dura || Infinity; s.acc = R.trampilla_cada_s; }
    else if (s.st === "on" && s.t <= 0) { s.m?.setEnabled(false); if (s.d.pausa > 0) { s.st = "wait"; s.t = s.d.pausa; } else s.st = "done"; }
    if (s.st === "on") {
      if (s.d.efecto === "spawn_n" && (s.acc += dt) >= R.trampilla_cada_s) { s.acc = 0; out.spawns.push({ x: s.x, z: s.z, n: s.d.valor }); }
      if (s.d.id === "cables" && (s.acc += dt) >= R.cables_tic_s) { s.acc = 0; const r = lcgSeed(clock * 1000 + s.k); const a = r() * Math.PI * 2, d = Math.sqrt(r()) * s.d.radio; out.sparks.push({ x: s.x + Math.cos(a) * d, z: s.z + Math.sin(a) * d }); }
    }
    if (s.st === "warn" || s.st === "on") show(s);
  }
  return Object.assign(out, zonaFx(zonasActivas(), car.x, car.z));
}
const zonasActivas = () => slots.filter((s) => s.st === "on").map((s) => ({ id: s.d.id, x: s.x, z: s.z, r: s.d.radio }));
/** Zonas vivas (en aviso o activas), para el bot, el radar o las pruebas. Las que están en aviso aún no hacen efecto. */
export const zonesInfo = (): ZoneInfo[] => visible().map((s) => ({ id: s.d.id, x: s.x, z: s.z, r: s.d.radio, risk: RISK.has(s.d.id), active: s.st === "on" }));
/** Efecto de las zonas activas en un punto cualquiera (p. ej. una gema: xpMul). */
export const zonaEn = (x: number, z: number): ZoneFx => zonaFx(zonasActivas(), x, z);
