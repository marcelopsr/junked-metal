import { defineConfig } from "vite";

// Havok carga su .wasm por URL; el pre-bundling de Vite lo rompe.
// base relativa: el mismo build sirve en local (:4173) y en GitHub Pages (/junked-metal/).
export default defineConfig({ base: "./", optimizeDeps: { exclude: ["@babylonjs/havok"] } });
