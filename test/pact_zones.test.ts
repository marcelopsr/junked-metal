import { describe, expect, it, vi } from "vitest";

// El dibujo (mallas, materiales) no importa acá: se prueba la colocación, el ciclo y los efectos
const inst = () => ({ isPickable: true, position: { set: () => {} }, scaling: { set: () => {} }, setEnabled: () => {}, dispose: () => {} });
vi.mock("../src/models", () => ({ box: () => null, cyl: () => null, tor: () => null, hazardMat: () => null, scene: null, template: () => ({ createInstance: inst }) }));
vi.mock("../src/render", () => ({ pbr: () => ({}), shadows: { removeShadowCaster: () => {} } }));
const Z = await import("../src/pact_zones");
const { BAL } = await import("../src/balance");

const ALL = ["maquillaje", "cobro", "sorpresa", "blindaje", "patrocinio", "nocturno"];
const ctx = (seed = 3, pacts = ALL) => ({ seed, loop: 0, stage: 1, pacts, avoid: [{ x: 0, z: 0 }] });
const run = (c: ReturnType<typeof ctx>, secs: number, car = { x: 0, z: 40 }) => { Z.zonesInit(c); const spawns: unknown[] = []; let max = 0; for (let t = 0; t < secs; t += 0.5) { spawns.push(...Z.zonesTick(0.5, car).spawns); max = Math.max(max, Z.zonesInfo().length); } return { spawns, max }; };

describe("zonas de pacto", () => {
  it("la tabla cubre los 6 pactos y cada pacto crea sus zonas", () => {
    expect(Z.zonasDe(ALL).map((d) => d.id)).toEqual(["camerino", "iman", "foco", "pegamento", "cables", "trampilla"]);
    expect(Z.zonasDe(["maquillaje", "ensayo"]).map((d) => d.id)).toEqual(["camerino"]);
    expect(Z.zonasDe([])).toEqual([]);
  });

  it("la colocación es determinista, cae a 14-30 m del auto y lejos de la salida; cambia con semilla y escenario", () => {
    const d = BAL.pactosZonas.cables, car = { x: 100, z: 100 };
    const at = (seed: number, stage = 1) => Z.zonaLugar({ ...ctx(seed), stage }, d, 4, 0, 0, car, [])!;
    expect(at(5)).toEqual(at(5));
    expect(at(5)).not.toEqual(at(6));
    expect(at(5)).not.toEqual(at(5, 2));
    for (let s = 1; s <= 30; s++) { const p = at(s), r = Math.hypot(p.x - car.x, p.z - car.z); expect(r).toBeGreaterThanOrEqual(BAL.ritmo.zona_dist_min - 1e-6); expect(r).toBeLessThanOrEqual(BAL.ritmo.zona_dist_max + 1e-6); }
    const cerca = Z.zonaLugar({ ...ctx(5), avoid: [{ x: 100, z: 120 }] }, d, 4, 0, 0, car, []);
    if (cerca) expect(Math.hypot(cerca.x - 100, cerca.z - 120)).toBeGreaterThanOrEqual(BAL.ritmo.zona_libre_m);
  });

  it("la de beneficio aparece cerca de la de riesgo (borde a borde ≤ zona_premio_cerca) y sin pisarla", () => {
    const riesgo = { x: 50, z: 50, r: BAL.pactosZonas.cables.radio, risk: true }, d = BAL.pactosZonas.camerino;
    for (let n = 0; n < 20; n++) {
      const p = Z.zonaLugar({ ...ctx(n + 1), avoid: [] }, d, 0, 0, n, { x: 0, z: 0 }, [riesgo]);
      if (!p) continue;
      const gap = Math.hypot(p.x - 50, p.z - 50) - riesgo.r - d.radio;
      expect(gap).toBeGreaterThanOrEqual(0); expect(gap).toBeLessThanOrEqual(BAL.ritmo.zona_premio_cerca);
    }
  });

  it("nunca hay más zonas visibles que zona_tope y las de riesgo duran todo el escenario", () => {
    const { max } = run(ctx(), 200);
    expect(max).toBeLessThanOrEqual(BAL.ritmo.zona_tope);
    expect(Z.zonesInfo().filter((z) => ["pegamento", "cables"].includes(z.id))).toHaveLength(4); // 2 + 2, no se cierran
    Z.zonesDispose();
  });

  it("aviso de 2 s: sin efecto mientras el aro crece, luego sí; la zona desaparece y reaparece en otro sitio", () => {
    Z.zonesInit(ctx(3, ["maquillaje"]));
    let r = Z.zonesTick(0.5, { x: 0, z: 40 });
    const z0 = Z.zonesInfo()[0];
    expect(z0).toMatchObject({ id: "camerino", active: false });
    expect(Z.zonaEn(z0.x, z0.z).regen).toBe(0); // en aviso no cura
    for (let t = 0; t < BAL.ritmo.zona_aviso_s; t += 0.5) r = Z.zonesTick(0.5, { x: z0.x, z: z0.z });
    expect(r.regen).toBe(BAL.pactosZonas.camerino.valor);
    expect(Z.zonaEn(z0.x + 10, z0.z).regen).toBe(0); // fuera del radio
    for (let t = 0; t < BAL.pactosZonas.camerino.dura; t += 0.5) Z.zonesTick(0.5, { x: 0, z: 40 });
    expect(Z.zonesInfo()).toHaveLength(0); // cerrada
    for (let t = 0; t < BAL.pactosZonas.camerino.pausa + 1; t += 0.5) Z.zonesTick(0.5, { x: 0, z: 40 });
    const z1 = Z.zonesInfo()[0];
    expect(z1).toBeDefined();
    expect(z1).not.toMatchObject({ x: z0.x, z: z0.z });
    Z.zonesDispose();
  });

  it("efectos: cada zona suma lo suyo y las superpuestas se combinan", () => {
    const z = (id: string) => [{ id, x: 0, z: 0, r: 5 }];
    expect(Z.zonaFx(z("cables"), 0, 0).dps).toBe(8);
    expect(Z.zonaFx(z("pegamento"), 1, 1).speedMul).toBe(0.6);
    expect(Z.zonaFx(z("foco"), 0, 0).xpMul).toBe(2);
    expect(Z.zonaFx(z("iman"), 0, 0)).toMatchObject({ magnetMul: 3, scrapMul: BAL.ritmo.zona_iman_tornillos });
    expect(Z.zonaFx(z("cables"), 9, 0)).toEqual(Z.NO_ZONE);
    expect(Z.zonaFx([...z("cables"), ...z("cables")], 0, 0).dps).toBe(16);
  });

  it("la trampilla escupe bichos cada trampilla_cada_s mientras está abierta y no más", () => {
    const { spawns } = run(ctx(3, ["nocturno"]), 40);
    const d = BAL.pactosZonas.trampilla;
    expect(spawns.length).toBeGreaterThanOrEqual(3);
    expect(spawns.length).toBeLessThanOrEqual(Math.ceil(d.dura / BAL.ritmo.trampilla_cada_s) + 1);
    expect(spawns[0]).toMatchObject({ n: d.valor });
    Z.zonesDispose();
  });

  it("zonesDispose deja todo en cero y zonesTick sin init no hace nada", () => {
    run(ctx(), 10); Z.zonesDispose();
    expect(Z.zonesInfo()).toHaveLength(0);
    expect(Z.zonesTick(1, { x: 0, z: 0 })).toMatchObject({ ...Z.NO_ZONE, spawns: [], sparks: [] });
  });
});
