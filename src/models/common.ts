import * as B from "@babylonjs/core";
import earcut from "earcut";
import { M, pbr, shadows } from "../render";
import { foldWheel } from "../folded_slice";

// Modelos procedurales. Las piezas se fusionan en una sola malla (con multi-material)
// y los enemigos se dibujan como instancias: cientos en pantalla con pocos draw calls.

export let scene: B.Scene;
export const initModels = (s: B.Scene) => (scene = s);

export type V3 = [number, number, number];
export const v = (a: V3) => new B.Vector3(...a);

export function place(m: B.Mesh, mat: B.Material, pos: V3, rot?: V3, scl?: V3) {
  m.material = mat;
  m.position = v(pos);
  if (rot) m.rotation = v(rot);
  if (scl) m.scaling = v(scl);
  return m;
}
export const box = (w: number, h: number, d: number, mat: B.Material, pos: V3, rot?: V3) =>
  place(B.MeshBuilder.CreateBox("p", { width: w, height: h, depth: d }, scene), mat, pos, rot);
// Teselación según el tamaño en pantalla (antes duplicaba todos los lados: una esfera de 16 segmentos = 1.296 triángulos, un neumático 4.096).
// D = medida × tessK (escala de la plantilla que se arma, o 2,5 en los autos, que se ven de cerca en el garaje) → lados por tramo [<0,3 · <0,6 · <1,5 · <4 · más].
// Los lados que pide quien arma la pieza (tess ≤ 6, esfera ≤ 4) son a propósito y no se tocan.
export let tessK = 1;
export const setTessK = (k: number) => (tessK = k);
const tier = (D: number, a: number[]) => a[D < 0.3 ? 0 : D < 0.6 ? 1 : D < 1.5 ? 2 : D < 4 ? 3 : 4];
export const cyl = (top: number, bot: number, h: number, mat: B.Material, pos: V3, rot?: V3, tess = 12) =>
  place(B.MeshBuilder.CreateCylinder("p", { diameterTop: top, diameterBottom: bot, height: h, tessellation: tess <= 6 ? tess : Math.min(tess * 2, tier(Math.max(top, bot) * tessK, [8, 12, 16, 24, 32])) }, scene), mat, pos, rot);
export const sph = (d: number, mat: B.Material, pos: V3, scl?: V3, seg = 8) =>
  place(B.MeshBuilder.CreateSphere("p", { diameter: d, segments: seg <= 4 ? seg : Math.min(seg * 2, tier(d * tessK * (scl ? Math.max(...scl) : 1), [4, 6, 8, 10, 12])) }, scene), mat, pos, undefined, scl);
// Toro propio: `na` lados alrededor y `nc` en el corte del tubo (el de Babylon usa los mismos para ambos: un aro fino de 40 → 3.200 triángulos)
function ring(R: number, r: number, na: number, nc: number) {
  const P: number[] = [], N: number[] = [], U: number[] = [], I: number[] = [];
  for (let i = 0; i <= na; i++) for (let j = 0; j <= nc; j++) {
    const a = (i / na) * 2 * Math.PI, b = (j / nc) * 2 * Math.PI, ca = Math.cos(a), sa = Math.sin(a), nx = Math.cos(b), ny = Math.sin(b);
    P.push((R + r * nx) * ca, r * ny, (R + r * nx) * sa); N.push(nx * ca, ny, nx * sa); U.push(i / na, j / nc);
    if (i < na && j < nc) { const k = i * (nc + 1) + j; I.push(k, k + nc + 1, k + 1, k + 1, k + nc + 1, k + nc + 2); }
  }
  const m = new B.Mesh("p", scene), vd = new B.VertexData();
  Object.assign(vd, { positions: P, normals: N, uvs: U, indices: I });
  vd.applyToMesh(m);
  return m;
}
export const tor = (d: number, t: number, mat: B.Material, pos: V3, rot?: V3, tess = 14) =>
  place(ring(d / 2, t / 2, tess <= 6 ? tess : Math.min(tess * 2, tier(d * tessK, [10, 16, 24, 40, 40])), tess <= 6 ? tess : tier(t * tessK, [4, 6, 6, 8, 10])), mat, pos, rot);
