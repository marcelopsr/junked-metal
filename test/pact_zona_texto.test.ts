import { describe, expect, it } from "vitest";
import { PACTS } from "../src/encore";
import { zonasDe } from "../src/pact_zones";

describe("carta de pacto con zona", () => {
  it("los pactos con zona en la tabla son los que tienen la línea de la carta", () => {
    const conLinea = PACTS.filter((p) => p.zona).map((p) => p.id).sort();
    expect(conLinea).toEqual(zonasDe(PACTS.map((p) => p.id)).map((d) => d.pacto).sort());
    expect(conLinea).toHaveLength(6);
  });
});
