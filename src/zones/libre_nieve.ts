import * as B from "@babylonjs/core";
import { box, cyl, merge, sph } from "../models";
import { M, pbr, shadows } from "../render";
import { decal, lowQ, scene, stat, tex } from "./common";
import type { Barrio } from "./libre";

// Free Roam, barrio NIEVE (bosque nevado de juguete, centro -150,-150; ocupa x -266..-26, z -266..-26).
// Relieve = UNA función H(x,z) (lomas con perfil de coseno + mirador con meseta); el visible y el colisionador son la misma malla de rejilla,
// así los pinos, muñecos y trineos se apoyan en H. La pista de bajada es una cinta con peralte, bermas y faldones que parte de la meseta.
// Física medida: un escalón de 0,1 m frena al auto -> todo enlaza por pendiente continua o enterrado (-0,06 / -0,04); lo plano decorativo no lleva colisionador.
// Decorado con generador local (lcg), nunca rng(); sin observers ni texturas propias (nada que liberar al desarmar).

type V3 = [number, number, number];
const lcg = (s: number) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const sm = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const hidden = (m: B.Mesh) => ((m.isVisible = false), m);
const lin = (h: string) => B.Color3.FromHexString(h).toLinearSpace();

// ---- Relieve ----
const MX = -105, MZ = -218, MR = 48, MP = 8, MA = 10; // mirador: centro, radio, radio de la meseta plana, altura (pendiente máx ~0,38)
const LOMAS: [number, number, number, number][] = [ // x, z, radio, altura: pendiente máx = altura*pi/(2*radio) <= 0,31
  [-228, -236, 14, 2.4], [-203, -208, 12, 2.0], [-238, -196, 13, 2.6], [-212, -168, 15, 3.0], [-244, -156, 12, 2.2], [-190, -142, 11, 1.8], [-226, -130, 12, 2.0],
];
const H = (x: number, z: number) => {
  let h = MA * sm((MR - Math.hypot(x - MX, z - MZ)) / (MR - MP));
  for (const [bx, bz, R, A] of LOMAS) { const d = Math.hypot(x - bx, z - bz); if (d < R) h += A * (0.5 + 0.5 * Math.cos((Math.PI * d) / R)); }
  return h;
};

// Lago congelado: el modo puede bajar el agarre dentro de esta elipse (ver informe).
export const lagoHielo = { cx: -195, cz: -70, rx: 34, rz: 20 };

// ---- Pista de bajada: puntos de control (x, z), de la meseta al lago ----
const CP: [number, number][] = [[-105, -226], [-105, -200], [-140, -186], [-172, -164], [-150, -138], [-176, -116], [-198, -104], [-196, -92]];
const HALFW = 6.9, TOP = MA - 0.04;
// perfil de media sección: [u, altura relativa] desde el eje; la berm sube a 1,15 m y termina en un faldón vertical hasta el suelo
const PROF: [number, number][] = [[0, 0], [2.5, 0], [4.6, 0], [5.4, 0.2], [6.0, 0.7], [6.4, 1.15], [HALFW, 1.15]];

