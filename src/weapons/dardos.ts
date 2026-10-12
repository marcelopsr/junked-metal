import * as B from "@babylonjs/core";
import type { Enemy } from "../enemies";
import { FX } from "../fx";
import { SFX } from "../sfx";
import { cyl, sph, template } from "../models";
import { M } from "../render";
import { advance, at, hd, orient, yawTo, W as wv } from "../moon";
import { Weapon, nearest, cant, W, X, type Ctx } from "./base";

// Lanzadardos de goma: dardos que se quedan pegados; al tercero en el mismo bicho todos explotan juntos en área.
// Evolución (Dardos de pila): explotan con el segundo dardo, más radio y dos dardos por tanda.
export class Dardos extends Weapon {
  shots: { m: B.InstancedMesh; dir: B.Vector3; life: number }[] = [];
  stuck = new Map<Enemy, B.InstancedMesh[]>();
  tpl = template("dardo", () => [cyl(0.08, 0.08, 0.8, M.matte("#2b2d31"), [0, 0, 0], [Math.PI / 2, 0, 0], 6), sph(0.22, M.plastic("#ef4444"), [0, 0, 0.45], [1, 1, 0.6], 8), cyl(0.16, 0.16, 0.05, M.plastic("#facc15"), [0, 0, -0.4], [Math.PI / 2, 0, 0], 6)]);
  update(c: Ctx) {
    const cfg = W.dardos, ev = this.evolved, need = ev ? X.dardos_pegados_evo : X.dardos_pegados;
    if ((this.cd -= c.dt) <= 0) {
      const t = nearest(c.car.pos, c.enemies, cfg.alcance);
      if (t) {
        this.cd = this.cdMax = (ev ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown;
        const n = ev ? cfg.n_evo : cant(cfg, this.lv), base = yawTo(c.car.pos, t.pos);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * X.dardos_abanico, m = this.tpl.createInstance("da");
          at(c.car.pos, 0, 0.6, 0, m.position);
          this.shots.push({ m, dir: wv(Math.sin(a), 0, Math.cos(a), c.car.pos), life: cfg.duracion_base });
        }
        SFX.click();
      }
    }
    const dmg = this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1);
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      advance(s.m.position, s.dir, cfg.velocidad * c.st.area * c.dt); orient(s.m);
      const e = c.enemies.find((o) => hd(s.m.position, o.pos) < o.radius + 0.5);
      if (e) {
        c.damage(e, dmg, s.dir.scale(X.dardos_empuje));
        const list = this.stuck.get(e) ?? []; list.push(s.m); this.stuck.set(e, list); this.shots.splice(i, 1);
        if (list.length >= need) {
          c.explode(e.pos, (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area, dmg * X.dardos_explosion_mult);
          FX.hit(at(e.pos, 0, 0.6, 0)); for (const m of list) m.dispose(); this.stuck.delete(e);
        }
      } else if ((s.life -= c.dt) <= 0) { s.m.dispose(); this.shots.splice(i, 1); }
    }
    for (const [e, list] of this.stuck) {
      if (!c.enemies.includes(e)) { for (const m of list) m.dispose(); this.stuck.delete(e); continue; }
      list.forEach((m, k) => at(e.pos, Math.sin(k * 2.1) * e.radius * 0.7, 0.5 + k * 0.25, Math.cos(k * 2.1) * e.radius * 0.7, m.position));
    }
  }
  dispose() { for (const s of this.shots) s.m.dispose(); for (const l of this.stuck.values()) for (const m of l) m.dispose(); }
}
