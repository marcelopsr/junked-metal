"""Copia cinematográfica: conserva originales y clips; exporta GLB relightables.
Blender -b --python assets-src/cinematic-3d/build.py
"""
import bpy, bmesh, math, sys, json
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
OUT = HERE
sys.path.insert(0, str(ROOT / 'assets-src'))
sys.path.insert(0, str(ROOT / 'assets-src/cars'))
import bicho as b
import cuadrupedo as q
from rc_common import CarBuild as BaseCarBuild, pilot_soldadito

class CarBuild(BaseCarBuild):
    # El kit antiguo no asigna material a caras de tubos recién creadas.
    def tube(self, pts, r, m, seg=8):
        before=set(self.bm.faces)
        super().tube(pts,r,m,seg)
        for f in set(self.bm.faces)-before:f.material_index=self._mi(m);f.smooth=True
OUT.mkdir(parents=True, exist_ok=True)
report = {}

def active(ob):
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob

def bevel(ob, width=.02):
    active(ob); m=ob.modifiers.new('Soft manufactured edges','BEVEL'); m.width=width; m.segments=3
    bpy.ops.object.modifier_apply(modifier=m.name)
    for p in ob.data.polygons: p.use_smooth=True
    m=ob.modifiers.new('Face normals','WEIGHTED_NORMAL'); m.keep_sharp=True
    bpy.ops.object.modifier_apply(modifier=m.name)

def save(name, objects, animated=False):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects: ob.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.context.preferences.filepaths.save_version=0
    for image in bpy.data.images:
        if image.source=='FILE' and image.has_data:image.pack()
    bpy.ops.wm.save_as_mainfile(filepath=str(HERE/(name+'.blend')))
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')), export_format='GLB', use_selection=True,
        export_yup=True, export_animations=animated, export_animation_mode='ACTIONS',
        export_force_sampling=False, export_texcoords=True, export_materials='EXPORT', export_skins=animated)
    report[name]={'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects if o.type=='MESH'), 'bytes':(OUT/(name+'.glb')).stat().st_size}

# Perro: copiar la fuente existente sin volver a hacer rig ni clips.
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets-src/perro/perro.blend'))
ob=bpy.data.objects['Perro']; rig=bpy.data.objects['PerroRig']; rig.data.pose_position='REST'
rig.animation_data.action=None
for bone in rig.pose.bones:
    bone.rotation_quaternion=(1,0,0,0); bone.location=(0,0,0); bone.scale=(1,1,1)
# Reemplazar los ojos planos por ojos con esclerótica, iris y ceja.
bm=bmesh.new(); bm.from_mesh(ob.data)
eye_index=next(i for i,m in enumerate(ob.data.materials) if m.name=='Eye')
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index==eye_index], context='FACES')
bm.to_mesh(ob.data); bm.free()
active(ob)
m=ob.modifiers.new('Cinematic smoothing','SUBSURF'); m.levels=1
bpy.ops.object.modifier_move_up(modifier=m.name); bpy.ops.object.modifier_apply(modifier=m.name)
S=1.08
# Silueta de oreja de murciélago más compacta; rest pose y malla cambian juntas.
for v in ob.data.vertices:
    if v.co.z>7.5*S:v.co.z=7.5*S+(v.co.z-7.5*S)*.74
active(rig);bpy.ops.object.mode_set(mode='EDIT')
for bone in rig.data.edit_bones:
    if bone.name.startswith('ear_'):
        for point in (bone.head,bone.tail):
            if point.z>7.5*S:point.z=7.5*S+(point.z-7.5*S)*.74
bpy.ops.object.mode_set(mode='OBJECT')
for f in ob.data.polygons:
    p=q.J(f.center)/S;n=q.J(f.normal)
    width=1.15*(1-abs(p.y-4.15)/2.3)+.05*math.sin(p.y*8)
    if f.material_index==0 and 2.8<p.y<5.45 and 2.6<p.z<4.9 and n.z>.15 and abs(p.x)<width:f.material_index=1
# La nariz gana volumen; el pecho sigue siendo gris fuera de su babero.
nose_index=next(i for i,m in enumerate(ob.data.materials) if m.name=='Nose')
nose_verts={i for f in ob.data.polygons if f.material_index==nose_index for i in f.vertices}
center=b.G(0,5.95,6.62)*S
for i in nose_verts:
    v=ob.data.vertices[i];d=v.co-center;v.co=center+Vector((d.x*1.45,d.y*1.15,d.z*1.35))
