import { inFront, splitSpots } from "./enemies/logic";
import * as B from "@babylonjs/core";
import { SFX } from "./sfx";
import { debris, FX, impact, mark, splat, corpse } from "./fx";
import { cyl, sph, template } from "./models";
import { M, pbr, shadows } from "./render";
import { BAL } from "./balance";
import { LIVE } from "./weapons/passives";
import { rng } from "./rng";
import { run } from "./run_state";
import { save, beastRec } from "./menu";
import { MOON, at, deform, hd, onFloor, orient, upv } from "./moon";
import { craterHumeante } from "./moon_events";
import { hitShip } from "./moon_ships";
import { wormOut } from "./moon_worm";
import { armorMul, isAlien } from "./aliens";
import { GLB } from "./glb";
import { groundY, hitBreakables } from "./world";
import { banner, damageNumber, hudBoss, hudKill } from "./ui";
import { grant, endRun, setOutroAt } from "./outro";
import { erun } from "./encore_run";
import * as E from "./encore";
import { FINAL_WIN } from "./run";
import { Enemy, type Kind } from "./enemies";
import type { Player } from "./coop";

const R = BAL.ritmo, ATK = BAL.ataques;
export type Gem = { m: B.InstancedMesh; xp: number; pull: boolean; vy: number; fall?: boolean };
export type Pickup = { m: B.AbstractMesh; type: "pila" | "iman" | "cofre" };

// Combate: daño, explosiones, muertes y drops. Estado de partida: `run`; el resto entra por initCombat.
export interface CombatContext {
  readonly engine: B.AbstractEngine;
  readonly scene: B.Scene;
  readonly cam: B.FreeCamera;
  readonly players: Player[];
  readonly lead: Player;
  readonly enemies: Enemy[];
  readonly gems: Gem[];
  readonly pickups: Pickup[];
  readonly simulating: boolean;
  readonly toughXp: number;
  readonly lab: { on: boolean };
  addShake: (v: number) => void;
  addHitStop: (v: number) => void;
  gainXp: (n: number) => void;
  hurt: (n: number, continuous?: boolean, src?: string, by?: Kind) => void;
  spawnEnemy: (kind: Kind, p: B.Vector3) => void;
}
let c!: CombatContext;
export function initCombat(x: CombatContext) { c = x; }

// Macetas rotas sueltan tuercas y a veces una pila
export const smashed = (pots: B.Vector3[]) => { for (const p of pots) { SFX.break(); dropGems(p, R.maceta_xp); if (rng() < R.maceta_pila_prob) dropPickup(p, "pila"); c.addShake(0.5); } };

// ---------- Plantillas de recolectables ----------
export const gemTpl = (v: 1 | 5 | 20) => template("gem" + v, () => [
  cyl(0.5, 0.5, 0.22, pbr("gem" + v, { color: v === 1 ? "#cbd5e1" : v === 5 ? "#facc15" : "#38bdf8", rough: 0.3, metal: 0.6, emissive: v === 1 ? "#5a6878" : v === 5 ? "#c09010" : "#1890c8" }), [0, 0.3, 0], [0.4, 0, 0], 6),
  cyl(0.22, 0.22, 0.24, M.matte("#1e293b"), [0, 0.3, 0], [0.4, 0, 0], 6),
], v === 20 ? 1.5 : 1);

export function dropGems(pos: B.Vector3, amount: number, fall = false) {
  if (c.gems.length > R.gemas_tope) { c.gainXp(amount); return; } // tope: se absorbe directo
  while (amount > 0) {
    const v: 1 | 5 | 20 = amount >= 20 ? 20 : amount >= 5 ? 5 : 1;
    amount -= v;
    const m = gemTpl(v).createInstance("gem");
    const jx = (rng() - 0.5) * 1.5, jz = (rng() - 0.5) * 1.5;
    if (MOON.on) onFloor(at(pos, jx, 0, jz), 0, m.position); else m.position.set(pos.x + jx, groundY(pos.x + jx, pos.z + jz), pos.z + jz);
    const drop = fall && !c.simulating && !MOON.on; // lluvia de tornillos: caen desde ~13 m con estela (solo visual; en sim y luna, como antes)
    if (drop) m.position.y += 12 + Math.random() * 3;
    c.gems.push({ m, xp: v, pull: false, vy: drop ? 0 : 5 + Math.random() * 4, fall: drop }); // salta al caer (visual: Math.random, no toca la semilla)
  }
}

