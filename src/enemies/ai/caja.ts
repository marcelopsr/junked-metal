import { BAL } from "../../balance";
import { alt, at, MOON, onFloor, orient } from "../../moon";
import type { Think } from "./util";

const ATK = BAL.ataques;

const cajaAI: Think = (e, c) => {
  const { dt, dist, target } = c;
  // Dos ataques con aviso rojo, siempre alternados: ONDAS (anillos de sonido que crecen desde la caja; se esquivan SALTANDO) y BAILARINAS (giran en espiral alrededor; rodearlas).
  // Segunda barra (e.enraged): más ondas y bailarinas, más rápidas.
  e.timer -= dt;
  e.shockCd -= dt;
  const f2 = e.enraged, h = MOON.on ? alt(target) - alt(e.pos) : target.y - e.pos.y;
  e.hBase = Math.min(e.hBase, h);
  const air = h > e.hBase + 0.9; // el auto está en el aire (saltó)
  let ev: string | undefined;
  for (let i = e.waves.length - 1; i >= 0; i--) { // ondas: cada una pega una vez si el auto está sobre la banda y en el suelo
    const w = e.waves[i];
    w.r += dt * ATK.caja_onda_vel * (f2 ? 1.25 : 1);
    if (w.r > ATK.caja_onda_radio + 4) { w.m.dispose(); e.waves.splice(i, 1); continue; }
    w.m.isVisible = true; w.m.scaling.set(w.r, 1, w.r);
    if (MOON.on) { onFloor(e.pos, 0.1, w.m.position); orient(w.m, e.pos); } else w.m.position.set(e.pos.x, e.pos.y, e.pos.z);
    if (!w.hit && !air && Math.abs(dist - w.r) < ATK.caja_onda_ancho) { w.hit = true; ev = "onda"; }
  }
  if (e.danceT > 0) { // bailarinas: giran en espiral que respira entre radio mínimo y máximo
    e.danceT -= dt;
    const t = ATK.caja_bail_dur_s - e.danceT, rr = ATK.caja_bail_radio_min + (ATK.caja_bail_radio_max - ATK.caja_bail_radio_min) * (0.5 - 0.5 * Math.cos(t * (f2 ? 1.1 : 0.8)));
    for (const d of e.dancers) {
      d.a += dt * ATK.caja_bail_giro * (f2 ? 1.4 : 1);
      const p = at(e.pos, Math.sin(d.a) * rr, 0, Math.cos(d.a) * rr);
      if (MOON.on) onFloor(p, 0, p);
      d.m.position.copyFrom(p); d.m.rotation.y = t * 6; orient(d.m, p);
      if (e.shockCd <= 0 && !air && p.subtract(target).length() < 2.6) { e.shockCd = ATK.caja_bail_recarga_s; ev ??= "bailarina"; }
    }
    if (e.danceT <= 0) { for (const d of e.dancers) d.m.dispose(); e.dancers.length = 0; e.state = 0; e.timer = ATK.caja_descanso_s; }
  }
  if (e.state === 0) {
    e.showTele(null);
    if (e.timer <= 0 && dist < ATK.caja_distancia) { e.state = e.shots++ % 2 ? 3 : 1; e.timer = e.state === 1 ? ATK.caja_onda_aviso_s : ATK.caja_bail_aviso_s; }
  } else {
    c.speed = 0; c.turn = 2;
    if (e.state === 1) { // aviso: el aro rojo es el alcance máximo de las ondas
      e.showTele(e.pos, ATK.caja_onda_radio, 1 - e.timer / ATK.caja_onda_aviso_s);
      if (e.timer <= 0) { e.state = 2; e.timer = 0; e.ringsLeft = f2 ? ATK.caja_onda_n_f2 : ATK.caja_onda_n; e.showTele(null); }
    } else if (e.state === 2) { // suelta una onda tras otra
      if (e.timer <= 0) {
        if (e.ringsLeft-- > 0) { e.addWave(); e.timer = ATK.caja_onda_intervalo_s; }
        else { e.state = 0; e.timer = ATK.caja_descanso_s; }
      }
    } else if (e.state === 3) { // aviso: el aro rojo es hasta dónde llegan las bailarinas
      e.showTele(e.pos, ATK.caja_bail_radio_max, 1 - e.timer / ATK.caja_bail_aviso_s);
      if (e.timer <= 0) { e.state = 4; e.showTele(null); e.addDancers(f2 ? ATK.caja_bail_n_f2 : ATK.caja_bail_n); e.danceT = ATK.caja_bail_dur_s; }
    } // state 4: quieta hasta que terminen de bailar (arriba)
  }
  return ev;
};

export { cajaAI };
