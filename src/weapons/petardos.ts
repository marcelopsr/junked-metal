import * as B from "@babylonjs/core";
import { FX } from "../fx";
import { cyl, sph, template } from "../models";
import { M } from "../render";
import { rng } from "../rng";
import { arc, at, orient } from "../moon";
import { Weapon, cant, W, X, type Ctx } from "./base";

export class Petardos extends Weapon {
  flying: { m: B.InstancedMesh; from: B.Vector3; to: B.Vector3; t: number }[] = [];
  tpl = template("petardo", () => [
    cyl(0.3, 0.3, 0.8, M.plastic("#dc2626"), [0, 0, 0], [Math.PI / 2, 0, 0], 8),
    cyl(0.31, 0.31, 0.22, M.metal("#d97706"), [0, 0, 0], [Math.PI / 2, 0, 0], 8),
    cyl(0.28, 0.28, 0.06, M.matte("#78350f"), [0, 0, 0.38], [Math.PI / 2, 0, 0], 8),
    cyl(0.05, 0.05, 0.32, M.matte("#333"), [0, 0.04, -0.48], [1.2, 0, 0], 4),
    sph(0.09, M.glow("#ff6b00"), [0, 0.14, -0.6])
  ]);
  update(c: Ctx) {
    const cfg = W.petardos;
    if ((this.cd -= c.dt) <= 0) {
      this.cd = this.cdMax = this.recarga(cfg) * c.st.cooldown;
      const n = cant(cfg, this.lv);
      for (let i = 0; i < n; i++) {
        const near = c.enemies.filter((e) => B.Vector3.Distance(e.pos, c.car.pos) < cfg.alcance);
        if (!near.length) break;
        const t = near[(rng() * near.length) | 0];
        const m = this.tpl.createInstance("p");
        this.flying.push({ m, from: c.car.pos.clone(), to: t.pos.clone(), t: 0 });
      }
    }
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      f.t += c.dt / cfg.duracion_base;
      const p = arc(f.from, f.to, f.t, 5);
      f.m.position.copyFrom(p);
      f.m.rotation.x += c.dt * 12; orient(f.m);
      if (Math.random() < c.dt * 18) FX.trail(f.m.position, "#ffb347");
      if (f.t >= 1) {
        const r = (cfg.area_base + cfg.area_nivel * this.lv) * c.st.area, dmg = this.dano(cfg) * c.st.dmg;
        c.explode(f.to, r, dmg);
        const nr = X.petardos_racimo_n;
        if (this.evolved) for (let k = 0; k < nr; k++) { const a = (k / nr) * Math.PI * 2; c.explode(at(f.to, Math.cos(a) * r, 0, Math.sin(a) * r), r * X.petardos_racimo_radio, dmg * X.petardos_racimo_dano); }
        f.m.dispose();
        this.flying.splice(i, 1);
      }
    }
  }
  dispose() { for (const f of this.flying) f.m.dispose(); }
}
