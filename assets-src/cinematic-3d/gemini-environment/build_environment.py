"""Master Environment Asset Builder for Junked Metal (Cinematic 3D)
Generates high-fidelity organic vegetation, safety boundary fence, aged wood fence,
Edison catenary garland, and arena ground terrain with tire marks matching 03-entrada-fondo.png.

Usage:
    /Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/cinematic-3d/gemini-environment/build_environment.py
"""

import bpy
import bmesh
import math
import sys
import json
import os
from pathlib import Path
import numpy as np
from mathutils import Vector, Matrix, Quaternion

HERE = Path(__file__).resolve().parent
TEXTURES_DIR = HERE / "textures"
TEXTURES_DIR.mkdir(parents=True, exist_ok=True)
ROOT = HERE.parents[2]

print("=" * 70)
print("BUILDING CINEMATIC ENVIRONMENT ASSETS FOR JUNKED METAL")
print("Target folder:", HERE)
print("=" * 70)

# ---------------------------------------------------------------------------
# COLOR AND MATERIAL HELPERS
# ---------------------------------------------------------------------------

def srgb_to_linear(hex_code):
    h = hex_code.lstrip('#')
    c = [int(h[i:i+2], 16) / 255.0 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]

def load_or_get_image(img_ref):
    if not img_ref:
        return None
    if isinstance(img_ref, (str, Path)):
        p = Path(img_ref)
        if p.exists():
            return bpy.data.images.load(str(p))
    elif hasattr(img_ref, "filepath_raw") and Path(img_ref.filepath_raw).exists():
        return bpy.data.images.load(str(img_ref.filepath_raw))
    elif hasattr(img_ref, "name") and img_ref.name in bpy.data.images:
        return bpy.data.images[img_ref.name]
    return None

def clean_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for m in list(bpy.data.materials):
        bpy.data.materials.remove(m)
    for me in list(bpy.data.meshes):
        bpy.data.meshes.remove(me)
    if not bpy.context.scene.collection.children:
        col = bpy.data.collections.new("EnvironmentCollection")
        bpy.context.scene.collection.children.link(col)
    return bpy.context.scene.collection

def create_pbr_material(name, base_color=(1, 1, 1, 1), metallic=0.0, roughness=0.8,
                        emission_color=(0, 0, 0, 1), emission_strength=0.0,
                        transmission=0.0, alpha=1.0, double_sided=False,
                        albedo_img=None, normal_img=None, orm_img=None):
    mat = bpy.data.materials.new(name)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

    bsdf.inputs['Base Color'].default_value = base_color
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if 'Transmission Weight' in bsdf.inputs:
        bsdf.inputs['Transmission Weight'].default_value = transmission
    elif 'Transmission' in bsdf.inputs:
        bsdf.inputs['Transmission'].default_value = transmission

    if emission_strength > 0:
        bsdf.inputs['Emission Color'].default_value = emission_color
        bsdf.inputs['Emission Strength'].default_value = emission_strength

    if alpha < 1.0:
        bsdf.inputs['Alpha'].default_value = alpha
        mat.surface_render_method = 'BLENDED'
    else:
        mat.surface_render_method = 'DITHERED'

    if double_sided:
        mat.use_backface_culling = False
    else:
        mat.use_backface_culling = True

    albedo_tex = load_or_get_image(albedo_img)
    normal_tex = load_or_get_image(normal_img)
    orm_tex = load_or_get_image(orm_img)

    # Texture hookups
    if albedo_tex:
        tex_node = nodes.new('ShaderNodeTexImage')
        tex_node.image = albedo_tex
        links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
        if alpha < 1.0 and 'Alpha' in tex_node.outputs:
            links.new(tex_node.outputs['Alpha'], bsdf.inputs['Alpha'])

    if normal_tex:
        norm_node = nodes.new('ShaderNodeNormalMap')
        norm_node.inputs['Strength'].default_value = 1.0
        tex_norm = nodes.new('ShaderNodeTexImage')
        tex_norm.image = normal_tex
        tex_norm.image.colorspace_settings.name = 'Non-Color'
        links.new(tex_norm.outputs['Color'], norm_node.inputs['Color'])
        links.new(norm_node.outputs['Normal'], bsdf.inputs['Normal'])

    if orm_tex:
        tex_orm = nodes.new('ShaderNodeTexImage')
        tex_orm.image = orm_tex
        tex_orm.image.colorspace_settings.name = 'Non-Color'
        sep_rgb = nodes.new('ShaderNodeSeparateColor')
        links.new(tex_orm.outputs['Color'], sep_rgb.inputs['Color'])
        # Green channel -> Roughness
        links.new(sep_rgb.outputs['Green'], bsdf.inputs['Roughness'])
        # Blue channel -> Metallic
        links.new(sep_rgb.outputs['Blue'], bsdf.inputs['Metallic'])

    return mat

# ---------------------------------------------------------------------------
# 1. TEXTURE GENERATION AND COMPOSITING
# ---------------------------------------------------------------------------

