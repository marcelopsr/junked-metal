import * as B from "@babylonjs/core";

// Look "juguete real": PBR + cielo que da reflejos + sombras en cascada + postproceso.

let scene: B.Scene;
export let shadows: B.CascadedShadowGenerator;

export function setupRender(s: B.Scene, cam: B.Camera, low: boolean) {
  scene = s;
  scene.clearColor = B.Color4.FromHexString("#bfe3ffff");
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType = B.ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.imageProcessingConfiguration.exposure = 1.1;
  scene.imageProcessingConfiguration.contrast = 1.15;

  // Cielo: esfera con gradiente, capturada una vez en una sonda de reflejos
  const sky = B.MeshBuilder.CreateSphere("sky", { diameter: 1200, segments: 16, sideOrientation: B.Mesh.BACKSIDE }, scene);
  const skyMat = new B.StandardMaterial("skyMat", scene);
  skyMat.disableLighting = true;
  skyMat.emissiveTexture = canvasTex(256, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#3d8bd9"); g.addColorStop(0.45, "#a8d4ff"); g.addColorStop(0.52, "#f2f0e6"); g.addColorStop(1, "#7a8f5a");
    c.fillStyle = g; c.fillRect(0, 0, 256, 256);
  });
  sky.material = skyMat;
  sky.infiniteDistance = true;
  sky.isPickable = false;
  const probe = new B.ReflectionProbe("probe", 128, scene);
  probe.renderList!.push(sky);
  probe.refreshRate = B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  scene.environmentTexture = probe.cubeTexture;
  scene.environmentIntensity = 0.9;

  const hemi = new B.HemisphericLight("hemi", new B.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.35;
  hemi.groundColor = B.Color3.FromHexString("#5d6b3a");
  const sun = new B.DirectionalLight("sun", new B.Vector3(-0.45, -1, 0.35).normalize(), scene);
  sun.intensity = 3.2;
  sun.diffuse = B.Color3.FromHexString("#fff4e0");
  shadows = new B.CascadedShadowGenerator(low ? 1024 : 2048, sun);
  shadows.numCascades = low ? 2 : 3;
  shadows.shadowMaxZ = 90;
  shadows.lambda = 0.85;
  shadows.stabilizeCascades = true;
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = low ? B.ShadowGenerator.QUALITY_LOW : B.ShadowGenerator.QUALITY_MEDIUM;
  shadows.bias = 0.004;
  shadows.normalBias = 0.02;

  const pipe = new B.DefaultRenderingPipeline("pipe", true, scene, [cam]);
  pipe.fxaaEnabled = true;
  pipe.bloomEnabled = true;
  pipe.bloomThreshold = 0.9;
  pipe.bloomWeight = 0.25;
  pipe.bloomKernel = 48;
    pipe.sharpenEnabled = !low;
  setupUpscaler(cam, low);

  // Sin estilización (ver docs/ART_DIRECTION.md): solo post técnico.
}

// ---------- Materiales ----------
const mats = new Map<string, B.PBRMaterial>();
export type MatOpts = { color: string; rough?: number; metal?: number; tex?: B.Texture; emissive?: string; alpha?: number };

export function pbr(key: string, o: MatOpts) {
  let m = mats.get(key);
  if (m) return m;
  m = new B.PBRMaterial(key, scene);
  m.albedoColor = B.Color3.FromHexString(o.color).toLinearSpace();
  m.roughness = o.rough ?? 0.5;
  m.metallic = o.metal ?? 0;
  if (o.tex) m.albedoTexture = o.tex;
  if (o.emissive) m.emissiveColor = B.Color3.FromHexString(o.emissive);
  if (o.alpha !== undefined) m.alpha = o.alpha;
  m.realTimeFiltering = true;
  m.realTimeFilteringQuality = B.Constants.TEXTURE_FILTERING_QUALITY_LOW;
  mats.set(key, m);
  return m;
}

// Paleta de materiales de "juguete"
export const M = {
  plastic: (c: string) => pbr("pl" + c, { color: c, rough: 0.32 }),
  matte: (c: string) => pbr("mt" + c, { color: c, rough: 0.8 }),
  rubber: () => pbr("rubber", { color: "#1c1c1c", rough: 0.92 }),
  metal: (c = "#c9ccd1") => pbr("me" + c, { color: c, rough: 0.28, metal: 1 }),
  glass: () => pbr("glass", { color: "#1a2530", rough: 0.05, alpha: 0.75 }),
  glow: (c: string) => pbr("gl" + c, { color: c, rough: 0.4, emissive: c }),
};

// ---------- Texturas procedurales ----------
export function canvasTex(size: number, draw: (c: CanvasRenderingContext2D, s: number) => void, repeat = 1) {
  const t = new B.DynamicTexture("tex", size, scene, true);
  draw(t.getContext() as unknown as CanvasRenderingContext2D, size);
  t.update();
  t.wrapU = t.wrapV = B.Texture.WRAP_ADDRESSMODE;
  t.uScale = t.vScale = repeat;
  t.anisotropicFilteringLevel = 8;
  return t;
}

