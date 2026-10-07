#!/usr/bin/env python3
# Genera los 8 .blend + *_raw.glb de oleada 2 procedural.
#   /Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/proc2/build_all.py
import os, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "assets-src"))
sys.path.insert(0, os.path.join(ROOT, "assets-src", "proc2"))

from toy_rigid import export_kind
from meshes import (
    BUILDERS,
    SCALES,
    build_polilla_body,
    build_polilla_wing,
    build_rey_leg,
    build_tarantula_leg,
)

KINDS = ("friccion", "robot", "polilla", "rey", "tarantula", "cortadora", "aspiradora", "cortacercos")

for kind in KINDS:
    folder = os.path.join(ROOT, "assets-src", kind)
    os.makedirs(folder, exist_ok=True)
    if kind == "polilla":
        parts = [("Polilla", build_polilla_body), ("WingR", build_polilla_wing)]
        pub_parts = ["Polilla"]
    elif kind == "rey":
        parts = [("Rey", BUILDERS[kind]), ("LegR", build_rey_leg)]
        pub_parts = ["Rey"]
    elif kind == "tarantula":
        parts = [("Tarantula", BUILDERS[kind]), ("LegR", build_tarantula_leg)]
        pub_parts = ["Tarantula"]
    else:
        parts = [(kind.capitalize(), BUILDERS[kind])]
        pub_parts = None
    export_kind(kind, folder, parts, scale=SCALES[kind], export_public=True, public_parts=pub_parts)
    print("OK", kind)
