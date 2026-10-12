import * as B from "@babylonjs/core";
import type { Enemy } from "../enemies";
import { SFX } from "../sfx";
import { cyl, template } from "../models";
import { M } from "../render";
import { advance, at, hflat, orient, rel, W as wv } from "../moon";
import { Weapon, nearest, cant, W, X, type Ctx } from "./base";

// Imán de tuercas: tuercas en órbita que atraen a los bichos hacia el anillo; cada tanto salen disparadas (cada una a un blanco distinto), atraviesan todo y se rearman.
// Evolución (Electroimán de grúa): más tuercas, atracción doble, alcance largo y golpe mayor.
export class Tuercas extends Weapon {
  orbit: B.InstancedMesh[] = [];
  fly: { m: B.InstancedMesh; dir: B.Vector3; life: number; hit: Set<Enemy> }[] = [];
  a = 0;
  rearm = 0;
  tpl = template("tuerca", () => [
    cyl(0.5, 0.5, 0.26, M.metal("#a8b0ba"), [0, 0, 0], undefined, 6),
    cyl(0.2, 0.2, 0.3, M.matte("#2b2d31"), [0, 0, 0], undefined, 8),
  ]);
  update(c: Ctx) {
    const cfg = W.tuercas, ev = this.evolved;
    const n = ev ? cfg.n_evo : cant(cfg, this.lv), pullR = (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area;
    if (this.rearm > 0) this.rearm -= c.dt;
    else while (this.orbit.length < n && !this.fly.length) this.orbit.push(this.tpl.createInstance("n"));
    // Atracción: arrastra hacia el anillo (se detiene al llegar, no los mete al auto)
    if (this.orbit.length) {
      const k = X.tuercas_atrae * (ev ? X.tuercas_atrae_evo_mult : 1) * c.dt;
      for (const e of c.enemies) {
        const { x: dx, z: dz } = rel(e.pos, c.car.pos), d = Math.hypot(dx, dz);
        if (d > pullR + e.radius || d < X.tuercas_anillo_min) continue;
        c.damage(e, 0, wv((-dx / d) * k, 0, (-dz / d) * k, c.car.pos));
      }
    }
    this.a += c.dt * X.tuercas_giro;
    this.orbit.forEach((m, i) => {
      const a = this.a + (i * Math.PI * 2) / this.orbit.length;
      at(c.car.pos, Math.sin(a) * X.tuercas_orbita_r, 0.5, Math.cos(a) * X.tuercas_orbita_r, m.position);
      m.rotation.set(0.5, this.a * 2, 0); orient(m);
    });
    if (this.orbit.length && (this.cd -= c.dt) <= 0) {
      const R = ev ? cfg.alcance_evo : cfg.alcance, used = new Set<Enemy>();
      let first = null as Enemy | null;
      while (this.orbit.length) {
        const m = this.orbit.pop()!, t: Enemy | null = nearest(m.position, c.enemies, R, used) ?? first;
        if (!t) { this.orbit.push(m); break; }
        used.add(t); first ??= t;
        const dir = hflat(t.pos.subtract(m.position), m.position).normalize();
        this.fly.push({ m, dir, life: R / cfg.velocidad, hit: new Set() });
      }
      if (this.fly.length) { this.cd = this.cdMax = (ev ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown; this.rearm = X.tuercas_rearme_s; SFX.zap(); }
    }
    const dmg = this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1);
    for (let i = this.fly.length - 1; i >= 0; i--) {
      const f = this.fly[i];
      advance(f.m.position, f.dir, cfg.velocidad * c.dt);
      f.m.rotation.x += c.dt * 14; orient(f.m);
      for (const e of c.enemies) if (!f.hit.has(e) && B.Vector3.Distance(f.m.position, e.pos) < e.radius + X.tuercas_golpe_radio) { f.hit.add(e); c.damage(e, dmg, e.pos.subtract(f.m.position).normalize().scale(X.tuercas_empuje)); }
      if ((f.life -= c.dt) <= 0) { f.m.dispose(); this.fly.splice(i, 1); }
    }
  }
  dispose() { for (const m of this.orbit) m.dispose(); for (const f of this.fly) f.m.dispose(); }
}
