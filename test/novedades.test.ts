import { describe, it, expect } from "vitest";
// @ts-expect-error módulo .mjs sin tipos
import { tituloDeAsunto, novedadesDeAsuntos } from "../scripts/lib/novedades.mjs";

describe("novedades desde commits", () => {
  it("convierte feat/fix y descarta el resto", () => {
    expect(tituloDeAsunto("feat(juego): nuevo pacto de hielo.")).toBe("Nuevo pacto de hielo");
    expect(tituloDeAsunto("fix: corrige el salto")).toBe("Corrige el salto");
    expect(tituloDeAsunto("chore: limpiar")).toBeNull();
    expect(tituloDeAsunto("feat(server): cola interna")).toBeNull();
    expect(tituloDeAsunto("feat(server): ranking visible [visible]")).toBe("Ranking visible");
    expect(tituloDeAsunto("docs: notas")).toBeNull();
    expect(tituloDeAsunto("refactor: x")).toBeNull();
  });
  it("máximo 3 y sin duplicar títulos", () => {
    const r = novedadesDeAsuntos(["feat: A uno", "feat: b dos", "fix: C tres", "feat: d cuatro", "feat: Ya existe"],
      [{ titulo: "ya existe" }], "2026-10-12");
    expect(r.map((e: any) => e.titulo)).toEqual(["A uno", "B dos", "C tres"]);
  });
});
