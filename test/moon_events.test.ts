import { describe, expect, it, vi } from "vitest";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";

// moon_events.ts toca mallas, partículas, audio y HUD: acá solo importa el ritmo del evento, el daño y que el tinte rojo sea reversible
vi.mock("../src/models", () => ({ sph: () => null, template: () => null, tor: () => null }));
vi.mock("../src/render", () => ({ canvasTex: () => null, pbr: () => null, shadows: null, surface: () => null, applyClimate: () => {} }));
vi.mock("../src/fx", () => ({ burst: () => {}, debris: () => {}, FX: {}, mark: () => {} }));
vi.mock("../src/sfx", () => ({ SPACE: { lava: () => {} }, moonAmbience: () => {} }));
vi.mock("../src/ui", () => ({ banner: () => {} }));
const L = await import("../src/moon");
const E = await import("../src/moon_events");
const clima = { sun: [0, -1, 0], sunColor: "#fff3df", sunI: 4, hemiI: 0.3, sky: ["#000000", "#020306", "#04060c", "#000000"], exposure: 1, fog: 0.02, ramp: ["#000000", "#808080", "#ffffff"], amb: "#4a5470", ground: "#4a5470" } as Parameters<typeof E.evClimate>[0];

describe("luna: eventos", () => {
  it("la lluvia hace daño, deja cráteres, tiñe de rojo y al terminar el clima vuelve igual", () => {
    L.MOON.on = true;
    const hurts: string[] = [], blasts: string[] = [];
    E.evInit({ hurt: (_n, _c, src) => hurts.push(src), blast: (_p, _r, _d, src) => blasts.push(src), shake: () => {}, sim: () => true });
    const car = new Vector3(0, 0.9, 0), h0 = L.heightAt(new Vector3(0, 1, 0));
    E.lunaDev.meteors(16);
    let maxTint = 0;
    for (let i = 0; i < 60 * 14; i++) { E.lunaEv(1 / 60, 50 + i / 60, car, 1, 0); maxTint = Math.max(maxTint, E.evClimate(clima).fog / clima.fog - 1); }
    const fell = blasts.filter((b) => b === "meteoritos").length;
    expect(fell).toBeGreaterThanOrEqual(16); expect(fell).toBeLessThanOrEqual(17); // cada meteorito cae una vez
    expect(maxTint).toBeGreaterThan(0.25); // el tinte llegó a rojo pleno (fog × 1,3)
    expect(E.evClimate(clima)).toBe(clima); // y volvió: mismo objeto, sin tinte
    expect(L.heightAt(new Vector3(0, 1, 0))).not.toBe(h0); // los cráteres cambiaron el piso
    L.moonReset(); L.MOON.on = false;
  });
  it("la erupción se abre tras el aviso, quema solo dentro de la zona y termina", () => {
    L.MOON.on = true;
    const hurts: { n: number; at: number }[] = [];
    let t = 0;
    E.evInit({ hurt: (n) => hurts.push({ n, at: t }), blast: () => {}, shake: () => {}, sim: () => true });
    const away = new Vector3(0, 0.9, 0);
    E.lunaDev.erupt(away, 0);
    const C = E.lunaDev.zone()!.C, inside = L.onFloor(C, 1);
    for (; t < 40; t += 1 / 60) E.lunaEv(1 / 60, 50 + t, t < 6 ? away : inside, 1, 0); // 0-6 s lejos, después encima de la falla
    expect(hurts.length).toBeGreaterThan(0);
    expect(hurts.every((h) => h.at >= 6)).toBe(true); // lejos no quema
    expect(E.lunaDev.zone()).toBeNull(); // terminó
    expect(hurts[hurts.length - 1].at).toBeLessThan(0.2 + 12 + 3 + 0.3); // y dejó de quemar al enfriarse
    E.evReset(); L.moonReset(); L.MOON.on = false;
  });
  it("en 10 minutos hay varias lluvias y erupciones, y nunca a la vez", () => {
    L.MOON.on = true;
    const rains: number[] = [], quakes: number[] = [];
    let t = 0, overlap = 0;
    E.evInit({ hurt: () => {}, blast: (_p, _r, _d, src) => { (src === "meteoritos" ? rains : quakes).push(t); if (src === "meteoritos" && E.lunaDev.zone()) overlap++; }, shake: () => {}, sim: () => true });
    E.evReset();
    const car = new Vector3(0, 0.9, 0);
    for (; t < 600; t += 1 / 30) E.lunaEv(1 / 30, t, car, 1, 0);
    const groups = (a: number[]) => a.filter((x, i) => i === 0 || x - a[i - 1] > 20).length; // saltos de más de 20 s = otro evento
    expect(groups(rains)).toBeGreaterThanOrEqual(3);
    expect(groups(quakes)).toBeGreaterThanOrEqual(3);
    expect(overlap).toBe(0);
    E.evReset(); L.moonReset(); L.MOON.on = false;
  });
  it("panTo en el patio es la cuenta plana de siempre", () => {
    L.MOON.on = false;
    const a = new Vector3(1, 0, 2), b = new Vector3(5, 0, -3), yaw = 0.7;
    expect(E.panTo(a, b, yaw)).toBeCloseTo(Math.max(-1, Math.min(1, ((b.x - a.x) * Math.cos(yaw) - (b.z - a.z) * Math.sin(yaw)) / 8)), 9);
  });
});
