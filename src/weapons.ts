import * as B from "@babylonjs/core";
import type { Car } from "./car";
import type { Enemy } from "./enemies";
import { FX } from "./fx";
import { SFX } from "./sfx";
import { box, cyl, merge, sph, template, tor } from "./models";
import { M, pbr } from "./render";
import { rng } from "./rng";

// ---------- Pasivas ----------
export type PassiveId = "iman" | "resorte" | "turbo" | "litio" | "capacitor" | "lego" | "lupa";
export const PASSIVES: Record<PassiveId, { name: string; desc: string }> = {
  iman: { name: "Imán de heladera", desc: "+30% radio de recolección" },
  resorte: { name: "Resorte", desc: "+12% área y velocidad de proyectiles" },
  turbo: { name: "Motor turbo", desc: "+6% velocidad, turbo se recarga más rápido" },
  litio: { name: "Pila de litio", desc: "+20 vida máxima y regeneración" },
  capacitor: { name: "Capacitor", desc: "-8% tiempo de recarga de armas" },
  lego: { name: "Paragolpes LEGO", desc: "-8% daño recibido, más peso" },
  lupa: { name: "Lupa", desc: "+8% daño de todas las armas" },
};

export function passiveStats(p: Partial<Record<PassiveId, number>>, perm: { hp: number; dmg: number; spd: number; mag: number; xp?: number }) {
  const l = (id: PassiveId) => p[id] ?? 0;
  return {
    magnet: 6 * (1 + 0.3 * l("iman")) * (1 + 0.1 * perm.mag),
    area: 1 + 0.12 * l("resorte"),
    speedMul: (1 + 0.06 * l("turbo")) * (1 + 0.04 * perm.spd),
    boostRegen: 14 * (1 + 0.25 * l("turbo")),
    maxHp: 20 * l("litio") + 10 * perm.hp,
    regen: 1 + 0.5 * l("litio"),
    cooldown: Math.pow(0.92, l("capacitor")),
    armor: 1 - Math.pow(0.92, l("lego")),
    mass: 1 + 0.1 * l("lego"),
    dmg: (1 + 0.1 * perm.dmg) * (1 + 0.08 * l("lupa")),
    xp: 1 + 0.05 * (perm.xp ?? 0),
  };
}
export type PStats = ReturnType<typeof passiveStats>;

// ---------- Armas ----------
export interface Ctx {
  scene: B.Scene;
  car: Car;
  enemies: Enemy[];
  dt: number;
  st: PStats;
  fs: number;
  damage(e: Enemy, dmg: number, knock?: B.Vector3): void;
  explode(pos: B.Vector3, r: number, dmg: number): void;
}

export type WeaponId = "gomitas" | "clips" | "chispero" | "petardos" | "tesla" | "lanza" | "agua" | "yoyo" | "bengalas" | "regla" | FusionId;
export type FusionId = "chispazo" | "globos" | "anillo" | "yoyoelec" | "vapor";
export const WEAPONS: Record<WeaponId, { name: string; desc: string; evo: PassiveId; evoName: string; evoDesc: string }> = {
  gomitas: { name: "Lanza-gomitas", desc: "Dispara gomitas al enemigo más cercano", evo: "resorte", evoName: "Gomitas Saltarinas", evoDesc: "5 gomitas que rebotan entre enemigos" },
  clips: { name: "Clips orbitales", desc: "Clips que giran alrededor del auto", evo: "iman", evoName: "Tornado de Clips", evoDesc: "8 clips enormes en órbita amplia" },
  chispero: { name: "Chispero", desc: "Deja fuego al manejar", evo: "turbo", evoName: "Estela Infernal", evoDesc: "Fuego ancho, largo y devastador" },
  petardos: { name: "Petardos", desc: "Lanza petardos que explotan en área", evo: "litio", evoName: "Bomba de Racimo", evoDesc: "Cada explosión suelta 4 más" },
  tesla: { name: "Antena Tesla", desc: "Rayo que salta entre enemigos", evo: "capacitor", evoName: "Tormenta Eléctrica", evoDesc: "Cadenas de 10, casi sin recarga" },
  lanza: { name: "Lápiz-lanza", desc: "+35% daño al embestir por nivel", evo: "lego", evoName: "Ariete", evoDesc: "Invulnerable con turbo; embestir genera onda expansiva" },
  agua: { name: "Pistola de agua", desc: "Chorro en cono que empuja y frena a los enemigos", evo: "lupa", evoName: "Hidrolavadora", evoDesc: "Chorro ancho, largo y casi continuo que frena en seco" },
  // Una pasiva puede evolucionar más de un arma: evoOffer busca por arma (WEAPONS[id].evo)
  yoyo: { name: "Yo-yo", desc: "Va y vuelve en línea atravesando enemigos; pega más fuerte a la vuelta", evo: "resorte", evoName: "Doble yo-yo", evoDesc: "Dos yo-yos en órbita que salen y vuelven sin parar" },
  bengalas: { name: "Bengalas", desc: "Dejan zonas en llamas donde caen", evo: "litio", evoName: "Lluvia de bengalas", evoDesc: "Seis bengalas por tanda; zonas grandes y duraderas" },
  regla: { name: "Bumerán de regla", desc: "Una regla escolar que vuela en arco y vuelve, atravesando todo", evo: "iman", evoName: "Bumerán triple", evoDesc: "Tres reglas en abanico, más largas y rápidas" },
  // Fusiones: nunca salen sueltas en las cartas (ver FUSIONS); evoName = nombre porque nacen evolucionadas
  chispazo: { name: "Petardos eléctricos", desc: "", evo: "capacitor", evoName: "Petardos eléctricos", evoDesc: "" },
  globos: { name: "Globos de agua", desc: "", evo: "resorte", evoName: "Globos de agua", evoDesc: "" },
  anillo: { name: "Anillo de fuego", desc: "", evo: "iman", evoName: "Anillo de fuego", evoDesc: "" },
  yoyoelec: { name: "Yo-yo eléctrico", desc: "", evo: "resorte", evoName: "Yo-yo eléctrico", evoDesc: "" },
  vapor: { name: "Vapor", desc: "", evo: "litio", evoName: "Vapor", evoDesc: "" },
};

