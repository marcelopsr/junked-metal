# Polilla — cuerpo + ala derecha de referencia (en juego las alas son wingTemplate ×2).
# Uso: Blender -b --python assets-src/polilla/polilla.py
import os, sys
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "assets-src"))
sys.path.insert(0, os.path.join(ROOT, "assets-src", "proc2"))
from toy_rigid import export_kind
from meshes import build_polilla_body, build_polilla_wing, SCALES
export_kind("polilla", os.path.dirname(__file__), [("Polilla", build_polilla_body), ("WingR", build_polilla_wing)], scale=SCALES["polilla"])
