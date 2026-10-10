"""Script de generación reproducible para el Buggy RC Industrial de Junked Metal.
Eleva la fidelidad al nivel cinematográfico de assets-src/intro/cinematic-v1/08-buggy.png:
1. Chapa de acero estampada/doblada, remaches, bridas, jaula pesada con X-brace, techo empernado, alerón y paragolpes industrial.
2. Doble trapecio (A-arms) independientes, amortiguadores coilover con vástago cromado, resorte helicoidal 3D, barra de dirección.
3. Ruedas todo terreno con neumáticos crawler/tractor profundos (chevron + nervaduras laterales), llantas deep dish con beadlock y 5 tuercas.
4. Dos faros rectangulares empotrados con lente Fresnel y emisión cálida tungsteno (#ffd175).
5. Cabina con asiento baquet, volante, piloto soldadito con casco militar y manos al volante, antena flexible con punta cian.
6. Master PBR con desgaste de pintura realista (desconchones en bordes, imprimación oscura, acero desnudo) y mapas Albedo/Normal/ORM.

Uso:
  /Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/cinematic-3d/gemini-buggy/build_buggy.py
"""

import bpy, bmesh, math, sys, json, os, time, random
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = HERE

def G(x, y, z):
    """Convierte coordenadas del juego (x derecha, y arriba, z adelante) a Blender (Z arriba, Y frente)."""
    return Vector((-x, z, y))

def _lin(hexc):
    """Convierte color hex sRGB a espacio lineal."""
    c = [int(hexc[i:i+2], 16) / 255.0 for i in (1, 3, 5)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]

