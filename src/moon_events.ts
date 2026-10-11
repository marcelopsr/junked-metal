import * as B from "@babylonjs/core";
import { BAL } from "./balance";
import { burst, debris, FX, mark } from "./fx";
import { template, sph, tor } from "./models";
import { applyClimate, pbr, shadows } from "./render";
import { rng } from "./rng";
import { SPACE, moonAmbience } from "./sfx";
import { banner } from "./ui";
import { arc, at, deform, hd, MOON, onFloor, orient, rel, ringAt, upAt } from "./moon";

// ---------- Eventos de la luna: lluvia de meteoritos y erupción / falla lunar (docs/LUNA.md, fase 2) ----------
// main.ts llama lunaEv() una vez por cuadro de update() (solo en la luna), evClimate() al aplicar el clima y evFog() tras moonTick().
// La jugabilidad (daño, cráteres, cuándo) corre también en __sim; lo visible y el sonido, solo si no se simula. Ritmo y daños: balance.json (ritmo, filas luna_*).
const R = BAL.ritmo;
const TAU = Math.PI * 2;

/** Lo que el evento necesita de main.ts (daño y sacudida viven allá). */
export type EvHooks = {
  hurt(n: number, continuous: boolean, src: string): void; // daño al auto (ya descuenta blindaje)
  blast(p: B.Vector3, r: number, dmg: number, src: string): void; // daño a los bichos dentro del radio
  shake(k: number): void;
  sim(): boolean;
};
let H: EvHooks;
export const evInit = (h: EvHooks) => { H = h; };

/** Paneo -1..1 de to visto desde from, en el marco local del auto (camYaw es el rumbo de la cámara en ese marco). Patio: la cuenta plana de siempre. Para las naves y aliens también. */
export function panTo(from: B.Vector3, to: B.Vector3, camYaw: number, range = 8) {
  const r = rel(to, from);
  return B.Scalar.Clamp((r.x * Math.cos(camYaw) - r.z * Math.sin(camYaw)) / range, -1, 1);
}

// ---------- Tinte rojo (reversible): se mezcla con el clima de la luna, nunca lo reemplaza ----------
type Clim = Parameters<typeof applyClimate>[0];
const RED = { sunColor: "#ff6b3d", amb: "#7a2a1c", ground: "#401208", fog: "#3a0a05", sky: ["#1c0402", "#40100a", "#6a2410", "#1c0603"] };
const mixHex = (a: string, b: string, k: number) => B.Color3.Lerp(B.Color3.FromHexString(a), B.Color3.FromHexString(b), k).toHexString();
let tintK = 0, tintTo = 0, tintStep = 0;
/** El clima k con el tinte actual (tinte 0 = el mismo objeto). */
export function evClimate(k: Clim): Clim {
  const f = tintK;
  if (f < 0.005) return k;
  return {
    ...k, sunColor: mixHex(k.sunColor, RED.sunColor, f), sunI: k.sunI * (1 + 0.15 * f), hemiI: k.hemiI * (1 + 0.6 * f), fog: k.fog * (1 + 0.3 * f),
    sky: k.sky.map((c, i) => mixHex(c, RED.sky[i], f)) as Clim["sky"], amb: mixHex(k.amb ?? k.sky[1], RED.amb, f), ground: mixHex(k.ground ?? "#1c1812", RED.ground, f),
  };
}
/** Tras moonTick(): la niebla (que moonTick pisa cada cuadro) también se tiñe. */
export function evFog(scene: B.Scene) {
  if (tintK < 0.005) return;
  B.Color3.LerpToRef(scene.fogColor, B.Color3.FromHexString(RED.fog), tintK * 0.8, scene.fogColor);
  scene.fogDensity *= 1 + 0.25 * tintK;
}

