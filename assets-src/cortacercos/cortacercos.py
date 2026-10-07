# Cortacercos eléctrico (minijefe).
# Uso: Blender -b --python assets-src/cortacercos/cortacercos.py
import os, sys
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "assets-src"))
sys.path.insert(0, os.path.join(ROOT, "assets-src", "proc2"))
from toy_rigid import export_kind
from meshes import build_cortacercos, SCALES
export_kind("cortacercos", os.path.dirname(__file__), [("Cortacercos", build_cortacercos)], scale=SCALES["cortacercos"])
