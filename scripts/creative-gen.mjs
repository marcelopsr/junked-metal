#!/usr/bin/env node
/**
 * scripts/creative-gen.mjs
 * Generador reactivo y reproducible para el stack creativo local (ComfyUI + SDXL + Metal/MPS).
 *
 * Características:
 * - Indicadores en tiempo real vía WebSocket: barra de progreso paso a paso, velocidad (s/it) y ETA.
 * - Cero esperas ciegas o timeouts silenciosos: detección de errores en <1s.
 * - Modo asíncrono no bloqueante (--async / --detach): encola el trabajo y retorna de inmediato con prompt ID.
 * - Modo seguimiento en vivo (--watch [prompt_id]): conecta a un trabajo en vuelo y transmite su progreso.
 * - Auto-inicio opcional (--auto-start): levanta ComfyUI si no está corriendo sin sleeps manuales.
 * - Conversión automática a WebP optimizado y guardado de metadatos de reproducibilidad (.meta.json).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import {
  checkServerHealth,
  getQueueState,
  startServerBackground,
  COMFY_HOST as IMPORTED_HOST,
} from "./comfy-status.mjs";

const COMFY_HOST = process.env.COMFY_HOST || IMPORTED_HOST || "http://127.0.0.1:8188";
const COMFY_WS_HOST = COMFY_HOST.replace(/^http/, "ws");
const COMFY_OUTPUT_DIR = "/Users/msalas/CreativeStack/ComfyUI/output";
const DEFAULT_WORKFLOW = "/Users/msalas/CreativeStack/workflows/sdxl-web.json";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    prompt: "",
    negative: "text, letters, watermark, logo, signature, words, blurry, distorted, low quality, bad anatomy",
    seed: 42,
    steps: 24,
    cfg: 7.0,
    sampler: "euler",
    scheduler: "normal",
    width: 1024,
    height: 1024,
    prefix: "creative/web",
    workflow: DEFAULT_WORKFLOW,
    out: null,
    webp: true,
    quality: 85,
    maxWaitSec: 300,
    inactivityTimeoutSec: 60,
    detach: false,
    watchId: null,
    autoStart: false,
    json: false,
  };

  for (let i = 0; i < args.length; i++) {
    const k = args[i];
    const v = args[i + 1];
    if (k === "--prompt") { opts.prompt = v; i++; }
    else if (k === "--negative") { opts.negative = v; i++; }
    else if (k === "--seed") { opts.seed = parseInt(v, 10); i++; }
    else if (k === "--steps") { opts.steps = parseInt(v, 10); i++; }
    else if (k === "--cfg") { opts.cfg = parseFloat(v); i++; }
    else if (k === "--sampler") { opts.sampler = v; i++; }
    else if (k === "--scheduler") { opts.scheduler = v; i++; }
    else if (k === "--width") { opts.width = parseInt(v, 10); i++; }
    else if (k === "--height") { opts.height = parseInt(v, 10); i++; }
    else if (k === "--prefix") { opts.prefix = v; i++; }
    else if (k === "--workflow") { opts.workflow = resolve(v); i++; }
    else if (k === "--out") { opts.out = resolve(v); i++; }
    else if (k === "--no-webp") { opts.webp = false; }
    else if (k === "--quality") { opts.quality = parseInt(v, 10); i++; }
    else if (k === "--max-wait") { opts.maxWaitSec = parseInt(v, 10); i++; }
    else if (k === "--inactivity-timeout") { opts.inactivityTimeoutSec = parseInt(v, 10); i++; }
    else if (k === "--detach" || k === "--async") { opts.detach = true; }
    else if (k === "--auto-start") { opts.autoStart = true; }
    else if (k === "--json") { opts.json = true; }
    else if (k === "--watch") {
      opts.watchId = (v && !v.startsWith("--")) ? v : "active";
      if (opts.watchId !== "active") i++;
    }
    else if (k === "--help" || k === "-h") {
      console.log(`Uso: node scripts/creative-gen.mjs --prompt "..." [opciones]

Opciones principales:
  --prompt <str>            Prompt positivo (requerido para nueva generación)
  --negative <str>          Prompt negativo
  --seed <int>              Semilla determinista (default: 42)
  --steps <int>             Pasos de sampling (default: 24)
  --cfg <float>             CFG scale (default: 7.0)
  --sampler <str>           Sampler (euler, dpmpp_2m, etc.) (default: euler)
  --scheduler <str>         Scheduler (normal, karras, etc.) (default: normal)
  --width <int>             Ancho en píxeles (default: 1024)
  --height <int>            Alto en píxeles (default: 1024)
  --prefix <str>            Prefijo de archivo en output (default: creative/web)
  --out <path>              Destino final en el proyecto (.webp o .png)
  --no-webp                 Conservar formato PNG sin compresión WebP
  --quality <int>           Calidad WebP 1-100 (default: 85)

Modos de ejecución reactiva (sin bloqueos ni esperas manuales):
  --detach, --async         Encolar y retornar inmediatamente con el Prompt ID (no bloquea)
  --watch [id]              Conectarse a un trabajo en vuelo y monitorear con barra de progreso
  --auto-start              Iniciar ComfyUI automáticamente si está detenido
  --max-wait <sec>          Tiempo máximo total de espera (default: 300)
  --inactivity-timeout <s > Tiempo máximo sin eventos antes de cancelar (default: 60)
  --json                    Salida en formato JSON estructurado
`);
      process.exit(0);
    }
  }

  if (!opts.prompt && !opts.watchId) {
    console.error("Error: --prompt es obligatorio (o usa --watch [id] para monitorear un trabajo existente).");
    process.exit(1);
  }

  return opts;
}

function renderProgressBar(step, total, startTime) {
  const pct = Math.min(100, Math.round((step / total) * 100));
  const barLen = 22;
  const filled = Math.min(barLen, Math.round((pct / 100) * barLen));
  const bar = "=".repeat(Math.max(0, filled - 1)) + (filled > 0 && filled < barLen ? ">" : "=") + " ".repeat(Math.max(0, barLen - filled));

  const elapsedSec = (Date.now() - startTime) / 1000;
  const speed = step > 0 ? (elapsedSec / step).toFixed(2) : "0.00";
  const eta = step > 0 ? Math.max(0, ((total - step) * (elapsedSec / step))).toFixed(1) : "?";

  return `Paso ${String(step).padStart(2)}/${total} [${bar}] ${String(pct).padStart(3)}% | ${speed}s/it | ETA: ${String(eta).padStart(4)}s`;
}

async function submitWorkflow(workflowGraph, clientId) {
  const res = await fetch(`${COMFY_HOST}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: workflowGraph,
      client_id: clientId,
    }),
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fallo al enviar prompt a ComfyUI: HTTP ${res.status} - ${text}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(`ComfyUI error: ${JSON.stringify(data.error)}`);
  }
  return data.prompt_id;
}

/**
 * Espera reactiva con WebSocket y barra de progreso paso a paso.
 * Si WebSocket falla, recurre a polling adaptativo rápido (500ms).
 */
