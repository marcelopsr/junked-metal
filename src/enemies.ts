import * as B from "@babylonjs/core";
import { auraTemplate, cableTemplate, enemyTemplate, legTemplate, LEGS, sectorTemplate, teleTemplate, wingTemplate } from "./models";
import { FX } from "./fx";
import { rng } from "./rng";
import type { Elite } from "./run";

export type Kind = "hormiga" | "escupidora" | "friccion" | "robot" | "escarabajo" | "rey" | "cortadora" | "perro" | "gato" | "polilla" | "tarantula" | "aspiradora" | "cortacercos";

type Def = { name: string; hp: number; speed: number; dmg: number; size: [number, number, number]; mass: number; xp: number; boss?: boolean; scale?: number; color: string };
export const DEF: Record<Kind, Def> = {
  hormiga: { name: "Hormiga", hp: 8, speed: 8, dmg: 6, size: [0.9, 0.6, 1.7], mass: 0.4, xp: 1, color: "#a0522d" },
  escupidora: { name: "Hormiga escupidora", hp: 22, speed: 7, dmg: 8, size: [1.1, 0.8, 2], mass: 0.7, xp: 3, color: "#d2381c" },
  friccion: { name: "Autito a fricción", hp: 18, speed: 12.5, dmg: 7, size: [0.9, 0.6, 1.6], mass: 0.7, xp: 2, color: "#f97316" },
  robot: { name: "Robot a cuerda", hp: 40, speed: 18, dmg: 10, size: [1.2, 1.7, 1], mass: 1.3, xp: 3, color: "#ef4444" },
  polilla: { name: "Polilla", hp: 12, speed: 11, dmg: 5, size: [1.4, 0.5, 1.1], mass: 0.3, xp: 2, color: "#d8c690" },
  escarabajo: { name: "Escarabajo", hp: 90, speed: 4.5, dmg: 12, size: [1.7, 1.1, 2.3], mass: 3, xp: 6, color: "#2f7d4a" },
  rey: { name: "ESCARABAJO REY", hp: 1800, speed: 6, dmg: 30, size: [6, 3.8, 8], mass: 40, xp: 60, boss: true, scale: 3.5, color: "#d4a017" },
  cortadora: { name: "CORTADORA DE CÉSPED", hp: 3500, speed: 15, dmg: 45, size: [7, 4.5, 6.4], mass: 80, xp: 120, boss: true, color: "#dc2626" },
  tarantula: { name: "TARÁNTULA", hp: 2600, speed: 7, dmg: 35, size: [6, 2.6, 6.5], mass: 50, xp: 100, boss: true, scale: 3, color: "#7a55a8" },
  perro: { name: "FELIPE", hp: 8000, speed: 9, dmg: 40, size: [3.2, 8, 8], mass: 100, xp: 0, boss: true, color: "#d9b38a" },
  gato: { name: "EULALIO EL GATO", hp: 2900, speed: 11, dmg: 32, size: [3.4, 3.6, 6.4], mass: 60, xp: 110, boss: true, color: "#f28c28" },
  aspiradora: { name: "LA ASPIRADORA ROBOT", hp: 7500, speed: 7, dmg: 35, size: [6.4, 1.6, 6.4], mass: 90, xp: 0, boss: true, color: "#7a8fa6" },
  cortacercos: { name: "EL CORTACERCOS ELÉCTRICO", hp: 7000, speed: 8, dmg: 40, size: [3, 2.4, 9], mass: 80, xp: 0, boss: true, color: "#e0a030" },
};

