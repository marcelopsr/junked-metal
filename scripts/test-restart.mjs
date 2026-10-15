// Servidores de prueba (se autogestionan: sirven siempre el código actual, nadie los reinicia). `npm run test:restart` = asegurar que están arriba (si lo están, no hace nada), `test:down` (borra el del worktree actual), `test:ls` (lista servidores y candados).
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
const { WT, POOL, lock, lockState, portOf, rcProcs, leaseState, srvBusy, ensureServer } = B;

const sh = (c, o = {}) => execSync(c, { stdio: "inherit", ...o });
const procs = rcProcs;
const cmd = process.argv[2] ?? "restart";

if (cmd === "ls") {
  for (const p of procs()) console.log(`${p.name.padEnd(28)} :${portOf(p)}  ${p.pm2_env.status.padEnd(8)} ${p.pm2_env.pm_cwd}${existsSync(p.pm2_env.pm_cwd) ? "" : "  (HUERFANO)"}`);
  console.log("candados (edad en s; estado vivo|muerto|sin latido|vencido; los no vivos se liberan con test:unlock):");
  const fs = readdirSync(tmpdir()).filter((f) => /^rc-(?:test-\d+|perf)(?:\.r\.\d+)?\.lock$/.test(f));
  for (const f of fs) { const st = lockState(join(tmpdir(), f)); if (st) console.log(`  ${f.replace(/\.lock$/, "").padEnd(22)} ${st.estado.padEnd(10)} ${String(st.edad).padStart(5)} s  ${st.text.replace(/\n/g, " | ")}`); }
  if (!fs.length) console.log("  (ninguno)");
  console.log("grupo de servidores (alquiler por proceso; sirven siempre el código actual):");
  POOL.forEach((s, i) => {
    const l = leaseState(s.port), ps = procs().find((p) => p.name === s.name);
    const up = ps?.pm2_env.pm_uptime ? Math.round((Date.now() - ps.pm2_env.pm_uptime) / 60e3) + " min" : "?";
    const uso = srvBusy(s) ? "OCUPADO" : "libre";
    const quien = !l ? "sin dueño" : `${l.alive ? "alquilado" : "alquiler muerto"} PID ${l.owner}, ${l.edad} s: ${l.cmd.replace(/^.*\/scripts\//, "").slice(0, 70)}`;
    console.log(`  #${i + 1} :${s.port} ${(ps?.pm2_env.status ?? "no creado").padEnd(8)} ${uso.padEnd(7)} activo ${up}  ${quien}`);
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
  if (!WT) throw new Error("test:down solo borra el servidor del worktree actual; el grupo rc-test, rc-test-2..6 nunca se borra");
  sh(`pm2 delete ${WT.name}`); // solo el propio: nunca el grupo ni otros worktrees
} else {
  // test:restart = ASEGURAR que el servidor está arriba. Si responde no se toca (uptime intacto). Solo si está caído o colgado de verdad (sin HTTP 30 s) se levanta/reinicia,
  // y un servidor alquilado o con lectores no se toca: se espera a que se libere (tope RC_WAIT_MAX min).
  console.log("test:restart: ya no reinicia. Los servidores sirven siempre el código actual (Vite con watcher, sin HMR); solo se asegura que estén arriba.");
  const asegurar = async (s, env) => {
    if (await up(s.port)) return console.log(`  ${s.name} :${s.port} arriba, sin cambios`);
    for (let t = 0; !WT && (leaseState(s.port)?.alive || srvBusy(s)); t++) { if (t > B.WAIT_MAX) throw new Error(`${s.name} sigue en uso`); if (!t) console.log(`  ${s.name} no responde pero está en uso: esperando`); await new Promise((r) => setTimeout(r, 1000)); }
    if (await up(s.port)) return console.log(`  ${s.name} :${s.port} arriba, sin cambios`);
    console.log(`  ${s.name} :${s.port} caído o colgado: levantando`);
    if (WT) { // worktree: pm2 start con su nombre y puerto
      const p = procs().find((x) => x.name === WT.name), e = { ...process.env, RC_TEST_NAME: WT.name, RC_TEST_PORT: String(WT.port) };
      if (!p) sh(`pm2 start ecosystem.config.cjs --only ${WT.name}`, { env: e }); else await ensureServer(s);
    } else { await lock(`rc-test-${s.port}`); try { await ensureServer(s); } finally { B.unlock(`rc-test-${s.port}`); } }
    if (!(await up(s.port))) { const t0 = Date.now(); while (Date.now() - t0 < 60000 && !(await up(s.port))) await new Promise((r) => setTimeout(r, 500)); }
    if (!(await up(s.port))) throw new Error(`${s.name} :${s.port} no responde tras 60 s: pm2 logs ${s.name}`);
  };
  const up = async (port) => { try { await fetch(`http://localhost:${port}`, { signal: AbortSignal.timeout(1500) }); return true; } catch { return false; } };
  // huérfanos: SOLO servidores de worktrees (rc-test-<carpeta>) cuya carpeta ya no existe; nunca rc-test ni rc-test-1..6 ni worktrees vivos
  for (const p of procs()) if (!/^rc-test(-[1-6])?$/.test(p.name) && p.name !== WT?.name && !existsSync(p.pm2_env.pm_cwd)) { console.log("borrando huérfano " + p.name); sh(`pm2 delete ${p.name}`); }
  for (const s of POOL) await asegurar(s);
  console.log(`SERVIDOR LISTO: ${POOL.map((s) => `:${s.port}`).join(" ")}`);
}
