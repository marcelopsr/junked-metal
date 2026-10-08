// Kit modular "Folded 2.5D" compartido: paleta, texturas de chapa gastada, dibujos de carteles y utilería de taller.
// Lo usan el gabinete de Junket Crush (match3_scene.ts) y las escenas de menú (menuscene.ts).
import * as B from "@babylonjs/core";

/** Paleta de la guía UI (HEX exactos). La usan las texturas del gabinete, la pantalla y (como variables CSS) el HUD. */
export const M3C = {
  amarillo: "#FFB400", rojo: "#FF3B2E", cian: "#00C2FF", morado: "#8B5CF6", verde: "#22C55E",
  naranja: "#FF9138", amarilloClaro: "#FFD166", turquesa: "#06B6D4", azul: "#3B82F6", rosa: "#EC4899",
  fondo: "#0B0F14", fondo2: "#14181F", panel: "#1F2937", borde: "#374151", texto2: "#9CA3AF", texto: "#F8FAFC",
  exito: "#22C55E", aviso: "#F59E0B", error: "#EF4444", info: "#3B82F6", especial: "#A78BFA",
  // Chapa y metales del mundo Folded 2.5D (láminas de props y del gabinete); chapa/chapaOsc/tornillo = --jm-* de kit.css
  chapa: "#b5651d", chapaOsc: "#3a2414", tornillo: "#6b4a2a", metalClaro: "#9aa0a8", metalOsc: "#262a30", oxido: "#5c3a24",
  negro: "#101216", goma: "#0c0d10", grisChapa: "#b9b9b4", petroleo: "#2f6f78", rojoChapa: "#c0302a",
} as const;
/** Fuente única de color del mundo y de la UI (kit.css copia estos HEX en --jm-*; si cambia uno, cambiar los dos). */
export const PAL = M3C;

type Ctx = CanvasRenderingContext2D;

// Pseudoaleatorio con semilla fija: el gabinete sale siempre igual.
export function lcg(seed: number) { let k = seed; return () => ((k = (k * 16807) % 2147483647) / 2147483647); }

/** Textura de chapa: albedo + mapa metal/rugosidad (G = rugosidad, B = metal) pintados con los mismos golpes.
 *  El desgaste se concentra en los bordes de cada cara (las cajas mapean cada cara entera) y en manchas sueltas, no uniforme. */
