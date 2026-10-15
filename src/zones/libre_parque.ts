import * as B from "@babylonjs/core";
import { box, cyl, merge, rbox, sph } from "../models";
import { M, pbr, shadows } from "../render";
import { ramp } from "../world_layout";
import type { Barrio } from "./libre";
import { bare, lowQ, scene, stat, undo } from "./common";

// Free Roam, barrio PARQUE (estilo Central Park de juguete): senderos, laguito con puente, árboles y arbustos, juegos de plaza y animales.
// parqueBuild(cx, cz) arma un rectángulo de 140 x 74 m centrado en (cx, cz). Local: +x este, +z norte.
// Todo fusionado o instanciado; colisionadores con stat(..., at) (pose antes del aggregate); decorado con lcg local, nunca rng().
const lcg = (s: number) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const RX = 31, RZ = 20, LX = 21, LZ = 11.5, SHORE = 2.2; // sendero anillo y laguito (elipses)
const GREENS = ["#5f9e3e", "#6fae45", "#4f8a38"], KEEP_Y = { lawn: 0.03, path: 0.07, shore: 0.085, water: 0.11 };
// Zonas ocupadas (x, z, radio) por juegos y glorieta: ni árboles ni flores ahí.
const FIX: [number, number, number][] = [[47, 14, 9], [61, -14, 9], [44, 27, 7], [63, 26, 6], [63, -26, 6], [46, -28, 8], [-52, 18, 9], [-50, -18, 5]];
const blocked = (x: number, z: number, m: number) =>
  (x / (LX + SHORE + m)) ** 2 + (z / (LZ + SHORE + m)) ** 2 < 1 // laguito y orilla
  || Math.abs(Math.hypot(x / RX, z / RZ) - 1) * RZ < 3 + m // anillo (aprox. conservadora)
  || (Math.abs(x) < 3 + m && Math.abs(z) > 15) || (Math.abs(z) < 3 + m && Math.abs(x) > 26) // sendas en cruz
  || FIX.some(([fx, fz, fr]) => Math.hypot(x - fx, z - fz) < fr + m);

