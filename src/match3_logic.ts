// Motor puro de Junket Crush (sin Babylon ni DOM): tablero, combinaciones, especiales, combos, herramientas,
// obstáculos y objetivos. Los niveles (match3_levels.ts) son datos; la presentación (match3.ts) solo anima los pasos que devuelve.

// ── Celdas ─────────────────────────────────────────────────────────────
// Pieza = color (0..5) + 8 * especial. Núcleo y carga no tienen color. Negativos = sin pieza.
export const SP = { NONE: 0, H: 1, V: 2, BOMB: 3, CROSS: 4 } as const;
export const CORE = 40, CARGO = 41, EMPTY = -1, HOLE = -2, CRATE = -3;
export const mk = (c: number, s = 0) => c + 8 * s;
export const colorOf = (v: number) => (v >= 0 && v < 40 ? v % 8 : -1);
export const spOf = (v: number) => (v >= 0 && v < 40 ? (v / 8) | 0 : 0);
const isSpecial = (v: number) => v === CORE || spOf(v) > 0;

export type M3Board = number[][]; // [y][x]
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

// ── Niveles (forma de los datos) ───────────────────────────────────────
export type Goal =
  | { k: "score"; n: number }
  | { k: "piece"; t: number; n: number }
  | { k: "crate"; n: number }
  | { k: "rust"; n: number }
  | { k: "chain"; n: number }
  | { k: "cargo"; n: number };
export type Tool = "martillo" | "sierra" | "iman" | "llave";
export const TOOLS: Tool[] = ["martillo", "sierra", "iman", "llave"];
export type LevelDef = {
  id: string; name: string; zone: string; desc: string; tip: string;
  /** Filas del tablero: `.` pieza al azar, `#` hueco, `c`/`C` caja de 1/2 golpes, `r` óxido, `k` cadena, `g` carga, `0`-`5` pieza fija. */
  layout: string[];
  types: number; moves: number; goals: Goal[];
  /** Puntaje para 1, 2 y 3 estrellas (la primera también exige los objetivos). */
  stars: [number, number, number];
  tools?: Partial<Record<Tool, number>>; // cargas de prueba de este nivel (no se guardan)
  reward?: Partial<Record<Tool, number>>; // al ganarlo por primera vez
  hazard?: { every: number; crates: number }; // la trituradora escupe cajas cada N movimientos
  boss?: boolean;
};

// ── Estado ─────────────────────────────────────────────────────────────
export type M3Phase = "ready" | "play" | "win" | "lose";
export type Got = { score: number; piece: number[]; crate: number; rust: number; chain: number; cargo: number };
export type Match3State = {
  lv: LevelDef; w: number; h: number; seed: number; rng: Rng;
  board: M3Board; crate: number[][]; lock: number[][]; rust: number[][];
  movesLeft: number; used: number; phase: M3Phase; got: Got;
  cargoOut: number; // cargas que ya aparecieron (las del layout incluidas)
  tools: Partial<Record<Tool, number>>; // cargas de prueba que quedan en esta partida
};

export type Cleared = { x: number; y: number; v: number };
export type Hit = { x: number; y: number; k: "crate" | "chain" | "rust"; left: number };
export type Blast = { x: number; y: number; k: "h" | "v" | "bomb" | "cross" | "core" | "combo"; r?: number };
export type M3ResolveStep = {
  cleared: Cleared[]; blasts: Blast[]; made: Cleared[]; hits: Hit[];
  fell: { x: number; fromY: number; toY: number; type: number }[];
  spawned: { x: number; y: number; type: number; dy: number }[];
  gain: number; chain: number; shuffled?: boolean; crates?: { x: number; y: number }[];
};

const grid = (w: number, h: number, v = 0) => Array.from({ length: h }, () => new Array(w).fill(v));
export const cloneBoard = (b: M3Board): M3Board => b.map((r) => r.slice());
const inB = (st: Match3State, x: number, y: number) => x >= 0 && y >= 0 && x < st.w && y < st.h;
export const adjacent = (ax: number, ay: number, bx: number, by: number) => Math.abs(ax - bx) + Math.abs(ay - by) === 1;
/** Se puede agarrar y mover (no hueco, caja, vacío ni encadenada). */
export const movable = (st: Match3State, x: number, y: number) => inB(st, x, y) && st.board[y][x] >= 0 && !st.lock[y][x];
const matchable = (v: number) => colorOf(v) >= 0;
const fixed = (st: Match3State, x: number, y: number) => st.board[y][x] === CRATE || !!st.lock[y][x];

