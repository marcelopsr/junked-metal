"""Quick integrity check for the MagicaVoxel sources and five exported game props."""
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODELS = ROOT / 'models'
EXPORTS = ROOT / 'exports'
FAMILIES = ('pallet', 'tires', 'drum', 'sheets', 'hardware')
SEEDS = (3, 17, 41)

def chunks(data):
    at = 20
    while at < len(data):
        name, content_size, children_size = struct.unpack_from('<4sII', data, at)
        start = at + 12
        yield name, data[start:start + content_size]
        at = start + content_size + children_size
    assert at == len(data)

for family in FAMILIES:
    for seed in SEEDS:
        path = MODELS / f'{family}-{seed}.vox'
        data = path.read_bytes()
        assert data[:4] == b'VOX ' and struct.unpack_from('<I', data, 4)[0] == 150, path
        found = dict(chunks(data))
        x, y, z = struct.unpack('<III', found[b'SIZE'])
        count, = struct.unpack_from('<I', found[b'XYZI'])
        voxels = found[b'XYZI'][4:]
        assert len(voxels) == count * 4 and count > 0, path
        assert len(found[b'RGBA']) == 1024, path
        assert all(a < x and b < y and c < z and k > 0 for a, b, c, k in zip(*[iter(voxels)] * 4)), path

for family in FAMILIES:
    path = EXPORTS / f'{family}-3.glb'
    data = path.read_bytes()
    assert data[:4] == b'glTF' and struct.unpack_from('<I', data, 4)[0] == 2, path
    json_size, json_type = struct.unpack_from('<II', data, 12)
    assert json_type == 0x4E4F534A, path
    document = json.loads(data[20:20 + json_size])
    assert document.get('meshes') and document.get('materials') and document.get('images'), path
    assert document['images'][0].get('bufferView') is not None and document['images'][0].get('mimeType'), path
    faces = sum(accessor['count'] // 3 for mesh in document['meshes'] for primitive in mesh['primitives'] for accessor in [document['accessors'][primitive['indices']]])
    assert faces > 0, path
    print(f'{path.name}: {faces:,} caras, {path.stat().st_size:,} bytes')
print('OK: 15 fuentes .vox y 5 GLB válidos con textura y material.')
