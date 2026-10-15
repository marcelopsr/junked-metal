// Paseo libre: desafíos (inicio, meta, récord, tiempo límite). Lógica pura con recorridos sintéticos.
import { describe, expect, it } from "vitest";
import { BAL } from "../src/balance";
import { chObjetivo, chStep, chTruco, DESAFIOS, fmtMarca, fmtMs, mejora, medalla, fantasmaAt, fantasmaCp, fantasmaDec, fantasmaEnc, fantasmaOk, fmtDif, newBest, newCh, type ChState, type DesafioBest } from "../src/free_challenges";

const [OBS, SKATE] = [DESAFIOS[0], DESAFIOS[1]];
const pasar = (s: ChState, b: DesafioBest) => { for (const c of OBS.cp!) chStep(s, 0, c[0], c[1], b); }; // pasa los puntos de control sin gastar tiempo
describe("desafios", () => {
  it("contrarreloj: inicia en el arco, mide hasta la meta y guarda el récord solo si mejora", () => {
    const s = newCh(), b = newBest();
    expect(chStep(s, 0.1, 0, 0, b)).toBeNull();
    expect(chStep(s, 0.1, OBS.ax, OBS.az, b)?.kind).toBe("inicio");
    for (let i = 0; i < 119; i++) chStep(s, 0.5, 190, -180, b); // 59,5 s en ruta
    pasar(s, b);
    const e = chStep(s, 0.5, OBS.bx!, OBS.bz!, b)!;
    expect(e.kind).toBe("fin"); expect(e.ms).toBe(60000); expect(e.record).toBe(true); expect(b.obs).toBe(60000);
    chStep(s, 0.1, 0, 0, b); chStep(s, 0.1, OBS.ax, OBS.az, b); // segunda vuelta, más lenta
    for (let i = 0; i < 199; i++) chStep(s, 0.5, 190, -180, b);
    pasar(s, b);
    expect(chStep(s, 0.5, OBS.bx!, OBS.bz!, b)!.record).toBe(false); expect(b.obs).toBe(60000);
  });
  it("puntos de control: ir directo a la meta no termina; hay que pasarlos en orden", () => {
    const s = newCh(), b = newBest();
    chStep(s, 0.1, OBS.ax, OBS.az, b);
    expect(chStep(s, 1, OBS.bx!, OBS.bz!, b)).toBeNull(); expect(s.cp).toBe(0); expect(chObjetivo(s)).toMatchObject({ x: OBS.cp![0][0], i: 0, n: 2 });
    const [c1, c2] = OBS.cp!;
    expect(chStep(s, 1, c2[0], c2[1], b)).toBeNull(); // el segundo antes del primero no cuenta
    expect(chStep(s, 1, c1[0], c1[1], b)?.kind).toBe("punto");
    expect(chStep(s, 1, OBS.bx!, OBS.bz!, b)).toBeNull();
    expect(chStep(s, 1, c2[0], c2[1], b)?.kind).toBe("punto");
    expect(chObjetivo(s)).toMatchObject({ x: OBS.bx, z: OBS.bz });
    expect(chStep(s, 1, OBS.bx!, OBS.bz!, b)?.kind).toBe("fin");
  });
  it("medallas: tiempo menor / puntos mayor, umbrales de balance.json", () => {
    const r = BAL.libreMedallas;
    expect(medalla("obs", 0)).toBe(0); expect(medalla("obs", r.obs.oro)).toBe(3); expect(medalla("obs", r.obs.plata)).toBe(2); expect(medalla("obs", r.obs.bronce)).toBe(1); expect(medalla("obs", r.obs.bronce + 1)).toBe(0);
    expect(medalla("skate", r.skate.oro)).toBe(3); expect(medalla("skate", r.skate.bronce - 1)).toBe(0); expect(medalla("vuelta", 2)).toBe(2);
    for (const k of ["obs", "nieve", "skate", "aire", "giro", "vuelta", "salto", "combo"]) expect(r[k].bronce).not.toBe(r[k].oro);
  });
  it("sin salir del arco no se reinicia solo; al salir y volver sí", () => {
    const s = newCh(), b = newBest();
    chStep(s, 0.1, OBS.ax, OBS.az, b); expect(chStep(s, 0.1, OBS.ax, OBS.az, b)).toBeNull();
    chStep(s, 0.1, 0, 0, b); expect(chStep(s, 0.1, OBS.ax, OBS.az, b)?.kind).toBe("inicio");
  });
  it("trucos: suma solo con el desafío activo y cierra a los 60 s", () => {
    const s = newCh(), b = newBest();
    chTruco(s, 500); expect(s.pts).toBe(0);
    chStep(s, 0.1, SKATE.ax, SKATE.az, b); chTruco(s, 300); chTruco(s, 200);
    let e = null;
    for (let t = 0; t < 61 && !e; t++) e = chStep(s, 1, -150, 150, b);
    expect(e).toMatchObject({ kind: "fin", pts: 500, record: true }); expect(b.skate).toBe(500);
  });
  it("pasar directo de un arco a otro cambia de desafío", () => {
    const s = newCh(), b = newBest();
    chStep(s, 0.1, OBS.ax, OBS.az, b); expect(chStep(s, 0.1, SKATE.ax, SKATE.az, b)?.d.id).toBe("skate");
  });
  it("tiempo agotado = fallo sin récord; formatos", () => {
    const s = newCh(), b = newBest();
    chStep(s, 0.1, OBS.ax, OBS.az, b);
    let e = null;
    for (let t = 0; t < 301 && !e; t++) e = chStep(s, 1, 190, -180, b);
    expect(e?.kind).toBe("fallo"); expect(b.obs).toBe(0);
    expect(fmtMs(65300)).toBe("1:05,3"); expect(fmtMarca(SKATE, 0)).toBe("SIN MARCA"); expect(fmtMarca(SKATE, 420)).toBe("420 PTS");
    expect(mejora(OBS, 0, 5)).toBe(true); expect(mejora(OBS, 5, 0)).toBe(false);
  });
});

