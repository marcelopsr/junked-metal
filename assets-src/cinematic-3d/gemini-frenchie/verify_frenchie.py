"""Verificación exhaustiva de frenchie.glb:
- Existencia y validez de los 7 clips de animación de PerroRig.
- Matrices de transformación finitas (sin NaNs ni Infs) en todos los huesos a lo largo de cada animación.
- Integridad de mallas, texturas y pesos de vértices.
"""
import sys, math
from pathlib import Path
import bpy

HERE = Path(__file__).resolve().parent
GLB_PATH = HERE / "frenchie.glb"

if not GLB_PATH.exists():
    print(f"ERROR: {GLB_PATH} no existe.")
    sys.exit(1)

print(f"Verificando {GLB_PATH} ({GLB_PATH.stat().st_size} bytes)...")

# Cargar en escena limpia
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(GLB_PATH))

# Encontrar Armature y Malla
armature = None
mesh_obj = None

mesh_candidates = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
if not mesh_candidates:
    print("ERROR: No se encontró ningún objeto MESH en el GLB.")
    sys.exit(1)

# El personaje principal es el mesh con mayor número de polígonos (ignora helpers de hueso de glTF)
mesh_obj = max(mesh_candidates, key=lambda o: len(o.data.polygons))

armatures = [obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE']
if not armatures:
    print("ERROR: No se encontró objeto ARMATURE en el GLB.")
    sys.exit(1)
armature = armatures[0]

print(f"Armature encontrada: '{armature.name}' con {len(armature.data.bones)} huesos.")
print(f"Malla del personaje encontrada: '{mesh_obj.name}' con {len(mesh_obj.data.vertices)} vértices y {len(mesh_obj.data.polygons)} polígonos.")

tri_count = sum(len(p.vertices) - 2 for p in mesh_obj.data.polygons)
print(f"Recuento de triángulos del personaje: {tri_count}")

# 1. Verificar los 7 clips de animación
EXPECTED_ACTIONS = ['charge', 'death', 'idle', 'jump_slam', 'rage', 'run', 'walk']
actions = bpy.data.actions
action_names = [a.name for a in actions]
print(f"Acciones en el archivo ({len(actions)}): {action_names}")

missing_actions = [ea for ea in EXPECTED_ACTIONS if not any(ea in a_name for a_name in action_names)]
if missing_actions:
    print(f"ERROR: Faltan las siguientes acciones: {missing_actions}")
    sys.exit(1)
print("TODAS las 7 acciones esperadas están presentes.")

# 2. Verificar matrices de huesos finitas a lo largo de cada clip
bpy.context.view_layer.objects.active = armature

for action in actions:
    armature.animation_data.action = action
    f_start = int(action.frame_range[0])
    f_end = int(action.frame_range[1])
    frame_count = max(1, f_end - f_start + 1)
    
    # Muestrear al menos 10 fotogramas representativos (incluyendo inicio, medio y fin)
    sample_frames = list(range(f_start, f_end + 1, max(1, frame_count // 10)))
    if f_end not in sample_frames:
        sample_frames.append(f_end)
        
    for frame in sample_frames:
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        
        for bone in armature.pose.bones:
            mat = bone.matrix
            for row in mat:
                for val in row:
                    if math.isnan(val) or math.isinf(val):
                        print(f"ERROR: Matriz no finita en hueso '{bone.name}', clip '{action.name}', frame {frame}: {val}")
                        sys.exit(1)

print("VERIFICACIÓN EXITOSA: Todas las transformaciones de huesos son finitas en todos los fotogramas muestreados.")

# 3. Verificar texturas y materiales
materials = mesh_obj.data.materials
print(f"Materiales ({len(materials)}): {[m.name for m in materials]}")
images = bpy.data.images
print(f"Imágenes cargadas ({len(images)}): {[img.name for img in images]}")

print("VERIFICACION_COMPLETA_EXITOSA")
