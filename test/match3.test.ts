import { describe, expect, it } from "vitest";
import {
  M3_GOAL_QTY,
  M3_MOVES,
  M3_SIZE,
  adjacent,
  findMatches,
  generateBoard,
  goalsMet,
  hasValidMove,
  m3Rng,
  newMatch3,
  refill,
  resetMatch3,
  reshuffleBoard,
  resolveCascades,
  startPlay,
  trySwap,
  type M3Board,
} from "../src/match3_logic";

function boardFrom(rows: string[]): M3Board {
  return rows.map((r) => r.split("").map((c) => (c === "." ? -1 : Number(c))));
}

function fullBoard(fill: number): M3Board {
  return Array.from({ length: M3_SIZE }, () => Array(M3_SIZE).fill(fill));
}

describe("match3_logic", () => {
  it("detecta líneas H/V y cruces sin duplicar celdas", () => {
    const b = boardFrom([
      "........",
      "........",
      "..111...",
      "...1....",
      "...1....",
      "........",
      "........",
      "........",
    ]);
    const m = findMatches(b);
    expect(m.size).toBe(5);
    expect(m.has("3,3")).toBe(true);
  });

  it("swap inválido no consume movimiento", () => {
    const st = newMatch3(42);
    startPlay(st);
    const before = st.movesLeft;
    const r = trySwap(st, 0, 0, 1, 0, m3Rng(st.seed));
    if (r.ok) return;
    expect(st.movesLeft).toBe(before);
  });

  it("tablero inicial sin matches y con jugada", () => {
    const rng = m3Rng(99);
    const b = generateBoard(rng);
    expect(findMatches(b).size).toBe(0);
    expect(hasValidMove(b)).toBe(true);
  });

  it("gravedad, refill y cascadas", () => {
    const b = boardFrom([
      "........",
      "........",
      "........",
      "..111...",
      "........",
      "........",
      "........",
      "........",
    ]);
    const rng = m3Rng(1);
    const collected = { 0: 0, 1: 0 };
    const goals = { 0: M3_GOAL_QTY, 1: M3_GOAL_QTY };
    const steps = resolveCascades(b, rng, collected, goals);
    expect(steps.length).toBeGreaterThan(0);
    expect(findMatches(b).size).toBe(0);
    expect(collected[1]).toBe(3);
  });

  it("reshuffle deja jugada válida", () => {
    const st = newMatch3(7);
    startPlay(st);
    for (let y = 0; y < M3_SIZE; y++) for (let x = 0; x < M3_SIZE; x++) st.board[y][x] = 0;
    reshuffleBoard(st.board, m3Rng(7));
    expect(hasValidMove(st.board)).toBe(true);
    expect(findMatches(st.board).size).toBe(0);
  });

  it("reset restaura estado", () => {
    const st = newMatch3(5);
    startPlay(st);
    st.movesLeft = 0;
    st.phase = "lose";
    resetMatch3(st);
    expect(st.movesLeft).toBe(M3_MOVES);
    expect(st.phase).toBe("ready");
  });

  it("goalsMet", () => {
    expect(goalsMet({ 0: 18, 1: 18 }, { 0: 18, 1: 18 })).toBe(true);
    expect(goalsMet({ 0: 17, 1: 18 }, { 0: 18, 1: 18 })).toBe(false);
  });

  it("adjacent", () => {
    expect(adjacent(0, 0, 1, 0)).toBe(true);
    expect(adjacent(0, 0, 1, 1)).toBe(false);
  });

  it("refill llena huecos", () => {
    const b = fullBoard(-1);
    refill(b, m3Rng(3));
    for (let y = 0; y < M3_SIZE; y++) for (let x = 0; x < M3_SIZE; x++) expect(b[y][x]).toBeGreaterThanOrEqual(0);
  });
});
