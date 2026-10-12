import * as B from "@babylonjs/core";
import { BAL } from "./balance";
import { DEF, DOG_RAM, Enemy, ROAR, type Kind } from "./enemies";
import { burst, debris, FX, impact } from "./fx";
import { GLB, glbTpl } from "./glb";
import { BV } from "./menu";
import { cyl, template } from "./models";
import { M, setLamp } from "./render";
import { SFX } from "./sfx";
import { SHOTS } from "./menuscene";

const ATK = BAL.ataques;

// Carrete de hilo: dos discos de madera clara, el cilindro del medio con hilo enrollado (vueltas más oscuras) y el disco de arriba a 1 de altura (donde se para el bicho)
export const pedTpl = () => template("pedestal", () => {
  const wood = M.matte("#dcb77a"), thread = M.matte("#d6334f"), turn = M.matte("#9a2c44");
  return [
    cyl(1, 1, 0.1, wood, [0, 0.05, 0], undefined, 20),
    cyl(1, 1, 0.1, wood, [0, 0.95, 0], undefined, 20),
    cyl(0.8, 0.8, 0.8, thread, [0, 0.5, 0], undefined, 20),
    ...[0.25, 0.4, 0.55, 0.7, 0.85].map((y) => cyl(0.82, 0.82, 0.04, turn, [0, y, 0], undefined, 20)),
  ];
});

export const PED_H = 0.8; // alto del carrete (el bicho se para arriba)

// Ataque de cada bicho: aviso (aro propio, aro de caída o sector, con su radio real), duración del aviso y golpe (embestida, salto, escupida, succión)
export const BATK: Partial<Record<Kind, { tele?: "self" | "land" | "arc"; r?: number; wind: number; hit: "lunge" | "hop" | "spit" | "dive" | "suck" | "swing" }>> = {
  escupidora: { wind: GLB.escupidora!.atk! * GLB.escupidora!.hit!, hit: "spit" },
  escarabajo: { wind: GLB.escarabajo!.atk! * GLB.escarabajo!.hit!, hit: "lunge" },
  robot: { wind: 0.9, hit: "lunge" },
  cortadora: { wind: 1.2, hit: "lunge" },
  polilla: { wind: 0.4, hit: "dive" },
  tarantula: { tele: "self", r: ATK.tarantula_rafaga_radio, wind: ATK.tarantula_rafaga_aviso_s, hit: "spit" },
  gato: { tele: "land", r: ATK.salto_radio, wind: ATK.gato_salto_aviso_s, hit: "hop" },
  perro: { wind: 0.5, hit: "hop" }, // perro: ver DOG_LANE (alterna con la embestida)
  aspiradora: { tele: "self", r: ATK.aspiradora_radio, wind: ATK.aspiradora_aviso_s, hit: "suck" },
  caja: { tele: "self", r: ATK.caja_onda_radio, wind: ATK.caja_onda_aviso_s, hit: "hop" },
  cortacercos: { tele: "arc", r: ATK.cortacercos_radio, wind: ATK.cortacercos_aviso_s, hit: "swing" },
};

export const DOG_LANE = { lane: true as const, tele: undefined, r: undefined, wind: DOG_RAM.wind, hit: "lunge" as const }; // segundo ataque de Felipe: la embestida con su carril rojo
export const TAR_JUMP = { tele: "land" as const, r: ATK.salto_radio, wind: ATK.tarantula_salto_aviso_s, hit: "hop" as const }; // segundo ataque de la tarántula: salto con aro de caída

export interface BeastInstance {
  e: Enemy;
  ped: B.InstancedMesh;
  pivot: B.TransformNode;
  key: string;
  seq: number;
  t: number;
  vel: B.Vector3;
  fx: number;
  atk: number;
}

export let beast: BeastInstance | null = null; // atk: ataques pedidos (la tarántula alterna ráfaga y salto)

export interface BeastTickContext {
  scene: B.Scene;
  dt: number;
  on: boolean;
  ensureBichos: () => void;
  addShake: (intensity: number) => void;
}

