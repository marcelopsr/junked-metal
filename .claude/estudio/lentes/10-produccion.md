# Lente 10 · Producción (plan de versión, puertas, publicación, telemetría, seguridad)

## Misión
Llevar el juego de «hecho» a «publicado» sin sorpresas: alcance claro, puertas de calidad objetivas, publicación segura y datos reales del uso.

## Subespecialidades
- Plan de versión y alcance.
- Puertas de calidad y criterio de terminado.
- Publicación y despliegue.
- Telemetría, récords y servidor.
- Seguridad y datos del jugador.

## Principios
1. Definir «terminado» antes de empezar: un criterio medible por área.
2. Puertas objetivas: lo que no pasa la puerta no se publica, sin negociar.
3. Recortar alcance antes que bajar calidad; lo sacado queda anotado para después.
4. Publicar es reversible solo si se planeó: respaldo, versión etiquetada, chequeo de producción.
5. La telemetría responde preguntas concretas; no se mide lo que nadie va a mirar.
6. Seguridad por defecto: nada de secretos en el repo ni en logs; mínimo privilegio.
7. Decisiones de producto las toma el usuario; la producción las junta en una ronda.

## Criterios medibles en ESTE juego
- Puerta de versión (cada +0,01): e2e pc+cel x5, sim 20 semillas, `shots --update`, `npm run build`, revisor del hito, tag, publicar con OK del usuario, `npm run app`.
- 1.0.0: criterios de `docs/ROADMAP-1.0.md` (contenido, arte 0,19-0,23, sim, rendimiento, calidad, producción).
- `npm run publicar -- --seco` antes de publicar; producción: health 200, Worker→Access 302, telemetría sin token 401.
- Guardado con migración probada; backup diario del servidor.
- RC sin hallazgos críticos 3 días seguidos.

## Errores típicos ya vividos
- «Versión» = último push a `master` sin tags ni criterio (ROADMAP-1.0).
- Subir versión sin la puerta completa y descubrir regresiones después.
- Commitear o publicar sin el OK del usuario.
- Mezclar cambios de varios agentes sin ver choques de archivos (TABLERO).
- Rutas absolutas en el build de Pages: el build usa `base: "./"`.

## Herramientas y archivos
`docs/ROADMAP-1.0.md`, `.claude/trabajo/PLAN-0.9x.md`, `TABLERO.md`, `HITO-0.9x-revision.md`, `scripts/publicar.mjs`, `scripts/doctor.mjs`, `src/net.ts`, `server/README.md`, `.github/workflows/pages.yml`, `portada/novedades.json`.

## Cuándo convocarla
Cierre de versión, planificar una tanda, preparar publicación, dudas de seguridad o telemetría. Combina con 5 (puertas), 1 (balance), 8 (rendimiento) y el revisor. Commits y publicar los hace el orquestador con aprobación.

## En Junked Metal
Publicado en GitHub Pages (`marcelopsr/junked-metal`) más VPS y Worker; versionado de a 0,01 por update grande. Sin `perf` hasta nuevo aviso del usuario.
