// `npm run test:net`: prueba de punta a punta del online de 2 (R6b, src/net.ts) con 2 pestañas de UN Chromium headless contra rc-test.
// Anfitrión crea la sala, cliente se une con el código; verifica snapshots (autos y bichos se mueven), input del cliente -> players[1],
// decisión del teleportador del cliente -> applyCommand en el anfitrión, y el corte al cerrar cada lado. Usa PeerJS Cloud (necesita internet).
// Por qué el permiso de micrófono falso: sin permiso de medios Chrome solo junta candidatos ICE de la interfaz de la ruta por defecto
// (en esta Mac, el túnel de Cloudflare WARP, que no devuelve paquetes a sí mismo) y el DataChannel nunca abre. Con el permiso enumera
// todas las interfaces (LAN, loopback). Es solo de la prueba: en producción cada jugador está en su máquina y alcanza con STUN.
import { launch, open } from "./lib/browser.mjs";

const ARGS = ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--disable-features=WebRtcHideLocalIpsWithMdns", "--allow-loopback-in-peer-connection"];
// Servidor propio (R6c): con NET_HOST (+ NET_KEY, la clave de grupo; nunca va en el repo ni se imprime) cada pestaña inicia sesión por la UI antes de crear o unirse.
// El servidor de pruebas debe arrancar con VITE_NET_HOST=<mismo host> (`VITE_NET_HOST=... npm run test:restart`). NET_RELAY=1 fuerza iceTransportPolicy "relay" (solo en la prueba: valida coturn).
const NET_HOST = process.env.NET_HOST ?? "", KEY = process.env.NET_KEY ?? "", RELAY = process.env.NET_RELAY === "1";
if (NET_HOST && !KEY) throw new Error("NET_HOST requiere NET_KEY (clave de grupo) en el entorno");
const seen = { peer: 0, turn: 0 }; // pedidos al PeerServer propio y a /api/turn (todas las pestañas)
const ok = [], fail = [];
const check = (name, cond, extra = "") => { (cond ? ok : fail).push(name); console.log(`${cond ? "OK  " : "FALLA"} ${name}${extra ? "  " + extra : ""}`); };
const wait = (page, fn, arg, ms = 30000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 100 });
const info = (page) => page.evaluate(() => window.__net.info());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Una partida online nueva: dos pestañas con la sala ya conectada y la run en marcha en ambas. */
async function pair(browser) {
  const [h, c] = await Promise.all([open(browser, "?mute&seed=7"), open(browser, "?mute")]);
  for (const p of [h, c]) {
    if (NET_HOST) {
      p.on("request", (r) => { const u = r.url(); if (u.includes(`${NET_HOST}/peer`)) seen.peer++; if (u.includes(`${NET_HOST}/api/turn`)) seen.turn++; });
      await p.evaluate(async ([k]) => { document.getElementById("netKey").value = k; document.getElementById("netKeyGo").click(); }, [KEY]);
      await wait(p, () => document.getElementById("netSession").textContent === "Sesión iniciada", null, 15000);
    }
    if (RELAY) await p.evaluate(() => { const P = RTCPeerConnection; window.RTCPeerConnection = function (cfg, ...r) { return new P({ ...cfg, iceTransportPolicy: "relay" }, ...r); }; window.RTCPeerConnection.prototype = P.prototype; });
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
  if (NET_HOST) check("sala por el PeerServer propio y credenciales de /api/turn", seen.peer > 0 && seen.turn >= 2, `peer=${seen.peer} turn=${seen.turn}${RELAY ? " (relay forzado)" : ""}`);
  const c0 = await info(c);
  await c.keyboard.down("KeyW");
  await wait(h, () => window.__net.info().netIn.throttle > 0, null, 5000).catch(() => {});
  const h1 = await info(h);
  check("input del cliente llega al anfitrión (netIn)", h1.netIn.throttle > 0, JSON.stringify(h1.netIn));
  const p1a = (await info(h)).p[1].pos, b0 = (await info(h)).bytes, t0 = Date.now();
  await sleep(2500);
  await c.keyboard.up("KeyW");
  const p1b = (await info(h)).p[1].pos, kbs = ((await info(h)).bytes - b0) / 1024 / ((Date.now() - t0) / 1000);
  check("ancho de banda del snapshot medido (JSON, anfitrión -> cliente)", kbs > 0 && kbs < 64, `${kbs.toFixed(1)} kB/s`);
  const d1 = Math.hypot(p1b[0] - p1a[0], p1b[1] - p1a[1]);
  check("players[1] se mueve en el anfitrión con el input del cliente", d1 > 1, `${d1.toFixed(1)} m`);
  const c1 = await info(c);
  const dc = Math.hypot(c1.p[1].pos[0] - c0.p[1].pos[0], c1.p[1].pos[1] - c0.p[1].pos[1]);
  check("el cliente ve su auto moverse por snapshots", dc > 1, `${dc.toFixed(1)} m`);
  check("el cliente sigue el reloj del anfitrión", c1.time > c0.time, `${c0.time} -> ${c1.time}`);
  await wait(c, () => window.__net.info().enemies > 0, null, 30000).catch(() => {});
  const e0 = await info(c); await sleep(1500); const e1 = await info(c);
  check("el cliente ve bichos y se mueven", e0.enemies > 0 && e0.e0 && e1.e0 && (e0.e0[0] !== e1.e0[0] || e0.e0[1] !== e1.e0[1]), `${e1.enemies} bichos`);

  await wait(c, () => window.__net.info().shots > 0, null, 15000).catch(() => {});
  check("el cliente ve proyectiles (snapshot j/w)", (await info(c)).shots > 0, `${(await info(c)).shots} proyectiles`);

  // Cartas: dos niveles de golpe; la primera oferta la elige el anfitrión, la segunda el cliente (se alternan)
  const lv0 = (await info(h)).level;
  await h.evaluate((lv0) => { for (let n = 0; n < 500 && window.__net.info().level < lv0 + 2; n++) window.__xp(2); }, lv0); // justo 2 niveles
  await wait(h, () => !!window.__net.info().cards, null, 10000).catch(() => {});
  await wait(c, () => !!window.__net.info().cards, null, 5000).catch(() => {});
  const k1 = await info(h), kc1 = await info(c);
  check("primera oferta: elige el anfitrión y el cliente ve las cartas", k1.cards?.by === 1 && kc1.cards?.n === k1.cards?.n && /J1/.test(kc1.cards?.sub ?? ""), `by=${k1.cards?.by} cliente="${kc1.cards?.sub}"`);
  await c.keyboard.press("Digit1"); await sleep(800);
  check("el cliente no puede elegir fuera de su turno", (await info(h)).cards?.by === 1);
  await h.keyboard.press("Digit1");
  await wait(h, () => window.__net.info().cards?.by === 2, null, 10000).catch(() => {});
  await wait(c, () => /Turno/.test(window.__net.info().cards?.sub ?? ""), null, 5000).catch(() => {});
  const kc2 = await info(c);
  check("segunda oferta: le toca al cliente y la ve", (await info(h)).cards?.by === 2 && /Turno/.test(kc2.cards?.sub ?? ""), `"${kc2.cards?.sub}"`);
  await h.keyboard.press("Digit1"); await sleep(800);
  check("el anfitrión no puede elegir en el turno del cliente", (await info(h)).cards?.by === 2);
  await c.keyboard.press("Digit1");
  await wait(h, () => window.__net.info().cards?.by !== 2, null, 10000).catch(() => {});
  const k3 = await info(h);
  check("carta del cliente aplicada en el anfitrión", k3.cards?.by !== 2 && k3.level > lv0, `nivel ${lv0} -> ${k3.level}`);
  for (let n = 0; n < 6 && (await info(h)).cards; n++) { // niveles pendientes: elige quien toque
    const by = (await info(h)).cards.by;
    await (by === 2 ? c : h).keyboard.press("Digit1");
    await wait(h, (s) => JSON.stringify(window.__net.info().cards) !== s, JSON.stringify((await info(h)).cards), 5000).catch(() => {});
    await sleep(300);
  }
  await wait(c, () => !window.__net.info().cards, null, 5000).catch(() => {});
  check("todas las cartas cerradas en los dos", !(await info(h)).cards && !(await info(c)).cards);

  // Teleportador: votos. El voto del cliente solo no decide; con los dos gana el anfitrión (empate en 2 jugadores)
  await h.evaluate(() => { window.__enc.land(); if (window.__enc.board() === "overload") window.__enc.tick(999); }); // seed 7 sale con OVERLOAD: se agota la carga
  const ph0 = (await info(h)).phase;
  await wait(c, (ph) => window.__net.info().phase === ph, ph0, 5000).catch(() => {});
  check("el cliente recibe la fase del teleportador", (await info(c)).phase === ph0, ph0);
  await c.keyboard.press("KeyZ");
  await wait(h, () => window.__net.info().votes === 1, null, 5000).catch(() => {});
  const v1 = await info(h);
  check("voto del cliente registrado y solo no decide", v1.votes === 1 && v1.phase === ph0, `votos=${v1.votes} fase=${v1.phase}`);
  await h.keyboard.press("KeyZ");
  await wait(h, (ph) => window.__net.info().phase !== ph, ph0, 5000).catch(() => {});
  const ph1 = (await info(h)).phase;
  check("los dos votan lo mismo: se aplica (applyCommand)", ph1 === "stay", `${ph0} -> ${ph1}`);
  await c.keyboard.press("KeyX"); await sleep(500); await h.keyboard.press("KeyZ"); await sleep(500);
  check("empate (cliente X, anfitrión Z): gana el anfitrión", (await info(h)).phase === "stay" && (await info(h)).votes === 0, (await info(h)).phase);
  await c.keyboard.press("KeyX"); await sleep(500); await h.keyboard.press("KeyX");
  await wait(h, () => window.__net.info().phase !== "stay", null, 5000).catch(() => {});
  check("los dos votan avanzar: sale de la estadía", (await info(h)).phase !== "stay", (await info(h)).phase);

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
