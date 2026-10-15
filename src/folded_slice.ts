// Vertical slice Folded 2.5D (`?folded2`, ver FOLDED_SLICE): piezas de hormiga, polilla, robot, buggy, cerca y caja armadas con
// geoKit + FOLD. Solo devuelven mallas sueltas: models.ts/world.ts las fusionan en plantillas (template) como siempre, así que
// colisión, IA, instancias y pivots de patas/alas/llave no cambian. Remaches y tornillos se hornean como cilindros (bake) porque
// una plantilla no puede llevar thin instances.
import * as B from "@babylonjs/core";
import { FOLD, foldAtlas, foldTile, geoKit, toTile, type GeoKit } from "./folded";
import { PAL } from "./kit3d";
import { pbr } from "./render";
import { genome, original, type Genome } from "./car_genes";

type V3 = [number, number, number];
const sc = () => B.Engine.LastCreatedScene!;

/** Kit que junta todo en `parts`; `done(k)` hornea remaches/tornillos (k = escala de la cabeza) y devuelve las piezas. */
export function kit() {
  const parts: B.Mesh[] = [];
  let cur = 0; // hueso de las piezas que se agregan (VAT de glb.ts: 0 = cuerpo)
  const add = (m: B.Mesh, mat: B.Material) => {
    const t = foldTile(mat);
    if (t !== undefined) { toTile(m, t); mat = foldAtlas(); }
    m.material = mat; m.metadata = { bone: cur }; parts.push(m); return m;
  };
  const G = geoKit(sc(), add);
  const marks: [number, number, number][] = [[0, 0, 0]]; // desde qué remache/tornillo rige cada hueso (los de la maza giran con su rueda)
  const bone = (i: number) => { cur = i; marks.push([G.rivetM.length, G.boltM.length, i]); };
  const done = (k = 1, s = 1) => {
    ([[G.rivetM, 0.016, 0.008, 0], [G.boltM, 0.022, 0.012, 1]] as const).forEach(([list, d, h, col]) => list.forEach((M, i) => {
      cur = marks.filter((m) => m[col] <= i).at(-1)![2];
      const c = B.MeshBuilder.CreateCylinder("p", { diameterTop: d * 0.8 * k, diameterBottom: d * k, height: h * k, tessellation: 6 }, sc());
      c.bakeTransformIntoVertices(M); add(c, FOLD.bolt());
    }));
    if (s !== 1) for (const p of parts) { p.computeWorldMatrix(true); p.bakeCurrentTransformIntoVertices(); p.scaling.setAll(s); }
    return parts;
  };
  /** Barra de sección w×h entre a y b (patas, caños de jaula, brazos). */
  const strut = (a: V3, b: V3, w: number, h: number, m: B.Material) => {
    const A = new B.Vector3(...a), Bv = new B.Vector3(...b), d = Bv.subtract(A);
    const s = G.box(w, h, d.length(), m, [0, 0, 0]);
    s.position = A.add(d.scale(0.5));
    s.rotationQuaternion = B.Quaternion.FromLookDirectionLH(d.normalize(), Math.abs(d.y) > 0.99 * d.length() ? B.Vector3.Forward() : B.Vector3.Up());
    return s;
  };
  return { G, parts, done, strut, bone, add };
}
export const along = (G: GeoKit, d1: number, d2: number, len: number, m: B.Material, p: V3, tess = 6) => G.cyl(d1, len, m, p, [Math.PI / 2, 0, 0], tess, d2); // prisma a lo largo de z (d1 adelante)

// ---------- Hormiga: gáster hexagonal con placa, cintura, tórax con lomo atornillado, cabeza con mandíbulas de acero ----------
// Huesos (VAT de glb.ts): 0 cuerpo, 1..6 patas (cadera i, lado +1/-1), 7 antenas. `vis`: escala que glb.ts le da al nodo (GLB.visual).
const ANT_COLOR = "#6e3520";
// Diorama de juguete: plástico pintado y metal pintado (pbr plano; merge/flatten los pasa a color de vértice, sin atlas Folded). Pintura saltada = parches crema/acero.
const toy = (c: string, rough = 0.5, metal = 0.1) => pbr(`jm${c}|${rough}|${metal}`, { color: c, rough, metal });
const toyGlow = (c: string) => pbr("jmg" + c, { color: c, rough: 0.4, emissive: c });
const toySteel = () => toy("#a4a9ae", 0.4, 0.8), toyDark = () => toy("#2a2623", 0.7, 0), toyRubber = () => toy("#1c1917", 0.92, 0);
const ANT_HIPS: [V3, number][] = [[[0.2, 0.46, 0.3], 0.65], [[0.22, 0.46, 0.14], 0], [[0.2, 0.46, -0.02], -0.65]];
/** Insectos de 6 patas (hormiga, escupidora, escarabajo): mismo esqueleto y caminata; cambian color, tamaño (k) y la pieza de identidad. */
type Bug = { color: string; k: number; eye: string; seed: number; look: "ant" | "spit" | "beetle" };
const BUGS: Record<string, Bug> = {
  hormiga: { color: "#74301a", k: 1, eye: "#ff6a1a", seed: 61, look: "ant" },
  escupidora: { color: "#6e3a1c", k: 1.3, eye: "#ff6a1a", seed: 64, look: "spit" },
  escarabajo: { color: "#4c5024", k: 1.6, eye: "#ff7a1a", seed: 67, look: "beetle" },
};
// Paleta de chapa gastada de las láminas (ref169/171): óxido, bronce de articulaciones, crema de la pintura saltada, oliva.
/** Plástico/metal pintado de juguete (diorama Encore, como toy() de moon_goals.ts): color liso con barniz suave, sin chapa plegada. */
export const toy = (n: string, color: string, o: { rough?: number; metal?: number; glow?: boolean; coat?: number } = {}) => {
  const m = pbr("toy" + n, { color, rough: o.rough ?? 0.55, metal: o.metal ?? 0.15, coat: o.coat ?? 0.25, ...(o.glow ? { emissive: color } : {}) });
  if (o.glow) m.emissiveIntensity = 2; return m;
};
const CREAM = "#e8d4a8", BRONZE = "#94642c", RUSTD = "#5a2a18";
const ell = (add: (m: B.Mesh, mat: B.Material) => B.Mesh, m: B.Material, p: V3, s: V3, seg = 8, slice = 1) => { // elipsoide (o cúpula con slice 0.5) de chapa
  const e = B.MeshBuilder.CreateSphere("p", { diameter: 1, segments: seg, slice }, sc());
  e.position.set(...p); e.scaling.set(...s); if (slice < 1) e.convertToFlatShadedMesh(); // cúpulas facetadas: sin brillo de bola lisa
  return add(e, m);
};
/** Nervio semielíptico (arco sobre una cúpula) a la altura z; r = semiancho, h = alto, c = centro (x, y). */
const rib = (G: GeoKit, m: B.Material, z: number, r: number, h: number, c: [number, number], w = 0.022) =>
  G.tube(Array.from({ length: 9 }, (_, i) => { const a = (Math.PI * i) / 8; return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * h, z] as V3; }), w, m);
/** Mechón: cono fino (punta en +dir) desde `p`; `tip` pinta el último 45 % (puntas naranja). */
const tuft = (G: GeoKit, m: B.Material, tip: B.Material | undefined, p: V3, dir: V3, len: number, w: number) => {
  const d = new B.Vector3(...dir).normalize(), q = B.Quaternion.FromUnitVectorsToRef(B.Vector3.Up(), d, new B.Quaternion());
  const put = (mat: B.Material, l: number, w1: number, off: number) => {
    const c = G.cyl(0.001, l, mat, [p[0] + d.x * off, p[1] + d.y * off, p[2] + d.z * off], undefined, 4, w1); c.rotationQuaternion = q.clone();
  };
  put(m, len, w, len / 2);
  if (tip) put(tip, len * 0.45, w * 0.46, len * 0.775);
};
/** Placas de élitro en teja (4 domos que se pisan, tonos alternados) y 2 nervios longitudinales en relieve sobre la cúpula c con semiejes r. */
const elytra = (G: GeoKit, add: (m: B.Mesh, mat: B.Material) => B.Mesh, mats: B.Material[], rib2: B.Material, c: V3, r: V3, n = 4) => {
  for (let i = 0; i < n; i++) {
    const t = -0.7 + (1.4 * i) / (n - 1), k = Math.sqrt(1 - t * t) * 1.035;
    ell(add, mats[i % mats.length], [c[0], c[1], c[2] + r[2] * t], [r[0] * 2 * k, r[1] * 2 * k, r[2] * 0.95], 8, 0.5);
  }
  for (const phi of [0.9, 1.9]) G.tube(Array.from({ length: 11 }, (_, i) => { const t = -0.92 + (1.84 * i) / 10, k = Math.sqrt(1 - t * t) * 1.045; return [c[0] + Math.cos(phi) * r[0] * k, c[1] + Math.sin(phi) * r[1] * k, c[2] + r[2] * t] as V3; }), 0.028, rib2);
};
export function antBody(vis = 1, o: Bug = BUGS.hormiga) {
  const { G, done, strut, bone, add } = kit();
  const body = toy(o.color, 0.42, 0.05), plate = toy(BRONZE, 0.6, 0.55), cream = toy(CREAM, 0.7, 0), eye = toyGlow(o.eye), bronze = toy(BRONZE, 0.45, 0.8), dkr = toy(RUSTD, 0.6, 0.2);
  if (o.look === "beetle") { // domo de élitros: dos cúpulas de plástico pintado (oliva / óxido) con nervios, costura, pronoto abombado y cuerno curvo (IDENTITY)
    const olive = toy("#505624", 0.4, 0.05), rust = toy("#7a3a1c", 0.4, 0.05);
    along(G, 0.6, 0.78, 0.9, dkr, [0, 0.4, -0.6]);
    for (const s of [-1, 1]) {
      ell(add, dkr, [s * 0.26, 0.48, -0.6], [0.54, 0.9, 1.26], 8, 0.5); // base oscura bajo las placas
      elytra(G, add, s < 0 ? [olive, toy("#5e6430", 0.4, 0.05)] : [rust, toy("#8e4a24", 0.4, 0.05)], bronze, [s * 0.26, 0.5, -0.6], [0.28, 0.475, 0.65]); // placas segmentadas con nervios
      rib(G, bronze, -0.28, 0.26, 0.3, [s * 0.26, 0.5]); rib(G, bronze, -0.9, 0.22, 0.24, [s * 0.26, 0.5]);
      G.box(0.2, 0.012, 0.3, cream, [s * 0.34, 0.9, -0.55], [0, 0, s * 0.35]); // parche de pintura saltada
    }
    G.bend([0, 0.84, -1.18], [0, 0.84, -0.04], 0.03, toySteel()); // costura
    ell(add, rust, [0, 0.52, 0.12], [0.5, 0.6, 0.5], 10, 0.5); // pronoto abombado
    G.tube([[0, 0.66, 0.9], [0, 0.78, 1.22], [0, 0.98, 1.34], [0, 1.16, 1.2]], 0.045, dkr); // cuerno curvo corto, color élitro oscuro
    ell(add, body, [0, 0.54, 0.76], [0.6, 0.46, 0.58], 9); // cabeza redondeada
    G.plate([0, 0.77, 0.9], [Math.PI / 2 - 0.5, 0, 0], 0.34, 0.26, plate); // clípeo
    for (const s of [-1, 1]) G.tube([[s * 0.16, 0.4, 0.96], [s * 0.36, 0.3, 1.28], [s * 0.12, 0.3, 1.5]], 0.07, toySteel()); // mandíbulas en pinza
  } else {
    ell(add, body, [0, 0.46, -0.72], [0.8, 0.74, 1.05], 9); // gáster bulboso (BODY)
    for (const [z, d] of [[-0.45, 0.62], [-0.7, 0.72], [-0.95, 0.66]] as const) along(G, d, d, 0.04, plate, [0, 0.46, z], 8); // segmentos de bronce
    G.plate([0, 0.83, -0.72], [Math.PI / 2, 0, 0], 0.3, 0.5, cream); // placa del lomo pintada en crema (PANELS)
  }
  if (o.look === "spit") { // globo de ácido enjaulado por flejes, con goteo en la tobera (IDENTITY)
    G.sph(0.58, toy("#7e9a1a", 0.25, 0), [0, 0.96, -0.78]); // vidrio de juguete con ácido
    for (const [y, d] of [[0.96, 0.64], [0.82, 0.52], [1.1, 0.5]] as const) G.cyl(d, 0.05, bronze, [0, y, -0.78], undefined, 8);
    G.tube(Array.from({ length: 9 }, (_, i) => { const a = (Math.PI * i) / 8; return [0, 0.96 + Math.sin(a) * 0.31, -0.78 + Math.cos(a) * 0.31] as V3; }), 0.025, bronze);
    G.cyl(0.14, 0.08, bronze, [0, 1.28, -0.78], undefined, 6);
    G.cyl(0.1, 0.32, toySteel(), [0, 0.5, 1.02], [Math.PI / 2, 0, 0], 6, 0.14);
    G.sph(0.09, toyGlow("#b8e830"), [0, 0.4, 1.24]); G.sph(0.06, toyGlow("#b8e830"), [0, 0.28, 1.28]);
  }
  along(G, 0.14, 0.18, 0.26, toyDark(), [0, 0.46, -0.12]); // cintura
  if (o.look !== "beetle") G.box(0.42, 0.3, 0.46, body, [0, 0.5, 0.14]); // tórax
  for (const s of [-1, 1]) G.bend([s * 0.21, 0.65, -0.09], [s * 0.21, 0.65, 0.37], 0.03, bronze);
  G.plate([0, 0.655, 0.14], [Math.PI / 2, 0, 0], 0.26, 0.36, plate);
  along(G, 0.14, 0.14, 0.18, toyDark(), [0, 0.52, 0.46]); // cuello
  if (o.look !== "beetle") {
    G.box(0.52, 0.38, 0.44, body, [0, 0.55, 0.7], [-0.18, 0, 0]); // cabeza grande
    G.box(0.5, 0.08, 0.4, plate, [0, 0.79, 0.7], [-0.18, 0, 0]); // visera
  }
  for (const s of [-1, 1]) {
    G.sph(0.22, toy("#0c0a0a", 0.2, 0), [s * 0.28, 0.62, 0.8]); G.sph(0.1, eye, [s * 0.34, 0.64, 0.9]); // ojo de vidrio con brasa
    strut([s * 0.12, 0.44, 0.9], [s * 0.05, 0.36, 1.22], 0.07, 0.06, toySteel()); // mandíbula
    G.box(0.06, 0.06, 0.12, toySteel(), [s * 0.01, 0.36, 1.24], [0, -s * 0.9, 0]);
    bone(7);
    G.tube([[s * 0.12, 0.76, 0.84], [s * 0.24, 1.04, 0.98], [s * 0.36, 1.02, 1.28]], 0.035, toyDark()); // antena
    G.box(0.06, 0.06, 0.09, bronze, [s * 0.36, 1.02, 1.3]);
    bone(0);
  }
  // Patas: fémur, rodilla de bronce, tibia y pie de goma, cada una en su hueso (caminata horneada: 300 hormigas cuestan lo mismo que una)
  const leg = toy(o.color, 0.5, 0.3); // pata de metal pintado
  let b = 1;
  for (const [[hx, hy, hz], yaw] of ANT_HIPS) for (const s of [1, -1]) {
    bone(b++);
    const a = s > 0 ? yaw : Math.PI - yaw, P = (x: number, y: number, z: number): V3 => [hx * s + x * Math.cos(a) + z * Math.sin(a), hy + y, hz - x * Math.sin(a) + z * Math.cos(a)];
    const knee = P(0.36, 0.2, 0), foot = P(0.78, -0.44, 0.04);
    G.box(0.2, 0.2, 0.2, bronze, P(-0.04, 0, 0)); // cadera metida en el cuerpo
    strut(P(-0.02, 0, 0), knee, 0.12, 0.14, leg); G.box(0.15, 0.15, 0.15, bronze, knee);
    strut(knee, foot, 0.085, 0.1, leg); G.sph(0.15, toyRubber(), [foot[0], foot[1] + 0.03, foot[2]]); // pie: bola de goma que abraza la punta de la tibia
  }
  return done(2.5, o.k / vis);
}
export const piv = (p: B.Vector3, R: B.Matrix) => B.Matrix.Translation(-p.x, -p.y, -p.z).multiply(R).multiply(B.Matrix.Translation(p.x, p.y, p.z));
/** Pose de la hormiga: walk 0..1 (ciclo) o atk 0..1 (arremetida). Trípode: patas alternadas en fase opuesta, como enemies.ts. */
export function antPose(vis: number, walk: number, atk: number, kk = 1) {
  const k = kk / vis, ph = walk * Math.PI * 2, lunge = Math.sin(atk * Math.PI);
  const bodyM = piv(new B.Vector3(0, 0.45 * k, 0.1 * k), B.Matrix.RotationX(-0.22 * lunge)).multiply(B.Matrix.Translation(0, 0.02 * k * Math.abs(Math.sin(ph * 2)), 0.12 * k * lunge));
  const out = [bodyM];
  let i = 0;
  for (const [[hx, hy, hz]] of ANT_HIPS) { for (const s of [1, -1]) {
    const f = ph + ((i + (s > 0 ? 0 : 1)) % 2 ? Math.PI : 0), sw = atk > 0 ? 0 : Math.sin(f) * 0.42, lift = atk > 0 ? 0.15 * lunge : Math.max(0, Math.cos(f)) * 0.3;
    out.push(piv(new B.Vector3(hx * s * k, hy * k, hz * k), B.Matrix.RotationZ(s * lift).multiply(B.Matrix.RotationY(sw))));
  } i++; }
  out.push(piv(new B.Vector3(0, 0.66 * k, 0.78 * k), B.Matrix.RotationX(-0.25 * Math.sin(ph * 2) - 0.4 * lunge)).multiply(bodyM));
  return out;
}

// ---------- Polilla: tórax con collar, abdomen en anillos (se lee de atrás), ojos emisivos y antenas con plumas de chapa ----------
// Huesos: 0 tórax y cabeza, 1 abdomen (bombea en vuelo), 2 antenas.
const MOTH = "#a8602c"; // pelo óxido (ref127/266); alas crema
export function mothBody(vis = 1) {
  const { G, done, strut, bone } = kit();
  const fur = toy(MOTH, 0.7, 0), band = toy("#5a2e1a", 0.5, 0.1), eye = toy("#0c0a0a", 0.2, 0), glint = toyGlow("#ff8a2a"), cream = toy("#edc79a", 0.6, 0);
  along(G, 0.3, 0.34, 0.36, fur, [0, 0.42, -0.02], 8); // tórax
  G.cyl(0.42, 0.07, cream, [0, 0.42, 0.16], [Math.PI / 2, 0, 0], 8); // collar crema
  bone(1);
  [0.32, 0.28, 0.23, 0.16, 0.09].forEach((d, i) => along(G, d + 0.03, d, 0.13, i % 2 ? band : fur, [0, 0.42 - i * 0.012, -0.27 - i * 0.13], 8)); // abdomen anillado
  G.box(0.06, 0.06, 0.06, toyGlow("#ffb400"), [0, 0.37, -0.92]); // luz de cola (lectura desde atrás)
  bone(0);
  along(G, 0.2, 0.26, 0.16, band, [0, 0.43, 0.26], 8); // cabeza
  for (const s of [-1, 1]) {
    G.sph(0.19, eye, [s * 0.1, 0.45, 0.33]); G.sph(0.07, glint, [s * 0.13, 0.47, 0.41]); // ojo de vidrio negro con brasa
    const a: V3 = [s * 0.06, 0.52, 0.3], b: V3 = [s * 0.2, 0.7, 0.42], c: V3 = [s * 0.34, 0.78, 0.5];
    bone(2);
    G.tube([a, b, c], 0.012, toyDark());
    for (let k = 1; k <= 4; k++) { const t = k / 5, p = B.Vector3.Lerp(new B.Vector3(...b), new B.Vector3(...c), t); G.box(0.012, 0.09 - k * 0.012, 0.03, fur, [p.x, p.y, p.z], [0, 0, s * 0.5]); } // plumas
    bone(0);
    for (const z of [0.1, -0.02, -0.14]) strut([s * 0.12, 0.32, z], [s * 0.24, 0.16, z + 0.04], 0.025, 0.025, toyDark()); // patitas recogidas
  }
  return done(1.5, 1 / vis);
}
export function mothPose(vis: number, walk: number, atk: number) {
  const k = 1 / vis, ph = walk * Math.PI * 2;
  return [B.Matrix.Identity(),
    piv(new B.Vector3(0, 0.42 * k, -0.2 * k), B.Matrix.RotationX(0.14 * Math.sin(ph) + 0.35 * Math.sin(atk * Math.PI))),
    piv(new B.Vector3(0, 0.52 * k, 0.3 * k), B.Matrix.RotationX(-0.18 * Math.sin(ph * 2)))];
}
/** Ala de polilla (bisagra en el origen, hacia +x·side): chapa fina de 12 mm con larguero, nervios y ocelo; gira en z en enemies.ts. */
export function mothWing(side: 1 | -1) {
  const { G, done, strut } = kit();
  const s = side * 0.85, skin = toy("#edc79a", 0.55, 0), skin2 = toy("#d9a574", 0.6, 0), cream = toy("#b04a22", 0.55, 0), core = toy("#5a2412", 0.6, 0), spar = toy("#5a2e1c", 0.5, 0.2);
  G.cyl(0.06, 0.16, toySteel(), [0, 0, 0], [Math.PI / 2, 0, 0], 6); // bisagra pegada al tórax
  G.box(0.51, 0.012, 0.44, skin, [s * 0.385, 0.01, 0.04], [0, s * 0.126, 0]); // ala anterior
  G.box(0.21, 0.012, 0.3, skin2, [s * 0.686, 0.01, -0.06], [0, s * 0.35, 0]); // punta plegada
  G.box(0.34, 0.012, 0.36, skin2, [s * 0.294, -0.012, -0.28], [0, -s * 0.175, 0]); // ala posterior
  strut([0, 0.02, 0.02], [s * 0.784, 0.02, 0.0], 0.03, 0.028, spar); // larguero de ataque
  for (const [x, z] of [[0.7, -0.22], [0.9, 0.12], [0.6, -0.42]]) strut([s * 0.056, 0.018, 0], [s * x, 0.018, z], 0.014, 0.014, spar); // nervios
  for (const x of [0.3, 0.55, 1.0]) for (const y of [0.0185, -0.0125]) G.box(0.06, 0.012, 0.4, cream, [s * x, y, 0.02 - x * 0.1], [0, s * 0.126, 0]); // bandas crema
  G.box(0.085, 0.012, 0.3, cream, [s * 0.385, -0.0125, -0.28]);
  for (const y of [0.0185, -0.0125]) { G.cyl(0.24, 0.012, cream, [s * 0.518, y, -0.04], undefined, 12); G.cyl(0.12, 0.014, core, [s * 0.518, y + Math.sign(y) * 0.001, -0.04], undefined, 12); } // anillo ocular crema, centro marrón oscuro
  const R = B.Matrix.RotationY(side * 0.62); // alas plegadas en V hacia atrás (barrido de 35 grados)
  const parts = done();
  for (const m of parts) { m.computeWorldMatrix(true); m.bakeCurrentTransformIntoVertices(); m.bakeTransformIntoVertices(R); }
  return parts;
}

// ---------- Robot a cuerda: pies de chapa, cintura hazard, torso plegado con rejilla y número, cabeza con visor ----------
// Huesos: 0 cuerpo, 1-2 piernas (izq/der), 3-4 brazos. Armado en unidades de 1/1,22 (ROBOT_K) para ocupar el ancho de su colisionador (1,2).
const ROBOT_K = 1.22, SH = 0.9;
export function robotBody() {
  const { G, done, strut, bone } = kit();
  const tin = toy("rbHojalata", "#b8683a", { rough: 0.5, metal: 0.35 }), gold = toy("rbLaton", "#c89a3c", { rough: 0.4, metal: 0.8 }), dark = toy("rbOscuro", "#2e2a28", { rough: 0.7 }), steel = toy("rbAcero", "#8a8782", { rough: 0.4, metal: 0.8 }), lamp = toy("rbOjo", "#ffb02a", { glow: true }), rubber = toy("rbGoma", "#1f1d1c", { rough: 0.9, metal: 0, coat: 0 }), chip = toy("rbLasca", "#b9b2a6", { rough: 0.5, metal: 0.7 }), hz = toy("rbAviso", "#e8b020", { rough: 0.5 });
  for (const s of [-1, 1]) {
    bone(s < 0 ? 1 : 2);
    G.box(0.28, 0.1, 0.42, dark, [s * 0.22, 0.06, 0.04]); G.box(0.29, 0.025, 0.43, rubber, [s * 0.22, 0.012, 0.04]); // pies
    G.cyl(0.12, 0.24, steel, [s * 0.22, 0.22, 0], undefined, 6); // tobillo
  }
  bone(0);
  G.box(0.62, 0.1, 0.38, dark, [0, 0.36, 0]); // pelvis
  for (const s of [-1, 1]) G.box(0.3, 0.03, 0.44, gold, [s * 0.22, 0.12, 0.04]); // remate dorado de los pies
  G.box(0.78, 0.07, 0.02, hz, [0, 0.44, 0.26]); // franja de aviso
  G.box(0.8, 0.56, 0.5, tin, [0, 0.72, 0]); // torso (BODY)
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) G.box(0.04, 0.56, 0.04, gold, [x * 0.4, 0.72, z * 0.25]); // aristas doradas
  for (const s of [-1, 1]) G.box(0.82, 0.03, 0.04, gold, [0, 1.0, s * 0.25]);
  for (const [x, z] of [[-1, 1], [1, -1]]) G.box(0.07, 0.05, 0.06, chip, [x * 0.38, 0.99, z * 0.25]); // pintura saltada en los cantos
  for (let i = 0; i < 4; i++) G.box(0.42, 0.025, 0.03, gold, [0, 0.54 + i * 0.05, 0.265]); // rejilla dorada del pecho
  G.decal([0, 0.86, 0.255], [0, Math.PI, 0], "numero", 0.2); // número (IDENTITY)
  G.plate([0, 0.6, -0.255], undefined, 0.26, 0.26, dark); // placa de la llave (la llave gira aparte)
  for (const s of [-1, 1]) { // brazos
    G.cyl(0.12, 0.08, steel, [s * 0.44, SH, 0], [0, 0, Math.PI / 2], 6);
    bone(s < 0 ? 3 : 4);
    strut([s * 0.49, SH, 0], [s * 0.53, 0.58, 0.16], 0.13, 0.13, tin);
    G.box(0.04, 0.12, 0.08, steel, [s * 0.5, 0.5, 0.2]); G.box(0.04, 0.12, 0.08, steel, [s * 0.57, 0.5, 0.2]); // pinza
    bone(0);
  }
  G.cyl(0.14, 0.08, steel, [0, 1.04, 0], undefined, 6); // cuello
  G.box(0.46, 0.3, 0.36, tin, [0, 1.22, 0.01]); // cabeza
  G.box(0.3, 0.05, 0.02, dark, [0, 1.14, 0.19]); // boca
  for (const s of [-1, 1]) G.cyl(0.13, 0.03, lamp, [s * 0.11, 1.24, 0.205], [Math.PI / 2, 0, 0], 10); // ojos redondos emisivos
  G.box(0.5, 0.05, 0.4, gold, [0, 1.38, 0.01]); // tapa dorada
  G.cyl(0.14, 0.05, gold, [0, 1.43, 0.01], undefined, 8); // base dorada de la luz
  for (const s of [-1, 1]) { G.cyl(0.11, 0.05, gold, [s * 0.11, 1.24, 0.19], [Math.PI / 2, 0, 0], 8); G.box(0.04, 0.2, 0.04, gold, [s * 0.24, 0.98, 0.2]); } // aros dorados de los ojos y remates del torso
  G.tube([[0.1, 1.4, 0], [0.12, 1.58, -0.02]], 0.012, steel); G.box(0.05, 0.05, 0.05, toy("rbLuz", "#e02020", { glow: true }), [0.12, 1.6, -0.02]);
  return done(2, ROBOT_K);
}
/** Paso de juguete a cuerda: pies que avanzan y se levantan alternados, brazos en contra; al atacar levanta los brazos. */
export function robotPose(_vis: number, walk: number, atk: number) {
  const k = ROBOT_K, ph = walk * Math.PI * 2, up = Math.sin(atk * Math.PI);
  const body = B.Matrix.Translation(0, 0.03 * k * Math.abs(Math.sin(ph)), 0);
  const leg = (s: number) => B.Matrix.Translation(0, 0.07 * k * Math.max(0, Math.sin(ph + (s < 0 ? 0 : Math.PI))), 0.1 * k * Math.cos(ph + (s < 0 ? 0 : Math.PI)));
  const arm = (s: number) => piv(new B.Vector3(s * 0.44 * k, SH * k, 0), B.Matrix.RotationX(atk > 0 ? -1.3 * up : 0.45 * Math.cos(ph + (s < 0 ? Math.PI : 0)))).multiply(body);
  return [body, leg(-1), leg(1), arm(-1), arm(1)];
}
// ---------- Autito a fricción: carrocería naranja plegada, parabrisas de pantalla, paragolpes de caño, 4 ruedas en sus huesos ----------
// Huesos: 0 carrocería, 1..4 ruedas (giran en el ciclo "walk": la VAT avanza con la velocidad real).
const FR_W: V3[] = [[-0.42, 0.24, 0.55], [0.42, 0.24, 0.55], [-0.42, 0.24, -0.55], [0.42, 0.24, -0.55]];
const FR_K = 1.3; // largo del GLB viejo (2,6 m): escala calibrada con glbStats/bounding box, el colisionador no cambia
export function frictionBody() {
  const { G, done, strut, bone } = kit();
  const orange = toy("frNaranja", "#d8531c", { rough: 0.45, coat: 0.4 }), cream = toy("frCrema", "#eadbb4", { rough: 0.6 }), bronze = toy("frLaton", "#c89a3c", { rough: 0.4, metal: 0.8 }), dark = toy("frOscuro", "#2a2624", { rough: 0.7 }), steel = toy("frAcero", "#8a8782", { rough: 0.4, metal: 0.8 }), glass = toy("frVidrio", "#9fd0e0", { rough: 0.1, metal: 0.1 }), lamp = toy("frFaro", "#ffc050", { glow: true });
  G.box(0.7, 0.06, 1.5, dark, [0, 0.16, 0]); // chasis
  G.box(0.8, 0.22, 1.7, orange, [0, 0.3, 0]); // carrocería
  G.box(0.66, 0.2, 0.7, orange, [0, 0.5, -0.12]); // cabina
  G.box(0.56, 0.16, 0.03, glass, [0, 0.52, 0.25], [-0.5, 0, 0]); // parabrisas
  G.box(0.6, 0.04, 0.16, orange, [0, 0.52, -0.84]); for (const s of [-1, 1]) G.box(0.03, 0.14, 0.08, dark, [s * 0.26, 0.46, -0.84]); // alerón
  for (const x of [-0.14, 0.14]) { G.box(0.1, 0.012, 1.62, cream, [x, 0.412, 0], undefined); G.box(0.1, 0.012, 0.5, cream, [x, 0.612, -0.12]); } // franjas crema saltadas
  for (const sx of [-1, 1]) { for (const z of [-0.42, 0.18]) { strut([sx * 0.32, 0.55, z], [sx * 0.32, 0.92, z], 0.045, 0.045, bronze); } strut([sx * 0.32, 0.92, -0.42], [sx * 0.32, 0.92, 0.18], 0.045, 0.045, bronze); } // jaula antivuelco
  for (const z of [-0.42, 0.18]) strut([-0.32, 0.92, z], [0.32, 0.92, z], 0.045, 0.045, bronze);
  strut([-0.38, 0.24, 0.9], [0.38, 0.24, 0.9], 0.06, 0.06, steel); // paragolpes
  for (const s of [-1, 1]) G.box(0.12, 0.08, 0.03, lamp, [s * 0.26, 0.32, 0.86]);
  G.box(0.08, 0.08, 0.2, steel, [0.3, 0.2, -0.88]); // escape
  FR_W.forEach((p, i) => { bone(i + 1); G.wheel(p, undefined, 0.54, 0.26); });
  return done(2, FR_K);
}
export function frictionPose(_vis: number, walk: number, atk: number) {
  const out = [B.Matrix.RotationX(-0.12 * Math.sin(atk * Math.PI))];
  for (const [x, y, z] of FR_W) out.push(piv(new B.Vector3(x * FR_K, y * FR_K, z * FR_K), B.Matrix.RotationX(walk * Math.PI * 2)));
  return out;
}

/** Bichos procedurales con caminata horneada (glb.ts los trata como un GLB más). */
export const PROC: Record<string, { build: (vis: number) => B.Mesh[]; bones: number; pose: (vis: number, walk: number, atk: number) => B.Matrix[] }> = {
  ...Object.fromEntries(Object.entries(BUGS).map(([n, o]) => [n, { build: (v: number) => antBody(v, o), bones: 8, pose: (v: number, w: number, a: number) => antPose(v, w, a, o.k) }])),
  polilla: { build: mothBody, bones: 3, pose: mothPose },
  robot: { build: robotBody, bones: 5, pose: robotPose },
  friccion: { build: frictionBody, bones: 5, pose: frictionPose },
  rey: { build: reyBody, bones: 2, pose: reyPose },
  tarantula: { build: tarantulaBody, bones: 2, pose: tarantulaPose },
  cortadora: { build: cortadoraBody, bones: 5, pose: cortadoraPose },
  aspiradora: { build: aspiradoraBody, bones: 3, pose: aspiradoraPose },
  cortacercos: { build: cortacercosBody, bones: 2, pose: cortacercosPose },
  grua: { build: gruaBody, bones: 3, pose: gruaPose },
};

