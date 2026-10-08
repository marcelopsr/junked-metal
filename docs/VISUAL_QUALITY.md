# Calidad visual — registro de evolución

Historial acumulativo: cada evaluación se agrega abajo, nunca se reemplaza. Las notas (1-10) son una
rúbrica para comparar iteraciones entre sí, no una medida objetiva. Una nota sube solo con evidencia
visual (captura antes/después en las mismas condiciones), nunca porque se tocó un archivo.

## Método

### Qué aporta Impeccable (capacidades reales, v. instalada en `~/.claude/skills/impeccable`)
- `impeccable detect --json <archivos>`: detector mecánico de antipatrones de UI web (HTML/CSS/TS):
  transiciones de layout, easing con rebote, bordes de acento laterales, imágenes rotas, etc.
  **No ve el canvas 3D**: solo evalúa el HUD y los menús DOM.
- Comandos de criterio (`critique`, `audit`, `polish`, `layout`, `typeset`…): guías y heurísticas
  (Nielsen, carga cognitiva) para pantallas DOM. `critique` exige dos evaluaciones aisladas en
  subagentes (diseño + detector).
- Subagentes propios (`impeccable-finish-reviewer`, etc.) pensados para builds web con un DESIGN.md;
  el proyecto no tiene PRODUCT.md/DESIGN.md (pendiente `/impeccable init` si se quiere usar a fondo).
- Para las escenas 3D Impeccable no alcanza: se complementa con `npm run shots` (capturas
  deterministas), `npm run perf` y un revisor independiente con la rúbrica de abajo.

### Condiciones de captura (reproducibles)
`npm run shots -- --vp pc` contra pm2 `rc-test`: 1280x720, `?mute&seed=3`, preset Medio, bucle
congelado a 1/60 s por cuadro, cámara y estado fijados por `scripts/scenarios.mjs`. Las capturas de
referencia se guardan en `docs/visual/<fecha>-<etapa>/` en WebP (q82).

### Rúbrica (misma en cada evaluación)
| # | Dimensión | Qué se mira |
|---|---|---|
| 1 | Geometría | Siluetas, uniones visibles, nada de bloques sin intención |
| 2 | Materiales | Se distingue chapa / plástico / quitina / madera |
| 3 | Texturas | Desgaste con lógica (bordes, uso), no ruido uniforme; resolución adecuada |
| 4 | Iluminación y profundidad | Dirección de luz, sombras de contacto, separación de planos |
| 5 | Composición | El foco del juego está en cuadro, el HUD no lo tapa |
| 6 | Coherencia Folded 2.5D / ART_DIRECTION | Cumple las reglas vigentes |
| 7 | Legibilidad | Se lee el gameplay: jugador, amenazas, objetivos |
| 8 | Acabado | Sin cortes, solapes, textos a medio dibujar, piezas a medio hacer |
| 9 | Personalidad | Humor, escala de juguete, identidad propia |
| 10 | Integración | Los elementos pertenecen al mismo mundo |

### Ciclo
Capturar → auditar (detector + revisor independiente) → diagnosticar la causa (geometría, textura,
luz, composición, material, presentación) → implementar → recapturar igual → reevaluar con la misma
rúbrica (revisor que no hizo el cambio, sin decirle cuál es la versión nueva) → verificar
(`tsc`, `npm test`, `build`, `shots --diff`, `perf`) → iterar.

---

## 2026-10-08 · Línea base

**Capturas:** `docs/visual/2026-10-08-base/` (14 escenas, pc).
**Evaluador:** subagente `revisor` independiente, con ART_DIRECTION y la rúbrica; no hizo cambios.
Nota del evaluador: ART_DIRECTION se contradice (sección HUD «terminal gastada» con VT323 vs. la UI
actual Rajdhani/kit); priorizó las secciones más nuevas (Folded, Megabonk, Etapa 2).

