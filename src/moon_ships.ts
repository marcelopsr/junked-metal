import * as B from "@babylonjs/core";
import { BAL } from "./balance";
import type { Car } from "./car";
import type { Enemy, Kind } from "./enemies";
import { debris, FX } from "./fx";
import { box, cyl, sph, teleTemplate, template, tor } from "./models";
import { alignYaw, alt, arc, at, deform, hd, hover, LUNA, MOON, onFloor, ringAt, upAt, yawTo } from "./moon";
import { ALIENS } from "./aliens";
import { coopHp, coopRate, panTo } from "./moon_events";
import { pbr } from "./render";
import { pickIdx, rng } from "./rng";
import { SFX, SPACE } from "./sfx";
import { banner, hudBoss } from "./ui";

// ---------- Naves alienígenas de la luna (fase 2, docs/LUNA.md) ----------
// Nodriza: enemigo del mapa que vuelve cada tanto, persigue un rato desde el aire disparando y soltando aliens, y se va; no muere:
// dañada se retira antes y suelta premio. Bombardera, abductora y caza: los minijefes de la luna (main.ts las pone en lugar de los del patio).
// Las armas del auto les pegan a través de un "blanco" con forma de Enemy (pos, radius, hp, hitCd, slow, stun) que se suma a ctx.enemies:
// queda 1,5 m sobre el piso bajo la nave, así las armas a ras del piso la alcanzan; main.ts damage() lo desvía a hitShip().
const A = BAL.ataques;
export type ShipId = "nodriza" | "bombardera" | "abductora" | "caza";
export const SHIP_NAME: Record<ShipId, string> = { nodriza: "NAVE NODRIZA", bombardera: "NAVE BOMBARDERA", abductora: "NAVE ABDUCTORA", caza: "CAZA RÁPIDO" };
const MINORS: ShipId[] = ["bombardera", "abductora", "caza"];
/** Bichos que suelta la nodriza: los aliens que ya pueden aparecer a esa altura de la partida (aparece_min de balance.json; enjambre siempre). */
export const nodrizaDrops = (time: number): Kind[] => ALIENS.filter((k) => k === "enjambre" || BAL.enemigos[k].aparece_min * 60 <= time);
/** Lo que llena main.ts: daño al auto y premio (gemas + cofre; boss = cuenta como minijefe vencido). */
export const SHIP_IO: { hurt: (n: number, src: string, who: number) => void; reward: (p: B.Vector3, xp: number, boss: boolean) => void } = { hurt: () => {}, reward: () => {} };

/** Minijefe i-ésimo de la luna: dos naves distintas seguidas, elegidas por la semilla sin gastar rng() (como el jefe final). */
export const shipFor = (i: number, seed: number) => MINORS[(Math.floor(((seed * 0.4142135) % 1) * 3) + i) % 3];

