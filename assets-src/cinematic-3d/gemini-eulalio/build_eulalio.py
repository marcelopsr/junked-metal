"""Build script para Eulalio cinematográfico (Junked Metal).
Reconstruye y refina la anatomía, pelaje abundante, mejillas esponjosas, orejas con tufts,
ojos almendrados con actitud aburrida/condescendiente ("bored cat"), hocico crema,
nariz rosada esculpida con narinas, bigotes estilizados, babero pectoral prominente en capas,
patas firmes con calcetines blancos, 4 dedos definidos por pata con garras y almohadillas,
y cola gruesa y esponjosa atigrada con anillos.

Conserva intactos los 8 clips de animación de GatoRig:
['death', 'idle', 'jump', 'rage', 'run', 'spin', 'swipe', 'walk'].
Exporta eulalio.glb y eulalio.blend con texturas PBR completas (albedo, normal, orm).

Uso:
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/cinematic-3d/gemini-eulalio/build_eulalio.py
"""
import bpy, bmesh, math, sys, os, json, time
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion, Euler

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent

def log(msg):
    print(f"[EULALIO_BUILD] {msg}")

log("Iniciando construcción cinematográfica de Eulalio...")

# 1. Cargar archivo base con el rig y las 8 animaciones
base_blend = ROOT / "assets-src/gato/gato.blend"
bpy.ops.wm.open_mainfile(filepath=str(base_blend))

rig = bpy.data.objects.get("GatoRig")
gato = bpy.data.objects.get("Gato")

if not rig or not gato:
    raise RuntimeError("No se encontró GatoRig o Gato en gato.blend")

rig.data.pose_position = 'REST'
rig.animation_data.action = None
for pb in rig.pose.bones:
    pb.rotation_quaternion = (1, 0, 0, 0)
    pb.location = (0, 0, 0)
    pb.scale = (1, 1, 1)

actions_found = [a.name for a in bpy.data.actions]
log(f"Clips de animación encontrados ({len(actions_found)}): {actions_found}")

REQUIRED_CLIPS = ['death', 'idle', 'jump', 'rage', 'run', 'spin', 'swipe', 'walk']
for c in REQUIRED_CLIPS:
    if c not in actions_found:
        raise RuntimeError(f"Falta el clip requerido: {c}")

# 2. Configurar bmesh y eliminar ojos antiguos obsoletos
bm = bmesh.new()
bm.from_mesh(gato.data)

old_eye_mats = [i for i, m in enumerate(gato.data.materials) if m.name in ('Eye', 'Pupil', 'Nose')]
faces_to_del = [f for f in bm.faces if f.material_index in old_eye_mats]
log(f"Eliminando {len(faces_to_del)} caras viejas de ojos y nariz para escultura de alta fidelidad...")
bmesh.ops.delete(bm, geom=faces_to_del, context='FACES')

dgroup_layer = bm.verts.layers.deform.verify()
vg_indices = {vg.name: vg.index for vg in gato.vertex_groups}

def set_weights(verts, weights_dict):
    for v in verts:
        d = v[dgroup_layer]
        d.clear()
        for bone_name, weight in weights_dict.items():
            if bone_name in vg_indices:
                d[vg_indices[bone_name]] = weight

# 3. Materiales fuente PBR de alta fidelidad para horneado
log("Configurando paleta de materiales PBR de Eulalio...")
def make_pbr_source_mat(name, color_hex, roughness=0.82, metallic=0.0):
    mat = bpy.data.materials.new(name)
    nodes = mat.node_tree.nodes
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
    mat.node_tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

