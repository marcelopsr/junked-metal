# Felipe: bulldog francés gris con mancha blanca en el pecho. Jefe; modelo, esqueleto y animaciones desde cero.
# Proporciones de perro real (orejas de murciélago erguidas, hocico chato, pecho ancho, cola corta), tamaño cercano
# al procedural de enemyTemplate("perro") en src/models.ts (~9,5 de alto con las orejas, ~12,5 de largo).
# Uso (desde la raíz del repo):
#   /Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/perro/perro.py [-- render=DIR] [export=0]
# Deja perro.blend y perro_raw.glb acá y public/models/perro.glb (cuantizado con gltf-transform).
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bicho as b
import cuadrupedo as q
from cuadrupedo import put, swing, gait, leg, curve, LEGS, side
from mathutils import Vector

A = b.args()
S = 1.08  # metros del juego por unidad del script
T = lambda p: (p[0], p[1], p[2] if p[2] > 0 else p[2] * 0.85)  # acorta la mitad trasera: cuerpo compacto
b.reset()
mats = [b.mat("Body", "#6e7279", rough=0.75), b.mat("Chest", "#efebe2", rough=0.8), b.mat("Nose", "#202124", rough=0.35),
        b.mat("EarInner", "#b48a8c", rough=0.7)]
eye = b.mat("Eye", "#2a1a10", rough=0.1)

# ---------- Esqueleto (coordenadas del juego sin escalar) ----------
BONES = [("hips", (0, 3.9, -2.4), (0, 3.9, -0.6), None),
         ("spine", (0, 3.9, -0.6), (0, 3.9, 1.4), "hips"),
         ("chest", (0, 3.9, 1.4), (0, 4.2, 3.0), "spine"),
         ("neck", (0, 4.6, 3.2), (0, 5.6, 4.3), "chest"),
         ("head", (0, 5.6, 4.3), (0, 6.0, 6.6), "neck"),
         ("jaw", (0, 5.35, 4.9), (0, 4.95, 6.3), "head"),
         ("tail", (0, 4.3, -3.8), (0, 4.15, -4.8), "hips")]
for s in (1, -1):
    n = side(s)
    BONES += [("ear_" + n, (s * 1.0, 7.3, 4.65), (s * 1.6, 9.1, 4.5), "head"),
              ("arm_" + n, (s * 1.55, 3.9, 2.5), (s * 1.6, 2.3, 2.1), "chest"),
              ("forearm_" + n, (s * 1.6, 2.3, 2.1), (s * 1.55, 0.6, 2.35), "arm_" + n),
              ("fpaw_" + n, (s * 1.55, 0.6, 2.35), (s * 1.55, 0.05, 3.1), "forearm_" + n),
              ("thigh_" + n, (s * 1.35, 3.9, -2.5), (s * 1.5, 2.3, -1.7), "hips"),
              ("shin_" + n, (s * 1.5, 2.3, -1.7), (s * 1.45, 1.2, -3.1), "thigh_" + n),
              ("hpaw_" + n, (s * 1.45, 1.2, -3.1), (s * 1.45, 0.05, -2.6), "shin_" + n)]
ao = b.armature("PerroRig", [(n, tuple(x * S for x in T(h)), tuple(x * S for x in T(t)), p) for n, h, t, p in BONES])

# ---------- Malla ----------
m = q.Shape(S, T)
# tronco en pera: grupa redonda, cintura recogida, costillar y pecho anchos; sigue en el cuello corto y grueso
m.loft([((0, 4.15, -4.0), 0.9, 0.8), ((0, 4.15, -3.4), 1.55, 1.4), ((0, 4.1, -2.4), 1.75, 1.55),
        ((0, 4.15, -1.2), 1.6, 1.25), ((0, 3.95, 0.1), 1.85, 1.6), ((0, 3.8, 1.4), 2.05, 1.85),
        ((0, 3.85, 2.5), 2.0, 1.85), ((0, 4.15, 3.25), 1.7, 1.65), ((0, 4.9, 3.8), 1.45, 1.4), ((0, 5.6, 4.4), 1.3, 1.25)])
