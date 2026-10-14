import * as B from "@babylonjs/core";
import { box, cyl, merge, sph, template } from "../models";
import { debris, splat } from "../fx";
import { canvasTex, M, pbr, shadows, surface, TEX, type Surf } from "../render";
import { rng } from "../rng";
import { FOLD, FOLDED_SLICE } from "../folded";
import { crateDetail, fencePanel, realCarFold } from "../folded_slice";
import type { Climate } from "../run";

export let HALF = 160;
export const setHalf = (h: number) => { HALF = h; };
export const setScene = (s: B.Scene, low: boolean) => { scene = s; lowQ = low; };
export let Z!: Zone; // la zona actual (world.ts la fija); zonas y layout la leen de aca para no importar world.ts
export let zoneId: ZoneId = "patio";
export const setZ = (z: Zone, id: ZoneId) => { Z = z; zoneId = id; };
// Estado compartido que world.ts rearma y el layout/pasto leen (objetos mutables: un `let` exportado no se reasigna desde afuera)
export const st = { tuft: undefined as unknown as B.Mesh, tuftCount: 22000, staticBare: 0 };
export const worldMeshes: B.AbstractMesh[] = [];
export const layoutMeshes: B.AbstractMesh[] = [];
export const undo: (() => void)[] = [];
export const onClear: (() => void)[] = []; // las zonas registran aca como limpiar su estado de layout (aspersores)
export let scene: B.Scene;
export let lowQ = false;
// El cuerpo toma la pose de la malla al crearse: posicionar SIEMPRE antes (at), nunca después.
export const stat = (m: B.Mesh, shape: B.PhysicsShapeType, o: Partial<B.PhysicsAggregateParameters> = {}, at?: [number, number, number, number?]) => {
  if (at) { m.position.set(at[0], at[1], at[2]); if (at[3] !== undefined) m.rotation.y = at[3]; }
  new B.PhysicsAggregate(m, shape, { mass: 0, friction: 0.6, ...o }, scene);
  shadows.addShadowCaster(m);
  m.receiveShadows = true;
  return m;
};
export const dyn = (m: B.Mesh, shape: B.PhysicsShapeType, mass: number) => {
  new B.PhysicsAggregate(m, shape, { mass, friction: 0.5, restitution: 0.3 }, scene);
  shadows.addShadowCaster(m);
  m.receiveShadows = true;
  return m;
};
// Texturas procedurales: una por clave (cambiar de zona no las vuelve a dibujar)
export const texs: Record<string, B.Texture> = {};
export const texGen: Record<string, () => B.Texture> = {};
export const tex = (k: string, f: () => B.Texture) => { texGen[k] = f; return (texs[k] ??= f()); };
/** Texturas 256/512 (Configuración → Imagen): al cambiar el tope se redibujan y se cambian en los materiales, que las referencian. Corre al armar la próxima partida. */
export function retex() {
  for (const k of Object.keys(texs)) {
    const o = texs[k], n = texGen[k]();
    for (const m of scene.materials) if (m instanceof B.PBRMaterial && m.albedoTexture === o) m.albedoTexture = n;
    o.dispose(); texs[k] = n;
  }
}
export const woodM = () => (FOLDED_SLICE ? FOLD.painted("#8a6a44", 0.8, 301) : pbr("wood", { color: "#ffffff", rough: 0.75, tex: tex("wood", TEX.wood) })); // Folded: tablón de chapa

// Materiales PBR con mapas de normales de utilería (props del patio y garaje)
export const propTex = (name: string) => {
  const t = new B.Texture(`./textures/props/${name}.webp`, scene, true, false, B.Texture.TRILINEAR_SAMPLINGMODE);
  t.wrapU = t.wrapV = B.Texture.WRAP_ADDRESSMODE;
  if (name.startsWith("prop-tire-stack")) { t.uScale = 1; t.vScale = 0.2; t.vOffset = 0.16; }
  if (name === "prop-tire-stack_normal") t.level = 0.2;
  return t;
};
export const rustyDrumM = () =>
  surface(pbr("propRustyDrum", {
    color: "#d5dbe0",
    rough: 0.82,
    metal: 0.3,
    tex: tex("p_drum_alb", () => propTex("prop-rusty-drum-folded-v2")),
  }), "steel", 6, 0.35);
