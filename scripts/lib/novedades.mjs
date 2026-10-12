// Convierte asuntos de commit (conventional commits) en entradas de portada/novedades.json.
const SIN_ALCANCE = /^(server|test|docs|chore|refactor|ci|build|deps|scripts|infra|publicar)$/i;
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// Devuelve el título legible o null si el commit no cuenta para jugadores.
export function tituloDeAsunto(asunto) {
  const m = asunto.match(/^(feat|fix)(?:\(([^)]*)\))?!?:\s*(.+)$/i);
  if (!m) return null;
  const visible = /\[visible\]/i.test(m[3]);
  if (m[2] && SIN_ALCANCE.test(m[2]) && !visible) return null;
  const t = m[3].replace(/\s*\[visible\]\s*/i, " ").trim().replace(/[.\s]+$/, "");
  return t ? t[0].toUpperCase() + t.slice(1) : null;
}

// asuntos: más recientes primero. Devuelve hasta `max` entradas nuevas sin repetir títulos.
export function novedadesDeAsuntos(asuntos, existentes, fecha, max = 3) {
  const vistos = new Set(existentes.map((e) => norm(e.titulo)));
  const out = [];
  for (const a of asuntos) {
    const titulo = tituloDeAsunto(a);
    if (!titulo || vistos.has(norm(titulo))) continue;
    vistos.add(norm(titulo));
    out.push({ fecha, titulo, texto: `${titulo}.` });
    if (out.length === max) break;
  }
  return out;
}
