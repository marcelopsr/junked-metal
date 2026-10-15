import { describe, expect, it } from "vitest";
import { pick, newRun, tick, toDecision } from "./_fixtures";

describe("primera expedición del guardado", () => {
  it("first: AVANZAR no ofrece pactos y pasa directo a la ruta", () => {
    const r = newRun(5); toDecision(r); r.first = true;
    expect(pick(r, 1)).toBe("route_offer");
  });
  it("hold: la oferta de pactos no corre el reloj hasta elegir", () => {
    const r = newRun(5); toDecision(r);
    expect(pick(r, 1)).toBe("pact_offer");
    r.hold = true; const t0 = r.timer;
    expect(tick(r, 999)).toBeNull();
    expect(r.timer).toBe(t0);
    expect(pick(r, 2)).toBe("pact_no");
    expect(r.hold).toBe(false);
  });
});
