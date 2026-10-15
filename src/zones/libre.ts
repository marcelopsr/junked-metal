import * as B from "@babylonjs/core";
import { box, merge } from "../models";
import { pbr, shadows } from "../render";
import { HALF, floor, scene } from "./common";

// Free Roam (docs en .claude/trabajo/FREEROAM-diseno.md): 600x600 m sin enemigos. Esqueleto de E0: piso grande y borde visible.
// Los barrios (skatepark, acuático, nieve, obstáculos) los arman otros encargos desde acá: llamar a cada `build(cx, cz)` al final de libreBuild.
// Decorado con generador local (lcg), nunca rng().
export function libreBuild() {
  floor("libreAsfalto", "#ffffff", () => { const x = new B.Texture("./textures/r53-hormigon.webp", scene); x.wrapU = x.wrapV = B.Texture.WRAP_ADDRESSMODE; return x; }, 0.85, "concrete", 12);
  // Cordón rojo y blanco del borde (solo visual: las paredes físicas las pone buildWorld)
  const red = pbr("libreCordonR", { color: "#E53935", rough: 0.6, metal: 0 }), parts: B.Mesh[] = [];
  for (const [x, z, w, d] of [[0, HALF + 1, HALF * 2 + 4, 2], [0, -HALF - 1, HALF * 2 + 4, 2], [HALF + 1, 0, 2, HALF * 2 + 4], [-HALF - 1, 0, 2, HALF * 2 + 4]]) parts.push(box(w, 1.6, d, red, [x, 0.8, z]));
  const edge = merge("libreBorde", parts); edge.isPickable = false; edge.receiveShadows = true; shadows.addShadowCaster(edge);
}