source_mats = {
    'body': make_pbr_source_mat('Body', '#ea6c18', roughness=0.82),       # Warm ginger tabby base
    'stripe': make_pbr_source_mat('Stripe', '#822808', roughness=0.82),   # Dark reddish-orange tabby stripes
    'bib': make_pbr_source_mat('Bib', '#faf1e3', roughness=0.82),         # Cream bib, throat & muzzle
    'ear_in': make_pbr_source_mat('EarIn', '#f29b93', roughness=0.65),    # Salmon pink inner ear cavity
    'nose': make_pbr_source_mat('Nose', '#e85b7a', roughness=0.35),       # Satin pink nose
    'nostril': make_pbr_source_mat('Nostril', '#38121a', roughness=0.40), # Dark nostril hollows
    'iris': make_pbr_source_mat('Iris', '#d4e157', roughness=0.08),       # Chartreuse yellow-green iris
    'pupil': make_pbr_source_mat('Pupil', '#080808', roughness=0.08),     # Jet black vertical slit pupil
    'liner': make_pbr_source_mat('EyeLiner', '#140e0c', roughness=0.18),  # Dark eye contour / lid margin
    'whisker': make_pbr_source_mat('Whisker', '#ffffff', roughness=0.30), # Pure white whiskers
    'claw': make_pbr_source_mat('Claw', '#22201e', roughness=0.45),       # Dark charcoal claws
    'pad': make_pbr_source_mat('Pad', '#785660', roughness=0.50),         # Mauve paw pads
}

gato.data.materials.clear()
for k, m in source_mats.items():
    gato.data.materials.append(m)
mat_idx = {k: i for i, k in enumerate(source_mats.keys())}

# 4. Esculpir proporciones del cuerpo base (silueta felina redondeada, mejillas, cola gruesa)
log("Esculpiendo proporciones anatómicas felinas (pelaje, cola, orejas)...")
for v in bm.verts:
    p = v.co
    d = v[dgroup_layer]
    w_head = d.get(vg_indices.get('head', -1), 0)
    w_ear_l = d.get(vg_indices.get('ear_L', -1), 0)
    w_ear_r = d.get(vg_indices.get('ear_R', -1), 0)
    w_chest = d.get(vg_indices.get('chest', -1), 0)
    w_spine = d.get(vg_indices.get('spine', -1), 0)
    w_hips = d.get(vg_indices.get('hips', -1), 0)
    w_neck = d.get(vg_indices.get('neck', -1), 0)
    
    # 4.1 Orejas más compactas y de gato real
    w_ear = max(w_ear_l, w_ear_r)
    if w_ear > 0.2 and p.z > 5.5:
        v.co.z = 5.5 + (p.z - 5.5) * 0.80
        
    # 4.2 Cráneo y mejillas más amplias para silueta felina icónica
    if w_head > 0.25 and 4.2 < p.z < 5.2 and abs(p.x) > 0.3:
        sign = 1.0 if p.x > 0 else -1.0
        v.co.x += sign * 0.26 * math.sin((p.z - 4.2) / 1.0 * math.pi) * w_head
        
    # 4.3 Cola gruesa y esponjosa
    w_tail = max(d.get(vg_indices.get(f'tail{i}', -1), 0) for i in range(1, 5))
    if w_tail > 0.15:
        rad = math.sqrt(p.x**2 + (p.z - 3.0)**2)
        v.co.x *= 1.48
        v.co.z = 3.0 + (p.z - 3.0) * 1.48
        
    # 4.4 Pecho y hombros robustos
    if w_chest > 0.2 and abs(p.x) > 0.35:
        sign = 1.0 if p.x > 0 else -1.0
        v.co.x += sign * 0.15 * w_chest

# 5. MECHONES DE MEJILLAS (JOWLS) EN 3 CAPAS
log("Agregando mechones esponjosos en las mejillas...")
for sign in (-1.0, 1.0):
    tufts = [
        # (pos_base, pos_punta, r_base, r_punta)
        (Vector((sign * 0.72, 4.65, 4.90)), Vector((sign * 1.15, 4.55, 4.82)), 0.18, 0.02),
        (Vector((sign * 0.78, 4.55, 4.62)), Vector((sign * 1.34, 4.40, 4.48)), 0.22, 0.02),
        (Vector((sign * 0.68, 4.48, 4.35)), Vector((sign * 1.12, 4.32, 4.20)), 0.18, 0.02),
    ]
    for b_pos, t_pos, r1, r2 in tufts:
        t_dir = (t_pos - b_pos).normalized()
        t_len = (t_pos - b_pos).length
        mid = (b_pos + t_pos) * 0.5
        rot = t_dir.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        tuft = bmesh.ops.create_cone(
            bm, cap_ends=True, segments=8,
            radius1=r1, radius2=r2, depth=t_len,
            matrix=Matrix.Translation(mid) @ rot @ Matrix.Diagonal((1.3, 0.7, 1.0, 1.0))
        )
        set_weights(tuft["verts"], {'head': 1.0})
        for v in tuft["verts"]:
            for f in v.link_faces:
                f.material_index = mat_idx['body']
                f.smooth = True

