// Gusano lunar (docs/LUNA.md, fase 3 punto 1): jefe final de la luna. Avanza enterrado (solo se ve el surco de polvo), marca con un aro
// dónde va a salir, emerge en un arco (cabeza + segmentos de chatarra plegada con luces alien) y se vuelve a hundir. Al salir y al
// hundirse main.ts deja un cráter real (deform + craterHumeante). Solo recibe daño mientras está afuera (wormOut). En la segunda barra
// va más rápido y sale gusano_fase2_seguidas veces seguidas.
import * as B from "@babylonjs/core";
import { FOLD } from "./folded";
import { pbr } from "./render";
import { box, cyl, sph, template, tor } from "./models";
import { BAL } from "./balance";
import { FX } from "./fx";
import { alt, arc, at, FOOT, onFloor, toLocal, upAt } from "./moon";
import type { Enemy } from "./enemies";

const ATK = BAL.ataques;
const SEGS = 10, GAP = 0.07; // segmentos detrás de la cabeza y su retraso en el arco (fracción de t)
const eyeMat = () => { const m = pbr("alienOjo", { color: "#a82a10", emissive: "#ff4a1a", rough: 0.3 }); m.fogEnabled = false; m.emissiveIntensity = 2; return m; }; // ojo ámbar/rojo de ref173 (mismo material que aliens.ts)

/** Cabeza (también el modelo de la ficha del bestiario): tambor de chapa con mandíbulas y boca verde. Mira a +z. */
export const wormHeadTpl = () => template("gusano", () => {
  const hull = FOLD.painted("#8a3a1e", 0.85, 83), plate = FOLD.painted("#c9b48a", 0.8, 84), br = FOLD.painted("#a8803c", 0.6, 87), bolt = FOLD.bolt();
  // Boca circular de dientes (ref173 f3 c5): disco oscuro con corona de 10 colmillos crema; los ojos son lo único emisivo
  const teeth = Array.from({ length: 10 }, (_, i) => { const a = (i * Math.PI * 2) / 10; return cyl(0.01, 0.22, 0.55, plate, [Math.sin(a) * 1.05, 1.15 + Math.cos(a) * 1.05, 1.0], [Math.PI / 2 - Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0], 5); });
  return [
    cyl(2, 2.3, 1.7, hull, [0, 1.15, 0], [Math.PI / 2, 0, 0], 8),
    box(1.5, 0.14, 1.4, plate, [0, 2.3, -0.1], [0.12, 0, 0]),
    sph(1.3, FOLD.painted("#3a0f08", 0.5, 89), [0, 1.15, 0.85], [1, 1, 0.35], 8), // boca (gaznate oxidado, no un agujero negro)
    tor(2.1, 0.16, br, [0, 1.15, 0.95], [Math.PI / 2, 0, 0], 10), // aro de bronce de la boca
    ...teeth,
    ...[-1, 1].flatMap((s) => [
      box(0.32, 0.5, 1.3, FOLD.dark(), [s * 0.75, 1.0, 1.3], [0, -s * 0.35, 0]), // mandíbulas
      sph(0.42, eyeMat(), [s * 0.8, 1.7, 1.05], undefined, 6), // ojos
      sph(0.09, bolt, [s * 0.8, 2.25, 0.5], undefined, 4), sph(0.09, bolt, [s * 0.8, 2.25, -0.7], undefined, 4), // remaches de la placa
    ]),
  ];
});
/** Segmento del cuerpo: anillo octogonal con placa dorsal, faja de luz y luces laterales. Centrado en su eje. */
const segTpl = () => template("gusanoSeg", () => {
  const hull = FOLD.painted("#8a3a1e", 0.85, 85), bolt = FOLD.bolt();
  return [
    cyl(1.8, 1.8, 1.3, hull, [0, 0, 0], [Math.PI / 2, 0, 0], 8),
    box(1.2, 0.12, 1, FOLD.painted("#c9b48a", 0.8, 86), [0, 0.92, 0], [0.15, 0, 0]),
    box(0.14, 0.5, 0.45, FOLD.bare(), [0, 1.15, -0.1]),
    tor(1.85, 0.08, FOLD.painted("#a8803c", 0.6, 87), [0, 0, 0.55], [Math.PI / 2, 0, 0], 8), // faja de bronce
    sph(0.14, eyeMat(), [0.9, 0.2, 0], undefined, 4), sph(0.14, eyeMat(), [-0.9, 0.2, 0], undefined, 4), // luces de costado
    ...[-0.4, 0, 0.4].map((x) => sph(0.08, bolt, [x, 0.95, 0.35], undefined, 4)), // remaches de la placa dorsal
  ];
});

type W = { a: B.Vector3; b: B.Vector3; t: number; left: number; parts: B.InstancedMesh[]; dust: number };
const worms = new WeakMap<Enemy, W>();
const _p = new B.Vector3(), _q = new B.Vector3(), _f = new B.Vector3();

/** ¿Está afuera? (solo ahí recibe daño, muerde y lo apuntan las armas). */
export const wormOut = (e: Enemy) => e.state === 2;
export function wormDispose(e: Enemy) { for (const m of worms.get(e)?.parts ?? []) m.dispose(); worms.delete(e); }
/** Solo dev (__luna.worm): sale ya en land. */
export function wormForce(e: Enemy, land: B.Vector3) { WORM_AI(e, 0, new B.Vector3(0, 0, 1), 99); e.state = 1; e.atk = ATK.gusano_aviso_s; e.land.copyFrom(land); }