// ---------- Buggy: piso, bañera y trompa pintadas (pintura del garaje), guardabarros amarillos, jaula de caño, motor con rejilla ----------
// Paramétrico: cada medida sale del genoma (src/car_genes.ts); con el genoma original da los mismos números que antes.
/** `paint`: material de la pintura del jugador (se sigue gastando en partida). `lamp`: color de las ópticas. Origen = altura del eje. */
export function buggyHull(paint: B.Material, lamp: string, q: Genome = genome("buggy")) {
  const { G, done, strut } = kit();
  const dark = FOLD.dark(), yel = FOLD.painted(PAL.amarillo, 0.7, 91), steel = FOLD.bare();
  const y0 = q.stance, tw = q.tina_ancho, th = q.tina_alto, tl = q.tina_largo, tz = q.tina_z, top = y0 + 0.07 + th; // borde de la bañera
  const fx = q.trocha, fz = q.batalla, wr = q.rueda_d / 2;
  G.box(1.0, q.chasis_alto, q.piso_largo, dark, [0, y0 + 0.03 - q.chasis_alto / 2, 0]); // piso (bandeja con volumen si chasis_alto crece)
  G.box(tw, th, tl, paint, [0, y0 + 0.07 + th / 2, tz]); // bañera
  for (const s of [-1, 1]) G.bend([s * tw / 2, top, tz - tl / 2], [s * tw / 2, top, tz + tl / 2], 0.025, paint);
  const half = (l: number, a: number) => (l / 2) * Math.cos(a), fe0 = 0.92 + half(0.56, 0.3); // trompa: sigue al frente de la bañera (valores originales + delta)
  const nz = 0.92 + (tz + tl / 2 - 0.7) + (half(q.trompa_largo, q.trompa_incl) - half(0.56, 0.3)), fe = nz + half(q.trompa_largo, q.trompa_incl);
  G.box(q.trompa_ancho, 0.12, q.trompa_largo, paint, [0, y0 + 0.2, nz], [q.trompa_incl, 0, 0]);
  for (const sd of [-1, 1]) G.decal([sd * (tw / 2 + 0.003), y0 + 0.2, tz - 0.15], [0, -sd * Math.PI / 2, 0], "numero", Math.min(0.22, th * 0.85)); // número a los costados (se lee igual de los dos lados)
  const bz = 1.2 + Math.max(q.piso_largo / 2 - 1.0, fe - fe0), bw = q.paragolpe_ancho / 2; // paragolpes
  G.box(q.paragolpe_ancho, 0.1, 0.08, FOLD.rubber(), [0, y0 + 0.1, bz]); strut([-bw * 0.84, y0 + 0.1, bz], [-0.3, y0 + 0.06, bz - 0.25], 0.04, 0.04, steel); strut([bw * 0.84, y0 + 0.1, bz], [0.3, y0 + 0.06, bz - 0.25], 0.04, 0.04, steel);
  const lw = q.faro_ancho, lz = bz - 0.03; // ópticas
  for (const s of [-1, 1]) { G.box(lw, lw * 0.6, 0.03, FOLD.emissive(lamp), [s * q.faro_x, y0 + 0.24, lz]); G.box(lw * 1.4, lw, 0.04, dark, [s * q.faro_x, y0 + 0.24, lz - 0.02]); }
  const mz = q.motor_z, mh = q.motor_alto, my = y0 + 0.31 + mh / 2; // motor
  const mw = q.motor_ancho, el = q.escape_largo;
  G.box(mw, mh, 0.42, dark, [0, my, mz]);
  G.grate([0, my, mz - 0.22], undefined, 0.5 + (mw - 0.62), 0.18 + (mh - 0.22) * 0.82, 4, steel);
  G.trimStrip([0, y0 + 0.1, -q.piso_largo / 2 - 0.06], undefined, 0.9, 0.08, "hazard", 0.03);
  for (const s of [-1, 1]) G.cyl(q.escape_d, el, steel, [s * (0.2 + (mw - 0.62) / 2), my, mz - 0.36 - (el - 0.3) / 2], [Math.PI / 2 + q.escape_alza * 2, 0, 0], 6); // escapes
  G.box(0.36, 0.28, 0.06, dark, [0, y0 + 0.46, -0.24], [-0.2, 0, 0]); G.box(0.36, 0.06, 0.3, dark, [0, y0 + 0.34, -0.1]); // butaca
  const hoop = (z: number, h: number, w: number) => { // arco de la jaula: de la bañera a h, inclinado hacia atrás por jaula_rake
    const zt = z - q.jaula_rake;
    strut([-tw / 2 + 0.01, top, z], [-w, y0 + h, zt], 0.05, 0.05, steel); strut([tw / 2 - 0.01, top, z], [w, y0 + h, zt], 0.05, 0.05, steel); strut([-w, y0 + h, zt], [w, y0 + h, zt], 0.05, 0.05, steel);
    return zt;
  };
  const rz = hoop(-0.42, q.jaula_alto, q.jaula_ancho), fw = q.jaula_ancho - 0.06, fzz = hoop(0.3, q.jaula_frente, fw);
  strut([-q.jaula_ancho, y0 + q.jaula_alto, rz], [-fw, y0 + q.jaula_frente, fzz], 0.04, 0.04, steel); strut([q.jaula_ancho, y0 + q.jaula_alto, rz], [fw, y0 + q.jaula_frente, fzz], 0.04, 0.04, steel);
  if (q.barra_luces > 0.03) { // barra de luces sobre el arco delantero de la jaula: caja amarilla con cuatro focos emisivos al frente; 0 = sin barra
    const bh = q.barra_luces, bw2 = fw + 0.04, by = y0 + q.jaula_frente + bh / 2 + 0.03;
    G.box(bw2 * 2, bh, 0.1, yel, [0, by, fzz + 0.02]);
    for (const x of [-0.75, -0.25, 0.25, 0.75]) G.box(bw2 * 0.4, bh * 0.6, 0.04, FOLD.emissive(lamp), [x * bw2, by, fzz + 0.09]);
  }
  if (q.snorkel_alto > 0.05) { // snorkel de acero: caño vertical al costado derecho de la bañera y codo hacia adelante con la toma; 0 = sin snorkel
    const sh = q.snorkel_alto, sx = tw / 2 + 0.05, sz = tz + tl / 2 - 0.25;
    G.cyl(0.07, sh + 0.1, steel, [sx, top + sh / 2 - 0.05, sz], undefined, 8); G.cyl(0.11, 0.1, dark, [sx, top + sh + 0.03, sz + 0.06], [Math.PI / 2, 0, 0], 8);
    strut([sx, top + sh, sz], [sx, top + sh, sz + 0.1], 0.07, 0.07, steel);
  }
  const R = q.guarda_radio, arc = q.guarda_arco;
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { // guardabarros + soporte + amortiguador
    for (let i = 0; i < 4; i++) { const a = arc * (i / 1.5 - 1); G.box(q.guarda_ancho, 0.025, 0.25 * (R * arc) / (0.47 * 0.75), yel, [x * fx, R * Math.cos(a), z * fz + R * Math.sin(a)], [a, 0, 0]); } // guardabarros en arco (4 placas)
    strut([x * tw / 2 - x * 0.01, y0 + 0.3, z * fz], [x * (fx - q.guarda_ancho * 0.4), 0.45 + (R - 0.47), z * fz], 0.05, 0.03, steel);
    strut([x * Math.min(0.38, tw / 2), y0 + 0.1, z * fz], [x * (fx - q.rueda_w / 2 - 0.02), 0.0, z * fz], 0.04, 0.04, steel); // brazo de suspensión
    strut([x * Math.min(0.38, tw / 2), top, z * (fz - 0.12)], [x * (fx - q.rueda_w / 2 - 0.04), Math.min(0.06, wr * 0.15), z * (fz - 0.06)], q.amort_grosor, q.amort_grosor, yel); // amortiguador
  }
  return done(2);
}
/** Rueda Folded (eje en x): banda con tacos, llanta de acero pintada con el color de llanta del garaje, maza con tornillos. */
export function foldWheel(d: number, w: number, rim: string) {
  const { G, done } = kit();
  G.wheel([0, 0, 0], undefined, d, w);
  G.cyl(d * 0.5, w * 1.06, FOLD.painted(rim, 0.6, 92), [0, 0, 0], [0, 0, Math.PI / 2], 8);
  return done(3);
}

// ---------- Escenario: tramo de cerca de chapa acanalada (2 m de ancho, 7 de alto, como el tablón que reemplaza) ----------
export function fencePanel() {
  // ~110 triángulos: la cerca rodea el patio con cientos de instancias (con remaches de verdad eran 460k triángulos)
  const { G, done } = kit();
  const sheet = FOLD.painted("#42A5F5", 0.2, 101); // chapa pintada de juguete, sin óxido
  G.box(2.0, 6.6, 0.06, sheet, [0, 3.5, 0]);
  for (let i = 0; i < 4; i++) G.box(0.16, 6.6, 0.16, sheet, [-0.6 + i * 0.4, 3.5, 0]); // canales (asoman de las dos caras)
  for (const y of [0.4, 6.0]) G.trimStrip([0, y, 0], undefined, 2.08, 0.22, "remaches", 0.24); // rieles remachados (trim)
  G.box(0.22, 7.2, 0.22, FOLD.painted("#9E9E9E", 0.2, 103), [-1.0, 3.6, 0]); // poste
  G.box(2.0, 0.3, 0.5, FOLD.painted(PAL.metalOsc, 0.8, 102), [0, 6.9, 0]); // tapa (la misma que el tablón)
  return done();
}

// ---------- Prop: detalle de caja de chapa (unidad 1×1×1 centrada; se escala al tamaño de la caja, que sigue siendo el colisionador) ----------
export function crateDetail() {
  const { G, done } = kit();
  const strap = FOLD.painted("#424d53", 0.32, 111), lip = FOLD.painted("#293238", 0.28, 112);
  for (const y of [-0.38, 0.38]) G.box(1.03, 0.07, 1.03, strap, [0, y, 0]); // flejes
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) G.box(0.06, 1.02, 0.06, lip, [x * 0.5, 0, z * 0.5]); // cantoneras
  for (const s of [-1, 1]) {
    G.box(0.8, 0.02, 0.1, lip, [0, 0.51, s * 0.42]); // pestañas de la tapa
    G.rivets([-0.4, 0.38, s * 0.517], [0.4, 0.38, s * 0.517], 5, [0, 0, s]); G.rivets([s * 0.517, -0.38, -0.4], [s * 0.517, -0.38, 0.4], 5, [s, 0, 0]);
  }
  G.decal([0, 0, -0.505], undefined, "warning", 0.42);
  G.decal([0.505, 0.02, 0], [0, -Math.PI / 2, 0], "numero", 0.4);
  return done(14);
}

// ---------- Jefes sin clips (rey, tarántula, cortadora, aspiradora, cortacercos) ----------
// Mismas proporciones que el procedural viejo de models.ts (que ya calzaba con el GLB y el colisionador): se arman en esa unidad y
// done() los lleva a escala (S). Las patas de rey y tarántula siguen siendo instancias aparte (LEGS, foldLeg).
const BOSS_S = { rey: 3.5, tarantula: 3, cortadora: 1.22, aspiradora: 1.22, cortacercos: 1.22 } as const;

/** Escarabajo rey: élitros dorados de chapa con costura soldada, faldón remachado, cabeza con corona de placas y cuerno. Huesos: 0 cuerpo, 1 cabeza. */
export function reyBody() {
  const { G, done, strut, bone, add } = kit();
  const gold = FOLD.painted("#a8702a", 0.4, 131), gold2 = FOLD.painted("#8a5420", 0.4, 133), dark = FOLD.painted("#3a2a1c", 0.8, 132), steel = FOLD.bare(), bronze = FOLD.painted(BRONZE, 0.6, 134), eye = FOLD.emissive("#ff7a1a"), red = FOLD.painted("#b02418", 0.7, 135), cream = FOLD.painted(CREAM, 0.85, 136);
  along(G, 1.2, 1.5, 2.5, dark, [0, 0.55, -0.25], 6); // vientre
  for (const s of [-1, 1]) { // élitros: dos cúpulas de chapa con nervios, remaches en el borde y parches crema
    ell(add, dark, [s * 0.5, 0.78, -0.25], [1.04, 1.44, 2.6], 10, 0.5); // base oscura bajo las placas
    elytra(G, add, s < 0 ? [gold, FOLD.painted("#b88034", 0.4, 138)] : [gold2, FOLD.painted("#9a6228", 0.4, 139)], steel, [s * 0.5, 0.82, -0.25], [0.54, 0.75, 1.35], 5); // placas en teja + nervios
    for (const z of [-1.05, -0.55, -0.05, 0.45]) { const f = (z + 0.25) / 1.35, k = Math.sqrt(1 - f * f); rib(G, steel, z, 0.52 * k, 0.75 * k, [s * 0.5, 0.82], 0.035); G.rivets([s * (0.5 + 0.52 * k), 0.84, z], [s * (0.5 + 0.52 * k), 0.84, z], 1, [s, 0.3, 0]); }
    G.box(0.5, 0.02, 0.6, cream, [s * 0.62, 1.38, -0.5], [0, 0, s * 0.5]);
  }
  G.bend([0, 1.2, -1.5], [0, 1.58, -0.1], 0.07, steel); // costura soldada
  G.bend([0, 1.58, -0.1], [0, 1.4, 0.95], 0.07, steel);
  ell(add, gold2, [0, 0.95, 0.8], [1.5, 0.95, 1.0], 10, 0.5); // pronoto
  G.rivets([-0.5, 1.35, 0.75], [0.5, 1.35, 0.75], 5, [0, 1, 0]);
  bone(1);
  ell(add, dark, [0, 0.56, 1.2], [1.06, 0.7, 0.86], 10); // cabeza redondeada
  G.box(0.86, 0.1, 0.6, bronze, [0, 0.9, 1.18]); // visera
  G.sph(0.16, steel, [0, 1.12, 1.05]); G.box(1.0, 0.12, 0.6, bronze, [0, 1.0, 1.1]); // aro de la corona
  for (let i = 0; i < 5; i++) G.box(0.14, 0.3 + (i === 2 ? 0.14 : 0), 0.05, bronze, [-0.36 + i * 0.18, 1.2 + (i === 2 ? 0.07 : 0), 1.08], [0.15, 0, 0]); // puntas de la corona
  for (const i of [0, 2, 4]) G.sph(0.14, red, [-0.36 + i * 0.18, 1.0 + (i === 2 ? 0.28 : 0.16) + 0.1, 1.1]); // gemas
  for (const s of [-1, 1]) { G.sph(0.3, FOLD.painted("#0c0a0a", 0.2, 137), [s * 0.34, 0.66, 1.55]); G.sph(0.11, eye, [s * 0.4, 0.69, 1.76]); G.tube([[s * 0.28, 0.36, 1.5], [s * 0.52, 0.28, 1.95], [s * 0.2, 0.28, 2.3]], 0.1, bronze); } // mandíbulas curvas
  G.tube([[0, 0.7, 1.6], [0, 0.82, 2.0], [0, 1.05, 2.2], [0, 1.3, 2.08]], 0.07, dark); // cuerno curvo corto, oscuro
  bone(0);
  return done(5, BOSS_S.rey);
}
const bossBob = (walk: number, k: number) => B.Matrix.Translation(0, k * Math.abs(Math.sin(walk * Math.PI * 2)), 0);
export function reyPose(_v: number, walk: number, atk: number) {
  const S = BOSS_S.rey, body = bossBob(walk, 0.04 * S), lunge = Math.sin(atk * Math.PI);
  return [body, piv(new B.Vector3(0, 0.6 * S, 0.85 * S), B.Matrix.RotationX(0.35 * lunge - 0.06 * Math.sin(walk * Math.PI * 4))).multiply(body)];
}

/** Tarántula: cefalotórax de chapa con placa, abdomen en prisma con faja naranja y placa dorsal, quelíceros de acero, racimo de ojos. Huesos: 0 cuerpo, 1 abdomen. */
export function tarantulaBody() {
  const { G, done, strut, bone, add } = kit();
  const hair = FOLD.painted("#2a1a14", 0.85, 141), dark = FOLD.painted("#2a1a14", 0.8, 142), band = FOLD.painted("#a8461a", 0.85, 143), eye = FOLD.emissive("#d8300e"), tip = FOLD.painted("#d8661e", 0.85, 144);
  G.box(1.0, 0.5, 1.1, dark, [0, 0.5, 0.32]); // cefalotórax
  ell(add, hair, [0, 0.74, 0.3], [0.96, 0.4, 1.0], 8, 0.5); // cúpula del cefalotórax bajo el pelo
  for (let i = 0; i < 40; i++) { const a = i * 2.4, r = 0.18 + 0.4 * ((i * 0.618) % 1), x = Math.cos(a) * r * 0.9, z = 0.3 + Math.sin(a) * r; tuft(G, i % 3 ? hair : dark, i % 2 ? tip : undefined, [x, 0.8 + (0.4 - r * 0.3) * 0.3, z], [x * 0.4, 0.6, (z - 0.3) * 0.4 - 0.9], 0.1, 0.14); } // mechones del cefalotórax
  for (const s of [-1, 1]) G.bend([s * 0.5, 0.75, -0.2], [s * 0.5, 0.75, 0.86], 0.04, dark);
  along(G, 0.24, 0.28, 0.3, FOLD.dark(), [0, 0.55, -0.32]); // cintura
  for (const s of [-1, 1]) {
    strut([s * 0.18, 0.42, 0.86], [s * 0.16, 0.16, 1.08], 0.14, 0.16, FOLD.bare()); // quelícero
    strut([s * 0.36, 0.42, 0.8], [s * 0.42, 0.3, 1.22], 0.1, 0.1, dark); // pedipalpo
  }
  for (const [x, y, z, sz] of [[0.14, 0.84, 0.74, 0.1], [-0.14, 0.84, 0.74, 0.1], [0.3, 0.78, 0.66, 0.07], [-0.3, 0.78, 0.66, 0.07], [0, 0.88, 0.62, 0.06]]) G.box(sz, sz, sz, eye, [x, y, z]);
  bone(1);
  const cz = -1.12, R: V3 = [0.7, 0.68, 1.05]; // abdomen ovalado (elipsoide) con dibujo
  const AY = 1.0; // abdomen alzado (como en ref171) para que asome por encima del cefalotórax en la ficha
  ell(add, hair, [0, AY, cz], [R[0] * 2, R[1] * 2, R[2] * 2], 10);
  for (const t of [-0.55, 0.0, 0.5]) { const k = Math.sqrt(1 - t * t) * 1.03; G.cyl(R[0] * 2 * k, 0.13, band, [0, AY, cz + R[2] * t], [Math.PI / 2, 0, 0], 10, R[0] * 2 * k); } // fajas
  G.decal([0, AY + R[1] * 1.0, cz + 0.05], [Math.PI / 2 - 0.05, 0, 0], "calavera", 0.55);
  for (let i = 0; i < 80; i++) { // mechones cortos y anchos, echados hacia atrás: espiral sobre la mitad de arriba y los flancos, oscuros con punta naranja
    const u = -0.95 + 1.9 * ((i * 0.618) % 1), ph = Math.PI * 0.08 + ((i * 0.37) % 1) * Math.PI * 0.84, k = Math.sqrt(1 - u * u);
    const n: V3 = [Math.cos(ph) * k, Math.sin(ph) * k, u], p: V3 = [n[0] * R[0] * 0.94, AY + n[1] * R[1] * 0.94, cz + n[2] * R[2] * 0.94];
    for (const sx of [-1, 1]) tuft(G, i % 3 ? hair : dark, i % 2 ? tip : undefined, [p[0] * sx, p[1], p[2]], [n[0] * sx * 0.4, n[1] * 0.5, n[2] * 0.3 - 0.9], 0.11, 0.16);
  }
  G.cyl(0.24, 0.2, FOLD.dark(), [0, 0.62, -2.0], [Math.PI / 2, 0, 0], 6); // hileras
  bone(0);
  return done(5, BOSS_S.tarantula);
}
export function tarantulaPose(_v: number, walk: number, atk: number) {
  const S = BOSS_S.tarantula, body = bossBob(walk, 0.03 * S);
  return [body, piv(new B.Vector3(0, 0.6 * S, -0.32 * S), B.Matrix.RotationX(-0.08 * Math.sin(walk * Math.PI * 2) - 0.4 * Math.sin(atk * Math.PI))).multiply(body)];
}

/** Cortadora de césped: plataforma de corte, capó rojo plegado, asiento, volante, manija y 4 ruedas en sus huesos (1..4). */
const CUT_W: V3[] = [[-2.95, 0.88, 2.35], [2.95, 0.88, 2.35], [-2.95, 0.88, -2.55], [2.95, 0.88, -2.55]];
export function cortadoraBody() {
  const { G, done, strut, bone } = kit();
  const red = FOLD.painted("#a8281c", 0.95, 151), red2 = FOLD.dark(), deck = FOLD.painted("#6e7076", 0.85, 153), blade = FOLD.painted("#a0a4ac", 0.9, 155), dark = FOLD.dark(), steel = FOLD.bare(), yel = FOLD.painted("#c62828", 0.6, 154);
  G.cyl(5.8, 1.0, deck, [0, 0.82, -0.15], undefined, 12, 6.2); // plataforma de corte
  G.box(6.4, 0.35, 2.2, dark, [0, 0.42, 2.85]); // boca
  G.trimStrip([0, 0.58, 3.97], [0, Math.PI, 0], 6.2, 0.4, "hazard", 0.1); // barra de corte
  G.box(4.8, 1.1, 4.4, red, [0, 1.85, -0.3]); // capó
  G.box(4.8, 0.12, 2.4, red, [0, 2.62, 0.75], [0.5, 0, 0]); // trompa inclinada
  for (const s of [-1, 1]) { G.bend([s * 2.4, 2.4, -2.5], [s * 2.4, 2.4, 1.9], 0.08, red); G.decal([s * 2.42, 1.85, -0.6], [0, -s * Math.PI / 2, 0], "numero", 1.0); }
  G.grate([0, 1.85, 1.92], [0, Math.PI, 0], 2.6, 0.8, 5, steel); // parrilla
  G.decal([1.6, 2.0, 1.93], [0, Math.PI, 0], "warning", 0.7);
  G.box(2.2, 0.55, 1.4, red2, [0, 2.65, -1.0]); // asiento
  G.box(2.2, 1.1, 0.2, red2, [0, 3.2, -1.7], [-0.15, 0, 0]);
  G.cyl(0.2, 1.0, steel, [0, 2.9, 0.6], [0.5, 0, 0], 6); G.cyl(2.0, 0.16, dark, [0, 3.35, 0.85], [0.5, 0, 0], 10); // volante
  strut([-1, 3.4, 0.85], [1, 3.4, 0.85], 0.1, 0.1, steel);
  G.tube([[-2, 2.35, -2.95], [-2, 5.2, -5.2], [-2, 7.8, -6.35], [2, 7.8, -6.35], [2, 5.2, -5.2], [2, 2.35, -2.95]], 0.2, dark); // manija
  for (const s of [-1, 1]) G.box(0.85, 0.12, 3.6, yel, [s * 2.55, 1.35, -0.1]); // estribos
  G.rivets([-2.3, 1.32, 2.5], [2.3, 1.32, 2.5], 9, [0, 0, 1]);
  G.rivets([-2.2, 2.45, 1.95], [2.2, 2.45, 1.95], 8, [0, 1, 0.3]);
  for (const s of [-1, 1]) { G.cyl(3.0, 0.12, blade, [s * 2.0, 0.45, 4.3], undefined, 14); G.cyl(0.6, 0.2, FOLD.rust(), [s * 2.0, 0.5, 4.3], undefined, 6); for (let k = 0; k < 6; k++) { const a = k * 1.05; G.box(0.5, 0.1, 0.3, steel, [s * 2.0 + Math.cos(a) * 1.5, 0.45, 4.3 + Math.sin(a) * 1.5], [0, -a, 0]); } } // cuchillas circulares a la vista
  CUT_W.forEach((p, i) => { bone(i + 1); G.wheel(p, undefined, 2.0, 0.85); G.cyl(1.05, 0.9, yel, p, [0, 0, Math.PI / 2], 8); });
  return done(8, BOSS_S.cortadora);
}
export function cortadoraPose(_v: number, walk: number, atk: number) {
  const S = BOSS_S.cortadora, out = [B.Matrix.RotationX(-0.05 * Math.sin(atk * Math.PI))];
  for (const [x, y, z] of CUT_W) out.push(piv(new B.Vector3(x * S, y * S, z * S), B.Matrix.RotationX(walk * Math.PI * 2)));
  return out;
}

/** Aspiradora robot: disco de chapa con paragolpes de goma, domo, torreta con faro, sensores y 2 cepillos laterales que giran (huesos 1-2). */
export function aspiradoraBody() {
  const { G, done, bone } = kit();
  const shell = FOLD.painted("#a4a8ae", 0.95, 161), orange = FOLD.painted("#b8602a", 0.95, 163), dark = FOLD.dark(), steel = FOLD.bare(), red = FOLD.emissive("#ff2a1a");
  G.cyl(6.45, 0.45, FOLD.rubber(), [0, 0.48, 0], undefined, 16); // paragolpes
  G.cyl(6.15, 0.75, shell, [0, 0.62, 0], undefined, 16, 6.45); // casco
  G.cyl(3.0, 0.5, shell, [0, 1.25, 0], undefined, 12, 4.2); // domo
  G.cyl(5.4, 0.16, orange, [0, 1.04, 0], undefined, 16);
  for (const [x, z] of [[-1.8, -1.2], [1.6, 1.4], [0.4, -2.4]]) G.cyl(1.2, 0.04, orange, [x, 1.5, z], undefined, 8); // óxido naranja
  G.cyl(1.5, 0.3, dark, [0, 1.62, 0], undefined, 12); G.cyl(1.0, 0.35, red, [0, 1.9, 0], undefined, 12); // botón rojo central
  G.grate([0, 1.6, -2.3], undefined, 2.4, 0.5, 4, steel); // salida de aire
  G.box(3.6, 0.38, 0.55, dark, [0, 0.32, 3.05]); // barra de sensores
  for (const s of [-1, 1]) { G.cyl(0.62, 0.12, steel, [s * 1.05, 0.88, 3.08], [Math.PI / 2, 0, 0], 10); G.cyl(0.5, 0.2, red, [s * 1.05, 0.88, 3.14], [Math.PI / 2, 0, 0], 10); G.decal([s * 2.4, 1.1, 2.0], [0.3, s * 2.4, 0], "voltaje", 0.9); }
  G.box(3.4, 0.7, 0.5, dark, [0, 1.12, 2.55], [-0.35, 0, 0]); // visor oscuro al frente (cara)
  for (const s of [-1, 1]) { G.cyl(1.0, 0.18, steel, [s * 0.95, 1.2, 2.78], [Math.PI / 2 - 0.35, 0, 0], 12); G.cyl(0.75, 0.22, FOLD.emissive("#ffb020"), [s * 0.95, 1.2, 2.86], [Math.PI / 2 - 0.35, 0, 0], 12); } // ojos
  G.grate([0, 0.5, 3.32], undefined, 2.6, 0.3, 5, steel); // boca: rejilla del paragolpes
  G.rivets([-2.6, 1.0, -2.9], [2.6, 1.0, -2.9], 9, [0, 0.3, -1]);
  [-1, 1].forEach((s, i) => { // cepillos
    bone(i + 1);
    G.cyl(0.4, 0.3, steel, [s * 2.75, 0.3, 2.45], undefined, 6);
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; G.box(0.16, 0.08, 1.9, FOLD.plastic("#9ca3af"), [s * 2.75 + Math.sin(a) * 0.9, 0.18, 2.45 + Math.cos(a) * 0.9], [0, a, 0]); }
  });
  bone(0);
  return done(8, BOSS_S.aspiradora);
}
export function aspiradoraPose(_v: number, walk: number, atk: number) {
  const S = BOSS_S.aspiradora, body = B.Matrix.Scaling(1, 1 - 0.06 * Math.sin(atk * Math.PI), 1);
  return [body, ...[-1, 1].map((s) => piv(new B.Vector3(s * 2.75 * S, 0, 2.45 * S), B.Matrix.RotationY(s * walk * Math.PI * 2)))];
}

/** Cortacercos eléctrico: motor naranja plegado, mango en D de caño, espada con dientes que van y vienen (hueso 1), ojos y cable. */
export function cortacercosBody() {
  const { G, done, strut, bone } = kit();
  const body = FOLD.painted("#6a5a2a", 0.95, 171), dark = FOLD.dark(), steel = FOLD.bare(), orange = FOLD.painted("#a8481c", 0.9, 172);
  G.box(2.65, 1.65, 3.2, body, [0, 1.12, -2.75]); // motor
  G.box(2.3, 0.5, 2.8, body, [0, 2.1, -2.75]); for (const s of [-1, 1]) G.bend([s * 1.15, 2.35, -4.15], [s * 1.15, 2.35, -1.35], 0.1, body);
  G.box(2.7, 0.55, 2.6, dark, [0, 0.42, -2.7]); // base
  for (const s of [-1, 1]) { G.grate([s * 1.34, 1.2, -2.8], [0, -s * Math.PI / 2, 0], 1.8, 0.7, 4, steel); G.decal([s * 1.335, 1.75, -2.0], [0, -s * Math.PI / 2, 0], "voltaje", 0.7); }
  G.box(0.55, 0.35, 1.1, orange, [0, 1.05, -1.35]); // cuello
  G.tube([[0, 1.6, -1.15], [0, 2.9, -0.95], [0, 2.9, -0.35], [0, 1.4, -0.3]], 0.16, dark); // mango en D
  G.tube([[0, 1.75, -4.25], [0, 2.85, -4.85], [0, 2.55, -5.35], [0, 1.35, -5.05]], 0.22, dark); // manija trasera
  G.box(2.0, 1.0, 0.2, dark, [0, 1.9, -1.1]); G.grate([0, 1.2, -1.1], [0, Math.PI, 0], 1.6, 0.5, 4, steel); // frente: cara oscura con parrilla
  for (const s of [-1, 1]) { G.cyl(0.85, 0.2, steel, [s * 0.62, 1.95, -0.98], [Math.PI / 2, 0, 0], 10); G.cyl(0.65, 0.25, FOLD.emissive("#ff8a1a"), [s * 0.62, 1.95, -0.9], [Math.PI / 2, 0, 0], 10); G.cyl(0.8, 0.2, steel, [s * 1.38, 1.7, -1.5], [0, 0, Math.PI / 2], 10); G.cyl(0.6, 0.25, FOLD.emissive("#ff8a1a"), [s * 1.45, 1.7, -1.5], [0, 0, Math.PI / 2], 10); } // faros al frente y en los flancos (la ficha lo mira de costado)
  for (const s of [-1, 1]) { // dos espadas (ref271), más cortas que el motor para que la ficha entre en cuadro
    G.box(0.7, 0.28, 3.4, steel, [s * 0.8, 0.92, 0.5]); G.box(0.42, 0.22, 3.1, FOLD.painted("#6b7280", 0.8, 173), [s * 0.8, 0.78, 0.5]);
  }
  G.trimStrip([0, 1.07, -1.0], [Math.PI / 2, 0, 0], 2.2, 0.5, "hazard", 0.02);
  for (const s of [-1, 1]) for (const z of [-1.5, -2.75, -4.0]) { // patas de insecto: fémur, rodilla y tibia al piso
    strut([s * 1.3, 1.0, z], [s * 2.1, 1.6, z + 0.3], 0.2, 0.2, orange); G.sph(0.3, steel, [s * 2.1, 1.6, z + 0.3]); strut([s * 2.1, 1.6, z + 0.3], [s * 2.9, 0.15, z + 0.55], 0.16, 0.16, dark);
  }
  G.tube([[0, 0.92, -4.25], [0, 0.28, -4.95], [0.75, 0.08, -5.65]], 0.16, dark); // cable
  bone(1);
  for (let i = 0; i < 5; i++) for (const c of [-1, 1]) for (const s of [-1, 1]) G.box(0.36, 0.18, 0.28, steel, [c * 0.8 + s * 0.44, 0.92, -0.15 + i * 0.7], [0, s * 0.4, 0]); // dientes de las dos espadas
  bone(0);
  return done(8, BOSS_S.cortacercos);
}
export function cortacercosPose(_v: number, walk: number, atk: number) {
  const S = BOSS_S.cortacercos;
  return [B.Matrix.RotationX(-0.08 * Math.sin(atk * Math.PI)), B.Matrix.Translation(0, 0, 0.22 * S * Math.sin(walk * Math.PI * 8))];
}