# 6. OREJAS CON MECHONES EXTERIORES E INTERIORES
log("Agregando mechones en el contorno de las orejas...")
for sign in (-1.0, 1.0):
    ear_bone = 'ear_L' if sign > 0 else 'ear_R'
    ear_tufts = [
        (Vector((sign * 0.72, 4.25, 5.85)), Vector((sign * 0.95, 4.18, 5.92)), 0.08, 0.015),
        (Vector((sign * 0.78, 4.18, 6.15)), Vector((sign * 0.98, 4.12, 6.20)), 0.06, 0.015),
    ]
    for b_pos, t_pos, r1, r2 in ear_tufts:
        t_dir = (t_pos - b_pos).normalized()
        t_len = (t_pos - b_pos).length
        mid = (b_pos + t_pos) * 0.5
        rot = t_dir.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        tuft = bmesh.ops.create_cone(
            bm, cap_ends=True, segments=6, radius1=r1, radius2=r2, depth=t_len,
            matrix=Matrix.Translation(mid) @ rot
        )
        set_weights(tuft["verts"], {ear_bone: 1.0})
        for v in tuft["verts"]:
            for f in v.link_faces:
                f.material_index = mat_idx['body']
                f.smooth = True

# 7. HOCICO, BIGOTERA Y MENTÓN BLANCO
log("Agregando hocico, bigotera y barbilla en crema...")
for sign in (-1.0, 1.0):
    mpad = bmesh.ops.create_uvsphere(
        bm, u_segments=14, v_segments=10, radius=0.24,
        matrix=Matrix.Translation(Vector((sign * 0.20, 5.24, 4.60))) @ Matrix.Diagonal((1.15, 0.90, 0.82, 1.0))
    )
    set_weights(mpad["verts"], {'head': 1.0})
    for v in mpad["verts"]:
        for f in v.link_faces:
            f.material_index = mat_idx['bib']
            f.smooth = True

chin = bmesh.ops.create_uvsphere(
    bm, u_segments=12, v_segments=8, radius=0.22,
    matrix=Matrix.Translation(Vector((0, 4.96, 4.30))) @ Matrix.Diagonal((1.0, 0.85, 0.75, 1.0))
)
set_weights(chin["verts"], {'head': 1.0})
for v in chin["verts"]:
    for f in v.link_faces:
        f.material_index = mat_idx['bib']
        f.smooth = True

# 8. NARIZ ROSADA DEFINIDA CON ORIFICIOS NASALES Y FILTRUM
log("Agregando nariz rosada esculpida con narinas...")
nose_pos = Vector((0, 5.34, 4.74))
nose = bmesh.ops.create_cone(
    bm, cap_ends=True, segments=8,
    radius1=0.16, radius2=0.05, depth=0.20,
    matrix=Matrix.Translation(nose_pos) @ Euler((math.radians(98), 0, 0), 'XYZ').to_matrix().to_4x4() @ Matrix.Diagonal((1.35, 1.0, 0.65, 1.0))
)
set_weights(nose["verts"], {'head': 1.0})
for v in nose["verts"]:
    for f in v.link_faces:
        f.material_index = mat_idx['nose']
        f.smooth = True

for sign in (-1.0, 1.0):
    nostril_pos = nose_pos + Vector((sign * 0.075, 0.055, -0.035))
    nostril = bmesh.ops.create_uvsphere(
        bm, u_segments=8, v_segments=6, radius=0.032,
        matrix=Matrix.Translation(nostril_pos) @ Matrix.Diagonal((1.2, 0.5, 0.8, 1.0))
    )
    set_weights(nostril["verts"], {'head': 1.0})
    for v in nostril["verts"]:
        for f in v.link_faces:
            f.material_index = mat_idx['nostril']
            f.smooth = True

