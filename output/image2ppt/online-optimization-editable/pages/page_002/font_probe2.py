from pathlib import Path
from fontTools.t1Lib import T1Font
from fontTools.agl import toUnicode
out=Path(r'D:/AAA-SZ/留学学科教育/output/image2ppt/online-optimization-editable/pages/page_002/fonts')
for file in out.glob('*.pfa'):
 try:
  fixed=file.with_suffix('.complete.pfa');fixed.write_bytes(file.read_bytes()+b'\n'+b'0'*512+b'\ncleartomark\n')
  f=T1Font(str(fixed));f.parse();g=f.getGlyphSet()
  print(file.name,f['FontName'],'matrix',f['FontMatrix'],'glyphs',len(g),'sample',[(n,toUnicode(n)) for n in list(g)[:15]])
 except Exception as e: print(file.name,'ERROR',type(e).__name__,str(e))
