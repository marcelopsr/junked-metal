import * as B from "@babylonjs/core";
import { at } from "../moon";
import { FUSIONS, NMAX, Weapon, X, type Ctx, type FusionId, type WeaponId } from "./base";
import type { Bengalas } from "./bengalas";
import type { Chispero } from "./chispero";
import type { Clips } from "./clips";
import type { Gomitas } from "./gomitas";
import type { Tesla } from "./tesla";
import type { Yoyo } from "./yoyo";

// Fusión: corre las dos armas de origen ya evolucionadas (nivel 5) y les agrega la sinergia de la tabla FUSIONS
export class Fusion extends Weapon {
  parts: Weapon[];
  t = 0;
  constructor(id: FusionId, make: (id: WeaponId) => Weapon) {
    super(id);
    this.parts = FUSIONS.find((f) => f.id === id)!.from.map((p) => { const w = make(p); w.lv = NMAX; w.evolved = true; return w; });
    if (id === "globos") (this.parts[0] as Gomitas).onHit = (c, e) => {
      // La gomita revienta: empapa, empuja y salpica en 3 m
      for (const o of c.enemies) {
        const d = B.Vector3.Distance(o.pos, e.pos);
        if (d < X.globos_radio * c.st.area + o.radius) { o.slow = Math.max(o.slow, X.globos_ralentiza_s); if (o !== e) c.damage(o, X.globos_dano * c.st.dmg, o.pos.subtract(e.pos).normalize().scale(3)); }
      }
    };
    // Cada golpe del yo-yo (como mucho 4 por segundo) suelta un rayo en cadena de 4 enemigos
    if (id === "yoyoelec") (this.parts[0] as Yoyo).onHit = (c, e) => { if (this.t <= 0) { this.t = X.yoyoelec_cada_s; (this.parts[1] as Tesla).zap(c, e.pos, at(e.pos, 0, 1, 0), X.yoyoelec_cadena, X.yoyoelec_dano * c.st.dmg); } };
    if (id === "vapor") (this.parts[0] as Bengalas).steam = true;
  }
  get cdFrac() { return this.parts[0].cdFrac; }
  update(c: Ctx) {
    this.t -= c.dt;
    const [a, b] = this.parts;
    if (this.id === "chispazo") {
      // Cada explosión (como mucho 4 por segundo) suelta un rayo en cadena de 4 enemigos
      a.update({ ...c, explode: (p, r, dmg) => { c.explode(p, r, dmg); if (this.t <= 0) { this.t = X.chispazo_cada_s; (b as Tesla).zap(c, p, at(p, 0, 1, 0), X.chispazo_cadena, dmg * X.chispazo_dano_mult); } } });
    } else a.update(c);
    b.update(c);
    if (this.id === "anillo" && this.t <= 0) {
      this.t = X.anillo_cada_s;
      for (const m of (a as Clips).ms) (b as Chispero).drop(m.position, X.anillo_radio * c.st.area, X.anillo_fuego_s);
    }
  }
  dispose() { for (const p of this.parts) p.dispose(); }
}

