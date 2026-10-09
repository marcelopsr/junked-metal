// Lógica de partida sin motor: azar con semilla (rng.ts) y perfil de cada partida (run.ts). Misma semilla = misma partida.
import { describe, expect, it } from "vitest";
import { rng, seedRng } from "../src/rng";
import { CLIMATES, FINALS, makeProfile, nightfall, previewProfile } from "../src/run";

const profile = (seed: number) => { seedRng(seed); return makeProfile(seed); };

describe("rng", () => {
  it("la misma semilla da la misma secuencia y está en [0,1)", () => {
    seedRng(7); const a = Array.from({ length: 50 }, rng);
    seedRng(7); const b = Array.from({ length: 50 }, rng);
    expect(a).toEqual(b);
    expect(a.every((x) => x >= 0 && x < 1)).toBe(true);
    seedRng(8); expect(rng()).not.toBe(a[0]);
  });
});

describe("makeProfile", () => {
  it("es determinista por semilla", () => {
    for (const s of [1, 2, 3, 99, 123456]) expect(profile(s)).toEqual(profile(s));
  });
  it("previewProfile coincide con makeProfile sin avanzar el rng global", () => {
    seedRng(42);
    const expectedNext = rng();
    seedRng(42);
    for (const s of [1, 3, 20261009]) expect(previewProfile(s)).toEqual(profile(s));
    seedRng(42);
    previewProfile(20261009);
    expect(rng()).toBe(expectedNext);
  });
  it("siempre trae clima, jefe final y minijefes válidos", () => {
    for (let s = 1; s <= 200; s++) {
      const p = profile(s);
      expect(CLIMATES.some((c) => c.id === p.climate.id)).toBe(true);
      expect(FINALS).toContain(p.final);
      expect(p.minis.length).toBeGreaterThan(0);
      expect(p.swarmEvery).toBeGreaterThan(0); expect(p.chestEvery).toBeGreaterThan(0);
      expect(p.elites.every(([t]) => t > 0)).toBe(true);
    }
  });
  it("las semillas distintas varían el resultado (no es constante)", () => {
    expect(new Set(Array.from({ length: 40 }, (_, i) => profile(i + 1).final + profile(i + 1).climate.id)).size).toBeGreaterThan(3);
  });
});

describe("nightfall", () => {
  it("sube de 0 a 1 de forma suave y monótona", () => {
    expect(nightfall(0)).toBe(0); expect(nightfall(1)).toBe(1);
    let prev = -1; for (let p = 0; p <= 1.0001; p += 0.05) { const v = nightfall(p); expect(v).toBeGreaterThanOrEqual(prev); prev = v; }
  });
});
