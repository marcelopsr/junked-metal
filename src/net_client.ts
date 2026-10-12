import * as B from "@babylonjs/core";
import {
  cleanCode,
  cfLoginUrl,
  getToken,
  hostRoom,
  joinRoom,
  espectar,
  LOGIN_URL,
  loginKey,
  loginUrl,
  NET_HOST,
  redeemInvite,
  setToken,
  takeToken,
  track,
  type Msg,
  type Net,
} from "./net";
import { Enemy, type Kind } from "./enemies";
import type { Weapon, Offer } from "./weapons";
import type { Car } from "./car";
import type * as E from "./encore";
import { ZONES } from "./world";
import { template, sph } from "./models";
import { pbr } from "./render";
import { showOffers } from "./ui";
import { SFX } from "./sfx";

const $ = (id: string) => document.getElementById(id)!;

export const NO_IN = { throttle: 0, steer: 0, boost: false, drift: false, ability: false, jump: false, moveX: 0, moveY: 0, move: false };
export type NetInput = typeof NO_IN;

export type Cmd =
  | { k: "card"; i: number }
  | { k: "reroll" }
  | { k: "enc"; i: 0 | 1 | 2 }
  | { k: "buy"; scrap: number; hpFrac: number };

export type PSnap = [number, ...number[]]; // [id] = caído; [id, x, y, z, qx, qy, qz, qw, vx, vy, vz, hp, maxHp]
export type ESnap = [number, Kind, number, number, number, number, number, number, number, number, number]; // id, tipo, pos, quat, vida, vida máx.
export type Snap = {
  T: number;
  z: string;
  xp: number;
  lv: number;
  sc: number;
  run: E.Run | null;
  p: PSnap[];
  e: ESnap[];
  j: number[];
  w: number[];
}; // j/w: proyectiles de bichos y de armas, [x, y, z] planos a 0,1 m

export interface NetPlayer {
  id: number;
  in: typeof NO_IN;
  car: Car | null;
  hp: number;
  maxHp: number;
  cam: B.FreeCamera;
  weapons: Weapon[];
  [k: string]: unknown;
}

export interface NetClientContext {
  lead: NetPlayer;
  setLead: (p: any) => void;
  players: NetPlayer[];
  enemies: Enemy[];
  setEnemies: (e: Enemy[]) => void;
  weapons: Weapon[];
  setWeapons: (w: Weapon[]) => void;
  spits: Array<{ m: B.InstancedMesh; [k: string]: unknown }>;
  scene: B.Scene;
  engine: B.AbstractEngine;
  state: string;
  setState: (s: any) => void;
  time: number;
  setTime: (t: number) => void;
  level: number;
  setLevel: (lv: number) => void;
  xp: number;
  setXp: (xp: number) => void;
  runScrap: number;
  setRunScrap: (s: number) => void;
  erun: E.Run | null;
  setErun: (r: E.Run | null) => void;
  zoneId: string;
  setZone: (z: string, build?: boolean) => void;
  setMoon: (m: boolean) => void;
  setCycleS: (c: number) => void;
  offers: Offer[];
  setOffers: (o: Offer[]) => void;
  offerTitle: string;
  offerSel: number;
  setOfferSel: (s: number) => void;
  save: any;
  input: typeof NO_IN;
  applyCommand: (playerId: number, cmd: Cmd) => void;
  launchRun: (daily?: boolean, netOnline?: boolean, coopN?: number, onReady?: () => void) => void;
  toMenu: () => void;
  banner: (t: string, sec?: number) => void;
  openOffers: (list: Offer[], title: string, keep?: boolean) => void;
  mateClear: () => void;
  newSeed: () => number;
  reset: (mode?: any) => void;
  spitTpl: () => B.Mesh;
}

export const NET_HZ = 15, NET_DELAY = 100;
export const NET_PROJ = 60; // tope por tipo de proyectil y snapshot (los más allá del radio no van)

let ctx!: NetClientContext;

let net: Net | null = null, netSeed = 0, netT = 0, spectating = false; // spectating: cliente que solo mira (cámara en J1, sin enviar inputs ni comandos)
let netIn = { ...NO_IN };
const netIds = new WeakMap<Enemy, number>();
let netNext = 1;
let netBytes = 0; // solo dev: bytes de snapshot enviados (JSON), para medir kB/s en test:net

