// Capturas de los escenarios de scenarios.mjs con UN Chromium headless (GPU real) contra pm2 rc-test (:5174). Uso (npm run shots):
//   npm run shots                      captura todo a .shots/actual/ (~15 s)
//   npm run shots -- --only garaje     solo los ids que contengan "garaje" (varios: --only garaje,lab); --vp pc|cel
//   npm run shots -- --diff            además compara con .shots/ref/ (pixelmatch): imágenes de diferencia en .shots/diff/, resumen y exit 1 si algo cambió
//   npm run shots -- --update          copia lo capturado a .shots/ref/ (nuevas referencias)
// Las animaciones y las partículas hacen que dos corridas nunca sean idénticas: `tol` = % de píxeles distintos que se tolera (por defecto TOL).
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launch, open } from "./lib/browser.mjs";
import { sessions } from "./scenarios.mjs";

const { values: a } = parseArgs({ options: { only: { type: "string" }, vp: { type: "string" }, diff: { type: "boolean" }, update: { type: "boolean" } } });
const TOL = 1.0; // % de píxeles que pueden cambiar sin avisar (calibrado con dos corridas seguidas, ver CLAUDE.md)
const [ACT, REF, DIF] = [".shots/actual", ".shots/ref", ".shots/diff"];
const only = a.only?.split(",");
for (const d of [ACT, REF, DIF]) mkdirSync(d, { recursive: true });
if (a.diff) for (const f of [DIF]) { rmSync(f, { recursive: true, force: true }); mkdirSync(f); }

/** Compara actual vs ref: { n píxeles distintos, pct } o { error } */
function compare(id) {
  if (!existsSync(`${REF}/${id}.png`)) return { estado: "SIN REF" };
  const [x, r] = [PNG.sync.read(readFileSync(`${ACT}/${id}.png`)), PNG.sync.read(readFileSync(`${REF}/${id}.png`))];
  if (x.width !== r.width || x.height !== r.height) return { estado: "TAMAÑO", pct: 100 };
  const out = new PNG({ width: x.width, height: x.height });
  const n = pixelmatch(r.data, x.data, out.data, x.width, x.height, { threshold: 0.15, includeAA: false, alpha: 0.3 });
  const pct = (100 * n) / (x.width * x.height);
  return { pct, out, estado: pct > (compare.tol ?? TOL) ? "CAMBIÓ" : "igual" };
}

const t0 = Date.now(), rows = [];
const browser = await launch();
try {
  for (const vp of a.vp ? [a.vp] : ["pc", "cel"]) {
    for (const s of sessions) {
      if (s.vps && !s.vps.includes(vp)) continue;
      const shots = s.shots.filter((sh) => sh.shot !== false && (!only || only.some((o) => `${vp}-${s.id}-${sh.id}`.includes(o))));
      if (!shots.length) continue;
      const page = await open(browser, s.query, vp, { freeze: true });
      for (const sh of s.shots) { // los pasos que no se capturan igual corren: el estado de la sesión depende de ellos
        const id = `${vp}-${s.id}-${sh.id}`;
        if (!shots.includes(sh) && !(only && s.shots.indexOf(sh) < s.shots.indexOf(shots.at(-1)))) continue;
        const t1 = Date.now();
        try {
          await sh.act(page);
          if (!shots.includes(sh)) continue;
          await page.evaluate(() => window.__tick(3));
          await page.screenshot({ path: `${ACT}/${id}.png`, animations: "disabled", caret: "hide" });
          const row = { id, ms: Date.now() - t1 };
          if (a.update) { copyFileSync(`${ACT}/${id}.png`, `${REF}/${id}.png`); row.estado = "ref actualizada"; }
          else if (a.diff) { compare.tol = sh.tol; const c = compare(id); Object.assign(row, c, { out: undefined }); if (c.out && c.estado !== "igual") writeFileSync(`${DIF}/${id}.png`, PNG.sync.write(c.out)); }
          rows.push(row);
        } catch (e) { rows.push({ id, estado: "ERROR", error: String(e).split("\n")[0] }); }
      }
      if (page.logs.length) console.log(`[${vp}-${s.id}] errores de consola:\n  ` + page.logs.join("\n  "));
      await page.ctx.close();
    }
  }
} finally { await browser.close(); }

console.log(`\n${"escenario".padEnd(34)} ${"ms".padStart(6)}  ${a.diff ? "dif %".padStart(7) + "  " : ""}estado`);
for (const r of rows) console.log(`${r.id.padEnd(34)} ${String(r.ms ?? "").padStart(6)}  ${a.diff ? (r.pct == null ? "-" : r.pct.toFixed(2)).padStart(7) + "  " : ""}${r.estado ?? "ok"}${r.error ? " " + r.error : ""}`);
const bad = rows.filter((r) => ["CAMBIÓ", "TAMAÑO", "ERROR"].includes(r.estado)), nuevas = rows.filter((r) => r.estado === "SIN REF");
console.log(`\n${rows.length} capturas en ${((Date.now() - t0) / 1000).toFixed(1)} s -> ${ACT}/` + (a.diff ? ` · ${bad.length} con cambios${bad.length ? " (ver " + DIF + "/)" : ""}${nuevas.length ? `, ${nuevas.length} sin referencia (--update)` : ""}` : ""));
writeFileSync(".shots/resumen.json", JSON.stringify(rows, null, 1));
process.exit(bad.length ? 1 : 0);
