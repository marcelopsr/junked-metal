import * as B from "@babylonjs/core";
import earcut from "earcut";
import { M, pbr, shadows } from "../render";

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

/** Caja de bordes redondeados (juguete): radio r, 2 tramos por arco, 108 triángulos (las piezas de menos de 0,11 son cajas comunes). Normales suaves: la luz resbala por el borde en vez de cortarse. */
export function rbox(w: number, h: number, d: number, r: number, mat: B.Material, pos: V3, rot?: V3) {
  if (Math.min(w, h, d) < 0.11) return box(w, h, d, mat, pos, rot); // piezas finas: el bisel no se ve y costaría 9 veces más
  const H = [w / 2, h / 2, d / 2], rr = Math.min(r, ...H) * 0.999;
  const g = (hh: number) => [-hh, -hh + rr, hh - rr, hh];
  const P: number[] = [], N: number[] = [], U: number[] = [], I: number[] = [];
  for (const ax of [0, 1, 2]) for (const sg of [-1, 1]) {
    const a1 = (ax + 1) % 3, a2 = (ax + 2) % 3, base = P.length / 3;
    for (const u of g(H[a1])) for (const t of g(H[a2])) {
      const q = [0, 0, 0]; q[ax] = sg * H[ax]; q[a1] = u; q[a2] = t;
      const dir = q.map((c, i) => c - Math.max(-(H[i] - rr), Math.min(H[i] - rr, c)));
      const L = Math.hypot(dir[0], dir[1], dir[2]) || 1;
      for (let i = 0; i < 3; i++) { P.push(q[i] - dir[i] + (dir[i] / L) * rr); N.push(dir[i] / L); }
      U.push(u, t);
    }
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const a = base + i * 4 + j, b = a + 4, c = a + 1, e = b + 1;
      // Babylon (mano izquierda): el triángulo de frente tiene (b-a)×(c-a) opuesto a la normal; se comprueba y se invierte si hace falta
      const p = (k: number) => [P[k * 3], P[k * 3 + 1], P[k * 3 + 2]], A = p(a), Bv = p(b), C = p(c), n = [N[a * 3], N[a * 3 + 1], N[a * 3 + 2]];
      const u1 = Bv.map((x, i) => x - A[i]), v1 = C.map((x, i) => x - A[i]);
      const dot = (u1[1] * v1[2] - u1[2] * v1[1]) * n[0] + (u1[2] * v1[0] - u1[0] * v1[2]) * n[1] + (u1[0] * v1[1] - u1[1] * v1[0]) * n[2];
      if (dot < 0) I.push(a, b, c, c, b, e); else I.push(a, c, b, c, e, b);
    }
  }
  const m = new B.Mesh("p", scene), vd = new B.VertexData();
  Object.assign(vd, { positions: P, normals: N, uvs: U, indices: I });
  vd.applyToMesh(m);
  return place(m, mat, pos, rot);
}
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
// Babylon deja pegado `_isActive` en la fuente cuando una pasada intermedia (sombras CSM) la activa y no la dibuja: Mesh.render limpia
// solo `_isActiveIntermediate`, y desde ahí InstancedMesh._activate cree que la fuente ya está activa y no dibuja ninguna instancia
// (en celular la ficha del muñeco, el falso y el limpiafondos quedaban solo con el carrete). Se limpian las dos marcas antes de cada cuadro.
// ponytail: toca campos internos de Babylon 9; revisar si se actualiza el motor (o si Babylon corrige Mesh.render).
const extra = new Set<B.Mesh>(); // fuentes de instancias que no pasan por template() (bichos horneados a VAT en glb.ts)
// Se registra UNA vez (unstickOn) sin importar qué fuente llegue primero; las liberadas se sueltan; si el campo interno no existe en el motor, no hace nada.
// ponytail: si Babylon renombra `_internalAbstractMeshDataInfo`, el arreglo se apaga en silencio (las instancias vuelven a fallar en celular).
type Info = { _isActive: boolean; _isActiveIntermediate: boolean };
let unstickOn = false;
const unstick = () => {
  for (const t of extra) if (t.isDisposed()) extra.delete(t);
  for (const t of [...templates.values(), ...extra]) {
    const i = (t as unknown as { _internalAbstractMeshDataInfo?: Info })._internalAbstractMeshDataInfo;
    if (i) i._isActive = i._isActiveIntermediate = false;
  }
};
const unstickHook = (m: B.Mesh) => { if (!unstickOn) { unstickOn = true; m.getScene().onBeforeRenderObservable.add(unstick); } };
export function unstickSource(m: B.Mesh) {
  unstickHook(m);
  extra.add(m);
}
export function template(name: string, build: () => B.Mesh[], scale = 1) {
  let t = templates.get(name);
  if (!t || t.isDisposed()) { // setZone libera las mallas del mundo al rearmar: una maestra destruida se reconstruye
    tessK = scale;
    try { t = merge(name, build()); } finally { tessK = 1; }
    if (scale !== 1) { t.scaling.setAll(scale); t.bakeCurrentTransformIntoVertices(); }
    t.position.y = -500; // la fuente queda escondida; se dibujan las instancias
    shadows.addShadowCaster(t);
    unstickHook(t);
    templates.set(name, t);
  }
  return t;
}

