// Paseo libre: trucos (aire, giros, vueltas, combo), tuercas y guardado. Lógica pura con secuencias sintéticas.
import { describe, expect, it } from "vitest";
import { BAL } from "../src/balance";
import { bestUpdate, newTrick, NUTS, NUT_N, nutNear, nutsCount, trickLive, trickStep, type LibreBest } from "../src/free_tricks";

const R = BAL.ritmo, DT = 1 / 60;
/** Salta: `secs` en el aire girando a wYaw/wFlip rad/s y aterriza con el techo a upY. */
function jump(s = newTrick(), secs = 1, wYaw = 0, wFlip = 0, upY = 1) {
  for (let t = 0; t < secs; t += DT) trickStep(s, DT, false, wYaw, wFlip, upY);
  return trickStep(s, DT, true, 0, 0, upY);
}

describe("trucos", () => {
  it("un rebote corto no cuenta", () => { expect(jump(newTrick(), 0.2)).toBeNull(); });
  it("aire largo sin giros: nombre y puntos por segundo", () => {
    const t = jump(newTrick(), 1.5)!;
    expect(t.name).toBe("AIRE LARGO"); expect(t.clean).toBe(true); expect(Math.abs(t.pts - 1.5 * R.libre_pts_aire)).toBeLessThan(3); // cuadros enteros: ~1,52 s
  });
  it("aire de 1 s con 720 grados de giro: 2 giros (GIRO 720) = 100 + 300", () => {
    const t = jump(newTrick(), 1, 4 * Math.PI, 0)!;
    expect(t.name).toBe("GIRO 720"); expect(t.pts).toBe(Math.round(R.libre_pts_aire + 2 * R.libre_pts_giro));
  });
  it("medio giro, 540 y vueltas se nombran", () => {
    expect(jump(newTrick(), 1, Math.PI, 0)!.name).toBe("MEDIO GIRO");
    expect(jump(newTrick(), 1, 3 * Math.PI, 0)!.name).toBe("GIRO 540");
    expect(jump(newTrick(), 1, 2 * Math.PI, 2 * Math.PI)!.name).toBe("GIRO 360 + VUELTA");
    expect(jump(newTrick(), 1, 0, 4 * Math.PI)!.name).toBe("DOBLE VUELTA");
  });
  it("aterrizaje sucio: sin puntos y corta el combo", () => {
    const s = newTrick(); jump(s, 1);
    const t = jump(s, 1, 0, 0, 0.2)!;
    expect(t.clean).toBe(false); expect(t.pts).toBe(0); expect(s.combo).toBe(0);
  });
  it("combo: saltar de nuevo antes de 2 s sube el multiplicador hasta el tope; esperar lo corta", () => {
    const s = newTrick(), a = jump(s, 1)!;
    for (let t = 0; t < 1; t += DT) trickStep(s, DT, true, 0, 0, 1); // 1 s en el piso
    const b = jump(s, 1)!, c = jump(s, 1)!, d = jump(s, 1)!, e = jump(s, 1)!;
    expect([a.mult, b.mult, c.mult, d.mult, e.mult]).toEqual([1, 2, 3, R.libre_combo_tope, R.libre_combo_tope]);
    expect(b.pts).toBe(a.pts * 2); expect(e.chainPts).toBeGreaterThan(d.chainPts);
    for (let t = 0; t < R.libre_combo_s + 0.5; t += DT) trickStep(s, DT, true, 0, 0, 1);
    expect(jump(s, 1)!.mult).toBe(1);
  });
  it("contador en vuelo y récords", () => {
    const s = newTrick(); for (let t = 0; t < 1.2; t += DT) trickStep(s, DT, false, 2 * Math.PI, 0, 1);
    expect(trickLive(s)).toMatch(/^1,2 s · 360°$/);
    const b: LibreBest = { aire: 0, giro: 0, vuelta: 0, salto: 0, combo: 0 };
    expect(bestUpdate(b, jump(newTrick(), 1, 2 * Math.PI)!)).toContain("salto");
    expect(b.giro).toBeGreaterThanOrEqual(340); expect(bestUpdate(b, jump(newTrick(), 1)!)).not.toContain("giro");
    expect(bestUpdate(b, jump(newTrick(), 3, 0, 0, 0)!)).toEqual([]); // sucio: no hay récord
  });
});

describe("tuercas doradas", () => {
  it("son 24, únicas y cada una se junta una sola vez", () => {
    expect(NUT_N).toBe(24); expect(new Set(NUTS.map((n) => n.join())).size).toBe(24);
    const bits = "0".repeat(24), [x, y, z] = NUTS[5];
    expect(nutNear(bits, x + 1, y, z)).toBe(5);
    expect(nutNear(bits.slice(0, 5) + "1" + bits.slice(6), x + 1, y, z)).toBe(-1);
    expect(nutNear(bits, x + 40, y, z)).toBe(-1);
    expect(nutsCount("1".repeat(10) + "0".repeat(14))).toBe(10);
  });
});
