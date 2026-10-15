// Simulaciones y duelos de balance con el bot, SIN dibujar, en Chromium headless contra pm2 rc-test (:5174). Uso (npm run sim):
//   npm run sim -- --seeds 1,2,3 --secs 600      partidas completas del bot (una página limpia por semilla: Havok es determinista solo desde carga limpia)
//   npm run sim -- --duel perro,aspiradora       duelos contra jefes finales con el equipo del minuto 10 (--seeds los varía; --adds 100 --max 180 --god --team N)
//   npm run sim -- --encore [--players 1,2,4] [--encores N] [--follow: compañeros pegados al bot] [--seeds 1,2,3]   expedición ENCORE con el bot (aborda el teleportador, AVANZA, rechaza pactos); --encores = vueltas extra antes del FINAL ACT (0 = FINAL ACT tras el primer ciclo)
//   ENCORE política del bot: --pacts all|id,id (acepta; con ids fuerza ese pacto en la oferta) · --stay N (se queda N veces por escenario) · --route rand|<nombre> (destino al azar con la semilla, o fuerza esa variante: medianoche)
//   --zone luna juega en otro mapa (patio por defecto) · --par N (3 por defecto) corre N a la vez, un navegador por trabajador (no afecta al resultado) · --json imprime solo JSON (la tabla va a stderr)
// ponytail: no corre en Node puro: main.ts es DOM+WebGL+Vite de punta a punta (top-level await, ?url, CSS, canvas); NullEngine+Havok en Node funcionarían
// (Havok WASM sí corre) pero habría que partir main.ts en lógica y presentación. Hasta entonces el navegador headless sin dibujar cuesta ~1 s de arranque por corrida.
import { parseArgs } from "node:util";
import { open } from "./lib/browser.mjs";
import { pool } from "./lib/pool.mjs";

const { values: a } = parseArgs({ options: {
  seeds: { type: "string", default: "1,2" }, secs: { type: "string", default: "600" }, duel: { type: "string" }, adds: { type: "string" }, max: { type: "string" },
  team: { type: "string" }, god: { type: "boolean" }, par: { type: "string", default: "3" }, json: { type: "boolean" }, zone: { type: "string" }, encore: { type: "boolean" }, players: { type: "string", default: "1" }, encores: { type: "string", default: "0" }, follow: { type: "boolean" }, pacts: { type: "string" }, stay: { type: "string" }, route: { type: "string" }, // --zone luna: mapa (solo dev, ?zone=)
} });
const seeds = a.seeds.split(",").map(Number), secs = Number(a.secs);
const jobs = a.encore ? a.players.split(",").flatMap((n) => seeds.map((seed) => ({ seed, players: Number(n) }))) : a.duel ? a.duel.split(",").flatMap((kind) => seeds.map((seed) => ({ kind, seed }))) : seeds.map((seed) => ({ seed }));

