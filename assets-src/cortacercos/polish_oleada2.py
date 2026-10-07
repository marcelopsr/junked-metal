# Oleada 2: vértices en cortacercos.blend (mango, cabeza, hoja, dientes). No toca animaciones.
# Uso: Blender -b cortacercos.blend --python polish_oleada2.py
import os, sys
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bicho as b
from oleada2_common import tris

ob = bpy.data.objects["Cortacercos"]
ao = bpy.data.objects["cortacercosRig"]
folder = os.path.dirname(os.path.abspath(__file__))


def push_radial_xz(v, amount):
    side = Vector((v.co.x, 0, v.co.z))
    if side.length > 1e-6 and amount:
        v.co += side.normalized() * amount


for v in ob.data.vertices:
    co = v.co
    x, y, z = co.x, co.y, co.z
    ax, az = abs(x), abs(z)

    # Cabeza / motor (z negativo, y alto)
    if 1.4 < y < 3.2 and -3.6 < z < -1.2 and ax < 1.5:
        bulge = max(0.0, 1.2 - ax) * max(0.0, 1.0 - abs(z + 2.4) / 1.8)
        v.co.y += 0.04 * bulge
        push_radial_xz(v, 0.018 * bulge)

    # Mango curvo (tubo)
    if 0.05 < y < 3.2 and -5.8 < z < -3.8 and ax < 0.35:
        push_radial_xz(v, 0.025)
        v.co.y += 0.012

    # Cuerpo amarillo: esquinas más redondas
    if 0.35 < y < 2.5 and -4.2 < z < -1.0 and (ax > 1.0 or az > 1.2):
        pinch = min(0.08, (ax - 0.9) * 0.04 + max(0, az - 1.0) * 0.03)
        v.co.x *= 1.0 - pinch * 0.35
        v.co.z *= 1.0 - pinch * 0.25

    # Hoja / barra de corte (+Z)
    if 0.55 < y < 1.35 and z > 0.2 and ax < 1.1:
        v.co.z += 0.02 * min(1.0, z * 0.15)
        if ax > 0.35:
            v.co.x *= 1.04  # filo más ancho en cantos

    # Dientes en la barra
    if 0.75 < y < 1.15 and -0.5 < z < 5.5 and ax > 0.4 and ax < 0.75:
        v.co.y += 0.012
        v.co.z += 0.008 * (1 if z > 1.5 else 0.4)

    # Ojos: no mover
    if 1.95 < y < 2.4 and ax > 0.55 and ax < 0.95 and -1.6 < z < -0.7:
        continue

for p in ob.data.polygons:
    p.use_smooth = True
ob.data.update()

eye = bpy.data.materials.get("Eye")
if eye and eye.node_tree:
    p = eye.node_tree.nodes.get("Principled BSDF")
    if p:
        p.inputs["Emission Strength"].default_value = 4.0

bpy.ops.wm.save_mainfile()
print("POLISH_OLEADA2 cortacercos tris", tris(ob))
b.export(ao, ob, "cortacercos", folder)
