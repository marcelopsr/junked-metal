import * as B from "@babylonjs/core";
import { BAL } from "./balance";
import { burst, FX } from "./fx";
import { box, cyl, sph, teleTemplate, template } from "./models";
import { M, pbr, shadows } from "./render";
import { rng } from "./rng";
import { SPACE } from "./sfx";
import { panTo } from "./moon_events";
import { at, deform, EARTH_DIR, hd, hflat, LUNA, onFloor, orient, SUN_DIR, upAt } from "./moon";

// ---------- Luna, fase 2: el Sol y la Tierra lanzan bichos (docs/LUNA.md) ----------
// Mientras un astro está sobre el horizonte del auto (lado de día para el Sol, cara de la Tierra para los cohetes; no hace falta que
// esté en cuadro), su reloj corre; al vencer, lanza un proyectil que cae desde lo alto (entra por arriba de la pantalla, inclinado
// desde el lado del astro) hasta un punto del piso cerca del auto (nunca encima): bola de fuego del Sol, cohetito de la Tierra.
// Aviso rojo en el piso durante el vuelo; al caer, cráter (deform), daño leve si el auto está en el radio y sale el bicho (LUNA.spawn).
const R = BAL.ritmo;
const HIGH = 24; // m sobre el impacto de donde arranca la caída: fuera de cuadro (la cámara a 13 m ve hasta ~10 m de alto) y entra por arriba
type Shot = { sun: boolean; m: B.InstancedMesh; from: B.Vector3; to: B.Vector3; t: number; zone: B.InstancedMesh; fill: B.InstancedMesh; puff: number };
const shots: Shot[] = [];
const cd = { sun: 0, earth: 0 };
let fireT = 0;

const fireTpl = () => {
  const t = template("astroFuego", () => {
    const hot = pbr("astroFuego", { color: "#ff6a10", rough: 0.6, emissive: "#ff5a00" }), core = pbr("astroNucleo", { color: "#ffe08a", rough: 0.4, emissive: "#ffd24a" });
    hot.fogEnabled = core.fogEnabled = false; // se ve venir desde lejos aunque la niebla del lado oscuro sea cerrada
    return [sph(1.5, hot, [0, 0, 0], undefined, 8), sph(1.0, core, [0, 0, 0.1], undefined, 6)];
  });
  shadows.removeShadowCaster(t);
  return t;
};
const rocketTpl = () => { // a lo largo de +y: la punta va hacia donde viaja
  const t = template("astroCohete", () => {
    const tin = M.metal("#9aa0a8"), red = M.plastic("#d62828"), flame = pbr("astroLlama", { color: "#ff9138", rough: 0.5, emissive: "#ff9138" });
    flame.fogEnabled = false;
    return [
      cyl(0.42, 0.42, 1.3, tin, [0, 0, 0], undefined, 8), cyl(0.02, 0.42, 0.55, red, [0, 0.92, 0], undefined, 8), // lata + punta
      ...[0, 1, 2].map((i) => box(0.06, 0.5, 0.42, red, [Math.sin(i * 2.09) * 0.42, -0.55, Math.cos(i * 2.09) * 0.42], [0, i * 2.09, 0])), // aletas
      sph(0.7, flame, [0, -0.95, 0], [1, 1.6, 1], 6), // escape
    ];
  });
  shadows.removeShadowCaster(t);
  return t;
};

/** Intervalo entre lanzamientos de un astro: baja con el tiempo de partida hasta su piso. */
let skyK = 1; // ENCORE (variantes): multiplica el intervalo de cada escenario (< 1 = más seguido); Supervivencia: 1
export const skyPace = (k = 1) => { skyK = k; };
const every = (time: number) => Math.max(R.luna_astro_cada_min_s, R.luna_astro_cada_s - R.luna_astro_baja_por_min * (time / 60)) * (0.8 + 0.4 * rng()) * skyK;

/** Lanza un proyectil del Sol (sun) o de la Tierra hacia un punto cerca de car. Público para __luna.astro (pruebas). */
export function skyLaunch(sun: boolean, car: B.Vector3) {
  const a = rng() * Math.PI * 2, d = R.luna_astro_dist_min + rng() * (R.luna_astro_dist_max - R.luna_astro_dist_min);
  const to = onFloor(at(car, Math.cos(a) * d, 0, Math.sin(a) * d), 0);
  const side = hflat((sun ? SUN_DIR : EARTH_DIR).clone(), to); // hacia el astro, en el plano del lugar: cae inclinado desde su lado
  const from = upAt(to).scaleInPlace(HIGH).addInPlace(side.scaleInPlace(HIGH * 0.35)).addInPlace(to);
  const m = (sun ? fireTpl() : rocketTpl()).createInstance(sun ? "bolaFuego" : "cohetito");
  m.position.copyFrom(from); m.isPickable = false;
  if (!sun) m.rotationQuaternion = new B.Quaternion();
  const [zone, fill] = [0, 1].map(() => { const t = teleTemplate().createInstance("teleAstro"); t.isPickable = false; return t; });
  for (const [t, h] of [[zone, 0.06], [fill, 0.07]] as const) { onFloor(to, h, t.position); orient(t, to); }
  zone.scaling.set(R.luna_astro_radio, 1, R.luna_astro_radio);
  shots.push({ sun, m, from, to, t: 0, zone, fill, puff: 0 });
}

