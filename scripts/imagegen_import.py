"""Importa PNG nuevos de assets-src/imagegen-production/encore-v1/raw/ a assets-src/ref-rcrace/refN.png.
Descarta duplicados por firma 16x16 (diferencia media < 6) contra todas las refs. Anota origen en _origen_imagegen.tsv.
Uso: .venv-ref/bin/python scripts/imagegen_import.py   (lo llama `node scripts/imagegen.mjs --importar`)"""
import glob, os, shutil
import numpy as np
from PIL import Image

REF = "assets-src/ref-rcrace"
RAW = "assets-src/imagegen-production/encore-v1/raw"

def sig(p):
    a = np.asarray(Image.open(p).convert("L").resize((16, 16)), dtype=float)
    return a - a.mean()

refs = glob.glob(f"{REF}/*.png")
have = [sig(p) for p in refs]
n = max(int(os.path.basename(p)[3:-4]) for p in refs if os.path.basename(p)[3:-4].isdigit())
log = open(f"{REF}/_origen_imagegen.tsv", "a")
nuevas = 0
for f in sorted(glob.glob(f"{RAW}/*.png"), key=os.path.getmtime):
    s = sig(f)
    if any(np.abs(s - t).mean() < 6 for t in have):
        continue
    n += 1
    d = f"{REF}/ref{n}.png"
    shutil.copy2(f, d)
    have.append(s)
    log.write(f"{d}\t{f}\n")
    print(d, "<-", f)
    nuevas += 1
print(nuevas, "nuevas; registrarlas en docs/art_direction/visual_reference_register.md")
