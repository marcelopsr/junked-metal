"""Build script para el Bulldog Francés ("Frenchie") cinematográfico.
Genera la anatomía refinada, orejas de murciélago erguidas, cabeza cuadrada con arrugas,
belfos carnosos, trufa esculpida, ojos expresivos ámbar, pecho con pectorales y mancha marfil,
patas arqueadas con 4 dedos separados y garras, y cola en espiral.
Conserva los 7 clips de animación de PerroRig y exporta frenchie.glb y frenchie.blend.

Uso:
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/cinematic-3d/gemini-frenchie/build_frenchie.py
"""
import bpy, bmesh, math, sys, os, json
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion, Euler

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent

S = 1.08

def log(msg):
    print(f"[FRENCHIE_BUILD] {msg}")

log("Iniciando construcción del Bulldog Francés...")

# 1. Cargar archivo base con el rig y los 7 clips
base_blend = ROOT / "assets-src/perro/perro.blend"
bpy.ops.wm.open_mainfile(filepath=str(base_blend))

rig = bpy.data.objects.get("PerroRig")
base_perro = bpy.data.objects.get("Perro")

if not rig or not base_perro:
    raise RuntimeError("No se encontró PerroRig o Perro en perro.blend")

rig.data.pose_position = 'REST'
rig.animation_data.action = None
for pb in rig.pose.bones:
    pb.rotation_quaternion = (1, 0, 0, 0)
    pb.location = (0, 0, 0)
    pb.scale = (1, 1, 1)

actions_found = [a.name for a in bpy.data.actions]
log(f"Clips de animación encontrados ({len(actions_found)}): {actions_found}")

REQUIRED_CLIPS = ["charge", "death", "idle", "jump_slam", "rage", "run", "walk"]
for c in REQUIRED_CLIPS:
    if c not in actions_found:
        raise RuntimeError(f"Falta el clip requerido: {c}")

bpy.ops.object.select_all(action='DESELECT')
base_perro.select_set(True)
bpy.context.view_layer.objects.active = base_perro

# ---------------------------------------------------------
# A. COMPACTAR OREJAS EN Z EN MALLA Y RIG (BAT EARS)
# ---------------------------------------------------------
log("Ajustando proporciones de orejas de murciélago compactas...")
for v in base_perro.data.vertices:
    if v.co.z > 7.5 * S:
        v.co.z = 7.5 * S + (v.co.z - 7.5 * S) * 0.74

bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
for bone in rig.data.edit_bones:
    if bone.name.startswith('ear_'):
        for pt in (bone.head, bone.tail):
            if pt.z > 7.5 * S:
                pt.z = 7.5 * S + (pt.z - 7.5 * S) * 0.74
bpy.ops.object.mode_set(mode='OBJECT')

bpy.ops.object.select_all(action='DESELECT')
base_perro.select_set(True)
bpy.context.view_layer.objects.active = base_perro

# ---------------------------------------------------------
# B. ELIMINAR LOS OJOS PLANOS OBSOLETOS
# ---------------------------------------------------------
old_eye_idx = next((i for i, m in enumerate(base_perro.data.materials) if m.name == 'Eye'), None)

bm = bmesh.new()
bm.from_mesh(base_perro.data)

if old_eye_idx is not None:
    faces_to_del = [f for f in bm.faces if f.material_index == old_eye_idx]
    log(f"Eliminando {len(faces_to_del)} caras de ojos viejos para insertar ojos 3D anatómicos...")
    bmesh.ops.delete(bm, geom=faces_to_del, context='FACES')

dgroup_layer = bm.verts.layers.deform.verify()
vg_indices = {vg.name: vg.index for vg in base_perro.vertex_groups}

def set_weights(verts, weights_dict):
    for v in verts:
        d = v[dgroup_layer]
        d.clear()
        for bone_name, weight in weights_dict.items():
            if bone_name in vg_indices:
                d[vg_indices[bone_name]] = weight

# ---------------------------------------------------------
# C. CONFIGURACIÓN DE MATERIALES NATIVOS PBR
# ---------------------------------------------------------
log("Configurando materiales fuente para horneado PBR...")

