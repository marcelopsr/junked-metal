# Utilidades comunes para construir bichos de 6 patas desde cero en Blender (los usan escupidora/ y escarabajo/).
# Coordenadas del JUEGO en todo el código: x derecha, y arriba, z adelante (la cabeza mira a +z, patas en y = 0).
# G() las pasa a Blender con la convención de src/glb.ts: Z arriba y la cabeza hacia +Y (giro de 180° sobre Z de la
# vista de frente de Blender; en glTF la cabeza queda hacia -z y glb.ts invierte z al hornear).
# Cada pieza es rígida: todos sus vértices pesan 1.0 en un solo hueso (1 influencia, pesos normalizados por construcción).
import bpy, bmesh, math, os, sys, subprocess
from mathutils import Vector, Matrix, Quaternion

FPS = 24
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # raíz del repo


def G(x, y, z):
    return Vector((-x, z, y))


def args():
    a = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    return dict(s.split("=", 1) for s in a)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = FPS


def _lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]


def mat(name, hexc, emit=0.0, metal=0.0, rough=0.5, emit_hex=None, alpha=1.0):
    m = bpy.data.materials.new(name)
    p = m.node_tree.nodes["Principled BSDF"]
    c = _lin(hexc)
    p.inputs["Base Color"].default_value = (*c, 1)
    p.inputs["Metallic"].default_value = metal
    p.inputs["Roughness"].default_value = rough
    if emit:
        p.inputs["Emission Color"].default_value = (*_lin(emit_hex or hexc), 1)
        p.inputs["Emission Strength"].default_value = emit
    m.diffuse_color = (*c, 1)
    if alpha < 1:  # glTF alphaMode BLEND; glb.ts lo respeta
        p.inputs["Alpha"].default_value = alpha
        m.surface_render_method = "BLENDED"
    m.use_backface_culling = True  # glTF doubleSided = false
    return m


class Build:
    """Junta todas las piezas en un solo bmesh con pesos (capa deform) y material por cara."""

    def __init__(self, bones):
        self.bm = bmesh.new()
        self.dl = self.bm.verts.layers.deform.verify()
        self.bones, self.mats = bones, []

    def _tag(self, verts, m, bone):
        if m not in self.mats:
            self.mats.append(m)
        mi, gi = self.mats.index(m), self.bones.index(bone)
        for v in verts:
            v[self.dl][gi] = 1.0
        for f in {f for v in verts for f in v.link_faces}:
            f.material_index, f.smooth = mi, True

    def ell(self, c, r, m, bone, seg=12, rings=8):
        M = Matrix.Translation(G(*c)) @ Matrix.Diagonal((r[0], r[2], r[1], 1))
        self._tag(bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=rings, radius=1, matrix=M)["verts"], m, bone)

    def tube(self, pts, radii, m, bone, seg=6):
        P = [G(*p) for p in pts]
        d = P[-1] - P[0]
        up = "Y" if abs(d.normalized().x) > 0.7 else "X"  # eje auxiliar lejos de la dirección, sin giros entre anillos
        rings = []
        for i, p in enumerate(P):
            q = (P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]).to_track_quat("Z", up)
            rings.append([self.bm.verts.new(p + q @ Vector((math.cos(a) * radii[i], math.sin(a) * radii[i], 0)))
                          for a in (2 * math.pi * k / seg for k in range(seg))])
        for a, b in zip(rings, rings[1:]):
            for k in range(seg):
                self.bm.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))
        self.bm.faces.new(rings[0][::-1])
        self.bm.faces.new(rings[-1])
        self._tag([v for r in rings for v in r], m, bone)

    def object(self, name):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        me = bpy.data.meshes.new(name)
        self.bm.to_mesh(me)
        for m in self.mats:
            me.materials.append(m)
        ob = bpy.data.objects.new(name, me)
        bpy.context.collection.objects.link(ob)
        for b in self.bones:
            ob.vertex_groups.new(name=b)
        return ob


def armature(name, bones):
    """bones: [(nombre, cabeza, cola, padre)] en coordenadas del juego."""
    ad = bpy.data.armatures.new(name)
    ao = bpy.data.objects.new(name, ad)
    bpy.context.collection.objects.link(ao)
    bpy.context.view_layer.objects.active = ao
    bpy.ops.object.mode_set(mode="EDIT")
    for n, h, t, p in bones:
        eb = ad.edit_bones.new(n)
        eb.head, eb.tail, eb.roll = G(*h), G(*t), 0
        if p:
            eb.parent = ad.edit_bones[p]
    bpy.ops.object.mode_set(mode="OBJECT")
    for pb in ao.pose.bones:
        pb.rotation_mode = "QUATERNION"
    return ao


def skin(ob, ao):
    ob.parent = ao
    ob.modifiers.new("Armature", "ARMATURE").object = ao


# Rotaciones en ejes del juego (se aplican en la cabeza del hueso, relativas al padre ya posado)
def nose_up(a):  # frente arriba
    return Quaternion(G(1, 0, 0), -a)


def yaw_fwd(s, a):  # lleva hacia adelante (+z) lo que está del lado s (+1 = +x)
    return Quaternion(G(0, 1, 0), -s * a)


def lift(s, a):  # levanta lo que está del lado s
    return Quaternion(G(0, 0, -1), -s * a)


