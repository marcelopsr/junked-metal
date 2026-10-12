// Fases de ENCORE sin motor (src/encore.ts): escenario → teleportador → decidir → ... → votación → ENCORE! o FINAL ACT → victoria.
import { describe, expect, it } from "vitest";
import { ask, boarded, bossDown, ENC, line, newRun, paceOf, pick, sceneIdx, stageSeed, tag, tick, type Ev, type Run } from "../src/encore";

/** Corre el reloj de a 1 s hasta que pase algo (o se pase de `max` s). */
const until = (r: Run, max = 1000): Ev | null => { for (let i = 0; i < max; i++) { const e = tick(r, 1); if (e) return e; } return null; };
/** Lleva el escenario hasta la decisión abierta. */
const toDecision = (r: Run) => { expect(until(r)).toBe("tele_land"); expect(boarded(r)).toBe("tele_ready"); };

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
    expect(tick(r, 1)).toBe("advance");
    expect(r.stage).toBe(1);
  });

  it("tras el escenario 4: votación; FINAL ACT → jefe → victoria", () => {
    const r = newRun(9);
    for (let k = 0; k < ENC.stages - 1; k++) { toDecision(r); pick(r, 1); }
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
      for (let k = 0; k < ENC.stages - 1; k++) { toDecision(r); pick(r, 1); }
      const before = paceOf(r);
      toDecision(r); pick(r, 1);
      expect(how === "pick" ? pick(r, 0) : until(r)).toBe("encore");
      expect(r).toMatchObject({ loop: 1, stage: 0, phase: "stage" });
      expect(paceOf(r)).toBeGreaterThan(before);
      expect(tag(r)[1]).toBe(`1/${ENC.stages} · VUELTA 2`);
    }
  });
});

describe("semillas y frases", () => {
  it("el escenario 0 de la vuelta 0 usa la semilla de la run; el resto, otras distintas y estables", () => {
    expect(stageSeed(1234, 0, 0)).toBe(1234);
    const seeds = new Set<number>();
    for (let l = 0; l < 3; l++) for (let s = 0; s < ENC.stages + 2; s++) seeds.add(stageSeed(1234, l, s));
    expect(seeds.size).toBe(3 * (ENC.stages + 2));
    expect(stageSeed(1234, 1, 2)).toBe(stageSeed(1234, 1, 2));
  });

  it("toda fase con evento tiene frase corta del Director, sin voseo", () => {
    const r = newRun(1);
    for (const id of ["start", "tele_land", "tele_ready", "stay", "advance", "vote", "encore", "final_act", "boss_intro", "won"] as const) {
      const l = line(id, r);
      expect(l.length).toBeGreaterThan(10);
      expect(l.length).toBeLessThan(75);
      expect(l).not.toMatch(/\b(querés|tenés|podés|sos|vos|elegí|decidí)\b/i);
    }
  });
});
