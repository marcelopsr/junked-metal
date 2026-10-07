# Utilidades oleada 2: renders comparables y re-export desde .blend (bicho/cuadrúpedo).
import bpy, math, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _eevee_scene(w=640, h=640):
    sc = bpy.context.scene
    try:
        sc.render.engine = "BLENDER_EEVEE"
    except TypeError:
        sc.render.engine = "BLENDER_EEVEE_NEXT"
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.film_transparent = True
    world = sc.world or bpy.data.worlds.new("World")
    sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.04, 0.05, 0.07, 1)
        bg.inputs[1].default_value = 0.35
    return sc


def _studio_cam(sc, ortho_scale=2.2):
    cam_data = bpy.data.cameras.new("Oleada2Cam")
    cam = bpy.data.objects.new("Oleada2Cam", cam_data)
    sc.collection.objects.link(cam)
    sc.camera = cam
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = ortho_scale
    light_data = bpy.data.lights.new("Key", "SUN")
    light = bpy.data.objects.new("Key", light_data)
    sc.collection.objects.link(light)
    light.rotation_euler = (math.radians(55), 0, math.radians(35))
    light.data.energy = 2.2
    return cam


def clear_scene_meshes():
    for o in list(bpy.data.objects):
        if o.type in ("MESH", "ARMATURE", "CAMERA", "LIGHT"):
            bpy.data.objects.remove(o, do_unlink=True)


def render_glb(glb_path, out_png, ortho_scale=2.2):
    """Importa un GLB de juego y renderiza vista 3/4 (misma cámara para before/after)."""
    clear_scene_meshes()
    sc = _eevee_scene()
    cam = _studio_cam(sc, ortho_scale)
    bpy.ops.import_scene.gltf(filepath=glb_path)
    cam.location = (1.5, -1.5, 0.5)
    cam.rotation_euler = (math.radians(75), 0, math.radians(45))
    os.makedirs(os.path.dirname(out_png), exist_ok=True)
    sc.render.filepath = out_png
    bpy.ops.render.render(write_still=True)
    print("OLEADA2_RENDER", out_png)


def render_scene_mesh(out_png, ortho_scale=1.05):
    """Renderiza la escena actual (malla + armature en reposo)."""
    sc = _eevee_scene()
    cam = _studio_cam(sc, ortho_scale)
    arm = next((o for o in bpy.data.objects if o.type == "ARMATURE"), None)
    if arm:
        bpy.context.view_layer.objects.active = arm
        arm.select_set(True)
        bpy.ops.object.mode_set(mode="POSE")
        for pb in arm.pose.bones:
            pb.rotation_mode = "QUATERNION"
            pb.rotation_quaternion = (1, 0, 0, 0)
            pb.location = (0, 0, 0)
        bpy.ops.object.mode_set(mode="OBJECT")
    cam.location = (1.5, -1.5, 0.5)
    cam.rotation_euler = (math.radians(75), 0, math.radians(45))
    os.makedirs(os.path.dirname(out_png), exist_ok=True)
    sc.render.filepath = out_png
    bpy.ops.render.render(write_still=True)
    print("OLEADA2_RENDER", out_png)


def export_bicho(rig_name, mesh_name, file_stem, folder):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import bicho as b

    ao = bpy.data.objects[rig_name]
    ob = bpy.data.objects[mesh_name]
    return b.export(ao, ob, file_stem, folder)


def tris(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)
