# PNG de referencia desde gato.blend (tras sculpt; no regenera malla).
# Uso: Blender -b gato.blend --python render_renders.py
import os, sys
import bpy

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import cuadrupedo as q

ao = bpy.data.objects["GatoRig"]
acts = {a.name: a for a in bpy.data.actions}
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "renders")
T, D = (0, 3.3, -0.8), 21
q.render(ao, out, "gato", [
    ("34", None, 0, (1, 0.45, 1.1)), ("lateral", None, 0, (1, 0.12, 0)), ("frontal", None, 0, (0, 0.15, 1)),
    ("walk", acts.get("walk"), 8, (1, 0.25, 0.4)), ("run", acts.get("run"), 6, (1, 0.12, 0)),
    ("jump_agazapa", acts.get("jump"), 12, (1, 0.2, 0.6)), ("jump_aire", acts.get("jump"), 22, (1, 0.12, 0.2)),
    ("spin", acts.get("spin"), 9, (1, 0.5, 1)), ("swipe", acts.get("swipe"), 11, (0.5, 0.25, 1)),
    ("rage", acts.get("rage"), 10, (1, 0.2, 0.3)), ("idle", acts.get("idle"), 12, (1, 0.35, 1)), ("death", acts.get("death"), 40, (0.6, 0.6, 1))], T, D)
print("RENDERS_OK", out)
