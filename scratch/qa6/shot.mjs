// uso: node scratch/qa6/shot.mjs <sufijo>   (con rc-test del worktree levantado)
import { launch, open } from "../../scripts/lib/browser.mjs";
const suf = process.argv[2] ?? "antes";
const b = await launch();
const tick = (p, n) => p.evaluate((n) => window.__tick(n), n);
{ // 1) aviso de radio del jefe en celular
  const p = await open(b, "?mute&seed=3", "cel", { freeze: true });
  await p.evaluate(() => { window.__play(3); window.__god(); window.__sim(30); });
  await tick(p, 40);
  await p.evaluate(async () => { const m = await import("/src/ui.ts"); m.bannerClear(); m.radioBoss("pre", "TARÁNTULA GIGANTE"); });
  await tick(p, 60);
  await p.evaluate(async () => { const m = await import("/src/ui.ts"); m.hudBoss("TARÁNTULA GIGANTE", 1, "tarantula"); document.getElementById("bossbar").classList.remove("hidden"); }); // la partida lo oculta si no hay jefe vivo; se fuerza para el caso real
  await p.waitForTimeout(100);
  await p.screenshot({ path: `scratch/qa6/radio-cel-${suf}.png` });
  const r = await p.evaluate(() => { const g = (s) => { const x = document.querySelector(s)?.getBoundingClientRect(); return x && [x.top, x.bottom, x.left, x.right].map(Math.round); }; return { banner: g("#banner"), boss: g("#bossbar"), lcd: g("#lcd"), timer: g("#timer") }; });
  console.log("rects", JSON.stringify(r));
  await p.ctx.close();
}
for (const [n, q] of [["superv", "?mute&seed=3&zone=jardin"]]) {
  const p = await open(b, q, "pc", { freeze: true });
  await p.evaluate(() => { window.__play(3); window.__god(); window.__sim(20); });
  await tick(p, 60);
  await p.screenshot({ path: `scratch/qa6/cielo-${n}-${suf}.png` });
  await p.ctx.close();
}
await b.close();
