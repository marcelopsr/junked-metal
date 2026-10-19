import * as B from "@babylonjs/core";
import { ZONES, type ZoneId, setZone, spawnPoint } from "./world";
import { MOON, setMoon, hd, ringAt, teleport } from "./moon";
import { run } from "./run_state";
import { Car } from "./car";
import type { Kind } from "./enemies";
import type { Enemy } from "./enemies";
import type { Weapon } from "./weapons";
import type { Climate, Profile } from "./run";

// ---------- Estructura de Etapas y Saltos de Mundo ----------
// 4 saltos de mundo + 1 salto al jefe del mundo.
// Duración total de 10 minutos (600 s) dividida en 5 biomas + arena final.

export interface StageDef {
  stage: number;        // 0 = inicial, 1..4 = saltos de mundo, 5 = arena del jefe
  jumpNum: number;      // 0 = ninguno, 1..4 = Salto X/4, 5 = Salto al Jefe del Mundo
  zoneId: ZoneId;
  zoneName: string;
  startTime: number;    // Segundo de inicio del bioma
  vortexTime: number;   // Segundo en que se abre el vórtice dimensional
  endTime: number;      // Segundo en que colapsa y salta automáticamente
  isBossArena?: boolean;
}

/** Construye la ruta determinista de etapas a partir de la semilla.
 *  Garantiza:
 *  - 4 saltos de mundo intermedios (Mundo 1 -> 2 -> 3 -> 4 -> 5).
 *  - La etapa 2 es ESTRICTAMENTE "luna" (auténtica, sin neón, solo vacío y regolito).
 *  - La etapa 5 es el Salto definitivo al Jefe del Mundo en su arena temática.
 */
export function buildProgressionStages(seed: number, startZone: ZoneId = "patio", bossKind: Kind = "perro"): StageDef[] {
  // Generador pseudoaleatorio simple a partir de la semilla
  const r = (offset: number) => {
    const x = Math.sin(seed * 9301 + offset * 49297 + 233280) * 10000;
    return x - Math.floor(x);
  };

  const pool1: ZoneId[] = ["bosque", "jardin", "cocina"];
  const pool3: ZoneId[] = ["nieve", "industrial", "ciudad"];
  const pool4: ZoneId[] = ["desvan", "pileta", "garaje"];

  const z1 = pool1[Math.floor(r(1) * pool1.length)];
  const z2: ZoneId = "luna"; // Nivel lunar auténtico obligatorio
  const z3 = pool3[Math.floor(r(3) * pool3.length)];
  const z4 = pool4[Math.floor(r(4) * pool4.length)];

  // Arena del Jefe del Mundo
  let bossZone: ZoneId = "patio";
  if (bossKind === "aspiradora") bossZone = "cocina";
  else if (bossKind === "cortacercos") bossZone = "bosque";
  else if (bossKind === "caja") bossZone = "desvan";
  else if (bossKind === "gusano") bossZone = "luna";
  else bossZone = "patio";

  // Si startZone era luna, arrancamos en patio para que la luna sea el nivel 2 destacado
  const z0: ZoneId = (startZone === "luna" ? "patio" : startZone) in ZONES ? (startZone === "luna" ? "patio" : startZone) : "patio";

  return [
    { stage: 0, jumpNum: 0, zoneId: z0, zoneName: ZONES[z0]?.name ?? "Patio trasero", startTime: 0, vortexTime: 90, endTime: 110 },
    { stage: 1, jumpNum: 1, zoneId: z1, zoneName: ZONES[z1]?.name ?? "Bioma Terrestre", startTime: 110, vortexTime: 210, endTime: 230 },
    { stage: 2, jumpNum: 2, zoneId: z2, zoneName: "La Luna (Desolación Cósmica)", startTime: 230, vortexTime: 330, endTime: 350 },
    { stage: 3, jumpNum: 3, zoneId: z3, zoneName: ZONES[z3]?.name ?? "Bioma Contrastante", startTime: 350, vortexTime: 450, endTime: 470 },
    { stage: 4, jumpNum: 4, zoneId: z4, zoneName: ZONES[z4]?.name ?? "Bioma Clímax", startTime: 470, vortexTime: 540, endTime: 560 },
    { stage: 5, jumpNum: 5, zoneId: bossZone, zoneName: `Arena del Jefe (${ZONES[bossZone]?.name ?? "Patio"})`, startTime: 560, vortexTime: 999999, endTime: 999999, isBossArena: true },
  ];
}

// ---------- Contexto del Módulo ----------
export interface WorldProgressionContext {
  readonly scene: B.Scene;
  readonly getCar: () => Car | null;
  readonly getEnemies: () => Enemy[];
  readonly setEnemies: (e: Enemy[]) => void;
  readonly getWeapons: () => Weapon[];
  readonly getProfile: () => Profile;
  readonly applyClimate: (c: Climate) => void;
  readonly zoneClimate: () => Climate | undefined;
  readonly isSimulating: () => boolean;
  readonly isErun: () => boolean;
  readonly isLibre: () => boolean;
  readonly isLab: () => boolean;
  readonly camReset: () => void;
  readonly clearSpits: () => void;
  readonly clearGems: () => void;
  readonly clearPickups: () => void;
  readonly playWarpSfx: () => void;
  readonly banner: (txt: string, secs?: number, opts?: { tag?: string; ico?: string; tone?: "warn" | "now" }) => void;
  readonly glitchHit: () => void;
}

