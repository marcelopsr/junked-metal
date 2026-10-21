# Junked Metal: instrucciones para cualquier agente (Codex, Antigravity, Cursor, Gemini, Claude)

Survivor.io roguelite web con autos RC en un patio gigante. Babylon.js 9 + Havok + TypeScript + Vite. Modo principal: ENCORE. Repo público `marcelopsr/junked-metal`.

Este archivo es la entrada única para agentes que no son Claude Code. Todo lo que importa viaja con el repo en Markdown plano, legible por cualquier herramienta:

1. **Protocolo y mapa:** `docs/traspaso/INDICE.md` (arranque en frío, qué leer para cada necesidad, reglas de la documentación). Estado actual: `docs/traspaso/HANDOFF.md`.
2. **Cómo se trabaja:** `docs/traspaso/trabajo/` (encargos, verificación, entornos, integración) y, para agentes sin Claude Code, `docs/traspaso/trabajo/otros-agentes.md` (equivalencias y límites).
3. **Reglas por tema:** `.claude/rules/*.md` (Havok, rendimiento, balance, hooks de dev, herramientas de prueba). Son Markdown normal: leerlas cuando se toque su área. No editar `.claude/settings.json` ni `.claude/hooks/`.
4. **Reglas del dueño:** `docs/traspaso/memoria/`. Decisiones y porqués: `docs/decisiones/`. Trabajo pendiente: `docs/todos/README.md` (`npm run todos`).
5. **Dirección de arte obligatoria:** `docs/ART_DIRECTION.md`, sección Vigente (Junked Metal Encore, diorama de juguete; Bebas Neue + Inter; paneles `#1a1d22` con filo rojo; tokens `--jm-*`; nada de emojis ni UI genérica). Referencias: `docs/art_direction/visual_reference_register.md`.

## Lo que no cambia según la herramienta

- Textos del juego en español neutro impersonal, sin voseo. Conversación en español.
- Todo número de balance en `src/balance.json`; todo lo que decide la partida usa `rng()`, nunca `Math.random`.
- Pruebas headless con los servidores pm2 (`rc-test` :5174): **nadie reinicia `rc-test*`**, nadie levanta servidores ni abre puertos propios, nadie abre el juego en un navegador con foco para verificar. Verificación: `npm run verificar -- --nivel rapido|tanda` una vez al final de la tanda.
- Nada de `git checkout/restore/stash/reset` sobre archivos: el árbol tiene trabajo de otros. Sin `git push` salvo pedido del dueño.
- Decisiones de producto, balance o textos visibles se preguntan al dueño antes (opción múltiple, recomendada primera); problemas ajenos se anotan como TODO nuevo en `docs/todos/`, no se arreglan de paso.
- Entender con `graphify query` antes de grep masivo; construir con la escalera ponytail (YAGNI, reusar, mínimo código).

En otra máquina: `npm install`, `npx playwright install chromium`, `npm run hooks:install` (pre-commit) y `npm run harness:check`. Para Gemini/Antigravity hay además `GEMINI.md` (modelo y skills de `.agents/skills/`). Para Claude Code manda `CLAUDE.md` (no versionado) más los hooks de `.claude/`.
