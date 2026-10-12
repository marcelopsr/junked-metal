import * as B from "@babylonjs/core";
import { Car, drive } from "./car";
import { makeWeapon, mountFor, type Weapon, type PStats } from "./weapons";
import { danoRecibido } from "./run";
import { alignYaw, alt, at, flatL, hflat, moonCar, onFloor, teleport, upAt, upv, W, yawOf } from "./moon";
import { setSplit, G } from "./render";
import { setDrawDist } from "./world";
import { FX, debris } from "./fx";
import { SFX } from "./sfx";
import { coopSkip, pads, pollInput, pollMate, pollPad } from "./input";
import { BAL } from "./balance";
import type { AbilityId } from "./abilities";
import type { Net } from "./net";

const R = BAL.ritmo;

export const NO_IN = { throttle: 0, steer: 0, boost: false, drift: false, ability: false, jump: false, moveX: 0, moveY: 0, move: false };
export type PlayerInput = typeof NO_IN;

export type Player = {
  id: number;
  in: typeof NO_IN;
  car: Car | null;
  hp: number;
  maxHp: number;
  boost: number;
  fs: number;
  touch: number;
  jumpCd: number;
  coyote: number;
  cam: B.FreeCamera;
  h: B.Vector3;
  up: B.Vector3;
  tgt: B.Vector3;
  weapons: Weapon[];
  sig: string;
};

export const newPlayer = (id: number, c: B.FreeCamera, defaultInput: typeof NO_IN = NO_IN): Player => ({
  id,
  in: defaultInput,
  car: null,
  hp: 100,
  maxHp: 100,
  boost: 100,
  fs: 0,
  touch: 0,
  jumpCd: 0,
  coyote: 0,
  cam: c,
  h: new B.Vector3(0, 0, 1),
  up: new B.Vector3(0, 1, 0),
  tgt: new B.Vector3(),
  weapons: [],
  sig: "",
});

export interface CoopContext {
  readonly coop: number;
  readonly lead: Player;
  setLead: (p: Player) => void;
  players: Player[];
  others: () => Player[];
  liveM: () => Player[];
  scene: B.Scene;
  cam: B.FreeCamera;
  camH: B.Vector3;
  camUp: B.Vector3;
  camTarget: B.Vector3;
  readonly st: PStats;
  readonly god: boolean;
  save: any;
  input: typeof NO_IN;
  readonly weapons: Weapon[];
  setWeapons: (w: Weapon[]) => void;
  carOpts: () => Record<string, unknown>;
  newPlayer?: (id: number, cam: B.FreeCamera) => Player;
  getNet: () => Net | null;
  setSpawnN: (n: number) => void;
  getShieldM?: () => B.Mesh | null;
  clearShieldM: () => void;
  clearPreview: () => void;
  setLastHpFrac: (f: number) => void;
  setCamYaw: (y: number) => void;
  banner: (t: string, sec?: number) => void;
  hurt: (n: number, continuous: boolean, src: string) => void;
  readonly abil: AbilityId;
  readonly abilOn: number;
  carJump: (c: Car, r: { fs: number; slope?: number }) => void;
  cams?: Record<string, { back: number; up: number; look: number }>;
}

let ctx!: CoopContext;

export function initCoop(c: CoopContext) {
  ctx = c;
}

export const TOP = new B.Viewport(0, 0.5, 1, 0.5);
export const BOTTOM = new B.Viewport(0, 0, 1, 0.5);
const _camM2 = new B.Matrix();
export const QUAD = [
  new B.Viewport(0, 0.5, 0.5, 0.5),
  new B.Viewport(0.5, 0.5, 0.5, 0.5),
  new B.Viewport(0, 0, 0.5, 0.5),
  new B.Viewport(0.5, 0, 0.5, 0.5),
];

export const vpOf = (pn: number) => (ctx.coop === 2 ? (pn === 1 ? TOP : BOTTOM) : QUAD[pn - 1]);
export const mateColor = (pn: number) =>
  pn === 3 ? "#2ea043" : pn === 4 ? "#e8e8e8" : (ctx.save.paint || "").toLowerCase() === "#1f6feb" ? "#f2c230" : "#1f6feb";

export function mateCar(m: Player) {
  m.car = new Car(ctx.scene, ctx.save.car, { ...ctx.carOpts(), paint: mateColor(m.id) });
  m.hp = m.maxHp = ctx.lead.maxHp;
  m.boost = 100;
  m.fs = 0;
  m.touch = 0;
  m.jumpCd = m.coyote = 0;
  m.sig = "";
  m.car.setMass(m.car.def.mass * ctx.st.mass);
  mateArm(m);
}

export function mateStart(n: number) {
  ctx.setSpawnN(0);
  for (let pn = 2; pn <= n; pn++) {
    const c2 = new B.FreeCamera(`cam${pn}`, ctx.cam.position.clone(), ctx.scene);
    c2.minZ = ctx.cam.minZ;
    c2.maxZ = ctx.cam.maxZ;
    const m = ctx.newPlayer ? ctx.newPlayer(pn, c2) : newPlayer(pn, c2, NO_IN);
    ctx.players.push(m);
    mateCar(m);
    matePlace(m);
    if (!ctx.getNet()) setSplit(c2, true);
  }
  mateViews();
  if (n > 2) setDrawDist(G.draw);
}