function moveTo(e: Enemy, p: B.Vector3, dt: number) { // velocidad que lo lleva a p en este cuadro (marco local, como la IA)
  e.body.setLinearVelocity(toLocal(p.subtract(e.pos).scaleInPlace(1 / Math.max(dt, 1e-3)), e.pos));
  e.body.setAngularVelocity(B.Vector3.Zero());
}
const under = (p: B.Vector3) => onFloor(p, -ATK.gusano_hondo);

/** IA (enemies.ts think, marco local). Eventos: "worm_up" (salió en e.land) y "worm_down" (se hundió en e.land): main.ts hace el cráter. */
export function WORM_AI(e: Enemy, dt: number, to: B.Vector3, dist: number): string | null {
  let w = worms.get(e);
  if (!w) {
    w = { a: new B.Vector3(), b: new B.Vector3(), t: 0, left: 0, parts: [], dust: 0 };
    for (let i = 0; i <= SEGS; i++) { const m = (i ? segTpl() : wormHeadTpl()).createInstance("gusano" + i); m.isVisible = false; m.isPickable = false; m.rotationQuaternion = new B.Quaternion(); w.parts.push(m); }
    worms.set(e, w);
    e.node.isVisible = false; // se dibujan las partes; el nodo es el cuerpo físico (la cabeza)
    FOOT.set(e.body, -50); e.body.setGravityFactor(0); // lo mueve esta IA, también bajo el piso
    e.timer = ATK.gusano_bajo_s;
  }
  const k2 = e.enraged ? ATK.gusano_fase2_vel : 1;
  if (e.state === 2) {
    w.t += (dt / ATK.gusano_arco_s) * k2;
    const th = w.t, end = th - SEGS * GAP;
    w.parts.forEach((m, i) => {
      const ti = th - i * GAP;
      m.isVisible = ti > 0 && ti < 1;
      if (!m.isVisible) return;
      arc(w!.a, w!.b, ti, ATK.gusano_arco_alto, m.position).addInPlace(upAt(m.position, _q).scaleInPlace(0.6 * Math.sin(Math.PI * ti))); // los extremos quedan hundidos
      arc(w!.a, w!.b, Math.min(1, ti + 0.02), ATK.gusano_arco_alto, _p); arc(w!.a, w!.b, Math.max(0, ti - 0.02), ATK.gusano_arco_alto, _f);
      B.Quaternion.FromLookDirectionLHToRef(_p.subtractInPlace(_f).normalize(), upAt(m.position, _q), m.rotationQuaternion!);
      m.scaling.setAll(1 - i * 0.035);
    });
    moveTo(e, th < 1 ? arc(w.a, w.b, th, ATK.gusano_arco_alto, _p) : onFloor(w.b, -1, _p), dt); // el cuerpo físico va con la cabeza
    if (th >= 1 && th - dt / ATK.gusano_arco_s * k2 < 1) { e.land.copyFrom(w.b); return "worm_down"; }
    if (end < 1) return null;
    for (const m of w.parts) m.isVisible = false;
    if (e.enraged && --w.left > 0) { e.state = 1; e.atk = ATK.gusano_aviso_s / 2; onFloor(at(e.pos, to.x * dist, 0, to.z * dist), 0, e.land); } // sale otra vez enseguida (aviso a la mitad)
    else { e.state = 0; e.timer = ATK.gusano_bajo_s; }
    return null;
  }
  e.touchCd = Math.max(e.touchCd, 0.3); // enterrado no muerde
  if ((w.dust -= dt) <= 0) { w.dust = 0.08; FX.dust(onFloor(e.pos, 0.1, _p)); if (Math.random() < 0.3) FX.sparks(_p, 3); } // surco que avanza (solo visual)
  if (e.state === 1) {
    e.showTele(e.land, ATK.gusano_aviso_radio, Math.max(0, e.atk) / ATK.gusano_aviso_s);
    moveTo(e, under(B.Vector3.LerpToRef(e.pos, under(e.land), Math.min(1, dt * 4), _p)), dt);
    if ((e.atk -= dt) > 0) return null;
    e.showTele(null); e.state = 2; w.t = 0;
    if (!e.enraged || w.left <= 0) w.left = e.enraged ? ATK.gusano_fase2_seguidas : 1;
    const f = toLocal(e.land.subtract(e.pos), e.pos); f.y = 0; // hacia dónde venía: sigue de largo
    if (f.lengthSquared() < 0.01) f.set(to.x, 0, to.z);
    f.normalize();
    w.a.copyFrom(e.land); onFloor(at(e.land, f.x * ATK.gusano_arco_largo, 0, f.z * ATK.gusano_arco_largo), 0, w.b);
    return "worm_up";
  }
  // Enterrado: persigue al auto a gusano_hondo bajo el piso; cerca (y descansado) marca dónde sale: donde está el auto ahora
  const sp = e.def.speed * k2;
  const v = new B.Vector3(to.x * sp, B.Scalar.Clamp((-ATK.gusano_hondo - alt(e.pos)) * 4, -10, 10), to.z * sp);
  e.body.setLinearVelocity(v); e.body.setAngularVelocity(B.Vector3.Zero());
  if ((e.timer -= dt) <= 0 && dist < ATK.gusano_emerge_dist) { e.state = 1; e.atk = ATK.gusano_aviso_s; onFloor(at(e.pos, to.x * dist, 0, to.z * dist), 0, e.land); }
  return null;
}
