// Guardado: parseSave (src/savefmt.ts) valida y migra lo que sale de localStorage / de un archivo importado.
import { fantasmaEnc } from "../src/free_challenges";
import { describe, expect, it } from "vitest";
import { parseSave, type SaveDeps } from "../src/savefmt";
import type { Save } from "../src/menu";

// Valores por defecto mínimos: lo que parseSave toca y lo que se mezcla (el resto del tipo no importa acá)
const D = {
  scaler: "simple", scale: 0.75, fsr: "calidad", sharpen: 0, bloom: true, fov: 49, camMode: "actual", aa: "none", shadowQ: "mid", detail: "medio", texRes: 512, aniso: 4, menuFps: 60,
  perm: { hp: 0, dmg: 0 }, kit: { wing: "serie", decal: "nada" }, vol: { master: 1, sfx: 1 }, pad: { dead: 0.15, sens: 1, invX: false, invY: false, stick: "left", mode: "trig", btn: { boost: [0], cam: [8], ok: [0] } },
  race: { kb1: { up: ["KeyW", ""], drift: ["Space", "ShiftLeft"] }, kb2: { up: ["ArrowUp", ""] }, pad: { accel: [7, 0] } }, touch: 1, stats: { runs: 0, dmg: {}, zone: {} },
  scrap: 0, cars: ["buggy"], ach: [], keys: { up: ["KeyW", "ArrowUp"], boost: ["Space", ""], pause: ["Escape", "KeyP"] }, ability: "bombardeo", beast: {}, preset: "medio",
} as unknown as Save;
const deps: SaveDeps = {
  abilities: { bombardeo: 1, emp: 1 }, weapons: ["gomitas", "clips"], curses: { horda: 1 }, kinds: ["hormiga", "gato"], zones: { patio: 1, garaje: 1 }, isTouch: false,
  validDecal: (d) => typeof d === "string" && (/^[0-8]{4}$/.test(d) || d.startsWith("decal:")), presetOf: ({ shadowQ }) => (shadowQ === "off" ? "bajo" : "medio"),
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
  it("modo daltónico: apagado por defecto, solo true lo enciende", () => {
    expect(load({}).cb).toBe(false); expect(load({ cb: "si" }).cb).toBe(false); expect(load({ cb: true }).cb).toBe(true);
  });
  it("guía de controles: nueva instalación la ve; quien ya jugó, no", () => {
    expect(load({}).controlesVistos).toBe(false);
    expect(load({ controlesVistos: "si" }).controlesVistos).toBe(false);
    expect(load({ controlesVistos: true }).controlesVistos).toBe(true);
    expect(load({ tutorialHecho: true }).controlesVistos).toBe(true);
    expect(load({ stats: { runs: 3 } }).controlesVistos).toBe(true);
    expect(load({ encore: { runs: 1 } }).controlesVistos).toBe(true);
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
  it("modo de cámara: solo los conocidos, lo demás vuelve a Persecución", () => {
    expect(load({ camMode: "cenital" }).camMode).toBe("cenital");
    expect(load({ camMode: "drone" }).camMode).toBe("actual");
    expect(load({ camMode: 3 }).camMode).toBe("actual");
    expect(load({}).camMode).toBe("actual");
  });
  it("registro por bicho: solo tipos conocidos, números positivos y zonas existentes", () => {
    const s = load({ beast: { hormiga: { first: "2026-10-04", hurt: -3, by: { gomitas: 5, clips: -1, x: "a" }, zones: ["patio", "luna"] }, dragon: { hurt: 9 }, gato: { first: "ayer" } } });
    expect(s.beast.hormiga).toEqual({ first: "2026-10-04", hurt: 0, by: { gomitas: 5 }, zones: ["patio"] });
    expect(s.beast.gato).toMatchObject({ first: undefined, hurt: 0 });
    expect(Object.keys(s.beast)).toEqual(["hormiga", "gato"]);
  });
  it("calcos: tres ranuras, diseños válidos y selección apuntando a una ranura con diseño", () => {
    const s = load({ decals: ["0123", "malo", "decal:dorsal_07", "extra"], decalSel: 1 });
    expect(s.decals).toEqual(["0123", "", "decal:dorsal_07"]); expect(s.decalSel).toBe(-1);
    expect(load({ decals: ["0123"], decalSel: 0 }).decalSel).toBe(0);
    expect(load({ decals: ["decal:flames", "", ""], decalSel: 0 }).decalSel).toBe(0);
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
    expect(load({ lookv: 6, gfxv: 2, scaler: "ia", fsr: "calidad", gpu: "webgpu" })).toMatchObject({ scaler: "ia", gpu: "webgpu" }); // v2 no se vuelve a migrar en cada carga
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
  it("la disposición táctil conserva el botón de giro y los guardados viejos (sin spin) quedan con el del CSS", () => {
    expect(load({ tlay: { v: { spin: { x: 0.2, y: 5, s: 1 } }, h: {} } }).tlay).toEqual({ v: { spin: { x: 0.2, y: 1, s: 1 } }, h: {} });
    expect(load({ tlay: { v: { boost: { x: 0.5, y: 0.5, s: 1 } }, h: {} } }).tlay.v).not.toHaveProperty("spin");
  });
  it("perfiles: siempre tres ranuras, nombre acotado y controles validados como los de la partida", () => {
    const s = load({ profiles: [{ name: "  Sillón con nombre muy largo de verdad  ", keys: { up: "KeyO" }, touch: 1.2 }, "x", { name: "" }, { name: "cuarto" }] });
    expect(s.profiles).toHaveLength(3);
    expect(s.profiles[0]).toMatchObject({ name: "Sillón con nombre mu", touch: 1.2, keys: { up: ["KeyO", "ArrowUp"] }, pad: D.pad });
    expect(s.profiles[1]).toBeNull(); expect(s.profiles[2]!.name).toBe("Perfil 3");
    expect(load({}).profiles).toEqual([null, null, null]);
  });
  it("Taller: niveles de mejoras y habilidades enteros de 0 a 10, arma inicial solo del arsenal", () => {
    const s = load({ perm: { hp: 3, dmg: -1, inventada: 4 }, abilLv: { emp: 2.5, bombardeo: 99, x: 1 }, weapon: "clips" });
    expect(s.perm).toEqual({ hp: 3, dmg: 0 }); expect(s.abilLv).toEqual({ bombardeo: 10 }); expect(s.weapon).toBe("clips");
    expect(load({ weapon: "chispazo" }).weapon).toBeUndefined(); // fusión o id inventado: se descarta (el defecto de este test no trae weapon)
    expect(load({ perm: "x", abilLv: null })).toMatchObject({ perm: { hp: 0, dmg: 0 }, abilLv: {} });
  });
  it("colores por zona: el guardado viejo conserva pintura y llantas, detalles nace de fábrica y lo inválido se descarta", () => {
    expect(load({ paint: "#1D4ED8", rim: "#ffc300" })).toMatchObject({ paint: "#1d4ed8", rim: "#ffc300", trim: "" });
    expect(load({})).toMatchObject({ paint: "", rim: "", trim: "" });
    expect(load({ paint: "red", trim: '#000" onclick="x', rim: 5 })).toMatchObject({ paint: "", trim: "", rim: "" });
    expect(load({ paint: "#aabbcc", trim: "#112233", rim: "#445566" })).toMatchObject({ paint: "#aabbcc", trim: "#112233", rim: "#445566" });
  });
  it("ENCORE: récord propio con round-trip, default y descarte de basura", () => {
    const e = { best: { loop: 1, stage: 2, t: 345 }, wins: 2, runs: 5, lastLoop: 1, lastCause: "bombardeo", secrets: ["audiencia"], tips: ["start"], seenPacts: ["ensayo"], seenVariants: ["EL LADO OSCURO"], seenInts: ["corte"] };
    expect(load(JSON.stringify(load({ encore: e }))).encore).toEqual(e);
    expect(load({}).encore).toEqual({ best: { loop: 0, stage: 0, t: 0 }, wins: 0, runs: 0, lastLoop: 0, lastCause: "", secrets: [], tips: [], seenPacts: [], seenVariants: [], seenInts: [] });
    expect(load({ encore: { best: { loop: -1, stage: "x", t: 1.5 }, wins: null, runs: 3 } }).encore).toEqual({ best: { loop: 0, stage: 0, t: 0 }, wins: 0, runs: 3, lastLoop: 0, lastCause: "", secrets: [], tips: [], seenPacts: [], seenVariants: [], seenInts: [] });
    // R3: la causa se sanea (va a pantalla) y sin causa no hay vuelta; guardados anteriores sin los campos cargan limpios
    expect(load({ encore: { runs: 1, lastLoop: 4, lastCause: "<b>x</b> bombardeo" + "y".repeat(80) } }).encore).toMatchObject({ lastLoop: 4, lastCause: "bxb bombardeo" + "y".repeat(27) });
    expect(load({ encore: { runs: 1, lastLoop: 4, lastCause: 7 } }).encore).toMatchObject({ lastLoop: 0, lastCause: "", secrets: [], tips: [] });
    expect(load({ encore: { runs: 2, lastLoop: -3, lastCause: "gato" } }).encore).toMatchObject({ lastLoop: 0, lastCause: "gato" });
    // Contenido 3: secretos descubiertos: solo ids conocidos, sin repetir; basura = lista vacía
    expect(load({ encore: { secrets: ["aplausos", "aplausos", "<script>", 3, "bambalinas"] } }).encore.secrets).toEqual(["aplausos", "bambalinas"]);
    expect(load({ encore: { secrets: "aplausos" } }).encore.secrets).toEqual([]);
    expect(load({ encore: { tips: ["start", "start", "x", 3, "vote"] } }).encore.tips).toEqual(["start", "vote"]); // avisos de la primera partida: ids conocidos, sin repetir
    expect(load({ encore: { tips: "start" } }).encore.tips).toEqual([]);
    expect(load({ encore: { seenPacts: ["garantia", "garantia", "<x>", 3], seenVariants: ["LA TARIMA", "nada"], seenInts: ["luces", "luces", "x"] } }).encore).toMatchObject({ seenPacts: ["garantia"], seenVariants: ["LA TARIMA"], seenInts: ["luces"] }); // Codex: ids conocidos, sin repetir
    expect(load({ encore: { seenPacts: "x" } }).encore.seenPacts).toEqual([]);
  });
  it("Paseo libre: un guardado viejo sin bloque libre migra a vacío; lo inválido se descarta", () => {
    const vacio = { best: { aire: 0, giro: 0, vuelta: 0, salto: 0, combo: 0 }, desafio: { obs: 0, skate: 0, nieve: 0 }, tuercas: "0".repeat(24), aviso: false, ghost: true, fantasma: { obs: "", skate: "", nieve: "" }, metas: [] };
    expect(load({}).libre).toEqual(vacio);
    expect(load({ libre: { metas: ["skate_bowl", "skate_bowl", "inventada", 3] } }).libre.metas).toEqual(["skate_bowl"]); // objetivos de barrio: ids conocidos, sin repetir
    expect(load({ libre: { metas: "skate_bowl" } }).libre.metas).toEqual([]);
    expect(load({ libre: { best: { aire: -3, giro: "x", salto: 450.5, combo: 1200 }, tuercas: "10" } }).libre).toEqual({ ...vacio, best: { ...vacio.best, combo: 1200 } });
    expect(load({ libre: { best: { vuelta: 3 }, tuercas: "1".repeat(24) } }).libre).toEqual({ ...vacio, best: { ...vacio.best, vuelta: 3 }, tuercas: "1".repeat(24) });
    expect(load({ libre: { desafio: { obs: 61234, skate: -5, nieve: "x" } } }).libre.desafio).toEqual({ obs: 61234, skate: 0, nieve: 0 }); // récords de desafíos: enteros no negativos
    expect(load({ libre: { aviso: true } }).libre.aviso).toBe(true); expect(load({ libre: { aviso: "si" } }).libre.aviso).toBe(false); // cartel del giro aéreo: una sola vez
    const f = fantasmaEnc(Array.from({ length: 5 }, (_, i) => [i, 0, 0, 0, 0, 0, 1, 0]));
    expect(load({ libre: { fantasma: { obs: f, skate: "!!corrupto", nieve: "AAAA" }, ghost: false } }).libre).toMatchObject({ fantasma: { obs: f, skate: "", nieve: "" }, ghost: false }); // fantasma: válido se conserva, corrupto o de largo raro se descarta
    expect(load({ libre: { fantasma: { obs: "A".repeat(30000) } } }).libre.fantasma.obs).toBe("");
    expect(load({ libre: 5 }).libre).toEqual(vacio);
  });
});