// Estilo de rueda (garaje → Ruedas): "" de serie, oruga (tacos chatos; la banda va en la carrocería), todoterreno (tacos grandes),
// lisa (de carrera: ancha y sin flancos) y rayos (8 rayos finos de colores). Todo en la misma malla: sigue siendo una instancia por rueda.
const SPOKES = ["#ef4444", "#f59e0b", "#facc15", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6"];
/** Textura de canvas cacheada (una por clave, no por auto). */
const texCache = new Map<string, B.DynamicTexture>();
export function canvasTex(key: string, size: number, draw: (g: CanvasRenderingContext2D, n: number) => void) {
  let t = texCache.get(key);
  if (!t) {
    t = new B.DynamicTexture("tex" + key, size, scene, true);
    draw(t.getContext() as unknown as CanvasRenderingContext2D, size);
    t.update();
    texCache.set(key, t);
  }
  return t;
}
const blobs = (g: CanvasRenderingContext2D, n: number, count: number, cols: string[], r0: number, r1: number, y: () => number) => {
  for (let i = 0; i < count; i++) { // determinista (no usa rng() de la partida): semilla propia
    seed = (seed * 16807) % 2147483647;
    const x = (seed / 2147483647) * n; g.fillStyle = cols[i % cols.length];
    g.globalAlpha = 0.55 + (i % 3) * 0.15;
    g.beginPath(); g.ellipse(x, y(), r0 + (i % 7) * (r1 - r0) / 6, (r0 + (i % 5) * (r1 - r0) / 4) * 0.7, i, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
};
let seed = 12345;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const mudTex = () => canvasTex("mud", 256, (g, n) => { // goma negra con barro seco, más denso hacia los flancos (bordes de v)
  g.fillStyle = "#121316"; g.fillRect(0, 0, n, n);
  blobs(g, n, 90, ["#866E5C", "#5a4636"], 3, 12, () => (rnd() < 0.5 ? rnd() * 0.3 : 1 - rnd() * 0.3) * n);
  blobs(g, n, 30, ["#5a4636"], 2, 8, () => rnd() * n);
});
const MINI_RUBBER = () => pbr("minirubber2", { color: "#ffffff", rough: 0.9, tex: mudTex() });
export function wheel(d: number, w: number, rim: string, style = "") {
  if (style === "fold") style = "mini"; // Folded retirado: la rueda de juguete es la mini (tacos a d/2)
  const around = (n: number, f: (a: number) => B.Mesh) => Array.from({ length: n }, (_, k) => f((k * Math.PI * 2) / n));
  if (style === "mini") w *= 1.15; // ruedas RC de las láminas: más anchas (el diámetro no crece: la física apoya la rueda en d/2 y los tacos no pueden pasar de ahí)
  if (style === "mini") { // ref17: goma de bloques en dos hileras alternadas (silueta redonda), aro fino de color, llanta negra de 6 rayos, maza metálica
    const ring = pbr("mini" + rim, { color: rim, rough: 0.35, coat: 0.4 }), blk = pbr("miniwheelblk", { color: "#1c1c1c", rough: 0.5 });
    const row = (x: number, off: number) => around(14, (a) => box(w * 0.4, d * 0.06, d * 0.1, MINI_RUBBER(), [x, Math.sin(a + off) * d * 0.45, Math.cos(a + off) * d * 0.45], [a + off, 0, 0])); // punta a d/2 (alto radial 0,1·d centrado en 0,45·d)
    // Relieve de barro: grumos bajos y alargados (esferas de 4 segmentos aplanadas) en las ranuras entre tacos, pocos abajo en el flanco y una franja de polvo mate en su borde; generador local fijo
    let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647), mud = [pbr("minimud1", { color: "#5e4a38", rough: 1 }), pbr("minimud2", { color: "#4a3a2c", rough: 1 })];
    const lump = (x: number, a: number, rad: number, k: number) => { // eje x = a lo largo de la ranura, z local = radial (rotación a sobre x, como los tacos)
      const m = sph(d * k, mud[r() < 0.5 ? 0 : 1], [x, Math.sin(a) * rad, Math.cos(a) * rad], [1.6, 1, 0.35], 2); m.rotation.x = a; return m;
    };
    const mudLumps = [
      ...[-1, 1].flatMap((sd) => Array.from({ length: 7 }, (_, k) => lump(sd * w * 0.24, ((k * 2 + 1) * Math.PI) / 14 + (sd > 0 ? Math.PI / 14 : 0) + (r() - 0.5) * 0.08, d * 0.5, 0.08 + r() * 0.03))), // ranuras entre tacos, nunca encima de ellos
      ...[-1, 1].flatMap((sd) => Array.from({ length: 3 }, (_, k) => lump(sd * w * 0.5, -Math.PI * (0.35 + k * 0.15 + r() * 0.04), d * (0.4 + r() * 0.05), 0.09))), // flanco: pocos y abajo
      ...[-1, 1].flatMap((sd) => Array.from({ length: 6 }, (_, k) => { const a = -Math.PI * (0.25 + k * 0.1), m = box(w * 0.04, d * 0.1, d * 0.05, mud[1], [sd * w * 0.5, Math.sin(a) * d * 0.46, Math.cos(a) * d * 0.46], [a, 0, 0]); return m; })), // franja de polvo mate en el borde inferior
    ];
    return merge("wheel", [
      ...mudLumps,
      cyl(d * 0.92, d * 0.92, w, MINI_RUBBER(), [0, 0, 0], [0, 0, Math.PI / 2], 24), // núcleo bajo los tacos: la silueta llega a d/2 solo en las puntas
      ...row(-w * 0.24, 0), ...row(w * 0.24, Math.PI / 14),
      cyl(d * 0.7, d * 0.7, w * 1.06, ring, [0, 0, 0], [0, 0, Math.PI / 2], 18), // aro fino de color
      cyl(d * 0.63, d * 0.63, w * 1.1, M.matte("#0c0c0e"), [0, 0, 0], [0, 0, Math.PI / 2], 18), // fondo entre rayos
      ...around(3, (a) => box(w * 1.14, d * 0.56, d * 0.07, blk, [0, 0, 0], [a / 2, 0, 0])), // 6 rayos negros (3 cajas que cruzan el centro)
      cyl(d * 0.2, d * 0.2, w * 1.16, M.metal("#9aa0a8"), [0, 0, 0], [0, 0, Math.PI / 2], 10), // maza
    ]);
  }
  const lisa = style === "lisa", W = lisa ? w * 1.25 : w;
  return merge("wheel", [
    cyl(d * (style === "todoterreno" ? 0.83 : style === "oruga" ? 0.91 : 1), d * (style === "todoterreno" ? 0.83 : style === "oruga" ? 0.91 : 1), W, M.rubber(), [0, 0, 0], [0, 0, Math.PI / 2], 16), // con tacos el núcleo se achica: las puntas quedan a d/2
    ...(lisa ? [] : [-1, 1].map((sd) => tor(d * 0.98, w * 0.35, M.rubber(), [sd * w * 0.3, 0, 0], [0, 0, Math.PI / 2], 16))),
    ...(style === "todoterreno" ? around(10, (a) => box(w * 1.2, d * 0.12, d * 0.17, M.rubber(), [0, Math.sin(a) * d * 0.415, Math.cos(a) * d * 0.415], [a, 0, 0])) : []),
    ...(style === "oruga" ? around(14, (a) => box(w * 1.1, d * 0.06, d * 0.09, M.rubber(), [0, Math.sin(a) * d * 0.455, Math.cos(a) * d * 0.455], [a, 0, 0])) : []),
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

