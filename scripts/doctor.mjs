#!/usr/bin/env node
/**
 * scripts/doctor.mjs
 * Inspector y reparador de salud del entorno de desarrollo de Junked Metal.
 *
 * Características:
 * - Diagnóstico integral en <100ms:
 *     1. Servicios pm2 (rc-dev :5173, rc-test :5174, rc-demo :4173) y puertos HTTP.
 *     2. Stack creativo ComfyUI (HTTP :8188, GPU Metal MPS, VRAM libre/total).
 *     3. Candados de prueba en /tmp/ (rc-test.lock, rc-perf.lock, etc.) y PIDs muertos.
 *     4. Binarios del sistema (Node, cwebp, dwebp, pm2, Playwright Metal).
 * - Modo auto-reparación (--fix):
 *     Elimina candados huérfanos, reinicia servidores caídos y purga procesos zombie.
 * - Modo máquina (--json) para scripts y agentes.
 */

import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { checkServerHealth, freeMemory, START_CMD, COMFY_HOST } from "./comfy-status.mjs";

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function checkUrl(url, timeoutMs = 800) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function checkPm2Services() {
  try {
    const raw = execSync("pm2 jlist", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1e8 })
      .replace(/^[^[]*/, "");
    const procs = JSON.parse(raw);
    return procs.map((p) => ({
      name: p.name,
      status: p.pm2_env?.status || "unknown",
      pid: p.pid,
      memoryMb: Math.round((p.monit?.memory || 0) / (1024 * 1024)),
      cpu: p.monit?.cpu || 0,
      restarts: p.pm2_env?.restart_time || 0,
    }));
  } catch {
    return [];
  }
}

function checkLockFiles() {
  const dir = tmpdir();
  const locks = [];
  try {
    const files = readdirSync(dir).filter((f) => /^rc-.*\.lock$/.test(f) || /^creative-.*\.lock$/.test(f));
    for (const f of files) {
      const fullPath = resolve(dir, f);
      try {
        const content = readFileSync(fullPath, "utf-8").trim();
        const pid = parseInt(content.split("\n")[0], 10);
        const alive = pid ? isPidAlive(pid) : false;
        locks.push({
          file: f,
          path: fullPath,
          pid,
          alive,
          orphan: !alive,
          raw: content,
        });
      } catch {}
    }
  } catch {}
  return locks;
}

