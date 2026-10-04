// pm2: servidores del juego (robusto: reinicio con espera creciente, tope de memoria, logs con fecha en ./logs).
// Uso: pm2 start ecosystem.config.cjs · pm2 status · pm2 logs rc-dev --lines 50 · pm2 restart rc-dev · npm run demo:refresh
const base = {
  cwd: __dirname,
  script: "node_modules/vite/bin/vite.js",
  exec_mode: "fork",
  instances: 1,
  autorestart: true,
  watch: false, // Vite ya recarga solo (HMR); pm2 no debe reiniciar por cambios de archivos
  min_uptime: "10s", // si muere antes de 10 s cuenta como arranque fallido
  max_restarts: 15, // tope de reintentos seguidos antes de quedar en "errored"
  exp_backoff_restart_delay: 200, // espera creciente entre reintentos (200 ms, 300, 450…) para no martillar
  kill_timeout: 5000, // tiempo para cerrar limpio antes de forzar
  max_memory_restart: "1500M", // si Vite se infla, se reinicia solo
  merge_logs: true,
  time: true, // fecha y hora en cada línea de log
  env: { NODE_ENV: "development", FORCE_COLOR: "0" },
};
module.exports = {
  apps: [
    { ...base, name: "rc-dev", args: "--port 5173 --strictPort --host localhost", out_file: "logs/rc-dev.out.log", error_file: "logs/rc-dev.err.log" },
    { ...base, name: "rc-test", args: "--config vite.test.config.ts", out_file: "logs/rc-test.out.log", error_file: "logs/rc-test.err.log" },
    { ...base, name: "rc-demo", args: "preview --port 4173 --strictPort --host localhost", out_file: "logs/rc-demo.out.log", error_file: "logs/rc-demo.err.log", env: { ...base.env, NODE_ENV: "production" } },
  ],
};
