import * as B from "@babylonjs/core";
import type { Car } from "./car";
import type { Enemy } from "./enemies";
import { FX } from "./fx";
import { SFX } from "./sfx";
import { box, cyl, merge, sph, template, tor } from "./models";
import { M, pbr } from "./render";

// ---------- Pasivas ----------
export type PassiveId = "iman" | "resorte" | "turbo" | "litio" | "capacitor" | "lego";
export const PASSIVES: Record<PassiveId, { name: string; desc: string }> = {
  iman: { name: "Imán de heladera", desc: "+30% radio de recolección" },
  resorte: { name: "Resorte", desc: "+12% área y velocidad de proyectiles" },
  turbo: { name: "Motor turbo", desc: "+6% velocidad, turbo se recarga más rápido" },
  litio: { name: "Pila de litio", desc: "+20 vida máxima y regeneración" },
  capacitor: { name: "Capacitor", desc: "-8% tiempo de recarga de armas" },
  lego: { name: "Paragolpes LEGO", desc: "-8% daño recibido, más peso" },
};

export function passiveStats(p: Partial<Record<PassiveId, number>>, perm: { hp: number; dmg: number; spd: number; mag: number }) {
  const l = (id: PassiveId) => p[id] ?? 0;
  return {
    magnet: 6 * (1 + 0.3 * l("iman")) * (1 + 0.1 * perm.mag),
    area: 1 + 0.12 * l("resorte"),
    speedMul: (1 + 0.06 * l("turbo")) * (1 + 0.04 * perm.spd),
    boostRegen: 14 * (1 + 0.25 * l("turbo")),
    maxHp: 20 * l("litio") + 10 * perm.hp,
    regen: 0.4 * l("litio"),
    cooldown: Math.pow(0.92, l("capacitor")),
    armor: 1 - Math.pow(0.92, l("lego")),
    mass: 1 + 0.1 * l("lego"),
    dmg: 1 + 0.1 * perm.dmg,
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

export type WeaponId = "gomitas" | "clips" | "chispero" | "petardos" | "tesla" | "lanza";
export const WEAPONS: Record<WeaponId, { name: string; desc: string; evo: PassiveId; evoName: string; evoDesc: string }> = {
  gomitas: { name: "Lanza-gomitas", desc: "Dispara gomitas al enemigo más cercano", evo: "resorte", evoName: "Gomitas Saltarinas", evoDesc: "5 gomitas que rebotan entre enemigos" },
  clips: { name: "Clips orbitales", desc: "Clips que giran a tu alrededor", evo: "iman", evoName: "Tornado de Clips", evoDesc: "8 clips enormes en órbita amplia" },
  chispero: { name: "Chispero", desc: "Dejás fuego al manejar", evo: "turbo", evoName: "Estela Infernal", evoDesc: "Fuego ancho, largo y devastador" },
  petardos: { name: "Petardos", desc: "Lanza petardos que explotan en área", evo: "litio", evoName: "Bomba de Racimo", evoDesc: "Cada explosión suelta 4 más" },
  tesla: { name: "Antena Tesla", desc: "Rayo que salta entre enemigos", evo: "capacitor", evoName: "Tormenta Eléctrica", evoDesc: "Cadenas de 10, casi sin recarga" },
  lanza: { name: "Lápiz-lanza", desc: "+35% daño al embestir por nivel", evo: "lego", evoName: "Ariete", evoDesc: "Invulnerable con turbo; embestir genera onda expansiva" },
};

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
  tpl = template("gomita", () => [sph(0.45, pbr("gummy", { color: "#ff3d7f", rough: 0.15, alpha: 0.85, emissive: "#5a0020" }), [0, 0, 0], [1, 0.8, 1.2])]);
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
      let dead = (s.life -= c.dt) <= 0;
      for (const e of c.enemies) if (!s.hit.has(e) && B.Vector3.Distance(s.m.position, e.pos.add(new B.Vector3(0, 0.4, 0))) < e.radius + 0.35) {
        c.damage(e, dmg, s.dir.scale(2));
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
      const m = this.tpl.createInstance("f");
      m.position.set(c.car.pos.x, 0.03, c.car.pos.z);
      m.scaling.setAll(r);
      this.fires.push({ m, life: this.evolved ? 4 : 1.2 + 0.3 * this.lv, r });
      if (Math.random() < 0.4) FX.hit(m.position);
    }
    const dps = (this.evolved ? 50 : 10 + 6 * this.lv) * c.st.dmg;
    for (const f of [...this.fires]) {
      f.life -= c.dt;
      f.m.scaling.setAll(f.r * Math.min(1, f.life * 2) * (0.9 + Math.random() * 0.2));
      for (const e of c.enemies) if (Math.hypot(e.pos.x - f.m.position.x, e.pos.z - f.m.position.z) < f.r + e.radius * 0.5) c.damage(e, dps * c.dt);
      if (f.life <= 0) { f.m.dispose(); this.fires.splice(this.fires.indexOf(f), 1); }
    }
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
        const t = near[(Math.random() * near.length) | 0];
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
      const first = nearest(c.car.pos, c.enemies, 9);
      if (first) {
        this.cd = this.cdMax = (this.evolved ? 0.45 : Math.max(0.5, 1.4 - 0.1 * this.lv)) * c.st.cooldown;
        const chain = this.evolved ? 10 : 2 + this.lv;
        const dmg = (18 + 8 * this.lv) * c.st.dmg * (this.evolved ? 1.5 : 1);
        const hit = new Set<Enemy>();
        const pts = [c.car.pos.add(new B.Vector3(0.4, 1.6, -0.7))];
        let cur: Enemy | null = first;
        while (cur && hit.size < chain) {
          hit.add(cur);
          c.damage(cur, dmg);
          const a = pts[pts.length - 1], b = cur.pos.add(new B.Vector3(0, 0.6, 0));
          for (let k = 1; k <= 3; k++) pts.push(B.Vector3.Lerp(a, b, k / 4).addInPlace(new B.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8)));
          pts.push(b);
          const from: Enemy = cur;
          cur = null;
          let bd = 6;
          for (const e of c.enemies) if (!hit.has(e)) { const d = B.Vector3.Distance(e.pos, from.pos); if (d < bd) { bd = d; cur = e; } }
        }
        SFX.zap();
        const m = B.MeshBuilder.CreateLines("bolt", { points: pts }, c.scene);
        m.color = new B.Color3(0.6, 0.9, 1).scale(3);
        m.isPickable = false;
        this.bolts.push({ m, life: 0.12 });
      }
    }
    for (const b of [...this.bolts]) if ((b.life -= c.dt) <= 0) { b.m.dispose(); this.bolts.splice(this.bolts.indexOf(b), 1); }
  }
  dispose() { for (const b of this.bolts) b.m.dispose(); }
}