const GRUA_S = 1.7; // vitrina grande (ref302)
/** Máquina de garra de feria: gabinete de premios, pórtico y pinza suspendida. Huesos: cuerpo, cable y dedos. */
export function gruaBody() {
  const { G, done, bone } = kit();
  const orange = FOLD.painted("#c85a1c", 0.95, 181), yellow = FOLD.painted("#c8902a", 0.9, 182);
  const dark = FOLD.dark(), steel = FOLD.bare(), glass = FOLD.glass();
  G.foldBox([0, 0.18, 0], undefined, 2.8, 0.72, 2.45, orange);
  for (const x of [-1.17, 1.17]) G.wheel([x, 0.2, 0.05], undefined, 0.42, 0.22);
  G.box(0.24, 2.05, 0.2, yellow, [-1.23, 1.87, 1.12]); G.box(0.24, 2.05, 0.2, yellow, [1.23, 1.87, 1.12]);
  G.box(2.7, 0.24, 0.2, orange, [0, 2.9, 1.12]); G.box(2.7, 0.2, 0.2, orange, [0, 0.83, 1.12]);
  G.box(2.38, 1.82, 0.035, glass, [0, 1.87, 1.105]); G.box(2.45, 1.82, 0.12, dark, [0, 1.87, -0.15]);
  for (const s of [-1, 1]) {
    G.box(0.035, 1.62, 1.14, glass, [s * 1.14, 1.87, 0.47]);
    G.box(0.11, 1.78, 0.1, yellow, [s * 1.18, 1.87, 1.07]); G.box(0.11, 1.78, 0.1, steel, [s * 1.18, 1.87, -0.13]);
    G.box(0.11, 0.1, 1.18, orange, [s * 1.18, 2.79, 0.47]); G.box(0.11, 0.1, 1.18, FOLD.rust(), [s * 1.18, 0.96, 0.47]);
  }
  G.box(2.2, 0.1, 1.1, FOLD.rust(), [0, 0.82, 0.43]); // piso oxidado: los premios apoyan dentro del gabinete
  // 7 peluches de juguete (oso, conejo, bicho azul, dino, patito, dos pelotas): esferas con orejas/ojos simples, apoyados en el piso del gabinete
  const toy = (x: number, z: number, r: number, c: string, kind: "bear" | "bunny" | "dino" | "duck" | "ball" | "blob") => {
    const y = 0.87 + r, m = FOLD.plastic(c);
    G.sph(r, m, [x, y, z]);
    if (kind === "ball") return;
    G.sph(r * 0.7, m, [x, y + r * 0.95, z + r * 0.15]); // cabeza
    for (const e of [-1, 1]) {
      G.sph(0.045, FOLD.dark(), [x + e * r * 0.26, y + r * 1.0, z + r * 0.8]);
      if (kind === "bear" || kind === "blob") G.sph(r * 0.24, m, [x + e * r * 0.55, y + r * 1.55, z]);
      if (kind === "bunny") G.box(r * 0.26, r * 1.1, r * 0.12, m, [x + e * r * 0.3, y + r * 1.9, z], [0, 0, -e * 0.15]);
      if (kind === "dino") G.box(r * 0.2, r * 0.3, r * 0.2, FOLD.plastic("#c8402a"), [x, y + r * 1.45, z - e * r * 0.3]);
    }
    if (kind === "duck") G.box(r * 0.55, r * 0.15, r * 0.4, FOLD.plastic("#e8802a"), [x, y + r * 0.9, z + r * 0.95]);
  };
  toy(-0.55, 0.5, 0.38, "#8a5a30", "bear"); toy(0.5, 0.55, 0.34, "#e060a8", "bunny"); toy(-0.05, 0.2, 0.32, "#3a78d0", "blob"); toy(0.05, 0.78, 0.3, "#4a9a3a", "dino");
  toy(0.8, 0.15, 0.28, "#e8cb42", "duck"); toy(-0.82, 0.12, 0.26, "#7a3ab8", "ball"); toy(0.3, 0.2, 0.24, "#d03a2a", "ball");
  for (const s of [-1, 1]) { G.box(0.55, 0.1, 0.1, FOLD.emissive("#ffc04a"), [s * 0.85, 2.98, 1.25]); G.box(0.16, 0.1, 0.14, FOLD.emissive("#ffb400"), [s * 1.2, 3.28, 0.34]); } // luces del marco
  G.trimStrip([0, 0.94, 1.23], undefined, 2.65, 0.12, "hazard", 0.025);
  G.box(0.56, 0.42, 0.12, dark, [0, 0.45, 1.27]); G.box(0.3, 0.11, 0.04, FOLD.emissive("#ff3b2e"), [0, 0.47, 1.35]);
  for (const s of [-1, 1]) { G.plate([s * 1.22, 1.86, 1.24], undefined, 0.16, 1.65, steel); G.rivets([s * 1.19, 0.98, 1.24], [s * 1.19, 2.72, 1.24], 7, [0, 0, 1]); }
  G.box(0.18, 0.2, 2.55, yellow, [0, 3.05, -0.02]); G.box(2.55, 0.24, 0.28, orange, [0, 3.28, 0.2]);
  G.cyl(0.42, 0.18, steel, [0, 3.08, 0.2], [0, 0, Math.PI / 2], 8);
  for (const s of [-1, 1]) for (const z of [-0.7, 0.1, 0.9]) { // 6 patas mecánicas (fijas)
    G.tube([[s * 1.3, 0.45, z], [s * 1.75, 0.85, z], [s * 2.05, 0.04, z + 0.1]], 0.07, FOLD.painted("#6a4a2a", 0.9, 184)); G.box(0.3, 0.06, 0.3, FOLD.rubber(), [s * 2.05, 0.03, z + 0.1]);
  }
  bone(1);
  G.box(0.08, 0.92, 0.08, dark, [0, 2.58, 0.75]);
  G.cyl(0.32, 0.16, steel, [0, 2.12, 0.75], [Math.PI / 2, 0, 0], 8);
  G.cyl(0.2, 0.16, FOLD.emissive("#ffb400"), [0, 2.0, 0.75], [Math.PI / 2, 0, 0], 8);
  bone(2);
  for (const s of [-1, 1]) G.tube([[0, 2.0, 0.75], [s * 0.34, 1.72, 0.94], [s * 0.28, 1.38, 0.98]], 0.085, steel);
  G.tube([[0, 2.0, 0.75], [0, 1.7, 1.12], [0, 1.39, 1.04]], 0.085, yellow);
  return done(2.2, GRUA_S);
}
export function gruaPose(_vis: number, walk: number, atk: number) {
  const S = GRUA_S, up = Math.sin(atk * Math.PI), body = B.Matrix.Translation(0, 0.025 * S * Math.abs(Math.sin(walk * Math.PI * 2)), 0);
  return [body, piv(new B.Vector3(0, 3.1 * S, 0.2 * S), B.Matrix.Translation(0, -0.2 * S * up, 0).multiply(body)), piv(new B.Vector3(0, 2.0 * S, 0.75 * S), B.Matrix.RotationZ(0.18 + 0.22 * up + 0.035 * Math.sin(walk * Math.PI * 2)).multiply(body))];
}

// ponytail: paleta por color de LEGS (models/enemies.ts, ajeno) para repintar rey y tarántula sin tocar ese archivo; [pata, rodilla, banda].
const LEG_PAL: Record<string, [string, string, string?]> = { "#3c4450": ["#8a5420", "#94642c", "#e8d4a8"], "#4a3228": ["#2a1a14", "#1e130e", "#a8461a"] };
/** Pata articulada Folded (rey, tarántula): fémur y tibia de perfil, rodilla de bisagra emisiva, tobillo y pie de goma. Misma geometría que la vieja (LEGS). */
export function foldLeg(L: { hips: [number, number, number][]; len: number; r: number; color: string; knee?: string }) {
  const { G, done, strut } = kit();
  const pal = LEG_PAL[L.color], hy = L.hips[0][1], leg = toy(pal?.[0] ?? L.color, 0.5, 0.3), steel = pal ? toy(BRONZE, 0.45, 0.8) : toySteel(), knee: V3 = [L.len * 0.48, L.len * 0.32, 0], foot: V3 = [L.len * 0.98, -hy + 0.02, 0.06];
  G.cyl(L.r * 2.4, L.r * 2.4, steel, [-L.r * 0.4, 0, 0], [0, 0, Math.PI / 2], 6); // rótula hacia el caparazón
  G.box(L.r * 2.3, L.r * 2.3, L.r * 2.3, steel, [0, 0, 0]);
  const tar = L.color === "#4a3228"; // tarántula: pata arqueada de 3 segmentos (fémur alto, tibia, metatarso) con codo marcado
  const mid: V3 = [L.len * 0.78, L.len * 0.22, 0], top: V3 = [L.len * 0.34, L.len * 0.66, 0];
  if (tar) { strut([0, 0, 0], top, L.r * 1.9, L.r * 2.3, leg); strut(top, mid, L.r * 1.6, L.r * 1.9, leg); strut(mid, foot, L.r * 1.25, L.r * 1.5, leg); const elbow = toy("#c4601a", 0.5, 0.1); G.sph(L.r * 2.5, elbow, top); G.sph(L.r * 2.0, elbow, mid); } // codos naranja mate
  else { strut([0, 0, 0], knee, L.r * 1.75, L.r * 2.15, leg); strut(knee, foot, L.r * 1.35, L.r * 1.65, leg); }
  if (!tar) G.cyl(L.r * 2.1, L.r * 2.4, pal ? toy(pal[1], 0.45, 0.8) : L.knee ? toyGlow(L.knee) : steel, knee, [Math.PI / 2, 0, 0], 6); // rodilla
  if (tar) { // pelaje: mechones en 4 direcciones a lo largo de los 3 segmentos, oscuros con punta naranja
    const fur = toy(pal[0], 0.75, 0), tp = toy("#d8661e", 0.75, 0), segs: [V3, V3][] = [[[0, 0, 0], top], [top, mid], [mid, foot]];
    segs.forEach(([a, b], si) => { for (let k = 0; k < 3; k++) { const t = 0.2 + k * 0.3, q: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0], f = new B.Vector3(b[0] - a[0], b[1] - a[1], 0).normalize(); for (const d of [[0, 1, 0], [0, 0.6, 1], [0, 0.6, -1]] as V3[]) tuft(G, fur, (k + si) % 2 ? tp : undefined, [q[0], q[1] + L.r * 0.6, d[2] * L.r * 0.7], [d[0] + f.x * 1.5, d[1] + f.y * 1.5, d[2] * 0.6], L.r * 1.15, L.r * 2.0); } });
  } else if (pal) for (const t of [0.3, 0.62, 0.84]) { const a = new B.Vector3(...knee), f = new B.Vector3(...foot), q = B.Vector3.Lerp(a, f, t); G.box(L.r * 1.9, L.r * 1.9, L.r * 1.4, pal[2] ? toy(pal[2], 0.55, 0.1) : leg, [q.x, q.y, q.z], [0, 0, 0.9]); } // bandas / segmentos de la tibia
  G.cyl(L.r * 1.6, L.r * 1.9, steel, [foot[0], foot[1] + L.r * 0.72, foot[2]], [Math.PI / 2, 0, 0], 6); // tobillo
  G.box(L.r * 2.7, L.r * 0.9, L.r * 2.5, toyRubber(), [foot[0], foot[1] + L.r * 0.42, foot[2]]);
  return done(3);
}

// ---------- Mascotas jefe (Felipe el dogo, Eulalio el michu): cuadrúpedos de chapa con clips ----------
// Huesos: 0 torso, 1 cabeza, 2 cola, 3..6 patas (del. izq, del. der, tras. izq, tras. der; rígidas, giran en la cadera).
// Cada clip se hornea con el mismo nombre y largo (cuadros a 24/s) que la acción de Blender que reemplaza: SEQ de enemies.ts
// sigue apuntando a los mismos cuadros (despegue, golpe, final).
type Quad = { hipX: number; hipY: number; hipZ: number; neck: V3; tail: V3; cat: boolean };
const DOG: Quad = { hipX: 1.5, hipY: 4.6, hipZ: 2.6, neck: [0, 7.6, 3.4], tail: [0, 7.0, -3.2], cat: false };
const CAT: Quad = { hipX: 0.9, hipY: 3.6, hipZ: 2.5, neck: [0, 5.4, 3.2], tail: [0, 4.9, -3.0], cat: true };
const QLEGS: [number, number][] = [[1, 1], [-1, 1], [1, -1], [-1, -1]]; // [lado, adelante/atrás]

export function petBody(Q: Quad) {
  const { G, done, strut, bone } = kit();
  const c = Q.cat, coat = FOLD.painted(c ? "#d9782a" : "#7a7f8e", 0.8, c ? 191 : 201), dark = FOLD.painted(c ? "#a8451a" : "#4a4a56", 0.8, c ? 192 : 202);
  const light = FOLD.painted(c ? "#f2e6d0" : "#dccdb0", 0.7, c ? 193 : 203), steel = FOLD.bare(), eye = FOLD.emissive(c ? "#8adf2a" : "#e07a1a"), pink = FOLD.painted("#c8706a", 0.6, 206);
  const { hipX: hx, hipY: hy, hipZ: hz } = Q, tw = c ? 2.0 : 3.4, th = c ? 2.2 : 3.2, tl = c ? 6.0 : 6.4, ty = hy + th * 0.45;
  // Torso: caja de chapa con pechera clara, lomo atornillado y dobleces en las aristas
  G.box(tw, th, tl, coat, [0, ty, 0]);
  G.box(tw * 0.8, th * 0.7, 0.12, light, [0, ty - th * 0.1, tl / 2 + 0.06]);
  if (!c) { G.box(tw * 1.12, th * 0.9, 2.3, coat, [0, ty - 0.1, tl / 2 - 1.3]); G.box(tw * 0.7, th * 0.55, 0.14, light, [0, ty - 0.5, tl / 2 - 0.12]); } // hombros anchos de bulldog y pecho crema
  G.plate([0, ty + th / 2 + 0.01, -0.3], [Math.PI / 2, 0, 0], tw * 0.6, tl * 0.6, dark);
  for (const s of [-1, 1]) {
    G.bend([s * tw / 2, ty + th / 2, -tl / 2], [s * tw / 2, ty + th / 2, tl / 2], 0.08, coat);
    G.rivets([s * (tw / 2 + 0.01), ty - th * 0.35, -tl * 0.4], [s * (tw / 2 + 0.01), ty - th * 0.35, tl * 0.4], 7, [s, 0, 0]);
  }
  if (c) { for (let i = 0; i < 6; i++) G.box(tw + 0.06, 0.5, 0.36, dark, [0, ty + th / 2 - 0.2, -2.5 + i * 0.95]); for (const s of [-1, 1]) for (let i = 0; i < 4; i++) G.box(0.06, 0.45, 0.4, dark, [s * (tw / 2 + 0.02), ty + 0.2, -2 + i * 1.3], [0.4, 0, 0]); } // rayas del tigre: flejes oscuros sobre el lomo y los flancos
  else { G.decal([tw / 2 + 0.01, ty, -0.8], [0, -Math.PI / 2, 0], "numero", 1.2); G.decal([-tw / 2 - 0.01, ty, -0.8], [0, Math.PI / 2, 0], "numero", 1.2); }
  // Cuello y collar
  const [nx, ny, nz] = Q.neck;
  strut([0, ty + th * 0.2, tl / 2 - 0.6], [nx, ny + 0.4, nz + 0.6], c ? 1.1 : 2.6, c ? 1.1 : 2.4, coat);
  G.box(c ? 1.4 : 3.1, 0.5, c ? 1.3 : 2.6, FOLD.painted(c ? "#2f6fd0" : "#c0262a", 0.5, 204), [nx, ny, nz + 0.4], [-0.5, 0, 0]);
  G.box(0.5, 0.5, 0.06, FOLD.painted(PAL.amarillo, 0.4, 205), [nx, ny - 0.5, nz + 0.95]); // chapita
  if (!c) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) G.cyl(0.02, 0.5, steel, [s * (0.5 + i * 0.5), ny + 0.35, nz + 0.2 + (i === 1 ? 0.2 : 0)], undefined, 4, 0.5); // pinches del collar
  if (!c) { // aro del collar y pinches hacia afuera (ref297/308)
    G.tube(Array.from({ length: 9 }, (_, k) => { const a = (k / 8) * Math.PI * 2; return [Math.cos(a) * 0.45, ny - 1.25 + Math.sin(a) * 0.45, nz + 1.55] as V3; }), 0.07, steel);
    for (let i = -3; i <= 3; i++) G.cyl(0.02, 0.5, steel, [i * 0.4, ny + 0.05, nz + 1.55 + Math.abs(i) * -0.12], [Math.PI / 2 - 0.3, 0, 0], 4, 0.3);
  }
  bone(1); // cabeza
  const hy0 = ny + (c ? 1.0 : 1.4), hz0 = nz + (c ? 1.0 : 1.2), hs = c ? 1.9 : 2.4;
  if (!c) { // cabeza de bulldog: ancha y baja, cachetes, hocico chato, mandíbula inferior saliente y boca abierta con colmillos
    const hy1 = ny + 0.5, hz1 = nz + 1.4, red = FOLD.painted("#6a1a1a", 0.6, 208), fang = FOLD.painted("#efe2c4", 0.5, 209);
    G.box(3.7, 2.6, 2.7, coat, [0, hy1, hz1]);
    G.box(0.8, 0.06, 1.8, light, [0, hy1 + 1.32, hz1 + 0.1]); // mancha crema
    for (const s of [-1, 1]) {
      G.box(1.3, 0.4, 0.5, dark, [s * 0.95, hy1 + 0.72, hz1 + 1.3], [0, 0, -s * 0.3]); // ceño
      G.box(0.5, 0.42, 0.12, eye, [s * 0.95, hy1 + 0.38, hz1 + 1.38]);
      G.box(1.0, 1.5, 1.8, coat, [s * 1.85, hy1 - 0.5, hz1 + 0.5]); // cachete
      G.box(0.4, 2.0, 1.3, coat, [s * 1.45, hy1 + 2.0, hz1 - 0.3], [0.1, 0, s * 0.15]); G.box(0.1, 1.6, 1.0, pink, [s * 1.45, hy1 + 2.0, hz1 - 0.1], [0.1, 0, s * 0.15]); // orejas erguidas
      G.cyl(0.02, 0.6, fang, [s * 0.85, hy1 - 0.95, hz1 + 2.45], undefined, 4, 0.4); // colmillo inferior
      G.cyl(0.4, 0.5, fang, [s * 0.95, hy1 - 0.88, hz1 + 1.65], undefined, 4, 0.02); // colmillo superior
    }
    G.box(2.4, 1.0, 1.1, light, [0, hy1 - 0.5, hz1 + 1.65]); // hocico chato
    G.box(1.0, 0.55, 0.3, FOLD.dark(), [0, hy1 - 0.05, hz1 + 2.25]); // nariz
    G.box(1.9, 0.3, 1.5, red, [0, hy1 - 1.05, hz1 + 1.6]); // interior de la boca
    G.box(2.5, 0.7, 2.0, light, [0, hy1 - 1.55, hz1 + 1.95], [0.18, 0, 0]); // mandíbula inferior saliente, abierta
    G.box(1.6, 0.2, 0.3, dark, [0, hy1 - 1.15, hz1 + 2.95]); // labio
  } else {
  G.box(hs, hs * 0.9, hs, coat, [0, hy0, hz0]);
  G.box(hs * (c ? 0.55 : 0.68), hs * (c ? 0.35 : 0.5), hs * (c ? 0.4 : 0.75), light, [0, hy0 - hs * 0.22, hz0 + hs * (c ? 0.68 : 0.85)]); // hocico
  G.box(hs * 0.3, hs * 0.2, 0.2, FOLD.dark(), [0, hy0 - hs * (c ? 0.1 : 0.05), hz0 + hs * (c ? 0.9 : 1.23)]); // nariz
  if (!c) G.box(hs * 0.6, hs * 0.16, hs * 0.65, dark, [0, hy0 - hs * 0.55, hz0 + hs * 0.75]); // mandíbula
  for (const s of [-1, 1]) {
    G.box(hs * 0.22, hs * 0.16, 0.1, eye, [s * hs * 0.27, hy0 + hs * 0.12, hz0 + hs / 2 + 0.05]);
    if (c) { G.cyl(0.04, 1.1, coat, [s * hs * 0.32, hy0 + hs * 0.45 + 0.5, hz0 - 0.1], undefined, 4, 0.95); G.cyl(0.03, 0.7, pink, [s * hs * 0.32, hy0 + hs * 0.45 + 0.4, hz0 + 0.02], undefined, 4, 0.6); } // oreja en punta con interior rosa
    else { G.box(0.4, 1.9, 1.3, coat, [s * hs * 0.34, hy0 + hs * 0.45 + 0.9, hz0 - 0.2], [0.1, 0, s * 0.15]); G.box(0.1, 1.5, 1.0, pink, [s * hs * 0.34, hy0 + hs * 0.45 + 0.9, hz0 - 0.02], [0.1, 0, s * 0.15]); G.box(0.14, hs * 0.14, 0.14, FOLD.painted("#c0262a", 0.5, 207), [s * 0.3, ny - 0.4, nz + 1.0], undefined); } // oreja erguida (bulldog francés) con interior rosa; pinches del collar
    if (c) for (const k of [-1, 1]) strut([s * hs * 0.3, hy0 - hs * 0.2, hz0 + hs * 0.85], [s * hs * 0.85, hy0 - hs * 0.2 + k * 0.15, hz0 + hs * 0.9], 0.04, 0.04, steel); // bigotes de alambre
  }
  }
  bone(2); // cola
  const [tx, ty2, tz] = Q.tail;
  if (c) { strut([tx, ty2, tz], [0, ty2 + 1.6, tz - 1.8], 0.45, 0.45, coat); strut([0, ty2 + 1.6, tz - 1.8], [0, ty2 + 2.8, tz - 2.6], 0.4, 0.4, dark); G.box(0.5, 0.6, 0.6, light, [0, ty2 + 3.0, tz - 2.7]); } // punta crema
  else strut([tx, ty2, tz], [0, ty2 + 1.8, tz - 1.8], 0.55, 0.55, coat);
  // Patas: perno de cadera en el torso, muslo pintado, rodilla de acero, caña y pata de goma
  QLEGS.forEach(([s, f], i) => {
    const x = s * hx, z = f * hz, lw = c ? 0.8 : 1.7;
    bone(0);
    G.cyl(lw * 0.8, lw * 1.4, steel, [x - s * lw * 0.15, hy, z], [0, 0, Math.PI / 2], 6); // perno de cadera
    bone(3 + i);
    G.cyl(lw * 1.1, lw * 1.25, dark, [x, hy * 0.98, z], [0, 0, Math.PI / 2], 6); // hombro articulado
    G.box(lw * 1.15, hy * 0.56, lw * 1.25, coat, [x, hy * 0.74, z]);
    G.box(lw * 0.95, lw * 0.65, lw * 0.95, steel, [x, hy * 0.46, z]);
    G.box(lw * 0.82, hy * 0.44, lw * 0.88, f > 0 ? light : coat, [x, hy * 0.24, z]);
    G.box(lw * 1.15, 0.42, lw * 1.45, FOLD.rubber(), [x, 0.21, z + 0.15]);
  });
  return done(c ? 9 : 11);
}

/** Pose de un clip: f = cuadro (24/s), n = largo del clip. */
function petPose(Q: Quad, clip: string, f: number, n: number) {
  const u = f / n, ph = u * Math.PI * 2, c = Q.cat, { hipX: hx, hipY: hy, hipZ: hz } = Q;
  let body = B.Matrix.Identity(), head = 0, tail = 0, tailUp = 0, legs = [0, 0, 0, 0], spread = 0;
  const T = (x: number, y: number, z: number) => B.Matrix.Translation(x, y, z);
  const pitch = (a: number) => piv(new B.Vector3(0, hy, 0), B.Matrix.RotationX(a));
  const seg = (a: number, b: number) => B.Scalar.Clamp((f - a) / Math.max(1, b - a), 0, 1);
  const crouch = (k: number) => { body = T(0, -hy * 0.18 * k, 0); spread = 0.35 * k; };
  if (clip === "idle") { body = T(0, 0.06 * Math.sin(ph), 0); head = 0.05 * Math.sin(ph); tail = 0.5 * Math.sin(ph * 2); }
  else if (clip === "walk") { legs = [0, Math.PI, Math.PI, 0].map((o) => 0.42 * Math.sin(ph + o)); body = T(0, 0.12 * Math.abs(Math.sin(ph)), 0); head = 0.06 * Math.sin(ph * 2); tail = 0.3 * Math.sin(ph); }
  else if (clip === "run") { legs = [0, 0.4, Math.PI, Math.PI + 0.4].map((o) => 0.85 * Math.sin(ph + o)); body = pitch(0.08 * Math.sin(ph)).multiply(T(0, 0.35 * Math.max(0, Math.sin(ph)), 0)); head = -0.1 * Math.sin(ph); tailUp = 0.4; }
  else if (clip === "rage") { body = T(0.08 * Math.sin(ph * 6), 0, 0); head = -0.25 * Math.abs(Math.sin(ph * 3)); tailUp = 0.8; legs = [-0.2, -0.2, 0.2, 0.2]; spread = 0.2; }
  else if (clip === "jump_slam" || clip === "jump") {
    const [a, b2, e] = clip === "jump" ? [19, 29, 38] : [12, 28, 40], air = seg(a, b2);
    if (f < a) crouch(seg(0, a));
    else if (f < b2) { body = pitch(-0.35 * Math.cos(air * Math.PI)); legs = [-0.8, -0.8, 0.8, 0.8]; tailUp = 0.6; }
    else { crouch(1 - seg(b2, e)); head = 0.2 * (1 - seg(b2, e)); }
  } else if (clip === "charge") {
    if (f < 7) { crouch(seg(0, 7)); head = 0.35 * seg(0, 7); }
    else if (f < 16) { const q = seg(7, 16) * Math.PI * 4; legs = [0, 0.4, Math.PI, Math.PI + 0.4].map((o) => 0.9 * Math.sin(q + o)); body = pitch(0.1); head = 0.35; }
    else { const k = 1 - seg(16, 26); body = pitch(-0.2 * k); legs = [-0.6 * k, -0.6 * k, -0.3 * k, -0.3 * k]; head = -0.1 * k; }
  } else if (clip === "spin") {
    if (f < 4) crouch(seg(0, 4));
    else if (f < 20) { crouch(1); body = body.multiply(B.Matrix.RotationY(seg(4, 20) * Math.PI * 2)); tail = 0.6; }
    else crouch(1 - seg(20, 24));
  } else if (clip === "swipe") { const k = Math.sin(u * Math.PI); legs = [-1.5 * k, 0, 0, 0]; head = 0.15 * k; body = pitch(-0.12 * k); }
  else if (clip === "death") {
    const k = seg(0, 30);
    body = piv(new B.Vector3(hx * 1.6, 0, 0), B.Matrix.RotationZ(-1.45 * k)).multiply(T(0, -0.4 * k, 0));
    head = 0.4 * k; legs = [0.3 * k, -0.2 * k, -0.3 * k, 0.2 * k];
  }
  const out = [body,
    piv(new B.Vector3(...Q.neck), B.Matrix.RotationX(head)).multiply(body),
    piv(new B.Vector3(...Q.tail), B.Matrix.RotationX(-tailUp).multiply(B.Matrix.RotationY(tail))).multiply(body)];
  QLEGS.forEach(([s, fz], i) => out.push(piv(new B.Vector3(s * hx, hy, fz * hz), B.Matrix.RotationX(legs[i]).multiply(B.Matrix.RotationZ(s * spread))).multiply(body)));
  return out;
}
/** Clips de las mascotas: nombre → cuadros (24/s) y si cicla. Los de ida respetan los cuadros de SEQ (enemies.ts). */
const PET_CLIPS = (cat: boolean): Record<string, [number, boolean]> => ({
  idle: [48, true], walk: [24, true], run: [12, true], rage: [36, true], death: [72, false],
  ...(cat ? { jump: [39, false], spin: [25, false], swipe: [20, false] } : { jump_slam: [41, false], charge: [27, false] }),
});
export const PETS: Record<string, { build: () => B.Mesh[]; bones: number; clips: Record<string, [number, boolean]>; pose: (clip: string, f: number, n: number) => B.Matrix[] }> = {
  perro: { build: () => petBody(DOG), bones: 7, clips: PET_CLIPS(false), pose: (c, f, n) => petPose(DOG, c, f, n) },
  gato: { build: () => petBody(CAT), bones: 7, clips: PET_CLIPS(true), pose: (c, f, n) => petPose(CAT, c, f, n) },
};

