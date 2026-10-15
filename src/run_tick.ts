import { BAL } from "./balance";
import { escapeTick, LIVE, type Ctx } from "./weapons";
import * as E from "./encore";
import { FX, mark } from "./fx";
import type { Kind, Enemy } from "./enemies";
import { MOON, W, advance, alt, at, below, deform, hd, hflat, onFloor, orient, rad, upAt, upv, yawOf } from "./moon";
import { SFX, SPACE, music } from "./sfx";
import { radio } from "./radio";
import { alienWave, healTick } from "./aliens";
import { banner, hudBoss, threatAt } from "./ui";
import { boom, boomK, cs, damage, explode, hitstop, kill } from "./combat";
import { craterHumeante, panTo } from "./moon_events";
import { encApply, erun } from "./encore_run";
import { gainXp, openChest } from "./progression";
import { goalBar, goalsTick } from "./moon_goals";
import { mateHurt } from "./coop";
import { dirtyWaterTemplate, nutTemplate as nutTpl } from "./models";
import { rng } from "./rng";
import { nearestIdx } from "./enemies/logic";
import { CP } from "./car";
import { run } from "./run_state";
import { grant } from "./outro";
import { shipBar, shipTargets, shipsTick } from "./moon_ships";
import { skyTick } from "./moon_sky";
import { tut } from "./tutorial";
import { wormOut } from "./moon_worm";
import { HALF, groundY } from "./world";
import * as B from "@babylonjs/core";
import type { Car, drive } from "./car";
import type { Player } from "./coop";
import type { Gem, Pickup } from "./combat";
import type { Weapon, PStats } from "./weapons";

// Fases de update() de la partida (bichos, armas, recolectables): estado compartido por T (initRunTick), lo de la partida en `run`.
const R = BAL.ritmo, ATK = BAL.ataques;
export type Spit = { m: B.InstancedMesh; v: B.Vector3; life: number; k?: Kind; float?: boolean; big?: boolean; bounce?: number; dmg?: number };
export type Frame = { c: NonNullable<Player["car"]>; calm: boolean; tp: number; hordeK: number; warnS: number; carR: number; wdt: number; cars: Car[]; carPs: B.Vector3[]; ms: Player[]; r: ReturnType<typeof drive>; boosting: boolean; ariete: boolean; cv: B.Vector3 };
export interface RunTickContext {
  readonly cam: B.FreeCamera;
  readonly scene: B.Scene;
  readonly TOUGH: { count: number; hp: number; dmg: number; xp: number };
  readonly lead: Player;
  readonly enemies: Enemy[];
  readonly gems: Gem[];
  readonly pickups: Pickup[];
  readonly spits: Spit[];
  readonly weapons: Weapon[];
  readonly st: PStats;
  readonly state: string;
  readonly simulating: boolean;
  readonly camYaw: number;
  guestE: Enemy | null;
  musicS: string;
  musicT: number;
  apagon: boolean;
  shake: number;
  hurt: (n: number, continuous?: boolean, src?: string, by?: Kind) => void;
  hurtWho: (n: number, continuous: boolean, src: string, who: number) => void;
  others: () => Player[];
  pushSpit: (s: Spit) => void;
  spawnEnemy: (kind: Kind, p: B.Vector3) => void;
  spitTpl: () => B.Mesh;
  flemaTpl: () => B.Mesh;
  stunned: (e: Enemy, dt: number) => boolean | undefined;
}
let T!: RunTickContext;
export function initRunTick(x: RunTickContext) { T = x; }
let touchIFrame = 0;
let lastRamHs = -99; // run.time del último hit-stop por embestida (tope hitstop_embestida_cada_s)
const teleOn = new WeakSet<Enemy>(); // enemigos con telegráfico visible el cuadro anterior (flanco de subida = sonido)

