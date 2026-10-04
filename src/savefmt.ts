// Lectura y validación del guardado (localStorage "rcfight2"), sin DOM ni motor: menu.ts le pasa lo que depende del juego (listas válidas, calcos, presets)
// y los tests (test/save.test.ts) lo prueban solo. Un guardado viejo, editado a mano o importado nunca debe romper el arranque ni el render.
import type { Save } from "./menu";

/** Lo que `sanitize` necesita saber del juego: qué ids son válidos y cómo validar calcos y presets. */
export type SaveDeps = {
  abilities: object; curses: object; kinds: string[]; zones: object; isTouch: boolean;
  validDecal: (d: unknown) => boolean;
  presetOf: (o: { shadowQ: Save["shadowQ"]; detail: Save["detail"]; texRes: number; aniso: number; bloom: boolean }) => Save["preset"];
  presets: Record<string, object>;
};

/** `raw` = texto guardado (o null) -> Save completo: lo ausente o inválido toma el valor de `D`; JSON roto devuelve `D` entero. */
export function parseSave(raw: string | null, D: Save, deps: SaveDeps): Save {
  try {
    const s = JSON.parse(raw ?? "{}");
    for (const k of ["seen", "runs", "cars", "unlocked", "ach"] as const) if (k in s && !Array.isArray(s[k])) delete s[k]; // import malformado: se ignora el campo
    if (typeof s.keys !== "object" || !s.keys) delete s.keys;
    if (!(s.ability in deps.abilities)) delete s.ability;
    s.curses = Array.isArray(s.curses) ? s.curses.filter((c: string) => c in deps.curses) : [];
    if (typeof s.stats !== "object" || !s.stats) delete s.stats;
    // Registro por bicho: solo tipos conocidos, números finitos y zonas que existen
    const beast: Save["beast"] = {};
    for (const k of deps.kinds as (keyof Save["beast"])[]) {
      const b = s.beast?.[k];
      if (!b || typeof b !== "object") continue;
      beast[k] = { first: typeof b.first === "string" && /^\d{4}-\d\d-\d\d$/.test(b.first) ? b.first : undefined, hurt: Number.isFinite(b.hurt) && b.hurt > 0 ? b.hurt : 0,
        by: Object.fromEntries(Object.entries(typeof b.by === "object" && b.by ? b.by : {}).filter(([, v]) => Number.isFinite(v) && (v as number) > 0)) as Record<string, number>,
        zones: Array.isArray(b.zones) ? b.zones.filter((z: string) => z in deps.zones) : [] };
    }
    s.beast = beast;
    // Calcos: siempre 3 ranuras y solo diseños válidos; el aplicado debe apuntar a una ranura con diseño
    const decals = [0, 1, 2].map((i) => (deps.validDecal(s.decals?.[i]) ? s.decals[i] : ""));
    const decalSel = Number.isInteger(s.decalSel) && decals[s.decalSel] ? s.decalSel : -1;
    if (s.lookv !== 6) { s.aa = "none"; delete s.outline; delete s.clean; delete s.retro; delete s.visual; s.lookv = 6; } // estilo cartoon fijo: sin contorno ni looks retro (una vez)
    // Imagen v1 (una vez): la vieja "Calidad" (solo resolución, con Auto) y el interruptor de sombras se reemplazan por Escala/FSR y Sombras por niveles; en táctil FXAA era el mínimo forzado
    if (s.gfxv !== 1) { if (s.shadows === false) s.shadowQ = "off"; if (deps.isTouch && (s.aa ?? "none") === "none") s.aa = "fxaa"; delete s.quality; delete s.shadows; s.gfxv = 1; }
    // Imagen v2 (una vez): "Escalado" Simple/FSR con el modo aparte, una sola nitidez (la de FSR si estaba activo) y el bloom dentro del preajuste.
    // Quien estaba en un preajuste pasa al mismo preajuste con sus valores nuevos (sombras y texturas cambiaron de escala).
    if (s.gfxv !== 2) {
      const on = typeof s.fsr === "string" && s.fsr !== "off";
      s.scaler = on ? "fsr" : "simple"; if (!on) delete s.fsr;
      if (on && typeof s.fsrSharp === "number") s.sharpen = s.fsrSharp;
      delete s.fsrSharp;
      if (s.preset in deps.presets) Object.assign(s, deps.presets[s.preset]);
      s.gfxv = 2;
    }
    // Valores de imagen: enumerados y rangos se validan (un respaldo viejo o editado a mano no debe romper el render)
    const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
    const one = <T,>(v: unknown, list: readonly T[], d: T): T => ((list as readonly unknown[]).includes(v) ? (v as T) : d);
    s.scale = num(s.scale, 0.5, 1, D.scale); s.sharpen = num(s.sharpen, 0, 1, D.sharpen);
    s.fov = num(s.fov, 40, 70, D.fov); s.bright = num(s.bright, 0.6, 1.4, 1); s.gamma = num(s.gamma, 0.7, 1.4, 1);
    s.scaler = one(s.scaler, ["simple", "fsr"], D.scaler); s.fsr = one(s.fsr, ["ultra", "calidad", "equilibrado", "rendimiento"], D.fsr); if (typeof s.bloom !== "boolean") s.bloom = D.bloom; if (s.aa === "taa") s.aa = "fxaa"; // TAA se quitó: quien lo tenía guardado pasa a FXAA
    s.aa = one(s.aa, ["none", "fxaa", "msaa2", "msaa4", "msaa8"], D.aa);
    s.shadowQ = one(s.shadowQ, ["off", "low", "mid", "high"], D.shadowQ); s.detail = one(s.detail, ["bajo", "medio", "alto", "ultra"], D.detail);
    s.texRes = one(s.texRes, [128, 256, 512], D.texRes); s.aniso = one(s.aniso, [1, 2, 4, 8, 16], D.aniso); s.fpsCap = one(s.fpsCap, [0, 30, 60, 120], 0); s.menuFps = one(s.menuFps, [0, 30, 60], D.menuFps);
    s.preset = deps.presetOf({ shadowQ: s.shadowQ, detail: s.detail, texRes: s.texRes, aniso: s.aniso, bloom: s.bloom });
    return { ...structuredClone(D), ...s, decals, decalSel, perm: { ...D.perm, ...s.perm }, kit: { ...D.kit, ...s.kit }, vol: { ...D.vol, ...s.vol }, pad: { ...D.pad, ...s.pad },
      stats: { ...D.stats, ...s.stats, dmg: { ...s.stats?.dmg }, zone: { ...s.stats?.zone } } };
  } catch { return structuredClone(D); }
}