// ---------- Resto de los autos (CARS y Carrera): misma gramática que el buggy ----------
// Piso oscuro, carrocería de chapa con la pintura del jugador y dobleces en las aristas, número a los costados, ópticas emisivas,
// paragolpes de caño y una pieza de identidad. Proporciones del procedural viejo de carModel (mismo origen: altura del eje).
// Las ruedas son foldWheel en las anclas de siempre (carModel), que giran y viran como antes.
export function carHull(kind: string, paint: B.Material, lamp: string) {
  if (kind === "buggy") return buggyHull(paint, lamp);
  const { G, done, strut } = kit(), q = genome(kind);
  const dark = FOLD.dark(), steel = FOLD.bare(), L = FOLD.emissive(lamp), tail = FOLD.emissive("#ff9a1a");
  const num = (x: number, y: number, z: number, s: number) => { for (const sd of [-1, 1]) G.decal([sd * x, y, z], [0, -sd * Math.PI / 2, 0], "numero", s); };
  const edges = (w: number, y: number, z0: number, z1: number, m: B.Material) => { for (const s of [-1, 1]) G.bend([s * w / 2, y, z0], [s * w / 2, y, z1], 0.022, m); };
  const lamps = (x: number, y: number, z: number, d: number) => { for (const s of x ? [1, -1] : [1]) { G.box(d * 1.4, d * 1.1, 0.05, dark, [x * s, y, z - 0.02]); G.box(d, d * 0.7, 0.04, L, [x * s, y, z]); } };
  const tails = (x: number, y: number, z: number) => { for (const s of [-1, 1]) G.box(0.14, 0.06, 0.03, tail, [s * x, y, z]); };
  const bumper = (w: number, y: number, z: number) => { strut([-w / 2, y, z], [w / 2, y, z], 0.06, 0.06, steel); for (const s of [-1, 1]) strut([s * w * 0.3, y, z], [s * w * 0.3, y, z - Math.sign(z) * 0.12], 0.04, 0.04, steel); };
  if (kind === "monster") { // monster truck: caja alta, cabina, barra de luces, amortiguadores amarillos y paragolpes de caño (genes: car_genes.ts)
    const cy = q.caja_y, cw = q.caja_ancho, ch = q.caja_alto, cl = q.caja_largo, top = cy + ch / 2;
    const kw = q.cabina_ancho, kh = q.cabina_alto, kl = q.cabina_largo, kz = q.cabina_z, ky = top + kh / 2, ktop = ky + kh / 2;
    G.box(1.0, q.chasis_alto, 1.9, dark, [0, cy - 0.2 - q.chasis_alto / 2, 0]); // chasis: baja hacia los ejes si crece
    G.box(cw, ch, cl, paint, [0, cy, 0]); edges(cw, top, -cl / 2, cl / 2, paint);
    G.box(kw, kh, kl, paint, [0, ky, kz]); edges(kw, ktop, kz - kl / 2, kz + kl / 2, paint);
    G.box(kw - 0.1, kh - 0.08, 0.03, FOLD.glass(), [0, ky + 0.02, kz + kl / 2 + 0.03], [-0.4, 0, 0]);
    G.box(kw, 0.08, 0.2, dark, [0, ktop + 0.04, kz + 0.35]); lamps(kw * 0.36, ktop + 0.07, kz + 0.46, 0.1); lamps(kw * 0.12, ktop + 0.07, kz + 0.46, 0.1);
    if (q.jaula_alto > 0.03) { // jaula antivuelco de caño amarillo: parantes apoyados en la caja (con zapata) que suben por fuera de la cabina; 0 = sin jaula
      const yel = FOLD.painted("#f5b91b", 0.6, 211), px = kw / 2 + 0.04, ty = ktop + q.jaula_alto, zf = kz + 0.08, zr = kz - kl / 2 + 0.1, t = 0.07;
      for (const s of [-1, 1]) {
        for (const z of [zf, zr]) { strut([s * px, top, z], [s * px, ty, z], t, t, yel); G.box(0.16, 0.04, 0.16, steel, [s * px, top + 0.02, z]); } // parante hasta la caja y zapata
        strut([s * px, ty, zr], [s * px, ty, zf], t, t, yel); strut([s * px, top, zr], [s * px, ty, zf], 0.05, 0.05, yel); // riel de techo y diagonal
      }
      strut([-px, ty, zf], [px, ty, zf], t, t, yel); strut([-px, ty, zr], [px, ty, zr], t, t, yel);
    }
    if (q.escape_alto > 0.05) for (const s of [-1, 1]) { // escapes verticales gruesos a los lados del capó: collar oscuro, caño de acero y boca oscura ancha
      const ex = s * (cw / 2 - 0.12), ez = kz + kl / 2 + 0.22, eh = q.escape_alto;
      G.cyl(0.26, 0.05, dark, [ex, top + 0.025, ez], undefined, 8); G.cyl(0.16, eh, FOLD.painted("#d9dfe5", 0.35, 212), [ex, top + eh / 2, ez], undefined, 8); G.cyl(0.24, 0.08, dark, [ex, top + eh + 0.03, ez], undefined, 8);
    }
    G.grate([0, cy, cl / 2 + 0.01], [0, Math.PI, 0], 0.6, 0.22, 4, steel); lamps(0.42, cy + 0.04, cl / 2 + 0.01, 0.1); tails(0.42, cy + 0.04, -cl / 2 - 0.01);
    bumper(q.paragolpe_ancho, cy - 0.12, cl / 2 + 0.1); bumper(q.paragolpe_ancho, cy - 0.12, -cl / 2 - 0.1); num(cw / 2 + 0.005, cy, 0.1, 0.3);
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) strut([x * 0.3, cy - 0.2, z * 0.62], [x * (0.8 * q.trocha_k - 0.18), 0.05, z * 0.72 * q.batalla_k], q.amort_grosor, q.amort_grosor, FOLD.painted("#facc15", 0.6, 211));
  } else if (kind === "formula") { // fórmula: trompa baja, pontones, alerón delantero, halo de caño
    const tw = q.trompa_ancho, tl = q.trompa_largo, th = q.trompa_alto, bw = q.cuerpo_ancho, bh = q.cuerpo_alto, top = 0.16 + bh / 2, pw = q.ponton_ancho, ah = q.toma_alto, fw = q.aleron_del_ancho; // genes: car_genes.ts
    G.box(tw, th, tl, paint, [0, 0.12, 1.35 - tl / 2]); G.box(bw, bh, 1.3, paint, [0, 0.16, -0.25]); edges(bw, top, -0.9, 0.4, paint);
    for (const s of [-1, 1]) G.box(pw, 0.2, q.ponton_largo, paint, [s * (bw / 2 + pw / 2 - 0.08), 0.12, -0.2]);
    G.box(fw, 0.04, 0.3, dark, [0, 0.02, 1.35]); for (const s of [-1, 1]) G.box(0.04, 0.14, 0.32, dark, [s * fw / 2, 0.07, 1.35]);
    G.box(0.42, 0.14, 0.5, dark, [0, top + 0.04, 0.05]); strut([-0.2, top + 0.02, -0.15], [0, top + 0.18, 0.15], 0.03, 0.03, steel); strut([0.2, top + 0.02, -0.15], [0, top + 0.18, 0.15], 0.03, 0.03, steel);
    G.box(0.3, ah, 0.6, paint, [0, top + ah / 2, -0.55]); G.trimStrip([0, 0.12, -0.91], undefined, 0.7, 0.08, "hazard", 0.02);
    G.decal([0, 0.12 + th / 2 + 0.005, 0.8], [Math.PI / 2, 0, 0], "numero", 0.22); lamps(0.18, 0.08, 1.36, 0.08); tails(0.25, 0.2, -0.92);
  } else if (kind === "tanque") { // tanque: orugas con faldones, casco con frente inclinado, torreta plegada, cañón de caño
    const olive = FOLD.painted("#3f4628", 0.8, 221);
    const oh = q.oruga_alto, cw = q.casco_ancho, ch = q.casco_alto, top = 0.36 + ch / 2, tw = q.torreta_ancho, th = q.torreta_alto, tl = q.torreta_largo, ty = top + th / 2, cl = q.canon_largo; // genes: car_genes.ts
    for (const x of [-0.72, 0.72]) {
      G.box(0.3, oh, 2.0, FOLD.rubber(), [x, 0.02, 0]); for (const z of [-1, 1]) G.cyl(oh, 0.3, FOLD.rubber(), [x, 0.02, z], [0, 0, Math.PI / 2], 8);
      G.box(0.36, 0.05, 2.3, olive, [x, 0.07 + oh / 2, 0]); G.rivets([x + Math.sign(x) * 0.19, 0.2, -1.0], [x + Math.sign(x) * 0.19, 0.2, 1.0], 8, [Math.sign(x), 0, 0]);
    }
    G.box(cw, ch, 1.8, paint, [0, 0.36, -0.1]); G.box(cw, 0.06, 0.45, paint, [0, top - 0.1, 0.95], [0.5, 0, 0]); edges(cw, top, -1.0, 0.8, paint);
    G.box(tw, th, tl, paint, [0, ty, -0.15]); edges(tw, ty + th / 2, -0.15 - tl / 2, -0.15 + tl / 2, paint);
    G.cyl(0.42, 0.08, olive, [0, ty + th / 2 + 0.04, -0.25], undefined, 8);
    G.cyl(q.canon_d, cl, steel, [0, ty + 0.01, -0.15 + tl / 2 + cl / 2 - 0.1], [Math.PI / 2, 0, 0], 8); G.cyl(q.canon_d + 0.05, 0.16, dark, [0, ty + 0.01, -0.15 + tl / 2 + cl - 0.1], [0, 0, Math.PI / 2], 8);
    if (q.antena_alto > 0.1) { // antena de RC: caño fino sobre la cubierta trasera con banderín naranja; 0 = sin antena
      const ah = q.antena_alto, ax = 0.4, az = -0.82, ay = top + 0.03;
      G.cyl(0.14, 0.05, dark, [ax, ay, az], undefined, 8); G.cyl(0.04, ah, steel, [ax, ay + ah / 2, az], undefined, 6);
      G.box(0.03, 0.16, 0.3, FOLD.painted(PAL.naranja, 0.6, 222), [ax, ay + ah - 0.1, az - 0.16]); G.box(0.07, 0.07, 0.07, steel, [ax, ay + ah + 0.02, az]);
    }
    if (q.cajas_herr > 0.05) for (const s of [-1, 1]) { // cajas de herramientas amarillas sobre los faldones de las orugas, con tapa y manija de acero
      const bh = q.cajas_herr, bx = s * 0.72, bz = -0.55, by = 0.095 + oh / 2 + bh / 2;
      G.box(0.3, bh, 0.55, FOLD.painted(PAL.amarillo, 0.7, 223), [bx, by, bz]); G.box(0.32, 0.03, 0.57, steel, [bx, by + bh / 2, bz]); G.box(0.2, 0.03, 0.04, dark, [bx, by + bh / 2 + 0.03, bz]);
    }
    num(tw / 2 + 0.005, ty, -0.15, 0.24); lamps(0.38, 0.42, 1.08, 0.12); G.trimStrip([0, 0.36, -1.01], undefined, 1.0, 0.1, "hazard", 0.02);
  } else if (kind === "axel") { // Axel: eje de caño entre dos ruedas gigantes y jaula-cabina colgando
    const red = FOLD.painted("#f97316", 0.6, 231);
    G.cyl(0.16, 1.9, steel, [0, 0, 0], [0, 0, Math.PI / 2], 8);
    const w = q.cabina_ancho, h = q.cabina_alto, L = q.cabina_largo, top = 0.1 + h / 2, x = w / 2 - 0.03, jy = q.jaula_alto, wx = 0.82 * q.trocha_k; // genes: car_genes.ts
    G.box(w + 0.05, 0.12, L + 0.05, dark, [0, -0.12, 0]); G.box(w, h, L, paint, [0, 0.1, 0]); edges(w, top, -L / 2, L / 2, paint);
    for (const z of [-0.5, 0.45]) { strut([-x, top, z], [-x, jy, z * 0.4], 0.05, 0.05, steel); strut([x, top, z], [x, jy, z * 0.4], 0.05, 0.05, steel); }
    for (const xx of [-x, x]) strut([xx, jy, -0.2], [xx, jy, 0.18], 0.05, 0.05, steel);
    strut([-x, jy, -0.2], [x, jy, -0.2], 0.05, 0.05, steel);
    for (const s of [-1, 1]) { G.cyl(q.tapa_d, 0.06, red, [s * (wx + 0.16), 0, 0], [0, 0, Math.PI / 2], 8); G.cyl(0.02, 0.2, steel, [s * (wx + 0.28), 0, 0], [0, 0, -s * Math.PI / 2], 6, 0.16); }
    lamps(0.28, top + 0.05, L / 2 + 0.02, 0.16); num(w / 2 + 0.005, 0.1, 0, 0.22);
  } else if (kind === "helado") { // camioncito de helados: cabina, caja crema con ventanilla y toldo, cucurucho de chapa en el techo
    const cream = FOLD.painted("#f3ead2", 0.5, 241), pink = FOLD.painted("#f08dbd", 0.5, 242);
    G.box(1.0, 0.14, 2.3, dark, [0, 0.05, 0]);
    const dh = q.caja_alto - 0.95, dl = q.caja_largo - 1.45, k = q.cucurucho, b0 = 1.06 + dh; // genes: car_genes.ts; b0 = techo de la caja (base del cucurucho)
    G.box(1.1, q.caja_alto, q.caja_largo, cream, [0, 0.58 + dh / 2, -0.4]); edges(1.1, 1.05 + dh, -1.12 - dl / 2, 0.32 + dl / 2, cream);
    G.box(1.1, 0.5, 0.85, paint, [0, 0.38, 0.75]); G.box(1.1, q.cabina_alto, 0.5, paint, [0, 0.58 + q.cabina_alto / 2, 0.55]);
    G.box(0.95, 0.28, 0.03, FOLD.glass(), [0, 0.72, 0.82], [-0.5, 0, 0]);
    for (const s of [-1, 1]) { G.box(0.02, 0.38, 0.7, FOLD.glass(), [s * 0.56, 0.72, -0.4]); G.box(q.toldo_ancho, 0.03, 0.85, s > 0 ? pink : cream, [s * (0.53 + q.toldo_ancho / 2), 0.97 + dh, -0.4], [0, 0, -s * 0.35]); }
    const sh = q.cucurucho_soporte ?? 0.06;
    G.box(0.32 * Math.min(1.2, k), 0.03, 0.32 * Math.min(1.2, k), steel, [0, b0 + 0.015, -0.4]); // base de chapa
    G.cyl(0.16 * k, sh, steel, [0, b0 + 0.03 + sh / 2, -0.4], undefined, 6); // collar de soporte
    G.cyl(0.46 * k, 0.62 * k, FOLD.painted("#d9a15a", 0.6, 243), [0, b0 + 0.03 + sh + 0.31 * k, -0.4], undefined, 6, 0.04 * k);
    G.sph(0.5 * k, pink, [0, b0 + 0.03 + sh + 0.72 * k, -0.4]); G.sph(0.4 * k, cream, [0, b0 + 0.03 + sh + 1.0 * k, -0.4]); G.box(0.12 * k, 0.12 * k, 0.12 * k, FOLD.painted("#f97316", 0.4, 244), [0, b0 + 0.03 + sh + 1.24 * k, -0.4]);
    lamps(0.4, 0.4, 1.2, 0.14); tails(0.4, 0.5, -1.13); bumper(1.1, 0.14, 1.22); num(0.555, 0.45, -0.75, 0.3);
  } else if (kind === "combi") { // combi: dos tonos, techo crema, ventanillas, V en la trompa
    const cream = FOLD.painted("#d9cba6", 0.5, 251);
    const w = q.cuerpo_ancho, h = q.cuerpo_alto, L = q.cuerpo_largo, th = q.techo_alto, vk = q.v_escala; // genes: car_genes.ts
    const dh = h - 0.5, dL = L - 2.3, dth = th - 0.42, dw = w - 1.08;
    G.box(1.0 + dw * 0.9, 0.12, L, dark, [0, 0.05, 0]);
    G.box(w, h, L, paint, [0, 0.36 + dh / 2, 0]); G.box(w, th, 2.1 + dL, cream, [0, 0.61 + dh + th / 2, -0.05]); edges(w, 0.61 + dh + th, -1.1 - dL / 2, 1.0 + dL / 2, cream);
    G.box(0.7 + dw * 0.65, 0.07, 1.9 + dL, cream, [0, 0.64 + dh + th, -0.05]);
    G.box(0.9 + dw * 0.85, 0.3 + dth * 0.7, 0.03, FOLD.glass(), [0, 0.84 + dh + dth * 0.5, 1.0 + dL / 2], [-0.3, 0, 0]);
    for (const s of [-1, 1]) for (const z of [0.6 + dL * 0.35, -0.05, -0.7 - dL * 0.35]) G.box(0.02, 0.28 + dth * 0.6, 0.5 + dL * 0.2, FOLD.glass(), [s * (w / 2 + 0.01), 0.84 + dh + dth * 0.5, z]);
    for (const sd of [-1, 1]) G.box(0.32 * vk, 0.06 * vk, 0.03, cream, [sd * 0.11 * vk, 0.5 + dh * 0.6, 1.16 + dL / 2], [0, 0, sd * 1.0]); // V
    lamps(0.4 + dw * 0.35, 0.4 + dh * 0.5, 1.17 + dL / 2, 0.18); tails(0.42 + dw * 0.35, 0.45 + dh * 0.5, -1.16 - dL / 2); bumper(w + 0.02, 0.14, 1.22 + dL / 2); bumper(w + 0.02, 0.14, -1.2 - dL / 2); num(w / 2 + 0.005, 0.36 + dh / 2, -0.2, 0.3);
  } else if (kind === "murcielago") { // murciélago: negro, largo y bajo, cabina de burbuja, aletas traseras y turbina con brillo naranja
    const glow = FOLD.emissive("#ff7a1a");
    const w = q.cuerpo_ancho, h = q.cuerpo_alto, L = q.cuerpo_largo; // genes: car_genes.ts
    const kh = q.cabina_alto, ah = q.aleta_alto, al = q.aleta_largo, td = q.turbina_d;
    const dw = w - 0.98, dh = h - 0.26, dL = L - 2.6;
    G.box(0.9 + dw * 0.9, 0.14, L, dark, [0, 0.07, 0]);
    G.box(w - 0.03, 0.16 + dh * 0.5, 1.5 + dL * 0.5, paint, [0, 0.2 + dh * 0.3, 0.7 + dL * 0.25]); G.box(0.2, 0.1, 0.5, paint, [0, 0.3 + dh * 0.4, 1.2 + dL * 0.4]); G.box(1.0 + dw, 0.04, 0.3, dark, [0, 0.03, 1.4 + dL * 0.5]);
    G.box(w, h, 1.2 + dL * 0.5, paint, [0, 0.27 + dh / 2, -0.55 - dL * 0.25]); edges(w - 0.03, 0.34 + dh, -1.1 - dL * 0.5, 1.4 + dL * 0.5, paint);
    G.box(0.55 + dw * 0.4, kh, 0.75, FOLD.screen("#6a7f8f"), [0, 0.44 + dh + (kh - 0.22) / 2, -0.05], [-0.15, 0, 0]); G.box(0.6 + dw * 0.4, 0.06, 0.6, paint, [0, 0.57 + dh + (kh - 0.22), -0.15]);
    for (const s of [-1, 1]) { G.box(0.05, ah, al, paint, [s * (w / 2 - 0.04), 0.58 + dh + (ah - 0.55) / 2, -1.05 - dL * 0.35], [-0.4, 0, s * 0.12]); G.box(0.05, 0.25, 0.5, paint, [s * (w / 2 + 0.01), 0.36 + dh * 0.5, -0.2], [-0.2, 0, 0]); }
    G.cyl(td, 0.5, dark, [0, 0.38 + dh * 0.5, -1.4 - dL * 0.5], [Math.PI / 2, 0, 0], 8); G.cyl(td * 0.81, 0.04, glow, [0, 0.38 + dh * 0.5, -1.66 - dL * 0.5], [Math.PI / 2, 0, 0], 8);
    G.trimStrip([0, 0.36 + dh * 0.5, 0.95 + dL * 0.35], [0, 0, 0], 0.9 + dw, 0.05, "hazard", 0.02);
    lamps(0.3 + dw * 0.3, 0.2 + dh * 0.4, 1.46 + dL * 0.5, 0.1); tails(0.3 + dw * 0.3, 0.2 + dh * 0.4, -1.17 - dL * 0.4);
  } else if (kind === "misterio") { // furgoneta del misterio: verde agua, parrilla de techo, flores naranjas y capó corto
    const lite = FOLD.painted("#c9efe4", 0.5, 301), flower = FOLD.painted("#ff8a1f", 0.5, 302), eyeC = FOLD.painted("#ffd23f", 0.5, 303);
    const w = q.cuerpo_ancho, h = q.cuerpo_alto, L = q.cuerpo_largo, th = q.techo_alto, rh = q.parrilla_alto; // genes: car_genes.ts
    const dw = w - 1.1, dh = h - 0.5, dL = L - 2.3, dth = th - 0.44;
    G.box(1.0 + dw * 0.9, 0.12, L, dark, [0, 0.05, 0]);
    G.box(w, h, 1.5 + dL * 0.65, paint, [0, 0.38 + dh / 2, -0.45 - dL * 0.2]);
    G.box(w - 0.02, th, 1.3 + dL * 0.6, paint, [0, 0.6 + dh + th / 2, -0.5 - dL * 0.2]); edges(w - 0.02, 0.59 + dh + th, -1.1 - dL * 0.5, 0.15, paint);
    G.box(w, 0.4 + dh * 0.8, 0.8 + dL * 0.35, paint, [0, 0.3 + dh * 0.4, 0.85 + dL * 0.4]);
    G.box(w - 0.06, 0.06, 0.7 + dL * 0.35, lite, [0, 0.52 + dh * 0.8, 0.85 + dL * 0.4]);
    G.box(0.9 + dw * 0.8, 0.3 + dth * 0.6, 0.03, FOLD.glass(), [0, 0.8 + dh + dth * 0.5, 0.2 + dL * 0.1], [-0.25, 0, 0]);
    G.box(w, 0.07, 1.5 + dL * 0.65, lite, [0, 0.58 + dh * 0.8, -0.45 - dL * 0.2]);
    for (const s of [-1, 1]) {
      G.box(0.02, 0.26 + dth * 0.5, 0.5, FOLD.glass(), [s * (w / 2), 0.88 + dh + dth * 0.5, 0.0]);
      for (const [z, y] of [[-0.45, 0.4], [-0.85, 0.72]] as const) { G.cyl(0.26, 0.03, flower, [s * (w / 2 + 0.01), y + dh * 0.5, z], [0, 0, Math.PI / 2], 8); G.cyl(0.1, 0.04, eyeC, [s * (w / 2 + 0.02), y + dh * 0.5, z], [0, 0, Math.PI / 2], 8); }
    }
    const py0 = 0.59 + dh + th + 0.01, py1 = py0 + rh;
    for (const x of [-w * 0.41, w * 0.41]) for (const z of [-1.0 - dL * 0.4, 0.0]) strut([x, py0, z], [x, py1, z], 0.04, 0.04, steel);
    for (const x of [-w * 0.41, w * 0.41]) strut([x, py1, -1.0 - dL * 0.4], [x, py1, 0.0], 0.04, 0.04, steel);
    for (const z of [-0.75, -0.5, -0.25]) strut([-w * 0.41, py1, z], [w * 0.41, py1, z], 0.04, 0.04, steel);
    lamps(0.4 + dw * 0.35, 0.34 + dh * 0.5, 1.26 + dL / 2, 0.16); tails(0.42 + dw * 0.35, 0.45 + dh * 0.5, -1.16 - dL / 2); bumper(w, 0.14, 1.28 + dL / 2); bumper(w, 0.14, -1.2 - dL / 2);
  } else if (kind === "clasico") { // sedán clásico: tres volúmenes, plateado con faldón azul oscuro y parrilla cromada vertical
    const navy = FOLD.painted("#1c2a4a", 0.5, 311), chrome = FOLD.bare();
    const w = q.cuerpo_ancho, tl = q.trompa_largo, ch = q.cabina_alto, col = q.cola_largo; // genes: car_genes.ts
    const dw = w - 1.06, dtl = tl - 0.85, dch = ch - 0.3, dcol = col - 0.6;
    G.box(0.9 + dw * 0.85, 0.1, 2.3 + dtl + dcol, dark, [0, 0.05, (dtl - dcol) / 2]);
    G.box(w, 0.14, 2.3 + dtl + dcol, navy, [0, 0.14, (dtl - dcol) / 2]);
    G.box(w, 0.2, tl, paint, [0, 0.3, 0.8 + dtl / 2]); edges(w, 0.4, 0.8 - tl / 2, 0.8 + tl / 2, paint);
    G.box(w - 0.08, ch, 0.95, paint, [0, 0.35 + ch / 2, -0.1]); G.box(w - 0.2, 0.04, 0.8, navy, [0, 0.36 + ch, -0.1]);
    G.box(w, 0.22, col, paint, [0, 0.31, -0.95 - dcol / 2]); edges(w, 0.42, -0.95 - col / 2, -0.95 + col / 2, paint);
    G.box(w - 0.16, 0.2 + dch * 0.6, 0.03, FOLD.screen("#9be7ff"), [0, 0.37 + ch / 2, 0.38], [-0.7, 0, 0]); G.box(w - 0.26, 0.18 + dch * 0.6, 0.03, FOLD.screen("#9be7ff"), [0, 0.37 + ch / 2, -0.58], [0.7, 0, 0]);
    for (const s of [-1, 1]) G.box(0.02, 0.2 + dch * 0.6, 0.8, FOLD.screen("#3f7f96"), [s * (w / 2 - 0.035), 0.37 + ch / 2, -0.1]);
    G.box(0.4 + dw * 0.3, 0.16, 0.04, chrome, [0, 0.31, 1.24 + dtl / 2]); for (const x of [-0.15, -0.075, 0, 0.075, 0.15]) G.box(0.015, 0.14, 0.05, dark, [x * (0.4 + dw * 0.3) / 0.4, 0.31, 1.245 + dtl / 2]);
    lamps(0.37 + dw * 0.3, 0.3, 1.23 + dtl / 2, 0.14); tails(0.4 + dw * 0.3, 0.34, -1.26 - dcol / 2); bumper(w + 0.04, 0.14, 1.26 + dtl / 2); bumper(w + 0.04, 0.14, -1.26 - dcol / 2);
    num(w / 2 + 0.005, 0.3, -0.1, 0.22);
  } else if (kind === "jeep") { // 4x4 descapotable: tina abierta, parabrisas de caño, barra antivuelco, rueda de auxilio y parrilla de 7 ranuras
    const w = q.tina_ancho, h = q.tina_alto, L = q.tina_largo, jh = q.jaula_alto, ad = q.auxilio_d; // genes: car_genes.ts
    const dw = w - 1.1, dh = h - 0.34, dL = L - 1.9, djh = jh - 0.5;
    const topY = 0.15 + h;
    G.box(0.95 + dw * 0.85, 0.12, L + 0.1, dark, [0, 0.08, 0]);
    G.box(w, h, L, paint, [0, 0.15 + h / 2, 0]); edges(w, topY, -L / 2, L / 2, paint);
    G.box(0.5, 0.2, 0.5, dark, [-0.27, 0.37 + h / 2, -0.1]); G.box(0.5, 0.2, 0.5, dark, [0.27, 0.37 + h / 2, -0.1]);
    for (const s of [-1, 1]) { G.box(0.2, 0.2, 0.8 + dL * 0.4, paint, [s * (w / 2 - 0.05), 0.35 + h / 2, 0.65 + dL * 0.3]); G.box(0.2, 0.22, 0.6 + dL * 0.3, paint, [s * (w / 2), 0.33 + h / 2, -0.8 - dL * 0.3]); }
    strut([-w * 0.45, topY, 0.25], [-w * 0.45, topY + 0.45 + djh * 0.8, 0.35], 0.05, 0.05, steel); strut([w * 0.45, topY, 0.25], [w * 0.45, topY + 0.45 + djh * 0.8, 0.35], 0.05, 0.05, steel); strut([-w * 0.45, topY + 0.45 + djh * 0.8, 0.35], [w * 0.45, topY + 0.45 + djh * 0.8, 0.35], 0.05, 0.05, steel);
    G.box(w - 0.14, 0.4 + djh * 0.5, 0.03, FOLD.glass(), [0, topY + 0.24 + djh * 0.4, 0.3], [-0.2, 0, 0]);
    for (const [z0, z1] of [[-0.55 - dL * 0.3, -0.55 - dL * 0.3]] as const) { strut([-w * 0.41, topY, z0], [-w * 0.41, topY + jh, z1], 0.05, 0.05, steel); strut([w * 0.41, topY, z0], [w * 0.41, topY + jh, z1], 0.05, 0.05, steel); strut([-w * 0.41, topY + jh, z1], [w * 0.41, topY + jh, z1], 0.05, 0.05, steel); }
    G.cyl(ad, 0.16, FOLD.rubber(), [0, 0.33 + h / 2, -L / 2 - 0.11], [Math.PI / 2, 0, 0], 10); G.cyl(ad * 0.48, 0.18, steel, [0, 0.33 + h / 2, -L / 2 - 0.12], [Math.PI / 2, 0, 0], 8);
    G.box(0.62 + dw * 0.5, 0.3, 0.05, dark, [0, 0.38 + dh * 0.5, L / 2 + 0.02]); for (let i = 0; i < 7; i++) G.box(0.05, 0.26, 0.06, steel, [(i - 3) * (0.085 * (0.62 + dw * 0.5) / 0.62), 0.38 + dh * 0.5, L / 2 + 0.03]);
    lamps(0.4 + dw * 0.3, 0.46 + dh * 0.5, L / 2 + 0.02, 0.16); tails(0.42 + dw * 0.3, 0.36 + dh * 0.5, -L / 2 - 0.02); bumper(w + 0.1, 0.2, L / 2 + 0.11); bumper(w + 0.1, 0.2, -L / 2 - 0.17);
    num(w / 2 + 0.005, 0.4 + dh * 0.5, 0.15, 0.22);
  } else if (kind === "moto") { // moto deportiva: dos ruedas en línea, tanque, carenado, cola alta, escape y manubrio
    const stripeC = FOLD.painted("#f3ead2", 0.5, 321);
    const th = q.tanque_alto, cl = q.carenado_largo, ch = q.cola_alto; // genes: car_genes.ts
    const dth = th - 0.26, dcl = cl - 0.45, dch = ch - 0.16;
    G.box(0.18, 0.1, 1.2, dark, [0, 0.2, 0]);
    G.box(0.3, th, 0.75, paint, [0, 0.33 + th / 2, 0.2]); G.box(0.2, 0.04, 0.6, stripeC, [0, 0.34 + th, 0.2]);
    G.box(0.32, 0.22, cl, paint, [0, 0.4, 0.55 + cl / 2], [0.3, 0, 0]); G.box(0.24, 0.2, 0.04, FOLD.glass(), [0, 0.6 + dth * 0.5, 0.5 + cl / 2], [-0.7, 0, 0]);
    G.box(0.26, 0.1, 0.5, dark, [0, 0.52 + dth * 0.5, -0.25]); G.box(0.24, ch, 0.5, paint, [0, 0.42 + ch / 2, -0.75], [-0.25, 0, 0]);
    for (const s of [-1, 1]) { strut([s * 0.1, 0.55, 0.85 + dcl * 0.5], [s * 0.1, 0.0, 0.85 + dcl * 0.5], 0.04, 0.04, steel); G.cyl(0.07, 0.4, steel, [s * 0.17, 0.2, -0.45], [Math.PI / 2, 0, 0], 8); strut([s * 0.1, 0.35, -0.25], [s * 0.08, 0.0, -0.85], 0.04, 0.04, steel); }
    strut([-0.3, 0.7 + dth * 0.5, 0.62 + dcl * 0.5], [0.3, 0.7 + dth * 0.5, 0.62 + dcl * 0.5], 0.04, 0.04, steel);
    lamps(0, 0.46, 0.8 + cl * 0.5, 0.14); tails(0.07, 0.48 + ch * 0.5, -1.0);
    num(0.16, 0.46 + dth * 0.5, 0.2, 0.16);
  } else if (kind === "monopatin") { // monopatín: tabla con puntas levantadas, ejes de acero, ruedas amarillas y un muñeco parado encima
    const grip = FOLD.painted("#1b1e24", 0.9, 331), shoe = FOLD.painted("#f3ead2", 0.5, 332), jeans = FOLD.painted("#35507a", 0.5, 333);
    const tw = q.tabla_ancho, tl = q.tabla_largo, ti = q.tail_inclinacion; // genes: car_genes.ts
    G.box(tw, 0.05, tl, paint, [0, 0.12, 0]); G.box(tw - 0.04, 0.012, tl - 0.04, grip, [0, 0.15, 0]);
    for (const s of [-1, 1]) {
      const zTip = s * (tl / 2 + 0.09), zAxle = s * (tl / 2 - 0.05);
      G.box(tw, 0.05, 0.22, paint, [0, 0.16, zTip], [-s * ti, 0, 0]);
      G.box(tw - 0.04, 0.012, 0.2, grip, [0, 0.185, zTip], [-s * ti, 0, 0]);
      G.box(0.1, 0.07, 0.12, steel, [0, 0.07, zAxle]); G.cyl(0.04, tw - 0.04, steel, [0, 0.0, zAxle], [0, 0, Math.PI / 2], 6);
    }
    for (const [z, s] of [[0.28 * (tl / 1.1), 1], [-0.22 * (tl / 1.1), -1]] as const) { G.box(0.1, 0.06, 0.2, shoe, [0.0, 0.19, z]); G.box(0.08, 0.3, 0.09, jeans, [0.0, 0.36, z - 0.02 * s]); }
    G.box(0.2, 0.05, 0.04, FOLD.emissive("#ffd23f"), [0, 0.18, tl / 2 + 0.18]); tails(0.1, 0.18, -tl / 2 - 0.19);
  } else if (kind === "hover") { // aerodeslizador: falda de goma, casco con borde plegado, cabina de burbuja, turbina trasera con aspas
    const cyan = FOLD.painted("#4cc3c9", 0.6, 341);
    const fw = q.falda_ancho, fl = q.falda_largo, cw = q.casco_ancho, ch = q.casco_alto, cl = q.casco_largo, td = q.turbina_d, ck = q.cupula_k, aw = q.aleron_ancho; // genes: car_genes.ts
    const top = 0.08 + ch;
    G.box(fw, 0.14, fl, FOLD.rubber(), [0, 0.04, 0]); // falda perimetral de goma
    G.box(cw, ch, cl, paint, [0, 0.08 + ch / 2, 0.05]); edges(cw, top, -cl / 2 + 0.05, cl / 2 + 0.05, paint); // casco
    G.sph(0.52 * ck, FOLD.glass(), [0, top + 0.12 * ck, 0.4]); // cúpula de burbuja
    G.cyl(td, 0.14, dark, [0, top + 0.28, -0.95], [Math.PI / 2, 0, 0], 8, td); // anillo de turbina
    for (const a of [0.5, -0.5]) G.box(td * 0.88, 0.04, 0.1, cyan, [0, top + 0.28, -0.95], [0, 0, a]); // aspas de la hélice
    for (const s of [-1, 1]) strut([s * 0.42, top - 0.05, -0.95], [s * 0.42, top + 0.28, -0.95], 0.05, 0.05, steel); // montantes de turbina
    G.box(aw, 0.04, 0.26, cyan, [0, top + 0.28 + td / 2, -0.95]); // alerón estabilizador
    lamps(cw * 0.35, 0.18, fl / 2 - 0.04, 0.12); tails(cw * 0.35, 0.18, -fl / 2 + 0.04);
    num(cw / 2 + 0.005, 0.18, 0.2, 0.22);
  } else if (kind === "topadora") { // topadora: chasis pesado, cabina alta con jaula, pala delantera articulada y chimenea
    const pw = q.pala_ancho, ph = q.pala_alto, bw = q.cuerpo_ancho, bh = q.cuerpo_alto, bl = q.cuerpo_largo; // genes: car_genes.ts
    const kw = q.cabina_ancho, kh = q.cabina_alto, eh = q.escape_alto;
    const top = 0.2 + bh;
    for (const s of [-1, 1]) { // orugas laterales
      G.box(0.38, 0.44, 2.2, FOLD.rubber(), [s * 0.78, 0.06, 0]);
      for (const z of [-0.95, 0.95]) G.cyl(0.44, 0.38, FOLD.rubber(), [s * 0.78, 0.06, z], [0, 0, Math.PI / 2], 8);
    }
    G.box(bw, bh, bl, paint, [0, 0.2 + bh / 2, 0]); edges(bw, top, -bl / 2, bl / 2, paint); // cuerpo central
    G.box(bw * 0.85, 0.42, 0.9, paint, [0, top + 0.21, 0.5]); // capó delantero
    G.grate([0, top + 0.21, 0.5 + 0.46], [0, Math.PI, 0], 0.65, 0.28, 4, steel); // rejilla
    G.box(kw * 0.92, kh * 0.92, 0.8, FOLD.glass(), [0, top + kh / 2, -0.3]); // vidrio cabina
    G.box(kw, 0.08, 0.95, dark, [0, top + kh + 0.04, -0.3]); // techo cabina
    for (const x of [-kw * 0.45, kw * 0.45]) for (const z of [-0.7, 0.1]) strut([x, top, z], [x, top + kh, z], 0.06, 0.06, steel); // postes de jaula
    G.box(pw, ph, 0.12, FOLD.bare(), [0, 0.35, 1.48], [-0.15, 0, 0]); // pala frontal
    G.box(pw * 0.96, 0.06, 0.08, dark, [0, 0.08, 1.54]); // cuchilla inferior
    for (const x of [-pw * 0.38, pw * 0.38]) strut([x, 0.28, 0.95], [x, 0.35, 1.44], 0.1, 0.1, dark); // brazos de empuje
    G.cyl(0.09, eh, dark, [0.38, top + 0.1 + eh / 2, 0.35], undefined, 8); // chimenea de escape
    lamps(kw * 0.32, top + kh + 0.08, 0.1, 0.12); tails(bw * 0.38, 0.4, -bl / 2 - 0.02);
    num(bw / 2 + 0.005, 0.35, 0, 0.25);
  } else if (kind === "triciclo") { // triciclo de reparto: cuadro delantero, horquilla con manubrio chopper, cajón de carga trasero
    const cw = q.cajon_ancho, ch = q.cajon_alto, cl = q.cajon_largo, qw = q.cuadro_ancho; // genes: car_genes.ts
    G.box(qw, 0.26, 1.4, paint, [0, 0.32, 0.05]); edges(qw, 0.45, -0.65, 0.75, paint); // cuadro central
    G.box(cw, ch, cl, FOLD.painted("#f3ead2", 0.5, 351), [0, 0.32 + ch / 2, -0.7]); // cajón de carga
    G.box(cw + 0.05, 0.05, cl + 0.05, paint, [0, 0.32 + ch + 0.025, -0.7]); // tapa del cajón
    for (const s of [-1, 1]) strut([s * 0.08, 0.1, 0.75], [s * 0.08, 0.75, 0.65], 0.04, 0.04, steel); // horquilla delantera
    strut([-0.32, 0.82, 0.58], [0.32, 0.82, 0.58], 0.035, 0.035, dark); // manubrio
    for (const s of [-1, 1]) G.box(0.08, 0.04, 0.04, FOLD.rubber(), [s * 0.34, 0.82, 0.58]); // puños
    G.box(0.32, 0.08, 0.42, dark, [0, 0.52, 0.05], [-0.15, 0, 0]); // asiento
    lamps(0, 0.65, 0.78, 0.14); tails(cw * 0.42, 0.45, -0.7 - cl / 2 - 0.02);
    num(cw / 2 + 0.005, 0.5, -0.7, 0.22);
  } else { // autito de carreras a cuerda: carrocería baja, cabina, paragolpes de caño y llave de cuerda
    const c = kind === "carrera" ? q : original("carrera"); // solo carrera llega al else final
    const bw = c.cuerpo_ancho, bh = c.cuerpo_alto, bl = c.cuerpo_largo, top = 0.13 + bh / 2, kw = c.cabina_ancho, kh = c.cabina_alto, kl = c.cabina_largo, kz = c.cabina_z, ky = top + kh / 2; // genes: car_genes.ts
    G.box(0.7, 0.06, 1.7, dark, [0, 0.0, 0]);
    G.box(bw, bh, bl, paint, [0, 0.13, 0]); edges(bw, top, -bl / 2, bl / 2, paint);
    G.box(kw, kh, kl, paint, [0, ky, kz]); G.box(kw - 0.04, kh - 0.03, 0.03, FOLD.glass(), [0, ky + 0.02, kz + kl / 2 + 0.02], [-0.6, 0, 0]);
    bumper(0.76, 0.1, bl / 2 + 0.08); bumper(0.76, 0.1, -bl / 2 - 0.06); lamps(0.25, 0.2, bl / 2 + 0.01, 0.12); tails(0.28, 0.18, -bl / 2 - 0.01);
    G.cyl(0.08, 0.14, steel, [bw / 2 + 0.03, 0.18, -0.2], [0, 0, Math.PI / 2], 6); G.box(0.03, 0.2, 0.06, steel, [bw / 2 + 0.12, 0.18, -0.2]); // llave de cuerda
    num(bw / 2 + 0.005, 0.15, 0.35, 0.18); G.decal([0, top + 0.002, 0.6], [Math.PI / 2, 0, 0], "flecha", 0.25);
  }
  return done(2);
}

