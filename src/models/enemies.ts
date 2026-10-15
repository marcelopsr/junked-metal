import * as B from "@babylonjs/core";
import { M, pbr, shadows } from "../render";
import { FOLDED_SLICE } from "../folded";
import { foldLeg, mothWing } from "../folded_slice";
import { type V3, box, cyl, sph, tor, tube, extrude, template, scene, canvasTex } from "./common";

// ---------- Enemigos ----------

const VIS_1C = 1.22; // oleada 1c: silueta más legible en bestiario (no toca DEF.size ni colisión)
// Metal pintado de insecto mecánico (ref90-94): rugosidad .45, metálico .3, barniz suave. Un material cacheado por color.
const paint = (c: string) => pbr("bug" + c, { color: c, rough: 0.45, metal: 0.3, coat: 0.25 });
// Pintura de juguete gastada (ref169/171/173): textura 128 px por color con lascas en los bordes de la cara que dejan ver gris metálico y rayones. Semilla fija, una por color.
const worn = (c: string) => pbr("worn" + c, { color: "#ffffff", rough: 0.45, metal: 0.3, coat: 0.25, tex: canvasTex("worn" + c, 128, (g, n) => {
  let s = 7919; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = c; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 44; i++) { // lascas pegadas a las 4 aristas de la cara (u/v = 0 o 1)
    const e = i % 4, a = r() * n, d = r() * 7 + 1, w = 4 + r() * 12;
    const x = e < 2 ? a : e === 2 ? d : n - d, y = e < 2 ? (e ? n - d : d) : a;
    g.fillStyle = r() < 0.6 ? "#9aa1ab" : "#6f7680";
    g.beginPath(); g.ellipse(x, y, e < 2 ? w : d + 1, e < 2 ? d + 1 : w, 0, 0, 7); g.fill();
  }
  g.strokeStyle = "#8c939d"; g.lineWidth = 1;
  for (let i = 0; i < 5; i++) { const x = r() * n, y = r() * n; g.beginPath(); g.moveTo(x, y); g.lineTo(x + r() * 20 - 10, y + r() * 20 - 10); g.stroke(); }
}) });
// Remaches: semiesferas chicas en las esquinas de una placa (centro, mitad ancho x, mitad alto y/z, eje del plano), fusionadas en la plantilla.
const rivMat = () => M.metal("#aeb4bd");
const rivets = (c: V3, hx: number, hy: number, ax: "z" | "x" | "y" = "z", d = 0.08): B.Mesh[] =>
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => sph(d, rivMat(), ax === "z" ? [c[0] + a * hx, c[1] + b * hy, c[2]] : ax === "x" ? [c[0], c[1] + b * hy, c[2] + a * hx] : [c[0] + a * hx, c[1], c[2] + b * hy], undefined, 4));
// Ojo de vidrio con brasa ámbar (sin el blanco quemado de M.glow).
const amberEye = () => pbr("ambarOjo", { color: "#a84a10", emissive: "#d4600c", rough: 0.3 });
// Escala una lista de piezas (posición y tamaño) respecto del origen: acorta un modelo sin tocar cada coordenada.
const shrink = (a: B.Mesh[], k: number) => a.map((m) => { m.position.scaleInPlace(k); m.scaling.scaleInPlace(k); return m; });
// Placas finas pegadas a la superficie de un elipsoide (centro c, radios r): [azimut desde +z hacia +x, elevación]. Dan relieve donde worn() casi no se ve (esferas). Caja fina en z, orientada a la normal.
const plates = (c: V3, r: V3, pts: [number, number][], mats: B.Material[], w = 0.5, h = 0.4): B.Mesh[] =>
  pts.map(([az, el], i) => box(w, h, 0.06, mats[i % mats.length], [c[0] + r[0] * Math.cos(el) * Math.sin(az) * 1.02, c[1] + r[1] * Math.sin(el) * 1.02, c[2] + r[2] * Math.cos(el) * Math.cos(az) * 1.02], [-el, az, 0]));
// Gelatina rosa translúcida (ref128/129): una sola para babosa y divisor.
const gel = () => pbr("gelRosa", { color: "#e8508a", rough: 0.12, metal: 0, emissive: "#6a1838", alpha: 0.85, coat: 0.9 });
const gelEye = () => pbr("gelOjo", { color: "#ffffff", rough: 0.3, emissive: "#8a8a8a" });
const vis1c = (k: string, s: number) => s * (["friccion", "robot", "cortadora", "aspiradora", "cortacercos"].includes(k) ? VIS_1C : 1);

