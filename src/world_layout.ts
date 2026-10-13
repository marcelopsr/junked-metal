import * as B from "@babylonjs/core";
import { box, cyl, merge, sph, template, tor, tube } from "./models";
import { canvasTex, G, M, pbr, shadows, TEX } from "./render";
import { rng } from "./rng";
import { FOLD, FOLDED_SLICE } from "./folded";
import { gnomeFold, paintCanFold, potFold, rampLip, toolFold, wateringCanFold } from "./folded_slice";
import { HALF, Z, worldMeshes, bare, breakable, breakables, crateFold, dyn, isBare, layoutMeshes, onClear, scene, skin, st, stat, tex, tireStackM, woodCrateM, woodM } from "./zones/common";
import { WindPlugin } from "./grass";

/** Detalle del mundo: distancia de dibujo de los props (0 = sin límite; Bajo 95, Medio 145, Alto 220: DETAIL en render.ts). Un LOD vacío esconde la malla
 *  cuando ni su punto más cercano entra en la distancia (solo visibilidad: los colisionadores no se tocan); las mallas fusionadas (su esfera abarca todo
 *  el patio) y el pasto (thin instances) no se recortan. */
export function setDrawDist(d: number) {
  // Las instancias (cerca de tablones, cajas Folded) usan el LOD de su plantilla con su propia esfera: se recortan agregándolo a la plantilla.
  const all = [...worldMeshes, ...layoutMeshes], srcs = new Set(all.flatMap((m) => (m instanceof B.InstancedMesh ? [m.sourceMesh] : [])));
  for (const m of [...all, ...srcs]) {
    if (!(m instanceof B.Mesh) || m.isDisposed() || m.alwaysSelectAsActiveMesh || m.thinInstanceCount) continue;
    m.removeLODLevel(null);
    if (d) { m.computeWorldMatrix(true); m.addLODLevel(d + m.getBoundingInfo().boundingSphere.radiusWorld, null); }
  }
}

export const clear = (x: number, z: number, r: number, m: number) => !isBare(x, z) && !bare.some((b) => Math.hypot(x - b.x, z - b.z) < b.r + r) && Math.hypot(x, z) > 18 + r && /* claro alrededor de la salida: espacio negativo para el auto y la cámara baja */ Math.abs(x) < HALF - m && Math.abs(z) < HALF - m;
// Busca un lugar libre al azar (con semilla). null si no encuentra.
// m: margen al borde
export function freeSpot(r: number, m = 10): [number, number] | null {
  for (let i = 0; i < 40; i++) { const x = (rng() - 0.5) * (HALF - m) * 2, z = (rng() - 0.5) * (HALF - m) * 2; if (clear(x, z, r, m)) return [x, z]; }
  return null;
}
export const between = (a: number, b: number) => a + rng() * (b - a);
export const int = (a: number, b: number) => Math.floor(between(a, b + 1));

// Rampa maciza (prisma): sube L hasta H, meseta T, baja Lb (0 = corte vertical: borde de salto). Ancho W.
// Local: el pie en z=0, sube hacia +z. Se posa ANTES del aggregate (trampa de Havok).
export function ramp(mat: B.Material, x: number, z: number, ry: number, W: number, L: number, H: number, T = 0, Lb = 0, y = 0, deco: B.Mesh[] = []) {
  const pr = [[0, -0.06], [L, H], ...(T ? [[L + T, H]] : []), [L + T + Lb, 0]]; // pie enterrado: evita labio con el suelo (gcol y=0)
  const n = pr.length, pos: number[] = [], ind: number[] = [];
  for (const sx of [-W / 2, W / 2]) for (const [pz, py] of pr) pos.push(sx, py, pz);
  for (let i = 1; i < n - 1; i++) ind.push(0, i, i + 1, n, n + i + 1, n + i); // caras laterales
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; ind.push(i, n + j, j, i, n + i, n + j); } // contorno
  const m = new B.Mesh("ramp", scene), vd = new B.VertexData();
  vd.positions = pos; vd.indices = ind;
  vd.applyToMesh(m);
  m.convertToFlatShadedMesh();
  m.material = mat;
  stat(m, B.PhysicsShapeType.MESH, { friction: 0.5 }, [x, y, z, ry]); // hull redondeaba la unión con tablones y el borde de salto
  const len = L + T + Lb;
  bare.push({ x: x + (Math.sin(ry) * len) / 2, z: z + (Math.cos(ry) * len) / 2, r: len / 2 + 1 });
  if (FOLDED_SLICE && H > 1) deco.push(...rampLip(W, L, H)); // franja hazard en el borde de salto
  if (deco.length) { const d = merge("rampDeco", deco); d.position.set(x, y, z); d.rotation.y = ry; shadows.addShadowCaster(d); } // solo visual: se posa después sin problema
}
// Tablón apoyado sobre la subida de una rampa (adorno, coordenadas locales de ramp)
export const slopeBoard = (W: number, L: number, H: number, mat: B.Material, th = 0.3) => box(W, th, Math.hypot(L, H), mat, [0, H / 2 + th / 2, L / 2], [-Math.atan2(H, L), 0, 0]);

