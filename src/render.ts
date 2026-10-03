import * as B from "@babylonjs/core";

// Look retro (Lethal Company / Buckshot Roulette, pero luminoso): render a baja resolución con píxeles visibles,
// texturas chicas sin filtrar, temblor PS1 suave, contornos de 1 px y un post retro con paleta propia por clima.

let scene: B.Scene;
export let shadows: B.CascadedShadowGenerator;
// Perillas del look: valores vivos que el modo lab (?lab, solo dev) cambia con __look({...}) sin recompilar.
export const LOOK = { levels: 32, grain: 0.04, scan: 0.06, vig: 1.05, desat: 0.8, ca: 0.03, pal: 0.35, outline: 0.55, snap: 1, lampI: 10, glowI: 2.2, cone: 1.15, fogMul: 1, ambMul: 1, moonMul: 1, exposure: 1 };
const ramp = [B.Color3.Black(), B.Color3.Gray(), B.Color3.White()];
type Clim = Parameters<typeof applyClimate>[0];
let clim: Clim | null = null;

let lamp: B.SpotLight, glow: B.PointLight;
let sun: B.DirectionalLight, hemi: B.HemisphericLight, skyTex: B.DynamicTexture, probe: B.ReflectionProbe;

function paintSky(c4: [string, string, string, string]) {
  const c = skyTex.getContext() as unknown as CanvasRenderingContext2D;
  const g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, c4[0]); g.addColorStop(0.45, c4[1]); g.addColorStop(0.52, c4[2]); g.addColorStop(1, c4[3]);
  c.fillStyle = g; c.fillRect(0, 0, 256, 256);
  skyTex.update();
}

// Clima de la partida: sol, cielo, luz ambiente, exposición y reflejos (la sonda se vuelve a capturar)
export function applyClimate(k: { sun: [number, number, number]; sunColor: string; sunI: number; hemiI: number; sky: [string, string, string, string]; exposure: number; fog: number; ramp: [string, string, string] }) {
  k.ramp.forEach((h, i) => ramp[i].copyFrom(B.Color3.FromHexString(h)));
  sun.direction = new B.Vector3(...k.sun).normalize();
  sun.diffuse = B.Color3.FromHexString(k.sunColor);
  clim = k;
  sun.intensity = k.sunI * LOOK.moonMul;
  hemi.intensity = k.hemiI * LOOK.ambMul;
  hemi.diffuse = B.Color3.FromHexString(k.sky[1]);
  paintSky(k.sky);
  scene.clearColor = B.Color4.FromHexString(k.sky[1] + "ff");
  scene.imageProcessingConfiguration.exposure = k.exposure * LOOK.exposure;
  scene.fogColor = B.Color3.FromHexString(k.sky[1]);
  scene.fogDensity = k.fog * LOOK.fogMul;
  probe.refreshRate = B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
}

