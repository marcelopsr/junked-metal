import { chromium } from "playwright";
import { resolve } from "node:path";

const OUT_DIR = resolve("assets-src/smoothvoxels/v1/evidence");
const URL = "http://localhost:5173/assets-src/smoothvoxels/v1/ball-comparison.html";

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio"]
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 760 } });
  const page = await context.newPage();

  console.log("Navegando a", URL);
  await page.goto(URL);
  await page.waitForSelector("#status:has-text('Comparación lista')");
  // Esperar un momento a que Babylon termine de renderizar con antialiasing
  await page.waitForTimeout(1200);

  // 1. Capturar variante Fútbol
  await page.screenshot({ path: `${OUT_DIR}/ball-comparison-football.png` });
  console.log("Guardado ball-comparison-football.png");

  // 2. Cambiar a Tenis
  await page.selectOption("#variant", "tennis");
  await page.waitForSelector("#status:has-text('Comparación lista')");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT_DIR}/ball-comparison-tennis.png` });
  console.log("Guardado ball-comparison-tennis.png");

  // 3. Cambiar a Playa
  await page.selectOption("#variant", "beach");
  await page.waitForSelector("#status:has-text('Comparación lista')");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT_DIR}/ball-comparison-beach.png` });
  console.log("Guardado ball-comparison-beach.png");

  await browser.close();
  console.log("Listo!");
}

run().catch(console.error);
