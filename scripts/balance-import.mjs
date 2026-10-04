// Vuelve de la planilla al juego: lee un volcado de texto y reescribe src/balance.json validándolo.
// Uso: npm run balance:import -- volcado.txt [--dry]      (--dry = solo mostrar las diferencias, sin escribir)
//
// Formato del volcado: cada hoja de datos como TSV (Archivo > Descargar > Valores separados por tabulaciones), tal cual está en la
// planilla (fila 1 = columnas, fila 2 = descripciones, datos desde la 3), precedida por una línea "### nombre_hoja":
//   ### enemigos
//   id<TAB>nombre<TAB>tipo<TAB>vida ...
//   Identificador...<TAB>...                  (la fila 2 se descarta siempre)
//   hormiga<TAB>Hormiga<TAB>bicho<TAB>8 ...
// Las hojas calculadas (Golpes para matar, Tiempo jefe, Partidas para comprar) y Leeme se ignoran. Una hoja de datos que falte en el
// volcado queda como está. Nada se escribe si hay UN solo error: se listan todos.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const JSON_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../src/balance.json");
const IGNORADAS = new Set(["Leeme", "Golpes para matar", "Tiempo jefe", "Partidas para comprar"]);
const TIPOS = { enemigos: ["bicho", "minijefe", "jefe_final"], precios: ["mejora", "habilidad", "arma", "zona", "pieza"] }; // columna tipo: valores permitidos

// Una fila por línea: diffs legibles en git (mismo formato que generó el JSON)
export const fmt = (data) => "{\n" + Object.entries(data).map(([k, rows]) => `  ${JSON.stringify(k)}: [\n${rows.map((r) => "    " + JSON.stringify(r)).join(",\n")}\n  ]`).join(",\n") + "\n}\n";

// "1,5" -> 1.5. Con separador de miles ("1.234,5", "1,234.5") no es un número: la planilla usa formato General y no los escribe
function num(s) {
  const t = s.trim();
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if (/^-?\d+,\d+$/.test(t)) return Number(t.replace(",", "."));
  return NaN;
}
// ponytail: sin celdas entre comillas con saltos de línea (ninguna hoja los usa); si aparecen, parsear el TSV con una librería
const cell = (s) => (s.length > 1 && s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1).replace(/""/g, '"') : s);

