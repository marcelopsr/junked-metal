# El repo público no versiona CLAUDE.md ni .claude

Fecha: 2026-10-12 (aprox., sin confirmar) · Estado: aceptada

## Contexto
El repo `marcelopsr/junked-metal` es público y publica en GitHub Pages. Ver [HARNESS](../HARNESS.md) sección de publicación y `scripts/publicar.mjs`.

## Decisión
El repo público no sube `CLAUDE.md`, `.claude/` ni `graphify-out/`, salvo `agents/`, `estudio/`, `settings.json`, `hooks/`, `rules/` y `skills/` (confirmado el 2026-10-21 en `.gitignore`). El zip de traspaso sí trae todo.

## Alternativas
Subir todo: expone herramientas internas y capturas.

## Consecuencias
`publicar` agrega solo lo versionado, nunca `-A`. Excepción de las rutas permitidas sin confirmar fecha.
