import * as B from "@babylonjs/core";
import { BAL } from "./balance";
import { FX } from "./fx";
import { box, cyl, sph, template, tor } from "./models";
import { alignYaw, hd, LUNA, MOON, onFloor, ringAt } from "./moon";
import { nodrizaDrops, SHIP_IO } from "./moon_ships";
import { pbr } from "./render";
import { rng } from "./rng";
import { banner } from "./ui";

// ---------- Objetivos en la superficie y cohete de escape (fase 3, docs/LUNA.md puntos 2 y 3) ----------
// Cada luna_obj_cada_s aparece un objetivo lejos del auto (baliza alta + radar): juntar celdas a tiempo o quedarse en la zona de una antena.
// Al salir el gusano (jefe final) aterriza el cohete: quedarse luna_cohete_s en su zona = victoria "Escape". Premio de objetivo = el de la nodriza (SHIP_IO.reward).
const A = BAL.ataques;
/** main.ts llena win: victoria alternativa por escape (en ENCORE, activar el teleportador: tele = true cambia el rótulo de la barra). */
export const GOAL_IO: { win: (p: B.Vector3) => void; tele: boolean } = { win: () => {}, tele: false };

const mats = () => {
  const glow = (n: string, c: string, a = 1) => { const m = pbr(n, { color: c, rough: 0.3, emissive: c, alpha: a }); m.fogEnabled = false; m.emissiveIntensity = 2.4; return m; };
  return { y: glow("objLuz", "#ffb347"), beam: glow("objHaz", "#ffb347", 0.22), hull: pbr("naveCasco", { color: "#5b6168", rough: 0.45, metal: 0.8 }), rust: pbr("naveOxido", { color: "#8a5a3a", rough: 0.8, metal: 0.3 }), dark: pbr("naveOscuro", { color: "#24262b", rough: 0.6, metal: 0.5 }) };
};
// Baliza: haz de 60 m sin niebla, se ve desde el otro lado del horizonte cercano
const beaconTpl = () => template("obj_baliza", () => { const L = mats(); return [cyl(1.2, 2.4, 60, L.beam, [0, 30, 0], undefined, 10)]; });
const cellTpl = () => template("obj_celda", () => { const L = mats(); return [cyl(0.9, 0.9, 1.4, L.dark, [0, 0.7, 0], undefined, 8), cyl(0.6, 0.6, 1.5, L.y, [0, 0.7, 0], undefined, 8), box(1.1, 0.2, 1.1, L.rust, [0, 1.5, 0], [0.2, 0.4, 0])]; });
const antennaTpl = () => template("obj_antena", () => { const L = mats(); return [ // mástil de chapa plegada con plato torcido y luz
  box(2.4, 0.5, 2.4, L.rust, [0, 0.25, 0], [0, 0.4, 0]), cyl(0.35, 0.6, 7, L.hull, [0, 3.5, 0], undefined, 6), cyl(3.2, 0.6, 0.8, L.dark, [0, 6.6, 0.4], [0.6, 0, 0], 10),
  sph(0.6, L.y, [0, 7.4, 0], undefined, 4), box(1.6, 0.15, 0.6, L.rust, [0.6, 2.4, 0], [0, 0, 0.5])]; });
const rocketTpl = () => template("obj_cohete", () => { const L = mats(); return [ // cohete de tanques soldados, tres patas y toberas encendidas
  cyl(2.6, 3, 9, L.hull, [0, 6, 0], undefined, 10), cyl(0.2, 2.6, 3, L.rust, [0, 12, 0], undefined, 10), cyl(3, 2.4, 1.2, L.dark, [0, 1.2, 0], undefined, 10),
  ...[0, 2.1, 4.2].map((a) => box(0.5, 4, 0.5, L.dark, [Math.sin(a) * 2.2, 1.6, Math.cos(a) * 2.2], [Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4])),
  sph(0.5, L.y, [0, 8, 1.45], undefined, 4), tor(1.6, 0.25, L.y, [0, 0.4, 0], undefined, 12)]; });
