import { describe, expect, it } from "vitest";
import { ask, newRun, pactFx, pick, VARIANTS, endAch, tipOnce, TIPS, until, toDecision } from "./_fixtures";

describe("avisos de la primera partida", () => {
  it("cada aviso sale una sola vez", () => {
    const e = { tips: [] as string[] };
    expect(tipOnce(e, "pact")).toBe(TIPS.pact);
    expect(tipOnce(e, "pact")).toBeNull();
    expect(e.tips).toEqual(["pact"]);
  });
});

describe("H17 quedarse tentador y H13 mini", () => {
  it("cada quedarse suma +10 % de tornillos acumulable y el texto lo dice", () => {
    const r = newRun(5); toDecision(r);
    expect(ask(r)!.opts[0]).toMatch(/COFRE EXTRA.*10%/);
    expect(pactFx(r).scrap).toBe(1);
    pick(r, 0); expect(r.stayN).toBe(1); expect(pactFx(r).scrap).toBeCloseTo(1.1);
    expect(pick(r, 0)).toBeNull(); expect(r.stayN).toBe(1); // en la estadía no se vuelve a contar
    until(r); pick(r, 0); expect(r.stayN).toBe(2); expect(pactFx(r).scrap).toBeCloseTo(1.2);
    r.phase = "stage"; r.stage = 1; // el bono sobrevive al cambio de escenario
    expect(pactFx(r).scrap).toBeCloseTo(1.2);
  });
  it("ENSAYO DE MEDIANOCHE: recompensa 1.2 y minijefe proyector", () => {
    const v = VARIANTS.find((x) => x.name === "ENSAYO DE MEDIANOCHE")!;
    expect(v.reward).toEqual({ xp: 1.2, scrap: 1.2 }); expect(v.mini).toBe("proyector");
  });
});

describe("logros de ENCORE (endAch)", () => {
  it("fin de expedición", () => {
    const r = newRun(1), med = VARIANTS.findIndex((v) => v.name === "ENSAYO DE MEDIANOCHE");
    expect(endAch(r, false, [])).toEqual([]);
    expect(endAch(r, true, [])).toEqual(["encore_final"]);
    r.pacts = [{ id: "bis", left: 1 }, { id: "bis", left: 1 }, { id: "bis", left: 1 }]; r.went = [med]; r.found = ["eco"];
    expect(endAch(r, true, [])).toEqual(["encore_final", "encore_pactos", "encore_eco", "encore_medianoche"]);
    expect(endAch(r, false, ["aplausos", "audiencia", "bambalinas"])).toEqual(["encore_secretos"]); // eco sale de la run, el resto del perfil
  });
});
