#!/usr/bin/env node
// Genera referencias visuales por la API de imágenes de Capataz (http://127.0.0.1:8317/v1/images/generations, solo local).
// Uso: node scripts/imagegen.mjs [--proveedor gpt|gemini|auto] <job.json|id> [...]   (jobs en assets-src/imagegen-production/encore-v1/jobs/)
//      node scripts/imagegen.mjs [--proveedor ...] --nuevo <id> "<sujeto en inglés>" [categoria]   crea el job con el prompt base y lo genera
//      node scripts/imagegen.mjs --importar   copia los PNG nuevos de raw/ a assets-src/ref-rcrace/refN.png (dedupe 16×16)
// Opciones: --concurrencia N (default 8)  --fit cover|contain|exact  --quitar-fondo (remove_background)  --referencia <archivo> (repetible; usa /v1/images/edits)
//           --size WxH (la salida mide exacto eso)  --cupo (GET /v1/images/quota y sale). fit/quitar-fondo/referencia también se leen del job (fit, remove_background, references[]).
// Proveedores: gpt (ChatGPT, respeta fondo transparente, ~60 s), gemini (~17 s, sin transparencia: fondo gris y aviso), auto (Capataz decide; con transparencia va a gpt).
// Clave: primera línea de ~/.capataz/clientes/rc_fight.key (solo imágenes/video/modelos). Los jobs se generan en paralelo: Capataz rota cuentas.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DIR = join(ROOT, "assets-src/imagegen-production/encore-v1");
const BASE_URL = "http://127.0.0.1:8317/v1/images";
const TIMEOUT_MS = 6 * 60_000; // gpt-image tarda ~55 s; margen para colas
const MODELO = { gpt: "gpt-image", gemini: "gemini-3.1-flash-image", auto: "auto" };
const BASE = "Use case: stylized-concept. Junked Metal ENCORE asset candidate. Premium real 3D miniature toy, softly beveled low-poly geometry, deliberate painted pixel clusters, localized edge wear with chipped paint showing grey metal, rivets, rich material separation and tactile detail. Handcrafted miniature diorama direction, retroindustrial theatrical salvage character. Subject: %S. Single complete isolated object in three-quarter front view, entire silhouette occupies at most 75 percent of canvas, generous transparent margins. Restrained neutral studio lighting. True transparent background; no backdrop, halo, ground, collage, card frame, logos, letters or watermark. Crisp detailed game art reference, not a screenshot.";

const args = process.argv.slice(2);
const opt = (nombre, multiple = false) => { // saca "--nombre valor" de args
  const vals = [];
  for (let i; (i = args.indexOf(nombre)) >= 0;) { vals.push(args[i + 1]); args.splice(i, 2); if (!multiple) break; }
  return multiple ? vals : vals[0];
};
const flag = (nombre) => { const i = args.indexOf(nombre); if (i >= 0) args.splice(i, 1); return i >= 0; };
const prov = opt("--proveedor") ?? "auto";
const concurrencia = Math.max(1, Number(opt("--concurrencia") ?? 8) || 8);
const fitCli = opt("--fit");
const sizeCli = opt("--size");
const quitarCli = flag("--quitar-fondo");
const verCupo = flag("--cupo");
const refsCli = opt("--referencia", true);
if (!MODELO[prov]) { console.error(`proveedor inválido: ${prov} (gpt|gemini|auto)`); process.exit(1); }
if (fitCli && !["cover", "contain", "exact"].includes(fitCli)) { console.error(`--fit inválido: ${fitCli} (cover|contain|exact)`); process.exit(1); }
if (!args.length && !verCupo) { console.log(readFileSync(import.meta.filename, "utf8").split("\n").slice(1, 9).join("\n")); process.exit(1); }

if (args[0] === "--importar") {
  execFileSync(join(ROOT, ".venv-ref/bin/python"), [join(ROOT, "scripts/imagegen_import.py")], { stdio: "inherit", cwd: ROOT });
  process.exit(0);
}

const KEY = readFileSync(join(homedir(), ".capataz/clientes/rc_fight.key"), "utf8").split("\n")[0].trim();
const auth = { authorization: `Bearer ${KEY}` };

if (verCupo) {
  const r = await fetch(`${BASE_URL}/quota`, { headers: auth, signal: AbortSignal.timeout(30_000) });
  console.log([404, 501].includes(r.status) ? "cupo: /v1/images/quota aún no existe en este Capataz" : JSON.stringify(await r.json().catch(() => ({ status: r.status })), null, 2));
  process.exit(r.ok ? 0 : 1);
}

