import * as B from "@babylonjs/core";
import type { Enemy } from "../enemies";
import { box, template } from "../models";
import { M } from "../render";
import { at, hd, orient, yawTo } from "../moon";
import { Weapon, cant, W, X, type Ctx } from "./base";

// Bumerán cazador: sale en línea recta contra el bicho más fuerte a su alcance, lo atraviesa y vuelve al auto; pega a la ida y a la vuelta.
// Evolución (Bumeranes cruzados): dos que describen una S y se cruzan en el aire, más grandes.
export class Bumeran extends Weapon {
  bs: { m: B.InstancedMesh; yaw: number; D: number; side: number; t: number; hit: Set<Enemy> }[] = [];
  tpl = template("bumeran", () => [box(1.5, 0.08, 0.38, M.plastic("#f59e0b"), [0.55, 0, 0.3], [0, 0.6, 0]), box(1.5, 0.08, 0.38, M.plastic("#f59e0b"), [-0.55, 0, 0.3], [0, -0.6, 0]), box(0.5, 0.1, 0.5, M.metal("#374151"), [0, 0.01, 0])]);
  update(c: Ctx) {
    const cfg = W.bumeran, ev = this.evolved, T = cfg.duracion_base;
    if (!this.bs.length && (this.cd -= c.dt) <= 0) {
      let t: Enemy | null = null; // el más fuerte (más vida) a su alcance
      for (const e of c.enemies) if (hd(e.pos, c.car.pos) < cfg.alcance && (!t || e.hp > t.hp)) t = e;
      if (t) {
        this.cd = this.cdMax = (ev ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown;
        const n = ev ? cfg.n_evo : cant(cfg, this.lv), yaw = yawTo(c.car.pos, t.pos), D = Math.min(cfg.alcance, hd(t.pos, c.car.pos) + 3);
        for (let i = 0; i < n; i++) this.bs.push({ m: this.tpl.createInstance("bu"), yaw: yaw + (n > 1 && !ev ? (i - (n - 1) / 2) * 0.4 : 0), D, side: n > 1 ? (i % 2 ? -1 : 1) : 0, t: 0, hit: new Set() });
      }
    }
    const dmg = this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1), rr = (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area;
    for (let i = this.bs.length - 1; i >= 0; i--) {
      const b = this.bs[i], half = b.t < 0.5;
      b.t += c.dt / T;
      if (half && b.t >= 0.5) b.hit.clear(); // la vuelta vuelve a pegar
      if (b.t >= 1) { b.m.dispose(); this.bs.splice(i, 1); continue; }
      const d = b.D * (1 - Math.abs(1 - 2 * b.t)), lat = ev ? X.bumeran_curva * b.D * Math.sin(Math.PI * 2 * b.t) * b.side : 0; // ida y vuelta por la misma recta; el cruzado dibuja una S
      at(c.car.pos, Math.sin(b.yaw) * d + Math.cos(b.yaw) * lat, 0.7, Math.cos(b.yaw) * d - Math.sin(b.yaw) * lat, b.m.position);
      b.m.rotation.set(0, b.m.rotation.y + c.dt * 20, 0); orient(b.m); b.m.scaling.setAll(ev ? 1.3 : 1);
      for (const e of c.enemies) if (!b.hit.has(e) && hd(b.m.position, e.pos) < e.radius + rr) { b.hit.add(e); c.damage(e, dmg, e.pos.subtract(b.m.position).normalize().scale(X.bumeran_empuje)); }
    }
  }
  dispose() { for (const b of this.bs) b.m.dispose(); this.bs = []; }
}
