import * as B from "@babylonjs/core";
import { sph, template } from "./models";
import { canvasTex, pbr, shadows, surface } from "./render";
import { rng } from "./rng";
import type { Climate } from "./run";
import type { Kind } from "./enemies";

// ---------- Luna: un planeta chico de verdad (esfera + gravedad radial), mapa del modo Supervivencia ----------
// R = 60: superficie 4πR² ≈ 45.200 m² (el patio de 200×200 son 40.000): la misma cantidad de mundo, pero el horizonte queda a ~40 m
// de la cámara (√(2·R·13 m)) y a 15 m/s se da un cuarto de vuelta en 6 s: la curva se ve siempre. Con R = 45 los cráteres y el anillo de
// aparición (52-72 m) daban la vuelta entera; con R = 70 la curva ya se pierde a la altura de la cámara baja.
// Todo vive en el mundo real (Havok sin gravedad): cada cuerpo dinámico cae hacia el centro y el piso es ANALÍTICO (radio = R + altura(dirección)),
// así los cráteres que se agregan en la partida (deform) cambian el piso del auto, los bichos, el spawn y las gemas con la misma función.
// Fuera de la luna (MOON.on = false) cada ayudante de abajo hace EXACTAMENTE la cuenta plana de siempre: el patio no cambia ni un bit.
export const MOON = { on: false, R: 60, g: 25 }; // g = la gravedad del patio (25): los saltos de jefes están calculados con ella
export const CENTER = new B.Vector3(0, -MOON.R, 0); // el polo de arriba queda en el origen: la salida es la misma del patio
export const SUN_DIR = new B.Vector3(-0.62, 0.48, -0.62).normalize(); // hacia el Sol (la luz va al revés): la salida queda en la cara iluminada
export const EARTH_DIR = new B.Vector3(0.25, 0.42, 0.87).normalize(); // la Tierra, delante de la salida (el auto arranca mirando +z)
const Y = B.Vector3.Up();

