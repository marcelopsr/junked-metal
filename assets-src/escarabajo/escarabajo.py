# Escarabajo: modelo, esqueleto y animaciones desde cero. Referencia: enemyTemplate("escarabajo") y LEGS en
# src/models.ts (caparazón verde metálico #2f7d4a, cabeza y patas #111, ojos lima #d0ff60).
# Uso (desde la raíz del repo):
#   /Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/escarabajo/escarabajo.py [-- render=DIR] [horn=curvo|recto|tenazas] [export=0]
# Deja escarabajo.blend y escarabajo_raw.glb acá y public/models/escarabajo.glb (cuantizado con gltf-transform).
# export=0 solo renderiza (para comparar cuernos sin pisar el GLB).
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bicho as b

A = b.args()
HORN = A.get("horn", "curvo")
b.reset()
shell, dark, legs, eye = b.mat("Body", "#2f7d4a", metal=0.7, rough=0.25), b.mat("Dark", "#1c1c1c", rough=0.4), \
    b.mat("Legs", "#111111", rough=0.5), b.mat("Eye", "#d0ff60", emit=1.5)

HIPS = [(0.5, 0.38, 0.5), (0.5, 0.38, 0.0), (0.5, 0.38, -0.5)]  # índice 0 = pata delantera (R1/L1)
leg_bones, geo = b.leg_bones(HIPS, 1.0, splay=[0.3, 0.0, -0.3])
bones = [("body", (0, 0.45, 0), (0, 0.45, 0.4), None),
         ("head", (0, 0.45, 0.82), (0, 0.45, 1.3), "body")] + leg_bones
ao = b.armature("EscarabajoRig", bones)

m = b.Build([n for n, *_ in bones])
m.ell((0, 0.52, -0.3), (0.8, 0.46, 0.92), shell, "body", 16, 9)          # élitros
m.ell((0, 0.53, -0.32), (0.06, 0.475, 0.9), dark, "body", 6, 8)           # costura entre élitros
m.ell((0, 0.55, 0.62), (0.58, 0.32, 0.38), shell, "body", 12, 7)         # pronoto
m.ell((0, 0.42, 1.0), (0.36, 0.3, 0.34), dark, "head", 12, 8)
for s in (1, -1):
    m.ell((s * 0.25, 0.52, 1.2), (0.11, 0.11, 0.11), eye, "head", 8, 6)
if HORN == "curvo":  # rinoceronte: sale hacia adelante y se curva para arriba
    m.tube([(0, 0.5, 1.15), (0, 0.6, 1.5), (0, 0.82, 1.75), (0, 1.12, 1.82)], [0.17, 0.12, 0.07, 0.02], dark, "head", 8)
elif HORN == "recto":  # el de la procedural: cono recto adelante y arriba
    m.tube([(0, 0.5, 1.0), (0, 0.99, 1.73)], [0.2, 0.02], dark, "head", 8)
else:  # tenazas de ciervo volante
    for s in (1, -1):
        m.tube([(s * 0.18, 0.38, 1.2), (s * 0.32, 0.42, 1.5), (s * 0.25, 0.46, 1.82), (s * 0.06, 0.48, 1.95)], [0.09, 0.075, 0.05, 0.015], dark, "head", 6)
for s, k, n, hip, knee, foot in geo:
    m.tube([hip, knee], [0.07, 0.06], legs, "leg_" + n, 6)
    m.ell(knee, (0.09, 0.09, 0.09), legs, "leg_" + n, 6, 4)
    m.tube([knee, foot], [0.06, 0.03], legs, "shin_" + n, 6)
ob = m.object("Escarabajo")
b.skin(ob, ao)

LEGS = [(s, k) for s in (1, -1) for k in range(3)]


def walk(f):  # 32 cuadros: más pesado que la escupidora; el cuadro 32 repite el 0
    p = f / 32
    P = b.legs_walk(LEGS, p, 0.28, 0.3)
    P["body"] = {"loc": (0, 0.02 * (1 - math.cos(4 * math.pi * p)) / 2, 0), "rot": b.lift(1, 0.03 * math.sin(2 * math.pi * p))}
    P["head"] = {"rot": b.yaw_fwd(1, 0.06 * math.sin(2 * math.pi * p))}
    return P


# Embestida (24 cuadros): se agacha y retrocede (0-8), arremete (12), revolea el cuerno (15), vuelve (24)
# valores: cabeceo del cuerpo, cabeceo de la cabeza, avance z del cuerpo
ATK = {0: (0, 0, 0), 8: (-0.12, -0.25, -0.22), 12: (-0.06, -0.15, 0.45), 15: (0.1, 0.5, 0.35), 24: (0, 0, 0)}


def attack(f):
    ks = sorted(ATK)
    a = max(k for k in ks if k <= f); c = min(k for k in ks if k >= f)
    t = 0 if a == c else (f - a) / (c - a)
    t = t * t * (3 - 2 * t)
    bp, hp, z = [x + (y - x) * t for x, y in zip(ATK[a], ATK[c])]
    P = {"body": {"rot": b.nose_up(bp), "loc": (0, 0, z)}, "head": {"rot": b.nose_up(hp)}}
    for s, k in LEGS:  # las patas compensan el cabeceo y se abren al revés del avance (empujan)
        P["leg_" + ("R" if s > 0 else "L") + str(k + 1)] = {"rot": b.nose_up(-bp) @ b.yaw_fwd(s, -z * 0.6)}
    return P


walk_act = b.action(ao, "walk", range(0, 33, 2), walk)
atk_act = b.action(ao, "attack", range(0, 25), attack)
if A.get("export", "1") != "0":
    b.export(ao, ob, "escarabajo", os.path.dirname(os.path.abspath(__file__)))

if "render" in A:
    if HORN != "curvo" or A.get("export") == "0":
        b.render(ao, A["render"], "escarabajo_cuerno_" + HORN, [("34", None, 0, (2.4, 1.6, 2.8))], dist=1.3)
    else:
        b.render(ao, A["render"], "escarabajo", [
            ("34", None, 0, (2.4, 1.6, 2.8)), ("lateral", None, 0, (5.2, 0.6, 0)),
            ("walk", walk_act, 8, (2.4, 1.6, 2.8)), ("attack_carga", atk_act, 8, (5.2, 0.6, 0)),
            ("attack_embiste", atk_act, 12, (5.2, 0.6, 0)), ("attack_revolea", atk_act, 15, (5.2, 0.6, 0))], dist=1.3)