export const tireStackM = () =>
  pbr("propTireStack", {
    color: "#aeb4b1",
    rough: 0.96,
    metal: 0,
    emissive: "#050505",
    tex: tex("p_tire_alb", () => propTex("prop-tire-stack")),
    bump: tex("p_tire_bmp", () => propTex("prop-tire-stack_normal")),
  });
export const woodCrateM = () =>
  pbr("propWoodCrate", {
    color: "#e9dec9",
    rough: 0.92,
    metal: 0,
    tex: tex("p_crate_alb", () => propTex("prop-wood-crate")),
    bump: tex("p_crate_bmp", () => propTex("prop-wood-crate_normal")),
  });

// ---------- Objetos rompibles ----------
// bits: colores de lo que salta al romperse un "cofre" (pot). Sin bits: tierra y hojas de maceta.
export type Breakable = { m: B.Mesh; hp: number; r: number; color: string; extras: B.Mesh[]; pot: boolean; bits?: string[] };
export const breakables: Breakable[] = [];
export const breakable = (m: B.Mesh, hp: number, r: number, color: string, pot: boolean | string[] = false, extras: B.Mesh[] = []) =>
  (breakables.push({ m, hp, r, color, extras, pot: !!pot, bits: Array.isArray(pot) ? pot : undefined }), m);

export type HeavyProp = { m: B.Mesh; type: "drum" | "tire"; pos: B.Vector3; hits: number };
export const heavyProps: HeavyProp[] = [];
export const registerHeavyProp = (m: B.Mesh, type: "drum" | "tire") => {
  heavyProps.push({ m, type, pos: m.position.clone(), hits: 0 });
  return m;
};

// Daño en área a objetos de la zona. Devuelve dónde se rompieron los "cofres" (sueltan premios).
export function hitBreakables(pos: B.Vector3, r: number, dmg: number) {
  const pots: B.Vector3[] = [];
  for (let i = breakables.length - 1; i >= 0; i--) {
    const b = breakables[i];
    if (B.Vector3.Distance(b.m.getAbsolutePosition(), pos) > r + b.r || (b.hp -= dmg) > 0) continue;
    const p = b.m.getAbsolutePosition().clone();
    debris(p, b.color, b.pot ? 16 : 6, b.pot ? 9 : 6, b.pot ? 1.6 : 1);
    if (b.pot) {
      if (b.bits) { for (const c of b.bits) debris(p.add(new B.Vector3(0, 2, 0)), c, 10, 7, 1.2); splat(p, b.bits[0], 3); }
      else { debris(p, "#4a3420", 10, 6, 1.2); debris(p.add(new B.Vector3(0, 4, 0)), "#3f8f2f", 8, 5, 1.4); }
      pots.push(p);
    }
    b.m.physicsBody?.dispose();
    b.m.dispose();
    for (const x of b.extras) x.dispose();
    breakables.splice(i, 1);
  }
  return pots;
}

// Impacto contra tambores y neumáticos pesados: abolladura / deformación visual y respuesta de material
export function hitHeavyProps(pos: B.Vector3, r: number, spd: number): "drum" | "tire" | null {
  for (const hp of heavyProps) {
    if (B.Vector3.Distance(hp.m.position, pos) <= r + 2.4) {
      hp.hits++;
      if (hp.type === "drum") {
        // Abolladura de chapa y leve inclinación por impacto
        const pushDir = hp.m.position.subtract(pos).normalize();
        hp.m.scaling.x = Math.max(0.82, hp.m.scaling.x - 0.04);
        hp.m.scaling.z = Math.max(0.82, hp.m.scaling.z - 0.04);
        hp.m.scaling.y = Math.min(1.08, hp.m.scaling.y + 0.02);
        hp.m.rotation.z += pushDir.x * 0.05;
        hp.m.rotation.x -= pushDir.z * 0.05;
        return "drum";
      } else if (hp.type === "tire") {
        // Amortiguación elástica de caucho
        hp.m.scaling.y = Math.max(0.88, hp.m.scaling.y - 0.03);
        return "tire";
      }
    }
  }
  return null;
}

