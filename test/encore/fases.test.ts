import { describe, expect, it } from "vitest";
import { ask, boarded, bossDown, ENC, newRun, paceOf, pick, sceneIdx, tag, tick, until, adv, toDecision } from "./_fixtures";

describe("flujo de fases", () => {
  it("escenario → teleportador → decisión: antes de aterrizar no se puede abordar", () => {
    const r = newRun(5);
    expect(boarded(r)).toBeNull();
    expect(pick(r, 1)).toBeNull();
    for (let i = 0; i < ENC.teleS - 1; i++) expect(tick(r, 1)).toBeNull();
    expect(tick(r, 1)).toBe("tele_land");
    expect(tick(r, 1)).toBeNull(); // aterriza una sola vez
    expect(r.phase).toBe("stage"); // sigue el escenario hasta que el auto lo active
    expect(boarded(r)).toBe("tele_ready");
    expect(r.phase).toBe("teleporter");
    expect(boarded(r)).toBeNull();
  });

  it("quedarse: la amenaza sube más rápido y la decisión vuelve a abrirse", () => {
    const r = newRun(5); toDecision(r);
    const p0 = paceOf(r);
    expect(pick(r, 0)).toBe("stay");
    expect(r.phase).toBe("stay");
    expect(ask(r)!.opts[0]).toBeNull(); // quedándose solo se puede avanzar ya
    expect(pick(r, 0)).toBeNull();
    expect(until(r)).toBe("tele_ready");
    expect(r.phase).toBe("teleporter");
    expect(r.stays).toBe(1);
    expect(paceOf(r) - p0).toBeCloseTo(ENC.stayS * ENC.stayRamp, 5);
    expect(r.timer).toBe(ENC.decideS);
  });

  it("avanzar sube el escenario y reinicia el reloj; la dificultad crece por escenario", () => {
    const r = newRun(5); const paces = [paceOf(r)];
    for (let k = 1; k < ENC.stages; k++) {
      toDecision(r);
      expect(pick(r, 1)).toBe("pact_offer"); // AVANZAR abre la oferta; rechazarla carga el escenario
      expect(r.stage).toBe(k - 1);
      expect(pick(r, 2)).toBe("pact_no");
      expect(r.phase).toBe("route"); // y antes del escenario se elige el destino
      expect(pick(r, 1)).toBe("advance");
      expect(r).toMatchObject({ stage: k, phase: "stage", stageT: 0, landed: false, stays: 0, stayT: 0 });
      paces.push(paceOf(r));
    }
    expect(paces).toEqual([...paces].sort((a, b) => a - b));
    expect(new Set(paces).size).toBe(ENC.stages);
    expect(tag(r)).toEqual(["ESCENARIO ", `${ENC.stages}/${ENC.stages}`, true]);
  });

  it("si vence la ventana de decisión, el show avanza solo", () => {
    const r = newRun(5); toDecision(r);
    for (let i = 0; i < ENC.decideS - 1; i++) expect(tick(r, 1)).toBeNull();
    expect(tick(r, 1)).toBe("route_offer");
    expect(until(r)).toBe("advance");
    expect(r.stage).toBe(1);
  });

  it("tras el escenario 4: votación; FINAL ACT → jefe → victoria", () => {
    const r = newRun(9);
    for (let k = 0; k < ENC.stages - 1; k++) { toDecision(r); adv(r); }
    toDecision(r);
    expect(pick(r, 1)).toBe("vote");
    expect(r.phase).toBe("vote");
    expect(ask(r)).toMatchObject({ opts: ["¡ENCORE!", "FINAL ACT"], total: ENC.voteS });
    expect(sceneIdx(r)).toBe(ENC.stages);
    expect(bossDown(r)).toBeNull(); // el jefe solo cuenta en el FINAL ACT
    expect(pick(r, 1)).toBe("final_act");
    expect(r.phase).toBe("final");
    expect(ask(r)).toBeNull();
    expect(tick(r, 5)).toBeNull();
    expect(sceneIdx(r)).toBe(ENC.stages + 1);
    expect(bossDown(r)).toBe("won");
    expect(r.phase).toBe("won");
  });

  it("¡ENCORE! (o votación vencida) abre otra vuelta más difícil, de vuelta al escenario 1", () => {
    for (const how of ["pick", "timeout"] as const) {
      const r = newRun(9);
      for (let k = 0; k < ENC.stages - 1; k++) { toDecision(r); adv(r); }
      const before = paceOf(r);
      toDecision(r); adv(r);
      expect(how === "pick" ? pick(r, 0) : until(r)).toBe("encore");
      expect(r).toMatchObject({ loop: 1, stage: 0, phase: "stage" });
      expect(paceOf(r)).toBeGreaterThan(before);
      expect(tag(r)[1]).toBe(`1/${ENC.stages} · VUELTA 2`);
    }
  });
});
