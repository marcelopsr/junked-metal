# Re-exporta cortacercos.blend → public/models/cortacercos.glb sin regenerar malla.
# Uso: Blender -b cortacercos.blend --python export_blend.py
import os, sys
import bpy

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bicho as b

folder = os.path.dirname(os.path.abspath(__file__))
ao = bpy.data.objects["cortacercosRig"]
ob = bpy.data.objects["Cortacercos"]
out = b.export(ao, ob, "cortacercos", folder)
print("EXPORT_OK", out)
