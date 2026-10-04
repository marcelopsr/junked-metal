// Simulaciones y duelos de balance con el bot, SIN dibujar, en Chromium headless contra pm2 rc-test (:5174). Uso (npm run sim):
//   npm run sim -- --seeds 1,2,3 --secs 600      partidas completas del bot (una página limpia por semilla: Havok es determinista solo desde carga limpia)
//   npm run sim -- --duel perro,aspiradora       duelos contra jefes finales con el equipo del minuto 10 (--seeds los varía; --adds 100 --max 180 --god --team N)
//   --par 2 corre varias a la vez (más rápido, más CPU; no afecta al resultado) · --json imprime solo JSON (la tabla va a stderr)
// ponytail: no corre en Node puro: main.ts es DOM+WebGL+Vite de punta a punta (top-level await, ?url, CSS, canvas); NullEngine+Havok en Node funcionarían
// (Havok WASM sí corre) pero habría que partir main.ts en lógica y presentación. Hasta entonces el navegador headless sin dibujar cuesta ~1 s de arranque por corrida.
import { parseArgs } from "node:util";
import { launch, open } from "./lib/browser.mjs";

const { values: a } = parseArgs({ options: {
  seeds: { type: "string", default: "1,2" }, secs: { type: "string", default: "600" }, duel: { type: "string" }, adds: { type: "string" }, max: { type: "string" },
  team: { type: "string" }, god: { type: "boolean" }, par: { type: "string", default: "1" }, json: { type: "boolean" },
} });
const seeds = a.seeds.split(",").map(Number), secs = Number(a.secs);
const jobs = a.duel ? a.duel.split(",").flatMap((kind) => seeds.map((seed) => ({ kind, seed }))) : seeds.map((seed) => ({ seed }));

// El juego usa Math.random en algunas cosas que sí cambian el resultado (dispersión y daño de ciertas armas: weapons.ts) además de lo visual. Se reemplaza por un
// generador con semilla justo antes de arrancar: así la misma semilla da el mismo resultado corrida tras corrida (sin tocar el código del juego).
const seedMath = (seed) => { let s = seed >>> 0 || 1; Math.random = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

const browser = await launch();
async function run(job) {
  const page = await open(browser, `?mute&seed=${job.seed}`, "pc", { freeze: true });
  try {
    await page.evaluate(seedMath, job.seed);
    if (job.kind) {
      const o = { seed: job.seed, god: a.god, adds: a.adds && Number(a.adds), max: a.max && Number(a.max), team: a.team && Number(a.team) };
      return { ...job, ...(await page.evaluate(([k, o]) => window.__bossDuel(k, Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== false && v !== ""))), [job.kind, o])) };
    }
    await page.evaluate((s) => window.__play(s), job.seed);
    let resumen = "";
    for (;;) { // __sim corta a los ~35 s reales: se encadena hasta llegar a `secs` o a que termine la partida
      const i = await page.evaluate(() => window.__info());
      if (i.time >= secs || !["play", "level"].includes(i.state)) break;
      resumen = await page.evaluate((s) => window.__sim(s - window.__info().time), secs);
    }
    const i = await page.evaluate(() => window.__info()), m = (re) => resumen.match(re)?.[1];
    return { ...job, tiempo: +i.time.toFixed(1), nivel: i.level, hp: Math.round(i.hp), estado: i.state, bajas: Number(m(/bajas (\d+)/) ?? 0), mundo: m(/ · ([^·]+\/[^·]+) · semilla/)?.trim(), armas: i.weapons.join(" "), resumen,
      dano_infligido: JSON.parse(await page.evaluate(() => window.__out())), dano_recibido: JSON.parse(await page.evaluate(() => window.__dmg())) };
  } catch (e) { return { ...job, error: String(e).split("\n")[0] }; }
  finally { if (page.logs.length) console.error(`[semilla ${job.seed}] errores de consola: ${page.logs.join(" | ")}`); await page.ctx.close(); }
}

const t0 = Date.now(), out = new Array(jobs.length), par = Math.max(1, Number(a.par));
let next = 0;
try { await Promise.all(Array.from({ length: par }, async () => { while (next < jobs.length) { const i = next++; out[i] = await run(jobs[i]); } })); }
finally { await browser.close(); }

const log = a.json ? console.error : console.log, pad = (v, n) => String(v ?? "-").padEnd(n);
log(a.duel
  ? `${pad("jefe", 12)}${pad("semilla", 8)}${pad("segundos", 9)}${pad("ganó", 6)}${pad("jefe %vida", 11)}${pad("auto hp", 8)}real s`
  : `${pad("semilla", 8)}${pad("tiempo", 8)}${pad("nv", 4)}${pad("hp", 6)}${pad("bajas", 7)}${pad("estado", 8)}${pad("mundo", 34)}armas`);
for (const r of out) log(r.error ? `${r.kind ?? ""} ${r.seed}: ERROR ${r.error}` : a.duel
  ? `${pad(r.kind, 12)}${pad(r.seed, 8)}${pad(r.segundos, 9)}${pad(r.ganó ? "sí" : "no", 6)}${pad(r.vidaRestante, 11)}${pad(r.auto, 8)}${r.real}`
  : `${pad(r.seed, 8)}${pad(r.tiempo, 8)}${pad(r.nivel, 4)}${pad(r.hp, 6)}${pad(r.bajas, 7)}${pad(r.estado, 8)}${pad(r.mundo, 34)}${r.armas}`);
log(`\n${out.length} corrida(s) en ${((Date.now() - t0) / 1000).toFixed(1)} s (par ${par})`);
if (a.json) console.log(JSON.stringify(out, null, 1));
process.exit(out.some((r) => r.error) ? 1 : 0);
