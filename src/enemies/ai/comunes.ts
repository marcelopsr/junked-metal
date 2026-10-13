import * as B from "@babylonjs/core";
import { BAL } from "../../balance";
import type { Think } from "./util";

const ATK = BAL.ataques;

// Kamikaze: corre; cerca prende la mecha (aro rojo del tamaño de la explosión) y explota ("kaboom": run_tick.ts, combat.boomK)
const kamikazeAI: Think = (e, c) => {
  if (e.atk >= 0) {
    e.showTele(e.pos, ATK.kamikaze_radio, e.atk / ATK.kamikaze_mecha_s);
    c.speed *= 0.3;
    if ((e.atk += c.dt) >= ATK.kamikaze_mecha_s) return "kaboom";
  } else if (c.dist < ATK.kamikaze_mecha_dist) e.atk = 0;
  else if (c.dist < ATK.kamikaze_carga_dist) c.speed *= ATK.kamikaze_carga_mult;
};

// Escudero: gira despacio para que el frente blindado (combat.damage) apunte al auto; hay que rodearlo
const escudoAI: Think = (_e, c) => { c.turn = ATK.escudo_giro; };

// Brincador: si un obstáculo fijo le corta el paso, salta con arco fijo (como el grillo) y lo pasa por encima
const brincadorAI: Think = (e, c) => {
  e.timer -= c.dt;
  if (e.state === 1) { if (e.timer <= 0) { e.state = 0; e.timer = ATK.brincador_cada_s; } return true; } // en el aire no corrige
  if (e.timer <= 0 && e.obstacleAhead(c.to, ATK.brincador_mira)) {
    e.state = 1; e.timer = ATK.brincador_vuelo_s;
    e.body.setLinearVelocity(new B.Vector3(c.to.x * ATK.brincador_salto_vel, ATK.brincador_salto_alto, c.to.z * ATK.brincador_salto_vel));
    return true;
  }
};

// Francotirador: se mantiene lejos; fija el rumbo, marca la línea de tiro en el piso y dispara ("snipe": run_tick.ts). Cambiar de lugar la esquiva.
const francotiradorAI: Think = (e, c) => {
  const { dt, dist } = c;
  e.timer -= dt;
  if (e.state === 1) {
    c.speed = 0; c.turn = 0;
    e.showLane(new B.Vector3(Math.sin(e.aim), 0, Math.cos(e.aim)), 1 - e.timer / ATK.francotirador_aviso_s, ATK.francotirador_largo, ATK.francotirador_ancho);
    if (e.timer <= 0) { e.state = 0; e.timer = ATK.francotirador_cada_s; e.showTele(null); return "snipe"; }
    return true;
  }
  if (dist < ATK.francotirador_cerca) c.move = c.to.scale(-1); // retrocede
  else if (dist < ATK.francotirador_alcance) {
    c.speed = 0; c.turn = 5;
    if (e.timer <= 0 && Math.abs(c.diff) < 0.3) { e.state = 1; e.timer = ATK.francotirador_aviso_s; e.aim = Math.atan2(c.to.x, c.to.z); }
  }
};

// Ladrón: state 0 = va por gemas (run_tick.ts le pone la gema de objetivo y se las lleva), state 1 = huye del auto con el botín (e.loot) hasta que lo maten
const ladronAI: Think = (e, c) => {
  if (e.state === 1) { c.move = c.to.scale(-1); c.speed *= ATK.ladron_huida_mult; c.turn = 8; }
};

export { kamikazeAI, escudoAI, brincadorAI, francotiradorAI, ladronAI };
