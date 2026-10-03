import * as B from "@babylonjs/core";
import { box, cyl, merge, sph, template, tor, tube } from "./models";
import { debris } from "./fx";
import { canvasTex, M, pbr, shadows, TEX } from "./render";
import { rng } from "./rng";

// Patio de 320x320. Un auto RC mide ~2 unidades: una maceta es un edificio.
export const HALF = 160;
const K = HALF / 100; // escala de lo que se diseñó para el patio de 200

let scene: B.Scene;
// El cuerpo toma la pose de la malla al crearse: posicionar SIEMPRE antes (at), nunca después.
const stat = (m: B.Mesh, shape: B.PhysicsShapeType, o: Partial<B.PhysicsAggregateParameters> = {}, at?: [number, number, number, number?]) => {
  if (at) { m.position.set(at[0], at[1], at[2]); if (at[3] !== undefined) m.rotation.y = at[3]; }
  new B.PhysicsAggregate(m, shape, { mass: 0, friction: 0.6, ...o }, scene);
  shadows.addShadowCaster(m);
  m.receiveShadows = true;
  return m;
};
const dyn = (m: B.Mesh, shape: B.PhysicsShapeType, mass: number) => {
  new B.PhysicsAggregate(m, shape, { mass, friction: 0.5, restitution: 0.3 }, scene);
  shadows.addShadowCaster(m);
  m.receiveShadows = true;
  return m;
};

// ---------- Objetos rompibles ----------
export type Breakable = { m: B.Mesh; hp: number; r: number; color: string; extras: B.Mesh[]; pot: boolean };
export const breakables: Breakable[] = [];
const breakable = (m: B.Mesh, hp: number, r: number, color: string, pot = false, extras: B.Mesh[] = []) => (breakables.push({ m, hp, r, color, extras, pot }), m);

// Daño en área a objetos del patio. Devuelve dónde se rompieron macetas (sueltan premios).
export function hitBreakables(pos: B.Vector3, r: number, dmg: number) {
  const pots: B.Vector3[] = [];
  for (let i = breakables.length - 1; i >= 0; i--) {
    const b = breakables[i];
    if (B.Vector3.Distance(b.m.getAbsolutePosition(), pos) > r + b.r || (b.hp -= dmg) > 0) continue;
    const p = b.m.getAbsolutePosition().clone();
    debris(p, b.color, b.pot ? 16 : 6, b.pot ? 9 : 6, b.pot ? 1.6 : 1);
    if (b.pot) { debris(p, "#4a3420", 10, 6, 1.2); debris(p.add(new B.Vector3(0, 4, 0)), "#3f8f2f", 8, 5, 1.4); pots.push(p); }
    b.m.physicsBody?.dispose();
    b.m.dispose();
    for (const x of b.extras) x.dispose();
    breakables.splice(i, 1);
  }
  return pots;
}

// Mallas fijas que pueden tapar al auto: la cámara las tramea (main.ts). Las copas quedan fuera: están por encima de la cámara.
export const occluders: B.Mesh[] = [];
// ¿Está bajo la tapa de la mesa? (34x30 centrada en 0,-30, a 16 de alto)
export const underRoof = (p: B.Vector3) => Math.abs(p.x) < 17 && Math.abs(p.z + 30) < 15 && p.y < 16;

// Zonas sin pasto (para no plantar matas encima)
const bare: { x: number; z: number; r: number }[] = [];
const isBare = (x: number, z: number) => bare.some((b) => Math.hypot(x - b.x, z - b.z) < b.r) || (Math.abs(x) < 24 && Math.abs(z + 30) < 17) || (Math.abs(x - 50) < 21 && Math.abs(z - 45) < 16);

