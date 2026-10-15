// Criterio 1.0: el guardado de cada versión pública (tags v0.90.0 a v0.94.0) migra con parseSave actual sin perder progreso.
// Los fixtures (test/fixtures/saves/vX.json) tienen la forma del DEFAULT de ese tag (`git show <tag>:src/menu.ts`) con progreso realista.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSave, type SaveDeps } from "../src/savefmt";
import type { Save } from "../src/menu";

const KEYS0 = { up: ["KeyW", "ArrowUp"], down: ["KeyS", "ArrowDown"], left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"], boost: ["Space", ""], drift: ["ShiftLeft", "ShiftRight"], jump: ["KeyF", ""], ability: ["KeyE", ""], cam: ["KeyC", ""], spin: ["KeyQ", ""], reroll: ["KeyR", ""], pause: ["Escape", "KeyP"], mute: ["KeyM", ""], zoomIn: ["Equal", "NumpadAdd"], zoomOut: ["Minus", "NumpadSubtract"] };
const PADB0 = { accel: [7], brake: [6], boost: [0], drift: [1], ability: [2], jump: [4], spin: [5], reroll: [3], cam: [8], pause: [9], ok: [0], back: [1] };
const RACE0 = { kb1: { up: ["KeyW", ""], down: ["KeyS", ""], left: ["KeyA", ""], right: ["KeyD", ""], drift: ["Space", "ShiftLeft"], item: ["KeyE", "KeyQ"] }, kb2: { up: ["ArrowUp", ""], down: ["ArrowDown", ""], left: ["ArrowLeft", ""], right: ["ArrowRight", ""], drift: ["ShiftRight", "Period"], item: ["Enter", "Comma"] }, pad: { accel: [7, 0], brake: [6, 1], drift: [5, 2], item: [3, 4] } };
// DEFAULT de hoy (v0.94 + lo nuevo): lo que el fixture no trae toma estos valores
const D = {
  intro: false, novedadesVistas: "", scrap: 2000, best: 0, perm: { hp: 0, dmg: 0, spd: 0, mag: 0, reroll: 0, cards: 0, extra: 0, revive: 0, xp: 0, arm: 0, reg: 0, tur: 0, ram: 0, cdr: 0 },
  cars: ["buggy"], car: "buggy", pilot: "soldadito", unlocked: [], kit: { wing: "serie", decal: "nada", lamp: "calido", exhaust: "nada", bumper: "nada", tires: "serie", acc: "nada" },
  paint: "", trim: "", rim: "", finish: "", zoom: 1.35, camMode: "actual", mute: false, vol: { master: 1, sfx: 1, engine: 1, music: 0.7 }, lookv: 6, shake: true, fps: false, hudSolid: false, hint: true,
  gfxv: 2, gpu: "webgl", scaler: "simple", scale: 0.75, fsr: "calidad", aa: "none", sharpen: 0, preset: "medio", shadowQ: "mid", detail: "medio", texRes: 256, aniso: 4, bloom: true, fpsCap: 0, menuFps: 60, fov: 49, bright: 1, gamma: 1,
  keys: KEYS0, pad: { dead: 0.15, sens: 1, invX: false, invY: false, stick: "left", mode: "trig", btn: PADB0 }, race: RACE0, tlay: { v: {}, h: {} }, profiles: [null, null, null], rumble: true, touch: 1, hud: 1,
  calm: false, cb: false, dmgNums: true, tranquilo: false, tutorialHecho: false, controlesVistos: false, decals: ["", "", ""], decalSel: -1, stats: { runs: 0, wins: 0, time: 0, dist: 0, dmg: {}, zone: {} },
  seen: [], slain: {}, beast: {}, runs: [], daily: { day: "", best: 0 }, zone: "patio", ach: [], ability: "bombardeo", curses: [], endless: 0, abilLv: {}, weapon: "gomitas",
  encore: { best: { loop: 0, stage: 0, t: 0 }, wins: 0, runs: 0, lastLoop: 0, lastCause: "", secrets: [], tips: [], seenPacts: [], seenVariants: [] }, m3: { stars: {}, best: {}, tools: {} },
  libre: { best: { aire: 0, giro: 0, vuelta: 0, salto: 0, combo: 0 }, tuercas: "0".repeat(24), aviso: false },
} as unknown as Save;
// ponytail: ids literales (importar menu.ts/abilities.ts/world.ts exige DOM); si cambian los ids del juego, actualizar acá
const deps: SaveDeps = {
  abilities: { bombardeo: 1, escudo: 1, emp: 1, lenta: 1, turbo: 1 }, weapons: ["gomitas", "clips", "chispero", "agua", "yoyo", "regla"], curses: { horda: 1, sinrep: 1 },
  kinds: ["hormiga", "escupidora", "gato", "polilla", "tarantula"], zones: { patio: 1, garaje: 1, jardin: 1, luna: 1 }, isTouch: false,
  validDecal: (d) => typeof d === "string" && (/^[0-8]{4}$/.test(d) || d.startsWith("decal:")), presetOf: ({ shadowQ }) => (shadowQ === "high" ? "alto" : "medio"),
  presets: { medio: { shadowQ: "mid", detail: "medio", texRes: 256, aniso: 4, bloom: true }, alto: { shadowQ: "high", detail: "alto", texRes: 512, aniso: 8, bloom: true } },
};
const dir = new URL("./fixtures/saves/", import.meta.url);
const fixtures = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
const tags = ["v0.90.0", "v0.91.0", "v0.92.0", "v0.93.0", "v0.94.0"];

describe("migración de guardados publicados", () => {
  it("hay un fixture por cada versión pública", () => expect(fixtures).toEqual(tags.map((t) => t + ".json")));
  for (const f of fixtures) {
    const raw = readFileSync(new URL(f, dir), "utf8"), old = JSON.parse(raw);
    describe(f, () => {
      const s = parseSave(raw, D, deps);
      it("conserva el progreso", () => {
        for (const k of ["scrap", "best", "cars", "car", "pilot", "unlocked", "weapon", "ability", "abilLv", "curses", "endless", "ach", "perm", "runs", "seen", "slain", "beast", "daily", "zone", "m3", "decals", "decalSel", "paint", "trim", "rim", "finish"] as const)
          expect(s[k], k).toEqual(old[k]);
        expect(s.stats).toMatchObject(old.stats);
        expect(s.encore).toMatchObject({ best: old.encore.best, wins: old.encore.wins, runs: old.encore.runs, lastLoop: old.encore.lastLoop, lastCause: old.encore.lastCause });
      });
      it("conserva la configuración", () => {
        for (const k of ["vol", "mute", "scale", "fov", "camMode", "aa", "scaler", "fsr", "sharpen", "shadowQ", "detail", "texRes", "aniso", "bloom", "fpsCap", "menuFps", "bright", "gamma", "keys", "pad", "race", "tlay", "touch", "hud", "rumble", "calm", "dmgNums", "tranquilo", "tutorialHecho", "novedadesVistas", "shake"] as const)
          expect(s[k], k).toEqual(old[k]);
        expect(s.cb).toBe(old.cb ?? false);
        expect(s.controlesVistos).toBe(true);
        expect(s.profiles.map((p) => p?.name ?? null)).toEqual(old.profiles.map((p: { name: string } | null) => p?.name ?? null));
      });
      it("completa lo nuevo y no deja campos inválidos", () => {
        expect(s.libre).toEqual(old.libre ? { ...old.libre, aviso: false } : D.libre);
        expect(s.lookv).toBe(6); expect(s.gfxv).toBe(2);
        expect(s.encore.secrets.length + s.encore.tips.length + s.encore.seenPacts.length).toBe(0);
        expect(s.preset).toBe(old.shadowQ === "high" ? "alto" : "medio");
        // Vuelve a dar lo mismo al reescribirse y releerse (idempotente) y sobrevive a JSON (nada de undefined/NaN)
        expect(parseSave(JSON.stringify(s), D, deps)).toEqual(s);
        for (const [k, v] of Object.entries(s)) if (typeof v === "number") expect(Number.isFinite(v), k).toBe(true);
        expect(JSON.parse(JSON.stringify(s))).toEqual(s);
      });
    });
  }

  it("PRUEBAS: la copia rcfight_antes_pruebas (tornillos y habilidades) sobrevive a releer el guardado", () => {
    // La copia y su restauración viven en menu.ts (necesita DOM); acá se prueba el contenido que guarda sobre un guardado real.
    const s = parseSave(readFileSync(new URL("v0.94.0.json", dir), "utf8"), D, deps);
    const copia = JSON.parse(JSON.stringify({ scrap: s.scrap, abilLv: s.abilLv }));
    expect(copia).toEqual({ scrap: 18250, abilLv: { bombardeo: 5, escudo: 3, emp: 3, lenta: 2, turbo: 2 } });
    // Con PRUEBAS el juego sube tornillos a 99999 y a nivel 1 lo no comprado; el guardado resultante no debe romper parseSave
    const probado = { ...s, scrap: Math.max(s.scrap, 99999), abilLv: { ...s.abilLv, lenta: s.abilLv.lenta || 1 } };
    expect(parseSave(JSON.stringify(probado), D, deps).scrap).toBe(99999);
  });
});
