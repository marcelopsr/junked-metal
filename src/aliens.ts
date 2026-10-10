// Aliens de chatarra de la luna (docs/LUNA.md, fase 2): mismo idioma Folded que las hormigas (chapa plegada, remaches) con luces
// alienígenas verdes y cian que no se apagan con la niebla (de lejos, en el lado oscuro, se ven las luces). Acá viven sus modelos
// (procedurales con caminata horneada: glb.ts los trata como un bicho Folded más) y su IA; enemies.ts y glb.ts solo los registran.
// Primera tanda (4 de 8): enjambre, tirador de onda, saltador lunar y emboscador de cráter. Solo aparecen en la luna (spawnTable).
import * as B from "@babylonjs/core";
import { FOLD } from "./folded";
import { along, kit, piv } from "./folded_slice";
import { pbr } from "./render";
import { template, tor, sph } from "./models";
import { BAL } from "./balance";
import { rng } from "./rng";
import { FX } from "./fx";
import { alignYaw, arc, at, FOOT, LUNA, MOON, onFloor, toLocal, yawOf } from "./moon";
import type { Enemy, Kind } from "./enemies";

/** Tipos alien (la nave nodriza los suelta con LUNA.spawn). */
export const ALIENS = ["enjambre", "tirador", "saltador", "emboscador"] as const;
export type Alien = (typeof ALIENS)[number];
export const isAlien = (k: string): k is Alien => (ALIENS as readonly string[]).includes(k);

const ATK = BAL.ataques;
type V3 = [number, number, number];
const GREEN = "#7dff5a", CYAN = "#3ff2ff";
// Luz alienígena: emisivo fuerte y sin niebla (como enemyLights de moon.ts); queda como su propia submalla al fusionar
const glow = (c: string) => { const m = pbr("alienGlow" + c, { color: c, rough: 0.3, emissive: c }); m.fogEnabled = false; m.emissiveIntensity = 2; return m; };
const hull = () => FOLD.painted("#2f4f56", 0.55, 81), plate = () => FOLD.painted("#5b6b72", 0.6, 82), shell = () => FOLD.chitin("#1d3b36");

// ---------- Patas (mismo esquema que la hormiga de folded_slice.ts: un hueso por pata, cadera + rumbo) ----------
type Hip = [V3, number];
type Kit = ReturnType<typeof kit>;
function legs(K: Kit, hips: Hip[], knee: V3, foot: V3, w: number, b0: number) {
  const { G, strut, bone } = K, mat = shell();
  let b = b0;
  for (const [[hx, hy, hz], yaw] of hips) for (const s of [1, -1]) {
    bone(b++);
    const a = s > 0 ? yaw : Math.PI - yaw, P = (x: number, y: number, z: number): V3 => [hx * s + x * Math.cos(a) + z * Math.sin(a), hy + y, hz - x * Math.sin(a) + z * Math.cos(a)];
    const kn = P(...knee), ft = P(...foot);
    G.box(w * 1.3, w * 1.3, w * 1.3, FOLD.bare(), P(0, 0, 0));
    strut(P(0, 0, 0), kn, w, w * 1.2, mat); G.box(w * 1.3, w * 1.3, w * 1.3, FOLD.bare(), kn);
    strut(kn, ft, w * 0.75, w * 0.9, mat); G.box(w * 1.4, w * 0.5, w * 1.6, FOLD.dark(), ft);
  }
  bone(0);
}
/** Caminata en trípode: patas alternadas en fase opuesta (como antPose). */
function legPose(out: B.Matrix[], hips: Hip[], walk: number, amp = 0.42, lift = 0.3) {
  const ph = walk * Math.PI * 2;
  hips.forEach(([[hx, hy, hz]], i) => { for (const s of [1, -1]) {
    const f = ph + ((i + (s > 0 ? 0 : 1)) % 2 ? Math.PI : 0);
    out.push(piv(new B.Vector3(hx * s, hy, hz), B.Matrix.RotationZ(s * Math.max(0, Math.cos(f)) * lift).multiply(B.Matrix.RotationY(Math.sin(f) * amp))));
  } });
  return out;
}

