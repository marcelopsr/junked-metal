// Playtest interactivo Demolición (fabricación + pelea). RC_URL default :5174 rc-test.
import { launch, open } from "./lib/browser.mjs";

async function waitFn(page, fn, ms = 60000) {
  await page.waitForFunction(fn, null, { timeout: ms, polling: 80 });
}

async function toMain(page) {
  for (let i = 0; i < 8 && !(await page.$("#scr-main.on")); i++) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(60);
  }
  const onTitle = await page.evaluate(() => document.getElementById("scr-title")?.classList.contains("on"));
  if (onTitle) await page.keyboard.press("Space");
  await waitFn(page, () => document.getElementById("scr-main")?.classList.contains("on"));
}

/** Menú principal → Demolición → Entrar al taller */
async function enterDuelFromMenu(page) {
  await waitFn(page, () => document.getElementById("load")?.classList.contains("hidden"), 90000);
  await toMain(page);
  await page.click('#scr-main [data-go="duel"]');
  await waitFn(page, () => document.getElementById("scr-duel")?.classList.contains("on"));
  await page.click('#scr-duel [data-act="duelgo"]');
  await waitFn(page, () => document.getElementById("duel-ui")?.classList.contains("fabricar"), 90000);
}

async function playFab(page, label) {
  const issues = [];
  await waitFn(page, () => document.getElementById("duel-ui")?.classList.contains("fabricar"));

  await page.click('[data-tpl="cuna"]');
  await page.waitForTimeout(200);
  let info = await page.evaluate(() => window.__duel.info());
  if (!info.build?.cells?.length) issues.push(`${label}: plantilla cuna vacía`);

  const confirmDisabled = await page.evaluate(() => document.getElementById("duel-fab-confirm")?.disabled);
  if (confirmDisabled) issues.push(`${label}: confirm deshabilitado tras cuna`);

  await page.click("#duel-fab-zoom-in");
  await page.click("#duel-fab-zoom-out");

  await page.evaluate(() => {
    const closed = document.getElementById("duel-fab-drawer")?.classList.contains("closed");
    if (closed) window.__duel.openDrawer(true);
  });
  await page.waitForTimeout(150);
  await page.locator('[data-cat="movimiento"]').click({ timeout: 8000 });
  const ghostOk = await page.evaluate(() => {
    window.__duel.refreshGhost?.();
    return window.__duel.info().ghost3d;
  });
  if (!ghostOk) issues.push(`${label}: sin ghost 3D con pieza colocable`);
  const placed = await page.evaluate(() => {
    const cell = document.querySelector(".duel-fab-cell.can:not(.filled)");
    if (!cell) return false;
    cell.click();
    return true;
  });
  if (!placed) issues.push(`${label}: no celda can para rueda`);

  await page.click("#duel-fab-rot");
  await page.click("#duel-fab-drawer-toggle");
  const closed = await page.evaluate(() => document.getElementById("duel-fab-drawer")?.classList.contains("closed"));
  if (!closed) issues.push(`${label}: drawer no cerró`);
  await page.click("#duel-fab-drawer-toggle");

  await page.click("#duel-fab-confirm");
  await page.evaluate(() => { window.__duel.auto(true); });

  const cd = await page.evaluate(() => {
    let sawCount = false;
    for (let i = 0; i < 40; i++) {
      window.__tick(1);
      const el = document.getElementById("duel-count");
      if (el?.classList.contains("on") && el.textContent && el.textContent !== "¡YA!") sawCount = true;
    }
    return { sawCount, phase: window.__duel.info().phase, cdText: document.getElementById("duel-count")?.textContent };
  });
  if (!cd.sawCount) issues.push(`${label}: no se vio cuenta regresiva (${cd.phase}, "${cd.cdText}")`);

  for (let i = 0; i < 280; i++) await page.evaluate(() => window.__tick(1));

  info = await page.evaluate(() => window.__duel.info());
  if (info.phase !== "fight" && info.phase !== "inter") issues.push(`${label}: phase post-confirm=${info.phase}`);

  const hud = await page.evaluate(() => ({
    fightClass: document.getElementById("duel-ui")?.classList.contains("fight"),
  }));

  return { issues, info, hud, logs: page.logs };
}

async function main() {
  const browser = await launch();
  const report = { rounds: [] };

  for (const [vp, entry] of [
    ["pc", { query: "?mute&duel", via: "dev-query" }],
    ["cel", { query: "?mute", via: "menu" }],
  ]) {
    const page = await open(browser, entry.query, vp, { freeze: false });
    if (entry.via === "menu") await enterDuelFromMenu(page);
    const r = await playFab(page, `${vp}-${entry.via}`);
    report.rounds.push({ vp, via: entry.via, ...r });
    await page.ctx.close();
  }

  await browser.close();
  console.log(JSON.stringify(report, null, 2));
  const bad = report.rounds.some((r) => r.issues.length || r.logs?.length);
  process.exit(bad ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
