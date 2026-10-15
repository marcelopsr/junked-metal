import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

const root = new URL("./", import.meta.url);
const output = new URL("materials/", root);
const decalOutput = new URL("decals/", root);
mkdirSync(output, { recursive: true });
mkdirSync(decalOutput, { recursive: true });
const recipes = [
  { id: "suelo-tierra", file: "suelo-tierra-basecolor.png", size: 128, seed: 3101, colors: ["#30221b", "#493126", "#654533", "#80583b", "#a66a3d", "#c47a43"], pattern: "clods" },
  { id: "suelo-concreto", file: "suelo-concreto-basecolor.png", size: 128, seed: 3102, colors: ["#353638", "#49494a", "#5c5a56", "#746e64", "#938879"], pattern: "concrete" },
  { id: "madera-tablas", file: "madera-tablas-basecolor.png", size: 128, seed: 3103, colors: ["#39271c", "#573821", "#76502d", "#986638", "#b47c43", "#d19854"], pattern: "wood" },
  { id: "metal-oxidado", file: "metal-oxidado-basecolor.png", size: 128, seed: 3104, colors: ["#292725", "#42352b", "#60422e", "#805036", "#a35a35", "#c06c3d"], pattern: "rust" },
  { id: "caucho-neumatico", file: "caucho-neumatico-basecolor.png", size: 128, seed: 3105, colors: ["#17191a", "#242626", "#333433", "#454440", "#625d52"], pattern: "rubber" },
  { id: "cesped-hojas", file: "cesped-hojas-basecolor.png", size: 128, seed: 3106, colors: ["#26301d", "#384329", "#4b5732", "#687142", "#89804b", "#ad8a4c"], pattern: "grass" },
];
const decalRecipes = [
  { id: "oil-splat", seed: 4101, colors: ["#211d19", "#40352a", "#63513a"], pattern: "splatter" },
  { id: "tire-skids", seed: 4102, colors: ["#252322", "#3d3934", "#574c3d"], pattern: "skid" },
  { id: "dry-leaf-cluster", seed: 4103, colors: ["#824323", "#b75c2c", "#d9803b", "#d9a45a"], pattern: "leaves" },
  { id: "mud-splatter", seed: 4104, colors: ["#38261d", "#563725", "#805335"], pattern: "splatter" },
  { id: "scrap-shards", seed: 4105, colors: ["#514237", "#806145", "#a06c47", "#b59162"], pattern: "shards" },
  { id: "rust-drips", seed: 4106, colors: ["#6e3827", "#a95131", "#cc7040"], pattern: "drips" },
  { id: "chipped-paint-scuff", seed: 4107, colors: ["#343a3c", "#6b4731", "#c16c36"], pattern: "chips" },
  { id: "hazard-stripe", seed: 4108, colors: ["#252321", "#d29a35"], pattern: "hazard" },
].map((r) => ({ ...r, file: `${r.id}.png`, size: 128 }));
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hash = (x, y, seed) => {
  let n = (Math.imul(x, 0x1f123bb5) ^ Math.imul(y, 0x5f356495) ^ seed) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  return ((n ^ (n >>> 16)) >>> 0) / 0x100000000;
};
const wrap = (v, n) => (v % n + n) % n;
const distance = (a, b, size) => Math.min(Math.abs(a - b), size - Math.abs(a - b));