// Puente angosto de tablones: dos rampas de 7 de alto y un tablero de 3,2 de ancho y 30 de largo, centrado en (px, pz)
export function plankBridge(px: number, pz: number, bry: number, rampMat: B.Material = M.matte("#b45309")) {
  const wood = woodM(), bdx = Math.sin(bry), bdz = Math.cos(bry);
  const bridgeHalf = 15.2, rampL = 16, foot = bridgeHalf + rampL; // 31 dejaba 0,2 m de hueco: el auto chocaba el canto del tablero
  for (const s of [-1, 1]) ramp(rampMat, px + bdx * foot * s, pz + bdz * foot * s, s < 0 ? bry : bry + Math.PI, 3.2, rampL, 7, 0, 0, 0, [slopeBoard(3.6, rampL, 7, wood)]);
  stat(box(3.6, 0.5, bridgeHalf * 2, wood, [px, 6.75, pz], [0, bry, 0]), B.PhysicsShapeType.BOX);
  bare.push({ x: px, z: pz, r: 16 });
}

// Rampas de juguete: n por partida, tipo (de kinds) / lugar / rumbo según la semilla
export function toyRamps(n: number, kinds: number[]) {
  const orange = M.plastic("#f97316"), rail = M.plastic("#c2410c"), wood = woodM(), brick = M.matte("#b45309"), dirtM = pbr("dirt", { color: "#ffffff", rough: 1, tex: tex("dirt", TEX.dirt) });
  for (let i = 0, off = int(0, kinds.length - 1); i < n; i++) {
    const sp = freeSpot(16, 30); if (!sp) continue; // lejos del borde: la pista curva y el aterrizaje ocupan ~25 m
    const ry = Math.atan2(-sp[0], -sp[1]) + (rng() - 0.5) * 1.6, dx = Math.sin(ry), dz = Math.cos(ry); // saltan hacia el medio
    const kind = kinds[(off + i) % kinds.length];
    if (kind === 0) {
      // Tabla sobre una pila de ladrillos: salto corto y seco
      ramp(brick, sp[0] - dx * 6.5, sp[1] - dz * 6.5, ry, 4, 10, 2.6, 0, 3, 0, [slopeBoard(4.4, 10, 2.6, wood)]);
    } else if (kind === 1) {
      // Pista de autitos de plástico: curva en el piso que termina en un trampolín naranja
      const sg = rng() < 0.5 ? -1 : 1, R = 14, deco: B.Mesh[] = [], trackCol: B.Mesh[] = [];
      const fx = sp[0] - dx * 6, fz = sp[1] - dz * 6;
      for (let k = 0; k < 12; k++) {
        const a0 = (k / 12) * 1.6, a1 = ((k + 1) / 12) * 1.6;
        const p0 = [sg * (R - R * Math.cos(a0)), -R * Math.sin(a0)], p1 = [sg * (R - R * Math.cos(a1)), -R * Math.sin(a1)];
        const mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2, yaw = Math.atan2(p1[0] - p0[0], p1[1] - p0[1]), len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + 0.1;
        deco.push(box(3.4, 0.08, len, orange, [mx, 0.04, mz], [0, yaw, 0]));
        trackCol.push(box(3.4, 0.08, len, orange, [mx, 0.04, mz], [0, yaw, 0]));
        for (const e of [-1.8, 1.8]) deco.push(box(0.25, 0.35, len, rail, [mx + Math.cos(yaw) * e, 0.17, mz - Math.sin(yaw) * e], [0, yaw, 0]));
      }
      if (trackCol.length) stat(merge("toyTrack", trackCol), B.PhysicsShapeType.MESH, { friction: 0.5 }, [fx, 0, fz, ry]);
      for (const e of [-1.8, 1.8]) { const b = slopeBoard(0.25, 8, 2.2, rail, 0.35); b.position.x = e; b.position.y += 0.15; deco.push(b); }
      ramp(orange, fx, fz, ry, 3.4, 8, 2.2, 0, 4, 0, deco);
      for (let k = 1; k < 4; k++) { const a = (k / 4) * 1.6, lx = sg * (R - R * Math.cos(a)), lz = -R * Math.sin(a); bare.push({ x: fx + lx * Math.cos(ry) + lz * dx, z: fz - lx * Math.sin(ry) + lz * dz, r: 3 }); }
    } else if (kind === 2) {
      // Tobogán caído: rampa larga con plataforma arriba, la escalera tirada al costado
      const deco = [slopeBoard(3, 14, 4, M.plastic("#ef4444"), 0.2)];
      for (const e of [-1.7, 1.7]) { const b = slopeBoard(0.3, 14, 4, M.plastic("#ef4444"), 0.7); b.position.x = e; b.position.y += 0.3; deco.push(b); }
      for (const e of [3.4, 5]) deco.push(cyl(0.4, 0.4, 9, M.metal("#94a3b8"), [e, 0.2, 6], [Math.PI / 2, 0, 0], 6));
      for (let k = 0; k < 5; k++) deco.push(cyl(0.25, 0.25, 1.6, M.metal("#94a3b8"), [4.2, 0.2, 2.5 + k * 1.8], [0, 0, Math.PI / 2], 6));
      ramp(M.plastic("#facc15"), sp[0] - dx * 9.75, sp[1] - dz * 9.75, ry, 3.6, 14, 4, 1.5, 4, 0, deco);
    } else {
      // Montículos de tierra en fila: lomas que hacen volar al auto con turbo
      for (let k = -1; k <= 1; k++) {
        const x = sp[0] + dx * k * 10, z = sp[1] + dz * k * 10;
        stat(sph(14, dirtM, [x, -1.5, z], [1, 0.46, 1], 12), B.PhysicsShapeType.CONVEX_HULL, { friction: 0.6 });
        bare.push({ x, z, r: 6 });
      }
    }
  }
}

