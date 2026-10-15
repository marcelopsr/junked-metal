#!/usr/bin/env node
// Genera referencias visuales con la cuenta de ChatGPT del usuario vía Codex CLI (`codex exec`, herramienta image_generation).
// Uso: node scripts/imagegen.mjs <job.json|id> [...]      (jobs en assets-src/imagegen-production/encore-v1/jobs/)
//      --gemini (en cualquier posición): usa gemini-3.1-flash-image por el gateway local de Capataz (clave en ~/Devs/Varios/Capataz/.env, no se copia) en vez de Codex.
//      node scripts/imagegen.mjs --nuevo <id> "<sujeto en inglés>" [categoria]   crea el job con el prompt base y lo genera
// Salida: raw/<id>.png del job; después `node scripts/imagegen.mjs --importar` copia los PNG nuevos a assets-src/ref-rcrace/refN.png.
// ponytail: un job por llamada a codex, en serie; techo: si hacen falta decenas por tanda, paralelizar con un tope de 2-3.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DIR = join(ROOT, "assets-src/imagegen-production/encore-v1");
const BASE = "Use case: stylized-concept. Junked Metal ENCORE asset candidate. Premium real 3D miniature toy, softly beveled low-poly geometry, deliberate painted pixel clusters, localized edge wear with chipped paint showing grey metal, rivets, rich material separation and tactile detail. Handcrafted miniature diorama direction, retroindustrial theatrical salvage character. Subject: %S. Single complete isolated object in three-quarter front view, entire silhouette occupies at most 75 percent of canvas, generous transparent margins. Restrained neutral studio lighting. True transparent background; no backdrop, halo, ground, collage, card frame, logos, letters or watermark. Crisp detailed game art reference, not a screenshot.";

const GEM = process.argv.includes("--gemini");
const args = process.argv.slice(2).filter((a) => a !== "--gemini");
if (!args.length) { console.log(readFileSync(import.meta.filename, "utf8").split("\n").slice(1, 6).join("\n")); process.exit(1); }

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

for (const j of jobs) {
  const path = existsSync(j) ? j : join(DIR, "jobs", `${j.replace(/\.json$/, "")}.json`);
  const job = JSON.parse(readFileSync(path, "utf8"));
  const out = join(DIR, job.output);
  const ask = `Generá UNA imagen con tu herramienta de generación de imágenes usando exactamente este prompt${job.tool_arguments?.transparent_background ? " y fondo transparente" : ""}:\n\n${job.tool_arguments?.prompt ?? job.prompt}\n\nGuardá el PNG resultante en ${out} (sobrescribí si existe). No hagas nada más ni edites otros archivos. Al final respondé solo la ruta guardada.`;
  console.log(`[imagegen] ${job.id} → ${job.output}`);
  if (GEM) await gemini(job.tool_arguments?.prompt ?? job.prompt, out);
  else execFileSync("codex", ["exec", "--skip-git-repo-check", "-s", "workspace-write", "-C", DIR, ask], { stdio: "inherit" });
  if (!existsSync(out)) { console.error(`[imagegen] FALLÓ: no apareció ${out}`); process.exitCode = 1; continue; }
  job.state = "imagegen-generated"; job.last_generation = { method: GEM ? "capataz gemini-3.1-flash-image" : "codex exec image_generation", at: new Date().toISOString() };
  writeFileSync(path, JSON.stringify(job, null, 2) + "\n");
}

/** Gemini por el gateway de Capataz (OpenAI-compatible): devuelve la imagen en message.images[0] como data URL; se convierte a PNG con sips. */
async function gemini(prompt, out) {
  const env = Object.fromEntries(readFileSync(join(process.env.HOME, "Devs/Varios/Capataz/.env"), "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
  const r = await fetch(`http://localhost:${env.CAPATAZ_PORT || 8317}/v1/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${env.CAPATAZ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gemini-3.1-flash-image", messages: [{ role: "user", content: `Generate an image. ${prompt.replace(/True transparent background;?/i, "Plain flat dark grey background;")}` }] }) });
  const url = (await r.json())?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) { console.error("[imagegen] gemini no devolvió imagen", r.status); return; }
  const tmp = out.replace(/\.png$/, ".tmp");
  writeFileSync(tmp, Buffer.from(url.split(",")[1], "base64"));
  execFileSync("sips", ["-s", "format", "png", tmp, "--out", out], { stdio: "ignore" }); execFileSync("rm", [tmp]);
}
