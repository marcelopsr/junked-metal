// Qué sesiones de scenarios.mjs tocan los archivos cambiados (git diff contra `base` + sin versionar).
// ponytail: mapa a mano por nombre de archivo; si un archivo nuevo no matchea, cae en "core" (lab + partida) y se avisa.
import { execSync } from "node:child_process";
const MAP = [
  [/^(docs|assets-src|logs|graphify-out)\/|\.md$|\.test\.ts$|^src\/(balance\.json|savefmt\.ts)$|^scripts\/(sim|balance|shots|perf|test-restart|lib\/changed)|^src\/sfx\.ts$/, []], // sin efecto visual: npm test / sim
  [/kart|race\.css/, ["carrera", "carrera2j"]],
  [/duel/, ["duel", "duel_menu"]],
  [/match3/, ["match3", "match3_menu"]],
  [/folded/, ["folded", "folded2", "folded2_jefes"]],
  [/art_lab|art-lab/, []],
  [/menu|kit\.css|loading|intro/, ["menu", "taller"]],
  [/input|touch/, ["controles", "tactil"]],
  [/ui\.ts|hud\.css|icons|weapons|pilots|replay/, ["partida", "partida_llena", "tactil"]],
  [/enemies|models|glb|fx|car\.ts|carGlb/, ["lab", "partida"]],
  [/render|world|bjs|style\.css|main\.ts|vite|scenarios|browser\.mjs/, ["menu", "lab", "partida", "carrera"]], // núcleo: una muestra de cada modo grande
];
export function changedSessions(base = "HEAD") {
  const files = execSync(`git diff --name-only ${base}; git ls-files --others --exclude-standard`, { encoding: "utf8" }).split("\n").filter(Boolean);
  const out = new Set();
  for (const f of files) {
    const hit = MAP.find(([re]) => re.test(f));
    if (!hit) { console.error(`--changed: ${f} sin mapa → core (lab, partida)`); out.add("lab").add("partida"); continue; }
    hit[1].forEach((s) => out.add(s));
  }
  return { files, sessions: [...out] };
}
