import * as B from "@babylonjs/core";
import { box, cyl, merge, rbox, sph, tor } from "../models";
import { canvasTex, M, pbr, shadows } from "../render";
import { HALF, bare, decal, floor, occluders, scene, stat } from "./common";
import { clear, int, rocks, toyRamps } from "../world_layout";

type V3 = [number, number, number];
// Bioma Ciudad (docs/art_direction/visual_reference_register.md, «Kits por bioma», ref133/ref36/ref31a): plaza de adoquín con cordón de piedra rojo/blanco y edificios de bloques al fondo.
// Generador local de semilla fija (lo decorativo no toca rng(): la partida no cambia).
const lcg = (s: number) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

const cobbleTex = () => canvasTex(512, (c, s) => {
  const r = lcg(7), n = 10, w = s / n, tones = ["#7d7b7d", "#6e6e72", "#605e62", "#85838a", "#716f72", "#8f8c90"];
  c.fillStyle = "#4d4a47"; c.fillRect(0, 0, s, s); // juntas
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = i * w + (j % 2 ? w / 2 : 0) - w / 2;
    for (const ox of [0, s]) {
      c.fillStyle = tones[Math.floor(r() * tones.length)]; c.fillRect(x + ox + 2, j * w + 2, w - 4, w - 4);
      c.fillStyle = "rgba(255,255,255,0.10)"; c.fillRect(x + ox + 2, j * w + 2, w - 4, 3); // filo de luz arriba
      c.fillStyle = "rgba(0,0,0,0.14)"; c.fillRect(x + ox + 2, j * w + w - 5, w - 4, 3);
    }
  }
});

// Adoquín gris claro de las veredas (ref300/ref133): grises #a9a6a0/#8f8c86 (algo más fríos para compensar el sol cálido) con juntas oscuras, semilla fija.
const sidewalkTex = () => canvasTex(512, (c, s) => {
  const r = lcg(19), n = 12, w = s / n, tones = ["#9ba3ad", "#818994", "#929aa5", "#a5adb8", "#89919c"];
  c.fillStyle = "#464b54"; c.fillRect(0, 0, s, s);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = i * w + (j % 2 ? w / 2 : 0) - w / 2;
    for (const ox of [0, s]) { c.fillStyle = tones[Math.floor(r() * tones.length)]; c.fillRect(x + ox + 2, j * w + 2, w - 4, w - 4); c.fillStyle = "rgba(255,255,255,0.12)"; c.fillRect(x + ox + 2, j * w + 2, w - 4, 3); }
  }
});

// Texturas de la ciudad (tileables 512, public/textures/c-*.webp) como en desvan.ts; los UV de cada pieza se escalan a su tamaño para que el tile mida lo mismo en todas.
const texCache = new Map<string, B.Texture>();
let texScene: B.Scene | undefined;
const ctex = (f: string) => {
  if (texScene !== scene) { texScene = scene; texCache.clear(); }
  let t = texCache.get(f);
  if (!t) { t = new B.Texture(`./textures/${f}.webp`, scene); t.wrapU = t.wrapV = B.Texture.WRAP_ADDRESSMODE; texCache.set(f, t); }
  return t;
};
const tmat = (f: string, tint: string, rough = 0.85) => pbr(`ciu-${f}-${tint}`, { color: tint, rough, metal: 0, tex: ctex(f) });
// UV planares por cara (según la normal) a escala de mundo: el tile mide T metros en cualquier pieza, sin estirarse.
const uv = <T extends B.Mesh>(m: T, t: number) => {
  const p = m.getVerticesData(B.VertexBuffer.PositionKind), n = m.getVerticesData(B.VertexBuffer.NormalKind);
  if (!p || !n) return m;
  const o = m.position, a = new Float32Array((p.length / 3) * 2);
  for (let i = 0; i < p.length / 3; i++) {
    const x = p[i * 3] + o.x, y = p[i * 3 + 1] + o.y, z = p[i * 3 + 2] + o.z, nx = Math.abs(n[i * 3]), ny = Math.abs(n[i * 3 + 1]), nz = Math.abs(n[i * 3 + 2]);
    [a[i * 2], a[i * 2 + 1]] = ny >= nx && ny >= nz ? [x / t, z / t] : nz >= nx ? [x / t, y / t] : [z / t, y / t];
  }
  m.setVerticesData(B.VertexBuffer.UVKind, a);
  return m;
};
const TA = 14, TC = 7, TB = 8; // metros por tile: asfalto, adoquín, ladrillo

