import * as B from "@babylonjs/core";
import { box, cyl, merge, sph } from "../models";
import { M, pbr, shadows } from "../render";
import { bare, decal, scene, stat, tex } from "./common";
import type { Barrio } from "./libre";

// Skatepark de juguete de Free Roam (centro -150, +150). Física: cada pieza grande es UN colisionador MESH que es su propia malla visible
// (superficie continua, sin bordes internos); lo plano son cajas invisibles. Reglas: pie enterrado (-0,06), sin escalones > 0,3 m, curvas de 12 tramos,
// el borde de las curvas termina a 78° (no vertical) y detrás hay cubierta plana. Decorado con generador local, nunca rng().
// Coordenadas: x este, z norte; ry = 0 mira al norte (+z). Cada pieza se posa ANTES de su PhysicsAggregate (stat con `at`).

type P = [number, number];
const BUR = -0.06;
const lcg = (s: number) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const hidden = (m: B.Mesh) => ((m.isVisible = false), m);

/** Malla de solo cara superior (más faldones) con winding verificado: construye con una dirección "hacia afuera" por triángulo y corrige el sentido global con las normales. */
function surf(name: string, mat: B.Material) {
  const pos: number[] = [], ind: number[] = [];
  const vtx = (x: number, y: number, z: number) => pos.push(x, y, z) / 3 - 1;
  const tri = (a: number, b: number, c: number, o: [number, number, number]) => {
    const [ax, ay, az] = [pos[3 * a], pos[3 * a + 1], pos[3 * a + 2]];
    const ux = pos[3 * b] - ax, uy = pos[3 * b + 1] - ay, uz = pos[3 * b + 2] - az, vx = pos[3 * c] - ax, vy = pos[3 * c + 1] - ay, vz = pos[3 * c + 2] - az;
    const d = (uy * vz - uz * vy) * o[0] + (uz * vx - ux * vz) * o[1] + (ux * vy - uy * vx) * o[2];
    if (d >= 0) ind.push(a, b, c); else ind.push(a, c, b);
  };
  const done = () => {
    const nor: number[] = [];
    B.VertexData.ComputeNormals(pos, ind, nor);
    if (nor[1] < 0) { for (let i = 0; i < ind.length; i += 3) [ind[i + 1], ind[i + 2]] = [ind[i + 2], ind[i + 1]]; B.VertexData.ComputeNormals(pos, ind, nor); }
    const m = new B.Mesh(name, scene), vd = new B.VertexData();
    vd.positions = pos; vd.indices = ind; vd.normals = nor; vd.applyToMesh(m);
    m.material = mat;
    return m;
  };
  return { vtx, tri, done };
}
const UP: [number, number, number] = [0, 1, 0];

/** Perfil [z, y] extruido a lo ancho W (x centrado): rampas, half-pipe, cajas. Cara superior + faldones laterales hasta -0,06. */
function strip(name: string, pts: P[], W: number, mat: B.Material) {
  const s = surf(name, mat), n = pts.length, h = W / 2;
  const L = pts.map(([z, y]) => s.vtx(-h, y, z)), R = pts.map(([z, y]) => s.vtx(h, y, z));
  for (let i = 0; i < n - 1; i++) { s.tri(L[i], L[i + 1], R[i + 1], UP); s.tri(L[i], R[i + 1], R[i], UP); }
  for (const sx of [-1, 1]) {
    const T = pts.map(([z, y]) => s.vtx(sx * h, y, z)), Bt = pts.map(([z]) => s.vtx(sx * h, BUR, z));
    for (let i = 0; i < n - 1; i++) { s.tri(T[i], T[i + 1], Bt[i + 1], [sx, 0, 0]); s.tri(T[i], Bt[i + 1], Bt[i], [sx, 0, 0]); }
  }
  return s.done();
}
/** Perfil [r, y] girado 360° (anillo de bowl): vértices compartidos en la costura para normales suaves. */
function lathe(name: string, pts: P[], seg: number, mat: B.Material) {
  const s = surf(name, mat), n = pts.length, id: number[][] = [];
  for (let j = 0; j < seg; j++) { const a = (j / seg) * Math.PI * 2; id.push(pts.map(([r, y]) => s.vtx(Math.cos(a) * r, y, Math.sin(a) * r))); }
  for (let j = 0; j < seg; j++) for (let i = 0; i < n - 1; i++) {
    const a = id[j][i], b = id[j][i + 1], c = id[(j + 1) % seg][i + 1], d = id[(j + 1) % seg][i];
    s.tri(a, b, c, UP); s.tri(a, c, d, UP);
  }
  return s.done();
}
/** Cuarto de tubo de radio R hasta `deg` grados: [avance, altura] desde la tangente plana. */
const arc = (R: number, deg: number, k = 12): P[] => Array.from({ length: k + 1 }, (_, i) => { const t = ((deg * i) / k) * (Math.PI / 180); return [R * Math.sin(t), R * (1 - Math.cos(t))]; });
const SOLID = (m: B.Mesh, x: number, z: number, ry: number) => stat(m, B.PhysicsShapeType.MESH, { friction: 0.5 }, [x, 0, z, ry]);

