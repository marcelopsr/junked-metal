# Blockout/sculpt de los 8 autos RC (oleada 2). Uso:
#   /Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/cars/build_car.py -- kind=buggy
#   /Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/cars/build_car.py -- all=1
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from rc_common import CarBuild, export_static, pilot_soldadito, bumper_bar, reset, mat

KINDS = ("buggy", "monster", "formula", "tanque", "carrera", "axel", "helado", "combi")

# ANCH de src/models.ts (paint, seat)
ANCH = {
    "buggy": {"paint": "#d62828", "seat": [0, 0.38, 0.02, 0.8]},
    "monster": {"paint": "#1d4ed8", "seat": [0, 0.78, -0.12, 0.9]},
    "formula": {"paint": "#16a34a", "seat": [0, 0.2, -0.05, 0.75]},
    "tanque": {"paint": "#6b7a3a", "seat": [0, 0.8, -0.2, 0.85]},
    "carrera": {"paint": "#2a9d8f", "seat": [0, 0.26, -0.3, 0.75]},
    "axel": {"paint": "#e8e4d4", "seat": [0, 0.2, 0, 0.8]},
    "helado": {"paint": "#f08dbd", "seat": [0, 0.5, 0.72, 0.7]},
    "combi": {"paint": "#4cc3c9", "seat": [0, 0.42, 0.45, 0.7]},
}


def mats(paint_hex):
    return {
        "paint": mat("Paint", paint_hex, rough=0.4, metal=0.05),
        "trim": mat("Trim", "#c9ccd1", rough=0.38),
        "glass": mat("Glass", "#88aacc", rough=0.08, alpha=0.35),
        "metal": mat("Metal", "#e6e9ee", metal=0.85, rough=0.25),
        "matte": mat("Matte", "#2b2d31", rough=0.65),
        "rubber": mat("Rubber", "#0a0b0e", rough=0.9),
        "lamp": mat("Lamp", "#fff3b0", emit=1.2),
    }


def build_buggy():
    A = mats(ANCH["buggy"]["paint"])
    b = CarBuild()
    b.box((0, 0.02, 0), (1.05, 0.1, 2.1), A["matte"])
    b.box((0, 0.28, 0.05), (1.0, 0.32, 0.95), A["paint"])
    b.box((0, 0.14, 0.02), (1.08, 0.06, 1.05), A["trim"])
    b.ell((0, 0.52, 0.12), (0.62, 0.36, 0.88), A["glass"], 10)
    for sx in (-1, 1):
        b.box((sx * 0.48, 0.48, 0.1), (0.04, 0.28, 0.06), A["trim"])
    b.tube([(-0.42, 0.45, -0.5), (-0.38, 0.95, -0.3), (0.38, 0.95, -0.3), (0.42, 0.45, -0.5)], 0.035, A["metal"])
    bumper_bar(b, 1.22, 0.12, 1.12, 0.14, A["rubber"])
    b.box((0, 0.9, -1.0), (1.35, 0.05, 0.38), A["trim"])
    b.sph((0.3, 0.3, 1.1), 0.14, A["lamp"], 8)
    b.sph((-0.3, 0.3, 1.1), 0.14, A["lamp"], 8)
    pilot_soldadito(b, ANCH["buggy"]["seat"])
    return b.object("Buggy")


def build_monster():
    A = mats(ANCH["monster"]["paint"])
    b = CarBuild()
    b.box((0, 0.35, 0), (1.0, 0.14, 1.9), A["matte"])
    b.box((0, 0.72, 0), (1.05, 0.75, 1.15), A["paint"])
    b.box((0, 0.95, 0.42), (1.0, 0.3, 0.05), A["glass"])
    b.box((0, 0.88, 0.35), (0.88, 0.2, 0.08), A["glass"])
    for sx in (-1, 1):
        b.box((sx * 0.58, 0.55, 0.0), (0.08, 0.35, 0.9), A["trim"])
    b.box((0, 0.5, 1.12), (1.3, 0.1, 0.3), A["metal"])
    bumper_bar(b, 1.08, 0.38, 1.35, 0.16, A["rubber"])
    b.box((0, 1.2, 0.15), (1.0, 0.08, 0.2), A["matte"])
    for x in (0.36, 0.12):
        b.sph((x, 1.23, 0.15), 0.1, A["lamp"], 8)
        b.sph((-x, 1.23, 0.15), 0.1, A["lamp"], 8)
    pilot_soldadito(b, ANCH["monster"]["seat"])
    return b.object("Monster")


