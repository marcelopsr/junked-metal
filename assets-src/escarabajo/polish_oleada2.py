# Oleada 2: vértices en escarabajo.blend (élitros, pronoto, cuerno).
# Uso: Blender -b escarabajo.blend --python polish_oleada2.py
import os, sys
import bpy

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from oleada2_common import export_bicho, tris

ob = bpy.data.objects["Escarabajo"]
folder = os.path.dirname(os.path.abspath(__file__))

for v in ob.data.vertices:
    co = v.co
    # Élitros: cresta central y cantos más altos
    if co.y < 0.1 and co.y > -0.55 and abs(co.x) < 0.5:
        crest = max(0, 0.45 - abs(co.x) * 0.9)
        v.co.z += 0.028 * crest
        if abs(co.x) > 0.35:
            v.co.z += 0.018
    # Pronoto
    if 0.35 < co.y < 0.75 and abs(co.x) < 0.45:
        v.co.z += 0.02
        v.co.x *= 1.06
    # Cuerno (hacia +Y adelante)
    if co.y > 0.85 and abs(co.x) < 0.25:
        tip = max(0, co.y - 1.0)
        v.co.y += 0.03 * min(1, tip * 3)
        v.co.x *= 1.0 - 0.15 * min(1, tip * 2)

for p in ob.data.polygons:
    p.use_smooth = True
ob.data.update()
bpy.ops.wm.save_mainfile()
print("POLISH_OLEADA2 escarabajo tris", tris(ob))
export_bicho("EscarabajoRig", "Escarabajo", "escarabajo", folder)
