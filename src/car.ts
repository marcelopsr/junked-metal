import * as B from "@babylonjs/core";
import { carModel, type CarKind, type CarModel, type CarOpts } from "./models";
import { shadows } from "./render";
import { BAL } from "./balance";
import { FX } from "./fx";

// Precio y manejo de cada auto salen de balance.json (tabla autos)
const stats = (k: CarKind) => { const a = BAL.autos[k]; return { cost: a.precio, hp: a.vida, speed: a.velocidad, accel: a.aceleracion, turn: a.giro, grip: a.agarre, ram: a.embestida, mass: a.masa }; };

const UP = B.Vector3.Up();
const ray = new B.PhysicsRaycastResult(), rayFrom = new B.Vector3(), rayTo = new B.Vector3();
const sparkPos = new B.Vector3();
const tmpV = new B.Vector3();

export const CARS: Record<CarKind, { name: string; desc: string; cost: number; hp: number; speed: number; accel: number; turn: number; grip: number; ram: number; mass: number; size: [number, number, number]; drive?: "rwd" | "fwd" | "awd" }> = {
  buggy: { name: "El Divorciado", desc: "Se quedó con el auto y nada más. Equilibrado: salta bien y gira rápido.", ...stats("buggy"), size: [1.3, 0.7, 2.3], drive: "rwd" },
  monster: { name: "El Loco Cuarentón", desc: "Se compró ruedas gigantes para sentirse joven. Lento y duro: embestir hace +50%.", ...stats("monster"), size: [1.8, 1.1, 2.4], drive: "awd" },
  formula: { name: "El Apurado", desc: "Llega tarde a todo, por eso va siempre a fondo. Rapidísimo pero frágil.", ...stats("formula"), size: [1.3, 0.55, 2.8], drive: "rwd" },
  tanque: { name: "El Suegro", desc: "Llega, se instala y no hay quien lo mueva. Blindado y pesado: embiste como un ladrillo.", ...stats("tanque"), size: [1.75, 0.9, 2.4], drive: "awd" },
  carrera: { name: "El Sin Seguro", desc: "Ninguna compañía le quiso hacer póliza, y con razón. Liviano y nervioso: derrapa en cada curva.", ...stats("carrera"), size: [1.1, 0.5, 2.1], drive: "rwd" },
  axel: { name: "El Sin Licencia", desc: "Dos ruedas, cero carnet y mucha confianza. Rápido y ágil, pero frágil.", ...stats("axel"), size: [1.9, 1.0, 1.7], drive: "rwd" },
  helado: { name: "El Tío del Helado", desc: "Pone musiquita, sonríe y reparte golpes fríos. Lento pero aguantador.", ...stats("helado"), size: [1.3, 0.95, 2.4], drive: "fwd" },
  combi: { name: "El Tío Raro", desc: "Nadie sabe a qué se dedica, pero siempre vuelve con tuercas de más. Mucho aguante, poca prisa.", ...stats("combi"), size: [1.45, 1.0, 2.4], drive: "rwd" },
};

