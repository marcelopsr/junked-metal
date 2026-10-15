import * as B from "@babylonjs/core";
import { BAL } from "./balance";
import type { CamMode } from "./savefmt";
import { save, carOpts, current, shownCar } from "./menu";
import { outroAt, outroZ, ts } from "./outro";
import { mateCam } from "./coop";
import { MOON, moonTick, W, flatL, hflat, upAt, yawOf } from "./moon";
import type { Enemy } from "./enemies";
import type { Player } from "./coop";
import { input, isTouch } from "./input";
import { SHOTS, CAR_YAW, carSpot, menuFov, menuTick } from "./menuscene";
import { beastTick, PED_H, setupBeastCam } from "./bestiary_preview";
import { CARS, type Car } from "./car";
import { carModel } from "./models";
import { photoOn, photoApply } from "./photo-mode";
import { evFog } from "./moon_events";
import { ambient, tickRain } from "./fx";
import { HOLE, LOOK, setDof, setLamp, shadows } from "./render";
import { underRoof, zoneDust } from "./world";
import { rainSfx } from "./sfx";
import { ensure } from "./loading";
import { T_BICHOS } from "./run_loader";

// Cámara: seguimiento de partida (modos CAMS, luna, mesa de menú) y diorama de menús. Estado propio acá; lo compartido entra por initCameraRig.
const R = BAL.ritmo;
// Cámara de maqueta (diorama de juguete): FOV cerrado = 0,7 × el de Configuración (49° → ~34°, 0,6 rad) y distancia ×1,2 (algo más cerca que el encuadre original)
// (tan(17°)/tan(24,5°) ≈ 0,67). Las proporciones back/up de CAMS no cambian, así que el cabeceo sigue ~41° (modo actual).
const DIORAMA_FOV = 0.7, DIORAMA_DIST = 1.2; // 1,45 dejaba auto y props diminutos frente a las láminas
const DOF_FULL = 45, DOF_OFF = 90; // m: distancia cámara-auto hasta la que el DOF es pleno / desde la que se apaga
export interface CameraContext {
  readonly engine: B.AbstractEngine;
  readonly scene: B.Scene;
  readonly cam: B.FreeCamera;
  readonly camH: B.Vector3;
  readonly camUp: B.Vector3;
  readonly camTarget: B.Vector3;
  readonly low: boolean;
  readonly lead: Player;
  readonly enemies: Enemy[];
  readonly state: string;
  readonly simulating: boolean;
  readonly profile: { climate: { day?: boolean } };
  readonly cycleS: number;
  readonly rainK: number;
  readonly lampBoost: boolean;
  readonly occluders: B.AbstractMesh[];
  readonly lab: { on: boolean; back: number; up: number };
  camYaw: number;
  shake: number;
  preview: B.Mesh | null;
  liveM: () => Player[];
}
let c!: CameraContext;
export function initCameraRig(x: CameraContext) { c = x; }
const _camM = new B.Matrix();
let roofK = 0, dynK = 1, moteT = 0, flyT = 0;
export const camReset = () => { dynK = 1; };