/** `edgeRust` 0..1 (Folded): el óxido crece desde esquinas y el borde de apoyo, con pocas manchas sueltas; 0 = como siempre (match-3). */
export function wornTex(scene: B.Scene, seed: number, base: string, patches: string | null, px = 128, wear = 1, edgeRust = 0) {
  const { a, o } = wornCanvas(seed, base, patches, wear, edgeRust);
  const mk = (src: HTMLCanvasElement, name: string) => {
    const t = new B.DynamicTexture(name, px, scene, false, B.Texture.NEAREST_SAMPLINGMODE);
    (t.getContext() as unknown as Ctx).drawImage(src, 0, 0, px, px);
    t.update(false);
    return t;
  };
  return { alb: mk(a, "m3alb" + seed), orm: mk(o, "m3orm" + seed) };
}
/** Los dos lienzos de 256 de wornTex (albedo y metal/rugosidad); el atlas Folded los copia a sus celdas. */
export function wornCanvas(seed: number, base: string, patches: string | null, wear = 1, edgeRust = 0) {
  const S = 256, a = document.createElement("canvas"), o = document.createElement("canvas");
  a.width = a.height = o.width = o.height = S;
  const ca = a.getContext("2d")!, co = o.getContext("2d")!;
  const rnd = lcg(seed);
  const orm = (rough: number, metal: number) => `rgb(255,${(rough * 255) | 0},${(metal * 255) | 0})`;
  const blob = (x: number, y: number, r: number, alb: string, rough: number, metal: number) => {
    const n = 7, pts: [number, number][] = [];
    for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2, rr = r * (0.55 + rnd() * 0.6); pts.push([x + Math.cos(t) * rr, y + Math.sin(t) * rr]); }
    for (const [c, col] of [[ca, alb], [co, orm(rough, metal)]] as [Ctx, string][]) {
      c.fillStyle = col; c.beginPath(); pts.forEach(([px2, py], i) => (i ? c.lineTo(px2, py) : c.moveTo(px2, py))); c.closePath(); c.fill();
    }
  };
  ca.fillStyle = base; ca.fillRect(0, 0, S, S);
  co.fillStyle = orm(edgeRust ? 0.42 : 0.55, 0.08); co.fillRect(0, 0, S, S); // Folded: esmalte algo más liso, contrasta con la chapa expuesta (0,35/0,9) y el óxido (0,95)
  if (patches) for (let i = 0; i < 15; i++) { const x = rnd() * S, y = rnd() * S; for (let j = 0; j < 4; j++) blob(x + (rnd() - 0.5) * 50, y + (rnd() - 0.5) * 50, 12 + rnd() * 22, patches, 0.6, 0.08); }
  for (let i = 0; i < Math.round((edgeRust ? 14 : 70) * wear); i++) blob(rnd() * S, rnd() * S, 1.5 + rnd() * 5, rnd() < 0.5 ? "#17110c" : "#5a2f17", 0.92, 0.12); // óxido y mugre
  // Bordes y esquinas: pintura saltada que deja ver chapa y óxido
  for (let i = 0; i < Math.round(160 * wear); i++) {
    const side = (rnd() * 4) | 0, t = rnd() * S, d = rnd() ** 2.2 * 26;
    const x = side === 0 ? d : side === 1 ? S - d : t, y = side === 2 ? d : side === 3 ? S - d : t;
    const metal = rnd() < 0.55;
    blob(x, y, 2 + rnd() * 6, metal ? "#8d9096" : "#6b3a1c", metal ? 0.35 : 0.95, metal ? 0.9 : 0.25);
  }
  if (edgeRust > 0) {
    const rust = () => (rnd() < 0.6 ? "#6b3a1c" : "#3a2214");
    // Esquinas: óxido que avanza desde el vértice (radio según edgeRust), nunca la cara entera
    for (const [cx, cy] of [[0, 0], [S, 0], [0, S], [S, S]]) for (let i = 0; i < Math.round(9 * edgeRust); i++) {
      const d = rnd() ** 1.6 * 46 * edgeRust, a = rnd() * Math.PI * 2;
      blob(Math.abs(cx - Math.abs(Math.cos(a) * d)), Math.abs(cy - Math.abs(Math.sin(a) * d)), 3 + rnd() * 9 * edgeRust, rust(), 0.95, 0.2);
    }
    // Borde de apoyo (abajo de cada cara): contacto con el piso, más gastado
    for (let i = 0; i < Math.round(40 * edgeRust); i++) blob(rnd() * S, S - rnd() ** 2 * 34 * edgeRust, 2 + rnd() * 6, rust(), 0.95, 0.2);
    // Chorreado corto bajo el borde superior (agua que baja de la unión)
    ca.globalAlpha = 0.35; for (let i = 0; i < Math.round(10 * edgeRust); i++) { ca.fillStyle = "#4a2a16"; ca.fillRect(rnd() * S, 0, 2 + rnd() * 3, 14 + rnd() * 50 * edgeRust); } ca.globalAlpha = 1;
  }
  for (const c of [ca, co]) { c.lineWidth = 3; c.strokeStyle = c === ca ? "rgba(0,0,0,0.35)" : orm(0.85, 0.2); c.strokeRect(1.5, 1.5, S - 3, S - 3); }
  return { a, o };
}

export function canvasTexture(scene: B.Scene, name: string, w: number, h: number, draw: (c: Ctx) => void, alpha = false) {
  const t = new B.DynamicTexture(name, { width: w, height: h }, scene, true);
  t.hasAlpha = alpha;
  const c = t.getContext() as unknown as Ctx;
  draw(c);
  t.update();
  return t;
}

export function brick(c: Ctx) {
  const W = 512, H = 256;
  c.fillStyle = "#3a332c"; c.fillRect(0, 0, W, H);
  const bw = 64, bh = 24, j = 3, rnd = lcg(7);
  for (let row = 0; row * bh < H; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let x = -bw; x < W + bw; x += bw) {
      const r = 80 + rnd() * 40, l = 20 + rnd() * 12;
      c.fillStyle = `rgb(${r | 0},${(r * 0.42 + l * 0.3) | 0},${(r * 0.3 + l * 0.2) | 0})`;
      c.fillRect(x + off + j / 2, row * bh + j / 2, bw - j, bh - j);
      c.fillStyle = "rgba(0,0,0,0.22)"; c.fillRect(x + off + j / 2, row * bh + bh - j * 1.5, bw - j, j);
      c.fillStyle = "rgba(255,200,150,0.06)"; c.fillRect(x + off + j / 2, row * bh + j / 2, bw - j, 2);
    }
  }
}

export function gear(c: Ctx, x: number, y: number, r: number, col: string) {
  c.fillStyle = col; c.beginPath();
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? r : r * 1.25; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill();
  c.fillStyle = M3C.fondo; c.beginPath(); c.arc(x, y, r * 0.45, 0, Math.PI * 2); c.fill();
}

