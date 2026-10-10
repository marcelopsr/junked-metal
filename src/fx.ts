import * as B from "@babylonjs/core";
import { box, template } from "./models";
import { G, M, pbr, TEX, wetGround } from "./render";
import { RAIN } from "./run";
import { FOLD, FOLDED_SLICE } from "./folded";

// Partículas con un pool de sistemas reutilizables (cero creación por golpe).
let scene: B.Scene;
let lowFx = false;
let tex: B.Texture;
const pool: B.ParticleSystem[] = [];
let next = 0;
// Ambiente (polvo en el haz, luciérnagas): sistemas propios, fuera del pool de golpes
let motes: B.ParticleSystem, flies: B.ParticleSystem, petals: B.ParticleSystem;
function ambientPs(cap: number, size: [number, number], life: [number, number], power: [number, number], gravity: number) {
  const ps = new B.ParticleSystem("amb", cap, scene);
  ps.particleTexture = tex;
  ps.emitter = new B.Vector3();
  ps.blendMode = B.ParticleSystem.BLENDMODE_ADD;
  ps.manualEmitCount = 0;
  ps.createSphereEmitter(0.4);
  [ps.minSize, ps.maxSize] = size; [ps.minLifeTime, ps.maxLifeTime] = life; [ps.minEmitPower, ps.maxEmitPower] = power;
  ps.gravity = new B.Vector3(0, gravity, 0);
  ps.start();
  return ps;
}
/** Detalle del mundo (Configuración → Imagen): cantidad de partículas escalada por G.fx. Los decimales se sortean (visual: Math.random, no toca la semilla). */
const share = (n: number) => Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
export function ambient(kind: "mote" | "fly" | "petal", p: B.Vector3) {
  const ps = kind === "mote" ? motes : kind === "petal" ? petals : flies;
  (ps.emitter as B.Vector3).copyFrom(p);
  ps.manualEmitCount = share((kind === "mote" ? 2 : 1) * Math.min(G.fx, 1)); // el techo de cada sistema (capacidad) no sube; con Detalle bajo emite menos
}

export function initFx(s: B.Scene, low: boolean) {
  scene = s;
  lowFx = low;
  tex = TEX.dot();
  tex.hasAlpha = true;
  for (let i = 0; i < (low ? 10 : 20); i++) {
    const ps = new B.ParticleSystem("fx", 300, scene);
    ps.particleTexture = tex;
    ps.emitter = new B.Vector3();
    ps.blendMode = B.ParticleSystem.BLENDMODE_ADD;
    ps.manualEmitCount = 0;
    ps.gravity = new B.Vector3(0, -18, 0);
    ps.minEmitPower = 0;
    ps.createSphereEmitter(0.3);
    ps.start();
    pool.push(ps);
  }
  motes = ambientPs(low ? 80 : 160, [0.04, 0.09], [0.8, 1.3], [0.1, 0.4], 0.15);
  motes.color1 = motes.color2 = B.Color4.FromHexString("#8a8068ff");
  motes.colorDead = new B.Color4(0, 0, 0, 0);
  // Pétalos y mariposas de día: rosas, amarillos y blancos que flotan lento
  petals = ambientPs(low ? 30 : 90, [0.3, 0.5], [3, 5], [0.3, 0.8], -0.25);
  petals.blendMode = B.ParticleSystem.BLENDMODE_STANDARD;
  petals.color1 = B.Color4.FromHexString("#ffb3d1ff"); petals.color2 = B.Color4.FromHexString("#fff3a0ff");
  petals.colorDead = new B.Color4(1, 1, 1, 0);
  petals.minAngularSpeed = -2; petals.maxAngularSpeed = 2;
  // Luciérnagas: parpadean con un gradiente de color a lo largo de su vida
  flies = ambientPs(low ? 40 : 90, [0.1, 0.18], [2.5, 4], [0.2, 0.6], 0.25);
  const on = B.Color4.FromHexString("#e8ff70ff"), off = new B.Color4(0.9, 1, 0.45, 0);
  for (const [t, c] of [[0, off], [0.15, on], [0.32, off], [0.5, on], [0.68, off], [0.85, on], [1, off]] as [number, B.Color4][]) flies.addColorGradient(t, c);
}

type BurstOpts = { n: number; color: string; color2?: string; size: [number, number]; power: [number, number]; life: [number, number]; gravity?: number; add?: boolean };

