// asignaciones por cuadro en partida llena (muestreo de heap; investigación perf; no versionar)
import { launch, open } from "../../../scripts/lib/browser.mjs";
const b = await launch({ perf: true });
try {
  const p = await open(b, "?mute&seed=3", process.argv[2] || "pc", { freeze: true });
  await p.evaluate(() => { window.__play(3); window.__god(); window.__sim(300); window.__tick(45); });
  const cdp = await p.ctx.newCDPSession(p);
  await cdp.send("HeapProfiler.enable"); await cdp.send("HeapProfiler.collectGarbage");
  const m0 = await p.evaluate(() => performance.memory.usedJSHeapSize);
  await cdp.send("HeapProfiler.startSampling", { samplingInterval: 4096, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
  await p.evaluate(() => window.__tick(240));
  const { profile } = await cdp.send("HeapProfiler.stopSampling");
  const m1 = await p.evaluate(() => performance.memory.usedJSHeapSize);
  const agg = new Map(); let tot = 0;
  const walk = (n) => { const f = n.callFrame, self = n.selfSize; if (self) { const k = `${f.functionName || "(anon)"} ${f.url.split("/").slice(-2).join("/").replace(/\?.*/, "")}:${f.lineNumber + 1}`; agg.set(k, (agg.get(k) || 0) + self); tot += self; } n.children.forEach(walk); };
  walk(profile.head);
  console.log(`asignado ~${(tot / 1048576 / 240 * 1024).toFixed(1)} KB/cuadro (muestreo, incluye lo ya recolectado); heap usado ${(m0/1048576).toFixed(1)} -> ${(m1/1048576).toFixed(1)} MB`);
  [...agg].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, v]) => console.log(`${(100 * v / tot).toFixed(1).padStart(5)}%  ${(v / 240 / 1024).toFixed(1).padStart(6)} KB/c  ${k}`));
} finally { await b.close(); }
