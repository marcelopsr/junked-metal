# Geometría oleada 2 — port de src/models.ts enemyTemplate (2026-10-07) a ToyBuild.
import math
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bicho as b
from toy_rigid import ToyBuild


def _mats_friccion():
    return {
        "orange": b.mat("Body", "#ff6b0a", rough=0.45),
        "dark": b.mat("Dark", "#0d0a08", rough=0.85),
        "chrome": b.mat("Metal", "#f0f4ff", metal=0.85, rough=0.25),
        "lamp": b.mat("Lamp", "#fff8e8", emit=3.0, emit_hex="#fff4d0"),
        "rubber": b.mat("Rubber", "#1a1a1a", rough=0.9),
        "glass": b.mat("Glass", "#88aacc", rough=0.1, alpha=0.35),
    }


def build_friccion(m: ToyBuild):
    t = _mats_friccion()
    m.box(0.72, 0.06, 1.55, t["dark"], "root", (0, 0.03, 0))
    m.extrude(
        [[-1.02, 0.04], [0.98, 0.04], [1.08, 0.14], [0.92, 0.28], [0.35, 0.34], [0.05, 0.52], [-0.35, 0.5], [-0.78, 0.38], [-1.02, 0.22]],
        0.76,
        t["orange"],
        "root",
        (0, 0.06, 0),
    )
    m.box(0.48, 0.22, 0.38, t["glass"], "root", (0, 0.44, -0.05), (-0.55, 0, 0))
    m.box(0.58, 0.04, 0.14, t["orange"], "root", (0, 0.48, -0.82))
    m.box(0.02, 0.18, 0.1, t["orange"], "root", (0.28, 0.54, -0.82))
    m.box(0.02, 0.18, 0.1, t["orange"], "root", (-0.28, 0.54, -0.82))
    m.tube([[-0.36, 0.14, 1.02], [0, 0.11, 1.08], [0.36, 0.14, 1.02]], [0.035, 0.035, 0.035], t["chrome"], "root", 6)
    m.box(0.06, 0.04, 0.55, b.mat("Trim", "#f8fafc", rough=0.4), "root", (0, 0.38, 0.35))
    m.box(0.64, 0.03, 0.08, t["chrome"], "root", (0, 0.52, -0.72))  # labio del capó (lectura a 15 m)
    for x, y in ((0.32, 0.2), (-0.32, 0.2)):
        m.tor(0.22, 0.035, t["chrome"], "root", (x, y, 0.92), (math.pi / 2, 0, 0), 10)
        m.sph(0.16, t["lamp"], "root", (x, y, 0.97), None, 6)
    m.cyl(0.09, 0.09, 0.18, t["chrome"], "root", (0.42, 0.22, -0.15), (0, math.pi / 2, 0), 8)
    for x, z in ((-0.4, 0.48), (0.4, 0.48), (-0.4, -0.48), (0.4, -0.48)):
        m.cyl(0.46, 0.46, 0.2, t["rubber"], "root", (x, 0.14, z), (0, math.pi / 2, 0), 10)
        m.cyl(0.24, 0.24, 0.22, t["chrome"], "root", (x, 0.14, z), (0, math.pi / 2, 0), 8)
    for x, z in ((-0.4, 0.48), (0.4, 0.48)):
        m.sph(0.1, t["orange"], "root", (x, 0.32, z), None, 4)
    m.box(0.22, 0.08, 0.12, t["dark"], "root", (0, 0.22, -0.92))  # matrícula toy
    for sx in (-1, 1):
        m.box(0.04, 0.06, 0.08, t["chrome"], "root", (sx * 0.38, 0.42, 0.15))  # espejos retrovisores


