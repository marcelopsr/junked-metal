# Segundo pase oleada 2 (sobre gato.blend ya pulido). No re-ejecutar polish_oleada2.py antes.
# Uso: Blender -b gato.blend --python polish_oleada2b.py
import os, sys
import bpy
from mathutils import Vector
from mathutils.geometry import intersect_point_line

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from oleada2_common import export_bicho, tris

ob = bpy.data.objects["Gato"]
ao = bpy.data.objects["GatoRig"]
folder = os.path.dirname(os.path.abspath(__file__))
vg = {g.index: g.name for g in ob.vertex_groups}
bones = ao.data.bones
TAIL = {"tail1", "tail2", "tail3", "tail4", "tail5"}


def w(v, names):
    t = 0.0
    for g in v.groups:
        if vg.get(g.group) in names:
            t = max(t, g.weight)
    return t


def push_radial(v, amount):
    side = Vector((v.co.x, 0, v.co.z))
    if side.length > 1e-6 and amount:
        v.co += side.normalized() * amount


def along_bone(v, bone_name, scale):
    bone = bones.get(bone_name)
    if not bone or abs(scale) < 1e-6:
        return
    p, t = intersect_point_line(v.co, bone.head_local, bone.tail_local)
    p = bone.head_local.lerp(bone.tail_local, min(1, max(0, t)))
    off = v.co - p
    if off.length > 1e-6:
        v.co = p + off * (1.0 + scale)


for v in ob.data.vertices:
    wh = w(v, {"head", "jaw"})
    wp = w(v, {"fpaw_L", "fpaw_R", "hpaw_L", "hpaw_R"})
    if wp > 0.32 and v.co.y < 0.32:
        push_radial(v, 0.013 * wp)

    if wh > 0.45 and v.co.y > 0.38 and v.co.y < 0.52 and abs(v.co.x) > 0.12 and abs(v.co.x) < 0.32:
        push_radial(v, 0.02 * wh)

    if w(v, {"neck", "chest"}) > 0.35 and v.co.y > 0.48 and v.co.y < 0.62:
        v.co.z -= 0.01 * w(v, {"neck", "chest"})

    leg_set = {"thigh_L", "thigh_R", "shin_L", "shin_R"}
    wl = w(v, leg_set)
    if wl > 0.42 and v.co.y < 0.42:
        along_bone(v, "thigh_L" if w(v, {"thigh_L"}) > w(v, {"thigh_R"}) else "thigh_R", 0.04 * wl)

for p in ob.data.polygons:
    p.use_smooth = True
ob.data.update()
bpy.ops.wm.save_mainfile()
print("POLISH_OLEADA2B gato tris", tris(ob))
export_bicho("GatoRig", "Gato", "gato", folder)
