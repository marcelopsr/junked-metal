import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config";

// Servidor de PRUEBAS compartido (pm2 "rc-test", :5174): sin recarga automática ni vigilancia de archivos, para que las
// mediciones no se corten cuando alguien edita. Tras una tanda de cambios: `pm2 restart rc-test` y recién ahí probar.
export default mergeConfig(base, defineConfig({ cacheDir: "node_modules/.vite-test", server: { port: 5174, strictPort: true, host: "localhost", hmr: false, watch: null } }));