const PICKUP_CAP = R.pickups_tope; // por tipo; sin tope, a los 7-9 min había cientos en el piso (mallas + sombras) y la pestaña se caía
export const pilaTpl = () => template("pila", () => [cyl(0.8, 0.8, 1.6, pbr("pila", { color: "#22c55e", rough: 0.45, emissive: "#1a8040" }), [0, 0, 0], [0, 0, Math.PI / 2], 12)]);
export const imanTpl = () => template("iman", () => [sph(1.2, pbr("iman", { color: "#ef4444", rough: 0.35, metal: 0.35, emissive: "#c02020" }), [0, 0, 0])]);
export function dropPickup(pos: B.Vector3, type: Pickup["type"]) {
  if (type === "pila" && run.noRepair) return; // Sin reparaciones: tampoco caen pilas
  let m: B.AbstractMesh;
  // Pilas e imanes: instancias de plantilla (caen de a cientos) con tope; al pasarlo se va la más vieja de su tipo
  if (type !== "cofre") {
    let first = -1, n = 0;
    for (let i = 0; i < c.pickups.length; i++) { if (c.pickups[i].type === type) { n++; if (first < 0) first = i; } }
    if (n >= PICKUP_CAP && first >= 0) { c.pickups[first].m.dispose(); c.pickups.splice(first, 1); }
    m = (type === "pila" ? pilaTpl() : imanTpl()).createInstance(type);
    onFloor(pos, 0.8, m.position); orient(m);
  } else {
    m = cyl(2.2, 2.2, 1.6, M.metal("#d4a017"), [pos.x, 0.8, pos.z], undefined, 6);
    const beam = cyl(1.4, 1.4, 60, pbr("beam", { color: "#fde68a", emissive: "#fbbf24", alpha: 0.25 }), [0, 30, 0], undefined, 8);
    beam.parent = m;
    if (MOON.on) { onFloor(pos, 0.8, m.position); orient(m); } // luna: el haz sale para arriba del lugar
    shadows.addShadowCaster(m as B.Mesh); // las instancias ya proyectan sombra por su plantilla
  }
  c.pickups.push({ m, type });
}

