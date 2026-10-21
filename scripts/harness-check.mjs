// npm run harness:check — prueba el harness de Claude Code del repo en ~2 s, sin tocar nada:
// settings.json válido y con los hooks esperados; hooks ejecutables; guard con casos que deben bloquear y pasar;
// hooks de sesión con JSON de ejemplo; reglas con frontmatter paths que matchean archivos reales; .gitignore versiona lo que debe;
// todos.check y docs:check. Sale 1 con la lista de fallos. Lo corren verificar --nivel rapido y el CI.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const mal = [];
const ok = (cond, msg) => { if (!cond) mal.push(msg); };
const hook = (nombre, entrada, env = {}) => spawnSync("sh", [join(RAIZ, ".claude/hooks", nombre)], { input: JSON.stringify(entrada), encoding: "utf8", cwd: RAIZ, env: { ...process.env, ...env } });

// 1. settings.json
let settings = {};
try { settings = JSON.parse(readFileSync(join(RAIZ, ".claude/settings.json"), "utf8")); } catch (e) { mal.push(`settings.json inválido: ${e.message}`); }
const hooks = settings.hooks ?? {};
for (const ev of ["PreToolUse", "PostToolUse", "Stop", "PreCompact", "SessionStart", "SubagentStart"]) ok(Array.isArray(hooks[ev]) && hooks[ev].length, `settings.json: falta el hook ${ev}`);
for (const ev of Object.values(hooks)) for (const m of ev) for (const h of m.hooks ?? []) {
  const f = (h.command.match(/\.claude\/hooks\/([\w-]+\.sh)/) ?? [])[1];
  ok(f && existsSync(join(RAIZ, ".claude/hooks", f)), `settings.json: hook ${h.command} no existe`);
}
ok((settings.permissions?.deny ?? []).some((d) => /rc-test/.test(d)), "settings.json: deny sin rc-test");

// 2. hooks ejecutables
for (const f of readdirSync(join(RAIZ, ".claude/hooks")).filter((x) => x.endsWith(".sh"))) ok(statSync(join(RAIZ, ".claude/hooks", f)).mode & 0o111, `hook sin permiso de ejecución: ${f}`);

// 3. guard: casos que deben bloquear (exit 2) y pasar (exit 0)
const bloquea = ["pm2 restart rc-test", "pm2 stop rc-test-3", "pm2 delete all", "git stash", "git restore src/a.ts", "git checkout -- src/a.ts", "git reset --hard HEAD", "git push --force origin master", "git push origin master", "pkill -f vite", "rm -rf src", "rm -rf /"];
const pasa = ["npm test", "git checkout feat/x", "git switch master", "pm2 restart rc-dev", "pm2 status", "rm -rf .shots/actual", "rm -rf node_modules", "git push origin master # push-ok", "git diff --stat", "ls -la"];
for (const c of bloquea) { const r = hook("guard.sh", { tool_input: { command: c } }); ok(r.status === 2, `guard deja pasar: ${c}`); }
for (const c of pasa) { const r = hook("guard.sh", { tool_input: { command: c } }); ok(r.status === 0, `guard bloquea de más: ${c} (${(r.stderr || "").trim()})`); }

// 4. hooks de sesión con JSON de ejemplo
let r = hook("session-start.sh", {}); ok(r.status === 0 && /Arranque en frío/.test(r.stdout) && /Tablero/.test(r.stdout), "session-start.sh no imprime arranque y tablero");
r = hook("subagent-start.sh", {}); ok(r.status === 0 && /REGLAS DE CIERRE/.test(r.stdout), "subagent-start.sh no imprime el pie de encargo");
r = hook("stop-verificar.sh", { stop_hook_active: true }); ok(r.status === 0 && !r.stdout.trim(), "stop-verificar.sh debe callar si stop_hook_active");
r = hook("tsc-post.sh", { tool_input: { file_path: "docs/x.md" } }); ok(r.status === 0, "tsc-post.sh no debe correr para .md");
r = hook("balance-check.sh", { tool_input: { file_path: "src/a.ts" } }); ok(r.status === 0, "balance-check.sh no debe correr fuera de balance.json");
r = hook("todos-post.sh", { tool_input: { file_path: "src/a.ts" } }); ok(r.status === 0, "todos-post.sh no debe correr fuera de docs/todos");

// 5. reglas: frontmatter paths que matchean archivos reales
const tracked = execFileSync("git", ["ls-files"], { cwd: RAIZ, encoding: "utf8" }).split("\n");
const globRe = (g) => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "(.*/)?").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$");
for (const f of readdirSync(join(RAIZ, ".claude/rules")).filter((x) => x.endsWith(".md"))) {
  const txt = readFileSync(join(RAIZ, ".claude/rules", f), "utf8");
  const m = txt.match(/^---\n([\s\S]*?)\n---/);
  ok(m && /paths:/.test(m[1]), `regla sin frontmatter paths: ${f}`);
  if (!m) continue;
  for (const g of [...m[1].matchAll(/^\s*-\s*"?([^"\n]+?)"?\s*$/gm)].map((x) => x[1])) ok(tracked.some((t) => globRe(g).test(t)), `regla ${f}: el path «${g}» no matchea ningún archivo versionado`);
  ok(txt.split("\n").length <= 200, `regla ${f} pasa de 200 líneas: partirla`);
}

// 6. .gitignore versiona el harness
const gi = readFileSync(join(RAIZ, ".gitignore"), "utf8");
for (const n of ["!.claude/settings.json", "!.claude/hooks/", "!.claude/rules/", "!.claude/skills/", "!.claude/agents/"]) ok(gi.includes(n), `.gitignore: falta ${n}`);
for (const f of ["AGENTS.md", "docs/traspaso/INDICE.md", "docs/todos/FORMATO.md", "scripts/git-hooks/pre-commit", ".claude/trabajo/pie-encargo.md"]) ok(existsSync(join(RAIZ, f)), `falta ${f}`);
ok(/\.claude\/trabajo\/pie-encargo\.md/.test(readFileSync(join(RAIZ, ".claude/hooks/subagent-start.sh"), "utf8")), "subagent-start.sh no lee pie-encargo.md");

// 7. todos.check y docs:check
r = spawnSync(process.execPath, ["scripts/todos.check.mjs"], { cwd: RAIZ, encoding: "utf8" }); ok(r.status === 0, `todos.check: ${(r.stderr || r.stdout).trim().split("\n").pop()}`);
r = spawnSync(process.execPath, ["scripts/docs-check.mjs"], { cwd: RAIZ, encoding: "utf8" }); ok(r.status === 0, `docs:check: ${(r.stdout || "").trim().split("\n").slice(1, 4).join("; ")}`);

if (mal.length) { console.error(`MAL harness:check (${mal.length})\n  ${mal.join("\n  ")}`); process.exit(1); }
console.log("OK harness:check");
