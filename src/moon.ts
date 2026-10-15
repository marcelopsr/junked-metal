import * as B from "@babylonjs/core";
import { cyl, rbox, sph, template } from "./models";
import { canvasTex, pbr, shadows, skyBlend, surface } from "./render";
import { rng, rngFrom } from "./rng";
import type { Climate } from "./run";
import type { Kind } from "./enemies";

// ---------- Luna: un planeta chico de verdad (esfera + gravedad radial), mapa del modo Supervivencia ----------
// R = 60: superficie 4πR² ≈ 45.200 m² (el patio de 200×200 son 40.000): la misma cantidad de mundo, pero el horizonte queda a ~40 m
// de la cámara (√(2·R·13 m)) y a 15 m/s se da un cuarto de vuelta en 6 s: la curva se ve siempre. Con R = 45 los cráteres y el anillo de
// aparición (52-72 m) daban la vuelta entera; con R = 70 la curva ya se pierde a la altura de la cámara baja.
// Todo vive en el mundo real (Havok sin gravedad): cada cuerpo dinámico cae hacia el centro y el piso es ANALÍTICO (radio = R + altura(dirección)),
// así los cráteres que se agregan en la partida (deform) cambian el piso del auto, los bichos, el spawn y las gemas con la misma función.
// Fuera de la luna (MOON.on = false) cada ayudante de abajo hace EXACTAMENTE la cuenta plana de siempre: el patio no cambia ni un bit.
export const MOON = { on: false, R: 87, g: 25 }; // R 60→87 (usuario 2026-10-12); g = la gravedad del patio (25): los saltos de jefes están calculados con ella
export const CENTER = new B.Vector3(0, -MOON.R, 0); // el polo de arriba queda en el origen: la salida es la misma del patio
export const SUN_DIR = new B.Vector3(-0.66, 0.26, -0.66).normalize(); // hacia el Sol (la luz va al revés): la salida queda en la cara iluminada
export const DARK_DIR = SUN_DIR.scale(-1).addInPlace(new B.Vector3(0.25, 0.2, 0)).normalize(); // punto de llegada de las variantes "oscuro" (igual que __luna.go)
export const EARTH_DIR = new B.Vector3(0.25, 0.42, 0.87).normalize(); // la Tierra, delante de la salida (el auto arranca mirando +z)
const Y = B.Vector3.Up();

// ---------- Superficie: lomas suaves + cráteres/montículos (fijos del mundo y los de la partida) ----------
type Dent = { d: B.Vector3; r: number; depth: number; cos: number; k: number; fade: number };
const fixed: Dent[] = [], dents: Dent[] = [];
// Rocas grandes con colisionador estático: siguen las deformaciones (remesh las reapoya y mueve su cuerpo con teleport)
type Rock = { m: B.InstancedMesh; d: B.Vector3; sz: number; body: B.PhysicsBody };
const rocks: Rock[] = [], _rk = new B.Vector3();
const seat = (k: Rock) => k.m.position.copyFrom(k.d).scaleInPlace(radiusAt(k.d) + k.sz * 0.12).addInPlace(CENTER);
export const DENT_CAP = 40; // deformaciones de la partida; pasado el tope, la más vieja se alisa en 3 s
const mkDent = (d: B.Vector3, r: number, depth: number): Dent => ({ d, r, depth, cos: Math.cos(Math.min(Math.PI, (r * 1.7) / MOON.R)), k: 1, fade: 0 });
function bump(dn: Dent, c: number) {
  if (c < dn.cos) return 0;
  const s = (MOON.R * Math.sqrt(Math.max(0, 2 - 2 * c))) / dn.r, D = dn.depth * dn.k; // s = distancia al centro / radio
  if (D > 0) { const t = (s - 1) * 3.2; return (s < 1 ? D * (s * s - 1) : 0) + 0.32 * D * Math.exp(-t * t); } // cráter: cuenco + labio (borde que pide velocidad)
  return s < 1 ? -D * (1 - s * s) ** 2 : 0; // montículo: rampa suave para saltar
}
/** Altura del piso (m sobre R) en la dirección unitaria d. */
export function heightAt(d: B.Vector3) {
  let h = 0.45 * Math.sin(d.x * 7.1 + 1.3) * Math.sin(d.z * 6.3 + 0.4) + 0.3 * Math.sin(d.y * 9.7 + d.x * 5.2); // lomas
  for (const dn of fixed) h += bump(dn, dn.d.x * d.x + dn.d.y * d.y + dn.d.z * d.z);
  for (const dn of dents) h += bump(dn, dn.d.x * d.x + dn.d.y * d.y + dn.d.z * d.z);
  return h;
}
export const radiusAt = (d: B.Vector3) => MOON.R + heightAt(d);
const _t1 = new B.Vector3(), _t2 = new B.Vector3(), _sd = new B.Vector3();
/** Normal del piso (gradiente de la altura) en la dirección unitaria d. */
export function normalAt(d: B.Vector3, out = new B.Vector3()) {
  B.Vector3.CrossToRef(d, Math.abs(d.y) < 0.9 ? Y : B.Axis.X, _t1); _t1.normalize();
  B.Vector3.CrossToRef(d, _t1, _t2);
  const e = 0.4, h0 = heightAt(d);
  _sd.copyFrom(_t1).scaleInPlace(e / MOON.R).addInPlace(d).normalize(); const g1 = (heightAt(_sd) - h0) / e;
  _sd.copyFrom(_t2).scaleInPlace(e / MOON.R).addInPlace(d).normalize(); const g2 = (heightAt(_sd) - h0) / e;
  return out.copyFrom(d).subtractInPlace(_t1.scaleInPlace(g1)).subtractInPlace(_t2.scaleInPlace(g2)).normalize();
}
const _dir = new B.Vector3();
const dirOf = (p: B.Vector3, out = _dir) => p.subtractToRef(CENTER, out).normalize();
/** Punto del piso en la dirección de p (cualquier punto: se usa su dirección desde el centro) y su normal. */
export function surfaceAt(p: B.Vector3, out = { pos: new B.Vector3(), normal: new B.Vector3() }) {
  const d = dirOf(p, new B.Vector3());
  out.pos.copyFrom(d).scaleInPlace(radiusAt(d)).addInPlace(CENTER);
  normalAt(d, out.normal);
  return out;
}
/** Hueco entre la base de algo (su origen menos foot) y el piso, y qué tan plano es el piso (ny = 1 plano). Lo usa drive() del auto. */
export function groundGap(p: B.Vector3, foot: number) {
  const d = p.subtract(CENTER), r = d.length(); d.scaleInPlace(1 / r);
  let gap = r - foot - radiusAt(d), ny = B.Vector3.Dot(normalAt(d), d);
  for (const k of rocks) { // arriba de una roca grande también es piso (su colisionador es una esfera de radio sz/2)
    p.subtractToRef(k.m.position, _rk);
    if (B.Vector3.Dot(_rk, d) <= 0) continue;
    const g = _rk.length() - k.sz * 0.5 - foot;
    if (g < gap) { gap = g; ny = 1; }
  }
  return { gap, ny };
}
/** Altura de p sobre el piso (m). */
export const alt = (p: B.Vector3) => B.Vector3.Distance(p, CENTER) - radiusAt(dirOf(p));

// ---------- Ayudantes de marco local: en el patio son la cuenta plana de siempre ----------
// Marco local de un punto: la rotación mínima que lleva el +Y del mundo a la vertical del lugar (Y local = arriba, X/Z = el plano tangente).
// ponytail: singular en el polo de abajo (0, -2R, 0): ahí el marco gira rápido; solo afecta rumbos guardados entre cuadros (embestida de Felipe)
const _q = new B.Quaternion(), _qi = new B.Quaternion(), _u = new B.Vector3();
const frame = (p: B.Vector3) => B.Quaternion.FromUnitVectorsToRef(Y, upAt(p, _u), _q);
/** Vertical del lugar (normal de la esfera, no del piso). */
export function upAt(p: B.Vector3, out = new B.Vector3()) { return MOON.on ? dirOf(p, out) : out.copyFrom(Y); }
/** Vector del mundo → marco local de p (en el patio, copia). */
export function toLocal(v: B.Vector3, p: B.Vector3, out = new B.Vector3()) {
  if (!MOON.on) return out.copyFrom(v);
  frame(p); _q.conjugateToRef(_qi);
  return v.rotateByQuaternionToRef(_qi, out);
}
/** Vector del marco local de p → mundo (en el patio, copia). */
export function toWorld(v: B.Vector3, p: B.Vector3, out = new B.Vector3()) {
  if (!MOON.on) return out.copyFrom(v);
  return v.rotateByQuaternionToRef(frame(p), out);
}
/** (x, y, z) del marco local de p como vector del mundo. Patio: new Vector3(x, y, z). */
export const W = (x: number, y: number, z: number, p: B.Vector3) => (MOON.on ? toWorld(new B.Vector3(x, y, z), p) : new B.Vector3(x, y, z));
/** Copia de v en el marco local de p sin la componente vertical (patio: v.clone() con y = 0). */
export function flatL(v: B.Vector3, p: B.Vector3) { const o = toLocal(v, p); o.y = 0; return o; }
/** Saca a v (del mundo) su componente vertical en p. Patio: v.y = 0. */
export function hflat(v: B.Vector3, p: B.Vector3) {
  if (!MOON.on) { v.y = 0; return v; }
  const u = upAt(p, _u);
  return v.subtractInPlace(u.scale(B.Vector3.Dot(v, u)));
}
/** Distancia "en planta". Patio: hypot(dx, dz). Luna: cuerda entre las dos direcciones sobre el radio R (sin la altura de cada uno). */
export function hd(a: B.Vector3, b: B.Vector3) {
  if (!MOON.on) return Math.hypot(a.x - b.x, a.z - b.z);
  const ax = a.x - CENTER.x, ay = a.y - CENTER.y, az = a.z - CENTER.z, bx = b.x - CENTER.x, by = b.y - CENTER.y, bz = b.z - CENTER.z;
  const la = Math.hypot(ax, ay, az), lb = Math.hypot(bx, by, bz);
  return MOON.R * Math.hypot(ax / la - bx / lb, ay / la - by / lb, az / la - bz / lb);
}
/** p relativo a base en el plano local de base. Patio: { x: p.x - base.x, z: p.z - base.z }. */
export function rel(p: B.Vector3, base: B.Vector3) {
  if (!MOON.on) return { x: p.x - base.x, z: p.z - base.z };
  const l = toLocal(p.subtract(base), base);
  return { x: l.x, z: l.z };
}
/** Rumbo (atan2(x, z)) de from hacia to. */
export function yawTo(from: B.Vector3, to: B.Vector3) { const r = rel(to, from); return Math.atan2(r.x, r.z); }
/** Rumbo de un vector del mundo en el marco de p. Patio: atan2(v.x, v.z). */
export function yawOf(v: B.Vector3, p: B.Vector3) { if (!MOON.on) return Math.atan2(v.x, v.z); const l = toLocal(v, p); return Math.atan2(l.x, l.z); }
/** base + (x, y, z) del marco local de base. Patio: suma directa. Luna: (x, z) se recorren sobre la esfera (mapa exponencial) y y es altura extra. */
export function at(base: B.Vector3, x: number, y: number, z: number, out = new B.Vector3()) {
  if (!MOON.on) return out.set(base.x + x, base.y + y, base.z + z);
  const c = base.subtract(CENTER), r = c.length(), d = Math.hypot(x, z);
  c.scaleInPlace(1 / r);
  if (d > 1e-6) { const t = toWorld(new B.Vector3(x / d, 0, z / d), base), a = d / r; c.scaleInPlace(Math.cos(a)).addInPlace(t.scaleInPlace(Math.sin(a))); }
  return out.copyFrom(c).scaleInPlace(r + y).addInPlace(CENTER);
}
/** Punto a h del piso bajo p. Patio: (p.x, h, p.z). */
export function onFloor(p: B.Vector3, h: number, out = new B.Vector3()) {
  if (!MOON.on) return out.set(p.x, h, p.z);
  const d = dirOf(p, new B.Vector3());
  return out.copyFrom(d).scaleInPlace(radiusAt(d) + h).addInPlace(CENTER);
}
/** Avanza pos d metros en la dirección dir (del mundo). Patio: pos += dir·d. Luna: por el círculo máximo, misma altura, y dir se transporta. */
export function advance(pos: B.Vector3, dir: B.Vector3, d: number) {
  if (!MOON.on) return pos.addInPlace(dir.scale(d));
  const c = pos.subtract(CENTER), r = c.length(); c.scaleInPlace(1 / r);
  const t = dir.subtract(c.scale(B.Vector3.Dot(dir, c))), tl = t.length();
  if (tl < 1e-6) return pos;
  t.scaleInPlace(1 / tl);
  const a = (d * tl) / r, nc = c.scale(Math.cos(a)).addInPlace(t.scale(Math.sin(a)));
  const L = dir.length(); // dir nuevo: la tangente transportada (conserva el largo de dir)
  dir.copyFrom(t.scaleInPlace(Math.cos(a)).subtractInPlace(c.scaleInPlace(Math.sin(a)))).scaleInPlace(L);
  return pos.copyFrom(nc).scaleInPlace(r).addInPlace(CENTER);
}
/** Trayectoria en arco de from a to (t 0..1) con flecha h. Patio: Lerp + sin(πt)·h en y. Luna: por la esfera (sirve para proyectiles que aterrizan). */
export function arc(from: B.Vector3, to: B.Vector3, t: number, h: number, out = new B.Vector3()) {
  if (!MOON.on) { B.Vector3.LerpToRef(from, to, t, out); out.y += Math.sin(Math.PI * t) * h; return out; }
  const a = from.subtract(CENTER), b = to.subtract(CENTER), ra = a.length(), rb = b.length();
  a.scaleInPlace(1 / ra); b.scaleInPlace(1 / rb);
  const w = Math.acos(B.Scalar.Clamp(B.Vector3.Dot(a, b), -1, 1)), s = Math.sin(w);
  const d = s < 1e-5 ? a : a.scale(Math.sin((1 - t) * w) / s).addInPlace(b.scale(Math.sin(t * w) / s));
  return out.copyFrom(d).scaleInPlace(ra + (rb - ra) * t + Math.sin(Math.PI * t) * h).addInPlace(CENTER);
}
/** Gravedad sobre una velocidad. Patio: v.y -= k. */
export function grav(v: B.Vector3, p: B.Vector3, k: number) { if (!MOON.on) v.y -= k; else v.subtractInPlace(upAt(p, _u).scaleInPlace(k)); return v; }
/** ¿p está a menos de h del piso? Patio: p.y < h. */
export const below = (p: B.Vector3, h: number) => (MOON.on ? alt(p) < h : p.y < h);
/** Vector vertical de largo k en p. Patio: new Vector3(0, k, 0). */
export const upv = (p: B.Vector3, k: number) => (MOON.on ? upAt(p).scaleInPlace(k) : new B.Vector3(0, k, 0));
/** "Altura" para comparar dos puntos cercanos. Patio: p.y. Luna: distancia al centro. */
export const rad = (p: B.Vector3) => (MOON.on ? B.Vector3.Distance(p, CENTER) : p.y);
/** Luna: la rotación Euler de m (yaw, cabeceo, rolido) pasa a leerse en el marco local de su lugar. Patio: nada. */
export function orient(m: B.AbstractMesh, p: B.Vector3 = m.position) {
  if (!MOON.on) return;
  B.Quaternion.FromEulerAnglesToRef(m.rotation.x, m.rotation.y, m.rotation.z, _qi);
  frame(p).multiplyToRef(_qi, (m.rotationQuaternion ??= new B.Quaternion()));
}
/** Cuaternión del marco local de p con un rumbo yaw (para poner algo parado en la luna ANTES de crearle el cuerpo físico). */
export const alignYaw = (p: B.Vector3, yaw: number) => frame(p).multiply(B.Quaternion.RotationAxis(Y, yaw));
/** Punto de aparición alrededor de center a distancia r (m sobre la superficie) en el rumbo a, a lift del piso. */
export function ringAt(center: B.Vector3, a: number, r: number, lift = 1) { return onFloor(at(center, Math.cos(a) * r, 0, Math.sin(a) * r), lift); }

