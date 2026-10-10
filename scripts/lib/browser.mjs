// Navegador headless compartido por sim.mjs, shots.mjs y perf.mjs. Chromium headless shell (el liviano de Playwright) con la GPU real del Mac:
// sin las banderas ANGLE/Metal cae a SwiftShader (CPU), que es ~10x más lento y no mide nada útil. Las tres "disable-*" evitan que Chrome
// frene timers y render por creerse en segundo plano (ruido en mediciones). Server: pm2 `rc-test` (:5174, sin recarga) o, en un worktree, `rc-test-<carpeta>` (5200-5299); RC_URL lo cambia; RC_Q agrega parámetros a todas las URL.
import { chromium } from "playwright";
import { closeSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { execSync } from "node:child_process";
import { basename, dirname } from "node:path";

/** Worktree secundario de git (toplevel != carpeta padre del git-common-dir): su propio rc-test-<nombre> en un puerto 5200-5299 fijo por ruta. null en la carpeta principal. */
const git = (a) => execSync("git " + a, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
export const WT = (() => {
  try {
    const top = git("rev-parse --show-toplevel");
    if (top === dirname(git("rev-parse --path-format=absolute --git-common-dir"))) return null;
    // ponytail: hash de la ruta mod 100; dos worktrees pueden chocar de puerto (pm2 start falla con strictPort): renombrar uno. Subir a un registro si pasa seguido.
    const port = 5200 + [...top].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 100;
    return { top, port, name: "rc-test-" + basename(top) };
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
export const lockInfo = (name) => { try { const t = readFileSync(lockFile(name), "utf8"); return alive(parseInt(t)) ? t : null; } catch { return null; } }; // quién lo tiene (null si libre o PID muerto)
const held = new Set();
const release = () => { for (const n of held) try { if (parseInt(readFileSync(lockFile(n), "utf8")) === process.pid) unlinkSync(lockFile(n)); } catch {} };
const WAIT_MAX = 15 * 60; // s: tope de espera, por si quien tiene el candado quedó colgado

/** Candado (shots/perf/sim y `npm run test:restart` comparten servidor y CPU, también entre agentes): el segundo espera; un candado con PID muerto se ignora. */
export async function lock(name = SERVER_LOCK) {
  const f = lockFile(name);
  for (let avisado = false, t = 0; ; avisado = true, t++) {
    try { const fd = openSync(f, "wx"); writeFileSync(fd, `${process.pid}\n${process.argv.slice(1).join(" ")}\n${process.cwd()}`); closeSync(fd); break; }
    catch (e) {
      if (e.code !== "EEXIST") throw e;
      let pid = 0, quien = ""; try { quien = readFileSync(f, "utf8"); pid = parseInt(quien); } catch {}
      if (!pid || !alive(pid)) { try { unlinkSync(f); } catch {} continue; }
      if (!avisado) console.error(`${name} ocupado por otra corrida, esperando (máx ${WAIT_MAX / 60} min):\n  ${quien.replace(/\n/g, "\n  ")}`);
      if (t >= WAIT_MAX) throw new Error(`${name} sigue ocupado tras ${WAIT_MAX / 60} min por PID ${pid}; si está colgado: kill ${pid}`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  if (!held.size) { process.on("exit", release); for (const sg of ["SIGINT", "SIGTERM"]) process.on(sg, () => process.exit(130)); }
  held.add(name);
}

/** Un solo navegador para toda la corrida. Espera hasta ~30 s a que rc-test responda (no levanta servidores propios: ver CLAUDE.md). */
export async function launch({ perf = false } = {}) {
  let ok = false;
  for (let i = 0; i < 30 && !ok; i++) {
    try { await fetch(BASE, { signal: AbortSignal.timeout(3000) }); ok = true; }
    catch { await new Promise((r) => setTimeout(r, 1000)); }
  }
  if (!ok) throw new Error(`No responde ${BASE} tras 30 s. Arrancarlo con: npm run test:restart`);
  if (perf) await lock(PERF_LOCK); // primero el global, después el del servidor: sin espera circular
  await lock();
  return chromium.launch({ headless: true, args: ARGS });
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
