import * as B from "@babylonjs/core";
import type { Enemy } from "../enemies";
import { SFX } from "../sfx";
import { template, tor } from "../models";
import { pbr } from "../render";
import { hd, onFloor, orient, rel, W as wv } from "../moon";
import { Weapon, W, X, type Ctx } from "./base";

// Tambor de hojalata: onda de choque rítmica alrededor del auto; cada cuarto golpe es un bombo: más ancho, más fuerte y empuja.
// Evolución (Banda de hojalata): ritmo más rápido, el bombo llega cada tercer golpe y aturde.
export class Tambor extends Weapon {
  waves: { m: B.InstancedMesh; t: number; R: number; big: boolean; hit: Set<Enemy> }[] = [];
  beat = 0;
  tpl = template("tambor", () => [tor(2, 0.2, pbr("drumwave", { color: "#cbd5e1", rough: 0.3, emissive: "#64748b", alpha: 0.75 }), [0, 0, 0], undefined, 24)]);
  update(c: Ctx) {
    const cfg = W.tambor, ev = this.evolved, R0 = (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area;
    if ((this.cd -= c.dt) <= 0 && c.enemies.some((e) => hd(e.pos, c.car.pos) < R0 * 1.3)) {
      this.cd = this.cdMax = (ev ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown;
      const big = ++this.beat % (ev ? X.tambor_cada_evo : X.tambor_cada) === 0, m = this.tpl.createInstance("ta");
      onFloor(c.car.pos, 0.4, m.position); orient(m);
      this.waves.push({ m, t: 0, R: R0 * (big ? X.tambor_bombo_area : 1), big, hit: new Set() });
      SFX.boss();
    }
    const dmg = this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1);
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.t += c.dt / cfg.duracion_base;
      const r = w.R * Math.min(1, w.t);
      onFloor(c.car.pos, 0.4, w.m.position); orient(w.m); w.m.scaling.setAll(Math.max(0.1, r / 1.1) * (w.big ? 1.25 : 1));
      for (const e of c.enemies) {
        if (w.hit.has(e)) continue;
        const { x: dx, z: dz } = rel(e.pos, c.car.pos), d = Math.hypot(dx, dz);
        if (d > r + e.radius) continue;
        w.hit.add(e);
        c.damage(e, dmg * (w.big ? X.tambor_bombo_mult : 1), w.big && d > 0.01 ? wv((dx / d) * X.tambor_empuje, 0.4, (dz / d) * X.tambor_empuje, c.car.pos) : undefined);
        if (w.big && ev && !e.def.boss) e.stun = Math.max(e.stun, cfg.duracion_evo);
      }
      if (w.t >= 1) { w.m.dispose(); this.waves.splice(i, 1); }
    }
  }
  dispose() { for (const w of this.waves) w.m.dispose(); }
}