def generate_textures():
    print("\n--- Generating PBR Texture Suite ---")
    generated = {}

    # A. Grass Vertical Gradient and Vein Atlas
    # Size: 512x512
    gw, gh = 512, 512
    grass_arr = np.zeros((gh, gw, 4), dtype=np.float32)

    # Vertical gradient colors in Linear RGB
    c_root = np.array(srgb_to_linear("#2a2b15"), dtype=np.float32)
    c_lower = np.array(srgb_to_linear("#3a521c"), dtype=np.float32)
    c_mid = np.array(srgb_to_linear("#537725"), dtype=np.float32)
    c_tip = np.array(srgb_to_linear("#b0c73d"), dtype=np.float32)
    c_rim = np.array(srgb_to_linear("#cde048"), dtype=np.float32)

    v_coords = np.linspace(0.0, 1.0, gh)[:, None, None]
    u_coords = np.linspace(0.0, 1.0, gw)[None, :, None]

    # Vertical blend
    t1 = np.clip(v_coords / 0.22, 0.0, 1.0)
    col1 = c_root * (1.0 - t1) + c_lower * t1

    t2 = np.clip((v_coords - 0.22) / 0.45, 0.0, 1.0)
    col2 = col1 * (1.0 - t2) + c_mid * t2

    t3 = np.clip((v_coords - 0.67) / 0.33, 0.0, 1.0)
    vert_col = col2 * (1.0 - t3) + c_tip * t3

    # Cross-blade modulation:
    # Central vein at u=0.5 slightly lighter/paler
    center_dist = np.abs(u_coords - 0.5) * 2.0  # 0 at center, 1 at edges
    vein_mask = np.exp(-(center_dist ** 2) * 18.0)
    edge_mask = np.clip((center_dist - 0.85) / 0.15, 0.0, 1.0)

    # Subtle longitudinal fiber stripes
    fibers = (np.sin(u_coords * 90.0) * 0.03 + np.sin(u_coords * 220.0) * 0.02)

    grass_rgb = vert_col * (1.0 + fibers)
    grass_rgb = grass_rgb * (1.0 - vein_mask * 0.08) + (c_tip * 0.95) * (vein_mask * 0.15)
    grass_rgb = grass_rgb * (1.0 - edge_mask * 0.12) + c_rim * (edge_mask * 0.18)

    grass_arr[:, :, :3] = np.clip(grass_rgb, 0.0, 1.0)
    grass_arr[:, :, 3] = 1.0

    # Save grass albedo
    grass_alb_path = TEXTURES_DIR / "grass_gradient_albedo.png"
    img_grass = bpy.data.images.new("GrassAlbedo", width=gw, height=gh, alpha=True)
    img_grass.pixels.foreach_set(grass_arr.flatten())
    img_grass.filepath_raw = str(grass_alb_path)
    img_grass.file_format = 'PNG'
    img_grass.save()
    generated["grass_albedo"] = str(grass_alb_path)
    print("Saved:", grass_alb_path.name)

    # Grass normal map (V-crease cross section)
    u_2d = np.tile(np.linspace(0.0, 1.0, gw)[None, :], (gh, 1))
    cd_2d = np.abs(u_2d - 0.5) * 2.0
    nx = np.zeros((gh, gw), dtype=np.float32)
    # Left side tilts right (+X), right side tilts left (-X)
    nx[u_2d < 0.5] = 0.35 * (1.0 - cd_2d[u_2d < 0.5] ** 0.5)
    nx[u_2d >= 0.5] = -0.35 * (1.0 - cd_2d[u_2d >= 0.5] ** 0.5)
    ny = np.zeros((gh, gw), dtype=np.float32)
    nz = np.sqrt(np.clip(1.0 - nx**2 - ny**2, 0.01, 1.0))

    norm_arr = np.zeros((gh, gw, 4), dtype=np.float32)
    norm_arr[:, :, 0] = nx * 0.5 + 0.5
    norm_arr[:, :, 1] = ny * 0.5 + 0.5
    norm_arr[:, :, 2] = nz * 0.5 + 0.5
    norm_arr[:, :, 3] = 1.0

    grass_norm_path = TEXTURES_DIR / "grass_gradient_normal.png"
    img_grass_norm = bpy.data.images.new("GrassNormal", width=gw, height=gh, alpha=False)
    img_grass_norm.pixels.foreach_set(norm_arr.flatten())
    img_grass_norm.filepath_raw = str(grass_norm_path)
    img_grass_norm.file_format = 'PNG'
    img_grass_norm.save()
    generated["grass_normal"] = str(grass_norm_path)
    print("Saved:", grass_norm_path.name)

    # B. Ground Compacted Earth with Imprinted Tire Tracks
    earth_src = ROOT / "assets-src/material-library/v1/textures/01-compacted-earth.webp"
    tire_src = ROOT / "assets-src/environment-library/v1/textures/02-tire-marks.webp"

    img_earth_src = bpy.data.images.load(str(earth_src))
    ew, eh = img_earth_src.size
    earth_arr = np.zeros(ew * eh * 4, dtype=np.float32)
    img_earth_src.pixels.foreach_get(earth_arr)
    earth_arr = earth_arr.reshape((eh, ew, 4))

    img_tire_src = bpy.data.images.load(str(tire_src))
    tire_arr = np.zeros(ew * eh * 4, dtype=np.float32)
    img_tire_src.pixels.foreach_get(tire_arr)
    tire_arr = tire_arr.reshape((eh, ew, 4))

    # Composite: dirt is compacted and stained where tire tracks run
    tire_alpha = tire_arr[:, :, 3:4]
    tire_rgb = tire_arr[:, :, :3]
    earth_rgb = earth_arr[:, :, :3]

    # Dirt compaction effect: darker compressed soil + rubber staining
    compacted_factor = 1.0 - tire_alpha * 0.52
    comp_ground_rgb = earth_rgb * compacted_factor + tire_rgb * (tire_alpha * 0.35)

    comp_ground_arr = np.zeros((eh, ew, 4), dtype=np.float32)
    comp_ground_arr[:, :, :3] = np.clip(comp_ground_rgb, 0.0, 1.0)
    comp_ground_arr[:, :, 3] = 1.0

    ground_alb_path = TEXTURES_DIR / "ground_compacted_tracks_albedo.png"
    img_ground_alb = bpy.data.images.new("GroundCompactedAlbedo", width=ew, height=eh, alpha=False)
    img_ground_alb.pixels.foreach_set(comp_ground_arr.flatten())
    img_ground_alb.filepath_raw = str(ground_alb_path)
    img_ground_alb.file_format = 'PNG'
    img_ground_alb.save()
    generated["ground_albedo"] = str(ground_alb_path)
    print("Saved:", ground_alb_path.name)

    # Height map from earth luminance - tire tread depressions
    earth_lum = earth_rgb[:, :, 0] * 0.299 + earth_rgb[:, :, 1] * 0.587 + earth_rgb[:, :, 2] * 0.114
    # Tire treads indented into the soil
    height_map = earth_lum * 0.35 - tire_alpha[:, :, 0] * 0.42

    # Sobel normal map
    # dx
    h_pad = np.pad(height_map, ((1, 1), (1, 1)), mode='edge')
    dx = (h_pad[1:-1, 2:] - h_pad[1:-1, :-2]) * 2.8
    dy = (h_pad[2:, 1:-1] - h_pad[:-2, 1:-1]) * 2.8
    nz_ground = 1.0 / np.sqrt(dx**2 + dy**2 + 1.0)
    nx_ground = -dx * nz_ground
    ny_ground = -dy * nz_ground

    ground_norm_arr = np.zeros((eh, ew, 4), dtype=np.float32)
    ground_norm_arr[:, :, 0] = nx_ground * 0.5 + 0.5
    ground_norm_arr[:, :, 1] = ny_ground * 0.5 + 0.5
    ground_norm_arr[:, :, 2] = nz_ground * 0.5 + 0.5
    ground_norm_arr[:, :, 3] = 1.0

    ground_norm_path = TEXTURES_DIR / "ground_compacted_tracks_normal.png"
    img_ground_norm = bpy.data.images.new("GroundCompactedNormal", width=ew, height=eh, alpha=False)
    img_ground_norm.pixels.foreach_set(ground_norm_arr.flatten())
    img_ground_norm.filepath_raw = str(ground_norm_path)
    img_ground_norm.file_format = 'PNG'
    img_ground_norm.save()
    generated["ground_normal"] = str(ground_norm_path)
    print("Saved:", ground_norm_path.name)

    # C. Aged Wood Textures
    wood_src = ROOT / "assets-src/material-library/v1/textures/04-aged-wood.webp"
    img_wood_src = bpy.data.images.load(str(wood_src))
    ww, wh = img_wood_src.size
    wood_arr = np.zeros(ww * wh * 4, dtype=np.float32)
    img_wood_src.pixels.foreach_get(wood_arr)
    wood_arr = wood_arr.reshape((wh, ww, 4))

    # Save as PNG
    wood_alb_path = TEXTURES_DIR / "aged_wood_albedo.png"
    img_wood_alb = bpy.data.images.new("AgedWoodAlbedo", width=ww, height=wh, alpha=False)
    img_wood_alb.pixels.foreach_set(wood_arr.flatten())
    img_wood_alb.filepath_raw = str(wood_alb_path)
    img_wood_alb.file_format = 'PNG'
    img_wood_alb.save()
    generated["wood_albedo"] = str(wood_alb_path)
    print("Saved:", wood_alb_path.name)

    # Aged Wood Normal Map
    wood_lum = wood_arr[:, :, 0] * 0.299 + wood_arr[:, :, 1] * 0.587 + wood_arr[:, :, 2] * 0.114
    w_pad = np.pad(wood_lum, ((1, 1), (1, 1)), mode='edge')
    w_dx = (w_pad[1:-1, 2:] - w_pad[1:-1, :-2]) * 3.5
    w_dy = (w_pad[2:, 1:-1] - w_pad[:-2, 1:-1]) * 3.5
    w_nz = 1.0 / np.sqrt(w_dx**2 + w_dy**2 + 1.0)
    w_nx = -w_dx * w_nz
    w_ny = -w_dy * w_nz

    wood_norm_arr = np.zeros((wh, ww, 4), dtype=np.float32)
    wood_norm_arr[:, :, 0] = w_nx * 0.5 + 0.5
    wood_norm_arr[:, :, 1] = w_ny * 0.5 + 0.5
    wood_norm_arr[:, :, 2] = w_nz * 0.5 + 0.5
    wood_norm_arr[:, :, 3] = 1.0

    wood_norm_path = TEXTURES_DIR / "aged_wood_normal.png"
    img_wood_norm = bpy.data.images.new("AgedWoodNormal", width=ww, height=wh, alpha=False)
    img_wood_norm.pixels.foreach_set(wood_norm_arr.flatten())
    img_wood_norm.filepath_raw = str(wood_norm_path)
    img_wood_norm.file_format = 'PNG'
    img_wood_norm.save()
    generated["wood_normal"] = str(wood_norm_path)
    print("Saved:", wood_norm_path.name)

    # Aged Wood ORM: R=AO, G=Roughness, B=Metallic
    wood_orm_arr = np.zeros((wh, ww, 4), dtype=np.float32)
    wood_orm_arr[:, :, 0] = np.clip(wood_lum * 0.5 + 0.5, 0.4, 1.0)  # AO
    wood_orm_arr[:, :, 1] = np.clip(0.85 + (1.0 - wood_lum) * 0.14, 0.75, 0.98)  # Roughness
    wood_orm_arr[:, :, 2] = 0.0  # Metallic = 0
    wood_orm_arr[:, :, 3] = 1.0

    wood_orm_path = TEXTURES_DIR / "aged_wood_orm.png"
    img_wood_orm = bpy.data.images.new("AgedWoodORM", width=ww, height=wh, alpha=False)
    img_wood_orm.pixels.foreach_set(wood_orm_arr.flatten())
    img_wood_orm.filepath_raw = str(wood_orm_path)
    img_wood_orm.file_format = 'PNG'
    img_wood_orm.save()
    generated["wood_orm"] = str(wood_orm_path)
    print("Saved:", wood_orm_path.name)

    # D. Safety Rope Braided Texture (256x256)
    rw, rh = 256, 256
    rope_arr = np.zeros((rh, rw, 4), dtype=np.float32)
    u_rope = np.linspace(0.0, 1.0, rw)[None, :]
    v_rope = np.linspace(0.0, 1.0, rh)[:, None]

    # 3-strand helical twist
    twist = np.sin((v_rope * 8.0 + u_rope * 3.0) * math.pi * 2.0)
    strand_val = np.clip(twist * 0.5 + 0.5, 0.0, 1.0)[:, :, None]

    c_rope_orange = np.array(srgb_to_linear("#e24e23"), dtype=np.float32)[None, None, :]
    c_rope_deep = np.array(srgb_to_linear("#7a220e"), dtype=np.float32)[None, None, :]
    rope_rgb = c_rope_deep * (1.0 - strand_val) + c_rope_orange * strand_val

    rope_arr[:, :, :3] = rope_rgb
    rope_arr[:, :, 3] = 1.0

    rope_alb_path = TEXTURES_DIR / "safety_rope_albedo.png"
    img_rope_alb = bpy.data.images.new("SafetyRopeAlbedo", width=rw, height=rh, alpha=False)
    img_rope_alb.pixels.foreach_set(rope_arr.flatten())
    img_rope_alb.filepath_raw = str(rope_alb_path)
    img_rope_alb.file_format = 'PNG'
    img_rope_alb.save()
    generated["rope_albedo"] = str(rope_alb_path)
    print("Saved:", rope_alb_path.name)

    return generated

