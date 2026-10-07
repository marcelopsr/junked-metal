# Re-exporta aspiradora.blend → public/models/aspiradora.glb sin regenerar malla.
# Uso: Blender -b aspiradora.blend --python export_blend.py
import os, sys
import bpy

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bicho as b

folder = os.path.dirname(os.path.abspath(__file__))
ao = bpy.data.objects["aspiradoraRig"]
ob = bpy.data.objects["Aspiradora"]
out = b.export(ao, ob, "aspiradora", folder)
print("EXPORT_OK", out)