// Mallas fijas que pueden tapar al auto: la cámara las tramea (main.ts). Las copas quedan fuera: están por encima de la cámara.
export const occluders: B.Mesh[] = [];
// ¿Está bajo techo? (mesa del patio, auto real y banco del garaje). La cámara baja y se acerca (main.ts).
export const underRoof = (p: B.Vector3) => !!Z.roof?.(p);

// Zonas sin pasto ni props (círculos)
export const bare: { x: number; z: number; r: number }[] = [];
export const isBare = (x: number, z: number) => bare.some((b) => Math.hypot(x - b.x, z - b.z) < b.r) || Z.rects.some(([cx, cz, w, d]) => Math.abs(x - cx) < w && Math.abs(z - cz) < d);

export type ZoneId = "patio" | "garaje" | "jardin" | "luna" | "galpon" | "desvan" | "pileta" | "cocina";
export type Zone = {
  name: string; short: string; desc: string; half: number; // short: botón del menú principal
  cost: number; // tornillos en el Taller (0 = siempre abierta)
  grass: number; grassH: number; // densidad de matas relativa al patio (0 = sin pasto) y alto
  rects: [number, number, number, number][]; // rectángulos sin pasto ni props: centro x, z, medio ancho, medio largo
  roof?: (p: B.Vector3) => boolean;
  climate?: Climate; // luz fija (interior): reemplaza el ciclo atardecer → noche
  dust?: [number, number, number, number][];
  build(): void; layout(): void;
};
// Interior del garaje: tubo fluorescente frío, sin cielo ni luna. Inclinado a propósito: casi vertical, las sombras en cascada se rompen.

// Suelo visible + colisionador. La textura repite con la misma densidad de texel que el patio original.
export function floor(key: string, color: string, t: () => B.Texture, rough = 0.95, kind: Surf = "grass", macro = 90) {
  const GS = HALF * 2 + 700, // el suelo sigue más allá del patio: el horizonte se pierde en la niebla
     tx = tex(key, t);
  tx.uScale = tx.vScale = GS / macro; // macro: color a escala de patio; el grano fino lo pone surface() cada ~4,5 m (a la altura de la cámara de partida, 1 texel ≈ 1 píxel)
  const ground = B.MeshBuilder.CreateGround("ground", { width: GS, height: GS, subdivisions: 80 }, scene); // subdividido: dos triángulos enormes interpolan mal la profundidad y los decales se hunden en el piso
  ground.material = surface(pbr(key, { color, rough, tex: tx }), kind, Math.round(GS / 4.5));
  ground.receiveShadows = true;
  const gcol = B.MeshBuilder.CreateBox("gcol", { width: GS, height: 2, depth: GS }, scene);
  gcol.position.y = -1;
  gcol.isVisible = false;
  new B.PhysicsAggregate(gcol, B.PhysicsShapeType.BOX, { mass: 0, friction: 0.7 }, scene);
}
export const decal = (name: string, w: number, h: number, x: number, z: number, mat: B.Material, y = 0.02) => {
  const g = B.MeshBuilder.CreateGround(name, { width: w, height: h }, scene);
  g.position.set(x, y, z);
  g.material = mat;
  mat.zOffset = -2; // decalcomanía: siempre por encima del piso, sin z-fighting a distancia
  g.receiveShadows = true;
  return g;
};
// Cemento con juntas de losa (piso del garaje)
export const concreteTex = () => canvasTex(256, (c, s) => {
  c.fillStyle = "#8d8f8a"; c.fillRect(0, 0, s, s);
  for (let i = 0; i < 5000; i++) { c.fillStyle = ["#7a7c77", "#9a9c96", "#6c6e6a"][i % 3]; c.globalAlpha = 0.3 + Math.random() * 0.4; c.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 3, 1 + Math.random() * 3); }
  c.globalAlpha = 1;
  c.strokeStyle = "#5a5c58"; c.lineWidth = 3; c.strokeRect(0, 0, s, s);
});