def make_pbr_mat(name, color_hex, roughness=0.78, metallic=0.0):
    mat = bpy.data.materials.new(name)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    
    hex_clean = color_hex.lstrip('#')
    r = (int(hex_clean[0:2], 16) / 255.0)**2.2
    g = (int(hex_clean[2:4], 16) / 255.0)**2.2
    b = (int(hex_clean[4:6], 16) / 255.0)**2.2
    
    bsdf.inputs['Base Color'].default_value = (r, g, b, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

mat_coat = make_pbr_mat('Body', '#4e545c', roughness=0.78)        # Pelaje gris pizarra
mat_chest = make_pbr_mat('Chest', '#f5f1e8', roughness=0.85)      # Babero marfil
mat_nose = make_pbr_mat('Nose', '#141618', roughness=0.30)        # Trufa negra mate/satinada
mat_ear = make_pbr_mat('EarInner', '#c49694', roughness=0.65)     # Interior orejas rosado cálido
mat_sclera = make_pbr_mat('EyeSclera', '#e8e2d5', roughness=0.20)  # Esclerótica marfil
mat_iris = make_pbr_mat('EyeIris', '#c47820', roughness=0.08)     # Iris ámbar/miel dorado
mat_pupil = make_pbr_mat('EyePupil', '#050506', roughness=0.08)   # Pupila negra profunda
mat_claws = make_pbr_mat('Claws', '#202328', roughness=0.45)      # Garras oscuras

all_mats = [mat_coat, mat_chest, mat_nose, mat_ear, mat_sclera, mat_iris, mat_pupil, mat_claws]
base_perro.data.materials.clear()
for m in all_mats:
    base_perro.data.materials.append(m)

idx_coat = 0
idx_chest = 1
idx_nose = 2
idx_ear = 3
idx_sclera = 4
idx_iris = 5
idx_pupil = 6
idx_claws = 7

# ---------------------------------------------------------
# D. ESCULTURA Y REFINAMIENTO ANATÓMICO
# ---------------------------------------------------------
log("Esculpiendo proporciones anatómicas de Bulldog Francés...")

for v in bm.verts:
    p = v.co
    d = v[dgroup_layer]
    w_head = d.get(vg_indices['head'], 0)
    w_jaw = d.get(vg_indices['jaw'], 0)
    w_chest = d.get(vg_indices['chest'], 0)
    w_ear_l = d.get(vg_indices['ear_L'], 0)
    w_ear_r = d.get(vg_indices['ear_R'], 0)
    w_arm_l = d.get(vg_indices['arm_L'], 0)
    w_arm_r = d.get(vg_indices['arm_R'], 0)
    
    # 1. Cráneo ancho, stop nasal y arrugas frontales
    if w_head > 0.15:
        # Maseteros / mejillas musculosas
        if 5.0 < p.y < 7.0 and 5.0 < p.z < 7.2:
            sign = 1.0 if p.x >= 0 else -1.0
            ax = abs(p.x)
            if ax > 0.5:
                v.co.x += sign * 0.18 * w_head * min(1.0, (7.0 - p.y) / 1.0)
                
        # Stop nasal pronunciado (escalón a 90°)
        if 5.8 < p.z < 6.5 and 6.0 < p.y < 6.6 and abs(p.x) < 0.70:
            indent = (1.0 - (abs(p.x) / 0.70)**2) * 0.16 * w_head
            v.co.y -= indent * 0.85
            v.co.z -= indent * 0.45
            
        # Arrugas profundas en la frente sobre el stop
        if 6.3 < p.z < 7.2 and 5.7 < p.y < 6.7 and abs(p.x) < 0.85:
            wave = math.sin((p.z - 6.3) * 14.0) * 0.045
            lateral_mask = 1.0 - (abs(p.x) / 0.85)**2
            v.co.y += wave * lateral_mask * w_head

    # 2. Belfos carnosos caídos (flews)
    if (w_head > 0.15 or w_jaw > 0.15) and 5.7 < p.y:
        if 0.35 < abs(p.x) < 1.10 and 4.8 < p.z < 5.85:
            v.co.z -= 0.12 * max(w_head, w_jaw)
            sign = 1.0 if p.x >= 0 else -1.0
            v.co.x += sign * 0.09 * max(w_head, w_jaw)
            v.co.y += 0.08 * max(w_head, w_jaw)
            
    # 3. Pectorales prominentes y hendidura esternal
    if w_chest > 0.15:
        if 2.0 < p.z < 4.2 and 2.2 < p.y < 4.0 and abs(p.x) < 1.65:
            ax = abs(p.x)
            ax_norm = min(1.0, max(0.0, ax / 1.55))
            pectoral_profile = math.sin(ax_norm * math.pi)**1.4
            v.co.y += pectoral_profile * 0.28 * w_chest
            if ax < 0.28:
                v.co.y -= (1.0 - ax / 0.28) * 0.12 * w_chest
                
    # 4. Hombros musculosos y codos hacia afuera
    if (w_arm_l > 0.15 or w_arm_r > 0.15) and 1.8 < p.z < 3.8:
        sign = 1.0 if p.x >= 0 else -1.0
        v.co.x += sign * 0.08 * max(w_arm_l, w_arm_r)
        
    # 5. Orejas de murciélago erguidas (bat ears con contorno suave):
    w_ear = max(w_ear_l, w_ear_r)
    if w_ear > 0.20 and p.z > 6.8:
        sign = 1.0 if p.x >= 0 else -1.0
        # Alisar los bultos originales proyectando hacia una curva continua elíptica
        t_ear = max(0.0, min(1.0, (p.z - 6.8) / 2.0))
        target_x = sign * (1.10 + 0.58 * math.sin(t_ear * math.pi))
        v.co.x = v.co.x * 0.4 + target_x * 0.6
        
        # Cara frontal cóncava suave
        if p.y > 4.6:
            v.co.y -= 0.15 * math.sin(t_ear * math.pi)

# Delimitación orgánica del babero marfil en el pecho
for f in bm.faces:
    c = f.calc_center_median()
    n = f.normal
    ax = abs(c.x)
    if 1.85 < c.z < 4.65 and c.y > 2.0 and n.y > 0.12:
        t_z = (c.z - 3.25) / 1.4
        base_width = 0.92 * math.sqrt(max(0.01, 1.0 - min(0.99, t_z**2)))
        wiggle = 0.08 * math.sin(c.z * 14.0) * math.cos(c.x * 10.0)
        if ax < (base_width + wiggle):
            f.material_index = idx_chest
        elif f.material_index == idx_chest:
            f.material_index = idx_coat

# ---------------------------------------------------------
# E. COMPONENTES ANATÓMICOS DETALLADOS: DEDOS, GARRAS, TRUFA, OJOS
# ---------------------------------------------------------

# 1. 4 DEDOS SEPARADOS Y GARRAS EN CADA PATA (16 DEDOS Y 16 GARRAS)
log("Agregando 4 dedos carnosos y garras en cada pata...")

def add_paw_toes_claws(bm, foot_pos, bone_name, sign=1.0, is_front=True):
    toe_configs = [
        (-0.35, -0.28, 0.18, 0.42, 0.18),
        (-0.11, -0.09, 0.42, 0.50, 0.20),
        (0.11, 0.10, 0.40, 0.48, 0.20),
        (0.35, 0.28, 0.16, 0.40, 0.17),
    ]
    
    for ang, xr, yr, t_len, t_rad in toe_configs:
        toe_base = foot_pos + Vector((sign * xr, yr, 0.02))
        fwd_dir = Vector((sign * math.sin(ang), math.cos(ang), -0.05)).normalized()
        toe_tip = toe_base + fwd_dir * t_len
        
        cone = bmesh.ops.create_cone(
            bm, cap_ends=True, segments=8,
            radius1=t_rad, radius2=t_rad * 0.85, depth=t_len,
            matrix=Matrix.Translation((toe_base + toe_tip) * 0.5) @ fwd_dir.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        )
        sph = bmesh.ops.create_uvsphere(
            bm, u_segments=8, v_segments=6, radius=t_rad * 0.85,
            matrix=Matrix.Translation(toe_tip)
        )
        toe_verts = cone["verts"] + sph["verts"]
        set_weights(toe_verts, {bone_name: 1.0})
        for v in toe_verts:
            for f in v.link_faces:
                f.material_index = idx_coat
                f.smooth = True
                
        # Garra oscura curvada en la punta
        claw_base = toe_tip + fwd_dir * (t_rad * 0.40)
        claw_dir = (fwd_dir + Vector((0, 0, -0.70))).normalized()
        claw_tip = claw_base + claw_dir * 0.22
        claw = bmesh.ops.create_cone(
            bm, cap_ends=True, segments=6,
            radius1=0.075, radius2=0.015, depth=0.22,
            matrix=Matrix.Translation((claw_base + claw_tip) * 0.5) @ claw_dir.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        )
        set_weights(claw["verts"], {bone_name: 1.0})
        for v in claw["verts"]:
            for f in v.link_faces:
                f.material_index = idx_claws
                f.smooth = True

add_paw_toes_claws(bm, Vector((1.67, 3.10, 0.16)), "fpaw_L", sign=1.0, is_front=True)
add_paw_toes_claws(bm, Vector((-1.67, 3.10, 0.16)), "fpaw_R", sign=-1.0, is_front=True)
add_paw_toes_claws(bm, Vector((1.56, -2.55, 0.16)), "hpaw_L", sign=1.0, is_front=False)
add_paw_toes_claws(bm, Vector((-1.56, -2.55, 0.16)), "hpaw_R", sign=-1.0, is_front=False)

# 2. TRUFA (NARIZ) ANATÓMICA
log("Agregando trufa negra anatómica con narinas...")
nose_center = Vector((0, 6.96, 6.22))
for sign in (-1.0, 1.0):
    wing = bmesh.ops.create_uvsphere(
        bm, u_segments=14, v_segments=10, radius=0.25,
        matrix=Matrix.Translation(nose_center + Vector((sign * 0.17, 0.02, 0.0))) @ Matrix.Diagonal((1.15, 0.85, 0.95, 1.0))
    )
    for v in wing["verts"]:
        dx = abs(v.co.x - sign * 0.14)
        dz = abs(v.co.z - 6.20)
        dist = math.sqrt(dx * dx + dz * dz)
        if dist < 0.09 and v.co.y > 6.96:
            indent = (1.0 - dist / 0.09) * 0.11
            v.co.y -= indent
            v.co.z -= indent * 0.25
    set_weights(wing["verts"], {'head': 1.0})
    for v in wing["verts"]:
        for f in v.link_faces:
            f.material_index = idx_nose
            f.smooth = True

septum = bmesh.ops.create_cone(
    bm, cap_ends=True, segments=10,
    radius1=0.10, radius2=0.06, depth=0.28,
    matrix=Matrix.Translation(nose_center + Vector((0, 0.02, -0.06)))
)
set_weights(septum["verts"], {'head': 1.0})
for v in septum["verts"]:
    for f in v.link_faces:
        f.material_index = idx_nose
        f.smooth = True

# 3. OJOS VISIBLES CON ESCLERÓTICA, IRIS ÁMBAR Y PUPILA
log("Agregando ojos expresivos ámbar/miel con ceño bulldog...")
for sign in (-1.0, 1.0):
    eye_pos = Vector((sign * 1.00, 6.54, 6.22))
    # Mirada frontal (+Y) penetrante con ligera convergencia
    eye_look_dir = Vector((sign * 0.04, 0.98, 0.05)).normalized()
    rot_quat = Vector((0, 0, 1)).rotation_difference(eye_look_dir)
    full_mat = Matrix.Translation(eye_pos) @ rot_quat.to_matrix().to_4x4() @ Matrix.Diagonal((1.0, 1.0, 0.85, 1.0))
    
    eye = bmesh.ops.create_uvsphere(
        bm, u_segments=24, v_segments=16, radius=0.38,
        matrix=full_mat
    )
    set_weights(eye["verts"], {'head': 1.0})
    
    # Curvatura corneal / abultamiento hacia adelante
    for v in eye["verts"]:
        dir_v = (v.co - eye_pos).normalized()
        cos_v = dir_v.dot(eye_look_dir)
        if cos_v > 0.65:
            bulge = 0.045 * ((cos_v - 0.65) / 0.35)**1.2
            v.co += eye_look_dir * bulge
            
    # Asignación precisa de materiales por anillos concéntricos
    eye_verts_set = set(eye["verts"])
    for v in eye["verts"]:
        for f in v.link_faces:
            if not all(fv in eye_verts_set for fv in f.verts):
                continue
            c = f.calc_center_median()
            dir_c = (c - eye_pos).normalized()
            cos_c = dir_c.dot(eye_look_dir)
            if cos_c > 0.92:
                f.material_index = idx_pupil
            elif cos_c > 0.68:
                f.material_index = idx_iris
            else:
                f.material_index = idx_sclera
            f.smooth = True
            
    # Párpado superior caído (hooded eye en Z arriba para ceño severo)
    hood_pos = eye_pos + Vector((sign * 0.02, 0.04, 0.23))
    hood = bmesh.ops.create_uvsphere(
        bm, u_segments=12, v_segments=8, radius=0.33,
        matrix=Matrix.Translation(hood_pos) @ Matrix.Diagonal((1.15, 0.65, 0.45, 1.0))
    )
    set_weights(hood["verts"], {'head': 1.0})
    hood_verts_set = set(hood["verts"])
    for v in hood["verts"]:
        for f in v.link_faces:
            if all(fv in hood_verts_set for fv in f.verts):
                f.material_index = idx_coat
                f.smooth = True

# 4. COLITA EN ESPIRAL / MUÑÓN
log("Agregando colita en espiral...")
tail_center = Vector((0, -4.30, 4.35))
t1 = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=0.28, matrix=Matrix.Translation(tail_center))
t2 = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=0.20, matrix=Matrix.Translation(tail_center + Vector((0.08, -0.22, 0.08))))
t3 = bmesh.ops.create_uvsphere(bm, u_segments=6, v_segments=4, radius=0.13, matrix=Matrix.Translation(tail_center + Vector((-0.04, -0.36, 0.14))))
tail_verts = t1["verts"] + t2["verts"] + t3["verts"]
set_weights(tail_verts, {'tail': 1.0})
for v in tail_verts:
    for f in v.link_faces:
        f.material_index = idx_coat
        f.smooth = True