// ---------- Modelos: chatarra plegada con luces alienígenas (verde ácido y violeta), plantillas fusionadas ----------
const lights = () => {
  const g = pbr("naveLuz", { color: "#6dffb0", rough: 0.3, emissive: "#6dffb0" }), v = pbr("naveLuzV", { color: "#c86bff", rough: 0.3, emissive: "#c86bff" });
  g.fogEnabled = v.fogEnabled = false; g.emissiveIntensity = v.emissiveIntensity = 2.4; // atraviesan la niebla del lado oscuro, como los bichos
  return { g, v, hull: pbr("naveCasco", { color: "#5b6168", rough: 0.45, metal: 0.8 }), rust: pbr("naveOxido", { color: "#8a5a3a", rough: 0.8, metal: 0.3 }), dark: pbr("naveOscuro", { color: "#24262b", rough: 0.6, metal: 0.5 }) };
};
const ring8 = (n: number, r: number, y: number, f: (x: number, z: number, a: number) => B.Mesh) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return f(Math.sin(a) * r, Math.cos(a) * r, a); });
const MODEL: Record<ShipId, () => B.Mesh[]> = {
  nodriza: () => { const L = lights(); return [ // platillo de 12 m con placas dobladas en el borde, cúpula y anillo de luces
    cyl(12, 7, 1.4, L.hull, [0, 0, 0], undefined, 16), cyl(7, 9, 0.8, L.dark, [0, -1, 0], undefined, 16), sph(5.5, L.rust, [0, 0.7, 0], [1, 0.45, 1], 8),
    ...ring8(8, 5.6, 0, (x, z, a) => box(2.6, 0.35, 1.2, L.rust, [x, 0.55, z], [0.35, a, 0])), // placas plegadas hacia arriba
    ...ring8(12, 5.9, 0, (x, z) => sph(0.55, L.g, [x, -0.1, z], undefined, 4)),
    tor(5, 0.3, L.v, [0, -1.45, 0], undefined, 16), cyl(1.6, 2.2, 0.6, L.g, [0, -1.5, 0], undefined, 10), // emisor de abajo
  ]; },
  bombardera: () => { const L = lights(); return [ // casco en cuña con dos barquillas y la bodega iluminada
    box(3.2, 1.3, 5, L.hull, [0, 0, 0]), box(2.6, 0.9, 2.2, L.rust, [0, 0.8, -0.8], [0.2, 0, 0]),
    cyl(1.1, 1.1, 4.6, L.dark, [2.1, -0.2, 0], [Math.PI / 2, 0, 0], 8), cyl(1.1, 1.1, 4.6, L.dark, [-2.1, -0.2, 0], [Math.PI / 2, 0, 0], 8),
    box(2, 0.2, 2.4, L.v, [0, -0.7, 0]), sph(0.6, L.g, [2.1, -0.2, 2.4], undefined, 4), sph(0.6, L.g, [-2.1, -0.2, 2.4], undefined, 4), sph(0.5, L.g, [0, 0.5, 2.5], undefined, 4),
  ]; },
  abductora: () => { const L = lights(); return [ // platillo chico y alto con la campana del rayo colgando
    cyl(6, 3.5, 1, L.hull, [0, 0, 0], undefined, 12), sph(3, L.rust, [0, 0.5, 0], [1, 0.7, 1], 6), cyl(1.4, 2.6, 1.4, L.dark, [0, -1.1, 0], undefined, 10),
    tor(2.2, 0.25, L.g, [0, -1.85, 0], undefined, 12), ...ring8(6, 2.8, 0, (x, z) => sph(0.45, L.v, [x, 0, z], undefined, 4)),
    ...ring8(4, 2.4, 0, (x, z, a) => box(1.6, 0.25, 0.8, L.rust, [x, 0.45, z], [0.4, a, 0])),
  ]; },
  caza: () => { const L = lights(); return [ // flecha: fuselaje largo, alas en flecha y toberas
    box(1.2, 0.8, 5.2, L.hull, [0, 0, 0]), box(0.9, 0.5, 1.6, L.rust, [0, 0.5, 0.6], [0.15, 0, 0]),
    box(2.6, 0.18, 1.8, L.dark, [1.6, -0.1, -0.9], [0, 0.5, -0.12]), box(2.6, 0.18, 1.8, L.dark, [-1.6, -0.1, -0.9], [0, -0.5, 0.12]),
    sph(0.7, L.v, [0.4, 0, -2.7], undefined, 4), sph(0.7, L.v, [-0.4, 0, -2.7], undefined, 4), sph(0.45, L.g, [0, 0.1, 2.7], undefined, 4),
  ]; },
};
const shipTpl = (id: ShipId) => template("nave_" + id, MODEL[id]);
const orbTpl = () => template("nave_orbe", () => { const L = lights(); return [sph(0.9, L.g, [0, 0, 0], undefined, 6)]; });
const bombTpl = () => template("nave_bomba", () => { const L = lights(); return [cyl(0.7, 0.7, 1.2, L.dark, [0, 0, 0], undefined, 8), sph(0.5, L.v, [0, -0.6, 0], undefined, 4)]; });
const beamTpl = () => { // cono del rayo: base en y = 0, punta en y = 1 (se estira a la altura de la nave)
  const t = template("nave_rayo", () => { const m = pbr("naveRayo", { color: "#6dffb0", rough: 1, emissive: "#3dbf80", alpha: 0.28 }); m.fogEnabled = false; return [cyl(1.2, 6.4, 1, m, [0, 0.5, 0], undefined, 16)]; });
  return t;
};

