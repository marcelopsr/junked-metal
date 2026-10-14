import { launch, open } from "../../../scripts/lib/browser.mjs";
const b = await launch({ perf: true });
try {
  const p = await open(b, "?mute&seed=3", process.argv[2] || "pc", { freeze: true });
  console.log(JSON.stringify(await p.evaluate(() => { window.__play(3); window.__god(); window.__sim(300);
    const s = window.__scene, e = s.getEngine(), gl = e._gl, px = new Uint8Array(4); const out = [];
    let comp = 0; const eff0 = Object.keys(e._compiledEffects || {}).length;
    for (let blk = 0; blk < 12; blk++) { const c = [], t = []; for (let i = 0; i < 50; i++) { const t0 = performance.now(); window.__tick(1); const m = performance.now(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); c.push(m - t0); t.push(performance.now() - t0); }
      c.sort((a, b) => a - b); t.sort((a, b) => a - b); out.push({ cuadros: `${blk * 50}-${blk * 50 + 49}`, cpuMed: +c[25].toFixed(1), msMed: +t[25].toFixed(1), msMax: +t[49].toFixed(1), efectos: Object.keys(e._compiledEffects || {}).length }); }
    return { eff0, out }; }), null, 0));
} finally { await b.close(); }