// Fusiones: dos armas a nivel 5 (o evolucionadas) se combinan en una sola, que nace evolucionada y libera un lugar.
// La fusión conserva lo evolucionado de ambas y suma una sinergia (ver class Fusion).
export const FUSIONS: { id: FusionId; from: [WeaponId, WeaponId]; desc: string }[] = [
  { id: "chispazo", from: ["petardos", "tesla"], desc: "Racimo de petardos y tormenta eléctrica; cada explosión suelta un rayo en cadena" },
  { id: "globos", from: ["gomitas", "agua"], desc: "Gomitas saltarinas e hidrolavadora; cada gomita revienta y empapa en área" },
  { id: "anillo", from: ["clips", "chispero"], desc: "Tornado de clips y estela infernal; los clips encendidos dejan fuego en su órbita" },
  { id: "yoyoelec", from: ["yoyo", "tesla"], desc: "Doble yo-yo y tormenta eléctrica; cada golpe del yo-yo suelta un rayo en cadena" },
  { id: "vapor", from: ["bengalas", "agua"], desc: "Lluvia de bengalas e hidrolavadora; las zonas en llamas largan vapor que quema más, ocupa más y frena" },
];
const isFusion = (id: WeaponId): id is FusionId => FUSIONS.some((f) => f.id === id);

export abstract class Weapon {
  lv = 1;
  evolved = false;
  cd = 0.5;
  cdMax = 1; // para el indicador circular del HUD
  mount?: B.Mesh; // pieza visible montada en el auto
  get cdFrac() { return Math.max(0, Math.min(1, this.cd / this.cdMax)); }
  constructor(public id: WeaponId) {}
  abstract update(c: Ctx): void;
  dispose() {}
}

const nearest = (pos: B.Vector3, enemies: Enemy[], range: number, skip?: Set<Enemy>) => {
  let best: Enemy | null = null, bd = range;
  for (const e of enemies) { if (skip?.has(e)) continue; const d = B.Vector3.Distance(e.pos, pos); if (d < bd) { bd = d; best = e; } }
  return best;
};

class Gomitas extends Weapon {
  shots: { m: B.InstancedMesh; dir: B.Vector3; life: number; bounces: number; hit: Set<Enemy> }[] = [];
  onHit?: (c: Ctx, e: Enemy) => void; // sinergia de fusión (Globos de agua)
  tpl = template("gomita", () => [sph(0.45, pbr("gummy", { color: "#b6ff6a", rough: 0.15, alpha: 0.85, emissive: "#3a8a00" }), [0, 0, 0], [1, 0.8, 1.2])]);
  update(c: Ctx) {
    if ((this.cd -= c.dt) <= 0) {
      const t = nearest(c.car.pos, c.enemies, 22);
      if (t) {
        this.cd = this.cdMax = (1.1 * c.st.cooldown) / (1 + 0.12 * (this.lv - 1)) / (this.evolved ? 1.5 : 1);
        const n = this.evolved ? 5 : 1 + Math.floor((this.lv - 1) / 2);
        const base = Math.atan2(t.pos.x - c.car.pos.x, t.pos.z - c.car.pos.z);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.16;
          const m = this.tpl.createInstance("g");
          m.position.set(c.car.pos.x, c.car.pos.y + 0.5, c.car.pos.z);
          this.shots.push({ m, dir: new B.Vector3(Math.sin(a), 0, Math.cos(a)), life: 1.2, bounces: this.evolved ? 3 : 0, hit: new Set() });
        }
      }
    }
    const dmg = (10 + 4 * this.lv) * c.st.dmg * (this.evolved ? 1.4 : 1);
    for (const s of [...this.shots]) {
      s.m.position.addInPlace(s.dir.scale(30 * c.st.area * c.dt));
      s.m.rotation.y += c.dt * 10;
      if (Math.random() < c.dt * 18) FX.trail(s.m.position, "#ff9bd4");
      let dead = (s.life -= c.dt) <= 0;
      for (const e of c.enemies) if (!s.hit.has(e) && B.Vector3.Distance(s.m.position, e.pos.add(new B.Vector3(0, 0.4, 0))) < e.radius + 0.35) {
        c.damage(e, dmg, s.dir.scale(2));
        this.onHit?.(c, e);
        s.hit.add(e);
        if (s.bounces-- > 0) {
          const nx = nearest(e.pos, c.enemies, 12, s.hit);
          if (nx) { s.dir = nx.pos.subtract(s.m.position); s.dir.y = 0; s.dir.normalize(); s.life = 0.8; break; }
        }
        dead = true;
        break;
      }
      if (dead) { s.m.dispose(); this.shots.splice(this.shots.indexOf(s), 1); }
    }
  }
  dispose() { for (const s of this.shots) s.m.dispose(); }
}

