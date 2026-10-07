# Utilidades para autos RC estáticos (oleada 2). Coordenadas del JUEGO en todo el código: x derecha, y arriba, z adelante (+z = capó).
# Blender: G() igual que bicho.py (Z arriba, frente +Y) para que export_yup encaje con Babylon.
# Materiales con nombre fijo: Paint (taller), Trim, Glass, Metal, Rubber, Matte, Pilot, Lamp (emisivo en Blender; faros runtime en carModel).
import bpy, bmesh, math, os, sys, subprocess
from mathutils import Vector, Matrix

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bicho as b

G = b.G
mat = b.mat
reset = b.reset


class CarBuild:
    """Malla estática multi-material (sin esqueleto)."""

    def __init__(self):
        self.bm = bmesh.new()
        self.mats = []

    def _mi(self, m):
        if m not in self.mats:
            self.mats.append(m)
        return self.mats.index(m)

    def _tag(self, verts, mi):
        for f in {f for v in verts for f in v.link_faces}:
            f.material_index, f.smooth = mi, True

    def box(self, c, size, m):
        w, h, d = size
        M = Matrix.Translation(G(*c)) @ Matrix.Diagonal((w / 2, d / 2, h / 2, 1))
        self._tag(bmesh.ops.create_cube(self.bm, size=2, matrix=M)["verts"], self._mi(m))

    def cyl(self, c, r, h, m, seg=10, axis="z"):
        M = Matrix.Translation(G(*c))
        if axis == "x":
            M @= Matrix.Rotation(math.pi / 2, 4, "Y")
        elif axis == "y":
            M @= Matrix.Rotation(math.pi / 2, 4, "X")
        self._tag(bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r, depth=h, matrix=M)["verts"], self._mi(m))

    def sph(self, c, r, m, seg=10):
        M = Matrix.Translation(G(*c)) @ Matrix.Diagonal((r, r, r, 1))
        self._tag(bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=max(6, seg - 2), radius=1, matrix=M)["verts"], self._mi(m))

    def ell(self, c, radii, m, seg=12):
        M = Matrix.Translation(G(*c)) @ Matrix.Diagonal((radii[0], radii[2], radii[1], 1))
        self._tag(bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=max(6, seg // 2), radius=1, matrix=M)["verts"], self._mi(m))

    def tube(self, pts, r, m, seg=8):
        P = [G(*p) for p in pts]
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
        mi = self._mi(m)
        for f in self.bm.faces:
            if f.material_index < 0:
                f.material_index, f.smooth = mi, True

    def object(self, name):
        me = bpy.data.meshes.new(name)
        self.bm.to_mesh(me)
        self.bm.free()
        me.update()
        ob = bpy.data.objects.new(name, me)
        for m in self.mats:
            me.materials.append(m)
        bpy.context.collection.objects.link(ob)
        return ob


def bumper_bar(b: CarBuild, z, y, width, depth, m):
    """Paragolpes delantero/trasero (cinta de goma o plástico)."""
    b.box((0, y, z), (width, 0.1, depth), m)


def pilot_soldadito(b: CarBuild, seat, paint_army="#55642c"):
    """Muñequito soldadito en asiento: cadera en seat (x,y,z), escala s."""
    px, py, pz, ps = seat
    army = mat("Pilot", paint_army, rough=0.45)
    visor = mat("Glass", "#1a2838", rough=0.06, alpha=0.55)
    gold = mat("Trim", "#e0a030", rough=0.35)
    blk = mat("Rubber", "#0a0a0a", rough=0.85)
    s = ps
    b.box((px, py + 0.12 * s, pz), (0.24 * s, 0.16 * s, 0.18 * s), army)
    b.cyl((px, py + 0.26 * s, pz), 0.12 * s, 0.2 * s, army, 8)
    b.sph((px, py + 0.4 * s, pz), 0.2 * s, army, 10)
    b.ell((px, py + 0.43 * s, pz), (0.24 * s, 0.22 * s, 0.14 * s), army, 8)
    b.cyl((px, py + 0.42 * s, pz), 0.25 * s, 0.025 * s, gold, 8, axis="x")
    b.box((px, py + 0.39 * s, pz + 0.1 * s), (0.15 * s, 0.08 * s, 0.03 * s), visor)
    for ex in (0.05, -0.05):
        b.sph((px + ex * s, py + 0.41 * s, pz + 0.11 * s), 0.038 * s, blk, 6)


def export_static(ob, kind, folder):
    """Exporta GLB estático a public/models/cars/<kind>.glb y guarda .blend en folder."""
    os.makedirs(os.path.join(ROOT, "public", "models", "cars"), exist_ok=True)
    blend = os.path.join(folder, kind + ".blend")
    raw = os.path.join(folder, kind + "_raw.glb")
    clean = os.path.join(folder, kind + "_clean.glb")
    out = os.path.join(ROOT, "public", "models", "cars", kind + ".glb")
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(
        filepath=raw,
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_yup=True,
        export_texcoords=False,
        export_materials="EXPORT",
        export_apply=True,
    )
    subprocess.run(
        ["npx", "gltf-transform", "optimize", raw, clean, "--compress", "quantize", "--simplify", "false",
         "--texture-compress", "false", "--palette", "false"],
        cwd=ROOT, check=True,
    )
    if clean != out:
        import shutil
        shutil.copy2(clean, out)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    print("CAR", kind, "TRIS", tris, "->", out)
    return out
