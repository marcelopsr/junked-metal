import * as B from "@babylonjs/core";
import type { Enemy } from "../enemies";
import { FX } from "../fx";
import { box, template } from "../models";
import { M } from "../render";
import { advance, at, hd, hflat, orient, yawOf } from "../moon";
import { Weapon, W, X, cant, type Ctx } from "./base";

// Avión teledirigido: planeador de papel que persigue al bicho más fuerte (más vida) a su alcance, lo atraviesa y sigue con el siguiente.
// Evolución (Escuadrilla guiada): cuatro aviones de chapa, más rápidos; cada impacto explota en área.
type Plane = { m: B.InstancedMesh; dir: B.Vector3; life: number; hits: number; seen: Set<Enemy>; t: Enemy | null };
export class Teledirigido extends Weapon {
  ps: Plane[] = [];
  plane = (body: B.Material) => [box(0.16, 0.26, 1.4, body, [0, 0, 0]), box(1.3, 0.05, 0.8, body, [0, -0.08, -0.15]), box(0.5, 0.05, 0.35, body, [0, 0.05, -0.55])];
  tpl = template("teleAvion", () => this.plane(M.plastic("#f8fafc")));
  tplM = template("teleAvionMetal", () => this.plane(M.metal("#8fb4ff")));
  // el más fuerte a su alcance que el avión todavía no atravesó (ni lleva otro de la misma salva)
  strongest(pos: B.Vector3, enemies: Enemy[], range: number, skip: Set<Enemy>) {
    let best: Enemy | null = null;
    for (const e of enemies) if (!skip.has(e) && hd(pos, e.pos) < range && (!best || e.hp > best.hp)) best = e;
    return best;
  }
  update(c: Ctx) {
    const cfg = W.teledirigido, ev = this.evolved;
    if ((this.cd -= c.dt) <= 0) {
      const used = new Set<Enemy>(), n = ev ? cfg.n_evo : cant(cfg, this.lv);
      const first = this.strongest(c.car.pos, c.enemies, cfg.alcance, used);
      if (first) {
        this.cd = this.cdMax = (ev ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown;
        for (let i = 0; i < n; i++) {
          const t = this.strongest(c.car.pos, c.enemies, cfg.alcance, used) ?? first; used.add(t);
          const m = (ev ? this.tplM : this.tpl).createInstance("tv");
          at(c.car.pos, (i - (n - 1) / 2) * 0.8, 1.2, 0, m.position);
          if (ev) m.scaling.setAll(1.25);
          this.ps.push({ m, dir: c.car.root.forward.clone().normalize(), life: ev ? cfg.duracion_evo : cfg.duracion_base, hits: 0, seen: new Set(), t });
        }
      }
    }
    const dmg = this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1), rr = (ev ? cfg.area_evo : cfg.area_base) * c.st.area, maxHits = ev ? X.tele_golpes_evo : X.tele_golpes;
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i];
      if (!p.t || !c.enemies.includes(p.t)) p.t = this.strongest(p.m.position, c.enemies, cfg.alcance, p.seen);
      if (p.t) { // gira hacia el blanco con un giro limitado
        const want = hflat(p.t.pos.subtract(p.m.position), p.m.position).normalize();
        p.dir.addInPlace(want.subtractInPlace(p.dir).scaleInPlace(Math.min(1, X.tele_giro * c.dt))); hflat(p.dir, p.m.position).normalize();
      }
      advance(p.m.position, p.dir, cfg.velocidad * (ev ? 1.3 : 1) * c.dt);
      p.m.rotation.set(0, yawOf(p.dir, p.m.position), 0); orient(p.m);
      const hit = c.enemies.find((e) => !p.seen.has(e) && hd(p.m.position, e.pos) < e.radius + rr);
      if (hit) {
        p.seen.add(hit); p.hits++; c.damage(hit, dmg, hit.pos.subtract(p.m.position).normalize().scale(2));
        if (ev) { c.explode(hit.pos, X.tele_explosion_radio * c.st.area, dmg * X.tele_explosion_mult); FX.hit(hit.pos.clone()); }
        if (p.t === hit) p.t = null;
      }
      if (p.hits >= maxHits || (p.life -= c.dt) <= 0) { p.m.dispose(); this.ps.splice(i, 1); }
    }
  }
  dispose() { for (const p of this.ps) p.m.dispose(); this.ps = []; }
}