const netBuf: { at: number; s: Snap; e: Map<number, ESnap> }[] = [];
const netE = new Map<number, Enemy>();
let netLv = false; // cliente: cartas a la vista (las elige quien diga el anfitrión)
let cardBy = 1, cardTurn = 0; // R6c: id de quien elige las cartas abiertas; online se alterna en cada oferta (nivel o cofre), empieza el anfitrión

const netPools: Record<"j" | "w", B.InstancedMesh[]> = { j: [], w: [] };

export const getNet = () => net;
export const getNetSeed = () => netSeed;
export const isSpectating = () => spectating;
export const getSpectating = () => spectating;
export const getNetIn = () => netIn;
export const getNetBytes = () => netBytes;
export const getNetBuf = () => netBuf;
export const getNetLv = () => netLv;
export const getCardBy = () => cardBy;
export const setCardBy = (id: number) => { cardBy = id; };
export const advanceCardBy = (keep: boolean): number => {
  if (!keep) cardBy = net?.host && ctx.players[1] && cardTurn++ % 2 ? ctx.players[1].id : ctx.players[0].id;
  return cardBy;
};
export const getOffers = () => ctx.offers;
export const getNetOffers = () => ctx.offers;
export const getNetPools = () => netPools;

const q1 = (n: number) => Math.round(n * 10) / 10, q2 = (n: number) => Math.round(n * 100) / 100, q3 = (n: number) => Math.round(n * 1000) / 1000;
const quatOf = (n: B.TransformNode) => n.rotationQuaternion ?? B.Quaternion.FromEulerVector(n.rotation);
const bool = (v: unknown) => v === true;
const axis = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0);

/** Proyectiles de armas (aproximado): todo arreglo de un arma con { m: InstancedMesh } (balas, trompos, olas...). */
function weaponShots(out: number[], near: (v: B.Vector3) => boolean) {
  for (const w of [...ctx.weapons, ...ctx.players.flatMap((m) => (m === ctx.lead ? [] : m.weapons ?? []))])
    for (const v of Object.values(w)) if (Array.isArray(v)) for (const o of v) {
      if (out.length >= NET_PROJ * 3) return;
      const m = (o as { m?: unknown })?.m;
      if (m instanceof B.InstancedMesh && m.isEnabled() && near(m.position)) out.push(q1(m.position.x), q1(m.position.y), q1(m.position.z));
    }
}

export function netSnap(dt?: number) {
  if (dt !== undefined) {
    if ((netT -= dt) > 0) return;
    netT = 1 / NET_HZ;
  }
  if (!net) return;
  const c2 = ctx.players[1]?.car?.pos ?? ctx.lead.car?.pos, R2 = 70 * 70, e: ESnap[] = [];
  for (const en of ctx.enemies) {
    if (e.length >= 120 || !c2 || B.Vector3.DistanceSquared(en.pos, c2) > R2) continue; // solo lo que el cliente puede ver cerca de su auto
    let id = netIds.get(en); if (!id) netIds.set(en, (id = netNext++));
    const q = quatOf(en.node);
    e.push([id, en.kind, q2(en.pos.x), q2(en.pos.y), q2(en.pos.z), q3(q.x), q3(q.y), q3(q.z), q3(q.w), Math.ceil(en.hp), Math.ceil(en.maxHp)]);
  }
  const p = ctx.players.map((pl): PSnap => {
    const c = pl.car; if (!c) return [pl.id];
    const q = quatOf(c.root), v = c.body.getLinearVelocity();
    return [pl.id, q2(c.pos.x), q2(c.pos.y), q2(c.pos.z), q3(q.x), q3(q.y), q3(q.z), q3(q.w), q2(v.x), q2(v.y), q2(v.z), Math.ceil(pl.hp), pl.maxHp];
  });
  const near = (v: B.Vector3) => !!c2 && B.Vector3.DistanceSquared(v, c2) <= R2, j: number[] = [], w: number[] = [];
  for (const sp of ctx.spits) if (j.length < NET_PROJ * 3 && near(sp.m.position)) j.push(q1(sp.m.position.x), q1(sp.m.position.y), q1(sp.m.position.z));
  weaponShots(w, near);
  const msg = { t: "s", s: { T: q2(ctx.time), z: ctx.zoneId, xp: ctx.xp, lv: ctx.level, sc: ctx.runScrap, run: ctx.erun, p, e, j, w } satisfies Snap };
  if (import.meta.env.DEV) netBytes += JSON.stringify(msg).length;
  net.send(msg);
}

