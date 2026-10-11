// Vertical slice Folded 2.5D (`?folded2`, ver FOLDED_SLICE): piezas de hormiga, polilla, robot, buggy, cerca y caja armadas con
// geoKit + FOLD. Solo devuelven mallas sueltas: models.ts/world.ts las fusionan en plantillas (template) como siempre, así que
// colisión, IA, instancias y pivots de patas/alas/llave no cambian. Remaches y tornillos se hornean como cilindros (bake) porque
// una plantilla no puede llevar thin instances.
import * as B from "@babylonjs/core";
import { FOLD, foldAtlas, foldTile, geoKit, toTile, type GeoKit } from "./folded";
import { PAL } from "./kit3d";

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
  return { G, parts, done, strut, bone };
}
export const along = (G: GeoKit, d1: number, d2: number, len: number, m: B.Material, p: V3, tess = 6) => G.cyl(d1, len, m, p, [Math.PI / 2, 0, 0], tess, d2); // prisma a lo largo de z (d1 adelante)

// ---------- Hormiga: gáster hexagonal con placa, cintura, tórax con lomo atornillado, cabeza con mandíbulas de acero ----------
// Huesos (VAT de glb.ts): 0 cuerpo, 1..6 patas (cadera i, lado +1/-1), 7 antenas. `vis`: escala que glb.ts le da al nodo (GLB.visual).
const ANT_COLOR = "#6e3520";
const ANT_HIPS: [V3, number][] = [[[0.2, 0.46, 0.3], 0.65], [[0.22, 0.46, 0.14], 0], [[0.2, 0.46, -0.02], -0.65]];
/** Insectos de 6 patas (hormiga, escupidora, escarabajo): mismo esqueleto y caminata; cambian color, tamaño (k) y la pieza de identidad. */
type Bug = { color: string; k: number; eye: string; seed: number; look: "ant" | "spit" | "beetle" };
const BUGS: Record<string, Bug> = {
  hormiga: { color: ANT_COLOR, k: 1, eye: "#ff4a28", seed: 61, look: "ant" },
  escupidora: { color: "#6b8a22", k: 1.3, eye: "#ffc040", seed: 64, look: "spit" },
  escarabajo: { color: "#2f7d4a", k: 1.6, eye: "#e8ff50", seed: 67, look: "beetle" },
};
export function antBody(vis = 1, o: Bug = BUGS.hormiga) {
  const { G, done, strut, bone } = kit();
  const body = FOLD.chitin(o.color), plate = FOLD.painted(PAL.metalOsc, 0.6, 62), eye = FOLD.emissive(o.eye);
  if (o.look === "beetle") { // élitros: dos chapas en techo a dos aguas sobre el abdomen, con costura y cuerno de acero (IDENTITY)
    along(G, 0.62, 0.8, 0.9, plate, [0, 0.4, -0.6]);
    for (const s of [-1, 1]) G.box(0.44, 0.04, 1.1, body, [s * 0.2, 0.74, -0.55], [0, 0, -s * 0.3]);
    G.bend([0, 0.84, -1.1], [0, 0.84, 0.0], 0.04, FOLD.bare());
    G.rivets([-0.2, 0.62, -1.08], [0.2, 0.62, -1.08], 5, [0, 0, -1]);
    strut([0, 0.68, 0.8], [0, 1.02, 1.2], 0.08, 0.1, FOLD.bare()); G.box(0.14, 0.06, 0.1, FOLD.bare(), [0, 1.04, 1.22]);
  } else {
    along(G, 0.5, 0.86, 0.82, body, [0, 0.44, -0.66]); // gáster (BODY)
    along(G, 0.5, 0.3, 0.16, body, [0, 0.44, -1.15]); // tapa trasera plegada
    G.plate([0, 0.83, -0.66], [Math.PI / 2, 0, 0], 0.32, 0.56, plate); // placa del lomo (PANELS)
    G.trimStrip([0, 0.44, -0.27], undefined, 0.46, 0.46, "hazard", 0.05); // faja de peligro (IDENTITY)
  }
  if (o.look === "spit") { // saco de ácido sobre el gáster y tobera de la escupida (IDENTITY)
    G.sph(0.54, FOLD.emissive("#b8ff28"), [0, 0.9, -0.78]);
    G.cyl(0.58, 0.08, FOLD.bare(), [0, 0.86, -0.78], undefined, 8);
    G.cyl(0.1, 0.32, FOLD.bare(), [0, 0.5, 1.02], [Math.PI / 2, 0, 0], 6, 0.14);
  }
  along(G, 0.14, 0.18, 0.26, FOLD.dark(), [0, 0.46, -0.12]); // cintura
  G.box(0.4, 0.28, 0.46, body, [0, 0.5, 0.14]); // tórax
  for (const s of [-1, 1]) G.bend([s * 0.2, 0.64, -0.09], [s * 0.2, 0.64, 0.37], 0.03, body);
  G.plate([0, 0.645, 0.14], [Math.PI / 2, 0, 0], 0.26, 0.36, plate);
  along(G, 0.12, 0.12, 0.16, FOLD.dark(), [0, 0.52, 0.44]); // cuello
  G.box(0.44, 0.32, 0.36, body, [0, 0.54, 0.66], [-0.18, 0, 0]); // cabeza
  G.box(0.36, 0.08, 0.3, plate, [0, 0.72, 0.64], [-0.18, 0, 0]); // visera
  for (const s of [-1, 1]) {
    G.box(0.08, 0.1, 0.12, eye, [s * 0.22, 0.6, 0.74]);
    strut([s * 0.1, 0.42, 0.8], [s * 0.04, 0.36, 1.08], 0.06, 0.05, FOLD.bare()); // mandíbula
    G.box(0.05, 0.05, 0.1, FOLD.bare(), [s * 0.01, 0.36, 1.1], [0, -s * 0.9, 0]);
    bone(7);
    G.tube([[s * 0.1, 0.7, 0.78], [s * 0.22, 0.98, 0.92], [s * 0.34, 0.96, 1.22]], 0.018, FOLD.dark()); // antena
    G.box(0.05, 0.05, 0.08, FOLD.bare(), [s * 0.34, 0.96, 1.24]);
    bone(0);
  }
  // Patas: fémur, rodilla de acero, tibia y pie de goma, cada una en su hueso (caminata horneada: 300 hormigas cuestan lo mismo que una)
  const leg = FOLD.chitin(o.color);
  let b = 1;
  for (const [[hx, hy, hz], yaw] of ANT_HIPS) for (const s of [1, -1]) {
    bone(b++);
    const a = s > 0 ? yaw : Math.PI - yaw, P = (x: number, y: number, z: number): V3 => [hx * s + x * Math.cos(a) + z * Math.sin(a), hy + y, hz - x * Math.sin(a) + z * Math.cos(a)];
    const knee = P(0.36, 0.2, 0), foot = P(0.78, -0.44, 0.04);
    G.box(0.09, 0.09, 0.09, FOLD.bare(), P(0.02, 0, 0));
    strut(P(0.02, 0, 0), knee, 0.07, 0.09, leg); G.box(0.09, 0.09, 0.09, FOLD.bare(), knee);
    strut(knee, foot, 0.05, 0.06, leg); G.box(0.1, 0.04, 0.12, FOLD.rubber(), [foot[0], foot[1] + 0.01, foot[2]]);
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
const MOTH = "#d8c690";
export function mothBody(vis = 1) {
  const { G, done, strut, bone } = kit();
  const fur = FOLD.painted(MOTH, 0.55, 71), band = FOLD.chitin("#5a4830"), eye = FOLD.emissive("#c9a0ff");
  along(G, 0.3, 0.34, 0.36, fur, [0, 0.42, -0.02], 8); // tórax
  G.cyl(0.4, 0.06, band, [0, 0.42, 0.16], [Math.PI / 2, 0, 0], 8); // collar
  bone(1);
  [0.32, 0.28, 0.23, 0.16, 0.09].forEach((d, i) => along(G, d + 0.03, d, 0.13, i % 2 ? band : fur, [0, 0.42 - i * 0.012, -0.27 - i * 0.13], 8)); // abdomen anillado
  G.box(0.06, 0.06, 0.06, FOLD.emissive("#ffb400"), [0, 0.37, -0.92]); // luz de cola (lectura desde atrás)
  bone(0);
  along(G, 0.2, 0.26, 0.16, band, [0, 0.43, 0.26], 8); // cabeza
  for (const s of [-1, 1]) {
    G.sph(0.14, eye, [s * 0.11, 0.45, 0.32]);
    const a: V3 = [s * 0.06, 0.52, 0.3], b: V3 = [s * 0.2, 0.7, 0.42], c: V3 = [s * 0.34, 0.78, 0.5];
    bone(2);
    G.tube([a, b, c], 0.012, FOLD.dark());
    for (let k = 1; k <= 4; k++) { const t = k / 5, p = B.Vector3.Lerp(new B.Vector3(...b), new B.Vector3(...c), t); G.box(0.012, 0.09 - k * 0.012, 0.03, fur, [p.x, p.y, p.z], [0, 0, s * 0.5]); } // plumas
    bone(0);
    for (const z of [0.1, -0.02, -0.14]) strut([s * 0.12, 0.32, z], [s * 0.24, 0.16, z + 0.04], 0.025, 0.025, FOLD.dark()); // patitas recogidas
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
  const s = side, skin = FOLD.painted("#d4c090", 0.5, 73), skin2 = FOLD.painted("#a89068", 0.6, 74), spar = FOLD.dark();
  G.cyl(0.06, 0.16, FOLD.bare(), [0, 0, 0], [Math.PI / 2, 0, 0], 6); // bisagra pegada al tórax
  G.box(0.86, 0.012, 0.44, skin, [s * 0.55, 0.01, 0.04], [0, s * 0.18, 0]); // ala anterior
  G.box(0.36, 0.012, 0.3, skin2, [s * 0.98, 0.01, -0.06], [0, s * 0.5, 0]); // punta plegada
  G.box(0.58, 0.012, 0.36, skin2, [s * 0.42, -0.012, -0.28], [0, -s * 0.25, 0]); // ala posterior
  strut([0, 0.02, 0.02], [s * 1.12, 0.02, 0.0], 0.03, 0.028, spar); // larguero de ataque
  for (const [x, z] of [[0.7, -0.22], [0.9, 0.12], [0.6, -0.42]]) strut([s * 0.08, 0.018, 0], [s * x, 0.018, z], 0.014, 0.014, spar); // nervios
  for (const y of [0.018, -0.006]) G.cyl(0.2, 0.012, FOLD.dark(), [s * 0.74, y, -0.04], undefined, 8); // ocelo (arriba y abajo)
  G.cyl(0.1, 0.014, FOLD.emissive("#c9a0ff"), [s * 0.74, 0.02, -0.04], undefined, 8);
  return done();
}

// ---------- Robot a cuerda: pies de chapa, cintura hazard, torso plegado con rejilla y número, cabeza con visor ----------
// Huesos: 0 cuerpo, 1-2 piernas (izq/der), 3-4 brazos. Armado en unidades de 1/1,22 (ROBOT_K) para ocupar el ancho de su colisionador (1,2).
const ROBOT_K = 1.22, SH = 0.9;
export function robotBody() {
  const { G, done, strut, bone } = kit();
  const tin = FOLD.painted("#e0322a", 0.8, 81), dark = FOLD.painted("#282c34", 0.9, 82), steel = FOLD.bare(), lamp = FOLD.emissive("#ffe566");
  for (const s of [-1, 1]) {
    bone(s < 0 ? 1 : 2);
    G.box(0.28, 0.1, 0.42, dark, [s * 0.22, 0.06, 0.04]); G.box(0.29, 0.025, 0.43, FOLD.rubber(), [s * 0.22, 0.012, 0.04]); // pies
    G.cyl(0.12, 0.24, steel, [s * 0.22, 0.22, 0], undefined, 6); // tobillo
  }
  bone(0);
  G.box(0.62, 0.1, 0.38, dark, [0, 0.36, 0]); // pelvis
  G.trimStrip([0, 0.44, 0.262], [0, Math.PI, 0], 0.78, 0.07, "hazard", 0.02);
  G.box(0.8, 0.56, 0.5, tin, [0, 0.72, 0]); // torso (BODY)
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) G.bend([x * 0.4, 0.46, z * 0.25], [x * 0.4, 0.98, z * 0.25], 0.025, tin);
  G.grate([0, 0.62, 0.255], [0, Math.PI, 0], 0.42, 0.18, 4, steel); // rejilla del pecho
  G.decal([0, 0.86, 0.255], [0, Math.PI, 0], "numero", 0.2); // número (IDENTITY)
  G.plate([0, 0.6, -0.255], undefined, 0.26, 0.26, dark); // placa de la llave (la llave gira aparte)
  G.rivets([-0.36, 0.98, 0.255], [0.36, 0.98, 0.255], 7, [0, 0, 1]); G.rivets([-0.36, 0.98, -0.255], [0.36, 0.98, -0.255], 7, [0, 0, -1]);
  for (const s of [-1, 1]) { // brazos
    G.cyl(0.12, 0.08, steel, [s * 0.44, SH, 0], [0, 0, Math.PI / 2], 6);
    bone(s < 0 ? 3 : 4);
    strut([s * 0.49, SH, 0], [s * 0.53, 0.58, 0.16], 0.13, 0.13, tin);
    G.box(0.04, 0.12, 0.08, steel, [s * 0.5, 0.5, 0.2]); G.box(0.04, 0.12, 0.08, steel, [s * 0.57, 0.5, 0.2]); // pinza
    bone(0);
  }
  G.cyl(0.14, 0.08, steel, [0, 1.04, 0], undefined, 6); // cuello
  G.box(0.46, 0.3, 0.36, tin, [0, 1.22, 0.01]); // cabeza
  G.box(0.38, 0.08, 0.02, FOLD.screen("#ffe566"), [0, 1.24, 0.19]); // visor
  for (const s of [-1, 1]) G.box(0.06, 0.06, 0.03, lamp, [s * 0.11, 1.24, 0.2]);
  G.box(0.48, 0.04, 0.38, dark, [0, 1.38, 0.01]); // tapa
  G.tube([[0.1, 1.4, 0], [0.12, 1.58, -0.02]], 0.012, steel); G.box(0.05, 0.05, 0.05, FOLD.emissive("#e0a030"), [0.12, 1.6, -0.02]);
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
  const orange = FOLD.painted("#ff6b0a", 0.75, 121), dark = FOLD.dark(), steel = FOLD.bare();
  G.box(0.7, 0.06, 1.5, dark, [0, 0.16, 0]); // chasis
  G.box(0.8, 0.22, 1.7, orange, [0, 0.3, 0]); // carrocería
  for (const s of [-1, 1]) G.bend([s * 0.4, 0.41, -0.85], [s * 0.4, 0.41, 0.85], 0.025, orange);
  G.box(0.66, 0.2, 0.7, orange, [0, 0.5, -0.12]); // cabina
  G.box(0.56, 0.16, 0.03, FOLD.screen("#9be7ff"), [0, 0.52, 0.25], [-0.5, 0, 0]); // parabrisas
  G.box(0.6, 0.04, 0.16, orange, [0, 0.52, -0.84]); for (const s of [-1, 1]) G.box(0.03, 0.14, 0.08, dark, [s * 0.26, 0.46, -0.84]); // alerón
  G.decal([0, 0.413, 0.5], [Math.PI / 2, 0, 0], "flecha", 0.3);
  strut([-0.38, 0.24, 0.9], [0.38, 0.24, 0.9], 0.06, 0.06, steel); // paragolpes
  for (const s of [-1, 1]) G.box(0.12, 0.08, 0.03, FOLD.emissive("#fff8e8"), [s * 0.26, 0.32, 0.86]);
  G.box(0.08, 0.08, 0.2, steel, [0.3, 0.2, -0.88]); // escape
  FR_W.forEach((p, i) => { bone(i + 1); G.wheel(p, undefined, 0.48, 0.18); });
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
};

// ---------- Buggy: piso, bañera y trompa pintadas (pintura del garaje), guardabarros amarillos, jaula de caño, motor con rejilla ----------
/** `paint`: material de la pintura del jugador (se sigue gastando en partida). `lamp`: color de las ópticas. Origen = altura del eje. */
export function buggyHull(paint: B.Material, lamp: string) {
  const { G, done, strut } = kit();
  const dark = FOLD.dark(), yel = FOLD.painted(PAL.amarillo, 0.7, 91), steel = FOLD.bare();
  G.box(1.0, 0.06, 2.0, dark, [0, 0.0, 0]); // piso
  G.box(0.82, 0.26, 1.5, paint, [0, 0.2, -0.05]); // bañera
  for (const s of [-1, 1]) G.bend([s * 0.41, 0.33, -0.8], [s * 0.41, 0.33, 0.7], 0.025, paint);
  G.box(0.72, 0.12, 0.56, paint, [0, 0.2, 0.92], [0.3, 0, 0]); // trompa
  for (const sd of [-1, 1]) G.decal([sd * 0.413, 0.2, -0.2], [0, -sd * Math.PI / 2, 0], "numero", 0.22); // número a los costados (se lee igual de los dos lados)
  G.box(1.0, 0.1, 0.08, FOLD.rubber(), [0, 0.1, 1.2]); strut([-0.42, 0.1, 1.2], [-0.3, 0.06, 0.95], 0.04, 0.04, steel); strut([0.42, 0.1, 1.2], [0.3, 0.06, 0.95], 0.04, 0.04, steel); // paragolpes
  for (const s of [-1, 1]) { G.box(0.1, 0.06, 0.03, FOLD.emissive(lamp), [s * 0.24, 0.24, 1.17]); G.box(0.14, 0.1, 0.04, dark, [s * 0.24, 0.24, 1.15]); } // ópticas
  G.box(0.62, 0.22, 0.42, dark, [0, 0.42, -0.62]); // motor
  G.grate([0, 0.42, -0.84], undefined, 0.5, 0.18, 4, steel);
  G.trimStrip([0, 0.1, -1.06], undefined, 0.9, 0.08, "hazard", 0.03);
  for (const s of [-1, 1]) G.cyl(0.07, 0.3, steel, [s * 0.2, 0.42, -0.98], [Math.PI / 2, 0, 0], 6); // escapes
  G.box(0.36, 0.28, 0.06, dark, [0, 0.46, -0.24], [-0.2, 0, 0]); G.box(0.36, 0.06, 0.3, dark, [0, 0.34, -0.1]); // butaca
  for (const z of [-0.42, 0.3]) { // jaula
    const h = z < 0 ? 0.98 : 0.82, w = z < 0 ? 0.36 : 0.3;
    strut([-0.4, 0.33, z], [-w, h, z - 0.1], 0.05, 0.05, steel); strut([0.4, 0.33, z], [w, h, z - 0.1], 0.05, 0.05, steel); strut([-w, h, z - 0.1], [w, h, z - 0.1], 0.05, 0.05, steel);
  }
  strut([-0.36, 0.98, -0.52], [-0.3, 0.82, 0.2], 0.04, 0.04, steel); strut([0.36, 0.98, -0.52], [0.3, 0.82, 0.2], 0.04, 0.04, steel);
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { // guardabarros + soporte + amortiguador
    for (const a of [-0.75, -0.25, 0.25, 0.75]) G.box(0.4, 0.025, 0.25, yel, [x * 0.72, 0.47 * Math.cos(a), z * 0.72 + 0.47 * Math.sin(a)], [a, 0, 0]); // guardabarros en arco
    strut([x * 0.4, 0.3, z * 0.72], [x * 0.56, 0.45, z * 0.72], 0.05, 0.03, steel);
    strut([x * 0.38, 0.1, z * 0.72], [x * 0.52, 0.0, z * 0.72], 0.04, 0.04, steel); // brazo de suspensión
    strut([x * 0.38, 0.33, z * 0.6], [x * 0.5, 0.06, z * 0.66], 0.06, 0.06, yel); // amortiguador
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
  const sheet = FOLD.painted("#3f5f63", 0.9, 101);
  G.box(2.0, 6.6, 0.06, sheet, [0, 3.5, 0]);
  for (let i = 0; i < 4; i++) G.box(0.16, 6.6, 0.16, sheet, [-0.6 + i * 0.4, 3.5, 0]); // canales (asoman de las dos caras)
  for (const y of [0.4, 6.0]) G.trimStrip([0, y, 0], undefined, 2.08, 0.22, "remaches", 0.24); // rieles remachados (trim)
  G.box(0.22, 7.2, 0.22, FOLD.rust(), [-1.0, 3.6, 0]); // poste
  G.box(2.0, 0.3, 0.5, FOLD.painted(PAL.metalOsc, 0.8, 102), [0, 6.9, 0]); // tapa (la misma que el tablón)
  return done();
}

// ---------- Prop: detalle de caja de chapa (unidad 1×1×1 centrada; se escala al tamaño de la caja, que sigue siendo el colisionador) ----------
export function crateDetail() {
  const { G, done } = kit();
  const strap = FOLD.rust(), lip = FOLD.painted(PAL.metalOsc, 0.8, 111);
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
  const { G, done, strut, bone } = kit();
  const gold = FOLD.painted("#d4a017", 0.6, 131), dark = FOLD.painted("#24201a", 0.7, 132), steel = FOLD.bare(), eye = FOLD.emissive("#d0ff60");
  along(G, 1.2, 1.5, 2.5, dark, [0, 0.55, -0.25], 6); // vientre
  for (const s of [-1, 1]) {
    G.box(1.0, 0.07, 2.6, gold, [s * 0.42, 1.08, -0.25], [0, 0, -s * 0.3]); // élitro
    G.box(0.08, 0.44, 2.3, gold, [s * 0.86, 0.72, -0.25]); // faldón
    G.trimStrip([s * 0.91, 0.72, -0.25], [0, -s * Math.PI / 2, 0], 2.1, 0.12, "remaches", 0.02);
    G.box(0.1, 0.3, 1.3, FOLD.plastic("#f5f0c8"), [s * 0.66, 1.0, -0.2], [0, 0, -s * 0.34]); // franja clara
  }
  G.bend([0, 1.22, -1.5], [0, 1.22, 1.0], 0.06, steel); // costura
  G.trimStrip([0, 0.6, -1.52], undefined, 1.1, 0.18, "hazard", 0.04);
  bone(1);
  G.box(1.0, 0.62, 0.74, dark, [0, 0.56, 1.2]); // cabeza
  G.box(0.86, 0.1, 0.6, gold, [0, 0.9, 1.18]); // visera
  for (let i = 0; i < 5; i++) G.box(0.14, 0.24 + (i === 2 ? 0.12 : 0), 0.04, gold, [-0.32 + i * 0.16, 1.06 + (i === 2 ? 0.06 : 0), 0.95], [0.2, 0, 0]); // corona de placas
  G.box(0.82, 0.06, 0.08, steel, [0, 0.95, 0.95]);
  for (const s of [-1, 1]) { G.box(0.26, 0.22, 0.1, eye, [s * 0.32, 0.62, 1.57]); strut([s * 0.3, 0.36, 1.5], [s * 0.12, 0.3, 1.9], 0.1, 0.08, steel); }
  strut([0, 0.78, 1.5], [0, 1.1, 2.05], 0.16, 0.2, gold); G.box(0.2, 0.14, 0.16, steel, [0, 1.12, 2.08]); // cuerno
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
  const { G, done, strut, bone } = kit();
  const hair = FOLD.painted("#7a55a8", 0.7, 141), dark = FOLD.chitin("#4a3228"), band = FOLD.chitin("#c87830"), eye = FOLD.emissive("#ff4fd8");
  G.box(1.0, 0.5, 1.1, dark, [0, 0.5, 0.32]); // cefalotórax
  G.plate([0, 0.756, 0.3], [Math.PI / 2, 0, 0], 0.8, 0.9, hair);
  for (const s of [-1, 1]) G.bend([s * 0.5, 0.75, -0.2], [s * 0.5, 0.75, 0.86], 0.04, dark);
  along(G, 0.24, 0.28, 0.3, FOLD.dark(), [0, 0.55, -0.32]); // cintura
  for (const s of [-1, 1]) {
    strut([s * 0.18, 0.42, 0.86], [s * 0.16, 0.16, 1.08], 0.14, 0.16, FOLD.bare()); // quelícero
    strut([s * 0.36, 0.42, 0.8], [s * 0.42, 0.3, 1.22], 0.1, 0.1, dark); // pedipalpo
  }
  for (const [x, y, z, sz] of [[0.14, 0.82, 0.72, 0.12], [-0.14, 0.82, 0.72, 0.12], [0.26, 0.78, 0.64, 0.08], [-0.26, 0.78, 0.64, 0.08], [0, 0.84, 0.6, 0.07]]) G.box(sz, sz, sz, eye, [x, y, z]);
  bone(1);
  along(G, 1.2, 1.5, 1.7, hair, [0, 0.66, -1.12], 8); // abdomen
  G.cyl(1.56, 0.2, band, [0, 0.66, -0.66], [Math.PI / 2, 0, 0], 8); // faja
  G.plate([0, 1.3, -1.12], [Math.PI / 2 - 0.05, 0, 0], 0.7, 1.2, band); // placa dorsal
  G.decal([0, 1.31, -1.1], [Math.PI / 2 - 0.05, 0, 0], "calavera", 0.5);
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
  const red = FOLD.painted("#dc2626", 0.6, 151), red2 = FOLD.painted("#b91c1c", 0.7, 152), deck = FOLD.painted("#8b95a3", 0.8, 153), dark = FOLD.dark(), steel = FOLD.bare(), yel = FOLD.painted("#facc15", 0.6, 154);
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
  const shell = FOLD.painted("#7a8fa6", 0.6, 161), dark = FOLD.dark(), steel = FOLD.bare(), red = FOLD.emissive("#ff2a1a");
  G.cyl(6.45, 0.45, FOLD.rubber(), [0, 0.48, 0], undefined, 16); // paragolpes
  G.cyl(6.15, 0.75, shell, [0, 0.62, 0], undefined, 16, 6.45); // casco
  G.cyl(3.0, 0.5, shell, [0, 1.25, 0], undefined, 12, 4.2); // domo
  G.cyl(5.4, 0.16, FOLD.painted("#5c6b7a", 0.7, 162), [0, 1.04, 0], undefined, 16);
  G.trimStrip([0, 1.2, 1.6], [0, Math.PI, 0], 4.2, 0.2, "hazard", 0.3);
  G.cyl(1.45, 0.65, dark, [0, 1.75, -0.35], undefined, 8); G.box(0.8, 0.5, 0.8, red, [0, 2.1, -0.35]); // torreta y faro
  G.grate([0, 1.6, -2.3], undefined, 2.4, 0.5, 4, steel); // salida de aire
  G.box(3.6, 0.38, 0.55, dark, [0, 0.32, 3.05]); // barra de sensores
  for (const s of [-1, 1]) { G.box(0.9, 0.6, 0.2, red, [s * 1.05, 0.88, 3.1]); G.decal([s * 2.4, 1.1, 2.0], [0.3, s * 2.4, 0], "voltaje", 0.9); }
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
  const body = FOLD.painted("#e0a030", 0.6, 171), dark = FOLD.dark(), steel = FOLD.bare(), orange = FOLD.painted("#c2410c", 0.7, 172);
  G.box(2.65, 1.65, 3.2, body, [0, 1.12, -2.75]); // motor
  G.box(2.3, 0.5, 2.8, body, [0, 2.1, -2.75]); for (const s of [-1, 1]) G.bend([s * 1.15, 2.35, -4.15], [s * 1.15, 2.35, -1.35], 0.1, body);
  G.box(2.7, 0.55, 2.6, dark, [0, 0.42, -2.7]); // base
  for (const s of [-1, 1]) { G.grate([s * 1.34, 1.2, -2.8], [0, -s * Math.PI / 2, 0], 1.8, 0.7, 4, steel); G.decal([s * 1.335, 1.75, -2.0], [0, -s * Math.PI / 2, 0], "voltaje", 0.7); }
  G.box(0.55, 0.35, 1.1, orange, [0, 1.05, -1.35]); // cuello
  G.tube([[0, 1.6, -1.15], [0, 2.9, -0.95], [0, 2.9, -0.35], [0, 1.4, -0.3]], 0.16, dark); // mango en D
  G.tube([[0, 1.75, -4.25], [0, 2.85, -4.85], [0, 2.55, -5.35], [0, 1.35, -5.05]], 0.22, dark); // manija trasera
  for (const s of [-1, 1]) G.box(0.5, 0.4, 0.12, FOLD.emissive("#ff2a1a"), [s * 0.72, 2.0, -1.14]);
  G.box(0.85, 0.28, 5.9, steel, [0, 0.92, 2.75]); // espada
  G.box(0.55, 0.22, 5.5, FOLD.painted("#6b7280", 0.8, 173), [0, 0.78, 2.75]);
  G.trimStrip([0, 1.07, 0.3], [Math.PI / 2, 0, 0], 0.84, 0.6, "hazard", 0.02);
  G.tube([[0, 0.92, -4.25], [0, 0.28, -4.95], [0.75, 0.08, -5.65]], 0.16, dark); // cable
  bone(1);
  for (let i = 0; i < 8; i++) for (const s of [-1, 1]) G.box(0.42, 0.18, 0.28, steel, [s * 0.52, 0.92, -0.15 + i * 0.72], [0, s * 0.4, 0]); // dientes
  bone(0);
  return done(8, BOSS_S.cortacercos);
}
export function cortacercosPose(_v: number, walk: number, atk: number) {
  const S = BOSS_S.cortacercos;
  return [B.Matrix.RotationX(-0.08 * Math.sin(atk * Math.PI)), B.Matrix.Translation(0, 0, 0.22 * S * Math.sin(walk * Math.PI * 8))];
}

/** Pata articulada Folded (rey, tarántula): fémur y tibia de perfil, rodilla de bisagra emisiva, tobillo y pie de goma. Misma geometría que la vieja (LEGS). */
export function foldLeg(L: { hips: [number, number, number][]; len: number; r: number; color: string; knee?: string }) {
  const { G, done, strut } = kit();
  const hy = L.hips[0][1], leg = FOLD.painted(L.color, 0.75, 181), steel = FOLD.bare(), knee: V3 = [L.len * 0.48, L.len * 0.32, 0], foot: V3 = [L.len * 0.98, -hy + 0.02, 0.06];
  G.cyl(L.r * 2.4, L.r * 2.4, steel, [-L.r * 0.4, 0, 0], [0, 0, Math.PI / 2], 6); // rótula hacia el caparazón
  G.box(L.r * 2.3, L.r * 2.3, L.r * 2.3, steel, [0, 0, 0]);
  strut([0, 0, 0], knee, L.r * 1.75, L.r * 2.15, leg); strut(knee, foot, L.r * 1.35, L.r * 1.65, leg);
  G.cyl(L.r * 2.1, L.r * 2.4, L.knee ? FOLD.emissive(L.knee) : steel, knee, [Math.PI / 2, 0, 0], 6); // rodilla
  G.cyl(L.r * 1.6, L.r * 1.9, steel, [foot[0], foot[1] + L.r * 0.72, foot[2]], [Math.PI / 2, 0, 0], 6); // tobillo
  G.box(L.r * 2.7, L.r * 0.9, L.r * 2.5, FOLD.rubber(), [foot[0], foot[1] + L.r * 0.42, foot[2]]);
  return done(3);
}

// ---------- Mascotas jefe (Felipe el dogo, Eulalio el michu): cuadrúpedos de chapa con clips ----------
// Huesos: 0 torso, 1 cabeza, 2 cola, 3..6 patas (del. izq, del. der, tras. izq, tras. der; rígidas, giran en la cadera).
// Cada clip se hornea con el mismo nombre y largo (cuadros a 24/s) que la acción de Blender que reemplaza: SEQ de enemies.ts
// sigue apuntando a los mismos cuadros (despegue, golpe, final).
type Quad = { hipX: number; hipY: number; hipZ: number; neck: V3; tail: V3; cat: boolean };
const DOG: Quad = { hipX: 1.3, hipY: 4.6, hipZ: 2.6, neck: [0, 7.6, 3.4], tail: [0, 7.0, -3.2], cat: false };
const CAT: Quad = { hipX: 0.9, hipY: 3.6, hipZ: 2.5, neck: [0, 5.4, 3.2], tail: [0, 4.9, -3.0], cat: true };
const QLEGS: [number, number][] = [[1, 1], [-1, 1], [1, -1], [-1, -1]]; // [lado, adelante/atrás]

export function petBody(Q: Quad) {
  const { G, done, strut, bone } = kit();
  const c = Q.cat, coat = FOLD.painted(c ? "#d9782a" : "#6e7279", 0.55, c ? 191 : 201), dark = FOLD.painted(c ? "#7a3410" : "#3c4046", 0.7, c ? 192 : 202);
  const light = FOLD.painted(c ? "#f2e6d0" : "#d8dadc", 0.5, c ? 193 : 203), steel = FOLD.bare(), eye = FOLD.emissive(c ? "#a8ff3a" : "#ffb02e");
  const { hipX: hx, hipY: hy, hipZ: hz } = Q, tw = c ? 2.0 : 2.8, th = c ? 2.2 : 3.0, tl = c ? 6.0 : 6.6, ty = hy + th * 0.45;
  // Torso: caja de chapa con pechera clara, lomo atornillado y dobleces en las aristas
  G.box(tw, th, tl, coat, [0, ty, 0]);
  G.box(tw * 0.8, th * 0.7, 0.12, light, [0, ty - th * 0.1, tl / 2 + 0.06]);
  G.plate([0, ty + th / 2 + 0.01, -0.3], [Math.PI / 2, 0, 0], tw * 0.6, tl * 0.6, dark);
  for (const s of [-1, 1]) {
    G.bend([s * tw / 2, ty + th / 2, -tl / 2], [s * tw / 2, ty + th / 2, tl / 2], 0.08, coat);
    G.rivets([s * (tw / 2 + 0.01), ty - th * 0.35, -tl * 0.4], [s * (tw / 2 + 0.01), ty - th * 0.35, tl * 0.4], 7, [s, 0, 0]);
  }
  if (c) for (let i = 0; i < 4; i++) G.box(tw + 0.06, 0.5, 0.36, dark, [0, ty + th / 2 - 0.2, -2.2 + i * 1.3]); // rayas: flejes oscuros sobre el lomo
  else { G.decal([tw / 2 + 0.01, ty, -0.8], [0, -Math.PI / 2, 0], "numero", 1.2); G.decal([-tw / 2 - 0.01, ty, -0.8], [0, Math.PI / 2, 0], "numero", 1.2); }
  // Cuello y collar
  const [nx, ny, nz] = Q.neck;
  strut([0, ty + th * 0.2, tl / 2 - 0.6], [nx, ny + 0.4, nz + 0.6], c ? 1.1 : 1.7, c ? 1.1 : 1.6, coat);
  G.box(c ? 1.4 : 2.0, 0.4, c ? 1.3 : 1.8, FOLD.painted(c ? "#2f6fd0" : "#c0262a", 0.5, 204), [nx, ny, nz + 0.4], [-0.5, 0, 0]);
  G.box(0.5, 0.5, 0.06, FOLD.painted(PAL.amarillo, 0.4, 205), [nx, ny - 0.5, nz + 0.95]); // chapita
  bone(1); // cabeza
  const hy0 = ny + (c ? 1.0 : 1.4), hz0 = nz + (c ? 1.0 : 1.2), hs = c ? 1.9 : 2.4;
  G.box(hs, hs * 0.9, hs, coat, [0, hy0, hz0]);
  G.box(hs * (c ? 0.55 : 0.68), hs * (c ? 0.35 : 0.5), hs * (c ? 0.4 : 0.75), light, [0, hy0 - hs * 0.22, hz0 + hs * (c ? 0.68 : 0.85)]); // hocico
  G.box(hs * 0.3, hs * 0.2, 0.2, FOLD.dark(), [0, hy0 - hs * (c ? 0.1 : 0.05), hz0 + hs * (c ? 0.9 : 1.23)]); // nariz
  if (!c) G.box(hs * 0.6, hs * 0.16, hs * 0.65, dark, [0, hy0 - hs * 0.55, hz0 + hs * 0.75]); // mandíbula
  for (const s of [-1, 1]) {
    G.box(hs * 0.22, hs * 0.16, 0.1, eye, [s * hs * 0.27, hy0 + hs * 0.12, hz0 + hs / 2 + 0.05]);
    if (c) G.cyl(0.04, 1.1, coat, [s * hs * 0.32, hy0 + hs * 0.45 + 0.5, hz0 - 0.1], undefined, 4, 0.95); // oreja de chapa en punta
    else G.box(0.2, 1.6, 1.0, dark, [s * (hs / 2 + 0.05), hy0 + 0.1, hz0 - 0.2], [0, 0, s * 0.25]); // oreja caída
    if (c) for (const k of [-1, 1]) strut([s * hs * 0.3, hy0 - hs * 0.2, hz0 + hs * 0.85], [s * hs * 0.85, hy0 - hs * 0.2 + k * 0.15, hz0 + hs * 0.9], 0.04, 0.04, steel); // bigotes de alambre
  }
  bone(2); // cola
  const [tx, ty2, tz] = Q.tail;
  if (c) { strut([tx, ty2, tz], [0, ty2 + 1.6, tz - 1.8], 0.45, 0.45, coat); strut([0, ty2 + 1.6, tz - 1.8], [0, ty2 + 2.8, tz - 2.6], 0.4, 0.4, dark); }
  else strut([tx, ty2, tz], [0, ty2 + 1.8, tz - 1.8], 0.55, 0.55, coat);
  // Patas: perno de cadera en el torso, muslo pintado, rodilla de acero, caña y pata de goma
  QLEGS.forEach(([s, f], i) => {
    const x = s * hx, z = f * hz, lw = c ? 0.8 : 1.1;
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
  const { G, done, strut } = kit();
  const dark = FOLD.dark(), steel = FOLD.bare(), L = FOLD.emissive(lamp), tail = FOLD.emissive("#ff3a2a");
  const num = (x: number, y: number, z: number, s: number) => { for (const sd of [-1, 1]) G.decal([sd * x, y, z], [0, -sd * Math.PI / 2, 0], "numero", s); };
  const edges = (w: number, y: number, z0: number, z1: number, m: B.Material) => { for (const s of [-1, 1]) G.bend([s * w / 2, y, z0], [s * w / 2, y, z1], 0.022, m); };
  const lamps = (x: number, y: number, z: number, d: number) => { for (const s of x ? [1, -1] : [1]) { G.box(d * 1.4, d * 1.1, 0.05, dark, [x * s, y, z - 0.02]); G.box(d, d * 0.7, 0.04, L, [x * s, y, z]); } };
  const tails = (x: number, y: number, z: number) => { for (const s of [-1, 1]) G.box(0.14, 0.06, 0.03, tail, [s * x, y, z]); };
  const bumper = (w: number, y: number, z: number) => { strut([-w / 2, y, z], [w / 2, y, z], 0.06, 0.06, steel); for (const s of [-1, 1]) strut([s * w * 0.3, y, z], [s * w * 0.3, y, z - Math.sign(z) * 0.12], 0.04, 0.04, steel); };
  if (kind === "monster") { // monster truck: caja alta, cabina, barra de luces, amortiguadores rojos y paragolpes de caño
    G.box(1.0, 0.14, 1.9, dark, [0, 0.35, 0]);
    G.box(1.15, 0.36, 2.1, paint, [0, 0.62, 0]); edges(1.15, 0.8, -1.05, 1.05, paint);
    G.box(1.0, 0.36, 1.0, paint, [0, 0.98, -0.2]); edges(1.0, 1.16, -0.7, 0.3, paint);
    G.box(0.9, 0.28, 0.03, FOLD.screen("#9be7ff"), [0, 1.0, 0.33], [-0.4, 0, 0]);
    G.box(1.0, 0.08, 0.2, dark, [0, 1.2, 0.15]); lamps(0.36, 1.23, 0.26, 0.1); lamps(0.12, 1.23, 0.26, 0.1);
    G.grate([0, 0.62, 1.06], [0, Math.PI, 0], 0.6, 0.22, 4, steel); lamps(0.42, 0.66, 1.06, 0.1); tails(0.42, 0.66, -1.06);
    bumper(1.3, 0.5, 1.15); bumper(1.3, 0.5, -1.15); num(0.58, 0.62, 0.1, 0.3);
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) strut([x * 0.3, 0.42, z * 0.62], [x * 0.62, 0.05, z * 0.72], 0.09, 0.09, FOLD.painted("#ef4444", 0.6, 211));
  } else if (kind === "formula") { // fórmula: trompa baja, pontones, alerón delantero, halo de caño
    G.box(0.5, 0.16, 1.2, paint, [0, 0.12, 0.75]); G.box(0.8, 0.24, 1.3, paint, [0, 0.16, -0.25]); edges(0.8, 0.28, -0.9, 0.4, paint);
    for (const s of [-1, 1]) G.box(0.28, 0.2, 0.8, paint, [s * 0.46, 0.12, -0.2]);
    G.box(1.4, 0.04, 0.3, dark, [0, 0.02, 1.35]); for (const s of [-1, 1]) G.box(0.04, 0.14, 0.32, dark, [s * 0.7, 0.07, 1.35]);
    G.box(0.42, 0.14, 0.5, dark, [0, 0.32, 0.05]); strut([-0.2, 0.3, -0.15], [0, 0.46, 0.15], 0.03, 0.03, steel); strut([0.2, 0.3, -0.15], [0, 0.46, 0.15], 0.03, 0.03, steel);
    G.box(0.3, 0.2, 0.6, paint, [0, 0.38, -0.55]); G.trimStrip([0, 0.12, -0.91], undefined, 0.7, 0.08, "hazard", 0.02);
    G.decal([0, 0.205, 0.8], [Math.PI / 2, 0, 0], "numero", 0.22); lamps(0.18, 0.08, 1.36, 0.08); tails(0.25, 0.2, -0.92);
  } else if (kind === "tanque") { // tanque: orugas con faldones, casco con frente inclinado, torreta plegada, cañón de caño
    const olive = FOLD.painted("#3f4628", 0.8, 221);
    for (const x of [-0.72, 0.72]) {
      G.box(0.3, 0.42, 2.0, FOLD.rubber(), [x, 0.02, 0]); for (const z of [-1, 1]) G.cyl(0.42, 0.3, FOLD.rubber(), [x, 0.02, z], [0, 0, Math.PI / 2], 8);
      G.box(0.36, 0.05, 2.3, olive, [x, 0.28, 0]); G.rivets([x + Math.sign(x) * 0.19, 0.2, -1.0], [x + Math.sign(x) * 0.19, 0.2, 1.0], 8, [Math.sign(x), 0, 0]);
    }
    G.box(1.1, 0.32, 1.8, paint, [0, 0.36, -0.1]); G.box(1.1, 0.06, 0.45, paint, [0, 0.42, 0.95], [0.5, 0, 0]); edges(1.1, 0.52, -1.0, 0.8, paint);
    G.box(0.9, 0.3, 0.9, paint, [0, 0.67, -0.15]); edges(0.9, 0.82, -0.6, 0.3, paint);
    G.cyl(0.42, 0.08, olive, [0, 0.86, -0.25], undefined, 8);
    G.cyl(0.13, 1.1, steel, [0, 0.68, 0.75], [Math.PI / 2, 0, 0], 8); G.cyl(0.18, 0.16, dark, [0, 0.68, 1.3], [0, 0, Math.PI / 2], 8);
    num(0.455, 0.67, -0.15, 0.24); lamps(0.38, 0.42, 1.08, 0.12); G.trimStrip([0, 0.36, -1.01], undefined, 1.0, 0.1, "hazard", 0.02);
  } else if (kind === "axel") { // Axel: eje de caño entre dos ruedas gigantes y jaula-cabina colgando
    const red = FOLD.painted("#b8321f", 0.6, 231);
    G.cyl(0.16, 1.9, steel, [0, 0, 0], [0, 0, Math.PI / 2], 8);
    G.box(0.95, 0.12, 1.25, dark, [0, -0.12, 0]); G.box(0.9, 0.3, 1.2, paint, [0, 0.1, 0]); edges(0.9, 0.25, -0.6, 0.6, paint);
    for (const z of [-0.5, 0.45]) { strut([-0.42, 0.25, z], [-0.42, 0.76, z * 0.4], 0.05, 0.05, steel); strut([0.42, 0.25, z], [0.42, 0.76, z * 0.4], 0.05, 0.05, steel); }
    for (const x of [-0.42, 0.42]) strut([x, 0.76, -0.2], [x, 0.76, 0.18], 0.05, 0.05, steel);
    strut([-0.42, 0.76, -0.2], [0.42, 0.76, -0.2], 0.05, 0.05, steel);
    for (const s of [-1, 1]) { G.cyl(0.5, 0.06, red, [s * 0.98, 0, 0], [0, 0, Math.PI / 2], 8); G.cyl(0.02, 0.2, steel, [s * 1.1, 0, 0], [0, 0, -s * Math.PI / 2], 6, 0.16); }
    lamps(0.28, 0.3, 0.62, 0.16); num(0.455, 0.1, 0, 0.22);
  } else if (kind === "helado") { // camioncito de helados: cabina, caja crema con ventanilla y toldo, cucurucho de chapa en el techo
    const cream = FOLD.painted("#f3ead2", 0.5, 241), pink = FOLD.painted("#f08dbd", 0.5, 242);
    G.box(1.0, 0.14, 2.3, dark, [0, 0.05, 0]);
    G.box(1.1, 0.95, 1.45, cream, [0, 0.58, -0.4]); edges(1.1, 1.05, -1.12, 0.32, cream);
    G.box(1.1, 0.5, 0.85, paint, [0, 0.38, 0.75]); G.box(1.1, 0.34, 0.5, paint, [0, 0.75, 0.55]);
    G.box(0.95, 0.28, 0.03, FOLD.screen("#9be7ff"), [0, 0.72, 0.82], [-0.5, 0, 0]);
    for (const s of [-1, 1]) { G.box(0.02, 0.38, 0.7, FOLD.screen("#3f7f96"), [s * 0.56, 0.72, -0.4]); G.box(0.22, 0.03, 0.85, s > 0 ? pink : cream, [s * 0.64, 0.97, -0.4], [0, 0, -s * 0.35]); }
    G.cyl(0.46, 0.62, FOLD.painted("#d9a15a", 0.6, 243), [0, 1.37, -0.4], undefined, 6, 0.04);
    G.sph(0.5, pink, [0, 1.78, -0.4]); G.sph(0.4, cream, [0, 2.06, -0.4]); G.box(0.12, 0.12, 0.12, FOLD.painted("#c1121f", 0.4, 244), [0, 2.3, -0.4]);
    lamps(0.4, 0.4, 1.2, 0.14); tails(0.4, 0.5, -1.13); bumper(1.1, 0.14, 1.22); num(0.555, 0.45, -0.75, 0.3);
  } else if (kind === "combi") { // combi: dos tonos, techo crema, ventanillas, V en la trompa
    const cream = FOLD.painted("#d9cba6", 0.5, 251);
    G.box(1.0, 0.12, 2.3, dark, [0, 0.05, 0]);
    G.box(1.08, 0.5, 2.3, paint, [0, 0.36, 0]); G.box(1.08, 0.42, 2.1, cream, [0, 0.82, -0.05]); edges(1.08, 1.03, -1.1, 1.0, cream);
    G.box(0.7, 0.07, 1.9, cream, [0, 1.06, -0.05]);
    G.box(0.9, 0.3, 0.03, FOLD.screen("#9be7ff"), [0, 0.84, 1.0], [-0.3, 0, 0]);
    for (const s of [-1, 1]) for (const z of [0.6, -0.05, -0.7]) G.box(0.02, 0.28, 0.5, FOLD.screen("#3f7f96"), [s * 0.55, 0.84, z]);
    for (const sd of [-1, 1]) G.box(0.32, 0.06, 0.03, cream, [sd * 0.11, 0.5, 1.16], [0, 0, sd * 1.0]); // V
    lamps(0.4, 0.4, 1.17, 0.18); tails(0.42, 0.45, -1.16); bumper(1.1, 0.14, 1.22); bumper(1.1, 0.14, -1.2); num(0.545, 0.36, -0.2, 0.3);
  } else { // autito de carreras a cuerda: carrocería baja, cabina, paragolpes de caño y llave de cuerda
    G.box(0.7, 0.06, 1.7, dark, [0, 0.0, 0]);
    G.box(0.8, 0.22, 2.0, paint, [0, 0.13, 0]); edges(0.8, 0.24, -1.0, 1.0, paint);
    G.box(0.62, 0.18, 0.7, paint, [0, 0.33, -0.25]); G.box(0.58, 0.15, 0.03, FOLD.screen("#9be7ff"), [0, 0.35, 0.12], [-0.6, 0, 0]);
    bumper(0.76, 0.1, 1.08); bumper(0.76, 0.1, -1.06); lamps(0.25, 0.2, 1.01, 0.12); tails(0.28, 0.18, -1.01);
    G.cyl(0.08, 0.14, steel, [0.43, 0.18, -0.2], [0, 0, Math.PI / 2], 6); G.box(0.03, 0.2, 0.06, steel, [0.52, 0.18, -0.2]); // llave de cuerda
    num(0.405, 0.15, 0.35, 0.18); G.decal([0, 0.242, 0.6], [Math.PI / 2, 0, 0], "flecha", 0.25);
  }
  return done(2);
}

// ---------- Utilería del mundo (world.ts): piezas de chapa que visten al colisionador viejo (que queda invisible) ----------
/** Lata de pintura (4,4 × 5): chapa, etiqueta del color, tapa, asa de alambre, chorreadura y calco. */
export function paintCanFold(c: string) {
  const { G, done } = kit();
  const tin = FOLD.painted("#b8bcc2", 0.7, 261), label = FOLD.painted(c, 0.6, 262);
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
  const steel = FOLD.painted("#8f969e", 0.7, 271);
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
    const wood = FOLD.painted("#8a5a2b", 0.6, 272);
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
  const pm = FOLD.painted(paint, 0.95, 291), dark = FOLD.dark(), glass = FOLD.dark(), hub = Math.max(7, lift + 1);
  G.box(40, 13, 96, pm, [0, lift + 6.5, 0]); G.box(36, 11, 50, pm, [0, lift + 18.5, -4]);
  for (const s of [-1, 1]) { G.bend([s * 20, lift + 13, -48], [s * 20, lift + 13, 48], 0.6, pm); G.box(0.4, 7, 44, glass, [s * 18.2, lift + 19, -4]); G.box(0.6, 1.2, 80, FOLD.bare(), [s * 20.2, lift + 7, 0]); }
  G.box(33, 7, 0.4, glass, [0, lift + 19, 21.1]); G.box(33, 7, 0.4, glass, [0, lift + 19, -29.1]);
  for (const bz of [48.5, -48.5]) G.box(41, 3, 3, FOLD.rust(), [0, lift + 3, bz]);
  for (const bx of [-13, 13]) { G.box(8, 3, 0.5, FOLD.emissive("#e8e4d0"), [bx, lift + 9, 48.2]); G.box(8, 3, 0.5, FOLD.emissive("#8a1810"), [bx, lift + 9, -48.2]); }
  G.grate([0, lift + 8, 48.4], [0, Math.PI, 0], 14, 4, 5, FOLD.bare());
  G.decal([0, lift + 13.05, 30], [Math.PI / 2, 0, 0], "rayon", 18); G.decal([20.3, lift + 6.5, 10], [0, -Math.PI / 2, 0], "mancha", 14);
  for (const [wx, wz] of [[-19, 31], [19, 31], [-19, -31], [19, -31]]) { G.cyl(14, 8, FOLD.rubber(), [wx, hub, wz], [0, 0, Math.PI / 2], 12); G.cyl(8, 8.4, FOLD.rust(), [wx, hub, wz], [0, 0, Math.PI / 2], 8); }
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