def key(ao, frame, poses):
    """poses: {hueso: {'rot': Quaternion en ejes de armadura, 'loc': (x,y,z) juego, 'scale': f}}. Solo se clavan las
    claves dadas (con export_force_sampling=False se exportan solo los huesos animados; glb.ts repone el reposo)."""
    for pb in ao.pose.bones:
        R = pb.bone.matrix_local.to_quaternion()
        p = poses.get(pb.name, {})
        pb.rotation_quaternion = R.inverted() @ p.get("rot", Quaternion()) @ R
        pb.location = R.inverted() @ G(*p.get("loc", (0, 0, 0)))
        s = p.get("scale", 1)
        pb.scale = (s, s, s)
        for k, path in (("rot", "rotation_quaternion"), ("loc", "location"), ("scale", "scale")):
            if k in p:
                pb.keyframe_insert(path, frame=frame)


def action(ao, name, frames, pose_fn):
    """Crea la acción `name` con claves en `frames` (pose_fn(frame) -> poses) y la deja en una pista NLA para exportarla."""
    ao.animation_data_create()
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    ao.animation_data.action = act
    for f in frames:
        key(ao, f, pose_fn(f))
    tr = ao.animation_data.nla_tracks.new()
    tr.name = name
    tr.strips.new(name, int(frames[0]), act)
    ao.animation_data.action = None
    return act


def legs_walk(legs, p, A, L):
    """Trípode: (R1, L2, R3) contra (L1, R2, L3). p en [0,1). legs: [(lado, índice 0..2)]."""
    out = {}
    for s, k in legs:
        ph = (p + (0.5 if (k % 2 == 0) == (s < 0) else 0)) % 1
        up = L * math.sin(2 * math.pi * (ph - 0.5)) if ph > 0.5 else 0  # se levanta solo al volver hacia adelante
        n = ("R" if s > 0 else "L") + str(k + 1)
        out["leg_" + n] = {"rot": yaw_fwd(s, A * math.cos(2 * math.pi * ph)) @ lift(s, up)}
        out["shin_" + n] = {"rot": lift(s, -0.6 * up)}  # la tibia compensa: dobla la rodilla
    return out


def leg_bones(hips, len_, splay):
    """Huesos muslo/tibia por pata (misma geometría que LEGS en src/models.ts: rodilla a 0,45·len afuera y 0,35·len arriba)."""
    bones, geo = [], []
    for s in (1, -1):
        for k, (hx, hy, hz) in enumerate(hips):
            n = ("R" if s > 0 else "L") + str(k + 1)
            hip = (s * hx, hy, hz)
            knee = (s * (hx + len_ * 0.45), hy + len_ * 0.35, hz + splay[k] * 0.45)
            foot = (s * (hx + len_ * 0.95), 0.03, hz + splay[k])  # la punta (radio ~0,03) apoya en y = 0
            bones += [("leg_" + n, hip, knee, "body"), ("shin_" + n, knee, foot, "leg_" + n)]
            geo.append((s, k, n, hip, knee, foot))
    return bones, geo


def export(ao, ob, name, folder):
    blend = os.path.join(folder, name + ".blend")
    raw = os.path.join(folder, name + "_raw.glb")
    out = os.path.join(ROOT, "public", "models", name + ".glb")
    bpy.ops.object.select_all(action="DESELECT")
    ao.select_set(True)
    ob.select_set(True)
    print("SELECTED", [o.name for o in bpy.context.selected_objects])
    bpy.ops.export_scene.gltf(filepath=raw, export_format="GLB", use_selection=True, export_animations=True,
                              export_animation_mode="ACTIONS", export_yup=True, export_all_influences=False,
                              export_texcoords=False, export_materials="EXPORT", export_skins=True, export_force_sampling=False)
    subprocess.run(["npx", "gltf-transform", "optimize", raw, out, "--compress", "quantize", "--simplify", "false",
                    "--texture-compress", "false", "--palette", "false"], cwd=ROOT, check=True)
    bpy.context.preferences.filepaths.save_version = 0  # sin .blend1
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    print("TRIS", name, sum(len(p.vertices) - 2 for p in ob.data.polygons), "BONES", len(ao.data.bones))
    return out


def render(ao, outdir, prefix, shots, target=(0, 0.45, 0), dist=1.0):
    """shots: [(archivo, acción o None, cuadro, dirección de cámara en juego)]. Escena de estudio solo para mirar."""
    os.makedirs(outdir, exist_ok=True)
    sc = bpy.context.scene
    try:
        sc.render.engine = "BLENDER_EEVEE"
    except TypeError:
        sc.render.engine = "BLENDER_EEVEE_NEXT"
    sc.render.resolution_x, sc.render.resolution_y = 800, 600
    sc.view_settings.view_transform = "Standard"
    w = bpy.data.worlds.new("w")
    w.color = (0.55, 0.65, 0.8)
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.62, 0.8, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.8
    sc.world = w
    bpy.ops.mesh.primitive_plane_add(size=40)
    bpy.context.active_object.data.materials.append(mat("Piso", "#c8b896", rough=0.9))
    sun = bpy.data.objects.new("sol", bpy.data.lights.new("sol", "SUN"))
    sun.data.energy = 3.5
    sun.rotation_euler = (math.radians(40), 0, math.radians(30))
    sc.collection.objects.link(sun)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    cam.data.lens = 50
    sc.collection.objects.link(cam)
    sc.camera = cam
    for t in ao.animation_data.nla_tracks:
        t.mute = True
    T = G(*target)
    for fname, act, frame, d in shots:
        ao.animation_data.action = act
        ao.data.pose_position = "POSE" if act else "REST"
        sc.frame_set(int(frame))
        cam.location = T + G(*d) * dist
        cam.rotation_euler = (T - cam.location).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = os.path.join(outdir, prefix + "_" + fname + ".png")
        bpy.ops.render.render(write_still=True)
    ao.animation_data.action = None