def build_formula():
    A = mats(ANCH["formula"]["paint"])
    b = CarBuild()
    b.box((0, 0.12, 0), (1.25, 0.22, 2.5), A["paint"])
    b.box((0, 0.02, 1.35), (1.4, 0.04, 0.3), A["matte"])
    b.box((0, 0.22, 1.42), (1.15, 0.06, 0.45), A["trim"])
    b.box((0, 0.1, -0.2), (1.0, 0.18, 0.7), A["matte"])
    b.box((0, 0.68, -1.15), (1.25, 0.08, 0.35), A["paint"])
    bumper_bar(b, 1.48, 0.06, 0.95, 0.1, A["rubber"])
    b.sph((0.18, 0.08, 1.3), 0.08, A["lamp"], 8)
    b.sph((-0.18, 0.08, 1.3), 0.08, A["lamp"], 8)
    pilot_soldadito(b, ANCH["formula"]["seat"])
    return b.object("Formula")


def build_tanque():
    A = mats(ANCH["tanque"]["paint"])
    b = CarBuild()
    olive = mat("Matte", "#3f4628", rough=0.7)
    for x in (-0.72, 0.72):
        b.box((x, 0.02, 0), (0.3, 0.42, 2.0), A["rubber"])
        b.box((x, 0.28, 0), (0.36, 0.05, 2.3), olive)
    b.box((0, 0.35, 0), (1.05, 0.5, 1.1), A["paint"])
    b.cyl((0, 0.66, -0.15), 0.95, 0.32, A["paint"], 10, axis="y")
    b.box((0, 0.52, 0.35), (0.55, 0.22, 0.35), A["glass"])
    b.cyl((0, 0.68, 0.75), 0.13, 1.1, A["metal"], 8, axis="x")
    bumper_bar(b, 1.05, 0.32, 1.15, 0.14, A["rubber"])
    b.sph((0.38, 0.42, 1.02), 0.12, A["lamp"], 8)
    b.sph((-0.38, 0.42, 1.02), 0.12, A["lamp"], 8)
    pilot_soldadito(b, ANCH["tanque"]["seat"])
    return b.object("Tanque")


def build_carrera():
    A = mats(ANCH["carrera"]["paint"])
    b = CarBuild()
    b.box((0, 0.0, 0), (0.7, 0.06, 1.7), A["matte"])
    b.ell((0, 0.22, 0), (0.95, 0.28, 1.05), A["paint"], 12)
    b.ell((0, 0.38, 0.14), (0.58, 0.18, 0.08), A["glass"], 8)
    b.box((0, 0.4, 0.12), (0.62, 0.16, 0.04), A["glass"])
    b.tube([(-0.38, 0.12, 1.06), (0, 0.1, 1.12), (0.38, 0.12, 1.06)], 0.04, A["metal"])
    b.box((0, 0.32, -0.88), (0.88, 0.04, 0.28), A["paint"])
    b.cyl((0.43, 0.18, -0.2), 0.08, 0.14, A["metal"], 8, axis="x")
    bumper_bar(b, 1.02, 0.08, 0.82, 0.1, A["rubber"])
    b.sph((0.25, 0.2, 1.0), 0.12, A["lamp"], 8)
    b.sph((-0.25, 0.2, 1.0), 0.12, A["lamp"], 8)
    pilot_soldadito(b, ANCH["carrera"]["seat"])
    return b.object("Carrera")