# 9. BIGOTES LARGOS BLANCOS ESTILIZADOS ARQUEADOS (6 en total)
log("Agregando 6 bigotes largos estilizados...")
for sign in (-1.0, 1.0):
    whisker_curves = [
        (Vector((sign * 0.28, 5.24, 4.64)), Vector((sign * 0.90, 5.16, 4.64)), Vector((sign * 1.60, 4.98, 4.56)), 0.018),
        (Vector((sign * 0.30, 5.22, 4.56)), Vector((sign * 1.04, 5.14, 4.52)), Vector((sign * 1.75, 4.90, 4.40)), 0.020),
        (Vector((sign * 0.28, 5.20, 4.48)), Vector((sign * 0.90, 5.10, 4.40)), Vector((sign * 1.52, 4.82, 4.22)), 0.018),
    ]
    for p0, p1, p2, r in whisker_curves:
        v1 = (p1 - p0).normalized()
        l1 = (p1 - p0).length
        c1 = bmesh.ops.create_cone(
            bm, cap_ends=True, segments=8, radius1=r, radius2=r * 0.75, depth=l1,
            matrix=Matrix.Translation((p0 + p1) * 0.5) @ v1.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        )
        v2 = (p2 - p1).normalized()
        l2 = (p2 - p1).length
        c2 = bmesh.ops.create_cone(
            bm, cap_ends=True, segments=8, radius1=r * 0.75, radius2=r * 0.35, depth=l2,
            matrix=Matrix.Translation((p1 + p2) * 0.5) @ v2.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        )
        w_verts = c1["verts"] + c2["verts"]
        set_weights(w_verts, {'head': 1.0})
        for v in w_verts:
            for f in v.link_faces:
                f.material_index = mat_idx['whisker']
                f.smooth = True

# 10. OJOS DE EULALIO: "BORED / CONDESCENDING CAT"
log("Agregando ojos expresivos almendrados con pupila elíptica y párpado escéptico...")
def create_almond_eye(bm, sign=1.0):
    cx = sign * 0.40
    cy = 5.23
    cz = 4.98
    
    num_cols = 13
    xs_rel = [-0.19 + (0.39 * i / (num_cols - 1)) for i in range(num_cols)]
    grid_verts = []
    
    for r in range(5):
        row_verts = []
        for c in range(num_cols):
            x_rel = xs_rel[c]
            norm_x = x_rel / 0.20
            arch = max(0.0, 1.0 - min(1.0, norm_x**2))
            
            # Apertura del ojo con caída suave de 8-10°
            z_top = 0.065 - 0.060 * x_rel
            z_bot = -0.105 * arch - 0.035 * x_rel
            
            if r == 0:  # brow
                z = z_top + 0.12
                y_off = 0.04
                m_k = 'body'
            elif r == 1:  # upper lid margin
                z = z_top
                y_off = 0.065
                m_k = 'liner'
            elif r == 2:  # iris / pupila
                z = (z_top + z_bot) * 0.5
                y_off = 0.080
                # Pupila en las columnas centrales (c in [5, 6, 7])
                m_k = 'pupil' if abs(c - 6) <= 1 else 'iris'
            elif r == 3:  # lower lid margin
                z = z_bot
                y_off = 0.065
                m_k = 'liner'
            elif r == 4:  # cheek
                z = z_bot - 0.10
                y_off = 0.04
                m_k = 'body'
                
            px = cx + sign * x_rel
            pz = cz + z
            py = cy + y_off - 0.38 * (x_rel**2) - 0.22 * (z**2)
            
            v = bm.verts.new(Vector((px, py, pz)))
            row_verts.append((v, mat_idx[m_k]))
        grid_verts.append(row_verts)
        
    bm.verts.ensure_lookup_table()
    for r in range(4):
        for c in range(num_cols - 1):
            v00, m00 = grid_verts[r][c]
            v01, m01 = grid_verts[r][c + 1]
            v11, m11 = grid_verts[r + 1][c + 1]
            v10, m10 = grid_verts[r + 1][c + 0]
            
            face_verts = (v00, v01, v11, v10) if sign > 0 else (v00, v10, v11, v01)
            try:
                face = bm.faces.new(face_verts)
                if r == 0:
                    face.material_index = mat_idx['body']
                elif r in (1, 2):
                    face.material_index = mat_idx['pupil'] if c in (5, 6, 7) and abs(c - 6) <= 0 else mat_idx['iris']
                elif r == 3:
                    face.material_index = mat_idx['body']
                face.smooth = True
            except ValueError:
                pass

    all_v = [v for row in grid_verts for v, _ in row]
    set_weights(all_v, {'head': 1.0})

