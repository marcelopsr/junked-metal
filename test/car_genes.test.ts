import { describe, expect, it } from "vitest";
import { GENES, genome, original, type Gene } from "../src/car_genes";
import type { CarKind } from "../src/models/cars";

const ALL_CARS: CarKind[] = [
  "buggy",
  "monster",
  "formula",
  "tanque",
  "carrera",
  "axel",
  "helado",
  "combi",
  "hover",
  "topadora",
  "triciclo",
  "murcielago",
  "misterio",
  "clasico",
  "jeep",
  "moto",
  "monopatin",
];

describe("car_genes (100% de la flota parametrizada)", () => {
  it("todos los 17 autos del juego tienen su entrada en GENES", () => {
    expect(ALL_CARS.length).toBe(17);
    for (const kind of ALL_CARS) {
      expect(GENES[kind], `El auto ${kind} debe tener genes definidos`).toBeDefined();
      expect(GENES[kind].length, `El auto ${kind} debe tener al menos 3 genes`).toBeGreaterThanOrEqual(3);
    }
  });

  it("cada gen cumple min <= def <= max sin IDs duplicados", () => {
    for (const kind of ALL_CARS) {
      const seen = new Set<string>();
      for (const g of GENES[kind]) {
        expect(seen.has(g.id), `ID duplicado '${g.id}' en auto ${kind}`).toBe(false);
        seen.add(g.id);
        expect(g.min, `En ${kind}/${g.id}, min <= max`).toBeLessThanOrEqual(g.max);
        expect(g.def, `En ${kind}/${g.id}, def >= min`).toBeGreaterThanOrEqual(g.min);
        expect(g.def, `En ${kind}/${g.id}, def <= max`).toBeLessThanOrEqual(g.max);
      }
    }
  });

  it("original(kind) devuelve el genoma idéntico a los valores por defecto (def)", () => {
    for (const kind of ALL_CARS) {
      const orig = original(kind);
      const spec = GENES[kind];
      for (const g of spec) {
        expect(orig[g.id], `En ${kind}/${g.id}, original debe coincidir con def`).toBe(g.def);
      }
    }
  });

  it("genome(kind) devuelve valores numéricos finitos y no nulos para todos los genes", () => {
    for (const kind of ALL_CARS) {
      const g = genome(kind);
      const spec = GENES[kind];
      for (const s of spec) {
        expect(typeof g[s.id], `En ${kind}/${s.id}, el gen debe ser numérico`).toBe("number");
        expect(Number.isFinite(g[s.id]), `En ${kind}/${s.id}, el gen debe ser finito`).toBe(true);
      }
    }
  });
});