// Tablones, neumáticos y cajas estáticas para saltar (no cofres: solo geometría de patio)
export function jumpScrap(n: number) {
  const wood = woodM(), carton = woodCrateM(), tireM = tireStackM();
  for (let i = 0; i < n; i++) {
    const sp = freeSpot(12, 28); if (!sp) continue;
    const [x, z] = sp, ry = rng() * Math.PI, roll = int(0, 2);
    if (roll === 0) {
      const layers = int(2, 4);
      for (let k = 0; k < layers; k++) stat(box(3.2, 0.22, 4.2, wood, [x, 0.11 + k * 0.2, z], [0, ry + k * 0.08, 0]), B.PhysicsShapeType.BOX, { friction: 0.55 });
    } else if (roll === 1) {
      stat(tor(2.4, 0.85, tireM, [x, 0.85, z], [Math.PI / 2, ry, 0], 14), B.PhysicsShapeType.CONVEX_HULL, { friction: 0.6 });
    } else {
      for (let k = 0; k < int(2, 3); k++) crateFold(stat(box(2.4, 2.2, 2.4, carton, [x, 1.1 + k * 2.05, z], [0, ry, 0]), B.PhysicsShapeType.BOX, { friction: 0.45 }), 2.4, 2.2, 2.4);
    }
    bare.push({ x, z, r: 5 });
  }
}

// TRAMO: pasillo entre macetas de cemento (no se rompen ni dan premio: es un desfiladero, no un cofre)
export function planterAlley() {
  const sp = freeSpot(20);
  if (!sp) return;
  const ry = rng() * Math.PI, dx = Math.sin(ry), dz = Math.cos(ry), parts: B.Mesh[] = [];
  const pMat = FOLDED_SLICE ? FOLD.painted("#6e7681", 0.85, 308) : M.matte("#8a8f94");
  const l1 = FOLDED_SLICE ? FOLD.painted("#3f8f2f", 0.65, 309) : M.matte("#3f8f2f"), l2 = FOLDED_SLICE ? FOLD.painted("#4ea83a", 0.65, 310) : M.matte("#4ea83a");
  for (let k = 0; k < 8; k++) for (const e of [-3.6, 3.6]) {
    const t = (k - 3.5) * 4.4, x = sp[0] + dx * t + dz * e, z = sp[1] + dz * t - dx * e;
    stat(cyl(3.2, 3.2, 2.6, pMat, [x, 1.3, z], undefined, 10), B.PhysicsShapeType.CYLINDER).isVisible = false;
    parts.push(cyl(3.2, 2.6, 2.6, pMat, [x, 1.3, z], undefined, 10), cyl(2.8, 2.8, 0.2, FOLDED_SLICE ? FOLD.dark() : M.matte("#4a3420"), [x, 2.55, z], undefined, 10));
    if (FOLDED_SLICE) parts.push(cyl(3.32, 3.32, 0.3, FOLD.rust(), [x, 2.4, z], undefined, 10));
    for (let l = 0; l < 3; l++) { const a = l * 2.1 + k; const lf = sph(2, l % 2 ? l1 : l2, [x + Math.cos(a) * 0.6, 3.3, z + Math.sin(a) * 0.6], [0.4, 0.2, 1.4]); lf.rotation.set(0.6, -a + Math.PI / 2, 0); parts.push(lf); }
    bare.push({ x, z, r: 1.8 });
  }
  shadows.addShadowCaster(merge("planters", parts));
}