def build_robot(m: ToyBuild):
    tin = b.mat("Body", "#ff3b30", metal=0.55, rough=0.35)
    tin_dark = b.mat("Dark", "#991b1b", metal=0.5, rough=0.4)
    joint = b.mat("Joint", "#b8c0cc", metal=0.7, rough=0.35)
    lamp = b.mat("Eye", "#ffe566", emit=4.0, emit_hex="#facc15")
    chrome = b.mat("Metal", "#d4a017", metal=0.85, rough=0.3)

    def arm(sx):
        m.cyl(0.1, 0.1, 0.35, joint, "root", (sx * 0.48, 0.78, 0.12), (0, 0, -sx * 0.7), 8)
        m.box(0.16, 0.48, 0.16, tin, "root", (sx * 0.62, 0.62, 0.28), (0.4, 0, -sx * 0.5))
        m.cyl(0.08, 0.1, 0.22, joint, "root", (sx * 0.72, 0.42, 0.38), (0.5, 0, 0), 8)

    m.box(0.42, 0.12, 0.55, tin_dark, "root", (0.28, 0.08, 0.05))
    m.box(0.42, 0.12, 0.55, tin_dark, "root", (-0.28, 0.08, 0.05))
    m.cyl(0.14, 0.16, 0.22, joint, "root", (0.28, 0.24, 0.05), None, 8)
    m.cyl(0.14, 0.16, 0.22, joint, "root", (-0.28, 0.24, 0.05), None, 8)
    m.cyl(0.52, 0.58, 0.72, tin, "root", (0, 0.68, 0), None, 10)
    m.cyl(0.48, 0.52, 0.08, tin_dark, "root", (0, 0.32, 0), None, 10)
    m.box(0.7, 0.55, 0.45, tin, "root", (0, 0.72, 0.02))
    m.cyl(0.38, 0.42, 0.32, tin, "root", (0, 1.28, 0.02), None, 10)
    m.sph(0.4, tin, "root", (0, 1.48, 0.02), (1, 0.75, 1), 8)
    m.box(0.52, 0.14, 0.06, b.mat("Visor", "#111111", rough=0.9), "root", (0, 1.32, 0.24))
    m.box(0.38, 0.08, 0.06, chrome, "root", (0, 0.52, 0.26))
    m.sph(0.14, lamp, "root", (0.16, 1.34, 0.28), None, 6)
    m.sph(0.14, lamp, "root", (-0.16, 1.34, 0.28), None, 6)
    m.cyl(0.025, 0.025, 0.38, joint, "root", (0, 1.7, 0), None, 4)
    m.sph(0.07, b.mat("Antenna", "#e0a030", emit=2.0), "root", (0, 1.92, 0), None, 4)
    arm(1)
    arm(-1)
    m.box(0.52, 0.08, 0.04, b.mat("Vent", "#4a1010", rough=0.7), "root", (0, 0.88, -0.42))  # rejilla trasera
    for sx in (-1, 1):
        for z in (0.05, 0.28):
            m.sph(0.04, joint, "root", (sx * 0.36, 0.55 + z * 0.3, 0.12 + z), None, 4)  # remaches del torso


def build_polilla_body(m: ToyBuild):
    fur = b.mat("Body", "#d8c690", rough=0.88)
    eye = b.mat("Eye", "#c9a0ff", emit=2.5, emit_hex="#f0d8ff", rough=0.35)
    eye_core = b.mat("EyeCore", "#ffffff", emit=3.5, rough=0.2)
    m.sph(0.54, fur, "root", (0, 0, -0.38), (0.85, 0.78, 1.55), 10)
    m.sph(0.46, b.mat("Thorax", "#a8966c", rough=0.88), "root", (0, 0.03, 0.1), None, 8)
    m.sph(0.34, fur, "root", (0, 0.03, 0.4), None, 8)
    # Antenas plumosas curvadas que nacen con sentido anatómico de la frente
    for sx in (-1, 1):
        m.tube(
            [(sx * 0.08, 0.12, 0.44), (sx * 0.16, 0.25, 0.52), (sx * 0.25, 0.38, 0.55)],
            [0.026, 0.02, 0.014],
            fur,
            "root",
            5,
        )
        for t in (0.35, 0.65, 0.9):
            px = sx * (0.08 + t * 0.17)
            py = 0.12 + t * 0.26
            pz = 0.44 + t * 0.11
            m.sph(0.06, fur, "root", (px, py, pz), (1.3, 0.6, 0.8), 4)
    m.sph(0.2, eye, "root", (0.11, 0.06, 0.5), None, 8)
    m.sph(0.2, eye, "root", (-0.11, 0.06, 0.5), None, 8)
    m.sph(0.08, eye_core, "root", (0.11, 0.06, 0.52), None, 4)
    m.sph(0.08, eye_core, "root", (-0.11, 0.06, 0.52), None, 4)
    for sx in (-1, 1):
        m.sph(0.06, fur, "root", (sx * 0.22, 0.18, 0.22), (1.1, 0.9, 1.0), 4)  # mechones laterales
    m.cyl(0.012, 0.02, 0.18, fur, "root", (0, 0.12, 0.48), (0.4, 0, 0), 4)  # probóscis corta


