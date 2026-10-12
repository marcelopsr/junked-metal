import * as B from "@babylonjs/core";
import { BAL } from "../../balance";
import type { Think } from "./util";

const ATK = BAL.ataques;

const robotAI: Think = (e, c) => {
  const { dt, fwd } = c;
  // Apunta quieto, después sale disparado en línea recta (el bicho-cohete de la luna, con los tiempos del robot)
  e.timer -= dt;
  const mow = e.kind === "cortadora";
  if (e.state === 0) { c.speed = 0; c.turn = mow ? 2 : 5; if (e.timer <= 0) { e.state = 1; e.timer = mow ? ATK.cortadora_carga_s : ATK.robot_carga_s; } }
  else { c.move = fwd; c.turn = 0.3; if (e.timer <= 0) { e.state = 0; e.timer = mow ? ATK.cortadora_pausa_s : ATK.robot_pausa_s; } }
};

export { robotAI };
