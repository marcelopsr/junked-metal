// Bot codicioso por nivel: cuántas veces gana y qué puntaje saca. Sirve para ajustar movimientos y estrellas (match3_levels.ts).
// `M3_REPORT=1 npx vitest run test/match3_balance.test.ts` imprime la tabla.
import { describe, expect, it } from "vitest";
import { CARGO, cloneBoard, finale, goalProgress, listValidSwaps, newMatch3, startPlay, trySwap, type Match3State } from "../src/match3_logic";
import { LEVELS } from "../src/match3_levels";

/** Prueba cada jugada en una copia y elige la que más avanza los objetivos (desempate: puntaje). Sin herramientas. */
function play(lvIdx: number, seed: number) {
  const st = newMatch3(LEVELS[lvIdx], seed);
  startPlay(st);
  const value = (s: Match3State) => s.lv.goals.reduce((a, g) => a + (g.k === "score" ? goalProgress(s, g) / 100 : goalProgress(s, g) * 10), 0) + s.got.score / 1000 + s.board.reduce((a, r, y) => a + r.filter((v) => v === CARGO).length * y * 2, 0);
  while (st.phase === "play") {
    let best: { m: ReturnType<typeof listValidSwaps>[0]; v: number } | null = null;
    for (const m of listValidSwaps(st)) {
      const c: Match3State = { ...st, board: cloneBoard(st.board), crate: cloneBoard(st.crate), lock: cloneBoard(st.lock), rust: cloneBoard(st.rust), got: { ...st.got, piece: st.got.piece.slice() }, rng: () => 0.5 };
      trySwap(c, m.ax, m.ay, m.bx, m.by);
      const v = value(c);
      if (!best || v > best.v) best = { m, v };
    }
    if (!best) break;
    trySwap(st, best.m.ax, best.m.ay, best.m.bx, best.m.by);
  }
  if (st.phase === "win") finale(st);
  return { won: st.phase === "win", score: st.got.score, prog: st.lv.goals.map((g) => goalProgress(st, g) / g.n) };
}

describe("balance de la campaña (bot codicioso)", () => {
  it("cada nivel se puede ganar y la dificultad sube", { timeout: 120000 }, () => {
    const rows: string[] = [];
    const rates: number[] = [];
    LEVELS.forEach((lv, i) => {
      const N = Number(process.env.M3_N ?? 10);
      const res = Array.from({ length: N }, (_, s) => play(i, 1000 + s * 31));
      const wins = res.filter((r) => r.won), rate = wins.length / N;
      const sc = wins.map((r) => r.score).sort((a, b) => a - b), q = (p: number) => sc[Math.min(sc.length - 1, Math.floor(p * sc.length))] ?? 0;
      rates.push(rate);
      const s3 = wins.filter((r) => r.score >= lv.stars[2]).length;
      rows.push(`${lv.id.padEnd(4)} gana ${(rate * 100).toFixed(0).padStart(3)}%  p25 ${q(0.25)}  p50 ${q(0.5)}  p90 ${q(0.9)}  3★ ${s3}/${N}  estrellas ${lv.stars.join("/")}  avance ${lv.goals.map((_, g) => (res.reduce((a, r) => a + r.prog[g], 0) / N).toFixed(2)).join(" ")}`);
    });
    if (process.env.M3_REPORT) process.stderr.write(rows.join("\n") + "\n");
    rates.forEach((r) => expect(r).toBeGreaterThan(0)); // ninguno imposible
    expect(rates[0]).toBeGreaterThanOrEqual(0.9); // el primero enseña
  });
});