// ---------- Física: gravedad radial y piso analítico para cada cuerpo dinámico ----------
/** Distancia del origen del cuerpo a su base (auto: medio alto; bichos: 0, su origen está en las patas; pelota: el radio). */
export const FOOT = new WeakMap<B.PhysicsBody, number>();
/** Cuerpos que ruedan (pelota gigante): no se enderezan a la vertical y en el piso giran según su velocidad (ω = n × v / radio). */
export const ROLL = new WeakSet<B.PhysicsBody>();
// Autos (uno por jugador, R7a cooperativo): cada cuerpo con su "arriba" suavizado
let carUps = new WeakMap<B.PhysicsBody, B.Vector3>();
/** El cuerpo del auto se alinea a la normal del piso (rampas, bordes de cráter); el resto, a la vertical. */
export function moonCar(b: B.PhysicsBody, up: B.Vector3 = Y) { const u = carUps.get(b); if (u) u.copyFrom(up); else carUps.set(b, up.clone()); }
let pe: B.PhysicsEngineV2, saved = new B.Vector3(0, -25, 0);
let plugin: B.HavokPlugin;
/** Lleva el cuerpo de Havok a la pose de su nodo (los cuerpos tienen disablePreStep: sin cambiar el tipo, setPhysicsBodyTransformation no hace nada). */
export function teleport(b: B.PhysicsBody) {
  const t = b.getPrestepType();
  b.setPrestepType(B.PhysicsPrestepType.TELEPORT);
  plugin.setPhysicsBodyTransformation(b, b.transformNode);
  b.setPrestepType(t);
}
const _v = new B.Vector3(), _n = new B.Vector3(), _cu = new B.Vector3(), _dq = new B.Quaternion(), _p = new B.Vector3();
/** Engancha el paso de Havok (antes de que main.ts envuelva el suyo para la cámara lenta). */
export function initMoon(scene: B.Scene) {
  pe = scene.getPhysicsEngine() as unknown as B.PhysicsEngineV2;
  const eng = pe as unknown as { _step(d: number): void }, step0 = eng._step.bind(eng);
  plugin = pe.getPhysicsPlugin() as B.HavokPlugin;
  eng._step = (d: number) => {
    if (!MOON.on) return step0(d);
    const dd = d > 0.1 ? 0.1 : d <= 0 ? 1 / 60 : d; // lo mismo que recorta PhysicsEngine._step
    const bodies = pe.getBodies();
    for (const b of bodies) {
      if (b.getMotionType() !== B.PhysicsMotionType.DYNAMIC) continue;
      const gf = b.getGravityFactor();
      if (!gf) continue;
      b.getLinearVelocityToRef(_v);
      _v.subtractInPlace(dirOf(b.transformNode.position, _u).scaleInPlace(MOON.g * gf * dd));
      b.setLinearVelocity(_v);
    }
    step0(d);
    for (const b of bodies) {
      if (b.getMotionType() !== B.PhysicsMotionType.DYNAMIC) continue;
      const node = b.transformNode, p = node.position;
      p.subtractToRef(CENTER, _u);
      const r = _u.length(); _u.scaleInPlace(1 / r);
      const gap = r - (FOOT.get(b) ?? 0) - radiusAt(_u);
      const carUp = carUps.get(b);
      if (gap < 0.05) {
        if (gap < 0) p.addInPlace(_p.copyFrom(_u).scaleInPlace(-gap)); // piso: se empuja hacia afuera
        normalAt(_u, _n);
        b.getLinearVelocityToRef(_v);
        const vn = B.Vector3.Dot(_v, _n);
        if (vn < 0) { _v.subtractInPlace(_p.copyFrom(_n).scaleInPlace(vn)); b.setLinearVelocity(_v); } // sin rebote ni roce: se pierde solo lo que iba contra el piso (drive() y la IA ponen el resto)
        if (carUp) B.Vector3.LerpToRef(carUp, _n, Math.min(1, 12 * dd), carUp).normalize();
        if (ROLL.has(b)) b.setAngularVelocity(B.Vector3.CrossToRef(_n, _v, _p).scaleInPlace(1 / (FOOT.get(b) || 1))); // rueda sin patinar
      } else if (carUp) B.Vector3.LerpToRef(carUp, _u, Math.min(1, 4 * dd), carUp).normalize();
      if (ROLL.has(b)) { teleport(b); continue; } // la pelota conserva su giro
      // Parado sobre la luna: la vertical del cuerpo va a la del lugar (auto: a la del piso); el rumbo se conserva
      const q = (node.rotationQuaternion ??= B.Quaternion.FromEulerVector(node.rotation));
      Y.rotateByQuaternionToRef(q, _cu);
      B.Quaternion.FromUnitVectorsToRef(_cu, carUp ?? _u, _dq);
      _dq.multiplyToRef(q, q); q.normalize();
      teleport(b);
    }
  };
}
/** Luna encendida: Havok sin gravedad (la pone el paso de arriba). Lo llama main.ts al largar y al limpiar la partida. */
export function setMoon(on: boolean) {
  if (on === MOON.on || !pe) { MOON.on = on && !!pe; return; }
  MOON.on = on;
  if (on) { saved.copyFrom(pe.gravity); pe.setGravity(B.Vector3.Zero()); } else pe.setGravity(saved.clone());
  if (!on) carUps = new WeakMap();
}

// ---------- Mundo visible ----------
let scene: B.Scene;
type Face = { m: B.Mesh; dir: Float32Array; pos: Float32Array; nor: Float32Array; col: Float32Array; c: B.Vector3; cos: number };
const faces: Face[] = [];
const AXES: [B.Vector3, B.Vector3, B.Vector3][] = [ // normal, u, v con u × v = normal
  [new B.Vector3(1, 0, 0), new B.Vector3(0, 1, 0), new B.Vector3(0, 0, 1)], [new B.Vector3(-1, 0, 0), new B.Vector3(0, 0, 1), new B.Vector3(0, 1, 0)],
  [new B.Vector3(0, 1, 0), new B.Vector3(0, 0, 1), new B.Vector3(1, 0, 0)], [new B.Vector3(0, -1, 0), new B.Vector3(1, 0, 0), new B.Vector3(0, 0, 1)],
  [new B.Vector3(0, 0, 1), new B.Vector3(1, 0, 0), new B.Vector3(0, 1, 0)], [new B.Vector3(0, 0, -1), new B.Vector3(0, 1, 0), new B.Vector3(1, 0, 0)],
];
// Color del regolito: gris con moteado, fondos de cráter más oscuros y labios/eyecta más claros
const shade = (x: number, y: number, z: number, h: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453, w = n - Math.floor(n);
  const lo = 0.5 + 0.5 * Math.sin(x * 23 + Math.sin(z * 17) * 2) * Math.sin(y * 19 + x * 7);
  return 0.86 + 0.06 * w + 0.1 * lo + B.Scalar.Clamp(h * 0.09, -0.24, 0.12);
};
const _vd = new B.Vector3(), _vn = new B.Vector3();
function paint(f: Face, i: number) {
  const o = i * 3;
  _vd.set(f.dir[o], f.dir[o + 1], f.dir[o + 2]);
  const h = heightAt(_vd), r = MOON.R + h;
  f.pos[o] = CENTER.x + _vd.x * r; f.pos[o + 1] = CENTER.y + _vd.y * r; f.pos[o + 2] = CENTER.z + _vd.z * r;
  normalAt(_vd, _vn); f.nor[o] = _vn.x; f.nor[o + 1] = _vn.y; f.nor[o + 2] = _vn.z;
  // Dunas: bandas suaves de claro/oscuro (ondulación fingida en el color, la geometría y la física no cambian), solo del lado del Sol
  const sunK = B.Scalar.Clamp((_vd.x * SUN_DIR.x + _vd.y * SUN_DIR.y + _vd.z * SUN_DIR.z - 0.05) * 4, 0, 1);
  const dune = 0.5 + 0.5 * Math.sin(_vd.x * 33 + _vd.z * 21 + Math.sin(_vd.y * 11 + _vd.x * 7) * 1.8), rip = Math.sin(_vd.x * 90 - _vd.z * 60 + dune * 4) * 0.5;
  const g = shade(_vd.x, _vd.y, _vd.z, h) * (1 + sunK * ((dune - 0.5) * 0.32 + rip * 0.07));
  // Manchas grandes crema/lila (mares de juguete) y fondo de cráter frío: así el suelo se despega de las rocas rojas y de la niebla durazno
  const m = 0.5 + 0.5 * Math.sin(_vd.x * 6.1 + Math.sin(_vd.z * 4.3) * 1.7) * Math.sin(_vd.y * 5.3 + _vd.z * 3.1), cool = h < -0.5 ? 1 : B.Scalar.Clamp((m - 0.45) * 3, 0, 1);
  f.col[i * 4] = g * B.Scalar.Lerp(1, 0.6, cool); f.col[i * 4 + 1] = g * B.Scalar.Lerp(0.84, 0.62, cool); f.col[i * 4 + 2] = g * B.Scalar.Lerp(0.62, 0.92, cool); f.col[i * 4 + 3] = 1;
}
/** Rehace solo los vértices al alcance de una deformación (sin reconstruir la esfera). */
function remesh(dn: Dent) {
  const a = Math.acos(dn.cos);
  for (const f of faces) {
    if (B.Vector3.Dot(f.c, dn.d) < Math.cos(Math.min(Math.PI, Math.acos(f.cos) + a))) continue;
    let hit = false;
    for (let i = 0, n = f.dir.length / 3; i < n; i++) if (f.dir[i * 3] * dn.d.x + f.dir[i * 3 + 1] * dn.d.y + f.dir[i * 3 + 2] * dn.d.z >= dn.cos) { paint(f, i); hit = true; }
    if (!hit) continue;
    // ponytail: sube el buffer entero de la cara (~5.000 vértices) por deformación; techo: updateDirectly con el rango tocado si hay muchas por segundo
    f.m.updateVerticesData(B.VertexBuffer.PositionKind, f.pos); f.m.updateVerticesData(B.VertexBuffer.NormalKind, f.nor); f.m.updateVerticesData(B.VertexBuffer.ColorKind, f.col);
    f.m.refreshBoundingInfo();
  }
  for (const k of rocks) if (B.Vector3.Dot(k.d, dn.d) >= dn.cos) { seat(k); teleport(k.body); }
}
/** Deforma la luna en el punto p: cráter (depth > 0) o montículo (depth < 0) de radio r (m). Permanente en la partida (tope DENT_CAP). */
export function deform(p: B.Vector3, r: number, depth: number) {
  const dn = mkDent(dirOf(p, new B.Vector3()), r, depth);
  dents.push(dn);
  const live = dents.filter((x) => !x.fade);
  if (live.length > DENT_CAP) live[0].fade = 3;
  remesh(dn);
  return dn;
}
/** Partida nueva: la luna vuelve a como la armó el mundo. */
export function moonReset() { const old = dents.splice(0); for (const dn of old) remesh(dn); }

