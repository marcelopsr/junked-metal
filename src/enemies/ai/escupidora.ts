import * as B from "@babylonjs/core";
import { GLB } from "../../glb";
import { BAL } from "../../balance";
import { at } from "../../moon";
import type { Think } from "./util";

const ATK = BAL.ataques;

const escupidoraAI: Think = (e, c) => {
  const { dt, dist, diff } = c;
  // Se frena a distancia, te apunta y arranca su animación de ataque: escupe en el cuadro del latigazo (GLB hit)
  e.timer -= dt;
  const g = GLB.escupidora!, at = g.atk! * g.hit!;
  if (e.atk >= 0) {
    c.speed = 0; c.turn = 5;
    const a0 = e.atk;
    if ((e.atk += dt) >= g.atk!) e.atk = -1;
    if (a0 < at && a0 + dt >= at) { e.body.setAngularVelocity(B.Vector3.Zero()); return "spit"; }
  } else if (dist < ATK.escupidora_distancia) {
    c.speed = 0; c.turn = 5;
    if (e.timer <= 0 && Math.abs(diff) < 0.4) {
      e.timer = ATK.escupidora_cada_s;
      if (e.atk < 0) { e.atk = 0; return "spit_aim"; }
    }
  }
};

export { escupidoraAI };