// ENCORE: el cohete es el teleportador. Escenario de show de chatarra: tarima con focos + marco giratorio de bombillas + haz. Un solo dibujo estático y un marco que gira (2 instancias).
const teleMats = () => { const L = mats(), bulb = pbr("teleFoco", { color: "#ffd9a0", rough: 0.3, emissive: "#ffb347" }); bulb.fogEnabled = false; return { ...L, bulb, beam: pbr("teleHaz", { color: "#ffb347", rough: 0.3, emissive: "#ffb347", alpha: 0.18 }) }; };
const teleBaseTpl = () => template("obj_tele_base", () => { const L = teleMats(); return [
  cyl(7, 7.4, 0.5, L.dark, [0, 0.25, 0], undefined, 12), cyl(5.2, 5.6, 0.3, L.rust, [0, 0.65, 0], undefined, 12), cyl(4.4, 4.4, 0.1, L.bulb, [0, 0.83, 0], undefined, 12),
  ...[0, 1, 2, 3].map((i) => { const a = i * Math.PI / 2 + 0.78; return box(0.5, 2.6, 0.5, L.hull, [Math.sin(a) * 3.3, 1.5, Math.cos(a) * 3.3], [0.15 * Math.cos(a), 0, -0.15 * Math.sin(a)]); }), // trusses torcidos
  ...[0, 1, 2, 3].map((i) => { const a = i * Math.PI / 2 + 0.78; return sph(0.6, L.bulb, [Math.sin(a) * 3.5, 2.9, Math.cos(a) * 3.5], undefined, 4); }),
  cyl(3.6, 3.6, 14, L.beam, [0, 7.8, 0], undefined, 10)]; });
const teleFrameTpl = () => template("obj_tele_marco", () => { const L = teleMats(); return [ // aro vertical de chapa con focos, gira sobre su eje
  tor(5.4, 0.5, L.hull, [0, 3.6, 0], [Math.PI / 2, 0, 0], 14), tor(4.4, 0.15, L.rust, [0, 3.6, 0], [Math.PI / 2, 0, 0], 14),
  ...Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return sph(0.55, L.bulb, [Math.sin(a) * 2.7, 3.6 + Math.cos(a) * 2.7, 0], undefined, 4); }),
  box(0.4, 1.4, 0.4, L.rust, [0, 0.9, 0.3], [0.2, 0, 0.1])]; });
const ringTpl = () => template("obj_aro", () => { const L = mats(); return [tor(2, 0.08, L.y, [0, 0, 0], undefined, 32)]; }); // zona: aro escalado al radio

type Goal = { kind: "celdas" | "antena" | "cohete"; p: B.Vector3; t: number; prog: number; drop: number; cells: { p: B.Vector3; m: B.InstancedMesh }[]; ms: B.InstancedMesh[]; spin?: B.InstancedMesh };
let goal: Goal | null = null, rocket: Goal | null = null, next = A.luna_obj_primero_s, alt = 0;
const stats = { hechos: 0, aparecidos: 0 };

function put(tpl: () => B.Mesh, p: B.Vector3, name: string) { const m = tpl().createInstance(name); onFloor(p, 0, m.position); m.rotationQuaternion = alignYaw(m.position, 0); return m; }
function make(kind: Goal["kind"], car: B.Vector3, dist: number, ang = rng() * Math.PI * 2): Goal {
  const p = ringAt(car, ang, dist, 0), g: Goal = { kind, p, t: 0, prog: 0, drop: 0, cells: [], ms: [put(beaconTpl, p, "baliza")] };
  if (kind === "celdas") {
    const n = A.luna_obj_celdas_min + (rng() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) { const c = ringAt(p, (i / n) * Math.PI * 2 + rng(), A.luna_obj_celdas_radio * (0.4 + rng() * 0.6), 0); g.cells.push({ p: c, m: put(cellTpl, c, "celda") }); }
  } else {
    if (kind === "cohete" && GOAL_IO.tele) { g.ms.push(put(teleBaseTpl, p, "tele")); g.spin = put(teleFrameTpl, p, "teleMarco"); g.ms.push(g.spin); }
    else g.ms.push(put(kind === "antena" ? antennaTpl : rocketTpl, p, kind));
    const r = put(ringTpl, p, "aro"); r.position.copyFrom(onFloor(p, 0.15)); r.scaling.setAll((kind === "antena" ? A.luna_obj_antena_radio : A.luna_cohete_radio) / 2); g.ms.push(r);
  }
  return g;
}
function drop(g: Goal) { for (const m of g.ms) m.dispose(); for (const c of g.cells) c.m.dispose(); }

/** Al salir el jefe final de la luna: aterriza el cohete lejos del auto. */
export function rocketLand(car: B.Vector3, quiet: boolean) {
  if (!MOON.on || rocket) return;
  rocket = make("cohete", car, A.luna_cohete_dist);
  if (!quiet) { banner("COHETE DE ESCAPE EN LA SUPERFICIE", 3, { tag: "RADIO", ico: "jefe", tone: "now" }); FX.shock(rocket.p); }
}
/** Dev: objetivo ya, a dist m del auto. */
export function goalForce(kind: "celdas" | "antena", car: B.Vector3, dist = 20, ang?: number) { if (goal) drop(goal); goal = make(kind, car, dist, ang); stats.aparecidos++; }
export function rocketForce(car: B.Vector3, dist = 20, ang?: number) { if (rocket) drop(rocket); rocket = make("cohete", car, dist, ang); }

