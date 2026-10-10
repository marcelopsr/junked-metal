// Servidor de pruebas, con candado. `npm run test:restart` (arranca/reinicia), `test:down` (borra el del worktree actual), `test:ls` (lista servidores y candados).
// Carpeta principal: pm2 `rc-test` :5174. Worktree: `rc-test-<carpeta>` en 5200-5299 (ver WT en lib/browser.mjs).
import { execSync } from "node:child_process";
import { existsSync, readdirSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

// node_modules del worktree = symlink al de la carpeta principal. Va ANTES de importar browser.mjs (que importa playwright desde ahí).
const common = execSync("git rev-parse --path-format=absolute --git-common-dir", { encoding: "utf8" }).trim();
if (dirname(common) !== process.cwd() && !existsSync("node_modules")) symlinkSync(join(dirname(common), "node_modules"), "node_modules");
const { PERF_LOCK, SERVER_LOCK, WT, lock, lockInfo } = await import("./lib/browser.mjs");

const sh = (c, o = {}) => execSync(c, { stdio: "inherit", ...o });
const procs = () => JSON.parse(execSync("pm2 jlist", { encoding: "utf8", maxBuffer: 1e8 }).replace(/^[^[]*/, "")).filter((p) => /^rc-test(-|$)/.test(p.name));
const portOf = (p) => p.pm2_env.RC_TEST_PORT ?? p.pm2_env.env?.RC_TEST_PORT ?? 5174;
const cmd = process.argv[2] ?? "restart";

if (cmd === "ls") {
  for (const p of procs()) console.log(`${p.name.padEnd(28)} :${portOf(p)}  ${p.pm2_env.status.padEnd(8)} ${p.pm2_env.pm_cwd}${existsSync(p.pm2_env.pm_cwd) ? "" : "  (HUERFANO)"}`);
  console.log("candados:");
  const names = readdirSync(tmpdir()).filter((f) => /^rc-(test-\d+|perf)\.lock$/.test(f)).map((f) => f.slice(0, -5));
  for (const n of [...new Set([SERVER_LOCK, PERF_LOCK, ...names])]) console.log(`  ${n}: ` + (lockInfo(n)?.replace(/\n/g, " | ") ?? "libre"));
} else if (cmd === "down") {
  if (!WT) throw new Error("test:down solo borra servidores de worktrees; rc-test de la carpeta principal queda corriendo");
  sh(`pm2 delete ${WT.name}`);
} else {
  await lock();
  for (const p of procs()) if (p.name !== "rc-test" && !existsSync(p.pm2_env.pm_cwd)) { console.log("borrando huérfano " + p.name); sh(`pm2 delete ${p.name}`); }
  if (!WT) sh("pm2 restart rc-test");
  else {
    const env = { ...process.env, RC_TEST_NAME: WT.name, RC_TEST_PORT: String(WT.port) };
    if (procs().some((p) => p.name === WT.name)) sh(`pm2 restart ${WT.name} --update-env`, { env });
    else sh(`pm2 start ecosystem.config.cjs --only ${WT.name}`, { env });
    console.log(`${WT.name} en http://localhost:${WT.port}`);
  }
}
