#!/usr/bin/env node
/**
 * scripts/comfy-status.mjs
 * Consulta instantánea, control y monitoreo en vivo de ComfyUI (Apple Silicon Metal / MPS).
 * Sin bloqueos ni esperas ciegas: respuestas en <50ms o streaming reactivo por WebSocket.
 *
 * Uso:
 *   node scripts/comfy-status.mjs                 # Estado instantáneo (<50ms)
 *   node scripts/comfy-status.mjs --watch         # Monitoreo en vivo por WebSocket hasta vaciar cola
 *   node scripts/comfy-status.mjs --free          # Liberar caché de VRAM en MPS
 *   node scripts/comfy-status.mjs --cancel-all    # Interrumpir trabajo activo y vaciar cola
 *   node scripts/comfy-status.mjs --cancel <id>   # Cancelar un trabajo específico
 *   node scripts/comfy-status.mjs start           # Iniciar ComfyUI en segundo plano y esperar a que responda
 *   node scripts/comfy-status.mjs stop            # Detener ComfyUI limpiamente
 *   node scripts/comfy-status.mjs --json          # Salida JSON estructurada para scripts o agentes
 */

import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

export const COMFY_HOST = process.env.COMFY_HOST || "http://127.0.0.1:8188";
export const COMFY_WS_HOST = COMFY_HOST.replace(/^http/, "ws");
export const START_CMD = "/Users/msalas/CreativeStack/start.command";
export const STOP_CMD = "/Users/msalas/CreativeStack/stop.command";

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return "0 B";
  const gb = bytes / (1024 ** 3);
  return `${gb.toFixed(1)} GB`;
}

