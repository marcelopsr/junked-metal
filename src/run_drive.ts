// Fases de update() de la partida (clima, habilidad, manejo, embestida, aparición, eventos del patio, vitales). Estado compartido con main.ts por D (initRunDrive).
import * as B from "@babylonjs/core";
import { BAL } from "./balance";
import * as E from "./encore";
import { DEF, pickWeighted, spawnTable, type Kind, type Enemy } from "./enemies";
import { FX, fxSpeed, mark } from "./fx";
import { SFX, engineSfx } from "./sfx";
import { drive } from "./car";
import type { Car } from "./car";
import { input, spinHeld } from "./input";
import { cs, damage, dropGems, dropPickup, explode, smashed } from "./combat";
import { endRun, grant, hitAt } from "./outro";
import { banner, hudBoss, radioBoss, radioEvent, dirSub } from "./ui";
import { calmFirst, erun, minorMini, minorShip, say } from "./encore_run";
import { mateDown, mateLead, mateTick } from "./coop";
import type { Player } from "./coop";
import { offersFor, openOffers } from "./progression";
import { PIT } from "./zones/pileta";
import { kitchenPlague } from "./zones/cocina";
import { HALF, floorAt, heavyProps, hitBreakables, hitHeavyProps, spawnPoint, zoneClimate, zoneId, zoneTick } from "./world";
import { MOON, alt, at, flatL, FOOT, ROLL, hflat, onFloor, ringAt, upv, yawOf } from "./moon";
import { evBase, lunaEv } from "./moon_events";
import { SHIP_NAME, shipSpawn } from "./moon_ships";
import { rocketLand } from "./moon_goals";
import { getModoTranquilo, RAIN, mixClimate, nightfall, DUSK, type Profile } from "./run";
import { applyClimate, pbr, setDark, shadows } from "./render";
import { rng, rngFrom } from "./rng";
import { enHielo, roam, TRAMPS } from "./free_tricks";
let evR = rngFrom(1); // sorteo de eventos de mitad de partida: azar propio derivado de la semilla, no corre el principal
import { run } from "./run_state";
import { sph } from "./models";
import { setKmh } from "./hud_tick";
import type { Frame } from "./run_tick";
import type { PStats, Weapon } from "./weapons";

const R = BAL.ritmo;
export interface RunDriveContext {
  readonly lead: Player; readonly players: Player[]; readonly st: PStats; readonly weapons: Weapon[]; readonly enemies: Enemy[];
  readonly state: string; readonly simulating: boolean; readonly camYaw: number; readonly profile: Profile; readonly LAB: { on: boolean; t: number };
  readonly TOUGH: { count: number }; readonly low: boolean; readonly duel: number; readonly RUN_BOSSES: [number, Kind][];
  readonly abilCar: Car | null; shieldM: { isVisible: boolean } | null;
  coyoteT: number; wasGrounded: boolean; rainK: number; rainBanner: boolean; cycleS: number; lampBoost: boolean;
  yardPulseIdx: number; yardPulseT: number; jingleT: number; motorFxT: number; spawnN: number; darkK: number; apagon: boolean; shake: number;
  ball: { m: B.Mesh; agg: B.PhysicsAggregate; life: number; hit?: boolean } | null; readonly evtPre: { swarm: boolean; ball: boolean; rain: boolean; elites: Set<number>; boss: Set<number> };
  readonly scene: B.Scene; coopRate: () => number;
  liveM: () => Player[]; others: () => Player[]; useAbility: (c: Car) => void; carJump: (c: Car, r: { fs: number; slope?: number }) => void;
  trick: (name: string, k: number) => void; spawnEnemy: (kind: Kind, p: B.Vector3) => void; hudDrive: (k: number, name?: string) => void;
  hurt: (n: number, continuous?: boolean, src?: string, by?: Kind) => void;
}
let D!: RunDriveContext;
export function initRunDrive(x: RunDriveContext) { D = x; }
let dustT = 0, skidT = 0, smokeT = 0, smashCd = 0, driftHold = 0, miniT = 0, wasBoosting = false;
/** Grados extra de campo de visión que pide el turbo (4) o el mini-turbo (2,5); lo suaviza camera_rig. */
/** Reinicia el mini-turbo y el turbo del cuadro anterior: sin esto se arrastran a la partida siguiente (clearRun). */
export const resetDrive = () => { driftHold = miniT = 0; wasBoosting = false; };
export const boostFov =() => (wasBoosting ? 4 : miniT > 0 ? 2.5 : 0); // mini-turbo: segundos de derrape sostenido, impulso restante, turbo del cuadro anterior
const YARD_PULSES = [225, 345] as const;
const _moveF = new B.Vector3(), _moveR = new B.Vector3(), _moveWant = new B.Vector3(), _moveFwd = new B.Vector3(), _spawnOff = new B.Vector3(), _ahead = new B.Vector3();