class Clips extends Weapon {
  ms: B.InstancedMesh[] = [];
  a = 0;
  tpl = template("clip", () => [tor(0.9, 0.08, M.metal("#d6dbe1"), [0, 0, 0], undefined, 12)]);
  update(c: Ctx) {
    const n = this.evolved ? 8 : this.lv + 1;
    const r = (this.evolved ? 4.5 : 2.6) * c.st.area;
    const sc = this.evolved ? 2 : 1 + this.lv * 0.1;
    while (this.ms.length < n) this.ms.push(this.tpl.createInstance("c"));
    this.a += c.dt * (this.evolved ? 5 : 3.5);
    const dmg = (this.evolved ? 30 : 8 + 4 * this.lv) * c.st.dmg;
    this.ms.forEach((m, i) => {
      const a = this.a + (i * Math.PI * 2) / n;
      m.position.set(c.car.pos.x + Math.sin(a) * r, c.car.pos.y + 0.4, c.car.pos.z + Math.cos(a) * r);
      m.rotation.set(0, -a, 0.3);
      m.scaling.set(sc, sc, sc * 2.2);
      for (const e of c.enemies) if (e.hitCd <= 0 && B.Vector3.Distance(m.position, e.pos) < e.radius + 0.5 * sc) {
        c.damage(e, dmg, e.pos.subtract(c.car.pos).normalize().scale(3));
        e.hitCd = 0.35;
      }
    });
  }
  dispose() { for (const m of this.ms) m.dispose(); }
}

class Chispero extends Weapon {
  fires: { m: B.InstancedMesh; life: number; r: number }[] = [];
  t = 0;
  tpl = template("fire", () => {
    const d = B.MeshBuilder.CreateDisc("f", { radius: 1, tessellation: 9 });
    d.rotation.x = Math.PI / 2;
    d.position.y = 0.05;
    d.material = pbr("fireMat", { color: "#ff6a00", rough: 1, emissive: "#ff5a00", alpha: 0.85 });
    return [d];
  });
  update(c: Ctx) {
    const r = (this.evolved ? 1.7 : 0.8 + 0.08 * this.lv) * c.st.area;
    if (Math.abs(c.fs) > 4 && (this.t -= c.dt) <= 0) {
      this.t = 0.09;
      this.drop(c.car.pos, r, this.evolved ? 4 : 1.2 + 0.3 * this.lv);
    }
    const dps = (this.evolved ? 50 : 10 + 6 * this.lv) * c.st.dmg;
    for (const f of [...this.fires]) {
      f.life -= c.dt;
      f.m.scaling.setAll(f.r * Math.min(1, f.life * 2) * (0.9 + Math.random() * 0.2));
      for (const e of c.enemies) if (Math.hypot(e.pos.x - f.m.position.x, e.pos.z - f.m.position.z) < f.r + e.radius * 0.5) c.damage(e, dps * c.dt);
      if (f.life <= 0) { f.m.dispose(); this.fires.splice(this.fires.indexOf(f), 1); }
    }
  }
  drop(p: B.Vector3, r: number, life: number) {
    const m = this.tpl.createInstance("f");
    m.position.set(p.x, 0.03, p.z);
    m.scaling.setAll(r);
    this.fires.push({ m, life, r });
    if (Math.random() < 0.4) FX.hit(m.position);
  }
  dispose() { for (const f of this.fires) f.m.dispose(); }
}

class Petardos extends Weapon {
  flying: { m: B.InstancedMesh; from: B.Vector3; to: B.Vector3; t: number }[] = [];
  tpl = template("petardo", () => [cyl(0.3, 0.3, 0.8, M.plastic("#dc2626"), [0, 0, 0], [Math.PI / 2, 0, 0], 8), box(0.05, 0.05, 0.3, M.matte("#222"), [0, 0, -0.5])]);
  update(c: Ctx) {
    if ((this.cd -= c.dt) <= 0) {
      this.cd = this.cdMax = Math.max(0.8, 3.2 - 0.3 * this.lv) * c.st.cooldown;
      const n = 1 + Math.floor(this.lv / 3);
      for (let i = 0; i < n; i++) {
        const near = c.enemies.filter((e) => B.Vector3.Distance(e.pos, c.car.pos) < 18);
        if (!near.length) break;
        const t = near[(rng() * near.length) | 0];
        const m = this.tpl.createInstance("p");
        this.flying.push({ m, from: c.car.pos.clone(), to: t.pos.clone(), t: 0 });
      }
    }
    for (const f of [...this.flying]) {
      f.t += c.dt / 0.6;
      const p = B.Vector3.Lerp(f.from, f.to, f.t);
      p.y += Math.sin(Math.PI * f.t) * 5;
      f.m.position.copyFrom(p);
      f.m.rotation.x += c.dt * 12;
      if (Math.random() < c.dt * 18) FX.trail(f.m.position, "#ffb347");
      if (f.t >= 1) {
        const r = (3 + 0.3 * this.lv) * c.st.area, dmg = (30 + 15 * this.lv) * c.st.dmg;
        c.explode(f.to, r, dmg);
        if (this.evolved) for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2; c.explode(f.to.add(new B.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)), r * 0.7, dmg * 0.6); }
        f.m.dispose();
        this.flying.splice(this.flying.indexOf(f), 1);
      }
    }
  }
  dispose() { for (const f of this.flying) f.m.dispose(); }
}

