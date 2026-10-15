import * as B from "@babylonjs/core";
import { box, cyl, merge, rbox, tor } from "../models";
import { M, pbr, shadows } from "../render";
import { HALF, bare, decal, floor, occluders, scene, stat } from "./common";
import { clear, int, rocks, toyRamps } from "../world_layout";

type V3 = [number, number, number];
// Bioma Industrial (docs/art_direction/visual_reference_register.md, «Kits por bioma», ref145/ref41/ref28b): patio de contenedores, hormigón con tierra, carriles de asfalto con cordón amarillo/negro.
// Generador local de semilla fija (lo decorativo no toca rng(): la partida no cambia).
const lcg = (s: number) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

// Texturas reales (public/textures), una por escena; WRAP como en desvan.ts
const texs = new Map<string, B.Texture>();
const wrapTex = (f: string) => {
  const k = f + scene.uniqueId; let t = texs.get(k);
  if (!t) { t = new B.Texture(`./textures/${f}.webp`, scene); t.wrapU = t.wrapV = B.Texture.WRAP_ADDRESSMODE; texs.set(k, t); }
  return t;
};
const asphM = () => pbr("indAsfalto" + scene.uniqueId, { color: "#d0d2d8", rough: 0.9, tex: wrapTex("c-asfalto") });
const rustM = (c = "#ffffff") => pbr("indChapa" + c + scene.uniqueId, { color: c, rough: 0.75, metal: 0.2, tex: wrapTex("c-chapa-oxidada") });
const tile = (m: B.Mesh, su: number, sv: number) => { // repite la textura por metro en cajas grandes (UV 0-1 por cara)
  const uv = m.getVerticesData(B.VertexBuffer.UVKind); if (!uv) return m;
  for (let i = 0; i < uv.length; i += 2) { uv[i] *= su; uv[i + 1] *= sv; }
  m.setVerticesData(B.VertexBuffer.UVKind, uv); return m;
};

export function industrialBuild() {
  floor("industrial-hormigon", "#ffffff", () => wrapTex("c-hormigon-grietas"), 0.9, "concrete", 24);
  const r = lcg(41), parts: B.Mesh[] = [];
  const asph = asphM(), oil = M.matte("#1b1c1f"), yel = M.matte("#FBC02D"), blk = M.matte("#1e1e1e");
  const L = HALF * 2;
  const lane = (x: number, z: number, w: number, d: number) => { // carril: losa baja de asfalto + cordón de bloques amarillo/negro a los lados
    parts.push(tile(box(w, 0.07, d, asph, [x, 0.035, z]), w / 8, d / 8));
    const alongX = w > d, len = alongX ? w : d, off = (alongX ? d : w) / 2;
    for (let t = -len / 2 + 2; t < len / 2 - 1; t += 4) for (const s of [-1, 1]) {
      const n = ((t + len) / 4) | 0, [bx, bz] = alongX ? [x + t, z + s * off] : [x + s * off, z + t];
      parts.push(box(alongX ? 3.6 : 1, 0.3, alongX ? 1 : 3.6, n % 2 ? yel : blk, [bx, 0.15, bz]));
    }
    for (let t = -len / 2 + 3; t < len / 2 - 3; t += 7) parts.push(box(alongX ? 3 : 0.3, 0.09, alongX ? 0.3 : 3, yel, [alongX ? x + t : x, 0.05, alongX ? z : z + t])); // línea central
  };
  lane(0, 0, L - 10, 10); lane(0, 0, 10, L - 10); // cruz que pasa por la salida
  lane(0, -80, L - 50, 9); lane(80, 0, 9, L - 50); // anillo
  for (let i = 0; i < 26; i++) parts.push(box(2 + r() * 5, 0.09, 1.5 + r() * 4, oil, [(r() - 0.5) * L * 0.9, 0.06, (r() - 0.5) * L * 0.9])); // manchas de aceite
  const strip = merge("industrialLanes", parts); strip.isPickable = false; strip.receiveShadows = true;

  // Borde: cordón amarillo/negro + hilera de contenedores afuera (reemplaza la pared gris)
  const E = HALF + 3, cols = ["#c0503e", "#4a7fb8", "#6f8248", "#b8742f"].map((c) => rustM(c)), edge: B.Mesh[] = [];
  for (let side = 0; side < 4; side++) for (let t = -E; t < E; t += 4) {
    const a = t + 2, ry = side % 2 ? Math.PI / 2 : 0, o = (side < 2 ? -1 : 1) * E, [x, z] = side % 2 ? [o, a] : [a, o];
    edge.push(box(3.6, 0.8, 1.6, ((t / 4) | 0) % 2 ? yel : blk, [x, 0.4, z], [0, ry, 0]));
  }
  for (let side = 0; side < 4; side++) {
    let t = -E - 8;
    while (t < E + 8) {
      const w = 11, a = t + w / 2, ry = side % 2 ? Math.PI / 2 : 0, o = (side < 2 ? -1 : 1) * (E + 4), [x, z] = side % 2 ? [o, a] : [a, o];
      const tiers = 1 + Math.floor(r() * 3);
      for (let k = 0; k < tiers; k++) edge.push(tile(rbox(w, 2.8, 3, 0.2, cols[Math.floor(r() * 4)], [x, 1.4 + k * 2.8, z], [0, ry, 0]), 3, 1));
      t += w + 0.4;
    }
  }
  const ring = merge("industrialRing", edge); ring.isPickable = false; ring.receiveShadows = true;
  shadows.addShadowCaster(ring); occluders.push(ring);
  for (const [x, z, w, d] of [[0, -E, E * 2, 2.4], [0, E, E * 2, 2.4], [-E, 0, 2.4, E * 2], [E, 0, 2.4, E * 2]]) stat(box(w, 2, d, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, 1, z]).isVisible = false;
}