// Fases de update() de la partida (clima, habilidad, manejo, embestida, aparición, eventos del patio, vitales). Estado compartido con main.ts por D (initRunDrive).
export function tickWeather(F: Frame, dt: number) {
  // Ciclo de luz: se reaplica solo cuando cambió lo suficiente (repinta cielo y sonda)
  // Lluvia: empieza a la fracción profile.rainAt de la partida; la intensidad sube suave
  const rainAtS = D.profile.rainAt * 600, { warnS } = F;
  if (!D.rainBanner && !D.evtPre.rain && run.time >= rainAtS - warnS && run.time < rainAtS) { D.evtPre.rain = true; radioEvent("lluvia_pre"); }
  const raining = run.time >= rainAtS;
  if (raining && !D.rainBanner) { D.rainBanner = true; radioEvent("lluvia"); }
  D.rainK = D.LAB.on && raining ? 1 : D.rainK + ((raining ? 1 : 0) - D.rainK) * Math.min(1, dt * RAIN.ramp);
  const s = nightfall(D.LAB.on ? D.LAB.t : run.time / 600);
  if (!D.simulating && Math.abs(s - D.cycleS) > 0.01) { D.cycleS = s; applyClimate(evBase(zoneClimate() ?? mixClimate(DUSK, D.profile.climate, s))); }
}

export function tickAbility(F: Frame, dt: number) {
  const { c, calm } = F;
  // --- Habilidad activa (efectos con el reloj real; wdt = paso del mundo, más corto en cámara lenta) ---
  run.abilCd -= dt;
  if (input.ability && run.abilCd <= 0) D.useAbility(c);
  else for (const m of D.liveM()) if (m.in.ability && run.abilCd <= 0) D.useAbility(m.car!); // R7b: cualquiera la dispara desde su auto (enfriamiento compartido)
  if (run.abilOn > 0 && (run.abilOn -= dt) <= 0) { run.worldK = 1; fxSpeed(1); if (D.shieldM) D.shieldM.isVisible = false; }
  if (run.abil === "escudo" && run.abilOn > 0) for (const m of D.players) if (m.car) m.hp = Math.min(D.lead.maxHp, m.hp + D.lead.maxHp * R.escudo_cura_s * dt); // 30% en 3 s (a todos)
  if (run.bombs > 0 && (run.bombT -= dt) <= 0) {
    run.bombs--; run.bombT = R.bombardeo_intervalo_s;
    const a = rng() * Math.PI * 2, d = 3 + rng() * 11, c = D.abilCar && !D.abilCar.root.isDisposed() ? D.abilCar : D.lead.car!; // R7b: caen alrededor de quien la disparó
    cs.src = "bombardeo"; explode(MOON.on ? onFloor(at(c.pos, Math.cos(a) * d, 0, Math.sin(a) * d), 0) : new B.Vector3(c.pos.x + Math.cos(a) * d, 0, c.pos.z + Math.sin(a) * d), R.bombardeo_radio, R.bombardeo_dano * D.st.dmg); cs.src = "";
  }
  const wdt = F.wdt = dt * run.worldK * run.weeklyK, cars = F.cars = [c, ...D.liveM().map((m) => m.car!)], carPs = F.carPs = cars.map((x) => x.pos); // R7b: autos vivos (0 = el que guía) para los eventos de la luna
  if (MOON.on && !calm) lunaEv(wdt, run.time, carPs, Math.max(c.def.size[0], c.def.size[2]) / 2, D.camYaw); // luna: lluvia de meteoritos y erupciones (moon_events.ts)
}