// ── Detección de grupos ────────────────────────────────────────────────
export type Group = { color: number; cells: [number, number][]; make: number; at: [number, number] | null; shape: "3" | "4" | "5" | "T" | "L" };

/** Grupos de 3+ (líneas unidas por celdas compartidas) y qué especial crea cada uno. `pref` = celdas recién movidas (ahí nace el especial). */
export function findGroups(b: M3Board, w: number, h: number, pref: [number, number][] = []): Group[] {
  type Run = { cells: [number, number][]; dir: "h" | "v" };
  const runs: Run[] = [];
  for (const dir of ["h", "v"] as const) {
    const A = dir === "h" ? h : w, L = dir === "h" ? w : h;
    for (let a = 0; a < A; a++) {
      let i = 0;
      while (i < L) {
        const at = (k: number) => (dir === "h" ? b[a][k] : b[k][a]);
        const c = colorOf(at(i));
        let j = i + 1;
        if (c >= 0) while (j < L && colorOf(at(j)) === c) j++;
        if (c >= 0 && j - i >= 3) runs.push({ dir, cells: Array.from({ length: j - i }, (_, k) => (dir === "h" ? [i + k, a] : [a, i + k]) as [number, number]) });
        i = j;
      }
    }
  }
  // unir líneas que comparten celdas
  const parent = runs.map((_, i) => i);
  const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i])));
  const owner = new Map<number, number>();
  runs.forEach((r, i) => r.cells.forEach(([x, y]) => { const k = y * w + x, o = owner.get(k); if (o === undefined) owner.set(k, i); else parent[root(i)] = root(o); }));
  const byRoot = new Map<number, Run[]>();
  runs.forEach((r, i) => { const k = root(i); byRoot.set(k, [...(byRoot.get(k) ?? []), r]); });
  const out: Group[] = [];
  for (const rs of byRoot.values()) {
    const seen = new Map<number, [number, number]>();
    for (const r of rs) for (const c of r.cells) seen.set(c[1] * w + c[0], c);
    const cells = [...seen.values()];
    const color = colorOf(b[cells[0][1]][cells[0][0]]);
    const maxLen = Math.max(...rs.map((r) => r.cells.length));
    const hs = rs.filter((r) => r.dir === "h"), vs = rs.filter((r) => r.dir === "v");
    let make = -1, shape: Group["shape"] = "3", at: [number, number] | null = null;
    const prefIn = pref.find(([px, py]) => seen.has(py * w + px)) ?? null;
    if (maxLen >= 5) { make = CORE; shape = "5"; }
    else if (hs.length && vs.length) {
      // cruce: L si la celda compartida es punta de ambas líneas; si no, T (o +)
      let cross: [number, number] = cells[0], isL = false;
      for (const hr of hs) for (const vr of vs) {
        const hit = hr.cells.find(([x, y]) => vr.cells.some(([x2, y2]) => x2 === x && y2 === y));
        if (!hit) continue;
        cross = hit;
        const end = (r: Run) => { const f = r.cells[0], l = r.cells[r.cells.length - 1]; return (f[0] === hit[0] && f[1] === hit[1]) || (l[0] === hit[0] && l[1] === hit[1]); };
        isL = end(hr) && end(vr);
      }
      make = mk(color, isL ? SP.BOMB : SP.CROSS); shape = isL ? "L" : "T";
      at = prefIn ?? cross;
    } else if (maxLen === 4) { make = mk(color, hs.length ? SP.H : SP.V); shape = "4"; }
    if (make >= 0 && !at) {
      const longest = rs.reduce((a, r) => (r.cells.length > a.cells.length ? r : a));
      at = prefIn ?? longest.cells[(longest.cells.length / 2) | 0];
    }
    out.push({ color, cells, make, at, shape });
  }
  return out;
}