// ---------- Utilería del mundo (world.ts): piezas de chapa que visten al colisionador viejo (que queda invisible) ----------
/** Lata de pintura (4,4 × 5): chapa, etiqueta del color, tapa, asa de alambre, chorreadura y calco. */
export function paintCanFold(c: string) {
  const { G, done } = kit();
  const tin = FOLD.painted("#cfd2d6", 0.15, 261), label = FOLD.painted(c, 0.15, 262);
  G.cyl(4.4, 5, tin, [0, 2.5, 0], undefined, 12);
  G.cyl(4.52, 2.6, label, [0, 2.6, 0], undefined, 12);
  G.cyl(4.2, 0.22, FOLD.dark(), [0, 5.05, 0], undefined, 12); G.cyl(4.5, 0.3, tin, [0, 4.9, 0], undefined, 12);
  G.cyl(4.45, 0.12, FOLD.bare(), [0, 5.15, 0], undefined, 12);
  G.tube([[-2.1, 5.0, 0], [-1.7, 6.3, 0], [1.7, 6.3, 0], [2.1, 5.0, 0]], 0.14, FOLD.bare());
  G.cyl(0.42, 1.2, FOLD.painted("#8a5a2b", 0.6, 263), [0, 6.3, 0], [0, 0, Math.PI / 2], 6);
  G.box(0.6, 1.8, 0.2, label, [1.2, 4.2, -2.12], [0, 0.5, 0]); // chorreadura
  G.decal([0, 2.6, -2.29], undefined, "label", 1.9);
  for (const y of [0.3, 4.7]) G.rivets([-2.2, y, 0], [2.2, y, 0], 2, [1, 0, 0]);
  return done(40);
}
/** Herramientas gigantes del garaje (mismo contorno que las viejas, que siguen siendo el colisionador). */
export function toolFold(kind: 0 | 1 | 2) {
  const { G, done } = kit();
  const steel = FOLD.painted("#b4bac2", 0.15, 271);
  if (kind === 0) { // llave fija / combinada
    // Vástago central con acanalado drop-forged, perfil estampado y numeración diegética "10"
    G.box(14, 1, 2.6, steel, [-0.5, 0.5, 0]);
    for (const s of [-1, 1]) G.bend([-7.2, 1, s * 1.3], [5.8, 1, s * 1.3], 0.12, steel);
    G.trimStrip([-0.5, 1.01, 0], [Math.PI / 2, 0, 0], 9.5, 1.3, "perfil", 0.02);
    G.trimStrip([-0.5, -0.01, 0], [-Math.PI / 2, 0, 0], 9.5, 1.3, "perfil", 0.02);
    // Troquelado de numeración métrica diegética "10" en acero estampado
    G.box(2.2, 0.02, 1.1, FOLD.dark(), [2.6, 1.015, 0]);
    G.box(0.24, 0.05, 0.75, steel, [2.15, 1.03, 0]);
    G.box(0.18, 0.05, 0.22, steel, [2.02, 1.03, 0.26], [0, 0.5, 0]);
    G.box(0.68, 0.05, 0.75, steel, [3.05, 1.03, 0]);
    G.box(0.28, 0.07, 0.42, FOLD.dark(), [3.05, 1.035, 0]);
    G.decal([-3.5, 1.02, 0], [Math.PI / 2, 0, 0], "numero", 0.85);
    G.bolts([-5.5, 1.02, 0], [-1.5, 1.02, 0], 3, [0, 1, 0]);

    // Mordaza abierta enriquecida con ángulo de inclinación de 15° respecto al vástago
    const ang = (15 * Math.PI) / 180;
    const jNode = new B.TransformNode("jaw", sc());
    jNode.position.set(7.8, 0.5, 0); jNode.rotation.set(0, ang, 0); jNode.computeWorldMatrix(true);
    const pJaw = (lx: number, ly: number, lz: number): V3 => {
      const v = B.Vector3.TransformCoordinates(new B.Vector3(lx, ly, lz), jNode.getWorldMatrix());
      return [v.x, v.y, v.z];
    };
    G.box(4.6, 1, 5.8, steel, pJaw(0, 0, 0), [0, ang, 0]);
    G.cyl(2.4, 1.04, FOLD.dark(), pJaw(0.1, 0, 0), [0, ang, 0], 8);
    G.box(3.2, 1.04, 2.2, FOLD.dark(), pJaw(1.5, 0, 0), [0, ang, 0]);
    G.box(0.8, 1.01, 1.0, steel, pJaw(2.0, 0, 2.2), [0, ang + 0.35, 0]);
    G.box(0.8, 1.01, 1.0, steel, pJaw(2.0, 0, -2.2), [0, ang - 0.35, 0]);
    jNode.dispose();

    // Extremo opuesto: ojo de estrella poligonal cerrado (estrella de 12 puntas) en acero estampado
    G.box(2.2, 1, 3.4, steel, [-7.2, 0.5, 0]);
    for (const s of [-1, 1]) G.bend([-6.2, 1, s * 1.3], [-7.8, 1, s * 1.7], 0.12, steel);
    G.cyl(5.6, 1.0, steel, [-8.8, 0.5, 0], undefined, 12);
    G.cyl(5.85, 0.3, steel, [-8.8, 0.5, 0], undefined, 12);
    G.cyl(2.8, 1.04, FOLD.dark(), [-8.8, 0.5, 0], undefined, 12);
    G.cyl(3.35, 1.05, FOLD.dark(), [-8.8, 0.5, 0], [0, 0, 0], 6);
    G.cyl(3.35, 1.05, FOLD.dark(), [-8.8, 0.5, 0], [0, Math.PI / 6, 0], 6);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI + Math.PI / 12;
      G.box(0.2, 1.02, 0.25, steel, [-8.8 + Math.cos(a) * 1.5, 0.5, Math.sin(a) * 1.5], [0, a, 0]);
    }
  } else if (kind === 1) { // martillo
    const wood = FOLD.painted("#B07A4A", 0.2, 272);
    // Mango de madera con empuñadura de goma antideslizante estriada
    G.cyl(1.6, 14.5, wood, [0.3, 0.8, 0], [0, 0, Math.PI / 2], 8);
    G.cyl(1.82, 4.5, FOLD.rubber(), [-4.8, 0.8, 0], [0, 0, Math.PI / 2], 8);
    for (let i = 0; i < 4; i++) G.cyl(1.98, 0.25, FOLD.dark(), [-6.2 + i * 1.0, 0.8, 0], [0, 0, Math.PI / 2], 8);
    G.cyl(2.2, 0.35, FOLD.dark(), [-7.1, 0.8, 0], [0, 0, Math.PI / 2], 8);

    // Cabeza de acero y cara de golpeo templada
    G.box(2.6, 2.6, 7, steel, [7.5, 1.3, 0]);
    for (const s of [-1, 1]) G.bend([6.2, 2.6, s * 3.5], [8.8, 2.6, s * 3.5], 0.15, steel);
    G.bolts([7.5, 2.62, -1.5], [7.5, 2.62, 1.5], 2, [0, 1, 0]);
    G.cyl(2.5, 1.0, steel, [7.5, 1.3, 3.8], [Math.PI / 2, 0, 0], 10);
    G.cyl(2.2, 0.2, FOLD.bare(), [7.5, 1.3, 4.35], [Math.PI / 2, 0, 0], 10);

    // Uña sacaclavos curvada y hendida en dos garras en chapa estampada
    for (const sy of [-1, 1]) {
      const yG = 1.3 + sy * 0.72;
      G.box(1.8, 0.85, 1.5, steel, [7.1, yG, -4.1], [0, -0.28, 0]);
      G.box(1.5, 0.75, 1.4, steel, [6.4, yG, -5.2], [0, -0.62, 0]);
      G.box(1.1, 0.65, 0.9, steel, [5.5, yG, -6.1], [0, -0.95, 0]);
      G.bend([5.9, yG, -5.7], [5.1, yG, -6.4], 0.1, steel);
    }
    G.box(1.2, 0.45, 1.2, FOLD.dark(), [7.2, 1.3, -3.8]);
    G.box(0.9, 0.35, 1.0, FOLD.dark(), [6.5, 1.3, -4.8]);

    // Cuña de seguridad de acero en la testa superior del mango
    G.cyl(1.5, 0.08, wood, [8.81, 1.3, 0], [0, 0, Math.PI / 2], 8);
    G.box(0.12, 0.28, 1.1, FOLD.bare(), [8.85, 1.3, 0]);
    G.box(0.12, 0.8, 0.22, FOLD.bare(), [8.85, 1.3, 0]);
    G.box(0.8, 0.05, 0.35, FOLD.bare(), [7.5, 2.62, 0]);
  } else { // destornillador
    const acetate = FOLD.painted("#c0392b", 0.5, 273);
    // Mango estriado de acetato rojo con remate y golpeador
    G.cyl(2.4, 6, acetate, [0, 1.2, 0], [0, 0, Math.PI / 2], 8);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      G.box(5.4, 0.3, 0.3, FOLD.dark(), [0, 1.2 + Math.cos(a) * 1.2, Math.sin(a) * 1.2], [a, 0, 0]);
    }
    G.cyl(2.1, 0.35, FOLD.dark(), [-3.05, 1.2, 0], [0, 0, Math.PI / 2], 8);
    G.cyl(1.3, 0.12, FOLD.bare(), [-3.22, 1.2, 0], [0, 0, Math.PI / 2], 8);

    // Virola y cuello hexagonal mecanizado (bolster) en la transición para torque adicional
    G.cyl(1.8, 0.35, steel, [2.9, 1.2, 0], [0, 0, Math.PI / 2], 8);
    G.cyl(1.35, 1.0, FOLD.bare(), [3.4, 1.2, 0], [0, 0, Math.PI / 2], 6);
    G.cyl(1.1, 0.35, FOLD.bare(), [3.95, 1.2, 0], [0, 0, Math.PI / 2], 6, 0.65);

    // Varilla redonda de acero
    G.cyl(0.62, 7.4, FOLD.bare(), [7.75, 1.2, 0], [0, 0, Math.PI / 2], 8);

    // Punta de cruz Phillips mecanizada con chaflanes en cruz oscura (FOLD.dark())
    G.cyl(0.62, 0.6, FOLD.bare(), [11.6, 1.2, 0], [0, 0, Math.PI / 2], 8, 0.45);
    G.box(0.65, 0.78, 0.18, FOLD.bare(), [12.0, 1.2, 0]);
    G.box(0.65, 0.18, 0.78, FOLD.bare(), [12.0, 1.2, 0]);
    for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      G.box(0.5, 0.22, 0.22, FOLD.dark(), [12.02, 1.2 + sy * 0.19, sz * 0.19], [0, 0, sy * sz * 0.35]);
    }
    G.cyl(0.26, 0.28, FOLD.dark(), [12.3, 1.2, 0], [0, 0, Math.PI / 2], 4, 0.08);
  }
  return done(30);
}
/** Regadera: tanque de chapa verde con costura remachada, pico de caño con flor y asa. */
export function wateringCanFold() {
  const { G, done } = kit();
  const g = FOLD.painted("#15803d", 0.8, 281);
  G.cyl(5, 6, g, [0, 3, 0], undefined, 12); G.cyl(5.2, 0.4, FOLD.rust(), [0, 0.2, 0], undefined, 12); G.cyl(4.6, 0.3, FOLD.bare(), [0, 6.05, 0], undefined, 12);
  G.tube([[0, 2, 2.4], [0, 5, 5], [0, 6.5, 6.5]], 0.35, g); G.cyl(1.4, 0.5, FOLD.bare(), [0, 6.7, 6.7], [0.8, 0, 0], 8);
  G.cyl(1.8, 0.35, FOLD.painted("#d97706", 0.65, 282), [0, 6.9, 6.9], [0.8, 0, 0], 10);
  G.cyl(1.5, 0.1, FOLD.dark(), [0, 7.0, 7.0], [0.8, 0, 0], 8);
  G.tube([[0, 6.0, -2.2], [0, 8.4, -1.4], [0, 8.4, 0.6], [0, 6.0, 1.4]], 0.4, g);
  G.box(0.8, 0.15, 0.8, FOLD.rust(), [0, 8.4, 0.1]);
  G.rivets([2.52, 0.6, 0], [2.52, 5.6, 0], 7, [1, 0, 0]); G.decal([0, 3.2, -2.53], undefined, "numero", 1.8);
  return done(40);
}
/** Maceta Folded (unidad sc=1, 5×4): tambor de chapa terracota con flejes oxidados, labio superior remachado y tierra. */
export function potFold() {
  const { G, done } = kit();
  const body = FOLD.painted("#c2410c", 0.85, 285), rim = FOLD.painted("#9a3412", 0.8, 286), rust = FOLD.rust();
  G.cyl(5, 4, body, [0, 2, 0], undefined, 10, 4);
  G.cyl(4.3, 0.35, rust, [0, 0.35, 0], undefined, 10);
  G.cyl(4.9, 0.28, rust, [0, 2.1, 0], undefined, 10);
  G.cyl(5.45, 0.65, rim, [0, 3.85, 0], undefined, 10);
  G.cyl(4.6, 0.22, FOLD.dark(), [0, 4.12, 0], undefined, 10);
  G.rivets([-2.3, 3.85, -1.4], [2.3, 3.85, -1.4], 4, [0, 0, -1]);
  return done(32);
}
/** Gnomo de jardín Folded: túnica de chapa azul remachada, cinturón con hebilla de acero, barba de placas y gorro rojo plegado. */
export function gnomeFold() {
  const { G, done } = kit();
  const coat = FOLD.painted("#2563eb", 0.75, 287), hat = FOLD.painted("#dc2626", 0.7, 288), skin = FOLD.painted("#e8b490", 0.5, 289), beard = FOLD.painted("#e5e7eb", 0.6, 290), steel = FOLD.bare();
  G.cyl(2.4, 4, coat, [0, 2, 0], undefined, 8, 3.6);
  G.cyl(2.7, 0.55, FOLD.dark(), [0, 2.55, 0], undefined, 8);
  G.box(0.8, 0.7, 0.25, steel, [0, 2.55, 1.32]); // hebilla
  G.box(2.1, 1.9, 2.0, skin, [0, 4.9, 0]);
  G.box(0.55, 0.5, 0.6, skin, [0, 4.9, 1.15]); // nariz
  for (const s of [-1, 1]) G.box(0.32, 0.24, 0.12, FOLD.emissive("#ffb02e"), [s * 0.52, 5.25, 1.02]);
  G.box(1.9, 2.1, 0.5, beard, [0, 3.6, 0.95], [0.25, 0, 0]); // barba de chapa
  G.cyl(0.12, 3.5, hat, [0, 7.1, -0.05], [-0.18, 0, 0], 8, 2.7);
  G.rivets([-0.9, 1.2, 1.3], [0.9, 1.2, 1.3], 4, [0, 0, 1]);
  return done(25);
}
/** Auto real oxidado en caballetes (1 u ≈ 4,5 cm). Paneles de chapa con óxido, vidrios oscuros, ópticas emisivas. */
export function realCarFold(lift: number, paint: string) {
  const { G, done } = kit();
  const pm = FOLD.painted(paint, 0.25, 291), dark = FOLD.dark(), glass = FOLD.dark(), hub = Math.max(7, lift + 1);
  G.box(40, 13, 96, pm, [0, lift + 6.5, 0]); G.box(36, 11, 50, pm, [0, lift + 18.5, -4]);
  for (const s of [-1, 1]) { G.bend([s * 20, lift + 13, -48], [s * 20, lift + 13, 48], 0.6, pm); G.box(0.4, 7, 44, glass, [s * 18.2, lift + 19, -4]); G.box(0.6, 1.2, 80, FOLD.bare(), [s * 20.2, lift + 7, 0]); }
  G.box(33, 7, 0.4, glass, [0, lift + 19, 21.1]); G.box(33, 7, 0.4, glass, [0, lift + 19, -29.1]);
  for (const bz of [48.5, -48.5]) G.box(41, 3, 3, FOLD.painted("#9E9E9E", 0.2, 292), [0, lift + 3, bz]);
  for (const bx of [-13, 13]) { G.box(8, 3, 0.5, FOLD.emissive("#e8e4d0"), [bx, lift + 9, 48.2]); G.box(8, 3, 0.5, FOLD.emissive("#8a1810"), [bx, lift + 9, -48.2]); }
  G.grate([0, lift + 8, 48.4], [0, Math.PI, 0], 14, 4, 5, FOLD.bare());
  G.decal([0, lift + 13.05, 30], [Math.PI / 2, 0, 0], "rayon", 18); G.decal([20.3, lift + 6.5, 10], [0, -Math.PI / 2, 0], "mancha", 14);
  for (const [wx, wz] of [[-19, 31], [19, 31], [-19, -31], [19, -31]]) { G.cyl(14, 8, FOLD.rubber(), [wx, hub, wz], [0, 0, Math.PI / 2], 12); G.cyl(8, 8.4, FOLD.bare(), [wx, hub, wz], [0, 0, Math.PI / 2], 8); }
  return done(1);
}
/** Labio de una rampa (coordenadas locales de ramp: sube hacia +z): franja hazard en el borde de arriba. */
export function rampLip(W: number, L: number, H: number) {
  const { G, done } = kit();
  G.trimStrip([0, H + 0.08, L], [Math.PI / 2, 0, 0], W, 0.5, "hazard", 0.12);
  return done();
}

/** Morsa / tornillo de banco de fundición pesada Folded: base cilíndrica achaflanada con brida de montaje,
 *  cuerpo masivo con guía prismática cuadrada, yunque posterior plano de golpeo en acero desnudo,
 *  mordaza fija y mordaza móvil enfrentadas con insertos diamantados estriados, husillo roscado central
 *  y manivela cilíndrica transversal oscilante con bolas de retención esféricas en los extremos. */
export function benchViseFold(): B.Mesh {
  const { G, done } = kit();
  const castBlue = FOLD.painted("#1e3a5f", 0.85, 310);
  const bare = FOLD.bare(), dark = FOLD.dark(), rubber = FOLD.rubber();

  // 1. Base cilíndrica achaflanada con brida de montaje y bulones de anclaje para atornillar a la mesa
  G.cyl(3.4, 0.22, castBlue, [0, 0.11, 0], undefined, 12);
  G.cyl(2.8, 0.32, castBlue, [0, 0.38, 0], undefined, 12, 3.2);
  G.cyl(2.6, 0.24, castBlue, [0, 0.66, 0], undefined, 12);
  // Perno y palomilla de bloqueo de giro de base
  G.cyl(0.2, 0.5, bare, [1.45, 0.66, 0], [0, 0, Math.PI / 2], 6);
  G.box(0.12, 0.18, 0.65, bare, [1.72, 0.66, 0]);
  // Bulones de anclaje a la mesa
  G.bolts([-1.3, 0.22, -0.9], [-1.3, 0.22, -0.9], 1, [0, 1, 0]);
  G.bolts([1.3, 0.22, -0.9], [1.3, 0.22, -0.9], 1, [0, 1, 0]);
  G.bolts([0, 0.22, 1.45], [0, 0.22, 1.45], 1, [0, 1, 0]);
  for (const [bx, bz] of [[-1.3, -0.9], [1.3, -0.9], [0, 1.45]]) {
    G.cyl(0.48, 0.08, dark, [bx, 0.24, bz], undefined, 8);
  }

  // 2. Cuerpo principal masivo con guía prismática cuadrada y yunque plano posterior de golpeo en acero desnudo
  G.box(1.9, 1.1, 2.4, castBlue, [0, 1.33, -0.2]);
  G.box(0.35, 0.8, 2.2, castBlue, [-1.02, 1.25, -0.2], [0, 0, 0.3]);
  G.box(0.35, 0.8, 2.2, castBlue, [1.02, 1.25, -0.2], [0, 0, -0.3]);
  // Guía prismática cuadrada (alojamiento donde desliza la guía móvil)
  G.box(1.5, 1.15, 3.4, castBlue, [0, 1.55, 0.3]);
  G.box(1.12, 0.95, 3.42, dark, [0, 1.55, 0.3]);
  G.bend([-0.75, 2.12, -0.8], [-0.75, 2.12, 1.4], 0.08, castBlue);
  G.bend([0.75, 2.12, -0.8], [0.75, 2.12, 1.4], 0.08, castBlue);

  // Yunque plano posterior rectificado de golpeo en acero desnudo
  G.box(1.6, 0.2, 1.5, bare, [0, 2.15, -1.0]);
  along(G, 0.65, 0.22, 1.1, bare, [0, 2.05, -2.1], 8);
  G.box(1.5, 0.6, 1.4, castBlue, [0, 1.75, -1.0]);
  G.box(0.9, 0.45, 0.8, castBlue, [0, 1.8, -1.9], [-0.35, 0, 0]);

  // 3. Mordaza fija
  G.box(2.3, 1.3, 1.0, castBlue, [0, 2.45, -0.15]);
  G.box(2.5, 0.55, 0.4, castBlue, [0, 2.75, 0.3]);
  // Inserto prismático diamantado estriado de la mordaza fija (FOLD.dark())
  G.box(2.4, 0.52, 0.14, dark, [0, 2.75, 0.52]);
  G.box(2.36, 0.08, 0.04, bare, [0, 2.65, 0.6]);
  G.box(2.36, 0.08, 0.04, bare, [0, 2.85, 0.6]);
  for (let i = -4; i <= 4; i++) G.box(0.06, 0.46, 0.03, bare, [i * 0.26, 2.75, 0.6]);
  G.bolts([-0.7, 2.75, 0.58], [0.7, 2.75, 0.58], 2, [0, 0, 1]);

  // 4. Mordaza móvil y corredera prismática cuadrada
  G.box(1.08, 0.9, 3.2, bare, [0, 1.55, 1.2]);
  G.box(2.3, 1.3, 1.0, castBlue, [0, 2.45, 1.55]);
  G.bend([-1.15, 2.45, 1.1], [-1.15, 3.0, 1.1], 0.08, castBlue);
  G.bend([1.15, 2.45, 1.1], [1.15, 3.0, 1.1], 0.08, castBlue);
  G.box(2.5, 0.55, 0.4, castBlue, [0, 2.75, 1.1]);
  // Inserto prismático diamantado estriado de la mordaza móvil (enfrentado a la fija)
  G.box(2.4, 0.52, 0.14, dark, [0, 2.75, 0.88]);
  G.box(2.36, 0.08, 0.04, bare, [0, 2.65, 0.8]);
  G.box(2.36, 0.08, 0.04, bare, [0, 2.85, 0.8]);
  for (let i = -4; i <= 4; i++) G.box(0.06, 0.46, 0.03, bare, [i * 0.26, 2.75, 0.8]);
  G.bolts([-0.7, 2.75, 0.82], [0.7, 2.75, 0.82], 2, [0, 0, -1]);

  // 5. Husillo roscado horizontal central en acero brillante atravesando la mordaza móvil
  G.cyl(0.48, 4.4, bare, [0, 1.55, 1.5], [Math.PI / 2, 0, 0], 10);
  for (let i = 0; i < 6; i++) G.cyl(0.52, 0.08, dark, [0, 1.55, 0.1 + i * 0.22], [Math.PI / 2, 0, 0], 8);
  // Collar de empuje y cabeza frontal del husillo
  G.box(1.2, 1.0, 0.5, castBlue, [0, 1.55, 2.2]);
  G.cyl(0.85, 0.35, bare, [0, 1.55, 2.55], [Math.PI / 2, 0, 0], 10);
  G.cyl(0.72, 0.65, bare, [0, 1.55, 2.95], [Math.PI / 2, 0, 0], 10);
  G.cyl(0.68, 0.25, bare, [0, 1.55, 3.35], [Math.PI / 2, 0, 0], 8, 0.4);

  // 6. Manivela cilíndrica transversal oscilante con dos bolas de retención esféricas en los extremos
  const ang = 0.55;
  G.cyl(0.18, 3.6, bare, [0.35 * Math.sin(ang), 1.55 - 0.35 * Math.cos(ang), 2.95], [0, 0, ang], 8);
  const rA = 2.15, rB = -1.45;
  G.sph(0.42, bare, [rA * Math.sin(ang), 1.55 - rA * Math.cos(ang), 2.95]);
  G.cyl(0.28, 0.1, rubber, [(rA - 0.2) * Math.sin(ang), 1.55 - (rA - 0.2) * Math.cos(ang), 2.95], [0, 0, ang], 6);
  G.sph(0.42, bare, [rB * Math.sin(ang), 1.55 - rB * Math.cos(ang), 2.95]);
  G.cyl(0.28, 0.1, rubber, [(rB + 0.2) * Math.sin(ang), 1.55 - (rB + 0.2) * Math.cos(ang), 2.95], [0, 0, ang], 6);

  const parts = done(18);
  const m = parts.length > 1 ? B.Mesh.MergeMeshes(parts, true, true, undefined, false, true)! : parts[0];
  m.name = "benchViseFold";
  return m;
}

/** Carro porta-herramientas rodante de taller Folded: estructura prismática de chapa roja de competición,
 *  tapa superior con alfombrilla y reborde de goma negra antideslizante, 4 cajones frontales apilados con tiradores
 *  longitudinales en aluminio extrusionado y nervaduras estampadas, y 4 ruedas pivotantes inferiores en goma/acero con frenos de pie. */
