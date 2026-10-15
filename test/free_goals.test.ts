// Paseo libre: objetivos por barrio (completar, no repetir, premio del barrio) y su vínculo con logros y pinturas.
import { describe, expect, it } from "vitest";
import { ACH } from "../src/achievements";
import { readFileSync } from "node:fs";
import { BARRIOS, BARRIO_LOGRO, METAS, barrioCompleto, metasStep, type MetaEv } from "../src/free_goals";

const PAINT_SRC = readFileSync("src/menu/garage_paint.ts", "utf8");
const truco =(o: Partial<Extract<MetaEv, { k: "truco" }>>): MetaEv => ({ k: "truco", x: -150, z: 150, clean: true, dist: 0, mult: 1, yawDeg: 0, flips: 0, ...o });
describe("objetivos de barrio", () => {
  it("cada barrio tiene 4-5 objetivos con id único, y un logro con pintura", () => {
    expect(new Set(METAS.map((m) => m.id)).size).toBe(METAS.length);
    for (const b of BARRIOS) {
      const n = METAS.filter((m) => m.barrio === b).length;
      expect(n).toBeGreaterThanOrEqual(4); expect(n).toBeLessThanOrEqual(5);
      expect(ACH[BARRIO_LOGRO[b]]).toBeTruthy();
      expect(PAINT_SRC).toContain(`"${BARRIO_LOGRO[b]}"`); // garage_paint.ts toca el DOM al importarse: se lee como texto
    }
  });
  it("saltar lejos, combo y lugar escondido se completan una sola vez", () => {
    const h: string[] = [];
    expect(metasStep(h, truco({ dist: 20 }))).toEqual([]); // corto
    expect(metasStep(h, truco({ dist: 40, mult: 3 })).map((m) => m.id).sort()).toEqual(["skate_combo", "skate_salto"]);
    expect(metasStep(h, truco({ dist: 40, mult: 3 }))).toEqual([]);
    expect(metasStep(h, truco({ dist: 40, clean: false, x: 130, z: 51 }))).toEqual([]); // sucio no cuenta
    expect(metasStep(h, { k: "pos", x: -45, z: 140 }).map((m) => m.id)).toEqual(["skate_bowl"]);
  });
  it("tuercas del barrio: todas las del rango", () => {
    const h: string[] = [], bits = (i: number[]) => [...Array(24).keys()].map((k) => (i.includes(k) ? "1" : "0")).join("");
    expect(metasStep(h, { k: "tuercas", bits: bits([5, 6, 7, 8, 9]) })).toEqual([]);
    expect(metasStep(h, { k: "tuercas", bits: bits([5, 6, 7, 8, 9, 10]) }).map((m) => m.id)).toEqual(["skate_tuercas"]);
  });
  it("desafío con medalla y premio al completar el barrio", () => {
    const h: string[] = [];
    expect(metasStep(h, { k: "fin", d: "obs", medalla: 1 })).toEqual([]);
    expect(metasStep(h, { k: "fin", d: "obs", medalla: 3 }).map((m) => m.id).sort()).toEqual(["obstaculos_oro", "obstaculos_plata"]);
    expect(barrioCompleto(h, "obstaculos")).toBe(false);
    metasStep(h, { k: "pos", x: 160, z: -185 }); metasStep(h, { k: "tuercas", bits: "1".repeat(24) });
    expect(barrioCompleto(h, "obstaculos")).toBe(true); expect(barrioCompleto(h, "skate")).toBe(false);
  });
});