// TRAMO: juguetes desparramados (bloques y pelotitas sueltas que hacen patinar)
export function toyScatter() {
  const sp = freeSpot(13);
  if (!sp) return;
  const toy = ["#ef4444", "#3b82f6", "#facc15", "#22c55e", "#a855f7"];
  for (let k = 0; k < 26; k++) {
    const a = rng() * 6.3, r = Math.sqrt(rng()) * 11, s = between(0.7, 1.5), c = toy[int(0, 4)];
    breakable(dyn(box(s, s * between(0.6, 1), s * between(1, 2), FOLDED_SLICE ? FOLD.painted(c, 0.55, 312 + (k % 5)) : M.plastic(c), [sp[0] + Math.cos(a) * r, s / 2, sp[1] + Math.sin(a) * r], [0, rng() * 6.3, 0]), B.PhysicsShapeType.BOX, 0.3), 25, s * 0.7, c);
  }
  for (let k = 0; k < 5; k++) { const a = rng() * 6.3, r = Math.sqrt(rng()) * 10; dyn(sph(1.4, FOLDED_SLICE ? FOLD.painted(toy[k], 0.5, 318 + k) : M.plastic(toy[k]), [sp[0] + Math.cos(a) * r, 0.7, sp[1] + Math.sin(a) * r], undefined, 10), B.PhysicsShapeType.SPHERE, 0.4); }
  bare.push({ x: sp[0], z: sp[1], r: 12 });
}

