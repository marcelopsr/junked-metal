import * as B from "@babylonjs/core";
import { FX } from "../fx";
import { cyl, template } from "../models";
import { M } from "../render";
import { at, hd, onFloor, orient } from "../moon";
import { Weapon, cant, W, X, type Ctx } from "./base";

// Trompo de chapitas: el auto va regando chapitas de gaseosa filosas; cada bicho que pisa una se lastima y se frena, y la chapita se gasta tras unos pisotones.
// Evolución (Campo de abrojos): muchas más chapitas, duran el doble y pegan más.
export class Chapitas extends Weapon {
  caps: { m: B.InstancedMesh; life: number; uses: number }[] = [];
  last: B.Vector3 | null = null;
  tpl = template("chapita", () => [cyl(0.5, 0.5, 0.08, M.metal("#c8372d"), [0, 0.05, 0], undefined, 12), cyl(0.56, 0.56, 0.04, M.metal("#e6e9ee"), [0, 0.02, 0], undefined, 12)]);
  update(c: Ctx) {
    const cfg = W.chapitas, ev = this.evolved;
    const max = ev ? cfg.n_evo : cant(cfg, this.lv), life = ev ? cfg.duracion_evo : cfg.duracion_base + cfg.duracion_nivel * this.lv, r = (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area;
    if (Math.abs(c.fs) > X.chispero_vel_min && (!this.last || hd(this.last, c.car.pos) >= X.chapitas_paso_m)) {
      const m = this.tpl.createInstance("ch");
      onFloor(c.car.pos, 0.03, m.position); orient(m); m.scaling.setAll(r);
      this.caps.push({ m, life, uses: X.chapitas_usos });
      this.last = c.car.pos.clone();
    }
    const dmg = this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1);
    for (let i = this.caps.length - 1; i >= 0; i--) {
      const k = this.caps[i];
      for (const e of c.enemies) if (!e.airborne && e.hitCd <= 0 && k.uses > 0 && hd(k.m.position, e.pos) < e.radius * 0.6 + r) {
        c.damage(e, dmg); e.slow = Math.max(e.slow, X.chapitas_ralentiza_s); e.hitCd = X.chapitas_golpe_recarga_s; k.uses--;
        FX.hit(at(k.m.position, 0, 0.3, 0));
      }
      if ((k.life -= c.dt) <= 0 || k.uses <= 0 || this.caps.length > max) { k.m.dispose(); this.caps.splice(i, 1); }
    }
  }
  dispose() { for (const k of this.caps) k.m.dispose(); }
}