# Volcar bmesh a la malla
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(base_perro.data)
bm.free()

log(f"Malla base con partes completada: {len(base_perro.data.vertices)} vértices, {len(base_perro.data.polygons)} caras.")

# ---------------------------------------------------------
# F. SUAVIZADO CINEMATOGRÁFICO SUBSURF
# ---------------------------------------------------------
log("Aplicando suavizado cinematográfico...")
sub_mod = base_perro.modifiers.new("Subsurf", "SUBSURF")
sub_mod.levels = 1
sub_mod.render_levels = 1
bpy.ops.object.modifier_move_up(modifier=sub_mod.name)
bpy.ops.object.modifier_apply(modifier=sub_mod.name)

for p in base_perro.data.polygons:
    p.use_smooth = True

log(f"Malla tras Subsurf: {len(base_perro.data.vertices)} vértices, {len(base_perro.data.polygons)} caras.")

# ---------------------------------------------------------
# G. DESPLEGADO UV
# ---------------------------------------------------------
log("Desplegando UVs...")
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.015)
bpy.ops.object.mode_set(mode='OBJECT')

# ---------------------------------------------------------
# H. HORNEADO PBR CON CYCLES
# ---------------------------------------------------------
log("Configurando horneado PBR con Cycles...")
TEX_SIZE = 1024
img_albedo = bpy.data.images.new("frenchie-albedo", width=TEX_SIZE, height=TEX_SIZE, alpha=False)
img_normal = bpy.data.images.new("frenchie-normal", width=TEX_SIZE, height=TEX_SIZE, alpha=False)
img_normal.colorspace_settings.name = 'Non-Color'
img_orm = bpy.data.images.new("frenchie-orm", width=TEX_SIZE, height=TEX_SIZE, alpha=False)
img_orm.colorspace_settings.name = 'Non-Color'

