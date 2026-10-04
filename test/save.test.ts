// Guardado: parseSave (src/savefmt.ts) valida y migra lo que sale de localStorage / de un archivo importado.
import { describe, expect, it } from "vitest";
import { parseSave, type SaveDeps } from "../src/savefmt";
import type { Save } from "../src/menu";

// Valores por defecto mínimos: lo que parseSave toca y lo que se mezcla (el resto del tipo no importa acá)
const D = {
  scaler: "simple", scale: 0.75, fsr: "calidad", sharpen: 0, bloom: true, fov: 49, aa: "none", shadowQ: "mid", detail: "medio", texRes: 512, aniso: 4, menuFps: 60,
  perm: { hp: 0, dmg: 0 }, kit: { wing: "serie", decal: "nada" }, vol: { master: 1, sfx: 1 }, pad: { dead: 0.15, sens: 1, invX: false, invY: false, stick: "left", mode: "trig", btn: { boost: [0], cam: [8], ok: [0] } },
  race: { kb1: { up: ["KeyW", ""], drift: ["Space", "ShiftLeft"] }, kb2: { up: ["ArrowUp", ""] }, pad: { accel: [7, 0] } }, touch: 1, stats: { runs: 0, dmg: {}, zone: {} },
  scrap: 0, cars: ["buggy"], ach: [], keys: { up: ["KeyW", "ArrowUp"], boost: ["Space", ""], pause: ["Escape", "KeyP"] }, ability: "bombardeo", beast: {}, preset: "medio",
} as unknown as Save;
const deps: SaveDeps = {
  abilities: { bombardeo: 1, emp: 1 }, curses: { horda: 1 }, kinds: ["hormiga", "gato"], zones: { patio: 1, garaje: 1 }, isTouch: false,
  validDecal: (d) => typeof d === "string" && /^[0-8]{4}$/.test(d), presetOf: ({ shadowQ }) => (shadowQ === "off" ? "bajo" : "medio"),
  presets: { bajo: { shadowQ: "off", texRes: 128, bloom: false }, medio: { shadowQ: "mid", texRes: 256, bloom: true } },
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
    expect(s.cars).toEqual(["buggy"]); expect(s.ach).toEqual([]); expect(s.keys).toEqual(D.keys); expect(s.stats).toMatchObject({ runs: 0 });
    expect(s.runs).toBeUndefined(); // el default de este test no trae runs: lo importante es que el 7 inválido no pasó
  });
  it("habilidad y maldiciones: solo ids conocidos", () => {
    expect(load({ ability: "inventada" }).ability).toBe("bombardeo");
    expect(load({ ability: "emp", curses: ["horda", "x"] })).toMatchObject({ ability: "emp", curses: ["horda"] });
  });
  it("rangos de imagen se acotan y los enumerados inválidos vuelven al defecto", () => {
    const s = load({ lookv: 6, gfxv: 1, scale: 9, fov: -5, bright: 0, gamma: "x", aa: "taa", fsr: "raro", shadowQ: "x", texRes: 1024, aniso: 3, fpsCap: 59 });
    expect([s.scale, s.fov, s.bright, s.gamma]).toEqual([1, 40, 0.6, 1]);
    expect(s.aa).toBe("fxaa"); expect(s.fsr).toBe("calidad"); expect(s.shadowQ).toBe("mid"); expect(s.texRes).toBe(512); expect(s.aniso).toBe(4); expect(s.fpsCap).toBe(0);
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
    expect(load({ shadows: false, aa: "msaa4", lookv: 6 })).toMatchObject({ shadowQ: "off", gfxv: 2, preset: "bajo" });
    expect(load({ lookv: 6 }, { ...deps, isTouch: true }).aa).toBe("fxaa");
    expect(load({ lookv: 6, gfxv: 1, aa: "msaa8" }).aa).toBe("msaa8"); // ya migrado: no se vuelve a tocar
  });
  it("migra Imagen v2: escalado Simple/FSR, una sola nitidez, preajuste con sus valores nuevos", () => {
    const v1 = { lookv: 6, gfxv: 1 };
    expect(load({ ...v1, fsr: "off", fsrSharp: 0.4, sharpen: 0.2 })).toMatchObject({ scaler: "simple", fsr: "calidad", sharpen: 0.2, gfxv: 2 });
    const f = load({ ...v1, fsr: "rendimiento", fsrSharp: 0.7, sharpen: 0.1 });
    expect(f).toMatchObject({ scaler: "fsr", fsr: "rendimiento", sharpen: 0.7 }); expect(f).not.toHaveProperty("fsrSharp");
    expect(load({ ...v1, preset: "medio", shadowQ: "mid", texRes: 512, bloom: false })).toMatchObject({ texRes: 256, bloom: true, preset: "medio" });
    expect(load({ ...v1, preset: "custom", shadowQ: "high", texRes: 512, bloom: false })).toMatchObject({ shadowQ: "high", texRes: 512, bloom: false });
    expect(load({ lookv: 6, gfxv: 2, scaler: "raro", texRes: 128, bloom: "x" })).toMatchObject({ scaler: "simple", texRes: 128, bloom: true }); // ya migrado: solo se valida
  });
  it("controles viejos: la tecla principal reasignada se conserva y gana la alternativa de fábrica", () => {
    const s = load({ keys: { up: "KeyI", boost: "KeyJ", inventada: "KeyZ" }, pad: { dead: 0.3, sens: 1.5 } });
    expect(s.keys).toEqual({ up: ["KeyI", "ArrowUp"], boost: ["KeyJ", ""], pause: ["Escape", "KeyP"] });
    expect(s.pad).toEqual({ ...D.pad, dead: 0.3, sens: 1.5 });
    expect(load({ keys: { up: "ArrowUp" } }).keys.up).toEqual(["ArrowUp", ""]); // no queda repetida
  });
  it("controles nuevos: ranuras válidas, botones en rango, enumerados y disposición táctil acotada", () => {
    const s = load({ keys: { up: ["KeyI", ""], boost: ["<b>", "x"], pause: ["Escape"] },
      pad: { dead: 9, invX: true, invY: "si", stick: "right", mode: "raro", btn: { boost: [3], cam: [99], ok: "a" } },
      race: { kb1: { up: ["KeyI", "KeyK"] }, pad: { accel: [5, -1] } }, tlay: { v: { boost: { x: 2, y: 0.3, s: 9 }, inventado: { x: 0 }, stick: 3 }, h: 5 }, touch: 0.1 });
    expect(s.keys).toEqual({ up: ["KeyI", ""], boost: ["Space", ""], pause: ["Escape", "KeyP"] });
    expect(s.pad).toMatchObject({ dead: 0.4, invX: true, invY: false, stick: "right", mode: "trig", btn: { boost: [3], cam: [8], ok: [0] } });
    expect(s.race).toEqual({ kb1: { up: ["KeyI", "KeyK"], drift: ["Space", "ShiftLeft"] }, kb2: { up: ["ArrowUp", ""] }, pad: { accel: [5, -1] } });
    expect(s.tlay).toEqual({ v: { boost: { x: 1, y: 0.3, s: 2 } }, h: {} }); expect(load({ pad: { mode: "mix" } }).pad.mode).toBe("trig"); // Mixto se quitó expect(s.touch).toBe(0.7);
  });
  it("perfiles: siempre tres ranuras, nombre acotado y controles validados como los de la partida", () => {
    const s = load({ profiles: [{ name: "  Sillón con nombre muy largo de verdad  ", keys: { up: "KeyO" }, touch: 1.2 }, "x", { name: "" }, { name: "cuarto" }] });
    expect(s.profiles).toHaveLength(3);
    expect(s.profiles[0]).toMatchObject({ name: "Sillón con nombre mu", touch: 1.2, keys: { up: ["KeyO", "ArrowUp"] }, pad: D.pad });
    expect(s.profiles[1]).toBeNull(); expect(s.profiles[2]!.name).toBe("Perfil 3");
    expect(load({}).profiles).toEqual([null, null, null]);
  });
});
