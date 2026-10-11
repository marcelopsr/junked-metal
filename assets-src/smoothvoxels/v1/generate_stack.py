"""Create a high-resolution rounded three-tire stack for Smooth Voxels."""
import importlib.util
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("magicavoxel", ROOT.parents[1] / "magicavoxel/v1/generate.py")
VOX = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VOX)

STEP, MAJOR, TUBE = 0.25, 8.0, 2.75
SIZE_X = SIZE_Y = 88
SIZE_Z = 68
voxels = {}
for z in range(SIZE_Z):
    height = (z + 0.5) * STEP
    for layer in range(3):
        center_z = 2.75 + layer * 5.3
        dy = height - center_z
        if abs(dy) > TUBE:
            continue
        for x in range(SIZE_X):
            dx = (x + 0.5 - SIZE_X / 2) * STEP
            for y in range(SIZE_Y):
                dz = (y + 0.5 - SIZE_Y / 2) * STEP
                radial = math.hypot(dx, dz) - MAJOR
                if radial * radial + dy * dy <= TUBE * TUBE:
                    # The sidewall's subtle rubber shade is structural color, not tread blocks.
                    voxels[x, y, z] = 6 if abs(dy) > 1.9 else 5

count = VOX.save_vox(ROOT / "sources/folded-stack.vox", (SIZE_X, SIZE_Y, SIZE_Z), voxels)
print(f"folded-stack.vox: {count:,} voxels, {SIZE_X}x{SIZE_Y}x{SIZE_Z}, cell={STEP}")
