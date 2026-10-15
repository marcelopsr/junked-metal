import * as B from "@babylonjs/core";
import { manchas } from "./manchas";
import { box, cyl, merge, rbox, tor, tube } from "../models";
import { M, pbr, shadows } from "../render";
import { rng } from "../rng";
import { FOLD_PAINT } from "../folded";
import { HALF, bare, concreteTex, decal, dyn, floor, occluders, realCar, scene, stat, tex, tireStackM, undo, woodM } from "./common";
import { ball, between, giantTools, int, paintCans, piles, puddles, ramp, slopeBoard, toyRamps } from "../world_layout";

export function garageBuild() {
  floor("r53hormigon", "#ffffff", () => { const x = new B.Texture("./textures/r53-hormigon.webp", scene); x.wrapU = x.wrapV = B.Texture.WRAP_ADDRESSMODE; return x; }, 0.85, "concrete", 10);
  // El alpha de la textura conserva bordes irregulares sin geometría extra.
  const oilTex = tex("oilStain", () => new B.Texture("./images/decals/oil-stain.webp", scene));
  oilTex.hasAlpha = true;
  const oil = pbr("oilStain", { color: "#ffffff", rough: 0.65, tex: oilTex });
  oil.useAlphaFromAlbedoTexture = true;
  oil.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  for (const [x, z, w, h, ry] of [[30, 20, 2.8, 1.5, 0], [26, -18, 2.2, 1.3, 0.7], [-40, -55, 2.5, 1.4, -0.5], [-10, 40, 2, 1.2, 1.2]]) decal("oilStain", w, h, x, z, oil, 0.025).rotation.y = ry;
  const tracksTex = tex("tireMarks", () => new B.Texture("./images/decals/tire-marks.webp", scene));
  tracksTex.hasAlpha = true;
  const tracks = pbr("tireMarks", { color: "#ffffff", rough: 0.95, tex: tracksTex });
  tracks.useAlphaFromAlbedoTexture = true;
  tracks.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  for (const [x, z, ry] of [[0, 24, 0], [12, 38, -0.35], [28, 50, -0.7]]) decal("tireMarks", 10, 14, x, z, tracks, 0.03).rotation.y = ry;
  // Paredes altas (se tramean si tapan al auto); al frente, el portón de chapa
  const paint = M.matte("#6f7d78"), band = M.matte("#3c4542"), steel = M.metal("#a4aab0");
  for (const [x, z, w, d] of [[0, -HALF - 1, HALF * 2 + 4, 2], [HALF + 1, 0, 2, HALF * 2 + 4], [-HALF - 1, 0, 2, HALF * 2 + 4], [0, HALF + 1, HALF * 2 + 4, 2]]) {
    const parts = [box(w, 56, d, paint, [x, 28, z]), box(w + 0.6, 5, d + 0.6, band, [x, 2.5, z])];
    if (z > HALF) for (let k = 0; k < 12; k++) parts.push(box(70, 3.2, 0.8, steel, [10, 2 + k * 3.5, HALF - 0.2]));
    occluders.push(merge("gwall", parts));
  }
  // Banco de trabajo (techo bajo: la cámara se mete abajo) con morsa, tablero de herramientas y su tubo
  const wood = woodM(), bz = -HALF + 8;
  for (const [x, z] of [[-68, bz - 5], [-22, bz - 5], [-68, bz + 5], [-22, bz + 5]]) stat(box(1.6, 18, 1.6, M.metal("#4a5058"), [x, 9, z]), B.PhysicsShapeType.BOX);
  const bench = merge("bench", [
    box(50, 1.2, 14, wood, [-45, 18, bz]),
    box(5, 3, 4, M.metal("#2f5f8a"), [-28, 20, bz + 3]), box(1, 1, 6, M.metal("#9aa0a6"), [-28, 20.5, bz + 6]),
  ]);
  shadows.addShadowCaster(bench);
  occluders.push(bench);
  const tools = [box(3, 14, 0.6, M.matte("#2b2f36"), [-62, 32, -HALF + 0.6]), box(10, 2, 0.6, M.matte("#2b2f36"), [-50, 36, -HALF + 0.6]), box(2, 12, 0.6, M.matte("#8a1810"), [-40, 30, -HALF + 0.6]), tor(6, 1, M.matte("#2b2f36"), [-30, 33, -HALF + 0.6], [Math.PI / 2, 0, 0], 12)];
  merge("pegboard", [box(50, 24, 0.5, M.matte("#b89a6a"), [-45, 32, -HALF + 0.3]), ...tools]);
  // Tubos fluorescentes: uno sobre el banco y dos en el techo. Parpadean (luz del sol del clima TUBO + emisivo)
  const tubeM = pbr("tubo", { color: "#eafff4", rough: 0.4, emissive: "#d8f5ea" });
  merge("tubes", [
    box(30, 1.6, 2.4, steel, [-45, 47, -HALF + 1.5]), box(28, 1, 1, tubeM, [-45, 46.2, -HALF + 2.4]),
    ...[-25, 25].flatMap((tz) => [box(4, 1.6, 34, steel, [-20, 54, tz]), box(1, 1, 32, tubeM, [-20, 53.2, tz])]),
  ]);
  flicker(tubeM);
  // Estantería metálica con cajas y latas
  const parts: B.Mesh[] = [];
  for (const [x, z] of [[20.5, -HALF + 1], [55.5, -HALF + 1], [20.5, -HALF + 10], [55.5, -HALF + 10]]) parts.push(box(1, 46, 1, M.metal("#7a8088"), [x, 23, z]));
  for (const y of [2, 14, 26, 38]) {
    parts.push(box(36, 0.8, 10, M.metal("#8a9098"), [38, y, -HALF + 5.5]));
    for (let x = 22; x < 52;) { const w = 5 + rng() * 6, h = 4 + rng() * 6; parts.push(box(w, h, 7, M.matte(["#b08850", "#9a7444", "#c49a64"][int(0, 2)]), [x + w / 2, y + 0.4 + h / 2, -HALF + 5.5])); x += w + 1 + rng() * 2; }
  }
  const shelf = merge("shelf", parts);
  shadows.addShadowCaster(shelf);
  occluders.push(shelf);
  stat(box(36, 46, 10, band, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [38, 23, -HALF + 5.5]).isVisible = false;
  // Bicicleta apoyada en la pared izquierda
  const frame = M.metal("#2a6fdb"), bp: B.Mesh[] = [];
  for (const wz of [-20, 20]) bp.push(tor(28, 1.4, M.rubber(), [0, 14, wz], [0, 0, Math.PI / 2], 24), cyl(0.5, 0.5, 26, M.metal("#9aa0a6"), [0, 14, wz], [Math.PI / 2, 0, 0], 4));
  bp.push(tube([[0, 14, -20], [0, 16, -2], [0, 30, 4], [0, 30, 16], [0, 14, 20]], 0.8, frame), tube([[0, 16, -2], [0, 30, 16]], 0.8, frame), tube([[0, 30, 4], [0, 34, 2]], 0.6, frame));
  bp.push(box(4, 1.4, 8, M.matte("#1a1a1a"), [0, 35, 2]), cyl(0.8, 0.8, 16, M.metal("#9aa0a6"), [0, 36, 18], [0, 0, Math.PI / 2], 6));
  const bike = merge("bike", bp);
  bike.position.set(-75, 0, 40); bike.rotation.z = 0.12; // apoyada en la pared
  shadows.addShadowCaster(bike);
  occluders.push(bike);
  stat(box(6, 34, 46, band, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [-76, 17, 40]).isVisible = false;
  // Pila de cubiertas con material PBR y normales
  stat(merge("tires", [0, 1, 2, 3].map((i) => tor(16, 5.5, tireStackM(), [0, 2.75 + i * 5.3, 0], undefined, 18))), B.PhysicsShapeType.CYLINDER, {}, [-68, 0, -50]);
  // El auto de la casa, en caballetes: abajo es zona techada
  realCar(30, 0, 0, 9, true, "#E53935");
}

// Puente de tablones de juguete (misma geometría y huella que plankBridge, sin madera texturada)
function toyBridge(px: number, pz: number, bry: number) {
  const mat = pbr("gplank", { color: "#FB8C00", rough: 0.45, metal: 0 }), rampM = pbr("gplankR", { color: "#E53935", rough: 0.45, metal: 0 });
  const half = 15.2, L = 16, foot = half + L, dx = Math.sin(bry), dz = Math.cos(bry);
  for (const s of [-1, 1]) ramp(rampM, px + dx * foot * s, pz + dz * foot * s, s < 0 ? bry : bry + Math.PI, 3.2, L, 7, 0, 0, 0, [slopeBoard(3.6, L, 7, mat)]);
  stat(rbox(3.6, 0.5, half * 2, 0.2, mat, [px, 6.75, pz], [0, bry, 0]), B.PhysicsShapeType.BOX);
  bare.push({ x: px, z: pz, r: 16 });
}

export function garageLayout() {
  // TRAMO: tablón sobre dos caballetes y, abajo, bulones sueltos que hacen patinar
  const px = between(-45, -28), pz = between(-8, 22), bry = (rng() < 0.5 ? 0 : Math.PI) + (rng() - 0.5) * 0.3;
  toyBridge(px, pz, bry);
  for (let k = 0; k < 16; k++) {
    const t = (rng() - 0.5) * 26, e = (rng() - 0.5) * 8;
    dyn(cyl(1.4, 1.4, 0.9, M.matte("#9E9E9E"), [px + Math.sin(bry) * t + Math.cos(bry) * e, 0.45, pz + Math.cos(bry) * t - Math.sin(bry) * e], undefined, 6), B.PhysicsShapeType.CYLINDER, 0.2);
  }
  toyRamps(int(2, 3), [0, 1]);
  giantTools();
  paintCans(int(4, 7));
  piles(int(2, 3), [FOLD_PAINT[0], FOLD_PAINT[1], FOLD_PAINT[2]], (c) => M.plastic(c), 3, true); // cajas de juguete
  puddles(int(3, 6), pbr("oil", { color: "#0c0b0a", rough: 0.05, metal: 0.4, alpha: 0.9 }));
  ball();
  // Contraste: props bajos de juguete que parten las sombras gigantes y manchas de aceite de borde suave, en el encuadre de salida (generador local, sin colisión; ponytail: solo visuales, techo ~30 piezas fusionadas)
  const q = ((s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296))(53);
  const tin = M.matte("#f0d9a8"), tinD = M.matte("#23272e"), yel = M.matte("#f4efe6"), rub = M.rubber(), steel = M.metal("#8f969e");
  const props: B.Mesh[] = [];
  for (let i = 0; i < 27; i++) {
    const x = (q() - 0.5) * 60 + 4, z = -26 + q() * 34;
    if (Math.hypot(x, z) < 7) continue; // no sobre el auto de salida
    const k = i % 3;
    const g = k === 0 ? [box(3.2, 1.5, 1.6, tin, [x, 0.75, z]), box(2.2, 0.35, 0.5, steel, [x, 1.65, z])] // caja de herramientas
      : k === 1 ? [cyl(1, 1, 1.9, i % 2 ? yel : tinD, [x, 0.95, z], undefined, 10), cyl(0.9, 0.9, 0.12, steel, [x, 1.96, z], undefined, 10)] // bidón
        : [tor(1.2, 0.5, rub, [x, 0.5, z], undefined, 12), tor(1.2, 0.5, rub, [x + 0.1, 1.5, z], undefined, 12)]; // neumáticos apilados
    props.push(...g);
  }
  // Altas luces puntuales: latas blancas, carteles claros y tubos encendidos bajos (emisivo, sin colisión)
  const lit = pbr("gLuz", { color: "#fff6dc", rough: 0.5, emissive: "#fff0c8" }), can = M.matte("#fbf8ee");
  for (let i = 0; i < 9; i++) {
    const x = (q() - 0.5) * 56 + 4, z = -24 + q() * 32; if (Math.hypot(x, z) < 8) continue;
    if (i % 3 === 0) props.push(box(2.4, 0.25, 0.25, lit, [x, 0.2, z], [0, q() * 3, 0]));
    else if (i % 3 === 1) props.push(box(2.2, 1.4, 0.2, lit, [x, 0.75, z], [-0.25, q() * 3, 0]), box(0.2, 0.7, 0.2, steel, [x, 0.35, z]));
    else props.push(cyl(0.7, 0.7, 1.4, can, [x, 0.7, z], undefined, 10));
  }
  const pm = merge("gdecor", props); shadows.addShadowCaster(pm); pm.receiveShadows = true;
  const sd = tex("oilSoft", () => { const t = new B.DynamicTexture("oilSoft", 64, scene, false), c = t.getContext() as unknown as CanvasRenderingContext2D, g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(12,7,3,1)"); g.addColorStop(0.6, "rgba(12,7,3,0.75)"); g.addColorStop(1, "rgba(20,12,6,0)"); c.fillStyle = g; c.fillRect(0, 0, 64, 64); t.update(); t.hasAlpha = true; return t; });
  const soft = pbr("oilSoft", { color: "#ffffff", rough: 0.4, tex: sd }); soft.useAlphaFromAlbedoTexture = true; soft.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  manchas("manchaGaraje", 61, [-30, 34, -26, 8], [{ color: "#efe3c8", alpha: 0.65, n: 24, w: [5, 10] }, { color: "#1a120c", alpha: 0.75, n: 18, w: [5, 9] }], 0.05); // polvo claro y mugre sobre el cemento (sin colisión)
  for (let i = 0; i < 30; i++) { const w = 7 + q() * 8; decal("oilSoft", w, w * (0.6 + q() * 0.4), (q() - 0.5) * 56 + 2, -24 + q() * 34, soft, 0.04).rotation.y = q() * 3; }
}

// Parpadeo del tubo: baja luz y emisivo en ráfagas cortas. Solo visual (Math.random); se apaga con "calma".
// Se aplica antes de dibujar la cámara y se deshace después: el ciclo y el apagón de main.ts no se enteran.
function flicker(mat: B.PBRMaterial) {
  const sun = scene.getLightByName("sun")!, hemi = scene.getLightByName("hemi")!, base = mat.emissiveColor.clone();
  let saved: number[] | null = null, burst = 0, hold = 0, f = 1, last = performance.now();
  const o1 = scene.onBeforeCameraRenderObservable.add(() => {
    if (saved) return;
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (document.body.classList.contains("calm")) f = 1;
    else {
      if (burst <= 0 && Math.random() < dt * 0.2) burst = 0.4 + Math.random() * 0.8;
      burst -= dt;
      if ((hold -= dt) <= 0) { hold = 0.05 + Math.random() * 0.1; f = burst > 0 && Math.random() < 0.5 ? 0.35 : 1; }
    }
    saved = [sun.intensity, hemi.intensity];
    sun.intensity *= f; hemi.intensity *= 0.6 + 0.4 * f;
    mat.emissiveColor.copyFrom(base).scaleInPlace(f);
  });
  const o2 = scene.onAfterRenderObservable.add(() => { if (saved) { [sun.intensity, hemi.intensity] = saved; saved = null; } });
  undo.push(() => { scene.onBeforeCameraRenderObservable.remove(o1); scene.onAfterRenderObservable.remove(o2); mat.emissiveColor.copyFrom(base); });
}