for mat in base_perro.data.materials:
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs['Scale'].default_value = 85.0
    noise.inputs['Detail'].default_value = 2.0
    bump = nodes.new("ShaderNodeBump")
    bump.inputs['Strength'].default_value = 0.22
    bump.inputs['Distance'].default_value = 0.012
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])

bpy.context.scene.render.engine = 'CYCLES'
bpy.context.scene.cycles.samples = 8
bpy.context.scene.render.bake.margin = 6

try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = (d.type == 'METAL')
    bpy.context.scene.cycles.device = 'GPU'
    log("Cycles: GPU Metal activa.")
except Exception:
    pass

images_dict = {'albedo': img_albedo, 'normal': img_normal, 'orm': img_orm}

for kind in ('albedo', 'normal', 'orm'):
    log(f"Horneando mapa '{kind}'...")
    image = images_dict[kind]
    restored = []
    
    for mat in base_perro.data.materials:
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        bsdf = nodes.get("Principled BSDF")
        out = nodes.get("Material Output")
        
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = image
        nodes.active = tex
        
        if kind != 'normal':
            emit = nodes.new("ShaderNodeEmission")
            if kind == 'albedo':
                col = bsdf.inputs['Base Color'].default_value
                emit.inputs['Color'].default_value = col
            else:
                rough = bsdf.inputs['Roughness'].default_value
                metal = bsdf.inputs['Metallic'].default_value
                emit.inputs['Color'].default_value = (1.0, rough, metal, 1.0)
            links.new(emit.outputs['Emission'], out.inputs['Surface'])
            restored.append((mat, emit))
            
    bpy.ops.object.bake(type='NORMAL' if kind == 'normal' else 'EMIT')
    
    for mat, emit in restored:
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        bsdf = nodes.get("Principled BSDF")
        out = nodes.get("Material Output")
        links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
        nodes.remove(emit)
        
    image.filepath_raw = str(HERE / f"frenchie-{kind}.png")
    image.file_format = 'PNG'
    image.save()
    log(f"frenchie-{kind}.png guardado.")