def build_polilla_wing(m: ToyBuild):
    wing = b.mat("Wing", "#d4c090", rough=0.86, alpha=0.92)
    wing_h = b.mat("WingH", "#a89068", rough=0.88, alpha=0.9)
    spot = b.mat("WingSpot", "#e8d8b0", rough=0.7, alpha=0.85)
    vein = b.mat("Vein", "#5a4830", rough=0.9)
    m.sph(1.45, wing, "root", (0.88, 0.02, -0.08), (1.45, 0.04, 1.15), 6)
    m.sph(0.72, wing_h, "root", (0.62, -0.02, 0.32), (1.25, 0.05, 0.95), 5)
    m.sph(0.38, wing_h, "root", (1.02, -0.01, 0.08), (1.2, 0.04, 0.85), 5)
    m.sph(0.34, b.mat("WingMark", "#3a2818", rough=0.9), "root", (0.95, 0.05, -0.12), (1.15, 0.1, 1.05), 4)
    for p in ((0.55, 0.08, 0.15), (1.05, -0.02, -0.2), (0.35, 0.12, 0.45), (0.72, 0.1, 0.28), (1.18, 0.0, 0.02)):
        m.sph(0.22, b.mat("Spot", "#2a1810", rough=0.9), "root", p, (1.2, 0.08, 1.1), 4)
    m.sph(0.18, spot, "root", (0.78, 0.04, 0.05), (1.1, 0.06, 0.9), 4)
    m.sph(0.14, spot, "root", (0.48, 0.06, 0.22), (1.05, 0.05, 0.85), 4)
    for path, radii in (
        ([[0.42, 0.04, 0.05], [0.95, 0.02, -0.05], [1.15, -0.01, -0.18]], [0.012, 0.012, 0.01]),
        ([[0.38, 0.02, 0.22], [0.72, 0.0, 0.08], [1.02, -0.02, -0.08]], [0.01, 0.009, 0.008]),
        ([[0.52, 0.06, -0.05], [0.88, 0.03, 0.12], [0.55, 0.05, 0.38]], [0.009, 0.008, 0.007]),
    ):
        m.tube(path, radii, vein, "root", 4)


def _build_articulated_leg(m: ToyBuild, leg_len: float, hip_y: float, r: float, body_hex: str, knee_hex: str, hair: bool):
    """Pata derecha: cadera en el origen; fémur + tibia + tarso (models.ts legTemplate)."""
    leg = b.mat("Leg", body_hex, rough=0.55 if not hair else 0.88)
    knee_m = b.mat("Knee", knee_hex, emit=2.5)
    knee = (leg_len * 0.48, leg_len * 0.32, 0.0)
    foot = (leg_len * 0.98, -hip_y + 0.02, 0.06)
    m.tube([[0, 0, 0], (leg_len * 0.25, leg_len * 0.22, 0), knee], [r * 1.08, r * 1.05, r * 1.02], leg, "root", 5)
    m.tube([knee, (leg_len * 0.72, leg_len * 0.05, 0.03), foot], [r * 0.85, r * 0.78, r * 0.68], leg, "root", 5)
    m.sph(r * 2.5, leg, "root", (leg_len * 0.2, leg_len * 0.16, 0), (1.12, 0.88, 1.08), 4)
    m.sph(r * 3.3, knee_m, "root", knee, None, 4)
    m.sph(r * 1.9, leg, "root", foot, (1.25, 0.32, 0.95), 4)
    m.cyl(r * 0.35, r * 0.15, r * 1.4, leg, "root", foot, (0.15, 0, 0.35), 4)
    if hair:
        for t in (0.32, 0.52, 0.72):
            p = (leg_len * (0.5 + t * 0.35), leg_len * (0.26 - t * 0.2), 0.02)
            m.sph(0.2, b.mat("Hair", body_hex, rough=0.92), "root", p, (1.35, 0.55, 1.15), 3)


def build_rey_leg(m: ToyBuild):
    _build_articulated_leg(m, 1.14, 0.36, 0.095, "#0a0a0a", "#6ef040", False)


