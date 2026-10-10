"""Blender -b --python build.py -- seeds=3,17,41. Solo escribe esta carpeta."""
import bpy, bmesh, math, sys, json, hashlib
from pathlib import Path
from mathutils import Vector, Matrix
import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'cars'))
from rc_common import CarBuild, G, mat, reset

# Las semillas cambian geometría/colocación; los mapas se comparten entre variantes.
args = dict(a.split('=', 1) for a in sys.argv[sys.argv.index('--') + 1:]) if '--' in sys.argv else {}
assert not set(args) - {'seeds'}, 'Solo se admite seeds=...'
seeds = [int(s) for s in args.get('seeds', '3,17,41').split(',')]
assert len(seeds) == 3 and len(set(seeds)) == 3 and all(0 <= s < 2**32 for s in seeds), 'Tres semillas distintas: 0..2^32-1'
reset()
for folder in ['models', 'textures', 'evidence']:
    (HERE / folder).mkdir(exist_ok=True)


def noise(seed, n=512):
    rng = np.random.default_rng(seed)
    out = np.zeros((n, n), np.float32)
    for grid, weight in [(4, .43), (12, .28), (32, .18), (96, .11)]:
        coarse = rng.random((grid, grid))
        coord = np.arange(n) * grid / n
        i = coord.astype(int); t = coord - i; t = t * t * (3 - 2 * t)
        low = coarse[i[:, None], i[None, :]] * (1 - t[None, :]) + coarse[i[:, None], (i[None, :] + 1) % grid] * t[None, :]
        high = coarse[(i[:, None] + 1) % grid, i[None, :]] * (1 - t[None, :]) + coarse[(i[:, None] + 1) % grid, (i[None, :] + 1) % grid] * t[None, :]
        out += weight * (low * (1 - t[:, None]) + high * t[:, None])
    return out


def image(name, values, color=False):
    im = bpy.data.images.new(name, width=512, height=512, alpha=False)
    im.colorspace_settings.name = 'sRGB' if color else 'Non-Color'
    rgb = np.clip(values, 0, 1)
    # El búfer byte generado guarda valores codificados; convertir a lineal aquí oscurece el PNG dos veces.
    rgba = np.concatenate([rgb, np.ones((512, 512, 1))], axis=2).astype(np.float32)
    im.pixels.foreach_set(rgba.ravel())
    im.filepath_raw = str(HERE / 'textures' / (name + '.png'))
    im.file_format = 'PNG'; im.save()
    check = bpy.data.images.load(im.filepath_raw); check.colorspace_settings.name = 'Non-Color'
    assert np.max(np.abs(np.array(check.pixels[:4]) - rgba[0, 0])) < 3 / 255, 'PNG debe conservar los canales sin conversión gamma'
    bpy.data.images.remove(check); im.pack()
    return im


def material(kind, seed):
    n = noise(seed); u = np.arange(512)[None, :] / 512
    if kind == 'wood':
        grain = .5 + .5 * np.sin(u * math.tau * 47 + n * 14)
        h = n * .07 + grain * .01
        rgb = np.array([.39, .27, .17]) * (.65 + n[..., None] * .7) + grain[..., None] * .055
        rough = .8 + n * .15; metal = np.zeros_like(n)
    elif kind == 'rubber':
        h = n * .02; rgb = np.array([.055, .061, .059]) * (.65 + n[..., None])
        rough = .83 + n * .13; metal = np.zeros_like(n)
    elif kind == 'steel':
        h = n * .015; rgb = np.array([.39, .43, .45]) * (.7 + n[..., None] * .5)
        rough = .45 + n * .23; metal = np.full_like(n, .92)
    else:
        rust = np.clip((n - (.54 if kind == 'paint' else .39)) * 12, 0, 1)
        base = np.array([.84, .52, .055]) if kind == 'paint' else np.array([.30, .34, .35])
        oxide = np.array([.43, .16, .045]) * (.55 + n[..., None])
        rgb = base * (1 - rust[..., None]) + oxide * rust[..., None]
        h = n * .025 + rust * .04
        rough = .55 * (1 - rust) + .94 * rust
        metal = (.03 if kind == 'paint' else .92) * (1 - rust) + .015 * rust
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * 35
    dy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * 35
    normal = np.stack([-dx, -dy, np.ones_like(n)], axis=2)
    normal /= np.linalg.norm(normal, axis=2)[..., None]
    maps = {'albedo': image(kind + '-albedo', rgb, True), 'normal': image(kind + '-normal', normal * .5 + .5),
            'orm': image(kind + '-orm', np.stack([np.ones_like(n), rough, metal], axis=2))}
    m = mat('JM_Prop_' + kind, '#ffffff', rough=.8)
    nodes, links = m.node_tree.nodes, m.node_tree.links; bsdf = nodes['Principled BSDF']
    for key, im in maps.items():
        tex = nodes.new('ShaderNodeTexImage'); tex.image = im
        if key == 'albedo': links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        elif key == 'normal':
            nm = nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = .65
            links.new(tex.outputs['Color'], nm.inputs['Color']); links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
        else:
            sep = nodes.new('ShaderNodeSeparateColor'); links.new(tex.outputs['Color'], sep.inputs['Color'])
            links.new(sep.outputs['Green'], bsdf.inputs['Roughness']); links.new(sep.outputs['Blue'], bsdf.inputs['Metallic'])
    return m


