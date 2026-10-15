import * as B from "@babylonjs/core";
import { box, cyl, merge, sph } from "../models";
import { M, canvasTex, shadows } from "../render";
import { HALF, bare, decal, floor, occluders, scene, stat } from "./common";
import { clear, int, rocks, toyRamps } from "../world_layout";

// Bioma Bosque (docs/art_direction/visual_reference_register.md, «Kits por bioma»; ref143/ref38/ref28a): suelo de tierra con agujas de pino,
// borde de pista de rocas con musgo y troncos, pinos de juguete afuera y al fondo, matas y tocones bajos alrededor del auto.
// Todo lo decorativo usa un generador local de semilla fija: no toca la secuencia rng() de la partida.
const rnd = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

const PINE = ["#2f5a2a", "#3f7a32", "#35682d"], MOSS = "#5a7a30", TRUNK = "#6b4428", ROCK = ["#6e6e66", "#5f6058", "#7c7a6c"];

// Tierra rojiza con agujas de pino (trazos finos naranja/marrón) y guijarros: 512 px, mosaico por macro 14 u.
const dirtTex = () => canvasTex(512, (c, s) => {
  const r = rnd(53);
  c.fillStyle = "#4e3828"; c.fillRect(0, 0, s, s);
  for (let i = 0; i < 70; i++) { c.fillStyle = ["#3a2c1e", "#4a5a2a", "#6b5238", "#2f3a1e"][i % 4]; c.globalAlpha = 0.3 + r() * 0.3; c.beginPath(); c.ellipse(r() * s, r() * s, 14 + r() * 40, 10 + r() * 30, r() * 3, 0, 6.3); c.fill(); } // manchas de humus y musgo
  for (let i = 0; i < 6000; i++) { c.fillStyle = ["#4a3624", "#7a5a3a", "#3a2a1c", "#5e4228"][i % 4]; c.globalAlpha = 0.25 + r() * 0.35; c.fillRect(r() * s, r() * s, 2 + r() * 4, 2 + r() * 4); }
  c.lineCap = "round";
  for (let i = 0; i < 2600; i++) { // agujas: trazos de 6-14 px, cualquier ángulo, se repiten en el borde para que el mosaico cierre
    const x = r() * s, y = r() * s, a = r() * 6.3, l = 6 + r() * 8;
    c.strokeStyle = ["#a0683a", "#8a5428", "#b07a40", "#4a3020"][i % 4]; c.globalAlpha = 0.5 + r() * 0.35; c.lineWidth = 1 + r();
    for (const [ox, oy] of [[0, 0], [s, 0], [-s, 0], [0, s], [0, -s]]) { c.beginPath(); c.moveTo(x + ox, y + oy); c.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); c.stroke(); }
  }
  c.globalAlpha = 1;
});

// Roca facetada (icosaedro aplastado) con casquete de musgo en la cima. pos = base en el suelo.
function rock(r: () => number, x: number, z: number, s: number, ry: number): B.Mesh[] {
  const sx = s * (1.2 + r() * 0.8), sy = s * (0.8 + r() * 0.7), sz = s * (1.2 + r() * 0.8);
  const m = B.MeshBuilder.CreatePolyhedron("p", { type: 2, size: 1 }, scene); m.convertToFlatShadedMesh();
  m.material = M.matte(ROCK[Math.floor(r() * 3)]); m.scaling.set(sx, sy, sz); m.rotation.set(0, ry, 0); m.position.set(x, sy * 0.45, z);
  const cap = B.MeshBuilder.CreatePolyhedron("p", { type: 2, size: 1 }, scene); cap.convertToFlatShadedMesh();
  cap.material = M.matte(MOSS); cap.scaling.set(sx * 0.85, sy * 0.4, sz * 0.85); cap.rotation.set(0, ry + 1, 0); cap.position.set(x, sy * 0.95, z);
  return [m, cap];
}

