import { describe, expect, it } from "vitest";
import { boarded, dirPri, dirPush, dirTick, ENC, GUESTS, guestDown, line, newDirQ, openingLine, teleEvent, newRun, pick, tick } from "./_fixtures";

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
