# Piloto oleada 2: blockout cuerpo de lata / wind-up (referencia para superar models.ts).
# Uso: Blender -b --python assets-src/robot/blockout_oleada2.py
import bpy, os, math

bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, hex_, metal=0.0, rough=0.45):
    m = bpy.data.materials.new(name)
    c = [int(hex_[i:i+2], 16)/255 for i in (1, 3, 5)]
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*c, 1)
    p.inputs["Metallic"].default_value = metal
    p.inputs["Roughness"].default_value = rough
    return m

tin = mat("Tin", "#ff3b30", 0.85, 0.35)
joint = mat("Joint", "#b8c0cc", 0.9, 0.3)
lamp = mat("Lamp", "#ffe566", 0, 0.2)
lamp.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 3

# Torso cilíndrico
bpy.ops.mesh.primitive_cylinder_add(radius=0.52, depth=0.72, location=(0, 0.68, 0))
body = bpy.context.active_object
body.data.materials.append(tin)

# Cabeza esfera + visor
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.38, location=(0, 1.48, 0.02))
head = bpy.context.active_object
head.scale = (1, 0.85, 1)
head.data.materials.append(tin)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 1.32, 0.24))
visor = bpy.context.active_object
visor.scale = (0.52, 0.08, 0.06)
visor.data.materials.append(joint)

for sx in (-1, 1):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=0.35, location=(sx * 0.48, 0.78, 0.12))
    arm = bpy.context.active_object
    arm.rotation_euler = (0, 0, sx * -0.7)
    arm.data.materials.append(joint)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.08, location=(sx * 0.62, 0.95, 0.2))
    bulb = bpy.context.active_object
    bulb.data.materials.append(lamp)

folder = os.path.dirname(os.path.abspath(__file__))
os.makedirs(folder, exist_ok=True)
blend = os.path.join(folder, "robot.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend)
print("ROBOT_BLOCKOUT", blend)
