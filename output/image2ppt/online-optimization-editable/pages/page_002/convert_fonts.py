import pathlib,json,collections,re,argparse
import pymupdf
from fontTools.t1Lib import T1Font
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.agl import toUnicode
parser=argparse.ArgumentParser();parser.add_argument('--pdf',required=True);parser.add_argument('--out',required=True);args=parser.parse_args()
out=pathlib.Path(args.out);out.mkdir(parents=True,exist_ok=True)
doc=pymupdf.open(args.pdf)
actual=collections.defaultdict(lambda:collections.defaultdict(set));vertical={}
for p in doc:
 for s in p.get_texttrace():
  vertical[s['font']]={'ascender':s['ascender'],'descender':s['descender']}
  for u,gid,origin,bbox in s['chars']:actual[s['font']][gid].add(u)
report={}
fonts={x[0]:x for page in doc for x in page.get_fonts(full=True)}
for xref,ext,typ,pdfname,ref,enc,_ in fonts.values():
 base,ext,typ,data=doc.extract_font(xref)
 path=out/(ref+'.complete.pfa');path.write_bytes(data+b'\n'+b'0'*512+b'\ncleartomark\n');f=T1Font(str(path));gset=f.getGlyphSet();order=list(gset)
 if order[0]!='.notdef':order.remove('.notdef');order.insert(0,'.notdef')
 # MuPDF glyph ids use original CharStrings order, which must be stored independently.
 original=list(gset)
 nd=original.index('.notdef')
 original[0],original[nd]=original[nd],original[0]
 cname='PDFR_'+ref
 charstrings={};ttglyphs={};metrics={}; cmap={};entries=[]
 for gn in order:
  rec=RecordingPen();gset[gn].draw(rec);width=gset[gn].width
  pen=T2CharStringPen(width,gset);rec.replay(pen);charstrings[gn]=pen.getCharString()
  tpen=TTGlyphPen(gset);qpen=Cu2QuPen(tpen,1.0,reverse_direction=True);rec.replay(qpen);ttglyphs[gn]=tpen.glyph()
  bp=BoundsPen(gset);rec.replay(bp);lsb=round(bp.bounds[0]) if bp.bounds else 0
  metrics[gn]=(round(width),lsb)
 for gid,gn in enumerate(original):
  pua=0xE000+gid;cmap[pua]=gn
  us=sorted(actual[pdfname.split('+')[-1]].get(gid,set()))
  if not us:
   try:us=[ord(toUnicode(gn))] if len(toUnicode(gn))==1 else []
   except Exception:us=[]
  for u in us:
   if u>=32 and u not in cmap:cmap[u]=gn
  entries.append({'gid':gid,'glyph_name':gn,'pua':pua,'unicode':us,'advance':metrics[gn][0]})
 fb=FontBuilder(1000,isTTF=False);fb.setupGlyphOrder(order);fb.setupCharacterMap(cmap)
 fb.setupCFF(cname,{'FullName':cname,'FamilyName':cname,'Weight':'Regular'},charstrings,{})
 vm=vertical.get(pdfname.split('+')[-1],{'ascender':1,'descender':-0.3});asc=round(vm['ascender']*1000);desc=round(vm['descender']*1000)
 fb.setupHorizontalMetrics(metrics);fb.setupHorizontalHeader(ascent=asc,descent=desc)
 fb.setupNameTable({'familyName':cname,'styleName':'Regular','uniqueFontIdentifier':cname,'fullName':cname,'psName':cname,'version':'Version 1.0'})
 fb.setupOS2(sTypoAscender=asc,sTypoDescender=desc,usWinAscent=max(asc,0),usWinDescent=max(-desc,0),fsType=0)
 fb.setupPost();dest=out/(cname+'.otf');fb.save(str(dest))
 tfb=FontBuilder(1000,isTTF=True);tfb.setupGlyphOrder(order);tfb.setupCharacterMap(cmap);tfb.setupGlyf(ttglyphs);tfb.setupHorizontalMetrics(metrics);tfb.setupHorizontalHeader(ascent=asc,descent=desc)
 tfb.setupNameTable({'familyName':cname,'styleName':'Regular','uniqueFontIdentifier':cname,'fullName':cname,'psName':cname,'version':'Version 1.0'})
 tfb.setupOS2(sTypoAscender=asc,sTypoDescender=desc,usWinAscent=max(asc,0),usWinDescent=max(-desc,0),fsType=0);tfb.setupPost();tfb.setupMaxp();ttdest=out/(cname+'.ttf');tfb.save(str(ttdest))
 report[pdfname.split('+')[-1]]={'font_family':cname,'path':str(ttdest),'otf_path':str(dest),'xref':xref,'glyphs':entries,'original_font_name':pdfname,'pdfname':pdfname.split('+')[-1],'family':cname,'ascent':asc,'descent':desc,'units_per_em':1000,'source_vertical_metrics':vm,'note':'Exact outlines converted from supplied PDF embedded Type1 subset. PUA code E000+original glyph id guarantees distinct big math variants. Unicode cmap also included where unambiguous. Not installed.'}
 print(dest.name,len(order),'glyphs')
from fontTools.ttLib import TTFont
for item in report.values():
 cmap=TTFont(item['path']).getBestCmap(); replacements={}
 for e in item['glyphs']:
  if any(cmap.get(u)!=e['glyph_name'] for u in e['unicode']):
   replacements[str(e['gid'])]={'target_codepoint':e['pua'],'source_codepoints':e['unicode'],'glyph_name':e['glyph_name']}
 item['pua_replacements_by_source_gid']=replacements
(out/'font_mapping.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
