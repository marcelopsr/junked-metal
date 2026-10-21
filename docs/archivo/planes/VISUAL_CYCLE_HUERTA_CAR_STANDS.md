# Ciclo visual local: huerta del patio y auto sobre caballetes

Fecha: 2026-10-14. Alcance elegido: generar variación cromática en las hojas de la huerta y mejorar la lectura de los neumáticos del auto del garaje. Sin capturas; sin cambios de posición, geometría ni colisiones.

## Plan

- Mantener el número y la distribución de hojas y surcos; variar solo sus tonos verdes para separar las hileras.
- Mantener el Folded del auto y sus colisiones; asignar un caucho visual más claro solo al auto sobre caballetes del garaje.
- No tomar capturas. Verificar TypeScript, pruebas, build y actualizar graphify.

## Resultado

- Las hojas alternan cuatro tonos verdes próximos en la misma disposición; no se añadieron mallas ni materiales por hoja.
- El caucho del auto del garaje usa `#4b4b46` como variante pintada, conservando el Folded y las colisiones; el auto de calle y el visor de laboratorio usan el valor predeterminado.
- `npx tsc --noEmit -p .`, `npm test` (178/178), `npm run build` y `graphify update .` pasaron. No se generaron capturas ni se midió rendimiento.
- Build: Vite mantiene el aviso de chunk mayor a 500 kB; el chunk `menu` es de 1,23 MB.
- Cierre local sin publicación.
