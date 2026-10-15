"""Hace tileable una textura (fundido de offset): mezcla la imagen con su versión desplazada media vuelta,
usando una máscara que pesa la original en el centro y la desplazada en los bordes. Sin costuras al repetir.
Uso: .venv-ref/bin/python scripts/make_tileable.py in.webp [out.webp]   (por defecto sobreescribe)"""
import sys
import numpy as np
from PIL import Image

src = sys.argv[1]; dst = sys.argv[2] if len(sys.argv) > 2 else src
a = np.asarray(Image.open(src).convert("RGB")).astype(float)
h, w, _ = a.shape
b = np.roll(np.roll(a, h // 2, 0), w // 2, 1)
y = np.abs(np.linspace(-1, 1, h))[:, None]; x = np.abs(np.linspace(-1, 1, w))[None, :]
m = np.clip(1 - np.maximum(x, y) ** 3, 0, 1)[..., None]  # 1 en el centro, 0 en el borde
out = a * m + b * (1 - m)
Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(dst, "WEBP", quality=82)
