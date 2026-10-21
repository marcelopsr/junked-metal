// npm run todos [-- estado <slug> <estado> [--rama r] [--cuenta c] | tomar <slug> --cuenta c --rama r | encargo <slug>]
// Lee docs/todos/*.md, valida la cabecera (FORMATO.md) y genera el tablero README.md. Formato: docs/todos/FORMATO.md
// ponytail: cabecera = «clave: valor» planos (sin YAML anidado); un comentario es « # ...» al final de la línea.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIR = process.env.TODOS_DIR ?? fileURLToPath(new URL('../docs/todos/', import.meta.url)); // TODOS_DIR: la prueba trabaja sobre una copia
const PIE = [fileURLToPath(new URL('../.claude/trabajo/pie-encargo.md', import.meta.url)), fileURLToPath(new URL('../docs/plantillas/pie-encargo.md', import.meta.url))];
const OK = {
  estado: ['idea', 'pregunta', 'elegida', 'en-curso', 'en-lote', 'hecha', 'descartada'],
  area: ['juego', 'arte', 'server', 'portada', 'infra', 'docs'],
  prioridad: ['alta', 'media', 'baja'],
  origen: ['pedido', 'hallazgo', 'pendiente', 'decision', 'idea'],
  tomado_por: ['', ...(process.env.TODOS_CUENTAS ?? 'mac').split(',')], // ponytail: cuentas por env, ajustar por repo
};
const CUENTAS = OK.tomado_por.filter(Boolean);
const OBLIG = ['titulo', 'estado', 'area', 'prioridad', 'origen'];
const CONOCIDAS = [...OBLIG, 'etapa', 'tomado_por', 'rama', 'desde', 'ficha', 'brecha', 'motivo', 'viejo_id'];

export const hoyPY = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Asuncion' });

export function parsear(txt) {
  const m = txt.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return null;
  const cab = {};
  for (const l of m[1].split('\n')) {
    const k = l.match(/^(\w+):\s*(.*?)\s*(?:\s#.*)?$/);
    if (k) cab[k[1]] = k[2];
  }
  return { cab, cuerpo: m[2] };
}

export function validar(cab) {
  const e = [];
  for (const k of OBLIG) if (!cab[k]) e.push(`falta «${k}»`);
  for (const k of Object.keys(cab)) if (!CONOCIDAS.includes(k)) e.push(`campo desconocido «${k}»`);
  for (const [k, v] of Object.entries(OK)) if (cab[k] && !v.includes(cab[k])) e.push(`${k}: «${cab[k]}» no es válido (${v.filter(Boolean).join('|')})`);
  if (cab.estado === 'en-curso') for (const k of ['tomado_por', 'rama']) if (!cab[k]) e.push(`en-curso exige «${k}»`);
  if (['descartada', 'pregunta'].includes(cab.estado) && !cab.motivo) e.push(`${cab.estado} exige «motivo»`);
  if (cab.desde && !/^\d{4}-\d{2}-\d{2}$/.test(cab.desde)) e.push('desde: formato AAAA-MM-DD');
  return e;
}

export function leer(dir = DIR) {
  return readdirSync(dir).filter((f) => f.endsWith('.md') && !['README.md', 'FORMATO.md'].includes(f)).sort().map((f) => {
    const p = parsear(readFileSync(dir + f, 'utf8'));
    return { slug: f.slice(0, -3), archivo: f, ...(p ?? { cab: {}, cuerpo: '' }), errores: p ? validar(p.cab) : ['sin cabecera «---»'] };
  });
}

export function tablero(todos) {
  const por = (e) => todos.filter((t) => t.cab.estado === e);
  const orden = { alta: 0, media: 1, baja: 2 };
  const fila = (t, ...extra) => `| [${t.cab.titulo}](${t.archivo}) | ${[t.cab.area, ...extra].join(' | ')} |`;
  const tabla = (lista, cols, f) => lista.length ? [`| TODO | área | ${cols} |`, `| --- | --- |${' --- |'.repeat(cols.split('|').length)}`, ...lista.map(f), ''] : ['_Nada._', ''];
  const sec = (h, lista, cols, f) => [`## ${h} (${lista.length})`, '', ...tabla(lista, cols, f)];
  const det = (h, lista) => [`<details><summary>${h} (${lista.length})</summary>`, '', ...tabla(lista, 'desde | motivo', (t) => fila(t, t.cab.desde || '', t.cab.motivo || '')), '</details>', ''];
  const elegidas = por('elegida').sort((a, b) => orden[a.cab.prioridad] - orden[b.cab.prioridad]);
  return [
    '# TODOs', '',
    '> Generado por `npm run todos` — no editar a mano. Formato: [FORMATO.md](FORMATO.md).', '',
    OK.estado.map((e) => `${e}: ${por(e).length}`).join(' · '), '',
    ...sec('En curso', por('en-curso'), 'quién | rama | desde', (t) => fila(t, t.cab.tomado_por, `\`${t.cab.rama}\``, t.cab.desde || '')),
    ...sec('Preguntas para el dueño', por('pregunta'), 'prioridad | pregunta', (t) => fila(t, t.cab.prioridad, t.cab.motivo)),
    ...sec('Elegidas por prioridad', elegidas, 'prioridad', (t) => fila(t, t.cab.prioridad)),
    ...sec('En lote', por('en-lote'), 'prioridad', (t) => fila(t, t.cab.prioridad)),
    ...sec('Ideas', por('idea'), 'prioridad', (t) => fila(t, t.cab.prioridad)),
    ...det('Hechas', por('hecha')),
    ...det('Descartadas', por('descartada')),
  ].join('\n');
}

// Cambia claves de la cabecera en el texto (reemplaza la línea o la agrega antes del cierre).
function poner(txt, cambios) {
  for (const [k, v] of Object.entries(cambios)) {
    const re = new RegExp(`^${k}:.*$`, 'm');
    const linea = `${k}: ${v}`;
    txt = re.test(txt.split('\n---\n')[0]) ? txt.replace(re, linea) : txt.replace(/\n---\n/, `\n${linea}\n---\n`);
  }
  return txt;
}

function cambiar(slug, cambios) {
  const f = `${DIR}${slug}.md`;
  if (!existsSync(f)) throw new Error(`no existe el TODO «${slug}»`);
  const txt = poner(readFileSync(f, 'utf8'), { ...cambios, desde: hoyPY() });
  const err = validar(parsear(txt).cab);
  if (err.length) throw new Error(`${slug}: ${err.join('; ')}`);
  writeFileSync(f, txt);
}

export function generar() {
  const todos = leer();
  const mal = todos.filter((t) => t.errores.length);
  if (mal.length) throw new Error(mal.map((t) => `${t.archivo}: ${t.errores.join('; ')}`).join('\n'));
  return tablero(todos);
}

function flags(args, permitidos) {
  const pos = [], fl = {};
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) pos.push(args[i]);
    else if (permitidos.includes(args[i].slice(2)) && i + 1 < args.length) fl[args[++i - 1].slice(2)] = args[i];
    else throw new Error(`flag desconocido o sin valor: ${args[i]}`);
  }
  return { pos, fl };
}

