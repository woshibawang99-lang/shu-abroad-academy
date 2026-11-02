"""Source-exact PDF math glyph outlines as one native editable polygon per glyph.

No lifecycle/page files are changed. Paths are measured in font units and
adaptively flattened in final source pixels. All original contours retain their
winding and are joined by exactly reversed, zero-area bridges. Thus holes and
disjoint components remain part of a single PowerPoint freeform shape.
"""
from functools import lru_cache
from pathlib import Path
import math
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

TOLERANCE_PX = 0.08

def _mid(a,b): return ((a[0]+b[0])/2,(a[1]+b[1])/2)
def _distance(a,b): return math.hypot(a[0]-b[0],a[1]-b[1])

def _flat_cubic(a,b,c,d,tol,depth=0):
    length=_distance(a,d)
    err=max(abs((p[0]-a[0])*(d[1]-a[1])-(p[1]-a[1])*(d[0]-a[0]))/length for p in (b,c)) if length else max(_distance(a,b),_distance(a,c))
    excess=_distance(a,b)+_distance(b,c)+_distance(c,d)-length
    if (err<=tol and excess<=tol) or depth>=24:return [a,d]
    ab,bc,cd=_mid(a,b),_mid(b,c),_mid(c,d)
    abc,bcd=_mid(ab,bc),_mid(bc,cd);m=_mid(abc,bcd)
    return _flat_cubic(a,ab,abc,m,tol,depth+1)[:-1]+_flat_cubic(m,bcd,cd,d,tol,depth+1)

@lru_cache(maxsize=32)
def _font(path):
    f=TTFont(path)
    return f,f.getGlyphSet()

class _OutlinePen(BasePen):
    def __init__(self,glyphset,scale_x,scale_y,tolerance):
        super().__init__(glyphset);self.sx=scale_x;self.sy=scale_y;self.tolerance=tolerance;self.contours=[];self.current=[]
    def _point(self,p):return (p[0]*self.sx,-p[1]*self.sy)
    def _moveTo(self,p):
        if self.current:self._closePath()
        self.current=[self._point(p)]
    def _lineTo(self,p):self.current.append(self._point(p))
    def _curveToOne(self,p1,p2,p3):
        self.current.extend(_flat_cubic(self.current[-1],self._point(p1),self._point(p2),self._point(p3),self.tolerance)[1:])
    def _qCurveToOne(self,p1,p2):
        a=self.current[-1];b=self._point(p1);c=self._point(p2)
        c1=(a[0]+2*(b[0]-a[0])/3,a[1]+2*(b[1]-a[1])/3)
        c2=(c[0]+2*(b[0]-c[0])/3,c[1]+2*(b[1]-c[1])/3)
        self.current.extend(_flat_cubic(a,c1,c2,c,self.tolerance)[1:])
    def _closePath(self):
        if len(self.current)>1 and _distance(self.current[0],self.current[-1])<1e-9:self.current.pop()
        if len(self.current)>=3:self.contours.append(self.current)
        self.current=[]
    def _endPath(self):self._closePath()

@lru_cache(maxsize=8192)
def _outline(fontpath,glyphname,scale_x,scale_y,tolerance):
    font,gs=_font(fontpath);p=_OutlinePen(gs,scale_x,scale_y,tolerance);gs[glyphname].draw(p);p._endPath()
    return tuple(tuple(c) for c in p.contours)

def _bridge_contours(contours):
    """Keep exact original winding; each connection is traversed both ways."""
    if not contours:return []
    def area(c):return abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(c,c[1:]+c[:1])))
    contours=sorted((list(c) for c in contours if len(c)>=3),key=area,reverse=True)
    if not contours:return []
    result=contours[0]
    for c in contours[1:]:
        # The shortest bridge is visually irrelevant to fill, but reduces
        # self-overlap and makes the editable path easier to manipulate.
        i,j=min(((i,j) for i in range(len(result)) for j in range(len(c))),key=lambda ij:_distance(result[ij[0]],c[ij[1]]))
        ring=c[j:]+c[:j]
        result=result[:i+1]+ring+[ring[0],result[i]]+result[i+1:]
    return result

def glyph_shape(fm,gid,origin,size,sx,sy,color,shape_id=None,unicode_char=None,z_index=100,tolerance_px=TOLERANCE_PX):
    """Return one standard native polygon or None for an empty glyph.

    fm is the selected font's font_mapping JSON record. gid is MuPDF's original
    source glyph id, origin is original PDF baseline (x,y), size is PDF pt.
    sx/sy convert original PDF pt to the unchanged source.png pixels.
    color accepts '#RRGGBB', PDF integer RGB, or a normalized RGB tuple.
    """
    item=next((e for e in fm['glyphs'] if int(e['gid'])==int(gid)),None)
    if item is None:raise ValueError(f'No original glyph id {gid} in {fm.get("pdfname")}')
    path=fm.get('otf_path')
    if not path or not Path(path).exists():path=fm['path']
    font,_=_font(str(path));upem=float(font['head'].unitsPerEm)
    contours=_outline(str(path),item['glyph_name'],float(size)*sx/upem,float(size)*sy/upem,float(tolerance_px))
    polygon=_bridge_contours(contours)
    if not polygon:return None
    ox,oy=float(origin[0])*sx,float(origin[1])*sy
    polygon=[[x+ox,y+oy] for x,y in polygon]
    xs,ys=zip(*polygon);left,top=min(xs),min(ys);width,height=max(xs)-left,max(ys)-top
    if width<1:left-=(1-width)/2;width=1
    if height<1:top-=(1-height)/2;height=1
    if isinstance(color,int):color=f'#{color:06X}'
    elif isinstance(color,(tuple,list)):
        if len(color)==1:color=list(color)*3
        color='#'+''.join(f'{max(0,min(255,round(v*255))):02X}' for v in color[:3])
    return {'id':shape_id or f'pdf_math_glyph_{fm.get("xref",0)}_{gid}',
            'type':'polygon','polygon_px':polygon,'box_px':[left,top,width,height],
            'fill':color,'stroke':'none','stroke_width':0,'z_index':z_index,
            'pdf_source_font':fm.get('pdfname',fm.get('original_font_name')),
            'pdf_source_glyph_id':int(gid),'pdf_source_unicode':unicode_char,
            'pdf_source_glyph_name':item['glyph_name'],'pdf_source_baseline_pt':list(origin),
            'pdf_source_font_size_pt':size,'pdf_glyph_contours':len(contours),
            'pdf_outline_tolerance_px':tolerance_px,
            'pdf_outline_representation':'one-native-editable-freeform-with-zero-area-contour-bridges'}

# Descriptive alias for direct importer integration.
math_glyph_shape=glyph_shape