export function buildWorld(s: B.Scene, low: boolean) {
  scene = s;
  tuftCount = low ? 12000 : 45000; // ~80% de la densidad del patio de 200 (2,56x de área)
  tuft = grassTuft();

  // Mesa de jardín gigante: la cámara se mete abajo (underRoof) y la tapa se tramea si tapa el auto (occluders)
  occluders.length = 0;
  for (const [x, z] of [[-14, -18], [14, -18], [-14, -42], [14, -42]]) occluders.push(stat(cyl(1.4, 1.4, 16, M.metal("#f1f5f9"), [x, 8, z], undefined, 10), B.PhysicsShapeType.CYLINDER));
  const top = box(34, 0.8, 30, M.matte("#f1f5f9"), [0, 16.4, -30]);
  shadows.addShadowCaster(top);
  occluders.push(top);

  // Suelo: césped + baldosas + huerta
  const GS = HALF * 2 + 60, gtex = TEX.grass();
  gtex.uScale = gtex.vScale = (14 * GS) / 260; // misma densidad de texel que en el patio de 200
  const ground = B.MeshBuilder.CreateGround("ground", { width: GS, height: GS }, scene);
  ground.material = pbr("grass", { color: "#ffffff", rough: 0.95, tex: gtex });
  ground.receiveShadows = true;
  const gcol = B.MeshBuilder.CreateBox("gcol", { width: GS, height: 2, depth: GS }, scene);
  gcol.position.y = -1;
  gcol.isVisible = false;
  new B.PhysicsAggregate(gcol, B.PhysicsShapeType.BOX, { mass: 0, friction: 0.7 }, scene);
  const patio = B.MeshBuilder.CreateGround("patio", { width: 48, height: 34 }, scene);
  patio.position.set(0, 0.02, -30);
  patio.material = pbr("tiles", { color: "#ffffff", rough: 0.6, tex: TEX.tiles() });
  patio.receiveShadows = true;
  const dirt = B.MeshBuilder.CreateGround("dirt", { width: 42, height: 32 }, scene);
  dirt.position.set(50, 0.02, 45);
  dirt.material = pbr("dirt", { color: "#ffffff", rough: 1, tex: TEX.dirt() });
  dirt.receiveShadows = true;
  // Surcos: lomos de tierra medio enterrados (radio 1,5, asoman 0,5): hacen saltar al auto pero se suben de costado
  for (let r = 0; r < 4; r++) stat(cyl(3, 3, 40, dirt.material!, [50, -1, 35 + r * 7], [0, 0, Math.PI / 2], 10), B.PhysicsShapeType.CYLINDER);
  for (let r = 0; r < 4; r++) for (let i = 0; i < 7; i++) {
    const x = 34 + i * 5.3, z = 35 + r * 7;
    for (let k = 0; k < 4; k++) { const l = sph(1.4, M.matte("#3f8f2f"), [x + Math.cos(k * 1.6) * 0.7, 1, z + Math.sin(k * 1.6) * 0.7], [1, 0.35, 1.8]); l.rotation.y = k * 1.6; shadows.addShadowCaster(l); }
  }

  // Cerca de madera (instancias) + paredes físicas
  const plank = template("plank", () => [box(2, 7, 0.4, pbr("wood", { color: "#ffffff", rough: 0.75, tex: TEX.wood() }), [0, 3.5, 0]), box(2, 0.3, 0.6, M.matte("#6b4a2b"), [0, 5.5, -0.3])]);
  for (let i = -HALF; i < HALF; i += 2.1) for (const [x, z, ry] of [[i, HALF, 0], [i, -HALF, 0], [HALF, i, Math.PI / 2], [-HALF, i, Math.PI / 2]] as const) {
    const p = plank.createInstance("pl");
    p.position.set(x, 0, z);
    p.rotation.y = ry;
    p.scaling.y = 0.9 + rng() * 0.2;
  }
  for (const [x, z, w, d] of [[0, HALF, HALF * 2 + 10, 2], [0, -HALF, HALF * 2 + 10, 2], [HALF, 0, 2, HALF * 2 + 10], [-HALF, 0, 2, HALF * 2 + 10]]) {
    const wall = B.MeshBuilder.CreateBox("wall", { width: w, height: 20, depth: d }, scene);
    wall.position.set(x, 10, z);
    wall.isVisible = false;
    new B.PhysicsAggregate(wall, B.PhysicsShapeType.BOX, { mass: 0 }, scene);
  }

  // Casa al fondo (da escala)
  const house = merge("house", [
    box(GS, 90, 6, M.matte("#efe6d8"), [0, 45, HALF + 14]),
    box(GS, 3, 10, M.matte("#8a5a44"), [0, 1.5, HALF + 12]),
    ...[-70, -25, 45, 90].map((x, i) => box(26, 30, 1, i === 1 ? M.glass() : M.glow(i % 2 ? "#ffb15c" : "#ffcf8a"), [x * K, 42, HALF + 10.6])),
    // Siluetas en las ventanas encendidas (alguien mirando el patio)
    box(7, 14, 0.4, M.matte("#1a1410"), [-66 * K, 36, HALF + 10]), sph(6, M.matte("#1a1410"), [-66 * K, 46, HALF + 10], [1, 1, 0.2], 6),
    box(5, 10, 0.4, M.matte("#1a1410"), [84 * K, 34, HALF + 10]),
    ...[-70, -25, 45, 90].map((x) => box(29, 33, 0.6, M.matte("#ffffff"), [x * K, 42, HALF + 10.9])),
    box(22, 40, 1, pbr("door", { color: "#ffffff", rough: 0.6, tex: TEX.wood() }), [10 * K, 20, HALF + 10.6]),
  ]);
  house.receiveShadows = true;
  occluders.push(house);

  // Árboles: troncos enormes, copa fuera de cuadro (sombras de hojas igual)
  for (const [x, z] of [[-75, -70], [78, -60], [-80, 70], [70, 85]].map(([x, z]) => [x * K, z * K])) {
    occluders.push(stat(cyl(7, 9, 70, pbr("bark", { color: "#ffffff", rough: 0.95, tex: TEX.bark() }), [x, 35, z]), B.PhysicsShapeType.CYLINDER));
    for (let k = 0; k < 5; k++) shadows.addShadowCaster(sph(40, M.matte("#2f6b2a"), [x + (rng() - 0.5) * 30, 72 + rng() * 10, z + (rng() - 0.5) * 30], [1, 0.7, 1], 6));
    bare.push({ x, z, r: 6 });
  }
  staticBare = bare.length;
}

