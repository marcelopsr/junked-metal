# Eulalio: gato atigrado naranja con rayas, panza clara y cola larga. Jefe; modelo, esqueleto y animaciones desde cero.
# Proporciones de gato real (cabeza chica, patas finas, cola de 2/3 del cuerpo); alto parecido al procedural de
# enemyTemplate("gato") en src/models.ts (~6 con las orejas), mucho más delgado que aquel.
# Uso (desde la raíz del repo):
#   /Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/gato/gato.py [-- render=DIR] [export=0]
# Deja gato.blend y gato_raw.glb acá y public/models/gato.glb (cuantizado con gltf-transform).
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bicho as b
import cuadrupedo as q
from cuadrupedo import put, swing, gait, leg, curve, LEGS, side
from mathutils import Vector

A = b.args()
S = 1.0
T = lambda p: (p[0], p[1], p[2] if p[2] > 3 else 3 + (p[2] - 3) * 0.9)  # acorta el tronco (la cola se corre con él)
b.reset()
mats = [b.mat("Body", "#f08828", rough=0.78), b.mat("Stripe", "#7a3010", rough=0.82), b.mat("Belly", "#fff0d8", rough=0.82),
        b.mat("Nose", "#e87888", rough=0.38), b.mat("EarInner", "#f0b0a8", rough=0.65)]
eye, pupil = b.mat("Eye", "#b5d43a", rough=0.08, emit=0.55), b.mat("Pupil", "#0a0a0a", rough=0.1)

TAIL = [(0, 3.55, -3.35), (0, 3.15, -4.85), (0, 2.85, -6.35), (0, 2.68, -8.0), (0, 2.58, -9.85)]
BONES = [("hips", (0, 3.4, -2.3), (0, 3.35, -0.6), None),
         ("spine", (0, 3.35, -0.6), (0, 3.35, 1.3), "hips"),
         ("chest", (0, 3.35, 1.3), (0, 3.6, 2.9), "spine"),
         ("neck", (0, 3.9, 3.1), (0, 4.75, 3.95), "chest"),
         ("head", (0, 4.75, 3.95), (0, 4.9, 5.4), "neck"),
         ("jaw", (0, 4.5, 4.45), (0, 4.22, 5.15), "head")]
BONES += [("tail%d" % (i + 1), TAIL[i], TAIL[i + 1], "tail%d" % i if i else "hips") for i in range(4)]
for s in (1, -1):
    n = side(s)
    BONES += [("ear_" + n, (s * 0.55, 5.6, 4.25), (s * 0.85, 6.5, 4.05), "head"),
              ("arm_" + n, (s * 0.7, 3.6, 2.4), (s * 0.75, 2.2, 2.05), "chest"),
              ("forearm_" + n, (s * 0.75, 2.2, 2.05), (s * 0.72, 0.5, 2.2), "arm_" + n),
              ("fpaw_" + n, (s * 0.72, 0.5, 2.2), (s * 0.72, 0.05, 2.75), "forearm_" + n),
              ("thigh_" + n, (s * 0.75, 3.4, -2.3), (s * 0.85, 2.2, -1.5), "hips"),
              ("shin_" + n, (s * 0.85, 2.2, -1.5), (s * 0.8, 0.9, -2.9), "thigh_" + n),
              ("hpaw_" + n, (s * 0.8, 0.9, -2.9), (s * 0.8, 0.05, -2.45), "shin_" + n)]
ao = b.armature("GatoRig", [(n, tuple(x * S for x in T(h)), tuple(x * S for x in T(t)), p) for n, h, t, p in BONES])

# ---------- Malla ----------
m = q.Shape(S, T)
m.loft([((0, 3.4, -3.55), 0.54, 0.54), ((0, 3.42, -3.05), 1.02, 1.0), ((0, 3.35, -2.2), 1.14, 1.14),
        ((0, 3.15, -1.0), 1.05, 1.14), ((0, 3.25, 0.3), 1.12, 1.2), ((0, 3.3, 1.5), 1.14, 1.28),
        ((0, 3.45, 2.45), 1.02, 1.22), ((0, 3.85, 3.05), 0.82, 0.95), ((0, 4.3, 3.5), 0.68, 0.72), ((0, 4.75, 3.95), 0.66, 0.66)])
