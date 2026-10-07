// Lógica pura del modo arcade match-3 (sin Babylon ni DOM). Probable con vitest.
export const M3_SIZE = 8;
export const M3_TYPES = 5;
export const M3_MOVES = 19;
/** Objetivos nivel 1: tuercas (0) y engranajes (1). */
export const M3_GOAL_TYPES = [0, 1] as const;
export const M3_GOAL_QTY = 18;

export const M3_NAMES = ["Tuerca", "Engranaje", "Pila", "Chip", "Tornillo"] as const;

export type M3Cell = number; // 0..M3_TYPES-1
export type M3Board = M3Cell[][];

export type M3Phase = "ready" | "play" | "win" | "lose";

export type M3Goals = Record<number, number>;

export type Match3State = {
  board: M3Board;
  movesLeft: number;
  goals: M3Goals;
  collected: M3Goals;
  phase: M3Phase;
  seed: number;
};

export type Rng = () => number;

export function m3Rng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function emptyGoals(): M3Goals {
  const g: M3Goals = {};
  for (const t of M3_GOAL_TYPES) g[t] = M3_GOAL_QTY;
  return g;
}

export function emptyCollected(): M3Goals {
  const c: M3Goals = {};
  for (const t of M3_GOAL_TYPES) c[t] = 0;
  return c;
}

export function goalsMet(collected: M3Goals, goals: M3Goals): boolean {
  for (const t of M3_GOAL_TYPES) if ((collected[t] ?? 0) < (goals[t] ?? 0)) return false;
  return true;
}

function inBounds(x: number, y: number) {
  return x >= 0 && x < M3_SIZE && y >= 0 && y < M3_SIZE;
}

export function cloneBoard(b: M3Board): M3Board {
  return b.map((row) => row.slice());
}

/** Conjunto de celdas (x,y) que forman líneas de 3+; cada celda una vez. */
export function findMatches(board: M3Board): Set<string> {
  const hit = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;
  for (let y = 0; y < M3_SIZE; y++) {
    let x = 0;
    while (x < M3_SIZE) {
      const v = board[y]?.[x] ?? -1;
      if (v < 0) { x++; continue; }
      let x2 = x + 1;
      while (x2 < M3_SIZE && board[y][x2] === v) x2++;
      const len = x2 - x;
      if (len >= 3) for (let i = x; i < x2; i++) hit.add(key(i, y));
      x = x2;
    }
  }
  for (let x = 0; x < M3_SIZE; x++) {
    let y = 0;
    while (y < M3_SIZE) {
      const v = board[y]?.[x] ?? -1;
      if (v < 0) { y++; continue; }
      let y2 = y + 1;
      while (y2 < M3_SIZE && board[y2][x] === v) y2++;
      const len = y2 - y;
      if (len >= 3) for (let i = y; i < y2; i++) hit.add(key(x, i));
      y = y2;
    }
  }
  return hit;
}

export function hasAnyMatch(board: M3Board): boolean {
  return findMatches(board).size > 0;
}

export function adjacent(ax: number, ay: number, bx: number, by: number): boolean {
  return (ax === bx && Math.abs(ay - by) === 1) || (ay === by && Math.abs(ax - bx) === 1);
}

export function swapCells(board: M3Board, ax: number, ay: number, bx: number, by: number) {
  const t = board[ay][ax];
  board[ay][ax] = board[by][bx];
  board[by][bx] = t;
}

/** Cae piezas y devuelve lista de movimientos visuales (from → to). */
export function applyGravity(board: M3Board): { x: number; fromY: number; toY: number; type: M3Cell }[] {
  const moves: { x: number; fromY: number; toY: number; type: M3Cell }[] = [];
  for (let x = 0; x < M3_SIZE; x++) {
    let write = M3_SIZE - 1;
    for (let y = M3_SIZE - 1; y >= 0; y--) {
      const v = board[y][x];
      if (v < 0) continue;
      if (y !== write) {
        board[write][x] = v;
        board[y][x] = -1;
        moves.push({ x, fromY: y, toY: write, type: v });
      }
      write--;
    }
    for (let y = write; y >= 0; y--) board[y][x] = -1;
  }
  return moves;
}

export function refill(board: M3Board, rng: Rng): { x: number; y: number; type: M3Cell }[] {
  const spawns: { x: number; y: number; type: M3Cell }[] = [];
  for (let x = 0; x < M3_SIZE; x++) {
    for (let y = 0; y < M3_SIZE; y++) {
      if (board[y][x] < 0) {
        const t = (rng() * M3_TYPES) | 0;
        board[y][x] = t;
        spawns.push({ x, y, type: t });
      }
    }
  }
  return spawns;
}

export type M3ResolveStep = { cleared: { x: number; y: number; type: M3Cell }[]; fell: ReturnType<typeof applyGravity>; spawned: ReturnType<typeof refill> };

/** Vacía matches, gravedad y refill en bucle hasta estabilizar. Actualiza collected. */
export function resolveCascades(board: M3Board, rng: Rng, collected: M3Goals, goals: M3Goals): M3ResolveStep[] {
  const steps: M3ResolveStep[] = [];
  for (;;) {
    const m = findMatches(board);
    if (!m.size) break;
    const cleared: { x: number; y: number; type: M3Cell }[] = [];
    for (const k of m) {
      const [xs, ys] = k.split(",").map(Number);
      const t = board[ys][xs];
      if ((t === 0 || t === 1) && (collected[t] ?? 0) < (goals[t] ?? 0)) collected[t] = (collected[t] ?? 0) + 1;
      cleared.push({ x: xs, y: ys, type: t });
      board[ys][xs] = -1;
    }
    const fell = applyGravity(board);
    const spawned = refill(board, rng);
    steps.push({ cleared, fell, spawned });
  }
  return steps;
}

