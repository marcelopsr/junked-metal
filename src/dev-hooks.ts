import * as B from "@babylonjs/core";
import type { Kind } from "./enemies";
import { DEF } from "./enemies";
import type { WeaponId, PassiveId, Weapon, Offer } from "./weapons";
import { WEAPONS } from "./weapons";
import type { AbilityId } from "./abilities";
import type { ShipId } from "./moon_ships";
import { shipsClear, shipSpawn } from "./moon_ships";
import * as E from "./encore";
import { lunaDev } from "./moon_events";
import { skyLaunch, skyInfo } from "./moon_sky";
import { deform, alt, upAt, flatL, ringAt, rel, toLocal, onFloor, at, skyVisible } from "./moon";
import { wormForce } from "./moon_worm";
import { goalForce, rocketForce } from "./moon_goals";
import { ALIENS } from "./aliens";
import { CLIMATES } from "./run";
import { PRESETS as PRESETS_DEV, presetOf, gfxInfo } from "./render";

export type DuelTeam = {
  level: number;
  weapons: [WeaponId, number, boolean][];
  passives: Partial<Record<PassiveId, number>>;
};

export const DUEL_TEAMS: DuelTeam[] = [
  { level: 51, weapons: [["helado", 5, true], ["yoyo", 5, false], ["globos", 5, true], ["trompo", 5, false], ["chispazo", 5, true], ["bengalas", 4, false]], passives: { resorte: 2, litio: 1, capacitor: 3, lupa: 3, iman: 1 } },
  { level: 50, weapons: [["gomitas", 5, true], ["clips", 5, false], ["bocina", 5, false], ["bengalas", 5, false], ["chispazo", 5, true], ["trompo", 5, false]], passives: { resorte: 1, iman: 3, turbo: 4, litio: 2, lupa: 4, lego: 1 } },
  { level: 58, weapons: [["gomitas", 5, true], ["petardos", 5, true], ["bengalas", 5, true], ["trompo", 5, true], ["chispero", 5, false], ["helado", 5, false]], passives: { resorte: 3, iman: 5, litio: 5, lupa: 5, capacitor: 5, turbo: 5 } },
  { level: 55, weapons: [["gomitas", 5, true], ["trompo", 5, true], ["clips", 5, true], ["petardos", 5, true], ["bengalas", 5, false], ["yoyo", 5, false]], passives: { iman: 5, litio: 5, capacitor: 5, resorte: 5, lupa: 5, turbo: 1 } },
  { level: 50, weapons: [["chispero", 5, true], ["bocina", 5, false], ["yoyo", 5, false], ["bengalas", 5, false], ["globos", 5, true], ["clips", 5, false]], passives: { capacitor: 4, turbo: 2, resorte: 3, lupa: 4, lego: 1, litio: 1 } },
  { level: 56, weapons: [["trompo", 5, true], ["bocina", 5, false], ["globos", 5, true], ["chispazo", 5, true], ["anillo", 5, true]], passives: { resorte: 2, iman: 2, capacitor: 5, litio: 1, lupa: 3, turbo: 1 } },
  { level: 45, weapons: [["gomitas", 5, true], ["chispero", 5, false], ["petardos", 5, false], ["regla", 5, false], ["yoyoelec", 5, true]], passives: { resorte: 1, lupa: 2, litio: 5, iman: 3, capacitor: 2, turbo: 1 } },
];

export interface DevHooksContext {
  engine: B.AbstractEngine;
  scene: B.Scene;
  cam: B.Camera;
  camYaw: number;
  times: Record<string, number>;
  glbStats: unknown;
  ensureAll: () => Promise<void>;
  bichosOk: boolean;
  look: (o?: any) => unknown;
  applySettings: () => void;

  state: any;
  setState: (s: any) => void;
  time: number;
  setTime: (t: number) => void;
  level: number;
  setLevel: (lv: number) => void;
  kills: number;
  runSeed: number;
  setForceSeed: (s: number) => void;
  simulating: boolean;
  setSimulating: (s: boolean) => void;
  god: boolean;
  setGod: (g: boolean) => void;
  duel: number;
  setDuel: (d: number) => void;
  endless: boolean;
  setRevives: (r: number) => void;
  save: any;
  profile: any;
  setCycleS: (s: number) => void;
  rainWet: (w: number) => void;

  lead: any;
  players: any[];
  others: () => any[];
  liveM: () => any[];
  matePlace: (t: any) => void;
  coop: number;
  setCoop: (c: number) => void;
  isTouch: boolean;

  weapons: Weapon[];
  setWeapons: (w: Weapon[]) => void;
  passives: Partial<Record<PassiveId, number>>;
  setPassives: (p: Partial<Record<PassiveId, number>>) => void;
  makeWeapon: (id: WeaponId) => Weapon;
  recompute: () => void;
  gainXp: (n: number) => void;
  evoOffer: (w: Weapon[], p: Partial<Record<PassiveId, number>>) => Offer | null;