// Modos de cámara de partida (Configuración → Juego, se alternan con Cambiar cámara). back/up = metros detrás y arriba (por el zoom del usuario),
// look = cuánto mira por delante del auto, yaw fijo = no gira con el auto (el stick sigue siendo "hacia dónde ir" en pantalla)
export const CAMS: Record<CamMode, { back: number; up: number; look: number; yaw?: number }> = {
  actual: { back: 15, up: 9, look: 4 }, // más baja que antes (13): deja ver el horizonte, como las láminas
  cenital: { back: 2, up: 24, look: 0, yaw: 0 }, // casi vertical: norte (+z) arriba; ×1,8 en pantalla vertical (angosta); la altura se acota para que el anillo de aparición quede fuera de cuadro
  iso: { back: 12, up: 19, look: 0, yaw: Math.PI / 4 }, // diagonal 45° en planta, inclinada 58° hacia abajo (a 45° veía hasta el horizonte)
  baja: { back: 8, up: 4.5, look: 6 },
  dinamica: { back: 15, up: 13, look: 3 }, // la de persecución, multiplicada por dynK (más bichos cerca o más velocidad = más lejos)
};
// Luna: la cámara guarda un rumbo (vector tangente) que viaja con el auto alrededor de la esfera y un "arriba" que sigue la vertical del lugar.
// c.camYaw = ese rumbo medido en el marco local del auto: el stick, el radar y el resto lo leen igual que en el patio.
function moonCam(car: Car, dt: number, follow: boolean) {
  B.Vector3.LerpToRef(c.camUp, upAt(car.pos), 1 - Math.exp(-8 * dt), c.camUp).normalize();
  let hy = yawOf(hflat(c.camH, car.pos), car.pos);
  if (follow) { const t = yawOf(car.root.forward, car.pos); hy += Math.atan2(Math.sin(t - hy), Math.cos(t - hy)) * (1 - Math.exp(-2 * dt)); }
  if (c.state === "outro") hy += dt * 0.45; // el cierre orbita el auto (outroTick suma a c.camYaw, que acá se recalcula)
  c.camH.copyFrom(W(Math.sin(hy), 0, Math.cos(hy), car.pos));
  c.camYaw = hy;
  if (!c.simulating) { moonTick(dt, car.pos, c.cam); evFog(c.scene); }
}
// Encuadres del menú: SHOTS (menuscene.ts, derivados de SCENES), uno por pantalla dentro de su escenario
const shot = (scr: string) => (c.engine.getAspectRatio(c.cam) < 1 && SHOTS[scr + "_v"]) || SHOTS[scr] || SHOTS.main; // _v: encuadre de celular vertical
let previewKey = "", previewR = 0;