class Tesla extends Weapon {
  bolts: { m: B.LinesMesh; life: number }[] = [];
  update(c: Ctx) {
    if ((this.cd -= c.dt) <= 0) {
      if (this.zap(c, c.car.pos, c.car.pos.add(new B.Vector3(0.4, 1.6, -0.7)), this.evolved ? 10 : 2 + this.lv, (18 + 8 * this.lv) * c.st.dmg * (this.evolved ? 1.5 : 1)))
        this.cd = this.cdMax = (this.evolved ? 0.45 : Math.max(0.5, 1.4 - 0.1 * this.lv)) * c.st.cooldown;
    }
    for (const b of [...this.bolts]) if ((b.life -= c.dt) <= 0) { b.m.dispose(); this.bolts.splice(this.bolts.indexOf(b), 1); }
  }
  // Rayo en cadena desde "from" (busca en 9 m) dibujado desde "start"; devuelve si pegó
  zap(c: Ctx, from: B.Vector3, start: B.Vector3, chain: number, dmg: number) {
    let cur = nearest(from, c.enemies, 9);
    if (!cur) return false;
    const hit = new Set<Enemy>();
    const pts = [start];
    while (cur && hit.size < chain) {
      hit.add(cur);
      c.damage(cur, dmg);
      const a = pts[pts.length - 1], b = cur.pos.add(new B.Vector3(0, 0.6, 0));
      for (let k = 1; k <= 3; k++) pts.push(B.Vector3.Lerp(a, b, k / 4).addInPlace(new B.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8)));
      pts.push(b);
      const prev: Enemy = cur;
      cur = null;
      let bd = 6;
      for (const e of c.enemies) if (!hit.has(e)) { const d = B.Vector3.Distance(e.pos, prev.pos); if (d < bd) { bd = d; cur = e; } }
    }
    SFX.zap();
    const m = B.MeshBuilder.CreateLines("bolt", { points: pts }, c.scene);
    m.color = new B.Color3(0.6, 0.9, 1).scale(3);
    m.isPickable = false;
    this.bolts.push({ m, life: 0.12 });
    return true;
  }
  dispose() { for (const b of this.bolts) b.m.dispose(); }
}

class Lanza extends Weapon {
  update() {} // pasiva: su efecto vive en la embestida (main.ts)
}

// Chorro en cono hacia el enemigo más cercano: daño bajo por tick, empuja y deja empapado (lento) a todo lo que toca.
// El cono decide el daño (determinista); las gotas son solo visuales.
class Agua extends Weapon {
  drops: { m: B.InstancedMesh; v: B.Vector3; life: number }[] = [];
  spray = 0;
  tick = 0;
  dir = new B.Vector3(0, 0, 1);
  tpl = template("gota", () => [sph(0.3, pbr("water", { color: "#9dffc8", rough: 0.05, alpha: 0.7, emissive: "#1f7a4a" }), [0, 0, 0], [1, 1, 1.8], 6)]);
  update(c: Ctx) {
    const R = (this.evolved ? 13 : 8 + 0.6 * this.lv) * c.st.area, half = this.evolved ? 0.5 : 0.3;
    if (this.spray <= 0 && (this.cd -= c.dt) <= 0) {
      const t = nearest(c.car.pos, c.enemies, R);
      if (t) {
        this.spray = this.evolved ? 1.2 : 0.5 + 0.05 * this.lv;
        this.cd = this.cdMax = (this.evolved ? 0.4 : Math.max(0.9, 1.9 - 0.15 * this.lv)) * c.st.cooldown;
        this.dir.set(t.pos.x - c.car.pos.x, 0, t.pos.z - c.car.pos.z).normalize();
      }
    }
    if (this.spray > 0) {
      this.spray -= c.dt;
      if ((this.tick -= c.dt) <= 0) {
        this.tick = 0.1;
        const dmg = (3 + 1.5 * this.lv) * c.st.dmg * (this.evolved ? 1.6 : 1), push = this.evolved ? 5 : 3;
        for (const e of c.enemies) {
          const dx = e.pos.x - c.car.pos.x, dz = e.pos.z - c.car.pos.z, d = Math.hypot(dx, dz);
          if (d < 0.01 || d > R + e.radius) continue;
          if (Math.acos(B.Scalar.Clamp((dx * this.dir.x + dz * this.dir.z) / d, -1, 1)) > half + e.radius / d) continue;
          c.damage(e, dmg, new B.Vector3((dx / d) * push, 0.3, (dz / d) * push));
          e.slow = Math.max(e.slow, this.evolved ? 2 : 1.2);
        }
      }
      for (let k = 0; k < 3 && this.drops.length < 70; k++) {
        const a = Math.atan2(this.dir.x, this.dir.z) + (Math.random() - 0.5) * half * 1.6, sp = 22 + Math.random() * 8;
        const m = this.tpl.createInstance("w");
        m.position.set(c.car.pos.x, c.car.pos.y + 0.8, c.car.pos.z);
        m.rotation.y = a;
        this.drops.push({ m, v: new B.Vector3(Math.sin(a) * sp, 2 + Math.random() * 2, Math.cos(a) * sp), life: R / sp });
      }
    }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const g = this.drops[i];
      g.m.position.addInPlace(g.v.scale(c.dt));
      g.v.y -= 12 * c.dt;
      if ((g.life -= c.dt) <= 0 || g.m.position.y < 0.05) { g.m.dispose(); this.drops.splice(i, 1); }
    }
  }
  dispose() { for (const g of this.drops) g.m.dispose(); }
}