let jobs = args;
if (args[0] === "--nuevo") {
  const [, id, subject, category = "encore-props"] = args;
  const prompt = BASE.replace("%S", subject);
  writeFileSync(join(DIR, "jobs", `${id}.json`), JSON.stringify({ id, name: id, category, state: "pending", subject, prompt, tool_arguments: { prompt, transparent_background: true }, output: `raw/${id}.png` }, null, 2) + "\n");
  jobs = [id];
}

const dormir = (s) => new Promise((ok) => setTimeout(ok, s * 1000));

/** Un POST con reintentos: 429 respeta Retry-After (hasta 5), 502/504 un reintento. Devuelve {png, meta}. */
async function pedir(ruta, mkInit, id) {
  for (let intento = 0; ; intento++) {
    const r = await fetch(`${BASE_URL}/${ruta}`, { method: "POST", ...mkInit(), signal: AbortSignal.timeout(TIMEOUT_MS) });
    const j = await r.json().catch(() => ({}));
    const aviso = j.capataz?.warnings;
    if (r.ok) { if (aviso?.length) console.warn(`  [${id}] AVISO: ${aviso.join("; ")}`); return { png: Buffer.from(j.data[0].b64_json, "base64"), meta: j.capataz }; }
    const code = j.error?.code ?? j.error?.message ?? "";
    if (r.status === 429 && intento < 5) { const s = Number(r.headers.get("retry-after")) || 20; console.warn(`  [${id}] 429 ${code}: reintento en ${s} s`); await dormir(s); continue; }
    if ((r.status === 502 || r.status === 504) && intento < 1) { console.warn(`  [${id}] ${r.status} ${code}: reintento`); await dormir(5); continue; }
    if (r.status === 404 || (r.status === 400 && /param|unknown|unsupported|fit|remove_background|image/i.test(`${code} ${j.error?.message ?? ""} ${j.error?.param ?? ""}`)))
      throw new Error(`${r.status} ${code} — ¿este Capataz aún no soporta fit/remove_background/edits? (param: ${j.error?.param ?? "?"}); quitá la opción o actualizá Capataz`);
    throw new Error(`${r.status} ${code}`);
  }
}

function generar(job, id) {
  const prompt = job.tool_arguments?.prompt ?? job.prompt;
  const transparente = !!job.tool_arguments?.transparent_background;
  const fit = fitCli ?? job.fit, size = sizeCli ?? job.size;
  const quitar = quitarCli || job.remove_background;
  const refs = refsCli.length ? refsCli : job.references ?? [];
  const campos = { model: MODELO[prov], prompt, n: 1, output_format: "png", background: transparente ? "transparent" : "opaque", ...(fit && { fit }), ...(size && { size }), ...(quitar && { remove_background: true }) };
  if (!refs.length) return pedir("generations", () => ({ headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify(campos) }), id);
  return pedir("edits", () => { // multipart estilo OpenAI: image[] repetido + campos
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.append(k, String(v));
    for (const ref of refs) f.append("image[]", new Blob([readFileSync(resolve(ref))], { type: "image/png" }), basename(ref));
    return { headers: auth, body: f };
  }, id);
}

async function hacer(j) {
  const path = existsSync(j) ? j : join(DIR, "jobs", `${j.replace(/\.json$/, "")}.json`);
  const job = JSON.parse(readFileSync(path, "utf8"));
  const out = join(DIR, job.output);
  console.log(`[imagegen] ${job.id} → ${job.output} (${prov})`);
  try {
    const { png, meta } = await generar(job, job.id);
    writeFileSync(out, png);
    job.state = "imagegen-generated";
    job.last_generation = { method: "capataz /v1/images/generations", provider: meta?.provider, model: meta?.model, ms: meta?.ms, ...(meta?.warnings?.length && { warnings: meta.warnings }), at: new Date().toISOString() };
    writeFileSync(path, JSON.stringify(job, null, 2) + "\n");
    console.log(`[imagegen] ok ${job.id} (${meta?.provider}, ${Math.round((meta?.ms ?? 0) / 1000)} s)`);
  } catch (e) { console.error(`[imagegen] FALLÓ ${job.id}: ${e.message}`); process.exitCode = 1; }
}

// Pool de `concurrencia` trabajadores sobre la cola de jobs.
const cola = [...jobs];
await Promise.all(Array.from({ length: Math.min(concurrencia, cola.length) }, async () => { for (let j; (j = cola.shift());) await hacer(j); }));
