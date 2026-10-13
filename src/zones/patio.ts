import * as B from "@babylonjs/core";
import { box, cyl, merge, sph, template, tor } from "../models";
import { M, pbr, shadows, surface, TEX } from "../render";
import { rng } from "../rng";
import { FOLD, FOLDED_SLICE } from "../folded";
import { HALF, bare, crateFold, decal, floor, house, leafM, occluders, plankTpl, registerHeavyProp, rustyDrumM, scene, stat, tex, tireStackM, tree, woodCrateM } from "./common";
import { ball, brickWalls, gnomes, hose, int, jumpScrap, piles, plankBridge, planterAlley, pots, puddles, ramp, rocks, toyRamps, toyScatter, wateringCan } from "../world_layout";

function soilEdgeMask() {
  const t = new B.DynamicTexture("soilEdgeMask", 128, scene, false);
  const c = t.getContext() as unknown as CanvasRenderingContext2D;
  c.fillStyle = "#000"; c.fillRect(0, 0, 128, 128);
  c.filter = "blur(7px)"; c.fillStyle = "#fff"; c.beginPath(); c.moveTo(18, 14);
  c.bezierCurveTo(42, 4, 60, 20, 88, 10);
  c.bezierCurveTo(118, 3, 114, 29, 108, 48);
  c.bezierCurveTo(101, 67, 125, 84, 113, 106);
  c.bezierCurveTo(103, 125, 79, 109, 59, 115);
  c.bezierCurveTo(36, 123, 9, 115, 14, 91);
  c.bezierCurveTo(19, 69, 3, 55, 11, 35);
  c.bezierCurveTo(14, 25, 9, 18, 18, 14);
  c.closePath(); c.fill(); c.filter = "none";
  t.update(); t.getAlphaFromRGB = true;
  t.wrapU = t.wrapV = B.Texture.CLAMP_ADDRESSMODE;
  return t;
}