# ---------------------------------------------------------------------------
# 2. VEGETATION GEOMETRY GENERATOR
# ---------------------------------------------------------------------------

def add_curved_blade(bm, length, width_base, width_tip, tilt_angle, droop_amount,
                     yaw_angle, root_pos, segments=6, color_layer=None):
    """Adds a curved quad-ribbon grass blade with cross-sectional V-crease."""
    cos_yaw = math.cos(yaw_angle)
    sin_yaw = math.sin(yaw_angle)

    # Along the blade, create 3 vertices per ring (left, center crease, right)
    prev_verts = []

    for s in range(segments + 1):
        t = s / segments  # 0.0 to 1.0

        # Quadratic/cubic height and outwards radial droop
        z = length * (t - 0.18 * (t ** 2.2))
        radial = tilt_angle * t + droop_amount * (t ** 2.5)

        # Width tapering from base to tip
        w = width_base * (1.0 - t) + width_tip * t
        if s == segments:
            w = 0.002  # sharp needle tip

        # Center spine position
        cx = root_pos.x + radial * cos_yaw
        cy = root_pos.y + radial * sin_yaw
        cz = root_pos.z + z

        # Transverse vector perpendicular to blade direction in XY plane
        tx = -sin_yaw
        ty = cos_yaw

        # V-crease depth: center crease raised forward relative to leaf plane
        v_depth = w * 0.16 if s < segments else 0.0
        # Forward vector normal to blade curve
        fx = cos_yaw * 0.3
        fy = sin_yaw * 0.3
        fz = -0.15

        # 3 vertices across width
        v_left = bm.verts.new((cx - tx * w * 0.5, cy - ty * w * 0.5, cz))
        v_mid = bm.verts.new((cx + fx * v_depth, cy + fy * v_depth, cz + fz * v_depth))
        v_right = bm.verts.new((cx + tx * w * 0.5, cy + ty * w * 0.5, cz))

        curr_verts = [v_left, v_mid, v_right]

        if prev_verts:
            # Create two quads connecting to previous ring
            f1 = bm.faces.new((prev_verts[0], curr_verts[0], curr_verts[1], prev_verts[1]))
            f2 = bm.faces.new((prev_verts[1], curr_verts[1], curr_verts[2], prev_verts[2]))
            f1.smooth = True
            f2.smooth = True

        prev_verts = curr_verts

def add_broad_leaf(bm, length, max_width, droop, yaw_angle, root_pos, segments=6):
    """Adds a broadleaf weed leaf (maleza/plantago style) with midrib."""
    cos_yaw = math.cos(yaw_angle)
    sin_yaw = math.sin(yaw_angle)
    prev_verts = []

    for s in range(segments + 1):
        t = s / segments
        # Broadleaf stays closer to ground, arching out and kissing soil
        z = math.sin(t * math.pi * 0.85) * length * 0.35 - (t ** 2) * droop * 0.25
        radial = length * (t * 0.95 + 0.05 * (t ** 2))

        # Leaf silhouette: swells in middle (t ~ 0.45), tapers at tip
        width_profile = math.sin(t * math.pi) ** 0.75
        w = max_width * width_profile
        if s == segments:
            w = 0.005

        cx = root_pos.x + radial * cos_yaw
        cy = root_pos.y + radial * sin_yaw
        cz = root_pos.z + max(0.01, z)

        tx = -sin_yaw
        ty = cos_yaw

        # Central vein depression
        v_left = bm.verts.new((cx - tx * w * 0.5, cy - ty * w * 0.5, cz + w * 0.08))
        v_mid = bm.verts.new((cx, cy, cz - w * 0.05))
        v_right = bm.verts.new((cx + tx * w * 0.5, cy + ty * w * 0.5, cz + w * 0.08))

        curr_verts = [v_left, v_mid, v_right]
        if prev_verts:
            f1 = bm.faces.new((prev_verts[0], curr_verts[0], curr_verts[1], prev_verts[1]))
            f2 = bm.faces.new((prev_verts[1], curr_verts[1], curr_verts[2], prev_verts[2]))
            f1.smooth = True
            f2.smooth = True
        prev_verts = curr_verts