class Lanza extends Weapon {
  update() {} // pasiva: su efecto vive en la embestida (main.ts)
}

// Pieza visible de cada arma, montada sobre el auto (también se usa como vista previa en las cartas)
export function mountFor(id: WeaponId, car: Car): B.Mesh {
  const [, h, l] = car.def.size;
  const top = h * 0.5 + 0.3, rear = -l * 0.42, nose = l * 0.5;
  const parts: Record<WeaponId, () => B.Mesh[]> = {
    gomitas: () => [
      box(0.36, 0.2, 0.42, M.metal("#2b2d31"), [0, top, 0.05]),
      cyl(0.1, 0.1, 0.55, M.metal("#111"), [0, top + 0.02, 0.45], [Math.PI / 2, 0, 0], 8),
      sph(0.3, pbr("gummy", { color: "#ff3d7f", rough: 0.15, alpha: 0.85, emissive: "#5a0020" }), [0, top + 0.2, -0.05]),
    ],
    clips: () => [box(0.5, 0.12, 0.12, M.plastic("#ef4444"), [0, h * 0.2, nose + 0.05]), box(0.12, 0.12, 0.22, M.metal(), [0.2, h * 0.2, nose + 0.15]), box(0.12, 0.12, 0.22, M.metal(), [-0.2, h * 0.2, nose + 0.15])],
    chispero: () => [-1, 1].flatMap((s) => [
      cyl(0.13, 0.13, 0.5, M.metal("#9ca3af"), [s * 0.25, h * 0.1, rear - 0.1], [Math.PI / 2, 0, 0], 8),
      cyl(0.1, 0.1, 0.06, M.glow("#ff6a00"), [s * 0.25, h * 0.1, rear - 0.36], [Math.PI / 2, 0, 0], 8),
    ]),
    petardos: () => [box(0.55, 0.08, 0.35, M.metal("#374151"), [0, top - 0.05, rear + 0.25]), ...[-0.18, 0, 0.18].map((x) => cyl(0.13, 0.13, 0.45, M.plastic("#dc2626"), [x, top + 0.12, rear + 0.25], [-0.7, 0, 0], 8))],
    tesla: () => [cyl(0.14, 0.18, 0.5, M.metal("#b87333"), [-0.35, top + 0.1, -0.35], undefined, 8), ...[0, 1, 2].map((i) => tor(0.3, 0.05, M.metal("#b87333"), [-0.35, top + 0.02 + i * 0.13, -0.35], undefined, 10)), sph(0.18, M.glow("#35d0ff"), [-0.35, top + 0.42, -0.35])],
    lanza: () => [cyl(0.14, 0.14, 1.8, M.plastic("#facc15"), [0, h * 0.15, nose + 0.8], [Math.PI / 2, 0, 0], 6), cyl(0, 0.14, 0.4, M.matte("#f1c27d"), [0, h * 0.15, nose + 1.9], [Math.PI / 2, 0, 0], 6)],
  };
  const m = merge("mount_" + id, parts[id]());
  m.parent = car.vis;
  return m;
}

