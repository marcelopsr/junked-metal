import * as B from "@babylonjs/core";
import type { Enemy } from "../enemies";
import { FX } from "../fx";
import { cyl, template } from "../models";
import { M } from "../render";
import { at, hd, MOON, orient, SUN_DIR, upAt, yawTo } from "../moon";
import { Weapon, nearest, W, X, type Ctx } from "./base";

// Lupa solar: rayo continuo sobre el bicho (o los bichos) más cercano; el daño sube cuanto más tiempo se sostiene sobre el mismo.
// En la luna, del lado del sol, pega el doble. Evolución (Lupa triple): el rayo se reparte en tres blancos, con más alcance.
export class LupaSolar extends Weapon {
  heat = new Map<Enemy, number>(); // segundos de calentamiento por bicho
  rays: B.InstancedMesh[] = [];
  tpl = template("rayoSolar", () => [cyl(0.12, 0.12, 1, M.glow("#ffe27a"), [0, 0, 0.5], [Math.PI / 2, 0, 0], 6)]); // largo 1 en z: se estira por instancia
  update(c: Ctx) {
    const cfg = W.lupasolar, ev = this.evolved, n = ev ? cfg.n_evo : cfg.n_base, R = (ev ? cfg.alcance_evo : cfg.alcance) * c.st.area;
    const near = n === 1 ? [nearest(c.car.pos, c.enemies, R)].filter((e): e is Enemy => !!e) : c.enemies.map((e) => ({ e, d: hd(e.pos, c.car.pos) })).filter((x) => x.d < R).sort((a, b) => a.d - b.d).slice(0, n).map((x) => x.e);
    const sun = MOON.on && B.Vector3.Dot(upAt(c.car.pos), SUN_DIR) > 0 ? X.lupasolar_luna_mult : 1;
    const base = this.dano(cfg) * c.st.dmg * sun;
    for (const e of near) {
      const h = Math.min(X.lupasolar_calor_max_s, (this.heat.get(e) ?? 0) + c.dt);
      this.heat.set(e, h);
      c.damage(e, base * (1 + h * X.lupasolar_calor_k) * c.dt);
      if (Math.random() < 0.15) FX.hit(at(e.pos, 0, 0.5, 0));
    }
    for (const [e, h] of this.heat) if (!near.includes(e)) { if (h - c.dt * 2 <= 0 || !c.enemies.includes(e)) this.heat.delete(e); else this.heat.set(e, h - c.dt * 2); } // se enfría al soltar el blanco
    while (this.rays.length < n) this.rays.push(this.tpl.createInstance("ls"));
    this.rays.forEach((r, i) => {
      const e = near[i];
      r.setEnabled(!!e);
      if (!e) return;
      const a = at(c.car.pos, 0, 0.9, 0), b = at(e.pos, 0, 0.5, 0);
      r.position.copyFrom(a); r.rotation.y = yawTo(c.car.pos, e.pos); r.scaling.set(1, 1, B.Vector3.Distance(a, b)); orient(r);
    });
  }
  dispose() { for (const r of this.rays) r.dispose(); this.rays = []; this.heat.clear(); }
}
