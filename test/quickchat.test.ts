import { describe, it, expect } from "vitest";
import { vetQuick } from "../src/quickchat";
describe("vetQuick", () => {
  it("valida índice y limita a 1 cada 2 s por jugador", () => {
    const l = new Map<string, number>();
    expect(vetQuick({ t: "q", i: 6 }, "a", l, 0)).toBeNull();
    expect(vetQuick({ t: "q", i: "x" }, "a", l, 0)).toBeNull();
    expect(vetQuick({ t: "q", i: 2, who: "falso" }, "a", l, 1000)).toEqual({ t: "q", i: 2, who: "a" });
    expect(vetQuick({ t: "q", i: 2 }, "a", l, 2500)).toBeNull();
    expect(vetQuick({ t: "q", i: 2 }, "b", l, 2500)).not.toBeNull();
    expect(vetQuick({ t: "q", i: 0 }, "a", l, 3100)).not.toBeNull();
  });
});
