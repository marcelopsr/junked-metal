# Oleada 1b: refino permanente en ant.blend (silueta mandíbulas/antenas, cintura tórax-abdomen).
# Uso: Blender -b ant.blend --python polish_1b.py
import bpy
from mathutils import Vector

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
vg_names = {g.index: g.name for g in ant.vertex_groups}


def bone_weight(v, names):
    w = 0.0
    for g in v.groups:
        if vg_names.get(g.group) in names:
            w = max(w, g.weight)
    return w


# Cintura legible: estrechar vértices con peso mixto tórax+abdomen
for v in ant.data.vertices:
    wt = bone_weight(v, THORAX)
    wa = bone_weight(v, ABDOMEN)
    if wt > 0.2 and wa > 0.2 and wt + wa > 0.55:
        pinch = min(0.22, (wt + wa - 0.5) * 0.35)
        v.co.x *= 1.0 - pinch
        v.co.z *= 1.0 - pinch * 0.65

# Mandíbulas: empujar hacia +Y y afuera en X
for v in ant.data.vertices:
    wm = bone_weight(v, MAND)
    if wm < 0.25:
        continue
    v.co.y += 0.018 * wm
    v.co.x *= 1.0 + 0.12 * wm

# Antenas: alargar y engrosar extremos (más peso en Bone.035–037)
for v in ant.data.vertices:
    wa = bone_weight(v, ANT)
    if wa < 0.2:
        continue
    tip = bone_weight(v, {f"Bone.{i:03d}" for i in range(35, 38)})
    v.co.y += 0.025 * wa * (0.5 + tip)
    off = Vector((v.co.x, 0, v.co.z))
    if off.length > 1e-4:
        v.co += off.normalized() * 0.012 * wa * tip

for p in ant.data.polygons:
    p.use_smooth = True
ant.data.update()

bpy.ops.wm.save_mainfile()
tris = sum(len(p.vertices) - 2 for p in ant.data.polygons)
print("POLISH_1B tris", tris)