// ---------- Combate ----------
export const toScreen = (p: B.Vector3) => B.Vector3.Project(p, B.Matrix.IdentityReadOnly, c.players.length > 1 ? c.cam.getTransformationMatrix() : c.scene.getTransformMatrix(), /* R7a: con varias cámaras la de la escena es la última dibujada */ c.cam.viewport.toGlobal(c.engine.getRenderWidth(), c.engine.getRenderHeight()));
// Daño infligido por fuente (pantalla de resultados): cs.src = arma que está actuando
export const dmgOut: Record<string, number> = {};
export const cs = { src: "" }; // arma/fuente que está actuando (antes `cs.src` en main.ts)
/** Enemigos con blindaje frontal (mismos números ATK.escudo_*): hay que rodearlos. */
export const FRONT_ARMOR: ReadonlySet<string> = new Set(["escudo", "cangrejo"]);
// Hit-stop proporcional (w 0..1 → hitstop_min_ms..hitstop_max_ms) con cubeta: nunca más de hitstop_tope s congelados por s. No corre en sim.
export const hitstopStats = { n: 0, ms: 0 }; // solo para medir en dev (window.__hs)
if (import.meta.env.DEV) (globalThis as unknown as { __hs: unknown }).__hs = hitstopStats;
let hsBucket = R.hitstop_reserva_s, hsT = 0;
export function hitstop(w: number) {
  if (c.simulating) return;
  const now = performance.now() / 1000;
  hsBucket = Math.min(R.hitstop_reserva_s, hsBucket + Math.min(1, now - hsT) * R.hitstop_tope); hsT = now;
  const s = (R.hitstop_min_ms + (R.hitstop_max_ms - R.hitstop_min_ms) * Math.max(0, Math.min(1, w))) / 1000;
  if (hsBucket < s) return;
  hsBucket -= s; c.addHitStop(s); hitstopStats.n++; hitstopStats.ms += s * 1000;
}
export function damage(e: Enemy, dmg: number, knock?: B.Vector3, crit = false) {
  dmg *= LIVE.dmg * (e.paint > 0 ? BAL.armasExtra.pintura_vuln : 1); // Calcomanía de llamas (bono a velocidad máxima) y Lata de pintura
  if (e.kind === "gusano" && !wormOut(e)) return; // gusano lunar: enterrado no recibe daño
  if (hitShip(e, dmg)) return; // luna: las naves son blancos de las armas (moon_ships.ts shipTargets)
  if (c.lead.car && isAlien(e.kind)) { const k = armorMul(e, c.lead.car.pos); if (k < 1) { dmg *= k; if (e.kind === "tanque" && !c.simulating) FX.sparks(e.pos.add(upv(e.pos, 0.6))); } } // tanque alien (aliens.ts): placa frontal y escudo del curandero
  if (FRONT_ARMOR.has(e.kind) && c.lead.car && inFront(e.node.forward, e.pos, c.lead.car.pos, ATK.escudo_frente_cos)) { dmg *= ATK.escudo_blindaje; if (!c.simulating) FX.sparks(e.pos.add(upv(e.pos, 0.6))); } // escudero y cangrejo: placa frontal (ponytail: el origen es el auto, como armorMul; techo: pasar el origen real del golpe)
  if (cs.src) {
    const eff = Math.min(dmg, Math.max(0, e.hp));
    dmgOut[cs.src] = (dmgOut[cs.src] ?? 0) + eff;
    if (!c.simulating && !c.lab.on) { const by = beastRec(e.kind).by; by[cs.src] = (by[cs.src] ?? 0) + eff; } // debilidades (ficha del bestiario)
  }
  e.hp -= dmg;
  run.bestHit = Math.max(run.bestHit, dmg);
  if (dmg >= 4) SFX.impact(cs.src, crit);
  if (dmg >= 5 && !c.simulating && save.dmgNums) {
    const sp = toScreen(e.pos.add(upv(e.pos, e.def.size[1] + 0.3)));
    const k = innerWidth / c.engine.getRenderWidth();
    if (sp.z < 1) damageNumber(sp.x * k, sp.y * k, dmg, crit);
  }
  if (!c.simulating && cs.src !== "embestida" && (dmg / e.maxHp >= R.hitstop_umbral_vida || e.def.boss && dmg >= 20 || crit && e.elite)) hitstop(dmg / e.maxHp / (R.hitstop_umbral_vida * 2)); // la embestida lo dispara en run_tick
  // Impacto: destello, chispas, pedazos y squash del bicho; la sacudida de cámara depende del arma
  if (dmg >= 4 && !c.simulating) c.addShake(impact(e.node, e.pos.add(upv(e.pos, e.def.size[1] * 0.5)), e.def.color, Math.max(e.def.size[0], e.def.size[2]) * (e.def.scale ?? 1), cs.src, crit, !!e.def.boss));
  if (knock && !e.def.boss) e.body.applyImpulse(knock.scale(e.def.mass), e.pos);
}

