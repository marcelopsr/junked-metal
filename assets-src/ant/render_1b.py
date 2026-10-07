# Renders oleada 1b — ortográficos para revisar silueta.
# Uso: Blender -b ant.blend --python render_1b.py
# Requiere haber corrido export_clean.py (ant_clean.glb) o usa malla Ant + armature.
import bpy, os, math

base = os.path.dirname(bpy.data.filepath)
out_dir = os.path.join(base, "renders")
clean = os.path.join(base, "ant_clean.glb")
use_import = os.path.isfile(clean)
if use_import:
    for o in list(bpy.data.objects):
        if o.type in ("MESH", "ARMATURE"):
            bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.import_scene.gltf(filepath=clean)
os.makedirs(out_dir, exist_ok=True)

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 640
scene.render.resolution_y = 640
scene.render.film_transparent = True
world = scene.world
if world is None:
    world = bpy.data.worlds.new("World")
    scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
if bg:
    bg.inputs[0].default_value = (0.04, 0.05, 0.07, 1)
    bg.inputs[1].default_value = 0.35

cam_data = bpy.data.cameras.new("RenderCam")
cam = bpy.data.objects.new("RenderCam", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
cam.data.type = "ORTHO"
cam.data.ortho_scale = 1.05

light_data = bpy.data.lights.new("Key", "SUN")
light = bpy.data.objects.new("Key", light_data)
scene.collection.objects.link(light)
light.rotation_euler = (math.radians(55), 0, math.radians(35))
light.data.energy = 2.2

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

views = {
    "ant_frontal": (0, -2.2, 0.35, 90, 0, 0),
    "ant_lateral": (2.2, 0, 0.35, 90, 0, math.radians(90)),
    "ant_34": (1.5, -1.5, 0.5, 75, 0, math.radians(45)),
    "ant_attack": None,
}
if bpy.data.actions.get("attack") or bpy.data.actions.get("bite"):
    act = bpy.data.actions.get("attack") or bpy.data.actions.get("bite")
    if arm and arm.animation_data is None:
        arm.animation_data_create()
    if arm:
        arm.animation_data.action = act
        scene.frame_set(int((act.frame_range[0] + act.frame_range[1]) / 2))

for name, spec in views.items():
    if spec is None:
        continue
    cam.location = spec[:3]
    cam.rotation_euler = spec[3:6]
    scene.render.filepath = os.path.join(out_dir, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    print("RENDER", scene.render.filepath)

if arm and bpy.data.actions.get("attack"):
    arm.animation_data.action = bpy.data.actions["attack"]
    mid = int((bpy.data.actions["attack"].frame_range[0] + bpy.data.actions["attack"].frame_range[1]) / 2)
    scene.frame_set(mid)
    cam.location = (1.5, -1.5, 0.5)
    cam.rotation_euler = (75, 0, math.radians(45))
    scene.render.filepath = os.path.join(out_dir, "ant_attack.png")
    bpy.ops.render.render(write_still=True)
    print("RENDER", scene.render.filepath)
