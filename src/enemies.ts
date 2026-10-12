import * as B from "@babylonjs/core";
import { auraTemplate, bailarinaTemplate, cableTemplate, ondaTemplate, enemyTemplate, legTemplate, LEGS, sectorTemplate, teleTemplate, wingTemplate, windKeyTemplate } from "./models";
import { FX } from "./fx";
import { rng } from "./rng";
import { BAL } from "./balance";
import { type Elite, getModoTranquilo, TRANQUILO } from "./run";
import { GLB, glbAnimate, glbPlay, glbTpl, glbVat } from "./glb";
import { alignYaw, alt, at, flatL, hflat, MOON, onFloor, orient, toLocal, toWorld, yawOf } from "./moon";
import { ALIEN_AI, ALIENS, type Alien } from "./aliens";
import { AI } from "./enemies/ai";
import { DOG_RAM } from "./enemies/ai/util";
import { WORM_AI, wormDispose, wormHeadTpl } from "./moon_worm";

export type Kind = "hormiga" | "escupidora" | "friccion" | "robot" | "escarabajo" | "rey" | "cortadora" | "perro" | "gato" | "polilla" | "tarantula" | "aspiradora" | "cortacercos" | "caja" | "proyector" | "grua" | "payaso" | "fuego" | "cohete" | "gusano" | "grillo" | "mosca" | "babosa" | Alien;

type Def = { name: string; hp: number; speed: number; dmg: number; size: [number, number, number]; mass: number; xp: number; boss?: boolean; final?: boolean; scale?: number; color: string };
const ATK = BAL.ataques;
// Vida, velocidad, daño, peso y XP salen de balance.json (tabla enemigos)
const stats = (k: Kind) => { const e = BAL.enemigos[k]; return { hp: e.vida, speed: e.velocidad, dmg: e.dano, mass: e.peso, xp: e.xp, final: e.tipo === "jefe_final" }; };
export const DEF: Record<Kind, Def> = {
  // Jefes finales (tipo jefe_final): dos barras. Al vaciar la primera ruge y se llena la segunda (rearm); ver ataques.segunda_barra_*
  hormiga: { name: "Hormiga", ...stats("hormiga"), size: [0.9, 0.6, 1.7], color: "#6e3520" },
  escupidora: { name: "Hormiga escupidora", ...stats("escupidora"), size: [1.1, 0.8, 2], color: "#6b8a22" },
  friccion: { name: "Autito a fricción", ...stats("friccion"), size: [0.9, 0.6, 1.6], color: "#f97316" },
  robot: { name: "Robot a cuerda", ...stats("robot"), size: [1.2, 1.7, 1], color: "#ef4444" },
  polilla: { name: "Polilla", ...stats("polilla"), size: [1.4, 0.5, 1.1], color: "#d8c690" },
  escarabajo: { name: "Escarabajo", ...stats("escarabajo"), size: [1.7, 1.1, 2.3], color: "#2f7d4a" },
  // Plagas nuevas de la Tierra: grillo (salta en arco) y mosca (zigzaguea)
  grillo: { name: "Grillo saltarín", ...stats("grillo"), size: [0.9, 0.9, 1.3], color: "#5a8a2a" },
  mosca: { name: "Mosca zigzag", ...stats("mosca"), size: [0.9, 0.7, 1.1], color: "#3d5a8a" },
  // Plaga lenta: se planta y escupe una flema grande y lenta (esquivable)
  babosa: { name: "Babosa Flemática", ...stats("babosa"), size: [1.2, 0.7, 1.9], color: "#8a9a3a" },
  // Luna (moon_sky.ts): salen del impacto de lo que lanzan el Sol (fuego: corre derecho como la hormiga) y la Tierra (cohete: carga como el robot)
  fuego: { name: "Bicho de fuego", ...stats("fuego"), size: [0.8, 0.55, 1.3], color: "#ff7a1a" },
  cohete: { name: "Bicho-cohete", ...stats("cohete"), size: [0.8, 0.8, 1.6], color: "#8a8f98" },
  // Aliens de chatarra (aliens.ts: modelos e IA): solo en la luna
  enjambre: { name: "Enjambre alienígena", ...stats("enjambre"), size: [0.6, 0.45, 0.8], color: "#3ff2ff" },
  tirador: { name: "Tirador de onda", ...stats("tirador"), size: [1, 1.1, 1.1], color: "#7dff5a" },
  saltador: { name: "Saltador lunar", ...stats("saltador"), size: [0.9, 0.8, 1.2], color: "#7dff5a" },
  emboscador: { name: "Emboscador de cráter", ...stats("emboscador"), size: [1.4, 0.8, 1.4], color: "#3ff2ff" },
  flotante: { name: "Flotante", ...stats("flotante"), size: [1.1, 0.8, 1.1], color: "#3ff2ff" },
  tanque: { name: "Tanque de chatarra", ...stats("tanque"), size: [1.6, 1.1, 2], color: "#8a8f92" },
  explosivo: { name: "Explosivo", ...stats("explosivo"), size: [0.8, 0.8, 0.8], color: "#7dff5a" },
  curandero: { name: "Curandero", ...stats("curandero"), size: [0.8, 1.6, 0.8], color: "#7dff5a" },
  rey: { name: "ESCARABAJO REY", ...stats("rey"), size: [6, 3.8, 8], boss: true, scale: 3.5, color: "#d4a017" },
  cortadora: { name: "CORTADORA DE CÉSPED", ...stats("cortadora"), size: [7, 4.5, 6.4], boss: true, color: "#dc2626" },
  tarantula: { name: "TARÁNTULA", ...stats("tarantula"), size: [6, 2.6, 6.5], boss: true, scale: 3, color: "#7a55a8" },
  perro: { name: "FELIPE EL DOGO", ...stats("perro"), size: [3.2, 8, 8], boss: true, color: "#6e7279" },
  gato: { name: "EULALIO EL MICHU", ...stats("gato"), size: [3.4, 3.6, 6.4], boss: true, color: "#d9782a" },
  aspiradora: { name: "LA ASPIRADORA ROBOT", ...stats("aspiradora"), size: [6.4, 1.6, 6.4], boss: true, color: "#7a8fa6" },
  proyector: { name: "EL PROYECTOR DEL DIRECTOR", ...stats("proyector"), size: [3.6, 4.2, 4.6], boss: true, color: "#e0a030" },
  payaso: { name: "EL PAYASO DE RESORTE", ...stats("payaso"), size: [3.2, 5, 3.2], boss: true, color: "#7c3aed" },
  grua: { name: "LA GRÚA DE FERIA", ...stats("grua"), size: [3.4, 5, 5.2], boss: true, color: "#c2410c" },
  gusano: { name: "GUSANO LUNAR", ...stats("gusano"), size: [2.2, 2.2, 2.4], boss: true, color: "#2f4f56" }, // jefe final de la luna (moon_worm.ts)
  cortacercos: { name: "EL CORTACERCOS ELÉCTRICO", ...stats("cortacercos"), size: [3, 2.4, 9], boss: true, color: "#e0a030" },
  caja: { name: "LA CAJA DE MÚSICA ROTA", ...stats("caja"), size: [5.6, 6.4, 5.6], boss: true, color: "#b45309" }, // jefe final del desván (ai/caja.ts)
};