function track() {
  // curva Catmull-Rom densa -> remuestreo a 2 m
  const P = [[2 * CP[0][0] - CP[1][0], 2 * CP[0][1] - CP[1][1]], ...CP, [2 * CP[CP.length - 1][0] - CP[CP.length - 2][0], 2 * CP[CP.length - 1][1] - CP[CP.length - 2][1]]];
  const dense: [number, number][] = [];
  for (let i = 1; i < P.length - 2; i++) for (let k = 0; k < 24; k++) {
    const t = k / 24, f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    dense.push([f(P[i - 1][0], P[i][0], P[i + 1][0], P[i + 2][0]), f(P[i - 1][1], P[i][1], P[i + 1][1], P[i + 2][1])]);
  }
  dense.push(CP[CP.length - 1]);
  const cum = [0]; for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const L = cum[cum.length - 1], n = Math.round(L / 2), pts: { x: number; z: number; s: number }[] = [];
  for (let i = 0, j = 0; i <= n; i++) {
    const s = (L * i) / n; while (j < dense.length - 2 && cum[j + 1] < s) j++;
    const u = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    pts.push({ x: dense[j][0] + (dense[j + 1][0] - dense[j][0]) * u, z: dense[j][1] + (dense[j + 1][1] - dense[j][1]) * u, s });
  }
  const th = pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)]; return Math.atan2(b.x - a.x, b.z - a.z); });
  let kap = th.map((t, i) => { const a = Math.max(0, i - 1), b = Math.min(n, i + 1); let d = th[b] - th[a]; d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI; return d / (pts[b].s - pts[a].s); });
  for (let r = 0; r < 6; r++) kap = kap.map((_, i) => (kap[Math.max(0, i - 1)] + kap[i] + kap[Math.min(n, i + 1)]) / 3);
  // altura del eje: meseta a TOP, descenso suave (derivada 0 en los extremos), 3 lomitas y llegada enterrada (-0,04) al suelo del lago
  const S0 = 20, E0 = 14, bumps = [0.34, 0.52, 0.72].map((f) => f * L);
  const yc = (s: number) => TOP + (-0.04 - TOP) * sm((s - S0) / (L - S0 - E0)) + bumps.reduce((a, c) => a + 0.9 * Math.exp(-(((s - c) / 4.5) ** 2)), 0) * sm((L - E0 - s) / 6);
  const ws = (s: number) => sm((s - 18) / 14) * sm((L - 8 - s) / 20); // berm y peralte: nacen tras la meseta y mueren antes del lago
  return { pts, th, n, L, yc, ws, bank: (i: number) => B.Scalar.Clamp(kap[i] * 10, -0.3, 0.3) * ws(pts[i].s) };
}

/** Rejilla de relieve: vértices propios por cuadro (arista viva de juguete), color por altura; omite cuadros sin relieve. Sale como colisionador MESH. */
function field(name: string, x0: number, z0: number, x1: number, z1: number, st: number, mat: B.Material) {
  const nx = Math.round((x1 - x0) / st), nz = Math.round((z1 - z0) / st), pos: number[] = [], col: number[] = [], ind: number[] = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const q = [[i, j], [i, j + 1], [i + 1, j + 1], [i + 1, j]].map(([a, b]) => { const x = x0 + a * st, z = z0 + b * st; return [x, H(x, z), z]; });
    if (q.every((p) => p[1] <= 0.001)) continue;
    const b = pos.length / 3;
    for (const [x, h, z] of q) { pos.push(x, h - 0.06, z); const k = 0.9 + 0.1 * B.Scalar.Clamp(h / 3, 0, 1); col.push(0.86 * k, 0.9 * k, 0.96 * k, 1); }
    ind.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  return mesh(name, pos, col, ind, mat);
}
function mesh(name: string, pos: number[], col: number[], ind: number[], mat: B.Material) {
  const nor: number[] = []; B.VertexData.ComputeNormals(pos, ind, nor);
  let up = 0; for (let i = 1; i < nor.length; i += 3) up += nor[i];
  if (up < 0) { for (let i = 0; i < ind.length; i += 3) [ind[i + 1], ind[i + 2]] = [ind[i + 2], ind[i + 1]]; B.VertexData.ComputeNormals(pos, ind, nor); }
  const m = new B.Mesh(name, scene), vd = new B.VertexData();
  vd.positions = pos; vd.indices = ind; vd.normals = nor; vd.colors = col; vd.applyToMesh(m);
  m.material = mat; m.isPickable = false;
  return m;
}

