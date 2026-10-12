// diagnostico del material "mow": variantes en vivo
import { launch, open } from "../../scripts/lib/browser.mjs";
const b = await launch();
const tick = (p, n) => p.evaluate((n) => window.__tick(n), n);
const p = await open(b, "?mute&seed=3&zone=jardin&lab", "pc", { freeze: true });
await p.waitForTimeout(1500);
await p.evaluate(() => window.__lab({ back: 25, up: 8, frames: 2 }));
await tick(p, 60);
const shot = async (n, f) => { if (f) console.log(n, JSON.stringify(await p.evaluate(f))); await tick(p, 3); await p.screenshot({ path: `scratch/qa6/probe-${n}.png`, clip: { x: 0, y: 150, width: 1280, height: 330 } }); };
const get = "window.__scene.meshes.find((x) => x.name === 'mow').material";
await shot("a_alpha02", () => { const m = window.__scene.meshes.find((x) => x.name === "mow").material; m.alpha = 0.02; return m.alpha; });
await shot("b_unlit", () => { const m = window.__scene.meshes.find((x) => x.name === "mow").material; m.alpha = 0.08; m.disableLighting = true; m.albedoColor.set(0, 0, 0); m.emissiveColor.set(0.8, 1, 0.7); return m.alpha; });
await b.close();
