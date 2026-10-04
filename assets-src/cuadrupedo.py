# Utilidades para jefes cuadrúpedos (perro/ y gato/): malla orgánica de una pieza y esqueleto con pesos suaves.
# Reusa bicho.py (convención de ejes G() de src/glb.ts, coordenadas del juego G(), materiales, armature, acciones, exportación).
# Malla: primitivas solapadas -> remesh por vóxeles (una sola piel cerrada) -> suavizado -> decimado al tope de
# triángulos -> material por cara según una función de región (manchas/rayas sin texturas).
# Pesos: calor automático de Blender, limpieza, tope de 4 huesos por vértice y normalización.
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix, Quaternion
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bicho as b

G = b.G


_GI = Matrix([G(1, 0, 0), G(0, 1, 0), G(0, 0, 1)]).transposed().inverted()


def J(v):  # Blender -> juego (inversa de bicho.G, sea cual sea su convención)
    return _GI @ v


class Shape:
    """Primitivas en coordenadas del juego, multiplicadas por la escala S del modelo."""

    def __init__(self, S=1.0, T=lambda p: p):
        self.bm, self.S, self.T = bmesh.new(), S, T  # T: deformación de las posiciones (perilla de proporciones)

    def ell(self, c, r, seg=20, rings=14, rot=None):
        c = self.T(c)
        R = (rot or Matrix()).to_4x4()
        M = Matrix.Translation(G(*c) * self.S) @ R @ Matrix.Diagonal((r[0] * self.S, r[2] * self.S, r[1] * self.S, 1))
        bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=rings, radius=1, matrix=M)

    def tube(self, pts, radii, seg=16):
        """Cadena de conos con una esfera en cada punto (articulaciones redondeadas)."""
        pts = [self.T(p) for p in pts]
        T, self.T = self.T, lambda p: p
        for (p, q), (r0, r1) in zip(zip(pts, pts[1:]), zip(radii, radii[1:])):
            P, Q = G(*p) * self.S, G(*q) * self.S
            d = Q - P
            M = Matrix.Translation((P + Q) / 2) @ d.to_track_quat("Z", "Y").to_matrix().to_4x4()
            bmesh.ops.create_cone(self.bm, cap_ends=True, segments=seg, radius1=r0 * self.S, radius2=r1 * self.S, depth=d.length, matrix=M)
        for p, r in zip(pts, radii):
            self.ell(p, (r, r, r), 14, 9)
        self.T = T

    def cone(self, base, tip, r, flat=0.45, seg=12):
        """Cono de base r aplastado en el eje adelante-atrás (orejas de gato)."""
        P, Q = G(*self.T(base)) * self.S, G(*self.T(tip)) * self.S
        d = Q - P
        M = Matrix.Translation((P + Q) / 2) @ d.to_track_quat("Z", "Y").to_matrix().to_4x4() @ Matrix.Diagonal((1, flat, 1, 1))
        bmesh.ops.create_cone(self.bm, cap_ends=True, segments=seg, radius1=r * self.S, radius2=0.04 * self.S, depth=d.length, matrix=M)

    def loft(self, secs, seg=24, steps=5):
        """Tronco liso: secciones elípticas [(centro, rx, ry)] unidas con Catmull-Rom (rx sobre x del juego, ry sobre
        el 'arriba' perpendicular al recorrido). Extremos cerrados con un abanico."""
        def cr(a, b_, c, d, t):
            return 0.5 * ((2 * b_) + (-a + c) * t + (2 * a - 5 * b_ + 4 * c - d) * t * t + (-a + 3 * b_ - 3 * c + d) * t ** 3)
        S = [(Vector(self.T(c)) * self.S, rx * self.S, ry * self.S) for c, rx, ry in secs]
        S = [S[0]] + S + [S[-1]]
        pts = []
        for i in range(1, len(S) - 2):
            for k in range(steps):
                t = k / steps
                pts.append(tuple(cr(S[i - 1][j], S[i][j], S[i + 1][j], S[i + 2][j], t) for j in range(3)))
        pts.append(S[-2])
        rings = []
        for i, (c, rx, ry) in enumerate(pts):
            d = (pts[min(i + 1, len(pts) - 1)][0] - pts[max(i - 1, 0)][0]).normalized()
            side_ = Vector((1, 0, 0))
            up = d.cross(side_).normalized() if d.cross(side_).length > 1e-4 else Vector((0, 1, 0))
            side_ = up.cross(d).normalized()
            rings.append([self.bm.verts.new(G(*(c + side_ * math.cos(a) * rx + up * math.sin(a) * ry)))
                          for a in (2 * math.pi * k / seg for k in range(seg))])
        for a, b_ in zip(rings, rings[1:]):
            for k in range(seg):
                self.bm.faces.new((a[k], a[(k + 1) % seg], b_[(k + 1) % seg], b_[k]))
        self.bm.faces.new(rings[0][::-1])
        self.bm.faces.new(rings[-1])

    def skin(self, name, voxel, tris, smooth=(0.5, 4)):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        me = bpy.data.meshes.new(name)
        self.bm.to_mesh(me)
        ob = bpy.data.objects.new(name, me)
        bpy.context.collection.objects.link(ob)
        r = ob.modifiers.new("remesh", "REMESH")
        r.mode, r.voxel_size, r.adaptivity = "VOXEL", voxel * self.S, 0
        s = ob.modifiers.new("smooth", "SMOOTH")
        s.factor, s.iterations = smooth
        apply_mods(ob)
        d = ob.modifiers.new("dec", "DECIMATE")
        d.ratio = tris / sum(len(p.vertices) - 2 for p in ob.data.polygons)
        d.use_collapse_triangulate = True
        ob.modifiers.new("tri", "TRIANGULATE")
        apply_mods(ob)
        for p in ob.data.polygons:
            p.use_smooth = True
        return ob