let ctx!: WorldProgressionContext;
export function initWorldProgression(c: WorldProgressionContext) { ctx = c; }

// ---------- Estado de la Progresión en Partida ----------
let currentStages: StageDef[] = [];
let currentStageIdx = 0;
let vortexMesh: B.Mesh | null = null;
let vortexBeam: B.Mesh | null = null;
let vortexPos: B.Vector3 | null = null;
let vortexAlertGiven = false;
let jumpInProgress = false;

/** Inicia la progresión de saltos de mundo para la partida actual. */
export function startWorldProgression(seed: number, startZone: ZoneId, bossKind: Kind) {
  clearWorldProgression();
  currentStages = buildProgressionStages(seed, startZone, bossKind);
  currentStageIdx = 0;
  vortexAlertGiven = false;
  jumpInProgress = false;
}

/** Limpia recursos de la progresión (vórtice, mallas, estado). */
export function clearWorldProgression() {
  if (vortexMesh) { vortexMesh.dispose(); vortexMesh = null; }
  if (vortexBeam) { vortexBeam.dispose(); vortexBeam = null; }
  vortexPos = null;
  vortexAlertGiven = false;
  jumpInProgress = false;
  currentStages = [];
  currentStageIdx = 0;
}

/** Devuelve la etapa activa o null si no está en juego normal. */
export function getCurrentStage(): StageDef | null {
  return currentStages[currentStageIdx] ?? null;
}

/** Posición actual del vórtice dimensional para alimentar el radar del HUD (`kind: "obj"`). */
export function getVortexPosition(): B.Vector3 | null {
  return vortexPos;
}

/** Crea la entidad visual 3D del vórtice dimensional. */
function createVortexEntity(pos: B.Vector3) {
  if (ctx.isSimulating()) return;
  const s = ctx.scene;
  // Anillo exterior de energía cuántica
  const ring = B.MeshBuilder.CreateTorus("vortexRing", { diameter: 7.5, thickness: 0.6, tessellation: 32 }, s);
  ring.position.copyFrom(pos);
  const ringMat = new B.StandardMaterial("vortexRingMat", s);
  ringMat.emissiveColor = new B.Color3(0.1, 0.9, 1.0);
  ringMat.diffuseColor = B.Color3.Black();
  ringMat.specularColor = B.Color3.White();
  ringMat.alpha = 0.88;
  ring.material = ringMat;
  ring.isPickable = false;

  // Haz de luz cilíndrico hacia el cielo
  const beam = B.MeshBuilder.CreateCylinder("vortexBeam", { diameterTop: 4.5, diameterBottom: 4.5, height: 26 }, s);
  beam.position.copyFrom(pos).addInPlace(new B.Vector3(0, 13, 0));
  const beamMat = new B.StandardMaterial("vortexBeamMat", s);
  beamMat.emissiveColor = new B.Color3(0.2, 0.6, 1.0);
  beamMat.diffuseColor = B.Color3.Black();
  beamMat.alpha = 0.45;
  beamMat.alphaMode = B.Constants.ALPHA_ADD;
  beamMat.backFaceCulling = false;
  beam.material = beamMat;
  beam.isPickable = false;

  vortexMesh = ring;
  vortexBeam = beam;
}

/** Ejecuta la transición de Salto de Mundo. */
export function executeWorldJump(nextStageIdx: number) {
  if (jumpInProgress || nextStageIdx >= currentStages.length) return;
  jumpInProgress = true;
  const nextStage = currentStages[nextStageIdx];
  currentStageIdx = nextStageIdx;

  // Limpiar el vórtice previo
  if (vortexMesh) { vortexMesh.dispose(); vortexMesh = null; }
  if (vortexBeam) { vortexBeam.dispose(); vortexBeam = null; }
  vortexPos = null;
  vortexAlertGiven = false;

  const car = ctx.getCar();

  // Limpiar enemigos comunes de la zona anterior
  const enemies = ctx.getEnemies();
  for (const e of enemies) {
    if (!e.def.boss) e.dispose();
  }
  ctx.setEnemies(enemies.filter((e) => e.def.boss));

  // Limpiar proyectiles, gemas y pickups residuales
  ctx.clearSpits();
  ctx.clearGems();
  ctx.clearPickups();

  // Transición de física / luna
  const wasMoon = MOON.on;
  const isNowMoon = nextStage.zoneId === "luna";
  if (wasMoon && !isNowMoon) setMoon(false);
  if (!wasMoon && isNowMoon) setMoon(true);

  // Reconstruir el mundo con la nueva zona (preservando el auto del jugador)
  setZone(nextStage.zoneId, true);

  // Clima de la nueva zona
  const zc = ctx.zoneClimate();
  ctx.applyClimate(zc ?? ctx.getProfile().climate);

  // Posicionar al auto en lugar seguro de la nueva zona
  if (car) {
    if (isNowMoon) {
      car.pos.set(0, MOON.R + 1.2, 0);
      car.root.position.copyFrom(car.pos);
      car.root.rotationQuaternion = B.Quaternion.Identity();
    } else {
      car.pos.set(0, 1.2, 0);
      car.root.position.copyFrom(car.pos);
      car.root.rotationQuaternion = B.Quaternion.Identity();
    }
    car.body.setLinearVelocity(B.Vector3.Zero());
    car.body.setAngularVelocity(B.Vector3.Zero());
    teleport(car.body);
  }

  // Resetear cámara
  ctx.camReset();

  // Efectos audiovisuales del salto cuántico
  ctx.playWarpSfx();
  if (!ctx.isSimulating()) ctx.glitchHit();

  // Banners de telemetría en español impersonal
  if (nextStage.isBossArena) {
    ctx.banner(`¡SALTO AL JEFE DEL MUNDO! · ARENA FINAL`, 4, { tag: "VÓRTICE", ico: "jefe", tone: "now" });
  } else {
    ctx.banner(`SALTO DE MUNDO ${nextStage.jumpNum}/4 · ${nextStage.zoneName.toUpperCase()}`, 3.5, { tag: "VÓRTICE", ico: "jefe", tone: "now" });
  }

  jumpInProgress = false;
}

