# Tarántula — cuerpo sin 8 patas instanciadas.
# Uso: Blender -b --python assets-src/tarantula/tarantula.py
import os, sys
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "assets-src"))
sys.path.insert(0, os.path.join(ROOT, "assets-src", "proc2"))
from toy_rigid import export_kind
from meshes import build_tarantula, SCALES
export_kind("tarantula", os.path.dirname(__file__), [("Tarantula", build_tarantula)], scale=SCALES["tarantula"])
