import * as B from "@babylonjs/core";
import { ACH, type AchId } from "./achievements";
import { fmt, openOver, persist, reset, today, type RunRec, type Save } from "./menu";
import type { Profile } from "./run";
import { bannerClear } from "./ui";
import { getNet, netEnd } from "./net_client";
import { engineStop, music, rainSfx, moonAmbience, encoreAmbience, SFX } from "./sfx";
import { fxSpeed, FX, debris } from "./fx";
import * as E from "./encore";
import { chestsOpened } from "./moon_goals";
import { track } from "./net";
import { ZONES, type ZoneId } from "./world";
import { CARS, CP } from "./car";
import { WEAPONS, type Weapon } from "./weapons";
import * as RR from "./rerun";
import { OUTRO_GUARD, OUTRO_S, OUTRO_SNAP, outroStatLine, outroUi, showPhoto, slowScale, snap } from "./replay";
import { cardBlob, sharePng, type Card } from "./share";
import { padPressed } from "./input";
import { upv } from "./moon";
import type { Player } from "./coop";
import type { Enemy } from "./enemies";

const $ = (id: string) => document.getElementById(id);

export interface OutroContext {
  save: Save;
  readonly erun: E.Run | null;
  readonly time: number;
  setTime: (t: number) => void;
  readonly encPrior: number;
  setEncPrior: (p: number) => void;
  readonly runSeed: number;
  setRunSeed: (s: number) => void;
  readonly daily: boolean;
  readonly dailyInfo: { date: string; seed: number } | null;
  readonly weeklyInfo?: { week: string; seed: number } | null;
  readonly bank: { t: number; scrap: number; dmg: Record<string, number>; rec?: RunRec } | null;
  setBank: (b: { t: number; scrap: number; dmg: Record<string, number>; rec?: RunRec }) => void;
  readonly endless: boolean;
  readonly lead: Player;
  readonly players?: Player[];
  readonly weapons: Weapon[];
  readonly dmgBy: Record<string, number>;
  readonly dmgOut: Record<string, number>;
  readonly profile: Profile;
  readonly kills: number;
  readonly level: number;
  readonly simulating: boolean;
  readonly god: boolean;
  readonly labOn: boolean;
  readonly state: string;
  setState: (s: any) => void;
  readonly zoneId: ZoneId;
  readonly runDist: number;
  grossScrap: () => number;
  readonly encExtra: number;
  readonly encG: number;
  readonly curseK: number;
  readonly pfx: { scrap: number; [k: string]: unknown };
  readonly bestStreak: number;
  readonly bestHit: number;
  readonly bestDriveMul: number;
  readonly bossKills: number;
  setWorldK: (k: number) => void;
  resetAbil: () => void;
  addRunScrap: (s: number) => void;
  banner: (t: string, sec?: number) => void;
  launchRun: (daily?: boolean, netOnline?: boolean, coopN?: number, onReady?: () => void) => void;
  toMenu: () => void;
  setForceSeed: (s: number) => void;
  scene: B.Scene;
  engine: B.AbstractEngine;
  enemies: Enemy[];
  spits: Array<{ m: B.InstancedMesh; [k: string]: unknown }>;
  clearSpits: () => void;
  addCamYaw: (dy: number) => void;
}

let ctx!: OutroContext;

// ---------- Logros de partida ----------
export let stageHurt = false;
export const setStageHurt = (v: boolean) => {
  stageHurt = v;
};
export let runAch: string[] = [];
export const resetRunAch = () => {
  runAch = [];
};
export let hitAt = 0;
export const setHitAt = (v: number) => {
  hitAt = v;
};
export const recordHit = (time: number) => {
  hitAt = time;
  stageHurt = true;
};

export function grant(id: AchId) {
  if (ctx.simulating || ctx.labOn || ctx.god || ctx.save.ach.includes(id)) return;
  ctx.save.ach.push(id);
  const a: { name: string; reward?: string; scrap?: number } = ACH[id];
  if (a.scrap) ctx.addRunScrap(a.scrap);
  if (a.reward?.startsWith("part:") && !ctx.save.unlocked.includes(a.reward)) ctx.save.unlocked.push(a.reward);
  runAch.push(a.name);
  persist();
  setTimeout(() => ctx.state === "play" && ctx.banner(`LOGRO · ${a.name.toUpperCase()}`, 2.5), 1500);
}

