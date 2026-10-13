import * as B from "@babylonjs/core";
import { FX } from "../fx";
import { SFX } from "../sfx";
import { template } from "../models";
import { pbr } from "../render";
import { at, hd, onFloor, orient, rel } from "../moon";
import { Weapon, nearest, cant, W, X, type Ctx } from "./base";

// Lata de pintura: rocía manchas en el piso; los bichos que las pisan van lentos y quedan "pintados": reciben más daño de todo (ver Enemy.paint y damage).
// Evolución (Pintura explosiva): manchas más grandes y duraderas que explotan al secarse.
export class Pintura extends Weapon {
  manchas: { m: B.InstancedMesh; life: number; r: number }[] = [];
  tpl = template("mancha", () => {
    const d = B.MeshBuilder.CreateDisc("mancha", { radius: 1, tessellation: 10 });
    d.rotation.x = Math.PI / 2;
    d.position.y = 0.04;
    d.material = pbr("manchaMat", { color: "#e11d8f", rough: 0.6, emissive: "#7a0a4f", alpha: 0.85 });
    return [d];
  });
  update(c: Ctx) {
    const cfg = W.pintura, ev = this.evolved, r = (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area;
    if ((this.cd -= c.dt) <= 0) {
      const t = nearest(c.car.pos, c.enemies, cfg.alcance);
      if (t) {
        this.cd = this.cdMax = (ev ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown;
        const n = ev ? cfg.n_evo : cant(cfg, this.lv), life = ev ? cfg.duracion_evo : cfg.duracion_base + cfg.duracion_nivel * this.lv;
        for (let i = 0; i < n; i++) { // la primera cae sobre el blanco; el resto, esparcidas alrededor
          const m = this.tpl.createInstance("pi"), a = i * 2.4, d = i ? r * 1.4 : 0, rp = rel(t.pos, c.car.pos);
          onFloor(at(c.car.pos, rp.x + Math.cos(a) * d, 0, rp.z + Math.sin(a) * d), 0.03, m.position); orient(m); m.scaling.setAll(r);
          this.manchas.push({ m, life, r });
        }
        SFX.click();
      }
    }
    const dps = (ev ? this.dano(cfg) * cfg.dano_evo_mult : this.dano(cfg)) * c.st.dmg;
    for (let i = this.manchas.length - 1; i >= 0; i--) {
      const k = this.manchas[i];
      k.m.scaling.setAll(k.r * Math.min(1, k.life * 2));
      for (const e of c.enemies) if (!e.airborne && hd(e.pos, k.m.position) < k.r + e.radius * 0.5) {
        e.paint = X.pintura_marca_s; e.slow = Math.max(e.slow, X.pintura_ralentiza_s);
        c.damage(e, dps * c.dt);
      }
      if ((k.life -= c.dt) <= 0) {
        if (ev) { c.explode(at(k.m.position, 0, 0.3, 0), k.r * 1.2, dps * X.pintura_explosion_mult); FX.hit(k.m.position.clone()); } // se seca y explota
        k.m.dispose(); this.manchas.splice(i, 1);
      }
    }
  }
  dispose() { for (const k of this.manchas) k.m.dispose(); this.manchas = []; }
}
