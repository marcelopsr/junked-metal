import { describe, it, expect } from "vitest";
import { ACH } from "../src/achievements";
import { DEF } from "../src/enemies";

describe("logros", () => {
  it("los logros nuevos existen y los de bicho coinciden con un Kind", () => {
    for (const k of ["payaso", "zen", "foto", "lluvia", "mosca", "babosa", "sinfin"] as const) expect(ACH[k].name && ACH[k].txt).toBeTruthy();
    for (const k of ["payaso", "mosca", "babosa"]) expect(k in DEF).toBe(true);
  });
});
