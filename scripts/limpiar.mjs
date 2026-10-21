// npm run limpiar [-- --dias 7] [--seco]: higiene de disco y de git.
// Borra .shots/actual, .perf, .e2e, .verificar, .evo y .claude/trabajo/informes|sesiones más viejos que N días (nunca .shots/ref),
// poda worktrees huérfanos, lista ramas sin integrar y mide lo que ocupa cada carpeta generada.
import { execSync } from "node:child_process";
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const dias = Number(arg("dias", 7)), seco = process.argv.includes("--seco");
const limite = Date.now() - dias * 864e5;
const sh = (c) => { try { return execSync(c, { cwd: RAIZ, encoding: "utf8" }).trim(); } catch { return ""; } };
const mb = (p) => { const n = Number(sh(`du -sk "${p}" | cut -f1`)); return n ? (n / 1024).toFixed(0) + " MB" : "0"; };

const carpetas = [".shots/actual", ".shots/diff", ".perf", ".e2e", ".verificar", ".evo", ".claude/trabajo/informes", ".claude/trabajo/sesiones"];
let borrados = 0;
for (const c of carpetas) {
  const d = join(RAIZ, c); if (!existsSync(d)) continue;
  const antes = mb(d);
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).mtimeMs < limite) { borrados++; if (!seco) rmSync(p, { recursive: true, force: true }); }
  }
  console.log(`${c}: ${antes}${seco ? "" : " → " + mb(d)}`);
}
console.log(`${seco ? "borraría" : "borrados"}: ${borrados} elementos de más de ${dias} días (.shots/ref no se toca)`);
if (!seco) sh("git worktree prune");
const wt = sh("git worktree list").split("\n").slice(1); if (wt.length) console.log("worktrees vivos:\n  " + wt.join("\n  "));
const sinIntegrar = sh("git branch --no-merged master --format='%(refname:short) %(committerdate:short)'").split("\n").filter(Boolean);
if (sinIntegrar.length) console.log("ramas sin integrar en master:\n  " + sinIntegrar.join("\n  "));
console.log(`node_modules: ${mb(join(RAIZ, "node_modules"))} · dist: ${mb(join(RAIZ, "dist"))} · disco libre: ${sh("df -h . | tail -1 | awk '{print $4}'")}`);
