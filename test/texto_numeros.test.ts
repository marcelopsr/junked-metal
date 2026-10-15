import { describe, expect, it, vi } from "vitest";
import { BAL } from "../src/balance";
import { PASSIVES } from "../src/weapons/passives";
import { WEAPONS } from "../src/weapons/base";
vi.stubGlobal("location", { search: "?mute" });
vi.stubGlobal("matchMedia", () => ({ matches: false }));
const { PILOTS } = await import("../src/pilots");
import { ABILITIES } from "../src/abilities";

// Los textos con números escritos a mano no pueden desalinearse de balance.json (CLAUDE.md, Balance).
const nums = (s: string) => [...s.matchAll(/\d+(?:,\d+)?/g)].map((m) => Number(m[0].replace(",", ".")));
const pc = (x: number) => Math.round(x * 100);
const P = BAL.pasivas, R = BAL.ritmo, X = BAL.armasExtra;

describe("textos con números = balance.json", () => {
  it("pasivas", () => {
    const esperado: Record<string, number[]> = {
      iman: [pc(P.iman.por_nivel)], resorte: [pc(P.resorte.por_nivel)], turbo: [pc(P.turbo.por_nivel)], litio: [P.litio.por_nivel],
      capacitor: [pc(1 - P.capacitor.por_nivel)], lego: [pc(1 - P.lego.por_nivel)], lupa: [pc(P.lupa.por_nivel)], cinta: [P.cinta.base],
      pila: [pc(P.pila.por_nivel)], llavero: [pc(P.llavero.por_nivel)], antena: [pc(P.antena.por_nivel)], bidon: [pc(P.bidon.por_nivel)],
      llamas: [pc(P.llamas.por_nivel), pc(P.llamas.base2)],
    };
    for (const [id, n] of Object.entries(esperado)) expect(nums(PASSIVES[id as keyof typeof PASSIVES].desc), id).toEqual(n);
  });
  it("armas: cantidades de la evolución y del texto base", () => {
    expect(nums(WEAPONS.lanza.desc)).toEqual([pc(BAL.armas.lanza.dano_nivel)]);
    expect(WEAPONS.petardos.evoDesc).toContain(String(X.petardos_racimo_n));
    expect(WEAPONS.dardos.desc).toContain("tercero"); expect(X.dardos_pegados).toBe(3);
    expect(WEAPONS.dardos.evoDesc).toContain("segundo"); expect(X.dardos_pegados_evo).toBe(2);
    expect(WEAPONS.tambor.desc).toContain("cuarto"); expect(X.tambor_cada).toBe(4);
    expect(WEAPONS.tambor.evoDesc).toContain("tercer"); expect(X.tambor_cada_evo).toBe(3);
    const pal: Record<number, string> = { 2: "dos", 3: "tres", 4: "cuatro", 5: "cinco", 6: "seis", 14: "catorce" };
    const n = { gomitas: 5, bengalas: 6, regla: 3, helado: 3, burbujas: 4, cohete: 4, serpentinas: 3, avioncito: 5, bumeran: 2, dron: 2, chapitas: 14 };
    for (const [id, v] of Object.entries(n)) {
      const t = WEAPONS[id as keyof typeof WEAPONS].evoDesc.toLowerCase();
      expect(BAL.armas[id].n_evo, id).toBe(v);
      expect(t.includes(String(v)) || t.includes(pal[v]), id).toBe(true);
    }
    expect(nums(WEAPONS.clips.evoDesc)[0]).toBe(BAL.armas.clips.n_evo);
    expect(nums(WEAPONS.tesla.evoDesc)[0]).toBe(BAL.armas.tesla.n_evo);
  });
  it("habilidades", () => {
    const cura = pc(R.escudo_cura_s * R.habilidad_escudo_dur);
    expect(nums(ABILITIES.escudo.desc)).toEqual([R.habilidad_escudo_dur, cura]);
    for (const p of Object.values(BAL.pilotos)) {
      const t = nums(p.habilidad_txt);
      if (p.habilidad === "escudo") expect(t, p.id).toEqual([R.habilidad_escudo_dur, cura]);
      if (p.habilidad === "emp") expect(t[0], p.id).toBe(R.emp_aturde_s);
      if (p.habilidad === "lenta") expect(t, p.id).toEqual([pc(R.lenta_mundo), R.habilidad_lenta_dur]);
      if (p.habilidad === "turbo") expect(t[0], p.id).toBe(R.habilidad_turbo_dur);
      if (p.id === "doble") expect(t.slice(1), p.id).toEqual([pc(R.doble_dano_por_pacto), R.doble_pactos_tope]);
    }
  });
  it("pros y contras de pilotos = columnas de la fila", () => {
    for (const row of Object.values(BAL.pilotos)) {
      const pl = PILOTS[row.id as keyof typeof PILOTS];
      const txt = [...pl.pros, pl.con].join(" | ");
      const tiene = (re: RegExp, v: number) => { const m = txt.match(re); if (m) expect(Number(m[1].replace(",", ".")), `${row.id} ${re}`).toBeCloseTo(v, 5); };
      tiene(/(\d+)% daño/, pc(Math.abs(row.dano_mult - 1))); tiene(/(\d+)% imán/, pc(Math.abs(row.iman_mult - 1)));
      tiene(/\+(\d+) vida(?! máx)(?!\/)/, row.vida_mas); tiene(/Regenera \+(\d+(?:,\d+)?) vida/, row.regen_mas);
      tiene(/(\d+)% peso/, pc(row.peso_mult - 1)); tiene(/\+(\d+)% XP/, pc(row.xp_mult - 1));
      tiene(/Armas (\d+)% más/, pc(Math.abs(row.recarga_mult - 1)));
    }
  });
});
