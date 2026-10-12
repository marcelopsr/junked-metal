// Fases de ENCORE sin motor (src/encore.ts): escenario → teleportador → decidir → ... → votación → ENCORE! o FINAL ACT → victoria.
import { describe, expect, it } from "vitest";
import { activePacts, ARENA, arenaPlan, ask, cleared, FINAL_POOL, finalOf, hint, report, scrapExtra, boarded, bossDown, craterPlan, dirPri, dirPush, dirTick, ENC, fxText, GUESTS, guestDown, line, newDirQ, openingLine, teleEvent, NO_FX, newRun, pactFx, pactOffer, PACTS, paceOf, routeOffer, pick, sceneIdx, stageSeed, tag, tick, variantOf, VARIANTS, type Ev, type Run } from "../src/encore";

/** Corre el reloj de a 1 s hasta que pase algo (o se pase de `max` s). */
const until = (r: Run, max = 1000): Ev | null => { for (let i = 0; i < max; i++) { const e = tick(r, 1); if (e) return e; } return null; };
/** AVANZAR y, si el Director ofrece pactos, rechazarlos (sin penalidad). */
/** AVANZAR, rechazar los pactos si se ofrecen y tomar el primer destino si se ofrece: termina en el escenario siguiente (o la votación). */
const adv = (r: Run) => { let e = pick(r, 1); if (e === "pact_offer") e = pick(r, 2); return e === "pact_no" || e === "pact_yes" || e === "route_offer" ? pick(r, 0) : e; };
/** Lleva el escenario hasta la decisión abierta. */
const toDecision = (r: Run) => { // si el teleportador trae evento (R3), se supera antes de decidir
  expect(until(r)).toBe("tele_land");
  const e = boarded(r);
  if (e === "overload") expect(until(r)).toBe("tele_ready"); else if (e === "guest") expect(guestDown(r)).toBe("tele_ready"); else expect(e).toBe("tele_ready");
};

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
    expect(r).toMatchObject({ stage: 0, phase: "route", offer: null });
    expect(pick(r, 0)).toBe("advance");
    expect(r).toMatchObject({ stage: 1, phase: "stage" });
    expect(r.pacts.map((a) => a.id)).toEqual([id]);
    expect(pactFx(r)).not.toEqual(NO_FX);
    for (const how of ["no", "timeout"] as const) {
      const q = offered(7);
      expect(how === "no" ? pick(q, 2) : until(q)).toBe("pact_no");
      expect(q).toMatchObject({ stage: 0, phase: "route", pacts: [] });
      expect(pactFx(q)).toEqual(NO_FX);
    }
  });

  it("si vence la decisión del teleportador no hay oferta: el show avanza solo", () => {
    const r = newRun(5); toDecision(r);
    expect(until(r)).toBe("route_offer");
    expect(r.pacts).toEqual([]);
  });

  it("no hay oferta al pasar a la votación ni con menos de 2 pactos libres", () => {
    const r = { ...newRun(5), stage: ENC.stages - 1 }; toDecision(r);
    expect(pick(r, 1)).toBe("vote");
    const s = newRun(5); s.pacts = PACTS.slice(0, PACTS.length - 1).map((p) => ({ id: p.id, left: Infinity }));
    expect(pactOffer(s)).toBeNull();
    toDecision(s);
    expect(pick(s, 1)).toBe("route_offer");
  });

  it("no se vuelve a ofrecer un pacto activo", () => {
    const r = newRun(3); r.pacts = [{ id: PACTS[0].id, left: Infinity }, { id: PACTS[1].id, left: 2 }];
    for (let st = 0; st < ENC.stages - 1; st++) for (const id of pactOffer({ ...r, stage: st })!) expect(r.pacts.map((a) => a.id)).not.toContain(id);
  });

  it("duración: N escenarios jugados y se va; los de la run duran toda la expedición (también tras ENCORE!)", () => {
    const r = newRun(5);
    r.offer = [PACTS.find((p) => p.stages === 2)!.id, PACTS.find((p) => p.stages === Infinity)!.id]; r.phase = "pact";
    pick(r, 0); pick(r, 0); // acepta el pacto y toma el primer destino
    expect(activePacts(r)).toMatchObject([{ left: "2 ESC" }]);
    toDecision(r); adv(r); // sale del escenario 2: queda 1
    expect(r.pacts[0].left).toBe(1);
    toDecision(r); adv(r); // sale del escenario 3: vence
    expect(r.pacts).toEqual([]);
    const q = newRun(5); q.offer = [PACTS.find((p) => p.stages === Infinity)!.id, PACTS[0].id]; q.phase = "pact";
    pick(q, 0); pick(q, 0);
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

describe("R3: eventos del teleportador", () => {
  const seeds = Array.from({ length: 400 }, (_, i) => i * 7919 + 3);
  const at = (seed: number, loop: number, stage: number) => ({ ...newRun(seed), loop, stage });
  it("determinista por (semilla, vuelta, escenario) y la probabilidad sube con ambos", () => {
    expect(teleEvent(at(9, 1, 2))).toBe(teleEvent(at(9, 1, 2)));
    const rate = (loop: number, stage: number) => seeds.filter((s) => teleEvent(at(s, loop, stage)) !== "NINGUNO").length / seeds.length;
    expect(rate(0, 0)).toBeGreaterThan(0.1); expect(rate(0, 0)).toBeLessThan(0.3);
    expect(rate(0, 3)).toBeGreaterThan(rate(0, 0)); expect(rate(2, 3)).toBeGreaterThan(rate(0, 3));
    expect(rate(5, 3)).toBeLessThanOrEqual(ENC.eventMax + 0.06); // tope
    const kinds = new Set(seeds.map((s) => teleEvent(at(s, 1, 2))));
    expect(kinds).toEqual(new Set(["OVERLOAD", "BOSS_GUEST", "NINGUNO"]));
  });
  const withEv = (ev: string) => { const s = seeds.find((x) => teleEvent(at(x, 1, 3)) === ev)!; const r = newRun(s); r.loop = 1; r.stage = 3; return r; };
  it("NINGUNO abre la decisión directo", () => {
    const r = withEv("NINGUNO"); r.landed = true;
    expect(boarded(r)).toBe("tele_ready"); expect(r.phase).toBe("teleporter");
  });
  it("OVERLOAD: se aguanta la carga y recién después se decide; no se puede decidir antes", () => {
    const r = withEv("OVERLOAD"); r.landed = true;
    expect(boarded(r)).toBe("overload"); expect(r.phase).toBe("overload");
    expect(pick(r, 1)).toBeNull(); expect(guestDown(r)).toBeNull(); expect(r.guest).toBeNull();
    for (let i = 0; i < ENC.overloadS - 1; i++) expect(tick(r, 1)).toBeNull();
    expect(tick(r, 1)).toBe("tele_ready"); expect(r.phase).toBe("teleporter"); expect(r.timer).toBe(ENC.decideS);
  });
  it("BOSS_GUEST: un minijefe de la lista; el teleportador queda listo solo al vencerlo", () => {
    const r = withEv("BOSS_GUEST"); r.landed = true;
    expect(boarded(r)).toBe("guest"); expect(r.phase).toBe("guest");
    expect(GUESTS).toContain(r.guest!);
    expect(tick(r, 1000)).toBeNull(); expect(r.phase).toBe("guest"); // sin reloj: espera al jefe
    expect(guestDown(r)).toBe("tele_ready"); expect(r.phase).toBe("teleporter"); expect(guestDown(r)).toBeNull();
    expect(r.guest).toBeNull();
  });
  it("las líneas del Director existen para los eventos nuevos", () => {
    const r = newRun(1);
    expect(line("overload", r)).toMatch(/\S/); expect(line("guest", r)).toMatch(/\S/);
  });
});

describe("R3: cola del Director", () => {
  it("de a una, con separación mínima, y por prioridad", () => {
    const d = newDirQ();
    dirPush(d, "baja", 1); dirPush(d, "alta", 4); dirPush(d, "media", 2);
    expect(dirTick(d, 0.1)).toBe("alta");
    expect(dirTick(d, 1)).toBeNull(); // dentro de la separación
    expect(dirTick(d, ENC.dirGapS)).toBe("media");
    expect(dirTick(d, ENC.dirGapS)).toBe("baja");
    expect(dirTick(d, ENC.dirGapS)).toBeNull();
  });
  it("misma prioridad: orden de llegada; repetidas no se duplican", () => {
    const d = newDirQ(); dirPush(d, "a", 2); dirPush(d, "b", 2); dirPush(d, "a", 2);
    expect(d.q.length).toBe(2);
    expect(dirTick(d, 0)).toBe("a"); expect(dirTick(d, ENC.dirGapS)).toBe("b");
  });
  it("al pasarse del tope se pierde la de menor prioridad; las viejas caducan", () => {
    const d = newDirQ();
    dirPush(d, "x1", 3); dirPush(d, "x2", 1); dirPush(d, "x3", 3); dirPush(d, "x4", 3); dirPush(d, "x5", 3);
    expect(d.q.map((x) => x.txt)).toEqual(["x1", "x3", "x4", "x5"]);
    const e = newDirQ(); dirPush(e, "vieja", 2); e.cool = 100;
    expect(dirTick(e, ENC.dirTtlS + 1)).toBeNull(); expect(e.q.length).toBe(0);
  });
  it("prioridades: los hitos del show pasan antes que los avisos menores", () => {
    expect(dirPri("final_act")).toBeGreaterThan(dirPri("stay")); expect(dirPri("overload")).toBeGreaterThan(dirPri("pact_no"));
  });
});

describe("R3: memoria entre runs", () => {
  const m = (o: object = {}) => ({ best: { loop: 0 }, runs: 0, lastLoop: 0, lastCause: "", ...o });
  it("sin expediciones previas no hay mención y manda la frase de siempre", () => {
    expect(openingLine(m())).toBeNull(); expect(openingLine(undefined)).toBeNull();
    expect(line("start", newRun(1), m())).toBe(line("start", newRun(1)));
  });
  it("menciona la última derrota, la mejor vuelta o solo la insistencia", () => {
    expect(openingLine(m({ runs: 3, lastLoop: 1, lastCause: "bombardeo" }))).toMatch(/VUELTA 2.*BOMBARDEO/);
    expect(openingLine(m({ runs: 3, best: { loop: 2 } }))).toMatch(/OTRA VEZ AQUÍ.*EXPEDICIÓN 4.*VUELTA 3/);
    expect(openingLine(m({ runs: 1 }))).toMatch(/OTRA VEZ AQUÍ.*EXPEDICIÓN 2/);
    expect(line("start", newRun(1), m({ runs: 1 }))).toMatch(/OTRA VEZ AQUÍ/);
  });
});

describe("R5: jefe secreto, pistas, arena, reporte y tornillos", () => {
  const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 3);
  it("el jefe sale de la semilla: fijo, dentro del pozo, sin perro, y ambos aparecen", () => {
    const seen = new Set(seeds.map(finalOf));
    expect([...seen].sort()).toEqual(["aspiradora", "cortacercos"]);
    expect(FINAL_POOL as readonly string[]).not.toContain("perro");
    for (const sd of seeds) { const r = newRun(sd); expect(finalOf(r.seed)).toBe(finalOf(sd)); r.loop = 2; r.stage = 3; expect(finalOf(r.seed)).toBe(finalOf(sd)); }
  });
  it("una pista distinta por jefe y escenario, sin nombrar al jefe; no hay en la votación ni en el FINAL ACT", () => {
    const all = new Set<string>();
    for (const sd of [seeds.find((x) => finalOf(x) === "aspiradora")!, seeds.find((x) => finalOf(x) === "cortacercos")!]) {
      for (let st = 0; st < ENC.stages; st++) {
        const r = newRun(sd); r.stage = st; const h = hint(r)!;
        expect(h).toBeTruthy(); expect(line("hint", r)).toBe(h); expect(h).not.toMatch(/ASPIRADORA|CORTACERCOS|CORTADORA|PERRO|FELIPE/i);
        all.add(h);
      }
      const r = newRun(sd); r.phase = "vote"; expect(hint(r)).toBeNull(); r.phase = "final"; expect(hint(r)).toBeNull();
    }
    expect(all.size).toBe(2 * ENC.stages);
  });
  it("arena del FINAL ACT: anillo de cráteres lejos del centro, focos, estable por semilla y distinta entre semillas", () => {
    const a = arenaPlan(newRun(11)), b = arenaPlan(newRun(11)), c = arenaPlan(newRun(12));
    expect(a).toEqual(b); expect(a).not.toEqual(c);
    expect(a.craters.length).toBe(ARENA.craters); expect(a.spots.length).toBe(ARENA.spots);
    for (const k of a.craters) { expect(k.d).toBe(ARENA.ringD); expect(k.d - k.r).toBeGreaterThan(14); }
    for (const s of a.spots) expect(s.d).toBeGreaterThan(ARENA.ringD + ARENA.craterR * 1.15);
  });
  it("reporte: cuenta pactos, rutas, escenarios y revela el jefe", () => {
    const r = newRun(9); toDecision(r);
    expect(pick(r, 1)).toBe("pact_offer"); expect(pick(r, 0)).toBe("pact_yes"); expect(r.phase).toBe("route");
    expect(pick(r, 1)).toBe("advance");
    expect(r.taken.length).toBe(1); expect(r.went.length).toBe(1); expect(cleared(r)).toBe(1);
    const rows = Object.fromEntries(report(r, { chests: 2, cause: "Daño de hormiga" }));
    expect(rows["Vueltas"]).toBe("1"); expect(rows["Escenarios superados"]).toBe("1"); expect(rows["Cofres abiertos"]).toBe("2");
    expect(rows["Pactos tomados"]).toBe(PACTS.find((p) => p.id === r.taken[0])!.name); expect(rows["Rutas elegidas"]).toBe(VARIANTS[r.went[0]].name);
    expect(rows["Jefe secreto"]).toMatch(/ASPIRADORA|CORTACERCOS/); expect(rows["Causa de fin"]).toBe("Daño de hormiga");
    expect(Object.fromEntries(report(newRun(9), { chests: 0, cause: "x" }))["Pactos tomados"]).toBe("Ninguno");
  });
  it("tornillos: lo ganado con un efecto se liquida con ese efecto aunque después cambie", () => {
    let extra = 0, last = 0;
    const settle = (gross: number, k: number) => { extra += scrapExtra(gross, last, k); last = gross; };
    settle(100, 1.5); // escenario 1 con +50%
    settle(160, 1);   // escenario 2 sin pacto
    expect(extra + scrapExtra(200, last, 1)).toBe(50); // muere con el efecto neutro: los 50 siguen
    expect(scrapExtra(200, 0, 1)).toBe(0); // el cobro viejo (efecto vigente al morir) los perdía
    expect(extra + scrapExtra(200, last, 0.7)).toBeCloseTo(50 - 12); // un costo vigente solo pega en su tramo
  });
});
