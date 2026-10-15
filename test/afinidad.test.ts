import { describe, expect, it, vi } from "vitest";
vi.stubGlobal("location", { search: "" });
import { afinOf, newRun, routeOffer, VARIANTS } from "../src/encore";
import { BAL } from "../src/balance";
const { levelOffers, WEAPONS } = await import("../src/weapons");

describe("afinidad escenario-arma", () => {
  it("cada variante tiene fila, armas validas, y juntas cubren las 12 armas que no salian", () => {
    const vistas = new Set<string>();
    for (const v of VARIANTS) { const a = afinOf(v); expect(a, v.name).not.toBeNull(); for (const w of a!.armas) { expect(WEAPONS).toHaveProperty(w); vistas.add(w); } }
    for (const w of ["tesla", "lanza", "bengalas", "bocina", "bobinas", "dardos", "chapitas", "domino", "avioncito", "pintura", "lupasolar", "dron"]) expect(vistas.has(w), w).toBe(true);
    expect(Object.keys(BAL.afinidad)).toHaveLength(VARIANTS.length);
  });
  it("la oferta favorece las armas afines", () => {
    let con = 0, sin = 0;
    for (let s = 0; s < 400; s++) {
      for (const o of levelOffers([], {}, 3, { armas: ["tesla"], peso: 50 })) if (o.id === "tesla") con++;
      for (const o of levelOffers([], {}, 3, null)) if (o.id === "tesla") sin++;
    }
    expect(con).toBeGreaterThan(sin * 3);
  });
  it("primera expedicion: sin destinos terrestres en la vuelta 0; despues si", () => {
    let vio = false;
    for (let s = 1; s < 60; s++) {
      const r = newRun(s); r.first = true;
      expect(routeOffer(r).every((i) => !VARIANTS[i].zone)).toBe(true);
      r.first = false; if (routeOffer(r).some((i) => VARIANTS[i].zone)) vio = true;
    }
    expect(vio).toBe(true);
  });
});
