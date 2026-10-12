// `npm run test:net`: prueba de punta a punta del online de 2 (R6b, src/net.ts) con 2 pestañas de UN Chromium headless contra rc-test.
// Anfitrión crea la sala, cliente se une con el código; verifica snapshots (autos y bichos se mueven), input del cliente -> players[1],
// decisión del teleportador del cliente -> applyCommand en el anfitrión, y el corte al cerrar cada lado. Usa PeerJS Cloud (necesita internet).
// Por qué el permiso de micrófono falso: sin permiso de medios Chrome solo junta candidatos ICE de la interfaz de la ruta por defecto
// (en esta Mac, el túnel de Cloudflare WARP, que no devuelve paquetes a sí mismo) y el DataChannel nunca abre. Con el permiso enumera
// todas las interfaces (LAN, loopback). Es solo de la prueba: en producción cada jugador está en su máquina y alcanza con STUN.
import { launch, open } from "./lib/browser.mjs";

const ARGS = ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--disable-features=WebRtcHideLocalIpsWithMdns", "--allow-loopback-in-peer-connection"];
const ok = [], fail = [];
const check = (name, cond, extra = "") => { (cond ? ok : fail).push(name); console.log(`${cond ? "OK  " : "FALLA"} ${name}${extra ? "  " + extra : ""}`); };
const wait = (page, fn, arg, ms = 30000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 100 });
const info = (page) => page.evaluate(() => window.__net.info());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Una partida online nueva: dos pestañas con la sala ya conectada y la run en marcha en ambas. */
async function pair(browser) {
  const [h, c] = await Promise.all([open(browser, "?mute&seed=7"), open(browser, "?mute")]);
  for (const p of [h, c]) {
    await p.ctx.grantPermissions(["microphone"]);
    await p.evaluate(async () => (await navigator.mediaDevices.getUserMedia({ audio: true })).getTracks().forEach((t) => t.stop()));
  }
  await h.evaluate(() => document.getElementById("netHost").click());
  await wait(h, () => /Sala [A-Z0-9]{6}/.test(document.getElementById("netStatus").textContent));
  const code = (await h.evaluate(() => document.getElementById("netStatus").textContent)).match(/Sala ([A-Z0-9]{6})/)[1];
  await c.evaluate((code) => { document.getElementById("netCode").value = code; document.getElementById("netJoin").click(); }, code);
  await wait(h, () => window.__net.info().state === "play", null, 90000);
  await wait(c, () => window.__net.info().state === "net" && window.__net.info().buf > 2, null, 90000);
  return { h, c, code };
}

const browser = await launch({ args: ARGS });
try {
  // 1) Conexión, snapshots, input y teleportador
  let { h, c, code } = await pair(browser);
  check("sala creada y cliente unido", true, code);
  const c0 = await info(c);
  await c.keyboard.down("KeyW");
  await wait(h, () => window.__net.info().netIn.throttle > 0, null, 5000).catch(() => {});
  const h1 = await info(h);
  check("input del cliente llega al anfitrión (netIn)", h1.netIn.throttle > 0, JSON.stringify(h1.netIn));
  const p1a = (await info(h)).p[1].pos;
  await sleep(2500);
  await c.keyboard.up("KeyW");
  const p1b = (await info(h)).p[1].pos;
  const d1 = Math.hypot(p1b[0] - p1a[0], p1b[1] - p1a[1]);
  check("players[1] se mueve en el anfitrión con el input del cliente", d1 > 1, `${d1.toFixed(1)} m`);
  const c1 = await info(c);
  const dc = Math.hypot(c1.p[1].pos[0] - c0.p[1].pos[0], c1.p[1].pos[1] - c0.p[1].pos[1]);
  check("el cliente ve su auto moverse por snapshots", dc > 1, `${dc.toFixed(1)} m`);
  check("el cliente sigue el reloj del anfitrión", c1.time > c0.time, `${c0.time} -> ${c1.time}`);
  await wait(c, () => window.__net.info().enemies > 0, null, 30000).catch(() => {});
  const e0 = await info(c); await sleep(1500); const e1 = await info(c);
  check("el cliente ve bichos y se mueven", e0.enemies > 0 && e0.e0 && e1.e0 && (e0.e0[0] !== e1.e0[0] || e0.e0[1] !== e1.e0[1]), `${e1.enemies} bichos`);

  // Teleportador: el anfitrión lo hace aterrizar y lo activa; el cliente elige con su tecla (Z = opción 0) -> applyCommand en el anfitrión
  await h.evaluate(() => { window.__enc.land(); window.__enc.board(); });
  const ph0 = (await info(h)).phase;
  await wait(c, (ph) => window.__net.info().phase === ph, ph0, 5000).catch(() => {});
  check("el cliente recibe la fase del teleportador", (await info(c)).phase === ph0, ph0);
  await c.keyboard.press("KeyZ");
  await wait(h, (ph) => window.__net.info().phase !== ph, ph0, 5000).catch(() => {});
  const ph1 = (await info(h)).phase;
  check("decisión del cliente aplicada en el anfitrión (applyCommand)", ph1 !== ph0, `${ph0} -> ${ph1}`);

  // 2) Cierra el cliente: el anfitrión sigue solo
  await c.ctx.close();
  await wait(h, () => !window.__net.info().net, null, 30000).catch(() => {});
  const hc = await info(h);
  check("al cerrar el cliente el anfitrión sigue en solitario", !hc.net && hc.state !== "menu" && hc.p.length === 1, `state=${hc.state} jugadores=${hc.p.length}`);
  check("sin errores en el anfitrión", !h.logs.length, h.logs.join(" | "));
  await h.ctx.close();

  // 3) Cierra el anfitrión: el cliente vuelve al menú con el aviso
  ({ h, c } = await pair(browser));
  await h.ctx.close();
  await wait(c, () => window.__net.info().state === "menu", null, 30000).catch(() => {});
  const cc = await info(c);
  check("al cerrar el anfitrión el cliente vuelve al menú con aviso", cc.state === "menu" && !cc.net && !!cc.status, `state=${cc.state} "${cc.status}"`);
  check("sin errores en el cliente", !c.logs.length, c.logs.join(" | "));
  await c.ctx.close();
} catch (e) {
  fail.push(e.message); console.error("FALLA " + e.message);
} finally {
  await browser.close();
}
console.log(`\n${ok.length} OK, ${fail.length} fallas`);
process.exit(fail.length ? 1 : 0);
