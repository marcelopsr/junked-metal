import * as B from "@babylonjs/core";
import { box, cyl, template } from "../models";
import { M } from "../render";
import { advance, at, hd, onFloor, orient, yawTo, W as wv } from "../moon";
import { Weapon, nearest, cant, W, X, type Ctx } from "./base";

// Lápices de colores: ráfaga en abanico hacia el bicho más cercano; cada lápiz deja un trazo en el piso que daña a quien lo pisa.
// Evolución (Estuche de colores): nueve lápices, trazos anchos que duran el doble y pegan más fuerte.
const COLORS = ["#ef4444", "#3b82f6", "#facc15"];
export class Lapices extends Weapon {
  fly: { m: B.InstancedMesh; dir: B.Vector3; yaw: number; life: number; run: number; k: number }[] = [];
  marks: { m: B.InstancedMesh; life: number; r: number }[] = [];
  pencil = COLORS.map((c, k) => template("lapiz" + k, () => [box(0.14, 0.14, 1.1, M.plastic(c), [0, 0, 0]), cyl(0, 0.1, 0.3, M.matte("#f1c27d"), [0, 0, 0.7], [Math.PI / 2, 0, 0], 6)]));
  trace = COLORS.map((c, k) => template("trazo" + k, () => [box(1, 0.05, 1, M.glow(c), [0, 0, 0])]));
  update(c: Ctx) {
    const cfg = W.lapices, ev = this.evolved, r = (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area;
    if ((this.cd -= c.dt) <= 0) {
      const t = nearest(c.car.pos, c.enemies, cfg.alcance);
      if (t) {
        this.cd = this.cdMax = (ev ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown;
        const n = ev ? cfg.n_evo : cant(cfg, this.lv), base = yawTo(c.car.pos, t.pos);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * X.lapices_abanico, k = i % COLORS.length, m = this.pencil[k].createInstance("lp");
          at(c.car.pos, 0, 0.6, 0, m.position);
          this.fly.push({ m, dir: wv(Math.sin(a), 0, Math.cos(a), c.car.pos), yaw: a, life: cfg.alcance / cfg.velocidad, run: 0, k });
        }
      }
    }
    const life = ev ? cfg.duracion_evo : cfg.duracion_base + cfg.duracion_nivel * this.lv;
    for (let i = this.fly.length - 1; i >= 0; i--) {
      const f = this.fly[i], d = cfg.velocidad * c.dt;
      advance(f.m.position, f.dir, d); f.m.rotation.set(0, f.yaw, 0); orient(f.m);
      if ((f.run += d) >= X.lapices_paso) { // ponytail: el yaw del trazo es el del disparo, en la luna se desvía a lo largo de arcos largos
        f.run = 0;
        const t = this.trace[f.k].createInstance("tz");
        onFloor(f.m.position, 0.04, t.position); t.rotation.set(0, f.yaw, 0); orient(t); t.scaling.set(r * 2, 1, X.lapices_paso * 1.1);
        this.marks.push({ m: t, life, r });
        if (this.marks.length > X.lapices_trazos_max) { this.marks[0].m.dispose(); this.marks.shift(); }
      }
      if ((f.life -= c.dt) <= 0) { f.m.dispose(); this.fly.splice(i, 1); }
    }
    const dps = this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1);
    for (let i = this.marks.length - 1; i >= 0; i--) {
      const k = this.marks[i];
      for (const e of c.enemies) if (!e.airborne && hd(e.pos, k.m.position) < k.r + X.lapices_paso * 0.5 + e.radius * 0.5) c.damage(e, dps * c.dt);
      if ((k.life -= c.dt) <= 0) { k.m.dispose(); this.marks.splice(i, 1); }
    }
  }
  dispose() { for (const f of this.fly) f.m.dispose(); for (const k of this.marks) k.m.dispose(); this.fly = []; this.marks = []; }
}