export const tube = (path: V3[], r: number, mat: B.Material) => {
  const m = B.MeshBuilder.CreateTube("p", { path: path.map(v), radius: r, tessellation: 6 }, scene);
  m.material = mat;
  return m;
};

// Perfil lateral [adelante(z), alto(y)] extruido a lo ancho (x), centrado en x.
export function extrude(profile: [number, number][], width: number, mat: B.Material, pos: V3) {
  const m = B.MeshBuilder.ExtrudePolygon("p", { shape: profile.map(([z, y]) => new B.Vector3(z, 0, y)), depth: width }, scene, earcut);
  m.rotation.set(-Math.PI / 2, -Math.PI / 2, 0);
  m.bakeCurrentTransformIntoVertices();
  const c = m.getBoundingInfo().boundingBox.center;
  m.position.set(-c.x, 0, 0);
  m.bakeCurrentTransformIntoVertices();
  m.position = v(pos);
  m.material = mat;
  return m;
}

/** Fusiona piezas en una malla y aplana sus colores (flatten): una submalla = un dibujo por pasada (cámara, brillo y cada cascada de sombra). `keep`: materiales que se animan y no se hornean. */
export function merge(name: string, parts: B.Mesh[], keep?: B.Material[]) {
  // Piezas ya aplanadas (con color de vértice) mezcladas con otras sin él: Babylon no fusiona atributos distintos; las que faltan reciben blanco
  if (parts.some((p) => p.isVerticesDataPresent(B.VertexBuffer.ColorKind))) for (const p of parts) if (!p.isVerticesDataPresent(B.VertexBuffer.ColorKind)) p.setVerticesData(B.VertexBuffer.ColorKind, new Float32Array(p.getTotalVertices() * 4).fill(1), false, 4);
  const m = B.Mesh.MergeMeshes(parts, true, true, undefined, false, true);
  if (!m) throw new Error(`merge ${name}: MergeMeshes devolvió null (${parts.length} piezas)`);
  m.name = name;
  m.receiveShadows = true;
  flatten(m, keep);
  return m;
}

// Aplana colores de una malla fusionada: cada pieza pintada (sin textura, emisivo ni transparencia) pasa a color de vértice y los materiales
// de una misma clase (rugosidad, metal, barniz) se funden en uno. Baja ~25 submallas a ~6: un draw por submalla y por pasada (cuarto, sombras x3, profundidad, brillo). Mismo look. `keep`: materiales que se animan en juego (la pintura que se gasta) y no se pueden hornear.
export function flatten(m: B.Mesh, keep: B.Material[] = []) {
  const multi = m.material;
  if (!(multi instanceof B.MultiMaterial)) return;
  const nv = m.getTotalVertices(), idx = m.getIndices()!, old = m.getVerticesData(B.VertexBuffer.ColorKind), col = old ? Float32Array.from(old) : new Float32Array(nv * 4).fill(1); // si ya estaba aplanada (pieza de otra fusión) conserva sus colores
  const groups = new Map<B.Material, B.SubMesh[]>();
  for (const sm of m.subMeshes) {
    let mat = multi.subMaterials[sm.materialIndex]!;
    if (mat instanceof B.PBRMaterial && !mat.albedoTexture && !mat.detailMap.isEnabled && mat.emissiveColor.equals(B.Color3.Black()) && mat.alpha === 1 && !mat.name.startsWith("vc") && !keep.includes(mat)) {
      const c = mat.albedoColor, k = mat.clearCoat.isEnabled ? mat.clearCoat.intensity : 0;
      for (let v = sm.verticesStart * 4, e = (sm.verticesStart + sm.verticesCount) * 4; v < e; v += 4) { col[v] = c.r; col[v + 1] = c.g; col[v + 2] = c.b; }
      mat = pbr(`vc${mat.roughness}|${mat.metallic}|${k}`, { color: "#ffffff", rough: mat.roughness ?? 0.5, metal: mat.metallic ?? 0, coat: k });
    }
    (groups.get(mat) ?? groups.set(mat, []).get(mat)!).push(sm);
  }
  const out = new Uint32Array(idx.length), mats: B.Material[] = [], ranges: [number, number][] = [];
  let n = 0;
  for (const [mat, subs] of groups) {
    const a = n;
    for (const sm of subs) for (let i = 0; i < sm.indexCount; i++) out[n++] = idx[sm.indexStart + i];
    mats.push(mat); ranges.push([a, n - a]);
  }
  const nm = new B.MultiMaterial(m.name + "_vc", m.getScene());
  nm.subMaterials = mats;
  m.setVerticesData(B.VertexBuffer.ColorKind, col, false, 4);
  m.setIndices(out, nv);
  m.releaseSubMeshes();
  ranges.forEach(([a, c], i) => new B.SubMesh(i, 0, nv, a, c, m));
  m.material = nm;
  multi.dispose();
}

