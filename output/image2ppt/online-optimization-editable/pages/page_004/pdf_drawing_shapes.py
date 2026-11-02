"""Read PDF drawing primitives into editable standard Image2PPT shapes.

No files or lifecycle state are written. Cubic geometry is source geometry;
adaptive subdivision is used only for fill contours and custom dash boundaries.
"""
import math
import re

LAST_EXTRACTION_STATS = {}
TOLERANCE_PX = 0.12


def _colour(value):
    if value is None:
        return "none"
    if len(value) == 1:
        value = value * 3
    return "#" + "".join(f"{max(0,min(255,round(v*255))):02X}" for v in value[:3])


def _lerp(a, b, t=0.5):
    return (a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t)


def _distance(a, b):
    return math.hypot(a[0]-b[0], a[1]-b[1])


def _flat(c, tol=TOLERANCE_PX, depth=0):
    a,b,c1,d = c
    length = _distance(a,d)
    if length:
        error = max(abs((p[0]-a[0])*(d[1]-a[1])-(p[1]-a[1])*(d[0]-a[0]))/length for p in (b,c1))
    else:
        error = max(_distance(a,b),_distance(a,c1))
    excess = _distance(a,b)+_distance(b,c1)+_distance(c1,d)-length
    if (error <= tol and excess <= tol) or depth >= 20:
        return [a,d]
    ab,bc,cd = _lerp(a,b),_lerp(b,c1),_lerp(c1,d)
    abc,bcd = _lerp(ab,bc),_lerp(bc,cd)
    mid = _lerp(abc,bcd)
    return _flat((a,ab,abc,mid),tol,depth+1)[:-1]+_flat((mid,bcd,cd,d),tol,depth+1)


def _cubic_line(a,b):
    return [*a,*_lerp(a,b,1/3),*_lerp(a,b,2/3),*b]


def _box(points):
    xs,ys = zip(*points)
    left,top,width,height=min(xs),min(ys),max(xs)-min(xs),max(ys)-min(ys)
    # Runtime's custom geometry normalizes to at least one source pixel.
    # Padding the geometry box retains exact coordinates for tiny primitives.
    if width<1:
        left-=(1-width)/2
        width=1
    if height<1:
        top-=(1-height)/2
        height=1
    return [left,top,width,height]


def _area(points):
    return sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(points,points[1:]+points[:1]))/2


def _inside(point, polygon):
    x,y=point
    inside=False
    for a,b in zip(polygon,polygon[1:]+polygon[:1]):
        if (a[1]>y)!=(b[1]>y) and x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:
            inside=not inside
    return inside


def _dash_spec(value,sx):
    if not value or value.strip() == '[] 0':
        return None
    m=re.match(r'\s*\[([^\]]*)\]\s*([-+\d.eE]+)',value)
    if not m:
        return None
    array=[float(v)*sx for v in re.findall(r'[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?',m.group(1))]
    if not array or sum(array)<=0:
        return None
    if len(array)%2:
        array*=2
    return array,float(m.group(2))*sx


def _dash_segments(points,spec):
    """Native cubic line pieces preserving PDF dash lengths and phase."""
    array,phase=spec
    phase%=sum(array)
    index=0
    while phase>=array[index] and array[index]>0:
        phase-=array[index]
        index=(index+1)%len(array)
    remain=array[index]-phase
    result=[]
    for a,b in zip(points,points[1:]):
        length=_distance(a,b)
        cursor=0.0
        guard=0
        while cursor<length-1e-10:
            guard+=1
            if guard>100000:
                raise ValueError('Non-progressing PDF dash specification')
            if remain<=1e-10:
                index=(index+1)%len(array)
                remain=array[index]
                continue
            step=min(remain,length-cursor)
            if index%2==0 and step>1e-10:
                result.append(_cubic_line(_lerp(a,b,cursor/length),_lerp(a,b,(cursor+step)/length)))
            cursor+=step
            remain-=step
    return result