# ---------------------------------------------------------
# I. MATERIAL PBR UNIFICADO 'FrenchieCoat'
# ---------------------------------------------------------
log("Configurando material final unificado 'FrenchieCoat'...")
mat_final = bpy.data.materials.new("FrenchieCoat")
nodes = mat_final.node_tree.nodes
links = mat_final.node_tree.links
nodes.clear()

out = nodes.new("ShaderNodeOutputMaterial")
bsdf = nodes.new("ShaderNodeBsdfPrincipled")
links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])

# Albedo
t_alb = nodes.new("ShaderNodeTexImage")
t_alb.image = img_albedo
links.new(t_alb.outputs['Color'], bsdf.inputs['Base Color'])

# Normal
t_nor = nodes.new("ShaderNodeTexImage")
t_nor.image = img_normal
n_map = nodes.new("ShaderNodeNormalMap")
links.new(t_nor.outputs['Color'], n_map.inputs['Color'])
links.new(n_map.outputs['Normal'], bsdf.inputs['Normal'])

# ORM
t_orm = nodes.new("ShaderNodeTexImage")
t_orm.image = img_orm
sep_col = nodes.new("ShaderNodeSeparateColor")
links.new(t_orm.outputs['Color'], sep_col.inputs['Color'])
links.new(sep_col.outputs['Green'], bsdf.inputs['Roughness'])
links.new(sep_col.outputs['Blue'], bsdf.inputs['Metallic'])

