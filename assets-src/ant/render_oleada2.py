# Renders oleada 2 — before/after en renders/oleada2_before|after/
# Uso: Blender -b ant.blend --python render_oleada2.py -- phase=before|after
import bpy, os, math, sys

phase = "after"
for i, a in enumerate(sys.argv):
    if a == "--" and i + 1 < len(sys.argv):
        for tok in sys.argv[i + 1 :]:
            if tok.startswith("phase="):
                phase = tok.split("=", 1)[1]
        break

base = os.path.dirname(bpy.data.filepath)
out_dir = os.path.join(base, "renders", f"oleada2_{phase}")
os.makedirs(out_dir, exist_ok=True)

scene = bpy.context.scene
try:
    scene.render.engine = "BLENDER_EEVEE"
except TypeError:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 800
scene.render.resolution_y = 600
scene.render.film_transparent = False
world = scene.world or bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
if bg:
    bg.inputs[0].default_value = (0.12, 0.14, 0.18, 1)
    bg.inputs[1].default_value = 0.45

cam_data = bpy.data.cameras.new("Oleada2Cam")
cam = bpy.data.objects.new("Oleada2Cam", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
cam.data.lens = 50

light_data = bpy.data.lights.new("Key", "SUN")
light = bpy.data.objects.new("Key", light_data)
scene.collection.objects.link(light)
light.rotation_euler = (math.radians(48), 0, math.radians(32))
light.data.energy = 2.8

arm = next((o for o in bpy.data.objects if o.type == "ARMATURE"), None)
if arm:
    bpy.context.view_layer.objects.active = arm
    for pb in arm.pose.bones:
        pb.rotation_mode = "QUATERNION"

views = {
    "34": (1.55, -1.55, 0.48, 72, 0, math.radians(42)),
    "lateral": (2.35, 0, 0.38, 90, 0, math.radians(90)),
    "frontal": (0, -2.1, 0.38, 90, 0, 0),
}

for name, spec in views.items():
    cam.location = spec[:3]
    cam.rotation_euler = spec[3:6]
    if arm:
        arm.animation_data_clear()
        for pb in arm.pose.bones:
            pb.rotation_quaternion = (1, 0, 0, 0)
            pb.location = (0, 0, 0)
    scene.frame_set(1)
    scene.render.filepath = os.path.join(out_dir, f"ant_{name}.png")
    bpy.ops.render.render(write_still=True)
    print("RENDER", scene.render.filepath)

if arm:
    act = bpy.data.actions.get("attack") or bpy.data.actions.get("bite")
    if act:
        if arm.animation_data is None:
            arm.animation_data_create()
        arm.animation_data.action = act
        mid = int((act.frame_range[0] + act.frame_range[1]) / 2)
        scene.frame_set(mid)
        cam.location = (1.55, -1.55, 0.48)
        cam.rotation_euler = (72, 0, math.radians(42))
        scene.render.filepath = os.path.join(out_dir, "ant_attack.png")
        bpy.ops.render.render(write_still=True)
        print("RENDER", scene.render.filepath)

tris = sum(len(p.vertices) - 2 for o in bpy.data.objects if o.type == "MESH" for p in o.data.polygons)
print("OLEADA2_RENDER", phase, "tris", tris, "dir", out_dir)