export function burst(pos: B.Vector3, o: BurstOpts) {
  const ps = pool[next++ % pool.length];
  (ps.emitter as B.Vector3).copyFrom(pos);
  const c1 = B.Color4.FromHexString(o.color + "ff");
  ps.color1 = c1;
  ps.color2 = o.color2 ? B.Color4.FromHexString(o.color2 + "ff") : c1;
  ps.colorDead = new B.Color4(c1.r * 0.3, c1.g * 0.3, c1.b * 0.3, 0);
  [ps.minSize, ps.maxSize] = o.size;
  [ps.minEmitPower, ps.maxEmitPower] = o.power;
  [ps.minLifeTime, ps.maxLifeTime] = o.life;
  ps.gravity.y = o.gravity ?? -18;
  ps.blendMode = o.add === false ? B.ParticleSystem.BLENDMODE_STANDARD : B.ParticleSystem.BLENDMODE_ADD;
  ps.manualEmitCount = share(o.n * G.fx);
}

export const FX = {
  hit: (p: B.Vector3, crit = false) => burst(p, { n: crit ? 14 : 6, color: crit ? "#ffd24a" : "#ffe08a", color2: crit ? "#ff4d00" : undefined, size: crit ? [0.16, 0.38] : [0.1, 0.25], power: crit ? [5, 11] : [3, 7], life: [0.15, 0.35] }),
  death: (p: B.Vector3, big = false) => burst(p, { n: big ? 80 : 14, color: "#ffb347", color2: "#ff5a36", size: big ? [0.6, 1.6] : [0.2, 0.5], power: big ? [8, 18] : [3, 8], life: [0.3, 0.7] }),
  explosion: (p: B.Vector3, r: number) => {
    burst(p, { n: 60, color: "#ffd166", color2: "#ff4d00", size: [0.5 * r, 1.2 * r], power: [r * 2, r * 5], life: [0.2, 0.5], gravity: 2 });
    burst(p, { n: 25, color: "#ececec", size: [0.8 * r, 1.6 * r], power: [1, r * 2], life: [0.6, 1.2], gravity: 3, add: false });
  },
  dust: (p: B.Vector3) => burst(p, { n: 2, color: "#cdbd9c", // tierra levantada (derrape, aterrizaje): blanco puro se leía como vapor
 size: [0.3, 0.7], power: [0.5, 1.5], life: [0.4, 0.8], gravity: 1, add: false }),
  land: (p: B.Vector3, hard = false) => burst(p, { n: hard ? 8 : 4, color: "#cdbd9c", size: [0.35, hard ? 1.0 : 0.65], power: [1, hard ? 3.5 : 2], life: [0.3, 0.6], gravity: 0.5, add: false }),
  skid: (p: B.Vector3, hard = false) => { FX.dust(p); if (hard) burst(p, { n: 4, color: "#ffd27a", color2: "#ff9138", size: [0.06, 0.16], power: [2, 6], life: [0.15, 0.3], gravity: -15 }); },
  shock: (p: B.Vector3) => burst(p, { n: 8, color: "#5be7ff", color2: "#a855f7", size: [0.08, 0.22], power: [3, 8], life: [0.12, 0.28], gravity: -5 }),
  splash: (p: B.Vector3) => burst(p, { n: 7, color: "#a5f3fc", color2: "#ffffff", size: [0.12, 0.3], power: [1.2, 3.5], life: [0.2, 0.45], gravity: 4, add: false }),
  weld: (p: B.Vector3) => burst(p, { n: 10, color: "#e0f2fe", color2: "#38bdf8", size: [0.06, 0.18], power: [4, 10], life: [0.1, 0.22], gravity: -25 }),
  ignite: (p: B.Vector3) => burst(p, { n: 12, color: "#ff5500", color2: "#ffe600", size: [0.15, 0.45], power: [2.5, 6], life: [0.25, 0.55], gravity: -2, add: true }),
  steam: (p: B.Vector3) => burst(p, { n: 6, color: "#f1f5f9", color2: "#cbd5e1", size: [0.25, 0.75], power: [0.8, 2.2], life: [0.35, 0.75], gravity: -1.5, add: false }),
  xp: (p: B.Vector3) => burst(p, { n: 5, color: "#9be7ff", size: [0.1, 0.25], power: [1, 3], life: [0.2, 0.4] }),
  smoke: (p: B.Vector3, dark = false) => burst(p, { n: 2, color: dark ? "#a8a8a8" : "#f4f4f4", size: [0.5, 1.1], power: [0.5, 1.5], life: [0.8, 1.4], gravity: 3, add: false }),
  // Estela de proyectil: una voluta chica que se apaga rápido (llamar con probabilidad, no cada cuadro)
  trail: (p: B.Vector3, color = "#ffe27a") => burst(p, { n: 1, color, size: [0.22, 0.38], power: [0, 0.3], life: [0.2, 0.32], gravity: 0 }),
  sparks: (p: B.Vector3) => burst(p, { n: 8, color: "#ffd27a", size: [0.05, 0.14], power: [4, 9], life: [0.2, 0.45], gravity: -20 }),
  // Destello blanco breve sobre el enemigo golpeado
  flash: (p: B.Vector3, s: number) => burst(p, { n: 1, color: "#ffffff", size: [s * 0.9, s * 1.1], power: [0, 0], life: [0.05, 0.07], gravity: 0 }),
  // Vapor de jefe enfurecido (fase 2): bocanadas rosadas que suben; s = tamaño según el jefe
  vapor: (p: B.Vector3, s = 1) => burst(p, { n: 3, color: "#ffe2da", color2: "#ff6a50", size: [0.8 * s, 1.7 * s], power: [0.8, 2.2], life: [0.7, 1.2], gravity: 5, add: false }),
  slam: (p: B.Vector3, r: number) => burst(p, { n: 120, color: "#f6f6f6", size: [1, 2.5], power: [r * 1.5, r * 3], life: [0.5, 1], gravity: 2, add: false }),
};