async function trackExecutionLive(promptId, clientId, opts) {
  return new Promise((resolvePromise, rejectPromise) => {
    let resolved = false;
    let ws = null;
    let fallbackInterval = null;
    let lastActivityTime = Date.now();
    const startTime = Date.now();
    let samplerStartTime = null;
    let finalOutputs = null;

    const cleanup = () => {
      if (ws) {
        try { ws.close(); } catch {}
        ws = null;
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
    };

    const fail = (err) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      rejectPromise(err);
    };

    const finish = (outputs) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolvePromise(outputs);
    };

    // Watchdog de inactividad
    const watchdogTimer = setInterval(() => {
      const inactiveSec = (Date.now() - lastActivityTime) / 1000;
      const totalSec = (Date.now() - startTime) / 1000;

      if (totalSec > opts.maxWaitSec) {
        clearInterval(watchdogTimer);
        fail(new Error(`Timeout total agotado (${opts.maxWaitSec}s) para el trabajo ${promptId}.`));
      } else if (inactiveSec > opts.inactivityTimeoutSec) {
        clearInterval(watchdogTimer);
        fail(new Error(`Timeout por inactividad (${opts.inactivityTimeoutSec}s sin señales de ComfyUI).`));
      }
    }, 2000);

    const tryFetchHistory = async () => {
      try {
        const res = await fetch(`${COMFY_HOST}/history/${promptId}`, {
          signal: AbortSignal.timeout(2000),
        });
        if (res.ok) {
          const hist = await res.json();
          if (hist[promptId]) {
            const outputs = hist[promptId].outputs || {};
            const status = hist[promptId].status || {};
            if (status.status_str === "error") {
              throw new Error(`ComfyUI reportó error en el trabajo: ${JSON.stringify(status.messages)}`);
            }
            return outputs;
          }
        }
      } catch (e) {
        if (e.message.includes("ComfyUI reportó error")) throw e;
      }
      return null;
    };

    // Conectar WebSocket nativo
    try {
      ws = new WebSocket(`${COMFY_WS_HOST}/ws?clientId=${clientId}`);
    } catch (e) {
      console.warn("[Advertencia] No se pudo abrir WebSocket, usando polling adaptativo rápido.");
      startFallbackPolling();
      return;
    }

    ws.onopen = () => {
      lastActivityTime = Date.now();
    };

    ws.onerror = () => {
      // Si WebSocket falla o se corta, pasar a polling continuo
      if (!fallbackInterval) startFallbackPolling();
    };

    ws.onmessage = async (event) => {
      lastActivityTime = Date.now();
      try {
        const msg = JSON.parse(event.data);
        const { type, data } = msg;

        // Comprobar si el mensaje corresponde a nuestro prompt
        if (data && data.prompt_id && data.prompt_id !== promptId) {
          return;
        }

        if (type === "status") {
          const queueRem = data.status?.exec_info?.queue_remaining ?? 0;
          if (queueRem > 0 && !samplerStartTime) {
            process.stdout.write(`\r[Cola] ${queueRem} trabajo(s) en cola...                   `);
          }
        } else if (type === "execution_start") {
          console.log(`\n▶ [Inicio] Ejecutando prompt ${promptId} en GPU Metal/MPS...`);
        } else if (type === "executing") {
          const node = data.node;
          if (node === null) {
            // Fin de la ejecución
            console.log("\n✔ [Fin] Pipeline completado exitosamente.");
            clearInterval(watchdogTimer);
            if (finalOutputs) {
              finish(finalOutputs);
            } else {
              // Si no recibimos 'executed' con las imágenes, consultar history
              const out = await tryFetchHistory();
              finish(out || {});
            }
          } else {
            // Fases conocidas de nodos canónicos
            let phaseName = `Nodo ${node}`;
            if (node === "1") phaseName = "Cargando Checkpoint SDXL";
            else if (node === "2" || node === "3") phaseName = "Codificando prompts CLIP";
            else if (node === "4") phaseName = "Inicializando Latente";
            else if (node === "5") {
              phaseName = "KSampler";
              if (!samplerStartTime) samplerStartTime = Date.now();
            } else if (node === "6") phaseName = "Decodificando VAE";
            else if (node === "7") phaseName = "Guardando Imagen";

            process.stdout.write(`\r[Fase] ${phaseName}...                                    `);
          }
        } else if (type === "progress") {
          if (!samplerStartTime) samplerStartTime = Date.now();
          const progressStr = renderProgressBar(data.value, data.max, samplerStartTime);
          process.stdout.write(`\r  ${progressStr}`);
        } else if (type === "executed") {
          if (data.output && data.output.images) {
            finalOutputs = { [data.node]: data.output };
          }
        } else if (type === "execution_error") {
          clearInterval(watchdogTimer);
          fail(new Error(`ComfyUI error en nodo ${data.node_id} (${data.node_type}): ${data.exception_message}`));
        } else if (type === "execution_interrupted") {
          clearInterval(watchdogTimer);
          fail(new Error("La ejecución fue interrumpida en ComfyUI."));
        }
      } catch (err) {
        // Ignorar errores de parsing individuales
      }
    };

    function startFallbackPolling() {
      if (fallbackInterval) return;
      fallbackInterval = setInterval(async () => {
        try {
          const out = await tryFetchHistory();
          if (out) {
            clearInterval(watchdogTimer);
            finish(out);
          }
        } catch (e) {
          clearInterval(watchdogTimer);
          fail(e);
        }
      }, 500);
    }
  });
}

