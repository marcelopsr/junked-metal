import { describe, expect, it } from "vitest";
import { ARENA, arenaPlan, cleared, FINAL_POOL, finalOf, hint, report, scrapExtra, ENC, line, newRun, PACTS, pick, VARIANTS, toDecision } from "./_fixtures";

describe("R5: jefe secreto, pistas, arena, reporte y tornillos", () => {
  const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 3);
  it("el jefe sale de la semilla: fijo, dentro del pozo, sin perro, y ambos aparecen", () => {
    const seen = new Set(seeds.map(finalOf));
    expect([...seen].sort()).toEqual(["aspiradora", "caja", "cortacercos"]);
    expect(FINAL_POOL as readonly string[]).not.toContain("perro");
    for (const sd of seeds) { const r = newRun(sd); expect(finalOf(r.seed)).toBe(finalOf(sd)); r.loop = 2; r.stage = 3; expect(finalOf(r.seed)).toBe(finalOf(sd)); }
  });
  it("una pista distinta por jefe y escenario, sin nombrar al jefe; no hay en la votación ni en el FINAL ACT", () => {
    const all = new Set<string>();
    for (const sd of (["aspiradora", "cortacercos", "caja"] as const).map((k) => seeds.find((x) => finalOf(x) === k)!)) {
      for (let st = 0; st < ENC.stages; st++) {
        const r = newRun(sd); r.stage = st; const h = hint(r)!;
        expect(h).toBeTruthy(); expect(line("hint", r)).toBe(h); expect(h).not.toMatch(/ASPIRADORA|CORTACERCOS|CORTADORA|PERRO|FELIPE|CAJA/i);
        all.add(h);
      }
      const r = newRun(sd); r.phase = "vote"; expect(hint(r)).toBeNull(); r.phase = "final"; expect(hint(r)).toBeNull();
    }
    expect(all.size).toBe(3 * ENC.stages);
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
    expect(rows["Jefe secreto"]).toMatch(/ASPIRADORA|CORTACERCOS|CAJA/); expect(rows["Causa de fin"]).toBe("Daño de hormiga");
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