# cola más gruesa en la base y punta redondeada — silueta icónica en trompo/salto (oleada 1b)
m.loft([(TAIL[0], 0.41, 0.41), (TAIL[1], 0.35, 0.35), (TAIL[2], 0.32, 0.32), (TAIL[3], 0.29, 0.29), (TAIL[4], 0.24, 0.24)], 14)
m.ell((0, 2.58, -9.85), (0.26, 0.26, 0.3), 12, 8)
m.ell((0, 5.0, 4.35), (1.0, 0.88, 0.95))            # cráneo
m.ell((0, 4.55, 5.12), (0.45, 0.35, 0.38))          # hocico
m.ell((0, 4.2, 4.98), (0.32, 0.22, 0.32))           # mentón
m.ell((0, 4.78, 5.42), (0.16, 0.11, 0.1), 10, 6)    # nariz
for s in (1, -1):
    m.ell((s * 0.5, 4.62, 4.72), (0.58, 0.52, 0.55))   # cachetes
    m.ell((s * 0.22, 4.5, 5.26), (0.3, 0.26, 0.24))    # almohadillas de los bigotes
    m.cone((s * 0.55, 5.45, 4.3), (s * 0.88, 6.55, 4.08), 0.45)  # orejas triangulares
    m.ell((s * 0.62, 3.55, 2.3), (0.44, 0.78, 0.66))    # escápulas
    m.ell((s * 0.68, 3.0, -2.1), (0.54, 0.95, 0.86))    # muslos
    m.tube([(s * 0.7, 3.4, 2.4), (s * 0.77, 2.2, 2.05), (s * 0.72, 0.45, 2.25)], [0.55, 0.36, 0.28], 12)
    m.ell((s * 0.72, 0.26, 2.55), (0.35, 0.26, 0.46), 12, 8)  # mano
    m.tube([(s * 0.75, 3.2, -2.25), (s * 0.86, 2.2, -1.55), (s * 0.8, 0.9, -2.85), (s * 0.8, 0.3, -2.6)], [0.7, 0.42, 0.26, 0.26], 12)
    m.ell((s * 0.8, 0.24, -2.4), (0.33, 0.24, 0.45), 12, 8)   # pie
ob = m.skin("Gato", voxel=0.035, tris=3900, smooth=(0.6, 8))

STRIPE, BELLY, BODY = 1, 2, 0


def region(p, n):
    ax, y, z = abs(p.x), p.y, p.z
    if (p.x / 0.2) ** 2 + ((y - 4.78) / 0.14) ** 2 + ((z - 5.42) / 0.14) ** 2 < 1:
        return 3
    if y > 5.65 and n.z > 0.25 and q.seg_dist(Vector((ax, y, 0)), Vector((0.6, 5.6, 0)), Vector((0.86, 6.45, 0))) < 0.22:
        return 4
    # cara: hocico, mentón y garganta claros; "M" en la frente y rayas en los cachetes
    if z > 3.9:
        if (z > 4.75 and y < 4.62 and ax < 0.6) or (y < 4.35 and ax < 0.5 and z > 4.2):
            return BELLY
        if y > 5.15 and z > 4.55 and n.z > 0.15 and ax < 0.62 and math.sin(p.x * 15 + 1.57) > 0.45:
            return STRIPE
        if ax > 0.72 and 4.35 < y < 4.95 and math.sin(y * 16 - z * 3) > 0.55:
            return STRIPE
        if z < 4.5 and y > 4.6 and n.y > -0.2 and math.sin(z * 9) > 0.4:  # nuca
            return STRIPE
        return BODY
    # cola: anillos más contrastados, punta y base oscuras (oleada 1b)
    if z < -3.5 and y > 1.8:
        if z < -9.15 or z > -3.75:
            return STRIPE
        return STRIPE if math.sin(-z * 6.4) > -0.08 else BODY
    # patas: medias claras, adentro claro, anillos afuera
    legz = 1.5 < z < 3.2 or -3.5 < z < -1.2
    if ax > 0.3 and (y < 1.9 or (y < 2.35 and legz)):
        if y < 0.55 or (n.x * p.x < -0.4 * ax):
            return BELLY
        return STRIPE if math.sin(y * 11) > 0.55 else BODY
    # tronco: panza y pecho claros, raya del lomo y rayas verticales onduladas por los costados
    belly = 2.65 + 0.45 * max(0.0, z - 1.6)
    if y < belly or (z > 2.7 and n.z > 0.45 and y < 4.1 and ax < 0.55):
        return BELLY
    if ax < 0.16 and n.y > 0.72 and y > belly + 0.25 and -3.3 < z < 2.85:
        return STRIPE
    if y > belly + 0.12 and math.sin(z * 6.4 + 0.8 * math.sin(y * 2.2) + 1.05 * ax) > 0.04:
        return STRIPE
    return BODY