// ---------- Piezas visibles: instancias de plantillas, en pozas que se reciclan ----------
const pools: Record<string, B.InstancedMesh[]> = {};
function grab(name: string, tpl: () => B.Mesh) {
  const p = (pools[name] ??= []);
  let m = p.find((x) => !x.isEnabled());
  if (!m) { m = tpl().createInstance(name); m.isPickable = false; p.push(m); }
  m.setEnabled(true);
  return m;
}
const drop = (m: B.InstancedMesh | null) => m?.setEnabled(false);
const flat = (name: string, build: () => B.Mesh) => template(name, () => [build()]);
// Plato de radio 1 con y = -r²: escalado (s, s²/2R, s) sigue la curvatura de la luna (un disco plano de 9 m flotaría 0,7 m en el borde)
const disc = (mat: B.Material) => {
  const P: number[] = [], N: number[] = [], I: number[] = [], na = 28, nr = 6;
  for (let j = 0; j <= nr; j++) for (let i = 0; i <= na; i++) {
    const r = j / nr, a = (i / na) * TAU, x = r * Math.cos(a), z = r * Math.sin(a), l = Math.hypot(2 * x, 1, 2 * z);
    P.push(x, -r * r, z); N.push((2 * x) / l, 1 / l, (2 * z) / l);
    if (j < nr && i < na) { const k = j * (na + 1) + i; I.push(k, k + na + 2, k + 1, k, k + na + 1, k + na + 2); }
  }
  const d = new B.Mesh("s"), vd = new B.VertexData();
  Object.assign(vd, { positions: P, normals: N, indices: I }); vd.applyToMesh(d); d.material = mat;
  return d;
};
const glow = (key: string, hex: string, k = 1.6) => { const m = pbr(key, { color: hex, rough: 0.6, emissive: hex }); m.fogEnabled = false; m.emissiveIntensity = k; return m; };
const noShadow = (t: B.Mesh) => { shadows.removeShadowCaster(t); return t; };
const ringTpl = () => noShadow(template("lunaAnillo", () => [tor(2, 0.06, glow("lunaAviso", "#ff3b2e", 1.2), [0, 0, 0], undefined, 14)]));
const areaTpl = () => noShadow(flat("lunaArea", () => { const m = pbr("lunaAvisoArea", { color: "#ff3b2e", rough: 1, emissive: "#b01a10", alpha: 0.13 }); m.fogEnabled = false; m.zOffset = -4; m.disableDepthWrite = true; return disc(m); }));
const lavaTpl = () => noShadow(flat("lunaLava", () => { const m = glow("lunaLava", "#ff4a0f", 1.5); m.zOffset = -5; return disc(m); }));
const coreTpl = () => noShadow(flat("lunaLavaNucleo", () => { const m = glow("lunaLavaNucleo", "#ff9a2e", 1.7); m.zOffset = -6; return disc(m); }));
const rockTpl = () => noShadow(template("lunaMeteoro", () => [sph(1, glow("lunaMeteoroRoca", "#ff6a1f", 1.3), [0, 0, 0], [1, 0.9, 1], 4), sph(0.62, glow("lunaMeteoroNucleo", "#ffd166", 2.2), [0, 0.05, 0.2], undefined, 4)]));
const sag = (r: number) => (r * r) / (2 * MOON.R); // cuánto se aleja el piso de un plano tangente a r metros
/** Apoya un aro (el piso bajo su borde queda a ~lift) en el piso de p. */
function layRing(m: B.InstancedMesh, p: B.Vector3, lift: number, r: number) { onFloor(p, lift - sag(r), m.position); m.rotation.set(0, 0, 0); orient(m); m.scaling.set(r, 1, r); }
/** Apoya un plato (disc) de radio r con el centro a lift del piso de p; fixed: p ya es el punto exacto (el piso de abajo cambió por una deformación). */
function layDish(m: B.InstancedMesh, p: B.Vector3, lift: number, r: number, fixed = false) {
  if (fixed) m.position.copyFrom(p).addInPlace(upAt(p).scaleInPlace(lift)); else onFloor(p, lift, m.position);
  m.rotation.set(0, 0, 0); orient(m, p); m.scaling.set(r, Math.max(0.005, sag(r)), r);
}

// ---------- Estado ----------
type Met = { T: B.Vector3; S: B.Vector3; t: number; size: number; m: B.InstancedMesh | null; ring: B.InstancedMesh | null; area: B.InstancedMesh | null; whistled: boolean };
type Quake = { C: B.Vector3; top: B.Vector3; t: number; erupted: boolean; r: number; rMax: number; ring: B.InstancedMesh | null; area: B.InstancedMesh | null; lava: B.InstancedMesh | null; core: B.InstancedMesh | null; fxT: number; dmgT: number; blastT: number };
const mets: Met[] = [];
const smokes: { p: B.Vector3; left: number; t: number }[] = [];
let rain: { left: number; acc: number; rate: number } | null = null, quake: Quake | null = null;
let rainAt = -1, quakeAt = -1, rainPre = false, ambOn = false, now = 0;

/** Partida nueva (o fin): nada queda en pie. */
export function evReset() {
  for (const p of Object.values(pools)) for (const m of p) m.dispose();
  for (const k of Object.keys(pools)) delete pools[k];
  mets.length = smokes.length = 0;
  rain = quake = null; rainAt = quakeAt = -1; rainPre = ambOn = false;
  tintK = tintTo = 0; tintStep = 0;
  SPACE.lava(0); moonAmbience(false);
}

