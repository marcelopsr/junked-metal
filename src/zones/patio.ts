import * as B from "@babylonjs/core";
import { box, cyl, merge, rbox, sph, template, tor } from "../models";
import { M, pbr, shadows, surface, TEX } from "../render";
import { rng } from "../rng";
import { HALF, bare, crateFold, decal, floor, leafM, lowQ, occluders, plankTpl, registerHeavyProp, scene, stat, tex } from "./common";
import { toyHouse, toyTree } from "../models/props_rc";
import { ball, brickWalls, gnomes, hose, int, jumpScrap, piles, plankBridge, planterAlley, pots, puddles, ramp, rocks, toyRamps, toyScatter, wateringCan } from "../world_layout";

// Texturas de tierra únicas (los materiales pbr() se cachean por clave y conservan la primera): rearmar la zona las reusa en vez de crear otras sin liberar.
let edgeMaskT: B.DynamicTexture | undefined, dirtT: ReturnType<typeof dirtTextures> | undefined, soilToneT: B.DynamicTexture | undefined;
const soilEdgeMask = () => (edgeMaskT ??= makeEdgeMask());
function makeEdgeMask() {
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


// ---------- Texturas del piso (láminas ref-rcrace: tierra cálida con piedritas, surcos y grumos; pasto en manchas de varios tonos) ----------
// Generador local con semilla fija: el piso no cambia entre cargas ni toca rng() del layout.
function lcg(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
/** Ruido de valor tileable, varias octavas, 0..1 */
function fbm(n: number, oct: number, r: () => number, f0 = 4) {
  const out = new Float32Array(n * n); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const g = f0 << o, grid = Float32Array.from({ length: g * g }, r);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const fx = x / n * g, fy = y / n * g, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), a = (i: number, j: number) => grid[(j % g) * g + (i % g)];
      out[y * n + x] += amp * (a(x0, y0) * (1 - sx) * (1 - sy) + a(x0 + 1, y0) * sx * (1 - sy) + a(x0, y0 + 1) * (1 - sx) * sy + a(x0 + 1, y0 + 1) * sx * sy);
    }
    tot += amp; amp *= 0.55;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}
