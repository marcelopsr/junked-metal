import * as B from "@babylonjs/core";
import type { Enemy } from "../enemies";
import { SFX } from "../sfx";
import { sph, template } from "../models";
import { M } from "../render";
import { rng } from "../rng";
import { at, rel, W as wv } from "../moon";
import { Weapon, nearest, cant, W, X, type Ctx } from "./base";

// Resortera de canicas: lanza canicas a un corral circular alrededor del auto; rebotan en el borde y contra cada bicho que golpean.
// Evolución (Lluvia de canicas): más canicas, corral más grande, duran más y pegan más.
export class Canicas extends Weapon {
  balls: { m: B.InstancedMesh; x: number; z: number; vx: number; vz: number; life: number; hit: Map<Enemy, number> }[] = [];
  tpl = template("canica", () => [sph(0.35, M.glow("#7de8a8"), [0, 0, 0])]);
  update(c: Ctx) {
    const cfg = W.canicas, ev = this.evolved;
    const R = (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area;
    if ((this.cd -= c.dt) <= 0) {
      const tg = nearest(c.car.pos, c.enemies, R);
      if (tg) {
        this.cd = this.cdMax = (ev ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown;
        const n = ev ? cfg.n_evo : cant(cfg, this.lv), rd = rel(tg.pos, c.car.pos), base = Math.atan2(rd.x, rd.z), life = ev ? cfg.duracion_evo : cfg.duracion_base + cfg.duracion_nivel * this.lv;
        for (let i = 0; i < n && this.balls.length < 40; i++) {
          const a = base + (i - (n - 1) / 2) * 0.5 + (rng() - 0.5) * 0.2;
          this.balls.push({ m: this.tpl.createInstance("c"), x: 0, z: 0, vx: Math.sin(a) * cfg.velocidad, vz: Math.cos(a) * cfg.velocidad, life, hit: new Map() });
        }
        SFX.zap();
      }
    }
    const dmg = this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1);
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.x += b.vx * c.dt; b.z += b.vz * c.dt;
      const d = Math.hypot(b.x, b.z);
      if (d > R) { const nx = b.x / d, nz = b.z / d, dp = b.vx * nx + b.vz * nz; if (dp > 0) { b.vx -= 2 * dp * nx; b.vz -= 2 * dp * nz; } b.x = nx * R; b.z = nz * R; }
      at(c.car.pos, b.x, 0.5, b.z, b.m.position);
      for (const [e, t] of b.hit) if ((b.hit.set(e, t - c.dt), t - c.dt <= 0)) b.hit.delete(e);
      for (const e of c.enemies) {
        if (b.hit.has(e)) continue;
        const { x: ex, z: ez } = rel(e.pos, c.car.pos), dx = b.x - ex, dz = b.z - ez, dd = Math.hypot(dx, dz);
        if (dd > e.radius + X.canicas_golpe_radio) continue;
        b.hit.set(e, X.canicas_rearme_s);
        c.damage(e, dmg, wv(-dx / (dd || 1) * 2, 0.2, -dz / (dd || 1) * 2, c.car.pos));
        const nx = dx / (dd || 1), nz = dz / (dd || 1), dp = b.vx * nx + b.vz * nz;
        if (dp < 0) { b.vx -= 2 * dp * nx; b.vz -= 2 * dp * nz; }
      }
      if ((b.life -= c.dt) <= 0) { b.m.dispose(); this.balls.splice(i, 1); }
    }
  }
  dispose() { for (const b of this.balls) b.m.dispose(); }
}
