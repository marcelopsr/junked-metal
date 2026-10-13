// scripts/oleadas.mjs replica spawnTable, el ritmo de aparición, la dureza de vida y el daño por contacto: si cambia una fórmula del juego, esto falla.
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import raw from "../src/balance.json";
// @ts-expect-error script .mjs sin tipos
import { ATK, BUILDS, KITCHEN_SPAWN, R, aporte, ataque, dpsBuild, estadoBuild, kitchenPlague, mulDanoRecibido, oleada, plagueOf, simular, tablaSpawn, vidaEfectiva } from "../scripts/oleadas.mjs";

vi.stubGlobal("location", { search: "?mute" });
vi.stubGlobal("matchMedia", () => ({ matches: false }));
const { spawnTable } = await import("../src/enemies");
const src = (f: string) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const ids = (raw.plagas as { id: string }[]).map((p) => p.id);

describe("vida efectiva", () => {
  it("hormiga: vida × dureza_vida a t=0, igual que test/stats.test.ts (gomita nv1 mata en 3 impactos)", () => {
    const hp = vidaEfectiva("hormiga", 0), g = raw.armas.find((w) => w.id === "gomitas")!;
    expect(hp).toBe(raw.enemigos.find((e) => e.id === "hormiga")!.vida * R.dureza_vida);
    expect(hp).toBe(22);
    const hit = g.dano_base + g.dano_nivel;
    expect(hit * 2).toBeLessThan(hp);
    expect(hit * 3).toBeGreaterThanOrEqual(hp);
  });
  it("escala con el tiempo: ×(1 + t/vida_escala_seg)", () => {
    expect(vidaEfectiva("hormiga", 200)).toBeCloseTo(22 * 2);
    expect(vidaEfectiva("escarabajo", 300)).toBeCloseTo(450);
  });
  it("el escudero recibe menos daño por la placa y el divisor suma la vida de sus crías", () => {
    expect(mulDanoRecibido("escudo")).toBeCloseTo(0.7 * ATK.escudo_blindaje + 0.3);
    expect(aporte("divisor", 0).hp).toBeCloseTo(vidaEfectiva("divisor", 0) + ATK.divisor_crias * vidaEfectiva("cria", 0));
  });
});

describe("tabla de aparición", () => {
  it("pesos en el minuto 2 (t=120): base + minuto × peso_por_min, solo lo ya llegado", () => {
    const w = Object.fromEntries(tablaSpawn(120)) as Record<string, number>;
    expect(w).toMatchObject({ hormiga: 10, friccion: 6, escupidora: 2.2, robot: 3.2, mosca: 3, grillo: 2, kamikaze: 1.8 });
    expect(w.escarabajo).toBeUndefined(); expect(w.polilla).toBeUndefined(); expect(w.babosa).toBeUndefined();
  });
  it("coincide con spawnTable() del juego (con y sin plaga, cocina incluida)", () => {
    for (const t of [0, 45, 90, 150, 240, 330, 480, 600]) for (const id of [undefined, ...ids]) {
      const p = id ? plagueOf(id) : undefined;
      expect(tablaSpawn(t, p)).toEqual(spawnTable(t, p));
      expect(tablaSpawn(t, kitchenPlague(p))).toEqual(spawnTable(t, kitchenPlague(p)));
    }
  });
  it("KITCHEN_SPAWN del script es el de zones/cocina.ts", () => {
    const lit = /KITCHEN_SPAWN[^=]*=\s*(\{[^}]*\})/.exec(src("zones/cocina.ts"))![1];
    expect(KITCHEN_SPAWN).toEqual(new Function(`return (${lit})`)());
  });
});

describe("ritmo de aparición y daño", () => {
  it("bichos/s y tope de vivos: fórmulas de run_drive.ts", () => {
    const o = oleada(300, "patio", null, 100);
    expect(o.rate).toBeCloseTo((R.spawn_base + 300 / R.spawn_seg) * R.dureza_cantidad);
    expect(o.tope).toBeCloseTo((R.tope_vivos_base + 300 / R.tope_vivos_seg) * R.dureza_cantidad);
    expect(oleada(300, "luna", null, 100).rate).toBeCloseTo(o.rate * R.luna_aparicion_mult);
  });
  it("contacto: dano × contacto_dano × dureza_dano / contacto_recarga_s (hormiga = 9,6/s)", () => {
    expect(ataque("hormiga").dpsContacto).toBeCloseTo(9.6);
    expect(ataque("escupidora").dpsDist).toBeCloseTo((ATK.acido_dano * 0.35) / ATK.escupidora_cada_s);
  });
  it("las fórmulas fijadas siguen en el código del juego", () => {
    expect(src("run_drive.ts")).toContain("(R.spawn_base + tp / R.spawn_seg) * wdt * hordeK * D.TOUGH.count");
    expect(src("run_drive.ts")).toContain("Math.min(D.low ? R.tope_vivos_tactil : R.tope_vivos_pc, (R.tope_vivos_base + tp / R.tope_vivos_seg) * hordeK * D.TOUGH.count");
    expect(src("main.ts")).toContain("(1 + (run.time + paceS) / R.vida_escala_seg) * TOUGH.hp");
    expect(src("run_tick.ts")).toContain("e.def.dmg * R.contacto_dano * (e.def.boss ? 1 : T.TOUGH.dmg)");
    expect(src("enemies.ts")).toContain("e.peso_base + m * e.peso_por_min");
    expect(src("combat.ts")).toContain("dmg *= ATK.escudo_blindaje");
    expect(src("progression.ts")).toContain("run.xp += n * c.st.xp * run.driveMul * early");
  });
});

describe("builds y margen", () => {
  it("el build parte de Gomitas nv1 y suma cartas; el DPS no baja al subir de nivel", () => {
    expect(estadoBuild(BUILDS.foco, 1)).toEqual({ gomitas: { lv: 1, ev: false } });
    let prev = 0;
    for (let l = 1; l <= 40; l++) { const d = dpsBuild(BUILDS.foco, l); expect(d).toBeGreaterThanOrEqual(prev - 1e-9); prev = d; }
  });
  it("simular: margen finito y positivo cada minuto, niveles que no bajan", () => {
    const f = simular(BUILDS.mixto, "patio", null, 600);
    expect(f).toHaveLength(10);
    f.forEach((r: { margen: number; nivel: number }, i: number) => { expect(r.margen).toBeGreaterThan(0); expect(Number.isFinite(r.margen)).toBe(true); if (i) expect(r.nivel).toBeGreaterThanOrEqual(f[i - 1].nivel); });
  });
});
