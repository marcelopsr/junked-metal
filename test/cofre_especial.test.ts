import { expect, it } from "vitest";
import { BAL } from "../src/balance";

// moon_goals arrastra Babylon y el audio (DOM): se prueban las filas que lee chestPrice/specialPrice.
it("filas de precio de cofres en balance.json", () => {
  expect(BAL.ataques.cofre_precio_base).toBe(30);
  expect(BAL.ataques.cofre_especial_precio_k).toBeGreaterThan(1);
});