export function toolTrolleyFold(): B.Mesh {
  const { G, done } = kit();
  const redPaint = FOLD.painted("#dc2626", 0.8, 312);
  const bare = FOLD.bare(), dark = FOLD.dark(), rubber = FOLD.rubber();

  // 1. Estructura prismática vertical de chapa plegada roja de competición
  G.box(5.4, 6.0, 3.6, redPaint, [0, 4.3, 0]);
  G.box(5.55, 0.3, 3.75, dark, [0, 1.45, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    G.bend([sx * 2.7, 1.4, sz * 1.8], [sx * 2.7, 7.2, sz * 1.8], 0.12, redPaint);
  }
  for (const sx of [-1, 1]) {
    G.box(0.08, 5.2, 0.3, dark, [sx * 2.72, 4.3, -1.0]);
    G.box(0.08, 5.2, 0.3, dark, [sx * 2.72, 4.3, 1.0]);
    G.rivets([sx * 2.72, 1.8, 0], [sx * 2.72, 6.8, 0], 6, [sx, 0, 0]);
  }
  // Asa lateral tubular de maniobra en aluminio (-x)
  G.box(0.55, 0.18, 0.18, bare, [-2.98, 6.7, -1.1]);
  G.box(0.55, 0.18, 0.18, bare, [-2.98, 6.7, 1.1]);
  G.cyl(0.24, 2.4, bare, [-3.25, 6.7, 0], [Math.PI / 2, 0, 0], 8);
  G.cyl(0.28, 0.12, rubber, [-3.25, 6.7, -0.6], [Math.PI / 2, 0, 0], 8);
  G.cyl(0.28, 0.12, rubber, [-3.25, 6.7, 0.6], [Math.PI / 2, 0, 0], 8);
  // Franja diegética hazard en zócalo y calco de taller en lateral
  G.trimStrip([0, 1.45, 1.89], undefined, 5.2, 0.22, "hazard", 0.02);
  G.decal([2.72, 5.5, 0], [0, -Math.PI / 2, 0], "label", 1.8);

  // 2. Tapa superior con reborde de goma negra antideslizante
  G.box(5.45, 0.15, 3.65, redPaint, [0, 7.37, 0]);
  G.box(5.2, 0.08, 3.4, rubber, [0, 7.45, 0]);
  for (let z = -1.4; z <= 1.4; z += 0.4) G.box(5.0, 0.04, 0.12, dark, [0, 7.5, z]);
  G.box(5.5, 0.25, 0.16, rubber, [0, 7.52, 1.78]);
  G.box(5.5, 0.25, 0.16, rubber, [0, 7.52, -1.78]);
  G.box(0.16, 0.25, 3.65, rubber, [-2.68, 7.52, 0]);
  G.box(0.16, 0.25, 3.65, rubber, [2.68, 7.52, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    G.box(0.35, 0.35, 0.35, dark, [sx * 2.68, 7.48, sz * 1.78]);
  }

  // 3. 4 cajones frontales apilados con tiradores longitudinales en aluminio extrusionado y nervaduras estampadas
  const drawers: [number, number][] = [[6.6, 0.9], [5.5, 1.1], [4.2, 1.3], [2.7, 1.5]];
  for (const [dy, dh] of drawers) {
    G.box(4.9, dh - 0.12, 0.14, redPaint, [0, dy, 1.82]);
    G.bend([-2.4, dy + dh * 0.44, 1.84], [2.4, dy + dh * 0.44, 1.84], 0.04, redPaint);
    G.bend([-2.4, dy - dh * 0.44, 1.84], [2.4, dy - dh * 0.44, 1.84], 0.04, redPaint);
    // Nervaduras estampadas de refuerzo
    G.box(4.4, 0.06, 0.05, dark, [0, dy - dh * 0.15, 1.89]);
    G.box(4.4, 0.06, 0.05, dark, [0, dy - dh * 0.32, 1.89]);
    // Tirador longitudinal en perfil de aluminio extrusionado con labio ergonómico
    G.box(4.7, 0.15, 0.18, bare, [0, dy + dh * 0.3, 1.94]);
    G.box(4.4, 0.06, 0.03, dark, [0, dy + dh * 0.3, 2.04]);
  }
  // Cerradura cilíndrica de seguridad
  G.cyl(0.3, 0.08, bare, [2.1, 7.0, 1.88], [Math.PI / 2, 0, 0], 8);
  G.box(0.04, 0.14, 0.03, dark, [2.1, 7.0, 1.93]);

  // 4. 4 ruedas pivotantes inferiores en goma/acero con frenos de pie
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const rx = sx * 2.15, rz = sz * 1.35;
    G.box(0.9, 0.08, 0.9, bare, [rx, 1.26, rz]);
    G.bolts([rx - 0.3, 1.22, rz], [rx + 0.3, 1.22, rz], 2, [0, -1, 0]);
    G.cyl(0.72, 0.14, bare, [rx, 1.16, rz], undefined, 8);
    G.box(0.12, 0.72, 0.6, bare, [rx - 0.32, 0.82, rz]);
    G.box(0.12, 0.72, 0.6, bare, [rx + 0.32, 0.82, rz]);
    G.cyl(0.2, 0.85, bare, [rx, 0.52, rz], [0, 0, Math.PI / 2], 6);
    G.cyl(0.8, 0.46, bare, [rx, 0.52, rz], [0, 0, Math.PI / 2], 10);
    G.cyl(0.4, 0.5, dark, [rx, 0.52, rz], [0, 0, Math.PI / 2], 8);
    G.cyl(1.04, 0.42, rubber, [rx, 0.52, rz], [0, 0, Math.PI / 2], 12);
    // Frenos de pie en las ruedas frontales
    if (sz === 1) {
      G.box(0.22, 0.08, 0.55, bare, [rx, 0.82, rz + 0.35], [-0.35, 0, 0]);
      G.box(0.38, 0.08, 0.22, dark, [rx, 0.94, rz + 0.62]);
    }
  }

  const parts = done(20);
  const m = parts.length > 1 ? B.Mesh.MergeMeshes(parts, true, true, undefined, false, true)! : parts[0];
  m.name = "toolTrolleyFold";
  return m;
}

/** Taladro de columna vertical de taller Folded: base de fundición pesada ranurada para amarre de piezas en verde petróleo industrial,
 *  columna cilíndrica vertical de acero pulido con cremallera posterior, mesa intermedia octogonal regulable en altura con collarín de bloqueo,
 *  cabezal superior motorizado con carcasa de poleas trapezoidales en chapa plegada y motor eléctrico trasero cilíndrico aleteado,
 *  eje principal con pínola graduada, mandril portabrocas cilíndrico estriado y broca espiralada descendente de corte,
 *  y volante de bajada sensible con 3 brazos radiales de acero terminados en pomos esféricos de agarre. */
export function drillPressFold(): B.Mesh {
  const { G, done } = kit();
  const castPetrol = FOLD.painted("#0e7490", 0.85, 316);
  const bare = FOLD.bare(), dark = FOLD.dark(), rubber = FOLD.rubber();
  const btnGreen = FOLD.emissive("#22c55e"), btnRed = FOLD.emissive("#ef4444");

  // 1. Base de fundición pesada ranurada para amarre de piezas
  G.box(3.2, 0.45, 4.2, castPetrol, [0, 0.225, 0.1]);
  G.box(3.4, 0.14, 4.4, dark, [0, 0.07, 0.1]);
  G.box(2.6, 0.04, 2.5, bare, [0, 0.47, 0.65]);
  // Ranuras en T mecanizadas de amarre longitudinales y transversales
  G.box(0.18, 0.08, 2.3, dark, [-0.65, 0.46, 0.65]);
  G.box(0.18, 0.08, 2.3, dark, [0.65, 0.46, 0.65]);
  G.box(1.8, 0.08, 0.18, dark, [0, 0.46, 0.65]);
  // Collarín cilíndrico de base para la columna y nervaduras de fundición
  G.cyl(1.85, 0.6, castPetrol, [0, 0.75, -1.0], undefined, 12, 2.05);
  G.box(0.18, 0.48, 0.9, castPetrol, [-0.85, 0.5, -0.65], [0.35, 0, 0]);
  G.box(0.18, 0.48, 0.9, castPetrol, [0.85, 0.5, -0.65], [0.35, 0, 0]);
  G.box(0.5, 0.48, 0.18, castPetrol, [0, 0.5, -1.55]);
  // Bulones de anclaje a la mesa
  G.bolts([-1.35, 0.45, 1.8], [1.35, 0.45, 1.8], 2, [0, 1, 0]);
  G.bolts([-1.35, 0.45, -1.6], [1.35, 0.45, -1.6], 2, [0, 1, 0]);
  for (const [bx, bz] of [[-1.35, 1.8], [1.35, 1.8], [-1.35, -1.6], [1.35, -1.6]]) {
    G.cyl(0.38, 0.04, dark, [bx, 0.47, bz], undefined, 8);
  }
  // Bulón y collarín de apriete de columna en la base
  G.cyl(0.24, 0.45, bare, [0.95, 0.8, -1.0], [0, 0, Math.PI / 2], 6);
  G.bolts([0.85, 0.8, -1.0], [0.85, 0.8, -1.0], 1, [1, 0, 0]);

  // 2. Columna cilíndrica vertical de acero pulido y cremallera de elevación
  G.cyl(1.3, 6.6, bare, [0, 4.3, -1.0], undefined, 12);
  G.box(0.22, 4.4, 0.08, bare, [0, 3.8, -0.34]);
  for (let dy = 1.8; dy <= 5.8; dy += 0.28) {
    G.box(0.18, 0.06, 0.04, dark, [0, dy, -0.29]);
  }
  G.cyl(1.42, 0.16, bare, [0, 1.6, -1.0], undefined, 12);
  G.cyl(1.42, 0.16, bare, [0, 6.0, -1.0], undefined, 12);

  // 3. Mesa intermedia de taladrado octogonal regulable en altura con collarín de bloqueo
  G.cyl(1.75, 0.65, castPetrol, [0, 3.2, -1.0], undefined, 12);
  G.cyl(0.2, 0.5, bare, [-0.95, 3.2, -1.0], [0, 0, Math.PI / 2], 6);
  G.box(0.14, 0.22, 0.85, bare, [-1.22, 3.2, -1.0], [0.35, 0, 0]);
  G.sph(0.26, dark, [-1.22, 3.5, -1.35]);
  // Brazo soporte en ménsula y manivela helicoidal
  G.box(1.2, 0.55, 1.2, castPetrol, [0, 3.2, -0.15]);
  G.cyl(1.3, 0.35, castPetrol, [0, 3.3, 0.5], undefined, 10);
  G.cyl(0.16, 0.55, bare, [0.85, 3.2, -0.6], [0, 0, Math.PI / 2], 6);
  G.box(0.1, 0.65, 0.12, bare, [1.15, 3.45, -0.6]);
  G.cyl(0.16, 0.35, dark, [1.25, 3.75, -0.6], [0, 0, Math.PI / 2], 6);
  // Plato octogonal de taladrado con ranuras radiales
  G.cyl(2.7, 0.32, castPetrol, [0, 3.55, 0.65], undefined, 8);
  G.cyl(2.82, 0.1, castPetrol, [0, 3.68, 0.65], undefined, 8);
  G.cyl(2.5, 0.05, bare, [0, 3.72, 0.65], undefined, 8);
  G.cyl(0.5, 0.06, dark, [0, 3.73, 0.65], undefined, 10);
  G.box(0.16, 0.06, 2.2, dark, [0, 3.73, 0.65]);
  G.box(2.2, 0.06, 0.16, dark, [0, 3.73, 0.65]);
  G.box(0.16, 0.06, 1.8, dark, [0, 3.73, 0.65], [0, Math.PI / 4, 0]);
  G.box(0.16, 0.06, 1.8, dark, [0, 3.73, 0.65], [0, -Math.PI / 4, 0]);

  // 4. Cabezal superior motorizado con carcasa protectora de poleas y motor eléctrico trasero
  G.box(2.0, 1.2, 2.6, castPetrol, [0, 7.0, -0.1]);
  G.cyl(1.8, 0.45, castPetrol, [0, 6.6, -1.0], undefined, 12);
  G.bolts([-0.8, 6.6, -1.0], [0.8, 6.6, -1.0], 2, [0, 0, 1]);
  // Carcasa protectora superior de poleas trapezoidales en chapa plegada
  G.box(2.2, 0.85, 3.6, castPetrol, [0, 7.95, -0.4]);
  G.bend([-1.1, 8.37, -2.1], [-1.1, 8.37, 1.3], 0.08, castPetrol);
  G.bend([1.1, 8.37, -2.1], [1.1, 8.37, 1.3], 0.08, castPetrol);
  G.bend([-1.1, 8.37, 1.3], [1.1, 8.37, 1.3], 0.08, castPetrol);
  G.bend([-1.1, 8.37, -2.1], [1.1, 8.37, -2.1], 0.08, castPetrol);
  G.cyl(0.28, 0.14, bare, [0, 8.45, 0.8], undefined, 8);
  // Franja diegética hazard en chapa sobre la carcasa superior
  const yStrip = FOLD.painted("#eab308", 0.6, 318);
  G.box(2.0, 0.18, 0.04, yStrip, [0, 7.95, 1.41]);
  for (let s = -4; s <= 4; s++) {
    G.box(0.12, 0.18, 0.05, dark, [s * 0.22, 7.95, 1.41], [0, 0, 0.5]);
  }
  // Motor eléctrico trasero cilíndrico aleteado
  G.box(0.18, 0.35, 0.8, bare, [-0.75, 6.8, -1.8]);
  G.box(0.18, 0.35, 0.8, bare, [0.75, 6.8, -1.8]);
  G.cyl(0.18, 0.45, bare, [0.95, 6.8, -1.8], [0, 0, Math.PI / 2], 6);
  G.cyl(1.45, 1.3, dark, [0, 6.8, -2.15], undefined, 12);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    G.box(0.04, 1.25, 0.12, dark, [Math.cos(a) * 0.74, 6.8, -2.15 + Math.sin(a) * 0.74], [0, -a, 0]);
  }
  G.cyl(1.35, 0.28, castPetrol, [0, 6.1, -2.15], undefined, 10);
  G.cyl(1.0, 0.06, dark, [0, 5.94, -2.15], undefined, 8);
  G.box(0.32, 0.45, 0.45, dark, [-0.85, 6.8, -2.15]);
  G.cyl(0.16, 0.22, bare, [-1.05, 6.65, -2.15], [0, 0, Math.PI / 2], 6);
  // Caja de mandos frontal con interruptor industrial Start/Stop
  G.box(0.55, 0.85, 0.32, dark, [-0.95, 6.95, 0.75]);
  G.box(0.52, 0.82, 0.04, bare, [-0.95, 6.95, 0.92]);
  G.cyl(0.22, 0.08, btnGreen, [-0.95, 7.15, 0.96], [Math.PI / 2, 0, 0], 8);
  G.cyl(0.42, 0.04, FOLD.painted("#eab308", 0.5, 317), [-0.95, 6.75, 0.93], [Math.PI / 2, 0, 0], 8);
  G.cyl(0.32, 0.14, btnRed, [-0.95, 6.75, 0.99], [Math.PI / 2, 0, 0], 10);

  // 5. Eje principal con mandril portabrocas cilíndrico estriado y broca espiralada descendente
  G.cyl(0.85, 1.4, bare, [0, 5.8, 0.65], undefined, 12);
  G.cyl(0.12, 1.4, bare, [-0.6, 5.9, 0.65], undefined, 6);
  G.cyl(0.28, 0.12, dark, [-0.6, 5.7, 0.65], undefined, 8);
  G.cyl(0.28, 0.12, dark, [-0.6, 5.55, 0.65], undefined, 8);
  G.box(0.35, 0.12, 0.18, castPetrol, [-0.45, 6.3, 0.65]);
  // Mandril portabrocas
  G.cyl(0.68, 0.25, bare, [0, 5.05, 0.65], undefined, 10, 0.62);
  G.cyl(0.82, 0.22, dark, [0, 4.85, 0.65], undefined, 12, 0.72);
  G.cyl(0.12, 0.2, dark, [0.38, 4.85, 0.65], [0, 0, Math.PI / 2], 6);
  G.cyl(0.78, 0.48, dark, [0, 4.52, 0.65], undefined, 12);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    G.box(0.04, 0.42, 0.04, bare, [Math.cos(a) * 0.39, 4.52, 0.65 + Math.sin(a) * 0.39], [0, -a, 0]);
  }
  G.cyl(0.72, 0.25, dark, [0, 4.18, 0.65], undefined, 10, 0.42);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    G.box(0.08, 0.18, 0.08, bare, [Math.cos(a) * 0.12, 4.06, 0.65 + Math.sin(a) * 0.12], [0, -a, 0]);
  }
  // Broca espiralada descendente de corte
  G.cyl(0.24, 0.3, bare, [0, 3.92, 0.65], undefined, 8);
  G.cyl(0.22, 0.85, bare, [0, 3.45, 0.65], undefined, 8);
  for (let i = 0; i < 7; i++) {
    const ang = i * 0.85, yb = 3.75 - i * 0.08;
    G.box(0.24, 0.06, 0.08, dark, [0, yb, 0.65], [0, ang, 0]);
  }
  G.cyl(0.22, 0.12, bare, [0, 2.98, 0.65], undefined, 6, 0.04);

  // 6. Volante de bajada sensible con 3 brazos radiales de acero terminados en pomos esféricos
  G.cyl(0.48, 0.24, bare, [1.12, 7.0, 0.65], [0, 0, Math.PI / 2], 10);
  G.cyl(0.42, 0.18, dark, [1.22, 7.0, 0.65], [0, 0, Math.PI / 2], 10);
  G.cyl(0.65, 0.28, bare, [1.35, 7.0, 0.65], [0, 0, Math.PI / 2], 10);
  G.cyl(0.28, 0.1, dark, [1.51, 7.0, 0.65], [0, 0, Math.PI / 2], 6);
  for (let k = 0; k < 3; k++) {
    const ang = k * ((Math.PI * 2) / 3);
    const dy = Math.cos(ang), dz = Math.sin(ang);
    const armLen = 1.25;
    const pEnd: V3 = [1.55, 7.0 + dy * armLen, 0.65 + dz * armLen];
    G.tube([[1.35, 7.0, 0.65], pEnd], 0.045, bare);
    G.sph(0.34, dark, pEnd);
    G.sph(0.22, rubber, [1.55, 7.0 + dy * (armLen - 0.12), 0.65 + dz * (armLen - 0.12)]);
  }

  const parts = done(18);
  const m = parts.length > 1 ? B.Mesh.MergeMeshes(parts, true, true, undefined, false, true)! : parts[0];
  m.name = "drillPressFold";
  return m;
}

/** Fresadora vertical de torreta (Bridgeport) de taller Folded: base masiva de fundición pesada con brida y ranuras en T en gris oscuro industrial,
 *  columna prismática vertical robusta con guías en cola de milano rectificadas en acero desnudo,
 *  ménsula de elevación vertical (eje Z) con fuelle protector de goma en acordeón y volante frontal con manivela,
 *  carro transversal (eje Y) y mesa de coordenadas longitudinal (eje X) alargada con ranuras en T longitudinales,
 *  nonios circulares graduados y manivelas cromadas con mangos oscilantes en ambos extremos,
 *  y brazo superior de torreta horizontal orientable con cremallera, cabezal superior de fresado con carcasa de poleas,
 *  motor trasero aleteado y husillo vertical con fresa cilíndrica de planear de insertos de corte. */
export function millingMachineFold(): B.Mesh {
  const { G, done } = kit();
  const castGrey = FOLD.painted("#1e293b", 0.85, 318);
  const bare = FOLD.bare(), dark = FOLD.dark(), rubber = FOLD.rubber();
  const carbide = FOLD.painted("#eab308", 0.4, 321);
  const btnGreen = FOLD.emissive("#22c55e"), btnRed = FOLD.emissive("#ef4444");

  // 1. Base masiva de fundición pesada con brida perimetral, ranuras en T y anclajes
  G.box(3.4, 0.42, 4.4, castGrey, [0, 0.21, -0.4]);
  G.box(3.65, 0.14, 4.65, dark, [0, 0.07, -0.4]);
  G.bend([-1.7, 0.42, -2.6], [1.7, 0.42, -2.6], 0.06, castGrey);
  G.bend([-1.7, 0.42, 1.8], [1.7, 0.42, 1.8], 0.06, castGrey);
  G.bend([-1.7, 0.42, -2.6], [-1.7, 0.42, 1.8], 0.06, castGrey);
  G.bend([1.7, 0.42, -2.6], [1.7, 0.42, 1.8], 0.06, castGrey);
  // Bulones de anclaje de la base al suelo
  for (const [bx, bz] of [[-1.45, 1.5], [1.45, 1.5], [-1.45, -2.2], [1.45, -2.2]]) {
    G.cyl(0.44, 0.06, dark, [bx, 0.43, bz], undefined, 8);
    G.bolts([bx, 0.42, bz], [bx, 0.42, bz], 1, [0, 1, 0]);
  }
  // Depósito de taladrina / plataforma frontal con ranuras en T mecanizadas
  G.box(2.6, 0.08, 1.6, dark, [0, 0.44, 0.9]);
  G.box(2.2, 0.04, 1.3, bare, [0, 0.47, 0.9]);
  G.box(0.14, 0.06, 1.2, dark, [-0.6, 0.48, 0.9]);
  G.box(0.14, 0.06, 1.2, dark, [0.6, 0.48, 0.9]);
  // Nervaduras de fundición de unión entre base y columna
  G.box(0.2, 0.65, 1.1, castGrey, [-1.15, 0.72, -0.7], [0.35, 0, 0]);
  G.box(0.2, 0.65, 1.1, castGrey, [1.15, 0.72, -0.7], [0.35, 0, 0]);

  // 2. Columna prismática vertical robusta con guías en cola de milano rectificadas
  G.box(2.4, 2.8, 2.6, castGrey, [0, 1.82, -1.1]);
  G.box(2.3, 3.4, 2.4, castGrey, [0, 4.85, -1.1]);
  // Guías prismáticas rectificadas en cola de milano (dovetail) en acero desnudo
  G.box(1.7, 4.6, 0.08, bare, [0, 3.75, 0.15]);
  G.box(0.14, 4.6, 0.16, bare, [-0.88, 3.75, 0.14], [0, 0.45, 0]);
  G.box(0.14, 4.6, 0.16, bare, [0.88, 3.75, 0.14], [0, -0.45, 0]);
  // Regla graduada milimetrada vertical al costado de la guía
  G.box(0.06, 4.2, 0.02, dark, [0.96, 3.75, 0.18]);
  for (let dy = 1.8; dy <= 5.8; dy += 0.25) {
    G.box(0.08, 0.02, 0.02, bare, [0.96, dy, 0.19]);
  }
  // Puerta de registro lateral / armario eléctrico en -X con rejillas de ventilación y pestillo
  G.box(0.06, 2.5, 1.5, castGrey, [-1.22, 3.5, -1.1]);
  G.box(0.04, 2.54, 1.54, dark, [-1.21, 3.5, -1.1]);
  for (let yl = 2.7; yl <= 3.3; yl += 0.15) {
    G.box(0.04, 0.05, 0.9, dark, [-1.25, yl, -1.1], [0.4, 0, 0]);
  }
  G.cyl(0.08, 0.2, bare, [-1.24, 4.4, -0.4], undefined, 6);
  G.cyl(0.08, 0.2, bare, [-1.24, 2.6, -0.4], undefined, 6);
  G.box(0.06, 0.22, 0.08, bare, [-1.26, 3.5, -1.75]);
  G.sph(0.12, dark, [-1.27, 3.4, -1.75]);
  // Chapa diegética de advertencia / peligro en la columna
  G.plate([-1.23, 5.1, -1.1], [0, -Math.PI / 2, 0], 0.7, 0.45, FOLD.painted("#eab308", 0.5, 319));
  G.box(0.02, 0.14, 0.4, dark, [-1.25, 5.1, -1.1]);
  // Brida superior de torreta (anillo circular graduado con 4 bulones T)
  G.cyl(2.3, 0.32, castGrey, [0, 6.56, -1.1], undefined, 16);
  G.cyl(2.36, 0.1, bare, [0, 6.46, -1.1], undefined, 16);
  for (let a = 0; a < 4; a++) {
    const ang = (a / 4) * Math.PI * 2 + Math.PI / 4;
    G.bolts([Math.cos(ang) * 0.95, 6.72, -1.1 + Math.sin(ang) * 0.95], [Math.cos(ang) * 0.95, 6.72, -1.1 + Math.sin(ang) * 0.95], 1, [0, 1, 0]);
  }

  // 3. Ménsula de elevación vertical (eje Z) con fuelle de goma y volante frontal
  G.box(2.1, 1.4, 2.1, castGrey, [0, 2.5, 0.85]);
  G.box(1.7, 1.1, 1.3, castGrey, [0, 1.95, 1.1], [-0.55, 0, 0]);
  // Fuelle protector de goma tipo acordeón sobre las guías
  for (let k = 0; k < 6; k++) {
    const yb = 3.25 + k * 0.2;
    G.box(1.74, 0.12, 0.16, rubber, [0, yb, 0.24]);
    G.box(1.8, 0.04, 0.2, dark, [0, yb, 0.24]);
  }
  G.box(1.82, 0.06, 0.05, bare, [0, 3.18, 0.26]);
  G.box(1.82, 0.06, 0.05, bare, [0, 4.42, 0.26]);
  // Husillo telescópico vertical de elevación con pedestal tubular
  G.cyl(0.68, 1.4, castGrey, [0, 1.15, 1.1], undefined, 10);
  G.cyl(0.44, 1.1, bare, [0, 1.75, 1.1], undefined, 10);
  G.cyl(0.88, 0.12, dark, [0, 0.48, 1.1], undefined, 10);
  // Volante frontal de elevación del eje Z con caja cónica, nonio graduado y manivela
  G.box(0.85, 0.6, 0.65, castGrey, [0, 2.2, 1.75]);
  G.cyl(0.2, 0.42, bare, [0, 2.15, 2.1], [Math.PI / 2, 0, 0], 8);
  G.cyl(0.52, 0.15, bare, [0, 2.15, 2.2], [Math.PI / 2, 0, 0], 12);
  G.cyl(0.38, 0.16, dark, [0, 2.15, 2.32], [Math.PI / 2, 0, 0], 10);
  G.cyl(1.3, 0.12, bare, [0, 2.15, 2.4], [Math.PI / 2, 0, 0], 16);
  G.cyl(1.12, 0.14, dark, [0, 2.15, 2.4], [Math.PI / 2, 0, 0], 16);
  for (let s = 0; s < 3; s++) {
    const sa = (s / 3) * Math.PI * 2;
    G.box(0.08, 0.48, 0.06, bare, [Math.cos(sa) * 0.35, 2.15 + Math.sin(sa) * 0.35, 2.4], [0, 0, sa]);
  }
  G.cyl(0.22, 0.1, bare, [0, 2.15, 2.48], [Math.PI / 2, 0, 0], 6);
  G.cyl(0.1, 0.42, bare, [0.52, 2.15, 2.65], [Math.PI / 2, 0, 0], 6);
  G.cyl(0.16, 0.26, rubber, [0.52, 2.15, 2.65], [Math.PI / 2, 0, 0], 8);
  G.sph(0.2, bare, [0.52, 2.15, 2.88]);
  // Palanca lateral de bloqueo de la ménsula (+X)
  G.cyl(0.12, 0.32, bare, [1.1, 2.7, 0.45], [0, 0, Math.PI / 2], 6);
  G.box(0.06, 0.45, 0.06, bare, [1.25, 2.9, 0.45], [0, 0, -0.4]);
  G.sph(0.18, dark, [1.36, 3.1, 0.45]);

  // 4. Carro transversal (eje Y) y mesa de coordenadas longitudinal (eje X)
  G.box(2.6, 0.48, 2.0, castGrey, [0, 3.44, 1.1]);
  G.box(0.16, 0.08, 1.8, bare, [-1.1, 3.22, 1.1]);
  G.box(0.16, 0.08, 1.8, bare, [1.1, 3.22, 1.1]);
  // Mando frontal del carro transversal (eje Y) con nonio graduado y manivela
  G.box(0.65, 0.38, 0.42, castGrey, [0, 3.44, 2.2]);
  G.cyl(0.54, 0.16, bare, [0, 3.44, 2.44], [Math.PI / 2, 0, 0], 12);
  G.cyl(0.56, 0.03, dark, [0, 3.44, 2.44], [Math.PI / 2, 0, 0], 12);
  G.cyl(0.34, 0.14, bare, [0, 3.44, 2.58], [Math.PI / 2, 0, 0], 8);
  G.box(0.08, 0.65, 0.06, bare, [0, 3.75, 2.63]);
  G.cyl(0.1, 0.34, bare, [0, 4.02, 2.78], [Math.PI / 2, 0, 0], 6);
  G.sph(0.18, dark, [0, 3.44, 2.64]);
  G.sph(0.2, bare, [0, 4.02, 2.96]);
  // Guías longitudinales para la mesa sobre el carro transversal
  G.box(2.5, 0.1, 0.2, bare, [0, 3.68, 0.45]);
  G.box(2.5, 0.1, 0.2, bare, [0, 3.68, 1.75]);

  // Mesa de coordenadas longitudinal alargada (eje X) con 3 ranuras en T
  G.box(6.6, 0.4, 1.5, castGrey, [0, 3.92, 1.1]);
  G.box(6.4, 0.05, 1.44, bare, [0, 4.145, 1.1]);
  G.box(0.3, 0.1, 1.3, dark, [-3.15, 4.11, 1.1]);
  G.box(0.3, 0.1, 1.3, dark, [3.15, 4.11, 1.1]);
  // 3 ranuras en T longitudinales mecanizadas
  G.box(5.9, 0.08, 0.15, dark, [0, 4.14, 1.1]);
  G.box(5.9, 0.08, 0.15, dark, [0, 4.14, 0.72]);
  G.box(5.9, 0.08, 0.15, dark, [0, 4.14, 1.48]);
  G.box(5.9, 0.02, 0.07, bare, [0, 4.11, 1.1]);
  G.box(5.9, 0.02, 0.07, bare, [0, 4.11, 0.72]);
  G.box(5.9, 0.02, 0.07, bare, [0, 4.11, 1.48]);
  // Ranura frontal y topes mecánicos ajustables con bulones
  G.box(6.3, 0.12, 0.04, dark, [0, 3.92, 1.86]);
  G.box(0.22, 0.18, 0.08, bare, [-1.5, 3.92, 1.91]);
  G.bolts([-1.5, 3.92, 1.94], [-1.5, 3.92, 1.94], 1, [0, 0, 1]);
  G.box(0.22, 0.18, 0.08, bare, [1.5, 3.92, 1.91]);
  G.bolts([1.5, 3.92, 1.94], [1.5, 3.92, 1.94], 1, [0, 0, 1]);
  // Extremo izquierdo (-X): soporte, nonio graduado y manivela cromada con mango oscilante
  G.box(0.2, 0.38, 0.8, castGrey, [-3.38, 3.92, 1.1]);
  G.cyl(0.22, 0.4, bare, [-3.58, 3.92, 1.1], [0, 0, Math.PI / 2], 8);
  G.cyl(0.58, 0.16, bare, [-3.64, 3.92, 1.1], [0, 0, Math.PI / 2], 12);
  G.cyl(0.6, 0.03, dark, [-3.64, 3.92, 1.1], [0, 0, Math.PI / 2], 12);
  G.cyl(0.1, 0.18, bare, [-3.64, 4.24, 1.1], undefined, 6);
  G.cyl(0.38, 0.14, bare, [-3.78, 3.92, 1.1], [0, 0, Math.PI / 2], 8);
  G.box(0.08, 0.68, 0.14, bare, [-3.84, 4.2, 1.22], [-0.35, 0, 0]);
  G.cyl(0.12, 0.38, bare, [-4.05, 4.46, 1.34], [0, 0, Math.PI / 2], 6);
  G.cyl(0.18, 0.28, rubber, [-4.05, 4.46, 1.34], [0, 0, Math.PI / 2], 8);
  G.sph(0.22, bare, [-4.25, 4.46, 1.34]);
  // Extremo derecho (+X): soporte, nonio graduado y manivela cromada con mango oscilante
  G.box(0.2, 0.38, 0.8, castGrey, [3.38, 3.92, 1.1]);
  G.cyl(0.22, 0.4, bare, [3.58, 3.92, 1.1], [0, 0, Math.PI / 2], 8);
  G.cyl(0.58, 0.16, bare, [3.64, 3.92, 1.1], [0, 0, Math.PI / 2], 12);
  G.cyl(0.6, 0.03, dark, [3.64, 3.92, 1.1], [0, 0, Math.PI / 2], 12);
  G.cyl(0.1, 0.18, bare, [3.64, 4.24, 1.1], undefined, 6);
  G.cyl(0.38, 0.14, bare, [3.78, 3.92, 1.1], [0, 0, Math.PI / 2], 8);
  G.box(0.08, 0.68, 0.14, bare, [3.84, 3.64, 0.98], [-0.35, 0, 0]);
  G.cyl(0.12, 0.38, bare, [4.05, 3.38, 0.86], [0, 0, Math.PI / 2], 6);
  G.cyl(0.18, 0.28, rubber, [4.05, 3.38, 0.86], [0, 0, Math.PI / 2], 8);
  G.sph(0.22, bare, [4.25, 3.38, 0.86]);

  // 5. Brazo superior de torreta horizontal orientable con cremallera y cabezal de fresado
  G.box(1.7, 0.9, 3.5, castGrey, [0, 7.15, -0.7]);
  G.bend([-0.85, 7.58, -2.4], [-0.85, 7.58, 1.0], 0.05, castGrey);
  G.bend([0.85, 7.58, -2.4], [0.85, 7.58, 1.0], 0.05, castGrey);
  G.bend([-0.85, 6.72, -2.4], [-0.85, 6.72, 1.0], 0.05, castGrey);
  G.bend([0.85, 6.72, -2.4], [0.85, 6.72, 1.0], 0.05, castGrey);
  G.box(0.12, 0.74, 3.3, bare, [-0.86, 7.15, -0.7]);
  G.box(0.12, 0.74, 3.3, bare, [0.86, 7.15, -0.7]);
  // Cremallera lateral dentada y piñón de ajuste horizontal del brazo
  G.box(0.07, 0.2, 3.0, bare, [-0.92, 6.88, -0.7]);
  for (let zr = -2.1; zr <= 0.6; zr += 0.22) {
    G.box(0.05, 0.16, 0.07, dark, [-0.94, 6.88, zr]);
  }
  G.cyl(0.22, 0.32, bare, [-1.02, 6.58, -0.6], [0, 0, Math.PI / 2], 6);
  G.cyl(0.3, 0.1, dark, [-1.16, 6.58, -0.6], [0, 0, Math.PI / 2], 6);

  // Brida frontal de giro y basculación del cabezal
  G.cyl(1.8, 0.25, castGrey, [0, 7.15, 1.05], [Math.PI / 2, 0, 0], 16);
  G.cyl(1.86, 0.07, bare, [0, 7.15, 1.16], [Math.PI / 2, 0, 0], 16);
  G.bolts([-0.6, 7.15, 1.2], [0.6, 7.15, 1.2], 2, [0, 0, 1]);
  G.bolts([0, 7.75, 1.2], [0, 7.75, 1.2], 1, [0, 0, 1]);
  G.bolts([0, 6.55, 1.2], [0, 6.55, 1.2], 1, [0, 0, 1]);

  // Cabezal superior de fresado: cuerpo, carcasa de poleas y motor trasero
  G.box(1.4, 1.7, 1.5, castGrey, [0, 7.25, 1.55]);
  // Carcasa de poleas trapezoidales con selector de marchas
  G.box(1.65, 0.68, 2.8, castGrey, [0, 8.25, 1.15]);
  along(G, 1.62, 1.4, 0.65, castGrey, [0, 8.25, 2.45], 10);
  G.cyl(0.3, 0.12, bare, [0, 8.62, 2.25], undefined, 8);
  G.box(0.07, 0.38, 0.1, bare, [0.72, 8.42, 1.8], [0, 0, -0.4]);
  G.sph(0.18, dark, [0.88, 8.58, 1.8]);
  // Motor eléctrico trasero aleteado
  G.cyl(1.3, 1.35, dark, [0, 7.9, 0.05], undefined, 12);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    G.box(0.04, 1.3, 0.11, dark, [Math.cos(a) * 0.66, 7.9, 0.05 + Math.sin(a) * 0.66], [0, -a, 0]);
  }
  G.cyl(1.22, 0.22, castGrey, [0, 8.65, 0.05], undefined, 10);
  G.cyl(1.4, 0.16, bare, [0, 7.15, 0.05], undefined, 10);
  G.box(0.32, 0.42, 0.42, dark, [-0.74, 7.9, 0.05]);
  G.tube([[-0.74, 7.68, 0.05], [-0.82, 6.9, 0.35]], 0.038, bare);

  // Consola de mandos eléctricos con pulsadores industriales Start/Stop
  G.box(0.48, 0.78, 0.32, dark, [-0.88, 7.15, 1.6]);
  G.box(0.45, 0.74, 0.04, bare, [-0.88, 7.15, 1.78]);
  G.cyl(0.18, 0.07, btnGreen, [-0.88, 7.32, 1.81], [Math.PI / 2, 0, 0], 8);
  G.cyl(0.28, 0.12, btnRed, [-0.88, 6.98, 1.84], [Math.PI / 2, 0, 0], 10);
  G.box(0.05, 0.2, 0.06, bare, [-0.88, 7.48, 1.82], [0.35, 0, 0]);

  // Pínola cromada, nonio micrométrico de profundidad y palancas de avance del husillo
  G.cyl(1.0, 0.7, castGrey, [0, 6.55, 1.1], undefined, 12);
  G.cyl(0.74, 1.05, bare, [0, 5.85, 1.1], undefined, 12);
  G.cyl(0.09, 1.15, bare, [0, 6.1, 1.5], undefined, 6);
  G.cyl(0.22, 0.08, dark, [0, 5.9, 1.5], undefined, 8);
  G.cyl(0.22, 0.08, dark, [0, 5.76, 1.5], undefined, 8);
  G.box(0.25, 0.14, 0.22, bare, [0, 6.22, 1.44]);
  G.box(0.18, 0.95, 0.02, bare, [0, 6.1, 1.43]);
  for (let dy = 5.7; dy <= 6.5; dy += 0.12) {
    G.box(0.12, 0.02, 0.01, dark, [0, dy, 1.45]);
  }
  G.cyl(0.42, 0.12, bare, [0.72, 6.65, 1.4], [0, 0, Math.PI / 2], 10);
  G.cyl(0.32, 0.08, dark, [0.8, 6.65, 1.4], [0, 0, Math.PI / 2], 8);
  G.cyl(0.34, 0.16, bare, [0.74, 6.45, 1.1], [0, 0, Math.PI / 2], 8);
  G.tube([[0.84, 6.45, 1.1], [0.92, 5.9, 1.4], [0.98, 5.4, 1.62]], 0.04, bare);
  G.sph(0.2, rubber, [0.98, 5.4, 1.62]);

  // Husillo vertical con fresa cilíndrica de planear de insertos de carburo
  G.cyl(0.64, 0.22, dark, [0, 5.28, 1.1], undefined, 12);
  G.box(0.1, 0.08, 0.68, bare, [0, 5.2, 1.1]);
  G.cyl(0.52, 0.25, bare, [0, 5.08, 1.1], undefined, 10);
  G.cyl(0.98, 0.28, bare, [0, 4.86, 1.1], undefined, 12);
  G.cyl(0.34, 0.07, dark, [0, 4.71, 1.1], undefined, 8);
  G.bolts([0, 4.69, 1.1], [0, 4.69, 1.1], 1, [0, -1, 0]);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const cx = Math.cos(ang) * 0.44, cz = 1.1 + Math.sin(ang) * 0.44;
    G.box(0.12, 0.15, 0.12, dark, [cx, 4.8, cz], [0, -ang, 0.12]);
    G.box(0.09, 0.09, 0.04, carbide, [Math.cos(ang) * 0.47, 4.76, 1.1 + Math.sin(ang) * 0.47], [0, -ang, 0.12]);
    G.cyl(0.05, 0.04, bare, [Math.cos(ang) * 0.47, 4.76, 1.1 + Math.sin(ang) * 0.47], [0, -ang, Math.PI / 2], 6);
  }

  const parts = done(18);
  const m = parts.length > 1 ? B.Mesh.MergeMeshes(parts, true, true, undefined, false, true)! : parts[0];
  m.name = "millingMachineFold";
  return m;
}

/** Compresor de aire con calderín horizontal de taller Folded: calderín cilíndrico horizontal en chapa de presión roja industrial
 *  con cabezas convexas semiesféricas/achatadas, patas de apoyo delanteras en V con silentblocks de goma negra,
 *  eje transversal trasero con 2 ruedas de goma maciza sobre llantas de chapa estampada roja,
 *  asa tubular curva frontal de arrastre en acero curvado, bancada superior soldada sustentando motor eléctrico monofásico
 *  aleteado con carcasa de condensador superior, cabezal compresor de 2 cilindros en V con aletas radiales de fundición,
 *  cárter de aceite con ojo de buey de nivel y filtros de aspiración cilíndricos, volante de fundición con aspas de ventilación,
 *  cubrepoleas en rejilla de alambre troquelada, tubo de descarga de cobre con aletas de refrigeración y válvula de retención,
 *  y bloque de control con presostato, interruptor basculante rojo, 2 manómetros en latón/blanco, regulador de presión moleteado,
 *  enchufe rápido hembra de latón, válvula de seguridad con anilla de tiro y grifo de purga de condensados inferior. */
