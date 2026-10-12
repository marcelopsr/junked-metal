import * as B from "@babylonjs/core";
import type { Enemy } from "../enemies";
import { cyl, template, tor } from "../models";
import { M, pbr } from "../render";
import { rng } from "../rng";
import { advance, at, hd, hflat, MOON, onFloor, orient } from "../moon";
import { Weapon, nearest, W, X, type Ctx } from "./base";

// Trompo: rebota de enemigo en enemigo y deja una estela cortante. Evolución (Ciclón): dos trompos en órbita permanente.
export class Trompo extends Weapon {
  tops: { m: B.InstancedMesh; target: Enemy | null; life: number; ang: number; trail: number }[] = [];
  blades: { m: B.InstancedMesh; life: number }[] = [];
  t = 0;
  touched = new WeakMap<Enemy, number>(); // Ciclón: último golpe de contacto por enemigo
  tpl = template("trompo_w", () => [
    cyl(0.9, 0.05, 0.8, pbr("topBody", { color: "#b783ff", rough: 0.3, emissive: "#3a1a66" }), [0, 0.3, 0], undefined, 10),
    cyl(1.1, 1.1, 0.1, M.metal("#e6e9ee"), [0, 0.65, 0], undefined, 12),
    cyl(0.14, 0.02, 0.22, M.metal("#71717a"), [0, -0.11, 0], undefined, 6),
    cyl(0.38, 0.38, 0.24, M.plastic("#4c1d95"), [0, 0.78, 0], undefined, 8),
  ]);
  bladeTpl = template("estela", () => [tor(1.6, 0.14, pbr("blade", { color: "#7de8ff", rough: 0.2, emissive: "#2a8ab0", alpha: 0.8 }), [0, 0, 0], undefined, 18)]);
  update(c: Ctx) {
    const cfg = W.trompo, ev = this.evolved;
    if (ev) { // órbita fija
      while (this.tops.length < X.trompo_evo_cantidad) this.tops.push({ m: this.tpl.createInstance("t"), target: null, life: 1e9, ang: this.tops.length * Math.PI, trail: 0 });
    } else if (!this.tops.length && (this.cd -= c.dt) <= 0) {
      const t = nearest(c.car.pos, c.enemies, cfg.alcance);
      if (t) {
        this.cd = this.cdMax = this.recarga(cfg) * c.st.cooldown;
        const m = this.tpl.createInstance("t");
        onFloor(c.car.pos, 0.6, m.position);
        this.tops.push({ m, target: t, life: cfg.duracion_base + cfg.duracion_nivel * this.lv, ang: 0, trail: 0 });
      }
    }
    this.t += c.dt;
    const dmg = this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1);
    for (let i = this.tops.length - 1; i >= 0; i--) {
      const tp = this.tops[i];
      tp.m.rotation.y += c.dt * 25; orient(tp.m);
      if (ev) {
        tp.ang += c.dt * 3.2;
        const R = cfg.area_evo * c.st.area;
        if (MOON.on) onFloor(at(c.car.pos, Math.cos(tp.ang) * R, 0, Math.sin(tp.ang) * R), 0.6, tp.m.position);
        else tp.m.position.set(c.car.pos.x + Math.cos(tp.ang) * R, 0.6, c.car.pos.z + Math.sin(tp.ang) * R);
      } else {
        if (!tp.target || tp.target.hp <= 0) tp.target = nearest(tp.m.position, c.enemies, X.trompo_retarget);
        if (!tp.target || (tp.life -= c.dt) <= 0) { tp.m.dispose(); this.tops.splice(i, 1); continue; }
        const to = MOON.on ? hflat(tp.target.pos.subtract(tp.m.position), tp.m.position) : new B.Vector3(tp.target.pos.x - tp.m.position.x, 0, tp.target.pos.z - tp.m.position.z), d = to.length();
        if (MOON.on) advance(tp.m.position, to.scale(1 / Math.max(d, 0.01)), cfg.velocidad * c.dt);
        else tp.m.position.addInPlace(to.scale((cfg.velocidad * c.dt) / Math.max(d, 0.01)));
        if (d < tp.target.radius + 0.8) { c.damage(tp.target, dmg, to.scale(X.trompo_empuje / Math.max(d, 0.01))); tp.target = nearest(tp.m.position, c.enemies.filter((e) => e !== tp.target), X.trompo_retarget); }
      }
      // El trompo orbital pasa a ~22 m/s: el sorteo por cuadro casi nunca pegaba (H25). Golpea al tocar y re-golpea cada 1/golpes_s mientras siga en contacto.
      for (const e of c.enemies) if (ev && hd(tp.m.position, e.pos) < e.radius + 1.1 && this.t - (this.touched.get(e) ?? -9) >= 1 / X.trompo_evo_golpes_s) { this.touched.set(e, this.t); c.damage(e, dmg * X.trompo_evo_contacto_mult, e.pos.subtract(tp.m.position).normalize().scale(X.trompo_empuje)); }
      if ((tp.trail -= c.dt) <= 0) { // estela: un disco que corta un rato
        tp.trail = X.trompo_estela_cada_s;
        const b = this.bladeTpl.createInstance("b");
        onFloor(tp.m.position, 0.12, b.position); b.rotation.x = Math.PI / 2; orient(b);
        this.blades.push({ m: b, life: X.trompo_estela_vida_s });
      }
    }
    for (let i = this.blades.length - 1; i >= 0; i--) {
      const b = this.blades[i];
      b.life -= c.dt;
      b.m.rotation.z += c.dt * 10; orient(b.m); // el desvanecido por visibility no hace nada en instancias (Babylon avisa por consola en cada llamada)
      for (const e of c.enemies) if (hd(b.m.position, e.pos) < e.radius + 0.9 && rng() < c.dt * X.trompo_estela_golpes_s) c.damage(e, dmg * X.trompo_estela_mult);
      if (b.life <= 0) { b.m.dispose(); this.blades.splice(i, 1); }
    }
  }
  dispose() { for (const t of this.tops) t.m.dispose(); for (const b of this.blades) b.m.dispose(); }
}
