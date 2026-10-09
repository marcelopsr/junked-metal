import * as B from "@babylonjs/core";

// Look retro (Lethal Company / Buckshot Roulette, pero luminoso): render a baja resolución con píxeles visibles,
// (historia: el look retro ya no existe; hoy el juego es cartoon limpio y las perillas de LOOK quedan para la luz).

let scene: B.Scene;
export let shadows: B.CascadedShadowGenerator;
// Perillas del look: valores vivos que el modo lab (?lab, solo dev) cambia con __look({...}) sin recompilar.
export const LOOK = { snap: 1, lampI: 17.5, glowI: 2.35, cone: 1.28, fogMul: 0.92, ambMul: 1.55, moonMul: 0.62, exposure: 0.88 };
const ramp = [B.Color3.Black(), B.Color3.Gray(), B.Color3.White()];
type Clim = Parameters<typeof applyClimate>[0];
let clim: Clim | null = null;

export let lamp: B.SpotLight, glow: B.PointLight; // exportadas: los menús (menuscene.ts) las ubican a mano
let sun: B.DirectionalLight, hemi: B.HemisphericLight, skyTex: B.DynamicTexture, probe: B.ReflectionProbe;

function paintSky(c4: [string, string, string, string]) {
  const c = skyTex.getContext() as unknown as CanvasRenderingContext2D;
  const g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, c4[0]); g.addColorStop(0.45, c4[1]); g.addColorStop(0.52, c4[2]); g.addColorStop(1, c4[3]);
  c.fillStyle = g; c.fillRect(0, 0, 256, 256);
  skyTex.update();
}

// Clima de la partida: sol, cielo, luz ambiente, exposición y reflejos (la sonda se vuelve a capturar)
// Rebote de noche: tierra cálida apagada en vez de casi negro. Las caras de abajo (bajos del auto, panzas de los bichos) quedan
// legibles y con tinte, sin sombra negra pura; el contraste lo sigue poniendo el faro (único foco duro). Costo: cero.
const NIGHT_GROUND = "#1c1812";
export function applyClimate(k: { sun: [number, number, number]; sunColor: string; sunI: number; hemiI: number; sky: [string, string, string, string]; exposure: number; fog: number; ramp: [string, string, string]; day?: boolean; amb?: string; ground?: string }) {
  lampK = k.day ? 0.08 : 1;
  k.ramp.forEach((h, i) => ramp[i].copyFrom(B.Color3.FromHexString(h)));
  sun.direction = new B.Vector3(...k.sun).normalize();
  sun.diffuse = B.Color3.FromHexString(k.sunColor);
  clim = k;
  sun.intensity = k.sunI * LOOK.moonMul;
  hemi.intensity = k.hemiI * LOOK.ambMul;
  hemi.diffuse = B.Color3.FromHexString(k.amb ?? (k.day ? "#eef4e0" : k.sky[1])); // de día el ambiente es casi blanco: el cielo azul teñía las sombras de índigo
  hemi.groundColor = B.Color3.FromHexString(k.ground ?? (k.day ? "#7a9a5a" : NIGHT_GROUND)); // rebote del pasto: las sombras de día no quedan azul marino
  paintSky(k.sky);
  scene.clearColor = B.Color4.FromHexString(k.sky[1] + "ff");
  scene.imageProcessingConfiguration.exposure = k.exposure * LOOK.exposure * cur.bright;
  scene.fogColor = B.Color3.FromHexString(k.sky[1]);
  scene.fogDensity = k.fog * LOOK.fogMul;
  probe.refreshRate = B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
}

