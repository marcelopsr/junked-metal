import * as B from "@babylonjs/core";
type V3 = [number, number, number];
import { box, cyl, merge, sph } from "../models";
import { M, canvasTex, pbr, shadows } from "../render";
import { HALF, bare, decal, floor, occluders, scene, stat } from "./common";
import { freeSpot, int, rocks, toyRamps } from "../world_layout";

// Bioma Nieve (docs/art_direction/visual_reference_register.md, «Kits por bioma»; ref33a, ref51, ref146): nieve con surcos de ruedas,
// borde de bloques rojo/blanco, cerco de madera y pinos nevados afuera. Lo decorativo usa un generador local de semilla fija (no toca rng()).
const SNOW = "#c4d2e4", SHADE = "#b9c8dc", RED = "#E53935", WHITE = "#FAFAFA", WOOD = "#8a5a34", PINE = "#2f5a3a";
const snowM = () => M.matte(SNOW), whiteM = () => M.matte("#d2deec");
const RX = 30, RZ = 26, ROAD_W = 14;
let seed = 20261014;
const lr = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// Camino: elipse deformada con ruido suave (generador fijo, no rng()). roadPt(a, off) = punto del eje a ángulo a, desplazado off por la normal.
const warp = (a: number) => 1 + 0.11 * Math.sin(2 * a + 0.6) + 0.06 * Math.sin(3 * a + 2.1) + 0.04 * Math.sin(5 * a + 1);
const base = (a: number): [number, number] => [Math.cos(a) * RX * warp(a), Math.sin(a) * RZ * warp(a)];
function roadPt(a: number, off = 0): [number, number] {
  const [x, z] = base(a), [x1, z1] = base(a + 0.002), [x0, z0] = base(a - 0.002), l = Math.hypot(x1 - x0, z1 - z0) || 1;
  return [x + ((z1 - z0) / l) * off, z - ((x1 - x0) / l) * off];
}
const ROAD: [number, number][] = Array.from({ length: 360 }, (_, i) => roadPt((i / 360) * 6.2832));
const roadDist = (x: number, z: number) => ROAD.reduce((m, [a, b]) => Math.min(m, Math.hypot(a - x, b - z)), 1e9);

// Surcos de neumáticos: pares de líneas azuladas en curvas amplias + derrapes cerca de la salida (decal translúcido, textura propia 1024 para no pasar por el tope de texturas).
function ruts() {
  const S = 110, N = 1024, k = N / S, t = new B.DynamicTexture("surcosTex", N, scene, true, B.Texture.TRILINEAR_SAMPLINGMODE), c = t.getContext() as unknown as CanvasRenderingContext2D;
  c.clearRect(0, 0, N, N); c.lineCap = "round";
  const P = (v: number) => (v + S / 2) * k;
  const lane = (pts: [number, number][], a: number) => {
    for (const o of [-0.8, 0.8]) {
      c.beginPath(); c.strokeStyle = `rgba(110,140,185,${a})`; c.lineWidth = 0.45 * k;
      pts.forEach(([x, z], i) => { const n = pts[Math.min(i + 1, pts.length - 1)], m = pts[Math.max(i - 1, 0)], dx = n[0] - m[0], dz = n[1] - m[1], l = Math.hypot(dx, dz) || 1; const px = P(x - (dz / l) * o), pz = P(z + (dx / l) * o); i ? c.lineTo(px, pz) : c.moveTo(px, pz); });
      c.stroke();
    }
  };
  const arc = (cx: number, cz: number, rx: number, rz: number, a0: number, a1: number, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + Math.cos(a) * rx, cz + Math.sin(a) * rz] as [number, number]; });
  for (let i = 0; i < 6; i++) { const r = 10 + i * 6 + lr() * 3, a0 = lr() * 6.3; lane(arc((lr() - 0.5) * 10, (lr() - 0.5) * 10, r, r * (0.7 + lr() * 0.3), a0, a0 + 2 + lr() * 3), 0.5 + lr() * 0.2); }
  for (let i = 0; i < 5; i++) { const z0 = -42 + i * 20 + lr() * 6; lane(arc(-5 + lr() * 10, z0, 30, 8 + lr() * 10, Math.PI * 0.9, Math.PI * 2.1, 30), 0.45 + lr() * 0.15); }
  for (let i = 0; i < 4; i++) lane(arc(0, 6, 5 + i * 2.5, 7 + i * 2.5, 3.6 + i * 0.1, 5.4 + i * 0.2, 20), 0.65); // derrapes junto a la salida
  for (let i = 0; i < 10; i++) { const x = (lr() - 0.5) * 90, z = (lr() - 0.5) * 90, a = lr() * 6.3; lane([[x, z], [x + Math.cos(a) * 10, z + Math.sin(a) * 10], [x + Math.cos(a + 0.4) * 20, z + Math.sin(a + 0.4) * 20]], 0.5); }
  ((): void => {
  // camino de nieve pisada gris azulada (#8d93a3), bordes suaves en dos pasadas, con surcos más oscuros (#5c6474) y huellas
  const trace = (off: number) => { c.beginPath(); for (let i = 0; i <= 360; i++) { const [x, z] = roadPt((i / 360) * 6.2832, off); i ? c.lineTo(P(x), P(z)) : c.moveTo(P(x), P(z)); } };
  c.lineJoin = "round";
  for (const [w, a] of [[ROAD_W + 3, 0.35], [ROAD_W, 0.92]]) { trace(0); c.strokeStyle = `rgba(141,147,163,${a})`; c.lineWidth = w * k; c.stroke(); }
  for (const o of [-4.2, -2.6, 2.6, 4.2]) { trace(o); c.strokeStyle = "rgba(92,100,116,0.55)"; c.lineWidth = 0.8 * k; c.stroke(); }
  c.fillStyle = "rgba(92,100,116,0.5)";
  for (let i = 0; i < 260; i++) { const a = (i / 260) * 6.2832, [x, z] = roadPt(a, (i % 2 ? 1 : -1) * (0.6 + lr() * 4.5)), [x1, z1] = roadPt(a + 0.01); c.beginPath(); c.ellipse(P(x), P(z), 0.55 * k, 0.28 * k, Math.atan2(z1 - roadPt(a - 0.01)[1], x1 - roadPt(a - 0.01)[0]), 0, 6.2832); c.fill(); }
  })(); // el camino va último: los surcos azules del campo no lo pintan encima
  t.update(); t.hasAlpha = true;
  const m = pbr("nieveSurcos", { color: "#ffffff", rough: 1, tex: t }) as B.PBRMaterial;
  if (m.albedoTexture !== t) t.dispose(); // pbr() devuelve el material cacheado con la textura de la primera vez: la nueva sobra
  m.useAlphaFromAlbedoTexture = true; m.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  const d = decal("surcos", S, S, 0, 0, m, 0.05); d.isPickable = false;
}

