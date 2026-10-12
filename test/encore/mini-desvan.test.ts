import { describe, expect, it } from "vitest";
import { miniOf, newRun, VARIANTS } from "../../src/encore";

describe("minijefe del desván", () => {
  it("alterna payaso y muñeco por semilla; las demás variantes no cambian", () => {
    const d = VARIANTS.findIndex((v) => v.zone === "desvan"), seen = new Set<string | null>();
    for (let s = 1; s < 40; s++) { const r = newRun(s); r.route = d; seen.add(miniOf(r)); }
    expect([...seen].sort()).toEqual(["muneco", "payaso"]);
    const g = VARIANTS.findIndex((v) => v.zone === "galpon"), r = newRun(7); r.route = g;
    expect(miniOf(r)).toBe("grua");
  });
});

describe("variante LA PILETA VACÍA", () => {
  it("es terrestre, con EL LIMPIAFONDOS de minijefe fijo", () => {
    const p = VARIANTS.findIndex((v) => v.zone === "pileta"), r = newRun(3); r.route = p;
    expect(VARIANTS[p]).toMatchObject({ mini: "limpiafondos", zone: "pileta" });
    expect(miniOf(r)).toBe("limpiafondos");
  });
});