// ---------- Plantillas instanciables ----------
const templates = new Map<string, B.Mesh>();
export function template(name: string, build: () => B.Mesh[], scale = 1) {
  let t = templates.get(name);
  if (!t) {
    tessK = scale;
    try { t = merge(name, build()); } finally { tessK = 1; }
    if (scale !== 1) { t.scaling.setAll(scale); t.bakeCurrentTransformIntoVertices(); }
    t.position.y = -500; // la fuente queda escondida; se dibujan las instancias
    shadows.addShadowCaster(t);
    templates.set(name, t);
  }
  return t;
}

// Estilo de rueda (garaje → Ruedas): "" de serie, oruga (tacos chatos; la banda va en la carrocería), todoterreno (tacos grandes),
// lisa (de carrera: ancha y sin flancos) y rayos (8 rayos finos de colores). Todo en la misma malla: sigue siendo una instancia por rueda.
const SPOKES = ["#ef4444", "#f59e0b", "#facc15", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6"];
export function wheel(d: number, w: number, rim: string, style = "") {
  const around = (n: number, f: (a: number) => B.Mesh) => Array.from({ length: n }, (_, k) => f((k * Math.PI * 2) / n));
  if (style === "fold") return merge("wheel", foldWheel(d, w, rim)); // vertical slice Folded (?folded2)
  const lisa = style === "lisa", W = lisa ? w * 1.25 : w;
  return merge("wheel", [
    cyl(d, d, W, M.rubber(), [0, 0, 0], [0, 0, Math.PI / 2], 16),
    ...(lisa ? [] : [-1, 1].map((sd) => tor(d * 0.98, w * 0.35, M.rubber(), [sd * w * 0.3, 0, 0], [0, 0, Math.PI / 2], 16))),
    ...(style === "todoterreno" ? around(10, (a) => box(w * 1.2, d * 0.12, d * 0.17, M.rubber(), [0, Math.sin(a) * d * 0.5, Math.cos(a) * d * 0.5], [a, 0, 0])) : []),
    ...(style === "oruga" ? around(14, (a) => box(w * 1.1, d * 0.06, d * 0.09, M.rubber(), [0, Math.sin(a) * d * 0.5, Math.cos(a) * d * 0.5], [a, 0, 0])) : []),
    cyl(d * 0.62, d * 0.62, W * 1.04, M.metal(style === "rayos" ? "#e5e7eb" : rim), [0, 0, 0], [0, 0, Math.PI / 2], 20),
    cyl(d * 0.52, d * 0.52, W * 1.1, M.plastic("#f0f2f5"), [0, 0, 0], [0, 0, Math.PI / 2], 20), // banda blanca toy
    cyl(d * 0.46, d * 0.46, W * 1.12, M.matte("#0a0b0e"), [0, 0, 0], [0, 0, Math.PI / 2], 20),
    ...(style === "rayos" ? around(8, (a) => box(W * 1.1, d * 0.46, d * 0.04, M.plastic(SPOKES[Math.round((a / Math.PI / 2) * 8) % 8]), [0, 0, 0], [a, 0, 0]))
      : around(5, (a) => box(W * 1.1, d * 0.46, d * 0.07, M.metal(rim), [0, 0, 0], [a, 0, 0]))), // 5 rayos
    cyl(d * 0.2, d * 0.2, W * 1.14, M.metal(), [0, 0, 0], [0, 0, Math.PI / 2], 14),
  ]);
}

// Sombras de los autos: la carrocería (y cada rueda) tiene varias submallas, una por material, y cada cascada de sombra las dibuja todas aunque el mapa solo
// guarda la silueta. Una malla gemela de UNA submalla (los triángulos opacos: el vidrio no proyectaba, sigue igual) hace ese trabajo: es hija de la original (misma pose),
// vive en una capa que ninguna cámara dibuja y es la única que entra a la lista de proyectores (ver `cast` en CarModel).
export const SHADOW_ONLY = 0x10000000;
let proxyMat: B.StandardMaterial | undefined;
export function shadowProxy(m: B.Mesh) {
  const multi = m.material;
  if (!(multi instanceof B.MultiMaterial)) return null;
  const idx = m.getIndices()!, ind: number[] = [];
  for (const sm of m.subMeshes) {
    const mat = multi.subMaterials[sm.materialIndex];
    if (mat && mat.alpha < 1) continue;
    for (let i = 0; i < sm.indexCount; i++) ind.push(idx[sm.indexStart + i]);
  }
  const p = new B.Mesh(m.name + "Sh", scene), vd = new B.VertexData();
  vd.positions = m.getVerticesData(B.VertexBuffer.PositionKind)!; vd.normals = m.getVerticesData(B.VertexBuffer.NormalKind)!; vd.indices = ind;
  vd.applyToMesh(p);
  p.material = proxyMat ??= new B.StandardMaterial("shadowOnly", scene);
  p.layerMask = SHADOW_ONLY;
  p.isPickable = false;
  return p;
}

// Las ruedas de todos los autos son instancias de una fuente por (diámetro, ancho, llanta): Babylon dibuja todas juntas en una sola llamada por submalla
// (40 ruedas de la carrera = 3 dibujos por pasada en vez de 160). Se arman con la teselación de los autos (tessK) y quedan en caché.
const wheelSrc = new Map<string, B.Mesh>(), wheelSh = new Map<string, B.Mesh | null>(); // fuentes por (diámetro, ancho, llanta); gemelas de sombra por (diámetro, ancho): la silueta no depende de la llanta
export function wheelInst(d: number, w: number, rim: string, style = "") {
  const k = `${d}|${w}|${style}`;
  let m = wheelSrc.get(`${k}|${rim}`);
  if (!m) {
    m = wheel(d, w, rim, style);
    m.position.y = -500; // la fuente queda escondida, como las plantillas: se dibujan las instancias
    m.isPickable = false;
    wheelSrc.set(`${k}|${rim}`, m);
    if (!wheelSh.has(k)) { const sh = shadowProxy(m); if (sh) sh.position.y = -500; wheelSh.set(k, sh); if (sh) shadows.addShadowCaster(sh); }
    if (!wheelSh.get(k)) shadows.addShadowCaster(m); // sin gemela (una sola submalla): la fuente misma proyecta
  }
  const inst = m.createInstance("wheel"), shi = wheelSh.get(k)?.createInstance("wheelSh");
  if (shi) { shi.parent = inst; shi.layerMask = SHADOW_ONLY; }
  return { inst, cast: shi ?? inst };
}

