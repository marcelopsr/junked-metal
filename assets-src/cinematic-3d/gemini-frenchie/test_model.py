"""Test de modelado y verificación anatómica de las partes del Frenchie.
Blender -b --python assets-src/cinematic-3d/gemini-frenchie/test_model.py
"""
import bpy, bmesh, math
from mathutils import Vector, Matrix, Euler

# Crear una escena limpia
bpy.ops.wm.read_factory_settings(use_empty=True)

# 1. Función para crear oreja de murciélago anatómica
def create_bat_ear(bm, sign=1.0):
    # sign: +1 para ear_L, -1 para ear_R
    # La oreja se modela con forma de concha: ancha en la base, punta redondeada, cóncava al frente, reborde carnoso
    ear_verts = []
    rings = 7
    points_per_ring = 14
    
    # Alturas y anchos a lo largo del hueso de la oreja
    # base en Z=7.8, Y=5.0, X=sign*1.1
    # punta en Z=9.9, Y=4.8, X=sign*1.8
    base_pos = Vector((sign * 1.15, 5.15, 7.85))
    tip_pos = Vector((sign * 1.78, 4.85, 9.92))
    axis = (tip_pos - base_pos).normalized()
    up = Vector((0, 0, 1))
    fwd = Vector((0, 1, 0)) # mirando hacia adelante
    side = axis.cross(fwd).normalized()
    fwd = side.cross(axis).normalized()
    
    ring_mesh_verts = []
    for r in range(rings):
        t = r / (rings - 1)
        center = base_pos.lerp(tip_pos, t)
        
        # Perfil de la oreja a lo largo de su altura:
        # Base ancha, se abre un poco más a t=0.35, y se redondea hacia la punta
        if t < 0.35:
            width = 0.55 + 0.35 * (t / 0.35)
        else:
            width = 0.90 * math.sqrt(max(0.01, 1.0 - ((t - 0.35) / 0.65)**2))
        
        thickness = 0.12 * (1.0 - t * 0.4)
        concavity = 0.22 * math.sin(t * math.pi) # cóncava al frente
        
        verts_in_ring = []
        for p in range(points_per_ring):
            angle = 2.0 * math.pi * p / points_per_ring
            # Elipse aplastada en fwd, extendida en side
            # En la cara anterior (+fwd, angle de -pi/2 a pi/2), hundida hacia atrás (cóncava)
            cos_a = math.cos(angle)
            sin_a = math.sin(angle)
            
            # Offset lateral
            ox = cos_a * width
            # Offset adelante/atrás
            if sin_a > 0: # cara anterior (interior de la oreja)
                oy = sin_a * thickness - concavity * (1.0 - (cos_a**2))
            else: # cara posterior
                oy = sin_a * thickness
                
            pos = center + side * ox + fwd * oy
            v = bm.verts.new(pos)
            verts_in_ring.append(v)
        ring_mesh_verts.append(verts_in_ring)
        
    # Crear caras entre anillos
    for r in range(rings - 1):
        for p in range(points_per_ring):
            p_next = (p + 1) % points_per_ring
            v0 = ring_mesh_verts[r][p]
            v1 = ring_mesh_verts[r][p_next]
            v2 = ring_mesh_verts[r + 1][p_next]
            v3 = ring_mesh_verts[r + 1][p]
            bm.faces.new((v0, v1, v2, v3))
            
    # Tapa en la punta (redondeada)
    tip_v = bm.verts.new(tip_pos + axis * 0.08)
    for p in range(points_per_ring):
        p_next = (p + 1) % points_per_ring
        bm.faces.new((ring_mesh_verts[-1][p], ring_mesh_verts[-1][p_next], tip_v))
        
    return ring_mesh_verts

# 2. Función para crear pata delantera con 4 dedos y garras
def create_paw_with_claws(bm, center_foot, is_front=True, sign=1.0):
    # center_foot: Vector((sign * 1.67, 3.0, 0.25))
    toes = []
    claws = []
    
    # 4 dedos en arco
    toe_configs = [
        # (angle_offset, x_rel, y_rel, length, radius)
        (-0.35, -0.28, 0.12, 0.35, 0.16), # dedo interno
        (-0.12, -0.09, 0.32, 0.42, 0.18), # dedo medio 1 (más adelantado)
        (0.12, 0.11, 0.30, 0.40, 0.18),   # dedo medio 2
        (0.35, 0.28, 0.08, 0.32, 0.15),   # dedo externo
    ]
    
    for ang, xr, yr, t_len, t_rad in toe_configs:
        toe_base = center_foot + Vector((sign * xr, yr, -0.05))
        fwd_dir = Vector((sign * math.sin(ang), math.cos(ang), -0.08)).normalized()
        toe_tip = toe_base + fwd_dir * t_len
        
        # Crear falange/dedo (cápsula / cilindro con extremos esféricos)
        bmesh.ops.create_cone(
            bm, cap_ends=True, segments=10,
            radius1=t_rad, radius2=t_rad * 0.85, depth=t_len,
            matrix=Matrix.Translation((toe_base + toe_tip) * 0.5) @ fwd_dir.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        )
        bmesh.ops.create_uvsphere(
            bm, u_segments=10, v_segments=8, radius=t_rad * 0.85,
            matrix=Matrix.Translation(toe_tip)
        )
        
        # Garra: cono curvado hacia el suelo en la punta
        claw_base = toe_tip + fwd_dir * (t_rad * 0.5)
        claw_dir = (fwd_dir + Vector((0, 0, -0.6))).normalized()
        claw_tip = claw_base + claw_dir * 0.22
        bmesh.ops.create_cone(
            bm, cap_ends=True, segments=8,
            radius1=0.07, radius2=0.015, depth=0.22,
            matrix=Matrix.Translation((claw_base + claw_tip) * 0.5) @ claw_dir.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        )

bm = bmesh.new()
create_bat_ear(bm, sign=1.0)
create_bat_ear(bm, sign=-1.0)
create_paw_with_claws(bm, Vector((1.67, 3.0, 0.25)), is_front=True, sign=1.0)
create_paw_with_claws(bm, Vector((-1.67, 3.0, 0.25)), is_front=True, sign=-1.0)

me = bpy.data.meshes.new("TestFrenchieParts")
bm.to_mesh(me)
bm.free()

ob = bpy.data.objects.new("TestParts", me)
bpy.context.collection.objects.link(ob)

bpy.ops.wm.save_as_mainfile(filepath="assets-src/cinematic-3d/gemini-frenchie/test_parts.blend")
print("Saved test_parts.blend, verts:", len(me.vertices), "faces:", len(me.polygons))