// text: contenido del volcado; bal: el JSON actual. Devuelve { errors, diffs, next } (next = JSON nuevo, solo válido si no hay errors)
export function importDump(text, bal) {
  const errors = [], diffs = [], warns = [], next = structuredClone(bal);
  const sheets = {};
  let cur = null;
  text.replace(/^﻿/, "").split(/\r?\n/).forEach((line, i) => {
    const m = line.match(/^###\s*(.+?)\s*$/);
    if (m) { cur = m[1]; if (sheets[cur]) errors.push(`línea ${i + 1}: la hoja "${cur}" aparece dos veces`); sheets[cur] = { line: i + 1, rows: [] }; }
    else if (cur) sheets[cur].rows.push({ n: i + 1, cells: line.split("\t").map(cell) });
    else if (line.trim()) errors.push(`línea ${i + 1}: hay texto antes del primer "### hoja"`);
  });
  if (!Object.keys(sheets).length) errors.push('el volcado no tiene ninguna hoja: cada hoja debe empezar con una línea "### nombre_hoja"');

  for (const name of Object.keys(sheets)) if (!(name in bal) && !IGNORADAS.has(name)) warns.push(`hoja "${name}" desconocida: se ignora`);
  const missing = Object.keys(bal).filter((t) => !(t in sheets));
  if (missing.length) warns.push(`hojas que no estaban en el volcado y quedan como están: ${missing.join(", ")}`);

  for (const t of Object.keys(bal)) {
    const sh = sheets[t];
    if (!sh) continue;
    const old = bal[t], cols = Object.keys(old[0]), where = (n) => `${t} (línea ${n})`;
    const rows = sh.rows.filter((r) => r.cells.some((c) => c.trim())); // sin líneas vacías
    if (rows.length < 2) { errors.push(`${t}: faltan la fila de columnas y la de descripciones`); continue; }
    const header = rows[0].cells.map((c) => c.trim());
    while (header.length && !header[header.length - 1]) header.pop(); // columnas vacías de más al final
    const faltan = cols.filter((c) => !header.includes(c)), sobran = header.filter((c) => !cols.includes(c));
    if (faltan.length || sobran.length || new Set(header).size !== header.length) {
      errors.push(`${where(rows[0].n)}: las columnas no coinciden${faltan.length ? ` · faltan: ${faltan.join(", ")}` : ""}${sobran.length ? ` · sobran: ${sobran.join(", ")}` : ""}${new Set(header).size !== header.length ? " · hay columnas repetidas" : ""}`);
      continue;
    }
    const byId = new Map(old.map((r, i) => [r.id, i])), seen = new Set(), neg = {};
    for (const c of cols) neg[c] = old.some((r) => typeof r[c] === "number" && r[c] < 0); // ¿la columna ya admite negativos?
    for (const r of rows.slice(2)) {
      const get = (c) => r.cells[header.indexOf(c)] ?? "", id = get("id").trim();
      if (!byId.has(id)) { errors.push(`${where(r.n)}: el id "${id}" no existe (no se pueden agregar ni renombrar filas)`); continue; }
      if (seen.has(id)) { errors.push(`${where(r.n)}: el id "${id}" está repetido`); continue; }
      seen.add(id);
      const prev = old[byId.get(id)], row = next[t][byId.get(id)];
      if (r.cells.length > header.length && r.cells.slice(header.length).some((c) => c.trim())) errors.push(`${where(r.n)} (${id}): tiene más celdas que columnas`);
      for (const c of cols) {
        if (c === "id") continue;
        const raw = get(c);
        let v;
        if (typeof prev[c] === "number") {
          if (!raw.trim() && t === "precios" && /^nivel\d+$/.test(c)) v = 0; // nivel sin precio = celda vacía
          else if (!Number.isFinite((v = num(raw)))) { errors.push(`${where(r.n)} ${id}.${c}: "${raw}" no es un número (punto o coma decimal, sin separador de miles)`); continue; }
          if (v < 0 && !neg[c]) { errors.push(`${where(r.n)} ${id}.${c}: ${v} es negativo y ninguna fila actual de la columna lo es (¿error de tipeo?)`); continue; }
        } else {
          v = raw.trim();
          if (!v && c !== "descripcion") { errors.push(`${where(r.n)} ${id}.${c}: texto vacío`); continue; }
          if (c === "tipo" && TIPOS[t] && !TIPOS[t].includes(v)) { errors.push(`${where(r.n)} ${id}.tipo: "${v}" no es ${TIPOS[t].join(", ")}`); continue; }
          if (c === "arma_inicial" && !bal.armas.some((a) => a.id === v)) { errors.push(`${where(r.n)} ${id}.arma_inicial: "${v}" no es un arma de la hoja armas`); continue; }
        }
        row[c] = v;
        if (v !== prev[c]) diffs.push(`${t}.${id}.${c}: ${prev[c]} -> ${v}`);
      }
    }
    for (const r of old) if (!seen.has(r.id) && !errors.some((e) => e.startsWith(t + " "))) errors.push(`${t}: falta la fila "${r.id}" en el volcado${r.id === old[0].id ? " (¿el volcado trae la fila 2 de descripciones?)" : ""}`);
  }
  return { errors, diffs, warns, next };
}

// ---------- CLI ----------
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), dry = args.includes("--dry"), file = args.find((a) => !a.startsWith("--"));
  if (!file) { console.error("Uso: npm run balance:import -- volcado.txt [--dry]"); process.exit(2); }
  const bal = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  const { errors, diffs, warns, next } = importDump(readFileSync(file, "utf8"), bal);
  for (const w of warns) console.log("aviso: " + w);
  if (errors.length) {
    console.error(`\n${errors.length} error(es); balance.json NO se tocó:`);
    for (const e of errors.slice(0, 60)) console.error("  - " + e);
    if (errors.length > 60) console.error(`  ... y ${errors.length - 60} más`);
    process.exit(1);
  }
  console.log(diffs.length ? `${diffs.length} cambio(s):\n` + diffs.map((d) => "  " + d).join("\n") : "Sin cambios: la planilla coincide con balance.json.");
  if (!dry && diffs.length) { writeFileSync(JSON_PATH, fmt(next)); console.log("\nsrc/balance.json actualizado. Probar el juego (npx tsc --noEmit -p . y __sim) antes de commitear."); }
  else if (dry && diffs.length) console.log("\n--dry: no se escribió nada.");
}
