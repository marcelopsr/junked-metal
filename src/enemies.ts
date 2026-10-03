import * as B from "@babylonjs/core";
import { enemyTemplate, legTemplate, LEGS, teleTemplate, wingTemplate } from "./models";
import { rng } from "./rng";

export type Kind = "hormiga" | "escupidora" | "friccion" | "robot" | "escarabajo" | "rey" | "cortadora" | "perro" | "polilla" | "tarantula";

type Def = { name: string; hp: number; speed: number; dmg: number; size: [number, number, number]; mass: number; xp: number; boss?: boolean; scale?: number; color: string };
export const DEF: Record<Kind, Def> = {
  hormiga: { name: "Hormiga", hp: 8, speed: 8, dmg: 6, size: [0.9, 0.6, 1.7], mass: 0.4, xp: 1, color: "#2a150c" },
  escupidora: { name: "Hormiga escupidora", hp: 22, speed: 7, dmg: 8, size: [1.1, 0.8, 2], mass: 0.7, xp: 3, color: "#7a1f0f" },
  friccion: { name: "Autito a fricción", hp: 18, speed: 12.5, dmg: 7, size: [0.9, 0.6, 1.6], mass: 0.7, xp: 2, color: "#f97316" },
  robot: { name: "Robot a cuerda", hp: 40, speed: 18, dmg: 10, size: [1.2, 1.7, 1], mass: 1.3, xp: 3, color: "#b91c1c" },
  polilla: { name: "Polilla", hp: 12, speed: 11, dmg: 5, size: [1.4, 0.5, 1.1], mass: 0.3, xp: 2, color: "#8a7a5a" },
  escarabajo: { name: "Escarabajo", hp: 90, speed: 4.5, dmg: 12, size: [1.7, 1.1, 2.3], mass: 3, xp: 6, color: "#2f7d4a" },
  rey: { name: "ESCARABAJO REY", hp: 1800, speed: 6, dmg: 30, size: [6, 3.8, 8], mass: 40, xp: 60, boss: true, scale: 3.5, color: "#d4a017" },
  cortadora: { name: "CORTADORA DE CÉSPED", hp: 3500, speed: 15, dmg: 45, size: [7, 4.5, 6.4], mass: 80, xp: 120, boss: true, color: "#dc2626" },
  tarantula: { name: "TARÁNTULA", hp: 2600, speed: 7, dmg: 35, size: [6, 2.6, 6.5], mass: 50, xp: 100, boss: true, scale: 3, color: "#3a2a20" },
  perro: { name: "EL PERRO", hp: 8000, speed: 9, dmg: 40, size: [3.2, 8, 8], mass: 100, xp: 0, boss: true, color: "#a0673a" },
};

