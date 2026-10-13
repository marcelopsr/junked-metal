import * as B from "@babylonjs/core";
import { FX } from "../fx";
import { hd, onFloor, orient } from "../moon";
import { X, type Ctx } from "./base";
import { fireTpl } from "./chispero";

// Efectos de pasivas que dejan cosas en el piso. Caño de escape: al derrapar o usar el turbo suelta fuego detrás del auto.
// ponytail: solo el auto que guía (los compañeros de pantalla dividida no sueltan fuego); estado de módulo, se limpia con escapeReset() al empezar la partida.
const fires: { m: B.InstancedMesh; life: number; r: number }[] = [];
let tEsc = 0;

export function escapeReset() { for (const f of fires) f.m.dispose(); fires.length = 0; tEsc = 0; }

export function escapeTick(c: Ctx, active: boolean) {
  const dps = c.st.escape;
  if (dps > 0 && active && (tEsc -= c.dt) <= 0) {
    tEsc = X.escape_paso_s;
    const m = fireTpl().createInstance("fe"), r = c.st.escapeR * c.st.area;
    onFloor(c.car.pos.subtract(c.car.root.forward.scale(1.6)), 0.03, m.position); orient(m); m.scaling.setAll(r);
    fires.push({ m, life: X.escape_fuego_s, r });
    if (Math.random() < 0.4) FX.hit(m.position);
  }
  for (let i = fires.length - 1; i >= 0; i--) {
    const f = fires[i];
    f.life -= c.dt;
    f.m.scaling.setAll(f.r * Math.min(1, f.life * 2));
    for (const e of c.enemies) if (hd(e.pos, f.m.position) < f.r + e.radius * 0.5) c.damage(e, dps * c.dt);
    if (f.life <= 0) { f.m.dispose(); fires.splice(i, 1); }
  }
}