M = {kind: material(kind, 801 + i) for i, kind in enumerate(['wood', 'rubber', 'steel', 'rust', 'paint'])}


def box(b, center, size, material, yaw=0):
    old = set(b.bm.verts); b.box((0, 0, 0), size, material)
    transform = Matrix.Translation(G(*center)) @ Matrix.Rotation(-yaw, 4, 'Z')
    for v in set(b.bm.verts) - old: v.co = transform @ v.co


def ring(b, center, profile, material, seg=32):
    mi = b._mi(material); rings = []
    for radius, y in profile:
        rings.append([b.bm.verts.new(G(center[0] + radius * math.cos(a), center[1] + y, center[2] + radius * math.sin(a))) for a in np.arange(seg) * math.tau / seg])
    for j, row in enumerate(rings):
        nxt = rings[(j + 1) % len(rings)]
        for i in range(seg):
            f = b.bm.faces.new((row[i], row[(i + 1) % seg], nxt[(i + 1) % seg], nxt[i]))
            f.material_index = mi; f.smooth = True


def pallet(b, rng):
    width, depth = rng.uniform(.95, 1.12), rng.uniform(.86, 1.02)
    for x in [-width * .36, 0, width * .36]: box(b, (x, .10, 0), (.13, .17, depth), M['wood'])
    for i in range(6):
        z = (i / 5 - .5) * depth * .88
        box(b, (rng.uniform(-.025, .025), .21 + rng.uniform(-.006, .006), z), (width - rng.uniform(0, .07), .05, .115), M['wood'], rng.uniform(-.025, .025))
        for x in [-width * .36, width * .36]: b.cyl((x, .24, z), .012, .006, M['rust'], 8)
    for z in [-depth * .38, depth * .38]: box(b, (0, .018, z), (width, .032, .12), M['wood'])


def tires(b, rng):
    for k in range(int(rng.integers(2, 4))):
        r = rng.uniform(.235, .27); x, z = rng.uniform(-.035, .035, 2); y = k * .145
        ring(b, (x, y, z), [(r*.62, .01), (r*.94, .01), (r, .035), (r, .11), (r*.94, .14), (r*.62, .14), (r*.58, .11), (r*.58, .035)], M['rubber'], 36)
        for i in range(24):
            a = i * math.tau / 24
            box(b, (x + r * math.cos(a), y + .072, z + r * math.sin(a)), (.02, .074, .035), M['rubber'], a + .18 * (-1)**i)


def drum(b, rng):
    seg, rows = 40, 12; radii = [rng.uniform(.25, .29) * (1 + rng.uniform(-.018, .018)) for _ in range(rows)]
    phase = rng.uniform(0, math.tau); mi = b._mi(M['paint']); rings = []
    for j in range(rows):
        y = j / (rows - 1) * .8
        row = []
        for i in range(seg):
            a = i * math.tau / seg; dent = .045 * math.exp(-((math.atan2(math.sin(a-phase), math.cos(a-phase))/.5)**2 + ((y-.44)/.19)**2))
            r = radii[j] - dent; row.append(b.bm.verts.new(G(r*math.cos(a), y, r*math.sin(a))))
        rings.append(row)
    for row, nxt in zip(rings, rings[1:]):
        for i in range(seg):
            f=b.bm.faces.new((row[i],row[(i+1)%seg],nxt[(i+1)%seg],nxt[i]));f.material_index=mi;f.smooth=True
    for row in [rings[0][::-1],rings[-1]]: b.bm.faces.new(row).material_index = b._mi(M['rust'])
    for y in [.025,.24,.56,.785]: ring(b,(0,y,0),[(.266,0),(.285,0),(.285,.018),(.266,.018)],M['rust'],40)
    b.cyl((.11,.815,.03),.04,.025,M['steel'],12)


def sheets(b, rng):
    for k in range(3):
        old=set(b.bm.verts); mi=b._mi(M['paint'] if k==0 else M['rust']); width, depth=rng.uniform(.4,.75),rng.uniform(.4,.7)
        rows=[]
        for j in range(9):
            x=(j/8-.5)*width; bend=.04*math.sin(j/8*math.pi)+.025*math.sin(j*1.7)
            rows.append([b.bm.verts.new(G(x,.025+k*.035+bend, z*depth*.5)) for z in [-1,1]])
        for row,nxt in zip(rows,rows[1:]):
            f=b.bm.faces.new((row[0],row[1],nxt[1],nxt[0]));f.material_index=mi
        new=set(b.bm.verts)-old; transform=Matrix.Translation(G(rng.uniform(-.14,.14),0,rng.uniform(-.1,.1)))@Matrix.Rotation(rng.uniform(-.6,.6),4,'Z')
        for v in new:v.co=transform@v.co


