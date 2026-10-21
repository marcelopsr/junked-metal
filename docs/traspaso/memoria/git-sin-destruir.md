# Git sin destruir el trabajo de otros

Prohibido en encargos y en la sesión: `git checkout` de archivos, `git restore`, `git stash`, reset duro, `git clean`. Para revertir lo propio: copiar el archivo al scratchpad antes de tocarlo y volver a copiarlo. Commits locales con mensaje `tipo(área): qué`; push solo cuando el dueño lo pide o al publicar.

**Why:** 2026-10-14 un agente hizo `git checkout src/moon.ts` creyendo que no había otros cambios y borró el trabajo de la Luna de dos sesiones (se salvó por una copia casual).

**How to apply:** el hook `guard.sh` lo bloquea; el pie de encargo lo repite. Las ramas `worktree-agent-*` se borran solo después de integradas.