const _w = new B.Vector3();
/** Paseo libre: control en el aire (dirigir gira, acelerar/frenar cabecea; sin tecla se conserva el giro que traía) y velocidad ganada al bajar pendientes hasta libre_vel_bajada. */
function libreDrive(c: Car, r: ReturnType<typeof drive>, steer: number, throttle: number, dt: number, base: number) {
  const body = c.body, v = body.getLinearVelocity();
  if (r.grounded && v.y < -0.5) roam.extra = Math.min(Math.max(0, R.libre_vel_bajada - base), roam.extra - v.y * R.libre_acel_bajada * dt);
  else roam.extra = Math.max(0, roam.extra - 6 * dt); // ponytail: sin distinguir subida de llano; techo: usar la pendiente de drive() si hace falta
  const up = c.root.up, fw = c.root.forward, rt = c.root.right;
  // Cabeceo: solo si se suelta o cambia el acelerador después de despegar; mantenerlo apretado desde el piso (salir de un bowl) no voltea el auto
  if (r.grounded || roam.air < 0.15) { roam.ts = throttle; roam.arm = false; } else if (throttle !== roam.ts) roam.arm = true;
  // Trampolín: al pisar la lona (y bajo, sobre la plataforma de 0,5 m) el impulso vertical lo da el código; la restitución de Havok casi no rebota con el auto conducido
  if (roam.tramp > 0) roam.tramp -= dt;
  else if (c.pos.y < 1.4 && v.y < 3 && TRAMPS.some(([x, z]) => (c.pos.x - x) ** 2 + (c.pos.z - z) ** 2 < 25)) { roam.tramp = 0.5; body.setLinearVelocity(_w.set(v.x, R.libre_rebote_tramp, v.z)); return; }
  // Volcado en el piso (techo abajo, casi sin velocidad vertical) más de libre_volcado_s: salto suave y giro sobre el eje de avance hasta quedar de ruedas
  if (roam.fix > 0) { // enderezando: giro sostenido sobre el eje de avance hasta quedar de ruedas (drive() pisa la velocidad angular cada cuadro)
    roam.fix = up.y > 0.8 ? 0 : roam.fix - dt;
    body.setAngularVelocity(_w.set(fw.x * 7 * roam.dir, fw.y * 7 * roam.dir, fw.z * 7 * roam.dir));
    return;
  }
  roam.vol = up.y < 0.2 && Math.abs(v.y) < 1.5 ? roam.vol + dt : 0;
  if (roam.vol > R.libre_volcado_s) {
    roam.vol = 0; roam.fix = 0.7; roam.dir = Math.sign(fw.z * up.x - fw.x * up.z) || 1; // dir: sentido del giro sobre fw que lleva el techo hacia arriba
    body.setLinearVelocity(_w.set(v.x, 6, v.z));
    return;
  }
  const spin = spinHeld();
  if (r.grounded || roam.air < 0.15 || (!steer && !throttle && !spin)) return; // roam.air: la rampa empinada hace parpadear "grounded"; el control entra tras 0,15 s de vuelo real
  const w = body.getAngularVelocity();
  const wU = steer ? steer * R.libre_giro_aire : B.Vector3.Dot(w, up), wR = spin ? (throttle < 0 ? -1 : 1) * R.libre_cabeceo_aire : throttle && roam.arm && roam.air > R.libre_cabeceo_espera_s ? throttle * R.libre_cabeceo_aire : B.Vector3.Dot(w, rt), wF = B.Vector3.Dot(w, fw);
  _w.set(up.x * wU + rt.x * wR + fw.x * wF, up.y * wU + rt.y * wR + fw.y * wF, up.z * wU + rt.z * wR + fw.z * wF);
  body.setAngularVelocity(_w);
}

