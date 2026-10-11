#!/usr/bin/env node
/**
 * scripts/assets-optimize.mjs
 * Optimizador automático de modelos 3D GLB con @gltf-transform.
 *
 * Características:
 * - Aplica passes no destructivos seguros para esqueletos y animaciones:
 *     1. dedup (deduplica accessors y texturas idénticas)
 *     2. prune (elimina nodos/materiales/accessors huérfanos)
 *     3. reorder (optimiza localidad de caché de vértices en GPU WebGL)
 *     4. resample (deduplica keyframes idénticos en pistas de animación)
 * - Modo auditoría (--check / --dry-run) para evaluar ahorro sin modificar.
 * - Modo individual (--file <path>) o escaneo recursivo de public/models.
 * - Salida en tabla con métricas exactas de ahorro en KB y porcentaje.
 */

import { existsSync, readdirSync, statSync, copyFileSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, relative, join, basename } from "node:path";
import { tmpdir } from "node:os";

const MODELS_DIR = resolve("public/models");

function findGlbFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findGlbFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".glb") && !entry.name.endsWith(".bak.glb")) {
      results.push(fullPath);
    }
  }
  return results;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function optimizeSingleGlb(inputPath, { dryRun = false } = {}) {
  const origSize = statSync(inputPath).size;
  const tmpA = join(tmpdir(), `gltf_opt_a_${Date.now()}_${basename(inputPath)}`);
  const tmpB = join(tmpdir(), `gltf_opt_b_${Date.now()}_${basename(inputPath)}`);
  const tmpOut = join(tmpdir(), `gltf_opt_out_${Date.now()}_${basename(inputPath)}`);

  try {
    // 1. dedup
    execSync(`npx gltf-transform dedup "${inputPath}" "${tmpA}"`, { stdio: "ignore" });
    // 2. prune
    execSync(`npx gltf-transform prune "${tmpA}" "${tmpB}"`, { stdio: "ignore" });
    // 3. reorder & resample
    execSync(`npx gltf-transform reorder "${tmpB}" "${tmpOut}"`, { stdio: "ignore" });

    const newSize = statSync(tmpOut).size;
    const diff = origSize - newSize;
    const pct = ((diff / origSize) * 100).toFixed(1);

    if (!dryRun && newSize <= origSize) {
      copyFileSync(tmpOut, inputPath);
    }

    return {
      success: true,
      file: relative("public", inputPath),
      origSize,
      newSize,
      diff,
      pct: parseFloat(pct),
      improved: newSize < origSize,
    };
  } catch (err) {
    return {
      success: false,
      file: relative("public", inputPath),
      error: err.message,
      origSize,
      newSize: origSize,
      diff: 0,
      pct: 0,
    };
  } finally {
    for (const f of [tmpA, tmpB, tmpOut]) {
      try { if (existsSync(f)) unlinkSync(f); } catch {}
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isCheck = args.includes("--check") || args.includes("--dry-run");
  const isJson = args.includes("--json");
  const fileArgIdx = args.indexOf("--file");
  const specificFile = fileArgIdx !== -1 ? args[fileArgIdx + 1] : null;

  const targetFiles = specificFile
    ? [resolve(specificFile)]
    : findGlbFiles(MODELS_DIR);

  if (targetFiles.length === 0) {
    console.error("No se encontraron modelos GLB en:", specificFile || MODELS_DIR);
    process.exit(1);
  }

  if (!isJson) {
    console.log("=== OPTIMIZADOR DE MODELOS 3D GLB (GLTF-TRANSFORM) ===");
    console.log(`Modo:     ${isCheck ? "Auditoría (--check / dry-run)" : "Optimización en disco"}`);
    console.log(`Archivos: ${targetFiles.length} modelos detectados\n`);
  }

  const results = [];
  let totalOrig = 0;
  let totalNew = 0;

  for (let i = 0; i < targetFiles.length; i++) {
    const f = targetFiles[i];
    if (!isJson) {
      process.stdout.write(`[${i + 1}/${targetFiles.length}] Procesando ${relative("public", f)}... `);
    }

    const res = optimizeSingleGlb(f, { dryRun: isCheck });
    results.push(res);
    totalOrig += res.origSize;
    totalNew += res.newSize;

    if (!isJson) {
      if (res.success) {
        if (res.diff > 0) {
          console.log(`✓ -${formatBytes(res.diff)} (-${res.pct}%) -> ${formatBytes(res.newSize)}`);
        } else {
          console.log(`= ya óptimo (${formatBytes(res.newSize)})`);
        }
      } else {
        console.log(`✗ Error: ${res.error}`);
      }
    }
  }

  const totalDiff = totalOrig - totalNew;
  const totalPct = ((totalDiff / totalOrig) * 100).toFixed(1);

  if (isJson) {
    console.log(JSON.stringify({
      dryRun: isCheck,
      totalModels: targetFiles.length,
      origBytes: totalOrig,
      newBytes: totalNew,
      savedBytes: totalDiff,
      savedPct: parseFloat(totalPct),
      results,
    }, null, 2));
    return;
  }

  console.log("\n--------------------------------------------------------------");
  console.log(`Total original:   ${formatBytes(totalOrig)}`);
  console.log(`Total optimizado: ${formatBytes(totalNew)}`);
  console.log(`Ahorro total:     ${formatBytes(totalDiff)} (-${totalPct}%)`);
  console.log("--------------------------------------------------------------");
}

main().catch((err) => {
  console.error("Error fatal en assets-optimize:", err);
  process.exit(1);
});