def generate_master_pbr_textures(out_dir: Path, size=1024):
    """Genera texturas PBR maestras de 1024x1024: Albedo (sRGB), Normal y ORM con desgaste realista."""
    print(f"Generando texturas PBR maestras ({size}x{size})...")
    t0 = time.time()
    out_dir = out_dir.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Capa base: Pintura amarilla industrial (#e5a019) en espacio sRGB para archivo PNG
    # #e5a019 -> R=229/255=0.898, G=160/255=0.627, B=25/255=0.098
    base_r, base_g, base_b = 0.898, 0.627, 0.098
    
    alb_pixels = [base_r, base_g, base_b, 1.0] * (size * size)
    # Normal neutra tangencial: (0.5, 0.5, 1.0, 1.0)
    nor_pixels = [0.5, 0.5, 1.0, 1.0] * (size * size)
    # ORM base: AO=1.0, Roughness=0.42 (esmalte semi-brillo), Metallic=0.08, Alpha=1.0
    orm_pixels = [1.0, 0.42, 0.08, 1.0] * (size * size)
    
    rng = random.Random(4281)
    
    def draw_chip(cx, cy, r_outer, r_inner):
        r_out_sq = r_outer * r_outer
        r_in_sq = r_inner * r_inner
        min_x = max(0, int(cx - r_outer))
        max_x = min(size - 1, int(cx + r_outer))
        min_y = max(0, int(cy - r_outer))
        max_y = min(size - 1, int(cy + r_outer))
        
        for y in range(min_y, max_y + 1):
            dy = y - cy
            row_idx = y * size * 4
            for x in range(min_x, max_x + 1):
                dx = x - cx
                d_sq = dx * dx + dy * dy
                if d_sq > r_out_sq:
                    continue
                idx = row_idx + x * 4
                
                jitter = (math.sin(x * 0.35) + math.cos(y * 0.35)) * 0.18
                eff_d_sq = d_sq * (1.0 + jitter)
                
                if eff_d_sq <= r_in_sq:
                    # Acero desnudo raspado y pulido (#8c949c en sRGB: 0.55, 0.58, 0.61)
                    alb_pixels[idx] = 0.55
                    alb_pixels[idx + 1] = 0.58
                    alb_pixels[idx + 2] = 0.61
                    # Normal: micro-rayas direccionales
                    nor_pixels[idx] = 0.5 + math.sin(x * 0.5) * 0.06
                    nor_pixels[idx + 1] = 0.5 + math.cos(y * 0.5) * 0.06
                    # ORM: AO=0.88, Rough=0.28 (acero pulido de baja rugosidad), Metal=0.92 (alta metalicidad)
                    orm_pixels[idx] = 0.88
                    orm_pixels[idx + 1] = 0.28
                    orm_pixels[idx + 2] = 0.92
                else:
                    # Imprimación oscura / óxido (#261e1a en sRGB: 0.15, 0.12, 0.10)
                    alb_pixels[idx] = 0.15
                    alb_pixels[idx + 1] = 0.12
                    alb_pixels[idx + 2] = 0.10
                    # Normal: relieve del escalón de pintura
                    nx_step = (dx / r_outer) * 0.28
                    ny_step = (dy / r_outer) * 0.28
                    nor_pixels[idx] = 0.5 + nx_step
                    nor_pixels[idx + 1] = 0.5 + ny_step
                    # ORM: AO=0.55, Rough=0.92 (imprimación mate porosa), Metal=0.15
                    orm_pixels[idx] = 0.55
                    orm_pixels[idx + 1] = 0.92
                    orm_pixels[idx + 2] = 0.15

    # 400 desconchones irregulares distribuidos
    for _ in range(400):
        cx = rng.randint(15, size - 15)
        cy = rng.randint(15, size - 15)
        r_out = rng.uniform(5, 26)
        r_in = r_out * rng.uniform(0.45, 0.75)
        draw_chip(cx, cy, r_out, r_in)
        
    # 160 raspaduras lineales
    for _ in range(160):
        sx = rng.randint(15, size - 15)
        sy = rng.randint(15, size - 15)
        ang = rng.uniform(0, math.pi)
        length = rng.uniform(15, 65)
        steps = int(length)
        for s_i in range(steps):
            px = int(sx + math.cos(ang) * s_i)
            py = int(sy + math.sin(ang) * s_i)
            if 0 <= px < size and 0 <= py < size:
                draw_chip(px, py, 2.8, 1.4)

    maps = {
        "buggy-albedo": (alb_pixels, "sRGB"),
        "buggy-normal": (nor_pixels, "Non-Color"),
        "buggy-orm": (orm_pixels, "Non-Color")
    }
    
    images = {}
    for name, (pixels, colorspace) in maps.items():
        img = bpy.data.images.new(name, size, size, alpha=True)
        img.colorspace_settings.name = colorspace
        img.pixels.foreach_set(pixels)
        out_path = str((out_dir / f"{name}.png").resolve())
        img.filepath_raw = out_path
        img.file_format = 'PNG'
        img.save()
        images[name] = img
        print(f"Guardado {out_path} ({size}x{size})")
        
    print(f"Texturas PBR generadas en {time.time() - t0:.2f} s")
    return images

class BuggyBuilder:
    def __init__(self):
        self.bm = bmesh.new()
        self.mats = []

    def _mi(self, m):
        if m not in self.mats:
            self.mats.append(m)
        return self.mats.index(m)

    def _tag(self, verts, m):
        mi = self._mi(m)
        for f in {f for v in verts for f in v.link_faces}:
            f.material_index = mi
            f.smooth = True

    def box(self, c, size, m):
        w, h, d = size
        M = Matrix.Translation(G(*c)) @ Matrix.Diagonal((w / 2, d / 2, h / 2, 1))
        res = bmesh.ops.create_cube(self.bm, size=2, matrix=M)
        self._tag(res["verts"], m)
        return res["verts"]

    def cyl(self, c, r, h, m, seg=16, axis="z"):
        M = Matrix.Translation(G(*c))
        if axis == "x":
            M @= Matrix.Rotation(math.pi / 2, 4, "Y")
        elif axis == "y":
            M @= Matrix.Rotation(math.pi / 2, 4, "X")
        res = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r, depth=h, matrix=M)
        self._tag(res["verts"], m)
        return res["verts"]

    def sph(self, c, r, m, seg=12):
        M = Matrix.Translation(G(*c)) @ Matrix.Diagonal((r, r, r, 1))
        res = bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=max(6, seg - 2), radius=1, matrix=M)
        self._tag(res["verts"], m)
        return res["verts"]

    def hex_bolt(self, c, r, h, m, axis="y"):
        """Tornillo o tuerca hexagonal orientada según el eje normal."""
        M = Matrix.Translation(G(*c))
        if axis == "x":
            M @= Matrix.Rotation(math.pi / 2, 4, "Y")
        elif axis == "y":
            M @= Matrix.Rotation(math.pi / 2, 4, "X")
        res = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=6, radius1=r, radius2=r, depth=h, matrix=M)
        self._tag(res["verts"], m)
        return res["verts"]

    def rivet(self, c, r, m, axis="y"):
        """Remache de cabeza redondeada semi-esférica."""
        h = r * 0.65
        M = Matrix.Translation(G(*c))
        if axis == "x":
            M @= Matrix.Rotation(math.pi / 2, 4, "Y")
        elif axis == "y":
            M @= Matrix.Rotation(math.pi / 2, 4, "X")
        res = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=10, radius1=r, radius2=r * 0.8, depth=h, matrix=M)
        self._tag(res["verts"], m)
        return res["verts"]

    def tube(self, pts, r, m, seg=10, closed=True):
        """Tubo suave con extremos cerrados."""
        P = [G(*p) for p in pts]
        if len(P) < 2: return
        up = "Y" if abs((P[-1] - P[0]).normalized().x) > 0.7 else "X"
        rings = []
        for i, p in enumerate(P):
            q = (P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]).to_track_quat("Z", up)
            rings.append([self.bm.verts.new(p + q @ Vector((math.cos(a) * r, math.sin(a) * r, 0)))
                          for a in (2 * math.pi * k / seg for k in range(seg))])
        for a, b in zip(rings, rings[1:]):
            for i in range(seg):
                j = (i + 1) % seg
                self.bm.faces.new((a[i], a[j], b[j], b[i]))
        if closed:
            self.bm.faces.new(rings[0][::-1])
            self.bm.faces.new(rings[-1])
        mi = self._mi(m)
        all_verts = [v for r_ring in rings for v in r_ring]
        for f in {f for v in all_verts for f in v.link_faces}:
            f.material_index = mi
            f.smooth = True

    def coil_spring(self, p_start, p_end, spring_r, wire_r, turns, m, seg_per_turn=14, wire_seg=6):
        """Muelle helicoidal 3D volumétrico cerrado."""
        p0 = G(*p_start)
        p1 = G(*p_end)
        axis = p1 - p0
        L = axis.length
        if L < 1e-4: return
        quat = axis.to_track_quat("Z", "X")
        total_steps = int(turns * seg_per_turn)
        rings = []
        for step in range(total_steps + 1):
            frac = step / total_steps
            theta = frac * turns * 2 * math.pi
            local_c = Vector((math.cos(theta) * spring_r, math.sin(theta) * spring_r, frac * L))
            world_c = p0 + quat @ local_c
            tangent_local = Vector((-math.sin(theta) * spring_r * turns * 2 * math.pi,
                                     math.cos(theta) * spring_r * turns * 2 * math.pi, L)).normalized()
            t_quat = (quat @ tangent_local).to_track_quat("Z", "Y")
            ring_verts = []
            for a_i in range(wire_seg):
                ang = 2 * math.pi * a_i / wire_seg
                offset = t_quat @ Vector((math.cos(ang) * wire_r, math.sin(ang) * wire_r, 0))
                ring_verts.append(self.bm.verts.new(world_c + offset))
            rings.append(ring_verts)

        for r1, r2 in zip(rings, rings[1:]):
            for i in range(wire_seg):
                j = (i + 1) % wire_seg
                self.bm.faces.new((r1[i], r1[j], r2[j], r2[i]))
        self.bm.faces.new(rings[0][::-1])
        self.bm.faces.new(rings[-1])

        mi = self._mi(m)
        all_verts = [v for r_ring in rings for v in r_ring]
        for f in {f for v in all_verts for f in v.link_faces}:
            f.material_index = mi
            f.smooth = True

    def object(self, name):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        me = bpy.data.meshes.new(name)
        self.bm.to_mesh(me)
        self.bm.free()
        me.update()
        ob = bpy.data.objects.new(name, me)
        for m in self.mats:
            me.materials.append(m)
        bpy.context.collection.objects.link(ob)
        return ob

