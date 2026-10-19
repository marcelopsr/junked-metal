import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("location", { search: "?mute" });
vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
vi.stubGlobal("addEventListener", vi.fn());
vi.stubGlobal("document", {
  getElementById: vi.fn(() => ({
    classList: { toggle: vi.fn(), add: vi.fn(), remove: vi.fn(), contains: vi.fn() },
    style: { setProperty: vi.fn() },
  })),
  createElement: vi.fn(() => ({
    getContext: vi.fn(() => ({
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      clip: vi.fn(),
    })),
    classList: { toggle: vi.fn(), add: vi.fn(), remove: vi.fn(), contains: vi.fn() },
    style: { setProperty: vi.fn() },
  })),
  body: { appendChild: vi.fn() },
});
vi.stubGlobal("navigator", { maxTouchPoints: 0, userAgent: "" });

const { buildProgressionStages } = await import("../src/world_progression");

describe("Progresión de Saltos de Mundo (Supervivencia)", () => {
  it("genera exactamente 6 etapas (4 saltos de mundo intermedios + arena del jefe final)", () => {
    const stages = buildProgressionStages(42, "patio", "perro");
    expect(stages).toHaveLength(6);
    expect(stages.map((s) => s.stage)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(stages.map((s) => s.jumpNum)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(stages[5].isBossArena).toBe(true);
  });

  it("la etapa 2 (Mundo 3) es SIEMPRE la Luna sin importar la semilla", () => {
    for (const seed of [1, 7, 42, 100, 2026, 999999]) {
      const stages = buildProgressionStages(seed, "patio", "perro");
      expect(stages[2].zoneId).toBe("luna");
      expect(stages[2].jumpNum).toBe(2);
      expect(stages[2].zoneName).toContain("Luna");
    }
  });

  it("los tiempos de salto y duración están estrictamente ordenados y sincronizados", () => {
    const stages = buildProgressionStages(12345, "patio", "aspiradora");
    // Salto 1/4 al segundo 110
    expect(stages[0].endTime).toBe(110);
    expect(stages[0].vortexTime).toBe(90);
    // Salto 2/4 al segundo 230
    expect(stages[1].startTime).toBe(110);
    expect(stages[1].endTime).toBe(230);
    expect(stages[1].vortexTime).toBe(210);
    // Salto 3/4 al segundo 350 (tras la Luna)
    expect(stages[2].startTime).toBe(230);
    expect(stages[2].endTime).toBe(350);
    expect(stages[2].vortexTime).toBe(330);
    // Salto 4/4 al segundo 470
    expect(stages[3].startTime).toBe(350);
    expect(stages[3].endTime).toBe(470);
    expect(stages[3].vortexTime).toBe(450);
    // Salto al Jefe del Mundo al segundo 560
    expect(stages[4].startTime).toBe(470);
    expect(stages[4].endTime).toBe(560);
    expect(stages[4].vortexTime).toBe(540);
    // Arena del Jefe del Mundo desde segundo 560
    expect(stages[5].startTime).toBe(560);
    expect(stages[5].isBossArena).toBe(true);
  });

  it("la arena del jefe final corresponde temáticamente al tipo de jefe", () => {
    expect(buildProgressionStages(1, "patio", "perro")[5].zoneId).toBe("patio");
    expect(buildProgressionStages(1, "patio", "aspiradora")[5].zoneId).toBe("cocina");
    expect(buildProgressionStages(1, "patio", "cortacercos")[5].zoneId).toBe("bosque");
    expect(buildProgressionStages(1, "patio", "caja")[5].zoneId).toBe("desvan");
  });

  it("la misma semilla produce deterministamente la misma ruta de biomas", () => {
    const routeA = buildProgressionStages(98765, "patio", "cortacercos");
    const routeB = buildProgressionStages(98765, "patio", "cortacercos");
    expect(routeA).toEqual(routeB);
  });

  it("la microgravedad lunar reduce la gravedad a 17.5 m/s² y se restablece a 25 al salir", async () => {
    const { MOON, setMoon } = await import("../src/moon");
    setMoon(true, true);
    expect(MOON.g).toBe(17.5);
    setMoon(false);
    expect(MOON.g).toBe(25);
  });
});
