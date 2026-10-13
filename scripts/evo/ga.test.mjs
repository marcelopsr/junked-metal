import { describe, it, expect } from "vitest";
import { rng, initPop, deChild, dominates, sortFronts, select, knee, diff } from "./ga.mjs";

const spec = [
  { id: "a", min: 0, max: 10, def: 5 },
  { id: "b", min: 1, max: 4, def: 2, int: true, comp: "rueda" },
];
const inRange = (g) => spec.every((s) => g[s.id] >= s.min && g[s.id] <= s.max && (!s.int || Number.isInteger(g[s.id])));

describe("ga", () => {
  it("misma semilla = mismo resultado", () => {
    expect(initPop(spec, 5, rng(7))).toEqual(initPop(spec, 5, rng(7)));
  });
  it("initPop[0] es el original y todo en rango", () => {
    const p = initPop(spec, 20, rng(1), 0.5);
    expect(p[0].g).toEqual({ a: 5, b: 2 });
    expect(p.every((x) => inRange(x.g))).toBe(true);
  });
  it("deChild en rango y ints enteros", () => {
    const r = rng(3), p = initPop(spec, 8, r, 1);
    for (let k = 0; k < 300; k++) expect(inRange(deChild(p, k % 8, spec, r, { F: 1.5 }))).toBe(true);
  });
  it("dominates con restricciones", () => {
    const f = { obj: [1, 1], viol: 0 }, g = { obj: [2, 2], viol: 0 };
    expect(dominates(f, g)).toBe(true);
    expect(dominates(g, f)).toBe(false);
    expect(dominates(g, { obj: [0, 0], viol: 1 })).toBe(true);
    expect(dominates({ obj: [0, 0], viol: 1 }, g)).toBe(false);
    expect(dominates({ obj: [9, 9], viol: 1 }, { obj: [0, 0], viol: 2 })).toBe(true);
  });
  const mk = (...o) => o.map((obj, i) => ({ id: "p" + i, g: {}, obj }));
  it("sortFronts: rangos y extremos", () => {
    const pop = mk([1, 4], [2, 2], [4, 1], [3, 3], [5, 5]);
    const fr = sortFronts(pop);
    expect(fr.map((f) => f.length)).toEqual([3, 1, 1]);
    expect(pop[3].rank).toBe(1);
    expect(pop[4].rank).toBe(2);
    expect(pop[0].crowd).toBe(Infinity);
    expect(pop[2].crowd).toBe(Infinity);
    expect(Number.isFinite(pop[1].crowd)).toBe(true);
  });
  it("select conserva al mejor y knee elige el equilibrado", () => {
    const pop = mk([1, 4], [2, 2], [4, 1], [3, 3], [5, 5], [0.5, 9]);
    const s = select(pop, 3);
    expect(s).toHaveLength(3);
    expect(s).toContain(pop[0]);
    expect(knee(sortFronts(pop)[0])).toBe(pop[0]);
  });
  it("diff ordena por |pct| y omite lo igual", () => {
    expect(diff(spec, { a: 5.05, b: 2 })).toEqual([]);
    const d = diff(spec, { a: 8, b: 3 });
    expect(d.map((x) => x.id)).toEqual(["b", "a"]);
    expect(d[1].pct).toBe(30);
  });
  it("mini-optimización converge al frente [-0.3,0.3]", () => {
    const sp = ["x", "y", "z"].map((id) => ({ id, min: -1, max: 1, def: 0 }));
    const ev = (g) => {
      const v = sp.map((s) => g[s.id]);
      return [v.reduce((t, x) => t + (x - 0.3) ** 2, 0), v.reduce((t, x) => t + (x + 0.3) ** 2, 0)];
    };
    const r = rng(11);
    let pop = initPop(sp, 12, r, 0.5);
    pop.forEach((p) => { p.obj = ev(p.g); });
    for (let gen = 0; gen < 15; gen++) {
      const kids = pop.map((_, i) => { const g = deChild(pop, i, sp, r); return { id: "k", g, obj: ev(g) }; });
      pop = select([...pop, ...kids], 12);
    }
    const front = sortFronts(pop)[0];
    for (const p of front) for (const s of sp) expect(Math.abs(p.g[s.id])).toBeLessThanOrEqual(0.35);
  });
});