def apply_mods(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    bpy.data.meshes.remove(old)


def paint(ob, S, mats, region):
    """region(p, n) -> índice en mats, con p y n en coordenadas del juego SIN escalar (las mismas del script)."""
    for m in mats:
        ob.data.materials.append(m)
    n = [0] * len(mats)
    for f in ob.data.polygons:
        f.material_index = i = region(J(f.center) / S, J(f.normal))
        n[i] += 1
    print("CARAS por material", {m.name: k for m, k in zip(mats, n)})


def refine(ob, S, region, rounds=1, keep=7400):
    """Contornos de las manchas/rayas más finos: parte en dos las aristas de los triángulos que tocan otro material
    (la forma no cambia, solo se reparte el color con más resolución). Una ronda que pasaría de `keep` triángulos
    (deja margen para los ojos, que se agregan después) no se aplica. Va después de paint() y antes de rig()."""
    for _ in range(rounds):
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        edges = {e for f in bm.faces for e in f.edges if any(o.material_index != f.material_index for o in e.link_faces)}
        bmesh.ops.subdivide_edges(bm, edges=list(edges), cuts=1, use_grid_fill=True)
        bmesh.ops.triangulate(bm, faces=bm.faces)
        if len(bm.faces) > keep:
            bm.free()
            break
        for f in bm.faces:
            f.smooth = True
        bm.to_mesh(ob.data)
        bm.free()
        for f in ob.data.polygons:
            f.material_index = region(J(f.center) / S, J(f.normal))
    print("TRIS tras refine", sum(len(p.vertices) - 2 for p in ob.data.polygons))


def rig(ob, ao):
    """Pesos por calor; los vértices que el calor no alcanza toman el hueso más cercano."""
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    ao.select_set(True)
    bpy.context.view_layer.objects.active = ao
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    orphans = [v for v in ob.data.vertices if not any(g.weight > 0.01 for g in v.groups)]
    for v in orphans:
        bn = min(ao.data.bones, key=lambda bb: seg_dist(v.co, bb.head_local, bb.tail_local))
        ob.vertex_groups[bn.name].add([v.index], 1.0, "REPLACE")
    print("HUERFANOS", len(orphans))


def seg_dist(p, a, c):
    d = c - a
    t = max(0, min(1, (p - a).dot(d) / d.length_squared))
    return (p - (a + d * t)).length


def add_rigid(ob, S, bone, mat, parts):
    """Piezas sueltas (ojos, pupilas) pegadas a un hueso con peso 1. parts: [(centro, radios, seg, rings)]."""
    if mat.name not in ob.data.materials:
        ob.data.materials.append(mat)
    mi = list(ob.data.materials).index(ob.data.materials[mat.name])
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    dl = bm.verts.layers.deform.verify()
    gi = ob.vertex_groups[bone].index
    for c, r, seg, rings in parts:
        M = Matrix.Translation(G(*c) * S) @ Matrix.Diagonal((r[0] * S, r[2] * S, r[1] * S, 1))
        vs = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1, matrix=M)["verts"]
        for v in vs:
            v[dl].clear()
            v[dl][gi] = 1.0
        for f in {f for v in vs for f in v.link_faces}:
            f.material_index, f.smooth = mi, True
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()


def keep_on_body(ob, ao, limbs, start, ramp):
    """El calor deja que muslos y brazos arrastren la piel del lomo: arriba de la cabeza del hueso + start (juego),
    su peso pasa al padre de a poco (todo pasado a start + ramp)."""
    for n in limbs:
        bn = ao.data.bones[n]
        hy = J(bn.head_local).y
        g, par = ob.vertex_groups[n], ob.vertex_groups[bn.parent.name]
        for v in ob.data.vertices:
            w = next((x.weight for x in v.groups if x.group == g.index), 0)
            t = max(0.0, min(1.0, (J(v.co).y - hy - start) / ramp))
            if w and t:
                g.add([v.index], w * (1 - t), "REPLACE")
                par.add([v.index], w * t, "ADD")


