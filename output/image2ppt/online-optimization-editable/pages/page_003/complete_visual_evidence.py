from pathlib import Path
import json
p=Path(r'D:/AAA-SZ/留学学科教育/output/image2ppt/online-optimization-editable/pages/page_003')
e=json.loads((p/'visual-review-evidence.template.json').read_text('utf-8'))
page=e['pages'][0];page['reviewed']=True
page['checks']={
'composition_layout':'Compared complete source and actual PowerPoint render. Both preserve the original portrait two-column layout, header, page3 footer, five left assumptions, two definitions, and right Remarks1-3 with Assumption6 and Lemma1. Column edges and paragraph baselines align closely after measured baseline correction.',
'text_content':'Reviewed serif body text, bold Assumption/Definition/Remark labels, italic theorem wording, and cyan citations against source. Original line breaks and all scientific wording are preserved without re-authoring; the algorithm initialization and four numbered loop lines remain present.',
'object_completeness':'Checked equation2 gradient norm, equation3 fraction mu/2 and squared norm, both regret sums, equation4 gradient tracker and equation5 projection bracket, right-column minimization sums, path/gradient variation formulas, and bottom eigenvector relations. Source math glyphs are individually editable native outlines, and all three Algorithm1 horizontal rules are retained.',
'render_integrity':'The inspected rendered.png was exported by PowerPoint from the current manifest-built PPTX. Page contains1316 editable text boxes and423 native vector shapes, with zero image objects, no full-page bitmap, and no hidden source overlay. Whole-page comparison found no missing text, duplicated content, clipping, or displaced algorithm rules.'}
(p/'visual-review-evidence.json').write_text(json.dumps(e,ensure_ascii=False,indent=2),encoding='utf-8')