export function explode(pos: B.Vector3, r: number, dmg: number) {
  FX.explosion(pos.add(upv(pos, 0.5)), r);
  SFX.explosion();
  mark("scorch", pos, Math.random() * 6, r * 0.55, 14);
  smashed(hitBreakables(pos, r, dmg));
  c.addShake(0.25);
  for (const e of c.enemies) {
    const d = B.Vector3.Distance(e.pos, pos);
    if (d < r + e.radius) damage(e, dmg, e.pos.subtract(pos).normalize().addInPlace(upv(e.pos, 0.6)).scale(6));
  }
}

// Explosivo alien: daña a todo lo de adentro del aro y deja un cráter de verdad. Se usa al armarse y al morir por daño (otros explosivos del radio reviente en cadena)
const boomed = new WeakSet<Enemy>();
export function boom(e: Enemy) {
  if (boomed.has(e) || !c.lead.car) return;
  boomed.add(e); // una sola explosión por bicho (la cadena no vuelve sobre sí misma)
  if (hd(c.lead.car.pos, e.pos) < ATK.alien_explosivo_radio + Math.max(c.lead.car.def.size[0], c.lead.car.def.size[2]) / 2) c.hurt(ATK.alien_explosivo_dano, false, "explosión " + e.kind, e.kind);
  explode(e.pos, ATK.alien_explosivo_radio, ATK.alien_explosivo_dano_bicho);
  if (MOON.on) { deform(e.pos, ATK.alien_explosivo_crater_r, ATK.alien_explosivo_crater_hondo); craterHumeante(e.pos, ATK.alien_explosivo_crater_r, !c.simulating); }
}

// Kamikaze: explosión con sus números (boom() es la del explosivo alien); una sola por bicho
export function boomK(e: Enemy) {
  if (boomed.has(e) || !c.lead.car) return;
  boomed.add(e);
  if (hd(c.lead.car.pos, e.pos) < ATK.kamikaze_radio + Math.max(c.lead.car.def.size[0], c.lead.car.def.size[2]) / 2) c.hurt(ATK.kamikaze_dano, false, "explosión " + e.kind, e.kind);
  explode(e.pos, ATK.kamikaze_radio, ATK.kamikaze_dano_bicho);
}