// El juego usa Math.random en algunas cosas que sí cambian el resultado (dispersión y daño de ciertas armas: weapons.ts) además de lo visual. Se reemplaza por un
// generador con semilla justo antes de arrancar: así la misma semilla da el mismo resultado corrida tras corrida (sin tocar el código del juego).
const seedMath = (seed) => { let s = seed >>> 0 || 1; Math.random = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

const par = Math.max(1, Number(a.par));
async function run(job, browser) {
  const page = await open(browser, `?mute&seed=${job.seed}${a.zone ? "&zone=" + a.zone : ""}`, "pc", { freeze: true });
  try {
    await page.evaluate(seedMath, job.seed);
    if (a.encore) { // expedición ENCORE: __encBot corre ~30 s reales por llamada; se encadena hasta que muere o gana
      let r;
      do r = await page.evaluate((o) => window.__encBot(o), { encores: Number(a.encores), players: job.players, follow: a.follow, pacts: a.pacts === "all" ? "all" : a.pacts?.split(","), stay: a.stay && Number(a.stay), route: a.route }); while (!r.done && r.real > 0);
      return { ...job, ...r };
    }
    if (job.kind) {
      if (!a.json) process.stderr.write(`[Duelo ${job.kind} · Semilla ${job.seed}] Simulando combate contra jefe...\n`);
      const o = { seed: job.seed, god: a.god, adds: a.adds && Number(a.adds), max: a.max && Number(a.max), team: a.team && Number(a.team) };
      return { ...job, ...(await page.evaluate(([k, o]) => window.__bossDuel(k, Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== false && v !== ""))), [job.kind, o])) };
    }
    await page.evaluate((s) => window.__play(s), job.seed);
    let resumen = "";
    for (;;) { // __sim corta a los ~35 s reales: se encadena hasta llegar a `secs` o a que termine la partida
      const i = await page.evaluate(() => window.__info());
      if (!a.json && par === 1) { // la barra con \r se pisa si corren varias a la vez
        const pct = Math.min(100, Math.round((i.time / secs) * 100));
        const barLen = 16;
        const filled = Math.round((pct / 100) * barLen);
        const bar = "=".repeat(Math.max(0, filled - 1)) + (filled > 0 && filled < barLen ? ">" : "=") + " ".repeat(Math.max(0, barLen - filled));
        process.stderr.write(`\r[Semilla ${job.seed}] t=${Math.round(i.time)}/${secs}s [${bar}] ${pct}% · HP: ${Math.round(i.hp)} · Nv: ${i.level} · Armas: ${i.weapons?.length || 0}   `);
      }
      if (i.time >= secs || !["play", "level"].includes(i.state)) break;
      resumen = await page.evaluate((s) => window.__sim(s - window.__info().time), secs);
    }
    if (!a.json && par === 1) process.stderr.write(`\r                                                                         \r`);
    const i = await page.evaluate(() => window.__info()), m = (re) => resumen.match(re)?.[1];
    const at = await page.evaluate(() => window.__atascos());
    return { ...job, atascos: at.n, atascoMaxS: at.maxS, tiempo: +i.time.toFixed(1), nivel: i.level, hp: Math.round(i.hp), estado: i.state, bajas: Number(m(/bajas (\d+)/) ?? 0), mundo: m(/ · ([^·]+\/[^·]+) · semilla/)?.trim(), armas: i.weapons.join(" "), resumen,
      dano_infligido: JSON.parse(await page.evaluate(() => window.__out())), dano_recibido: JSON.parse(await page.evaluate(() => window.__dmg())) };
  } catch (e) { return { ...job, error: String(e).split("\n")[0] }; }
  finally { if (page.logs.length) console.error(`[semilla ${job.seed}] errores de consola: ${page.logs.join(" | ")}`); await page.ctx.close(); }
}

const t0 = Date.now(), out = await pool(par, jobs, run); // un navegador por trabajador (lib/pool.mjs)

const log = a.json ? console.error : console.log, pad = (v, n) => String(v ?? "-").padEnd(n);
log(a.encore
  ? `${pad("semilla", 8)}${pad("jug", 5)}${pad("resultado", 11)}${pad("vuelta", 7)}${pad("esc", 5)}${pad("fase", 11)}${pad("tiempo", 8)}${pad("nv", 4)}${pad("bajas", 7)}${pad("atascos", 8)}${pad("s/escenario", 22)}armas`
  : a.duel
  ? `${pad("jefe", 12)}${pad("semilla", 8)}${pad("segundos", 9)}${pad("ganó", 6)}${pad("jefe %vida", 11)}${pad("auto hp", 8)}real s`
  : `${pad("semilla", 8)}${pad("tiempo", 8)}${pad("nv", 4)}${pad("hp", 6)}${pad("bajas", 7)}${pad("atascos", 9)}${pad("estado", 8)}${pad("mundo", 34)}armas`);
const durs = (l, end) => l.map((e, i) => `${e.loop}.${e.stage}:${Math.round((l[i + 1]?.t ?? end) - e.t)}`).join(" ");
for (const r of out) log(r.error ? `${r.kind ?? ""} ${r.seed}: ERROR ${r.error}` : a.encore
  ? `${pad(r.seed, 8)}${pad(r.players, 5)}${pad(r.won ? "GANÓ" : "murió", 11)}${pad(r.loop, 7)}${pad(r.stage, 5)}${pad(r.phase, 11)}${pad(r.t, 8)}${pad(r.level, 4)}${pad(r.kills, 7)}${pad(r.atascos + (r.atascos ? ` (${r.atascoMaxS}s)` : ""), 8)}${pad(durs(r.log, r.t), 22)}${r.weapons.join(" ")}`
  : a.duel
  ? `${pad(r.kind, 12)}${pad(r.seed, 8)}${pad(r.segundos, 9)}${pad(r.ganó ? "sí" : "no", 6)}${pad(r.vidaRestante, 11)}${pad(r.auto, 8)}${r.real}`
  : `${pad(r.seed, 8)}${pad(r.tiempo, 8)}${pad(r.nivel, 4)}${pad(r.hp, 6)}${pad(r.bajas, 7)}${pad(r.atascos + (r.atascos ? ` (${r.atascoMaxS}s)` : ""), 9)}${pad(r.estado, 8)}${pad(r.mundo, 34)}${r.armas}`);
log(`\n${out.length} corrida(s) en ${((Date.now() - t0) / 1000).toFixed(1)} s (par ${par})`);
if (a.json) console.log(JSON.stringify(out, null, 1));
process.exit(out.some((r) => r.error) ? 1 : 0);