// Tronco horizontal con tapas claras de anillos; len en u, eje a lo largo de X local rotado ry.
function log(x: number, z: number, len: number, rad: number, ry: number, y = rad): B.Mesh[] {
  const bark = M.matte(TRUNK), ring = M.matte("#c89a62"), dx = Math.cos(ry) * len / 2, dz = -Math.sin(ry) * len / 2;
  return [
    cyl(rad * 2, rad * 2, len, bark, [x, y, z], [Math.PI / 2, ry + Math.PI / 2, 0], 8),
    cyl(rad * 1.7, rad * 1.7, 0.05, ring, [x + dx * 1.02, y, z + dz * 1.02], [Math.PI / 2, ry + Math.PI / 2, 0], 8),
    cyl(rad * 1.7, rad * 1.7, 0.05, ring, [x - dx * 1.02, y, z - dz * 1.02], [Math.PI / 2, ry + Math.PI / 2, 0], 8),
    box(len * 0.5, rad * 0.35, rad * 1.1, M.matte(MOSS), [x, y + rad * 0.95, z], [0, ry, 0]), // franja de musgo encima
  ];
}

// Pino de juguete: tronco corto y 4 pisos de cono quebrados (inclinados, achatados y corridos), verdes alternados. h = altura total.
// El quiebre sale de un hash de (x, z, piso): no consume r(), así el resto del layout queda igual.
function pine(r: () => number, x: number, z: number, h: number): B.Mesh[] {
  const out: B.Mesh[] = [cyl(h * 0.05, h * 0.07, h * 0.22, M.matte(TRUNK), [x, h * 0.11, z], undefined, 6)], n = 4;
  const hs = (i: number, k: number) => { const v = Math.sin(x * 12.9898 + z * 78.233 + i * 37.719 + k * 4.581) * 43758.5453; return v - Math.floor(v) - 0.5; };
  for (let i = 0; i < n; i++) {
    const t = i / n, w = h * (0.34 - t * 0.2), ph = h * 0.36;
    const m = cyl(0.02, w, ph, M.matte(PINE[(i + Math.floor(r() * 3)) % 3]), [x + hs(i, 0) * w * 0.25, h * (0.2 + t * 0.62) + ph / 2 - 0.1, z + hs(i, 1) * w * 0.25], [hs(i, 2) * 0.3, r() * 6, hs(i, 3) * 0.3], 8);
    m.scaling.set(0.85 + (hs(i, 4) + 0.5) * 0.4, 1 + hs(i, 5) * 0.25, 0.85 + (hs(i, 6) + 0.5) * 0.4);
    out.push(m);
  }
  return out;
}

// Hongo rojo con puntos blancos. s = escala (alto total ~1,5 s).
function mush(x: number, z: number, s: number): B.Mesh[] {
  const red = M.matte("#d03a2a"), wh = M.matte("#f1ead8");
  const out = [cyl(0.35 * s, 0.45 * s, 0.8 * s, wh, [x, 0.4 * s, z], undefined, 6), cyl(0.1 * s, 1.5 * s, 0.7 * s, red, [x, 1.15 * s, z], undefined, 8)];
  for (let i = 0; i < 4; i++) { const a = i * 1.6 + x; out.push(sph(0.32 * s, wh, [x + Math.cos(a) * 0.55 * s, 1.0 * s, z + Math.sin(a) * 0.55 * s], [1, 0.5, 1], 4)); }
  return out;
}

