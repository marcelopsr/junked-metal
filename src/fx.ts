import * as B from "@babylonjs/core";
import { box, template } from "./models";
import { M, pbr, TEX } from "./render";

// Partículas con un pool de sistemas reutilizables (cero creación por golpe).
let scene: B.Scene;
let tex: B.Texture;
const pool: B.ParticleSystem[] = [];
let next = 0;
// Ambiente (polvo en el haz, luciérnagas): sistemas propios, fuera del pool de golpes
let motes: B.ParticleSystem, flies: B.ParticleSystem;
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
export function ambient(kind: "mote" | "fly", p: B.Vector3) {
  const ps = kind === "mote" ? motes : flies;
  (ps.emitter as B.Vector3).copyFrom(p);
  ps.manualEmitCount = kind === "mote" ? 2 : 1;
}

export function initFx(s: B.Scene, low: boolean) {
  scene = s;
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
  ps.manualEmitCount = o.n;
}

export const FX = {
  hit: (p: B.Vector3) => burst(p, { n: 6, color: "#ffe08a", size: [0.1, 0.25], power: [3, 7], life: [0.15, 0.3] }),
  death: (p: B.Vector3, big = false) => burst(p, { n: big ? 80 : 14, color: "#ffb347", color2: "#ff5a36", size: big ? [0.6, 1.6] : [0.2, 0.5], power: big ? [8, 18] : [3, 8], life: [0.3, 0.7] }),
  explosion: (p: B.Vector3, r: number) => {
    burst(p, { n: 60, color: "#ffd166", color2: "#ff4d00", size: [0.5 * r, 1.2 * r], power: [r * 2, r * 5], life: [0.2, 0.5], gravity: 2 });
    burst(p, { n: 25, color: "#555555", size: [0.8 * r, 1.6 * r], power: [1, r * 2], life: [0.6, 1.2], gravity: 3, add: false });
  },
  dust: (p: B.Vector3) => burst(p, { n: 2, color: "#b8a27a", size: [0.3, 0.7], power: [0.5, 1.5], life: [0.4, 0.8], gravity: 1, add: false }),
  xp: (p: B.Vector3) => burst(p, { n: 5, color: "#9be7ff", size: [0.1, 0.25], power: [1, 3], life: [0.2, 0.4] }),
  smoke: (p: B.Vector3, dark = false) => burst(p, { n: 2, color: dark ? "#2b2b2b" : "#8a8a8a", size: [0.5, 1.1], power: [0.5, 1.5], life: [0.8, 1.4], gravity: 3, add: false }),
  sparks: (p: B.Vector3) => burst(p, { n: 8, color: "#ffd27a", size: [0.05, 0.14], power: [4, 9], life: [0.2, 0.45], gravity: -20 }),
  // Destello blanco breve sobre el enemigo golpeado
  flash: (p: B.Vector3, s: number) => burst(p, { n: 1, color: "#ffffff", size: [s * 0.9, s * 1.1], power: [0, 0], life: [0.05, 0.07], gravity: 0 }),
  slam: (p: B.Vector3, r: number) => burst(p, { n: 120, color: "#c9b38a", size: [1, 2.5], power: [r * 1.5, r * 3], life: [0.5, 1], gravity: 2, add: false }),
};

// ---------- Restos con física simple (sin Havok: son decorativos) ----------
type Chunk = { m: B.InstancedMesh; v: B.Vector3; av: B.Vector3; life: number };
const chunks: Chunk[] = [];
const chunkTpl = (c: string) => template("chunk" + c, () => [box(0.3, 0.14, 0.24, M.plastic(c), [0, 0, 0])]);

export function debris(pos: B.Vector3, color: string, n: number, power = 6, size = 1) {
  const tpl = chunkTpl(color);
  for (let i = 0; i < n && chunks.length < 240; i++) {
    const m = tpl.createInstance("ch");
    m.position.set(pos.x, pos.y + 0.4, pos.z);
    m.scaling.setAll(size * (0.6 + Math.random() * 0.8));
    m.rotation.set(Math.random() * 6, Math.random() * 6, 0);
    const a = Math.random() * Math.PI * 2;
    chunks.push({ m, v: new B.Vector3(Math.cos(a) * power * Math.random(), power * (0.6 + Math.random() * 0.8), Math.sin(a) * power * Math.random()), av: new B.Vector3(Math.random() * 12, Math.random() * 12, 0), life: 1.8 + Math.random() });
  }
}

// ---------- Marcas en el piso (quemaduras, neumáticos) ----------
type Mark = { m: B.InstancedMesh; life: number; s: number };
const marks: Mark[] = [];
const markTpl = (kind: "scorch" | "skid") => template(kind, () => {
  const d = kind === "scorch"
    ? B.MeshBuilder.CreateDisc("s", { radius: 1, tessellation: 14 })
    : B.MeshBuilder.CreatePlane("s", { width: 0.22, height: 0.5 });
  d.rotation.x = Math.PI / 2;
  d.material = pbr(kind + "Mat", { color: kind === "scorch" ? "#0d0b09" : "#1a1714", rough: 1, alpha: kind === "scorch" ? 0.75 : 0.55 });
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
  d.material = pbr("splat" + c, { color: c, rough: 0.2, emissive: B.Color3.FromHexString(c).scale(0.25).toHexString(), alpha: 0.8 });
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
type Corpse = { m: B.InstancedMesh; life: number };
const corpses: Corpse[] = [];
export function corpse(m: B.InstancedMesh, h: number) {
  if (corpses.length > 60) corpses.shift()!.m.dispose();
  m.rotationQuaternion = (m.rotationQuaternion ?? B.Quaternion.Identity()).multiply(B.Quaternion.RotationAxis(B.Axis.Z, Math.PI));
  m.position.y = h;
  corpses.push({ m, life: 5 + Math.random() * 2 });
}

export function tickFx(dt: number) {
  for (let i = corpses.length - 1; i >= 0; i--) {
    const k = corpses[i];
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

export function clearFx() {
  for (const c of chunks) c.m.dispose();
  for (const k of marks) k.m.dispose();
  for (const k of corpses) k.m.dispose();
  corpses.length = 0;
  chunks.length = marks.length = 0;
}
