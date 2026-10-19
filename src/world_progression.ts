import * as B from "@babylonjs/core";
import { ZONES, type ZoneId, setZone, spawnPoint } from "./world";
import { MOON, setMoon, hd, ringAt, teleport, hflat, deform } from "./moon";
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
  readonly addShake?: (v: number) => void;
  readonly warpFx?: (pos: B.Vector3) => void;
  readonly warpFlash?: () => void;
  readonly rewardProactiveJump?: () => void;
  readonly setZone?: (zoneId: ZoneId, rebuild?: boolean) => void;
  readonly moonAmbience?: (on: boolean) => void;
  readonly onEnemyPulverized?: (pos: B.Vector3, xp: number) => void;
  readonly hurtCar?: (dmg: number, src: string) => void;
  readonly damageEnemies?: (pos: B.Vector3, radius: number, dmg: number) => void;
  readonly meteorImpactFx?: (pos: B.Vector3) => void;
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
let meteorTimer = 3.0;

/** Inicia la progresión de saltos de mundo para la partida actual. */
export function startWorldProgression(seed: number, startZone: ZoneId, bossKind: Kind) {
  clearWorldProgression();
  currentStages = buildProgressionStages(seed, startZone, bossKind);
  currentStageIdx = 0;
  vortexAlertGiven = false;
  jumpInProgress = false;
  meteorTimer = 3.0;
}