// ---------- Enjambre: cápsula hexagonal chica con núcleo cian, aguijón y 4 patas. Huesos: 0 cuerpo, 1-4 patas ----------
const SW_HIPS: Hip[] = [[[0.15, 0.28, 0.1], 0.5], [[0.15, 0.28, -0.1], -0.5]];
function swarmBody() {
  const K = kit(), { G } = K;
  along(G, 0.34, 0.42, 0.5, hull(), [0, 0.3, 0]);
  G.plate([0, 0.5, -0.1], [Math.PI / 2, 0, 0], 0.24, 0.24, plate());
  G.sph(0.24, glow(CYAN), [0, 0.46, 0.08]); // núcleo
  G.box(0.2, 0.05, 0.04, glow(GREEN), [0, 0.33, 0.26]); // visor
  G.cyl(0.02, 0.22, FOLD.bare(), [0, 0.3, -0.35], [-Math.PI / 2, 0, 0], 6, 0.1); // aguijón
  legs(K, SW_HIPS, [0.2, 0.12, 0], [0.4, -0.28, 0.02], 0.045, 1);
  return K.done(1.4);
}
const swarmPose = (_v: number, walk: number, atk: number) => legPose([B.Matrix.Translation(0, 0.03 * Math.abs(Math.sin(walk * Math.PI * 4)), 0.1 * Math.sin(atk * Math.PI))], SW_HIPS, walk, 0.5, 0.35);

// ---------- Tirador de onda: vaina sobre 4 patas con la pistolita arriba (emisor de anillos cian). Huesos: 0 cuerpo, 1-4 patas, 5 arma ----------
const SH_HIPS: Hip[] = [[[0.24, 0.5, 0.18], 0.6], [[0.24, 0.5, -0.18], -0.6]];
const GUN = new B.Vector3(0, 1.0, 0);
function shooterBody() {
  const K = kit(), { G, bone } = K, g = glow(GREEN);
  along(G, 0.62, 0.5, 0.62, hull(), [0, 0.62, 0]);
  along(G, 0.68, 0.68, 0.06, g, [0, 0.62, 0.08]); // faja de luz
  G.plate([0, 0.94, -0.02], [Math.PI / 2, 0, 0], 0.36, 0.44, plate());
  G.cyl(0.3, 0.2, shell(), [0, 0.3, 0], undefined, 6, 0.12); // panza
  for (const s of [-1, 1]) G.box(0.1, 0.06, 0.04, g, [s * 0.12, 0.7, 0.31]); // ojos
  bone(5);
  G.box(0.2, 0.12, 0.24, FOLD.dark(), [0, 1.0, 0]);
  along(G, 0.12, 0.16, 0.56, FOLD.bare(), [0, 1.06, 0.3]); // caño
  for (const s of [-1, 1]) G.box(0.05, 0.08, 0.2, g, [s * 0.09, 1.06, 0.22]); // bobinas de carga
  along(G, 0.34, 0.34, 0.04, glow(CYAN), [0, 1.06, 0.58]); // emisor: dos anillos
  along(G, 0.24, 0.24, 0.04, glow(CYAN), [0, 1.06, 0.64]);
  along(G, 0.42, 0.18, 0.1, plate(), [0, 1.06, 0.52]); // plato
  bone(0);
  legs(K, SH_HIPS, [0.3, 0.22, 0], [0.62, -0.5, 0.02], 0.07, 1);
  return K.done(2);
}
function shooterPose(_v: number, walk: number, atk: number) {
  const out = legPose([B.Matrix.Translation(0, -0.04 * atk, 0)], SH_HIPS, walk);
  const kick = atk > 0.85 ? (1 - atk) / 0.15 : 0; // al disparar: retroceso
  out.push(piv(GUN, B.Matrix.RotationX(-0.25 * Math.min(1, atk / 0.85) + 0.03 * Math.sin(walk * Math.PI * 4))).multiply(B.Matrix.Translation(0, -0.04 * atk, -0.14 * kick)));
  return out;
}