function main() {
  const [cmd, ...resto] = process.argv.slice(2);
  if (cmd === 'estado' || cmd === 'tomar') {
    const { pos, fl } = flags(resto, ['rama', 'cuenta']);
    const [slug, estado] = cmd === 'tomar' ? [pos[0], 'en-curso'] : pos;
    if (!slug || !estado || pos.length > (cmd === 'tomar' ? 1 : 2)) throw new Error(`uso: ${cmd === 'tomar' ? 'tomar <slug> --cuenta c --rama r' : 'estado <slug> <estado> [--rama r] [--cuenta c]'}`);
    if (!OK.estado.includes(estado)) throw new Error(`estado inválido: ${estado}`);
    if (fl.cuenta && !CUENTAS.includes(fl.cuenta)) throw new Error(`cuenta inválida: ${fl.cuenta}`);
    if (cmd === 'tomar' && (!fl.cuenta || !fl.rama)) throw new Error('tomar exige --cuenta y --rama');
    const act = leer().find((t) => t.slug === slug)?.cab;
    if (cmd === 'tomar' && act?.estado === 'en-curso' && act.tomado_por && act.tomado_por !== fl.cuenta) throw new Error(`${slug} ya está en-curso con ${act.tomado_por} (rama ${act.rama})`);
    cambiar(slug, { estado, ...(fl.rama && { rama: fl.rama }), ...(fl.cuenta && { tomado_por: fl.cuenta }) });
  } else if (cmd === 'encargo') {
    const { pos } = flags(resto, []);
    const t = leer().find((x) => x.slug === pos[0]);
    if (!t) throw new Error('uso: encargo <slug> (existente)');
    const pie = PIE.find(existsSync);
    console.log(`# ${t.cab.titulo}\n${t.cuerpo.trim()}\n\n${pie ? readFileSync(pie, 'utf8').trim() : ''}`);
    return;
  } else if (cmd) throw new Error(`comando desconocido: ${cmd}`);
  writeFileSync(`${DIR}README.md`, `${generar()}\n`);
  console.log('tablero generado: docs/todos/README.md');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { main(); } catch (e) { console.error(`todos: ${e.message}`); process.exit(1); }
}