describe("fantasma", () => {
  const ruta = Array.from({ length: 40 }, (_, i) => [i * 3.37 - 40, 1.234, -i * 2.5, 0, Math.sin(i / 10) * 0.5, 0, Math.cos(i / 10) * 0.5 + 0.5, i * 10]);
  it("codifica y decodifica ida y vuelta (cm, quaternion y puntos)", () => {
    const d = fantasmaDec(fantasmaEnc(ruta))!;
    expect(d.length).toBe(ruta.length);
    d.forEach((r, i) => { for (const k of [0, 1, 2]) expect(r[k]).toBeCloseTo(ruta[i][k], 1); expect(r[7]).toBe(ruta[i][7]); expect(Math.hypot(r[3], r[4], r[5], r[6])).toBeGreaterThan(0.97); });
  });
  it("rechaza lo corrupto y lo demasiado largo", () => {
    expect(fantasmaDec("no es base64!")).toBeNull(); expect(fantasmaDec("AAAA")).toBeNull(); expect(fantasmaDec(5)).toBeNull();
    expect(fantasmaOk("zzz")).toBe(""); expect(fantasmaOk("")).toBe(""); expect(fantasmaOk(fantasmaEnc(ruta))).not.toBe("");
    expect(fantasmaEnc(Array.from({ length: 3000 }, () => ruta[0]))).toBe(""); expect(fantasmaEnc([ruta[0]])).toBe("");
  });
  it("interpola, y marca cuándo pasó por los puntos de control", () => {
    expect(fantasmaAt(ruta, 0.05)[0]).toBeCloseTo((ruta[0][0] + ruta[1][0]) / 2); expect(fantasmaAt(ruta, 99)[0]).toBe(ruta[39][0]);
    const m = [...OBS.cp!, [OBS.bx!, OBS.bz!]].map((c, i) => [c[0], 0, c[1], 0, 0, 0, 1, 0, i]).map((r, i) => [i, ...r].slice(1));
    expect(fantasmaCp(OBS, m)).toEqual([0, 0.1, 0.2]); expect(fantasmaCp(OBS, m.slice(0, 1))).toEqual([0, -1, -1]);
  });
  it("formatea la diferencia", () => {
    expect(fmtDif("tiempo", -0.84)).toBe("-0,8 S"); expect(fmtDif("tiempo", 1.26)).toBe("+1,3 S"); expect(fmtDif("puntos", 120)).toBe("+120 PTS"); expect(fmtDif("puntos", -30)).toBe("-30 PTS");
  });
});