export function beastTick(ctx: BeastTickContext): number | null {
  const { scene, dt, on, ensureBichos, addShake } = ctx;
  const key = on && BV.kind ? BV.kind + BV.elite : "";
  if (beast && beast.key !== key) {
    beast.e.dispose();
    beast.ped.dispose();
    beast = null;
  }
  if (!key) return null;
  if (GLB[BV.kind!] && !glbTpl(BV.kind!)) {
    ensureBichos();
    return null;
  } // bicho importado todavía sin cargar: aparece solo al terminar
  const kind = BV.kind!, d = DEF[kind], span = Math.max(d.size[0], d.size[2]);
  if (!beast) {
    const e = new Enemy(kind, new B.Vector3(0, PED_H, 0), 1);
    const pivot = new B.TransformNode("beastPivot", scene);
    e.bindAttachPivot(pivot);
    e.node.rotationQuaternion = null;
    e.node.rotation.y = 0;
    e.body.setMotionType(B.PhysicsMotionType.ANIMATED);
    e.body.disablePreStep = false; // el cuerpo sigue a la malla (no cae ni empuja)
    if (BV.elite) e.makeElite(BV.elite);
    const vel = new B.Vector3();
    e.body.getLinearVelocity = () => vel; // ponytail: animate() mide la marcha con la velocidad del cuerpo; acá se la dicta la ficha
    const ped = pedTpl().createInstance("ped");
    ped.position.setAll(0); // la instancia nace donde está la plantilla escondida
    ped.scaling.set(span * 0.62 + 0.4, PED_H, span * 0.62 + 0.4);
    beast = { e, ped, pivot, key, seq: BV.seq, t: 9, vel, fx: 0, atk: 0 };
  }
  const b = beast, e = b.e, n = e.node, pivot = b.pivot;
  const vis = GLB[kind]?.visual ?? 1;
  if (b.seq !== BV.seq) {
    b.seq = BV.seq;
    b.t = 0;
    b.fx = 0;
    n.setEnabled(true);
    n.scaling.setAll(vis);
    if (BV.anim === "attack") b.atk++;
  }
  b.t += dt;
  if (performance.now() - BV.touched > 2500) BV.yaw += dt * 0.35; // giro lento si nadie lo toca
  const t = b.t, A = BV.anim, at = kind === "tarantula" && b.atk % 2 === 0 ? TAR_JUMP : kind === "perro" && b.atk % 2 === 0 ? DOG_LANE : BATK[kind] ?? { wind: 0.35, hit: "lunge" as const };
  const fwd = new B.Vector3(Math.sin(BV.yaw), 0, Math.cos(BV.yaw)), top = new B.Vector3(0, PED_H, 0);
  let lift = 0, push = 0, pitch = 0, roll = 0, sp = 0;
  e.showTele(null); e.touchCd = 0; e.atk = -1; e.play = null;
  if (A === "walk" || A === "phase") sp = d.speed * (A === "phase" ? 1.2 * 1.6 : 1) * (BV.elite === "rapida" ? 2 : 1);
  if (A === "phase" && t < ROAR) {
    sp = 0;
    if (GLB[kind]?.clips) e.play = ["rage", t];
  } // ruge quieto antes de salir corriendo, como en partida
  if (A === "phase") {
    roll = Math.sin(t * 40) * 0.03 * Math.max(0, 1 - t / 2.2);
    if (t < dt * 1.5) {
      SFX.boss();
      addShake(0.6);
    }
    e.vapor(dt);
  }
  e.setRage(A === "phase"); // tinte rojo de fase 2, como en partida
  if (A === "attack" && t < at.wind + 1.4) {
    const w = at.wind, k = Math.min(1, t / w), s = t - w; // s: segundos desde el golpe
    if ("lane" in at && t < w) e.showLane(fwd, k);
    else if (at.tele && t < w) e.showTele(at.tele === "land" ? top.add(fwd.scale(span * 0.4)) : top.clone(), at.r!, k);
    e.aim = BV.yaw;
    if (t < w) {
      pitch = -0.12 * k;
      roll = Math.sin(t * 50) * 0.02 * k;
    } // se carga: echa el peso atrás y tiembla
    else if (at.hit === "lunge" || at.hit === "swing") {
      push = Math.sin(Math.min(1, s / 0.5) * Math.PI) * span * 0.35;
      pitch = 0.1 * Math.max(0, 1 - s / 0.5);
      sp = s < 0.5 ? d.speed : 0;
    } else if (at.hit === "hop") {
      const h = Math.max(0, s * (1.1 - s)) * 4 * span * 0.5;
      lift = h;
      if (s < 1.1) pitch = -0.2 * Math.sin((s / 1.1) * Math.PI);
    } else if (at.hit === "dive") {
      push = Math.sin(Math.min(1, s / 0.4) * Math.PI) * span * 0.6;
      lift = -push * 0.3;
      pitch = 0.4 * Math.sin((Math.min(1, s / 0.4) * Math.PI));
    } else if (at.hit === "spit") {
      pitch = 0.15 * Math.max(0, 1 - s / 0.3);
    } else if (at.hit === "suck") {
      roll = Math.sin(t * 30) * 0.015;
      if (s < 1.2 && Math.random() < dt * 25) {
        const a = Math.random() * 6.3, r = 5 + Math.random() * 14;
        FX.dust(new B.Vector3(Math.sin(a) * r, 0.3, Math.cos(a) * r));
      }
    } // como la succión real
    e.touchCd = t > w && s < 0.5 ? 1 : 0; // la hormiga GLB (glb.ts) muerde con touchCd
    if (GLB[kind]?.atk) {
      if (t < GLB[kind]!.atk!) e.atk = t;
      push = 0;
    } // escupidora y escarabajo: su animación de ataque (golpe en w; la arremetida ya la trae)
    // Efectos del golpe, una vez por paso (b.fx cuenta los que ya salieron)
    const front = top.add(fwd.scale(span * 0.6 + 0.6)).addInPlace(new B.Vector3(0, d.size[1] * 0.4, 0));
    if (s >= 0 && b.fx === 0) {
      b.fx = 1;
      if (at.hit === "lunge" || at.hit === "dive") {
        FX.sparks(front);
        FX.hit(front);
      }
      if (at.hit === "swing") {
        for (let j = -2; j <= 2; j++) {
          const a = BV.yaw + j * 0.5;
          FX.sparks(new B.Vector3(Math.sin(a) * 8, 0.6, Math.cos(a) * 8));
        }
      }
    }
    if (at.hit === "spit" && s >= 0 && b.fx <= (kind === "tarantula" ? 6 : 1) && s >= (b.fx - 1) * 0.16) {
      b.fx++;
      burst(front, { n: 10, color: "#ff3a1f", size: [0.25, 0.55], power: [6, 11], life: [0.25, 0.45], gravity: -8 });
    }
    if (at.hit === "suck" && s >= 1.2 && b.fx < 4) {
      b.fx++;
      for (let j = -3; j <= 3; j++) {
        const a = BV.yaw + j * 0.2;
        FX.sparks(top.add(new B.Vector3(Math.sin(a) * 4, 0.7, Math.cos(a) * 4)));
      }
    } // ráfagas de tuercas
    if (at.hit === "hop" && s >= 1.1 && b.fx === 1) {
      b.fx = 2;
      FX.slam(top, 10);
      addShake(0.8);
    }
    // Felipe y Eulalio (clips de Blender): la acción sigue los mismos tramos del aviso y del golpe
    if (GLB[kind]?.clips) {
      e.play = at.hit === "hop"
        ? e.seq("jump", t < w ? 0 : s < 1.1 ? 1 : 2, t < w ? k : s < 1.1 ? s / 1.1 : (s - 1.1) / 0.4)
        : kind === "perro"
          ? e.seq("ram", t < w ? 0 : s < 0.5 ? 1 : 2, t < w ? k : s < 0.5 ? s / 0.5 : (s - 0.5) / 0.9)
          : null;
    }
  }
  if (A === "hit" && t < dt * 1.5) {
    addShake(impact(n, top.add(new B.Vector3(0, d.size[1] * 0.5, 0)), d.color, span * (d.scale ?? 1), "embestida", true, !!d.boss));
    SFX.impact("embestida", true);
  }
  if (A === "die") {
    if (GLB[kind]?.clips && t < 3) {
      e.play = ["death", t];
      if (t > 2.2 && b.fx === 0) {
        b.fx = 1;
        FX.death(top.add(new B.Vector3(0, 0.5, 0)), true);
        SFX.kill();
      }
      n.scaling.setAll(t > 2.6 ? Math.max(0.01, (3 - t) / 0.4) : 1);
    } else if (t < 0.45) {
      roll = (t / 0.45) * Math.PI * (d.boss ? 0.5 : 1);
      lift = Math.sin((t / 0.45) * Math.PI) * span * 0.3;
    } else if (b.fx === 0) {
      b.fx = 1;
      FX.death(top.add(new B.Vector3(0, 0.5, 0)), !!d.boss);
      debris(top, d.color, d.boss ? 30 : 7, d.boss ? 14 : 6, d.scale ?? (d.boss ? 3 : 1));
      SFX.kill();
      n.setEnabled(false);
    } else if (t > 1.8 && !n.isEnabled()) {
      n.setEnabled(true);
      n.scaling.setAll(0.01);
    }
    if (t > 1.8 && !(GLB[kind]?.clips && t < 3)) {
      const k = Math.min(1, (t - 1.8) / 0.25);
      n.scaling.setAll(k < 1 ? k * 1.1 : 1);
      roll = 0;
    }
  }
  if (kind === "polilla") lift += 1.2 + Math.sin(performance.now() / 600) * 0.15; // vuela
  if (kind === "robot" && (A === "walk" || A === "phase")) {
    roll = Math.sin(t * 14) * 0.08;
    pitch = Math.sin(t * 28) * 0.03;
  }
  b.vel.copyFrom(fwd.scale(sp));
  pivot.position.set(fwd.x * push, PED_H + lift, fwd.z * push);
  pivot.rotationQuaternion = null;
  pivot.rotation.set(pitch, BV.yaw, roll);
  n.position.copyFrom(pivot.position);
  n.rotationQuaternion = null;
  n.rotation.copyFrom(pivot.rotation);
  if (n.isEnabled()) e.animate(A === "phase" ? dt * 1.5 : dt);
  return span;
}

