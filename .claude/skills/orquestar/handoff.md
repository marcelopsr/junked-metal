# Plantilla de handoff entre sesiones

Se escribe en `.claude/trabajo/HANDOFF.md` del repo (se pisa en cada handoff; lo durable ya está en el plan y la memoria). Solo lo necesario para continuar: sin historia de cómo se llegó, sin lo que ya está en CLAUDE.md o en el plan.

```
# Handoff <fecha>

## Dónde estamos
Dos o tres frases: en qué se está trabajando y en qué punto quedó.

## Decisiones vigentes que no están en otro lado
- Decisión — por qué (o ruta del documento donde quedó escrita).

## Estado del trabajo
- Hecho y verificado: … (con commit o evidencia)
- Hecho sin verificar: …
- A medias: … (qué falta, en qué archivos)
- Sin commitear: … (qué hay en el árbol de trabajo y de quién es)

## Próximos pasos, en orden
1. … (con el tipo de delegación y el perfil sugerido si aplica)

## Trampas conocidas
Cosas que ya fallaron o que parecen una cosa y son otra.

## Dónde leer
Rutas de la especificación, el plan, fichas, logs.

## Pendiente de decisión del usuario
Preguntas abiertas.
```

## Prompt de arranque para la sesión nueva

```
Continuamos el trabajo en <proyecto>. Usá la metodología del skill `orquestar`.
Antes de actuar leé `.claude/trabajo/HANDOFF.md` y los documentos que nombra.
Primer objetivo: <próximo paso 1>.
```
