from pathlib import Path
p=Path(r'D:/AAA-SZ/留学学科教育/output/image2ppt/online-optimization-editable/pages/page_002/convert_fonts.py');s=p.read_text(encoding='utf-8')
s=s.replace("(out/'font_mapping.json').write_text", "from fontTools.ttLib import TTFont\nfor item in report.values():\n cmap=TTFont(item['path']).getBestCmap(); replacements={}\n for e in item['glyphs']:\n  if any(cmap.get(u)!=e['glyph_name'] for u in e['unicode']):\n   replacements[str(e['gid'])]={'target_codepoint':e['pua'],'source_codepoints':e['unicode'],'glyph_name':e['glyph_name']}\n item['pua_replacements_by_source_gid']=replacements\n(out/'font_mapping.json').write_text")
p.write_text(s,encoding='utf-8')