base_perro.data.materials.clear()
base_perro.data.materials.append(mat_final)
for f in base_perro.data.polygons:
    f.material_index = 0
    f.use_smooth = True

# ---------------------------------------------------------
# J. NORMALIZACIÓN DE PESOS DEL ARMATURE Y VERIFICACIÓN
# ---------------------------------------------------------
log("Limpiando y normalizando pesos del armature...")
vg_by_index = {vg.index: vg for vg in base_perro.vertex_groups}

for v in base_perro.data.vertices:
    valid_weights = [(g.group, g.weight) for g in v.groups if g.group in vg_by_index and g.weight > 0.001]
    sorted_weights = sorted(valid_weights, key=lambda item: item[1], reverse=True)
    top_4 = sorted_weights[:4]
    tot_weight = sum(item[1] for item in top_4)
    
    for g_idx, _ in valid_weights:
        vg_by_index[g_idx].remove([v.index])
        
    if tot_weight > 1e-5:
        for g_idx, w in top_4:
            vg_by_index[g_idx].add([v.index], w / tot_weight, 'REPLACE')
    else:
        fallback = 'head' if v.co.z > 5.5 else ('chest' if v.co.z > 2.0 else 'hips')
        base_perro.vertex_groups[fallback].add([v.index], 1.0, 'REPLACE')

rig.data.pose_position = 'POSE'

# ---------------------------------------------------------
# K. EMPAQUETAR TEXTURAS Y GUARDAR .BLEND
# ---------------------------------------------------------
log("Empaquetando texturas y guardando frenchie.blend...")
for img in bpy.data.images:
    if img.source == 'FILE' and img.has_data:
        img.pack()