export function setupRender(s: B.Scene, cam: B.Camera, low: boolean) {
  scene = s;
  scene.clearColor = B.Color4.FromHexString("#0a101cff");
  scene.fogMode = B.Scene.FOGMODE_EXP2;
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType = B.ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.imageProcessingConfiguration.exposure = 1.1;
  scene.imageProcessingConfiguration.contrast = 1.25;

  // Cielo: esfera con gradiente, capturada una vez en una sonda de reflejos
  const sky = B.MeshBuilder.CreateSphere("sky", { diameter: 1200, segments: 16, sideOrientation: B.Mesh.BACKSIDE }, scene);
  const skyMat = new B.StandardMaterial("skyMat", scene);
  skyMat.disableLighting = true;
  skyMat.fogEnabled = false;
  skyTex = new B.DynamicTexture("sky", 256, scene, true);
  paintSky(["#04060c", "#0a101c", "#111a2a", "#05070a"]);
  skyMat.emissiveTexture = skyTex;
  sky.material = skyMat;
  sky.infiniteDistance = true;
  sky.isPickable = false;
  // Bloom moderno sobre lo emisivo (faro, ojos, tuercas, ventanas); el cielo no. Fuera en táctil.
  if (!low) { const gl = new B.GlowLayer("bloom", scene, { mainTextureRatio: 0.5, blurKernelSize: 48 }); gl.intensity = 0.7; gl.addExcludedMesh(sky); }
  probe = new B.ReflectionProbe("probe", 128, scene);
  probe.renderList!.push(sky);
  probe.refreshRate = B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  scene.environmentTexture = probe.cubeTexture;
  scene.environmentIntensity = 0.35;

  hemi = new B.HemisphericLight("hemi", new B.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.14;
  hemi.groundColor = B.Color3.FromHexString("#0b0f0a");
  sun = new B.DirectionalLight("sun", new B.Vector3(-0.45, -1, 0.35).normalize(), scene);
  sun.intensity = 0.5;
  sun.diffuse = B.Color3.FromHexString("#7f9bd6");
  shadows = new B.CascadedShadowGenerator(low ? 1024 : 2048, sun);
  shadows.numCascades = low ? 2 : 3;
  shadows.shadowMaxZ = 90;
  shadows.lambda = 0.85;
  shadows.stabilizeCascades = true;
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = low ? B.ShadowGenerator.QUALITY_LOW : B.ShadowGenerator.QUALITY_MEDIUM;
  shadows.bias = 0.004;
  shadows.normalBias = 0.02;

  // Faro del auto: el único foco duro de la escena. Sin sombras propias (ponytail: sombras solo de la luna; si hace falta, ShadowGenerator sobre el spot).
  lamp = new B.SpotLight("lamp", B.Vector3.Zero(), B.Vector3.Forward(), 1.15, 6, scene);
  lamp.diffuse = B.Color3.FromHexString("#ffe9c2");
  lamp.falloffType = B.Light.FALLOFF_STANDARD;
  lamp.range = 70;
  lamp.intensity = LOOK.lampI;
  glow = new B.PointLight("glow", B.Vector3.Zero(), scene);
  glow.diffuse = B.Color3.FromHexString("#ff8a3d");
  glow.falloffType = B.Light.FALLOFF_STANDARD;
  glow.range = 14;
  glow.intensity = 2.2;

  const pipe = new B.DefaultRenderingPipeline("pipe", true, scene, [cam]);
  pipe.fxaaEnabled = false; // el borde duro es parte del look
  pipe.bloomEnabled = true;
  pipe.bloomThreshold = 0.8;
  pipe.bloomWeight = 0.35;
  pipe.bloomKernel = 32;
  setupPixels(cam, low);
}

export function look(p: Partial<typeof LOOK>) {
  Object.assign(LOOK, p);
  lamp.intensity = LOOK.lampI; glow.intensity = LOOK.glowI; lamp.angle = LOOK.cone;
  if (clim) applyClimate(clim);
  return { ...LOOK };
}

// El faro y el resplandor siguen al auto
let flare = 0;
export function setLamp(pos: B.Vector3, fwd: B.Vector3, boost = false, dt = 0) {
  // Turbo: el faro destella y abre el cono; vuelve suave al soltar
  flare += ((boost ? 1 : 0) - flare) * Math.min(1, dt * (boost ? 14 : 4));
  lamp.intensity = LOOK.lampI * (1 + flare * 1.2);
  lamp.angle = LOOK.cone + flare * 0.45;
  lamp.position.set(pos.x, pos.y + 1.2, pos.z);
  lamp.direction.set(fwd.x, -0.28, fwd.z).normalize();
  glow.position.set(pos.x, pos.y + 2.2, pos.z);
}

// ---------- Post retro: contornos por profundidad, paleta del clima, dither Bayer + cuantización, grano, scanlines, viñeta, aberración ----------
B.Effect.ShadersStore["retroFragmentShader"] = `
precision highp float;
varying vec2 vUV; uniform sampler2D textureSampler; uniform vec2 screen; uniform float t; uniform float glitch, levels, grain, scan, vig, desat, ca, pal, outline; uniform vec3 p0, p1, p2; uniform sampler2D depthSampler;
float b2(vec2 p) { p = floor(mod(p, 2.)); return mod(p.x * 2. + p.y * 3., 4.); }
float b4(vec2 p) { return (b2(p) * 4. + b2(floor(p / 2.))) / 16.; }
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 c = vUV - .5;
  float rr = dot(c, c);
  vec2 uv = vUV;
  // Glitch VHS al recibir daño: bandas horizontales corridas + más aberración
  float band = floor(vUV.y * 24. + t * 31.);
  uv.x += glitch * (h(vec2(band, floor(t * 20.))) - .5) * .06 * step(.6, h(vec2(band * 1.7, floor(t * 14.))));
  vec2 o = c * rr * ca + vec2(glitch * .012, 0.);
  vec3 col = vec3(texture2D(textureSampler, uv - o).r, texture2D(textureSampler, uv).g, texture2D(textureSampler, uv + o).b);
  float l = dot(col, vec3(.299, .587, .114));
  col = mix(vec3(l), col, desat);
  col = mix(col, l < .5 ? mix(p0, p1, l * 2.) : mix(p1, p2, l * 2. - 1.), pal);
  vec2 px = floor(vUV * screen), e = 1. / screen;
  float d = texture2D(depthSampler, vUV).r;
  float dn = min(min(texture2D(depthSampler, vUV + vec2(e.x, 0.)).r, texture2D(depthSampler, vUV - vec2(e.x, 0.)).r), min(texture2D(depthSampler, vUV + vec2(0., e.y)).r, texture2D(depthSampler, vUV - vec2(0., e.y)).r));
  col *= 1. - outline * step(.06, (d - dn) / max(d, 1e-4));
  col += (h(px + fract(t) * 97.) - .5) * grain;
  col *= 1. - scan * step(1.5, mod(px.y, 3.));
  col = floor(col * levels + b4(px)) / levels;
  col *= smoothstep(.95, .25, sqrt(rr) * vig);
  gl_FragColor = vec4(col, 1.);
}`;

let glitchAt = -1e9;
/** Dispara el glitch VHS (dura ~0,26 s). */
export function glitchHit() { glitchAt = performance.now(); }

/** Apagón: escala la luna y el ambiente (1 = normal, 0 = negro; el faro no se toca). */
export function setDark(k: number) {
  if (!clim) return;
  sun.intensity = clim.sunI * LOOK.moonMul * k;
  hemi.intensity = clim.hemiI * LOOK.ambMul * k;
}

// Render a baja resolución interna (altura objetivo) escalado sin filtrar. ponytail: altura fija por calidad, sin ajuste dinámico; la resolución baja ya es el ahorro.
export const QUALITY = { ultra: 720, calidad: 600, equilibrado: 480, rendimiento: 360 } as const;
export type Quality = keyof typeof QUALITY | "auto";
let target: number = QUALITY.calidad;
let depth: B.DepthRenderer;

function applyScale() {
  const e = scene.getEngine();
  e.setHardwareScalingLevel(Math.max(1, (e.getRenderingCanvas()!.clientHeight * (devicePixelRatio || 1)) / target));
}

let lowQ = false;
function setupPixels(cam: B.Camera, low: boolean) {
  lowQ = low;
  target = low ? QUALITY.equilibrado : QUALITY.calidad;
  // Profundidad lineal para los contornos; sin pasto (llenaría todo de bordes) ni cielo
  depth = scene.enableDepthRenderer(cam, false);
  depth.getDepthMap().renderListPredicate = (m) => m.name !== "tuft" && m.name !== "sky";
  if (low) LOOK.outline = 0;
  const pp = new B.PostProcess("retro", "retro", ["screen", "t", "glitch", "levels", "grain", "scan", "vig", "desat", "ca", "pal", "outline", "p0", "p1", "p2"], ["depthSampler"], 1, cam, B.Texture.NEAREST_SAMPLINGMODE);
  pp.onApply = (ef) => { ef.setFloat2("screen", pp.width, pp.height); ef.setFloat("t", performance.now() / 1000); ef.setFloat("glitch", Math.max(0, 1 - (performance.now() - glitchAt) / 260)); ef.setFloat("levels", LOOK.levels); ef.setFloat("grain", LOOK.grain); ef.setFloat("scan", LOOK.scan); ef.setFloat("vig", LOOK.vig); ef.setFloat("desat", LOOK.desat); ef.setFloat("ca", LOOK.ca); ef.setFloat("pal", LOOK.pal); ef.setFloat("outline", LOOK.outline);
    ef.setColor3("p0", ramp[0]); ef.setColor3("p1", ramp[1]); ef.setColor3("p2", ramp[2]); ef.setTexture("depthSampler", depth.getDepthMap()); };
  scene.getEngine().getRenderingCanvas()!.style.imageRendering = "pixelated";
  addEventListener("resize", applyScale);
  applyScale();
}

export function setQuality(q: Quality) {
  target = QUALITY[q === "auto" ? (lowQ ? "equilibrado" : "calidad") : q];
  applyScale();
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
  new SnapPlugin(m);
  m.realTimeFiltering = true;
  m.realTimeFilteringQuality = B.Constants.TEXTURE_FILTERING_QUALITY_LOW;
  mats.set(key, m);
  return m;
}

// Temblor PS1: los vértices se ajustan a la grilla de píxeles internos (LOOK.snap = tamaño de celda en píxeles; 0 = apagado)
class SnapPlugin extends B.MaterialPluginBase {
  constructor(m: B.Material) { super(m, "Snap", 300, { SNAP: false }); this._enable(true); }
  getClassName() { return "SnapPlugin"; }
  prepareDefines(d: B.MaterialDefines) { d["SNAP"] = true; }
  getUniforms() { return { ubo: [{ name: "snapGrid", size: 2, type: "vec2" }], vertex: "uniform vec2 snapGrid;" }; }
  bindForSubMesh(ubo: B.UniformBuffer) {
    const e = scene.getEngine(), k = LOOK.snap > 0 ? 0.5 / LOOK.snap : 1e5;
    ubo.updateFloat2("snapGrid", e.getRenderWidth() * k, e.getRenderHeight() * k);
  }
  getCustomCode(type: string): Record<string, string> {
    // Trama tipo screen-door: una malla con visibility < 1 (p. ej. lo que tapa al auto) descarta medio damero de píxeles
    return type === "vertex" ? { CUSTOM_VERTEX_MAIN_END: "gl_Position.xy = floor(gl_Position.xy / gl_Position.w * snapGrid + .5) / snapGrid * gl_Position.w;" }
      : { CUSTOM_FRAGMENT_MAIN_BEGIN: "if (visibility < 1. && mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 2.) < 1.) discard;" };
  }
}

// Lluvia: suelo y pasto más oscuros y brillantes (k 0 = seco .. 1 = empapado). Los valores secos se guardan la primera vez.
const dry = new Map<string, { r: number; c: B.Color3 }>();
export function wetGround(k: number) {
  for (const key of ["grass", "tuftMat", "tiles", "dirt"]) {
    const m = mats.get(key);
    if (!m) continue;
    let d = dry.get(key);
    if (!d) dry.set(key, (d = { r: m.roughness ?? 0.9, c: m.albedoColor.clone() }));
    m.roughness = d.r * (1 - 0.6 * k);
    d.c.scaleToRef(1 - 0.4 * k, m.albedoColor);
  }
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
// Se dibuja grande y se reduce a <=96 px: texels visibles, sin filtrar (look PS1)
export function canvasTex(size: number, draw: (c: CanvasRenderingContext2D, s: number) => void, repeat = 1) {
  const big = document.createElement("canvas");
  big.width = big.height = size;
  draw(big.getContext("2d")!, size);
  const px = Math.min(size, 96);
  const t = new B.DynamicTexture("tex", px, scene, true, B.Texture.NEAREST_NEAREST_MIPLINEAR);
  (t.getContext() as unknown as CanvasRenderingContext2D).drawImage(big, 0, 0, px, px);
  t.update();
  t.wrapU = t.wrapV = B.Texture.WRAP_ADDRESSMODE;
  t.uScale = t.vScale = repeat;
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
    // Parches de pasto seco y tierra pelada: el patio deja de ser un solo verde
    for (let i = 0; i < 14; i++) {
      const x = rnd() * s, y = rnd() * s, r = 20 + rnd() * 70, dry = rnd() < 0.6;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, dry ? "rgba(140,128,64,.75)" : "rgba(92,68,44,.85)"); g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 2500; i++) { c.strokeStyle = rnd() < 0.5 ? "#86b852" : "#3d6620"; c.globalAlpha = 0.5; c.beginPath(); const x = rnd() * s, y = rnd() * s; c.moveTo(x, y); c.lineTo(x + (rnd() - 0.5) * 4, y - 4 - rnd() * 6); c.stroke(); }
    c.globalAlpha = 1;
  }, 14),
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
