// cuenta mallas cuya matriz de mundo no cambia en 60 cuadros y no está congelada (investigación perf; no versionar)
import { launch, open } from "../../../scripts/lib/browser.mjs";
const b = await launch({ perf: true });
try {
  const p = await open(b, "?mute&seed=3", process.argv[2] || "pc", { freeze: true });
  await p.evaluate(() => { window.__play(3); window.__god(); window.__sim(300); });
  await p.evaluate(() => window.__tick(45));
  console.log(JSON.stringify(await p.evaluate(() => {
    const s = window.__scene, snap = () => new Map(s.meshes.map((m) => [m, m.getWorldMatrix().asArray().join()]));
    const a = snap(); window.__tick(60); const bb = snap();
    let enabled = 0, staticUnfrozen = 0, staticInst = 0, staticMesh = 0, frozen = 0, moving = 0, inst = 0, thin = 0, srcHidden = 0, pickable = 0, lods = 0;
    for (const m of s.meshes) {
      if (!m.isEnabled()) continue; enabled++;
      if (m.isPickable) pickable++;
      if (m.isWorldMatrixFrozen) { frozen++; continue; }
      if (m instanceof Object && m.sourceMesh) inst++;
      if (m.thinInstanceCount) thin++;
      if (m.getLODLevels?.().length) lods++;
      if (a.get(m) === bb.get(m)) { staticUnfrozen++; m.sourceMesh ? staticInst++ : staticMesh++; } else moving++;
    }
    const e = s.getEngine();
    return { total: s.meshes.length, enabled, frozen, staticUnfrozen, staticInst, staticMesh, moving, inst, thin, pickable, lodsMeshes: lods, active: s.getActiveMeshes().length, hwScale: e.getHardwareScalingLevel(), rw: e.getRenderWidth(), rh: e.getRenderHeight(), webgl: e.webGLVersion, name: e.name, shadowMap: s.lights.map((l) => l.getShadowGenerator?.()?.getShadowMap()?.getSize()).filter(Boolean), postFx: s.postProcessRenderPipelineManager?.supportedPipelines?.map((x) => x.name), effectLayers: s.effectLayers?.map((x) => x.name + ":" + x.getClassName()) };
  })));
} finally { await b.close(); }