q.paint(ob, S, mats, region)
q.refine(ob, S, region, rounds=2)
q.rig(ob, ao)
q.keep_on_body(ob, ao, [k + "_" + n for k in ("arm", "thigh") for n in "RL"], 0.15, 0.6)
q.add_rigid(ob, S, "head", eye, [((s * 0.4, 4.97, 5.1), (0.25, 0.23, 0.2), 12, 8) for s in (1, -1)])
q.add_rigid(ob, S, "head", pupil, [((s * 0.4, 4.97, 5.27), (0.06, 0.18, 0.05), 6, 6) for s in (1, -1)])
q.tidy_weights(ob)


# ---------- Animaciones ----------
def tail(P, shape, wave=0.0, ph=0.0, lag=0.9):
    """shape: alzada de cada hueso (positivo = arriba); wave: vaivén lateral que viaja hacia la punta."""
    for i, up in enumerate(shape):
        put(P, "tail%d" % (i + 1), b.nose_up(-up) @ b.yaw_fwd(1, wave * math.sin(ph - i * lag)))


Q_TAIL = (1.0, 0.45, -0.35, -0.55)  # cola en signo de pregunta


def idle(f):  # 48 cuadros: respira, mira, menea la cola despacio y sacude una oreja
    p = f / 48
    w = 2 * math.pi * p
    P = {}
    put(P, "hips", loc=(0, 0.03 * math.sin(2 * w), 0))
    put(P, "chest", b.nose_up(0.02 * math.sin(2 * w)))
    put(P, "neck", b.yaw_fwd(1, 0.25 * math.sin(w)))
    put(P, "head", b.lift(1, 0.15 * math.sin(w) ** 3))
    tail(P, Q_TAIL, 0.3, w)
    tw = max(0.0, math.sin(2 * math.pi * (p * 5 - 1.5))) if 0.3 < p < 0.4 else 0
    put(P, "ear_L", b.nose_up(0.6 * tw) @ b.lift(-1, -0.3 * tw))
    put(P, "ear_R", b.nose_up(0))
    for s, fr in LEGS:
        leg(P, s, fr, 0, 0)
    return P


def walk(f):  # 32 cuadros, paso lateral, cola alta
    p = f / 32
    w = 2 * math.pi * p
    P = {}
    gait(P, p, {(-1, False): 0, (-1, True): 0.25, (1, False): 0.5, (1, True): 0.75}, 0.6, 0.85, 0.7)
    put(P, "hips", b.lift(1, 0.04 * math.sin(w)), (0, 0.05 * math.cos(2 * w), 0))
    put(P, "spine", b.yaw_fwd(1, 0.05 * math.sin(w)))
    put(P, "head", b.nose_up(-0.03 * math.sin(2 * w)))
    tail(P, Q_TAIL, 0.12, w)
    return P


def run(f):  # 16 cuadros, galope: la columna se dobla mucho (gato), la cola atrás
    p = f / 16
    w = 2 * math.pi * p
    P = {}
    gait(P, p, {(-1, False): 0, (1, False): 0.06, (-1, True): 0.5, (1, True): 0.56}, 0.38, 1.8, 1.2, (1.2, 0.5))
    c = math.cos(w)
    put(P, "hips", b.nose_up(-0.16 * math.sin(w)), (0, 0.35 * max(0, math.sin(w + 1.2)), 0))
    put(P, "spine", b.nose_up(-0.2 * c))
    put(P, "chest", b.nose_up(0.16 * c))
    put(P, "head", b.nose_up(0.1 * math.sin(w)))
    for s in (1, -1):
        put(P, "ear_" + side(s), b.nose_up(0.35))
    tail(P, (0.2 + 0.15 * c, 0.05, 0, 0.1 * c), 0)
    return P


def attack_pose(v, ik=False):
    """v: altura, cabeceo, avance z, delanteras (barrido, elevación), traseras (barrido, elevación), cabeza, mandíbula, abiertas.
    ik=True: delanteras/traseras son (dz, dy) del pie en el mundo (patas con IK: apoyadas no se hunden, ver ground_report)."""
    y, pitch, z, fa, fu, ha, hu, hd, jaw, spl = v
    P = {}
    put(P, "hips", b.nose_up(pitch), (0, y, z))
    for s, fr in LEGS:
        put(P, ("arm_" if fr else "thigh_") + side(s), b.lift(s, -spl))
        if not ik:
            leg(P, s, fr, fa if fr else ha, fu if fr else hu, base=-pitch)
    if ik:
        q.feet(P, (fa, fu, 0.9 * min(1, max(0, fu))), (ha, hu, 0.4 * min(1, max(0, hu))))
    put(P, "neck", b.nose_up(hd * 0.5))
    put(P, "head", b.nose_up(hd * 0.5))
    put(P, "jaw", b.nose_up(-jaw))
    return P


