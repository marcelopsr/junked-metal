import * as B from "@babylonjs/core";
import type { Enemy } from "../enemies";
import { FX } from "../fx";
import { SFX } from "../sfx";
import { cyl, sph, template } from "../models";
import { M } from "../render";
import { advance, at, hd, orient, yawTo, W as wv } from "../moon";
import { Weapon, nearest, cant, W, X, type Ctx } from "./base";

// Cohete de botella: cohete lento que gira hacia el bicho más cercano y explota en área al tocarlo (o al agotar el combustible).
// Evolución (Enjambre de botellas): cuatro cohetes por tanda, explosión más ancha.
export class Cohete extends Weapon {
  shots: { m: B.InstancedMesh; yaw: number; life: number }[] = [];
  tpl = template("cohete", () => [cyl(0.2, 0.2, 0.9, M.plastic("#4ade80"), [0, 0, 0], [Math.PI / 2, 0, 0], 8), cyl(0.04, 0.04, 0.3, M.matte("#2b2d31"), [0, 0, 0.55], [Math.PI / 2, 0, 0], 6), sph(0.14, M.glow("#ffb02e"), [0, 0, -0.55])]);
  update(c: Ctx) {
    const cfg = W.cohete, ev = this.evolved, R = (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area;
    if ((this.cd -= c.dt) <= 0) {
      const t = nearest(c.car.pos, c.enemies, cfg.alcance);
      if (t) {
        this.cd = this.cdMax = (ev ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown;
        const n = ev ? cfg.n_evo : cant(cfg, this.lv), base = yawTo(c.car.pos, t.pos);
        for (let i = 0; i < n; i++) {
          const m = this.tpl.createInstance("co"); at(c.car.pos, 0, 0.8, 0, m.position);
          this.shots.push({ m, yaw: base + (i - (n - 1) / 2) * X.cohete_abanico, life: cfg.duracion_base });
        }
        SFX.click();
      }
    }
    const dmg = this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1);
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i], t: Enemy | null = nearest(s.m.position, c.enemies, cfg.alcance);
      if (t) { // gira hacia el blanco a tasa limitada (teledirigido lento)
        let d = yawTo(s.m.position, t.pos) - s.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
        s.yaw += Math.max(-1, Math.min(1, d / (X.cohete_giro * c.dt))) * X.cohete_giro * c.dt;
      }
      advance(s.m.position, wv(Math.sin(s.yaw), 0, Math.cos(s.yaw), s.m.position), cfg.velocidad * c.dt); orient(s.m); s.m.rotation.y = s.yaw;
      const hit = c.enemies.some((o) => hd(s.m.position, o.pos) < o.radius + X.cohete_golpe_radio);
      if (hit || (s.life -= c.dt) <= 0) { c.explode(s.m.position, R, dmg); FX.hit(s.m.position.clone()); s.m.dispose(); this.shots.splice(i, 1); }
    }
  }
  dispose() { for (const s of this.shots) s.m.dispose(); }
}