let groundTex: B.Texture | undefined; // la textura del suelo se dibuja una sola vez (pbr() guarda el material por nombre)
const neon: B.Mesh[] = []; let neonK = 1;
let curbW: B.Material | null = null, fillL: B.PointLight | null = null; // bordillo blanco con emisivo tenue y luz fría de relleno sobre el auto (solo de noche)
let stars: B.Mesh, shoot: B.LinesMesh, shootT = 4, shootLife = 0;
const shootA = new B.Vector3(), shootB = new B.Vector3();
let asphalt: B.Texture | undefined, soilTex: B.BaseTexture | null = null, wasNight = false;
let earth: B.Mesh, city: B.Mesh, groundM: B.PBRMaterial;
/** Arma la luna (lo fijo, con la semilla del mundo): esfera de 6 caras, cráteres, rocas, estrellas, Tierra y Sol. */
export function moonBuild(s: B.Scene, low: boolean) {
  scene = s;
  fixed.length = 0; dents.length = 0; faces.length = 0; rocks.length = 0;
  // Cráteres fijos: ninguno a menos de 16 m de la salida; grandes pocos, chicos muchos
  for (let i = 0; i < 86; i++) { // 72→86 y 12 grandes: +20 % con la luna de R 72
    const d = new B.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize(), big = i < 12;
    const r = big ? 9 + rng() * 7 : 2.5 + rng() * 4.5, dep = r * (big ? 0.22 : 0.3) * (0.7 + rng() * 0.5);
    if (MOON.R * Math.acos(d.y) < 16 + r) continue;
    fixed.push(mkDent(d, r, dep));
  }
  // Suelo: textura de regolito (gris con granos) + mapa de detalle de tierra; el color grande lo ponen los vértices
  const N = low ? 52 : 76, rep = 10;
  asphalt ??= new B.Texture("./textures/r53-asfalto-mojado.webp", scene); asphalt.wrapU = asphalt.wrapV = B.Texture.WRAP_ADDRESSMODE; asphalt.uScale = asphalt.vScale = 18;
  const mat = groundM = surface(pbr("moonGround", { color: "#ffffff", rough: 0.85, tex: groundTex ??= canvasTex(256, (c, z) => {
    c.fillStyle = "#d9985e"; c.fillRect(0, 0, z, z);
    for (let i = 0; i < 9000; i++) { c.fillStyle = ["#c98550", "#e6b27a", "#b4683c", "#d99a62"][i % 4]; c.globalAlpha = 0.18 + Math.random() * 0.3; c.fillRect(Math.random() * z, Math.random() * z, 1 + Math.random() * 3, 1 + Math.random() * 3); }
    for (let i = 0; i < 40; i++) { const x = Math.random() * z, y = Math.random() * z, r = 2 + Math.random() * 7; c.globalAlpha = 0.25; c.strokeStyle = "#b9824a"; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); } // micro-cráteres
    for (let i = 0; i < 260; i++) { const x = Math.random() * z, y = Math.random() * z, r = 1 + Math.random() * 3.2; c.globalAlpha = 0.1 + Math.random() * 0.1; c.fillStyle = i % 3 ? "#9a5a34" : "#e6b27a"; c.beginPath(); c.ellipse(x, y, r * 1.3, r, Math.random() * 3, 0, 7); c.fill(); } // grumos y piedritas: poco contraste
    for (let i = 0; i < 6; i++) { const x = Math.random() * z, y = Math.random() * z; c.globalAlpha = 0.09; c.fillStyle = "#a8743f"; for (let k = 0; k < 6; k++) { c.beginPath(); c.ellipse(x + k * 5, y + (k % 2) * 3, 1.6, 2.6, 0.4, 0, 7); c.fill(); } } // huellas: hileras de hoyitos
    c.globalAlpha = 1;
  }, rep) }), "soil", rep * 6, 0.8);
  for (const [n, u, v] of AXES) {
    const nv = (N + 1) * (N + 1), dir = new Float32Array(nv * 3), uvs = new Float32Array(nv * 2), idx: number[] = [];
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const a = (2 * i) / N - 1, b = (2 * j) / N - 1, k = j * (N + 1) + i;
      _vd.copyFrom(n).addInPlace(u.scale(Math.tan(a * Math.PI / 4))).addInPlace(v.scale(Math.tan(b * Math.PI / 4))).normalize(); // cubo "equiangular": celdas parejas
      dir[k * 3] = _vd.x; dir[k * 3 + 1] = _vd.y; dir[k * 3 + 2] = _vd.z;
      uvs[k * 2] = i / N; uvs[k * 2 + 1] = j / N;
      if (i < N && j < N) { const d = k + N + 1; idx.push(k, k + 1, d + 1, k, d + 1, d); }
    }
    const f: Face = { m: new B.Mesh("moon", scene), dir, pos: new Float32Array(nv * 3), nor: new Float32Array(nv * 3), col: new Float32Array(nv * 4), c: n.clone(), cos: Math.cos(Math.PI / 4 * 1.42) };
    for (let i = 0; i < nv; i++) paint(f, i);
    // El frente de Babylon es el lado hacia donde apunta ComputeNormals: si da hacia adentro, se invierte el orden
    const test: number[] = []; B.VertexData.ComputeNormals(f.pos, idx.slice(0, 3), test);
    const o = idx[0] * 3;
    if (test[o] * f.dir[o] + test[o + 1] * f.dir[o + 1] + test[o + 2] * f.dir[o + 2] < 0) for (let t = 0; t < idx.length; t += 3) { const x = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = x; }
    const vd = new B.VertexData();
    Object.assign(vd, { positions: f.pos, normals: f.nor, colors: f.col, uvs, indices: idx });
    vd.applyToMesh(f.m, true);
    f.m.material = mat; f.m.receiveShadows = true; f.m.isPickable = false;
    faces.push(f);
  }
  // Rocas: unas grandes con colisionador (estático, pose antes del cuerpo) y muchas piedritas (thin instances, solo visuales)
  const rockM = pbr("moonRock", { color: "#c4553a", rough: 0.7 });
  // Mesetas y hoodoos de juguete en estratos naranja / rojo óxido / crema (las láminas, panel DESIERTO); mismo colisionador esférico de siempre
  const [sO, sR, sC] = [pbr("moonStrO", { color: "#D17844", rough: 0.8 }), pbr("moonStrR", { color: "#B5532E", rough: 0.8 }), pbr("moonStrC", { color: "#EEA86A", rough: 0.8 })];
  const rockTpls = [
    template("moonMesa", () => [cyl(0.78, 1.1, 0.34, sR, [0, -0.4, 0]), cyl(0.82, 0.82, 0.26, sC, [0, -0.1, 0]), rbox(0.9, 0.3, 0.9, 0.08, sO, [0, 0.18, 0]), cyl(0.7, 0.74, 0.2, sR, [0, 0.43, 0]), cyl(0.66, 0.66, 0.12, sC, [0, 0.59, 0])]),
    template("moonHoodoo", () => [cyl(0.5, 0.95, 0.3, sR, [0, -0.4, 0]), cyl(0.42, 0.42, 0.3, sC, [0, -0.1, 0]), cyl(0.36, 0.4, 0.28, sO, [0, 0.19, 0]), cyl(0.3, 0.34, 0.24, sR, [0, 0.45, 0]), rbox(0.62, 0.2, 0.62, 0.07, sC, [0, 0.67, 0]), rbox(0.5, 0.1, 0.5, 0.04, sO, [0, 0.82, 0])]),
    template("moonButte", () => [cyl(0.7, 1.15, 0.3, sO, [0, -0.42, 0]), cyl(0.95, 0.95, 0.24, sC, [0, -0.15, 0]), cyl(0.72, 0.8, 0.3, sR, [0, 0.12, 0]), cyl(0.5, 0.58, 0.24, sO, [0, 0.39, 0]), cyl(0.42, 0.42, 0.1, sC, [0, 0.56, 0])]),
  ];
  const rockTpl = rockTpls[0];
  for (let i = 0; i < 84; i++) {
    const d = new B.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize(), sz = 1.6 + rng() * 2.6, yaw = rng() * 6.3;
    if (MOON.R * Math.acos(d.y) < 14 || heightAt(d) < -0.6) continue;
    const k: Rock = { m: rockTpls[i % 3].createInstance("roca"), d, sz, body: null! }, m = k.m;
    seat(k);
    m.scaling.setAll(sz);
    m.rotationQuaternion = B.Quaternion.FromUnitVectorsToRef(Y, d, new B.Quaternion()).multiply(B.Quaternion.RotationAxis(Y, yaw));
    k.body = new B.PhysicsAggregate(m, B.PhysicsShapeType.SPHERE, { mass: 0, radius: sz * 0.5, friction: 0.5 }, scene).body;
    rocks.push(k);
    m.receiveShadows = true;
  }
  // Mesetas de escenografía cerca de la salida (semilla propia): el desierto se ve desde el primer cuadro
  const hr = rngFrom(0x3e5a);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 6.28 + hr() * 0.5, w = (22 + hr() * 26) / MOON.R, d = new B.Vector3(Math.sin(w) * Math.cos(a), Math.cos(w), Math.sin(w) * Math.sin(a)), sz = 3 + hr() * 3, yaw = hr() * 6.3;
    if (heightAt(d) < -0.6) continue;
    const k: Rock = { m: rockTpls[i % 3].createInstance("roca"), d, sz, body: null! }, m = k.m;
    seat(k); m.scaling.setAll(sz);
    m.rotationQuaternion = B.Quaternion.FromUnitVectorsToRef(Y, d, new B.Quaternion()).multiply(B.Quaternion.RotationAxis(Y, yaw));
    k.body = new B.PhysicsAggregate(m, B.PhysicsShapeType.SPHERE, { mass: 0, radius: sz * 0.5, friction: 0.5 }, scene).body;
    rocks.push(k); m.receiveShadows = true;
  }
  // Decoración del desierto con semilla propia (no gasta rng() de la partida): cactus de juguete y bordillos rojo y blanco desde la salida
  const dr = rngFrom(0xcac705), sol = (d: B.Vector3, up: number, yaw: number, s = 1) => B.Matrix.ComposeToRef(new B.Vector3(s, s, s), B.Quaternion.FromUnitVectorsToRef(Y, d, new B.Quaternion()).multiply(B.Quaternion.RotationAxis(Y, yaw)), d.scale(radiusAt(d) + up * s).addInPlace(CENTER), new B.Matrix());
  const grn = pbr("moonCactus", { color: "#3f9a4a", rough: 0.75 });
  const cactus = template("moonCactus", () => [cyl(0.24, 0.3, 1.2, grn, [0, 0.6, 0]), sph(0.24, grn, [0, 1.2, 0], undefined, 4), cyl(0.14, 0.14, 0.36, grn, [0.3, 0.55, 0], [0, 0, Math.PI / 2]), cyl(0.12, 0.14, 0.5, grn, [0.46, 0.78, 0]), sph(0.12, grn, [0.46, 1.03, 0], undefined, 4), cyl(0.14, 0.14, 0.3, grn, [-0.27, 0.8, 0], [0, 0, Math.PI / 2]), cyl(0.12, 0.14, 0.42, grn, [-0.42, 0.99, 0]), sph(0.12, grn, [-0.42, 1.2, 0], undefined, 4)]);
  for (let i = 0, n = 0; n < 16 && i < 200; i++) {
    const near = n < 9, a = dr() * 6.3, w = (near ? 14 + dr() * 28 : 0) / MOON.R; // los primeros 9 cerca de la salida: se ven desde el arranque
    const d = near ? new B.Vector3(Math.sin(w) * Math.cos(a), Math.cos(w), Math.sin(w) * Math.sin(a)) : new B.Vector3(dr() * 2 - 1, dr() * 2 - 1, dr() * 2 - 1).normalize(), sc = 1.1 + dr() * 0.9, yaw = dr() * 6.3;
    if (MOON.R * Math.acos(d.y) < 12 || heightAt(d) < -0.6) continue;
    const m = cactus.createInstance("cactus"); m.isPickable = false; m.receiveShadows = true; n++;
    sol(d, 0, yaw, sc).decompose(m.scaling, (m.rotationQuaternion = new B.Quaternion()), m.position);
  }
  const kR = pbr("moonCurbR", { color: "#d8362b", rough: 0.6 }), kW = pbr("moonCurbW", { color: "#f4efe6", rough: 0.6, emissive: "#000000" }); curbW = kW;
  const curb = template("moonCurb", () => [rbox(0.6, 0.2, 0.9, 0.05, kR, [0, 0.1, -0.45]), rbox(0.6, 0.2, 0.9, 0.05, kW, [0, 0.1, 0.45])]);
  for (const sx of [-6, 6]) for (let j = 0; j < 12; j++) { // dos hileras paralelas a la ruta inicial (+z), siguiendo la curva
    const d = new B.Vector3(sx / MOON.R, 1, (4 + j * 1.8) / MOON.R).normalize(), m = curb.createInstance("bordillo");
    m.isPickable = false; m.receiveShadows = true;
    sol(d, 0, 0).decompose(m.scaling, (m.rotationQuaternion = new B.Quaternion()), m.position);
  }
  // Neón: postes-cartel emisivos (instancias fusionadas, una malla por color); el GlowLayer los hace brillar. Solo de noche (moonTick).
  neon.length = 0;
  const nr = rngFrom(0x6e30); // semilla fija propia: capturas comparables sin gastar el rng() de la partida
  for (const [col, n] of [["#ff2bd6", 1], ["#19e6ff", 2], ["#ff2a2a", 3]] as const) {
    const m = B.MeshBuilder.CreateBox("moonNeon", { width: 0.3, height: 3, depth: 0.3 }, scene), mm = pbr("moonNeon" + col, { color: col, rough: 0.4, emissive: col });
    mm.fogEnabled = false; m.material = mm; m.isPickable = false;
    const nb = low ? 8 : 18, nm = new Float32Array(nb * 16);
    for (let i = 0; i < nb; i++) {
      const d = new B.Vector3(nr() * 2 - 1, nr() * 2 - 1, nr() * 2 - 1).normalize();
      if (MOON.R * Math.acos(d.y) < 32 || heightAt(d) < -0.6) { d.set(Math.sin(i * 12.9 + n), 0.35 + (i % 5) * 0.12, Math.cos(i * 7.7 + n)).normalize(); } // cerca de la salida no hay carteles
      const q = B.Quaternion.FromUnitVectorsToRef(Y, d, new B.Quaternion()).multiply(B.Quaternion.RotationAxis(Y, nr() * 6.3));
      const sy = 0.7 + nr() * 0.6; // 2,1-3,9 m de alto, poste de 0,3 m
      B.Matrix.ComposeToRef(new B.Vector3(1, sy, 1), q, d.scale(radiusAt(d) + 1.5 * sy - 0.1).addInPlace(CENTER), B.Matrix.Identity()).copyToArray(nm, i * 16);
    }
    m.thinInstanceSetBuffer("matrix", nm, 16, true); m.thinInstanceRefreshBoundingInfo(); m.alwaysSelectAsActiveMesh = true;
    neon.push(m);
  }
  const peb = B.MeshBuilder.CreatePolyhedron("moonPebble", { type: 3, sizeX: 0.46, sizeY: 0.22, sizeZ: 0.38 }, scene); // icosaedro achatado: 20 triángulos por piedrita
  peb.material = pbr("moonPebbleSand", { color: "#c98e5a", rough: 0.9 }); // arena: poco contraste con el suelo
  const np = low ? 900 : 2200, mats = new Float32Array(np * 16), q = new B.Quaternion(), mx = new B.Matrix(), sc = new B.Vector3(), pp = new B.Vector3();
  for (let i = 0; i < np; i++) {
    const d = new B.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize(), s = 0.4 + Math.random() ** 2 * 1.0; // tope 1,4: sin colisión, más grandes engañan como obstáculos: escala de juguete junto al auto; sin colisión, siguen bajas (alto ≤ 0,5 m)
    B.Quaternion.FromUnitVectorsToRef(Y, d, q).multiplyInPlace(B.Quaternion.RotationAxis(Y, Math.random() * 6.3));
    pp.copyFrom(d).scaleInPlace(radiusAt(d) + s * 0.1).addInPlace(CENTER); sc.setAll(s);
    B.Matrix.ComposeToRef(sc, q, pp, mx); mx.copyToArray(mats, i * 16);
  }
  peb.thinInstanceSetBuffer("matrix", mats, 16, true); peb.thinInstanceRefreshBoundingInfo(); peb.isPickable = false; peb.receiveShadows = true; // chicas: sin sombra propia
  // Relieve del suelo (ref31b/ref77): piedritas facetadas, matas secas y rocas rojas facetadas. Semilla propia; sin colisión salvo las rocas grandes
  const gr = rngFrom(0x5a9d1e), poly = (name: string, type: number, x: number, y: number, z: number, mat: B.Material) => { const p = B.MeshBuilder.CreatePolyhedron(name, { type, sizeX: x, sizeY: y, sizeZ: z }, scene); p.material = mat; return p; };
  const ground = (near: number) => { // near: fracción cerca de la salida (6-45 m); el resto, repartido por toda la luna
    for (;;) {
      const d = gr() < near ? ((w, a) => new B.Vector3(Math.sin(w) * Math.cos(a), Math.cos(w), Math.sin(w) * Math.sin(a)))((6 + gr() * 39) / MOON.R, gr() * 6.3) : new B.Vector3(gr() * 2 - 1, gr() * 2 - 1, gr() * 2 - 1).normalize();
      if (MOON.R * Math.acos(d.y) >= 6 && heightAt(d) > -0.6) return d;
    }
  };
  const thin = (m: B.Mesh, n: number, near: number, size: (i: number) => B.Vector3, lift: number) => {
    const buf = new Float32Array(n * 16), qq = new B.Quaternion(), p3 = new B.Vector3();
    for (let i = 0; i < n; i++) {
      const d = ground(near), s = size(i);
      B.Quaternion.FromUnitVectorsToRef(Y, d, qq).multiplyInPlace(B.Quaternion.RotationAxis(Y, gr() * 6.3));
      B.Matrix.ComposeToRef(s, qq, p3.copyFrom(d).scaleInPlace(radiusAt(d) + s.y * lift).addInPlace(CENTER), new B.Matrix()).copyToArray(buf, i * 16);
    }
    m.thinInstanceSetBuffer("matrix", buf, 16, true); m.thinInstanceRefreshBoundingInfo(); m.alwaysSelectAsActiveMesh = true; m.isPickable = false; m.receiveShadows = true;
  };
  for (const [c, n] of [["#9a5a34", 280], ["#c98550", 300], ["#7a4a2e", 200]] as const) {
    const stone = poly("moonStone" + c, 3, 0.5, 0.32, 0.42, pbr("moonStone" + c, { color: c, rough: 0.9 })); // 0,1-0,5 m de tamaño
    thin(stone, low ? n >> 1 : n, 0.6, () => { const s = 0.2 + gr() ** 2 * 0.9; return new B.Vector3(s * (0.8 + gr() * 0.5), s * (0.6 + gr() * 0.5), s * (0.8 + gr() * 0.5)); }, 0.1);
  }
  { // Variedad de suelo del lado iluminado: rocas oscuras (siluetas) y cráteres de sombra con degradé suave. Misma semilla gr de arriba; sin colisión (planos o muy bajos). ponytail: techo ~300 instancias; cráteres solo cerca de la salida
    const dark = poly("moonDarkRock", 2, 0.5, 0.36, 0.45, pbr("moonDarkRock", { color: "#3a1f14", rough: 0.9 }));
    thin(dark, low ? 60 : 130, 0.85, () => { const s = 0.5 + gr() ** 2 * 1.3; return new B.Vector3(s * (0.8 + gr() * 0.5), s * (0.6 + gr() * 0.6), s * (0.8 + gr() * 0.5)); }, 0.1);
    const cm = (scene.getMaterialByName("moonCraterMat") as B.StandardMaterial | null) ?? new B.StandardMaterial("moonCraterMat", scene);
    cm.opacityTexture?.dispose(); // el material se reusa entre armados: libera el degradé anterior
    const ct = new B.DynamicTexture("moonCraterTex", 64, scene, false), cc = ct.getContext() as unknown as CanvasRenderingContext2D, cg = cc.createRadialGradient(32, 32, 0, 32, 32, 32);
    cg.addColorStop(0, "rgba(255,255,255,0.8)"); cg.addColorStop(0.7, "rgba(255,255,255,0.55)"); cg.addColorStop(0.88, "rgba(255,255,255,0.1)"); cg.addColorStop(1, "rgba(255,255,255,0)"); cc.fillStyle = cg; cc.fillRect(0, 0, 64, 64); ct.update(); ct.hasAlpha = true;
    cm.opacityTexture = ct; cm.diffuseColor = new B.Color3(0.16, 0.07, 0.04); cm.specularColor = B.Color3.Black(); cm.fogEnabled = true; cm.backFaceCulling = false; cm.zOffset = -2;
    const crater = B.MeshBuilder.CreateGround("moonCrater", { width: 2, height: 2 }, scene); crater.material = cm;
    thin(crater, low ? 14 : 30, 1, () => { const s = 2.5 + gr() * 4; return new B.Vector3(s, 1, s * (0.7 + gr() * 0.3)); }, 0.03);
  }
  for (const [c, n] of [["#a8954a", 70], ["#7d6b35", 55]] as const) { // mata seca: 4 hojas finas abiertas en abanico
    const mat = pbr("moonScrub" + c, { color: c, rough: 0.9 }), leaves = [0, 1, 2, 3].map((k) => { const l = poly("hoja", 1, 0.03, 0.22, 0.03, mat); l.scaling.set(1, 1, 1); l.position.set(Math.cos(k * 1.57) * 0.1, 0.2, Math.sin(k * 1.57) * 0.1); l.rotation.set(Math.sin(k * 1.57) * 0.5, 0, -Math.cos(k * 1.57) * 0.5); return l; });
    const t = B.Mesh.MergeMeshes(leaves, true, true)!; t.name = "moonScrub" + c; t.material = mat;
    thin(t, low ? n >> 1 : n, 0.5, () => { const s = 0.8 + gr() * 1.0; return new B.Vector3(s, s * (0.8 + gr() * 0.6), s); }, 0);
  }
  const bigMat = pbr("moonBigRock", { color: "#b5452f", rough: 0.75 });
  const bigTpl = [template("moonFacetA", () => [poly("fa", 2, 0.55, 0.42, 0.5, bigMat)]), template("moonFacetB", () => [poly("fb", 1, 0.6, 0.5, 0.55, bigMat)])];
  for (let i = 0; i < 8; i++) { // 1-3 de tamaño, con el mismo colisionador esférico que las mesetas
    const d = ground(0.6), sz = (1 + gr() * 2) * 1.6, k: Rock = { m: bigTpl[i % 2].createInstance("rocaF"), d, sz, body: null! }, m = k.m;
    seat(k); m.scaling.set(sz, sz * 0.9, sz);
    m.rotationQuaternion = B.Quaternion.FromUnitVectorsToRef(Y, d, new B.Quaternion()).multiply(B.Quaternion.RotationAxis(Y, gr() * 6.3));
    k.body = new B.PhysicsAggregate(m, B.PhysicsShapeType.SPHERE, { mass: 0, radius: sz * 0.5, friction: 0.5 }, scene).body;
    rocks.push(k); m.receiveShadows = true;
  }
  // Kit neón del lado oscuro (ref147/ref52/ref33b): neumáticos en hilera, bloques, chevrons, arcos, torres de luz y contenedores, solo en el hemisferio sin Sol
  // y alrededor del punto de llegada de las variantes "oscuro" (encore.ts). Semilla propia (no gasta rng()); sin colisión, como los cactus.
  // ponytail: decorativo sin colisionador; si hace falta chocar con ellos, sumar un SPHERE estático como en las mesetas.
  const kr = rngFrom(0x4e0a1c), glowM = (c: string) => { const m = pbr("moonKit" + c, { color: c, rough: 0.4, emissive: c }); m.fogEnabled = false; return m; };
  const kk = (c: string, r = 0.7, metal = 0) => pbr("moonKit" + c + r, { color: c, rough: r, metal });
  const [gM, gC, gY] = [glowM("#ff2fb4"), glowM("#20e0ff"), glowM("#ffd23a")], steel = kk("#3c4048", 0.55, 0.4), conc = kk("#4a4d56", 0.85), tire = kk("#16181d", 0.8);
  const hazY = kk("#e0a91c", 0.7), hazK = kk("#181a1e", 0.7), red = kk("#d8362b", 0.6), white = kk("#e9e6e0", 0.6);
  const gl = (w: number, h: number, d: number, m: B.Material, pos: [number, number, number], rot?: [number, number, number]) => rbox(w, h, d, 0.02, m, pos, rot);
  const chev = (x: number, m: B.Material) => [gl(0.7, 0.17, 0.05, m, [x, 0.24, 0.1], [0, 0, -0.85]), gl(0.7, 0.17, 0.05, m, [x, -0.24, 0.1], [0, 0, 0.85])];
  const kit = {
    tires: template("kitTires", () => [rbox(5.4, 0.3, 1.5, 0.06, conc, [0, 0.15, 0]), gl(5, 0.06, 0.08, gM, [0, 0.12, 0.78]), gl(5, 0.06, 0.08, gC, [0, 0.12, -0.78]),
      ...[0, 1, 2, 3].flatMap((i) => [0, 1, 2].map((k) => cyl(0.95, 0.95, 0.4, tire, [-1.9 + i * 1.27, 0.5 + k * 0.4, 0]))), ...[0, 1, 2, 3].map((i) => cyl(0.55, 0.55, 0.04, i % 2 ? gC : gM, [-1.9 + i * 1.27, 1.72, 0])), gl(0.22, 0.22, 0.22, gM, [2.5, 0.41, 0.6])]),
    jerseyR: template("kitJerseyR", () => [0, 1, 2, 3].map((i) => rbox(1.15, 0.75, 0.5, 0.07, i % 2 ? white : red, [-1.8 + i * 1.2, 0.38, 0])).concat([gl(4.6, 0.05, 0.05, gC, [0, 0.8, 0.27]), gl(0.2, 0.2, 0.2, gM, [2.3, 0.85, 0])])),
    jerseyY: template("kitJerseyY", () => [0, 1, 2, 3, 4, 5].map((i) => rbox(0.78, 0.75, 0.5, 0.07, i % 2 ? hazK : hazY, [-2 + i * 0.8, 0.38, 0])).concat([gl(0.2, 0.2, 0.2, gC, [-2.2, 0.85, 0])])),
    chevron: template("kitChevron", () => [rbox(0.22, 2.1, 0.22, 0.04, steel, [-1.5, 1.05, 0]), rbox(0.22, 2.1, 0.22, 0.04, steel, [1.5, 1.05, 0]), rbox(3.2, 1.35, 0.14, 0.05, steel, [0, 1.55, 0]), gl(3.0, 0.05, 0.03, gM, [0, 2.2, 0.09]), gl(3.0, 0.05, 0.03, gM, [0, 0.9, 0.09]),
      ...chev(-0.8, gC).map((m) => { m.position.y += 1.55; return m; }), ...chev(0, gC).map((m) => { m.position.y += 1.55; return m; }), ...chev(0.8, gM).map((m) => { m.position.y += 1.55; return m; }),
      rbox(1.3, 0.75, 0.9, 0.07, hazY, [-1.3, 0.38, 0]), rbox(1.3, 0.75, 0.9, 0.07, hazK, [1.3, 0.38, 0])]),
    arch: template("kitArch", () => [rbox(0.6, 3.6, 0.6, 0.06, steel, [-2.6, 1.8, 0]), rbox(0.6, 3.6, 0.6, 0.06, steel, [2.6, 1.8, 0]), rbox(6.0, 0.6, 0.6, 0.06, steel, [0, 3.7, 0]),
      gl(5, 0.14, 0.14, gM, [0, 3.7, 0.34]), gl(5, 0.14, 0.14, gM, [0, 3.7, -0.34]), gl(0.1, 3.0, 0.1, gM, [-2.25, 1.9, 0.2]), gl(0.1, 3.0, 0.1, gM, [2.25, 1.9, 0.2]), gl(0.1, 3.0, 0.1, gM, [-2.25, 1.9, -0.2]), gl(0.1, 3.0, 0.1, gM, [2.25, 1.9, -0.2]),
      rbox(1.2, 0.7, 1.0, 0.07, hazY, [-2.6, 0.35, 0.9]), rbox(1.2, 0.7, 1.0, 0.07, hazK, [2.6, 0.35, 0.9]), gl(0.22, 0.22, 0.22, gC, [-2.6, 0.82, 0.9]), gl(0.22, 0.22, 0.22, gM, [2.6, 0.82, 0.9])]),
    tower: template("kitTower", () => [rbox(1.0, 0.8, 1.0, 0.07, steel, [0, 0.4, 0]), gl(0.5, 0.12, 0.05, gC, [0, 0.55, 0.52]), cyl(0.2, 0.3, 7, steel, [0, 4.3, 0]), rbox(2.0, 0.28, 0.7, 0.06, steel, [0, 7.9, 0]), gl(1.8, 0.1, 0.55, gC, [0, 7.72, 0]), gl(1.8, 0.06, 0.06, gM, [0, 7.4, 0.3])]),
    box: [["#2a4a8a", gM], ["#a8322e", gC], ["#c9a227", gM]].map(([c, g], i) => template("kitBox" + i, () => [rbox(4.4, 1.9, 1.9, 0.08, kk(c as string, 0.65), [0, 0.95, 0]), ...[-1.7, -0.85, 0, 0.85, 1.7].map((x) => rbox(0.1, 1.8, 2.0, 0.02, steel, [x, 0.95, 0])), gl(4.2, 0.06, 0.06, g as B.Material, [0, 1.92, 0.96])])),
    bollard: template("kitBollard", () => [rbox(0.34, 0.55, 0.34, 0.05, steel, [0, 0.28, 0]), gl(0.24, 0.24, 0.24, gC, [0, 0.67, 0])]),
  };
  const DC = DARK_DIR, dk1 = B.Vector3.Cross(DC, Y).normalize(), dk2 = B.Vector3.Cross(DC, dk1);
  const arcPos = (w: number, a: number) => { const t = w / MOON.R; return DC.scale(Math.cos(t)).addInPlace(dk1.scale(Math.cos(a) * Math.sin(t))).addInPlace(dk2.scale(Math.sin(a) * Math.sin(t))); };
  // Franjas de luz bajo arcos/chevrons y charcos oscuros brillantes (ref147/ref290: asfalto mojado que devuelve el neón); misma pose que el kit, sin colisión
  const dimM = (c: string) => { const m = pbr("moonStrip" + c, { color: "#000000", rough: 0.5, emissive: c }); m.fogEnabled = false; return m; };
  const pudM = pbr("moonPuddle", { color: "#04050a", rough: 0.05, metal: 0.2, emissive: "#c040f0" }), pudC = pbr("moonPuddleC", { color: "#04050a", rough: 0.05, metal: 0.2, emissive: "#20d0f0" });
  const poolM = pbr("moonPool", { color: "#000000", rough: 0.5, emissive: "#e4eeff" }); poolM.fogEnabled = false; // pozo de luz fría de farola
  const strip = (nm: string, c: string, w: number, d: number) => template(nm, () => [rbox(w, 0.02, d, 0.01, dimM(c), [0, 0.03, 0])]);
  const pool = template("kitPool", () => [cyl(1, 1, 0.02, poolM, [0, 0.03, 0])]), pud = template("kitPud", () => [cyl(1, 1, 0.03, pudM, [0, 0.02, 0])]), pudB = template("kitPudC", () => [cyl(1, 1, 0.03, pudC, [0, 0.02, 0])]);
  const put = (tpl: ReturnType<typeof template>, n: number, w0: number, w1: number, up = 0, extra?: (d: B.Vector3, yaw: number, up: number) => void) => {
    for (let i = 0; i < n; i++) {
      const d = arcPos(w0 + kr() * (w1 - w0), kr() * 6.3), yaw = kr() * 6.3, ht = heightAt(d);
      if (B.Vector3.Dot(d, SUN_DIR) > -0.1 || ht < -0.5 || MOON.R * Math.acos(d.y) < 14) continue; // solo lado oscuro, fuera de cráteres hondos y lejos de la salida
      const m = tpl.createInstance("kit"); m.isPickable = false; m.receiveShadows = true;
      sol(d, up, yaw).decompose(m.scaling, (m.rotationQuaternion = new B.Quaternion()), m.position);
      extra?.(d, yaw, up);
    }
  };
  const under = (tpl: ReturnType<typeof template>, sx: number, sz: number) => (d: B.Vector3, yaw: number, up: number) => { // franja + charco delante del arco/chevron
    const f = tpl.createInstance("kitStrip"); f.isPickable = false; sol(d, up, yaw).decompose(f.scaling, (f.rotationQuaternion = new B.Quaternion()), f.position);
    const p = (kr() < 0.5 ? pud : pudB).createInstance("kitPuddle"); p.isPickable = false;
    sol(d, up, yaw).decompose(p.scaling, (p.rotationQuaternion = new B.Quaternion()), p.position); p.scaling.set(sx * (1 + kr()), 1, sz * (1 + kr()));
    p.position.addInPlace(B.Vector3.TransformNormal(new B.Vector3(kr() * 2 - 1, 0, 1.8 + kr()), sol(d, up, yaw)));
  };
  const lowK = low ? 0.6 : 1;
  put(kit.tires, 8 * lowK, 11, 45); put(kit.jerseyR, 6 * lowK, 10, 45); put(kit.jerseyY, 6 * lowK, 10, 45); put(kit.chevron, 4 * lowK, 14, 50, 0, under(strip("kitStripM", "#ff30c0", 5.4, 4.2), 1.4, 0.9)); put(kit.arch, 3 * lowK, 16, 50, 0, under(strip("kitStripC", "#20e0ff", 8.4, 4.8), 1.8, 1.1)); put(kit.bollard, 30 * lowK, 9, 50); put(kit.box[0], 3 * lowK, 24, 55); // cluster cerca de la llegada
  put(kit.tires, 14 * lowK, 11, 90); put(kit.jerseyR, 12 * lowK, 10, 90); put(kit.jerseyY, 12 * lowK, 10, 90); put(kit.chevron, 9 * lowK, 14, 100, 0, under(strip("kitStripM", "#ff30c0", 5.4, 4.2), 1.4, 0.9)); put(kit.arch, 7 * lowK, 16, 100, 0, under(strip("kitStripC", "#20e0ff", 8.4, 4.8), 1.8, 1.1));
  put(pud, 40 * lowK, 9, 110); put(pudB, 30 * lowK, 9, 110); // charcos sueltos
  put(kit.tower, 9 * lowK, 22, 120, 0, (d, yaw, up) => { const f = pool.createInstance("kitPool"); f.isPickable = false; sol(d, up, yaw).decompose(f.scaling, (f.rotationQuaternion = new B.Quaternion()), f.position); f.scaling.set(5.5, 1, 5.5); }); put(kit.tower, 5 * lowK, 14, 40, 0, (d, yaw, up) => { const f = pool.createInstance("kitPool"); f.isPickable = false; sol(d, up, yaw).decompose(f.scaling, (f.rotationQuaternion = new B.Quaternion()), f.position); f.scaling.set(5.5, 1, 5.5); }); for (const b of kit.box) put(b, 5 * lowK, 24, 110); put(kit.bollard, 60 * lowK, 9, 100);
  // ---- Kit de referencia ref290 (semilla propia, sin rng()): DÍA = arco de roca pasable, toldo con mesa y cajas, huellas de rueda; NOCHE = grúa pórtico, pilas altas y túnel de contenedores.
  // Solo en su lado (día dot > 0,1; noche dot < -0,1). Colisión únicamente en pilares y paredes (cajas ocultas / esferas estáticas, con la pose puesta antes del cuerpo).
  const gp = (x: number, z: number) => new B.Vector3(x / MOON.R, 1, z / MOON.R).normalize(); // punto del suelo a x, z metros de la salida (como los bordillos)
  const yawFor = (d: B.Vector3, h: B.Vector3) => { const q = B.Quaternion.FromUnitVectorsToRef(Y, d, new B.Quaternion()); return Math.atan2(B.Vector3.Dot(h, B.Vector3.Right().applyRotationQuaternion(q)), B.Vector3.Dot(h, B.Vector3.Forward().applyRotationQuaternion(q))); };
  const spawnAt = (tpl: ReturnType<typeof template>, d: B.Vector3, yaw: number, s = 1) => { const m = tpl.createInstance("kit"); m.isPickable = false; m.receiveShadows = true; sol(d, 0, yaw, s).decompose(m.scaling, (m.rotationQuaternion = new B.Quaternion()), m.position); return m; };
  const wall = (d: B.Vector3, yaw: number, w: number, h: number, l: number, ox: number, oz: number) => { // colisionador de caja oculto, pose antes del PhysicsAggregate
    const b = B.MeshBuilder.CreateBox("kitWall", { width: w, height: h, depth: l }, scene), M = sol(d, 0, yaw);
    b.isVisible = false; b.isPickable = false; b.position = B.Vector3.TransformCoordinates(new B.Vector3(ox, h / 2, oz), M); M.decompose(undefined, (b.rotationQuaternion = new B.Quaternion()));
    new B.PhysicsAggregate(b, B.PhysicsShapeType.BOX, { mass: 0, friction: 0.5 }, scene);
  };
  const dayAt = (d: B.Vector3) => B.Vector3.Dot(d, SUN_DIR) > 0.1 && heightAt(d) > -0.5, nightAt = (d: B.Vector3) => B.Vector3.Dot(d, SUN_DIR) < -0.1 && heightAt(d) > -0.5;
  {
    const tm = pbr("moonTrack", { color: "#8a5230", rough: 1 }), track = template("moonTrack", () => [rbox(0.24, 0.03, 1.0, 0, tm, [0, 0.015, 0])]);
    const lona = pbr("moonLona", { color: "#7e8f94", rough: 0.9 }), wd = kk("#7a5230", 0.8), crY = kk("#d9a62a", 0.65), crB = kk("#2a5db0", 0.65), crR = kk("#c8402e", 0.65);
    const toldo = template("moonToldo", () => [...[-2, 2].flatMap((x) => [-1.4, 1.4].map((z) => cyl(0.12, 0.12, 2.4, wd, [x, 1.2, z]))), rbox(4.8, 0.07, 2.2, 0.03, lona, [0, 2.6, -0.98], [-0.2, 0, 0]), rbox(4.8, 0.07, 2.2, 0.03, lona, [0, 2.6, 0.98], [0.2, 0, 0]),
      rbox(2.2, 0.1, 0.9, 0.03, wd, [0, 0.9, -0.3]), ...[-1, 1].flatMap((x) => [-0.6, 0].map((z) => cyl(0.08, 0.08, 0.9, wd, [x, 0.45, z]))), rbox(0.45, 0.3, 0.4, 0.04, crR, [0.5, 1.1, -0.3]), cyl(0.28, 0.28, 0.3, crB, [-0.5, 1.1, -0.3]),
      rbox(0.7, 0.6, 0.7, 0.05, crY, [1.5, 0.3, 0.4]), rbox(0.6, 0.5, 0.6, 0.05, crB, [-1.5, 0.25, 0.5]), rbox(0.5, 0.5, 0.5, 0.05, crY, [-1.5, 0.75, 0.5]), cyl(0.5, 0.5, 0.8, crB, [-1.0, 0.4, -1.1]), rbox(0.6, 0.6, 0.6, 0.05, crR, [1.2, 0.3, -1.1])]);
    const pil = template("moonPillar", () => [rbox(1.0, 0.5, 0.95, 0.08, sR, [0, 0.13, 0]), rbox(0.9, 0.4, 0.9, 0.08, sC, [0, 0.58, 0]), rbox(0.95, 0.5, 0.95, 0.08, sO, [0, 1.03, 0])]);
    const lintel = template("moonLintel", () => [rbox(4.2, 0.55, 1.0, 0.1, sO, [0, 0, 0]), rbox(3.6, 0.3, 0.9, 0.08, sC, [0, 0.4, 0]), rbox(2.6, 0.3, 0.8, 0.08, sR, [0, 0.66, 0]), rbox(0.7, 0.4, 0.9, 0.08, sR, [-1.75, -0.45, 0], [0, 0, 0.5]), rbox(0.7, 0.4, 0.9, 0.08, sR, [1.75, -0.45, 0], [0, 0, -0.5])]);
    // huellas de rueda: dos hileras de rayas que serpentean desde la salida, bajo el arco y hasta el toldo
    for (let z = 3; z < 50; z += 1.5) for (const sx of [-0.7, 0.7]) {
      const cx = 2.5 * Math.sin(z / 10), d = gp(cx + sx, z);
      if (dayAt(d)) spawnAt(track, d, Math.atan(0.25 * Math.cos(z / 10)));
    }
    const ad = gp(0, 48), ay = 0, sz = 2.4; // arco de roca: dos pilares con colisión y un dintel sin ella; el auto pasa por el hueco de ~4,5 m
    if (dayAt(ad)) {
      for (const sx of [-1.45, 1.45]) {
        const d = gp(sx * sz, 48), k: Rock = { m: pil.createInstance("pilar"), d, sz, body: null! }, m = k.m;
        seat(k); m.scaling.setAll(sz); m.rotationQuaternion = B.Quaternion.FromUnitVectorsToRef(Y, d, new B.Quaternion()).multiply(B.Quaternion.RotationAxis(Y, ay));
        k.body = new B.PhysicsAggregate(m, B.PhysicsShapeType.SPHERE, { mass: 0, radius: sz * 0.5, friction: 0.5 }, scene).body; rocks.push(k); m.receiveShadows = true; m.isPickable = false;
      }
      const m = lintel.createInstance("dintel"); m.isPickable = false; m.receiveShadows = true; sol(ad, 1.58, ay, sz).decompose(m.scaling, (m.rotationQuaternion = new B.Quaternion()), m.position);
    }
    const td = gp(-17, 30); if (dayAt(td)) spawnAt(toldo, td, 0.5, 1.5);
  }
  {
    const orange = pbr("moonCraneOr", { color: "#e8791c", rough: 0.55, emissive: "#4a2208" }), gW = glowM("#fff3c0"), gR = glowM("#ff3a2a"), dark = kk("#23262c", 0.7);
    const crane = template("kitCrane", () => [...[-4.2, 4.2].flatMap((x) => [-2.4, 2.4].map((z) => rbox(0.7, 8, 0.7, 0.06, orange, [x, 4, z]))), ...[-4.2, 4.2].map((x) => rbox(0.6, 0.4, 5.4, 0.05, dark, [x, 0.3, 0])), ...[-4.2, 4.2].map((x) => rbox(0.8, 0.8, 5.8, 0.06, orange, [x, 8.2, 0])),
      ...[-2.4, 2.4].map((z) => rbox(9.6, 0.7, 0.8, 0.06, orange, [0, 8.2, z])), rbox(1.0, 0.9, 17, 0.06, orange, [0, 9.2, 4.5]), ...[0, 1, 2, 3, 4, 5, 6].map((i) => rbox(1.06, 0.3, 0.25, 0.02, white, [0, 9.2, -3.4 + i * 2.4])),
      rbox(2.4, 1.4, 2.6, 0.08, orange, [0, 10.4, -1.8]), rbox(1.8, 1.2, 2, 0.07, steel, [0, 8.1, 7]), gl(1.2, 0.3, 0.05, gC, [0, 8.2, 8.02]), rbox(0.1, 3.6, 0.1, 0.01, dark, [0, 6.2, 7]), rbox(2.6, 0.3, 1.0, 0.04, steel, [0, 4.2, 7]),
      ...[-4.2, 4.2].flatMap((x) => [-2.4, 2.4].map((z) => gl(0.45, 0.3, 0.45, gW, [x, 8.75, z]))), gl(4, 0.15, 0.15, gW, [0, 9.0, -3.2]), gl(0.35, 0.35, 0.35, gR, [0, 9.8, 13]), gl(0.35, 0.35, 0.35, gR, [0, 11.3, -3]), gl(0.1, 2.0, 0.1, gY, [-4.2, 5, 2.8]), gl(0.1, 2.0, 0.1, gY, [4.2, 5, 2.8])]);
    const cols = ["#b8322a", "#2a4a8a", "#c9a227", "#2e7a5a", "#d8d2c4", "#a8322e", "#3a6a9a"], dim = (c: string) => "#" + [1, 3, 5].map((k) => Math.round(parseInt(c.slice(k, k + 2), 16) * 0.22).toString(16).padStart(2, "0")).join(""), cont = (i: number) => { const c = cols[i % cols.length]; return pbr("moonKitC" + c, { color: c, rough: 0.65, emissive: dim(c) }); }; // brillo propio tenue: sin él las pilas se pierden en el negro (ref290: contenedores bien leídos de noche)
    const stack = (n: number, off: number) => template("kitStack" + n + off, () => [0, 1].flatMap((c) => Array.from({ length: n }, (_, l) => { const x = (((c * 5 + l * 3 + off) % 5) - 2) * 0.12; return [rbox(4.4, 1.9, 1.9, 0.08, cont(c * 3 + l + off), [x, 0.95 + l * 1.9, c * 2.0]), ...[-1.7, 0, 1.7].map((r) => rbox(0.1, 1.8, 2.0, 0.02, steel, [x + r, 0.95 + l * 1.9, c * 2.0]))]; }).flat()));
    const tun = template("kitTunnel", () => [-1, 1].flatMap((sx) => [rbox(1.9, 3.8, 6, 0.08, cont(sx > 0 ? 4 : 0), [sx * 2.95, 1.9, 0]), ...[-2.5, -0.8, 0.9, 2.6].map((z) => rbox(2.0, 3.7, 0.1, 0.02, steel, [sx * 2.95, 1.9, z])), gl(0.08, 0.1, 5.8, gM, [sx * 1.97, 0.5, 0]), gl(0.08, 0.1, 5.8, gM, [sx * 1.97, 3.4, 0]), gl(0.12, 3.8, 0.12, gM, [sx * 2.0, 1.9, 3.1]), gl(0.12, 3.8, 0.12, gM, [sx * 2.0, 1.9, -3.1])])
      .concat([rbox(7.8, 0.5, 6.2, 0.08, steel, [0, 4.05, 0]), gl(0.1, 0.1, 5.8, gC, [-1.0, 3.75, 0]), gl(0.1, 0.1, 5.8, gC, [1.0, 3.75, 0]), gl(4.2, 0.12, 0.12, gM, [0, 3.78, 3.1]), gl(4.2, 0.12, 0.12, gM, [0, 3.78, -3.1])]));
    const DC2 = DARK_DIR, fwd = (d: B.Vector3) => SUN_DIR.subtract(d.scale(B.Vector3.Dot(SUN_DIR, d))).normalize(); // hacia donde mira el auto al llegar (hacia el Sol)
    const t0 = fwd(DC2), a0 = Math.atan2(B.Vector3.Dot(t0, dk2), B.Vector3.Dot(t0, dk1));
    const night = (tpl: ReturnType<typeof template>, w: number, a: number, yawAdd = 0) => { const d = arcPos(w, a0 + a); if (nightAt(d)) { spawnAt(tpl, d, yawFor(d, fwd(d)) + yawAdd); return d; } return null; };
    const td = arcPos(20, a0), ty = yawFor(td, fwd(td)); // túnel de contenedores justo delante del auto, abierto en su sentido de marcha; paredes con colisión
    if (nightAt(td)) { spawnAt(tun, td, ty); for (const sx of [-2.95, 2.95]) wall(td, ty, 1.9, 3.8, 6, sx, 0); }
    // grúas pórtico (de lado, vistas desde la ruta) y pilas altas al fondo (3-5 contenedores de alto)
    for (const [w, a, ya] of [[44, 0.28, 1.57], [58, -0.35, 1.57], [70, 0.05, 1.57]] as const) { const d = night(crane, w, a, ya); if (d) { const yw = yawFor(d, fwd(d)) + ya; for (const sx of [-4.2, 4.2]) for (const sz2 of [-2.4, 2.4]) wall(d, yw, 0.8, 8, 0.8, sx, sz2); } }
    let si = 0;
    for (let i = 0; i < 26; i++) { const w = 34 + kr() * 48, a = (kr() * 2 - 1) * 0.9; if (Math.abs(a) < 0.12 && w < 40) continue; night(stack(3 + (si % 3), si % 5), w, a, (kr() - 0.5) * 0.9 + (si % 2 ? 1.57 : 0)); si++; }
  }
  // Contraste de la noche: faroles ámbar de juguete con pozo de luz cálida en el piso y rocas basálticas casi negras (siluetas) alrededor de la llegada.
  // Semilla propia (lr), instancias de 3 plantillas fusionadas, sin colisión. ponytail: decorativo; si hace falta chocar, sumar SPHERE estático como las mesetas.
  {
    const lr = rngFrom(0x1a3b5c), amber = glowM("#ffb347"), basalt = pbr("moonBasalt", { color: "#0c0d11", rough: 0.9 });
    // Pozo de luz: degradé radial ámbar (alfa 0,55 al centro, 0 en el borde), aditivo; textura nueva por armado, la anterior se libera
    const warmPool = (scene.getMaterialByName("moonWarmPoolMat") as B.StandardMaterial | null) ?? new B.StandardMaterial("moonWarmPoolMat", scene);
    warmPool.emissiveTexture?.dispose();
    const wt = new B.DynamicTexture("moonWarmTex", 64, scene, false), wc = wt.getContext() as unknown as CanvasRenderingContext2D, wg = wc.createRadialGradient(32, 32, 0, 32, 32, 32);
    wg.addColorStop(0, "rgba(255,205,120,1)"); wg.addColorStop(0.5, "rgba(255,160,64,0.55)"); wg.addColorStop(1, "rgba(255,140,50,0)"); wc.fillStyle = wg; wc.fillRect(0, 0, 64, 64); wt.update(); wt.hasAlpha = true;
    warmPool.emissiveTexture = warmPool.opacityTexture = wt; warmPool.diffuseColor = B.Color3.Black(); warmPool.specularColor = B.Color3.Black(); warmPool.disableLighting = true; warmPool.alphaMode = B.Constants.ALPHA_ADD; warmPool.fogEnabled = false; warmPool.backFaceCulling = false;
    const lampPool = B.MeshBuilder.CreateGround("kitLampPool", { width: 2, height: 2 }, scene); lampPool.material = warmPool; lampPool.isVisible = false; lampPool.isPickable = false; // base de las instancias; radio 1 m
    const lamp = template("kitLamp", () => [cyl(0.07, 0.1, 1.5, steel, [0, 0.75, 0]), sph(0.34, amber, [0, 1.65, 0], undefined, 5)]);
    const rockB = template("moonBasalt", () => [poly("ba", 2, 0.6, 0.5, 0.55, basalt)]);
    const place = (tpl: ReturnType<typeof template>, n: number, w0: number, w1: number, scale: (i: number) => number, pool = 0) => {
      for (let i = 0; i < n; i++) {
        const d = arcPos(w0 + lr() * (w1 - w0), lr() * 6.3), yaw = lr() * 6.3, s = scale(i);
        if (B.Vector3.Dot(d, SUN_DIR) > -0.1 || heightAt(d) < -0.5 || MOON.R * Math.acos(d.y) < 12) continue;
        const m = tpl.createInstance("kit"); m.isPickable = false; m.receiveShadows = true;
        sol(d, 0, yaw, s).decompose(m.scaling, (m.rotationQuaternion = new B.Quaternion()), m.position);
        if (pool) { const f = lampPool.createInstance("kitLampPool"); f.isPickable = false; sol(d, 0.05, yaw).decompose(f.scaling, (f.rotationQuaternion = new B.Quaternion()), f.position); f.scaling.set(pool, 1, pool); }
      }
    };
    place(lamp, 34 * lowK, 6, 38, () => 1.5, 2.8); // farol 1,5x; pozo de radio 2,8 m (más grande se leía como lava)
    place(rockB, 65 * lowK, 5, 50, () => 1.4 + lr() * 2.4);
  }
  // Cielo: estrellas fijas en el mundo (al dar la vuelta a la luna, giran), Tierra, Sol y una estrella fugaz de vez en cuando.
  // Todo dentro de la esfera del cielo de render.ts (radio 600, infiniteDistance): más lejos lo taparía
  const ns = low ? 500 : 900, sp: number[] = [], scol: number[] = [], si: number[] = [];
  for (let i = 0; i < ns; i++) {
    const d = new B.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize(), c = d.scale(560), s = 0.35 + Math.random() ** 3 * 1.5;
    const a = B.Vector3.Cross(d, Math.abs(d.y) < 0.9 ? Y : B.Axis.X).normalize().scaleInPlace(s), b = B.Vector3.Cross(d, a);
    const k = sp.length / 3, l = 0.45 + Math.random() * 0.55, tint = Math.random();
    for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { sp.push(c.x + a.x * x + b.x * y, c.y + a.y * x + b.y * y, c.z + a.z * x + b.z * y); scol.push(l * (tint < 0.2 ? 0.8 : 1), l * 0.95, l * (tint > 0.8 ? 0.75 : 1), 1); }
    si.push(k, k + 1, k + 2, k, k + 2, k + 3);
  }
  stars = new B.Mesh("stars", scene);
  Object.assign(new B.VertexData(), { positions: sp, colors: scol, indices: si }).applyToMesh(stars);
  const skyMat = (name: string) => { const m = (scene.getMaterialByName(name) as B.StandardMaterial | null) ?? new B.StandardMaterial(name, scene); m.disableLighting = true; m.fogEnabled = false; m.backFaceCulling = false; m.specularColor = B.Color3.Black(); return m; };
  const stM = skyMat("starsMat"); stM.emissiveColor = B.Color3.White(); stM.diffuseColor = B.Color3.Black();
  stars.material = stM; stars.infiniteDistance = true; stars.alwaysSelectAsActiveMesh = true; // el cielo no entra al recorte por distancia (setDrawDist) ni al de cámara
  stars.isPickable = false; stars.applyFog = false;
  // Tierra: continentes y nubes en una textura chica, iluminada por el mismo Sol (se ve su fase) y con un halo azul
  earth = B.MeshBuilder.CreateSphere("earth", { diameter: 100, segments: 24 }, scene);
  const eM = (scene.getMaterialByName("earthMat") as B.StandardMaterial | null) ?? new B.StandardMaterial("earthMat", scene);
  eM.diffuseTexture ??= canvasTex(256, (c, z) => {
    c.fillStyle = "#1d4f9c"; c.fillRect(0, 0, z, z);
    for (let i = 0; i < 14; i++) { const x = Math.random() * z, y = z * (0.2 + Math.random() * 0.6), r = 14 + Math.random() * 30; c.fillStyle = Math.random() < 0.5 ? "#3f7d3a" : "#8a7a4a"; c.beginPath(); c.ellipse(x, y, r, r * 0.6, Math.random() * 3, 0, 7); c.fill(); }
    c.fillStyle = "#f2f5f8"; c.fillRect(0, 0, z, z * 0.07); c.fillRect(0, z * 0.93, z, z * 0.07);
    for (let i = 0; i < 40; i++) { c.globalAlpha = 0.5; c.beginPath(); c.ellipse(Math.random() * z, Math.random() * z, 8 + Math.random() * 26, 3 + Math.random() * 5, 0, 0, 7); c.fill(); }
    c.globalAlpha = 1;
  });
  eM.specularColor = new B.Color3(0.15, 0.18, 0.25); eM.emissiveColor = new B.Color3(0.03, 0.05, 0.1); eM.fogEnabled = false;
  earth.material = eM; earth.position.copyFrom(EARTH_DIR).scaleInPlace(470); earth.rotation.set(0.4, 0, 0.2);
  earth.infiniteDistance = true; earth.alwaysSelectAsActiveMesh = true; earth.isPickable = false; earth.applyFog = false;
  const glowTex = (stops: [number, string][]) => { const t = new B.DynamicTexture("halo", 64, scene, false); const c = t.getContext() as unknown as CanvasRenderingContext2D, g = c.createRadialGradient(32, 32, 0, 32, 32, 32); for (const [k, col] of stops) g.addColorStop(k, col); c.fillStyle = g; c.fillRect(0, 0, 64, 64); t.update(); t.hasAlpha = true; return t; };
  const disc = (name: string, size: number, at: B.Vector3, stops: [number, string][]) => {
    const m = B.MeshBuilder.CreatePlane(name, { size }, scene), mm = skyMat(name + "Mat");
    mm.emissiveTexture?.dispose(); // el material se reusa entre armados: libera el halo anterior
    mm.emissiveTexture = mm.opacityTexture = glowTex(stops); mm.diffuseColor = B.Color3.Black(); mm.alphaMode = B.Constants.ALPHA_ADD;
    m.material = mm; m.position.copyFrom(at); m.billboardMode = B.Mesh.BILLBOARDMODE_ALL; m.infiniteDistance = true; m.alwaysSelectAsActiveMesh = true; m.isPickable = false; m.applyFog = false;
    return m;
  };
  disc("earthHalo", 128, EARTH_DIR.scale(495), [[0, "rgba(120,180,255,0)"], [0.72, "rgba(120,180,255,0.5)"], [1, "rgba(120,180,255,0)"]]); // atmósfera: un aro azul detrás del disco
  disc("sunDisc", 72, SUN_DIR.scale(520), [[0, "rgba(255,250,235,1)"], [0.3, "rgba(255,246,225,1)"], [1, "rgba(255,200,120,0)"]]);
  // Marte y Saturno: más chicos y lejos que la Tierra, con el mismo Sol (se ve su fase); el anillo es un toro aplastado sin luz
  const planet = (name: string, diam: number, dir: B.Vector3, paint: (c: CanvasRenderingContext2D, z: number) => void) => {
    const m = B.MeshBuilder.CreateSphere(name, { diameter: diam, segments: 16 }, scene), pm = (scene.getMaterialByName(name + "Mat") as B.StandardMaterial | null) ?? new B.StandardMaterial(name + "Mat", scene);
    pm.diffuseTexture ??= canvasTex(128, paint); pm.specularColor = B.Color3.Black(); pm.emissiveColor = new B.Color3(0.06, 0.05, 0.05); pm.fogEnabled = false;
    m.material = pm; m.position.copyFrom(dir).normalize().scaleInPlace(500);
    m.infiniteDistance = true; m.alwaysSelectAsActiveMesh = true; m.isPickable = false; m.applyFog = false;
    return m;
  };
  planet("mars", 26, new B.Vector3(-0.7, 0.35, 0.45), (c, z) => {
    c.fillStyle = "#b5522b"; c.fillRect(0, 0, z, z);
    for (let i = 0; i < 18; i++) { c.fillStyle = Math.random() < 0.5 ? "#8c3a1e" : "#d07a48"; c.beginPath(); c.ellipse(Math.random() * z, z * (0.15 + Math.random() * 0.7), 6 + Math.random() * 16, 3 + Math.random() * 7, Math.random() * 3, 0, 7); c.fill(); }
    c.fillStyle = "#f3ece4"; c.fillRect(0, 0, z, z * 0.06);
  });
  const sat = planet("saturn", 50, new B.Vector3(0.75, 0.5, -0.3), (c, z) => {
    ["#d9bf8c", "#c9a56a", "#e6d2a6", "#b8925a", "#dcc596", "#c4a271"].forEach((col, i, a) => { c.fillStyle = col; c.fillRect(0, (i * z) / a.length, z, z / a.length + 1); });
  });
  sat.rotation.set(0.45, 0, 0.3);
  const ring = B.MeshBuilder.CreateTorus("saturnRing", { diameter: 84, thickness: 22, tessellation: 48 }, scene), rm = skyMat("saturnRingMat");
  rm.emissiveColor = B.Color3.FromHexString("#b9a27a"); rm.diffuseColor = B.Color3.Black(); rm.alpha = 0.75;
  ring.material = rm; ring.scaling.y = 0.04; ring.parent = sat; ring.isPickable = false; ring.applyFog = false; ring.alwaysSelectAsActiveMesh = true;
  // Ciudad de juguete en el horizonte (solo de noche): una caja con thin instances en anillo, sin luz ni niebla ni colisión.
  // Color de pared por instancia (vColor tiñe el difuso con disableLighting); ventanitas = textura emisiva. moonTick la orienta al "arriba" del auto.
  city = B.MeshBuilder.CreateBox("moonCity", { size: 1 }, scene);
  const cM = skyMat("moonCityMat"); cM.diffuseColor = B.Color3.White(); cM.backFaceCulling = true;
  cM.emissiveTexture ??= canvasTex(64, (c, z) => {
    c.fillStyle = "#000"; c.fillRect(0, 0, z, z);
    for (let y = 3; y < z - 6; y += 10) for (let x = 3; x < z - 5; x += 8) if (Math.random() < 0.6) { c.fillStyle = ["#ffd27a", "#FBC02D", "#FB8C00", "#fff3d6", "#7af0ff"][(x * 3 + y) % 5]; c.fillRect(x, y, 5, 6); } // ventanas grandes y cálidas: se leen a 470 m
  });
  cM.emissiveTexture.level = 1.8;
  city.material = cM;
  const nc = low ? 40 : 70, cmat = new Float32Array(nc * 16), ccol = new Float32Array(nc * 4), WALL = ["#3a1f5c", "#1f3a5c", "#5c1f3f", "#2a2a48", "#4a2350"];
  for (let i = 0; i < nc; i++) {
    const a = (i / nc) * Math.PI * 2 + nr() * 0.05, h = 10 + nr() * 12, w = 7 + nr() * 6; // base en 0: moonTick la baja al borde de la luna según la cámara
    B.Matrix.ComposeToRef(new B.Vector3(w, h, w), B.Quaternion.RotationAxis(Y, -a), new B.Vector3(Math.cos(a) * 470, h / 2, Math.sin(a) * 470), mx).copyToArray(cmat, i * 16);
    const wc = B.Color3.FromHexString(WALL[i % WALL.length]); ccol.set([wc.r, wc.g, wc.b, 1], i * 4);
  }
  city.thinInstanceSetBuffer("matrix", cmat, 16, true); city.thinInstanceSetBuffer("color", ccol, 4, true);
  city.rotationQuaternion = new B.Quaternion(); city.infiniteDistance = true; city.alwaysSelectAsActiveMesh = true; city.isPickable = false; city.applyFog = false;
  shoot = B.MeshBuilder.CreateLines("shoot", { points: [shootA, shootB], colors: [new B.Color4(1, 1, 1, 1), new B.Color4(0.6, 0.8, 1, 0)], updatable: true, useVertexAlpha: true }, scene);
  shoot.infiniteDistance = true; shoot.alwaysSelectAsActiveMesh = true; shoot.isPickable = false; shoot.applyFog = false; shoot.isVisible = false;
  if (shoot.material) shoot.material.fogEnabled = false;
}

