# Invariantes y Protocolo del Stack Creativo Local (ComfyUI + Metal / MPS)

## 1. Principio Fundamental: Stack Local como Recurso Primario de Arte
- **ComfyUI local es la primera opción para producir arte visual:** ilustraciones, imágenes clave, fondos, albedos y texturas de los proyectos.
- **Prohibido el reemplazo por comodidad:** No sustituir una ilustración solicitada por figuras geométricas simples en SVG o CSS.
- **División de responsabilidades UI vs. Arte:**
  - **ComfyUI:** Ilustraciones ricas, texturas, arte heroico, retratos de personajes y ambientación.
  - **HTML, CSS y SVG:** Textos funcionales (con tipografía Rajdhani), botones, controles interactivos, telemetría y marcadores HUD que exigen nitidez vectorial y accesibilidad.
  - **Sin texto quemado en el arte:** Evitar textos generados dentro de las imágenes rasterizadas; superponerlos mediante HTML semántico.

## 2. Entorno de Ejecución y Hardware
- **Máquina y Aceleración:** Exclusivamente local en esta Mac (Apple Silicon M4 Pro), con aceleración por hardware **Metal / MPS obligatoria**.
- **Prohibido el fallback a CPU:** Si la GPU falla o no hay aceleración, diagnosticar el problema y reportar la limitación al usuario.
- **Servicios externos prohibidos:** No usar servicios en la nube, APIs comerciales de terceros, nodos de pago ni créditos externos.
- **Ciclo de vida del servidor:**
  - Si ComfyUI está apagado, iniciar `/Users/msalas/CreativeStack/start.command` en Terminal y esperar a que responda en `http://127.0.0.1:8188`.
  - No usar PM2 para ComfyUI (MTLCompilerService requiere sesión de usuario).
  - Detener con `/Users/msalas/CreativeStack/stop.command` únicamente cuando la cola de generación esté completamente vacía (`queue_running` y `queue_pending` vacíos).
- **Conexión MCP:** Servidor MCP `comfy-local` configurado en `~/.gemini/config/mcp_config.json` apuntando a `/Users/msalas/CreativeStack/venv/bin/comfy-mcp`.

## 3. Modelos y Workflows Base
- **Modelo base instalado:** SDXL Base 1.0 (`sd_xl_base_1.0.safetensors`), con licencia SDXL preservada en `/Users/msalas/CreativeStack/SDXL-LICENSE.md`.
- **Workflow base:** `/Users/msalas/CreativeStack/workflows/sdxl-web.json` (resolución base web 512×512 o 1024×1024, KSampler, VAEDecode, SaveImage).

## 4. Flujo de Producción de Cada Recurso
1. **Identidad visual:** Revisar la dirección de arte (`docs/ART_DIRECTION.md`, paleta `PAL`/`--jm-*`, tokens de chapa oscura, estilo Folded/Megabonk).
2. **Definición técnica:** Composición, paleta dominante, iluminación, proporciones (relación de aspecto) y destino en pantalla (viewport, escalado).
3. **Generación e inspección:** Generar propuesta con ComfyUI, inspeccionar el resultado visualmente y corregir lo necesario. Prohibido lanzar tandas masivas sin justificación.
4. **Optimización web:** Redimensionar, comprimir a WebP/PNG y aplicar canal alfa real si el recurso requiere transparencia.
5. **Integración y verificación:** Integrar en el código del proyecto y verificar únicamente las pantallas y comportamientos afectados, tanto en escritorio (1280×720) como en móvil (390×844).
6. **Metadatos y reproducibilidad:** Conservar junto al recurso (o en su catálogo de assets) el prompt exacto, negativo, modelo, semilla, pasos, CFG, workflow y licencia.

## 5. Coordinación Multiagente y Concurrencia
- **Generaciones pesadas estrictamente de a una:** Consultar `http://127.0.0.1:8188/queue` antes de encolar un trabajo. Si hay un trabajo en curso (`queue_running`), esperar a su finalización antes de someter uno nuevo.
- **No interrumpir trabajos ajenos:** No cancelar prompts ajenos ni reiniciar el servidor mientras otro agente o proceso tenga tareas pendientes.
- **Paralelismo en preparación:** Planificar prompts, estructuras y código en paralelo; sincronizar únicamente el momento de ejecución en la GPU.
