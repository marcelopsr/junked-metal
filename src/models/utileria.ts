import * as B from "@babylonjs/core";
import { box, cyl, hazardMat, sph, template, tor } from "../models";
import { pbr, shadows } from "../render";
import { orient, upAt } from "../moon";

// Utilería de juguete que cae en la interrupción LLUVIA DE UTILERÍA (encore_run.ts): marca de peligro en el piso + objeto que baja.
// Plantillas instanciadas (sin mallas sueltas por entidad); las instancias se reciclan y `utilDispose` las libera al desarmar.
const mat = (c: string, rough = 0.7, emissive?: string) => pbr(`util${c}`, { color: c, rough, emissive });
const TPL = [
  () => template("utilSaco", () => [sph(1.5, mat("#c9a96b", 0.9), [0, 0.6, 0], [1, 0.7, 0.8], 8), box(0.9, 0.1, 0.5, mat("#8a6a3a"), [0, 1.1, 0])]), // bolsa de arena
  () => template("utilFoco", () => [cyl(0.5, 0.5, 0.5, mat("#3a3d44", 0.4), [0, 1.15, 0]), sph(1.1, mat("#ffe9a8", 0.3, "#ffd45a"), [0, 0.55, 0], undefined, 8)]), // foco de escenario
  () => template("utilCaja", () => [box(1.4, 1.4, 1.4, mat("#a8763e"), [0, 0.7, 0]), box(1.5, 0.18, 0.5, mat("#6b4a26"), [0, 1.0, 0]), box(0.5, 0.18, 1.5, mat("#6b4a26"), [0, 0.4, 0])]), // caja de utilería
];
const markTpl = () => { const t = template("utilMarca", () => [tor(2, 0.12, hazardMat(), [0, 0.03, 0], undefined, 20)]); shadows.removeShadowCaster(t); return t; };
const pool: Record<string, B.InstancedMesh[]> = {};
const grab = (name: string, tpl: () => B.Mesh) => {
  const p = (pool[name] ??= []);
  let m = p.find((x) => !x.isEnabled());
  if (!m) { m = tpl().createInstance(name); m.isPickable = false; p.push(m); }
  m.setEnabled(true);
  return m;
};
export type Util = { mark: B.InstancedMesh; prop: B.InstancedMesh };
export function utilNew(kind: number): Util { return { mark: grab("utilMarca", markTpl), prop: grab("utilProp" + (kind % 3), TPL[kind % 3]) }; }
/** k 0..1 = avance de la caída (1 = impacto): la marca cierra su aro hasta el radio de daño y el objeto baja. */
export function utilSet(u: Util, p: B.Vector3, k: number, r: number) {
  const up = upAt(p), rr = r * (1.8 - 0.8 * k);
  u.mark.position.copyFrom(p).addInPlace(up.scale(0.08)); orient(u.mark, p); u.mark.scaling.set(rr / 2, 1, rr / 2);
  u.prop.position.copyFrom(p).addInPlace(up.scale(0.2 + (1 - k) * (1 - k) * 14)); u.prop.rotation.set(0, k * 6, 0); orient(u.prop, p); u.prop.scaling.setAll(1.6);
}
export const utilFree = (u: Util) => { u.mark.setEnabled(false); u.prop.setEnabled(false); };
export function utilDispose() { for (const p of Object.values(pool)) for (const m of p) m.dispose(); for (const k of Object.keys(pool)) delete pool[k]; }
