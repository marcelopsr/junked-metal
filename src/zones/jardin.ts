import * as B from "@babylonjs/core";
import { box, cyl, merge, rbox, sph, tor, tube } from "../models";
import { M, pbr, shadows, TEX } from "../render";
import { rng } from "../rng";
import { HALF, bare, decal, floor, house, leafM, occluders, onClear, realCar, scene, stat, tex, tree, woodM } from "./common";
import { ball, freeSpot, gnomes, hose, int, pots, puddles, ramp, rocks, slopeBoard, toyRamps, wateringCan } from "../world_layout";

/** Pasto del jardin (mismo tratamiento que el patio): manchas grandes de verdes calidos + briznas. Semilla propia, sin rng(). ponytail: manchas a mano en canvas (no tileables al pixel), el macro 45 las repite lejos. */
function lawnTexture() {
  let s = 777; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647), n = 1024;
  const t = new B.DynamicTexture("lawnTex", n, scene, true, B.Texture.TRILINEAR_SAMPLINGMODE), c = t.getContext() as unknown as CanvasRenderingContext2D;
  c.fillStyle = "#1f4a17"; c.fillRect(0, 0, n, n);
  const pal = ["#3c7326", "#4E8A2E", "#8fae45", "#2f5f1f", "#2a5a1c"];
  const blot = (x: number, y: number, rad: number, col: string, a: number) => { for (const dx of [-n, 0, n]) for (const dy of [-n, 0, n]) { c.globalAlpha = a; c.fillStyle = col; c.beginPath(); c.arc(x + dx, y + dy, rad, 0, 7); c.fill(); } };
  for (let i = 0; i < 90; i++) blot(r() * n, r() * n, 40 + r() * 90, pal[(r() * pal.length) | 0], 0.22);
  // Manchas de pasto alto oscuro y parches de tierra pelada: rompen el verde liso (contraste por composición)
  for (let i = 0; i < 22; i++) { const x = r() * n, y = r() * n, rad = 60 + r() * 90; for (let k = 0; k < 5; k++) blot(x + (r() - 0.5) * rad, y + (r() - 0.5) * rad, rad * (0.4 + r() * 0.4), "#10300b", 0.45); }
  for (let i = 0; i < 8; i++) { const x = r() * n, y = r() * n, rad = 30 + r() * 40; for (let k = 0; k < 6; k++) { const ox = (r() - 0.5) * rad * 1.6, oy = (r() - 0.5) * rad * 1.6, q = rad * (0.35 + r() * 0.4); blot(x + ox, y + oy, q * 1.2, "#3b2414", 0.5); blot(x + ox, y + oy, q, r() < 0.5 ? "#8a5a3a" : "#b98254", 0.65); } }
  c.lineCap = "round";
  const cols = ["#1d4614", "#2d5a1c", "#3f7a28", "#2d5a1c", "#4E8A2E", "#7fae3c"];
  for (let i = 0; i < 24000; i++) {
    const x = 6 + r() * (n - 12), y = 6 + r() * (n - 12), l = 4 + r() * 9, a = -Math.PI / 2 + (r() - 0.5) * 1.2;
    c.strokeStyle = cols[(r() * cols.length) | 0]; c.globalAlpha = 0.35 + r() * 0.5; c.lineWidth = 1 + r() * 1.4;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
  }
  c.globalAlpha = 1; t.update(); t.wrapU = t.wrapV = B.Texture.WRAP_ADDRESSMODE;
  return t;
}