const rnd = Math.random;
const noise = (c: CanvasRenderingContext2D, s: number, base: string, cols: string[], n: number, r: number) => {
  c.fillStyle = base; c.fillRect(0, 0, s, s);
  for (let i = 0; i < n; i++) { c.fillStyle = cols[(rnd() * cols.length) | 0]; c.globalAlpha = 0.25 + rnd() * 0.5; c.fillRect(rnd() * s, rnd() * s, 1 + rnd() * r, 1 + rnd() * r); }
  c.globalAlpha = 1;
};

export const TEX = {
  grass: () => canvasTex(512, (c, s) => {
    noise(c, s, "#5c8a32", ["#4a7a28", "#6fa03c", "#3f6b22", "#7db048"], 9000, 3);
    for (let i = 0; i < 2500; i++) { c.strokeStyle = rnd() < 0.5 ? "#86b852" : "#3d6620"; c.globalAlpha = 0.5; c.beginPath(); const x = rnd() * s, y = rnd() * s; c.moveTo(x, y); c.lineTo(x + (rnd() - 0.5) * 4, y - 4 - rnd() * 6); c.stroke(); }
    c.globalAlpha = 1;
  }, 30),
  dirt: () => canvasTex(512, (c, s) => noise(c, s, "#7a5a3a", ["#5e4329", "#8f6b45", "#a07a52", "#4a3420"], 14000, 4), 8),
  tiles: () => canvasTex(512, (c, s) => {
    const n = 4, w = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const l = 45 + rnd() * 10;
      c.fillStyle = `hsl(18, 55%, ${l}%)`; c.fillRect(i * w, j * w, w, w);
      for (let k = 0; k < 300; k++) { c.fillStyle = `hsla(18, 50%, ${l + (rnd() - 0.5) * 16}%, .5)`; c.fillRect(i * w + rnd() * w, j * w + rnd() * w, 2, 2); }
    }
    c.strokeStyle = "#cfc6b8"; c.lineWidth = 6;
    for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(i * w, 0); c.lineTo(i * w, s); c.stroke(); c.beginPath(); c.moveTo(0, i * w); c.lineTo(s, i * w); c.stroke(); }
  }, 6),
  wood: () => canvasTex(256, (c, s) => {
    c.fillStyle = "#a0703f"; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 60; i++) { c.strokeStyle = rnd() < 0.5 ? "#7d5430" : "#b88452"; c.globalAlpha = 0.4; c.lineWidth = 1 + rnd() * 2; c.beginPath(); const y = rnd() * s; c.moveTo(0, y); c.bezierCurveTo(s / 3, y + (rnd() - 0.5) * 12, (2 * s) / 3, y + (rnd() - 0.5) * 12, s, y); c.stroke(); }
    c.globalAlpha = 1;
  }),
  bark: () => canvasTex(256, (c, s) => {
    c.fillStyle = "#5a4030"; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 90; i++) { c.strokeStyle = rnd() < 0.5 ? "#3b2a1e" : "#6e5140"; c.lineWidth = 2 + rnd() * 4; c.beginPath(); const x = rnd() * s; c.moveTo(x, 0); c.lineTo(x + (rnd() - 0.5) * 20, s); c.stroke(); }
  }, 2),
  stone: () => canvasTex(256, (c, s) => noise(c, s, "#8a8a85", ["#6f6f6a", "#a3a39c", "#5c5c58"], 6000, 3)),
  // Punto suave para partículas
  dot: () => canvasTex(64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "#fff"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }),
};

// ---------- Escalado: AMD FSR 1 (open source, incluido en Babylon) + resolución dinámica ----------
// Renderiza a menos píxeles y reescala con el filtro EASU/RCAS de FSR. Si el FPS cae,
// sube el factor (menos resolución interna); si sobra, lo baja.
export let fsr: B.FSR1RenderingPipeline | null = null;
export const QUALITY = { ultra: 1, calidad: 1.3, equilibrado: 1.5, rendimiento: 1.8 } as const;
export type Quality = keyof typeof QUALITY | "auto";
let quality: Quality = "auto";

function setupUpscaler(cam: B.Camera, low: boolean) {
  const p = new B.FSR1RenderingPipeline("fsr", scene, [cam]);
  if (!p.isSupported) { p.dispose(); return; }
  fsr = p;
  fsr.scaleFactor = low ? QUALITY.rendimiento : QUALITY.calidad;
  fsr.sharpnessStops = 0.2;
  let frames = 0, acc = 0;
  scene.onAfterRenderObservable.add(() => {
    if (quality !== "auto" || !fsr) return;
    acc += scene.getEngine().getDeltaTime(); frames++;
    if (acc < 1500) return;
    const fps = (frames * 1000) / acc;
    frames = acc = 0;
    if (fps < 50) fsr.scaleFactor = Math.min(2, fsr.scaleFactor + 0.15);
    else if (fps > 58 && fsr.scaleFactor > 1) fsr.scaleFactor = Math.max(1, fsr.scaleFactor - 0.1);
  });
}

export function setQuality(q: Quality) {
  quality = q;
  if (!fsr) return;
  if (q !== "auto") fsr.scaleFactor = QUALITY[q];
}
