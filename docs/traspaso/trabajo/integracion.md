# Integración y publicación

## De la rama del agente a master

1. El agente termina con `npm run verificar -- --nivel tanda` en verde y su informe.
2. La sesión principal revisa el diff (y `estudio-revisor` si la tanda es delicada), lo integra en master (`git merge` desde el worktree o aplica el diff) y marca `npm run todos -- estado <slug> en-lote` o `hecha`.
3. Varios agentes a la vez: cada uno en archivos disjuntos; los compartidos los integra la sesión principal, de a uno.
4. `npm run verificar -- --nivel rapido` tras integrar; `tanda` si se juntaron varias ramas.
5. Commit local con mensaje `tipo(área): qué` (feat, fix, chore, docs). Push solo cuando el dueño lo pide o al publicar.

## Publicar

`npm run publicar` (`-- --seco` primero): tests, build, e2e pc y cel, deploy a la VPS y al Worker, chequeos de producción, novedades en la portada y, con `--commit "msg"`, commit y push. Se publica cuando una tanda termina y no hay hallazgos críticos abiertos (TODOs con `prioridad: alta` y `origen: hallazgo`).

## Documentación que se actualiza al integrar

- `docs/todos/`: estados (`en-lote`, `hecha`); hallazgos nuevos como TODO `idea`.
- [../hecho/](../hecho/README.md) si cambió lo que existe; [../problemas/](../problemas/README.md) si algo se rompió y se arregló.
- `docs/decisiones/` si el dueño decidió algo; [../memoria/](../memoria/README.md) si dio una regla.
- `docs/ART_DIRECTION.md` y el registro de referencias si cambió el arte.
- `docs/HANDOFF-PROYECTOS.md` §5 y [../HANDOFF.md](../HANDOFF.md) al cerrar sesión.
- `graphify update .` lo hace el hook de git en cada commit; docs → `/graphify --update`.
