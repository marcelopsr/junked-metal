// Evolución de la geometría de los autos (docs/EVO_VEHICULOS.md). Corre contra rc-test (`?evo`, src/evo_probe.ts) con el navegador headless de siempre.
//   npm run evo -- --car buggy [--pop 16 --gens 8 --seed 1 --F 0.5 --CR 0.7 --sigma 0.15] [--from <run>]   corre y guarda .evo/<auto>/<run>/
//   npm run evo -- --car buggy --export <run> [--id i42]   escribe el genoma elegido en src/car_genes.json (+ OBJ) y lo anota en evo/historial.json
//   npm run evo -- --car buggy --reset                     vuelve el auto a su genoma original (borra su entrada de car_genes.json)
// Población → mutación DE/rand/1/bin + cruce binomial → evaluación (4 objetivos + restricciones duras) → selección NSGA-II elitista → repetir.
// --from siembra la población con el frente final de una corrida anterior (optimización progresiva: corrida → evaluación visual → otra corrida).
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { launch, open } from "./lib/browser.mjs";
import { rng, gauss, initPop, deChild, blend, sortFronts, select, knee, diff, clampGene } from "./evo/ga.mjs";

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i < 0 ? d : process.argv[i + 1]; };
const has = (k) => process.argv.includes("--" + k);
const car = arg("car", "buggy");
const GENES_JSON = "src/car_genes.json", HIST = "evo/historial.json";
const OBJ_NAMES = ["legibilidad (pérdida)", "proporciones (error)", "costo (tris/orig)", "parecido a la flota"];
const readJson = (f, d) => existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : d;
const r3 = (x) => Math.round(x * 1000) / 1000;
const EPS = 0.005;

if (has("reset")) {
  const j = readJson(GENES_JSON, {}); delete j[car]; writeFileSync(GENES_JSON, JSON.stringify(j, null, 2) + "\n");
  console.log(`${car}: vuelve al genoma original`); process.exit(0);
}
if (has("export")) {
  const run = arg("export"), dir = join(".evo", car, run), R = readJson(join(dir, "run.json"), null);
  if (!R) throw new Error("no existe " + join(dir, "run.json"));
  const id = arg("id", R.recomendado), ind = R.individuos.find((x) => x.id === id);
  if (!ind) throw new Error(`no hay individuo ${id} en ${run}`);
  if (ind.viol > 0) throw new Error(`${id} no cumple las restricciones (viol ${ind.viol}): no se exporta`);
  const j = readJson(GENES_JSON, {});
  j[car] = { g: ind.g, run, id, gen: ind.gen, fecha: new Date().toISOString().slice(0, 10), obj: ind.obj.map(r3), motivo: arg("motivo", "") };
  writeFileSync(GENES_JSON, JSON.stringify(j, null, 2) + "\n");
  const h = readJson(HIST, []); h.push({ car, accion: "export", run, id, fecha: j[car].fecha, obj: j[car].obj, obj_original: R.original.obj.map(r3), cambios: diff(R.spec, ind.g), motivo: j[car].motivo });
  mkdirSync("evo", { recursive: true }); writeFileSync(HIST, JSON.stringify(h, null, 2) + "\n");
  console.log(`${car} ← ${run}/${id} (gen ${ind.gen}) en ${GENES_JSON}`);
  process.exit(0);
}

const P = { pop: +arg("pop", 16), gens: +arg("gens", 8), seed: +arg("seed", 1), F: +arg("F", 0.5), CR: +arg("CR", 0.7), sigma: +arg("sigma", 0.15), from: arg("from", null) };
const run = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "").replace(/^(\d{8})/, "$1-") + `-s${P.seed}`;
const dir = join(".evo", car, run), img = join(dir, "img");
mkdirSync(img, { recursive: true });
const r = rng(P.seed);

