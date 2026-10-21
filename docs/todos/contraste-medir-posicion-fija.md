---
titulo: Contraste de ciudad y bosque: medir con auto en posición fija
estado: idea
area: arte
prioridad: media
origen: hallazgo
desde: 2026-10-21
---

## Qué y por qué
Con el bot el cuadro varía y la medida es ruido: escenarios de shots con el auto fijo. El decorado plano casi no mueve la métrica: haría falta masa vertical oscura (setos, fachadas bajas) dentro del encuadre. Bosque pc 0,15: pinos y rocas tapan el claro; abrir el camino o aclararlo.

## Alcance
- Toca: scripts/scenarios.mjs, zones/ciudad*.ts, zones/bosque*.ts.
- No toca: nada fuera de eso sin coordinar con el orquestador.

## Cómo verificar
- `npm run verificar -- --nivel tanda` + ref_measure sobre shots.

## Notas
Migrado del TABLERO.md viejo (`.claude/trabajo/archivo/TABLERO-2026-10.md`).
