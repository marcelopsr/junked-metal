import * as B from "@babylonjs/core";
import { FX } from "../fx";
import { SFX } from "../sfx";
import { cyl, template } from "../models";
import { pbr } from "../render";
import { at, onFloor, orient, rel, W as wv } from "../moon";
import { Weapon, nearest, W, X, type Ctx } from "./base";

// Cañón de confeti: ráfaga corta en cono hacia el bicho más cercano; empuja fuerte y aturde.
// Evolución (Confeti metálico): cono más largo y mucho más daño.
export class Confeti extends Weapon {
  ls: { m: B.InstancedMesh; t: number }[] = [];
  cone = (id: string, col: string, em: string) => template(id, () => [cyl(1, 0.05, 1, pbr(id + "Mat", { color: col, rough: 0.4, emissive: em, alpha: 0.6 }), [0, 0, 0.5], [Math.PI / 2, 0, 0], 12)]); // ancho al frente, punta en el auto
  tpl = this.cone("confeti", "#ff5fa8", "#7a1a5a");
  tplM = this.cone("confetiMetal", "#cbd5e1", "#64748b");
  update(c: Ctx) {
    const cfg = W.confeti, ev = this.evolved, R = (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area;
    if ((this.cd -= c.dt) <= 0) {
      const t = nearest(c.car.pos, c.enemies, R);
      if (t) {
        this.cd = this.cdMax = (ev ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown;
        const rd = rel(t.pos, c.car.pos), yaw = Math.atan2(rd.x, rd.z), m = (ev ? this.tplM : this.tpl).createInstance("cf");
        m.rotation.y = yaw; this.ls.push({ m, t: 0 });
        const dir = { x: Math.sin(yaw), z: Math.cos(yaw) };
        const dmg = this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1);
        for (const e of c.enemies) {
          const { x: dx, z: dz } = rel(e.pos, c.car.pos), d = Math.hypot(dx, dz);
          if (d > R + e.radius || d < 0.01 || dx * dir.x + dz * dir.z < d * X.confeti_cono) continue;
          c.damage(e, dmg, wv((dx / d) * X.confeti_empuje, 0.4, (dz / d) * X.confeti_empuje, c.car.pos));
          if (!e.def.boss) e.stun = Math.max(e.stun, ev ? X.confeti_aturde_evo_s : X.confeti_aturde_s);
          FX.hit(at(e.pos, 0, 0.5, 0));
        }
        SFX.boss();
      }
    }
    for (let i = this.ls.length - 1; i >= 0; i--) {
      const l = this.ls[i];
      l.t += c.dt / cfg.duracion_base;
      onFloor(c.car.pos, 0.6, l.m.position); orient(l.m);
      const k = Math.min(1, l.t * 3); l.m.scaling.set(R * 1.6 * k, R * 0.35 * k, R * k);
      if (l.t >= 1) { l.m.dispose(); this.ls.splice(i, 1); }
    }
  }
  dispose() { for (const l of this.ls) l.m.dispose(); this.ls = []; }
}