// ---------- endRun ----------
export function endRun(win: boolean, why: string) {
  if (ctx.erun) {
    ctx.setTime(ctx.time + ctx.encPrior);
    ctx.setEncPrior(0);
    ctx.setRunSeed(ctx.erun.seed);
  }
  if (win) grant(`gana_${ctx.save.car}` as AchId);
  if (win && ctx.daily) grant("diario");
  if (ctx.time >= 600 && !ctx.erun) grant("diez");

  const lasted = ctx.endless ? Math.floor(ctx.time - (ctx.bank?.t ?? 0)) : 0;
  if (ctx.endless) why += ` Modo sin fin: ${fmt(lasted)} más${lasted > ctx.save.endless ? ", récord nuevo" : ""}.`;
  ctx.setWorldK(1);
  ctx.resetAbil();
  fxSpeed(1);
  if (runAch.length) why += ` Logros: ${runAch.join(", ")}.`;

  const net = getNet();
  if (net?.host) {
    net.send({ t: "end" }, true);
    setTimeout(netEnd, 1000);
  }

  ctx.setState(ctx.simulating ? "over" : "outro");
  engineStop();
  music("over");
  rainSfx(0);
  moonAmbience(false);
  encoreAmbience(null);

  const gross = ctx.grossScrap(),
    earned = Math.floor((gross + (ctx.erun ? ctx.encExtra + E.scrapExtra(gross, ctx.encG, ctx.pfx.scrap) : 0)) * ctx.curseK * CP.scrap * (ctx.erun ? 1 : ctx.pfx.scrap));
  const eb = ctx.save.encore.best,
    encBetter =
      !!ctx.erun &&
      (ctx.erun.loop > eb.loop ||
        (ctx.erun.loop === eb.loop && (ctx.erun.stage > eb.stage || (ctx.erun.stage === eb.stage && Math.floor(ctx.time) > eb.t))));
  const prevBest = ctx.erun ? eb.t : ctx.save.best,
    record = ctx.erun ? encBetter : Math.floor(ctx.time) > ctx.save.best;
  const topHit = (Object.entries(ctx.dmgBy).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "accidente").replace(/[^\p{L}\d .,-]/gu, "").slice(0, 40);
  const enc = ctx.erun ? E.report(ctx.erun, { chests: chestsOpened(), cause: win ? "Venció al jefe del FINAL ACT" : `Daño de ${topHit}` }) : undefined;
  const rec: RunRec = { t: Math.floor(ctx.time), kills: ctx.kills, lv: ctx.level, seed: ctx.runSeed, win };

  if (!ctx.simulating && !ctx.labOn) {
    track("run_end", {
      mode: ctx.erun ? "encore" : ctx.daily ? "diario" : "supervivencia",
      win,
      t: Math.floor(ctx.time),
      kills: ctx.kills,
      lv: ctx.level,
      seed: ctx.runSeed,
      ...(ctx.endless ? { endless: true, lasted } : {}),
      ...(ctx.daily && ctx.dailyInfo?.seed === ctx.runSeed ? { daily: ctx.dailyInfo.date } : {}),
      ...(ctx.weeklyInfo?.seed === ctx.runSeed ? { weekly: ctx.weeklyInfo.week } : {}),
      car: ctx.save.car,
      cause: win ? "" : topHit,
      ...(ctx.erun ? { loop: ctx.erun.loop, stage: ctx.erun.stage } : {}),
    });
  }

  if (!ctx.simulating && !ctx.labOn) {
    ctx.save.scrap += earned - (ctx.bank?.scrap ?? 0);
    ctx.save.endless = Math.max(ctx.save.endless, lasted);
    if (!ctx.erun) ctx.save.best = Math.max(ctx.save.best, Math.floor(ctx.time));

    const S = ctx.save.stats,
      zr = S.zone[ctx.zoneId] ?? { t: 0, kills: 0 };
    if (ctx.erun) {
      const E2 = ctx.save.encore;
      E2.runs++;
      if (win) E2.wins++;
      E2.lastLoop = ctx.erun.loop;
      E2.lastCause = win ? "" : topHit;
      if (encBetter) E2.best = { loop: ctx.erun.loop, stage: ctx.erun.stage, t: Math.floor(ctx.time) };
      for (const id of ctx.erun.found) if (!E2.secrets.includes(id)) E2.secrets.push(id);
    } else if (!ctx.bank) {
      S.runs++;
      if (win) S.wins++;
    }

    if (ctx.erun) for (const id of E.endAch(ctx.erun, win, ctx.save.encore.secrets)) grant(id as AchId);

    S.time += ctx.time - (ctx.bank?.t ?? 0);
    S.dist += ctx.runDist;
    for (const [src, v] of Object.entries(ctx.dmgOut)) S.dmg[src] = (S.dmg[src] ?? 0) + v - (ctx.bank?.dmg[src] ?? 0);
    if (!ctx.erun) S.zone[ctx.zoneId] = { t: Math.max(zr.t, Math.floor(ctx.time)), kills: Math.max(zr.kills, ctx.kills) };

    if (ctx.daily) {
      ctx.save.daily = { day: today(), best: Math.max(ctx.save.daily.day === today() ? ctx.save.daily.best : 0, Math.floor(ctx.time)) };
    }
    if (!ctx.erun) {
      ctx.save.runs = [...ctx.save.runs.filter((r: RunRec) => r !== ctx.bank?.rec), rec].sort((a, b) => b.t - a.t || b.kills - a.kills).slice(0, 5);
    }
    persist();
  }

  $("hud")?.classList.add("hidden");
  bannerClear();
  const more = win && !ctx.endless && !ctx.erun;
  const newBank = { t: ctx.time, scrap: earned, dmg: { ...ctx.dmgOut }, rec };
  ctx.setBank(newBank);
  const evos = ctx.weapons.filter((w) => w.evolved).map((w) => WEAPONS[w.id].evoName);
  const res = {
    win,
    title: ctx.endless ? "FIN DEL SIN FIN" : undefined,
    why,
    time: ctx.time,
    kills: ctx.kills,
    level: ctx.level,
    scrap: earned,
    record,
    more,
    dmg: { ...ctx.dmgOut },
    hurt: { ...ctx.dmgBy },
    seed: `${ctx.profile.climate.name} · ${ctx.profile.plague.name} · Semilla ${ctx.runSeed}`,
    prevBest,
    bestStreak: ctx.bestStreak,
    bestHit: Math.round(ctx.bestHit),
    bestDrive: ctx.bestDriveMul,
    bossKills: ctx.bossKills,
    evos,
    ach: [...runAch],
    car: ctx.save.car,
    enc,
  };
  RR.recStop();
  if (ctx.simulating) {
    openOver(res);
    $("overReplay")?.classList.add("hidden");
  } else {
    startOutro(res);
  }
}

