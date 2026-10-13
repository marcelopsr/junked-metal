import * as B from "@babylonjs/core";
import type { Enemy } from "../enemies";
import { SFX } from "../sfx";
import { box, cyl, sph, template } from "../models";
import { M } from "../render";
import { advance, at, hd, hflat, orient, W as wv } from "../moon";
import { Weapon, W, X, type Ctx } from "./base";

// Mini dron: acompaña al auto desde el aire y dispara a los bichos que quedan atrás.
// Evolución (Drones gemelos): dos drones, cadencia mayor, y además atraen las gemas cercanas.
export class Dron extends Weapon {
  ds: B.InstancedMesh[] = [];
  shots: { m: B.InstancedMesh; dir: B.Vector3; life: number }[] = [];
  t = 0;
  tpl = template("dron", () => [box(0.7, 0.2, 0.7, M.metal("#4b5563"), [0, 0, 0]), ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => cyl(0.55, 0.55, 0.04, M.glow("#7de8ff"), [sx * 0.55, 0.15, sz * 0.55], undefined, 10))), sph(0.2, M.glow("#ff5a5a"), [0, -0.05, 0.35])]);
  bullet = template("balaDron", () => [sph(0.28, M.glow("#7de8ff"), [0, 0, 0])]);
  update(c: Ctx) {
    const cfg = W.dron, ev = this.evolved, n = ev ? cfg.n_evo : cfg.n_base;
    this.t += c.dt;
    while (this.ds.length < n) this.ds.push(this.tpl.createInstance("dr"));
    this.ds.forEach((m, i) => {
      const side = n > 1 ? (i ? 1.8 : -1.8) : 1.8;
      at(c.car.pos, side, 2.6 + Math.sin(this.t * 3 + i) * 0.2, -1.2, m.position);
      m.rotation.set(0, this.t * 2 + i, 0); orient(m);
    });
    if ((this.cd -= c.dt) <= 0) {
      const fw = c.car.root.forward;
      let t: Enemy | null = null, bd = cfg.alcance; // el más cercano que queda detrás del auto
      for (const e of c.enemies) { const d = hd(e.pos, c.car.pos); if (d < bd && B.Vector3.Dot(e.pos.subtract(c.car.pos), fw) < 0) { bd = d; t = e; } }
      if (t) {
        this.cd = this.cdMax = (ev ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown;
        for (const d of this.ds) {
          const m = this.bullet.createInstance("bd"); m.position.copyFrom(d.position);
          const dir = hflat(t.pos.subtract(d.position), d.position).normalize();
          this.shots.push({ m, dir, life: cfg.duracion_base });
        }
        SFX.click();
      }
    }
    const dmg = this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1);
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      advance(s.m.position, s.dir, cfg.velocidad * c.dt); orient(s.m);
      const e = c.enemies.find((o) => hd(s.m.position, o.pos) < o.radius + cfg.area_base);
      if (e) { c.damage(e, dmg, wv(s.dir.x, 0, s.dir.z, c.car.pos).scale(2)); s.m.dispose(); this.shots.splice(i, 1); }
      else if ((s.life -= c.dt) <= 0) { s.m.dispose(); this.shots.splice(i, 1); }
    }
    if (ev && c.gems) for (const g of c.gems) if (!g.pull && this.ds.some((d) => hd(d.position, g.m.position) < X.dron_iman_radio)) g.pull = true;
  }
  dispose() { for (const m of this.ds) m.dispose(); for (const s of this.shots) s.m.dispose(); this.ds = []; this.shots = []; }
}
