import * as B from "@babylonjs/core";
import type { Enemy } from "../enemies";
import { FX } from "../fx";
import { SFX } from "../sfx";
import { template } from "../models";
import { pbr } from "../render";
import { at, hd, onFloor, orient, rel, W as wv } from "../moon";
import { Weapon, W, X, type Ctx } from "./base";

// Imán de chatarra: arrastra hacia el auto a los bichos chicos (y las gemas sueltas) y cada tanto da un pulso que los aplasta; los grandes solo reciben el golpe base.
// Evolución (Electroimán de desguace): atrae desde más lejos, pulso más rápido y más ancho.
export class ImanChatarra extends Weapon {
  rings: { m: B.InstancedMesh; t: number; r: number }[] = [];
  tpl = template("imanAro", () => {
    const d = B.MeshBuilder.CreateTorus("imanAro", { diameter: 2, thickness: 0.12, tessellation: 24 });
    d.material = pbr("imanAroMat", { color: "#b8c4d6", rough: 0.3, emissive: "#c0302a" });
    return [d];
  });
  small = (e: Enemy) => !e.def.boss && e.radius <= X.iman_chico_radio;
  update(c: Ctx) {
    const cfg = W.imanchatarra, ev = this.evolved, R = (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area;
    const crush = (ev ? X.iman_aplasta_evo_radio : X.iman_aplasta_radio) * c.st.area;
    const pull = X.iman_atrae * c.dt;
    for (const e of c.enemies) { // arrastre continuo hasta quedar pegados al auto
      if (!this.small(e)) continue;
      const { x: dx, z: dz } = rel(e.pos, c.car.pos), d = Math.hypot(dx, dz);
      if (d > R || d < crush * 0.5) continue;
      c.damage(e, 0, wv((-dx / d) * pull, 0, (-dz / d) * pull, c.car.pos));
    }
    if (c.gems) for (const g of c.gems) if (!g.pull && hd(g.m.position, c.car.pos) < R) g.pull = true;
    if ((this.cd -= c.dt) <= 0 && c.enemies.some((e) => hd(e.pos, c.car.pos) < crush + e.radius)) {
      this.cd = this.cdMax = (ev ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown;
      const dmg = this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1);
      for (const e of c.enemies) if (hd(e.pos, c.car.pos) < crush + e.radius) c.damage(e, dmg * (this.small(e) ? X.iman_aplasta_mult : 1));
      const m = this.tpl.createInstance("ia"); onFloor(c.car.pos, 0.3, m.position); orient(m);
      this.rings.push({ m, t: 0, r: crush }); SFX.zap(); FX.hit(m.position.clone());
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const k = this.rings[i];
      k.t += c.dt / 0.35; k.m.scaling.setAll(k.r * (1.4 - k.t * 0.4)); at(c.car.pos, 0, 0.3, 0, k.m.position);
      if (k.t >= 1) { k.m.dispose(); this.rings.splice(i, 1); }
    }
  }
  dispose() { for (const k of this.rings) k.m.dispose(); this.rings = []; }
}