export function nieveBuild(_cx: number, _cz: number) {
  const r = lcg(20261015), vc = pbr("nieveVC", { color: "#ffffff", rough: 0.85 });
  const wood = M.matte("#a0683c"), dkw = M.matte("#6e4524"), red = M.plastic("#e53935"), wht = M.matte("#eef3f9"), blk = M.matte("#1b1d22"), glowM = M.glow("#ffd98a");

  // ---- Suelo nevado: la calle de los otros barrios es asfalto; aquí una losa de nieve (y 0,015, bajo el atajo de 0,025) ----
  { const t = tex("libreNieve", () => { const x = new B.Texture("./textures/g-libre-nieve.webp", scene); x.wrapU = x.wrapV = B.Texture.WRAP_ADDRESSMODE; x.uScale = x.vScale = 6; return x; });
    decal("nieveSuelo", 240, 240, -146, -146, pbr("nieveSuelo", { color: "#d3dbe5", rough: 0.85, tex: t }), 0.015); }

  // ---- Relieve: mirador + campo de lomas (cada uno un colisionador MESH) ----
  stat(field("nieveMirador", MX - MR - 2, MZ - MR - 2, MX + MR + 2, MZ + MR + 2, 2.5, vc), B.PhysicsShapeType.MESH, { friction: 0.6 }, [0, 0, 0]);
  stat(field("nieveLomas", -262, -254, -176, -122, 2, vc), B.PhysicsShapeType.MESH, { friction: 0.6 }, [0, 0, 0]);

  // ---- Pista de bajada ----
  const T = track(), rows = [...PROF.slice(1).reverse().map(([u, h]) => [-u, h]), ...PROF.map(([u, h]) => [u, h])] as [number, number][]; // de la berm izquierda a la derecha
  { const pos: number[] = [], col: number[] = [], ind: number[] = [];
    const C = { road: lin("#9fb0c8"), edge: lin("#d3e0ef"), skirt: lin("#dfe9f4"), r: lin("#e53935"), w: lin("#f4f8fc") };
    const sect = (i: number) => { // vértices de una sección: filas del perfil + base del faldón a cada lado
      const p = T.pts[i], f = T.ws(p.s), tn = Math.tan(T.bank(i)), y = T.yc(p.s), ca = Math.cos(T.th[i]), sa = Math.sin(T.th[i]);
      const at = (u: number, h: number, floorY?: number): V3 => [p.x + u * ca, floorY ?? y + h * f - u * tn, p.z - u * sa];
      return [at(-HALFW, 0, -0.06), ...rows.map(([u, h]) => at(u, h)), at(HALFW, 0, -0.06)];
    };
    let prev = sect(0);
    for (let i = 1; i <= T.n; i++) {
      const cur = sect(i), stripe = (i >> 1) & 1;
      for (let k = 0; k < cur.length - 1; k++) {
        const a = prev[k], b = prev[k + 1], c = cur[k + 1], d = cur[k], rk = k - 1; // k=0 y último: faldones; rk = índice de fila
        const nrow = rows.length, mid = Math.abs(rows[Math.min(Math.max(rk, 0), nrow - 2)][0] + rows[Math.min(Math.max(rk + 1, 0), nrow - 1)][0]) / 2;
        const cc = k === 0 || k === cur.length - 2 ? C.skirt : mid < 4.6 ? C.road : mid < 5.6 ? C.edge : stripe ? C.r : C.w;
        const o = pos.length / 3;
        for (const v of [a, b, c, d]) { pos.push(...v); col.push(cc.r, cc.g, cc.b, 1); }
        ind.push(o, o + 1, o + 2, o, o + 2, o + 3);
      }
      prev = cur;
    }
    // el faldón cae vertical: mesh() orienta por la suma de normales y; aquí domina la cara superior
    stat(mesh("nieveBajada", pos, col, ind, vc), B.PhysicsShapeType.MESH, { friction: 0.5 }, [0, 0, 0]);
  }
  const trackD = (x: number, z: number) => T.pts.reduce((m, p) => Math.min(m, Math.hypot(p.x - x, p.z - z)), 1e9);

  // ---- Piezas de decorado (todo fusionado) ----
  const obras: B.Mesh[] = [], veg: B.Mesh[] = [];
  const solid = (x: number, y: number, z: number, w: number, h: number, d: number, ry = 0, shape = B.PhysicsShapeType.BOX) =>
    hidden(stat(shape === B.PhysicsShapeType.BOX ? box(w, h, d, wood, [0, 0, 0]) : cyl(w, w, h, wood, [0, 0, 0], undefined, 8), shape, {}, [x, y + h / 2, z, ry]));

  // Arco de largada sobre la pista (s = 26): postes fuera de la berm, viga con bloques rojo/blanco
  { const p = T.pts[13], ca = Math.cos(T.th[13]), sa = Math.sin(T.th[13]), y = T.yc(p.s), ry = T.th[13];
    for (const sg of [-1, 1]) { const x = p.x + sg * 8.2 * ca, z = p.z - sg * 8.2 * sa; obras.push(cyl(0.9, 1.1, 8, dkw, [x, y + 3, z], undefined, 7)); solid(x, y - 1, z, 1.1, 5, 1.1, 0, B.PhysicsShapeType.CYLINDER); }
    for (let k = 0; k < 8; k++) obras.push(box(2.2, 1.3, 0.5, k & 1 ? wht : red, [p.x + (k - 3.5) * 2.2 * ca, y + 7.6, p.z - (k - 3.5) * 2.2 * sa], [0, ry, 0]));
  }
  // Mirador: bandera, banca-trineo y muñeco en la meseta (apoyados en H)
  obras.push(cyl(0.3, 0.4, 7, dkw, [MX + 6, MA + 3.5, MZ + 3], undefined, 6), box(0.1, 1.6, 2.8, red, [MX + 6, MA + 6.1, MZ + 4.4]));
  solid(MX + 6, MA - 0.5, MZ + 3, 0.8, 5, 0.8, 0, B.PhysicsShapeType.CYLINDER);

  const snowman = (x: number, z: number, s: number, ry = 0) => {
    const y = H(x, z), P = (lx: number, ly: number, lz: number): V3 => [x + lx * Math.cos(ry) + lz * Math.sin(ry), y + ly * s, z - lx * Math.sin(ry) + lz * Math.cos(ry)];
    obras.push(sph(4.2 * s, wht, P(0, 1.9, 0)), sph(3 * s, wht, P(0, 4.6, 0)), sph(2.1 * s, wht, P(0, 6.7, 0)),
      cyl(1.3 * s, 1.5 * s, 0.2 * s, blk, P(0, 7.65, 0), undefined, 10), cyl(1.1 * s, 1.1 * s, 1.1 * s, blk, P(0, 8.2, 0), undefined, 10),
      cyl(0, 0.4 * s, 1.6 * s, M.matte("#fb8c00"), P(0, 6.7, 1.3), [Math.PI / 2, ry, 0], 6), box(2.4 * s, 0.5 * s, 2.4 * s, red, P(0, 5.7, 0), [0, ry, 0]),
      sph(0.3 * s, blk, P(-0.45, 6.95, 0.95)), sph(0.3 * s, blk, P(0.45, 6.95, 0.95)), ...[4.8, 4.2, 3.6].map((dy) => sph(0.35 * s, blk, P(0, dy, 1.4))));
    solid(x, y, z, 3.6 * s, 8 * s, 3.6 * s, 0, B.PhysicsShapeType.CYLINDER);
  };
  const sled = (x: number, z: number, ry: number, col = red) => {
    const y = H(x, z), c = Math.cos(ry), s = Math.sin(ry), P = (lx: number, ly: number, lz: number): V3 => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c];
    obras.push(box(1, 0.14, 2.1, col, P(0, 0.4, 0), [0, ry, 0]), box(0.9, 0.5, 0.12, wood, P(0, 0.7, -0.9), [0, ry, 0]), box(0.1, 0.1, 2.5, dkw, P(-0.38, 0.12, 0), [0, ry, 0]), box(0.1, 0.1, 2.5, dkw, P(0.38, 0.12, 0), [0, ry, 0]), box(0.08, 0.3, 0.1, dkw, P(-0.38, 0.28, 1.0), [0, ry, 0]), box(0.08, 0.3, 0.1, dkw, P(0.38, 0.28, 1.0), [0, ry, 0]));
    solid(x, y, z, 1.1, 0.9, 2.4, ry);
  };
  snowman(MX - 5, MZ - 5, 0.5, 0.8);
  for (const [x, z, s, ry] of [[-152, -62, 0.55, 1.2], [-148, -57, 0.35, 1.0], [-236, -46, 0.5, -0.6], [-122, -92, 0.5, 0.4], [-70, -176, 0.55, 2.4], [-60, -62, 0.45, 0.7]] as [number, number, number, number][]) snowman(x, z, s, ry);
  for (const [x, z, ry] of [[MX - 4, MZ - 4, 0.3], [MX - 7, MZ + 1, 0.9]] as V3[]) sled(x, z, ry);
  for (const [x, z, ry, c] of [[-212, -150, 0.2, "#1e88e5"], [-168, -78, 1.6, "#fbc02d"], [-244, -118, 0.5, "#e53935"], [-80, -120, 2.0, "#1e88e5"], [-196, -226, 0.1, "#fbc02d"], [-72, -128, 0.4, "#e53935"]] as [number, number, number, string][]) sled(x, z, ry, M.plastic(c));

  // Cabañita (puerta al oeste): cuerpo de troncos, techo a dos aguas con nieve, chimenea con humo, ventanas encendidas para la noche
  { const [x, z, ry] = [-68, -146, -Math.PI / 2], c = Math.cos(ry), s = Math.sin(ry), P = (lx: number, ly: number, lz: number): V3 => [x + lx * c + lz * s, ly, z - lx * s + lz * c];
    const th = Math.atan2(2.6, 4.1), L = Math.hypot(4.1, 2.6) + 0.5;
    obras.push(box(9, 4.4, 7, wood, P(0, 2.2, 0), [0, ry, 0]), box(9.4, 0.4, 7.4, dkw, P(0, 0.2, 0), [0, ry, 0]), box(10, 0.4, 0.5, dkw, P(0, 4.5, 3.6), [0, ry, 0]));
    for (const sg of [-1, 1]) obras.push(box(10, 0.4, L, dkw, P(0, 5.75, sg * 2.05), [sg * -th, ry, 0]), box(10.2, 0.5, L - 0.3, wht, P(0, 6.05, sg * 2.0), [sg * -th, ry, 0]));
    obras.push(box(1.6, 3.2, 1.6, M.matte("#8a5a44"), P(-2.8, 6.2, 1), [0, ry, 0]), box(1.9, 0.4, 1.9, wht, P(-2.8, 7.9, 1), [0, ry, 0]), sph(1.2, wht, P(-2.8, 9.0, 1)), sph(1.6, wht, P(-2.4, 10.4, 1.2)),
      box(1.8, 3, 0.2, dkw, P(0, 1.5, 3.55), [0, ry, 0]), box(1.8, 3.2, 0.12, dkw, P(0, 1.6, 3.5), [0, ry, 0]), sph(0.2, glowM, P(0.6, 1.5, 3.7)),
      box(1.8, 1.5, 0.15, glowM, P(-3, 2.6, 3.52), [0, ry, 0]), box(1.8, 1.5, 0.15, glowM, P(3, 2.6, 3.52), [0, ry, 0]), box(0.15, 1.5, 1.8, glowM, P(4.52, 2.6, -1), [0, ry, 0]));
    for (let k = 0; k < 5; k++) obras.push(cyl(0.9, 0.9, 1.6, dkw, P(-5.5 + (k % 3) * 0.95, 0.5 + Math.floor(k / 3) * 0.9, -2.2), [Math.PI / 2, ry, 0], 8)); // leña
    solid(x, 0, z, 9, 4.6, 7, ry);
  }

  // Lago congelado: orilla de nieve, hielo liso con grietas (solo visual, y 0,03-0,05: sin escalón) y banco de nieve alrededor
  { const { cx, cz, rx, rz } = lagoHielo, shoreM = pbr("nieveOrilla", { color: "#eaf1f8", rough: 0.9 }), ice = pbr("nieveHielo", { color: "#8fcfe6", rough: 0.06, emissive: "#16394a" });
    shoreM.zOffset = -3; ice.zOffset = -4;
    for (const [n, a, b, y, mat] of [["nieveOrilla", rx + 3, rz + 3, 0.03, shoreM], ["nieveLago", rx, rz, 0.04, ice]] as [string, number, number, number, B.Material][]) {
      const d = B.MeshBuilder.CreateDisc(n, { radius: 1, tessellation: 48 }, scene);
      d.rotation.x = Math.PI / 2; d.scaling.set(a, b, 1); d.position.set(cx, y, cz); d.material = mat; d.isPickable = false; d.receiveShadows = true;
    }
    const crack = M.matte("#e6f6fb"), parts: B.Mesh[] = [];
    for (let i = 0; i < (lowQ ? 8 : 18); i++) { const a = r() * 6.28, rr = Math.sqrt(r()) * 0.85, ry = r() * 3.14; parts.push(box(2 + r() * 5, 0.01, 0.12, crack, [cx + Math.cos(a) * rx * rr, 0.06, cz + Math.sin(a) * rz * rr], [0, ry, 0])); }
    const cr = merge("nieveGrietas", parts); cr.isPickable = false;
    for (let i = 0; i < 22; i++) { // banco de nieve y rocas bajas alrededor (sin colisionador); el sur queda libre para la entrada de la pista
      const a = (i / 22) * 6.283 + r() * 0.2; if (Math.sin(a) < -0.55) continue;
      const w = 1.4 + r() * 1.6; veg.push(sph(w * 2, i % 3 ? wht : M.matte("#8b8f95"), [cx + (rx + 2.2) * Math.cos(a), 0.2, cz + (rz + 2.2) * Math.sin(a)], [1.3, 0.35, 1], 4));
    }
  }

  // ---- Bosque: pinos con nieve (a mano; los de nieve.ts no se exportan). Rechazo contra pista, lago, mirador, lomas, atajo y entre sí ----
  const greens = [M.matte("#2f5a3a"), M.matte("#3b6b44"), M.matte("#27503a")], trunk = M.matte("#5b3d24"), pines: [number, number][] = [];
  const free = (x: number, z: number, m: number) => {
    const { cx, cz, rx, rz } = lagoHielo;
    return trackD(x, z) > 12 + m && ((x - cx) / (rx + 6 + m)) ** 2 + ((z - cz) / (rz + 6 + m)) ** 2 > 1 && Math.hypot(x - MX, z - MZ) > MR + 2
      && !(x < -176 && x > -262 && z < -110 && z > -254) && Math.abs(x - z) > 14 + m && Math.hypot(x + 68, z + 146) > 14 + m && H(x, z) < 0.02;
  };
  for (let n = 0; n < 900 && pines.length < (lowQ ? 36 : 64); n++) {
    const x = -262 + r() * 228, z = -262 + r() * 228;
    if (!free(x, z, 0) || pines.some(([px, pz]) => Math.hypot(x - px, z - pz) < 9)) continue;
    pines.push([x, z]);
    const s = 0.8 + r() * 0.5, g = greens[pines.length % 3];
    veg.push(cyl(0.6 * s, 0.8 * s, 2 * s, trunk, [x, s, z], undefined, 6));
    for (let i = 0; i < 3; i++) { const d = (5.2 - i * 1.4) * s, h = 3.4 * s, y = (2 + i * 2.1) * s + h / 2; veg.push(cyl(0, d, h, g, [x, y, z], undefined, 7), cyl(0, d * 0.8, h * 0.62, wht, [x, y + h * 0.2, z], undefined, 7)); }
    veg.push(cyl(0, 1.2 * s, 1.5 * s, wht, [x, 8.9 * s, z], undefined, 7));
    solid(x, 0, z, 1.3 * s, 4, 1.3 * s, 0, B.PhysicsShapeType.CYLINDER);
  }
  for (let n = 0, got = 0; n < 300 && got < (lowQ ? 10 : 22); n++) { // montículos y rocas nevadas sueltas (visual; los chicos no llevan colisionador)
    const x = -262 + r() * 228, z = -262 + r() * 228; if (!free(x, z, 3)) continue; got++;
    veg.push(sph(2 + r() * 2, wht, [x, 0.1, z], [1.4, 0.4, 1.1], 4));
  }
  for (const [n, parts] of [["nieveObras", obras], ["nieveBosque", veg]] as [string, B.Mesh[]][]) { const m = merge(n, parts); m.isPickable = false; m.receiveShadows = true; shadows.addShadowCaster(m); }
}

// Lugar: cuadrante sur-oeste (diseño). Rectángulo x -266..-26, z -266..-26: libre de avenidas (|x|,|z| > 12), del anillo (a 266) y del skatepark/parque/acuático (norte y este).
export const barrio: Barrio = { id: "nieve", cx: -150, cz: -150, build: nieveBuild };
