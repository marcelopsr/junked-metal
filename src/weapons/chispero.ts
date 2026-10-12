import * as B from "@babylonjs/core";
import { FX } from "../fx";
import { template } from "../models";
import { pbr } from "../render";
import { hd, onFloor, orient } from "../moon";
import { Weapon, W, X, type Ctx } from "./base";

export class Chispero extends Weapon {
  fires: { m: B.InstancedMesh; life: number; r: number }[] = [];
  t = 0;
  tpl = template("fire", () => {
    const d = B.MeshBuilder.CreateDisc("f", { radius: 1, tessellation: 9 });
    d.rotation.x = Math.PI / 2;
    d.position.y = 0.05;
    d.material = pbr("fireMat", { color: "#ff6a00", rough: 1, emissive: "#ff5a00", alpha: 0.85 });
    return [d];
  });
  update(c: Ctx) {
    const cfg = W.chispero;
    const r = (this.evolved ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area;
    if (Math.abs(c.fs) > X.chispero_vel_min && (this.t -= c.dt) <= 0) {
      this.t = X.chispero_intervalo_s;
      this.drop(c.car.pos, r, this.evolved ? cfg.duracion_evo : cfg.duracion_base + cfg.duracion_nivel * this.lv);
    }
    const dps = (this.evolved ? cfg.dano_evo_fijo : this.dano(cfg)) * c.st.dmg;
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i];
      f.life -= c.dt;
      f.m.scaling.setAll(f.r * Math.min(1, f.life * 2) * (0.9 + Math.random() * 0.2));
      for (const e of c.enemies) if (hd(e.pos, f.m.position) < f.r + e.radius * 0.5) c.damage(e, dps * c.dt);
      if (f.life <= 0) { f.m.dispose(); this.fires.splice(i, 1); }
    }
  }
  drop(p: B.Vector3, r: number, life: number) {
    const m = this.tpl.createInstance("f");
    onFloor(p, 0.03, m.position); orient(m);
    m.scaling.setAll(r);
    this.fires.push({ m, life, r });
    if (Math.random() < 0.4) FX.hit(m.position);
  }
  dispose() { for (const f of this.fires) f.m.dispose(); }
}