const warn = (tag: string, line: string, secs: number, tone: "warn" | "now") => banner(line, secs, { tag, ico: tone === "warn" ? "senal" : "jefe", tone });
const jitter = () => (rng() - 0.5) * 30;

function spawnMeteor(car: B.Vector3, vis: boolean) {
  const near = rng() < R.luna_meteoros_cerca_prob, a = rng() * TAU, d = near ? 3 + rng() * 6 : 9 + rng() * 26, size = 0.75 + rng() * 0.5;
  const T = ringAt(car, a, d, 0), b = Math.random() * TAU;
  const m: Met = { T, S: at(T, Math.cos(b) * 22, 48, Math.sin(b) * 22), t: 0, size, m: null, ring: null, area: null, whistled: false };
  if (vis) {
    m.ring = grab("lunaAnillo", ringTpl); m.area = grab("lunaArea", areaTpl);
    const r = R.luna_meteoro_radio * size;
    layRing(m.ring, T, 0.25, r); layDish(m.area, T, 0.2, r);
  }
  mets.push(m);
}

function landMeteor(m: Met, car: B.Vector3, carR: number, camYaw: number, vis: boolean) {
  const T = m.T, r = R.luna_meteoro_radio * m.size;
  deform(T, R.luna_meteoro_crater_r * m.size, R.luna_meteoro_crater_hondo * m.size);
  if (hd(car, T) < r + carR) H.hurt(R.luna_meteoro_dano, false, "meteorito");
  H.blast(T, r, R.luna_meteoro_dano_bicho, "meteoritos");
  if (smokes.length < 10) smokes.push({ p: onFloor(T, 0.4), left: R.luna_meteoro_humo_s, t: 0 });
  if (!vis) return;
  const p = onFloor(T, 0.5), dist = hd(car, T);
  FX.explosion(p, 2.2 * m.size);
  debris(T, "#7b7c80", 8, 9, 0.9);
  mark("scorch", T, Math.random() * 6, r * 0.9, 30);
  SPACE.meteorImpact(panTo(car, T, camYaw), dist, m.size);
  H.shake(0.55 * B.Scalar.Clamp(1 - dist / 28, 0, 1));
}

function startQuake(car: B.Vector3, camYaw: number, aviso: number) {
  const a = camYaw + (rng() - 0.5) * 1.2, C = onFloor(at(car, Math.sin(a) * R.luna_erupcion_dist, 0, Math.cos(a) * R.luna_erupcion_dist), 0);
  if (!H.sim()) warn("SISMO", "FALLA LUNAR · SUELO AGRIETADO · DESPEJAR EL ÁREA", 3.4, "warn");
  quake = { C, top: C, t: -aviso, erupted: false, r: 0, rMax: R.luna_erupcion_radio, ring: null, area: null, lava: null, core: null, fxT: 0, dmgT: 0, blastT: 0 };
  return quake;
}

const rp = (C: B.Vector3, rad: number) => { const a = Math.random() * TAU, d = rad * Math.sqrt(Math.random()); return onFloor(at(C, Math.cos(a) * d, 0, Math.sin(a) * d), 0.3); };

