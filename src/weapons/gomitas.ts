import * as B from "@babylonjs/core";
import type { Enemy } from "../enemies";
import { FX } from "../fx";
import { sph, template } from "../models";
import { pbr } from "../render";
import { advance, at, hflat, orient, yawTo, W as wv } from "../moon";
import { Weapon, nearest, cant, W, X, _hitPt, type Ctx } from "./base";

// Camión de helados: sus "gomitas" son bochas de helado (misma arma, otra malla)
let scoop = false;
export const setScoop = (on: boolean) => { scoop = on; };
export class Gomitas extends Weapon {
  shots: { m: B.InstancedMesh; dir: B.Vector3; life: number; bounces: number; hit: Set<Enemy> }[] = [];
  onHit?: (c: Ctx, e: Enemy) => void; // sinergia de fusión (Globos de agua)
  tpl = scoop ? template("scoop", () => [sph(0.55, pbr("scoopMat", { color: "#f7a8cf", rough: 0.5, emissive: "#6a2a44" }), [0, 0, 0]), sph(0.3, pbr("scoopTop", { color: "#fff1d0", rough: 0.5, emissive: "#5a5040" }), [0, 0.28, 0], undefined, 5)]) : template("gomita", () => [sph(0.45, pbr("gummy", { color: "#b6ff6a", rough: 0.15, alpha: 0.85, emissive: "#3a8a00" }), [0, 0, 0], [1, 0.8, 1.2])]);
  update(c: Ctx) {
    const cfg = W.gomitas;
    if ((this.cd -= c.dt) <= 0) {
      const t = nearest(c.car.pos, c.enemies, cfg.alcance);
      if (t) {
        this.cd = this.cdMax = (cfg.recarga_base * c.st.cooldown) / (1 + cfg.recarga_div * (this.lv - 1)) / (this.evolved ? cfg.recarga_evo_div : 1);
        const n = this.evolved ? cfg.n_evo : cant(cfg, this.lv);
        const base = yawTo(c.car.pos, t.pos);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * X.gomitas_abanico;
          const m = this.tpl.createInstance("g");
          at(c.car.pos, 0, 0.5, 0, m.position);
          this.shots.push({ m, dir: wv(Math.sin(a), 0, Math.cos(a), c.car.pos), life: cfg.duracion_base, bounces: this.evolved ? X.gomitas_rebotes_evo : 0, hit: new Set() });
        }
      }
    }
    const dmg = this.dano(cfg) * c.st.dmg * (this.evolved ? cfg.dano_evo_mult : 1);
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      advance(s.m.position, s.dir, cfg.velocidad * c.st.area * c.dt);
      s.m.rotation.y += c.dt * 10; orient(s.m);
      if (Math.random() < c.dt * 18) FX.trail(s.m.position, "#ff9bd4");
      let dead = (s.life -= c.dt) <= 0;
      for (const e of c.enemies) {
        if (s.hit.has(e)) continue;
        at(e.pos, 0, 0.4, 0, _hitPt);
        if (B.Vector3.Distance(s.m.position, _hitPt) >= e.radius + 0.35) continue;
        c.damage(e, dmg, s.dir.scale(X.gomitas_empuje));
        this.onHit?.(c, e);
        s.hit.add(e);
        if (s.bounces-- > 0) {
          const nx = nearest(e.pos, c.enemies, X.gomitas_rebote_alcance, s.hit);
          if (nx) { s.dir = hflat(nx.pos.subtract(s.m.position), s.m.position); s.dir.normalize(); s.life = X.gomitas_rebote_vida_s; break; }
        }
        dead = true;
        break;
      }
      if (dead) { s.m.dispose(); this.shots.splice(i, 1); }
    }
  }
  dispose() { for (const s of this.shots) s.m.dispose(); }
}