export const plankTpl = () => template("plank", () => (FOLDED_SLICE ? fencePanel() : [box(2, 7, 0.4, woodM(), [0, 3.5, 0]), box(2, 0.3, 0.6, M.matte("#6b4a2b"), [0, 5.5, -0.3])]));
// Slice Folded (?folded2): flejes, cantoneras, remaches y calcos de la caja de chapa, como instancia hija escalada a la caja (que sigue siendo el colisionador)
export const crateFold = (m: B.Mesh, w: number, h: number, d: number) => {
  if (!FOLDED_SLICE) return m;
  const k = template("crateFold", crateDetail).createInstance("crateF");
  k.position.setAll(0); k.parent = m; k.scaling.set(w, h, d); k.isPickable = false; // position.setAll(0): la instancia nace en la plantilla escondida (y -500)
  return m;
};
// Folded: el colisionador viejo queda invisible (misma forma física, mismo rng) y lo viste una instancia de la plantilla de chapa
export const skin = (m: B.Mesh, name: string, build: () => B.Mesh[]) => {
  if (!FOLDED_SLICE) return m;
  m.isVisible = false;
  const k = template(name, build).createInstance(name);
  k.position.setAll(0); k.parent = m; k.isPickable = false; k.receiveShadows = true; shadows.addShadowCaster(k); // position.setAll(0): sin eso la piel queda en y -500 y el colisionador invisible deja el prop sin dibujar
  return m;
};