// Camino de tierra apisonada: curva amplia que cruza la salida (0,0). [x, z] del eje en función de z.
const PX = (z: number) => 16 * Math.sin(z / 24);
const PAT = (z: number): [number, number] => { const dx = (16 / 24) * Math.cos(z / 24), l = Math.hypot(dx, 1); return [dx / l, 1 / l]; }; // tangente unitaria
const pathTex = () => { const S = 1024, W = 160; return canvasTex(S, (c, s) => {
  const P = (x: number, z: number) => [((x + W / 2) / W) * s, s - ((z + W / 2) / W) * s] as const, r = rnd(91);
  c.lineCap = "round"; c.lineJoin = "round";
  const stroke = (w: number, col: string, a: number, off = 0) => { c.beginPath(); c.strokeStyle = col; c.globalAlpha = a; c.lineWidth = (w / W) * s; for (let z = -W / 2; z <= W / 2; z += 2) { const [tx, tz] = PAT(z), [px, py] = P(PX(z) - tz * off, z + tx * off); z === -W / 2 ? c.moveTo(px, py) : c.lineTo(px, py); } c.stroke(); };
  stroke(17, "#b8875a", 0.35); stroke(15.5, "#b8875a", 0.6); stroke(14, "#b8875a", 1); // borde suave y cuerpo: tierra apisonada CLARA (ref143); oscura se perdía contra el suelo
  stroke(1.4, "#3e2716", 0.55, -3); stroke(1.4, "#3e2716", 0.55, 3); // huellas de rodado
  for (let i = 0; i < 2500; i++) { const z = (r() - 0.5) * 150, [px, py] = P(PX(z) + (r() - 0.5) * 13, z); c.fillStyle = ["#6c4a2c", "#4a2e1a", "#7a5535"][i % 3]; c.globalAlpha = 0.4; c.fillRect(px, py, 2 + r() * 4, 2 + r() * 4); } // grava y polvo
  c.globalAlpha = 1;
}); };

// Mata de helecho: 5 conos verdes planos y abiertos.
function fern(r: () => number, x: number, z: number, s: number): B.Mesh[] {
  const g = M.matte(r() < 0.5 ? "#2f5a2a" : r() < 0.5 ? "#3f7a32" : "#4a8a2a");
  return Array.from({ length: 5 }, (_, i) => { const a = i * 1.26 + r(), l = s * (0.7 + r() * 0.5); return cyl(0.05, s * 0.22, l, g, [x + Math.cos(a) * s * 0.35, l * 0.4, z + Math.sin(a) * s * 0.35], [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9], 4); });
}

