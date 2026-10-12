import type * as B from "@babylonjs/core";
import type { Car } from "./car";
import { box, cyl, merge, sph, tor } from "./models";
import { M, pbr } from "./render";
import { FUSIONS, isFusion, NMAX, type FusionId, type Weapon, type WeaponId } from "./weapons/base";
import { Agua } from "./weapons/agua";
import { Bengalas } from "./weapons/bengalas";
import { Bobinas } from "./weapons/bobinas";
import { Bocina } from "./weapons/bocina";
import { Canicas } from "./weapons/canicas";
import { Chispero } from "./weapons/chispero";
import { Clips } from "./weapons/clips";
import { Fusion } from "./weapons/fusion";
import { Gomitas } from "./weapons/gomitas";
import { Helado } from "./weapons/helado";
import { Lanza } from "./weapons/lanza";
import { Petardos } from "./weapons/petardos";
import { Regla } from "./weapons/regla";
import { Tesla } from "./weapons/tesla";
import { Trompo } from "./weapons/trompo";
import { Tuercas } from "./weapons/tuercas";
import { Ventilador } from "./weapons/ventilador";
import { Yoyo } from "./weapons/yoyo";

// Fachada de las armas: todo `import ... from "./weapons"` pasa por acá.
export * from "./weapons/base";
export * from "./weapons/passives";
export * from "./weapons/offers";
export { setScoop } from "./weapons/gomitas";

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
    helado: () => [cyl(0.34, 0.02, 0.5, M.matte("#d9a15a"), [-0.3, top + 0.3, 0.1], undefined, 8), sph(0.4, M.plastic("#f7a8cf"), [-0.3, top + 0.6, 0.1]), sph(0.26, M.plastic("#9be3ff"), [-0.3, top + 0.85, 0.1])],
    bocina: () => [box(0.3, 0.2, 0.3, M.metal("#2b2d31"), [0, top, 0.1]), cyl(0.12, 0.5, 0.6, M.plastic("#ffc24d"), [0, top + 0.1, 0.55], [Math.PI / 2, 0, 0], 12)],
    trompo: () => [cyl(0.42, 0.04, 0.4, M.plastic("#b783ff"), [0.3, top + 0.2, -0.1], undefined, 10), cyl(0.5, 0.5, 0.06, M.metal("#e6e9ee"), [0.3, top + 0.42, -0.1], undefined, 12)],
    tuercas: () => [cyl(0.4, 0.4, 0.5, M.metal("#a8b0ba"), [0, top + 0.1, -0.1], undefined, 6), box(0.6, 0.12, 0.2, M.plastic("#dc2626"), [0, top - 0.1, -0.1]), cyl(0.18, 0.18, 0.54, M.matte("#2b2d31"), [0, top + 0.1, -0.1], undefined, 8)],
    bobinas: () => [cyl(0.2, 0.26, 0.5, M.metal("#b87333"), [0.3, top + 0.1, rear + 0.2], undefined, 8), ...[0, 1].map((i) => tor(0.28, 0.05, M.metal("#8a5a2b"), [0.3, top + 0.02 + i * 0.14, rear + 0.2], undefined, 8)), sph(0.15, M.glow("#35d0ff"), [0.3, top + 0.42, rear + 0.2])],
    ventilador: () => [cyl(0.1, 0.1, 0.45, M.matte("#2b2d31"), [0, top + 0.1, -0.1], undefined, 6), cyl(0.36, 0.36, 0.06, M.plastic("#9be3ff"), [0, top + 0.45, -0.1], [Math.PI / 2, 0, 0], 12), box(0.7, 0.05, 0.1, M.plastic("#e6e9ee"), [0, top + 0.45, -0.04])],
    canicas: () => [box(0.1, 0.5, 0.1, M.matte("#8a5a2b"), [0.3, top + 0.2, 0.1]), box(0.1, 0.1, 0.5, M.matte("#8a5a2b"), [0.3, top + 0.4, 0.1]), sph(0.2, M.glow("#7de8a8"), [0.3, top + 0.45, 0.35])],
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

// Registro. Arma nueva = un archivo src/weapons/<id>.ts (clase que extiende Weapon) + 1 línea acá en CLASSES
// (+ su entrada en WeaponId/WEAPONS de weapons/base.ts y su pieza en mountFor).
const CLASSES: Record<Exclude<WeaponId, FusionId>, new (id: WeaponId) => Weapon> = { gomitas: Gomitas, clips: Clips, chispero: Chispero, petardos: Petardos, tesla: Tesla, lanza: Lanza, agua: Agua, yoyo: Yoyo, bengalas: Bengalas, regla: Regla, helado: Helado, bocina: Bocina, trompo: Trompo, tuercas: Tuercas, bobinas: Bobinas, ventilador: Ventilador, canicas: Canicas };

export function makeWeapon(id: WeaponId): Weapon {
  return isFusion(id) ? new Fusion(id, makeWeapon) : new CLASSES[id](id);
}

// Aplica una fusión: saca las dos armas de origen (y sus piezas montadas) y agrega la nueva
export function fuse(ws: Weapon[], id: WeaponId): Weapon[] {
  const from = FUSIONS.find((f) => f.id === id)!.from;
  const out = ws.filter((w) => { if (!from.includes(w.id)) return true; w.dispose(); w.mount?.dispose(); return false; });
  const n = makeWeapon(id); n.lv = NMAX; n.evolved = true;
  out.push(n);
  return out;
}
