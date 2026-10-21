// npm run docs:check — revisa la documentación de traspaso, todos, decisiones, plantillas y críticas:
// enlaces relativos rotos, archivos de más de 80 líneas (menos el tablero generado y los informes de criticas/, que son evidencia), cabeceras de TODO, ramas en-curso inexistentes y tablero desactualizado.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
// Carpetas ignoradas por git (graphify-out, data, privado) no existen en los worktrees: no cuentan como enlace roto.
const ignorado = (ruta) => spawnSync('git', ['check-ignore', '-q', ruta]).status === 0;
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generar, leer } from './todos.mjs';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const BASE = join(RAIZ, 'docs');
const CARPETAS = ['traspaso', 'todos', 'decisiones', 'plantillas'];
const TABLERO = join(BASE, 'todos/README.md');
const LIMITE = 80;

export function revisar() {
  const mal = [];
  const rel = (f) => f.slice(RAIZ.length);
  for (const c of CARPETAS) {
    if (!existsSync(join(BASE, c))) continue;
    for (const f of readdirSync(join(BASE, c), { recursive: true }).filter((x) => x.endsWith('.md')).map((x) => join(BASE, c, x))) {
      const txt = readFileSync(f, 'utf8');
      if (f !== TABLERO && !/\/criticas\/(?!README)/.test(f) && txt.split('\n').length - 1 > LIMITE) mal.push(`${rel(f)}: más de ${LIMITE} líneas`);
      // ponytail: enlaces [t](ruta) fuera de bloques de código; las plantillas llevan ejemplos, se ignoran los de código.
      const sinCodigo = txt.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
      for (const m of sinCodigo.matchAll(/\]\(((?:[^()\s]|\([^)]*\))+)\)/g)) {
        const d = m[1].split('#')[0];
        if (!d || /^[a-z]+:/i.test(d)) continue;
        if (!existsSync(resolve(dirname(f), d)) && !ignorado(resolve(dirname(f), d))) mal.push(`${rel(f)}: enlace roto ${m[1]}`);
      }
    }
  }
  const todos = leer();
  for (const t of todos) {
    for (const e of t.errores) mal.push(`todos/${t.archivo}: ${e}`);
    if (t.cab.estado === 'en-curso' && t.cab.rama && !process.env.CI) {
      try { execFileSync('git', ['rev-parse', '--verify', '--quiet', t.cab.rama], { cwd: RAIZ, stdio: 'ignore' }); }
      catch { mal.push(`todos/${t.archivo}: la rama «${t.cab.rama}» no existe`); }
    }
  }
  if (!todos.some((t) => t.errores.length)) {
    if (!existsSync(TABLERO) || readFileSync(TABLERO, 'utf8') !== `${generar()}\n`) mal.push('todos/README.md desactualizado: correr npm run todos');
  }
  return mal;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mal = revisar();
  console.log(mal.length ? `MAL docs:check\n${mal.map((m) => `    ${m}`).join('\n')}` : 'OK docs:check');
  process.exit(mal.length ? 1 : 0);
}