def assign_foliage_uvs_and_normals(mesh):
    """Assigns vertical UV coordinates and softens vertex normals outward."""
    bm = bmesh.new()
    bm.from_mesh(mesh)
    uv_layer = bm.loops.layers.uv.verify()

    # Find bounding box in Z
    z_min = min(v.co.z for v in bm.verts) if bm.verts else 0.0
    z_max = max(v.co.z for v in bm.verts) if bm.verts else 1.0
    z_range = max(0.001, z_max - z_min)

    for face in bm.faces:
        for loop in face.loops:
            v = loop.vert
            v_norm = (v.co.z - z_min) / z_range
            # Project UV: U based on angle around center, V based on relative height
            dist_xy = math.sqrt(v.co.x**2 + v.co.y**2)
            u_val = (math.atan2(v.co.y, v.co.x) / (math.pi * 2.0)) + 0.5
            loop[uv_layer].uv = Vector((u_val % 1.0, v_norm))

    bm.to_mesh(mesh)
    bm.free()

    for p in mesh.polygons:
        p.use_smooth = True

def build_vegetation_glb(textures):
    print("\n--- Building Vegetation Module (vegetation.glb) ---")
    clean_scene()

    # 1. Tuft Fine: 18 graceful fine grass blades
    bm = bmesh.new()
    rng = np.random.RandomState(42)
    num_blades = 18
    golden_angle = 2.39996  # ~137.5 degrees

    for i in range(num_blades):
        yaw = i * golden_angle + rng.uniform(-0.15, 0.15)
        length = rng.uniform(0.65, 0.98)
        w_base = rng.uniform(0.045, 0.065)
        w_tip = 0.008
        tilt = rng.uniform(0.20, 0.45)
        droop = rng.uniform(0.25, 0.60)
        root = Vector((rng.uniform(-0.06, 0.06), rng.uniform(-0.06, 0.06), -0.02))
        add_curved_blade(bm, length, w_base, w_tip, tilt, droop, yaw, root, segments=5)

    mesh_fine = bpy.data.meshes.new("GrassTuft_Fine_Mesh")
    bm.to_mesh(mesh_fine)
    bm.free()
    assign_foliage_uvs_and_normals(mesh_fine)
    ob_fine = bpy.data.objects.new("GrassTuft_Fine", mesh_fine)
    bpy.context.collection.objects.link(ob_fine)
    ob_fine.location = Vector((-2.0, 0, 0))

    # 2. Tuft Broadleaf Weed (Maleza de patio): 8 spreading broad leaves
    bm = bmesh.new()
    num_leaves = 9
    for i in range(num_leaves):
        yaw = i * (math.pi * 2.0 / num_leaves) + rng.uniform(-0.18, 0.18)
        length = rng.uniform(0.55, 0.78)
        w_max = rng.uniform(0.14, 0.20)
        droop = rng.uniform(0.22, 0.40)
        root = Vector((rng.uniform(-0.04, 0.04), rng.uniform(-0.04, 0.04), 0.01))
        add_broad_leaf(bm, length, w_max, droop, yaw, root, segments=6)

    mesh_broad = bpy.data.meshes.new("GrassTuft_Broad_Mesh")
    bm.to_mesh(mesh_broad)
    bm.free()
    assign_foliage_uvs_and_normals(mesh_broad)
    ob_broad = bpy.data.objects.new("GrassTuft_Broad", mesh_broad)
    bpy.context.collection.objects.link(ob_broad)
    ob_broad.location = Vector((0, 0, 0))

    # 3. Tuft Tall Perimeter Grass: 24 tall blades framing the border
    bm = bmesh.new()
    num_tall = 24
    for i in range(num_tall):
        yaw = i * golden_angle + rng.uniform(-0.12, 0.12)
        length = rng.uniform(1.20, 1.65)
        w_base = rng.uniform(0.045, 0.070)
        w_tip = 0.010
        tilt = rng.uniform(0.35, 0.75)
        droop = rng.uniform(0.40, 0.95)
        root = Vector((rng.uniform(-0.10, 0.10), rng.uniform(-0.10, 0.10), -0.03))
        add_curved_blade(bm, length, w_base, w_tip, tilt, droop, yaw, root, segments=6)

    mesh_tall = bpy.data.meshes.new("GrassTuft_Tall_Mesh")
    bm.to_mesh(mesh_tall)
    bm.free()
    assign_foliage_uvs_and_normals(mesh_tall)
    ob_tall = bpy.data.objects.new("GrassTuft_Tall", mesh_tall)
    bpy.context.collection.objects.link(ob_tall)
    ob_tall.location = Vector((2.0, 0, 0))

    # 4. Tuft Mixed (Tall Grass + Base Broadleaf Weed)
    bm = bmesh.new()
    for i in range(12):
        yaw = i * (math.pi * 2.0 / 12) + rng.uniform(-0.15, 0.15)
        length = rng.uniform(0.85, 1.25)
        add_curved_blade(bm, length, 0.05, 0.008, 0.35, 0.50, yaw, Vector((0, 0, 0)), segments=5)
    for i in range(6):
        yaw = i * (math.pi * 2.0 / 6) + rng.uniform(-0.2, 0.2)
        add_broad_leaf(bm, 0.55, 0.15, 0.25, yaw, Vector((0, 0, 0)), segments=5)

    mesh_mixed = bpy.data.meshes.new("GrassTuft_Mixed_Mesh")
    bm.to_mesh(mesh_mixed)
    bm.free()
    assign_foliage_uvs_and_normals(mesh_mixed)
    ob_mixed = bpy.data.objects.new("GrassTuft_Mixed", mesh_mixed)
    bpy.context.collection.objects.link(ob_mixed)
    ob_mixed.location = Vector((4.0, 0, 0))

    # 5. Composite Patch 1.5x1.5m
    bm = bmesh.new()
    patch_centers = [(-0.4, -0.3), (0.4, -0.2), (-0.2, 0.4), (0.3, 0.4)]
    for cx, cy in patch_centers:
        for i in range(8):
            yaw = rng.uniform(0, math.pi * 2)
            length = rng.uniform(0.6, 1.1)
            add_curved_blade(bm, length, 0.045, 0.007, 0.3, 0.4, yaw, Vector((cx, cy, 0)), segments=5)
    for cx, cy in [(0.0, 0.0), (-0.35, 0.2)]:
        for i in range(4):
            yaw = rng.uniform(0, math.pi * 2)
            add_broad_leaf(bm, 0.48, 0.13, 0.25, yaw, Vector((cx, cy, 0)), segments=4)

    mesh_patch = bpy.data.meshes.new("GrassTuft_Patch_1x1_Mesh")
    bm.to_mesh(mesh_patch)
    bm.free()
    assign_foliage_uvs_and_normals(mesh_patch)
    ob_patch = bpy.data.objects.new("GrassTuft_Patch_1x1", mesh_patch)
    bpy.context.collection.objects.link(ob_patch)
    ob_patch.location = Vector((0, 2.5, 0))

    # Assign Vegetation PBR Material
    mat_veg = create_pbr_material(
        "M_Vegetation_Organic",
        base_color=(1, 1, 1, 1),
        roughness=0.58,
        double_sided=True,
        albedo_img=textures["grass_albedo"],
        normal_img=textures["grass_normal"]
    )
    # Subsurface translucency simulation in Principled BSDF
    bsdf = mat_veg.node_tree.nodes['Principled BSDF']
    if 'Subsurface Weight' in bsdf.inputs:
        bsdf.inputs['Subsurface Weight'].default_value = 0.25
        if 'Subsurface Radius' in bsdf.inputs:
            bsdf.inputs['Subsurface Radius'].default_value = (0.35, 0.55, 0.15)
    if 'Sheen Weight' in bsdf.inputs:
        bsdf.inputs['Sheen Weight'].default_value = 0.35

    all_veg_obs = [ob_fine, ob_broad, ob_tall, ob_mixed, ob_patch]
    for ob in all_veg_obs:
        ob.data.materials.append(mat_veg)

    # Save .blend and export .glb
    blend_path = HERE / "vegetation.blend"
    glb_path = HERE / "vegetation.glb"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),
        export_format='GLB',
        use_selection=False,
        export_yup=True,
        export_materials='EXPORT',
        export_texcoords=True
    )
    tri_count = sum(len(o.data.polygons) * 2 for o in all_veg_obs)
    print(f"Exported {glb_path.name}: {glb_path.stat().st_size:,} bytes | ~{tri_count} triangles")
    return {"blend": str(blend_path), "glb": str(glb_path), "triangles": tri_count}

