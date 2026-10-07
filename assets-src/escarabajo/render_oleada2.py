# Renders oleada 2 — antes / después del sculpt en escarabajo.blend.
# Uso: Blender -b escarabajo.blend --python render_oleada2.py -- phase=before|after
import os, sys
import bpy

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bicho as b

A = b.args()
phase = A.get("phase", "before")
if phase not in ("before", "after"):
    raise SystemExit("phase debe ser before o after")

base = os.path.dirname(os.path.abspath(__file__))
outdir = os.path.join(base, ".renders", "oleada2_" + phase)
ao = bpy.data.objects["EscarabajoRig"]

walk_act = atk_act = None
for act in bpy.data.actions:
    if act.name == "walk":
        walk_act = act
    elif act.name == "attack":
        atk_act = act

shots = [
    ("34", None, 0, (2.4, 1.6, 2.8)),
    ("lateral", None, 0, (5.2, 0.6, 0)),
    ("walk", walk_act, 8, (2.4, 1.6, 2.8)),
    ("attack_carga", atk_act, 8, (5.2, 0.6, 0)),
    ("attack_embiste", atk_act, 12, (5.2, 0.6, 0)),
    ("attack_revolea", atk_act, 15, (5.2, 0.6, 0)),
]
b.render(ao, outdir, "escarabajo", shots, dist=1.3)
b.render(ao, outdir, "escarabajo", [("attack_carga_lejos", atk_act, 8, (5.2, 0.6, 0))], dist=2.5)
print("OLEADA2_RENDER", phase, "->", outdir)