// ── Efectos de especiales ──────────────────────────────────────────────
function rowCells(st: Match3State, y: number) { return Array.from({ length: st.w }, (_, x) => [x, y] as [number, number]); }
function colCells(st: Match3State, x: number) { return Array.from({ length: st.h }, (_, y) => [x, y] as [number, number]); }
function area(st: Match3State, cx: number, cy: number, r: number) {
  const o: [number, number][] = [];
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (inB(st, x, y)) o.push([x, y]);
  return o;
}
function mostCommonColor(st: Match3State) {
  const n = new Array(8).fill(0);
  for (const r of st.board) for (const v of r) if (colorOf(v) >= 0) n[colorOf(v)]++;
  return n.indexOf(Math.max(...n));
}
function cellsOfColor(st: Match3State, c: number) {
  const o: [number, number][] = [];
  for (let y = 0; y < st.h; y++) for (let x = 0; x < st.w; x++) if (colorOf(st.board[y][x]) === c) o.push([x, y]);
  return o;
}
function effect(st: Match3State, x: number, y: number, v: number): { cells: [number, number][]; blast: Blast } {
  if (v === CORE) { const c = mostCommonColor(st); return { cells: cellsOfColor(st, c), blast: { x, y, k: "core" } }; }
  const s = spOf(v);
  if (s === SP.H) return { cells: rowCells(st, y), blast: { x, y, k: "h" } };
  if (s === SP.V) return { cells: colCells(st, x), blast: { x, y, k: "v" } };
  if (s === SP.BOMB) return { cells: area(st, x, y, 1), blast: { x, y, k: "bomb", r: 1 } };
  return { cells: [...rowCells(st, y), ...colCells(st, x)], blast: { x, y, k: "cross" } };
}

// ── Gravedad y relleno ─────────────────────────────────────────────────
function applyGravity(st: Match3State) {
  const moves: M3ResolveStep["fell"] = [];
  const spawned: M3ResolveStep["spawned"] = [];
  const b = st.board;
  for (let x = 0; x < st.w; x++) {
    // tramos separados por celdas fijas (cajas y encadenadas); los huecos se saltean (las piezas caen a través)
    let bottom = st.h - 1;
    while (bottom >= 0) {
      let top = bottom;
      while (top - 1 >= 0 && !fixed(st, x, top - 1)) top--;
      if (fixed(st, x, bottom)) { bottom--; continue; }
      let write = bottom;
      for (let y = bottom; y >= top; y--) {
        if (b[y][x] === HOLE) continue;
        while (write >= top && b[write][x] === HOLE) write--;
        const v = b[y][x];
        if (v === EMPTY) continue;
        if (y !== write) { b[write][x] = v; b[y][x] = EMPTY; moves.push({ x, fromY: y, toY: write, type: v }); }
        write--;
      }
      // ponytail: los tramos tapados por una caja se rellenan desde su propio techo (como si los alimentara un caño); deslizar en diagonal si se nota raro
      const first = spawned.length;
      for (let y = write; y >= top; y--) {
        if (b[y][x] !== EMPTY) continue;
        const t = pickSpawn(st);
        b[y][x] = t;
        spawned.push({ x, y, type: t, dy: 0 });
      }
      for (let i = first; i < spawned.length; i++) spawned[i].dy = spawned.length - first; // todas entran desde arriba del tramo
      bottom = top - 2;
    }
  }
  return { moves, spawned };
}
function cargoGoal(st: Match3State) { return st.lv.goals.find((g) => g.k === "cargo")?.n ?? 0; }
function pickSpawn(st: Match3State) {
  const need = cargoGoal(st);
  if (need && st.cargoOut < need && !st.board.some((r) => r.includes(CARGO)) && st.rng() < 0.5) { st.cargoOut++; return CARGO; }
  return (st.rng() * st.lv.types) | 0;
}
/** Cargas que llegaron al fondo de su columna (la última celda que no es hueco). */
function cargoAtBottom(st: Match3State) {
  const o: [number, number][] = [];
  for (let x = 0; x < st.w; x++) {
    let y = st.h - 1;
    while (y >= 0 && st.board[y][x] === HOLE) y--;
    if (y >= 0 && st.board[y][x] === CARGO) o.push([x, y]);
  }
  return o;
}

// ── Resolución ─────────────────────────────────────────────────────────
export const PTS = { piece: 10, crate: 40, chain: 30, rust: 30, cargo: 250, make: { 4: 60, T: 90, L: 90, 5: 150 } as Record<string, number>, finale: 60 };

