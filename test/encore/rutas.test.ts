import { describe, expect, it } from "vitest";
import { ask, ENC, fxText, newRun, pactFx, routeOffer, pick, tick, variantOf, VARIANTS, Run, toDecision } from "./_fixtures";

describe("rutas: destino del escenario siguiente", () => {
  const atRoute = (seed = 5, stage = 0, loop = 0) => { const r = { ...newRun(seed), stage, loop }; toDecision(r); adv0(r); return r; };
  const adv0 = (r: Run) => { const e = pick(r, 1); if (e === "pact_offer") pick(r, 2); };

  it("la oferta son 2 variantes distintas, estable por (semilla, vuelta, escenario) y variable entre semillas", () => {
    const r = atRoute();
    expect(r.phase).toBe("route");
    const [a, b] = r.routes!;
    expect(a).not.toBe(b);
    expect(routeOffer(r)).toEqual(r.routes);
    expect(routeOffer({ ...newRun(5) })).toEqual(routeOffer({ ...newRun(5) }));
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) for (let st = 0; st < ENC.stages - 1; st++) seen.add(routeOffer({ ...newRun(seed), stage: st }).join());
    expect(seen.size).toBeGreaterThan(3);
  });

  it("no gasta el rng() de la partida", () => {
    const rnd = Math.random; let calls = 0; Math.random = () => (calls++, rnd());
    try { atRoute(); } finally { Math.random = rnd; }
    expect(calls).toBe(0);
  });

  it("una vuelta jugada por rutas no repite variante (QA final: LA TARIMA salía dos veces)", () => {
    for (let seed = 1; seed <= 60; seed++) for (const choice of [0, 1] as const) {
      const r = newRun(seed); r.loop = 1;
      const seen = [variantOf(r)];
      for (let st = 1; st < ENC.stages; st++) { toDecision(r); adv0(r); expect(r.phase).toBe("route"); pick(r, choice); seen.push(variantOf(r)); }
      expect(new Set(seen).size).toBe(ENC.stages);
    }
  });

  it("ask muestra riesgo y recompensa de cada destino, sin botón de rechazo", () => {
    const r = atRoute(), a = ask(r)!;
    expect(a).toMatchObject({ total: ENC.routeS });
    expect(a.reject).toBeUndefined();
    r.routes!.forEach((v, i) => {
      expect(a.opts[i]).toBe(VARIANTS[v].name);
      expect(a.pacts![i].gain).toEqual(fxText(VARIANTS[v].reward));
      expect(a.pacts![i].cost).toEqual([VARIANTS[v].risk]);
      expect(a.pacts![i].gain.length).toBeGreaterThan(0);
    });
  });

  it("elegir fija la variante del escenario y aplica su recompensa solo ahí", () => {
    for (const i of [0, 1] as const) {
      const r = atRoute(), v = r.routes![i];
      expect(pick(r, i)).toBe("advance");
      expect(r).toMatchObject({ stage: 1, phase: "stage", route: v, routes: null });
      expect(variantOf(r)).toBe(VARIANTS[v]);
      const f = pactFx(r);
      for (const [k, m] of Object.entries(VARIANTS[v].reward)) expect(f[k as keyof typeof f]).toBeCloseTo(m as number);
    }
  });

  it("si vence la ventana elige el primero; la reward se suma a la de los pactos", () => {
    const r = atRoute(), first = r.routes![0];
    for (let i = 0; i < ENC.routeS - 1; i++) expect(tick(r, 1)).toBeNull();
    expect(tick(r, 1)).toBe("advance");
    expect(r.route).toBe(first);
    r.pacts.push({ id: "chatarra", left: 3 });
    const sc = (VARIANTS[first].reward.scrap ?? 1) * 1.5;
    expect(pactFx(r).scrap).toBeCloseTo(sc);
  });

  it("no hay rutas al pasar a la votación ni tras ENCORE!", () => {
    const r = { ...newRun(5), stage: ENC.stages - 1 }; toDecision(r);
    expect(pick(r, 1)).toBe("vote");
    expect(pick(r, 0)).toBe("encore");
    expect(r).toMatchObject({ phase: "stage", route: null, routes: null });
  });
});
