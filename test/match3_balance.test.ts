import { describe, expect, it } from "vitest";
import {
  M3_GOAL_QTY,
  M3_GOAL_TYPES,
  M3_MOVES,
  listValidSwaps,
  m3Rng,
  newMatch3,
  startPlay,
  trySwap,
} from "../src/match3_logic";

const GOAL_TOTAL = M3_GOAL_TYPES.length * M3_GOAL_QTY;

/** Bot aleatorio reproducible para estimar dificultad del nivel 1. */
function playRandom(seed: number) {
  const st = newMatch3(seed);
  const rng = m3Rng(seed ^ 0x9e3779b9);
  startPlay(st);
  let turns = 0;
  while (st.phase === "play" && turns < M3_MOVES + 5) {
    const swaps = listValidSwaps(st.board);
    if (!swaps.length) break;
    const s = swaps[(rng() * swaps.length) | 0];
    const r = trySwap(st, s.ax, s.ay, s.bx, s.by, rng);
    if (!r.ok) break;
    turns++;
  }
  const got = M3_GOAL_TYPES.reduce((n, t) => n + (st.collected[t] ?? 0), 0);
  return { won: st.phase === "win", movesLeft: st.movesLeft, got, turns };
}

describe("match3 balance (smoke)", () => {
  it("bot aleatorio: tasa de victoria razonable en 120 semillas", () => {
    const N = 120;
    let wins = 0;
    let sumGot = 0;
    for (let i = 0; i < N; i++) {
      const seed = 20261007 + i * 97;
      const r = playRandom(seed);
      if (r.won) wins++;
      sumGot += r.got;
    }
    const winRate = wins / N;
    const avgGot = sumGot / N;
    expect(winRate).toBeGreaterThan(0.08);
    expect(winRate).toBeLessThan(0.92);
    expect(avgGot).toBeGreaterThan(GOAL_TOTAL * 0.35);
  });
});
