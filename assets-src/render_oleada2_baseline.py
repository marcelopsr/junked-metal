# Render before/after desde GLB. Uso:
#   Blender -b --python render_oleada2_baseline.py -- glb=PATH out=PATH [ortho=1.05]
import os, sys

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
opts = dict(s.split("=", 1) for s in argv)
glb = opts.get("glb")
out = opts.get("out")
ortho = float(opts.get("ortho", "1.8"))

if not glb or not out:
    raise SystemExit("need glb= and out=")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from oleada2_common import render_glb

render_glb(glb, out, ortho_scale=ortho)
