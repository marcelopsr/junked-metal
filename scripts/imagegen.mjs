#!/usr/bin/env node
// Genera referencias visuales por la API de imágenes de Capataz (http://127.0.0.1:8317/v1/images/generations, solo local).
// Uso: node scripts/imagegen.mjs [--proveedor gpt|gemini|auto] <job.json|id> [...]   (jobs en assets-src/imagegen-production/encore-v1/jobs/)
//      node scripts/imagegen.mjs [--proveedor ...] --nuevo <id> "<sujeto en inglés>" [categoria]   crea el job con el prompt base y lo genera
//      node scripts/imagegen.mjs --importar   copia los PNG nuevos de raw/ a assets-src/ref-rcrace/refN.png (dedupe 16×16)
// Proveedores: gpt (ChatGPT, respeta fondo transparente, ~60 s), gemini (~17 s, sin transparencia: fondo gris y aviso), auto (Capataz decide; con transparencia va a gpt).
// Clave: primera línea de ~/.capataz/clientes/rc_fight.key (solo imágenes/video/modelos). Los jobs se generan en paralelo: Capataz rota cuentas.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DIR = join(ROOT, "assets-src/imagegen-production/encore-v1");
const API = "http://127.0.0.1:8317/v1/images/generations";
const MODELO = { gpt: "gpt-image", gemini: "gemini-3.1-flash-image", auto: "auto" };
const BASE = "Use case: stylized-concept. Junked Metal ENCORE asset candidate. Premium real 3D miniature toy, softly beveled low-poly geometry, deliberate painted pixel clusters, localized edge wear with chipped paint showing grey metal, rivets, rich material separation and tactile detail. Handcrafted miniature diorama direction, retroindustrial theatrical salvage character. Subject: %S. Single complete isolated object in three-quarter front view, entire silhouette occupies at most 75 percent of canvas, generous transparent margins. Restrained neutral studio lighting. True transparent background; no backdrop, halo, ground, collage, card frame, logos, letters or watermark. Crisp detailed game art reference, not a screenshot.";

const args = process.argv.slice(2);
const pi = args.indexOf("--proveedor");
const prov = pi >= 0 ? args[pi + 1] : "auto";
if (pi >= 0) args.splice(pi, 2);
if (!MODELO[prov]) { console.error(`proveedor inválido: ${prov} (gpt|gemini|auto)`); process.exit(1); }
if (!args.length) { console.log(readFileSync(import.meta.filename, "utf8").split("\n").slice(1, 7).join("\n")); process.exit(1); }

if (args[0] === "--importar") {
  execFileSync(join(ROOT, ".venv-ref/bin/python"), [join(ROOT, "scripts/imagegen_import.py")], { stdio: "inherit", cwd: ROOT });
  process.exit(0);
}

let jobs = args;
if (args[0] === "--nuevo") {
  const [, id, subject, category = "encore-props"] = args;
  const prompt = BASE.replace("%S", subject);
  writeFileSync(join(DIR, "jobs", `${id}.json`), JSON.stringify({ id, name: id, category, state: "pending", subject, prompt, tool_arguments: { prompt, transparent_background: true }, output: `raw/${id}.png` }, null, 2) + "\n");
  jobs = [id];
}

const KEY = readFileSync(join(homedir(), ".capataz/clientes/rc_fight.key"), "utf8").split("\n")[0].trim();

async function generar(prompt, transparente) {
  for (let intento = 0; intento < 3; intento++) {
    const r = await fetch(API, { method: "POST", headers: { authorization: `Bearer ${KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model: MODELO[prov], prompt, n: 1, output_format: "png", background: transparente ? "transparent" : "opaque" }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { if (j.capataz?.warnings?.length) console.warn("  aviso:", j.capataz.warnings.join("; ")); return { png: Buffer.from(j.data[0].b64_json, "base64"), meta: j.capataz }; }
    const espera = Number(r.headers.get("retry-after")) || 20;
    if (r.status === 429 && intento < 2) { console.warn(`  429 ${j.error?.code ?? ""}: reintento en ${espera} s`); await new Promise((ok) => setTimeout(ok, espera * 1000)); continue; }
    throw new Error(`${r.status} ${j.error?.code ?? j.error?.message ?? ""}`);
  }
}

await Promise.all(jobs.map(async (j) => {
  const path = existsSync(j) ? j : join(DIR, "jobs", `${j.replace(/\.json$/, "")}.json`);
  const job = JSON.parse(readFileSync(path, "utf8"));
  const out = join(DIR, job.output);
  console.log(`[imagegen] ${job.id} → ${job.output} (${prov})`);
  try {
    const { png, meta } = await generar(job.tool_arguments?.prompt ?? job.prompt, !!job.tool_arguments?.transparent_background);
    writeFileSync(out, png);
    job.state = "imagegen-generated";
    job.last_generation = { method: "capataz /v1/images/generations", provider: meta?.provider, model: meta?.model, ms: meta?.ms, at: new Date().toISOString() };
    writeFileSync(path, JSON.stringify(job, null, 2) + "\n");
    console.log(`[imagegen] ok ${job.id} (${meta?.provider}, ${Math.round((meta?.ms ?? 0) / 1000)} s)`);
  } catch (e) { console.error(`[imagegen] FALLÓ ${job.id}: ${e.message}`); process.exitCode = 1; }
}));