function randomTypeAvoiding(board: M3Board, x: number, y: number, rng: Rng): M3Cell {
  for (let attempt = 0; attempt < 24; attempt++) {
    const t = (rng() * M3_TYPES) | 0;
    board[y][x] = t;
    if (!createsMatchAt(board, x, y)) return t;
  }
  return (rng() * M3_TYPES) | 0;
}

function cellEq(board: M3Board, x: number, y: number, v: number): boolean {
  const row = board[y];
  return !!row && row[x] === v;
}

function createsMatchAt(board: M3Board, x: number, y: number): boolean {
  const v = board[y][x];
  if (v < 0) return false;
  let h = 1;
  for (let i = x - 1; i >= 0 && cellEq(board, i, y, v); i--) h++;
  for (let i = x + 1; i < M3_SIZE && cellEq(board, i, y, v); i++) h++;
  if (h >= 3) return true;
  let vert = 1;
  for (let i = y - 1; i >= 0 && cellEq(board, x, i, v); i--) vert++;
  for (let i = y + 1; i < M3_SIZE && cellEq(board, x, i, v); i++) vert++;
  return vert >= 3;
}

export function generateBoard(rng: Rng): M3Board {
  const board: M3Board = [];
  for (let y = 0; y < M3_SIZE; y++) {
    board.push(new Array(M3_SIZE).fill(-1));
    for (let x = 0; x < M3_SIZE; x++) {
      board[y][x] = randomTypeAvoiding(board, x, y, rng);
    }
  }
  if (hasAnyMatch(board)) return generateBoard(rng);
  return board;
}

export function listValidSwaps(board: M3Board): { ax: number; ay: number; bx: number; by: number }[] {
  const out: { ax: number; ay: number; bx: number; by: number }[] = [];
  for (let y = 0; y < M3_SIZE; y++) {
    for (let x = 0; x < M3_SIZE; x++) {
      for (const [nx, ny] of [[x + 1, y], [x, y + 1]] as const) {
        if (!inBounds(nx, ny)) continue;
        const b = cloneBoard(board);
        swapCells(b, x, y, nx, ny);
        if (hasAnyMatch(b)) out.push({ ax: x, ay: y, bx: nx, by: ny });
      }
    }
  }
  return out;
}

export function hasValidMove(board: M3Board): boolean {
  for (let y = 0; y < M3_SIZE; y++) {
    for (let x = 0; x < M3_SIZE; x++) {
      const neighbors = [[x + 1, y], [x, y + 1]] as const;
      for (const [nx, ny] of neighbors) {
        if (!inBounds(nx, ny)) continue;
        swapCells(board, x, y, nx, ny);
        const ok = hasAnyMatch(board);
        swapCells(board, x, y, nx, ny);
        if (ok) return true;
      }
    }
  }
  return false;
}

export function reshuffleBoard(board: M3Board, rng: Rng): void {
  const types: M3Cell[] = [];
  for (let y = 0; y < M3_SIZE; y++) for (let x = 0; x < M3_SIZE; x++) types.push(board[y][x]);
  for (let attempt = 0; attempt < 80; attempt++) {
    for (let i = types.length - 1; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      [types[i], types[j]] = [types[j], types[i]];
    }
    let k = 0;
    for (let y = 0; y < M3_SIZE; y++) for (let x = 0; x < M3_SIZE; x++) board[y][x] = types[k++];
    if (!hasAnyMatch(board) && hasValidMove(board)) return;
  }
  const fresh = generateBoard(rng);
  for (let y = 0; y < M3_SIZE; y++) for (let x = 0; x < M3_SIZE; x++) board[y][x] = fresh[y][x];
}

export function newMatch3(seed = 20261007): Match3State {
  const rng = m3Rng(seed);
  let board = generateBoard(rng);
  if (!hasValidMove(board)) reshuffleBoard(board, rng);
  return {
    board,
    movesLeft: M3_MOVES,
    goals: emptyGoals(),
    collected: emptyCollected(),
    phase: "ready",
    seed,
  };
}

export type SwapResult =
  | { ok: false; reason: "bounds" | "phase" | "adjacent" | "no_match" }
  | { ok: true; consumed: boolean; steps: M3ResolveStep[]; won: boolean; lost: boolean; reshuffled: boolean };

export function trySwap(st: Match3State, ax: number, ay: number, bx: number, by: number, rng: Rng): SwapResult {
  if (st.phase !== "play") return { ok: false, reason: "phase" };
  if (!inBounds(ax, ay) || !inBounds(bx, by)) return { ok: false, reason: "bounds" };
  if (!adjacent(ax, ay, bx, by)) return { ok: false, reason: "adjacent" };
  const board = cloneBoard(st.board);
  swapCells(board, ax, ay, bx, by);
  if (!hasAnyMatch(board)) return { ok: false, reason: "no_match" };
  st.board = board;
  st.movesLeft--;
  const collected = { ...st.collected };
  const steps = resolveCascades(st.board, rng, collected, st.goals);
  st.collected = collected;
  let reshuffled = false;
  if (!hasValidMove(st.board)) {
    reshuffleBoard(st.board, rng);
    reshuffled = true;
  }
  const won = goalsMet(st.collected, st.goals);
  if (won) st.phase = "win";
  else if (st.movesLeft <= 0) st.phase = "lose";
  return { ok: true, consumed: true, steps, won, lost: st.phase === "lose", reshuffled };
}

export function startPlay(st: Match3State): void {
  if (st.phase === "ready") st.phase = "play";
}

export function resetMatch3(st: Match3State, seed?: number): void {
  const s = seed ?? st.seed;
  Object.assign(st, newMatch3(s));
}
