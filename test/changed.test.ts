import { describe, it, expect } from "vitest";
// @ts-ignore mjs sin tipos
import { mapOf, sessionHashes } from "../scripts/lib/changed.mjs";
describe("changed: archivo -> sesiones", () => {
  it("libre_skate no dispara sesiones", () => expect(mapOf("src/zones/libre_skate.ts")).toEqual([]));
  it("ui.ts elige las de HUD", () => expect(mapOf("src/ui.ts")).toEqual(["partida", "partida_llena", "tactil"]));
  it("hash estable entre llamadas", () => expect(sessionHashes()).toEqual(sessionHashes()));
});
