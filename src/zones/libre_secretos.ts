import * as B from "@babylonjs/core";
import { box, cyl, merge, sph } from "../models";
import { M, pbr, shadows } from "../render";
import { SECRETOS } from "../free_secrets";
import { bare, occluders, scene, stat } from "./common";
import type { Barrio } from "./libre";
import { ramp } from "../world_layout";

// Free Roam, SECRETOS: cuatro lugares escondidos, uno por barrio, que se descubren manejando hasta ellos (coordenadas en src/free_secrets.ts; main.ts los detecta).
// No es un barrio con centro propio (sin cartel ni radar: libre.ts lo filtra de LUGARES); solo se registra por el glob libre_*.ts.
//  cueva  (acuático)  : cueva de roca detrás de una cortina de agua que se atraviesa; mira al sur.
//  túnel  (skatepark) : túnel de 7 m bajo un puente de 3,6 m; el puente se sube por rampas de 9 grados (se puede pasar por abajo o por arriba).
//  claro  (nieve)     : anillo de pinos con un hueco al este y un muñeco de nieve gigante en el medio.
//  azotea (centro)    : edificio de 3,6 m al que solo se llega saltando desde una rampa (hueco de 3,5 m; hay que entrar derecho y sin frenar: de costado o frenando el auto choca con la pared y retrocede).
// Física: sin escalones (todo apoya en el piso a y = 0 o entra por rampa de pendiente continua); colisionadores BOX/CILINDRO que son la malla visible o una invisible.
// Decorado con generador local (lcg), nunca rng(); todo son mallas de la escena (world.ts las libera al desarmar), sin observers ni texturas propias.
const lcg = (s: number) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const hidden = (m: B.Mesh) => ((m.isVisible = false), m);
const at = (id: string) => SECRETOS.find((s) => s.id === id)!;

