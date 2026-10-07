# Renders oleada 2 escupidora — before/after
# Uso: Blender -b escupidora.blend --python render_oleada2.py -- phase=before|after
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
world = scene.world or bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
if bg:
    bg.inputs[0].default_value = (0.12, 0.14, 0.18, 1)
    bg.inputs[1].default_value = 0.45

cam = bpy.data.objects.new("Oleada2Cam", bpy.data.cameras.new("Oleada2Cam"))
cam.data.lens = 50
scene.collection.objects.link(cam)
scene.camera = cam
light = bpy.data.objects.new("Key", bpy.data.lights.new("Key", "SUN"))
light.data.energy = 2.8
light.rotation_euler = (math.radians(48), 0, math.radians(32))
scene.collection.objects.link(light)

ao = next((o for o in bpy.data.objects if o.type == "ARMATURE"), None)
target = (0, 0.42, 0.05)
dist = 2.4

shots = [
    ("34", None, 0, (2.4, 1.6, 2.8)),
    ("lateral", None, 0, (5.2, 0.6, 0)),
    ("game_15m", None, 0, (2.4, 1.6, 2.8)),
]
atk = bpy.data.actions.get("attack")
if atk:
    shots += [("attack_escupe", atk, 13, (5.2, 0.6, 0))]

T = __import__("mathutils").Vector((0, 0.42, 0.05))
for fname, act, frame, d in shots:
    if ao:
        ao.animation_data_clear()
        if act:
            ao.animation_data_create()
            ao.animation_data.action = act
            ao.data.pose_position = "POSE"
        else:
            ao.data.pose_position = "REST"
    scene.frame_set(int(frame))
    dd = __import__("mathutils").Vector((d[0], d[2], d[1])).normalized() * (15 if "game" in fname else dist)
    cam.location = T + dd
    cam.rotation_euler = (T - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = os.path.join(out_dir, f"escupidora_{fname}.png")
    bpy.ops.render.render(write_still=True)
    print("RENDER", scene.render.filepath)

ob = next((o for o in bpy.data.objects if o.type == "MESH"), None)
tris = sum(len(p.vertices) - 2 for p in ob.data.polygons) if ob else 0
print("OLEADA2_RENDER", phase, "tris", tris)
