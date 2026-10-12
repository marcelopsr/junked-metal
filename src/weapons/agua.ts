import * as B from "@babylonjs/core";
import { sph, template } from "../models";
import { pbr } from "../render";
import { rng } from "../rng";
import { at, below, grav, orient, rel, W as wv } from "../moon";
import { Weapon, nearest, W, X, type Ctx } from "./base";

// Chorro en cono hacia el enemigo más cercano: daño bajo por tick, empuja y deja empapado (lento) a todo lo que toca.
// El cono decide el daño (determinista); las gotas son solo visuales.
export class Agua extends Weapon {
  drops: { m: B.InstancedMesh; v: B.Vector3; life: number }[] = [];
  spray = 0;
  tick = 0;
  dir = new B.Vector3(0, 0, 1);
  tpl = template("gota", () => [sph(0.3, pbr("water", { color: "#9dffc8", rough: 0.05, alpha: 0.7, emissive: "#1f7a4a" }), [0, 0, 0], [1, 1, 1.8], 6)]);
  update(c: Ctx) {
    const cfg = W.agua;
    const R = (this.evolved ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area, half = this.evolved ? X.agua_cono_evo : X.agua_cono;
    if (this.spray <= 0 && (this.cd -= c.dt) <= 0) {
      const t = nearest(c.car.pos, c.enemies, R);
      if (t) {
        this.spray = this.evolved ? cfg.duracion_evo : cfg.duracion_base + cfg.duracion_nivel * this.lv;
        this.cd = this.cdMax = (this.evolved ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown;
        const rd = rel(t.pos, c.car.pos); this.dir.set(rd.x, 0, rd.z).normalize(); // marco local del auto
      }
    }
    if (this.spray > 0) {
      this.spray -= c.dt;
      if ((this.tick -= c.dt) <= 0) {
        this.tick = X.agua_pulso_s;
        const dmg = this.dano(cfg) * c.st.dmg * (this.evolved ? cfg.dano_evo_mult : 1), push = this.evolved ? X.agua_empuje_evo : X.agua_empuje;
        for (const e of c.enemies) {
          const { x: dx, z: dz } = rel(e.pos, c.car.pos), d = Math.hypot(dx, dz);
          if (d < 0.01 || d > R + e.radius) continue;
          if (Math.acos(B.Scalar.Clamp((dx * this.dir.x + dz * this.dir.z) / d, -1, 1)) > half + e.radius / d) continue;
          c.damage(e, dmg, wv((dx / d) * push, 0.3, (dz / d) * push, c.car.pos));
          e.slow = Math.max(e.slow, this.evolved ? X.agua_ralentiza_evo_s : X.agua_ralentiza_s);
        }
      }
      for (let k = 0; k < 3 && this.drops.length < 70; k++) {
        const a = Math.atan2(this.dir.x, this.dir.z) + (rng() - 0.5) * half * 1.6, sp = 22 + rng() * 8;
        const m = this.tpl.createInstance("w");
        at(c.car.pos, 0, 0.8, 0, m.position);
        m.rotation.y = a; orient(m);
        this.drops.push({ m, v: wv(Math.sin(a) * sp, 2 + rng() * 2, Math.cos(a) * sp, c.car.pos), life: R / sp });
      }
    }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const g = this.drops[i];
      g.m.position.addInPlace(g.v.scale(c.dt));
      grav(g.v, g.m.position, 12 * c.dt);
      if ((g.life -= c.dt) <= 0 || below(g.m.position, 0.05)) { g.m.dispose(); this.drops.splice(i, 1); }
    }
  }
  dispose() { for (const g of this.drops) g.m.dispose(); }
}