export function enemyTemplate(kind: string, scale = 1): B.Mesh {
  return template(kind, () => {
    // Plaga/jefes con GLB (glb.ts): hormiga, escupidora, escarabajo, friccion, robot, rey, tarantula, cortadora, aspiradora, cortacercos, perro, gato
    if (kind === "rey") {
      // Minijefe: elytra ancha, costura y cuerno; ojos lima como escarabajo (GLB)
      const shell = M.metal("#d4a017"), shellHi = M.metal("#e8bc28");
      const dark = M.plastic("#111");
      return [
        sph(1.78, shell, [0, 0.56, -0.22], [1, 0.78, 1.48], 10),
        sph(1.35, shellHi, [0, 0.74, -0.38], [1, 0.42, 1.15], 8),
        box(0.06, 0.58, 2.05, dark, [0, 0.8, -0.22]),
        box(0.42, 0.1, 1.55, dark, [0, 0.54, -0.22]),
        sph(0.88, dark, [0, 0.44, 1.02]),
        cyl(0.04, 0.26, 1.05, dark, [0, 0.8, 1.48], [1.02, 0, 0], 6),
        sph(0.14, shellHi, [0, 0.98, 2.02]),
        sph(0.34, M.glow("#d0ff60"), [0.32, 0.56, 1.38]),
        sph(0.34, M.glow("#d0ff60"), [-0.32, 0.56, 1.38]),
        sph(0.14, M.glow("#b8e838"), [0, 0.64, 1.28], undefined, 4),
        box(0.18, 0.42, 1.35, M.plastic("#f5f0c8"), [0.62, 0.72, -0.22]),
        box(0.18, 0.42, 1.35, M.plastic("#f5f0c8"), [-0.62, 0.72, -0.22]),
      ];
    }
    // ponytail: siluetas oleada2 (Kenney toy car / wind-up bot); extraer a models/enemies/{friccion,robot}.ts si crece más
    if (kind === "friccion") {
      const orange = M.plastic("#ff6b0a");
      const dark = M.matte("#0d0a08");
      const chrome = M.metal("#f0f4ff");
      const lamp = M.glow("#fff8e8");
      return [
        box(0.72, 0.06, 1.55, dark, [0, 0.03, 0]),
        extrude([[-1.02, 0.04], [0.98, 0.04], [1.08, 0.14], [0.92, 0.28], [0.35, 0.34], [0.05, 0.52], [-0.35, 0.5], [-0.78, 0.38], [-1.02, 0.22]], 0.76, orange, [0, 0.06, 0]),
        box(0.48, 0.22, 0.38, M.glass(), [0, 0.44, -0.05], [-0.55, 0, 0]),
        box(0.58, 0.04, 0.14, orange, [0, 0.48, -0.82]),
        box(0.02, 0.18, 0.1, orange, [0.28, 0.54, -0.82]),
        box(0.02, 0.18, 0.1, orange, [-0.28, 0.54, -0.82]),
        tube([[-0.36, 0.14, 1.02], [0, 0.11, 1.08], [0.36, 0.14, 1.02]], 0.035, chrome),
        box(0.06, 0.04, 0.55, M.plastic("#f8fafc"), [0, 0.38, 0.35]),
        ...[[0.32, 0.2], [-0.32, 0.2]].flatMap(([x, y]) => [tor(0.22, 0.035, chrome, [x, y, 0.92], [Math.PI / 2, 0, 0], 10), sph(0.16, lamp, [x, y, 0.97], undefined, 6)]),
        cyl(0.09, 0.09, 0.18, chrome, [0.42, 0.22, -0.15], [0, 0, Math.PI / 2], 8),
        ...[[-0.4, 0.48], [0.4, 0.48], [-0.4, -0.48], [0.4, -0.48]].map(([x, z]) => cyl(0.46, 0.46, 0.2, M.rubber(), [x, 0.14, z], [0, 0, Math.PI / 2], 10)),
        ...[[-0.4, 0.48], [0.4, 0.48]].map(([x, z]) => sph(0.1, orange, [x, 0.32, z], undefined, 4)),
      ];
    }
    if (kind === "robot") {
      const tin = M.metal("#ff3b30");
      const tinDark = M.metal("#991b1b");
      const joint = M.metal("#b8c0cc");
      const lamp = M.glow("#ffe566");
      const chrome = M.metal("#d4a017");
      const arm = (sx: number) => [
        cyl(0.1, 0.1, 0.35, joint, [sx * 0.48, 0.78, 0.12], [0, 0, -sx * 0.7], 8),
        box(0.16, 0.48, 0.16, tin, [sx * 0.62, 0.62, 0.28], [0.4, 0, -sx * 0.5]),
        cyl(0.08, 0.1, 0.22, joint, [sx * 0.72, 0.42, 0.38], [0.5, 0, 0], 8),
      ];
      return [
        box(0.42, 0.12, 0.55, tinDark, [0.28, 0.08, 0.05]),
        box(0.42, 0.12, 0.55, tinDark, [-0.28, 0.08, 0.05]),
        cyl(0.14, 0.16, 0.22, joint, [0.28, 0.24, 0.05], undefined, 8),
        cyl(0.14, 0.16, 0.22, joint, [-0.28, 0.24, 0.05], undefined, 8),
        cyl(0.52, 0.58, 0.72, tin, [0, 0.68, 0], undefined, 10),
        cyl(0.48, 0.52, 0.08, tinDark, [0, 0.32, 0], undefined, 10),
        box(0.7, 0.55, 0.45, tin, [0, 0.72, 0.02]),
        cyl(0.38, 0.42, 0.32, tin, [0, 1.28, 0.02], undefined, 10),
        sph(0.4, tin, [0, 1.48, 0.02], [1, 0.75, 1], 8),
        box(0.52, 0.14, 0.06, M.matte("#111"), [0, 1.32, 0.24]),
        box(0.38, 0.08, 0.06, M.metal("#d4a017"), [0, 0.52, 0.26]),
        sph(0.14, lamp, [0.16, 1.34, 0.28], undefined, 6),
        sph(0.14, lamp, [-0.16, 1.34, 0.28], undefined, 6),
        cyl(0.025, 0.025, 0.38, joint, [0, 1.7, 0], undefined, 4),
        sph(0.07, M.glow("#e0a030"), [0, 1.92, 0], undefined, 4),
        ...arm(1),
        ...arm(-1),
        cyl(0.06, 0.06, 0.12, joint, [0, 0.72, -0.38], [Math.PI / 2, 0, 0], 6),
        tor(0.22, 0.045, chrome, [0, 0.76, -0.48], [Math.PI / 2, 0, 0], 12),
        ...[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a) => box(0.06, 0.32, 0.05, chrome, [Math.sin(a) * 0.22, 0.76, -0.48 - Math.cos(a) * 0.22], [0, a, 0])),
      ];
    }
    if (kind === "cortadora") {
      // Juguete ride-on: plataforma gris, capó rojo alto, volante y barra de corte al frente (lectura a distancia)
      const red = M.plastic("#dc2626"), deck = M.metal("#8b95a3"), dark = M.matte("#141414");
      return [
        cyl(5.8, 6.2, 1.05, deck, [0, 0.82, -0.15], undefined, 16),
        box(6.4, 0.35, 2.2, dark, [0, 0.42, 2.85]),
        box(6.2, 0.22, 0.55, M.metal("#d6dbe1"), [0, 0.58, 3.35]),
        extrude([[-3.2, 0], [3.2, 0], [3.2, 1.05], [2.2, 2.05], [-0.2, 2.35], [-3.2, 1.35]], 4.8, red, [0, 1.22, -0.35]),
        box(2.2, 0.55, 1.4, M.plastic("#b91c1c"), [0, 2.05, -0.2]),
        cyl(2.05, 2.15, 0.35, dark, [0, 3.35, 0.15], undefined, 10),
        box(2.5, 0.12, 0.12, M.metal("#d6dbe1"), [0, 3.55, 0.15]),
        box(0.12, 0.12, 2.5, M.metal("#d6dbe1"), [0, 3.55, 0.15]),
        box(3.4, 0.45, 0.7, dark, [0, 3.05, -2.75]),
        tube([[-2, 2.35, -2.95], [-2, 5.2, -5.2], [-2, 7.8, -6.35], [2, 7.8, -6.35], [2, 5.2, -5.2], [2, 2.35, -2.95]], 0.2, dark),
        box(0.85, 0.12, 3.6, M.plastic("#facc15"), [2.55, 1.35, -0.1]),
        ...[[-2.95, 2.35], [2.95, 2.35], [-2.95, -2.55], [2.95, -2.55]].map(([x, z]) => cyl(2, 2, 0.85, M.rubber(), [x, 0.88, z], [0, 0, Math.PI / 2], 12)),
        ...[[-3.35, 2.35], [3.35, 2.35], [-3.35, -2.55], [3.35, -2.55]].map(([x, z]) => cyl(1.05, 1.05, 0.2, M.metal("#fbbf24"), [x, 0.88, z], [0, 0, Math.PI / 2], 8)),
      ];
    }
    if (kind === "polilla") {
      // Cuerpo peludo y antenas plumosas; las alas van aparte (wingTemplate) para aletear
      const fur = M.matte("#8a6a45"), cream = M.matte("#e8d8b0");
      const eye = pbr("mothEye", { color: "#c9a0ff", emissive: "#f0d8ff", rough: 0.35 });
      const eyeCore = pbr("mothEyeCore", { color: "#ffffff", emissive: "#ffffff", rough: 0.2 });
      return [
        sph(0.54, fur, [0, 0, -0.38], [0.85, 0.78, 1.55]),
        sph(0.46, cream, [0, 0.03, 0.1]),
        sph(0.34, cream, [0, 0.03, 0.4]),
        ...[-1, 1].flatMap((sx) => [
          tube([[sx * 0.08, 0.12, 0.44], [sx * 0.16, 0.25, 0.52], [sx * 0.25, 0.38, 0.55]], 0.02, fur),
          sph(0.06, fur, [sx * 0.14, 0.21, 0.48], [1.3, 0.6, 0.8]),
          sph(0.06, fur, [sx * 0.22, 0.33, 0.54], [1.3, 0.6, 0.8]),
          sph(0.2, eye, [sx * 0.11, 0.06, 0.5]),
          sph(0.08, eyeCore, [sx * 0.11, 0.06, 0.52]),
        ]),
      ];
    }
    if (kind === "tarantula") {
      // Cefalotórax + abdomen con banda naranja, quelíceros gruesos; 8 patas en LEGS
      const hair = paint("#1a1a1e"), band = paint("#e0a020"), dark = paint("#101014");
      return [
        sph(1.5, hair, [0, 0.6, -0.82], [1, 0.88, 1.22], 10),
        tor(1.08, 0.24, band, [0, 0.64, -0.58], [Math.PI / 2, 0, 0], 12),
        sph(1.0, paint("#d9661a"), [0, 0.92, -0.9], [1, 0.38, 1.05], 8),
        sph(1.08, dark, [0, 0.5, 0.34], [1, 0.68, 1.22], 10),
        cyl(0.07, 0.22, 0.48, M.plastic("#2a1810"), [0.17, 0.28, 0.98], [2.55, 0, 0], 5),
        cyl(0.07, 0.22, 0.48, M.plastic("#2a1810"), [-0.17, 0.28, 0.98], [2.55, 0, 0], 5),
        cyl(0.1, 0.13, 0.68, dark, [0.3, 0.4, 0.9], [1.25, 0, -0.38], 5),
        cyl(0.1, 0.13, 0.68, dark, [-0.3, 0.4, 0.9], [1.25, 0, 0.38], 5),
        sph(0.18, M.glow("#ff4fd8"), [0.12, 0.7, 0.74]),
        sph(0.18, M.glow("#ff4fd8"), [-0.12, 0.7, 0.74]),
        ...[[0.22, 0.64, 0.62], [-0.22, 0.64, 0.62], [0.16, 0.72, 0.54], [-0.16, 0.72, 0.54], [0, 0.76, 0.66]].map((p) => sph(0.08, M.glow("#ff4fd8"), p as V3, undefined, 4)),
      ];
    }
    if (kind === "aspiradora") {
      // Disco bajo tipo juguete: paragolpes negro, domo gris, torreta y ojos rojos grandes al frente (+z)
      const shell = M.plastic("#7a8fa6"), dark = M.matte("#111"), bumper = M.rubber();
      return [
        tor(6.45, 0.42, bumper, [0, 0.48, 0], undefined, 20),
        cyl(6.15, 6.45, 0.75, shell, [0, 0.62, 0], undefined, 20),
        sph(4.2, shell, [0, 1.05, 0], [1, 0.42, 1], 8),
        cyl(5.4, 5.7, 0.2, M.metal("#5c6b7a"), [0, 1.22, 0], undefined, 18),
        box(4.8, 0.14, 0.35, M.plastic("#facc15"), [0, 1.28, 0.2]),
        cyl(1.45, 1.55, 0.65, dark, [0, 1.75, -0.35], undefined, 10),
        sph(0.75, M.glow("#ff2a1a"), [0, 2.05, 0.15], undefined, 6),
        cyl(1.35, 1.35, 0.14, M.plastic("#c8ccd2"), [0, 1.55, 1.05], undefined, 12),
        box(3.6, 0.38, 0.55, dark, [0, 0.32, 3.05]),
        sph(0.62, M.glow("#ff2a1a"), [1.05, 0.88, 3.12]),
        sph(0.62, M.glow("#ff2a1a"), [-1.05, 0.88, 3.12]),
        ...[-1, 1].flatMap((s) => [
          cyl(1.65, 1.65, 0.1, dark, [s * 2.75, 0.14, 2.45], undefined, 6),
          ...[0, 1, 2].map((k) => box(0.14, 0.08, 2.1, M.matte("#9ca3af"), [s * 2.75, 0.2, 2.45], [0, k * 1.15, 0])),
        ]),
      ];
    }
    if (kind === "proyector") {
      // Proyector de cine de chatarra (ref299; el show del Director): cajón de chapa óxido con parche turquesa sobre trípode, lente ámbar con aro de bronce al frente (+z), dos carretes de chapa gris con rayos arriba
      const rust = worn("#b4562c"), teal = worn("#5f8f84"), steel = worn("#8a8f96"), bronze = M.metal("#a8803c"), dark = M.matte("#1a1a1a"), amber = M.glow("#ffb020");
      const reel = (z: number, d: number) => [
        cyl(d, d, 0.3, steel, [0, 4.55, z], [0, 0, Math.PI / 2], 14), cyl(d * 0.22, d * 0.22, 0.5, bronze, [0, 4.55, z], [0, 0, Math.PI / 2], 8),
        ...[0, 1, 2, 3, 4].map((k) => { const a = k * 1.2566; return cyl(d * 0.2, d * 0.2, 0.36, dark, [0, 4.55 + Math.cos(a) * d * 0.32, z + Math.sin(a) * d * 0.32], [0, 0, Math.PI / 2], 6); }), // huecos del carrete
      ];
      return [
        box(3.2, 2.1, 3.4, rust, [0, 2.45, -0.2]), box(0.06, 1.3, 1.6, teal, [1.63, 2.4, -0.6]), box(0.06, 1.0, 1.0, teal, [-1.63, 2.4, 0.4]),
        ...rivets([1.65, 2.45, -0.6], 0.7, 0.5, "x", 0.09), ...rivets([-1.65, 2.45, 0.4], 0.4, 0.4, "x", 0.09),
        ...[0, 1, 2].map((i) => box(0.04, 0.12, 0.7, dark, [1.66, 2.0 + i * 0.22, 1.0])), // rejillas
        cyl(0.3, 0.3, 0.5, bronze, [-1.75, 2.6, -1.3], [0, 0, Math.PI / 2], 8), box(0.1, 0.9, 0.12, bronze, [-2.05, 2.3, -1.3], [0.4, 0, 0]), // manivela
        box(3.3, 0.3, 3.5, dark, [0, 1.45, -0.2]),
        cyl(1.7, 2.1, 1.5, steel, [0, 2.45, 2.3], [Math.PI / 2, 0, 0], 12),
        cyl(1.5, 1.5, 0.2, amber, [0, 2.45, 3.1], [Math.PI / 2, 0, 0], 12),
        tor(2.1, 0.22, bronze, [0, 2.45, 2.75], [Math.PI / 2, 0, 0], 12),
        ...reel(-1.3, 2.4), ...reel(1.1, 1.9),
        box(0.5, 0.5, 0.5, dark, [0, 3.7, -0.1]),
        tube([[0, 4.4, -0.6], [0, 3.9, -0.1], [0, 4.2, 0.4]], 0.07, dark), // cinta entre carretes
        box(0.18, 0.7, 0.18, bronze, [1.5, 3.7, 0.6]),
        sph(0.45, M.glow("#ff2a1a"), [1.5, 4.15, 0.6], undefined, 6),
        ...[[-1.3, 1.0], [1.3, 1.0], [0, -1.7]].flatMap(([x, z]) => [tube([[x * 0.4, 1.5, z * 0.4], [x, 0.7, z], [x * 1.15, 0, z * 1.15]], 0.16, rust), cyl(0.5, 0.5, 0.14, bronze, [x * 1.15, 0.07, z * 1.15], undefined, 8)]),
      ];
    }
    if (kind === "muneco" || kind === "falso") {
      // Muñeco de ventrílocuo (desván; ref275): madera gastada gris pardo, galera negra, cara crema con mejillas y mandíbula articulada, moño rojo, articulaciones de bolilla, puños crema, palo con perilla de bronce en la espalda; el falso es el mismo, descolorido y de ojos encendidos; mira hacia +z
      const f = kind === "falso", suit = worn(f ? "#8a8f98" : "#5b5149"), wood = M.plastic(f ? "#d6c7a8" : "#e6cfa0"), jaw = worn(f ? "#d6c7a8" : "#e6cfa0"), dark = M.matte("#1a1a1a"), white = M.plastic("#f5f5f4"), cuff = worn("#e0d4b0"), gold = M.metal("#d4a017"), cheek = M.plastic(f ? "#a8a29e" : "#d04a3a"), hat = worn("#2b2622"), joint = M.metal("#8a5a30"), pupil = f ? M.glow("#ff9a1a") : dark;
      return [
        box(1.8, 1.9, 1.2, suit, [0, 1.65, 0]), box(1.5, 0.9, 0.5, suit, [0, 0.7, -0.55], [0.25, 0, 0]), // frac y faldón
        ...rivets([0, 1.75, 0.69], 0.32, 0.6, "z", 0.1),
        box(0.7, 1.3, 0.1, dark, [0, 1.75, 0.62]), box(0.36, 0.9, 0.1, white, [0, 2.05, 0.66]), // chaleco y pechera
        box(0.1, 1.6, 0.06, dark, [0.5, 1.8, 0.64], [0, 0, -0.12]), box(0.1, 1.6, 0.06, dark, [-0.5, 1.8, 0.64], [0, 0, 0.12]), // solapas
        box(0.34, 0.2, 0.1, M.plastic("#b91c1c"), [0.2, 2.62, 0.68], [0, 0, 0.2]), box(0.34, 0.2, 0.1, M.plastic("#b91c1c"), [-0.2, 2.62, 0.68], [0, 0, -0.2]), sph(0.16, M.plastic("#8e1c1c"), [0, 2.62, 0.7], undefined, 5), // moño rojo
        box(0.55, 1.5, 0.55, suit, [-0.55, 0.75, 0.05]), box(0.55, 1.5, 0.55, suit, [0.55, 0.75, 0.05]),
        ...[-1, 1].flatMap((s) => [sph(0.4, joint, [s * 0.55, 0.85, 0.36], undefined, 5), sph(0.4, joint, [s * 1.1, 2.4, 0.2], undefined, 5), sph(0.36, joint, [s * 1.38, 1.28, 0.62], undefined, 5)]), // bolillas de rodilla, hombro y codo
        box(0.7, 0.32, 1.0, dark, [-0.55, 0.16, 0.25]), box(0.7, 0.32, 1.0, dark, [0.55, 0.16, 0.25]), // zapatos
        box(0.5, 1.5, 0.5, suit, [-1.25, 1.75, 0.3], [-0.5, 0, 0.2]), box(0.5, 1.5, 0.5, suit, [1.25, 1.75, 0.3], [-0.5, 0, -0.2]),
        box(0.56, 0.2, 0.56, cuff, [-1.42, 1.12, 0.66], [-0.5, 0, 0.2]), box(0.56, 0.2, 0.56, cuff, [1.42, 1.12, 0.66], [-0.5, 0, -0.2]), // puños crema
        box(0.5, 0.55, 0.3, wood, [-1.45, 0.9, 0.85]), box(0.5, 0.55, 0.3, wood, [1.45, 0.9, 0.85]), // manos de madera
        sph(1.6, wood, [0, 3.45, 0], [1, 1.05, 1], 10),
        box(1.2, 0.5, 0.9, jaw, [0, 2.8, 0.3]), box(0.9, 0.12, 0.5, M.matte("#7a1f1f"), [0, 3.0, 0.62]), // mandíbula y boca
        ...[-1, 1].flatMap((s) => [sph(0.34, white, [s * 0.38, 3.65, 0.72], undefined, 6), sph(0.2, pupil, [s * 0.38, 3.65, 0.9], undefined, 5), sph(0.3, cheek, [s * 0.62, 3.25, 0.62], [1, 1, 0.4], 5), box(0.4, 0.07, 0.1, dark, [s * 0.38, 3.98, 0.8], [0, 0, s * -0.25]), sph(0.36, wood, [s * 1.55, 3.4, 0], [0.4, 1, 0.8], 5)]), // ojos, mejillas, cejas y orejas
        ...(f ? [box(0.04, 1.0, 0.06, dark, [0.15, 3.7, 0.95], [0, 0, 0.15]), box(0.04, 0.6, 0.06, dark, [-0.7, 3.6, 0.8], [0, 0, -0.3])] : []), // grietas de porcelana
        cyl(1.9, 1.9, 0.12, hat, [0, 4.05, 0], undefined, 12), cyl(1.15, 1.2, 0.9, hat, [0, 4.55, 0], undefined, 10), cyl(1.22, 1.22, 0.28, M.plastic(f ? "#6b7280" : "#b91c1c"), [0, 4.2, 0], undefined, 10), // galera con cinta
        box(0.12, 3.0, 0.12, gold, [0, 2.2, -0.8]), sph(0.3, gold, [0, 3.8, -0.8], undefined, 5),
      ];
    }
    if (kind === "payaso") {
      // Payaso de resorte (desván; ref151): caja violeta gastada con estrellas amarillas y esquineros de bronce remachados, manivela de mango rojo, resorte en espiral, cabeza blanca con nariz roja, sonrisa de dientes, pelo rojo facetado y gorro cónico negro con pompón; mira hacia +z
      const box0 = worn("#6d34c9"), bronze = M.metal("#a8803c"), white = M.plastic("#f1ede4"), red = M.plastic("#d62a1e"), dark = M.matte("#1a1a1a"), star = M.matte("#e8b020"), spark = M.glow("#ff9a1a");
      return [
        box(3.2, 1.6, 3.2, box0, [0, 0.8, 0]),
        ...[-1, 1].flatMap((x) => [-1, 1].flatMap((z) => [box(0.5, 1.7, 0.5, bronze, [x * 1.55, 0.8, z * 1.55])])),
        ...rivets([0, 0.8, 1.66], 1.4, 0.6, "z", 0.08),
        ...[0, 1.26, 2.51, 3.77, 5.03].map((a) => box(1.2, 0.13, 0.08, star, [0, 0.8, 1.62], [0, 0, a])), // estrella en el frente
        cyl(0.26, 0.26, 0.5, bronze, [1.75, 0.9, 0], [0, 0, Math.PI / 2], 8), tube([[1.9, 0.9, 0], [2.2, 0.9, 0], [2.2, 0.9, 0.6]], 0.08, bronze), cyl(0.3, 0.3, 0.7, red, [2.2, 0.9, 0.95], [Math.PI / 2, 0, 0], 8), // manivela
        tube([[0.7, 1.6, 0.0],[0.44, 1.79, 0.55],[-0.16, 1.98, 0.68],[-0.63, 2.17, 0.3],[-0.63, 2.36, -0.31],[-0.15, 2.55, -0.68],[0.44, 2.74, -0.54],[0.7, 2.93, 0.01],[0.43, 3.12, 0.56],[-0.17, 3.31, 0.68],[-0.64, 3.5, 0.29],[-0.62, 3.69, -0.32],[-0.14, 3.88, -0.69],[0.45, 4.07, -0.53],[0.7, 4.26, 0.02],[0.42, 4.45, 0.56],[-0.18, 4.64, 0.68],[-0.64, 4.83, 0.28]], 0.13, bronze),
        sph(2.0, white, [0, 5.1, 0], undefined, 10),
        sph(0.55, red, [0, 4.95, 0.95], undefined, 7),
        box(1.0, 0.18, 0.1, red, [0, 4.35, 0.85]), ...[-0.3, 0, 0.3].map((x) => box(0.14, 0.2, 0.1, white, [x, 4.28, 0.9])), // sonrisa con dientes
        ...[-1, 1].flatMap((s) => [box(0.34, 0.5, 0.08, dark, [s * 0.5, 5.4, 0.9], [0, 0, s * 0.5]), sph(0.2, dark, [s * 0.5, 5.3, 0.98], undefined, 5), sph(0.09, spark, [s * 0.5, 5.3, 1.1], undefined, 4), sph(0.3, red, [s * 0.75, 4.75, 0.82], [1, 1, 0.3], 5), sph(0.85, red, [s * 1.1, 5.35, -0.25], [0.8, 1, 1], 5)]), // ojos, cachetes y pelo facetado
        cyl(0.1, 1.3, 1.4, dark, [0, 6.65, 0], undefined, 8), cyl(1.4, 1.4, 0.14, bronze, [0, 6.05, 0], undefined, 10), sph(0.34, bronze, [0, 7.4, 0], undefined, 6),
      ];
    }
    if (kind === "limpiafondos") {
      // Limpiafondos de pileta (minijefe de la pileta; ref173 f3 c4): chasis óxido y oliva remachado sobre orugas, bolsa de filtro atrás, manguera negra de succión al frente (+z) con boca y ojos ámbar; mira hacia +z
      const shell = worn("#a8431f"), cyan = worn("#6b6a2e"), dark = M.matte("#1a1a1a"), hose = M.matte("#262626"), eye = amberEye();
      return [
        cyl(2.1, 2.3, 1.1, shell, [0, 0.95, 0], undefined, 8),
        cyl(1.5, 1.6, 0.5, cyan, [0, 1.75, 0], undefined, 8),
        ...rivets([0, 1.55, 1.0], 1.1, 0.35, "z", 0.12), ...rivets([0, 2.05, 0], 0.5, 0.5, "y", 0.1),
        ...[-1, 1].map((sx) => box(0.9, 0.8, 4.6, dark, [sx * 2.1, 0.4, 0])),
        box(2.2, 1.6, 1.8, worn("#6b6a2e"), [0, 1.6, -2.2]), ...rivets([0, 1.6, -3.12], 0.85, 0.6, "z", 0.1),
        tube([[0, 1.3, 1.8], [0, 0.9, 3], [0.3, 0.7, 4.2]], 0.5, hose),
        cyl(0.9, 0.7, 0.5, dark, [0.3, 0.7, 4.4], [Math.PI / 2, 0, 0], 10),
        ...[-1, 1].flatMap((sx) => [sph(0.34, eye, [sx * 0.7, 2.0, 1.1], undefined, 6), tor(0.5, 0.08, M.metal("#a8803c"), [sx * 0.7, 2.0, 1.05], [Math.PI / 2, 0, 0], 8)]),
        cyl(0.08, 0.08, 1.4, dark, [0.9, 2.6, -0.4], undefined, 5), sph(0.22, M.glow("#ff2a1a"), [0.9, 3.35, -0.4], undefined, 5),
      ];
    }
    if (kind === "caja") {
      // Caja de música rota (desván; ref303): madera rosa saltada con esquineros y patas de bronce, tapa torcida abierta, tambor de latón con peine, engranaje, manivela de lado, ojos octogonales rojos y dientes de tablilla; bailarina chueca sobre un resorte; mira hacia +z
      const wood = worn("#c9606e"), lid = worn("#b0505e"), dark = M.matte("#1a1a1a"), gold = M.metal("#d4a017"), bronze = M.metal("#a8803c"), pink = M.plastic("#f9a8d4"), white = M.plastic("#f5f5f4"), cream = worn("#e0d0b0");
      return [
        box(5.6, 3.2, 5.6, wood, [0, 1.6, 0]),
        box(5.8, 0.35, 5.8, worn("#7c2d12"), [0, 3.3, 0]),
        box(5.8, 0.4, 3.2, lid, [0.4, 5.0, -2.7], [-1.15, 0, 0.18]),
        ...[-1, 1].flatMap((x) => [-1, 1].flatMap((z) => [box(0.9, 0.9, 0.9, bronze, [x * 2.75, 3.25, z * 2.75]), box(1.0, 0.7, 1.0, bronze, [x * 2.6, 0.35, z * 2.6])])), // esquineros y patas de bronce
        ...rivets([0, 3.25, 2.9], 2.75, 0.0, "z", 0.1),
        cyl(1.2, 1.2, 2.2, gold, [-1.2, 4.1, 0.2], [0, 0, Math.PI / 2], 10), ...[-0.6, -0.2, 0.2, 0.6].map((x) => sph(0.14, bronze, [-1.2 + x * 1.2, 4.7, 0.2], undefined, 4)), // tambor con púas
        cyl(1.4, 1.4, 0.25, gold, [1.7, 4.0, 0.2], [0, 0, Math.PI / 2], 10),
        box(4.2, 0.12, 1.4, gold, [0, 3.55, 1.7]),
        ...Array.from({ length: 9 }, (_, i) => box(0.14, 0.1, 1.1, M.metal("#e5e7eb"), [-1.8 + i * 0.45, 3.65, 1.7])),
        cyl(0.18, 0.18, 1.4, bronze, [3.1, 1.9, 0], [0, 0, Math.PI / 2], 6),
        sph(0.4, M.plastic("#c2410c"), [3.8, 1.9, 0.9], undefined, 6),
        tube([[0, 3.5, -0.3], [0.4, 4.1, -0.3], [-0.4, 4.7, -0.3], [0, 5.3, -0.3]], 0.14, M.metal("#9ca3af")),
        cyl(0.2, 1.1, 1.3, pink, [0, 5.9, -0.3], [0, 0, 0.25], 10),
        sph(0.38, white, [0.2, 6.65, -0.3], undefined, 8),
        ...[-1, 1].flatMap((s) => [cyl(1.0, 1.0, 0.3, dark, [s * 1.6, 2.4, 2.8], [Math.PI / 2, 0, 0], 8), sph(0.6, M.glow("#ff2a1a"), [s * 1.6, 2.4, 2.95], undefined, 6)]), // ojos octogonales
        box(2.4, 0.18, 0.2, dark, [0, 1.3, 2.82]), ...[-0.9, -0.3, 0.3, 0.9].map((x, i) => box(0.4, 0.3 + (i % 2) * 0.2, 0.1, cream, [x, 1.38, 2.86])), // dientes de tablilla
      ];
    }
    if (kind === "cortacercos") {
      // Herramienta eléctrica toy: bloque naranja atrás, mango en D, espada larga dentada hacia +z
      const body = M.plastic("#e0a030"), dark = M.matte("#1a1a1a"), steel = M.metal("#9ca3af");
      return [
        box(2.65, 1.65, 3.2, body, [0, 1.12, -2.75]),
        sph(2.85, body, [0, 1.95, -2.65], [1, 0.5, 1.15], 8),
        box(2.7, 0.55, 2.6, dark, [0, 0.42, -2.7]),
        box(0.55, 0.35, 1.1, M.plastic("#c2410c"), [0, 1.05, -1.35]),
        tor(2.35, 0.28, dark, [0, 2.25, -0.75], [Math.PI / 2, 0, 0], 12),
        tube([[0, 1.75, -4.25], [0, 2.85, -4.85], [0, 2.55, -5.35], [0, 1.35, -5.05]], 0.22, dark),
        box(0.35, 0.55, 0.45, dark, [0.95, 2.05, -0.55]),
        box(0.85, 0.28, 5.9, steel, [0, 0.92, 2.75]),
        box(0.55, 0.22, 5.5, M.metal("#6b7280"), [0, 0.78, 2.75]),
        ...Array.from({ length: 8 }, (_, i) => [-1, 1].map((s) => box(0.42, 0.18, 0.28, M.metal("#e5e7eb"), [s * 0.52, 0.92, -0.15 + i * 0.72]))).flat(),
        sph(0.42, M.glow("#ff2a1a"), [0.72, 2.15, -1.15]),
        sph(0.42, M.glow("#ff2a1a"), [-0.72, 2.15, -1.15]),
        tube([[0, 0.92, -4.25], [0, 0.28, -4.95], [0.75, 0.08, -5.65]], 0.16, dark),
      ];
    }
    // Luna (moon_sky.ts): bicho de fuego (brasa emisiva bajo chapa remachada) y bicho-cohete (lata con punta roja, aletas y escape)
    if (kind === "fuego") {
      const hot = pbr("bichoFuego", { color: "#ff7a1a", rough: 0.45, metal: 0.3, emissive: "#ff4a00" }), core = M.glow("#ffd24a"), scrap = worn("#6a3a1e");
      return [
        sph(0.66, hot, [0, 0.36, -0.36], [1, 0.82, 1.3], 8), sph(0.3, core, [0, 0.52, -0.44], undefined, 6),
        box(0.52, 0.06, 0.52, scrap, [0, 0.66, -0.3], [0.3, 0, 0]), box(0.34, 0.22, 0.4, scrap, [0, 0.36, 0.1]),
        sph(0.4, scrap, [0, 0.38, 0.46], [1, 0.8, 1.1], 6), sph(0.12, M.plastic("#0c0806"), [0.11, 0.45, 0.63], undefined, 5), sph(0.12, M.plastic("#0c0806"), [-0.11, 0.45, 0.63], undefined, 5), ...rivets([0, 0.67, 0.0], 0.15, 0.1, "y", 0.04),
        cyl(0.015, 0.03, 0.42, scrap, [0.1, 0.6, 0.62], [0.7, 0, -0.35], 4), cyl(0.015, 0.03, 0.42, scrap, [-0.1, 0.6, 0.62], [0.7, 0, 0.35], 4),
      ];
    }
    if (kind === "cohete") {
      const tin = worn("#c23a26"), rust = worn("#6a3a1e"), red = worn("#e53d30"), cream = M.plastic("#d8c39a");
      return [
        cyl(0.62, 0.62, 1.05, tin, [0, 0.46, -0.08], [Math.PI / 2, 0, 0], 10), cyl(0.03, 0.62, 0.5, red, [0, 0.46, 0.7], [Math.PI / 2, 0, 0], 10),
        box(0.66, 0.05, 0.08, rust, [0, 0.46, 0.2]), cyl(0.64, 0.64, 0.2, cream, [0, 0.46, 0.35], [Math.PI / 2, 0, 0], 10), ...rivets([0, 0.46, -0.55], 0.3, 0.3, "z", 0.045), cyl(0.36, 0.26, 0.22, rust, [0, 0.46, -0.7], [Math.PI / 2, 0, 0], 8), sph(0.34, M.glow("#ff9138"), [0, 0.46, -0.84], [1, 1, 1.5], 6),
        ...[-1, 1].flatMap((s) => [box(0.06, 0.34, 0.36, red, [s * 0.36, 0.5, -0.5], [0, 0, s * 0.5]), box(0.08, 0.1, 1.1, rust, [s * 0.26, 0.05, 0])]),
        box(0.06, 0.34, 0.36, red, [0, 0.82, -0.5]), sph(0.18, M.glow("#ffe566"), [0, 0.72, 0.3], undefined, 6),
      ];
    }
    if (kind === "grillo") { // ref263: saltamontes mecánico: abdomen segmentado, tórax-silla, cabeza de caja con ojos de vidrio, patas traseras enormes plegadas en Λ con espinas, antenas largas
      const g = worn("#7c9a2e"), d = paint("#4a2a18"), plate = worn("#b0522a"), br = worn("#a8703a"), eye = pbr("grilloOjo", { color: "#15100c", emissive: "#6a3208", rough: 0.25 }), core = amberEye();
      return [
        ...[[-0.1, 0.8, 0.62], [-0.5, 0.74, 0.58], [-0.9, 0.64, 0.5], [-1.25, 0.5, 0.4]].map(([z, w, h], i) => box(w, h, 0.44, i % 2 ? br : plate, [0, 0.62, z])), // abdomen en anillos
        box(0.26, 0.24, 0.5, br, [0, 0.56, -1.6], [-0.25, 0, 0]),
        box(0.84, 0.6, 0.55, br, [0, 0.62, 0.52]), box(0.92, 0.34, 0.7, g, [0, 1.0, 0.52], [0.12, 0, 0]), // tórax y silla (pronoto)
        box(0.62, 0.66, 0.62, g, [0, 0.74, 1.12], [0.1, 0, 0]), box(0.5, 0.36, 0.1, plate, [0, 0.55, 1.45]), // cabeza y placa de cara
        ...rivets([0, 1.18, 0.5], 0.3, 0.2, "y", 0.06),
        ...[-1, 1].flatMap((s) => [
          box(0.12, 0.5, 0.7, g, [s * 0.46, 0.78, 0.52], [0, 0, s * 0.2]),
          box(0.5, 0.05, 1.7, g, [s * 0.3, 1.04, -0.65], [0, 0, -s * 0.1]), box(0.04, 0.04, 1.6, br, [s * 0.18, 1.08, -0.65]), box(0.04, 0.04, 1.5, br, [s * 0.42, 1.08, -0.65]), // élitros con nervios
          sph(0.5, eye, [s * 0.38, 0.86, 1.14], [0.8, 1, 1], 6), sph(0.2, core, [s * 0.46, 0.86, 1.3], undefined, 5), tor(0.52, 0.07, br, [s * 0.42, 0.86, 1.14], [0, 0, Math.PI / 2], 8), // ojo de vidrio con aro de bronce
          box(0.1, 0.36, 0.1, br, [s * 0.14, 0.3, 1.5], [0.2, 0, s * 0.25]), // mandíbula
          cyl(0.34, 0.34, 0.34, br, [s * 0.5, 0.72, -0.2], [0, 0, Math.PI / 2], 8), // cadera
          tube([[s * 0.5, 0.72, -0.2], [s * 0.66, 1.3, -0.62], [s * 0.74, 1.8, -1.05]], 0.17, g), // fémur grande hacia arriba y atrás
          cyl(0.42, 0.42, 0.3, br, [s * 0.74, 1.8, -1.05], [0, 0, Math.PI / 2], 8),
          tube([[s * 0.74, 1.8, -1.05], [s * 0.82, 0.9, -1.7], [s * 0.86, 0.08, -2.4]], 0.09, g), // tibia en Λ
          ...[0.2, 0.4, 0.6, 0.8].map((t) => box(0.05, 0.14, 0.05, br, [s * (0.86 + t * 0.06), 1.8 - t * 1.72, -1.05 - t * 1.35], [0.5, 0, 0])), // espinas
          box(0.14, 0.08, 0.42, br, [s * 0.86, 0.04, -2.5]),
          tube([[s * 0.1, 1.0, 1.35], [s * 0.22, 1.9, 1.55], [s * 0.55, 2.5, 1.15]], 0.025, br), // antena larga
          tube([[s * 0.3, 0.55, 0.8], [s * 0.62, 0.85, 1.0], [s * 0.7, 0.05, 1.35]], 0.06, d), tube([[s * 0.3, 0.55, 0.4], [s * 0.66, 0.8, 0.45], [s * 0.78, 0.05, 0.55]], 0.06, d), // patas delanteras
        ]),
      ];
    }
    if (kind === "mosca") { // ref82: tórax óxido rayado, 2 ojos compuestos rojos grandes, alas de celofán con nervios cobrizos, 6 patas finas
      const b = worn("#9a4a22"), k = paint("#241410"), wing = pbr("moscaala", { color: "#c8d4e0", rough: 0.08, alpha: 0.45, coat: 0.6 }), eye = pbr("moscaOjo", { color: "#c42a14", emissive: "#e8401a", rough: 0.35 }), vein = paint("#b8703a");
      return [
        sph(0.6, b, [0, 0.45, -0.15], [0.9, 0.8, 1.4], 6), sph(0.44, b, [0, 0.5, 0.25], undefined, 6),
        box(0.5, 0.06, 0.08, k, [0, 0.68, -0.05]), box(0.46, 0.06, 0.08, k, [0, 0.66, -0.25]), box(0.36, 0.06, 0.08, k, [0, 0.62, -0.45]), ...rivets([0, 0.7, -0.3], 0.2, 0.15, "y", 0.045),
        sph(0.4, eye, [0.19, 0.55, 0.45], undefined, 6), sph(0.4, eye, [-0.19, 0.55, 0.45], undefined, 6),
        ...rivets([0, 0.71, 0.1], 0.16, 0.2, "y", 0.05),
        ...[-1, 1].flatMap((s) => [
          ...(() => { // alas en V hacia arriba y atrás (~30°): gota aplanada de celofán + 3 nervios cobrizos; R = giro del ala, el origen local es la raíz en el tórax
            const rx = -0.52, rz = s * 0.3, R = B.Matrix.RotationYawPitchRoll(0, rx, rz), root = new B.Vector3(s * 0.12, 0.7, -0.05);
            const at = (x: number, z: number, y = 0.02): V3 => { const q = B.Vector3.TransformCoordinates(new B.Vector3(x, y, z), R).addInPlace(root); return [q.x, q.y, q.z]; };
            const rot = (m: B.Mesh) => ((m.rotation = new B.Vector3(rx, 0, rz)), m);
            return [
              rot(sph(1, wing, at(0.05 * s, -0.6), [0.85, 0.035, 1.25], 8)), rot(sph(1, wing, at(0.02 * s, -0.25), [0.45, 0.035, 0.6], 6)), // gota: cuerpo ancho atrás, punta fina en la raíz
              rot(box(0.025, 0.025, 1.0, vein, at(0.05 * s, -0.6, 0.04))), rot(box(0.025, 0.025, 0.8, vein, at(s * 0.2, -0.5, 0.04))), rot(box(0.025, 0.025, 0.7, vein, at(-s * 0.15, -0.5, 0.04))),
            ];
          })(),
          ...[0.25, 0, -0.25].map((z) => tube([[s * 0.15, 0.4, z], [s * 0.4, 0.3, z + 0.08], [s * 0.45, 0.02, z + 0.1]], 0.025, k)),
        ]),
      ];
    }
    if (kind === "babosa") { // ref129/267: babosa larga y chata de chapa marrón/oliva, falda ondulada, caparazón espiral, ojos en tallos largos que brillan naranja
      const b = worn("#a07a3e"), foot = worn("#d0a060"), shell = worn("#6b5a2a"), rim = worn("#a8803c"), dark = paint("#2a1a10"), eye = amberEye(), pupil = M.plastic("#140c08");
      return [
        sph(2, foot, [0, 0.14, -0.1], [0.62, 0.14, 1.95], 8), // pie
        ...[-1, 1].flatMap((s) => Array.from({ length: 9 }, (_, i) => sph(0.36, i % 2 ? foot : b, [s * 0.66, 0.13, -1.7 + i * 0.44], [1, 0.45, 1.1], 4))), // falda ondulada
        sph(2, b, [0, 0.4, -0.35], [0.56, 0.3, 1.75], 10), sph(0.95, b, [0, 0.5, 1.45], [0.8, 0.75, 1.1], 8), // cuerpo largo y cabeza levantada
        ...plates([0, 0.4, -0.35], [0.56, 0.3, 1.75], [[0.3, 0.9], [-0.3, 0.9], [0.2, 0.9], [3.0, 0.8], [-3.0, 0.8], [3.14, 0.4], [1.3, 0.8], [-1.3, 0.8]], [shell, rim, foot], 0.36, 0.5),
        cyl(1.5, 1.5, 0.85, shell, [0, 0.98, -0.2], [0, 0, Math.PI / 2], 9), // caparazón (disco de costado)
        ...[-1, 1].flatMap((s) => [tor(1.45, 0.2, rim, [s * 0.44, 0.98, -0.2], [0, 0, Math.PI / 2], 9), tor(0.95, 0.17, rim, [s * 0.46, 0.98, -0.2], [0, 0, Math.PI / 2], 8), tor(0.5, 0.14, rim, [s * 0.47, 0.98, -0.2], [0, 0, Math.PI / 2], 6)]), // espiral
        cyl(0.24, 0.24, 1.0, rim, [0, 0.98, -0.2], [0, 0, Math.PI / 2], 6),
        ...[-1, 1].flatMap((s) => [
          cyl(0.07, 0.12, 0.9, dark, [s * 0.28, 1.15, 1.7], [0.3, 0, -s * 0.18], 5), sph(0.28, eye, [s * 0.36, 1.58, 1.83], undefined, 5), sph(0.12, pupil, [s * 0.37, 1.62, 1.97], undefined, 4), // tallo ocular
          cyl(0.04, 0.08, 0.4, dark, [s * 0.34, 0.5, 1.98], [1.1, 0, -s * 0.2], 4),
        ]),
      ];
    }
    // Comunes de ritmo medio: juguetes de chatarra de colores vivos (ver docs/ART_DIRECTION.md); frente = +Z
    if (kind === "kamikaze") { // bomba de caricatura con patas de resorte y mecha encendida
      const body = worn("#b4401e"), band = M.matte("#2b2220"), fuse = M.glow("#ffd24a"), amber = M.glow("#ff9a1a");
      return [
        sph(0.9, body, [0, 0.55, 0], [1, 0.95, 1.1], 10), tor(0.95, 0.08, band, [0, 0.55, 0], [Math.PI / 2, 0, 0], 12),
        cyl(0.18, 0.22, 0.2, band, [0, 1.04, -0.05], undefined, 8), tube([[0, 1.1, -0.05], [0.12, 1.35, -0.12], [0.02, 1.55, -0.05]], 0.03, band), sph(0.2, fuse, [0.02, 1.58, -0.05], undefined, 5),
        sph(0.2, amber, [0.22, 0.7, 0.5], undefined, 5), sph(0.2, amber, [-0.22, 0.7, 0.5], undefined, 5), ...rivets([0, 0.55, 0.8], 0.5, 0.35, "z", 0.06),
        sph(0.09, band, [0.22, 0.7, 0.62], undefined, 4), sph(0.09, band, [-0.22, 0.7, 0.62], undefined, 4),
        ...[-1, 1].map((x) => tube([[x * 0.3, 0.2, 0.1], [x * 0.38, 0.1, 0.25], [x * 0.3, 0, 0.4]], 0.06, band)),
      ];
    }
    if (kind === "escudo") { // ref153: robot chico con capucha de tela crema con parches verdes, ojos amarillos, báculo de bronce con orbe verde y morral; ponytail: se conserva una placa chica al frente porque es la mecánica del escudero
      const cream = worn("#a8532a"), green = worn("#5b6130"), dark = M.matte("#1d1810"), bronze = worn("#a8803c"), rim = worn("#a8803c"), orb = M.glow("#b8f040"), leather = M.matte("#7a4a28");
      return [
        cyl(0.55, 1.5, 1.2, cream, [0, 0.6, -0.05], undefined, 9), box(0.9, 0.5, 0.06, green, [0.2, 0.45, 0.5], [0, 0, 0.2]), box(0.5, 0.35, 0.06, green, [-0.45, 0.8, 0.4], [0, 0, -0.3]), // túnica y parches
        sph(0.9, cream, [0, 1.3, -0.05], [1, 1.15, 1], 8), cyl(0.04, 0.5, 0.7, cream, [0, 1.95, -0.2], [-0.35, 0, 0], 6), box(0.5, 0.14, 0.3, green, [0, 1.72, 0.3], [0.3, 0, 0]), // capucha con punta y parche
        sph(0.62, dark, [0, 1.22, 0.3], [1, 1, 0.75], 7), sph(0.2, M.glow("#ffe040"), [0.17, 1.26, 0.58], [0.7, 1.3, 0.5], 5), sph(0.2, M.glow("#ffe040"), [-0.17, 1.26, 0.58], [0.7, 1.3, 0.5], 5),
        cyl(0.3, 0.3, 0.1, rim, [0.52, 1.35, 0.1], [0, 0, Math.PI / 2], 8),
        box(0.5, 0.55, 0.3, leather, [0.62, 0.55, -0.15]), box(0.5, 0.2, 0.32, green, [0.62, 0.72, -0.15]), // morral
        box(1.05, 1.3, 0.1, cream, [0, 0.72, 0.7]), box(1.15, 0.08, 0.14, rim, [0, 1.4, 0.7]), box(1.15, 0.08, 0.14, rim, [0, 0.1, 0.7]), ...[0.3, 0.75, 1.2].flatMap((y) => [box(1.0, 0.14, 0.04, M.matte("#a8801a"), [0, y, 0.77], [0, 0, 0.5]), box(1.0, 0.1, 0.04, dark, [0, y + 0.17, 0.77], [0, 0, 0.5])]), // placa chica de tela y chapa
        ...rivets([0, 0.72, 0.8], 0.48, 0.55, "z", 0.08),
        box(0.5, 0.3, 0.7, dark, [0.4, 0.15, -0.1]), box(0.5, 0.3, 0.7, dark, [-0.4, 0.15, -0.1]),
        cyl(0.1, 0.12, 2.0, bronze, [-0.95, 1.0, 0.15], undefined, 6), sph(0.55, orb, [-0.95, 2.15, 0.15], undefined, 7), tor(0.7, 0.1, bronze, [-0.95, 2.15, 0.15], [Math.PI / 2, 0, 0], 10), box(0.3, 0.2, 0.3, bronze, [-0.95, 1.8, 0.15]),
      ];
    }
    if (kind === "brincador") { // rana de resorte: cuerpo lima sobre muelles
      const g = worn("#d9671f"), d = M.matte("#3a1f12"), eye = M.glow("#ff9a1a"), sp = M.metal("#5a4a3a");
      return [
        sph(0.8, g, [0, 0.8, -0.05], [1, 0.8, 1.2], 9), sph(0.3, eye, [0.26, 1.2, 0.35], undefined, 5), sph(0.3, eye, [-0.26, 1.2, 0.35], undefined, 5),
        sph(0.14, d, [0.26, 1.22, 0.5], undefined, 4), sph(0.14, d, [-0.26, 1.22, 0.5], undefined, 4), ...rivets([0, 1.0, -0.3], 0.3, 0.3, "y", 0.05),
        ...[-1, 1].flatMap((x) => [tube([[x * 0.3, 0.55, -0.3], [x * 0.38, 0.28, -0.35], [x * 0.3, 0.45, -0.4], [x * 0.38, 0.12, -0.45], [x * 0.3, 0.0, -0.5]], 0.07, sp), box(0.3, 0.05, 0.5, d, [x * 0.3, 0.02, -0.4])]),
        ...[-1, 1].map((x) => tube([[x * 0.35, 0.6, 0.3], [x * 0.5, 0.35, 0.5], [x * 0.5, 0.04, 0.6]], 0.06, d)),
      ];
    }
    if (kind === "francotirador") { // ref286: robot violeta de pose de tiro, sombrero ancho con franja crema, visor con ojo rojo, rifle largo con mira (apunta a +z)
      const p = worn("#7a3fc0"), cream = worn("#d6ccaa"), bronze = M.metal("#a8803c"), dark = M.matte("#26262b"), steel = M.metal("#3a3a40"), red = M.glow("#ff2a1a");
      return shrink([
        ...[-1, 1].flatMap((s) => [
          box(0.34, 0.72, 0.36, p, [s * 0.44, 0.78, 0.0], [0, 0, s * 0.18]), cyl(0.3, 0.3, 0.36, bronze, [s * 0.52, 0.45, 0.04], [0, 0, Math.PI / 2], 8),
          box(0.3, 0.6, 0.32, p, [s * 0.58, 0.28, 0.05], [0, 0, -s * 0.12]), box(0.42, 0.14, 0.66, dark, [s * 0.6, 0.07, 0.17]), box(0.12, 0.3, 0.04, cream, [s * 0.4, 0.82, 0.2], [0, 0, s * 0.18]), // pierna, rodilla, canilla, pie, franja
          cyl(0.34, 0.34, 0.3, bronze, [s * 0.6, 1.88, 0.0], [0, 0, Math.PI / 2], 8), // hombro
          cyl(0.34, 0.34, 0.1, bronze, [s * 0.42, 2.12, 0.05], [0, 0, Math.PI / 2], 8), // oreja
        ]),
        box(0.74, 0.3, 0.42, dark, [0, 1.08, 0]), box(0.84, 0.78, 0.52, p, [0, 1.58, 0]), box(0.14, 0.7, 0.04, cream, [-0.22, 1.58, 0.28]), ...rivets([0, 1.62, 0.28], 0.3, 0.28, "z", 0.05), // pelvis y torso
        cyl(0.16, 0.2, 0.2, dark, [0, 1.98, 0.02], undefined, 6),
        box(0.7, 0.56, 0.62, p, [0, 2.2, 0.05]), box(0.6, 0.26, 0.1, dark, [0, 2.18, 0.4]), sph(0.22, red, [0.12, 2.18, 0.45], undefined, 6), // cabeza, visor y ojo rojo
        cyl(2.6, 2.6, 0.07, p, [0, 2.52, 0.05], [0.06, 0, 0.05], 12), cyl(0.7, 0.95, 0.45, p, [0, 2.78, 0.05], undefined, 8), cyl(1.0, 1.0, 0.1, bronze, [0, 2.58, 0.05], undefined, 8), box(0.2, 0.4, 0.06, cream, [0, 2.78, 0.5]), box(0.34, 0.03, 0.9, cream, [0, 2.58, 0.62], [0.06, 0, 0]), // sombrero ancho con franja
        tube([[-0.55, 1.88, 0], [-0.74, 1.48, 0.3], [-0.32, 1.5, 0.95]], 0.13, p), box(0.28, 0.28, 0.32, dark, [-0.3, 1.5, 1.0]), // brazo izquierdo sostiene el guardamano
        tube([[0.55, 1.88, 0], [0.78, 1.52, 0.22], [0.4, 1.56, 0.4]], 0.13, p), box(0.26, 0.26, 0.3, dark, [0.4, 1.56, 0.42]), // brazo derecho en la empuñadura
        box(0.22, 0.32, 1.3, p, [0.4, 1.7, 0.45]), box(0.24, 0.07, 0.34, cream, [0.4, 1.88, 0.2]), box(0.18, 0.36, 0.5, p, [0.4, 1.58, -0.4], [0.2, 0, 0]), // receptor, franja y culata
        cyl(0.1, 0.1, 2.0, steel, [0.4, 1.72, 1.85], [Math.PI / 2, 0, 0], 8), box(0.2, 0.2, 0.4, bronze, [0.4, 1.72, 2.9]), box(0.12, 0.04, 0.22, dark, [0.4, 1.72, 2.9]), // cañón y freno de boca
        cyl(0.28, 0.2, 0.9, p, [0.4, 2.02, 0.6], [Math.PI / 2, 0, 0], 8), sph(0.22, red, [0.4, 2.02, 1.07], [1, 1, 0.4], 6), box(0.1, 0.12, 0.1, bronze, [0.4, 1.9, 0.35]), box(0.1, 0.12, 0.1, bronze, [0.4, 1.9, 0.85]), // mira
        box(0.1, 0.1, 0.5, dark, [0.4, 1.5, 1.3], [0.25, 0, 0]), // bípode plegado
      ], 0.8);
    }
    if (kind === "divisor" || kind === "cria") { // ref173 f2 c2 / ref128: caparazón de chapa óxido/crema partido en dos (hueco al medio, bisagra atrás) con ojos emisivos dentro; la cría es la misma silueta, DEF.scale
      const j = worn("#a8431f"), cream = worn("#c9b48a"), olive = worn("#6b6a2e"), bronze = worn("#a8803c"), core = paint("#1c120d"), eye = amberEye(), pupil = M.plastic("#1a1018"), leg = paint("#3a2418");
      const r: V3 = [0.575, 0.713, 1.035];
      return [
        sph(1.6, core, [0, 0.45, 0], [0.9, 0.5, 0.9], 6), // interior oscuro
        ...[-1, 1].flatMap((s) => [
          sph(2.3, s > 0 ? j : olive, [s * 0.78, 0.7, -0.1], [0.5, 0.62, 0.9], 8),
          ...plates([s * 0.78, 0.7, -0.1], r, ([[1.0, 0.7], [1.6, 0.5], [0.7, 1.1], [2.0, 0.9], [1.2, 0.2], [2.4, 0.4], [0.4, 0.5]] as [number, number][]).map(([a, e]): [number, number] => [s * a, e]), [cream, j, olive], 0.3, 0.26),
          sph(0.34, eye, [s * 0.17, 0.52, 0.66], undefined, 5), sph(0.14, pupil, [s * 0.17, 0.52, 0.8], undefined, 4),
          ...[-0.6, 0, 0.6].map((z) => tube([[s * 0.6, 0.3, z], [s * 1.0, 0.2, z], [s * 1.1, 0, z + 0.05]], 0.06, leg)),
        ]),
        box(0.7, 0.25, 0.5, bronze, [0, 0.8, -0.95]), ...rivets([0, 0.94, -0.95], 0.22, 0.16, "y", 0.05), // bisagra de bronce
      ];
    }
    if (kind === "ladron") { // ref152: mapache de chapa amarilla gastada con antifaz negro remachado, cola en espiral de punta negra y bolsa de tela marrón al hombro con una tuerca (mira a +z)
      const f = worn("#b4521f"), cream = worn("#c9b48a"), mask = M.matte("#2a2622"), bag = M.matte("#8a5a30"), dark = M.matte("#3a2a20"), nut = M.metal("#c9ccd1");
      return [
        sph(0.8, f, [0, 0.55, -0.1], [0.9, 0.85, 1.35], 8), sph(0.5, cream, [0, 0.45, 0.22], [0.8, 0.8, 0.6], 6), // cuerpo y panza
        sph(0.62, f, [0, 0.92, 0.45], undefined, 8), sph(0.3, cream, [0, 0.82, 0.78], [1, 0.75, 1], 6), sph(0.1, dark, [0, 0.9, 0.98], undefined, 4), // cabeza, hocico y nariz
        box(0.8, 0.2, 0.34, mask, [0, 1.0, 0.68]), ...[-1, 1].map((x) => sph(0.2, cream, [x * 0.16, 1.0, 0.8], [1, 1.1, 0.6], 5)), ...[-1, 1].map((x) => sph(0.1, dark, [x * 0.16, 1.0, 0.89], undefined, 4)), // antifaz y ojos
        ...rivets([0, 1.0, 0.86], 0.34, 0.06, "z", 0.06),
        cyl(0.04, 0.26, 0.42, f, [0.24, 1.38, 0.4], undefined, 4), cyl(0.04, 0.26, 0.42, f, [-0.24, 1.38, 0.4], undefined, 4),
        sph(0.62, bag, [0.15, 0.95, -0.35], [1, 1, 0.9], 7), cyl(0.2, 0.2, 0.14, nut, [0.15, 1.42, -0.3], undefined, 6), // bolsa con tuerca
        tube([[0, 0.4, -0.7], [0, 0.45, -1.1], [0, 0.9, -1.25], [0, 1.3, -1.05], [0, 1.45, -0.7], [0, 1.25, -0.5]], 0.13, f), sph(0.4, mask, [0, 1.25, -0.5], undefined, 5), // cola en espiral con punta negra
        ...[-1, 1].map((x) => tube([[x * 0.3, 0.3, 0.2], [x * 0.4, 0.15, 0.35], [x * 0.35, 0, 0.5]], 0.07, mask)),
      ];
    }
    throw new Error(`enemyTemplate: ${kind} no tiene modelo procedural (los GLB van por glb.ts)`);
  }, vis1c(kind, scale));
}