ear=next(m for m in ob.data.materials if m.name=='EarInner');ear.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*b._lin('#806c65'),1)
sclera=b.mat('EyeIvory','#d3c1a0',rough=.3)
iris=b.mat('IrisAmber','#a06620',rough=.18)
pupil=b.mat('Pupil','#090a0b',rough=.12)
fur=b.mat('BrowFur','#565b63',rough=.78)
for sign in (-1,1):
    for mat, center, radii in [
        (sclera,(sign*.97,6.36,6.08),(.43,.25,.23)),
        (iris,(sign*.94,6.35,6.29),(.19,.21,.055)),
        (pupil,(sign*.93,6.36,6.34),(.09,.13,.035)),
        (fur,(sign*.50,5.66,6.22),(.72,.53,.36)),
        (fur,(sign*.42,5.22,6.22),(.59,.25,.30)),
    ]: q.add_rigid(ob,S,'head',mat,[(center,radii,24,12)])
    for i in range(4):q.add_rigid(ob,S,'head',fur,[((sign*(.5+.22*i),6.49+.12*i,6.28),(.28,.13,.17),20,10)])
# Corto relieve de pelo y variación sutil; horneados, sin luces pintadas.
active(ob); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=.012); bpy.ops.object.mode_set(mode='OBJECT')
for mat in ob.data.materials:
    n=mat.node_tree.nodes; l=mat.node_tree.links; p=n.get('Principled BSDF')
    p.inputs['Emission Strength'].default_value=0
    if mat.name in ('Body','Chest','BrowFur','EarInner'):
        base=tuple(p.inputs['Base Color'].default_value)
        noise=n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=85; noise.inputs['Detail'].default_value=2
        ramp=n.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color=tuple(c*.86 for c in base[:3])+(1,)
        ramp.color_ramp.elements[1].color=tuple(min(1,c*1.06) for c in base[:3])+(1,)
        l.new(noise.outputs['Fac'],ramp.inputs[0]); l.new(ramp.outputs[0],p.inputs['Base Color'])
        bump=n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.2; bump.inputs['Distance'].default_value=.014
        l.new(noise.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal'])
sc=bpy.context.scene; sc.render.engine='CYCLES';sc.cycles.samples=8;sc.render.bake.margin=6
# Metal si está disponible; CPU sigue siendo válida para hornear estas texturas.
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences; prefs.compute_device_type='METAL';prefs.get_devices()
    devices=[d for d in prefs.devices if d.type=='METAL']
    if devices:
        for d in prefs.devices:d.use=d.type=='METAL'
        sc.cycles.device='GPU'
except (TypeError,AttributeError):pass
images={}
for kind in ('albedo','normal','orm'):
    image=bpy.data.images.new('frenchie-'+kind,width=1024,height=1024,alpha=False)
    if kind!='albedo':image.colorspace_settings.name='Non-Color'
    restored=[]
    for mat in ob.data.materials:
        nodes=mat.node_tree.nodes;links=mat.node_tree.links;p=nodes.get('Principled BSDF');out=nodes.get('Material Output')
        tex=nodes.new('ShaderNodeTexImage');tex.image=image;nodes.active=tex
        if kind!='normal':
            emit=nodes.new('ShaderNodeEmission')
            if kind=='albedo':
                color=p.inputs['Base Color']; emit.inputs[0].default_value=color.default_value
                if color.is_linked:links.new(color.links[0].from_socket,emit.inputs[0])
            else:emit.inputs[0].default_value=(1,p.inputs['Roughness'].default_value,p.inputs['Metallic'].default_value,1)
            links.new(emit.outputs[0],out.inputs['Surface']);restored.append((mat,emit))
    bpy.ops.object.bake(type='NORMAL' if kind=='normal' else 'EMIT')
    for mat,emit in restored:
        mat.node_tree.links.new(mat.node_tree.nodes['Principled BSDF'].outputs[0],mat.node_tree.nodes['Material Output'].inputs['Surface']);mat.node_tree.nodes.remove(emit)
    image.filepath_raw=str(HERE/('frenchie-'+kind+'.png'));image.file_format='PNG';image.save();images[kind]=image
# Un material PBR compartido que conserva las manchas horneadas de la anatomía.
mat=b.mat('FrenchieCoat','#ffffff',rough=.8);nodes=mat.node_tree.nodes;links=mat.node_tree.links;p=nodes.get('Principled BSDF')
for kind,image in images.items():
    t=nodes.new('ShaderNodeTexImage');t.image=image
    if kind=='albedo':links.new(t.outputs[0],p.inputs['Base Color'])
    elif kind=='normal':
        normal=nodes.new('ShaderNodeNormalMap');links.new(t.outputs[0],normal.inputs[1]);links.new(normal.outputs[0],p.inputs['Normal'])
    else:
        sep=nodes.new('ShaderNodeSeparateColor');links.new(t.outputs[0],sep.inputs[0]);links.new(sep.outputs['Green'],p.inputs['Roughness']);links.new(sep.outputs['Blue'],p.inputs['Metallic'])
ob.data.materials.clear();ob.data.materials.append(mat)
for face in ob.data.polygons:face.material_index=0;face.use_smooth=True
rig.data.pose_position='POSE'
save('frenchie',[rig,ob],True)
report['frenchie']['clips']=[a.name for a in bpy.data.actions]

# Buggy: kit existente, nuevas chapas biseladas y ruedas independientes.
b.reset(); mats={'paint':b.mat('Paint','#e6a51e',metal=.1,rough=.42),'metal':b.mat('Metal','#8e969d',metal=.85,rough=.3),
    'dark':b.mat('Chassis','#20252a',metal=.4,rough=.58),'rubber':b.mat('Rubber','#15181c',rough=.94),
    'lamp':b.mat('Lamp','#fff1cb',emit=2),'cyan':b.mat('Antenna','#00baca',metal=.25,rough=.3)}
car=CarBuild();car.box((0,.25,0),(1.4,.15,2.65),mats['dark'])
# Capó inclinado y paneles laterales: la silueta abierta de la referencia.
# Capó trapezoidal inclinado, con grosor y bordes de chapa.
verts=[car.bm.verts.new(b.G(x,y,z)) for x,y,z in [(-.7,.78,.3),(.7,.78,.3),(.56,.53,1.43),(-.56,.53,1.43),(-.7,.47,.3),(.7,.47,.3),(.56,.32,1.43),(-.56,.32,1.43)]]
for ids in [(0,1,2,3),(4,7,6,5),(0,4,5,1),(3,2,6,7),(0,3,7,4),(1,5,6,2)]:
    f=car.bm.faces.new([verts[i] for i in ids]);f.material_index=car._mi(mats['paint'])
bmesh.ops.recalc_face_normals(car.bm,faces=car.bm.faces)
car.box((0,.72,-.75),(1.35,.2,.65),mats['paint'])
for s in (-1,1):
    car.box((s*.70,.54,-.05),(.13,.42,1.8),mats['paint'])
    car.tube([(s*.61,.49,-.8),(s*.53,1.42,-.6),(s*.48,1.45,.3),(s*.65,.56,.65)],.045,mats['metal'],12)
    car.box((s*.52,.53,1.45),(.34,.2,.11),mats['lamp'])
    for z in (-.9,.92):
        car.cyl((s*.7,.4,z),.045,.65,mats['metal'],16,axis='x')
        car.tube([(s*.53,.45,z),(s*1.0,.43,z)],.045,mats['dark'],12)
        # Amortiguador y resorte helicoidal, sin acento rojo del jugador.
        car.tube([(s*.56,.82,z),(s*.97,.40,z)],.035,mats['metal'],12)
        pts=[(s*(.58+.35*t/80)+.045*math.cos(t*math.pi/6),.8-.36*t/80+.045*math.sin(t*math.pi/6),z) for t in range(81)]
        car.tube(pts,.012,mats['metal'],6)
car.box((0,1.44,-1.05),(1.9,.10,.46),mats['paint'])
for x in (-.55,.55):car.box((x,1.05,-1.05),(.07,.75,.15),mats['dark'])
car.box((0,.38,1.46),(1.55,.13,.2),mats['rubber'])
car.tube([(.35,.75,-.7),(.35,1.92,-.73)],.018,mats['metal'],10);car.sph((.35,1.92,-.73),.065,mats['cyan'],16)
pilot_soldadito(car,(0,.51,-.2,1.05))
body=car.object('BuggyBody');bevel(body,.018);objects=[body]
for s in (-1,1):
    for z in (-.9,.92):
        wheel=CarBuild();wheel.cyl((0,0,0),.49,.32,mats['rubber'],48,axis='x')
        wheel.cyl((s*.17,0,0),.28,.035,mats['metal'],32,axis='x')
        wheel.cyl((s*.20,0,0),.16,.04,mats['paint'],24,axis='x')
        for i in range(32):
            angle=2*math.pi*i/32
            # Bloques de banda con orientación radial; todas las caras son volumen.
            for x in (-.095,.095):
                wheel.box((x,.485*math.sin(angle),.485*math.cos(angle)),(.15,.075,.1),mats['rubber'])
        ob=wheel.object('Wheel_'+str(s)+'_'+str(z));bevel(ob,.012);ob.location=b.G(s*1.0,.52,z);objects.append(ob)
# UV para el desgaste de chapa que se aplicará con el material compartido del banco.
for ob in objects:
    active(ob);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.01);bpy.ops.object.mode_set(mode='OBJECT')
save('buggy',objects)
(HERE/'build-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('CINEMATIC_BUILD',json.dumps(report))