const UP = B.Vector3.Up();
const ray = new B.PhysicsRaycastResult(), rayFrom = new B.Vector3(), rayTo = new B.Vector3();

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
  touchCd = 0; // cada enemigo te pega como mucho una vez por intervalo
  state = 0; // máquina de estados para cargas / saltos
  timer = 1 + rng();
  airborne = false;
  legs: { m: B.InstancedMesh; base: number; side: number; phase: number }[] = [];
  wings: B.InstancedMesh[] = []; // polilla
  tele: B.InstancedMesh[] = []; // tarántula: aro fijo (zona) + aro que crece (cuenta regresiva)
  land = new B.Vector3(); // tarántula: dónde va a caer el salto
  shots = 0; // tarántula: escupitajos que quedan en la ráfaga
  slow = 0; // segundos de ralentización (Pistola de agua)
  lastT: B.Vector3 | null = null; // polilla: posición anterior del auto (estima hacia dónde apunta el faro)
  walk = rng() * 6;
  pose = 0; // stop-motion: las patas cambian de pose a 10 fps

  constructor(public kind: Kind, pos: B.Vector3, hpMul: number) {
    const d = (this.def = DEF[kind]);
    this.hp = this.maxHp = d.hp * (d.boss ? 1 : hpMul);
    const [w, h, l] = d.size;
    this.radius = Math.max(w, l) / 2;
    this.node = enemyTemplate(kind, d.scale).createInstance(kind);
    this.node.position.copyFrom(pos);
    this.node.rotation.y = rng() * 6.3;
    this.agg = new B.PhysicsAggregate(this.node, B.PhysicsShapeType.BOX,
      { mass: d.mass, friction: 0.3, restitution: 0.1, extents: new B.Vector3(w, h, l), center: new B.Vector3(0, h / 2, 0) }, this.node.getScene());
    this.body = this.agg.body;
    this.body.setMassProperties({ mass: d.mass, inertia: new B.Vector3(0, d.mass, 0), centerOfMass: new B.Vector3(0, h / 2, 0) }); // = centro de la forma (ver Car.setMass)

    const L = LEGS[kind];
    if (L) {
      const tpl = legTemplate(kind);
      L.hips.forEach(([x, y, z], i) => {
        for (const side of [1, -1]) {
          const m = tpl.createInstance("leg");
          m.parent = this.node;
          m.position.set(x * side * L.scale, y * L.scale, z * L.scale);
          const yaw = L.yaw?.[i] ?? 0, base = side > 0 ? yaw : Math.PI - yaw;
          m.rotation.y = base;
          // marcha en trípode: patas alternadas en fase opuesta
          this.legs.push({ m, base, side, phase: (i + (side > 0 ? 0 : 1)) % 2 ? Math.PI : 0 });
        }
      });
    }
    if (kind === "polilla") {
      this.body.setGravityFactor(0); // vuela: la altura la maneja update()
      for (const side of [1, -1]) {
        const w = wingTemplate().createInstance("wing");
        w.parent = this.node;
        w.position.set(side * 0.18, 0.08, 0.05);
        w.rotation.y = side > 0 ? 0 : Math.PI;
        this.wings.push(w);
      }
    }
    if (kind === "tarantula") {
      for (let i = 0; i < 2; i++) { const t = teleTemplate().createInstance("tele"); t.isVisible = false; this.tele.push(t); }
      this.state = 3; this.timer = 1.6; this.land.copyFrom(pos); // entra con un salto anunciado
    }
  }

  // Telegráfico en el piso: zona de radio r centrada en p; k = 0..1 cuánto falta (el aro interior crece hasta el borde)
  private showTele(p: B.Vector3 | null, r = 0, k = 0) {
    for (const t of this.tele) t.isVisible = !!p;
    if (!p) return;
    const [zone, fill] = this.tele;
    zone.position.set(p.x, p.y + 0.06, p.z); zone.scaling.set(r, 1, r);
    const f = Math.max(0.05, r * k);
    fill.position.set(p.x, p.y + 0.07, p.z); fill.scaling.set(f, 1, f);
  }

  // Animación de caminata: amplitud y frecuencia según la velocidad real
  animate(dt: number) {
    if (this.wings.length) {
      // Aleteo rápido a pocos cuadros (stop-motion)
      this.walk += dt * 22;
      const a = Math.round(Math.sin(this.walk) * 3) / 3;
      for (const w of this.wings) w.rotation.z = a * 0.9; // con rotation.y = PI el ala izquierda ya queda espejada
      return;
    }
    if (!this.legs.length) return;
    const v = this.body.getLinearVelocity();
    const sp = Math.hypot(v.x, v.z);
    this.walk += dt * Math.min(28, 4 + sp * 3.2) / (this.def.scale ?? 1);
    if ((this.pose += dt) < 0.1) return;
    this.pose = 0;
    const amp = Math.min(0.55, 0.12 + sp * 0.06);
    for (const l of this.legs) {
      const s = Math.sin(this.walk + l.phase);
      l.m.rotation.y = l.base + s * amp;
      l.m.rotation.z = l.side * Math.max(0, Math.cos(this.walk + l.phase)) * amp * 0.5; // levanta al avanzar
    }
  }

  get pos() { return this.node.position; }

  // Altura del piso bajo el enemigo (rayo corto hacia abajo, como drive() en car.ts): sirve en rampas y montículos.
  // null = no hay piso dentro de "depth" (sigue en el aire)
  groundY(depth: number) {
    rayFrom.copyFrom(this.pos); rayFrom.y += 0.5;
    rayTo.copyFrom(this.pos); rayTo.y -= depth;
    (this.node.getScene().getPhysicsEngine() as B.PhysicsEngineV2).raycastToRef(rayFrom, rayTo, ray, { ignoreBody: this.body });
    return ray.hasHit ? ray.hitPointWorld.y : null;
  }

  // Devuelve "slam" cuando el perro aterriza de un salto
  update(dt: number, target: B.Vector3): string | void {
    const d = this.def;
    this.ramCd -= dt;
    this.hitCd -= dt;
    this.touchCd -= dt;
    const v = this.body.getLinearVelocity();
    const to = target.subtract(this.pos); to.y = 0;
    const dist = to.length();
    to.normalize();
    const fwd = this.node.forward.clone(); fwd.y = 0; fwd.normalize();
    const diff = Math.atan2(B.Vector3.Cross(fwd, to).y, B.Vector3.Dot(fwd, to));
    let move = to;
    let speed = d.speed;
    let turn = 6;
    if (this.slow > 0) { this.slow -= dt; speed *= d.boss ? 0.8 : 0.45; } // empapado: se arrastra

    if (this.kind === "robot" || this.kind === "cortadora") {
      // Apunta quieto, después sale disparado en línea recta
      this.timer -= dt;
      if (this.state === 0) { speed = 0; turn = this.kind === "robot" ? 5 : 2; if (this.timer <= 0) { this.state = 1; this.timer = this.kind === "robot" ? 1.2 : 2.6; } }
      else { move = fwd; turn = 0.3; if (this.timer <= 0) { this.state = 0; this.timer = this.kind === "robot" ? 1 : 1.4; } }
    }

    if (this.kind === "escupidora") {
      // Se frena a distancia, te apunta y escupe ácido
      this.timer -= dt;
      if (dist < 16) { speed = 0; turn = 5; if (this.timer <= 0 && Math.abs(diff) < 0.4) { this.timer = 2.6; this.body.setAngularVelocity(B.Vector3.Zero()); return "spit"; } }
    }

    if (this.kind === "polilla") {
      // Va al faro: revolotea delante del auto (hacia donde avanza) y cada tanto se tira contra el parabrisas
      const cv = this.lastT ? target.subtract(this.lastT).scaleInPlace(1 / Math.max(dt, 1e-3)) : B.Vector3.Zero();
      (this.lastT ??= new B.Vector3()).copyFrom(target);
      cv.y = 0;
      const cs = cv.length();
      this.timer -= dt;
      if (this.timer <= 0) { this.state = 1 - this.state; this.timer = this.state ? 0.7 : 3 + rng() * 3; }
      const dive = this.state === 1;
      const goal = dive ? target.clone() : target.add(cs > 2 ? cv.scaleInPlace(4.5 / cs) : this.pos.subtract(target).normalize().scaleInPlace(3.5));
      if (!dive) goal.addInPlace(new B.Vector3(Math.sin(this.walk * 0.11) * 1.6, 0, Math.cos(this.walk * 0.07) * 1.6));
      const g = goal.subtract(this.pos); g.y = 0;
      const gd = g.length();
      const sp = (dive ? d.speed * 1.7 : Math.min(d.speed, gd * 3)) * (this.slow > 0 ? 0.45 : 1);
      const want = gd > 0.01 ? g.scaleInPlace(sp / gd) : g;
      const floor = this.groundY(4) ?? this.pos.y - 1.7; // vuela a altura fija sobre el piso (montículos, rampas)
      const hy = floor + (dive ? 0.5 : 1.7 + Math.sin(this.walk * 0.05) * 0.3) - this.pos.y;
      const k = Math.min(1, dt * 5);
      this.body.setLinearVelocity(new B.Vector3(v.x + (want.x - v.x) * k, hy * 4, v.z + (want.z - v.z) * k));
      this.body.setAngularVelocity(new B.Vector3(0, B.Scalar.Clamp(diff * 8, -8, 8), 0));
      return;
    }

    if (this.kind === "tarantula") {
      // Dos ataques, siempre anunciados en rojo en el piso:
      // ráfaga (aro alrededor suyo, después 6 escupitajos) y salto (aro donde va a caer, radio del golpe = 11 en main.ts)
      this.timer -= dt;
      if (this.airborne) {
        this.showTele(this.land, 11, 1);
        if (v.y <= 0 && this.groundY(0.3) !== null) { this.airborne = false; this.state = 0; this.timer = 2.5; this.showTele(null); return "slam"; }
        return;
      }
      if (this.state === 0) {
        this.showTele(null);
        if (this.timer <= 0) {
          this.state = rng() < 0.5 ? 1 : 3;
          this.timer = this.state === 1 ? 1.1 : 1.3;
        }
      } else if (this.state === 1 || this.state === 2) {
        speed = 0; turn = 5;
        if (this.state === 1) {
          this.showTele(this.pos, 5, 1 - this.timer / 1.1);
          if (this.timer <= 0) { this.state = 2; this.shots = 6; this.timer = 0; }
        } else if (this.timer <= 0) {
          this.timer = 0.16;
          if (this.shots-- > 0) return "spit";
          this.state = 0; this.timer = 3; this.showTele(null);
        }
      } else if (this.state === 3) {
        speed = 0; turn = 4;
        // Apunta durante la primera mitad y después fija el punto: quedarse quieto = recibir el golpe
        if (this.timer > 0.65) { const reach = Math.min(dist, 22); this.land.set(this.pos.x + to.x * reach, reach < dist ? this.pos.y : target.y - 0.3, this.pos.z + to.z * reach); }
        this.showTele(this.land, 11, 1 - this.timer / 1.3);
        if (this.timer <= 0) {
          const T = (2 * 14) / 25; // vuelo con vy = 14 y gravedad 25
          const j = this.land.subtract(this.pos); j.y = 0;
          this.body.setLinearVelocity(j.scaleInPlace(1 / T).addInPlace(new B.Vector3(0, 14, 0)));
          this.airborne = true;
          return;
        }
      }
    }

    if (this.kind === "perro") {
      this.timer -= dt;
      if (this.airborne) {
        if (v.y <= 0 && this.groundY(0.3) !== null) { this.airborne = false; return "slam"; }
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

  dispose() { this.agg.dispose(); this.node.dispose(); for (const t of this.tele) t.dispose(); }
}

// Qué aparece según el minuto de la partida: [tipo, peso]
// La plaga de la partida multiplica pesos y puede adelantar la llegada (minuto) de cada tipo
export function spawnTable(t: number, plague?: { mult: Partial<Record<Kind, number>>; from: Partial<Record<Kind, number>> }): [Kind, number][] {
  const m = t / 60;
  const base: [Kind, number, number][] = [["hormiga", 0, 10], ["friccion", 0.5, 4 + m], ["escupidora", 1.5, 1 + m * 0.6], ["robot", 1.5, 2 + m * 0.6], ["escarabajo", 3.5, 1 + m * 0.5], ["polilla", 2.5, 1 + m * 0.4]];
  return base.filter(([k, from]) => m >= (plague?.from[k] ?? from)).map(([k, , w]) => [k, w * (plague?.mult[k] ?? 1)]);
}

export function pickWeighted<T>(tab: [T, number][]) {
  let r = rng() * tab.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of tab) if ((r -= w) <= 0) return k;
  return tab[0][0];
}
