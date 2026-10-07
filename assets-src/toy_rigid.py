# Enemigos procedurales rígidos (oleada 2): una malla multi-material + hueso raíz y walk/attack mínimos
# para compatibilidad futura con src/glb.ts (VAT). Coordenadas de juego → Blender vía bicho.G.
# Uso: Blender -b --python assets-src/<kind>/<kind>.py
import bpy, bmesh, math, os, sys, subprocess
from mathutils import Vector, Matrix, Euler

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bicho as b

VIS_1C = 1.22  # models.ts — mismos kinds que vis1c()


def kind_scale(kind: str, def_scale: float = 1.0) -> float:
    s = def_scale * (VIS_1C if kind in ("friccion", "robot", "cortadora", "aspiradora", "cortacercos") else 1.0)
    return s


class ToyBuild(b.Build):
    """Primitivas alineadas con src/models.ts (x derecha, y arriba, z adelante)."""

    def _xf(self, c, rot, scale_vec):
        M = Matrix.Translation(b.G(*c))
        if rot:
            M = M @ Euler(rot, "XYZ").to_matrix().to_4x4()
        if scale_vec:
            M = M @ Matrix.Diagonal((*scale_vec, 1))
        return M

    def box(self, w, h, d, m, bone, c, rot=None):
        M = self._xf(c, rot, (w, d, h))
        self._tag(bmesh.ops.create_cube(self.bm, size=1.0, matrix=M)["verts"], m, bone)

    def cyl(self, top, bot, h, m, bone, c, rot=None, seg=12):
        M = self._xf(c, rot, (1, 1, 1))
        self._tag(
            bmesh.ops.create_cone(
                self.bm,
                cap_ends=True,
                cap_tris=False,
                segments=seg,
                radius1=top / 2,
                radius2=bot / 2,
                depth=h,
                matrix=M,
            )["verts"],
            m,
            bone,
        )

    def sph(self, diam, m, bone, c, scl=None, seg=8):
        sx, sy, sz = scl if scl else (1, 1, 1)
        M = self._xf(c, None, (diam * sx, diam * sz, diam * sy))
        self._tag(bmesh.ops.create_icosphere(self.bm, subdivisions=2 if seg > 6 else 1, radius=0.5, matrix=M)["verts"], m, bone)

    def tor(self, d, t, m, bone, c, rot=None, seg=12):
        """Anillo en plano XZ (juego), centrado en c."""
        R, r = d / 2, t / 2
        pts, radii = [], []
        for i in range(seg + 1):
            a = 2 * math.pi * i / seg
            pts.append((c[0] + math.cos(a) * R, c[1], c[2] + math.sin(a) * R))
            radii.append(r)
        self.tube(pts, radii, m, bone, seg=max(6, seg // 2))

    def extrude(self, profile, width, m, bone, c):
        """profile: [[z, y], ...] como models.ts; extruido en x centrado en c."""
        vf, vb = [], []
        for z, y in profile:
            vf.append(self.bm.verts.new(b.G(c[0] - width / 2, y + c[1], z + c[2])))
            vb.append(self.bm.verts.new(b.G(c[0] + width / 2, y + c[1], z + c[2])))
        n = len(profile)
        for i in range(n):
            j = (i + 1) % n
            self.bm.faces.new((vf[i], vf[j], vb[j], vb[i]))
        self.bm.faces.new(vf)
        self.bm.faces.new(vb[::-1])
        self._tag(vf + vb, m, bone)


def walk_pose(f):
    p = f / 10.0
    bob = math.sin(2 * math.pi * p) * 0.02
    return {"root": {"loc": (0, bob, 0)}}


def attack_pose(f):
    t = f / 5.0
    return {"root": {"loc": (0, 0, t * 0.12)}}


def export_kind(kind: str, folder: str, parts: list, scale: float = 1.0, export_public=False, public_parts: list | None = None):
    """parts: [(object_name, callable(ToyBuild)), ...]; public_parts: nombres de malla para public/models (default: todas)."""
    b.reset()
    bones = [("root", (0, 0, 0), (0, 0.2, 0), None)]
    ao = b.armature(kind + "Rig", bones)
    obs = []
    for name, fn in parts:
        tb = ToyBuild(["root"])
        fn(tb)
        ob = tb.object(name)
        if scale != 1.0:
            for v in ob.data.vertices:
                v.co *= scale
            ob.data.update()
        # pies en y=0 (espacio Blender: G(0,0,0).y = 0)
        min_y = min(v.co.y for v in ob.data.vertices)
        if min_y != 0:
            for v in ob.data.vertices:
                v.co.y -= min_y
            ob.data.update()
        b.skin(ob, ao)
        obs.append(ob)
    walk_act = b.action(ao, "walk", range(0, 10), walk_pose)
    b.action(ao, "attack", range(0, 6), attack_pose)
    ao.select_set(True)
    pub_names = {n for n in (public_parts or [p[0] for p in parts])}
    for ob in obs:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    raw = os.path.join(folder, kind + "_raw.glb")
    blend = os.path.join(folder, kind + ".blend")
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
    pub = os.path.join(ROOT, "public", "models", kind + ".glb")
    if export_public:
        src = raw
        if public_parts and len(public_parts) < len(parts):
            for o in obs:
                o.select_set(o.name in pub_names)
            ao.select_set(True)
            game_raw = os.path.join(folder, kind + "_game_raw.glb")
            bpy.ops.export_scene.gltf(
                filepath=game_raw,
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
            src = game_raw
        subprocess.run(
            [
                "npx",
                "gltf-transform",
                "optimize",
                src,
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
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    tris = sum(len(p.vertices) - 2 for ob in obs for p in ob.data.polygons)
    print(f"EXPORT {kind} tris={tris} blend={blend} raw={raw}")
    return raw
