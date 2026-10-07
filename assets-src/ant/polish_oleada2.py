# Oleada 2: refino permanente en ant.blend (vértices reales; export_clean usa fat≈1).
# Uso: Blender -b ant.blend --python polish_oleada2.py
import bpy
from mathutils import Vector
from mathutils.geometry import intersect_point_line

ant = bpy.data.objects["Ant"]
arm = bpy.data.objects["Armature"]
bpy.context.view_layer.objects.active = ant
for o in bpy.context.selected_objects:
    o.select_set(False)
ant.select_set(True)

MAND = {f"Bone.{i:03d}" for i in range(3, 7)}
ANT = {f"Bone.{i:03d}" for i in range(32, 38)}
HEAD = "Bone.031"
THORAX = {"Bone", "Bone.001"}
ABDOMEN = "Bone.002"
LEGS = {f"Bone.{i:03d}" for i in range(7, 31)}
vg_names = {g.index: g.name for g in ant.vertex_groups}
bones = arm.data.bones


def w(v, names):
    t = 0.0
    for g in v.groups:
        if vg_names.get(g.group) in names:
            t = max(t, g.weight)
    return t


def push_along_bone(v, bone_name, amount):
    b = bones.get(bone_name)
    if not b or amount == 0:
        return
    p, t = intersect_point_line(v.co, b.head_local, b.tail_local)
    p = b.head_local.lerp(b.tail_local, min(1, max(0, t)))
    off = v.co - p
    if off.length > 1e-6:
        v.co = p + off * (1.0 + amount)


# Segmentos toy más gruesos en .blend (sustituye fat() del export)
for v in ant.data.vertices:
    wm = w(v, MAND)
    if wm > 0.3:
        mand_bone = ""
        for g in v.groups:
            nm = vg_names.get(g.group)
            if nm in MAND and g.weight > wm * 0.5:
                mand_bone = nm
                break
        if mand_bone:
            push_along_bone(v, mand_bone, 0.14 * wm)
        v.co.y += 0.012 * wm
    wa = w(v, ANT)
    if wa > 0.25:
        tip = w(v, {f"Bone.{i:03d}" for i in range(35, 38)})
        v.co.y += 0.02 * wa * (0.4 + tip)
        side = Vector((v.co.x, 0, v.co.z))
        if side.length > 1e-5:
            v.co += side.normalized() * 0.015 * wa * (0.3 + tip)
    wl = w(v, LEGS)
    if wl > 0.35 and v.groups:
        leg_bone = vg_names[max(v.groups, key=lambda g: g.weight).group]
        if leg_bone in LEGS:
            push_along_bone(v, leg_bone, 0.08 * wl)
    wh = w(v, {HEAD})
    if wh > 0.4:
        push_along_bone(v, HEAD, 0.06 * wh)

# Cintura y caparazón: tórax ancho, cintura estrecha, abdomen globo
for v in ant.data.vertices:
    wt = w(v, THORAX)
    wa = w(v, {ABDOMEN})
    if wt > 0.35 and wa < 0.15:
        v.co.x *= 1.0 + 0.06 * wt
        v.co.z *= 1.0 + 0.04 * wt
    if wa > 0.45 and wt < 0.2:
        v.co.x *= 1.0 + 0.1 * wa
        v.co.z *= 1.0 + 0.08 * wa
        v.co.y -= 0.008 * wa
    if wt > 0.2 and wa > 0.2:
        pinch = min(0.18, (wt + wa - 0.45) * 0.3)
        v.co.x *= 1.0 - pinch
        v.co.z *= 1.0 - pinch * 0.7

for p in ant.data.polygons:
    p.use_smooth = True
ant.data.update()
bpy.ops.wm.save_mainfile()
tris = sum(len(p.vertices) - 2 for p in ant.data.polygons)
print("POLISH_OLEADA2 ant tris", tris)
