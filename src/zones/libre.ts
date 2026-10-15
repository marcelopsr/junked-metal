import * as B from "@babylonjs/core";
import { box, cyl, merge } from "../models";
import { pbr, shadows } from "../render";
import { HALF, bare, decal, floor, scene, stat } from "./common";
import { ramp } from "../world_layout";

// Free Roam (docs en .claude/trabajo/FREEROAM-diseno.md): 600x600 m sin enemigos. Centro (plaza, avenidas, anillo, atajos) + registro de barrios.
// Barrio nuevo = archivo `src/zones/libre_<nombre>.ts` que exporta `barrio: Barrio`; se descubre solo (import.meta.glob), sin tocar este archivo.
// Decorado con generador local (lcg), nunca rng().
export type Barrio = { id: string; cx: number; cz: number; build(cx: number, cz: number): void };
const BARRIOS = Object.values(import.meta.glob<{ barrio?: Barrio }>("./libre_*.ts", { eager: true })).flatMap((m) => (m.barrio ? [m.barrio] : [])).sort((a, b) => a.id.localeCompare(b.id));
const hidden = (m: B.Mesh) => ((m.isVisible = false), m);

export function libreBuild() {
  floor("libreAsfalto", "#ffffff", () => { const x = new B.Texture("./textures/r53-hormigon.webp", scene); x.wrapU = x.wrapV = B.Texture.WRAP_ADDRESSMODE; return x; }, 0.85, "concrete", 12);
  // Cordón rojo y blanco del borde (solo visual: las paredes físicas las pone buildWorld)
  const red = pbr("libreCordonR", { color: "#E53935", rough: 0.6, metal: 0 }), parts: B.Mesh[] = [];
  for (const [x, z, w, d] of [[0, HALF + 1, HALF * 2 + 4, 2], [0, -HALF - 1, HALF * 2 + 4, 2], [HALF + 1, 0, 2, HALF * 2 + 4], [-HALF - 1, 0, 2, HALF * 2 + 4]]) parts.push(box(w, 1.6, d, red, [x, 0.8, z]));
  const edge = merge("libreBorde", parts); edge.isPickable = false; edge.receiveShadows = true; shadows.addShadowCaster(edge);

  // Calles: avenidas en cruz (24 m) y anillo (18 m a 275), asfalto pintado sin colisión (el cordón es pintura: nada que trabe)
  const road = pbr("libreCalle", { color: "#4a4d52", rough: 0.9 }), tile = pbr("librePlaza", { color: "#c9b99a", rough: 0.85 });
  decal("avenidaEO", HALF * 2, 24, 0, 0, road, 0.02); decal("avenidaNS", 24, HALF * 2, 0, 0, road, 0.02);
  const R = 275, L = R * 2 + 18;
  for (const s of [-1, 1]) { decal("anilloNS", 18, L, s * R, 0, road, 0.02); decal("anilloEO", L, 18, 0, s * R, road, 0.02); }
  // Atajos diagonales (10 m) del centro a cada barrio, con un trampolín de entrada
  const wood = pbr("libreTrampolin", { color: "#f2c230", rough: 0.55 });
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const ry = Math.atan2(sx, sz), k = Math.SQRT1_2, g = B.MeshBuilder.CreateGround("atajo", { width: 10, height: 130 }, scene);
    g.position.set(sx * k * 105, 0.025, sz * k * 105); g.rotation.y = ry; g.material = road; g.receiveShadows = true;
    ramp(wood, sx * k * 52, sz * k * 52, ry, 6, 7, 0.9, 0, 2);
  }
  // Marcas: raya amarilla discontinua en el centro de las avenidas, blanca en el anillo y líneas de borde (una malla fusionada)
  const yel = pbr("libreRayaA", { color: "#f2c230", rough: 0.7 }), wht = pbr("libreRayaB", { color: "#e8e2d0", rough: 0.7 }), marks: B.Mesh[] = [];
  for (let t = -HALF + 6; t < HALF; t += 10) {
    if (Math.abs(t) > 46) marks.push(box(4, 0.02, 0.3, yel, [t, 0.05, 0]), box(0.3, 0.02, 4, yel, [0, 0.05, t]));
    for (const s of [-1, 1]) marks.push(box(0.3, 0.02, 4, wht, [s * R, 0.05, t]), box(4, 0.02, 0.3, wht, [t, 0.05, s * R]));
  }
  for (const s of [-1, 1]) {
    marks.push(box(HALF * 2, 0.02, 0.3, wht, [0, 0.05, s * 11.6]), box(0.3, 0.02, HALF * 2, wht, [s * 11.6, 0.05, 0]));
    for (const a of [-1, 1]) marks.push(box(0.3, 0.02, L, wht, [s * R + a * 8.6, 0.05, 0]), box(L, 0.02, 0.3, wht, [0, 0.05, s * R + a * 8.6]));
  }
  const mk = merge("libreMarcas", marks); mk.isPickable = false; mk.position.y = 0.07; // sube sobre el asfalto (el decal lleva zOffset y tapaba las rayas) mk.receiveShadows = true;

  // Plaza central (r 40): losa cálida, fuente baja, 6 faroles y cartel de barrios (una placa de color por barrio, sin texto)
  const disc = B.MeshBuilder.CreateDisc("plaza", { radius: 40, tessellation: 48 }, scene);
  disc.rotation.x = Math.PI / 2; disc.position.y = 0.035; disc.material = tile; tile.zOffset = -3; disc.receiveShadows = true;
  const blue = pbr("libreAgua", { color: "#4fc3f7", rough: 0.15 }), lamp = pbr("libreFarol", { color: "#fff3c0", rough: 0.3, emissive: "#ffd98a" }), dark = pbr("librePoste", { color: "#23262b", rough: 0.6 }), deco: B.Mesh[] = [];
  deco.push(cyl(11.2, 12, 0.7, tile, [0, 0.35, 0], undefined, 24), cyl(9, 9, 0.12, blue, [0, 0.76, 0], undefined, 24), cyl(1, 1.4, 2.6, tile, [0, 1.3, 0], undefined, 12));
  hidden(stat(cyl(12, 12, 0.8, tile, [0, 0, 0], undefined, 12), B.PhysicsShapeType.CYLINDER, {}, [0, 0.4, 0]));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.52, x = Math.cos(a) * 34, z = Math.sin(a) * 34;
    deco.push(cyl(0.3, 0.4, 7, dark, [x, 3.5, z]), cyl(1.1, 1.1, 1.1, lamp, [x, 7.2, z], undefined, 10));
    hidden(stat(cyl(0.8, 0.8, 3, tile, [0, 0, 0]), B.PhysicsShapeType.CYLINDER, {}, [x, 1.5, z]));
  }
  deco.push(cyl(0.3, 0.3, 6, dark, [10, 3, 10]));
  hidden(stat(cyl(0.8, 0.8, 3, tile, [0, 0, 0]), B.PhysicsShapeType.CYLINDER, {}, [10, 1.5, 10]));
  for (const [sx, sz, c] of [[-1, 1, "#f2c230"], [1, 1, "#42a5f5"], [-1, -1, "#eceff1"], [1, -1, "#fb8c00"]] as [number, number, string][])
    deco.push(box(3.4, 0.9, 0.15, pbr("libreCartel" + c, { color: c, rough: 0.5 }), [10 + sx * 1.8, 5.2 - (sz < 0 ? 1.1 : 0) , 10 + sz * 1.8], [0, Math.atan2(sx, sz) + Math.PI / 2, 0]));
  const dc = merge("librePlaza", deco); dc.isPickable = false; dc.receiveShadows = true; shadows.addShadowCaster(dc);
  bare.push({ x: 0, z: 0, r: 42 });

  for (const b of BARRIOS) b.build(b.cx, b.cz);
}