// Casa al fondo (da escala): fachada de ladrillo/revoque cálido con cornisas, marcos oscuros, ventanas encendidas y siluetas
export function house() {
  const GS = HALF * 2 + 60, K = HALF / 100;
  const wallM = surface(pbr("houseWall", { color: "#9c5c46", rough: 0.88, emissive: "#1f120d" }), "brick", 16, 0.35);
  const trimM = M.matte("#36261e"), sillM = M.matte("#5c4338");
  const h = merge("house", [
    box(GS, 90, 6, wallM, [0, 45, HALF + 14]),
    box(GS, 4, 10, M.matte("#5c3d2e"), [0, 2, HALF + 12]),
    box(GS, 1.8, 7.6, sillM, [0, 24, HALF + 13.2]),
    box(GS + 4, 4, 10, trimM, [0, 88.5, HALF + 12]),
    ...[-70, -25, 45, 90].map((x, i) => box(26, 30, 1, i === 1 ? M.glass() : M.glow(i % 2 ? "#ffb15c" : "#ffcf8a"), [x * K, 42, HALF + 10.6])),
    // Siluetas en las ventanas encendidas (alguien mirando afuera)
    box(7, 14, 0.4, M.matte("#1a1410"), [-66 * K, 36, HALF + 10]), sph(6, M.matte("#1a1410"), [-66 * K, 46, HALF + 10], [1, 1, 0.2], 6),
    box(5, 10, 0.4, M.matte("#1a1410"), [84 * K, 34, HALF + 10]),
    ...[-70, -25, 45, 90].flatMap((x) => [
      box(29.4, 33.4, 0.7, trimM, [x * K, 42, HALF + 10.9]),
      box(31, 2.2, 2.2, sillM, [x * K, 25.8, HALF + 10.4]),
    ]),
    box(25, 42, 0.8, trimM, [10 * K, 21, HALF + 10.9]),
    box(22, 40, 1, pbr("door", { color: "#ffffff", rough: 0.6, tex: tex("door", TEX.wood) }), [10 * K, 20, HALF + 10.6]),
  ]);
  h.receiveShadows = true;
  occluders.push(h);
}
// Árbol: tronco enorme, copa fuera de cuadro (sombras de hojas igual)
export function tree(x: number, z: number) {
  occluders.push(stat(cyl(7, 9, 70, surface(pbr("bark", { color: "#ffffff", rough: 0.95, tex: tex("bark", TEX.bark) }), "soil", 6, 0.6), [x, 35, z]), B.PhysicsShapeType.CYLINDER));
  const crown = leafM("#2f6b2a", 24), lobes: B.Mesh[] = [];
  for (let k = 0; k < 5; k++) lobes.push(sph(40, crown, [x + (rng() - 0.5) * 30, 72 + rng() * 10, z + (rng() - 0.5) * 30], [1, 0.7, 1], 6));
  shadows.addShadowCaster(merge("crown", lobes)); // una sola malla por copa: 5 mallas = 5 dibujos por pasada (cada cascada de sombra incluida)
  bare.push({ x, z, r: 6 });
}
// Auto real (1 u ≈ 4,5 cm: 96 de largo). lift = altura del piso de la carrocería; en caballetes el RC pasa por abajo.
export function realCar(x: number, z: number, ry: number, lift: number, solid: boolean, paint: string) {
  const pm = pbr("carPaint" + paint, { color: paint, rough: 0.35 }), dark = M.matte("#1a1a1a"), hub = Math.max(7, lift + 1);
  const parts = [
    box(40, 13, 96, pm, [0, lift + 6.5, 0]),
    box(36, 11, 50, pm, [0, lift + 18.5, -4]),
    box(36.4, 7, 44, M.glass(), [0, lift + 19, -4]), // ventanillas
    box(33, 7, 0.4, M.glass(), [0, lift + 19, 21.1]), box(33, 7, 0.4, M.glass(), [0, lift + 19, -29.1]),
    ...[48.5, -48.5].map((bz) => box(41, 3, 3, dark, [0, lift + 3, bz])),
    ...[-13, 13].map((bx) => box(8, 3, 0.5, M.matte("#e8e4d0"), [bx, lift + 9, 48.2])),
    ...[-13, 13].map((bx) => box(8, 3, 0.5, M.matte("#8a1810"), [bx, lift + 9, -48.2])),
  ];
  const wheels: [number, number][] = [[-19, 31], [19, 31], [-19, -31], [19, -31]];
  if (FOLDED_SLICE) { parts.forEach((p) => p.dispose()); parts.length = 0; parts.push(...realCarFold(lift, paint)); } // solo visual: el colisionador son las cajas de abajo
  else for (const [wx, wz] of wheels) parts.push(cyl(14, 14, 8, M.rubber(), [wx, hub, wz], [0, 0, Math.PI / 2], 14), cyl(8, 8, 8.4, M.metal("#9aa0a6"), [wx, hub, wz], [0, 0, Math.PI / 2], 10));
  const m = merge("realCar", parts);
  m.position.set(x, 0, z); m.rotation.y = ry;
  shadows.addShadowCaster(m);
  if (!solid) return m;
  occluders.push(m);
  const c = Math.cos(ry), s = Math.sin(ry), at = (lx: number, ly: number, lz: number): [number, number, number, number] => [x + lx * c + lz * s, ly, z - lx * s + lz * c, ry];
  stat(box(40, 24, 96, dark, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, at(0, lift + 12, 0)).isVisible = false;
  for (const [wx, wz] of wheels) {
    stat(box(8, 14, 14, dark, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, at(wx, hub, wz)).isVisible = false;
    // Caballete bajo cada rueda (lo único que estorba abajo)
    const [sx, , sz] = at(wx * 0.7, 0, wz);
    stat(merge("stand", [cyl(1.2, 4.5, lift, M.metal("#b8322a"), [0, lift / 2, 0], undefined, 4), box(3, 0.8, 3, M.metal("#b8322a"), [0, lift, 0])]), B.PhysicsShapeType.CYLINDER, {}, [sx, 0, sz]);
    bare.push({ x: sx, z: sz, r: 3 });
  }
  return m;
}

// Follaje con hojas en relieve (perfil "leaf"): rep = repeticiones sobre las UV de la malla (esfera: vuelta completa)
export const leafM = (c: string, rep = 8) => surface(pbr(`leaf${c}${rep}`, { color: c, rough: 0.8 }), "leaf", rep, 0.75);
