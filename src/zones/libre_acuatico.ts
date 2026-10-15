import * as B from "@babylonjs/core";
import { box, cyl, merge, sph } from "../models";
import { M, pbr, shadows } from "../render";
import type { Barrio } from "./libre";
import { bare, decal, scene, stat, tex, undo } from "./common";

// Free Roam, barrio ACUATICO (x 42..262, z 98..262): torre con 3 toboganes de media caña, pileta grande y pileta vacía (cráteres suaves), piletas bajas con agua visual,
// trampolines, sombrillas, reposeras, flotadores y un portal con cartel. Sin flotación: el agua es un plano visual sobre el piso.
// Física (FREEROAM-diseno 1.3): cada pieza grande es UN colisionador MESH que es su propia malla visible; pie enterrado (-0,06); pendientes <= 14 grados en subidas,
// sin escalones; losas y agua sin colisión. Decorado con generador local (lcg), nunca rng(). Todo en worldMeshes; la textura del cartel se libera en undo.
type V3 = [number, number, number];
const lcg = (s: number) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const BUR = -0.06, clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v)), sstep = (t: number) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const hidden = (m: B.Mesh) => ((m.isVisible = false), m);

/** Malla de superficie desde una grilla filas x columnas de puntos (wrap = la última fila vuelve a la primera). Corrige el sentido de las caras para que la cara superior mire arriba. */
function grid(name: string, rows: V3[][], mat: B.Material, wrap = false) {
  const R = rows.length, C = rows[0].length, pos: number[] = [], ind: number[] = [], nor: number[] = [];
  for (const r of rows) for (const p of r) pos.push(p[0], p[1], p[2]);
  for (let i = 0; i < (wrap ? R : R - 1); i++) for (let j = 0; j < C - 1; j++) {
    const a = i * C + j, b = ((i + 1) % R) * C + j, c = ((i + 1) % R) * C + j + 1, d = i * C + j + 1;
    ind.push(a, b, c, a, c, d);
  }
  B.VertexData.ComputeNormals(pos, ind, nor);
  let sy = 0; for (let k = 1; k < nor.length; k += 3) sy += nor[k];
  if (sy < 0) { for (let i = 0; i < ind.length; i += 3) [ind[i + 1], ind[i + 2]] = [ind[i + 2], ind[i + 1]]; B.VertexData.ComputeNormals(pos, ind, nor); }
  const m = new B.Mesh(name, scene), vd = new B.VertexData();
  vd.positions = pos; vd.indices = ind; vd.normals = nor; vd.applyToMesh(m);
  m.material = mat; m.isPickable = false;
  return m;
}
/** Sección [lateral, arriba, tierra?]: con tierra = 1 el punto baja al piso (faldón). */
type Sec = [number, number, number?][];
type Fr = { p: V3; lat: V3; up: V3 };
const sweep = (name: string, fr: Fr[], sec: (i: number) => Sec, mat: B.Material) =>
  grid(name, fr.map((f, i) => sec(i).map(([sx, sy, g]): V3 => g ? [f.p[0] + f.lat[0] * sx, BUR, f.p[2] + f.lat[2] * sx] : [f.p[0] + f.lat[0] * sx + f.up[0] * sy, f.p[1] + f.lat[1] * sx + f.up[1] * sy, f.p[2] + f.lat[2] * sx + f.up[2] * sy])), mat);