def create_materials(pbr_images):
    """Crea los materiales PBR conectados a las texturas maestras para exportación glTF."""
    def make_mat(name, hexc, rough=0.5, metal=0.0, emit=0.0, emit_hex=None):
        m = bpy.data.materials.new(name)
        p = m.node_tree.nodes["Principled BSDF"]
        c = _lin(hexc)
        p.inputs["Base Color"].default_value = (*c, 1.0)
        p.inputs["Roughness"].default_value = rough
        p.inputs["Metallic"].default_value = metal
        if emit > 0.0:
            p.inputs["Emission Color"].default_value = (*_lin(emit_hex or hexc), 1.0)
            p.inputs["Emission Strength"].default_value = emit
        return m

    mats = {
        # Pintura amarilla industrial (#e5a019)
        "Paint": make_mat("Paint", "#e5a019", rough=0.42, metal=0.08),
        # Acero estructural industrial y chasis
        "Metal": make_mat("Metal", "#828a93", rough=0.30, metal=0.90),
        "Chassis": make_mat("Chassis", "#20252b", rough=0.58, metal=0.45),
        # Cromo pulido para vástagos de amortiguador
        "Chrome": make_mat("Chrome", "#f0f4f8", rough=0.06, metal=0.98),
        # Acero de muelle helicoidal
        "Spring": make_mat("Spring", "#adb6bf", rough=0.20, metal=0.88),
        # Goma profunda de neumático crawler mate
        "Rubber": make_mat("Rubber", "#1a1d20", rough=0.94, metal=0.0),
        # Faros tungsteno con emisión ámbar cálida (#ffd175)
        "Lamp": make_mat("Lamp", "#ffd175", rough=0.15, metal=0.1, emit=8.0, emit_hex="#ffd175"),
        # Cristal / lente Fresnel
        "Glass": make_mat("Glass", "#fff4db", rough=0.10, metal=0.05),
        # Piloto soldadito
        "Pilot": make_mat("Pilot", "#4b5d2a", rough=0.52, metal=0.0),
        "PilotHelmet": make_mat("PilotHelmet", "#425324", rough=0.40, metal=0.25),
        "PilotVisor": make_mat("PilotVisor", "#15202c", rough=0.12, metal=0.60),
        # Punta de antena cian brillante
        "Cyan": make_mat("Antenna", "#00c8db", rough=0.25, metal=0.45, emit=2.0, emit_hex="#00c8db"),
    }
    
    # Conectar los mapas PBR maestros al material Paint para exportación glTF estándar
    paint_mat = mats["Paint"]
    nodes = paint_mat.node_tree.nodes
    links = paint_mat.node_tree.links
    p_bsdf = nodes.get("Principled BSDF")
    
    # 1. Albedo
    tex_alb = nodes.new("ShaderNodeTexImage")
    tex_alb.image = pbr_images["buggy-albedo"]
    links.new(tex_alb.outputs["Color"], p_bsdf.inputs["Base Color"])
    
    # 2. Normal Map
    tex_nor = nodes.new("ShaderNodeTexImage")
    tex_nor.image = pbr_images["buggy-normal"]
    norm_node = nodes.new("ShaderNodeNormalMap")
    norm_node.inputs["Strength"].default_value = 1.0
    links.new(tex_nor.outputs["Color"], norm_node.inputs["Color"])
    links.new(norm_node.outputs["Normal"], p_bsdf.inputs["Normal"])
    
    # 3. ORM (Roughness + Metallic)
    tex_orm = nodes.new("ShaderNodeTexImage")
    tex_orm.image = pbr_images["buggy-orm"]
    sep_col = nodes.new("ShaderNodeSeparateColor")
    links.new(tex_orm.outputs["Color"], sep_col.inputs["Color"])
    links.new(sep_col.outputs["Green"], p_bsdf.inputs["Roughness"])
    links.new(sep_col.outputs["Blue"], p_bsdf.inputs["Metallic"])
    
    return mats

