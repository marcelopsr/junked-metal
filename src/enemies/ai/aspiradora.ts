import * as B from "@babylonjs/core";
import { FX } from "../../fx";
import { BAL } from "../../balance";
import { at } from "../../moon";
import type { Think } from "./util";

const ATK = BAL.ataques;

const aspiradoraAI: Think = (e, c) => {
  const { dt, to, dist } = c;
  // Ciclo: anda hacia el auto → aro rojo de succión que se llena (1,4 s) → succiona 2,6 s → aro chico (0,8 s) → 3 ráfagas de tuercas en abanico
  e.timer -= dt;
  e.pull = 0;
  if (e.state === 0) {
    e.showTele(null);
    if (e.timer <= 0) { e.state = 1; e.timer = ATK.aspiradora_aviso_s; }
  } else if (e.state === 1 || e.state === 2) {
    c.speed = e.state === 2 ? ATK.aspiradora_succion_vel : 0; c.turn = 2;
    e.showTele(e.pos, ATK.aspiradora_radio, e.state === 1 ? 1 - e.timer / ATK.aspiradora_aviso_s : 1);
    if (e.state === 2) {
      e.pull = dist < ATK.aspiradora_radio ? ATK.aspiradora_succion_min + ATK.aspiradora_succion_extra * (1 - dist / ATK.aspiradora_radio) : 0;
      if (Math.random() < dt * 25) { const a = Math.random() * 6.3, r = 5 + Math.random() * 14; FX.dust(at(e.pos, Math.sin(a) * r, 0.3, Math.cos(a) * r)); } // solo visual
    }
    if (e.timer <= 0) { if (e.state === 1) { e.state = 2; e.timer = ATK.aspiradora_succion_s; } else { e.state = 3; e.timer = ATK.aspiradora_tuercas_aviso_s; } }
  } else if (e.state === 3) {
    c.speed = 0; c.turn = 5;
    e.showTele(e.pos, 5, 1 - e.timer / ATK.aspiradora_tuercas_aviso_s);
    if (e.timer <= 0) { e.state = 4; e.shots = ATK.aspiradora_rafagas; e.timer = 0; }
  } else if (e.timer <= 0) {
    c.speed = 0;
    e.timer = ATK.aspiradora_rafaga_intervalo_s;
    if (e.shots-- > 0) {
      const base = Math.atan2(to.x, to.z) + (e.shots - 1) * 0.09; // cada ráfaga corrida un poco: hay huecos para pasar
      const nf = ATK.aspiradora_abanico_n;
      e.fan = Array.from({ length: nf }, (_, i) => { const a = base + (i - (nf - 1) / 2) * ATK.aspiradora_abanico_ang; return new B.Vector3(Math.sin(a), 0.12, Math.cos(a)).normalize(); });
      e.body.setAngularVelocity(B.Vector3.Zero());
      return "fan";
    }
    e.state = 0; e.timer = ATK.aspiradora_descanso_s; e.showTele(null);
  } else c.speed = 0;
};

export { aspiradoraAI };
