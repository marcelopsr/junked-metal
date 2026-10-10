import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config";

// Servidor de PRUEBAS compartido (pm2 "rc-test", :5174): sin recarga automática ni vigilancia de archivos, para que las
// En un worktree `npm run test:restart` pasa RC_TEST_PORT (5200-5299) y el caché va a .vite-test/ (node_modules es un symlink al de la principal: por eso fs.strict off, si no Vite niega servir fuentes de fuera del worktree).
// mediciones no se corten cuando alguien edita. Tras una tanda de cambios: `pm2 restart rc-test` y recién ahí probar.
export default mergeConfig(base, defineConfig({ cacheDir: process.env.RC_TEST_PORT ? ".vite-test" : "node_modules/.vite-test", server: { port: Number(process.env.RC_TEST_PORT ?? 5174), strictPort: true, host: "localhost", hmr: false, watch: null, fs: { strict: !process.env.RC_TEST_PORT } } }));