// Macetas con plantas (cofres: sueltan premios): cantidad, lugar y tamaño según la semilla
export function pots(n: number) {
  const list: [number, number, number][] = [];
  for (let i = 0; i < n; i++) { const sc = between(0.8, 1.35), p = freeSpot(6 * sc); if (p) { list.push([p[0], p[1], sc]); bare.push({ x: p[0], z: p[1], r: 3 * sc }); } }
  const l1 = FOLDED_SLICE ? FOLD.painted("#3f8f2f", 0.65, 309) : M.matte("#3f8f2f"), l2 = FOLDED_SLICE ? FOLD.painted("#4ea83a", 0.65, 310) : M.matte("#4ea83a");
  for (const [x, z, sc] of list) {
    const pot = stat(merge("pot", [
      cyl(5 * sc, 4 * sc, 4 * sc, M.matte("#c2410c"), [0, 2 * sc, 0], undefined, 16),
      cyl(5.4 * sc, 5.4 * sc, 0.6 * sc, M.matte("#9a3412"), [0, 3.9 * sc, 0], undefined, 16),
      cyl(4.6 * sc, 4.6 * sc, 0.2 * sc, M.matte("#4a3420"), [0, 4.1 * sc, 0], undefined, 16),
    ]), B.PhysicsShapeType.CYLINDER, {}, [x, 0, z]);
    if (FOLDED_SLICE) {
      pot.isVisible = false;
      const pk = template("potF", potFold).createInstance("potF");
      pk.position.setAll(0); pk.parent = pot; pk.scaling.setAll(sc); pk.isPickable = false; pk.receiveShadows = true; shadows.addShadowCaster(pk);
    }
    const plant: B.Mesh[] = []; // hojas y flor en una sola malla (se rompe junto con la maceta: extras)
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      const leaf = FOLDED_SLICE
        ? box(1.1 * sc, 0.16 * sc, 2.8 * sc, k % 2 ? l1 : l2, [x + Math.cos(a) * 1.3 * sc, 5.4 * sc, z + Math.sin(a) * 1.3 * sc], [0.55, -a + Math.PI / 2, 0])
        : sph(3 * sc, k % 2 ? l1 : l2, [x + Math.cos(a) * 1.3 * sc, 5.5 * sc, z + Math.sin(a) * 1.3 * sc], [0.4, 0.2, 1.4]);
      if (!FOLDED_SLICE) leaf.rotation.set(0.6, -a + Math.PI / 2, 0);
      plant.push(leaf);
    }
    const fc = ["#f43f5e", "#facc15", "#a855f7"][Math.floor(rng() * 3)];
    plant.push(sph(1.2 * sc, FOLDED_SLICE ? FOLD.painted(fc, 0.5, 325) : M.plastic(fc), [x, 6.8 * sc, z]));
    const leaves = merge("plant", plant);
    shadows.addShadowCaster(leaves);
    breakable(pot, 120 * sc, 2.6 * sc, "#c2410c", true, [leaves]);
  }
}
// Latas de pintura (los cofres del garaje): al romperse salpican su color
export const CAN_COLORS = ["#d62828", "#2a6fdb", "#f2c14e", "#3a9d5d", "#e8e8e0"];
/** Lata de pintura gigante rompible en (x, y, z); y = altura de la superficie donde apoya. */
export function canAt(x: number, y: number, z: number, ci: number) {
  const c = CAN_COLORS[ci], tin = M.metal("#b8bcc2");
  const can = stat(merge("lata", [
    cyl(4.4, 4.4, 5, tin, [0, 2.5, 0], undefined, 14), cyl(4.5, 4.5, 2.6, M.matte(c), [0, 2.6, 0], undefined, 14),
    cyl(4.2, 4.2, 0.2, M.metal("#8a8e94"), [0, 5.05, 0], undefined, 14), tor(3.4, 0.2, M.metal("#8a8e94"), [0, 5.4, 0], [Math.PI / 2, 0, 0], 10),
  ]), B.PhysicsShapeType.CYLINDER, {}, [x, y, z]);
  breakable(skin(can, "lataF" + c, () => paintCanFold(c)), 90, 2.4, c, [c, "#b8bcc2"]);
}
export function paintCans(n: number) {
  for (let i = 0; i < n; i++) {
    const p = freeSpot(5); if (!p) continue;
    canAt(p[0], 0, p[1], int(0, 4));
    bare.push({ x: p[0], z: p[1], r: 2.5 });
  }
}
// Herramientas gigantes tiradas en el piso del garaje: llave, martillo y destornillador
export function giantTools() {
  const steel = M.metal("#8f969e");
  const kit: (() => B.Mesh)[] = [
    () => merge("llave", [box(16, 1, 2.6, steel, [0, 0.5, 0]), box(4.5, 1, 6, steel, [8, 0.5, 0]), box(3, 1.02, 2, M.matte("#20242a"), [9.4, 0.5, 0])]),
    () => merge("martillo", [cyl(1.6, 1.6, 14, woodM(), [0, 0.8, 0], [0, 0, Math.PI / 2], 8), box(2.6, 2.6, 7, steel, [7.5, 1.3, 0])]),
    () => merge("destornillador", [cyl(2.4, 2.4, 6, M.plastic("#c0392b"), [0, 1.2, 0], [0, 0, Math.PI / 2], 8), cyl(0.6, 0.6, 9, steel, [7.5, 1.2, 0], [0, 0, Math.PI / 2], 6)]),
  ];
  for (const [i, make] of kit.entries()) {
    const sp = freeSpot(9); if (!sp) continue;
    skin(stat(make(), B.PhysicsShapeType.CONVEX_HULL, {}, [sp[0], 0, sp[1], rng() * 6.3]), "toolF" + i, () => toolFold(i as 0 | 1 | 2));
    bare.push({ x: sp[0], z: sp[1], r: 8 });
  }
}