def build_chassis_and_body(b: BuggyBuilder, M):
    """Construye la carrocería completa, chasis, suspensión, jaula, alerón, cabina y piloto."""
    
    # 1. CHASIS TUB Y SKID PLATE (Chapa gruesa estampada con nervios longitudinales)
    b.box((0, 0.22, 0.05), (1.36, 0.12, 2.45), M["Chassis"])
    b.box((0, 0.27, 1.34), (1.18, 0.10, 0.32), M["Chassis"])
    for s in (-1, 1):
        b.box((s * 0.62, 0.20, 0.05), (0.10, 0.06, 2.30), M["Metal"])
        b.box((s * 0.66, 0.26, 0.05), (0.04, 0.14, 2.20), M["Chassis"])
    
    # Bulkheads de suspensión
    b.box((0, 0.38, 0.95), (0.68, 0.32, 0.35), M["Chassis"])
    b.box((0, 0.42, -0.90), (0.76, 0.38, 0.45), M["Chassis"])

    # 2. CAPÓ DE CHAPA ESTAMPADA CON FACETAS Y NERVIO CENTRAL (Hood)
    hood_verts = [b.bm.verts.new(G(x, y, z)) for x, y, z in [
        (-0.66, 0.78, 0.35), (0.66, 0.78, 0.35),
        (-0.52, 0.49, 1.44), (0.52, 0.49, 1.44),
        (-0.66, 0.54, 0.35), (0.66, 0.54, 0.35),
        (-0.52, 0.36, 1.44), (0.52, 0.36, 1.44),
    ]]
    for f_idx in [(0, 1, 3, 2), (4, 6, 7, 5), (0, 2, 6, 4), (1, 5, 7, 3), (2, 3, 7, 6), (0, 4, 5, 1)]:
        f = b.bm.faces.new([hood_verts[i] for i in f_idx])
        f.material_index = b._mi(M["Paint"])
        f.smooth = True

    # Nervio central estampado / toma de aire longitudinal en el capó
    cowl_verts = [b.bm.verts.new(G(x, y, z)) for x, y, z in [
        (-0.16, 0.82, 0.36), (0.16, 0.82, 0.36),
        (-0.11, 0.53, 1.35), (0.11, 0.53, 1.35),
        (-0.16, 0.76, 0.36), (0.16, 0.76, 0.36),
        (-0.11, 0.48, 1.35), (0.11, 0.48, 1.35),
    ]]
    for f_idx in [(0, 1, 3, 2), (0, 2, 6, 4), (1, 5, 7, 3), (2, 3, 7, 6)]:
        f = b.bm.faces.new([cowl_verts[i] for i in f_idx])
        f.material_index = b._mi(M["Paint"])
        f.smooth = True

    # Ranura de ventilación frontal de la toma de aire
    b.box((0, 0.50, 1.36), (0.20, 0.04, 0.04), M["Chassis"])

    # Bridas y remaches visibles a lo largo de las costuras laterales del capó
    for s in (-1, 1):
        for i in range(8):
            t = i / 7.0
            rz = 0.42 + t * 0.98
            ry = 0.76 - t * 0.25
            rx = s * (0.63 - t * 0.13)
            b.rivet((rx, ry, rz), 0.018, M["Metal"], axis="y")

    # 3. PANELES LATERALES (Side pods / flank plates)
    for s in (-1, 1):
        b.box((s * 0.68, 0.52, -0.05), (0.10, 0.44, 1.65), M["Paint"])
        b.box((s * 0.69, 0.73, -0.05), (0.07, 0.06, 1.60), M["Metal"])
        for l_i in range(4):
            lz = -0.35 + l_i * 0.22
            b.box((s * 0.74, 0.54, lz), (0.03, 0.05, 0.14), M["Chassis"])
            b.hex_bolt((s * 0.74, 0.62, lz), 0.014, 0.02, M["Metal"], axis="x")

    # Mamparo trasero de la cabina y radiador
    b.box((0, 0.68, -0.72), (1.32, 0.50, 0.16), M["Paint"])
    b.box((0, 0.74, -0.79), (0.85, 0.32, 0.06), M["Chassis"])
    for r_i in range(5):
        b.box((0, 0.62 + r_i * 0.06, -0.82), (0.80, 0.02, 0.03), M["Metal"])

    # Detalle de motor eléctrico brushless y cableado grueso
    b.cyl((0, 0.46, -0.92), 0.18, 0.55, M["Chassis"], seg=16, axis="x")
    for fin_i in range(6):
        fx = -0.22 + fin_i * 0.09
        b.cyl((fx, 0.46, -0.92), 0.20, 0.02, M["Metal"], seg=16, axis="x")
    b.tube([(-0.15, 0.58, -0.85), (-0.18, 0.68, -0.78), (-0.15, 0.72, -0.68)], 0.022, M["Cyan"])
    b.tube([(0.0, 0.60, -0.85), (0.0, 0.70, -0.78), (0.0, 0.72, -0.68)], 0.022, M["Chassis"])
    b.tube([(0.15, 0.58, -0.85), (0.18, 0.68, -0.78), (0.15, 0.72, -0.68)], 0.022, M["Paint"])

    # 4. FAROS RECTANGULARES EMPOTRADOS (Recessed headlights con emisión ámbar cálida)
    for s in (-1, 1):
        hx = s * 0.38
        hy = 0.46
        hz = 1.45
        b.box((hx, hy, hz - 0.02), (0.28, 0.18, 0.12), M["Chassis"])
        b.box((hx, hy, hz + 0.03), (0.31, 0.20, 0.04), M["Metal"])
        for ex in (-0.13, 0.13):
            for ey in (-0.08, 0.08):
                b.hex_bolt((hx + ex, hy + ey, hz + 0.05), 0.010, 0.015, M["Chassis"], axis="z")
        b.box((hx, hy, hz - 0.03), (0.22, 0.13, 0.04), M["Chrome"])
        b.box((hx, hy, hz + 0.01), (0.24, 0.14, 0.03), M["Lamp"])
        for rx in (-0.06, 0.0, 0.06):
            b.cyl((hx + rx, hy, hz + 0.04), 0.008, 0.15, M["Chassis"], seg=6, axis="y")

    # 5. PARAGOLPES DELANTERO TUBULAR / CANAL INDUSTRIAL PESADO (Front bumper)
    b.tube([(-0.70, 0.36, 1.48), (-0.55, 0.38, 1.60), (0.55, 0.38, 1.60), (0.70, 0.36, 1.48)], 0.045, M["Chassis"], seg=10)
    b.tube([(-0.50, 0.26, 1.46), (-0.40, 0.27, 1.56), (0.40, 0.27, 1.56), (0.50, 0.26, 1.46)], 0.036, M["Chassis"], seg=8)
    for bx in (-0.35, 0.35):
        b.tube([(bx, 0.27, 1.56), (bx, 0.38, 1.60)], 0.030, M["Metal"], seg=8)
        b.tube([(bx, 0.36, 1.58), (bx * 0.7, 0.30, 1.25)], 0.035, M["Chassis"], seg=8)
        b.tube([(bx, 0.38, 1.62), (bx + 0.04, 0.34, 1.65), (bx, 0.30, 1.62)], 0.012, M["Metal"], seg=6)

    # 6. JAULA ANTIVUELCO PESADA (Roll cage) CON X-BRACE Y TECHO EMPERNADO
    r_cage = 0.048
    for s in (-1, 1):
        b.tube([(s * 0.58, 0.58, 0.38), (s * 0.48, 1.42, 0.12)], r_cage, M["Metal"], seg=10)
    b.tube([(-0.48, 1.42, 0.12), (0.48, 1.42, 0.12)], r_cage, M["Metal"], seg=8)

    for s in (-1, 1):
        b.tube([(s * 0.58, 0.56, -0.62), (s * 0.48, 1.42, -0.52)], r_cage, M["Metal"], seg=10)
    b.tube([(-0.48, 1.42, -0.52), (0.48, 1.42, -0.52)], r_cage, M["Metal"], seg=8)

    for s in (-1, 1):
        b.tube([(s * 0.48, 1.42, 0.12), (s * 0.48, 1.42, -0.52)], r_cage, M["Metal"], seg=8)
        b.tube([(s * 0.48, 1.42, -0.52), (s * 0.56, 0.58, -1.02)], r_cage * 0.9, M["Metal"], seg=8)

    # X-brace detrás de la cabeza del piloto
    b.tube([(-0.46, 1.38, -0.53), (0.46, 0.62, -0.61)], r_cage * 0.7, M["Metal"], seg=8)
    b.tube([(0.46, 1.38, -0.53), (-0.46, 0.62, -0.61)], r_cage * 0.7, M["Metal"], seg=8)

    # Barras de intrusión lateral
    for s in (-1, 1):
        b.tube([(s * 0.58, 0.62, 0.35), (s * 0.58, 0.90, -0.25), (s * 0.58, 0.60, -0.60)], r_cage * 0.75, M["Metal"], seg=8)
        b.box((s * 0.56, 0.98, -0.05), (0.04, 0.12, 0.12), M["Chassis"])

    # Techo con chapa empernada (Bolted roof plate)
    b.box((0, 1.45, -0.20), (1.08, 0.05, 0.72), M["Paint"])
    for rx in (-0.46, 0.46):
        for rz in (0.08, -0.20, -0.48):
            b.hex_bolt((rx, 1.48, rz), 0.016, 0.025, M["Metal"], axis="y")

    # 7. ALERÓN TRASERO Y SOPORTES ALIGERADOS (Rear wing)
    for wx in (-0.42, 0.42):
        b.box((wx, 1.08, -1.05), (0.06, 0.70, 0.22), M["Chassis"])
        for hy in (0.90, 1.15, 1.35):
            b.cyl((wx, hy, -1.05), 0.045, 0.08, M["Metal"], seg=10, axis="x")

    b.box((0, 1.46, -1.06), (1.95, 0.07, 0.48), M["Paint"])
    b.box((0, 1.51, -1.28), (1.95, 0.06, 0.04), M["Metal"])
    for s in (-1, 1):
        b.box((s * 0.98, 1.46, -1.06), (0.04, 0.26, 0.54), M["Paint"])
        for ez in (-1.26, -1.06, -0.86):
            b.hex_bolt((s * 1.01, 1.46, ez), 0.012, 0.015, M["Metal"], axis="x")

    # 8. SUSPENSIÓN MECÁNICA INDEPENDIENTE Y DIRECCIÓN (4 esquinas)
    for s in (-1, 1):
        # A) DELANTERA (z = 0.92, x = s * 1.00)
        z_f = 0.92
        # Torreta de suspensión delgada y abierta
        b.box((s * 0.42, 0.72, z_f), (0.12, 0.32, 0.035), M["Chassis"])
        for ty in (0.68, 0.78, 0.86):
            b.hex_bolt((s * 0.42, ty, z_f), 0.015, 0.06, M["Metal"], axis="z")

        # Trapecios independientes articulados
        b.tube([(s * 0.30, 0.32, z_f - 0.12), (s * 0.82, 0.30, z_f), (s * 0.30, 0.32, z_f + 0.12)], 0.032, M["Chassis"], seg=8)
        b.cyl((s * 0.84, 0.30, z_f), 0.038, 0.08, M["Metal"], seg=10, axis="y")

        b.tube([(s * 0.32, 0.56, z_f - 0.08), (s * 0.80, 0.54, z_f), (s * 0.32, 0.56, z_f + 0.08)], 0.026, M["Chassis"], seg=8)
        b.sph((s * 0.82, 0.54, z_f), 0.034, M["Metal"], seg=8)

        b.box((s * 0.88, 0.42, z_f), (0.08, 0.28, 0.12), M["Metal"])
        b.cyl((s * 0.92, 0.42, z_f), 0.045, 0.24, M["Chassis"], seg=12, axis="x")

        # Barra de dirección (Tie rod)
        b.tube([(s * 0.22, 0.40, z_f + 0.14), (s * 0.84, 0.40, z_f + 0.08)], 0.020, M["Metal"], seg=6)
        b.sph((s * 0.84, 0.40, z_f + 0.08), 0.026, M["Chassis"], seg=6)

        # Coilover delantero inclinado
        p_top_f = (s * 0.46, 0.84, z_f)
        p_bot_f = (s * 0.78, 0.34, z_f)
        p_mid_f = (s * (0.46 + (0.78 - 0.46) * 0.55), 0.84 + (0.34 - 0.84) * 0.55, z_f)
        b.tube([p_top_f, p_mid_f], 0.040, M["Chassis"], seg=10)
        p_piggy = (s * 0.42, 0.76, z_f + 0.06)
        b.tube([(s * 0.45, 0.80, z_f), p_piggy], 0.022, M["Metal"], seg=6)
        b.cyl(p_piggy, 0.026, 0.14, M["Chassis"], seg=8, axis="y")
        b.tube([p_mid_f, p_bot_f], 0.020, M["Chrome"], seg=8)
        b.coil_spring(p_top_f, p_bot_f, 0.052, 0.014, 6.5, M["Spring"])
        b.hex_bolt(p_top_f, 0.022, 0.08, M["Metal"], axis="z")
        b.hex_bolt(p_bot_f, 0.022, 0.08, M["Metal"], axis="z")

        # B) TRASERA (z = -0.90, x = s * 1.00)
        z_r = -0.90
        b.box((s * 0.42, 0.76, z_r), (0.14, 0.36, 0.035), M["Chassis"])
        b.tube([(s * 0.30, 0.30, z_r - 0.14), (s * 0.82, 0.28, z_r), (s * 0.30, 0.30, z_r + 0.14)], 0.035, M["Chassis"], seg=8)
        b.tube([(s * 0.35, 0.58, z_r), (s * 0.80, 0.56, z_r)], 0.028, M["Metal"], seg=8)
        b.box((s * 0.88, 0.42, z_r), (0.08, 0.30, 0.14), M["Metal"])
        b.tube([(s * 0.38, 0.42, z_r), (s * 0.86, 0.42, z_r)], 0.022, M["Metal"], seg=6)

        # Coilover trasero
        p_top_r = (s * 0.48, 0.88, z_r)
        p_bot_r = (s * 0.80, 0.32, z_r)
        p_mid_r = (s * (0.48 + (0.80 - 0.48) * 0.55), 0.88 + (0.32 - 0.88) * 0.55, z_r)
        b.tube([p_top_r, p_mid_r], 0.042, M["Chassis"], seg=10)
        b.tube([p_mid_r, p_bot_r], 0.022, M["Chrome"], seg=8)
        b.coil_spring(p_top_r, p_bot_r, 0.054, 0.014, 7.0, M["Spring"])
        b.hex_bolt(p_top_r, 0.022, 0.08, M["Metal"], axis="z")
        b.hex_bolt(p_bot_r, 0.022, 0.08, M["Metal"], axis="z")

    # 9. CABINA Y HERO PILOTO SOLDADITO (Cockpit & Pilot)
    b.box((0, 0.35, -0.15), (0.90, 0.08, 0.85), M["Chassis"])
    b.box((0, 0.42, -0.22), (0.50, 0.12, 0.45), M["Chassis"])
    b.box((0, 0.72, -0.42), (0.48, 0.55, 0.14), M["Chassis"])
    for s in (-1, 1):
        b.box((s * 0.24, 0.68, -0.32), (0.08, 0.45, 0.25), M["Chassis"])
        b.box((s * 0.12, 0.74, -0.33), (0.06, 0.48, 0.05), M["Paint"])
    b.cyl((0, 0.58, -0.30), 0.04, 0.04, M["Metal"], seg=8, axis="y")

    b.box((0, 0.72, 0.26), (0.65, 0.18, 0.14), M["Chassis"])
    for gx in (-0.15, 0.15):
        b.cyl((gx, 0.75, 0.32), 0.045, 0.04, M["Metal"], seg=10, axis="z")
        b.cyl((gx, 0.75, 0.34), 0.038, 0.02, M["Glass"], seg=8, axis="z")

    b.tube([(0, 0.64, 0.26), (0, 0.76, 0.14)], 0.025, M["Chassis"], seg=8)
    b.tube([
        (-0.16, 0.78, 0.12), (-0.11, 0.90, 0.10), (0.11, 0.90, 0.10),
        (0.16, 0.78, 0.12), (0.11, 0.66, 0.14), (-0.11, 0.66, 0.14), (-0.16, 0.78, 0.12)
    ], 0.020, M["Chassis"], seg=8)
    b.tube([(0, 0.78, 0.12), (-0.15, 0.78, 0.12)], 0.012, M["Metal"], seg=6)
    b.tube([(0, 0.78, 0.12), (0.15, 0.78, 0.12)], 0.012, M["Metal"], seg=6)
    b.tube([(0, 0.78, 0.12), (0, 0.66, 0.14)], 0.012, M["Metal"], seg=6)

    # Piloto Soldadito militar:
    pilot_y = 0.56
    b.box((0, pilot_y + 0.14, -0.20), (0.34, 0.26, 0.24), M["Pilot"])
    for s in (-1, 1):
        b.tube([(s * 0.18, pilot_y + 0.22, -0.20), (s * 0.17, pilot_y + 0.20, -0.05), (s * 0.14, 0.78, 0.11)], 0.040, M["Pilot"], seg=8)
        b.sph((s * 0.14, 0.78, 0.11), 0.042, M["Chassis"], seg=8)

    head_c = (0, pilot_y + 0.40, -0.18)
    b.sph(head_c, 0.13, M["Pilot"], seg=12)
    helmet_c = (0, pilot_y + 0.44, -0.17)
    b.sph(helmet_c, 0.15, M["PilotHelmet"], seg=14)
    b.cyl((0, pilot_y + 0.37, -0.17), 0.165, 0.025, M["PilotHelmet"], seg=14, axis="y")
    b.box((0, pilot_y + 0.38, -0.04), (0.18, 0.045, 0.04), M["PilotVisor"])

    # 10. ANTENA RC FLEXIBLE CON PUNTA CIAN
    ant_base = (0.36, 0.78, -0.68)
    b.cyl(ant_base, 0.035, 0.05, M["Chassis"], seg=8, axis="y")
    b.coil_spring(ant_base, (0.36, 0.88, -0.68), 0.028, 0.008, 4.0, M["Metal"])
    b.tube([
        (0.36, 0.88, -0.68),
        (0.36, 1.25, -0.70),
        (0.35, 1.62, -0.73),
        (0.35, 1.95, -0.78)
    ], 0.012, M["Metal"], seg=6)
    b.sph((0.35, 1.95, -0.78), 0.055, M["Cyan"], seg=12)