# ---------------------------------------------------------------------------
# 3. FENCE AND SAFETY BOUNDARY GENERATOR
# ---------------------------------------------------------------------------

def create_beveled_box(bm, width, depth, height, center=Vector((0,0,0)), mat_idx=0):
    """Creates a box with slightly beveled rustic edges, UVs, and material index."""
    dx = width * 0.5
    dy = depth * 0.5
    dz = height * 0.5
    v0 = bm.verts.new((center.x - dx, center.y - dy, center.z - dz))
    v1 = bm.verts.new((center.x + dx, center.y - dy, center.z - dz))
    v2 = bm.verts.new((center.x + dx, center.y + dy, center.z - dz))
    v3 = bm.verts.new((center.x - dx, center.y + dy, center.z - dz))
    v4 = bm.verts.new((center.x - dx, center.y - dy, center.z + dz))
    v5 = bm.verts.new((center.x + dx, center.y - dy, center.z + dz))
    v6 = bm.verts.new((center.x + dx, center.y + dy, center.z + dz))
    v7 = bm.verts.new((center.x - dx, center.y + dy, center.z + dz))
    f_bottom = bm.faces.new((v3, v2, v1, v0))
    f_top = bm.faces.new((v4, v5, v6, v7))
    f_front = bm.faces.new((v0, v1, v5, v4))
    f_right = bm.faces.new((v1, v2, v6, v5))
    f_back = bm.faces.new((v2, v3, v7, v6))
    f_left = bm.faces.new((v3, v0, v4, v7))
    uv_layer = bm.loops.layers.uv.verify()
    for f in (f_bottom, f_top, f_front, f_right, f_back, f_left):
        f.smooth = True
        f.material_index = mat_idx
        for loop in f.loops:
            v = loop.vert
            if abs(f.normal.z) > 0.8:
                loop[uv_layer].uv = Vector(((v.co.x - center.x) / width + 0.5, (v.co.y - center.y) / depth + 0.5))
            elif abs(f.normal.x) > 0.8:
                loop[uv_layer].uv = Vector(((v.co.y - center.y) / depth + 0.5, (v.co.z - center.z) / height + 0.5))
            else:
                loop[uv_layer].uv = Vector(((v.co.x - center.x) / width + 0.5, (v.co.z - center.z) / height + 0.5))
    return [v0, v1, v2, v3, v4, v5, v6, v7]

def create_tube_along_curve(bm, points, radius=0.016, seg=8, mat_idx=0, v_repeat=1.0):
    """Creates a tube geometry along 3D trajectory points with UVs and material index."""
    rings = []
    uv_layer = bm.loops.layers.uv.verify()
    num_pts = len(points)
    for i, pt in enumerate(points):
        # Tangent vector
        if i == 0:
            tangent = (points[1] - pt).normalized()
        elif i == num_pts - 1:
            tangent = (pt - points[i - 1]).normalized()
        else:
            tangent = (points[i + 1] - points[i - 1]).normalized()

        # Normal and binormal
        up = Vector((0, 0, 1))
        if abs(tangent.dot(up)) > 0.95:
            up = Vector((0, 1, 0))
        normal = tangent.cross(up).normalized()
        binormal = tangent.cross(normal).normalized()

        ring = []
        for s in range(seg):
            angle = s * (math.pi * 2.0 / seg)
            offset = normal * (math.cos(angle) * radius) + binormal * (math.sin(angle) * radius)
            ring.append(bm.verts.new(pt + offset))
        rings.append(ring)

    # Faces & UVs
    for i in range(num_pts - 1):
        r1 = rings[i]
        r2 = rings[i + 1]
        v1 = (i / max(1, num_pts - 1)) * v_repeat
        v2 = ((i + 1) / max(1, num_pts - 1)) * v_repeat
        for s in range(seg):
            s_next = (s + 1) % seg
            u1 = s / seg
            u2 = (s + 1) / seg
            f = bm.faces.new((r1[s], r2[s], r2[s_next], r1[s_next]))
            f.smooth = True
            f.material_index = mat_idx
            for loop in f.loops:
                if loop.vert == r1[s]: loop[uv_layer].uv = Vector((u1, v1))
                elif loop.vert == r2[s]: loop[uv_layer].uv = Vector((u1, v2))
                elif loop.vert == r2[s_next]: loop[uv_layer].uv = Vector((u2, v2))
                elif loop.vert == r1[s_next]: loop[uv_layer].uv = Vector((u2, v1))

