import pathlib,json
p=pathlib.Path(r'D:/AAA-SZ/留学学科教育/output/image2ppt/online-optimization-editable/pages/page_002')
e=json.loads((p/'visual-review-evidence.template.json').read_text(encoding='utf-8'));q=e['pages'][0];q['reviewed']=True
q['checks']={
'composition_layout':'Compared the full 1191x1588 source and actual PowerPoint render. Both preserve the narrow two-column article layout, original margins and inter-column gap, header author/journal lines, right-column Problem formulation heading and bottom page number.',
 'text_content':'Both columns retain the original prose and blue linked citations at the measured source positions. Body serifs and italic Notations label are reproduced with extracted PDF fonts. No clipping, reflow into adjacent lines, added summaries or missing paragraphs was seen.',
 'object_completeness':'All inline regret bounds in the upper and middle columns are present, including square roots, sums, subscripts and superscripts. The displayed objective (1), its summation, index limits and constraints are aligned as in source. Mathematical glyph contours and seven source rules remain native independent shapes with source geometry.',
 'render_integrity':'Actual powerpoint-com export was inspected, not the deterministic preview. The render has no source-page bitmap, duplicated text layer or missing math glyph blocks. White background, black prose and blue citations match source. Dense notation paragraph and objective remain legible at enlarged view.'}
(p/'visual-review-evidence.json').write_text(json.dumps(e,ensure_ascii=False,indent=2),encoding='utf-8')