export function parqueBuild(cx: number, cz: number) {
  const r = lcg(20261015), at = (x: number, z: number) => [cx + x, cz + z] as const;
  const wood = M.matte("#b07a4a"), dkw = M.matte("#7a5230"), steel = M.metal("#aab0b8");
  // Colisionador invisible (caja o cilindro) en local (x, z); y = base 0.
  const solid = (x: number, z: number, w: number, h: number, d: number, ry = 0, shape = B.PhysicsShapeType.BOX) => {
    const m = shape === B.PhysicsShapeType.BOX ? box(w, h, d, wood, [0, 0, 0]) : cyl(w, w, h, wood, [0, 0, 0], undefined, 8);
    m.isVisible = false; m.isPickable = false;
    stat(m, shape, {}, [cx + x, h / 2, cz + z, ry]);
  };
  const obras: B.Mesh[] = [], veg: B.Mesh[] = [];

  // ---- Piso: césped en franjas de dos verdes (solo visual, el colisionador es el piso de la zona) ----
  { const parts: B.Mesh[] = [];
    for (let i = 0; i < 14; i++) parts.push(box(10, 0.06, 74, M.matte(i % 2 ? "#7aa84c" : "#6e9d44"), [cx - 65 + i * 10, 0, cz]));
    const m = merge("parqueCesped", parts); m.isPickable = false; m.receiveShadows = true;
  }

  // ---- Senderos (anillo + cruz) y suelo de goma de los juegos: materiales con zOffset, por eso `keep` ----
  const pm = pbr("parqueSendero", { color: "#dcc89c", rough: 0.9 }), gm = pbr("parqueGoma", { color: "#c1633f", rough: 0.95 });
  pm.zOffset = -2; gm.zOffset = -1;
  { const ell = (rx: number, rz: number) => Array.from({ length: 65 }, (_, i) => { const a = (i / 64) * Math.PI * 2; return new B.Vector3(cx + rx * Math.cos(a), KEEP_Y.path, cz + rz * Math.sin(a)); });
    const ring = B.MeshBuilder.CreateRibbon("parqueAnillo", { pathArray: [ell(RX - 3, RZ - 3), ell(RX + 3, RZ + 3)], sideOrientation: B.Mesh.DOUBLESIDE }, scene);
    ring.material = pm; ring.isPickable = false; ring.receiveShadows = true;
    const t = KEEP_Y.path - 0.02, parts = [
      box(6, 0.04, 22, pm, [cx, t - 0.02, cz + 26]), box(6, 0.04, 22, pm, [cx, t - 0.02, cz - 26]), // N-S
      box(44, 0.04, 6, pm, [cx + 49, t - 0.02, cz]), box(44, 0.04, 6, pm, [cx - 49, t - 0.02, cz]), // E-O
      box(30, 0.04, 22, gm, [cx + 52, 0.04, cz + 21]), box(30, 0.04, 22, gm, [cx + 52, 0.04, cz - 21]), // goma bajo los juegos
    ];
    const m = merge("parqueSendas", parts, [pm, gm]); m.isPickable = false; m.receiveShadows = true;
  }

  // ---- Laguito: orilla de arena, agua sin física (plano visual) y borde de piedras ----
  { const shoreM = pbr("parqueOrilla", { color: "#cdb98a", rough: 0.95 }), waterM = pbr("parqueAgua", { color: "#3d93a6", rough: 0.08, emissive: "#0a2a33", alpha: 0.82 });
    shoreM.zOffset = -3; waterM.zOffset = -4; waterM.backFaceCulling = false; waterM.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
    for (const [n, rx, rz, y, mat] of [["parqueOrilla", LX + SHORE, LZ + SHORE, KEEP_Y.shore, shoreM], ["parqueLago", LX, LZ, KEEP_Y.water, waterM]] as [string, number, number, number, B.Material][]) {
      const d = B.MeshBuilder.CreateDisc(n, { radius: 1, tessellation: 40 }, scene);
      d.rotation.x = Math.PI / 2; d.scaling.set(rx, rz, 1); d.position.set(cx, y, cz); d.material = mat; d.isPickable = false; d.receiveShadows = true;
    }
    const stone = [M.matte("#9a9a94"), M.matte("#b3b0a6")];
    for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2 + r() * 0.1; if (Math.abs(Math.cos(a)) < 0.12 && Math.abs(Math.sin(a)) > 0.8) continue; // sin piedras en el puente
      const [x, z] = at((LX + SHORE - 0.2) * Math.cos(a), (LZ + SHORE - 0.2) * Math.sin(a)); veg.push(sph(0.9 + r() * 0.6, stone[i & 1], [x, 0.15, z], [1.2, 0.6, 1], 4)); }
    for (let i = 0; i < 9; i++) { const a = r() * 6.28, rr = 0.2 + r() * 0.7, [x, z] = at(Math.cos(a) * LX * rr, Math.sin(a) * LZ * rr); // nenúfares (no bajo el puente)
      if (Math.abs(x - cx) < 5) continue; veg.push(cyl(1.1, 1.1, 0.03, M.matte("#4f9a45"), [x, KEEP_Y.water + 0.03, z], undefined, 8), sph(0.3, M.matte("#f4a6c0"), [x + 0.1, KEEP_Y.water + 0.1, z], [1, 0.6, 1], 3)); }
    // Juncos en la orilla (fuera de la senda y del puente)
    for (let i = 0; i < 12; i++) { const a = r() * 6.28; if (Math.abs(Math.cos(a)) < 0.3 || Math.abs(Math.sin(a)) < 0.25) continue;
      const [x, z] = at((LX + SHORE + 0.2) * Math.cos(a), (LZ + SHORE + 0.2) * Math.sin(a));
      for (let k = 0; k < 3; k++) { const ox = (r() - 0.5) * 1.2, oz = (r() - 0.5) * 1.2, h = 1.3 + r() * 0.7; veg.push(cyl(0.08, 0.1, h, M.matte("#5f8f3a"), [x + ox, h / 2, z + oz], undefined, 4), cyl(0.2, 0.2, 0.5, M.matte("#6b4226"), [x + ox, h, z + oz], undefined, 6)); } }
  }

  // ---- Puente de tablones sobre el laguito (eje N-S en x = 0): cubierta a 0,6 y rampas de 7 grados, barandas con colisionador ----
  { const H = 0.6, Dh = 12.8, Lh = 4.8, al = Math.atan2(H, Lh), Lr = Math.hypot(Lh, H), WD = 7, plank = [M.matte("#a8794a"), M.matte("#966a3e")];
    for (let i = 0; i < 28; i++) obras.push(box(WD, 0.14, 0.86, plank[i & 1], [cx, H - 0.07, cz - Dh + 0.46 + i * 0.92]));
    for (const sg of [-1, 1]) {
      for (let i = 0; i < 5; i++) { const s = (i + 0.5) / 5; obras.push(box(WD, 0.14, (Lr / 5) * 0.95, plank[(i + 1) & 1], [cx, H * (1 - s) - 0.07, cz + sg * (Dh + Lh * s)], [sg * al, 0, 0])); }
      const sl = box(WD, 0.4, Lr + 0.3, dkw, [0, 0, 0]); sl.rotation.x = sg * al; sl.isVisible = false; // inclinar ANTES del cuerpo
      stat(sl, B.PhysicsShapeType.BOX, { friction: 0.7 }, [cx, H / 2 - 0.2, cz + sg * (Dh + Lh / 2)]);
    }
    const dk = box(WD, 0.4, Dh * 2 + 0.4, dkw, [0, 0, 0]); dk.isVisible = false; stat(dk, B.PhysicsShapeType.BOX, { friction: 0.7 }, [cx, H - 0.2, cz]);
    for (const sd of [-1, 1]) {
      const x = sd * (WD / 2 - 0.15);
      obras.push(box(0.22, 0.2, Dh * 2, wood, [cx + x, H + 0.95, cz]), box(0.14, 0.14, Dh * 2, wood, [cx + x, H + 0.45, cz]), box(0.5, 0.4, Dh * 2, dkw, [cx + x, H - 0.4, cz]));
      for (let k = 0; k <= 8; k++) obras.push(cyl(0.3, 0.3, 1.1, wood, [cx + x, H + 0.5, cz - Dh + 0.3 + (k * (Dh * 2 - 0.6)) / 8], undefined, 6));
      solid(x, 0, 0.35, 1.1, Dh * 2); // baranda continua
    }
    bare.push({ x: cx, z: cz, r: 14 });
  }

  // ---- Árboles (copas altas: el auto se ve desde la cámara), arbustos y flores; rechazo contra senderos, laguito y juegos ----
  const trees: [number, number][] = [];
  for (let n = 0; n < 500 && trees.length < (lowQ ? 24 : 34); n++) {
    const x = (r() - 0.5) * 132, z = (r() - 0.5) * 62;
    if (blocked(x, z, 3.5) || trees.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 7.5)) continue;
    trees.push([x, z]);
    const [wx, wz] = at(x, z), s = 0.85 + r() * 0.5, k = trees.length, col = k % 9 === 0 ? "#f2a3b8" : k % 11 === 0 ? "#e0a43a" : GREENS[k % 3];
    veg.push(cyl(0.45 * s, 0.6 * s, 3.4 * s, M.matte("#6b4a2e"), [wx, 1.7 * s, wz], undefined, 6), sph(4.2 * s, M.matte(col), [wx, 4.6 * s, wz], [1, 0.85, 1], 6), sph(2.9 * s, M.matte(GREENS[(k + 1) % 3]), [wx + 1.1 * s, 5.5 * s, wz - 0.6 * s], undefined, 5));
    solid(x, z, 1.2, 3, 1.2, 0, B.PhysicsShapeType.CYLINDER);
  }
  for (let n = 0, got = 0; n < 300 && got < (lowQ ? 8 : 14); n++) { // arbustos redondos con colisionador
    const x = (r() - 0.5) * 132, z = (r() - 0.5) * 62; if (blocked(x, z, 2.5)) continue; got++;
    const [wx, wz] = at(x, z); veg.push(sph(2.4, M.matte(GREENS[got % 3]), [wx, 0.8, wz], [1, 0.7, 1], 5), sph(1.5, M.matte(GREENS[(got + 2) % 3]), [wx + 0.9, 1.0, wz + 0.4], undefined, 4));
    solid(x, z, 1.8, 1.2, 1.8);
  }
  const petal = ["#f06292", "#ffd54f", "#ef5350", "#fafafa", "#ff9800"];
  for (let n = 0, got = 0; n < 200 && got < (lowQ ? 6 : 14); n++) { // canteros de flores
    const x = (r() - 0.5) * 132, z = (r() - 0.5) * 62; if (blocked(x, z, 2)) continue; got++;
    const [wx, wz] = at(x, z); veg.push(cyl(2.4, 2.4, 0.12, M.matte("#5a7f36"), [wx, 0.09, wz], undefined, 8));
    for (let i = 0; i < 8; i++) veg.push(sph(0.5, M.matte(petal[(got + i) % 5]), [wx + (r() - 0.5) * 2, 0.3, wz + (r() - 0.5) * 2], [1, 0.8, 1], 3));
  }
  // Setos del borde N y S con huecos de 6 m (colisionador por tramo)
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) for (const [a, b] of [[12, 34], [40, 66]]) {
    const len = b - a, x = sx * (a + b) / 2, z = sz * 35.2, [wx, wz] = at(x, z);
    veg.push(rbox(len, 1.3, 1.5, 0.45, M.matte("#4f8a3a"), [wx, 0.65, wz]));
    for (let i = 0; i < len / 4; i++) veg.push(sph(1.3, M.matte(GREENS[i % 3]), [wx - len / 2 + 2 + i * 4, 1.3, wz], [1.3, 0.8, 1], 4));
    solid(x, z, len, 1.3, 1.5);
  }

  // ---- Mobiliario: bancas junto al anillo y faroles (emisivos para el ciclo de luz) ----
  const bg = M.matte("#3a4a40"), glowM = M.glow("#ffe7a8");
  for (const th of [0.55, 1.1, 2.05, 2.6, 3.7, 4.25, 5.2, 5.75]) {
    const x = (RX + 3.9) * Math.cos(th), z = (RZ + 3.9) * Math.sin(th), nx = Math.cos(th) / RX, nz = Math.sin(th) / RZ, ry = Math.atan2(-nx, -nz), c = Math.cos(ry), s = Math.sin(ry);
    const P = (lx: number, ly: number, lz: number): [number, number, number] => [cx + x + lx * c + lz * s, ly, cz + z - lx * s + lz * c];
    obras.push(box(1.9, 0.14, 0.6, wood, P(0, 0.5, 0), [0, ry, 0]), box(1.9, 0.5, 0.1, wood, P(0, 0.88, -0.28), [0, ry, 0]), box(0.12, 0.5, 0.5, bg, P(-0.8, 0.25, 0), [0, ry, 0]), box(0.12, 0.5, 0.5, bg, P(0.8, 0.25, 0), [0, ry, 0]));
    solid(x, z, 2, 0.9, 0.7, ry);
  }
  for (let k = 0; k < 8; k++) {
    const th = Math.PI / 8 + (k * Math.PI) / 4, x = (RX - 3.7) * Math.cos(th), z = (RZ - 3.7) * Math.sin(th), [wx, wz] = at(x, z);
    obras.push(cyl(0.18, 0.26, 3.2, bg, [wx, 1.6, wz], undefined, 6), sph(0.7, glowM, [wx, 3.4, wz], undefined, 5), cyl(0.1, 0.9, 0.3, bg, [wx, 3.85, wz], undefined, 6));
    solid(x, z, 0.5, 3, 0.5);
  }

  // ---- Juegos de plaza (este): toboganes que se suben por la rampa, sube y baja, hamacas y arenero ----
  const slide = (x: number, z: number, ry: number, body: B.Material, rail: B.Material) => {
    const W = 4, L = 6, H = 1.9, T = 2.2, Lb = 7, pts = [[0, 0], [L, H], [L + T, H], [L + T + Lb, 0]], d: B.Mesh[] = [];
    for (let i = 0; i < 3; i++) { const [z0, y0] = pts[i], [z1, y1] = pts[i + 1], len = Math.hypot(z1 - z0, y1 - y0);
      for (const sx of [-1, 1]) d.push(box(0.25, 0.5, len, rail, [sx * (W / 2 - 0.12), (y0 + y1) / 2 + 0.25, (z0 + z1) / 2], [-Math.atan2(y1 - y0, z1 - z0), 0, 0])); }
    for (const sx of [-1, 1]) d.push(cyl(0.22, 0.22, 1.7, rail, [sx * (W / 2 - 0.12), H + 0.85, L + T - 0.4], undefined, 6));
    d.push(box(W, 0.2, 0.25, rail, [0, H + 1.7, L + T - 0.4]));
    ramp(body, cx + x, cz + z, ry, W, L, H, T, Lb, 0, d);
  };
  slide(40, 14, Math.PI / 2, M.plastic("#1e88e5"), M.plastic("#fbc02d"));
  slide(68, -14, -Math.PI / 2, M.plastic("#e53935"), M.plastic("#fbc02d"));
  for (const [x, z, sg, col] of [[63, 26, 1, "#43a047"], [63, -26, -1, "#fb8c00"]] as [number, number, number, string][]) { // sube y baja con inclinación fija (rampa de 8 grados)
    const L = 9.4, a = 0.139 * sg, p = rbox(L, 0.25, 3, 0.08, M.plastic(col), [0, 0, 0]);
    p.rotation.z = a; stat(p, B.PhysicsShapeType.BOX, { friction: 0.6 }, [cx + x, 0.45, cz + z]); // pie enterrado: un escalón de 0,1 m ya frena al auto
    const [ex, ey] = [x + 3.9 * Math.cos(a), 0.45 + 3.9 * Math.sin(a)];
    obras.push(box(0.6, 0.55, 2.4, steel, [cx + x, 0.28, cz + z]), box(0.14, 0.14, 1.2, steel, [cx + ex, ey + 1.0, cz + z]));
    for (const dz of [-0.55, 0.55]) obras.push(cyl(0.12, 0.12, 0.9, steel, [cx + ex, ey + 0.55, cz + z + dz], undefined, 6));
  }
  { const [x, z] = [44, 27], seat = ["#e53935", "#fbc02d", "#1e88e5"]; // hamacas: marco y asientos (el auto pasa entre los apoyos)
    obras.push(cyl(0.3, 0.3, 8.6, M.plastic("#1e88e5"), [cx + x, 3.4, cz + z], [0, 0, Math.PI / 2], 8));
    for (const ex of [-4, 4]) for (const s of [-1, 1]) obras.push(cyl(0.28, 0.28, 3.6, M.plastic("#1e88e5"), [cx + x + ex, 1.7, cz + z + s * 0.6], [-s * 0.34, 0, 0], 6));
    for (let i = 0; i < 3; i++) { const sx = x + (i - 1) * 2.4; obras.push(rbox(0.9, 0.1, 0.5, 0.04, M.plastic(seat[i]), [cx + sx, 0.7, cz + z]));
      for (const dz of [-0.35, 0.35]) obras.push(cyl(0.05, 0.05, 2.7, steel, [cx + sx, 2.05, cz + z + dz], undefined, 4)); }
    for (const ex of [-4, 4]) solid(x + ex, z, 0.5, 3.4, 2);
  }
  { const [x, z] = [46, -28]; // arenero: arena visual, borde bajo, juguetes
    obras.push(box(10, 0.1, 8, M.matte("#e3c98b"), [cx + x, 0.05, cz + z])); // solo visual: con colisionador, el escalón de 0,1 frena al auto
    for (const [bx, bz, w, d] of [[0, 4.1, 10.6, 0.3], [0, -4.1, 10.6, 0.3], [5.15, 0, 0.3, 8], [-5.15, 0, 0.3, 8]]) obras.push(box(w, 0.22, d, wood, [cx + x + bx, 0.11, cz + z + bz]));
    obras.push(cyl(0.45, 0.6, 0.5, M.plastic("#e53935"), [cx + x - 3, 0.35, cz + z + 1.5], [0.3, 0, 0.2], 8), box(0.3, 0.05, 0.9, M.plastic("#fbc02d"), [cx + x - 2.2, 0.14, cz + z + 1.9], [0, 0.5, 0]));
    for (const [dx, dz, h] of [[2.5, -1, 0.9], [3.2, -1, 0.6], [2.8, -1.7, 0.7]]) obras.push(cyl(0.05, 0.7, h, M.matte("#d8b878"), [cx + x + dx, 0.1 + h / 2, cz + z + dz], undefined, 8));
  }

  // ---- Glorieta (oeste) y manta de picnic ----
  { const [x, z] = [-52, 18], roof = M.matte("#8a3a22"), [wx, wz] = at(x, z);
    obras.push(cyl(13, 13, 0.1, wood, [wx, 0.05, wz], undefined, 24), cyl(0.2, 12.4, 1.9, roof, [wx, 4.3, wz], [0, 0.3, 0], 5), sph(0.6, M.matte("#fbc02d"), [wx, 5.4, wz], undefined, 4));
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3, px = x + 5.6 * Math.cos(a), pz = z + 5.6 * Math.sin(a); obras.push(cyl(0.4, 0.45, 3.4, M.matte("#efe6d2"), [cx + px, 1.7, cz + pz], undefined, 8)); solid(px, pz, 0.8, 3.4, 0.8, 0, B.PhysicsShapeType.CYLINDER); }
    const [bx, bz] = at(-50, -18); obras.push(box(3.2, 0.04, 3.2, M.matte("#c94a3a"), [bx, 0.1, bz]), box(3.2, 0.045, 0.45, M.matte("#f4efe2"), [bx, 0.11, bz]), box(0.45, 0.045, 3.2, M.matte("#f4efe2"), [bx, 0.11, bz]), rbox(0.8, 0.45, 0.6, 0.1, wood, [bx + 0.6, 0.32, bz - 0.4]));
  }
  for (const [n, parts] of [["parqueObras", obras], ["parqueVeg", veg]] as [string, B.Mesh[]][]) { const m = merge(n, parts); m.isPickable = false; shadows.addShadowCaster(m); }
  bare.push({ x: cx, z: cz, r: 50 });

  // ---- Animales de juguete: una fuente fusionada por especie y una instancia por animal (se liberan con el mundo). Un solo observer. ----
  const src = (name: string, parts: B.Mesh[]) => { const m = merge(name, parts); m.position.y = -500; m.isPickable = false; shadows.addShadowCaster(m); return m; };
  const yel = M.matte("#f5c542"), org = M.matte("#f28c28"), dark = M.matte("#2a2220");
  const duckS = src("parquePato", [sph(0.9, yel, [0, 0.4, 0], [1, 0.7, 1.35], 5), sph(0.5, yel, [0, 0.85, 0.5], undefined, 4), box(0.22, 0.1, 0.3, org, [0, 0.8, 0.82]), sph(0.12, dark, [0.17, 0.92, 0.7], undefined, 3), sph(0.12, dark, [-0.17, 0.92, 0.7], undefined, 3), box(0.25, 0.25, 0.3, yel, [0, 0.55, -0.7], [0.5, 0, 0])]);
  const sqS = src("parqueArdilla", [sph(0.5, M.matte("#b5703a"), [0, 0.4, 0], [0.8, 0.9, 1.3], 4), sph(0.38, M.matte("#b5703a"), [0, 0.7, 0.45], undefined, 4), sph(0.1, dark, [0.12, 0.76, 0.7], undefined, 3), sph(0.1, dark, [-0.12, 0.76, 0.7], undefined, 3), box(0.1, 0.2, 0.08, M.matte("#8a4f26"), [0.14, 0.95, 0.4]), box(0.1, 0.2, 0.08, M.matte("#8a4f26"), [-0.14, 0.95, 0.4]), sph(0.55, M.matte("#d28a50"), [0, 0.75, -0.55], [0.5, 1.5, 0.7], 4)]);
  const dog = (n: string, c: string) => { const bm = M.matte(c), ear = M.matte("#4a3020"), p = [rbox(0.7, 0.6, 1.5, 0.15, bm, [0, 0.85, 0]), rbox(0.6, 0.55, 0.6, 0.15, bm, [0, 1.35, 0.85]), box(0.3, 0.25, 0.35, ear, [0, 1.25, 1.25]), box(0.12, 0.35, 0.25, ear, [0.3, 1.45, 0.75]), box(0.12, 0.35, 0.25, ear, [-0.3, 1.45, 0.75]), cyl(0.1, 0.16, 0.7, bm, [0, 1.15, -0.85], [-0.8, 0, 0], 5)];
    for (const [lx, lz] of [[-0.22, 0.55], [0.22, 0.55], [-0.22, -0.55], [0.22, -0.55]]) p.push(box(0.2, 0.55, 0.2, bm, [lx, 0.28, lz])); return src(n, p); };
  const dogS = [dog("parquePerro1", "#c58c52"), dog("parquePerro2", "#e8dccb")];
  const ducks = Array.from({ length: lowQ ? 5 : 8 }, (_, i) => ({ m: duckS.createInstance("pato" + i), c: i & 1 ? 11 : -11, a: 2 + (i % 4) * 1.4, b: 1.8 + (i % 4) * 1.1, ph: r() * 6.28, w: (0.22 + r() * 0.15) * (i & 2 ? -1 : 1) }));
  const dogs = Array.from({ length: lowQ ? 2 : 3 }, (_, i) => ({ m: dogS[i & 1].createInstance("perro" + i), ph: i * 2.1 + 0.4, w: (i & 1 ? -1 : 1) * 0.085, off: (i - 1) * 1.1 }));
  const sqs = trees.slice(0, lowQ ? 3 : 6).map(([tx, tz], i) => ({ m: sqS.createInstance("ardilla" + i), x: cx + tx, z: cz + tz, ph: r() * 6.28, off: r() * 6.28 }));
  for (const a of [...ducks, ...dogs, ...sqs]) a.m.isPickable = false;
  let t = 0;
  const obs = scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1); t += dt;
    for (const d of ducks) { d.ph += d.w * dt; d.m.position.set(cx + d.c + d.a * Math.cos(d.ph), KEEP_Y.water + 0.02 + 0.03 * Math.sin(t * 2 + d.a), cz + d.b * Math.sin(d.ph)); d.m.rotation.y = Math.atan2(-d.a * Math.sin(d.ph) * d.w, d.b * Math.cos(d.ph) * d.w); }
    for (const d of dogs) { d.ph += d.w * dt; const rx = RX + d.off, rz = RZ + d.off; d.m.position.set(cx + rx * Math.cos(d.ph), 0.04 * Math.abs(Math.sin(t * 8 + d.ph * 9)), cz + rz * Math.sin(d.ph)); d.m.rotation.y = Math.atan2(-rx * Math.sin(d.ph) * d.w, rz * Math.cos(d.ph) * d.w); d.m.rotation.z = 0.05 * Math.sin(t * 8 + d.ph * 9); }
    for (const q of sqs) { const g = Math.max(0, Math.sin(t * 0.8 + q.off)); q.ph += g * dt * 1.4; q.m.position.set(q.x + 2.6 * Math.cos(q.ph), g * 0.35 * Math.abs(Math.sin(t * 10 + q.off)), q.z + 2.6 * Math.sin(q.ph)); q.m.rotation.y = Math.atan2(-Math.sin(q.ph), Math.cos(q.ph)); }
  });
  undo.push(() => scene.onBeforeRenderObservable.remove(obs));
}

// Lugar: x 60..200, z 14..88; entre la avenida E-O (z +-12) y el borde sur de la pileta grande del acuático (z 90). Ver informe.
export const barrio: Barrio = { id: "parque", cx: 130, cz: 51, build: parqueBuild };