// Pino nevado: tronco + 3 pisos de cono verde, cada uno con gorro de nieve (cono blanco más chico y apenas más alto).
function pine(x: number, z: number, s: number, parts: B.Mesh[], col = PINE) {
  const g = M.matte(col), w = whiteM(), t = M.matte("#5b3d24");
  parts.push(cyl(0.7 * s, 0.9 * s, 2.2 * s, t, [x, 1.1 * s, z], undefined, 6));
  for (let i = 0; i < 3; i++) {
    const d = (5.6 - i * 1.5) * s, h = 3.6 * s, y = (2.2 + i * 2.3) * s + h / 2;
    parts.push(cyl(0, d, h, g, [x, y, z], undefined, 8), cyl(0, d * 0.82, h * 0.7, w, [x, y + h * 0.18, z], undefined, 8));
  }
  parts.push(cyl(0, 1.4 * s, 1.8 * s, w, [x, (2.2 + 6.9) * s + 0.8 * s, z], undefined, 8));
}

export function snowBuild() {
  // Nieve lisa (ref33a): base casi blanca con ondulaciones azuladas muy suaves; el contraste lo ponen los surcos y las sombras, no el grano.
  floor("nieveLisa", "#cbd7e8", () => canvasTex(512, (c, s) => {
    c.fillStyle = "#e6eef7"; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 220; i++) { const x = lr() * s, y = lr() * s, r = 8 + lr() * 22; for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) { const g = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); g.addColorStop(0, i % 3 ? "rgba(150,172,205,0.4)" : "rgba(255,255,255,0.3)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(x + ox - r, y + oy - r, r * 2, r * 2); } }
    for (let i = 0; i < 1500; i++) { c.fillStyle = i % 2 ? "rgba(255,255,255,0.5)" : "rgba(170,190,215,0.25)"; c.fillRect(lr() * s, lr() * s, 1 + lr() * 2, 1 + lr()); }
  }), 0.85, "concrete", 70);
  ruts();
  // Borde: bloques de plástico rojo/blanco con gorro de nieve cada tanto, alineados con los cuatro lados.
  const red = M.plastic(RED), wht = M.plastic(WHITE), cap = whiteM(), blocks: B.Mesh[] = [], fence: B.Mesh[] = [], trees: B.Mesh[] = [];
  const L = HALF * 2 + 4, BL = 4.4, N = Math.round(L / BL);
  for (let side = 0; side < 4; side++) {
    const horiz = side < 2, sgn = side % 2 ? 1 : -1, off = sgn * (HALF + 1.2);
    for (let i = 0; i < N; i++) {
      const u = -L / 2 + (i + 0.5) * (L / N), px = horiz ? u : off, pz = horiz ? off : u, ry: V3 | undefined = horiz ? undefined : [0, Math.PI / 2, 0];
      blocks.push(box(L / N - 0.25, 1.7, 1.8, i % 2 ? wht : red, [px, 0.85, pz], ry));
      if (lr() < 0.55) blocks.push(box((L / N) * 0.7, 0.5, 1.4, cap, [px + (horiz ? 0 : 0.0), 1.85, pz], ry));
    }
    // cerco de madera pegado por afuera: postes con gorro y dos travesaños
    const fo = sgn * (HALF + 3.6), P = 6;
    for (let u = -L / 2; u <= L / 2 + 0.1; u += P) {
      const px = horiz ? u : fo, pz = horiz ? fo : u;
      fence.push(box(0.7, 3.2, 0.7, M.matte(WOOD), [px, 1.6, pz]), box(0.9, 0.35, 0.9, cap, [px, 3.3, pz]));
      if (u < L / 2 - 0.1) for (const y of [1.0, 2.2]) fence.push(box(horiz ? P : 0.35, 0.5, horiz ? 0.35 : P, M.matte(WOOD), [px + (horiz ? P / 2 : 0), y, pz + (horiz ? 0 : P / 2)]));
    }
    // pinos afuera: dos hileras, escala variable
    for (let r = 0; r < 2; r++) for (let u = -L / 2 + 4; u < L / 2; u += 9 + lr() * 5) {
      const d = HALF + 14 + r * 14 + lr() * 8, s = 1.2 + lr() * 1.1;
      pine(horiz ? u + lr() * 3 : sgn * d, horiz ? sgn * d : u + lr() * 3, s, trees);
    }
  }
  for (const [n, parts] of [["nieveBordes", blocks], ["nieveCerco", fence], ["nievePinos", trees]] as const) { const m = merge(n, parts as B.Mesh[]); m.isPickable = false; shadows.addShadowCaster(m); occluders.push(m); }
}