export function tickDrive(F: Frame, dt: number) {
  const { c } = F;
  // --- Manejo ---
  let throttle = input.throttle, steer = input.steer;
  if (input.move) {
    // Dirección relativa a la cámara: el auto gira solo hacia donde apunta el stick
    _moveF.set(Math.sin(D.camYaw), 0, Math.cos(D.camYaw));
    _moveR.set(_moveF.z, 0, -_moveF.x);
    _moveWant.set(_moveR.x * input.moveX + _moveF.x * input.moveY, 0, _moveR.z * input.moveX + _moveF.z * input.moveY);
    _moveFwd.copyFrom(MOON.on ? flatL(c.root.forward, c.pos) : c.root.forward); _moveFwd.y = 0; _moveFwd.normalize(); // luna: camYaw y el rumbo, en el marco local del auto
    const wl = _moveWant.length();
    throttle = Math.min(1, wl);
    if (wl > 1e-6) _moveWant.scaleInPlace(1 / wl);
    const diff = Math.atan2(B.Vector3.Cross(_moveFwd, _moveWant).y, B.Vector3.Dot(_moveFwd, _moveWant));
    steer = B.Scalar.Clamp(diff * 2.5, -1, 1);
  }
  const ariete = F.ariete = D.weapons.some((w) => w.id === "lanza" && w.evolved);
  const boosting = F.boosting = input.boost && D.lead.boost > R.turbo_umbral && throttle >= 0;
  D.lampBoost = boosting;
  if (boosting && !wasBoosting && !D.simulating) SFX.boostSurge();
  wasBoosting = boosting;
  if (miniT > 0) miniT -= dt;
  run.boostSec = boosting ? run.boostSec + dt : 0;
  D.lead.boost = boosting ? D.lead.boost - R.turbo_gasto * D.st.boostUse * dt : Math.min(100, D.lead.boost + D.st.boostRegen * dt);
  const maxSpeed = c.def.speed * D.st.speedMul * (boosting ? R.turbo_vel : 1) * (run.abil === "turbo" && run.abilOn > 0 ? R.turbo_hab_vel : 1) * (miniT > 0 ? R.mini_turbo_vel : 1) + roam.extra; // roam.extra: velocidad ganada en bajadas (solo Paseo libre, 0 en el resto)
  const r = F.r = drive(c.body, c.root, dt, {
    throttle: boosting || miniT > 0 ? 1 : throttle, steer, speed: maxSpeed,
    accel: c.def.accel * (boosting ? R.turbo_acel : 1),
    turn: c.def.turn * (input.drift ? R.derrape_giro : 1),
    grip: (() => {
      let g = (input.drift ? R.derrape_agarre : c.def.grip) * (1 - (1 - RAIN.grip) * D.rainK);
      if (!input.drift && D.rainK > 0) g *= 1 + R.lluvia_control * (1 - D.rainK);
      if (roam.on && enHielo(c.pos.x, c.pos.z)) g *= R.libre_agarre_hielo; // lago congelado
      return g;
    })(),
  });
  if (roam.on) libreDrive(c, r, steer, throttle, dt, c.def.speed * D.st.speedMul);
  if (r.impactSpeed > 4.0 && !D.simulating) {
    SFX.bodyThud(r.impactSpeed, r.impactPan);
    D.shake = Math.max(D.shake, Math.min(0.45, r.impactSpeed * 0.035));
  }
  c.animate(dt, steer, r.fs, maxSpeed);
  if (run.jumpCd > 0) run.jumpCd -= dt;
  if (r.grounded) D.coyoteT = R.salto_coyote_s;
  else D.coyoteT = Math.max(0, D.coyoteT - dt);
  const canJump = (r.grounded || D.coyoteT > 0) && run.jumpCd <= 0;
  if (input.jump && canJump) { run.jumpCd = R.salto_cd_s; D.coyoteT = 0; D.carJump(c, r); }
  const ms = F.ms = D.liveM(); // R7a/c: compañeros con auto (vacío = solo o todos fuera); mismo orden que `cars` 1..
  for (const m of ms) mateTick(m, dt);
  if (D.yardPulseIdx < YARD_PULSES.length && run.time >= YARD_PULSES[D.yardPulseIdx]) {
    D.yardPulseIdx++; D.yardPulseT = 10;
    if (!D.simulating && !MOON.on) { banner(zoneId === "jardin" ? "SOBREPRESIÓN EN ASPERSORES" : "PICOS DE TENSIÓN EN EL PATIO", 2.2); FX.sparks(c.pos.add(new B.Vector3(0, 0.6, 0))); }
  }
  if (D.yardPulseT > 0) D.yardPulseT = Math.max(0, D.yardPulseT - dt);
  { const zp = zoneTick(dt, c.pos, D.yardPulseT > 0); if (zp) c.body.setLinearVelocity(c.body.getLinearVelocity().addInPlace(zp)); } // aspersores del jardín
  engineSfx(Math.min(1, Math.abs(r.fs) / (c.def.speed * R.turbo_vel)), throttle, boosting, input.drift, floorAt(c.pos.x, c.pos.z));
  if (c.kind === "helado" && (D.jingleT -= dt) <= 0) { SFX.jingle(); D.jingleT = 16; }
  run.runDist += Math.abs(r.fs) * dt;
  // Combo de manejo: derrape largo, salto y aterrizaje limpio suben el multiplicador de XP (tope x2); un golpe lo corta (hurt)
  if (r.grounded) {
    const landing = !D.wasGrounded && run.airT >= 0.12;
    if (landing && !D.simulating) {
      const land = c.pos.add(c.root.forward.scale(-0.6));
      FX.dust(land);
      if (run.airT > 0.55) D.shake = Math.max(D.shake, Math.min(0.45, 0.12 + run.airT * 0.25));
    }
    if (run.airT >= 0.5 && !run.airHit) D.trick(Math.abs(r.ls) < 3 && Math.abs(r.fs) > 5 ? "SALTO LIMPIO" : "SALTO", Math.abs(r.ls) < 3 && Math.abs(r.fs) > 5 ? R.combo_salto_limpio : R.combo_salto);
    run.airT = 0; run.airHit = false;
    const drifting = input.drift && Math.hypot(r.fs, r.ls) > 6;
    if (!drifting && driftHold >= R.mini_turbo_min_s) { // soltar un derrape largo: tirón corto (ponytail: un solo nivel, sin carga por tramos como kart.ts)
      miniT = R.mini_turbo_s;
      if (!D.simulating) { SFX.miniTurbo(); const rear = c.pos.add(c.root.forward.scale(-1.1)); FX.sparks(rear.add(upv(rear, 0.3)), 14); FX.dust(rear); }
    }
    driftHold = drifting ? driftHold + dt : 0;
    run.driftT = input.drift && Math.hypot(r.fs, r.ls) > 6 ? run.driftT + dt : 0; // velocidad total: derrapando casi toda va de costado
    if (run.driftT >= R.combo_derrape_s) { run.driftT = 0; D.trick("DERRAPE LARGO", R.combo_derrape); }
  } else run.airT += dt;
  D.wasGrounded = r.grounded;
  // Sin trucos por 8 s el multiplicador baja solo, 0,1 por segundo hasta x1
  if ((run.trickT += dt) > R.combo_espera_s && run.driveMul > 1) { run.driveMul = Math.max(1, run.driveMul - R.combo_baja_s * dt); if (!D.simulating) D.hudDrive(run.driveMul); }
  setKmh(r.fs * 3.6, c.def.speed * D.st.speedMul * R.turbo_vel * 3.6);
  // Marcas de neumático, chirrido y humo al derrapar / patinar
  if (r.grounded && (Math.abs(r.ls) > 3.5 || (input.drift && Math.abs(r.fs) > 5)) && (skidT -= dt) <= 0) {
    skidT = 0.025;
    const yaw = yawOf(c.root.forward, c.pos);
    const fl = floorAt(c.pos.x, c.pos.z);
    for (const w of c.model.wheels) {
      if (!w.front) {
        const wp = w.m.getAbsolutePosition();
        mark("skid", wp, yaw, 1, 7);
        if (!D.simulating && (fl === "cemento" || fl === "tierra" || zoneId === "garaje")) {
          FX.tireFriction(wp, 2);
        }
      }
    }
    if (!D.simulating && Math.random() < 0.28) {
      SFX.brakeScreech();
    }
  }
  // Daño visible: humo con media vida, humo negro y chispas con poca
  if (D.lead.hp < D.lead.maxHp * 0.5 && (smokeT -= dt) <= 0) {
    smokeT = D.lead.hp < D.lead.maxHp * 0.25 ? 0.06 : 0.14;
    const p = c.pos.add(upv(c.pos, 0.6)).addInPlace(c.root.forward.scale(0.6));
    FX.smoke(p, D.lead.hp < D.lead.maxHp * 0.25);
    if (D.lead.hp < D.lead.maxHp * 0.25 && Math.random() < 0.3) FX.sparks(p);
  }
  if ((dustT -= dt) <= 0 && r.grounded && (Math.abs(r.ls) > 3 || boosting)) { dustT = 0.05; const rear = c.pos.add(c.root.forward.scale(-1.1)); FX.dust(rear); if (boosting) FX.sparks(rear.add(upv(rear, 0.3))); }
  if (run.boostSec > 1.5 && (D.motorFxT -= dt) <= 0) {
    D.motorFxT = 0.08;
    const motorPos = c.pos.add(c.root.forward.scale(-0.45)).addInPlace(new B.Vector3(0, 0.35, 0));
    FX.motorThermalFriction(motorPos, Math.min(2, run.boostSec - 1.2));
  } else if (run.boostSec <= 1.5) {
    D.motorFxT = 0;
  }
}