// Yo-yo: sale en línea recta hacia el enemigo más cercano y vuelve al auto; atraviesa todo y pega más a la vuelta.
// Evolución (Doble yo-yo): dos en órbita cuyo hilo se estira y se recoge sin parar (la vuelta = cuando se recoge).
class Yoyo extends Weapon {
  ys: { m: B.InstancedMesh; s: B.InstancedMesh; dir: B.Vector3; d: number; back: boolean; hit: Set<Enemy> }[] = [];
  orb: { m: B.InstancedMesh; s: B.InstancedMesh }[] = [];
  next = new WeakMap<Enemy, number>(); // evolución: cuándo puede volver a pegarle a cada enemigo
  t = 0;
  onHit?: (c: Ctx, e: Enemy) => void; // sinergia de fusión (Yo-yo eléctrico)
  tpl = template("yoyo", () => [
    cyl(0.9, 0.9, 0.22, M.plastic("#1f6f8b"), [0, 0, -0.15], [Math.PI / 2, 0, 0], 12),
    cyl(0.9, 0.9, 0.22, M.plastic("#1f6f8b"), [0, 0, 0.15], [Math.PI / 2, 0, 0], 12),
    tor(0.8, 0.07, M.glow("#8dff6a"), [0, 0, -0.27], [Math.PI / 2, 0, 0], 12),
    tor(0.8, 0.07, M.glow("#8dff6a"), [0, 0, 0.27], [Math.PI / 2, 0, 0], 12),
  ]);
  hilo = template("hilo", () => [cyl(0.04, 0.04, 1, M.glow("#c8ffb0"), [0, 0, 0], [Math.PI / 2, 0, 0], 4)]); // largo 1 en z: se estira por instancia
  private string(s: B.InstancedMesh, a: B.Vector3, b: B.Vector3) {
    s.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    s.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    s.scaling.set(1, 1, Math.hypot(b.x - a.x, b.z - a.z));
  }
  update(c: Ctx) {
    this.t += c.dt;
    const hand = c.car.pos.add(new B.Vector3(0, 0.6, 0));
    if (this.evolved) {
      for (const y of this.ys) { y.m.dispose(); y.s.dispose(); } // los que estaban en vuelo al evolucionar
      this.ys = [];
      // Dos yo-yos opuestos; el radio va y viene entre 2,5 y 7 m (período 1,6 s)
      while (this.orb.length < 2) this.orb.push({ m: this.tpl.createInstance("y"), s: this.hilo.createInstance("h") });
      const ph = (this.t * Math.PI * 2) / 1.6, r = (2.5 + 4.5 * (0.5 - 0.5 * Math.cos(ph))) * c.st.area, back = Math.sin(ph) < 0;
      const dmg = 40 * c.st.dmg * (back ? 1.6 : 1);
      this.orb.forEach((o, i) => {
        const a = this.t * 2.6 + i * Math.PI;
        o.m.position.set(hand.x + Math.sin(a) * r, hand.y, hand.z + Math.cos(a) * r);
        o.m.rotation.set(0, a, this.t * 20);
        this.string(o.s, hand, o.m.position);
        for (const e of c.enemies) if ((this.next.get(e) ?? 0) <= this.t && B.Vector3.Distance(o.m.position, e.pos) < e.radius + 0.9) {
          this.next.set(e, this.t + 0.3);
          c.damage(e, dmg, e.pos.subtract(c.car.pos).normalize().scale(2));
          this.onHit?.(c, e);
        }
      });
      return;
    }
    const R = (9 + 0.8 * this.lv) * c.st.area, sp = 26 * c.st.area;
    if (!this.ys.length && (this.cd -= c.dt) <= 0) {
      const t = nearest(c.car.pos, c.enemies, R + 2);
      if (t) {
        this.cd = this.cdMax = Math.max(0.6, 1.5 - 0.15 * this.lv) * c.st.cooldown;
        const n = 1 + Math.floor((this.lv - 1) / 2), base = Math.atan2(t.pos.x - c.car.pos.x, t.pos.z - c.car.pos.z);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.45;
          this.ys.push({ m: this.tpl.createInstance("y"), s: this.hilo.createInstance("h"), dir: new B.Vector3(Math.sin(a), 0, Math.cos(a)), d: 0, back: false, hit: new Set() });
        }
      }
    }
    const dmg = (14 + 6 * this.lv) * c.st.dmg;
    for (let i = this.ys.length - 1; i >= 0; i--) {
      const y = this.ys[i];
      y.d += (y.back ? -1.3 : 1) * sp * c.dt; // vuelve más rápido de lo que sale
      if (!y.back && y.d >= R) { y.back = true; y.hit.clear(); }
      if (y.back && y.d <= 0) { y.m.dispose(); y.s.dispose(); this.ys.splice(i, 1); continue; }
      y.m.position.copyFrom(hand).addInPlace(y.dir.scale(y.d));
      y.m.rotation.set(0, Math.atan2(y.dir.x, y.dir.z) + Math.PI / 2, this.t * 20);
      this.string(y.s, hand, y.m.position);
      for (const e of c.enemies) if (!y.hit.has(e) && B.Vector3.Distance(y.m.position, e.pos) < e.radius + 0.7) {
        y.hit.add(e);
        c.damage(e, dmg * (y.back ? 1.6 : 1), y.dir.scale(y.back ? -2 : 2));
        this.onHit?.(c, e);
      }
    }
  }
  dispose() { for (const y of [...this.ys, ...this.orb]) { y.m.dispose(); y.s.dispose(); } this.ys = []; this.orb = []; }
}

