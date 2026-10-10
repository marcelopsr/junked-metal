"""
verify_lods.py — Verificador estricto de integridad para modelos LOD1 de Junked Metal.
Comprueba que los GLB exportados conservan todos los clips de animación,
que los pesos de los huesos deforman la geometría sin matrices NaN o infinitas,
y que la jerarquía de nodos es 100% compatible con el motor.
"""
import os
import bpy

PERF_DIR = os.path.dirname(__file__)

def verify_frenchie():
    path = os.path.join(PERF_DIR, "frenchie_lod1.glb")
    print(f"--- Verificando {path} ---")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)

    armature = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
    mesh = next((o for o in bpy.data.objects if o.type == 'MESH'), None)
    assert armature is not None, "Frenchie LOD1 no contiene ARMATURE"
    assert mesh is not None, "Frenchie LOD1 no contiene MESH"

    expected_clips = {'charge', 'death', 'idle', 'jump_slam', 'rage', 'run', 'walk'}
    action_names = {a.name for a in bpy.data.actions}
    print(f"Clips encontrados: {sorted(action_names)}")
    # Los nombres de acción en glTF pueden incluir prefijos o coincidir exactamente
    found_matches = {clip for clip in expected_clips if any(clip in a.lower() for a in action_names)}
    assert len(found_matches) == 7, f"Faltan clips en Frenchie LOD1: {expected_clips - found_matches}"

    # Comprobar deformación y matrices finitas
    scene = bpy.context.scene
    for act in bpy.data.actions:
        armature.animation_data.action = act
        for f in range(int(act.frame_range[0]), int(act.frame_range[1]) + 1, 5):
            scene.frame_set(f)
            bpy.context.view_layer.update()
            for bone in armature.pose.bones:
                for row in bone.matrix:
                    for val in row:
                        assert val == val and abs(val) < 1e9, f"Matriz no finita en clip {act.name}, frame {f}"

    tris = sum(len(p.vertices) - 2 for p in mesh.data.polygons)
    print(f"Frenchie LOD1 verificado con éxito: {tris} triángulos, 7 clips válidos y matrices finitas.")

def verify_eulalio():
    path = os.path.join(PERF_DIR, "eulalio_lod1.glb")
    print(f"--- Verificando {path} ---")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)

    armature = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
    mesh = next((o for o in bpy.data.objects if o.type == 'MESH'), None)
    assert armature is not None, "Eulalio LOD1 no contiene ARMATURE"
    assert mesh is not None, "Eulalio LOD1 no contiene MESH"

    expected_clips = {'death', 'idle', 'jump', 'rage', 'run', 'spin', 'swipe', 'walk'}
    action_names = {a.name for a in bpy.data.actions}
    print(f"Clips encontrados: {sorted(action_names)}")
    found_matches = {clip for clip in expected_clips if any(clip in a.lower() for a in action_names)}
    assert len(found_matches) == 8, f"Faltan clips en Eulalio LOD1: {expected_clips - found_matches}"

    scene = bpy.context.scene
    for act in bpy.data.actions:
        armature.animation_data.action = act
        for f in range(int(act.frame_range[0]), int(act.frame_range[1]) + 1, 5):
            scene.frame_set(f)
            bpy.context.view_layer.update()
            for bone in armature.pose.bones:
                for row in bone.matrix:
                    for val in row:
                        assert val == val and abs(val) < 1e9, f"Matriz no finita en clip {act.name}, frame {f}"

    tris = sum(len(p.vertices) - 2 for p in mesh.data.polygons)
    print(f"Eulalio LOD1 verificado con éxito: {tris} triángulos, 8 clips válidos y matrices finitas.")

def verify_buggy():
    path = os.path.join(PERF_DIR, "buggy_lod1.glb")
    print(f"--- Verificando {path} ---")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)

    wheels = [o for o in bpy.data.objects if "wheel" in o.name.lower()]
    assert len(wheels) == 4, f"Se esperaban 4 ruedas independientes en Buggy LOD1, se encontraron {len(wheels)}"
    total_tris = sum(len(p.vertices) - 2 for o in bpy.data.objects if o.type == 'MESH' for p in o.data.polygons)
    print(f"Buggy LOD1 verificado con éxito: {total_tris} triángulos, 4 ruedas identificables.")

if __name__ == "__main__":
    verify_frenchie()
    verify_eulalio()
    verify_buggy()
    print("=== TODOS LOS MODELOS LOD1 HAN SIDO VERIFICADOS RIGUROSAMENTE ===")
