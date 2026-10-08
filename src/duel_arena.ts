// Arena de Demolición: recinto industrial alrededor del ring (muros de placas, contenedores, grada, grúa, focos).
// Todo lo de afuera es decoración SIN colisión y fusionada (merge): ~1 draw por material. Solo los muros del ring tienen física (duel.ts).
import * as B from "@babylonjs/core";
import { box, cyl, merge } from "./models";
import { canvasTex, M, pbr, surface } from "./render";

let lights: B.Light[] = [];
let hook: B.Mesh | null = null, fan: B.Mesh | null = null, beacon: B.Mesh | null = null;
let t = 0, hemi: B.Light | null = null, hemiI = 0;

/** Placa de muro: chapa con costuras y bulones, franja de seguridad arriba. Se repite a lo largo del muro. */
export function wallMat() {
  const tex = canvasTex(128, (g, s) => {
    g.fillStyle = "#2e3034"; g.fillRect(0, 0, s, s);
    g.fillStyle = "#3a3c40"; g.fillRect(0, 0, 3, s); g.fillRect(0, s * 0.62, s, 3); // costuras
    g.fillStyle = "#8a8d92";
    for (const x of [8, s / 2, s - 8]) for (const y of [s * 0.3, s * 0.55, s * 0.72, s - 8]) g.fillRect(x - 2, y - 2, 4, 4); // bulones
    for (let i = -2; i < 6; i++) { // franja amarilla y negra en el borde superior
      g.fillStyle = "#ffc21a"; g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 16, 0); g.lineTo(i * 32 + 40, s * 0.3); g.lineTo(i * 32 + 24, s * 0.3); g.fill();
    }
    g.fillStyle = "#111"; g.fillRect(0, s * 0.3, s, 3);
    g.fillStyle = "rgba(90,50,20,.35)"; for (let i = 0; i < 30; i++) g.fillRect(Math.random() * s, s * 0.3 + Math.random() * s * 0.7, 2, 4 + Math.random() * 10); // óxido chorreado
  });
  tex.uScale = 8;
  const m = lit(surface(pbr("duelWall", { color: "#fff", rough: 0.6, metal: 0.2, tex, emissive: "#3a3a3a" }), "steel", 6));
  m.emissiveTexture = tex; // franja reflectiva: el muro no se pierde en la penumbra
  return m;
}

/** PBR acepta 4 luces por defecto (hemi, sol, faro y brillo del auto): sin subir el tope el foco cenital no llega. */
export function lit(m: B.PBRMaterial) { m.maxSimultaneousLights = 6; return m; }

/** Chapa de contenedor: nervaduras verticales + óxido; blanca para teñir con albedoColor. Con textura, merge() no la aplana a color plano. */
function ribTex() {
  return canvasTex(64, (g, s) => {
    g.fillStyle = "#cfcfcf"; g.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 8) { g.fillStyle = "#8a8a8a"; g.fillRect(x, 0, 2, s); g.fillStyle = "#f0f0f0"; g.fillRect(x + 3, 0, 1, s); }
    g.fillStyle = "rgba(110,60,25,.45)"; for (let i = 0; i < 14; i++) g.fillRect(Math.random() * s, Math.random() * s, 3, 3 + Math.random() * 12);
    g.fillStyle = "#555"; g.fillRect(0, 0, s, 3); g.fillRect(0, s - 3, s, 3);
  });
}

/** Cartel con texto (señalización): plano w × w/4; la textura cuadrada se dibuja estirada ×4 en alto para compensar. */
function sign(text: string, w: number, pos: [number, number, number], rotY: number) {
  const tex = canvasTex(256, (g, s) => {
    g.scale(1, 4); const h = s / 4;
    g.fillStyle = "#d9a21a"; g.fillRect(0, 0, s, h);
    g.fillStyle = "#111"; g.fillRect(3, 3, s - 6, h - 6);
    g.fillStyle = "#d9a21a"; g.font = `bold ${h * 0.42}px monospace`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, s / 2, h / 2, s - 16);
  });
  const p = B.MeshBuilder.CreatePlane("duelSign", { width: w, height: w / 4 }, tex.getScene()!);
  const m = lit(pbr("duelSign" + text, { color: "#fff", rough: 0.7, tex, emissive: "#b0b0b0" }));
  m.emissiveTexture = tex; // cartel retroiluminado: se lee aunque el foco no le llegue
  p.material = m;
  p.position.set(...pos); p.rotation.y = rotY;
  return p;
}

