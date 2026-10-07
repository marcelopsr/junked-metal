# Oleada 2 / sculpt: vértices permanentes en perro.blend (pecho, hocico, orejas, cintura). No toca animaciones.
# Uso: Blender -b perro.blend --python polish_oleada2.py
import os, sys
import bpy
from mathutils import Vector
from mathutils.geometry import intersect_point_line

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bicho as b
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


EARS = {"ear_L", "ear_R"}
FRONT = {"chest", "neck", "head", "jaw"}

for v in ob.data.vertices:
    wc = w(v, {"chest"})
    if wc > 0.35 and v.co.y > 0.35:
        along_bone(v, "chest", 0.07 * wc)
        push_radial(v, 0.014 * wc)
        v.co.y += 0.012 * wc

    wh = w(v, {"head", "jaw"})
    if wh > 0.3 and v.co.y > 0.55:
        v.co.y += 0.022 * wh
        push_radial(v, 0.01 * wh)
        if v.co.y > 0.72:
            v.co.y += 0.012 * wh * w(v, {"jaw"})

    we = w(v, EARS)
    if we > 0.25:
        v.co.z += 0.028 * we * min(1.0, (v.co.z - 0.5) * 0.35)
        push_radial(v, 0.018 * we)

    wt = w(v, {"hips", "spine"})
    if wt > 0.35 and w(v, {"chest"}) < 0.12 and w(v, {"thigh_L", "thigh_R"}) < 0.2:
        pinch = min(0.12, (wt - 0.3) * 0.22)
        v.co.x *= 1.0 - pinch
        v.co.z *= 1.0 - pinch * 0.55

    leg_set = {"arm_L", "arm_R", "thigh_L", "thigh_R", "forearm_L", "forearm_R", "shin_L", "shin_R"}
    wl = w(v, leg_set)
    if wl > 0.4:
        leg = max((vg[g.group] for g in v.groups if vg.get(g.group) in leg_set), key=lambda n: w(v, {n}), default=None)
        if leg:
            along_bone(v, leg, 0.05 * wl)

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

# Materiales oleada 1c (contraste pecho / emisión ojo suave)
body = bpy.data.materials.get("Body")
if body:
    body.diffuse_color = (*b._lin("#565a62"), 1)
    p = body.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = body.diffuse_color
chest = bpy.data.materials.get("Chest")
if chest:
    chest.diffuse_color = (*b._lin("#fcfaf4"), 1)
    p = chest.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = chest.diffuse_color
eye = bpy.data.materials.get("Eye")
if eye:
    p = eye.node_tree.nodes["Principled BSDF"]
    p.inputs["Emission Strength"].default_value = 0.42

bpy.ops.wm.save_mainfile()
print("POLISH_OLEADA2 perro tris", tris(ob))
export_bicho("PerroRig", "Perro", "perro", folder)
