"""Generate smooth voxel spheres for the existing yard ball and nearby toys."""
import importlib.util
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("magicavoxel", ROOT.parents[1] / "magicavoxel/v1/generate.py")
VOX = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VOX)
N, CENTER, RADIUS, SHELL = 96, 48, 43, 1.6
ICO_PHI = (1 + math.sqrt(5)) / 2


def pentagons():
    points = [(0, y, z * ICO_PHI) for y in (-1, 1) for z in (-1, 1)]
    points += [(x, y * ICO_PHI, 0) for x in (-1, 1) for y in (-1, 1)]
    points += [(x * ICO_PHI, 0, z) for x in (-1, 1) for z in (-1, 1)]
    return [tuple(q / math.sqrt(sum(a * a for a in p)) for q in p) for p in points]


PENTAGON_CENTERS = pentagons()
TANGENTS = []
for center in PENTAGON_CENTERS:
    reference = (0, 1, 0) if abs(center[1]) < .9 else (1, 0, 0)
    dot = sum(center[i] * reference[i] for i in range(3))
    tangent = tuple(reference[i] - dot * center[i] for i in range(3))
    length = math.sqrt(sum(v * v for v in tangent))
    tangent = tuple(v / length for v in tangent)
    cross = (center[1] * tangent[2] - center[2] * tangent[1], center[2] * tangent[0] - center[0] * tangent[2], center[0] * tangent[1] - center[1] * tangent[0])
    TANGENTS.append((tangent, cross))


def panel(normal):
    best = None
    for center, (axis_a, axis_b) in zip(PENTAGON_CENTERS, TANGENTS):
        dot = sum(normal[i] * center[i] for i in range(3))
        tangent = tuple(normal[i] - dot * center[i] for i in range(3))
        rho = math.sqrt(sum(v * v for v in tangent))
        angle = math.atan2(sum(tangent[i] * axis_b[i] for i in range(3)), sum(tangent[i] * axis_a[i] for i in range(3))) % math.tau
        side = .34 * math.cos(math.pi / 5) / math.cos((angle % (math.tau / 5)) - math.pi / 5)
        gap = rho - side
        if best is None or gap < best:
            best = gap
    if abs(best) < .025:
        return 7
    return 15 if best < 0 else 8


def make_ball(kind):
    voxels = {}
    palette = {"football": 8, "tennis": 13, "beach": 13}
    for y in range(N):
        dy = y + .5 - CENTER
        for x in range(N):
            dx = x + .5 - CENTER
            for z in range(N):
                dz = z + .5 - CENTER
                radius = math.sqrt(dx * dx + dy * dy + dz * dz)
                if radius > RADIUS:
                    continue
                color = palette[kind]
                if radius >= RADIUS - SHELL:
                    nx, ny, nz = dx / radius, dy / radius, dz / radius
                    if kind == "football":
                        color = panel((nx, ny, nz))
                        if color == 8 and abs(ny + .36 * math.cos(math.atan2(nz, nx) * 3)) < .022:
                            color = 7
                    elif kind == "tennis":
                        longitude = math.atan2(nz, nx)
                        latitude = math.asin(max(-1, min(1, ny)))
                        seam = abs(latitude - .32 * math.sin(longitude * 2)) < .065
                        if seam:
                            color = 8
                        elif (x * 3 + y * 7 + z * 11) % 131 == 0:
                            color = 14
                    else:
                        longitude = (math.atan2(nz, nx) + math.pi) % math.tau
                        segment = (longitude / (math.tau / 6)) % 1
                        color = 1 if segment < .035 else (8, 11, 13, 14, 15, 10)[int(longitude / (math.tau / 6)) % 6]
                voxels[x, y, z] = color
    assert len(voxels) > 300_000 and len(set(voxels.values())) >= 3
    return (N, N, N), voxels


def save_svox(path, dims, voxels, kind):
    colors = sorted(set(voxels.values()))
    letters = {color: chr(ord("A") + index) for index, color in enumerate(colors)}
    palette = VOX.PALETTE
    overrides = {
        "tennis": {8: "EAF0C7", 13: "C4DF61", 14: "89A83C"},
        "beach": {1: "394B54", 8: "F1DFAE", 10: "E36F46", 11: "C84739", 13: "F2B544", 14: "41A5A0", 15: "315F73"},
    }.get(kind, {})
    mapping = " ".join(
        f"{letters[color]}({color}):#{overrides.get(color, ''.join(f'{channel:02X}' for channel in palette[color - 1][:3]))}"
        for color in colors
    )
    x_size, y_size, z_size = dims
    lines = [
        " ".join("".join(letters.get(voxels.get((x, y, z)), "-") for x in range(x_size)) for y in range(y_size))
        for z in range(z_size)
    ]
    assert len(lines) == z_size and all(len(line.split()) == y_size and all(len(row) == x_size for row in line.split()) for line in lines)
    assert sum(char != "-" for line in lines for char in line if char != " ") == len(voxels)
    header = f'''model
size = {x_size} {y_size} {z_size}
scale = 0.025
origin = +z
rotation = 90 0 0
position = 0 0.25 0
ao = #000 1 0.5

material lighting = smooth, deform = 8 0.8 0.7, roughness = 0.88
  colors = {mapping}

voxels
'''
    path.write_text(header + "\n".join(lines) + "\n")


for kind in ("football", "tennis", "beach"):
    dims, voxels = make_ball(kind)
    count = VOX.save_vox(ROOT / "sources" / f"{kind}-ball.vox", dims, voxels)
    save_svox(ROOT / "sources" / f"{kind}-ball.svox", dims, voxels, kind)
    assert count == len(voxels)
    print(f"{kind}-ball: {count:,} voxels, {dims[0]}³, shell={SHELL}; SVOX validated")