/** Mensajes del cliente al anfitrión: se validan (frontera de confianza). */
function netHostMsg(m: Msg) {
  if (m.t === "i" && m.i && typeof m.i === "object") {
    const i = m.i as Record<string, unknown>;
    netIn = { throttle: axis(i.throttle), steer: axis(i.steer), moveX: axis(i.moveX), moveY: axis(i.moveY), boost: bool(i.boost), drift: bool(i.drift), ability: bool(i.ability), jump: bool(i.jump), move: bool(i.move) };
  } else if (m.t === "c" && ctx.players[1]) { // R6c: votos del teleportador, cartas (en su turno) y re-sorteo; las compras siguen del anfitrión
    const c = m.c as Cmd;
    if (c?.k === "enc" && (c.i === 0 || c.i === 1 || c.i === 2)) ctx.applyCommand(ctx.players[1].id, { k: "enc", i: c.i });
    else if (c?.k === "card" && Number.isInteger(c.i) && c.i >= 0 && c.i < ctx.offers.length && ctx.state === "level") ctx.applyCommand(ctx.players[1].id, { k: "card", i: c.i });
    else if (c?.k === "reroll") ctx.applyCommand(ctx.players[1].id, { k: "reroll" });
  }
}

// Proyectiles en el cliente: un pool de instancias por tipo, sin interpolar (aproximado, 15 Hz).
const netShotTpl = () => template("netshot", () => [sph(0.35, pbr("netshot", { color: "#ffd23f", emissive: "#a07000" }), [0, 0, 0])]);

function netShots(k: "j" | "w", xs: number[] = []) {
  const pool = netPools[k], n = Math.min(xs.length / 3, NET_PROJ);
  while (pool.length < n) pool.push((k === "j" ? ctx.spitTpl() : netShotTpl()).createInstance("ns" + k));
  pool.forEach((m, i) => { m.setEnabled(i < n); if (i < n) m.position.set(xs[i * 3], xs[i * 3 + 1], xs[i * 3 + 2]); });
}

function netClientMsg(m: Msg) {
  if (m.t === "go" && typeof m.seed === "number") { netSeed = m.seed; ctx.launchRun(false, true, 2, netClientBegin); }
  else if (m.t === "s") { const s = m.s as Snap; netBuf.push({ at: performance.now(), s, e: new Map(s.e.map((x) => [x[0], x])) }); if (netBuf.length > 8) netBuf.shift(); }
  else if (m.t === "end") { netEnd(); netBack("La partida terminó en el anfitrión."); }
  else if (m.t === "lv" && Array.isArray(m.o) && ctx.state === "net") { // R6c: cartas abiertas en el anfitrión; elige el cliente si by es su id
    const list = m.o as Offer[], mine = m.by === ctx.lead.id, title = String(m.title);
    ctx.setOffers(list); ctx.setOfferSel(0); netLv = true;
    const show = () => showOffers(title, list, 0, (i) => (mine ? ctx.applyCommand(ctx.lead.id, { k: "card", i }) : show()), undefined, mine ? `Turno de elegir: J${ctx.lead.id}` : `Elige J${m.by}`);
    show(); SFX.levelUp();
  } else if (m.t === "lvx") { netLv = false; $("levelup").classList.add("hidden"); }
}

/** Cliente: ya armada la run con la semilla del anfitrión, pasa a dibujar lo que llega. J2 guía la cámara principal. */
function netClientBegin() {
  const [j1, j2] = ctx.players;
  if (!spectating) { [j1.cam, j2.cam] = [j2.cam, j1.cam]; ctx.setLead(j2); }
  for (const w of ctx.weapons) w.dispose(); ctx.setWeapons([]); // las armas son del anfitrión
  ctx.setState("net"); ctx.scene.physicsEnabled = false; netBuf.length = 0;
}