m.ell((0, 6.35, 4.75), (1.85, 1.45, 1.5))          # cráneo ancho
m.ell((0, 6.75, 5.55), (1.2, 0.45, 0.55))          # frente/arco ciliar
for s in (1, -1):
    m.ell((s * 1.05, 5.75, 5.2), (0.95, 0.95, 0.95))  # cachetes
    m.ell((s * 0.5, 5.3, 6.05), (0.58, 0.5, 0.5))     # belfos
    m.ell((s * 1.2, 3.75, 2.2), (0.75, 1.1, 0.95))   # paletas
    m.ell((s * 1.15, 3.45, -2.3), (0.85, 1.35, 1.2))  # muslos
    # oreja de murciélago: tres óvalos chatos de la base a la punta redonda, abiertos hacia afuera
    m.ell((s * 1.1, 7.5, 4.6), (0.85, 0.7, 0.3))
    m.ell((s * 1.38, 8.25, 4.55), (0.75, 0.62, 0.25))
    m.ell((s * 1.62, 8.85, 4.5), (0.58, 0.5, 0.21))
    m.tube([(s * 1.55, 3.9, 2.45), (s * 1.62, 2.3, 2.1), (s * 1.55, 0.55, 2.4)], [0.95, 0.62, 0.5])
    m.ell((s * 1.55, 0.38, 2.8), (0.66, 0.4, 0.85))   # mano
    m.tube([(s * 1.35, 3.6, -2.4), (s * 1.5, 2.3, -1.75), (s * 1.45, 1.2, -3.05), (s * 1.45, 0.4, -2.85)], [1.0, 0.7, 0.45, 0.45])
    m.ell((s * 1.45, 0.36, -2.55), (0.62, 0.38, 0.8))  # pie
m.ell((0, 5.6, 6.05), (1.05, 0.78, 0.65))          # hocico chato
m.ell((0, 5.95, 6.62), (0.42, 0.3, 0.22))          # trufa
m.ell((0, 4.95, 5.6), (0.95, 0.45, 0.85))          # mandíbula
m.tube([(0, 4.35, -3.75), (0, 4.3, -4.45), (0, 4.05, -4.8)], [0.45, 0.36, 0.18])  # cola corta
ob = m.skin("Perro", voxel=0.05, tris=7200, smooth=(0.6, 8))


def region(p, n):
    ax, ay = abs(p.x), p.y
    if ((p.x / 0.5) ** 2 + ((p.y - 5.95) / 0.38) ** 2 + ((p.z - 6.62) / 0.32) ** 2) < 1:
        return 2
    if ay > 7.65 and ax > 0.6 and n.z > 0.3 and q.seg_dist(Vector((ax, ay, 0)), Vector((1.1, 7.6, 0)), Vector((1.58, 9.0, 0))) < 0.4:
        return 3
    wob = 0.12 * math.sin(p.x * 5.0 + p.y * 3.0)
    if p.z > 1.6 and n.z > 0.1 and (p.x / 1.05) ** 2 + ((ay - 3.4) / 1.5) ** 2 < 1 + wob:
        return 1
    return 0


q.paint(ob, S, mats, region)
q.rig(ob, ao)
q.keep_on_body(ob, ao, [k + "_" + n for k in ("arm", "thigh") for n in "RL"], 0.2, 0.9)
q.add_rigid(ob, S, "head", eye, [((s * 0.92, 6.28, 5.95), (0.36, 0.36, 0.33), 12, 8) for s in (1, -1)])
q.tidy_weights(ob)

# ---------- Animaciones ----------
def idle(f):  # 48 cuadros: respira, mira a los costados, mueve la cola y sacude una oreja
    p = f / 48
    P = {}
    put(P, "hips", loc=(0, 0.04 * math.sin(2 * math.pi * 2 * p), 0))
    put(P, "chest", b.nose_up(0.025 * math.sin(2 * math.pi * 2 * p)))
    put(P, "neck", b.yaw_fwd(1, 0.18 * math.sin(2 * math.pi * p)))
    put(P, "head", b.lift(1, 0.12 * math.sin(2 * math.pi * p) ** 3))
    put(P, "tail", b.yaw_fwd(1, 0.5 * math.sin(2 * math.pi * 6 * p)))
    tw = max(0.0, math.sin(2 * math.pi * (p * 4 - 2.2))) if 0.55 < p < 0.68 else 0
    put(P, "ear_R", b.nose_up(0.5 * tw))
    for s, fr in LEGS:
        leg(P, s, fr, 0, 0)
    return P


