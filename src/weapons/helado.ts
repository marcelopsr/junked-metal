import * as B from "@babylonjs/core";
import type { Enemy } from "../enemies";
import { burst, FX } from "../fx";
import { SFX } from "../sfx";
import { sph, template } from "../models";
import { pbr } from "../render";
import { advance, at, hd, orient, yawTo, W as wv } from "../moon";
import { Weapon, nearest, cant, W, X, type Ctx } from "./base";

// Helado congelante: bochas que ralentizan (lv) y, evolucionadas, congelan a los tocados y enfrían un área.
export class Helado extends Weapon {
  shots: { m: B.InstancedMesh; dir: B.Vector3; life: number; hit: Set<Enemy> }[] = [];
  tpl = template("helado_w", () => [sph(0.55, pbr("scoopW", { color: "#f7a8cf", rough: 0.5, emissive: "#6a2a44" }), [0, 0, 0]), sph(0.32, pbr("scoopWTop", { color: "#9be3ff", rough: 0.5, emissive: "#1a4a66" }), [0, 0.3, 0], undefined, 5)]);
  update(c: Ctx) {
    const cfg = W.helado;
    if ((this.cd -= c.dt) <= 0) {
      const t = nearest(c.car.pos, c.enemies, cfg.alcance);
      if (t) {
        this.cd = this.cdMax = (cfg.recarga_base * c.st.cooldown) / (1 + cfg.recarga_div * (this.lv - 1)) / (this.evolved ? cfg.recarga_evo_div : 1);
        const na = this.evolved ? cfg.n_evo : cant(cfg, this.lv), sep = this.evolved ? X.helado_abanico_evo : X.helado_abanico;
        const base = yawTo(c.car.pos, t.pos), angs = Array.from({ length: na }, (_, i) => (i - (na - 1) / 2) * sep); // en abanico
        for (const o of angs) {
          const m = this.tpl.createInstance("h");
          at(c.car.pos, 0, 0.6, 0, m.position);
          this.shots.push({ m, dir: wv(Math.sin(base + o), 0, Math.cos(base + o), c.car.pos), life: cfg.duracion_base, hit: new Set() });
        }
        SFX.click();
      }
    }
    const dmg = this.dano(cfg) * c.st.dmg * (this.evolved ? cfg.dano_evo_mult : 1);
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      advance(s.m.position, s.dir, cfg.velocidad * c.st.area * c.dt);
      s.m.rotation.y += c.dt * 8; orient(s.m);
      if (Math.random() < c.dt * 14) FX.trail(s.m.position, "#9be3ff");
      let dead = (s.life -= c.dt) <= 0;
      for (const e of c.enemies) if (!s.hit.has(e) && hd(s.m.position, e.pos) < e.radius + 0.6) {
        s.hit.add(e);
        c.damage(e, dmg, s.dir.scale(X.helado_empuje));
        e.slow = Math.max(e.slow, X.helado_ralentiza_base + X.helado_ralentiza_nivel * this.lv);
        if (this.evolved) { // congela al golpeado y enfría a los de alrededor
          e.stun = Math.max(e.stun, X.helado_congela_evo_s);
          for (const o of c.enemies) if (o !== e && hd(o.pos, e.pos) < X.helado_enfria_radio_evo * c.st.area) o.slow = Math.max(o.slow, X.helado_enfria_evo_s);
          burst(at(e.pos, 0, 0.6, 0), { n: 12, color: "#cfefff", size: [0.15, 0.4], power: [2, 6], life: [0.3, 0.6], gravity: -4 });
        }
        dead = true;
        break;
      }
      if (dead) { s.m.dispose(); this.shots.splice(i, 1); }
    }
  }
  dispose() { for (const s of this.shots) s.m.dispose(); }
}
