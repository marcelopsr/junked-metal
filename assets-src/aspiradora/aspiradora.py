# Aspiradora robot (jefe final).
# Uso: Blender -b --python assets-src/aspiradora/aspiradora.py
import os, sys
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "assets-src"))
sys.path.insert(0, os.path.join(ROOT, "assets-src", "proc2"))
from toy_rigid import export_kind
from meshes import build_aspiradora, SCALES
export_kind("aspiradora", os.path.dirname(__file__), [("Aspiradora", build_aspiradora)], scale=SCALES["aspiradora"])