export function airCompressorFold(): B.Mesh {
  const { G, done } = kit();
  const redTank = FOLD.painted("#b91c1c", 0.85, 320);
  const motorDark = FOLD.painted("#1e293b", 0.8, 318);
  const brass = FOLD.painted("#d97706", 0.65, 282);
  const copper = FOLD.painted("#ea580c", 0.65, 323);
  const redValve = FOLD.painted("#dc2626", 0.7, 324);
  const bare = FOLD.bare(), dark = FOLD.dark(), rubber = FOLD.rubber();

  // 1. Calderín cilíndrico horizontal de presión con cabezas convexas semiesféricas achatadas
  along(G, 2.2, 2.2, 3.8, redTank, [0, 1.85, 0], 16);
  // Anillos de soldadura circunferenciales (costuras de unión de virolas)
  along(G, 2.24, 2.24, 0.08, dark, [0, 1.85, 0], 16);
  along(G, 2.24, 2.24, 0.08, dark, [0, 1.85, 1.9], 16);
  along(G, 2.24, 2.24, 0.08, dark, [0, 1.85, -1.9], 16);
  // Cabeza trasera convexa achatada (-Z)
  G.cyl(2.14, 0.32, redTank, [0, 1.85, -2.06], [Math.PI / 2, 0, 0], 16, 1.8);
  G.cyl(1.8, 0.24, redTank, [0, 1.85, -2.28], [Math.PI / 2, 0, 0], 14, 1.3);
  G.cyl(1.3, 0.16, redTank, [0, 1.85, -2.44], [Math.PI / 2, 0, 0], 12, 0.7);
  G.cyl(0.7, 0.08, dark, [0, 1.85, -2.52], [Math.PI / 2, 0, 0], 8);
  // Cabeza delantera convexa achatada (+Z)
  G.cyl(2.14, 0.32, redTank, [0, 1.85, 2.06], [Math.PI / 2, 0, 0], 16, 1.8);
  G.cyl(1.8, 0.24, redTank, [0, 1.85, 2.28], [Math.PI / 2, 0, 0], 14, 1.3);
  G.cyl(1.3, 0.16, redTank, [0, 1.85, 2.44], [Math.PI / 2, 0, 0], 12, 0.7);
  G.cyl(0.7, 0.08, dark, [0, 1.85, 2.52], [Math.PI / 2, 0, 0], 8);
  // Placa de características técnicas y timbrado de presión
  G.plate([1.11, 1.85, 0.2], [0, Math.PI / 2, 0], 0.75, 0.45, FOLD.painted("#e2e8f0", 0.5, 322));
  G.box(0.02, 0.06, 0.55, dark, [1.12, 1.95, 0.2]);
  G.box(0.02, 0.04, 0.45, dark, [1.12, 1.85, 0.2]);
  G.box(0.02, 0.04, 0.5, dark, [1.12, 1.75, 0.2]);
  G.rivets([1.12, 2.02, -0.12], [1.12, 2.02, 0.52], 2, [1, 0, 0]);
  G.rivets([1.12, 1.68, -0.12], [1.12, 1.68, 0.52], 2, [1, 0, 0]);
  // Calcos de advertencia diegéticos
  G.decal([-1.11, 1.85, -0.3], [0, -Math.PI / 2, 0], "warning", 0.55);
  G.trimStrip([0, 1.85, -1.9], [Math.PI / 2, 0, 0], 2.2, 0.1, "hazard", 0.05);

  // 2. Patas delanteras de apoyo en chapa doblada en V con tacos/silentblocks de goma negra
  for (const sx of [-1, 1]) {
    G.box(0.18, 0.35, 0.35, redTank, [sx * 0.55, 0.95, 1.35]);
    G.box(0.14, 0.88, 0.28, redTank, [sx * 0.78, 0.52, 1.35], [0, 0, -sx * 0.32]);
    G.box(0.28, 0.1, 0.32, dark, [sx * 0.96, 0.14, 1.35]);
    G.cyl(0.55, 0.14, rubber, [sx * 0.96, 0.07, 1.35], undefined, 10);
    G.bolts([sx * 0.96, 0.16, 1.35], [sx * 0.96, 0.16, 1.35], 1, [0, 1, 0]);
  }

  // 3. Eje transversal trasero con 2 ruedas de goma maciza sobre llantas de chapa estampada roja
  for (const sx of [-1, 1]) {
    G.box(0.16, 0.75, 0.32, redTank, [sx * 0.65, 0.78, -1.35]);
    G.cyl(0.42, 0.25, dark, [sx * 0.65, 0.6, -1.35], [0, 0, Math.PI / 2], 8);
  }
  G.cyl(0.16, 2.9, bare, [0, 0.6, -1.35], [0, 0, Math.PI / 2], 8);
  for (const sx of [-1, 1]) {
    G.cyl(1.2, 0.32, rubber, [sx * 1.35, 0.6, -1.35], [0, 0, Math.PI / 2], 16);
    G.cyl(1.22, 0.06, dark, [sx * 1.35, 0.6, -1.35], [0, 0, Math.PI / 2], 16);
    G.cyl(0.82, 0.34, redTank, [sx * 1.35, 0.6, -1.35], [0, 0, Math.PI / 2], 12);
    G.cyl(0.86, 0.05, bare, [sx * (1.35 + 0.16), 0.6, -1.35], [0, 0, Math.PI / 2], 12);
    G.cyl(0.56, 0.36, dark, [sx * 1.35, 0.6, -1.35], [0, 0, Math.PI / 2], 10);
    G.cyl(0.26, 0.44, bare, [sx * 1.35, 0.6, -1.35], [0, 0, Math.PI / 2], 6);
    G.bolts([sx * (1.35 + 0.22), 0.6, -1.35], [sx * (1.35 + 0.22), 0.6, -1.35], 1, [sx, 0, 0]);
  }

  // 4. Asa tubular frontal de arrastre y transporte en acero curvado con empuñadura de goma
  G.tube([[-0.45, 1.85, 2.15], [-0.45, 2.25, 2.7], [-0.45, 2.9, 3.0], [0.45, 2.9, 3.0], [0.45, 2.25, 2.7], [0.45, 1.85, 2.15]], 0.065, bare);
  G.cyl(0.18, 0.62, rubber, [0, 2.9, 3.0], [0, 0, Math.PI / 2], 8);
  for (const sx of [-1, 1]) {
    G.box(0.16, 0.16, 0.1, dark, [sx * 0.45, 1.85, 2.15]);
    G.bolts([sx * 0.45, 1.85, 2.15], [sx * 0.45, 1.85, 2.15], 1, [0, 0, 1]);
  }

  // 5. Grifo de purga de condensados en la panza inferior del tanque
  G.cyl(0.18, 0.25, brass, [0, 0.65, 0.2], undefined, 6);
  G.box(0.08, 0.18, 0.45, bare, [0, 0.52, 0.2]);
  G.cyl(0.08, 0.12, dark, [0, 0.46, 0.2], undefined, 6);

  // 6. Bancada superior soldada sobre el calderín sustentando el grupo motor-compresor
  for (const sz of [-1.0, 0.6]) {
    G.box(1.7, 0.24, 0.16, redTank, [0, 3.02, sz]);
    G.bend([-0.85, 3.14, sz], [0.85, 3.14, sz], 0.04, redTank);
  }
  G.box(1.75, 0.1, 2.5, dark, [0, 3.16, -0.2]);
  G.box(1.68, 0.04, 2.42, bare, [0, 3.22, -0.2]);
  G.box(0.12, 0.05, 1.2, dark, [-0.42, 3.23, -0.2]);
  G.box(0.12, 0.05, 1.2, dark, [0.48, 3.23, -0.2]);

  // 7. Motor eléctrico monofásico cilíndrico aleteado con carcasa de condensador superior
  along(G, 1.1, 1.1, 1.35, motorDark, [0.48, 3.82, -0.15], 12);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    G.box(0.04, 1.16, 1.28, dark, [0.48 + Math.cos(a) * 0.55, 3.82 + Math.sin(a) * 0.55, -0.15], [0, 0, a]);
  }
  along(G, 1.18, 1.18, 0.12, dark, [0.48, 3.82, 0.55], 12);
  along(G, 1.18, 1.18, 0.14, dark, [0.48, 3.82, -0.85], 12);
  along(G, 1.12, 1.05, 0.35, dark, [0.48, 3.82, -1.05], 12);
  G.grate([0.48, 3.82, -1.23], undefined, 0.72, 0.72, 3, bare);
  G.box(1.15, 0.12, 1.1, dark, [0.48, 3.25, -0.15]);
  G.bolts([0.15, 3.26, -0.55], [0.82, 3.26, -0.55], 2, [0, 1, 0]);
  G.bolts([0.15, 3.26, 0.25], [0.82, 3.26, 0.25], 2, [0, 1, 0]);
  // Carcasa de condensador superior cilíndrica
  along(G, 0.36, 0.36, 0.82, motorDark, [0.48, 4.45, -0.15], 8);
  G.box(0.32, 0.18, 0.78, dark, [0.48, 4.36, -0.15]);
  along(G, 0.38, 0.38, 0.08, dark, [0.48, 4.45, 0.28], 8);
  along(G, 0.38, 0.38, 0.08, dark, [0.48, 4.45, -0.58], 8);
  // Caja de bornes eléctricos y cableado
  G.box(0.22, 0.32, 0.4, dark, [1.05, 3.82, -0.15]);
  G.cyl(0.08, 0.12, bare, [1.16, 3.82, -0.15], [0, 0, Math.PI / 2], 6);
  G.tube([[1.15, 3.82, -0.15], [1.15, 3.45, 0.2], [0.85, 3.3, 0.55]], 0.035, dark);

  // 8. Cabezal compresor de 2 cilindros en V con aletas radiales de fundición y cárter de aceite
  G.box(1.12, 0.82, 1.05, dark, [-0.42, 3.65, -0.15]);
  G.box(1.3, 0.12, 1.15, dark, [-0.42, 3.25, -0.15]);
  G.bolts([-0.95, 3.26, -0.55], [0.12, 3.26, -0.55], 2, [0, 1, 0]);
  G.bolts([-0.95, 3.26, 0.25], [0.12, 3.26, 0.25], 2, [0, 1, 0]);
  along(G, 0.85, 0.85, 0.12, dark, [-0.42, 3.65, 0.4], 10);
  G.bolts([-0.65, 3.65, 0.46], [-0.18, 3.65, 0.46], 2, [0, 0, 1]);
  // Ojo de buey de nivel de aceite
  along(G, 0.22, 0.22, 0.08, brass, [-0.42, 3.42, 0.45], 8);
  along(G, 0.16, 0.16, 0.09, FOLD.screen("#f8fafc"), [-0.42, 3.42, 0.45], 8);
  along(G, 0.06, 0.06, 0.1, FOLD.emissive("#ef4444"), [-0.42, 3.42, 0.45], 6);
  // Tapón de llenado y respiradero superior
  G.cyl(0.14, 0.24, bare, [-0.42, 4.12, 0.15], undefined, 6);
  G.cyl(0.2, 0.08, dark, [-0.42, 4.24, 0.15], undefined, 6);

  // 2 Cilindros en V a 30° con aletas radiales de refrigeración y filtros de aire
  const headCoords: [number, number][] = [];
  for (const side of [-1, 1]) {
    const ang = side * 0.52;
    const dx = Math.sin(ang), dy = Math.cos(ang);
    const x0 = -0.42 + side * 0.22, y0 = 4.05;
    const px = x0 + dx * 0.42, py = y0 + dy * 0.42;
    G.cyl(0.68, 0.75, dark, [px, py, -0.15], [0, 0, -ang], 10);
    for (let f = 0; f < 5; f++) {
      const fx = x0 + dx * (0.15 + f * 0.12), fy = y0 + dy * (0.15 + f * 0.12);
      G.cyl(0.88, 0.035, dark, [fx, fy, -0.15], [0, 0, -ang], 12);
    }
    const hx = x0 + dx * 0.88, hy = y0 + dy * 0.88;
    headCoords.push([hx, hy]);
    G.box(0.78, 0.32, 0.78, dark, [hx, hy, -0.15], [0, 0, -ang]);
    G.box(0.84, 0.05, 0.84, bare, [hx + dx * 0.18, hy + dy * 0.18, -0.15], [0, 0, -ang]);
    for (const b of [-0.26, 0.26]) {
      G.bolts([hx + dx * 0.2 + b * dy, hy + dy * 0.2 - b * dx, -0.15 - 0.26], [hx + dx * 0.2 + b * dy, hy + dy * 0.2 - b * dx, -0.15 + 0.26], 2, [dx, dy, 0]);
    }
    // Filtro de aire de aspiración cilíndrico
    const ix = hx + dx * 0.1, iy = hy + dy * 0.1;
    G.cyl(0.14, 0.22, bare, [ix, iy, 0.24], [Math.PI / 2, 0, 0], 6);
    G.cyl(0.48, 0.32, dark, [ix, iy, 0.42], [Math.PI / 2, 0, 0], 12);
    for (let s = 0; s < 6; s++) {
      const sa = (s / 6) * Math.PI * 2;
      G.box(0.03, 0.24, 0.03, bare, [ix + Math.cos(sa) * 0.24, iy + Math.sin(sa) * 0.24, 0.42]);
    }
    G.cyl(0.52, 0.04, dark, [ix, iy, 0.58], [Math.PI / 2, 0, 0], 12);
    G.cyl(0.12, 0.08, bare, [ix, iy, 0.62], [Math.PI / 2, 0, 0], 6);
    G.box(0.25, 0.06, 0.03, bare, [ix, iy, 0.64]);
  }

  // 9. Tubo de descarga de cobre con aletas de refrigeración y válvula de retención
  const [[h1x, h1y], [h2x, h2y]] = headCoords;
  G.tube([[h1x, h1y, -0.25], [-0.42, 4.35, -0.35], [h2x, h2y, -0.25]], 0.055, copper);
  G.tube([[-0.42, 4.35, -0.35], [-0.42, 3.8, -0.42], [-0.42, 3.3, 0.0], [-0.42, 3.05, 0.45]], 0.055, copper);
  for (let k = 0; k < 8; k++) {
    G.cyl(0.24, 0.02, copper, [-0.42, 4.15 - k * 0.12, -0.36 - k * 0.01], undefined, 8);
  }
  // Válvula de retención del calderín
  G.cyl(0.26, 0.28, brass, [-0.42, 2.98, 0.45], undefined, 6);
  G.box(0.24, 0.18, 0.24, bare, [-0.42, 3.02, 0.45]);
  G.bolts([-0.42, 3.15, 0.45], [-0.42, 3.15, 0.45], 1, [0, 1, 0]);
  G.tube([[-0.32, 3.02, 0.45], [-0.15, 3.02, 0.65], [0.1, 3.3, 0.85]], 0.02, copper);

  // 10. Volante de fundición con aspas de ventilación, polea motriz, correas y cubrepoleas en rejilla
  along(G, 1.55, 1.55, 0.12, dark, [-0.42, 3.65, -0.9], 16);
  along(G, 1.58, 1.58, 0.04, bare, [-0.42, 3.65, -0.9], 16);
  along(G, 0.42, 0.42, 0.18, dark, [-0.42, 3.65, -0.9], 10);
  along(G, 0.22, 0.22, 0.24, bare, [-0.42, 3.65, -0.9], 6);
  G.bolts([-0.42, 3.65, -0.98], [-0.42, 3.65, -0.98], 1, [0, 0, -1]);
  for (let k = 0; k < 5; k++) {
    const ba = (k / 5) * Math.PI * 2;
    const bx = -0.42 + Math.cos(ba) * 0.46, by = 3.65 + Math.sin(ba) * 0.46;
    G.box(0.08, 0.55, 0.05, dark, [bx, by, -0.9], [0, 0.35, ba]);
  }
  // Polea del motor
  along(G, 0.52, 0.52, 0.14, bare, [0.48, 3.82, -0.9], 12);
  along(G, 0.46, 0.46, 0.16, dark, [0.48, 3.82, -0.9], 10);
  G.bolts([0.48, 3.82, -0.98], [0.48, 3.82, -0.98], 1, [0, 0, -1]);
  // Correas de transmisión trapezoidales
  G.tube([[0.48, 4.05, -0.9], [-0.42, 4.4, -0.9]], 0.04, rubber);
  G.tube([[0.48, 3.58, -0.9], [-0.42, 2.9, -0.9]], 0.04, rubber);
  // Cubrepoleas de protección envolvente con rejilla troquelada
  G.box(2.1, 1.85, 0.22, dark, [0.03, 3.65, -1.02]);
  G.box(2.14, 0.06, 0.24, bare, [0.03, 4.58, -1.02]);
  G.box(2.14, 0.06, 0.24, bare, [0.03, 2.72, -1.02]);
  G.box(0.06, 1.85, 0.24, bare, [-1.02, 3.65, -1.02]);
  G.box(0.06, 1.85, 0.24, bare, [1.08, 3.65, -1.02]);
  G.grate([0.03, 3.65, -1.14], undefined, 1.95, 1.7, 6, bare);
  G.box(0.08, 0.35, 0.25, redTank, [-0.42, 3.12, -0.85]);
  G.box(0.08, 0.35, 0.25, redTank, [0.48, 3.12, -0.85]);
  G.bolts([-0.42, 3.15, -0.92], [-0.42, 3.15, -0.92], 1, [0, 0, -1]);
  G.bolts([0.48, 3.15, -0.92], [0.48, 3.15, -0.92], 1, [0, 0, -1]);

  // 11. Bloque de control y salida neumática: presostato, manómetros, regulador y acoples rápidos
  G.box(0.35, 0.35, 0.35, brass, [0.15, 3.3, 1.15]);
  G.cyl(0.18, 0.35, brass, [0.15, 3.05, 1.15], undefined, 6);
  // Presostato prismático negro e interruptor basculante rojo
  G.box(0.55, 0.72, 0.45, dark, [0.15, 3.75, 1.15]);
  G.bend([-0.12, 4.11, 1.15], [0.42, 4.11, 1.15], 0.03, dark);
  G.box(0.18, 0.24, 0.12, dark, [0.15, 4.18, 1.15]);
  G.box(0.14, 0.18, 0.14, FOLD.emissive("#ef4444"), [0.15, 4.25, 1.15], [0.25, 0, 0]);
  G.cyl(0.1, 0.12, bare, [0.15, 3.75, 0.9], [Math.PI / 2, 0, 0], 6);
  G.tube([[0.15, 3.75, 0.85], [0.35, 3.5, 0.6], [0.65, 3.5, 0.2]], 0.03, dark);

  // Dos manómetros cilíndricos en latón/blanco con aguja indicadora
  // Manómetro 1: Presión interna de calderín
  along(G, 0.44, 0.44, 0.16, brass, [-0.22, 3.65, 1.42], 12);
  along(G, 0.38, 0.38, 0.05, FOLD.screen("#f8fafc"), [-0.22, 3.65, 1.49], 12);
  along(G, 0.46, 0.46, 0.04, dark, [-0.22, 3.65, 1.51], 12);
  G.box(0.02, 0.16, 0.02, FOLD.emissive("#dc2626"), [-0.22 + 0.04, 3.65 + 0.04, 1.5], [0, 0, -0.65]);
  for (let g = 0; g < 5; g++) {
    const ga = -1.2 + g * 0.6;
    G.box(0.015, 0.05, 0.01, dark, [-0.22 + Math.cos(ga) * 0.14, 3.65 + Math.sin(ga) * 0.14, 1.5]);
  }
  G.cyl(0.09, 0.25, brass, [-0.22, 3.42, 1.3], undefined, 6);

  // Manómetro 2: Presión regulada de salida
  along(G, 0.44, 0.44, 0.16, brass, [0.52, 3.65, 1.42], 12);
  along(G, 0.38, 0.38, 0.05, FOLD.screen("#f8fafc"), [0.52, 3.65, 1.49], 12);
  along(G, 0.46, 0.46, 0.04, dark, [0.52, 3.65, 1.51], 12);
  G.box(0.02, 0.16, 0.02, FOLD.emissive("#dc2626"), [0.52 + 0.02, 3.65 + 0.05, 1.5], [0, 0, -0.35]);
  for (let g = 0; g < 5; g++) {
    const ga = -1.2 + g * 0.6;
    G.box(0.015, 0.05, 0.01, dark, [0.52 + Math.cos(ga) * 0.14, 3.65 + Math.sin(ga) * 0.14, 1.5]);
  }
  G.cyl(0.09, 0.25, brass, [0.52, 3.42, 1.3], undefined, 6);

  // Regulador de presión con perilla moleteada
  G.box(0.38, 0.38, 0.35, brass, [0.15, 3.3, 1.45]);
  G.cyl(0.32, 0.28, dark, [0.15, 3.6, 1.45], undefined, 12);
  for (let k = 0; k < 6; k++) {
    const ka = (k / 6) * Math.PI * 2;
    G.box(0.03, 0.24, 0.03, bare, [0.15 + Math.cos(ka) * 0.16, 3.6, 1.45 + Math.sin(ka) * 0.16]);
  }
  G.cyl(0.18, 0.06, bare, [0.15, 3.76, 1.45], undefined, 8);

  // Enchufe rápido hembra de salida en latón
  along(G, 0.22, 0.22, 0.35, brass, [0.15, 3.3, 1.78], 8);
  along(G, 0.28, 0.28, 0.18, brass, [0.15, 3.3, 1.76], 12);
  along(G, 0.12, 0.12, 0.08, dark, [0.15, 3.3, 1.95], 8);
  along(G, 0.26, 0.26, 0.1, bare, [0.15, 3.3, 1.58], 6);
  // Grifo lateral directo de bola con palanca roja
  G.cyl(0.18, 0.25, brass, [-0.08, 3.3, 1.45], [0, 0, Math.PI / 2], 6);
  G.box(0.05, 0.08, 0.26, redValve, [-0.18, 3.42, 1.45], [0.3, 0, 0]);

  // Válvula de seguridad con anilla de tiro
  G.cyl(0.16, 0.35, brass, [0.15, 3.62, 0.95], undefined, 6);
  G.cyl(0.2, 0.12, bare, [0.15, 3.82, 0.95], undefined, 8);
  along(G, 0.18, 0.18, 0.04, bare, [0.15, 3.96, 0.95], 8);
  along(G, 0.1, 0.1, 0.05, dark, [0.15, 3.96, 0.95], 8);

  const parts = done(18);
  const m = parts.length > 1 ? B.Mesh.MergeMeshes(parts, true, true, undefined, false, true)! : parts[0];
  m.name = "airCompressorFold";
  return m;
}

/** Carrete / enrollador mural de manguera neumática orientable Folded: soporte de anclaje mural en chapa plegada
 *  gruesa en canal con 4 orificios avellanados y bulones de fijación (FOLD.dark()), horquilla o brazo basculante
 *  de giro horizontal en chapa estampada pintada en azul industrial (FOLD.painted("#1e3a5f", 0.85, 310)) que permite
 *  orientar el carrete 180°, tambor cilíndrico rotativo de chapa estampada con dos discos laterales envolventes con
 *  nervaduras de refuerzo y rebordes redondeados, eje central con mecanismo de trinquete automático de bloqueo
 *  audible y resorte espiral interior de rebobinado, manguera neumática de poliuretano amarillo/naranja bobinada en capas
 *  compactas dentro del tambor, boquilla frontal de salida con ventana guía provista de 4 rodillos de teflón de suave
 *  deslizamiento (dos horizontales y dos verticales), y tramo exterior de manguera saliente con tope esférico de goma
 *  negra (FOLD.rubber()) de final de carrera y conector rápido hembra de latón (FOLD.painted("#d97706", 0.65, 282)). */
export function hoseReelFold(): B.Mesh {
  const { G, done } = kit();
  const bluePaint = FOLD.painted("#1e3a5f", 0.85, 310);
  const brass = FOLD.painted("#d97706", 0.65, 282);
  const hoseColor = FOLD.painted("#f59e0b", 0.75, 325);
  const teflon = FOLD.painted("#f8fafc", 0.35, 326);
  const bare = FOLD.bare(), dark = FOLD.dark(), rubber = FOLD.rubber();

  // 1. Soporte de anclaje mural en chapa plegada gruesa en canal con 4 orificios avellanados y bulones de fijación
  G.box(1.1, 3.2, 0.1, dark, [0, 0, -1.1]);
  G.box(0.1, 3.2, 0.45, dark, [-0.5, 0, -0.88]);
  G.box(0.1, 3.2, 0.45, dark, [0.5, 0, -0.88]);
  G.bend([-0.5, -1.6, -1.05], [-0.5, 1.6, -1.05], 0.05, dark);
  G.bend([0.5, -1.6, -1.05], [0.5, 1.6, -1.05], 0.05, dark);
  G.box(1.1, 0.08, 0.45, dark, [0, 1.56, -0.88]);
  G.box(1.1, 0.08, 0.45, dark, [0, -1.56, -0.88]);
  // 4 orificios avellanados con arandelas y bulones de anclaje a la pared
  for (const bx of [-0.32, 0.32]) {
    for (const by of [-1.25, 1.25]) {
      G.cyl(0.26, 0.04, dark, [bx, by, -1.04], [Math.PI / 2, 0, 0], 8, 0.16);
      G.cyl(0.3, 0.02, bare, [bx, by, -1.03], [Math.PI / 2, 0, 0], 8);
      G.bolts([bx, by, -1.02], [bx, by, -1.02], 1, [0, 0, 1]);
    }
  }
  // Cartelas salientes de soporte para el perno pivote vertical
  G.box(0.55, 0.14, 0.55, dark, [0, 1.05, -0.63]);
  G.box(0.55, 0.14, 0.55, dark, [0, -1.05, -0.63]);
  G.cyl(0.38, 0.22, bare, [0, 1.05, -0.55], undefined, 8);
  G.cyl(0.38, 0.22, bare, [0, -1.05, -0.55], undefined, 8);
  // Racor giratorio de alimentación de aire en el soporte mural
  G.cyl(0.22, 0.25, brass, [0, -0.65, -0.85], [Math.PI / 2, 0, 0], 6);
  G.tube([[0, -0.65, -0.75], [0, -0.65, -0.55], [0, -0.4, -0.55]], 0.05, bare);

  // 2. Horquilla o brazo basculante de giro horizontal en chapa estampada pintada en azul industrial (180° de orientación)
  // Perno vertical de acero
  G.cyl(0.2, 2.5, bare, [0, 0, -0.55], undefined, 8);
  G.cyl(0.32, 0.14, dark, [0, 1.22, -0.55], undefined, 6);
  G.cyl(0.32, 0.14, dark, [0, -1.22, -0.55], undefined, 6);
  G.box(0.04, 0.04, 0.36, bare, [0, 1.26, -0.55]);
  // Manguito central basculante
  G.cyl(0.34, 1.85, bluePaint, [0, 0, -0.55], undefined, 10);
  // Brazos horizontales superior e inferior de la horquilla
  G.box(1.72, 0.12, 0.85, bluePaint, [0, 0.85, -0.15]);
  G.box(1.72, 0.12, 0.85, bluePaint, [0, -0.85, -0.15]);
  // Cartelas diagonales de refuerzo
  for (const sx of [-1, 1]) {
    G.box(0.1, 0.45, 0.45, bluePaint, [sx * 0.76, 0.65, -0.15], [0.65, 0, 0]);
    G.box(0.1, 0.45, 0.45, bluePaint, [sx * 0.76, -0.65, -0.15], [-0.65, 0, 0]);
    // Montantes verticales laterales de la horquilla
    G.box(0.12, 1.7, 0.48, bluePaint, [sx * 0.8, 0, 0.05]);
    G.bend([sx * 0.86, -0.85, 0.05], [sx * 0.86, 0.85, 0.05], 0.06, bluePaint);
    // Chumaceras porta-cojinetes del eje central
    G.cyl(0.58, 0.22, bare, [sx * 0.86, 0, 0.05], [0, 0, Math.PI / 2], 8);
    G.bolts([sx * 0.98, 0.22, 0.05], [sx * 0.98, -0.22, 0.05], 2, [sx, 0, 0]);
  }
  // Placa de características técnicas sobre el brazo superior
  G.plate([0, 0.92, -0.15], [-Math.PI / 2, 0, 0], 0.75, 0.35, FOLD.painted("#e2e8f0", 0.5, 322));
  G.box(0.55, 0.02, 0.04, dark, [0, 0.93, -0.2]);
  G.box(0.45, 0.02, 0.04, dark, [0, 0.93, -0.1]);
  G.rivets([-0.32, 0.93, -0.15], [0.32, 0.93, -0.15], 2, [0, 1, 0]);

  // 3. Tambor cilíndrico rotativo de chapa estampada con dos discos laterales envolventes, nervaduras y rebordes
  G.cyl(1.35, 1.12, bluePaint, [0, 0, 0.05], [0, 0, Math.PI / 2], 14);
  G.cyl(1.4, 0.08, dark, [-0.5, 0, 0.05], [0, 0, Math.PI / 2], 12);
  G.cyl(1.4, 0.08, dark, [0.5, 0, 0.05], [0, 0, Math.PI / 2], 12);
  G.box(0.32, 0.08, 0.22, bare, [0, 0.72, 0.05]);
  G.bolts([0, 0.76, 0.05], [0, 0.76, 0.05], 1, [0, 1, 0]);
  // Discos laterales envolventes con nervaduras de refuerzo y rebordes redondeados
  for (const side of [-1, 1]) {
    G.cyl(2.9, 0.06, bluePaint, [side * 0.56, 0, 0.05], [0, 0, Math.PI / 2], 24);
    // Reborde perimetral exterior doblado
    G.cyl(2.95, 0.08, bare, [side * 0.58, 0, 0.05], [0, 0, Math.PI / 2], 24, 2.95);
    G.cyl(2.88, 0.04, bluePaint, [side * 0.60, 0, 0.05], [0, 0, Math.PI / 2], 20);
    // 6 nervaduras radiales de refuerzo estampadas
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * Math.PI * 2;
      const rRib = 0.98;
      const dy = Math.cos(ang) * rRib, dz = Math.sin(ang) * rRib;
      G.box(0.04, 0.75, 0.12, bluePaint, [side * 0.61, dy, 0.05 + dz], [ang, 0, 0]);
      // Orificios troquelados de alivio entre nervaduras
      const hAng = ang + Math.PI / 6;
      const rHole = 1.05;
      const hy = Math.cos(hAng) * rHole, hz = Math.sin(hAng) * rHole;
      G.cyl(0.36, 0.08, dark, [side * 0.56, hy, 0.05 + hz], [0, 0, Math.PI / 2], 10);
      G.cyl(0.40, 0.02, bare, [side * 0.60, hy, 0.05 + hz], [0, 0, Math.PI / 2], 10);
    }
  }
  G.decal([-0.57, 0.85, 0.05], [0, -Math.PI / 2, 0], "warning", 0.45);

  // 4. Eje central con mecanismo de trinquete automático de bloqueo audible y resorte espiral interior de rebobinado
  G.cyl(0.26, 1.88, bare, [0, 0, 0.05], [0, 0, Math.PI / 2], 10);
  // Trinquete automático de bloqueo audible (ratchet derecho)
  G.cyl(0.85, 0.14, bare, [0.68, 0, 0.05], [0, 0, Math.PI / 2], 16);
  for (let t = 0; t < 8; t++) {
    const ta = (t / 8) * Math.PI * 2;
    G.box(0.12, 0.16, 0.1, dark, [0.68, Math.cos(ta) * 0.44, 0.05 + Math.sin(ta) * 0.44], [ta + 0.35, 0, 0]);
  }
  // Gatillo basculante con uña de enganche y muelle
  G.cyl(0.1, 0.18, bare, [0.73, 0.45, 0.28], [0, 0, Math.PI / 2], 6);
  G.box(0.08, 0.28, 0.12, dark, [0.73, 0.36, 0.22], [-0.55, 0, 0]);
  G.box(0.08, 0.09, 0.08, bare, [0.73, 0.26, 0.16]);
  G.tube([[0.73, 0.52, 0.35], [0.73, 0.46, 0.42], [0.73, 0.38, 0.44]], 0.02, bare);
  G.cyl(1.12, 0.18, dark, [0.74, 0, 0.05], [0, 0, Math.PI / 2], 14);

  // Tambor del resorte espiral interior de rebobinado (izquierdo)
  G.cyl(1.18, 0.22, dark, [-0.7, 0, 0.05], [0, 0, Math.PI / 2], 14);
  G.cyl(1.22, 0.05, bare, [-0.8, 0, 0.05], [0, 0, Math.PI / 2], 14);
  for (let k = 0; k < 4; k++) {
    const sa = (k / 4) * Math.PI * 2;
    G.bolts([-0.81, Math.cos(sa) * 0.46, 0.05 + Math.sin(sa) * 0.46], [-0.81, Math.cos(sa) * 0.46, 0.05 + Math.sin(sa) * 0.46], 1, [-1, 0, 0]);
  }
  G.box(0.06, 0.4, 0.15, dark, [-0.81, 0, 0.32]);
  G.box(0.02, 0.36, 0.08, bare, [-0.79, 0, 0.32]);

  // 5. Manguera neumática de poliuretano amarillo bobinada en capas compactas dentro del tambor
  // Capa 1 (interior)
  for (let xi = -0.42; xi <= 0.42; xi += 0.14) {
    G.cyl(1.56, 0.12, hoseColor, [xi, 0, 0.05], [0, 0, Math.PI / 2], 18, 1.56);
  }
  // Capa 2 (intermedia)
  for (let xi = -0.38; xi <= 0.38; xi += 0.15) {
    G.cyl(1.88, 0.12, hoseColor, [xi, 0, 0.05], [0, 0, Math.PI / 2], 20, 1.88);
  }
  // Capa 3 (exterior visible)
  for (let xi = -0.42; xi <= 0.42; xi += 0.14) {
    G.cyl(2.2, 0.12, hoseColor, [xi, 0, 0.05], [0, 0, Math.PI / 2], 22, 2.2);
  }
  for (let xi = -0.35; xi <= 0.35; xi += 0.14) {
    G.cyl(2.18, 0.02, dark, [xi, 0, 0.05], [0, 0, Math.PI / 2], 20);
  }
  G.tube([[0, -1.05, 0.25], [0, -1.08, 0.65], [0, -1.04, 1.05]], 0.075, hoseColor);

  // 6. Boquilla frontal de salida con ventana guía provista de 4 rodillos de teflón de suave deslizamiento
  // Brazos de soporte de la ventana guía
  G.box(0.08, 0.22, 0.95, bluePaint, [-0.42, -0.92, 0.85], [0.35, 0, 0]);
  G.box(0.08, 0.22, 0.95, bluePaint, [0.42, -0.92, 0.85], [0.35, 0, 0]);
  G.box(0.92, 0.1, 0.12, bluePaint, [0, -1.15, 1.25]);
  G.bolts([-0.42, -0.9, 0.55], [0.42, -0.9, 0.55], 2, [0, 1, 0]);
  // Marco rectangular de la ventana guía
  G.box(0.72, 0.06, 0.18, bare, [0, -0.84, 1.35]);
  G.box(0.72, 0.06, 0.18, bare, [0, -1.26, 1.35]);
  G.box(0.06, 0.48, 0.18, bare, [-0.34, -1.05, 1.35]);
  G.box(0.06, 0.48, 0.18, bare, [0.34, -1.05, 1.35]);
  G.bolts([-0.34, -0.84, 1.45], [0.34, -0.84, 1.45], 2, [0, 0, 1]);
  G.bolts([-0.34, -1.26, 1.45], [0.34, -1.26, 1.45], 2, [0, 0, 1]);
  // 4 rodillos de teflón: 2 horizontales y 2 verticales
  // Horizontal superior
  G.cyl(0.04, 0.65, bare, [0, -0.91, 1.35], [0, 0, Math.PI / 2], 6);
  G.cyl(0.12, 0.48, teflon, [0, -0.91, 1.35], [0, 0, Math.PI / 2], 12);
  G.cyl(0.16, 0.03, dark, [-0.24, -0.91, 1.35], [0, 0, Math.PI / 2], 8);
  G.cyl(0.16, 0.03, dark, [0.24, -0.91, 1.35], [0, 0, Math.PI / 2], 8);
  // Horizontal inferior
  G.cyl(0.04, 0.65, bare, [0, -1.19, 1.35], [0, 0, Math.PI / 2], 6);
  G.cyl(0.12, 0.48, teflon, [0, -1.19, 1.35], [0, 0, Math.PI / 2], 12);
  G.cyl(0.16, 0.03, dark, [-0.24, -1.19, 1.35], [0, 0, Math.PI / 2], 8);
  G.cyl(0.16, 0.03, dark, [0.24, -1.19, 1.35], [0, 0, Math.PI / 2], 8);
  // Vertical izquierdo
  G.cyl(0.04, 0.44, bare, [-0.22, -1.05, 1.35], undefined, 6);
  G.cyl(0.12, 0.26, teflon, [-0.22, -1.05, 1.35], undefined, 12);
  G.cyl(0.16, 0.03, dark, [-0.22, -0.93, 1.35], undefined, 8);
  G.cyl(0.16, 0.03, dark, [-0.22, -1.17, 1.35], undefined, 8);
  // Vertical derecho
  G.cyl(0.04, 0.44, bare, [0.22, -1.05, 1.35], undefined, 6);
  G.cyl(0.12, 0.26, teflon, [0.22, -1.05, 1.35], undefined, 12);
  G.cyl(0.16, 0.03, dark, [0.22, -0.93, 1.35], undefined, 8);
  G.cyl(0.16, 0.03, dark, [0.22, -1.17, 1.35], undefined, 8);

  // 7. Tramo exterior de manguera saliente con tope esférico de goma negra y conector rápido hembra de latón
  G.tube([[0, -1.04, 1.05], [0, -1.05, 1.35], [0, -1.08, 1.75], [0, -1.2, 2.1], [0, -1.5, 2.35]], 0.075, hoseColor);
  // Tope esférico bipartido de goma negra
  G.sph(0.42, rubber, [0, -1.22, 2.15]);
  G.cyl(0.38, 0.12, rubber, [0, -1.18, 2.08], [-0.5, 0, 0], 10, 0.22);
  G.cyl(0.22, 0.12, rubber, [0, -1.26, 2.22], [-0.5, 0, 0], 10, 0.38);
  G.cyl(0.44, 0.08, dark, [0, -1.22, 2.15], [-0.5, 0, 0], 12);
  G.bolts([-0.2, -1.22, 2.15], [0.2, -1.22, 2.15], 2, [0, 0, 1]);
  // Tramo de manguera final hacia el conector
  G.tube([[0, -1.5, 2.35], [0, -1.8, 2.5], [0, -2.15, 2.55]], 0.075, hoseColor);
  G.cyl(0.22, 0.35, rubber, [0, -2.1, 2.55], undefined, 8);
  for (let k = 0; k < 4; k++) {
    G.cyl(0.24, 0.04, bare, [0, -2.0 - k * 0.08, 2.55], undefined, 8);
  }
  // Conector rápido hembra de latón
  G.cyl(0.26, 0.22, brass, [0, -2.3, 2.55], undefined, 6);
  G.cyl(0.34, 0.35, brass, [0, -2.52, 2.55], undefined, 12);
  for (let m = 0; m < 8; m++) {
    const ma = (m / 8) * Math.PI * 2;
    G.box(0.025, 0.28, 0.025, dark, [Math.cos(ma) * 0.17, -2.52, 2.55 + Math.sin(ma) * 0.17]);
  }
  G.cyl(0.28, 0.1, brass, [0, -2.72, 2.55], undefined, 10);
  G.cyl(0.14, 0.12, dark, [0, -2.76, 2.55], undefined, 8);
  G.cyl(0.18, 0.04, bare, [0, -2.68, 2.55], undefined, 8);

  const parts = done(18);
  const m = parts.length > 1 ? B.Mesh.MergeMeshes(parts, true, true, undefined, false, true)! : parts[0];
  m.name = "hoseReelFold";
  return m;
}