  enemies: any[];
  spits: any[];
  gems: any[];
  spawnEnemy: (kind: Kind, pos: B.Vector3) => void;
  spawnPoint: (pos: B.Vector3, min: number, max: number) => B.Vector3;
  damage: (enemy: any, amount: number) => void;
  dmgBy: Record<string, number>;
  dmgOut: Record<string, number>;
  RUN_BOSSES: [number, Kind][];
  bossIdx: number;
  setBossIdx: (i: number) => void;
  setFinalKind: (k: Kind) => void;
  setSwarmT: (t: number) => void;
  setGroupT: (t: number) => void;
  setChestT: (t: number) => void;
  setBallT: (t: number) => void;
  evtPre: any;
  obstacles: () => Array<{ x: number; z: number; r: number }>;

  encore: boolean;
  setEncore: (e: boolean) => void;
  erun: any;
  encLog: Array<{ loop: number; stage: number; t: number }>;
  encPrior: number;
  paceS: number;
  encApply: (act: any) => void;
  shopAt: (kind: "cofre" | "maquina", i: number) => B.Vector3 | null;
  shopDev: (kind: "cofre" | "maquina", pos: B.Vector3) => boolean;
  carPlace: (p: B.Vector3, aim: B.Vector3) => any;
  onFloor: (p: B.Vector3, yOff: number) => B.Vector3;
  goalBlips: () => Array<{ x: number; z: number }>;
  runScrap: number;
  setRunScrap: (s: number) => void;
  GOAL_IO: { scrap: () => number };

  net: any;
  netBytes: number;
  netLv: boolean;
  cardBy: any;
  offers: Offer[];
  votes: any;
  netPools: any;
  netBuf: unknown[];
  netIn: unknown;

  MOON: { on: boolean };
  SUN_DIR: B.Vector3;
  EARTH_DIR: B.Vector3;
  moonPlace: (d: B.Vector3, aim: B.Vector3) => B.Vector3;
  goalStats: () => string;
  curseK: number;
  TOUGH: { xp: number };
  R: any;
  LAB: any;

  abil: AbilityId;
  setAbil: (a: AbilityId) => void;
  abilLv: number;
  setAbilLv: (lv: number) => void;
  abilCd: number;
  setAbilCd: (cd: number) => void;
  abilOn: number;
  useAbility: (car: any) => void;
  worldK: number;
  driveMul: number;

  input: { move: boolean; drift: boolean };
  startRun: () => void;
  toMenu: () => void;
  resume: () => void;
  goEndless: () => void;
  applyCommand: (pid: number, cmd: any) => void;
  update: (dt: number) => void;
  tickFx: (dt: number) => void;
  duelM?: any;
  m3M?: any;

  $: (id: string) => HTMLElement;
  fmt: (s: number) => string;
  hd: (a: B.Vector3, b: B.Vector3) => number;
  at: (p: B.Vector3, dx: number, dy: number, dz: number) => B.Vector3;
}

