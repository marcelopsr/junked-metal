import * as B from "@babylonjs/core";
import { PhysicsShape, PhysicsShapeBox, PhysicsShapeCylinder, PhysicsShapeSphere } from "@babylonjs/core/Physics/v2/physicsShape.js"; // fuera del barril bjs.ts (compartido, solo del orquestador)
import { PhysicsEventType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin.js";
import { box, cyl, merge, sph } from "../models";
import { M, pbr, shadows } from "../render";
import { FREE } from "../sfx";
import { decal, scene, stat, undo } from "./common";
import type { Barrio } from "./libre";

// Free Roam, juguetes con física en la PLAZA (r 40, fuente r 12): pista de bolos al oeste (10 pinos), arco de fútbol al este con pelota, conos en hilera,
// pelotas grandes, una pirámide y una torre de bloques de construcción, cajas apiladas. Cuerpos Havok dinámicos y livianos (masa 0,03-0,12 contra 1 del buggy: el auto los empuja sin frenarse).
// Una fuente fusionada por tipo + instancias, UN solo PhysicsShape por tipo compartido, 42 cuerpos como tope. Se duermen solos (Havok) al quedar quietos.
// Reseteo: un juguete fuera de su sitio vuelve a él si la cámara se aleja a más de 90 m o si lleva 20 s sin verse (revisión cada 0,5 s). Generador local: no hay azar (todo fijo).
// Libres: spawn del auto (0,-20), atajos NE/SE (bot de paseo: (24,16)->(34,46) y (20,-20)->(41,-41)), farolas de la plaza (r 34) y el cartel (10,10). Pose ANTES del PhysicsBody.

type Kind = { src: B.Mesh; shape: PhysicsShape; mass: number; inertia: B.Vector3; snd: 0 | 1 | 2 };
type Toy = { m: B.InstancedMesh; body: B.PhysicsBody; x: number; y: number; z: number; ry: number; off: number; tp: number };

function build(_cx: number, _cz: number) {  const orange = M.plastic("#f97316"), white = M.plastic("#f4efe2"), red = M.plastic("#e53935"), blue = M.plastic("#1e66d0");
  const src = (n: string, parts: B.Mesh[]) => { const m = merge(n, parts); m.position.y = -500; m.isPickable = false; shadows.addShadowCaster(m); return m; };
  const mat = { friction: 0.45, restitution: 0.35 };
  const shapes: PhysicsShape[] = [];
  const sh = <T extends PhysicsShape>(s: T, restitution = mat.restitution, friction = mat.friction) => { s.material = { friction, restitution }; shapes.push(s); return s; };
  const Z0 = B.Vector3.Zero();
  // Inercias (masa e inercia siempre juntas): caja, cilindro vertical, esfera
  const iBox = (m: number, w: number, h: number, d: number) => new B.Vector3((m / 12) * (h * h + d * d), (m / 12) * (w * w + d * d), (m / 12) * (w * w + h * h));
  const iCyl = (m: number, r: number, h: number) => new B.Vector3((m / 12) * (3 * r * r + h * h), 0.5 * m * r * r, (m / 12) * (3 * r * r + h * h));

  // --- Tipos (origen = centro del colisionador)
  const cone: Kind = { src: src("juguCono", [cyl(0.1, 0.7, 1, orange, [0, 0, 0]), cyl(0.36, 0.5, 0.18, white, [0, 0.08, 0]), box(0.9, 0.06, 0.9, orange, [0, -0.47, 0])]),
    shape: sh(new PhysicsShapeCylinder(new B.Vector3(0, -0.5, 0), new B.Vector3(0, 0.5, 0), 0.36, scene)), mass: 0.05, inertia: iCyl(0.05, 0.36, 1), snd: 0 };
  const pin: Kind = { src: src("juguPino", [cyl(0.5, 0.8, 0.6, white, [0, -0.45, 0], undefined, 8), cyl(0.3, 0.5, 0.55, white, [0, 0.1, 0], undefined, 8), cyl(0.52, 0.52, 0.1, red, [0, -0.2, 0], undefined, 8), sph(0.5, white, [0, 0.55, 0], undefined, 4)]),
    shape: sh(new PhysicsShapeCylinder(new B.Vector3(0, -0.75, 0), new B.Vector3(0, 0.75, 0), 0.26, scene)), mass: 0.06, inertia: iCyl(0.06, 0.26, 1.5), snd: 0 };
  const ball = (n: string, d: number, c: B.Material, mass: number): Kind => ({ src: src(n, [sph(d, c, [0, 0, 0], undefined, 6), cyl(d + 0.03, d + 0.03, d * 0.16, white, [0, 0, 0], undefined, 12)]), // franja ecuatorial: se nota que rueda
    shape: sh(new PhysicsShapeSphere(Z0, d / 2, scene), 0.6), mass, inertia: new B.Vector3(1, 1, 1).scale(0.4 * mass * (d / 2) ** 2), snd: 1 });
  const beach = ball("juguPelotaA", 1.8, blue, 0.08), soccer = ball("juguPelotaF", 1.6, M.plastic("#f4efe2"), 0.06), beachB = ball("juguPelotaB", 2, red, 0.1);
  const BS = 0.8, blockShape = sh(new PhysicsShapeBox(Z0, B.Quaternion.Identity(), new B.Vector3(BS, BS, BS), scene), 0, 0.9); // pilas estables: sin rebote y con rozamiento alto
  const blocks = ["#e53935", "#1e66d0", "#f2c230", "#43a047"].map((c, i): Kind => { const mt = M.plastic(c);
    return { src: src("juguBloque" + i, [box(BS, BS, BS, mt, [0, 0, 0]), cyl(0.3, 0.3, 0.12, mt, [-0.2, BS / 2 + 0.05, -0.2], undefined, 8), cyl(0.3, 0.3, 0.12, mt, [0.2, BS / 2 + 0.05, -0.2], undefined, 8), cyl(0.3, 0.3, 0.12, mt, [-0.2, BS / 2 + 0.05, 0.2], undefined, 8), cyl(0.3, 0.3, 0.12, mt, [0.2, BS / 2 + 0.05, 0.2], undefined, 8)]),
      shape: blockShape, mass: 0.3, inertia: iBox(0.3, BS, BS, BS), snd: 2 }; });
  const CS = 1.1, wood = pbr("juguCaja", { color: "#c8964f", rough: 0.7 }), woodD = pbr("juguCajaB", { color: "#7a5426", rough: 0.8 });
  const crate: Kind = { src: src("juguCaja", [box(CS, CS, CS, wood, [0, 0, 0]), box(CS + 0.04, 0.14, CS + 0.04, woodD, [0, CS / 2 - 0.07, 0]), box(CS + 0.04, 0.14, CS + 0.04, woodD, [0, -CS / 2 + 0.07, 0]), box(0.14, CS + 0.04, CS + 0.04, woodD, [CS / 2 - 0.07, 0, 0]), box(0.14, CS + 0.04, CS + 0.04, woodD, [-CS / 2 + 0.07, 0, 0])]),
    shape: sh(new PhysicsShapeBox(Z0, B.Quaternion.Identity(), new B.Vector3(CS, CS, CS), scene), 0, 0.9), mass: 0.4, inertia: iBox(0.4, CS, CS, CS), snd: 2 };
  const kinds = [cone, pin, beach, soccer, beachB, crate, ...blocks];

  // --- Instancias (la pose se da a la malla ANTES de crear el cuerpo)
  const toys: Toy[] = [];
  let n = 0;
  const put = (k: Kind, x: number, y: number, z: number, ry = 0) => {
    const m = k.src.createInstance("jug" + n++);
    m.position.set(x, y, z); m.rotationQuaternion = B.Quaternion.FromEulerAngles(0, ry, 0); m.isPickable = false; m.receiveShadows = true;
    const body = new B.PhysicsBody(m, B.PhysicsMotionType.DYNAMIC, false, scene);
    body.shape = k.shape;
    body.setMassProperties({ mass: k.mass, inertia: k.inertia, centerOfMass: Z0 });
    body.setLinearDamping(0.25); body.setAngularDamping(0.5);
    body.setCollisionCallbackEnabled(true);
    const s = k.snd;
    body.getCollisionObservable().add((e) => { if (e.type === PhysicsEventType.COLLISION_STARTED && e.impulse > 0.02) FREE.toy(s); });
    toys.push({ m, body, x, y, z, ry, off: 0, tp: 0 });
  };

  // Pista de bolos al oeste (x -24, z -14..14): tablón claro, canaletas oscuras, tope al fondo; el auto entra desde el sur (-z) y los pinos van en triángulo
  const lane = pbr("juguPistaM", { color: "#d9b06a", rough: 0.45 }), gut = pbr("juguCanaletaM", { color: "#2b2d33", rough: 0.9 });
  decal("juguPista", 4.2, 28, -24, 0, lane, 0.045); decal("juguCanaleta", 0.5, 28, -26.35, 0, gut, 0.05); decal("juguCanaleta", 0.5, 28, -21.65, 0, gut, 0.05);
  lane.zOffset = -5; gut.zOffset = -6; // la losa de la plaza lleva -3: sin esto la pista queda tapada
  stat(box(5, 1.2, 0.5, pbr("juguTope", { color: "#8a4f26", rough: 0.7 }), [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [-24, 0.6, 14.4]);
  for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) put(pin, -24 + (i - r / 2) * 0.62, 0.75, 9 + r * 0.62);

  // Arco de fútbol al este (boca al oeste, 7 m): postes, travesaño, red de fondo y laterales; pelota delante
  const post = M.plastic("#f4efe2"), net = pbr("juguRed", { color: "#dfe6ea", rough: 1, alpha: 0.35 });
  for (const s of [-1, 1]) {
    stat(box(0.3, 2.5, 0.3, post, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [30, 1.25, s * 3.6]);
    stat(box(5, 2.4, 0.08, net, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [32.5, 1.2, s * 3.6]);
  }
  stat(box(0.3, 0.3, 7.5, post, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [30, 2.5, 0]);
  stat(box(0.08, 2.4, 7.2, net, [0, 0, 0]), B.PhysicsShapeType.BOX, {}, [35, 1.2, 0]);
  put(soccer, 21, 0.8, 0);

  // Conos en hilera al sur (z -26) y dos pelotas grandes al norte
  for (let i = 0; i < 6; i++) put(cone, -21 + i * 6, 0.5, -26);
  put(cone, -6, 0.5, 26); put(cone, 6, 0.5, 26);
  put(beach, 14, 0.9, 28); put(beachB, -14, 1, 30);

  // Bloques: pirámide 3-2-1 y torre de 6; cajas: pirámide 3-2-1
  const pyr = (k: (i: number) => Kind, sz: number, x: number, z: number, ry = 0) => { let c = 0; for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - r; i++) put(k(c++), x + (i - (2 - r) / 2) * (sz + 0.05) * Math.cos(ry), sz / 2 + r * (sz + 0.06) + 0.02, z - (i - (2 - r) / 2) * (sz + 0.05) * Math.sin(ry), ry); };
  pyr((i) => blocks[i % 4], BS, -8, 21);
  for (let r = 0; r < 6; r++) put(blocks[(r + 1) % 4], 8, BS / 2 + r * (BS + 0.06) + 0.02, 22, r * 0.05);
  pyr(() => crate, CS, 22, -11, Math.PI / 2);

  // Reseteo: cada 0,5 s revisa los desplazados (> 0,8 m del sitio o volcados/caídos)
  let acc = 0;
  const q = new B.Quaternion();
  const obs = scene.onBeforeRenderObservable.add(() => {
    for (const t of toys) if (t.tp > 0 && --t.tp === 0) t.body.setPrestepType(B.PhysicsPrestepType.DISABLED); // vuelve a que la física mande
    if ((acc += scene.getEngine().getDeltaTime() / 1000) < 0.5) return;
    const dt = acc; acc = 0;
    const cam = scene.activeCamera; if (!cam) return;
    const cp = cam.globalPosition;
    for (const t of toys) {
      const p = t.m.position;
      if ((p.x - t.x) ** 2 + (p.z - t.z) ** 2 + (p.y - t.y) ** 2 < 0.64 && Math.abs(p.y - t.y) < 0.3) { t.off = 0; continue; }
      t.off = cam.isInFrustum(t.m) ? 0 : t.off + dt;
      if (t.off > 20 || (cp.x - t.x) ** 2 + (cp.z - t.z) ** 2 > 90 * 90) {
        t.off = 0; t.m.position.set(t.x, t.y, t.z); B.Quaternion.RotationYawPitchRollToRef(t.ry, 0, 0, q); t.m.rotationQuaternion!.copyFrom(q);
        t.body.setLinearVelocity(Z0); t.body.setAngularVelocity(Z0);
        t.body.setPrestepType(B.PhysicsPrestepType.TELEPORT); t.tp = 3;
      }
    }
  });
  undo.push(() => { scene.onBeforeRenderObservable.remove(obs); for (const t of toys) t.body.dispose(); for (const s of shapes) s.dispose(); for (const k of kinds) k.src.dispose(); });
}

// ponytail: reseteo por distancia/tiempo fuera de cámara y sin sonido por velocidad; techo ~42 cuerpos. Si hacen falta más, partirlos por zonas y activarlos solo con la cámara cerca.
export const barrio: Barrio = { id: "juguetes", cx: 0, cz: 0, build };
