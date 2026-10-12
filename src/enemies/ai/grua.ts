import * as B from "@babylonjs/core";
import { rng } from "../../rng";
import { BAL } from "../../balance";
import type { Think } from "./util";

const ATK = BAL.ataques;

const gruaAI: Think = (e, c) => {
  const { dt, to, dist, fwd, v } = c;
  // Dos ataques con aviso rojo. RIEL: carril largo, se clava el rumbo y carga en línea (moverse de costado). GARRA: aro que se CIERRA sobre la grúa y después suelta chatarra en espiral (rodear, no huir en línea recta)
  e.timer -= dt;
  const dir = new B.Vector3(Math.sin(e.aim), 0, Math.cos(e.aim));
  if (e.state === 0) {
    e.showTele(null);
    if (e.timer <= 0 && dist < ATK.grua_distancia) {
      if (rng() < ATK.grua_prob_riel) { e.state = 3; e.timer = ATK.grua_riel_aviso_s; e.aim = Math.atan2(to.x, to.z); } else { e.state = 1; e.timer = ATK.grua_garra_aviso_s; }
    }
  } else if (e.state === 1) { // garra: el aro rojo baja de grua_garra_radio al mínimo
    c.speed = 0; c.turn = 3;
    const k = 1 - Math.max(0, e.timer) / ATK.grua_garra_aviso_s;
    e.showTele(e.pos, ATK.grua_garra_radio + (ATK.grua_garra_radio_min - ATK.grua_garra_radio) * k, 1);
    if (e.timer <= 0) { e.state = 2; e.shots = ATK.grua_garra_rafagas; e.timer = 0; e.aim = Math.atan2(to.x, to.z); e.showTele(null); }
  } else if (e.state === 2) { // espiral de chatarra: cada ráfaga gira un poco, hay huecos
    c.speed = 0; c.turn = 0;
    if (e.timer <= 0) {
      if (e.shots-- > 0) {
        const n = ATK.grua_garra_rafaga_n, base = e.aim + (ATK.grua_garra_rafagas - e.shots) * ATK.grua_garra_giro;
        e.fan = Array.from({ length: n }, (_, i) => { const a = base + i * (6.2832 / n); return new B.Vector3(Math.sin(a), 0.12, Math.cos(a)).normalize(); });
        e.timer = ATK.grua_garra_intervalo_s;
        e.body.setAngularVelocity(B.Vector3.Zero());
        return "fan";
      }
      e.state = 0; e.timer = ATK.grua_garra_descanso_s;
    }
  } else if (e.state === 3) { // riel: carril rojo que se llena y se clava el rumbo
    e.showLane(dir, 1 - Math.max(0, e.timer) / ATK.grua_riel_aviso_s, ATK.grua_riel_largo, ATK.grua_riel_ancho);
    const a = Math.atan2(B.Vector3.Cross(fwd, dir).y, B.Vector3.Dot(fwd, dir));
    e.body.setLinearVelocity(new B.Vector3(v.x * 0.8, v.y, v.z * 0.8));
    e.body.setAngularVelocity(new B.Vector3(0, B.Scalar.Clamp(a * 8, -8, 8), 0));
    if (e.timer <= 0) { e.state = 4; e.timer = ATK.grua_riel_largo / ATK.grua_riel_vel; }
    return true;
  } else if (e.state === 4) { // carga: no dobla
    e.body.setLinearVelocity(new B.Vector3(dir.x * ATK.grua_riel_vel, v.y, dir.z * ATK.grua_riel_vel));
    e.body.setAngularVelocity(B.Vector3.Zero());
    if (e.timer <= 0) { e.state = 5; e.timer = ATK.grua_riel_frenada_s; e.showTele(null); }
    return true;
  } else { // frenada
    const f = Math.max(0, e.timer) / ATK.grua_riel_frenada_s;
    e.body.setLinearVelocity(new B.Vector3(dir.x * ATK.grua_riel_vel * 0.5 * f, v.y, dir.z * ATK.grua_riel_vel * 0.5 * f));
    if (e.timer <= 0) { e.state = 0; e.timer = ATK.grua_riel_descanso_s; }
    return true;
  }
};

export { gruaAI };
