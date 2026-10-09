// Cierre de la partida: cámara lenta (la cronometra main.ts) y foto final con marco de polaroid en la pantalla de resultados.
// Técnica de la cámara lenta: no se graba nada; al morir o ganar el mundo sigue vivo pero a un ritmo menor (física, bichos, partículas y
// lluvia escalados) mientras la cámara orbita y se acerca al auto. Costo = cero memoria extra; ver `main.ts` (outroTick).
import "./replay.css";
import type { AbstractEngine } from "@babylonjs/core";
import { ctl } from "./input";

const $ = (id: string) => document.getElementById(id)!;
export const OUTRO_S = 5; // segundos reales en cámara lenta (equivalen a ~1 s de partida)
export const OUTRO_GUARD = 0.8; // los primeros 0,8 s no se puede saltar: las teclas de manejo todavía están apretadas
export const OUTRO_SNAP = 0.5; // instante (s) en que se toma la foto: explosión ya visible, cámara casi sin moverse

/** Escala de tiempo en el segundo t de la cámara lenta: cae rápido de 1 a 0,2 y se queda ahí. */
export const slowScale = (t: number) => 0.2 + 0.8 * Math.max(0, 1 - t / 0.4) ** 2;

const SKIP = { keys: "CUALQUIER TECLA SALTA", pad: "CUALQUIER BOTÓN SALTA", touch: "TOCAR LA PANTALLA SALTA" };
/** Texto de "cómo saltar" según el último control usado (también lo usa la intro). */
export const skipHint = () => SKIP[ctl];
export function outroUi(on: boolean, stat = "") {
  $("outro").classList.toggle("hidden", !on);
  if (!on) return;
  $("outroSkip").textContent = skipHint();
  const s = $("outroStat");
  s.textContent = stat;
  s.classList.toggle("hidden", !stat);
}

/** Línea breve bajo el aviso de salto (tiempo, bajas, nivel, pico de manejo, evoluciones). */
export function outroStatLine(o: { time: string; kills: number; level: number; drive: number; evos: string[] }) {
  const drv = o.drive > 1.05 ? ` · manejo ×${o.drive.toFixed(1)}` : "";
  const evo = o.evos.length ? ` · ${o.evos.join(" · ")}` : "";
  return `${o.time} · ${o.kills} ${o.kills === 1 ? "baja" : "bajas"} · NV ${o.level}${drv}${evo}`;
}

// ---------- Foto final ----------
let raw: HTMLCanvasElement | null = null;
/** Pide copiar el próximo cuadro dibujado (el búfer del canvas WebGL solo se puede leer al terminar el cuadro). */
export function snap(engine: AbstractEngine) {
  raw = null;
  engine.onEndFrameObservable.addOnce(() => {
    const c = engine.getRenderingCanvas();
    if (!c || !c.width) return;
    const k = document.createElement("canvas");
    k.width = c.width; k.height = c.height;
    k.getContext("2d")!.drawImage(c, 0, 0);
    raw = k;
  });
}

