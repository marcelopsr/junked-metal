# Piloto oleada 2: blockout low-poly auto juguete (no cableado al juego aún).
# Uso: Blender -b --python assets-src/friccion/blockout_oleada2.py
import bpy, os, math

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.unit_settings.system = "METRIC"

def mat(name, hex_, rough=0.4):
    m = bpy.data.materials.new(name)
    c = [int(hex_[i:i+2], 16)/255 for i in (1, 3, 5)]
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*c, 1)
    p.inputs["Roughness"].default_value = rough
    return m

orange = mat("Body", "#ff6b0a")
dark = mat("Chassis", "#0d0a08")
chrome = mat("Chrome", "#f0f4ff", 0.25)

# Chasis
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.08, 0))
ch = bpy.context.active_object
ch.scale = (0.72, 0.12, 1.55)
ch.data.materials.append(dark)

# Cabina (extruded profile simplificado)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.38, -0.05))
cab = bpy.context.active_object
cab.scale = (0.55, 0.32, 0.42)
cab.rotation_euler = (0, math.radians(-8), 0)
cab.data.materials.append(orange)

# Parabrisas
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.52, 0.02))
win = bpy.context.active_object
win.scale = (0.48, 0.08, 0.36)
win.data.materials.append(chrome)

for x in (-0.36, 0.36):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.22, depth=0.2, location=(x, 0.14, 0.92))
    w = bpy.context.active_object
    w.rotation_euler = (math.radians(90), 0, 0)
    w.data.materials.append(chrome)

folder = os.path.dirname(os.path.abspath(__file__))
os.makedirs(folder, exist_ok=True)
blend = os.path.join(folder, "friccion.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend)
print("FRICCION_BLOCKOUT", blend)
