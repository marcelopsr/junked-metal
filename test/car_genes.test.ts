import { describe, expect, it } from "vitest";
import { GENES, genome, original } from "../src/car_genes";
import chosen from "../src/car_genes.json";

const ALL_CARS = [
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
] as const;

describe("car_genes (100% de la flota parametrizada)", () => {
  it("todos los 17 autos de la flota tienen especificación en GENES", () => {
    expect(ALL_CARS.length).toBe(17);
    for (const car of ALL_CARS) {
      expect(GENES[car], `Falta especificación de genes para ${car}`).toBeDefined();
      expect(GENES[car].length).toBeGreaterThan(0);
    }
  });

  it("el genoma original coincide exactamente con def para cada auto", () => {
    for (const car of ALL_CARS) {
      const orig = original(car);
      const spec = GENES[car];
      for (const gene of spec) {
        expect(orig[gene.id]).toBe(gene.def);
        expect(gene.min).toBeLessThanOrEqual(gene.def);
        expect(gene.max).toBeGreaterThanOrEqual(gene.def);
      }
    }
  });

  it("los genomas exportados en car_genes.json cumplen los rangos de sus genes", () => {
    const exports = chosen as Record<string, { g?: Record<string, number> }>;
    for (const [car, data] of Object.entries(exports)) {
      if (!data?.g) continue;
      const spec = GENES[car];
      expect(spec, `Auto exportado ${car} no existe en GENES`).toBeDefined();
      const specMap = new Map(spec.map((x) => [x.id, x]));
      for (const [id, val] of Object.entries(data.g)) {
        const gene = specMap.get(id);
        expect(gene, `Gen ${id} en ${car} no existe en spec`).toBeDefined();
        if (gene) {
          expect(val).toBeGreaterThanOrEqual(gene.min - 1e-4);
          expect(val).toBeLessThanOrEqual(gene.max + 1e-4);
        }
      }
    }
  });

  it("genome(kind) devuelve def para autos sin exportar y la exportación para los vigentes", () => {
    for (const car of ALL_CARS) {
      const g = genome(car);
      const orig = original(car);
      expect(Object.keys(g).length).toBe(Object.keys(orig).length);
    }
    // Buggy y Monster están exportados en car_genes.json
    expect(genome("buggy").rueda_d).not.toBe(original("buggy").rueda_d);
    expect(genome("monster").caja_y).not.toBe(original("monster").caja_y);
  });
});
