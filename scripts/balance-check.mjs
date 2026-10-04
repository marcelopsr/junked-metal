// Chequeo de ida y vuelta: genera el xlsx, lo vuelca como TSV (como lo haría Google Sheets), lo importa y comprueba que no cambia nada;
// después rompe el volcado de cuatro maneras y comprueba que el importador lo detecta. Uso: npm run balance:check
import ExcelJS from "exceljs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { importDump } from "./balance-import.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bal = JSON.parse(readFileSync(join(root, "src/balance.json"), "utf8"));
const xlsx = join(tmpdir(), "balance-check.xlsx");
execFileSync("node", [join(root, "scripts/balance-xlsx.mjs"), xlsx], { stdio: "ignore" });
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(xlsx);
const dump = Object.keys(bal).map((t) => {
  const lines = [];
  wb.getWorksheet(t).eachRow((row) => { const v = []; row.eachCell({ includeEmpty: true }, (c, i) => { v[i - 1] = c.value ?? ""; }); lines.push(v.join("\t")); });
  return `### ${t}\n${lines.join("\n")}`;
}).join("\n");

let r = importDump(dump, bal);
assert.deepEqual(r.errors, [], "ida y vuelta: errores"); assert.deepEqual(r.diffs, [], "ida y vuelta: diferencias");
r = importDump(dump.replace(/\nhormiga\t([^\t]*)\tbicho\t8\t/, "\nhormiga\t$1\tbicho\t9,5\t"), bal);
assert.deepEqual(r.diffs, ["enemigos.hormiga.vida: 8 -> 9.5"], "cambio de un número (con coma decimal)");
assert.ok(importDump(dump.replace(/\nhormiga\t([^\t]*)\tbicho\t8\t/, "\nhormiga\t$1\tbicho\tocho\t"), bal).errors.some((e) => e.includes("no es un número")), "texto en una columna numérica");
assert.ok(importDump(dump.replace(/\nhormiga\t/, "\nhormigaa\t"), bal).errors.some((e) => e.includes("no existe")), "id inexistente");
assert.ok(importDump(dump.replace("\tvelocidad\tdano\t", "\tdano\t"), bal).errors.some((e) => e.includes("faltan: velocidad")), "columna faltante");
console.log("balance:check OK (ida y vuelta sin cambios y 4 roturas detectadas)");
