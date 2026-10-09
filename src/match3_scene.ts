// Diorama del modo arcade: gabinete de chapa plegada y remachada en un taller de ladrillo (solo presentación).
// Cámara fija: el detalle está donde mira la cámara. Todo se arma al entrar y se desecha al salir.
// Por rendimiento las piezas se fusionan en una malla por material (~16 dibujos) y remaches/bridas son thin instances.
import * as B from "@babylonjs/core";
import earcut from "earcut";
import { brick, canvasTexture, lcg, M3C, marquee, poster, sideDecal, wornTex } from "./kit3d";
import { geoKit } from "./folded";
export { M3C }; // la paleta vive en kit3d.ts (compartida con las escenas de menú)


type V3 = [number, number, number];
type Ctx = CanvasRenderingContext2D;

/** Medidas del frente inclinado (bisel): pantalla cuadrada abajo, display del HUD arriba. Coordenadas locales del nodo `bezel`. */
export const BZ = { scr: 0.5, scrY: -0.067, dispW: 0.5, dispH: 0.104, dispY: 0.265, len: 0.694, tilt: Math.atan2(0.14, 0.68), center: new B.Vector3(0, 1.32, -0.23) };

export type Arcade = {
  root: B.TransformNode;
  screen: B.Mesh;
  display: B.Mesh;
  /** Piezas interactivas del panel (decorativas: no controlan el tablero). */
  stick: B.TransformNode; stickPick: B.Mesh[]; cap: B.Mesh; capMat: B.PBRMaterial;
  /** Punto del mundo donde va montado el botón de pausa (borde derecho del display). */
  pauseAnchor: B.Vector3;
  /** Puntos que la cámara nunca recorta (esquinas del display y de la pantalla, con el marco). */
  mustSee: B.Vector3[];
  dispose(): void;
  /** Esconde o muestra el gabinete (con sus luces) sin destruirlo: se reusa entre partidas. */
  show(on: boolean): void;
};

