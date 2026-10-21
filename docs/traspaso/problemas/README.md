# Problemas: síntoma, causa, arreglo

Solo lo que ya pasó y se resolvió o se diagnosticó. Cada archivo es un área; cada entrada sigue el orden síntoma, causa, arreglo, y enlaza la fuente (informe de QA, revisión o TODO). Lo todavía abierto vive en [`docs/todos/`](../../todos/README.md).

| Archivo | Qué cubre |
|---|---|
| [havok.md](havok.md) | Trampas de física y casos reales: macetas en el origen, masa e inercia, centro de masa, colisionadores faltantes |
| [servidores-de-prueba.md](servidores-de-prueba.md) | Candados colgados, servidor viejo, worktrees sin node_modules, HMR que recarga, foco del navegador |
| [capturas-y-diff.md](capturas-y-diff.md) | Ruido de 5-10 % sin freeze, tolerancias, referencias desactualizadas, medir contraste |
| [balance-y-bot.md](balance-y-bot.md) | Bot atascado, pozo de la pileta, armas que dominan, victorias fuera de meta, layout que mueve la semilla |
| [visual.md](visual.md) | Contraste bajo, cámara tapada, props invisibles en y=-500, texturas liberadas, glifos faltantes |
| [online-y-servidor.md](online-y-servidor.md) | Seguridad H4-H9, manifest sin crossorigin, panel roto, tests que pegaban a la red |

Los informes originales están en [`.claude/trabajo/archivo/`](../../../.claude/trabajo/archivo/TABLERO-2026-10.md) (tablero viejo con hallazgos H1-H28) y en [`docs/AUDITORIA-seguridad-server.md`](../../AUDITORIA-seguridad-server.md). El catálogo de lo existente está en [hecho](../hecho/README.md).

Un problema nuevo se anota como TODO (`docs/todos/`), no se arregla de paso; al resolverse se agrega acá con su causa.