function pixels(recipe) {
  const { size, colors, pattern, seed } = recipe;
  const palette = colors.map(rgb), data = Buffer.alloc(size * size * 4);
  const centers = [];
  const count = pattern === "clods" ? 52 : pattern === "grass" ? 44 : pattern === "wood" ? 18 : 40;
  for (let i = 0; i < count; i++) centers.push({ x: Math.floor(hash(i, 13, seed) * size), y: Math.floor(hash(i, 29, seed) * size), r: 4 + Math.floor(hash(i, 43, seed) * (pattern === "clods" ? 10 : 5)), c: Math.floor(hash(i, 61, seed) * palette.length) });
  const set = (x, y, c) => { const at = (y * size + x) * 4; data[at] = c[0]; data[at + 1] = c[1]; data[at + 2] = c[2]; data[at + 3] = 255; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = x / size, ny = y / size;
    const noise = (hash(x, y, seed) + hash(x - size, y, seed) + hash(x, y - size, seed) + hash(x - size, y - size, seed)) / 4;
    let color = Math.floor(noise * palette.length);
    if (pattern === "clods") {
      let best = size;
      for (const p of centers) { const d = Math.hypot(distance(x, p.x, size), distance(y, p.y, size)); if (d < p.r && d < best) { best = d; color = p.c; } }
      if (best < size && best > 0.68) color = Math.min(palette.length - 1, color + 1);
      else if (best >= size || best > 2.4) color = Math.max(0, color - 1);
    } else if (pattern === "concrete") {
      if (noise > 0.985) color = palette.length - 1;
      else if (noise < 0.04) color = 0;
    } else if (pattern === "wood") {
      const board = Math.floor(ny * 4), seam = (ny * 4) % 1;
      color = Math.min(palette.length - 1, Math.floor(noise * 3) + 1);
      if (seam < 0.08 || (Math.floor(nx * 8 + board * 3) % 11 === 0 && seam < 0.19)) color = 0;
      const grain = hash(Math.floor(x / 4), Math.floor(y / 2), seed + board * 17);
      if (grain > 0.8 && seam > 0.18) color = Math.min(palette.length - 1, color + 1);
      if (grain < 0.12 && seam > 0.2) color = Math.max(0, color - 1);
    } else if (pattern === "rust") {
      const fleck = (hash(Math.floor(x / 7), Math.floor(y / 7), seed + 7) + hash(Math.floor((x - size) / 7), Math.floor(y / 7), seed + 7) + hash(Math.floor(x / 7), Math.floor((y - size) / 7), seed + 7) + hash(Math.floor((x - size) / 7), Math.floor((y - size) / 7), seed + 7)) / 4;
      color = fleck > 0.73 ? palette.length - 1 : fleck > 0.54 ? palette.length - 2 : Math.floor(noise * 3);
    } else if (pattern === "rubber") {
      const groove = ((x + (y % 24) * 3) % 24 < 6) || y % 24 < 4;
      color = groove ? 0 : Math.min(palette.length - 1, 1 + Math.floor(noise * 2));
      const fleck = (hash(Math.floor(x / 4), Math.floor(y / 4), seed + 3) + hash(Math.floor((x - size) / 4), Math.floor(y / 4), seed + 3) + hash(Math.floor(x / 4), Math.floor((y - size) / 4), seed + 3) + hash(Math.floor((x - size) / 4), Math.floor((y - size) / 4), seed + 3)) / 4;
      if (fleck > 0.94) color = palette.length - 1;
    } else if (pattern === "grass") {
      const fleck = (hash(Math.floor(x / 5), Math.floor(y / 5), seed + 5) + hash(Math.floor((x - size) / 5), Math.floor(y / 5), seed + 5) + hash(Math.floor(x / 5), Math.floor((y - size) / 5), seed + 5) + hash(Math.floor((x - size) / 5), Math.floor((y - size) / 5), seed + 5)) / 4;
      color = fleck > 0.82 ? palette.length - 1 : Math.floor(noise * 3);
      if ((x + y * 3) % 29 < 3) color = Math.min(palette.length - 1, color + 1);
    }
    set(x, y, palette[color]);
  }
  // Explicitly sample opposite tile borders from identical coordinates to keep finite patterns seamless.
  for (let i = 0; i < size; i++) {
    const x = (i * 4), y = (i * 4), idx = (i * size) * 4, right = (i * size + size - 1) * 4;
    data.copy(data, right, idx, idx + 4);
    const top = i * 4, bottom = ((size - 1) * size + i) * 4;
    data.copy(data, bottom, top, top + 4);
  }
  return data;
}