// ---------- Restos con física simple (sin Havok: son decorativos) ----------
type Chunk = { m: B.InstancedMesh; v: B.Vector3; av: B.Vector3; life: number };
const chunks: Chunk[] = [];
const chunkTpl = (c: string) => template("chunk" + c, () => (FOLDED_SLICE
  ? [box(0.34, 0.06, 0.26, FOLD.painted(c, 0.75, 401), [0, 0, 0]), box(0.11, 0.09, 0.11, FOLD.bare(), [0.06, 0.03, 0])]
  : [box(0.3, 0.14, 0.24, M.plastic(c), [0, 0, 0])]));

export function debris(pos: B.Vector3, color: string, n: number, power = 6, size = 1) {
  const tpl = chunkTpl(color);
  for (let i = 0, cap = Math.round(240 * Math.min(G.fx, 1)); i < n && chunks.length < cap; i++) {
    const m = tpl.createInstance("ch");
    m.position.set(pos.x, pos.y + 0.4, pos.z);
    m.scaling.setAll(size * (0.6 + Math.random() * 0.8));
    m.rotation.set(Math.random() * 6, Math.random() * 6, 0);
    const a = Math.random() * Math.PI * 2;
    chunks.push({ m, v: new B.Vector3(Math.cos(a) * power * Math.random(), power * (0.6 + Math.random() * 0.8), Math.sin(a) * power * Math.random()), av: new B.Vector3(Math.random() * 12, Math.random() * 12, 0), life: 1.8 + Math.random() });
  }
}

