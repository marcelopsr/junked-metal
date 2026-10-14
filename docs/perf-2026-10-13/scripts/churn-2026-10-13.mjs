import { launch, open } from "../../../scripts/lib/browser.mjs";
const b = await launch({ perf: true });
try {
  const p = await open(b, "?mute&seed=3", process.argv[2] || "pc", { freeze: true });
  await p.evaluate(() => { window.__play(3); window.__god(); window.__sim(300); window.__tick(45); });
  console.log(JSON.stringify(await p.evaluate(() => { const s = window.__scene; let add = 0, rem = 0;
    const o1 = s.onNewMeshAddedObservable.add(() => add++), o2 = s.onMeshRemovedObservable.add(() => rem++);
    window.__tick(240); return { creadasPorCuadro: add / 240, borradasPorCuadro: rem / 240, mallas: s.meshes.length }; })));
} finally { await b.close(); }
