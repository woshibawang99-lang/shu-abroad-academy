import json,pathlib,pymupdf,collections
from fontTools.ttLib import TTFont
out=pathlib.Path(r'D:/AAA-SZ/留学学科教育/output/image2ppt/online-optimization-editable/pages/page_002/fonts')
m=json.loads((out/'font_mapping.json').read_text(encoding='utf-8'))
for name,f in m.items():
 ft=TTFont(f['path']);cmap=ft.getBestCmap();repl={};mismatch=[]
 for e in f['glyphs']:
  if not e['unicode']:continue
  for u in e['unicode']:
   if cmap.get(u)!=e['glyph_name']:
    repl[str(e['gid'])]={'target_codepoint':e['pua'],'source_codepoints':e['unicode'],'glyph_name':e['glyph_name']}
  # PUA references always target the exact original glyph
  assert cmap[e['pua']]==e['glyph_name']
  w=ft['hmtx'].metrics[e['glyph_name']][0]
  if w!=e['advance']:mismatch.append(e['glyph_name'])
 f['pua_replacements_by_source_gid']=repl
 print(name,'cmap',len(cmap),'PUA exceptions',len(repl),'advance mismatches',len(mismatch),'metrics',f['ascent'],f['descent'])
(out/'font_mapping.json').write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf-8')
