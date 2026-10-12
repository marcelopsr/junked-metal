import * as B from "@babylonjs/core";
import { rng } from "../../rng";
import { BAL } from "../../balance";
import { at, flatL, MOON, onFloor, toWorld } from "../../moon";
import type { Think } from "./util";
import { rot } from "./util";

const ATK = BAL.ataques;

const gatoAI: Think = (e, c) => {
  const { dt, to, dist, v, target } = c;
  // Eulalio: errático. Zigzaguea a ritmo cambiante y cada tanto elige al azar entre salto (aro rojo), trompo o arranque.
  // Fase 2: maúlla y llama polillas
  e.timer -= dt;
  if (e.airborne) {
    e.showTele(e.land, ATK.salto_radio, 1);
    if (v.y <= 0 && e.groundY(0.3) !== null) { e.airborne = false; e.state = 0; e.timer = ATK.gato_salto_descanso_s; e.showTele(null); return "slam"; }
    return true;
  }
  if (e.state === 0) {
    const w = Math.sin(e.clock * 2.3) * 0.9 + Math.sin(e.clock * 5.1) * 0.35;
    c.move = rot(to, w); c.speed *= 0.7 + 0.5 * Math.sin(e.clock * 1.7 + 1) ** 2 * 1.6;
    if (e.enraged && (e.meowCd -= dt) <= 0) { e.meowCd = ATK.gato_maullido_cada_s; return "meow"; }
    if (e.timer <= 0 && dist < ATK.gato_distancia) {
      const r = rng();
      if (r < ATK.gato_prob_salto) { e.state = 1; e.timer = ATK.gato_salto_aviso_s; }
      else if (r < ATK.gato_prob_salto + ATK.gato_prob_trompo) { e.state = 2; e.timer = ATK.gato_trompo_aviso_s; }
      else { e.state = 4; e.timer = ATK.gato_arranque_aviso_s; e.dir = (rng() < 0.5 ? -1 : 1) * (0.6 + rng() * 0.9); }
    }
  } else if (e.state === 1) { // salto anunciado
    c.speed = 0; c.turn = 5;
    if (e.timer > 0.4) { const reach = Math.min(dist, ATK.gato_salto_alcance); if (MOON.on) onFloor(at(e.pos, to.x * reach, 0, to.z * reach), 0, e.land); else e.land.set(e.pos.x + to.x * reach, reach < dist ? e.pos.y : target.y - 0.3, e.pos.z + to.z * reach); }
    e.showTele(e.land, ATK.salto_radio, 1 - e.timer / ATK.gato_salto_aviso_s);
    if (e.timer <= 0) {
      const T = (2 * 14) / 25;
      const j = MOON.on ? flatL(e.land.subtract(e.pos), e.pos) : e.land.subtract(e.pos); j.y = 0;
      e.body.setLinearVelocity(toWorld(j.scaleInPlace(1 / T).addInPlace(new B.Vector3(0, 14, 0)), e.pos)); // j es del marco local (flatL): luna, al mundo
      e.airborne = true;
      return true;
    }
  } else if (e.state === 2 || e.state === 3) { // trompo: se frena girando y sale rodando hacia el auto
    if (e.state === 2) {
      c.speed = 0; e.body.setAngularVelocity(B.Vector3.Zero()); // el giro lo hace la acción spin (no el cuerpo)
      if (e.timer <= 0) { e.state = 3; e.timer = ATK.gato_trompo_s; }
      return true;
    }
    c.move = rot(to, Math.sin(e.clock * 3) * 0.35); c.speed = ATK.gato_trompo_vel;
    e.body.setLinearVelocity(new B.Vector3(v.x + (c.move.x * c.speed - v.x) * Math.min(1, dt * 5), v.y, v.z + (c.move.z * c.speed - v.z) * Math.min(1, dt * 5)));
    e.body.setAngularVelocity(B.Vector3.Zero());
    if (e.timer <= 0) { e.state = 0; e.timer = ATK.gato_trompo_pausa_min + rng() * ATK.gato_trompo_pausa_rango; e.landT = e.landD = 0.17; e.recSeq = "spin"; }
    return true;
  } else { // arranque: se tira de costado a toda velocidad (a veces hacia el auto, a veces no)
    c.move = rot(to, e.dir); c.speed = ATK.gato_arranque_vel; c.turn = 12;
    if (e.timer <= 0) { e.state = 0; e.timer = ATK.gato_arranque_pausa_min + rng() * ATK.gato_arranque_pausa_rango; }
  }
};

export { gatoAI };