export function setupRender(s: B.Scene, cam: B.Camera, low: boolean) {
  scene = s;
  scene.clearColor = B.Color4.FromHexString("#0a101cff");
  scene.fogMode = B.Scene.FOGMODE_EXP2;
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType = B.ImageProcessingConfiguration.TONEMAPPING_STANDARD;
  scene.imageProcessingConfiguration.exposure = 1.1;
  scene.imageProcessingConfiguration.contrast = 1.15;

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
  if (!low) { const gl = glowL = new B.GlowLayer("bloom", scene, { mainTextureRatio: 0.75, blurKernelSize: 24 }); gl.intensity = 0.35; gl.addExcludedMesh(sky);
    // El mapa de brillo redibujaba TODA la escena (lo opaco en negro, para tapar halos): ~35-45 % de los draws. Ahora entra lo emisivo y, como tapa,
    // solo lo opaco grande (paredes, casas, gabinete). ponytail: lo opaco chico (autos, props) ya no tapa halos detrás; si se nota, bajar GLOW_TAPA.
    const GLOW_TAPA = 4; // radio (m) desde el que una malla opaca sigue tapando el brillo
    (gl as unknown as { _thinEffectLayer: { _canRenderMesh(m: B.AbstractMesh, mat: B.Material): boolean } })._thinEffectLayer._canRenderMesh = (m, mat) => {
      const e = mat as B.PBRMaterial;
      return !e.emissiveColor || !!e.emissiveTexture || (e.emissiveColor.r + e.emissiveColor.g + e.emissiveColor.b) * (e.emissiveIntensity ?? 1) > 0
        || m.getBoundingInfo().boundingSphere.radiusWorld > GLOW_TAPA;
    }; }
  probe = new B.ReflectionProbe("probe", 128, scene);
  probe.renderList!.push(sky);
  probe.refreshRate = B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  scene.environmentTexture = probe.cubeTexture;
  scene.environmentIntensity = 0.65; // algo más de Fresnel del cielo: un filo frío en los contornos separa siluetas del pasto (sin luz extra: ya hay 4 por material)

  hemi = new B.HemisphericLight("hemi", new B.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.14;
  hemi.groundColor = B.Color3.FromHexString(NIGHT_GROUND);
  sun = new B.DirectionalLight("sun", new B.Vector3(-0.45, -1, 0.35).normalize(), scene);
  sun.intensity = 0.5;
  sun.diffuse = B.Color3.FromHexString("#7f9bd6");
  // ponytail: Babylon pide 2 cascadas como mínimo; con 1 el shader anda igual (bucle sobre SHADOWCSMNUM_CASCADES). Si una versión lo rompe, volver a 2 en "low"/"mid".
  B.CascadedShadowGenerator.MIN_CASCADES_COUNT = 1;
  shadows = new B.CascadedShadowGenerator(SHADOW.mid[0], sun); // applyGfx (menu.ts) lo reajusta al nivel guardado
  shadows.numCascades = SHADOW.mid[1];
  shadows.shadowMaxZ = SHADOW.mid[3];
  shadows.lambda = 0.85;
  shadows.stabilizeCascades = true;
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = SHADOW.mid[2];
  shadows.darkness = 0.5; // sombras suaves: que den volumen sin ensuciar el suelo
  shadows.bias = 0.004;
  shadows.normalBias = 0.02;
  scene.onBeforeRenderObservable.add(() => { const rt = shadows.getShadowMap(); if (rt && rt.getCustomRenderList !== shadowList) rt.getCustomRenderList = shadowList; }); // applyGfx recrea el mapa al cambiar el nivel: se vuelve a enganchar

  // Faro del auto: el único foco duro de la escena. Sin sombras propias (ponytail: sombras solo de la luna; si hace falta, ShadowGenerator sobre el spot).
  lamp = new B.SpotLight("lamp", B.Vector3.Zero(), B.Vector3.Forward(), 1.15, 8, scene);
  lamp.diffuse = B.Color3.FromHexString("#ffe9c2");
  lamp.falloffType = B.Light.FALLOFF_STANDARD;
  lamp.range = 70;
  lamp.intensity = LOOK.lampI;
  glow = new B.PointLight("glow", B.Vector3.Zero(), scene);
  glow.diffuse = B.Color3.FromHexString("#ff8a3d");
  glow.falloffType = B.Light.FALLOFF_STANDARD;
  glow.range = 14;
  glow.intensity = 2.2;

  mainCam = cam;
  const pipe = pipeline = new B.DefaultRenderingPipeline("pipe", true, scene, [cam]);
  // El tono (exposición, contraste, curvas) lo aplica el pipeline como post-proceso. Los materiales apuntan a una configuración propia que nunca cambia:
  // con la de la escena, cada cambio de exposición (fundido del menú, clima, brillo) marcaba sucias todas las submallas (300-900 ms por transición)
  const matIP = new B.ImageProcessingConfiguration(); matIP.applyByPostProcess = true;
  const detach = (m: B.Material) => { if ("imageProcessingConfiguration" in m) (m as B.PBRMaterial).imageProcessingConfiguration = matIP; };
  scene.materials.forEach(detach); scene.onNewMaterialAddedObservable.add(detach);
  pipe.fxaaEnabled = false; pipe.samples = 1; // el suavizado de bordes lo elige el jugador (Configuración → Imagen → applyGfx)
  pipe.bloomEnabled = true;
  pipe.bloomThreshold = 0.95;
  pipe.bloomWeight = 0.18; // brillo discreto: antes velaba todo el día
  pipe.bloomKernel = 32;
  setupPixels(cam, low);
}

// Lista de proyectores de CADA cascada: Babylon dibuja todos los de la lista en todas las cascadas, aunque estén lejos o escondidos (y las plantillas de y = -500
// siempre, tengan instancias o no). Acá cada cascada recibe solo lo que cae dentro de su caja ortográfica (esfera del volumen contra x/y de la matriz de la cascada,
// con holgura para el filtrado PCF y la mezcla entre cascadas: lo que queda fuera lo recortaría la GPU igual, así que el mapa de sombras sale idéntico)
// y las plantillas solo si tienen alguna instancia viva. Con instancias, la esfera de la fuente no sirve (las instancias están en cualquier lado): se dejan pasar.
// ponytail: esfera del volumen (conservadora); las mallas muy largas (setos, calle, casa) casi nunca se podan. Techo: probar la AABB mundial si pesaran en las cascadas.
const castList: B.AbstractMesh[] = [];
const SHADOW_PAD = 0.12;
function shadowList(layer: number, list: B.Nullable<readonly B.AbstractMesh[]>, len: number) {
  const M4 = shadows.getCascadeTransformMatrix(layer);
  if (!list || !M4) return null;
  const mt = M4.m;
  const sx = Math.hypot(mt[0], mt[4], mt[8]), sy = Math.hypot(mt[1], mt[5], mt[9]);
  castList.length = 0;
  for (let i = 0; i < len; i++) {
    const m = list[i];
    if (m.isDisposed() || !m.isEnabled() || !m.isVisible) continue;
    if (m.position.y < -400) { // plantilla: la fuente está escondida, solo importan sus instancias
      const ins = (m as B.Mesh).instances;
      if (!ins?.length || !ins.some((x) => x.isEnabled() && x.isVisible)) continue;
    } else if (!(m as B.Mesh).hasInstances && !(m as B.Mesh).thinInstanceCount) {
      const b = m.getBoundingInfo().boundingSphere, c = b.centerWorld, r = b.radiusWorld;
      if (Math.abs(c.x * mt[0] + c.y * mt[4] + c.z * mt[8] + mt[12]) > 1 + SHADOW_PAD + r * sx || Math.abs(c.x * mt[1] + c.y * mt[5] + c.z * mt[9] + mt[13]) > 1 + SHADOW_PAD + r * sy) continue;
    }
    castList.push(m);
  }
  return castList;
}

export function look(p: Partial<typeof LOOK>) {
  Object.assign(LOOK, p);
  lamp.intensity = LOOK.lampI; glow.intensity = LOOK.glowI; lamp.angle = LOOK.cone;
  if (clim) applyClimate(clim);
  return { ...LOOK };
}

// El faro y el resplandor siguen al auto
let flare = 0, lampK = 1, hurtK = 0;
const glowBase = B.Color3.FromHexString("#ff8a3d"), HURT_C = B.Color3.FromHexString("#ff2418");
export function setLamp(pos: B.Vector3, fwd: B.Vector3, boost = false, dt = 0) {
  // Turbo: el faro destella y abre el cono; vuelve suave al soltar
  flare += ((boost ? 1 : 0) - flare) * Math.min(1, dt * (boost ? 14 : 4));
  lamp.intensity = LOOK.lampI * lampK * (1 + flare * 1.2);
  lamp.angle = LOOK.cone + flare * 0.45;
  // Golpe recibido (glitchHit): el resplandor sobre el auto destella rojo y se apaga en ~0,2 s. Se suma a lampK para que se vea también de día.
  hurtK = Math.max(0, hurtK - dt * 5);
  glow.intensity = LOOK.glowI * (lampK + hurtK * 1.6);
  B.Color3.LerpToRef(glowBase, HURT_C, hurtK, glow.diffuse);
  lamp.position.set(pos.x, pos.y + 1.2, pos.z);
  lamp.direction.set(fwd.x, -0.28, fwd.z).normalize();
  glow.position.set(pos.x, pos.y + 2.2, pos.z);
}

// ---------- Menús (menuscene.ts) ----------
/** Luz de lámpara cálida en los menús (true) o faro del auto de la partida (false; el auto vuelve a pintar el foco con su faro en carModel). */
export function menuLights(on: boolean) {
  lamp.diffuse = B.Color3.FromHexString(on ? "#ffc890" : "#ffe9c2");
  glowBase.copyFrom(B.Color3.FromHexString(on ? "#ffb27a" : "#ff8a3d")); glow.diffuse.copyFrom(glowBase);
  glow.range = on ? 45 : 14;
}
/** Profundidad de campo de los menús: foco a `focus` unidades de la cámara (0 = apagada). `k` = desenfoque del fondo lejano (0..1).
 *  En táctil el desenfoque es el barato (Low). Al apagarla se libera el depth renderer: en partida no cuesta nada. */
export function setDof(focus: number, k = 0.7) {
  const on = focus > 0;
  if (pipeline.depthOfFieldEnabled !== on) {
    if (on) pipeline.depthOfFieldBlurLevel = lowQ ? B.DepthOfFieldEffectBlurLevel.Low : B.DepthOfFieldEffectBlurLevel.Medium;
    pipeline.depthOfFieldEnabled = on;
    if (!on) scene.disableDepthRenderer(mainCam);
  }
  if (!on) return;
  // CoC de Babylon: k = apertura · focal / (foco − focal), con apertura = lente / f. Se despeja la focal para que el desenfoque no dependa de la distancia.
  const d = pipeline.depthOfField, F = focus * 1000, ap = d.lensSize / d.fStop;
  d.focusDistance = F;
  d.focalLength = (k * F) / (ap + k);
}

/** Daño recibido: destello rojo breve del resplandor del auto (lo apaga setLamp). main.ts no lo llama en modo calmo ni en simulación. */
export function glitchHit() { hurtK = 1; }

/** Apagón: escala la luna y el ambiente (1 = normal, 0 = negro; el faro no se toca). */
export function setDark(k: number) {
  if (!clim) return;
  sun.intensity = clim.sunI * LOOK.moonMul * k;
  hemi.intensity = clim.hemiI * LOOK.ambMul * k;
}

// ---------- Imagen (Configuración → Imagen) ----------
// Cuatro ejes independientes: resolución (escala manual o FSR 1), calidad (sombras, detalle, texturas, filtrado), suavizado y pantalla (brillo, gamma).
// Todo entra por applyGfx(): compara con lo último aplicado y solo toca lo que cambió (se llama en cada cambio de cualquier opción).
export type Fsr = "off" | "ultra" | "calidad" | "equilibrado" | "rendimiento";
/** Factor de reducción de AMD por modo: se renderiza a 1/factor de la resolución nativa y EASU sube a nativa (Ultra 77%, Calidad 67%, Equilibrado 59%, Rendimiento 50%). */
export const FSR_K = { ultra: 1.3, calidad: 1.5, equilibrado: 1.7, rendimiento: 2 } as const;
export const FSR_NAME = { ultra: "Ultra calidad", calidad: "Calidad", equilibrado: "Equilibrado", rendimiento: "Rendimiento" } as const;
export type AA = "none" | "fxaa" | "msaa2" | "msaa4" | "msaa8";
export type ShadowQ = "off" | "low" | "mid" | "high";
export type Detail = "bajo" | "medio" | "alto" | "ultra";
/** scaler: "simple" usa la escala manual; "ia" dibuja al 50% y agranda con WebSR (solo WebGPU, si no vale "simple"); "fsr" usa el modo `fsr` (nunca "off" en el guardado). sharpen: una sola nitidez (RCAS con FSR, sharpen común sin FSR). */
export type Gfx = { scaler: "simple" | "fsr" | "ia"; scale: number; fsr: Exclude<Fsr, "off">; aa: AA; sharpen: number; shadowQ: ShadowQ; detail: Detail; texRes: number; aniso: number; bloom: boolean; bright: number; gamma: number };

/** Sombras del sol: [mapa, cascadas, filtrado, distancia]. Con 1 cascada el mapa cubre solo lo cercano al auto. "off" apaga la luz de sombras. */
const SHADOW = { low: [128, 1, B.ShadowGenerator.QUALITY_LOW, 28], mid: [256, 1, B.ShadowGenerator.QUALITY_LOW, 36], high: [1024, 2, B.ShadowGenerator.QUALITY_MEDIUM, 80] } as const;
/** Detalle del mundo: densidad de pasto (x el patio base; pide partida nueva), partículas y restos (x), y distancia de dibujo de props (0 = sin límite). */
export const DETAIL = { bajo: { grass: 0.33, fx: 0.35, draw: 95 }, medio: { grass: 0.66, fx: 0.65, draw: 145 }, alto: { grass: 1, fx: 1, draw: 220 }, ultra: { grass: 1.5, fx: 1.4, draw: 0 } } as const;
/** Preajustes de Calidad: fijan de una vez los cinco ajustes de abajo. */
export const PRESETS = {
  bajo: { shadowQ: "off", detail: "bajo", texRes: 128, aniso: 2, bloom: false },
  medio: { shadowQ: "mid", detail: "medio", texRes: 256, aniso: 8, bloom: true }, // el piso se ve casi siempre rasante: con 2 se lavaba a 15 m
  alto: { shadowQ: "mid", detail: "alto", texRes: 512, aniso: 16, bloom: true },
  ultra: { shadowQ: "high", detail: "ultra", texRes: 512, aniso: 16, bloom: true },
} as const satisfies Record<string, Pick<Gfx, "shadowQ" | "detail" | "texRes" | "aniso" | "bloom">>;
export type Preset = keyof typeof PRESETS;
/** Preajuste que coincide exacto con los ajustes, o "custom". */
export const presetOf = (g: Pick<Gfx, "shadowQ" | "detail" | "texRes" | "aniso" | "bloom">): Preset | "custom" => (Object.keys(PRESETS) as Preset[]).find((k) => (Object.keys(PRESETS[k]) as (keyof typeof PRESETS.bajo)[]).every((f) => PRESETS[k][f] === g[f])) ?? "custom";

/** Lo que leen otros módulos: pasto y texturas se aplican al armar el mundo (world.ts), partículas al instante (fx.ts). */
export const G = { grass: DETAIL.medio.grass, fx: DETAIL.medio.fx, draw: DETAIL.medio.draw as number, texCap: 512 as number };
const cur: Gfx = { scaler: "simple", scale: 1, fsr: "calidad", aa: "none", sharpen: 0, shadowQ: "mid", detail: "medio", texRes: 256, aniso: 0, bloom: true, bright: 1, gamma: 1 }; // aniso 0: la primera vez siempre se aplica
let mainCam: B.Camera, pipeline: B.DefaultRenderingPipeline, lowQ = false;
let fsrP: B.FSR1RenderingPipeline | null = null, split: B.Camera | null = null;
let anisoHook: B.Nullable<B.Observer<B.BaseTexture>> = null, glowL: B.GlowLayer | null = null;
const cams = () => (split ? [mainCam, split] : [mainCam]);
/** MSAA que admite la tarjeta (1 = ninguno). */
export const maxMsaa = () => Math.max(1, scene.getEngine().getCaps().maxMSAASamples || 1);

/** La cadena de postproceso de la cámara es FSR → "pipe": FSR necesita ser la primera etapa (recibe la escena a baja resolución). */
function chain(edit: () => void) {
  const m = scene.postProcessRenderPipelineManager;
  m.detachCamerasFromRenderPipeline("pipe", [mainCam]);
  edit();
  m.attachCamerasToRenderPipeline("pipe", [mainCam]);
}

/** FSR es una cadena de una sola cámara: en pantalla dividida (carrera de 2) se apagan y vale la escala manual. */
const fsrEff = (): Fsr => (split || cur.scaler !== "fsr" ? "off" : cur.fsr);
let fsrApplied: Fsr = "off", fxaaLoOn = false, fxaaLo: B.FxaaPostProcess | null = null;
/** WebSR: una sola cámara y motor WebGPU. */
const iaOn = () => cur.scaler === "ia" && !split && scene.getEngine().isWebGPU;
let iaApplied = false;
function applyScale() {
  const e = scene.getEngine(), ia = iaOn();
  e.setHardwareScalingLevel(1 / ((devicePixelRatio || 1) * (ia ? 0.5 : fsrEff() === "off" ? cur.scale : 1)));
  if (ia !== iaApplied) { iaApplied = ia; void import("./websr").then((m) => m.setSR(ia, e)); } // FSR: el canvas es nativo y la escena se dibuja a 1/FSR_K dentro del pipeline
}

export function applyGfx(g: Gfx) {
  if (!scene) return;
  const eng = scene.getEngine();
  const was = { ...cur };
  Object.assign(cur, g);
  // Resolución: FSR reemplaza a la escala manual
  const eff = fsrEff();
  // FSR 1 es solo espacial: como pide AMD, el suavizado va ANTES del agrandado EASU. MSAA va en la escena baja (fsrP.samples o el FXAA);
  // FXAA es una etapa propia a 1/FSR_K pegada antes de FSR (el orden en la cámara es el orden de creación: se rehacen las dos juntas).
  const lo = eff !== "off" && cur.aa === "fxaa";
  if (eff !== fsrApplied || lo !== fxaaLoOn || (eff !== "off" && FSR_K[eff] !== fsrP?.scaleFactor)) {
    fsrApplied = eff; fxaaLoOn = lo;
    chain(() => {
      fxaaLo?.dispose(mainCam); fxaaLo = null; fsrP?.dispose(); fsrP = null;
      if (eff === "off") return;
      if (lo) fxaaLo = new B.FxaaPostProcess("fxaaLo", 1 / FSR_K[eff], mainCam);
      fsrP = new B.FSR1RenderingPipeline("fsr", scene, cams()); fsrP.scaleFactor = FSR_K[eff];
    });
  }
  applyScale();
  // Una sola nitidez: con FSR la hace RCAS (0 paradas = máxima), sin FSR el sharpen del DefaultRenderingPipeline
  if (fsrP) fsrP.sharpnessStops = 2 * (1 - cur.sharpen);
  // Suavizado: FXAA y MSAA van en "pipe" (o MSAA en la escena baja de FSR)
  const msaa = cur.aa.startsWith("msaa") ? Math.min(+cur.aa.slice(4), maxMsaa()) : 1;
  pipeline.fxaaEnabled = cur.aa === "fxaa" && !fsrP;
  pipeline.samples = fsrP ? 1 : msaa;
  if (fsrP) fsrP.samples = msaa;
  if (fxaaLo) fxaaLo.samples = 1;
  pipeline.sharpenEnabled = !fsrP && cur.sharpen > 0;
  pipeline.sharpen.edgeAmount = cur.sharpen * 0.8;
  // Calidad
  const sh = SHADOW[cur.shadowQ === "off" ? "low" : cur.shadowQ];
  sun.shadowEnabled = cur.shadowQ !== "off";
  if (cur.shadowQ !== "off" && cur.shadowQ !== was.shadowQ) { // recrear el mapa es caro: solo si cambió el nivel
    shadows.numCascades = sh[1]; shadows.mapSize = sh[0]; shadows.filteringQuality = sh[2]; shadows.shadowMaxZ = sh[3];
  }
  pipeline.bloomEnabled = cur.bloom;
  if (glowL) glowL.isEnabled = cur.bloom;
  const d = DETAIL[cur.detail];
  Object.assign(G, { grass: d.grass, fx: d.fx, draw: d.draw, texCap: cur.texRes });
  if (cur.aniso !== was.aniso) {
    const lvl = Math.min(cur.aniso, eng.getCaps().maxAnisotropy || 1);
    for (const t of scene.textures) if (!t.isRenderTarget) t.anisotropicFilteringLevel = lvl;
    anisoHook ??= scene.onNewTextureAddedObservable.add((t) => { if (!t.isRenderTarget) t.anisotropicFilteringLevel = Math.min(cur.aniso, eng.getCaps().maxAnisotropy || 1); });
  }
  // Pantalla: el brillo escala la exposición; el gamma sube o baja los medios tonos (curva de color de Babylon, sin tocar negros ni blancos)
  if (cur.bright !== was.bright && clim) scene.imageProcessingConfiguration.exposure = clim.exposure * LOOK.exposure * cur.bright;
  if (cur.gamma !== was.gamma || (cur.gamma !== 1 && !scene.imageProcessingConfiguration.colorCurvesEnabled)) {
    const ip = scene.imageProcessingConfiguration;
    ip.colorCurvesEnabled = cur.gamma !== 1;
    if (cur.gamma !== 1) {
      ip.colorCurves ??= new B.ColorCurves();
      ip.colorCurves.midtonesExposure = (cur.gamma - 1) * 90;
      ip.colorCurves.midtonesDensity = (1 - cur.gamma) * 30;
    }
  }
}

/** Resolución real de dibujo y modo, para las estadísticas en pantalla. */
export function gfxInfo() {
  const e = scene.getEngine(), w = e.getRenderWidth(), h = e.getRenderHeight(), k = fsrP ? FSR_K[fsrApplied as Exclude<Fsr, "off">] : 1;
  return { w: Math.round(w / k), h: Math.round(h / k), nw: w, nh: h, mode: iaApplied ? "IA (WebSR) 50%" : fsrP ? `FSR ${FSR_NAME[fsrApplied as Exclude<Fsr, "off">]} ${Math.round(100 / k)}%` : `escala ${Math.round(cur.scale * 100)}%` };
}

function setupPixels(cam: B.Camera, low: boolean) {
  lowQ = low;
  scene.getEngine().getRenderingCanvas()!.style.imageRendering = "auto"; // escalas bajo 100%: el navegador suaviza el salto a pantalla
  addEventListener("resize", applyScale);
  applyScale();
}

/** Pantalla dividida (carrera para 2): la segunda cámara comparte el postproceso "pipe" (addCamera: el pipeline se reconstruye solo con las cámaras que conoce); FSR se apaga mientras dure (fsrEff). */
export function setSplit(cam2: B.Camera | null, on: boolean) {
  if (on && cam2) {
    if (split && split !== cam2) pipeline.removeCamera(split);
    split = cam2;
    applyGfx(cur);
    pipeline.addCamera(cam2);
  } else if (cam2 ?? split) {
    pipeline.removeCamera((cam2 ?? split)!);
    split = null;
    applyGfx(cur);
  }
}

// ---------- Materiales ----------
const mats = new Map<string, B.PBRMaterial>();
export type MatOpts = { coat?: number; color: string; rough?: number; metal?: number; tex?: B.Texture; emissive?: string; alpha?: number };

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
  if (o.coat) { m.clearCoat.isEnabled = true; m.clearCoat.intensity = o.coat; m.clearCoat.roughness = 0.08; } // barniz de plástico: reflejo suave del cielo
  snapMat(m);
  mats.set(key, m);
  return m;
}

