import { describe, expect, it } from "vitest";
import { BAL } from "../src/balance";
import { INT_IDS, INT_TXT, newSt, planOf, step, type Io } from "../src/encore_events";

describe("interrupción del Director", () => {
  it("el sorteo es determinista, cae en la ventana y respeta la calma de la primera vez", () => {
    for (let s = 1; s < 40; s++) {
      const p = planOf(s, s % 3, s % 4, s % 2 === 0, false)!;
      expect(p).toEqual(planOf(s, s % 3, s % 4, s % 2 === 0, false));
      expect(p.at).toBeGreaterThanOrEqual(BAL.ritmo.interrupcion_desde_s + BAL.interrupciones[p.id].aviso_s);
      expect(p.at).toBeLessThanOrEqual(BAL.ritmo.interrupcion_hasta_s);
    }
    expect(planOf(1, 0, 0, true, true)).toBeNull();
    expect(new Set(Array.from({ length: 60 }, (_, s) => planOf(s, 0, 1, false, false)!.id)).size).toBe(INT_IDS.length);
  });
  it("avisa, empieza, repite y termina una sola vez; abort cierra lo en curso", () => {
    const log: string[] = [];
    const io: Io = { warn: () => log.push("w"), start: () => log.push("s"), frame: () => {}, pulse: () => log.push("p"), end: () => log.push("e") };
    const p = { id: "utileria" as const, at: 100 }, st = newSt();
    for (let t = 90; t < 130; t += 0.1) step(p, st, t, 0.1, io);
    expect(log.filter((x) => x === "w" || x === "s" || x === "e")).toEqual(["w", "s", "e"]);
    expect(log.filter((x) => x === "p").length).toBeGreaterThan(8);
    const l2: string[] = [], s2 = newSt(), io2 = { ...io, end: () => l2.push("e") };
    step(p, s2, 101, 0.1, io2); step(p, s2, 102, 0.1, io2, true); step(p, s2, 103, 0.1, io2, true);
    expect(l2).toEqual(["e"]);
  });
  it("las frases no usan voseo", () => { for (const t of Object.values(INT_TXT)) expect(t.line + t.name).not.toMatch(/\b(vos|tenés|elegí)\b/i); });
});
