import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
const root = new URL('./', import.meta.url);
const inv = JSON.parse(readFileSync(new URL('inventory.json', root)));
const hashes = new Set(), ids = new Set(), records = [];
assert(inv.jobs.length > 0);
for (const e of inv.jobs) {
  assert(!ids.has(e.id)); ids.add(e.id);
  const j = JSON.parse(readFileSync(new URL(e.job, root)));
  assert.equal(j.id, e.id); assert.equal(j.state, e.state);
  assert.equal(j.prompt, j.tool_arguments.prompt);
  assert.equal(j.output, e.output); assert.equal(e.state, 'imagegen-generated');
  assert(readFileSync(j.design_source).length > 0);
  const bytes = readFileSync(new URL(e.output, root));
  const sha = createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha, j.candidate.sha256); assert(!hashes.has(sha)); hashes.add(sha);
  const p = PNG.sync.read(bytes); assert(p.width >= 512 && p.height >= 512);
  let clear = 0, visible = 0;
  for (let k = 3; k < p.data.length; k += 4) { if (p.data[k] === 0) clear++; else visible++; }
  assert(visible > 0);
  if (j.tool_arguments.transparent_background) assert(clear > p.width * p.height * .1);
  records.push({id:e.id, width:p.width, height:p.height, sha256:sha, realAlpha:clear > 0});
}
assert.equal(inv.generated_count, records.length);
writeFileSync(new URL('validation.json', root), JSON.stringify({count:records.length, records}, null, 2) + '\n');
console.log(`${records.length} PNG independientes: dimensiones, hashes, alfa solicitado, fuentes y JSON verificados.`);