export function makeWeapon(id: WeaponId): Weapon {
  const C = { gomitas: Gomitas, clips: Clips, chispero: Chispero, petardos: Petardos, tesla: Tesla, lanza: Lanza }[id];
  return new C(id);
}

// ---------- Opciones al subir de nivel ----------
export type Offer = { kind: "weapon" | "passive" | "evo" | "heal"; id: string; title: string; icon: string; desc: string; lv?: number };

export function levelOffers(ws: Weapon[], ps: Partial<Record<PassiveId, number>>, n = 3): Offer[] {
  const pool: Offer[] = [];
  for (const id of Object.keys(WEAPONS) as WeaponId[]) {
    const w = ws.find((x) => x.id === id);
    if (!w && ws.length < 6) pool.push({ kind: "weapon", id, title: WEAPONS[id].name, icon: id, desc: WEAPONS[id].desc, lv: 1 });
    else if (w && w.lv < 5 && !w.evolved) pool.push({ kind: "weapon", id, title: WEAPONS[id].name, icon: id, desc: `Nivel ${w.lv + 1}: más daño y alcance`, lv: w.lv + 1 });
  }
  const owned = Object.keys(ps).length;
  for (const id of Object.keys(PASSIVES) as PassiveId[]) {
    const l = ps[id] ?? 0;
    if ((l || owned < 6) && l < 5) pool.push({ kind: "passive", id, title: PASSIVES[id].name, icon: id, desc: PASSIVES[id].desc, lv: l + 1 });
  }
  pool.sort(() => Math.random() - 0.5);
  const out = pool.slice(0, n);
  while (out.length < n) out.push({ kind: "heal", id: "heal", title: "Reparación", icon: "heal", desc: "Recuperás 40 de vida" });
  return out;
}

export function evoOffer(ws: Weapon[], ps: Partial<Record<PassiveId, number>>): Offer | null {
  const w = ws.find((x) => x.lv >= 5 && !x.evolved && (ps[WEAPONS[x.id].evo] ?? 0) > 0);
  return w ? { kind: "evo", id: w.id, title: WEAPONS[w.id].evoName, icon: "evo", desc: WEAPONS[w.id].evoDesc } : null;
}
