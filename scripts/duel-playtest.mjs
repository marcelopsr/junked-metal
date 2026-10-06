// Playtest interactivo Demolición (fabricación + pelea). RC_URL default :5174 rc-test.
import { launch, open, VIEWPORTS } from "./lib/browser.mjs";

async function waitFn(page, fn, ms = 60000) {
  await page.waitForFunction(fn, null, { timeout: ms, polling: 80 });
}

async function playFab(page, label) {
  const issues = [];
  await waitFn(page, () => document.getElementById("duel-ui")?.classList.contains("fabricar"));
  await waitFn(page, () => document.getElementById("load")?.classList.contains("hidden"), 90000);

  // Plantilla cuna
  await page.click('[data-tpl="cuna"]');
  await page.waitForTimeout(200);
  let info = await page.evaluate(() => window.__duel.info());
  if (!info.build?.cells?.length) issues.push(`${label}: plantilla cuna vacía`);
  if (info.cfg?.chassis !== "cuna") issues.push(`${label}: chassis=${info.cfg?.chassis}`);

  const confirmDisabled = await page.evaluate(() => document.getElementById("duel-fab-confirm")?.disabled);
  if (confirmDisabled) issues.push(`${label}: confirm deshabilitado tras cuna`);

  // Zoom
  await page.click("#duel-fab-zoom-in");
  await page.click("#duel-fab-zoom-out");

  await page.evaluate(() => {
    const closed = document.getElementById("duel-fab-drawer")?.classList.contains("closed");
    if (closed) window.__duel.openDrawer(true);
  });
  await page.waitForTimeout(150);
  await page.locator('[data-cat="movimiento"]').click({ timeout: 8000 });
  const placed = await page.evaluate(() => {
    const cell = document.querySelector(".duel-fab-cell.can:not(.filled)");
    if (!cell) return false;
    cell.click();
    return true;
  });
  if (!placed) issues.push(`${label}: no celda can para rueda`);

  // Rotar
  await page.click("#duel-fab-rot");

  // Drawer toggle
  await page.click("#duel-fab-drawer-toggle");
  const closed = await page.evaluate(() => document.getElementById("duel-fab-drawer")?.classList.contains("closed"));
  if (!closed) issues.push(`${label}: drawer no cerró`);
  await page.click("#duel-fab-drawer-toggle");

  // Confirm → pelea
  await page.click("#duel-fab-confirm");
  await page.evaluate(() => { window.__duel.auto(true); });
  for (let i = 0; i < 320; i++) await page.evaluate(() => window.__tick(1));

  info = await page.evaluate(() => window.__duel.info());
  if (info.phase !== "fight" && info.phase !== "inter") issues.push(`${label}: phase post-confirm=${info.phase}`);

  const hud = await page.evaluate(() => ({
    duelHud: !!document.querySelector("#duel-hud, .duel-hud, [id^='duel-']"),
    fightClass: document.getElementById("duel-ui")?.classList.contains("fight"),
  }));

  return { issues, info, hud, logs: page.logs };
}

async function main() {
  const browser = await launch();
  const report = { rounds: [] };
  for (const vp of ["pc", "cel"]) {
    const page = await open(browser, "?mute&duel", vp, { freeze: false });
    const r = await playFab(page, vp);
    report.rounds.push({ vp, ...r });
    await page.ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
  const bad = report.rounds.some((r) => r.issues.length || r.logs?.length);
  process.exit(bad ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
