# Roadmap a Junked Metal Encore 1.0.0 (borrador 2026-10-15)

`package.json` ya dice 1.0.0 pero no hay tags ni criterio de cierre: hoy "versión" = último push a `master`. Este documento define qué es la 1.0.0 oficial y el flujo para llegar. Las decisiones marcadas **[producto]** las toma el usuario.

## 1. Qué es la 1.0.0 (definición de terminado)

Una expedición ENCORE completa, de punta a punta, que una persona nueva puede jugar en compu y celular sin ayuda, con arte coherente con las láminas y sin errores conocidos graves.

| Área | Criterio medible |
|---|---|
| Contenido | (ver decisiones, sección 5) Escenarios: patio, jardín, galpón, desván, pileta, cocina, 4 biomas, Luna día/noche. Los 41 personajes del bestiario con ficha frontal. Objetos ENCORE en 3D juguete. **[producto]** lista final de contenido congelada |
| Arte | Cada escena con cámara de juego mide contraste 0,19-0,23 (`ref_measure`); checklist visual del registro pasado por escena; cero piezas Folded visibles |
| Jugabilidad | `sim` 20 semillas × 600 s: 0 atascos del auto, curva de muertes dentro de la banda de balance; e2e pc y cel verdes en 5 semillas |
| Rendimiento | Celular de referencia **[producto: cuál]** ≥ 30 fps en partida llena con preset Bajo; compu ≥ 60 fps en Medio; `perf` sin regresión > 20 % entre RC y 1.0 |
| Calidad | `npm test` verde, 0 errores de consola en e2e, accesibilidad de menús (informe H10-H12 cerrado), textos en español neutro sin voseo |
| Producción | Guardado con migración probada desde las versiones públicas anteriores; servidor y récords estables (backup diario ya existe) |

## 2. Hitos

**Versionado (decisión 2026-10-15):** se sube de a 0.01 por cada update grande (0.90 → 0.91 → 0.92…), sin fijar de antemano cuántas faltan para la 1.0. Los nombres de la tabla de abajo (contenido completo, arte completo, beta) son etapas, no números: una etapa puede ocupar varias versiones. La 1.0.0 sale cuando se cumple la sección 1, no por número.


| Versión | Nombre | Se cierra cuando | Qué entra |
|---|---|---|---|
| 0.9.0 | Contenido completo | Todo el contenido de 1.0 existe y es jugable, aunque feo | Biomas registrados (hecho), objetos ENCORE faltantes (terminal de pactos, Director, baliza, recicladora, núcleo), jefes del elenco, autos |
| 0.95.0 | Arte completo | Toda escena y personaje pasó el checklist visual | Programas A-D de `PROGRAMA-2026-10-15.md`; Folded retirado del todo |
| 0.99.0 | Beta / RC | Congelamiento: solo arreglos | Balance (20 semillas), rendimiento en celular, accesibilidad, textos, tutorial/onboarding, playtest de personas **[producto: quiénes]** |
| 1.0.0 | Oficial | RC sin hallazgos críticos 3 días seguidos | Tag `v1.0.0`, notas de versión, página publicada |

## 3. Flujo de trabajo

1. **Versionado semántico con tags.** `package.json` vuelve a `0.9.0-dev` (**[producto]**: confirmar), cada hito es un tag `vX.Y.Z` en `master`; la pantalla de créditos muestra la versión.
2. **Tablero por hito.** `.claude/trabajo/TABLERO.md` agrupa los TODO por hito (0.9 / 0.95 / 0.99). Un TODO solo cierra con su verificación (ver CLAUDE.md «Verificar en proporción al cambio»).
3. **Loop de construcción** (el actual): orquestador + hasta 3 agentes bajo sobre archivos disjuntos, integrador único en compartidos, verificación cada 2 tandas, perf cada 3.
4. **Puerta de hito** (nuevo, una por hito): suite completa en segundo plano — `npm test`, e2e pc+cel × 5 semillas, `shots` completo con `--update` de referencias, `sim` 20 semillas, `perf` solo — y una revisión independiente (`revisor`) del diff del hito. Resultado en `.claude/trabajo/HITO-<versión>.md` (implementado / verificado / observado / pendiente).
5. **Commit y publicación por hito**, solo con OK del usuario: `npm run publicar -- --commit "..."` (ya genera novedades); luego tag.
6. **Congelamiento** desde 0.99: nada de contenido nuevo; lo nuevo va a una lista 1.1.
7. **Registro de decisiones**: cada decisión de producto queda en una línea en este archivo (sección 5).

## 4. Riesgos conocidos

- **Rendimiento en celular:** la oleada diorama subió el patio de 5,7 a 9,3 ms/cuadro y los triángulos ×2 en compu (sin medir en celular). Plan de recorte ya identificado (matas, arbustos y flores a la mitad en `lowQ`).
- **Mucho cambio sin commit** (oleada diorama + biomas): riesgo de perder trabajo. Recomendado un commit de respaldo antes de 0.9.
- **Arte generado inconsistente** (las refs vienen de ChatGPT): manda el conjunto, no una imagen suelta.
- **Contenido no congelado:** las tandas de imágenes siguen sumando ideas (jefes, objetos); sin lista cerrada, 0.9 no termina.