// Calles (ref133): cruz por la salida y anillo a 45 u, 18 de ancho; veredas de adoquín claro con cordón rojo/blanco. Todo plano y fusionado, sin colisión.
const RW = 18, RING = 45;
const onRoad = (x: number, z: number, m = 0) => { const a = Math.abs(x), b = Math.abs(z), h = RW / 2 + m; return a < h || b < h || (Math.abs(a - RING) < h && b < RING + h) || (Math.abs(b - RING) < h && a < RING + h); };
function roads() {
  const parts: B.Mesh[] = [], asphalt: B.Mesh[] = [], asph = tmat("c-asfalto", "#ffffff", 0.9), patchM = M.matte("#26282c"), side = pbr("ciu-vereda", { color: "#dfe8ff", rough: 0.9, metal: 0, tex: ctex("g-ciudad-adoquin") }), line = M.matte("#FAFAFA"), red = M.matte("#E53935"), wh = M.matte("#FAFAFA");
  const L = HALF - 4, strips: [number, number, number, number][] = [[0, 0, L * 2, RW], [0, 0, RW, L * 2]]; // cx, cz, largo X, largo Z
  for (const k of [-RING, RING]) strips.push([0, k, (RING + RW / 2) * 2, RW], [k, 0, RW, (RING + RW / 2) * 2]);
  const inRoad = (x: number, z: number) => strips.some(([qx, qz, qw, qd]) => Math.abs(x - qx) < qw / 2 - 0.3 && Math.abs(z - qz) < qd / 2 - 0.3);
  for (const [cx, cz, w, d] of strips) {
    const alongX = w > d, len = alongX ? w : d, c = alongX ? cx : cz, o = alongX ? cz : cx;
    const P = (u: number, v: number, y: number): V3 => alongX ? [c + u, y, o + v] : [o + v, y, c + u];
    const R = (u: number, v: number, y: number, a: number, b: number, m: B.Material) => box(alongX ? a : b, 0.08, alongX ? b : a, m, P(u, v, y));
    asphalt.push(uv(R(0, 0, 0.07, len, RW, asph), TA));
    for (const sg of [-1, 1]) {
      parts.push(uv(R(0, sg * (RW / 2 + 2.6), 0.06, len, 5, side), TC));
      for (let u = -len / 2 + 3; u < len / 2; u += 6) if ([-3.2, 0, 3.2].every((e) => !inRoad(...P(u + e, sg * (RW / 2 + 0.75), 0).filter((_, i) => i !== 1) as [number, number]))) parts.push(rbox(alongX ? 5.6 : 1.5, 0.7, alongX ? 1.5 : 5.6, 0.2, ((u + len) / 6 | 0) % 2 ? red : wh, P(u, sg * (RW / 2 + 0.75), 0.35)));
    }
    for (let u = -len / 2 + 3; u < len / 2 - 3; u += 8) if (strips.filter(([qx, qz, qw, qd]) => Math.abs(P(u, 0, 0)[0] - qx) < qw / 2 && Math.abs(P(u, 0, 0)[2] - qz) < qd / 2).length < 2) asphalt.push(R(u, 0, 0.1, 4, 0.5, line));
    for (const u of [-RW / 2 - 4, RW / 2 + 4]) if (Math.abs(u) < len / 2) for (let v = -RW / 2 + 1.2; v < RW / 2; v += 2.4) asphalt.push(R(u, v, 0.1, 3, 1.2, line)); // senda peatonal en las bocacalles
  }
  const pr = lcg(5); // parches de asfalto reparado (decorativo, semilla fija)
  for (let i = 0; i < 22; i++) { const [cx, cz, w, d] = strips[i % strips.length], al = w > d, u = (pr() - 0.5) * (al ? w : d) * 0.9, v = (pr() - 0.5) * (RW - 4), pw = 3 + pr() * 4, pd = 2 + pr() * 3; asphalt.push(box(al ? pw : pd, 0.04, al ? pd : pw, patchM, al ? [cx + u, 0.115, cz + v] : [cx + v, 0.115, cz + u], [0, (pr() - 0.5) * 0.06, 0])); }
  const m = merge("ciudadCalles", [...parts, ...asphalt]);
  m.isPickable = false; m.receiveShadows = true;
}

/** Manzana de bloques (con colisionador) lejos de la salida: edificio de cuerpo biselado, cornisa, ventanas, tetones y toldo. */
function block(parts: B.Mesh[], x: number, z: number, w: number, h: number, d: number, c: string) {
  const m = c === "#d9c7a0" ? M.matte(c) : tmat("c-ladrillo", c), stone = M.matte("#8a8580"), glass = M.matte("#3b5a78");
  parts.push(uv(rbox(w, h, d, 0.8, m, [x, h / 2, z]), TB), rbox(w + 1.6, 1.6, d + 1.6, 0.5, stone, [x, h + 0.8, z]), rbox(w + 1.4, 1.2, d + 1.4, 0.4, stone, [x, 0.6, z]));
  for (let y = 6; y < h - 3; y += 6) for (let u = -w / 2 + 4; u < w / 2 - 2; u += 6) for (const sg of [-1, 1]) parts.push(box(3, 3.4, 0.5, glass, [x + u + 1, y + 1.7, z + sg * (d / 2 + 0.1)]), box(0.5, 3.4, 3, glass, [x + sg * (w / 2 + 0.1), y + 1.7, z + u + 1]));
  for (let u = -w / 2 + 5; u < w / 2 - 3; u += 7) for (let v = -d / 2 + 5; v < d / 2 - 3; v += 7) parts.push(cyl(1.3, 1.3, 0.8, m, [x + u, h + 2, z + v], undefined, 8));
  parts.push(box(w * 0.5, 0.6, 3.4, M.matte("#E53935"), [x, 5.2, z - d / 2 - 1.6], [0.35, 0, 0]));
  stat(box(w, h, d, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, h / 2, z]).isVisible = false;
  bare.push({ x, z, r: Math.max(w, d) / 2 + 3 });
}

export function cityBuild() {
  floor("ciudad-adoquin", "#ffffff", () => { const x = new B.Texture("./textures/g-ciudad-adoquin.webp", scene); x.wrapU = x.wrapV = B.Texture.WRAP_ADDRESSMODE; return x; }, 0.9, "concrete", 7); // instancia propia: floor() le fija la escala y las veredas usan la de caché a escala 1
  const r = lcg(11), parts: B.Mesh[] = [];
  const red = M.matte("#E53935"), white = M.matte("#FAFAFA"), stone = M.matte("#8a8580");
  const E = HALF + 3; // cordón: anillo de bloques rojo/blanco alternados + zócalo de piedra
  for (let side = 0; side < 4; side++) for (let t = -E; t < E; t += 6) {
    const a = t + 3, ry = side % 2 ? Math.PI / 2 : 0, o = (side < 2 ? -1 : 1) * E;
    const [x, z] = side % 2 ? [o, a] : [a, o];
    parts.push(rbox(5.6, 1.6, 2.6, 0.35, ((t / 6) | 0) % 2 ? red : white, [x, 0.8, z], [0, ry, 0]));
  }
  // Edificios de bloques (ref36/ref133): cuerpo biselado crema/ladrillo, ventanas azules, cornisa, tetones, toldo a rayas.
  const body = ["#d9c7a0", "#b5562f", "#e3d3ae", "#c9784a"].map((c, i) => (i % 2 ? tmat("c-ladrillo", c) : M.matte(c))), glass = M.matte("#3b5a78"), roofM = M.matte("#a8452a"), awn = [red, white];
  for (let side = 0; side < 4; side++) {
    let t = -E - 20;
    for (let i = 0; t < E + 20; i++) {
      const w = 26 + Math.floor(r() * 3) * 6, h = 18 + Math.floor(r() * 5) * 6, d = 22, c = body[Math.floor(r() * 4)];
      const along = t + w / 2, off = HALF + 12 + d / 2, ry = side % 2 ? Math.PI / 2 : 0, sg = side < 2 ? -1 : 1;
      const P = (u: number, y: number, v: number): V3 => (side % 2 ? [sg * (off + v), y, along + u] : [along + u, y, sg * (off + v)]); // u a lo largo, v hacia afuera
      parts.push(uv(rbox(w, h, d, 0.8, c, P(0, h / 2, 0), [0, ry, 0]), TB), rbox(w + 1.6, 1.6, d + 1.6, 0.5, stone, P(0, h + 0.8, 0), [0, ry, 0]), rbox(w + 1.4, 1.2, d + 1.4, 0.4, stone, P(0, 0.6, 0), [0, ry, 0]));
      for (let u = -w / 2 + 4; u < w / 2 - 2; u += 6) for (let y = 6; y < h - 3; y += 6) parts.push(box(3, 3.4, 0.5, glass, P(u + 1, y + 1.7, -d / 2 - 0.1), [0, ry, 0]));
      for (let u = -w / 2 + 5; u < w / 2 - 3; u += 7) parts.push(cyl(1.3, 1.3, 0.8, c, P(u, h + 2, 0), undefined, 8));
      parts.push(box(w * 0.5, 0.6, 3.4, awn[i % 2], P(0, 5.2, -d / 2 - 1.6), [0.35, ry, 0]));
      t += w + 3;
    }
  }
  const city = merge("cityRing", parts);
  city.isPickable = false; city.receiveShadows = true;
  shadows.addShadowCaster(city);
  occluders.push(city);
  roads();
  // El cordón frena al auto (el piso sigue más allá; la pared vieja no tenía colisionador)
  for (const [x, z, w, d] of [[0, -E, E * 2, 2.4], [0, E, E * 2, 2.4], [-E, 0, 2.4, E * 2], [E, 0, 2.4, E * 2]]) stat(box(w, 2, d, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, 1, z]).isVisible = false;
}