const hex = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lerpC = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
function rampC(stops: [number, string][], t: number) {
  for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) return lerpC(hex(stops[i - 1][1]), hex(stops[i][1]), (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
  return hex(stops[stops.length - 1][1]);
}
function makeTex(name: string, n: number, fill: (px: Uint8ClampedArray) => void, repeat = 1) {
  const t = new B.DynamicTexture(name, n, scene, true, B.Texture.TRILINEAR_SAMPLINGMODE);
  const c = t.getContext() as unknown as CanvasRenderingContext2D, im = c.createImageData(n, n);
  fill(im.data); c.putImageData(im, 0, 0); t.update();
  t.wrapU = t.wrapV = B.Texture.WRAP_ADDRESSMODE; t.uScale = t.vScale = repeat;
  return t;
}
/** Tierra cálida: albedo + normal map (piedritas con luz arriba-izquierda y sombra abajo-derecha, grumos, surcos). */
function dirtTextures(n = 512) {
  const r = lcg(4242), h = fbm(n, 3, r, 8), grit = fbm(n, 2, r, 24), idx = (x: number, y: number) => ((y + n) % n) * n + ((x + n) % n);
  // piedritas: domos
  const stone = new Float32Array(n * n);
  for (let i = 0; i < 700; i++) {
    const big = i < 90, px = r() * n, py = r() * n, rad = big ? 4 + r() * 6 : 1 + r() * r() * 2.5, lift = big ? 0.55 + r() * 0.45 : 0.25 + r() * 0.3;
    for (let dy = -rad - 1; dy <= rad + 1; dy++) for (let dx = -rad - 1; dx <= rad + 1; dx++) {
      const d = Math.hypot(dx, dy) / rad; if (d >= 1) continue;
      const k = idx(Math.round(px + dx), Math.round(py + dy)); stone[k] = Math.max(stone[k], lift * Math.sqrt(1 - d * d));
    }
  }
  const H = new Float32Array(n * n);
  for (let i = 0; i < H.length; i++) H[i] = h[i] * 0.8 + grit[i] * 0.2 + stone[i] * 1.1;
  const pal: [number, string][] = [[0, "#5a2e18"], [0.25, "#8a4a2a"], [0.5, "#B5603A"], [0.75, "#D98A55"], [1, "#F0B57A"]]; // ref23: tierra rojiza clara al sol (con #24140B de base no había luces en cuadro)
  const sx = 1.5, lx = -0.55, ly = -0.55; // luz desde arriba-izquierda
  const alb = makeTex("patioDirt", n, px => {
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, gx = (H[idx(x + 1, y)] - H[idx(x - 1, y)]) * sx, gy = (H[idx(x, y + 1)] - H[idx(x, y - 1)]) * sx;
      const lit = -(gx * lx + gy * ly); // >0 mira a la luz
      let t = Math.min(1, Math.max(0, (h[i] - 0.15) * 1.4 + stone[i] * 0.4 + lit * 0.7));
      t = t * t * 0.4 + t * 0.6;
      const col = rampC(pal, t), sh = 1 + lit * 0.6 - (stone[i] > 0 ? 0 : 0) , o = i * 4;
      px[o] = Math.max(0, col[0] * sh); px[o + 1] = Math.max(0, col[1] * sh); px[o + 2] = Math.max(0, col[2] * sh); px[o + 3] = 255;
    }
  });
  const nrm = makeTex("patioDirtN", n, px => {
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const gx = (H[idx(x + 1, y)] - H[idx(x - 1, y)]) * 0.8, gy = (H[idx(x, y + 1)] - H[idx(x, y - 1)]) * 0.8, l = Math.hypot(gx, gy, 1), o = (y * n + x) * 4;
      px[o] = 128 + (-gx / l) * 127; px[o + 1] = 128 + (gy / l) * 127; px[o + 2] = 128 + (1 / l) * 127; px[o + 3] = 255;
    }
  });
  alb.anisotropicFilteringLevel = nrm.anisotropicFilteringLevel = 8;
  return { alb, nrm };
}
/** Pasto: manchas grandes de verdes cálidos y amarillentos + matas y briznas de varios tonos. */
function grassTexture(n = 1024) {
  const r = lcg(777), m = fbm(256, 4, r, 3), m2 = fbm(256, 3, r, 8);
  const pal: [number, string][] = [[0, "#2f5f1f"], [0.3, "#4E8A2E"], [0.6, "#66BB6A"], [0.82, "#8fae45"], [1, "#b2a94c"]];
  const small = document.createElement("canvas"); small.width = small.height = 256;
  const sc = small.getContext("2d")!, im = sc.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) {
    const t = Math.min(1, Math.max(0, (m[i] - 0.3) * 2.3 + (m2[i] - 0.5) * 0.5)), col = rampC(pal, t), o = i * 4;
    im.data[o] = col[0] * 0.4; im.data[o + 1] = col[1] * 0.4; im.data[o + 2] = col[2] * 0.38; im.data[o + 3] = 255; // oscuro: el camino claro destaca (contraste de composición, ref23)
  }
  sc.putImageData(im, 0, 0);
  const big = document.createElement("canvas"); big.width = big.height = n;
  const c = big.getContext("2d")!; c.imageSmoothingEnabled = true; c.drawImage(small, 0, 0, n, n);
  const cols = ["#1f4014", "#2d5a1c", "#3a6e25", "#4E8A2E", "#5f9a38", "#7fae3c", "#a3a847"];
  c.lineCap = "round";
  for (let i = 0; i < 26000; i++) {
    const x = 6 + r() * (n - 12), y = 6 + r() * (n - 12), l = 4 + r() * 9, a = -Math.PI / 2 + (r() - 0.5) * 1.2;
    c.strokeStyle = cols[(r() * cols.length) | 0]; c.globalAlpha = 0.35 + r() * 0.5; c.lineWidth = 1 + r() * 1.4;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
  }
  for (let i = 0; i < 2500; i++) { // sombras de mata: oscuro abajo, luz arriba
    const x = r() * n, y = r() * n, rad = 2 + r() * 4;
    c.globalAlpha = 0.3; c.fillStyle = "#1c3a12"; c.beginPath(); c.arc(x + 1.5, y + 2, rad, 0, 7); c.fill();
    c.globalAlpha = 0.4; c.fillStyle = cols[3 + ((r() * 4) | 0)]; c.beginPath(); c.arc(x, y, rad * 0.7, 0, 7); c.fill();
  }
  c.globalAlpha = 1;
  return makeTex("patioGrass", n, px => px.set(c.getImageData(0, 0, n, n).data));
}

