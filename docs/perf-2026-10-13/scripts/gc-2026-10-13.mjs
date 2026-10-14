import { launch, open } from "../../../scripts/lib/browser.mjs";
const b = await launch({ perf: true, args: ["--enable-precise-memory-info"] });
try {
  const p = await open(b, "?mute&seed=3", process.argv[2] || "pc", { freeze: true });
  console.log(JSON.stringify(await p.evaluate(() => { window.__play(3); window.__god(); window.__sim(300); window.__tick(60);
    const e = window.__scene.getEngine(), gl = e._gl, px = new Uint8Array(4); const fr = [];
    let h0 = performance.memory.usedJSHeapSize;
    for (let i = 0; i < 600; i++) { const n0 = Object.keys(e._compiledEffects || {}).length, t0 = performance.now(); window.__tick(1); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const t = performance.now() - t0, h = performance.memory.usedJSHeapSize; fr.push({ t, gc: h < h0 - 1e6, drop: (h0 - h) / 1048576, newFx: Object.keys(e._compiledEffects || {}).length - n0 }); h0 = h; }
    const sorted = fr.map((f) => f.t).sort((a, b) => a - b), med = sorted[300];
    const spikes = fr.filter((f) => f.t > 2 * med);
    const gcFrames = fr.filter((f) => f.gc);
    return { medMs: +med.toFixed(1), spikes: spikes.length, spikesConGC: spikes.filter((f) => f.gc).length, spikesConShaderNuevo: spikes.filter((f) => f.newFx > 0).length, cuadrosConGC: gcFrames.length, msMedioConGC: +(gcFrames.reduce((a, f) => a + f.t, 0) / Math.max(1, gcFrames.length)).toFixed(1), mbLiberadosPorGC: +(gcFrames.reduce((a, f) => a + f.drop, 0) / Math.max(1, gcFrames.length)).toFixed(1), peores: fr.map((f, i) => ({ i, ...f })).sort((a, b) => b.t - a.t).slice(0, 6).map((f) => `${f.i}:${f.t.toFixed(1)}ms gc=${f.gc} fx=${f.newFx}`) }; }), null, 1));
} finally { await b.close(); }
