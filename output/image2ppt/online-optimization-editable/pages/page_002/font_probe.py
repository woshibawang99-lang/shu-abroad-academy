import pymupdf,pathlib,json
from fontTools.t1Lib import T1Font
from fontTools.agl import toUnicode
out=pathlib.Path(r'D:/AAA-SZ/留学学科教育/output/image2ppt/online-optimization-editable/pages/page_002/fonts');out.mkdir(exist_ok=True)
doc=pymupdf.open(r'D:/AAA-SZ/2025_Online distributed optimization algorithm with dynamic regret analysis under unbalanced graphs.pdf')
for xref,ext,typ,fontname,refname,enc,_ in doc[1].get_fonts(full=True):
    base,ext,typ,data=doc.extract_font(xref)
    file=out/(refname+'.'+ext);file.write_bytes(data)
    try:
        font=T1Font(str(file));font.parse();g=font.getGlyphSet()
        print(refname,fontname,'fontname',font['FontName'],'matrix',font['FontMatrix'],'glyphs',len(g),'sample',[(n,toUnicode(n)) for n in list(g)[:20]])
        print('Encoding',str(font['Encoding'])[:300])
    except Exception as e:print('ERROR',type(e).__name__,str(e))