export function patioBuild() {
  const K = HALF / 100; // escala de lo que se diseñó para el patio de 200
  // Mesa de jardín gigante: la cámara se mete abajo (roof) y la tapa se tramea si tapa el auto (occluders)
  for (const [x, z] of [[-14, -18], [14, -18], [-14, -42], [14, -42]]) occluders.push(stat(cyl(1.4, 1.4, 16, M.metal("#f1f5f9"), [x, 8, z], undefined, 10), B.PhysicsShapeType.CYLINDER));
  const top = box(34, 0.8, 30, M.matte("#f1f5f9"), [0, 16.4, -30]);
  shadows.addShadowCaster(top);
  occluders.push(top);

  // Suelo: césped + baldosas + huerta + zona de combate de chatarra
  floor("grass", "#ffffff", TEX.grassMacro);
  const leavesTex = tex("dryLeaves", () => new B.Texture("./images/decals/dry-leaves.webp", scene));
  leavesTex.hasAlpha = true;
  const leaves = pbr("dryLeaves", { color: "#ffffff", rough: 0.92, tex: leavesTex });
  leaves.useAlphaFromAlbedoTexture = true;
  leaves.useRadianceOverAlpha = leaves.useSpecularOverAlpha = false;
  leaves.transparencyMode = B.Material.MATERIAL_ALPHATESTANDBLEND;
  const leafDecals: B.Mesh[] = [];
  for (const [x, z, ry, scale] of [[-34, 25, 0.3, 0.46], [34, 25, -0.6, 0.38], [-34, -18, 1.1, 0.42], [34, -18, -1.2, 0.5], [-15, -7, 0.7, 0.35], [8, -8, -0.4, 0.4], [-23, 12, 1.3, 0.44]]) {
    const patch = decal("dryLeaves", 9 * scale, 7 * scale, x, z, leaves, 0.025);
    patch.rotation.y = ry; leafDecals.push(patch);
  }
  merge("patioLeafDecals", leafDecals, [leaves]);
  const scrapTex = tex("smallScrap", () => new B.Texture("./images/decals/small-scrap.webp", scene));
  scrapTex.hasAlpha = true;
  const scrap = pbr("smallScrap", { color: "#ffffff", rough: 0.8, tex: scrapTex });
  scrap.useAlphaFromAlbedoTexture = true;
  scrap.useRadianceOverAlpha = scrap.useSpecularOverAlpha = false;
  scrap.transparencyMode = B.Material.MATERIAL_ALPHATESTANDBLEND;
  const scrapDecals: B.Mesh[] = [];
  for (const [x, z, ry, scale] of [[-40, 30, -0.4, 0.45], [40, -23, 0.8, 0.36], [-12, -10, 0.5, 0.5], [10, -12, -0.7, 0.4]]) {
    const patch = decal("smallScrap", 4 * scale, 3 * scale, x, z, scrap, 0.03);
    patch.rotation.y = ry; scrapDecals.push(patch);
  }
  merge("patioScrapDecals", scrapDecals, [scrap]);
  decal("patio", 48, 34, 0, -30, surface(pbr("tiles", { color: "#ffffff", rough: 0.6, tex: tex("tiles", TEX.tiles) }), "concrete", 28, 0.7));

  // Huerta: tierra compactada y gravilla con bordes fundidos al césped
  const edgeMask = soilEdgeMask();
  const compactedTex = tex("compactedEarth", TEX.compactedEarth);
  compactedTex.uScale = 16.8; compactedTex.vScale = 13;
  const dirtMat = surface(
    pbr("dirt", {
      color: "#d0d8df",
      rough: 0.94,
      tex: compactedTex,
    }),
    "soil",
    24,
    0.55
  );
  const dirtGroundMat = surface(pbr("dirtGround", { color: "#d0d8df", rough: 0.94, tex: compactedTex }), "soil", 24, 0.55);
  dirtGroundMat.opacityTexture = edgeMask;
  dirtGroundMat.alphaCutOff = 0.02;
  dirtGroundMat.transparencyMode = B.Material.MATERIAL_ALPHATESTANDBLEND;
  const grassEarthTex = tex("grassEarth", TEX.grassEarth);
  grassEarthTex.uScale = 11; grassEarthTex.vScale = 9;
  const grassEarthMat = pbr("grassEarthTransition", { color: "#ffffff", rough: 0.95, tex: grassEarthTex });
  grassEarthMat.opacityTexture = edgeMask;
  grassEarthMat.alphaCutOff = 0.02;
  grassEarthMat.transparencyMode = B.Material.MATERIAL_ALPHATESTANDBLEND;
  decal("gardenSoilTransition", 50, 40, 50, 45, grassEarthMat, 0.015);
  decal("workshopGrassTransition", 22, 18, -4, -9, grassEarthMat, 0.016);
  const dirt = decal("dirt", 42, 32, 50, 45, dirtGroundMat, 0.025);
  const pathMat = surface(pbr("soilPath", { color: "#d0d8df", rough: 0.94, tex: compactedTex }), "soil", 24, 0.55);
  pathMat.opacityTexture = edgeMask;
  pathMat.alphaCutOff = 0.02;
  pathMat.transparencyMode = B.Material.MATERIAL_ALPHATESTANDBLEND;
  const paths: B.Mesh[] = [];
  const grassPaths = [
    [-33, 10, 16, 38, 2.11],
    [-1, 16, 12.5, 48, 0.87],
    [33, 38.5, 14, 38, 1.16],
    [-7, 1, 11, 37, -0.49],
  ];
  for (const [x, z, w, len, angle] of grassPaths) {
    const path = decal("soilPath", w, len, x, z, pathMat, 0.018);
    path.rotation.y = angle;
    paths.push(path);
  }
  const soilPaths = merge("soilPaths", paths, [pathMat]);
  soilPaths.metadata = { grassPaths };
  // Surcos: lomos de tierra medio enterrados (radio 1,5, asoman 0,5): hacen saltar al auto pero se suben de costado
  for (let r = 0; r < 4; r++) stat(cyl(3, 3, 40, dirtMat, [50, -1, 35 + r * 7], [0, 0, Math.PI / 2], 10), B.PhysicsShapeType.CYLINDER);
  const crops: B.Mesh[] = [];
  for (let r = 0; r < 4; r++) for (let i = 0; i < 7; i++) {
    const x = 34 + i * 5.3, z = 35 + r * 7;
    for (let k = 0; k < 4; k++) { const l = sph(1.4, M.matte("#3f8f2f"), [x + Math.cos(k * 1.6) * 0.7, 1, z + Math.sin(k * 1.6) * 0.7], [1, 0.35, 1.8], 4); l.rotation.y = k * 1.6; crops.push(l); }
  }
  shadows.addShadowCaster(merge("huerta", crops)); // 112 hojas sueltas = 112 dibujos por pasada; fusionadas, una

  // Zona de combate de chatarra: misma tierra y transición compartidas con la huerta
  const scrapMat = surface(
    pbr("scrapEarth", {
      color: "#d0d8df",
      rough: 0.94,
      tex: compactedTex,
    }),
    "soil",
    26,
    0.55
  );
  const scrapGroundMat = surface(pbr("scrapGround", { color: "#d0d8df", rough: 0.94, tex: compactedTex }), "soil", 26, 0.55);
  scrapGroundMat.opacityTexture = edgeMask;
  scrapGroundMat.alphaCutOff = 0.02;
  scrapGroundMat.transparencyMode = B.Material.MATERIAL_ALPHATESTANDBLEND;
  const soilTone = new B.DynamicTexture("soilTone", 128, scene, false);
  const tone = soilTone.getContext() as unknown as CanvasRenderingContext2D;
  tone.fillStyle = "#fff"; tone.fillRect(0, 0, 128, 128);
  for (const [x, y, r, shade] of [[24, 35, 48, 0.2], [98, 90, 55, 0.25], [85, 16, 32, 0.12]]) {
    const g = tone.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${shade})`); g.addColorStop(1, "rgba(0,0,0,0)");
    tone.fillStyle = g; tone.fillRect(0, 0, 128, 128);
  }
  soilTone.update(); soilTone.gammaSpace = false;
  soilTone.wrapU = soilTone.wrapV = B.Texture.CLAMP_ADDRESSMODE;
  soilTone.coordinatesIndex = 1;
  for (const mat of [dirtGroundMat, pathMat, scrapGroundMat]) {
    mat.lightmapTexture = soilTone; mat.useLightmapAsShadowmap = true;
  }
  decal("scrapSoilTransition", 54, 44, -48, 20, grassEarthMat, 0.015);
  const scrapZone = decal("scrapZone", 46, 36, -48, 20, scrapGroundMat, 0.025);
  // UV2 en coordenadas del patio: el tono coincide donde dos parches se superponen.
  for (const ground of [dirt, soilPaths, scrapZone]) {
    const positions = ground.getVerticesData(B.VertexBuffer.PositionKind)!;
    const uv = new Float32Array(positions.length / 3 * 2);
    const world = ground.computeWorldMatrix(true), point = new B.Vector3();
    for (let i = 0; i < positions.length / 3; i++) {
      B.Vector3.TransformCoordinatesFromFloatsToRef(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2], world, point);
      uv[i * 2] = (point.x + HALF) / (HALF * 2);
      uv[i * 2 + 1] = (point.z + HALF) / (HALF * 2);
    }
    ground.setVerticesData(B.VertexBuffer.UV2Kind, uv);
  }
  const tracksTex = tex("patioTireMarks", () => new B.Texture("./images/decals/tire-marks.webp", scene));
  tracksTex.hasAlpha = true;
  const tracks = pbr("patioTireMarks", { color: "#ffffff", rough: 0.95, tex: tracksTex });
  tracks.useAlphaFromAlbedoTexture = true;
  tracks.useRadianceOverAlpha = tracks.useSpecularOverAlpha = false;
  tracks.alpha = 0.78;
  tracks.transparencyMode = B.Material.MATERIAL_ALPHATESTANDBLEND;
  decal("patioTireMarks", 27, 27, -18, 0, tracks, 0.03).rotation.y = 0.32;
  decal("patioTireMarksFar", 23, 24, 16, 32, tracks, 0.03).rotation.y = 0.72;
  decal("scrapZoneTireMarks", 21, 22, -48, 20, tracks, 0.03).rotation.y = 2.1;
  decal("workshopTireMarks", 15, 18, -5, -7, tracks, 0.035).rotation.y = -0.45;
  bare.push({ x: -48, z: 20, r: 23 });
  // Berm/lomo de tierra y escombros en el flanco norte de la zona
  stat(cyl(2.8, 2.8, 22, scrapMat, [-48, -0.9, 34], [0, 0, Math.PI / 2], 10), B.PhysicsShapeType.CYLINDER);
  // Rampa de chapa oxidada para saltos acrobáticos dentro de la zona
  ramp(FOLDED_SLICE ? FOLD.rust() : M.metal("#7a5038"), -48, 8, 0, 4.2, 6.5, 1.6);
  // Neumáticos de descarte apilados en el borde oeste con textura PBR y normales
  registerHeavyProp(stat(tor(2.8, 0.95, tireStackM(), [-63, 0.95, 26], [Math.PI / 2, 0.4, 0], 14), B.PhysicsShapeType.CONVEX_HULL, { friction: 0.6 }), "tire");
  registerHeavyProp(stat(tor(2.6, 0.9, tireStackM(), [-63, 2.7, 26], [Math.PI / 2, -0.25, 0], 14), B.PhysicsShapeType.CONVEX_HULL, { friction: 0.6 }), "tire");
  // Tambores metálicos de combustible oxidados (PBR con relieve y desgaste)
  const capMat = surface(pbr("drumCap", { color: "#765f4c", rough: 0.84, metal: 0.3 }), "steel", 4, 0.45);
  const capTpl = template("drumCap", () => [cyl(3.18, 3.18, 0.025, capMat, [0, 0, 0], undefined, 16)]);
  for (const [x, z] of [[-42, 30], [-45.5, 32]]) {
    const drum = registerHeavyProp(stat(cyl(3.2, 3.2, 4.8, rustyDrumM(), [x, 2.4, z], undefined, 16), B.PhysicsShapeType.CYLINDER, { friction: 0.6 }), "drum");
    const cap = capTpl.createInstance("drumCap");
    cap.parent = drum; cap.position.set(0, 2.4, 0); cap.isPickable = false; cap.receiveShadows = true;
  }
  // Cajas industriales de madera con textura PBR y normales en el borde este
  const scrapCrate = woodCrateM();
  crateFold(stat(box(2.6, 2.4, 2.6, scrapCrate, [-33, 1.2, 24], [0, 0.35, 0]), B.PhysicsShapeType.BOX, { friction: 0.5 }), 2.6, 2.4, 2.6);
  crateFold(stat(box(2.2, 2.0, 2.2, scrapCrate, [-34, 1.0, 28], [0, -0.2, 0]), B.PhysicsShapeType.BOX, { friction: 0.5 }), 2.2, 2.0, 2.2);
  // Plancha de chapa oxidada en el suelo
  const scrapPlate = FOLDED_SLICE ? FOLD.rust() : M.metal("#6a5a4e");
  stat(box(4.5, 0.18, 5.5, scrapPlate, [-54, 0.09, 14], [0.03, 0.5, 0]), B.PhysicsShapeType.BOX, { friction: 0.65 });

  // Cerca de madera (instancias)
  const plank = plankTpl();
  for (let i = -HALF; i < HALF; i += 2.1) for (const [x, z, ry] of [[i, HALF, 0], [i, -HALF, 0], [HALF, i, Math.PI / 2], [-HALF, i, Math.PI / 2]] as const) {
    const p = plank.createInstance("pl");
    p.position.set(x, 0, z);
    p.rotation.y = ry;
    p.scaling.y = 0.9 + rng() * 0.2;
  }
  house();
  bushes();
  for (const [x, z] of [[-75, -70], [78, -60], [-80, 70], [70, 85]]) tree(x * K, z * K);
}


// Arbustos a lo largo de la cerca: un solo mesh con thin instances, sin física (la cerca ya frena al auto)
function bushes() {
  const g = leafM("#4f9a3c"), g2 = leafM("#3f8a34"), fl = M.plastic("#ff8fb8");
  const base = merge("bush", [sph(5, g, [0, 2.2, 0], [1.3, 0.9, 1.1], 6), sph(4, g2, [2.4, 1.8, 0.8], undefined, 6), sph(3.6, g, [-2.4, 1.6, -0.6], undefined, 6), sph(1.1, fl, [1.5, 3.6, 1.8], undefined, 4), sph(1.1, fl, [-1.8, 3.2, 1.6], undefined, 4)]);
  base.isPickable = false;
  const mats: number[] = [];
  const m = new B.Matrix(), sc = new B.Vector3(), p = new B.Vector3(), q = new B.Quaternion();
  // Matas agrupadas contra la cerca (2-5 arbustos por grupo, de mayor a menor) con tramos de cerca desnuda entre grupos: menos fila uniforme
  for (let i = -HALF + 12; i < HALF - 12; i += 34 + rng() * 26) for (const [ax, az, tx, tz] of [[i, HALF - 5, 1, 0], [i, -HALF + 5, 1, 0], [HALF - 5, i, 0, 1], [-HALF + 5, i, 0, 1]] as const) {
    if (rng() < 0.3) continue;
    const n = int(2, 5);
    for (let j = 0; j < n; j++) {
      const k = (1.5 - j * 0.22) * (0.8 + rng() * 0.35), off = (j - (n - 1) / 2) * 7 + (rng() - 0.5) * 3, inn = j % 2 ? 4 : 0; // el grande al centro-atrás, los chicos adelante
      const x = ax + tx * off - Math.sign(ax) * (1 - tx) * inn, z = az + tz * off - Math.sign(az) * (1 - tz) * inn;
      sc.set(k, k * (0.8 + rng() * 0.4), k); p.set(x, 0, z);
      B.Quaternion.RotationYawPitchRollToRef(rng() * 6.3, 0, 0, q);
      B.Matrix.ComposeToRef(sc, q, p, m);
      mats.push(...m.toArray());
    }
  }
  base.thinInstanceSetBuffer("matrix", new Float32Array(mats), 16, true); base.alwaysSelectAsActiveMesh = true;
  base.receiveShadows = true;
}

export function patioLayout() {
  const K = HALF / 100;
  // Pileta inflable: en una de varias esquinas del patio
  const [px, pz] = [[-48, 38], [55, -20], [-50, -55], [-60, 5]][int(0, 3)].map((v) => v * K);
  const pool = merge("pool", [
    tor(26, 3.4, M.plastic("#38bdf8"), [0, 1.7, 0], undefined, 32),
    tor(26, 3.4, M.plastic("#f8fafc"), [0, 4.6, 0], undefined, 32),
    water(),
  ]);
  pool.position.set(px, 0, pz);
  stat(pool, B.PhysicsShapeType.MESH);
  bare.push({ x: px, z: pz, r: 16 });

  // TRAMO: puente angosto de tablones sobre la pileta. Caerse = al agua: piso invisible a 3 m y dos tablas de natación para salir.
  const bry = rng() * Math.PI;
  plankBridge(px, pz, bry);
  stat(cyl(23, 23, 3, M.matte("#4fb3e8"), [px, 1.5, pz], undefined, 16), B.PhysicsShapeType.CYLINDER).isVisible = false;
  for (const s of [-1, 1]) { const ry = bry + (s * Math.PI) / 2; ramp(M.plastic("#facc15"), px + Math.sin(ry) * 4, pz + Math.cos(ry) * 4, ry, 3, 7.3, 3.8, 0, 0, 3); }

  toyRamps(1, [1]); // pista curva + trampolín en cada partida
  toyRamps(int(3, 5), [0, 2, 3]);
  jumpScrap(int(2, 4));
  if (rng() < 0.75) planterAlley();
  if (rng() < 0.75) toyScatter();
  pots(int(5, 10));
  rocks(int(10, 26));
  gnomes(int(1, 3));
  hose();
  wateringCan();
  piles(int(1, 3), ["#ef4444", "#3b82f6", "#facc15", "#22c55e", "#a855f7"], M.plastic);
  brickWalls(int(1, 2));
  puddles(int(3, 10), pbr("puddle", { color: "#3b4a52", rough: 0.03, metal: 0.2, alpha: 0.85 }));
  ball();
}

function water() {
  const w = B.MeshBuilder.CreateDisc("w", { radius: 12, tessellation: 32 }, scene);
  w.rotation.x = Math.PI / 2;
  w.position.y = 3.2;
  w.material = pbr("water", { color: "#4fb3e8", rough: 0.02, alpha: 0.8 });
  return w;
}