/**
 * Resuelve en bucle: limpia `seed` (si hay) y los grupos, dispara especiales en cadena, crea los nuevos, aplica gravedad
 * y relleno, saca las cargas que llegaron al fondo, y repite mientras haya grupos. `pref` = celdas del intercambio.
 */
export function resolve(st: Match3State, seed: [number, number][] | null, pref: [number, number][] = [], blast0: Blast[] = []): M3ResolveStep[] {
  const steps: M3ResolveStep[] = [];
  for (let chain = 0; chain < 60; chain++) {
    const groups = findGroups(st.board, st.w, st.h, chain === 0 ? pref : []);
    const out = cargoAtBottom(st);
    if (!groups.length && !(seed && seed.length) && !out.length) break;
    const step: M3ResolveStep = { cleared: [], blasts: chain === 0 ? [...blast0] : [], made: [], hits: [], fell: [], spawned: [], gain: 0, chain };
    const set = new Map<number, [number, number]>();
    const add = (x: number, y: number) => { if (inB(st, x, y)) set.set(y * st.w + x, [x, y]); };
    for (const [x, y] of seed ?? []) add(x, y);
    seed = null;
    const create: { x: number; y: number; v: number; shape: string }[] = [];
    const matched = new Set<number>();
    for (const g of groups) {
      for (const [x, y] of g.cells) { add(x, y); matched.add(y * st.w + x); }
      if (g.make >= 0 && g.at) create.push({ x: g.at[0], y: g.at[1], v: g.make, shape: g.shape });
    }
    // disparar especiales alcanzados (en cadena)
    const fired = new Set<number>();
    for (let again = true; again;) {
      again = false;
      for (const [k, [x, y]] of [...set]) {
        const v = st.board[y][x];
        if (fired.has(k) || !isSpecial(v) || st.lock[y][x]) continue;
        fired.add(k); again = true;
        const e = effect(st, x, y, v);
        step.blasts.push(e.blast);
        for (const [ex, ey] of e.cells) add(ex, ey);
      }
    }
    // golpe a cajas vecinas de lo que se juntó
    for (const k of matched) {
      const x = k % st.w, y = (k / st.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inB(st, x + dx, y + dy) && st.board[y + dy][x + dx] === CRATE) add(x + dx, y + dy);
    }
    const mul = chain + 1;
    for (const [x, y] of set.values()) {
      const v = st.board[y][x];
      if (v === HOLE || v === EMPTY) continue;
      if (v === CRATE) {
        st.crate[y][x]--;
        step.hits.push({ x, y, k: "crate", left: st.crate[y][x] });
        if (st.crate[y][x] <= 0) { st.board[y][x] = EMPTY; st.got.crate++; step.gain += PTS.crate; }
        continue;
      }
      if (st.lock[y][x]) { st.lock[y][x] = 0; st.got.chain++; step.gain += PTS.chain; step.hits.push({ x, y, k: "chain", left: 0 }); continue; }
      if (v === CARGO) continue; // las cargas no se rompen: se llevan hasta abajo
      step.cleared.push({ x, y, v });
      const c = colorOf(v);
      if (c >= 0) st.got.piece[c]++;
      step.gain += PTS.piece * mul;
      st.board[y][x] = EMPTY;
      if (st.rust[y][x]) { st.rust[y][x] = 0; st.got.rust++; step.gain += PTS.rust; step.hits.push({ x, y, k: "rust", left: 0 }); }
    }
    for (const [x, y] of out) { step.cleared.push({ x, y, v: CARGO }); st.board[y][x] = EMPTY; st.got.cargo++; step.gain += PTS.cargo; }
    for (const c of create) {
      if (st.board[c.y][c.x] !== EMPTY) continue; // una caja o candado en el medio: sin especial
      st.board[c.y][c.x] = c.v; st.lock[c.y][c.x] = 0;
      step.made.push({ x: c.x, y: c.y, v: c.v });
      step.gain += PTS.make[c.shape] ?? 0;
    }
    const g = applyGravity(st);
    step.fell = g.moves; step.spawned = g.spawned;
    st.got.score += step.gain;
    steps.push(step);
  }
  return steps;
}