function tickQuake(q: Quake, dt: number, car: B.Vector3, carR: number, camYaw: number, vis: boolean) {
  const prevT = q.t; q.t += dt;
  const dist = hd(car, q.C), pan = panTo(car, q.C, camYaw);
  if (q.t < 0) { // la falla se agrieta: anillo pulsante en el límite y chispas por todo el suelo
    if (vis) {
      if (!q.ring) { q.ring = grab("lunaAnillo", ringTpl); q.area = grab("lunaArea", areaTpl); SPACE.rumble(pan, dist, -prevT + 0.5, 0.22); }
      const s = q.rMax * (1 + 0.03 * Math.sin(q.t * 9));
      layRing(q.ring, q.C, 0.25, s); layDish(q.area!, q.C, 0.2, q.rMax);
      if ((q.fxT -= dt) <= 0) { q.fxT = 0.12; FX.sparks(rp(q.C, q.rMax), 6); burst(rp(q.C, q.rMax), { n: 3, color: "#ff7a2a", color2: "#ffd166", size: [0.3, 0.7], power: [1, 3], life: [0.4, 0.8], gravity: 4 }); }
    }
    return;
  }
  if (!q.erupted) { // abre: boca hundida al centro y montículos alrededor (deform negativo = montículo)
    q.erupted = true; q.top = onFloor(q.C, 0); // el lago de lava queda a la altura del piso de antes de hundir la boca
    deform(q.C, 4.5, 1.0);
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + rng() * 0.6; deform(at(q.C, Math.cos(a) * q.rMax * 1.2, 0, Math.sin(a) * q.rMax * 1.2), 2.8, -0.9); }
    if (vis) {
      warn("SISMO", "ERUPCIÓN · GAS Y LAVA EN EXPANSIÓN", 2.6, "now");
      drop(q.ring); drop(q.area); q.ring = q.area = null;
      q.lava = grab("lunaLava", lavaTpl); q.core = grab("lunaLavaNucleo", coreTpl);
      SPACE.eruptionBlast(pan, dist); H.shake(0.8 * B.Scalar.Clamp(1 - dist / 40, 0.15, 1));
    }
  }
  const dur = R.luna_erupcion_dur_s, cool = 3;
  q.r = q.t < dur ? q.rMax * (1 - (1 - q.t / dur) ** 2) : q.rMax * Math.max(0, 1 - (q.t - dur) / cool); // se expande rápido y se frena; luego se enfría de afuera hacia adentro
  if (q.t < dur + cool) {
    if ((q.dmgT -= dt) <= 0) { q.dmgT = 0.25; if (dist < q.r + carR * 0.6) H.hurt(R.luna_erupcion_dano_s * 0.25, true, "erupción"); }
    if ((q.blastT -= dt) <= 0) { q.blastT = 0.5; if (q.r > 0.5) H.blast(q.C, q.r, R.luna_erupcion_dano_bicho_s * 0.5, "erupción"); }
  }
  if (vis && q.lava) {
    const pulse = 1 + 0.06 * Math.sin(q.t * 11);
    layDish(q.lava, q.top, 0.15, Math.max(0.01, q.r), true); layDish(q.core!, q.top, 0.2, Math.max(0.01, q.r * 0.45 * pulse), true);
    SPACE.lava(q.r > 0.3 ? 0.35 + 0.65 * (q.r / q.rMax) * B.Scalar.Clamp(1 - dist / 45, 0.1, 1) : 0);
    if ((q.fxT -= dt) <= 0) {
      q.fxT = 0.1;
      burst(onFloor(q.C, 0.5), { n: 6, color: "#ff6a1f", color2: "#ffd166", size: [0.7, 1.7], power: [4, 9], life: [0.7, 1.3], gravity: 6 }); // columna de gas incandescente
      burst(rp(q.C, q.r), { n: 4, color: "#ff7a2a", color2: "#ffd166", size: [0.4, 1.0], power: [1, 3], life: [0.6, 1.1], gravity: 5 });
      if (Math.random() < 0.5) FX.smoke(rp(q.C, q.r), true);
    }
  }
  if (q.t >= dur + cool) { // termina: la zona queda marcada (cicatriz oscura, montículos y boca) y humea un rato
    drop(q.lava); drop(q.core); SPACE.lava(0);
    if (vis) mark("scorch", q.C, 0, q.rMax * 0.95, 150);
    if (smokes.length < 10) smokes.push({ p: onFloor(q.C, 0.4), left: 20, t: 0 });
    quake = null; quakeAt = now + R.luna_erupcion_cada_s + jitter();
  }
}

