import bpy
for o in bpy.data.objects:
    tris = sum(len(p.vertices)-2 for p in o.data.polygons) if o.type=='MESH' else 0
    print("OBJ", o.name, o.type, "tris", tris, "mods", [m.type for m in o.modifiers], "parent", o.parent.name if o.parent else None)
    if o.type=='ARMATURE': print("  bones", len(o.data.bones))
for a in bpy.data.actions:
    print("ACTION", a.name, "frames", tuple(a.frame_range))
for m in bpy.data.materials: print("MAT", m.name)