| Escena | Geo | Mat | Tex | Ilum | Comp | Coh | Leg | Acab | Pers | Integ |
|---|---|---|---|---|---|---|---|---|---|---|
| Survivor · lab-noche | 5 | 5 | 5 | 4 | 6 | 6 | 6 | 6 | 6 | 5 |
| Survivor · lab-jefes | 6 | 7 | 7 | 6 | 4 | 7 | 5 | 5 | 8 | 5 |
| Survivor · partida-curso | 4 | 4 | 5 | 4 | 3 | 4 | 5 | 4 | 4 | 4 |
| Survivor · partida-cartas | n/a | n/a | 5 | 6 | 6 | 5 | 7 | 6 | 7 | 5 |
| Carrera · largada | 5 | 4 | 5 | 4 | 7 | 3 | 7 | 5 | 6 | 4 |
| Carrera · curso | 4 | 4 | 5 | 4 | 5 | 3 | 5 | 4 | 5 | 4 |
| Junket Crush · gabinete | 7 | 7 | 6 | 6 | 5 | 8 | 8 | 5 | 7 | 6 |
| Junket Crush · juego | 7 | 7 | 7 | 7 | 8 | 8 | 8 | 7 | 8 | 8 |
| Menú · portada | 7 | 6 | 6 | 8 | 7 | 7 | 8 | 8 | 8 | 8 |
| Menú · principal | 6 | 7 | 6 | 7 | 5 | 5 | 8 | 6 | 5 | 6 |
| Menú · garaje | 6 | 6 | 6 | 6 | 5 | 6 | 8 | 6 | 8 | 6 |
| Menú · bestiario | n/a | n/a | 5 | 6 | 4 | 5 | 6 | 4 | 7 | 4 |

Demolición (armado 3-5, pelea 2-7) se evaluó pero **el modo quedó descontinuado** (decisión del
usuario, 2026-10-08): fuera de las próximas iteraciones. Se probó una corrección de cámara (no
quedar detrás del muro del ring) y se revirtió por la discontinuación.

### Problemas identificados (causa → arreglo propuesto)
1. **Carrera** (material, luz, presentación): sin post retro ni paleta de clima, niebla lechosa sin
   dirección de luz, rectángulos que flotan en el cielo, público y vallas de color plano sin desgaste:
   choca con los autos Folded. → Mismo shader retro, materiales FOLD, fondo como siluetas de la casa.
2. **Survivor en partida** (composición, luz): aviso de radio y tutorial tapan el centro, el tutorial
   sigue a 1:30 (en la captura no hubo entrada del jugador), sin luz direccional ni sombra de contacto,
   4 enemigos rojo-naranja. → Avisos en banda superior, tutorial que se va solo, sombra de contacto por
   instancia, tonos base distintos por bicho.
3. **Textos del mundo y uniones** (presentación, geometría): pósters en español y el mismo póster en
   dos idiomas (`src/kit3d.ts:138`), patas de jefes sin unión visible.
4. **Bestiario** (composición, acabado): fila cortada y pisada por «MEJORES PARTIDAS», descripciones
   truncadas, sin miniaturas de los bichos.
5. **Junket Crush gabinete** (textura, composición): desgaste uniforme en todo el mueble; dos manchas
   verdes planas en los laterales (sin confirmar en código qué son).
- Falso positivo de captura: «TRAY@» en el aviso es el efecto de tipeo a medio camino, no un error.

### Detector Impeccable (`detect --json index.html src`): 19 hallazgos
- 8 `bounce-easing` (menu.css, hud.css, match3.css, replay.css, style.css): **se mantienen**, el rebote
  es parte del tono cartoon de juguete; la regla del detector apunta a UI de producto.
- 5 `layout-transition` (`transition: width` en barras de vida/carga): real, menor; pasar a
  `transform: scaleX` si aparece en `perf`.
- 3 `side-tab` (kit.css:114, match3.css:171, menu.css:278) y 1 `border-accent-on-rounded`
  (kit.css:172): revisar contra el kit; candidatos a quitar.
- 2 `broken-image` (index.html, match3.ts:625 con `src=""` inicial): se llena por código; verificar
  que nunca se vea vacío.
- 1 `repeating-stripes-gradient` (index.html): franjas de peligro, intencional.

### Fortalezas a no perder
Junket Crush en juego (mejor integración Folded), la escritura con humor (cartas, bestiario), la escala
de juguete en el cuarto de la portada y los jefes de chapa gastada.

### Cambios implementados / puntuación posterior
Ninguno todavía en esta entrada: la intervención de Demolición se revirtió. Próximas prioridades:
Carrera (1) y Survivor en partida (2).