export function mateViews() {
  if (ctx.getNet()) {
    ctx.scene.activeCameras = null;
    ctx.scene.activeCamera = ctx.cam;
    return;
  }
  for (const p of ctx.players) p.cam.viewport = vpOf(p.id);
  ctx.scene.activeCameras = [ctx.cam, ...ctx.others().map((m) => m.cam)];
}

export function mateClear() {
  if (ctx.players.length === 1) return;
  const quad = ctx.players.length > 2,
    j1 = ctx.players[0];
  for (const m of ctx.others()) {
    for (const w of m.weapons) w.dispose();
    m.car?.dispose();
    if (ctx.scene.activeCameras?.includes(m.cam)) setSplit(m.cam, false);
    m.cam.dispose();
  }
  if (ctx.lead !== j1) {
    j1.car = ctx.lead.car;
    j1.hp = ctx.lead.hp;
    j1.maxHp = ctx.lead.maxHp;
    j1.boost = ctx.lead.boost;
  }
  j1.cam = ctx.cam;
  j1.in = ctx.input;
  j1.weapons = [];
  j1.sig = "";
  ctx.players.length = 1;
  ctx.setLead(j1);
  ctx.cam.viewport = new B.Viewport(0, 0, 1, 1);
  ctx.scene.activeCameras = null;
  ctx.scene.activeCamera = ctx.cam;
  if (quad) setDrawDist(G.draw);
}

export function matePlace(m: Player) {
  const c = m.car!,
    p = onFloor(at(ctx.lead.car!.pos, [4, -4, 8][ctx.others().indexOf(m)] ?? 4, 0, 0), c.def.size[1] / 2 + 0.3);
  c.root.position.copyFrom(p);
  c.root.rotationQuaternion = alignYaw(p, yawOf(ctx.lead.car!.root.forward, ctx.lead.car!.pos));
  c.body.setLinearVelocity(B.Vector3.Zero());
  c.body.setAngularVelocity(B.Vector3.Zero());
  moonCar(c.body, upAt(p));
  teleport(c.body);
  const f = flatL(ctx.lead.car!.root.forward, ctx.lead.car!.pos);
  m.up.copyFrom(upAt(p));
  m.h.copyFrom(W(f.x, 0, f.z, p).normalize());
  m.cam.position.copyFrom(p).addInPlace(m.h.scale(-15)).addInPlace(m.up.scale(13));
  m.tgt.copyFrom(p);
}

export function mateArm(m: Player) {
  const sig = ctx.weapons.map((w) => w.id + w.lv + (w.evolved ? "E" : "")).join();
  if (!m.car || sig === m.sig) return;
  for (const w of m.weapons) {
    w.dispose();
    w.mount?.dispose();
  }
  m.weapons = ctx.weapons.map((w) => {
    const x = makeWeapon(w.id);
    x.lv = w.lv;
    x.evolved = w.evolved;
    x.mount = mountFor(x.id, m.car!);
    x.mount.scaling.setAll(1 + (x.lv - 1) * 0.06 + (x.evolved ? 0.25 : 0));
    return x;
  });
  m.sig = sig;
}

export function mateSync(m: Player) {
  if (m.car) {
    m.hp = Math.min(ctx.lead.maxHp, m.hp + Math.max(0, ctx.lead.maxHp - m.maxHp));
    m.car.setMass(m.car.def.mass * ctx.st.mass);
    mateArm(m);
  }
  m.maxHp = ctx.lead.maxHp;
}

export function mateHurt(m: Player | undefined, n: number) {
  if (!ctx.god && !(ctx.abil === "escudo" && ctx.abilOn > 0) && m?.car) {
    m.hp -= danoRecibido(n) * (1 - ctx.st.armor);
  }
}

export const hurtP = (p: Player | undefined, n: number, continuous: boolean, src: string) =>
  p === ctx.lead ? ctx.hurt(n, continuous, src) : mateHurt(p, n);

export function mateBoom(c: Car) {
  FX.explosion(c.pos.add(upv(c.pos, 0.5)), 2);
  debris(c.pos, ctx.save.paint || "#d62828", 14, 9, 0.9);
  SFX.explosion();
}

export function mateDown(m: Player) {
  mateBoom(m.car!);
  for (const w of m.weapons) w.dispose();
  if (ctx.getShieldM?.()?.parent === m.car!.root) ctx.clearShieldM();
  m.weapons = [];
  m.sig = "";
  m.car!.dispose();
  m.car = null;
  m.hp = 0;
  ctx.banner(`J${m.id} FUERA HASTA EL PRÓXIMO ESCENARIO`, 2.5);
}

