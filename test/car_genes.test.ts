import { describe, expect, it } from "vitest";
import chosen from "../src/car_genes.json";
import { GENES, genome, original } from "../src/car_genes";
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

describe("car_genes - Flota completa (17 vehículos)", () => {
  it("cada uno de los 17 autos tiene especificación en GENES", () => {
    for (const car of ALL_CARS) {
      expect(GENES[car], `El auto ${car} debe tener genes definidos`).toBeDefined();
      expect(GENES[car].length).toBeGreaterThan(0);
    }
  });

  it("todos los genes tienen rangos coherentes (min <= def <= max)", () => {
    for (const car of ALL_CARS) {
      for (const g of GENES[car]) {
        expect(g.min).toBeLessThanOrEqual(g.def);
        expect(g.max).toBeGreaterThanOrEqual(g.def);
        expect(g.id).toBeTruthy();
        expect(g.comp).toBeTruthy();
      }
    }
  });

  it("original(kind) devuelve exactamente los valores def", () => {
    for (const car of ALL_CARS) {
      const orig = original(car);
      for (const g of GENES[car]) {
        expect(orig[g.id]).toBe(g.def);
      }
    }
  });

  it("genome(kind) devuelve un objeto no vacío para todos los autos", () => {
    for (const car of ALL_CARS) {
      const g = genome(car);
      expect(Object.keys(g).length).toBe(GENES[car].length);
    }
  });

  it("helado tiene el soporte de cucurucho y el piso elevado a 1.1", () => {
    const cucurucho = GENES.helado.find((g) => g.id === "cucurucho");
    expect(cucurucho).toBeDefined();
    expect(cucurucho!.min).toBe(1.0);
    expect(cucurucho!.max).toBe(1.35);

    const soporte = GENES.helado.find((g) => g.id === "cucurucho_soporte");
    expect(soporte).toBeDefined();
    expect(soporte!.def).toBe(0.06);
  });

  it("monster: jaula antivuelco y escapes son piezas nuevas que el original no arma (valor 0)", () => {
    for (const id of ["jaula_alto", "escape_alto"]) {
      const x = GENES.monster.find((g) => g.id === id);
      expect(x, id).toBeDefined();
      expect(x!.def).toBe(0);
      expect(x!.min).toBe(0);
    }
    expect(original("monster").jaula_alto).toBe(0);
  });

  it("los genomas exportados (car_genes.json) están dentro de los rangos de GENES", () => {
    for (const [car, e] of Object.entries(chosen as Record<string, { g: Record<string, number> }>)) {
      for (const x of GENES[car]) {
        const v = e.g[x.id];
        if (v === undefined) continue;
        expect(v, `${car}.${x.id}`).toBeGreaterThanOrEqual(x.min - 1e-9);
        expect(v, `${car}.${x.id}`).toBeLessThanOrEqual(x.max + 1e-9);
      }
    }
  });
});
