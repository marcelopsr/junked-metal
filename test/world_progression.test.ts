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

  it("el salto proactivo otorga el Alijo Dimensional y el salto de emergencia no", async () => {
    const { initWorldProgression, startWorldProgression, executeWorldJump } = await import("../src/world_progression");
    const rewardMock = vi.fn();
    const bannerMock = vi.fn();
    initWorldProgression({
      scene: {} as any,
      getCar: () => null,
      getEnemies: () => [],
      setEnemies: vi.fn(),
      getWeapons: () => [],
      getProfile: () => ({ climate: {} } as any),
      applyClimate: vi.fn(),
      zoneClimate: () => undefined,
      setZone: vi.fn(),
      isSimulating: () => true,
      isErun: () => false,
      isLibre: () => false,
      isLab: () => false,
      camReset: vi.fn(),
      clearSpits: vi.fn(),
      clearGems: vi.fn(),
      clearPickups: vi.fn(),
      playWarpSfx: vi.fn(),
      banner: bannerMock,
      glitchHit: vi.fn(),
      rewardProactiveJump: rewardMock,
    });

    startWorldProgression(10, "patio", "perro");
    executeWorldJump(1, true);
    expect(rewardMock).toHaveBeenCalledTimes(1);

    executeWorldJump(2, false);
    expect(rewardMock).toHaveBeenCalledTimes(1);
    expect(bannerMock).toHaveBeenCalledWith(expect.stringContaining("COLAPSO"), expect.any(Number), expect.any(Object));
  });

  it("activa la acústica lunar moonAmbience(true) al entrar a la Luna y la apaga al salir", async () => {
    const { initWorldProgression, startWorldProgression, executeWorldJump, clearWorldProgression } = await import("../src/world_progression");
    const moonAmbienceMock = vi.fn();
    initWorldProgression({
      scene: {} as any,
      getCar: () => null,
      getEnemies: () => [],
      setEnemies: vi.fn(),
      getWeapons: () => [],
      getProfile: () => ({ climate: {} } as any),
      applyClimate: vi.fn(),
      zoneClimate: () => undefined,
      setZone: vi.fn(),
      isSimulating: () => true,
      isErun: () => false,
      isLibre: () => false,
      isLab: () => false,
      camReset: vi.fn(),
      clearSpits: vi.fn(),
      clearGems: vi.fn(),
      clearPickups: vi.fn(),
      playWarpSfx: vi.fn(),
      banner: vi.fn(),
      glitchHit: vi.fn(),
      moonAmbience: moonAmbienceMock,
    });

    startWorldProgression(10, "patio", "perro");
    // Etapa 2 es la Luna
    executeWorldJump(2, true);
    expect(moonAmbienceMock).toHaveBeenCalledWith(true);

    // Salto a Etapa 3 (fuera de la Luna)
    executeWorldJump(3, true);
    expect(moonAmbienceMock).toHaveBeenCalledWith(false);

    // Volver a entrar a la luna y resetear progresión
    executeWorldJump(2, true);
    expect(moonAmbienceMock).toHaveBeenCalledWith(true);
    clearWorldProgression();
    expect(moonAmbienceMock).toHaveBeenCalledWith(false);
  });

  it("la succión gravitatoria atrae al auto y pulveriza a enemigos comunes cercanos durante los últimos 10s", async () => {
    const { initWorldProgression, startWorldProgression, tickWorldProgression, getVortexPosition } = await import("../src/world_progression");
    const { run } = await import("../src/run_state");
    const B = await import("@babylonjs/core");

    const pulverizeMock = vi.fn();
    const enemyDispose = vi.fn();
    let enemyList: any[] = [
      {
        pos: new B.Vector3(20, 0, 20), // Lejos: d ~ 28.2 (fuera de los 14m)
        def: { boss: false, xp: 3 },
        body: { getLinearVelocity: () => new B.Vector3(0, 0, 0), setLinearVelocity: vi.fn() },
        dispose: vi.fn(),
      },
      {
        pos: new B.Vector3(1, 0, 1), // Dentro del ojo del vórtice (d < 2.5)
        def: { boss: false, xp: 10 },
        body: { getLinearVelocity: () => new B.Vector3(0, 0, 0), setLinearVelocity: vi.fn() },
        dispose: enemyDispose,
      },
      {
        pos: new B.Vector3(1.2, 0, 1.2), // Jefe dentro del radio: debe ser inmune
        def: { boss: true, xp: 100 },
        body: { getLinearVelocity: () => new B.Vector3(0, 0, 0), setLinearVelocity: vi.fn() },
        dispose: vi.fn(),
      },
    ];

    const carSetVel = vi.fn();
    const mockCar = {
      pos: new B.Vector3(6, 0, 6), // Dentro de los 14m de succión
      body: { getLinearVelocity: () => new B.Vector3(0, 0, 0), setLinearVelocity: carSetVel },
    };

    initWorldProgression({
      scene: { isDisposed: false } as any,
      getCar: () => mockCar as any,
      getEnemies: () => enemyList,
      setEnemies: (e) => { enemyList = e; },
      getWeapons: () => [],
      getProfile: () => ({ climate: {} } as any),
      applyClimate: vi.fn(),
      zoneClimate: () => undefined,
      setZone: vi.fn(),
      isSimulating: () => true,
      isErun: () => false,
      isLibre: () => false,
      isLab: () => false,
      camReset: vi.fn(),
      clearSpits: vi.fn(),
      clearGems: vi.fn(),
      clearPickups: vi.fn(),
      playWarpSfx: vi.fn(),
      banner: vi.fn(),
      glitchHit: vi.fn(),
      onEnemyPulverized: pulverizeMock,
    });

    startWorldProgression(1, "patio", "perro");

    // Abrir vórtice en el segundo 95 (vortexTime es 90, endTime es 110)
    run.time = 95;
    tickWorldProgression(0.1);
    const vPos = getVortexPosition();
    expect(vPos).not.toBeNull();

    // Colocar el vórtice en (0, 0, 0) para evaluar distancias exactas
    vPos!.set(0, 0, 0);

    // Al segundo 105 (restan 5s <= 10s: succión y pulverización activas)
    run.time = 105;
    tickWorldProgression(0.1);

    // 1. El auto debe haber recibido aceleración de succión
    expect(carSetVel).toHaveBeenCalled();

    // 2. El enemigo común dentro del ojo (1, 0, 1) debe haber sido pulverizado
    expect(enemyDispose).toHaveBeenCalledTimes(1);
    expect(pulverizeMock).toHaveBeenCalledWith(expect.any(Object), 10);

    // 3. El jefe debe seguir vivo en la lista
    expect(enemyList.some((e) => e.def.boss)).toBe(true);
  });
});