// Manejo arcade sobre un cuerpo Havok: la física resuelve choques,
// nosotros decidimos velocidad hacia adelante, agarre lateral y giro.
export function drive(body: B.PhysicsBody, mesh: B.AbstractMesh, dt: number,
  o: { throttle: number; steer: number; speed: number; accel: number; turn: number; grip: number }) {
  const v = body.getLinearVelocity();
  const fwd = mesh.forward.clone(); fwd.y = 0; fwd.normalize();
  const right = B.Vector3.Cross(UP, fwd);
  let fs = B.Vector3.Dot(v, fwd);
  let ls = B.Vector3.Dot(v, right);

  // Detección de impacto diegético contra obstáculos del entorno (muros, macetas, árboles)
  const bAny = body as unknown as { _prevV?: B.Vector3; _throttle?: number };
  bAny._throttle = o.throttle;
  let impactSpeed = 0;
  let impactPan = 0;
  if (bAny._prevV) {
    const dvX = v.x - bAny._prevV.x;
    const dvZ = v.z - bAny._prevV.z;
    const dv = Math.hypot(dvX, dvZ);
    if (dv > 4.0) {
      impactSpeed = dv;
      impactPan = B.Scalar.Clamp((dvX * right.x + dvZ * right.z) / 4, -1, 1);
    }
  }

  // En el aire no hay control. Rayo corto hacia abajo (no v.y: subiendo una rampa v.y es grande y hay que poder doblar)
  const hh = mesh.getBoundingInfo().boundingBox.extendSize.y;
  rayFrom.copyFrom(mesh.position); rayTo.copyFrom(rayFrom); rayTo.y -= hh + 0.9; // en rampa el centro queda más alto que hh
  (mesh.getScene().getPhysicsEngine() as B.PhysicsEngineV2).raycastToRef(rayFrom, rayTo, ray, { ignoreBody: body });
  if (!ray.hasHit) {
    if (bAny._prevV) bAny._prevV.copyFrom(v);
    return { fs, ls, grounded: false, slope: 0, impactSpeed, impactPan };
  }

  const ny = ray.hitNormal.y;
  const slope = Math.min(1, Math.sqrt(Math.max(0, 1 - ny * ny))); // 0 = plano, ~1 = rampa empinada

  const t = o.throttle;
  if (t > 0) { if (fs < o.speed * t) fs = Math.min(fs + o.accel * t * dt, o.speed * t); }
  else if (t < 0) fs = fs > 0 ? fs - o.accel * 1.5 * dt : Math.max(fs + o.accel * t * dt, -o.speed * 0.5);
  else fs *= 1 - Math.min(1, 1.5 * dt);
  if (fs > o.speed) fs -= (fs - o.speed) * Math.min(1, 3 * dt);
  ls *= Math.max(0, 1 - o.grip * dt);

  // Fricción mecánica en diferencial/transmisión al acelerar fuerte desde parado o patinar
  if (t > 0.8 && Math.abs(fs) < 1.5 && Math.random() < 0.2) {
    sparkPos.set(mesh.position.x - fwd.x * 0.4, mesh.position.y + 0.15, mesh.position.z - fwd.z * 0.4);
    FX.transmissionSpark(sparkPos);
  }

  const nv = fwd.scale(fs).addInPlace(right.scale(ls));
  nv.y = v.y;
  body.setLinearVelocity(nv);
  if (!bAny._prevV) bAny._prevV = new B.Vector3();
  bAny._prevV.copyFrom(nv);
  body.setAngularVelocity(new B.Vector3(0, o.steer * o.turn * B.Scalar.Clamp(fs / 4, -1, 1), 0));
  return { fs, ls, grounded: true, slope, impactSpeed, impactPan };
}

export class Car {
  root: B.Mesh;
  vis: B.TransformNode;
  model: CarModel;
  body: B.PhysicsBody;
  agg: B.PhysicsAggregate;
  def;
  torqueRoll = 0;
  private steerRoll = 0;
  private lastFs = 0;

  private paintBase: B.Color3;

  constructor(scene: B.Scene, public kind: CarKind, opts: CarOpts = {}, at?: { x: number; z: number; yaw: number }) {
    const d = (this.def = CARS[kind]);
    const [w, h, l] = d.size;
    this.root = B.MeshBuilder.CreateBox("car", { width: w, height: h, depth: l }, scene);
    this.root.isVisible = false;
    this.root.position.set(at?.x ?? 0, h / 2 + 0.3, at?.z ?? 0);
    if (at) this.root.rotationQuaternion = B.Quaternion.FromEulerAngles(0, at.yaw, 0); // antes del PhysicsAggregate (el cuerpo toma la pose de la malla al crearse)
    this.vis = new B.TransformNode("carVis", scene);
    this.vis.parent = this.root;
    this.model = carModel(kind, opts);
    this.paintBase = this.model.paint.albedoColor.clone();
    this.model.body.parent = this.vis;
    const groundY = Math.min(...this.model.wheels.map((x) => x.m.position.y - x.r));
    this.model.body.position.y = -groundY - h / 2;
    for (const c of this.model.cast) shadows.addShadowCaster(c);

    this.agg = new B.PhysicsAggregate(this.root, B.PhysicsShapeType.BOX,
      { mass: d.mass, friction: 0.2, restitution: 0.1, extents: new B.Vector3(w, h, l) }, scene);
    this.body = this.agg.body;
    this.setMass(d.mass);
  }