let photoUrl = "";
export type PhotoInfo = { zone: string; time: string; kills: number; car: string; win: boolean };
/** Arma la polaroid con la última foto y la muestra en los resultados; sin foto (pruebas con __sim) no muestra nada. */
export async function showPhoto(i: PhotoInfo) {
  const fig = $("overPhoto");
  fig.classList.add("hidden");
  if (!raw) return;
  const src = raw;
  raw = null;
  await document.fonts.ready;
  // Recorte 4:3 centrado (pantallas verticales: lo más ancho que se pueda hasta 4:5); sin suavizado: queda el píxel del render
  const ar = Math.min(4 / 3, Math.max(0.8, src.width / src.height));
  const cw = Math.min(src.width, Math.round(src.height * ar)), ch = Math.min(src.height, Math.round(src.width / ar));
  const k = cw < 480 ? 2 : 1, pw = cw * k, ph = ch * k, pad = Math.round(pw * 0.045), foot = Math.round(ph * 0.3);
  const c = document.createElement("canvas");
  c.width = pw + pad * 2; c.height = ph + pad + foot;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  // Papel envejecido (nada de blanco puro): beige apagado, motas y bordes más oscuros
  g.fillStyle = "#cfc8b0"; g.fillRect(0, 0, c.width, c.height);
  let s = 20261009;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let n = 0; n < 700; n++) { g.fillStyle = r() < 0.5 ? "#b8b098" : "#dcd5bd"; g.globalAlpha = 0.5; g.fillRect(r() * c.width, r() * c.height, 1 + (r() * 2) | 0, 1); }
  g.globalAlpha = 1;
  const edge = g.createRadialGradient(c.width / 2, c.height / 2, c.height * 0.35, c.width / 2, c.height / 2, c.height * 0.8);
  edge.addColorStop(0, "#0000"); edge.addColorStop(1, "#4a432c66");
  g.fillStyle = edge; g.fillRect(0, 0, c.width, c.height);
  // Foto + hundido sutil del marco
  g.drawImage(src, (src.width - cw) / 2, (src.height - ch) / 2, cw, ch, pad, pad, pw, ph);
  g.strokeStyle = "#2a2618"; g.lineWidth = 2; g.strokeRect(pad - 1, pad - 1, pw + 2, ph + 2);
  // Pie rotulado en Rajdhani: zona y tiempo, bajas y auto, resultado y fecha
  const ink = "#1b2418", u = pw / 800;
  g.fillStyle = ink; g.textBaseline = "alphabetic";
  const y0 = pad + ph + foot * 0.32;
  g.font = `700 ${Math.round(34 * u)}px Rajdhani, sans-serif`; g.textAlign = "left"; g.fillText(i.zone.toUpperCase(), pad, y0);
  g.textAlign = "right"; g.fillText(i.time, pad + pw, y0);
  g.textAlign = "left"; g.font = `700 ${Math.round(50 * u)}px Rajdhani, sans-serif`;
  g.fillText(`${i.kills} ${i.kills === 1 ? "BAJA" : "BAJAS"} · ${i.car.toUpperCase()}`, pad, y0 + 52 * u);
  g.fillStyle = "#4d4c38"; g.font = `600 ${Math.round(30 * u)}px Rajdhani, sans-serif`;
  g.fillText(`${i.win ? "VICTORIA" : "FIN DE LA PARTIDA"} · JUNKED METAL`, pad, y0 + 92 * u);
  g.save();
  g.translate(pad + pw - Math.round(135 * u), y0 + Math.round(64 * u));
  g.rotate(-0.1);
  const stCol = i.win ? "#1f6f3a" : "#9a2c2c", stTxt = i.win ? "INSPECCIÓN · VICTORIA" : "CHASIS SINIESTRADO";
  g.font = `700 ${Math.round(22 * u)}px Rajdhani, sans-serif`;
  const sw = Math.round(g.measureText(stTxt).width + 24 * u), sh = Math.round(34 * u);
  g.strokeStyle = stCol; g.lineWidth = Math.max(2, Math.round(3 * u));
  g.strokeRect(-sw / 2, -sh / 2, sw, sh);
  g.lineWidth = Math.max(1, Math.round(1.2 * u));
  g.strokeRect(-sw / 2 + 4 * u, -sh / 2 + 4 * u, sw - 8 * u, sh - 8 * u);
  g.fillStyle = stCol; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(stTxt, 0, Math.round(1 * u));
  g.restore();
  photoUrl = c.toDataURL("image/png");
  ($("overPhotoImg") as HTMLImageElement).src = photoUrl;
  fig.classList.remove("hidden");
}

$("overPhotoBtn").addEventListener("click", () => {
  if (!photoUrl) return;
  const a = document.createElement("a");
  a.href = photoUrl;
  a.download = `junked-metal-${new Date().toLocaleDateString("sv")}.png`;
  a.click();
});
