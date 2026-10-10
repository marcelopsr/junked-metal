"""
build_lods.py — Generador de modelos LOD1 rig-safe para Junked Metal.
Genera versiones optimizadas de Frenchie, Eulalio y Buggy para combate masivo,
preservando la jerarquía de huesos, pesaje de vértices, UVs y todos los clips de animación.
"""
import os
import sys
import bpy

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PERF_DIR = os.path.abspath(os.path.dirname(__file__))

def build_frenchie_lod1():
    blend_path = os.path.join(BASE_DIR, "frenchie.blend")
    out_glb = os.path.join(PERF_DIR, "frenchie_lod1.glb")
    out_blend = os.path.join(PERF_DIR, "frenchie_lod1.blend")
    print(f"--- Construyendo Frenchie LOD1 desde {blend_path} ---")

    bpy.ops.wm.open_mainfile(filepath=blend_path)
    mesh_obj = bpy.data.objects.get("Perro")
    armature_obj = bpy.data.objects.get("PerroRig")
    if not mesh_obj or not armature_obj:
        raise ValueError("No se encontraron 'Perro' o 'PerroRig' en frenchie.blend")

    bpy.context.view_layer.objects.active = mesh_obj
    mesh_obj.select_set(True)

    # Añadir modificador Decimate antes del Armature
    mod = mesh_obj.modifiers.new(name="LOD1_Decimate", type='DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = 0.065  # ~1.870 caras (~3.740 tris)
    mod.use_symmetry = True
    mod.symmetry_axis = 'X'

    # Mover el modificador arriba del Armature para que decime antes de deformar
    bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0)
    # Aplicar modificador
    bpy.ops.object.modifier_apply(modifier=mod.name)

    tris = sum(len(p.vertices) - 2 for p in mesh_obj.data.polygons)
    print(f"Frenchie LOD1 triángulos: {tris}")

    # Guardar .blend
    bpy.ops.wm.save_as_mainfile(filepath=out_blend)

    # Exportar GLB con animación esquelética completa
    bpy.ops.export_scene.gltf(
        filepath=out_glb,
        export_format='GLB',
        use_selection=False,
        export_animations=True,
        export_anim_single_armature=True,
        export_skins=True,
        export_morph=False,
        export_materials='EXPORT',
        export_image_format='AUTO',
        export_yup=True
    )
    print(f"Frenchie LOD1 exportado: {out_glb} ({os.path.getsize(out_glb)} bytes)")

def build_eulalio_lod1():
    blend_path = os.path.join(BASE_DIR, "gemini-eulalio", "eulalio.blend")
    out_glb = os.path.join(PERF_DIR, "eulalio_lod1.glb")
    out_blend = os.path.join(PERF_DIR, "eulalio_lod1.blend")
    print(f"--- Construyendo Eulalio LOD1 desde {blend_path} ---")

    bpy.ops.wm.open_mainfile(filepath=blend_path)
    mesh_obj = bpy.data.objects.get("Gato")
    armature_obj = bpy.data.objects.get("GatoRig")
    if not mesh_obj or not armature_obj:
        raise ValueError("No se encontraron 'Gato' o 'GatoRig' en eulalio.blend")

    bpy.context.view_layer.objects.active = mesh_obj
    mesh_obj.select_set(True)

    # Añadir modificador Decimate antes del Armature
    mod = mesh_obj.modifiers.new(name="LOD1_Decimate", type='DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = 0.065  # ~1.900 caras (~3.800 tris)
    mod.use_symmetry = True
    mod.symmetry_axis = 'X'

    bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0)
    bpy.ops.object.modifier_apply(modifier=mod.name)

    tris = sum(len(p.vertices) - 2 for p in mesh_obj.data.polygons)
    print(f"Eulalio LOD1 triángulos: {tris}")

    bpy.ops.wm.save_as_mainfile(filepath=out_blend)

    bpy.ops.export_scene.gltf(
        filepath=out_glb,
        export_format='GLB',
        use_selection=False,
        export_animations=True,
        export_anim_single_armature=True,
        export_skins=True,
        export_morph=False,
        export_materials='EXPORT',
        export_image_format='AUTO',
        export_yup=True
    )
    print(f"Eulalio LOD1 exportado: {out_glb} ({os.path.getsize(out_glb)} bytes)")

def build_buggy_lod1():
    blend_path = os.path.join(BASE_DIR, "buggy.blend")
    out_glb = os.path.join(PERF_DIR, "buggy_lod1.glb")
    out_blend = os.path.join(PERF_DIR, "buggy_lod1.blend")
    print(f"--- Construyendo Buggy LOD1 desde {blend_path} ---")

    bpy.ops.wm.open_mainfile(filepath=blend_path)
    body = bpy.data.objects.get("BuggyBody")
    if not body:
        raise ValueError("No se encontró 'BuggyBody' en buggy.blend")

    # Decimate carrocería
    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    mod = body.modifiers.new(name="LOD1_Decimate", type='DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = 0.08  # ~2.160 caras (~4.300 tris)
    bpy.ops.object.modifier_apply(modifier=mod.name)

    # Decimate ruedas
    total_wheel_tris = 0
    for name in ["Wheel_-1_-0.9", "Wheel_-1_0.92", "Wheel_1_-0.9", "Wheel_1_0.92"]:
        wheel = bpy.data.objects.get(name)
        if wheel:
            bpy.context.view_layer.objects.active = wheel
            wmod = wheel.modifiers.new(name="LOD1_Decimate", type='DECIMATE')
            wmod.decimate_type = 'COLLAPSE'
            wmod.ratio = 0.08  # ~590 caras (~1.180 tris)
            bpy.ops.object.modifier_apply(modifier=wmod.name)
            total_wheel_tris += sum(len(p.vertices) - 2 for p in wheel.data.polygons)

    body_tris = sum(len(p.vertices) - 2 for p in body.data.polygons)
    print(f"Buggy LOD1 triángulos: Carrocería {body_tris} + Ruedas {total_wheel_tris} = {body_tris + total_wheel_tris}")

    bpy.ops.wm.save_as_mainfile(filepath=out_blend)

    bpy.ops.export_scene.gltf(
        filepath=out_glb,
        export_format='GLB',
        use_selection=False,
        export_animations=False,
        export_materials='EXPORT',
        export_image_format='AUTO',
        export_yup=True
    )
    print(f"Buggy LOD1 exportado: {out_glb} ({os.path.getsize(out_glb)} bytes)")

if __name__ == "__main__":
    build_frenchie_lod1()
    build_eulalio_lod1()
    build_buggy_lod1()
    print("=== Pipeline de generación de LOD1 completado con éxito ===")
