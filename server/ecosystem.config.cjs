module.exports = { apps: [{ name: "jm-net", script: "index.js", cwd: "/opt/junkedmetal", node_args: "--env-file=/opt/junkedmetal/.env", env: { NODE_ENV: "production" }, max_memory_restart: "2G" }] };