// ---------- Patas articuladas (instancias animadas aparte) ----------
// Pata del lado derecho: cadera en el origen, fémur hacia arriba y afuera, tibia hasta el piso.
// yaw (opcional): abre cada pata hacia adelante/atrás (lado derecho; el izquierdo se espeja)
export const LEGS: Record<string, { hips: [number, number, number][]; len: number; r: number; color: string; scale: number; yaw?: number[]; knee?: string }> = {
  rey: { hips: [[0.58, 0.36, -0.55], [0.62, 0.36, 0], [0.58, 0.36, 0.55]], len: 1.14, r: 0.095, color: "#3c4450", scale: 3.5, knee: "#6ef040" },
  tarantula: { hips: [[0.38, 0.44, -0.12], [0.42, 0.44, 0.14], [0.42, 0.44, 0.38], [0.36, 0.44, 0.62]], len: 1.62, r: 0.125, color: "#4a3228", scale: 3, yaw: [0.82, 0.28, -0.28, -0.78], knee: "#ff6fe8" },
  fuego: { hips: [[0.16, 0.3, 0.22], [0.18, 0.3, 0.06], [0.16, 0.3, -0.1]], len: 0.5, r: 0.035, color: "#4a423b", scale: 1, yaw: [0.6, 0, -0.6], knee: "#ff7a1a" }, // luna: bicho de fuego
};
// Fémur + tibia + tarso; espejo en enemies.ts. Fuente Blender: build_rey_leg / build_tarantula_leg (proc2/meshes.py).
function articulatedLegMeshes(L: (typeof LEGS)[string], hair: boolean) {
  const hy = L.hips[0][1];
  const leg = M.plastic(L.color);
  const kneeMat = L.knee ? M.glow(L.knee) : leg;
  const knee: V3 = [L.len * 0.48, L.len * 0.32, 0];
  const foot: V3 = [L.len * 0.98, -hy + 0.02, 0.06];
  return [
    tube([[0, 0, 0], [L.len * 0.25, L.len * 0.22, 0], knee], L.r * 1.05, leg),
    tube([knee, [L.len * 0.72, L.len * 0.05, 0.03], foot], L.r * 0.82, leg),
    sph(L.r * 2.5, leg, [L.len * 0.2, L.len * 0.16, 0], [1.12, 0.88, 1.08], 4),
    sph(L.r * 3.3, kneeMat, knee, undefined, 4),
    sph(L.r * 1.9, leg, foot, [1.25, 0.32, 0.95], 4),
    cyl(L.r * 0.7, L.r * 0.3, L.r * 1.4, leg, foot, [0.15, 0, 0.35], 4),
    ...(hair ? [0.32, 0.52, 0.72].map((t) => sph(0.2, M.matte(L.color), [L.len * (0.5 + t * 0.35), L.len * (0.26 - t * 0.2), 0.02], [1.35, 0.55, 1.15], 3)) : []),
  ];
}
export function legTemplate(kind: string) {
  const L = LEGS[kind];
  return template("leg_" + kind, () => FOLDED_SLICE ? foldLeg(L) : articulatedLegMeshes(L, kind === "tarantula"), L.scale);
}