def build_tarantula_leg(m: ToyBuild):
    _build_articulated_leg(m, 1.62, 0.44, 0.125, "#1a120e", "#ff6fe8", True)


def build_rey(m: ToyBuild):
    shell = b.mat("Body", "#d4a017", metal=0.78, rough=0.28)
    shell_hi = b.mat("Shine", "#e8bc28", metal=0.75, rough=0.22)
    dark = b.mat("Dark", "#111111", rough=0.5)
    m.sph(1.78, shell, "root", (0, 0.56, -0.22), (1, 0.78, 1.48), 10)
    m.sph(1.35, shell_hi, "root", (0, 0.74, -0.38), (1, 0.42, 1.15), 8)
    m.box(0.06, 0.58, 2.05, dark, "root", (0, 0.8, -0.22))
    m.box(0.42, 0.1, 1.55, dark, "root", (0, 0.54, -0.22))
    m.sph(0.88, dark, "root", (0, 0.44, 1.02), None, 8)
    m.cyl(0.04, 0.26, 1.05, dark, "root", (0, 0.8, 1.48), (1.02, 0, 0), 6)
    m.sph(0.14, shell_hi, "root", (0, 0.98, 2.02), None, 6)
    m.sph(0.34, b.mat("Eye", "#d0ff60", emit=3.0), "root", (0.32, 0.56, 1.38), None, 8)
    m.sph(0.34, b.mat("Eye", "#d0ff60", emit=3.0), "root", (-0.32, 0.56, 1.38), None, 8)
    m.sph(0.14, b.mat("EyeMid", "#b8e838", emit=2.5), "root", (0, 0.64, 1.28), None, 4)
    m.box(0.18, 0.42, 1.35, b.mat("Wing", "#f5f0c8", rough=0.5), "root", (0.62, 0.72, -0.22))
    m.box(0.18, 0.42, 1.35, b.mat("Wing", "#f5f0c8", rough=0.5), "root", (-0.62, 0.72, -0.22))
    m.box(0.04, 0.52, 2.0, dark, "root", (0, 0.82, -0.22))  # sutura central del caparazón
    m.cyl(0.06, 0.1, 0.22, shell_hi, "root", (0, 1.02, 1.88), (0.35, 0, 0), 6)  # base del cuerno


def build_tarantula(m: ToyBuild):
    hair = b.mat("Body", "#7a55a8", rough=0.88)
    band = b.mat("Band", "#c87830", rough=0.45)
    dark = b.mat("Dark", "#4a3228", rough=0.85)
    m.sph(1.5, hair, "root", (0, 0.6, -0.82), (1, 0.88, 1.22), 10)
    m.tor(1.08, 0.24, band, "root", (0, 0.64, -0.58), (math.pi / 2, 0, 0), 12)
    m.sph(1.0, b.mat("Abdomen", "#8a4a22", rough=0.8), "root", (0, 0.92, -0.9), (1, 0.38, 1.05), 8)
    m.sph(1.08, dark, "root", (0, 0.5, 0.34), (1, 0.68, 1.22), 10)
    m.cyl(0.07, 0.22, 0.48, b.mat("Fang", "#2a1810", rough=0.5), "root", (0.17, 0.28, 0.98), (2.55, 0, 0), 5)
    m.cyl(0.07, 0.22, 0.48, b.mat("Fang", "#2a1810", rough=0.5), "root", (-0.17, 0.28, 0.98), (2.55, 0, 0), 5)
    m.cyl(0.1, 0.13, 0.68, dark, "root", (0.3, 0.4, 0.9), (1.25, 0, -0.38), 5)
    m.cyl(0.1, 0.13, 0.68, dark, "root", (-0.3, 0.4, 0.9), (1.25, 0, 0.38), 5)
    m.sph(0.18, b.mat("Eye", "#ff4fd8", emit=3.5), "root", (0.12, 0.7, 0.74), None, 6)
    m.sph(0.18, b.mat("Eye", "#ff4fd8", emit=3.5), "root", (-0.12, 0.7, 0.74), None, 6)
    for p in ((0.22, 0.64, 0.62), (-0.22, 0.64, 0.62), (0.16, 0.72, 0.54), (-0.16, 0.72, 0.54), (0, 0.76, 0.66)):
        m.sph(0.08, b.mat("Eye", "#ff4fd8", emit=2.5), "root", p, None, 4)
    for p in ((0.45, 0.55, -0.35), (-0.42, 0.58, -0.2), (0.3, 0.48, 0.15), (-0.28, 0.52, 0.4)):
        m.sph(0.12, hair, "root", p, (1.2, 0.7, 1.1), 4)  # pelos del cefalotórax


