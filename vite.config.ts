import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Havok carga su .wasm por URL; el pre-bundling de Vite lo rompe.
// base relativa: el mismo build sirve en local (:4173) y en GitHub Pages (/junked-metal/).
// @babylonjs/core se desvía a src/bjs.ts (fachada con solo lo que el juego usa): el índice completo del paquete sumaba ~4 MB que se parsean antes de dibujar la portada.
export default defineConfig({ base: "./", resolve: { alias: [{ find: /^@babylonjs\/core$/, replacement: fileURLToPath(new URL("./src/bjs.ts", import.meta.url)) }] }, optimizeDeps: { exclude: ["@babylonjs/havok"] } });
