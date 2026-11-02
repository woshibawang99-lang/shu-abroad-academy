import sys,json,pathlib,importlib.util,math
base=pathlib.Path(r'D:/AAA-SZ/留学学科教育/output/image2ppt/online-optimization-editable/pages/page_002');spec=importlib.util.spec_from_file_location('ng',base/'native_math_glyphs.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
fmap=json.loads(pathlib.Path(r'D:/AAA-SZ/留学学科教育/output/image2ppt/online-optimization-editable/fonts/font_mapping_fixed.json').read_text(encoding='utf-8'))
count=0;maxpts=0
for name,fm in fmap.items():
 if name.startswith(('t1-gul','t1-uni','t1-hel')):continue
 for e in fm['glyphs']:
  sh=m.glyph_shape(fm,e['gid'],[100,100],9,2,2,'#000000',unicode_char=e['unicode'])
  if sh:
   count+=1;maxpts=max(maxpts,len(sh['polygon_px']))
   assert all(math.isfinite(v) for p in sh['polygon_px'] for v in p)
print('Passed math glyph outline extraction',count,'glyphs; max polygon vertices',maxpts)
print(json.dumps(m.glyph_shape(fmap['MTEX'],13,[200,650],9.5641,2,2,'#000000',unicode_char='∑'),ensure_ascii=False)[:500])