#            y     pitch   z    fz    fy    hz    hy    head  jaw  splay   (fz/fy, hz/hy: pies en el mundo, IK)
JUMP = {0: (0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        6: (-0.9, -0.05, -0.3, 0, 0, 0, 0, 0.15, 0, 0.05),                # se agazapa, pies plantados
        16: (-0.95, -0.05, -0.3, 0, 0, 0, 0, 0.15, 0, 0.05),               # (meneo de cola y cadera, abajo)
        19: (-0.15, 0.08, 0.05, 0.55, 0.75, -0.45, 0.12, 0.12, 0.2, 0),   # despegue (SEQ fase 1 @ cuadro 19)
        20: (0.35, 0.28, 0.55, 0.95, 0.98, -0.85, 0.18, 0.1, 0.24, 0),     # salta estirado, manos adelante, patas de atrás empujan
        25: (0.6, -0.05, 1.2, 0.8, 1.6, -0.3, 1.5, -0.1, 0.35, 0),         # arriba, recogido
        29: (-0.45, -0.15, 1.3, 0.4, 0, 0.3, 0, -0.2, 0.2, 0.1),          # cae y amortigua
        38: (0, 0, 0, 0, 0, 0, 0, 0, 0, 0)}


def jump(f):
    P = attack_pose(curve(JUMP, f), ik=True)
    wig = math.sin(2 * math.pi * (f - 6) / 5) if 6 <= f <= 16 else 0  # el meneo antes de saltar
    put(P, "hips", b.yaw_fwd(1, 0.08 * wig))
    tail(P, (0.1, 0.05, 0, 0.1), 0.35 if 6 <= f <= 18 else 0.05, f * 1.1)
    return P


def spin(f):  # 24 cuadros: se agacha (0-4), una vuelta entera a velocidad constante agachado, patas abiertas y la cola hacia afuera (4-20: es un ciclo), se para (20-24)
    low = min(1, f / 4, (24 - f) / 4)
    t = min(1, max(0, (f - 4) / 16))  # 4→20: una vuelta; en 20 yaw=2π ≡ 0 para loop con cuadro 4
    P = attack_pose((-0.16 * low, 0, 0, 0.14 * low, 0.88 * low, -0.14 * low, 0.88 * low, -0.2 * low, 0.3 * low, 0.34 * low))  # FK: con IK el giro de 180° de las caderas rompe el plano sagital
    put(P, "hips", b.yaw_fwd(1, 2 * math.pi * t))
    tail(P, (-0.12 * low, 0.05 * low, 0, 0), 0.55 * low, f * 0.35 if 4 <= f < 20 else 0, 0)
    for s in (1, -1):
        put(P, "ear_" + side(s), b.nose_up(0.6 * low))
    return P


#         y     pitch  z    head  jaw  a_up  a_swing  a_out  forearm
SWIPE = {0: (0, 0, 0, 0, 0, 0, 0, 0, 0),
         7: (0.3, 0.35, -0.4, 0.2, 0.25, 1.2, 2.1, 0.5, -0.3),     # se para de atrás y levanta la mano derecha
         11: (0.05, 0.15, 0.3, -0.15, 0.45, 0.5, 1.4, -0.5, 0.2),  # zarpazo cruzado
         14: (-0.05, 0.05, 0.35, -0.15, 0.35, 0.4, 0.8, -0.65, 0.1),
         20: (0, 0, 0, 0, 0, 0, 0, 0, 0)}


def swipe(f):
    y, pitch, z, hd, jaw, aup, asw, aout, fo = curve(SWIPE, f)
    P = attack_pose((y, pitch, z, 0, 0, 0.1 * pitch, 0.4 * pitch, hd, jaw, 0))
    del P["arm_R"], P["forearm_R"], P["fpaw_R"]
    put(P, "arm_R", b.yaw_fwd(1, -aout) @ b.lift(1, aout * 0.4) @ swing(asw - pitch))
    put(P, "forearm_R", swing(-aup + fo))
    put(P, "fpaw_R", swing(0.6 * aup))
    put(P, "chest", b.yaw_fwd(1, -0.4 * aout))
    tail(P, (0.3, 0.1, 0, 0), 0.3, f * 0.6)
    for s in (1, -1):
        put(P, "ear_" + side(s), b.nose_up(0.5 * jaw))
    return P


def rage(f):  # 40 cuadros en bucle: lomo erizado en arco, patas estiradas, cola parada que late, orejas atrás y bufido
    p = f / 40
    w = 2 * math.pi * p
    P = {}
    put(P, "hips", b.nose_up(0.36), (0.05 * math.sin(10 * w), 0.04 * math.sin(4 * w), 0))  # arco: el medio del lomo sube; tiembla
    put(P, "spine", b.nose_up(-0.36) @ b.yaw_fwd(1, 0.05 * math.sin(2 * w)))
    put(P, "chest", b.nose_up(-0.36) @ b.yaw_fwd(1, -0.05 * math.sin(2 * w)))
    put(P, "neck", b.nose_up(0.1) @ b.yaw_fwd(1, 0.15 * math.sin(2 * w)))
    put(P, "head", b.nose_up(0.15 + 0.05 * math.sin(6 * w)) @ b.yaw_fwd(1, 0.1 * math.sin(3 * w)))
    put(P, "jaw", b.nose_up(-(0.6 + 0.12 * math.sin(8 * w))))
    tail(P, (1.45, 0.1, -0.05, 0.1), 0.25, 3 * w, 0.7)  # cola parada que se menea de lado
    for s, fr in LEGS:
        leg(P, s, fr, 0, 0, base=0.36 if fr else -0.36)
        put(P, "ear_" + side(s), b.nose_up(0.6) @ b.lift(s, -0.3))
    return P


#        y     roll  pitch  head  jaw  legs (0 = pies plantados, 1 = patas recogidas)
DEATH = {0: (0, 0, 0, 0, 0, 0),
         8: (-0.15, -0.15, 0.05, -0.3, 0.2, 0),
         16: (-0.7, 0.1, -0.2, -0.5, 0.3, 0),
         22: (-1.2, 0.5, -0.1, -0.4, 0.3, 0),
         27: (-1.95, 1.48, -0.05, -0.2, 0.3, 1),
         31: (-1.8, 1.38, -0.05, -0.25, 0.35, 1),
         36: (-1.95, 1.48, -0.05, -0.15, 0.35, 1),
         48: (-1.95, 1.5, -0.05, -0.1, 0.35, 1)}


def death(f):
    y, roll, pitch, hd, jaw, lg = curve(DEATH, f)
    P = {}
    put(P, "hips", b.lift(1, roll) @ b.nose_up(pitch), (0, y, 0))
    put(P, "neck", b.nose_up(hd * 0.5))
    put(P, "head", b.nose_up(hd * 0.5) @ b.lift(1, -roll * 0.25))
    put(P, "jaw", b.nose_up(-jaw))
    # patas con IK (pies plantados al caer, recogidos al irse de costado): los pies no atraviesan el piso
    q.feet(P, (0.3 * lg, 1.7 * lg, 0.9 * lg), (-0.25 * lg, 1.4 * lg, 0.5 * lg))
    for s, fr in LEGS:
        put(P, "ear_" + side(s), b.nose_up(0.4 * roll / 1.5))
    k = min(1, f / 27)
    tail(P, (0.6 * (1 - k), 0.3 * (1 - k), 0.1, 0.1), 0.2 * (1 - k), f * 0.4)
    return P


acts = {"idle": (range(0, 49, 2), idle), "walk": (range(0, 33, 2), walk), "run": (range(0, 17), run),
        "jump": (range(0, 39), jump), "spin": (range(0, 25), spin), "swipe": (range(0, 21), swipe),
        "rage": (range(0, 41), rage), "death": (range(0, 49), death)}
act = {k: q.action(ao, k, fr, fn) for k, (fr, fn) in acts.items()}
q.ground_report(ao, ob, act)
if A.get("export", "1") != "0":
    b.export(ao, ob, "gato", os.path.dirname(os.path.abspath(__file__)))

if "render" in A:
    T, D = (0, 3.3, -0.8), 21
    q.render(ao, A["render"], "gato", [
        ("34", None, 0, (1, 0.45, 1.1)), ("lateral", None, 0, (1, 0.12, 0)), ("frontal", None, 0, (0, 0.15, 1)),
        ("walk", act["walk"], 8, (1, 0.25, 0.4)), ("run", act["run"], 6, (1, 0.12, 0)),
        ("jump_agazapa", act["jump"], 12, (1, 0.2, 0.6)), ("jump_aire", act["jump"], 22, (1, 0.12, 0.2)),
        ("spin", act["spin"], 9, (1, 0.5, 1)), ("swipe", act["swipe"], 11, (0.5, 0.25, 1)),
        ("rage", act["rage"], 10, (1, 0.2, 0.3)), ("idle", act["idle"], 12, (1, 0.35, 1)), ("death", act["death"], 40, (0.6, 0.6, 1))], T, D)
