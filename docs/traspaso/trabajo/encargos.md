# Encargos y orquestación

Metodología `orquestar` (skill de usuario `~/.claude/skills/orquestar`): la sesión principal entiende, reparte, integra y verifica; los agentes construyen con un encargo autocontenido. Guía del repo: `.claude/trabajo/ARRANQUE.md`.

## Quién hace qué

- **Sesión principal:** entender con `graphify query`, decidir con AskUserQuestion, escribir el TODO, lanzar agentes, integrar, tocar los archivos compartidos (`main.ts`, `render.ts`, `run.ts`, `world.ts`, `zones/common.ts`, `camera_rig.ts`, `balance.json`).
- **Agentes de esfuerzo bajo** (`sonnet-bajo`, `opus-bajo`, `estudio-constructor`, `experiencia` para UI): un TODO cada uno, archivos disjuntos, hasta 3 en paralelo. El razonamiento lo pone el encargo, no el modelo.
- **Evaluadores sin edición:** `estudio-evaluador` mide contra la meta (ref_measure, sim), `estudio-qa` juega con el bot, `estudio-revisor` revisa el diff al cerrar una tanda, `revisor` cuando toca `server/`, guardado o dinero.
- **Arte:** lo decide Claude midiendo contra las referencias registradas; producto y balance se preguntan.

## El TODO es el encargo

1. `npm run todos -- tomar <slug> --cuenta mac --rama <rama>` (falla si otra cuenta lo tiene).
2. `npm run todos -- encargo <slug>` imprime cuerpo + pie de cierre (`.claude/trabajo/pie-encargo.md`): se pega tal cual al agente.
3. El cuerpo trae qué y por qué, alcance (toca / no toca), cómo verificar. Si falta algo, se completa el TODO antes de lanzar, no en el chat del agente.
4. Decisiones de diseño que aparezcan a mitad de camino: el agente propone opciones y no las aplica; se preguntan al dueño.

## Reglas que todo encargo repite

- Nada de `git checkout/restore/stash/reset` (el hook lo bloquea igual): el árbol tiene cambios de otras tandas.
- Nadie reinicia `rc-test*`; nada de servidores ni puertos propios; todo headless.
- Textos del juego neutros e impersonales; nada de emojis; números en `balance.json`.
- Todos los cambios de la tanda y UNA verificación al final (`npm run verificar -- --nivel tanda`).
- Informe final: implementado, verificado (comando y resultado), observado, pendiente, bloqueos.

Plantillas largas (contrato de delegación y handoff AME 17.2/17.3): `.claude/trabajo/ARRANQUE.md`.
