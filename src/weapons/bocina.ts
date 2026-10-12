import * as B from "@babylonjs/core";
import type { Enemy } from "../enemies";
import { SFX } from "../sfx";
import { template, tor } from "../models";
import { pbr } from "../render";
import { onFloor, orient, rel, W as wv } from "../moon";
import { Weapon, nearest, W, X, type Ctx } from "./base";

// Bocina: cada tanto lanza una onda en cono hacia el enemigo más cercano; empuja y (desde nivel 3) aturde.
// Evolución (Sirena): onda circular enorme.
export class Bocina extends Weapon {
  waves: { m: B.InstancedMesh; t: number; dir: B.Vector3; R: number; full: boolean; hit: Set<Enemy> }[] = [];
  tpl = template("onda", () => [tor(2, 0.22, pbr("wave", { color: "#ffe27a", rough: 0.3, emissive: "#a06a00", alpha: 0.75 }), [0, 0, 0], undefined, 24)]);
  update(c: Ctx) {
    const cfg = W.bocina;
    if ((this.cd -= c.dt) <= 0) {
      const R = (this.evolved ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area, t = nearest(c.car.pos, c.enemies, R);
      if (t) {
        this.cd = this.cdMax = (this.evolved ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown;
        const m = this.tpl.createInstance("o");
        onFloor(c.car.pos, 0.5, m.position); orient(m);
        const rd = rel(t.pos, c.car.pos);
        this.waves.push({ m, t: 0, dir: new B.Vector3(rd.x, 0, rd.z).normalize(), R, full: this.evolved, hit: new Set() });
        SFX.boss();
      }
    }
    const dmg = this.dano(cfg) * c.st.dmg * (this.evolved ? cfg.dano_evo_mult : 1);
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.t += c.dt / cfg.duracion_base;
      const r = w.R * Math.min(1, w.t);
      onFloor(c.car.pos, 0.5, w.m.position); orient(w.m);
      w.m.scaling.setAll(Math.max(0.1, r / 1.1));
      for (const e of c.enemies) {
        if (w.hit.has(e)) continue;
        const { x: dx, z: dz } = rel(e.pos, c.car.pos), d = Math.hypot(dx, dz);
        if (d > r + e.radius || d < 0.01) continue;
        if (!w.full && dx * w.dir.x + dz * w.dir.z < d * X.bocina_cono) continue; // cono de unos 120°
        w.hit.add(e);
        c.damage(e, dmg, wv((dx / d) * X.bocina_empuje, 0.4, (dz / d) * X.bocina_empuje, c.car.pos));
        if (this.lv >= X.bocina_aturde_desde_nivel || this.evolved) e.stun = Math.max(e.stun, this.evolved ? X.bocina_aturde_evo_s : X.bocina_aturde_s);
      }
      if (w.t >= 1) { w.m.dispose(); this.waves.splice(i, 1); }
    }
  }
  dispose() { for (const w of this.waves) w.m.dispose(); }
}
