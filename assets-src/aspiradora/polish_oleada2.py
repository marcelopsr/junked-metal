# Oleada 2: vértices en aspiradora.blend (cúpula, morro, bumper, escobillas). No toca animaciones.
# Uso: Blender -b aspiradora.blend --python polish_oleada2.py
import os, sys
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bicho as b
from oleada2_common import tris

ob = bpy.data.objects["Aspiradora"]
ao = bpy.data.objects["aspiradoraRig"]
folder = os.path.dirname(os.path.abspath(__file__))


def push_radial_xz(v, amount):
    side = Vector((v.co.x, 0, v.co.z))
    if side.length > 1e-6 and amount:
        v.co += side.normalized() * amount


for v in ob.data.vertices:
    co = v.co
    x, y, z = co.x, co.y, co.z
    ax, az = abs(x), abs(z)

    # Cúpula principal: más volumen arriba y cresta frontal
    if 0.85 < y < 2.35 and ax < 2.8 and az < 2.2:
        dome = max(0.0, 1.0 - ax / 3.2) * max(0.0, 1.0 - az / 2.5)
        v.co.y += 0.055 * dome
        push_radial_xz(v, 0.022 * dome)
        if z > 0.35:
            v.co.z += 0.018 * dome

    # Anillo cromado / cintura
    if 1.35 < y < 1.55 and 2.0 < ax < 3.2:
        push_radial_xz(v, 0.012)

    # Morro y lente (+Z)
    if y > 1.25 and z > 2.4 and ax < 2.2:
        v.co.z += 0.028 * min(1.0, (z - 2.2) * 0.35)
        if ax < 1.0:
            v.co.y += 0.01

    # Bumper inferior (toro): más redondo
    if y < 0.95 and 2.8 < ax < 4.3:
        v.co.y += 0.015
        push_radial_xz(v, 0.02)

    # Alojamientos de escobillas laterales
    if 0.12 < y < 0.45 and 2.4 < ax < 3.2 and 2.0 < z < 3.2:
        push_radial_xz(v, 0.014)
        v.co.y += 0.008

    # Ojo de torreta: no deformar (esfera ~ y 2.05)
    if 1.85 < y < 2.25 and ax < 0.9 and 0.0 < z < 0.55:
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
print("POLISH_OLEADA2 aspiradora tris", tris(ob))
b.export(ao, ob, "aspiradora", folder)
