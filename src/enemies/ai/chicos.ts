import * as B from "@babylonjs/core";
import { BAL } from "../../balance";
import type { Think } from "./util";

const ATK = BAL.ataques;

const moscaAI: Think = (e, c) => {
  const { to } = c;
  const a = Math.sin(e.clock * ATK.mosca_zigzag_hz + e.maxHp) * ATK.mosca_zigzag_ang, cs = Math.cos(a), s = Math.sin(a);
  c.move = new B.Vector3(to.x * cs - to.z * s, 0, to.x * s + to.z * cs);
};

const grilloAI: Think = (e, c) => {
  const { dt, to, dist } = c;
  e.timer -= dt;
  if (e.state === 0) { if (e.timer <= 0 && dist < ATK.grillo_salto_alcance) { e.state = 1; e.timer = ATK.grillo_aviso_s; } }
  else if (e.state === 1) { c.speed = 0; c.turn = 8; if (e.timer <= 0) { e.state = 2; e.timer = ATK.grillo_vuelo_s; e.body.setLinearVelocity(new B.Vector3(to.x * ATK.grillo_salto_vel, ATK.grillo_salto_alto, to.z * ATK.grillo_salto_vel)); } }
  else { if (e.timer <= 0) { e.state = 0; e.timer = ATK.grillo_cada_s; } return true; } // en el aire no corrige
};

const babosaAI: Think = (e, c) => {
  const { dt, dist } = c;
  e.timer -= dt;
  if (e.state === 0) { if (e.timer <= 0 && dist < ATK.babosa_alcance) { e.state = 1; e.timer = ATK.babosa_aviso_s; } }
  else { c.speed = 0; c.turn = 5; if (e.timer <= 0) { e.state = 0; e.timer = ATK.babosa_cada_s; return "spit"; } }
};

export { moscaAI, grilloAI, babosaAI };