// ── Jugadas posibles y reorganización ──────────────────────────────────
function swapB(b: M3Board, ax: number, ay: number, bx: number, by: number) { const t = b[ay][ax]; b[ay][ax] = b[by][bx]; b[by][bx] = t; }

/** Intercambio que el motor aceptaría (sin aplicarlo). */
export function swapWorks(st: Match3State, ax: number, ay: number, bx: number, by: number): boolean {
  if (!movable(st, ax, ay) || !movable(st, bx, by) || !adjacent(ax, ay, bx, by)) return false;
  const a = st.board[ay][ax], b = st.board[by][bx];
  if ((a === CORE && b !== CARGO) || (b === CORE && a !== CARGO)) return true;
  if (spOf(a) && spOf(b)) return true;
  swapB(st.board, ax, ay, bx, by);
  const ok = findGroups(st.board, st.w, st.h).length > 0;
  swapB(st.board, ax, ay, bx, by);
  return ok;
}
export function listValidSwaps(st: Match3State) {
  const o: { ax: number; ay: number; bx: number; by: number }[] = [];
  for (let y = 0; y < st.h; y++) for (let x = 0; x < st.w; x++) for (const [nx, ny] of [[x + 1, y], [x, y + 1]]) if (swapWorks(st, x, y, nx, ny)) o.push({ ax: x, ay: y, bx: nx, by: ny });
  return o;
}
export const hasValidMove = (st: Match3State) => listValidSwaps(st).length > 0;

/** Mezcla solo las piezas comunes sueltas (especiales, cargas, cajas y cadenas quedan donde están) hasta que no haya grupos y sí haya jugada. */
export function reshuffle(st: Match3State) {
  const spots: [number, number][] = [];
  for (let y = 0; y < st.h; y++) for (let x = 0; x < st.w; x++) { const v = st.board[y][x]; if (v >= 0 && v < 8 && !st.lock[y][x]) spots.push([x, y]); }
  const vals = spots.map(([x, y]) => st.board[y][x]);
  for (let tries = 0; tries < 200; tries++) {
    for (let i = vals.length - 1; i > 0; i--) { const j = (st.rng() * (i + 1)) | 0; [vals[i], vals[j]] = [vals[j], vals[i]]; }
    if (tries > 100) for (let i = 0; i < vals.length; i++) vals[i] = (st.rng() * st.lv.types) | 0; // sin salida con estos colores: se cambian
    spots.forEach(([x, y], i) => (st.board[y][x] = vals[i]));
    if (!findGroups(st.board, st.w, st.h).length && hasValidMove(st)) return true;
  }
  return false;
}

// ── Armado del nivel ───────────────────────────────────────────────────
export function newMatch3(lv: LevelDef, seed = 20261007): Match3State {
  const h = lv.layout.length, w = lv.layout[0].length;
  const st: Match3State = {
    lv, w, h, seed, rng: m3Rng(seed),
    board: grid(w, h, EMPTY), crate: grid(w, h), lock: grid(w, h), rust: grid(w, h),
    movesLeft: lv.moves, used: 0, phase: "ready",
    got: { score: 0, piece: new Array(8).fill(0), crate: 0, rust: 0, chain: 0, cargo: 0 },
    cargoOut: 0, tools: { ...lv.tools },
  };
  for (let tries = 0; tries < 50; tries++) {
    st.cargoOut = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = lv.layout[y][x];
      st.crate[y][x] = ch === "c" ? 1 : ch === "C" ? 2 : 0;
      st.lock[y][x] = ch === "k" ? 1 : 0;
      st.rust[y][x] = ch === "r" ? 1 : 0;
      st.board[y][x] = ch === "#" ? HOLE : st.crate[y][x] ? CRATE : ch === "g" ? (st.cargoOut++, CARGO) : /[0-5]/.test(ch) ? Number(ch) : EMPTY;
    }
    // piezas al azar sin formar grupos de entrada
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (st.board[y][x] !== EMPTY) continue;
      for (let a = 0; a < 30; a++) {
        st.board[y][x] = (st.rng() * lv.types) | 0;
        if (!findGroups(st.board, w, h).some((g) => g.cells.some(([gx, gy]) => gx === x && gy === y))) break;
      }
    }
    if (!findGroups(st.board, w, h).length && hasValidMove(st)) return st;
  }
  reshuffle(st);
  return st;
}

