"""Build smooth, high-resolution vox sources for three Junked Metal props."""
import importlib.util
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("magicavoxel", ROOT.parents[1] / "magicavoxel/v1/generate.py")
VOX = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VOX)
STEP = 0.25


def planter():
    n, h, c = 64, 48, 32
    voxels = {}
    for y in range(h):
        height = (y + 0.5) * STEP
        t = min(1, max(0, (height - 0.5) / 9.5))
        outer = 4.35 + t * 1.65 + (0.28 if height > 9.4 else 0)
        inner = outer - 1.05
        for x in range(n):
            dx = (x + 0.5 - c) * STEP
            for z in range(n):
                dz = (z + 0.5 - c) * STEP
                angle = math.atan2(dz, dx)
                radius = math.hypot(dx, dz) + 0.08 * math.sin(angle * 7 + height * 0.35)
                inside = height < 1.0 or radius >= inner
                if height <= 10.6 and inside and radius <= outer:
                    lip = height > 9.5
                    worn = (math.sin(angle * 9 + height * 1.7) > 0.93 and 5 < height < 8.5 and radius > outer - 0.28)
                    voxels[x, y, z] = 12 if worn else 11 if lip else 10 if height < 1.0 else 11
    return (n, h, n), voxels


def paint_can():
    n, h, c = 56, 56, 28
    voxels = {}
    for y in range(h):
        height = (y + 0.5) * STEP
        if height > 12.5:
            continue
        if height < 0.4 or 9.65 < height < 10.35:
            radius, color = 4.9, 8
        elif height < 9.7:
            radius, color = 4.75, 13
        else:
            radius, color = 4.35, 8
        for x in range(n):
            dx = (x + 0.5 - c) * STEP
            for z in range(n):
                dz = (z + 0.5 - c) * STEP
                r = math.hypot(dx, dz)
                if r > radius:
                    continue
                angle = math.atan2(dz, dx)
                # A faded front label and a narrow yellow hazard band give it a toy-garage identity.
                front_label = math.cos(angle) < -0.83 and 3.3 < height < 7.2
                hazard = 0.72 < height < 1.12 and abs(math.cos(angle * 10)) > 0.68
                if front_label:
                    color = 15
                elif hazard:
                    color = 14 if math.sin(angle * 10) > 0 else 1
                elif 3.35 < height < 7.15:
                    color = 14 if math.sin(angle * 2 + height) > 0.75 else 13
                voxels[x, y, z] = color
    # Lid plug and the two pivot points for the bail handle.
    for x in range(c - 2, c + 3):
        for z in range(c - 2, c + 3):
            if (x - c) ** 2 + (z - c) ** 2 <= 4:
                voxels[x, 41, z] = 7
    for x in (c - 20, c + 19):
        for y in range(38, 42):
            for z in (c - 1, c, c + 1):
                voxels[x, y, z] = 8
    # Rounded wire bail, sampled as a thin tube in the front plane.
    points = [(-4.7, 9.7), (-5.1, 10.8), (-4.6, 12.0), (-3.2, 13.0), (0, 13.45), (3.2, 13.0), (4.6, 12.0), (5.1, 10.8), (4.7, 9.7)]
    for x in range(c - 24, c + 25):
        px = (x + 0.5 - c) * STEP
        for y in range(h):
            py = (y + 0.5) * STEP
            for z in range(c - 2, c + 3):
                pz = (z + 0.5 - c) * STEP
                dist = 99
                for a, b in zip(points, points[1:]):
                    vx, vy = b[0] - a[0], b[1] - a[1]
                    t = min(1, max(0, ((px - a[0]) * vx + (py - a[1]) * vy) / (vx * vx + vy * vy)))
                    dist = min(dist, math.hypot(px - a[0] - t * vx, py - a[1] - t * vy))
                if dist * dist + pz * pz <= 0.16:
                    voxels[x, y, z] = 8
    return (n, h, n), voxels


def drum():
    n, h, c = 72, 64, 36
    voxels = {}
    for y in range(h):
        height = (y + 0.5) * STEP
        if height > 14.8:
            continue
        t = min(1, max(0, height / 14.0))
        radius = 6.3 + 0.48 * math.sin(math.pi * t)
        band = min(abs(height - 1.0), abs(height - 2.0), abs(height - 12.0), abs(height - 13.0)) < 0.24
        for x in range(n):
            dx = (x + 0.5 - c) * STEP
            for z in range(n):
                dz = (z + 0.5 - c) * STEP
                r = math.hypot(dx, dz)
                angle = math.atan2(dz, dx)
                # A few shallow dents interrupt the barrel's otherwise rounded profile.
                dent = 0.38 * math.exp(-((angle + 0.7) / 0.2) ** 2 - ((height - 7.0) / 0.9) ** 2)
                if r > radius - dent:
                    continue
                if height < 0.42 or height > 14.2:
                    voxels[x, y, z] = 8
                elif band:
                    voxels[x, y, z] = 7 if int(height * 4) % 2 else 8
                else:
                    rust = math.sin(angle * 5 + height * 0.42) + 0.52 * math.sin(angle * 11 - height * 0.7)
                    voxels[x, y, z] = 11 if rust > 1.18 else 10 if rust > 0.82 else 15
    # Offset bung and rolled seam on the lid.
    for x in range(c - 3, c + 4):
        for z in range(c - 3, c + 4):
            if (x - c + 1) ** 2 + (z - c - 1) ** 2 <= 6:
                voxels[x, 58, z] = 13
    return (n, h, n), voxels


for name, build in (("planter", planter), ("paint-can", paint_can), ("rusty-drum", drum)):
    dims, voxels = build()
    count = VOX.save_vox(ROOT / "sources" / f"{name}.vox", dims, voxels)
    assert count == len(voxels) and count > 5_000 and len(set(voxels.values())) >= 3
    print(f"{name}: {count:,} voxels, {dims[0]}x{dims[1]}x{dims[2]}, cell={STEP}")