def extract_shapes(page,sx,sy):
    """Extract editable native shape arrays; sx/sy map PDF points to source pixels."""
    global LAST_EXTRACTION_STATS
    drawings=page.get_drawings()
    shapes=[]
    stats={'source_drawing_count':len(drawings),'source_item_count':sum(len(d['items']) for d in drawings),
           'source_drawings_represented':0,'output_shape_count':0,'adaptive_flatten_tolerance_px':TOLERANCE_PX,
           'source_path_output_counts':{},'custom_dashed_paths':0,'filled_contours':0,'holes':0,
           'unsupported_items':[],'transparent_drawings_suppressed':0,'stroke_width_mapping':'PDF pt * sx * 72/96'}
    def point(p):
        return (float(p[0])*sx,float(p[1])*sy)
    for di,d in enumerate(drawings):
        initial_count=len(shapes)
        base={'stroke':_colour(d.get('color')),'fill':_colour(d.get('fill')),
              'stroke_width':float(d.get('width') or 0.01)*sx*72/96,
              'z_index':10+int(d.get('seqno',di))}
        subpaths=[]
        current=[]
        last=None
        def add(kind,pts):
            nonlocal current,last
            if last is not None and _distance(last,pts[0])>1e-6:
                if current:
                    subpaths.append(current)
                current=[]
            current.append((kind,pts))
            last=pts[-1]
        for item in d['items']:
            kind=item[0]
            if kind=='l':
                add('l',[point(item[1]),point(item[2])])
            elif kind=='c':
                add('c',[point(p) for p in item[1:5]])
            elif kind=='re':
                r=item[1]
                pts=[point((r.x0,r.y0)),point((r.x1,r.y0)),point((r.x1,r.y1)),point((r.x0,r.y1))]
                if len(item)>2 and item[2]<0:
                    pts=pts[::-1]
                for a,b in zip(pts,pts[1:]+pts[:1]):
                    add('l',[a,b])
            elif kind=='qu':
                q=item[1]
                pts=[point(q.ul),point(q.ur),point(q.lr),point(q.ll)]
                for a,b in zip(pts,pts[1:]+pts[:1]):
                    add('l',[a,b])
            else:
                stats['unsupported_items'].append({'drawing':di,'item':kind})
                raise ValueError(f'Unsupported PDF drawing item {kind} in drawing {di}')
        if current:
            subpaths.append(current)
        if d.get('closePath'):
            for sub in subpaths:
                if _distance(sub[-1][1][-1],sub[0][1][0])>1e-6:
                    sub.append(('l',[sub[-1][1][-1],sub[0][1][0]]))
        flatpaths=[]
        for sub in subpaths:
            flat=[]
            for kind,pts in sub:
                part=_flat(pts) if kind=='c' else pts
                flat.extend(part if not flat else part[1:])
            flatpaths.append(flat)
        hasfill=d.get('fill') is not None and 'f' in d.get('type','') and d.get('fill_opacity',1)!=0
        hasstroke=d.get('color') is not None and 's' in d.get('type','') and d.get('stroke_opacity',1)!=0
        if not hasfill and not hasstroke:
            stats['transparent_drawings_suppressed']+=1
        if hasfill:
            # Larger enclosing contours precede inner contours so white holes
            # cut through this path's own fill before its native outline is drawn.
            order=sorted(range(len(flatpaths)),key=lambda i:abs(_area(flatpaths[i])),reverse=True)
            for si in order:
                poly=flatpaths[si]
                if len(poly)<3:
                    continue
                a=_area(poly)
                parents=[j for j in order if abs(_area(flatpaths[j]))>abs(a)+1e-6 and _inside(poly[0],flatpaths[j])]
                if d.get('even_odd'):
                    hole=len(parents)%2==1
                else:
                    outside_winding=sum(1 if _area(flatpaths[j])>0 else -1 for j in parents)
                    inside_winding=outside_winding+(1 if a>0 else -1)
                    hole=bool(parents) and inside_winding==0
                shape={**base,'id':f'pdf_path_{di:04d}_fill_{si:03d}','type':'polygon','polygon_px':[list(p) for p in poly],
                       'box_px':_box(poly),'fill':'#FFFFFF' if hole else base['fill'],'stroke':'none',
                       'pdf_source_drawing':di,'pdf_fill_contour':si,'pdf_fill_hole':hole}
                shapes.append(shape)
                stats['filled_contours']+=1
                stats['holes']+=int(hole)
        if hasstroke:
            dash=_dash_spec(d.get('dashes'),sx)
            if dash:
                curves=[]
                for flat in flatpaths:
                    curves.extend(_dash_segments(flat,dash))
                stats['custom_dashed_paths']+=1
            else:
                curves=[]
                for sub in subpaths:
                    for kind,pts in sub:
                        curves.append([v for p in pts for v in p] if kind=='c' else _cubic_line(*pts))
            if curves:
                allpts=[(c[i],c[i+1]) for c in curves for i in (0,2,4,6)]
                if len(curves)==1 and len(d['items'])==1 and d['items'][0][0]=='l' and not dash:
                    shape={**base,'id':f'pdf_path_{di:04d}_stroke','type':'line','fill':'none',
                           'points_px':[curves[0][0],curves[0][1],curves[0][6],curves[0][7]]}
                else:
                    shape={**base,'id':f'pdf_path_{di:04d}_stroke','type':'bezier','fill':'none',
                           'box_px':_box(allpts),'bezier_px':curves}
                shape['pdf_source_drawing']=di
                shapes.append(shape)
        count=len(shapes)-initial_count
        stats['source_path_output_counts'][str(di)]=count
        stats['source_drawings_represented']+=int(count>0)
    stats['output_shape_count']=len(shapes)
    LAST_EXTRACTION_STATS=stats
    return shapes