export function tickRam(F: Frame, dt: number) {
  const { c, r } = F;
  // Embestir objetos del patio los rompe y despide chispas/fricción según el material
  const spd = Math.abs(r.fs);
  if (spd > 9 && (smashCd -= dt) <= 0) {
    const pots = hitBreakables(c.pos, 1.3, spd * c.def.ram * 1.5);
    const heavyHit = hitHeavyProps(c.pos, 1.3, spd);
    if (pots.length || heavyHit) {
      smashCd = 0.25;
      if (pots.length) smashed(pots);
      if (heavyHit && D.st.bumper > 0) { cs.src = "paragolpes"; explode(c.pos, D.st.bumperR, D.st.bumper * D.st.dmg); cs.src = ""; if (!D.simulating) FX.sparks(c.pos, 12); } // Defensa de caucho: el choque suelta una onda que daña y empuja
      if (!D.simulating) {
        if (heavyHit === "drum") {
          SFX.propCrash("drum", spd);
          FX.rustSparks(c.pos, 18);
        } else if (heavyHit === "tire") {
          SFX.propCrash("tire", spd);
          FX.tireFriction(c.pos, 14);
        } else {
          SFX.bodyThud(spd * 0.4);
          FX.rustSparks(c.pos, 14);
          if (spd > 14) FX.tireFriction(c.pos, 10);
        }
      }
    }
  }
  // Destello de chispas bajo el haz del faro al pasar rasante cerca de tambores y chapas en la oscuridad
  if (!D.simulating && spd > 11 && Math.random() < 0.2) {
    const fwd = c.root.forward;
    for (const hp of heavyProps) {
      if (hp.type === "drum") {
        const d = B.Vector3.Distance(hp.m.position, c.pos);
        if (d > 1.8 && d < 6.5) {
          const toP = hp.m.position.subtract(c.pos).normalize();
          if (B.Vector3.Dot(fwd, toP) > 0.7) {
            FX.sparks(hp.m.position.add(new B.Vector3(0, 1.2, 0)), 3);
            break;
          }
        }
      }
    }
  }
  if (MOON.on ? alt(c.pos) < -5 : Math.abs(c.pos.x) > HALF + 5 || Math.abs(c.pos.z) > HALF + 5 || c.pos.y < (zoneId === "pileta" ? PIT.lo - 6 : -5)) D.lead.hp = 0; // el abismo: bajo el fondo de la pileta (la parte honda queda a -16)
}