export function patioBuild() {
  const K = HALF / 100; // escala de lo que se diseñó para el patio de 200
  // Mesa de jardín gigante: la cámara se mete abajo (roof) y la tapa se tramea si tapa el auto (occluders)
  for (const [x, z] of [[-14, -18], [14, -18], [-14, -42], [14, -42]]) occluders.push(stat(cyl(1.4, 1.4, 16, M.metal("#f1f5f9"), [x, 8, z], undefined, 10), B.PhysicsShapeType.CYLINDER));
  const top = box(34, 0.8, 30, M.matte("#f1f5f9"), [0, 16.4, -30]);
  shadows.addShadowCaster(top);
  occluders.push(top);

  // Suelo: césped + baldosas + huerta + zona de combate de chatarra
  floor("grass", "#ffffff", () => grassTexture(), 0.95, "grass", 45);
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
  decal("patio", 48, 34, 0, -30, surface(pbr("tiles", { color: "#ffffff", rough: 0.6, tex: tex("tiles", TEX.tiles) }), "concrete", 28, 0.7));

  // Huerta: tierra compactada y gravilla con bordes fundidos al césped
  const edgeMask = soilEdgeMask();
  const dirtT_ = (dirtT ??= dirtTextures()), compactedTex = dirtT_.alb;
  compactedTex.uScale = 5; compactedTex.vScale = 4;
  dirtT_.nrm.uScale = 5; dirtT_.nrm.vScale = 4;
  const dirtMat = surface(
    pbr("dirt", {
      color: "#ffffff",
      rough: 0.94,
      tex: compactedTex,
    }),
    "soil",
    24,
    0.2
  );
  const dirtGroundMat = surface(pbr("dirtGround", { color: "#ffffff", rough: 0.94, tex: compactedTex }), "soil", 24, 0.15);
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
  const pathMat = surface(pbr("soilPath", { color: "#ffffff", rough: 0.94, tex: compactedTex }), "soil", 24, 0.15);
  pathMat.albedoColor = B.Color3.FromHexString("#FFF0E6").scale(1.5); // el rojizo de ref23 ya está en la paleta de dirtTextures; un tinte oscuro acá mataba las luces
  pathMat.opacityTexture = edgeMask;
  pathMat.alphaCutOff = 0.02;
  pathMat.transparencyMode = B.Material.MATERIAL_ALPHATESTANDBLEND;
  const paths: B.Mesh[] = [];
  // Ancho visual x2,1 (cinta de tierra dominante, ref23); el trazado y los colisionadores no cambian. world_layout recorta el pasto 3D con estos mismos anchos.
  const grassPaths = [
    [-33, 10, 16, 38, 2.11],
    [-1, 16, 12.5, 48, 0.87],
    [33, 38.5, 14, 38, 1.16],
    [-7, 1, 11, 37, -0.49],
  ].map(([x, z, w, len, a]) => [x, z, w * 2.1, len, a]);
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
      color: "#ffffff",
      rough: 0.94,
      tex: compactedTex,
    }),
    "soil",
    26,
    0.2
  );
  const scrapGroundMat = surface(pbr("scrapGround", { color: "#ffffff", rough: 0.94, tex: compactedTex }), "soil", 26, 0.15);
  scrapGroundMat.opacityTexture = edgeMask;
  scrapGroundMat.alphaCutOff = 0.02;
  scrapGroundMat.transparencyMode = B.Material.MATERIAL_ALPHATESTANDBLEND;
  const soilTone = (soilToneT ??= (() => {
    const t = new B.DynamicTexture("soilTone", 128, scene, false), tone = t.getContext() as unknown as CanvasRenderingContext2D;
    tone.fillStyle = "#fff"; tone.fillRect(0, 0, 128, 128);
    for (const [x, y, r, shade] of [[24, 35, 48, 0.1], [98, 90, 55, 0.12], [85, 16, 32, 0.06]]) {
      const g = tone.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(0,0,0,${shade})`); g.addColorStop(1, "rgba(0,0,0,0)");
      tone.fillStyle = g; tone.fillRect(0, 0, 128, 128);
    }
    t.update(); t.gammaSpace = false;
    t.wrapU = t.wrapV = B.Texture.CLAMP_ADDRESSMODE;
    t.coordinatesIndex = 1;
    return t;
  })());
  for (const mat of [dirtGroundMat, pathMat, scrapGroundMat]) {
    mat.bumpTexture = dirtT_.nrm; mat.bumpTexture.level = 0.8;
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
  decal("patioTireMarks", 14, 25, -12, 7, tracks, 0.03).rotation.y = 0.87;
  decal("patioTireMarksFar", 15, 23, 25, 35, tracks, 0.03).rotation.y = 1.16;
  decal("scrapZoneTireMarks", 21, 22, -48, 20, tracks, 0.03).rotation.y = 2.1;
  decal("workshopTireMarks", 12, 18, -4, -5, tracks, 0.035).rotation.y = -0.49;
  bare.push({ x: -48, z: 20, r: 23 });
  // Berm/lomo de tierra y escombros en el flanco norte de la zona
  stat(cyl(2.8, 2.8, 22, scrapMat, [-48, -0.9, 34], [0, 0, Math.PI / 2], 10), B.PhysicsShapeType.CYLINDER);
  // Props de juguete: plástico pintado con la paleta oficial (docs/ART_DIRECTION.md Vigente), bordes biselados
  const toy = (c: string, rough = 0.5) => pbr(`toy${c}`, { color: c, rough, metal: 0 });
  // Rampa naranja para saltos acrobáticos dentro de la zona
  ramp(toy("#FB8C00"), -48, 8, 0, 4.2, 6.5, 1.6, 0, 3); // baja en vez de cortar en seco: el corte vertical de 1,6 m trababa al auto (sim)
  // Neumáticos de juguete apilados en el borde oeste (azul y amarillo)
  registerHeavyProp(stat(tor(2.8, 0.95, toy("#42A5F5"), [-63, 0.95, 26], [Math.PI / 2, 0.4, 0], 14), B.PhysicsShapeType.CONVEX_HULL, { friction: 0.6 }), "tire");
  registerHeavyProp(stat(tor(2.6, 0.9, toy("#FBC02D"), [-63, 2.7, 26], [Math.PI / 2, -0.25, 0], 14), B.PhysicsShapeType.CONVEX_HULL, { friction: 0.6 }), "tire");
  // Tambores de juguete: rojo con tapa y aro amarillos
  const capMat = toy("#FBC02D"), trimMat = toy("#E53935", 0.4);
  const capTpl = template("drumCap", () => [
    cyl(3.18, 3.18, 0.025, capMat, [0, 0, 0], undefined, 16),
    tor(3.08, 0.055, trimMat, [0, 0.025, 0], undefined, 16),
    cyl(0.24, 0.24, 0.08, trimMat, [0.55, 0.05, -0.3], undefined, 8),
  ]);
  for (const [x, z] of [[-41, 27.5], [-45.5, 32]]) { // (-42, 30) dejaba ~1 m contra el lomo (-48, 34): el auto (1,6 m) se encajaba (sim 2026-10-14)
    const drum = registerHeavyProp(stat(cyl(3.2, 3.2, 4.8, toy("#E53935"), [x, 2.4, z], undefined, 16), B.PhysicsShapeType.CYLINDER, { friction: 0.6 }), "drum");
    const cap = capTpl.createInstance("drumCap");
    cap.parent = drum; cap.position.set(0, 2.4, 0); cap.isPickable = false; cap.receiveShadows = true;
  }
  // Cajas de juguete biseladas (verde y amarilla)
  crateFold(stat(rbox(2.6, 2.4, 2.6, 0.3, toy("#66BB6A"), [-33, 1.2, 24], [0, 0.35, 0]), B.PhysicsShapeType.BOX, { friction: 0.5 }), 2.6, 2.4, 2.6);
  crateFold(stat(rbox(2.2, 2.0, 2.2, 0.3, toy("#FBC02D"), [-34, 1.0, 28], [0, -0.2, 0]), B.PhysicsShapeType.BOX, { friction: 0.5 }), 2.2, 2.0, 2.2);
  // Plancha marrón en el suelo
  stat(rbox(4.5, 0.18, 5.5, 0.08, toy("#795548"), [-54, 0.09, 14], [0.03, 0.5, 0]), B.PhysicsShapeType.BOX, { friction: 0.65 });

  toyFencesCurbsPines(toy, grassPaths);

  // Cerca de madera (instancias)
  const plank = plankTpl();
  for (let i = -HALF; i < HALF; i += 2.1) for (const [x, z, ry] of [[i, HALF, 0], [i, -HALF, 0], [HALF, i, Math.PI / 2], [-HALF, i, Math.PI / 2]] as const) {
    const p = plank.createInstance("pl");
    p.position.set(x, 0, z);
    p.rotation.y = ry;
    p.scaling.y = 0.9 + rng() * 0.2;
  }
  toyHouse();
  bushes();
  for (const [x, z] of [[-75, -70], [78, -60], [-80, 70], [70, 85]]) toyTree(x * K, z * K);
}


/** Diorama de barrio: valla de postes de colores, bordillos rojo/blanco en los caminos y la baldosa, y pinos de juguete fuera de la cerca (paliativo de bosque). Solo visual, sin rng() ni colisiones. */
function toyFencesCurbsPines(toy: (c: string, rough?: number) => B.Material, grassPaths: number[][]) {
  const mat = (x: number, y: number, z: number, ry: number, sx: number, sy: number) => B.Matrix.Compose(new B.Vector3(sx, sy, sx), B.Quaternion.RotationYawPitchRoll(ry, 0, 0), new B.Vector3(x, y, z)).toArray();
  const instances = (m: B.Mesh, mats: number[]) => { m.isPickable = false; m.thinInstanceSetBuffer("matrix", new Float32Array(mats), 16, true); m.alwaysSelectAsActiveMesh = true; m.receiveShadows = true; };

  // Valla: un poste base por color con thin instances (unos 800 postes = 5 dibujos) y travesaños blancos
  const L = HALF - 2.5, colors = ["#E53935", "#FBC02D", "#42A5F5", "#66BB6A", "#FAFAFA"];
  const posts = colors.map((c) => ({ m: rbox(1, 3.4, 0.45, 0.12, toy(c), [0, 1.7, 0]), mats: [] as number[] }));
  let n = 0;
  for (let i = -L; i <= L; i += 1.6, n++) for (const [x, z, ry] of [[i, L, 0], [i, -L, 0], [L, i, Math.PI / 2], [-L, i, Math.PI / 2]] as const) posts[n % 5].mats.push(...mat(x, 0, z, ry, 1, 0.85 + ((n * 7) % 5) * 0.06));
  for (const p of posts) instances(p.m, p.mats);
  const rail = toy("#FAFAFA", 0.5);
  merge("patioRails", [-1, 1].flatMap((s) => [1.1, 2.5].flatMap((y) => [box(L * 2 + 1.6, 0.3, 0.3, rail, [0, y, s * (L + 0.3)]), box(0.3, 0.3, L * 2 + 1.6, rail, [s * (L + 0.3), y, 0])]))).isPickable = false;

  // Bordillos rojo/blanco: a los dos lados de cada camino de tierra y alrededor de la baldosa del taller
  const red: B.Mesh[] = [], white: B.Mesh[] = [];
  let k = 0;
  const block = (x: number, z: number, ry: number) => { const odd = k++ % 2; (odd ? white : red).push(rbox(1.6, 0.45, 0.6, 0.14, toy(odd ? "#FAFAFA" : "#E53935", 0.45), [x, 0.225, z], [0, ry, 0])); };
  for (const [x, z, w, len, ang] of grassPaths) {
    const c = Math.cos(ang), s = Math.sin(ang);
    for (const sx of [-1, 1]) for (let lz = -len * 0.4; lz <= len * 0.4; lz += 1.7) { const lx = sx * w * 0.42; block(x + lx * c + lz * s, z - lx * s + lz * c, ang - Math.PI / 2); }
  }
  for (let t = -22; t <= 22; t += 1.7) { block(t, -30 + 17.2, 0); block(t, -30 - 17.2, 0); }
  for (let t = -14; t <= 14; t += 1.7) { block(24.5, -30 + t, Math.PI / 2); block(-24.5, -30 + t, Math.PI / 2); }
  for (const [name, arr] of [["curbRed", red], ["curbWhite", white]] as const) { const m = merge(name, arr); m.isPickable = false; m.receiveShadows = true; shadows.addShadowCaster(m); }

  // Pinos de juguete (tres conos verdes sobre tronco marrón) en tres filas fuera de la cerca: lado norte y flancos, no del lado de la casa
  const pine = merge("toyPine", [
    cyl(1.6, 2, 5, toy("#795548", 0.8), [0, 2.5, 0], undefined, 8),
    cyl(0.4, 11, 8, toy("#66BB6A", 0.6), [0, 8, 0], undefined, 8), cyl(0.4, 8.6, 7, toy("#4CAF50", 0.6), [0, 13, 0], undefined, 8), cyl(0.2, 6, 6, toy("#66BB6A", 0.6), [0, 18, 0], undefined, 8),
  ]);
  const pm: number[] = [];
  for (let r = 0; r < 3; r++) for (let i = -HALF - 40, q = 0; i <= HALF + 40; i += 15 - r * 2, q++) {
    const j = Math.sin(i * 12.9 + r * 78.2) * 4.5, d = HALF + 14 + r * 22 + j, sc = 1.1 + ((q * 13 + r * 5) % 9) * 0.09, ry = (q * 7) % 6.28;
    pm.push(...mat(i, 0, -d, ry, sc, sc));
    if (i < HALF + 5) pm.push(...mat(d, 0, i, ry, sc, sc), ...mat(-d, 0, i, ry, sc, sc));
  }
  instances(pine, pm);
  piedritasYMatas(toy, grassPaths, instances);
  sombrasYTierra(toy, grassPaths, instances);
}

/** Contraste de composición (ref23): neumáticos oscuros tirados fuera de los bordillos (proyectan sombra larga, sin colisión, bajos) y manchas de tierra apisonada oscura sobre el pasto. Semilla fija propia. */
function sombrasYTierra(toy: (c: string, rough?: number) => B.Material, grassPaths: number[][], instances: (m: B.Mesh, mats: number[]) => void) {
  const r = lcg(9091), q = new B.Quaternion(), P = new B.Vector3(), S = new B.Vector3();
  const tire = merge("darkTire", [tor(1.05, 0.5, toy("#15171a", 0.85), [0, 0.5, 0], undefined, 10), cyl(0.5, 0.5, 0.5, toy("#3a3d42", 0.6), [0, 0.35, 0], undefined, 8)]);
  const tm: number[] = [];
  for (const [x, z, w, len, ang] of grassPaths) {
    const c = Math.cos(ang), s = Math.sin(ang);
    for (const sx of [-1, 1]) for (let lz = -len * 0.42; lz <= len * 0.42; lz += 3) {
      const lx = sx * (w * 0.42 + 2.2 + r() * 1.6 + (lz % 6 < 3 ? 0 : 3.5)), jz = lz + (r() - 0.5) * 2, px = x + lx * c + jz * s, pz = z - lx * s + jz * c;
      if (Math.hypot(px, pz) < 5 || Math.hypot(px, pz) > 60 || (lowQ && r() < 0.5) || r() < 0.15) continue; // fuera de 60 m no se ve desde la cámara de partida
      B.Quaternion.RotationYawPitchRollToRef(r() * 6.3, 0, 0, q);
      const k = 0.8 + r() * 0.5; // algunos apilados de a dos (más alto = sombra más larga)
      tm.push(...B.Matrix.Compose(S.set(k, k, k), q, P.set(px, 0, pz)).toArray());
      if (r() < 0.45) tm.push(...B.Matrix.Compose(S.set(k * 0.9, k, k * 0.9), q, P.set(px, 0.9 * k, pz)).toArray());
    }
  }
  instances(tire, tm); shadows.addShadowCaster(tire);
  // Manchas de tierra oscura en el pasto: mismo borde fundido que la tierra del patio
  const mask = soilEdgeMask(), mat = pbr("darkSoilPatch", { color: "#2a170c", rough: 1 });
  mat.opacityTexture = mask; mat.alphaCutOff = 0.02; mat.transparencyMode = B.Material.MATERIAL_ALPHATESTANDBLEND;
  const inPath = (x: number, z: number) => grassPaths.some(([cx, cz, w, len, a]) => { const dx = x - cx, dz = z - cz; return Math.abs(dx * Math.cos(a) - dz * Math.sin(a)) < w * 0.5 + 3 && Math.abs(dx * Math.sin(a) + dz * Math.cos(a)) < len * 0.5 + 3; });
  const patches: B.Mesh[] = [];
  for (let i = 0, n = 0; i < 400 && n < 26; i++) {
    const x = (r() * 2 - 1) * 55, z = -12 + r() * 62, w = 5 + r() * 8;
    if (inPath(x, z) || Math.hypot(x, z) < 6 || Math.abs(x - 50) < 24 && Math.abs(z - 45) < 20 || Math.abs(x + 48) < 25 && Math.abs(z - 20) < 21) continue;
    n++; const d = decal("darkSoil", w, w * (0.6 + r() * 0.5), x, z, mat, 0.022); d.rotation.y = r() * 6.3; patches.push(d);
  }
  merge("darkSoilPatches", patches, [mat]).isPickable = false;
}

/** Piedritas angulosas sobre los caminos de tierra y matas con flores pegadas por fuera de los bordillos (ref9/ref14). Generador propio con semilla fija, sin colisiones. */
function piedritasYMatas(toy: (c: string, rough?: number) => B.Material, grassPaths: number[][], instances: (m: B.Mesh, mats: number[]) => void) {
  const r = lcg(4711), q = new B.Quaternion(), P = new B.Vector3(), S = new B.Vector3();
  const put = (a: number[], x: number, y: number, z: number, yaw: number, sx: number, sy: number, sz: number, tilt = 0) => {
    B.Quaternion.RotationYawPitchRollToRef(yaw, tilt, 0, q);
    a.push(...B.Matrix.Compose(S.set(sx, sy, sz), q, P.set(x, y, z)).toArray());
  };
  const ok = (x: number, z: number) => Math.hypot(x, z) > 6;
  // Puntos a lo largo de un camino: lx transversal (en múltiplos del semiancho w/2), lz longitudinal
  const onPath = (f: (x: number, z: number) => void, lxRange: (w: number) => number) => {
    const [x, z, w, len, ang] = grassPaths[Math.floor(r() * grassPaths.length)], c = Math.cos(ang), s = Math.sin(ang);
    const lx = lxRange(w), lz = (r() - 0.5) * len * 0.8;
    f(x + lx * c + lz * s, z - lx * s + lz * c);
  };
  // Piedritas: 3 colores = 3 mallas (3 dibujos), poliedro de 4 segmentos achatado
  const rocks = ["#B08A68", "#6E4A33", "#C9A27A"].map((c) => ({ m: sph(1, toy(c, 0.95), [0, 0, 0], [1, 0.6, 1], 4), mats: [] as number[] }));
  for (let i = 0; i < 700; i++) onPath((x, z) => {
    if (!ok(x, z) || (lowQ && i & 1)) return; // lowQ: mitad de piedritas (decorado sin colisión)
    const d = 0.14 + Math.pow(r(), 1.2) * 0.4, ar = 0.7 + r() * 0.7; // más chicas que grandes
    put(rocks[Math.floor(r() * 3)].mats, x, d * 0.2, z, r() * 6.3, d * ar, d * (0.6 + r() * 0.5), d / ar, (r() - 0.5) * 0.6);
  }, (w) => (r() - 0.5) * w * 1.15);
  for (const k of rocks) instances(k.m, k.mats);

  // Matas: 4 hojas cónicas aplastadas + flores (amarilla, blanca con centro amarillo) por fuera de los bordillos (lx = ±0.42w, bordillo 0,5 de ancho)
  const gr = ["#4E8A2E", "#66BB6A"].map((c) => toy(c, 0.7));
  const tuft = merge("tuft", [0, 1, 2, 3].map((j) => cyl(0.3, 0.02, 0.36, gr[j % 2], [Math.cos(j * 1.6) * 0.12, 0.2, Math.sin(j * 1.6) * 0.12], [Math.sin(j * 1.6) * 0.5, 0, -Math.cos(j * 1.6) * 0.5], 4)));
  const disc = (c: string, d: number, y: number) => cyl(d, d, 0.04, toy(c, 0.5), [0, y, 0], undefined, 8);
  const flY = merge("flowerY", [disc("#FBC02D", 0.34, 0.5)]), flW = merge("flowerW", [disc("#FAFAFA", 0.4, 0.5), disc("#FBC02D", 0.16, 0.53)]);
  const tm: number[] = [], fy: number[] = [], fw: number[] = [];
  for (let i = 0; i < 300; i++) onPath((x, z) => {
    if (!ok(x, z) || (lowQ && i & 1)) return; // lowQ: mitad de matas y flores
    const k = 0.9 + r() * 0.9;
    put(tm, x, 0, z, r() * 6.3, k, 0.8 + r() * 0.7, k);
    if (r() < 0.4) put(r() < 0.5 ? fy : fw, x + (r() - 0.5) * 0.2, 0, z + (r() - 0.5) * 0.2, r() * 6.3, 1, 1, 1);
  }, (w) => (r() < 0.5 ? -1 : 1) * (w * 0.42 + 0.25 + 0.3 + r() * 0.9));
  // Islas de pasto entre caminos: matas grandes con flores en el interior (fuera de caminos, baldosa, huerta, chatarra y esquinas de pileta)
  const inPath = (x: number, z: number, m: number) => grassPaths.some(([cx, cz, w, len, a]) => { const dx = x - cx, dz = z - cz, sn = Math.sin(a), cs = Math.cos(a); return Math.abs(dx * cs - dz * sn) < w * 0.5 + m && Math.abs(dx * sn + dz * cs) < len * 0.5 + m; });
  const away = ([[50, 45, 28], [-48, 20, 26], [-48, 38, 22], [55, -20, 22], [-50, -55, 22], [-60, 5, 22]]);
  for (let i = 0, n = 0; i < 4000 && n < 800; i++) {
    const x = (r() * 2 - 1) * HALF * 0.85, z = (r() * 2 - 1) * HALF * 0.85, k = 1.7 + r() * 1.5, f = r(), j = r() * 6.3;
    if (!ok(x, z) || inPath(x, z, 2.5) || (Math.abs(x) < 27 && Math.abs(z + 30) < 20) || away.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
    n++; if (lowQ && n & 1) continue; // lowQ: mitad de las matas de las islas
    put(tm, x, 0, z, j, k, 0.9 + r() * 0.7, k);
    if (f < 0.6) for (let q2 = 0; q2 < 3; q2++) put(r() < 0.5 ? fy : fw, x + (r() - 0.5) * k, 0, z + (r() - 0.5) * k, r() * 6.3, 1.2, 1.2, 1.2);
  }
  instances(tuft, tm); instances(flY, fy); instances(flW, fw);
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
  puddles(int(3, 10), pbr("puddleToy", { color: "#90CAF9", rough: 0.15, alpha: 0.7 })); // antes #3b4a52 casi espejo: se veían como óvalos negros
  ball();
}

function water() {
  const w = B.MeshBuilder.CreateDisc("w", { radius: 12, tessellation: 32 }, scene);
  w.rotation.x = Math.PI / 2;
  w.position.y = 3.2;
  w.material = pbr("water", { color: "#4fb3e8", rough: 0.02, alpha: 0.8 });
  return w;
}

