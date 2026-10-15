import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config";

// Servidores de PRUEBAS (pm2 "rc-test" :5174, rc-test-2..6, rc-test-<worktree>): watcher de archivos ACTIVO (sirven siempre el código actual, nadie los reinicia) y HMR apagado:
// una edición no recarga páginas abiertas (las mediciones no se cortan) y cada corrida nueva carga de cero y toma el código nuevo.
// En un worktree `npm run test:restart` pasa RC_TEST_PORT (5200-5299) y el caché va a .vite-test/ (node_modules es un symlink al de la principal: por eso fs.strict off, si no Vite niega servir fuentes de fuera del worktree).
// Se ignoran las carpetas de salida de las herramientas (capturas, informes, worktrees) para no gastar el watcher.
const ignored = [".shots", ".perf", ".e2e", ".verificar", ".evo", ".vitest", ".claude", "graphify-out", "logs", "dist", "assets-src", ".capataz"].map((d) => `${process.cwd()}/${d}/**`); // anclado a la raíz: un worktree vive dentro de .claude/
export default mergeConfig(base, defineConfig({ cacheDir: process.env.RC_TEST_POOL ? `node_modules/.vite-test-${process.env.RC_TEST_PORT}` : process.env.RC_TEST_PORT ? ".vite-test" : "node_modules/.vite-test", server: { port: Number(process.env.RC_TEST_PORT ?? 5174), strictPort: true, host: "localhost", hmr: false, watch: { ignored: [...ignored, "**/.vite-test*/**"] }, fs: { strict: !process.env.RC_TEST_PORT || !!process.env.RC_TEST_POOL } } })); // RC_TEST_POOL: servidores 5175-5179 del grupo (cacheDir propio por puerto, mismo árbol)
