# Exporta ant.blend al GLB del juego (public/models/ant.glb). Convenciones del GLB: ver el comentario de src/glb.ts.
# Uso (desde esta carpeta):
#   /Applications/Blender.app/Contents/MacOS/Blender -b ant.blend --python export_clean.py
#   npx gltf-transform optimize ant_clean.glb ../../public/models/ant.glb --compress quantize --simplify false --texture-compress false --palette false
# - Normaliza pesos (el original trae pesos > 1: por eso Blender decía "Mesh Ant is not valid") y deja máx. 4 huesos por vértice.
# - Sombreado suave. Engorda la malla tipo juguete: cada vértice se aleja del eje de sus huesos (mezclado por peso); el rig y las acciones no cambian.
# - Agrega dos ojos (material "Eye") pesados al hueso de la cabeza; el juego los pinta emisivos.
# - Acciones del juego: "walk" y "attack" (el original se llama "bite"). Solo se exportan los canales con keyframes.
import bpy, os
from mathutils.geometry import intersect_point_line

ant = bpy.data.objects["Ant"]
arm = bpy.data.objects["Armature"]
bpy.context.view_layer.objects.active = ant
for o in bpy.context.selected_objects: o.select_set(False)
ant.select_set(True)
bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)

# Cuánto se ensancha cada parte alrededor de su hueso (1 = igual)
def fat(name):
    n = int(name.split(".")[1]) if "." in name else 0
    if name == "Bone.002": return 1.8   # abdomen
    if name in ("Bone", "Bone.001", "Bone.031"): return 1.5  # tórax, cuello, cabeza
    if 3 <= n <= 6: return 1.5           # mandíbulas
    if 32 <= n <= 37: return 1.8         # antenas
    return 2.6                           # patas (Bone.007 a Bone.030)
names = {g.index: g.name for g in ant.vertex_groups}
bones = arm.data.bones
for v in ant.data.vertices:
    d = v.co.copy() * 0
    for g in v.groups:
        b = bones[names[g.group]]
        p, t = intersect_point_line(v.co, b.head_local, b.tail_local)
        p = b.head_local.lerp(b.tail_local, min(1, max(0, t)))
        d += (v.co - p) * ((fat(b.name) - 1) * g.weight)
    v.co += d
for p in ant.data.polygons: p.use_smooth = True  # sombreado suave: superficie de plástico, no facetas
ant.data.update()

ant.data.materials[0].name = "Body"
ant.data.materials[0].diffuse_color = (0.35, 0.09, 0.03, 1)
eye = bpy.data.materials.new("Eye")
for x in (0.09, -0.09):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.035, location=(x, 0.215, 0.15))
    e = bpy.context.active_object
    bpy.ops.object.shade_smooth()
    e.data.materials.append(eye)
    e.vertex_groups.new(name="Bone.031").add(list(range(len(e.data.vertices))), 1.0, "REPLACE")
    e.select_set(True); ant.select_set(True)
    bpy.context.view_layer.objects.active = ant
    bpy.ops.object.join()
bpy.data.actions["bite"].name = "attack"
out = os.path.join(os.path.dirname(bpy.data.filepath), "ant_clean.glb")
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_animations=True, export_animation_mode="ACTIONS",
                          export_force_sampling=False, export_yup=True, export_all_influences=False, export_texcoords=False,
                          export_materials="EXPORT")
