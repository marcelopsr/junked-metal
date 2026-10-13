import * as B from "@babylonjs/core";
import { FX } from "../fx";
import { box, cyl, template } from "../models";
import { M } from "../render";
import { at, hd, onFloor, orient, yawOf } from "../moon";
import { Weapon, cant, W, X, type Ctx } from "./base";

type Ficha = { m: B.InstancedMesh; st: 0 | 1 | 2 | 3; t: number; life: number; yaw: number };
// Fichas de dominó: el auto las va dejando de pie; cuando un bicho toca una, caen todas en cadena y cada caída pega en área.
// Evolución (Fichas de metal): más fichas, más grandes, y cada caída además explota.
export class Domino extends Weapon {
  fichas: Ficha[] = [];
  last: B.Vector3 | null = null;
  tpl = template("domino", () => [box(0.9, 1.5, 0.3, M.plastic("#f5f1e6"), [0, 0.75, 0]), box(0.7, 0.06, 0.32, M.matte("#111"), [0, 0.75, 0]), ...[0.35, 1.1].map((y) => cyl(0.12, 0.12, 0.34, M.matte("#111"), [0, y, 0], [Math.PI / 2, 0, 0], 8))]);
  tplM = template("dominoMetal", () => [box(0.9, 1.5, 0.3, M.metal("#9ca3af"), [0, 0.75, 0]), box(0.7, 0.08, 0.32, M.glow("#ff7a2e"), [0, 0.75, 0])]);
  update(c: Ctx) {
    const cfg = W.domino, ev = this.evolved, max = ev ? cfg.n_evo : cant(cfg, this.lv), life = ev ? cfg.duracion_evo : cfg.duracion_base + cfg.duracion_nivel * this.lv, r = (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area;
    if (Math.abs(c.fs) > X.chispero_vel_min && (!this.last || hd(this.last, c.car.pos) >= X.domino_paso_m)) {
      const m = (ev ? this.tplM : this.tpl).createInstance("dm"), yaw = yawOf(c.car.root.forward, c.car.pos);
      onFloor(c.car.pos, 0.03, m.position); m.rotation.set(0, yaw, 0); orient(m); m.scaling.setAll(ev ? 1.25 : 1);
      this.fichas.push({ m, st: 0, t: 0, life, yaw });
      this.last = c.car.pos.clone();
      const standing = this.fichas.filter((f) => f.st === 0);
      if (standing.length > max) { standing[0].m.dispose(); this.fichas.splice(this.fichas.indexOf(standing[0]), 1); }
    }
    const dmg = this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1);
    for (let i = this.fichas.length - 1; i >= 0; i--) {
      const f = this.fichas[i];
      if (f.st === 0) {
        if ((f.life -= c.dt) <= 0) { f.m.dispose(); this.fichas.splice(i, 1); continue; }
        if (c.enemies.some((e) => !e.airborne && hd(e.pos, f.m.position) < e.radius + 1.1)) { f.st = 2; f.t = 0; }
      } else if (f.st === 1) { if ((f.t -= c.dt) <= 0) { f.st = 2; f.t = 0; } }
      else if (f.st === 2) {
        f.t += c.dt / X.domino_caida_s;
        f.m.rotation.x = Math.min(1, f.t) * 1.45; orient(f.m);
        if (f.t >= 1) {
          f.st = 3; f.t = 0;
          const p = f.m.position;
          for (const e of c.enemies) if (hd(e.pos, p) < r + e.radius) c.damage(e, dmg);
          if (ev) c.explode(at(p, 0, 0.3, 0), r, dmg * X.domino_explosion_mult);
          else FX.hit(at(p, 0, 0.3, 0));
          for (const g of this.fichas) if (g.st === 0 && hd(g.m.position, p) < X.domino_cadena_m) { g.st = 1; g.t = X.domino_retardo_s; } // la caída tumba a las vecinas
        }
      } else if ((f.t += c.dt) >= 0.6) { f.m.dispose(); this.fichas.splice(i, 1); }
    }
  }
  dispose() { for (const f of this.fichas) f.m.dispose(); }
}
