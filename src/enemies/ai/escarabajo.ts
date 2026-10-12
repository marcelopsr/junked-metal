import * as B from "@babylonjs/core";
import { GLB } from "../../glb";
import { BAL } from "../../balance";
import type { Think } from "./util";

const ATK = BAL.ataques;

const escarabajoAI: Think = (e, c) => {
  const { dt, dist, fwd, diff } = c;
  // Embestida al compás de su animación: se agacha apuntando, arremete (el golpe es el contacto) y se recupera
  const g = GLB.escarabajo!;
  if (e.atk >= 0) {
    const k = (e.atk += dt) / g.atk!;
    if (k < g.hit!) { c.speed = 0; c.turn = 4; } else if (k < g.hit! + 0.17) { c.move = fwd; c.speed *= ATK.escarabajo_vel_mult; c.turn = 0.5; } else c.speed *= 0.3;
    if (k >= 1) { e.atk = -1; e.timer = ATK.escarabajo_espera_s; }
  } else if ((e.timer -= dt) <= 0 && dist < ATK.escarabajo_distancia && Math.abs(diff) < 0.5) e.atk = 0;
};

export { escarabajoAI };
