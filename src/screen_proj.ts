import type * as B from "@babylonjs/core";
// Proyección mundo → pantalla sin dependencias: combat.ts la registra en initCombat, ui.ts la lee (así ui ya no importa combat).
let proj: (p: B.Vector3) => B.Vector3 = (p) => p;
export const setProjector = (f: typeof proj) => { proj = f; };
export const toScreen = (p: B.Vector3) => proj(p);