// ---------- Cada cuadro: niebla según el lado (sol / sombra) y estrellas fugaces ----------
const FOG_LIT = B.Color3.FromHexString("#f2b27a"), FOG_DARK = B.Color3.FromHexString("#0c0a1c"); // día: desierto cálido; noche: azul-violeta neón
const NIGHT_TINT = new B.Color3(0.2, 0.22, 0.26); // asfalto mojado oscuro (ref33b, medios ~#1c1f26)
const SKY_NIGHT = ["#5a1a8a", "#14082a", "#04020a", "#010004"], NEON_FLOOR = B.Color3.FromHexString("#060709"); // emisivo lineal: con exposición y tonemap #0a0612 pintaba todo el piso lavanda (~90 % del violeta)
let fadeT = 0;
const nightBase = new Map<B.Light, { base: number; set: number }>();
export function moonTick(dt: number, car: B.Vector3, cam: B.Camera) {
  // Lado del Sol: niebla rala y gris; del otro lado, cerrada y negra (de los bichos se ven las luces)
  const s = B.Scalar.Clamp(B.Vector3.Dot(dirOf(car), SUN_DIR) * 1.6 + 0.35, 0, 1);
  scene.fogDensity = B.Scalar.Lerp(0.02, 0.0022, s); // día: poca niebla para que se lean estratos y cactus (0,006 lavaba todo a durazno)
  neonK = 1 - s; for (const n of neon) n.visibility = neonK; stars.visibility = neonK; // neón y estrellas solo de noche
  B.Color3.LerpToRef(FOG_DARK, FOG_LIT, s, scene.fogColor);
  skyBlend(SKY_NIGHT, LUNA_CLIMATE.sky, s); // cielo: violeta profundo de noche, crepúsculo cálido de día
  // Sol y hemisferio siguen pintando cálido rocas y mesetas: de noche se bajan (base = lo que dejó applyClimate)
  for (const L of [scene.getLightByName("sun"), scene.getLightByName("hemi")]) {
    if (!L) continue;
    const b = nightBase.get(L); if (!b || L.intensity !== b.set) nightBase.set(L, { base: L.intensity, set: L.intensity });
    const nb = nightBase.get(L)!; nb.set = L.intensity = nb.base * (1 - neonK * (L.name === "sun" ? 0.7 : 0.85)); // luna más dura, casi sin relleno ambiente (contraste de noche)
  }
  city.visibility = neonK; city.isVisible = neonK > 0.02;
  if (city.isVisible) {
    const up = dirOf(cam.globalPosition), dip = Math.acos(Math.min(1, MOON.R / Math.max(MOON.R, B.Vector3.Distance(cam.globalPosition, CENTER)))); // "arriba" y caída del borde vistos desde la cámara (no el auto: con la cámara alta difieren ~15°)
    B.Quaternion.FromUnitVectorsToRef(Y, up, city.rotationQuaternion!);
    city.scaling.set(Math.cos(dip), 1, Math.cos(dip)); // el anillo queda a 470 m sobre la visual del borde (dentro del maxZ)
    city.position.copyFrom(up).scaleInPlace(-470 * Math.sin(dip) - 6); // base al ras del borde (el relieve tapa el pie): skyline chico con cualquier cámara
  }
  // "Reflejo" del neón en el suelo: solo un emisivo magenta tenue (costo cero; un espejo/SSR duplicaría el render)
  B.Color3.LerpToRef(B.Color3.BlackReadOnly, NEON_FLOOR, neonK, groundM.emissiveColor);
  // Piso de asfalto mojado de noche (ref33b): se cambia la textura al cruzar al lado oscuro (una recompilación) y el tinte frío compensa el color cálido de los vértices
  if (curbW) (curbW as B.PBRMaterial).emissiveColor.set(0.35 * neonK, 0.35 * neonK, 0.38 * neonK);
  if (!fillL) { fillL = new B.PointLight("moonFill", B.Vector3.Zero(), scene); fillL.diffuse = new B.Color3(0.45, 0.65, 1); fillL.range = 18; }
  fillL.setEnabled(neonK > 0.02); fillL.intensity = 40 * neonK; fillL.position.copyFrom(car).addInPlace(dirOf(car).scale(5));
  const night = neonK > 0.5;
  if (night !== wasNight) { wasNight = night; soilTex ??= groundM.albedoTexture; groundM.albedoTexture = night ? asphalt! : soilTex; groundM.roughness = night ? 0.3 : 0.85; groundM.environmentIntensity = night ? 0.9 : 1; groundM.detailMap.diffuseBlendLevel = night ? 0.15 : 0.72; }
  B.Color3.LerpToRef(new B.Color3(1, 1, 1), NIGHT_TINT, neonK, groundM.albedoColor);
  // Estrella fugaz: cada 3-9 s cruza una parte del cielo que la cámara ve
  if ((shootT -= dt) <= 0 && shootLife <= 0) {
    shootT = 3 + Math.random() * 6; shootLife = 0.7;
    const f = cam.getDirection(B.Axis.Z), r = cam.getDirection(B.Axis.X), u = cam.getDirection(B.Axis.Y);
    shootA.copyFrom(f).addInPlace(u.scale(0.25 + Math.random() * 0.25)).addInPlace(r.scale((Math.random() - 0.5) * 1.2)).normalize();
    shootB.copyFrom(r).scaleInPlace(Math.random() < 0.5 ? -1 : 1).addInPlace(u.scale(-0.4)).normalize(); // hacia dónde va
  }
  if (shootLife > 0) {
    shootLife -= dt;
    const k = 1 - shootLife / 0.7, head = shootA.add(shootB.scale(0.35 * k)).normalize().scaleInPlace(540), tail = shootA.add(shootB.scale(Math.max(0, 0.35 * k - 0.09))).normalize().scaleInPlace(540);
    B.MeshBuilder.CreateLines("shoot", { points: [head, tail], instance: shoot });
    shoot.isVisible = shootLife > 0; shoot.alpha = Math.sin(Math.PI * k);
  }
  // Deformaciones viejas: se alisan de a poco (y se rehace su zona cada 0,2 s)
  fadeT += dt;
  if (fadeT >= 0.2) {
    for (let i = dents.length - 1; i >= 0; i--) {
      const dn = dents[i];
      if (!dn.fade) continue;
      dn.k = Math.max(0, dn.k - fadeT / dn.fade);
      if (dn.k <= 0) dents.splice(i, 1);
      remesh(dn);
    }
    fadeT = 0;
  }
}

