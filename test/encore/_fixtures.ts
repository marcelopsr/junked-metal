// Fases de ENCORE sin motor (src/encore.ts): escenario → teleportador → decidir → ... → votación → ENCORE! o FINAL ACT → victoria.
import { expect } from "vitest";
export * from "../../src/encore";
import { tick, pick, boarded, guestDown, type Ev, type Run } from "../../src/encore";

/** Corre el reloj de a 1 s hasta que pase algo (o se pase de `max` s). */
export const until = (r: Run, max = 1000): Ev | null => { for (let i = 0; i < max; i++) { const e = tick(r, 1); if (e) return e; } return null; };
/** AVANZAR y, si el Director ofrece pactos, rechazarlos (sin penalidad). */
/** AVANZAR, rechazar los pactos si se ofrecen y tomar el primer destino si se ofrece: termina en el escenario siguiente (o la votación). */
export const adv = (r: Run) => { let e = pick(r, 1); if (e === "pact_offer") e = pick(r, 2); return e === "pact_no" || e === "pact_yes" || e === "route_offer" ? pick(r, 0) : e; };
/** Lleva el escenario hasta la decisión abierta. */
export const toDecision = (r: Run) => { // si el teleportador trae evento (R3), se supera antes de decidir
  expect(until(r)).toBe("tele_land");
  const e = boarded(r);
  if (e === "overload") expect(until(r)).toBe("tele_ready"); else if (e === "guest") expect(guestDown(r)).toBe("tele_ready"); else expect(e).toBe("tele_ready");
};
