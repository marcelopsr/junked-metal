import * as B from "@babylonjs/core";
import { box, cyl, merge, rbox, sph, tube } from "../models";
import { M, pbr, shadows, TEX } from "../render";
import { rng } from "../rng";
import { HALF, bare, decal, floor, house, leafM, occluders, onClear, realCar, scene, stat, tex, tree, woodM } from "./common";
import { ball, freeSpot, gnomes, hose, int, pots, puddles, ramp, rocks, slopeBoard, toyRamps, wateringCan } from "../world_layout";

export function frontBuild() {
  floor("lawn", "#b8f0a0", TEX.grassMacro, 0.9);
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
  const stone = pbr("stone", { color: "#ffffff", rough: 0.9, tex: tex("stone", TEX.stone) });
  for (let z = -HALF + 20; z < HALF - 6; z += 9) { const d = B.MeshBuilder.CreateDisc("laja", { radius: 3.6, tessellation: 7 }, scene); d.rotation.set(Math.PI / 2, rng() * 6, 0); d.position.set(12 + (rng() - 0.5) * 2, 0.03, z); d.material = stone; d.receiveShadows = true; }
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

export function frontLayout() {
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


