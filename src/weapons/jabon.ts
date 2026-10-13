import * as B from "@babylonjs/core";
import type { Enemy } from "../enemies";
import { FX } from "../fx";
import { sph, template } from "../models";
import { pbr } from "../render";
import { advance, at, hd, hflat, orient } from "../moon";
import { Weapon, nearest, cant, W, X, type Ctx } from "./base";

// Pistola de jabón: burbujas que al tocar un bicho revientan en área, ralentizan y sueltan burbujas hijas que reventan en cadena contra otros bichos.
// Evolución (Espuma desatada): más burbujas, más grandes, ralentizan más y la cadena llega a tres generaciones.
type Shot = { m: B.InstancedMesh; dir: B.Vector3; life: number; gen: number; skip: Set<Enemy> };
export class Jabon extends Weapon {
  shots: Shot[] = [];
  tpl = template("jabonBurbuja", () => [sph(1, pbr("jabonMat", { color: "#d7f3ff", rough: 0.05, alpha: 0.5, emissive: "#5a9ac0" }), [0, 0, 0])]);
  spawn(from: B.Vector3, t: Enemy, gen: number, skip: Set<Enemy>, scale: number, life: number) {
    const m = this.tpl.createInstance("jb");
    m.position.copyFrom(from); m.scaling.setAll(scale);
    this.shots.push({ m, dir: hflat(t.pos.subtract(from), from).normalize(), life, gen, skip });
  }
  update(c: Ctx) {
    const cfg = W.jabon, ev = this.evolved;
    const r = (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area;
    const dmg = this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1), slow = ev ? cfg.duracion_evo : cfg.duracion_base + cfg.duracion_nivel * this.lv;
    if ((this.cd -= c.dt) <= 0) {
      const t = nearest(c.car.pos, c.enemies, cfg.alcance);
      if (t) {
        this.cd = this.cdMax = (ev ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown;
        const n = ev ? cfg.n_evo : cant(cfg, this.lv), used = new Set<Enemy>();
        for (let i = 0; i < n; i++) {
          const o = nearest(c.car.pos, c.enemies, cfg.alcance, used) ?? t; used.add(o);
          this.spawn(at(c.car.pos, 0, 0.8, 0), o, 0, new Set(), r * 0.5, cfg.alcance / cfg.velocidad);
        }
      }
    }
    const maxGen = ev ? X.jabon_cadena_evo : X.jabon_cadena, kids = ev ? X.jabon_hijas_evo : X.jabon_hijas;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i], v = s.gen ? X.jabon_hija_vel : cfg.velocidad;
      advance(s.m.position, s.dir, v * c.dt); orient(s.m);
      const hit = c.enemies.find((e) => !s.skip.has(e) && hd(s.m.position, e.pos) < e.radius + s.m.scaling.x);
      if (!hit && (s.life -= c.dt) > 0) continue;
      this.shots.splice(i, 1);
      if (hit) { // revienta: daño en área, ralentiza y suelta las hijas
        const k = s.gen ? X.jabon_hija_mult : 1, rr = r * k, pos = s.m.position.clone();
        c.explode(pos, rr, dmg * k); FX.hit(pos);
        for (const e of c.enemies) if (hd(e.pos, pos) < rr + e.radius) e.slow = Math.max(e.slow, slow);
        if (s.gen < maxGen && this.shots.length < X.jabon_tope) {
          const done = new Set(s.skip).add(hit), taken = new Set(done); // done: ya reventaron; taken: además, blancos de las hermanas
          for (let j = 0; j < kids; j++) {
            const t = nearest(pos, c.enemies, X.jabon_hija_alcance, taken);
            if (!t) break;
            taken.add(t); this.spawn(pos, t, s.gen + 1, done, r * 0.5 * X.jabon_hija_mult, X.jabon_hija_alcance / X.jabon_hija_vel + 0.2);
          }
        }
      }
      s.m.dispose();
    }
  }
  dispose() { for (const s of this.shots) s.m.dispose(); this.shots = []; }
}