// Bengalas: vuelan en arco hasta un enemigo al azar y dejan una zona en llamas (verde fósforo: es fuego propio) que daña en área.
class Bengalas extends Weapon {
  flying: { m: B.InstancedMesh; from: B.Vector3; to: B.Vector3; t: number }[] = [];
  zones: { m: B.InstancedMesh; r: number; life: number; max: number }[] = [];
  steam = false; // fusión Vapor: zonas más grandes, más daño y frenan
  tpl = template("bengala", () => [cyl(0.16, 0.16, 0.9, M.plastic("#2c3a28"), [0, 0, 0], [Math.PI / 2, 0, 0], 6), sph(0.35, M.glow("#8dff6a"), [0, 0, 0.5], undefined, 6)]);
  zoneTpl = template("bengalaZona", () => {
    const d = B.MeshBuilder.CreateDisc("f", { radius: 1, tessellation: 12 });
    d.rotation.x = Math.PI / 2;
    d.position.y = 0.06;
    d.material = pbr("flareMat", { color: "#6aff4a", rough: 1, emissive: "#3ad020", alpha: 0.6 });
    return [d];
  });
  update(c: Ctx) {
    const ev = this.evolved;
    if ((this.cd -= c.dt) <= 0) {
      const near = c.enemies.filter((e) => B.Vector3.Distance(e.pos, c.car.pos) < (ev ? 24 : 20));
      if (near.length) {
        this.cd = this.cdMax = (ev ? 2.4 : Math.max(1.8, 3.8 - 0.35 * this.lv)) * c.st.cooldown;
        const n = ev ? 6 : 1 + Math.floor(this.lv / 2);
        for (let i = 0; i < n; i++) {
          const t = near[(rng() * near.length) | 0];
          this.flying.push({ m: this.tpl.createInstance("b"), from: c.car.pos.clone(), to: t.pos.clone(), t: 0 });
        }
      }
    }
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      f.t += c.dt / 0.7;
      const p = B.Vector3.Lerp(f.from, f.to, Math.min(1, f.t));
      p.y += Math.sin(Math.PI * Math.min(1, f.t)) * 6;
      f.m.position.copyFrom(p);
      f.m.rotation.x += c.dt * 10;
      if (Math.random() < c.dt * 18) FX.trail(f.m.position, "#ff6b6b");
      if (f.t >= 1) {
        const r = (ev ? 3 : 1.8 + 0.2 * this.lv) * c.st.area * (this.steam ? 1.3 : 1), life = ev ? 5.5 : 3 + 0.4 * this.lv;
        const m = this.zoneTpl.createInstance("z");
        m.position.set(f.to.x, (f.to.y > 0.5 ? f.to.y - 0.5 : 0) + 0.03, f.to.z);
        this.zones.push({ m, r, life, max: life });
        FX.sparks(m.position);
        f.m.dispose(); this.flying.splice(i, 1);
      }
    }
    const dps = (ev ? 45 : 12 + 6 * this.lv) * c.st.dmg * (this.steam ? 1.25 : 1);
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.life -= c.dt;
      z.m.scaling.setAll(z.r * Math.min(1, (z.max - z.life) * 6, z.life * 2) * (0.92 + Math.random() * 0.16)); // parpadeo: solo visual
      if (this.steam && Math.random() < c.dt * 3) FX.smoke(z.m.position.add(new B.Vector3(0, 0.4, 0)));
      for (const e of c.enemies) if (Math.hypot(e.pos.x - z.m.position.x, e.pos.z - z.m.position.z) < z.r + e.radius * 0.5) {
        c.damage(e, dps * c.dt);
        if (this.steam) e.slow = Math.max(e.slow, 0.5);
      }
      if (z.life <= 0) { z.m.dispose(); this.zones.splice(i, 1); }
    }
  }
  dispose() { for (const f of this.flying) f.m.dispose(); for (const z of this.zones) z.m.dispose(); }
}

// Bumerán de regla: vuela en un lazo (sale por un lado, vuelve por el otro) y regresa al auto; a cada enemigo
// le pega una vez de ida y otra de vuelta. Evolución (Bumerán triple): tres en abanico, más largas.
class Regla extends Weapon {
  rs: { m: B.InstancedMesh; from: B.Vector3; dir: B.Vector3; side: number; t: number; hit: Set<Enemy> }[] = [];
  tpl = template("regla", () => [
    box(0.5, 0.06, 2.6, pbr("regla", { color: "#e8d48a", rough: 0.5, emissive: "#2a5a10" }), [0, 0, 0]),
    ...[-1.1, -0.55, 0, 0.55, 1.1].map((z) => box(0.2, 0.08, 0.04, M.glow("#8dff6a"), [0.15, 0.01, z])),
  ]);
  update(c: Ctx) {
    const ev = this.evolved, R = (ev ? 15 : 10 + this.lv) * c.st.area, T = ev ? 1.1 : 1.4;
    if (!this.rs.length && (this.cd -= c.dt) <= 0) {
      const t = nearest(c.car.pos, c.enemies, R);
      if (t) {
        this.cd = this.cdMax = (ev ? 0.5 : Math.max(0.6, 1.4 - 0.15 * this.lv)) * c.st.cooldown;
        const base = Math.atan2(t.pos.x - c.car.pos.x, t.pos.z - c.car.pos.z);
        const angs = ev ? [-0.7, 0, 0.7] : this.lv >= 4 ? [-0.25, 0.25] : [0];
        angs.forEach((o, i) => this.rs.push({ m: this.tpl.createInstance("r"), from: c.car.pos.clone(), dir: new B.Vector3(Math.sin(base + o), 0, Math.cos(base + o)), side: i % 2 ? -1 : 1, t: 0, hit: new Set() }));
      }
    }
    const dmg = (ev ? 40 : 12 + 5 * this.lv) * c.st.dmg, sc = ev ? 1.4 : 1;
    for (let i = this.rs.length - 1; i >= 0; i--) {
      const r = this.rs[i];
      const half = r.t < 0.5;
      r.t += c.dt / T;
      if (half && r.t >= 0.5) r.hit.clear(); // la vuelta vuelve a pegar
      if (r.t >= 1) { r.m.dispose(); this.rs.splice(i, 1); continue; }
      // Lazo: adelante R·(1-cos θ)/2, de costado 0,35R·sin θ; el origen se desliza hacia el auto para volver a él
      const th = r.t * Math.PI * 2, o = B.Vector3.Lerp(r.from, c.car.pos, r.t);
      const fw = (R * (1 - Math.cos(th))) / 2, sd = 0.35 * R * Math.sin(th) * r.side;
      r.m.position.set(o.x + r.dir.x * fw + r.dir.z * sd, c.car.pos.y + 0.7, o.z + r.dir.z * fw - r.dir.x * sd);
      r.m.rotation.y += c.dt * 18;
      r.m.scaling.setAll(sc);
      for (const e of c.enemies) if (!r.hit.has(e) && Math.hypot(r.m.position.x - e.pos.x, r.m.position.z - e.pos.z) < e.radius + 1.2 * sc) {
        r.hit.add(e);
        c.damage(e, dmg, e.pos.subtract(r.m.position).normalize().scale(2.5));
      }
    }
  }
  dispose() { for (const r of this.rs) r.m.dispose(); }
}