  // Havok reemplaza TODAS las propiedades de masa en cada llamada: siempre mandar la inercia.
  // Inercia 0 en X/Z: nunca vuelca (arcade). El centro de masa NO se desplaza: combinado con
  // setLinearVelocity por frame (drive) hace que Havok resuelva mal el contacto y el auto se hunde.
  setMass(mass: number) {
    this.body.setMassProperties({ mass, inertia: new B.Vector3(0, mass, 0), centerOfMass: B.Vector3.Zero() });
  }

  get pos() { return this.root.position; }
  get speed() { this.body.getLinearVelocityToRef(tmpV); return Math.hypot(tmpV.x, tmpV.z); }

  // Desgaste: la pintura se opaca y ensucia a medida que pierde vida (0..1)
  wear(hpFrac: number) {
    const w = 1 - Math.max(0, hpFrac);
    B.Color3.LerpToRef(this.paintBase, new B.Color3(0.03, 0.028, 0.025), w * 0.55, this.model.paint.albedoColor);
    this.model.paint.roughness = 0.5 + w * 0.4;
  }

  // Solo visual: ruedas que giran y doblan, carrocería que se inclina
  private lastVy = 0; private bounce = 0; private bT = 0;
  animate(dt: number, steer: number, fs: number, maxSpeed: number, throttle?: number) {
    for (const wh of this.model.wheels) {
      wh.m.rotation.x += (fs * dt) / wh.r;
      if (wh.front) wh.m.rotation.y = B.Scalar.Lerp(wh.m.rotation.y, steer * 0.45, 1 - Math.exp(-12 * dt));
    }
    const acc = (fs - this.lastFs) / Math.max(dt, 1e-3);
    this.lastFs = fs;

    // Torsión reactiva del chasis (torque twist al acelerar fuerte desde parado/baja velocidad)
    const fwd = throttle !== undefined ? throttle : ((this.body as unknown as { _throttle?: number })._throttle ?? 0);
    this.body.getLinearVelocityToRef(tmpV);
    const spd = Math.hypot(tmpV.x, tmpV.z);
    const isLaunching = fwd > 0.8 && spd < 2.0;
    const driveMul = (this.def as { drive?: string }).drive === "rwd" ? 1.25 : 1.0;
    const targetTorqueRoll = isLaunching ? fwd * 0.06 * driveMul : 0;
    const damp = Math.max(0, Math.min(1, dt > 0 ? 12 * dt : 0.2));
    this.torqueRoll += (targetTorqueRoll - this.torqueRoll) * damp;

    const k = 1 - Math.exp(-8 * dt);
    this.steerRoll = B.Scalar.Lerp(this.steerRoll, -steer * B.Scalar.Clamp(fs / maxSpeed, -1, 1) * 0.16, k);
    this.vis.rotation.z = this.steerRoll + this.torqueRoll;

    // Cabeceo según la trayectoria (rampas y saltos): el colisionador no vuelca, la carrocería sí apunta hacia donde va
    const vy = tmpV.y, pitch = Math.abs(fs) > 2 ? B.Scalar.Clamp(-Math.atan(vy / fs), -0.5, 0.5) : 0;
    this.vis.rotation.x = B.Scalar.Lerp(this.vis.rotation.x, B.Scalar.Clamp(-acc * 0.004, -0.08, 0.08) + pitch, k);
    // Rebote al aterrizar: se aplasta y recupera con un resorte amortiguado
    if (this.lastVy < -4 && vy > -1) { this.bounce = Math.min(0.3, -this.lastVy * 0.03); this.bT = 0; }
    this.lastVy = vy;
    this.bT += dt; this.bounce *= Math.exp(-5 * dt);
    const sq = this.bounce * Math.cos(this.bT * 18);
    this.vis.scaling.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
  }

  dispose() { this.agg.dispose(); this.root.dispose(); }
}
