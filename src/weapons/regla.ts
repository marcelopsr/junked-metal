import * as B from "@babylonjs/core";
import type { Enemy } from "../enemies";
import { box, cyl, template } from "../models";
import { M, pbr } from "../render";
import { at, hd, MOON, orient, yawTo } from "../moon";
import { Weapon, nearest, cant, W, X, type Ctx } from "./base";

// Bumerán de regla: vuela en un lazo (sale por un lado, vuelve por el otro) y regresa al auto; a cada enemigo
// le pega una vez de ida y otra de vuelta. Evolución (Bumerán triple): tres en abanico, más largas.
export class Regla extends Weapon {
  rs: { m: B.InstancedMesh; from: B.Vector3; dir: B.Vector3; side: number; t: number; hit: Set<Enemy> }[] = [];
  tpl = template("regla", () => [
    box(0.5, 0.06, 2.6, pbr("regla", { color: "#e8d48a", rough: 0.5, emissive: "#2a5a10" }), [0, 0, 0]),
    box(0.06, 0.07, 2.6, M.metal("#d1d5db"), [-0.22, 0, 0]),
    box(0.56, 0.09, 0.32, M.metal("#374151"), [0, 0.01, -0.3]),
    cyl(0.08, 0.08, 0.12, M.metal("#d97706"), [0.2, 0.07, -0.3], undefined, 6),
    ...[-1.1, -0.55, 0, 0.55, 1.1].map((z) => box(0.2, 0.08, 0.04, M.glow("#8dff6a"), [0.15, 0.01, z])),
  ]);
  update(c: Ctx) {
    const cfg = W.regla, ev = this.evolved, R = (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area, T = ev ? cfg.duracion_evo : cfg.duracion_base;
    if (!this.rs.length && (this.cd -= c.dt) <= 0) {
      const t = nearest(c.car.pos, c.enemies, R);
      if (t) {
        this.cd = this.cdMax = (ev ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown;
        const base = yawTo(c.car.pos, t.pos);
        const na = ev ? cfg.n_evo : cant(cfg, this.lv), sep = ev ? X.regla_abanico_evo : X.regla_abanico;
        const angs = Array.from({ length: na }, (_, i) => (i - (na - 1) / 2) * sep); // en abanico
        angs.forEach((o, i) => this.rs.push({ m: this.tpl.createInstance("r"), from: c.car.pos.clone(), dir: new B.Vector3(Math.sin(base + o), 0, Math.cos(base + o)), side: i % 2 ? -1 : 1, t: 0, hit: new Set() }));
      }
    }
    const dmg = (ev ? cfg.dano_evo_fijo : this.dano(cfg)) * c.st.dmg, sc = ev ? X.regla_tamano_evo : 1;
    for (let i = this.rs.length - 1; i >= 0; i--) {
      const r = this.rs[i];
      const half = r.t < 0.5;
      r.t += c.dt / T;
      if (half && r.t >= 0.5) r.hit.clear(); // la vuelta vuelve a pegar
      if (r.t >= 1) { r.m.dispose(); this.rs.splice(i, 1); continue; }
      // Lazo: adelante R·(1-cos θ)/2, de costado 0,35R·sin θ; el origen se desliza hacia el auto para volver a él
      const th = r.t * Math.PI * 2, o = B.Vector3.Lerp(r.from, c.car.pos, r.t);
      const fw = (R * (1 - Math.cos(th))) / 2, sd = 0.35 * R * Math.sin(th) * r.side;
      if (MOON.on) at(o, r.dir.x * fw + r.dir.z * sd, 0.7, r.dir.z * fw - r.dir.x * sd, r.m.position); // r.dir: marco local
      else r.m.position.set(o.x + r.dir.x * fw + r.dir.z * sd, c.car.pos.y + 0.7, o.z + r.dir.z * fw - r.dir.x * sd);
      r.m.rotation.y += c.dt * 18; orient(r.m);
      r.m.scaling.setAll(sc);
      for (const e of c.enemies) if (!r.hit.has(e) && hd(r.m.position, e.pos) < e.radius + 1.2 * sc) {
        r.hit.add(e);
        c.damage(e, dmg, e.pos.subtract(r.m.position).normalize().scale(X.regla_empuje));
      }
    }
  }
  dispose() { for (const r of this.rs) r.m.dispose(); }
}
