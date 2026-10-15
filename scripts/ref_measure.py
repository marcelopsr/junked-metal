"""Mide imágenes de referencia (o capturas del juego) con los mismos números, para compararlas.
Uso: .venv-ref/bin/python scripts/ref_measure.py img.png [img2.png ...] [--crop x0,y0,x1,y1]
Salida: una línea JSON por imagen. Lo usa docs/art_direction/visual_reference_register.md.
  lum/contraste/sat: media, desvío de luminancia y saturación media
  nitidez: varianza del laplaciano en 4x4 (filas de arriba hacia abajo): mide desenfoque/tilt-shift
  sombras/medios/luces: color medio de cada tramo de luminancia y su R/B (>1 = cálido)
  sol: posición (% x, % y) del 1 % más brillante
"""
import json, sys
import numpy as np
from PIL import Image


def measure(im):
    a = np.asarray(im.convert("RGB")).astype(float) / 255
    L = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    mx, mn = a.max(2), a.min(2)
    sat = (mx - mn) / np.maximum(mx, 1e-6)
    g = np.asarray(im.convert("L").resize((640, max(4, int(640 * im.height / im.width))))).astype(float)
    lap = np.abs(g[1:-1, 1:-1] * 4 - g[:-2, 1:-1] - g[2:, 1:-1] - g[1:-1, :-2] - g[1:-1, 2:])
    h, w = lap.shape
    sharp = [[int(lap[r * h // 4:(r + 1) * h // 4, c * w // 4:(c + 1) * w // 4].var()) for c in range(4)] for r in range(4)]
    tone = {}
    for n, m in [("sombras", L < np.percentile(L, 15)), ("medios", (L > np.percentile(L, 40)) & (L < np.percentile(L, 60))), ("luces", L > np.percentile(L, 85))]:
        c = a[m].mean(0)
        tone[n] = {"hex": "#%02X%02X%02X" % tuple((c * 255).astype(int)), "R/B": round(float(c[0] / max(c[2], 1e-3)), 2)}
    ys, xs = np.nonzero(L >= np.percentile(L, 99))  # >=: con una imagen plana o quemada > deja la selección vacía
    return {"lum": round(float(L.mean()), 2), "contraste": round(float(L.std()), 2), "sat": round(float(sat.mean()), 2),
            "nitidez": sharp, **tone, "sol": [int(xs.mean() * 100 / im.width), int(ys.mean() * 100 / im.height)]}


if __name__ == "__main__":
    args, crop = sys.argv[1:], None
    if "--crop" in args:
        i = args.index("--crop"); crop = tuple(int(v) for v in args[i + 1].split(",")); del args[i:i + 2]
    for f in args:
        im = Image.open(f)
        print(json.dumps({"img": f, **measure(im.crop(crop) if crop else im)}, ensure_ascii=False))
