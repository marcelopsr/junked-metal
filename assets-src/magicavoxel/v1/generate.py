"""Build small Junked Metal voxel props as native MagicaVoxel VOX 150 files."""
import argparse, math, random, struct
from pathlib import Path

ROOT=Path(__file__).resolve().parent
PALETTE=[(47,36,29,255),(83,58,39,255),(120,82,50,255),(157,113,69,255),(34,38,38,255),(53,59,57,255),(73,82,83,255),(116,126,126,255),(170,180,177,255),(83,43,27,255),(126,57,31,255),(177,80,38,255),(255,180,0,255),(255,209,102,255),(45,72,84,255)]

def chunk(name, content=b'', children=b''):
    return name.encode('ascii')+struct.pack('<II',len(content),len(children))+content+children

def save_vox(path, dims, voxels):
    x,y,z=dims
    entries=sorted((a,b,c,k) for (a,b,c),k in voxels.items() if k)
    assert entries and len(entries)<2**31 and all(0<=a<x and 0<=b<y and 0<=c<z and 1<=k<256 for a,b,c,k in entries)
    body=chunk('SIZE',struct.pack('<III',x,y,z))+chunk('XYZI',struct.pack('<I',len(entries))+bytes(n for v in entries for n in v))+chunk('RGBA',b''.join(struct.pack('4B',*c) for c in PALETTE+[ (0,0,0,0) ]*(256-len(PALETTE))))
    data=b'VOX '+struct.pack('<I',150)+chunk('MAIN',b'',body)
    path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
    return len(entries)

def box(v,x1,y1,z1,x2,y2,z2,color):
    for x in range(x1,x2+1):
        for y in range(y1,y2+1):
            for z in range(z1,z2+1):v[x,y,z]=color

def disk(v,cx,cy,z,r,color,inner=0):
    for x in range(cx-r,cx+r+1):
        for y in range(cy-r,cy+r+1):
            d=(x-cx)**2+(y-cy)**2
            if inner*inner<=d<=r*r:v[x,y,z]=color

def pallet(seed):
    r=random.Random(seed);v={}
    # Cuatro tablas de madera, tres travesaños, extremos saltados y clavos expuestos.
    for i in range(6):
        y=2+i*4
        gap=r.choice([0,0,1]);box(v,1+gap,y,5,30-r.randrange(0,3),y+2,7,r.choice([2,3,4]))
        for x in [3+gap,28-r.randrange(0,2)]:v[x,y+1,8]=9 if i%2 else 8
    for x in [4,15,26]:
        box(v,x,2,2,x+3,25,4,2)
        box(v,x,3,1,x+3,24,1,1)
    # Madera expuesta en golpes de borde, sin ruido aleatorio uniforme.
    for x in [1,30]:
        for y in [4,12,21]:
            if r.random()<.8:box(v,x,y,5,x,y+1,6,10)
    return (32,28,10),v

def tires(seed):
    r=random.Random(seed);v={};cx=cy=16
    count=2+(seed%2)
    for layer in range(count):
        cz=4+layer*7;outer=10-r.randrange(0,2);inner=5
        for z in range(cz,cz+4):
            for x in range(5,28):
                for y in range(5,28):
                    d=(x-cx)**2+(y-cy)**2
                    if inner*inner<=d<=outer*outer:
                        v[x,y,z]=6 if z in [cz,cz+3] else 5
        # Grandes tacos alternados, separados y legibles como goma de auto RC.
        for z in [cz+1,cz+2]:
            for i in range(16):
                a=math.tau*i/16+(layer%2)*.17
                x=round(cx+outer*math.cos(a));y=round(cy+outer*math.sin(a))
                box(v,x-1,y-1,z,x+1,y+1,z,6)
    return (34,34,4+count*7+4),v