// ---------- Layout por partida (depende de la semilla) ----------
let layoutMeshes: B.AbstractMesh[] = [];
let tuft: B.Mesh;
let tuftCount = 22000;
let staticBare = 0;
const clear = (x: number, z: number, r: number, m: number) => !isBare(x, z) && !bare.some((b) => Math.hypot(x - b.x, z - b.z) < b.r + r) && Math.hypot(x, z) > 14 + r && Math.abs(x) < HALF - m && Math.abs(z) < HALF - m;
// Busca un lugar libre al azar (con semilla). null si no encuentra.
// m: margen a la cerca
function freeSpot(r: number, m = 10): [number, number] | null {
  for (let i = 0; i < 40; i++) { const x = (rng() - 0.5) * (HALF - m) * 2, z = (rng() - 0.5) * (HALF - m) * 2; if (clear(x, z, r, m)) return [x, z]; }
  return null;
}
const between = (a: number, b: number) => a + rng() * (b - a);
const int = (a: number, b: number) => Math.floor(between(a, b + 1));

// Rampa maciza (prisma): sube L hasta H, meseta T, baja Lb (0 = corte vertical: borde de salto). Ancho W.
// Local: el pie en z=0, sube hacia +z. Se posa ANTES del aggregate (trampa de Havok).
function ramp(mat: B.Material, x: number, z: number, ry: number, W: number, L: number, H: number, T = 0, Lb = 0, y = 0, deco: B.Mesh[] = []) {
  const pr = [[0, 0], [L, H], ...(T ? [[L + T, H]] : []), [L + T + Lb, 0]];
  const n = pr.length, pos: number[] = [], ind: number[] = [];
  for (const sx of [-W / 2, W / 2]) for (const [pz, py] of pr) pos.push(sx, py, pz);
  for (let i = 1; i < n - 1; i++) ind.push(0, i, i + 1, n, n + i + 1, n + i); // caras laterales
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; ind.push(i, n + j, j, i, n + i, n + j); } // contorno
  const m = new B.Mesh("ramp", scene), vd = new B.VertexData();
  vd.positions = pos; vd.indices = ind;
  vd.applyToMesh(m);
  m.convertToFlatShadedMesh();
  m.material = mat;
  stat(m, B.PhysicsShapeType.CONVEX_HULL, { friction: 0.5 }, [x, y, z, ry]);
  const len = L + T + Lb;
  bare.push({ x: x + (Math.sin(ry) * len) / 2, z: z + (Math.cos(ry) * len) / 2, r: len / 2 + 1 });
  if (deco.length) { const d = merge("rampDeco", deco); d.position.set(x, y, z); d.rotation.y = ry; shadows.addShadowCaster(d); } // solo visual: se posa después sin problema
}
// Tablón apoyado sobre la subida de una rampa (adorno, coordenadas locales de ramp)
const slopeBoard = (W: number, L: number, H: number, mat: B.Material, th = 0.3) => box(W, th, Math.hypot(L, H), mat, [0, H / 2 + th / 2, L / 2], [-Math.atan2(H, L), 0, 0]);