// ---------- Impacto: chispas, pedazos y deformación breve, según la fuente del daño ----------
// Clave = dmgSrc de main.ts (arma, "embestida", "pelota" o "" = genérico). Verde fósforo = disparos propios; el rojo queda para el enemigo.
// shake va a camera shake (main lo eleva al cuadrado: 0.1 casi no se nota, 0.25 ya es un golpe); squash 0..1 = cuánto se aplasta el bicho.
const IMPACT: Record<string, { spark: string; chips: number; shake: number; squash: number }> = {
  "": { spark: "#ffe45c", chips: 1, shake: 0.08, squash: 0.5 },
  gomitas: { spark: "#ff9bd4", chips: 1, shake: 0.1, squash: 0.6 },
  clips: { spark: "#ffffff", chips: 1, shake: 0.12, squash: 0.5 },
  tesla: { spark: "#7de8ff", chips: 0, shake: 0.18, squash: 0.4 },
  chispazo: { spark: "#9be7ff", chips: 1, shake: 0.18, squash: 0.5 },
  agua: { spark: "#9be7ff", chips: 0, shake: 0, squash: 0.3 },
  globos: { spark: "#9be7ff", chips: 0, shake: 0.1, squash: 0.5 },
  chispero: { spark: "#ffb347", chips: 0, shake: 0, squash: 0.2 },
  anillo: { spark: "#ffb347", chips: 0, shake: 0, squash: 0.2 },
  petardos: { spark: "#ffb347", chips: 2, shake: 0.12, squash: 0.8 },
  embestida: { spark: "#ffd27a", chips: 3, shake: 0.25, squash: 1 },
  pelota: { spark: "#ffd27a", chips: 4, shake: 0.4, squash: 1 },
  trompo: { spark: "#d8dde8", chips: 2, shake: 0.2, squash: 0.55 },
  sierra: { spark: "#ffb347", chips: 2, shake: 0.22, squash: 0.5 },
  pala: { spark: "#ffd27a", chips: 3, shake: 0.28, squash: 0.85 },
};
const SQ_T = 0.18;
const squashes = new Map<B.AbstractMesh, { t: number; k: number; b: B.Vector3 }>(); // b = escala de base del nodo
const calm = () => document.body.classList.contains("calm"); // "Reducir parpadeos": sin chispas ni destello

/** Golpe a un bicho: devuelve la sacudida de cámara que le corresponde al arma. */
export function impact(m: B.AbstractMesh, at: B.Vector3, color: string, size: number, src: string, crit: boolean, boss: boolean): number {
  const o = IMPACT[src] ?? IMPACT[""];
  squashes.set(m, { t: SQ_T, k: o.squash * (crit ? 1.4 : 1) * (boss ? 0.2 : 1), b: squashes.get(m)?.b ?? m.scaling.clone() }); // los jefes casi no se inmutan
  if (!calm()) {
    FX.flash(at, size);
    if (crit || Math.random() < 0.4) burst(at, { n: crit ? 16 : 7, color: o.spark, size: [0.12, 0.3], power: [4, 10], life: [0.2, 0.42], gravity: -18 });
  }
  // Pedazos del caparazón: pocos y solo si no hay ya muchos en el aire (hordas)
  const n = crit ? o.chips + 2 : o.chips;
  if (n && (src === "embestida" || src === "pelota" || (Math.random() < 0.35 && chunks.length < 140))) debris(at, color, n, 4 + o.shake * 14, 0.4);
  return o.shake * (crit ? 1.4 : 1) * (boss ? 1.3 : 1);
}

/** Cámara lenta: las partículas del pool avanzan a k veces su velocidad (1 = normal). */
export function fxSpeed(k: number) {
  const s = 0.01 * k;
  for (const ps of pool) ps.updateSpeed = s;
  motes.updateSpeed = flies.updateSpeed = petals.updateSpeed = s;
}

// ---------- Marcas en el piso (quemaduras, neumáticos) ----------
type Mark = { m: B.InstancedMesh; life: number; s: number };
const marks: Mark[] = [];
const markTpl = (kind: "scorch" | "skid") => template(kind, () => {
  const d = kind === "scorch"
    ? B.MeshBuilder.CreateDisc("s", { radius: 1, tessellation: 20 })
    : B.MeshBuilder.CreatePlane("s", { width: 0.22, height: 0.5 });
  d.rotation.x = Math.PI / 2;
  const mm = d.material = pbr(kind + "Mat", { color: kind === "scorch" ? "#3a3026" : "#4a4136", rough: 1, alpha: kind === "scorch" ? 0.4 : 0.3 });
  mm.zOffset = -4; mm.disableDepthWrite = true; // las marcas se apilan a 0,00002 de distancia: sin escribir profundidad no pelean entre sí ni con el piso
  return [d];
});

export function mark(kind: "scorch" | "skid", x: number, z: number, rotY: number, s: number, life: number) {
  if (marks.length > 500) { const old = marks.shift()!; old.m.dispose(); }
  const m = markTpl(kind).createInstance("mk");
  m.position.set(x, 0.03 + marks.length * 0.00002, z);
  m.rotation.y = rotY;
  m.scaling.setAll(s);
  marks.push({ m, life, s });
}

