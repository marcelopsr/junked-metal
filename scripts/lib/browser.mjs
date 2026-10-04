// Navegador headless compartido por sim.mjs, shots.mjs y perf.mjs. Chromium headless shell (el liviano de Playwright) con la GPU real del Mac:
// sin las banderas ANGLE/Metal cae a SwiftShader (CPU), que es ~10x más lento y no mide nada útil. Las tres "disable-*" evitan que Chrome
// frene timers y render por creerse en segundo plano (ruido en mediciones). Server: pm2 `rc-test` (:5174, sin recarga); RC_URL lo cambia.
import { chromium } from "playwright";

export const BASE = process.env.RC_URL ?? "http://localhost:5174";
const ARGS = [
  ...(process.platform === "darwin" ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] : []), // ponytail: en Linux/Windows faltaría su propio backend (--use-angle=vulkan/d3d11); hoy solo se prueba en el Mac
  "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows", "--mute-audio",
];

/** Un solo navegador para toda la corrida. Avisa claro si rc-test no responde (no levanta servidores propios: ver CLAUDE.md). */
export async function launch() {
  try { await fetch(BASE, { signal: AbortSignal.timeout(3000) }); }
  catch { throw new Error(`No responde ${BASE}. Arrancarlo con: pm2 restart rc-test (o pm2 start ecosystem.config.cjs)`); }
  return chromium.launch({ headless: true, args: ARGS });
}

export const VIEWPORTS = { pc: { width: 1280, height: 720 }, cel: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
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
  await page.goto(BASE + "/" + query, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.__sim === "function", null, { timeout: 90000, polling: 50 });
  const portada = await page.evaluate(() => window.__tPortada ?? null);
  if (freeze) await page.evaluate(() => { const e = window.__scene.getEngine(); e.stopRenderLoop(); e.getDeltaTime = () => 1000 / 60; }); // y el paso de tiempo de cada cuadro queda fijo en 1/60 s
  page.t = { portada: portada && Math.round(portada), listo: Date.now() - t0 };
  page.ctx = ctx;
  return page;
}
