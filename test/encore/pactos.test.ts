import { describe, expect, it } from "vitest";
import { BAL } from "../../src/balance";
import { activePacts, ask, ENC, fxText, NO_FX, newRun, pactFx, pactOffer, pactOf, PACTS, pick, tag, Run, SECRETS, until, adv, toDecision } from "./_fixtures";

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
    const s = newRun(5); s.pacts = PACTS.filter((p) => !p.secret).slice(0, -1).map((p) => ({ id: p.id, left: Infinity }));
    expect(pactOffer(s)).toBeNull();
    toDecision(s);
    expect(pick(s, 1)).toBe("route_offer");
  });

  it("pactos del Director: solo con su secreto, uno por oferta como máximo", () => {
    const sp = PACTS.filter((p) => p.secret);
    expect(sp.map((p) => p.secret)).toEqual(SECRETS.map((x) => x.id));
    const all = (known: string[]) => { const o: string[][] = []; for (let seed = 1; seed <= 60; seed++) for (let st = 0; st < ENC.stages - 1; st++) o.push(pactOffer({ ...newRun(seed, known), stage: st })!); return o; };
    expect(all([]).flat().filter((id) => pactOf(id).secret)).toEqual([]); // sin secretos no hay especiales
    expect(all(["eco"]).flat().filter((id) => pactOf(id).secret)).not.toEqual([]);
    expect(all(["eco"]).flat().every((id) => !pactOf(id).secret || id === "eco")).toBe(true); // solo el de su secreto
    for (const o of all(SECRETS.map((x) => x.id))) expect(o.filter((id) => pactOf(id).secret).length).toBeLessThanOrEqual(1);
    const r = { ...newRun(1, ["aplausos"]), stage: 0 }; r.phase = "pact"; r.offer = ["aplausos", "garantia"];
    expect(ask(r)!.pacts![0].name).toContain("PACTO DEL DIRECTOR");
    const f = { ...newRun(1), found: ["audiencia" as const] }; expect(all([]).length).toBeGreaterThan(0);
    expect(Array.from({ length: 60 }, (_, i) => pactOffer({ ...f, seed: i + 1 })).flat().includes("audiencia")).toBe(true); // lo hallado en la run también cuenta
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
    const g = (ids: string[], k: string) => ids.reduce((m, id) => m * (BAL.pactos as any)[id][`g_${k}`] * (BAL.pactos as any)[id][`c_${k}`], 1);
    const ids = ["garantia", "nocturno", "sorpresa", "chatarra"];
    for (const k of ["dmg", "maxHp", "xp", "scrap", "spawn"] as const) expect(f[k]).toBeCloseTo(g(ids, k));
    expect(f.regen).toBe(ids.reduce((s, id) => s + (BAL.pactos as any)[id].g_regen + (BAL.pactos as any)[id].c_regen, 0));
  });

  it("pactos nuevos: COBRO, BIS y PERMANENCIA combinan sus efectos", () => {
    const ids = ["cobro", "bis", "permanencia"];
    const r = newRun(1); r.pacts = ids.map((id) => ({ id, left: 2 }));
    const f = pactFx(r), P = BAL.pactos as any;
    for (const k of ["dmg", "maxHp", "xp", "scrap", "spawn", "taken"] as const) expect(f[k]).toBeCloseTo(ids.reduce((m, id) => m * P[id][`g_${k}`] * P[id][`c_${k}`], 1));
    expect(f.regen).toBe(ids.reduce((s, id) => s + P[id].g_regen + P[id].c_regen, 0));
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
