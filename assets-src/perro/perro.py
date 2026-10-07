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
mats = [b.mat("Body", "#5c6068", rough=0.72), b.mat("Chest", "#faf8f2", rough=0.78), b.mat("Nose", "#101214", rough=0.32),
        b.mat("EarInner", "#c49a9c", rough=0.65)]
eye = b.mat("Eye", "#3a2418", rough=0.08, emit=0.35)  # GLB.perro.eye en glb.ts

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
    BONES += [("ear_" + n, (s * 1.0, 7.3, 4.65), (s * 1.65, 9.2, 4.45), "head"),
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
m.ell((0, 6.35, 4.75), (1.95, 1.5, 1.55))          # cráneo ancho
m.ell((0, 6.75, 5.55), (1.2, 0.45, 0.55))          # frente/arco ciliar
for s in (1, -1):
    m.ell((s * 1.05, 5.75, 5.2), (0.95, 0.95, 0.95))  # cachetes
    m.ell((s * 0.5, 5.3, 6.05), (0.58, 0.5, 0.5))     # belfos
    m.ell((s * 1.2, 3.75, 2.2), (0.75, 1.1, 0.95))   # paletas
    m.ell((s * 1.15, 3.45, -2.3), (0.85, 1.35, 1.2))  # muslos
    # oreja de murciélago: tres óvalos chatos, punta redonda — silueta icónica a distancia (oleada 1b)
    m.ell((s * 1.1, 7.45, 4.6), (1.12, 0.96, 0.36))
    m.ell((s * 1.44, 8.28, 4.52), (1.14, 0.92, 0.32))
    m.ell((s * 1.7, 9.05, 4.42), (0.96, 0.74, 0.28))
    m.tube([(s * 1.55, 3.9, 2.45), (s * 1.62, 2.3, 2.1), (s * 1.55, 0.55, 2.4)], [0.95, 0.62, 0.5])
    m.ell((s * 1.55, 0.38, 2.8), (0.66, 0.4, 0.85))   # mano
    m.tube([(s * 1.35, 3.6, -2.4), (s * 1.5, 2.3, -1.75), (s * 1.45, 1.2, -3.05), (s * 1.45, 0.4, -2.85)], [1.0, 0.7, 0.45, 0.45])
    m.ell((s * 1.45, 0.36, -2.55), (0.62, 0.38, 0.8))  # pie
m.ell((0, 5.6, 6.05), (1.05, 0.78, 0.65))          # hocico chato
m.ell((0, 5.95, 6.62), (0.42, 0.3, 0.22))          # trufa
m.ell((0, 4.95, 5.6), (0.95, 0.45, 0.85))          # mandíbula
m.tube([(0, 4.35, -3.75), (0, 4.3, -4.45), (0, 4.05, -4.8)], [0.45, 0.36, 0.18])  # cola corta
ob = m.skin("Perro", voxel=0.05, tris=5800, smooth=(0.6, 8))


def region(p, n):
    ax, ay = abs(p.x), p.y
    if ((p.x / 0.5) ** 2 + ((p.y - 5.95) / 0.38) ** 2 + ((p.z - 6.62) / 0.32) ** 2) < 1:
        return 2
    # interior de oreja: franja rosa legible en 3/4 y frontal (oleada 1b)
    if ay > 7.25 and ax > 0.42:
        ear = q.seg_dist(Vector((ax, ay, 0)), Vector((1.05, 7.5, 0)), Vector((1.72, 9.05, 0)))
        if ear < 0.78 and (n.z > 0.12 or (p.x * n.x > 0.2 and n.z > -0.08)):
            return 3
    # mancha blanca de pecho: babero ancho sin ruido procedural (oleada 1b)
    if n.z > 0.1 and ax < 1.12:
        bib = (p.x / 0.98) ** 2 + ((ay - 3.5) / 1.82) ** 2 + ((p.z - 2.45) / 1.42) ** 2
        if p.z > 1.35 and ay > 2.75 and bib < 1.02:
            return 1
        if 2.65 < ay < 4.35 and p.z > 1.55 and (p.x / 0.78) ** 2 + ((ay - 3.3) / 1.15) ** 2 < 0.92:
            return 1
    return 0


q.paint(ob, S, mats, region)
q.refine(ob, S, region, rounds=2)
q.rig(ob, ao)
q.keep_on_body(ob, ao, [k + "_" + n for k in ("arm", "thigh") for n in "RL"], 0.2, 0.9)
q.add_rigid(ob, S, "head", eye, [((s * 0.92, 6.28, 5.95), (0.38, 0.38, 0.35), 12, 8) for s in (1, -1)])
q.tidy_weights(ob)

# ---------- Animaciones (patas con IK: los pies apoyados no se hunden ni patinan) ----------
def idle(f):  # 48 cuadros: respira, mira a los costados, mueve la cola y sacude una oreja
    p = f / 48
    P = {}
    put(P, "hips", loc=(0, 0.05 * math.sin(2 * math.pi * 2 * p), 0))
    put(P, "chest", b.nose_up(0.025 * math.sin(2 * math.pi * 2 * p)))
    put(P, "neck", b.yaw_fwd(1, 0.18 * math.sin(2 * math.pi * p)))
    put(P, "head", b.lift(1, 0.12 * math.sin(2 * math.pi * p) ** 3))
    put(P, "tail", b.yaw_fwd(1, 0.5 * math.sin(2 * math.pi * 6 * p)))
    tw = max(0.0, math.sin(2 * math.pi * (p * 4 - 2.2))) if 0.55 < p < 0.68 else 0
    put(P, "ear_R", b.nose_up(0.5 * tw))
    q.feet(P, (0, 0, 0), (0, 0, 0))
    return P


def walk(f):  # 32 cuadros, paso lateral: trasera izq., delantera izq., trasera der., delantera der.
    p = f / 32
    P = {}
    gait(P, p, {(-1, False): 0, (-1, True): 0.25, (1, False): 0.5, (1, True): 0.75}, 0.62, 0.9, 0.9)
    put(P, "hips", b.lift(1, 0.03 * math.sin(2 * math.pi * p)), (0, 0.08 * math.cos(4 * math.pi * p) - 0.04, 0))
    put(P, "spine", b.yaw_fwd(1, 0.04 * math.sin(2 * math.pi * p)))
    put(P, "head", b.nose_up(0.04 * math.sin(4 * math.pi * p)))
    put(P, "tail", b.yaw_fwd(1, 0.35 * math.sin(2 * math.pi * 2 * p)))
    return P


def run(f):  # 16 cuadros, galope: traseras juntas contra delanteras juntas, la columna se recoge y se estira
    p = f / 16
    w = 2 * math.pi * p
    P = {}
    gait(P, p, {(-1, False): 0, (1, False): 0.07, (-1, True): 0.5, (1, True): 0.57}, 0.42, 1.7, 1.5, (1.3, 0.5))
    c = math.cos(w)
    put(P, "hips", b.nose_up(-0.1 * math.sin(w)), (0, 0.35 * max(0, math.sin(w + 1.2)) - 0.1, 0))
    put(P, "spine", b.nose_up(-0.12 * c))
    put(P, "chest", b.nose_up(0.1 * c))
    put(P, "head", b.nose_up(0.08 * math.sin(w)))
    put(P, "ear_R", b.nose_up(0.3))
    put(P, "ear_L", b.nose_up(0.3))
    put(P, "tail", b.nose_up(-0.3 * c))
    return P


def attack_pose(v):
    """v: altura, cabeceo y avance del cuerpo; pies delanteros y traseros (dz, dy en el mundo); cabeza, mandíbula, abiertas."""
    y, pitch, z, fz, fy, hz, hy, hd, jaw, spl = v
    P = {}
    put(P, "hips", b.nose_up(pitch), (0, y, z))
    for s in (1, -1):
        put(P, "arm_" + side(s), b.lift(s, -spl))
        put(P, "thigh_" + side(s), b.lift(s, -spl * 0.5))
    q.feet(P, (fz, fy, 0.9 * min(1, max(0, fy))), (hz, hy, 0.4 * min(1, max(0, hy))))
    put(P, "neck", b.nose_up(hd * 0.5))
    put(P, "head", b.nose_up(hd * 0.5))
    put(P, "jaw", b.nose_up(-jaw))
    return P


#            y     pitch   z    fz    fy    hz    hy    head  jaw  splay
JUMP = {0: (0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        8: (-0.9, -0.08, -0.2, 0, 0, 0, 0, -0.25, 0, 0.05),           # se agacha, pies plantados
        12: (0.7, 0.35, 0.3, 1.2, 1.9, -0.4, 0, 0.15, 0.2, 0),         # despega: manos arriba, patas de atrás empujan
        19: (1.4, 0.05, 0.6, 1.2, 2.6, 0.7, 2.4, 0.1, 0.35, 0),        # arriba, todo recogido
        25: (0.3, -0.3, 0.75, 1.5, 0.4, 0.9, 1.4, -0.2, 0.4, 0.15),    # cae de manos
        28: (-1.0, -0.12, 0.75, 1.4, 0, 0.8, 0, -0.35, 0.5, 0.35),     # golpe: aplasta y abre las patas
        31: (-0.75, -0.08, 0.75, 1.4, 0, 0.8, 0, -0.25, 0.3, 0.3),
        40: (0, 0, 0, 0, 0, 0, 0, 0, 0, 0)}
CHARGE = {0: (0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
          7: (-0.65, -0.12, -0.9, 0, 0, 0, 0, -0.7, 0.1, 0.1),            # retrocede, se agacha y baja la cabeza
          12: (0.15, -0.12, 1.7, 2.6, 0.6, 0.3, 0, -0.35, 0.35, 0),     # embiste: manos adelante, atrás empuja
          16: (0.05, 0.05, 2.0, 2.7, 0, 1.4, 0.6, 0.35, 0.25, 0),       # revolea la cabeza para arriba
          26: (0, 0, 0, 0, 0, 0, 0, 0, 0, 0)}


def rage(f):  # 40 cuadros en bucle: planta las patas abiertas, cabeza gacha, lomo arqueado, gruñe con la boca bien abierta y tiembla
    p = f / 40
    w = 2 * math.pi * p
    P = {}
    put(P, "hips", b.nose_up(0.1), (0.07 * math.sin(10 * w), -0.45 + 0.05 * math.sin(4 * w), 0))
    put(P, "spine", b.yaw_fwd(1, 0.04 * math.sin(2 * w)))
    put(P, "chest", b.nose_up(-0.2 + 0.04 * math.sin(4 * w)))  # el pecho late al respirar
    put(P, "neck", b.nose_up(-0.4) @ b.yaw_fwd(1, 0.12 * math.sin(2 * w)))
    put(P, "head", b.nose_up(0.35 + 0.04 * math.sin(8 * w)) @ b.yaw_fwd(1, 0.1 * math.sin(3 * w)))
    put(P, "jaw", b.nose_up(-(0.5 + 0.12 * math.sin(6 * w))))
    put(P, "tail", b.nose_up(0.6 + 0.1 * math.sin(5 * w)))
    for s in (1, -1):
        put(P, "arm_" + side(s), b.lift(s, -0.16))
        put(P, "thigh_" + side(s), b.lift(s, -0.1))
        put(P, "ear_" + side(s), b.nose_up(-0.5) @ b.lift(s, -0.2))
    q.feet(P, (0.35, 0, 0), (-0.3, 0, 0))
    return P


#        y     roll  pitch  head  jaw  legs
DEATH = {0: (0, 0, 0, 0, 0, 0),
         8: (-0.25, -0.12, 0.05, -0.3, 0.2, 0),       # tambalea (pies plantados con IK)
         16: (-0.75, 0.1, -0.15, -0.5, 0.3, 0),       # se le doblan las manos
         22: (-1.3, 0.3, -0.1, -0.4, 0.3, 0),         # agachado del todo, empieza a irse de costado
         25: (-1.25, 1.15, -0.05, -0.3, 0.35, 0.6),    # cae con las patas recogiéndose
         27: (-1.45, 1.48, -0.05, -0.2, 0.35, 1.0),
         31: (-1.3, 1.38, -0.05, -0.25, 0.4, 1.0),    # rebote
         36: (-1.55, 1.48, -0.05, -0.15, 0.45, 1.0),
         48: (-1.55, 1.5, -0.05, -0.1, 0.45, 1.0)}


def death(f):
    y, roll, pitch, hd, jaw, lg = curve(DEATH, f)
    P = {}
    put(P, "hips", b.lift(1, roll) @ b.nose_up(pitch), (0, y, 0))
    put(P, "neck", b.nose_up(hd * 0.5))
    put(P, "head", b.nose_up(hd * 0.5) @ b.lift(1, -roll * 0.25))
    put(P, "jaw", b.nose_up(-jaw))
    # patas siempre con IK (pies plantados al caer; recogidos al irse de costado): pasar de IK a FK en un cuadro daba un salto
    q.feet(P, (0.1 * min(1, f / 16) + 0.2 * lg, 1.8 * lg, 0.9 * lg), (-0.1 * lg, 1.5 * lg, 0.5 * lg))
    for s in (1, -1):
        put(P, "ear_" + side(s), b.lift(s, -0.3 * roll / 1.5))
    put(P, "tail", b.nose_up(-0.3 * roll))
    return P


acts = {"idle": (range(0, 49, 2), idle), "walk": (range(0, 33, 2), walk), "run": (range(0, 17), run),
        "jump_slam": (range(0, 41), lambda f: attack_pose(curve(JUMP, f))),
        "charge": (range(0, 27), lambda f: attack_pose(curve(CHARGE, f))),
        "rage": (range(0, 41), rage), "death": (range(0, 49), death)}
act = {k: q.action(ao, k, fr, fn) for k, (fr, fn) in acts.items()}
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
