# Segundo pase oleada 2 (sobre perro.blend ya pulido). No re-ejecutar polish_oleada2.py antes.
# Uso: Blender -b perro.blend --python polish_oleada2b.py
import os, sys
import bpy
from mathutils import Vector
from mathutils.geometry import intersect_point_line

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from oleada2_common import export_bicho, tris

ob = bpy.data.objects["Perro"]
ao = bpy.data.objects["PerroRig"]
folder = os.path.dirname(os.path.abspath(__file__))
vg = {g.index: g.name for g in ob.vertex_groups}
bones = ao.data.bones


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
    wp = w(v, {"fpaw_L", "fpaw_R", "hpaw_L", "hpaw_R"})
    if wp > 0.35 and v.co.y < 0.35:
        v.co.y -= 0.008 * wp
        push_radial(v, 0.014 * wp)

    wt = w(v, {"tail"})
    if wt > 0.25:
        along_bone(v, "tail", 0.06 * wt)
        if v.co.y < 0.15:
            push_radial(v, 0.01 * wt)

    if w(v, {"head"}) > 0.4 and 0.62 < v.co.y < 0.78 and abs(v.co.x) < 0.2:
        v.co.y += 0.014 * w(v, {"head"})
        v.co.z += 0.006 * w(v, {"head"})

    whp = w(v, {"hips", "thigh_L", "thigh_R"})
    if whp > 0.45 and v.co.y > 0.25 and v.co.y < 0.5 and abs(v.co.x) > 0.22:
        push_radial(v, 0.02 * whp)

for p in ob.data.polygons:
    p.use_smooth = True
ob.data.update()
bpy.ops.wm.save_mainfile()
print("POLISH_OLEADA2B perro tris", tris(ob))
export_bicho("PerroRig", "Perro", "perro", folder)
