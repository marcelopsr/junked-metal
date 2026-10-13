// scripts/dps.mjs replica las fórmulas de las armas: si cambia una fórmula en src/weapons o en el script, esto falla.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import raw from "../src/balance.json";
import { cant as cantJuego, Weapon, type Ctx } from "../src/weapons/base";
// @ts-expect-error script .mjs sin tipos
import { MODELOS, calcular, cant, dano, recarga, recDiv, recorte, SUP } from "../scripts/dps.mjs";

const W = Object.fromEntries(raw.armas.map((w) => [w.id, w])) as Record<string, (typeof raw.armas)[number]>;
class Prueba extends Weapon { update(_c: Ctx) {} }
const src = (id: string) => readFileSync(new URL(`../src/weapons/${id}.ts`, import.meta.url), "utf8");

describe("dps.mjs: fórmulas base iguales a weapons/base.ts", () => {
  it("dano, recarga y cant coinciden con la clase Weapon para varias armas y niveles", () => {
    for (const id of ["gomitas", "petardos", "tesla", "bengalas", "lapices", "jabon"]) for (let lv = 1; lv <= 5; lv++) {
      const w = new Prueba("gomitas"); w.lv = lv;
      expect(dano(W[id], lv)).toBe(w.dano(W[id]));
      expect(recarga(W[id], lv)).toBe(w.recarga(W[id]));
      expect(cant(W[id], lv)).toBe(cantJuego(W[id], lv));
    }
  });
});

describe("dps.mjs: fórmulas por arma (fijadas contra el código)", () => {
  // Fragmentos del código del que depende cada modelo: si el arma cambia su fórmula, hay que revisar el modelo.
  const contrato: Record<string, string[]> = {
    gomitas: ["(cfg.recarga_base * c.st.cooldown) / (1 + cfg.recarga_div * (this.lv - 1)) / (this.evolved ? cfg.recarga_evo_div : 1)", "this.evolved ? cfg.n_evo : cant(cfg, this.lv)", "this.dano(cfg) * c.st.dmg * (this.evolved ? cfg.dano_evo_mult : 1)"],
    petardos: ["this.recarga(cfg) * c.st.cooldown", "(cfg.area_base + cfg.area_nivel * this.lv) * c.st.area, dmg = this.dano(cfg) * c.st.dmg", "dmg * X.petardos_racimo_dano"],
    tesla: ["this.evolved ? cfg.n_evo : cant(cfg, this.lv)", "(this.evolved ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown"],
    bengalas: ["(ev ? cfg.dano_evo_fijo : this.dano(cfg)) * c.st.dmg", "life = ev ? cfg.duracion_evo : cfg.duracion_base + cfg.duracion_nivel * this.lv"],
    chispero: ["(this.evolved ? cfg.dano_evo_fijo : this.dano(cfg)) * c.st.dmg", "this.t = X.chispero_intervalo_s"],
    agua: ["this.tick = X.agua_pulso_s", "this.spray <= 0 && (this.cd -= c.dt) <= 0"],
    lapices: ["(ev ? cfg.recarga_evo : this.recarga(cfg)) * c.st.cooldown", "this.dano(cfg) * c.st.dmg * (ev ? cfg.dano_evo_mult : 1)", "X.lapices_trazos_max"],
    teledirigido: ["maxHits = ev ? X.tele_golpes_evo : X.tele_golpes", "dmg * X.tele_explosion_mult"],
  };
  it("el código de cada arma todavía tiene la fórmula modelada", () => {
    for (const [id, frags] of Object.entries(contrato)) for (const f of frags) expect(src(id), `${id}: ${f}`).toContain(f);
  });

  it("casos a mano: armas sin geometría (1 blanco) dan dano × proyectiles × acierto / recarga", () => {
    const g = W.gomitas, a = SUP.ACIERTO.dirigido;
    expect(recDiv(g, 3, false)).toBeCloseTo(g.recarga_base / (1 + g.recarga_div * 2));
    expect(MODELOS.gomitas.f(g, 3, false)).toBeCloseTo((dano(g, 3) * cant(g, 3) * a) / recDiv(g, 3, false));
    expect(MODELOS.gomitas.f(g, 5, true)).toBeCloseTo((dano(g, 5) * g.dano_evo_mult * g.n_evo * 4 * a) / recDiv(g, 5, true)); // 1 + 3 rebotes
    const d = W.dron;
    expect(MODELOS.dron.f(d, 2, false)).toBeCloseTo((dano(d, 2) * d.n_base * a) / recarga(d, 2));
    const t = W.teledirigido;
    expect(MODELOS.teledirigido.f(t, 4, false)).toBeCloseTo((cant(t, 4) * 2 * dano(t, 4) * a) / recarga(t, 4));
  });

  it("toda arma de balance.json tiene modelo o figura como 'sin modelo'", () => {
    const r = calcular();
    expect(r.length).toBe(raw.armas.length);
    for (const x of r) expect(x.sinModelo ?? x.max, x.id).toBeTruthy();
    expect(calcular([{ ...W.gomitas, id: "inventada" }])[0].sinModelo).toMatch(/sin modelo/);
  });

  it("recorte baja el DPS de nivel máximo el porcentaje pedido sin tocar dano_base", () => {
    const r = recorte(W.petardos, 30);
    expect(r.despues / r.antes).toBeCloseTo(0.7, 1);
    expect(r.dano_nivel).toBeLessThan(W.petardos.dano_nivel);
  });
});
