// node scripts/todos.check.mjs — prueba el validador, el tablero y los comandos sobre una copia temporal (no toca los TODOs reales).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parsear, tablero, validar } from './todos.mjs';

const base = { titulo: 'x', estado: 'idea', area: 'juego', prioridad: 'alta', origen: 'hallazgo' };
assert.deepEqual(validar(base), []);
assert.ok(validar({ ...base, estado: 'en-curso' }).length === 2, 'en-curso exige tomado_por y rama');
assert.deepEqual(validar({ ...base, estado: 'en-curso', tomado_por: 'mac', rama: 'a' }), []);
assert.ok(validar({ ...base, estado: 'descartada' }).some((e) => /motivo/.test(e)));
assert.ok(validar({ ...base, estado: 'pregunta' }).some((e) => /motivo/.test(e)));
assert.ok(validar({ ...base, area: 'otro', raro: '1' }).length === 2);
const p = parsear('---\ntitulo: A b   # coment\nrama:\n---\ncuerpo\n');
assert.equal(p.cab.titulo, 'A b'); assert.equal(p.cab.rama, ''); assert.equal(p.cuerpo.trim(), 'cuerpo');
const t = tablero([{ archivo: 'a.md', cab: { ...base, estado: 'elegida', prioridad: 'baja', titulo: 'B' } }, { archivo: 'b.md', cab: { ...base, estado: 'elegida', titulo: 'A' } }]);
assert.ok(t.indexOf('[A](b.md)') < t.indexOf('[B](a.md)'), 'elegidas por prioridad');
assert.ok(t.includes('no editar a mano'));
const tmp = mkdtempSync(join(tmpdir(), 'todos-check-')) + '/';
writeFileSync(tmp + 'ejemplo.md', '---\ntitulo: Préstamo de paletas\nestado: en-curso\narea: juego\nprioridad: media\norigen: pedido\ntomado_por: mac\nrama: frit/ejemplo\n---\n\n## Qué y por qué\nEjemplo.\n');
const cli = (...a) => spawnSync(process.execPath, ['scripts/todos.mjs', ...a], { encoding: 'utf8', env: { ...process.env, TODOS_DIR: tmp } });
assert.notEqual(cli('--raro').status, 0, 'rechaza comando/flag desconocido');
assert.notEqual(cli('estado', 'ejemplo', 'hecha', '--raro', 'x').status, 0, 'rechaza flag desconocido');
assert.notEqual(cli('tomar', 'ejemplo', '--cuenta', 'pc2', '--rama', 'r').status, 0, 'no pisa un en-curso de otra cuenta');
assert.match(cli('encargo', 'ejemplo').stdout, /Préstamo de paletas[\s\S]*REGLAS DE CIERRE|CIERRE OBLIGATORIO/);
console.log('todos.check OK');