def build_cortadora(m: ToyBuild):
    red = b.mat("Body", "#dc2626", rough=0.4)
    deck = b.mat("Deck", "#8b95a3", metal=0.55, rough=0.35)
    dark = b.mat("Dark", "#141414", rough=0.85)
    m.cyl(5.8, 6.2, 1.05, deck, "root", (0, 0.82, -0.15), None, 16)
    m.box(6.4, 0.35, 2.2, dark, "root", (0, 0.42, 2.85))
    m.box(6.2, 0.22, 0.55, b.mat("Trim", "#d6dbe1", metal=0.4), "root", (0, 0.58, 3.35))
    m.extrude([[-3.2, 0], [3.2, 0], [3.2, 1.05], [2.2, 2.05], [-0.2, 2.35], [-3.2, 1.35]], 4.8, red, "root", (0, 1.22, -0.35))
    m.box(2.2, 0.55, 1.4, b.mat("Hood", "#b91c1c", rough=0.45), "root", (0, 2.05, -0.2))
    m.cyl(2.05, 2.15, 0.35, dark, "root", (0, 3.35, 0.15), None, 10)
    m.box(2.5, 0.12, 0.12, b.mat("Trim", "#d6dbe1", metal=0.4), "root", (0, 3.55, 0.15))
    m.box(0.12, 0.12, 2.5, b.mat("Trim", "#d6dbe1", metal=0.4), "root", (0, 3.55, 0.15))
    m.box(3.4, 0.45, 0.7, dark, "root", (0, 3.05, -2.75))
    m.tube([[-2, 2.35, -2.95], [-2, 5.2, -5.2], [-2, 7.8, -6.35], [2, 7.8, -6.35], [2, 5.2, -5.2], [2, 2.35, -2.95]], [0.2] * 6, dark, "root", 6)
    m.box(0.85, 0.12, 3.6, b.mat("Stripe", "#facc15", rough=0.4), "root", (2.55, 1.35, -0.1))
    for x, z in ((-2.95, 2.35), (2.95, 2.35), (-2.95, -2.55), (2.95, -2.55)):
        m.cyl(2, 2, 0.85, b.mat("Rubber", "#1a1a1a", rough=0.9), "root", (x, 0.88, z), (0, 0, math.pi / 2), 12)
    for x, z in ((-3.35, 2.35), (3.35, 2.35), (-3.35, -2.55), (3.35, -2.55)):
        m.cyl(1.05, 1.05, 0.2, b.mat("Hub", "#fbbf24", metal=0.6), "root", (x, 0.88, z), (0, 0, math.pi / 2), 8)
    m.box(1.1, 0.65, 0.35, dark, "root", (0, 2.15, -0.55))  # respaldo del asiento
    m.box(0.35, 0.08, 0.45, b.mat("Sticker", "#facc15", rough=0.4), "root", (-2.1, 1.55, 0.35))  # calcomanía toy