// Ala de polilla: bisagra que nace en el tórax (x = 0), ala anterior y posterior con venas y ocelos
export const wingTemplate = (side: 1 | -1 = 1) => template("wing_polilla_" + (side > 0 ? "R" : "L"), () => {
  if (FOLDED_SLICE) return mothWing(side); // vertical slice Folded (?folded2)
  const wing = pbr("mothWing", { color: "#d4c090", rough: 0.86, alpha: 0.92 });
  const wingH = pbr("mothWingH", { color: "#a89068", rough: 0.88, alpha: 0.9 });
  const spot = pbr("mothWingSpot", { color: "#e8d8b0", rough: 0.7, alpha: 0.85 });
  const vein = M.matte("#5a4830");
  const dark = M.matte("#2a1810");
  const joint = M.matte("#8a7550");
  const s = side;
  return [
    // Raíz y bisagra articulada: conecta directamente al costado del tórax (x = 0)
    sph(0.12, joint, [s * 0.04, 0, 0], [1.2, 0.8, 0.9], 4),
    tube([[0, 0, 0], [s * 0.16, 0.02, 0], [s * 0.38, 0.03, -0.02]], 0.03, vein),
    // Ala anterior (forewing): pala aerodinámica ancha
    sph(1.2, wing, [s * 0.72, 0.02, -0.04], [1.35, 0.04, 1.05], 6),
    sph(0.68, wingH, [s * 0.52, -0.01, 0.18], [1.18, 0.05, 0.88], 5),
    sph(0.38, wingH, [s * 0.88, 0.0, 0.04], [1.15, 0.04, 0.8], 5),
    // Ala posterior (hindwing): más corta y redondeada, debajo hacia atrás
    sph(0.85, wing, [s * 0.48, -0.02, -0.24], [1.1, 0.04, 0.95], 5),
    sph(0.42, wingH, [s * 0.68, -0.02, -0.22], [1.05, 0.04, 0.85], 5),
    // Ocelo y marcas oscuras
    sph(0.28, dark, [s * 0.78, 0.03, -0.06], [1.1, 0.08, 1.0], 4),
    sph(0.18, spot, [s * 0.78, 0.04, -0.06], [1.05, 0.06, 0.9], 4),
    ...[[s * 0.46, 0.05, 0.08], [s * 0.88, -0.01, -0.16], [s * 0.32, 0.08, 0.28], [s * 0.62, 0.06, 0.22]].map(
      (p) => sph(0.18, dark, p as V3, [1.15, 0.07, 1.05], 4)
    ),
    // Venas estructurales que nacen del tronco
    tube([[s * 0.16, 0.02, 0], [s * 0.65, 0.03, 0.05], [s * 1.05, 0.0, -0.08]], 0.012, vein),
    tube([[s * 0.16, 0.02, 0], [s * 0.52, 0.01, 0.18], [s * 0.82, -0.01, 0.14]], 0.01, vein),
    tube([[s * 0.16, 0.02, 0], [s * 0.45, -0.01, -0.22], [s * 0.75, -0.02, -0.28]], 0.01, vein),
  ];
}, FOLDED_SLICE ? 1.3 : 1); // slice: alas más grandes, se leen desde la cámara de partida

