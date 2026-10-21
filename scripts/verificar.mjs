// Verificación por niveles, un solo comando para todos los agentes. Uso:
//   npm run verificar -- --nivel rapido|tanda|puerta [--seco]
//   rapido: tsc + vitest --changed + docs:check
//   tanda:  rapido + shots --changed (caché por hash) + sim 2 semillas (si el diff toca balance/lógica) + e2e pc 1 semilla (si toca src/)
//   puerta: tsc, test:todo, balance:check, build, e2e pc,cel x5, sim --encore 20 semillas, shots pc y cel completos
// Cada fase corre sus pasos en paralelo (las herramientas con navegador toman SU servidor del grupo y usan --par propio); si una fase falla, no arranca la siguiente.
// Informe: .verificar/<fecha>.md (Implementado / Verificado / Observado / Pendiente) + logs por paso en .verificar/<fecha>/.
// ponytail: "Observado" solo lista rutas de PNG (mtime >= inicio); lo que se ve lo completa quien mira. Condiciones de sim/e2e por regex de ruta.
import { spawn, execSync } from "node:child_process";
import { mkdirSync, writeFileSync, readdirSync, statSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const nivel = arg("nivel", "rapido"), seco = process.argv.includes("--seco");
if (!["rapido", "tanda", "puerta"].includes(nivel)) { console.error("--nivel debe ser rapido, tanda o puerta"); process.exit(2); }

const sh = (c) => { try { return execSync(c, { encoding: "utf8", maxBuffer: 1 << 26 }); } catch { return ""; } };
const files = [...new Set(sh("git diff --name-only HEAD; git ls-files --others --exclude-standard").split("\n").filter(Boolean))];
const lib = (re) => files.some((f) => re.test(f));
const toca = {
  src: lib(/^src\/(?!.*\.test\.).*\.(ts|css|json)$/),
  // balance y jugabilidad: números, armas, enemigos, autos, ritmo, modos, bot
  sim: lib(/^src\/(balance\.|weapons|enemies|car|encore|run|main|devbot|pilots|passives|director|spawn|zones\/)/),
};

const npm = (name, ...a) => ["npm", ["run", name, ...(a.length ? ["--", ...a] : [])]];
const S = (id, [cmd, args]) => ({ id, cmd, args });
const seeds20 = Array.from({ length: 20 }, (_, i) => i + 1).join(",");
const fases = [];
const omit = []; // pasos que el nivel no corre y por qué
fases.push([S("tsc", ["npx", ["tsc", "--noEmit", "-p", "."]]), nivel === "puerta" ? S("test:todo", npm("test:todo")) : S("vitest", ["npx", ["vitest", "run", "--changed", "--passWithNoTests"]]), S("docs:check", npm("docs:check"))]);
if (nivel === "puerta") {
  fases[0].push(S("balance:check", npm("balance:check")));
  fases.push([S("build", npm("build"))]);
  fases.push([
    S("e2e pc,cel x5", npm("e2e", "--vp", "pc,cel", "--seeds", "1,2,3,4,5")),
    S("sim --encore 20", npm("sim", "--encore", "--seeds", seeds20)),
    S("shots pc", npm("shots", "--vp", "pc")),
    S("shots cel", npm("shots", "--vp", "cel")),
  ]);
} else if (nivel === "tanda") {
  const f = [S("shots --changed", npm("shots", "--changed"))];
  if (toca.sim) f.push(S("sim 2 semillas", npm("sim", "--seeds", "1,2")));
  else omit.push("sim 2 semillas: el diff no toca balance ni lógica de jugabilidad");
  if (toca.src) f.push(S("e2e pc", npm("e2e", "--vp", "pc", "--seed", "1")));
  else omit.push("e2e pc: el diff no toca src/");
  fases.push(f);
}

const t0 = Date.now(), stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const fmt = (ms) => (ms / 1000).toFixed(1) + " s";
console.log(`verificar --nivel ${nivel}: ${files.length} archivos en el diff (src: ${toca.src}, lógica/balance: ${toca.sim})`);
fases.forEach((f, i) => console.log(`  fase ${i + 1}: ${f.map((p) => p.id).join(" | ")}`));
omit.forEach((o) => console.log(`  omitido: ${o}`));
if (seco) process.exit(0);

const dir = join(".verificar", stamp); mkdirSync(dir, { recursive: true });
const run = (p) => new Promise((res) => {
  const t = Date.now(), log = join(dir, p.id.replace(/[^\w-]+/g, "_") + ".log"), chunks = [];
  const c = spawn(p.cmd, p.args, { env: process.env });
  c.stdout.on("data", (d) => chunks.push(d)); c.stderr.on("data", (d) => chunks.push(d));
  c.on("error", (e) => chunks.push(Buffer.from(String(e))));
  c.on("close", (code) => { const out = Buffer.concat(chunks).toString(); writeFileSync(log, out); res({ ...p, code: code ?? 1, ms: Date.now() - t, log, out }); });
});

const hechos = [], noCorrio = [];
for (let i = 0; i < fases.length; i++) {
  const rs = await Promise.all(fases[i].map(run));
  rs.forEach((r) => console.log(`  ${r.code === 0 ? "OK  " : "FALLA"} ${r.id} (${fmt(r.ms)})${r.code ? ` -> ${r.log}` : ""}`));
  hechos.push(...rs);
  if (rs.some((r) => r.code)) { fases.slice(i + 1).flat().forEach((p) => noCorrio.push(`${p.id}: no corrió, falló la fase ${i + 1}`)); break; }
}

// PNG producidos por esta corrida
const pngs = (d) => { try { return readdirSync(d, { recursive: true }).filter((f) => f.endsWith(".png")).map((f) => join(d, f)).filter((f) => statSync(f).mtimeMs >= t0); } catch { return []; } };
const imgs = [...pngs(".shots/actual"), ...pngs(".shots/diff"), ...pngs(".e2e")];
const fallos = hechos.filter((r) => r.code);
const tail = (s) => s.trim().split("\n").slice(-12).join("\n");
const md = [
  `# Verificación ${nivel} (${stamp})`, "",
  "## Implementado", "```", sh("git diff --stat HEAD").trim() || "(sin cambios versionados)", "```",
  `Sin versionar: ${files.filter((f) => !sh(`git ls-files ${JSON.stringify(f)}`).trim()).length} archivos.`, "",
  "## Verificado", "| paso | resultado | tiempo | log |", "|---|---|---|---|",
  ...hechos.map((r) => `| \`${[r.cmd, ...r.args].join(" ")}\` | ${r.code ? "FALLA (exit " + r.code + ")" : "OK"} | ${fmt(r.ms)} | ${r.log} |`),
  `Total: ${fmt(Date.now() - t0)}.`, "",
  "## Observado", imgs.length ? "PNG de esta corrida (sin interpretar; quien mira completa aquí lo que vio):" : "Sin PNG nuevos.", ...imgs.slice(0, 60).map((f) => `- ${f}`), imgs.length > 60 ? `- ... y ${imgs.length - 60} más` : "", "",
  "## Pendiente",
  ...fallos.flatMap((r) => [`- FALLÓ \`${r.id}\` (exit ${r.code}), últimas líneas:`, "```", tail(r.out), "```"]),
  ...noCorrio.map((x) => `- ${x}`), ...omit.map((x) => `- ${x}`),
  nivel !== "puerta" ? "- Nivel < puerta: sin test:todo, build, balance:check, e2e x5 ni sim 20; el mapa de shots es a mano (archivo sin mapa cae en core)." : "- shots de la puerta sin --diff (no hay comparación contra .shots/ref/); revisor y perf quedan aparte.",
  "- Revisión de ojos (qué se ve en las PNG) pendiente de quien verifica.", "",
].join("\n");
const out = join(".verificar", stamp + ".md"); writeFileSync(out, md);
console.log(`\n${fallos.length ? "FALLÓ: " + fallos.map((r) => r.id).join(", ") : "TODO OK"} en ${fmt(Date.now() - t0)} · ${imgs.length} PNG · informe ${out}`);
process.exit(fallos.length ? 1 : 0);
