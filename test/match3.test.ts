import { describe, expect, it } from "vitest";
import {
  CARGO, CORE, CRATE, EMPTY, HOLE, SP, colorOf, findGroups, finale, goalsMet, hasValidMove, mk, newMatch3, spOf, startPlay, trySwap, useTool,
  type LevelDef, type Match3State,
} from "../src/match3_logic";
import { LEVELS } from "../src/match3_levels";

const LV: LevelDef = { id: "t", name: "t", zone: "", desc: "", tip: "", layout: Array(8).fill("........"), types: 5, moves: 20, goals: [{ k: "score", n: 999999 }], stars: [1, 2, 3] };

/** Estado con un tablero escrito a mano: dígito = color, `H`/`V`/`B`/`X` + color en la fila siguiente no; usamos códigos directos. */
function stFrom(rows: (number | string)[][], lv: Partial<LevelDef> = {}): Match3State {
  const st = newMatch3({ ...LV, ...lv, layout: rows.map((r) => ".".repeat(r.length)) }, 1);
  st.board = rows.map((r) => r.map((v) => (typeof v === "number" ? v : v === "#" ? HOLE : v === "c" ? CRATE : v === "g" ? CARGO : v === "*" ? CORE : EMPTY)));
  rows.forEach((r, y) => r.forEach((v, x) => { st.crate[y][x] = v === "c" ? 1 : 0; st.lock[y][x] = 0; st.rust[y][x] = 0; }));
  startPlay(st);
  return st;
}
// relleno sin grupos: patrón de 3 colores que nunca alinea 3 (2,3,4 rotando)
const filler = (w: number, h: number) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => 2 + ((x + y * 2) % 3)));

describe("grupos", () => {
  it("3, 4 (orientación), 5, L y T", () => {
    const b = filler(8, 8);
    b[0][0] = b[0][1] = b[0][2] = 0; // 3
    let g = findGroups(b, 8, 8);
    expect(g.find((x) => x.color === 0)?.make).toBe(-1);
    b[0][3] = 0; // 4 horizontal → sierra de fila
    g = findGroups(b, 8, 8);
    expect(spOf(g.find((x) => x.color === 0)!.make)).toBe(SP.H);
    b[0][4] = 0; // 5 → núcleo
    expect(findGroups(b, 8, 8).find((x) => x.color === 0)?.make).toBe(CORE);
    const c = filler(8, 8);
    c[2][2] = c[3][2] = c[4][2] = c[4][3] = c[4][4] = 1; // L con esquina en (2,4)
    const gl = findGroups(c, 8, 8).find((x) => x.color === 1)!;
    expect(gl.shape).toBe("L"); expect(spOf(gl.make)).toBe(SP.BOMB); expect(gl.at).toEqual([2, 4]);
    const d = filler(8, 8);
    d[2][1] = d[2][2] = d[2][3] = d[3][2] = d[4][2] = 1; // T
    const gt = findGroups(d, 8, 8).find((x) => x.color === 1)!;
    expect(gt.shape).toBe("T"); expect(spOf(gt.make)).toBe(SP.CROSS);
  });
  it("4 vertical → sierra de columna", () => {
    const b = filler(8, 8);
    for (let y = 1; y < 5; y++) b[y][6] = 0;
    expect(spOf(findGroups(b, 8, 8)[0].make)).toBe(SP.V);
  });
});

