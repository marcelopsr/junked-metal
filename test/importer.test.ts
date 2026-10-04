// Importador de la planilla (scripts/balance-import.mjs): el volcado TSV exacto de balance.json no cambia nada, y los errores típicos se detectan sin escribir.
// (La ida y vuelta por xlsx real sigue en `npm run balance:check`; acá se arma el volcado directo, sin exceljs.)
import { describe, expect, it } from "vitest";
import raw from "../src/balance.json";
// @ts-expect-error módulo .mjs sin tipos
import { importDump } from "../scripts/balance-import.mjs";

type Rows = Record<string, string | number>[];
const bal = raw as unknown as Record<string, Rows>;
// Volcado como lo baja Google Sheets: "### hoja", fila de columnas, fila de descripciones, datos
const dump = (b: Record<string, Rows> = bal) => Object.entries(b).map(([t, rows]) => {
  const cols = Object.keys(rows[0]);
  return [`### ${t}`, cols.join("\t"), cols.map(() => "descripción").join("\t"), ...rows.map((r) => cols.map((c) => r[c]).join("\t"))].join("\n");
}).join("\n");

describe("importDump", () => {
  it("el volcado idéntico no produce errores ni diferencias", () => {
    const r = importDump(dump(), bal);
    expect(r.errors).toEqual([]);
    expect(r.diffs).toEqual([]);
    expect(r.next).toEqual(bal);
  });
  it("un número cambiado (con coma decimal) se informa como diferencia", () => {
    const t = dump().replace(/\nhormiga\t([^\t]*)\tbicho\t8\t/, "\nhormiga\t$1\tbicho\t9,5\t");
    const r = importDump(t, bal);
    expect(r.diffs).toEqual(["enemigos.hormiga.vida: 8 -> 9.5"]);
    expect(r.errors).toEqual([]);
  });
  it("detecta texto en columna numérica, id inexistente y columna faltante", () => {
    expect(importDump(dump().replace(/\nhormiga\t([^\t]*)\tbicho\t8\t/, "\nhormiga\t$1\tbicho\tocho\t"), bal).errors.join()).toMatch(/no es un número/);
    expect(importDump(dump().replace(/\nhormiga\t/, "\nhormigaa\t"), bal).errors.join()).toMatch(/no existe/);
    expect(importDump(dump().replace("\tvelocidad\tdano\t", "\tdano\t"), bal).errors.join()).toMatch(/faltan: velocidad/);
  });
  it("un negativo donde ninguna fila lo es se rechaza (error de tipeo)", () => {
    const t = dump().replace(/\nhormiga\t([^\t]*)\tbicho\t8\t/, "\nhormiga\t$1\tbicho\t-8\t");
    expect(importDump(t, bal).errors.join()).toMatch(/negativo/);
  });
  it("con un error el JSON nuevo no se considera válido: hay errores para mostrar", () => {
    expect(importDump("texto suelto\n### enemigos\n", bal).errors.length).toBeGreaterThan(0);
  });
});