// ---------- Estado ----------
type Shot = { m: B.InstancedMesh; tele: B.InstancedMesh; from: B.Vector3; to: B.Vector3; t: number; dur: number; h: number; r: number; dmg: number; dent: number; src: string };
type Target = { readonly pos: B.Vector3; radius: number; hp: number; maxHp: number; hitCd: number; slow: number; stun: number; def: { boss: true }; ship: Ship };
type Ship = {
  id: ShipId; m: B.InstancedMesh; pos: B.Vector3; yaw: number; hp: number; maxHp: number; t: number; fire: number; drop: number;
  state: "in" | "chase" | "aim" | "beam" | "out"; st: number; d: number; spot: B.Vector3; goal: B.Vector3; target: Target; beam?: B.InstancedMesh; tele?: B.InstancedMesh; who?: number; // who: índice del auto al que apunta (R7b, se elige al primer cuadro)
};
const ships: Ship[] = [], shots: Shot[] = [];
let nextMother = A.nave_nodriza_primera_s;
const ALT: Record<ShipId, number> = { nodriza: A.nave_nodriza_alt, bombardera: 7, abductora: 8, caza: 3.5 };
const RAD: Record<ShipId, number> = { nodriza: 5.5, bombardera: 3, abductora: 3, caza: 2.5 };

function spawn(id: ShipId, car: B.Vector3, near: boolean, time: number) {
  const a = rng() * Math.PI * 2, pos = near ? onFloor(car, ALT[id]) : ringAt(car, a, 50, 22); // desde el horizonte, alto
  const hp = (id === "nodriza" ? A.nave_nodriza_vida * (1 + time / 600) : A["nave_" + id + "_vida"]) * coopHp();
  const s: Ship = { id, m: shipTpl(id).createInstance(id), pos, yaw: a + Math.PI, hp, maxHp: hp, t: 0, d: 0, fire: 2, drop: 3, state: near ? "chase" : "in", st: 0, spot: new B.Vector3(), goal: new B.Vector3(), target: null! };
  const anchor = new B.Vector3();
  s.target = { get pos() { return onFloor(s.pos, 1.5, anchor); }, radius: RAD[id], get hp() { return s.state === "out" ? 0 : s.hp; }, set hp(v) { /* lo resta hitShip */ }, maxHp: hp, hitCd: 0, slow: 0, stun: 0, def: { boss: true }, ship: s }; // def: las armas leen e.def.boss (burbujas...) y la nave cuenta como jefe
  s.m.position.copyFrom(pos);
  ships.push(s);
  return s;
}
/** Hace aparecer una nave (minijefe: desde el horizonte alrededor de car; near = justo sobre el punto car, para pruebas). */
export function shipSpawn(id: ShipId, car: B.Vector3, time = 0, near = false) { if (MOON.on) spawn(id, car, near, time); }

/** Blancos para las armas (ctx.enemies): los bichos más las naves en vuelo. Con bichos a menos de nave_blanco_cerca del auto, solo
 *  los bichos: las armas con objetivo no se gastan en la nave mientras hay amenazas encima (echarla sigue siendo posible). */
export function shipTargets(enemies: Enemy[], car: B.Vector3): Enemy[] {
  return ships.length && !enemies.some((e) => hd(e.pos, car) < A.nave_blanco_cerca) ? enemies.concat(ships.filter((s) => s.state !== "out").map((s) => s.target as unknown as Enemy)) : enemies;
}
/** main.ts damage(): si e es una nave le resta vida y devuelve true. */
export function hitShip(e: unknown, dmg: number) {
  const s = (e as Partial<Target>).ship;
  if (!s) return false;
  if (s.state !== "out") s.hp -= dmg;
  if (dmg >= 4 && Math.random() < 0.5) FX.hit(s.pos, dmg >= 40);
  return true;
}
/** Barra de jefe: la nave con vida (minijefe antes que la nodriza). */
export function shipBar() {
  const s = ships.find((x) => x.id !== "nodriza" && x.state !== "out") ?? ships.find((x) => x.state !== "out");
  return s ? { name: SHIP_NAME[s.id], pct: Math.max(0, s.hp / s.maxHp) } : null;
}

