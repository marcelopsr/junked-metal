// A/B dentro de la misma página (investigación perf 2026-10-13; no versionar). Cambios solo en memoria del navegador, no en el código.
import { launch, open } from "../../../scripts/lib/browser.mjs";
const vp = process.argv[2] || "pc", q = process.argv[3] || "?mute&seed=3", mode = process.argv[4] || "llena";
const b = await launch({ perf: true });
try {
  const p = await open(b, q, vp, { freeze: true });
  if (mode === "llena") await p.evaluate(() => { window.__play(3); window.__god(); window.__sim(300); });
  else await p.waitForFunction(() => window.__info?.().state === "play" && window.__info().enemies > 50, null, { timeout: 120000 });
  await p.evaluate(() => { window.__tick(45); const gl = window.__scene.getEngine()._gl, px = new Uint8Array(4); for (let i = 0; i < 400; i++) { window.__tick(1); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } });
  const out = await p.evaluate(() => {
    const s = window.__scene, e = s.getEngine(), gl = e._gl, px = new Uint8Array(4), sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const med = (v) => [...v].sort((a, b) => a - b)[v.length >> 1];
    const run = (n = 60) => { for (let i = 0; i < 10; i++) window.__tick(1); sync(); const t = [], c = [], act = []; let a0;
      const o1 = s.onBeforeActiveMeshesEvaluationObservable.add(() => a0 = performance.now()), o2 = s.onAfterActiveMeshesEvaluationObservable.add(() => act.push(performance.now() - a0));
      for (let i = 0; i < n; i++) { const t0 = performance.now(); window.__tick(1); const m = performance.now(); sync(); c.push(m - t0); t.push(performance.now() - t0); }
      s.onBeforeActiveMeshesEvaluationObservable.remove(o1); s.onAfterActiveMeshesEvaluationObservable.remove(o2);
      const d0 = e._drawCalls.current; window.__tick(1); return { ms: med(t), cpu: med(c), act: med(act), draws: e._drawCalls.current - d0 }; };
    let frozen = [];
    const snap = () => new Map(s.meshes.map((m) => [m, m.getWorldMatrix().asArray().join()]));
    const C = {
      base: [() => {}, () => {}],
      freezeStatic: [() => { const a = snap(); window.__tick(30); const b2 = snap(); frozen = s.meshes.filter((m) => m.isEnabled() && !m.isWorldMatrixFrozen && a.get(m) === b2.get(m)); frozen.forEach((m) => m.freezeWorldMatrix()); }, () => { frozen.forEach((m) => m.unfreezeWorldMatrix()); frozen = []; }],
      noGlow: [() => s.effectLayers.forEach((l) => l.isEnabled = false), () => s.effectLayers.forEach((l) => l.isEnabled = true)],
      noShadow: [() => s.lights.forEach((l) => l.shadowEnabled = false), () => s.lights.forEach((l) => l.shadowEnabled = true)],

    };
    const res = {};
    for (let rep = 0; rep < 5; rep++) for (const k of Object.keys(C)) { C[k][0](); const r = run(); C[k][1](); (res[k] ??= []).push(r); }
    const sum = {}; for (const k in res) sum[k] = { ms: med(res[k].map((x) => x.ms)), cpu: med(res[k].map((x) => x.cpu)), act: med(res[k].map((x) => x.act)), draws: res[k][0].draws, msReps: res[k].map((x) => +x.ms.toFixed(2)) };
    return { enemies: window.__info().enemies, frozen: frozen.length, sum };
  });
  console.log(vp, mode, JSON.stringify(out, null, 1));
} finally { await b.close(); }