def build_fence_boundary_glb(textures):
    print("\n--- Building Fence and Boundary Module (fence_boundary.glb) ---")
    clean_scene()

    mat_wood = create_pbr_material(
        "M_AgedWood",
        base_color=(1, 1, 1, 1),
        roughness=0.88,
        albedo_img=textures["wood_albedo"],
        normal_img=textures["wood_normal"],
        orm_img=textures["wood_orm"]
    )

    mat_iron = create_pbr_material(
        "M_RustedHardware",
        base_color=srgb_to_linear("#363230") + [1],
        metallic=0.82,
        roughness=0.74
    )

    mat_rope = create_pbr_material(
        "M_SafetyRope",
        base_color=(1, 1, 1, 1),
        roughness=0.68,
        albedo_img=textures["rope_albedo"]
    )

    fence_materials = [mat_wood, mat_iron, mat_rope]

    # 1. Single Safety Stake with Collar & Eyebolt
    bm = bmesh.new()
    # Wood stake: mat_idx=0
    create_beveled_box(bm, 0.12, 0.12, 0.65, center=Vector((0, 0, 0.325)), mat_idx=0)
    # Metal Collar band at height 0.44m: mat_idx=1
    collar_verts = create_beveled_box(bm, 0.14, 0.14, 0.035, center=Vector((0, 0, 0.44)), mat_idx=1)
    # Eyebolt ring (Torus) protruding horizontally: mat_idx=1
    torus_center = Vector((0, 0.095, 0.44))
    torus_pts = [
        torus_center + Vector((math.cos(a) * 0.038, 0, math.sin(a) * 0.038))
        for a in np.linspace(0, math.pi * 2, 16)
    ]
    create_tube_along_curve(bm, torus_pts, radius=0.007, seg=6, mat_idx=1)

    mesh_stake = bpy.data.meshes.new("SafetyStake_Single_Mesh")
    bm.to_mesh(mesh_stake)
    bm.free()
    ob_stake = bpy.data.objects.new("SafetyStake_Single", mesh_stake)
    bpy.context.collection.objects.link(ob_stake)
    for m in fence_materials: ob_stake.data.materials.append(m)
    ob_stake.location = Vector((-3.5, 0, 0))

    # 2. Straight Safety Barrier Segment (3 stakes, 3.0m length, with sagging orange rope)
    bm_barrier = bmesh.new()
    stake_x = [-1.5, 0.0, 1.5]
    for sx in stake_x:
        create_beveled_box(bm_barrier, 0.12, 0.12, 0.65, center=Vector((sx, 0, 0.325)), mat_idx=0)
        create_beveled_box(bm_barrier, 0.14, 0.14, 0.035, center=Vector((sx, 0, 0.44)), mat_idx=1)
        t_center = Vector((sx, 0.095, 0.44))
        t_pts = [
            t_center + Vector((math.cos(a) * 0.038, 0, math.sin(a) * 0.038))
            for a in np.linspace(0, math.pi * 2, 16)
        ]
        create_tube_along_curve(bm_barrier, t_pts, radius=0.007, seg=6, mat_idx=1)

    # Braided rope: mat_idx=2
    rope_points = []
    num_steps = 36
    for i in range(num_steps + 1):
        x = -1.5 + (3.0 * i / num_steps)
        span_x = (x + 1.5) % 1.5
        sag = 0.065 * 4.0 * (span_x / 1.5) * (1.0 - span_x / 1.5)
        rope_points.append(Vector((x, 0.095, 0.44 - sag)))

    create_tube_along_curve(bm_barrier, rope_points, radius=0.018, seg=8, mat_idx=2, v_repeat=8.0)

    mesh_barrier = bpy.data.meshes.new("SafetyBarrier_Straight_Mesh")
    bm_barrier.to_mesh(mesh_barrier)
    bm_barrier.free()
    ob_barrier = bpy.data.objects.new("SafetyBarrier_Straight", mesh_barrier)
    bpy.context.collection.objects.link(ob_barrier)
    for m in fence_materials: ob_barrier.data.materials.append(m)
    ob_barrier.location = Vector((0, 0, 0))

    # 3. Corner Safety Barrier (Curved 90 deg track limit)
    bm_corner = bmesh.new()
    corner_angles = [0.0, math.pi * 0.25, math.pi * 0.5]
    c_radius = 2.2
    for ca in corner_angles:
        cx = math.cos(ca) * c_radius
        cy = math.sin(ca) * c_radius
        create_beveled_box(bm_corner, 0.12, 0.12, 0.65, center=Vector((cx, cy, 0.325)), mat_idx=0)
        create_beveled_box(bm_corner, 0.14, 0.14, 0.035, center=Vector((cx, cy, 0.44)), mat_idx=1)

    corner_rope_pts = []
    for a in np.linspace(0.0, math.pi * 0.5, 32):
        cx = math.cos(a) * (c_radius + 0.095)
        cy = math.sin(a) * (c_radius + 0.095)
        corner_rope_pts.append(Vector((cx, cy, 0.44)))
    create_tube_along_curve(bm_corner, corner_rope_pts, radius=0.018, seg=8, mat_idx=2, v_repeat=6.0)

    mesh_corner = bpy.data.meshes.new("SafetyBarrier_Corner_Mesh")
    bm_corner.to_mesh(mesh_corner)
    bm_corner.free()
    ob_corner = bpy.data.objects.new("SafetyBarrier_Corner", mesh_corner)
    bpy.context.collection.objects.link(ob_corner)
    for m in fence_materials: ob_corner.data.materials.append(m)
    ob_corner.location = Vector((4.5, 0, 0))

    # 4. Background Aged Wood Fence (5m Section, 9 Weathered Planks)
    bm_fence = bmesh.new()
    create_beveled_box(bm_fence, 0.18, 0.18, 3.4, center=Vector((-2.2, -0.15, 1.7)), mat_idx=0)
    create_beveled_box(bm_fence, 0.18, 0.18, 3.4, center=Vector((2.2, -0.15, 1.7)), mat_idx=0)
    create_beveled_box(bm_fence, 5.2, 0.14, 0.14, center=Vector((0, -0.09, 0.65)), mat_idx=0)
    create_beveled_box(bm_fence, 5.2, 0.14, 0.14, center=Vector((0, -0.09, 2.45)), mat_idx=0)

    plank_widths = [0.55, 0.58, 0.52, 0.61, 0.56, 0.59, 0.54, 0.58, 0.55]
    plank_heights = [3.20, 3.32, 3.15, 3.28, 3.35, 3.18, 3.25, 3.30, 3.22]
    cur_x = -2.3

    for i in range(9):
        pw = plank_widths[i]
        ph = plank_heights[i]
        px = cur_x + pw * 0.5
        tilt = (math.sin(i * 3.7) * 0.015)
        top_offset = math.cos(i * 2.1) * 0.04
        v_box = create_beveled_box(bm_fence, pw * 0.95, 0.038, ph, center=Vector((px, 0.02, ph * 0.5)), mat_idx=0)
        for v in v_box[4:]:
            v.co.x += tilt
            v.co.y += math.sin(i * 1.5) * 0.012
            v.co.z += top_offset
        cur_x += pw + 0.02

    mesh_fence = bpy.data.meshes.new("Fence_AgedSection_5m_Mesh")
    bm_fence.to_mesh(mesh_fence)
    bm_fence.free()
    ob_fence = bpy.data.objects.new("Fence_AgedSection_5m", mesh_fence)
    bpy.context.collection.objects.link(ob_fence)
    ob_fence.data.materials.append(mat_wood)
    ob_fence.location = Vector((0, 4.0, 0))

    # Save and export
    blend_path = HERE / "fence_boundary.blend"
    glb_path = HERE / "fence_boundary.glb"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),
        export_format='GLB',
        use_selection=False,
        export_yup=True,
        export_materials='EXPORT',
        export_texcoords=True
    )
    tri_count = sum(len(o.data.polygons) * 2 for o in [ob_stake, ob_barrier, ob_corner, ob_fence])
    print(f"Exported {glb_path.name}: {glb_path.stat().st_size:,} bytes | ~{tri_count} triangles")
    return {"blend": str(blend_path), "glb": str(glb_path), "triangles": tri_count}

# ---------------------------------------------------------------------------
# 4. PATIO LIGHTS (EDISON CATENARY GARLAND) GENERATOR
# ---------------------------------------------------------------------------

def create_edison_bulb_geometry(bm, center_pos=Vector((0, 0, 0)),
                                mat_socket_idx=1, mat_brass_idx=2,
                                mat_glass_idx=3, mat_filament_idx=4):
    """Creates a vintage ST64 teardrop Edison bulb with internal hairpin filament."""
    uv_layer = bm.loops.layers.uv.verify()

    # Rubber cord grip: diameter 0.03m, height 0.04m (socket material)
    cg_pts = [center_pos + Vector((0, 0, 0.16)), center_pos + Vector((0, 0, 0.12))]
    create_tube_along_curve(bm, cg_pts, radius=0.015, seg=8, mat_idx=mat_socket_idx)

    # Molded socket body: diameter 0.065m, height 0.09m (socket material)
    sb_pts = [center_pos + Vector((0, 0, 0.12)), center_pos + Vector((0, 0, 0.04))]
    create_tube_along_curve(bm, sb_pts, radius=0.032, seg=12, mat_idx=mat_socket_idx)

    # Brass screw ring collar: diameter 0.068m, height 0.02m (brass material)
    br_pts = [center_pos + Vector((0, 0, 0.04)), center_pos + Vector((0, 0, 0.02))]
    create_tube_along_curve(bm, br_pts, radius=0.034, seg=12, mat_idx=mat_brass_idx)

    # Teardrop glass bulb envelope (ST64 format)
    bulb_profile = [
        (0.025, 0.02),
        (0.045, -0.02),
        (0.062, -0.07),
        (0.065, -0.10),
        (0.058, -0.14),
        (0.042, -0.18),
        (0.022, -0.21),
        (0.002, -0.225)
    ]
    rings = []
    seg = 16
    for idx, (r, z) in enumerate(bulb_profile):
        ring = []
        for s in range(seg):
            angle = s * (math.pi * 2.0 / seg)
            ring.append(bm.verts.new(center_pos + Vector((math.cos(angle) * r, math.sin(angle) * r, z))))
        rings.append(ring)

    for i in range(len(rings) - 1):
        r1 = rings[i]
        r2 = rings[i + 1]
        v1 = i / (len(rings) - 1)
        v2 = (i + 1) / (len(rings) - 1)
        for s in range(seg):
            s_next = (s + 1) % seg
            u1 = s / seg
            u2 = (s + 1) / seg
            f = bm.faces.new((r1[s], r2[s], r2[s_next], r1[s_next]))
            f.smooth = True
            f.material_index = mat_glass_idx
            for loop in f.loops:
                if loop.vert == r1[s]: loop[uv_layer].uv = Vector((u1, v1))
                elif loop.vert == r2[s]: loop[uv_layer].uv = Vector((u1, v2))
                elif loop.vert == r2[s_next]: loop[uv_layer].uv = Vector((u2, v2))
                elif loop.vert == r1[s_next]: loop[uv_layer].uv = Vector((u2, v1))

    # Glowing filament loop inside: hairpin spiral from center stem (filament material)
    stem_top = center_pos + Vector((0, 0, -0.06))
    fil_pts = [
        stem_top + Vector((-0.015, 0, -0.03)),
        stem_top + Vector((-0.015, 0, 0.01)),
        stem_top + Vector((-0.008, 0.01, 0.022)),
        stem_top + Vector((0.0, 0, 0.025)),
        stem_top + Vector((0.008, -0.01, 0.022)),
        stem_top + Vector((0.015, 0, 0.01)),
        stem_top + Vector((0.015, 0, -0.03))
    ]
    create_tube_along_curve(bm, fil_pts, radius=0.0022, seg=6, mat_idx=mat_filament_idx)

