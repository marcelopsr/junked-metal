import * as B from "@babylonjs/core";
import { M, pbr, shadows } from "../render";
import { FOLDED_SLICE } from "../folded";
import { foldLeg, mothWing } from "../folded_slice";
import { type V3, box, cyl, sph, tor, tube, extrude, template, scene } from "./common";

// ---------- Enemigos ----------

const VIS_1C = 1.22; // oleada 1c: silueta más legible en bestiario (no toca DEF.size ni colisión)
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
      const fur = M.matte("#d8c690");
      const eye = pbr("mothEye", { color: "#c9a0ff", emissive: "#f0d8ff", rough: 0.35 });
      const eyeCore = pbr("mothEyeCore", { color: "#ffffff", emissive: "#ffffff", rough: 0.2 });
      return [
        sph(0.54, fur, [0, 0, -0.38], [0.85, 0.78, 1.55]),
        sph(0.46, M.matte("#a8966c"), [0, 0.03, 0.1]),
        sph(0.34, fur, [0, 0.03, 0.4]),
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
      const hair = M.matte("#7a55a8"), band = M.plastic("#c87830"), dark = M.matte("#4a3228");
      return [
        sph(1.5, hair, [0, 0.6, -0.82], [1, 0.88, 1.22], 10),
        tor(1.08, 0.24, band, [0, 0.64, -0.58], [Math.PI / 2, 0, 0], 12),
        sph(1.0, M.matte("#8a4a22"), [0, 0.92, -0.9], [1, 0.38, 1.05], 8),
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
      // Proyector de cine de chatarra (el show del Director): cajón oxidado sobre trípode, lente ámbar al frente (+z), dos carretes de película arriba
      const rust = M.plastic("#8a5a2a"), steel = M.metal("#9ca3af"), dark = M.matte("#1a1a1a"), amber = M.glow("#ffb020");
      return [
        box(3.2, 2.1, 3.4, rust, [0, 2.45, -0.2]),
        box(3.3, 0.3, 3.5, dark, [0, 1.45, -0.2]),
        cyl(1.7, 2.1, 1.5, steel, [0, 2.45, 2.3], [Math.PI / 2, 0, 0], 12),
        cyl(1.5, 1.5, 0.2, amber, [0, 2.45, 3.1], [Math.PI / 2, 0, 0], 12),
        tor(2.1, 0.18, dark, [0, 2.45, 2.7], undefined, 12),
        ...[-1, 1].map((s) => tor(2.5, 0.28, steel, [s * 0.95, 4.2, -0.9], [0, Math.PI / 2, 0], 12)),
        ...[-1, 1].map((s) => cyl(0.35, 0.35, 0.7, dark, [s * 0.95, 4.2, -0.9], [0, 0, Math.PI / 2], 6)),
        tube([[-0.95, 3.4, -0.9], [-0.2, 3.3, 0.3], [0.5, 3.6, 0.9], [0.95, 3.4, -0.9]], 0.06, dark),
        box(0.18, 0.7, 0.18, M.plastic("#c2410c"), [1.5, 3.7, 0.6]),
        sph(0.45, M.glow("#ff2a1a"), [1.5, 4.15, 0.6], undefined, 6),
        ...[[-1.3, 1.0], [1.3, 1.0], [0, -1.7]].map(([x, z]) => tube([[x * 0.4, 1.5, z * 0.4], [x, 0.7, z], [x * 1.15, 0, z * 1.15]], 0.16, steel)),
      ];
    }
    if (kind === "grua") {
      // Grúa de feria de chatarra (el show del Director): chasis naranja con orugas, torre, brazo con garra de tres dedos al frente (+z) y cabina con luz roja
      const body = M.plastic("#c2410c"), steel = M.metal("#9ca3af"), dark = M.matte("#1a1a1a"), amber = M.glow("#ffb020");
      return [
        box(3.4, 0.9, 5, body, [0, 0.9, 0]),
        ...[-1, 1].map((s) => box(0.9, 0.9, 5.4, dark, [s * 1.8, 0.45, 0])),
        box(1.6, 3.4, 1.6, body, [0, 2.9, -1.2]),
        box(1.9, 1.2, 1.9, M.plastic("#facc15"), [0, 4.9, -1.2]),
        sph(0.4, M.glow("#ff2a1a"), [0, 5.7, -1.2], undefined, 6),
        box(0.7, 0.7, 5.6, steel, [0, 4.6, 1.3], [0.35, 0, 0]),
        cyl(0.08, 0.08, 2.6, dark, [0, 3.3, 3.6], undefined, 5),
        sph(0.5, amber, [0, 1.95, 3.6], undefined, 6),
        ...[0, 1, 2].map((k) => tube([[0, 1.95, 3.6], [Math.sin(k * 2.094) * 0.9, 1.4, 3.6 + Math.cos(k * 2.094) * 0.9], [Math.sin(k * 2.094) * 0.5, 0.8, 3.6 + Math.cos(k * 2.094) * 0.5]], 0.14, steel)),
        ...[[-1.3, 1.9], [1.3, 1.9]].map(([x, z]) => cyl(0.35, 0.35, 0.3, dark, [x, 0.5, z], [0, 0, Math.PI / 2], 8)),
      ];
    }
    if (kind === "payaso") {
      // Payaso de resorte (desván): caja violeta, resorte de acero, cabeza blanca con nariz roja y sombrero, mira hacia +z
      const box0 = M.plastic("#7c3aed"), steel = M.metal("#9ca3af"), white = M.plastic("#f5f5f4"), red = M.glow("#ff2a1a"), dark = M.matte("#1a1a1a");
      return [
        box(3.2, 1.6, 3.2, box0, [0, 0.8, 0]),
        tube([[0, 1.6, 0], [0.6, 2.2, 0], [-0.6, 2.8, 0], [0.6, 3.4, 0], [0, 4, 0]], 0.22, steel),
        sph(1.2, white, [0, 5.1, 0], undefined, 10),
        sph(0.35, red, [0, 5, 1.15], undefined, 6),
        cyl(0.1, 0.9, 1.2, dark, [0, 6.5, 0], undefined, 8),
        ...[-1, 1].map((s) => sph(0.22, dark, [s * 0.45, 5.4, 1.0], undefined, 5)),
      ];
    }
    if (kind === "caja") {
      // Caja de música rota (desván): caja de madera, tapa torcida abierta, peine dorado, manivela de lado y bailarina chueca sobre un resorte; mira hacia +z
      const wood = M.plastic("#b45309"), dark = M.matte("#1a1a1a"), gold = M.metal("#d4a017"), pink = M.plastic("#f9a8d4"), white = M.plastic("#f5f5f4");
      return [
        box(5.6, 3.2, 5.6, wood, [0, 1.6, 0]),
        box(5.8, 0.35, 5.8, M.plastic("#7c2d12"), [0, 3.3, 0]),
        box(5.8, 0.4, 3.2, wood, [0.4, 5.0, -2.7], [-1.15, 0, 0.18]),
        box(4.2, 0.12, 1.4, gold, [0, 3.55, 1.7]),
        ...Array.from({ length: 9 }, (_, i) => box(0.14, 0.1, 1.1, M.metal("#e5e7eb"), [-1.8 + i * 0.45, 3.65, 1.7])),
        cyl(0.18, 0.18, 1.4, dark, [3.1, 1.9, 0], [0, 0, Math.PI / 2], 6),
        sph(0.4, M.plastic("#c2410c"), [3.8, 1.9, 0.9], undefined, 6),
        tube([[0, 3.5, -0.3], [0.4, 4.1, -0.3], [-0.4, 4.7, -0.3], [0, 5.3, -0.3]], 0.14, M.metal("#9ca3af")),
        cyl(0.2, 1.1, 1.3, pink, [0, 5.9, -0.3], [0, 0, 0.25], 10),
        sph(0.38, white, [0.2, 6.65, -0.3], undefined, 8),
        sph(0.3, M.glow("#ff2a1a"), [-1.6, 2.4, 2.85], undefined, 6),
        sph(0.3, M.glow("#ff2a1a"), [1.6, 2.4, 2.85], undefined, 6),
        box(2.4, 0.18, 0.2, dark, [0, 1.3, 2.82]),
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
      const hot = pbr("bichoFuego", { color: "#ff7a1a", rough: 0.45, metal: 0.3, emissive: "#ff4a00" }), core = M.glow("#ffd24a"), scrap = M.metal("#4a423b");
      return [
        sph(0.66, hot, [0, 0.36, -0.36], [1, 0.82, 1.3], 8), sph(0.3, core, [0, 0.52, -0.44], undefined, 6),
        box(0.52, 0.06, 0.52, scrap, [0, 0.66, -0.3], [0.3, 0, 0]), box(0.34, 0.22, 0.4, scrap, [0, 0.36, 0.1]),
        sph(0.4, scrap, [0, 0.38, 0.46], [1, 0.8, 1.1], 6), sph(0.1, core, [0.11, 0.45, 0.63], undefined, 4), sph(0.1, core, [-0.11, 0.45, 0.63], undefined, 4),
        cyl(0.015, 0.03, 0.42, scrap, [0.1, 0.6, 0.62], [0.7, 0, -0.35], 4), cyl(0.015, 0.03, 0.42, scrap, [-0.1, 0.6, 0.62], [0.7, 0, 0.35], 4),
      ];
    }
    if (kind === "cohete") {
      const tin = M.metal("#8a8f98"), rust = M.matte("#7a4a2a"), red = M.plastic("#d62828");
      return [
        cyl(0.62, 0.62, 1.05, tin, [0, 0.46, -0.08], [Math.PI / 2, 0, 0], 10), cyl(0.03, 0.62, 0.5, red, [0, 0.46, 0.7], [Math.PI / 2, 0, 0], 10),
        box(0.66, 0.05, 0.08, rust, [0, 0.46, 0.2]), cyl(0.36, 0.26, 0.22, rust, [0, 0.46, -0.7], [Math.PI / 2, 0, 0], 8), sph(0.34, M.glow("#ff9138"), [0, 0.46, -0.84], [1, 1, 1.5], 6),
        ...[-1, 1].flatMap((s) => [box(0.06, 0.34, 0.36, red, [s * 0.36, 0.5, -0.5], [0, 0, s * 0.5]), box(0.08, 0.1, 1.1, rust, [s * 0.26, 0.05, 0])]),
        box(0.06, 0.34, 0.36, red, [0, 0.82, -0.5]), sph(0.18, M.glow("#ffe566"), [0, 0.72, 0.3], undefined, 6),
      ];
    }
    if (kind === "grillo") {
      const g = M.plastic("#5a8a2a"), d = M.matte("#2f4a16"), eye = M.glow("#ffe040");
      return [
        sph(0.5, g, [0, 0.55, -0.15], [0.9, 0.8, 1.5], 8), sph(0.36, g, [0, 0.62, 0.55], undefined, 6),
        sph(0.09, eye, [0.15, 0.72, 0.8], undefined, 4), sph(0.09, eye, [-0.15, 0.72, 0.8], undefined, 4),
        ...[-1, 1].flatMap((s) => [
          tube([[s * 0.3, 0.5, -0.3], [s * 0.6, 1.05, -0.65], [s * 0.55, 0.1, -1]], 0.07, d), // pata trasera de salto
          tube([[s * 0.1, 0.8, 0.8], [s * 0.3, 1.2, 0.9], [s * 0.45, 1.5, 0.7]], 0.02, d), // antena
          tube([[s * 0.25, 0.45, 0.2], [s * 0.45, 0.3, 0.4], [s * 0.5, 0.05, 0.5]], 0.05, d),
        ]),
      ];
    }
    if (kind === "mosca") {
      const b = M.matte("#2a2a35"), wing = M.glass(), eye = M.glow("#ff3a2a");
      return [
        sph(0.3, b, [0, 0.45, -0.1], [0.9, 0.8, 1.3], 6), sph(0.22, b, [0, 0.48, 0.3], undefined, 6),
        sph(0.12, eye, [0.13, 0.52, 0.42], undefined, 4), sph(0.12, eye, [-0.13, 0.52, 0.42], undefined, 4),
        ...[-1, 1].map((s) => box(0.5, 0.02, 0.28, wing, [s * 0.34, 0.68, -0.1], [0, s * 0.3, s * 0.15])),
      ];
    }
    if (kind === "babosa") {
      const b = M.plastic("#8a9a3a"), eye = M.glow("#ffe040"), d = M.matte("#4a5a1a");
      return [
        sph(0.55, b, [0, 0.42, -0.2], [1, 0.7, 1.9], 8), sph(0.34, b, [0, 0.55, 0.75], undefined, 6),
        ...[-1, 1].flatMap((s) => [tube([[s * 0.12, 0.8, 0.8], [s * 0.2, 1.1, 0.95], [s * 0.3, 1.35, 0.9]], 0.03, d), sph(0.08, eye, [s * 0.3, 1.36, 0.9], undefined, 4)]), // tentáculos con ojos
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