// Fusión: corre las dos armas de origen ya evolucionadas (nivel 5) y les agrega la sinergia de la tabla FUSIONS
class Fusion extends Weapon {
  parts: Weapon[];
  t = 0;
  constructor(id: FusionId) {
    super(id);
    this.parts = FUSIONS.find((f) => f.id === id)!.from.map((p) => { const w = makeWeapon(p); w.lv = 5; w.evolved = true; return w; });
    if (id === "globos") (this.parts[0] as Gomitas).onHit = (c, e) => {
      // La gomita revienta: empapa, empuja y salpica en 3 m
      for (const o of c.enemies) {
        const d = B.Vector3.Distance(o.pos, e.pos);
        if (d < 3 * c.st.area + o.radius) { o.slow = Math.max(o.slow, 2); if (o !== e) c.damage(o, 8 * c.st.dmg, o.pos.subtract(e.pos).normalize().scale(3)); }
      }
    };
    // Cada golpe del yo-yo (como mucho 4 por segundo) suelta un rayo en cadena de 4 enemigos
    if (id === "yoyoelec") (this.parts[0] as Yoyo).onHit = (c, e) => { if (this.t <= 0) { this.t = 0.25; (this.parts[1] as Tesla).zap(c, e.pos, e.pos.add(new B.Vector3(0, 1, 0)), 4, 30 * c.st.dmg); } };
    if (id === "vapor") (this.parts[0] as Bengalas).steam = true;
  }
  get cdFrac() { return this.parts[0].cdFrac; }
  update(c: Ctx) {
    this.t -= c.dt;
    const [a, b] = this.parts;
    if (this.id === "chispazo") {
      // Cada explosión (como mucho 4 por segundo) suelta un rayo en cadena de 4 enemigos
      a.update({ ...c, explode: (p, r, dmg) => { c.explode(p, r, dmg); if (this.t <= 0) { this.t = 0.25; (b as Tesla).zap(c, p, p.add(new B.Vector3(0, 1, 0)), 4, dmg * 0.35); } } });
    } else a.update(c);
    b.update(c);
    if (this.id === "anillo" && this.t <= 0) {
      this.t = 0.3;
      for (const m of (a as Clips).ms) (b as Chispero).drop(m.position, 1.1 * c.st.area, 1.5);
    }
  }
  dispose() { for (const p of this.parts) p.dispose(); }
}

// Pieza visible de cada arma, montada sobre el auto (también se usa como vista previa en las cartas)
export function mountFor(id: WeaponId, car: Car): B.Mesh {
  const [, h, l] = car.def.size;
  const top = h * 0.5 + 0.3, rear = -l * 0.42, nose = l * 0.5;
  const parts: Record<WeaponId, () => B.Mesh[]> = {
    gomitas: () => [
      box(0.36, 0.2, 0.42, M.metal("#2b2d31"), [0, top, 0.05]),
      cyl(0.1, 0.1, 0.55, M.metal("#111"), [0, top + 0.02, 0.45], [Math.PI / 2, 0, 0], 8),
      sph(0.3, pbr("gummy", { color: "#b6ff6a", rough: 0.15, alpha: 0.85, emissive: "#3a8a00" }), [0, top + 0.2, -0.05]),
    ],
    clips: () => [box(0.5, 0.12, 0.12, M.plastic("#ef4444"), [0, h * 0.2, nose + 0.05]), box(0.12, 0.12, 0.22, M.metal(), [0.2, h * 0.2, nose + 0.15]), box(0.12, 0.12, 0.22, M.metal(), [-0.2, h * 0.2, nose + 0.15])],
    chispero: () => [-1, 1].flatMap((s) => [
      cyl(0.13, 0.13, 0.5, M.metal("#9ca3af"), [s * 0.25, h * 0.1, rear - 0.1], [Math.PI / 2, 0, 0], 8),
      cyl(0.1, 0.1, 0.06, M.glow("#ff6a00"), [s * 0.25, h * 0.1, rear - 0.36], [Math.PI / 2, 0, 0], 8),
    ]),
    petardos: () => [box(0.55, 0.08, 0.35, M.metal("#374151"), [0, top - 0.05, rear + 0.25]), ...[-0.18, 0, 0.18].map((x) => cyl(0.13, 0.13, 0.45, M.plastic("#dc2626"), [x, top + 0.12, rear + 0.25], [-0.7, 0, 0], 8))],
    tesla: () => [cyl(0.14, 0.18, 0.5, M.metal("#b87333"), [-0.35, top + 0.1, -0.35], undefined, 8), ...[0, 1, 2].map((i) => tor(0.3, 0.05, M.metal("#b87333"), [-0.35, top + 0.02 + i * 0.13, -0.35], undefined, 10)), sph(0.18, M.glow("#35d0ff"), [-0.35, top + 0.42, -0.35])],
    lanza: () => [cyl(0.14, 0.14, 1.8, M.plastic("#facc15"), [0, h * 0.15, nose + 0.8], [Math.PI / 2, 0, 0], 6), cyl(0, 0.14, 0.4, M.matte("#f1c27d"), [0, h * 0.15, nose + 1.9], [Math.PI / 2, 0, 0], 6)],
    agua: () => [
      cyl(0.34, 0.34, 0.45, pbr("waterTank", { color: "#9dffc8", rough: 0.1, alpha: 0.6, emissive: "#0f4a2a" }), [0.32, top + 0.12, -0.15], undefined, 8),
      box(0.16, 0.16, 0.6, M.plastic("#f59e0b"), [0.32, top - 0.06, 0.25]),
      cyl(0.07, 0.1, 0.25, M.plastic("#1d4ed8"), [0.32, top - 0.06, 0.65], [Math.PI / 2, 0, 0], 6),
    ],
    yoyo: () => [cyl(0.08, 0.08, 0.4, M.metal("#2b2d31"), [0.3, top + 0.1, 0.2], undefined, 6), cyl(0.4, 0.4, 0.12, M.plastic("#1f6f8b"), [0.3, top + 0.35, 0.2], [0, 0, Math.PI / 2], 10), tor(0.36, 0.04, M.glow("#8dff6a"), [0.37, top + 0.35, 0.2], [0, 0, Math.PI / 2], 10)],
    bengalas: () => [box(0.5, 0.1, 0.4, M.metal("#374151"), [-0.25, top - 0.04, rear + 0.3]), ...[-0.38, -0.12].map((x) => cyl(0.14, 0.14, 0.5, M.plastic("#2c3a28"), [x, top + 0.15, rear + 0.3], [-0.6, 0, 0], 6)), sph(0.12, M.glow("#8dff6a"), [-0.25, top + 0.38, rear + 0.48])],
    regla: () => [box(0.28, 0.05, 1.3, pbr("regla", { color: "#e8d48a", rough: 0.5, emissive: "#2a5a10" }), [0, top - 0.02, -0.1]), box(0.1, 0.06, 0.1, M.glow("#8dff6a"), [0.07, top + 0.01, 0.4])],
    yoyoelec: () => [...parts.yoyo(), ...parts.tesla()],
    vapor: () => [...parts.bengalas(), ...parts.agua()],
    chispazo: () => [...parts.petardos(), ...parts.tesla()],
    globos: () => [...parts.gomitas(), ...parts.agua()],
    anillo: () => [...parts.clips(), ...parts.chispero()],
  };
  const m = merge("mount_" + id, parts[id]());
  m.parent = car.vis;
  return m;
}

