import { describe, expect, it } from "vitest";
import { craterPlan, ENC, line, newRun, stageSeed, variantOf, VARIANTS } from "./_fixtures";

describe("semillas y frases", () => {
  it("el escenario 0 de la vuelta 0 usa la semilla de la run; el resto, otras distintas y estables", () => {
    expect(stageSeed(1234, 0, 0)).toBe(1234);
    const seeds = new Set<number>();
    for (let l = 0; l < 3; l++) for (let s = 0; s < ENC.stages + 2; s++) seeds.add(stageSeed(1234, l, s));
    expect(seeds.size).toBe(3 * (ENC.stages + 2));
    expect(stageSeed(1234, 1, 2)).toBe(stageSeed(1234, 1, 2));
  });

  it("las frases alternativas varían por semilla y escenario, son deterministas y nunca repiten seguidas", () => {
    const ids = ["start", "tele_land", "tele_ready", "overload", "guest", "stay", "pact_offer", "pact_yes", "pact_no", "route_offer", "advance", "vote", "encore", "final_act", "boss_intro", "won"] as const;
    for (const id of ids) {
      const seen = new Set<string>();
      for (let seed = 1; seed <= 30; seed++) for (let stage = 0; stage < ENC.stages; stage++) {
        const r = { ...newRun(seed), stage }, l = line(id, r);
        expect(l).toBe(line(id, { ...r })); expect(l.length).toBeLessThan(80); expect(l).not.toMatch(/\b(querés|tenés|podés|sos|vos|elegí|decidí)\b/i);
        if (stage) expect(l).not.toBe(line(id, { ...r, stage: stage - 1 }));
        seen.add(l);
      }
      expect(seen.size).toBeGreaterThanOrEqual(3);
    }
  });

  it("toda fase con evento tiene frase corta del Director, sin voseo", () => {
    const r = newRun(1);
    for (const id of ["start", "tele_land", "tele_ready", "stay", "pact_offer", "pact_yes", "pact_no", "route_offer", "advance", "vote", "encore", "final_act", "boss_intro", "won"] as const) {
      const l = line(id, r);
      expect(l.length).toBeGreaterThan(10);
      expect(l.length).toBeLessThan(75);
      expect(l).not.toMatch(/\b(querés|tenés|podés|sos|vos|elegí|decidí)\b/i);
    }
  });
});

describe("variantes de escenario", () => {
  /** Variantes de los escenarios de una vuelta, en orden. */
  const cycle = (seed: number, loop: number) => Array.from({ length: ENC.stages }, (_, stage) => variantOf({ ...newRun(seed), loop, stage }));

  it("cada vuelta usa las variantes sin repetir; el primer escenario de la run es LA TARIMA", () => {
    expect(VARIANTS.length).toBe(15); // más variantes que escenarios: una vuelta de 4 no las usa todas (las del galpón, el desván, la pileta y la cocina solo se juegan por elección)
    for (const seed of [1, 7, 1234, 99999]) for (let loop = 0; loop < 4; loop++) {
      const c = cycle(seed, loop);
      expect(new Set(c).size).toBe(ENC.stages);
      if (!loop) expect(c[0]).toBe(VARIANTS[0]);
    }
  });

  it("es determinista por semilla y vuelta, y el orden cambia con la semilla", () => {
    expect(cycle(42, 1)).toEqual(cycle(42, 1));
    const orders = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) orders.add(cycle(seed, 1).map((v) => v!.name).join());
    expect(orders.size).toBeGreaterThan(4);
  });

  it("la votación y el FINAL ACT no tienen variante", () => {
    const r = newRun(5);
    expect(variantOf({ ...r, phase: "vote" })).toBeNull();
    expect(variantOf({ ...r, phase: "final" })).toBeNull();
    expect(variantOf({ ...r, phase: "won" })).toBeNull();
  });

  it("LA TARIMA es el escenario neutro y las demás se distinguen en lugar de llegada", () => {
    expect(VARIANTS[0]).toMatchObject({ at: "salida", craters: [0, 0, 0], rain: 1, quake: 1, sky: 1, ship: null });
    expect(new Set(VARIANTS.map((v) => v.name)).size).toBe(VARIANTS.length);
    expect(new Set(VARIANTS.slice(0, 4).map((v) => v.at)).size).toBe(4);
  });

  it("los cráteres extra salen de la semilla del escenario, lejos de la llegada y sin pasar el tope", () => {
    for (const v of VARIANTS) {
      const r = { ...newRun(77), loop: 1, stage: 2 }, p = craterPlan(v, r);
      expect(p).toEqual(craterPlan(v, { ...r }));
      expect(p.length).toBe(v.craters[0]);
      expect(v.craters[0]).toBeLessThanOrEqual(10);
      for (const k of p) { expect(k.d - k.r).toBeGreaterThanOrEqual(14); expect(k.r).toBeGreaterThanOrEqual(v.craters[1]); expect(k.r).toBeLessThanOrEqual(v.craters[2]); }
    }
    const v = VARIANTS[2];
    expect(craterPlan(v, { ...newRun(77), stage: 1 })).not.toEqual(craterPlan(v, { ...newRun(77), stage: 2 }));
  });

  it("el anuncio del Director es corto y sin voseo", () => {
    for (const v of VARIANTS) {
      const t = `${v.name}. ${v.line}`;
      expect(t.length).toBeLessThan(75);
      expect(t).not.toMatch(/\b(querés|tenés|podés|sos|vos|elegí|decidí)\b/i);
    }
  });
});