export const startPlay = (st: Match3State) => { if (st.phase === "ready") st.phase = "play"; };

// ── Objetivos y estrellas ──────────────────────────────────────────────
export function goalProgress(st: Match3State, g: Goal): number {
  const v = g.k === "score" ? st.got.score : g.k === "piece" ? st.got.piece[g.t] : st.got[g.k];
  return Math.min(g.n, v);
}
export const goalsMet = (st: Match3State) => st.lv.goals.every((g) => goalProgress(st, g) >= g.n);
export function starsFor(lv: LevelDef, score: number) { return score >= lv.stars[2] ? 3 : score >= lv.stars[1] ? 2 : 1; }

/** Tras cada acción: trituradora, falta de jugadas, victoria o derrota. */
function afterAction(st: Match3State, steps: M3ResolveStep[], usedMove: boolean) {
  if (goalsMet(st)) { st.phase = "win"; return; }
  const hz = st.lv.hazard;
  if (usedMove && hz && st.used % hz.every === 0) {
    // ponytail: elige al azar entre las piezas comunes de la mitad de arriba; apuntar a donde molesta más si hace falta
    const spots: [number, number][] = [];
    for (let y = 0; y < Math.ceil(st.h / 2); y++) for (let x = 0; x < st.w; x++) { const v = st.board[y][x]; if (v >= 0 && v < 8 && !st.lock[y][x]) spots.push([x, y]); }
    const crates: { x: number; y: number }[] = [];
    for (let i = 0; i < hz.crates && spots.length; i++) {
      const [x, y] = spots.splice((st.rng() * spots.length) | 0, 1)[0];
      st.board[y][x] = CRATE; st.crate[y][x] = 1; crates.push({ x, y });
    }
    if (crates.length) steps.push({ cleared: [], blasts: [], made: [], hits: [], fell: [], spawned: [], gain: 0, chain: 0, crates });
  }
  if (!hasValidMove(st)) { reshuffle(st); steps.push({ cleared: [], blasts: [], made: [], hits: [], fell: [], spawned: [], gain: 0, chain: 0, shuffled: true }); }
  if (st.movesLeft <= 0) st.phase = "lose";
}

export type SwapResult =
  | { ok: false; reason: "phase" | "bounds" | "adjacent" | "fixed" | "no_match" }
  | { ok: true; steps: M3ResolveStep[]; won: boolean; lost: boolean; combo: string | null };