export async function checkServerHealth(timeoutMs = 1500) {
  try {
    const res = await fetch(`${COMFY_HOST}/system_stats`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { online: false, status: res.status };
    const data = await res.json();
    const mps = (data.devices || []).find((d) => d.type === "mps" || d.name?.includes("mps"));
    return {
      online: true,
      version: data.system?.comfyui_version || "desconocida",
      python: data.system?.python_version?.split(" ")[0] || "3.x",
      mps: !!mps,
      device: mps ? {
        name: "Apple Silicon Metal (MPS)",
        vram_free: mps.vram_free,
        vram_total: mps.vram_total,
        vram_free_str: formatBytes(mps.vram_free),
        vram_total_str: formatBytes(mps.vram_total),
      } : null,
      system_ram_free_str: formatBytes(data.system?.ram_free),
      system_ram_total_str: formatBytes(data.system?.ram_total),
      raw: data,
    };
  } catch {
    return { online: false };
  }
}

export async function getQueueState(timeoutMs = 1500) {
  try {
    const res = await fetch(`${COMFY_HOST}/queue`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { running: [], pending: [] };
    const data = await res.json();
    return {
      running: data.queue_running || [],
      pending: data.queue_pending || [],
    };
  } catch {
    return { running: [], pending: [] };
  }
}

export async function getRecentHistory(limit = 3, timeoutMs = 2000) {
  try {
    const res = await fetch(`${COMFY_HOST}/history?max_items=${limit}`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return [];
    const hist = await res.json();
    const items = [];
    for (const [id, val] of Object.entries(hist)) {
      const outputs = val.outputs || {};
      const images = [];
      for (const nodeOut of Object.values(outputs)) {
        if (nodeOut.images) {
          for (const img of nodeOut.images) {
            images.push(img.subfolder ? `${img.subfolder}/${img.filename}` : img.filename);
          }
        }
      }
      items.push({
        id,
        status: val.status?.status_str || "desconocido",
        completed: val.status?.completed ?? true,
        images,
      });
    }
    return items.reverse();
  } catch {
    return [];
  }
}

export async function freeMemory() {
  try {
    const res = await fetch(`${COMFY_HOST}/free`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unload_models: false, free_memory: true }),
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function interruptActive() {
  try {
    const res = await fetch(`${COMFY_HOST}/interrupt`, {
      method: "POST",
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function clearQueue() {
  try {
    const res = await fetch(`${COMFY_HOST}/queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: true }),
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteFromQueue(promptId) {
  try {
    const res = await fetch(`${COMFY_HOST}/queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delete: [promptId] }),
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function startServerBackground(timeoutSec = 15) {
  const health = await checkServerHealth(500);
  if (health.online) {
    console.log(`✓ ComfyUI ya está activo en ${COMFY_HOST} (v${health.version}).`);
    return true;
  }

  if (!existsSync(START_CMD)) {
    throw new Error(`No se encontró el script de inicio en: ${START_CMD}`);
  }

  console.log(`Iniciando ComfyUI en segundo plano mediante ${START_CMD}...`);
  const proc = spawn(START_CMD, [], {
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  proc.unref();

  const start = Date.now();
  process.stdout.write("Esperando a que ComfyUI responda en el puerto 8188");
  while ((Date.now() - start) / 1000 < timeoutSec) {
    await new Promise((r) => setTimeout(r, 300));
    process.stdout.write(".");
    const check = await checkServerHealth(400);
    if (check.online) {
      console.log(`\n✓ ComfyUI arrancó exitosamente en ${((Date.now() - start) / 1000).toFixed(1)}s (v${check.version}, MPS: ${check.mps ? "OK" : "NO"}).`);
      return true;
    }
  }

  console.log("\n✗ Tiempo de espera agotado esperando el arranque de ComfyUI.");
  return false;
}

export async function stopServerCleanly() {
  if (!existsSync(STOP_CMD)) {
    throw new Error(`No se encontró el script de parada en: ${STOP_CMD}`);
  }
  console.log("Deteniendo ComfyUI limpiamente...");
  const proc = spawn(STOP_CMD, [], { stdio: "inherit", env: process.env });
  await new Promise((resolve) => proc.on("close", resolve));
  console.log("ComfyUI detenido.");
}

export async function watchLive(onDone) {
  const clientId = `watcher-${Date.now()}`;
  console.log(`\n=== Monitoreo en vivo WebSocket (${COMFY_WS_HOST}/ws) ===`);
  console.log("Presiona Ctrl+C para salir.\n");

  const ws = new WebSocket(`${COMFY_WS_HOST}/ws?clientId=${clientId}`);
  let lastPrompt = null;
  let lastProgress = 0;

  ws.onopen = () => {
    console.log("✓ Conexión WebSocket establecida con ComfyUI.");
  };

  ws.onerror = (e) => {
    console.error("Error en WebSocket:", e.message || e);
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      const { type, data } = msg;

      if (type === "status") {
        const rem = data.status?.exec_info?.queue_remaining ?? 0;
        if (rem === 0 && !lastPrompt) {
          process.stdout.write(`\r[Cola] Sin trabajos en ejecución ni en cola.                \n`);
        }
      } else if (type === "execution_start") {
        lastPrompt = data.prompt_id;
        console.log(`\n▶ [Inicio] Ejecutando trabajo: ${data.prompt_id}`);
      } else if (type === "executing") {
        if (data.node === null) {
          console.log(`\n✔ [Fin] Trabajo completado: ${data.prompt_id || lastPrompt}`);
          lastPrompt = null;
          lastProgress = 0;
          if (onDone) onDone();
        } else {
          process.stdout.write(`\r[Nodo ${data.node}] Ejecutando fase de pipeline...           `);
        }
      } else if (type === "progress") {
        const pct = Math.round((data.value / data.max) * 100);
        const barLen = 20;
        const filled = Math.round((pct / 100) * barLen);
        const bar = "=".repeat(filled) + (filled < barLen ? ">" : "") + " ".repeat(Math.max(0, barLen - filled - 1));
        process.stdout.write(`\r[Progreso] Paso ${data.value}/${data.max} [${bar}] ${pct}%    `);
        lastProgress = pct;
      } else if (type === "execution_error") {
        console.error(`\n✖ [Error] Fallo en nodo ${data.node_id} (${data.node_type}): ${data.exception_message}`);
      }
    } catch {}
  };

  return ws;
}

async function main() {
  const args = process.argv.slice(2);
  const isJson = args.includes("--json");
  const isWatch = args.includes("--watch");
  const isFree = args.includes("--free");
  const isCancelAll = args.includes("--cancel-all");
  const cancelIdx = args.indexOf("--cancel");
  const cancelId = cancelIdx !== -1 ? args[cancelIdx + 1] : null;

  if (args.includes("start")) {
    const ok = await startServerBackground();
    process.exit(ok ? 0 : 1);
  }

  if (args.includes("stop")) {
    await stopServerCleanly();
    process.exit(0);
  }

  if (isFree) {
    console.log("Solicitando liberación de memoria VRAM en ComfyUI...");
    const ok = await freeMemory();
    console.log(ok ? "✓ Memoria liberada correctamente." : "✗ No se pudo liberar memoria (¿servidor inactivo?).");
    process.exit(ok ? 0 : 1);
  }

  if (isCancelAll) {
    console.log("Interrumpiendo ejecución y vaciando cola de ComfyUI...");
    await interruptActive();
    await clearQueue();
    console.log("✓ Cola vaciada y trabajo interrumpido.");
    process.exit(0);
  }

  if (cancelId) {
    console.log(`Cancelando trabajo ${cancelId}...`);
    const ok = await deleteFromQueue(cancelId);
    console.log(ok ? `✓ Trabajo ${cancelId} eliminado de la cola.` : `✗ No se pudo cancelar el trabajo.`);
    process.exit(ok ? 0 : 1);
  }

  // Comprobar estado del servidor
  const [health, queue, history] = await Promise.all([
    checkServerHealth(1500),
    getQueueState(1500),
    getRecentHistory(3, 2000),
  ]);

  if (isJson) {
    console.log(JSON.stringify({ health, queue, history }, null, 2));
    process.exit(0);
  }

  if (!health.online) {
    console.log("=== COMFYUI LOCAL STATUS ===");
    console.log(`Estado: ✗ DESCONECTADO (no responde en ${COMFY_HOST})`);
    console.log(`Para iniciar: node scripts/comfy-status.mjs start  (o: ${START_CMD})`);
    process.exit(1);
  }

  console.log("=== COMFYUI LOCAL STATUS (Apple Silicon Metal / MPS) ===");
  console.log(`Servidor:  ✓ ACTIVO (v${health.version}, Python ${health.python}) en ${COMFY_HOST}`);
  if (health.device) {
    console.log(`Hardware:  GPU MPS activo | VRAM Libre: ${health.device.vram_free_str} / ${health.device.vram_total_str} | RAM Libre: ${health.system_ram_free_str}`);
  } else {
    console.log("Hardware:  Sin acelerador MPS detectado.");
  }

  const runningCount = queue.running.length;
  const pendingCount = queue.pending.length;
  if (runningCount === 0 && pendingCount === 0) {
    console.log(`Cola:      Libre (0 en ejecución, 0 pendientes)`);
  } else {
    console.log(`Cola:      OCUPADA (${runningCount} en ejecución, ${pendingCount} pendientes)`);
    if (runningCount > 0) {
      const cur = queue.running[0];
      console.log(`  - En curso: Prompt ID ${cur[1]} (nodos: ${Object.keys(cur[2] || {}).length})`);
    }
  }

  if (history.length > 0) {
    console.log("Historial Reciente (últimos trabajos):");
    for (const h of history) {
      const imgStr = h.images.length > 0 ? `${h.images.length} imagen(es) [${h.images[0]}]` : "sin imágenes";
      const icon = h.status === "success" ? "✔" : "✖";
      console.log(`  ${icon} [${h.id.slice(0, 8)}] Estado: ${h.status.padEnd(8)} | ${imgStr}`);
    }
  }

  if (isWatch) {
    await watchLive();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename || "")) {
  main().catch((err) => {
    console.error("Error en comfy-status:", err.message || err);
    process.exit(1);
  });
}
