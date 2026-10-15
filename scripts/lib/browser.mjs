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
export const BASE = process.env.RC_URL ?? `http://localhost:${WT?.port ?? 5174}`;
const ARGS = [
  ...(process.platform === "darwin" ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] : []), // ponytail: en Linux/Windows faltaría su propio backend (--use-angle=vulkan/d3d11); hoy solo se prueba en el Mac
  "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows", "--mute-audio",
];

export const lockFile = (name) => join(tmpdir(), name + ".lock");
export const SERVER_LOCK = "rc-test-" + (new URL(BASE).port || 80); // un candado por servidor
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
const release = () => { for (const f of held) try { if (parseInt(readFileSync(f, "utf8")) === process.pid) unlinkSync(f); } catch {} };
const WAIT_MAX = Number(process.env.RC_WAIT_MAX ?? 15) * 60; // s: tope de espera
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
  startHeartbeat();
  if (!held.size) { process.on("exit", release); for (const sg of ["SIGINT", "SIGTERM"]) process.on(sg, () => process.exit(130)); }
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

/** Sello de test:restart: instante en que el servidor quedó sirviendo. Si algo de src/ es más nuevo, el servidor (sin recarga) tiene código viejo. */
export const servedFile = (port = new URL(BASE).port || 80) => join(tmpdir(), `rc-test-${port}.served`);
export const newestSrc = () => { let best = { t: 0, f: "" }; for (const d of ["src", "index.html", "public"]) { try { for (const f of readdirSync(d, { recursive: true })) { const p = d === "index.html" ? d : join(d, f); const st = statSync(p); if (st.mtimeMs > best.t && st.isFile()) best = { t: st.mtimeMs, f: p }; } } catch {} } return best; };
const checkFresh = () => {
  if (process.env.RC_URL) return; // servidor ajeno: no se sabe qué carpeta sirve
  let at; try { at = +readFileSync(servedFile(), "utf8"); } catch { console.error("AVISO: sin sello de test:restart; no se sabe si el servidor sirve el código actual."); return; }
  const n = newestSrc(), hh = (t) => new Date(t).toLocaleTimeString();
  if (n.t > at) console.error(`AVISO: SERVIDOR DESACTUALIZADO. ${n.f} cambió a las ${hh(n.t)} y el servidor se reinició a las ${hh(at)}. Si ese cambio es tuyo: npm run test:restart.`);
};

/** Un solo navegador para toda la corrida. Espera hasta ~30 s a que rc-test responda (no levanta servidores propios: ver CLAUDE.md). */
export async function launch({ perf = false, args = [] } = {}) {
  let ok = false;
  for (let i = 0; i < 60 && !ok; i++) {
    try { await fetch(BASE, { signal: AbortSignal.timeout(1500) }); ok = true; }
    catch {
      if (i === 0) process.stderr.write(`Esperando a que ${BASE} responda...`);
      else if (i % 3 === 0) process.stderr.write(".");
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  if (!ok) throw new Error(`\nNo responde ${BASE} tras 24 s. Arrancarlo con: npm run test:restart`);
  // Primero el global, después el del servidor (mismo orden en todos: sin espera circular). perf: exclusivo en ambos (mide sin vecinos);
  // el resto comparte, y solo frena mientras corre un perf o un test:restart.
  checkFresh();
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