export function tickEnemies(F: Frame, dt: number): boolean {
  const { c, ms, calm, cv, boosting, ariete, wdt, carR, carPs } = F;
  // --- Enemigos ---
  let contactHit = 0, contactBy: Kind | undefined;
  const mateHit = ms.map(() => 0), mcv = ms.map((m) => m.car!.body.getLinearVelocity()), mateR = ms.map((m) => Math.max(m.car!.def.size[0], m.car!.def.size[2]) / 2);
  for (const e of T.enemies) {
    // En formación va al lugar que le toca junto a su líder; cerca del auto (o sin líder) ataca por su cuenta
    let d1 = hd(e.pos, c.pos), m1 = Infinity, near = c.pos; // R7a/c: persigue al auto vivo más cercano
    for (const m of ms) { const d = hd(e.pos, m.car!.pos); if (d < m1) { m1 = d; if (d < d1) near = m.car!.pos; } }
    const nd = Math.min(d1, m1);
    const ld = e.leader && e.leader.hp > 0 && nd > 14 ? e.leader : null;
    if (e.leader && !ld && nd <= 14) e.leader = null;
    const tgt = ld ? ld.pos.add(ld.node.right.scale(e.slot.x)).addInPlace(ld.node.forward.scale(-e.slot.z)) : near;
    const scared = CP.scare && d1 < BAL.ritmo.rasgo_misterio_radio; // rasgo del Detective Peludo
    if (scared) e.spd *= BAL.ritmo.rasgo_misterio_lento;
    if (CP.trail && !e.def.boss && cv.length() > BAL.ritmo.rasgo_murcielago_vel * c.def.speed * T.st.speedMul && d1 < 5 && B.Vector3.Dot(e.pos.subtract(c.pos), c.root.forward) < 0) { damage(e, BAL.ritmo.rasgo_murcielago_dps * wdt); if (rng() < 0.05) FX.sparks(e.pos, 2); } // estela del Vigilante
    let aimAt = tgt;
    if (e.kind === "ladron" && e.state === 0) { // ladrón (ai/comunes.ts): va por la gema más cercana y se la lleva; con el botín lleno huye
      const gi = nearestIdx(e.pos, T.gems, (g) => g.m.position, ATK.ladron_alcance);
      if (gi >= 0) {
        const g = T.gems[gi];
        if (hd(e.pos, g.m.position) < ATK.ladron_robo_dist) { e.loot += g.xp; g.m.dispose(); T.gems.splice(gi, 1); if (e.loot >= ATK.ladron_tope_xp) e.state = 1; if (!T.simulating) FX.sparks(e.pos.add(upv(e.pos, 0.5)), 4); }
        else aimAt = g.m.position;
      }
    }
    const ev = e.stun > 0 && e.kind !== "gusano" ? T.stunned(e, wdt) : e.update(wdt, aimAt); // el gusano no se aturde (lo mueve su IA, también enterrado)
    if (scared) e.spd /= BAL.ritmo.rasgo_misterio_lento;
    if (!T.simulating) { // aviso de ataque: flecha en el borde si está fuera de cámara y, en jefes, clac propio al aparecer el telegráfico
      const tz = e.tele[0], on = !!tz?.isVisible;
      if (on) threatAt(tz.position, 0.25);
      if (on !== teleOn.has(e)) { if (on) { teleOn.add(e); if (e.def.boss) SFX.bossTele(e.kind); } else teleOn.delete(e); }
    }
    if (ev === "spit_aim" && !T.simulating) { const f = e.node.forward; FX.sparks(e.pos.add(upv(e.pos, 0.5))); mark("scorch", e.pos, yawOf(f, e.pos), 0.35, 4); }
    if (ev === "worm_up" || ev === "worm_down") { // gusano lunar (moon_worm.ts): cráter al salir y al hundirse; al salir golpea lo que esté encima
      deform(e.land, ATK.gusano_aviso_radio, ATK.gusano_crater_hondo); craterHumeante(e.land, ATK.gusano_aviso_radio, !T.simulating);
      if (!T.simulating) { FX.dust(e.land); FX.sparks(onFloor(e.land, 0.5), 14); T.shake = Math.max(T.shake, 0.4); }
      if (ev === "worm_up") ms.forEach((m, j) => hd(m.car!.pos, e.land) < ATK.gusano_aviso_radio + mateR[j] && mateHurt(m, e.def.dmg * T.TOUGH.dmg * (e.enraged ? ATK.segunda_barra_dano : 1))); // R7b/c: también a los otros autos
      if (ev === "worm_up" && hd(c.pos, e.land) < ATK.gusano_aviso_radio + carR) T.hurt(e.def.dmg * T.TOUGH.dmg * (e.enraged ? ATK.segunda_barra_dano : 1), false, "salida " + e.kind, e.kind);
    }
    if (ev === "kaboom") { boomK(e); e.hp = -1e9; continue; } // kamikaze (ai/comunes.ts): se fue sin dejar premio
    if (ev === "snipe") { // francotirador (ai/comunes.ts): bala recta por la línea marcada, sin caída; solo daña si el auto sigue ahí
      const m = T.spitTpl().createInstance("bala"), d = new B.Vector3(Math.sin(e.aim), 0, Math.cos(e.aim));
      m.scaling.set(0.5, 0.5, 2.4); m.rotation.y = e.aim; m.position.copyFrom(at(e.pos, 0, 0.7, 0));
      T.pushSpit({ m, v: d.scale(ATK.francotirador_vel), life: ATK.francotirador_largo / ATK.francotirador_vel + 0.3, k: e.kind, bounce: 0, dmg: ATK.francotirador_dano });
      if (!T.simulating) FX.sparks(e.pos.add(upv(e.pos, 0.7)));
    }
    if (ev === "boom") { boom(e); e.hp = -1e9; continue; } // explosivo alien (aliens.ts): se fue sin dejar premio
    if (e.kind === "curandero" && e.stun <= 0) healTick(e, T.enemies, wdt, !T.simulating); // rayo que cura (aliens.ts)
    if (ev === "wave") { T.pushSpit(alienWave(e, c.pos)); if (!T.simulating) SPACE.alienWave(panTo(c.pos, e.pos, T.camYaw), hd(c.pos, e.pos)); } // tirador de onda (aliens.ts): anillo lento, se esquiva
    if (ev === "spit") {
      // Apunta adonde vas a estar (predicción simple): esquivar = cambiar de rumbo
      const cvl = c.body.getLinearVelocity(), from = at(e.pos, 0, 0.6, 0);
      const big = e.kind === "babosa", vel = big ? ATK.babosa_flema_vel : ATK.acido_vel; // la babosa tira una flema grande y lenta
      const t = B.Vector3.Distance(from, c.pos) / vel, aim = c.pos.add(hflat(cvl.clone(), c.pos).scale(t * 0.8));
      const m = (big ? T.flemaTpl() : T.spitTpl()).createInstance("sp");
      if (big) m.scaling.setAll(ATK.babosa_flema_escala);
      m.position.copyFrom(from);
      T.pushSpit({ m, v: aim.subtract(from).normalize().scale(vel), life: big ? 5 : 2.2, k: e.kind, big });
    }
    if (e.stun <= 0) e.animate(wdt);
    if (e.phaseUp) { e.phaseUp = false; banner(`${e.def.name} PIERDE LA PACIENCIA`, 2); T.shake = Math.max(T.shake, 1); SFX.boss(); }
    if (ev === "meow") { // Eulalio llama polillas alrededor suyo
      banner("¡MIAU!", 1.2);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.28 + rng(); T.spawnEnemy("polilla", at(e.pos, Math.sin(a) * 6, 0, Math.cos(a) * 6)); }
    }
    if (ev === "slam") {
      FX.slam(e.pos, 10);
      mark("scorch", e.pos, 0, 7, 10);
      T.shake = 1.2;
      if (B.Vector3.Distance(e.pos, c.pos) < ATK.salto_radio) T.hurt(ATK.salto_dano, false, "salto " + e.kind, e.kind);
      for (const o of T.enemies) if (o !== e && B.Vector3.Distance(o.pos, e.pos) < ATK.salto_aplasta_radio) damage(o, 999);
    }
    // Jefes finales nuevos (T.enemies.ts): tuercas en abanico, barrido en arco, cables y succión
    if (ev === "fan") for (const d of e.fan) { const m = (e.kind === "limpiafondos" ? dirtyWaterTemplate() : nutTpl()).createInstance("nut"); at(e.pos, d.x * 3.4, 0.7, d.z * 3.4, m.position); T.pushSpit({ m, v: W(d.x, d.y, d.z, e.pos).scale(ATK.acido_vel), life: 2.2, k: e.kind }); } // e.fan: marco local del jefe
    // Muñeco de ventrílocuo (ai/muneco.ts): la voz rebota en las paredes y, enojado, deja copias falsas
    if (ev === "voz") {
      const f2 = e.enraged, n = f2 ? ATK.muneco_voz_n_f2 : ATK.muneco_voz_n, base = Math.atan2(c.pos.x - e.pos.x, c.pos.z - e.pos.z);
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * ATK.muneco_voz_ang, m = T.spitTpl().createInstance("voz");
        m.scaling.setAll(2); m.position.set(e.pos.x, e.pos.y + 1.6, e.pos.z);
        T.pushSpit({ m, v: new B.Vector3(Math.sin(a), 0, Math.cos(a)).scaleInPlace(ATK.muneco_voz_vel), life: 9, k: e.kind, bounce: ATK.muneco_voz_rebotes, dmg: ATK.muneco_voz_dano });
      }
      if (!T.simulating) FX.sparks(e.pos.add(upv(e.pos, 3)));
    }
    if (ev === "desdoble") {
      banner("¡EL MUÑECO SE DESDOBLA!", 1.6);
      for (let i = 0; i < ATK.muneco_copias; i++) { const a = (i / ATK.muneco_copias) * 6.28 + 1; T.spawnEnemy("falso", at(e.pos, Math.sin(a) * 7, 0.5, Math.cos(a) * 7)); }
    }
    if (ev === "slash") { T.hurt(ATK.cortacercos_barrido_dano, false, "barrido " + e.kind, e.kind); FX.sparks(c.pos); }
    if (ev === "onda") { T.hurt(ATK.caja_onda_dano, false, "barrido " + e.kind, e.kind); FX.sparks(c.pos); T.shake = Math.max(T.shake, 0.6); }
    if (ev === "bailarina") { T.hurt(ATK.caja_bail_dano, false, "contacto " + e.kind, e.kind); FX.sparks(c.pos); }
    if (ev === "shock") { T.hurt(ATK.cortacercos_cable_dano, false, "cables", e.kind); FX.sparks(c.pos); }
    if (e.pull && e.stun <= 0) { const d = hflat(e.pos.subtract(c.pos), c.pos).normalize().scaleInPlace(e.pull * wdt); c.body.setLinearVelocity(c.body.getLinearVelocity().addInPlace(d)); }
    const dist = hd(e.pos, c.pos);
    if (!e.def.boss && !e.elite && ms.reduce((d, m) => Math.min(d, hd(e.pos, m.car!.pos)), dist) > R.reciclar_distancia) { e.hp = -1e9; continue; } // muy lejos: se recicla (la élite no: lleva cofre)
    if (e.kind === "cortadora" && e.stun <= 0) for (const o of T.enemies) if (o !== e && !o.def.boss && B.Vector3.Distance(o.pos, e.pos) < e.radius + 0.5) damage(o, 999); // corta todo
    if (dist < e.radius + carR && rad(c.pos) - rad(e.pos) < e.def.size[1] + 0.5) {
      const dir = hflat(e.pos.subtract(c.pos), c.pos).normalize();
      const rel = B.Vector3.Dot(cv, dir); // solo cuenta TU velocidad hacia el enemigo
      if (rel > R.embestida_vel_min && e.ramCd <= 0) {
        const lanza = T.weapons.find((w) => w.id === "lanza");
        const dmg = rel * c.def.ram * (1 + BAL.armas.lanza.dano_nivel * (lanza?.lv ?? 0)) * (boosting ? (c.kind === "axel" ? R.embestida_turbo_axel : R.embestida_turbo) : 1) * (run.abil === "turbo" && run.abilOn > 0 ? R.turbo_hab_embestida : 1) * T.st.dmg * T.st.ram * (lanza?.evolved ? BAL.armas.lanza.dano_evo_mult : 1);
        cs.src = "embestida";
        damage(e, dmg, dir.scale(rel * 0.8).addInPlace(upv(e.pos, rel * 0.2)), true);
        FX.sparks(e.pos.add(upv(e.pos, 0.5)));
        SFX.ram(rel);
        if (rel > R.embestida_vel_min * R.hitstop_embestida_x && Math.abs(run.time - lastRamHs) >= R.hitstop_embestida_cada_s) { lastRamHs = run.time; hitstop((rel - R.embestida_vel_min * R.hitstop_embestida_x) / 10); }
        if ((e.def.boss || e.elite || e.def.mass > 50) && rel > 3.5) {
          const pan = panTo(c.pos, e.pos, T.camYaw); // luna: en el marco local del auto
          SFX.bodyThud(rel, pan);
        }
        e.ramCd = R.embestida_recarga_s;
        T.shake = Math.max(T.shake, 0.25);
        if (ariete) explode(e.pos, BAL.armas.lanza.area_evo, dmg * BAL.armasExtra.lanza_ariete_dano);
        cs.src = "";
        // Embestir algo más pesado que vos tiene costo: rebote y daño (salvo Ariete)
        if (e.def.mass > c.def.mass * T.st.mass * R.embestida_rebote_masa && !ariete) {
          if (e.touchCd <= 0) { T.hurt(e.def.dmg * R.contacto_dano * T.TOUGH.dmg, false, "rebote " + e.kind, e.kind); e.touchCd = R.contacto_recarga_s; }
          c.body.applyImpulse(dir.scale(-rel * R.embestida_rebote * c.def.mass).addInPlace(upv(c.pos, R.embestida_rebote_y)), c.pos);
        }
      } else if (rel <= R.embestida_vel_min && !(ariete && boosting) && e.touchCd <= 0 && e.stun <= 0) {
        const cd = e.def.dmg * R.contacto_dano * (e.def.boss ? 1 : T.TOUGH.dmg);
        if (cd > contactHit) contactBy = e.kind;
        contactHit = Math.max(contactHit, cd); // el golpe más fuerte, no la suma
        e.touchCd = R.contacto_recarga_s;
        if (!e.def.boss) e.body.applyImpulse(dir.scale(R.contacto_empuje_bicho * e.def.mass), e.pos);
        // Un jefe te despide lejos: nunca quedás atrapado contra él
        if (e.def.boss) {
          c.body.applyImpulse(dir.scale(-R.contacto_jefe_empuje * c.def.mass).addInPlace(upv(c.pos, 4 * c.def.mass)), c.pos);
          const pan = panTo(c.pos, e.pos, T.camYaw); // luna: en el marco local del auto
          SFX.bodyThud(6, pan);
        } else if (e.elite) {
          const pan = panTo(c.pos, e.pos, T.camYaw); // luna: en el marco local del auto
          SFX.bodyThud(4, pan);
        }
      }
    }
    for (let j = 0; j < ms.length; j++) { const mc = ms[j].car!; if (!(e.hp > 0 && hd(e.pos, mc.pos) < e.radius + mateR[j] && rad(mc.pos) - rad(e.pos) < e.def.size[1] + 0.5)) continue; // R7a/c: los otros autos embisten o reciben el contacto (sin rebote ni Ariete)
      const dir = hflat(e.pos.subtract(mc.pos), mc.pos).normalize(), rel = B.Vector3.Dot(mcv[j], dir);
      if (rel > R.embestida_vel_min && e.ramCd <= 0) { cs.src = "embestida"; damage(e, rel * mc.def.ram * T.st.dmg * T.st.ram, dir.scale(rel * 0.8).addInPlace(upv(e.pos, rel * 0.2)), true); cs.src = ""; e.ramCd = R.embestida_recarga_s; SFX.ram(rel); }
      else if (rel <= R.embestida_vel_min && e.touchCd <= 0 && e.stun <= 0) { mateHit[j] = Math.max(mateHit[j], e.def.dmg * R.contacto_dano * (e.def.boss ? 1 : T.TOUGH.dmg)); e.touchCd = R.contacto_recarga_s; }
    }
  }
  for (const m of T.others()) if ((m.touch -= dt) <= 0 && mateHit[ms.indexOf(m)]) { mateHurt(m, mateHit[ms.indexOf(m)]); m.touch = R.contacto_invuln_s; SFX.hurt(); }
  // Invulnerabilidad de contacto: como mucho un golpe cada 0,5 s aunque te rodeen
  if ((touchIFrame -= dt) <= 0 && contactHit) {
    T.hurt(contactHit, true, contactBy ? "contacto " + contactBy : "contacto", contactBy);
    SFX.hurt();
    if (contactHit > 8) SFX.bodyThud(contactHit * 0.4);
    if (MOON.on) { // luna: el mismo empujón con vectores del plano tangente del auto
      const P = new B.Vector3(); let n = 0;
      for (const e of T.enemies) { if (e.def.boss || e.hp <= 0 || hd(e.pos, c.pos) > carR + e.radius + 0.5) continue; P.addInPlace(c.pos.subtract(e.pos)); n++; }
      hflat(P, c.pos);
      if (n > 0) {
        P.scaleInPlace(1 / (P.length() || 1));
        c.body.applyImpulse(P.scale(R.contacto_empuje_auto * c.def.mass * (1 + 0.15 * Math.min(n - 1, 6))), c.pos);
        const vel = c.body.getLinearVelocity(), inward = -B.Vector3.Dot(vel, P);
        if (inward > 0) c.body.setLinearVelocity(vel.addInPlace(P.scale(inward * 0.45)));
      }
    } else {
    let px = 0, pz = 0, n = 0;
    for (const e of T.enemies) {
      if (e.def.boss || e.hp <= 0) continue;
      if (hd(e.pos, c.pos) > carR + e.radius + 0.5) continue;
      px += c.pos.x - e.pos.x; pz += c.pos.z - e.pos.z; n++;
    }
    if (n > 0) {
      const len = Math.hypot(px, pz) || 1, ux = px / len, uz = pz / len;
      const imp = R.contacto_empuje_auto * c.def.mass * (1 + 0.15 * Math.min(n - 1, 6));
      c.body.applyImpulse(new B.Vector3(ux * imp, 0, uz * imp), c.pos);
      const vel = c.body.getLinearVelocity(), inward = -(vel.x * ux + vel.z * uz);
      if (inward > 0) c.body.setLinearVelocity(new B.Vector3(vel.x + ux * inward * 0.45, vel.y, vel.z + uz * inward * 0.45));
    }
    }
    touchIFrame = R.contacto_invuln_s;
  }
  // Bichos normales cerca del auto: no se amontonan en un solo punto
  const sepR = R.enemigo_separacion, sepR2 = sepR * sepR;
  for (let i = 0; i < T.enemies.length; i++) {
    const a = T.enemies[i];
    if (a.def.boss || a.elite || a.hp <= 0 || hd(a.pos, c.pos) > 14) continue;
    for (let j = i + 1; j < T.enemies.length; j++) {
      const b = T.enemies[j];
      if (b.def.boss || b.elite || b.hp <= 0) continue;
      if (MOON.on) { // luna: separación en 3D (los vecinos están a 1-2 m: la cuerda es el plano tangente)
        const D = b.pos.subtract(a.pos), d2 = D.lengthSquared();
        if (d2 < 1e-4 || d2 > sepR2) continue;
        const d = Math.sqrt(d2); D.scaleInPlace(((sepR - d) / sepR) * 12 * wdt / d);
        a.body.applyImpulse(D.scale(-a.def.mass), a.pos); b.body.applyImpulse(D.scale(b.def.mass), b.pos);
        continue;
      }
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d2 = dx * dx + dz * dz;
      if (d2 < 1e-4 || d2 > sepR2) continue;
      const d = Math.sqrt(d2), k = ((sepR - d) / sepR) * 12 * wdt;
      a.body.applyImpulse(new B.Vector3(-(dx / d) * k * a.def.mass, 0, -(dz / d) * k * a.def.mass), a.pos);
      b.body.applyImpulse(new B.Vector3((dx / d) * k * b.def.mass, 0, (dz / d) * k * b.def.mass), b.pos);
    }
  }
  for (let i = T.enemies.length - 1; i >= 0; i--) { // jefe final: la primera barra vacía no lo mata
    const e = T.enemies[i];
    if (e.hp > 0 || e.rearm()) continue;
    T.enemies.splice(i, 1);
    if (e.hp < -1e8) e.dispose(); else kill(e);
    if (T.state !== "play") return true;
  }
  if (T.guestE && !T.enemies.includes(T.guestE)) { T.guestE = null; if (erun) encApply(E.guestDown(erun)); } // BOSS_GUEST: el invitado cayó
  const boss = T.enemies.find((e) => e.def.boss);
  const gb = (MOON.on || erun) && T.lead.car ? goalBar(T.lead.car.pos) : null; // luna: progreso de la antena o del cohete en la barra de jefe
  if (gb) hudBoss(gb.name, gb.pct);
  else if (boss) hudBoss(boss.def.name, Math.max(0, boss.hp / boss.maxHp), boss.kind, boss.enraged);
  else { const sb = MOON.on ? shipBar() : null; hudBoss(sb?.name ?? null, sb?.pct); } // naves de la luna: misma barra de jefe; sin nada, la barra se va (si no, quedaba la del último cofre o máquina)
  if (!T.simulating) radio.duck({ boss: !!boss, horde: T.enemies.length > 60 }); // ducking de la radio: jefe -6 dB, horda densa -4 dB
  { const ms = boss ? "boss" : T.apagon ? "blackout" : "run"; if (!T.simulating && (ms !== T.musicS || (T.musicT -= dt) <= 0)) { if ((ms === "boss") !== (T.musicS === "boss")) { if (ms === "boss") radio.prefer("jefe"); else radio.resume(); } T.musicS = ms; T.musicT = 1; music(ms, run.time / 600); } } // música: cambio de estado al instante, intensidad cada ~1 s

  // --- Ácido de escupidoras ---
  for (let i = T.spits.length - 1; i >= 0; i--) {
    const s = T.spits[i];
    if (MOON.on && s.float) advance(s.m.position, s.v, wdt); // onda alien: pegada a la curva; advance recorre d·|v|: con v sin normalizar, d = wdt
    else if (MOON.on) { // ácido y tuercas: avance por la curva + caída hacia el centro (la misma cuenta que el v.y -= 3·dt del patio)
      const p = s.m.position, vr = B.Vector3.Dot(s.v, upAt(p)) - 3 * wdt;
      advance(p, hflat(s.v, p), wdt);
      const u = upAt(p); p.addInPlace(u.scale(vr * wdt)); s.v.addInPlace(u.scaleInPlace(vr));
    }
    else if (s.bounce !== undefined) { // la voz del muñeco: vuela a ras y rebota en las paredes del desván
      const p = s.m.position; p.addInPlace(s.v.scale(wdt));
      if (Math.abs(p.x) > HALF - 1 && p.x * s.v.x > 0) { s.v.x *= -1; s.bounce--; }
      if (Math.abs(p.z) > HALF - 1 && p.z * s.v.z > 0) { s.v.z *= -1; s.bounce--; }
    }
    else { s.m.position.addInPlace(s.v.scale(wdt)); s.v.y -= 3 * wdt; }
    let dead = (s.life -= wdt) <= 0 || (s.bounce === undefined ? below(s.m.position, 0.1) : s.bounce < 0);
    const sd = s.dmg ?? (s.big ? ATK.babosa_dano : ATK.acido_dano);
    const sr = s.big ? 0.3 * ATK.babosa_flema_escala : 0.3;
    if (B.Vector3.Distance(s.m.position, c.pos) < carR + sr) { T.hurt(sd, false, "ácido", s.k); FX.hit(s.m.position); dead = true; }
    else { const j = ms.findIndex((m, k) => B.Vector3.Distance(s.m.position, m.car!.pos) < mateR[k] + sr); if (j >= 0) { mateHurt(ms[j], sd); FX.hit(s.m.position); dead = true; } }
    if (dead) { mark("scorch", s.m.position, Math.random() * 6, 0.6, 5); s.m.dispose(); T.spits.splice(i, 1); }
  }
  if (MOON.on && !calm) skyTick(wdt, run.time, carPs, T.simulating ? null : T.cam, T.hurtWho, T.enemies, T.camYaw); // luna: el Sol y la Tierra lanzan bichos (moon_sky.ts)
  return false;
}