// Montículo: casquete bajo de nieve con colisionador cilíndrico invisible (r útil 0,85 del visible).
function mound(x: number, z: number, r: number, h: number, parts: B.Mesh[], solid = true) {
  parts.push(sph(2, snowM(), [x, 0, z], [r, h / 1, r]));
  if (solid) { stat(cyl(r * 1.5, r * 1.7, h * 0.9, M.matte("#9E9E9E"), [0, 0, 0], undefined, 10), B.PhysicsShapeType.CYLINDER, {}, [x, h * 0.45, z]).isVisible = false; bare.push({ x, z, r: r + 2 }); }
}
const rockCap = (x: number, z: number, s: number, parts: B.Mesh[]) => {
  const r = B.MeshBuilder.CreatePolyhedron("nr", { type: 2, size: 1 }, scene); r.convertToFlatShadedMesh();
  r.material = M.matte("#8b8f95"); r.scaling.set(1.8 * s, 1.1 * s, 1.5 * s); r.position.set(x, 0.7 * s, z); r.rotation.y = lr() * 6;
  parts.push(r, sph(2, whiteM(), [x, 1.5 * s, z], [1.7 * s, 0.55 * s, 1.4 * s]));
  stat(box(2.6 * s, 1.8 * s, 2.4 * s, M.matte("#9E9E9E"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, 0.9 * s, z]).isVisible = false; bare.push({ x, z, r: 2.6 * s + 1.5 });
};
function snowman(x: number, z: number, parts: B.Mesh[]) {
  const w = whiteM(), k = M.matte("#1b1d22");
  parts.push(sph(4.2, w, [x, 1.9, z]), sph(3, w, [x, 4.6, z]), sph(2.1, w, [x, 6.7, z]),
    cyl(1.3, 1.5, 0.2, k, [x, 7.65, z], undefined, 10), cyl(1.1, 1.1, 1.1, k, [x, 8.2, z], undefined, 10),
    cyl(0, 0.4, 1.6, M.matte("#FB8C00"), [x, 6.7, z + 1.3], [Math.PI / 2, 0, 0], 6), box(2.4, 0.5, 2.4, M.plastic(RED), [x, 5.7, z]),
    sph(0.3, k, [x - 0.45, 6.95, z + 0.95]), sph(0.3, k, [x + 0.45, 6.95, z + 0.95]));
  for (const dy of [4.8, 4.2, 3.6]) parts.push(sph(0.35, k, [x, dy, z + 1.4]));
  stat(cyl(4, 4.4, 8, k, [0, 0, 0], undefined, 10), B.PhysicsShapeType.CYLINDER, {}, [x, 4, z]).isVisible = false; bare.push({ x, z, r: 6 });
}
function fenceBit(x: number, z: number, ry: number, parts: B.Mesh[]) {
  const wd = M.matte(WOOD), c = Math.cos(ry), s = Math.sin(ry), at = (u: number, y: number): V3 => [x + u * c, y, z - u * s];
  for (const u of [-5, 0, 5]) parts.push(box(0.7, 3, 0.7, wd, at(u, 1.5), [0, ry, 0]), box(0.9, 0.35, 0.9, whiteM(), at(u, 3.15), [0, ry, 0]));
  for (const y of [1, 2.1]) parts.push(box(10.4, 0.45, 0.3, wd, at(0, y), [0, ry, 0]));
  stat(box(10.4, 2.4, 0.9, M.matte("#9E9E9E"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, 1.2, z, ry]).isVisible = false; bare.push({ x, z, r: 6 });
}

export function snowLayout() {
  toyRamps(int(2, 4), [0, 1, 2]);
  rocks(int(8, 16));
  const deco: B.Mesh[] = [];
  // Arco de largada (a=π/2, ~26 u de la salida) y cobertizo pasable (a=0,8) sobre el camino: se reservan aquí y se arman al final.
  const AA = Math.PI / 2, SA = 0.8, spots: [number, number, number][] = [[...roadPt(AA), 11], [...roadPt(SA), 13]];
  for (const [x, z, r] of spots) bare.push({ x, z, r });
  const nearSpot = (x: number, z: number, m = 0) => spots.some(([sx, sz, sr]) => Math.hypot(x - sx, z - sz) < sr + m);
  // Huellas que los pinos no tapan: tribuna-mirador (-44,4) y lago (52,8), además del arco y el cobertizo.
  const noPine = (x: number, z: number) => Math.hypot(x + 44, z - 4) < 19 || Math.hypot(x - 52, z - 8) < 15 || nearSpot(x, z, 4);
  // Lago congelado chico (ref301/ref305): disco de hielo azul claro brillante, pasable (sin colisión), con aro de nieve.
  { const LX = 52, LZ = 8, ice = pbr("nieveHielo", { color: "#bfe3f5", rough: 0.1, metal: 0.3, emissive: "#4a6a85" }), crack = M.glow("#e8f6ff"), o = ((s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296))(8801);
    const d = B.MeshBuilder.CreateDisc("lagoHielo", { radius: 1, tessellation: 28 }, scene); d.rotation.x = Math.PI / 2; d.scaling.set(8.5, 6.5, 1); d.position.set(LX, 0.1, LZ); d.material = ice; deco.push(d);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.2832, k = 0.9 + o() * 0.2; deco.push(sph(2, whiteM(), [LX + Math.cos(a) * 8.8 * k, 0.1, LZ + Math.sin(a) * 6.8 * k], [1.5 + o(), 0.55 + o() * 0.3, 1.5 + o()])); }
    for (const [cx, cz, l, ry] of [[-2, 0.5, 5, 0.3], [1.5, -1.5, 4, -0.6], [2, 2, 3.4, 1.1]]) deco.push(box(l, 0.02, 0.09, crack, [LX + cx, 0.12, LZ + cz], [0, ry, 0]));
    bare.push({ x: LX, z: LZ, r: 11 });
  }
  // Tribuna-mirador de madera con techo nevado a ~46 u: deck a 4,5 u, gradas, baranda y escalera; colisión en las 4 patas (se pasa por debajo).
  { const TX = -44, TZ = 4, wd = M.matte(WOOD), wd2 = M.matte("#5a3a22"), roofS = M.glow("#c9d6e8") /* ponytail: emisivo como el techo de la cabaña */, ang = Math.atan2(4.5, 11);
    deco.push(box(7, 0.4, 12, wd, [TX, 4.5, TZ]), box(7.4, 0.3, 12.4, wd2, [TX, 4.2, TZ]));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      deco.push(box(0.9, 9.2, 0.9, wd2, [TX + sx * 3, 4.6, TZ + sz * 5.5]), box(1.3, 0.4, 1.3, whiteM(), [TX + sx * 3, 9.3, TZ + sz * 5.5]));
      stat(box(0.9, 4.6, 0.9, M.matte("#9E9E9E"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [TX + sx * 3, 2.3, TZ + sz * 5.5]).isVisible = false;
    }
    for (const sx of [-1, 1]) deco.push(box(0.3, 0.3, 11.5, wd, [TX + sx * 3, 2.2, TZ]), box(0.25, 0.25, Math.hypot(11, 4.5), wd, [TX + sx * 3, 2.3, TZ], [ang, 0, 0]), box(0.25, 0.25, Math.hypot(11, 4.5), wd, [TX + sx * 3, 2.3, TZ], [-ang, 0, 0]));
    for (const y of [5.2, 6.4, 7.6, 8.8]) deco.push(box(0.4, 1, 12, wd, [TX - 3, y, TZ])); // respaldo de tablones
    for (const [bx, by] of [[-1.7, 4.95], [-0.2, 4.75]]) deco.push(box(1.1, 0.35, 10.4, wd2, [TX + bx, by, TZ]));
    for (const u of [-5.5, -3.3, -1.1, 1.1, 3.3, 5.5]) deco.push(box(0.14, 1.2, 0.14, wd2, [TX + 3.3, 5.3, TZ + u])); // baranda del frente
    for (const y of [5.5, 6.0]) deco.push(box(0.1, 0.1, 11, wd2, [TX + 3.3, y, TZ]));
    for (const sg of [-1, 1]) deco.push(box(0.5, 0.35, 13.2, wd2, [TX + sg * 1.95, 9.55 + 0.0, TZ], [0, 0, sg * -0.5]), box(4.6, 0.6, 13.4, roofS, [TX + sg * 2.1, 10.0, TZ], [0, 0, sg * -0.5]));
    deco.push(box(1.1, 0.8, 13.4, roofS, [TX, 11.2, TZ]));
    const SN = 9; for (let k = 0; k < SN; k++) deco.push(box(2.4, 0.14, 0.8, wd, [TX + 0.4, 0.5 * (SN - k) - 0.07, TZ + 6.6 + k * 0.8])); // escalera por el extremo +z
    for (const sx of [-1, 1]) deco.push(box(0.12, 0.12, Math.hypot(7.2, 4.5), wd2, [TX + 0.4 + sx * 1.2, 2.9, TZ + 9.6], [Math.atan2(4.5, 7.2), 0, 0]));
    bare.push({ x: TX, z: TZ + 3, r: 12 });
  }
  // Bordillo continuo de bloques rojo/blanco bajos a ambos lados del camino (decorativo: sin colisión, el auto cruza sin trabarse)
  // bloques chicos (~3 u) con gorrito de nieve, repartidos por largo de arco sobre la curva real
  for (const side of [-1, 1]) {
    const pts = Array.from({ length: 720 }, (_, i) => roadPt((i / 720) * 6.2832, side * (ROAD_W / 2 + 0.6)));
    let acc = 0, n = 0;
    for (let i = 0; i < 720; i++) {
      const [x, z] = pts[i], [x1, z1] = pts[(i + 1) % 720];
      acc += Math.hypot(x1 - x, z1 - z);
      if (acc < 3.2) continue;
      acc = 0; const m = n++ % 2, ry = -Math.atan2(z1 - z, x1 - x);
      deco.push(box(3, 1, 1.4, M.plastic(m ? RED : WHITE), [x, 0.5, z], [0, ry, 0]));
      if (m) deco.push(box(2.4, 0.3, 1.1, whiteM(), [x, 1.12, z], [0, ry, 0]));
    }
  }
  // Cabañas de madera oscura con techo nevado y pinos en grupos a 30-60 u de la salida
  const snowTop = M.glow("#c9d6e8") /* ponytail: emisivo, la luz sola dejaba el techo gris (113 vs 175 del piso) */, logs = M.matte("#5a3a22"), glow = M.glow("#FFB74D");
  const cabin = (x: number, z: number, ry: number) => {
    const c = Math.cos(ry), s = Math.sin(ry), at = (u: number, y: number, v: number): V3 => [x + u * c + v * s, y, z - u * s + v * c];
    deco.push(box(10, 5, 7.5, logs, at(0, 2.5, 0), [0, ry, 0]), box(6.2, 0.35, 8.6, M.matte("#3f2a18"), at(-2.6, 5.6, 0), [0, ry, 0.5]), box(6.2, 0.35, 8.6, M.matte("#3f2a18"), at(2.6, 5.6, 0), [0, ry, -0.5]),
      box(7, 0.9, 9.4, snowTop, at(-2.95, 6.2, 0), [0, ry, 0.5]), box(7, 0.9, 9.4, snowTop, at(2.95, 6.2, 0), [0, ry, -0.5]), box(1.2, 0.8, 9.4, snowTop, at(0, 7.45, 0), [0, ry, 0]), box(1.8, 3.4, 1.8, M.matte("#7b7f86"), at(3, 7.6, 2), [0, ry, 0]), box(2.2, 0.6, 2.2, whiteM(), at(3, 9.4, 2), [0, ry, 0]),
      box(1.6, 1.6, 0.2, glow, at(-2.5, 2.8, 3.8), [0, ry, 0]), box(1.6, 1.6, 0.2, glow, at(2.5, 2.8, 3.8), [0, ry, 0]));
    stat(box(10, 6, 7.5, logs, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, 3, z, ry]).isVisible = false; bare.push({ x, z, r: 9 });
  };
  const grove: [number, number, number][] = [[-52, 30, 0.4], [48, -42, 2.2], [8, 58, 3.6]];
  grove.forEach(([x, z, ry]) => cabin(x, z, ry));
  const pines2: B.Mesh[] = [];
  for (const [gx, gz] of [[-40, 44], [-62, 20], [38, -56], [60, -28], [24, 52], [-8, 64], [-34, -48], [55, 40], [-58, -20]]) for (let i = 0; i < 4; i++) {
    const x = gx + (lr() - 0.5) * 16, z = gz + (lr() - 0.5) * 16, ps = 1 + lr() * 0.8; if (noPine(x, z)) continue; pine(x, z, ps, pines2);
    stat(cyl(2, 2.4, 3, M.matte("#9E9E9E"), [0, 0, 0]), B.PhysicsShapeType.CYLINDER, {}, [x, 1.5, z]).isVisible = false; bare.push({ x, z, r: 4 });
  }
  if (pines2.length) { const m = merge("nievePinares", pines2); m.isPickable = false; shadows.addShadowCaster(m); }
  for (let i = 0, n = int(8, 12); i < n; i++) { const p = freeSpot(8), r = 3 + lr() * 4, h = 1 + lr() * 1.3; if (p && roadDist(p[0], p[1]) > ROAD_W / 2 + 3 + r) mound(p[0], p[1], r, h, deco); }
  for (let i = 0, n = int(5, 8); i < n; i++) { const p = freeSpot(5); if (p) rockCap(p[0], p[1], 1 + lr() * 0.9, deco); }
  for (let i = 0, n = int(2, 3); i < n; i++) { const p = freeSpot(7); if (p) snowman(p[0], p[1], deco); }
  for (let i = 0, n = int(4, 6); i < n; i++) { const p = freeSpot(7); if (p) fenceBit(p[0], p[1], lr() * 3.14, deco); }
  // Anillo cercano a la salida (8-26 u), posiciones fijas: bloques rojo/blanco sueltos y montículos chicos para que siempre haya algo en cuadro.
  const NEAR: [number, number][] = [[-12, 14], [11, 13], [0, 23], [-21, 19], [20, 18], [-24, 5], [23, 4], [-8, 24], [14, 24], [-14, -12], [16, -11]];
  NEAR.forEach(([x, z], k) => {
    if (roadDist(x, z) < ROAD_W / 2 + 6 || nearSpot(x, z)) return; // no sobre el bordillo del camino
    const ry = k * 0.9;
    if (k % 3 === 0) mound(x, z, 2.2, 0.7, deco, false);
    else { deco.push(box(2.6, 1.3, 1.3, M.plastic(k % 2 ? RED : WHITE), [x, 0.65, z], [0, ry, 0]), box(2.6, 1.3, 1.3, M.plastic(k % 2 ? WHITE : RED), [x + Math.cos(ry) * 2.7, 0.65, z - Math.sin(ry) * 2.7], [0, ry, 0]), sph(2, whiteM(), [x, 1.3, z], [1.3, 0.3, 0.7])); stat(box(5.3, 1.2, 1.4, M.matte("#9E9E9E"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x + Math.cos(ry) * 1.35, 0.6, z - Math.sin(ry) * 1.35, ry]).isVisible = false; bare.push({ x, z, r: 4 }); }
  });
  // Contraste por composición: pinos verde oscuro densos a 4-12 u del borde (con colisionador), cerco oscuro y barreras chevron en las curvas. Generador propio (no toca lr() ni rng()).
  let s2 = 77; const r2 = () => { s2 = (s2 * 1664525 + 1013904223) >>> 0; return s2 / 4294967296; };
  const dark: B.Mesh[] = [], solid = M.matte("#9E9E9E"), fenceW = M.matte("#4a2e1a");
  const piece = (x: number, z: number, w: number, h: number, ry: number) => { stat(box(w, h, 0.9, solid, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, h / 2, z, ry]).isVisible = false; bare.push({ x, z, r: w / 2 + 1 }); };
  for (let a = 0; a < 6.2832; a += 0.07) for (const side of [1, -1]) {
    if (r2() < (side > 0 ? 0.25 : 0.7)) continue;
    const off = side * (ROAD_W / 2 + 4 + r2() * (side > 0 ? 8 : 3)), [x, z] = roadPt(a + (r2() - 0.5) * 0.04, off);
    if (grove.some(([cx, cz]) => Math.hypot(x - cx, z - cz) < 14) || Math.hypot(x, z) < 22 || nearSpot(x, z, 3) || noPine(x, z)) continue;
    pine(x, z, (side > 0 ? 0.9 : 0.7) + r2() * 0.5, dark, "#1f3d26");
    stat(cyl(2, 2.4, 3, solid, [0, 0, 0]), B.PhysicsShapeType.CYLINDER, {}, [x, 1.5, z]).isVisible = false; bare.push({ x, z, r: 4 });
  }
  const chev = pbr("nieveChevron", { color: "#ffffff", rough: 0.9, tex: canvasTex(256, (c, sz) => { c.fillStyle = "#FAFAFA"; c.fillRect(0, 0, sz, sz); c.fillStyle = RED; for (let i = -2; i < 6; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64 + 32, 0); c.lineTo(i * 64 + 32 + 96, sz); c.lineTo(i * 64 + 96, sz); c.fill(); } }) });
  const hdg = (a: number) => { const [x0, z0] = roadPt(a - 0.04), [x1, z1] = roadPt(a + 0.04); return Math.atan2(z1 - z0, x1 - x0); };
  const wrap = (d: number) => Math.atan2(Math.sin(d), Math.cos(d));
  let last = -9;
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * 6.2832, k = Math.abs(wrap(hdg(a + 0.1) - hdg(a - 0.1)));
    if (k < 0.22 || i - last < 3 || nearSpot(...roadPt(a), 6)) continue;
    last = i;
    const [ox, oz] = roadPt(a, 1), [ix, iz] = roadPt(a, -1), side = Math.hypot(ox, oz) > Math.hypot(ix, iz) ? 1 : -1, ry = -hdg(a);
    const [x, z] = roadPt(a, side * (ROAD_W / 2 + 2.4)), [x2, z2] = roadPt(a, side * (ROAD_W / 2 + 5));
    for (const u of [-3.4, 0, 3.4]) dark.push(box(0.6, 2.8, 0.6, fenceW, [x + Math.cos(ry) * u, 1.4, z - Math.sin(ry) * u], [0, ry, 0]));
    for (const y of [1, 2.1]) dark.push(box(7.2, 0.4, 0.3, fenceW, [x, y, z], [0, ry, 0]));
    piece(x, z, 7.2, 2.4, ry);
    dark.push(box(6.4, 1.5, 0.4, chev, [x2, 0.95, z2], [0, ry, 0]), box(6.4, 0.25, 0.8, whiteM(), [x2, 1.8, z2], [0, ry, 0])); piece(x2, z2, 6.4, 1.8, ry);
  }
  // rocas oscuras semienterradas con gorro de nieve, a ambos lados del camino
  for (let a = 0.03; a < 6.2832; a += 0.3) {
    const side = r2() < 0.5 ? 1 : -1, [x, z] = roadPt(a, side * (ROAD_W / 2 + 2.2 + r2() * 4)), sz = 0.45 + r2() * 0.4;
    if (grove.some(([cx, cz]) => Math.hypot(x - cx, z - cz) < 12) || Math.hypot(x, z) < 14 || nearSpot(x, z, 2)) continue;
    const q = B.MeshBuilder.CreatePolyhedron("nr", { type: 2, size: 1 }, scene); q.convertToFlatShadedMesh();
    q.material = M.matte("#3a3a42"); q.scaling.set(1.8 * sz, 1.2 * sz, 1.5 * sz); q.position.set(x, 0.3 * sz, z); q.rotation.y = r2() * 6;
    dark.push(q, sph(2, whiteM(), [x, 1.05 * sz, z], [1.3 * sz, 0.4 * sz, 1.1 * sz]));
    stat(box(2.4 * sz, 1.6 * sz, 2.2 * sz, solid, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, 0.8 * sz, z]).isVisible = false; bare.push({ x, z, r: 2.5 * sz + 1 });
  }
  if (dark.length) { const m = merge("nieveOscuros", dark); m.isPickable = false; shadows.addShadowCaster(m); }
  // pinitos entre medio del campo, bajos
  const pines: B.Mesh[] = [];
  for (let i = 0, n = int(6, 10); i < n; i++) { const p = freeSpot(5, 14); if (!p) continue; pine(p[0], p[1], 0.8 + lr() * 0.4, pines); stat(cyl(2, 2.4, 3, M.matte("#9E9E9E"), [0, 0, 0]), B.PhysicsShapeType.CYLINDER, {}, [p[0], 1.5, p[1]]).isVisible = false; bare.push({ x: p[0], z: p[1], r: 5 }); }
  // Arco de postes rojo/blanco con banderín de lona y gorros de nieve (ref273): pilares a ±9,2 del eje (hueco libre ~16 u, 12 u de alto), solo ellos chocan.
  const gate = (a: number) => { const [x, z] = roadPt(a), ry = -hdg(a), c = Math.cos(ry), s = Math.sin(ry); return { x, z, ry, at: (u: number, y: number, v: number): V3 => [x + u * c + v * s, y, z - u * s + v * c] }; };
  const solidM = M.matte("#9E9E9E"), pole = (g: ReturnType<typeof gate>, u: number, v: number, h: number, w: number, col: B.Material[]) => { for (let y = 0; y < h; y += 1.5) deco.push(box(w, Math.min(1.5, h - y), w, col[(y / 1.5) % 2], g.at(u, y + Math.min(1.5, h - y) / 2, v), [0, g.ry, 0])); };
  const top: B.Mesh[] = []; // lo que cuelga sobre el camino: se oculta solo mientras tapa al auto (occluders)
  { const g = gate(AA), flag = M.plastic(RED), stripes = [M.plastic(RED), M.plastic(WHITE)], R: V3 = [0, g.ry, 0];
    for (const sg of [-1, 1]) {
      const v = sg * 9.2;
      pole(g, 0, v, 12, 1.6, stripes);
      deco.push(sph(2, whiteM(), g.at(0, 12.1, v), [1.1, 0.55, 1.1]), cyl(0.15, 0.15, 2.4, M.matte("#3a3a42"), g.at(0, 13.2, v), undefined, 6), box(0.1, 1.1, 2.2, flag, g.at(0, 13.6, v + sg * 1.1), R));
      stat(box(1.8, 12, 1.8, solidM, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [...g.at(0, 6, v), g.ry]).isVisible = false;
    }
    for (let k = 0; k < 8; k++) top.push(box(1.5, 1.5, 2.45, stripes[k % 2], g.at(0, 12.8, -9.8 + (k + 0.5) * 2.45), R));
    for (const q of [-5, 5]) top.push(sph(2, whiteM(), g.at(0, 13.9, q), [2.4, 0.5, 2.4]));
    top.push(box(0.12, 3.4, 13.6, M.matte("#f3efe6"), g.at(0, 10.3, 0), R), box(0.16, 0.9, 13.6, flag, g.at(0, 11.4, 0), R), box(0.16, 0.5, 13.6, flag, g.at(0, 9.3, 0), R));
    for (let k = 0; k < 6; k++) top.push(cyl(0, 1.6, 1.5, stripes[k % 2], g.at(0, 8.4, -5.5 + k * 2.2), [0, g.ry, Math.PI], 3)); // gallardete de banderines
  }
  // Cobertizo de madera pasable (techo a dos aguas con nieve): 3 pares de postes a ±9,2, vigas de amarre a 6,6 u. Hueco libre ~16 x 6,6 u.
  { const g = gate(SA), wd = M.matte(WOOD), wd2 = M.matte("#5a3a22"), snowTop = M.glow("#c9d6e8") /* ponytail: emisivo como en la cabaña */, T = 0.42;
    for (const u of [-5, 0, 5]) {
      for (const sg of [-1, 1]) { const v = sg * 9.2; deco.push(box(1.1, 7.4, 1.1, wd, g.at(u, 3.7, v), [0, g.ry, 0]), box(1.7, 0.5, 1.7, whiteM(), g.at(u, 7.6, v), [0, g.ry, 0])); stat(box(1.1, 7.4, 1.1, solidM, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [...g.at(u, 3.7, v), g.ry]).isVisible = false; }
      top.push(box(0.6, 0.55, 19.4, wd2, g.at(u, 6.9, 0), [0, g.ry, 0]));
    }
    for (const sg of [-1, 1]) top.push(box(12.8, 0.45, 11.4, wd2, g.at(0, 8.5, sg * 5.2), [sg * T, g.ry, 0]), box(12.2, 0.6, 10.6, snowTop, g.at(0, 8.95, sg * 5.2), [sg * T, g.ry, 0]));
    top.push(box(12.2, 0.9, 1.4, snowTop, g.at(0, 10.5, 0), [0, g.ry, 0]));
  }
  if (top.length) { const m = merge("nieveTecho", top); m.isPickable = false; shadows.addShadowCaster(m); occluders.push(m); }
  for (const [n, parts] of [["nieveProps", deco], ["nievePinitos", pines]] as const) if (parts.length) { const m = merge(n, parts); m.isPickable = false; shadows.addShadowCaster(m); }
}
