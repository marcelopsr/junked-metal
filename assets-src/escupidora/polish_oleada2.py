# Oleada 2: sculpt permanente en escupidora.blend (no regenerar escupidora.py).
# Uso: Blender -b escupidora.blend --python polish_oleada2.py
import bpy
from mathutils import Vector

ob = bpy.data.objects["Escupidora"]
bpy.context.view_layer.objects.active = ob
ob.select_set(True)

SAC_BONES = {"abdomen"}
HEAD_BONES = {"head"}
BODY_BONES = {"body"}
LEG_PREFIX = ("leg_", "shin_")


def dom_bone(v):
    best, bw = "", 0.0
    for g in v.groups:
        if g.weight > bw:
            bw = g.weight
            best = ob.vertex_groups[g.group].name
    return best, bw


for v in ob.data.vertices:
    bone, bw = dom_bone(v)
    if bw < 0.25:
        continue
    if bone in SAC_BONES:
        v.co.x *= 1.0 + 0.12 * bw
        v.co.z *= 1.0 + 0.1 * bw
        if v.co.y > 0.5:
            v.co.y += 0.04 * bw
    elif bone in HEAD_BONES:
        v.co.y += 0.025 * bw
        if v.co.y > 0.35:
            v.co.z += 0.03 * bw
        side = Vector((v.co.x, 0, 0))
        if side.length > 1e-5:
            v.co += side.normalized() * 0.02 * bw
    elif bone.startswith("leg_") or bone.startswith("shin_"):
        mid = Vector((v.co.x, v.co.y * 0.5, v.co.z))
        if mid.length > 1e-5:
            v.co += (v.co - mid).normalized() * 0.018 * bw
    elif bone in BODY_BONES:
        v.co.x *= 1.0 + 0.05 * bw

# Ojos: material Eye — vértices con grupo head cerca de ojos
for v in ob.data.vertices:
    bone, bw = dom_bone(v)
    if bone == "head" and abs(v.co.x) > 0.12 and v.co.y > 0.45 and v.co.z > 0.2:
        push = Vector((v.co.x, 0, 0))
        if push.length > 1e-5:
            v.co += push.normalized() * 0.015

for p in ob.data.polygons:
    p.use_smooth = True
ob.data.update()

# Materiales más legibles a distancia (valores en blend; runtime override Body/Eye)
for m in bpy.data.materials:
    if m.name == "Sac" and m.node_tree:
        p = m.node_tree.nodes.get("Principled BSDF")
        if p:
            p.inputs["Emission Strength"].default_value = 1.2
    if m.name == "Eye" and m.node_tree:
        p = m.node_tree.nodes.get("Principled BSDF")
        if p:
            p.inputs["Emission Strength"].default_value = 4.8

bpy.ops.wm.save_mainfile()
tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
print("POLISH_OLEADA2 escupidora tris", tris)
