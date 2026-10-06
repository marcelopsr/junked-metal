// Materiales y colores por zona (GDD §34); persistencia local, sin tocar Save del survivor.
import * as B from "@babylonjs/core";
import { canvasTex, pbr } from "./render";

export type MatPreset = "metal" | "plastic" | "gloss" | "rust";
export type PaintSlot = "chassis_body" | "chassis_trim" | "wheel_tire" | "wheel_rim" | "weapon_body" | "weapon_edge";
export type ZonePaint = { preset: MatPreset; color: string };
export type DuelPaintState = { name: string; zones: Record<PaintSlot, ZonePaint> };

const STORAGE = "duel_paint";

export const PAINT_SLOTS: PaintSlot[] = ["chassis_body", "chassis_trim", "wheel_tire", "wheel_rim", "weapon_body", "weapon_edge"];
export const SLOT_LABEL: Record<PaintSlot, string> = {
  chassis_body: "Chasis cuerpo",
  chassis_trim: "Chasis detalle",
  wheel_tire: "Goma / oruga",
  wheel_rim: "Disco llanta",
  weapon_body: "Arma cuerpo",
  weapon_edge: "Arma filo",
};
export const PRESET_LABEL: Record<MatPreset, string> = { metal: "Metal", plastic: "Plástico", gloss: "Pintura", rust: "Óxido" };
export const PRESETS: MatPreset[] = ["metal", "plastic", "gloss", "rust"];
export const SWATCHES = ["#d62828", "#1d4ed8", "#2a9d8f", "#e85d04", "#4a5058", "#e5e7eb", "#ffc300", "#6b7a3a"];

const DEFAULT: DuelPaintState = {
  name: "RC-01",
  zones: {
    chassis_body: { preset: "gloss", color: "#4a5058" },
    chassis_trim: { preset: "metal", color: "#e85d04" },
    wheel_tire: { preset: "plastic", color: "#1c1c1c" },
    wheel_rim: { preset: "metal", color: "#c0c0c0" },
    weapon_body: { preset: "metal", color: "#888888" },
    weapon_edge: { preset: "metal", color: "#cccccc" },
  },
};

function validZone(z: unknown): ZonePaint | null {
  if (!z || typeof z !== "object") return null;
  const o = z as Record<string, unknown>;
  if (!PRESETS.includes(o.preset as MatPreset)) return null;
  if (typeof o.color !== "string" || !/^#[0-9a-f]{6}$/i.test(o.color)) return null;
  return { preset: o.preset as MatPreset, color: o.color.toLowerCase() };
}

export function loadDuelPaint(): DuelPaintState {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return { ...DEFAULT, zones: { ...DEFAULT.zones } };
    const j = JSON.parse(raw) as { name?: string; zones?: Record<string, unknown> };
    const zones = { ...DEFAULT.zones };
    for (const k of PAINT_SLOTS) {
      const v = validZone(j.zones?.[k]);
      if (v) zones[k] = v;
    }
    const name = typeof j.name === "string" && j.name.length <= 24 ? j.name : DEFAULT.name;
    return { name, zones };
  } catch {
    return { ...DEFAULT, zones: { ...DEFAULT.zones } };
  }
}

export function saveDuelPaint(s: DuelPaintState) {
  localStorage.setItem(STORAGE, JSON.stringify(s));
}

const matCache = new Map<string, B.PBRMaterial>();

export function duelMat(z: ZonePaint): B.PBRMaterial {
  const key = `${z.preset}|${z.color}`;
  let m = matCache.get(key);
  if (m) return m;
  const { preset, color } = z;
  if (preset === "metal") {
    const tex = canvasTex(64, (g, s) => {
      g.fillStyle = color; g.fillRect(0, 0, s, s);
      for (let i = 0; i < s; i += 3) { g.strokeStyle = "rgba(255,255,255,0.07)"; g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.stroke(); }
    }, 2);
    m = pbr("duelMe" + key, { color, rough: 0.32, metal: 1, tex });
  } else if (preset === "plastic") {
    const tex = canvasTex(48, (g, s) => {
      g.fillStyle = color; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 180; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.07})`; g.fillRect(Math.random() * s, Math.random() * s, 1, 1); }
    }, 3);
    m = pbr("duelPl" + key, { color, rough: 0.78, coat: 0.35, tex });
  } else if (preset === "gloss") {
    m = pbr("duelGl" + key, { color, rough: 0.2, metal: 0.3, coat: 0.88 });
  } else {
    const tex = canvasTex(64, (g, s) => {
      g.fillStyle = color; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 35; i++) { g.fillStyle = "#6b3e2a"; g.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 5, 2); }
    }, 2);
    m = pbr("duelRu" + key, { color, rough: 0.92, metal: 0.45, tex });
  }
  matCache.set(key, m);
  return m;
}

export function rivalPaintFromBalance(r: { cuerpo_color: string; bandas_color: string; pala_color: string }): DuelPaintState {
  return {
    name: r.cuerpo_color,
    zones: {
      chassis_body: { preset: "rust", color: r.cuerpo_color.toLowerCase() },
      chassis_trim: { preset: "gloss", color: r.bandas_color.toLowerCase() },
      wheel_tire: { preset: "plastic", color: "#141414" },
      wheel_rim: { preset: "metal", color: "#555555" },
      weapon_body: { preset: "metal", color: r.pala_color.toLowerCase() },
      weapon_edge: { preset: "metal", color: "#b0b5bc" },
    },
  };
}

export function cyclePreset(z: ZonePaint, dir: 1 | -1): ZonePaint {
  const i = PRESETS.indexOf(z.preset);
  return { ...z, preset: PRESETS[(i + dir + PRESETS.length) % PRESETS.length] };
}

export function cycleColor(z: ZonePaint, dir: 1 | -1): ZonePaint {
  const i = SWATCHES.indexOf(z.color);
  const next = i < 0 ? 0 : (i + dir + SWATCHES.length) % SWATCHES.length;
  return { ...z, color: SWATCHES[next] };
}