// Rocas en grupos (una grande y satélites chicos): puntos de interés en vez de lluvia pareja
export function rocks(n: number) {
  let left = n;
  while (left > 0) {
    const c = freeSpot(10); if (!c) break;
    const g = Math.min(left, int(2, 5)); left -= g;
    for (let i = 0; i < g; i++) {
      const a = rng() * 6.3, d = i ? 4 + rng() * 5 : 0, x = c[0] + Math.cos(a) * d, z = c[1] + Math.sin(a) * d;
      if (i && isBare(x, z)) continue;
      const big = i ? 0.5 + rng() * 0.4 : 1.2 + rng() * 0.5;
      const r = B.MeshBuilder.CreatePolyhedron("rock", { type: 2, size: 1 }, scene);
      r.convertToFlatShadedMesh();
      r.material = pbr("stone", { color: "#ffffff", rough: 0.9, tex: tex("stone", TEX.stone) });
      r.scaling.set((1.5 + rng() * 3) * big, (0.8 + rng() * 1.5) * big, (1.5 + rng() * 3) * big);
      r.rotation.set(0, rng() * 6, (rng() - 0.5) * 0.3); // inclinación leve: no todas apoyadas igual
      r.position.set(x, r.scaling.y * 0.4, z); // pose ANTES del aggregate
      stat(r, B.PhysicsShapeType.CONVEX_HULL);
      bare.push({ x, z, r: r.scaling.x });
    }
  }
}

export function gnomes(n: number) {
  const list: [number, number, number][] = [];
  for (let i = 0; i < n; i++) { const p = freeSpot(5); if (p) { list.push([p[0], p[1], rng() * 6.3]); bare.push({ x: p[0], z: p[1], r: 2.5 }); } }
  for (const [x, z, ry] of list) skin(stat(merge("gnome", [
    cyl(2.4, 3.6, 4, M.plastic("#2563eb"), [0, 2, 0], undefined, 12),
    cyl(2.6, 2.6, 0.5, M.plastic("#78350f"), [0, 2.6, 0], undefined, 12),
    sph(2.4, M.plastic("#f5c7a9"), [0, 5, 0]),
    cyl(0.1, 2.6, 2.4, M.plastic("#f8fafc"), [0, 3.6, 0.8], [Math.PI - 0.3, 0, 0], 10),
    cyl(0.05, 2.6, 3.4, M.plastic("#dc2626"), [0, 7, 0], [-0.2, 0, 0], 12),
    sph(0.6, M.plastic("#f59e9e"), [0, 5, 1.15]),
  ]), B.PhysicsShapeType.CYLINDER, {}, [x, 0, z, ry]), "gnomeF", gnomeFold);
}

// Manguera enrollada con su tramo serpenteando por el pasto
export function hose() {
  const hs = freeSpot(8);
  if (!hs) return;
  const [hx, hz] = hs, hm = FOLDED_SLICE ? FOLD.painted("#1f9d4c", 0.65, 305) : M.plastic("#22c55e");
  const h = merge("hose", [0, 1, 2, 3].map((i) => tor(9 - i * 0.2, 0.9, hm, [0, 0.45 + i * 0.85, 0], undefined, 24)));
  h.position.set(hx, 0, hz);
  stat(h, B.PhysicsShapeType.MESH);
  bare.push({ x: hx, z: hz, r: 5 });
  const a0 = rng() * 6.3, path: [number, number, number][] = [[hx + Math.cos(a0) * 4.6, 0.4, hz + Math.sin(a0) * 4.6]];
  for (let k = 1; k < 5; k++) path.push([path[k - 1][0] + Math.cos(a0 + (rng() - 0.5)) * 9, 0.4, path[k - 1][2] + Math.sin(a0 + (rng() - 0.5)) * 9]);
  tube(path, 0.45, hm).receiveShadows = true;
}

export function wateringCan() {
  const cs = freeSpot(5) ?? [-70, -40];
  bare.push({ x: cs[0], z: cs[1], r: 3 });
  skin(stat(merge("can", [
    cyl(5, 5, 6, M.metal("#15803d"), [0, 3, 0], undefined, 16),
    tube([[0, 2, 2.4], [0, 5, 5], [0, 6.5, 6.5]], 0.35, M.metal("#15803d")),
    tor(4, 0.4, M.metal("#15803d"), [0, 6.8, -1], [0, Math.PI / 2, Math.PI / 2], 12),
  ]), B.PhysicsShapeType.CYLINDER, {}, [cs[0], 0, cs[1]]), "regaderaF", wateringCanFold);
}

