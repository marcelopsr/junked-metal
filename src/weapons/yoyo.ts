import * as B from "@babylonjs/core";
import type { Enemy } from "../enemies";
import { cyl, template, tor } from "../models";
import { M } from "../render";
import { at, hd, orient, yawTo, W as wv } from "../moon";
import { Weapon, nearest, cant, W, X, type Ctx } from "./base";

// Yo-yo: sale en línea recta hacia el enemigo más cercano y vuelve al auto; atraviesa todo y pega más a la vuelta.
// Evolución (Doble yo-yo): dos en órbita cuyo hilo se estira y se recoge sin parar (la vuelta = cuando se recoge).
export class Yoyo extends Weapon {
  ys: { m: B.InstancedMesh; s: B.InstancedMesh; dir: B.Vector3; d: number; back: boolean; hit: Set<Enemy> }[] = [];
  orb: { m: B.InstancedMesh; s: B.InstancedMesh }[] = [];
  next = new WeakMap<Enemy, number>(); // evolución: cuándo puede volver a pegarle a cada enemigo
  t = 0;
  onHit?: (c: Ctx, e: Enemy) => void; // sinergia de fusión (Yo-yo eléctrico)
  tpl = template("yoyo", () => [
    cyl(0.9, 0.9, 0.22, M.plastic("#1f6f8b"), [0, 0, -0.15], [Math.PI / 2, 0, 0], 12),
    cyl(0.9, 0.9, 0.22, M.plastic("#1f6f8b"), [0, 0, 0.15], [Math.PI / 2, 0, 0], 12),
    tor(0.8, 0.07, M.glow("#8dff6a"), [0, 0, -0.27], [Math.PI / 2, 0, 0], 12),
    tor(0.8, 0.07, M.glow("#8dff6a"), [0, 0, 0.27], [Math.PI / 2, 0, 0], 12),
  ]);
  hilo = template("hilo", () => [cyl(0.04, 0.04, 1, M.glow("#c8ffb0"), [0, 0, 0], [Math.PI / 2, 0, 0], 4)]); // largo 1 en z: se estira por instancia
  private string(s: B.InstancedMesh, a: B.Vector3, b: B.Vector3) {
    s.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    s.rotation.y = yawTo(a, b);
    s.scaling.set(1, 1, hd(b, a)); orient(s);
  }
  update(c: Ctx) {
    const cfg = W.yoyo;
    this.t += c.dt;
    const hand = at(c.car.pos, 0, 0.6, 0);
    if (this.evolved) {
      for (const y of this.ys) { y.m.dispose(); y.s.dispose(); } // los que estaban en vuelo al evolucionar
      this.ys = [];
      // Dos yo-yos opuestos; el radio va y viene entre 2,5 y 7 m (período 1,6 s)
      while (this.orb.length < 2) this.orb.push({ m: this.tpl.createInstance("y"), s: this.hilo.createInstance("h") });
      const ph = (this.t * Math.PI * 2) / X.yoyo_orbita_periodo_s, r = (X.yoyo_orbita_min + X.yoyo_orbita_amp * (0.5 - 0.5 * Math.cos(ph))) * c.st.area, back = Math.sin(ph) < 0;
      const dmg = cfg.dano_evo_fijo * c.st.dmg * (back ? X.yoyo_vuelta_mult : 1);
      this.orb.forEach((o, i) => {
        const a = this.t * 2.6 + i * Math.PI;
        at(hand, Math.sin(a) * r, 0, Math.cos(a) * r, o.m.position);
        o.m.rotation.set(0, a, this.t * 20); orient(o.m);
        this.string(o.s, hand, o.m.position);
        for (const e of c.enemies) if ((this.next.get(e) ?? 0) <= this.t && B.Vector3.Distance(o.m.position, e.pos) < e.radius + 0.9) {
          this.next.set(e, this.t + X.yoyo_orbita_golpe_s);
          c.damage(e, dmg, e.pos.subtract(c.car.pos).normalize().scale(X.yoyo_empuje));
          this.onHit?.(c, e);
        }
      });
      return;
    }
    const R = (cfg.area_base + cfg.area_nivel * this.lv) * c.st.area, sp = cfg.velocidad * c.st.area;
    if (!this.ys.length && (this.cd -= c.dt) <= 0) {
      const t = nearest(c.car.pos, c.enemies, R + 2);
      if (t) {
        this.cd = this.cdMax = this.recarga(cfg) * c.st.cooldown;
        const n = cant(cfg, this.lv), base = yawTo(c.car.pos, t.pos);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * X.yoyo_abanico;
          this.ys.push({ m: this.tpl.createInstance("y"), s: this.hilo.createInstance("h"), dir: new B.Vector3(Math.sin(a), 0, Math.cos(a)), d: 0, back: false, hit: new Set() });
        }
      }
    }
    const dmg = this.dano(cfg) * c.st.dmg;
    for (let i = this.ys.length - 1; i >= 0; i--) {
      const y = this.ys[i];
      y.d += (y.back ? -X.yoyo_vuelta_vel : 1) * sp * c.dt; // vuelve más rápido de lo que sale
      if (!y.back && y.d >= R) { y.back = true; y.hit.clear(); }
      if (y.back && y.d <= 0) { y.m.dispose(); y.s.dispose(); this.ys.splice(i, 1); continue; }
      at(hand, y.dir.x * y.d, 0, y.dir.z * y.d, y.m.position); // y.dir: marco local del auto
      y.m.rotation.set(0, Math.atan2(y.dir.x, y.dir.z) + Math.PI / 2, this.t * 20); orient(y.m);
      this.string(y.s, hand, y.m.position);
      for (const e of c.enemies) if (!y.hit.has(e) && B.Vector3.Distance(y.m.position, e.pos) < e.radius + 0.7) {
        y.hit.add(e);
        c.damage(e, dmg * (y.back ? X.yoyo_vuelta_mult : 1), wv(y.dir.x, y.dir.y, y.dir.z, c.car.pos).scale(y.back ? -X.yoyo_empuje : X.yoyo_empuje));
        this.onHit?.(c, e);
      }
    }
  }
  dispose() { for (const y of [...this.ys, ...this.orb]) { y.m.dispose(); y.s.dispose(); } this.ys = []; this.orb = []; }
}