def tidy_weights(ob):
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.vertex_group_clean(group_select_mode="ALL", limit=0.02)
    bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    used = {g.group for v in ob.data.vertices for g in v.groups}
    inf = max(len(v.groups) for v in ob.data.vertices)
    bad = sum(1 for v in ob.data.vertices if abs(sum(g.weight for g in v.groups) - 1) > 1e-3)
    print("PESOS max_influencias", inf, "no_normalizados", bad, "huesos_usados", len(used), "de", len(ob.vertex_groups))


# ---------- Animación (ejes del juego; ver bicho.nose_up/yaw_fwd/lift) ----------
swing = b.nose_up  # positivo: lleva hacia adelante la punta de un hueso que apunta para abajo
LEGS = [(s, f) for f in (True, False) for s in (1, -1)]  # (lado, delantera)


def side(s):
    return "R" if s > 0 else "L"


def leg_names(s, front):
    n = side(s)
    return [k + "_" + n for k in (("arm", "forearm", "fpaw") if front else ("thigh", "shin", "hpaw"))]


def leg(P, s, front, a, up, k=1.0, base=0.0):
    """Pata con ángulo de barrido a y elevación up (0..1): flexiona codo/rodilla y deja la mano plana en el apoyo.
    base: lo que hay que girar para contrarrestar el cabeceo del cuerpo (= -cabeceo acumulado de los padres)."""
    u, l, p = leg_names(s, front)
    if front:
        A, Bq = a + base + 0.5 * up * k, -1.5 * up * k
        C = -(A + Bq) + base - 1.1 * up * k
    else:
        A, Bq = a + base + 0.45 * up * k, -1.2 * up * k
        C = -(A + Bq) + base + 0.5 * up * k
    put(P, u, swing(A))
    put(P, l, swing(Bq))
    put(P, p, swing(C))


def gait(P, p, phases, duty, half, lift, curl=(0.9, 0.35)):
    """Pisadas con IK. phases: {(lado, delantera): desfase}. Apoyo: el pie se desliza de +half a -half pegado al piso
    (a velocidad constante, sin patinar); vuelo: vuelve adelante levantándose lift y doblando la mano (curl)."""
    ik = P.setdefault("_ik", {})
    for key, off in phases.items():
        ph = (p + off) % 1
        if ph < duty:
            ik[key] = (half * (1 - 2 * ph / duty), 0, 0)
        else:
            t = (ph - duty) / (1 - duty)
            sn = math.sin(math.pi * t)
            ik[key] = (-half * math.cos(math.pi * t), lift * sn, (curl[0] if key[1] else curl[1]) * sn * min(1, 2 * (1 - t)))


def feet(P, front, hind):
    """IK de las cuatro patas: front/hind = (dz, dy, curl) en el mundo, relativo a la muñeca/el corvejón en reposo."""
    ik = P.setdefault("_ik", {})
    for s, fr in LEGS:
        dz, dy, c = front if fr else hind
        ik[(s, fr)] = (dz, dy, c)


def _ang(v):  # ángulo de barrido en el plano sagital del juego (0 = hacia abajo, + = adelante)
    return math.atan2(v.z, -v.y)


def fk(ao, P, name):
    """Matriz posada (espacio de armadura) de un hueso con las poses de P, sin pasar por el depsgraph."""
    bn = ao.data.bones[name]
    R = bn.matrix_local.to_quaternion()
    p = P.get(name, {})
    basis = Matrix.Translation(R.inverted() @ G(*p.get("loc", (0, 0, 0)))) @ (R.inverted() @ p.get("rot", Quaternion()) @ R).to_matrix().to_4x4()
    if not bn.parent:
        return bn.matrix_local @ basis
    return fk(ao, P, bn.parent.name) @ bn.parent.matrix_local.inverted() @ bn.matrix_local @ basis