/** Mismo acabado que pbr() para materiales armados fuera (Folded 2.5D, folded.ts): vértices pixelados + filtrado del cielo. */
export function snapMat(m: B.PBRMaterial) {
  new SnapPlugin(m);
  m.realTimeFiltering = true;
  m.realTimeFilteringQuality = B.Constants.TEXTURE_FILTERING_QUALITY_LOW;
  return m;
}

// Temblor PS1: los vértices se ajustan a la grilla de píxeles internos (LOOK.snap = tamaño de celda en píxeles; 0 = apagado)
class SnapPlugin extends B.MaterialPluginBase {
  constructor(m: B.Material) { super(m, "Snap", 300, { SNAP: false }); this._enable(true); }
  getClassName() { return "SnapPlugin"; }
  prepareDefines(d: B.MaterialDefines) { d["SNAP"] = true; }
  isCompatible() { return true; } // GLSL (WebGL) y WGSL (WebGPU)
  getUniforms(lang?: number) { return { ubo: [{ name: "snapGrid", size: 2, type: "vec2" }], vertex: lang === 1 ? "uniform snapGrid: vec2f;" : "uniform vec2 snapGrid;" }; }
  bindForSubMesh(ubo: B.UniformBuffer) {
    // Grilla de la resolución de dibujo (con FSR, la baja)
    const e = scene.getEngine(), k = LOOK.snap > 0 ? 0.5 / LOOK.snap : 1e5, f = fsrP ? FSR_K[fsrApplied as Exclude<Fsr, "off">] : 1;
    ubo.updateFloat2("snapGrid", (e.getRenderWidth() / f) * k, (e.getRenderHeight() / f) * k);
  }
  getCustomCode(type: string, lang?: number): Record<string, string> {
    // Trama tipo screen-door: una malla con visibility < 1 (p. ej. lo que tapa al auto) descarta medio damero de píxeles
    if (lang === 1) return type === "vertex"
      ? { CUSTOM_VERTEX_MAIN_END: "{ let p = vertexOutputs.position; vertexOutputs.position = vec4f(floor(p.xy / p.w * uniforms.snapGrid + .5) / uniforms.snapGrid * p.w, p.zw); }" }
      : { CUSTOM_FRAGMENT_MAIN_BEGIN: "if (mesh.visibility < 1. && (floor(fragmentInputs.position.x) + floor(fragmentInputs.position.y)) % 2. < 1.) { discard; }" };
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
  plastic: (c: string) => pbr("pl" + c, { color: c, rough: 0.32, coat: 0.5 }),
  matte: (c: string) => pbr("mt" + c, { color: c, rough: 0.8 }),
  rubber: () => pbr("rubber", { color: "#0c0d10", rough: 0.96 }),
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
  const px = Math.min(size, G.texCap); // Texturas 128/256/512 (Configuración → Imagen): solo achica las de 512 (suelo, tierra, baldosas)
  const t = new B.DynamicTexture("tex", px, scene, true, B.Texture.TRILINEAR_SAMPLINGMODE);
  (t.getContext() as unknown as CanvasRenderingContext2D).drawImage(big, 0, 0, px, px);
  t.update();
  t.wrapU = t.wrapV = B.Texture.WRAP_ADDRESSMODE;
  t.uScale = t.vScale = repeat;
  return t;
}

// ---------- Superficies: textura macro (color, sin repetir en el patio) + mapa de detalle (grano, relieve y brillo a escala de cm) ----------
// Babylon detailMap: R = albedo (128 neutro), G = normal Y, B = rugosidad (128 neutra), A = normal X. RawTexture: sin premultiplicar del canvas.
// Cada perfil dibuja una altura 0..1 tileable; de ahí salen las tres cosas, así el brillo y el relieve siguen a la forma (no ruido suelto).
export type Surf = "grass" | "soil" | "concrete" | "steel" | "brick" | "leaf" | "asphalt";
const DS = 128;
const SURF: Record<Surf, { h: (put: (x: number, y: number, v: number) => void, r: () => number) => void; alb: number; rough: number; bump: number }> = {
  // Matas de hojas cortas con inclinación común (el pasto peinado por el corte), alturas distintas: claras arriba y más mate abajo
  grass: { alb: 0.55, rough: 0.35, bump: 0.9, h: (put, r) => {
    for (let i = 0; i < 700; i++) {
      const x = r() * DS, y = r() * DS, L = 3 + r() * 6, lean = 0.25 + (r() - 0.5) * 0.6, top = 0.5 + r() * 0.5;
      for (let t = 0; t <= L; t++) put(x + lean * t, y - t, top * (0.35 + 0.65 * (t / L)));
    }
  } },
  // Terrones y piedritas sueltas sobre tierra apisonada: las piedras brillan un poco más que la tierra
  soil: { alb: 0.6, rough: 0.4, bump: 1, h: (put, r) => {
    for (let i = 0; i < 1400; i++) put(r() * DS, r() * DS, 0.15 + r() * 0.2);
    for (let i = 0; i < 70; i++) { const x = r() * DS, y = r() * DS, rr = 1 + r() * 2.2; for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) { const d = Math.hypot(a, b) / rr; if (d < 1) put(x + a, y + b, 0.5 + 0.5 * Math.sqrt(1 - d * d)); } }
  } },
  // Poros del fragüe y alguna fisura fina que camina: el cemento se lee como colado, no como gris liso
  concrete: { alb: 0.45, rough: 0.3, bump: 0.6, h: (put, r) => {
    for (let i = 0; i < 2600; i++) put(r() * DS, r() * DS, 0.55 + (r() - 0.5) * 0.2);
    for (let i = 0; i < 160; i++) put(r() * DS, r() * DS, 0.1);
    for (let c = 0; c < 3; c++) { let x = r() * DS, y = r() * DS, a = r() * 6.28; for (let t = 0; t < 40; t++) { a += (r() - 0.5) * 0.8; x += Math.cos(a); y += Math.sin(a); put(x, y, 0.05); } }
  } },
  // Chapa cepillada: rayas largas en una dirección y alguna rayadura cruzada (el uso, no el ruido)
  steel: { alb: 0.35, rough: 0.6, bump: 0.35, h: (put, r) => {
    for (let i = 0; i < 90; i++) { const y = r() * DS, v = 0.4 + r() * 0.3, x0 = r() * DS, L = 20 + r() * 90; for (let t = 0; t < L; t++) put(x0 + t, y, v); }
    for (let i = 0; i < 6; i++) { let x = r() * DS, y = r() * DS; const a = r() * 6.28; for (let t = 0; t < 14; t++) put((x += Math.cos(a)), (y += Math.sin(a)), 0.9); }
  } },
  // Follaje: hojas ovaladas superpuestas, cada una con su lomo (la de arriba tapa a la de abajo): el arbusto deja de ser un globo liso
  leaf: { alb: 0.9, rough: 0.5, bump: 1, h: (put, r) => {
    for (let i = 0; i < 420; i++) { const x = r() * DS, y = r() * DS, a = r() * 6.28, L = 4 + r() * 4, top = 0.3 + r() * 0.7, c = Math.cos(a), s = Math.sin(a);
      for (let u = -L; u <= L; u++) for (let v = -2; v <= 2; v++) { const e = (u / L) ** 2 + (v / 2.2) ** 2; if (e < 1) put(x + u * c - v * s, y + u * s + v * c, top * (0.6 + 0.4 * Math.sqrt(1 - e))); } }
  } },
  // Asfalto: piedra partida del agregado (claras, con brillo de canto pulido por las ruedas) sobre ligante oscuro y mate
  asphalt: { alb: 0.7, rough: 0.6, bump: 0.7, h: (put, r) => {
    for (let i = 0; i < 900; i++) { const x = r() * DS, y = r() * DS, v = 0.45 + r() * 0.5, n = 1 + ((r() * 3) | 0); for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) put(x + a, y + b, v - (a + b) * 0.06); }
  } },
  // Ladrillo: cara áspera y bordes comidos (las juntas las pone el albedo)
  brick: { alb: 0.4, rough: 0.35, bump: 0.7, h: (put, r) => { for (let i = 0; i < 3000; i++) put(r() * DS, r() * DS, 0.5 + (r() - 0.5) * 0.5); } },
};
const detCache = new Map<string, B.RawTexture>();
function detailTex(kind: Surf, repeat: number | [number, number]) {
  const key = kind + repeat;
  let t = detCache.get(key);
  if (t && t.getScene() === scene && t.getInternalTexture()) return t;
  const p = SURF[kind], h = new Float32Array(DS * DS).fill(0.3), w = (v: number) => ((Math.round(v) % DS) + DS) % DS;
  let sd = kind.length * 977 + 13; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647); // misma semilla siempre: el piso no cambia entre cargas
  p.h((x, y, v) => { const i = w(y) * DS + w(x); h[i] = kind === "leaf" ? v : Math.max(h[i], v); }, r);
  const d = new Uint8Array(DS * DS * 4), at = (x: number, y: number) => h[w(y) * DS + w(x)];
  for (let y = 0; y < DS; y++) for (let x = 0; x < DS; x++) {
    const v = at(x, y), nx = (at(x - 1, y) - at(x + 1, y)) * 2, ny = (at(x, y - 1) - at(x, y + 1)) * 2, o = (y * DS + x) * 4;
    d[o] = 128 + (v - 0.4) * 160 * p.alb; d[o + 1] = 128 + Math.max(-1, Math.min(1, ny)) * 127; d[o + 2] = 128 - (v - 0.4) * 160 * p.rough; d[o + 3] = 128 + Math.max(-1, Math.min(1, nx)) * 127;
  }
  t = B.RawTexture.CreateRGBATexture(d, DS, DS, scene, true, false, B.Texture.TRILINEAR_SAMPLINGMODE);
  t.wrapU = t.wrapV = B.Texture.WRAP_ADDRESSMODE; [t.uScale, t.vScale] = typeof repeat === "number" ? [repeat, repeat] : repeat;
  detCache.set(key, t);
  return t;
}
/** Suma grano, relieve y brillo de un perfil de superficie. `repeat` = veces que se repite el detalle sobre las UV 0..1 de la malla (apuntar a que 1 texel ≈ 1 píxel a la distancia de juego). */
export function surface(m: B.PBRMaterial, kind: Surf, repeat: number | [number, number], k = 1) {
  m.detailMap.texture = detailTex(kind, repeat);
  m.detailMap.isEnabled = true;
  m.detailMap.diffuseBlendLevel = 0.9 * k; m.detailMap.bumpLevel = SURF[kind].bump * k; m.detailMap.roughnessBlendLevel = 0.6 * k;
  return m;
}

