# Verificación en proporción al cambio, una sola vez al final de la tanda

Fecha: 2026-10-10 (proporción); 2026-10-04 (una vez) · Estado: aceptada

## Contexto
Probar todo cada vez era lento y caro. Filosofía del usuario, registrada en [CLAUDE.md](../../CLAUDE.md); memoria: [forma-de-probar](../../.claude/trabajo/memoria/forma-de-probar.md).

## Decisión
Se hacen todos los cambios de la tanda y se prueba una vez, según lo tocado: tsc siempre; vitest/shots/sim/perf/build solo si el cambio los afecta. Comando único: `npm run verificar -- --nivel rapido|tanda|puerta` ([verificar.mjs](../../scripts/verificar.mjs)).

## Alternativas
Suite completa en cada cambio; verificar pedacito por pedacito.

## Consecuencias
Suites completas solo para renovar referencias, publicar o si el usuario lo pide. El cierre separa implementado, verificado, observado y pendiente.