export function botStep(m: typeof import("./devbot"), dt: number, ctx: DevHooksContext): void {
  const pe = ctx.scene.getPhysicsEngine() as unknown as { _step(d: number): void };
  if (ctx.state === "level") {
    const low = ctx.lead.hp < ctx.lead.maxHp * 0.6;
    const evoP = new Set(ctx.weapons.filter((w) => !w.evolved).map((w) => WEAPONS[w.id].evo as string));
    const pref = (o: Offer) =>
      o.kind === "evo" || o.kind === "fusion"
        ? 9
        : low && (o.id === "litio" || o.id === "lego" || o.kind === "heal")
          ? 8
          : o.kind === "weapon" && ctx.weapons.some((w) => w.id === o.id)
            ? 7
            : o.kind === "passive" && evoP.has(o.id) && !ctx.passives[o.id as PassiveId]
              ? 6
              : o.kind === "weapon" && o.id !== "lanza" && ctx.weapons.length < 4
                ? 5
                : o.id === "lupa" || o.id === "capacitor"
                  ? 4
                  : o.kind === "passive" && evoP.has(o.id)
                    ? 3
                    : o.kind === "weapon" && o.id !== "lanza"
                      ? 2
                      : o.kind === "passive"
                        ? 1
                        : 0;
    ctx.applyCommand(ctx.lead.id, {
      k: "card",
      i: ctx.offers.reduce((b, o, i) => (pref(o) > pref(ctx.offers[b]) ? i : b), 0),
    });
    return;
  }
  ctx.lead.car!.root.computeWorldMatrix(true);
  for (const e of ctx.enemies) e.node.computeWorldMatrix(true);

  const b = ctx.enemies.find((e) => e.def.boss);
  const zones: { x: number; z: number; r: number }[] = [];
  if (b?.tele[0]?.isVisible && b.kind !== "aspiradora") {
    zones.push({ x: b.tele[0].position.x, z: b.tele[0].position.z, r: Math.max(b.tele[0].scaling.x, b.tele[0].scaling.z) });
  }
  if (b?.kind === "perro" && b.airborne) {
    const bv = b.body.getLinearVelocity();
    const t = (bv.y + Math.sqrt(Math.max(0, bv.y * bv.y + 50 * b.pos.y))) / 25;
    zones.push({ x: b.pos.x + bv.x * t, z: b.pos.z + bv.z * t, r: 11 });
  }
  for (const s of ctx.spits) zones.push({ x: s.m.position.x + s.v.x * 0.3, z: s.m.position.z + s.v.z * 0.3, r: 1.2 });
  for (const cb of b?.cables ?? []) zones.push({ x: (cb.a.x + cb.b.x) / 2, z: (cb.a.z + cb.b.z) / 2, r: 3.5 });
  const bb = b && {
    x: b.pos.x,
    z: b.pos.z,
    kind: b.kind,
    fx: b.node.forward.x,
    fz: b.node.forward.z,
    charge: b.kind === "cortadora" && b.state === 1,
    ram: ctx.weapons.some((w) => w.id === "lanza" && w.evolved),
  };
  if (ctx.MOON.on) {
    const cp = ctx.lead.car!.pos;
    const L = (p: B.Vector3) => rel(p, cp);
    const mz: { x: number; z: number; r: number }[] = [];
    if (b?.tele[0]?.isVisible && b.kind !== "aspiradora") {
      mz.push({ ...L(b.tele[0].position), r: Math.max(b.tele[0].scaling.x, b.tele[0].scaling.z) });
    }
    for (const s of ctx.spits) mz.push({ ...L(s.m.position), r: 1.2 });
    for (const cb of b?.cables ?? []) mz.push({ ...L(B.Vector3.Center(cb.a, cb.b)), r: 3.5 });
    const f = flatL(ctx.lead.car!.root.forward, cp);
    const v = toLocal(ctx.lead.car!.body.getLinearVelocity(), cp);
    const bf = b && flatL(b.node.forward, cp);
    const lb = b && bf && {
      ...L(b.pos),
      kind: b.kind,
      fx: bf.x,
      fz: bf.z,
      charge: b.kind === "cortadora" && b.state === 1,
      ram: ctx.weapons.some((w) => w.id === "lanza" && w.evolved),
    };
    Object.assign(
      ctx.input,
      m.botSteer(
        { pos: { x: 0, z: 0 }, root: { forward: f }, body: { getLinearVelocity: () => v } },
        ctx.enemies.filter((e) => !e.def.boss).map((e) => L(e.pos)),
        [],
        lb,
        mz,
        ctx.gems.map((g) => L(g.m.position))
      ),
      { move: false, drift: false }
    );
  } else {
    Object.assign(
      ctx.input,
      m.botSteer(
        ctx.lead.car!,
        ctx.enemies.filter((e) => !e.def.boss).map((e) => e.pos),
        ctx.obstacles(),
        bb,
        zones,
        ctx.gems.map((g) => g.m.position)
      ),
      { move: false, drift: false }
    );
  }
  ctx.update(dt);
  pe._step(dt);
  ctx.tickFx(dt);
}

