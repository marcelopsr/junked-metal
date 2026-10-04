// Fórmulas de daño/vida/XP de pasivas, mejoras permanentes y pilotos (weapons.ts passiveStats + pilots.ts), sobre los números de balance.json.
import { describe, expect, it, vi } from "vitest";
import { BAL } from "../src/balance";
import type { PilotId } from "../src/pilots";

// weapons.ts arrastra sfx/render/models, que miran el navegador al importarse (?mute, matchMedia...): se simulan solo esas dos cosas y no se usa nada de eso.
vi.stubGlobal("location", { search: "?mute" });
vi.stubGlobal("matchMedia", () => ({ matches: false }));
const { passiveStats } = await import("../src/weapons");
const { PILOTS, pilotStats } = await import("../src/pilots");

const none = { hp: 0, dmg: 0, spd: 0, mag: 0, xp: 0 };

describe("passiveStats", () => {
  it("sin pasivas ni mejoras: valores base (neutros)", () => {
    const s = passiveStats({}, none);
    expect(s).toMatchObject({ area: 1, speedMul: 1, maxHp: 0, cooldown: 1, armor: 0, mass: 1, dmg: 1, xp: 1 });
    expect(s.magnet).toBe(BAL.pasivas.iman.base);
  });
  it("la Lupa suma daño por nivel y el taller multiplica aparte", () => {
    const l3 = passiveStats({ lupa: 3 }, none).dmg;
    expect(l3).toBeCloseTo(1 + 3 * BAL.pasivas.lupa.por_nivel);
    expect(passiveStats({ lupa: 3 }, { ...none, dmg: 2 }).dmg).toBeCloseTo(l3 * (1 + 2 * BAL.precios.dmg.efecto));
  });
  it("capacitor baja la recarga y el blindaje del paragolpes nunca llega a 1 (inmortal)", () => {
    expect(passiveStats({ capacitor: 5 }, none).cooldown).toBeLessThan(1);
    for (let l = 0; l <= 10; l++) { const a = passiveStats({ lego: l }, none).armor; expect(a).toBeGreaterThanOrEqual(0); expect(a).toBeLessThan(1); }
  });
  it("cada nivel de una pasiva mejora monótonamente su efecto", () => {
    let prev = passiveStats({}, none);
    for (let l = 1; l <= 8; l++) {
      const s = passiveStats({ iman: l, resorte: l, turbo: l, litio: l, lupa: l, capacitor: l, lego: l }, none);
      expect(s.magnet).toBeGreaterThan(prev.magnet); expect(s.area).toBeGreaterThan(prev.area); expect(s.speedMul).toBeGreaterThan(prev.speedMul);
      expect(s.maxHp).toBeGreaterThan(prev.maxHp); expect(s.dmg).toBeGreaterThan(prev.dmg); expect(s.cooldown).toBeLessThan(prev.cooldown); expect(s.armor).toBeGreaterThan(prev.armor);
      prev = s;
    }
  });
});

describe("pilotStats", () => {
  it("cada piloto aplica las columnas de su fila de balance", () => {
    for (const id of Object.keys(PILOTS) as PilotId[]) {
      const p = BAL.pilotos[id], s = pilotStats(passiveStats({}, none), id);
      expect(s.dmg).toBeCloseTo(p.dano_mult); expect(s.maxHp).toBeCloseTo(p.vida_mas); expect(s.speedMul).toBeCloseTo(p.velocidad_mult); expect(s.xp).toBeCloseTo(p.xp_mult);
    }
  });
  it("un piloto desconocido cae en el soldadito (guardado viejo)", () => {
    expect(pilotStats(passiveStats({}, none), "inexistente" as PilotId).dmg).toBeCloseTo(BAL.pilotos.soldadito.dano_mult);
  });
});

describe("mejoras nuevas del Taller (Chasis)", () => {
  const T = BAL.precios;
  it("blindaje, regeneración, turbo, embestida y recarga aplican su efecto por nivel", () => {
    const s = passiveStats({}, { ...none, arm: 5, reg: 4, tur: 3, ram: 2, cdr: 10 });
    expect(s.armor).toBeCloseTo(1 - Math.pow(1 - T.arm.efecto, 5));
    expect(s.regen).toBeCloseTo(BAL.pasivas.litio.base2 + 4 * T.reg.efecto);
    expect(s.boostRegen).toBeCloseTo(BAL.pasivas.turbo.base2 * (1 + 3 * T.tur.efecto)); expect(s.boostUse).toBeCloseTo(1 / (1 + 3 * T.tur.efecto));
    expect(s.ram).toBeCloseTo(1 + 2 * T.ram.efecto); expect(s.cooldown).toBeCloseTo(Math.pow(1 - T.cdr.efecto, 10));
  });
  it("sin niveles son neutras y el blindaje con todo al máximo nunca llega a 1", () => {
    expect(passiveStats({}, none)).toMatchObject({ ram: 1, boostUse: 1, armor: 0 });
    expect(passiveStats({ lego: 10 }, { ...none, arm: 10 }).armor).toBeLessThan(1);
  });
});

describe("habilidades y arsenal", async () => {
  const { abilCd, abilK, ABILITIES } = await import("../src/abilities");
  const { ARSENAL, startWeapons } = await import("../src/pilots");
  const { costos } = await import("../src/balance");
  it("cada nivel de habilidad baja el enfriamiento y sube el efecto, y todas tienen precios", () => {
    for (const id of Object.keys(ABILITIES) as (keyof typeof ABILITIES)[]) {
      const n = costos("hab_" + id).length; expect(n).toBeGreaterThan(0);
      expect(abilCd(id, n)).toBeLessThan(abilCd(id, 0)); expect(abilCd(id, n)).toBeGreaterThan(0); expect(abilK(n)).toBeGreaterThan(abilK(0));
    }
  });
  it("arsenal: Gomitas de serie, armas base con precio y una sola inicial", () => {
    expect(ARSENAL[0]).toBe("gomitas"); expect(ARSENAL).not.toContain("lanza"); expect(ARSENAL).not.toContain("chispazo");
    expect(startWeapons("robot", 0)).toEqual(["tesla"]); // con Gomitas elegida arranca con la del piloto
    expect(startWeapons("robot", 0, "clips")).toEqual(["clips"]);
    expect(startWeapons("soldadito", 1, "clips")).toHaveLength(2);
  });
});