const UP = B.Vector3.Up();
const rot = (v: B.Vector3, a: number) => new B.Vector3(v.x * Math.cos(a) + v.z * Math.sin(a), 0, -v.x * Math.sin(a) + v.z * Math.cos(a));
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
  stun = 0; // segundos aturdido (Pulso EMP): main.ts no corre su IA ni su golpe de contacto
  lastT: B.Vector3 | null = null; // polilla: posición anterior del auto (estima hacia dónde apunta el faro)
  walk = rng() * 6;
  elite: Elite | "" = ""; // variante rara de un enemigo común (makeElite)
  spd = 1; // multiplicador de velocidad (élite rápida)
  aura?: B.InstancedMesh;
  pull = 0; // aspiradora: aceleración (m/s²) con la que succiona al auto mientras dura; main.ts la aplica
  fan: B.Vector3[] = []; // aspiradora: direcciones de la ráfaga de tuercas del evento "fan"
  cables: { m: B.InstancedMesh; a: B.Vector3; b: B.Vector3; life: number }[] = []; // cortacercos: cables con chispas en el piso
  shockCd = 0;
  aim = 0; // cortacercos: rumbo fijo del barrido anunciado
  pose = 0; // stop-motion: las patas cambian de pose a 10 fps
  clock = 0; // reloj propio para los zigzags de Eulalio y Felipe
  enraged = false; // jefe por debajo de la mitad de vida: más rápido y más agresivo
  phaseUp = false; // main.ts lo apaga tras mostrar el aviso de fase
  dir = 0; // Eulalio: rumbo del dash / giro
  meowCd = 6;

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
    if (kind === "aspiradora" || kind === "cortacercos") {
      // Mismo par zona + relleno que la tarántula; el cortacercos usa un sector (su barrido) en vez de un aro
      const tpl = kind === "aspiradora" ? teleTemplate() : sectorTemplate();
      for (let i = 0; i < 2; i++) { const t = tpl.createInstance("tele"); t.isVisible = false; this.tele.push(t); }
      this.timer = 2.5;
    }
    if (kind === "tarantula" || kind === "gato") {
      for (let i = 0; i < 2; i++) { const t = teleTemplate().createInstance("tele"); t.isVisible = false; this.tele.push(t); }
      this.state = 3; this.timer = 1.6; this.land.copyFrom(pos); // entra con un salto anunciado
      if (kind === "gato") { this.state = 0; this.timer = 2; }
    }
  }

  // Telegráfico en el piso: zona de radio r centrada en p; k = 0..1 cuánto falta (el aro interior crece hasta el borde)
  private showTele(p: B.Vector3 | null, r = 0, k = 0) {
    for (const t of this.tele) t.isVisible = !!p;
    if (!p) return;
    const [zone, fill] = this.tele;
    zone.rotation.y = fill.rotation.y = this.aim; // solo importa en el sector del cortacercos
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
    let speed = d.speed * this.spd;
    let turn = 6;
    if (this.slow > 0) { this.slow -= dt; speed *= d.boss ? 0.8 : 0.45; } // empapado: se arrastra
    this.clock += dt;
    if (d.boss && !this.enraged && this.hp < this.maxHp * 0.5) { this.enraged = true; this.phaseUp = true; } // fase 2: aviso en main.ts
    if (this.enraged) speed *= 1.2;

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
      const sp = (dive ? d.speed * 1.7 : Math.min(d.speed, gd * 3)) * this.spd * (this.slow > 0 ? 0.45 : 1);
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

    if (this.kind === "aspiradora") {
      // Ciclo: anda hacia el auto → aro rojo de succión que se llena (1,4 s) → succiona 2,6 s → aro chico (0,8 s) → 3 ráfagas de tuercas en abanico
      this.timer -= dt;
      this.pull = 0;
      if (this.state === 0) {
        this.showTele(null);
        if (this.timer <= 0) { this.state = 1; this.timer = 1.4; }
      } else if (this.state === 1 || this.state === 2) {
        speed = this.state === 2 ? 2 : 0; turn = 2;
        this.showTele(this.pos, 20, this.state === 1 ? 1 - this.timer / 1.4 : 1);
        if (this.state === 2) {
          this.pull = dist < 20 ? 9 + 12 * (1 - dist / 20) : 0;
          if (Math.random() < dt * 25) { const a = Math.random() * 6.3, r = 5 + Math.random() * 14; FX.dust(this.pos.add(new B.Vector3(Math.sin(a) * r, 0.3, Math.cos(a) * r))); } // solo visual
        }
        if (this.timer <= 0) { if (this.state === 1) { this.state = 2; this.timer = 2.6; } else { this.state = 3; this.timer = 0.8; } }
      } else if (this.state === 3) {
        speed = 0; turn = 5;
        this.showTele(this.pos, 5, 1 - this.timer / 0.8);
        if (this.timer <= 0) { this.state = 4; this.shots = 3; this.timer = 0; }
      } else if (this.timer <= 0) {
        speed = 0;
        this.timer = 0.3;
        if (this.shots-- > 0) {
          const base = Math.atan2(to.x, to.z) + (this.shots - 1) * 0.09; // cada ráfaga corrida un poco: hay huecos para pasar
          this.fan = Array.from({ length: 7 }, (_, i) => { const a = base + (i - 3) * 0.2; return new B.Vector3(Math.sin(a), 0.12, Math.cos(a)).normalize(); });
          this.body.setAngularVelocity(B.Vector3.Zero());
          return "fan";
        }
        this.state = 0; this.timer = 3.5; this.showTele(null);
      } else speed = 0;
    }

    if (this.kind === "cortacercos") {
      // Persigue y cada tanto anuncia un barrido en arco (sector rojo de 10 m que se llena en 1 s); al barrer deja un cable con chispas
      this.timer -= dt;
      this.shockCd -= dt;
      for (let i = this.cables.length - 1; i >= 0; i--) {
        const cb = this.cables[i];
        if (Math.random() < dt * 2) FX.sparks(B.Vector3.Lerp(cb.a, cb.b, Math.random())); // solo visual
        if ((cb.life -= dt) <= 0) { cb.m.dispose(); this.cables.splice(i, 1); }
      }
      if (this.state === 0) {
        this.showTele(null);
        if (this.timer <= 0 && dist < 16) { this.state = 1; this.timer = 1; this.aim = Math.atan2(to.x, to.z); }
        else if (this.timer <= -4) { this.dropCable(); this.timer = 0; } // lejos: igual va sembrando cables
      } else {
        speed = 0; turn = 0;
        this.showTele(this.pos, 10, 1 - this.timer / 1);
        if (this.timer <= 0) {
          this.state = 0; this.timer = 2.2; this.showTele(null);
          this.dropCable();
          for (let k = -2; k <= 2; k++) { const a = this.aim + k * 0.5; FX.sparks(this.pos.add(new B.Vector3(Math.sin(a) * 8, 0.6, Math.cos(a) * 8))); }
          // ¿El auto quedó dentro del sector (±60°, 10 m)?
          const off = Math.atan2(Math.sin(Math.atan2(to.x, to.z) - this.aim), Math.cos(Math.atan2(to.x, to.z) - this.aim));
          if (dist < 10 + 1 && Math.abs(off) < Math.PI / 3) return "slash";
          return "swing";
        }
      }
      if (this.shockCd <= 0 && this.onCable(target)) { this.shockCd = 0.5; return "shock"; }
    }

    if (this.kind === "gato") {
      // Eulalio: errático. Zigzaguea a ritmo cambiante y cada tanto elige al azar entre salto (aro rojo), trompo o arranque.
      // Fase 2: maúlla y llama polillas
      this.timer -= dt;
      if (this.airborne) {
        this.showTele(this.land, 11, 1);
        if (v.y <= 0 && this.groundY(0.3) !== null) { this.airborne = false; this.state = 0; this.timer = 1.2; this.showTele(null); return "slam"; }
        return;
      }
      if (this.state === 0) {
        const w = Math.sin(this.clock * 2.3) * 0.9 + Math.sin(this.clock * 5.1) * 0.35;
        move = rot(to, w); speed *= 0.7 + 0.5 * Math.sin(this.clock * 1.7 + 1) ** 2 * 1.6;
        if (this.enraged && (this.meowCd -= dt) <= 0) { this.meowCd = 10; return "meow"; }
        if (this.timer <= 0 && dist < 45) {
          const r = rng();
          if (r < 0.4) { this.state = 1; this.timer = 1.0; }
          else if (r < 0.75) { this.state = 2; this.timer = 0.6; }
          else { this.state = 4; this.timer = 0.55; this.dir = (rng() < 0.5 ? -1 : 1) * (0.6 + rng() * 0.9); }
        }
      } else if (this.state === 1) { // salto anunciado
        speed = 0; turn = 5;
        if (this.timer > 0.4) { const reach = Math.min(dist, 24); this.land.set(this.pos.x + to.x * reach, reach < dist ? this.pos.y : target.y - 0.3, this.pos.z + to.z * reach); }
        this.showTele(this.land, 11, 1 - this.timer / 1);
        if (this.timer <= 0) {
          const T = (2 * 14) / 25;
          const j = this.land.subtract(this.pos); j.y = 0;
          this.body.setLinearVelocity(j.scaleInPlace(1 / T).addInPlace(new B.Vector3(0, 14, 0)));
          this.airborne = true;
          return;
        }
      } else if (this.state === 2 || this.state === 3) { // trompo: se frena girando y sale rodando hacia el auto
        if (this.state === 2) {
          speed = 0; this.body.setAngularVelocity(new B.Vector3(0, 16, 0));
          if (this.timer <= 0) { this.state = 3; this.timer = 1.8; }
          return;
        }
        move = rot(to, Math.sin(this.clock * 3) * 0.35); speed = 17;
        this.body.setLinearVelocity(new B.Vector3(v.x + (move.x * speed - v.x) * Math.min(1, dt * 5), v.y, v.z + (move.z * speed - v.z) * Math.min(1, dt * 5)));
        this.body.setAngularVelocity(new B.Vector3(0, 16, 0));
        if (this.timer <= 0) { this.state = 0; this.timer = 1.5 + rng() * 1.5; }
        return;
      } else { // arranque: se tira de costado a toda velocidad (a veces hacia el auto, a veces no)
        move = rot(to, this.dir); speed = 26; turn = 12;
        if (this.timer <= 0) { this.state = 0; this.timer = 1.2 + rng() * 1.5; }
      }
    }

    if (this.kind === "perro") {
      // Felipe: bulldog francés desquiciado. Salta, hace zoomies (corre zigzagueando al doble de velocidad) o gira como loco
      this.timer -= dt;
      if (this.airborne) {
        if (v.y <= 0 && this.groundY(0.3) !== null) { this.airborne = false; return "slam"; }
        return;
      }
      if (this.state === 1) { // zoomies
        move = rot(to, Math.sin(this.clock * 4.2) * 1.2 + Math.sin(this.clock * 9) * 0.4); speed *= 2.1; turn = 10;
        if (this.timer <= 0) { this.state = 0; this.timer = 1.2; }
      } else if (this.state === 2) { // giro
        speed *= 0.9; this.body.setAngularVelocity(new B.Vector3(0, 14, 0));
        const want = to.scale(speed), k = Math.min(1, dt * 4);
        this.body.setLinearVelocity(new B.Vector3(v.x + (want.x - v.x) * k, v.y, v.z + (want.z - v.z) * k));
        if (this.timer <= 0) { this.state = 0; this.timer = 1.2; }
        return;
      } else if (this.timer <= 0 && dist < 40) {
        const r = rng();
        if (r < 0.45) {
          this.timer = this.enraged ? 2.6 : 3.8;
          this.airborne = true;
          const jump = to.scale(Math.min(dist, 25) * 1.1).addInPlace(UP.scale(22));
          this.body.setLinearVelocity(jump);
          return;
        }
        this.state = r < 0.8 ? 1 : 2; this.timer = this.state === 1 ? 2.6 : 1.6;
      }
    }

    // Velocidad objetivo directa (hordas: barato y legible); la física separa a los enemigos
    const want = move.scale(speed);
    const k = Math.min(1, dt * (this.kind === "hormiga" ? 6 : 4));
    this.body.setLinearVelocity(new B.Vector3(v.x + (want.x - v.x) * k, v.y, v.z + (want.z - v.z) * k));
    this.body.setAngularVelocity(new B.Vector3(0, B.Scalar.Clamp(diff * turn, -turn, turn), 0));
  }

  // Élite: rápida (doble velocidad, 60% de vida) o blindada (triple vida, 5 veces más pesada: casi no se la empuja).
  // El aura es una instancia hija (aro en el piso + halo emisivo); el cofre al morir lo suelta main.ts (kill)
  makeElite(t: Elite) {
    this.elite = t;
    if (t === "rapida") { this.spd = 2; this.hp = this.maxHp *= 0.6; }
    else {
      this.hp = this.maxHp *= 3;
      const m = this.def.mass * 5, h = this.def.size[1];
      this.body.setMassProperties({ mass: m, inertia: new B.Vector3(0, m, 0), centerOfMass: new B.Vector3(0, h / 2, 0) }); // masa + inercia juntas
    }
    const a = (this.aura = auraTemplate(t).createInstance("aura"));
    a.parent = this.node;
    a.scaling.setAll(this.radius * 1.25);
  }

  // Cortacercos: un cable de 7 m tirado en el piso detrás suyo (dura 14 s, como mucho 8)
  private dropCable() {
    const back = this.node.forward.scale(-this.def.size[2] * 0.55), side = this.node.right.scale(3.5);
    const c = this.pos.add(back); c.y = (this.groundY(3) ?? this.pos.y) + 0.08;
    const m = cableTemplate().createInstance("cable");
    m.position.copyFrom(c);
    m.rotation.y = Math.atan2(side.x, side.z);
    this.cables.push({ m, a: c.subtract(side), b: c.add(side), life: 14 });
    if (this.cables.length > 8) this.cables.shift()!.m.dispose();
  }
  // ¿El punto p está sobre algún cable? (distancia a cada segmento en el plano)
  onCable(p: B.Vector3) {
    return this.cables.some(({ a, b }) => {
      const abx = b.x - a.x, abz = b.z - a.z, t = B.Scalar.Clamp(((p.x - a.x) * abx + (p.z - a.z) * abz) / (abx * abx + abz * abz), 0, 1);
      return Math.hypot(p.x - a.x - abx * t, p.z - a.z - abz * t) < 1;
    });
  }

  dispose() { this.agg.dispose(); this.node.dispose(); for (const t of this.tele) t.dispose(); for (const c of this.cables) c.m.dispose(); }
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