// ---------- Repetición tipo película (rerun.ts; la reproduce main.ts rpPlay) ----------
export const rp = RR.rp;

export function rpBar() {
  $("rpBar")?.classList.toggle("hidden", !rp.on);
  const s = $("rpSpeed");
  if (s) s.textContent = `x${rp.x}`;
}
/** HUD básico de la repetición: tiempo, bajas y nivel de la muestra. */
export function rpHud(t: number, kills: number, level: number) {
  const s = $("rpBar")?.querySelector("span");
  if (s) s.textContent = `REPETICIÓN · ${fmt(t)} · ${kills} bajas · Nv ${level}`;
}

export function rpStart() {
  if (!RR.rec.done || rp.on || ctx.state !== "over") return;
  Object.assign(rp, { on: true, t: 0, x: 1 });
  rp.en.clear();
  for (const e of ctx.enemies.splice(0)) e.dispose(); // la película pone sus propios enemigos
  ctx.scene.physicsEnabled = false;
  reset(null);
  rpBar();
}

export function rpEnd() {
  if (!rp.on) return;
  rp.on = false;
  for (const e of ctx.enemies.splice(0)) e.dispose();
  rp.en.clear();
  ctx.scene.physicsEnabled = true;
  rpBar();
  reset("over");
}

// ---------- Cierre en cámara lenta ----------
export let outroAt: B.Vector3 | null = null;
export const setOutroAt = (p: B.Vector3 | null) => {
  outroAt = p;
};
export let ts = 1;
export const setTs = (v: number) => {
  ts = v;
};
export let outroZ = 1;
export const setOutroZ = (v: number) => {
  outroZ = v;
};
export let outroT = 0;
export const setOutroT = (v: number) => {
  outroT = v;
};
export let outroSkip = false;
export const setOutroSkip = (v: boolean) => {
  outroSkip = v;
};
export let outroShot = false;
export const setOutroShot = (v: boolean) => {
  outroShot = v;
};
export type OutroResult = Parameters<typeof openOver>[0];
export let outroRes: OutroResult | null = null;
export const setOutroRes = (r: OutroResult | null) => {
  outroRes = r;
};