const browser = await launch();
let page;
try {
  page = await open(browser, "?mute&evo", "pc"); // sin freeze: la captura de vistas espera un cuadro del bucle de dibujo
  await page.waitForFunction(() => window.__evo, null, { timeout: 60000 });
  const spec = await page.evaluate((c) => window.__evo.spec(c), car);
  if (!spec) throw new Error(`${car} todavía no tiene genes (src/car_genes.ts)`);
  let n = 0;
  const all = [];
  const evalAll = async (gs, gen) => {
    const out = [];
    for (let i = 0; i < gs.length; i += 4) out.push(...await page.evaluate(([c, b]) => window.__evo.eval(c, b), [car, gs.slice(i, i + 4)]));
    // ε-dominancia: diferencias menores a EPS no cuentan (sin esto, 0,998 vs 0,999 de costo deja a toda la población en el frente y no hay presión)
    return out.map((x) => { const ind = { id: "i" + n++, gen, g: x.g, obj: x.obj.map((v) => Math.round(v / EPS) * EPS), viol: x.viol, m: x.m }; all.push(ind); return ind; });
  };

  // Generación 0: el original + variantes cercanas (o el frente de una corrida anterior, cruzado y mezclado con el original)
  let seeds = initPop(spec, P.pop, r, P.sigma).map((x) => x.g);
  if (P.from) {
    const prev = readJson(join(".evo", car, P.from, "run.json"), null);
    const front = prev.individuos.filter((x) => prev.final.includes(x.id)).map((x) => x.g);
    seeds = [seeds[0], ...front.slice(0, P.pop - 1)];
    while (seeds.length < P.pop) seeds.push(blend(front[(r() * front.length) | 0], front[(r() * front.length) | 0], spec, r));
    // Los rangos pueden haber cambiado desde esa corrida. Un gen sin variación en la siembra (nuevo, o que quedó clavado) se perturba:
    // si todos traen el mismo valor, DE no lo mueve nunca (b − c = 0). El original (0) queda intacto.
    const flat = new Set(spec.filter((x) => new Set(seeds.slice(1).map((g) => g[x.id] ?? x.def)).size === 1).map((x) => x.id));
    if (flat.size) console.log("genes sin variación en la siembra (se perturban): " + [...flat].join(", "));
    seeds = seeds.map((g, i) => Object.fromEntries(spec.map((x) => [x.id, clampGene(x, i && flat.has(x.id) ? (g[x.id] ?? x.def) + gauss(r) * P.sigma * (x.max - x.min) : g[x.id] ?? x.def)])));
  }
  let pop = await evalAll(seeds, 0);
  const orig = pop[0];
  const gens = [];
  const log = (g) => {
    const fr = sortFronts(pop.map((x) => ({ ...x })))[0].filter((x) => x.viol === 0), k = fr.length ? knee(fr) : null;
    gens.push({ gen: g, frente: fr.map((x) => x.id), knee: k?.id ?? null, factibles: pop.filter((x) => x.viol === 0).length, mejor: OBJ_NAMES.map((_, j) => r3(Math.min(...pop.filter((x) => x.viol === 0).map((x) => x.obj[j])))) });
    const b = gens.at(-1);
    console.log(`gen ${g}: factibles ${b.factibles}/${pop.length}, frente ${fr.length}, mejores [${b.mejor.join(", ")}]${k ? `, rodilla ${k.id} [${k.obj.map(r3).join(", ")}]` : ""}`);
  };
  console.log(`original [${orig.obj.map(r3).join(", ")}] viol ${r3(orig.viol)} · objetivos: ${OBJ_NAMES.join(" | ")} (todos a minimizar)`);
  log(0);
  for (let g = 1; g <= P.gens; g++) {
    const kids = await evalAll(pop.map((_, i) => deChild(pop, i, spec, r, P)), g);
    pop = select([...pop, ...kids], P.pop); // elitismo: padres e hijos compiten juntos
    log(g);
  }

  // Elegido: rodilla del frente final factible (el más equilibrado entre los 4 objetivos), que además mejore al original en legibilidad o proporciones sin empeorar los otros más de 10 %
  const final = sortFronts(pop.map((x) => ({ ...x })))[0].filter((x) => x.viol === 0);
  const ok = final.filter((x) => x.id !== orig.id && (x.obj[0] < orig.obj[0] || x.obj[1] < orig.obj[1]) && x.obj[2] <= orig.obj[2] * 1.1 + 1e-9 && x.obj[3] <= orig.obj[3] + 0.02);
  const rec = ok.length ? knee(ok) : null;

  // Vistas: original, rodilla de cada generación y frente final
  const shown = [...new Set([orig.id, ...gens.map((x) => x.knee).filter(Boolean), ...final.map((x) => x.id)])];
  for (const id of shown) {
    const ind = all.find((x) => x.id === id), v = await page.evaluate(([c, g]) => window.__evo.views(c, g), [car, ind.g]);
    for (const [name, url] of Object.entries(v)) writeFileSync(join(img, `${id}-${name}.png`), Buffer.from(url.split(",")[1], "base64"));
  }
  for (const ind of [orig, rec].filter(Boolean)) writeFileSync(join(dir, `${ind.id}.obj`), await page.evaluate(([c, g]) => window.__evo.obj(c, g), [car, ind.g]));

  const R = { car, run, params: P, spec, original: orig, recomendado: rec?.id ?? null, final: final.map((x) => x.id), generaciones: gens,
    individuos: all.map(({ m, ...x }) => ({ ...x, obj: x.obj.map(r3), viol: r3(x.viol), m: JSON.parse(JSON.stringify(m, (k, v) => typeof v === "number" ? r3(v) : v)) })) };
  writeFileSync(join(dir, "run.json"), JSON.stringify(R));
  writeFileSync(join(dir, "index.html"), report(R, shown));
  const h = readJson(HIST, []); h.push({ car, accion: "corrida", run, fecha: run.slice(0, 8), params: P, evaluados: all.length, generaciones: P.gens, obj_original: orig.obj.map(r3), recomendado: rec ? { id: rec.id, gen: rec.gen, obj: rec.obj.map(r3), cambios: diff(spec, rec.g).slice(0, 12) } : null });
  mkdirSync("evo", { recursive: true }); writeFileSync(HIST, JSON.stringify(h, null, 2) + "\n");
  console.log(`\n${all.length} evaluados en ${P.gens + 1} generaciones · frente final ${final.length} · recomendado ${rec ? `${rec.id} (gen ${rec.gen}) [${rec.obj.map(r3).join(", ")}]` : "ninguno (no supera al original)"}`);
  console.log(`reporte: ${join(dir, "index.html")}`);
  if (page.logs.length) console.log("errores de consola:\n  " + page.logs.slice(0, 5).join("\n  "));
} finally {
  await browser.close();
}

