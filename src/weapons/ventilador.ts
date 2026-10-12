import * as B from "@babylonjs/core";
import { box, template } from "../models";
import { pbr } from "../render";
import { at, orient, rel, W as wv } from "../moon";
import { Weapon, nearest, W, X, type Ctx } from "./base";

// Ventilador de mesa: cono de viento que oscila hacia el bicho más cercano; empuja y quema por segundo mientras haya alguien en el cono.
// Evolución (Ventilador industrial): cono más ancho y largo, empuje y daño mayores.
export class Ventilador extends Weapon {
  dir = new B.Vector3(0, 0, 1);
  t = 0;
  gust: B.InstancedMesh[] = [];
  tpl = template("viento", () => [box(0.35, 0.08, 3, pbr("vientoMat", { color: "#d8f3ff", rough: 0.3, emissive: "#5aa9c9", alpha: 0.5 }), [0, 0, 1.5])]);
  update(c: Ctx) {
    const cfg = W.ventilador, ev = this.evolved;
    const R = (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area, half = ev ? X.ventilador_cono_evo : X.ventilador_cono;
    this.cd = 0; this.t += c.dt * X.ventilador_barrido_vel;
    const t = nearest(c.car.pos, c.enemies, R);
    if (t) { const rd = rel(t.pos, c.car.pos), d = Math.hypot(rd.x, rd.z) || 1, k = Math.min(1, 6 * c.dt); this.dir.set(this.dir.x + (rd.x / d - this.dir.x) * k, 0, this.dir.z + (rd.z / d - this.dir.z) * k).normalize(); }
    const aim = Math.atan2(this.dir.x, this.dir.z) + Math.sin(this.t) * X.ventilador_barrido;
    const ax = Math.sin(aim), az = Math.cos(aim);
    if (t) {
      const dps = this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1), push = (ev ? X.ventilador_empuje_evo : X.ventilador_empuje) * c.dt;
      for (const e of c.enemies) {
        const { x: dx, z: dz } = rel(e.pos, c.car.pos), d = Math.hypot(dx, dz);
        if (d < 0.01 || d > R + e.radius) continue;
        if (Math.acos(B.Scalar.Clamp((dx * ax + dz * az) / d, -1, 1)) > half + e.radius / d) continue;
        c.damage(e, dps * c.dt, wv((dx / d) * push, 0, (dz / d) * push, c.car.pos));
      }
    }
    const want = t ? 3 : 0;
    while (this.gust.length < want) this.gust.push(this.tpl.createInstance("v"));
    while (this.gust.length > want) this.gust.pop()!.dispose();
    this.gust.forEach((m, i) => {
      const a = aim + (i - 1) * half * 0.7;
      at(c.car.pos, 0, 0.9, 0, m.position);
      m.rotation.y = a; m.scaling.z = R / 3; orient(m);
    });
  }
  dispose() { for (const m of this.gust) m.dispose(); }
}