create_almond_eye(bm, sign=1.0)
create_almond_eye(bm, sign=-1.0)

# 11. BABERO PECTORAL PROMINENTE EN 4 CAPAS FLUIDAS
log("Agregando babero pectoral en 4 capas fluidas...")
bib_tiers = [
    # Tier 1 (garganta / bajo barbilla)
    [(Vector((0, 3.90, 3.95)), 0.52, 0.32, 50, 0),
     (Vector((-0.24, 3.85, 3.92)), 0.44, 0.25, 45, -15),
     (Vector((0.24, 3.85, 3.92)), 0.44, 0.25, 45, 15)],
    # Tier 2 (pecho superior)
    [(Vector((0, 3.75, 3.35)), 0.62, 0.38, 55, 0),
     (Vector((-0.32, 3.68, 3.32)), 0.54, 0.30, 50, -20),
     (Vector((0.32, 3.68, 3.32)), 0.54, 0.30, 50, 20)],
    # Tier 3 (pecho medio)
    [(Vector((0, 3.60, 2.75)), 0.58, 0.35, 60, 0),
     (Vector((-0.28, 3.52, 2.72)), 0.50, 0.27, 55, -18),
     (Vector((0.28, 3.52, 2.72)), 0.50, 0.27, 55, 18)],
    # Tier 4 (pecho bajo / entre patas)
    [(Vector((0, 3.48, 2.15)), 0.50, 0.30, 65, 0),
     (Vector((-0.20, 3.42, 2.12)), 0.42, 0.22, 60, -12),
     (Vector((0.20, 3.42, 2.12)), 0.42, 0.22, 60, 12)],
]

for tier_idx, clumps in enumerate(bib_tiers):
    bname = 'neck' if tier_idx == 0 else 'chest'
    for pos, c_len, c_rad, pitch, yaw in clumps:
        rot = Euler((math.radians(pitch), 0, math.radians(yaw)), 'XYZ').to_matrix().to_4x4()
        tuft = bmesh.ops.create_cone(
            bm, cap_ends=True, segments=8,
            radius1=c_rad, radius2=c_rad * 0.15, depth=c_len,
            matrix=Matrix.Translation(pos) @ rot @ Matrix.Diagonal((1.3, 0.55, 1.0, 1.0))
        )
        set_weights(tuft["verts"], {bname: 1.0})
        for v in tuft["verts"]:
            for f in v.link_faces:
                f.material_index = mat_idx['bib']
                f.smooth = True

