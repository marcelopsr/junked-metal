// Capturas de los escenarios de scenarios.mjs con UN Chromium headless (GPU real) contra pm2 rc-test (:5174). Uso (npm run shots):
//   npm run shots                      captura todo a .shots/actual/ (~15 s)
//   npm run shots -- --only garaje     solo shots con id exacto "garaje" (o clave completa pc-menu-garaje); --only garaje-vista-previa para otro; --vp pc|cel
//   npm run shots -- --diff            además compara con .shots/ref/ (pixelmatch): imágenes de diferencia en .shots/diff/, resumen y exit 1 si algo cambió
//   npm run shots -- --update          copia lo capturado a .shots/ref/ (nuevas referencias)
// Las animaciones y las partículas hacen que dos corridas nunca sean idénticas: `tol` = % de píxeles distintos que se tolera (por defecto TOL).
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { changedSessions, markCaptured } from "./lib/changed.mjs";
import { pool } from "./lib/pool.mjs";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { open } from "./lib/browser.mjs";
import { sessions } from "./scenarios.mjs";

const { values: a } = parseArgs({ options: { only: { type: "string" }, vp: { type: "string" }, diff: { type: "boolean" }, update: { type: "boolean" }, changed: { type: "boolean" }, base: { type: "string" }, par: { type: "string", default: "3" } } });
/** --changed [--base ref]: solo las sesiones que tocan los archivos cambiados (ver lib/changed.mjs). Nada visual → sale sin abrir el navegador. */
function pickChanged(ref) { const { files, sessions } = changedSessions(ref || "HEAD"); console.log(`--changed: ${files.length} archivos → ${sessions.join(", ") || "nada que capturar"}`); if (!sessions.length) process.exit(0); return sessions; }
const TOL = 1.0; // % de píxeles que pueden cambiar sin avisar (calibrado con dos corridas seguidas, ver CLAUDE.md)
const [ACT, REF, DIF] = [".shots/actual", ".shots/ref", ".shots/diff"];
const only = a.changed ? pickChanged(a.base) : a.only?.split(",");
/** Sin guión: id exacto del shot (`garaje`, `ficha-hormiga`). Con guión: substring en la clave `vp-sesión-shot`. */
const shotMatches = (vp, sid, shid, o) => {
  const key = `${vp}-${sid}-${shid}`;
  return o.includes("-") ? key.includes(o) : shid === o || key === `${vp}-${sid}-${o}`;
};
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

const t0 = Date.now();
// Cada (vp, sesión) es un trabajo independiente (contexto limpio + freeze 1/60 s: el resultado no depende del orden ni del paralelismo). --par N navegadores (3 por defecto).
const tasks = (a.vp ? [a.vp] : ["pc", "cel"]).flatMap((vp) => sessions.filter((s) => !s.vps || s.vps.includes(vp)).map((s) => ({ vp, s })));
const par = Math.max(1, Number(a.par));
const results = await pool(par, tasks, async ({ vp, s }, browser) => {
  const rows = [];
  {
    {
      const shots = s.shots.filter((sh) => sh.shot !== false && (!sh.vps || sh.vps.includes(vp)) && (!only || only.some((o) => o === s.id || shotMatches(vp, s.id, sh.id, o))));
      if (!shots.length) return { rows, sid: s.id };
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
        } catch (e) { rows.push({ id, estado: "ERROR", error: String(e).split("\n")[0] }); break; } // el resto depende de este paso: abortar evita encadenar timeouts
      }
      if (page.logs.length) console.log(`[${vp}-${s.id}] errores de consola:\n  ` + page.logs.join("\n  "));
      await page.ctx.close();
    }
  }
  return { rows, sid: s.id };
});
const rows = results.flatMap((r) => r.rows);

console.log(`\n${"escenario".padEnd(34)} ${"ms".padStart(6)}  ${a.diff ? "dif %".padStart(7) + "  " : ""}estado`);
for (const r of rows) console.log(`${r.id.padEnd(34)} ${String(r.ms ?? "").padStart(6)}  ${a.diff ? (r.pct == null ? "-" : r.pct.toFixed(2)).padStart(7) + "  " : ""}${r.estado ?? "ok"}${r.error ? " " + r.error : ""}`);
const bad = rows.filter((r) => ["CAMBIÓ", "TAMAÑO", "ERROR"].includes(r.estado)), nuevas = rows.filter((r) => r.estado === "SIN REF");
console.log(`\n${rows.length} capturas en ${((Date.now() - t0) / 1000).toFixed(1)} s -> ${ACT}/` + (a.diff ? ` · ${bad.length} con cambios${bad.length ? " (ver " + DIF + "/)" : ""}${nuevas.length ? `, ${nuevas.length} sin referencia (--update)` : ""}` : ""));
writeFileSync(".shots/resumen.json", JSON.stringify(rows, null, 1));
// cache de --changed (E3): se marcan las sesiones capturadas sin fallo al aceptar (--update) o al pasar --changed --diff sin cambios
if ((a.update && (!a.only || a.changed)) || (a.changed && a.diff)) {
  const ok = [...new Set(results.filter((r) => r.rows.length && !r.rows.some((x) => ["CAMBIÓ", "TAMAÑO", "ERROR"].includes(x.estado))).map((r) => r.sid))];
  if (ok.length) markCaptured(ok);
}
process.exit(bad.length ? 1 : 0);