export async function initDevHooks(ctx: DevHooksContext): Promise<void> {
  const devReady = () => (/[?&]lazy\b/.test(location.search) ? Promise.resolve() : ctx.ensureAll());

  // Carga asíncrona de devbot para simulación y duelos de bot
  const botP = Promise.all([import("./devbot"), devReady()]).then(([m]) => {
    Object.assign(window, {
      __bot: m.bot,
      __sim: (secs: number, dt = 1 / 60) => {
        const w0 = performance.now(),
          end = ctx.time + secs;
        ctx.setSimulating(true);
        m.resetBot();
        while (ctx.time < end && (ctx.state === "play" || ctx.state === "level") && performance.now() - w0 < 35000) {
          botStep(m, dt, ctx);
        }
        ctx.setSimulating(false);
        ctx.$("levelup").classList.add("hidden");
        const boss = ctx.enemies.find((e) => e.def.boss);
        return `${ctx.fmt(ctx.time)} nv${ctx.level} hp${Math.round(ctx.lead.hp)}/${ctx.lead.maxHp} en${ctx.enemies.length} bajas ${ctx.kills} [${ctx.weapons.map((w) => w.id + (w.evolved ? "★" : w.lv)).join(" ")}] ${ctx.state}${boss ? ` JEFE ${boss.def.name} ${Math.round((boss.hp / boss.maxHp) * 100)}%` : ""}${ctx.state === "over" ? " · " + ctx.$("overTitle").textContent + ": " + ctx.$("overTxt").textContent : ""} · ${ctx.profile.climate.name}/${ctx.profile.plague.name} · semilla ${ctx.runSeed}${ctx.MOON.on ? " · " + ctx.goalStats() : ""} · tornillos ${Math.floor((ctx.runScrap + Math.floor(ctx.time / ctx.R.tornillos_div_tiempo) + Math.floor(ctx.kills * ctx.TOUGH.xp / ctx.R.tornillos_div_bajas)) * ctx.curseK)} · ${((performance.now() - w0) / 1000).toFixed(1)} s reales`;
      },
      __encBot: (o: { encores?: number; players?: number; follow?: boolean; pacts?: string[] | "all"; stay?: number; route?: string } = {}) => {
        const w0 = performance.now();
        let n = 0;
        if (!ctx.erun) {
          if (ctx.state !== "menu") ctx.toMenu();
          ctx.setEncore(true);
          ctx.setCoop(o.players ?? 1);
          ctx.encLog.length = 0;
          ctx.startRun();
          ctx.encLog.push({ loop: 0, stage: 0, t: 0 });
        }
        ctx.setSimulating(true);
        m.resetBot();
        while (ctx.erun && (ctx.state === "play" || ctx.state === "level") && ctx.erun.phase !== "won" && performance.now() - w0 < 30000) {
          const r = ctx.erun,
            pick = (i: 0 | 1 | 2) => ctx.applyCommand(ctx.lead.id, { k: "enc", i });
          if (ctx.state === "play") {
            if (r.phase === "stage" && r.landed) ctx.encApply(E.boarded(r));
            else if (r.phase === "teleporter") pick(r.stays < (o.stay ?? 0) ? 0 : 1);
            else if (r.phase === "pact") {
              const want = o.pacts === "all" ? null : o.pacts?.find((id) => !r.pacts.some((a: any) => a.id === id));
              if (want && r.offer && !r.offer.includes(want)) r.offer[0] = want;
              pick(o.pacts === "all" ? 0 : want ? (r.offer![0] === want ? 0 : 1) : 2);
            } else if (r.phase === "route") {
              const vi = o.route && o.route !== "rand" ? E.VARIANTS.findIndex((v) => v.name.toLowerCase().includes(o.route!.toLowerCase())) : -1;
              if (vi >= 0) r.routes![0] = vi;
              pick(o.route === "rand" ? (Math.random() < 0.5 ? 0 : 1) : 0);
            } else if (r.phase === "vote") pick(r.loop < (o.encores ?? 0) ? 0 : 1);
          }
          botStep(m, 1 / 60, ctx);
          if (o.follow && ++n % 45 === 0) for (const t of ctx.liveM()) ctx.matePlace(t);
          const l = ctx.encLog[ctx.encLog.length - 1];
          if (ctx.erun && (ctx.erun.loop !== l.loop || ctx.erun.stage !== l.stage)) ctx.encLog.push({ loop: ctx.erun.loop, stage: ctx.erun.stage, t: +(ctx.time + ctx.encPrior).toFixed(1) });
        }
        ctx.setSimulating(false);
        ctx.$("levelup").classList.add("hidden");
        const r = ctx.erun;
        return {
          done: !r || ctx.state === "over" || r.phase === "won",
          state: ctx.state,
          won: r?.phase === "won",
          loop: r?.loop,
          stage: r?.stage,
          phase: r?.phase,
          t: +(ctx.time + ctx.encPrior).toFixed(1),
          hp: Math.round(ctx.lead.hp),
          maxHp: ctx.lead.maxHp,
          level: ctx.level,
          kills: ctx.kills,
          log: ctx.encLog,
          weapons: ctx.weapons.map((w) => w.id + (w.evolved ? "★" : w.lv)),
          cause: ctx.state === "over" ? ctx.$("overTxt").textContent : "",
          real: +((performance.now() - w0) / 1000).toFixed(1),
        };
      },
      __play: (seed = 1) => {
        if (ctx.state !== "menu") ctx.toMenu();
        ctx.setForceSeed(seed);
        ctx.startRun();
        ctx.setForceSeed(0);
        return ctx.runSeed;
      },
      __team: () => ({ level: ctx.level, weapons: ctx.weapons.map((w) => [w.id, w.lv, w.evolved]), passives: ctx.passives }),
      __bossDuel: (kind: Kind, o: { seed?: number; god?: boolean; adds?: number; max?: number; team?: number | DuelTeam; dt?: number } = {}) => {
        const w0 = performance.now(),
          dt = o.dt ?? 1 / 60,
          seed = o.seed ?? 1,
          tm = typeof o.team === "object" ? o.team : DUEL_TEAMS[o.team ?? seed % DUEL_TEAMS.length];
        if (ctx.state !== "menu") ctx.toMenu();
        ctx.setForceSeed(seed);
        ctx.startRun();
        ctx.setForceSeed(0);
        ctx.setGod(!!o.god);
        ctx.setDuel(o.adds ?? 100);
        for (const w of ctx.weapons) w.dispose();
        ctx.setWeapons(
          tm.weapons.map(([id, lv, evolved]) => {
            const w = ctx.makeWeapon(id);
            w.lv = lv;
            w.evolved = evolved;
            return w;
          })
        );
        ctx.setPassives({ ...tm.passives });
        ctx.setLevel(tm.level);
        ctx.recompute();
        ctx.lead.hp = ctx.lead.maxHp;
        ctx.setTime(600);
        ctx.setBossIdx(ctx.RUN_BOSSES.length);
        ctx.setSwarmT(Infinity);
        ctx.setGroupT(Infinity);
        ctx.setChestT(Infinity);
        ctx.setBallT(Infinity);
        ctx.evtPre.boss = new Set(ctx.RUN_BOSSES.map((_, i) => i));
        ctx.setFinalKind(kind);
        ctx.spawnEnemy(kind, ctx.spawnPoint(ctx.lead.car!.pos, 30, 36));
        const boss = ctx.enemies[ctx.enemies.length - 1],
          t0 = ctx.time,
          lim = t0 + (o.max ?? 180);
        ctx.setSimulating(true);
        m.resetBot();
        while ((ctx.state === "play" || ctx.state === "level") && ctx.time < lim && performance.now() - w0 < 60000) {
          botStep(m, dt, ctx);
        }
        ctx.setSimulating(false);
        ctx.setDuel(-1);
        ctx.setGod(false);
        ctx.$("levelup").classList.add("hidden");
        return {
          kind,
          seed: ctx.runSeed,
          segundos: +(ctx.time - t0).toFixed(1),
          ganó: boss.hp <= 0,
          vidaRestante: Math.max(0, Math.round(boss.hp)),
          auto: Math.round(ctx.lead.hp),
          real: +((performance.now() - w0) / 1000).toFixed(2),
        };
      },
    });
  });


  // Hooks globales de depuración y pruebas
  Object.assign(window, {
    __enc: {
      mate: () => {
        const mate = ctx.others()[0];
        return (
          mate && {
            lead: ctx.lead.id,
            hp: Math.round(ctx.lead.hp),
            mateHp: Math.round(mate.hp),
            mateUp: !!mate.car,
            dist: mate.car ? +ctx.hd(mate.car.pos, ctx.lead.car!.pos).toFixed(1) : null,
            weapons: mate.weapons.length,
            cams: ctx.scene.activeCameras?.length ?? 1,
            all: ctx.others().map((x) => ({ pn: x.id, hp: Math.round(x.hp), up: !!x.car })),
          }
        );
      },
      hurt: (n: number, who = 1) => {
        if (ctx.players.length === 1) return "sin J2";
        const player = ctx.players.find((x) => x.id === who);
        if (!player) return "no está";
        player.hp -= n;
        return who;
      },
      info: () =>
        ctx.erun && {
          ...ctx.erun,
          variant: E.variantOf(ctx.erun)?.name ?? null,
          pace: ctx.paceS,
          time: +ctx.time.toFixed(1),
          prior: Math.round(ctx.encPrior),
          seed: ctx.runSeed,
          enemies: ctx.enemies.length,
          tag: E.tag(ctx.erun),
          ask: E.ask(ctx.erun),
          boss: ctx.enemies.find((e) => e.def.boss)?.kind ?? null,
        },
      land: () => {
        if (!ctx.erun) return "sin ENCORE";
        ctx.erun.stageT = E.ENC.teleS - 0.01;
        ctx.encApply(E.tick(ctx.erun, 0.02));
        return ctx.erun.phase;
      },
      board: () => {
        if (ctx.erun) ctx.encApply(E.boarded(ctx.erun));
        return ctx.erun?.phase;
      },
      pick: (i: 0 | 1) => {
        ctx.applyCommand(ctx.lead.id, { k: "enc", i });
        return ctx.erun?.phase;
      },
      tick: (secs: number) => {
        if (ctx.erun) ctx.encApply(E.tick(ctx.erun, secs));
        return ctx.erun?.phase;
      },
      tele: (who = 1) => {
        const c = ctx.players.find((x) => x.id === who)?.car;
        if (!c) return false;
        rocketForce(c.pos, 0, 0);
        return true;
      },
      goto: (kind: "cofre" | "maquina" = "cofre", i = 0) => {
        const p = ctx.shopAt(kind, i);
        return !!(p && ctx.lead.car && ctx.carPlace(onFloor(p.clone(), ctx.lead.car.def.size[1] / 2 + 0.3), p.add(ctx.lead.car.root.forward)));
      },
      jump: (loop: number, stage: number, route: number | null = null) => {
        if (!ctx.erun) return "sin ENCORE";
        ctx.erun.loop = loop;
        ctx.erun.stage = stage;
        ctx.erun.route = route;
        ctx.erun.phase = "stage";
        ctx.erun.stageT = 0;
        ctx.encApply("advance");
        return E.zoneOf(ctx.erun);
      },
      free: () =>
        ctx.goalBlips().map((p) => ({
          x: +p.x.toFixed(1),
          z: +p.z.toFixed(1),
          gap: +Math.min(...ctx.obstacles().map((b) => Math.hypot(p.x - b.x, p.z - b.z) - b.r)).toFixed(1),
        })),
      evo: (id: WeaponId = "lanza") => {
        const w = ctx.makeWeapon(id);
        w.lv = 5;
        ctx.setWeapons(ctx.weapons.filter((x) => x.id !== id).concat(w));
        ctx.passives[WEAPONS[id].evo] = 1;
        ctx.recompute();
        return ctx.evoOffer(ctx.weapons, ctx.passives)?.kind ?? null;
      },
      scrap: (n?: number) => {
        if (n !== undefined) ctx.setRunScrap(ctx.runScrap + n - ctx.GOAL_IO.scrap());
        return ctx.GOAL_IO.scrap();
      },
      shop: (k: "cofre" | "maquina" = "cofre", who = 0) => {
        const c = who ? ctx.players.find((x) => x.id === who)?.car : ctx.lead.car;
        if (!c) return false;
        ctx.setRunScrap(Math.max(ctx.runScrap, 999));
        return ctx.shopDev(k, c.pos);
      },
    },
    __net: {
      info: () => ({
        state: ctx.state,
        net: ctx.net && { host: ctx.net.host, code: ctx.net.code },
        bytes: ctx.netBytes,
        cards: ctx.state === "level" || ctx.netLv ? { by: ctx.netLv ? null : ctx.cardBy, n: ctx.offers.length, sub: ctx.$("luSub").textContent } : null,
        level: ctx.level,
        votes: ctx.votes.size,
        shots: ctx.netPools.j.filter((m: any) => m.isEnabled()).length + ctx.netPools.w.filter((m: any) => m.isEnabled()).length,
        status: ctx.$("netStatus").textContent,
        phase: ctx.erun?.phase ?? null,
        time: +ctx.time.toFixed(2),
        enemies: ctx.enemies.length,
        buf: ctx.netBuf.length,
        netIn: ctx.netIn,
        p: ctx.players.map((pl) => ({ id: pl.id, hp: Math.round(pl.hp), pos: pl.car ? [+pl.car.pos.x.toFixed(2), +pl.car.pos.z.toFixed(2)] : null })),
        e0: ctx.enemies[0] ? [+ctx.enemies[0].pos.x.toFixed(2), +ctx.enemies[0].pos.z.toFixed(2)] : null,
      }),
    },
    __tick: (n: number) => {
      const g = ctx.engine.getDeltaTime;
      ctx.engine.getDeltaTime = () => 1000 / 60;
      for (let i = 0; i < n; i++) {
        ctx.engine.beginFrame();
        ctx.scene.render();
        ctx.engine.endFrame();
      }
      ctx.engine.getDeltaTime = g;
    },
    __killAll: () =>
      ctx.enemies.forEach((e) => {
        if (!e.def.boss) e.hp = 0;
      }),
    __time: (s: number) => ctx.setTime(s),
    __xp: (n: number) => ctx.gainXp(n),
    __god: () => ctx.setGod(true),
    __w: (id: string, lv = 1, evolved = false) => {
      const w = ctx.makeWeapon(id as WeaponId);
      w.lv = lv;
      w.evolved = evolved;
      ctx.setWeapons(ctx.weapons.filter((x) => x.id !== id).concat(w));
      ctx.recompute();
      return ctx.weapons.map((x) => x.id + x.lv + (x.evolved ? "E" : ""));
    },
    __abil: (id?: AbilityId) => {
      if (!ctx.lead.car || ctx.state !== "play") return "sin partida";
      if (id) {
        ctx.setAbil(id);
        ctx.setAbilLv(ctx.save.abilLv[id] ?? 0);
      }
      ctx.setAbilCd(0);
      ctx.useAbility(ctx.lead.car);
      return ctx.abil;
    },
    __endless: () => {
      ctx.goEndless();
      return { endless: ctx.endless, next: ctx.RUN_BOSSES.at(-1) };
    },
    __dmg: () => {
      const r = JSON.stringify(ctx.dmgBy);
      for (const k in ctx.dmgBy) delete ctx.dmgBy[k];
      return r;
    },
    __out: () => JSON.stringify(Object.fromEntries(Object.entries(ctx.dmgOut).map(([k, v]) => [k, Math.round(v)]))),
    __outro: () => {
      ctx.setGod(false);
      ctx.setRevives(0);
      ctx.lead.hp = -1;
      if (!Object.keys(ctx.dmgBy).length) Object.assign(ctx.dmgBy, { hormiga: 68, cucaracha: 42, escupidora: 25 });
      if (ctx.state === "pause") ctx.resume();
      ctx.$("levelup").classList.add("hidden");
      ctx.setState("play");
    },
    __killBoss: () =>
      ctx.enemies.forEach((e) => {
        if (e.def.boss) e.hp = 0;
      }),
    __info: () =>
      ctx.state === "duel"
        ? { state: ctx.state, ...ctx.duelM!.duelDev.info(), fps: ctx.engine.getFps() }
        : ctx.state === "match3"
          ? { state: ctx.state, ...ctx.m3M?.match3Dev.info(), fps: ctx.engine.getFps() }
          : {
              state: ctx.state,
              time: ctx.time,
              level: ctx.level,
              hp: ctx.lead.hp,
              enemies: ctx.enemies.length,
              gems: ctx.gems.length,
              weapons: ctx.weapons.map((w) => w.id + w.lv),
              fps: ctx.engine.getFps(),
              abil: ctx.abil,
              abilCd: ctx.abilCd,
              abilOn: ctx.abilOn,
              worldK: ctx.worldK,
              stun: ctx.enemies.filter((e) => e.stun > 0).length,
              driveMul: ctx.driveMul,
              endless: ctx.endless,
              next: ctx.RUN_BOSSES[ctx.bossIdx],
            },
    __car: () => ctx.lead.car && { p: ctx.lead.car.pos, f: ctx.lead.car.root.forward },
    __look: ctx.look,
    __cfg: (o: Record<string, unknown> = {}) => {
      const { preset, ...rest } = o;
      Object.assign(ctx.save, preset ? PRESETS_DEV[preset as keyof typeof PRESETS_DEV] : {}, rest);
      ctx.save.preset = presetOf(ctx.save);
      ctx.applySettings();
      return { preset: ctx.save.preset, aa: ctx.save.aa, ...gfxInfo() };
    },
    __lab: (
      o: {
        climate?: string;
        t?: number;
        boss?: boolean;
        back?: number;
        up?: number;
        look?: Parameters<typeof ctx.look>[0];
        frames?: number;
        rain?: boolean;
      } = {}
    ) => {
      if (!ctx.bichosOk) return "espera a __ready (la precarga sigue)";
      if (ctx.state !== "menu") ctx.toMenu();
      ctx.startRun();
      ctx.setGod(true);
      ctx.LAB.on = true;
      ctx.LAB.back = o.back ?? 15;
      ctx.LAB.up = o.up ?? 13;
      ctx.$("hint").classList.add("hidden");
      const k = CLIMATES.find((c) => c.id === o.climate);
      if (k) ctx.profile.climate = k;
      ctx.LAB.t = o.t ?? 1;
      ctx.setCycleS(-1);
      if (o.rain) {
        ctx.profile.rainAt = 0;
        ctx.rainWet(0.8);
      }
      if (o.look) ctx.look(o.look);
      const kinds = (Object.keys(DEF) as Kind[]).filter((x) => o.boss || !DEF[x].boss);
      const f = ctx.lead.car!.root.forward,
        r = new B.Vector3(f.z, 0, -f.x);
      kinds.forEach((kd, i) =>
        ctx.spawnEnemy(
          kd,
          ctx.lead.car!.pos
            .add(f.scale(8 + (i % 2) * 5))
            .addInPlace(r.scale((i - (kinds.length - 1) / 2) * 5.5))
            .addInPlace(new B.Vector3(0, 1, 0))
        )
      );
      for (let i = 0; i < (o.frames ?? 90); i++) {
        ctx.engine.beginFrame();
        ctx.scene.render();
        ctx.engine.endFrame();
      }
      ctx.$("banner").classList.add("hidden");
      return `lab: ${ctx.profile.climate.name} · ${kinds.join(",")}`;
    },
    __spawn: (kd: Kind, dist = 20) => {
      ctx.LAB.on = false;
      const f = ctx.lead.car!.root.forward;
      ctx.spawnEnemy(kd, ctx.lead.car!.pos.add(f.scale(dist)).addInPlace(new B.Vector3(0, 1, 0)));
      return ctx.enemies.length;
    },
    __minis: (a: Kind, b: Kind) => {
      ctx.RUN_BOSSES[0][1] = a;
      ctx.RUN_BOSSES[1][1] = b;
    },
    __scene: ctx.scene,
    __ready: ctx.ensureAll,
    __loadTimes: ctx.times,
    __glbStats: ctx.glbStats,
    __ants: (n = 300) => {
      const f = ctx.lead.car!.root.forward,
        r = new B.Vector3(f.z, 0, -f.x),
        w = Math.ceil(Math.sqrt(n));
      for (let i = 0; i < n; i++)
        ctx.spawnEnemy(
          "hormiga",
          ctx.lead.car!.pos
            .add(f.scale(6 + Math.floor(i / w) * 1.8))
            .addInPlace(r.scale((i % w - w / 2) * 1.5))
            .addInPlace(new B.Vector3(0, 0.4, 0))
        );
      return ctx.enemies.length;
    },
    __carObj: () => ctx.lead.car,
    __luna: {
      ship: (id: ShipId = "nodriza") => {
        if (!ctx.lead.car || !ctx.MOON.on) return "sin luna";
        shipsClear();
        const f = flatL(ctx.lead.car.root.forward, ctx.lead.car.pos).normalize();
        shipSpawn(id, at(ctx.lead.car.pos, f.x * 14, 0, f.z * 14), ctx.time, true);
        return "ok";
      },
      crater: (r = 7, depth = 2.6, dist = 12) => {
        if (!ctx.lead.car || !ctx.MOON.on) return "sin luna";
        const f = flatL(ctx.lead.car.root.forward, ctx.lead.car.pos).normalize();
        deform(at(ctx.lead.car.pos, f.x * dist, 0, f.z * dist), r, depth);
        return "ok";
      },
      go: (where: "oscuro" | "sol" | "tierra" | [number, number, number] = "oscuro", faceSun = false) => {
        if (!ctx.lead.car || !ctx.MOON.on) return "sin luna";
        const d = (
          Array.isArray(where)
            ? new B.Vector3(...where)
            : where === "oscuro"
              ? ctx.SUN_DIR.scale(-1).addInPlace(new B.Vector3(0.25, 0.2, 0))
              : where === "tierra"
                ? new B.Vector3(0, 1, 0).addInPlace(ctx.EARTH_DIR.scale(-0.66))
                : ctx.SUN_DIR.add(B.Vector3.Up())
        ).normalize();
        const aim = faceSun ? ctx.SUN_DIR : Array.isArray(where) ? new B.Vector3(0, 0, 1) : where === "tierra" ? ctx.EARTH_DIR : where === "sol" ? ctx.SUN_DIR.scale(-1) : ctx.SUN_DIR;
        const p = ctx.moonPlace(d, aim);
        return { p, alt: alt(p) };
      },
      ring: (n = 12, r = 22, kind: Kind = "hormiga") => {
        if (!ctx.lead.car) return 0;
        for (let i = 0; i < n; i++)
          ctx.spawnEnemy(
            kind,
            ctx.MOON.on
              ? ringAt(ctx.lead.car.pos, (i / n) * Math.PI * 2, r)
              : ctx.lead.car.pos.add(new B.Vector3(Math.cos((i / n) * 6.28) * r, 1, Math.sin((i / n) * 6.28) * r))
          );
        return ctx.enemies.length;
      },
      meteor: (n = 12) => lunaDev.meteors(n),
      erupt: () => (ctx.lead.car ? lunaDev.erupt(ctx.lead.car.pos, ctx.camYaw) : "sin auto"),
      sky: () => ({ sol: skyVisible(ctx.SUN_DIR, ctx.cam), tierra: skyVisible(ctx.EARTH_DIR, ctx.cam) }),
      astro: (sun = true) => {
        if (!ctx.lead.car || !ctx.MOON.on) return "sin luna";
        skyLaunch(sun, ctx.lead.car.pos);
        return skyInfo();
      },
      info: () => ({
        on: ctx.MOON.on,
        alt: ctx.lead.car ? alt(ctx.lead.car.pos) : null,
        up: ctx.lead.car ? upAt(ctx.lead.car.pos) : null,
        enemies: ctx.enemies.length,
        spits: ctx.spits.length,
      }),
      clear: () => {
        for (const e of ctx.enemies) if (!e.def.boss) e.hp = -1e9;
        return ctx.enemies.length;
      },
      killOne: (kind: Kind) => {
        const e = ctx.enemies.find((x) => x.kind === kind && x.hp > 0);
        if (e) ctx.damage(e, 1e5);
        return !!e;
      },
      wound: (f = 0.5) => {
        for (const e of ctx.enemies) if (e.hp > 0) e.hp = e.maxHp * f;
        return ctx.enemies.length;
      },
      goal: (kind: "celdas" | "antena" = "celdas", dist = 16) => {
        if (!ctx.lead.car || !ctx.MOON.on) return "sin luna";
        const f = flatL(ctx.lead.car.root.forward, ctx.lead.car.pos);
        goalForce(kind, ctx.lead.car.pos, dist, Math.atan2(f.z, f.x));
        return "ok";
      },
      rocket: (dist = 16) => {
        if (!ctx.lead.car || !ctx.MOON.on) return "sin luna";
        const f = flatL(ctx.lead.car.root.forward, ctx.lead.car.pos);
        rocketForce(ctx.lead.car.pos, dist, Math.atan2(f.z, f.x));
        return "ok";
      },
      worm: (dist = 7) => {
        if (!ctx.lead.car || !ctx.MOON.on) return "sin luna";
        const f = flatL(ctx.lead.car.root.forward, ctx.lead.car.pos).normalize();
        ctx.spawnEnemy("gusano", onFloor(at(ctx.lead.car.pos, f.x * dist + f.z * 10, 0, f.z * dist - f.x * 10), 0));
        const e = ctx.enemies[ctx.enemies.length - 1];
        e.hp = e.maxHp = 1e6;
        wormForce(e, onFloor(at(ctx.lead.car.pos, f.x * dist, 0, f.z * dist), 0));
        return "ok";
      },
      row: (kinds: Kind[] = [...ALIENS], dist = 10, sep = 3.2, tough = true) => {
        if (!ctx.lead.car || !ctx.MOON.on) return "sin luna";
        const f = flatL(ctx.lead.car.root.forward, ctx.lead.car.pos).normalize(),
          n0 = ctx.enemies.length;
        kinds.forEach((k, i) => {
          const x = (i - (kinds.length - 1) / 2) * sep;
          ctx.spawnEnemy(k, onFloor(at(ctx.lead.car!.pos, f.x * dist + f.z * x, 0, f.z * dist - f.x * x), 0.5));
        });
        if (tough) for (const e of ctx.enemies.slice(n0)) e.hp = e.maxHp = 1e6;
        return ctx.enemies.length;
      },
    },
  });

  // Atajos por URL search (?lab y ?encore)
  if (location.search.includes("lab")) {
    (window as unknown as { __lab(o: object): void }).__lab({
      climate: new URLSearchParams(location.search).get("climate") ?? undefined,
      t: Number(new URLSearchParams(location.search).get("t") ?? 1),
      boss: location.search.includes("boss"),
      rain: location.search.includes("rain"),
    });
  }

  if (/[?&]encore\b/.test(location.search)) {
    if (ctx.state === "menu") {
      ctx.setCoop(ctx.isTouch ? 1 : Math.min(4, Math.max(1, Number(new URLSearchParams(location.search).get("players")) || 1)));
      ctx.startRun();
    }
  }
}
