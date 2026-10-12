import * as B from "@babylonjs/core";
import { BAL } from "../../balance";
import type { Think } from "./util";

const ATK = BAL.ataques;

const payasoAI: Think = (e, c) => {
  const { dt, dist, v, target } = c;
  // Bloque propio (desván): persigue y, cada tanto, anuncia un aro rojo sobre el auto y salta a aplastarlo; al caer sacude el piso ("slam")
  e.timer -= dt;
  if (e.airborne) {
    e.showTele(e.land, ATK.salto_radio, 1);
    if (v.y <= 0 && e.groundY(0.3) !== null) { e.airborne = false; e.state = 0; e.timer = ATK.payaso_descanso_s; e.showTele(null); return "slam"; }
    return true;
  }
  if (e.state === 0) {
    if (e.timer <= 0 && dist < ATK.payaso_distancia) { e.state = 1; e.timer = ATK.payaso_aviso_s; }
  } else {
    c.speed = 0; c.turn = 5;
    if (e.timer > 0.4) e.land.set(target.x, target.y - 0.3, target.z);
    e.showTele(e.land, ATK.salto_radio, 1 - e.timer / ATK.payaso_aviso_s);
    if (e.timer <= 0) {
      const T = (2 * 14) / 25, j = e.land.subtract(e.pos); j.y = 0;
      e.body.setLinearVelocity(j.scaleInPlace(1 / T).addInPlace(new B.Vector3(0, 14, 0)));
      e.airborne = true;
      return true;
    }
  }
};

export { payasoAI };
