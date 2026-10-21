# Mapa de carpetas de la raíz

Fuente de la visión general: [../../HARNESS.md](../../HARNESS.md) (§6 sobre qué se versiona).

| Carpeta o archivo | Qué es |
|---|---|
| `src/` | Código del juego (TypeScript): ver [src.md](src.md) |
| `test/` | Pruebas vitest de lógica pura (`npm test`) |
| `scripts/` | Herramientas por línea de comandos: sim, shots, perf, e2e, verificar, publicar, todos, docs-check; `lib/` con navegador, candados y pool |
| `server/` | Servidor de red (login, PeerJS, TURN, panel) y `cf-login/` (Worker): ver [servidor.md](servidor.md) |
| `docs/` | Documentación: traspaso, todos, decisiones, plantillas, críticas, dirección de arte, planes |
| `portada/` | Páginas estáticas de la web pública (portada, guías, estado, `novedades.json`) |
| `public/` | Estáticos del juego (íconos, manifiesto, `sw.js`, modelos, música, texturas) |
| `assets-src/` | Fuentes de arte y audio (Blender, referencias, imagegen); pesado |
| `evo/` | Genomas e historial de la evolución de autos (`npm run evo`) |
| `src-tauri/` | Envoltorio de app nativa (`npm run app`) |
| `.claude/` | Agentes, reglas por tema, hooks, `trabajo/` (arranque, tablero viejo, handoffs) |
| `graphify-out/` | Grafo de conocimiento del código (`graphify query`) |
| `balance.xlsx` | Planilla generada desde `src/balance.json` |

## Qué no se versiona

Ver `.gitignore`: `node_modules/`, `dist/`, `logs/`, `.shots/`, `.perf/`, `.evo/`, `.e2e/`, `.verificar/`, `scratch/`, credenciales `.env*.local`, `graphify-out/`, `CLAUDE.md` y casi todo `.claude/` (salvo `agents/`, `estudio/`, `settings.json`, `hooks/`, `rules/`).