def hardware(b, rng):
    for k in range(7):
        x,z=rng.uniform(-.27,.27,2); r=rng.uniform(.035,.055)
        if k<4: ring(b,(x,.006,z),[(r*.48,0),(r,0),(r,.016),(r*.48,.016)],M['rust'] if k%2 else M['steel'],16)
        else: ring(b,(x,.008,z),[(r*.44,0),(r,0),(r,.05),(r*.44,.05)],M['steel'],6)
    for k in range(4):
        x,z=rng.uniform(-.23,.23,2)
        b.cyl((x,.055,z),.014,.10,M['steel'],10)
        b.cyl((x,.113,z),.031,.018,M['rust'],6)
        for h in [.015,.035,.055,.075]:ring(b,(x,h,z),[(.012,0),(.017,0),(.017,.005),(.012,.005)],M['steel'],10)


FAMILIES = [('pallet','Pallet envejecido',pallet,'Garaje, taller y bordes de pista'),('tires','Neumáticos apilados',tires,'Barreras y rincones del circuito'),('drum','Bidón abollado',drum,'Utilería de patio y taller'),('sheets','Chapas dobladas',sheets,'Chatarra y detalles de arena'),('hardware','Tornillería',hardware,'Banco de trabajo y bases de props')]
def signature(b):
    b.bm.verts.index_update()
    return hashlib.sha256(np.array([tuple(v.co) for v in b.bm.verts],dtype=np.float32).tobytes()+str([tuple(v.index for v in f.verts) for f in b.bm.faces]).encode()).hexdigest()

assets=[]
for family,name,builder,use in FAMILIES:
    for seed in seeds:
        b=CarBuild();builder(b,np.random.default_rng(seed))
        repeat=CarBuild();builder(repeat,np.random.default_rng(seed))
        assert signature(b)==signature(repeat), 'La misma semilla debe producir la misma geometría'
        repeat.bm.free();bmesh.ops.recalc_face_normals(b.bm,faces=b.bm.faces)
        ob=b.object(f'{family}-{seed}');bpy.context.view_layer.objects.active=ob;ob.select_set(True)
        if family=='sheets':
            mod=ob.modifiers.new('Espesor real','SOLIDIFY');mod.thickness=.007
            bpy.ops.object.modifier_apply(modifier=mod.name)
        bevel=ob.modifiers.new('Bordes gastados','BEVEL');bevel.width=.003 if family=='hardware' else .007;bevel.segments=1
        bpy.ops.object.modifier_apply(modifier=bevel.name)
        for face in ob.data.polygons:face.use_smooth=family in ['tires','drum']
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.025);bpy.ops.object.mode_set(mode='OBJECT')
        bottom=min(v.co.z for v in ob.data.vertices)
        for v in ob.data.vertices:v.co.z-=bottom
        bpy.context.view_layer.update()
        verts=np.array([tuple(v.co) for v in ob.data.vertices],dtype=np.float32)
        tri=sum(len(p.vertices)-2 for p in ob.data.polygons)
        assert np.isfinite(verts).all() and 0<tri<12000 and len(ob.data.materials)<=4
        out=HERE/'models'/(ob.name+'.glb')
        bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_apply=True)
        assets.append({'id':ob.name,'family':family,'name':name,'seed':seed,'uses':[use], 'model':'models/'+out.name,'triangles':tri,'vertices':len(verts),'materials':[m.name for m in ob.data.materials],'geometrySha256':hashlib.sha256(verts.tobytes()+bytes(str([tuple(p.vertices) for p in ob.data.polygons]),'utf8')).hexdigest(),'sameSeedChecked':True,'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'dimensionsMeters':[float(ob.dimensions.x),float(ob.dimensions.z),float(ob.dimensions.y)],'pivot':'bottom-center; glTF Y up','status':'exported-not-integrated'})
        ob.select_set(False)
# Mantener originales en el origen para facilitar reutilización; colecciones por familia.
for family,_,_,_ in FAMILIES:
    c=bpy.data.collections.new(family);bpy.context.scene.collection.children.link(c)
    for ob in [o for o in bpy.context.scene.objects if o.name.startswith(family+'-')]:
        for old in list(ob.users_collection):old.objects.unlink(ob)
        c.objects.link(ob);ob.hide_set(not (family=='pallet' and ob.name.endswith('-'+str(seeds[0]))))
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'props.blend'))
(HERE/'assets.json').write_text(json.dumps({'version':1,'date':'2026-10-10','generator':'Blender procedural build.py','seeds':seeds,'source':'props.blend','textures':[str(p.relative_to(HERE)) for p in sorted((HERE/'textures').glob('*.png'))],'ao':'ORM red=1; not baked occlusion','assets':assets},ensure_ascii=False,indent=2)+'\n')
print('GENERATED',len(assets),'props;',sum(a['triangles'] for a in assets),'triangles;',sum(a['bytes'] for a in assets),'bytes')
