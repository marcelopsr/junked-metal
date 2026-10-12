import * as B from "@babylonjs/core";
import { cyl, template, tor } from "../models";
import { M } from "../render";
import { at, orient } from "../moon";
import { Weapon, cant, W, X, type Ctx } from "./base";

export class Clips extends Weapon {
  ms: B.InstancedMesh[] = [];
  a = 0;
  tpl = template("clip", () => [
    cyl(0.06, 0.06, 1.0, M.metal("#d6dbe1"), [-0.28, 0, 0], [Math.PI / 2, 0, 0], 6),
    cyl(0.06, 0.06, 1.2, M.metal("#d6dbe1"), [0.28, 0, 0.1], [Math.PI / 2, 0, 0], 6),
    cyl(0.06, 0.06, 0.7, M.metal("#d6dbe1"), [0.08, 0, -0.15], [Math.PI / 2, 0, 0], 6),
    tor(0.56, 0.06, M.metal("#d6dbe1"), [0, 0, 0.5], undefined, 10),
    tor(0.56, 0.06, M.metal("#d6dbe1"), [0.08, 0, -0.5], undefined, 10),
    tor(0.2, 0.06, M.metal("#d6dbe1"), [-0.02, 0, 0.3], undefined, 8),
  ]);
  update(c: Ctx) {
    const cfg = W.clips;
    const n = this.evolved ? cfg.n_evo : cant(cfg, this.lv);
    const r = (this.evolved ? cfg.area_evo : cfg.area_base) * c.st.area;
    const sc = this.evolved ? 2 : 1 + this.lv * 0.1;
    while (this.ms.length < n) this.ms.push(this.tpl.createInstance("c"));
    this.a += c.dt * (this.evolved ? 5 : 3.5);
    const dmg = (this.evolved ? cfg.dano_evo_fijo : this.dano(cfg)) * c.st.dmg;
    this.ms.forEach((m, i) => {
      const a = this.a + (i * Math.PI * 2) / n;
      at(c.car.pos, Math.sin(a) * r, 0.4, Math.cos(a) * r, m.position);
      m.rotation.set(0, -a, 0.3); orient(m);
      m.scaling.set(sc, sc, sc * 2.2);
      for (const e of c.enemies) if (e.hitCd <= 0 && B.Vector3.Distance(m.position, e.pos) < e.radius + 0.5 * sc) {
        c.damage(e, dmg, e.pos.subtract(c.car.pos).normalize().scale(X.clips_empuje));
        e.hitCd = X.clips_golpe_recarga_s;
      }
    });
  }
  dispose() { for (const m of this.ms) m.dispose(); }
}
