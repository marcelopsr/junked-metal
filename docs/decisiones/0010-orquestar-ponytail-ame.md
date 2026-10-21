# Metodología orquestar + ponytail + AME con subagentes de esfuerzo bajo

Fecha: 2026-10-15 · Estado: aceptada

## Contexto
Muchos agentes sobre los mismos archivos chocaban. Equipo y roles en [METODOLOGIA-EQUIPO](../../.claude/trabajo/METODOLOGIA-EQUIPO.md); criterios en [AME](../AME_MASTER_PROMPT.md).

## Decisión
La sesión principal reparte, encarga, integra y verifica con encargos autocontenidos (orquestar). Se construye con la escalera ponytail (YAGNI, reusar, stdlib). De AME se adopta el presupuesto de complejidad y la evidencia honesta. Subagentes de esfuerzo bajo; hasta 3 en paralelo sobre archivos disjuntos; archivos compartidos solo el orquestador.

## Alternativas
Un solo agente grande; agentes de esfuerzo alto por defecto.

## Consecuencias
Alto solo si un error sale caro. Ante conflicto mandan las reglas de [CLAUDE.md](../../CLAUDE.md). Guía: [ARRANQUE](../../.claude/trabajo/ARRANQUE.md).