# 12. PATAS FIRMES CON 4 DEDOS REDONDEADOS, GARRAS Y ALMOHADILLAS
log("Agregando patas con 4 dedos definidos, garras retráctiles y almohadillas...")
def add_cat_paw(bm, base_pos, bone_name, sign=1.0, is_front=True):
    toes = [
        (-0.25, -0.18, 0.22, 0.32, 0.14),
        (-0.08, -0.06, 0.35, 0.38, 0.15),
        (0.08, 0.06, 0.34, 0.38, 0.15),
        (0.25, 0.18, 0.20, 0.32, 0.14),
    ]
    for ang, xr, yr, t_len, t_rad in toes:
        toe_base = base_pos + Vector((sign * xr, yr, 0.0))
        fwd_dir = Vector((sign * math.sin(ang), math.cos(ang), -0.02)).normalized()
        toe_tip = toe_base + fwd_dir * t_len
        
        # Dedo redondeado (calcetín blanco)
        cone = bmesh.ops.create_cone(
            bm, cap_ends=True, segments=8,
            radius1=t_rad, radius2=t_rad * 0.9, depth=t_len,
            matrix=Matrix.Translation((toe_base + toe_tip) * 0.5) @ fwd_dir.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        )
        sph = bmesh.ops.create_uvsphere(
            bm, u_segments=8, v_segments=6, radius=t_rad * 0.9,
            matrix=Matrix.Translation(toe_tip)
        )
        t_verts = cone["verts"] + sph["verts"]
        set_weights(t_verts, {bone_name: 1.0})
        for v in t_verts:
            for f in v.link_faces:
                f.material_index = mat_idx['bib']
                f.smooth = True
                
        # Garra retráctil oscura
        claw_base = toe_tip + fwd_dir * (t_rad * 0.3)
        claw_dir = (fwd_dir + Vector((0, 0, -0.5))).normalized()
        claw_tip = claw_base + claw_dir * 0.12
        claw = bmesh.ops.create_cone(
            bm, cap_ends=True, segments=6,
            radius1=0.04, radius2=0.01, depth=0.12,
            matrix=Matrix.Translation((claw_base + claw_tip) * 0.5) @ claw_dir.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        )
        set_weights(claw["verts"], {bone_name: 1.0})
        for v in claw["verts"]:
            for f in v.link_faces:
                f.material_index = mat_idx['claw']
                f.smooth = True
                
        # Almohadilla plantar del dedo
        pad_pos = toe_base + fwd_dir * (t_len * 0.5) + Vector((0, 0, -0.08))
        pad = bmesh.ops.create_uvsphere(
            bm, u_segments=6, v_segments=4, radius=t_rad * 0.65,
            matrix=Matrix.Translation(pad_pos) @ Matrix.Diagonal((1.0, 1.2, 0.4, 1.0))
        )
        set_weights(pad["verts"], {bone_name: 1.0})
        for v in pad["verts"]:
            for f in v.link_faces:
                f.material_index = mat_idx['pad']
                f.smooth = True

    # Almohadilla principal
    main_pad_pos = base_pos + Vector((0, -0.05, -0.06))
    main_pad = bmesh.ops.create_uvsphere(
        bm, u_segments=8, v_segments=6, radius=0.22,
        matrix=Matrix.Translation(main_pad_pos) @ Matrix.Diagonal((1.4, 1.1, 0.4, 1.0))
    )
    set_weights(main_pad["verts"], {bone_name: 1.0})
    for v in main_pad["verts"]:
        for f in v.link_faces:
            f.material_index = mat_idx['pad']
            f.smooth = True

add_cat_paw(bm, Vector((0.72, 2.50, 0.12)), "fpaw_L", sign=1.0, is_front=True)
add_cat_paw(bm, Vector((-0.72, 2.50, 0.12)), "fpaw_R", sign=-1.0, is_front=True)
add_cat_paw(bm, Vector((0.80, -2.10, 0.12)), "hpaw_L", sign=1.0, is_front=False)
add_cat_paw(bm, Vector((-0.80, -2.10, 0.12)), "hpaw_R", sign=-1.0, is_front=False)

# 13. PINTAR CALCETINES BLANCOS Y RAYAS ATIGRADAS EN CARAS DEL CUERPO
log("Asignando regiones de color (calcetines, rayas, babero)...")
for f in bm.faces:
    c = f.calc_center_median()
    n = f.normal
    ax = abs(c.x)
    # Calcetines blancos en las patas inferiores
    if c.z < 0.70 and (ax > 0.4 or abs(c.y) > 1.0):
        if f.material_index in (mat_idx['body'], mat_idx['stripe']):
            f.material_index = mat_idx['bib']
            
    # Babero continuo en el pecho y garganta
    if 1.8 < c.z < 4.5 and c.y > 1.8 and ax < 0.65 and n.y > 0.05:
        f.material_index = mat_idx['bib']
            
    # Cola atigrada con anillos alternados
    if c.y < -3.0 and c.z > 1.8:
        ring = math.sin(-c.y * 2.8)
        if ring > 0.1:
            f.material_index = mat_idx['stripe']
            
    # Rayas en el lomo y costados
    if c.z > 2.0 and -2.8 < c.y < 2.8 and ax > 0.35:
        # Ondulación vertical
        stripe_val = math.sin(c.y * 3.2 + 0.6 * math.sin(c.z * 4.0))
        if stripe_val > 0.38 and f.material_index == mat_idx['body']:
            f.material_index = mat_idx['stripe']

bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(gato.data)
bm.free()

log(f"Malla base completada: {len(gato.data.vertices)} vértices, {len(gato.data.polygons)} caras.")

# 14. APLICAR MODIFICADOR SUBSURF PARA ACABADO CINEMATOGRÁFICO
log("Aplicando suavizado cinematográfico Subsurf...")
sub_mod = gato.modifiers.new("Subsurf", "SUBSURF")
sub_mod.levels = 1
sub_mod.render_levels = 1
bpy.ops.object.modifier_apply(modifier=sub_mod.name)

for p in gato.data.polygons:
    p.use_smooth = True

log(f"Malla tras Subsurf: {len(gato.data.vertices)} vértices, {len(gato.data.polygons)} caras.")

# 15. DESPLEGADO UV
log("Desplegando UVs con smart_project...")
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.015)
bpy.ops.object.mode_set(mode='OBJECT')

# 16. HORNEADO PBR CON CYCLES (METAL GPU)
log("Iniciando horneado de mapas PBR (Albedo, Normal, ORM)...")
TEX_SIZE = 1024
img_albedo = bpy.data.images.new("eulalio-albedo", width=TEX_SIZE, height=TEX_SIZE, alpha=False)
img_normal = bpy.data.images.new("eulalio-normal", width=TEX_SIZE, height=TEX_SIZE, alpha=False)
img_normal.colorspace_settings.name = 'Non-Color'
img_orm = bpy.data.images.new("eulalio-orm", width=TEX_SIZE, height=TEX_SIZE, alpha=False)
img_orm.colorspace_settings.name = 'Non-Color'

# Configurar micro-detalle de pelaje en el shader para horneado de Normal
for mat in gato.data.materials:
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs['Scale'].default_value = 75.0
    noise.inputs['Detail'].default_value = 2.0
    bump = nodes.new("ShaderNodeBump")
    bump.inputs['Strength'].default_value = 0.18
    bump.inputs['Distance'].default_value = 0.010
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
except Exception as e:
    log(f"Cycles: ejecutando en CPU/fallback ({e})")

# Asegurar que la malla sea el objeto activo para el horneado
bpy.ops.object.select_all(action='DESELECT')
gato.select_set(True)
bpy.context.view_layer.objects.active = gato

images_dict = {'albedo': img_albedo, 'normal': img_normal, 'orm': img_orm}

for kind in ('albedo', 'normal', 'orm'):
    t0 = time.time()
    log(f"Horneando mapa '{kind}'...")
    image = images_dict[kind]
    restored = []
    
    for mat in gato.data.materials:
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
        
    image.filepath_raw = str(HERE / f"eulalio-{kind}.png")
    image.file_format = 'PNG'
    image.save()
    t1 = time.time()
    log(f"eulalio-{kind}.png guardado en {t1 - t0:.2f} s.")

# 17. MATERIAL PBR UNIFICADO 'EulalioCoat'
log("Configurando material final PBR unificado 'EulalioCoat'...")
mat_final = bpy.data.materials.new("EulalioCoat")
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

gato.data.materials.clear()
gato.data.materials.append(mat_final)
for f in gato.data.polygons:
    f.material_index = 0
    f.use_smooth = True

# 18. NORMALIZACIÓN DE PESOS DEL ESQUELETO
log("Normalizando influencias de vértices para Havok / Babylon.js...")
vg_by_index = {vg.index: vg for vg in gato.vertex_groups}

for v in gato.data.vertices:
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
        fallback = 'head' if v.co.z > 4.5 else ('chest' if v.co.z > 2.0 else 'hips')
        gato.vertex_groups[fallback].add([v.index], 1.0, 'REPLACE')

rig.data.pose_position = 'POSE'

# 19. EMPAQUETAR TEXTURAS Y GUARDAR .BLEND
log("Empaquetando texturas y guardando eulalio.blend...")
for img in bpy.data.images:
    if img.source == 'FILE' and img.has_data:
        img.pack()
bpy.ops.file.pack_all()

blend_out = HERE / "eulalio.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(blend_out))
log(f"eulalio.blend guardado ({blend_out.stat().st_size} bytes).")

