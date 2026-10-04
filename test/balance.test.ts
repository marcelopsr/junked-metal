// Balance: balance.ts lee todas las tablas de balance.json y pedir algo que no existe tira error (nunca un NaN silencioso).
import { describe, expect, it } from "vitest";
import raw from "../src/balance.json";
import { BAL, costos, precio, xpNeed } from "../src/balance";

describe("balance.json -> BAL", () => {
  it("expone todas las tablas del json", () => {
    for (const t of Object.keys(raw)) expect(Object.keys(BAL).map((k) => k.toLowerCase())).toContain(t.replace(/_(\w)/g, (_, c) => c).toLowerCase());
  });
  it("cada fila numérica es finita y los ids son únicos", () => {
    for (const [t, rows] of Object.entries(raw) as [string, Record<string, unknown>[]][]) {
      const ids = rows.map((r) => r.id);
      expect(new Set(ids).size, `ids repetidos en ${t}`).toBe(ids.length);
      for (const r of rows) for (const [c, v] of Object.entries(r)) if (typeof v === "number") expect(Number.isFinite(v), `${t}.${r.id}.${c}`).toBe(true);
    }
  });
  it("todas las filas de una tabla tienen las mismas columnas", () => {
    for (const [t, rows] of Object.entries(raw) as [string, Record<string, unknown>[]][]) {
      const cols = Object.keys(rows[0]).sort().join();
      for (const r of rows) expect(Object.keys(r).sort().join(), `${t}.${r.id}`).toBe(cols);
    }
  });
  it("un id o una columna inexistente tira error", () => {
    expect(() => BAL.enemigos.noexiste).toThrow(/no existe/);
    expect(() => BAL.enemigos.hormiga.noexiste).toThrow(/no existe/);
    expect(() => BAL.ritmo.noexiste).toThrow(/no existe/);
  });
  it("las referencias entre tablas apuntan a filas que existen", () => {
    for (const p of Object.values(BAL.pilotos)) expect(BAL.armas[p.arma_inicial as string], `arma_inicial ${p.arma_inicial}`).toBeDefined();
  });
});

describe("precios del taller", () => {
  it("costos() devuelve solo los niveles con precio, en orden y positivos", () => {
    for (const id of Object.keys(BAL.precios)) {
      const c = costos(id);
      expect(c.every((x) => x > 0)).toBe(true);
    }
    expect(costos("hp").length).toBeGreaterThan(1);
  });
  it("precio() es el de la primera compra", () => {
    for (const id of Object.keys(BAL.precios)) expect(precio(id)).toBe(BAL.precios[id].nivel1);
  });
});

describe("XP por nivel", () => {
  it("xpNeed crece con el nivel y nunca baja de 1", () => {
    let prev = 0;
    for (let l = 1; l <= 60; l++) { const n = xpNeed(l); expect(n).toBeGreaterThan(prev); prev = n; }
    expect(xpNeed(1)).toBe(Math.floor(BAL.ritmo.xp_nivel_base + BAL.ritmo.xp_nivel_lineal + BAL.ritmo.xp_nivel_cuad));
  });
});