/** Cráter circular: piso plano (el del mapa) de radio r0, pared que sube D con coseno (<= 21 grados), meseta y bajada suave por fuera. Perfil [r, y] girado. */
function crater(cx: number, cz: number, r0: number, D: number, rise: number, rim: number, fall: number, mat: B.Material) {
  const pts: [number, number][] = [[r0, 0]], K = 10;
  for (let k = 1; k <= K; k++) pts.push([r0 + (rise * k) / K, (D * (1 - Math.cos((Math.PI * k) / K))) / 2]);
  pts.push([r0 + rise + rim, D]);
  for (let k = 1; k <= K; k++) pts.push([r0 + rise + rim + (fall * k) / K, (D * (1 + Math.cos((Math.PI * k) / K))) / 2 + (k === K ? BUR : 0)]);
  const rows = Array.from({ length: 40 }, (_, j) => { const a = (j / 40) * Math.PI * 2; return pts.map(([r, y]): V3 => [Math.cos(a) * r, y, Math.sin(a) * r]); });
  const m = grid("acuaCrater", rows, mat, true);
  stat(m, B.PhysicsShapeType.MESH, { friction: 0.6 }, [cx, 0, cz]);
  m.receiveShadows = false; // ponytail: sin sombras recibidas, la autosombra de la pared suave dibuja franjas (acné); techo: afinar el bias del generador de sombras (render.ts, del orquestador)
  bare.push({ x: cx, z: cz, r: r0 + rise + rim + fall });
  return r0 + rise + rim + fall;
}
/** Plataforma redonda baja (0,5 m) con bordes en rampa de 10 grados y rebote alto. */
function trampoline(cx: number, cz: number, mat: B.Material) {
  const pts: [number, number][] = [[0.05, 0.5], [5, 0.5], [8, BUR]];
  const rows = Array.from({ length: 24 }, (_, j) => { const a = (j / 24) * Math.PI * 2; return pts.map(([r, y]): V3 => [Math.cos(a) * r, y, Math.sin(a) * r]); });
  stat(grid("acuaTrampolin", rows, mat, true), B.PhysicsShapeType.MESH, { friction: 0.5, restitution: 1 }, [cx, 0, cz]);
  bare.push({ x: cx, z: cz, r: 10 });
}

// Torre: rampa recta de 14 grados hasta 11 m y una meseta; los toboganes salen de su borde norte.
const TX = 226, TZ0 = 100, TZ1 = 144, TZ2 = 158, TH = 11, TW = 20; // centro x, pie, cima de la subida, borde, altura, medio ancho
type Slide = { x: number; Ls: number; col: string; turns: [number, number, number][] }; // turns: [u0, u1, grados] (+ = derecha/este)
const SLIDES: Slide[] = [
  { x: 213, Ls: 98, col: "#e53935", turns: [[0.1, 0.45, -30], [0.45, 0.8, 30]] }, // S hacia el oeste: sale en x ~196
  { x: 226, Ls: 96, col: "#fbc02d", turns: [[0.08, 0.3, -24], [0.3, 0.62, 48], [0.62, 0.9, -24]] }, // doble S, sale cerca de donde entra
  { x: 239, Ls: 98, col: "#1e88e5", turns: [[0.1, 0.45, 30], [0.45, 0.8, -30]] }, // S hacia el este: sale en x ~256
];
const DS = 1.5, FLARE = 8, hHalf = (s: number) => 2.8 + 2.4 * Math.max(0, 1 - s / FLARE); // medio ancho del canal: embudo al arrancar