const rnd = Math.random;
const noise = (c: CanvasRenderingContext2D, s: number, base: string, cols: string[], n: number, r: number) => {
  c.fillStyle = base; c.fillRect(0, 0, s, s);
  for (let i = 0; i < n; i++) { c.fillStyle = cols[(rnd() * cols.length) | 0]; c.globalAlpha = 0.25 + rnd() * 0.5; c.fillRect(rnd() * s, rnd() * s, 1 + rnd() * r, 1 + rnd() * r); }
  c.globalAlpha = 1;
};

export const TEX = {
  grass: () => canvasTex(512, (c, s) => {
    noise(c, s, "#628f3a", ["#5a8634", "#6c9c42", "#547f30", "#74a64a"], 2500, 5);
    // Parches de pasto seco y tierra pelada: el patio deja de ser un solo verde
    for (let i = 0; i < 24; i++) {
      const x = rnd() * s, y = rnd() * s, r = 30 + rnd() * 80, dry = rnd() < 0.85;
      // Se dibuja también corrido ±s: el parche que cruza el borde reaparece del otro lado y las baldosas no se notan
      for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) {
        const g = c.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
        g.addColorStop(0, dry ? "rgba(176,170,96,.3)" : "rgba(130,110,70,.2)"); g.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = g; c.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
      }
    }
    for (let i = 0; i < 300; i++) { c.strokeStyle = rnd() < 0.5 ? "#a0d860" : "#4f8a28"; c.globalAlpha = 0.3; c.beginPath(); const x = rnd() * s, y = rnd() * s; c.moveTo(x, y); c.lineTo(x + (rnd() - 0.5) * 4, y - 4 - rnd() * 6); c.stroke(); }
    c.globalAlpha = 1;
  }, 14),
  // Macro del césped: una pasada cubre ~90 m (más que medio patio): manchas grandes con intención (pisado, seco al sol, verde a la sombra
  // y al borde de lo húmedo) y nada de grano fino, que lo pone surface("grass"). Sin repetición a la vista.
  grassMacro: () => canvasTex(512, (c, s) => {
    c.fillStyle = "#5f8c38"; c.fillRect(0, 0, s, s);
    const blob = (n: number, r0: number, r1: number, col: string, a: number) => { for (let i = 0; i < n; i++) {
      const x = rnd() * s, y = rnd() * s, r = r0 + rnd() * (r1 - r0), sx = 0.6 + rnd() * 0.8;
      for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) {
        c.save(); c.translate(x + dx, y + dy); c.rotate(rnd() * 3.14); c.scale(sx, 1 / sx);
        const g = c.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, col.replace("A", String(a))); g.addColorStop(1, col.replace("A", "0"));
        c.fillStyle = g; c.fillRect(-r, -r, r * 2, r * 2); c.restore();
      }
    } };
    blob(14, 60, 140, "rgba(40,92,30,A)", 0.45);   // verde profundo: sombra y humedad
    blob(16, 40, 110, "rgba(170,165,80,A)", 0.4);  // pasto quemado
    blob(26, 12, 40, "rgba(120,98,60,A)", 0.35);   // tierra pelada, chica
    blob(60, 4, 14, "rgba(118,170,70,A)", 0.3);    // matas más tiernas
  }, 1),
  dirt: () => canvasTex(512, (c, s) => noise(c, s, "#7a5a3a", ["#5e4329", "#8f6b45", "#a07a52", "#4a3420"], 14000, 4), 8),
  tiles: () => canvasTex(512, (c, s) => {
    const n = 4, w = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const l = 45 + rnd() * 10;
      c.fillStyle = `hsl(20, 38%, ${l + 6}%)`; c.fillRect(i * w, j * w, w, w);
      for (let k = 0; k < 300; k++) { c.fillStyle = `hsla(18, 50%, ${l + (rnd() - 0.5) * 16}%, .5)`; c.fillRect(i * w + rnd() * w, j * w + rnd() * w, 2, 2); }
    }
    c.strokeStyle = "#b9ab9a"; c.lineWidth = 3;
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