// ---------- Reporte comparativo (HTML local, sin dependencias) ----------
function report(R, shown) {
  const V = ["frontal", "lateral", "trasera", "superior", "tres_cuartos", "juego", "lejos"];
  const byId = Object.fromEntries(R.individuos.map((x) => [x.id, x]));
  const tag = (id) => [id === R.original.id && "original", id === R.recomendado && "RECOMENDADO", R.generaciones.filter((g) => g.knee === id).map((g) => "rodilla gen " + g.gen).join(", "), R.final.includes(id) && "frente final"].filter(Boolean).join(" · ");
  const delta = (a, b) => { const d = a - b; return `<b class="${d < -1e-3 ? "up" : d > 1e-3 ? "down" : ""}">${a.toFixed(3)}</b>`; };
  const row = (id) => {
    const x = byId[id], o = R.original;
    const ch = diff(R.spec, x.g).slice(0, 10).map((c) => `${c.comp}/${c.id} ${c.pct > 0 ? "+" : ""}${c.pct}%`).join("<br>") || "—";
    return `<tr><td><b>${id}</b><br><small>gen ${x.gen}<br>${tag(id)}</small></td>${V.map((v) => `<td><img class="${v}" src="img/${id}-${v}.png"></td>`).join("")}
      <td class="m">${x.obj.map((v, j) => `${["leg", "prop", "costo", "parec"][j]} ${delta(v, o.obj[j])}`).join("<br>")}<br>viol ${x.viol}<br>tris ${x.m.tris}<br>despeje ${x.m.despeje}</td><td class="m">${ch}</td></tr>`;
  };
  return `<!doctype html><meta charset="utf-8"><title>Evolución ${R.car} ${R.run}</title>
<style>body{background:#0b0f14;color:#d8dde3;font:13px/1.35 system-ui;margin:16px}table{border-collapse:collapse}td{border-top:1px solid #1f2937;padding:6px;vertical-align:top}
img{width:150px;height:150px;background:#14181f}img.lejos{width:96px;height:96px;image-rendering:pixelated}.m{font:12px ui-monospace,monospace;white-space:nowrap}.up{color:#22c55e}.down{color:#ff3b2e}th{text-align:left;color:#ff9138;padding:6px}</style>
<h1>${R.car} · corrida ${R.run}</h1>
<p>Población ${R.params.pop} · ${R.params.gens} generaciones · semilla ${R.params.seed} · DE/rand/1/bin F ${R.params.F} CR ${R.params.CR} · selección NSGA-II elitista · ${R.individuos.length} evaluados.
Objetivos (todos a minimizar; verde = mejor que el original): ${OBJ_NAMES.join(" · ")}. Criterios: docs/EVO_VEHICULOS.md.</p>
<p>Recomendado: <b>${R.recomendado ?? "ninguno"}</b> · Frente final: ${R.final.join(", ")}</p>
<table><tr><th>variante</th>${V.map((v) => `<th>${v.replace("_", " ")}</th>`).join("")}<th>objetivos</th><th>genes que cambiaron</th></tr>${shown.map(row).join("")}</table>
<h2>Generaciones</h2><table><tr><th>gen</th><th>factibles</th><th>frente</th><th>mejor por objetivo</th><th>rodilla</th></tr>
${R.generaciones.map((g) => `<tr><td>${g.gen}</td><td>${g.factibles}</td><td>${g.frente.length}</td><td class="m">${g.mejor.join(" · ")}</td><td>${g.knee ?? "—"}</td></tr>`).join("")}</table>`;
}
