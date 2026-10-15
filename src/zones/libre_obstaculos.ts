import * as B from "@babylonjs/core";
import { Physics6DoFConstraint } from "@babylonjs/core/Physics/v2/physicsConstraint.js"; // fuera del barril bjs.ts (compartido, solo del orquestador)
import { PhysicsConstraintAxis as Ax } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin.js";
import { box, cyl, merge } from "../models";
import { M, pbr, shadows } from "../render";
import { ramp } from "../world_layout";
import { bare, decal, dyn, scene, stat, undo } from "./common";
import type { Barrio } from "./libre";

// Circuito de obstáculos de Free Roam (centro +150, -150), cuadrante sureste: x 130..258, z -236..-134 (anillo en 266, atajo diagonal llega a (120,-120)).
// Recorrido en S de tres carriles de 12 m, ~430 m (unos 30 s a 15 m/s). Sentido: A al este (z -140), B al oeste (z -185), C al este (z -230).
//  A: largada, slalom de 6 conos (se vuelcan), tres lomas en serie.   B: balancín, puente angosto, túnel de cartón.   C: dos saltos sobre huecos con mesa de aterrizaje, meta.
// Reglas medidas: un escalón de 0,1 m frena al auto; tope ~15 m/s; gravedad ~25 m/s2 (vuelo corto). Huecos: despegues de 2 y 3 m, mesas de 1 m; el auto cae a 3,2-6,4 m (salto 1, 9-15 m/s) y 5,2-9,3 m (salto 2, 10-15 m/s) según velocidad: huecos de 3 y 5 m (autos de 9 m/s no pasan el 2: se rodea por el costado).
// ry de ramp(): 0 mira a +z; este = PI/2, oeste = -PI/2. Todo se posa ANTES del PhysicsAggregate.

const lcg = (s: number) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const hidden = (m: B.Mesh) => ((m.isVisible = false), m);
const E = Math.PI / 2, W = -Math.PI / 2;
const ZA = -140, ZB = -185, ZC = -230, X0 = 132, X1 = 258;

