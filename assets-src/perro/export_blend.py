# Re-exporta perro.blend → public/models/perro.glb sin regenerar malla.
# Uso: Blender -b perro.blend --python export_blend.py
import os, sys
import bpy

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from oleada2_common import export_bicho

folder = os.path.dirname(os.path.abspath(__file__))
out = export_bicho("PerroRig", "Perro", "perro", folder)
print("EXPORT_OK", out)
