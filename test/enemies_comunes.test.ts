// Lógica pura de los comunes de ritmo medio (src/enemies/logic.ts) y sus números en balance.json.
import { describe, expect, it } from "vitest";
import { inFront, nearestIdx, splitSpots } from "../src/enemies/logic";
import { BAL } from "../src/balance";

describe("escudo frontal", () => {
  const fwd = { x: 0, z: 1 }, pos = { x: 0, z: 0 }, cos = Math.cos((70 * Math.PI) / 180);
  it("de frente y de costado cercano bloquea; de flanco y de espalda no", () => {
    expect(inFront(fwd, pos, { x: 0, z: 10 }, cos)).toBe(true);
    expect(inFront(fwd, pos, { x: 3, z: 10 }, cos)).toBe(true);
    expect(inFront(fwd, pos, { x: 10, z: 1 }, cos)).toBe(false);
    expect(inFront(fwd, pos, { x: 0, z: -10 }, cos)).toBe(false);
    expect(inFront(fwd, pos, pos, cos)).toBe(false);
  });
});

describe("ladrón y divisor", () => {
  it("nearestIdx elige la gema más cercana dentro del alcance", () => {
    const g = [{ p: { x: 9, z: 0 } }, { p: { x: 2, z: 1 } }, { p: { x: -1, z: 30 } }];
    expect(nearestIdx({ x: 0, z: 0 }, g, (t) => t.p, 12)).toBe(1);
    expect(nearestIdx({ x: 0, z: 0 }, g, (t) => t.p, 1)).toBe(-1);
    expect(nearestIdx({ x: 0, z: 0 }, [], (t: { p: { x: number; z: number } }) => t.p, 5)).toBe(-1);
  });
  it("splitSpots reparte n crías a radio r, distintas entre sí", () => {
    const s = splitSpots(2, 1.2);
    expect(s).toHaveLength(2);
    s.forEach((p) => expect(Math.hypot(p.x, p.z)).toBeCloseTo(1.2));
    expect(s[0]).not.toEqual(s[1]);
  });
});

describe("balance de los comunes nuevos", () => {
  it("existen en enemigos con vida y velocidad > 0 y aparecen en ritmo medio (<= minuto 6)", () => {
    for (const k of ["kamikaze", "escudo", "brincador", "francotirador", "divisor", "ladron", "cria"]) {
      const e = BAL.enemigos[k];
      expect(e.vida).toBeGreaterThan(0); expect(e.velocidad).toBeGreaterThan(0);
      if (k !== "cria") expect(e.aparece_min).toBeLessThanOrEqual(6);
    }
  });
});

describe("blindaje frontal compartido", () => {
  it("escudero y cangrejo tienen placa; de frente entra ATK.escudo_blindaje y por la espalda daño completo", async () => {
    // combat.ts toca el DOM y no carga en Node: se comprueba el texto
    const { readFileSync } = await import("node:fs");
    const m = /FRONT_ARMOR[^=]*= new Set\(\[([^\]]*)\]\)/.exec(readFileSync("src/combat.ts", "utf8"));
    expect(m?.[1].match(/"(\w+)"/g)).toEqual(['"escudo"', '"cangrejo"']);
    expect(readFileSync("src/combat.ts", "utf8")).toContain("FRONT_ARMOR.has(e.kind)");
    const { ATK } = await import("../scripts/oleadas.mjs");
    const fwd = { x: 0, z: 1 }, pos = { x: 0, z: 0 }, cos = ATK.escudo_frente_cos;
    const hit = (from: { x: number; z: number }) => 100 * (inFront(fwd, pos, from, cos) ? ATK.escudo_blindaje : 1);
    expect(hit({ x: 0, z: 10 })).toBeCloseTo(100 * ATK.escudo_blindaje);
    expect(hit({ x: 0, z: -10 })).toBe(100);
  });
});
