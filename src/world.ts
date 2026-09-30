import * as B from "@babylonjs/core";
import { box, cyl, merge, sph, template, tor, tube } from "./models";
import { debris } from "./fx";
import { canvasTex, M, pbr, shadows, TEX } from "./render";

// Patio de 200x200. Un auto RC mide ~2 unidades: una maceta es un edificio.
export const HALF = 100;

let scene: B.Scene;
const stat = (m: B.Mesh, shape: B.PhysicsShapeType, o: Partial<B.PhysicsAggregateParameters> = {}) => {
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

// Zonas sin pasto (para no plantar matas encima)
const bare: { x: number; z: number; r: number }[] = [];
const isBare = (x: number, z: number) => bare.some((b) => Math.hypot(x - b.x, z - b.z) < b.r) || (Math.abs(x) < 24 && Math.abs(z + 30) < 17) || (Math.abs(x - 50) < 21 && Math.abs(z - 45) < 16);

export function buildWorld(s: B.Scene, low: boolean) {
  scene = s;

  // Suelo: césped + baldosas + huerta
  const ground = B.MeshBuilder.CreateGround("ground", { width: 260, height: 260 }, scene);
  ground.material = pbr("grass", { color: "#ffffff", rough: 0.95, tex: TEX.grass() });
  ground.receiveShadows = true;
  const gcol = B.MeshBuilder.CreateBox("gcol", { width: 260, height: 2, depth: 260 }, scene);
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
  for (let r = 0; r < 4; r++) for (let i = 0; i < 7; i++) {
    const x = 34 + i * 5.3, z = 35 + r * 7;
    for (let k = 0; k < 4; k++) { const l = sph(1.4, M.matte("#3f8f2f"), [x + Math.cos(k * 1.6) * 0.7, 0.5, z + Math.sin(k * 1.6) * 0.7], [1, 0.35, 1.8]); l.rotation.y = k * 1.6; shadows.addShadowCaster(l); }
  }

  // Cerca de madera (instancias) + paredes físicas
  const plank = template("plank", () => [box(2, 7, 0.4, pbr("wood", { color: "#ffffff", rough: 0.75, tex: TEX.wood() }), [0, 3.5, 0]), box(2, 0.3, 0.6, M.matte("#6b4a2b"), [0, 5.5, -0.3])]);
  for (let i = -HALF; i < HALF; i += 2.1) for (const [x, z, ry] of [[i, HALF, 0], [i, -HALF, 0], [HALF, i, Math.PI / 2], [-HALF, i, Math.PI / 2]] as const) {
    const p = plank.createInstance("pl");
    p.position.set(x, 0, z);
    p.rotation.y = ry;
    p.scaling.y = 0.9 + Math.random() * 0.2;
  }
  for (const [x, z, w, d] of [[0, HALF, 210, 2], [0, -HALF, 210, 2], [HALF, 0, 2, 210], [-HALF, 0, 2, 210]]) {
    const wall = B.MeshBuilder.CreateBox("wall", { width: w, height: 20, depth: d }, scene);
    wall.position.set(x, 10, z);
    wall.isVisible = false;
    new B.PhysicsAggregate(wall, B.PhysicsShapeType.BOX, { mass: 0 }, scene);
  }

  // Casa al fondo (da escala)
  const house = merge("house", [
    box(260, 90, 6, M.matte("#efe6d8"), [0, 45, HALF + 14]),
    box(260, 3, 10, M.matte("#8a5a44"), [0, 1.5, HALF + 12]),
    ...[-70, -25, 45, 90].map((x) => box(26, 30, 1, M.glass(), [x, 42, HALF + 10.6])),
    ...[-70, -25, 45, 90].map((x) => box(29, 33, 0.6, M.matte("#ffffff"), [x, 42, HALF + 10.9])),
    box(22, 40, 1, pbr("door", { color: "#ffffff", rough: 0.6, tex: TEX.wood() }), [10, 20, HALF + 10.6]),
  ]);
  house.receiveShadows = true;

  // Árboles: troncos enormes, copa fuera de cuadro (sombras de hojas igual)
  for (const [x, z] of [[-75, -70], [78, -60], [-80, 70], [70, 85]]) {
    stat(cyl(7, 9, 70, pbr("bark", { color: "#ffffff", rough: 0.95, tex: TEX.bark() }), [x, 35, z]), B.PhysicsShapeType.CYLINDER);
    for (let k = 0; k < 5; k++) shadows.addShadowCaster(sph(40, M.matte("#2f6b2a"), [x + (Math.random() - 0.5) * 30, 72 + Math.random() * 10, z + (Math.random() - 0.5) * 30], [1, 0.7, 1], 6));
    bare.push({ x, z, r: 6 });
  }

  // Pileta inflable
  const pool = merge("pool", [
    tor(26, 3.4, M.plastic("#38bdf8"), [0, 1.7, 0], undefined, 32),
    tor(26, 3.4, M.plastic("#f8fafc"), [0, 4.6, 0], undefined, 32),
    water(),
  ]);
  pool.position.set(-48, 0, 38);
  stat(pool, B.PhysicsShapeType.MESH);
  bare.push({ x: -48, z: 38, r: 16 });

  // Macetas con plantas
  for (const [x, z, sc] of [[-20, -8, 1], [20, -8, 1.2], [-30, 5, 0.9], [30, 10, 1.1], [0, 30, 1.3], [-60, -20, 1], [65, 5, 1.2], [-15, 65, 1]]) {
    const pot = stat(merge("pot", [
      cyl(5 * sc, 4 * sc, 4 * sc, M.matte("#c2410c"), [0, 2 * sc, 0], undefined, 16),
      cyl(5.4 * sc, 5.4 * sc, 0.6 * sc, M.matte("#9a3412"), [0, 3.9 * sc, 0], undefined, 16),
      cyl(4.6 * sc, 4.6 * sc, 0.2 * sc, M.matte("#4a3420"), [0, 4.1 * sc, 0], undefined, 16),
    ]), B.PhysicsShapeType.CYLINDER);
    pot.position.set(x, 0, z);
    const extras: B.Mesh[] = [];
    breakable(pot, 120 * sc, 2.6 * sc, "#c2410c", true, extras);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      const leaf = sph(3 * sc, M.matte(k % 2 ? "#3f8f2f" : "#4ea83a"), [x + Math.cos(a) * 1.3 * sc, 5.5 * sc, z + Math.sin(a) * 1.3 * sc], [0.4, 0.2, 1.4]);
      leaf.rotation.set(0.6, -a + Math.PI / 2, 0);
      shadows.addShadowCaster(leaf);
      extras.push(leaf);
    }
    const flower = sph(1.2 * sc, M.plastic(["#f43f5e", "#facc15", "#a855f7"][Math.floor(Math.random() * 3)]), [x, 7 * sc, z]);
    shadows.addShadowCaster(flower);
    extras.push(flower);
    bare.push({ x, z, r: 3 * sc });
  }

  // Piedras
  for (let i = 0; i < 18; i++) {
    const x = (Math.random() - 0.5) * 180, z = (Math.random() - 0.5) * 180;
    if (Math.hypot(x, z) < 15 || isBare(x, z)) continue;
    const r = B.MeshBuilder.CreatePolyhedron("rock", { type: 2, size: 1 }, scene);
    r.convertToFlatShadedMesh();
    r.material = pbr("stone", { color: "#ffffff", rough: 0.9, tex: TEX.stone() });
    r.scaling.set(1.5 + Math.random() * 3, 0.8 + Math.random() * 1.5, 1.5 + Math.random() * 3);
    r.rotation.y = Math.random() * 6;
    r.position.set(x, r.scaling.y * 0.4, z);
    stat(r, B.PhysicsShapeType.CONVEX_HULL);
    bare.push({ x, z, r: r.scaling.x });
  }

  // Enanos de jardín
  for (const [x, z, ry] of [[-10, 50, 0.5], [60, -40, -2.2]]) {
    const g = stat(merge("gnome", [
      cyl(2.4, 3.6, 4, M.plastic("#2563eb"), [0, 2, 0], undefined, 12),
      cyl(2.6, 2.6, 0.5, M.plastic("#78350f"), [0, 2.6, 0], undefined, 12),
      sph(2.4, M.plastic("#f5c7a9"), [0, 5, 0]),
      cyl(0.1, 2.6, 2.4, M.plastic("#f8fafc"), [0, 3.6, 0.8], [Math.PI - 0.3, 0, 0], 10),
      cyl(0.05, 2.6, 3.4, M.plastic("#dc2626"), [0, 7, 0], [-0.2, 0, 0], 12),
      sph(0.6, M.plastic("#f59e9e"), [0, 5, 1.15]),
    ]), B.PhysicsShapeType.CYLINDER);
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    bare.push({ x, z, r: 2.5 });
  }

  // Mesa de jardín gigante sobre el patio (solo las patas colisionan)
  for (const [x, z] of [[-14, -18], [14, -18], [-14, -42], [14, -42]]) stat(cyl(1.4, 1.4, 16, M.metal("#f1f5f9"), [x, 8, z], undefined, 10), B.PhysicsShapeType.CYLINDER);
  const top = box(34, 0.8, 30, M.matte("#f1f5f9"), [0, 16.4, -30]);
  shadows.addShadowCaster(top);

  // Manguera enrollada
  const hose = merge("hose", [0, 1, 2, 3].map((i) => tor(9 - i * 0.2, 0.9, M.plastic("#22c55e"), [0, 0.45 + i * 0.85, 0], undefined, 24)));
  hose.position.set(38, 0, -60);
  stat(hose, B.PhysicsShapeType.MESH);
  bare.push({ x: 38, z: -60, r: 5 });
  const run = tube([[38, 0.4, -55.5], [30, 0.4, -45], [18, 0.4, -48], [6, 0.4, -50]], 0.45, M.plastic("#22c55e"));
  run.receiveShadows = true;

  // Regadera
  const can = stat(merge("can", [
    cyl(5, 5, 6, M.metal("#15803d"), [0, 3, 0], undefined, 16),
    tube([[0, 2, 2.4], [0, 5, 5], [0, 6.5, 6.5]], 0.35, M.metal("#15803d")),
    tor(4, 0.4, M.metal("#15803d"), [0, 6.8, -1], [0, Math.PI / 2, Math.PI / 2], 12),
  ]), B.PhysicsShapeType.CYLINDER);
  can.position.set(-70, 0, -40);
  bare.push({ x: -70, z: -40, r: 3 });

  // Objetos empujables: bloques, ladrillos, pelota
  const colors = ["#ef4444", "#3b82f6", "#facc15", "#22c55e", "#a855f7"];
  for (let i = 0; i < 14; i++) breakable(dyn(box(2, 2, 2, M.plastic(colors[i % 5]), [-8 + (i % 5) * 2.2, 1 + Math.floor(i / 5) * 2.05, -35]), B.PhysicsShapeType.BOX, 0.6), 40, 1.2, colors[i % 5]);
  for (let i = 0; i < 8; i++) breakable(dyn(box(3, 1.4, 1.5, M.matte("#b45309"), [18 + (i % 4) * 3.1, 0.7 + Math.floor(i / 4) * 1.45, 20]), B.PhysicsShapeType.BOX, 1.2), 60, 1.5, "#b45309");

  // Charcos: espejos de agua en el pasto
  for (let i = 0; i < 7; i++) {
    const x = (Math.random() - 0.5) * 170, z = (Math.random() - 0.5) * 170;
    if (isBare(x, z) || Math.hypot(x, z) < 12) continue;
    const pd = B.MeshBuilder.CreateDisc("puddle", { radius: 1, tessellation: 20 }, scene);
    pd.rotation.x = Math.PI / 2;
    pd.scaling.set(3 + Math.random() * 4, 2 + Math.random() * 3, 1);
    pd.position.set(x, 0.035, z);
    pd.material = pbr("puddle", { color: "#3b4a52", rough: 0.03, metal: 0.2, alpha: 0.85 });
    pd.receiveShadows = true;
    bare.push({ x, z, r: pd.scaling.x });
  }
  const ballTex = canvasTex(256, (c, s) => { c.fillStyle = "#fafafa"; c.fillRect(0, 0, s, s); c.fillStyle = "#111"; for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) { c.beginPath(); c.arc(i * 32 + 16, j * 64 + 32, 12, 0, 7); c.fill(); } });
  dyn(sph(5, pbr("ball", { color: "#ffffff", rough: 0.4, tex: ballTex }), [10, 2.5, 10], undefined, 16), B.PhysicsShapeType.SPHERE, 2);

  // Pasto: miles de matas como thin instances de una sola malla
  const tuft = grassTuft();
  const n = low ? 6000 : 22000;
  const mats = new Float32Array(n * 16);
  const q = new B.Quaternion(), sc = new B.Vector3(), p = new B.Vector3(), m = new B.Matrix();
  let k = 0;
  for (let tries = 0; k < n && tries < n * 3; tries++) {
    const x = (Math.random() - 0.5) * 198, z = (Math.random() - 0.5) * 198;
    if (isBare(x, z)) continue;
    const s = 0.6 + Math.random() * 0.9;
    sc.set(s, s * (0.7 + Math.random() * 0.8), s);
    B.Quaternion.RotationYawPitchRollToRef(Math.random() * 6.3, 0, 0, q);
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
    const a = (i / 6) * Math.PI * 2 + Math.random();
    const r = Math.random() * 0.25, w = 0.07, h = 0.5 + Math.random() * 0.6;
    const bx = Math.cos(a) * r, bz = Math.sin(a) * r, lean = 0.2 + Math.random() * 0.2;
    const px = -Math.sin(a) * w, pz = Math.cos(a) * w;
    const b = pos.length / 3;
    pos.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, bx + Math.cos(a) * lean, h, bz + Math.sin(a) * lean);
    ind.push(b, b + 1, b + 2);
    const g = 0.75 + Math.random() * 0.25;
    col.push(0.2 * g, 0.38 * g, 0.1 * g, 1, 0.2 * g, 0.38 * g, 0.1 * g, 1, 0.45 * g, 0.7 * g, 0.25 * g, 1);
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

// Punto de aparición aleatorio en un anillo alrededor del jugador, dentro del patio
export function spawnPoint(center: B.Vector3, rMin: number, rMax: number) {
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2, r = rMin + Math.random() * (rMax - rMin);
    const x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r;
    if (Math.abs(x) < HALF - 4 && Math.abs(z) < HALF - 4 && !bare.some((b) => Math.hypot(x - b.x, z - b.z) < b.r + 2)) return new B.Vector3(x, 1, z);
  }
  return new B.Vector3(B.Scalar.Clamp(center.x + rMin, -HALF + 5, HALF - 5), 1, B.Scalar.Clamp(center.z, -HALF + 5, HALF - 5));
}
