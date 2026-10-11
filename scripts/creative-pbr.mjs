#!/usr/bin/env node
/**
 * scripts/creative-pbr.mjs
 * Generador automático de mapas PBR (Normal Map y Roughness Map) a partir de albedos generados con ComfyUI / SDXL.
 *
 * Características:
 * - Calcula mapas de normales en espacio tangente con kernel Sobel y fuerza ajustable (--strength).
 * - Calcula mapas de rugosidad calibrados físicamente (--roughness-min, --roughness-max).
 * - Admite entrada en WebP o PNG (descomprime con cwebp/dwebp o pngjs).
 * - Exporta directamente a WebP optimizado con metadatos .meta.json listos para Babylon.js / render.ts.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname, basename, extname } from "node:path";
import { tmpdir } from "node:os";
import { PNG } from "pngjs";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    input: null,
    outDir: null,
    strength: 2.0,
    roughnessMin: 0.35,
    roughnessMax: 0.92,
    invertY: false,
    quality: 85,
  };

  for (let i = 0; i < args.length; i++) {
    const k = args[i];
    const v = args[i + 1];
    if (k === "--input" || k === "-i") { opts.input = resolve(v); i++; }
    else if (k === "--out-dir" || k === "-o") { opts.outDir = resolve(v); i++; }
    else if (k === "--strength" || k === "-s") { opts.strength = parseFloat(v); i++; }
    else if (k === "--roughness-min") { opts.roughnessMin = parseFloat(v); i++; }
    else if (k === "--roughness-max") { opts.roughnessMax = parseFloat(v); i++; }
    else if (k === "--invert-y") { opts.invertY = true; }
    else if (k === "--quality" || k === "-q") { opts.quality = parseInt(v, 10); i++; }
    else if (k === "--help" || k === "-h") {
      console.log(`Uso: node scripts/creative-pbr.mjs --input <albedo.webp|png> [opciones]

Opciones:
  --input, -i <path>         Ruta al albedo de entrada (requerido)
  --out-dir, -o <path>       Directorio de salida (por defecto: mismo que el archivo de entrada)
  --strength, -s <float>     Intensidad del relieve en el mapa de normales (default: 2.0)
  --roughness-min <float>    Rugosidad mínima para zonas reflectantes (default: 0.35)
  --roughness-max <float>    Rugosidad máxima para zonas opacas (default: 0.92)
  --invertY                  Invertir canal verde (DirectX vs OpenGL)
  --quality, -q <int>        Calidad WebP (default: 85)
`);
      process.exit(0);
    }
  }

  if (!opts.input) {
    console.error("Error: --input es obligatorio.");
    process.exit(1);
  }

  return opts;
}

function loadToPng(inputPath) {
  let pngBuffer;
  const isWebp = inputPath.endsWith(".webp");
  let tmpPng = null;

  if (isWebp) {
    tmpPng = resolve(tmpdir(), `pbr_decode_${Date.now()}.png`);
    const dwebpBin = existsSync("/opt/homebrew/bin/dwebp") ? "/opt/homebrew/bin/dwebp" : "dwebp";
    execSync(`${dwebpBin} "${inputPath}" -o "${tmpPng}"`, { stdio: "ignore" });
    pngBuffer = readFileSync(tmpPng);
    unlinkSync(tmpPng);
  } else {
    pngBuffer = readFileSync(inputPath);
  }

  return PNG.sync.read(pngBuffer);
}

function generateNormalAndRoughness(png, opts) {
  const { width, height, data } = png;
  const heightMap = new Float32Array(width * height);

  // 1. Luminancia como mapa de altura
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const r = data[idx] / 255;
    const g = data[idx + 1] / 255;
    const b = data[idx + 2] / 255;
    heightMap[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const normalPng = new PNG({ width, height });
  const roughnessPng = new PNG({ width, height });

  const getH = (x, y) => {
    const clampedX = (x + width) % width; // wrap para texturas tileables
    const clampedY = (y + height) % height;
    return heightMap[clampedY * width + clampedX];
  };

  const scale = opts.strength;
  const ySign = opts.invertY ? -1.0 : 1.0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Sobel kernel 3x3
      const tl = getH(x - 1, y - 1);
      const t  = getH(x,     y - 1);
      const tr = getH(x + 1, y - 1);
      const l  = getH(x - 1, y);
      const r  = getH(x + 1, y);
      const bl = getH(x - 1, y + 1);
      const b  = getH(x,     y + 1);
      const br = getH(x + 1, y + 1);

      const dx = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
      const dy = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);

      let nx = -dx * scale;
      let ny = -dy * scale * ySign;
      let nz = 1.0;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;

      normalPng.data[idx]     = Math.min(255, Math.max(0, Math.round((nx * 0.5 + 0.5) * 255)));
      normalPng.data[idx + 1] = Math.min(255, Math.max(0, Math.round((ny * 0.5 + 0.5) * 255)));
      normalPng.data[idx + 2] = Math.min(255, Math.max(0, Math.round((nz * 0.5 + 0.5) * 255)));
      normalPng.data[idx + 3] = 255;

      // Roughness map: zonas oscuras/grietas más rugosas, zonas altas/lisas más reflectantes
      const h = heightMap[y * width + x];
      const slope = Math.min(1.0, Math.sqrt(dx * dx + dy * dy) * 2.0);
      const baseRough = opts.roughnessMin + (1.0 - h) * (opts.roughnessMax - opts.roughnessMin);
      const finalRough = Math.min(1.0, baseRough + slope * 0.2);
      const roughByte = Math.round(finalRough * 255);

      roughnessPng.data[idx]     = roughByte;
      roughnessPng.data[idx + 1] = roughByte;
      roughnessPng.data[idx + 2] = roughByte;
      roughnessPng.data[idx + 3] = 255;
    }
  }

  return { normalPng, roughnessPng };
}

function savePngToWebp(png, destWebp, quality) {
  const tmpPng = resolve(tmpdir(), `pbr_tmp_${Date.now()}_${basename(destWebp)}.png`);
  writeFileSync(tmpPng, PNG.sync.write(png));
  const cwebpBin = existsSync("/opt/homebrew/bin/cwebp") ? "/opt/homebrew/bin/cwebp" : "cwebp";
  execSync(`${cwebpBin} -q ${quality} "${tmpPng}" -o "${destWebp}"`, { stdio: "ignore" });
  unlinkSync(tmpPng);
}

export async function processPbrSet(inputPath, options = {}) {
  const opts = {
    strength: options.strength ?? 2.0,
    roughnessMin: options.roughnessMin ?? 0.35,
    roughnessMax: options.roughnessMax ?? 0.92,
    invertY: options.invertY ?? false,
    quality: options.quality ?? 85,
    outDir: options.outDir || dirname(inputPath),
  };

  if (!existsSync(inputPath)) {
    throw new Error(`Archivo no encontrado: ${inputPath}`);
  }

  const baseNameNoExt = basename(inputPath, extname(inputPath)).replace(/_albedo$/, "");
  const outDir = opts.outDir;
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const normalOut = resolve(outDir, `${baseNameNoExt}_normal.webp`);
  const roughnessOut = resolve(outDir, `${baseNameNoExt}_roughness.webp`);
  const metaOut = resolve(outDir, `${baseNameNoExt}_pbr.meta.json`);

  const png = loadToPng(inputPath);
  const { normalPng, roughnessPng } = generateNormalAndRoughness(png, opts);

  savePngToWebp(normalPng, normalOut, opts.quality);
  savePngToWebp(roughnessPng, roughnessOut, opts.quality);

  const meta = {
    source: inputPath,
    generated_at: new Date().toISOString(),
    resolution: `${png.width}x${png.height}`,
    parameters: {
      strength: opts.strength,
      roughness_min: opts.roughnessMin,
      roughness_max: opts.roughnessMax,
      quality: opts.quality,
    },
    maps: {
      albedo: inputPath,
      normal: normalOut,
      roughness: roughnessOut,
    },
  };
  writeFileSync(metaOut, JSON.stringify(meta, null, 2), "utf-8");

  return { normalOut, roughnessOut, metaOut, meta };
}

async function main() {
  const opts = parseArgs();
  console.log("=== GENERADOR DE MAPAS PBR (NORMAL & ROUGHNESS) ===");
  console.log(`Entrada:     ${opts.input}`);
  console.log(`Fuerza:      ${opts.strength} | Rugosidad: [${opts.roughnessMin} - ${opts.roughnessMax}]`);

  const t0 = Date.now();
  const res = await processPbrSet(opts.input, opts);
  const duration = ((Date.now() - t0) / 1000).toFixed(2);

  console.log(`\n✔ Mapa de Normales:   ${res.normalOut}`);
  console.log(`✔ Mapa de Rugosidad:  ${res.roughnessOut}`);
  console.log(`✔ Metadatos PBR:      ${res.metaOut}`);
  console.log(`Procesado en ${duration}s.`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename || "")) {
  main().catch((err) => {
    console.error("Error en creative-pbr:", err.message || err);
    process.exit(1);
  });
}
