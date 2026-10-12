// FPS real (tiempo real, bucle de dibujo vivo) en celular con CPU x4 por preset. Uso: node scripts/perf-cel.mjs [--secs 30] [--presets bajo,medio,alto,ultra]
// npm run perf:cel. Dentro de la partida (patio, god, avanzando con W) muestrea rAF-deltas, draw calls y mallas activas cada 0.5 s.
import { parseArgs } from "node:util";
import { launch, open } from "./lib/browser.mjs";
const { values: a } = parseArgs({ options: { secs: { type: "string", default: "30" }, presets: { type: "string", default: "bajo,medio,alto,ultra" }, cpu: { type: "string", default: "4" } } });
const browser = await launch({ perf: true });
const q = (v, p) => [...v].sort((x, y) => x - y)[Math.min(v.length - 1, Math.floor(v.length * p))];
try {
  for (const preset of a.presets.split(",")) {
    const page = await open(browser, "?mute&seed=1", "cel");
    const cdp = await page.ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(a.cpu) });
    await page.evaluate((p) => { window.__cfg({ preset: p }); window.__play(1); window.__god(); }, preset);
    await page.keyboard.down("w");
    await page.waitForTimeout(3000); // calentamiento
    const r = await page.evaluate((secs) => new Promise((res) => {
      const sc = window.__scene, e = sc.getEngine(), dts = [], act = [], dr = [], tr = [];
      let last = performance.now(), t0 = last, nx = last, d0 = e._drawCalls.current;
      const f = () => {
        const n = performance.now(); dts.push(n - last); last = n;
        if (n >= nx) { nx = n + 500; act.push(sc.getActiveMeshes().length); dr.push(e._drawCalls.current - d0); tr.push(sc.getActiveIndices() / 3); }
        d0 = e._drawCalls.current;
        if (n - t0 < secs * 1000) requestAnimationFrame(f); else res({ dts, act, dr, tr, engFps: e.getFps(), info: window.__info?.() });
      };
      requestAnimationFrame(f);
    }), Number(a.secs));
    const fps = r.dts.map((d) => 1000 / d), avg = (v) => v.reduce((s, x) => s + x, 0) / v.length;
    console.log(JSON.stringify({ preset, cpu: a.cpu, frames: r.dts.length, fpsAvg: +(r.dts.length / (r.dts.reduce((s, x) => s + x, 0) / 1000)).toFixed(1), fpsP5: +q(fps, 0.05).toFixed(1), msP95: +q(r.dts, 0.95).toFixed(1), drawsPerFrame: Math.round(avg(r.dr)), activeMeshes: Math.round(avg(r.act)), tris: Math.round(avg(r.tr)), errs: page.logs.length }));
    await page.ctx.close();
  }
} finally { await browser.close(); }