function shoot(from: B.Vector3, to: B.Vector3, kind: "orbe" | "bomba", dur: number, h: number, r: number, dmg: number, dent: number, src: string) {
  const m = (kind === "orbe" ? orbTpl() : bombTpl()).createInstance("navetiro"), tele = teleTemplate().createInstance("navetele");
  const fl = onFloor(to, 0); onFloor(to, 0.06, tele.position); tele.rotationQuaternion = alignYaw(fl, 0); tele.scaling.setAll(r);
  m.position.copyFrom(from);
  shots.push({ m, tele, from: from.clone(), to: fl, t: 0, dur, h, r, dmg, dent, src });
}
function leave(s: Ship, quiet: boolean, beaten: boolean) {
  s.state = "out"; s.st = 0;
  at(s.pos, Math.sin(s.yaw) * 90, 0, Math.cos(s.yaw) * 90, s.goal);
  if (s.beam) s.beam.isVisible = false;
  if (s.tele) s.tele.isVisible = false;
  if (!quiet) banner(beaten ? "NAVE NODRIZA DAÑADA · RETIRADA CON CARGA SUELTA" : "NAVE NODRIZA · FUERA DE RADAR", 2.4, { tag: "RADAR", ico: "jefe", tone: "now" });
  hudBoss(null);
}
function destroy(s: Ship, i: number) {
  if (s.id === "nodriza") SPACE.mothership(0);
  s.m.dispose(); s.beam?.dispose(); s.tele?.dispose();
  ships.splice(i, 1);
}

// Sonido de las naves: paneo en el marco local del auto (camYaw) y volumen por distancia; nada en __sim (quiet)
const snd = { quiet: true, cp: new B.Vector3(), yaw: 0 };
const sfxAt = (p: B.Vector3, f: (pan: number, dist: number) => unknown) => { if (!snd.quiet) f(panTo(snd.cp, p, snd.yaw), hd(snd.cp, p)); };

/** Cada cuadro (solo luna): agenda de la nodriza, vuelo y ataques de las naves y sus proyectiles. camYaw: paneo del sonido. */
/** cars = autos vivos (0 = el que guía: sonido y nodriza); cada nave persigue a uno al azar y los disparos dañan a cualquiera (R7b). */
export function shipsTick(dt: number, time: number, cars: Car[], quiet: boolean, camYaw = 0) {
  if (!MOON.on) return;
  const cp = cars[0].pos;
  snd.quiet = quiet; snd.cp = cp; snd.yaw = camYaw;
  // Nodriza: aviso unos segundos antes, entra desde el horizonte; no se superpone con otra nodriza
  if (time >= nextMother - BAL.ritmo.aviso_evento_s && nextMother > 0 && !ships.some((s) => s.id === "nodriza")) {
    if (!quiet) banner("NAVE NODRIZA · ENTRADA DESDE EL HORIZONTE", 3.2, { tag: "RADAR", ico: "jefe", tone: "warn" });
    nextMother = -nextMother; // avisada: falta que llegue la hora
  }
  if (nextMother < 0 && time >= -nextMother) { spawn("nodriza", cp, false, time); nextMother = Infinity; }

  for (let i = ships.length - 1; i >= 0; i--) {
    const s = ships[i], alt0 = ALT[s.id], w = (s.who ??= pickIdx(cars.length)) < cars.length ? s.who : 0, car = cars[w];
    s.t += dt; s.st += dt; s.target.hitCd -= dt;
    if (s.state === "out") { // se va: sube y se aleja; desaparece pasado el horizonte
      hover(s.pos, s.goal, alt0 + s.st * 6, 22, dt);
      if (s.st > 6) { destroy(s, i); continue; }
    } else if (s.hp <= 0) { // vencida
      if (s.id === "nodriza") { SHIP_IO.reward(onFloor(s.pos, 0.5), A.nave_nodriza_premio_xp, false); leave(s, quiet, true); nextMother = time + A.nave_nodriza_cada_s; }
      else {
        if (!quiet) { FX.death(s.pos, true); debris(s.pos, "#5b6168", 24, 14, 2); debris(s.pos, "#6dffb0", 10, 12, 0.8); }
        SHIP_IO.reward(onFloor(s.pos, 0.5), A.nave_minijefe_xp, true);
        hudBoss(null); destroy(s, i); continue;
      }
    } else if (s.state === "in") { // entra desde lejos, bajando a medida que se acerca
      const d = hover(s.pos, car.pos, alt0 + Math.max(0, hd(s.pos, car.pos) - 14) * 0.4, s.id === "caza" ? 26 : 14, dt);
      if (d < 16) { s.state = "chase"; s.st = 0; }
    } else if (s.id === "nodriza") tickMother(s, dt, car.pos, quiet, time);
    else if (s.id === "bombardera") tickBomber(s, dt, car);
    else if (s.id === "abductora") tickAbductor(s, dt, car, w);
    else tickFighter(s, dt, car);
    // Pose: parada en el lugar con su rumbo; los platillos giran sobre sí mismos
    const spin = s.id === "nodriza" || s.id === "abductora";
    s.m.position.copyFrom(s.pos);
    s.m.rotationQuaternion = alignYaw(s.pos, spin ? s.t * 0.6 : s.yaw);
    if (s.id === "nodriza" && !quiet) { // zumbido en bucle: más fuerte cerca, más agudo si se acerca (doppler) y se apaga al alejarse
      const d = hd(s.pos, cp), dop = B.Scalar.Clamp((s.d - d) / dt / 12, -1, 1);
      s.d = d;
      SPACE.mothership(B.Scalar.Clamp(1 - d / 70, 0, 1), panTo(cp, s.pos, camYaw, 16), s.t > dt ? dop : 0);
    }
  }

  // Proyectiles: arco hasta el punto marcado en el piso (el aro rojo avisa dónde cae)
  for (let i = shots.length - 1; i >= 0; i--) {
    const p = shots[i];
    p.t += dt / p.dur;
    arc(p.from, p.to, Math.min(1, p.t), p.h, p.m.position);
    if (!quiet && Math.random() < 0.4) FX.trail(p.m.position, p.src === "bomba nave" ? "#c86bff" : "#6dffb0");
    if (p.t < 1) continue;
    cars.forEach((c, j) => { if (hd(c.pos, p.to) < p.r + 1 && alt(c.pos) < 3) SHIP_IO.hurt(p.dmg, p.src, j); });
    if (!quiet) { if (p.dent) FX.explosion(p.to, p.r * 0.7); else FX.shock(p.to); }
    if (p.dent) sfxAt(p.to, (pan, d) => SPACE.meteorImpact(pan, d, 0.7)); // bomba: golpe sordo como el meteorito, más chico
    if (p.dent) deform(p.to, p.r, p.dent); // cada impacto fuerte deja cráter de verdad (moon.ts)
    p.m.dispose(); p.tele.dispose(); shots.splice(i, 1);
  }
}