def walk(f):  # 32 cuadros, paso lateral: trasera izq., delantera izq., trasera der., delantera der.
    p = f / 32
    P = {}
    gait(P, p, {(-1, False): 0, (-1, True): 0.25, (1, False): 0.5, (1, True): 0.75}, 0.62, 0.32)
    put(P, "hips", b.lift(1, 0.03 * math.sin(2 * math.pi * p)), (0, 0.07 * math.cos(4 * math.pi * p), 0))
    put(P, "spine", b.yaw_fwd(1, 0.04 * math.sin(2 * math.pi * p)))
    put(P, "head", b.nose_up(0.04 * math.sin(4 * math.pi * p)))
    put(P, "tail", b.yaw_fwd(1, 0.35 * math.sin(2 * math.pi * 2 * p)))
    return P


def run(f):  # 16 cuadros, galope: traseras juntas contra delanteras juntas, la columna se recoge y se estira
    p = f / 16
    P = {}
    gait(P, p, {(-1, False): 0, (1, False): 0.07, (-1, True): 0.5, (1, True): 0.57}, 0.42, 0.62, 1.2)
    c = math.cos(2 * math.pi * p)
    put(P, "hips", b.nose_up(-0.12 * math.sin(2 * math.pi * p)), (0, 0.45 * max(0, math.sin(2 * math.pi * p + 1.2)), 0))
    put(P, "spine", b.nose_up(-0.12 * c))
    put(P, "chest", b.nose_up(0.1 * c))
    put(P, "head", b.nose_up(0.08 * math.sin(2 * math.pi * p)))
    put(P, "ear_R", b.nose_up(0.3))
    put(P, "ear_L", b.nose_up(0.3))
    put(P, "tail", b.nose_up(-0.3 * c))
    return P


def attack_pose(v):
    """v: altura, cabeceo, avance z, barrido/elevación delanteras, barrido/elevación traseras, cabeza, mandíbula, abiertas."""
    y, pitch, z, fa, fu, ha, hu, hd, jaw, spl = v
    P = {}
    put(P, "hips", b.nose_up(pitch), (0, y, z))
    for s, fr in LEGS:
        put(P, ("arm_" if fr else "thigh_") + side(s), b.lift(s, -spl))
        leg(P, s, fr, fa if fr else ha, fu if fr else hu, base=-pitch)
    put(P, "neck", b.nose_up(hd * 0.5))
    put(P, "head", b.nose_up(hd * 0.5))
    put(P, "jaw", b.nose_up(-jaw))
    return P