bpy.ops.file.pack_all()

blend_out = HERE / "frenchie.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(blend_out))
log(f"frenchie.blend guardado ({blend_out.stat().st_size} bytes).")

# ---------------------------------------------------------
# L. EXPORTAR FRENCHIE.GLB CON LOS 7 CLIPS
# ---------------------------------------------------------
log("Exportando frenchie.glb con animaciones...")
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
base_perro.select_set(True)
bpy.context.view_layer.objects.active = rig

glb_out = HERE / "frenchie.glb"
bpy.ops.export_scene.gltf(
    filepath=str(glb_out),
    export_format='GLB',
    use_selection=True,
    export_yup=True,
    export_animations=True,
    export_animation_mode='ACTIONS',
    export_force_sampling=False,
    export_texcoords=True,
    export_materials='EXPORT',
    export_skins=True
)

glb_size = glb_out.stat().st_size
tri_count = sum(len(p.vertices) - 2 for p in base_perro.data.polygons)
log(f"frenchie.glb exportado con éxito: {tri_count} triángulos, {glb_size} bytes.")

report = {
    "triangles": tri_count,
    "bytes": glb_size,
    "clips": actions_found,
    "animations_verified": True
}
(HERE / "build-report.json").write_text(json.dumps(report, indent=2) + "\n")
log(f"REPORTE: {json.dumps(report)}")

# ---------------------------------------------------------
# M. GENERAR RENDERS DE VERIFICACIÓN (4 PLANOS)
# ---------------------------------------------------------
log("Generando renders de verificación cinematográficos...")
cd = bpy.data.cameras.new('RenderCam')
cam = bpy.data.objects.new('RenderCam', cd)
bpy.context.collection.objects.link(cam)
bpy.context.scene.camera = cam

# Key sun (cálido lateral)
l_sun = bpy.data.lights.new('KeySun', 'SUN')
l_sun.energy = 3.5
l_sun.color = (1.0, 0.90, 0.75)
lo_sun = bpy.data.objects.new('KeySun', l_sun)
bpy.context.collection.objects.link(lo_sun)
lo_sun.rotation_euler = (math.radians(35), math.radians(20), math.radians(35))

# Fill sun (frontal suave para ver rostro, ojos y babero)
l_fill = bpy.data.lights.new('FillSun', 'SUN')
l_fill.energy = 2.2
l_fill.color = (0.92, 0.94, 1.0)
lo_fill = bpy.data.objects.new('FillSun', l_fill)
bpy.context.collection.objects.link(lo_fill)
lo_fill.rotation_euler = (math.radians(10), math.radians(-10), math.radians(10))

# Rim sun (cian/frío de recorte)
l_rim = bpy.data.lights.new('RimSun', 'SUN')
l_rim.energy = 2.8
l_rim.color = (0.65, 0.82, 1.0)
lo_rim = bpy.data.objects.new('RimSun', l_rim)
bpy.context.collection.objects.link(lo_rim)
lo_rim.rotation_euler = (math.radians(-25), math.radians(-40), math.radians(-120))

world = bpy.data.worlds.new('World')
bpy.context.scene.world = world
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.05, 0.06, 0.08, 1.0)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.5

bpy.context.scene.render.engine = 'BLENDER_EEVEE'
bpy.context.scene.render.resolution_x = 768
bpy.context.scene.render.resolution_y = 768

shots = [
    ('frenchie_front.png', Vector((0, 18, 5.2)), Vector((0, 4.0, 5.0))),
    ('frenchie_three_quarter.png', Vector((-11, 15, 5.8)), Vector((0, 3.5, 4.8))),
    ('frenchie_head_close.png', Vector((0, 11, 6.2)), Vector((0, 5.8, 6.2))),
    ('frenchie_paws.png', Vector((0, 9, 1.8)), Vector((0, 2.5, 0.4))),
]

for filename, cam_pos, target in shots:
    cam.location = cam_pos
    dir_vec = (target - cam_pos).normalized()
    cam.rotation_euler = dir_vec.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.render.filepath = str(HERE / filename)
    bpy.ops.render.render(write_still=True)
    log(f"Render guardado: {filename}")

print("BUILD_FRENCHIE_COMPLETE")