export function buildArcade(scene: B.Scene): Arcade {
  const root = new B.TransformNode("m3root", scene);
  const owned: { dispose(): void }[] = [];
  const lights: B.Light[] = [];
  const byMat = new Map<B.Material, B.Mesh[]>();

  const mat = (name: string, o: { color?: string; rough?: number; metal?: number; tex?: ReturnType<typeof wornTex>; emissive?: string; tint?: string }) => {
    const m = new B.PBRMaterial("m3" + name, scene);
    m.albedoColor = B.Color3.FromHexString(o.tint ?? o.color ?? "#ffffff").toLinearSpace();
    m.roughness = o.rough ?? 0.6; m.metallic = o.metal ?? 0;
    if (o.tex) {
      m.albedoTexture = o.tex.alb; m.metallicTexture = o.tex.orm;
      m.roughness = 1; m.metallic = 1; // multiplicadores: manda la textura
      m.useRoughnessFromMetallicTextureGreen = true; m.useMetallnessFromMetallicTextureBlue = true; m.useRoughnessFromMetallicTextureAlpha = false;
    }
    if (o.emissive) m.emissiveColor = B.Color3.FromHexString(o.emissive);
    m.maxSimultaneousLights = 8;
    owned.push(m);
    return m;
  };

  // --- Materiales con lógica física ---
  // desgaste en bordes y esquinas (edgeRust), caras centrales sanas
  const tPaint = wornTex(scene, 11, M3C.naranja, null, 128, 0.55, 0.72), tDark = wornTex(scene, 23, "#262a30", null, 128, 0.55, 0.6), tGrey = wornTex(scene, 37, "#b9b9b4", null, 128, 0.5, 0.6);
  tPaint.alb.wrapU = tPaint.alb.wrapV = tPaint.orm.wrapU = tPaint.orm.wrapV = B.Texture.CLAMP_ADDRESSMODE;
  owned.push(tPaint.alb, tPaint.orm, tDark.alb, tDark.orm, tGrey.alb, tGrey.orm);
  const paint = mat("paint", { tex: tPaint });                       // pintura gastada: rugosidad media, chapa expuesta metálica en bordes
  const dark = mat("dark", { tex: tDark });                          // chapa oscura (puertas, bisel)
  const yellowPaint = mat("ypaint", { tex: tGrey, tint: M3C.amarillo });
  const orangePaint = mat("opaint", { tex: tGrey, tint: M3C.naranja }); // placas largas: sin manchas para que el mapeo por cara no las estire
  const teal = mat("teal", { tex: tGrey, tint: "#2f6f78" });
  const redPaint = mat("rpaint", { tex: tGrey, tint: "#c0302a" });
  const steel = mat("steel", { color: "#9aa0a8", rough: 0.32, metal: 1 });   // metal limpio (marco del tablero, tornillos)
  const rust = mat("rust", { color: "#5c3a24", rough: 0.95, metal: 0.25 });  // perfiles y caños oxidados
  const blackM = mat("black", { color: "#101216", rough: 0.7, metal: 0.4 });
  const rubber = mat("rubber", { color: "#141414", rough: 0.95 });
  const cableR = mat("cable", { color: "#8f1d17", rough: 0.6 });
  const bulb = mat("bulb", { color: M3C.amarilloClaro, emissive: M3C.amarilloClaro });
  const ledR = mat("ledR", { color: M3C.error, emissive: M3C.error });
  const btn = [M3C.rojo].map((c, i) => mat("btn" + i, { color: c, rough: 0.3, emissive: B.Color3.FromHexString(c).scale(0.25).toHexString() }));
  const brickTex = canvasTexture(scene, "m3brick", 512, 256, brick);
  brickTex.uScale = 10; brickTex.vScale = 7; brickTex.wrapU = brickTex.wrapV = B.Texture.WRAP_ADDRESSMODE;
  owned.push(brickTex);
  const wallM = mat("wall", { color: "#ffffff", rough: 0.95 }); wallM.albedoTexture = brickTex;
  const floorTex = wornTex(scene, 51, "#3b3833", null, 64);
  floorTex.alb.uScale = floorTex.alb.vScale = floorTex.orm.uScale = floorTex.orm.vScale = 6;
  owned.push(floorTex.alb, floorTex.orm);
  const floorM = mat("floor", { tex: floorTex });

  const add = (m: B.Mesh, material: B.Material) => { (byMat.get(material) ?? byMat.set(material, []).get(material)!).push(m); return m; };
  // Kit de geometría compartido (folded.ts): mismas piezas que antes, fusionadas por material al final
  const G = geoKit(scene, add);
  const { box, cyl, sph, tube, rivets, rivetM } = G;
  const bend = (a: V3, b: V3, r = 0.012, m: B.Material = paint) => G.bend(a, b, r, m);

  // ================= GABINETE =================
  // Laterales: perfil de arcade extruido (chapa de 3 cm). z negativo = frente.
  const prof: [number, number][] = [[-0.37, 0], [-0.37, 0.78], [-0.5, 0.93], [-0.32, 0.99], [-0.18, 1.66], [-0.33, 1.69], [-0.33, 1.95], [0.3, 1.95], [0.4, 1.75], [0.4, 0]];
  const W = 0.36; // mitad del ancho interior
  for (const s of [-1, 1]) {
    const m = B.MeshBuilder.ExtrudePolygon("p", { shape: prof.map(([z, y]) => new B.Vector3(z, 0, y)), depth: 0.03 }, scene, earcut);
    // Permutación cíclica (x,y,z) → (y,z,x): el perfil queda en el plano ZY y el espesor en X (rotación propia: normales válidas)
    for (const kind of [B.VertexBuffer.PositionKind, B.VertexBuffer.NormalKind]) {
      const a = m.getVerticesData(kind)!;
      for (let i = 0; i < a.length; i += 3) { const x = a[i], y = a[i + 1], z = a[i + 2]; a[i] = y; a[i + 1] = z; a[i + 2] = x; }
      m.setVerticesData(kind, a);
    }
    // UV planar normalizado [0..1] al contorno del lateral: el óxido de borde cae en cantos, esquinas y base (sin repetir al medio)
    const P = m.getVerticesData(B.VertexBuffer.PositionKind)!, uv: number[] = [];
    for (let i = 0; i < P.length; i += 3) uv.push((P[i + 2] + 0.51) / 0.92, P[i + 1] / 1.96);
    m.setVerticesData(B.VertexBuffer.UVKind, uv);
    m.refreshBoundingInfo();
    m.position.x = s > 0 ? W + 0.03 : -W;
    add(m, paint);
    // Canto plegado a lo largo del frente del lateral + remaches sobre la pestaña
    const xo = s * (W + 0.03);
    for (let i = 0; i < 6; i++) {
      const [z0, y0] = prof[i], [z1, y1] = prof[i + 1];
      bend([xo, y0, z0], [xo, y1, z1], 0.014);
      rivets([xo + s * 0.002, y0 + (y1 - y0) * 0.12, z0 + (z1 - z0) * 0.12 + 0.03], [xo + s * 0.002, y0 + (y1 - y0) * 0.88, z0 + (z1 - z0) * 0.88 + 0.03], Math.max(2, Math.round(Math.hypot(z1 - z0, y1 - y0) / 0.14)), [s, 0, 0]);
    }
    // Refuerzo en L abajo y placa superpuesta (chatarra reutilizada) en el lateral
    box(0.012, 0.06, 0.7, rust, [xo + s * 0.006, 0.06, 0.02]);
    const pz = 0.05, py = 0.45;
    box(0.008, 0.26, 0.3, dark, [xo + s * 0.006, py, pz], [0.04 * s, 0, 0]);
    rivets([xo + s * 0.011, py + 0.11, pz - 0.13], [xo + s * 0.011, py + 0.11, pz + 0.13], 3, [s, 0, 0]);
    rivets([xo + s * 0.011, py - 0.11, pz - 0.13], [xo + s * 0.011, py - 0.11, pz + 0.13], 3, [s, 0, 0]);
  }
  // Calcomanía lateral (lado derecho, el que ve la cámara)
  const decalTex = canvasTexture(scene, "m3decal", 256, 384, sideDecal, true);
  owned.push(decalTex);
  const decalM = mat("decal", { color: "#ffffff", rough: 0.7 }); decalM.albedoTexture = decalTex; decalM.useAlphaFromAlbedoTexture = true; decalM.transparencyMode = B.PBRMaterial.PBRMATERIAL_ALPHATEST;
  const decal = B.MeshBuilder.CreatePlane("p", { width: 0.3, height: 0.45 }, scene);
  decal.position.set(W + 0.032, 1.05, 0.12); decal.rotation.y = -Math.PI / 2;
  add(decal, decalM);

  // Zócalo, puerta inferior (kick) con puerta de monedas, rejilla y parche remachado
  box(0.74, 0.05, 0.7, blackM, [0, 0.025, 0.03]);
  box(0.72, 0.73, 0.02, dark, [0, 0.415, -0.36]);
  bend([-W, 0.78, -0.37], [W, 0.78, -0.37], 0.012);
  bend([-W, 0.05, -0.37], [W, 0.05, -0.37], 0.012, rust);
  box(0.22, 0.3, 0.025, blackM, [-0.12, 0.42, -0.375]);           // puerta de monedas
  box(0.2, 0.28, 0.01, rust, [-0.12, 0.42, -0.39]);
  for (const x of [-0.17, -0.07]) { box(0.035, 0.05, 0.012, ledR, [x, 0.5, -0.397]); box(0.012, 0.05, 0.01, blackM, [x, 0.42, -0.397]); }
  box(0.02, 0.06, 0.02, steel, [-0.03, 0.36, -0.39]);               // cerradura
  rivets([-0.22, 0.56, -0.392], [-0.02, 0.56, -0.392], 4, [0, 0, -1]);
  rivets([-0.22, 0.28, -0.392], [-0.02, 0.28, -0.392], 4, [0, 0, -1]);
  for (let i = 0; i < 7; i++) box(0.16, 0.012, 0.02, blackM, [0.16, 0.3 + i * 0.03, -0.375], [0.5, 0, 0]); // rejilla
  box(0.2, 0.25, 0.006, rust, [0.16, 0.39, -0.368]);
  box(0.15, 0.12, 0.006, yellowPaint, [0.17, 0.66, -0.372], [0, 0, 0.06]);  // parche de otra chapa
  rivets([0.11, 0.7, -0.376], [0.23, 0.71, -0.376], 3, [0, 0, -1]);
  rivets([-0.33, 0.1, -0.373], [0.33, 0.1, -0.373], 6, [0, 0, -1]);
  rivets([-0.33, 0.74, -0.373], [0.33, 0.74, -0.373], 6, [0, 0, -1]);

  // Panel de control: cara frontal inclinada + tapa; joystick y botones
  // Cara frontal inclinada (chapa plegada con pestaña y sombra bajo el voladizo)
  const deckFront = Math.atan2(0.13, 0.15);
  box(0.74, 0.2, 0.025, paint, [0, 0.855, -0.435], [-deckFront, 0, 0]);
  box(0.72, 0.03, 0.06, blackM, [0, 0.79, -0.39]);                                  // sombra/hueco bajo el panel
  const deckTilt = Math.atan2(0.06, 0.18);
  const deck = new B.TransformNode("deck", scene); deck.parent = root; deck.position.set(0, 0.96, -0.41); deck.rotation.x = -deckTilt;
  box(0.76, 0.05, 0.22, paint, [0, -0.012, 0], undefined, deck);                    // cuerpo del panel (volumen)
  box(0.7, 0.012, 0.17, dark, [0, 0.018, 0.0], undefined, deck);                     // placa superior atornillada, separada del borde
  for (const s of [-1, 1]) box(0.012, 0.07, 0.24, rust, [s * 0.385, -0.01, 0], undefined, deck); // mejillas laterales plegadas
  box(0.76, 0.02, 0.012, rust, [0, 0.0, -0.115], undefined, deck);                  // pestaña frontal doblada
  bend([-W - 0.02, 0.935, -0.525], [W + 0.02, 0.935, -0.525], 0.016);
  const onDeck = (x: number, z: number, h = 0) => { const v = B.Vector3.TransformCoordinates(new B.Vector3(x, 0.024 + h, z), deck.computeWorldMatrix(true)); return [v.x, v.y, v.z] as V3; };
  for (const [x, z] of [[-0.33, -0.07], [0.33, -0.07], [-0.33, 0.07], [0.33, 0.07], [0, -0.07], [0, 0.07]]) rivets(onDeck(x, z, 0.002), onDeck(x, z, 0.002), 1, [0, 0.95, -0.3]);
  // Joystick montado: placa de roce gastada donde apoya la mano, placa base de acero, aro y fuelle de goma
  const at = (x: number, z: number, h: number, parent: B.TransformNode = deck) => { const n = new B.TransformNode("p", scene); n.parent = parent; n.position.set(x, 0.024 + h, z); return n; };
  box(0.16, 0.004, 0.14, rust, [-0.16, 0.025, -0.04], [0, 0.05, 0], deck);
  box(0.11, 0.008, 0.11, steel, [-0.16, 0.028, -0.05], undefined, deck);
  cyl(0.075, 0.012, blackM, [0, 0, 0]).parent = at(-0.16, -0.05, 0.01); 
  const boot = cyl(0.03, 0.035, rubber, [0, 0, 0], undefined, 8, 0.06); boot.parent = at(-0.16, -0.05, 0.03);
  const stick = at(-0.16, -0.05, 0.02); stick.name = "m3stick";
  const shaft = B.MeshBuilder.CreateCylinder("m3shaft", { diameter: 0.014, height: 0.065, tessellation: 6 }, scene); shaft.material = steel; shaft.parent = stick; shaft.position.y = 0.032;
  const ball = B.MeshBuilder.CreateSphere("m3ball", { diameter: 0.05, segments: 8 }, scene); ball.material = btn[0]; ball.parent = stick; ball.position.y = 0.07;
  // Botón rojo encastrado: chapa de desgaste alrededor + aro negro hundido + capuchón que baja al apretarlo
  box(0.12, 0.004, 0.11, rust, [0.12, 0.025, 0.01], [0, -0.06, 0], deck);
  cyl(0.06, 0.012, blackM, [0, 0, 0]).parent = at(0.12, 0.01, 0.002);
  cyl(0.068, 0.004, steel, [0, 0, 0], undefined, 12).parent = at(0.12, 0.01, 0.008);
  const cap = B.MeshBuilder.CreateCylinder("m3cap", { diameter: 0.044, height: 0.022, tessellation: 12 }, scene); const capM = mat("cap", { color: M3C.rojo, rough: 0.3 }); cap.material = capM; cap.parent = at(0.12, 0.01, 0.016);
  // las piezas fijas se re-ubican en el mundo para la fusión
  for (const m of [...(byMat.get(blackM) ?? []), ...(byMat.get(rubber) ?? []), ...(byMat.get(steel) ?? [])]) if (m.parent && m.parent !== root) { m.computeWorldMatrix(true); m.setParent(null); }
  shaft.isPickable = ball.isPickable = cap.isPickable = true;

  // Frente inclinado (bisel): marco de placas separadas, túnel de la pantalla, marco limpio del tablero y display
  const bz = new B.TransformNode("bezel", scene); bz.parent = root; bz.position.copyFrom(BZ.center); bz.rotation.x = BZ.tilt;
  const s2 = BZ.scr / 2, L2 = BZ.len / 2, side = (0.72 - BZ.scr) / 2;
  box(0.72, 0.03, 0.025, dark, [0, -L2 + 0.015, 0.012], undefined, bz);                   // banda inferior
  box(0.72, 0.03, 0.025, dark, [0, BZ.scrY + s2 + 0.015, 0.012], undefined, bz);         // banda entre pantalla y display
  box(0.72, 0.03, 0.025, dark, [0, L2 - 0.015, 0.012], undefined, bz);                    // banda superior
  for (const s of [-1, 1]) box(side - 0.006, BZ.len - 0.06, 0.025, orangePaint, [s * (s2 + side / 2), 0, 0.012], [0, 0, 0.004 * s], bz); // placas laterales (con luz entre piezas)
  const d = 0.05; // profundidad del túnel de la pantalla
  for (const s of [-1, 1]) {
    box(0.012, BZ.scr, d, blackM, [s * (s2 + 0.006), BZ.scrY, d / 2], undefined, bz);
    box(BZ.scr + 0.024, 0.012, d, blackM, [0, BZ.scrY + s * (s2 + 0.006), d / 2], undefined, bz);
    // marco metálico limpio del tablero, al fondo del túnel
    box(0.014, BZ.scr + 0.028, 0.008, steel, [s * (s2 + 0.001), BZ.scrY, d - 0.006], undefined, bz);
    box(BZ.scr + 0.028, 0.014, 0.008, steel, [0, BZ.scrY + s * (s2 + 0.001), d - 0.006], undefined, bz);
    // marco del display
    box(0.01, BZ.dispH + 0.02, 0.02, steel, [s * (BZ.dispW / 2 + 0.005), BZ.dispY, 0.004], undefined, bz);
    box(BZ.dispW + 0.02, 0.01, 0.02, steel, [0, BZ.dispY + s * (BZ.dispH / 2 + 0.005), 0.004], undefined, bz);
  }
  const bzRivet = (x: number, y: number) => { const v = B.Vector3.TransformCoordinates(new B.Vector3(x, y, -0.002), bz.computeWorldMatrix(true)); return [v.x, v.y, v.z] as V3; };
  const nrm = (() => { const n = B.Vector3.TransformNormal(new B.Vector3(0, 0, -1), bz.computeWorldMatrix(true)); return [n.x, n.y, n.z] as V3; })();
  for (const s of [-1, 1]) {
    rivets(bzRivet(s * (s2 + side / 2), -L2 + 0.05), bzRivet(s * (s2 + side / 2), L2 - 0.05), 6, nrm);
    rivets(bzRivet(s * (s2 + 0.025), BZ.scrY - s2 - 0.015), bzRivet(s * (s2 + 0.025), BZ.scrY - s2 - 0.015), 1, nrm);
  }
  rivets(bzRivet(-0.3, BZ.scrY + s2 + 0.015), bzRivet(0.3, BZ.scrY + s2 + 0.015), 7, nrm);
  // Bisagras del bisel (el frente se abre para mantenimiento)
  for (const s of [-1, 1]) { const p = bzRivet(s * 0.28, -L2); cyl(0.022, 0.07, steel, p, [0, 0, Math.PI / 2], 6); }

  const screen = B.MeshBuilder.CreatePlane("m3screen", { size: BZ.scr }, scene);
  screen.parent = bz; screen.position.set(0, BZ.scrY, d);
  const display = B.MeshBuilder.CreatePlane("m3display", { width: BZ.dispW, height: BZ.dispH }, scene);
  display.parent = bz; display.position.set(0, BZ.dispY, 0.012);
  // Vidrio: reflejo leve de las lámparas, casi transparente
  const glassM = mat("glass", { color: "#0d1418", rough: 0.12, metal: 0 }); glassM.alpha = 0.08; glassM.useSpecularOverAlpha = false; glassM.useRadianceOverAlpha = false;
  const glass = B.MeshBuilder.CreatePlane("m3glass", { size: BZ.scr + 0.02 }, scene);
  glass.parent = bz; glass.position.set(0, BZ.scrY, 0.006); glass.material = glassM; glass.isPickable = false;

  // Rejilla del parlante sobre el bisel y marquesina iluminada
  box(0.72, 0.045, 0.15, dark, [0, 1.685, -0.255]);
  for (let i = 0; i < 9; i++) box(0.012, 0.03, 0.01, blackM, [-0.2 + i * 0.05, 1.685, -0.333]);
  box(0.74, 0.25, 0.14, paint, [0, 1.825, -0.25]);
  const marqTex = canvasTexture(scene, "m3marq", 512, 144, marquee);
  owned.push(marqTex);
  const marqM = mat("marqM", { color: "#000000" }); marqM.emissiveTexture = marqTex; marqM.emissiveColor = B.Color3.White(); marqM.disableLighting = true; marqM.environmentIntensity = 0; marqM.fogEnabled = false;
  const marq = B.MeshBuilder.CreatePlane("p", { width: 0.64, height: 0.18 }, scene);
  marq.position.set(0, 1.825, -0.326); add(marq, marqM);
  for (const s of [-1, 1]) {
    box(0.03, 0.22, 0.02, steel, [s * 0.335, 1.825, -0.326]);   // perfiles que sujetan el acrílico
    rivets([s * 0.335, 1.73, -0.337], [s * 0.335, 1.92, -0.337], 3, [0, 0, -1]);
    sph(0.035, bulb, [s * 0.3, 1.97, -0.27]);                    // focos de la marquesina
    cyl(0.03, 0.03, steel, [s * 0.3, 1.95, -0.27]);
  }
  bend([-W, 1.7, -0.32], [W, 1.7, -0.32], 0.012);
  bend([-W, 1.95, -0.32], [W, 1.95, -0.32], 0.012);
  box(0.74, 0.02, 0.66, dark, [0, 1.955, -0.01]);                 // techo
  box(0.74, 1.74, 0.02, dark, [0, 0.87, 0.4]);                    // espalda
  // Cables entre módulos: de la marquesina al lateral y de la espalda al piso
  tube([[W - 0.02, 1.9, -0.18], [W + 0.07, 1.75, -0.1], [W + 0.06, 1.3, 0.1], [W + 0.04, 0.9, 0.25]], 0.009, cableR);
  tube([[-0.2, 0.3, 0.41], [-0.25, 0.08, 0.6], [-0.6, 0.01, 0.75], [-1.2, 0.01, 0.8]], 0.012, rubber);

  // ================= TALLER =================
  const floor = B.MeshBuilder.CreateGround("p", { width: 9, height: 6 }, scene); floor.position.z = -1.5; add(floor, floorM);
  const wall = B.MeshBuilder.CreatePlane("p", { width: 9, height: 3.6 }, scene); wall.position.set(0, 1.8, 0.95); add(wall, wallM);
  for (const s of [-1, 1]) { const sw = B.MeshBuilder.CreatePlane("p", { width: 6, height: 3.6 }, scene); sw.position.set(s * 3.2, 1.8, -1.5); sw.rotation.y = s * Math.PI / 2; add(sw, wallM); }
  // Caños: horizontal alto y bajada a la izquierda, con bridas
  const flangeM: B.Matrix[] = [];
  const flange = (p: V3, axis: V3) => flangeM.push(B.Matrix.Compose(B.Vector3.One(), B.Quaternion.FromUnitVectorsToRef(B.Vector3.Up(), new B.Vector3(...axis), new B.Quaternion()), new B.Vector3(...p)));
  cyl(0.08, 9, rust, [0, 2.6, 0.86], [0, 0, Math.PI / 2], 8);
  cyl(0.06, 2.4, rust, [-0.8, 1.4, 0.86], undefined, 8);
  for (const x of [-2.6, -1.6, -0.8, 0.6, 1.8, 2.8]) flange([x, 2.6, 0.86], [1, 0, 0]);
  for (const y of [0.4, 1.3, 2.2]) flange([-0.8, y, 0.86], [0, 1, 0]);
  cyl(0.05, 0.6, rust, [1.5, 2.25, 0.86], undefined, 8);
  box(0.26, 0.36, 0.12, dark, [1.5, 1.85, 0.88]);                  // tablero eléctrico
  box(0.03, 0.03, 0.01, ledR, [1.43, 1.98, 0.818]);
  rivets([1.39, 2.0, 0.818], [1.61, 2.0, 0.818], 2, [0, 0, -1]);
  rivets([1.39, 1.7, 0.818], [1.61, 1.7, 0.818], 2, [0, 0, -1]);
  // Lámparas de jaula (luz cálida principal)
  for (const [x, y] of [[-1.25, 2.15], [1.0, 2.3]] as [number, number][]) {
    box(0.08, 0.08, 0.04, rust, [x, y + 0.2, 0.92]);
    cyl(0.015, 0.2, rust, [x, y + 0.2, 0.84], [Math.PI / 2, 0, 0], 6);
    cyl(0.07, 0.04, steel, [x, y + 0.13, 0.74], undefined, 8);
    sph(0.08, bulb, [x, y + 0.03, 0.74]);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; cyl(0.006, 0.18, steel, [x + Math.cos(a) * 0.055, y + 0.04, 0.74 + Math.sin(a) * 0.055], undefined, 4); }
    const L = new B.PointLight("m3lamp", new B.Vector3(x, y, 0.6), scene);
    L.diffuse = B.Color3.FromHexString("#ffb070"); L.intensity = 1.5; L.range = 6; lights.push(L);
  }
  // Cartel
  const posterTex = canvasTexture(scene, "m3poster", 256, 360, poster); owned.push(posterTex);
  const posterM = mat("poster", { color: "#ffffff", rough: 0.85 }); posterM.albedoTexture = posterTex;
  const pst = B.MeshBuilder.CreatePlane("p", { width: 0.6, height: 0.84 }, scene); pst.position.set(-1.45, 1.45, 0.93); pst.rotation.z = 0.03; add(pst, posterM);
  // Banqueta, cajas y tambor (kit modular: mismas piezas y materiales)
  const stool = (x: number, z: number) => {
    cyl(0.36, 0.07, redPaint, [x, 0.66, z], undefined, 12);
    cyl(0.32, 0.02, steel, [x, 0.62, z], undefined, 12);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.6; cyl(0.025, 0.64, steel, [x + Math.cos(a) * 0.13, 0.31, z + Math.sin(a) * 0.13], [Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12], 5); }
    box(0.26, 0.02, 0.02, rust, [x, 0.25, z]); box(0.02, 0.02, 0.26, rust, [x, 0.25, z]);
  };
  const crate = (x: number, y: number, z: number, w: number, h: number, dd: number, m: B.Material, ry = 0) => {
    box(w, h, dd, m, [x, y + h / 2, z], [0, ry, 0]);
    box(w + 0.02, 0.03, dd + 0.02, rust, [x, y + 0.03, z], [0, ry, 0]);
    box(w + 0.02, 0.03, dd + 0.02, rust, [x, y + h - 0.03, z], [0, ry, 0]);
  };
  stool(-0.95, -0.55);
  crate(-1.75, 0, 0.45, 0.6, 0.45, 0.5, teal, 0.1);
  crate(-1.7, 0.45, 0.45, 0.45, 0.35, 0.4, yellowPaint, -0.15);
  crate(1.15, 0, 0.55, 0.4, 0.3, 0.35, teal, -0.2);
  cyl(0.5, 0.75, redPaint, [1.7, 0.375, 0.45], undefined, 12);
  for (const y of [0.15, 0.6]) cyl(0.52, 0.03, rust, [1.7, y, 0.45], undefined, 12);

  // --- Fusión: una malla por material (las piezas siguen separadas a la vista: luces entre placas, dobleces y remaches) ---
  for (const [m, parts] of byMat) {
    const merged = B.Mesh.MergeMeshes(parts, true, true);
    if (!merged) continue;
    merged.material = m; merged.parent = root; merged.isPickable = false; merged.freezeWorldMatrix();
  }
  const mkThin = (src: B.Mesh, list: B.Matrix[]) => {
    src.parent = root; src.isPickable = false;
    const buf = new Float32Array(list.length * 16);
    list.forEach((m, i) => m.copyToArray(buf, i * 16));
    src.thinInstanceSetBuffer("matrix", buf, 16, true);
  };
  const rv = B.MeshBuilder.CreateCylinder("m3rivet", { diameterTop: 0.012, diameterBottom: 0.016, height: 0.008, tessellation: 6 }, scene); rv.material = steel; mkThin(rv, rivetM);
  const fl = B.MeshBuilder.CreateCylinder("m3flange", { diameter: 0.13, height: 0.04, tessellation: 8 }, scene); fl.material = rust; mkThin(fl, flangeM);
  // ojo: el nodo del bisel queda (pantalla y display cuelgan de él)

  // --- Luces: pantalla (fría, principal sobre el frente), marquesina (secundaria), lámparas cálidas (arriba) ---
  const scrL = new B.PointLight("m3scrL", new B.Vector3(0, 1.05, -0.75), scene);
  scrL.diffuse = B.Color3.FromHexString("#8fd8ff"); scrL.intensity = 0.55; scrL.range = 2.2; scrL.excludedMeshes.push(glass); lights.push(scrL);
  const mqL = new B.PointLight("m3mqL", new B.Vector3(0, 2.0, -0.55), scene);
  mqL.diffuse = B.Color3.FromHexString(M3C.naranja); mqL.intensity = 0.45; mqL.range = 1.6; lights.push(mqL);

  const world = (x: number, y: number) => B.Vector3.TransformCoordinates(new B.Vector3(x, y, 0), bz.computeWorldMatrix(true));
  return {
    root, screen, display, stick, stickPick: [shaft, ball], cap, capMat: capM,
    pauseAnchor: world(s2 + side / 2, BZ.dispY),
    mustSee: [world(-s2 - 0.03, BZ.dispY + BZ.dispH / 2 + 0.03), world(s2 + 0.03, BZ.dispY + BZ.dispH / 2 + 0.03), world(-s2 - 0.03, BZ.scrY - s2 - 0.03), world(s2 + 0.03, BZ.scrY - s2 - 0.03)],
    show(on: boolean) { root.setEnabled(on); lights.forEach((l) => l.setEnabled(on)); },
    dispose() {
      lights.forEach((l) => l.dispose());
      root.getChildMeshes().forEach((m) => m.dispose());
      root.getChildTransformNodes().forEach((n) => n.dispose());
      root.dispose();
      owned.forEach((o) => o.dispose());
    },
  };
}
