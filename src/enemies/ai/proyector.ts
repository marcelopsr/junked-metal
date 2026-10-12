import * as B from "@babylonjs/core";
import { rng } from "../../rng";
import { BAL } from "../../balance";
import type { Think } from "./util";

const ATK = BAL.ataques;

const proyectorAI: Think = (e, c) => {
  const { dt, to, dist } = c;
  // Se planta a distancia y proyecta, siempre con aro rojo de aviso: abanico de tuercas (aro chico) o anillo de tuercas en 360 grados (aro grande, hay huecos)
  e.timer -= dt;
  if (e.state === 0) {
    e.showTele(null);
    if (dist < ATK.proyector_distancia) c.speed = 0;
    if (e.timer <= 0 && dist < ATK.proyector_distancia * 1.6) { e.state = rng() < ATK.proyector_prob_anillo ? 3 : 1; e.timer = e.state === 3 ? ATK.proyector_anillo_aviso_s : ATK.proyector_abanico_aviso_s; }
  } else {
    const ring = e.state === 3, aviso = ring ? ATK.proyector_anillo_aviso_s : ATK.proyector_abanico_aviso_s;
    c.speed = 0; c.turn = 3;
    e.showTele(e.pos, ring ? ATK.proyector_anillo_radio : 5, 1 - e.timer / aviso);
    if (e.timer <= 0) {
      const n = ring ? ATK.proyector_anillo_n : ATK.proyector_abanico_n, base = Math.atan2(to.x, to.z);
      e.fan = Array.from({ length: n }, (_, i) => { const a = ring ? base + (i + 0.5) * (6.2832 / n) : base + (i - (n - 1) / 2) * ATK.proyector_abanico_ang; return new B.Vector3(Math.sin(a), 0.12, Math.cos(a)).normalize(); });
      e.state = 0; e.timer = ATK.proyector_descanso_s; e.showTele(null);
      e.body.setAngularVelocity(B.Vector3.Zero());
      return "fan";
    }
  }
};

export { proyectorAI };