## 5. Decisiones de producto

| Fecha | Decisión |
|---|---|
| 2026-10-15 | Biomas: sorteo de vuelta + destino de ruta + comprables en el Taller. Neón = Luna de noche |
| 2026-10-15 | Alcance 1.0 congelado = lo existente a nivel lámina + criaturas nuevas de las refs (bicho taladro ref296, escorpión-cangrejo ref278, variantes ref173) + objetos ENCORE nuevos (cofre especial ref313, terminal de pactos, TV del Director en escena) + hovercraft (ref242) como auto comprable |
| 2026-10-15 | Versiones: package.json 0.9.0-dev, un tag por hito, publicar solo al cerrar hito con OK del usuario. Commit local de respaldo 712c788 (refs de imágenes sin versionar: 636 MB) |
| 2026-10-15 | Celular de referencia: Android gama media (~2022), 30 fps en preset Bajo en partida llena |
| 2026-10-15 | 6 pilotos nuevos entran a la 1.0 (12 → 18): osito, mecánica, cocinero, mago de cartón, fantasma, doble de riesgo |
| 2026-10-15 | Versiones de a 0.01 por update grande (v0.90.0, v0.91.0…); cada update cierra con la puerta de hito y se publica con OK |
| 2026-10-15 | Balance 1.0: sobrevivir 10 min con el bot en 40-55 % de las semillas (la curva actual); solo se corrigen picos injustos |
| 2026-10-15 | Fuera de 1.0 (lista 1.1): online/ranking semanal sin pulir, habilidades activas nuevas de pilotos. Seguridad del servidor H6-H9 entra en 0.99 |
| 2026-10-15 | Retratos de pilotos generados = arte final; sus modelos 3D se rehacen siguiendo esas imágenes |
| 2026-10-15 | Sensación (SENSACION-0.93.md): mini-turbo chico al soltar un derrape largo; hitstop 25-40 ms con tope en golpes fuertes/embestida/élite/jefe; anticipación de 200-250 ms antes de las cartas de nivel y cofre |
| 2026-10-15 | Accesibilidad: flecha discreta en el borde para ataques fuera de cámara (siempre); rayado amarillo y negro = peligro como regla de arte general; sacudida sigue prefers-reduced-motion; modo daltónico entra en la 1.0 |
| 2026-10-15 | Onboarding: primera expedición sin pactos (el primer pacto, ya en la 2.ª, sin reloj); directo a largar la primera vez (sin pantalla ENCORE, guía de controles integrada); avisos en el momento en que pasan (sin aviso largo al inicio); arranque tranquilo (~20 s sin enemigos y carta recomendada en el primer nivel); desafíos y «Más modos» ocultos hasta terminar la primera expedición |
| 2026-10-15 | Peligro (PELIGRO-0.93.md): flecha de borde para todos los avisos fuera de cámara (hasta 4); sonido de aviso propio por tipo de ataque de jefe; se crean zonas de pacto en el piso (beneficio o riesgo, rayadas si dañan) |
| 2026-10-15 | Música: temas libres CC0/CC-BY curados (tech-house, psicodélico/trip, ambient, algunos melancólicos) en loop, con atribución; suena en menús, Free Roam y ENCORE, con reproductor propio (elegir, saltar, aleatorio, solo música). La lista se aprueba antes de integrar |
| 2026-10-15 | Free Roam: un mundo grande con barrios conectados (skatepark, parque acuático, bosque nevado, circuito de obstáculos), sin enemigos ni reloj, cualquier auto desbloqueado; desafíos opcionales (coleccionables, aros, trucos con récord), modo foto y ciclo de luz lento |
| 2026-10-15 | Free Roam (FREEROAM-diseno.md D1-D7): botón propio en el menú, autos desbloqueados, trucos (aire, giros, vueltas, combo) sin barandas, ciclo de luz completo elegible en la pausa, balancín sí y rulo no, 24 tuercas doradas desbloquean una pintura, mapa 600×600. Perf habilitado SOLO para Free Roam |
| 2026-10-15 | Música = una RADIO global para todo el juego (siempre suena, se cambia de tema/estación desde cualquier lado); algunos momentos (jefes, menús, Free Roam) pueden tener temas propios o preferidos. Se sigue buscando psicodélico/psytrance libre |
| 2026-10-15 | Free Roam suma un barrio «parque» tipo Central Park: senderos para recorrer, laguito, arbustos y árboles, animales de juguete, juegos de plaza para niños (además del parque acuático) |
| 2026-10-15 | Zonas de pacto (ZONAS-PACTO.md): los 6 pactos propuestos (Camerino, Imán, Foco / Pegamento, Cables pelados, Trampilla), rayado en toda zona de riesgo, la carta nombra la zona, la zona se suma al efecto; se construyen antes de medir el balance de pactos |
| 2026-10-15 | La estación melancólica se llama «Radio Óxido y Fritanga» |
| 2026-10-15 | Demolición archivado: rama y tag `archivo/demolicion` (GitHub); se quita de master. Carrera y Junked Crush siguen en el repo como hasta ahora |
| 2026-10-15 | Radio y música sintetizada conviven (la sintetizada como capa baja en partida); música a 64 kbps |
