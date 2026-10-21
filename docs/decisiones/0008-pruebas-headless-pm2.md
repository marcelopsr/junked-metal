# Pruebas headless sobre servidores pm2 autogestionados

Fecha: 2026-10-04 (base); 2026-10-15 (candado con latido) · Estado: aceptada

## Contexto
El usuario no corre comandos y varios agentes prueban a la vez; reiniciar servidores a mano rompía corridas ajenas. Detalle en [CLAUDE.md](../../CLAUDE.md) y [pruebas-herramientas.md](../../.claude/rules/pruebas-herramientas.md).

## Decisión
Las herramientas (`shots`, `sim`, `perf`, `e2e`) usan un Chromium headless contra servidores pm2 (`rc-test`, grupo de 6, uno por worktree). Nadie los reinicia: se autogestionan y sirven siempre el código actual. Candado lector/escritor con latido.

## Alternativas
Levantar Vite propio por agente (puertos y memoria); abrir el navegador a mano.

## Consecuencias
Nunca `pm2 restart/stop/delete` de `rc-test*`. `perf` es exclusivo. Probar en silencio (`?mute`).