def build_wheel(side, M):
    """Construye una rueda independiente con neumático crawler/tractor hueco y llanta deep dish visible."""
    wb = BuggyBuilder()
    
    # En Blender, el eje del vehículo es X-.
    # Para la rueda derecha (side=1, X_blender=-1.0), el exterior del auto está hacia -X.
    # Para la rueda izquierda (side=-1, X_blender=+1.0), el exterior del auto está hacia +X.
    dir_x = -1 if side > 0 else 1
    
    # 1. CARCASA BASE DEL NEUMÁTICO HUECO (Sin tapa central que tape la llanta)
    r_outer = 0.445
    r_inner = 0.270
    w = 0.33
    seg = 36
    rings = []
    for x_pos in (-w / 2, w / 2):
        ring_out = [wb.bm.verts.new(Vector((x_pos, math.sin(a) * r_outer, math.cos(a) * r_outer))) for a in (2 * math.pi * i / seg for i in range(seg))]
        ring_in = [wb.bm.verts.new(Vector((x_pos, math.sin(a) * r_inner, math.cos(a) * r_inner))) for a in (2 * math.pi * i / seg for i in range(seg))]
        rings.append((ring_out, ring_in))

    (r_out0, r_in0), (r_out1, r_in1) = rings
    tire_faces = []
    for i in range(seg):
        j = (i + 1) % seg
        # Banda de rodadura exterior
        tire_faces.append(wb.bm.faces.new((r_out0[i], r_out0[j], r_out1[j], r_out1[i])))
        # Talón interior
        tire_faces.append(wb.bm.faces.new((r_in1[i], r_in1[j], r_in0[j], r_in0[i])))
        # Flanco interior
        tire_faces.append(wb.bm.faces.new((r_in0[i], r_out0[i], r_out0[j], r_in0[j])))
        # Flanco exterior
        tire_faces.append(wb.bm.faces.new((r_in1[i], r_in1[j], r_out1[j], r_out1[i])))
    mi_rubber = wb._mi(M["Rubber"])
    for f in tire_faces:
        f.material_index = mi_rubber
        f.smooth = True

    # 2. TACOS AGRESIVOS CRAWLER / TRACTOR (Chevron y nervaduras laterales)
    num_lugs = 22
    lug_h = 0.048
    lug_w = 0.135
    lug_len = 0.052
    
    for i in range(num_lugs):
        ang = 2 * math.pi * i / num_lugs
        ang_off = ang + (math.pi / num_lugs)
        
        M_l = Matrix.Translation(Vector((-0.075, math.sin(ang) * (0.445 + lug_h/2), math.cos(ang) * (0.445 + lug_h/2)))) @ \
              Matrix.Rotation(ang, 4, "X") @ Matrix.Rotation(0.20, 4, "Z") @ \
              Matrix.Diagonal((lug_w / 2, lug_len / 2, lug_h / 2, 1))
        v_l = bmesh.ops.create_cube(wb.bm, size=2, matrix=M_l)["verts"]
        wb._tag(v_l, M["Rubber"])
        
        M_r = Matrix.Translation(Vector((0.075, math.sin(ang_off) * (0.445 + lug_h/2), math.cos(ang_off) * (0.445 + lug_h/2)))) @ \
              Matrix.Rotation(ang_off, 4, "X") @ Matrix.Rotation(-0.20, 4, "Z") @ \
              Matrix.Diagonal((lug_w / 2, lug_len / 2, lug_h / 2, 1))
        v_r = bmesh.ops.create_cube(wb.bm, size=2, matrix=M_r)["verts"]
        wb._tag(v_r, M["Rubber"])
        
        for sx, a, d_rot in ((-0.165, ang, 0.2), (0.165, ang_off, -0.2)):
            M_sb = Matrix.Translation(Vector((sx, math.sin(a) * 0.395, math.cos(a) * 0.395))) @ \
                   Matrix.Rotation(a, 4, "X") @ Matrix.Rotation(d_rot, 4, "Y") @ \
                   Matrix.Diagonal((0.022, 0.026, 0.048, 1))
            v_sb = bmesh.ops.create_cube(wb.bm, size=2, matrix=M_sb)["verts"]
            wb._tag(v_sb, M["Rubber"])

    # 3. LLANTA DE ACERO EMBUTIDA (Deep dish rim) HACIA EL EXTERIOR (dir_x)
    # Garganta / barril hueco de la llanta
    M_rim = Matrix.Translation(Vector((dir_x * 0.08, 0, 0))) @ Matrix.Rotation(math.pi / 2, 4, "Y")
    v_rim = bmesh.ops.create_cone(wb.bm, cap_ends=False, cap_tris=False, segments=32, radius1=0.27, radius2=0.27, depth=0.15, matrix=M_rim)["verts"]
    wb._tag(v_rim, M["Metal"])
    
    # Plato cóncavo embutido pintado de amarillo industrial (#e5a019)
    M_dish = Matrix.Translation(Vector((dir_x * 0.10, 0, 0))) @ Matrix.Rotation(math.pi / 2, 4, "Y")
    v_dish = bmesh.ops.create_cone(wb.bm, cap_ends=True, cap_tris=False, segments=28, radius1=0.268, radius2=0.21, depth=0.06, matrix=M_dish)["verts"]
    wb._tag(v_dish, M["Paint"])
    
    # Aro exterior beadlock de retención
    M_bead = Matrix.Translation(Vector((dir_x * 0.165, 0, 0))) @ Matrix.Rotation(math.pi / 2, 4, "Y")
    v_bead = bmesh.ops.create_cone(wb.bm, cap_ends=False, cap_tris=False, segments=32, radius1=0.282, radius2=0.282, depth=0.016, matrix=M_bead)["verts"]
    wb._tag(v_bead, M["Metal"])
    
    # 16 tornillos perimetrales del beadlock
    for b_i in range(16):
        b_ang = 2 * math.pi * b_i / 16
        b_y = math.sin(b_ang) * 0.264
        b_z = math.cos(b_ang) * 0.264
        M_b = Matrix.Translation(Vector((dir_x * 0.174, b_y, b_z))) @ Matrix.Rotation(math.pi / 2, 4, "Y")
        v_b = bmesh.ops.create_cone(wb.bm, cap_ends=True, cap_tris=False, segments=6, radius1=0.012, radius2=0.012, depth=0.012, matrix=M_b)["verts"]
        wb._tag(v_b, M["Chassis"])
        
    # Buje central negro cilíndrico
    M_hub = Matrix.Translation(Vector((dir_x * 0.13, 0, 0))) @ Matrix.Rotation(math.pi / 2, 4, "Y")
    v_hub = bmesh.ops.create_cone(wb.bm, cap_ends=True, cap_tris=False, segments=20, radius1=0.082, radius2=0.082, depth=0.065, matrix=M_hub)["verts"]
    wb._tag(v_hub, M["Chassis"])
    
    # Tuerca central hexagonal de eje (17mm locknut)
    M_nut = Matrix.Translation(Vector((dir_x * 0.165, 0, 0))) @ Matrix.Rotation(math.pi / 2, 4, "Y")
    v_nut = bmesh.ops.create_cone(wb.bm, cap_ends=True, cap_tris=False, segments=6, radius1=0.046, radius2=0.046, depth=0.038, matrix=M_nut)["verts"]
    wb._tag(v_nut, M["Metal"])
    
    # 5 tuercas hexagonales perimetrales alrededor del buje sobre el plato amarillo
    for l_i in range(5):
        l_ang = 2 * math.pi * l_i / 5
        l_y = math.sin(l_ang) * 0.145
        l_z = math.cos(l_ang) * 0.145
        M_l = Matrix.Translation(Vector((dir_x * 0.135, l_y, l_z))) @ Matrix.Rotation(math.pi / 2, 4, "Y")
        v_l = bmesh.ops.create_cone(wb.bm, cap_ends=True, cap_tris=False, segments=6, radius1=0.018, radius2=0.018, depth=0.024, matrix=M_l)["verts"]
        wb._tag(v_l, M["Metal"])
        
    # Cara interna de la llanta (Brake drum / hex hub)
    M_inner = Matrix.Translation(Vector((-dir_x * 0.14, 0, 0))) @ Matrix.Rotation(math.pi / 2, 4, "Y")
    v_inner = bmesh.ops.create_cone(wb.bm, cap_ends=True, cap_tris=False, segments=24, radius1=0.26, radius2=0.26, depth=0.05, matrix=M_inner)["verts"]
    wb._tag(v_inner, M["Chassis"])
    
    return wb

