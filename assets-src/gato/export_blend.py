# Re-exporta gato.blend → public/models/gato.glb sin regenerar malla.
# Uso: Blender -b gato.blend --python export_blend.py
import os, sys
import bpy

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from oleada2_common import export_bicho

folder = os.path.dirname(os.path.abspath(__file__))
out = export_bicho("GatoRig", "Gato", "gato", folder)
print("EXPORT_OK", out)
