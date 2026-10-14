# Evaluación: helado, corrida 20261014-0046-s2

- Fecha: 2026-10-13
- Evaluador: gemini
- Material visto: `.evo/helado/20261014-0046-s2/hoja.png`, vistas individuales en `img/`, `run.json`

## Puntajes (1 a 10)

| Variante | Silueta | Proporciones | Integración | Identidad | Folded | Total /50 |
|---|---|---|---|---|---|---|
| original (i0) | 7 | 7 | 7 | 8 | 7 | 36 |
| vigente | 7 | 7 | 7 | 8 | 7 | 36 |
| i176 (rec) | 7 | 6 | 8 | 6 | 7 | 34 |
| i121 | 7 | 6 | 7 | 6 | 7 | 33 |
| i254 | 8 | 5 | 7 | 6 | 7 | 33 |

Criterios: silueta (se lee de lejos), proporciones (ruedas, masa, alto/largo), integración (piezas unidas, sin flotantes ni cruces), identidad (conserva al auto y lo distingue de la flota), Folded (chapa, perfiles, volumen real).

## Ganadora
Ninguna supera al original/vigente. La optimización redujo drásticamente el alto de la caja (`caja_alto` a 0.848, −40.9% en el rango), quitándole su identidad esencial de furgón de helados rechoncho.

## Defectos
- **i176**: El collar y soporte visible del cucurucho (`cucurucho_soporte` a 0.077) se integran de forma sólida y el cucurucho grande (+13.5%) aporta legibilidad, pero la caja aplastada le da aspecto de furgoneta utilitaria baja en lugar de vehículo de venta de helados.
- **i254**: Logra un cucurucho prominente (+20%), pero sufre el mismo aplastamiento excesivo de carrocería.

## Retroalimentación para la próxima corrida
Con nombres de genes de `src/car_genes.ts`:
- `caja_alto`: Elevar el piso de 0.8 a 0.9 (`g("carroceria", "caja_alto", 0.95, 0.9, 1.05)`). Esto evita que el algoritmo explote la reducción de altura para bajar el centroide y mejorar compacidad numérica a expensas de la identidad del modelo. (Ya corregido en el archivo).
- Próxima corrida: ejecutar con el nuevo piso en `caja_alto` para enfocar la búsqueda en el cucurucho, soporte, trocha y ruedas.

## Veredicto
- Garaje (vista cercana): No. Razón: La caja baja se ve desproporcionada y pierde encanto caricaturesco de juguete RC.
- Cámara de partida (lejos): No. Razón: La silueta se confunde con una van chata genérica; se requiere preservar la altura del furgón.

## Límites de esta evaluación
Render estático en modo headless a 256 px y 48 px; sin prueba dinámica de colisiones en pista.