export function clearLayout() {
  for (const m of layoutMeshes) { m.physicsBody?.dispose(); m.dispose(); }
  layoutMeshes = [];
  breakables.length = 0;
  bare.length = staticBare;
}

export function buildLayout() {
  clearLayout();
  const before = new Set(scene.meshes);

  // Pileta inflable: en una de varias esquinas del patio
  const [px, pz] = [[-48, 38], [55, -20], [-50, -55], [-60, 5]][int(0, 3)].map((v) => v * K);
  const pool = merge("pool", [
    tor(26, 3.4, M.plastic("#38bdf8"), [0, 1.7, 0], undefined, 32),
    tor(26, 3.4, M.plastic("#f8fafc"), [0, 4.6, 0], undefined, 32),
    water(),
  ]);
  pool.position.set(px, 0, pz);
  stat(pool, B.PhysicsShapeType.MESH);
  bare.push({ x: px, z: pz, r: 16 });
  // Mismas mallas ya creadas en buildWorld (pbr cachea por nombre: no se rehace la textura)
  const wood = pbr("wood", { color: "#ffffff" }), dirtM = pbr("dirt", { color: "#ffffff" }), brick = M.matte("#b45309");

  // TRAMO: puente angosto de tablones sobre la pileta (rampas de 7 m y tablero de 3,2 de ancho).
  // Caerse = al agua: piso invisible a 3 m y dos tablas de natación para saltar afuera por encima del borde.
  const bry = rng() * Math.PI, bdx = Math.sin(bry), bdz = Math.cos(bry);
  for (const s of [-1, 1]) ramp(brick, px + bdx * 31 * s, pz + bdz * 31 * s, s < 0 ? bry : bry + Math.PI, 3.2, 16, 7, 0, 0, 0, [slopeBoard(3.6, 16, 7, wood)]);
  stat(box(3.6, 0.5, 30.4, wood, [px, 6.75, pz], [0, bry, 0]), B.PhysicsShapeType.BOX);
  stat(cyl(23, 23, 3, M.matte("#4fb3e8"), [px, 1.5, pz], undefined, 16), B.PhysicsShapeType.CYLINDER).isVisible = false;
  for (const s of [-1, 1]) { const ry = bry + (s * Math.PI) / 2; ramp(M.plastic("#facc15"), px + Math.sin(ry) * 4, pz + Math.cos(ry) * 4, ry, 3, 7.3, 3.8, 0, 0, 3); }

  // Rampas de juguete: 3 a 5 por partida, tipo/lugar/rumbo según la semilla
  const orange = M.plastic("#f97316"), rail = M.plastic("#c2410c");
  for (let i = 0, n = int(3, 5), off = int(0, 3); i < n; i++) {
    const sp = freeSpot(16, 30); if (!sp) continue; // lejos de la cerca: la pista curva y el aterrizaje ocupan ~25 m
    const ry = Math.atan2(-sp[0], -sp[1]) + (rng() - 0.5) * 1.6, dx = Math.sin(ry), dz = Math.cos(ry); // saltan hacia el medio del patio
    const kind = (off + i) % 4;
    if (kind === 0) {
      // Tabla sobre una pila de ladrillos: salto corto y seco
      ramp(brick, sp[0] - dx * 6.5, sp[1] - dz * 6.5, ry, 4, 10, 2.6, 0, 3, 0, [slopeBoard(4.4, 10, 2.6, wood)]);
    } else if (kind === 1) {
      // Pista de autitos de plástico: curva en el piso que termina en un trampolín naranja
      const sg = rng() < 0.5 ? -1 : 1, R = 14, deco: B.Mesh[] = [];
      for (let k = 0; k < 12; k++) {
        const a0 = (k / 12) * 1.6, a1 = ((k + 1) / 12) * 1.6;
        const p0 = [sg * (R - R * Math.cos(a0)), -R * Math.sin(a0)], p1 = [sg * (R - R * Math.cos(a1)), -R * Math.sin(a1)];
        const mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2, yaw = Math.atan2(p1[0] - p0[0], p1[1] - p0[1]), len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + 0.1;
        deco.push(box(3.4, 0.1, len, orange, [mx, 0.05, mz], [0, yaw, 0]));
        for (const e of [-1.8, 1.8]) deco.push(box(0.25, 0.35, len, rail, [mx + Math.cos(yaw) * e, 0.17, mz - Math.sin(yaw) * e], [0, yaw, 0]));
      }
      for (const e of [-1.8, 1.8]) { const b = slopeBoard(0.25, 8, 2.2, rail, 0.35); b.position.x = e; b.position.y += 0.15; deco.push(b); }
      const fx = sp[0] - dx * 6, fz = sp[1] - dz * 6;
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

  // TRAMO: pasillo entre macetas de cemento (no se rompen ni dan premio: es un desfiladero, no un cofre)
  if (rng() < 0.75) {
    const sp = freeSpot(20);
    if (sp) {
      const ry = rng() * Math.PI, dx = Math.sin(ry), dz = Math.cos(ry), parts: B.Mesh[] = [];
      for (let k = 0; k < 8; k++) for (const e of [-3.6, 3.6]) {
        const t = (k - 3.5) * 4.4, x = sp[0] + dx * t + dz * e, z = sp[1] + dz * t - dx * e;
        stat(cyl(3.2, 3.2, 2.6, M.matte("#8a8f94"), [x, 1.3, z], undefined, 10), B.PhysicsShapeType.CYLINDER).isVisible = false;
        parts.push(cyl(3.2, 2.6, 2.6, M.matte("#8a8f94"), [x, 1.3, z], undefined, 10), cyl(2.8, 2.8, 0.2, M.matte("#4a3420"), [x, 2.55, z], undefined, 10));
        for (let l = 0; l < 3; l++) { const a = l * 2.1 + k; const lf = sph(2, M.matte(l % 2 ? "#3f8f2f" : "#4ea83a"), [x + Math.cos(a) * 0.6, 3.3, z + Math.sin(a) * 0.6], [0.4, 0.2, 1.4]); lf.rotation.set(0.6, -a + Math.PI / 2, 0); parts.push(lf); }
        bare.push({ x, z, r: 1.8 });
      }
      shadows.addShadowCaster(merge("planters", parts));
    }
  }

  // TRAMO: juguetes desparramados (bloques y pelotitas sueltas que hacen patinar)
  if (rng() < 0.75) {
    const sp = freeSpot(13);
    if (sp) {
      const toy = ["#ef4444", "#3b82f6", "#facc15", "#22c55e", "#a855f7"];
      for (let k = 0; k < 26; k++) {
        const a = rng() * 6.3, r = Math.sqrt(rng()) * 11, s = between(0.7, 1.5), c = toy[int(0, 4)];
        breakable(dyn(box(s, s * between(0.6, 1), s * between(1, 2), M.plastic(c), [sp[0] + Math.cos(a) * r, s / 2, sp[1] + Math.sin(a) * r], [0, rng() * 6.3, 0]), B.PhysicsShapeType.BOX, 0.3), 25, s * 0.7, c);
      }
      for (let k = 0; k < 5; k++) { const a = rng() * 6.3, r = Math.sqrt(rng()) * 10; dyn(sph(1.4, M.plastic(toy[k]), [sp[0] + Math.cos(a) * r, 0.7, sp[1] + Math.sin(a) * r], undefined, 10), B.PhysicsShapeType.SPHERE, 0.4); }
      bare.push({ x: sp[0], z: sp[1], r: 12 });
    }
  }

  // Macetas con plantas: cantidad, lugar y tamaño según la semilla
  const pots: [number, number, number][] = [];
  for (let i = 0, n = int(5, 10); i < n; i++) { const sc = between(0.8, 1.35), p = freeSpot(6 * sc); if (p) { pots.push([p[0], p[1], sc]); bare.push({ x: p[0], z: p[1], r: 3 * sc }); } }
  for (const [x, z, sc] of pots) {
    const pot = stat(merge("pot", [
      cyl(5 * sc, 4 * sc, 4 * sc, M.matte("#c2410c"), [0, 2 * sc, 0], undefined, 16),
      cyl(5.4 * sc, 5.4 * sc, 0.6 * sc, M.matte("#9a3412"), [0, 3.9 * sc, 0], undefined, 16),
      cyl(4.6 * sc, 4.6 * sc, 0.2 * sc, M.matte("#4a3420"), [0, 4.1 * sc, 0], undefined, 16),
    ]), B.PhysicsShapeType.CYLINDER, {}, [x, 0, z]);
    const extras: B.Mesh[] = [];
    breakable(pot, 120 * sc, 2.6 * sc, "#c2410c", true, extras);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      const leaf = sph(3 * sc, M.matte(k % 2 ? "#3f8f2f" : "#4ea83a"), [x + Math.cos(a) * 1.3 * sc, 5.5 * sc, z + Math.sin(a) * 1.3 * sc], [0.4, 0.2, 1.4]);
      leaf.rotation.set(0.6, -a + Math.PI / 2, 0);
      shadows.addShadowCaster(leaf);
      extras.push(leaf);
    }
    const flower = sph(1.2 * sc, M.plastic(["#f43f5e", "#facc15", "#a855f7"][Math.floor(rng() * 3)]), [x, 7 * sc, z]);
    shadows.addShadowCaster(flower);
    extras.push(flower);
  }

  // Piedras
  for (let i = 0, n = int(10, 26); i < n; i++) {
    const spot = freeSpot(4);
    if (!spot) continue;
    const [x, z] = spot;
    const r = B.MeshBuilder.CreatePolyhedron("rock", { type: 2, size: 1 }, scene);
    r.convertToFlatShadedMesh();
    r.material = pbr("stone", { color: "#ffffff", rough: 0.9, tex: TEX.stone() });
    r.scaling.set(1.5 + rng() * 3, 0.8 + rng() * 1.5, 1.5 + rng() * 3);
    r.rotation.y = rng() * 6;
    r.position.set(x, r.scaling.y * 0.4, z);
    stat(r, B.PhysicsShapeType.CONVEX_HULL);
    bare.push({ x, z, r: r.scaling.x });
  }

  // Enanos de jardín
  const gnomes: [number, number, number][] = [];
  for (let i = 0, n = int(1, 3); i < n; i++) { const p = freeSpot(5); if (p) { gnomes.push([p[0], p[1], rng() * 6.3]); bare.push({ x: p[0], z: p[1], r: 2.5 }); } }
  for (const [x, z, ry] of gnomes) {
    const g = stat(merge("gnome", [
      cyl(2.4, 3.6, 4, M.plastic("#2563eb"), [0, 2, 0], undefined, 12),
      cyl(2.6, 2.6, 0.5, M.plastic("#78350f"), [0, 2.6, 0], undefined, 12),
      sph(2.4, M.plastic("#f5c7a9"), [0, 5, 0]),
      cyl(0.1, 2.6, 2.4, M.plastic("#f8fafc"), [0, 3.6, 0.8], [Math.PI - 0.3, 0, 0], 10),
      cyl(0.05, 2.6, 3.4, M.plastic("#dc2626"), [0, 7, 0], [-0.2, 0, 0], 12),
      sph(0.6, M.plastic("#f59e9e"), [0, 5, 1.15]),
    ]), B.PhysicsShapeType.CYLINDER, {}, [x, 0, z, ry]);
  }

  // Manguera enrollada con su tramo serpenteando por el pasto
  const hs = freeSpot(8);
  if (hs) {
    const [hx, hz] = hs;
    const hose = merge("hose", [0, 1, 2, 3].map((i) => tor(9 - i * 0.2, 0.9, M.plastic("#22c55e"), [0, 0.45 + i * 0.85, 0], undefined, 24)));
    hose.position.set(hx, 0, hz);
    stat(hose, B.PhysicsShapeType.MESH);
    bare.push({ x: hx, z: hz, r: 5 });
    const a0 = rng() * 6.3, path: [number, number, number][] = [[hx + Math.cos(a0) * 4.6, 0.4, hz + Math.sin(a0) * 4.6]];
    for (let k = 1; k < 5; k++) path.push([path[k - 1][0] + Math.cos(a0 + (rng() - 0.5)) * 9, 0.4, path[k - 1][2] + Math.sin(a0 + (rng() - 0.5)) * 9]);
    tube(path, 0.45, M.plastic("#22c55e")).receiveShadows = true;
  }

  const cs = freeSpot(5) ?? [-70, -40];
  bare.push({ x: cs[0], z: cs[1], r: 3 });

  // Regadera
  const can = stat(merge("can", [
    cyl(5, 5, 6, M.metal("#15803d"), [0, 3, 0], undefined, 16),
    tube([[0, 2, 2.4], [0, 5, 5], [0, 6.5, 6.5]], 0.35, M.metal("#15803d")),
    tor(4, 0.4, M.metal("#15803d"), [0, 6.8, -1], [0, Math.PI / 2, Math.PI / 2], 12),
  ]), B.PhysicsShapeType.CYLINDER, {}, [cs[0], 0, cs[1]]);

  // Objetos empujables: bloques, ladrillos, pelota
  const colors = ["#ef4444", "#3b82f6", "#facc15", "#22c55e", "#a855f7"];
  // Pilas de bloques de juguete (pirámides) y paredes de ladrillos, en lugares libres
  for (let pile = 0, np = int(1, 3); pile < np; pile++) {
    const sp = freeSpot(8); if (!sp) continue;
    const [bx, bz] = sp, rows = int(2, 4);
    for (let r = 0; r < rows; r++) for (let i = 0; i < rows - r + 1; i++) { const c = colors[int(0, 4)]; breakable(dyn(box(2, 2, 2, M.plastic(c), [bx + (i - (rows - r) / 2) * 2.2, 1 + r * 2.05, bz]), B.PhysicsShapeType.BOX, 0.6), 40, 1.2, c); }
    bare.push({ x: bx, z: bz, r: 6 });
  }
  for (let wall = 0, nw = int(1, 2); wall < nw; wall++) {
    const sp = freeSpot(8); if (!sp) continue;
    const [wx, wz] = sp;
    for (let i = 0; i < 8; i++) breakable(dyn(box(3, 1.4, 1.5, M.matte("#b45309"), [wx + (i % 4) * 3.1 - 4.6, 0.7 + Math.floor(i / 4) * 1.45, wz]), B.PhysicsShapeType.BOX, 1.2), 60, 1.5, "#b45309");
    bare.push({ x: wx, z: wz, r: 7 });
  }

  // Charcos: espejos de agua en el pasto
  for (let i = 0, n = int(3, 10); i < n; i++) {
    const spot = freeSpot(5); if (!spot) continue;
    const [x, z] = spot;
    const pd = B.MeshBuilder.CreateDisc("puddle", { radius: 1, tessellation: 20 }, scene);
    pd.rotation.x = Math.PI / 2;
    pd.scaling.set(3 + rng() * 4, 2 + rng() * 3, 1);
    pd.position.set(x, 0.035, z);
    pd.material = pbr("puddle", { color: "#3b4a52", rough: 0.03, metal: 0.2, alpha: 0.85 });
    pd.receiveShadows = true;
    bare.push({ x, z, r: pd.scaling.x });
  }
  const ballTex = canvasTex(256, (c, s) => { c.fillStyle = "#fafafa"; c.fillRect(0, 0, s, s); c.fillStyle = "#111"; for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) { c.beginPath(); c.arc(i * 32 + 16, j * 64 + 32, 12, 0, 7); c.fill(); } });
  const bs = freeSpot(4) ?? [10, 10];
  dyn(sph(5, pbr("ball", { color: "#ffffff", rough: 0.4, tex: ballTex }), [bs[0], 2.5, bs[1]], undefined, 16), B.PhysicsShapeType.SPHERE, 2);

  layoutMeshes = scene.meshes.filter((m) => !before.has(m));

  // Pasto: miles de matas como thin instances de una sola malla (evita lo que ocupa el layout)
  const n = tuftCount;
  const mats = new Float32Array(n * 16);
  const q = new B.Quaternion(), sc = new B.Vector3(), p = new B.Vector3(), m = new B.Matrix();
  let k = 0;
  for (let tries = 0; k < n && tries < n * 3; tries++) {
    const x = (rng() - 0.5) * (HALF - 1) * 2, z = (rng() - 0.5) * (HALF - 1) * 2;
    if (isBare(x, z)) continue;
    const s = 0.6 + rng() * 0.9;
    sc.set(s, s * (0.7 + rng() * 0.8), s);
    B.Quaternion.RotationYawPitchRollToRef(rng() * 6.3, 0, 0, q);
    p.set(x, 0, z);
    B.Matrix.ComposeToRef(sc, q, p, m);
    m.copyToArray(mats, k++ * 16);
  }
  tuft.thinInstanceSetBuffer("matrix", mats.subarray(0, k * 16), 16, true);
}