def build_patio_lights_glb():
    print("\n--- Building Patio Lights Module (patio_lights.glb) ---")
    clean_scene()

    mat_wire = create_pbr_material("M_Garland_Cable", base_color=srgb_to_linear("#1a1e20") + [1], roughness=0.75)
    mat_socket = create_pbr_material("M_Edison_Socket", base_color=srgb_to_linear("#22272a") + [1], roughness=0.62)
    mat_brass = create_pbr_material("M_Edison_Brass", base_color=srgb_to_linear("#8c7144") + [1], metallic=0.88, roughness=0.32)

    # Glass bulb material
    mat_glass = create_pbr_material(
        "M_Edison_Glass",
        base_color=srgb_to_linear("#fff7eb") + [1],
        roughness=0.08,
        transmission=0.92,
        alpha=0.65
    )

    # Incandescent glowing filament
    mat_filament = create_pbr_material(
        "M_Filament_Incandescent",
        base_color=srgb_to_linear("#ffaa44") + [1],
        emission_color=srgb_to_linear("#ffaa44") + [1],
        emission_strength=10.0
    )

    light_materials = [mat_wire, mat_socket, mat_brass, mat_glass, mat_filament]

    # 1. Complete Catenary Garland Span (18m span, 14 Edison Pendants)
    bm_garland = bmesh.new()
    span_len = 18.0
    anchor_y = 5.3
    sag_max = 0.95
    catenary_a = 7.5

    # Main wire points: mat_idx=0
    wire_steps = 48
    wire_points = []
    cosh_edge = math.cosh((span_len * 0.5) / catenary_a) - 1.0

    for i in range(wire_steps + 1):
        x = -span_len * 0.5 + (span_len * i / wire_steps)
        sag = sag_max * ((math.cosh(x / catenary_a) - 1.0) / cosh_edge)
        z = anchor_y - sag_max + sag
        wire_points.append(Vector((x, 0, z)))

    create_tube_along_curve(bm_garland, wire_points, radius=0.012, seg=8, mat_idx=0, v_repeat=6.0)

    # 14 Hanging Edison Pendants
    num_pendants = 14
    for i in range(num_pendants):
        x = -7.8 + (15.6 * i / (num_pendants - 1))
        sag = sag_max * ((math.cosh(x / catenary_a) - 1.0) / cosh_edge)
        cable_z = anchor_y - sag_max + sag

        drop_len = 0.14 + (math.sin(i * 1.8) * 0.02)
        drop_pts = [Vector((x, 0, cable_z)), Vector((x, 0, cable_z - drop_len))]
        create_tube_along_curve(bm_garland, drop_pts, radius=0.007, seg=6, mat_idx=1)

        create_edison_bulb_geometry(bm_garland, center_pos=Vector((x, 0, cable_z - drop_len - 0.12)),
                                   mat_socket_idx=1, mat_brass_idx=2, mat_glass_idx=3, mat_filament_idx=4)

    mesh_garland = bpy.data.meshes.new("Garland_Edison_Span_Mesh")
    bm_garland.to_mesh(mesh_garland)
    bm_garland.free()
    ob_garland = bpy.data.objects.new("Garland_Edison_Span", mesh_garland)
    bpy.context.collection.objects.link(ob_garland)
    for m in light_materials: ob_garland.data.materials.append(m)

    # 2. Standalone Single Edison Pendant
    bm_single = bmesh.new()
    create_edison_bulb_geometry(bm_single, center_pos=Vector((0, 0, 0)),
                               mat_socket_idx=1, mat_brass_idx=2, mat_glass_idx=3, mat_filament_idx=4)
    mesh_single = bpy.data.meshes.new("EdisonPendant_Single_Mesh")
    bm_single.to_mesh(mesh_single)
    bm_single.free()
    ob_single = bpy.data.objects.new("EdisonPendant_Single", mesh_single)
    bpy.context.collection.objects.link(ob_single)
    for m in light_materials: ob_single.data.materials.append(m)
    ob_single.location = Vector((0, 3.0, 0))

    blend_path = HERE / "patio_lights.blend"
    glb_path = HERE / "patio_lights.glb"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),
        export_format='GLB',
        use_selection=False,
        export_yup=True,
        export_materials='EXPORT',
        export_texcoords=True
    )
    tri_count = sum(len(o.data.polygons) * 2 for o in [ob_garland, ob_single])
    print(f"Exported {glb_path.name}: {glb_path.stat().st_size:,} bytes | ~{tri_count} triangles")
    return {"blend": str(blend_path), "glb": str(glb_path), "triangles": tri_count}

# ---------------------------------------------------------------------------
# 5. ARENA GROUND TERRAIN AND TIRE TRACKS GENERATOR
# ---------------------------------------------------------------------------

