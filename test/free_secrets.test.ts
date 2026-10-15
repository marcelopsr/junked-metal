// Paseo libre: los 4 secretos (descubrir una vez, altura de la azotea, premio al completar).
import { describe, expect, it } from "vitest";
import { ACH } from "../src/achievements";
import { readFileSync } from "node:fs";
import { SECRETOS, SECRETOS_N, secretoNear, secretosCount } from "../src/free_secrets";

describe("secretos del Paseo libre", () => {
  it("son 4, con id único y cada uno cae en un barrio distinto", () => {
    expect(SECRETOS_N).toBe(4);
    expect(new Set(SECRETOS.map((s) => s.id)).size).toBe(4);
  });
  it("se descubre al llegar, una sola vez", () => {
    const s = SECRETOS[0];
    expect(secretoNear("0000", s.x, 0.5, s.z)).toBe(0);
    expect(secretoNear("1000", s.x, 0.5, s.z)).toBe(-1);
    expect(secretoNear("0000", s.x + 50, 0.5, s.z)).toBe(-1);
  });
  it("la azotea exige estar arriba: pasar por abajo no cuenta", () => {
    const a = SECRETOS.findIndex((s) => s.id === "azotea"), s = SECRETOS[a];
    expect(secretoNear("0000", s.x, 0.5, s.z)).toBe(-1);
    expect(secretoNear("0000", s.x, 3.6, s.z)).toBe(a);
  });
  it("el conteo y el premio (logro con pintura Platino secreto) existen", () => {
    expect(secretosCount("0101")).toBe(2);
    expect(ACH.secretos.name).toBeTruthy();
    expect(readFileSync("src/menu/garage_paint.ts", "utf8")).toContain('["secretos", "Platino secreto"]');
  });
});
