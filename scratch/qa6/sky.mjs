// uso: node scratch/qa6/sky.mjs <sufijo> : cielo del jardin (supervivencia ?zone=jardin) mirando al horizonte
import { launch, open } from "../../scripts/lib/browser.mjs";
const suf = process.argv[2] ?? "antes";
const b = await launch();
const tick = (p, n) => p.evaluate((n) => window.__tick(n), n);
const p = await open(b, "?mute&seed=3&zone=jardin&lab", "pc", { freeze: true });
await p.waitForTimeout(1500);
for (const [n, back, up] of [["horizonte", 25, 2], ["medio", 25, 8]]) {
  await p.evaluate(([back, up]) => window.__lab({ back, up, frames: 2 }), [back, up]);
  await tick(p, 60);
  await p.screenshot({ path: `scratch/qa6/cielo-jardin-${n}-${suf}.png` });
}
await b.close();