export function tickWeapons(F: Frame, dt: number): boolean {
  const { c, ms, calm, cars, carPs, r } = F;
  // --- Armas ---
  if (MOON.on && !calm) shipsTick(dt, run.time, cars, T.simulating, T.camYaw); // naves alienígenas (moon_ships.ts): nodriza recurrente y minijefes
  if ((MOON.on || erun) && !calm) { goalsTick(dt, run.time, carPs, T.simulating); if (T.state !== "play") return true; } // objetivos y cohete (moon_goals.ts); el cohete puede ganar la partida
  const ctx: Ctx = { scene: T.scene, car: c, enemies: MOON.on ? shipTargets(T.enemies.some((e) => e.kind === "gusano" && !wormOut(e)) ? T.enemies.filter((e) => e.kind !== "gusano" || wormOut(e)) : T.enemies, c.pos) : T.enemies, dt, st: T.st, fs: r.fs, gems: T.gems, damage, explode };
  LIVE.dmg = T.st.llamasVel && Math.abs(r.fs) >= BAL.armasExtra.llamas_vel_frac * c.def.speed * T.st.speedMul ? 1 + T.st.llamasVel : 1; // Calcomanía de llamas: bono a velocidad máxima
  cs.src = "escape"; escapeTick(ctx, F.boosting || Math.abs(r.ls) > BAL.armasExtra.escape_lateral); // Caño de escape (pasiva)
  for (const w of T.weapons) { cs.src = w.id; w.update(ctx); }
  for (const m of ms) { const mctx: Ctx = { ...ctx, car: m.car!, fs: m.fs }; for (const w of m.weapons) { cs.src = w.id; w.update(mctx); } } // R7a/c: los otros autos disparan copias de las mismas armas desde su lugar
  cs.src = "";
  return false;
}

