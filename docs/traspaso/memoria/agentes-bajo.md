# Agentes de esfuerzo bajo, hasta 3 en paralelo

Todo trabajo delegado va a agentes de esfuerzo bajo (`sonnet-bajo` construye, `opus-bajo` diagnostica, `estudio-*`); nunca medio, alto ni Fable salvo pedido del dueño. Hasta 3 en paralelo con archivos disjuntos; `main.ts` de a uno; `render.ts`, `run.ts`, `world.ts`, `zones/common.ts`, `camera_rig.ts`, `bjs.ts` y `balance.json` los toca solo el orquestador.

**Why:** baja el costo del loop sin perder calidad (2026-10-14/15): el razonamiento lo pone el encargo, no el modelo. Antes (2026-10-04) había pedido solo `opus-bajo`; el equipo quedó lento con muchos navegadores y Vite por encargo.

**How to apply:** encargos largos y precisos (contexto, archivos, trampas conocidas, pasos, meta medible, verificación, formato de entrega) salidos de `npm run todos -- encargo <slug>`; si una tarea parece grande, partirla, no subir de modelo. Ver [probar-una-vez.md](probar-una-vez.md).
