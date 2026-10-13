// Núcleo evolutivo (DE + NSGA-II) para la geometría paramétrica de los autos. Lógica pura.
// spec: [{ id, min, max, def, int?, comp? }] · genoma: { [id]: number }
// individuo: { id, g, obj?: number[] (minimizar), viol?: number, rank?, crowd? }

/** PRNG determinista mulberry32. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Normal estándar (Box-Muller). */
export const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

/** Limita a [min,max]; redondea si es entero. */
export function clampGene(gene, x) {
  const v = Math.min(gene.max, Math.max(gene.min, x));
  return gene.int ? Math.min(gene.max, Math.max(gene.min, Math.round(v))) : v;
}

/** Población alrededor del original: el individuo 0 es exactamente los `def`. */
export function initPop(spec, n, r, sigma = 0.15) {
  return Array.from({ length: n }, (_, i) => {
    const g = {};
    for (const s of spec) g[s.id] = i === 0 ? s.def : clampGene(s, s.def + gauss(r) * sigma * (s.max - s.min));
    return { id: `i${i}`, g };
  });
}

/** DE/rand/1/bin: devuelve un genoma hijo para pop[i]. */
export function deChild(pop, i, spec, r, { F = 0.5, CR = 0.7 } = {}) {
  const pick = (ex) => {
    let k;
    do k = Math.floor(r() * pop.length); while (ex.includes(k));
    return k;
  };
  const a = pick([i]), b = pick([i, a]), c = pick([i, a, b]);
  const jrand = Math.floor(r() * spec.length);
  const g = {};
  spec.forEach((s, j) => {
    const xi = pop[i].g[s.id];
    if (j !== jrand && r() >= CR) { g[s.id] = xi; return; }
    let v = pop[a].g[s.id] + F * (pop[b].g[s.id] - pop[c].g[s.id]);
    if (v < s.min) v = s.min + r() * (xi - s.min); // rebote hacia el padre
    else if (v > s.max) v = s.max - r() * (s.max - xi);
    g[s.id] = clampGene(s, v);
  });
  return g;
}

/** Cruce uniforme entre dos genomas. */
export function blend(ga, gb, spec, r) {
  const g = {};
  for (const s of spec) g[s.id] = r() < 0.5 ? ga[s.id] : gb[s.id];
  return g;
}

/** Dominancia con restricciones de Deb (minimiza). */
export function dominates(a, b) {
  const va = a.viol || 0, vb = b.viol || 0;
  if (va === 0 && vb === 0) {
    let strict = false;
    for (let k = 0; k < a.obj.length; k++) {
      if (a.obj[k] > b.obj[k]) return false;
      if (a.obj[k] < b.obj[k]) strict = true;
    }
    return strict;
  }
  if (va === 0) return true;
  if (vb === 0) return false;
  return va < vb;
}

/** NSGA-II: asigna rank y crowd; devuelve los frentes. */
export function sortFronts(pop) {
  const n = pop.length;
  const dom = pop.map(() => []);
  const cnt = new Array(n).fill(0);
  let cur = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      if (dominates(pop[i], pop[j])) dom[i].push(j);
      else if (dominates(pop[j], pop[i])) cnt[i]++;
    }
    if (cnt[i] === 0) cur.push(i);
  }
  const fronts = [];
  while (cur.length) {
    const next = [];
    for (const i of cur) for (const j of dom[i]) if (--cnt[j] === 0) next.push(j);
    const f = cur.map((i) => pop[i]);
    f.forEach((p) => { p.rank = fronts.length; p.crowd = 0; });
    crowding(f);
    fronts.push(f);
    cur = next;
  }
  return fronts;
}

function crowding(f) {
  if (f.length <= 2) { f.forEach((p) => { p.crowd = Infinity; }); return; }
  for (let k = 0; k < f[0].obj.length; k++) {
    const s = [...f].sort((a, b) => a.obj[k] - b.obj[k]);
    const span = s[s.length - 1].obj[k] - s[0].obj[k];
    s[0].crowd = s[s.length - 1].crowd = Infinity;
    if (span === 0) continue;
    for (let i = 1; i < s.length - 1; i++) s[i].crowd += (s[i + 1].obj[k] - s[i - 1].obj[k]) / span;
  }
}

/** Selección ambiental elitista de NSGA-II: n individuos. */
export function select(pool, n) {
  const out = [];
  for (const f of sortFronts(pool)) {
    if (out.length + f.length <= n) out.push(...f);
    else { out.push(...[...f].sort((a, b) => b.crowd - a.crowd).slice(0, n - out.length)); break; }
  }
  return out;
}

/** Codo del frente: menor distancia al ideal con objetivos normalizados. */
export function knee(front) {
  const m = front[0].obj.length;
  const lo = [], hi = [];
  for (let k = 0; k < m; k++) {
    lo[k] = Math.min(...front.map((p) => p.obj[k]));
    hi[k] = Math.max(...front.map((p) => p.obj[k]));
  }
  const dist = (p) => Math.hypot(...p.obj.map((v, k) => (hi[k] === lo[k] ? 0 : (v - lo[k]) / (hi[k] - lo[k]))));
  return front.reduce((best, p) => (dist(p) < dist(best) ? p : best));
}

/** Genes que difieren del original más de 1 % del rango, por |pct| desc. */
export function diff(spec, g) {
  return spec
    .map((s) => ({ id: s.id, comp: s.comp, def: s.def, val: g[s.id], pct: Math.round(((g[s.id] - s.def) / (s.max - s.min)) * 1000) / 10 }))
    .filter((d) => Math.abs((d.val - d.def) / (spec.find((s) => s.id === d.id).max - spec.find((s) => s.id === d.id).min)) > 0.01)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
}
