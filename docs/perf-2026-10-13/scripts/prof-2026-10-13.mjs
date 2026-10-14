// perfil CPU de N cuadros en un escenario (investigación perf 2026-10-13; no versionar)
import { launch, open } from "../../../scripts/lib/browser.mjs";
import { writeFileSync } from "node:fs";
const [q, setup, vp = "pc", out] = process.argv.slice(2);
const b = await launch({ perf: true });
try {
  const p = await open(b, q, vp, { freeze: true });
  await p.evaluate(`(${setup})()`); console.log("info", JSON.stringify(await p.evaluate(() => window.__info?.())));
  await p.evaluate(() => window.__tick(45));
  const cdp = await p.ctx.newCDPSession(p);
  await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
  // contadores por cuadro
  const st = await p.evaluate(() => { const s = window.__scene; const e = s.getEngine(); let n = 0, t = { act: 0, render: 0, before: 0, phys: 0 };
    const now = () => performance.now(); let a, r0;
    const o1 = s.onBeforeActiveMeshesEvaluationObservable.add(() => a = now()), o2 = s.onAfterActiveMeshesEvaluationObservable.add(() => t.act += now() - a);
    const o3 = s.onBeforeRenderTargetsRenderObservable.add(() => r0 = now()), o4 = s.onAfterRenderObservable.add(() => t.render += now() - r0);
    const o5 = s.onBeforePhysicsObservable?.add(() => a2 = now()); let a2; const o6 = s.onAfterPhysicsObservable?.add(() => t.phys += now() - a2);
    const t0 = now(); for (let i = 0; i < 120; i++) window.__tick(1); const tot = now() - t0;
    return { perFrame: { total: tot / 120, activeEval: t.act / 120, renderTargetsToEnd: t.render / 120, physics: t.phys / 120 }, rts: s.customRenderTargets.length, lights: s.lights.length, shadowGens: s.lights.filter(l => l.getShadowGenerator?.()).length, textures: s.textures.length, materials: s.materials.length, meshes: s.meshes.length, active: s.getActiveMeshes().length, freeze: s.meshes.filter(m => m.isWorldMatrixFrozen).length, pe: s.postProcesses.length, particleSystems: s.particleSystems.length, skeletons: s.skeletons.length, geoms: s.geometries.length, enemies: window.__info?.().enemies };
  });
  await cdp.send("Profiler.start");
  await p.evaluate(() => window.__tick(240));
  const { profile } = await cdp.send("Profiler.stop");
  const self = new Map(), byId = new Map(profile.nodes.map(n => [n.id, n])), dt = profile.timeDeltas; const hits = new Map();
  profile.samples.forEach((id, i) => hits.set(id, (hits.get(id) || 0) + (dt[i] || 0)));
  for (const [id, us] of hits) { const n = byId.get(id), f = n.callFrame; const k = `${f.functionName || "(anon)"} ${f.url.split("/").slice(-2).join("/").replace(/\?.*/, "")}:${f.lineNumber + 1}`; self.set(k, (self.get(k) || 0) + us); }
  const tot = [...self.values()].reduce((a, b) => a + b, 0);
  const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, us]) => `${(100 * us / tot).toFixed(1).padStart(5)}%  ${k}`);
  const file = {}; for (const [k, us] of self) { const f = k.split(" ")[1]?.split(":")[0] || "?"; file[f] = (file[f] || 0) + us; }
  const topFiles = Object.entries(file).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, us]) => `${(100 * us / tot).toFixed(1).padStart(5)}%  ${k}`);
  const txt = JSON.stringify(st, null, 1) + "\n\n-- self time por archivo --\n" + topFiles.join("\n") + "\n\n-- self time por función --\n" + top.join("\n");
  writeFileSync(out, txt); console.log(txt);
} finally { await b.close(); }