function decalPixels(recipe) {
  const { size, colors, pattern, seed } = recipe, palette = colors.map(rgb), data = Buffer.alloc(size * size * 4);
  const put = (x, y, c, alpha = 255) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4; data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = alpha;
  };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, c); };
  const line = (x0, y0, x1, y1, c, thick = 1) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i++) { const t = i / steps, x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t); rect(x - thick, y - thick, x + thick, y + thick, c); }
  };
  const ellipse = (cx, cy, rx, ry, c) => {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) put(x, y, c);
  };
  const polygon = (points, c) => {
    const ys = points.map((p) => p[1]), xs = points.map((p) => p[0]);
    for (let y = Math.min(...ys); y <= Math.max(...ys); y++) for (let x = Math.min(...xs); x <= Math.max(...xs); x++) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) { const [xi, yi] = points[i], [xj, yj] = points[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; }
      if (inside) put(x, y, c);
    }
  };
  if (pattern === "splatter") {
    const center = pattern === "splatter" && recipe.id === "oil-splat" ? [63, 64] : [65, 63];
    ellipse(center[0], center[1], 27, 18, palette[0]); ellipse(center[0] - 5, center[1] - 3, 21, 12, palette[1]);
    for (let i = 0; i < 18; i++) {
      const a = hash(i, 3, seed) * Math.PI * 2, d = 23 + hash(i, 7, seed) * 30, r = 2 + Math.floor(hash(i, 9, seed) * 5);
      ellipse(center[0] + Math.cos(a) * d, center[1] + Math.sin(a) * d * 0.7, r + 2, r, palette[i % palette.length]);
    }
    for (let i = 0; i < 12; i++) { const x = 24 + Math.floor(hash(i, 17, seed) * 80), y = 25 + Math.floor(hash(i, 19, seed) * 78); rect(x, y, x + 2, y + 1, palette[(i + 1) % palette.length]); }
  } else if (pattern === "skid") {
    for (const off of [-12, 12]) for (let y = 18; y < 112; y += 12) {
      const x = 63 + off + Math.round(Math.sin((y + seed) * 0.08) * 5);
      if (hash(y, off, seed) > 0.18) rect(x - 3, y, x + 2, y + 7, palette[hash(y, off + 1, seed) > 0.45 ? 0 : 1]);
    }
  } else if (pattern === "leaves") {
    for (let i = 0; i < 13; i++) {
      const x = 20 + Math.floor(hash(i, 11, seed) * 88), y = 20 + Math.floor(hash(i, 21, seed) * 88), angle = hash(i, 31, seed) * Math.PI;
      const dx = Math.cos(angle) * (7 + hash(i, 41, seed) * 5), dy = Math.sin(angle) * (4 + hash(i, 51, seed) * 3), c = palette[i % palette.length];
      polygon([[x - dx, y - dy], [x - dx * 0.35 - dy * 0.35, y - dy * 0.35 + dx * 0.35], [x + dx, y + dy], [x + dx * 0.2 + dy * 0.3, y + dy * 0.2 - dx * 0.3]], c);
      line(x - dx, y - dy, x + dx, y + dy, palette[3], 0);
    }
  } else if (pattern === "shards") {
    for (let i = 0; i < 12; i++) {
      const x = 16 + Math.floor(hash(i, 4, seed) * 94), y = 16 + Math.floor(hash(i, 8, seed) * 94), r = 5 + Math.floor(hash(i, 12, seed) * 10);
      polygon([[x - r, y + r / 2], [x - r / 3, y - r], [x + r, y - r / 2], [x + r / 3, y + r]], palette[i % palette.length]);
    }
  } else if (pattern === "drips") {
    rect(16, 16, 111, 25, palette[0]);
    for (let i = 0; i < 9; i++) { const x = 20 + Math.floor(hash(i, 15, seed) * 88), len = 8 + Math.floor(hash(i, 18, seed) * 35), w = 2 + Math.floor(hash(i, 22, seed) * 5); rect(x, 25, x + w, 25 + len, palette[i % palette.length]); ellipse(x + w / 2, 26 + len, w / 2 + 1, 3, palette[i % palette.length]); }
    for (let i = 0; i < 4; i++) rect(25 + i * 20, 18, 33 + i * 20, 21, palette[2]);
  } else if (pattern === "chips") {
    rect(19, 42, 108, 81, palette[0]);
    for (let i = 0; i < 24; i++) { const x = 20 + Math.floor(hash(i, 33, seed) * 86), y = 42 + Math.floor(hash(i, 39, seed) * 38), w = 2 + Math.floor(hash(i, 43, seed) * 8), h = 2 + Math.floor(hash(i, 47, seed) * 5); rect(x, y, x + w, y + h, palette[1 + Math.floor(hash(i, 51, seed) * 2)]); }
  } else if (pattern === "hazard") {
    rect(14, 38, 113, 88, palette[0]);
    for (let x = -40; x < 144; x += 24) polygon([[x, 38], [x + 12, 38], [x + 68, 88], [x + 56, 88]], palette[1]);
  }
  return data;
}