def build_axel():
    A = mats(ANCH["axel"]["paint"])
    b = CarBuild()
    steel = mat("Metal", "#444a52", metal=0.7, rough=0.35)
    red = mat("Trim", "#b8321f", rough=0.4)
    b.cyl((0, 0, 0), 0.16, 1.9, steel, 8, axis="x")
    b.box((0, -0.12, 0), (0.95, 0.12, 1.25), A["matte"])
    b.box((0, 0.12, 0), (0.72, 0.38, 0.9), A["paint"])
    b.box((0, 0.26, 0.08), (0.5, 0.18, 0.45), A["glass"])
    b.tube([(-0.42, 0.28, -0.55), (-0.42, 0.78, -0.2), (0.42, 0.78, -0.2), (0.42, 0.28, -0.55)], 0.04, steel)
    for s in (-1, 1):
        b.cyl((s * 0.98, 0, 0), 0.5, 0.06, red, 8, axis="x")
    bumper_bar(b, 0.82, 0.1, 0.88, 0.12, A["rubber"])
    b.sph((0.28, 0.3, 0.7), 0.16, A["lamp"], 8)
    b.sph((-0.28, 0.3, 0.7), 0.16, A["lamp"], 8)
    pilot_soldadito(b, ANCH["axel"]["seat"])
    return b.object("Axel")


def build_helado():
    A = mats(ANCH["helado"]["paint"])
    cream = mat("Matte", "#f3ead2", rough=0.55)
    pink = mat("Trim", "#f08dbd", rough=0.4)
    b = CarBuild()
    b.box((0, 0.05, 0), (1.0, 0.14, 2.3), A["matte"])
    b.box((0, 0.58, -0.4), (1.1, 0.95, 1.45), cream)
    b.box((0, 0.45, 0.35), (1.1, 0.55, 1.0), A["paint"])
    b.box((0, 0.62, 0.55), (0.75, 0.42, 0.04), A["glass"])
    b.box((0, 0.7, 0.85), (1.0, 0.3, 0.04), A["glass"])
    b.cyl((0, 1.37, -0.4), 0.46, 0.62, mat("Matte", "#d9a15a"), 6, axis="y")
    b.sph((0, 1.8, -0.4), 0.5, pink, 10)
    bumper_bar(b, 1.28, 0.08, 1.05, 0.12, A["rubber"])
    b.sph((0.4, 0.4, 1.22), 0.14, A["lamp"], 8)
    b.sph((-0.4, 0.4, 1.22), 0.14, A["lamp"], 8)
    pilot_soldadito(b, ANCH["helado"]["seat"])
    return b.object("Helado")


def build_combi():
    A = mats(ANCH["combi"]["paint"])
    cream = mat("Matte", "#d9cba6", rough=0.55)
    b = CarBuild()
    b.box((0, 0.05, 0), (1.0, 0.12, 2.3), A["matte"])
    b.box((0, 0.55, 0), (1.15, 1.0, 1.08), A["paint"])
    b.box((0, 1.04, -0.02), (0.7, 0.07, 1.9), cream)
    b.box((0, 0.8, 0.98), (0.9, 0.34, 0.04), A["glass"])
    for s in (-1, 1):
        b.box((s * 0.55, 0.78, 0.7), (0.02, 0.32, 0.5), A["glass"])
    for z in (-0.5, 0.35, 1.05):
        b.box((0, 0.58, z), (1.18, 0.03, 0.04), A["trim"])
    bumper_bar(b, 1.22, 0.1, 1.12, 0.14, A["rubber"])
    b.sph((0.4, 0.4, 1.2), 0.18, A["lamp"], 8)
    b.sph((-0.4, 0.4, 1.2), 0.18, A["lamp"], 8)
    pilot_soldadito(b, ANCH["combi"]["seat"])
    return b.object("Combi")


BUILDERS = {
    "buggy": build_buggy,
    "monster": build_monster,
    "formula": build_formula,
    "tanque": build_tanque,
    "carrera": build_carrera,
    "axel": build_axel,
    "helado": build_helado,
    "combi": build_combi,
}


def build_one(kind):
    reset()
    ob = BUILDERS[kind]()
    folder = os.path.join(HERE, kind)
    os.makedirs(folder, exist_ok=True)
    return export_static(ob, kind, folder)


def main():
    args = dict(s.split("=", 1) for s in sys.argv[sys.argv.index("--") + 1:] if "=" in s) if "--" in sys.argv else {}
    if args.get("all"):
        for k in KINDS:
            build_one(k)
        return
    kind = args.get("kind", "buggy")
    if kind not in BUILDERS:
        raise SystemExit("kind must be one of: " + ", ".join(KINDS))
    build_one(kind)


if __name__ == "__main__":
    main()