function build(cx: number, cz: number) {
  void cx; void cz; // el barrio se arma en coordenadas de mundo absolutas
  const rnd = lcg(150150);
  const deck = pbr("acuaLosa", { color: "#dccfae", rough: 0.9 }), teal = pbr("acuaTorre", { color: "#1fb5ad", rough: 0.55 }), tile = pbr("acuaPileta", { color: "#ffffff", rough: 0.35, tex: tex("libreAzulejo", () => { const x = new B.Texture("./textures/g-libre-azulejo.webp", scene); x.wrapU = x.wrapV = B.Texture.WRAP_ADDRESSMODE; x.uScale = x.vScale = 3; return x; }) });
  const water = pbr("acuaAgua", { color: "#35b8e6", rough: 0.08, emissive: "#0a3d52", alpha: 0.72 });
  water.zOffset = -4; water.backFaceCulling = false; water.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  const wRib = pbr("acuaCorriente", { color: "#6fd8ff", rough: 0.05, emissive: "#146a8a", alpha: 0.7 });
  wRib.backFaceCulling = false; wRib.transparencyMode = B.Material.MATERIAL_ALPHABLEND; wRib.zOffset = -1;
  const white = M.matte("#f4f1e8"), dark = M.matte("#2a2f36"), steel = M.metal("#aab0b8"), yel = M.plastic("#fbc02d"), glow = M.glow("#ffe7a8");
  const deco: B.Mesh[] = [];
  const solid = (x: number, y: number, z: number, w: number, h: number, d: number, ry = 0, shape = B.PhysicsShapeType.BOX) => {
    const m = shape === B.PhysicsShapeType.BOX ? box(w, h, d, white, [0, 0, 0]) : cyl(w, w, h, white, [0, 0, 0], undefined, 8);
    hidden(m); stat(m, shape, {}, [x, y + h / 2, z, ry]);
  };
  const ripple = (n: string, x: number, z: number, r: number, y = 0.11, sx = 1) => { // agua visual: disco sin física
    const d = B.MeshBuilder.CreateDisc(n, { radius: r, tessellation: 36 }, scene);
    d.rotation.x = Math.PI / 2; d.scaling.x = sx; d.position.set(x, y, z); d.material = water; d.isPickable = false; d.receiveShadows = true;
  };

  // ---- Losa de todo el barrio (decal) y manchas de color ----
  decal("acuaLosa", 220, 164, 152, 180, deck, 0.03);
  for (let i = 0; i < 22; i++) {
    const c = ["#ff7043", "#26c6da", "#ffee58", "#ec407a", "#66bb6a"][i % 5];
    deco.push(cyl(1.6 + rnd() * 2, 1.6 + rnd() * 2, 0.02, pbr("acuaMancha" + c, { color: c, rough: 0.8 }), [45 + rnd() * 215, 0.05, 100 + rnd() * 160], undefined, 10));
  }

  // ---- Torre: subida (derecha, pie enterrado) con bordillos de 1 m, meseta, remate y topes entre toboganes ----
  { const cur = 1, hw = TW - 0.4, base: Sec = [[-TW, 0, 1], [-TW, cur], [-hw, cur], [-hw, 0], [hw, 0], [hw, cur], [TW, cur], [TW, 0, 1]], cap: Sec = base.map(([a]) => [a, 0, 1]);
    const rowsP: V3[] = [[TX, BUR, TZ0], [TX, TH, TZ1], [TX, TH, TZ2], [TX, TH, TZ2]];
    const fr: Fr[] = rowsP.map((p) => ({ p, lat: [1, 0, 0], up: [0, 1, 0] }));
    const m = sweep("acuaTorre", fr, (i) => (i === 3 ? cap : base), teal);
    stat(m, B.PhysicsShapeType.MESH, { friction: 0.7 }, [0, 0, 0]); m.receiveShadows = false; // idem cráter: franjas de autosombra
    bare.push({ x: TX, z: 128, r: 36 });
    // Topes en los huecos de la meseta entre canales (el canal se ensancha hasta 5,2 al arrancar: a 4 m del borde mide 4)
    const e = hHalf(TZ2 - 154), edges = [TX - TW + 0.4, ...SLIDES.flatMap((s) => [s.x - e - 0.05, s.x + e + 0.05]), TX + TW - 0.4];
    for (let k = 0; k < edges.length; k += 2) { const w = edges[k + 1] - edges[k]; if (w < 0.3) continue;
      solid((edges[k] + edges[k + 1]) / 2, TH, TZ2 - 1, w, 1.4, 2); deco.push(box(w, 1.4, 2, yel, [(edges[k] + edges[k + 1]) / 2, TH + 0.7, TZ2 - 1])); }
    // Rayado de peligro en la cima y mástiles con banderines
    for (let i = 0; i < 10; i++) deco.push(box(3, 0.04, 1.2, i & 1 ? dark : yel, [TX - TW + 3 + i * 4, TH + 0.04, TZ1 + 1]));
    for (const sx of [-1, 1]) deco.push(cyl(0.2, 0.3, 8, steel, [TX + sx * (TW - 1), TH + 4, TZ2 - 6], undefined, 6), box(0.1, 1.4, 2.4, sx < 0 ? M.matte("#ec407a") : M.matte("#26c6da"), [TX + sx * (TW - 1), TH + 7.2, TZ2 - 7.2]));
  }

  // ---- Toboganes: canal de media caña con peralte en las curvas, embudo de entrada y salida que se abre y se aplana contra el piso ----
  SLIDES.forEach((S, k) => {
    const n = Math.round(S.Ls / DS), z0 = 154, y0 = TH - 0.03, th: number[] = [0], kap: number[] = [0], dz: number[] = [0];
    const rate = (u: number) => S.turns.reduce((a, [u0, u1, deg]) => a + (u > u0 && u < u1 ? (2 * deg * Math.PI) / 180 / ((u1 - u0) * S.Ls) * Math.sin((Math.PI * (u - u0)) / (u1 - u0)) ** 2 : 0), 0);
    for (let i = 1; i <= n; i++) { const r = rate((i - 0.5) / n); kap.push(r); th.push(th[i - 1] + r * DS); }
    // pendiente: arranca suave, más fuerte al inicio y tiende a 0 al llegar (ya a ras del piso)
    const raw = Array.from({ length: n + 1 }, (_, i) => (1 - i / n) ** 0.6 * sstep((i * DS) / 8)), tot = raw.reduce((a, b) => a + b * DS, 0);
    let acc = 0; for (let i = 1; i <= n; i++) { acc += raw[i] * DS; dz.push(acc); }
    const k2 = (y0 + 0.04) / tot, pts: V3[] = [[S.x, y0, z0]];
    for (let i = 1; i <= n; i++) pts.push([pts[i - 1][0] + Math.sin(th[i]) * DS, y0 - k2 * dz[i], pts[i - 1][2] + Math.cos(th[i]) * DS]);
    // ponytail: el marco usa el lateral horizontal (sin inclinarlo con la pendiente, <= 11 grados): la sección queda algo sesgada pero la superficie es la misma. Techo: bajar más pendiente exige marco ortogonal.
    const fr: Fr[] = pts.map((p, i) => {
      const t = th[i], b = clamp(Math.atan(9 * kap[i]), -0.45, 0.45), c = Math.cos(b), s = Math.sin(b), r: V3 = [Math.cos(t), 0, -Math.sin(t)];
      return { p, lat: [r[0] * c, -s, r[2] * c], up: [r[0] * s, c, r[2] * s] };
    });
    const tail = (i: number) => sstep((1 - i / n) / 0.1), half = (i: number) => hHalf(i * DS) + 3.5 * (1 - tail(i)), wall = (i: number) => 1.7 * tail(i);
    const sec = (i: number): Sec => { const h = half(i), w = wall(i); return [[-h - 0.05, w + 0.45], ...Array.from({ length: 11 }, (_, q): [number, number] => { const t = -1 + q * 0.2; return [t * h, w * Math.abs(t) ** 3]; }), [h + 0.05, w + 0.45]]; };
    const mat = pbr("acuaTobogan" + k, { color: S.col, rough: 0.3 });
    stat(sweep("acuaTobogan" + k, fr, sec, mat), B.PhysicsShapeType.MESH, { friction: 0.3 }, [0, 0, 0]);
    const ribbon = sweep("acuaCorriente" + k, fr, (i) => Array.from({ length: 7 }, (_, q): [number, number] => { const t = -0.55 + q * 0.1833, h = half(i); return [t * h, wall(i) * Math.abs(t) ** 3 + 0.07]; }), wRib);
    ribbon.receiveShadows = true;
    // Apoyos (solo visual: el auto no pasa por debajo) cada 12 m
    for (let i = 8; i < n - 6; i += 8) if (pts[i][1] > 1.6) deco.push(cyl(0.7, 0.9, pts[i][1] - 0.5, white, [pts[i][0], (pts[i][1] - 0.5) / 2 - 0.05, pts[i][2]], undefined, 8));
    bare.push({ x: pts[n >> 1][0], z: pts[n >> 1][2], r: 30 });
    // Estanque de llegada: agua visual al pie del tobogán
    const e = pts[n]; ripple("acuaLlegada" + k, e[0] + Math.sin(th[n]) * 8, e[2] + 8, 7, 0.1, 1.15);
  });

  // ---- Pileta grande (agua poca) y pileta vacía: cráteres suaves para bajar y patinar ----
  { const [px, pz] = [120, 175], r0 = 15;
    crater(px, pz, r0, 2.6, 10, 2.5, 10, tile);
    ripple("acuaAguaGrande", px, pz, r0 + 2.1, 0.3);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.7; deco.push(cyl(2.4, 2.4, 0.5, M.plastic(["#ff7043", "#ffee58", "#ec407a", "#26c6da"][i]), [px + Math.cos(a) * 8, 0.45, pz + Math.sin(a) * 8], [0.1, 0, 0], 12)); } // flotadores planos en el agua (sin colisión)
    crater(80, 232, 8, 2.2, 7, 2, 8, tile); // pileta vacía
  }

  // ---- Piletas bajas con agua visual y trampolines ----
  for (const [x, z, r] of [[182, 112, 8], [186, 140, 7], [170, 205, 8], [150, 240, 7]]) {
    ripple("acuaChapoteo", x, z, r);
    deco.push(cyl(r * 2 + 1.6, r * 2 + 1.6, 0.04, tile, [x, 0.06, z], undefined, 24)); // aro de azulejo (visual)
    bare.push({ x, z, r: r + 2 });
  }
  [[100, 120, "#ec407a"], [142, 114, "#fbc02d"], [168, 152, "#26c6da"]].forEach(([x, z, c]) => {
    trampoline(x as number, z as number, pbr("acuaTrampolin" + c, { color: c as string, rough: 0.6 }));
    deco.push(cyl(9, 9, 0.08, M.matte("#23262b"), [x as number, 0.52, z as number], undefined, 20)); // lona oscura sobre el aro de color
  });

  // ---- Sombrillas y reposeras alrededor de la pileta grande y la plaza sur ----
  const stripe = ["#ec407a", "#fbc02d", "#26c6da", "#ff7043", "#7e57c2"];
  const umbrella = (x: number, z: number, i: number) => {
    const c = stripe[i % 5];
    deco.push(cyl(0.2, 0.28, 3.4, white, [x, 1.7, z], undefined, 6), cyl(0.1, 5.4, 1.1, M.matte(c), [x, 3.6, z], undefined, 8), cyl(5.4, 5.4, 0.1, M.matte(i & 1 ? "#ffffff" : c), [x, 3.1, z], undefined, 8));
    solid(x, 0, z, 0.55, 3.4, 0.55, 0, B.PhysicsShapeType.CYLINDER);
  };
  const lounger = (x: number, z: number, ry: number, c: string) => {
    const co = Math.cos(ry), si = Math.sin(ry), P = (lx: number, ly: number, lz: number): V3 => [x + lx * co + lz * si, ly, z - lx * si + lz * co], cc = M.plastic(c);
    deco.push(box(0.8, 0.12, 1.2, cc, P(0, 0.4, -0.4), [0, ry, 0]), box(0.8, 0.12, 1.0, cc, P(0, 0.75, 0.5), [0.7, ry, 0]), box(0.9, 0.34, 0.1, steel, P(0, 0.2, -0.9), [0, ry, 0]), box(0.9, 0.34, 0.1, steel, P(0, 0.2, 0.4), [0, ry, 0]));
    solid(x, 0, z, 0.9, 0.5, 2, ry);
  };
  [0.3, 1.0, 1.7, 2.5, 3.5, 4.4, 5.3].forEach((a, i) => {
    const R = 41, ux = Math.cos(a), uz = Math.sin(a), x = 120 + ux * R, z = 175 + uz * R;
    if (x < 52 || z > 252 || z < 112) return;
    umbrella(x, z, i);
    const ry = Math.atan2(-ux, -uz);
    lounger(x + uz * 1.9, z - ux * 1.9, ry, stripe[(i + 2) % 5]); lounger(x - uz * 1.9, z + ux * 1.9, ry, stripe[(i + 3) % 5]);
  });
  [[95, 104], [125, 106], [76, 150], [66, 200], [96, 252], [175, 178], [196, 225]].forEach(([x, z], i) => { umbrella(x, z, i + 3); lounger(x + 3.2, z - 1, 0.4, stripe[i % 5]); });

  // ---- Flotadores gigantes de juguete (con colisión de cilindro) y pelota ----
  { const ring = (x: number, z: number, d: number, c: string) => {
      const t = B.MeshBuilder.CreateTorus("acuaDona", { diameter: d, thickness: d * 0.4, tessellation: 24 }, scene);
      t.position.set(x, d * 0.2, z); t.material = M.plastic(c); deco.push(t); solid(x, 0, z, d, d * 0.4, d, 0, B.PhysicsShapeType.CYLINDER);
    };
    ring(62, 160, 7, "#ec407a"); ring(64, 222, 6, "#26c6da"); ring(204, 190, 6, "#ff7043");
    const duck = (x: number, z: number, ry: number) => {
      const co = Math.cos(ry), si = Math.sin(ry), P = (lx: number, ly: number, lz: number): V3 => [x + lx * co + lz * si, ly, z - lx * si + lz * co];
      deco.push(sph(6, yel, P(0, 2.6, 0), [1, 0.8, 1.3]), sph(3.4, yel, P(0, 5.4, 2.4)), box(1.4, 0.5, 1.6, M.plastic("#ff7043"), P(0, 5.2, 4.2), [0, ry, 0]), sph(0.6, dark, P(0.9, 5.9, 3.7)), sph(0.6, dark, P(-0.9, 5.9, 3.7)), sph(2.4, yel, P(0, 3.6, -3.4), [0.8, 1, 1]));
      solid(x, 0, z, 6, 5, 6, 0, B.PhysicsShapeType.CYLINDER);
    };
    duck(58, 190, 0.4); duck(197, 108, -0.6);
    deco.push(sph(5, M.plastic("#ec407a"), [88, 2.5, 118]), sph(5.1, M.plastic("#ffee58"), [88, 2.5, 118], [0.35, 1, 1]), sph(5.1, M.plastic("#26c6da"), [88, 2.5, 118], [1, 1, 0.35])); solid(88, 0, 118, 5, 5, 5, 0, B.PhysicsShapeType.CYLINDER); // pelota
  }

  // ---- Portal de entrada (oeste, sobre el atajo noreste) con cartel de dos caras ----
  { const gx = 28 + (108 - 28) * (34 / 102), gz = 108, ry = Math.atan2(34, 102), co = Math.cos(ry), si = Math.sin(ry);
    for (const s of [-1, 1]) { const x = gx + s * 8 * co, z = gz - s * 8 * si; deco.push(cyl(1.2, 1.4, 9, white, [x, 4.5, z], undefined, 8), sph(2, M.matte(s < 0 ? "#ec407a" : "#26c6da"), [x, 9.4, z])); solid(x, 0, z, 1.6, 9, 1.6, 0, B.PhysicsShapeType.CYLINDER); }
    deco.push(box(18, 0.8, 1, teal, [gx, 8.2, gz], [0, ry, 0]));
    const dt = new B.DynamicTexture("acuaCartelTex", { width: 1024, height: 256 }, scene, true), g = dt.getContext() as unknown as CanvasRenderingContext2D;
    g.fillStyle = "#1fb5ad"; g.fillRect(0, 0, 1024, 256); g.fillStyle = "#ffffff"; g.fillRect(14, 14, 996, 228); g.fillStyle = "#1a1d22"; g.fillRect(26, 26, 972, 204);
    g.font = "bold 150px 'Bebas Neue', Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#6fd8ff"; g.fillText("PARQUE ACUÁTICO", 512, 140); dt.update();
    const sm = new B.StandardMaterial("acuaCartelMat", scene); sm.emissiveTexture = dt; sm.disableLighting = true; sm.backFaceCulling = false;
    const pl = B.MeshBuilder.CreatePlane("acuaCartel", { width: 17, height: 4.25, sideOrientation: B.Mesh.DOUBLESIDE }, scene);
    pl.position.set(gx, 11, gz); pl.rotation.y = ry; pl.material = sm; pl.isPickable = false;
    undo.push(() => { dt.dispose(); sm.dispose(); });
    bare.push({ x: gx, z: gz, r: 16 });
  }

  // ---- Faroles (emisivos para el ciclo de luz; sin luces dinámicas) ----
  for (const [x, z] of [[70, 262 - 6], [120, 100], [196, 100], [262 - 4, 180], [48, 150], [150, 256]]) {
    deco.push(cyl(0.3, 0.4, 7, dark, [x, 3.5, z]), sph(1.1, glow, [x, 7.2, z]));
    solid(x, 0, z, 0.8, 3, 0.8, 0, B.PhysicsShapeType.CYLINDER);
  }

  const d = merge("acuaDeco", deco); d.isPickable = false; d.receiveShadows = true; shadows.addShadowCaster(d);
}

export const barrio: Barrio = { id: "acuatico", cx: 152, cz: 180, build };
