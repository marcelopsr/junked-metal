import * as B from "@babylonjs/core";
import type { Enemy } from "../enemies";
import { SFX } from "../sfx";
import { at } from "../moon";
import { Weapon, nearest, cant, W, X, type Ctx } from "./base";

export class Tesla extends Weapon {
  bolts: { m: B.LinesMesh; life: number }[] = [];
  update(c: Ctx) {
    const cfg = W.tesla;
    if ((this.cd -= c.dt) <= 0) {
      if (this.zap(c, c.car.pos, at(c.car.pos, 0.4, 1.6, -0.7), this.evolved ? cfg.n_evo : cant(cfg, this.lv), this.dano(cfg) * c.st.dmg * (this.evolved ? cfg.dano_evo_mult : 1)))
        this.cd = this.cdMax = (this.evolved ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown;
    }
    for (let i = this.bolts.length - 1; i >= 0; i--) { const b = this.bolts[i]; if ((b.life -= c.dt) > 0) continue; b.m.dispose(); this.bolts.splice(i, 1); }
  }
  // Rayo en cadena desde "from" (busca en 9 m) dibujado desde "start"; devuelve si pegó
  zap(c: Ctx, from: B.Vector3, start: B.Vector3, chain: number, dmg: number) {
    let cur = nearest(from, c.enemies, W.tesla.alcance);
    if (!cur) return false;
    const hit = new Set<Enemy>();
    const pts = [start];
    while (cur && hit.size < chain) {
      hit.add(cur);
      c.damage(cur, dmg);
      const a = pts[pts.length - 1], b = at(cur.pos, 0, 0.6, 0);
      for (let k = 1; k <= 3; k++) pts.push(B.Vector3.Lerp(a, b, k / 4).addInPlace(new B.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8)));
      pts.push(b);
      const prev: Enemy = cur;
      cur = null;
      let bd = X.tesla_salto_alcance;
      for (const e of c.enemies) if (!hit.has(e)) { const d = B.Vector3.Distance(e.pos, prev.pos); if (d < bd) { bd = d; cur = e; } }
    }
    SFX.zap();
    const m = B.MeshBuilder.CreateLines("bolt", { points: pts }, c.scene);
    m.color = new B.Color3(0.6, 0.9, 1).scale(3);
    m.isPickable = false;
    this.bolts.push({ m, life: 0.12 });
    return true;
  }
  dispose() { for (const b of this.bolts) b.m.dispose(); }
}