/** ¿El Sol o la Tierra (dirección dir) se ven en cuadro? (dentro de la cámara y sin la luna tapándolos) */
export function skyVisible(dir: B.Vector3, cam: B.Camera) {
  const o = cam.globalPosition, p = o.add(dir.scale(500));
  if (!scene.frustumPlanes?.every((pl) => pl.dotCoordinate(p) >= 0)) return false;
  const oc = o.subtract(CENTER), b = B.Vector3.Dot(oc, dir), c = oc.lengthSquared() - MOON.R * MOON.R, disc = b * b - c;
  return disc <= 0 || -b - Math.sqrt(disc) < 0;
}
/** Naves: lleva pos a alt metros del piso siguiendo a target a speed m/s. Devuelve la distancia que falta. */
export function hover(pos: B.Vector3, target: B.Vector3, altM: number, speed: number, dt: number) {
  const to = hflat(target.subtract(pos), pos), d = to.length();
  if (d > 0.01) advance(pos, to.scaleInPlace(1 / d), Math.min(d, speed * dt));
  const u = dirOf(pos, new B.Vector3()), r = B.Vector3.Distance(pos, CENTER), want = radiusAt(u) + altM;
  pos.copyFrom(u).scaleInPlace(r + (want - r) * Math.min(1, dt * 3)).addInPlace(CENTER);
  return d;
}
/** Proyectil libre: cae hacia el centro; true cuando tocó el piso (queda apoyado). */
export function fall(pos: B.Vector3, vel: B.Vector3, dt: number, g = MOON.g) {
  grav(vel, pos, g * dt); pos.addInPlace(vel.scale(dt));
  if (alt(pos) > 0) return false;
  onFloor(pos, 0, pos);
  return true;
}
/** Ganchos que llena main.ts para las fases siguientes: hacer aparecer un bicho en un punto de la esfera. */
export const LUNA: { spawn: ((kind: Kind, p: B.Vector3) => void) | null } = { spawn: null };