/** Radar: objetivo activo, celdas que faltan y cohete. */
export const goalBlips = () => [...(goal ? (goal.cells.length ? goal.cells.map((c) => c.p) : [goal.p]) : []), ...(rocket ? [rocket.p] : [])];
/** Barra (la del jefe): progreso del objetivo o del cohete. Cohete primero (solo con el auto adentro). */
export function goalBar(car: B.Vector3) {
  if (rocket && rocket.prog > 0 && hd(car, rocket.p) < A.luna_cohete_radio) return { name: GOAL_IO.tele ? "TELEPORTADOR · ACTIVANDO" : "ABORDAJE DEL COHETE", pct: rocket.prog / A.luna_cohete_s };
  if (goal?.kind === "antena" && goal.prog > 0) return { name: "ANTENA · ENLACE", pct: goal.prog / A.luna_obj_antena_s };
  return null;
}
export const goalStats = () => `objetivos ${stats.hechos}/${stats.aparecidos}${rocket ? " · cohete" : ""}`;

/** Cada cuadro (solo luna). */
export function goalsTick(dt: number, time: number, car: B.Vector3, quiet: boolean) {
  if (!MOON.on) return;
  for (const m of goal?.cells ?? []) m.m.rotationQuaternion = alignYaw(m.m.position, time * 1.5);
  if (!goal && time >= next) {
    const kind = (alt++ + (rng() < 0.5 ? 0 : 1)) % 2 ? "antena" : "celdas"; // alternados, el primero al azar
    goal = make(kind, car, A.luna_obj_dist); stats.aparecidos++;
    if (!quiet) banner(kind === "celdas" ? "CELDAS DE ENERGÍA EN LA SUPERFICIE · RECOGER ANTES DEL CORTE" : "ANTENA EN LA SUPERFICIE · MANTENER LA ZONA", 3.2, { tag: "RADIO", ico: "cofre", tone: "warn" });
  }
  if (goal) {
    const g = goal; g.t += dt;
    let done = false, lost = false;
    if (g.kind === "celdas") {
      for (let i = g.cells.length - 1; i >= 0; i--) if (hd(car, g.cells[i].p) < A.luna_obj_celda_toma) {
        if (!quiet) FX.shock(g.cells[i].p);
        g.cells[i].m.dispose(); g.cells.splice(i, 1);
        if (!quiet && g.cells.length) banner(`CELDA RECOGIDA · FALTAN ${g.cells.length}`, 1.4, { tag: "RADIO", ico: "cofre" });
      }
      done = !g.cells.length; lost = g.t > A.luna_obj_celdas_s;
    } else {
      if (hd(car, g.p) < A.luna_obj_antena_radio) {
        g.prog += dt;
        if ((g.drop -= dt) <= 0 && LUNA.spawn) { // llegan bichos desde el borde de la zona
          g.drop = A.luna_obj_antena_bichos_cada_s;
          const k = nodrizaDrops(time);
          for (let i = 0; i < A.luna_obj_antena_bichos; i++) LUNA.spawn(k[Math.floor(rng() * k.length)], ringAt(g.p, rng() * Math.PI * 2, A.luna_obj_antena_radio + 8, 0.5));
        }
      }
      done = g.prog >= A.luna_obj_antena_s; lost = g.t > A.luna_obj_antena_limite_s;
    }
    if (done || lost) {
      if (done) { stats.hechos++; SHIP_IO.reward(onFloor(car, 0.5), A.luna_obj_premio_xp, false); }
      if (!quiet) banner(done ? "OBJETIVO CUMPLIDO · CARGA LIBERADA" : "OBJETIVO PERDIDO · SEÑAL CORTADA", 2.4, { tag: "RADIO", ico: "cofre", tone: done ? "now" : undefined });
      drop(g); goal = null; next = time + A.luna_obj_cada_s;
    }
  }
  if (rocket?.spin) { // giro del marco y pulso de los focos (el material es solo del teleportador)
    rocket.spin.rotationQuaternion = alignYaw(rocket.spin.position, time * (rocket.prog > 0 ? 3 : 0.8));
    (teleMats().bulb as B.PBRMaterial).emissiveIntensity = 2.2 + Math.sin(time * 5) * 1.2 + (rocket.prog > 0 ? 1.5 : 0);
  }
  if (rocket) {
    if (hd(car, rocket.p) < A.luna_cohete_radio) rocket.prog += dt; else rocket.prog = 0;
    if (rocket.prog >= A.luna_cohete_s) { const p = rocket.p.clone(); rocket.prog = 0; GOAL_IO.win(p); }
  }
}

/** Partida nueva / fin. */
export function goalsClear() {
  if (goal) drop(goal); if (rocket) drop(rocket);
  goal = rocket = null; next = A.luna_obj_primero_s; alt = 0;
  stats.hechos = stats.aparecidos = 0;
}