/** Retratos cinemáticos de bichos y jefes para la Chatarroteca */
export const BEAST_PORTRAITS: Partial<Record<Kind, string>> = {
  babosa: "./images/beasts/beast-babosa.webp",
  grillo: "./images/beasts/beast-grillo.webp",
  mosca: "./images/beasts/beast-mosca.webp",
  payaso: "./images/beasts/beast-payaso.webp",
  hormiga: "./images/beasts/beast-hormiga.webp",
  escupidora: "./images/beasts/beast-escupidora.webp",
  friccion: "./images/beasts/beast-friccion.webp",
  robot: "./images/beasts/beast-robot.webp",
  polilla: "./images/beasts/beast-polilla.webp",
  escarabajo: "./images/beasts/beast-escarabajo.webp",
  rey: "./images/beasts/beast-rey.webp",
  cortadora: "./images/beasts/beast-cortadora.webp",
  tarantula: "./images/beasts/beast-tarantula.webp",
  perro: "./images/beasts/beast-perro.webp",
  gato: "./images/beasts/beast-gato.webp",
  aspiradora: "./images/beasts/beast-aspiradora.webp",
  cortacercos: "./images/beasts/beast-cortacercos.webp",
  caja: "./images/beasts/beast-caja.webp",
};

export const ROAR = ATK.fase2_rugido_s; // segundos que un jefe ruge, quieto, al entrar en fase 2
// Embestida de Felipe: segundos apuntando (normal / enfurecido), velocidad y largo de la carga (m), ancho del carril, segundos de frenada
export { DOG_RAM };
// Fase 2 visible: color por instancia (multiplica el albedo) sobre las plantillas de los jefes; blanco = sin tinte
const WHITE = new B.Color4(1, 1, 1, 1), RAGE = new B.Color4(1, 0.3, 0.24, 1);
const IC = B.VertexBuffer.ColorInstanceKind; // "instanceColor": el que los materiales leen como color por instancia
const tintable = (m: B.Mesh) => { if (!m.instancedBuffers?.[IC]) { m.registerInstancedBuffer(IC, 4); m.instancedBuffers[IC] = WHITE; } }; // antes de la primera instancia: las nuevas copian el blanco
const ray = new B.PhysicsRaycastResult(), rayFrom = new B.Vector3(), rayTo = new B.Vector3();
const _wq = B.Quaternion.Identity(), _lq = B.Quaternion.Identity(), _ws = new B.Vector3(), _wp = new B.Vector3();

