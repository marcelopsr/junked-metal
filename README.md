# Junked Metal

Roguelite web tipo *Survivor.io*: un auto a control remoto sobrevive 10 minutos en un patio contra bichos y juguetes, elige mejoras en cartas y termina peleando con un jefe. También tiene Desafío diario, Carrera estilo kart (hasta 2 jugadores) y Batalla de globos.

**Jugar:** https://marcelopsr.github.io/junked-metal/ (compu y celular, instalable como app).

Hecho con Babylon.js, física Havok, TypeScript y Vite. Creado por TheDuende.

## Cómo jugar

| Acción | Teclado | Joystick | Celular |
|---|---|---|---|
| Acelerar / frenar | W / S o flechas | Gatillo derecho / izquierdo | Palanca en pantalla |
| Girar | A / D o flechas | Palanca izquierda | Palanca en pantalla |
| Turbo | Espacio | A | Botón en pantalla |
| Derrape | Shift | B | Botón en pantalla |
| Habilidad | E | X | Botón en pantalla |
| Pausa | Esc | Start | Botón de pausa |

Las armas disparan solas: hay que moverse, juntar las gemas de experiencia y elegir una mejora en cada nivel. Las teclas se pueden cambiar en Configuración → Controles.

## Desarrollo

```bash
npm ci
npm run dev        # servidor con recarga
npm test           # pruebas de lógica (Vitest)
npm run build      # tsc + build de producción en dist/
```

- Balance: todos los números viven en `src/balance.json` (`npm run balance:xlsx` genera la planilla).
- Herramientas de prueba headless (`sim`, `shots`, `perf`), reglas de trabajo y mapa del código: [CLAUDE.md](CLAUDE.md).
- Dirección de arte: [docs/ART_DIRECTION.md](docs/ART_DIRECTION.md).

Cada push a `master` corre las pruebas, compila y publica en GitHub Pages.