// Llave de cuerda para el robot a cuerda (gira en vivo en la espalda al caminar o idle)
export const windKeyTemplate = () => template("wind_key", () => {
  const chrome = M.metal("#d4a017");
  const joint = M.metal("#b8c0cc");
  return [
    cyl(0.06, 0.06, 0.16, joint, [0, 0, 0], [Math.PI / 2, 0, 0], 6),
    tor(0.24, 0.045, chrome, [0, 0, -0.08], [Math.PI / 2, 0, 0], 12),
    ...[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a) =>
      box(0.06, 0.32, 0.05, chrome, [Math.sin(a) * 0.22, 0, -0.08 - Math.cos(a) * 0.22], [0, a, 0])
    ),
  ];
});
// Telegráfico de ataque enemigo en el piso (rojo = amenaza): aro + disco tenue, radio 1, se escala por instancia
export function teleTemplate() {
  const t = template("tele", () => {
    const d = B.MeshBuilder.CreateDisc("p", { radius: 1, tessellation: 28 }, scene);
    d.rotation.x = Math.PI / 2;
    d.material = pbr("teleFill", { color: "#ff2a1a", rough: 1, emissive: "#a01008", alpha: 0.22 });
    return [d, tor(2, 0.05, M.glow("#ff2a1a"), [0, 0.01, 0], undefined, 28)];
  });
  shadows.removeShadowCaster(t); // es luz en el piso, no un objeto
  return t;
}
// Sector de 120° (barrido del cortacercos), radio 1, centrado en +z: misma lógica que teleTemplate
export function sectorTemplate() {
  const t = template("teleArc", () => {
    const d = B.MeshBuilder.CreateDisc("p", { radius: 1, tessellation: 24, arc: 1 / 3 }, scene);
    d.rotation.z = Math.PI / 6; d.bakeCurrentTransformIntoVertices(); // arco de 30° a 150°: centro en +y
    d.rotation.x = Math.PI / 2; d.bakeCurrentTransformIntoVertices(); // acostado: centro en +z
    d.material = pbr("teleFillArc", { color: "#ff2a1a", rough: 1, emissive: "#c01808", alpha: 0.28 });
    const edge: V3[] = [[0, 0.02, 0], ...Array.from({ length: 13 }, (_, i) => { const a = -Math.PI / 3 + (i * Math.PI) / 18; return [Math.sin(a), 0.02, Math.cos(a)] as V3; }), [0, 0.02, 0]];
    return [d, tube(edge, 0.045, M.glow("#ff2a1a")), tor(1.88, 0.04, M.glow("#ff5a45"), [0, 0.02, 0], [Math.PI / 2, 0, 0], 20)];
  });
  shadows.removeShadowCaster(t);
  return t;
}
// Aura de élite (radio 1, se escala por instancia): aro en el piso + halo emisivo tenue. Amarilla = rápida, gris metálica = blindada
// "rabia" = halo rojo de la fase 2 de los jefes (enemies.ts setRage)
export function auraTemplate(t: string) {
  const c = t === "rapida" ? "#ffd84a" : t === "rabia" ? "#ff3a2a" : "#b8c0c8";
  const a = template("aura_" + t, () => [
    tor(2, 0.07, M.glow(c), [0, 0.06, 0], undefined, 20),
    sph(2.1, pbr("aura_" + t, { color: c, rough: 0.3, metal: t === "blindada" ? 0.9 : 0, emissive: t === "rapida" ? "#8a6a00" : t === "rabia" ? "#c01808" : "#4a5058", alpha: t === "rabia" ? 0.24 : 0.18 }), [0, 0.55, 0], [1, 0.7, 1], 10),
  ]);
  shadows.removeShadowCaster(a);
  return a;
}
// Cable del cortacercos tirado en el piso (7 m a lo largo de z) con chispas rojas: es ataque enemigo
export function cableTemplate() {
  const t = template("cable", () => [
    cyl(0.26, 0.26, 7, M.matte("#141414"), [0, 0, 0], [Math.PI / 2, 0, 0], 6),
    ...[-3.2, -1.6, 0, 1.6, 3.2].map((z, i) => box(0.38, 0.22, 0.55, M.plastic(i % 2 ? "#e0a030" : "#141414"), [0, 0.04, z])),
    ...[-3.4, -1.7, 0, 1.7, 3.4].map((z) => sph(0.34, M.glow("#ff2a1a"), [0, 0.1, z], undefined, 5)),
  ]);
  shadows.removeShadowCaster(t);
  return t;
}
// Tuerca roja que dispara la aspiradora (ataque enemigo)
export const nutTemplate = () => template("tuerca", () => [
  tor(0.78, 0.28, pbr("nutRed", { color: "#ff3a1f", rough: 0.3, metal: 0.6, emissive: "#c01800" }), [0, 0, 0], [Math.PI / 2, 0, 0], 6),
  cyl(0.32, 0.32, 0.12, M.matte("#1a1a1a"), [0, 0, 0], [Math.PI / 2, 0, 0], 6),
]);