function tickMother(s: Ship, dt: number, cp: B.Vector3, quiet: boolean, time: number) {
  hover(s.pos, cp, ALT.nodriza, A.nave_nodriza_vel, dt);
  if ((s.fire -= dt) <= 0) { // orbe en globo hacia donde va a estar el auto
    s.fire = A.nave_nodriza_disparo_cada_s;
    sfxAt(s.pos, (pan) => SFX.zap(pan));
    shoot(at(s.pos, 0, -1.6, 0), at(cp, (rng() - 0.5) * 4, 0, (rng() - 0.5) * 4), "orbe", A.nave_disparo_vuelo_s, 4, A.nave_disparo_radio, A.nave_disparo_dano, 0.5, "orbe nave");
  }
  if ((s.drop -= dt) <= 0 && LUNA.spawn) { // suelta aliens debajo suyo
    s.drop = A.nave_nodriza_suelta_cada_s;
    const base = onFloor(s.pos, 0);
    const drops = nodrizaDrops(time);
    for (let k = 0; k < Math.round(A.nave_nodriza_suelta_cantidad * coopRate()); k++) LUNA.spawn(drops[Math.floor(rng() * drops.length)], at(base, (rng() - 0.5) * 6, 0, (rng() - 0.5) * 6));
    if (!quiet) FX.shock(base);
  }
  if (s.st > A.nave_nodriza_dura_s) { leave(s, quiet, false); nextMother = time + A.nave_nodriza_cada_s; }
}
function tickBomber(s: Ship, dt: number, car: Car) { // pasa por encima con adelanto y suelta bombas que hacen cráter
  const v = car.body.getLinearVelocity(), lead = car.pos.add(v.scale(0.9));
  hover(s.pos, lead, ALT.bombardera, A.nave_bombardera_vel, dt);
  s.yaw = yawTo(s.pos, lead);
  if ((s.fire -= dt) <= 0 && hd(s.pos, car.pos) < 14) {
    s.fire = A.nave_bomba_cada_s;
    sfxAt(s.pos, () => SFX.whoosh());
    shoot(at(s.pos, 0, -1, 0), onFloor(s.pos, 0), "bomba", 0.7, 0, A.nave_bomba_radio, A.nave_bomba_dano, A.nave_bomba_crater, "bomba nave");
  }
}
function tickAbductor(s: Ship, dt: number, car: Car, who: number) { // se para encima, marca el piso y prende el rayo: quien queda adentro sube y se frena
  if (s.state === "chase") {
    hover(s.pos, car.pos, ALT.abductora, A.nave_abductora_vel, dt);
    // marca adonde va a estar el auto: cambiar de rumbo lo esquiva
    if (s.st > 2 && hd(s.pos, car.pos) < 10) { s.state = "aim"; s.st = 0; onFloor(car.pos.add(car.body.getLinearVelocity().scale(1.1)), 0, s.spot); s.tele ??= teleTemplate().createInstance("navetele"); onFloor(s.spot, 0.06, s.tele.position); s.tele.rotationQuaternion = alignYaw(s.spot, 0); s.tele.scaling.setAll(A.nave_rayo_radio); s.tele.isVisible = true; }
  } else if (s.state === "aim") {
    hover(s.pos, s.spot, ALT.abductora, 14, dt);
    if (s.st > 1.1) { s.state = "beam"; s.st = 0; s.beam ??= beamTpl().createInstance("naverayo"); s.beam.isVisible = true; sfxAt(s.spot, (pan, d) => SFX.teslaDischarge(pan, d)); }
  } else if (s.state === "beam") {
    hover(s.pos, s.spot, ALT.abductora, 4, dt);
    const b = s.beam!; onFloor(s.pos, 0, b.position); b.rotationQuaternion = alignYaw(b.position, s.t); b.scaling.set(A.nave_rayo_radio / 3.2, alt(s.pos) - 1.4, A.nave_rayo_radio / 3.2);
    if (hd(car.pos, s.spot) < A.nave_rayo_radio) {
      const v = car.body.getLinearVelocity(), up = upAt(car.pos), vu = B.Vector3.Dot(v, up);
      const h = v.subtract(up.scale(vu)).scaleInPlace(Math.max(0, 1 - 3 * dt)); // lo frena
      const lift = (alt(car.pos) < A.nave_rayo_altura ? MOON.g + 14 : MOON.g * 0.95) * dt; // sube hasta la altura del rayo y queda flotando
      car.body.setLinearVelocity(h.addInPlace(up.scaleInPlace(Math.min(vu + lift, 6))));
      SHIP_IO.hurt(A.nave_rayo_dano_s * dt, "rayo nave", who);
    }
    if (s.st > A.nave_rayo_dura_s) { s.state = "chase"; s.st = 0; b.isVisible = false; s.tele!.isVisible = false; }
  }
}
function tickFighter(s: Ship, dt: number, car: Car) { // pasadas rasantes: apunta más allá del auto, cruza disparando y vuelve
  if (s.st > 3.5 || hd(s.pos, s.goal) < 3 || s.goal.lengthSquared() === 0) {
    const y = yawTo(s.pos, car.pos); s.st = 0;
    at(car.pos, Math.sin(y) * 22, 0, Math.cos(y) * 22, s.goal);
  }
  hover(s.pos, s.goal, ALT.caza, A.nave_caza_vel, dt);
  s.yaw = yawTo(s.pos, s.goal);
  const d = hd(s.pos, car.pos), ahead = Math.cos(yawTo(s.pos, car.pos) - s.yaw);
  if ((s.fire -= dt) <= 0 && d < 24 && d > 4 && ahead > 0.8) {
    s.fire = A.nave_caza_disparo_cada_s;
    sfxAt(s.pos, (pan) => SFX.zap(pan));
    shoot(s.pos.clone(), car.pos, "orbe", d / 34, 0.5, 1.4, A.nave_caza_dano, 0, "caza nave");
  }
}

/** Partida nueva / fin: limpia naves y proyectiles y reinicia la agenda de la nodriza. */
export function shipsClear() {
  for (let i = ships.length - 1; i >= 0; i--) destroy(ships[i], i);
  for (const p of shots) { p.m.dispose(); p.tele.dispose(); }
  shots.length = 0;
  nextMother = A.nave_nodriza_primera_s;
}
