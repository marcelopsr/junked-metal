// Banco de prueba Folded 2.5D (solo dev, `?folded`): paleta, materiales con desgaste 0/0,5/1, trim sheet, calcos y cada pieza del kit
// girando. `__folded({ yaw, top, spin })` fija el ángulo para capturar (0/90/180/270 grados, vista de arriba).
import * as B from "@babylonjs/core";
import { PAL } from "./kit3d";
import { DECALS, FOLD, geoKit, TRIM, type TrimId } from "./folded";
import { carModel, enemyTemplate, legTemplate, LEGS, template, wingTemplate, windKeyTemplate } from "./models";
import { crateDetail, fencePanel, paintCanFold, realCarFold, toolFold, wateringCanFold } from "./folded_slice";
import { GLB, procBake } from "./glb";
import type { Kind } from "./enemies";
import { showWorld } from "./world";

export function foldedLab(scene: B.Scene, cam: B.FreeCamera) {
  showWorld(false); // solo el banco: sin patio de fondo
  const root = new B.TransformNode("foldLab", scene);
  const add = (m: B.Mesh, mat: B.Material) => { m.material = mat; m.parent ??= root; return m; };
  const G = geoKit(scene, add);
  const spinners: B.TransformNode[] = [];
  // Cada muestra cuelga de su propio pivote: gira sobre sí misma
  // (se arma en el origen con un kit propio: sus remaches/tornillos quedan como thin instances del pivote)
  const cell = (x: number, z: number, build: (g: typeof G) => void, k = 1) => {
    const piv = new B.TransformNode("piv", scene); piv.parent = root;
    const before = new Set(root.getChildMeshes(true)), g = geoKit(scene, add);
    build(g);
    for (const m of root.getChildMeshes(true)) if (!before.has(m)) m.setParent(piv);
    g.thin(FOLD.bare(), piv, 2); // x2 para que se lean en el banco
    piv.position.set(x, 0, z); piv.scaling.setAll(k);
    spinners.push(piv);
  };
  // Fondo: piso y pared oscuros para que la chapa se lea
  const floor = add(B.MeshBuilder.CreateGround("p", { width: 14, height: 10 }, scene), FOLD.painted(PAL.metalOsc, 0.3, 51)); floor.position.set(0, 0, 1);
  const sliceRoot = new B.TransformNode("sliceRow", scene); sliceRoot.parent = root;
  const slots: B.TransformNode[] = []; // piezas del slice en orden (para __folded({ solo }))

  // Fila 1: paleta (cubos chatos)
  const pal = Object.entries(PAL).filter(([, v]) => v.startsWith("#"));
  const uniq = [...new Map(pal.map(([k, v]) => [v, k])).keys()];
  uniq.forEach((c, i) => G.box(0.22, 0.06, 0.22, FOLD.plastic(c), [-5.5 + (i % 30) * 0.38, 0.03, -3.6 + ((i / 30) | 0) * 0.3]));

  // Fila 2: materiales (esferas y cubos) con wear 0 / 0,5 / 1
  const mats: [string, B.Material][] = [];
  for (const c of [PAL.naranja, PAL.petroleo, PAL.rojoChapa]) for (const w of [0, 0.5, 1]) mats.push([`${c}-${w}`, FOLD.painted(c, w)]);
  mats.push(["bare", FOLD.bare()], ["rust", FOLD.rust()], ["rubber", FOLD.rubber()], ["plastic", FOLD.plastic(PAL.amarillo)], ["screen", FOLD.screen()], ["emissive", FOLD.emissive(PAL.rojo)]);
  mats.forEach(([, m], i) => cell(-5.4 + i * 0.72, -2.5, (G) => G.box(0.45, 0.45, 0.45, m, [0, 0.25, 0])));

  // Fila 3: trim sheet (cada franja con volumen) y calcos sobre placas
  (Object.keys(TRIM) as TrimId[]).forEach((id, i) => cell(-5.2 + i * 0.75, -1.3, (G) => G.trimStrip([0, 0.2, 0], undefined, 0.6, 0.12, id, 0.03)));
  DECALS.forEach((id, i) => cell(0.9 + i * 0.6, -1.3, (G) => { G.box(0.45, 0.45, 0.02, FOLD.painted(PAL.metalOsc, 0.5, 23), [0, 0.25, 0.012]); G.decal([0, 0.25, 0], undefined, id, 0.4); }));

  // Fila 4: piezas del kit
  const p = FOLD.painted(PAL.naranja, 0.6), t = FOLD.painted(PAL.petroleo, 0.6, 37);
  const kit: ((G: ReturnType<typeof geoKit>) => void)[] = [
    (G) => G.panel([0, 0.35, 0], undefined, 0.6, 0.6, p),
    (G) => G.plate([0, 0.3, 0], undefined, 0.5, 0.4, t),
    (G) => G.foldBox([0, 0, 0], undefined, 0.6, 0.45, 0.5, t),
    (G) => G.profile([0, 0, 0], undefined, 0.7, 0.12, FOLD.bare()),
    (G) => G.tube([[-0.3, 0.05, 0], [-0.1, 0.4, 0], [0.2, 0.3, 0.1], [0.3, 0.05, 0]], 0.04, FOLD.rust()),
    (G) => G.grate([0, 0.3, 0], undefined, 0.5, 0.5, 7, p),
    (G) => G.hinge([0, 0.3, 0], undefined, 0.4, t),
    (G) => G.wheel([0, 0.3, 0], undefined, 0.55, 0.22),
    (G) => G.bracket([0, 0, 0], undefined, 0.4, p),
    (G) => G.rivets([-0.25, 0.3, 0], [0.25, 0.3, 0], 6, [0, 0, -1]),
  ];
  kit.forEach((f, i) => cell(-5.4 + i * 1.2, 0.6, f, 1.8));

  // Fila 5: el vertical slice tal como lo usa el juego (plantillas + patas/alas/llave en sus pivots)
  {
    const slot = (x: number, k = 1, z = 2.6) => { const piv = new B.TransformNode("slice", scene); piv.parent = sliceRoot; piv.position.set(x, 0, z); piv.scaling.setAll(k); spinners.push(piv); slots.push(piv); return piv; };
    const inst = (src: B.Mesh, piv: B.TransformNode, p = B.Vector3.Zero(), r = B.Vector3.Zero(), sc?: B.Vector3) => { const i = src.createInstance("si"); i.parent = piv; i.position.copyFrom(p); i.rotation.copyFrom(r); if (sc) i.scaling.copyFrom(sc); return i; };
    // Fila de bichos (PROC de folded_slice.ts, horneados como los GLB); el cuadro de la caminata avanza solo
    const vats: B.Vector4[] = [];
    const bug = (k: Kind, x: number) => { const piv = slot(x, GLB[k]?.visual ?? 1), i = inst(procBake(scene, k), piv); vats.push(i.instancedBuffers.bakedVertexAnimationSettingsInstanced = new B.Vector4(0, 9, 0, 0)); return piv; };
    scene.onBeforeRenderObservable.add(() => { for (const v of vats) v.z = (v.z + 0.15) % 10; });
    (["hormiga", "escupidora", "escarabajo", "friccion"] as Kind[]).forEach((k, n) => bug(k, -5.2 + n * 1.9));
    const moth = bug("polilla", 2.4);
    for (const sd of [1, -1] as const) inst(wingTemplate(sd), moth, new B.Vector3(sd * 0.16, 0.42, -0.05), new B.Vector3(0, 0, sd * 0.35));
    const bot = bug("robot", 4.6);
    inst(windKeyTemplate(), bot, new B.Vector3(0, 0.74, -0.38));
    // Segunda fila: auto, caja y cerca
    const car = slot(-2, 1, 5.6), cm = carModel("buggy", { fixed: true });
    cm.body.parent = car; cm.body.position.set(0, 0.4, 0);
    const crate = slot(0.8, 0.5, 5.6);
    G.box(2.4, 2.2, 2.4, FOLD.painted("#c98a1a", 0.8, 23), [0, 1.1, 0]).parent = crate;
    inst(template("crateFold", crateDetail), crate, new B.Vector3(0, 1.1, 0), undefined, new B.Vector3(2.4, 2.2, 2.4));
    inst(template("plank", fencePanel), slot(3, 0.22, 5.6));
    // Tercera fila (z = 9): jefes sin clips a 1/5, con sus patas (LEGS) donde corresponde
    (["rey", "tarantula", "cortadora", "aspiradora", "cortacercos", "perro", "gato"] as Kind[]).forEach((k, n) => {
      const p = slot(-6.6 + n * 2.2, 0.2, 9), i = inst(procBake(scene, k), p); vats.push(i.instancedBuffers.bakedVertexAnimationSettingsInstanced = new B.Vector4(0, 9, 0, 0));
      const L = LEGS[k];
      if (L) L.hips.forEach(([x, y, z], j) => { for (const sd of [1, -1]) { const yaw = L.yaw?.[j] ?? 0; inst(legTemplate(k), p, new B.Vector3(x * sd * L.scale, y * L.scale, z * L.scale), new B.Vector3(0, sd > 0 ? yaw : Math.PI - yaw, 0)); } });
    });
    // Quinta fila (z = 15): utilería del mundo (lata, herramientas, regadera, auto real) a escala de banco
    ([["lataF", () => paintCanFold("#d62828"), 0.12], ["toolF0", () => toolFold(0), 0.07], ["toolF1", () => toolFold(1), 0.08], ["toolF2", () => toolFold(2), 0.08], ["regaderaF", wateringCanFold, 0.1], ["realCarF", () => realCarFold(10, "#5b7fa6"), 0.018]] as [string, () => B.Mesh[], number][])
      .forEach(([n, f, k], i) => inst(template(n, f), slot(-5 + i * 2, k, 15)));
    // Cuarta fila (z = 12): los 8 autos (eje a la altura del radio de rueda: apoyados)
    (["buggy", "monster", "formula", "tanque", "carrera", "axel", "helado", "combi"] as const).forEach((k, n) => {
      const p = slot(-6.3 + n * 1.8, 0.7, 12), m = carModel(k, { fixed: true });
      m.body.parent = p; m.body.position.set(0, Math.max(...m.wheels.map((w) => w.r - w.m.position.y)), 0);
    });
  }
  const hemi = new B.HemisphericLight("foldHemi", new B.Vector3(0.2, 1, -0.4), scene); hemi.intensity = 0.7;
  const sun = new B.DirectionalLight("foldSun", new B.Vector3(-0.4, -1, 0.6), scene); sun.intensity = 2.2;
  let spin = true, yaw = 0;
  let rowZ = 0; // fila del slice a encuadrar (0: bichos, 3: autos y props, 6,4: jefes)
  const view = (top = false, slice = false) => {
    cam.fov = 0.95; cam.minZ = 0.05;
    for (const c of root.getChildren()) if (c !== sliceRoot && c !== floor) (c as B.TransformNode).setEnabled(!slice); // vista del slice: solo esa fila
    if (slice) { if (top) { cam.position.set(0, 10, 3.9 + rowZ); cam.setTarget(new B.Vector3(0, 0, 4 + rowZ)); } else { cam.position.set(0, 3.2, -4.8 + rowZ); cam.setTarget(new B.Vector3(0, 0.5, 3.4 + rowZ)); } }
    else if (top) { cam.position.set(0, 13, -0.2); cam.setTarget(new B.Vector3(0, 0, -0.8)); }
    else { cam.position.set(0, 4.2, -8.2); cam.setTarget(new B.Vector3(0, 0.2, -0.9)); }
  };
  view();
  scene.onBeforeRenderObservable.add(() => { if (spin) yaw += 0.02; for (const s of spinners) s.rotation.y = yaw; });
  Object.assign(window, { __folded: (o: { yaw?: number; top?: boolean; spin?: boolean; slice?: boolean; row?: number; solo?: number; d?: number } = {}) => {
    if (o.row !== undefined) rowZ = o.row;
    if (o.yaw !== undefined) { yaw = (o.yaw * Math.PI) / 180; spin = false; }
    if (o.spin !== undefined) spin = o.spin;
    if (o.solo !== undefined) { // una sola pieza del slice, encuadrada (d: distancia de cámara)
      view(false, true); slots.forEach((s, i) => s.setEnabled(i === o.solo));
      const p = slots[o.solo].position, d = o.d ?? 3; floor.position.set(p.x, 0, p.z);
      if (o.top) { cam.position.set(p.x, d * 1.4, p.z - 0.01); } else cam.position.set(p.x, d * 0.5, p.z - d);
      cam.setTarget(new B.Vector3(p.x, d * 0.12, p.z));
      return { slots: slots.length };
    }
    slots.forEach((s) => s.setEnabled(true)); floor.position.set(0, 0, 1);
    view(!!o.top, !!o.slice);
    return { meshes: root.getChildMeshes().length, spinners: spinners.length };
  } });
}
