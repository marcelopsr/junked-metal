import * as B from "@babylonjs/core";
import { FX } from "../../fx";
import { BAL } from "../../balance";
import { at } from "../../moon";
import type { Think } from "./util";

const ATK = BAL.ataques;

const cortacercosAI: Think = (e, c) => {
  const { dt, to, dist, target } = c;
  // Persigue y cada tanto anuncia un barrido en arco (sector rojo de 10 m que se llena en 1 s); al barrer deja un cable con chispas
  e.timer -= dt;
  e.shockCd -= dt;
  for (let i = e.cables.length - 1; i >= 0; i--) {
    const cb = e.cables[i];
    if (Math.random() < dt * 2) FX.sparks(B.Vector3.Lerp(cb.a, cb.b, Math.random())); // solo visual
    if ((cb.life -= dt) <= 0) { cb.m.dispose(); e.cables.splice(i, 1); }
  }
  if (e.state === 0) {
    e.showTele(null);
    if (e.timer <= 0 && dist < ATK.cortacercos_distancia) { e.state = 1; e.timer = ATK.cortacercos_aviso_s; e.aim = Math.atan2(to.x, to.z); }
    else if (e.timer <= -ATK.cortacercos_siembra_s) { e.dropCable(); e.timer = 0; } // lejos: igual va sembrando cables
  } else {
    c.speed = 0; c.turn = 0;
    e.showTele(e.pos, ATK.cortacercos_radio, 1 - e.timer / ATK.cortacercos_aviso_s);
    if (e.timer <= 0) {
      e.state = 0; e.timer = ATK.cortacercos_descanso_s; e.showTele(null);
      e.dropCable();
      for (let k = -2; k <= 2; k++) { const a = e.aim + k * 0.5; FX.sparks(at(e.pos, Math.sin(a) * 8, 0.6, Math.cos(a) * 8)); }
      // ¿El auto quedó dentro del sector (±60°, 10 m)?
      const off = Math.atan2(Math.sin(Math.atan2(to.x, to.z) - e.aim), Math.cos(Math.atan2(to.x, to.z) - e.aim));
      if (dist < ATK.cortacercos_radio + 1 && Math.abs(off) < Math.PI / 3) return "slash";
      return "swing";
    }
  }
  if (e.shockCd <= 0 && e.onCable(target)) { e.shockCd = ATK.cortacercos_cable_recarga_s; return "shock"; }
};

export { cortacercosAI };
