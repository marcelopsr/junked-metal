# Autito a fricción — malla oleada 2 (port de enemyTemplate en src/models.ts).
# Uso: /Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/friccion/friccion.py
import os, sys
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "assets-src"))
sys.path.insert(0, os.path.join(ROOT, "assets-src", "proc2"))
from toy_rigid import export_kind
from meshes import build_friccion, SCALES
export_kind("friccion", os.path.dirname(__file__), [("Friccion", build_friccion)], scale=SCALES["friccion"])
