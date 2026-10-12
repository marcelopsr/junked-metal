import * as B from "@babylonjs/core";
import { FX } from "../fx";
import { cyl, sph, template } from "../models";
import { M, pbr } from "../render";
import { rng } from "../rng";
import { arc, at, hd, MOON, onFloor, orient } from "../moon";
import { Weapon, cant, W, X, type Ctx } from "./base";

// Bengalas: vuelan en arco hasta un enemigo al azar y dejan una zona en llamas (verde fósforo: es fuego propio) que daña en área.
export class Bengalas extends Weapon {
  flying: { m: B.InstancedMesh; from: B.Vector3; to: B.Vector3; t: number }[] = [];
  zones: { m: B.InstancedMesh; r: number; life: number; max: number }[] = [];
  steam = false; // fusión Vapor: zonas más grandes, más daño y frenan
  tpl = template("bengala", () => [cyl(0.16, 0.16, 0.9, M.plastic("#2c3a28"), [0, 0, 0], [Math.PI / 2, 0, 0], 6), sph(0.35, M.glow("#8dff6a"), [0, 0, 0.5], undefined, 6)]);
  zoneTpl = template("bengalaZona", () => {
    const d = B.MeshBuilder.CreateDisc("f", { radius: 1, tessellation: 12 });
    d.rotation.x = Math.PI / 2;
    d.position.y = 0.06;
    d.material = pbr("flareMat", { color: "#6aff4a", rough: 1, emissive: "#3ad020", alpha: 0.6 });
    return [d];
  });
  update(c: Ctx) {
    const cfg = W.bengalas, ev = this.evolved;
    if ((this.cd -= c.dt) <= 0) {
      const near = c.enemies.filter((e) => B.Vector3.Distance(e.pos, c.car.pos) < (ev ? cfg.alcance_evo : cfg.alcance));
      if (near.length) {
        this.cd = this.cdMax = (ev ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown;
        const n = ev ? cfg.n_evo : cant(cfg, this.lv);
        for (let i = 0; i < n; i++) {
          const t = near[(rng() * near.length) | 0];
          this.flying.push({ m: this.tpl.createInstance("b"), from: c.car.pos.clone(), to: t.pos.clone(), t: 0 });
        }
      }
    }
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      f.t += c.dt / X.bengalas_vuelo_s;
      const p = arc(f.from, f.to, Math.min(1, f.t), 6);
      f.m.position.copyFrom(p);
      f.m.rotation.x += c.dt * 10; orient(f.m);
      if (Math.random() < c.dt * 18) FX.trail(f.m.position, "#ff6b6b");
      if (f.t >= 1) {
        const r = (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area * (this.steam ? X.vapor_radio_mult : 1), life = ev ? cfg.duracion_evo : cfg.duracion_base + cfg.duracion_nivel * this.lv;
        const m = this.zoneTpl.createInstance("z");
        if (MOON.on) { onFloor(f.to, 0.03, m.position); orient(m); } else m.position.set(f.to.x, (f.to.y > 0.5 ? f.to.y - 0.5 : 0) + 0.03, f.to.z);
        this.zones.push({ m, r, life, max: life });
        FX.sparks(m.position);
        f.m.dispose(); this.flying.splice(i, 1);
      }
    }
    const dps = (ev ? cfg.dano_evo_fijo : this.dano(cfg)) * c.st.dmg * (this.steam ? X.vapor_dano_mult : 1);
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.life -= c.dt;
      z.m.scaling.setAll(z.r * Math.min(1, (z.max - z.life) * 6, z.life * 2) * (0.92 + Math.random() * 0.16)); // parpadeo: solo visual
      if (this.steam && Math.random() < c.dt * 3) FX.smoke(at(z.m.position, 0, 0.4, 0));
      for (const e of c.enemies) if (hd(e.pos, z.m.position) < z.r + e.radius * 0.5) {
        c.damage(e, dps * c.dt);
        if (this.steam) e.slow = Math.max(e.slow, X.vapor_ralentiza_s);
      }
      if (z.life <= 0) { z.m.dispose(); this.zones.splice(i, 1); }
    }
  }
  dispose() { for (const f of this.flying) f.m.dispose(); for (const z of this.zones) z.m.dispose(); }
}
