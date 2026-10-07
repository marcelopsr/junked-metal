# Oleada 2 / sculpt: vértices permanentes en gato.blend (orejas, mejillas, cola, panza). No toca animaciones.
# Uso: Blender -b gato.blend --python polish_oleada2.py
import os, sys
import bpy
from mathutils import Vector
from mathutils.geometry import intersect_point_line

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bicho as b
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
    we = w(v, {"ear_L", "ear_R"})
    if we > 0.28:
        v.co.z += 0.032 * we
        push_radial(v, 0.012 * we)
        if v.co.z > 0.55:
            v.co.z += 0.015 * we

    wh = w(v, {"head", "jaw"})
    if wh > 0.35 and v.co.y > 0.42 and abs(v.co.x) > 0.08:
        push_radial(v, 0.016 * wh)

    wt = w(v, TAIL)
    if wt > 0.2:
        along_bone(v, "tail1" if w(v, {"tail1"}) > 0.5 else "tail3", 0.08 * wt)
        push_radial(v, 0.01 * wt)
        if v.co.y < -3.5:
            push_radial(v, 0.014 * wt)

    wb = w(v, {"chest", "spine", "hips"})
    if wb > 0.4 and v.co.y > 0.2 and v.co.y < 0.55 and abs(v.co.x) < 0.35:
        v.co.z += 0.01 * wb

for p in ob.data.polygons:
    p.use_smooth = True
ob.data.update()

body = bpy.data.materials.get("Body")
if body:
    body.diffuse_color = (*b._lin("#f09020"), 1)
    p = body.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = body.diffuse_color
stripe = bpy.data.materials.get("Stripe")
if stripe:
    stripe.diffuse_color = (*b._lin("#6e2810"), 1)
    p = stripe.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = stripe.diffuse_color
belly = bpy.data.materials.get("Belly")
if belly:
    belly.diffuse_color = (*b._lin("#fff4e0"), 1)
    p = belly.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = belly.diffuse_color
eye = bpy.data.materials.get("Eye")
if eye:
    p = eye.node_tree.nodes["Principled BSDF"]
    p.inputs["Emission Strength"].default_value = 0.62

bpy.ops.wm.save_mainfile()
print("POLISH_OLEADA2 gato tris", tris(ob))
export_bicho("GatoRig", "Gato", "gato", folder)