export interface SetupBeastCamContext {
  engine: B.AbstractEngine;
  cam: B.Camera;
  dt: number;
}

export function setupBeastCam(bspan: number, ctx: SetupBeastCamContext): void {
  const { engine, cam, dt } = ctx;
  const d = DEF[BV.kind!], asp = engine.getAspectRatio(cam), th = Math.tan(cam.fov / 2), tall = asp < 1;
  const h = d.size[1], need = Math.max(bspan, d.size[2], h * 1.2) * (d.boss ? 1.9 : 1.5) + 1.5; // los jefes abren patas y cola más allá de su caja
  const dist = Math.max(need / (2 * th * asp * (tall ? 0.7 : 0.45)), (h + 1.5) / (2 * th * (tall ? 0.3 : 0.65))) * BV.zoom;
  const W = dist * th * asp, H = dist * th, ty0 = PED_H + h * 0.45;
  SHOTS.beast = [tall ? 0 : -W * 0.42, ty0 + dist * 0.36, dist, tall ? 0 : -W * 0.42, ty0 - (tall ? H * 0.58 : 0), 0]; // desde +z: del otro lado queda la mesa del patio
  setLamp(new B.Vector3(dist * 0.3, ty0, dist * 0.6), new B.Vector3(-0.3, 0, -0.6).normalize(), false, dt); // el faro alumbra la vitrina de frente
}
