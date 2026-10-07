# PNG de referencia desde perro.blend (tras sculpt; no regenera malla).
# Uso: Blender -b perro.blend --python render_renders.py
import os, sys
import bpy

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import cuadrupedo as q

ao = bpy.data.objects["PerroRig"]
acts = {a.name: a for a in bpy.data.actions}
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "renders")
T, D = (0, 4.2, 0.8), 24
q.render(ao, out, "perro", [
    ("34", None, 0, (1, 0.45, 1.1)), ("lateral", None, 0, (1, 0.12, 0)), ("frontal", None, 0, (0, 0.15, 1)),
    ("walk", acts.get("walk"), 8, (1, 0.25, 0.4)), ("run", acts.get("run"), 6, (1, 0.12, 0)),
    ("jump_slam_aire", acts.get("jump_slam"), 19, (1, 0.12, 0.2)), ("jump_slam_golpe", acts.get("jump_slam"), 28, (1, 0.3, 0.9)),
    ("charge", acts.get("charge"), 12, (1, 0.12, 0.2)), ("rage", acts.get("rage"), 10, (0.8, 0.3, 1)),
    ("idle", acts.get("idle"), 12, (1, 0.35, 1)), ("death", acts.get("death"), 40, (0.6, 0.6, 1))], T, D)
print("RENDERS_OK", out)
