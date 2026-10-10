import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

// optimizeDeps.entries: escanear todas las páginas y módulos al arrancar; si no, una dependencia nueva (art-lab, import() dinámico) recarga la página a mitad de una prueba.
// Havok carga su .wasm por URL; el pre-bundling de Vite lo rompe.
// base relativa: el mismo build sirve en local (:4173) y en GitHub Pages (/junked-metal/).
// @babylonjs/core se desvía a src/bjs.ts (fachada con solo lo que el juego usa): el índice completo del paquete sumaba ~4 MB que se parsean antes de dibujar la portada.
export default defineConfig({ base: "./", server: { warmup: { clientFiles: ["./src/main.ts", "./src/kart.ts", "./src/art_lab.ts"] } }, resolve: { alias: [{ find: /^@babylonjs\/core$/, replacement: fileURLToPath(new URL("./src/bjs.ts", import.meta.url)) }] }, optimizeDeps: { entries: ["*.html", "src/**/*.ts"], exclude: ["@babylonjs/havok"] }, test: { exclude: [...configDefaults.exclude, ".claude/**"] } });