export function tickPickups(F: Frame, dt: number): boolean {
  const { c, ms } = F;
  // --- Recolección ---
  const mag2 = T.st.magnet * T.st.magnet;
  const fwdFlat = c.root.forward.clone(); fwdFlat.y = 0;
  if (fwdFlat.lengthSquared() > 1e-6) fwdFlat.normalize();
  for (let i = T.gems.length - 1; i >= 0; i--) {
    const g = T.gems[i];
    if (MOON.on) { // luna: lo mismo con la altura sobre el piso del lugar y el imán por la superficie
      const gp = g.m.position, D = hflat(c.pos.subtract(gp), gp), d2 = D.lengthSquared();
      if (d2 < mag2) g.pull = true;
      g.m.rotation.y += dt * 2;
      let h = Math.max(0, alt(gp));
      if (g.vy !== 0 || h > 0) { g.vy -= 22 * dt; h = Math.max(0, h + g.vy * dt); if (h === 0) g.vy = g.vy < -4 ? -g.vy * 0.35 : 0; }
      if (g.pull) { const d = Math.sqrt(d2) || 0.01; advance(gp, D.scale(1 / d), Math.min(d, (22 + 28 / (d + 0.5)) * dt)); }
      onFloor(gp, h, gp); orient(g.m);
      if (!T.simulating) {
        const gl = Math.sqrt(d2), f = c.root.forward, lampK = gl > 0.4 && gl < 20 ? Math.max(0, -B.Vector3.Dot(f, D) / gl) * (1 - gl / 20) : 0;
        g.m.scaling.setAll((g.xp === 20 ? 1.5 : g.xp === 5 ? 1.05 : 0.95) * (1 + lampK * 0.24 + (g.pull ? 0.08 : 0)));
      }
      if (d2 < 1.2 || ms.some((m) => B.Vector3.DistanceSquared(gp, m.car!.pos) < 1.5)) { gainXp(g.xp); SFX.gem(); if (run.evtId === 1 && ++run.lluviaGems >= 50) grant("lluvia"); if (g.xp > 1) FX.xp(gp); g.m.dispose(); T.gems.splice(i, 1); } // R7a: XP compartida, junta cualquiera de los dos
      continue;
    }
    const dx = c.pos.x - g.m.position.x, dz = c.pos.z - g.m.position.z, d2 = dx * dx + dz * dz;
    if (d2 < mag2) g.pull = true;
    g.m.rotation.y += dt * 2;
    const gy = groundY(g.m.position.x, g.m.position.z); // pileta: el pozo está bajo y=0
    if (g.vy !== 0 || g.m.position.y > gy) { g.vy -= 22 * dt; g.m.position.y = Math.max(gy, g.m.position.y + g.vy * dt); if (g.m.position.y === gy) g.vy = g.vy < -4 ? -g.vy * 0.35 : 0; } // rebota una o dos veces
    if (g.fall) { if (g.m.position.y > gy) { if (Math.random() < 0.7) FX.gemTrail(g.m.position); } else { g.fall = false; FX.gemLand(g.m.position); SFX.gem(); } }
    if (g.pull) { const d = Math.sqrt(d2) || 0.01, sp = Math.min(d, (22 + 28 / (d + 0.5)) * dt); g.m.position.x += (dx / d) * sp; g.m.position.z += (dz / d) * sp; }
    if (!T.simulating) {
      const gl = Math.sqrt(d2), lampK = gl > 0.4 && gl < 20 && fwdFlat.lengthSquared() > 0 ? Math.max(0, (fwdFlat.x * (-dx) + fwdFlat.z * (-dz)) / gl) * (1 - gl / 20) : 0;
      const base = g.xp === 20 ? 1.5 : g.xp === 5 ? 1.05 : 0.95;
      g.m.scaling.setAll(base * (1 + lampK * 0.24 + (g.pull ? 0.08 : 0)));
    }
    if (d2 < 1.2) { tut("pickup"); gainXp(g.xp); SFX.gem(); if (run.evtId === 1 && ++run.lluviaGems >= 50) grant("lluvia"); if (g.xp > 1) FX.xp(g.m.position); g.m.dispose(); T.gems.splice(i, 1); }
  }
  for (let i = T.pickups.length - 1; i >= 0; i--) {
    const p = T.pickups[i];
    p.m.rotation.y += dt * 2; orient(p.m);
    const byMate = B.Vector3.Distance(p.m.position, c.pos) >= 2.2 ? ms.findIndex((m) => B.Vector3.Distance(p.m.position, m.car!.pos) < 2.2) + 1 : 0; // R7a/c: la pila cura a quien la junta (1.. = índice en ms + 1)
    if (byMate || B.Vector3.Distance(p.m.position, c.pos) < 2.2) {
      SFX.pickup(); tut("pickup");
      if (p.type === "pila" && byMate) ms[byMate - 1].hp = Math.min(T.lead.maxHp, ms[byMate - 1].hp + R.pila_cura);
      else if (p.type === "pila") T.lead.hp = Math.min(T.lead.maxHp, T.lead.hp + R.pila_cura);
      else if (p.type === "iman") for (const g of T.gems) g.pull = true;
      else openChest(byMate);
      p.m.dispose();
      T.pickups.splice(i, 1);
      if (T.state !== "play") return true;
    }
  }
  return false;
}

