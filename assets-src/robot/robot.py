# Robot a cuerda — oleada 2 procedural.
# Uso: Blender -b --python assets-src/robot/robot.py
import os, sys
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "assets-src"))
sys.path.insert(0, os.path.join(ROOT, "assets-src", "proc2"))
from toy_rigid import export_kind
from meshes import build_robot, SCALES
export_kind("robot", os.path.dirname(__file__), [("Robot", build_robot)], scale=SCALES["robot"])