// ---------- Saltador lunar: cuña con cabeza de rana, patas traseras de resorte y toberas. Huesos: 0 cuerpo, 1-2 traseras, 3-4 delanteras ----------
function jumperBody() {
  const K = kit(), { G, strut, bone } = K, g = glow(GREEN), sh = shell();
  G.box(0.5, 0.3, 0.7, hull(), [0, 0.5, 0], [-0.25, 0, 0]);
  G.box(0.42, 0.22, 0.3, sh, [0, 0.66, 0.38]);
  G.plate([0, 0.67, -0.05], [Math.PI / 2 - 0.25, 0, 0], 0.34, 0.4, plate());
  for (const s of [-1, 1]) {
    G.sph(0.14, g, [s * 0.15, 0.79, 0.46]); // ojos
    along(G, 0.14, 0.2, 0.22, FOLD.dark(), [s * 0.17, 0.5, -0.42]); // toberas
    G.box(0.1, 0.1, 0.03, glow(CYAN), [s * 0.17, 0.5, -0.54]);
  }
  for (const s of [1, -1]) { // traseras: muslo hacia adelante y arriba, canilla larga atrás (resorte de rana)
    bone(s > 0 ? 1 : 2);
    const hip: V3 = [s * 0.27, 0.45, -0.18], kn: V3 = [s * 0.4, 0.62, 0.08], ft: V3 = [s * 0.38, 0.05, -0.3];
    G.box(0.1, 0.1, 0.1, FOLD.bare(), hip); strut(hip, kn, 0.1, 0.12, sh); G.box(0.1, 0.1, 0.1, FOLD.bare(), kn);
    strut(kn, ft, 0.07, 0.08, sh); G.box(0.14, 0.04, 0.3, FOLD.dark(), [ft[0], 0.02, -0.28]);
  }
  for (const s of [1, -1]) {
    bone(s > 0 ? 3 : 4);
    strut([s * 0.17, 0.42, 0.3], [s * 0.24, 0.04, 0.44], 0.06, 0.07, sh); G.box(0.1, 0.04, 0.12, FOLD.dark(), [s * 0.24, 0.02, 0.46]);
  }
  bone(0);
  return K.done(2);
}
function jumperPose(_v: number, walk: number, atk: number) {
  const hop = Math.max(0, Math.sin(walk * Math.PI * 2)), c = atk; // atk = agazapado (0 parado, 1 a fondo)
  const body = B.Matrix.RotationX(0.15 * c).multiply(B.Matrix.Translation(0, 0.06 * hop - 0.16 * c, 0));
  const out = [body];
  for (const s of [1, -1]) out.push(piv(new B.Vector3(s * 0.27, 0.45, -0.18), B.Matrix.RotationX(-0.5 * hop + 0.45 * c)).multiply(body));
  for (const s of [1, -1]) out.push(piv(new B.Vector3(s * 0.17, 0.42, 0.3), B.Matrix.RotationX(0.35 * hop - 0.3 * c)).multiply(body));
  return out;
}

// ---------- Emboscador de cráter: caparazón chato con tapa de roca, tenazas y un señuelo de luz en una antena (lo único que asoma enterrado).
// Huesos: 0 cuerpo, 1-4 patas, 5 tenazas ----------
const AM_HIPS: Hip[] = [[[0.48, 0.32, 0.22], 0.5], [[0.48, 0.32, -0.22], -0.5]];
const LURE = 1.32; // altura del señuelo: enterrado a alien_emboscador_hondo, asoma LURE − hondo
function ambushBody() {
  const K = kit(), { G, strut, bone } = K, g = glow(GREEN), lid = FOLD.painted("#6f7275", 0.75, 83);
  G.box(1.05, 0.3, 1.0, hull(), [0, 0.38, 0]);
  G.box(1.3, 0.08, 1.2, lid, [0, 0.56, -0.02]); // tapa (se confunde con el regolito)
  for (const x of [-0.3, 0.3]) G.bend([x, 0.61, -0.55], [x, 0.61, 0.5], 0.03, lid);
  G.rivets([-0.6, 0.6, 0.56], [0.6, 0.6, 0.56], 7, [0, 0, 1]);
  G.box(0.7, 0.07, 0.04, g, [0, 0.36, 0.51]); // boca
  for (const [x, y] of [[-0.18, 0.47], [0.18, 0.47], [0, 0.5]]) G.sph(0.1, g, [x, y, 0.5]); // ojos
  G.tube([[0, 0.6, 0.2], [0, 1.0, 0.24], [0, 1.24, 0.38], [0, LURE - 0.05, 0.5]], 0.025, FOLD.dark()); // antena
  G.sph(0.16, glow(CYAN), [0, LURE, 0.52]); // señuelo
  bone(5);
  for (const s of [-1, 1]) {
    strut([s * 0.34, 0.34, 0.45], [s * 0.3, 0.3, 0.86], 0.09, 0.1, shell());
    G.box(0.08, 0.08, 0.2, FOLD.bare(), [s * 0.24, 0.3, 0.94], [0, -s * 0.5, 0]);
  }
  bone(0);
  legs(K, AM_HIPS, [0.3, 0.22, 0], [0.6, -0.32, 0.02], 0.08, 1);
  return K.done(2);
}
function ambushPose(_v: number, walk: number, atk: number) {
  const out = legPose([B.Matrix.Identity()], AM_HIPS, walk, 0.38, 0.28);
  out.push(piv(new B.Vector3(0, 0.34, 0.45), B.Matrix.RotationX(-0.6 * Math.sin(atk * Math.PI)))); // tarascón
  return out;
}

