import * as B from "@babylonjs/core";
import { FX } from "../fx";
import { SFX } from "../sfx";
import { box, cyl, template } from "../models";
import { M } from "../render";
import { at, onFloor, orient, rel, W as wv } from "../moon";
import { Weapon, nearest, W, X, type Ctx } from "./base";

// Matamoscas eléctrico: golpe instantáneo en arco frontal hacia el bicho más cercano; aturde, y pega doble a los ya aturdidos.
// Evolución (Matamoscas zapador): golpea en círculo completo, más largo y aturde más.
export class Matamoscas extends Weapon {
  swing: { m: B.InstancedMesh; t: number; a0: number }[] = [];
  tpl = template("matamoscas_w", () => [cyl(0.08, 0.08, 1.6, M.matte("#2b2d31"), [0, 0, 0.8], [Math.PI / 2, 0, 0], 6), box(0.9, 0.06, 0.9, M.plastic("#facc15"), [0, 0, 1.9]), box(0.7, 0.08, 0.7, M.glow("#7de8ff"), [0, 0.02, 1.9])]);
  update(c: Ctx) {
    const cfg = W.matamoscas, ev = this.evolved;
    const R = (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area;
    if ((this.cd -= c.dt) <= 0) {
      const t = nearest(c.car.pos, c.enemies, R);
      if (t) {
        this.cd = this.cdMax = (ev ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown;
        const rd = rel(t.pos, c.car.pos), ax = rd.x, az = rd.z, dmg = this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1), stun = ev ? cfg.duracion_evo : cfg.duracion_base + cfg.duracion_nivel * this.lv;
        for (const e of c.enemies) {
          const { x: dx, z: dz } = rel(e.pos, c.car.pos), d = Math.hypot(dx, dz);
          if (d > R + e.radius || (!ev && d > 0.01 && dx * ax + dz * az < d * Math.hypot(ax, az) * X.matamoscas_cono)) continue;
          c.damage(e, dmg * (e.stun > 0 ? X.matamoscas_aturdido_mult : 1), d > 0.01 ? wv((dx / d) * X.matamoscas_empuje, 0.2, (dz / d) * X.matamoscas_empuje, c.car.pos) : undefined);
          if (!e.def.boss) e.stun = Math.max(e.stun, stun);
          FX.hit(at(e.pos, 0, 0.6, 0));
        }
        const m = this.tpl.createInstance("mm"); onFloor(c.car.pos, 0.5, m.position);
        this.swing.push({ m, t: 0, a0: Math.atan2(ax, az) }); SFX.zap();
      }
    }
    for (let i = this.swing.length - 1; i >= 0; i--) {
      const s = this.swing[i];
      s.t += c.dt / 0.2;
      onFloor(c.car.pos, 0.5, s.m.position);
      s.m.rotation.set(0, s.a0 + (ev ? s.t * Math.PI * 2 : (s.t - 0.5) * 2), 0); s.m.scaling.setAll(Math.max(0.5, R / 3.5)); orient(s.m);
      if (s.t >= 1) { s.m.dispose(); this.swing.splice(i, 1); }
    }
  }
  dispose() { for (const s of this.swing) s.m.dispose(); }
}