export function marquee(c: Ctx) {
  const W = 512, H = 144;
  c.fillStyle = M3C.fondo; c.fillRect(0, 0, W, H);
  gear(c, 46, 72, 26, M3C.naranja); gear(c, W - 46, 72, 26, M3C.naranja);
  c.textAlign = "center"; c.textBaseline = "middle"; c.lineJoin = "round";
  const word = (t: string, y: number, size: number, top: string, bot: string) => {
    c.font = `700 ${size}px Rajdhani, sans-serif`;
    c.lineWidth = 10; c.strokeStyle = "#1a0d06"; c.strokeText(t, W / 2, y);
    const g = c.createLinearGradient(0, y - size / 2, 0, y + size / 2); g.addColorStop(0, top); g.addColorStop(1, bot);
    c.fillStyle = g; c.fillText(t, W / 2, y);
  };
  word("JUNKET", 50, 64, M3C.amarilloClaro, M3C.naranja);
  word("CRUSH", 104, 46, "#7fe3ff", M3C.cian);
}

export function sideDecal(c: Ctx) {
  c.clearRect(0, 0, 256, 384);
  gear(c, 128, 90, 62, "#e9dcc4");
  c.fillStyle = "#e9dcc4"; c.fillRect(110, 70, 36, 44); // tuerca/calavera simplificada
  c.fillStyle = M3C.fondo; c.fillRect(116, 82, 9, 9); c.fillRect(132, 82, 9, 9);
  c.fillStyle = "#14100d"; c.fillRect(38, 190, 180, 170);
  c.fillStyle = "#e9dcc4"; c.textAlign = "center"; c.font = "700 46px Rajdhani, sans-serif";
  c.font = "700 38px Rajdhani, sans-serif"; ["PLAY", "FIX - FIX", "REPEAT"].forEach((t, i) => c.fillText(t, 128, 238 + i * 52));
}

export function poster(c: Ctx) {
  c.fillStyle = "#c9a36a"; c.fillRect(0, 0, 256, 360);
  c.fillStyle = "#2a1d14"; c.fillRect(14, 14, 228, 332);
  c.fillStyle = M3C.naranja; c.textAlign = "center"; c.font = "700 44px Rajdhani, sans-serif";
  c.fillText("GOOD METAL", 128, 64);
  gear(c, 128, 180, 62, "#b8612a");
  c.fillStyle = "#e9c48a"; c.fillRect(102, 150, 52, 56); c.fillStyle = "#2a1d14"; c.fillRect(110, 166, 12, 12); c.fillRect(134, 166, 12, 12);
  c.fillStyle = "#e9c48a"; c.font = "700 34px Rajdhani, sans-serif"; c.fillText("BETTER DAYS", 128, 320);
}

