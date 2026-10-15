// Navegador headless compartido por sim.mjs, shots.mjs y perf.mjs. Chromium headless shell (el liviano de Playwright) con la GPU real del Mac:
// sin las banderas ANGLE/Metal cae a SwiftShader (CPU), que es ~10x más lento y no mide nada útil. Las tres "disable-*" evitan que Chrome
// frene timers y render por creerse en segundo plano (ruido en mediciones). Server: pm2 `rc-test` (:5174, sin recarga) o, en un worktree, `rc-test-<carpeta>` (5200-5299); RC_URL lo cambia; RC_Q agrega parámetros a todas las URL.
import { chromium } from "playwright";
import { closeSync, openSync, readdirSync, readFileSync, statSync, unlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { execSync } from "node:child_process";
import { basename, dirname } from "node:path";

/** Worktree secundario de git (toplevel != carpeta padre del git-common-dir): su propio rc-test-<nombre> en un puerto 5200-5299 fijo por ruta. null en la carpeta principal. */
const git = (a) => execSync("git " + a, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
/** Procesos pm2 rc-test / rc-test-*. */
export const rcProcs = () => { try { return JSON.parse(execSync("pm2 jlist", { encoding: "utf8", maxBuffer: 1e8, stdio: ["ignore", "pipe", "ignore"] }).replace(/^[^[]*/, "")).filter((p) => /^rc-test(-|$)/.test(p.name)); } catch { return []; } };
export const portOf = (p) => p.pm2_env.RC_TEST_PORT ?? p.pm2_env.env?.RC_TEST_PORT ?? 5174;
export const WT = (() => {
  try {
    const top = git("rev-parse --show-toplevel");
    if (top === dirname(git("rev-parse --path-format=absolute --git-common-dir"))) return null;
    const h = [...top].reduce((x, c) => (x * 31 + c.charCodeAt(0)) >>> 0, 7);
    const ps = rcProcs();
    // mismo basename en otra ruta: sufijo del hash para que no choquen en pm2
    let name = "rc-test-" + basename(top);
    if (ps.some((p) => p.name === name && p.pm2_env.pm_cwd !== top)) name += "-" + (h % 1296).toString(36);
    const mine = ps.find((p) => p.name === name);
    if (mine) return { top, port: Number(portOf(mine)), name };
    // puerto del hash; si otro rc-test-* de pm2 o cualquier proceso lo usa, el siguiente libre de 5200-5299
    const used = new Set(ps.map(portOf).map(Number));
    const busy = (q) => { try { return !!execSync(`lsof -ti tcp:${q} -sTCP:LISTEN`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return false; } };
    let port = 5200 + h % 100;
    for (let i = 0; i < 100 && (used.has(port) || busy(port)); i++) port = 5200 + ((port - 5200 + 1) % 100);
    return { top, port, name };
  } catch { return null; }
})();
/** Grupo de servidores de prueba sobre el MISMO árbol: rc-test :5174 + rc-test-2..6 :5175-5179 (RC_POOL=N cambia la cantidad). En worktree o con RC_URL: uno solo. */
export const POOL = WT ? [{ name: WT.name, port: WT.port }] : Array.from({ length: Number(process.env.RC_POOL ?? 6) }, (_, i) => ({ name: i ? `rc-test-${i + 1}` : "rc-test", port: 5174 + i }));
// let exportado: launch() lo reasigna al elegir servidor y los importadores (`import { BASE }`) ven el valor nuevo
export let BASE = process.env.RC_URL ?? `http://localhost:${WT?.port ?? 5174}`;
const ARGS = [
  ...(process.platform === "darwin" ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] : []), // ponytail: en Linux/Windows faltaría su propio backend (--use-angle=vulkan/d3d11); hoy solo se prueba en el Mac
  "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows", "--mute-audio",
];

export const lockFile = (name) => join(tmpdir(), name + ".lock");
export let SERVER_LOCK = "rc-test-" + (new URL(BASE).port || 80); // un candado por servidor
export const PERF_LOCK = "rc-perf"; // global: dos perf a la vez ensucian ms/cuadro aunque usen servidores distintos
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } };
// Latido: cada candado propio se "toca" cada HB ms. Sin latido > STALE, o más viejo que TTL, el dueño se da por colgado: el que espera lo mata y libera.
const HB = 10e3, STALE = 45e3, TTL = Number(process.env.RC_LOCK_TTL ?? 20) * 60e3; // TTL: tope de vida de un lector/exclusivo (min)
/** Estado de un archivo de candado: {pid, text, edad (s), estado: vivo|muerto|sin latido|vencido}. Los candados sin "t=" (versión vieja, sin latido) solo vencen por TTL de mtime. */
export const lockState = (path) => {
  try {
    const text = readFileSync(path, "utf8"), pid = parseInt(text), m = /^t=(\d+)$/m.exec(text), now = Date.now(), mt = statSync(path).mtimeMs;
    const edad = Math.round((now - (m ? +m[1] : mt)) / 1000);
    const estado = !alive(pid) ? "muerto" : (m ? now - +m[1] > TTL : now - mt > TTL) ? "vencido" : m && now - mt > STALE ? "sin latido" : "vivo";
    return { pid, text: text.replace(/^t=\d+$/m, "").trim(), edad, estado };
  } catch { return null; }
};
/** Si el candado no está vivo lo libera (mata al dueño si seguía en pie). Devuelve el estado si sigue vivo, null si estaba libre o se liberó. */
const reap = (path) => {
  const st = lockState(path); if (!st) return null;
  if (st.estado === "vivo" || st.pid === process.pid) return st;
  if (st.estado !== "muerto") { console.error(`candado ${path.split("/").pop()}: PID ${st.pid} ${st.estado} (${st.edad} s), se mata y se libera`); try { process.kill(st.pid, "SIGKILL"); } catch {} }
  try { unlinkSync(path); } catch {}
  return null;
};
export const lockInfo = (name) => { const st = reap(lockFile(name)); return st ? st.text : null; }; // quién lo tiene (null si libre, muerto o colgado)
const held = new Set(); // nombres de archivo propios (exclusivos y de lector)
const release = () => { for (const f of held) try { if (parseInt(readFileSync(f, "utf8")) === process.pid) unlinkSync(f); } catch {} held.clear(); };
/** Suelta un candado exclusivo propio sin terminar el proceso. */
export const unlock = (name = SERVER_LOCK) => { const f = lockFile(name); if (held.delete(f)) try { unlinkSync(f); } catch {} };
export const releaseAll = release;
export const WAIT_MAX =Number(process.env.RC_WAIT_MAX ?? 15) * 60; // s: tope de espera
const EXCL_MAX = Number(process.env.RC_EXCL_WAIT ?? 3) * 60; // s: cuánto espera un exclusivo a que terminen los lectores
const readerFile = (name, pid = process.pid) => join(tmpdir(), `${name}.r.${pid}.lock`);
/** Lectores vivos de `name` (libera los muertos/colgados). Con {todos:true} devuelve también su estado. */
export const readers = (name) => readdirSync(tmpdir()).filter((f) => f.startsWith(name + ".r.")).flatMap((f) => {
  const pid = parseInt(f.slice(name.length + 3)); if (pid === process.pid) return [];
  const st = reap(join(tmpdir(), f)); return st ? [st.text + `\n(${st.edad} s)`] : [];
});
const stamp = () => `${process.pid}\n${process.argv.slice(1).join(" ")}\n${process.cwd()}\nt=${Date.now()}`;
let hb;
const startHeartbeat = () => {
  if (hb) return;
  hb = setInterval(() => { const n = new Date(); for (const f of held) try { utimesSync(f, n, n); } catch {} }, HB); hb.unref();
  // si el propio proceso se cuelga en un paso, se corta solo al vencer el TTL
  setTimeout(() => { console.error(`candado vencido (RC_LOCK_TTL=${TTL / 60e3} min): se aborta este proceso`); process.exit(124); }, TTL).unref();
};
let hooked = false; // al primer candado/alquiler: latido y limpieza al salir
const hook = () => { if (hooked) return; hooked = true; startHeartbeat(); process.on("exit", release); for (const sg of ["SIGINT", "SIGTERM"]) process.on(sg, () => process.exit(130)); };
async function wait(name, t, quien, max = WAIT_MAX) {
  if (t === 0) console.error(`${name} ocupado, esperando (máx ${max / 60} min):\n  ${quien.replace(/\n/g, "\n  ")}`);
  if (t >= max) throw new Error(`${name} sigue ocupado tras ${max / 60} min:\n${quien}`);
  await new Promise((r) => setTimeout(r, 1000));
}

/**
 * Candado lector/escritor entre procesos (también entre agentes). `shared` (shots, sim, evo, e2e): varios a la vez, solo esperan a un exclusivo.
 * Exclusivo (`test:restart`, perf): toma el archivo primero (frena lectores nuevos) y espera a que los lectores terminen. PID muerto = libre.
 */
export async function lock(name = SERVER_LOCK, { shared = false } = {}) {
  const f = lockFile(name), mine = shared ? readerFile(name) : f;
  if (held.has(mine)) return;
  hook();
  for (let t = 0; ; t++) {
    if (shared) {
      const ex = lockInfo(name);
      if (!ex) { writeFileSync(mine, stamp()); held.add(mine); if (!lockInfo(name)) return; unlinkSync(mine); held.delete(mine); }
      await wait(name, t, ex ?? "exclusivo recién tomado");
      continue;
    }
    try { const fd = openSync(f, "wx"); writeFileSync(fd, stamp()); closeSync(fd); held.add(f); break; }
    catch (e) {
      if (e.code !== "EEXIST") throw e;
      const quien = lockInfo(name);
      if (!quien) { try { unlinkSync(f); } catch {} continue; }
      await wait(name, t, quien);
    }
  }
  // El exclusivo frena lectores nuevos mientras espera: tope corto y, si se rinde, suelta la marca (no deja a todos bloqueados por un lector colgado).
  try { for (let t = 0, r; (r = readers(name)).length; t++) await wait(name, t, `${r.length} lector(es):\n` + r.join("\n---\n"), EXCL_MAX); }
  catch (e) { held.delete(f); try { unlinkSync(f); } catch {} throw e; }
}

// Los servidores de prueba sirven SIEMPRE el código actual (Vite con watcher y sin HMR: cada página nueva carga lo último), así que nunca se reinician por código viejo.
// ── Grupo de servidores: alquiler por PROCESO ─────────────────────────────────────────────────────────────
// Cada proceso (shots, e2e, sim, script suelto, test:restart) alquila un servidor libre mientras vive (el archivo se borra al salir o, si muere, deja de contar). Dos procesos de
// agentes distintos nunca comparten servidor, así un test:restart solo toca uno que nadie usa. Preferencia (no exclusiva): el último servidor de esta sesión de agente (caché de Vite
// tibio). RC_SRV=3 (o =5176) fuerza uno y se comparte como lector. Nunca se reinicia por código viejo: solo se levanta si está caído.
// ponytail: la sesión se reconoce por el ancestro `claude` solo para la preferencia; si más procesos que servidores, esperan al primero que se libere.
const ROOT = join(dirname(new URL(import.meta.url).pathname), "..", "..");
const SESSION = (() => { let p = process.ppid; for (let i = 0; i < 12 && p > 1; i++) { try { const [pp, ...c] = execSync(`ps -o ppid=,comm= -p ${p}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split(/\s+/); if (/(^|\/)claude$/.test(c.join(" "))) return p; p = +pp; } catch { break; } } return 0; })();
const hintFile = () => join(tmpdir(), `rc-srv-hint-${SESSION}`);
export const leaseFile = (port) => join(tmpdir(), `rc-srv-${port}.lease`);
export const leaseState = (port) => { try { const t = readFileSync(leaseFile(port), "utf8"), owner = parseInt(t); return { owner, cmd: t.split("\n")[1] ?? "", edad: Math.round((Date.now() - statSync(leaseFile(port)).birthtimeMs) / 1000), alive: alive(owner) }; } catch { return null; } };
/** Quién usa el servidor ahora: exclusivo (test:restart/perf) o lectores vivos. */
export const srvBusy = (s) => { const n = "rc-test-" + s.port; return lockInfo(n) || readers(n).length > 0; };
const mine = (s) => leaseState(s.port)?.owner === process.pid;
const claim = (s) => {
  if (mine(s)) return true;
  const l = leaseState(s.port), f = leaseFile(s.port);
  if ((l?.alive) || srvBusy(s)) return false;
  try { unlinkSync(f); } catch {}
  try { const fd = openSync(f, "wx"); writeFileSync(fd, `${process.pid}\n${process.argv.slice(1).join(" ")}\n${process.cwd()}`); closeSync(fd); } catch { return false; } // perdió la carrera con otro agente
  hook(); held.add(f); // se borra al salir (release); el latido lo toca
  return true;
};
const up = async (port) => { try { await fetch(`http://localhost:${port}`, { signal: AbortSignal.timeout(1500) }); return true; } catch { return false; } };
/**
 * Asegura que el servidor de pm2 `s` responde. Arriba: no hace nada. Ausente o detenido: lo levanta. Online pero sin responder `hangS` s (colgado de verdad): lo reinicia.
 * Quien llama garantiza que nadie más lo usa (alquiler propio o candado exclusivo). Devuelve true si tuvo que arrancarlo.
 */
export async function ensureServer(s, hangS = 30) {
  if (await up(s.port)) return false;
  const sh = (c) => execSync(c, { cwd: ROOT, stdio: ["ignore", "pipe", "inherit"] });
  const p = rcProcs().find((x) => x.name === s.name);
  if (!p) sh(`pm2 start ecosystem.config.cjs --only ${s.name}`);
  else if (p.pm2_env.status !== "online") sh(`pm2 restart ${s.name} --update-env`);
  else { // online sin responder: puede estar arrancando; reinicio solo si sigue mudo tras hangS
    const t0 = Date.now(); while (Date.now() - t0 < hangS * 1000) { if (await up(s.port)) return false; await new Promise((r) => setTimeout(r, 500)); }
    process.stderr.write(`servidor :${s.port} (${s.name}) colgado (sin HTTP ${hangS} s): reiniciando\n`); sh(`pm2 restart ${s.name} --update-env`);
  }
  const t0 = Date.now(); while (!(await up(s.port))) { if (Date.now() - t0 > 60000) throw new Error(`:${s.port} no responde tras 60 s: pm2 logs ${s.name}`); await new Promise((r) => setTimeout(r, 500)); }
  return true;
}
/**
 * Elige el servidor de este proceso: el de RC_SRV, el que su agente ya tiene alquilado, o el primero libre (sin alquiler vivo ni lectores). Si todos están ocupados espera al primero que se libere.
 * Con RC_URL o en worktree no hace nada (un solo servidor). `ensure:false` (test:restart) no levanta nada: lo hace quien llama. Devuelve el servidor.
 */
export async function pickServer({ ensure = true } = {}) {
  if (process.env.RC_URL || POOL.length < 2) return POOL[0];
  const sel = process.env.RC_SRV;
  let s = sel ? POOL.find((x, i) => String(x.port) === sel || String(i + 1) === sel) : POOL.find(mine);
  if (sel && !s) throw new Error(`RC_SRV=${sel} no es un servidor del grupo (1-${POOL.length} o ${POOL[0].port}-${POOL.at(-1).port})`);
  if (s && !mine(s)) claim(s);
  let hint = 0; try { hint = +readFileSync(hintFile(), "utf8"); } catch {}
  const orden = [...POOL.filter((x) => x.port === hint), ...POOL.filter((x) => x.port !== hint)];
  for (let t = 0; !s; t++) {
    s = orden.find(claim);
    if (!s) await wait("servidores de prueba", t, POOL.map((x) => `:${x.port} ${leaseState(x.port)?.cmd?.slice(0, 80) ?? "(en uso por un lector)"}`).join("\n"));
  }
  if (SESSION) writeFileSync(hintFile(), String(s.port));
  BASE = `http://localhost:${s.port}`; SERVER_LOCK = "rc-test-" + s.port;
  // caído: lo levanto yo bajo candado exclusivo (si lo alquilé, nadie más lo usa; forzado por RC_SRV compartido, el candado espera a sus lectores). Arriba: no se toca.
  if (ensure && !(await up(s.port))) { await lock(SERVER_LOCK); try { await ensureServer(s); } finally { unlock(SERVER_LOCK); } }
  return s;
}

/** Corre fn(browser) con timeout y cierre garantizado: el candado se suelta aunque fn falle o se cuelgue (a los `timeoutMs` el proceso sale con 124). Para scripts sueltos de agentes. */
export async function withBrowser(fn, { perf = false, args = [], timeoutMs = 10 * 60e3 } = {}) {
  const tm = setTimeout(() => { console.error(`withBrowser: más de ${timeoutMs / 60e3} min, se aborta`); process.exit(124); }, timeoutMs); tm.unref();
  let b;
  try { b = await launch({ perf, args }); return await fn(b); }
  finally { clearTimeout(tm); await b?.close().catch(() => {}); release(); }
}

/** Un solo navegador para toda la corrida. Elige servidor del grupo (ver pickServer) y espera hasta ~30 s a que responda. */
export async function launch({ perf = false, args = [] } = {}) {
  await pickServer();
  let ok = false;
  for (let i = 0; i < 60 && !ok; i++) {
    try { await fetch(BASE, { signal: AbortSignal.timeout(1500) }); ok = true; }
    catch {
      if (i === 0) process.stderr.write(`Esperando a que ${BASE} responda...`);
      else if (i % 3 === 0) process.stderr.write(".");
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  if (!ok) throw new Error(`\nNo responde ${BASE} tras 24 s. Asegurarlo con: npm run test:restart`);
  // Primero el global, después el del servidor (mismo orden en todos: sin espera circular). perf: exclusivo en ambos (mide sin vecinos);
  // el resto comparte, y solo frena mientras corre un perf o un test:restart.
  await lock(PERF_LOCK, { shared: !perf });
  await lock(SERVER_LOCK, { shared: !perf });
  return chromium.launch({ headless: true, args: [...ARGS, ...args] });
}

export const VIEWPORTS = { pc: { width: 1280, height: 720 }, nb: { width: 1440, height: 900 }, // nb: notebook, solo a pedido (--vp nb)
  cel: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  tab: { width: 820, height: 1180, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }, // tablet vertical, solo a pedido (--vp tab)
  celh: { width: 844, height: 390, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } }; // celh: celular apaisado, solo a pedido (--vp celh)

/**
 * Pestaña limpia (contexto nuevo = localStorage vacío y partida desde cero) en `query` (p. ej. "?mute&seed=3").
 * Espera a que estén los hooks de dev de main.ts (__sim aparece cuando termina la precarga). Devuelve la página con
 * `freeze`: detiene el bucle de dibujo del juego (el tiempo real ya no mueve nada, cada cuadro dura 1/60 s: capturas y mediciones reproducibles); los cuadros se dibujan a mano con __tick(n).
 * `page.t = { portada, listo }` (ms desde el inicio: pantalla de carga cerrada / precarga completa) y `page.logs` (errores de consola).
 */
export async function open(browser, query, vp = "pc", { freeze = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: VIEWPORTS[vp].width, height: VIEWPORTS[vp].height }, ...VIEWPORTS[vp] });
  // Tope global de la apertura (carga + hooks): al vencer se cierra el contexto y las esperas de playwright fallan, en vez de quedar colgadas con el candado tomado
  let vencio = false; const guard = setTimeout(() => { vencio = true; ctx.close().catch(() => {}); }, OPEN_MAX); guard.unref();
  try { return await openIn(ctx, query, vp, freeze); }
  catch (e) { throw vencio ? new Error(`open(${query}, ${vp}) superó ${OPEN_MAX / 1000} s (RC_OPEN_MAX): el servidor ${BASE} no terminó de cargar`) : e; }
  finally { clearTimeout(guard); }
}
const OPEN_MAX = Number(process.env.RC_OPEN_MAX ?? 200) * 1000; // la precarga en frío tarda hasta ~90 s
async function openIn(ctx, query, vp, freeze) {
  const page = await ctx.newPage();
  page.logs = [];
  page.on("pageerror", (e) => page.logs.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") page.logs.push(m.text().slice(0, 200)); });
  // Marca el instante en que bootEnd() cierra la pantalla de carga (clase "out" en #load): "tiempo hasta portada"
  await page.addInitScript(() => {
    new MutationObserver((_, o) => { const l = document.getElementById("load"); if (l?.classList.contains("out")) { window.__tPortada = performance.now(); o.disconnect(); } }).observe(document, { subtree: true, attributes: true, childList: true });
  });
  const t0 = Date.now();
  await page.goto(BASE + "/" + query + (process.env.RC_Q ?? ""), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.__sim === "function", null, { timeout: 150000, polling: 50 }); // 13× VAT GLB en headless frío puede pasar 90 s
  // Recarga inesperada (Vite/HMR, dependencia nueva): el escenario seguiría sobre una página distinta; mejor cortar claro.
  page.on("framenavigated", (f) => { if (f === page.mainFrame()) { console.error("la página se recargó sola (¿Vite/HMR?): " + f.url()); process.exit(1); } });
  const portada = await page.evaluate(() => window.__tPortada ?? null);
  if (freeze) await page.evaluate(() => { const e = window.__scene.getEngine(); e.stopRenderLoop(); e.getDeltaTime = () => 1000 / 60; }); // y el paso de tiempo de cada cuadro queda fijo en 1/60 s
  page.t = { portada: portada && Math.round(portada), listo: Date.now() - t0 };
  page.ctx = ctx;
  return page;
}