// Charco con el color de los ojos del insecto (levemente emisivo para que se lea de noche)
const splatTpl = (c: string) => template("splat" + c, () => {
  const d = B.MeshBuilder.CreateDisc("s", { radius: 1, tessellation: 9 });
  d.rotation.x = Math.PI / 2;
  const sm = d.material = pbr("splat" + c, { color: c, rough: 0.2, emissive: B.Color3.FromHexString(c).scale(0.25).toHexString(), alpha: 0.8 });
  sm.zOffset = -4; sm.disableDepthWrite = true;
  return [d];
});
export function splat(x: number, z: number, color: string, s: number) {
  if (marks.length > 500) { const old = marks.shift()!; old.m.dispose(); }
  const m = splatTpl(color).createInstance("sp");
  m.position.set(x, 0.035 + marks.length * 0.00002, z);
  m.rotation.y = Math.random() * 6.3;
  m.scaling.set(s * (0.8 + Math.random() * 0.5), 1, s * (0.6 + Math.random() * 0.4));
  marks.push({ m, life: 12, s });
}

// Cadáveres patas arriba: el propio nodo del enemigo (con sus patas hijas) sin física, que se encoge al final
type Corpse = { m: B.InstancedMesh; life: number; anim?: (dt: number) => void };
const corpses: Corpse[] = [];
// anim (jefes GLB): el cadáver no se voltea, su propia animación de muerte (Enemy.animate) corre cada cuadro
export function corpse(m: B.InstancedMesh, h: number, anim?: (dt: number) => void) {
  if (corpses.length > 60) corpses.shift()!.m.dispose();
  if (anim) { corpses.push({ m, life: 6, anim }); return; }
  m.rotationQuaternion = (m.rotationQuaternion ?? B.Quaternion.Identity()).multiply(B.Quaternion.RotationAxis(B.Axis.Z, Math.PI));
  m.position.y = h;
  corpses.push({ m, life: 5 + Math.random() * 2 });
}

export function tickFx(dt: number) {
  // Deformación: aplasta y estira, y vuelve a la forma en 3 pasos (a pocos cuadros, como el resto de la animación)
  for (const [m, q] of squashes) {
    if (m.isDisposed()) { squashes.delete(m); continue; }
    q.t -= dt;
    const p = q.t > 0 ? Math.ceil((q.t / SQ_T) * 3) / 3 : 0;
    m.scaling.set(q.b.x * (1 + 0.22 * q.k * p), q.b.y * (1 - 0.32 * q.k * p), q.b.z * (1 + 0.22 * q.k * p));
    if (q.t <= 0) squashes.delete(m);
  }
  for (let i = corpses.length - 1; i >= 0; i--) {
    const k = corpses[i];
    k.anim?.(dt);
    if ((k.life -= dt) < 1) k.m.scaling.setAll(Math.max(0.01, k.life));
    if (k.life <= 0) { k.m.dispose(); corpses.splice(i, 1); }
  }
  for (let i = chunks.length - 1; i >= 0; i--) {
    const c = chunks[i];
    c.v.y -= 25 * dt;
    c.m.position.addInPlace(c.v.scale(dt));
    c.m.rotation.addInPlace(c.av.scale(dt));
    if (c.m.position.y < 0.07) { c.m.position.y = 0.07; c.v.y *= -0.3; c.v.x *= 0.6; c.v.z *= 0.6; c.av.scaleInPlace(0.5); }
    if ((c.life -= dt) < 0.4) c.m.scaling.scaleInPlace(0.9);
    if (c.life <= 0) { c.m.dispose(); chunks.splice(i, 1); }
  }
  for (let i = marks.length - 1; i >= 0; i--) {
    const k = marks[i];
    k.life -= dt;
    if (k.life < 1.5) k.m.scaling.setAll(k.s * Math.max(0.01, k.life / 1.5));
    if (k.life <= 0) { k.m.dispose(); marks.splice(i, 1); }
  }
}

// ---------- Lluvia ----------
// Tres thin instances (una malla c/u, sin crear nada por gota): gotas = cajas finitas con material que recibe luz (solo brillan donde
// pega el faro o la luna), salpicaduras = discos que se abren al caer, charcos = discos oscuros que crecen con la humedad y se reciclan delante del auto.
const AREA = 18, TOP = 14, FALL = 24;
type Thin = { m: B.Mesh; buf: Float32Array; n: number };
let drops: Thin, splashes: Thin, puddles: Thin;
let dPos: Float32Array, sLife: Float32Array, sNext = 0, pData: Float32Array; // pData por charco: x, z, radio, umbral, aspecto
let wet = 0, rainUp = false;

