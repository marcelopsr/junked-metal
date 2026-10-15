import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import { cropLeafPixels, tireTreadPixels } from "./pixels.mjs";

const dir = new URL("./", import.meta.url);
const path = (name) => new URL(name, dir);
const png = (width, height, pixels) => {
  if (pixels.length !== width * height * 4) throw new Error(`Tamaño de textura inesperado: ${pixels.length}`);
  const out = new PNG({ width, height }); out.data = Buffer.from(pixels); return PNG.sync.write(out);
};
mkdirSync(dir, { recursive: true });
const leaves = cropLeafPixels(), tires = tireTreadPixels();
writeFileSync(path("huerta-hojas-folded.png"), png(128, 32, leaves));
writeFileSync(path("caucho-tread-folded.png"), png(64, 64, tires));

const sheet = new PNG({ width: 960, height: 500 });
const set = (x, y, c) => { const i = (y * sheet.width + x) * 4; sheet.data[i] = c[0]; sheet.data[i + 1] = c[1]; sheet.data[i + 2] = c[2]; sheet.data[i + 3] = 255; };
const rect = (x, y, w, h, c) => { for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) set(px, py, c); };
const font = {
  A:["01110","10001","10001","11111","10001","10001","10001"],
  D:["11110","10001","10001","10001","10001","10001","11110"],
  E:["11111","10000","10000","11110","10000","10000","11111"],
  F:["11111","10000","10000","11110","10000","10000","10000"],
  H:["10001","10001","10001","11111","10001","10001","10001"],
  L:["10000","10000","10000","10000","10000","10000","11111"],
  O:["01110","10001","10001","10001","10001","10001","01110"],
  R:["11110","10001","10001","11110","10100","10010","10001"],
  T:["11111","00100","00100","00100","00100","00100","00100"],
};
const label = (s, x, y, color, scale = 4) => {
  for (const ch of s) {
    if (ch === " ") { x += 6 * scale; continue; }
    for (let gy = 0; gy < 7; gy++) for (let gx = 0; gx < 5; gx++) if (font[ch][gy][gx] === "1") rect(x + gx * scale, y + gy * scale, scale, scale, color);
    x += 6 * scale;
  }
};
const blit = (pixels, sw, sh, x, y, scale) => {
  for (let py = 0; py < sh; py++) for (let px = 0; px < sw; px++) {
    const i = (py * sw + px) * 4, c = [pixels[i], pixels[i + 1], pixels[i + 2]];
    rect(x + px * scale, y + py * scale, scale, scale, c);
  }
};
rect(0, 0, 960, 500, [17, 21, 26]);
rect(24, 24, 912, 452, [34, 40, 47]);
label("LEAF", 64, 58, [208, 221, 180], 5);
label("TREAD", 528, 58, [208, 221, 180], 5);
rect(48, 112, 416, 320, [24, 29, 33]); rect(496, 112, 416, 320, [24, 29, 33]);
blit(leaves, 128, 32, 64, 204, 3);
blit(tires, 64, 64, 576, 144, 4);
label("FOLDED", 64, 394, [153, 163, 145], 3);
label("FOLDED", 528, 394, [153, 163, 145], 3);
writeFileSync(path("hoja-contacto.png"), PNG.sync.write(sheet));
writeFileSync(path("manifest.json"), JSON.stringify({
  generator: "pixels.mjs (determinista, Canvas/PNG sin diffusion)",
  textures: [
    { file: "huerta-hojas-folded.png", size: "128x32", layout: "4 celdas de 32x32 con tonos de hoja y nervaduras" },
    { file: "caucho-tread-folded.png", size: "64x64", layout: "banda en chevrón, canales y hombros con polvo; base #4b4b46" },
  ],
  contactSheet: "hoja-contacto.png",
}, null, 2) + "\n");

for (const [file, width, height] of [["huerta-hojas-folded.png",128,32],["caucho-tread-folded.png",64,64]]) {
  const decoded = PNG.sync.read(readFileSync(path(file)));
  assert.equal(decoded.width, width, `${file}: ancho`); assert.equal(decoded.height, height, `${file}: alto`);
}
const checkTread = PNG.sync.read(readFileSync(path("caucho-tread-folded.png")));
for (let y = 0; y < checkTread.height; y++) assert.deepEqual([...checkTread.data.slice(y * checkTread.width * 4, y * checkTread.width * 4 + 4)], [...checkTread.data.slice((y * checkTread.width + checkTread.width - 1) * 4, (y * checkTread.width + checkTread.width) * 4)], "costura horizontal de caucho");
assert.equal(PNG.sync.read(readFileSync(path("hoja-contacto.png"))).width, 960, "ancho de hoja de contacto");
console.log("Generadas huerta-hojas-folded.png (128x32), caucho-tread-folded.png (64x64) y hoja-contacto.png (960x500); dimensiones comprobadas.");