/** Fachadas bajas (2-3 pisos, ladrillo) con colisionador justo detrás de las veredas exteriores del anillo, kiosco y arco pasable. Generador local fijo; sin rng(). */
function town() {
  const r = lcg(31), parts: B.Mesh[] = [];
  const stone = M.matte("#8a8580"), glass = M.matte("#3b5a78"), frame = M.matte("#f1ede4"), iron = M.metal("#25302b"), door = M.matte("#5a3a22"), leaf = M.matte("#4f9a3a"), pot = M.matte("#a8452a"), glow = M.glow("#ffcf8a");
  const brickC = ["#b5562f", "#c9784a", "#a14a2b"], wall = ["#d9c7a0", "#e3d3ae"], flowers = ["#e53935", "#fbc02d", "#f06292", "#fafafa"].map((c) => M.plastic(c));
  const awn = [M.matte("#E53935"), M.matte("#FAFAFA")], roofM = M.matte("#7a3a26");
  const OFF = RING + RW / 2 + 5.2 + 1.2; // borde exterior de la vereda + holgura
  const collider = (x: number, z: number, w: number, h: number, d: number, ry: number) => stat(box(w, h, d, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, h / 2, z, ry]).isVisible = false;
  // Casa: front hacia el anillo (v hacia afuera, el frente está en -d/2)
  const house = (P: (u: number, y: number, v: number) => V3, ry: number, w: number, h: number, d: number, c: B.Material, i: number) => {
    const R: V3 = [0, ry, 0];
    parts.push(uv(rbox(w, h, d, 0.5, c, P(0, h / 2, 0), R), TB), rbox(w + 1.2, 1.2, d + 1.2, 0.4, stone, P(0, h + 0.6, 0), R), rbox(w + 1, 1, d + 1, 0.3, stone, P(0, 0.5, 0), R), box(w - 2, 0.8, d - 2, roofM, P(0, h + 1.6, 0), R));
    const nf = Math.round(h / 6);
    const cols = Math.max(2, Math.floor((w - 2) / 5)), step = (w - 3) / cols;
    for (let f = 0; f < nf; f++) for (let k = 0; k < cols; k++) {
      const u = -w / 2 + 1.5 + step * (k + 0.5), y = f * 6 + (f ? 3.6 : 4.2);
      if (!f && k === Math.floor(cols / 2)) { parts.push(box(2.6, 4, 0.5, door, P(u, 2, -d / 2 - 0.1), R), box(3.2, 0.5, 0.7, frame, P(u, 4.1, -d / 2 - 0.2), R)); continue; }
      parts.push(box(2.8, 3.2, 0.3, frame, P(u, y, -d / 2 - 0.05), R), box(2.2, 2.6, 0.5, glass, P(u, y, -d / 2 - 0.12), R), box(3.4, 0.3, 0.9, stone, P(u, y - 1.7, -d / 2 - 0.3), R));
      if (f === 1 || (!f && cols < 3)) { // maceta con flores en el alféizar + reja
        parts.push(box(2.6, 0.6, 0.8, pot, P(u, y - 1.2, -d / 2 - 0.9), R), sph(0.9, leaf, P(u, y - 0.6, -d / 2 - 0.9), [1.3, 0.7, 0.8], 5), sph(0.35, flowers[(i + k) % 4], P(u - 0.5, y - 0.2, -d / 2 - 1.1)), sph(0.35, flowers[(i + k + 1) % 4], P(u + 0.5, y - 0.1, -d / 2 - 1.1)));
      }
    }
    // toldo rayado sobre el piso bajo (rayas alternadas, inclinado) y reja baja delante
    const n = Math.floor(w / 1.6), aw = (w - 1) / n;
    for (let k = 0; k < n; k++) parts.push(box(aw, 0.25, 3, awn[(k + i) % 2], P(-w / 2 + 0.5 + aw * (k + 0.5), 5.2, -d / 2 - 1.5), [0.3, ry, 0]));
    const gx = -w / 2 + 1.6;
    parts.push(box(w - 3, 0.2, 0.2, iron, P(0, 1.5, -d / 2 - 2.6), R), box(w - 3, 0.2, 0.2, iron, P(0, 0.4, -d / 2 - 2.6), R));
    for (let u = gx; u <= w / 2 - 1.5; u += 1.1) parts.push(box(0.14, 1.6, 0.14, iron, P(u, 0.8, -d / 2 - 2.6), R));
    for (const sg of [-1, 1]) parts.push(box(1.8, 0.9, 0.9, pot, P(sg * (w / 2 - 1.2), 0.45, -d / 2 - 1.6), R), sph(0.9, leaf, P(sg * (w / 2 - 1.2), 1.3, -d / 2 - 1.6), undefined, 5), sph(0.3, flowers[(i + 2) % 4], P(sg * (w / 2 - 1.2), 2, -d / 2 - 1.6)));
  };
  for (let side = 0; side < 4; side++) {
    const sg = side < 2 ? -1 : 1, ry = side % 2 ? Math.PI / 2 : 0;
    for (const half of [-1, 1]) {
      let t = RW / 2 + 5.2 + 2; // arranca después de la vereda de la calle que sale
      for (let i = 0; t < 58; i++) {
        const w = 11 + Math.floor(r() * 3) * 2, h = [12, 18, 12, 18, 18][Math.floor(r() * 5)], d = 8;
        if (t + w > 59) break;
        const along = half * (t + w / 2), off = OFF + d / 2;
        const P = (u: number, y: number, v: number): V3 => (side % 2 ? [sg * (off + v), y, along + half * u] : [along + half * u, y, sg * (off + v)]);
        const kiosk = side === 3 && half === 1 && i === 1;
        if (kiosk) { // kiosco (ref272): cabina con mostrador, toldo rayado grande y techo a cuatro aguas
          const kw = 7, kh = 5, kd = 5.5, ko = OFF + kd / 2 + 0.5, KP = (u: number, y: number, v: number): V3 => [sg * (ko + v), y, along + half * u], KR: V3 = [0, ry, 0];
          parts.push(uv(rbox(kw, kh, kd, 0.4, tmat("c-ladrillo", "#c9784a"), KP(0, kh / 2, 0), KR), TB), rbox(kw + 1.2, 0.8, kd + 1.2, 0.3, stone, KP(0, kh + 0.4, 0), KR), box(kw - 1.6, 1.4, kd - 1.6, roofM, KP(0, kh + 1.5, 0), KR), box(kw - 3.6, 0.8, kd - 3.6, roofM, KP(0, kh + 2.5, 0), KR));
          parts.push(box(4.4, 2.2, 0.4, glass, KP(0, 3, -kd / 2 - 0.1), KR), box(5, 0.5, 1.2, M.matte("#8a5232"), KP(0, 1.7, -kd / 2 - 0.5), KR), box(2, 0.7, 0.3, glow, KP(0, kh - 0.4, -kd / 2 - 0.15), KR));
          for (let k = 0; k < 8; k++) parts.push(box(kw / 8, 0.25, 3.2, awn[k % 2], KP(-kw / 2 + (k + 0.5) * kw / 8, 4.5, -kd / 2 - 1.5), [0.35, ry, 0]));
          for (let k = 0; k < 3; k++) parts.push(box(1, 1, 1, flowers[k], KP(-1.6 + k * 1.6, 2.2, -kd / 2 - 0.9)));
          const [kx, kz] = KP(0, 0, 0);
          collider(kx, kz, side % 2 ? kd : kw, kh, side % 2 ? kw : kd, 0);
          bare.push({ x: kx, z: kz, r: kw / 2 + 4 });
        } else {
          const cm = r() < 0.75 ? tmat("c-ladrillo", brickC[Math.floor(r() * 3)]) : M.matte(wall[Math.floor(r() * 2)]);
          house(P, ry, w, h, d, cm, i + side);
          const [cx, cz] = P(0, 0, 0);
          collider(cx, cz, side % 2 ? d : w, h, side % 2 ? w : d, 0);
          bare.push({ x: cx, z: cz, r: w / 2 + 5 });
        }
        t += w + 1.6;
      }
    }
  }
  // Fila corta de fachadas bajas (1-2 pisos) a ~30 u de la salida, dentro de las manzanas libres (x,z entre 14 y 31: no cortan calles ni veredas); miran a la salida.
  { const q = lcg(47), D = 6;
    for (const [sx, sz, hs] of [[1, -1, [6, 12]], [-1, 1, [12, 6]]] as [number, number, number[]][]) {
      let t = 15.5;
      hs.forEach((h, i) => {
        const w = 7.2 + q() * 0.6, cz = sz * 27.5, cx = sx * (t + w / 2);
        const P = (u: number, y: number, v: number): V3 => [cx + sx * u, y, cz + sz * v]; // v hacia afuera; el frente (-d/2) mira a la salida
        house(P, 0, w, h, D, i % 2 ? tmat("c-ladrillo", brickC[i]) : M.matte(wall[i]), i + sx + 3);
        collider(cx, cz, w, h, D, 0); bare.push({ x: cx, z: cz, r: w / 2 + 4 });
        t += w + 1;
      });
    }
  }
  // Arco de ladrillo con faroles sobre la calle norte-sur, entre la salida y el anillo (ref273). Pasable: solo los pilares tienen colisionador.
  const AZ = -28, AR = 7, AY = 8, brick = tmat("c-ladrillo", "#b5562f");
  for (const sg of [-1, 1]) {
    const px = sg * (AR + 2.2);
    parts.push(uv(rbox(4.4, 16.8, 4.6, 0.4, brick, [px, 8.4, AZ]), TB), rbox(5.2, 1.2, 5.4, 0.3, stone, [px, 0.6, AZ]), rbox(5.2, 1, 5.4, 0.3, stone, [px, 16.9, AZ]), cyl(0.2, 0.2, 2.4, iron, [px + sg * 1.2, 18.5, AZ]), box(0.9, 1.2, 0.9, glow, [px + sg * 1.2, 20.2, AZ]), cyl(0.1, 0.6, 0.6, iron, [px + sg * 1.2, 21.1, AZ], undefined, 4));
    for (const z of [-1, 1]) parts.push(box(0.5, 0.6, 0.5, iron, [px - sg * 2.4, 10, AZ + z * 2.7]), box(0.7, 1, 0.7, glow, [px - sg * 2.5, 9.2, AZ + z * 2.8])); // faroles de pared hacia la calle
    stat(box(4.4, 16.8, 4.6, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [px, 8.4, AZ]).isVisible = false;
    bare.push({ x: px, z: AZ, r: 5 });
  }
  const N = 11; // dovelas del arco + relleno de ladrillo entre el arco y el remate
  for (let k = 0; k < N; k++) {
    const a = ((k + 0.5) / N) * Math.PI, rr = AR + 0.9, x = Math.cos(a) * rr, y = AY + Math.sin(a) * rr;
    parts.push(rbox(1.9, 2, 4.6, 0.2, stone, [x, y, AZ], [0, 0, a - Math.PI / 2]));
  }
  for (let x = -AR; x < AR; x += 1) {
    const xc = x + 0.5, top = AY + Math.sqrt((AR + 1.9) ** 2 - xc * xc) - 0.2;
    if (top < 16.8) parts.push(uv(box(1, 16.8 - top, 4.6, brick, [xc, (top + 16.8) / 2, AZ]), TB));
  }
  parts.push(rbox(2 * (AR + 4.6), 1.4, 5.4, 0.3, stone, [0, 17.5, AZ]));
  for (let k = 0; k < 5; k++) { const hh = 2 + (k % 3) * 1.4; parts.push(rbox(2.4, hh, 2.4, 0.3, M.matte(["#7aa6c9", "#e0b46a", "#cfc3a8", "#7aa6c9", "#e0b46a"][k]), [-8 + k * 4, 18.2 + hh / 2, AZ])); } // bloquecitos de ciudad sobre el arco
  parts.push(box(0.14, 2, 0.14, iron, [0, 15.2, AZ]), box(0.9, 1.1, 0.9, glow, [0, 14, AZ]));
  // Callejón-túnel (ref282/ref300) sobre la calle norte-sur a z=32: dos muros de ladrillo con caño y faroles, y un puente de ladrillo encima. Hueco libre 12 x 7,5 u; solo los muros chocan.
  { const TZ = 32, TL = 18, WX = 7.75, WT = 3.5, WH = 14, top: B.Mesh[] = [], pipe = M.metal("#6b5a4a"), brk = ["#b5562f", "#c9784a"].map((c) => tmat("c-ladrillo", c));
    for (const sg of [-1, 1]) {
      const x = sg * WX, ix = sg * (WX - WT / 2); // ix = cara interior
      parts.push(uv(rbox(WT, WH, TL, 0.4, brk[sg > 0 ? 1 : 0], [x, WH / 2, TZ]), TB), rbox(WT + 0.8, 1, TL + 0.8, 0.3, stone, [x, 0.5, TZ]), rbox(WT + 0.8, 1.2, TL + 0.8, 0.3, stone, [x, WH + 0.6, TZ]));
      parts.push(cyl(1, 1, TL, pipe, [ix - sg * 0.6, 4.2, TZ], [Math.PI / 2, 0, 0], 8), cyl(0.8, 0.8, 6, pipe, [ix - sg * 0.6, 7, TZ - TL / 2 + 1.5], undefined, 8));
      for (const z of [-7, -2, 3, 7]) parts.push(box(0.5, 0.5, 0.7, iron, [ix - sg * 0.3, 4.2, TZ + z]));
      for (const z of [-6, 6]) parts.push(box(0.5, 0.5, 1.4, iron, [ix - sg * 0.4, 6.2, TZ + z]), box(0.7, 1, 0.7, glow, [ix - sg * 1.1, 5.7, TZ + z]), box(0.9, 0.2, 0.9, iron, [ix - sg * 1.1, 6.35, TZ + z])); // faroles de pared
      for (const z of [-3, 3]) parts.push(box(0.3, 2.6, 2.2, frame, [ix - sg * 0.1, 10.2, TZ + z]), box(0.3, 2.2, 1.8, glass, [ix - sg * 0.2, 10.2, TZ + z]));
      stat(box(WT, WH, TL, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, WH / 2, TZ]).isVisible = false;
    }
    top.push(uv(box(2 * WX + WT, 1.6, 10, tmat("c-ladrillo", "#a14a2b"), [0, 8.3, TZ]), TB), uv(box(2 * WX + WT, WH - 9.1, 10, tmat("c-ladrillo", "#b5562f"), [0, (WH + 9.1) / 2, TZ]), TB), rbox(2 * WX + WT + 0.8, 1.2, 10.8, 0.3, stone, [0, WH + 0.6, TZ]));
    top.push(box(0.14, 1.4, 0.14, iron, [0, 7, TZ]), box(1, 1.2, 1, glow, [0, 6, TZ]), box(1.2, 0.2, 1.2, iron, [0, 6.7, TZ]));
    const t = merge("ciudadTecho", top); t.isPickable = false; t.receiveShadows = true; shadows.addShadowCaster(t); occluders.push(t);
    bare.push({ x: 0, z: TZ, r: 13 });
  }
  const m = merge("ciudadFachadas", parts);
  m.isPickable = false; m.receiveShadows = true;
  shadows.addShadowCaster(m);
}

export function cityLayout() {
  town();
  toyRamps(int(2, 4), [0, 1, 2]);
  rocks(int(8, 16));
  const r = lcg(23), parts: B.Mesh[] = [];
  { // Desagüe con rejilla y charco con hojas secas (ref Charcos): decal de agua oscura con brillo de cielo; textura de semilla fija.
    const PX = 24, PZ = 22, o = lcg(613), N = 256, t = new B.DynamicTexture("charcoCiudadTex", N, scene, true), c = t.getContext() as unknown as CanvasRenderingContext2D;
    c.clearRect(0, 0, N, N);
    for (let i = 0; i < 8; i++) { const bx = N / 2 + (o() - 0.5) * 110, by = N / 2 + (o() - 0.5) * 70, rr = 40 + o() * 34, g = c.createRadialGradient(bx, by, 0, bx, by, rr); g.addColorStop(0, "rgba(10,16,24,0.96)"); g.addColorStop(0.75, "rgba(14,22,32,0.9)"); g.addColorStop(1, "rgba(14,22,32,0)"); c.fillStyle = g; c.fillRect(bx - rr, by - rr, rr * 2, rr * 2); }
    c.globalCompositeOperation = "source-atop";
    c.fillStyle = "rgba(150,196,236,0.7)"; c.beginPath(); c.ellipse(N / 2, N / 2 - 4, 92, 38, -0.1, 0, 6.2832); c.fill(); c.fillStyle = "rgba(225,240,252,0.85)"; c.beginPath(); c.ellipse(N / 2 - 20, N / 2 - 18, 50, 12, -0.2, 0, 6.2832); c.fill(); // reflejo de cielo azul y brillo
    c.strokeStyle = "rgba(40,36,32,0.8)"; c.lineWidth = 7; c.beginPath(); c.ellipse(N / 2, N / 2, 112, 66, 0, 0, 6.2832); c.stroke(); // borde húmedo
    for (let i = 0; i < 26; i++) { c.fillStyle = ["#9a5a22", "#b5762f", "#7a4a1c", "#c9a03a"][i % 4]; c.beginPath(); c.ellipse(N / 2 + (o() - 0.5) * 150, N / 2 + (o() - 0.5) * 90, 7 + o() * 6, 3.5 + o() * 3, o() * 3.14, 0, 6.2832); c.fill(); } // hojas secas
    t.update(); t.hasAlpha = true;
    const m = pbr("ciuCharco" + scene.uniqueId, { color: "#ffffff", rough: 0.08, metal: 0.4, tex: t }) as B.PBRMaterial;
    if (m.albedoTexture !== t) t.dispose(); // material cacheado: la textura nueva sobra
    m.useAlphaFromAlbedoTexture = true; m.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
    decal("charcoCiudad", 13, 9, PX, PZ, m, 0.06).isPickable = false;
    const gr = M.metal("#25302b"), gp = M.matte("#17191c"); // rejilla de desagüe en el borde del charco
    parts.push(box(4, 0.14, 2.4, gr, [PX - 5, 0.08, PZ + 1.2]), box(3.5, 0.16, 1.9, gp, [PX - 5, 0.09, PZ + 1.2]));
    for (let u = -1.5; u <= 1.5; u += 0.5) parts.push(box(0.14, 0.2, 2, gr, [PX - 5 + u, 0.12, PZ + 1.2]));
    bare.push({ x: PX, z: PZ, r: 8 });
  }
  { // Gradas de hormigón con butacas rojas/azules y baranda de alambre (ref Gradas); colisión en el bloque, mira a la salida.
    const GX = -28, GZ = -28, W = 16, D = 9, TN = 4, TD = D / TN, TH = 1.5, ry = Math.atan2(GX, GZ) , cs = Math.cos(ry), sn = Math.sin(ry);
    const at = (a: number, y: number, v: number): V3 => [GX + a * cs + v * sn, y, GZ - a * sn + v * cs], R: V3 = [0, ry, 0];
    const conc = M.matte("#a9a59d"), concD = M.matte("#8c8880"), seatR = M.plastic("#E53935"), seatB = M.plastic("#2f5f9c"), wire = M.metal("#9aa0a6"), post = M.metal("#25302b");
    for (let k = 0; k < TN; k++) {
      const v = -D / 2 + TD * (k + 0.5), h = TH * (k + 1);
      parts.push(box(W, h, TD, k % 2 ? conc : concD, at(0, h / 2, v), R), box(W + 0.4, 0.2, TD + 0.1, conc, at(0, h + 0.1, v), R));
      for (let u = -W / 2 + 0.8; u < W / 2; u += 1.25) parts.push(box(0.85, 0.12, 0.8, ((u + W) / 1.25 | 0) % 2 ? seatB : seatR, at(u, h + 0.3, v - 0.2), R), box(0.85, 0.55, 0.12, ((u + W) / 1.25 | 0) % 2 ? seatB : seatR, at(u, h + 0.6, v + 0.25), R));
    }
    const top = TH * TN + 0.2;
    for (const sg of [-1, 1]) for (let k = 0; k < TN; k++) parts.push(box(0.2, 1.1, 0.2, post, at(sg * W / 2, TH * (k + 1) + 0.75, -D / 2 + TD * (k + 0.5)), R)); // postes laterales siguiendo la escalinata
    for (let u = -W / 2; u <= W / 2 + 0.1; u += 2) parts.push(box(0.14, 1.2, 0.14, post, at(u, 0.6 + 0, -D / 2 - 0.15), R)); // frente bajo
    for (const y of [0.45, 0.8, 1.15]) parts.push(box(W, 0.05, 0.05, wire, at(0, y, -D / 2 - 0.15), R)); // alambre al frente
    for (let u = -W / 2; u <= W / 2 + 0.1; u += 2.7) parts.push(box(0.14, 1.4, 0.14, post, at(u, top + 0.7, D / 2 - 0.1), R)); // baranda del fondo
    for (const y of [0.45, 0.9, 1.35]) parts.push(box(W, 0.05, 0.05, wire, at(0, top + y, D / 2 - 0.1), R));
    stat(box(W, TH * TN, D, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [GX, (TH * TN) / 2, GZ, ry]).isVisible = false;
    bare.push({ x: GX, z: GZ, r: W / 2 + 4 });
  }
  block(parts, 78, 72, 30, 32, 26, "#d9c7a0"); block(parts, -76, -70, 28, 26, 28, "#b5562f"); block(parts, 80, -74, 24, 22, 24, "#c9784a");
  const iron = M.metal("#25302b"), stone = M.matte("#8a8580"), wood = M.matte("#8a5232"), orange = M.plastic("#FF6F1F"), white = M.plastic("#FAFAFA"), glow = M.glow("#ffcf8a");
  const leaf = M.matte("#4f9a3a"), brick = M.matte("#b5562f"), blue = M.plastic("#2f5f9c"), yellow = M.plastic("#FBC02D");
  type Make = (at: (x: number, y: number, z: number) => V3, ry: number) => { w: number; d: number; h: number; parts: B.Mesh[] };
  const kit: Make[] = [
    (at, ry) => ({ w: 3, d: 3, h: 9, parts: [rbox(3, 1.2, 3, 0.25, stone, at(0, 0.6, 0)), cyl(0.45, 0.6, 7, iron, at(0, 4.5, 0)), box(1.5, 0.25, 1.5, iron, at(0, 7.45, 0), [0, ry, 0]), box(1.1, 1.3, 1.1, glow, at(0, 8.2, 0), [0, ry, 0]), cyl(0.15, 0.95, 0.6, iron, at(0, 9.1, 0), undefined, 4), ...[-0.6, 0.6].flatMap((a) => [-0.6, 0.6].map((b) => box(0.1, 1.3, 0.1, iron, at(a, 8.2, b))))] }), // farol
    (at, ry) => ({ w: 5.4, d: 2.4, h: 2.6, parts: [box(5, 0.4, 1.6, wood, at(0, 1.5, 0), [0, ry, 0]), box(5, 1.2, 0.35, wood, at(0, 2.3, -0.7), [0, ry, 0]), ...[-2.2, 2.2].map((x) => box(0.4, 1.5, 1.8, iron, at(x, 0.75, 0), [0, ry, 0]))] }), // banco
    (at, ry) => ({ w: 2.2, d: 2.2, h: 3.6, parts: [rbox(1.6, 2.6, 1.4, 0.3, blue, at(0, 1.3, 0), [0, ry, 0]), cyl(0.7, 0.7, 1.6, blue, at(0, 2.7, 0), [0, 0, Math.PI / 2], 10), box(0.9, 0.12, 0.2, yellow, at(0, 1.8, -0.72), [0, ry, 0])] }), // buzón
    (at, ry) => ({ w: 1.6, d: 1.6, h: 5.6, parts: [cyl(0.15, 0.15, 5, iron, at(0, 2.5, 0)), cyl(1.1, 1.1, 0.2, yellow, at(0, 5, 0), [Math.PI / 2, 0, 0], 4), box(0.7, 0.2, 0.25, white, at(0, 5, 0.12), [0, ry, 0])] }), // señal
    (at) => ({ w: 5, d: 5, h: 2.4, parts: [[0, 0], [2.2, 0.6], [-1.6, 1.9], [0.4, -2]].flatMap(([x, z]) => [cyl(0.35, 1, 3, orange, at(x, 1.5, z), undefined, 8), cyl(0.62, 0.7, 0.7, white, at(x, 1.7, z), undefined, 8), box(2.2, 0.25, 2.2, M.matte("#25302b"), at(x, 0.12, z))]) }), // conos
    (at, ry) => ({ w: 4.4, d: 2.2, h: 2.8, parts: [rbox(4.4, 1.2, 2.2, 0.2, brick, at(0, 0.6, 0), [0, ry, 0]), rbox(4.6, 0.3, 2.4, 0.1, stone, at(0, 1.3, 0), [0, ry, 0]), ...[-1.4, 0, 1.4].map((x) => sph(1.1, leaf, at(x, 1.9, 0), [1, 0.9, 1], 5)), sph(0.3, yellow, at(0.4, 2.7, 0.2)), sph(0.3, M.plastic("#e53935"), at(-1.2, 2.6, -0.2))] }), // macetero
    (at, ry) => ({ w: 3.6, d: 2, h: 1.8, parts: [box(3.6, 0.5, 2, orange, at(0, 0.9, 0), [0, ry, 0]), box(3.6, 0.5, 2, white, at(0, 1.5, 0), [0, ry, 0]), ...[-1.4, 1.4].map((x) => box(0.3, 1.6, 0.3, iron, at(x, 0.8, 0)))] }), // valla
    (at) => ({ w: 3, d: 3, h: 2.6, parts: [tor(2.4, 0.35, M.metal("#3a3f45"), at(0, 0.7, 0), [Math.PI / 2, 0, 0], 12), tor(2.4, 0.35, M.metal("#3a3f45"), at(0, 0.7, 1.1), [Math.PI / 2, 0, 0], 12)] }), // neumático-bolardo
    (at) => ({ w: 1.8, d: 1.8, h: 2.4, parts: [cyl(0.9, 0.75, 2.2, M.matte("#1c2226"), at(0, 1.1, 0), undefined, 10), cyl(1, 1, 0.3, M.matte("#2e353a"), at(0, 2.3, 0), undefined, 10)] }), // tacho oscuro (volumen negro de composición)
    (at, ry) => ({ w: 3, d: 3, h: 3.8, parts: [box(2.6, 1.6, 2.6, M.matte("#2b2218"), at(0, 0.8, 0), [0, ry, 0]), box(2.2, 1.5, 2.2, M.matte("#352a1d"), at(0.1, 2.35, 0), [0, ry + 0.2, 0]), box(1.6, 1.3, 1.6, M.matte("#2b2218"), at(-0.1, 3.7, 0), [0, ry - 0.2, 0])] }), // pila de cajas oscuras
    (at) => ({ w: 1, d: 1, h: 2, parts: [cyl(0.4, 0.45, 1.9, M.matte("#17191c"), at(0, 0.95, 0), undefined, 8), cyl(0.46, 0.46, 0.3, white, at(0, 1.5, 0), undefined, 8)] }), // bolardo negro con banda blanca
  ];
  const put = (k: number, x: number, z: number, ry: number) => {
    const c = Math.cos(ry), s = Math.sin(ry);
    const pr = kit[k]((a, y, b) => [x + a * c + b * s, y, z - a * s + b * c], ry);
    parts.push(...pr.parts);
    stat(box(pr.w, pr.h, pr.d, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, pr.h / 2, z, ry]).isVisible = false;
    bare.push({ x, z, r: Math.max(pr.w, pr.d) / 2 + 1.5 });
  };
  // Anillo cercano fijo (queda siempre algo en cuadro) + dispersión por la plaza. Salida (0,0) libre: clear() deja 18 u.
  for (let i = 0; i < 130; i++) {
    const a = r() * 6.283, d = i < 70 ? 20 + r() * 30 : 30 + r() * 100, x = Math.cos(a) * d, z = Math.sin(a) * d, k = i % 8;
    if (clear(x, z, 3.5, 10) && !onRoad(x, z, 2)) put(k, x, z, r() * 6.283);
  }
  // Contraste de composición (meta 0,19): pintura blanca (bordes, líneas de pare, flechas), manchas húmedas oscuras y tachos/bolardos negros en las veredas junto a la salida. Todo sin colisión salvo los tachos, que quedan en la vereda (calle libre de 18 u).
  { const wp = M.matte("#F2F0E6"), ring = M.matte("#d6d3ca"), dk = M.matte("#14161a"), o = lcg(613), N = 256, t = new B.DynamicTexture("manchaCiudadTex", N, scene, true), c = t.getContext() as unknown as CanvasRenderingContext2D;
    c.clearRect(0, 0, N, N);
    for (let i = 0; i < 11; i++) { const bx = N / 2 + (o() - 0.5) * 110, by = N / 2 + (o() - 0.5) * 80, rr = 30 + o() * 40, g = c.createRadialGradient(bx, by, 0, bx, by, rr); g.addColorStop(0, "rgba(42,44,48,0.9)"); g.addColorStop(0.55, "rgba(36,38,42,0.8)"); g.addColorStop(1, "rgba(36,38,42,0)"); c.fillStyle = g; c.fillRect(bx - rr, by - rr, rr * 2, rr * 2); }
    t.update(); t.hasAlpha = true;
    const wet = pbr("ciuMancha" + scene.uniqueId, { color: "#ffffff", rough: 0.15, metal: 0.45, tex: t }) as B.PBRMaterial;
    if (wet.albedoTexture !== t) t.dispose(); // material cacheado: la textura nueva sobra
    wet.useAlphaFromAlbedoTexture = true; wet.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
    for (let i = 0; i < 12; i++) { const arm = i % 4, d = 10 + o() * 26, v = (i % 8 < 4 ? 1 : -1) * (5.8 + o() * 2), w = 2.6 + o() * 2.4, sg = i < 6 ? 1 : -1, [x, z] = arm % 2 ? [sg * d, v] : [v, sg * d]; decal("manchaCiu" + i, w, w * (0.6 + o() * 0.4), x, z, wet, 0.17 + i * 0.001).isPickable = false; }
    const Y = 0.1, flat = (w: number, d: number, x: number, z: number, m: B.Material, ry = 0) => parts.push(box(w, 0.06, d, m, [x, Y + 0.04, z], [0, ry, 0]));
    for (const sg of [-1, 1]) for (const sg2 of [-1, 1]) {
      flat(21, 0.4, sg * 25.5, sg2 * 8.3, wp); flat(0.4, 21, sg2 * 8.3, sg * 25.5, wp); // líneas de borde blancas continuas
      flat(0.7, 8, sg * 16.8, sg2 * 4.4, wp); flat(8, 0.7, sg2 * 4.4, sg * 16.8, wp); // líneas de pare
      for (const q of [20, 29]) { // flechas pintadas (cabeza en V + fuste)
        for (const [x, z, a] of [[sg * q, sg2 * 4.4, sg2 > 0 ? 0 : Math.PI], [sg2 * 4.4, sg * q, sg2 > 0 ? -Math.PI / 2 : Math.PI / 2]] as V3[]) {
          const co = Math.cos(a), si = Math.sin(a), at = (u: number, v: number): [number, number] => [x + u * co + v * si, z - u * si + v * co];
          flat(5, 0.8, ...at(0, 0), wp, a); flat(2.6, 0.7, ...at(1.9, 1), wp, a + 0.75); flat(2.6, 0.7, ...at(1.9, -1), wp, a - 0.75);
        }
      }
      const mh = [sg * 14.5, sg2 * 5.5]; parts.push(cyl(1.1, 1.1, 0.06, dk, [mh[0], Y + 0.04, mh[1]], undefined, 14), cyl(1.4, 1.4, 0.04, M.matte("#3a3f45"), [mh[0], Y + 0.03, mh[1]], undefined, 14)); // alcantarillas
    }
    for (let k = 0; k < 14; k++) { const a = (k / 14) * 6.283; flat(0.6, 2, Math.cos(a) * 6.6, Math.sin(a) * 6.6, ring, -a); }
    { const q = lcg(97), tar = M.matte("#101215"), pale = M.matte("#e9e4d4"); // marcas de goma oscuras y sellador de grietas claro sobre el asfalto cercano (planos, sin colisión)
      for (let i = 0, n = 0; i < 900 && n < 150; i++) { const x = (q() - 0.5) * 112, z = (q() - 0.5) * 112, l = 4 + q() * 10; // marcas alineadas con la calle (X si está en una calle E-O, Z si no) también sobre el anillo
        if (!onRoad(x, z, -2.5) || Math.hypot(x, z) < 6) continue; const al = Math.abs(z) < RW / 2 || Math.abs(Math.abs(z) - RING) < RW / 2; flat(al ? l : 1.3, al ? 1.3 : l, x, z, n++ % 4 ? tar : pale); }
      for (let i = 0; i < 30; i++) { const s = q() * 6.283, d = 6 + q() * 40; if (onRoad(Math.cos(s) * d, Math.sin(s) * d, -1)) flat(4 + q() * 5, 3 + q() * 4, Math.cos(s) * d, Math.sin(s) * d, i % 2 ? tar : pale, q() * 3); } } // ponytail: ~120 cajas planas fusionadas en ciudadProps; solo sobre calzada
    { const pil = M.matte("#14161a"), cap = M.matte("#2a2d33"); // siluetas verticales oscuras en la vereda de la calle de salida (colisionador caja oculto en la vereda, x = ±14,6: no toca la calle)
      for (const sx of [-1, 1]) for (const [z, h] of [[-19, 9], [-30, 13], [-42, 10]] as [number, number][]) stat(box(2.2, h, 2.2, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [sx * 14.6, h / 2, z]).isVisible = false, parts.push(box(2.2, h, 2.2, pil, [sx * 14.6, h / 2, z]), box(2.8, 0.6, 2.8, cap, [sx * 14.6, h + 0.3, z]));
      for (let i = 0; i < 8; i++) flat(7 + (i % 3) * 2, 4 + (i % 2) * 2, (i % 2 ? 1 : -1) * (3.5 + (i % 4) * 1.6), -(9 + i * 4), M.matte("#d9d2bf"), 0.2 * i); } // parches claros de cemento sobre la calzada de salida (contraste: luces anchas junto a las sombras)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(9,sx * 12.4, sz * 12.4, 0.3 * sx * sz); // pilas de cajas oscuras en las esquinas de vereda junto a la salida
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const [d, k] of [[17, 10], [20.5, 8], [24, 8], [32, 10]] as [number, number][]) { put(k, sx * 12.8, sz * d, 0); put(k, sz * d, sx * 12.8, 0); }
  }
  // Faroles y bancos sobre las veredas, a ambos lados de las calles (ref31a/ref133)
  for (let t = -HALF + 20, k = 0; t < HALF - 10; t += 26, k++) for (const [x, z, ry] of [[12.5, t, -Math.PI / 2], [-12.5, t + 13, Math.PI / 2], [t, 12.5, Math.PI], [t + 13, -12.5, 0], [RING + 12.5, t * 0.7, -Math.PI / 2], [-RING - 12.5, t * 0.7 + 9, Math.PI / 2]] as V3[]) if (Math.hypot(x, z) > 16 && Math.abs(x) < HALF - 8 && Math.abs(z) < HALF - 8) put(k % 3 ? 0 : 1, x, z, ry);
  if (parts.length) { const m = merge("ciudadProps", parts); m.isPickable = false; shadows.addShadowCaster(m); }
}