async function locateGeneratedImage(outputs) {
  for (const nodeId of Object.keys(outputs || {})) {
    const nodeOutput = outputs[nodeId];
    if (nodeOutput.images && nodeOutput.images.length > 0) {
      const img = nodeOutput.images[0];
      const sub = img.subfolder ? `${img.subfolder}/` : "";
      const path = resolve(COMFY_OUTPUT_DIR, sub + img.filename);
      if (existsSync(path)) return path;
    }
  }
  return null;
}

async function main() {
  const opts = parseArgs();

  // 1. Salud del servidor y auto-arranque si está solicitado
  let health = await checkServerHealth(1500);
  if (!health.online) {
    if (opts.autoStart) {
      console.log("ComfyUI no está activo. Iniciando automáticamente (--auto-start)...");
      const started = await startServerBackground(20);
      if (!started) {
        console.error("Error: No se pudo arrancar ComfyUI automáticamente.");
        process.exit(1);
      }
      health = await checkServerHealth(1500);
    } else {
      console.error(`Error: ComfyUI no responde en ${COMFY_HOST}.`);
      console.error("Inícialo con: node scripts/comfy-status.mjs start  (o agrega la bandera --auto-start)");
      process.exit(1);
    }
  }

  // 2. Modo Watch (seguimiento de un trabajo existente)
  if (opts.watchId) {
    let targetPromptId = opts.watchId;
    if (targetPromptId === "active") {
      const queue = await getQueueState(1500);
      if (queue.running.length > 0) {
        targetPromptId = queue.running[0][1];
      } else {
        console.log("No hay trabajos activos actualmente en la cola de ComfyUI.");
        process.exit(0);
      }
    }

    console.log(`=== Conectando a trabajo en vuelo: ${targetPromptId} ===`);
    const clientId = `watcher-${Date.now()}`;
    const outputs = await trackExecutionLive(targetPromptId, clientId, opts);
    const genPath = await locateGeneratedImage(outputs);
    if (genPath) {
      console.log(`\nImagen generada: ${genPath}`);
    }
    process.exit(0);
  }

  console.log("=== ComfyUI Creative Stack Runner (Metal / MPS) ===");
  console.log(`Prompt: "${opts.prompt}"`);
  console.log(`Semilla: ${opts.seed} | Pasos: ${opts.steps} | CFG: ${opts.cfg} | Res: ${opts.width}×${opts.height}`);
  console.log(`ComfyUI v${health.version} | GPU: ${health.mps ? "Apple Silicon Metal (MPS)" : "CPU"}`);

  // 3. Preparar grafo de workflow
  if (!existsSync(opts.workflow)) {
    console.error(`Error: No existe el archivo de workflow: ${opts.workflow}`);
    process.exit(1);
  }
  const graph = JSON.parse(readFileSync(opts.workflow, "utf-8"));

  if (graph["2"]) graph["2"].inputs.text = opts.prompt;
  if (graph["3"]) graph["3"].inputs.text = opts.negative;
  if (graph["4"]) {
    graph["4"].inputs.width = opts.width;
    graph["4"].inputs.height = opts.height;
  }
  if (graph["5"]) {
    graph["5"].inputs.seed = opts.seed;
    graph["5"].inputs.steps = opts.steps;
    graph["5"].inputs.cfg = opts.cfg;
    graph["5"].inputs.sampler_name = opts.sampler;
    graph["5"].inputs.scheduler = opts.scheduler;
  }
  if (graph["7"]) {
    graph["7"].inputs.filename_prefix = opts.prefix;
  }

  // 4. Someter trabajo
  const clientId = `creative-agent-${Date.now()}`;
  const promptId = await submitWorkflow(graph, clientId);

  // 5. Si se solicitó modo asíncrono (--detach / --async), retornar de inmediato
  if (opts.detach) {
    const queue = await getQueueState(1000);
    const pendingAhead = queue.pending.length;
    const estSec = Math.round(opts.steps * 1.25 + 5);

    if (opts.json) {
      console.log(JSON.stringify({
        status: "enqueued",
        prompt_id: promptId,
        pending_ahead: pendingAhead,
        estimated_sec: estSec,
        command_watch: `node scripts/creative-gen.mjs --watch ${promptId}`,
        command_status: `node scripts/comfy-status.mjs`,
      }, null, 2));
    } else {
      console.log(`\n✓ Trabajo encolado exitosamente sin bloqueo.`);
      console.log(`Prompt ID:          ${promptId}`);
      console.log(`Trabajos adelante:  ${pendingAhead}`);
      console.log(`Tiempo estimado:    ~${estSec}s en GPU Metal (MPS)`);
      console.log(`\nPara monitorear en vivo:`);
      console.log(`  node scripts/creative-gen.mjs --watch ${promptId}`);
      console.log(`Para consultar estado instantáneo:`);
      console.log(`  npm run creative:status`);
    }
    process.exit(0);
  }

  // 6. Ejecución sincrónica con streaming reactivo
  const t0 = Date.now();
  const outputs = await trackExecutionLive(promptId, clientId, opts);
  const durationSec = ((Date.now() - t0) / 1000).toFixed(1);

  // 7. Localizar imagen generada
  const generatedPath = await locateGeneratedImage(outputs);
  if (!generatedPath || !existsSync(generatedPath)) {
    console.error("Error: No se encontró la imagen resultante en el disco.");
    process.exit(1);
  }

  console.log(`\nImagen generada en ${durationSec}s: ${generatedPath}`);

  // 8. Post-procesamiento y guardado web
  let finalPath = generatedPath;
  if (opts.out) {
    const outDir = dirname(opts.out);
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }

    if (opts.webp && opts.out.endsWith(".webp")) {
      console.log(`Convirtiendo a WebP (calidad ${opts.quality})...`);
      const cwebpBin = existsSync("/opt/homebrew/bin/cwebp") ? "/opt/homebrew/bin/cwebp" : "cwebp";
      execSync(`${cwebpBin} -q ${opts.quality} "${generatedPath}" -o "${opts.out}"`, { stdio: "inherit" });
      finalPath = opts.out;
    } else {
      execSync(`cp "${generatedPath}" "${opts.out}"`);
      finalPath = opts.out;
    }
    console.log(`Recurso guardado en: ${finalPath}`);
  }

  // 9. Metadatos de reproducibilidad (.meta.json)
  const metaPath = (opts.out ? opts.out : finalPath).replace(/\.[^.]+$/, ".meta.json");
  const meta = {
    source: "local-comfyui-mps",
    model: "sd_xl_base_1.0.safetensors",
    license: "Stability AI SDXL 1.0 Non-Commercial/Research/Commercial License (see /Users/msalas/CreativeStack/SDXL-LICENSE.md)",
    workflow: opts.workflow,
    prompt_id: promptId,
    prompt: opts.prompt,
    negative: opts.negative,
    seed: opts.seed,
    steps: opts.steps,
    cfg: opts.cfg,
    sampler: opts.sampler,
    scheduler: opts.scheduler,
    width: opts.width,
    height: opts.height,
    duration_seconds: parseFloat(durationSec),
    date: new Date().toISOString(),
    raw_output: generatedPath,
    final_output: finalPath,
  };
  writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf-8");
  console.log(`Metadatos guardados en: ${metaPath}`);
  console.log("=== Generación completada con éxito ===");
}

main().catch((err) => {
  console.error("\nError fatal:", err.message || err);
  process.exit(1);
});