function build() {
  const rnd = lcg(404404);
  const rock = pbr("secRoca", { color: "#8a7a6c", rough: 0.9 }), rockD = pbr("secRocaOsc", { color: "#4b4038", rough: 0.9 }), dark = M.matte("#1d1a18");
  const deco: B.Mesh[] = [];
  /** Caja sólida visible: colisionador BOX que es su propia malla. */
  const solid = (w: number, h: number, d: number, x: number, y: number, z: number, mat: B.Material, ry = 0) => stat(box(w, h, d, mat, [0, 0, 0]), B.PhysicsShapeType.BOX, { friction: 0.5 }, [x, y, z, ry]);
  const post = (dm: number, h: number, x: number, z: number) => hidden(stat(cyl(dm, dm, h, rock, [0, 0, 0], undefined, 8), B.PhysicsShapeType.CYLINDER, {}, [x, h / 2, z]));

  // ---- Cueva tras la cascada (acuático): paredes, techo y fondo; la cortina de agua no tiene colisión ----
  { const { x, z } = at("cueva"), z0 = z - 9, z1 = z + 12; // boca en z0 (norte = fondo)
    for (const s of [-1, 1]) solid(3, 5.6, z1 - z0, x + s * 5.5, 2.8, (z0 + z1) / 2, rock);
    const techo = solid(14, 1.6, z1 - z0 + 1.5, x, 6.4, (z0 + z1) / 2 - 0.75, rock); // techo con un labio al frente (de donde cae el agua); colisión intacta
    occluders.push(techo); // la cámara lo oculta (isVisible) cuando tapa al auto, como la ciudad y los árboles
    solid(14, 5.6, 3, x, 2.8, z1 - 1.5, rock);
    const lomo: B.Mesh[] = [];
    for (let i = 0; i < 9; i++) { const a = rnd(); lomo.push(sph(3 + rnd() * 2.5, i % 2 ? rock : rockD, [x + (a - 0.5) * 10, 7.2 + rnd() * 0.8, z0 + 2 + rnd() * (z1 - z0 - 4)], [1.3, 0.55, 1.1])); } // lomo de piedras sobre el techo (sin colisión); malla aparte para que la cámara también la oculte
    { const l = merge("secCuevaLomo", lomo); l.isPickable = false; l.receiveShadows = true; shadows.addShadowCaster(l); occluders.push(l); }
    const wat = pbr("secCascada", { color: "#6fd8ff", rough: 0.05, emissive: "#2a8fb5", alpha: 0.55 });
    wat.backFaceCulling = false; wat.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
    const cur = B.MeshBuilder.CreatePlane("secCascada", { width: 8.6, height: 5.6, sideOrientation: B.Mesh.DOUBLESIDE }, scene);
    cur.position.set(x, 2.8, z0 - 1.1); cur.material = wat; cur.isPickable = false;
    for (let i = 0; i < 6; i++) deco.push(box(0.18, 5.4, 0.12, M.matte("#ffffff"), [x - 3.6 + i * 1.44 + (rnd() - 0.5) * 0.5, 2.8, z0 - 1.25])); // hilos de espuma
    const pond = B.MeshBuilder.CreateDisc("secCascadaCharco", { radius: 5.5, tessellation: 24 }, scene);
    pond.rotation.x = Math.PI / 2; pond.scaling.x = 1.5; pond.position.set(x, 0.1, z0 - 3); pond.material = wat; pond.isPickable = false;
    deco.push(box(1.2, 0.2, 1.2, pbr("secLuz", { color: "#ffd23f", rough: 0.5, emissive: "#a67c00" }), [x, 5.4, z + 3]), sph(1.4, rockD, [x - 3, 0.5, z + 8], [1.3, 0.8, 1]), sph(1.1, rock, [x + 3.4, 0.4, z + 6], [1.2, 0.7, 1]));
    bare.push({ x, z: z + 1.5, r: 16 });
  }

  // ---- Túnel bajo el puente (skatepark) ----
  { const { x, z } = at("tunel"), H = 3.6, wood = pbr("secTunelRampa", { color: "#f2c230", rough: 0.55 }), conc = pbr("secTunelHormigon", { color: "#a49d92", rough: 0.85 });
    for (const s of [-1, 1]) solid(16, 2.9, 1.2, x, 1.45, z + s * 4.2, conc); // paredes del túnel (hueco libre de 7,2 m)
    solid(16, 0.7, 11.2, x, 3.25, z, conc); // techo = puente
    for (const s of [-1, 1]) solid(0.4, 0.5, 11.2, x + s * 7.8, H + 0.25, z, rockD); // bordillos laterales del puente
    ramp(wood, x, z - 5.6 - 22, 0, 16, 22, H); ramp(wood, x, z + 5.6 + 22, Math.PI, 16, 22, H);
    const lamp = pbr("secLuz", { color: "#ffd23f", rough: 0.5, emissive: "#a67c00" });
    for (const s of [-1, 1]) deco.push(box(1.2, 0.18, 0.8, lamp, [x + s * 4, 2.8, z]), box(0.12, 2.9, 0.12, lamp, [x + s * 8.02, 1.45, z - 4.2]), box(0.12, 2.9, 0.12, lamp, [x + s * 8.02, 1.45, z + 4.2])); // luces del techo y marcos de las bocas
    deco.push(box(0.12, 0.3, 7.2, lamp, [x - 8.02, 2.75, z]), box(0.12, 0.3, 7.2, lamp, [x + 8.02, 2.75, z]));
    bare.push({ x, z, r: 30 });
  }

  // ---- Claro del muñeco gigante (nieve): anillo de pinos con un hueco al este ----
  { const { x, z } = at("claro"), snow = M.matte("#f4f8ff"), pine = pbr("secPino", { color: "#2f6b4a", rough: 0.85 }), trunk = M.matte("#5a3d2a");
    const tree = (px: number, pz: number, sc: number) => {
      deco.push(cyl(0.8 * sc, 1.1 * sc, 3 * sc, trunk, [px, 1.5 * sc, pz], undefined, 6), cyl(0, 6.2 * sc, 4.6 * sc, pine, [px, 4.6 * sc, pz], undefined, 8), cyl(0, 4.8 * sc, 4 * sc, pine, [px, 7 * sc, pz], undefined, 8), cyl(0, 3.2 * sc, 3.4 * sc, snow, [px, 9.3 * sc, pz], undefined, 8));
      post(2 * sc, 4, px, pz);
    };
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; if (Math.cos(a) > 0.93) continue; tree(x + Math.cos(a) * 17, z + Math.sin(a) * 17, 1 + rnd() * 0.3); } // el hueco queda hacia +x
    for (let i = 0; i < 16; i++) { const a = rnd() * Math.PI * 2, r = 22 + rnd() * 6, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (Math.cos(a) > 0.8 && Math.abs(pz - z) < 9) continue; tree(px, pz, 1 + rnd() * 0.4); } // segunda fila, sin tapar el camino
    deco.push(sph(7, snow, [x, 3.5, z]), sph(5, snow, [x, 8.6, z]), sph(3.4, snow, [x, 12.1, z]),
      cyl(2.6, 3, 0.4, dark, [x, 13.7, z], undefined, 12), cyl(2, 2.4, 2.2, dark, [x, 14.9, z], undefined, 12), cyl(2.64, 2.64, 0.5, M.matte("#c62828"), [x, 14.1, z], undefined, 12),
      cyl(4.6, 4.6, 0.8, M.matte("#c62828"), [x, 10.9, z], undefined, 12), // bufanda
      cyl(0, 0.9, 3.2, M.matte("#fb8c00"), [x + 2.1, 12.2, z], [0, 0, -Math.PI / 2], 6), // nariz de zanahoria hacia +x
      sph(0.5, dark, [x + 1.4, 12.9, z - 0.8]), sph(0.5, dark, [x + 1.4, 12.9, z + 0.8]),
      ...[0, 1, 2].map((k) => sph(0.55, dark, [x + 2.4, 9.2 - k * 1.1, z], undefined, 4)),
      cyl(0.25, 0.25, 5, trunk, [x, 9.6, z - 4.6], [Math.PI / 2.8, 0, 0], 5), cyl(0.25, 0.25, 5, trunk, [x, 9.6, z + 4.6], [-Math.PI / 2.8, 0, 0], 5)); // brazos de ramita
    hidden(stat(cyl(7, 7, 7, snow, [0, 0, 0], undefined, 12), B.PhysicsShapeType.CYLINDER, {}, [x, 3.5, z]));
    for (let i = 0; i < 4; i++) { const a = 0.9 + i * 1.5; deco.push(box(1.6, 1.2, 1.6, M.matte(["#e53935", "#1e88e5", "#fdd835", "#43a047"][i]), [x + Math.cos(a) * 6.5, 0.6, z + Math.sin(a) * 6.5], [0, a, 0])); } // regalos al pie (sin colisión)
    const nieve = B.MeshBuilder.CreateDisc("secClaroNieve", { radius: 21, tessellation: 32 }, scene); // manto de nieve redondo, sin colisión
    nieve.rotation.x = Math.PI / 2; nieve.position.set(x, 0.05, z); nieve.material = M.matte("#eef4fa"); nieve.material.zOffset = -2; nieve.isPickable = false; nieve.receiveShadows = true;
    bare.push({ x, z, r: 28 });
  }

  // ---- Azotea (centro): edificio de 14 x 14 x 3,6 m, rampa de salto de 16 m que sube a 3,9 m y 6 m de hueco ----
  { const { x, z } = at("azotea"), H = 3.6, brick = pbr("secLadrillo", { color: "#b5654a", rough: 0.85 }), wood = pbr("secSalto", { color: "#f2c230", rough: 0.55 }), lamp = pbr("secLuz", { color: "#ffd23f", rough: 0.5, emissive: "#a67c00" });
    solid(14, H, 14, x, H / 2, z, brick);
    for (const [w, d, px, pz] of [[0.4, 14, x - 6.8, z], [0.4, 14, x + 6.8, z], [14, 0.4, x, z + 6.8]]) solid(w, 0.5, d, px, H + 0.25, pz, rockD); // parapetos al este, oeste y norte: el frente queda libre para aterrizar
    solid(2.4, 1.6, 2.4, x - 5, H + 0.8, z + 5, M.matte("#9aa5ad")); post(3, 1.6, x + 5, z + 5); // aire acondicionado (colisión) y tanque
    deco.push(cyl(2.8, 2.8, 1.6, M.matte("#7e57c2"), [x + 5, H + 0.8, z + 5], undefined, 12));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) deco.push(box(0.2, 6, 0.2, lamp, [x + sx * 6.8, H + 3, z + sz * 6.8])); // balizas de las esquinas: se ven de lejos
    ramp(wood, x, z - 7 - 3.5 - 16, 0, 8, 16, 3.9); // sube a 3,9 m; el borde de la azotea (3,6 m) queda 3,5 m más adelante (medido: a 15 m/s el auto cae casi plano, con 6 m chocaba la pared)
    bare.push({ x, z: z - 14, r: 34 });
  }

  const d = merge("secretosDeco", deco); d.isPickable = false; d.receiveShadows = true; shadows.addShadowCaster(d);
}

export const barrio: Barrio = { id: "secretos", cx: 0, cz: 0, build };
