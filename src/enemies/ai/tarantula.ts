import * as B from "@babylonjs/core";
import { rng } from "../../rng";
import { BAL } from "../../balance";
import { at, flatL, MOON, onFloor, toWorld } from "../../moon";
import type { Think } from "./util";

const ATK = BAL.ataques;

const tarantulaAI: Think = (e, c) => {
  const { dt, to, dist, v, target } = c;
  // Dos ataques, siempre anunciados en rojo en el piso:
  // ráfaga (aro alrededor suyo, después 6 escupitajos) y salto (aro donde va a caer, radio del golpe = 11 en main.ts)
  e.timer -= dt;
  if (e.airborne) {
    e.showTele(e.land, ATK.salto_radio, 1);
    if (v.y <= 0 && e.groundY(0.3) !== null) { e.airborne = false; e.state = 0; e.timer = ATK.tarantula_salto_descanso_s; e.showTele(null); return "slam"; }
    return true;
  }
  if (e.state === 0) {
    e.showTele(null);
    if (e.timer <= 0) {
      e.state = rng() < ATK.tarantula_prob_rafaga ? 1 : 3;
      e.timer = e.state === 1 ? ATK.tarantula_rafaga_aviso_s : ATK.tarantula_salto_aviso_s;
    }
  } else if (e.state === 1 || e.state === 2) {
    c.speed = 0; c.turn = 5;
    if (e.state === 1) {
      e.showTele(e.pos, ATK.tarantula_rafaga_radio, 1 - e.timer / ATK.tarantula_rafaga_aviso_s);
      if (e.timer <= 0) { e.state = 2; e.shots = ATK.tarantula_rafaga_n; e.timer = 0; }
    } else if (e.timer <= 0) {
      e.timer = ATK.tarantula_rafaga_intervalo_s;
      if (e.shots-- > 0) return "spit";
      e.state = 0; e.timer = ATK.tarantula_rafaga_descanso_s; e.showTele(null);
    }
  } else if (e.state === 3) {
    c.speed = 0; c.turn = 4;
    // Apunta durante la primera mitad y después fija el punto: quedarse quieto = recibir el golpe
    if (e.timer > 0.65) { const reach = Math.min(dist, ATK.tarantula_salto_alcance); if (MOON.on) onFloor(at(e.pos, to.x * reach, 0, to.z * reach), 0, e.land); else e.land.set(e.pos.x + to.x * reach, reach < dist ? e.pos.y : target.y - 0.3, e.pos.z + to.z * reach); }
    e.showTele(e.land, ATK.salto_radio, 1 - e.timer / ATK.tarantula_salto_aviso_s);
    if (e.timer <= 0) {
      const T = (2 * 14) / 25; // vuelo con vy = 14 y gravedad 25
      const j = MOON.on ? flatL(e.land.subtract(e.pos), e.pos) : e.land.subtract(e.pos); j.y = 0;
      e.body.setLinearVelocity(toWorld(j.scaleInPlace(1 / T).addInPlace(new B.Vector3(0, 14, 0)), e.pos)); // j es del marco local (flatL): luna, al mundo
      e.airborne = true;
      return true;
    }
  }
};

export { tarantulaAI };
