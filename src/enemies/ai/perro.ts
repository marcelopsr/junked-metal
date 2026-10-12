import * as B from "@babylonjs/core";
import { rng } from "../../rng";
import { BAL } from "../../balance";
import type { Think } from "./util";
import { rot, UP, DOG_RAM } from "./util";

const ATK = BAL.ataques;

const perroAI: Think = (e, c) => {
  const { dt, to, dist, fwd, v } = c;
  // Felipe: bulldog francés desquiciado. Salta, embiste en línea recta, hace zoomies (corre zigzagueando al doble de velocidad) o gira como loco
  e.timer -= dt;
  if (e.airborne) {
    if (v.y <= 0 && e.groundY(0.3) !== null) { e.airborne = false; return "slam"; }
    return true;
  }
  if (e.state === 1) { // zoomies
    c.move = rot(to, Math.sin(e.clock * 4.2) * 1.2 + Math.sin(e.clock * 9) * 0.4); c.speed *= ATK.perro_zoomies_vel; c.turn = 10;
    if (e.timer <= 0) { e.state = 0; e.timer = ATK.perro_pausa_s; }
  } else if (e.state === 2) { // giro
    c.speed *= 0.9; e.body.setAngularVelocity(new B.Vector3(0, 14, 0));
    const want = to.scale(c.speed), k = Math.min(1, dt * 4);
    e.body.setLinearVelocity(new B.Vector3(v.x + (want.x - v.x) * k, v.y, v.z + (want.z - v.z) * k));
    if (e.timer <= 0) { e.state = 0; e.timer = ATK.perro_pausa_s; }
    return true;
  } else if (e.state >= 3) { // embestida: apunta con el carril en rojo, carga en línea recta y frena torpe
    const dir = new B.Vector3(Math.sin(e.aim), 0, Math.cos(e.aim));
    if (e.state === 3) {
      const w = e.enraged ? DOG_RAM.windRage : DOG_RAM.wind, k = 1 - Math.max(0, e.timer) / w;
      e.showLane(dir, k);
      const a = Math.atan2(B.Vector3.Cross(fwd, dir).y, B.Vector3.Dot(fwd, dir));
      e.body.setLinearVelocity(new B.Vector3(v.x * 0.8, v.y, v.z * 0.8));
      e.body.setAngularVelocity(new B.Vector3(0, B.Scalar.Clamp(a * 8, -8, 8), 0));
      if (e.timer <= 0) { e.state = 4; e.timer = DOG_RAM.len / DOG_RAM.speed; }
      return true;
    }
    if (e.state === 4) { // carga: no dobla
      e.body.setLinearVelocity(new B.Vector3(dir.x * DOG_RAM.speed, v.y, dir.z * DOG_RAM.speed));
      e.body.setAngularVelocity(B.Vector3.Zero());
      if (e.timer <= 0) { e.state = 5; e.timer = DOG_RAM.brake; e.showTele(null); }
      return true;
    }
    // frenada: patina con las patas, culea de un lado al otro y recién después vuelve a perseguir
    const s = e.timer / DOG_RAM.brake;
    e.body.setLinearVelocity(new B.Vector3(dir.x * DOG_RAM.speed * 0.5 * s, v.y, dir.z * DOG_RAM.speed * 0.5 * s));
    e.body.setAngularVelocity(new B.Vector3(0, Math.sin(e.clock * 18) * 6 * s, 0));
    if (e.timer <= 0) { e.state = 0; e.timer = ATK.perro_embestida_pausa_s; }
    return true;
  } else if (e.timer <= 0 && dist < ATK.perro_distancia) {
    const r = rng(), p1 = ATK.perro_prob_salto, p2 = p1 + ATK.perro_prob_embestida;
    if (r >= p1 && r < p2) { e.state = 3; e.timer = e.enraged ? DOG_RAM.windRage : DOG_RAM.wind; e.aim = Math.atan2(to.x, to.z); return true; }
    if (r < p1) {
      e.timer = e.enraged ? ATK.perro_salto_descanso_furia_s : ATK.perro_salto_descanso_s;
      e.airborne = true;
      const jump = to.scale(Math.min(dist, ATK.perro_salto_alcance) * 1.1).addInPlace(UP.scale(22));
      e.body.setLinearVelocity(jump);
      return true;
    }
    e.state = r < p2 + ATK.perro_prob_zoomies ? 1 : 2; e.timer = e.state === 1 ? ATK.perro_zoomies_s : ATK.perro_giro_s;
  }
};

export { perroAI };