// ---------- Superficie: lomas suaves + cráteres/montículos (fijos del mundo y los de la partida) ----------
type Dent = { d: B.Vector3; r: number; depth: number; cos: number; k: number; fade: number };
const fixed: Dent[] = [], dents: Dent[] = [];
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
  return { gap: r - foot - radiusAt(d), ny: B.Vector3.Dot(normalAt(d), d) };
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
let carBody: B.PhysicsBody | null = null;
const carUp = new B.Vector3(0, 1, 0);
/** El cuerpo del auto se alinea a la normal del piso (rampas, bordes de cráter); el resto, a la vertical. */
export function moonCar(b: B.PhysicsBody | null, up: B.Vector3 = Y) { carBody = b; carUp.copyFrom(up); }
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
      const isCar = b === carBody;
      if (gap < 0.05) {
        if (gap < 0) p.addInPlace(_p.copyFrom(_u).scaleInPlace(-gap)); // piso: se empuja hacia afuera
        normalAt(_u, _n);
        b.getLinearVelocityToRef(_v);
        const vn = B.Vector3.Dot(_v, _n);
        if (vn < 0) { _v.subtractInPlace(_p.copyFrom(_n).scaleInPlace(vn)); b.setLinearVelocity(_v); } // sin rebote ni roce: se pierde solo lo que iba contra el piso (drive() y la IA ponen el resto)
        if (isCar) B.Vector3.LerpToRef(carUp, _n, Math.min(1, 12 * dd), carUp).normalize();
      } else if (isCar) B.Vector3.LerpToRef(carUp, _u, Math.min(1, 4 * dd), carUp).normalize();
      // Parado sobre la luna: la vertical del cuerpo va a la del lugar (auto: a la del piso); el rumbo se conserva
      const q = (node.rotationQuaternion ??= B.Quaternion.FromEulerVector(node.rotation));
      Y.rotateByQuaternionToRef(q, _cu);
      B.Quaternion.FromUnitVectorsToRef(_cu, isCar ? carUp : _u, _dq);
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
  if (!on) carBody = null;
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
  return 0.5 + 0.07 * w + 0.06 * lo + B.Scalar.Clamp(h * 0.07, -0.16, 0.1);
};
const _vd = new B.Vector3(), _vn = new B.Vector3();
function paint(f: Face, i: number) {
  const o = i * 3;
  _vd.set(f.dir[o], f.dir[o + 1], f.dir[o + 2]);
  const h = heightAt(_vd), r = MOON.R + h;
  f.pos[o] = CENTER.x + _vd.x * r; f.pos[o + 1] = CENTER.y + _vd.y * r; f.pos[o + 2] = CENTER.z + _vd.z * r;
  normalAt(_vd, _vn); f.nor[o] = _vn.x; f.nor[o + 1] = _vn.y; f.nor[o + 2] = _vn.z;
  const g = shade(_vd.x, _vd.y, _vd.z, h);
  f.col[i * 4] = g; f.col[i * 4 + 1] = g * 0.985; f.col[i * 4 + 2] = g * 0.96; f.col[i * 4 + 3] = 1;
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
let stars: B.Mesh, shoot: B.LinesMesh, shootT = 4, shootLife = 0;
const shootA = new B.Vector3(), shootB = new B.Vector3();
let earth: B.Mesh;
/** Arma la luna (lo fijo, con la semilla del mundo): esfera de 6 caras, cráteres, rocas, estrellas, Tierra y Sol. */
export function moonBuild(s: B.Scene, low: boolean) {
  scene = s;
  fixed.length = 0; dents.length = 0; faces.length = 0;
  // Cráteres fijos: ninguno a menos de 16 m de la salida; grandes pocos, chicos muchos
  for (let i = 0; i < 72; i++) {
    const d = new B.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize(), big = i < 10;
    const r = big ? 9 + rng() * 7 : 2.5 + rng() * 4.5, dep = r * (big ? 0.22 : 0.3) * (0.7 + rng() * 0.5);
    if (MOON.R * Math.acos(d.y) < 16 + r) continue;
    fixed.push(mkDent(d, r, dep));
  }
  // Suelo: textura de regolito (gris con granos) + mapa de detalle de tierra; el color grande lo ponen los vértices
  const N = low ? 52 : 76, rep = 10;
  const mat = surface(pbr("moonGround", { color: "#ffffff", rough: 0.97, tex: groundTex ??= canvasTex(256, (c, z) => {
    c.fillStyle = "#9a9a98"; c.fillRect(0, 0, z, z);
    for (let i = 0; i < 9000; i++) { c.fillStyle = ["#86868a", "#a9a8a4", "#77787c", "#b4b3ae"][i % 4]; c.globalAlpha = 0.25 + Math.random() * 0.5; c.fillRect(Math.random() * z, Math.random() * z, 1 + Math.random() * 3, 1 + Math.random() * 3); }
    for (let i = 0; i < 40; i++) { const x = Math.random() * z, y = Math.random() * z, r = 2 + Math.random() * 7; c.globalAlpha = 0.25; c.strokeStyle = "#5f6064"; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); } // micro-cráteres
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
  const rockM = pbr("moonRock", { color: "#7b7c80", rough: 0.95 });
  const rockTpl = template("moonRock", () => [sph(1, rockM, [0, 0, 0], [1.25, 0.7, 1], 4), sph(0.62, rockM, [0.42, 0.12, 0.18], [1, 0.75, 1.1], 4), sph(0.5, rockM, [-0.35, 0.05, -0.3], [1.1, 0.6, 1], 4)]);
  for (let i = 0; i < 70; i++) {
    const d = new B.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize(), sz = 1.6 + rng() * 2.6, yaw = rng() * 6.3;
    if (MOON.R * Math.acos(d.y) < 14 || heightAt(d) < -0.6) continue;
    const m = rockTpl.createInstance("roca");
    m.position.copyFrom(d).scaleInPlace(radiusAt(d) + sz * 0.12).addInPlace(CENTER);
    m.scaling.setAll(sz);
    m.rotationQuaternion = B.Quaternion.FromUnitVectorsToRef(Y, d, new B.Quaternion()).multiply(B.Quaternion.RotationAxis(Y, yaw));
    new B.PhysicsAggregate(m, B.PhysicsShapeType.SPHERE, { mass: 0, radius: sz * 0.5, friction: 0.5 }, scene);
    m.receiveShadows = true;
  }
  const peb = B.MeshBuilder.CreatePolyhedron("moonPebble", { type: 3, sizeX: 0.46, sizeY: 0.22, sizeZ: 0.38 }, scene); // icosaedro achatado: 20 triángulos por piedrita
  peb.material = rockM;
  const np = low ? 500 : 1100, mats = new Float32Array(np * 16), q = new B.Quaternion(), mx = new B.Matrix(), sc = new B.Vector3(), pp = new B.Vector3();
  for (let i = 0; i < np; i++) {
    const d = new B.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize(), s = 0.25 + Math.random() * 0.7;
    B.Quaternion.FromUnitVectorsToRef(Y, d, q).multiplyInPlace(B.Quaternion.RotationAxis(Y, Math.random() * 6.3));
    pp.copyFrom(d).scaleInPlace(radiusAt(d) + s * 0.1).addInPlace(CENTER); sc.setAll(s);
    B.Matrix.ComposeToRef(sc, q, pp, mx); mx.copyToArray(mats, i * 16);
  }
  peb.thinInstanceSetBuffer("matrix", mats, 16, true); peb.thinInstanceRefreshBoundingInfo(); peb.isPickable = false; peb.receiveShadows = true; // chicas: sin sombra propia
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
  stars.material = stM; stars.infiniteDistance = true; stars.alwaysSelectAsActiveMesh = true; // el cielo no entra al recorte por distancia (setDrawDist) ni al de cámara stars.isPickable = false; stars.applyFog = false;
  // Tierra: continentes y nubes en una textura chica, iluminada por el mismo Sol (se ve su fase) y con un halo azul
  earth = B.MeshBuilder.CreateSphere("earth", { diameter: 72, segments: 24 }, scene);
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
    mm.emissiveTexture = mm.opacityTexture = glowTex(stops); mm.diffuseColor = B.Color3.Black(); mm.alphaMode = B.Constants.ALPHA_ADD;
    m.material = mm; m.position.copyFrom(at); m.billboardMode = B.Mesh.BILLBOARDMODE_ALL; m.infiniteDistance = true; m.alwaysSelectAsActiveMesh = true; m.isPickable = false; m.applyFog = false;
    return m;
  };
  disc("earthHalo", 92, EARTH_DIR.scale(495), [[0, "rgba(120,180,255,0)"], [0.72, "rgba(120,180,255,0.5)"], [1, "rgba(120,180,255,0)"]]); // atmósfera: un aro azul detrás del disco
  disc("sunDisc", 72, SUN_DIR.scale(520), [[0, "rgba(255,250,235,1)"], [0.3, "rgba(255,246,225,1)"], [1, "rgba(255,200,120,0)"]]);
  shoot = B.MeshBuilder.CreateLines("shoot", { points: [shootA, shootB], colors: [new B.Color4(1, 1, 1, 1), new B.Color4(0.6, 0.8, 1, 0)], updatable: true, useVertexAlpha: true }, scene);
  shoot.infiniteDistance = true; shoot.alwaysSelectAsActiveMesh = true; shoot.isPickable = false; shoot.applyFog = false; shoot.isVisible = false;
  if (shoot.material) shoot.material.fogEnabled = false;
}

// ---------- Cada cuadro: niebla según el lado (sol / sombra) y estrellas fugaces ----------
const FOG_LIT = B.Color3.FromHexString("#151922"), FOG_DARK = B.Color3.FromHexString("#020306");
let fadeT = 0;
export function moonTick(dt: number, car: B.Vector3, cam: B.Camera) {
  // Lado del Sol: niebla rala y gris; del otro lado, cerrada y negra (de los bichos se ven las luces)
  const s = B.Scalar.Clamp(B.Vector3.Dot(dirOf(car), SUN_DIR) * 1.6 + 0.35, 0, 1);
  scene.fogDensity = B.Scalar.Lerp(0.036, 0.016, s);
  B.Color3.LerpToRef(FOG_DARK, FOG_LIT, s, scene.fogColor);
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
export const LUNA_CLIMATE = { id: "luna", name: "LUNA", sun: [-SUN_DIR.x, -SUN_DIR.y, -SUN_DIR.z] as [number, number, number], sunColor: "#fff3df", sunI: 4.6, hemiI: 0.32, sky: ["#000000", "#020306", "#04060c", "#000000"] as [string, string, string, string], exposure: 1.05, fog: 0.02, ramp: ["#05070c", "#5a6070", "#f4f0e8"] as [string, string, string], amb: "#4a5470", ground: "#4a5470" } satisfies Climate & { amb: string; ground: string };