function encode(data, size) { const png = new PNG({ width: size, height: size }); png.data = Buffer.from(data); return PNG.sync.write(png); }
function renderAll() { return recipes.map((recipe) => ({ recipe, bytes: encode(pixels(recipe), recipe.size) })); }
for (const { recipe, bytes } of renderAll()) writeFileSync(new URL(recipe.file, output), bytes);
const outputs = renderAll();
const decals = decalRecipes.map((recipe) => ({ recipe, bytes: encode(decalPixels(recipe), recipe.size) }));
const manifest = {
  generator: "generate.mjs",
  version: 1,
  deterministic: true,
  references: "ImageGen batch 04 (solo color y densidad de detalle; no usado como pixel source)",
  recipes: [
    ...outputs.map(({ recipe }) => ({ id: recipe.id, family: "material", output: `materials/${recipe.file}`, size: `${recipe.size}x${recipe.size}`, seed: recipe.seed, palette: recipe.colors, parameters: { pattern: recipe.pattern, tileable: true }, checks: ["rgba dimensions", "exact opposite edges", "deterministic bytes"] })),
    ...decals.map(({ recipe }) => ({ id: recipe.id, family: "decal", output: `decals/${recipe.file}`, size: `${recipe.size}x${recipe.size}`, seed: recipe.seed, palette: recipe.colors, parameters: { pattern: recipe.pattern, alpha: true }, checks: ["rgba dimensions", "non-empty alpha", "transparent corners", "deterministic bytes"] })),
  ],
};
writeFileSync(new URL("manifest.json", root), `${JSON.stringify(manifest, null, 2)}\n`);

for (const { recipe, bytes } of outputs) {
  const decoded = PNG.sync.read(bytes);
  assert.equal(decoded.width, recipe.size, `${recipe.id}: width`);
  assert.equal(decoded.height, recipe.size, `${recipe.id}: height`);
  const repeated = PNG.sync.read(encode(pixels(recipe), recipe.size));
  assert.deepEqual(repeated.data, decoded.data, `${recipe.id}: deterministic`);
  for (let i = 0; i < recipe.size; i++) {
    assert.deepEqual([...decoded.data.subarray(i * recipe.size * 4, i * recipe.size * 4 + 4)], [...decoded.data.subarray((i * recipe.size + recipe.size - 1) * 4, (i * recipe.size + recipe.size) * 4)], `${recipe.id}: horizontal edge`);
    assert.deepEqual([...decoded.data.subarray(i * 4, i * 4 + 4)], [...decoded.data.subarray(((recipe.size - 1) * recipe.size + i) * 4, ((recipe.size - 1) * recipe.size + i) * 4 + 4)], `${recipe.id}: vertical edge`);
  }
}
for (const { recipe, bytes } of decals) {
  writeFileSync(new URL(recipe.file, decalOutput), bytes);
  const decoded = PNG.sync.read(bytes), repeated = PNG.sync.read(encode(decalPixels(recipe), recipe.size));
  assert.equal(decoded.width, recipe.size); assert.equal(decoded.height, recipe.size);
  assert.deepEqual(repeated.data, decoded.data, `${recipe.id}: deterministic`);
  assert(decoded.data.some((value, i) => i % 4 === 3 && value > 0), `${recipe.id}: visible alpha`);
  assert.equal(decoded.data[3], 0, `${recipe.id}: top-left transparent`);
  assert.equal(decoded.data[(recipe.size * recipe.size - 1) * 4 + 3], 0, `${recipe.id}: bottom-right transparent`);
}
const recorded = JSON.parse(readFileSync(new URL("manifest.json", root)));
assert.equal(recorded.recipes.length, recipes.length + decalRecipes.length);
console.log(`Generados ${recipes.length} materiales tileables y ${decalRecipes.length} decals RGBA; determinismo y checks de salida pasaron.`);