/** Half-pipe: canal de 40 m en x, suelo plano f*2, curvas de radio R a 78°, cubierta de 6 m y bajada suave de `sl` m. Centro (cx, cz), eje en x. */
function halfpipe(cx: number, cz: number, len: number, H: number, flat: number, mat: B.Material) {
  const R = H / (1 - Math.cos((78 * Math.PI) / 180)), a = arc(R, 78).map(([h, y]): P => [h, y + 0.04]), he = a[a.length - 1][0], deck = 6, sl = 32, f = flat / 2;
  const half: P[] = [[f + he + deck + sl, BUR], [f + he + deck, H + 0.04], ...a.map(([h, y]): P => [f + h, y]).reverse()]; // de afuera hacia el suelo
  const pts: P[] = [...half.map(([z, y]): P => [-z, y]), ...half.slice().reverse().map(([z, y]): P => [z, y])];
  const m = strip("halfpipe", pts, len, mat);
  return SOLID(m, cx, cz, 0); // perfil a lo ancho en z, canal a lo largo de x (ancho local)
}
/** Bowl: anillo con piso plano (el piso del mapa, y = 0) de radio r0, pared de `depth` m a 78°, cubierta de 2,2 m y bajada 1:4 por fuera. */
function bowl(cx: number, cz: number, r0: number, depth: number, mat: B.Material, floorMat: B.Material) {
  const R = depth / (1 - Math.cos((78 * Math.PI) / 180)), a = arc(R, 78), top = a[a.length - 1][1], pts: P[] = [[r0, 0], ...a.slice(1).map(([h, y]): P => [r0 + h, y]), [r0 + a[a.length - 1][0] + 2.2, top], [r0 + a[a.length - 1][0] + 2.2 + top * 4, BUR]];
  const m = lathe("bowl", pts, 28, mat);
  SOLID(m, cx, cz, 0);
  const d = B.MeshBuilder.CreateDisc("bowlPiso", { radius: r0, tessellation: 28 }, scene);
  d.rotation.x = Math.PI / 2; d.position.set(cx, 0.035, cz); d.material = floorMat; floorMat.zOffset = -3; d.receiveShadows = true;
  bare.push({ x: cx, z: cz, r: pts[pts.length - 1][0] });
  return pts[pts.length - 1][0];
}
/** Kicker curvo: arco R hasta `deg` grados y cola recta hasta la altura H; el borde de salida cae a pico. Sale en +z local. */
function kicker(R: number, deg: number, H: number) {
  const a = arc(R, deg), [ez, ey] = a[a.length - 1], t = deg * (Math.PI / 180), z1 = ez + Math.max(0, (H - ey) / Math.tan(t));
  return { pts: [[0, BUR], ...a.slice(1), ...(z1 > ez ? [[z1, H] as P] : []), [z1 + 0.05, BUR]] as P[], len: z1 };
}

