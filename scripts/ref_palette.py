"""Paleta y recortes de las láminas de referencia (RC Race: Mini Worlds).
Uso: .venv-ref/bin/python scripts/ref_palette.py assets-src/ref-rcrace/*.png
Salida: scratch/ref-rcrace/<lámina>/{palette.json, tile_rRcC.png}
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image

K = 12  # colores por lámina


def kmeans(px, k, it=12, seed=0):
    rng = np.random.default_rng(seed)
    c = px[rng.choice(len(px), k, replace=False)]
    for _ in range(it):
        lab = ((px[:, None] - c[None]) ** 2).sum(-1).argmin(1)
        c = np.array([px[lab == i].mean(0) if (lab == i).any() else c[i] for i in range(k)])
    return c, np.bincount(lab, minlength=k) / len(px)


def palette(img):
    a = np.asarray(img.convert("RGB").resize((256, 171))).reshape(-1, 3).astype(float)
    mx, mn = a.max(1), a.min(1)
    a = a[(mx > 40) & (mx - mn > 25)]  # fuera fondo oscuro del panel y grises de UI
    c, w = kmeans(a, K)
    o = w.argsort()[::-1]
    return [{"hex": "#%02X%02X%02X" % tuple(int(v) for v in c[i]), "peso": round(float(w[i]), 3)} for i in o]


def tiles(img, out):
    """Corta por las franjas oscuras que separan paneles (fondo #1a1d22 aprox)."""
    g = np.asarray(img.convert("L")).astype(float)
    def cortes(perfil):
        dark = perfil < 40
        runs, s = [], None
        for i, d in enumerate(np.append(dark, False)):
            if d and s is None: s = i
            if not d and s is not None:
                if i - s >= 4: runs.append((s + i) // 2)
                s = None
        return [0] + runs + [len(perfil)]
    ys = cortes(np.median(g, 1))
    n = 0
    for r, (y0, y1) in enumerate(zip(ys, ys[1:])):
        if y1 - y0 < 60: continue
        xs = cortes(np.median(g[y0:y1], 0))
        for c, (x0, x1) in enumerate(zip(xs, xs[1:])):
            if x1 - x0 < 60: continue
            img.crop((x0, y0, x1, y1)).save(out / f"tile_r{r}c{c}.png"); n += 1
    return n


for f in map(Path, sys.argv[1:]):
    img = Image.open(f)
    out = Path("scratch/ref-rcrace") / f.stem; out.mkdir(parents=True, exist_ok=True)
    pal = palette(img)
    (out / "palette.json").write_text(json.dumps(pal, indent=1))
    print(f.name, tiles(img, out), "recortes |", " ".join(p["hex"] for p in pal))