const drop = (s: Shot) => { s.m.dispose(); s.zone.dispose(); s.fill.dispose(); };
const _p = new B.Vector3();
/** Cada cuadro de la partida en la luna. cam = null en __sim (sin dibujar): mismo criterio de horizonte, sin efectos ni sonido. camYaw: paneo del sonido. */
export function skyTick(dt: number, time: number, car: B.Vector3, cam: B.Camera | null, hurt: (n: number, continuous: boolean, src: string) => void, bugs: readonly { kind: string; pos: B.Vector3 }[], camYaw = 0) {
  const up = upAt(car);
  for (const sun of [true, false]) {
    const dir = sun ? SUN_DIR : EARTH_DIR, k = sun ? "sun" : "earth";
    if (B.Vector3.Dot(up, dir) <= R.luna_astro_horizonte) continue; // el reloj corre solo con el astro sobre el horizonte del auto
    if (cd[k] <= 0) cd[k] = every(time); // primera vez sobre el horizonte: arranca su cuenta
    else if ((cd[k] -= dt) <= 0) {
      skyLaunch(sun, car); cd[k] = every(time);
      if (cam) { const to = shots[shots.length - 1].to; (sun ? SPACE.sunLaunch : SPACE.earthLaunch)(panTo(car, to, camYaw), hd(car, to)); }
    }
  }
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.t += dt / R.luna_astro_vuelo_s;
    const k = Math.min(1, s.t), e = k ** 1.3; // arranca lento y acelera al caer
    _p.copyFrom(s.m.position);
    B.Vector3.LerpToRef(s.from, s.to, e, s.m.position);
    if (!s.sun && k > 0) B.Quaternion.FromUnitVectorsToRef(B.Vector3.Up(), _p.subtractInPlace(s.m.position).scaleInPlace(-1).normalize(), s.m.rotationQuaternion!); // la punta, hacia donde va
    s.m.scaling.setAll(1 + 0.8 * (1 - e)); // arriba un poco más grande: que se lea al entrar en cuadro
    if (s.sun) s.m.rotation.z += dt * 6;
    const f = Math.max(0.05, R.luna_astro_radio * k);
    s.fill.scaling.set(f, 1, f);
    if (cam && (s.puff -= dt) <= 0) { // estela del pool de fx.ts (0,05 s: no acapara el pool)
      s.puff = 0.05;
      _p.copyFrom(s.m.position);
      if (s.sun) burst(_p, { n: 3, color: "#ffb03a", color2: "#ff4d00", size: [0.6, 1.4], power: [0, 0.6], life: [0.25, 0.5], gravity: 0 });
      else burst(_p, { n: 2, color: "#8f9196", color2: "#5f6166", size: [0.6, 1.3], power: [0, 0.4], life: [0.6, 1.1], gravity: 0, add: false });
    }
    if (k < 1) continue;
    // Impacto: cráter chico, partículas, daño leve en el radio y el bicho
    deform(s.to, R.luna_astro_crater_r, R.luna_astro_crater_hondo);
    if (cam) {
      SPACE.skyImpact(s.sun ? "sol" : "tierra", panTo(car, s.to, camYaw), hd(car, s.to));
      _p.copyFrom(up).scaleInPlace(0.4).addInPlace(s.to);
      if (s.sun) { FX.explosion(_p, 1.3); FX.ignite(_p); } else { FX.explosion(_p, 0.9); burst(_p, { n: 10, color: "#6b6e74", size: [0.8, 1.8], power: [1, 4], life: [0.8, 1.4], gravity: 1, add: false }); FX.sparks(_p, 12); }
    }
    if (hd(car, s.to) < R.luna_astro_radio) hurt(R.luna_astro_dano, false, s.sun ? "bola de fuego" : "cohete");
    const n = 1 + Math.floor(time / 60 / R.luna_astro_bichos_cada_min);
    for (let j = 0; j < n; j++) LUNA.spawn?.(s.sun ? "fuego" : "cohete", j ? at(s.to, Math.cos(j * 2.4) * 1.6, 0, Math.sin(j * 2.4) * 1.6) : s.to);
    drop(s); shots.splice(i, 1);
  }
  // Rastro de fuego breve detrás de cada bicho de fuego (visual; ponytail: sin daño, techo 8 por tanda para no vaciar el pool)
  if (cam && (fireT -= dt) <= 0) {
    fireT = 0.12;
    let n = 0;
    for (const b of bugs) if (b.kind === "fuego" && n++ < 8) burst(b.pos, { n: 2, color: "#ff8a1a", color2: "#ffd24a", size: [0.25, 0.55], power: [0.2, 0.8], life: [0.3, 0.55], gravity: -1.5 });
  }
}

/** Partida nueva o fin: sin proyectiles ni relojes. */
export function skyClear() { for (const s of shots) drop(s); shots.length = 0; cd.sun = cd.earth = 0; fireT = 0; skyK = 1; }
/** Estado para pruebas (__luna.astros). */
export const skyInfo = () => ({ shots: shots.map((s) => ({ sol: s.sun, t: +s.t.toFixed(2) })), cd: { ...cd } });