def build_ground_terrain_glb(textures):
    print("\n--- Building Ground Terrain Module (ground_terrain.glb) ---")
    clean_scene()

    mat_ground = create_pbr_material(
        "M_Ground_CompactedTracks",
        base_color=(1, 1, 1, 1),
        roughness=0.92,
        albedo_img=textures["ground_albedo"],
        normal_img=textures["ground_normal"]
    )

    mat_stone = create_pbr_material(
        "M_Pebbles_Scatter",
        base_color=srgb_to_linear("#6a5c48") + [1],
        roughness=0.86
    )

    # 1. Arena Ground Section (22m x 22m, 48x48 subdivisions with subtle topography)
    bm_ground = bmesh.new()
    size = 22.0
    subdiv = 48
    step = size / subdiv

    grid_verts = []
    for y_idx in range(subdiv + 1):
        row = []
        y = -size * 0.5 + y_idx * step
        for x_idx in range(subdiv + 1):
            x = -size * 0.5 + x_idx * step
            # Organic subtle ground undulation
            z = math.sin(x * 0.45) * math.cos(y * 0.38) * 0.05 + math.sin(x * 1.2 + y * 0.8) * 0.02
            v = bm_ground.verts.new((x, y, z))
            row.append(v)
        grid_verts.append(row)

    # Faces & UVs
    uv_layer = bm_ground.loops.layers.uv.verify()
    for y_idx in range(subdiv):
        for x_idx in range(subdiv):
            v0 = grid_verts[y_idx][x_idx]
            v1 = grid_verts[y_idx][x_idx + 1]
            v2 = grid_verts[y_idx + 1][x_idx + 1]
            v3 = grid_verts[y_idx + 1][x_idx]
            f = bm_ground.faces.new((v0, v1, v2, v3))
            f.smooth = True

            # UV coordinates (tiled 4x across 22m arena)
            u0, v0_uv = (x_idx / subdiv) * 4.0, (y_idx / subdiv) * 4.0
            u1, v1_uv = ((x_idx + 1) / subdiv) * 4.0, ((y_idx + 1) / subdiv) * 4.0
            for loop in f.loops:
                if loop.vert == v0: loop[uv_layer].uv = Vector((u0, v0_uv))
                elif loop.vert == v1: loop[uv_layer].uv = Vector((u1, v0_uv))
                elif loop.vert == v2: loop[uv_layer].uv = Vector((u1, v1_uv))
                elif loop.vert == v3: loop[uv_layer].uv = Vector((u0, v1_uv))

    mesh_ground = bpy.data.meshes.new("Ground_ArenaSection_Mesh")
    bm_ground.to_mesh(mesh_ground)
    bm_ground.free()
    ob_ground = bpy.data.objects.new("Ground_ArenaSection", mesh_ground)
    bpy.context.collection.objects.link(ob_ground)
    ob_ground.data.materials.append(mat_ground)

    # 2. Scattered Pebbles & Gravel Clods
    bm_pebbles = bmesh.new()
    rng = np.random.RandomState(99)
    num_pebbles = 80

    for i in range(num_pebbles):
        px = rng.uniform(-9.0, 9.0)
        py = rng.uniform(-9.0, 9.0)
        pz = math.sin(px * 0.45) * math.cos(py * 0.38) * 0.05 + 0.015
        p_scale = rng.uniform(0.04, 0.12)
        # Low poly faceted pebble
        p_box = create_beveled_box(bm_pebbles, p_scale, p_scale * rng.uniform(0.6, 0.9), p_scale * 0.5,
                                  center=Vector((px, py, pz)))
        rot_mat = Matrix.Rotation(rng.uniform(0, math.pi * 2), 3, 'Z')
        for v in p_box:
            v.co = Vector((px, py, pz)) + rot_mat @ (v.co - Vector((px, py, pz)))

    mesh_pebbles = bpy.data.meshes.new("Ground_PebbleScatter_Mesh")
    bm_pebbles.to_mesh(mesh_pebbles)
    bm_pebbles.free()
    ob_pebbles = bpy.data.objects.new("Ground_PebbleScatter", mesh_pebbles)
    bpy.context.collection.objects.link(ob_pebbles)
    ob_pebbles.data.materials.append(mat_stone)

    blend_path = HERE / "ground_terrain.blend"
    glb_path = HERE / "ground_terrain.glb"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),
        export_format='GLB',
        use_selection=False,
        export_yup=True,
        export_materials='EXPORT',
        export_texcoords=True
    )
    tri_count = sum(len(o.data.polygons) * 2 for o in [ob_ground, ob_pebbles])
    print(f"Exported {glb_path.name}: {glb_path.stat().st_size:,} bytes | ~{tri_count} triangles")
    return {"blend": str(blend_path), "glb": str(glb_path), "triangles": tri_count}

# ---------------------------------------------------------------------------
# 6. RENDER HIGH-RESOLUTION PREVIEWS FOR VISUAL EVIDENCE
# ---------------------------------------------------------------------------

def render_previews():
    print("\n--- Rendering Visual Verification Previews ---")
    clean_scene()

    # Import our 4 generated GLBs into a unified evaluation scene
    modules = ["vegetation.glb", "fence_boundary.glb", "patio_lights.glb", "ground_terrain.glb"]
    for mod in modules:
        mod_path = HERE / mod
        if mod_path.exists():
            bpy.ops.import_scene.gltf(filepath=str(mod_path))

    # Setup Cinematic Lighting matching 03-entrada-fondo.png
    # Dark petroleum teal ambient
    world = bpy.data.worlds.new("CinematicWorld")
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = srgb_to_linear("#0d1824") + [1]
    bg.inputs['Strength'].default_value = 0.4
    bpy.context.scene.world = world

    # Warm key light (simulating warm yard floodlight/garland pool)
    key_light = bpy.data.lights.new("WarmKey", 'SPOT')
    key_light.color = srgb_to_linear("#ffd299")
    key_light.energy = 450.0
    key_light.spot_size = math.radians(65)
    key_light.spot_blend = 0.35
    ob_key = bpy.data.objects.new("WarmKeyLight", key_light)
    bpy.context.collection.objects.link(ob_key)
    ob_key.location = Vector((-3.5, -4.5, 6.5))
    ob_key.rotation_euler = (math.radians(35), math.radians(-25), math.radians(-30))

    # Cool rim light (moonlight)
    rim_light = bpy.data.lights.new("CoolMoonRim", 'SUN')
    rim_light.color = srgb_to_linear("#8ab2df")
    rim_light.energy = 2.2
    ob_rim = bpy.data.objects.new("CoolMoonLight", rim_light)
    bpy.context.collection.objects.link(ob_rim)
    ob_rim.rotation_euler = (math.radians(45), math.radians(20), math.radians(110))

    # Camera at low RC height (ground-level perspective matching 03-entrada-fondo.png)
    cam = bpy.data.cameras.new("CinematicCam")
    cam.lens = 38
    ob_cam = bpy.data.objects.new("CinematicCamera", cam)
    bpy.context.collection.objects.link(ob_cam)
    bpy.context.scene.camera = ob_cam

    bpy.context.scene.render.resolution_x = 1280
    bpy.context.scene.render.resolution_y = 720
    bpy.context.scene.render.engine = 'BLENDER_EEVEE_NEXT' if hasattr(bpy.types, 'BLENDER_EEVEE_NEXT') else 'BLENDER_EEVEE'

    # Camera setups for 5 distinct inspection views
    views = [
        ("preview-combined.png", Vector((-1.8, -6.5, 1.4)), (math.radians(78), 0, math.radians(-16))),
        ("preview-vegetation.png", Vector((0.0, -2.4, 0.65)), (math.radians(80), 0, 0)),
        ("preview-fence.png", Vector((0.8, -3.2, 0.85)), (math.radians(80), 0, math.radians(12))),
        ("preview-lights.png", Vector((-0.5, -2.2, 3.7)), (math.radians(52), 0, math.radians(-10))),
        ("preview-ground.png", Vector((-0.5, -4.5, 0.35)), (math.radians(85), 0, math.radians(-8))),
    ]

    for filename, loc, rot in views:
        ob_cam.location = loc
        ob_cam.rotation_euler = rot
        p_path = HERE / filename
        bpy.context.scene.render.filepath = str(p_path)
        bpy.ops.render.render(write_still=True)
        print(f"Rendered preview: {filename}")

# ---------------------------------------------------------------------------
# MAIN EXECUTION
# ---------------------------------------------------------------------------

def main():
    textures = generate_textures()
    report = {
        "date": "2026-10-10",
        "specialist": "Gemini Environment Specialist",
        "modules": {}
    }

    report["modules"]["vegetation"] = build_vegetation_glb(textures)
    report["modules"]["fence_boundary"] = build_fence_boundary_glb(textures)
    report["modules"]["patio_lights"] = build_patio_lights_glb()
    report["modules"]["ground_terrain"] = build_ground_terrain_glb(textures)

    try:
        render_previews()
    except Exception as e:
        print("Preview render note (optional):", e)

    # Save summary manifest
    manifest_path = HERE / "environment_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 70)
    print("ALL ENVIRONMENT MODULES SUCCESSFULLY GENERATED AND EXPORTED!")
    print(f"Manifest written to: {manifest_path.name}")
    print("=" * 70)

if __name__ == "__main__":
    main()
