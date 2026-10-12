import * as B from "@babylonjs/core";
import { FX } from "../../fx";
import { BAL } from "../../balance";
import { at } from "../../moon";
import type { Think } from "./util";

const ATK = BAL.ataques;

// Ciclo: anda hacia el auto → aro azul de succión que se llena → aspira → aro chico → ráfagas de agua sucia en abanico que BARREN de lado a lado (el abanico gira entre ráfagas) → descanso
const limpiafondosAI: Think = (e, c) => {
  const { dt, to, dist } = c;
  e.timer -= dt;
  e.pull = 0;
  if (e.state === 0) {
    e.showTele(null);
    if (e.timer <= 0) { e.state = 1; e.timer = ATK.limpiafondos_aviso_s; }
  } else if (e.state === 1 || e.state === 2) {
    c.speed = e.state === 2 ? ATK.limpiafondos_succion_vel : 0; c.turn = 2;
    e.showTele(e.pos, ATK.limpiafondos_radio, e.state === 1 ? 1 - e.timer / ATK.limpiafondos_aviso_s : 1);
    if (e.state === 2) {
      e.pull = dist < ATK.limpiafondos_radio ? ATK.limpiafondos_succion_min + ATK.limpiafondos_succion_extra * (1 - dist / ATK.limpiafondos_radio) : 0;
      if (Math.random() < dt * 25) { const a = Math.random() * 6.3, r = 4 + Math.random() * 14; FX.dust(at(e.pos, Math.sin(a) * r, 0.3, Math.cos(a) * r)); } // solo visual
    }
    if (e.timer <= 0) { if (e.state === 1) { e.state = 2; e.timer = ATK.limpiafondos_succion_s; } else { e.state = 3; e.timer = ATK.limpiafondos_escupe_aviso_s; } }
  } else if (e.state === 3) {
    c.speed = 0; c.turn = 5;
    e.showTele(e.pos, 5, 1 - e.timer / ATK.limpiafondos_escupe_aviso_s);
    if (e.timer <= 0) { e.state = 4; e.shots = ATK.limpiafondos_rafagas; e.timer = 0; e.aim = Math.atan2(to.x, to.z) - (ATK.limpiafondos_rafagas - 1) * ATK.limpiafondos_barrido / 2; }
  } else if (e.timer <= 0) {
    c.speed = 0;
    e.timer = ATK.limpiafondos_rafaga_intervalo_s;
    if (e.shots-- > 0) {
      const nf = ATK.limpiafondos_abanico_n, base = e.aim;
      e.aim += ATK.limpiafondos_barrido; // la próxima ráfaga sale corrida: barrido
      e.fan = Array.from({ length: nf }, (_, i) => { const a = base + (i - (nf - 1) / 2) * ATK.limpiafondos_abanico_ang; return new B.Vector3(Math.sin(a), 0.12, Math.cos(a)).normalize(); });
      e.body.setAngularVelocity(B.Vector3.Zero());
      return "fan";
    }
    e.state = 0; e.timer = ATK.limpiafondos_descanso_s; e.showTele(null);
  } else c.speed = 0;
};

export { limpiafondosAI };