function thin(geo: B.Mesh, mat: B.Material, n: number): Thin {
  const buf = new Float32Array(n * 16);
  for (let i = 0; i < n; i++) buf[i * 16] = buf[i * 16 + 5] = buf[i * 16 + 10] = buf[i * 16 + 15] = 1;
  geo.material = mat;
  geo.isPickable = false;
  geo.alwaysSelectAsActiveMesh = true; // las instancias se mueven fuera de la caja original
  geo.thinInstanceSetBuffer("matrix", buf, 16, false);
  geo.thinInstanceCount = 0;
  return { m: geo, buf, n };
}
const flatDisc = (name: string, tess: number) => { const d = B.MeshBuilder.CreateDisc(name, { radius: 1, tessellation: tess }, scene); d.rotation.x = Math.PI / 2; d.bakeCurrentTransformIntoVertices(); return d; };
const put = (t: Thin, i: number, x: number, y: number, z: number, sx = 1, sz = sx) => { const b = t.buf, o = i * 16; b[o] = sx; b[o + 10] = sz; b[o + 12] = x; b[o + 13] = y; b[o + 14] = z; };

function rainInit() {
  const nd = lowFx ? 120 : 260;
  drops = thin(B.MeshBuilder.CreateBox("rain", { width: 0.05, height: 0.7, depth: 0.05 }, scene), pbr("rainDrop", { color: "#dbe8f0", rough: 0.3, alpha: 0.55 }), nd);
  dPos = new Float32Array(nd * 3).fill(1e9);
  splashes = thin(flatDisc("splash", 8), pbr("rainSplash", { color: "#cfe0ea", rough: 0.3, alpha: 0.5 }), 40);
  for (let i = 0; i < splashes.n; i++) put(splashes, i, 0, -9, 0, 0);
  sLife = new Float32Array(splashes.n);
  puddles = thin(flatDisc("rainPuddle", 14), pbr("rainPuddle", { color: "#2a3640", rough: 0.03, metal: 0.2, alpha: 0.8 }), 18);
  pData = new Float32Array(puddles.n * 5).fill(1e9);
}