export function cameraTick(dt: number) {
  HOLE.r = 0; // se enciende abajo solo en partida con auto (modos archivados lo dejaban activo)
  const k = 1 - Math.exp(-5 * dt);
  if (c.state === "race" || c.state === "duel" || c.state === "match3") {
    // carrera / demolición manejan cámara en su módulo
  } else if (c.lead.car) {
    const cm = CAMS[save.camMode];
    if (MOON.on) moonCam(c.lead.car, dt, cm.yaw === undefined && !input.move && c.state === "play");
    else if (cm.yaw !== undefined) c.camYaw = cm.yaw;
    else if (!input.move && c.state === "play") {
      const f = c.lead.car.root.forward;
      const target = Math.atan2(f.x, f.z);
      c.camYaw += Math.atan2(Math.sin(target - c.camYaw), Math.cos(target - c.camYaw)) * (1 - Math.exp(-2 * dt));
    }
    // Al elegir mejoras la cámara se acerca y gira a 3/4 frontal para ver la pieza montada
    const close = c.state === "level";
    const yaw = close ? c.camYaw + 2.5 : c.camYaw;
    setLamp(c.lead.car.pos, c.lead.car.root.forward, c.lampBoost, dt, MOON.on ? c.lead.car.root.up : undefined);
    if (!c.simulating) { tickRain(dt * ts, c.lead.car.pos, c.lead.car.root.forward, c.rainK); rainSfx(c.rainK); }
    // Polvo que flota dentro del haz del faro
    if (!c.simulating && !MOON.on && (moteT -= dt) <= 0) { // luna: sin motas (son planas) ni bichitos de ambiente
      moteT = 0.09;
      const f = c.lead.car.root.forward, d = 3 + Math.random() * 11, sd = (Math.random() - 0.5) * d * 0.9;
      ambient("mote", new B.Vector3(c.lead.car.pos.x + f.x * d + f.z * sd, 0.4 + Math.random() * 2.2, c.lead.car.pos.z + f.z * d - f.x * sd));
    }
    // Luciérnagas alrededor del auto cuando ya anocheció; en el garaje, polvo bajo los tubos
    const dust = zoneDust();
    if (MOON.on) { /* sin ambiente en la luna */ }
    else if (!c.simulating && dust && (flyT -= dt) <= 0) {
      flyT = 0.05;
      const [x, z, w, d] = dust[Math.floor(Math.random() * dust.length)];
      ambient("mote", new B.Vector3(x + (Math.random() - 0.5) * w, 0.5 + Math.random() * 12, z + (Math.random() - 0.5) * d));
    } else if (!c.simulating && !dust && c.profile.climate.day && (flyT -= dt) <= 0) {
      flyT = 0.15; // de día: pétalos y mariposas en vez de luciérnagas
      const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 24;
      ambient("petal", new B.Vector3(c.lead.car.pos.x + Math.cos(a) * r, 0.4 + Math.random() * 3, c.lead.car.pos.z + Math.sin(a) * r));
    } else if (!c.simulating && !dust && c.cycleS > 0.5 && (flyT -= dt) <= 0) {
      flyT = 0.12 / c.cycleS;
      const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 22;
      ambient("fly", new B.Vector3(c.lead.car.pos.x + Math.cos(a) * r, 0.5 + Math.random() * 2.5, c.lead.car.pos.z + Math.sin(a) * r));
    }
    c.cam.fov = (save.fov * Math.PI) / 180 * DIORAMA_FOV; // Campo de visión (Configuración → Imagen): solo en partida; los encuadres de los menús usan el de fábrica
    const back = MOON.on ? W(Math.sin(yaw), 0, Math.cos(yaw), c.lead.car.pos) : new B.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); // luna: c.camYaw es del marco local del auto
    // Bajo la mesa la cámara baja y se acerca (roofK suaviza entrar y salir); afuera vuelve al zoom del usuario
    roofK += ((underRoof(c.lead.car.pos) ? 1 : 0) - roofK) * (1 - Math.exp(-3 * dt));
    // Dinámica: se aleja con bichos cerca (18 m) o a velocidad; muy lenta para no marear
    if (save.camMode === "dinamica" && c.state === "play") {
      let n = 0; for (const e of c.enemies) if (B.Vector3.DistanceSquared(e.pos, c.lead.car.pos) < 324) n++;
      const v = c.lead.car.body.getLinearVelocity().length() / c.lead.car.def.speed;
      dynK += (1 + 0.4 * Math.min(1, n / 25) + 0.15 * Math.min(1, v) - dynK) * (1 - Math.exp(-0.8 * dt));
    }
    // Bajo techo todos los modos se funden hacia la persecución (con el yaw del modo): desde arriba se vería la mesa
    // Persecución baja en teléfono: pantalla chica, se aleja y sube algo más (vertical, más: el ancho visible es poco) y mira menos adelante
    const cm2 = save.camMode === "baja" && isTouch ? (c.engine.getAspectRatio(c.cam) < 1 ? { back: 14, up: 9, look: 1 } : { back: 9.5, up: 5.5, look: 5 }) : cm;
    const lab = c.lab.on && save.camMode === "actual", P = CAMS.actual;
    // Celular vertical: mirar un poco detrás del auto lo sube en pantalla, por encima de los botones táctiles (SALTO y DERRAPE lo tapaban)
    const tl = isTouch && !c.lab.on && c.state === "play" && save.camMode !== "cenital" && c.engine.getAspectRatio(c.cam) < 1 ? 4 : 0; // solo en juego y fuera de la cenital; bajo techo se funde igual que el resto
    const gb = B.Scalar.Lerp(lab ? c.lab.back : cm2.back, P.back, roofK), gl = B.Scalar.Lerp(cm2.look - tl, P.look, roofK);
    let gu = B.Scalar.Lerp(lab ? c.lab.up : cm2.up, P.up, roofK);
    const zm = (c.lab.on ? 1 : save.zoom) * DIORAMA_DIST * outroZ * (save.camMode === "dinamica" ? dynK : 1) * (MOON.on ? 0.82 : 1), zb = B.Scalar.Lerp(zm, 0.7, roofK), zu = B.Scalar.Lerp(zm, 0.4, roofK);
    gu *= zu;
    if (save.camMode === "cenital") { // la esquina del cuadro (a ras del piso) no pasa del anillo de aparición menos 3 m, con cualquier zoom, FOV y aspecto
      const th = Math.tan(c.cam.fov / 2), asp = c.engine.getAspectRatio(c.cam);
      gu = Math.min(gu * (asp < 1 ? 1.8 : 1), (R.spawn_anillo_min - 3) / Math.hypot(th, th * asp));
    }
    const fp = c.state === "outro" && outroAt ? outroAt : c.lead.car.pos; // foco de la cámara
    const want = fp.subtract(back.scale(close ? 5.5 : gb * zb)).addInPlace(MOON.on ? c.camUp.scale(close ? 3.2 : gu) : new B.Vector3(0, close ? 3.2 : gu, 0));
    c.cam.position = B.Vector3.Lerp(c.cam.position, want, close ? 1 - Math.exp(-8 * dt) : k);
    B.Vector3.LerpToRef(c.camTarget, close ? c.lead.car.pos.add(MOON.on ? c.camUp.scale(-1.4) : new B.Vector3(0, -1.4, 0)) : fp.add(back.scale(gl)), close ? 0.2 : k * 1.5, c.camTarget);
    // Lo que queda entre cámara y auto se tramea (screen-door en render.ts) mientras tapa
    if (!c.simulating) {
      const to = c.lead.car.pos.add(new B.Vector3(0, 0.6, 0)).subtractInPlace(c.cam.position), len = to.length();
      const ray = new B.Ray(c.cam.position, to.scaleInPlace(1 / len), len);
      for (const m of c.occluders) m.isVisible = !ray.intersectsMesh(m, true).hit; // oculta, no trama: con la cámara de maqueta la tapa de la mesa llenaba la pantalla de damero (bruma)
    }
    // Agujero en lo que tapa al auto (render.ts, SnapPlugin): ~2,2 m alrededor del auto, solo lo que está entre la cámara y el auto y más alto que él (.claude/trabajo/CAMARA-oclusion.md)
    if (!c.simulating && c.state === "play" && !MOON.on) {
      const e = c.engine, w = e.getRenderWidth(), h = e.getRenderHeight(), car = c.lead.car.pos;
      const p = B.Vector3.Project(car, B.Matrix.IdentityReadOnly, c.scene.getTransformMatrix(), c.cam.viewport.toGlobal(w, h));
      const d = B.Vector3.Distance(c.cam.position, car);
      HOLE.x = p.x; HOLE.y = e.isWebGPU ? p.y : h - p.y; HOLE.r = (h * 2.2) / (2 * d * Math.tan(c.cam.fov / 2)); // 2,2 m de radio en el mundo
      HOLE.cam.copyFrom(c.cam.position); HOLE.d = d; HOLE.h = car.y + 0.8;
    } else HOLE.r = 0;
    // Profundidad de campo de maqueta: foco en el auto, medido sobre el eje de la cámara (igual que en los menús)
    if (c.low) setDof(0); else {
      const fwd = c.camTarget.subtract(c.cam.position).normalize(), fd = Math.max(1, B.Vector3.Dot(c.lead.car.pos.subtract(c.cam.position), fwd));
      const k = LOOK.dof * B.Scalar.Clamp((DOF_OFF - fd) / (DOF_OFF - DOF_FULL), 0, 1); // cámara alta/lejos: el desenfoque se apaga (a 45 m o menos pleno, a 90 m o más nada)
      if (k < 0.02) setDof(0); else setDof(fd, k);
    }
  } else {
    // Diorama: cada pantalla del menú tiene su encuadre en su escena (SCENES, menuscene.ts); la cámara viaja con lerp suave y se mece un poco
    const scr = current() ?? "main", t = performance.now() / 1000;
    c.cam.fov = menuFov(scr);
    // Escena de la pantalla (estante o mesa) con su luz y foco; al cambiar de escena la cámara corta al encuadre nuevo
    if (menuTick(scr, c.cam, scr === "beast" ? new B.Vector3(0, PED_H + 1, 0) : carSpot(scr)?.addInPlaceFromFloats(0, 0.6, 0) ?? c.camTarget, dt, c.low)) { // foco: el bicho, el auto o lo que mira la cámara
      const [x, y, z, a, b, c2] = shot(scr);
      c.cam.position.set(x, y, z); c.camTarget.set(a, b, c2);
    }
    // Ficha del bestiario: cámara propia según el tamaño del bicho; queda a la izquierda (o arriba en celular vertical) y la info al otro lado
    const bspan = beastTick({ scene: c.scene, dt, on: scr === "beast", ensureBichos: () => void ensure(T_BICHOS), addShake: (val) => { c.shake = Math.max(c.shake, val); } });
    if (bspan !== null) setupBeastCam(bspan, { engine: c.engine, cam: c.cam, dt });
    const [px0, py0, pz0, tx, ty, tz] = shot(scr);
    // Garaje: los autos grandes giran sobre su eje; la cámara se aleja según su tamaño para que no se corten
    const gz = scr === "garage" ? CARS[shownCar()].size : null, extra = gz ? Math.max(0, Math.max(gz[0] * 1.3, gz[2], gz[1] * 2) - 2.4) : 0, pull = 1 + extra * 0.4;
    const px = tx + (px0 - tx) * pull, py = ty + (py0 - ty) * pull, pz = tz + (pz0 - tz) * pull;
    const sw = scr === "beast" ? 0.05 : Math.hypot(px - tx, py - ty, pz - tz) * (scr === "garage" || scr === "title" ? 0.02 : 0.04), kk = 1 - Math.exp(-2.2 * dt);
    B.Vector3.LerpToRef(c.cam.position, new B.Vector3(px + Math.sin(t * 0.13) * sw, py + Math.sin(t * 0.21) * sw * 0.3, pz + Math.cos(t * 0.11) * sw), kk, c.cam.position);
    B.Vector3.LerpToRef(c.camTarget, new B.Vector3(tx, ty, tz), kk, c.camTarget);
    // Título, principal y garaje: el auto elegido sobre el estante o la mesa (reusa `c.preview`, que clearRun libera)
    const spot = carSpot(scr);
    if (spot) {
      const key = shownCar() + JSON.stringify(carOpts());
      if (!c.preview || previewKey !== key) {
        c.preview?.dispose();
        const m = carModel(shownCar(), { ...carOpts(), fixed: true });
        c.preview = m.body;
        previewR = -Math.min(...m.wheels.map((w) => w.m.position.y - w.r));
        for (const c of m.cast) shadows.addShadowCaster(c);
        previewKey = key;
        c.preview.rotation.y = CAR_YAW;
      }
      c.preview.position.set(spot.x, spot.y + previewR, spot.z);
      if (scr === "garage") { c.preview.rotation.y += dt * 0.6; c.preview.rotation.z = 0; }
      else { // estante: vaivén de suspensión, como en marcha lenta
        c.preview.rotation.y = CAR_YAW;
        c.preview.position.y += Math.sin(t * 2.3) * 0.012;
        c.preview.rotation.z = Math.sin(t * 1.7) * 0.012;
      }
    } else if (c.preview) { c.preview.dispose(); c.preview = null; }
  }
  c.shake = Math.max(0, c.shake - dt * 2);
  const s = save.shake ? c.shake * c.shake * 0.8 : 0;
  if (c.state !== "race" && c.state !== "duel" && c.state !== "match3") {
    const tgt = c.camTarget.add(new B.Vector3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, 0));
    if (MOON.on && c.lead.car) { // luna: el "arriba" de la cámara es la vertical del lugar (setTarget usa siempre +Y): rotación propia
      B.Matrix.LookAtLHToRef(c.cam.position, tgt, c.camUp, _camM); _camM.invert();
      B.Quaternion.FromRotationMatrixToRef(_camM, (c.cam.rotationQuaternion ??= new B.Quaternion()));
    } else {
      if (c.cam.rotationQuaternion) { (c.cam as { rotationQuaternion: B.Quaternion | null }).rotationQuaternion = null; c.cam.upVector.set(0, 1, 0); }
      c.cam.setTarget(tgt);
    }
    for (const m of c.liveM()) mateCam(m, dt);
    if (photoOn() && c.state === "pause" && c.lead.car) photoApply(c.cam, c.lead.car.pos);
  }
}
