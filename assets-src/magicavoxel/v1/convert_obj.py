"""Convert a MagicaVoxel OBJ export to a Babylon-loadable GLB with Blender."""
import argparse
import sys
from pathlib import Path
import bpy

args = argparse.ArgumentParser()
args.add_argument('obj', type=Path)
args.add_argument('glb', type=Path)
options = args.parse_args(sys.argv[sys.argv.index('--') + 1:])

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.wm.obj_import(filepath=str(options.obj.resolve()))
objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
assert objects, f'No mesh imported from {options.obj}'
for obj in objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
options.glb.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(options.glb.resolve()), export_format='GLB', use_selection=True, export_yup=True, export_materials='EXPORT', export_texcoords=True)
print(f'{options.glb}: {sum(len(obj.data.polygons) for obj in objects)} faces, {options.glb.stat().st_size} bytes')
