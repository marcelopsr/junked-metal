# Escarabajo rey — cuerpo sin patas (patas = legTemplate en juego).
# Uso: Blender -b --python assets-src/rey/rey.py
import os, sys
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "assets-src"))
sys.path.insert(0, os.path.join(ROOT, "assets-src", "proc2"))
from toy_rigid import export_kind
from meshes import build_rey, build_rey_leg, SCALES
export_kind("rey", os.path.dirname(__file__), [("Rey", build_rey), ("LegR", build_rey_leg)], scale=SCALES["rey"])