const _nq = new B.Quaternion(), _nv = new B.Vector3();

export function netClientTick() {
  if (net && !spectating) net.send({ t: "i", i: { ...ctx.input } }); // input del cliente cada cuadro, canal no fiable
  if (!netBuf.length) return;
  const rt = performance.now() - NET_DELAY;
  let i = netBuf.length - 1; while (i > 0 && netBuf[i - 1].at > rt) i--;
  const b = netBuf[i], a = netBuf[Math.max(0, i - 1)], k = b === a || b.at === a.at ? 1 : Math.max(0, Math.min(1, (rt - a.at) / (b.at - a.at))), ext = b.at < rt ? Math.min(0.2, (rt - b.at) / 1000) : 0;
  const s = b.s;
  ctx.setTime(s.T); ctx.setXp(s.xp); ctx.setLevel(s.lv); ctx.setRunScrap(s.sc);
  if (s.z !== ctx.zoneId && s.z in ZONES) { ctx.setZone(s.z); ctx.setMoon(s.z === "luna"); ctx.setCycleS(-1); } // Contenido 3: el anfitrión cambió de zona (escenario terrestre o vuelta a la luna)
  if (s.run) { ctx.setErun(s.run); for (const p of s.run.pacts) p.left ??= Infinity; } // JSON: Infinity llega como null
  for (const ps of s.p) {
    const pl = ctx.players.find((x) => x.id === ps[0]), c = pl?.car; if (!pl || !c) continue;
    c.root.setEnabled(ps.length > 1);
    if (ps.length === 1) { pl.hp = 0; continue; }
    const pa = a.s.p.find((x) => x[0] === ps[0]), A = pa && pa.length > 1 ? pa : ps;
    B.Vector3.LerpToRef(_nv.set(A[1], A[2], A[3]), new B.Vector3(ps[1], ps[2], ps[3]), k, c.root.position);
    c.root.position.addInPlaceFromFloats(ps[8] * ext, ps[9] * ext, ps[10] * ext); // sin snapshot nuevo: sigue con su velocidad un rato
    B.Quaternion.SlerpToRef(_nq.set(A[4], A[5], A[6], A[7]), new B.Quaternion(ps[4], ps[5], ps[6], ps[7]), k, (c.root.rotationQuaternion ??= new B.Quaternion()));
    pl.hp = ps[11]; pl.maxHp = ps[12];
  }
  for (const [id, en] of netE) if (!b.e.has(id)) { en.dispose(); netE.delete(id); }
  for (const [id, x] of b.e) {
    let en = netE.get(id);
    if (!en || en.kind !== x[1]) { en?.dispose(); en = new Enemy(x[1], new B.Vector3(x[2], x[3], x[4]), 1); netE.set(id, en); }
    const y = a.e.get(id) ?? x;
    B.Vector3.LerpToRef(_nv.set(y[2], y[3], y[4]), new B.Vector3(x[2], x[3], x[4]), k, en.node.position);
    B.Quaternion.SlerpToRef(_nq.set(y[5], y[6], y[7], y[8]), new B.Quaternion(x[5], x[6], x[7], x[8]), k, (en.node.rotationQuaternion ??= new B.Quaternion()));
    en.hp = x[9]; en.maxHp = x[10];
    en.animate(ctx.engine.getDeltaTime() / 1000);
  }
  ctx.setEnemies([...netE.values()]); // radar y flechas del HUD
  netShots("j", s.j); netShots("w", s.w);
}

/** Cierra la conexión (sin avisar a nadie). Los bichos de muestra del cliente se van con clearRun (están en `enemies`). */
export function netEnd() {
  const n = net; net = null; netSeed = 0; spectating = false; netE.clear(); netBuf.length = 0; netLv = false;
  for (const k of ["j", "w"] as const) { for (const m of netPools[k]) m.dispose(); netPools[k] = []; }
  n?.close();
}

export function netStatus(t: string) { $("netStatus").textContent = t; }

/** Cliente: vuelve a la pantalla de ENCORE con el aviso. */
export function netBack(why: string) {
  if (ctx.state !== "menu") ctx.toMenu();
  ctx.reset("encore"); netStatus(why);
}

