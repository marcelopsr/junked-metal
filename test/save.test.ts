// Guardado: parseSave (src/savefmt.ts) valida y migra lo que sale de localStorage / de un archivo importado.
import { describe, expect, it } from "vitest";
import { parseSave, type SaveDeps } from "../src/savefmt";
import type { Save } from "../src/menu";

// Valores por defecto mínimos: lo que parseSave toca y lo que se mezcla (el resto del tipo no importa acá)
const D = {
  scale: 0.75, fsrSharp: 0.9, sharpen: 0, fov: 49, aa: "none", shadowQ: "mid", detail: "medio", texRes: 512, aniso: 4, menuFps: 60,
  perm: { hp: 0, dmg: 0 }, kit: { wing: "serie", decal: "nada" }, vol: { master: 1, sfx: 1 }, pad: { dead: 0.15, sens: 1 }, stats: { runs: 0, dmg: {}, zone: {} },
  scrap: 0, cars: ["buggy"], ach: [], keys: {}, ability: "bombardeo", beast: {}, preset: "medio",
} as unknown as Save;
const deps: SaveDeps = {
  abilities: { bombardeo: 1, emp: 1 }, curses: { horda: 1 }, kinds: ["hormiga", "gato"], zones: { patio: 1, garaje: 1 }, isTouch: false,
  validDecal: (d) => typeof d === "string" && /^[0-8]{4}$/.test(d), presetOf: ({ shadowQ }) => (shadowQ === "off" ? "bajo" : "medio"),
};
const load = (o: unknown, d = deps) => parseSave(typeof o === "string" ? o : JSON.stringify(o), D, d);

describe("parseSave", () => {
  it("sin guardado o con JSON roto devuelve los valores por defecto", () => {
    expect(parseSave(null, D, deps)).toMatchObject({ scrap: 0, cars: ["buggy"], scale: 0.75 });
    expect(parseSave("{no es json", D, deps)).toEqual(D);
  });
  it("conserva lo válido y completa lo que falta", () => {
    const s = load({ scrap: 120, perm: { hp: 3 }, vol: { music: 0.2 } });
    expect(s.scrap).toBe(120); expect(s.perm).toMatchObject({ hp: 3, dmg: 0 }); expect(s.vol).toMatchObject({ master: 1, music: 0.2 });
  });
  it("descarta campos con el tipo equivocado", () => {
    const s = load({ cars: "buggy", ach: {}, keys: 5, stats: null, runs: 7 });
    expect(s.cars).toEqual(["buggy"]); expect(s.ach).toEqual([]); expect(s.keys).toEqual({}); expect(s.stats).toMatchObject({ runs: 0 });
    expect(s.runs).toBeUndefined(); // el default de este test no trae runs: lo importante es que el 7 inválido no pasó
  });
  it("habilidad y maldiciones: solo ids conocidos", () => {
    expect(load({ ability: "inventada" }).ability).toBe("bombardeo");
    expect(load({ ability: "emp", curses: ["horda", "x"] })).toMatchObject({ ability: "emp", curses: ["horda"] });
  });
  it("rangos de imagen se acotan y los enumerados inválidos vuelven al defecto", () => {
    const s = load({ lookv: 6, gfxv: 1, scale: 9, fov: -5, bright: 0, gamma: "x", aa: "taa", fsr: "raro", shadowQ: "x", texRes: 1024, aniso: 3, fpsCap: 59 });
    expect([s.scale, s.fov, s.bright, s.gamma]).toEqual([1, 40, 0.6, 1]);
    expect(s.aa).toBe("fxaa"); expect(s.fsr).toBe("off"); expect(s.shadowQ).toBe("mid"); expect(s.texRes).toBe(512); expect(s.aniso).toBe(4); expect(s.fpsCap).toBe(0);
  });
  it("registro por bicho: solo tipos conocidos, números positivos y zonas existentes", () => {
    const s = load({ beast: { hormiga: { first: "2026-10-04", hurt: -3, by: { gomitas: 5, clips: -1, x: "a" }, zones: ["patio", "luna"] }, dragon: { hurt: 9 }, gato: { first: "ayer" } } });
    expect(s.beast.hormiga).toEqual({ first: "2026-10-04", hurt: 0, by: { gomitas: 5 }, zones: ["patio"] });
    expect(s.beast.gato).toMatchObject({ first: undefined, hurt: 0 });
    expect(Object.keys(s.beast)).toEqual(["hormiga", "gato"]);
  });
  it("calcos: tres ranuras, diseños válidos y selección apuntando a una ranura con diseño", () => {
    const s = load({ decals: ["0123", "malo", "8888", "extra"], decalSel: 1 });
    expect(s.decals).toEqual(["0123", "", "8888"]); expect(s.decalSel).toBe(-1);
    expect(load({ decals: ["0123"], decalSel: 0 }).decalSel).toBe(0);
  });
  it("migra una vez: look v6 y Imagen v1 (sombras off, FXAA mínimo en táctil)", () => {
    expect(load({ aa: "msaa4", lookv: 3 })).toMatchObject({ aa: "none", lookv: 6 });
    expect(load({ shadows: false, aa: "msaa4", lookv: 6 })).toMatchObject({ shadowQ: "off", gfxv: 1, preset: "bajo" });
    expect(load({ lookv: 6 }, { ...deps, isTouch: true }).aa).toBe("fxaa");
    expect(load({ lookv: 6, gfxv: 1, aa: "msaa8" }).aa).toBe("msaa8"); // ya migrado: no se vuelve a tocar
  });
});
