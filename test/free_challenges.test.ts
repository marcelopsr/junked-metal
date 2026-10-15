// Paseo libre: desafíos (inicio, meta, récord, tiempo límite). Lógica pura con recorridos sintéticos.
import { describe, expect, it } from "vitest";
import { chStep, chTruco, DESAFIOS, fmtMarca, fmtMs, mejora, newBest, newCh } from "../src/free_challenges";

const [OBS, SKATE] = [DESAFIOS[0], DESAFIOS[1]];
describe("desafios", () => {
  it("contrarreloj: inicia en el arco, mide hasta la meta y guarda el récord solo si mejora", () => {
    const s = newCh(), b = newBest();
    expect(chStep(s, 0.1, 0, 0, b)).toBeNull();
    expect(chStep(s, 0.1, OBS.ax, OBS.az, b)?.kind).toBe("inicio");
    for (let i = 0; i < 119; i++) chStep(s, 0.5, 190, -180, b); // 59,5 s en ruta
    const e = chStep(s, 0.5, OBS.bx!, OBS.bz!, b)!;
    expect(e.kind).toBe("fin"); expect(e.ms).toBe(60000); expect(e.record).toBe(true); expect(b.obs).toBe(60000);
    chStep(s, 0.1, 0, 0, b); chStep(s, 0.1, OBS.ax, OBS.az, b); // segunda vuelta, más lenta
    for (let i = 0; i < 199; i++) chStep(s, 0.5, 190, -180, b);
    expect(chStep(s, 0.5, OBS.bx!, OBS.bz!, b)!.record).toBe(false); expect(b.obs).toBe(60000);
  });
  it("sin salir del arco no se reinicia solo; al salir y volver sí", () => {
    const s = newCh(), b = newBest();
    chStep(s, 0.1, OBS.ax, OBS.az, b); expect(chStep(s, 0.1, OBS.ax, OBS.az, b)).toBeNull();
    chStep(s, 0.1, 0, 0, b); expect(chStep(s, 0.1, OBS.ax, OBS.az, b)?.kind).toBe("inicio");
  });
  it("trucos: suma solo con el desafío activo y cierra a los 60 s", () => {
    const s = newCh(), b = newBest();
    chTruco(s, 500); expect(s.pts).toBe(0);
    chStep(s, 0.1, SKATE.ax, SKATE.az, b); chTruco(s, 300); chTruco(s, 200);
    let e = null;
    for (let t = 0; t < 61 && !e; t++) e = chStep(s, 1, -150, 150, b);
    expect(e).toMatchObject({ kind: "fin", pts: 500, record: true }); expect(b.skate).toBe(500);
  });
  it("pasar directo de un arco a otro cambia de desafío", () => {
    const s = newCh(), b = newBest();
    chStep(s, 0.1, OBS.ax, OBS.az, b); expect(chStep(s, 0.1, SKATE.ax, SKATE.az, b)?.d.id).toBe("skate");
  });
  it("tiempo agotado = fallo sin récord; formatos", () => {
    const s = newCh(), b = newBest();
    chStep(s, 0.1, OBS.ax, OBS.az, b);
    let e = null;
    for (let t = 0; t < 301 && !e; t++) e = chStep(s, 1, 190, -180, b);
    expect(e?.kind).toBe("fallo"); expect(b.obs).toBe(0);
    expect(fmtMs(65300)).toBe("1:05,3"); expect(fmtMarca(SKATE, 0)).toBe("SIN MARCA"); expect(fmtMarca(SKATE, 420)).toBe("420 PTS");
    expect(mejora(OBS, 0, 5)).toBe(true); expect(mejora(OBS, 5, 0)).toBe(false);
  });
});
