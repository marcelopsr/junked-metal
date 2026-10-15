// Fantasma del récord (Paseo libre): clon translúcido del auto que repite el mejor intento. Solo la parte del motor; el códec vive en free_challenges.ts.
// Sin colisión, sin sombra y sin rng(). Se libera con ghostOff() (al terminar el desafío y en clearRun).
import * as B from "@babylonjs/core";
import { CARS } from "./car";
import { carModel, type CarKind } from "./models";

let node: B.TransformNode | null = null, body: B.Mesh | null = null, mat: B.StandardMaterial | null = null;
let off = 0; // altura del cuerpo respecto del centro de la caja de colisión (igual que en Car)

export function ghostOn(scene: B.Scene, kind: CarKind, opts: Parameters<typeof carModel>[1]) {
  if (node) return;
  const m = carModel(kind, { ...opts, fixed: true });
  mat = new B.StandardMaterial("ghostMat", scene);
  mat.diffuseColor = B.Color3.Black(); mat.specularColor = B.Color3.Black(); mat.disableLighting = true;
  mat.emissiveColor = new B.Color3(0.3, 0.65, 1); mat.alpha = 0.38; // azul fantasma
  body = m.body;
  for (const x of [body, ...body.getChildMeshes()]) { x.material = mat; x.receiveShadows = false; x.isPickable = false; x.checkCollisions = false; }
  node = new B.TransformNode("ghost", scene);
  node.rotationQuaternion = new B.Quaternion();
  body.parent = node;
  off = -Math.min(...m.wheels.map((w) => w.m.position.y - w.r)) - CARS[kind].size[1] / 2;
  body.position.y = off;
}

/** Pose de una muestra (x, y, z, qx, qy, qz, qw). */
export function ghostPose(r: number[]) {
  if (!node) return;
  node.position.set(r[0], r[1], r[2]);
  node.rotationQuaternion!.set(r[3], r[4], r[5], r[6]).normalize();
}

export function ghostOff() {
  body?.dispose(false, false); node?.dispose(); mat?.dispose(); // los materiales del auto están en caché: no se liberan acá
  node = body = mat = null;
}