export function resetOutroState() {
  ts = 1;
  outroZ = 1;
  outroAt = null;
  outroT = 0;
  outroSkip = false;
  outroShot = false;
  outroRes = null;
}

export function startOutro(res: NonNullable<typeof outroRes>) {
  outroRes = res;
  outroT = 0;
  outroSkip = false;
  outroShot = false;
  ctx.scene.physicsEnabled = false;
  ctx.clearSpits();
  if (ctx.lead.hp <= 0 && ctx.lead.car) {
    FX.explosion(ctx.lead.car.pos.add(upv(ctx.lead.car.pos, 0.5)), 2);
    debris(ctx.lead.car.pos, ctx.save.paint || "#d62828", 14, 9, 0.9);
    SFX.explosion();
  }
  outroUi(
    true,
    outroStatLine({
      time: fmt(ctx.time),
      kills: ctx.kills,
      level: ctx.level,
      drive: res.bestDrive ?? 1,
      evos: res.evos ?? [],
    })
  );
}

export function outroTick(dt: number) {
  outroT += dt;
  if (outroT >= OUTRO_GUARD) {
    for (let i = 0; i < 12; i++) {
      if (i < 6 || i > 7) outroSkip ||= padPressed(i);
    }
  }
  ts = slowScale(outroT);
  const sdt = dt * ts;
  for (const e of ctx.enemies) {
    e.update(sdt, ctx.lead.car!.pos);
    e.animate(sdt);
  }
  (ctx.scene.getPhysicsEngine() as unknown as { _step(d: number): void })._step(sdt);
  fxSpeed(ts);
  outroZ = 1 - 0.5 * Math.min(1, outroT / 3);
  ctx.addCamYaw(dt * 0.45);
  if (!outroShot && outroT >= OUTRO_SNAP) {
    outroShot = true;
    snap(ctx.engine);
  }
  if (outroT >= OUTRO_S || outroSkip) endOutro();
}

export function endOutro() {
  ctx.setState("over");
  ts = 1;
  outroZ = 1;
  outroAt = null;
  fxSpeed(1);
  outroUi(false);
  ctx.scene.physicsEnabled = true;
  openOver(outroRes!);
  $("overReplay")?.classList.toggle("hidden", !RR.rec.done); // película: siempre fiel (graba lo visible)
  lastCard = { kills: ctx.kills, time: fmt(ctx.time), level: ctx.level, car: CARS[ctx.lead.car!.kind].name, win: outroRes!.win };
  void showPhoto({
    zone: ZONES[ctx.zoneId].name,
    time: fmt(ctx.time),
    kills: ctx.kills,
    car: CARS[ctx.lead.car!.kind].name,
    win: outroRes!.win,
  });
  outroRes = null;
}

let lastCard: Card | null = null;

export const skipOutro = (e: Event) => {
  if (
    ctx &&
    ctx.state === "outro" &&
    outroT >= OUTRO_GUARD &&
    !(e instanceof KeyboardEvent && (e.repeat || /^(Shift|Control|Alt|Meta)/.test(e.code)))
  ) {
    outroSkip = true;
  }
};

let outroListenersBound = false;

export function initOutro(c: OutroContext) {
  ctx = c;

  for (const k of ["rey", "cortadora", "tarantula", "gato", "payaso"] as const) {
    if (ctx.save.slain[k] && !ctx.save.ach.includes(k)) ctx.save.ach.push(k);
  }
  if (ctx.save.best >= 600 && !ctx.save.ach.includes("diez")) ctx.save.ach.push("diez");

  const overReplay = $("overReplay");
  if (overReplay) overReplay.onclick = rpStart;
  const overShare = $("overShare");
  if (overShare) overShare.onclick = async () => {
    const b = lastCard && (await cardBlob(lastCard));
    if (b) void sharePng(b, `junked_metal_${Date.now()}.png`);
  };
  const rpSpeed = $("rpSpeed");
  if (rpSpeed) rpSpeed.onclick = () => {
    rp.x = rp.x === 1 ? 2 : 1;
    rpBar();
  };
  const rpExit = $("rpExit");
  if (rpExit) rpExit.onclick = () => {
    rpEnd();
  };

  if (!outroListenersBound && typeof addEventListener !== "undefined") {
    outroListenersBound = true;
    addEventListener("keydown", skipOutro);
    addEventListener("pointerdown", skipOutro);
  }
}
