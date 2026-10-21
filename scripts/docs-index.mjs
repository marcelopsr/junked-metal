// npm run docs:index — genera docs/README.md: cada archivo y carpeta de docs/ con su título (primera línea «# …»)
// y su estado: vigente (raíz), archivo (docs/archivo/**), traspaso/todos/decisiones (método repo-vivo). No se edita a mano.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const DOCS = join(RAIZ, "docs");
const titulo = (f) => {
  const t = readFileSync(f, "utf8").split("\n").find((l) => /^#\s+/.test(l));
  return (t ?? "").replace(/^#\s+/, "").replace(/\s+—.*$/, "").trim() || "(sin título)";
};
const md = (dir) => readdirSync(dir).filter((x) => x.endsWith(".md") && x !== "README.md").sort();
const dirs = (dir) => readdirSync(dir).filter((x) => statSync(join(dir, x)).isDirectory() && !x.startsWith(".")).sort();
const fila = (f) => `| [${relative(DOCS, f)}](${relative(DOCS, f)}) | ${titulo(f)} |`;

const metodo = { traspaso: "Protocolo, handoff, guía, manual, hecho, problemas, memoria del dueño", todos: "Un archivo por TODO; tablero generado", decisiones: "ADR: por qué las cosas son así", plantillas: "Plantillas de TODO, encargo y decisión" };
const out = ["# docs/", "", "> Generado por `npm run docs:index`: no editar a mano. Qué manda hoy: `ART_DIRECTION.md` (arte), `ROADMAP-1.0.md` (producto), `traspaso/` (cómo se trabaja), `todos/` (qué falta), `decisiones/` (por qué). Lo de `archivo/` es historia: no se sigue.", ""];
out.push("## Método repo-vivo", "", "| Carpeta | Qué es |", "| --- | --- |");
for (const d of Object.keys(metodo)) out.push(`| [${d}/](${d}/${d === "traspaso" ? "INDICE" : "README"}.md) | ${metodo[d]} |`);
out.push("", "## Vigentes (raíz de docs/)", "", "| Archivo | Título |", "| --- | --- |");
for (const f of md(DOCS)) out.push(fila(join(DOCS, f)));
for (const d of dirs(DOCS).filter((x) => !(x in metodo) && x !== "archivo")) {
  const files = md(join(DOCS, d)); if (!files.length && !dirs(join(DOCS, d)).length) continue;
  out.push("", `## ${d}/`, "", "| Archivo | Título |", "| --- | --- |");
  const walk = (dir) => { for (const f of md(dir)) out.push(fila(join(dir, f))); for (const s of dirs(dir)) walk(join(dir, s)); };
  walk(join(DOCS, d));
}
const arch = join(DOCS, "archivo");
try { statSync(arch); out.push("", "## archivo/ (historia, no se sigue)", "", "| Carpeta | Qué hay |", "| --- | --- |"); for (const d of dirs(arch)) out.push(`| [archivo/${d}/](archivo/${d}/README.md) | ${md(join(arch, d)).length} archivos |`); } catch {}
writeFileSync(join(DOCS, "README.md"), out.join("\n") + "\n");
console.log("índice generado: docs/README.md");
