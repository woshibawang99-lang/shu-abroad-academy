import json,pathlib,pymupdf,collections
out=pathlib.Path(r'D:/AAA-SZ/留学学科教育/output/image2ppt/online-optimization-editable/pages/page_002')
doc=pymupdf.open(r'D:/AAA-SZ/2025_Online distributed optimization algorithm with dynamic regret analysis under unbalanced graphs.pdf')
p=doc[1]
raw=p.get_text('dict')
summary={'pdf_page':2,'pdf_size_pt':[p.rect.width,p.rect.height],'source_size_px':[1191,1588],'background':'solid white','foreground_assets':[],'regions':[{'id':'header','bbox_pdf_pt':[37,33,521,12]},{'id':'left-column','bbox_pdf_pt':[37,54,252,692]},{'id':'right-upper-column','bbox_pdf_pt':[306,54,252,511]},{'id':'right-problem-formulation','bbox_pdf_pt':[306,575,252,171]},{'id':'footer','bbox_pdf_pt':[294,752,10,10]}],'fonts':[list(x) for x in p.get_fonts(full=True)],'text_blocks':raw['blocks'],'drawing_count':len(p.get_drawings()),'drawings':p.get_drawings()}
(out/'source_geometry.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2,default=list),encoding='utf-8')
print('Source spans',sum(len(l['spans']) for b in raw['blocks'] if 'lines' in b for l in b['lines']))
print('Drawings',len(p.get_drawings()))
print('Font details',p.get_fonts(full=True))