// Color del charco de cada insecto = color de sus ojos (models.ts)
const BUG_GOO: Partial<Record<Kind, string>> = { hormiga: "#ff3020", escupidora: "#ffb020", escarabajo: "#9acd32", polilla: "#c9a0ff" };
const CONFETI = ["#ffd84d", "#ff9bd4", "#7de8ff", "#b6ff6a", "#ffa05a"];
export function kill(e: Enemy) {
  if (e.kind === "explosivo" && e.hp > -1e8) boom(e); // murió por daño (clear/boom ponen -1e9)
  if (e.kind === "kamikaze" && e.hp > -1e8) boomK(e);
  run.kills++;
  const s = hudKill(); // una sola llamada: cada hudKill() suma una baja (antes se llamaba 5 veces y el cartel mostraba otro número)
  run.bestStreak = Math.max(run.bestStreak, s); if (e.def.boss) run.bossKills++;
  if (s >= 20 && s % 20 === 0) SFX.streak(s);
  else if (s < 20 && s % 10 === 0) SFX.streak(s);
  if (!c.simulating && (s === 50 || s % 100 === 0)) banner(`RACHA x${s}`, 1.2); // cartel central solo en hitos
  if (s >= 100) grant("racha");
  if (!c.simulating && !c.lab.on) {
    save.slain[e.kind] = (save.slain[e.kind] ?? 0) + 1;
    if (e.kind === "mosca" && save.slain.mosca! >= 100) grant("mosca");
    if (e.kind === "babosa" && save.slain.babosa! >= 25) grant("babosa");
  }
  SFX.kill(s);
  FX.death(e.pos.add(upv(e.pos, 0.5)), e.def.boss);
  if (!c.simulating && (e.def.boss || e.elite)) { hitstop(e.def.boss ? 1 : 0); if (e.def.boss) FX.flash(e.pos.add(upv(e.pos, e.def.size[1] * 0.5)), 14); } // destello de jefe (burst del pool)
  debris(e.pos, e.def.color, e.def.boss ? 30 : e.kind === "hormiga" ? 4 : 7, e.def.boss ? 14 : 6, e.def.scale ?? (e.def.boss ? 3 : 1));
  if (!c.simulating) debris(e.pos, CONFETI[Math.floor(Math.random() * CONFETI.length)], e.def.boss ? 14 : 3, e.def.boss ? 12 : 7, e.def.boss ? 1.2 : 0.5); // confeti de color: cada baja se ve festiva
  const juice = !c.simulating && !e.def.boss;
  if (juice && BUG_GOO[e.kind]) splat(e.pos, BUG_GOO[e.kind]!, Math.max(e.def.size[0], e.def.size[2]) * 0.55);
  if (juice && (e.kind === "friccion" || e.kind === "robot")) { debris(e.pos, "#b8bcc2", 5, 8, 0.45); debris(e.pos, "#d4a017", 3, 9, 0.35); FX.sparks(e.pos.add(upv(e.pos, 0.5))); }
  if (e.loot > 0) dropGems(e.pos, e.loot); // ladrón: devuelve lo robado
  if (e.def.xp) dropGems(e.pos, e.def.xp * (e.def.boss ? 1 : c.toughXp * (MOON.on ? R.luna_xp_mult : 1)));
  if (e.def.boss) {
    c.addShake(1.5);
    run.runScrap += R.tornillos_jefe;
    if (e.kind === "rey" || e.kind === "cortadora" || e.kind === "tarantula" || e.kind === "gato" || e.kind === "payaso") grant(e.kind);
    if (e.kind === run.finalKind && !run.endless) {
      setOutroAt(e.pos.clone()); leave(e);
      const why = FINAL_WIN[run.finalKind] ?? "El jefe final quedó fuera de combate. Su seguro ya fue notificado.";
      return endRun(true, erun && E.bossDown(erun) ? `${E.line("won", erun)} ${why}` : why); // ENCORE: el Director cierra el show en los resultados
    }
    dropPickup(e.pos, "cofre");
    hudBoss(null);
  } else {
    const r = rng() / LIVE.luck; // Llavero de la suerte: más pilas e imanes
    if (r < R.drop_pila_prob) dropPickup(e.pos, "pila");
    else if (r < R.drop_pila_prob + R.drop_iman_prob) dropPickup(e.pos, "iman");
  }
  if (e.elite) { dropPickup(e.pos, "cofre"); e.aura?.dispose(); } // la élite suelta cofre; el aura no queda en el cadáver
  // Los insectos quedan patas arriba unos segundos; el resto desaparece
  if (e.kind === "divisor" && e.hp > -1e8 && !MOON.on) for (const o of splitSpots(ATK.divisor_crias, ATK.divisor_cria_radio)) c.spawnEnemy("cria", e.pos.add(new B.Vector3(o.x, 0.3, o.z))); // se parte en crías (si lo borra clear/reciclado, no)
  if (e.kind === "grillo" && !MOON.on) for (let i = 0; i < 2; i++) c.spawnEnemy("mosca", e.pos.add(new B.Vector3(i ? 0.7 : -0.7, 0.3, 0))); // plaga: el grillo se parte en 2 moscas (e.pos se lee antes de borrar)
  if (juice && BUG_GOO[e.kind]) { e.agg.dispose(); corpse(e.node, e.def.size[1] * (e.def.scale ?? 1)); } else leave(e);
}
// Jefes GLB con clips (Felipe, Eulalio): quedan en el piso reproduciendo su muerte; el resto de los jefes desaparece
function leave(e: Enemy) {
  if (GLB[e.kind]?.clips) { e.die(); corpse(e.node, 0, (dt) => e.animate(dt)); } else e.dispose();
}
