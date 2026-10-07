# Exporta escupidora.blend → escupidora_raw.glb + public/models/escupidora.glb (VAT, sin regenerar malla).
# Uso: Blender -b escupidora.blend --python export_blend.py
import bpy, os, subprocess

ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.data.filepath), "..", ".."))
folder = os.path.dirname(bpy.data.filepath)
ao = bpy.data.objects["EscupidoraRig"]
ob = bpy.data.objects["Escupidora"]

bpy.ops.object.select_all(action="DESELECT")
ao.select_set(True)
ob.select_set(True)
bpy.context.view_layer.objects.active = ao

raw = os.path.join(folder, "escupidora_raw.glb")
pub = os.path.join(ROOT, "public", "models", "escupidora.glb")
bpy.ops.export_scene.gltf(
    filepath=raw,
    export_format="GLB",
    use_selection=True,
    export_animations=True,
    export_animation_mode="ACTIONS",
    export_yup=True,
    export_all_influences=False,
    export_texcoords=False,
    export_materials="EXPORT",
    export_skins=True,
    export_force_sampling=False,
)
subprocess.run(
    [
        "npx",
        "gltf-transform",
        "optimize",
        raw,
        pub,
        "--compress",
        "quantize",
        "--simplify",
        "false",
        "--texture-compress",
        "false",
        "--palette",
        "false",
    ],
    cwd=ROOT,
    check=True,
)
tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
print("EXPORT", pub, "TRIS", tris, "BONES", len(ao.data.bones))
