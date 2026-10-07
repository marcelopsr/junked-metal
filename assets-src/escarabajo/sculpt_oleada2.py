# Oleada 2: sculpt permanente en escarabajo.blend (vértices, sin subdividir — techo ~1594 tris).
# Élitros más abombados, costura más hundida, pronoto y cuerno más legibles a distancia.
# Uso: Blender -b escarabajo.blend --python sculpt_oleada2.py
import os, sys
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bicho as b

ob = bpy.data.objects["Escarabajo"]
ao = bpy.data.objects["EscarabajoRig"]
bpy.context.view_layer.objects.active = ob
for o in bpy.context.selected_objects:
    o.select_set(False)
ob.select_set(True)

vg_names = {g.index: g.name for g in ob.vertex_groups}
mat_names = [m.name if m else "" for m in ob.data.materials]

# material dominante por vértice (modo polígono)
vert_mat = [""] * len(ob.data.vertices)
for p in ob.data.polygons:
    mn = mat_names[p.material_index] if p.material_index < len(mat_names) else ""
    for vi in p.vertices:
        vert_mat[vi] = mn


def bone_weight(v, names):
    w = 0.0
    for g in v.groups:
        if vg_names.get(g.group) in names:
            w = max(w, g.weight)
    return w


BODY = {"body"}
HEAD = {"head"}
LEGS = {f"leg_{s}{k}" for s in ("R", "L") for k in (1, 2, 3)}

for i, v in enumerate(ob.data.vertices):
    co = v.co
    wb = bone_weight(v, BODY)
    wh = bone_weight(v, HEAD)
    wl = bone_weight(v, LEGS)
    mn = vert_mat[i]

    # Élitros: más volumen atrás y en los cantos (Blender +Y = adelante juego)
    if wb > 0.35 and co.y < 0.15:
        flare = 0.11 * wb
        if abs(co.x) > 0.25:
            co.x *= 1.0 + flare * 1.15
        co.z += 0.028 * wb * max(0, 0.55 - co.y * 0.35)

    # Costura central y bandas Dark: hundir hacia el eje X
    if mn == "Dark" and wb > 0.2:
        pinch = 0.18 * max(wb, 0.45)
        if abs(co.x) < 0.12:
            co.x *= 1.0 - pinch
        co.z -= 0.012 * wb

    # Brillos Shine: leve relieve
    if mn == "Shine" and wb > 0.25:
        n = Vector((co.x, co.y * 0.4, co.z))
        if n.length > 1e-4:
            co += n.normalized() * 0.014 * wb

    # Pronoto (body adelante)
    if wb > 0.4 and 0.35 < co.y < 0.95 and abs(co.x) < 0.55:
        co.z += 0.022 * wb
        co.y += 0.012 * wb

    # Cabeza + cuerno (Dark en head)
    if wh > 0.3:
        if mn == "Eye" and co.y > 1.05:
            co.y += 0.018 * wh
            co.x *= 1.0 + 0.06 * wh
        if mn == "Dark" and co.y > 1.0:
            tip = max(0, (co.y - 1.05) / 0.95)
            co.y += 0.04 * wh * (0.35 + tip)
            co.z += 0.025 * wh * tip
            if abs(co.x) < 0.08 and co.y > 1.35:
                co.x *= 1.0 - 0.08 * wh * tip

    # Muslos un poco más toy
    if wl > 0.45 and mn == "Legs":
        co.x *= 1.0 + 0.07 * wl

for p in ob.data.polygons:
    p.use_smooth = True
ob.data.update()

bpy.ops.wm.save_mainfile()
tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
print("SCULPT_OLEADA2 tris", tris)

folder = os.path.dirname(os.path.abspath(__file__))
out = b.export(ao, ob, "escarabajo", folder)
print("SCULPT_OLEADA2 export", out)