def apply_bevel(ob, width=0.012, segments=2):
    """Aplica bisel limpio y normales ponderadas para aristas metálicas fabricadas."""
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    
    m_bev = ob.modifiers.new('BevelEdges', 'BEVEL')
    m_bev.width = width
    m_bev.segments = segments
    m_bev.limit_method = 'ANGLE'
    m_bev.angle_limit = math.radians(35)
    bpy.ops.object.modifier_apply(modifier=m_bev.name)
    
    for p in ob.data.polygons:
        p.use_smooth = True
        
    m_wn = ob.modifiers.new('WeightedNormal', 'WEIGHTED_NORMAL')
    m_wn.keep_sharp = True
    bpy.ops.object.modifier_apply(modifier=m_wn.name)

def render_previews(out_dir: Path):
    """Renderiza vistas previas cinematográficas comparativas con la referencia 08-buggy.png."""
    print("Renderizando vistas previas cinematográficas...")
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.film_transparent = True
    
    # Target empty en el centro del auto
    target = bpy.data.objects.new("CamTarget", None)
    target.location = Vector((0.0, 0.2, 0.55))
    bpy.context.collection.objects.link(target)
    
    # Cámara
    cam_data = bpy.data.cameras.new("CinemaCam")
    cam_data.lens = 42
    cam_data.sensor_width = 36
    cam = bpy.data.objects.new("CinemaCam", cam_data)
    bpy.context.collection.objects.link(cam)
    sc.camera = cam
    
    track = cam.constraints.new('TRACK_TO')
    track.target = target
    track.track_axis = 'TRACK_NEGATIVE_Z'
    track.up_axis = 'UP_Y'
    
    # Iluminación de estudio cinematográfico nocturno
    # 1. Warm Key light (ámbar cálido #ffd175)
    key_data = bpy.data.lights.new("WarmKey", 'SPOT')
    key_data.color = tuple(_lin("#ffd175"))
    key_data.energy = 2400
    key_data.spot_size = math.radians(75)
    key_data.spot_blend = 0.4
    key_light = bpy.data.objects.new("WarmKey", key_data)
    key_light.location = Vector((3.4, 3.8, 2.6))
    bpy.context.collection.objects.link(key_light)
    key_track = key_light.constraints.new('TRACK_TO')
    key_track.target = target
    key_track.track_axis = 'TRACK_NEGATIVE_Z'
    key_track.up_axis = 'UP_Y'

    # 2. Cool Rim light (petróleo azul #6095c0)
    rim_data = bpy.data.lights.new("CoolRim", 'SPOT')
    rim_data.color = tuple(_lin("#6095c0"))
    rim_data.energy = 1600
    rim_data.spot_size = math.radians(85)
    rim_light = bpy.data.objects.new("CoolRim", rim_data)
    rim_light.location = Vector((-3.2, -2.8, 2.6))
    bpy.context.collection.objects.link(rim_light)
    rim_track = rim_light.constraints.new('TRACK_TO')
    rim_track.target = target
    rim_track.track_axis = 'TRACK_NEGATIVE_Z'
    rim_track.up_axis = 'UP_Y'

    # 3. Soft Ambient Fill light (para lectura clara de mecánica y suspensión)
    fill_data = bpy.data.lights.new("FillLight", 'SUN')
    fill_data.color = tuple(_lin("#8eb0d0"))
    fill_data.energy = 1.2
    fill_light = bpy.data.objects.new("FillLight", fill_data)
    fill_light.rotation_euler = (math.radians(45), math.radians(15), math.radians(-35))
    bpy.context.collection.objects.link(fill_light)
    
    # 4. Luces frontales de faros (Tungsteno cálido)
    for s in (-1, 1):
        lamp_light_data = bpy.data.lights.new(f"Headlight_{s}", 'POINT')
        lamp_light_data.color = tuple(_lin("#ffd175"))
        lamp_light_data.energy = 140
        lamp_light = bpy.data.objects.new(f"Headlight_{s}", lamp_light_data)
        lamp_light.location = G(s * 0.38, 0.46, 1.48)
        bpy.context.collection.objects.link(lamp_light)

    # Vistas cinematográficas
    shots = [
        # Vista Hero 3/4 (frente apuntando a SCREEN RIGHT idéntica a 08-buggy.png)
        ("preview-hero.png", 1536, 1024, Vector((2.9, 3.2, 0.92))),
        # Vista lateral (perfil de suspensión, resorte y ruedas deep dish)
        ("preview-side.png", 1280, 720, Vector((4.2, 0.0, 0.75))),
        # Vista superior (capó estampado, cabina, piloto, techo empernado)
        ("preview-top.png", 1280, 720, Vector((0.01, 0.2, 4.6))),
        # Vista trasera (alerón, motor eléctrico, cables y antena)
        ("preview-rear.png", 1280, 720, Vector((-2.4, -3.2, 1.4))),
    ]
    
    for filename, rx, ry, cam_pos in shots:
        sc.render.resolution_x = rx
        sc.render.resolution_y = ry
        cam.location = cam_pos
        bpy.context.view_layer.update()
        out_file = str((out_dir / filename).resolve())
        sc.render.filepath = out_file
        bpy.ops.render.render(write_still=True)
        print(f"Renderizado {filename} ({rx}x{ry})")