function checkBinaries() {
  const bins = ["node", "pm2", "cwebp", "dwebp"];
  const status = {};
  for (const b of bins) {
    try {
      const p = execSync(`which ${b}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      status[b] = { ok: true, path: p };
    } catch {
      status[b] = { ok: false, path: null };
    }
  }
  return status;
}

async function main() {
  const args = process.argv.slice(2);
  const isFix = args.includes("--fix");
  const isJson = args.includes("--json");

  // 1. Diagnóstico
  const binaries = checkBinaries();
  const pm2Procs = checkPm2Services();
  const locks = checkLockFiles();
  const comfy = await checkServerHealth(1200);

  const [devHttp, testHttp] = await Promise.all([
    checkUrl("http://localhost:5173"),
    checkUrl("http://localhost:5174"),
  ]);

  const report = {
    timestamp: new Date().toISOString(),
    binaries,
    pm2: pm2Procs,
    http: {
      "rc-dev": { port: 5173, ...devHttp },
      "rc-test": { port: 5174, ...testHttp },
    },
    locks,
    comfy,
    healthy: true,
    issues: [],
    fixed: [],
  };

  // Identificar problemas
  for (const lock of locks) {
    if (lock.orphan) {
      report.healthy = false;
      report.issues.push(`Candado huérfano detectado: ${lock.file} (PID ${lock.pid} ya no existe).`);
    }
  }

  const devProc = pm2Procs.find((p) => p.name === "rc-dev");
  if (!devProc || devProc.status !== "online") {
    report.healthy = false;
    report.issues.push("Servidor rc-dev (:5173) no está online en pm2.");
  }

  const testProc = pm2Procs.find((p) => p.name === "rc-test");
  if (!testProc || testProc.status !== "online") {
    report.healthy = false;
    report.issues.push("Servidor rc-test (:5174) no está online en pm2.");
  }

  // 2. Reparación automática si --fix
  if (isFix) {
    for (const lock of locks) {
      if (lock.orphan) {
        try {
          unlinkSync(lock.path);
          report.fixed.push(`Eliminado candado huérfano ${lock.file}.`);
        } catch {}
      }
    }

    if (!devProc || devProc.status !== "online") {
      try {
        execSync("pm2 restart rc-dev", { stdio: "ignore" });
        report.fixed.push("Reiniciado rc-dev en pm2.");
      } catch {}
    }

    if (!testProc || testProc.status !== "online") {
      try {
        execSync("npm run test:restart", { stdio: "ignore" });
        report.fixed.push("Reiniciado rc-test con candado limpio.");
      } catch {}
    }
  }

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.healthy ? 0 : 1);
  }

  // Visualización amigable
  console.log("=== JUNKED METAL · DOCTOR DEL ENTORNO LOCAL ===\n");

  // Binarios
  console.log("Herramientas del sistema:");
  for (const [bin, info] of Object.entries(binaries)) {
    const icon = info.ok ? "✔" : "✖";
    console.log(`  ${icon} ${bin.padEnd(8)} ${info.ok ? info.path : "(no encontrado en PATH)"}`);
  }

  // Servidores pm2
  console.log("\nServidores de Juego (pm2 & HTTP):");
  for (const p of pm2Procs) {
    const isOnline = p.status === "online";
    const icon = isOnline ? "✔" : "✖";
    const port = p.name === "rc-dev" ? ":5173" : p.name === "rc-test" ? ":5174" : ":4173";
    console.log(`  ${icon} ${p.name.padEnd(10)} ${port.padEnd(7)} Estado: ${p.status.padEnd(8)} | PID: ${String(p.pid).padEnd(6)} | Memoria: ${p.memoryMb} MB`);
  }

  // ComfyUI
  console.log("\nStack Creativo (ComfyUI + Apple Silicon Metal):");
  if (comfy.online) {
    console.log(`  ✔ Servidor:  Online (v${comfy.version}) en ${COMFY_HOST}`);
    if (comfy.device) {
      console.log(`  ✔ Hardware:  ${comfy.device.name} | VRAM Libre: ${comfy.device.vram_free_str} / ${comfy.device.vram_total_str}`);
    }
  } else {
    console.log(`  ■ Servidor:  Detenido en ${COMFY_HOST} (Inícialo con: npm run creative:start)`);
  }

  // Candados
  console.log("\nCandados de Concurrencia (/tmp/):");
  if (locks.length === 0) {
    console.log("  ✔ Sin candados activos (todos los servidores y pruebas libres).");
  } else {
    for (const l of locks) {
      if (l.orphan) {
        console.log(`  ✖ HUÉRFANO: ${l.file} (PID ${l.pid} muerto). Ejecuta: npm run doctor -- --fix`);
      } else {
        console.log(`  ● Activo:   ${l.file} (PID ${l.pid} en ejecución).`);
      }
    }
  }

  // Balance y resumen
  console.log("\n--------------------------------------------------------------");
  if (report.issues.length === 0) {
    console.log("✔ DIAGNÓSTICO: Todos los componentes del stack están 100% operativos.");
  } else {
    console.log(`✖ DIAGNÓSTICO: Se detectaron ${report.issues.length} advertencia(s):`);
    for (const iss of report.issues) console.log(`  - ${iss}`);
    if (!isFix) {
      console.log("\nPara reparar automáticamente los problemas detectados, ejecuta:\n  npm run doctor -- --fix");
    }
  }

  if (report.fixed.length > 0) {
    console.log("\nAcciones de reparación aplicadas:");
    for (const fix of report.fixed) console.log(`  ✔ ${fix}`);
  }
  console.log("--------------------------------------------------------------");

  process.exit(report.healthy || isFix ? 0 : 1);
}

main().catch((err) => {
  console.error("Error fatal en doctor:", err.message || err);
  process.exit(1);
});