// Pilas de bloques o cajas (pirámides empujables y rompibles) de lado s
export function piles(np: number, cols: string[], mat: (c: string) => B.Material, s = 2, fold = false) {
  for (let pile = 0; pile < np; pile++) {
    const sp = freeSpot(8); if (!sp) continue;
    const [bx, bz] = sp, rows = int(2, 4);
    for (let r = 0; r < rows; r++) for (let i = 0; i < rows - r + 1; i++) { const c = cols[int(0, cols.length - 1)]; const b = dyn(box(s, s, s, mat(c), [bx + (i - (rows - r) / 2) * s * 1.1, s / 2 + r * s * 1.025, bz]), B.PhysicsShapeType.BOX, 0.3 * s); breakable(fold ? crateFold(b, s, s, s) : b, 40, s * 0.6, c); }
    bare.push({ x: bx, z: bz, r: 3 * s });
  }
}
export function brickWalls(n: number) {
  for (let w = 0; w < n; w++) {
    const sp = freeSpot(8); if (!sp) continue;
    const [wx, wz] = sp;
    for (let i = 0; i < 8; i++) {
      const b = dyn(box(3, 1.4, 1.5, FOLDED_SLICE ? FOLD.painted("#b45309", 0.8, 340 + (i % 4)) : M.matte("#b45309"), [wx + (i % 4) * 3.1 - 4.6, 0.7 + Math.floor(i / 4) * 1.45, wz]), B.PhysicsShapeType.BOX, 1.2);
      breakable(FOLDED_SLICE ? crateFold(b, 3, 1.4, 1.5) : b, 60, 1.5, "#b45309");
    }
    bare.push({ x: wx, z: wz, r: 7 });
  }
}
// Charcos (agua o aceite): espejos en el piso
export function puddles(n: number, mat: B.Material) {
  mat.zOffset = -3; mat.disableDepthWrite = true;
  const discs: B.Mesh[] = [];
  for (let i = 0; i < n; i++) {
    const spot = freeSpot(5); if (!spot) continue;
    const [x, z] = spot;
    const pd = B.MeshBuilder.CreateDisc("puddle", { radius: 1, tessellation: 20 }, scene);
    pd.rotation.x = Math.PI / 2;
    pd.scaling.set(3 + rng() * 4, 2 + rng() * 3, 1);
    pd.position.set(x, 0.035, z);
    pd.material = mat;
    discs.push(pd);
    bare.push({ x, z, r: pd.scaling.x });
  }
  if (discs.length) merge("puddles", discs); // todos comparten material: un solo dibujo
}
export function ball() {
  const bs = freeSpot(4) ?? [10, 10];
  if (!FOLDED_SLICE) {
    const ballTex = tex("ball", () => canvasTex(256, (c, s) => { c.fillStyle = "#fafafa"; c.fillRect(0, 0, s, s); c.fillStyle = "#111"; for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) { c.beginPath(); c.arc(i * 32 + 16, j * 64 + 32, 12, 0, 7); c.fill(); } }));
    dyn(sph(5, pbr("ball", { color: "#ffffff", rough: 0.4, tex: ballTex }), [bs[0], 2.5, bs[1]], undefined, 16), B.PhysicsShapeType.SPHERE, 2);
    return;
  }
  const collider = dyn(sph(5, M.matte("#ffffff"), [bs[0], 2.5, bs[1]], undefined, 16), B.PhysicsShapeType.SPHERE, 2);
  collider.isVisible = false;
  const ballFiles = ["ball", "ball_tennis", "ball_beach"];
  const variant = ballFiles[int(0, ballFiles.length - 1)];
  import("@babylonjs/loaders/glTF/index.js").then(() => B.LoadAssetContainerAsync(`models/${variant}.glb`, scene)).then((c) => {
    if (collider.isDisposed()) { c.dispose(); return; }
    c.addAllToScene();
    const root = new B.TransformNode("ballSkin", scene);
    root.scaling.setAll(2.325);
    root.position.set(0, -2.5, 0);
    for (const node of c.rootNodes) node.parent = root;
    for (const mesh of c.meshes) {
      if (mesh.getTotalVertices()) {
        shadows.addShadowCaster(mesh);
        mesh.receiveShadows = true;
      }
    }
    root.parent = collider;
  }).catch(() => {
    collider.isVisible = true;
  });
}

export function clearLayout() {
  for (const m of layoutMeshes) { m.physicsBody?.dispose(); m.dispose(); }
  layoutMeshes.length = 0;
  breakables.length = 0;
  bare.length = st.staticBare;
  for (const f of onClear) f();
}

export function buildLayout() {
  clearLayout();
  const before = new Set(scene.meshes);
  Z.layout();
  layoutMeshes.length = 0; layoutMeshes.push(...scene.meshes.filter((m) => !before.has(m)));
  buildGrass();
}

