import { describe, expect, it, vi } from "vitest";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";

// moon.ts arma mallas con models/render (DOM y WebGL): acá solo importa la matemática de la esfera
vi.mock("../src/models", () => ({ sph: () => null, template: () => null }));
vi.mock("../src/render", () => ({ canvasTex: () => null, pbr: () => null, shadows: null, surface: () => null }));
const L = await import("../src/moon");
const { MOON, CENTER } = L;

describe("luna: ayudantes", () => {
  it("en el patio hacen la cuenta plana de siempre (bit a bit)", () => {
    MOON.on = false;
    const a = new Vector3(3.1, 0.4, -7.7), b = new Vector3(-2.2, 1.3, 5.9);
    expect(L.hd(a, b)).toBe(Math.hypot(a.x - b.x, a.z - b.z));
    expect(L.at(a, 1.5, 0.4, -2).asArray()).toEqual([a.x + 1.5, a.y + 0.4, a.z + -2]);
    expect(L.yawTo(a, b)).toBe(Math.atan2(b.x - a.x, b.z - a.z));
    const p = Vector3.Lerp(a, b, 0.3); p.y += Math.sin(Math.PI * 0.3) * 5;
    expect(L.arc(a, b, 0.3, 5).asArray()).toEqual(p.asArray());
    expect(L.hflat(b.clone(), a).y).toBe(0);
    expect(L.W(1, 2, 3, a).asArray()).toEqual([1, 2, 3]);
  });
  it("en la luna se mueven sobre la esfera y la deformación cambia el piso", () => {
    MOON.on = true;
    const top = new Vector3(0, 0.5, 0), r0 = Vector3.Distance(top, CENTER);
    const q = L.at(top, 10, 0, 0);
    expect(Vector3.Distance(q, CENTER)).toBeCloseTo(r0, 6); // conserva la altura
    expect(Math.acos(Vector3.Dot(q.subtract(CENTER).normalize(), top.subtract(CENTER).normalize())) * r0).toBeCloseTo(10, 4); // 10 m por la superficie
    expect(L.hd(top, q)).toBeCloseTo(10, 0);
    const pos = top.clone(), dir = new Vector3(0, 0, 1);
    for (let i = 0; i < 200; i++) L.advance(pos, dir, 1); // 200 m: más de media vuelta
    expect(Vector3.Distance(pos, CENTER)).toBeCloseTo(r0, 4);
    expect(Math.abs(Vector3.Dot(dir, L.upAt(pos)))).toBeLessThan(1e-6); // la dirección sigue tangente
    const d = new Vector3(0.3, 0.8, -0.5).normalize(), h0 = L.heightAt(d);
    L.deform(d.scale(MOON.R).add(CENTER), 6, 2.5);
    expect(L.heightAt(d)).toBeCloseTo(h0 - 2.5, 2); // cráter: el centro baja lo pedido
    L.moonReset();
    expect(L.heightAt(d)).toBeCloseTo(h0, 9);
    MOON.on = false;
  });
});