export function makeWeapon(id: WeaponId): Weapon {
  if (isFusion(id)) return new Fusion(id);
  const C = { gomitas: Gomitas, clips: Clips, chispero: Chispero, petardos: Petardos, tesla: Tesla, lanza: Lanza, agua: Agua, yoyo: Yoyo, bengalas: Bengalas, regla: Regla }[id];
  return new C(id);
}

// ---------- Opciones al subir de nivel ----------
export type Offer = { kind: "weapon" | "passive" | "evo" | "fusion" | "heal"; id: string; title: string; icon: string; desc: string; lv?: number };

export function levelOffers(ws: Weapon[], ps: Partial<Record<PassiveId, number>>, n = 3): Offer[] {
  const pool: Offer[] = [];
  for (const id of Object.keys(WEAPONS) as WeaponId[]) {
    if (isFusion(id)) continue;
    const w = ws.find((x) => x.id === id);
    if (!w && ws.length < 6 && !fusedFrom(ws, id)) pool.push({ kind: "weapon", id, title: WEAPONS[id].name, icon: id, desc: WEAPONS[id].desc, lv: 1 });
    else if (w && w.lv < 5 && !w.evolved) pool.push({ kind: "weapon", id, title: WEAPONS[id].name, icon: id, desc: `Nivel ${w.lv + 1}: más daño y alcance`, lv: w.lv + 1 });
  }
  const owned = Object.keys(ps).length;
  for (const id of Object.keys(PASSIVES) as PassiveId[]) {
    const l = ps[id] ?? 0;
    if ((l || owned < 6) && l < 5) pool.push({ kind: "passive", id, title: PASSIVES[id].name, icon: id, desc: PASSIVES[id].desc, lv: l + 1 });
  }
  pool.sort(() => rng() - 0.5);
  const out = pool.slice(0, n);
  const fu = fusionOffer(ws);
  if (fu) out[0] = fu; // si hay fusión disponible, siempre es la primera carta
  while (out.length < n) out.push({ kind: "heal", id: "heal", title: "Reparación", icon: "heal", desc: "Recupera 40 de vida" });
  return out;
}

export function evoOffer(ws: Weapon[], ps: Partial<Record<PassiveId, number>>): Offer | null {
  const w = ws.find((x) => x.lv >= 5 && !x.evolved && (ps[WEAPONS[x.id].evo] ?? 0) > 0);
  return w ? { kind: "evo", id: w.id, title: WEAPONS[w.id].evoName, icon: "evo", desc: WEAPONS[w.id].evoDesc } : fusionOffer(ws);
}

// Primera fusión cuyas dos armas están a nivel 5 o evolucionadas
export function fusionOffer(ws: Weapon[]): Offer | null {
  const ready = (id: WeaponId) => ws.some((w) => w.id === id && (w.lv >= 5 || w.evolved));
  const f = FUSIONS.find((x) => !ws.some((w) => w.id === x.id) && ready(x.from[0]) && ready(x.from[1])); // cada fusión, una sola vez
  return f ? { kind: "fusion", id: f.id, title: WEAPONS[f.id].name, icon: f.id, desc: `${WEAPONS[f.from[0]].name} + ${WEAPONS[f.from[1]].name}. ${f.desc}` } : null;
}

// Arma que ya se gastó en una fusión que se tiene: no vuelve a ofrecerse (si no, se repetiría la fusión)
const fusedFrom = (ws: Weapon[], id: WeaponId) => FUSIONS.some((f) => f.from.includes(id) && ws.some((w) => w.id === f.id));

// Aplica una fusión: saca las dos armas de origen (y sus piezas montadas) y agrega la nueva
export function fuse(ws: Weapon[], id: WeaponId): Weapon[] {
  const from = FUSIONS.find((f) => f.id === id)!.from;
  const out = ws.filter((w) => { if (!from.includes(w.id)) return true; w.dispose(); w.mount?.dispose(); return false; });
  const n = makeWeapon(id); n.lv = 5; n.evolved = true;
  out.push(n);
  return out;
}