def build_all():
    print("=== INICIANDO CONSTRUCCIÓN BUGGY CINEMATOGRÁFICO GEMINI ===")
    t_start = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    # 0. GENERAR TEXTURAS PBR MAESTRAS
    pbr_images = generate_master_pbr_textures(OUT, size=1024)
    
    # 1. MATERIALES
    M = create_materials(pbr_images)
    objects = []
    
    # 2. CONSTRUCCIÓN DE LA CARROCERÍA (BuggyBody)
    print("Generando carrocería, jaula, suspensión y piloto...")
    body_builder = BuggyBuilder()
    build_chassis_and_body(body_builder, M)
    body_ob = body_builder.object("BuggyBody")
    apply_bevel(body_ob, width=0.014, segments=2)
    objects.append(body_ob)
    
    # 3. CONSTRUCCIÓN DE LAS 4 RUEDAS INDEPENDIENTES
    wheel_configs = [
        (-1, 0.92, -1), # s=-1, z=0.92, side=-1 -> Wheel_-1_0.92
        (1, 0.92, 1),   # s=1,  z=0.92, side=1  -> Wheel_1_0.92
        (-1, -0.9, -1), # s=-1, z=-0.9, side=-1 -> Wheel_-1_-0.9
        (1, -0.9, 1),   # s=1,  z=-0.9, side=1  -> Wheel_1_-0.9
    ]
    
    for s, z, side in wheel_configs:
        name = f"Wheel_{s}_{z}"
        print(f"Generando rueda {name} (side={side})...")
        wb = build_wheel(side, M)
        w_ob = wb.object(name)
        apply_bevel(w_ob, width=0.008, segments=2)
        w_ob.location = G(s * 1.0, 0.52, z)
        objects.append(w_ob)
        
    # 4. SMART UV UNWRAP EN TODOS LOS OBJETOS
    print("Generando coordenadas UV con Smart Project...")
    for ob in objects:
        bpy.ops.object.select_all(action='DESELECT')
        ob.select_set(True)
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.015)
        bpy.ops.object.mode_set(mode='OBJECT')

    # Métricas preliminares
    tri_counts = {ob.name: sum(len(p.vertices) - 2 for p in ob.data.polygons) for ob in objects}
    total_tris = sum(tri_counts.values())
    print("MÉTRICAS DE TRIÁNGULOS:", json.dumps(tri_counts, indent=2))
    print(f"TOTAL TRIÁNGULOS: {total_tris}")

    # 5. RENDERIZAR VISTAS PREVIAS CINEMATOGRÁFICAS
    render_previews(OUT)

    # 6. GUARDAR BLEND Y EXPORTAR GLB
    print("Empaquetando texturas y guardando buggy.blend...")
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects: ob.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    
    for img in bpy.data.images:
        if img.has_data:
            img.pack()
            
    blend_path = str(OUT / "buggy.blend")
    glb_path = str(OUT / "buggy.glb")
    
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"Guardado archivo {blend_path}")
    
    print(f"Exportando GLB a {glb_path}...")
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        use_selection=True,
        export_yup=True,
        export_materials='EXPORT',
        export_apply=True,
        export_texcoords=True,
        export_normals=True
    )
    
    glb_bytes = Path(glb_path).stat().st_size
    print(f"GLB exportado exitosamente: {glb_bytes:,} bytes")
    
    report = {
        "triangles_by_mesh": tri_counts,
        "total_triangles": total_tris,
        "glb_bytes": glb_bytes,
        "build_time_seconds": round(time.time() - t_start, 2),
        "objects": [ob.name for ob in objects],
        "materials": [m.name for m in bpy.data.materials],
        "pbr_textures": ["buggy-albedo.png", "buggy-normal.png", "buggy-orm.png"],
        "previews": ["preview-hero.png", "preview-side.png", "preview-top.png", "preview-rear.png"]
    }
    (OUT / "build-report.json").write_text(json.dumps(report, indent=2) + "\n")
    print("Reporte escrito en build-report.json")
    print(f"=== CONSTRUCCIÓN COMPLETADA EN {report['build_time_seconds']} s ===")
    return report

if __name__ == "__main__":
    build_all()
