// E2E de una expedición ENCORE con el bot, headless contra rc-test. Uso: npm run e2e [-- --vp pc|cel|pc,cel] [--seed N]
// Captura PNG por paso en .e2e/<fecha>/. Exit 1 si falla algún paso. Una pestaña limpia por viewport (guardado vacío).
import { launch, open } from "./lib/browser.mjs";
import { mkdirSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const vps = arg("vp", "pc,cel").split(","), seed = arg("seed", "58");
const dir = `.e2e/${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;
mkdirSync(dir, { recursive: true });
const browser = await launch();
const rows = [];
for (const vp of vps) {
  const p = await open(browser, `?mute&seed=${seed}`, vp, { freeze: true });
  const ev = (f, a) => p.evaluate(f, a), tick = (n = 3) => ev((n) => window.__tick(n), n);
  const info = () => ev(() => window.__enc.info());
  const cards = async () => { for (let i = 0; i < 12 && (await ev(() => window.__info().state)) === "level"; i++) { await p.keyboard.press("Digit1"); await p.waitForTimeout(450); await tick(2); } };
  const saved = () => ev(() => JSON.parse(localStorage.getItem("rcfight2") ?? "{}").encore ?? {});
  let k = 0;
  const step = async (name, fn) => {
    const t0 = Date.now(); let ok = false, why = "";
    try { const r = await fn(); ok = r === undefined || r === true; why = ok ? "" : String(r); } catch (e) { why = e.message.split("\n")[0]; }
    const errs = p.logs.splice(0); if (errs.length) { ok = false; why += ` consola: ${errs.join(" | ").slice(0, 150)}`; }
    try { await p.screenshot({ path: `${dir}/${vp}-${String(++k).padStart(2, "0")}-${name}.png` }); } catch {}
    rows.push({ vp, paso: name, ok: ok ? "OK" : "FALLA", s: ((Date.now() - t0) / 1000).toFixed(1), nota: why });
    return ok;
  };
  const seen = { pact: false, route: false, vote: false };
  let runs0 = 0;

  await step("menu-jugar-encore", async () => {
    await ev(() => document.querySelector("#scr-title.on") && document.dispatchEvent(new KeyboardEvent("keydown", { code: "Enter", key: "Enter" })));
    await p.keyboard.press("Enter"); await tick(4); await p.waitForTimeout(1200);
    runs0 = (await saved()).runs ?? 0;
    await p.dispatchEvent('#scr-main [data-go="encore"]', "click"); await tick(4); await p.waitForTimeout(1200);
    if (!(await p.$("#scr-encore.on, [data-act=\"encorego\"]:visible"))) return "no se ve la pantalla ENCORE";
  });
  await step("largar-aviso-primera-partida", async () => {
    await p.dispatchEvent('[data-act="encorego"]', "click");
    await p.waitForFunction(() => window.__enc.info(), null, { timeout: 60000 });
    await ev(() => window.__god());
    await tick(90);
    const shown = await p.waitForFunction(() => document.querySelector("#dirSub:not(.hidden) .dtxt")?.textContent, null, { timeout: 8000 }).catch(() => null);
    if (!shown) return "no apareció el aviso del Director";
    if (!(await saved()).tips?.includes("start")) await p.waitForTimeout(800);
    if (!(await saved()).tips?.includes("start")) return "tips.start no quedó en el guardado";
  });
  await step("bot-hasta-teleportador", async () => {
    await ev(() => window.__bot(8)); await cards();
    await ev(() => window.__enc.land()); await tick(30); await cards();
    await ev(() => window.__enc.board()); await tick(20); await cards();
    for (let i = 0; i < 40 && (await info()).phase !== "teleporter"; i++) {
      const ph = (await info()).phase;
      if (ph === "overload") await ev(() => window.__enc.tick(30)); else if (ph === "guest") await ev(() => window.__killBoss());
      await tick(20); await cards();
    }
    if ((await info()).phase !== "teleporter") return "fase " + (await info()).phase;
  });
  await step("quedarse-y-avanzar", async () => {
    await ev(() => window.__enc.pick(0)); await tick(5);
    if ((await info()).phase !== "stay") return "no pasó a stay: " + (await info()).phase;
    await ev(() => window.__enc.tick(70)); await tick(5); await cards();
    if ((await info()).phase !== "teleporter") return "tras quedarse: " + (await info()).phase;
    await ev(() => window.__enc.pick(1)); await tick(5);
  });
  // pacto / ruta / votación: el piloto sigue escenarios hasta ver cada fase (tope de pasos); la votación, si llega
  const drive = async (want, max) => {
    for (let i = 0; i < max; i++) {
      await cards(); const ph = (await info()).phase;
      if (ph === want) return true;
      await ev(() => { const e = window.__enc, r = e.info(); if (r.phase === "stage") { e.land(); e.board(); } else if (r.phase === "overload") e.tick(30); else if (r.phase === "guest") window.__killBoss(); else if (r.phase === "teleporter") e.pick(1); else if (r.phase === "pact") e.pick(1); else if (r.phase === "route") e.pick(0); else if (r.phase === "vote") e.pick(0); });
      await tick(25);
    }
    return false;
  };
  await step("oferta-de-pacto", async () => {
    if ((await info()).phase !== "pact" && !(await drive("pact", 60))) return "no llegó oferta de pacto";
    await ev(() => window.__enc.pick(0)); await tick(5); seen.pact = true;
    if ((await info()).pacts.length < 1) return "pacto no aceptado";
  });
  await step("ruta", async () => {
    if ((await info()).phase !== "route" && !(await drive("route", 60))) return "no llegó la ruta";
    await ev(() => window.__enc.pick(0)); await tick(5); seen.route = true;
  });
  await step("votacion-o-outro", async () => {
    seen.vote = await drive("vote", 60);
    if (seen.vote) { await tick(10); await p.screenshot({ path: `${dir}/${vp}-votacion.png` }); }
    await ev(() => window.__outro());
    for (let i = 0; i < 400 && !(await p.$("#scr-over.on")); i++) await tick(20);
    return seen.vote ? true : true; // la votación es opcional (ver nota)
  });
  await step("resultados-y-guardado", async () => {
    await tick(2); await p.waitForTimeout(2500);
    if (!(await p.$("#scr-over.on"))) return "pantalla de resultados no visible";
    await p.waitForTimeout(600);
    const runs = (await saved()).runs ?? 0;
    if (runs !== runs0 + 1) return `save.encore.runs ${runs0} -> ${runs} (se esperaba +1)`;
  });
  rows.push({ vp, paso: "(info) votación vista", ok: seen.vote ? "sí" : "no", s: "", nota: "" });
  await p.ctx.close();
}
await browser.close();
console.table(rows);
console.log("capturas:", dir);
if (rows.some((r) => r.ok === "FALLA")) { console.error("E2E FALLÓ"); process.exit(1); }
console.log("E2E OK");