function water() {
  const w = B.MeshBuilder.CreateDisc("w", { radius: 12, tessellation: 32 }, scene);
  w.rotation.x = Math.PI / 2;
  w.position.y = 3.2;
  w.material = pbr("water", { color: "#4fb3e8", rough: 0.02, alpha: 0.8 });
  return w;
}

function grassTuft() {
  const pos: number[] = [], ind: number[] = [], col: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rng();
    const r = rng() * 0.25, w = 0.07, h = 0.25 + rng() * 0.3; // bajo: no tapar enemigos de 0.6
    const bx = Math.cos(a) * r, bz = Math.sin(a) * r, lean = 0.2 + rng() * 0.2;
    const px = -Math.sin(a) * w, pz = Math.cos(a) * w;
    const b = pos.length / 3;
    pos.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, bx + Math.cos(a) * lean, h, bz + Math.sin(a) * lean);
    ind.push(b, b + 1, b + 2);
    const g = 0.75 + rng() * 0.25;
    col.push(0.16 * g, 0.2 * g, 0.1 * g, 1, 0.16 * g, 0.2 * g, 0.1 * g, 1, 0.36 * g, 0.38 * g, 0.2 * g, 1); // pasto seco, apagado
  }
  const m = new B.Mesh("tuft", scene);
  const vd = new B.VertexData();
  vd.positions = pos; vd.indices = ind; vd.colors = col;
  vd.normals = [];
  B.VertexData.ComputeNormals(pos, ind, vd.normals);
  vd.applyToMesh(m);
  const mat = pbr("tuftMat", { color: "#ffffff", rough: 0.9 });
  new WindPlugin(mat);
  mat.backFaceCulling = false;
  mat.twoSidedLighting = true;
  m.material = mat;
  m.receiveShadows = true;
  m.isPickable = false;
  return m;
}

