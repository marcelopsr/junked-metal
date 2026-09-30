import { defineConfig } from "vite";

// Havok carga su .wasm por URL; el pre-bundling de Vite lo rompe.
export default defineConfig({ optimizeDeps: { exclude: ["@babylonjs/havok"] } });