// ---------- Utilería del taller (en unidades libres: `u` = lado de una caja chica) ----------
// Cada pieza se arma en su origen apoyada en y = 0 (las colgantes cuelgan de y = 0 hacia abajo) y devuelve mallas sueltas:
// quien la usa las ubica (kitPut) y las fusiona. Los materiales de chapa gastada se crean una vez por color y escena.
type V3 = [number, number, number];
const wornMats = new Map<string, B.PBRMaterial>();
/** Chapa pintada y gastada (albedo + metal/rugosidad de wornTex). `patches`: manchas de otra pintura debajo. */
export function wornMat(base: string, patches: string | null = null, seed = 11) {
  const scene = B.Engine.LastCreatedScene!, key = `${base}|${patches}|${seed}`;
  let m = wornMats.get(key);
  if (m) return m;
  const t = wornTex(scene, seed, base, patches, 64);
  m = new B.PBRMaterial("kit" + key, scene);
  m.albedoTexture = t.alb; m.metallicTexture = t.orm; m.roughness = 1; m.metallic = 1;
  m.useRoughnessFromMetallicTextureGreen = true; m.useMetallnessFromMetallicTextureBlue = true; m.useRoughnessFromMetallicTextureAlpha = false;
  wornMats.set(key, m);
  return m;
}
const plain = (key: string, color: string, rough: number, metal: number, emissive?: string) => {
  const scene = B.Engine.LastCreatedScene!;
  let m = wornMats.get(key);
  if (m) return m;
  m = new B.PBRMaterial("kit" + key, scene);
  m.albedoColor = B.Color3.FromHexString(color).toLinearSpace(); m.roughness = rough; m.metallic = metal;
  if (emissive) m.emissiveColor = B.Color3.FromHexString(emissive);
  wornMats.set(key, m);
  return m;
};
export const KM = {
  rust: () => plain("rust", "#5c3a24", 0.95, 0.25),
  steel: () => plain("steel", "#9aa0a8", 0.32, 1),
  black: () => plain("black", "#101216", 0.7, 0.4),
  bulb: () => plain("bulb", M3C.amarilloClaro, 0.4, 0, M3C.amarilloClaro),
};
const mk = {
  box: (w: number, h: number, d: number, m: B.Material, p: V3, r?: V3) => { const b = B.MeshBuilder.CreateBox("k", { width: w, height: h, depth: d }); b.position.set(...p); if (r) b.rotation.set(...r); b.material = m; return b; },
  cyl: (d: number, h: number, m: B.Material, p: V3, r?: V3, tess = 8, d2 = d) => { const c = B.MeshBuilder.CreateCylinder("k", { diameterTop: d, diameterBottom: d2, height: h, tessellation: tess }); c.position.set(...p); if (r) c.rotation.set(...r); c.material = m; return c; },
  sph: (d: number, m: B.Material, p: V3) => { const s = B.MeshBuilder.CreateSphere("k", { diameter: d, segments: 4 }); s.position.set(...p); s.material = m; return s; },
};
const signTex = new Map<string, B.Texture>();
/** Carteles y calcos (en inglés: son parte del mundo, no de la UI traducible). */
export const SIGNS: Record<string, { w: number; h: number; draw: (c: Ctx) => void }> = {
  goodmetal: { w: 256, h: 360, draw: poster },
  playfix: { w: 256, h: 384, draw: sideDecal },
  junked: { w: 512, h: 144, draw: (c) => {
    c.fillStyle = M3C.fondo; c.fillRect(0, 0, 512, 144); gear(c, 46, 72, 26, M3C.naranja); gear(c, 466, 72, 26, M3C.naranja);
    c.textAlign = "center"; c.textBaseline = "middle"; c.lineJoin = "round"; c.font = "700 60px Rajdhani, sans-serif";
    c.lineWidth = 10; c.strokeStyle = "#1a0d06"; c.strokeText("JUNKED METAL", 256, 72); c.fillStyle = M3C.amarillo; c.fillText("JUNKED METAL", 256, 72);
  } },
  specimens: { w: 384, h: 128, draw: (c) => {
    c.fillStyle = "#c9a36a"; c.fillRect(0, 0, 384, 128); c.fillStyle = "#2a1d14"; c.fillRect(8, 8, 368, 112);
    c.fillStyle = M3C.amarilloClaro; c.textAlign = "center"; c.textBaseline = "middle"; c.font = "700 54px Rajdhani, sans-serif"; c.fillText("SPECIMENS", 192, 66);
  } },
};
/** Piezas del kit. `c` = color de la variación (pintura de la chapa). */
export const KIT = {
  /** Caja de chapa con flejes oxidados arriba y abajo. */
  crate: (u: number, c: string = "#2f6f78") => [
    mk.box(u, u * 0.75, u * 0.85, wornMat(c), [0, u * 0.375, 0]),
    mk.box(u * 1.03, u * 0.06, u * 0.88, KM.rust(), [0, u * 0.04, 0]), mk.box(u * 1.03, u * 0.06, u * 0.88, KM.rust(), [0, u * 0.71, 0]),
  ],
  /** Tambor con dos aros. */
  barrel: (u: number, c: string = "#c0302a") => [
    mk.cyl(u * 0.66, u, wornMat(c), [0, u / 2, 0], undefined, 12),
    ...[0.2, 0.8].map((y) => mk.cyl(u * 0.69, u * 0.04, KM.rust(), [0, u * y, 0], undefined, 12)),
  ],
  /** Caja de herramientas: cuerpo, tapa y manija. */
  toolbox: (u: number, c: string = "#c0302a") => [
    mk.box(u * 1.4, u * 0.5, u * 0.6, wornMat(c, M3C.naranja, 23), [0, u * 0.25, 0]), mk.box(u * 1.42, u * 0.12, u * 0.62, wornMat(c, null, 37), [0, u * 0.56, 0]),
    mk.box(u * 0.08, u * 0.22, u * 0.08, KM.steel(), [-u * 0.3, u * 0.7, 0]), mk.box(u * 0.08, u * 0.22, u * 0.08, KM.steel(), [u * 0.3, u * 0.7, 0]), mk.box(u * 0.68, u * 0.07, u * 0.1, KM.black(), [0, u * 0.8, 0]),
  ],
  /** Morsa de banco. */
  vise: (u: number, c: string = "#2f6f78") => [
    mk.box(u * 0.9, u * 0.15, u * 0.6, wornMat(c, null, 37), [0, u * 0.075, 0]), mk.box(u * 0.3, u * 0.5, u * 0.5, wornMat(c, null, 37), [-u * 0.25, u * 0.4, 0]), mk.box(u * 0.3, u * 0.5, u * 0.5, wornMat(c, null, 37), [u * 0.25, u * 0.4, 0]),
    mk.cyl(u * 0.08, u * 1.1, KM.steel(), [0, u * 0.4, 0], [0, 0, Math.PI / 2], 6), mk.cyl(u * 0.06, u * 0.6, KM.steel(), [u * 0.6, u * 0.4, 0], [Math.PI / 2, 0, 0], 6),
  ],
  /** Lámpara de jaula colgante (cuelga desde y = 0). */
  cageLamp: (u: number) => [
    mk.cyl(u * 0.03, u * 0.8, KM.black(), [0, -u * 0.4, 0], undefined, 4), mk.cyl(u * 0.35, u * 0.2, KM.steel(), [0, -u * 0.85, 0], undefined, 8, u * 0.18),
    mk.sph(u * 0.3, KM.bulb(), [0, -u * 1.05, 0]),
    ...[0, 1, 2, 3].map((i) => { const a = (i / 4) * Math.PI * 2 + 0.4; return mk.cyl(u * 0.025, u * 0.36, KM.steel(), [Math.cos(a) * u * 0.2, -u * 1.05, Math.sin(a) * u * 0.2], undefined, 4); }),
  ],
  /** Caño oxidado recto (a lo largo de x) con bridas en las puntas. */
  pipe: (u: number) => [
    mk.cyl(u * 0.2, u * 4, KM.rust(), [0, 0, 0], [0, 0, Math.PI / 2], 6),
    mk.cyl(u * 0.32, u * 0.1, KM.rust(), [-u * 2, 0, 0], [0, 0, Math.PI / 2], 8), mk.cyl(u * 0.32, u * 0.1, KM.rust(), [u * 2, 0, 0], [0, 0, Math.PI / 2], 8),
  ],
  /** Placa de chapa remachada (de pie, mirando a +z). */
  plate: (u: number, c: string = "#262a30") => [
    mk.box(u * 1.6, u, u * 0.05, wornMat(c, null, 23), [0, u / 2, 0]),
    ...[[-0.72, 0.08], [0.72, 0.08], [-0.72, 0.92], [0.72, 0.92]].map(([x, y]) => mk.cyl(u * 0.07, u * 0.04, KM.steel(), [x * u, y * u, u * 0.04], [Math.PI / 2, 0, 0], 6)),
  ],
  /** Frasco de muestra: vidrio, tapa oxidada y una pieza adentro. */
  jar: (u: number, c: string = M3C.verde) => [
    mk.cyl(u * 0.5, u * 0.75, plain("jarglass", "#9fd8e0", 0.08, 0), [0, u * 0.375, 0], undefined, 10),
    mk.cyl(u * 0.54, u * 0.12, KM.rust(), [0, u * 0.8, 0], undefined, 10), mk.sph(u * 0.28, plain("bug" + c, c, 0.5, 0), [0, u * 0.3, 0]),
  ],
  /** Cartel con dibujo (SIGNS), de pie mirando a +z; `u` = alto. */
  sign: (u: number, id: string = "goodmetal") => {
    const s = SIGNS[id], scene = B.Engine.LastCreatedScene!;
    let t = signTex.get(id);
    if (!t) { t = canvasTexture(scene, "sign" + id, s.w, s.h, s.draw); signTex.set(id, t); }
    const m = plain("sign" + id, "#ffffff", 0.85, 0); m.albedoTexture = t;
    const w = (u * s.w) / s.h, p = B.MeshBuilder.CreatePlane("k", { width: w, height: u });
    p.position.set(0, u / 2, u * 0.03); p.material = m;
    return [p, mk.box(w + u * 0.06, u * 1.04, u * 0.04, KM.rust(), [0, u / 2, 0])];
  },
};
export type KitId = keyof typeof KIT;
/** Ubica las mallas de una pieza (posición, giro, escala) horneando la transformación en los vértices. */
export function kitPut(parts: B.Mesh[], pos: V3, rot: V3 = [0, 0, 0], scale = 1) {
  const q = B.Matrix.Compose(new B.Vector3(scale, scale, scale), B.Quaternion.FromEulerAngles(...rot), new B.Vector3(...pos));
  for (const m of parts) { m.computeWorldMatrix(true); m.bakeTransformIntoVertices(m.getWorldMatrix().multiply(q)); m.position.setAll(0); m.rotation.setAll(0); m.scaling.setAll(1); }
  return parts;
}