# 20. EXPORTAR EULALIO.GLB CON LOS 8 CLIPS DE ANIMACIÓN
log("Exportando eulalio.glb con todos los clips...")
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
gato.select_set(True)
bpy.context.view_layer.objects.active = rig

glb_out = HERE / "eulalio.glb"
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
tri_count = sum(len(p.vertices) - 2 for p in gato.data.polygons)
log(f"eulalio.glb exportado con éxito: {tri_count} triángulos, {glb_size} bytes.")

report = {
    "triangles": tri_count,
    "vertices": len(gato.data.vertices),
    "bytes": glb_size,
    "clips": actions_found,
    "materials": ["EulalioCoat"],
    "textures": ["eulalio-albedo.png", "eulalio-normal.png", "eulalio-orm.png"],
    "animations_verified": True
}
(HERE / "build-report.json").write_text(json.dumps(report, indent=2) + "\n")
log(f"Reporte guardado en build-report.json: {json.dumps(report)}")

# 21. GENERAR RENDERS DE VERIFICACIÓN CINEMATOGRÁFICOS
log("Generando renders de verificación en EEVEE...")
cd = bpy.data.cameras.new('RenderCam')
cam = bpy.data.objects.new('RenderCam', cd)
bpy.context.collection.objects.link(cam)
bpy.context.scene.camera = cam

# Luces de estudio balanceadas
l_key = bpy.data.lights.new('KeySun', 'SUN')
l_key.energy = 3.6
l_key.color = (1.0, 0.94, 0.84)
lo_key = bpy.data.objects.new('KeySun', l_key)
bpy.context.collection.objects.link(lo_key)
lo_key.rotation_euler = (math.radians(35), math.radians(20), math.radians(35))

l_fill = bpy.data.lights.new('FillSun', 'SUN')
l_fill.energy = 2.4
l_fill.color = (0.92, 0.95, 1.0)
lo_fill = bpy.data.objects.new('FillSun', l_fill)
bpy.context.collection.objects.link(lo_fill)
lo_fill.rotation_euler = (math.radians(10), math.radians(-10), math.radians(5))

l_rim = bpy.data.lights.new('RimSun', 'SUN')
l_rim.energy = 2.8
l_rim.color = (0.7, 0.85, 1.0)
lo_rim = bpy.data.objects.new('RimSun', l_rim)
bpy.context.collection.objects.link(lo_rim)
lo_rim.rotation_euler = (math.radians(-25), math.radians(-35), math.radians(-120))

# Luz de rebote inferior para iluminar babero, patas y barbilla
l_bounce = bpy.data.lights.new('BounceSun', 'SUN')
l_bounce.energy = 1.4
l_bounce.color = (1.0, 0.95, 0.88)
lo_bounce = bpy.data.objects.new('BounceSun', l_bounce)
bpy.context.collection.objects.link(lo_bounce)
lo_bounce.rotation_euler = (math.radians(-15), 0, 0)

world = bpy.data.worlds.new('World')
bpy.context.scene.world = world
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.05, 0.06, 0.08, 1.0)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.5

bpy.context.scene.render.engine = 'BLENDER_EEVEE'
bpy.context.scene.render.resolution_x = 768
bpy.context.scene.render.resolution_y = 768

shots = [
    ('eulalio_front.png', Vector((0, 15.0, 4.0)), Vector((0, 3.2, 3.6))),
    ('eulalio_three_quarter.png', Vector((-10.5, 13.5, 5.2)), Vector((0, 2.8, 4.0))),
    ('eulalio_head_close.png', Vector((0, 8.4, 4.95)), Vector((0, 4.8, 4.88))),
    ('eulalio_paws.png', Vector((0, 7.8, 1.6)), Vector((0, 2.2, 0.30))),
]

for filename, cam_pos, target in shots:
    cam.location = cam_pos
    dir_vec = (target - cam_pos).normalized()
    cam.rotation_euler = dir_vec.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.render.filepath = str(HERE / filename)
    bpy.ops.render.render(write_still=True)
    log(f"Render guardado: {filename}")

print("BUILD_EULALIO_COMPLETE")
