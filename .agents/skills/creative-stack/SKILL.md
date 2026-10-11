---
name: creative-stack
description: >-
  Drives the local Mac creative stack using ComfyUI with SDXL Base 1.0 accelerated by
  Apple Silicon Metal/MPS. Use to inspect models, execute diffusion workflows, generate
  illustrations, textures, hero backdrops, and character art, optimize images to WebP,
  and integrate assets into the project without replacing art with simple SVG/CSS.
---

# Local Creative Stack — ComfyUI + Metal / MPS (Apple Silicon M4 Pro)

*Anclado a `/Users/msalas/CreativeStack/README.md`, `docs/ART_DIRECTION.md` y `.agents/rules/creative-stack.md`.*

**Nivel de razonamiento recomendado:** `Gemini Flash — Medium` para preparación de prompts, parámetros y scripts; `Gemini Flash — High` para arquitectura de assets, pipelines de shaders/texturas y balance visual.

---

## 1. Reglas Invariantes del Stack Creativo

1. **ComfyUI local es la primera opción para arte visual:** Ilustraciones, hero artwork, fondos, albedos, calcos y texturas complejas deben generarse con el modelo SDXL instalado (`sd_xl_base_1.0.safetensors`).
2. **Prohibido el atajo en SVG/CSS:** No reemplazar una ilustración por polígonos simples en CSS o SVG por comodidad. El arte visual se genera con difusión; HTML, CSS y SVG se reservan para textos accesibles, controles, botones y telemetría HUD.
3. **GPU Metal / MPS obligatoria:** Ejecución 100% local con aceleración Apple Silicon Metal (MPS). Sin fallback a CPU, sin servicios cloud, sin nodos de pago.
4. **Coordinación y Concurrencia:** Una sola generación pesada a la vez en la GPU. Siempre verificar `http://127.0.0.1:8188/queue` antes de disparar un workflow. No interrumpir ni cancelar jobs de otros procesos o agentes.
5. **Sin texto en la imagen:** Generar arte libre de tipografía (`no text, no watermark, no words` en el prompt negativo); los títulos, números y textos se colocan mediante DOM/HTML con la fuente `Rajdhani`.

---

## 2. Acceso y Herramientas

| Componente | Ruta / Endpoint | Detalle |
|---|---|---|
| Servidor ComfyUI | `http://127.0.0.1:8188` | Escucha local, modo `--offline`, preview none |
| MCP Server | `comfy-local` en `~/.gemini/config/mcp_config.json` | Ejecutable `/Users/msalas/CreativeStack/venv/bin/comfy-mcp` |
| Inicio ComfyUI | `/Users/msalas/CreativeStack/start.command` | Abre Terminal con sesión de usuario y Metal activo |
| Cierre ComfyUI | `/Users/msalas/CreativeStack/stop.command` | Usar solo con cola vacía |
| Checkpoint base | `sd_xl_base_1.0.safetensors` | En `/Users/msalas/CreativeStack/ComfyUI/models/checkpoints/` |
| Workflow base | `/Users/msalas/CreativeStack/workflows/sdxl-web.json` | Grafo canónico SDXL (Loader, Prompts, Latent, KSampler, VAE, Save) |
| Salida de imágenes | `/Users/msalas/CreativeStack/ComfyUI/output/` | Subcarpetas por proyecto/encargo |
| Licencia | `/Users/msalas/CreativeStack/SDXL-LICENSE.md` | Licencia oficial Stability AI SDXL 1.0 |

---

## 3. Flujo Canónico de Generación

### Paso 1: Comprobar el Servidor y la Cola
```bash
# 1. Comprobar que ComfyUI responde y usa MPS
curl -s http://127.0.0.1:8188/system_stats

# 2. Comprobar la cola (debe estar vacía antes de lanzar)
curl -s http://127.0.0.1:8188/queue
```
Si `system_stats` no responde, ejecutar `/Users/msalas/CreativeStack/start.command` y esperar a que esté listo.
Si `queue_running` contiene elementos, esperar a que el proceso anterior finalice.

### Paso 2: Ejecutar el Workflow con la API Local
El script helper `scripts/creative-gen.mjs` permite despachar prompts deterministas al servidor local:
```bash
node scripts/creative-gen.mjs \
  --prompt "polished editorial illustration of a battered yellow RC buggy..." \
  --negative "text, watermark, blurry, distorted, low quality, logo" \
  --seed 42 \
  --steps 24 \
  --cfg 7.0 \
  --width 1024 \
  --height 1024 \
  --prefix "rc_fight/hero" \
  --out "public/images/hero.webp"
```

### Paso 3: Inspeccionar y Optimizar
1. Inspeccionar la imagen generada con `view_file` para validar anatomía, silueta, color y contraste.
2. Convertir y comprimir a WebP optimizado para web (usando `squoosh`, `cwebp` o Python `Pillow`).
3. Si el asset requiere transparencia (calco, sticker, elemento flotante), extraer o generar la máscara alfa limpia.

### Paso 4: Integrar y Verificar
1. Integrar el recurso en el HTML/CSS/TypeScript correspondiente.
2. Probar la pantalla afectada con `npm run shots -- --changed` o `--only <escenario>` en PC (1280×720) y móvil (390×844).
3. Registrar en la documentación del asset (o `HANDOFF.md`) los metadatos completos: prompt, negativo, semilla, pasos, cfg, dimensiones, modelo y workflow.