function build(cx: number, cz: number) {
  const rnd = lcg(150150);
  const concrete = pbr("skateConcreto", { color: "#d9d2c0", rough: 0.85 }), wood = pbr("skateMadera", { color: "#b07a4a", rough: 0.6 }), red = pbr("skateRoja", { color: "#c8452c", rough: 0.55 });
  const coping = M.plastic("#f2c230"), black = M.matte("#23262b"), steel = M.metal("#9aa0a8"), slab = pbr("skateLosa", { color: "#8d8f98", rough: 0.9, tex: tex("libreSkate", () => { const x = new B.Texture("./textures/g-libre-skate.webp", scene); x.wrapU = x.wrapV = B.Texture.WRAP_ADDRESSMODE; x.uScale = x.vScale = 8; return x; }) }), pool = pbr("skatePiso", { color: "#565b66", rough: 0.9 }); // losa oscura y rampas claras: las piezas se leen desde arriba
  const deco: B.Mesh[] = [];

  // Losa clara de todo el parque (decal: sin colisión) y manchas de pintura desgastada (generador local)
  decal("skateLosa", 240, 250, cx + 5, cz - 5, slab, 0.03);
  for (let i = 0; i < 26; i++) {
    const c = ["#e53935", "#42a5f5", "#fbc02d", "#66bb6a", "#8e24aa"][Math.floor(rnd() * 5)], r = 0.8 + rnd() * 2.4;
    deco.push(cyl(r * 2, r * 2, 0.02, pbr("skateMancha" + c, { color: c, rough: 0.8 }), [cx - 115 + rnd() * 230, 0.05, cz - 125 + rnd() * 245], undefined, 10));
  }

  // Half-pipe 40 x 24, 7 m (se corrió a z = 215 para que la bajada de 32 m quepa antes del anillo)
  halfpipe(cx, 215, 40, 7, 6.7, concrete);
  for (const s of [-1, 1]) deco.push(box(40, 0.3, 0.5, coping, [cx, 7.15, 215 + s * 18.1])); // coping amarillo en el borde de la cubierta
  bare.push({ x: cx, z: 215, r: 28 });

  // Bowls (sueltos, con piso del mapa): grande y chico
  bowl(-110, 105, 13, 4, concrete, pool);
  bowl(-45, 140, 9, 3, concrete, pool);

  // Plaza de street: funbox, dos tramos de escalones (0,22 por peldaño, 4 peldaños) y barandas bajas
  const funP: P[] = [[0, BUR], [4.5, 1.2], [9.5, 1.2], [14, BUR]];
  SOLID(strip("funbox", funP, 8, wood), -207, 90, Math.PI / 2);
  const stairs: P[] = [[0, BUR], [0.06, 0.22], [1.6, 0.22], [1.66, 0.44], [3.2, 0.44], [3.26, 0.66], [4.8, 0.66], [4.86, 0.88], [7.5, 0.88], [7.56, BUR]];
  SOLID(strip("escalones", stairs, 6, concrete), -222, 72, Math.PI / 2);
  SOLID(strip("escalones", stairs, 6, concrete), -176, 110, -Math.PI / 2);
  for (const [x, z, alongX] of [[-205, 108, 1], [-215, 100, 1], [-190, 74, 0], [-170, 90, 0], [-228, 95, 0], [-182, 125, 1]] as [number, number, number][]) {
    hidden(stat(box(alongX ? 8 : 0.4, 0.7, alongX ? 0.4 : 8, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, { friction: 0.3 }, [x, 0.35, z]));
    deco.push(cyl(0.24, 0.24, 8, steel, [x, 0.62, z], alongX ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0], 8));
    for (const o of [-3.5, 3.5]) deco.push(box(0.3, 0.6, 0.3, black, [x + (alongX ? o : 0), 0.3, z + (alongX ? 0 : o)]));
  }
  bare.push({ x: -200, z: 90, r: 34 });

  // Mini-rampas curvas de 1,4 m
  for (const [x, z, ry] of [[-130, 50, 0.3], [-90, 40, -0.3], [-45, 60, Math.PI], [-250, 60, 0], [-250, 110, Math.PI]] as [number, number, number][]) {
    SOLID(strip("miniRampa", kicker(8, 30, 1.4).pts, 5, wood), x, z, ry);
    bare.push({ x, z, r: 8 });
  }

  // Megarrampa: kicker de 9 m (arco R 24 a 38°, sale a 38°), 9 m de hueco y mesa de aterrizaje (sube 1:6 a 5 m, meseta 8 m, baja a 20°). Ancho 12. Sale hacia el este.
  const mk = kicker(24, 38, 9), mx = -242, mz = 150, g0 = mk.len + 9;
  SOLID(strip("megarrampa", mk.pts, 12, red), mx, mz, Math.PI / 2);
  const land: P[] = [[g0, BUR], [g0 + 30, 5], [g0 + 38, 5], [g0 + 38 + 5 / Math.tan((20 * Math.PI) / 180), BUR]];
  SOLID(strip("aterrizaje", land, 12, concrete), mx, mz, Math.PI / 2);
  for (let i = 0; i < 8; i++) deco.push(box(1.5, 0.26, 1.5, i % 2 ? black : coping, [mx + mk.len - 0.8, 9.13, mz - 5.25 + i * 1.5])); // rayado de peligro en el labio de salida (único uso del rayado)
  bare.push({ x: mx + 45, z: mz, r: 50 });

  // Faroles (emisivos para la noche; sin luces dinámicas)
  const lamp = pbr("skateFarol", { color: "#fff3c0", rough: 0.3, emissive: "#ffd98a" });
  for (const [x, z] of [[-50, 28], [-255, 28], [-255, 255], [-30, 255]]) {
    deco.push(cyl(0.3, 0.4, 7, black, [x, 3.5, z]), sph(1.1, lamp, [x, 7.2, z]));
    hidden(stat(cyl(0.8, 0.8, 3, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.CYLINDER, {}, [x, 1.5, z]));
  }

  const d = merge("skateDeco", deco); d.isPickable = false; d.receiveShadows = true; shadows.addShadowCaster(d);
}

export const barrio: Barrio = { id: "skate", cx: -150, cz: 150, build };
