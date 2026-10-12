import * as B from "@babylonjs/core";
import { FX } from "../fx";
import { SFX } from "../sfx";
import { box, template } from "../models";
import { M } from "../render";
import { at, onFloor, orient, rel, yawTo } from "../moon";
import { Weapon, nearest, cant, W, X, type Ctx } from "./base";

// Serpentinas: tira una cinta en línea hacia el bicho más cercano; todos los que cruzan quedan atados (ralentizados) y reciben un tirón de daño.
// Evolución (Cintas de fiesta): tres cintas en abanico, más anchas y largas; los atados quedan inmóviles (no jefes).
export class Serpentinas extends Weapon {
  ribbons: { m: B.InstancedMesh; t: number; yaw: number; len: number }[] = [];
  tpl = template("serpentina", () => [box(0.4, 0.04, 1, M.plastic("#f472b6"), [0, 0, 0.5]), box(0.14, 0.05, 1, M.plastic("#facc15"), [0, 0.01, 0.5])]);
  update(c: Ctx) {
    const cfg = W.serpentinas, ev = this.evolved;
    const L = (ev ? cfg.alcance_evo : cfg.alcance) * c.st.area, width = (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area;
    if ((this.cd -= c.dt) <= 0) {
      const t = nearest(c.car.pos, c.enemies, L);
      if (t) {
        this.cd = this.cdMax = (ev ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown;
        const n = ev ? cfg.n_evo : cant(cfg, this.lv), base = yawTo(c.car.pos, t.pos), dmg = this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1), dur = ev ? cfg.duracion_evo : cfg.duracion_base + cfg.duracion_nivel * this.lv;
        for (let i = 0; i < n; i++) {
          const yaw = base + (i - (n - 1) / 2) * X.serpentinas_abanico, dx = Math.sin(yaw), dz = Math.cos(yaw);
          for (const e of c.enemies) {
            const r = rel(e.pos, c.car.pos), along = r.x * dx + r.z * dz, side = Math.abs(r.x * dz - r.z * dx);
            if (along < 0 || along > L + e.radius || side > width * 0.5 + e.radius) continue;
            c.damage(e, dmg);
            if (ev && !e.def.boss) e.stun = Math.max(e.stun, dur); else e.slow = Math.max(e.slow, dur);
            FX.hit(at(e.pos, 0, 0.5, 0));
          }
          const m = this.tpl.createInstance("se"); onFloor(c.car.pos, 0.2, m.position);
          this.ribbons.push({ m, t: 0, yaw, len: L });
        }
        SFX.click();
      }
    }
    for (let i = this.ribbons.length - 1; i >= 0; i--) {
      const s = this.ribbons[i];
      s.t += c.dt / X.serpentinas_vida_s;
      onFloor(c.car.pos, 0.2, s.m.position); orient(s.m);
      s.m.rotation.y = s.yaw; s.m.scaling.set(width * 0.6, 1, s.len * Math.min(1, s.t * 4));
      if (s.t >= 1) { s.m.dispose(); this.ribbons.splice(i, 1); }
    }
  }
  dispose() { for (const s of this.ribbons) s.m.dispose(); }
}
