import * as B from "@babylonjs/core";
import { enemyTemplate, legTemplate, LEGS } from "./models";

export type Kind = "hormiga" | "friccion" | "robot" | "escarabajo" | "rey" | "cortadora" | "perro";

type Def = { name: string; hp: number; speed: number; dmg: number; size: [number, number, number]; mass: number; xp: number; boss?: boolean; scale?: number; color: string };
export const DEF: Record<Kind, Def> = {
  hormiga: { name: "Hormiga", hp: 8, speed: 7.5, dmg: 8, size: [0.9, 0.6, 1.7], mass: 0.4, xp: 1, color: "#2a150c" },
  friccion: { name: "Autito a fricción", hp: 18, speed: 11, dmg: 10, size: [0.9, 0.6, 1.6], mass: 0.7, xp: 2, color: "#f97316" },
  robot: { name: "Robot a cuerda", hp: 40, speed: 17, dmg: 14, size: [1.2, 1.7, 1], mass: 1.3, xp: 3, color: "#b91c1c" },
  escarabajo: { name: "Escarabajo", hp: 90, speed: 4.5, dmg: 18, size: [1.7, 1.1, 2.3], mass: 3, xp: 6, color: "#2f7d4a" },
  rey: { name: "ESCARABAJO REY", hp: 1800, speed: 6, dmg: 30, size: [6, 3.8, 8], mass: 40, xp: 60, boss: true, scale: 3.5, color: "#d4a017" },
  cortadora: { name: "CORTADORA DE CÉSPED", hp: 3500, speed: 15, dmg: 45, size: [7, 4.5, 6.4], mass: 80, xp: 120, boss: true, color: "#dc2626" },
  perro: { name: "EL PERRO", hp: 7000, speed: 9, dmg: 40, size: [3.2, 8, 8], mass: 100, xp: 0, boss: true, color: "#a0673a" },
};

const UP = B.Vector3.Up();

export class Enemy {
  node: B.InstancedMesh;
  body: B.PhysicsBody;
  agg: B.PhysicsAggregate;
  def: Def;
  hp: number;
  maxHp: number;
  radius: number;
  ramCd = 0;
  hitCd = 0; // cooldown genérico para armas de contacto (clips)
  state = 0; // máquina de estados para cargas / saltos
  timer = 1 + Math.random();
  airborne = false;
  legs: { m: B.InstancedMesh; base: number; phase: number }[] = [];
  walk = Math.random() * 6;

  constructor(public kind: Kind, pos: B.Vector3, hpMul: number) {
    const d = (this.def = DEF[kind]);
    this.hp = this.maxHp = d.hp * (d.boss ? 1 : hpMul);
    const [w, h, l] = d.size;
    this.radius = Math.max(w, l) / 2;
    this.node = enemyTemplate(kind, d.scale).createInstance(kind);
    this.node.position.copyFrom(pos);
    this.node.rotation.y = Math.random() * 6.3;
    this.agg = new B.PhysicsAggregate(this.node, B.PhysicsShapeType.BOX,
      { mass: d.mass, friction: 0.3, restitution: 0.1, extents: new B.Vector3(w, h, l), center: new B.Vector3(0, h / 2, 0) }, this.node.getScene());
    this.body = this.agg.body;
    this.body.setMassProperties({ mass: d.mass, inertia: new B.Vector3(0, d.mass, 0), centerOfMass: new B.Vector3(0, h * 0.3, 0) });

    const L = LEGS[kind];
    if (L) {
      const tpl = legTemplate(kind);
      L.hips.forEach(([x, y, z], i) => {
        for (const side of [1, -1]) {
          const m = tpl.createInstance("leg");
          m.parent = this.node;
          m.position.set(x * side * L.scale, y * L.scale, z * L.scale);
          const base = side > 0 ? 0 : Math.PI;
          m.rotation.y = base;
          // marcha en trípode: patas alternadas en fase opuesta
          this.legs.push({ m, base, phase: (i + (side > 0 ? 0 : 1)) % 2 ? Math.PI : 0 });
        }
      });
    }
  }

  // Animación de caminata: amplitud y frecuencia según la velocidad real
  animate(dt: number) {
    if (!this.legs.length) return;
    const v = this.body.getLinearVelocity();
    const sp = Math.hypot(v.x, v.z);
    this.walk += dt * Math.min(28, 4 + sp * 3.2) / (this.def.scale ?? 1);
    const amp = Math.min(0.55, 0.12 + sp * 0.06);
    for (const l of this.legs) {
      const s = Math.sin(this.walk + l.phase);
      l.m.rotation.y = l.base + s * amp;
      l.m.rotation.z = (l.base ? -1 : 1) * Math.max(0, Math.cos(this.walk + l.phase)) * amp * 0.5; // levanta al avanzar
    }
  }

  get pos() { return this.node.position; }

  // Devuelve "slam" cuando el perro aterriza de un salto
  update(dt: number, target: B.Vector3): string | void {
    const d = this.def;
    this.ramCd -= dt;
    this.hitCd -= dt;
    const v = this.body.getLinearVelocity();
    const to = target.subtract(this.pos); to.y = 0;
    const dist = to.length();
    to.normalize();
    const fwd = this.node.forward.clone(); fwd.y = 0; fwd.normalize();
    const diff = Math.atan2(B.Vector3.Cross(fwd, to).y, B.Vector3.Dot(fwd, to));
    let move = to;
    let speed = d.speed;
    let turn = 6;

    if (this.kind === "robot" || this.kind === "cortadora") {
      // Apunta quieto, después sale disparado en línea recta
      this.timer -= dt;
      if (this.state === 0) { speed = 0; turn = this.kind === "robot" ? 5 : 2; if (this.timer <= 0) { this.state = 1; this.timer = this.kind === "robot" ? 1.2 : 2.6; } }
      else { move = fwd; turn = 0.3; if (this.timer <= 0) { this.state = 0; this.timer = this.kind === "robot" ? 1 : 1.4; } }
    }

    if (this.kind === "perro") {
      this.timer -= dt;
      if (this.airborne) {
        if (v.y <= 0 && this.pos.y < 0.3) { this.airborne = false; return "slam"; }
        return;
      }
      if (this.timer <= 0 && dist < 40) {
        this.timer = 5;
        this.airborne = true;
        const jump = to.scale(Math.min(dist, 25) * 1.1).addInPlace(UP.scale(22));
        this.body.setLinearVelocity(jump);
        return;
      }
    }

    // Velocidad objetivo directa (hordas: barato y legible); la física separa a los enemigos
    const want = move.scale(speed);
    const k = Math.min(1, dt * (this.kind === "hormiga" ? 6 : 4));
    this.body.setLinearVelocity(new B.Vector3(v.x + (want.x - v.x) * k, v.y, v.z + (want.z - v.z) * k));
    this.body.setAngularVelocity(new B.Vector3(0, B.Scalar.Clamp(diff * turn, -turn, turn), 0));
  }

  dispose() { this.agg.dispose(); this.node.dispose(); }
}

// Qué aparece según el minuto de la partida: [tipo, peso]
export function spawnTable(t: number): [Kind, number][] {
  const m = t / 60;
  const tab: [Kind, number][] = [["hormiga", 10]];
  if (m > 0.5) tab.push(["friccion", 4 + m]);
  if (m > 1.5) tab.push(["robot", 2 + m * 0.6]);
  if (m > 3.5) tab.push(["escarabajo", 1 + m * 0.5]);
  return tab;
}

export function pickWeighted<T>(tab: [T, number][]) {
  let r = Math.random() * tab.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of tab) if ((r -= w) <= 0) return k;
  return tab[0][0];
}