#            y     pitch   z    fa    fu    ha    hu    head  jaw  splay
JUMP = {0: (0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        8: (-0.8, -0.08, -0.2, -0.15, 0.5, 0.35, 0.55, -0.25, 0, 0.05),     # se agacha
        12: (0.6, 0.35, 0.3, 0.7, 0.7, -0.8, 0, 0.15, 0.2, 0),               # despega estirado
        19: (1.1, 0.05, 0.6, 0.35, 1.0, 0.45, 1.0, 0.1, 0.35, 0),             # arriba, patas recogidas
        25: (0.2, -0.3, 0.7, 0.6, 0.1, -0.2, 0.3, -0.2, 0.4, 0.15),           # cae de manos
        28: (-1.0, -0.12, 0.7, 0.1, 0.75, 0.3, 0.7, -0.35, 0.5, 0.35),        # golpe: aplasta y abre las patas
        31: (-0.7, -0.08, 0.7, 0.1, 0.6, 0.3, 0.6, -0.25, 0.3, 0.3),
        40: (0, 0, 0, 0, 0, 0, 0, 0, 0, 0)}
CHARGE = {0: (0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
          7: (-0.35, -0.06, -0.7, -0.25, 0.15, 0.4, 0.4, -0.45, 0, 0.08),     # retrocede y baja la cabeza
          12: (0.15, -0.12, 1.7, 0.65, 0.45, -0.65, 0, -0.35, 0.35, 0),       # embiste
          16: (0.05, 0.05, 2.0, 0.3, 0.2, -0.3, 0.2, 0.35, 0.25, 0),          # revolea la cabeza para arriba
          26: (0, 0, 0, 0, 0, 0, 0, 0, 0, 0)}


def rage(f):  # 40 cuadros en bucle: se planta abierto, cabeza gacha, lomo arqueado, gruñe y tiembla
    p = f / 40
    P = {}
    put(P, "hips", b.nose_up(0.07), (0.03 * math.sin(2 * math.pi * 10 * p), -0.12, 0))
    put(P, "chest", b.nose_up(-0.12))
    put(P, "neck", b.nose_up(-0.18) @ b.yaw_fwd(1, 0.05 * math.sin(2 * math.pi * 2 * p)))
    put(P, "head", b.nose_up(0.1 + 0.03 * math.sin(2 * math.pi * 8 * p)))
    put(P, "jaw", b.nose_up(-(0.22 + 0.08 * math.sin(2 * math.pi * 6 * p))))
    put(P, "tail", b.nose_up(0.5))
    for s, fr in LEGS:
        put(P, ("arm_" if fr else "thigh_") + side(s), b.lift(s, -0.12))
        leg(P, s, fr, 0.1 if fr else -0.08, 0.15, base=0.05 if fr else -0.07)
        put(P, "ear_" + side(s), b.nose_up(-0.25))
    return P


#        y     roll  pitch  head  jaw  legs
DEATH = {0: (0, 0, 0, 0, 0, 0),
         8: (-0.2, -0.15, 0.05, -0.3, 0.2, 0.2),    # tambalea
         16: (-0.9, 0.1, -0.2, -0.5, 0.3, 0.5),    # se le doblan las manos
         27: (-2.0, 1.48, -0.05, -0.2, 0.35, 0.1),  # cae de costado
         31: (-1.85, 1.38, -0.05, -0.25, 0.4, 0.1),  # rebote
         36: (-2.0, 1.48, -0.05, -0.15, 0.45, 0),
         48: (-2.0, 1.5, -0.05, -0.1, 0.45, 0)}


def death(f):
    y, roll, pitch, hd, jaw, lg = curve(DEATH, f)
    P = {}
    put(P, "hips", b.lift(1, roll) @ b.nose_up(pitch), (0, y, 0))
    put(P, "neck", b.nose_up(hd * 0.5))
    put(P, "head", b.nose_up(hd * 0.5) @ b.lift(1, -roll * 0.25))
    put(P, "jaw", b.nose_up(-jaw))
    for s, fr in LEGS:
        leg(P, s, fr, (0.25 if fr else -0.2) * (1 - lg), lg)
        put(P, "ear_" + side(s), b.lift(s, -0.3 * roll / 1.5))
    put(P, "tail", b.nose_up(-0.3 * roll))
    return P


acts = {"idle": (range(0, 49, 2), idle), "walk": (range(0, 33, 2), walk), "run": (range(0, 17), run),
        "jump_slam": (range(0, 41), lambda f: attack_pose(curve(JUMP, f))),
        "charge": (range(0, 27), lambda f: attack_pose(curve(CHARGE, f))),
        "rage": (range(0, 41), rage), "death": (range(0, 49), death)}
act = {k: b.action(ao, k, fr, fn) for k, (fr, fn) in acts.items()}
q.ground_report(ao, ob, act)
if A.get("export", "1") != "0":
    b.export(ao, ob, "perro", os.path.dirname(os.path.abspath(__file__)))

if "render" in A:
    T, D = (0, 4.2, 0.8), 24
    q.render(ao, A["render"], "perro", [
        ("34", None, 0, (1, 0.45, 1.1)), ("lateral", None, 0, (1, 0.12, 0)), ("frontal", None, 0, (0, 0.15, 1)),
        ("walk", act["walk"], 8, (1, 0.25, 0.4)), ("run", act["run"], 6, (1, 0.12, 0)),
        ("jump_slam_aire", act["jump_slam"], 19, (1, 0.12, 0.2)), ("jump_slam_golpe", act["jump_slam"], 28, (1, 0.3, 0.9)),
        ("charge", act["charge"], 12, (1, 0.12, 0.2)), ("rage", act["rage"], 10, (0.8, 0.3, 1)),
        ("idle", act["idle"], 12, (1, 0.35, 1)), ("death", act["death"], 40, (0.6, 0.6, 1))], T, D)
