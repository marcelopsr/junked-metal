// scripts/bench-check.mjs — Benchmark automatizado de LODs y Hordas en Chromium Metal
import assert from 'node:assert/strict';
import { launch, BASE, VIEWPORTS } from './lib/browser.mjs';

const browser = await launch({ perf: true });
const results = [];

try {
  const v = VIEWPORTS.pc;
  const ctx = await browser.newContext({ ...v, viewport: { width: v.width, height: v.height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(BASE + '/bench-lod.html?mute', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.__bench === 'function', {}, { timeout: 60000 });
  await page.evaluate(() => {
    window.__benchFreeze();
    window.__bench('lod1_20');
  });
  await page.evaluate(() => document.fonts.ready);

  const scenarios = ['lod0_20', 'lod1_20', 'lod1_50', 'lod1_100'];

  for (const scen of scenarios) {
    const info = await page.evaluate(s => window.__bench(s), scen);
    await page.evaluate(async () => {
      await window.__benchScene.whenReadyAsync();
      window.__benchTick(10);
    });

    const perf = await page.evaluate(() => {
      const scene = window.__benchScene;
      const e = scene.getEngine();
      const times = [];
      for (let i = 0; i < 40; i++) {
        const t = performance.now();
        window.__benchTick(1);
        e._gl.readPixels(0, 0, 1, 1, e._gl.RGBA, e._gl.UNSIGNED_BYTE, new Uint8Array(4));
        if (i >= 10) times.push(performance.now() - t);
      }
      times.sort((a, b) => a - b);
      const before = e._drawCalls.current;
      window.__benchTick(1);
      return {
        medianMs: times[Math.floor(times.length * 0.5)],
        p95Ms: times[Math.floor(times.length * 0.95)],
        draws: e._drawCalls.current - before,
        triangles: scene.getActiveIndices() / 3,
        meshes: scene.meshes.length,
      };
    });

    results.push({ scenario: scen, info, perf });
    console.log(`[${scen}] Tris: ${perf.triangles.toLocaleString()} | Median: ${perf.medianMs.toFixed(2)} ms | P95: ${perf.p95Ms.toFixed(2)} ms | Draws: ${perf.draws}`);
  }

  assert.deepEqual(errors, [], 'No debe haber errores de consola durante el benchmark');
  await ctx.close();
} finally {
  await browser.close();
}

console.log('\n=== REPORTE COMPARATIVO DE RENDIMIENTO DE LODs ===');
console.table(results.map(r => ({
  Escenario: r.scenario,
  Entidades: r.info.count,
  Triángulos: r.perf.triangles,
  'ms/cuadro (mediana)': r.perf.medianMs.toFixed(2),
  'ms/cuadro (P95)': r.perf.p95Ms.toFixed(2),
  'Draw Calls': r.perf.draws,
})));
