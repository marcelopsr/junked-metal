import { describe, expect, it } from "vitest";
import { boarded, finalHpMul, guestDown, guestWaiting, newRun, tick, teleEvent } from "./_fixtures";
import { BAL } from "../../src/balance";

describe("P2: vida del jefe final", () => {
  it("crece con los escenarios jugados y los pactos aceptados", () => {
    const r = newRun(1); r.phase = "final"; r.stage = 0;
    const base = finalHpMul(r);
    expect(base).toBeCloseTo(1 + BAL.ritmo.final_vida_por_escenario);
    r.loop = 1; expect(finalHpMul(r)).toBeGreaterThan(base);
    const sin = finalHpMul(r); r.taken.push("a", "b"); expect(finalHpMul(r)).toBeCloseTo(sin + 2 * BAL.ritmo.final_vida_por_pacto);
  });
});

describe("P9: aviso antes del invitado", () => {
  it("el invitado espera invitado_aviso_s y recién entonces deja de estar en espera", () => {
    let r = newRun(1);
    for (let s = 2; s < 500 && teleEvent(r) !== "BOSS_GUEST"; s++) r = newRun(s);
    r.landed = true; expect(boarded(r)).toBe("guest");
    expect(guestWaiting(r)).toBe(true);
    tick(r, BAL.ritmo.invitado_aviso_s - 0.5); expect(guestWaiting(r)).toBe(true);
    expect(tick(r, 1)).toBeNull(); expect(guestWaiting(r)).toBe(false); expect(r.phase).toBe("guest");
    expect(guestDown(r)).toBe("tele_ready");
  });
});
