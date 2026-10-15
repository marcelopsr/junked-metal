// Paseo libre: las 24 tuercas doradas como instancias de UNA plantilla (nunca mallas sueltas). Aparte de free_tricks.ts para que la lógica pura se pruebe sin motor.
import * as B from "@babylonjs/core";
import { cyl, template, tor } from "./models";
import { M, pbr } from "./render";
import { NUTS, NUT_N } from "./free_tricks";

const gold = () => template("tuercaOro", () => [
  tor(0.8, 0.3, pbr("nutGold", { color: "#ffa200", rough: 0.25, metal: 0.8, emissive: "#a35a00" }), [0, 0, 0], undefined, 6),
  cyl(0.3, 0.3, 0.14, M.matte("#2a1a00"), [0, 0, 0], undefined, 6),
]);

/** Crea las instancias de las tuercas no juntadas (bits "0101..."); `tick` las hace girar y flotar, `take` apaga una, `dispose` las libera. */
export function spawnNuts(bits: string) {
  const src = gold(), inst: (B.InstancedMesh | null)[] = [];
  for (let i = 0; i < NUT_N; i++) {
    if (bits[i] === "1") { inst.push(null); continue; }
    const m = src.createInstance("tuercaOro" + i); m.isPickable = false;
    m.position.set(NUTS[i][0], NUTS[i][1], NUTS[i][2]); m.scaling.setAll(1.8); m.rotation.x = Math.PI / 2; // grande: se ve desde la cámara de persecución // de canto, gira sobre el eje vertical
    inst.push(m);
  }
  let t = 0;
  return {
    tick(dt: number) { t += dt; inst.forEach((m, i) => { if (m) { m.rotation.y = t * 2.2 + i; m.position.y = NUTS[i][1] + Math.sin(t * 2 + i) * 0.18; } }); },
    take(i: number) { inst[i]?.dispose(); inst[i] = null; },
    dispose() { inst.forEach((m) => m?.dispose()); inst.length = 0; },
  };
}