/** Plantillas Folded con caminata horneada (glb.ts las agrega a PROC). */
export const ALIEN_PROC: Record<Alien, { build: (vis: number) => B.Mesh[]; bones: number; pose: (vis: number, walk: number, atk: number) => B.Matrix[] }> = {
  enjambre: { build: swarmBody, bones: 5, pose: swarmPose },
  tirador: { build: shooterBody, bones: 6, pose: shooterPose },
  saltador: { build: jumperBody, bones: 5, pose: jumperPose },
  emboscador: { build: ambushBody, bones: 6, pose: ambushPose },
};
/** Registro en GLB (glb.ts): sin archivo; atk = segundos de su animación de ataque (carga del tirador, agazapada del saltador). */
export const ALIEN_GLB = {
  enjambre: { file: "enjambre", scale: 1 },
  tirador: { file: "tirador", scale: 1, atk: ATK.alien_tirador_aviso_s },
  saltador: { file: "saltador", scale: 1, atk: ATK.alien_saltador_aviso_s },
  emboscador: { file: "emboscador", scale: 1 },
};

// ---------- IA (enemies.ts → think, en el marco local del bicho) ----------
// Devuelve: número = multiplicador de la persecución común (negativo = se aleja); texto = evento para main.ts; null = ya movió el cuerpo.
type AI = (e: Enemy, dt: number, to: B.Vector3, dist: number) => number | string | null;
let packOwed = 0; // compañeros de enjambre ya pedidos que todavía no pensaron (no piden otra manada)
const fly = new WeakMap<Enemy, { from: B.Vector3; t: number }>();
const _p = new B.Vector3();
export const ALIEN_AI: Record<Alien, AI> = {
  // Llega en manada (el primero pide al resto alrededor suyo) y zigzaguea de a muchos hasta estar encima
  enjambre: (e, _dt, to, dist) => {
    if (!e.state) {
      e.state = 1;
      if (packOwed > 0) packOwed--;
      else if (LUNA.spawn) {
        const n = ATK.alien_enjambre_grupo - 1;
        packOwed += n;
        for (let i = 0; i < n; i++) { const a = rng() * 6.3, r = 1.5 + rng() * 2.5; LUNA.spawn("enjambre" as Kind, at(e.pos, Math.cos(a) * r, 0, Math.sin(a) * r)); }
      }
    }
    if (dist > 4) { const w = Math.sin(e.clock * 3 + e.walk) * 0.6, x = to.x, z = to.z; to.x = x * Math.cos(w) + z * Math.sin(w); to.z = -x * Math.sin(w) + z * Math.cos(w); }
    return 1;
  },
  // Guarda distancia; se planta, carga la pistolita (aviso: chispas + el caño que sube) y suelta un anillo lento hacia donde está el auto
  tirador: (e, dt, _to, dist) => {
    if (e.atk >= 0) {
      if ((e.atk += dt) < ATK.alien_tirador_aviso_s) return 0;
      e.atk = -1; e.timer = ATK.alien_tirador_cada_s;
      return "wave";
    }
    e.timer -= dt;
    if (dist < ATK.alien_tirador_cerca) return -0.8; // retrocede mirando al auto
    if (dist > ATK.alien_tirador_distancia) return 1;
    if (e.timer <= 0) { e.atk = 0; return "spit_aim"; }
    return 0;
  },
  // Se agazapa con un aro donde va a caer (fijo: moverse es esquivarlo) y salta en un arco largo de baja gravedad (arc de moon.ts)
  saltador: (e, dt, to, dist) => {
    const R = ATK.alien_saltador_radio, wind = ATK.alien_saltador_aviso_s;
    if (e.state === 2) {
      const f = fly.get(e)!;
      f.t += dt / ATK.alien_saltador_vuelo_s;
      arc(f.from, e.land, Math.min(1, f.t), ATK.alien_saltador_altura, _p);
      const v = _p.subtractInPlace(e.pos).scaleInPlace(1 / Math.max(dt, 1e-3)); // la velocidad que lo lleva al punto del arco
      e.body.setLinearVelocity(MOON.on ? toLocal(v, e.pos) : v.clone()); e.body.setAngularVelocity(B.Vector3.Zero());
      if (f.t >= 1) { e.state = 0; e.atk = -1; e.timer = ATK.alien_saltador_cada_s; e.body.setGravityFactor(1); e.showTele(null); FX.dust(e.pos); }
      return null;
    }
    if (e.state === 1) {
      e.showTele(e.land, R, (e.atk += dt) / wind);
      if (e.atk < wind) return 0;
      e.state = 2; e.atk = 0; e.body.setGravityFactor(0); // en el aire lo lleva el arco (atk 0 = patas estiradas)
      const f = fly.get(e) ?? fly.set(e, { from: new B.Vector3(), t: 0 }).get(e)!;
      f.from.copyFrom(e.pos); f.t = 0;
      return null;
    }
    e.timer -= dt;
    if (e.timer <= 0 && dist > ATK.alien_saltador_min && dist < ATK.alien_saltador_alcance) {
      e.state = 1; e.atk = 0;
      onFloor(at(e.pos, to.x * dist, 0, to.z * dist), 0, e.land); // cae donde está el auto ahora
      return 0;
    }
    return 1;
  },
  // Enterrado (solo asoma el señuelo de luz), se acerca bajo tierra si el auto está lejos; cerca, salta encima y persigue un rato
  emboscador: (e, dt, to, dist) => {
    if (e.state === 0) {
      if (MOON.on) FOOT.set(e.body, -ATK.alien_emboscador_hondo); // el piso de moon.ts lo sostiene bajo la superficie
      e.touchCd = Math.max(e.touchCd, 0.3); // enterrado no muerde
      if (dist > ATK.alien_emboscador_radio) return dist > 25 ? 0.35 : 0;
      FOOT.delete(e.body); e.state = 1; e.timer = ATK.alien_emboscador_activo_s;
      e.body.setLinearVelocity(new B.Vector3(to.x * ATK.alien_emboscador_salto, 7, to.z * ATK.alien_emboscador_salto));
      FX.dust(e.pos);
      return "spit_aim"; // chispas + marca en el piso donde salió
    }
    if ((e.timer -= dt) <= 0 && dist > ATK.alien_emboscador_radio * 2) e.state = 0; // lejos otra vez: se vuelve a enterrar
    return 1;
  },
};

// ---------- Onda del tirador: anillo cian que viaja lento a la altura del auto (main.ts lo mueve como el ácido) ----------
const waveTpl = () => template("alienOnda", () => [tor(1.5, 0.16, glow(CYAN), [0, 0, 0], [Math.PI / 2, 0, 0], 16), sph(0.36, glow(GREEN), [0, 0, 0], undefined, 6)]);
/** Proyectil de la onda (forma de los escupitajos de main.ts): sale del caño y va derecho hacia donde estaba el auto al disparar. */
export function alienWave(e: Enemy, car: B.Vector3) {
  const from = at(e.pos, 0, 1.2, 0), dir = car.subtract(from).normalize(), m = waveTpl().createInstance("onda");
  m.position.copyFrom(from);
  // ponytail: la orientación se fija al salir; en la luna el anillo se inclina un poco al recorrer la curva (≤25°); techo: reorientarlo por cuadro
  if (MOON.on) m.rotationQuaternion = alignYaw(from, yawOf(dir, from)); else m.rotation.y = Math.atan2(dir.x, dir.z);
  return { m, v: dir.scale(ATK.alien_onda_vel), life: ATK.alien_onda_vida_s, k: e.kind, float: true }; // float: sin caída (main.ts)
}
