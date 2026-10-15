// Servidor de pruebas, con candado. `npm run test:restart` (arranca/reinicia), `test:down` (borra el del worktree actual), `test:ls` (lista servidores y candados).
// Carpeta principal: pm2 `rc-test` :5174. Worktree: `rc-test-<carpeta>` en 5200-5299 (ver WT en lib/browser.mjs).
import { execSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

// node_modules del worktree = symlink al de la carpeta principal. Va ANTES de importar browser.mjs (que importa playwright desde ahí).
const common = execSync("git rev-parse --path-format=absolute --git-common-dir", { encoding: "utf8" }).trim();
if (dirname(common) !== process.cwd()) {
  // carpeta real sin playwright (p. ej. solo node_modules/.vite creada por vitest): se borra para poder armar el symlink
  if (existsSync("node_modules") && !lstatSync("node_modules").isSymbolicLink() && !existsSync("node_modules/playwright")) rmSync("node_modules", { recursive: true, force: true });
  if (!existsSync("node_modules")) symlinkSync(join(dirname(common), "node_modules"), "node_modules");
}
const B = await import("./lib/browser.mjs"); // namespace: BASE cambia al elegir servidor (un destructurado copiaría el valor viejo)
const { WT, POOL, lock, lockState, portOf, rcProcs, servedFile, leaseState, srvBusy, restartServer, pickServer } = B;

const sh = (c, o = {}) => execSync(c, { stdio: "inherit", ...o });
const procs = rcProcs;
const cmd = process.argv[2] ?? "restart";

if (cmd === "ls") {
  for (const p of procs()) console.log(`${p.name.padEnd(28)} :${portOf(p)}  ${p.pm2_env.status.padEnd(8)} ${p.pm2_env.pm_cwd}${existsSync(p.pm2_env.pm_cwd) ? "" : "  (HUERFANO)"}`);
  console.log("candados (edad en s; estado vivo|muerto|sin latido|vencido; los no vivos se liberan con test:unlock):");
  const fs = readdirSync(tmpdir()).filter((f) => /^rc-(?:test-\d+|perf)(?:\.r\.\d+)?\.lock$/.test(f));
  for (const f of fs) { const st = lockState(join(tmpdir(), f)); if (st) console.log(`  ${f.replace(/\.lock$/, "").padEnd(22)} ${st.estado.padEnd(10)} ${String(st.edad).padStart(5)} s  ${st.text.replace(/\n/g, " | ")}`); }
  if (!fs.length) console.log("  (ninguno)");
  const hh = (t) => new Date(t).toLocaleTimeString(), newest = B.newestSrc().t;
  console.log(`grupo de servidores (alquiler por proceso; src más nuevo ${newest ? hh(newest) : "?"}):`);
  POOL.forEach((s, i) => {
    const l = leaseState(s.port), ps = procs().find((p) => p.name === s.name);
    let at = 0; try { at = +readFileSync(servedFile(s.port), "utf8"); } catch {}
    const uso = srvBusy(s) ? "OCUPADO" : "libre";
    const quien = !l ? "sin dueño" : `${l.alive ? "alquilado" : "alquiler muerto"} PID ${l.owner}, ${l.edad} s: ${l.cmd.replace(/^.*\/scripts\//, "").slice(0, 70)}`;
    console.log(`  #${i + 1} :${s.port} ${(ps?.pm2_env.status ?? "no creado").padEnd(8)} ${uso.padEnd(7)} código ${at ? hh(at) + (newest > at ? " (VIEJO)" : "") : "sin sello"}  ${quien}`);
  });
} else if (cmd === "unlock") {
  // Seguro: solo libera candados muertos, sin latido o vencidos (mata a sus dueños). `--force` libera TODOS (mata lectores vivos).
  const force = process.argv.includes("--force");
  for (const f of readdirSync(tmpdir()).filter((f) => /^rc-(?:test-\d+|perf)(?:\.r\.\d+)?\.lock$/.test(f))) {
    const p = join(tmpdir(), f), st = lockState(p); if (!st) continue;
    if (st.estado === "vivo" && !force) { console.log(`  ${f}: vivo (${st.edad} s), se deja`); continue; }
    if (st.estado !== "muerto") try { process.kill(st.pid, "SIGKILL"); } catch {}
    try { unlinkSync(p); } catch {}
    console.log(`  ${f}: ${st.estado}, liberado`);
  }
} else if (cmd === "down") {
  if (!WT) throw new Error("test:down solo borra servidores de worktrees; rc-test de la carpeta principal queda corriendo");
  sh(`pm2 delete ${WT.name}`);
} else {
  // Solo el servidor PROPIO (el alquilado por este agente, RC_SRV o el primer libre): los demás no se tocan ni se frenan.
  const mio = await pickServer({ restart: false });
  console.log(`test:restart: servidor ${mio.name} :${mio.port}; tomando el candado exclusivo (espera a sus lectores vivos; los colgados se liberan solos; tope RC_WAIT_MAX min)...`);
  await lock(B.SERVER_LOCK);
  console.log("candado tomado, reiniciando");
  const pool = new Set(POOL.map((s) => s.name));
  for (const p of procs()) if (!pool.has(p.name) && !existsSync(p.pm2_env.pm_cwd)) { console.log("borrando huérfano " + p.name); sh(`pm2 delete ${p.name}`); }
  if (!WT) await restartServer(mio);
  else {
    const env = { ...process.env, RC_TEST_NAME: WT.name, RC_TEST_PORT: String(WT.port) };
    if (procs().some((p) => p.name === WT.name)) sh(`pm2 restart ${WT.name} --update-env`, { env });
    else sh(`pm2 start ecosystem.config.cjs --only ${WT.name}`, { env });
    console.log(`${WT.name} en http://localhost:${WT.port}`);
  }
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 60000 && !ok) { try { await fetch(B.BASE, { signal: AbortSignal.timeout(1500) }); ok = true; } catch { await new Promise((r) => setTimeout(r, 500)); } }
  if (!ok) throw new Error(`${B.BASE} no responde tras 60 s: pm2 logs`);
  writeFileSync(servedFile(), String(Date.now()));
  console.log(`SERVIDOR LISTO ${B.BASE}: sirve el código actual (${new Date().toLocaleTimeString()}); shots/e2e/perf avisan si src/ cambia después.`);
}