/** Arma la decoración fuera del ring (half = medio lado del ring). Devuelve las mallas para que cleanup() las libere. */
export function buildArenaDecor(scene: B.Scene, half: number): B.Mesh[] {
  disposeArenaDecor();
  const out: B.Mesh[] = [];
  const rib = ribTex();
  const chapa = (c: string) => lit(surface(pbr("duelCh" + c, { color: c, rough: 0.65, metal: 0.25, tex: rib }), "steel", 3));
  const steel = chapa("#6a6e74"), dark = chapa("#34363a"), yel = chapa("#d9a21a"), lampOn = M.glow("#ffd88a");
  const cont = ["#9a3a2a", "#3a6a86", "#6f8232", "#b0742a"].map(chapa);
  const R = half + 5; // anillo de fondo: lejos de la cámara de pelea (que vive dentro del ring)
  const parts: B.Mesh[] = [];
  // Contenedores apilados en dos lados (gradas improvisadas)
  for (let i = 0; i < 6; i++) {
    const x = -half + 2 + i * 4.4;
    parts.push(box(4, 2.4, 2.2, cont[i % 4], [x, 1.2, R]));
    if (i % 2 === 0) parts.push(box(4, 2.4, 2.2, cont[(i + 1) % 4], [x + 1, 3.6, R + 0.3]));
    parts.push(box(2.2, 2.4, 4, cont[(i + 2) % 4], [-R, 1.2, -half + 2 + i * 4.4]));
  }
  // Grada escalonada de chapa detrás del muro sur
  for (let s = 0; s < 4; s++) parts.push(box(half * 1.6, 0.6, 1.2, steel, [0, 0.3 + s * 0.6, -R - s * 1.2]));
  // Torres de focos en las esquinas: poste + cabezal emisivo
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    parts.push(cyl(0.3, 0.4, 9, steel, [sx * (half + 3), 4.5, sz * (half + 3)], undefined, 6));
    parts.push(box(1.6, 0.8, 0.4, lampOn, [sx * (half + 2.6), 9, sz * (half + 2.6)], [0.6 * sz, Math.atan2(sx, sz), 0]));
  }
  // Prensa/trituradora como silueta al este
  parts.push(box(4, 6, 5, dark, [R + 2, 3, -4]), box(5, 0.8, 6, steel, [R + 2, 6.4, -4]), box(3, 3, 1, yel, [R + 0.1, 1.5, -4]));
  // Grúa torre al noreste
  parts.push(box(0.8, 14, 0.8, yel, [R + 3, 7, R]), box(14, 0.6, 0.6, yel, [R - 3, 14, R]));
  const decor = merge("duelDecor", parts);
  out.push(decor);

  // Gancho de la grúa oscilando (pivot en la punta del brazo)
  hook = merge("duelHook", [cyl(0.06, 0.06, 6, steel, [0, -3, 0], undefined, 4), box(0.8, 0.6, 0.3, dark, [0, -6.2, 0])]);
  hook.position.set(R - 8, 14, R); out.push(hook);
  // Ventilador industrial en el muro de la prensa
  fan = merge("duelFan", [0, 1, 2, 3].map((k) => box(0.15, 2.4, 0.4, steel, [0, 0, 0], [k * Math.PI / 4, 0, 0])));
  fan.position.set(R - 0.2, 4, 3); out.push(fan, cyl(2.8, 2.8, 0.2, dark, [R + 0.05, 4, 3], [0, 0, Math.PI / 2], 8));
  // Baliza giratoria sobre la prensa
  beacon = box(0.5, 0.3, 0.2, M.glow("#ff6a1a"), [R + 2, 7.1, -4]); out.push(beacon);

  // Señalización
  out.push(sign("ZONA DE DEMOLICIÓN", 8, [0, 3.4, half + 0.45], 0), sign("PELIGRO · NO PASAR", 6, [half + 0.45, 3.2, 0], Math.PI / 2));

  // Luces: un foco cenital duro sobre el centro (jerarquía) + un relleno cálido de la torre más cercana
  const key = new B.SpotLight("duelKey", new B.Vector3(0, 13, 0), new B.Vector3(0, -1, 0), Math.PI / 2.3, 4, scene);
  key.diffuse = B.Color3.FromHexString("#fff1d6"); key.intensity = 2600; key.range = 40;
  // El clima de noche deja el ambiente muy bajo para leer muros y fondo: se sube mientras dura la arena
  hemi = scene.getLightByName("hemi"); if (hemi) { hemiI = hemi.intensity; hemi.intensity *= 2.2; }
  lights = [key];
  return out;
}

/** Animación barata (sin física): gancho que oscila, ventilador y baliza que giran. */
export function arenaDecorTick(dt: number) {
  if (!hook) return;
  t += dt;
  hook.rotation.z = Math.sin(t * 0.7) * 0.12;
  fan!.rotation.x += dt * 4;
  beacon!.rotation.y += dt * 6;
}

/** Las mallas las libera cleanup() de duel.ts; acá solo las luces y referencias. */
export function disposeArenaDecor() {
  for (const l of lights) l.dispose();
  if (hemi) hemi.intensity = hemiI;
  hemi = null;
  lights = []; hook = fan = beacon = null;
}