/** Intercambio del jugador. Gasta un movimiento si es válido. `free` = llave inglesa (no exige grupo ni gasta movimiento). */
export function trySwap(st: Match3State, ax: number, ay: number, bx: number, by: number, free = false): SwapResult {
  if (st.phase !== "play") return { ok: false, reason: "phase" };
  if (!inB(st, ax, ay) || !inB(st, bx, by)) return { ok: false, reason: "bounds" };
  if (!adjacent(ax, ay, bx, by)) return { ok: false, reason: "adjacent" };
  if (!movable(st, ax, ay) || !movable(st, bx, by)) return { ok: false, reason: "fixed" };
  const a = st.board[ay][ax], b = st.board[by][bx];
  let seed: [number, number][] | null = null, combo: string | null = null;
  const blasts: Blast[] = [];
  if (!free && (a === CORE || b === CORE) && a !== CARGO && b !== CARGO) {
    const other = a === CORE ? b : a, [cx, cy] = a === CORE ? [ax, ay] : [bx, by];
    st.board[cy][cx] = EMPTY; // el núcleo se consume
    if (other === CORE) { seed = []; for (let y = 0; y < st.h; y++) for (let x = 0; x < st.w; x++) seed.push([x, y]); combo = "FUNDICIÓN TOTAL"; blasts.push({ x: bx, y: by, k: "combo", r: 99 }); }
    else if (spOf(other)) {
      // sobrecarga: todas las piezas de ese color se vuelven especiales y explotan
      const c = colorOf(other), s = spOf(other);
      seed = cellsOfColor(st, c);
      for (const [x, y] of seed) if (!st.lock[y][x]) st.board[y][x] = mk(c, s === SP.H || s === SP.V ? (st.rng() < 0.5 ? SP.H : SP.V) : s);
      combo = "SOBRECARGA"; blasts.push({ x: bx, y: by, k: "core" });
    } else { seed = cellsOfColor(st, colorOf(other)); seed.push([cx, cy]); combo = null; blasts.push({ x: cx, y: cy, k: "core" }); }
    if (seed) for (const [x, y] of seed) if (st.board[y][x] === CORE) st.board[y][x] = mk(0); // otro núcleo alcanzado no reinicia la cadena
  } else if (!free && spOf(a) && spOf(b)) {
    const sa = spOf(a), sb = spOf(b), bombs = (sa === SP.BOMB ? 1 : 0) + (sb === SP.BOMB ? 1 : 0);
    st.board[ay][ax] = mk(colorOf(a)); st.board[by][bx] = mk(colorOf(b)); // se combinan: no disparan cada una por su lado
    seed = [];
    if (bombs === 2) { seed = area(st, bx, by, 2); combo = "PRENSA DOBLE"; blasts.push({ x: bx, y: by, k: "bomb", r: 2 }); }
    else if (bombs === 1) { for (let d = -1; d <= 1; d++) { if (by + d >= 0 && by + d < st.h) seed.push(...rowCells(st, by + d)); if (bx + d >= 0 && bx + d < st.w) seed.push(...colCells(st, bx + d)); } combo = "TRITURADORA"; blasts.push({ x: bx, y: by, k: "combo", r: 1 }); }
    else { seed = [...rowCells(st, by), ...colCells(st, bx)]; combo = "SIERRAS CRUZADAS"; blasts.push({ x: bx, y: by, k: "cross" }); }
  }
  swapB(st.board, ax, ay, bx, by);
  if (!seed && !free && !findGroups(st.board, st.w, st.h).length) { swapB(st.board, ax, ay, bx, by); return { ok: false, reason: "no_match" }; }
  if (!free) { st.movesLeft--; st.used++; }
  const steps = resolve(st, seed, [[bx, by], [ax, ay]], blasts);
  afterAction(st, steps, !free);
  const ph = st.phase as M3Phase; // afterAction la cambia
  return { ok: true, steps, won: ph === "win", lost: ph === "lose", combo };
}

/** Herramientas del taller: no gastan movimientos. Martillo = una celda, sierra = la fila, imán = todas las de ese color. Llave = ver trySwap(free). */
export function useTool(st: Match3State, tool: Exclude<Tool, "llave">, x: number, y: number): M3ResolveStep[] | null {
  if (st.phase !== "play" || !inB(st, x, y)) return null;
  const v = st.board[y][x];
  let seed: [number, number][];
  const blasts: Blast[] = [];
  if (tool === "martillo") { if (v === HOLE || v === EMPTY) return null; seed = [[x, y]]; blasts.push({ x, y, k: "bomb", r: 0 }); }
  else if (tool === "sierra") { seed = rowCells(st, y); blasts.push({ x, y, k: "h" }); }
  else { const c = colorOf(v); if (c < 0) return null; seed = cellsOfColor(st, c); blasts.push({ x, y, k: "core" }); }
  const steps = resolve(st, seed, [], blasts);
  afterAction(st, steps, false);
  return steps;
}

/** Sobrecarga final: cada movimiento sobrante vuelve sierra una pieza común y todas se disparan. */
export function finale(st: Match3State): { steps: M3ResolveStep[]; made: Cleared[]; bonus: number } {
  const spots: [number, number][] = [];
  for (let y = 0; y < st.h; y++) for (let x = 0; x < st.w; x++) { const v = st.board[y][x]; if (v >= 0 && v < 8 && !st.lock[y][x]) spots.push([x, y]); }
  const n = Math.min(st.movesLeft, 12, spots.length), made: Cleared[] = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = spots.splice((st.rng() * spots.length) | 0, 1)[0];
    st.board[y][x] = mk(colorOf(st.board[y][x]), st.rng() < 0.5 ? SP.H : SP.V);
    made.push({ x, y, v: st.board[y][x] });
  }
  const bonus = st.movesLeft * PTS.finale;
  st.got.score += bonus;
  st.movesLeft = 0;
  const steps = made.length ? resolve(st, made.map((m) => [m.x, m.y] as [number, number])) : [];
  if (!hasValidMove(st)) reshuffle(st);
  return { steps, made, bonus };
}
