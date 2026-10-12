import * as B from "@babylonjs/core";
import { FX } from "../fx";
import { cyl, template } from "../models";
import { M } from "../render";
import { at, hd, onFloor, orient, rel, yawOf, W as wv } from "../moon";
import { Weapon, W, X, type Ctx } from "./base";

// Paraguas giratorio: un paraguas gira delante del auto como escudo; todo bicho que lo toca recibe golpe y sale empujado.
// Evolución (Paraguas blindado): dos paraguas enormes, uno adelante y otro atrás.
// ponytail: refleja a los bichos, no a los proyectiles enemigos (viven en main.ts y no pasan por Ctx); sumarlo si hace falta.
export class Paraguas extends Weapon {
  ms: B.InstancedMesh[] = [];
  spin = 0;
  tpl = template("paraguas", () => [cyl(0.05, 0.05, 1.6, M.matte("#2b2d31"), [0, 0.8, 0], undefined, 6), cyl(0.05, 1.1, 0.5, M.plastic("#e11d48"), [0, 1.65, 0], undefined, 8)]);
  update(c: Ctx) {
    const cfg = W.paraguas, ev = this.evolved, n = ev ? 2 : 1;
    const r = (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area;
    while (this.ms.length < n) this.ms.push(this.tpl.createInstance("pa"));
    const yaw = yawOf(c.car.root.forward, c.car.pos), dmg = this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1);
    this.spin += c.dt * X.paraguas_giro;
    this.ms.forEach((m, i) => {
      const a = yaw + i * Math.PI;
      at(c.car.pos, Math.sin(a) * X.paraguas_dist, 0, Math.cos(a) * X.paraguas_dist, m.position); onFloor(m.position, 0, m.position); orient(m);
      m.rotation.set(0.9, this.spin, 0); m.scaling.setAll(r / 1.6);
      for (const e of c.enemies) {
        if (e.hitCd > 0 || e.airborne || hd(m.position, e.pos) > r + e.radius * 0.5) continue;
        const { x: dx, z: dz } = rel(e.pos, c.car.pos), d = Math.hypot(dx, dz) || 1;
        c.damage(e, dmg, wv((dx / d) * X.paraguas_empuje, 0.3, (dz / d) * X.paraguas_empuje, c.car.pos));
        e.hitCd = X.paraguas_golpe_s; FX.hit(at(e.pos, 0, 0.6, 0));
      }
    });
  }
  dispose() { for (const m of this.ms) m.dispose(); }
}