// ---------- Bichos "robot con luces": mismas plantillas e IA, más ojos y baliza emisivos que atraviesan la niebla ----------
export function enemyLights(node: B.AbstractMesh, kind: string, size: [number, number, number]) {
  const [w, h, l] = size;
  const t = template("luces_" + kind, () => {
    const eye = pbr("lunaOjo", { color: "#ff3b2e", rough: 0.3, emissive: "#ff3b2e" }), bea = pbr("lunaBaliza", { color: "#ff9138", rough: 0.3, emissive: "#ff9138" });
    eye.fogEnabled = bea.fogEnabled = false; eye.emissiveIntensity = bea.emissiveIntensity = 2.2;
    const e = Math.max(0.16, Math.min(w, l) * 0.13);
    return [sph(e, eye, [w * 0.2, h * 0.72, l * 0.5], undefined, 4), sph(e, eye, [-w * 0.2, h * 0.72, l * 0.5], undefined, 4), sph(e * 1.1, bea, [0, h + e * 1.4, -l * 0.1], undefined, 4)];
  });
  shadows.removeShadowCaster(t);
  const m = t.createInstance("luces");
  m.parent = node; m.position.setAll(0); m.isPickable = false;
  m.scaling.setAll(1 / (node.scaling.x || 1)); // jefes GLB escalados (glb.ts): las luces van en metros reales
  return m;
}

/** Clima fijo de la luna (la niebla la ajusta moonTick cada cuadro). */
export const LUNA_CLIMATE = { id: "luna", name: "LUNA", sun: [-SUN_DIR.x, -SUN_DIR.y, -SUN_DIR.z] as [number, number, number], sunColor: "#ffe2b0", sunI: 8, hemiI: 0.08, sky: ["#4a90d9", "#8cc0ee", "#f6dcb0", "#c9a070"] as [string, string, string, string], exposure: 1.55, fog: 0.02, day: true, ramp: ["#2a1630", "#b8613a", "#fff3d6"] as [string, string, string], amb: "#9aa6d8", ground: "#a85a3a" } satisfies Climate & { amb: string; ground: string };
