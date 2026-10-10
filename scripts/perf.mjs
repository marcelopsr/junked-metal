// Rendimiento por escenario (los de scenarios.mjs) con UN Chromium headless y GPU real contra pm2 rc-test (:5174). Uso (npm run perf):
//   npm run perf                       todos los escenarios, ambos viewports; guarda .perf/AAAA-MM-DD-HHMM.json y compara con la medición anterior
//   npm run perf -- --only lab,partida  solo ids que contengan eso; --vp pc|cel; --frames 180; --no-save
// ms/cuadro = un bucle sincrónico __tick(1) + readPixels(1x1) (obliga a esperar a la GPU): mide CPU del juego + GPU, sin vsync ni compositor.
// El bucle de dibujo real está detenido y cada cuadro dura 1/60 s de juego: mismas condiciones en cada corrida. Compara solo corridas hechas en el mismo estado
// de la Mac (sin otros encargos pesados) y con rc-test recién reiniciado: draws, triángulos, mallas y heap son exactos (misma escena = mismo número); ms/cuadro es indicativo (ruido de ~10-15 % aun así): se marcan solo diferencias de más del 20 %.
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { BASE, launch, open } from "./lib/browser.mjs";
import { sessions } from "./scenarios.mjs";

const { values: a } = parseArgs({ options: { only: { type: "string" }, vp: { type: "string" }, frames: { type: "string", default: "180" }, "no-save": { type: "boolean" } } });
const FRAMES = Number(a.frames), only = a.only?.split(","), DIR = ".perf";

// Dentro de la página: calienta la GPU (los relojes tardan en subir) y mide 3 bloques de n/3 cuadros. ms = el MEJOR bloque (mediana de cada uno): el ruido de la Mac
// (otros procesos, relojes de la GPU) solo suma tiempo, nunca resta. p95 sale de todos los cuadros: ahí sí se ven los tirones.
const medir = ({ n }) => {
  const sc = window.__scene, e = sc.getEngine(), gl = e._gl, px = new Uint8Array(4);
  const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const q = (v, p) => [...v].sort((x, y) => x - y)[Math.min(v.length - 1, Math.floor(v.length * p))];
  for (let i = 0; i < 40; i++) window.__tick(1);
  sync();
  const all = [], ms = [], cpu = [];
  for (let b = 0; b < 3; b++) {
    const tot = [], c = [];
    for (let i = 0; i < n / 3; i++) { const t = performance.now(); window.__tick(1); const m = performance.now(); sync(); c.push(m - t); tot.push(performance.now() - t); }
    ms.push(q(tot, 0.5)); cpu.push(q(c, 0.5)); all.push(...tot);
  }
  const d0 = e._drawCalls.current; window.__tick(1); const draws = e._drawCalls.current - d0; // el contador de Babylon es acumulado: draw calls de UN cuadro = diferencia
  return { ms: Math.min(...ms), p95: q(all, 0.95), cpu: Math.min(...cpu), draws, tris: Math.round(sc.getActiveIndices() / 3), meshes: sc.meshes.length, activos: sc.getActiveMeshes().length };
};

const browser = await launch({ perf: true }), res = {}, loads = {}, t0 = Date.now();
try {
  for (const vp of a.vp ? [a.vp] : ["pc", "cel"]) {
    for (const s of sessions) {
      if (s.vps && !s.vps.includes(vp)) continue;
      const sel = s.shots.filter((sh) => sh.perf !== false && (!only || only.some((o) => {
        const key = `${vp}-${s.id}-${sh.id}`;
        return o.includes("-") ? key.includes(o) : sh.id === o || key === `${vp}-${s.id}-${o}`;
      })));
      if (!sel.length) continue;
      const page = await open(browser, s.query, vp, { freeze: true }), cdp = await page.ctx.newCDPSession(page);
      await cdp.send("Performance.enable");
      loads[`${vp}-${s.id}`] = page.t;
      const last = Math.max(...sel.map((x) => s.shots.indexOf(x)));
      for (const sh of s.shots.slice(0, last + 1)) { // los pasos previos corren aunque no se midan: arman el estado
        try {
          await sh.act(page);
          if (!sel.includes(sh)) continue;
          await cdp.send("HeapProfiler.collectGarbage"); // memoria estable: sin basura pendiente
          const m = await page.evaluate(medir, { n: FRAMES });
          const heap = (await cdp.send("Performance.getMetrics")).metrics.find((x) => x.name === "JSHeapUsedSize").value;
          res[`${vp}-${s.id}-${sh.id}`] = { ...m, heapMB: heap / 1048576 };
        } catch (e) { console.error(`${vp}-${s.id}-${sh.id}: ${String(e).split("\n")[0]}`); }
      }
      if (page.logs.length) console.log(`[${vp}-${s.id}] errores de consola:\n  ` + page.logs.join("\n  "));
      await page.ctx.close();
    }
  }
} finally { await browser.close(); }

// ---- comparar con la medición anterior ----
mkdirSync(DIR, { recursive: true });
const prevFile = readdirSync(DIR).filter((f) => /^\d{4}-\d\d-\d\d-\d{4}\.json$/.test(f)).sort().at(-1);
const prev = prevFile ? JSON.parse(readFileSync(`${DIR}/${prevFile}`, "utf8")) : null;
const d = (cur, old) => (old ? ` ${(((cur - old) / old) * 100).toFixed(0).replace(/^(\d)/, "+$1")}%` : "");
const f1 = (v) => v.toFixed(1);
console.log(`\n${"escenario".padEnd(32)} ${"ms".padStart(6)} ${"p95".padStart(6)} ${"cpu".padStart(6)} ${"draws".padStart(6)} ${"tris k".padStart(7)} ${"mallas".padStart(6)} ${"heap MB".padStart(8)}   vs ${prevFile ?? "(sin medición anterior)"}`);
for (const [id, r] of Object.entries(res)) {
  const o = prev?.results[id], dm = o ? (r.ms - o.ms) / o.ms : 0;
  console.log(`${id.padEnd(32)} ${f1(r.ms).padStart(6)} ${f1(r.p95).padStart(6)} ${f1(r.cpu).padStart(6)} ${String(r.draws).padStart(6)} ${f1(r.tris / 1000).padStart(7)} ${String(r.meshes).padStart(6)} ${f1(r.heapMB).padStart(8)}   ${o ? `ms${d(r.ms, o.ms)} draws${d(r.draws, o.draws)} tris${d(r.tris, o.tris)} heap${d(r.heapMB, o.heapMB)}` : ""}${dm > 0.2 ? "  ▲ MÁS LENTO" : dm < -0.2 ? "  ▼ más rápido" : ""}`);
}
console.log("\ncarga (ms desde el inicio): " + Object.entries(loads).map(([k, v]) => `${k} portada ${v.portada} · listo ${v.listo}${prev?.loads[k] ? ` (antes ${prev.loads[k].portada}/${prev.loads[k].listo})` : ""}`).join(" | "));
if (!a["no-save"]) {
  const n = new Date(), p = (x) => String(x).padStart(2, "0"), name = `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}-${p(n.getHours())}${p(n.getMinutes())}.json`;
  let commit = ""; try { commit = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim(); } catch { /* sin git */ }
  writeFileSync(`${DIR}/${name}`, JSON.stringify({ cuando: n.toISOString(), url: BASE, commit, frames: FRAMES, loads, results: res }, null, 1));
  console.log(`guardado ${DIR}/${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