export function frontBuild() {
  floor("lawn", "#ffffff", lawnTexture, 0.9, "grass", 45);
  // Franjas de corte del césped
  const mow = pbr("mow", { color: "#e8ffd0", rough: 0.9, alpha: 0.02 }); // con 0.08 el sol HDR lo amplificaba a bandas pálidas de borde duro hasta el horizonte
  for (let i = 0; i < 12; i += 2) decal("mow", HALF * 2, (HALF * 2) / 12, 0, -HALF + ((i + 0.5) * HALF * 2) / 12, mow, 0.015);
  // Vereda (baldosas), cordón y calle: la calle es el límite (pared física en z = -HALF)
  const vt = tex("vereda", TEX.tiles);
  const vereda = decal("vereda", HALF * 2 + 60, 16, 0, -HALF + 8, pbr("vereda", { color: "#ffffff", rough: 0.85, tex: vt }), 0.03);
  vt.uScale = Math.round((HALF * 2 + 60) / 16); vt.vScale = 1;
  vereda.receiveShadows = true;
  // Calle de juguete: asfalto gris azulado con rayas amarillas y blancas, cordón rojo/blanco en el borde de la vereda
  const toy = (c: string, rough = 0.55) => pbr(`toy${c}`, { color: c, rough, metal: 0 });
  merge("street", [
    ...Array.from({ length: Math.ceil((HALF * 2 + 60) / 8) }, (_, i) => box(8, 1.4, 2, toy(i % 2 ? "#FAFAFA" : "#E53935", 0.45), [-HALF - 26 + i * 8, 0.7, -HALF - 1])),
    box(HALF * 2 + 260, 0.1, 90, toy("#5b6573", 0.85), [0, 0.02, -HALF - 47]),
    ...Array.from({ length: 16 }, (_, i) => box(12, 0.12, 1.2, toy("#FBC02D"), [-HALF - 60 + i * 28, 0.05, -HALF - 47])),
    box(HALF * 2 + 260, 0.12, 0.8, toy("#FAFAFA"), [0, 0.05, -HALF - 8]), box(HALF * 2 + 260, 0.12, 0.8, toy("#FAFAFA"), [0, 0.05, -HALF - 86]),
    cyl(2, 2.4, 90, toy("#9E9E9E"), [70, 45, -HALF - 5], undefined, 8), box(2, 2, 24, toy("#9E9E9E"), [70, 89, -HALF - 15]),
    box(5, 2, 8, M.glow("#ffcf8a"), [70, 87.5, -HALF - 25]),
  ]);
  cityBlocks(toy);
  realCar(-50, -HALF - 20, Math.PI / 2, 4, false, "#2f4f7a"); // estacionado en la calle (solo se ve)
  // Camino de lajas a la puerta
  const stone = pbr("stone", { color: "#ffffff", rough: 0.9, tex: tex("stone", TEX.stone), emissive: "#4a443a" }); // lajas claras: la luz alta del cuadro
  for (let z = -HALF + 20; z < HALF - 6; z += 9) { const d = B.MeshBuilder.CreateDisc("laja", { radius: 4.4, tessellation: 7 }, scene); d.rotation.set(Math.PI / 2, rng() * 6, 0); d.position.set(12 + (rng() - 0.5) * 2, 0.03, z); d.material = stone; d.receiveShadows = true; }
  house();
  // Ligustros a los costados
  for (const sx of [-1, 1]) {
    const hp = [box(7, 11, HALF * 2 + 10, leafM("#2f6b2a", 40), [sx * (HALF + 3.5), 5.5, 0])];
    for (let z = -HALF; z < HALF; z += 7) hp.push(sph(8 + rng() * 3, leafM(rng() < 0.5 ? "#2f6b2a" : "#3a7a32"), [sx * (HALF + 3.5), 11, z], [1, 0.6, 1], 6));
    const hedge = merge("hedge", hp);
    shadows.addShadowCaster(hedge);
    occluders.push(hedge);
  }
  // Buzón junto a la vereda
  const mx = HALF - 24, mz = -HALF + 22;
  stat(cyl(1.8, 1.8, 22, woodM(), [mx, 11, mz], undefined, 6), B.PhysicsShapeType.CYLINDER);
  shadows.addShadowCaster(merge("mailbox", [box(6, 6, 12, M.metal("#2b2f36"), [mx, 25, mz]), cyl(6, 6, 12, M.metal("#2b2f36"), [mx, 28, mz], [Math.PI / 2, 0, 0], 12), box(0.4, 5, 1.2, M.plastic("#d62828"), [mx + 3.3, 28, mz + 3])]));
  bare.push({ x: mx, z: mz, r: 3 });
  // TRAMO: cantero elevado. Se sube por la rampa del lado del camino y se sale volando por el otro extremo (abierto).
  const brick = M.matte("#9a4a2a"), cx = -55, cz = 35;
  for (const dz of [-6.3, 6.3]) stat(box(48, 2.6, 1.4, brick, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [cx, 1.3, cz + dz]);
  stat(box(46, 2.2, 11.2, pbr("dirt", { color: "#ffffff", rough: 1, tex: tex("dirt", TEX.dirt) }), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [cx - 1, 1.1, cz]);
  const fl: B.Mesh[] = [];
  for (let x = cx - 22; x < cx + 20; x += 3.5) for (const dz of [-3.6, 3.6]) {
    fl.push(cyl(0.3, 0.3, 3, M.matte("#3f8f2f"), [x, 3.6, cz + dz], undefined, 4), sph(1.8, M.plastic(["#f43f5e", "#facc15", "#a855f7", "#f8fafc"][int(0, 3)]), [x, 5.2, cz + dz]));
  }
  shadows.addShadowCaster(merge("flowers", fl));
  for (let k = -2; k <= 2; k++) bare.push({ x: cx + k * 10, z: cz, r: 7.5 }); // para la IA y el bot: el cantero es un obstáculo
  ramp(brick, cx + 34, cz, -Math.PI / 2, 9, 10, 2.6, 0, 0, 0, [slopeBoard(9.4, 10, 2.6, woodM())]);
  tree(78, 70);
}

/** Ciudad miniatura al fondo, al otro lado de la calle: edificios de bloques (ladrillos de juguete con tetones en el techo y ventanas). Solo visual, sin colisión ni rng(). */
function cityBlocks(toy: (c: string, rough?: number) => B.Material) {
  const cols = ["#E53935", "#FBC02D", "#42A5F5", "#66BB6A", "#FB8C00", "#8E24AA", "#FAFAFA"], z = -HALF - 120, parts: B.Mesh[] = [];
  let x = -HALF - 190;
  for (let i = 0; x < HALF + 190; i++) {
    const w = 34 + ((i * 7) % 5) * 7, h = 36 + ((i * 11) % 6) * 14, d = 36, c = cols[i % cols.length], cx = x + w / 2;
    parts.push(rbox(w, h, d, 1.2, toy(c, 0.5), [cx, h / 2, z]), rbox(w + 2, 2.4, d + 2, 0.8, toy("#FAFAFA", 0.5), [cx, h + 1.2, z]));
    for (let sx = -w / 2 + 4; sx < w / 2 - 2; sx += 7) for (let sy = 7; sy < h - 6; sy += 11) {
      parts.push(box(4, 5.5, 0.6, toy(((i + sx + sy) | 0) % 3 ? "#B3E5FC" : "#FFF59D", 0.2), [cx + sx + 2, sy + 2.7, z + d / 2 + 0.1]));
    }
    for (let sx = -w / 2 + 4; sx < w / 2 - 2; sx += 6) for (const sz of [-6, 6]) parts.push(cyl(2.4, 2.4, 1.2, toy(c, 0.5), [cx + sx, h + 3, z + sz], undefined, 10));
    parts.push(rbox(8, 1, d * 0.5, 0.3, toy("#795548", 0.7), [cx, 0.5, z + d / 2 + d * 0.25])); // acera de entrada
    x += w + 4;
  }
  const city = merge("cityBlocks", parts);
  city.isPickable = false; city.receiveShadows = true;
  shadows.addShadowCaster(city);
}

const JC = { rojo: "#E53935", amarillo: "#FBC02D", azul: "#42A5F5", verde: "#66BB6A", naranja: "#FB8C00", morado: "#8E24AA", marron: "#795548", gris: "#9E9E9E" };
const JP = (c: string, rough = 0.5) => pbr(`jt${c}${rough}`, { color: c, rough, metal: 0 });

/** Juguetes sueltos a escala del auto RC cerca del centro (el pasto a la altura de juego se veía vacío). Una sola malla fusionada + un colisionador invisible por objeto. Posiciones fijas (no tapan la salida en 0,0). */
function toyProps() {
  const parts: B.Mesh[] = [];
  const put = (ps: B.Mesh[], x: number, z: number, ry: number, r: number, cw: number, ch: number, cd: number) => {
    const R = B.Matrix.RotationY(ry), T = B.Matrix.Translation(x, 0, z), sc = new B.Vector3(), q = new B.Quaternion(), pos = new B.Vector3();
    for (const m of ps) { m.bakeTransformIntoVertices(m.computeWorldMatrix(true).multiply(R).multiply(T)); m.position.setAll(0); m.rotationQuaternion = null; m.rotation.setAll(0); m.scaling.setAll(1); parts.push(m); } // ponytail: se hornea la pose en los vértices (decompose+quaternion perdía la inclinación en z al fusionar)
    stat(box(cw, ch, cd, M.matte("#000"), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, ch / 2, z, ry]).isVisible = false;
    bare.push({ x, z, r });
  };
  // Bloque de construcción 3x2x3 con 4 tetones; y = base
  const blk = (c: string, y: number, dx = 0, dz = 0) => [rbox(3, 2, 3, 0.2, JP(c), [dx, y + 1, dz]), ...[-0.75, 0.75].flatMap((a) => [-0.75, 0.75].map((b) => cyl(0.5, 0.5, 0.35, JP(c), [dx + a, y + 2.17, dz + b], undefined, 8)))];
  const toyCar = (c: string) => [
    rbox(3.6, 0.9, 1.8, 0.25, JP(c, 0.4), [0, 0.85, 0]), rbox(1.8, 0.8, 1.5, 0.25, JP(c, 0.4), [-0.2, 1.65, 0]), box(1.5, 0.5, 1.56, JP("#B3E5FC", 0.2), [-0.2, 1.7, 0]),
    ...[-1.2, 1.2].flatMap((x) => [-1, 1].map((z) => cyl(0.55, 0.55, 0.35, JP("#2b2f36", 0.8), [x, 0.55, z * 0.95], [Math.PI / 2, 0, 0], 10))),
  ];
  const sign = (c: string, octa: boolean) => [cyl(0.18, 0.18, 4.6, JP(JC.gris), [0, 2.3, 0], undefined, 6), cyl(1.2, 1.2, 0.25, JP(c, 0.4), [0, 4.9, 0], [Math.PI / 2, octa ? Math.PI / 8 : 0, 0], octa ? 8 : 4), box(1.1, 0.3, 0.3, JP("#FAFAFA"), [0, 4.9, 0.18]), cyl(0.7, 0.9, 0.5, JP(JC.gris), [0, 0.25, 0], undefined, 8)];
  const pot = (c: string) => [cyl(1.5, 1.1, 1.8, JP("#C0623B", 0.7), [0, 0.9, 0], undefined, 10), tor(3.1, 0.3, JP("#A9502F", 0.7), [0, 1.8, 0], undefined, 10), ...[0, 1, 2, 3].map((k) => sph(1.5, JP(k % 2 ? JC.verde : "#4CAF50", 0.6), [Math.cos(k * 1.6) * 0.5, 2.5 + (k % 2) * 0.3, Math.sin(k * 1.6) * 0.5], [1, 1.2, 1], 4)), sph(0.7, JP(c, 0.5), [0, 3.3, 0])];
  const can = [cyl(1.3, 1.5, 2.2, JP(JC.azul, 0.4), [0, 1.1, 0], undefined, 12), cyl(0.12, 0.2, 2.6, JP(JC.azul, 0.4), [1.8, 2.2, 0], [0, 0, -0.9], 6), cyl(0.5, 0.35, 0.3, JP(JC.amarillo), [2.8, 3.3, 0], [0, 0, -0.9], 8), tor(1.6, 0.18, JP(JC.amarillo), [-1.4, 1.4, 0], [0, Math.PI / 2, 0], 10)];
  put(blk(JC.rojo, 0), 22, -18, rng() * 3, 2.6, 3, 2, 3);
  put(blk(JC.azul, 0), -24, -14, rng() * 3, 2.6, 3, 2, 3);
  put([...blk(JC.amarillo, 0), ...blk(JC.verde, 2, 0.2, 0.1), ...blk(JC.rojo, 4, -0.1, 0)], 30, 14, 0.4, 3, 3, 6, 3);
  put([...blk(JC.naranja, 0), ...blk(JC.morado, 2, 0.15, 0)], -18, 22, -0.5, 3, 3, 4, 3);
  put([...blk(JC.azul, 0, -3.2), ...blk(JC.amarillo, 0), ...blk(JC.rojo, 0, 3.2)], -45, -55, 0.3, 5.5, 9.4, 2, 3);
  put(toyCar(JC.rojo), -30, -30, 0.5, 3, 3.6, 2.2, 2);
  put(toyCar(JC.azul), 36, -36, -0.8, 3, 3.6, 2.2, 2);
  put(toyCar(JC.amarillo), 18, 40, 2.2, 3, 3.6, 2.2, 2);
  put(sign(JC.rojo, true), -14, -34, 0, 1.8, 1.2, 5, 1.2);
  put(sign(JC.azul, false), 44, 0, 0, 1.8, 1.2, 5, 1.2);
  put(pot(JC.rojo), -40, 0, 0, 2, 3, 3, 3);
  put(pot(JC.amarillo), -8, -52, 0, 2, 3, 3, 3);
  put(can, 50, -20, 0.6, 3, 3.6, 2.4, 3);
  gardenKit(put);
  const m = merge("jardinToys", parts);
  m.isPickable = false; m.freezeWorldMatrix?.();
  shadows.addShadowCaster(m);
}

type Put = (ps: B.Mesh[], x: number, z: number, ry: number, r: number, cw: number, ch: number, cd: number) => void;
/** Kit de jardin (ref132): banco de macetas, canilla con manguera y aspersor, arenero, cantero con girasoles, cobertizo y porton. Posiciones fijas, sin rng(). */
function gardenKit(put: Put) {
  const WOOD = "#B9824A", WD = "#8A5A30", TERRA = "#C0623A", GRN = "#4CAF50", YEL = "#FFC62B", BRN = "#4A2E16", BLK = "#1c1c1c";
  const pot = (x: number, y: number, z: number, s = 1) => [cyl(0.75 * s, 0.55 * s, 1.1 * s, JP(TERRA, 0.7), [x, y + 0.55 * s, z], undefined, 10), tor(1.55 * s, 0.16 * s, JP("#A9502F", 0.7), [x, y + 1.1 * s, z], undefined, 10)];
  // 1. Banco de macetas
  put([
    rbox(8, 0.5, 3.2, 0.1, JP(WOOD, 0.8), [0, 3, 0]), ...[-3.5, 3.5].flatMap((x) => [-1.2, 1.2].map((z) => box(0.55, 2.8, 0.55, JP(WD, 0.8), [x, 1.4, z]))),
    box(7.4, 0.35, 0.5, JP(WD, 0.8), [0, 0.8, 0]),
    ...[-2.2, -0.2, 1.8].flatMap((x) => pot(x, 3.25, -0.7)), ...pot(2.9, 3.25, 0.8, 0.8), ...pot(-5.2, 0, 0.3, 0.9),
    cyl(0.9, 1.1, 1.8, JP("#9AA0A6", 0.4), [0.2, 4.15, 0.7], undefined, 12), cyl(0.1, 0.16, 1.9, JP("#9AA0A6", 0.4), [1.4, 4.4, 0.7], [0, 0, -0.9], 6), cyl(0.4, 0.3, 0.2, JP("#9AA0A6", 0.4), [2.1, 5.1, 0.7], [0, 0, -0.9], 8),
    sph(0.6, JP(GRN, 0.6), [-0.2, 4.6, -0.7], [1.2, 1, 1.2], 4), sph(0.3, JP("#FAFAFA", 0.6), [-0.2, 5.1, -0.7]),
  ], -48, -20, 0.2, 4.4, 8.4, 3.4, 3.4);
  // 2. Canilla con manguera enrollada y aspersor
  const hoseM = JP("#2E7D4F", 0.5);
  put([box(0.9, 5.5, 0.9, JP(WOOD, 0.8), [0, 2.75, 0]), cyl(0.2, 0.2, 1.2, JP("#C9A227", 0.3), [0, 4.4, 0.8], [Math.PI / 2, 0, 0], 8), cyl(0.3, 0.3, 0.5, JP(JC.naranja, 0.4), [0, 3.7, 1.3], undefined, 8),
    ...[0, 1, 2].map((k) => tor(6 - k * 1.1, 0.4, hoseM, [2.2, 0.45 + k * 0.5, 2.6], undefined, 14)), tube([[0, 0.5, 1.4], [0.5, 0.4, 3], [4, 0.4, 5.2], [7, 0.4, 6]], 0.35, hoseM),
    cyl(0.5, 1.1, 0.7, JP("#2b2f36", 0.5), [8, 0.35, 6.2], undefined, 8), cyl(0.25, 0.25, 0.6, JP(JC.naranja, 0.4), [8, 1, 6.2], undefined, 8)], 40, 28, 0, 5.5, 1, 5.5, 1);
  // 3. Arenero con balde, pala y castillos
  const sand = JP("#E6C48A", 0.95), frame = JP(WOOD, 0.8);
  put([box(9, 1.6, 9, sand, [0, 0.7, 0]),
    ...[-4.5, 4.5].flatMap((o) => [rbox(9.8, 1.8, 0.9, 0.1, frame, [0, 0.9, o]), rbox(0.9, 1.8, 9.8, 0.1, frame, [o, 0.9, 0])]),
    ...[-4.5, 4.5].flatMap((x) => [-4.5, 4.5].map((z) => box(1.1, 2.1, 1.1, JP("#5E7C99", 0.6), [x, 1.05, z]))),
    cyl(1.3, 1, 2, JP(JC.rojo, 0.4), [-1.8, 2.3, 1.5], [0.5, 0, 0], 12), tor(2.2, 0.15, JP(JC.amarillo), [-1.8, 3.3, 1.5], [0.5, 0, 0], 10),
    box(0.4, 0.2, 2, JP(JC.azul, 0.4), [2.2, 1.65, 2]), box(1.3, 0.2, 1.4, JP(JC.azul, 0.4), [2.2, 1.65, 3.1]),
    cyl(1.2, 1.5, 1.6, sand, [1.5, 2.4, -1.8], undefined, 10), cyl(0.5, 0.6, 0.7, sand, [1.5, 3.5, -1.8], undefined, 8),
    cyl(0.8, 1, 1.2, sand, [-2, 2.2, -2.5], undefined, 10), cyl(0.35, 0.45, 0.5, sand, [-2, 3, -2.5], undefined, 8)], -28, 50, 0.15, 6.4, 9.8, 2.2, 9.8);
  // 4. Cantero de ladrillo con girasoles y lavandas
  const bri = (i: number) => JP(["#B5543A", "#9A4A2A", "#9E8F82"][i % 3], 0.8);
  const flo: B.Mesh[] = [box(9, 0.9, 3.8, JP("#5A3A22", 1), [0, 0.45, 0])];
  for (let i = 0; i < 6; i++) flo.push(rbox(1.7, 1, 1, 0.1, bri(i), [-4.25 + i * 1.7, 0.5, -2.4]), rbox(1.7, 1, 1, 0.1, bri(i + 1), [-4.25 + i * 1.7, 0.5, 2.4]));
  for (let i = 0; i < 3; i++) flo.push(rbox(1, 1, 1.7, 0.1, bri(i), [-5, 0.5, -1.7 + i * 1.7]), rbox(1, 1, 1.7, 0.1, bri(i + 2), [5, 0.5, -1.7 + i * 1.7]));
  // Girasoles: tallo curvo (tubo de 4 puntos), hojas anchas, cabeza inclinada con anillo de petalos. Generador local fijo (no toca rng()).
  let lseed = 90210; const lr = () => ((lseed = (Math.imul(lseed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const sf = (x: number, z: number, h: number) => {
    const lean = (lr() - 0.5) * 1.6, tilt = 0.95 + lr() * 0.4, s = 0.9 + lr() * 0.25, y0 = 0.9;
    const hx = x + lean, hy = y0 + h, hz = z + 0.5 + lr() * 0.4;
    flo.push(tube([[x, y0, z], [x + lean * 0.1, y0 + h * 0.4, z + 0.1], [x + lean * 0.5, y0 + h * 0.75, z + 0.35], [hx, hy - 0.25, hz - 0.1]], 0.26, JP("#3F8F2F", 0.6)));
    for (let k = 0; k < 3; k++) { const f = 0.22 + k * 0.2, sd = k % 2 ? -1 : 1; flo.push(sph(3.1 - k * 0.3, JP(k === 1 ? "#4CAF50" : "#3F8F2F", 0.6), [x + lean * f * 0.5 + sd * 1.3, y0 + h * f - 0.2, z + 0.3 + (lr() - 0.5) * 0.4], [1, 0.2, 0.7], 6)); }
    const ny = Math.cos(tilt), nz = Math.sin(tilt), c = [hx, hy, hz]; // eje de la cabeza hacia la camara (+z)
    const at = (u: number, v: number, o: number): [number, number, number] => [c[0] + u, c[1] - v * nz + o * ny, c[2] + v * ny + o * nz];
    for (let ring = 0; ring < 2; ring++) for (let k = 0; k < 13; k++) { const ph = (k / 13) * Math.PI * 2 + ring * 0.24, r = (0.82 - ring * 0.2) * s; flo.push(cyl(0.5 * s, 0.34 * s, 0.14, JP(YEL, 0.5), at(Math.cos(ph) * r, Math.sin(ph) * r, 0.02 + ring * 0.07), [tilt, 0, 0], 4)); }
    flo.push(cyl(1.3 * s, 1.3 * s, 0.3, JP(BRN, 0.7), at(0, 0, 0.12), [tilt, 0, 0], 12), cyl(0.9 * s, 0.7 * s, 0.14, JP("#5a3a1a", 0.8), at(0, 0, 0.3), [tilt, 0, 0], 10), sph(0.45 * s, JP("#3a2410", 0.8), at(0, 0, 0.36), [1, 0.5, 1], 5));
  };
  for (const [x, z, h] of [[-1.8, -0.4, 4.6], [0.4, 0.5, 5.2], [2.4, -0.3, 4.1], [-3.4, 0.6, 3.5]]) sf(x, z, h);
  for (let i = 0; i < 10; i++) { const lx = -4.2 + i * 0.95, lz = 1 + (i % 3) * 0.35; flo.push(cyl(0.1, 0.12, 1.8, JP("#3F8F2F"), [lx, 1.8, lz], undefined, 4), cyl(0.5, 0.3, 1.5, JP("#8E5ABF", 0.6), [lx, 3, lz], undefined, 6)); }
  put(flo, 28, -52, -0.1, 5.8, 10.4, 1.5, 5.4);
  // 5. Cobertizo rojo con techo de tejas y puerta con bisagras
  const red = JP("#B23A32", 0.75), trim = JP("#E8D9B0", 0.8), hinge = JP(BLK, 0.4), dark = JP("#6E2420", 0.85);
  const SW = [JP("#6b4a2e", 0.9), JP("#7d5a38", 0.9), JP("#58402a", 0.9), JP("#8a7a66", 0.9)];
  const roofParts = (red: B.Material, dark: B.Material, trim: B.Material) => { // techo a dos aguas de tejas de madera solapadas, aleros, cumbrera y piñones
    const th = 0.5, co = Math.cos(th), si = Math.sin(th), RY = 10, out: B.Mesh[] = [];
    const pt = (sd: number, o: number, n: number): [number, number, number] => [sd * (o * co + n * si), RY - o * si + n * co, 0];
    for (const sd of [-1, 1]) {
      const q = (o: number, n: number, z: number): [number, number, number] => { const p = pt(sd, o, n); return [p[0], p[1], z]; };
      out.push(box(6.9, 0.3, 10.6, JP("#44484E", 0.85), q(3.15, 0, 0), [0, 0, -sd * th]));
      for (let row = 0; row < 9; row++) for (let t = 0; t < 9; t++) out.push(box(1.05, 0.2, 1.2, SW[(row * 3 + t * 2 + (t > 5 ? 1 : 0)) % 4], q(0.35 + row * 0.7, 0.2 + row * 0.03, -5 + ((t + (row % 2) * 0.5) * 10.4) / 9), [0, 0, -sd * th]));
      out.push(box(0.3, 0.7, 10.7, trim, q(6.6, -0.1, 0), [0, 0, -sd * th]));
      for (const z of [-5.35, 5.35]) out.push(box(7.1, 0.34, 0.4, trim, q(3.2, 0.28, z), [0, 0, -sd * th]));
      out.push(box(0.9, 0.3, 10.9, dark, q(0, 0.45, 0), [0, 0, -sd * th]));
    }
    for (let i = 0; i < 6; i++) { const y = 7.2 + i * 0.5, w = Math.min(9.8, (2 * (RY - y - 0.3)) / Math.tan(th)); if (w > 0.4) for (const z of [-4, 4]) out.push(box(w, 0.5, 0.3, red, [0, y, z])); }
    return out;
  };
  put([rbox(10, 7, 8, 0.15, red, [0, 3.5, 0]), ...Array.from({ length: 11 }, (_, i) => -4.5 + i).flatMap((x) => [box(0.14, 6.8, 0.22, dark, [x, 3.5, 4.05]), box(0.14, 6.8, 0.22, dark, [x, 3.5, -4.05])]),
    ...Array.from({ length: 9 }, (_, i) => -3.5 + i).flatMap((z) => [box(0.22, 6.8, 0.14, dark, [5.05, 3.5, z]), box(0.22, 6.8, 0.14, dark, [-5.05, 3.5, z])]),
    ...[-5, 5].flatMap((x) => [-4, 4].map((z) => box(0.6, 7, 0.6, trim, [x, 3.5, z]))),
    box(10.8, 0.5, 0.6, trim, [0, 0.25, 4.1]),
    box(3.6, 5, 0.3, trim, [-1.5, 2.5, 4.1]), box(3, 4.6, 0.35, JP("#9C332C", 0.75), [-1.5, 2.4, 4.2]),
    ...[1.2, 3.6].map((y) => box(0.9, 0.3, 0.4, hinge, [-2.7, y, 4.45])), box(0.4, 0.8, 0.4, hinge, [-0.5, 2.3, 4.45]),
    box(2, 1.8, 0.3, trim, [2.8, 4.2, 4.1]), box(1.5, 1.3, 0.35, JP("#B3E5FC", 0.2), [2.8, 4.2, 4.2]),
    ...roofParts(red, dark, trim),
    ...[0, 1].map((k) => rbox(0.8, 6.6 - k * 0.2, 0.3, 0.05, JP(k ? WD : WOOD, 0.8), [6.1 + k, 3.3 - k * 0.1, 4.6], [0, 0, 0.3 + k * 0.05])),
    cyl(0.9, 0.7, 1.2, JP("#B0B6BD", 0.3), [-5.6, 0.6, 3], undefined, 10)], 55, 38, -0.4, 7, 10.4, 8, 8.6);
  // 6. Porton de madera con enredadera
  const gate = [...[-4.9, -1.2, 1.2, 4.9].flatMap((x) => [box(1.4, 6.6, 1.4, JP(WD, 0.8), [x, 3.3, 0]), box(1.8, 0.4, 1.8, JP(WOOD, 0.8), [x, 6.8, 0])]),
    ...[-4, -3, -2, -0.6, 0.6, 2, 3, 4].map((x, k) => box(0.8, 4.4 + (k % 2) * 0.6, 0.3, JP(WOOD, 0.8), [x, 2.4 + (k % 2) * 0.3, 0])),
    box(2.4, 0.4, 0.5, JP(WD, 0.8), [0, 1.2, 0.35]), box(2.4, 0.4, 0.5, JP(WD, 0.8), [0, 4.2, 0.35]), box(0.4, 3.9, 0.5, JP(WD, 0.8), [0, 2.7, 0.35], [0, 0, 0.7]),
    ...[1.6, 3.8].map((y) => box(1, 0.3, 0.3, hinge, [-0.9, y, 0.6])), box(0.5, 0.9, 0.3, hinge, [0.9, 2.6, 0.6]),
    ...[0, 1, 2, 3, 4, 5, 6].map((k) => sph(0.55, JP(k % 2 ? "#3F8F2F" : "#66BB6A", 0.6), [-4.9 + Math.sin(k) * 0.4, 0.8 + k * 0.7, 0.9], [1, 1, 0.8], 4))];
  put(gate, -58, -8, Math.PI / 2, 4.6, 11, 7, 1.6);
  // 7. Volúmenes oscuros bajos cerca de la salida: macetas de hierro, regadera, manguera enrollada, tronco y piedra (siluetas oscuras, pasillos > 6 m entre sí)
  const iron = JP("#24282d", 0.6), soil = JP("#2a190d", 1), darkG = JP("#1b4a1c", 0.7);
  const bigPot = [cyl(2.2, 1.6, 3.2, iron, [0, 1.6, 0], undefined, 10), tor(4.4, 0.3, iron, [0, 3.2, 0], undefined, 10), cyl(1.9, 1.9, 0.2, soil, [0, 3.1, 0], undefined, 10), ...[0, 1, 2, 3, 4].map((k) => sph(1.3, darkG, [Math.cos(k * 1.3) * 0.9, 3.9 + (k % 2) * 0.4, Math.sin(k * 1.3) * 0.9], [1, 1.1, 1], 4))];
  put(bigPot, 14, 12, 0, 2.6, 4.4, 4, 4.4);
  put(bigPot, -13, -4, 0.5, 2.6, 4.4, 4, 4.4);
  put([...[0, 1, 2].map((k) => tor(5 - k * 0.9, 0.55, iron, [0, 0.55 + k * 0.6, 0], undefined, 14)), tube([[3, 0.5, 0], [5, 0.5, 2], [8, 0.4, 3.5]], 0.45, iron)], -2, 24, 0.3, 5, 10, 2.2, 10);
  put([rbox(7, 2.4, 2.6, 0.5, JP("#3a2412", 0.9), [0, 1.2, 0], [0, 0, 0.08]), cyl(1.1, 1.1, 0.12, JP("#6a4a2a", 0.9), [3.5, 1.2, 0], [0, 0, Math.PI / 2], 10), sph(2, JP("#3a3d42", 0.9), [-5, 1, 2.4], [1.3, 0.7, 1], 5)], 8, -16, 0.9, 4.5, 8, 2.4, 3);
}

export function frontLayout() {
  toyProps();
  // TRAMO: fila de aspersores que barren el césped y empujan al auto; más alguno suelto
  const sp = freeSpot(22);
  if (sp) { const ry = rng() * Math.PI; for (let k = -1; k <= 1; k++) sprinkler(sp[0] + Math.sin(ry) * k * 13, sp[1] + Math.cos(ry) * k * 13); }
  for (let i = 0, n = int(1, 2); i < n; i++) { const p = freeSpot(8); if (p) sprinkler(p[0], p[1]); }
  toyRamps(int(2, 3), [0, 3]);
  gnomes(int(3, 6));
  pots(int(2, 4));
  rocks(int(4, 9));
  hose();
  wateringCan();
  puddles(int(2, 5), pbr("puddle", { color: "#3b4a52", rough: 0.03, metal: 0.2, alpha: 0.85 }));
  ball();
}

// Aspersor: el chorro gira (zoneTick) y empuja lo que encuentra
type Sprinkler = { x: number; z: number; ph: number; jet: B.Mesh };
const sprinklers: Sprinkler[] = [];
let sprT = 0;
onClear.push(() => { sprinklers.length = 0; sprT = 0; });
function sprinkler(x: number, z: number) {
  stat(merge("sprinkler", [cyl(2.4, 3, 1.2, M.plastic("#1f6f3a"), [0, 0.6, 0], undefined, 10), cyl(0.8, 0.8, 1.2, M.metal("#9aa0a6"), [0, 1.6, 0], undefined, 8)]), B.PhysicsShapeType.CYLINDER, {}, [x, 0, z]);
  const jet = tube([[0, 1.8, 0], [0, 4.2, 4], [0, 4.8, 8], [0, 3.4, 12], [0, 0.6, 15]], 0.3, pbr("chorro", { color: "#bfe8ff", rough: 0.1, emissive: "#3a6a80", alpha: 0.55 }));
  jet.position.set(x, 0, z);
  jet.isPickable = false;
  sprinklers.push({ x, z, ph: rng() * 6.3, jet });
  bare.push({ x, z, r: 2 });
}
/** Llamar cada paso de la partida: gira los aspersores y devuelve el empujón (velocidad a sumar) o null. Determinista (dt). */
export function zoneTick(dt: number, p: B.Vector3, boost = false) {
  if (!sprinklers.length) return null;
  sprT += dt * (boost ? 1.85 : 1);
  let push: B.Vector3 | null = null;
  for (const s of sprinklers) {
    const a = s.ph + sprT * 1.3;
    s.jet.rotation.y = a;
    const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz);
    if (d > 15 || d < 1.5 || p.y > 5) continue;
    const da = Math.atan2(dx, dz) - a;
    if (Math.abs(Math.atan2(Math.sin(da), Math.cos(da))) > 0.32) continue;
    (push ??= new B.Vector3()).addInPlace(new B.Vector3(dx / d, 0, dz / d).scaleInPlace((boost ? 51 : 38) * dt * (1 - d / 18)));
  }
  return push;
}