// Eventos de mitad de partida (modo normal): 1 cada ~3-4 min, elegido con rng (semilla); aviso en el HUD antes. 1 lluvia de tornillos, 2 invasión, 3 apagón (este último lo aplica tickSpawner con setDark).
const EV_DUR = () => [0, R.evento_lluvia_s, R.evento_invasion_s, R.evento_apagon_s];
function tickMidEvent(F: Frame, dt: number) {
  const { c } = F;
  if (!run.evtT) { if (!run.evtEnd) evR = rngFrom(run.runSeed ^ 0x9e3779b9); run.evtT = run.time + R.evento_cada_min_s + evR() * R.evento_cada_rango_s; run.evtNext = 1 + Math.floor(evR() * 3); run.evtWarned = false; }
  if (run.evtId) {
    if (run.evtId === 1 && (run.evtGemT -= dt) <= 0) { run.evtGemT = R.evento_lluvia_cada_s; dropGems(spawnPoint(c.pos, 4, 18), R.evento_lluvia_xp, true); }
    if (run.time >= run.evtEnd) { run.evtId = 0; run.evtT = 0; }
    return;
  }
  const dur = EV_DUR()[run.evtNext], boss = D.RUN_BOSSES[run.bossIdx]?.[0] ?? Infinity;
  if (run.time >= run.evtT - R.evento_aviso_s && boss < run.evtT + dur + 6) { run.evtT = boss + 20; run.evtWarned = false; return; } // no se pisa con un jefe (ni con su apagón)
  if (!run.evtWarned && run.time >= run.evtT - R.evento_aviso_s) { run.evtWarned = true; if (!D.simulating) radioEvent(`ev${run.evtNext}_pre` as "ev1_pre"); }
  if (run.time >= run.evtT) { run.evtId = run.evtNext; run.evtEnd = run.time + dur; run.evtGemT = 0; run.lluviaGems = 0; if (!D.simulating) radioEvent(`ev${run.evtId}` as "ev1"); }
}

