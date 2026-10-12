import { BAL } from "../../balance";
import { bare } from "../../zones/common";
import { teleport } from "../../moon";
import type { Think } from "./util";

const ATK = BAL.ataques;

const munecoAI: Think = (e, c) => {
  const { dt, dist, target, v } = c;
  // Bloque propio (desván): anuncia con un aro rojo el baúl al que se teletransporta, aparece ahí y dice una frase ("voz", proyectiles que rebotan en las paredes).
  // Enojado (fase 2) se desdobla una vez en copias falsas ("desdoble") y suelta más voces.
  e.timer -= dt;
  if (e.state === 0) {
    if (e.enraged && !e.split) { e.split = true; return "desdoble"; }
    if (e.timer <= 0 && dist < ATK.muneco_distancia) {
      // destino: un baúl (los 'bare' de radio 9 del desván) lejos de donde está y a la vista del auto; sin baúles, cerca del auto
      const cand = bare.filter((b) => b.r === 9 && Math.hypot(b.x - e.pos.x, b.z - e.pos.z) > 12 && Math.hypot(b.x - target.x, b.z - target.z) < 55);
      const b = cand.length ? cand[Math.floor(Math.random() * cand.length)] : { x: target.x + 16, z: target.z };
      e.land.set(b.x, 0.2, b.z); e.state = 1; e.timer = ATK.muneco_aviso_s;
    }
  } else if (e.state === 1) {
    c.speed = 0; c.turn = 5;
    e.showTele(e.land, 6, 1 - e.timer / ATK.muneco_aviso_s);
    if (e.timer <= 0) {
      e.showTele(null);
      e.node.position.set(e.land.x + 5, e.pos.y + 0.3, e.land.z); // junto al baúl, no adentro
      e.body.setLinearVelocity(v.scale(0)); teleport(e.body);
      e.state = 2; e.timer = 0.5;
    }
  } else {
    c.speed = 0; c.turn = 5;
    if (e.timer <= 0) { e.state = 0; e.timer = ATK.muneco_descanso_s; return "voz"; }
  }
};

// Copia falsa: persigue como un bicho común y se deshace sola.
const falsoAI: Think = (e) => { if (e.clock > ATK.falso_vida_s) e.hp = -1e9; }; // e.clock cuenta desde que nace

export { munecoAI, falsoAI };
