import * as B from "@babylonjs/core";
import type { Enemy } from "../enemies";
import { FX } from "../fx";
import { sph, template } from "../models";
import { pbr } from "../render";
import { advance, at, hd, orient, yawTo, W as wv } from "../moon";
import { Weapon, nearest, cant, W, X, type Ctx } from "./base";

// Pistola de burbujas: burbujas lentas; la que toca un bicho (no jefe) lo encierra y lo deja flotando inmóvil unos segundos, y al reventar daña.
// Evolución (Pompas gigantes): más burbujas, más grandes, encierran más tiempo y al reventar salpican en área.
export class Burbujas extends Weapon {
  shots: { m: B.InstancedMesh; dir: B.Vector3; life: number }[] = [];
  held: { m: B.InstancedMesh; e: Enemy; t: number }[] = [];
  tpl = template("burbuja", () => [sph(1, pbr("bubbleMat", { color: "#bfeaff", rough: 0.05, alpha: 0.45, emissive: "#3a7aa0" }), [0, 0, 0])]);
  update(c: Ctx) {
    const cfg = W.burbujas, ev = this.evolved;
    const r = (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area;
    if ((this.cd -= c.dt) <= 0) {
      const t = nearest(c.car.pos, c.enemies, cfg.alcance);
      if (t) {
        this.cd = this.cdMax = (ev ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown;
        const n = ev ? cfg.n_evo : cant(cfg, this.lv), base = yawTo(c.car.pos, t.pos);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * X.burbujas_abanico, m = this.tpl.createInstance("bu");
          at(c.car.pos, 0, 0.8, 0, m.position); m.scaling.setAll(r * 0.5);
          this.shots.push({ m, dir: wv(Math.sin(a), 0, Math.cos(a), c.car.pos), life: cfg.alcance / cfg.velocidad });
        }
      }
    }
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      advance(s.m.position, s.dir, cfg.velocidad * c.dt); orient(s.m);
      const hit = c.enemies.find((e) => !e.def.boss && !this.held.some((h) => h.e === e) && hd(s.m.position, e.pos) < e.radius + r * 0.5);
      if (hit) { s.m.scaling.setAll(Math.max(hit.radius, 0.6) * 1.6); this.held.push({ m: s.m, e: hit, t: ev ? cfg.duracion_evo : cfg.duracion_base + cfg.duracion_nivel * this.lv }); this.shots.splice(i, 1); }
      else if ((s.life -= c.dt) <= 0) { s.m.dispose(); this.shots.splice(i, 1); }
    }
    const dmg = this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1);
    for (let i = this.held.length - 1; i >= 0; i--) {
      const h = this.held[i];
      h.t -= c.dt; h.e.stun = Math.max(h.e.stun, 0.2);
      at(h.e.pos, 0, 0.8 + Math.sin(h.t * 4) * 0.2, 0, h.m.position); orient(h.m);
      if (h.t <= 0 || !c.enemies.includes(h.e)) {
        if (c.enemies.includes(h.e)) { c.damage(h.e, dmg); if (ev) c.explode(h.e.pos, X.burbujas_salpica * c.st.area, dmg * X.burbujas_salpica_dano); }
        FX.hit(h.m.position); h.m.dispose(); this.held.splice(i, 1);
      }
    }
  }
  dispose() { for (const s of this.shots) s.m.dispose(); for (const h of this.held) h.m.dispose(); }
}