// ---------- Viento + pasto que se aplasta al pasar el auto (shader de vértices) ----------
let windT = 0;
const windCar = new B.Vector3(0, -100, 0);
export function setWind(t: number, car: B.Vector3 | null) { windT = t; if (car) windCar.copyFrom(car); }

class WindPlugin extends B.MaterialPluginBase {
  constructor(m: B.Material) { super(m, "Wind", 200, { WIND: false }); this._enable(true); }
  getClassName() { return "WindPlugin"; }
  prepareDefines(d: B.MaterialDefines) { d["WIND"] = true; }
  getUniforms() {
    return { ubo: [{ name: "windTime", size: 1, type: "float" }, { name: "windCar", size: 3, type: "vec3" }], vertex: "uniform float windTime;\nuniform vec3 windCar;" };
  }
  bindForSubMesh(ubo: B.UniformBuffer) { ubo.updateFloat("windTime", windT); ubo.updateVector3("windCar", windCar); }
  getCustomCode(type: string) {
    if (type !== "vertex") return null;
    return {
      CUSTOM_VERTEX_UPDATE_WORLDPOS: `
        float gh = max(worldPos.y, 0.0);
        float gw = sin(windTime * 1.7 + worldPos.x * 0.33 + worldPos.z * 0.21) + 0.45 * sin(windTime * 3.3 + worldPos.z * 0.9);
        worldPos.xz += vec2(0.8, 0.5) * gw * gh * 0.16;
        vec2 gd = worldPos.xz - windCar.xz;
        float gp = 1.0 - smoothstep(0.7, 2.4, length(gd));
        worldPos.xz += normalize(gd + vec2(0.0001)) * gp * gh * 0.9;
        worldPos.y = mix(worldPos.y, worldPos.y * 0.15, gp);
      `,
    };
  }
}

// Obstáculos del patio (círculos) para IA / bot
export const obstacles = () => bare;

// Punto de aparición aleatorio en un anillo alrededor del jugador, dentro del patio
export function spawnPoint(center: B.Vector3, rMin: number, rMax: number) {
  for (let i = 0; i < 10; i++) {
    const a = rng() * Math.PI * 2, r = rMin + rng() * (rMax - rMin);
    const x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r;
    if (Math.abs(x) < HALF - 4 && Math.abs(z) < HALF - 4 && !bare.some((b) => Math.hypot(x - b.x, z - b.z) < b.r + 2)) return new B.Vector3(x, 1, z);
  }
  return new B.Vector3(B.Scalar.Clamp(center.x + rMin, -HALF + 5, HALF - 5), 1, B.Scalar.Clamp(center.z, -HALF + 5, HALF - 5));
}
