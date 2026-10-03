import * as B from "@babylonjs/core";
import { carModel, type CarKind, type CarModel, type CarOpts } from "./models";
import { shadows } from "./render";

const UP = B.Vector3.Up();
const ray = new B.PhysicsRaycastResult(), rayFrom = new B.Vector3(), rayTo = new B.Vector3();

export const CARS: Record<CarKind, { name: string; desc: string; cost: number; hp: number; speed: number; accel: number; turn: number; grip: number; ram: number; mass: number; size: [number, number, number] }> = {
  buggy: { name: "Buggy", desc: "Equilibrado. Salta bien, gira rápido.", cost: 0, hp: 150, speed: 15, accel: 32, turn: 3.2, grip: 10, ram: 3, mass: 1, size: [1.3, 0.7, 2.3] },
  monster: { name: "Monster Truck", desc: "Lento y tanque. Embestir hace +50%.", cost: 400, hp: 220, speed: 12.5, accel: 26, turn: 2.7, grip: 12, ram: 4.5, mass: 1.8, size: [1.8, 1.1, 2.4] },
  formula: { name: "Fórmula", desc: "Rapidísimo pero frágil.", cost: 550, hp: 110, speed: 19, accel: 40, turn: 3.6, grip: 14, ram: 2.4, mass: 0.8, size: [1.3, 0.55, 2.8] },
  tanque: { name: "Tanque de juguete", desc: "Blindado y pesado. Lento, pero embiste como un ladrillo.", cost: 800, hp: 300, speed: 10, accel: 18, turn: 2.3, grip: 18, ram: 5.5, mass: 2.6, size: [1.75, 0.9, 2.4] },
  carrera: { name: "Autito a fricción", desc: "Liviano y nervioso. Acelera como un resorte y derrapa en cada curva.", cost: 650, hp: 85, speed: 21, accel: 48, turn: 4.2, grip: 6, ram: 1.8, mass: 0.55, size: [1.1, 0.5, 2.1] },
  axel: { name: "Axel", desc: "Dos ruedas gigantes y una jaula en el medio. Rápido y ágil, pero frágil.", cost: 700, hp: 120, speed: 20, accel: 38, turn: 3.8, grip: 8, ram: 4, mass: 1.2, size: [1.9, 1.0, 1.7] },
  helado: { name: "Camión de helados", desc: "Lento y simpático. Suena su melodía mientras reparte golpes fríos.", cost: 650, hp: 180, speed: 13, accel: 24, turn: 2.8, grip: 11, ram: 3, mass: 1.4, size: [1.3, 0.95, 2.4] },
  combi: { name: "Combi", desc: "La furgoneta de la familia: mucho aguante, poca prisa y más tuercas por viaje.", cost: 900, hp: 280, speed: 11, accel: 20, turn: 2.4, grip: 14, ram: 4, mass: 2.2, size: [1.45, 1.0, 2.4] },
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
  // En el aire no hay control. Rayo corto hacia abajo (no v.y: subiendo una rampa v.y es grande y hay que poder doblar)
  const hh = mesh.getBoundingInfo().boundingBox.extendSize.y;
  rayFrom.copyFrom(mesh.position); rayTo.copyFrom(rayFrom); rayTo.y -= hh + 0.9; // en rampa el centro queda más alto que hh
  (mesh.getScene().getPhysicsEngine() as B.PhysicsEngineV2).raycastToRef(rayFrom, rayTo, ray, { ignoreBody: body });
  if (!ray.hasHit) return { fs, ls, grounded: false };

  const t = o.throttle;
  if (t > 0) { if (fs < o.speed * t) fs = Math.min(fs + o.accel * t * dt, o.speed * t); }
  else if (t < 0) fs = fs > 0 ? fs - o.accel * 1.5 * dt : Math.max(fs + o.accel * t * dt, -o.speed * 0.5);
  else fs *= 1 - Math.min(1, 1.5 * dt);
  if (fs > o.speed) fs -= (fs - o.speed) * Math.min(1, 3 * dt);
  ls *= Math.max(0, 1 - o.grip * dt);

  const nv = fwd.scale(fs).addInPlace(right.scale(ls));
  nv.y = v.y;
  body.setLinearVelocity(nv);
  body.setAngularVelocity(new B.Vector3(0, o.steer * o.turn * B.Scalar.Clamp(fs / 4, -1, 1), 0));
  return { fs, ls, grounded: true };
}

export class Car {
  root: B.Mesh;
  vis: B.TransformNode;
  model: CarModel;
  body: B.PhysicsBody;
  agg: B.PhysicsAggregate;
  def;
  private lastFs = 0;

  private paintBase: B.Color3;

  constructor(scene: B.Scene, public kind: CarKind, opts: CarOpts = {}) {
    const d = (this.def = CARS[kind]);
    const [w, h, l] = d.size;
    this.root = B.MeshBuilder.CreateBox("car", { width: w, height: h, depth: l }, scene);
    this.root.isVisible = false;
    this.root.position.set(0, h / 2 + 0.3, 0);
    this.vis = new B.TransformNode("carVis", scene);
    this.vis.parent = this.root;
    this.model = carModel(kind, opts);
    this.paintBase = this.model.paint.albedoColor.clone();
    this.model.body.parent = this.vis;
    const r = Math.max(...this.model.wheels.map((x) => x.r));
    this.model.body.position.y = r - h / 2;
    shadows.addShadowCaster(this.model.body, true);

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

  // Desgaste: la pintura se opaca y ensucia a medida que pierde vida (0..1)
  wear(hpFrac: number) {
    const w = 1 - Math.max(0, hpFrac);
    B.Color3.LerpToRef(this.paintBase, new B.Color3(0.03, 0.028, 0.025), w * 0.55, this.model.paint.albedoColor);
    this.model.paint.roughness = 0.22 + w * 0.6;
  }

  // Solo visual: ruedas que giran y doblan, carrocería que se inclina
  animate(dt: number, steer: number, fs: number, maxSpeed: number) {
    for (const wh of this.model.wheels) {
      wh.m.rotation.x += (fs * dt) / wh.r;
      if (wh.front) wh.m.rotation.y = B.Scalar.Lerp(wh.m.rotation.y, steer * 0.45, 1 - Math.exp(-12 * dt));
    }
    const acc = (fs - this.lastFs) / Math.max(dt, 1e-3);
    this.lastFs = fs;
    const k = 1 - Math.exp(-8 * dt);
    this.vis.rotation.z = B.Scalar.Lerp(this.vis.rotation.z, -steer * B.Scalar.Clamp(fs / maxSpeed, -1, 1) * 0.1, k);
    // Cabeceo según la trayectoria (rampas y saltos): el colisionador no vuelca, la carrocería sí apunta hacia donde va
    const vy = this.body.getLinearVelocity().y, pitch = Math.abs(fs) > 2 ? B.Scalar.Clamp(-Math.atan(vy / fs), -0.5, 0.5) : 0;
    this.vis.rotation.x = B.Scalar.Lerp(this.vis.rotation.x, B.Scalar.Clamp(-acc * 0.004, -0.08, 0.08) + pitch, k);
  }

  dispose() { this.agg.dispose(); this.root.dispose(); }
}
