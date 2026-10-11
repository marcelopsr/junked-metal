#!/usr/bin/env node
/**
 * scripts/creative-batch.mjs
 * Cola de procesamiento por lotes (Batch Queue) para ComfyUI (SDXL + Apple Silicon Metal/MPS).
 *
 * Características:
 * - Despacho secuencial coordinado (1 trabajo pesado a la vez en Metal/MPS sin sobrecargar VRAM).
 * - Modos de entrada flexibles:
 *     1. Archivo JSON (--file <plan.json>) con items, prompts, semillas y rutas.
 *     2. Matriz de semillas (--prompt "..." --seeds 1,2,3,4 --out-pattern "public/.../asset_{seed}.webp").
 *     3. Lista de prompts delimitada (--prompts "p1; p2; p3" --out-pattern "public/.../gen_{index}.webp").
 * - Ejecución interactiva o en segundo plano (--detach / --daemon) sin bloqueos ni timeouts.
 * - Telemetría y estado en tiempo real (--status y --watch):
 *     Progreso global del lote (ej. 3/8 ítems, 37.5%), progreso del ítem actual (paso X/24), ETA lote.
 * - Control de ciclo de vida (--cancel para detener el lote e interrumpir ComfyUI).
 * - Resiliencia: si un ítem falla, continúa con los siguientes y genera reporte consolidado.
 * - Gestión de VRAM: purga automática de caché (/free) si la VRAM libre desciende de 4.0 GB.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, openSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import {
  checkServerHealth,
  startServerBackground,
  freeMemory,
  interruptActive,
  clearQueue,
  COMFY_HOST,
} from "./comfy-status.mjs";
import {
  generateCreativeAsset,
  DEFAULT_WORKFLOW,
} from "./creative-gen.mjs";

const STATE_FILE = resolve("logs/creative-batch-state.json");
const LOCK_FILE = resolve("logs/creative-batch.lock");
const LOG_FILE = resolve("logs/creative-batch.log");

function formatDuration(sec) {
  if (isNaN(sec) || sec < 0) return "0s";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function parseBatchArgs() {
  const args = process.argv.slice(2);
  const opts = {
    file: null,
    prompt: null,
    prompts: null,
    seeds: null,
    outPattern: null,
    workflow: DEFAULT_WORKFLOW,
    width: 1024,
    height: 1024,
    steps: 24,
    cfg: 7.0,
    sampler: "euler",
    scheduler: "normal",
    webp: true,
    quality: 85,
    detach: false,
    status: false,
    watch: false,
    cancel: false,
    json: false,
    autoStart: false,
  };

  for (let i = 0; i < args.length; i++) {
    const k = args[i];
    const v = args[i + 1];
    if (k === "--file" || k === "-f") { opts.file = resolve(v); i++; }
    else if (k === "--prompt") { opts.prompt = v; i++; }
    else if (k === "--prompts") { opts.prompts = v; i++; }
    else if (k === "--seeds") { opts.seeds = v.split(",").map((s) => parseInt(s.trim(), 10)); i++; }
    else if (k === "--out-pattern") { opts.outPattern = v; i++; }
    else if (k === "--workflow") { opts.workflow = resolve(v); i++; }
    else if (k === "--width") { opts.width = parseInt(v, 10); i++; }
    else if (k === "--height") { opts.height = parseInt(v, 10); i++; }
    else if (k === "--steps") { opts.steps = parseInt(v, 10); i++; }
    else if (k === "--cfg") { opts.cfg = parseFloat(v); i++; }
    else if (k === "--sampler") { opts.sampler = v; i++; }
    else if (k === "--scheduler") { opts.scheduler = v; i++; }
    else if (k === "--quality") { opts.quality = parseInt(v, 10); i++; }
    else if (k === "--no-webp") { opts.webp = false; }
    else if (k === "--detach" || k === "--daemon") { opts.detach = true; }
    else if (k === "--status") { opts.status = true; }
    else if (k === "--watch") { opts.watch = true; }
    else if (k === "--cancel") { opts.cancel = true; }
    else if (k === "--json") { opts.json = true; }
    else if (k === "--auto-start") { opts.autoStart = true; }
    else if (k === "--help" || k === "-h") {
      console.log(`Uso: node scripts/creative-batch.mjs [modo] [opciones]

Modos de ejecución:
  --file <ruta.json>         Cargar lista de tareas desde un archivo de lote JSON
  --prompt "..." --seeds 1,2,3,4 --out-pattern "public/assets/item_{seed}.webp"
                             Generar variantes de un prompt por matriz de semillas
  --prompts "p1; p2; p3" --out-pattern "public/assets/item_{index}.webp"
                             Generar secuencia de múltiples prompts
  --detach, --daemon         Ejecutar el lote en segundo plano (retorna de inmediato)
  --status                   Consultar estado actual del lote en ejecución (<50ms)
  --watch                    Monitorear en vivo un lote en segundo plano
  --cancel                   Detener el lote activo y vaciar la cola de ComfyUI
  --json                     Salida en formato JSON estructurado
`);
      process.exit(0);
    }
  }

  return opts;
}

function buildBatchPlan(opts) {
  const items = [];

  if (opts.file) {
    if (!existsSync(opts.file)) {
      throw new Error(`No existe el archivo de lote: ${opts.file}`);
    }
    const data = JSON.parse(readFileSync(opts.file, "utf-8"));
    const def = data.defaults || {};

    const rawItems = Array.isArray(data) ? data : (data.items || []);
    for (let i = 0; i < rawItems.length; i++) {
      const it = rawItems[i];
      items.push({
        id: it.id || `item_${i + 1}`,
        prompt: it.prompt,
        negative: it.negative || def.negative,
        seed: it.seed ?? def.seed ?? (42 + i),
        steps: it.steps || def.steps || opts.steps,
        cfg: it.cfg || def.cfg || opts.cfg,
        sampler: it.sampler || def.sampler || opts.sampler,
        scheduler: it.scheduler || def.scheduler || opts.scheduler,
        width: it.width || def.width || opts.width,
        height: it.height || def.height || opts.height,
        prefix: it.prefix || def.prefix || `creative/batch_${i + 1}`,
        workflow: it.workflow || def.workflow || opts.workflow,
        out: it.out ? resolve(it.out) : null,
        webp: it.webp ?? def.webp ?? opts.webp,
        quality: it.quality || def.quality || opts.quality,
      });
    }
  } else if (opts.prompt && opts.seeds && opts.seeds.length > 0) {
    for (let i = 0; i < opts.seeds.length; i++) {
      const seed = opts.seeds[i];
      const outPath = opts.outPattern
        ? resolve(opts.outPattern.replace(/\{seed\}/g, String(seed)).replace(/\{index\}/g, String(i + 1)))
        : null;
      items.push({
        id: `seed_${seed}`,
        prompt: opts.prompt,
        seed,
        steps: opts.steps,
        cfg: opts.cfg,
        sampler: opts.sampler,
        scheduler: opts.scheduler,
        width: opts.width,
        height: opts.height,
        prefix: `creative/var_s${seed}`,
        workflow: opts.workflow,
        out: outPath,
        webp: opts.webp,
        quality: opts.quality,
      });
    }
  } else if (opts.prompts) {
    const list = opts.prompts.split(";").map((p) => p.trim()).filter(Boolean);
    for (let i = 0; i < list.length; i++) {
      const outPath = opts.outPattern
        ? resolve(opts.outPattern.replace(/\{index\}/g, String(i + 1)))
        : null;
      items.push({
        id: `prompt_${i + 1}`,
        prompt: list[i],
        seed: 42 + i,
        steps: opts.steps,
        cfg: opts.cfg,
        sampler: opts.sampler,
        scheduler: opts.scheduler,
        width: opts.width,
        height: opts.height,
        prefix: `creative/batch_p${i + 1}`,
        workflow: opts.workflow,
        out: outPath,
        webp: opts.webp,
        quality: opts.quality,
      });
    }
  }

  return items;
}

function saveState(state) {
  try {
    const dir = dirname(STATE_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch {}
}

function readState() {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    }
  } catch {}
  return null;
}

async function handleCancel() {
  console.log("=== Cancelando lote de generación ===");
  let killed = false;

  if (existsSync(LOCK_FILE)) {
    try {
      const pid = parseInt(readFileSync(LOCK_FILE, "utf-8").trim(), 10);
      if (pid && isPidAlive(pid)) {
        process.kill(pid, "SIGTERM");
        console.log(`✓ Proceso de lote (PID ${pid}) detenido.`);
        killed = true;
      }
      unlinkSync(LOCK_FILE);
    } catch {}
  }

  // Interrumpir ComfyUI
  console.log("Interrumpiendo tareas en ComfyUI...");
  await interruptActive();
  await clearQueue();
  console.log("✓ Cola de ComfyUI purgada.");

  const state = readState();
  if (state && state.status === "running") {
    state.status = "cancelled";
    state.cancelled_at = new Date().toISOString();
    saveState(state);
  }

  console.log("Lote cancelado exitosamente.");
  process.exit(0);
}

function handleStatus(isJson) {
  const state = readState();
  if (!state) {
    if (isJson) console.log(JSON.stringify({ active: false, message: "Sin lote previo" }));
    else console.log("No hay información de lotes recientes.");
    process.exit(0);
  }

  const isRunning = state.status === "running" && state.pid && isPidAlive(state.pid);
  if (!isRunning && state.status === "running") {
    state.status = "stopped";
  }

  if (isJson) {
    console.log(JSON.stringify({ ...state, isRunning }, null, 2));
    process.exit(0);
  }

  console.log("=== ESTADO DEL LOTE CREATIVO ===");
  console.log(`Lote ID:           ${state.batch_id}`);
  console.log(`Estado:            ${isRunning ? "▶ EN EJECUCIÓN (PID " + state.pid + ")" : "■ " + state.status.toUpperCase()}`);
  console.log(`Progreso:          ${state.completed_items} de ${state.total_items} completados (${state.pct || 0}%)`);

  if (state.current_item && isRunning) {
    console.log(`Ítem en curso:     [${state.current_item.index + 1}/${state.total_items}] ${state.current_item.id}`);
    if (state.current_item.step) {
      console.log(`  Paso de muestreo: ${state.current_item.step}/${state.current_item.total_steps} (${state.current_item.pct}%) | ETA: ${state.current_item.eta || "?"}s`);
    }
  }

  const elapsed = (Date.now() - state.start_time) / 1000;
  console.log(`Tiempo transcurrido: ${formatDuration(elapsed)}`);
  if (isRunning && state.estimated_remaining_sec) {
    console.log(`ETA restante Lote:  ~${formatDuration(state.estimated_remaining_sec)}`);
  }

  if (state.items_completed && state.items_completed.length > 0) {
    console.log("\nÍtems procesados recientemente:");
    for (const it of state.items_completed.slice(-5)) {
      const icon = it.status === "success" ? "✔" : "✖";
      console.log(`  ${icon} [${it.id}] -> ${it.out || it.finalPath || "(sin archivo)"} (${it.duration}s)`);
    }
  }

  process.exit(0);
}

async function handleWatch() {
  console.log("=== Monitoreo en vivo de Lote Creativo ===");
  console.log("Presiona Ctrl+C para salir del visor (el lote continuará en segundo plano).\n");

  let lastIndex = -1;
  let lastStep = -1;

  while (true) {
    const state = readState();
    if (!state) {
      console.log("No hay lote activo.");
      break;
    }

    const isRunning = state.status === "running" && state.pid && isPidAlive(state.pid);
    if (!isRunning) {
      console.log(`\nEl lote ha finalizado con estado: ${state.status.toUpperCase()}`);
      console.log(`Total: ${state.completed_items}/${state.total_items} completados en ${formatDuration((Date.now() - state.start_time) / 1000)}.`);
      break;
    }

    if (state.current_item) {
      const cur = state.current_item;
      const barLen = 20;
      const pct = cur.pct || 0;
      const filled = Math.round((pct / 100) * barLen);
      const bar = "=".repeat(Math.max(0, filled - 1)) + (filled > 0 && filled < barLen ? ">" : "=") + " ".repeat(Math.max(0, barLen - filled));

      process.stdout.write(
        `\r[Lote ${cur.index + 1}/${state.total_items}] ${cur.id.padEnd(16)} | Paso ${String(cur.step || 0).padStart(2)}/${cur.total_steps || 24} [${bar}] ${pct}% | ETA Ítem: ${cur.eta || "?"}s | ETA Lote: ${formatDuration(state.estimated_remaining_sec)} `
      );
    }

    await new Promise((r) => setTimeout(r, 800));
  }
}

async function executeBatchRunner(items, isDetachedChild = false) {
  const batchId = `batch-${Date.now()}`;
  const total = items.length;
  const startTime = Date.now();

  const state = {
    batch_id: batchId,
    pid: process.pid,
    status: "running",
    total_items: total,
    completed_items: 0,
    failed_items: 0,
    pct: 0,
    current_item: null,
    items_completed: [],
    start_time: startTime,
    estimated_remaining_sec: total * 25,
  };

  mkdirSync("logs", { recursive: true });
  writeFileSync(LOCK_FILE, String(process.pid), "utf-8");
  saveState(state);

  const cleanup = () => {
    try {
      if (existsSync(LOCK_FILE) && parseInt(readFileSync(LOCK_FILE, "utf-8").trim(), 10) === process.pid) {
        unlinkSync(LOCK_FILE);
      }
    } catch {}
  };
  process.on("exit", cleanup);

  console.log(`=== Iniciando Lote Creativo: ${batchId} (${total} ítems) ===\n`);

  const durations = [];

  for (let i = 0; i < total; i++) {
    const item = items[i];
    const itemStart = Date.now();

    state.current_item = {
      index: i,
      id: item.id,
      prompt: item.prompt,
      seed: item.seed,
      step: 0,
      total_steps: item.steps || 24,
      pct: 0,
      eta: "?",
    };
    saveState(state);

    if (!isDetachedChild) {
      console.log(`\n▶ [${i + 1}/${total}] Procesando: '${item.id}' (semilla ${item.seed}, ${item.steps} pasos)`);
    }

    try {
      const result = await generateCreativeAsset(item, {
        onProgress: (p) => {
          if (state.current_item) {
            state.current_item.step = p.step;
            state.current_item.total_steps = p.total;
            state.current_item.pct = p.pct;
            state.current_item.eta = p.eta;

            // Recalcular ETA total de lote
            const avgDur = durations.length > 0 ? (durations.reduce((a, b) => a + b, 0) / durations.length) : 25;
            const remainingItems = total - i - 1;
            const itemRemainSec = parseFloat(p.eta) || 10;
            state.estimated_remaining_sec = Math.round(itemRemainSec + remainingItems * avgDur);

            saveState(state);
          }
        },
        silent: isDetachedChild,
      });

      const itemDuration = (Date.now() - itemStart) / 1000;
      durations.push(itemDuration);

      state.completed_items++;
      state.pct = Math.round((state.completed_items / total) * 100);
      state.items_completed.push({
        id: item.id,
        status: "success",
        out: result.finalPath,
        meta: result.metaPath,
        duration: parseFloat(itemDuration.toFixed(1)),
      });

      if (!isDetachedChild) {
        console.log(`\n✔ [${i + 1}/${total}] Completado en ${itemDuration.toFixed(1)}s -> ${result.finalPath}`);
      }
    } catch (err) {
      const itemDuration = (Date.now() - itemStart) / 1000;
      state.failed_items++;
      state.items_completed.push({
        id: item.id,
        status: "error",
        error: err.message,
        duration: parseFloat(itemDuration.toFixed(1)),
      });

      console.error(`\n✖ [${i + 1}/${total}] Fallo en '${item.id}': ${err.message}`);
    }

    // Comprobación y purga de VRAM si es necesario
    const health = await checkServerHealth(500);
    if (health.online && health.device && health.device.vram_free < 4.0 * 1024 ** 3) {
      if (!isDetachedChild) process.stdout.write("[Mantenimiento] VRAM libre baja (<4 GB). Purgando caché... ");
      await freeMemory();
      if (!isDetachedChild) console.log("OK.");
    }

    saveState(state);
  }

  state.status = "completed";
  state.current_item = null;
  state.estimated_remaining_sec = 0;
  state.end_time = Date.now();
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  state.total_duration_sec = parseFloat(totalDuration);
  saveState(state);

  // Escribir reporte resumen final
  const summaryFile = resolve(`logs/${batchId}-results.json`);
  writeFileSync(summaryFile, JSON.stringify(state, null, 2), "utf-8");

  console.log(`\n=== LOTE COMPLETADO: ${batchId} ===`);
  console.log(`Total: ${state.completed_items}/${total} exitosos (${state.failed_items} fallidos) en ${formatDuration(totalDuration)}.`);
  console.log(`Reporte guardado en: ${summaryFile}\n`);
}

async function main() {
  const opts = parseBatchArgs();

  if (opts.cancel) {
    await handleCancel();
    return;
  }

  if (opts.status) {
    handleStatus(opts.json);
    return;
  }

  if (opts.watch) {
    await handleWatch();
    return;
  }

  const items = buildBatchPlan(opts);
  if (items.length === 0) {
    console.error("Error: No se especificaron ítems para el lote.");
    console.error("Usa --file <path.json> o --prompt '...' --seeds 1,2,3 o --prompts 'p1; p2'.");
    process.exit(1);
  }

  // Comprobar si ya hay otro lote corriendo
  if (existsSync(LOCK_FILE)) {
    try {
      const curPid = parseInt(readFileSync(LOCK_FILE, "utf-8").trim(), 10);
      if (curPid && isPidAlive(curPid)) {
        console.error(`Error: Ya hay un lote creativo ejecutándose en segundo plano (PID ${curPid}).`);
        console.error("Para consultar: npm run creative:batch:status");
        console.error("Para cancelar:  npm run creative:batch:cancel");
        process.exit(1);
      }
    } catch {}
  }

  // Comprobar salud de ComfyUI (con reintento por si está ocupado liberando memoria)
  let health = await checkServerHealth(2500);
  if (!health.online) {
    await new Promise((r) => setTimeout(r, 800));
    health = await checkServerHealth(3000);
  }
  if (!health.online && opts.autoStart) {
    console.log("ComfyUI no está activo. Iniciando automáticamente (--auto-start)...");
    await startServerBackground(20);
    health = await checkServerHealth(2500);
  }
  if (!health.online) {
    console.error(`Error: ComfyUI no responde en ${COMFY_HOST}.`);
    console.error("Inicia ComfyUI con: npm run creative:start (o agrega --auto-start)");
    process.exit(1);
  }

  // Si se solicitó ejecución en segundo plano (--detach / --daemon)
  if (opts.detach) {
    console.log(`Iniciando lote de ${items.length} ítems en segundo plano...`);
    const batchPlanTmp = resolve(`logs/active-batch-plan.json`);
    mkdirSync("logs", { recursive: true });
    writeFileSync(batchPlanTmp, JSON.stringify({ items }, null, 2), "utf-8");

    const outFd = openSync(LOG_FILE, "a");
    const child = spawn(
      process.execPath,
      [resolve("scripts/creative-batch.mjs"), "--file", batchPlanTmp],
      {
        detached: true,
        stdio: ["ignore", outFd, outFd],
        env: process.env,
      }
    );
    child.unref();

    console.log(`\n✓ Lote lanzado en segundo plano (PID ${child.pid}).`);
    console.log(`Total de tareas:     ${items.length}`);
    console.log(`Tiempo estimado:     ~${formatDuration(items.length * 25)}`);
    console.log(`\nComandos útiles:`);
    console.log(`  npm run creative:batch:status   # Consultar progreso instantáneo`);
    console.log(`  npm run creative:batch:watch    # Transmitir telemetría en vivo`);
    console.log(`  npm run creative:batch:cancel   # Cancelar lote y vaciar cola`);
    process.exit(0);
  }

  // Ejecución en primer plano
  await executeBatchRunner(items, false);
}

main().catch((err) => {
  console.error("Error fatal en lote creativo:", err.message || err);
  process.exit(1);
});
