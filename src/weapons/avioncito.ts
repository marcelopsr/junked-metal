import * as B from "@babylonjs/core";
import type { Enemy } from "../enemies";
import { FX } from "../fx";
import { box, template } from "../models";
import { M } from "../render";
import { at, hd, onFloor, orient } from "../moon";
import { Weapon, cant, W, X, type Ctx } from "./base";

// Avioncitos de papel: planeadores que orbitan ancho alrededor del auto cortando lo que cruzan; cuanto más rápido va el auto, más abierta la órbita.
// Evolución (Escuadrilla de chapa): cinco aviones de chapa que además sueltan minibombas.
export class Avioncito extends Weapon {
  ps: B.InstancedMesh[] = [];
  next = new WeakMap<Enemy, number>(); // cuándo puede volver a cortar a cada bicho
  a = 0;
  t = 0;
  bomb = 0;
  shown = false; // si los aviones en pantalla son los de chapa
  plane = (body: B.Material) => [box(0.2, 0.3, 1.6, body, [0, 0, 0]), box(1.5, 0.05, 0.9, body, [0, -0.1, -0.2]), box(0.6, 0.05, 0.4, body, [0, 0.05, -0.65])];
  tpl = template("avion", () => this.plane(M.plastic("#f8fafc")));
  tplM = template("avionMetal", () => this.plane(M.metal("#aeb6c2")));
  update(c: Ctx) {
    const cfg = W.avioncito, ev = this.evolved, n = ev ? cfg.n_evo : cant(cfg, this.lv);
    this.t += c.dt;
    if (ev !== this.shown) { this.shown = ev; this.dispose(); } // al evolucionar se cambia el modelo
    while (this.ps.length < n) this.ps.push((ev ? this.tplM : this.tpl).createInstance("av"));
    const sp = Math.min(1, Math.abs(c.fs) / c.car.def.speed), R = (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area * (1 + X.avion_vel_k * sp);
    this.a += c.dt * cfg.velocidad;
    const dmg = this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1);
    const bomb = ev && (this.bomb -= c.dt) <= 0;
    if (bomb) this.bomb = X.avion_bomba_s;
    this.ps.forEach((m, i) => {
      const a = this.a + (i * Math.PI * 2) / n;
      at(c.car.pos, Math.sin(a) * R, 1.2 + Math.sin(this.t * 3 + i) * 0.25, Math.cos(a) * R, m.position);
      m.rotation.set(0, a + Math.PI / 2, Math.sin(this.t * 4 + i) * 0.3); orient(m); // el morro apunta en el sentido del giro
      for (const e of c.enemies) if ((this.next.get(e) ?? 0) <= this.t && hd(m.position, e.pos) < e.radius + 1.1) { this.next.set(e, this.t + X.avion_golpe_s); c.damage(e, dmg); }
      // ponytail: la minibomba explota en el acto bajo el avión (sin modelo de caída); si se quiere verla caer, sumar un proyectil
      if (bomb) { const p = onFloor(m.position, 0.3); c.explode(p, X.avion_bomba_radio * c.st.area, dmg * X.avion_bomba_mult); FX.hit(p); }
    });
  }
  dispose() { for (const m of this.ps) m.dispose(); this.ps = []; }
}
