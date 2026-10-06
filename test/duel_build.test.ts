import { describe, expect, it } from "vitest";
import { TEMPLATES, livingFromBuild, massOfBuild, pickHitCellIndex, stripCell, validateBuild, wheelCount } from "../src/duel_build";

describe("duel_build", () => {
  it("plantilla caja es válida", () => {
    const v = validateBuild(TEMPLATES.caja.build);
    expect(v.level).not.toBe("ban");
    expect(wheelCount(TEMPLATES.caja.build)).toBeGreaterThanOrEqual(4);
    expect(massOfBuild(TEMPLATES.caja.build)).toBeLessThan(8);
  });
  it("plantilla cuna es válida", () => {
    expect(validateBuild(TEMPLATES.cuna.build).level).not.toBe("ban");
  });
  it("plantilla plancha es válida", () => {
    expect(validateBuild(TEMPLATES.plancha.build).level).not.toBe("ban");
  });
  it("sin asiento es ban", () => {
    expect(validateBuild({ cells: [{ x: 0, y: 0, z: 0, rot: 0, blockId: "chapa" }] }).level).toBe("ban");
  });
  it("desgaste por pieza quita bloque", () => {
    const live = livingFromBuild(TEMPLATES.caja.build);
    const idx = pickHitCellIndex(live.build, 0, 0);
    expect(idx).toBeGreaterThanOrEqual(0);
    live.partHp[idx] = 0;
    stripCell(live, idx);
    expect(live.build.cells.length).toBe(TEMPLATES.caja.build.cells.length - 1);
  });
});
