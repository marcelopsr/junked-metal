# Oleada 1c — materiales y siluetas (integrador)

Fecha: 2026-10-07 · Alcance: 13 enemigos jugables + 8 autos RC (`CARS` en `car.ts`).

## Checklist enemigos

| Id | Fuente | Cambio visual (bestiario / lab) |
|----|--------|----------------------------------|
| hormiga | `assets-src/ant/export_clean.py` → `ant.glb` | Caparazón más saturado; mandíbulas/antenas más gruesas (fat); ojos más grandes; emisión en material Eye en export. |
| escupidora | `escupidora.py` | Rojo más vivo; saco lima más brillante y emisivo; patas más oscuras; ojos ámbar más fuertes. |
| escarabajo | `escarabajo.py` | Caparazón verde metálico más claro; franjas Shine más lima; ojos emisivos ↑. |
| friccion | `models.ts` | Franja blanca en capó; faros con aro más grande y emisivo. |
| robot | `models.ts` | Cinturón dorado en torso; ojos amarillos más grandes. |
| polilla | `models.ts` + `wingTemplate` | Alas más claras con manchas oscuras y spot crema; ojos PBR sin cambio de tamaño. |
| rey | `models.ts` + `LEGS` | Manchas crema en élitros; ojos lima más grandes; rodillas verdes emisivas; patas un poco más gruesas. |
| tarantula | `models.ts` + `LEGS` | (Oleada 1b base) ojos fucsia; rodillas más brillantes; patas más gruesas. |
| cortadora | `models.ts` | Ride-on rojo/gris: volante en cruz, barra negra, ruedas con hub dorado. |
| aspiradora | `models.ts` | Disco con paragolpes, domo, ojos rojos frontales grandes, cepillos laterales. |
| cortacercos | `models.ts` | Bloque naranja, mango D, espada dentada, LEDs rojos. |
| perro | `perro.py` | Contraste pecho blanco / gris cuerpo; ojo con emisión suave en GLB. |
| gato | `gato.py` | Naranja y rayas más contrastadas; panza más clara; ojos verdes con emisión. |

`DEF.size` / `GLB.scale`: sin cambios.

## Checklist autos (garaje)

| Id | Nombre | Cambio visual |
|----|--------|----------------|
| buggy | El Divorciado | Faldón negro; franja trim lateral; amarillos en roll cage. |
| monster | El Loco Cuarentón | Fender flares rojos; banda oscura en cabina. |
| formula | El Apurado | Línea blanca central; placa trim delantera. |
| tanque | El Suegro | Franja en torreta; postes trim laterales. |
| carrera | El Sin Seguro | Damero blanco/negro en techo (franjas). |
| axel | El Sin Licencia | Plataforma oscura; aro amarillo en ruedas. |
| helado | El Tío del Helado | Banda rosa en caja; moldura trim lateral. |
| combi | El Tío Raro | Ondas bicolor en costado; paragolpes oscuro. |

**Todos:** banda blanca en llanta toy; goma más oscura (`M.rubber`); piloto soldadito con visor y ojos negros; faros/parrillas del bloque común sin cambio de lógica.

## Archivos tocados

- `assets-src/ant/export_clean.py`, `escupidora/escupidora.py`, `escarabajo/escarabajo.py`, `perro/perro.py`, `gato/gato.py`
- `public/models/*.glb` (re-export)
- `src/models.ts`, `src/render.ts` (solo `M.rubber`)

## Verificación

```bash
pm2 restart rc-test
npx tsc --noEmit -p .
npm test
npm run build
npm run shots -- --only bestiario,garaje,lab
npm run shots -- --only bestiario,garaje --update
```