def solve(ao, P):
    """Resuelve P['_ik'] = {(lado, delantera): (dz, dy, curl)}: muñeca/corvejón a su lugar de reposo + (dz, dy),
    codo hacia atrás y rodilla hacia adelante, mano con su orientación de reposo girada curl hacia atrás."""
    for (s, front), (dz, dy, curl) in P.pop("_ik", {}).items():
        u, l, pw = leg_names(s, front)
        bu, bl = ao.data.bones[u], ao.data.bones[l]
        par = bu.parent
        Mp = fk(ao, P, par.name)
        pitch = _ang(J(Mp.col[1].xyz)) - _ang(J(par.matrix_local.col[1].xyz))
        H = J((Mp @ par.matrix_local.inverted() @ bu.matrix_local).translation)
        H0, E0, W0 = J(bu.head_local), J(bu.tail_local), J(bl.tail_local)
        L1, L2 = (E0 - H0).yz.length, (W0 - E0).yz.length
        W = Vector((0, W0.y + dy, W0.z + dz))
        d = W - Vector((0, H.y, H.z))
        dist = max(abs(L1 - L2) + 1e-3, min(L1 + L2 - 1e-3, d.length))
        beta = math.acos(max(-1, min(1, (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist))))
        ua = _ang(d) + (-beta if front else beta)
        E = Vector((0, H.y - L1 * math.cos(ua), H.z + L1 * math.sin(ua)))
        su = ua - _ang(E0 - H0)
        Wc = Vector((0, H.y, H.z)) + d.normalized() * dist  # fuera de alcance: pata estirada hacia el objetivo
        sl = _ang(Wc - E) - _ang(W0 - E0)
        put(P, u, swing(su - pitch))
        put(P, l, swing(sl - su))
        put(P, pw, swing(-sl - curl))
    return P


def action(ao, name, frames, pose_fn):
    """bicho.action con IK resuelta en cada cuadro."""
    return b.action(ao, name, frames, lambda f: solve(ao, pose_fn(f)))


def put(P, bone, rot=None, loc=None):
    e = P.setdefault(bone, {})
    if rot is not None:
        e["rot"] = e.get("rot", Quaternion()) @ rot
    if loc is not None:
        e["loc"] = tuple(x + y for x, y in zip(e.get("loc", (0, 0, 0)), loc))


def curve(keys, f):
    """Interpola suave (smoothstep) entre claves {cuadro: tupla de valores}."""
    ks = sorted(keys)
    f = max(ks[0], min(ks[-1], f))
    a = max(k for k in ks if k <= f)
    c = min(k for k in ks if k >= f)
    t = 0 if a == c else (f - a) / (c - a)
    t = t * t * (3 - 2 * t)
    return [x + (y - x) * t for x, y in zip(keys[a], keys[c])]


def render(ao, outdir, prefix, shots, target, dist):
    """Estudio para mirar: piso claro, sol de sombra blanda y cielo. shots: [(archivo, acción, cuadro, dirección)]."""
    os.makedirs(outdir, exist_ok=True)
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x, sc.render.resolution_y = 900, 700
    sc.view_settings.view_transform = "Standard"
    w = bpy.data.worlds.new("w")
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.62, 0.72, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    sc.world = w
    bpy.ops.mesh.primitive_plane_add(size=200)
    bpy.context.active_object.data.materials.append(b.mat("Piso", "#b9b3a6", rough=0.95))
    sun = bpy.data.objects.new("sol", bpy.data.lights.new("sol", "SUN"))
    sun.data.energy, sun.data.angle = 3.0, math.radians(12)
    sun.rotation_euler = (math.radians(45), 0, math.radians(35))
    sc.collection.objects.link(sun)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    cam.data.lens = 50
    sc.collection.objects.link(cam)
    sc.camera = cam
    for t in ao.animation_data.nla_tracks:
        t.mute = True
    T = G(*target)
    for fname, act, frame, d in shots:
        for pb in ao.pose.bones:  # las acciones solo clavan sus huesos: el resto vuelve al reposo
            pb.rotation_quaternion, pb.location = Quaternion(), (0, 0, 0)
        ao.animation_data.action = act
        ao.data.pose_position = "POSE" if act else "REST"
        sc.frame_set(int(frame))
        cam.location = T + G(*d).normalized() * dist
        cam.rotation_euler = (T - cam.location).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = os.path.join(outdir, prefix + "_" + fname + ".png")
        bpy.ops.render.render(write_still=True)
    ao.animation_data.action = None


def ground_report(ao, ob, acts, step=2):
    """Chequeo: altura mínima de la malla por acción (piso = 0). Reposo debe dar ~0; caminar/correr cerca de 0 (>-0,15)."""
    sc = bpy.context.scene
    for t in ao.animation_data.nla_tracks:
        t.mute = True
    out = {}
    for name, act in acts.items():
        for pb in ao.pose.bones:
            pb.rotation_quaternion, pb.location = Quaternion(), (0, 0, 0)
        ao.animation_data.action = act
        lo = []
        a, z = (int(x) for x in act.frame_range)
        for f in range(a, z + 1, step):
            sc.frame_set(f)
            me = ob.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
            lo.append(min(J(v.co).y for v in me.vertices))
        out[name] = (round(min(lo), 2), round(max(lo), 2))
    ao.animation_data.action = None
    rest = min(J(v.co).y for v in ob.data.vertices)
    print("PISO reposo", round(rest, 3), "| por acción (mín, máx de la altura mínima):", out)
    assert abs(rest) < 0.05, "la pose de reposo no apoya en y = 0"
    return out