/** Un cuadro de eventos (solo luna). time = segundos de partida; camYaw = rumbo de la cámara en el marco local del auto. */
export function lunaEv(dt: number, time: number, car: B.Vector3, carR: number, camYaw: number) {
  if (!MOON.on) return;
  const vis = !H.sim(), warnS = R.aviso_evento_s;
  now = time;
  if (vis && !ambOn) { ambOn = true; moonAmbience(true); }
  if (rainAt < 0) rainAt = R.luna_meteoros_desde_s + jitter();
  if (quakeAt < 0) quakeAt = R.luna_erupcion_desde_s + jitter();
  const busy = !!quake || !!rain || mets.length > 0;
  // --- Lluvia de meteoritos ---
  if (!rain && !quake && !rainPre && time >= rainAt - warnS && time < rainAt) { rainPre = true; if (vis) warn("RADAR", "LLUVIA DE METEORITOS · IMPACTOS EN ~6 S", 3.4, "warn"); }
  if (!rain && time >= rainAt) {
    if (busy) rainAt = time + 8;
    else {
      rain = { left: R.luna_meteoros_dur_s, acc: 0, rate: R.luna_meteoros_por_s }; rainPre = false; rainAt = time + R.luna_meteoros_cada_s + jitter(); tintTo = 1;
      if (vis) warn("ALERTA", "METEORITOS · ZONA DE IMPACTO ABIERTA", 2.6, "now");
    }
  }
  if (rain) {
    rain.left -= dt; rain.acc += dt * rain.rate;
    while (rain.acc >= 1) { rain.acc -= 1; if (mets.length < 8) spawnMeteor(car, vis); }
    if (rain.left <= 0) rain = null;
  }
  for (let i = mets.length - 1; i >= 0; i--) {
    const m = mets[i], aviso = R.luna_meteoro_aviso_s, caida = R.luna_meteoro_caida_s, t0 = aviso - caida;
    m.t += dt;
    if (m.t >= aviso) { landMeteor(m, car, carR, camYaw, vis); drop(m.m); drop(m.ring); drop(m.area); mets.splice(i, 1); continue; }
    if (!vis) continue;
    const pulse = 1 + 0.08 * Math.sin(m.t * 14), r = R.luna_meteoro_radio * m.size;
    if (m.ring) layRing(m.ring, m.T, 0.25, r * pulse);
    if (m.t >= t0) {
      if (!m.m) m.m = grab("lunaMeteoro", rockTpl);
      if (!m.whistled) { m.whistled = true; SPACE.meteorWhistle(panTo(car, m.T, camYaw), hd(car, m.T), caida); }
      const k = (m.t - t0) / caida;
      arc(m.S, m.T, k ** 1.25, 0, m.m.position);
      m.m.scaling.setAll(m.size * 1.1);
      burst(m.m.position, { n: 2, color: "#ff8a3a", color2: "#ffd166", size: [0.5, 1.1], power: [0, 0.4], life: [0.3, 0.55], gravity: 0 });
    }
  }
  // --- Erupción / falla lunar ---
  if (!quake && time >= quakeAt) {
    if (busy) quakeAt = time + 8;
    else { startQuake(car, camYaw, R.luna_erupcion_aviso_s); quakeAt = Infinity; }
  }
  if (quake) tickQuake(quake, dt, car, carR, camYaw, vis);
  // --- Humo de los cráteres ---
  for (let i = smokes.length - 1; i >= 0; i--) {
    const s = smokes[i];
    if ((s.left -= dt) <= 0) { smokes.splice(i, 1); continue; }
    if (vis && (s.t -= dt) <= 0 && hd(car, s.p) < 70) { s.t = 0.28; FX.smoke(s.p, s.left < 5); }
  }
  // --- Tinte: sube mientras haya lluvia en curso y baja al terminar ---
  if (!rain && mets.length === 0) tintTo = 0;
  tintK += B.Scalar.Clamp(tintTo - tintK, -dt / R.luna_tinte_s, dt / R.luna_tinte_s);
  const step = Math.round(tintK * 10);
  if (vis && base && step !== tintStep) { tintStep = step; applyClimate(evClimate(base)); } // repinta el cielo y la luz sin esperar al ciclo de luz de main.ts (cada repintado vuelve a capturar la sonda del cielo: ~10 por subida)
}

// Clima de la zona tal como lo pidió main.ts (sin tinte): sirve para repintar el tinte solo.
let base: Clim | null = null;
/** main.ts: applyClimate(evBase(clima)). Devuelve el clima con el tinte actual. */
export const evBase = (k: Clim) => { base = k; return evClimate(k); };

// ---------- Solo dev (__luna.meteor / __luna.erupt) ----------
function devClear() { // deja la luna sin eventos en curso (los shots no se pisan entre sí)
  for (const m of mets) { drop(m.m); drop(m.ring); drop(m.area); }
  for (const k of ["lunaAnillo", "lunaArea", "lunaLava", "lunaLavaNucleo"]) pools[k]?.forEach((m) => m.setEnabled(false));
  mets.length = 0; rain = quake = null; tintK = tintTo = 0; tintStep = -1; SPACE.lava(0);
}
export const lunaDev = {
  /** Lluvia ya, en rojo desde el primer cuadro: n meteoritos en ~8 s. */
  meteors(n: number) {
    if (!MOON.on) return "sin luna";
    devClear(); rain = { left: 8, acc: 0.99, rate: n / 8 }; tintTo = tintK = 1; rainAt = Infinity;
    return "ok";
  },
  /** Erupción ya (aviso de 0,2 s) a la distancia normal, delante del auto. */
  erupt(car: B.Vector3, camYaw: number) {
    if (!MOON.on) return "sin luna";
    devClear(); startQuake(car, camYaw, 0.2); quakeAt = Infinity;
    return "ok";
  },
  /** Centro y radio actual de la erupción en curso (null si no hay). */
  zone: () => (quake ? { C: quake.C, r: quake.r } : null),
};