/** Actualización por cuadro de la progresión de mundos. */
export function tickWorldProgression(dt: number) {
  if (!currentStages.length || ctx.isErun() || ctx.isLibre() || ctx.isLab()) return;
  const stage = currentStages[currentStageIdx];
  if (!stage || stage.isBossArena) return;

  const t = run.time;
  const car = ctx.getCar();
  if (!car) return;

  // 1. Abrir vórtice dimensional
  if (t >= stage.vortexTime && !vortexPos) {
    // Spawnear vórtice en una ubicación alcanzable
    if (MOON.on) {
      vortexPos = ringAt(car.pos, Math.random() * Math.PI * 2, 28);
    } else {
      vortexPos = spawnPoint(car.pos, 22, 34);
    }
    createVortexEntity(vortexPos);

    if (!vortexAlertGiven) {
      vortexAlertGiven = true;
      if (stage.jumpNum === 4) {
        ctx.banner(`VÓRTICE AL JEFE DEL MUNDO ABIERTO · ENTRA PARA SALTAR`, 4, { tag: "VÓRTICE", ico: "jefe", tone: "warn" });
      } else {
        ctx.banner(`VÓRTICE DIMENSIONAL ${stage.jumpNum + 1}/4 ABIERTO · ENTRA PARA SALTAR`, 3.5, { tag: "VÓRTICE", ico: "jefe", tone: "warn" });
      }
    }
  }

  // 2. Animar vórtice visual
  if (vortexMesh && vortexPos) {
    vortexMesh.rotation.y += dt * 3.5;
    vortexMesh.rotation.x = Math.sin(t * 3) * 0.2;
    if (vortexBeam) {
      vortexBeam.scaling.x = vortexBeam.scaling.z = 1 + Math.sin(t * 6) * 0.12;
    }

    // 3. Colisión interactiva: el auto atraviesa el vórtice
    const d = MOON.on ? hd(car.pos, vortexPos) : Math.hypot(car.pos.x - vortexPos.x, car.pos.z - vortexPos.z);
    if (d < 5.0) {
      // Salto interactivo exitoso
      executeWorldJump(currentStageIdx + 1);
      return;
    }
  }

  // 4. Salto automático si expira el tiempo límite de la etapa
  if (t >= stage.endTime) {
    executeWorldJump(currentStageIdx + 1);
  }
}

export interface VortexInfo {
  open: boolean;
  timeLeft: number;
  totalTime: number;
  distance: number;
  nextZoneName: string;
  isUrgent: boolean;
  jumpNum: number;
}

/** Devuelve la telemetría viva del vórtice dimensional (tiempo restante, distancia y destino). */
export function getVortexInfo(): VortexInfo | null {
  if (!vortexPos || currentStageIdx >= currentStages.length) return null;
  const stage = currentStages[currentStageIdx];
  const nextStage = currentStages[currentStageIdx + 1];
  if (!stage) return null;
  const car = ctx?.getCar();
  const d = car ? (MOON.on ? hd(car.pos, vortexPos) : Math.hypot(car.pos.x - vortexPos.x, car.pos.z - vortexPos.z)) : 999;
  const total = stage.endTime - stage.vortexTime;
  const left = Math.max(0, stage.endTime - run.time);
  return {
    open: true,
    timeLeft: left,
    totalTime: total > 0 ? total : 20,
    distance: Math.round(d),
    nextZoneName: nextStage ? (nextStage.isBossArena ? "ARENA FINAL" : nextStage.zoneName.toUpperCase()) : "FINAL",
    isUrgent: left <= 5.0,
    jumpNum: stage.jumpNum,
  };
}
