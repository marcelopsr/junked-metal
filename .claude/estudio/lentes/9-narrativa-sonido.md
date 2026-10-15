# Lente 9 · Narrativa y sonido (Director, lore, textos, sfx, música)

## Misión
Dar voz al mundo: que lo que se dice, se oye y se anuncia refuerce el humor del juguete y guíe al jugador sin interrumpirlo.

## Subespecialidades
- Director de ritmo y avisos de radio.
- Lore, personajes y bestiario.
- Textos de interfaz y de juego.
- Diseño de sonido sintetizado y música adaptativa.

## Principios
1. Cada texto cumple una función: informar, guiar o dar carácter; si no, sobra.
2. Frases cortas, concretas, con humor seco de juguete; sin explicar el chiste.
3. Un sonido por evento, distinguible por timbre aun con mucho ruido; los más importantes no se enmascaran.
4. El audio avisa antes de lo que se ve (jefe llegando, peligro fuera de cuadro).
5. Variedad sin molestar: pequeñas variaciones de tono evitan la repetición fatigosa.
6. La música sigue la tensión del Director, no la contradice.
7. Silencio también es diseño: dejar respiros.

## Criterios medibles en ESTE juego
- Texto: español neutro impersonal, sin voseo y sin emojis (grep en `src/` y `docs/`).
- Todo texto cabe en pc y cel sin cortarse (`shots`).
- Los 41 personajes con nombre, ficha y una línea de carácter.
- Eventos de jugabilidad críticos (jefe, daño bajo, nivel, pacto) con sonido propio en `sfx.ts`.
- `?mute` desactiva todo audio en pruebas; ninguna prueba depende del sonido.

## Errores típicos ya vividos
- Voseo (vos, tenés, elegí) colándose en textos del juego.
- Probar con audio activo: ruido en pruebas y molestia; siempre `?mute`.
- Textos con números (descripciones de armas) que quedan viejos al cambiar balance.
- Avisos de radio que caen en el centro del celular y tapan la acción.
- Lore largo que nadie lee; mejor en el bestiario que en la partida.

## Herramientas y archivos
`src/sfx.ts`, `src/encore.ts` (Director, pactos), `src/ui.ts` (avisos), `src/menu.ts` (bestiario, créditos), `src/intro.ts`, `docs/ART_DIRECTION.md` (tono de textos), `.claude/trabajo/ELENCO-brechas.md`, `src/balance.json` (nombres).

## Cuándo convocarla
Texto nuevo o dudoso, personaje o jefe nuevo, evento sin sonido, ritmo del Director. Combina con 1 (ritmo), 6 (sincronía efecto-sonido) y 7 (legibilidad del texto).

## En Junked Metal
Audio sintetizado (sin archivos), canales y sonidos de juego e interfaz en `sfx.ts`. Tono: diorama de juguete, humor de maqueta; sin emojis.