def drum(seed):
    r=random.Random(seed);v={};cx=cy=12
    phase=seed%8
    for z in range(2,23):
        swell=6 if 4<=z<=20 else 5
        for x in range(5,20):
            for y in range(5,20):
                d=(x-cx)**2+(y-cy)**2
                if (swell-1)**2<=d<=swell*swell:
                    a=math.atan2(y-cy,x-cx);rust=(int((a/math.tau*16))%16 in [(phase+1)%16,(phase+2)%16] and 8<=z<=17)
                    band=z in [3,4,10,11,20,21]
                    worn=(abs(x-cx)>=5 and z in [6,7,16])
                    v[x,y,z]=10 if rust or worn else 13 if band and z in [10,20] else 7 if band else 15
    for z,color in [(2,8),(22,8)]:disk(v,cx,cy,z,6,color,5)
    # Tapa y tapón desplazado.
    disk(v,cx,cy,23,5,13);disk(v,cx-2,cy+1,24,1,8);disk(v,cx-2,cy+1,25,1,14)
    return (26,26,27),v

def sheets(seed):
    r=random.Random(seed);v={}
    for layer in range(3):
        ox=2+layer*3+r.randrange(0,2);oy=2+layer*2
        width=20-r.randrange(0,4);depth=15-r.randrange(0,3);z=layer*3+2
        for x in range(width):
            bend=round(1.5*math.sin(x*math.pi/max(1,width-1)))
            for y in range(depth):
                # Onda doblada más un borde levantado y recortes asimétricos.
                if (x==0 and y<2) or (x==width-1 and y>depth-3):continue
                zz=z+bend+(1 if y in [0,depth-1] and (x+layer)%4==0 else 0)
                color=13 if layer==0 and (x+y)%7<2 else 8 if (x*3+y+seed)%11<4 else 10 if (x+y)%9==0 else 7
                v[ox+x,oy+y,zz]=color
                if y in [0,depth-1] and x%5==0:v[ox+x,oy+y,zz+1]=color
    # Pernos en algunas esquinas.
    for x,y,z in [(3,3,5),(23,4,6),(8,18,8)]:
        if (x,y,z) in v:v[x,y,z+1]=9
    return (30,23,13),v

def hardware(seed):
    r=random.Random(seed);v={}
    centers=[(7,8),(16,7),(25,9),(9,20),(19,21)]
    # Arandelas planas con hueco, tuercas hexagonales, espárragos y cabezas.
    for i,(cx,cy) in enumerate(centers):
        radius=3 if i<3 else 2
        disk(v,cx,cy,1,radius,8 if i%2 else 9,1)
        if i<3:
            for z in range(2,7):
                for dx,dy in [(0,0)]:v[cx+dx,cy+dy,z]=7
            for dx in range(-2,3):
                for dy in range(-2,3):
                    if max(abs(dx),abs(dy),abs(dx+dy)//2)<=2 and (dx*dx+dy*dy)<=6:v[cx+dx,cy+dy,7]=8
            disk(v,cx,cy,8,2,9,1)
        else:
            # Cabezas hexagonales sobre tornillos visibles.
            for dx in range(-2,3):
                for dy in range(-2,3):
                    if max(abs(dx),abs(dy),abs(dx+dy)//2)<=2:v[cx+dx,cy+dy,4]=7 if dx+dy else 8
            box(v,cx,cy,5,cx,cy,8,8)
            box(v,cx-1,cy,9,cx+1,cy,9,10)
    return (32,29,12),v

BUILDERS={'pallet':pallet,'tires':tires,'drum':drum,'sheets':sheets,'hardware':hardware}
def main():
    p=argparse.ArgumentParser();p.add_argument('--family',choices=['all',*BUILDERS],default='all');p.add_argument('--seeds',default='3,17,41');a=p.parse_args()
    seeds=[int(s) for s in a.seeds.split(',')];assert len(seeds)==3 and len(set(seeds))==3
    families=BUILDERS if a.family=='all' else [a.family]
    for family in families:
        for seed in seeds:
            dims,vox=BUILDERS[family](seed)
            n=save_vox(ROOT/'models'/f'{family}-{seed}.vox',dims,vox)
            print(f'{family}-{seed}: {n} voxels, {dims[0]}x{dims[1]}x{dims[2]}')
if __name__=='__main__':main()