export function industrialLayout() {
  toyRamps(int(2, 4), [0, 1, 2]);
  rocks(int(8, 16));
  const r = lcg(29), parts: B.Mesh[] = [];
  const cont = ["#b23a2a", "#2f5f9a", "#5a6b3a", "#9c5b22"].map((c) => M.matte(c)), dark = M.matte("#23262a"), yel = M.plastic("#FBC02D"), blk = M.matte("#1e1e1e");
  const conc = M.matte("#9a948a"), wood = M.matte("#b8894f"), woodD = M.matte("#8a6238"), orange = M.plastic("#FF6F1F"), white = M.plastic("#FAFAFA");
  const drums = ["#2f6fb0", "#b23a2a", "#FBC02D", "#2f6fb0"].map((c) => M.metal(c)), steel = M.metal("#5b6168");
  type Make = (at: (x: number, y: number, z: number) => V3, ry: number) => { w: number; d: number; h: number; parts: B.Mesh[] };
  const contD = ["#7a281c", "#1f4268", "#3e4a28", "#6e3f17"].map((c) => M.matte(c)), rust = M.matte("#8a4a2a");
  const container = (at: (x: number, y: number, z: number) => V3, ry: number, tiers: number) => {
    const out: B.Mesh[] = [];
    for (let k = 0; k < tiers; k++) {
      const i = Math.floor(r() * 4), m = cont[i], md = contD[i], y = 1.4 + k * 2.8;
      out.push(rbox(9, 2.8, 2.6, 0.15, m, at(0, y, 0), [0, ry, 0]));
      for (let u = -3.8; u <= 3.4; u += 0.6) for (const s of [-1, 1]) out.push(box(0.22, 2.5, 0.1, md, at(u, y, s * 1.33), [0, ry, 0])); // chapa ondulada: costillas en relieve
      out.push(box(0.2, 2.9, 2.7, dark, at(4.5, y, 0), [0, ry, 0]), box(9.1, 0.2, 2.7, m, at(0, y + 1.4, 0), [0, ry, 0])); // puertas + tapa del color del cuerpo
      for (const u of [-0.45, 0.45]) { out.push(box(0.1, 2.5, 0.12, steel, at(4.62, y, u), [0, ry, 0])); for (const yy of [-0.7, 0.7]) out.push(box(0.14, 0.1, 1.2, steel, at(4.62, y + yy, u * 1.9), [0, ry, 0])); } // barras de cierre
      for (const s of [-1, 1]) { out.push(box(9.05, 0.22, 0.14, rust, at(0, y - 1.32, s * 1.3), [0, ry, 0]), box(9.05, 0.14, 0.14, rust, at(0, y + 1.34, s * 1.3), [0, ry, 0])); // óxido en aristas
        for (let q = 0; q < 3; q++) out.push(box(0.5 + r() * 0.7, 0.5 + r() * 0.6, 0.12, rust, at(-3.6 + r() * 7.2, y - 0.4 + r() * 0.8, s * 1.34), [0, ry, 0])); }
    }
    return { w: 9.2, d: 2.8, h: tiers * 2.8, parts: out };
  };
  const barrier = (at: (x: number, y: number, z: number) => V3, ry: number, n: number) => {
    const out: B.Mesh[] = [];
    for (let i = 0; i < n; i++) {
      const u = (i - (n - 1) / 2) * 3;
      out.push(rbox(2.9, 1.6, 0.8, 0.2, conc, at(u, 0.8, 0), [0, ry, 0]), box(2.9, 0.3, 1.2, conc, at(u, 0.15, 0), [0, ry, 0]));
      for (const s of [-1, 1]) for (const dx of [-1, -0.25, 0.5, 1.2]) out.push(box(0.4, 1.3, 0.05, (dx > 0) === (i % 2 > 0) ? yel : blk, at(u + dx, 0.85, s * 0.42), [0, ry, 0.6]));
      out.push(box(2.9, 0.1, 0.1, rust, at(u, 1.58, 0), [0, ry, 0]));
    }
    return { w: n * 3, d: 1.4, h: 1.6, parts: out };
  };
  const kit: Make[] = [
    (at, ry) => container(at, ry, 1 + Math.floor(r() * 3)),
    (at, ry) => container(at, ry, 2),
    (at, ry) => barrier(at, ry, 2 + Math.floor(r() * 2)),
    (at) => ({ w: 4.6, d: 4.6, h: 2.8, parts: [[0, 0], [1.3, 0.2], [0.6, 1.4], [-1.2, 1.2], [-0.4, -1.3], [1.3, -1.2]].flatMap(([x, z], i) => [cyl(1.1, 1.1, 1.8, drums[i % 4], at(x, 0.9, z), undefined, 12), cyl(1.15, 1.15, 0.12, rust, at(x, 1.4, z), undefined, 12), cyl(1.15, 1.15, 0.12, rust, at(x, 0.35, z), undefined, 12), cyl(1.13, 1.13, 0.3, rust, at(x, 0.15, z), undefined, 12)]) }), // tambores
    (at, ry) => ({ w: 3.4, d: 3.4, h: 2.4, parts: [0, 1, 2].flatMap((k) => [...[-1.3, 0, 1.3].map((u) => box(0.5, 0.2, 3.2, wood, at(u, 0.45 + k * 0.55 + 0.1, 0), [0, ry, 0])), ...[-1.3, 0, 1.3].map((u) => box(0.4, 0.3, 3.2, woodD, at(0, 0.15 + k * 0.55, u), [0, ry + Math.PI / 2, 0]))]).concat([rbox(2.2, 1, 2.2, 0.15, cont[1], at(0, 2, 0), [0, ry, 0])]) }), // palets con cajón
    (at) => ({ w: 5, d: 5, h: 2.4, parts: [[0, 0], [2.2, 0.6], [-1.6, 1.9], [0.4, -2]].flatMap(([x, z]) => [cyl(0.35, 1, 3, orange, at(x, 1.5, z), undefined, 8), cyl(0.62, 0.7, 0.7, white, at(x, 1.7, z), undefined, 8), box(2.2, 0.25, 2.2, blk, at(x, 0.12, z))]) }), // conos
    (at, ry) => ({ w: 3.6, d: 3.6, h: 4.2, parts: [[-1, -1], [1, -1], [1, 1], [-1, 1]].flatMap(([x, z], i) => [cyl(0.9, 0.9, 3.6, i % 2 ? yel : blk, at(x, 1.8, z), undefined, 10), ...[0.7, 1.9, 3].map((y) => cyl(0.93, 0.93, 0.5, i % 2 ? blk : yel, at(x, y, z), undefined, 10)), cyl(1.1, 1.1, 0.2, steel, at(x, 0.1, z), undefined, 10)]).concat([box(0, 0, 0, blk, at(0, 0, 0), [0, ry, 0])].slice(0, 0)) }), // bolardos
    (at, ry) => ({ w: 13, d: 4, h: 14, parts: [ // pórtico grúa (ref145)
      ...[-5.5, 5.5].flatMap((x) => [box(1.6, 13, 1.6, yel, at(x, 7, 0), [0, ry, 0]), box(3, 1.6, 3, conc, at(x, 0.8, 0), [0, ry, 0]), box(2.6, 1.2, 0.2, blk, at(x, 1.1, 1.55), [0, ry, 0.0])]),
      box(13.6, 1.8, 1.8, yel, at(0, 13.4, 0), [0, ry, 0]), box(2, 1.2, 1.2, steel, at(2, 12, 0), [0, ry, 0]), box(0.15, 8, 0.15, blk, at(2, 8, 0), [0, ry, 0]), box(1.2, 1, 1, yel, at(2, 4, 0), [0, ry, 0])] }),
  ];
  const put = (k: number, x: number, z: number, ry: number) => {
    const c = Math.cos(ry), s = Math.sin(ry);
    const pr = kit[k]((a, y, b) => [x + a * c + b * s, y, z - a * s + b * c], ry);
    parts.push(...pr.parts);
    stat(box(pr.w, pr.h, pr.d, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, pr.h / 2, z, ry]).isVisible = false;
    bare.push({ x, z, r: Math.max(pr.w, pr.d) / 2 + 1.5 });
  };
  // Pórtico de largada (z=28) y túnel de contenedores (z=46) sobre el carril norte: se reservan antes del reparto y se arman al final (el reparto usa el mismo generador).
  const GZ = 28, TZ = 46;
  bare.push({ x: 0, z: GZ, r: 10 }, { x: 0, z: TZ, r: 12 });
  // Charco de aceite iridiscente (ref Charcos) junto a dos grupos de tambores: decal oscuro brillante, tinte arcoíris tenue en textura de semilla fija.
  { const PX = 24, PZ = 26, o = lcg(907), N = 256;
    const t = new B.DynamicTexture("aceiteTex", N, scene, true), c = t.getContext() as unknown as CanvasRenderingContext2D;
    c.clearRect(0, 0, N, N);
    for (let i = 0; i < 9; i++) { const bx = N / 2 + (o() - 0.5) * 120, by = N / 2 + (o() - 0.5) * 80, rr = 40 + o() * 36, g = c.createRadialGradient(bx, by, 0, bx, by, rr); g.addColorStop(0, "rgba(10,11,14,0.96)"); g.addColorStop(0.7, "rgba(14,15,18,0.9)"); g.addColorStop(1, "rgba(14,15,18,0)"); c.fillStyle = g; c.fillRect(bx - rr, by - rr, rr * 2, rr * 2); }
    c.globalCompositeOperation = "source-atop";
    for (let i = 0; i < 6; i++) { const hx = N / 2 + (o() - 0.5) * 110, hy = N / 2 + (o() - 0.5) * 70, rr = 36 + o() * 34, g = c.createRadialGradient(hx, hy, 0, hx, hy, rr); g.addColorStop(0, `hsla(${(i * 62 + 170) % 360},75%,60%,0.5)`); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(hx - rr, hy - rr, rr * 2, rr * 2); }
    t.update(); t.hasAlpha = true;
    const m = pbr("indAceite" + scene.uniqueId, { color: "#ffffff", rough: 0.1, metal: 0.55, tex: t }) as B.PBRMaterial;
    m.useAlphaFromAlbedoTexture = true; m.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
    decal("aceiteCharco", 13, 10, PX, PZ, m, 0.06).isPickable = false;
    bare.push({ x: PX, z: PZ, r: 8 });
    put(3, PX + 7, PZ + 1, 0.4); put(3, PX - 3.5, PZ + 7, 1.2);
  }
  // Plataforma de reticulado con escalera amarilla y baranda (ref Gradas), a ~55 u de la salida. Colisión solo en las 4 patas: se pasa por debajo.
  { const PX = -38, PZ = 38, H = 5, W = 14, D = 8, at = (a: number, y: number, b: number): V3 => [PX + a, y, PZ + b];
    parts.push(box(W, 0.35, D, blk, at(0, H, 0)), box(W + 0.4, 0.3, 0.3, yel, at(0, H - 0.3, D / 2)), box(W + 0.4, 0.3, 0.3, yel, at(0, H - 0.3, -D / 2)));
    for (let u = -W / 2 + 0.5; u < W / 2; u += 1) parts.push(box(0.12, 0.08, D - 0.4, yel, at(u, H + 0.2, 0))); // rejilla
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const lx = sx * (W / 2 - 0.5), lz = sz * (D / 2 - 0.5);
      parts.push(box(0.9, H, 0.9, yel, at(lx, H / 2, lz)), box(1.8, 0.4, 1.8, conc, at(lx, 0.2, lz)));
      stat(box(0.9, H, 0.9, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [PX + lx, H / 2, PZ + lz]).isVisible = false;
    }
    for (const sz of [-1, 1]) { // arriostres en X a lo largo de ambas caras largas
      const bz = sz * (D / 2 - 0.5), len = Math.hypot(W - 1, H - 1), an = Math.atan2(H - 1, W - 1);
      parts.push(box(len, 0.22, 0.22, blk, at(0, H / 2, bz), [0, 0, an]), box(len, 0.22, 0.22, blk, at(0, H / 2, bz), [0, 0, -an]));
    }
    for (const sx of [-1, 1]) parts.push(box(0.22, 0.22, D - 1, blk, at(sx * (W / 2 - 0.5), 1.6, 0)));
    for (const sz of [-1, 1]) { // baranda en dos lados largos y fondo; el lado +x queda abierto para la escalera
      for (let u = -W / 2 + 0.3; u <= W / 2 - 0.2; u += 2.3) parts.push(box(0.14, 1.3, 0.14, yel, at(u, H + 0.85, sz * (D / 2 - 0.15))));
      for (const y of [1.0, 1.5]) parts.push(box(W - 0.4, 0.1, 0.1, yel, at(0, H + y, sz * (D / 2 - 0.15))));
    }
    for (let v = -D / 2 + 0.3; v <= D / 2 - 0.2; v += 1.8) parts.push(box(0.14, 1.3, 0.14, yel, at(-W / 2 + 0.15, H + 0.85, v)));
    for (const y of [1.0, 1.5]) parts.push(box(0.1, 0.1, D - 0.4, yel, at(-W / 2 + 0.15, H + y, 0)));
    const SN = 12, run = 0.85, rise = H / SN; // escalera por el extremo +x: peldaños amarillos, zancas y pasamanos
    for (let k = 0; k < SN; k++) parts.push(box(run, 0.12, 2.2, yel, at(W / 2 + run * (SN - k - 0.5), rise * (k + 1) - 0.06 + 0.0, -1.2)), box(run * 0.9, rise - 0.06, 0.1, blk, at(W / 2 + run * (SN - k - 0.5), rise * (k + 0.5), -1.2)));
    const sl = Math.hypot(run * SN, H), sa = Math.atan2(H, run * SN);
    for (const sz of [-1, 1]) { const z = -1.2 + sz * 1.1; parts.push(box(sl, 0.3, 0.12, blk, at(W / 2 + run * SN / 2, H / 2, z), [0, 0, -sa]), box(sl, 0.1, 0.1, yel, at(W / 2 + run * SN / 2, H / 2 + 1.1, z), [0, 0, -sa])); }
    bare.push({ x: PX + 4, z: PZ, r: 14 });
  }
  // Anillo cercano denso (15-45 u de la salida) + dispersión. Salida (0,0) libre: clear() deja 18 u.
  const K = [0, 1, 0, 3, 2, 3, 4, 5, 0, 6, 1, 3];
  let n = 0;
  for (let i = 0; i < 700 && n < 190; i++) {
    const a = r() * 6.283, d = n < 110 ? 17 + r() * 30 : 35 + r() * 105, x = Math.cos(a) * d, z = Math.sin(a) * d;
    const k = n === 7 || n === 8 || n === 120 || n === 150 ? 7 : K[n % K.length];
    if (clear(x, z, k <= 1 ? 5 : 3.5, 10)) { put(k, x, z, k === 7 ? (r() < 0.5 ? 0 : Math.PI / 2) : r() * 6.283); n++; }
  }
  // Props bajos densos junto al cordón de la cruz (carril de 10 u: cordón a 5 u del eje); generador propio
  const q = lcg(77); let m2 = 0;
  for (let i = 0; i < 400 && m2 < 60; i++) {
    const t = (q() - 0.5) * 160, off = 7.5 + q() * 6, sg = q() < 0.5 ? -1 : 1, alongX = q() < 0.5, k = [3, 5, 2, 6, 3, 5][Math.floor(q() * 6)];
    const x = alongX ? t : sg * off, z = alongX ? sg * off : t;
    if (clear(x, z, 3.5, 10)) { put(k, x, z, alongX ? 0 : Math.PI / 2); m2++; }
  }
  // Primer plano oscuro a 8-25 u de la salida: pallets de colores, caños oxidados (con colisionador), chatarra y neumáticos junto al cordón. Generador local fijo.
  const f = lcg(311), pal = ["#c0392b", "#2f5f9a"].map((c) => M.matte(c)), tire = M.matte("#15161a"), scrap = M.matte("#2b2d31"), pipeM = rustM("#c9a58a");
  const fput = (w: number, d: number, h: number, x: number, z: number, parts2: B.Mesh[]) => {
    parts.push(...parts2);
    stat(box(w, h, d, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, h / 2, z]).isVisible = false;
    bare.push({ x, z, r: Math.max(w, d) / 2 + 1 });
  };
  for (let i = 0, n3 = 0; i < 300 && n3 < 44; i++) {
    const alongX = f() < 0.5, sg = f() < 0.5 ? -1 : 1, t = (8 + f() * 16) * (f() < 0.5 ? -1 : 1), off = sg * (6.8 + f() * 4), kind = n3 % 4;
    const x = alongX ? t : off, z = alongX ? off : t, rot = alongX ? 0 : Math.PI / 2;
    if (bare.some((b) => Math.hypot(x - b.x, z - b.z) < b.r + 3) || Math.hypot(x, z) < 9) continue;
    const c = Math.cos(rot), s2 = Math.sin(rot), at = (a: number, y: number, b: number): V3 => [x + a * c + b * s2, y, z - a * s2 + b * c];
    if (kind === 0) { // pallets apilados (rojo/azul), 2-4 de alto, algo girados
      const hN = 2 + Math.floor(f() * 3), pm = pal[Math.floor(f() * 2)], ps: B.Mesh[] = [];
      for (let k = 0; k < hN; k++) { const y = 0.12 + k * 0.3, j = (f() - 0.5) * 0.3;
        ps.push(box(2.4, 0.08, 2.0, pm, at(0, y + 0.2, 0), [0, rot + j, 0]));
        for (const u of [-0.9, 0, 0.9]) ps.push(box(0.35, 0.16, 2.0, pm, at(u, y + 0.08, 0), [0, rot + j, 0])); }
      fput(2.6, 2.4, hN * 0.3 + 0.2, x, z, ps);
    } else if (kind === 1) { // caños gruesos oxidados tendidos (2-3 en cama)
      const ps: B.Mesh[] = [], len = 7 + f() * 3;
      for (const [u, y] of [[-0.5, 0.45], [0.5, 0.45], [0, 1.25]].slice(0, 2 + Math.floor(f() * 2))) ps.push(cyl(0.9, 0.9, len, pipeM, at(0, y, u), [0, rot, Math.PI / 2], 12));
      fput(len, 1.9, 1.7, x, z, ps);
    } else if (kind === 2) { // pila de chatarra: planchas y vigas oscuras en ángulo
      const ps: B.Mesh[] = [];
      for (let k = 0; k < 7; k++) ps.push(box(0.4 + f() * 2.2, 0.25 + f() * 0.5, 0.4 + f() * 1.4, k % 3 ? scrap : pipeM, at((f() - 0.5) * 2.4, 0.3 + k * 0.28, (f() - 0.5) * 2), [f() * 0.5, rot + f() * 3, f() * 0.5]));
      fput(3.4, 3, 2.2, x, z, ps);
    } else { // pila de neumáticos
      const ps: B.Mesh[] = [];
      for (const [u, v, k] of [[0, 0, 0], [1.1, 0.3, 0], [-0.9, 0.6, 0], [0.2, 0.2, 1], [0.7, 0.9, 0]]) ps.push(tor(1.05, 0.45, tire, at(u, 0.25 + k * 0.5, v), [0, f() * 3, 0]));
      fput(3.2, 2.6, 1.2, x, z, ps);
    }
    n3++;
  }
  // Pórtico de reticulado negro/amarillo con 4 focos emisivos (columna garaje/industrial de ref273). Pilares a x=±7,5 (hueco libre 13 u), travesaño a 11-13,6 u. Solo los pilares chocan.
  { const glowM = M.glow("#fff1b0"), at = (a: number, y: number, b = 0): V3 => [a, y, GZ + b];
    for (const sg of [-1, 1]) {
      const px = sg * 7.5;
      parts.push(box(3.2, 0.8, 3.2, conc, at(px, 0.4)), box(1.8, 12.6, 1.8, blk, at(px, 7.1)));
      for (let y = 1.6; y < 12.4; y += 1.8) parts.push(box(1.92, 0.7, 1.92, yel, at(px, y)));
      stat(box(1.8, 13, 1.8, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [px, 6.5, GZ]).isVisible = false;
    }
    const n = 10, pw = 19.2 / n;
    for (const y of [11.6, 13.6]) for (const b of [-0.8, 0.8]) parts.push(box(19.6, 0.35, 0.35, yel, at(0, y, b)));
    for (let k = 0; k <= n; k++) for (const b of [-0.8, 0.8]) parts.push(box(0.3, 2, 0.3, yel, at(-9.6 + k * pw, 12.6, b)));
    for (let k = 0; k < n; k++) for (const b of [-0.8, 0.8]) { const a0 = -9.6 + k * pw, sgn = k % 2 ? -1 : 1; parts.push(box(0.22, Math.hypot(pw, 2), 0.22, blk, at(a0 + pw / 2, 12.6, b), [0, 0, sgn * Math.atan2(pw, 2)])); }
    parts.push(box(19.6, 0.3, 1.9, blk, at(0, 13.9)));
    for (const a of [-5.4, -1.8, 1.8, 5.4]) parts.push(box(1.9, 1.4, 2.1, blk, at(a, 10.7)), box(1.5, 0.15, 1.7, glowM, at(a, 9.95)), box(1.5, 1.1, 0.15, glowM, at(a, 10.7, 1.1)), box(1.5, 1.1, 0.15, glowM, at(a, 10.7, -1.1)));
    // Túnel de contenedores: dos muros de 3 pisos (2 contenedores de largo) a x=±7,2 y techo de dos contenedores atravesados. Hueco libre 11,6 x 8,4 u.
    const tr = lcg(53), cols = ["#b23a2a", "#2f5f9a", "#5a6b3a", "#9c5b22"].map((c) => M.matte(c));
    for (const sg of [-1, 1]) {
      for (const dz of [-4.7, 4.7]) {
        const c = container((a, y, b) => [sg * 7.2 - b, y, TZ + dz - a], Math.PI / 2, 3);
        parts.push(...c.parts);
      }
      stat(box(2.8, 8.4, 18.8, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [sg * 7.2, 4.2, TZ]).isVisible = false;
    }
    for (const dz of [-4.7, 4.7]) parts.push(rbox(16.4, 2.8, 2.6, 0.15, cols[Math.floor(tr() * 4)], [0, 9.8, TZ + dz]), box(16.6, 0.25, 0.25, yel, [0, 11.3, TZ + dz]));
    for (const x of [-3.6, 0, 3.6]) parts.push(box(0.35, 0.35, 19, rust, [x, 8.55, TZ]));
  }
  if (parts.length) { const m = merge("industrialProps", parts); m.isPickable = false; shadows.addShadowCaster(m); }
}
