# Handoff siempre; el dueño no corre comandos

Si el contexto se acerca al límite, dejar un handoff completo para que lo continúe otra sesión o cuenta: estado del árbol, qué está hecho y verificado, qué está a medias, qué sigue (plantilla AME 17.3 en `.claude/trabajo/ARRANQUE.md`). El dueño no ejecuta herramientas ni comandos: Claude orquesta todo y le cuenta el resultado.

**Why:** pedido del 2026-10-14; la memoria personal no viaja entre cuentas.

**How to apply:** [../HANDOFF.md](../HANDOFF.md) al cerrar sesiones largas; el hook PreCompact deja `.claude/trabajo/HANDOFF-auto.md` solo (completar objetivo y siguiente acción).
