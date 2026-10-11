#!/usr/bin/env node
/**
 * scripts/creative-gen.mjs
 * Generador reproducible para el stack creativo local (ComfyUI + SDXL + Metal/MPS).
 * Respeta la cola multiagente, verifica aceleración MPS y guarda metadatos.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname, basename, extname } from "node:path";

const COMFY_HOST = "http://127.0.0.1:8188";
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
    else if (k === "--help" || k === "-h") {
      console.log(`Uso: node scripts/creative-gen.mjs --prompt "..." [opciones]
Opciones:
  --prompt <str>      Prompt positivo (requerido)
  --negative <str>    Prompt negativo
  --seed <int>        Semilla determinista (default: 42)
  --steps <int>       Pasos de sampling (default: 24)
  --cfg <float>       CFG scale (default: 7.0)
  --sampler <str>     Sampler (euler, dpmpp_2m, etc.)
  --scheduler <str>   Scheduler (normal, karras, etc.)
  --width <int>       Ancho (default: 1024)
  --height <int>      Alto (default: 1024)
  --prefix <str>      Prefijo en output (default: creative/web)
  --out <path>        Destino final en el proyecto
  --no-webp           No convertir a WebP (dejar PNG)
  --quality <int>     Calidad WebP 1-100 (default: 85)
`);
      process.exit(0);
    }
  }

  if (!opts.prompt) {
    console.error("Error: --prompt es obligatorio.");
    process.exit(1);
  }

  return opts;
}

async function checkComfyHealth() {
  try {
    const res = await fetch(`${COMFY_HOST}/system_stats`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const mpsDevice = (data.devices || []).find(d => d.type === "mps");
    if (!mpsDevice) {
      console.warn("ADVERTENCIA: No se detectó dispositivo Metal/MPS en system_stats.");
    }
    return { ok: true, stats: data, mps: !!mpsDevice };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function waitForEmptyQueue(maxWaitSec = 300) {
  const start = Date.now();
  while (true) {
    try {
      const res = await fetch(`${COMFY_HOST}/queue`);
      const queue = await res.json();
      const running = queue.queue_running || [];
      const pending = queue.queue_pending || [];
      if (running.length === 0 && pending.length === 0) {
        return true;
      }
      console.log(`[Queue] Esperando cola ocupada (${running.length} en curso, ${pending.length} pendientes)...`);
    } catch {
      // Ignorar errores transitorios de red
    }
    if ((Date.now() - start) / 1000 > maxWaitSec) {
      throw new Error(`Tiempo de espera agotado (${maxWaitSec}s) esperando a que la cola de ComfyUI se libere.`);
    }
    await new Promise(r => setTimeout(r, 4000));
  }
}

async function submitWorkflow(workflowGraph, promptIdClientId) {
  const res = await fetch(`${COMFY_HOST}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: workflowGraph,
      client_id: promptIdClientId,
    }),
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

async function pollPromptCompletion(promptId, maxWaitSec = 300) {
  const start = Date.now();
  console.log(`[Job ${promptId}] Ejecutando en GPU Metal/MPS...`);
  while (true) {
    try {
      const res = await fetch(`${COMFY_HOST}/history/${promptId}`);
      if (res.ok) {
        const hist = await res.json();
        if (hist[promptId]) {
          const outputs = hist[promptId].outputs || {};
          const status = hist[promptId].status || {};
          if (status.status_str === "error") {
            throw new Error(`El trabajo falló en ComfyUI: ${JSON.stringify(status.messages)}`);
          }
          return outputs;
        }
      }
    } catch (e) {
      if (e.message.includes("El trabajo falló")) throw e;
    }
    if ((Date.now() - start) / 1000 > maxWaitSec) {
      throw new Error(`Timeout agotado (${maxWaitSec}s) esperando el resultado del job ${promptId}.`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

async function main() {
  const opts = parseArgs();

  console.log("=== ComfyUI Creative Stack Runner (Metal/MPS) ===");
  console.log(`Prompt: "${opts.prompt}"`);
  console.log(`Semilla: ${opts.seed} | Pasos: ${opts.steps} | CFG: ${opts.cfg} | Res: ${opts.width}×${opts.height}`);

  // 1. Verificar salud y MPS
  const health = await checkComfyHealth();
  if (!health.ok) {
    console.error(`Error: ComfyUI no responde en ${COMFY_HOST}.`);
    console.error("Inicia ComfyUI ejecutando: /Users/msalas/CreativeStack/start.command");
    process.exit(1);
  }
  console.log(`ComfyUI activo: v${health.stats.system.comfyui_version} (MPS: ${health.mps ? "OK" : "NO"})`);

  // 2. Coordinación: ComfyUI gestiona una cola FIFO segura (1 job a la vez en GPU)

  // 3. Preparar grafo de workflow
  if (!existsSync(opts.workflow)) {
    console.error(`Error: No existe el workflow ${opts.workflow}`);
    process.exit(1);
  }
  const graph = JSON.parse(readFileSync(opts.workflow, "utf-8"));

  // Modificar nodos dinámicos
  // Nodo 2: CLIPTextEncode (positivo)
  if (graph["2"]) {
    graph["2"].inputs.text = opts.prompt;
  }
  // Nodo 3: CLIPTextEncode (negativo)
  if (graph["3"]) {
    graph["3"].inputs.text = opts.negative;
  }
  // Nodo 4: EmptyLatentImage
  if (graph["4"]) {
    graph["4"].inputs.width = opts.width;
    graph["4"].inputs.height = opts.height;
  }
  // Nodo 5: KSampler
  if (graph["5"]) {
    graph["5"].inputs.seed = opts.seed;
    graph["5"].inputs.steps = opts.steps;
    graph["5"].inputs.cfg = opts.cfg;
    graph["5"].inputs.sampler_name = opts.sampler;
    graph["5"].inputs.scheduler = opts.scheduler;
  }
  // Nodo 7: SaveImage
  if (graph["7"]) {
    graph["7"].inputs.filename_prefix = opts.prefix;
  }

  // 4. Someter trabajo
  const clientId = `creative-agent-${Date.now()}`;
  const promptId = await submitWorkflow(graph, clientId);
  console.log(`Trabajo encolado exitosamente. Prompt ID: ${promptId}`);

  // 5. Polling
  const outputs = await pollPromptCompletion(promptId, opts.maxWaitSec);

  // 6. Localizar imagen generada
  let generatedPath = null;
  for (const nodeId of Object.keys(outputs)) {
    const nodeOutput = outputs[nodeId];
    if (nodeOutput.images && nodeOutput.images.length > 0) {
      const img = nodeOutput.images[0];
      const sub = img.subfolder ? `${img.subfolder}/` : "";
      generatedPath = resolve(COMFY_OUTPUT_DIR, sub + img.filename);
      break;
    }
  }

  if (!generatedPath || !existsSync(generatedPath)) {
    console.error("Error: No se encontró la imagen resultante en el disco.");
    process.exit(1);
  }

  console.log(`Imagen generada: ${generatedPath}`);

  // 7. Post-procesamiento y guardado web
  let finalPath = generatedPath;
  if (opts.out) {
    const outDir = dirname(opts.out);
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }

    if (opts.webp && opts.out.endsWith(".webp")) {
      console.log(`Convirtiendo a WebP (calidad ${opts.quality})...`);
      execSync(`/opt/homebrew/bin/cwebp -q ${opts.quality} "${generatedPath}" -o "${opts.out}"`, { stdio: "inherit" });
      finalPath = opts.out;
    } else {
      execSync(`cp "${generatedPath}" "${opts.out}"`);
      finalPath = opts.out;
    }
    console.log(`Recurso final guardado en: ${finalPath}`);
  }

  // 8. Escribir metadatos de reproducibilidad (.meta.json)
  const metaPath = (opts.out ? opts.out : finalPath).replace(/\.[^.]+$/, ".meta.json");
  const meta = {
    source: "local-comfyui-mps",
    model: "sd_xl_base_1.0.safetensors",
    license: "Stability AI SDXL 1.0 Non-Commercial/Research/Commercial License (see /Users/msalas/CreativeStack/SDXL-LICENSE.md)",
    workflow: opts.workflow,
    prompt: opts.prompt,
    negative: opts.negative,
    seed: opts.seed,
    steps: opts.steps,
    cfg: opts.cfg,
    sampler: opts.sampler,
    scheduler: opts.scheduler,
    width: opts.width,
    height: opts.height,
    date: new Date().toISOString(),
    raw_output: generatedPath,
    final_output: finalPath,
  };
  writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf-8");
  console.log(`Metadatos guardados en: ${metaPath}`);
  console.log("=== Generación completada con éxito ===");
}

main().catch(err => {
  console.error("Error fatal:", err);
  process.exit(1);
});