// Secuencias de los jefes GLB (Blender, 24 cuadros/s): acción y cuadros donde cambia el tramo (hasta el despegue o el aviso, hasta el
// golpe, hasta el final). Las usa Enemy.seq con el reloj del juego (aviso, caída) en vez del de la acción, así el cuadro cae con el cuerpo.
const SEQ: Partial<Record<Kind, Record<string, [string, number[]]>>> = {
  perro: { jump: ["jump_slam", [0, 12, 28, 40]], ram: ["charge", [0, 7, 16, 26]] }, // salto: despega en el 12, aplasta en el 28; embestida: agacha, carga, frena
  gato: { jump: ["jump", [0, 19, 29, 38]], spin: ["spin", [0, 4, 20, 24]] }, // trompo: se agacha, una vuelta entera en ciclo (agachado), se para
};

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
  legs: { m: B.InstancedMesh; base: number; side: number; phase: number; pos: B.Vector3; ry: number; rz: number }[] = [];
  wings: { m: B.InstancedMesh; pos: B.Vector3; side: number; flap: number }[] = []; // polilla
  windKey?: { m: B.InstancedMesh; pos: B.Vector3; rot: number }; // robot a cuerda
  attachRoot: B.TransformNode | null = null; // bestiario: patas/alas bajo un TransformNode (no InstancedMesh→InstancedMesh)
  tele: B.InstancedMesh[] = []; // tarántula: aro fijo (zona) + aro que crece (cuenta regresiva)
  land = new B.Vector3(); // tarántula: dónde va a caer el salto
  ringsLeft = 0; // caja de música: ondas que faltan soltar
  shots = 0; // tarántula: escupitajos que quedan en la ráfaga
  slow = 0; // segundos de ralentización (Pistola de agua)
  stun = 0; // segundos aturdido (Pulso EMP): main.ts no corre su IA ni su golpe de contacto
  lastT: B.Vector3 | null = null; // polilla: posición anterior del auto (estima hacia dónde apunta el faro)
  walk = rng() * 6;
  elite: Elite | "" = ""; // variante rara de un enemigo común (makeElite)
  spd = 1; // multiplicador de velocidad (élite rápida)
  aura?: B.InstancedMesh;
  rageHalo?: B.InstancedMesh; // fase 2: halo rojo emisivo (hijo del nodo, no toca la malla: sirve también para jefes GLB)
  pull = 0; // aspiradora: aceleración (m/s²) con la que succiona al auto mientras dura; main.ts la aplica
  fan: B.Vector3[] = []; // aspiradora: direcciones de la ráfaga de tuercas del evento "fan"
  cables: { m: B.InstancedMesh; a: B.Vector3; b: B.Vector3; life: number }[] = []; // cortacercos: cables con chispas en el piso
  shockCd = 0;
  waves: { r: number; hit: boolean; m: B.InstancedMesh }[] = []; // caja de música: ondas de sonido en anillo (se saltan)
  dancers: { a: number; m: B.InstancedMesh }[] = []; // caja de música: bailarinas que giran
  danceT = 0; hBase = 99; // segundos que les quedan a las bailarinas; altura mínima vista del auto (suelo) para saber si salta
  aim = 0; // cortacercos y Felipe: rumbo fijo del barrido o la embestida anunciados
  pose = 0; // stop-motion: las patas cambian de pose a 10 fps
  clock = 0; // reloj propio para los zigzags de Eulalio y Felipe
  enraged = false; // jefe por debajo de la mitad de vida: más rápido y más agresivo
  phaseUp = false; // main.ts lo apaga tras mostrar el aviso de fase
  dir = 0; // Eulalio: rumbo del dash / giro
  meowCd = 6;
  leader: Enemy | null = null; // formación: sigue a su líder en vez de ir directo al auto
  slot = new B.Vector3(); // lugar en la formación (x a la derecha del líder, z hacia atrás)
  vat?: B.Vector4; // bicho importado (glb.ts): cuadro de la animación horneada de esta instancia
  play: [string, number] | null = null; // jefe GLB con clips: acción forzada (nombre, segundo); la ficha del bestiario la fija
  deathT = -1; // jefe GLB: segundos desde que murió (reproduce "death"); -1 = vivo
  roar = 0; // fase 2: segundos que le quedan rugiendo, quieto (-1 = espera a estar en reposo para empezar)
  landD = 0.4; recSeq = "jump"; // duración y secuencia de la recuperación (landT) tras el salto o el trompo
  vy0 = 0; landT = 0; clipT = 0; // jefe GLB: velocidad vertical al despegar, recuperación tras aterrizar y reloj del ciclo de patas
  atk = -1; // segundos dentro de su propio ataque (GLB[kind].atk: escupida, embestida); -1 = no ataca

  // Jefe final sin vida en la primera barra: entra en fase 2 con la segunda llena (true = no muere). Un reciclado (-1e9) no cuenta.
  rearm() {
    if (!this.def.final || this.enraged || this.hp < -1e8) return false;
    this.hp = this.maxHp *= ATK.segunda_barra_vida;
    this.enraged = true; this.phaseUp = true; this.setRage(true); this.roar = -1;
    return true;
  }

  constructor(public kind: Kind, pos: B.Vector3, hpMul: number) {
    const d = (this.def = DEF[kind]);
    this.hp = this.maxHp = d.hp * (d.boss ? 1 : hpMul * (getModoTranquilo() ? TRANQUILO.vida : 1));
    const [w, h, l] = d.size;
    this.radius = Math.max(w, l) / 2;
    const glb = glbTpl(kind); // modelo importado con VAT (glb.ts); los demás bichos usan su procedural de models.ts
    if (!glb && GLB[kind]) throw new Error(`Enemy ${kind}: falta su modelo GLB (models/${GLB[kind]!.file}.glb); ver el error de carga más arriba en la consola`);
    const tpl0 = glb ?? (kind === "gusano" ? wormHeadTpl() : enemyTemplate(kind, d.scale));
    if (d.boss) tintable(tpl0); // también los GLB (glb.ts): el color por instancia convive con el shader de animación
    this.node = tpl0.createInstance(kind);
    if (glb) {
      this.vat = glbVat(this.node);
      const vs = GLB[kind]?.visual ?? 1;
      if (vs !== 1) this.node.scaling.setAll(vs);
    }
    this.node.position.copyFrom(pos);
    const yaw = rng() * 6.3;
    if (MOON.on) this.node.rotationQuaternion = alignYaw(pos, yaw); else this.node.rotation.y = yaw; // luna: parado en el lugar ANTES del cuerpo físico
    this.agg = new B.PhysicsAggregate(this.node, B.PhysicsShapeType.BOX,
      { mass: d.mass, friction: 0.3, restitution: 0.1, extents: new B.Vector3(w, h, l), center: new B.Vector3(0, h / 2, 0) }, this.node.getScene());
    this.body = this.agg.body;
    this.body.setMassProperties({ mass: d.mass, inertia: new B.Vector3(0, d.mass, 0), centerOfMass: new B.Vector3(0, h / 2, 0) }); // = centro de la forma (ver Car.setMass)

    const L = LEGS[kind];
    if (L) {
      const tpl = legTemplate(kind);
      if (d.boss) tintable(tpl);
      L.hips.forEach(([x, y, z], i) => {
        for (const side of [1, -1]) {
          const m = tpl.createInstance("leg");
          const pos = new B.Vector3(x * side * L.scale, y * L.scale, z * L.scale);
          m.parent = null; // InstancedMesh no hereda bien a otro InstancedMesh (ficha del bestiario)
          const yaw = L.yaw?.[i] ?? 0, base = side > 0 ? yaw : Math.PI - yaw;
          // marcha en trípode: patas alternadas en fase opuesta
          this.legs.push({ m, base, side, phase: (i + (side > 0 ? 0 : 1)) % 2 ? Math.PI : 0, pos, ry: base, rz: 0 });
        }
      });
    }
    if (kind === "polilla") {
      this.body.setGravityFactor(0); // vuela: la altura la maneja update()
      for (const side of [1, -1] as const) {
        const w = wingTemplate(side).createInstance("wing" + (side > 0 ? "R" : "L"));
        w.parent = null;
        const pos = new B.Vector3(side * 0.16, 0.42, -0.05);
        this.wings.push({ m: w, pos, side, flap: 0 });
      }
    }
    if (kind === "robot") {
      const k = windKeyTemplate().createInstance("windKey");
      k.parent = null;
      const pos = new B.Vector3(0, 0.74, -0.38);
      this.windKey = { m: k, pos, rot: 0 };
    }
    if (kind === "aspiradora" || kind === "cortacercos") {
      // Mismo par zona + relleno que la tarántula; el cortacercos usa un sector (su barrido) en vez de un aro
      const tpl = kind === "aspiradora" ? teleTemplate() : sectorTemplate();
      for (let i = 0; i < 2; i++) { const t = tpl.createInstance("tele"); t.isVisible = false; this.tele.push(t); }
      this.timer = 2.5;
    }
    if (kind === "perro" || kind === "saltador" || kind === "explosivo" || kind === "gusano" || kind === "proyector" || kind === "grua" || kind === "payaso" || kind === "caja") for (let i = 0; i < 2; i++) { const t = teleTemplate().createInstance("tele"); t.isVisible = false; this.tele.push(t); } // carril de la embestida (saltador: aro de caída; explosivo: aro de la explosión)
    if (kind === "proyector" || kind === "grua" || kind === "payaso" || kind === "caja") this.timer = 2.5;
    if (kind === "tarantula" || kind === "gato") {
      for (let i = 0; i < 2; i++) { const t = teleTemplate().createInstance("tele"); t.isVisible = false; this.tele.push(t); }
      this.state = 3; this.timer = 1.6; this.land.copyFrom(pos); // entra con un salto anunciado
      if (kind === "gato") { this.state = 0; this.timer = 2; }
    }
    if (this.legs.length || this.wings.length || this.windKey) this.syncAttachParts();
  }

  /** Ficha del bestiario: cuerpo + patas/alas bajo el mismo pivot (main.ts mueve solo el pivot). */
  bindAttachPivot(root: B.TransformNode) {
    this.attachRoot = root;
    const vs = GLB[this.kind]?.visual ?? 1;
    // ponytail: InstancedMesh (VAT) + Havok no siguen bien al padre; main.ts copia el pivot al cuerpo cada frame
    this.node.parent = null;
    for (const l of this.legs) {
      l.m.parent = root;
      l.m.rotationQuaternion = null;
      l.m.position.set(l.pos.x * vs, l.pos.y * vs, l.pos.z * vs);
      l.m.rotation.set(0, l.ry, l.rz);
    }
    for (const w of this.wings) {
      w.m.parent = root;
      w.m.rotationQuaternion = null;
      w.m.position.set(w.pos.x * vs, w.pos.y * vs, w.pos.z * vs);
      w.m.rotation.set(0, 0, w.side * w.flap);
    }
    if (this.windKey) {
      this.windKey.m.parent = root;
      this.windKey.m.rotationQuaternion = null;
      this.windKey.m.position.set(this.windKey.pos.x * vs, this.windKey.pos.y * vs, this.windKey.pos.z * vs);
      this.windKey.m.rotation.set(0, 0, this.windKey.rot);
    }
  }

  unbindAttachPivot() {
    if (!this.attachRoot) return;
    this.node.parent = null;
    for (const l of this.legs) l.m.parent = null;
    for (const w of this.wings) w.m.parent = null;
    if (this.windKey) this.windKey.m.parent = null;
    this.attachRoot.dispose();
    this.attachRoot = null;
    this.syncAttachParts();
  }

  // Telegráfico en el piso: zona de radio r centrada en p; k = 0..1 cuánto falta (el aro interior crece hasta el borde)
  showTele(p: B.Vector3 | null, r = 0, k = 0) { // público: la ficha del bestiario (main.ts) muestra el aviso real
    for (const t of this.tele) t.isVisible = !!p;
    if (!p) return;
    const [zone, fill] = this.tele;
    zone.rotation.y = fill.rotation.y = this.aim; // solo importa en el sector del cortacercos
    zone.position.set(p.x, p.y + 0.06, p.z); zone.scaling.set(r, 1, r);
    const f = Math.max(0.05, r * k);
    fill.position.set(p.x, p.y + 0.07, p.z); fill.scaling.set(f, 1, f);
    if (MOON.on) { onFloor(p, 0.06, zone.position); onFloor(p, 0.07, fill.position); orient(zone, p); orient(fill, p); } // luna: apoyado en el piso del lugar
  }

  // Carril de la embestida de Felipe: el aro del telegráfico estirado a lo largo (elipse), el relleno crece desde el perro.
  // ponytail: elipse en vez de un rectángulo propio; si se lee mal, plantilla de carril en models.ts
  showLane(dir: B.Vector3, k: number, len = DOG_RAM.len, width = DOG_RAM.width) {
    this.showTele(this.pos, 1, 0);
    const [zone, fill] = this.tele, h = len / 2, f = Math.max(0.05, h * k), y = this.pos.y + 0.06;
    zone.position.set(this.pos.x + dir.x * h, y, this.pos.z + dir.z * h); zone.scaling.set(width, 1, h);
    fill.position.set(this.pos.x + dir.x * f, y + 0.01, this.pos.z + dir.z * f); fill.scaling.set(width, 1, f);
    if (MOON.on) { onFloor(at(this.pos, dir.x * h, 0, dir.z * h), 0.06, zone.position); onFloor(at(this.pos, dir.x * f, 0, dir.z * f), 0.07, fill.position); orient(zone); orient(fill); } // dir: marco local
  }

  // Patas/alas/llave en espacio de mundo: las instancias hijas no siguen al cuerpo instanciado (beastTick usa euler + quaternion).
  syncAttachParts() {
    if (this.attachRoot) return; // bestiario: todo va parentado al pivot
    if (!this.legs.length && !this.wings.length && !this.windKey) return;
    this.node.computeWorldMatrix(true);
    const pw = this.node.getWorldMatrix(), ar = this.node.absoluteRotationQuaternion, as = this.node.absoluteScaling;
    const put = (m: B.InstancedMesh, pos: B.Vector3, rx: number, ry: number, rz: number) => {
      B.Quaternion.FromEulerAnglesToRef(rx, ry, rz, _lq);
      ar.multiplyToRef(_lq, _wq);
      B.Vector3.TransformCoordinatesToRef(pos, pw, _wp);
      m.scaling.copyFrom(as);
      m.position.copyFrom(_wp);
      if (!m.rotationQuaternion) m.rotationQuaternion = _wq.clone();
      else m.rotationQuaternion.copyFrom(_wq);
      m.rotation.setAll(0);
      m.computeWorldMatrix(true);
    };
    for (const l of this.legs) put(l.m, l.pos, 0, l.ry, l.rz);
    for (const w of this.wings) put(w.m, w.pos, 0.12 * Math.cos(this.walk), 0, w.side * w.flap);
    if (this.windKey) put(this.windKey.m, this.windKey.pos, 0, 0, this.windKey.rot);
  }

  // Animación de caminata: amplitud y frecuencia según la velocidad real
  animate(dt: number) {
    if (this.wings.length) {
      // Aleteo rápido y continuo: insecto ágil
      this.walk += dt * 24;
      const a = Math.sin(this.walk) * 0.55;
      for (const w of this.wings) w.flap = a;
      if (this.vat) glbAnimate(this.vat, 0.6, dt, false, -1);
      if (this.attachRoot) {
        for (const w of this.wings) {
          w.m.rotationQuaternion = null;
          w.m.rotation.set(0.12 * Math.cos(this.walk), 0, w.side * w.flap);
        }
      } else {
        this.syncAttachParts();
      }
      return;
    }
    if (this.kind === "robot") {
      const v = this.vel();
      const sp = Math.hypot(v.x, v.z);
      const keySpeed = 4.0 + sp * 4;
      if (this.windKey) this.windKey.rot += dt * keySpeed;
      if (sp > 0.2) {
        // Marcha mecánica: bamboleo lateral rítmico y paso de juguete a cuerda
        this.walk += dt * Math.min(24, 6 + sp * 4);
        this.node.rotation.z = Math.sin(this.walk) * 0.08;
        this.node.rotation.x = Math.sin(this.walk * 2) * 0.03;
      } else {
        this.node.rotation.z = 0;
        this.node.rotation.x = 0;
      }
      if (this.vat) glbAnimate(this.vat, sp, dt, this.touchCd > 0.5, this.atk >= 0 ? this.atk / 0.9 : -1);
      if (this.attachRoot) {
        if (this.windKey) {
          this.windKey.m.rotationQuaternion = null;
          this.windKey.m.rotation.set(0, 0, this.windKey.rot);
        }
      } else {
        this.syncAttachParts();
      }
      return;
    }
    if (this.vat && GLB[this.kind]!.clips) { this.bossClip(dt); if (!this.attachRoot) this.syncAttachParts(); return; }
    if (this.vat) { // ataque propio (atk) o, sin él, justo después de golpear (main.ts carga touchCd)
      const v = this.vel(), a = GLB[this.kind]!.atk;
      glbAnimate(this.vat, Math.hypot(v.x, v.z), dt, !a && this.touchCd > 0.5, a && this.atk >= 0 ? this.atk / a : -1);
      if (!this.legs.length) return;
    }
    if (!this.legs.length) return;
    const v = this.vel();
    const sp = Math.hypot(v.x, v.z);
    this.walk += dt * Math.min(28, 4 + sp * 3.2) / (this.def.scale ?? 1);
    if ((this.pose += dt) < 0.1) { if (!this.attachRoot) this.syncAttachParts(); return; }
    this.pose = 0;
    const amp = Math.min(0.55, 0.12 + sp * 0.06);
    for (const l of this.legs) {
      const s = Math.sin(this.walk + l.phase);
      l.ry = l.base + s * amp;
      l.rz = l.side * Math.max(0, Math.cos(this.walk + l.phase)) * amp * 0.5; // levanta al avanzar
      if (this.attachRoot) { l.m.rotation.y = l.ry; l.m.rotation.z = l.rz; }
    }
    if (!this.attachRoot) this.syncAttachParts();
  }

  // Fotograma de una secuencia del jefe (SEQ): tramo phase (0..2) en su fracción p (0..1)
  seq(name: string, phase: number, p: number): [string, number] {
    const [clip, f] = SEQ[this.kind]![name];
    return [clip, B.Scalar.Lerp(f[phase], f[phase + 1], B.Scalar.Clamp(p, 0, 1)) / 24];
  }

  // Jefe con todas las acciones horneadas (glb.ts): la acción sale de lo que está haciendo (estado, salto, contacto); al caminar o
  // correr el ciclo avanza a la velocidad real del cuerpo (GLB.clips = m/s de suelo a los que el ciclo no patina)
  private bossClip(dt: number) {
    let c = this.play;
    if (this.deathT >= 0) c = ["death", (this.deathT += dt)]; // el cuerpo físico ya no existe (die)
    else {
      const [w, r] = GLB[this.kind]!.clips!, v = this.vel(), sp = Math.hypot(v.x, v.z), s = this.state, dog = this.kind === "perro";
      if (!this.airborne) this.vy0 = 0;
      if (c) { /* acción forzada */ }
      else if (this.roar > 0) c = ["rage", ROAR - this.roar] // rugido de fase 2
      else if (this.airborne) { // salto: la acción cae justo cuando el cuerpo cae (por la velocidad vertical)
        this.vy0 ||= Math.max(v.y, 1); this.landT = this.landD = 0.4; this.recSeq = "jump";
        c = this.seq("jump", 1, (this.vy0 - v.y) / (2 * this.vy0));
      } else if (this.landT > 0) c = this.seq(this.recSeq, 2, 1 - (this.landT -= dt) / this.landD); // recuperación tras aterrizar o tras el trompo
      else if (dog && s >= 3) c = this.seq("ram", s - 3, 1 - Math.max(0, this.timer) / [this.enraged ? DOG_RAM.windRage : DOG_RAM.wind, DOG_RAM.len / DOG_RAM.speed, DOG_RAM.brake][s - 3]);
      else if (!dog && s === 1) c = this.seq("jump", 0, 1 - this.timer); // agazapado: el aviso de 1 s
      else if (!dog && s === 2) c = this.seq("spin", 0, 1 - this.timer / 0.6); // trompo: se agacha (aviso de 0,6 s)
      else if (!dog && s === 3) c = this.seq("spin", 1, ((1 - this.timer / 1.8) * 4) % 1); // 4 vueltas enteras en 1,8 s: la acción gira, el cuerpo no
      else if (!dog && this.touchCd > 0) c = ["swipe", 0.8 - this.touchCd]; // zarpazo al tocar al auto (main.ts carga touchCd = 0,8)
      else {
        const clip = sp < 0.4 ? (this.enraged ? "rage" : "idle") : sp < Math.sqrt(w * r) ? "walk" : "run";
        c = [clip, (this.clipT += dt * (clip === "walk" ? sp / w : clip === "run" ? sp / r : 1))];
      }
    }
    glbPlay(this.vat!, this.kind, c![0], c![1]);
  }

  // Muerte de un jefe GLB: se libera el cuerpo físico y la malla queda reproduciendo "death" (fx.corpse llama a animate)
  die() {
    this.agg.dispose();
    this.setRage(false);
    for (const t of this.tele) t.dispose();
    this.tele = [];
    this.deathT = 0;
  }

  get pos() { return this.node.position; }
  /** Velocidad para animar: en la luna, en el marco del lugar (y = vertical). */
  vel() { return MOON.on ? toLocal(this.body.getLinearVelocity(), this.pos) : this.body.getLinearVelocity(); }

  // Altura del piso bajo el enemigo (rayo corto hacia abajo, como drive() en car.ts): sirve en rampas y montículos.
  // null = no hay piso dentro de "depth" (sigue en el aire)
  groundY(depth: number) {
    if (MOON.on) return alt(this.pos) < depth ? this.pos.y : null; // luna: piso analítico (solo importa si hay piso cerca)
    rayFrom.copyFrom(this.pos); rayFrom.y += 0.5;
    rayTo.copyFrom(this.pos); rayTo.y -= depth;
    (this.node.getScene().getPhysicsEngine() as B.PhysicsEngineV2).raycastToRef(rayFrom, rayTo, ray, { ignoreBody: this.body });
    return ray.hasHit ? ray.hitPointWorld.y : null;
  }

  // Devuelve "slam" cuando el perro aterriza de un salto.
  // Luna: la IA piensa en el marco local del bicho (Y = vertical del lugar, X/Z = el plano tangente): la velocidad entra y sale convertida
  // y `to`/`fwd` se miden en ese marco, así el resto de la IA (escrita para el patio) no cambia.
  update(dt: number, target: B.Vector3): string | void {
    if (!MOON.on) return this.think(dt, target);
    const p = this.pos, b = this.body;
    b.setLinearVelocity(toLocal(b.getLinearVelocity(), p)); b.setAngularVelocity(toLocal(b.getAngularVelocity(), p));
    const r = this.think(dt, target);
    b.setLinearVelocity(toWorld(b.getLinearVelocity(), p)); b.setAngularVelocity(toWorld(b.getAngularVelocity(), p));
    return r;
  }
  private think(dt: number, target: B.Vector3): string | void {
    const d = this.def;
    this.ramCd -= dt;
    this.hitCd -= dt;
    this.touchCd -= dt;
    const v = this.body.getLinearVelocity();
    const to = MOON.on ? flatL(target.subtract(this.pos), this.pos) : target.subtract(this.pos); to.y = 0;
    const dist = to.length();
    to.normalize();
    const fwd = MOON.on ? flatL(this.node.forward, this.pos) : this.node.forward.clone(); fwd.y = 0; fwd.normalize();
    const diff = Math.atan2(B.Vector3.Cross(fwd, to).y, B.Vector3.Dot(fwd, to));
    let move = to;
    let speed = d.speed * this.spd;
    let turn = 6;
    if (this.slow > 0) { this.slow -= dt; speed *= d.boss ? ATK.jefe_lento_mult : ATK.bicho_lento_mult; } // empapado: se arrastra
    this.clock += dt;
    if (d.boss && !d.final && !this.enraged && this.hp < this.maxHp * ATK.fase2_vida) { this.enraged = true; this.phaseUp = true; this.setRage(true); this.roar = -1; } // fase 2: aviso en main.ts
    if (this.enraged) { speed *= ATK.fase2_vel; this.vapor(dt); }
    if (this.roar < 0 && !this.airborne && this.state === 0) this.roar = ROAR; // espera a que termine el ataque en curso
    const ai = this.kind === "gusano" ? (MOON.on ? WORM_AI : undefined) : ALIEN_AI[this.kind as Alien]; // aliens de la luna (aliens.ts): número = multiplica la persecución común; texto = evento; null = ya movió
    if (ai) { const r = ai(this, dt, to, dist); if (typeof r !== "number") return r ?? undefined; speed *= r; }
    if (this.roar > 0) { // ruge quieto (sigue recibiendo daño); frenarlo cada cuadro anula empujes
      this.roar = Math.max(0, this.roar - dt);
      this.body.setLinearVelocity(new B.Vector3(0, v.y, 0)); this.body.setAngularVelocity(B.Vector3.Zero());
      return;
    }

    const fn = AI[this.kind]; // comportamiento propio del bicho (enemies/ai); mueve move/speed/turn o devuelve evento
    if (fn) {
      const c = { dt, to, dist, fwd, diff, v, target, move, speed, turn };
      const r = fn(this, c);
      if (r) return r === true ? undefined : r;
      ({ move, speed, turn } = c);
    }

    // Velocidad objetivo directa (hordas: barato y legible); la física separa a los enemigos
    if (!d.boss && !this.elite && dist > 0.05) {
      const stand = this.radius + 0.55;
      if (dist < stand) speed *= Math.max(0.42, (dist - 0.12) / (stand - 0.12));
    }
    const want = move.scale(speed);
    const k = Math.min(1, dt * (this.kind === "hormiga" ? 6 : 4));
    this.body.setLinearVelocity(new B.Vector3(v.x + (want.x - v.x) * k, v.y, v.z + (want.z - v.z) * k));
    this.body.setAngularVelocity(new B.Vector3(0, B.Scalar.Clamp(diff * turn, -turn, turn), 0));
  }

  // Élite: rápida (doble velocidad, 60% de vida) o blindada (triple vida, 5 veces más pesada: casi no se la empuja).
  // El aura es una instancia hija (aro en el piso + halo emisivo); el cofre al morir lo suelta main.ts (kill)
  makeElite(t: Elite) {
    this.elite = t;
    if (t === "rapida") { this.spd = BAL.ritmo.elite_rapida_vel; this.hp = this.maxHp *= BAL.ritmo.elite_rapida_vida; }
    else {
      this.hp = this.maxHp *= BAL.ritmo.elite_blindada_vida;
      const m = this.def.mass * BAL.ritmo.elite_blindada_masa, h = this.def.size[1];
      this.body.setMassProperties({ mass: m, inertia: new B.Vector3(0, m, 0), centerOfMass: new B.Vector3(0, h / 2, 0) }); // masa + inercia juntas
    }
    const a = (this.aura = auraTemplate(t).createInstance("aura"));
    a.parent = this.node;
    a.position.setAll(0); // la instancia nace donde está la plantilla escondida (y -500)
    a.scaling.setAll(this.radius * 1.25);
  }

  // Fase 2: tinte rojo en cuerpo y patas (solo jefes con plantilla procedural) y vapor que sale del lomo
  setRage(on: boolean) {
    this.enraged = on; // la ficha del bestiario solo llama a esto (el juego lo fija en update)
    const c = on ? RAGE : WHITE;
    for (const m of [this.node, ...this.legs.map((l) => l.m)]) if (m.instancedBuffers?.[IC]) m.instancedBuffers[IC] = c;
    if (on && !this.rageHalo) {
      const a = (this.rageHalo = auraTemplate("rabia").createInstance("rabia"));
      a.parent = this.node;
      a.position.setAll(0); // la instancia nace donde está la plantilla escondida
      a.scaling.setAll(this.radius * 1.3); // un poco más grande que el aura de élite
    } else if (!on && this.rageHalo) { this.rageHalo.dispose(); this.rageHalo = undefined; }
  }
  // Vapor y latido del halo (se llama cada cuadro mientras dura la fase 2, en partida y en la ficha)
  vapor(dt: number) {
    if (this.rageHalo) {
      // Latido acelerado (~140 por minuto): golpe doble "lub-dub". Con "Reducir parpadeos", pulso de tamaño mínimo y sin brillo
      const p = (performance.now() / 1000) % 0.43, k = Math.max(Math.exp(-((p / 0.05) ** 2)), 0.6 * Math.exp(-(((p - 0.14) / 0.05) ** 2)));
      const calm = document.body.classList.contains("calm");
      this.rageHalo.scaling.setAll(this.radius * 1.3 * (1 + k * (calm ? 0.02 : 0.12)));
      // ponytail: el brillo va en el material compartido de los halos (laten a la vez); hay un solo jefe por vez
      const mat = this.node.getScene().getMaterialByName("aura_rabia") as B.PBRMaterial | null;
      if (mat) mat.emissiveIntensity = calm ? 1 : 1 + k * 1.4;
    }
    if (Math.random() > dt * 9) return; // solo visual
    const [w, h, l] = this.def.size;
    FX.vapor(at(this.pos, (Math.random() - 0.5) * w * 0.7, h * 0.85, (Math.random() - 0.5) * l * 0.7), Math.max(w, l) * 0.12);
  }

  // Caja de música: nueva onda de sonido desde el cuerpo / bailarinas con su ángulo inicial
  addWave() { const m = ondaTemplate().createInstance("onda"); m.isVisible = false; this.waves.push({ r: this.radius, hit: false, m }); }
  addDancers(n: number) { for (let i = 0; i < n; i++) this.dancers.push({ a: (i / n) * 6.2832, m: bailarinaTemplate().createInstance("bailarina") }); }

  // Cortacercos: un cable de 7 m tirado en el piso detrás suyo (dura 14 s, como mucho 8)
  dropCable() {
    const back = this.node.forward.scale(-this.def.size[2] * 0.55), side = this.node.right.scale(3.5);
    const c = this.pos.add(back);
    if (MOON.on) onFloor(c, 0.08, c); else c.y = (this.groundY(3) ?? this.pos.y) + 0.08;
    const m = cableTemplate().createInstance("cable");
    m.position.copyFrom(c);
    m.rotation.y = yawOf(side, c); orient(m);
    this.cables.push({ m, a: c.subtract(side), b: c.add(side), life: ATK.cortacercos_cable_vida_s });
    if (this.cables.length > ATK.cortacercos_cables_max) this.cables.shift()!.m.dispose();
  }
  // ¿El punto p está sobre algún cable? (distancia a cada segmento en el plano)
  onCable(p: B.Vector3) {
    if (MOON.on) return this.cables.some(({ a, b }) => { // luna: distancia al segmento en 3D (el cable está apoyado en el piso)
      const ab = b.subtract(a), t = B.Scalar.Clamp(B.Vector3.Dot(p.subtract(a), ab) / ab.lengthSquared(), 0, 1);
      return B.Vector3.Distance(p, a.add(ab.scale(t))) < 1.2;
    });
    return this.cables.some(({ a, b }) => {
      const abx = b.x - a.x, abz = b.z - a.z, t = B.Scalar.Clamp(((p.x - a.x) * abx + (p.z - a.z) * abz) / (abx * abx + abz * abz), 0, 1);
      return Math.hypot(p.x - a.x - abx * t, p.z - a.z - abz * t) < 1;
    });
  }

  dispose() {
    this.unbindAttachPivot();
    this.agg.dispose(); this.node.dispose();
    for (const l of this.legs) l.m.dispose();
    for (const w of this.wings) w.m.dispose();
    if (this.windKey) this.windKey.m.dispose();
    for (const t of this.tele) t.dispose();
    for (const c of this.cables) c.m.dispose();
    for (const w of this.waves) w.m.dispose();
    for (const d of this.dancers) d.m.dispose();
    if (this.kind === "gusano") wormDispose(this);
  }
}

// Qué aparece según el minuto de la partida: [tipo, peso]
// La plaga de la partida multiplica pesos y puede adelantar la llegada (minuto) de cada tipo
export function spawnTable(t: number, plague?: { mult: Partial<Record<Kind, number>>; from: Partial<Record<Kind, number>> }): [Kind, number][] {
  const m = t / 60;
  const base = (["hormiga", "friccion", "escupidora", "robot", "escarabajo", "polilla", ...(MOON.on ? ALIENS : ["grillo", "mosca", "babosa"])] as Kind[]).map((k): [Kind, number, number] => { const e = BAL.enemigos[k]; return [k, e.aparece_min, e.peso_base + m * e.peso_por_min]; });
  return base.filter(([k, from]) => m >= (plague?.from[k] ?? from)).map(([k, , w]) => [k, w * (plague?.mult[k] ?? 1)]);
}

export function pickWeighted<T>(tab: [T, number][]) {
  let r = rng() * tab.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of tab) if ((r -= w) <= 0) return k;
  return tab[0][0];
}
