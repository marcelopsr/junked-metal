import * as B from "@babylonjs/core";
import { hudMate, hudQuad, hudAbility, hudArrows, hudEnc, hudJump, hudSlots, hudRadar, hudUpdate } from "./ui";
import { ctl, btnName, pb, KEYS } from "./input";
import { ABIL_ICON, keyName, save } from "./menu";
import { run } from "./run_state";
import { ABILITIES, abilCd as abilCdOf } from "./abilities";
import { BAL, xpNeed } from "./balance";
import { debris, FX } from "./fx";
import * as E from "./encore";
import { erun, encPrior } from "./encore_run"; import { goalBlips } from "./moon_goals";
import { MOON, hd, rel, yawOf } from "./moon";
import type { PassiveId, Weapon } from "./weapons";
import type { Player } from "./coop";
import type { Enemy } from "./enemies";

const R = BAL.ritmo;

// Tick del HUD (flechas, radar, desgaste del auto, barras). Estado de partida: `run`; el resto entra por initHudTick.
export interface HudTickContext {
  readonly engine: B.AbstractEngine;
  readonly low: boolean;
  readonly weapons: Weapon[];
  readonly enemies: Enemy[];
  readonly pickups: { type: string; m: B.AbstractMesh }[];
  readonly gems: { m: B.AbstractMesh }[];
  readonly lead: Player;
  readonly players: Player[];
  readonly others: () => Player[];
  readonly camYaw: number;
  readonly shake: number;
  setShake: (v: number) => void;
  readonly simulating: boolean;
  readonly lampBoost: boolean;
  readonly lastHpFrac: number;
  setLastHpFrac: (f: number) => void;
  toScreen: (p: B.Vector3) => B.Vector3;
}
let c!: HudTickContext;
export function initHudTick(x: HudTickContext) { c = x; }

let hudT = 0, hudSlotF = 0, lastKmh = 0, lastMaxKmh = 80;
export const setKmh = (k: number, max: number) => { lastKmh = k; lastMaxKmh = max; };
export function updateHud(dt: number) {
  if (!c.low || (hudSlotF++ & 1) === 0) hudSlots(c.weapons.map((w) => ({ id: w.id, lv: w.lv, evolved: w.evolved, cd: w.cdFrac })), (Object.entries(run.passives) as [PassiveId, number][]).map(([id, lv]) => ({ id, lv })));
  // Flechas hacia jefes y cofres fuera de pantalla
  const W = c.engine.getRenderWidth(), H = c.engine.getRenderHeight(), k = innerWidth / W, out: { x: number; y: number; kind: "jefe" | "cofre"; dist?: number }[] = [];
  const targets: [B.Vector3, "jefe" | "cofre"][] = [...c.enemies.filter((e) => e.def.boss).map((e) => [e.pos, "jefe"] as [B.Vector3, "jefe"]), ...c.pickups.filter((p) => p.type === "cofre").map((p) => [p.m.position, "cofre"] as [B.Vector3, "cofre"])];
  for (const [p, kind] of targets) {
    const sp = c.toScreen(p);
    let x = sp.x, y = sp.y;
    if (sp.z > 1) { x = W - x; y = H; } // detrás de la cámara
    if (sp.z > 1 || x < 0 || x > W || y < 0 || y > H) out.push({ x: x * k, y: y * k, kind, dist: Math.round(hd(p, c.lead.car!.pos)) });
  }
  hudArrows(out);
  if ((hudT -= dt) > 0) return;
  hudT = 0.05;
  // Luna: el radar es el plano local del auto (el auto en el centro, cada punto con su rumbo y su distancia por la superficie)
  const xz = MOON.on ? (p: B.Vector3) => rel(p, c.lead.car!.pos) : (p: B.Vector3) => ({ x: p.x, z: p.z });
  const gemBlips = c.gems.length <= 40 ? c.gems.map((g) => ({ ...xz(g.m.position), kind: "gema" as const })) : [];
  const recBlips = c.pickups.length <= 24 ? c.pickups.filter((p) => p.type !== "cofre").map((p) => ({ ...xz(p.m.position), kind: "rec" as const })) : [];
  hudRadar(
    MOON.on ? { x: 0, z: 0, yaw: yawOf(c.lead.car!.root.forward, c.lead.car!.pos), up: c.camYaw } : { x: c.lead.car!.pos.x, z: c.lead.car!.pos.z, yaw: Math.atan2(c.lead.car!.root.forward.x, c.lead.car!.root.forward.z), up: c.camYaw },
    [...c.enemies.map((e) => ({ ...xz(e.pos), kind: e.def.boss ? ("jefe" as const) : e.elite ? ("elite" as const) : ("enemigo" as const) })),
     ...c.pickups.filter((p) => p.type === "cofre").map((p) => ({ ...xz(p.m.position), kind: "cofre" as const })),
     ...(MOON.on || erun ? goalBlips().map((p) => ({ ...xz(p), kind: "obj" as const })) : []),
     ...gemBlips, ...recBlips]);
  // Daño visible: pintura gastada y piezas que saltan al cruzar 50% y 25%
  const frac = Math.max(0, c.lead.hp / c.lead.maxHp);
  c.lead.car!.wear(frac);
  for (const t of [0.5, 0.25]) if (c.lastHpFrac > t && frac <= t) { debris(c.lead.car!.pos, save.paint || "#d62828", 8, 7, 0.8); FX.sparks(c.lead.car!.pos); c.setShake(Math.max(c.shake, 0.6)); }
  c.setLastHpFrac(frac);
  const o = c.others(); hudMate(o.length === 1 ? { n: `J${o[0].id}`, hp: o[0].hp, max: o[0].maxHp, down: !o[0].car } : null);
  hudQuad(c.players.length > 2 ? c.players.map((p) => ({ hp: p.hp, max: p.maxHp, down: !p.car })) : null); // R7c: 3-4 jugadores, una vida por cuadro
  if (erun) { const a = E.ask(erun); hudEnc({ tag: E.tag(erun), pacts: E.activePacts(erun), ask: a && { title: a.title, opts: a.opts, left: erun.timer, frac: Math.max(0, erun.timer) / a.total, pacts: a.pacts, reject: a.reject } }); } else hudEnc(null);
  hudUpdate({
    hp: c.lead.hp, maxHp: c.lead.maxHp, boost: c.lead.boost, xp: run.xp, need: xpNeed(run.level), level: run.level, pending: run.pendingLevels, time: run.time + encPrior, kills: run.kills, kmh: lastKmh, maxKmh: lastMaxKmh,
    shield: run.abil === "escudo" && run.abilOn > 0,
    boostActive: c.lampBoost,
    distCenter: c.lead.car ? (MOON.on ? hd(c.lead.car.pos, B.Vector3.Zero()) : Math.hypot(c.lead.car.pos.x, c.lead.car.pos.z)) : 0,
    heat: Math.min(1, run.boostSec / 2.0),
  });
  hudAbility(ABILITIES[run.abil].short, ctl === "pad" ? btnName(pb("ability")) : keyName(KEYS.ability[0]), 1 - Math.max(0, run.abilCd) / abilCdOf(run.abil, run.abilLv), run.abilOn > 0, ABIL_ICON[run.abil], Math.max(0, run.abilCd));
  if (!c.simulating) hudJump(run.jumpCd <= 0 ? 1 : 1 - run.jumpCd / R.salto_cd_s);
}
