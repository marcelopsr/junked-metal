import { describe, expect, it } from "vitest";
import { ENC, newRun, routeOffer, pick, variantOf, VARIANTS, Run, zoneOf, earthStage, EARTH, SECRETS, discover, secretLine, riskOf, until, toDecision } from "./_fixtures";

describe("Contenido 3: escenarios terrestres", () => {
  it("vuelta 0 toda en la luna; desde la vuelta 1, un escenario por vuelta en una zona plana, fijo por semilla", () => {
    for (const seed of [1, 7, 42, 999]) {
      const r = newRun(seed);
      for (let s = 0; s < ENC.stages; s++) { r.stage = s; expect(zoneOf(r)).toBe(s ? "luna" : "patio"); }
      for (let loop = 1; loop < 6; loop++) {
        r.loop = loop;
        const zs = Array.from({ length: ENC.stages }, (_, s) => { r.stage = s; return zoneOf(r); });
        expect(zs.filter((z) => z !== "luna")).toHaveLength(1);
        expect(Object.keys(EARTH)).toContain(zs[earthStage(r)]);
        r.stage = earthStage(r); expect(zoneOf(r)).toBe(zs[earthStage(r)]); // determinista
      }
      r.loop = 2; r.phase = "vote"; expect(zoneOf(r)).toBe("luna"); r.phase = "final"; expect(zoneOf(r)).toBe("luna");
    }
  });
});

describe("variante con zona: EL GALPÓN DE UTILERÍA", () => {
  const gi = VARIANTS.findIndex((v) => v.zone === "galpon");
  it("es terrestre, con LA GRÚA DE FERIA de minijefe y recompensa sin pasar a la de más riesgo lunar", () => {
    expect(gi).toBeGreaterThan(0);
    expect(VARIANTS[gi]).toMatchObject({ mini: "grua", zone: "galpon" });
    expect(Object.keys(EARTH)).toContain("galpon");
    expect(riskOf(gi)).toBeGreaterThan(1);
  });
  it("nunca sale en el sorteo, ni se ofrece en la vuelta 0; desde la 1 puede ofrecerse y entonces zoneOf devuelve su zona", () => {
    let offered = 0;
    for (let seed = 1; seed <= 80; seed++) for (let loop = 0; loop < 3; loop++) {
      const r = newRun(seed); r.loop = loop;
      for (let s = 0; s < ENC.stages; s++) { r.stage = s; expect(variantOf(r)!.zone).toBeUndefined(); }
      r.stage = 0; r.routes = null;
      const o = routeOffer(r);
      if (!loop) expect(o).not.toContain(gi);
      if (o.includes(gi)) { offered++; r.stage = 1; r.route = gi; expect(zoneOf(r)).toBe("galpon"); r.stage = 0; r.loop = 0; }
    }
    expect(offered).toBeGreaterThan(0);
  });
  it("el escenario terrestre sorteado nunca es el galpón", () => {
    for (let seed = 1; seed <= 80; seed++) { const r = newRun(seed); r.loop = 1; r.stage = earthStage(r); expect(zoneOf(r)).not.toBe("galpon"); }
  });
});

describe("Contenido 3: secretos del Director", () => {
  /** Juega una vuelta: pactos (aceptar o rechazar) y destino (el de más riesgo o el otro). */
  const loop = (r: Run, o: { pact: boolean; bold: boolean }) => {
    for (let k = 0; k < ENC.stages; k++) {
      toDecision(r);
      let e = pick(r, 1);
      if (e === "pact_offer") e = pick(r, o.pact ? 0 : 2);
      if (e === "route_offer" || e === "pact_no" || e === "pact_yes") { const [a, b] = r.routes!, hi = riskOf(a) >= riskOf(b) ? 0 : 1; pick(r, (o.bold ? hi : 1 - hi) as 0 | 1); }
    }
    expect(r.phase).toBe("vote");
  };
  it("rechazar todos los pactos de la vuelta revela CERO ESPECTADORES; aceptar uno no", () => {
    const a = newRun(5); loop(a, { pact: false, bold: false }); expect(a.found).toContain("audiencia");
    const b = newRun(5); loop(b, { pact: true, bold: false }); expect(b.found).not.toContain("audiencia");
  });
  it("elegir siempre el destino de más riesgo revela SEÑAL IMPOSIBLE", () => {
    const a = newRun(11); loop(a, { pact: true, bold: true }); expect(a.found).toEqual(["bambalinas"]);
    const b = newRun(11); loop(b, { pact: true, bold: false }); expect(b.found).not.toContain("bambalinas");
  });
  it("quedarse tres veces en un escenario revela TOMA REPETIDA; dos no", () => {
    const r = newRun(5); toDecision(r);
    for (let i = 0; i < 2; i++) { pick(r, 0); until(r); }
    expect(r.found).not.toContain("eco");
    pick(r, 0); until(r);
    expect(r.found).toEqual(["eco"]);
  });
  it("discover no repite; la frase del Director es fija por semilla y trae el fragmento sin nombrar a nadie", () => {
    const r = newRun(3); discover(r, "aplausos"); discover(r, "aplausos"); expect(r.found).toEqual(["aplausos"]);
    expect(secretLine(r, "aplausos")).toBe(secretLine(newRun(3), "aplausos"));
    for (const s of SECRETS) expect(secretLine(r, s.id)).toContain(s.lore);
  });
});
