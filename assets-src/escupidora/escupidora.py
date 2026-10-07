# Hormiga escupidora: modelo, esqueleto y animaciones desde cero. Referencia: enemyTemplate("escupidora") y LEGS en
# src/models.ts (rojo #d2381c, saco de ácido lima #9acd32, patas #5a160a, ojos ámbar #ffb020).
# Uso (desde la raíz del repo):
#   /Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/escupidora/escupidora.py [-- render=DIR]
# Deja escupidora.blend y escupidora_raw.glb acá y public/models/escupidora.glb (cuantizado con gltf-transform).
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bicho as b

A = b.args()
b.reset()
body, sac, legs, eye = b.mat("Body", "#d2381c", rough=0.35), b.mat("Sac", "#9acd32", rough=0.2, emit=0.55, emit_hex="#3d5500", alpha=0.88), \
    b.mat("Legs", "#5a160a", rough=0.5), b.mat("Eye", "#ffb020", emit=3.0)

HIPS = [(0.18, 0.34, 0.2), (0.18, 0.34, 0.0), (0.18, 0.34, -0.2)]  # índice 0 = pata delantera (R1/L1)
leg_bones, geo = b.leg_bones(HIPS, 0.9, splay=[0.3, 0.0, -0.3])
bones = [("body", (0, 0.36, 0), (0, 0.36, 0.22), None),
         ("head", (0, 0.4, 0.24), (0, 0.44, 0.78), "body"),
         ("abdomen", (0, 0.38, -0.2), (0, 0.48, -1.3), "body")] + leg_bones
ao = b.armature("EscupidoraRig", bones)

m = b.Build([n for n, *_ in bones])
# Saco ácido: volumen ancho y alto (lectura a ~15 m de cámara de partida); gota trasera
m.ell((0, 0.52, -0.82), (0.66, 0.56, 0.74), sac, "abdomen", 14, 9)
m.ell((0, 0.56, -1.22), (0.36, 0.3, 0.32), sac, "abdomen", 8, 6)
m.ell((0, 0.36, 0), (0.26, 0.22, 0.28), body, "body", 10, 7)
m.ell((0, 0.39, 0.16), (0.3, 0.2, 0.24), body, "body", 8, 5)  # tórax / cintura
m.ell((0, 0.47, 0.54), (0.4, 0.34, 0.36), body, "head", 12, 8)  # cráneo más alto y ancho
m.tube([(0, 0.44, 0.8), (0, 0.42, 1.02)], [0.075, 0.045], body, "head", 6)  # probóscis / boquilla de escupitajo
for s in (1, -1):
    m.ell((s * 0.2, 0.58, 0.78), (0.19, 0.19, 0.17), eye, "head", 8, 6)
    m.tube([(s * 0.14, 0.36, 0.66), (s * 0.19, 0.31, 0.86), (s * 0.11, 0.27, 1.02), (s * 0.04, 0.25, 1.1)],
           [0.08, 0.065, 0.04, 0.018], legs, "head", 5)
    m.tube([(s * 0.1, 0.66, 0.62), (s * 0.18, 0.94, 0.66), (s * 0.32, 1.02, 0.94)], [0.028, 0.024, 0.018], body, "head", 4)
    m.ell((s * 0.32, 1.02, 0.94), (0.05, 0.05, 0.05), body, "head", 6, 4)
for s, k, n, hip, knee, foot in geo:
    m.tube([hip, knee], [0.05, 0.04], legs, "leg_" + n, 6)
    m.ell(knee, (0.065, 0.065, 0.065), legs, "leg_" + n, 6, 4)
    m.tube([knee, foot], [0.04, 0.025], legs, "shin_" + n, 6)
ob = m.object("Escupidora")
b.skin(ob, ao)

LEGS = [(s, k) for s in (1, -1) for k in range(3)]


def walk(f):  # 24 cuadros = 1 s; el cuadro 24 repite el 0 — zancada más pesada que hormiga
    p = f / 24
    P = b.legs_walk(LEGS, p, 0.28, 0.32)
    bob = (1 - math.cos(4 * math.pi * p)) / 2
    P["body"] = {"loc": (0, 0.022 * bob, 0), "rot": b.nose_up(0.04 * math.sin(2 * math.pi * p))}
    P["abdomen"] = {"rot": b.yaw_fwd(1, 0.1 * math.sin(2 * math.pi * p + 0.4))}
    P["head"] = {"rot": b.nose_up(0.06 * math.sin(4 * math.pi * p))}
    return P


# Ataque (20 cuadros): carga (0-10) cabeza atrás y saco que se infla; escupe (13) latigazo adelante; vuelve (20)
# Cuadro 13 = 13/20 = 0,65 → alineado con GLB.escupidora hit (escupitajo en juego)
ATK = {0: (0, 0, 0, 1.0, 0), 10: (0.28, 0.68, -0.18, 1.24, -0.1), 13: (-0.18, -0.82, 0.2, 0.76, 0.2), 20: (0, 0, 0, 1.0, 0)}


def attack(f):
    ks = sorted(ATK)
    a = max(k for k in ks if k <= f); c = min(k for k in ks if k >= f)
    t = 0 if a == c else (f - a) / (c - a)
    t = t * t * (3 - 2 * t)
    bp, hp, ap, sc, hz = [x + (y - x) * t for x, y in zip(ATK[a], ATK[c])]
    P = {"body": {"rot": b.nose_up(bp)}, "head": {"rot": b.nose_up(hp), "loc": (0, 0, hz)}, "abdomen": {"rot": b.nose_up(ap), "scale": sc}}
    for s, k in LEGS:  # las patas compensan el cabeceo del cuerpo: quedan apoyadas
        P["leg_" + ("R" if s > 0 else "L") + str(k + 1)] = {"rot": b.nose_up(-bp)}
    return P


walk_act = b.action(ao, "walk", range(0, 25, 2), walk)
atk_act = b.action(ao, "attack", range(0, 21), attack)
b.export(ao, ob, "escupidora", os.path.dirname(os.path.abspath(__file__)))

if "render" in A:
    out = A["render"]
    b.render(ao, out, "escupidora", [
        ("34", None, 0, (2.4, 1.6, 2.8)), ("lateral", None, 0, (5.2, 0.6, 0)),
        ("walk", walk_act, 6, (2.4, 1.6, 2.8)), ("attack_carga", atk_act, 10, (5.2, 0.6, 0)), ("attack_escupe", atk_act, 13, (5.2, 0.6, 0))])
    # Misma distancia que cámara de partida (~back 15 m en main.ts)
    b.render(ao, out, "escupidora", [("game_15m", None, 0, (2.4, 1.6, 2.8)), ("game_15m_escupe", atk_act, 13, (2.4, 1.6, 2.8))],
             target=(0, 0.42, 0.05), dist=15)
