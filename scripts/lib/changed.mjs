// Qué sesiones de scenarios.mjs tocan los archivos cambiados (git diff contra `base` + sin versionar).
// ponytail: mapa a mano por nombre de archivo; si un archivo nuevo no matchea, cae en "core" (lab + partida) y se avisa.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
// Solo cuenta código y estilos del juego; el resto (arte fuente, docs, música, notas, basura sin versionar) no mueve ninguna captura.
const RELEVANT = /^(src|scripts|test)\/.*\.(ts|mjs|js|css|json)$|^(index\.html|vite\.config\.ts|package\.json)$/;
const CACHE = ".shots/hash.json";
const MAP = [
  [/^src\/zones\/libre/, []], // free roam: ninguna sesión de shots lo cubre todavía
  [/^src\/(audio\/|radio\.ts|devbot\.ts)|^scripts\/(?!scenarios|lib\/browser)/, []], // audio, bot y herramientas: sin píxeles
  [/^(docs|assets-src|logs|graphify-out)\/|\.md$|\.test\.ts$|^src\/(balance\.json|savefmt\.ts)$|^scripts\/(sim|balance|shots|perf|test-restart|lib\/changed)|^src\/sfx\.ts$/, []], // sin efecto visual: npm test / sim
  [/kart|race\.css/, ["carrera", "carrera2j"]],
  [/aliens/, ["luna", "luna_aliens"]],
  [/moon/, ["luna"]],
  [/match3/, ["match3", "match3_menu"]],
  [/folded/, ["folded", "folded2", "folded2_jefes"]],
  [/art_lab|art-lab/, []],
  [/menu|kit\.css|loading|intro/, ["menu", "taller"]],
  [/input|touch/, ["controles", "tactil"]],
  [/ui\.ts|hud\.css|icons|weapons|pilots|replay/, ["partida", "partida_llena", "tactil"]],
  [/enemies|models|glb|fx|car\.ts|carGlb/, ["lab", "partida"]],
  [/render|world|bjs|style\.css|main\.ts|vite|scenarios|browser\.mjs/, ["menu", "lab", "partida", "carrera"]], // núcleo: una muestra de cada modo grande
];
const sh = (c) => execSync(c, { encoding: "utf8", maxBuffer: 1 << 26 }).split("\n").filter(Boolean);
export const mapOf =(f) => MAP.find(([re]) => re.test(f))?.[1] ?? ["lab", "partida"]; // sin mapa → core
/** Archivos relevantes de hoy (versionados + sin versionar, ya sin los borrados). */
function live() { return sh("git ls-files -co --exclude-standard").filter((f) => RELEVANT.test(f)); }
/** Hash por sesión: contenido de los archivos cuyo mapa la incluye. */
export function sessionHashes(files = live()) {
  const h = {};
  for (const f of files) { let b; try { b = readFileSync(f); } catch { continue; } for (const s of mapOf(f)) (h[s] ??= createHash("sha1")).update(f).update(b); }
  return Object.fromEntries(Object.entries(h).map(([k, v]) => [k, v.digest("hex")]));
}
const load = () => { try { return JSON.parse(readFileSync(CACHE, "utf8")); } catch { return {}; } };
/** Llamar tras capturar/aceptar `ids` (o todas con undefined): guarda su hash como última captura aceptada. */
export function markCaptured(ids) {
  const now = sessionHashes(), c = load();
  for (const k of ids ?? Object.keys(now)) if (now[k]) c[k] = now[k];
  mkdirSync(".shots", { recursive: true }); writeFileSync(CACHE, JSON.stringify(c, null, 1));
}
/** Sesiones afectadas por el diff cuyo hash difiere de la última captura (sin `cache` no filtra). */
export function changedSessions(base = "HEAD", { cache = true } = {}) {
  const files = [...new Set(sh(`git diff --name-only ${base}; git ls-files --others --exclude-standard`))].filter((f) => RELEVANT.test(f));
  const out = new Set();
  for (const f of files) mapOf(f).forEach((s) => out.add(s));
  let sessions = [...out];
  if (cache) { const now = sessionHashes(), c = load(); sessions = sessions.filter((s) => c[s] !== now[s]); }
  return { files, sessions };
}
