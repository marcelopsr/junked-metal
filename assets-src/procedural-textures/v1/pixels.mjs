const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const put = (data, w, h, x, y, color, wrapX = false) => {
  if (wrapX) x = (x % w + w) % w;
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  const i = (y * w + x) * 4;
  data[i] = color[0]; data[i + 1] = color[1]; data[i + 2] = color[2]; data[i + 3] = 255;
};
const line = (data, w, h, x0, y0, x1, y1, color, wrapX = false) => {
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    put(data, w, h, x0, y0, color, wrapX);
    if (x0 === x1 && y0 === y1) break;
    const e = 2 * err;
    if (e >= dy) { err += dy; x0 += sx; }
    if (e <= dx) { err += dx; y0 += sy; }
  }
};

/** Four small green variants, each with a central rib and branching leaf veins. */
export function cropLeafPixels() {
  const w = 128, h = 32, data = new Uint8ClampedArray(w * h * 4);
  const base = ["#3f8f2f", "#4b9636", "#579b3c", "#478b35"].map(rgb);
  const mid = ["#347927", "#3a812b", "#468a31", "#397a2c"].map(rgb);
  const vein = ["#8bbd52", "#98c85b", "#a3ca62", "#8fc052"].map(rgb);
  for (let c = 0; c < 4; c++) {
    const x0 = c * 32;
    for (let y = 0; y < h; y++) for (let x = 0; x < 32; x++) put(data, w, h, x0 + x, y, (x + y * 3 + c) % 13 === 0 ? mid[c] : base[c]);
    line(data, w, h, x0 + 2, 16, x0 + 29, 16, mid[c]);
    line(data, w, h, x0 + 3, 15, x0 + 28, 15, vein[c]);
    for (let x = 7; x <= 25; x += 6) {
      const rise = 4 + ((x + c) % 3);
      line(data, w, h, x0 + x, 15, x0 + Math.min(30, x + rise), 15 - rise, vein[c]);
      line(data, w, h, x0 + x, 17, x0 + Math.max(1, x - rise), 17 + rise, mid[c]);
    }
    put(data, w, h, x0 + 1, 16, mid[c]); put(data, w, h, x0 + 30, 16, mid[c]);
  }
  return data;
}

/** Tileable tread blocks and dusty shoulders for the small Folded garage-car tires. */
/** @param {string} [baseHex] */
export function tireTreadPixels(baseHex = "#4b4b46") {
  const w = 64, h = 64, data = new Uint8ClampedArray(w * h * 4);
  const base = rgb(baseHex), side = rgb("#292b29"), tread = rgb("#67675f"), highlight = rgb("#858174"), groove = rgb("#202221"), dust = rgb("#84775f");
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const edge = y < 9 || y >= 55;
    put(data, w, h, x, y, edge ? side : base);
  }
  for (let x = 0; x < w; x++) {
    put(data, w, h, x, 8, dust); put(data, w, h, x, 9, side);
    put(data, w, h, x, 54, side); put(data, w, h, x, 55, dust);
  }
  for (let x = -8; x < w + 8; x += 16) {
    line(data, w, h, x, 13, x + 8, 24, groove, true);
    line(data, w, h, x + 8, 24, x + 16, 13, groove, true);
    line(data, w, h, x + 1, 14, x + 8, 23, tread, true);
    line(data, w, h, x + 8, 23, x + 15, 14, highlight, true);
    line(data, w, h, x, 50, x + 8, 39, groove, true);
    line(data, w, h, x + 8, 39, x + 16, 50, groove, true);
    line(data, w, h, x + 1, 49, x + 8, 40, tread, true);
    line(data, w, h, x + 8, 40, x + 15, 49, highlight, true);
  }
  for (let x = 0; x < w; x++) for (const y of [29, 30, 33, 34]) put(data, w, h, x, y, side);
  for (let y = 0; y < h; y++) data.set(data.subarray((y * w) * 4, (y * w) * 4 + 4), (y * w + w - 1) * 4);
  data.set(data.subarray(0, w * 4), (h - 1) * w * 4);
  return data;
}