function build(_cx: number, _cz: number) {
  const rnd = lcg(150151);
  const kraft = pbr("obsCarton", { color: "#c9a06b", rough: 0.9 }), paper = pbr("obsPapel", { color: "#e8e2d0", rough: 0.8 }), blue = pbr("obsRio", { color: "#4aa3d8", rough: 0.4 });
  const hole = pbr("obsHueco", { color: "#1b1d22", rough: 1 }), orange = M.plastic("#f97316"), wood = pbr("obsMadera", { color: "#d8a04a", rough: 0.6 });
  const invis = M.matte("#000"), deco: B.Mesh[] = [];

  // Carriles pintados (sin colisión) y conectores en las puntas
  const lane = (x0: number, x1: number, z: number) => decal("obsCarril", x1 - x0, 12, (x0 + x1) / 2, z, kraft, 0.03);
  lane(X0, X1, ZA); lane(X0, X1, ZB); lane(X0, X1, ZC);
  decal("obsEsqE", 12, 57, 252, (ZA + ZB) / 2, kraft, 0.03);
  decal("obsEsqO", 12, 57, 138, (ZB + ZC) / 2, kraft, 0.03);
  for (const z of [ZA, ZB, ZC]) for (const s of [-1, 1]) for (let x = X0 + 2; x < X1; x += 8) deco.push(box(4, 0.02, 0.35, paper, [x + 2, 0.06, z + s * 5.7])); // cinta de borde discontinua

  // Largada (verde, carril A) y meta (damero, carril C): línea pintada + dos postes de ladrillo con banderola a 5 m
  const gate = (x: number, z: number, flag: B.Material, checker: boolean) => {
    for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) deco.push(box(1, 0.02, 1, checker && (i + j) % 2 ? M.matte("#23262b") : paper, [x + j - 0.5, 0.07, z - 5.5 + i]));
    for (const s of [-1, 1]) {
      deco.push(box(1.6, 5.2, 1.6, flag, [x, 2.6, z + s * 7.2]));
      hidden(stat(box(1.6, 5.2, 1.6, invis, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [x, 2.6, z + s * 7.2]));
    }
    deco.push(box(1.2, 1.1, 14.8, flag, [x, 5.9, z]));
    bare.push({ x, z, r: 10 });
  };
  gate(140, ZA, pbr("obsVerde", { color: "#43a047", rough: 0.5 }), false);
  gate(246, ZC, pbr("obsRojo", { color: "#e53935", rough: 0.5 }), true);

  // --- Carril A: slalom de conos (dinámicos y livianos: se tumban, no frenan) y tres lomas en serie
  for (let i = 0; i < 6; i++) {
    const c = cyl(0.1, 0.8, 1.1, orange, [150 + i * 9, 0.55, ZA + (i % 2 ? 2.5 : -2.5)], undefined, 10);
    dyn(c, B.PhysicsShapeType.CYLINDER, 0.15);
    deco.push(box(0.9, 0.04, 0.9, paper, [c.position.x, 0.06, c.position.z])); // base clara: se ve de arriba aunque caiga
  }
  bare.push({ x: 175, z: ZA, r: 32 });
  for (let i = 0; i < 3; i++) ramp(wood, 204 + i * 12, ZA, E, 8, 5, 0.9, 0, 5);

  // --- Carril B: balancín, puente angosto, túnel de cartón
  // Tablón 10 x 4 x 0,2 sobre bisagra (6DoF: solo gira en X local, +-10 grados). Descansa con la entrada (-z local) apoyada en el piso; el contrapeso
  // desplazado hacia la entrada hace que el auto lo incline al pasar el centro (a partir de ~0,15 m). Cuñas de 0,2 m en ambas puntas: sin escalón.
  {
    const bx = 224, th = 0.2, len = 10, tilt = (10 * Math.PI) / 180, py = (len / 2) * Math.sin(tilt) + (th / 2) * Math.cos(tilt);
    const base = hidden(stat(box(1.6, py - 0.2, 1.6, invis, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [bx, (py - 0.2) / 2, ZB, W]));
    deco.push(box(2.4, py - 0.2, 2.4, pbr("obsLadrilloAz", { color: "#1e66d0", rough: 0.5 }), [bx, (py - 0.2) / 2, ZB]));
    const pl = box(4, th, len, wood, [bx, py, ZB]);
    pl.rotationQuaternion = B.Quaternion.FromEulerAngles(-tilt, W, 0); // entrada (-z local = este) abajo
    const agg = new B.PhysicsAggregate(pl, B.PhysicsShapeType.BOX, { mass: 0.5, friction: 0.7, restitution: 0 }, scene);
    shadows.addShadowCaster(pl); pl.receiveShadows = true;
    const Mp = 0.5, ix = (Mp / 12) * (len * len + th * th), iy = (Mp / 12) * (16 + len * len), iz = (Mp / 12) * (16 + th * th);
    agg.body.setMassProperties({ mass: Mp, inertia: new B.Vector3(ix, iy, iz), centerOfMass: new B.Vector3(0, 0, -0.25) }); // masa e inercia juntas
    agg.body.setAngularDamping(1); agg.body.setLinearDamping(0.2);
    const lim = (axis: Ax, a = 0, b = 0) => ({ axis, minLimit: a, maxLimit: b });
    const hinge = new Physics6DoFConstraint(
      { pivotA: new B.Vector3(0, py - (py - 0.2) / 2, 0), pivotB: B.Vector3.Zero(), axisA: new B.Vector3(1, 0, 0), perpAxisA: new B.Vector3(0, 1, 0), axisB: new B.Vector3(1, 0, 0), perpAxisB: new B.Vector3(0, 1, 0) },
      [lim(Ax.LINEAR_X), lim(Ax.LINEAR_Y), lim(Ax.LINEAR_Z), lim(Ax.ANGULAR_Y), lim(Ax.ANGULAR_Z), lim(Ax.ANGULAR_X, -tilt, tilt)], scene);
    base.physicsBody!.addConstraint(agg.body, hinge);
    undo.push(() => hinge.dispose());
    const wh = 0.2, wl = 1.6, ex = (len / 2) * Math.cos(tilt) + 0.05;
    ramp(wood, bx + ex + wl, ZB, W, 4, wl, wh, 0, 0); // cuña de entrada (este): sube hacia el tablón
    ramp(wood, bx - ex - wl, ZB, E, 4, wl, wh, 0, 0); // cuña de salida (oeste)
    bare.push({ x: bx, z: ZB, r: 12 });
  }
  // Puente angosto: deck de 3,2 m a 1,6 m de alto sobre un río de papel; rampas de 10 m (9 grados)
  ramp(wood, 207, ZB, W, 3.2, 10, 1.6, 12, 10);
  decal("obsRioPapel", 14, 10, 191, ZB, blue, 0.05);
  for (const s of [-1, 1]) for (let x = 187; x <= 195; x += 4) deco.push(box(0.3, 0.5, 0.3, paper, [x, 1.85, ZB + s * 1.75])); // postes de la baranda (solo visual)
  // Túnel de cartón: 14 de largo, 5 de ancho útil, 3,3 de alto
  for (const s of [-1, 1]) {
    const wall = box(14, 3.6, 0.3, kraft, [0, 0, 0]);
    stat(wall, B.PhysicsShapeType.BOX, { friction: 0.2 }, [160, 1.8, ZB + s * 2.65]);
  }
  stat(box(14, 0.3, 5.6, kraft, [0, 0, 0]), B.PhysicsShapeType.BOX, { friction: 0.2 }, [160, 3.45, ZB]);
  for (let x = 154; x <= 166; x += 3) deco.push(box(0.25, 0.12, 5.9, paper, [x, 3.66, ZB]), box(0.25, 3.6, 0.12, paper, [x, 1.8, ZB - 2.82]), box(0.25, 3.6, 0.12, paper, [x, 1.8, ZB + 2.82])); // nervaduras de cartón
  bare.push({ x: 160, z: ZB, r: 12 });

  // --- Carril C: dos saltos sobre huecos (hueco pintado negro) y mesas de aterrizaje de 1 m
  const jump = (xa: number, hgt: number, gap: number, top: number, w: number) => {
    ramp(pbr("obsDespegue", { color: "#e53935", rough: 0.55 }), xa, ZC, E, 7, 10, hgt, 0, 0);
    decal("obsHuecoP", gap, 12, xa + 10 + gap / 2, ZC, hole, 0.05);
    ramp(pbr("obsMesa", { color: "#42a5f5", rough: 0.55 }), xa + 10 + gap, ZC, E, w, 0.3, 1, top, 8);
  };
  jump(150, 2, 3, 16, 12);
  jump(205, 3, 5, 10, 12);

  // --- Decorado de juguete fuera de los carriles: ladrillos con tetones, libros, lápices (cada uno con su caja invisible; nada a menos de 8 m de un carril)
  const cols = ["#e53935", "#1e66d0", "#f2c230", "#43a047", "#fb8c00"], zones: [number, number][] = [[-165, -152], [-210, -197], [-126, -112], [-250, -244]];
  const place = () => {
    for (let t = 0; t < 30; t++) {
      const [za, zb] = zones[Math.floor(rnd() * zones.length)], x = 150 + rnd() * 90, z = za + (zb - za) * rnd();
      if (placed.every(([px, pz]) => Math.hypot(px - x, pz - z) > 9)) { placed.push([x, z]); return [x, z] as [number, number]; }
    }
    return null;
  };
  const placed: [number, number][] = [];
  for (let i = 0; i < 7; i++) { // ladrillos
    const w = 6 + Math.floor(rnd() * 2) * 2, d = 4, h = 3, p = place(); if (!p) continue;
    const m = pbr("obsBrick" + (i % cols.length), { color: cols[i % cols.length], rough: 0.5 });
    deco.push(box(w, h, d, m, [p[0], h / 2, p[1]]));
    for (let a = 0; a < w / 2; a++) for (let b = 0; b < d / 2; b++) deco.push(cyl(1.2, 1.2, 0.5, m, [p[0] - w / 2 + 1 + a * 2, h + 0.25, p[1] - d / 2 + 1 + b * 2], undefined, 8));
    hidden(stat(box(w, h, d, invis, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [p[0], h / 2, p[1]]));
  }
  for (let i = 0; i < 4; i++) { // pilas de libros
    const p = place(); if (!p) continue;
    let y = 0;
    for (let k = 0; k < 3; k++) { const h = 0.5 + rnd() * 0.3; deco.push(box(3.6 - k * 0.3, h, 2.6, pbr("obsLibro" + ((i + k) % 5), { color: cols[(i + k) % 5], rough: 0.7 }), [p[0] + (rnd() - 0.5) * 0.4, y + h / 2, p[1]], [0, (rnd() - 0.5) * 0.5, 0])); y += h; }
    hidden(stat(box(3.6, y, 2.6, invis, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [p[0], y / 2, p[1]]));
  }
  for (let i = 0; i < 4; i++) { // lápices gigantes acostados, hexagonales con punta
    const p = place(); if (!p) continue;
    const c = cols[(i + 2) % 5];
    deco.push(cyl(1.4, 1.4, 10, pbr("obsLapiz" + c, { color: c, rough: 0.5 }), [p[0], 0.7, p[1]], [0, 0, E], 6), cyl(0, 1.4, 1.6, pbr("obsMina", { color: "#e7c9a0", rough: 0.8 }), [p[0] - 5.8, 0.7, p[1]], [0, 0, E], 6), cyl(1.4, 1.4, 1, M.metal("#9aa0a8"), [p[0] + 5.5, 0.7, p[1]], [0, 0, E], 6));
    hidden(stat(box(11.6, 1.2, 1.3, invis, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [p[0], 0.6, p[1]]));
  }

  const d = merge("obsDeco", deco); d.isPickable = false; d.receiveShadows = true; shadows.addShadowCaster(d);
}

export const barrio: Barrio = { id: "obstaculos", cx: 150, cz: -150, build };
