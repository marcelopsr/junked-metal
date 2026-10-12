// Fases de ENCORE sin motor (src/encore.ts): escenario → teleportador → decidir → ... → votación → ENCORE! o FINAL ACT → victoria.
import { describe, expect, it } from "vitest";
import { activePacts, ask, boarded, bossDown, craterPlan, ENC, fxText, line, NO_FX, newRun, pactFx, pactOffer, PACTS, paceOf, pick, sceneIdx, stageSeed, tag, tick, variantOf, VARIANTS, type Ev, type Run } from "../src/encore";

/** Corre el reloj de a 1 s hasta que pase algo (o se pase de `max` s). */
const until = (r: Run, max = 1000): Ev | null => { for (let i = 0; i < max; i++) { const e = tick(r, 1); if (e) return e; } return null; };
/** AVANZAR y, si el Director ofrece pactos, rechazarlos (sin penalidad). */
const adv = (r: Run) => { const e = pick(r, 1); return e === "pact_offer" ? pick(r, 2) : e; };
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
      expect(pick(r, 1)).toBe("pact_offer"); // AVANZAR abre la oferta; rechazarla carga el escenario
      expect(r.stage).toBe(k - 1);
      expect(pick(r, 2)).toBe("pact_no");
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
    for (const id of ["start", "tele_land", "tele_ready", "stay", "pact_offer", "pact_yes", "pact_no", "advance", "vote", "encore", "final_act", "boss_intro", "won"] as const) {
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
    expect(VARIANTS.length).toBe(ENC.stages);
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
    expect(new Set(VARIANTS.map((v) => v.at)).size).toBe(VARIANTS.length);
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

describe("pactos del Director", () => {
  /** Run en la decisión del escenario `stage` con AVANZAR ya elegido (oferta abierta). */
  const offered = (seed = 5, stage = 0, loop = 0) => { const r = { ...newRun(seed), stage, loop }; toDecision(r); expect(pick(r, 1)).toBe("pact_offer"); return r; };

  it("la oferta son 2 pactos distintos, estable por (semilla, vuelta, escenario) y variable entre semillas", () => {
    const r = offered();
    expect(r.phase).toBe("pact");
    expect(r.offer).toHaveLength(2);
    expect(r.offer![0]).not.toBe(r.offer![1]);
    expect(pactOffer(newRun(5))).toEqual(r.offer);
    expect(pactOffer(newRun(5))).toEqual(pactOffer(newRun(5)));
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) for (let st = 0; st < ENC.stages - 1; st++) seen.add(pactOffer({ ...newRun(seed), stage: st })!.join());
    expect(seen.size).toBeGreaterThan(6);
    expect(ask(r)).toMatchObject({ title: "PACTO DEL DIRECTOR", total: ENC.pactS, reject: "RECHAZAR" });
  });

  it("aceptar activa el pacto y carga el escenario; rechazar o dejar vencer la ventana no cuesta nada", () => {
    const r = offered(), id = r.offer![1];
    expect(pick(r, 1)).toBe("pact_yes");
    expect(r).toMatchObject({ stage: 1, phase: "stage", offer: null });
    expect(r.pacts.map((a) => a.id)).toEqual([id]);
    expect(pactFx(r)).not.toEqual(NO_FX);
    for (const how of ["no", "timeout"] as const) {
      const q = offered(7);
      expect(how === "no" ? pick(q, 2) : until(q)).toBe("pact_no");
      expect(q).toMatchObject({ stage: 1, phase: "stage", pacts: [] });
      expect(pactFx(q)).toEqual(NO_FX);
    }
  });

  it("si vence la decisión del teleportador no hay oferta: el show avanza solo", () => {
    const r = newRun(5); toDecision(r);
    expect(until(r)).toBe("advance");
    expect(r.pacts).toEqual([]);
  });

  it("no hay oferta al pasar a la votación ni con menos de 2 pactos libres", () => {
    const r = { ...newRun(5), stage: ENC.stages - 1 }; toDecision(r);
    expect(pick(r, 1)).toBe("vote");
    const s = newRun(5); s.pacts = PACTS.slice(0, PACTS.length - 1).map((p) => ({ id: p.id, left: Infinity }));
    expect(pactOffer(s)).toBeNull();
    toDecision(s);
    expect(pick(s, 1)).toBe("advance");
  });

  it("no se vuelve a ofrecer un pacto activo", () => {
    const r = newRun(3); r.pacts = [{ id: PACTS[0].id, left: Infinity }, { id: PACTS[1].id, left: 2 }];
    for (let st = 0; st < ENC.stages - 1; st++) for (const id of pactOffer({ ...r, stage: st })!) expect(r.pacts.map((a) => a.id)).not.toContain(id);
  });

  it("duración: N escenarios jugados y se va; los de la run duran toda la expedición (también tras ENCORE!)", () => {
    const r = newRun(5);
    r.offer = [PACTS.find((p) => p.stages === 2)!.id, PACTS.find((p) => p.stages === Infinity)!.id]; r.phase = "pact";
    pick(r, 0);
    expect(activePacts(r)).toMatchObject([{ left: "2 ESC" }]);
    toDecision(r); adv(r); // sale del escenario 2: queda 1
    expect(r.pacts[0].left).toBe(1);
    toDecision(r); adv(r); // sale del escenario 3: vence
    expect(r.pacts).toEqual([]);
    const q = newRun(5); q.offer = [PACTS.find((p) => p.stages === Infinity)!.id, PACTS[0].id]; q.phase = "pact";
    pick(q, 0);
    for (let k = 0; k < ENC.stages - 2; k++) { toDecision(q); adv(q); }
    toDecision(q); adv(q); // al voto
    pick(q, 0); // ENCORE!
    expect(q.loop).toBe(1);
    expect(activePacts(q)).toMatchObject([{ left: "RUN" }]);
  });

  it("los efectos se combinan (multiplican; la regeneración suma) y sin pactos son neutros", () => {
    expect(pactFx(null)).toEqual(NO_FX);
    expect(pactFx(newRun(1))).toEqual(NO_FX);
    const r = newRun(1); r.pacts = [{ id: "garantia", left: Infinity }, { id: "nocturno", left: 1 }, { id: "sorpresa", left: 2 }, { id: "chatarra", left: Infinity }];
    const f = pactFx(r);
    expect(f.dmg).toBeCloseTo(1.35); expect(f.maxHp).toBeCloseTo(0.7); expect(f.regen).toBe(2); expect(f.xp).toBeCloseTo(1.5); expect(f.scrap).toBeCloseTo(1.5);
    expect(f.spawn).toBeCloseTo(1.4 * 1.3 * 1.25);
  });

  it("cada pacto tiene ventaja y costo reales, y el texto sale de los números aplicados", () => {
    expect(fxText({ dmg: 1.35 })).toEqual(["+35% DAÑO"]);
    expect(fxText({ maxHp: 0.7 })).toEqual(["-30% VIDA MÁXIMA"]);
    expect(fxText({ regen: 2 })).toEqual(["+2 VIDA/S"]);
    expect(fxText({ heal: 0.6 })).toEqual(["REPARA 60% DE LA VIDA AL ACEPTAR"]);
    expect(new Set(PACTS.map((p) => p.id)).size).toBe(PACTS.length);
    expect(PACTS.length).toBeGreaterThanOrEqual(5);
    for (const p of PACTS) {
      expect(fxText(p.gain).length).toBeGreaterThan(0);
      expect(fxText(p.cost).length).toBeGreaterThan(0);
      expect(`${p.name}${p.tag}`).not.toMatch(/\b(querés|tenés|podés|sos|vos|elegí|decidí)\b/i);
    }
  });
});
