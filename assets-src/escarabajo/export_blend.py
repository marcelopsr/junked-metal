# Exporta escarabajo.blend → escarabajo_raw.glb + public/models/escarabajo.glb (sin regenerar malla).
# Uso: Blender -b escarabajo.blend --python export_blend.py
import os, sys
import bpy

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bicho as b

ao = bpy.data.objects["EscarabajoRig"]
ob = bpy.data.objects["Escarabajo"]
folder = os.path.dirname(os.path.abspath(__file__))
out = b.export(ao, ob, "escarabajo", folder)
print("EXPORT_OK", out)