/** Grupo electrógeno portátil a gasolina Folded: jaula protectora perimetral en tubo de acero curvado (FOLD.bare())
 *  con 4 silentblocks de goma negra (FOLD.rubber()) en la base inferior, depósito superior de combustible en chapa
 *  estampada roja de competición (FOLD.painted("#dc2626", 0.8, 312)) con tapón roscado central cromado, indicador
 *  analógico de nivel con mirilla transparente y calco diegético de advertencia, motor térmico monocilíndrico de 4 tiempos
 *  con bloque y culata aleteados en fundición oscura (FOLD.dark()), carburador con filtro de aire cilíndrico, silenciador
 *  de escape con protector anticalórico perforado, tirador de arranque por cuerda (recoil starter) con empuñadura en T,
 *  alternador cilíndrico de generación eléctrica con aletas de refrigeración coaxiales acoplado al bloque motor, y panel
 *  frontal de mandos técnico con interruptor general basculante rojo ON/OFF (FOLD.emissive("#ef4444")), voltímetro analógico
 *  con esfera blanca y bisel negro, disyuntor térmico de rearme y 2 tomas de corriente Schuko con tapas protectoras basculantes. */
export function gasGeneratorFold(): B.Mesh {
  const { G, done } = kit();
  const redFuel = FOLD.painted("#dc2626", 0.8, 312);
  const panelDark = FOLD.painted("#0f172a", 0.85, 316);
  const schukoBlue = FOLD.painted("#1e40af", 0.8, 317);
  const brass = FOLD.painted("#d97706", 0.65, 282);
  const bare = FOLD.bare(), dark = FOLD.dark(), rubber = FOLD.rubber();

  // 1. Jaula protectora perimetral en tubo de acero curvado envolviendo la máquina, con 4 silentblocks de goma en la base
  // 4 silentblocks de goma en la base inferior
  for (const sx of [-1.02, 1.02]) {
    for (const sz of [-1.35, 1.35]) {
      G.cyl(0.44, 0.22, rubber, [sx, 0.11, sz], undefined, 10);
      G.cyl(0.48, 0.04, dark, [sx, 0.02, sz], undefined, 10);
      G.cyl(0.32, 0.04, bare, [sx, 0.24, sz], undefined, 8);
      G.bolts([sx, 0.25, sz], [sx, 0.25, sz], 1, [0, 1, 0]);
      // Pletina soldada de apoyo entre el taco y el tubo del chasis
      G.box(0.36, 0.05, 0.36, dark, [sx, 0.26, sz]);
    }
  }

  // Tubos del bastidor / jaula perimetral (aros tubulares y montantes en acero curvado)
  const TUBE_R = 0.075;
  // Aro lateral izquierdo (plano X = -1.15)
  G.tube([
    [-1.15, 0.32, 1.35], [-1.15, 0.28, 0], [-1.15, 0.32, -1.35],
    [-1.15, 0.55, -1.52], [-1.15, 2.22, -1.52], [-1.15, 2.45, -1.35],
    [-1.15, 2.45, 0], [-1.15, 2.45, 1.35], [-1.15, 2.22, 1.52],
    [-1.15, 0.55, 1.52], [-1.15, 0.32, 1.35],
  ], TUBE_R, bare);

  // Aro lateral derecho (plano X = 1.15)
  G.tube([
    [1.15, 0.32, 1.35], [1.15, 0.28, 0], [1.15, 0.32, -1.35],
    [1.15, 0.55, -1.52], [1.15, 2.22, -1.52], [1.15, 2.45, -1.35],
    [1.15, 2.45, 0], [1.15, 2.45, 1.35], [1.15, 2.22, 1.52],
    [1.15, 0.55, 1.52], [1.15, 0.32, 1.35],
  ], TUBE_R, bare);

  // Travesaños transversales superiores (frontal y trasero)
  G.tube([[-1.15, 2.45, 1.35], [-0.85, 2.45, 1.48], [0.85, 2.45, 1.48], [1.15, 2.45, 1.35]], TUBE_R, bare);
  G.tube([[-1.15, 2.45, -1.35], [-0.85, 2.45, -1.48], [0.85, 2.45, -1.48], [1.15, 2.45, -1.35]], TUBE_R, bare);

  // Travesaños transversales inferiores (frontal y trasero)
  G.tube([[-1.15, 0.28, 1.35], [-0.85, 0.28, 1.48], [0.85, 0.28, 1.48], [1.15, 0.28, 1.35]], TUBE_R, bare);
  G.tube([[-1.15, 0.28, -1.35], [-0.85, 0.28, -1.48], [0.85, 0.28, -1.48], [1.15, 0.28, -1.35]], TUBE_R, bare);

  // Barras laterales intermedias de protección contra impactos
  G.tube([[-1.15, 1.32, -1.48], [-1.15, 1.32, 1.48]], TUBE_R * 0.9, bare);
  G.tube([[1.15, 1.32, -1.48], [1.15, 1.32, 1.48]], TUBE_R * 0.9, bare);

  // Manguitos de goma en los tubos superiores para agarre / transporte manual
  G.cyl(0.22, 0.65, rubber, [-1.15, 2.45, 0], [Math.PI / 2, 0, 0], 8);
  G.cyl(0.22, 0.65, rubber, [1.15, 2.45, 0], [Math.PI / 2, 0, 0], 8);
  G.cyl(0.25, 0.05, dark, [-1.15, 2.45, -0.32], [Math.PI / 2, 0, 0], 8);
  G.cyl(0.25, 0.05, dark, [-1.15, 2.45, 0.32], [Math.PI / 2, 0, 0], 8);
  G.cyl(0.25, 0.05, dark, [1.15, 2.45, -0.32], [Math.PI / 2, 0, 0], 8);
  G.cyl(0.25, 0.05, dark, [1.15, 2.45, 0.32], [Math.PI / 2, 0, 0], 8);

  // Bancada inferior: dos largueros de chapa doblada con silentblocks que soportan el grupo motor-alternador
  for (const lx of [-0.48, 0.48]) {
    G.box(0.16, 0.14, 2.6, dark, [lx, 0.36, 0]);
    G.bend([lx, 0.43, -1.3], [lx, 0.43, 1.3], 0.02, dark);
    // Soldaduras a los tubos inferiores
    G.box(0.22, 0.16, 0.18, bare, [lx, 0.32, 1.35]);
    G.box(0.22, 0.16, 0.18, bare, [lx, 0.32, -1.35]);
  }
  // 4 silentblocks antivibración para el montaje del motor y alternador
  for (const mx of [-0.48, 0.48]) {
    for (const mz of [-0.85, 0.85]) {
      G.cyl(0.34, 0.16, rubber, [mx, 0.49, mz], undefined, 8);
      G.cyl(0.38, 0.04, dark, [mx, 0.42, mz], undefined, 8);
      G.bolts([mx, 0.58, mz], [mx, 0.58, mz], 1, [0, 1, 0]);
    }
  }

  // 2. Depósito superior de combustible en chapa estampada roja de competición con tapón cromado, visor y calcos
  // Cuerpo principal del tanque estampado
  G.box(1.88, 0.38, 1.76, redFuel, [0, 2.18, 0]);
  G.box(1.72, 0.18, 1.62, redFuel, [0, 1.96, 0]);
  // Reborde / pestaña perimetral de chapa estampada engatillada
  G.box(2.02, 0.04, 1.9, redFuel, [0, 2.05, 0]);
  G.box(2.04, 0.02, 1.92, bare, [0, 2.05, 0]);
  // Cantos redondeados doblados en la parte superior del tanque
  G.bend([-0.94, 2.37, -0.88], [0.94, 2.37, -0.88], 0.035, redFuel);
  G.bend([-0.94, 2.37, 0.88], [0.94, 2.37, 0.88], 0.035, redFuel);
  G.bend([-0.94, 2.37, -0.88], [-0.94, 2.37, 0.88], 0.035, redFuel);
  G.bend([0.94, 2.37, -0.88], [0.94, 2.37, 0.88], 0.035, redFuel);

  // Cartelas y soportes de fijación del tanque al bastidor tubular con silentblocks
  for (const tx of [-0.96, 0.96]) {
    for (const tz of [-0.75, 0.75]) {
      G.box(0.2, 0.06, 0.22, dark, [tx, 2.05, tz]);
      G.cyl(0.18, 0.08, rubber, [tx, 2.03, tz], undefined, 8);
      G.bolts([tx, 2.09, tz], [tx, 2.09, tz], 1, [0, 1, 0]);
    }
  }

  // Tapón roscado central cromado con ranuras de giro y respiradero
  G.cyl(0.56, 0.06, dark, [0, 2.38, 0], undefined, 14);
  G.cyl(0.48, 0.15, bare, [0, 2.46, 0], undefined, 14);
  G.cyl(0.52, 0.04, bare, [0, 2.53, 0], undefined, 14);
  G.box(0.58, 0.08, 0.12, bare, [0, 2.55, 0]);
  G.cyl(0.08, 0.05, dark, [0, 2.58, 0], undefined, 6); // válvula respiradero central
  // Cadena de retención del tapón
  G.tube([[0.25, 2.45, 0], [0.38, 2.4, 0.15], [0.42, 2.38, 0.22]], 0.015, bare);

  // Indicador analógico de nivel de gasolina con mirilla transparente
  G.cyl(0.34, 0.07, dark, [0.48, 2.38, 0.45], undefined, 12);
  G.cyl(0.3, 0.05, bare, [0.48, 2.41, 0.45], undefined, 12);
  G.cyl(0.26, 0.02, FOLD.screen("#f8fafc"), [0.48, 2.42, 0.45], undefined, 12); // esfera blanca
  G.cyl(0.27, 0.02, FOLD.screen("#94a3b8"), [0.48, 2.435, 0.45], undefined, 12); // mirilla transparente
  // Aguja analógica de combustible
  G.box(0.02, 0.015, 0.12, FOLD.emissive("#ef4444"), [0.48, 2.43, 0.45], [0, 0.45, 0]);
  // Marcas de cuadrante: verde (lleno) y rojo (reserva)
  G.box(0.035, 0.01, 0.035, FOLD.emissive("#22c55e"), [0.45, 2.425, 0.52]);
  G.box(0.035, 0.01, 0.035, FOLD.emissive("#ef4444"), [0.51, 2.425, 0.38]);

  // Calcos diegéticos en el depósito
  G.decal([-0.42, 2.38, 0.3], [Math.PI / 2, 0, 0], "warning", 0.45);
  G.decal([0, 2.18, 0.89], [0, Math.PI, 0], "voltaje", 0.4);

  // Grifo de paso de gasolina inferior (petcock) con vaso de decantación y manguera
  G.cyl(0.14, 0.22, brass, [-0.68, 1.82, -0.38], undefined, 6);
  G.cyl(0.24, 0.22, FOLD.screen("#cbd5e1"), [-0.68, 1.66, -0.38], undefined, 8); // decantador de vidrio
  G.box(0.06, 0.14, 0.24, redFuel, [-0.68, 1.78, -0.28], [0.35, 0, 0]); // palanca selector
  G.tube([[-0.68, 1.66, -0.38], [-0.58, 1.45, -0.25], [-0.32, 1.3, 0.12]], 0.028, rubber);

  // 3. Motor térmico monocilíndrico de 4 tiempos (bloque, culata aleteada, carburador, escape y recoil starter)
  // Bloque del motor / cárter en fundición oscura
  G.box(1.15, 0.88, 1.12, dark, [0.22, 0.95, -0.15]);
  G.box(1.22, 0.12, 1.18, dark, [0.22, 0.56, -0.15]);
  // Tapón de drenaje de aceite hexagonal
  G.cyl(0.18, 0.12, bare, [0.22, 0.52, -0.72], [Math.PI / 2, 0, 0], 6);
  // Varilla de llenado de aceite con tapón amarillo
  G.cyl(0.16, 0.22, FOLD.painted("#eab308", 0.7, 314), [0.72, 0.72, -0.42], [0.35, 0, 0.35], 6);

  // Cilindro y culata inclinados a 26° (OHV de 4 tiempos) con aletas profundas de fundición
  const CYL_ANG = 0.45;
  const sinA = Math.sin(CYL_ANG), cosA = Math.cos(CYL_ANG);
  const cx0 = 0.35, cy0 = 1.18, cz0 = -0.15;
  G.cyl(0.86, 0.82, dark, [cx0 + sinA * 0.25, cy0 + cosA * 0.25, cz0], [0, 0, -CYL_ANG], 12);
  // Aletas de refrigeración radiales a lo largo del cilindro
  for (let f = 0; f < 7; f++) {
    const dist = 0.06 + f * 0.11;
    G.cyl(1.08, 0.035, dark, [cx0 + sinA * dist, cy0 + cosA * dist, cz0], [0, 0, -CYL_ANG], 12);
  }
  // Culata de fundición con aletas cuadradas
  const hDist = 0.78;
  const hx = cx0 + sinA * hDist, hy = cy0 + cosA * hDist;
  G.box(0.96, 0.52, 0.92, dark, [hx, hy, cz0], [0, 0, -CYL_ANG]);
  for (let hf = -0.18; hf <= 0.18; hf += 0.09) {
    G.box(1.04, 0.025, 0.98, dark, [hx - cosA * hf, hy + sinA * hf, cz0], [0, 0, -CYL_ANG]);
  }
  // Tapa de balancines en chapa estampada con tuerca cromada
  const vDist = 1.05;
  const vx = cx0 + sinA * vDist, vy = cy0 + cosA * vDist;
  G.box(0.82, 0.18, 0.76, bare, [vx, vy, cz0], [0, 0, -CYL_ANG]);
  G.bolts([vx + sinA * 0.1, vy + cosA * 0.1, cz0], [vx + sinA * 0.1, vy + cosA * 0.1, cz0], 1, [sinA, cosA, 0]);
  // Bujía con aislador cerámico y pipa de goma
  G.cyl(0.12, 0.28, FOLD.painted("#f8fafc", 0.4, 315), [hx - 0.12, hy + 0.18, cz0 + 0.32], [0.6, 0, 0], 6);
  G.cyl(0.18, 0.12, bare, [hx - 0.12, hy + 0.1, cz0 + 0.32], [0.6, 0, 0], 6);
  G.cyl(0.2, 0.24, rubber, [hx - 0.12, hy + 0.28, cz0 + 0.32], [0.6, 0, 0], 8);
  G.tube([[hx - 0.12, hy + 0.28, cz0 + 0.32], [hx - 0.2, hy + 0.12, cz0 + 0.48], [0.22, 1.25, 0.35]], 0.03, dark);

  // Carburador con filtro de aire cilíndrico
  G.box(0.38, 0.36, 0.44, bare, [0.22, 1.35, 0.38]);
  G.cyl(0.32, 0.26, bare, [0.22, 1.15, 0.38], undefined, 8); // cuba de flotador
  G.box(0.05, 0.18, 0.08, dark, [0.03, 1.42, 0.38], [0, 0, 0.45]); // palanca del estárter (choke)
  G.tube([[0.22, 1.4, 0.2], [0.32, 1.55, 0.05], [hx, hy, cz0]], 0.065, dark); // colector de admisión
  // Carcasa cilíndrica del filtro de aire
  along(G, 0.72, 0.72, 0.54, dark, [0.22, 1.46, 0.76], 14);
  along(G, 0.76, 0.76, 0.06, dark, [0.22, 1.46, 1.02], 14);
  along(G, 0.76, 0.76, 0.06, dark, [0.22, 1.46, 0.5], 14);
  // Tuerca de mariposa frontal
  along(G, 0.12, 0.12, 0.08, bare, [0.22, 1.46, 1.07], 6);
  G.box(0.32, 0.08, 0.03, bare, [0.22, 1.46, 1.08]);
  for (let s = 0; s < 6; s++) {
    const sa = (s / 6) * Math.PI * 2;
    G.box(0.04, 0.34, 0.04, bare, [0.22 + Math.cos(sa) * 0.36, 1.46 + Math.sin(sa) * 0.36, 0.76]);
  }

  // Silenciador de escape con protector anticalórico perforado
  G.tube([[hx, hy, cz0 - 0.25], [0.68, 1.55, -0.65], [0.68, 1.38, -0.92]], 0.075, dark);
  // Cuerpo del silenciador en chapa negra
  G.box(0.76, 0.96, 0.94, dark, [0.68, 1.36, -1.18]);
  // Tubo curvado de salida de gases con corte biselado
  G.cyl(0.16, 0.35, bare, [0.98, 1.36, -1.42], [Math.PI / 4, 0, 0], 8);
  // Protector anticalórico perforado (heat shield)
  G.box(0.88, 1.06, 1.04, bare, [0.68, 1.36, -1.18]);
  // Matriz de perforaciones troqueladas oscuras en el protector
  for (let px = -0.28; px <= 0.28; px += 0.18) {
    for (let py = -0.32; py <= 0.32; py += 0.16) {
      G.box(0.08, 0.08, 0.02, dark, [0.68 + px, 1.36 + py, -1.71]);
      G.box(0.02, 0.08, 0.08, dark, [1.13, 1.36 + py, -1.18 + px]);
    }
  }
  G.decal([0.68, 1.36, -1.71], [0, 0, 0], "warning", 0.4);
  G.bolts([0.32, 1.82, -1.18], [1.04, 1.82, -1.18], 2, [0, 1, 0]);

  // Tirador de arranque por cuerda (recoil starter) con empuñadura en T
  along(G, 1.18, 1.08, 0.36, redFuel, [0.22, 0.95, 0.58], 16);
  along(G, 1.22, 1.22, 0.06, dark, [0.22, 0.95, 0.42], 16);
  for (let k = 0; k < 8; k++) {
    const ka = (k / 8) * Math.PI * 2;
    G.box(0.04, 0.32, 0.02, dark, [0.22 + Math.cos(ka) * 0.38, 0.95 + Math.sin(ka) * 0.38, 0.76], [0, 0, ka]);
  }
  // Guía de salida de la cuerda y cuerda trenzada
  G.cyl(0.14, 0.16, bare, [-0.18, 1.25, 0.72], [0.6, 0.4, 0], 6);
  G.tube([[-0.18, 1.25, 0.72], [-0.32, 1.42, 0.84]], 0.026, FOLD.screen("#f8fafc"));
  // Empuñadura en T de goma negra (recoil handle)
  G.cyl(0.14, 0.44, rubber, [-0.35, 1.45, 0.88], [0, 0, Math.PI / 4], 8);
  G.cyl(0.18, 0.08, dark, [-0.35, 1.45, 0.88], [0, 0, Math.PI / 4], 8);
  G.sph(0.13, rubber, [-0.5, 1.3, 0.88]);
  G.sph(0.13, rubber, [-0.2, 1.6, 0.88]);

  // 4. Alternador cilíndrico de generación eléctrica con aletas de refrigeración coaxiales
  // Campana de acoplamiento cónica con ventilador centrífugo
  along(G, 1.16, 1.08, 0.44, dark, [-0.44, 0.95, -0.15], 14);
  for (let a = 0; a < 6; a++) {
    const aa = (a / 6) * Math.PI * 2;
    G.box(0.04, 0.35, 0.04, bare, [-0.44, 0.95 + Math.sin(aa) * 0.52, -0.15 + Math.cos(aa) * 0.52]);
  }
  // Estátor / cuerpo cilíndrico principal del alternador
  G.cyl(1.16, 1.15, dark, [-1.02, 0.95, -0.15], [0, 0, Math.PI / 2], 16);
  // Aletas de refrigeración coaxiales / nervios longitudinales exteriores
  for (let i = 0; i < 10; i++) {
    const ra = (i / 10) * Math.PI * 2;
    G.box(1.12, 0.04, 0.12, dark, [-1.02, 0.95 + Math.cos(ra) * 0.58, -0.15 + Math.sin(ra) * 0.58], [ra, 0, 0]);
  }
  // Tapa trasera del alternador con chumacera y rejillas
  G.cyl(1.18, 0.16, dark, [-1.62, 0.95, -0.15], [0, 0, Math.PI / 2], 14);
  G.cyl(0.46, 0.24, bare, [-1.68, 0.95, -0.15], [0, 0, Math.PI / 2], 10);
  G.grate([-1.64, 0.95, -0.15], [0, -Math.PI / 2, 0], 0.75, 0.75, 4, bare);
  // Tirantes roscados pasantes con tuercas hexagonales
  for (const sa of [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4]) {
    const ty = 0.95 + Math.sin(sa) * 0.52, tz = -0.15 + Math.cos(sa) * 0.52;
    G.cyl(0.045, 1.48, bare, [-1.02, ty, tz], [0, 0, Math.PI / 2], 6);
    G.bolts([-1.71, ty, tz], [-1.71, ty, tz], 1, [-1, 0, 0]);
  }
  // Placa técnica del alternador (230V / 50Hz / 3.0kW)
  G.plate([-1.02, 1.55, -0.15], [0, 0, 0], 0.65, 0.35, FOLD.painted("#e2e8f0", 0.5, 322));
  G.box(0.5, 0.02, 0.05, dark, [-1.02, 1.56, -0.22]);
  G.box(0.42, 0.02, 0.04, dark, [-1.02, 1.56, -0.12]);
  G.rivets([-1.28, 1.56, -0.15], [-0.76, 1.56, -0.15], 2, [0, 1, 0]);

  // 5. Panel frontal de mandos técnico (interruptor ON/OFF, voltímetro, disyuntor, 2 tomas Schuko con tapas)
  // Caja prismática envolvente del panel de mandos
  G.box(1.54, 1.02, 0.34, dark, [-0.18, 1.25, 1.28]);
  G.box(1.5, 0.98, 0.05, panelDark, [-0.18, 1.25, 1.45]);
  // Marco protector con rebordes de acero
  for (const bx of [-0.94, 0.58]) G.box(0.05, 1.0, 0.12, bare, [bx, 1.25, 1.42]);
  for (const by of [0.75, 1.75]) G.box(1.54, 0.05, 0.12, bare, [-0.18, by, 1.42]);
  // Tornillos de anclaje del panel frontal
  G.bolts([-0.88, 1.68, 1.48], [0.52, 1.68, 1.48], 2, [0, 0, 1]);
  G.bolts([-0.88, 0.82, 1.48], [0.52, 0.82, 1.48], 2, [0, 0, 1]);
  // Franja hazard de advertencia serigrafiada superior
  G.trimStrip([-0.18, 1.66, 1.48], [0, Math.PI, 0], 1.28, 0.06, "hazard", 0.02);

  // A. Interruptor general basculante rojo ON/OFF
  G.box(0.26, 0.34, 0.08, dark, [-0.68, 1.45, 1.48]);
  G.box(0.24, 0.32, 0.02, bare, [-0.68, 1.45, 1.52]);
  G.box(0.18, 0.24, 0.08, FOLD.emissive("#ef4444"), [-0.68, 1.45, 1.56], [-0.35, 0, 0]);
  G.box(0.08, 0.02, 0.01, bare, [-0.68, 1.53, 1.59]); // indicación 'I'
  G.cyl(0.05, 0.01, bare, [-0.68, 1.37, 1.57], [Math.PI / 2, 0, 0], 8); // indicación 'O'

  // B. Voltímetro analógico con esfera blanca, aguja indicadora y bisel negro
  G.box(0.46, 0.46, 0.08, dark, [-0.25, 1.45, 1.48]);
  G.cyl(0.38, 0.06, dark, [-0.25, 1.45, 1.52], [Math.PI / 2, 0, 0], 14);
  G.cyl(0.34, 0.03, FOLD.screen("#f8fafc"), [-0.25, 1.45, 1.55], [Math.PI / 2, 0, 0], 14);
  G.cyl(0.35, 0.02, FOLD.screen("#94a3b8"), [-0.25, 1.45, 1.57], [Math.PI / 2, 0, 0], 14);
  // Aguja a ~230V
  G.box(0.02, 0.16, 0.015, FOLD.emissive("#dc2626"), [-0.24, 1.49, 1.56], [0, 0, -0.25]);
  for (let g = 0; g < 5; g++) {
    const ga = -1.1 + g * 0.55;
    G.box(0.015, 0.045, 0.01, dark, [-0.25 + Math.cos(ga) * 0.12, 1.45 + Math.sin(ga) * 0.12, 1.56]);
  }
  G.box(0.035, 0.035, 0.01, dark, [-0.25, 1.39, 1.56]); // símbolo V

  // C. Disyuntor térmico de rearme (thermal circuit breaker)
  G.cyl(0.2, 0.08, dark, [-0.68, 1.08, 1.48], [Math.PI / 2, 0, 0], 6);
  G.cyl(0.24, 0.04, bare, [-0.68, 1.08, 1.52], [Math.PI / 2, 0, 0], 6);
  G.cyl(0.13, 0.14, rubber, [-0.68, 1.08, 1.56], [Math.PI / 2, 0, 0], 8);
  G.plate([-0.68, 0.92, 1.48], [0, Math.PI, 0], 0.28, 0.12, FOLD.painted("#e2e8f0", 0.5, 322));
  G.box(0.2, 0.02, 0.01, dark, [-0.68, 0.92, 1.49]);

  // D. 2 tomas de corriente Schuko con tapas protectoras basculantes
  for (const sy of [1.42, 0.98]) {
    G.box(0.44, 0.44, 0.06, dark, [0.24, sy, 1.48]);
    G.cyl(0.36, 0.08, dark, [0.24, sy, 1.51], [Math.PI / 2, 0, 0], 12);
    // Tapa protectora basculante azul industrial con bisagra
    G.box(0.4, 0.4, 0.04, schukoBlue, [0.24, sy + 0.02, 1.57], [-0.18, 0, 0]);
    // Eje de la bisagra y resorte
    G.cyl(0.08, 0.44, bare, [0.24, sy + 0.22, 1.54], [0, 0, Math.PI / 2], 6);
    G.box(0.08, 0.08, 0.06, dark, [0.06, sy + 0.22, 1.52]);
    G.box(0.08, 0.08, 0.06, dark, [0.42, sy + 0.22, 1.52]);
    // Pestaña para abrir la tapa
    G.box(0.18, 0.06, 0.06, schukoBlue, [0.24, sy - 0.18, 1.59]);
    G.cyl(0.16, 0.02, bare, [0.24, sy + 0.02, 1.59], [Math.PI / 2, 0, 0], 8);
    // Tornillos de fijación de la base Schuko
    for (const dx of [-0.15, 0.15]) {
      for (const dy of [-0.15, 0.15]) {
        G.bolts([0.24 + dx, sy + dy, 1.52], [0.24 + dx, sy + dy, 1.52], 1, [0, 0, 1]);
      }
    }
  }

  // E. Borne de puesta a tierra y LEDs indicadores
  G.cyl(0.14, 0.12, brass, [-0.25, 0.96, 1.48], [Math.PI / 2, 0, 0], 6);
  G.cyl(0.22, 0.04, brass, [-0.25, 0.96, 1.53], [Math.PI / 2, 0, 0], 6);
  G.box(0.26, 0.06, 0.02, brass, [-0.25, 0.96, 1.56]);
  G.box(0.08, 0.015, 0.01, bare, [-0.25, 0.86, 1.49]);
  G.box(0.05, 0.015, 0.01, bare, [-0.25, 0.83, 1.49]);
  G.box(0.02, 0.015, 0.01, bare, [-0.25, 0.8, 1.49]);
  // LEDs de estado (verde = OK, rojo = sobrecarga)
  G.cyl(0.08, 0.05, FOLD.emissive("#22c55e"), [-0.46, 1.25, 1.48], [Math.PI / 2, 0, 0], 8);
  G.cyl(0.08, 0.05, FOLD.emissive("#ef4444"), [-0.46, 1.1, 1.48], [Math.PI / 2, 0, 0], 8);

  // Mazo de cables de potencia en manguera de goma desde el alternador al panel
  G.tube([[-0.18, 1.05, 1.15], [-0.48, 0.95, 0.75], [-0.85, 0.95, 0.25]], 0.06, rubber);

  const parts = done(18);
  const m = parts.length > 1 ? B.Mesh.MergeMeshes(parts, true, true, undefined, false, true)! : parts[0];
  m.name = "gasGeneratorFold";
  return m;
}