export function forestBuild() {
  floor("r53-bosque", "#ffffff", () => { const x = dirtTex(); x.wrapU = x.wrapV = B.Texture.WRAP_ADDRESSMODE; return x; }, 0.95, "concrete", 14);
  const r = rnd(1403), edge: B.Mesh[] = [], trees: B.Mesh[] = [];
  // Borde perimetral: rocas musgosas y troncos alternados, un poco irregulares, cada ~4,5 u; muro invisible-liviano detrás (oclusor) para tapar el horizonte.
  for (let side = 0; side < 4; side++) for (let k = -HALF; k <= HALF; k += 4.5) {
    const j = (r() - 0.5) * 1.5, o = (side < 2 ? 1 : -1) * (HALF + 1 + j), x = side % 2 ? k : o, z = side % 2 ? o : k, along = side % 2 ? 0 : Math.PI / 2;
    if (r() < 0.55) edge.push(...rock(r, x, z, 1.6 + r() * 1.4, r() * 6));
    else edge.push(...log(x, z, 4.2, 0.9, along + (r() - 0.5) * 0.3, 0.9 + (r() < 0.4 ? 0.8 : 0))); // algunos troncos apilados
    if (r() < 0.4) edge.push(...fern(r, x + (r() - 0.5) * 3, z + (r() - 0.5) * 3, 1.6));
  }
  // Pinos del lado de afuera: dos filas escalonadas, altos para dar escala (14-30 u).
  for (let row = 0; row < 2; row++) for (let k = -HALF - 6; k <= HALF + 6; k += 7 + row * 2) for (const side of [0, 1, 2, 3]) {
    const off = HALF + 6 + row * 9 + r() * 4, p = k + (r() - 0.5) * 3, h = 16 + r() * 14 + row * 4;
    trees.push(...pine(r, side === 0 ? off : side === 2 ? -off : p, side === 1 ? off : side === 3 ? -off : p, h));
  }
  const m = merge("forestEdge", edge), t = merge("forestPines", trees);
  for (const q of [m, t]) { q.isPickable = false; shadows.addShadowCaster(q); }
  // Camino de tierra oscura (decal), bloques rojo/blanco bajos y neumáticos sueltos (decorativos, sin colisión), arco de troncos con faroles y tronco-túnel.
  const pt = pathTex(); // material propio (matte() cachea por color)
  const pmat = new B.PBRMaterial("bosquePath", scene); pmat.albedoTexture = pt; pt.hasAlpha = true; pmat.useAlphaFromAlbedoTexture = true; pmat.transparencyMode = B.Material.MATERIAL_ALPHABLEND; pmat.roughness = 1; pmat.metallic = 0;
  decal("bosquePath", 160, 160, 0, 0, pmat, 0.04).isPickable = false;
  const kit: B.Mesh[] = [], red = M.matte("#c0322a"), white = M.matte("#e8e4d8"), tire = M.matte("#1c1c1e"), wood = M.matte(TRUNK), moss = M.matte(MOSS), dark = M.matte("#2a2a2e");
  const normal = (z: number): [number, number] => { const [tx, tz] = PAT(z); return [-tz, tx]; };
  const keep = (x: number, z: number) => Math.hypot(x - 15.2, z - 30) > 11 && Math.hypot(x - (PX(-34) + normal(-34)[0] * 20), z - (-34 + normal(-34)[1] * 20)) > 12; // fuera del arco y del túnel
  let bi = 0;
  for (let z = -76; z <= 76; z += 3.4, bi++) for (const sd of [-1, 1]) {
    const [nx, nz] = normal(z), [tx, tz] = PAT(z);
    const px = PX(z) + nx * sd * 8.2, pz = z + nz * sd * 8.2;
    if (!keep(px, pz)) continue;
    kit.push(box(2.6, 0.8, 1, (bi + (sd > 0 ? 1 : 0)) % 2 ? red : white, [px, 0.4, pz], [0, Math.atan2(-tz, tx), 0]));
    if (bi % 3 === 1 && sd > 0 || bi % 4 === 2 && sd < 0) { const n = 2 + (bi % 2), q = sd * 10.2; for (let k = 0; k < n; k++) { const t = B.MeshBuilder.CreateTorus("p", { diameter: 1.8, thickness: 0.7, tessellation: 12 }, scene); t.material = tire; t.position.set(PX(z) + nx * q + (k % 2) * 0.15, 0.36 + k * 0.62, z + nz * q); kit.push(t); } }
  }
  for (let z = -74; z <= 74; z += 14) bare.push({ x: PX(z), z, r: 10 });
  // Arco de troncos con dos faroles emisivos, sobre el camino a z=30.
  { const ax = PX(30), [nx, nz] = normal(30), ry = Math.atan2(-nz, nx), glow = M.glow("#ffcf8a");
    for (const sd of [-1, 1]) {
      const px = ax + nx * sd * 5.5, pz = 30 + nz * sd * 5.5, lx = ax + nx * sd * 4, lz = 30 + nz * sd * 4;
      kit.push(cyl(1.7, 2.1, 8.4, wood, [px, 4.2, pz], undefined, 8), box(1.5, 0.35, 1.5, moss, [px, 8.5, pz]));
      kit.push(cyl(0.1, 0.1, 2.3, dark, [lx, 6.9, lz], undefined, 6), box(1.1, 0.2, 1.1, dark, [lx, 5.95, lz]), box(0.85, 1.2, 0.85, glow, [lx, 5.25, lz]), box(1.1, 0.2, 1.1, dark, [lx, 4.55, lz]));
      kit.push(...mush(px + nz * 1.6, pz - nx * 1.6, 0.9), ...mush(px - nx * sd * 1.9, pz - nz * sd * 1.9, 0.6), ...mush(px + nx * sd * 1.6 - nz, pz + nz * sd * 1.6 + nx, 0.7));
      stat(cyl(1.8, 2.2, 8, wood, [0, 0, 0]), B.PhysicsShapeType.CYLINDER, {}, [px, 4, pz]).isVisible = false;
    }
    kit.push(...log(ax, 30, 13.5, 0.9, ry, 8.6));
    bare.push({ x: ax, z: 30, r: 9 });
  }
  // Tronco hueco tipo túnel: media caña de tablones (pasable), colisionadores solo en las dos paredes. Eje paralelo al camino, 20 u al costado.
  { const [nx, nz] = normal(-34), [tx, tz] = PAT(-34), cx = PX(-34) + nx * 20, cz = -34 + nz * 20, ry = Math.atan2(-tz, tx), R = 3.2, N = 11, len = 12, sy = Math.sin(ry), cy = Math.cos(ry);
    const at = (lx: number, lz: number): [number, number] => [cx + lx * cy + lz * sy, cz - lx * sy + lz * cy];
    for (let i = 0; i < N; i++) { const th = 0.1 + (i / (N - 1)) * (Math.PI - 0.2), [px, pz] = at(0, R * Math.cos(th)); kit.push(box(len, 0.8, 1.2, i % 2 ? wood : M.matte("#7a4e2c"), [px, R * Math.sin(th) + 0.1, pz], [Math.PI / 2 - th, ry, 0])); }
    for (const e of [-1, 1]) { const [mx, mz] = at(e * (len / 2 + 0.2), 0); kit.push(box(0.4, 0.3, R * 1.4, moss, [mx, R + 0.5, mz], [0, ry, 0])); }
    const [mx, mz] = at(0, 0); kit.push(box(len * 0.6, 0.35, 1.5, moss, [mx, R + 0.7, mz], [0, ry, 0]));
    for (const sd of [-1, 1]) { const [wx, wz] = at(0, sd * (R - 0.3)); stat(box(len, 3.4, 0.9, M.matte("#9E9E9E"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [wx, 1.7, wz, ry]).isVisible = false; }
    for (const [lx, lz, s] of [[len / 2 + 1.3, 3.8, 0.9], [len / 2 + 2, -3.4, 0.7], [-len / 2 - 1.4, 3.6, 0.8], [-len / 2 - 1.8, -3.9, 1], [len / 2 + 2.6, 4.9, 0.6], [-len / 2 - 2.6, -3, 0.65]] as [number, number, number][]) { const [px, pz] = at(lx, lz); kit.push(...mush(px, pz, s)); }
    bare.push({ x: cx, z: cz, r: 10 });
  }
  { const km = merge("forestKit", kit); km.isPickable = false; shadows.addShadowCaster(km); }
  // Fondo: barrera baja de roca-musgo continua detrás del borde, como oclusor (la cámara alta no ve el exterior del suelo).
  const back = M.matte("#4a6b2e");
  for (const [x, z, w, d] of [[0, -HALF - 5, HALF * 2 + 14, 4], [HALF + 5, 0, 4, HALF * 2 + 14], [-HALF - 5, 0, 4, HALF * 2 + 14], [0, HALF + 5, HALF * 2 + 14, 4]]) occluders.push(merge("forestWall", [box(w, 3, d, back, [x, 1.5, z])]));
}

export function forestLayout() {
  toyRamps(int(2, 4), [0, 1, 2]);
  rocks(int(8, 16));
  const r = rnd(2209), deco: B.Mesh[] = [], ferns: B.Mesh[] = [];
  // Props con colisión repartidos con la misma regla de espacio libre (salida (0,0) despejada), pero con generador local.
  const spot = (rad: number, mn: number, mx: number): [number, number] | null => {
    for (let i = 0; i < 40; i++) { const a = r() * 6.3, d = mn + r() * (mx - mn), x = Math.cos(a) * d, z = Math.sin(a) * d; if (clear(x, z, rad, 10)) return [x, z]; }
    return null;
  };
  const hit = (x: number, z: number, w: number, h: number, d: number, ry: number, rad: number) => {
    stat(box(w, h, d, M.matte("#9E9E9E"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, h / 2, z, ry]).isVisible = false;
    bare.push({ x, z, r: rad });
  };
  for (let i = 0; i < 16; i++) { const p = spot(4, 22, 70); if (!p) continue; const ry = r() * 6.3, big = i % 3 === 0; // troncos caídos (algunos gruesos)
    deco.push(...log(p[0], p[1], big ? 12 : 8, big ? 1.6 : 1, ry, big ? 1.6 : 1)); hit(p[0], p[1], big ? 12 : 8, big ? 3.2 : 2, big ? 3.2 : 2, ry + Math.PI / 2 * 0, big ? 7 : 5); }
  for (let i = 0; i < 22; i++) { const p = spot(4, 20, 70); if (!p) continue; // cúmulos de rocas musgosas
    for (let k = 0; k < 3; k++) deco.push(...rock(r, p[0] + (r() - 0.5) * 5, p[1] + (r() - 0.5) * 5, 1.2 + r() * 1.6, r() * 6));
    hit(p[0], p[1], 5.5, 2.5, 5.5, 0, 5); }
  for (let i = 0; i < 14; i++) { const p = spot(3, 20, 70); if (!p) continue; // tocones
    const s = 1 + r() * 0.8; deco.push(cyl(s * 1.6, s * 2.1, s * 1.8, M.matte(TRUNK), [p[0], s * 0.9, p[1]], undefined, 8), cyl(s * 1.45, s * 1.45, 0.06, M.matte("#c89a62"), [p[0], s * 1.82, p[1]], undefined, 8), ...fern(r, p[0] + s * 2, p[1], 1.4));
    hit(p[0], p[1], s * 2, s * 1.8, s * 2, 0, 3.5); }
  for (let i = 0; i < 22; i++) { const p = spot(5, 32, 120); if (!p) continue; // pinos del fondo: obstáculos altos con tronco macizo
    deco.push(...pine(r, p[0], p[1], 20 + r() * 8)); stat(cyl(1.4, 1.8, 6, M.matte(TRUNK), [0, 0, 0]), B.PhysicsShapeType.CYLINDER, {}, [p[0], 3, p[1]]).isVisible = false; bare.push({ x: p[0], z: p[1], r: 6 }); }
  // Grupos de pinos a 25-50 u de la salida (con colisionador): siluetas oscuras y sombras largas dentro de la cámara de juego.
  const g = rnd(3301);
  for (let i = 0; i < 9; i++) { const p = spot(6, 25, 50); if (!p) continue;
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + g() * 1.2, d = 2.5 + g() * 3, x = p[0] + Math.cos(a) * d, z = p[1] + Math.sin(a) * d, h = 14 + g() * 7;
      deco.push(...pine(g, x, z, h)); stat(cyl(1.2, 1.7, 6, M.matte(TRUNK), [0, 0, 0]), B.PhysicsShapeType.CYLINDER, {}, [x, 3, z]).isVisible = false; }
    bare.push({ x: p[0], z: p[1], r: 7 }); }
  // Hongos al pie de algunos tocones.
  for (let i = 0; i < 12; i++) { const p = spot(2, 20, 60); if (p) deco.push(...mush(p[0], p[1], 0.7 + g() * 0.5), ...mush(p[0] + 1.1, p[1] + 0.6, 0.5)); }
  // Matas y piedritas sin colisión: densidad alta de props bajos alrededor del auto y del resto del patio.
  for (let i = 0; i < 300; i++) { const p = spot(1, 19, i < 160 ? 55 : 125); if (!p) continue; ferns.push(...fern(r, p[0], p[1], 1.6 + r() * 1.8)); if (i % 3 === 0) ferns.push(...rock(r, p[0] + 1.5, p[1] + 1, 0.5 + r() * 0.5, r() * 6)); }
  for (const [n, parts] of [["forestDeco", deco], ["forestMatas", ferns]] as [string, B.Mesh[]][]) { if (!parts.length) continue; const m = merge(n, parts); m.isPickable = false; shadows.addShadowCaster(m); }
}