export async function netHost() {
  netEnd(); netStatus("Creando sala…");
  try {
    const n = (net = await hostRoom((code) => netStatus(`Sala ${code} · esperando al otro jugador`)));
    n.onMsg = netHostMsg;
    n.onClose = (why) => {
      if (net !== n) return;
      if (ctx.state === "menu") { netStatus(why); net = null; return; }
      ctx.mateClear(); net = null; ctx.banner("J2 DESCONECTADO · SE SIGUE EN SOLITARIO", 3); // el anfitrión sigue jugando solo
      if (ctx.state === "level" && cardBy !== ctx.players[0].id) { cardBy = ctx.players[0].id; ctx.openOffers(ctx.offers, ctx.offerTitle, true); } // le tocaba al J2: elige el anfitrión
    };
    await n.ready;
    if (net !== n) return;
    const seed = ctx.newSeed(); netSeed = seed;
    n.send({ t: "go", seed }, true);
    netStatus(`Sala ${n.code} · conectado`);
    ctx.launchRun(false, true, 2);
  } catch (e) { netStatus(`No se pudo crear la sala (${(e as Error).message}).`); net = null; }
}

export async function netJoin() {
  const code = cleanCode(($("netCode") as HTMLInputElement).value);
  if (code.length !== 6) { netStatus("El código tiene 6 caracteres."); return; }
  netEnd(); netStatus(`Conectando a ${code}…`);
  const n = (net = await joinRoom(code));
  n.onMsg = netClientMsg;
  n.onClose = (why) => { if (net !== n) return; netEnd(); netBack(why); };
  await n.ready;
  if (net === n) netStatus(`Conectado a ${code} · esperando la largada`);
}

export function initNetClient(c: NetClientContext) {
  ctx = c;

  addEventListener("mirar", async (e) => {
    const code = String((e as CustomEvent).detail ?? ""); if (!code) return;
    netEnd(); netStatus(`Conectando a ${code} (espectador)…`);
    try {
      const n = (net = await espectar(code)); spectating = true;
      n.onMsg = netClientMsg;
      n.onClose = (why) => { if (net !== n) return; netEnd(); netBack(why); };
      await n.ready;
      if (net === n) netStatus(`Mirando ${code} · esperando la largada`);
    } catch (err) { netEnd(); netStatus(`No se pudo mirar (${(err as Error).message}).`); }
  });

  // R6c: login del servidor propio (solo con VITE_NET_HOST): vuelve con #token=... y queda en localStorage
  if (NET_HOST) {
    if (takeToken()) netStatus("Sesión iniciada.");
    $("netLogin").onclick = () => location.assign(loginUrl());
    $("netCfLogin").onclick = () => location.assign(LOGIN_URL ? cfLoginUrl() : loginUrl());
    // Un solo estado a la vista: con sesión = "Online: sesión iniciada" + Cerrar sesión + salas; sin sesión = iniciar sesión (Cloudflare, o GitHub sin LOGIN_URL) y alternativas plegadas, sin botones de sala.
    const sess = () => {
      const on = !!getToken();
      $("netSession").textContent = on ? "Online: sesión iniciada" : "";
      for (const id of ["netSession", "netLogout", "netAcct", "netHost", "netCode", "netJoin", "netWatch"]) $(id).classList.toggle("hidden", !on);
      for (const id of ["netCfLogin", "netAlt"]) $(id).classList.toggle("hidden", on);
    };
    sess();
    track("session", { ua: navigator.userAgent.slice(0, 120), w: innerWidth, h: innerHeight, touch: matchMedia("(pointer: coarse)").matches });
    $("netKeyGo").onclick = async () => {
      const k = $("netKey") as HTMLInputElement;
      if (!k.value.trim()) { netStatus("Escribir la clave de grupo."); return; }
      try { await loginKey(k.value.trim()); k.value = ""; netStatus("Sesión iniciada."); } catch (e) { netStatus((e as Error).message); }
      sess();
    };
    void redeemInvite().then((m) => { if (m) { netStatus(m); sess(); } });
    $("netLogout").onclick = () => { setToken(""); netStatus("Sesión cerrada."); sess(); };
  }

  $("netHost").onclick = () => void netHost();
  $("netJoin").onclick = () => void netJoin();
}