/** Llamar cada cuadro con la intensidad k 0..1 (0 = no llueve). p = auto, fwd = hacia dónde mira (la lluvia cae más adelante, donde pega el faro). */
export function tickRain(dt: number, p: B.Vector3, fwd: B.Vector3, k: number) {
  if (k < 0.01) { if (rainUp) rainHide(); return; }
  if (!drops) rainInit();
  rainUp = true;
  const prevWet = wet;
  wet = Math.min(1, wet + (dt * k) / RAIN.wetSecs);
  if (Math.abs(wet - prevWet) > 0.004) wetGround(wet);
  const cx = p.x + fwd.x * 6, cz = p.z + fwd.z * 6, n = Math.floor(drops.n * k * Math.min(G.fx, 1));
  for (let i = 0; i < n; i++) {
    let x = dPos[i * 3], y = dPos[i * 3 + 1] - FALL * dt, z = dPos[i * 3 + 2];
    if (y < 0.35 || Math.abs(x - cx) > AREA || Math.abs(z - cz) > AREA) {
      // Al tocar el piso cerca del auto, a veces salpica; después renace arriba (también si quedó fuera del área)
      if (y < 0.35 && Math.abs(x - p.x) < 12 && Math.abs(z - p.z) < 12 && Math.random() < 0.12) { const j = sNext++ % splashes.n; sLife[j] = 0.25; put(splashes, j, x, 0.07, z, 0.05); }
      x = cx + (Math.random() * 2 - 1) * AREA; z = cz + (Math.random() * 2 - 1) * AREA; y = TOP * (0.5 + Math.random() * 0.5);
    }
    dPos[i * 3] = x; dPos[i * 3 + 1] = y; dPos[i * 3 + 2] = z;
    put(drops, i, x, y, z);
  }
  drops.m.thinInstanceCount = n;
  drops.m.thinInstanceBufferUpdated("matrix");
  for (let j = 0; j < splashes.n; j++) {
    if (sLife[j] <= 0) continue;
    sLife[j] -= dt;
    const b = splashes.buf, o = j * 16, s = sLife[j] > 0 ? 0.3 * Math.sin(Math.PI * (1 - sLife[j] / 0.25)) : 0; // se abre y se cierra
    put(splashes, j, b[o + 12], 0.07, b[o + 14], s);
  }
  splashes.m.thinInstanceCount = splashes.n;
  splashes.m.thinInstanceBufferUpdated("matrix");
  // Charcos: cada uno aparece al pasar su umbral de humedad y crece hasta su radio; los que quedan lejos se mudan delante del auto
  const yaw = Math.atan2(fwd.x, fwd.z);
  for (let i = 0; i < puddles.n; i++) {
    const o = i * 5;
    if (Math.hypot(pData[o] - p.x, pData[o + 1] - p.z) > 55) {
      const a = pData[o] > 1e8 ? Math.random() * 6.3 : yaw + (Math.random() - 0.5) * 2.2, d = pData[o] > 1e8 ? 8 + Math.random() * 40 : 25 + Math.random() * 25;
      pData[o] = p.x + Math.sin(a) * d; pData[o + 1] = p.z + Math.cos(a) * d; pData[o + 2] = 1.2 + Math.random() * 2.3; pData[o + 3] = Math.random() * 0.6; pData[o + 4] = 0.6 + Math.random() * 0.4;
    }
    const s = pData[o + 2] * Math.min(1, Math.max(0, (wet - pData[o + 3]) / 0.4));
    put(puddles, i, pData[o], 0.045, pData[o + 1], s, s * pData[o + 4]);
  }
  puddles.m.thinInstanceCount = puddles.n;
  puddles.m.thinInstanceBufferUpdated("matrix");
}
function rainHide() { rainUp = false; for (const t of [drops, splashes, puddles]) t.m.thinInstanceCount = 0; }
/** Humedad inicial (lab): 0 seco .. 1 empapado, con charcos al máximo. */
export const rainWet = (w: number) => { wet = w; wetGround(w); };

let cShadows: Thin;
/** Sombras de contacto bajo el auto y cada enemigo (1 draw call por thin instances): anclan los cuerpos también bajo techo o con VAT. */
export function contactShadows(carPos: B.Vector3 | null, enemies: { pos: B.Vector3; def: { size: [number, number, number] } }[]) {
  if (!carPos) { if (cShadows) cShadows.m.thinInstanceCount = 0; return; }
  if (!cShadows) {
    const m = pbr("cShadowMat", { color: "#080c10", rough: 1, alpha: 0.44 });
    m.disableLighting = true; m.zOffset = -3; m.disableDepthWrite = true;
    const t = new B.DynamicTexture("cShadowTex", 32, scene, false);
    const c = t.getContext() as unknown as CanvasRenderingContext2D, g = c.createRadialGradient(16, 16, 2, 16, 16, 16);
    g.addColorStop(0, "#fff"); g.addColorStop(0.65, "#bbb"); g.addColorStop(1, "#000"); c.fillStyle = g; c.fillRect(0, 0, 32, 32); t.update();
    t.getAlphaFromRGB = true; m.opacityTexture = t;
    cShadows = thin(flatDisc("cShadow", 12), m, 260);
  }
  let k = 0;
  put(cShadows, k++, carPos.x, 0.032, carPos.z, 1.05, 1.35);
  for (let i = 0; i < enemies.length && k < cShadows.n; i++) {
    const e = enemies[i], p = e.pos, s = e.def.size, air = Math.max(0.45, 1 - Math.max(0, p.y - s[1] * 0.5) * 0.04);
    put(cShadows, k++, p.x, 0.031, p.z, s[0] * 0.65 * air, s[2] * 0.65 * air);
  }
  cShadows.m.thinInstanceCount = k;
  cShadows.m.thinInstanceBufferUpdated("matrix");
}

export function clearFx() {
  if (drops) { rainHide(); pData.fill(1e9); }
  if (cShadows) cShadows.m.thinInstanceCount = 0;
  wet = 0; wetGround(0);
  for (const c of chunks) c.m.dispose();
  for (const k of marks) k.m.dispose();
  for (const k of corpses) k.m.dispose();
  corpses.length = 0;
  squashes.clear();
  chunks.length = marks.length = 0;
}