/** Pasto de la zona (thin instances de la malla `tuft`, que arma buildWorld). La carrera lo pide sin el layout de la partida. */
export function buildGrass() {
  // Pasto: miles de matas como thin instances de una sola malla (evita lo que ocupa el layout).
  // La base (st.tuftCount) consume rng() siempre igual: el Detalle de Configuración no cambia el resultado de la partida (ni el diario entre dispositivos).
  // Con Detalle menor se usa solo parte de esa base; con Ultra se suman matas con un azar aparte (solo visual).
  const mats = new Float32Array(Math.max(1, Math.ceil(st.tuftCount * 1.5)) * 16);
  const q = new B.Quaternion(), sc = new B.Vector3(), p = new B.Vector3(), m = new B.Matrix();
  const scatter = (r: () => number, n: number, k0: number) => {
    let k = k0;
    for (let tries = 0; k - k0 < n && tries < n * 3; tries++) {
      const x = (r() - 0.5) * (HALF - 1) * 2, z = (r() - 0.5) * (HALF - 1) * 2;
      if (isBare(x, z)) continue;
      // Mechones: ruido de baja frecuencia deja claros sin pasto (el 20% se salva para que no queden pelados)
      if (Math.sin(x * 0.11) + Math.sin(z * 0.13) + Math.sin((x + z) * 0.07) < -0.4 && r() > 0.2) continue;
      const s = 0.6 + r() * 0.9;
      sc.set(s, s * (0.7 + r() * 0.8) * Z.grassH, s);
      B.Quaternion.RotationYawPitchRollToRef(r() * 6.3, 0, 0, q);
      p.set(x, 0, z);
      B.Matrix.ComposeToRef(sc, q, p, m);
      m.copyToArray(mats, k++ * 16);
    }
    return k;
  };
  let k = scatter(rng, st.tuftCount, 0);
  const want = Math.round(k * G.grass);
  k = want > k ? scatter(Math.random, want - k, k) : want;
  // Recortar después de scatter conserva todas las llamadas al RNG y el layout de la semilla.
  const paths: number[][] = scene.getMeshByName("soilPaths")?.metadata?.grassPaths ?? [];
  let kept = 0;
  for (let i = 0; i < k; i++) {
    const x = mats[i * 16 + 12], z = mats[i * 16 + 14];
    if (paths.some(([cx, cz, w, len, angle]) => {
      const dx = x - cx, dz = z - cz, sn = Math.sin(angle), cs = Math.cos(angle);
      return Math.abs(dx * cs - dz * sn) < w * 0.25 && Math.abs(dx * sn + dz * cs) < len * 0.42;
    })) continue;
    mats.copyWithin(kept++ * 16, i * 16, i * 16 + 16);
  }
  k = kept;
  st.tuft.isVisible = k > 0;
  if (k) { st.tuft.thinInstanceSetBuffer("matrix", mats.subarray(0, k * 16), 16, true); st.tuft.alwaysSelectAsActiveMesh = true; } // la caja original queda en el origen: sin esto el pasto se descarta al mirar lejos
  setDrawDist(G.draw);
}


export function grassTuft() {
  const pos: number[] = [], ind: number[] = [], col: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rng();
    const r = rng() * 0.25, w = 0.07, h = 0.15 + rng() * 0.2; // bajo: no tapar enemigos de 0.6
    const bx = Math.cos(a) * r, bz = Math.sin(a) * r, lean = 0.2 + rng() * 0.2;
    const px = -Math.sin(a) * w, pz = Math.cos(a) * w;
    const b = pos.length / 3;
    pos.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, bx + Math.cos(a) * lean, h, bz + Math.sin(a) * lean);
    ind.push(b, b + 1, b + 2);
    const g = 0.75 + rng() * 0.25;
    col.push(0.2 * g, 0.4 * g, 0.12 * g, 1, 0.2 * g, 0.4 * g, 0.12 * g, 1, 0.42 * g, 0.65 * g, 0.2 * g, 1); // pasto seco, apagado
  }
  const m = new B.Mesh("tuft", scene);
  const vd = new B.VertexData();
  vd.positions = pos; vd.indices = ind; vd.colors = col;
  vd.normals = [];
  B.VertexData.ComputeNormals(pos, ind, vd.normals);
  vd.applyToMesh(m);
  const mat = pbr("tuftMat", { color: "#ffffff", rough: 0.9 });
  if (!mat.pluginManager?.getPlugin("Wind")) new WindPlugin(mat); // el material se reusa al cambiar de zona
  mat.backFaceCulling = false;
  mat.twoSidedLighting = true;
  m.material = mat;
  m.receiveShadows = true;
  m.isPickable = false;
  return m;
}