describe("intercambios", () => {
  it("sin grupo no gasta movimiento y no cambia el tablero", () => {
    const st = stFrom(filler(8, 8));
    const before = JSON.stringify(st.board);
    const r = trySwap(st, 0, 0, 1, 0);
    expect(r.ok).toBe(false);
    expect(st.movesLeft).toBe(20);
    expect(JSON.stringify(st.board)).toBe(before);
  });
  it("no adyacente / fuera / fijo", () => {
    const st = stFrom(filler(8, 8));
    expect(trySwap(st, 0, 0, 2, 0)).toMatchObject({ ok: false, reason: "adjacent" });
    expect(trySwap(st, 7, 7, 8, 7)).toMatchObject({ ok: false, reason: "bounds" });
    st.board[0][1] = CRATE; st.crate[0][1] = 1;
    expect(trySwap(st, 0, 0, 1, 0)).toMatchObject({ ok: false, reason: "fixed" });
  });
  it("4 crea la sierra en la celda movida y el tablero queda lleno", () => {
    const b = filler(8, 8);
    b[7][0] = b[7][1] = b[7][3] = 0; b[6][2] = 0; // mover (2,6) abajo arma 4
    const st = stFrom(b);
    const r = trySwap(st, 2, 6, 2, 7);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.steps[0].made[0]).toMatchObject({ x: 2, y: 7 });
    expect(spOf(r.steps[0].made[0].v)).toBe(SP.H);
    expect(st.board.flat().every((v) => v >= 0)).toBe(true);
    expect(st.movesLeft).toBe(19);
  });
  it("núcleo + pieza común borra todas las de ese color", () => {
    const b = filler(8, 8);
    b[0][0] = "*" as unknown as number;
    const st = stFrom(b.map((r) => r.map((v) => v)) as (number | string)[][]);
    const target = colorOf(st.board[0][1]);
    const n = st.board.flat().filter((v) => colorOf(v) === target).length;
    const r = trySwap(st, 0, 0, 1, 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.steps[0].cleared.filter((c) => colorOf(c.v) === target).length).toBe(n);
  });
  it("sierra + sierra = cruz completa", () => {
    const b = filler(8, 8);
    b[3][3] = mk(2, SP.H); b[3][4] = mk(3, SP.V);
    const st = stFrom(b);
    const r = trySwap(st, 3, 3, 4, 3);
    expect(r.ok && r.combo).toBe("SIERRAS CRUZADAS");
    if (!r.ok) return;
    expect(r.steps[0].cleared.length).toBeGreaterThanOrEqual(15);
  });
  it("bomba + bomba = área 5x5", () => {
    const b = filler(8, 8);
    b[3][3] = mk(2, SP.BOMB); b[3][4] = mk(3, SP.BOMB);
    const st = stFrom(b);
    const r = trySwap(st, 3, 3, 4, 3);
    expect(r.ok && r.combo).toBe("PRENSA DOBLE");
    if (!r.ok) return;
    expect(r.steps[0].cleared.length).toBeGreaterThanOrEqual(25);
  });
  it("especial alcanzado dispara en cadena", () => {
    const b = filler(8, 8);
    b[7][0] = b[7][1] = 0; b[6][2] = 0; b[5][2] = mk(4, SP.V); // la línea no toca la sierra...
    b[7][3] = mk(3, SP.V); // ...pero esta sí: queda en la fila? no: solo si es del color. Probar con color 0
    b[7][3] = mk(0, SP.V);
    const st = stFrom(b);
    const r = trySwap(st, 2, 6, 2, 7);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.steps[0].blasts.some((x) => x.k === "v" && x.x === 3)).toBe(true);
  });
});

describe("obstáculos y objetivos", () => {
  it("caja vecina a una línea recibe golpe; la carga sale por el fondo", () => {
    const b: (number | string)[][] = filler(6, 6);
    b[4][0] = b[4][1] = 0; b[3][2] = 0; b[5][1] = "c"; // línea en fila 4 al bajar (2,3)
    const st = stFrom(b, { types: 5 });
    const r = trySwap(st, 2, 3, 2, 4);
    expect(r.ok).toBe(true);
    expect(st.got.crate).toBe(1);
    const st2 = stFrom([["g", 3, 0], [0, 0, 2]], { types: 5 });
    trySwap(st2, 2, 0, 2, 1); // la fila de abajo se limpia: la carga cae al fondo y sale
    expect(st2.got.cargo).toBe(1);
  });
  it("martillo, sierra e imán no gastan movimientos", () => {
    const st = stFrom(filler(8, 8));
    useTool(st, "martillo", 0, 0);
    useTool(st, "sierra", 0, 3);
    useTool(st, "iman", 2, 2);
    expect(st.movesLeft).toBe(20);
    expect(st.got.piece.reduce((a, b) => a + b)).toBeGreaterThanOrEqual(1 + 8 + 10);
  });
  it("sobrecarga final suma bonus y deja el tablero lleno", () => {
    const st = stFrom(filler(8, 8));
    st.movesLeft = 5;
    const f = finale(st);
    expect(f.made.length).toBe(5);
    expect(f.bonus).toBeGreaterThan(0);
    expect(st.board.flat().every((v) => v >= 0)).toBe(true);
  });
});

describe("campaña", () => {
  it.each(LEVELS.map((l) => [l.id, l] as const))("%s arranca sin grupos, con jugada y con layout rectangular", (_, lv) => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const st = newMatch3(lv, seed);
      expect(lv.layout.every((r) => r.length === st.w)).toBe(true);
      expect(findGroups(st.board, st.w, st.h).length).toBe(0);
      expect(hasValidMove(st)).toBe(true);
      expect(goalsMet(st)).toBe(false);
    }
  });
});