export function mateLead() {
  const m = ctx.liveM()[0],
    d = ctx.lead,
    dead = d.car!;
  mateBoom(dead);
  for (const w of ctx.weapons) w.dispose();
  ctx.setWeapons(m.weapons);
  m.weapons = [];
  m.sig = "";
  if (ctx.getShieldM?.()?.parent === dead.root) ctx.clearShieldM();
  dead.dispose();
  ctx.clearPreview();
  d.car = null;
  d.hp = 0;
  m.boost = d.boost;
  const p = ctx.cam.position.clone();
  ctx.cam.position.copyFrom(m.cam.position);
  m.cam.position.copyFrom(p);
  const h = ctx.camH.clone(),
    u = ctx.camUp.clone(),
    t = ctx.camTarget.clone();
  ctx.camH.copyFrom(m.h);
  ctx.camUp.copyFrom(m.up);
  ctx.camTarget.copyFrom(m.tgt);
  m.h.copyFrom(h);
  m.up.copyFrom(u);
  m.tgt.copyFrom(t);
  [d.cam, m.cam] = [m.cam, d.cam];
  [d.h, m.h] = [m.h, d.h];
  [d.up, m.up] = [m.up, d.up];
  [d.tgt, m.tgt] = [m.tgt, d.tgt];
  ctx.setLead(m);
  ctx.setLastHpFrac(ctx.lead.hp / ctx.lead.maxHp);
  ctx.setCamYaw(yawOf(ctx.camH, ctx.lead.car!.pos));
  mateViews();
  ctx.banner(`J${d.id} FUERA HASTA EL PRÓXIMO ESCENARIO`, 2.5);
}

export function mateRevive(m: Player) {
  if (!m.car) mateCar(m);
  matePlace(m);
}

export function mateInput() {
  pollInput({ skip: coopSkip(), pad: pads()[0] ?? null });
  const by = [{ ...ctx.input }, pollMate()];
  for (let pn = 3; pn <= ctx.coop; pn++) by.push(pollPad(pn - 1));
  for (const p of ctx.players) p.in = by[p.id - 1];
  Object.assign(ctx.input, ctx.lead.in);
}

export function mateTick(m: Player, dt: number) {
  const c = m.car!,
    i = m.in;
  const boosting = i.boost && m.boost > R.turbo_umbral && i.throttle >= 0;
  m.boost = boosting ? m.boost - R.turbo_gasto * ctx.st.boostUse * dt : Math.min(100, m.boost + ctx.st.boostRegen * dt);
  const maxSpeed = c.def.speed * ctx.st.speedMul * (boosting ? R.turbo_vel : 1);
  const r = drive(c.body, c.root, dt, {
    throttle: boosting ? 1 : i.throttle,
    steer: i.steer,
    speed: maxSpeed,
    accel: c.def.accel * (boosting ? R.turbo_acel : 1),
    turn: c.def.turn * (i.drift ? R.derrape_giro : 1),
    grip: i.drift ? R.derrape_agarre : c.def.grip,
  });
  c.animate(dt, i.steer, r.fs, maxSpeed);
  m.fs = r.fs;
  m.jumpCd = Math.max(0, m.jumpCd - dt);
  m.coyote = r.grounded ? R.salto_coyote_s : Math.max(0, m.coyote - dt);
  if (i.jump && (r.grounded || m.coyote > 0) && m.jumpCd <= 0) {
    m.jumpCd = R.salto_cd_s;
    m.coyote = 0;
    ctx.carJump(c, r);
  }
  if (alt(c.pos) < -5) m.hp = 0;
  m.hp = Math.min(ctx.lead.maxHp, m.hp + ctx.st.regen * dt);
  c.wear(Math.max(0, m.hp / ctx.lead.maxHp));
}

export function mateCam(m: Player, dt: number) {
  const c = m.car!,
    k = 1 - Math.exp(-5 * dt);
  B.Vector3.LerpToRef(m.up, upAt(c.pos), 1 - Math.exp(-8 * dt), m.up).normalize();
  let hy = yawOf(hflat(m.h, c.pos), c.pos);
  const t = yawOf(c.root.forward, c.pos);
  hy += Math.atan2(Math.sin(t - hy), Math.cos(t - hy)) * (1 - Math.exp(-2 * dt));
  m.h.copyFrom(W(Math.sin(hy), 0, Math.cos(hy), c.pos));
  const P = ctx.cams?.actual ?? { back: 15, up: 13, look: 3 },
    z = ctx.save.zoom;
  B.Vector3.LerpToRef(m.cam.position, c.pos.subtract(m.h.scale(P.back * z)).addInPlace(m.up.scale(P.up * z)), k, m.cam.position);
  B.Vector3.LerpToRef(m.tgt, c.pos.add(m.h.scale(P.look)), k * 1.5, m.tgt);
  m.cam.fov = ctx.cam.fov;
  B.Matrix.LookAtLHToRef(m.cam.position, m.tgt, m.up, _camM2);
  _camM2.invert();
  B.Quaternion.FromRotationMatrixToRef(_camM2, (m.cam.rotationQuaternion ??= new B.Quaternion()));
}
