import * as B from "@babylonjs/core";
import { DESAFIOS } from "../free_challenges";
import { scene, undo } from "./common";
import type { Barrio } from "./libre";

// Free Roam, PUNTOS DE CONTROL de los desafíos de tiempo (DESAFIOS[].cp): un aro de juguete parado sobre la pista, con número encima.
// Sin colisión. Instancias de tres plantillas de aro (tenue, normal, rayada amarillo/negro = la siguiente); main.ts llama a controlMarks().
// No es un barrio con centro propio (sin cartel ni radar: libre.ts lo filtra de LUGARES); solo se registra por el glob libre_*.ts.
type Marca = { id: string; i: number; tenue: B.InstancedMesh; normal: B.InstancedMesh; sig: B.InstancedMesh; num: B.Mesh };
let marcas: Marca[] = [];
let estado = "";

/** Muestra los aros del desafío en curso (`id`; el siguiente rayado, los pasados ocultos) y, fuera de uno, todos tenues. Barato: solo actúa si cambia. */
export function controlMarks(id: string | null, next: number) {
  const k = `${id}:${next}`;
  if (k === estado) return;
  estado = k;
  for (const m of marcas) {
    const act = m.id === id, sig = act && m.i === next, pasado = act && m.i < next;
    m.tenue.setEnabled(!act); m.normal.setEnabled(act && !sig && !pasado); m.sig.setEnabled(sig); m.num.setEnabled(act && !pasado);
  }
}

function build() {
  marcas = []; estado = "";
  const tex: B.DynamicTexture[] = [], mats: B.Material[] = [];
  const stripes = new B.DynamicTexture("ctrlRayas", { width: 64, height: 8 }, scene, true), g = stripes.getContext() as unknown as CanvasRenderingContext2D;
  g.fillStyle = "#f2c230"; g.fillRect(0, 0, 64, 8); g.fillStyle = "#1a1d22"; g.fillRect(0, 0, 16, 8); g.fillRect(32, 0, 16, 8); stripes.update();
  stripes.uScale = 6; stripes.wrapU = B.Texture.WRAP_ADDRESSMODE;
  const mat = (n: string, color: string, alpha = 1, t?: B.Texture) => {
    const m = new B.StandardMaterial(n, scene); m.diffuseColor = B.Color3.FromHexString(color); m.specularColor = B.Color3.Black(); m.emissiveColor = m.diffuseColor.scale(0.35);
    if (t) m.diffuseTexture = t; if (alpha < 1) m.alpha = alpha; mats.push(m); return m;
  };
  const tpl = (n: string, m: B.Material) => { const t = B.MeshBuilder.CreateTorus(n, { diameter: 8, thickness: 0.7, tessellation: 24 }, scene); t.material = m; t.isPickable = false; t.checkCollisions = false; t.isVisible = false; return t; };
  const tT = tpl("ctrlTenue", mat("ctrlTenueM", "#e53935", 0.25)), tN = tpl("ctrlNormal", mat("ctrlNormalM", "#e53935")), tS = tpl("ctrlSig", mat("ctrlSigM", "#ffffff", 1, stripes));
  for (const d of DESAFIOS) d.cp?.forEach(([x, z], i) => {
    const px = i ? d.cp![i - 1][0] : d.ax, pz = i ? d.cp![i - 1][1] : d.az, yaw = Math.atan2(x - px, z - pz); // el aro mira a la pista: eje en el sentido de la marcha
    const put = (t: B.Mesh) => { const m = t.createInstance(`${t.name}${d.id}${i}`); m.position.set(x, 4.35, z); m.rotation.set(Math.PI / 2, yaw, 0); m.isPickable = false; return m; };
    const dt = new B.DynamicTexture(`ctrlNum${d.id}${i}`, 128, scene, true), c = dt.getContext() as unknown as CanvasRenderingContext2D;
    c.fillStyle = "#f2c230"; c.beginPath(); c.arc(64, 64, 60, 0, Math.PI * 2); c.fill(); c.lineWidth = 8; c.strokeStyle = "#1a1d22"; c.stroke();
    c.font = "bold 90px 'Bebas Neue', Impact, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#1a1d22"; c.fillText(String(i + 1), 64, 70); dt.update();
    const sm = new B.StandardMaterial(`ctrlNumM${d.id}${i}`, scene); sm.emissiveTexture = dt; sm.disableLighting = true; sm.opacityTexture = dt; sm.useAlphaFromDiffuseTexture = false; tex.push(dt); mats.push(sm);
    const num = B.MeshBuilder.CreatePlane(`ctrlNumero${d.id}${i}`, { size: 3 }, scene);
    num.position.set(x, 9.4, z); num.billboardMode = B.Mesh.BILLBOARDMODE_Y; num.material = sm; num.isPickable = false; num.setEnabled(false);
    marcas.push({ id: d.id, i, tenue: put(tT), normal: put(tN), sig: put(tS), num });
  });
  controlMarks(null, 0);
  undo.push(() => { stripes.dispose(); tex.forEach((t) => t.dispose()); mats.forEach((m) => m.dispose()); marcas = []; estado = ""; });
}

export const barrio: Barrio = { id: "control", cx: 0, cz: 0, build };