def build_aspiradora(m: ToyBuild):
    shell = b.mat("Body", "#7a8fa6", rough=0.45)
    dark = b.mat("Dark", "#111111", rough=0.85)
    bumper = b.mat("Rubber", "#1a1a1a", rough=0.92)
    m.tor(6.45, 0.42, bumper, "root", (0, 0.48, 0), None, 20)
    m.cyl(6.15, 6.45, 0.75, shell, "root", (0, 0.62, 0), None, 20)
    m.sph(4.2, shell, "root", (0, 1.05, 0), (1, 0.42, 1), 8)
    m.cyl(5.4, 5.7, 0.2, b.mat("Ring", "#5c6b7a", metal=0.5), "root", (0, 1.22, 0), None, 18)
    m.box(4.8, 0.14, 0.35, b.mat("Stripe", "#facc15", rough=0.4), "root", (0, 1.28, 0.2))
    m.cyl(1.45, 1.55, 0.65, dark, "root", (0, 1.75, -0.35), None, 10)
    m.sph(0.75, b.mat("Eye", "#ff2a1a", emit=4.0), "root", (0, 2.05, 0.15), None, 6)
    m.cyl(1.35, 1.35, 0.14, b.mat("Lens", "#c8ccd2", rough=0.3), "root", (0, 1.55, 1.05), None, 12)
    m.box(3.6, 0.38, 0.55, dark, "root", (0, 0.32, 3.05))
    m.sph(0.62, b.mat("Eye", "#ff2a1a", emit=4.0), "root", (1.05, 0.88, 3.12), None, 6)
    m.sph(0.62, b.mat("Eye", "#ff2a1a", emit=4.0), "root", (-1.05, 0.88, 3.12), None, 6)
    for s in (-1, 1):
        m.cyl(1.65, 1.65, 0.1, dark, "root", (s * 2.75, 0.14, 2.45), None, 6)
        for k in (0, 1, 2):
            m.box(0.14, 0.08, 2.1, b.mat("Brush", "#9ca3af", rough=0.7), "root", (s * 2.75, 0.2, 2.45), (0, k * 1.15, 0))
    m.cyl(0.08, 0.08, 0.35, dark, "root", (-2.35, 0.55, -0.85), (0, 0.4, 0.2), 6)  # bobina del cable
    m.box(0.55, 0.12, 0.18, b.mat("Latch", "#c8ccd2", metal=0.4), "root", (0, 1.18, -0.55))


def build_cortacercos(m: ToyBuild):
    body = b.mat("Body", "#e0a030", rough=0.45)
    dark = b.mat("Dark", "#1a1a1a", rough=0.85)
    steel = b.mat("Blade", "#9ca3af", metal=0.75, rough=0.35)
    m.box(2.65, 1.65, 3.2, body, "root", (0, 1.12, -2.75))
    m.sph(2.85, body, "root", (0, 1.95, -2.65), (1, 0.5, 1.15), 8)
    m.box(2.7, 0.55, 2.6, dark, "root", (0, 0.42, -2.7))
    m.box(0.55, 0.35, 1.1, b.mat("Accent", "#c2410c", rough=0.45), "root", (0, 1.05, -1.35))
    m.tor(2.35, 0.28, dark, "root", (0, 2.25, -0.75), (math.pi / 2, 0, 0), 12)
    m.tube([[0, 1.75, -4.25], [0, 2.85, -4.85], [0, 2.55, -5.35], [0, 1.35, -5.05]], [0.22] * 4, dark, "root", 6)
    m.box(0.35, 0.55, 0.45, dark, "root", (0.95, 2.05, -0.55))
    m.box(0.85, 0.28, 5.9, steel, "root", (0, 0.92, 2.75))
    m.box(0.55, 0.22, 5.5, b.mat("Blade2", "#6b7280", metal=0.7), "root", (0, 0.78, 2.75))
    for i in range(8):
        for s in (-1, 1):
            m.box(0.42, 0.18, 0.28, b.mat("Tooth", "#e5e7eb", metal=0.5), "root", (s * 0.52, 0.92, -0.15 + i * 0.72))
    m.sph(0.42, b.mat("Eye", "#ff2a1a", emit=4.0), "root", (0.72, 2.15, -1.15), None, 6)
    m.sph(0.42, b.mat("Eye", "#ff2a1a", emit=4.0), "root", (-0.72, 2.15, -1.15), None, 6)
    m.tube([[0, 0.92, -4.25], [0, 0.28, -4.95], [0.75, 0.08, -5.65]], [0.16, 0.16, 0.16], dark, "root", 6)
    m.tor(0.55, 0.06, dark, "root", (0.95, 1.85, -0.35), (math.pi / 2, 0, 0), 10)  # guarda del gatillo
    m.box(0.42, 0.22, 0.12, b.mat("Label", "#fef3c7", rough=0.5), "root", (0, 1.45, -2.15))  # etiqueta de advertencia


BUILDERS = {
    "friccion": build_friccion,
    "robot": build_robot,
    "rey": build_rey,
    "tarantula": build_tarantula,
    "cortadora": build_cortadora,
    "aspiradora": build_aspiradora,
    "cortacercos": build_cortacercos,
}

SCALES = {
    "friccion": 1.22,
    "robot": 1.22,
    "polilla": 1.0,
    "rey": 3.5,
    "tarantula": 3.0,
    "cortadora": 1.22,
    "aspiradora": 1.22,
    "cortacercos": 1.22,
}