// Bola de agua sucia que escupe el Limpiafondos: gota marrón turbia con una salpicadura más oscura (no la tuerca de la aspiradora)
export const dirtyWaterTemplate = () => template("aguaSucia", () => [
  sph(1.6, pbr("dirtyWater", { color: "#6b4a26", rough: 0.15, metal: 0.1, emissive: "#3a2410" }), [0, 0, 0], [1, 1.2, 1], 8),
  sph(0.8, M.matte("#3b2a14"), [0.45, 0.4, 0.4], undefined, 6),
]);

// Onda de sonido de la caja de música: aro ámbar en el piso (radio 1, se escala por instancia); es ataque enemigo
export function ondaTemplate() {
  const t = template("onda", () => [tor(2, 0.1, M.glow("#ffb020"), [0, 0.1, 0], undefined, 32), tor(1.86, 0.05, M.glow("#ff5a45"), [0, 0.1, 0], undefined, 32)]);
  shadows.removeShadowCaster(t);
  return t;
}
// Bailarina de la caja de música (ataque enemigo): falda rosa, torso, cabeza y brazos abiertos; gira sobre sí misma
export function bailarinaTemplate() {
  const t = template("bailarina", () => {
    const pink = M.plastic("#f9a8d4"), white = M.plastic("#f5f5f4");
    return [
      cyl(0.2, 1.1, 0.8, pink, [0, 0.5, 0], undefined, 10),
      cyl(0.3, 0.3, 0.9, white, [0, 1.2, 0], undefined, 8),
      sph(0.3, white, [0, 1.85, 0], undefined, 8),
      box(2.2, 0.12, 0.2, white, [0, 1.5, 0]),
      sph(0.14, M.glow("#ff2a1a"), [0, 2.2, 0], undefined, 5),
    ];
  });
  shadows.removeShadowCaster(t);
  return t;
}