export function tickSpawner(F: Frame, dt: number) {
  const { c, ms, calm, tp, wdt, warnS } = F;
  if (!MOON.on && !erun && !calm && D.duel < 0 && !run.endless) tickMidEvent(F, dt);
  const evK = run.evtId === 2 ? R.evento_invasion_mult : 1, hordeK = F.hordeK * evK;
  // --- Aparición de enemigos ---
  // Tope de vivos y ritmo: con el bot que pelea jefes (devbot.ts) quedó en ~50% de victorias (__sim, 40 semillas).
  // ponytail: más densidad casi no baja la tasa (más bichos = más XP); el techo real está en las fusiones repetidas
  const maxAlive = D.duel >= 0 ? D.duel : calm || calmFirst() ? 0 : Math.min(D.low ? R.tope_vivos_tactil : R.tope_vivos_pc, (R.tope_vivos_base + tp / R.tope_vivos_seg) * hordeK * D.TOUGH.count * D.coopRate()) * (MOON.on ? R.luna_tope_mult : 1); // Horda: +50%. Tope 100 en compu, 60 en táctil
  // Aparecen sesgados hacia donde vas: manejar no es escapar gratis
  const cv = F.cv = c.body.getLinearVelocity();
  hflat(_spawnOff.copyFrom(cv), c.pos).scaleInPlace(R.spawn_adelanto_s);
  _ahead.copyFrom(c.pos).addInPlace(_spawnOff);
  let normals = 0;
  for (const e of D.enemies) if (!e.def.boss) normals++;
  run.spawnAcc += (R.spawn_base + tp / R.spawn_seg) * wdt * hordeK * D.TOUGH.count * D.coopRate() * (MOON.on ? R.luna_aparicion_mult : 1);
  // Con la cámara más alejada que el zoom por defecto (1.35) el anillo de aparición se abre igual, para no verlos nacer
  // Anillo fijo, fuera de cuadro aun con el zoom máximo (2): la partida no cambia según el zoom elegido
  while (run.spawnAcc >= 1) { run.spawnAcc--; if (normals < maxAlive) D.spawnEnemy(pickWeighted(spawnTable(tp, zoneId === "cocina" ? kitchenPlague(D.profile.plague) : D.profile.plague)), spawnPoint(ms.length && (D.spawnN = (D.spawnN + 1) % (ms.length + 1)) ? ms[D.spawnN - 1].car!.pos : _ahead, R.spawn_anillo_min, R.spawn_anillo_max)); } // R7a: con 2 autos, una aparición alrededor de cada uno
  // Formaciones: columna de hormigas (ordenadas tras una líder) o escarabajo con escolta de autitos a fricción
  if (tp > R.formacion_desde_s && (run.groupT -= dt) <= 0 && normals < maxAlive - R.formacion_margen) {
    run.groupT = R.formacion_cada_min + rng() * R.formacion_cada_rango;
    const p0 = spawnPoint(_ahead, R.spawn_anillo_min, R.spawn_anillo_max), ant = tp < R.formacion_hormiga_hasta_s || rng() < R.formacion_hormiga_prob;
    D.spawnEnemy(ant ? "hormiga" : "escarabajo", p0);
    const ldr = D.enemies[D.enemies.length - 1];
    const n = ant ? R.formacion_hormigas_base + Math.floor(tp / R.formacion_hormigas_seg) : R.formacion_escolta;
    for (let i = 1; i <= n; i++) {
      const a = (i / n) * 6.28, slot = ant ? new B.Vector3(0, 0, 1.8 * i) : new B.Vector3(Math.sin(a) * 4.5, 0, Math.cos(a) * 4.5);
      D.spawnEnemy(ant ? "hormiga" : "friccion", at(p0, slot.x, 0, -slot.z));
      const f = D.enemies[D.enemies.length - 1];
      f.leader = ldr; f.slot.copyFrom(slot); f.spd = R.formacion_vel;
    }
    if (!D.simulating) banner(ant ? "COLUMNA" : "ESCOLTA", 1.2);
  }
  if (!D.evtPre.swarm && run.swarmT > 0 && run.swarmT <= warnS) { D.evtPre.swarm = true; radioEvent("enjambre_pre"); }
  if (erun?.phase === "overload" && (run.ovT -= dt) <= 0) { run.ovT = E.ENC.overloadEvery; run.swarmT = 0; } // OVERLOAD: enjambres seguidos durante la carga
  if ((run.swarmT -= dt) <= 0) {
    D.evtPre.swarm = false;
    run.swarmT = D.profile.swarmEvery;
    radioEvent("enjambre");
    const ov = erun?.phase === "overload", ns0 = Math.round((R.enjambre_base + tp / R.enjambre_seg) * F.hordeK * D.TOUGH.count * D.coopRate() * (ov ? E.ENC.overloadK : 1)), ns = ov ? Math.min(ns0, E.ENC.overloadMax) : ns0; // el enjambre crece con la partida
    for (let i = 0; i < ns; i++) { const a = (i / ns) * Math.PI * 2; const p = MOON.on ? ringAt(c.pos, a, R.enjambre_radio) : new B.Vector3(c.pos.x + Math.cos(a) * R.enjambre_radio, 1, c.pos.z + Math.sin(a) * R.enjambre_radio); if (Math.abs(p.x) < HALF - 3 && Math.abs(p.z) < HALF - 3) D.spawnEnemy("hormiga", p); }
  }
  if (getModoTranquilo() && run.time >= 600) grant("zen");
  if (run.endless && run.time - (run.bank?.t ?? 0) >= 900) grant("sinfin");
  if (run.time - Math.max(hitAt, 300) >= 60) grant("intacto"); // 60 s sin daño, contando desde el minuto 5
  const bossWarnS = R.aviso_jefe_s * D.st.aviso; // Antena de radio: más anticipación
  for (let bi = run.bossIdx; bi < D.RUN_BOSSES.length; bi++) {
    const [bt, bk] = D.RUN_BOSSES[bi];
    if (!D.evtPre.boss.has(bi) && run.time >= bt - bossWarnS && run.time < bt) {
      D.evtPre.boss.add(bi);
      const fin = !run.endless && bi === D.RUN_BOSSES.length - 1 && bk === run.finalKind;
      if (!D.simulating && erun?.phase === "final") say("boss_intro"); // FINAL ACT: la presentación la hace el Director
      else if (!D.simulating) radioBoss("pre", MOON.on && bk !== run.finalKind && !minorMini() ? SHIP_NAME[minorShip(bi)] : DEF[(bk !== run.finalKind && minorMini()) || bk].name, fin); // luna: los minijefes son naves
    }
  }
  // Apagón: 4 s antes de cada jefe se apagan luna y ambiente (queda el faro); vuelve en 3 s tras la entrada
  if (!D.simulating) {
    const next = D.RUN_BOSSES[run.bossIdx]?.[0] ?? Infinity, prev = D.RUN_BOSSES[run.bossIdx - 1]?.[0] ?? -Infinity;
    const d = Math.max(Math.min(1, Math.max(0, (run.time - next + 4) / 1.5)), Math.max(0, 1 - (run.time - prev) / 3));
    const evD = run.evtId === 3 ? Math.min(1, R.evento_apagon_s - (run.evtEnd - run.time), (run.evtEnd - run.time) / 1.5) : 0; // Apagón de evento: baja en 1 s, vuelve en 1.5 s
    const dd = Math.max(d, evD, 0), dark = evD > d ? R.evento_apagon_oscuridad : 0.88;
    if (dd > 0 || D.darkK < 1) { D.darkK = 1 - dark * dd; setDark(D.darkK); }
    if (!D.apagon && run.time >= next - 4) { D.apagon = true; banner("APAGÓN, SIN SERVICIO", 2); }
  }
  if (run.bossIdx < D.RUN_BOSSES.length && run.time >= D.RUN_BOSSES[run.bossIdx][0]) {
    D.apagon = false;
    const k0 = D.RUN_BOSSES[run.bossIdx++][1], mini = k0 !== run.finalKind ? minorMini() : null, kind = mini ?? k0, ship = MOON.on && kind !== run.finalKind && !mini ? minorShip(run.bossIdx - 1) : null; // luna: minijefe = nave (moon_ships.ts)
    if (ship) shipSpawn(ship, c.pos, run.time); else D.spawnEnemy(kind, spawnPoint(c.pos, 30, 36));
    if (MOON.on && kind === run.finalKind && !run.endless && !erun) rocketLand(c.pos, D.simulating); // luna: con el gusano aterriza el cohete de escape (moon_goals.ts)
    if (run.endless) { // modo sin fin: otro jefe repetido en 2 min (rotan los tres de la partida) y cada vez con más vida
      D.RUN_BOSSES.push([run.time + R.sinfin_cada_s, D.RUN_BOSSES[D.RUN_BOSSES.length % 3][1]]);
      if (!ship) { const b = D.enemies[D.enemies.length - 1]; b.hp = b.maxHp *= run.time / R.sinfin_vida_div; }
    }
    const bname = ship ? SHIP_NAME[ship] : DEF[kind].name;
    const fin = !run.endless && kind === run.finalKind;
    if (!D.simulating) radioBoss("now", bname, fin);
    banner(bname, 2.5);
    hudBoss(bname, 1, ship ? undefined : kind);
    SFX.boss();
  }
  for (let ei = 0; ei < D.profile.elites.length; ei++) {
    const [t, k] = D.profile.elites[ei];
    if (!D.evtPre.elites.has(ei) && run.time >= t - warnS && run.time < t) {
      D.evtPre.elites.add(ei);
      radioEvent(k === "rapida" ? "elite_rapida_pre" : "elite_blindada_pre");
    }
  }
  // Élites (run.ts: 2-3 por partida, sin rng): la aparición común más reciente (mejor si no es hormiga) se vuelve élite
  for (const [t, k] of D.profile.elites) if (t <= run.time && t > run.time - dt) {
    let e: Enemy | undefined, fallback: Enemy | undefined;
    for (let i = D.enemies.length - 1; i >= 0; i--) {
      const x = D.enemies[i];
      if (x.def.boss || x.elite) continue;
      fallback ??= x;
      if (x.kind !== "hormiga") { e = x; break; }
    }
    e ??= fallback;
    if (e) { e.makeElite(k); radioEvent(k === "rapida" ? "elite_rapida" : "elite_blindada"); }
  }
}
export function tickYardEvents(F: Frame, dt: number) {
  const { c, wdt, warnS, carR } = F;
  // --- Eventos del patio ---
  if ((run.chestT -= dt) <= 0) { run.chestT = D.profile.chestEvery; dropPickup(spawnPoint(c.pos, 20, 35), "cofre"); radioEvent("cofre"); }
  if (!D.evtPre.ball && !D.ball && run.ballT > 0 && run.ballT <= warnS) { D.evtPre.ball = true; radioEvent("pelota_pre"); }
  if ((run.ballT -= dt) <= 0 && !D.ball) {
    D.evtPre.ball = false;
    // Una pelota gigante cruza el patio aplastando todo
    run.ballT = D.profile.ballEvery;
    const from = spawnPoint(c.pos, 40, 45);
    const m = sph(R.pelota_diametro, pbr("bigball", { color: "#f97316", rough: 0.45 }), [from.x, 4, from.z], undefined, 16);
    if (MOON.on) onFloor(from, 4, m.position); // antes del cuerpo físico
    shadows.addShadowCaster(m);
    const agg = new B.PhysicsAggregate(m, B.PhysicsShapeType.SPHERE, { mass: R.pelota_masa, restitution: 0.5 }, D.scene);
    FOOT.set(agg.body, R.pelota_diametro / 2); ROLL.add(agg.body); // luna: rueda (moon.ts)
    agg.body.setLinearVelocity((MOON.on ? hflat(c.pos.subtract(from), from) : c.pos.subtract(from)).normalize().scale(R.pelota_vel));
    D.ball = { m, agg, life: R.pelota_vida_s };
    radioEvent("pelota");
  }
  if (D.ball) {
    cs.src = "pelota";
    for (const e of D.enemies) if (!e.def.boss && B.Vector3.Distance(e.pos, D.ball.m.position) < R.pelota_diametro / 2 + e.radius) damage(e, 999);
    cs.src = "";
    if (!D.ball.hit && B.Vector3.Distance(c.pos, D.ball.m.position) < R.pelota_diametro / 2 + carR) { D.ball.hit = true; D.hurt(R.pelota_dano, false, "pelota"); }
    if ((D.ball.life -= wdt) <= 0) { D.ball.agg.dispose(); D.ball.m.dispose(); D.ball = null; }
  }
}

export function tickVitals(F: Frame, dt: number) {
  const { c } = F;
  D.lead.hp = Math.min(D.lead.maxHp, D.lead.hp + D.st.regen * dt);
  if (D.lead.hp <= 0 && run.revives > 0) { run.revives--; D.lead.hp = D.lead.maxHp * R.revive_vida; explode(c.pos, R.revive_radio, R.revive_dano); banner("PRÓRROGA: BATERÍA DE RESERVA", 2); }
  for (const m of D.others()) if (m.car && m.hp <= 0) mateDown(m); // R7a: el compañero cae y vuelve en el escenario siguiente
  if (D.lead.hp <= 0 && D.liveM().length) mateLead(); // R7a: cae el que guía; el otro sigue y toma su lugar (armas, cámara y XP compartidas)
  if (D.lead.hp <= 0) return run.endless ? endRun(true, "El auto quedó destrozado en el modo sin fin. Las horas extra no se pagan.") : endRun(false, "El auto quedó destrozado. Se aceptan reclamos, pero nadie los lee.");
  if (run.pendingLevels > 0 && D.state === "play") { run.pendingLevels--; openOffers(offersFor(), `Nivel ${run.level - run.pendingLevels}`); }
}