/** Limpia recursos de la progresión (vórtice, mallas, estado). */
export function clearWorldProgression() {
  if (vortexMesh) { vortexMesh.dispose(); vortexMesh = null; }
  if (vortexBeam) { vortexBeam.dispose(); vortexBeam = null; }
  vortexPos = null;
  vortexAlertGiven = false;
  jumpInProgress = false;
  meteorTimer = 3.0;
  if (currentStages[currentStageIdx]?.zoneId === "luna" || MOON.on) {
    setMoon(false);
    ctx?.moonAmbience?.(false);
  }
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

/** Ejecuta la transición de Salto de Mundo. Proactive = true otorga el Alijo Dimensional. */
export function executeWorldJump(nextStageIdx: number, proactive = false) {
  if (jumpInProgress || nextStageIdx >= currentStages.length) return;
  jumpInProgress = true;
  const prevStage = currentStages[currentStageIdx];
  const nextStage = currentStages[nextStageIdx];
  currentStageIdx = nextStageIdx;

  // Limpiar el vórtice previo
  if (vortexMesh) { vortexMesh.dispose(); vortexMesh = null; }
  if (vortexBeam) { vortexBeam.dispose(); vortexBeam = null; }
  vortexPos = null;
  vortexAlertGiven = false;

  const car = ctx.getCar();
  if (car && !ctx.isSimulating()) {
    ctx.warpFx?.(car.pos.clone());
  }

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

  // Transición de física / luna (con microgravedad auténtica de 17.5 m/s² y acústica de vacío en la luna)
  const wasMoon = prevStage ? prevStage.zoneId === "luna" : MOON.on;
  const isNowMoon = nextStage.zoneId === "luna";
  if (wasMoon && !isNowMoon) {
    setMoon(false);
    ctx.moonAmbience?.(false);
  }
  if (!wasMoon && isNowMoon) {
    setMoon(true, true);
    ctx.moonAmbience?.(true);
  }

  // Reconstruir el mundo con la nueva zona (preservando el auto del jugador)
  if (ctx.setZone) ctx.setZone(nextStage.zoneId, true);
  else setZone(nextStage.zoneId, true);

  // Clima de la nueva zona
  const zc = ctx.zoneClimate();
  ctx.applyClimate(zc ?? ctx.getProfile().climate);

  // Posicionar al auto en lugar seguro de la nueva zona
  if (car) {
    if (isNowMoon) {
      car.pos.set(0, MOON.R + 1.2, 0);
      if (car.root) {
        car.root.position.copyFrom(car.pos);
        car.root.rotationQuaternion = B.Quaternion.Identity();
      }
    } else {
      car.pos.set(0, 1.2, 0);
      if (car.root) {
        car.root.position.copyFrom(car.pos);
        car.root.rotationQuaternion = B.Quaternion.Identity();
      }
    }
    car.body?.setLinearVelocity?.(B.Vector3.Zero());
    car.body?.setAngularVelocity?.(B.Vector3.Zero());
    if (car.body && typeof (car.body as any).getPrestepType === "function") teleport(car.body);
    if (!ctx.isSimulating()) {
      ctx.warpFx?.(car.pos.clone());
    }
  }

  // Resetear cámara
  ctx.camReset();

  // Efectos audiovisuales del salto cuántico
  ctx.playWarpSfx();
  if (!ctx.isSimulating()) {
    ctx.warpFlash?.();
    ctx.glitchHit();
    ctx.addShake?.(1.4);
  }

  // Banners de telemetría y recompensas en español impersonal
  if (proactive) {
    ctx.rewardProactiveJump?.();
  } else {
    ctx.banner("COLAPSO DIMENSIONAL · SALTO DE EMERGENCIA", 3, { tag: "VÓRTICE", ico: "jefe", tone: "warn" });
  }

  if (nextStage.isBossArena) {
    ctx.banner(`¡SALTO AL JEFE DEL MUNDO! · ARENA FINAL`, 4, { tag: "VÓRTICE", ico: "jefe", tone: "now" });
  } else {
    ctx.banner(`SALTO DE MUNDO ${nextStage.jumpNum}/4 · ${nextStage.zoneName.toUpperCase()}`, 3.5, { tag: "VÓRTICE", ico: "jefe", tone: "now" });
  }

  // Banners diegéticos de anomalías ambientales por mundo
  if (nextStage.zoneId === "luna") {
    ctx.banner("RADAR · MICROMETEORITOS ACTIVOS · CRÁTERES DINÁMICOS", 4, { tag: "ANOMALÍA", ico: "senal", tone: "warn" });
  } else if (nextStage.zoneId === "ciudad" || nextStage.zoneId === "industrial") {
    ctx.banner("TELEMETRÍA · ASFALTO RESBALADIZO · DERRAPE Y AGARRE REDUCIDO", 4, { tag: "ANOMALÍA", ico: "senal", tone: "warn" });
  } else if (nextStage.zoneId === "bosque") {
    ctx.banner("METEOROLOGÍA · RÁFAGAS DE VIENTO CRUZADO EN BOSQUE", 4, { tag: "ANOMALÍA", ico: "senal", tone: "warn" });
  }

  meteorTimer = 3.0;
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

  // 1. Lluvia de micrometeoritos en la Luna (Anomalía Lunar activa)
  if (stage.zoneId === "luna" && t >= stage.startTime + 10 && t <= stage.vortexTime - 4) {
    meteorTimer -= dt;
    if (meteorTimer <= 0) {
      meteorTimer = 2.8 + Math.random() * 2.2;
      const targetPos = ringAt(car.pos, Math.random() * Math.PI * 2, 6 + Math.random() * 16, 0);
      deform(targetPos, 3.2, 0.75); // Deforma la superficie física y visual de la luna
      ctx.damageEnemies?.(targetPos, 5.5, 60);

      const carD = hd(car.pos, targetPos);
      if (carD < 2.8) {
        ctx.hurtCar?.(14, "meteorito");
        ctx.addShake?.(0.65);
      }
      if (!ctx.isSimulating()) {
        ctx.meteorImpactFx?.(targetPos);
      }
    }
  }

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

  // 2. Animar vórtice visual y física de succión gravitatoria
  if (vortexPos) {
    const timeLeft = stage.endTime - t;
    const isUrgent = timeLeft <= 10.0 && timeLeft > 0;
    const urgency = isUrgent ? 1 - Math.max(0, timeLeft) / 10.0 : 0; // 0..1

    if (vortexMesh) {
      vortexMesh.rotation.y += dt * (3.5 + urgency * 7.0);
      vortexMesh.rotation.x = Math.sin(t * 3) * (0.2 + urgency * 0.15);
      if (vortexBeam) {
        vortexBeam.scaling.x = vortexBeam.scaling.z = 1 + Math.sin(t * (6 + urgency * 10)) * (0.12 + urgency * 0.25);
      }
    }

    // Succión gravitatoria física en los últimos 10 segundos antes del colapso
    if (isUrgent) {
      const R_SUCTION = 14.0;

      // Atracción sobre el auto del jugador
      const carDist = MOON.on ? hd(car.pos, vortexPos) : Math.hypot(car.pos.x - vortexPos.x, car.pos.z - vortexPos.z);
      if (carDist < R_SUCTION && car.body) {
        const carPullForce = (1 - carDist / R_SUCTION) * urgency * 8.5; // m/s²
        const carDir = vortexPos.subtract(car.pos).normalize();
        if (MOON.on) hflat(carDir, car.pos);
        const vCar = car.body.getLinearVelocity?.();
        if (vCar) {
          car.body.setLinearVelocity(vCar.add(carDir.scale(carPullForce * dt)));
        }
      }

      // Succión y pulverización cuántica de enemigos comunes
      const enemies = ctx.getEnemies();
      let changed = false;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.def.boss) continue; // Los jefes son masivos e inmunes a la succión ordinaria

        const eDist = MOON.on ? hd(e.pos, vortexPos) : Math.hypot(e.pos.x - vortexPos.x, e.pos.z - vortexPos.z);
        if (eDist < R_SUCTION) {
          if (eDist < 2.5) {
            // Pulverización cuántica al tocar el ojo del vórtice
            const p = e.pos.clone();
            const xp = e.def.xp;
            e.dispose();
            enemies.splice(i, 1);
            changed = true;
            ctx.onEnemyPulverized?.(p, xp);
            if (!ctx.isSimulating()) {
              ctx.warpFx?.(p);
            }
          } else if (e.body) {
            const pullForce = (1 - eDist / R_SUCTION) * urgency * 16.0;
            const eDir = vortexPos.subtract(e.pos).normalize();
            if (MOON.on) hflat(eDir, e.pos);
            const vE = e.body.getLinearVelocity?.();
            if (vE) {
              e.body.setLinearVelocity(vE.add(eDir.scale(pullForce * dt)));
            }
          }
        }
      }
      if (changed) {
        ctx.setEnemies(enemies);
      }
    }

    // 3. Colisión interactiva: el auto atraviesa el vórtice
    const d = MOON.on ? hd(car.pos, vortexPos) : Math.hypot(car.pos.x - vortexPos.x, car.pos.z - vortexPos.z);
    if (d < 5.0) {
      // Salto interactivo exitoso (otorga Alijo Dimensional)
      executeWorldJump(currentStageIdx + 1, true);
      return;
    }
  }

  // 4. Salto automático si expira el tiempo límite de la etapa (salto forzado de emergencia)
  if (t >= stage.endTime) {
    executeWorldJump(currentStageIdx + 1, false);
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

export interface WorldRouteNode {
  readonly stage: number;
  readonly jumpNum: number;
  readonly zoneId: ZoneId;
  readonly zoneName: string;
  readonly isBossArena?: boolean;
  readonly startTime: number;
  readonly vortexTime: number;
  readonly endTime: number;
  readonly isPassed: boolean;
  readonly isCurrent: boolean;
}

export interface WorldRouteSummary {
  readonly currentStageIdx: number;
  readonly totalStages: number;
  readonly nodes: WorldRouteNode[];
  readonly currentZoneName: string;
  readonly nextZoneName: string;
  readonly vortexActive: boolean;
  readonly timeToVortex: number;
  readonly timeToEnd: number;
}

/** Devuelve el resumen cartográfico completo de la ruta de saltos para el HUD. */
export function getWorldRouteSummary(): WorldRouteSummary | null {
  if (!currentStages || currentStages.length === 0) return null;
  const curr = currentStages[currentStageIdx];
  if (!curr) return null;
  const next = currentStages[currentStageIdx + 1];
  const t = run.time;
  return {
    currentStageIdx,
    totalStages: currentStages.length,
    nodes: currentStages.map((s, idx) => ({
      stage: s.stage,
      jumpNum: s.jumpNum,
      zoneId: s.zoneId,
      zoneName: s.zoneName,
      isBossArena: s.isBossArena,
      startTime: s.startTime,
      vortexTime: s.vortexTime,
      endTime: s.endTime,
      isPassed: idx < currentStageIdx,
      isCurrent: idx === currentStageIdx,
    })),
    currentZoneName: curr.zoneName,
    nextZoneName: next ? (next.isBossArena ? "ARENA FINAL" : next.zoneName) : "ARENA FINAL",
    vortexActive: vortexPos !== null,
    timeToVortex: Math.max(0, curr.vortexTime - t),
    timeToEnd: Math.max(0, curr.endTime - t),
  };
}
